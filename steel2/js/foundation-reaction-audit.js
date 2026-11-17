/* SAHROUD STEEL — independent completeness audit for per-footing reaction envelopes.
 * Audits data integrity and support resultants only; does not reconstruct external load resultants
 * and is NOT an independent global equilibrium proof or footing design.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function audit(envelope,model,footingSpecFor){
 const issues=[],supports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
 if(!envelope||!Array.isArray(envelope.cases)||!envelope.cases.length)issues.push("پوش فاقد حالات بار است.");
 if(!Array.isArray(envelope?.rows)||!envelope.rows.length)issues.push("پوش فاقد ردیف واکنش پایه است.");
 if(!Array.isArray(model?.nodes)||!supports.length)issues.push("مدل فاقد گره پایه معتبر است.");
 const supportById=new Map(supports.map(n=>[String(n.id),n])),rowById=new Map();
 const expectedCaseLabels=new Set((envelope?.cases||[]).map(c=>String(c?.label??"")));
 (envelope?.rows||[]).forEach(row=>{
  const id=String(row?.nodeId??"");
  if(!id||rowById.has(id)){issues.push("شناسه ردیف پایه خالی یا تکراری است: "+id);return;}
  rowById.set(id,row);
  const n=supportById.get(id);
  if(!n)issues.push("ردیف واکنش به گره پایه مدل متصل نیست: "+id);
  else if(["x","y","z"].some(k=>!finite(Number(row[k]))||Math.abs(Number(row[k])-Number(n[k]))>1e-8))issues.push("مختصات ردیف واکنش با مدل یکسان نیست: "+id);
 });
 supports.forEach(n=>{if(!rowById.has(String(n.id)))issues.push("واکنش گره پایه در پوش وجود ندارد: "+n.id);});
 rowById.forEach((row,id)=>{
  const cases=row.caseReactions;
  if(!Array.isArray(cases)||cases.length!==envelope.cases.length){issues.push("تعداد واکنش‌های هم‌زمان با تعداد حالات بار برابر نیست: "+id);return;}
  const seen=new Set();
  cases.forEach(item=>{
   const label=String(item?.label??"");
   if(!label||seen.has(label)){issues.push("نام حالت واکنش خالی یا تکراری برای گره "+id);return;}
   seen.add(label);
   if(!expectedCaseLabels.has(label))issues.push("حالت واکنش برای گره "+id+" در فهرست اصلی پوش وجود ندارد: "+label);
   if(!Array.isArray(item.values)||item.values.length!==6||!item.values.every(finite))issues.push("بردار باید دقیقاً شش مؤلفه عددی محدود داشته باشد؛ مقدار متنی یا مؤلفه اضافی پذیرفته نیست: "+id+" / "+label);
  });
  expectedCaseLabels.forEach(label=>{if(!seen.has(label))issues.push("واکنش حالت "+label+" برای گره "+id+" موجود نیست.");});
  if(Array.isArray(cases)&&cases.length===envelope.cases.length&&cases.every(x=>Array.isArray(x.values)&&x.values.length===6&&x.values.every(finite))){
   [0,1,2,3,4,5].forEach(k=>{
    const mn=Math.min(...cases.map(x=>x.values[k])),mx=Math.max(...cases.map(x=>x.values[k])),env=row.envelopes?.[k];
    if(!env||!finite(env.min)||!finite(env.max)||Math.abs(mn-env.min)>1e-7||Math.abs(mx-env.max)>1e-7)issues.push("پوش کمینه/بیشینه با واکنش‌های خام سازگار نیست: "+id+" مؤلفه "+k);
    if(env){
     const minCase=String(env.minCase??""),maxCase=String(env.maxCase??"");
     const minSource=cases.find(x=>x.label===minCase),maxSource=cases.find(x=>x.label===maxCase);
     if(!minSource||Math.abs(minSource.values[k]-mn)>1e-7)issues.push("شناسه حالت حاکم کمینه با مقدار واقعی تطبیق ندارد: "+id+" مؤلفه "+k);
     if(!maxSource||Math.abs(maxSource.values[k]-mx)>1e-7)issues.push("شناسه حالت حاکم بیشینه با مقدار واقعی تطبیق ندارد: "+id+" مؤلفه "+k);
    }
   });
  }
  if(typeof footingSpecFor==="function"){
   const d=footingSpecFor(row);
   if(!d||![d.width,d.length,d.thickness].every(v=>finite(Number(v))&&Number(v)>0))issues.push("ابعاد پی اختصاصی گره معتبر نیست: "+id);
  }
 });
 const tieBeam= envelope?.tieBeamIntegration;
 const tieBeamAudit={checked:false,routeCount:0,segmentCount:0,issues:[]};
 if(tieBeam){
  tieBeamAudit.checked=true;
  const included=Array.isArray(tieBeam.included)?tieBeam.included:[];
  const skipped=Array.isArray(tieBeam.skipped)?tieBeam.skipped:[];
  const segmentIds=new Set(),supportIds=new Set(supports.map(n=>String(n.id)));
  tieBeamAudit.routeCount=included.length;
  included.forEach(route=>{
   const id=String(route?.id??"");
   const start=String(route?.start??""),end=String(route?.end??"");
   const mids=Array.isArray(route?.intermediateBaseNodes)?route.intermediateBaseNodes.map(String):[];
   const members=Array.isArray(route?.memberIds)?route.memberIds.map(String):[];
   const count=Number(route?.segmentCount);
   if(!id||!start||!end)tieBeamAudit.issues.push("شناژ با شناسه یا گره ابتدا/انتهای خالی در مسیر انتقال به پی ثبت شده است.");
   if(!supportIds.has(start)||!supportIds.has(end))tieBeamAudit.issues.push("دو انتهای شناژ "+(id||"?")+" به گره پایه واقعی متصل نیستند.");
   mids.forEach(nodeId=>{if(!supportIds.has(nodeId))tieBeamAudit.issues.push("گره میانی شناژ "+(id||"?")+" تکیه‌گاه فونداسیون شناخته‌شده نیست: "+nodeId);});
   if(!Number.isInteger(count)||count<1||members.length!==count)tieBeamAudit.issues.push("تعداد قطعات شناژ "+(id||"?")+" با فهرست شناسه قطعات برابر نیست.");
   members.forEach(memberId=>{if(!memberId||segmentIds.has(memberId))tieBeamAudit.issues.push("شناسه قطعه شناژ خالی یا تکراری است: "+memberId);segmentIds.add(memberId);});
   tieBeamAudit.segmentCount+=members.length;
   if(!Number.isFinite(Number(route.lengthM))||Number(route.lengthM)<=0)tieBeamAudit.issues.push("طول مسیر شناژ "+(id||"?")+" نامعتبر است.");
  });
  if(skipped.length)tieBeamAudit.issues.push("یک یا چند مسیر شناژ از تحلیل حذف شده است؛ انتقال بار فونداسیون کامل نیست.");
  if(tieBeam.activeInAnalysis===false&&included.length)tieBeamAudit.issues.push("مسیرهای شناژ ثبت شده‌اند ولی در تحلیل فعال نیستند.");
  issues.push(...tieBeamAudit.issues);
 }
 const caseLabels=new Set();
 (envelope?.cases||[]).forEach(c=>{
  if(!c?.label||caseLabels.has(c.label))issues.push("نام حالت بار در پوش خالی یا تکراری است: "+String(c?.label));
  caseLabels.add(c?.label);
  if(c?.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای حالت تأیید نشده: "+String(c?.label));
  if(c?.equilibrium?.nodeEquilibriumOk!==true||!Array.isArray(c?.equilibrium?.nodeEquilibrium)||!c.equilibrium.nodeEquilibrium.length)
   issues.push("ممیزی باقیمانده تعادل گره‌به‌گره حل‌گر برای حالت بار موجود یا موفق نیست: "+String(c?.label));
  else if(c.equilibrium.nodeEquilibrium.some(n=>n?.ok!==true||!Array.isArray(n.components)||n.components.length!==6))
   issues.push("ممیزی تعادل گره‌به‌گره ناقص یا ناموفق است: "+String(c?.label));
  if(c?.equilibrium?.memberEndEquilibriumOk!==true||!Array.isArray(c?.equilibrium?.memberEndEquilibrium)||!c.equilibrium.memberEndEquilibrium.length)
   issues.push("ممیزی مستقل تعادل گره از نیروهای انتهایی اعضا برای حالت بار موجود یا موفق نیست: "+String(c?.label));
  else if(c.equilibrium.memberEndEquilibrium.some(n=>n?.ok!==true||!Array.isArray(n.components)||n.components.length!==6))
   issues.push("ممیزی مستقل نیروهای انتهایی اعضا در گره‌ها ناقص یا ناموفق است: "+String(c?.label));
 });
 const resultants=(envelope?.cases||[]).map(c=>{
  const F=[0,0,0],M=[0,0,0];
  supports.forEach(n=>{
   const row=rowById.get(String(n.id)),item=row?.caseReactions?.find(x=>x.label===c.label);
   if(!item?.values)return;
   const v=item.values.map(Number),x=Number(n.x),y=Number(n.y),z=Number(n.z);
   F[0]+=v[0];F[1]+=v[1];F[2]+=v[2];
   M[0]+=v[3]+y*v[2]-z*v[1];
   M[1]+=v[4]+z*v[0]-x*v[2];
   M[2]+=v[5]+x*v[1]-y*v[0];
  });
  return{label:c.label,solverSupportResultant:{Fx:F[0],Fy:F[1],Fz:F[2],Mx:M[0],My:M[1],Mz:M[2]},momentReference:"global origin (0,0,0)",units:{force:"N",moment:"N.m"}};
 });
 return{ok:issues.length===0,issues,supportCount:supports.length,rowCount:rowById.size,caseCount:envelope?.cases?.length||0,tieBeamAudit,resultants,scope:"data completeness and support reaction resultants only; not independent external-load equilibrium, not design"};
}
function selfTest(){
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"},{id:"B2",x:2,y:0,z:0,kind:"endwall-base"}]};
 const vals1=[10,20,30,1,2,3],vals2=[-5,-6,-7,4,5,6];
 const env={cases:[{label:"C1",equilibrium:{ok:true,nodeEquilibriumOk:true,memberEndEquilibriumOk:true,memberEndEquilibrium:[{nodeId:'B1',ok:true,components:Array(6).fill({})},{nodeId:'B2',ok:true,components:Array(6).fill({})}],nodeEquilibrium:[{nodeId:"B1",ok:true,components:Array(6).fill({})},{nodeId:"B2",ok:true,components:Array(6).fill({})}]}}],rows:[
  {nodeId:"B1",x:0,y:0,z:0,caseReactions:[{label:"C1",values:vals1}],envelopes:vals1.map(v=>({min:v,max:v,minCase:"C1",maxCase:"C1"}))},
  {nodeId:"B2",x:2,y:0,z:0,caseReactions:[{label:"C1",values:vals2}],envelopes:vals2.map(v=>({min:v,max:v,minCase:"C1",maxCase:"C1"}))}
 ]};
 const good=audit(env,model,()=>({width:1.8,length:1.8,thickness:.8}));
 const tests=[
  ["valid complete envelope accepted",good.ok],
  ["missing support row rejected",!audit({...env,rows:env.rows.slice(0,1)},model).ok],
  ["missing case reaction rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[]}:r)},model).ok],
  ["unknown case label cannot replace a missing valid case",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[{label:"UNKNOWN",values:vals1},{label:"C2",values:vals1}]}:r)},model).ok],
  ["case labels may be reordered without losing exact coverage",audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:r.caseReactions.slice().reverse()}:r)},model).ok],
  ["coordinate mismatch rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B2"?{...r,x:9}:r)},model).ok],
  ["envelope min max mismatch rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,envelopes:r.envelopes.map((e,i)=>i===0?{...e,min:-1,max:1}:e)}:r)},model).ok],
  ["envelope governing case ID must match actual minimum",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,envelopes:r.envelopes.map((e,i)=>i===0?{...e,minCase:"UNKNOWN"}:e)}:r)},model).ok],
  ["non-numeric reaction values are rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[{label:"C1",values:["10",20,30,1,2,3]}]}:r)},model).ok],
  ["reaction vectors with extra components are rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[{label:"C1",values:[...vals1,99]}]}:r)},model).ok],
  ["failed equilibrium rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:false,nodeEquilibriumOk:true,nodeEquilibrium:[{nodeId:"B1",ok:true,components:Array(6).fill({})}]}}]},model).ok],
  ["missing node-equilibrium audit rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:true}}]},model).ok],
  ["missing independent member-end equilibrium audit rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:true,nodeEquilibriumOk:true,nodeEquilibrium:[{nodeId:"B1",ok:true,components:Array(6).fill({})}]}}]},model).ok],
  ["failed node-equilibrium row rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:true,nodeEquilibriumOk:false,nodeEquilibrium:[{nodeId:"B1",ok:false,components:Array(6).fill({})}]}}]},model).ok],
  ["missing footing dimensions rejected",!audit(env,model,()=>({width:0,length:1,thickness:1})).ok],
  ["global-origin moment includes r cross F",good.resultants[0].solverSupportResultant.My===21],
  ["audits tie-beam endpoints and intermediate supports",audit({...env,tieBeamIntegration:{included:[{id:"T1",start:"B1",end:"B2",intermediateBaseNodes:[],memberIds:["TB1"],segmentCount:1,lengthM:2}],skipped:[],activeInAnalysis:true}},model).tieBeamAudit.issues.length===0],
  ["rejects tie-beam endpoint not connected to footing support",!audit({...env,tieBeamIntegration:{included:[{id:"T1",start:"B1",end:"GHOST",intermediateBaseNodes:[],memberIds:["TB1"],segmentCount:1,lengthM:2}],skipped:[],activeInAnalysis:true}},model).ok],
  ["rejects tie-beam segment count mismatch",!audit({...env,tieBeamIntegration:{included:[{id:"T1",start:"B1",end:"B2",intermediateBaseNodes:[],memberIds:["TB1"],segmentCount:2,lengthM:2}],skipped:[],activeInAnalysis:true}},model).ok],
  ["rejects skipped tie-beam route",!audit({...env,tieBeamIntegration:{included:[],skipped:[{id:"T2"}],activeInAnalysis:false}},model).ok]
 ];
 return{passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,total:tests.length,tests};
}
root.SteelFoundationReactionAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
