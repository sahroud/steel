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

function auditCraneDemandTrace(trace,model){
 const issues=[],nodes=Array.isArray(model?.nodes)?model.nodes:[],bases=nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base");
 if(trace?.success!==true||trace?.simultaneousCasesPreserved!==true)issues.push("بسته ردیابی جرثقیل باید موفق و حافظ حالات هم‌زمان باشد.");
 if(!Array.isArray(trace?.cases)||!trace.cases.length)issues.push("فهرست موقعیت‌های جرثقیل خالی است.");
 if(!bases.length)issues.push("گره پایه‌ای در مدل فیزیکی یافت نشد.");
 const nodeMap=new Map(bases.map(n=>[String(n.id),n]));
 const expected=new Set((trace?.cases||[]).map(c=>String(c.caseIndex)+"|"+String(c.referencePosition_m)));
 if(expected.size!==(trace?.cases||[]).length)issues.push("شناسه موقعیت/حالت جرثقیل تکراری است.");
 const demands=[],seen=new Set(),coverage=new Map(),supportRowsSeen=new Set();
 (trace?.supports||[]).forEach(row=>{
  const nodeId=String(row?.nodeId??"");
  if(supportRowsSeen.has(nodeId))issues.push("ردیف پایه تکراری در بسته ردیابی جرثقیل: "+nodeId);
  supportRowsSeen.add(nodeId);
  const node=nodeMap.get(nodeId);
  if(!node){issues.push("گره واکنش جرثقیل در مدل پایه واقعی وجود ندارد: "+nodeId);return;}
  if(![node.x,node.y,node.z].every(finite)){issues.push("مختصات گره پایه جرثقیل نامعتبر است: "+nodeId);return;}
  const entries=Array.isArray(row.cases)?row.cases:[];
  if(entries.length!==expected.size)issues.push("پوش موقعیت‌های جرثقیل برای پایه "+nodeId+" ناقص است.");
  entries.forEach(c=>{
   const key=String(c?.caseIndex)+"|"+String(c?.referencePosition_m);
   if(!Number.isInteger(c?.caseIndex)||!finite(c?.referencePosition_m))issues.push("شماره حالت یا موقعیت جرثقیل برای پایه "+nodeId+" معتبر نیست.");
   if(!expected.has(key))issues.push("حالت/موقعیت ناشناخته برای پایه "+nodeId+": "+key);
   const unique=nodeId+"|"+key;if(seen.has(unique))issues.push("تقاضای تکراری پایه/موقعیت جرثقیل: "+unique);seen.add(unique);
   const a=c?.columnAction,r=c?.solverReaction,keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!a||!r||![...keys.map(k=>a[k]),...keys.map(k=>r[k])].every(finite)){issues.push("بردار واکنش/کنش ستون شش‌مؤلفه‌ای نامعتبر: "+unique);return;}
   const signTolerance=1e-7*Math.max(1,...keys.map(k=>Math.abs(r[k])));
   if(keys.some(k=>Math.abs(a[k]+r[k])>signTolerance)){issues.push("قرارداد علامت کنش ستون و واکنش حل‌گر در شش مؤلفه برای "+unique+" برقرار نیست؛ انتقال به انکر متوقف شد.");return;}
   const caseId="CRANE-"+(Number(c.caseIndex)+1)+"@"+Number(c.referencePosition_m).toFixed(4)+"m";
   demands.push({nodeId,caseId,caseIndex:c.caseIndex,referencePosition_m:c.referencePosition_m,
    coordinatesM:{x:Number(node.x),y:Number(node.y),z:Number(node.z)},kind:node.kind,
    solverReactionN_Nm:keys.map(k=>r[k]),columnActionN_Nm:keys.map(k=>a[k]),
    units:{force:"N",moment:"N.m"},source:"crane-demand-trace",status:"demand_only_not_designed",
    independentPositionDemand:true,signsPreserved:true,torsionRetained:true});
   coverage.set(nodeId,(coverage.get(nodeId)||0)+1);
  });
 });
 bases.forEach(n=>{if((coverage.get(String(n.id))||0)!==expected.size)issues.push("پوش کامل موقعیت‌های جرثقیل برای گره پایه "+n.id+" برقرار نیست.");});
 if(demands.length!==bases.length*expected.size)issues.push("تعداد تقاضاهای جرثقیل با تعداد پایه‌ها × موقعیت‌ها برابر نیست.");
 return {ok:issues.length===0,ready:issues.length===0,demands:issues.length?[]:demands,
  cases:(trace?.cases||[]).map(c=>({caseIndex:c.caseIndex,referencePosition_m:c.referencePosition_m,label:"CRANE-"+(Number(c.caseIndex)+1)+"@"+Number(c.referencePosition_m).toFixed(4)+"m"})),
  caseCount:expected.size,supportCount:bases.length,independentCaseDemands:true,combinesEnvelopeExtrema:false,
  source:"SteelCrane3DLoadTransfer.demandTraceAudit",analysisEnabled:false,designApproved:false,
  limitation:"این مبدل فقط کنش‌های ستون در پایه را برای هر موقعیت مستقل جرثقیل به قالب تقاضای فونداسیون می‌آورد؛ ترکیب بار نهایی، ظرفیت انکر/صفحه‌ستون، بتن، پی و خاک محاسبه یا تأیید نمی‌شود."};
}
function auditStructuralRun(runResult,model,options){
 const issues=[];
 if(runResult?.success!==true||!Array.isArray(runResult.results)||!runResult.results.length)
  return {ok:false,ready:false,issues:["خروجی موفق SteelStructuralLoadChain.run با آرایه نتایج لازم است."],demands:[],analysisEnabled:false,designApproved:false};
 const labels=new Set(),cases=[],rowsByNode=new Map();
 runResult.results.forEach((item,index)=>{
  const label=String(item?.label||item?.id||"");
  if(!label||labels.has(label)){issues.push("شناسه حالت بار خالی یا تکراری در نتیجه زنجیره: "+label);return;}
  labels.add(label);
  if(item?.equilibrium?.ok!==true){issues.push("تعادل حالت بار تأیید نشده است: "+label);return;}
  if(item?.solverLoadTransferAudit?.success!==true)issues.push("ممیزی مستقل انتقال بار حل‌گر برای حالت "+label+" مفقود یا ناموفق است؛ تحویل تقاضا به فونداسیون مسدود شد.");
  if(item?.externalLoadLedgerComparison?.ok!==true)issues.push("تطبیق دفتر بار مستقل با برآیند اعمال‌شده حل‌گر برای حالت "+label+" مفقود یا ناموفق است.");
  if(item?.foundationReactionMappingAudit&&item.foundationReactionMappingAudit.success!==true)issues.push("نگاشت گره‌های پایه به پی در حالت "+label+" ناموفق است.");
  if(!Array.isArray(item.reactions)){issues.push("واکنش‌های حالت بار موجود نیست: "+label);return;}
  cases.push({label,equilibrium:item.equilibrium});
  item.reactions.forEach(reaction=>{
   const nodeId=String(reaction?.nodeId??"");
   const v=reaction?.solverReaction;
   if(!nodeId||!v||![v.Fx,v.Fy,v.Fz,v.Mx,v.My,v.Mz].every(finite)){
    issues.push("واکنش شش‌مؤلفه‌ای نامعتبر در حالت "+label);return;
   }
   const coordinates=reaction.coordinatesM||{};
   if(![coordinates.x,coordinates.y,coordinates.z].every(finite)){
    issues.push("مختصات گره واکنش نامعتبر است: "+nodeId);return;
   }
   let row=rowsByNode.get(nodeId);
   if(!row){row={nodeId,x:coordinates.x,y:coordinates.y,z:coordinates.z,kind:reaction.kind,caseReactions:[]};rowsByNode.set(nodeId,row);}
   else if(["x","y","z"].some(k=>Math.abs(row[k]-coordinates[k])>1e-8))issues.push("مختصات گره در حالات بار یکسان نیست: "+nodeId);
   row.caseReactions.push({label,values:[v.Fx,v.Fy,v.Fz,v.Mx,v.My,v.Mz]});
  });
 });
 const rows=[...rowsByNode.values()];
 rows.forEach(row=>{
  row.envelopes=Array.from({length:6},(_,k)=>{
   const values=row.caseReactions.map(c=>c.values[k]);
   return {min:Math.min(...values),max:Math.max(...values)};
  });
  if(row.caseReactions.length!==cases.length)issues.push("واکنش همه حالات بار برای گره "+row.nodeId+" موجود نیست.");
 });
 const envelope={cases,rows};
 const foundationSupportMappings=Array.isArray(model?.foundationSupportMappings)?model.foundationSupportMappings:[];
 const footingMappingStatus=foundationSupportMappings.length?"provided-explicit-mapping":"missing-explicit-support-to-footing-mapping";
 const foundationMappingAudits=runResult.results.map(item=>({caseId:String(item?.label||item?.id||""),audit:item?.foundationReactionMappingAudit||null}));
 const auditFn=root.SteelFoundationReactionAudit?.audit;
 if(typeof auditFn!=="function")issues.push("ممیزی پوش واکنش فونداسیون بارگذاری نشده است.");
 const base=typeof auditFn==="function"?auditFn(envelope,model,options?.footingSpecFor):null;
 if(base&&!base.ok)issues.push(...base.issues);
 const mapped=audit(envelope,model,options);
 if(!mapped.ok)issues.push(...mapped.issues);
 return {ok:issues.length===0,ready:issues.length===0,issues,demands:mapped.demands||[],footingMappingStatus,foundationMappingAudits,foundationSupportMappingsRequiredForFootingDesign:true,caseCount:cases.length,
  supportCount:rows.length,source:"SteelStructuralLoadChain.run",envelope,
  independentCaseDemands:true,combinesEnvelopeExtrema:false,analysisEnabled:false,designApproved:false,
  limitation:"این تبدیل فقط واکنش‌های واقعی هر حالت بار را به قالب ممیزی فونداسیون تبدیل می‌کند؛ ظرفیت صفحه‌ستون، انکر، بتن، پی و خاک طراحی نشده است."};
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
  ck("adapts structural load-chain output without mixing cases",()=>{const run={success:true,results:env.cases.map((c,i)=>({id:c.label,label:c.label,equilibrium:{ok:true},solverLoadTransferAudit:{success:true},externalLoadLedgerComparison:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:values[0]*(i+1),Fy:values[1],Fz:values[2],Mx:values[3],My:values[4],Mz:values[5]}}]}))};const r=auditStructuralRun(run,model);return r.ok&&r.demands.length===2&&r.demands[0].caseId!==r.demands[1].caseId;});
  ck("adapts crane support actions per physical base and position",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2},{caseIndex:1,referencePosition_m:4}],supports:[{nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}},{caseIndex:1,referencePosition_m:4,solverReaction:{Fx:2,Fy:3,Fz:4,Mx:5,My:6,Mz:7},columnAction:{Fx:-2,Fy:-3,Fz:-4,Mx:-5,My:-6,Mz:-7}}]}]};const r=auditCraneDemandTrace(trace,model);return r.ok&&r.demands.length===2&&r.demands[1].caseId.includes("@4.0000m")&&r.demands[0].columnActionN_Nm[4]===-5;});
  ck("rejects inconsistent solver-reaction and column-action signs",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2}],supports:[{nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:5,Mz:-6}}]}]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("rejects duplicate physical support rows",()=>{const row={nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]};const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2}],supports:[row,JSON.parse(JSON.stringify(row))]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("rejects incomplete crane position coverage",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2},{caseIndex:1,referencePosition_m:4}],supports:[{nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("blocks crane support IDs absent from physical base nodes",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2}],supports:[{nodeId:"GHOST",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("rejects structural run with failed equilibrium",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:false},reactions:[]}]};return !auditStructuralRun(run,model).ok;});
  ck("blocks foundation handoff when solver load-transfer audit is missing",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},externalLoadLedgerComparison:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};return !auditStructuralRun(run,model).ok;});
  ck("blocks foundation handoff when integrated solver load-transfer audit fails",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},solverLoadTransferAudit:{success:false},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};return !auditStructuralRun(run,model).ok;});
  ck("blocks handoff when an explicit support-to-footing mapping audit fails",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},solverLoadTransferAudit:{success:true},externalLoadLedgerComparison:{ok:true},foundationReactionMappingAudit:{success:false},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};return !auditStructuralRun(run,model).ok;});
  ck("reports missing support-to-footing mapping without inventing footing IDs",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};const r=auditStructuralRun(run,model);return r.footingMappingStatus==="missing-explicit-support-to-footing-mapping"&&r.foundationSupportMappingsRequiredForFootingDesign===true;});
  ck("rejects incomplete structural reaction vector",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},solverReaction:{Fx:1}}]}]};return !auditStructuralRun(run,model).ok;});
 }finally{root.SteelFoundationReactionAudit=old;}
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,designApproved:false};
}
root.SteelFoundationReactionBridge={audit,auditStructuralRun,auditCraneDemandTrace,getDemand,mapSix,selfTest};
})(typeof window!=="undefined"?window:globalThis);
