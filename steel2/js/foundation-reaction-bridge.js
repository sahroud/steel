/* SAHROUD STEEL — per-case six-DOF foundation reaction bridge.
 * Preserves torsion and case identity; never combines independent envelopes.
 * Units: N, N.m internally; kN, kN.m in display mapping.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function mapSix(values){
 if(!Array.isArray(values)||values.length!==6||values.some(v=>!finite(v)))throw Error("واکنش پایه باید دقیقاً شش مؤلفه محدود داشته باشد.");
 return {solverReactionN_Nm:values.slice(),columnActionN_Nm:values.map(v=>-v),
  columnActionDisplay:{N_tensionPositive_kN:-values[1]/1000,Vx_kN:-values[0]/1000,Vz_kN:-values[2]/1000,Mx_kNm:-values[3]/1000,Ty_kNm:-values[4]/1000,Mz_kNm:-values[5]/1000}};
}
function audit(envelope,model,options){
 options=options||{};
 const issues=[],auditFn=root.SteelFoundationReactionAudit?.audit;
 if(typeof auditFn!=="function")issues.push("ممیزی پوش واکنش فونداسیون بارگذاری نشده است.");
 const base=typeof auditFn==="function"?auditFn(envelope,model,options.footingSpecFor):null;
 if(base&&!base.ok)issues.push(...base.issues);
 if(options.expectedFingerprint&&envelope?.foundationModelFingerprint!==options.expectedFingerprint)issues.push("اثر انگشت مدل فونداسیون با مدل جاری تطبیق ندارد.");
 const cases=Array.isArray(envelope?.cases)?envelope.cases:[],rows=Array.isArray(envelope?.rows)?envelope.rows:[];
 const labels=new Set();
 cases.forEach(c=>{const label=String(c?.label||"");if(!label||labels.has(label))issues.push("شناسه/عنوان حالت بار خالی یا تکراری است: "+label);labels.add(label);});
 const demands=[];
 rows.forEach(row=>{
  const nodeId=String(row?.nodeId||"");
  (row?.caseReactions||[]).forEach(item=>{
   const label=String(item?.label||"");
   try{
    if(!labels.has(label))throw Error("حالت بار در فهرست اصلی پوش وجود ندارد.");
    const mapped=mapSix(item.values);
    demands.push({nodeId,caseId:label,coordinatesM:{x:Number(row.x),y:Number(row.y),z:Number(row.z)},kind:row.kind,
     ...mapped,units:{force:"N",moment:"N.m"},status:"demand_only_not_designed",torsionRetained:true,torsionDesignRequired:true});
   }catch(e){issues.push("گره "+nodeId+" / "+label+": "+e.message);}
  });
 });
 const expected=rows.length*cases.length;
 if(demands.length!==expected)issues.push("تعداد تقاضاهای شش‌مؤلفه‌ای با حاصل‌ضرب تعداد گره‌ها و حالات بار برابر نیست.");
 const keys=new Set();demands.forEach(d=>{const k=d.nodeId+"|"+d.caseId;if(keys.has(k))issues.push("تقاضای تکراری برای "+k);keys.add(k);});
 return {ok:issues.length===0,ready:issues.length===0,issues,demands,caseCount:cases.length,supportCount:rows.length,
  independentCaseDemands:true,combinesEnvelopeExtrema:false,analysisEnabled:false,designApproved:false,
  limitation:"این پل فقط واکنش‌های هم‌زمان هر گره/حالت بار را نگاشت می‌کند. پیچش My/Ty حفظ شده ولی غربال فعلی گروه انکربولت آن را طراحی نمی‌کند؛ ظرفیت صفحه‌ستون، انکر، بتن، پی و خاک محاسبه یا تأیید نمی‌شود."};
}
function getDemand(result,nodeId,caseId){
 if(!result?.ok)throw Error("ابتدا ممیزی موفق پل واکنش را اجرا کنید.");
 const matches=result.demands.filter(d=>d.nodeId===String(nodeId)&&d.caseId===String(caseId));
 if(matches.length!==1)throw Error("برای گره و حالت بار انتخابی دقیقاً یک تقاضا لازم است.");
 return matches[0];
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"}],members:[]},values=[1000,2000,3000,4000,5000,6000];
 const env={cases:[{label:"ULS-1",equilibrium:{ok:true}},{label:"ULS-2",equilibrium:{ok:true}}],rows:[{nodeId:"B1",x:0,y:0,z:0,kind:"base",caseReactions:[{label:"ULS-1",values},{label:"ULS-2",values:values.map(v=>2*v)}],envelopes:values.map(v=>({min:v,max:2*v}))}]};
 const old=root.SteelFoundationReactionAudit;
 root.SteelFoundationReactionAudit={audit:e=>({ok:e.rows.length===1&&e.cases.length===2,issues:[]})};
 try{
  ck("maps six components with opposite support-action sign",()=>mapSix(values).columnActionN_Nm.join(",")==="-1000,-2000,-3000,-4000,-5000,-6000");
  ck("keeps torsion as independent sixth component",()=>mapSix(values).columnActionDisplay.Ty_kNm===-5);
  ck("keeps each load case separate",()=>{const r=audit(env,model);return r.ok&&r.demands.length===2&&r.demands[0].caseId!==r.demands[1].caseId;});
  ck("does not combine independent envelope extrema",()=>{const r=audit(env,model);return r.ok&&r.combinesEnvelopeExtrema===false&&r.independentCaseDemands;});
  ck("rejects a missing reaction case",()=>!audit({...env,rows:[{...env.rows[0],caseReactions:[env.rows[0].caseReactions[0]]}]},model).ok);
  ck("rejects duplicate case labels",()=>!audit({...env,cases:[env.cases[0],env.cases[0]]},model).ok);
  ck("rejects malformed six-DOF vectors",()=>!audit({...env,rows:[{...env.rows[0],caseReactions:[{label:"ULS-1",values:[1,2,3]}]}]},model).ok);
  ck("rejects a case not in envelope",()=>!audit({...env,rows:[{...env.rows[0],caseReactions:[{label:"UNKNOWN",values}]}]},model).ok);
  ck("selects exact node and case only",()=>getDemand(audit(env,model),"B1","ULS-2").columnActionN_Nm[5]===-12000);
  ck("blocks selection from failed audit",()=>{try{getDemand({ok:false,demands:[]},"B1","ULS-1");return false;}catch(e){return true;}});
  ck("never enables analysis or design approval",()=>{const r=audit(env,model);return !r.analysisEnabled&&!r.designApproved&&r.demands.every(d=>d.torsionDesignRequired);});
 }finally{root.SteelFoundationReactionAudit=old;}
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,designApproved:false};
}
root.SteelFoundationReactionBridge={audit,getDemand,mapSix,selfTest};
})(typeof window!=="undefined"?window:globalThis);
