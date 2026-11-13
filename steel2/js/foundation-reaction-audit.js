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
   if(!Array.isArray(item.values)||item.values.length<6||item.values.slice(0,6).some(v=>!finite(Number(v))))issues.push("بردار شش‌مؤلفه‌ای نامعتبر برای گره "+id+" / "+label);
  });
  if(Array.isArray(cases)&&cases.length===envelope.cases.length&&cases.every(x=>Array.isArray(x.values)&&x.values.length>=6&&x.values.slice(0,6).every(v=>finite(Number(v))))){
   [0,1,2,3,4,5].forEach(k=>{
    const vals=cases.map(x=>Number(x.values[k])),mn=Math.min(...vals),mx=Math.max(...vals),env=row.envelopes?.[k];
    if(!env||!finite(Number(env.min))||!finite(Number(env.max))||Math.abs(mn-Number(env.min))>1e-7||Math.abs(mx-Number(env.max))>1e-7)issues.push("پوش کمینه/بیشینه با واکنش‌های خام سازگار نیست: "+id+" مؤلفه "+k);
   });
  }
  if(typeof footingSpecFor==="function"){
   const d=footingSpecFor(row);
   if(!d||![d.width,d.length,d.thickness].every(v=>finite(Number(v))&&Number(v)>0))issues.push("ابعاد پی اختصاصی گره معتبر نیست: "+id);
  }
 });
 const caseLabels=new Set();
 (envelope?.cases||[]).forEach(c=>{
  if(!c?.label||caseLabels.has(c.label))issues.push("نام حالت بار در پوش خالی یا تکراری است: "+String(c?.label));
  caseLabels.add(c?.label);
  if(c?.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای حالت تأیید نشده: "+String(c?.label));
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
 return{ok:issues.length===0,issues,supportCount:supports.length,rowCount:rowById.size,caseCount:envelope?.cases?.length||0,resultants,scope:"data completeness and support reaction resultants only; not independent external-load equilibrium, not design"};
}
function selfTest(){
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"},{id:"B2",x:2,y:0,z:0,kind:"endwall-base"}]};
 const vals1=[10,20,30,1,2,3],vals2=[-5,-6,-7,4,5,6];
 const env={cases:[{label:"C1",equilibrium:{ok:true}}],rows:[
  {nodeId:"B1",x:0,y:0,z:0,caseReactions:[{label:"C1",values:vals1}],envelopes:vals1.map(v=>({min:v,max:v}))},
  {nodeId:"B2",x:2,y:0,z:0,caseReactions:[{label:"C1",values:vals2}],envelopes:vals2.map(v=>({min:v,max:v}))}
 ]};
 const good=audit(env,model,()=>({width:1.8,length:1.8,thickness:.8}));
 const tests=[
  ["valid complete envelope accepted",good.ok],
  ["missing support row rejected",!audit({...env,rows:env.rows.slice(0,1)},model).ok],
  ["missing case reaction rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[]}:r)},model).ok],
  ["coordinate mismatch rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B2"?{...r,x:9}:r)},model).ok],
  ["envelope min max mismatch rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,envelopes:r.envelopes.map((e,i)=>i===0?{min:-1,max:1}:e)}:r)},model).ok],
  ["failed equilibrium rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:false}}]},model).ok],
  ["missing footing dimensions rejected",!audit(env,model,()=>({width:0,length:1,thickness:1})).ok],
  ["global-origin moment includes r cross F",good.resultants[0].solverSupportResultant.My===21]
 ];
 return{passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,total:tests.length,tests};
}
root.SteelFoundationReactionAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
