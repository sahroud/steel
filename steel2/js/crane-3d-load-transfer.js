/* SAHROUD STEEL — synchronized crane load transfer to the actual 3D frame FEM.
 * Builds per-case global nodal loads; never combines non-concurrent envelope maxima.
 */
(function(root){
"use strict";
const EPS=1e-7;
const vec=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const add=(map,id,values,meta)=>{
 let r=map.get(String(id));if(!r){r={nodeId:String(id),values:[0,0,0,0,0,0],sources:[]};map.set(String(id),r);}
 values.forEach((v,i)=>r.values[i]+=Number(v)||0);if(meta)r.sources.push(meta);
};
function offset(value,label,issues){
 if(!Array.isArray(value)||value.length!==3||value.some(v=>!Number.isFinite(Number(v)))){issues.push("بردار خروج از مرکزیت "+label+" باید سه مؤلفه عددی بر حسب متر داشته باشد؛ بدون آن انتقال لنگر بار تأیید نمی‌شود.");return null;}
 return value.map(Number);
}
function nodeFor(model,side,z){
 const members=model.members.filter(m=>m.craneIntegration===true&&m.sectionKey==="craneRunwayGirder"&&m.side===side);
 const ids=[...new Set(members.flatMap(m=>[m.start,m.end]))];
 const matches=model.nodes.filter(n=>ids.includes(n.id)&&Math.abs(Number(n.z)-z)<=EPS);
 return matches.length===1?matches[0]:null;
}
function memberAt(model,side,z){
 const rows=model.members.filter(m=>m.craneIntegration===true&&m.sectionKey==="craneRunwayGirder"&&m.side===side).map(m=>({m,a:model.nodes.find(n=>n.id===m.start),b:model.nodes.find(n=>n.id===m.end)})).filter(x=>x.a&&x.b&&z>=Math.min(x.a.z,x.b.z)-EPS&&z<=Math.max(x.a.z,x.b.z)+EPS);
 return rows.length===1?rows[0]:null;
}
function matVec(A,v){return A.map(row=>row.reduce((s,x,i)=>s+x*v[i],0));}
function transpose(A){return A[0].map((_,j)=>A.map(r=>r[j]));}
function mul(A,B){return A.map(row=>B[0].map((_,j)=>row.reduce((s,x,k)=>s+x*B[k][j],0)));}
function pointEquivalentLocal(F,M,L,x){
 const r=x/L,t=r*r,u=t*r;
 const n1=1-3*t+2*u,n2=L*(r-2*t+u),n3=3*t-2*u,n4=L*(-t+u);
 const d1=(-6*r+6*t)/L,d2=1-4*r+3*t,d3=(6*r-6*t)/L,d4=-2*r+3*t;
 const f=Array(12).fill(0);
 // Local axial force: linear interpolation.
 f[0]+=(1-r)*F[0];f[6]+=r*F[0];
 // Local y bending: v and rotation about local z.
 f[1]+=n1*F[1]+d1*M[2];f[5]+=n2*F[1]+d2*M[2];
 f[7]+=n3*F[1]+d3*M[2];f[11]+=n4*F[1]+d4*M[2];
 // Local z bending uses theta_y = -dw/dx convention of the 3D stiffness matrix.
 f[2]+=n1*F[2]-d1*M[1];f[4]+=-n2*F[2]+d2*M[1];
 f[8]+=n3*F[2]-d3*M[1];f[10]+=-n4*F[2]+d4*M[1];
 // Saint-Venant torsion.
 f[3]+=(1-r)*M[0];f[9]+=r*M[0];
 return f;
}
function addPointOnGirder(model,memberRow,z,forceGlobal,offsetGlobal,nodal,source,issues){
 const {m,a,b}=memberRow,L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
 if(!(L>0)){issues.push("طول عضو تیر حمال "+m.id+" نامعتبر است.");return false;}
 const tr=root.SteelFrame3D?.makeTransform?.([a.x,a.y,a.z],[b.x,b.y,b.z]);
 if(!tr){issues.push("تبدیل محور محلی عضو تیر حمال در دسترس نیست.");return false;}
 const r=Math.max(0,Math.min(1,(z-a.z)/(b.z-a.z)));
 const applicationMoment=cross(offsetGlobal,forceGlobal);
 const axes=[tr.axes.x,tr.axes.y,tr.axes.z];
 const Fl=axes.map(axis=>dot(axis,forceGlobal)),Ml=axes.map(axis=>dot(axis,applicationMoment));
 const local=pointEquivalentLocal(Fl,Ml,L,r*L);
 const global=matVec(transpose(tr.T),local);
 add(nodal,m.start,global.slice(0,6),{...source,memberId:m.id,position_m:z,shape:"consistent-point-load"});
 add(nodal,m.end,global.slice(6,12),{...source,memberId:m.id,position_m:z,shape:"consistent-point-load"});
 return true;
}
let lastAnalysis=null;
function auditSourceProvenance(sourceDocuments,horizontalInput){
 const required=["document","revision","locator","authority"],rows=[],issues=[];
 const addRow=(name,value)=>{
  const record=value&&typeof value==="object"&&!Array.isArray(value)?value:{document:value};
  const missing=required.filter(k=>!String(record?.[k]??"").trim());
  rows.push({name,missing,complete:missing.length===0});
  if(missing.length)issues.push(name+" فاقد "+missing.join("، "));
 };
 const d=sourceDocuments||{};
 addRow("منبع هندسه ریل",d.geometrySource);
 addRow("منبع سختی تکیه‌گاه",d.supportStiffnessSource);
 addRow("منبع مسیر/فاصله چرخ",d.wheelTrackSource);
 if(!Array.isArray(d.wheelSources)||!d.wheelSources.length)issues.push("منابع اختصاصی چرخ‌ها ثبت نشده‌اند.");
 (Array.isArray(d.wheelSources)?d.wheelSources:[]).forEach((w,i)=>addRow("منبع چرخ "+(i+1)+" ("+(w?.side||"بدون سمت")+")",w));
 if(horizontalInput?.enabled)addRow("منبع بار افقی جرثقیل",horizontalInput);
 return {complete:issues.length===0,requiredFields:required,sourceCount:rows.length,completeCount:rows.filter(x=>x.complete).length,incompleteCount:rows.filter(x=>!x.complete).length,rows,issues,designApproved:false,scope:"فقط کامل‌بودن شناسنامه منبع را بررسی می‌کند؛ صحت مقدار بار، تفسیر بند آیین‌نامه یا تأیید طراحی را اثبات نمی‌کند."};
}
function prepareCase(model,transferResult,caseIndex,horizontalInput,trainInput,config){
 const issues=[],d=config||{},c=transferResult?.cases?.[caseIndex];
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))issues.push("مدل سه‌بعدی معتبر نیست.");
 if(!transferResult?.success||!c)issues.push("حالت هم‌زمان معتبر از تحلیل دو ریل انتخاب نشده است.");
 if(!root.SteelFrame3D?.makeTransform)issues.push("تبدیل مختصات حل‌گر سه‌بعدی بارگذاری نشده است.");
 const verticalOffset=offset(d.verticalReactionOffset_m,"واکنش قائم ریل",issues);
 const nodal=new Map();
 if(c&&model){
  for(const side of ["left","right"]){
   const loads=c.girderPointLoads?.[side]||[];
   for(const load of loads){
    const P=Number(load.P_N),z=Number(load.x_m);
    if(!Number.isFinite(P)||!Number.isFinite(z)){issues.push("بار واکنش قائم ریل "+side+" مقدار یا مختصات نامعتبر دارد.");continue;}
    if(Math.abs(P)<=1e-9)continue;
    const n=nodeFor(model,side,z);
    if(!n){issues.push("واکنش قائم ریل "+side+" در z="+z+" با گره تیر حمال تطبیق یکتا ندارد؛ گره نزدیک جایگزین نمی‌شود.");continue;}
    if(verticalOffset){
     const F=[0,P,0],M=cross(verticalOffset,F);
     add(nodal,n.id,[...F,...M],{kind:"rail-support-vertical-reaction",side,station:load.station,source:load.source,casePosition_m:c.referencePosition_m,sourceDocuments:c.sourceDocuments||null});
    }
   }
  }
 }
 let horizontalAudit=null;
 if(horizontalInput?.enabled){
  horizontalAudit=root.SteelCraneLoadPathAudit?.horizontalLedger?.(horizontalInput,trainInput||root.SteelCraneTrainAnalysis?.getData?.());
  if(!horizontalAudit?.ready)issues.push(...(horizontalAudit?.issues||["ممیزی بارهای افقی جرثقیل ناموفق است."]));
  const sideMode=d.horizontalApplicationSides;
  if(!["left","right","both"].includes(sideMode))issues.push("محل اعمال بار افقی باید صریحاً left، right یا both انتخاب شود.");
  const hOffset=offset(d.horizontalWheelOffset_m,"بار افقی چرخ",issues);
  if(horizontalAudit?.ready&&hOffset&&["left","right","both"].includes(sideMode)){
   const length=Number(model.geometry?.length);
   if(!(Number.isFinite(length)&&length>0))issues.push("طول مؤثر مسیر ریل در مدل سه‌بعدی معتبر نیست؛ مختصات چرخ قابل ممیزی نیست.");
   horizontalAudit.loads.forEach(w=>{
    const z=Number(c.referencePosition_m)+Number(w.x_m);
    if(!(Number.isFinite(z)&&Number.isFinite(length)&&length>0)){issues.push("مختصات طولی چرخ "+w.wheelIndex+" یا طول مسیر ریل نامعتبر است.");return;}
    if(z< -EPS||z>length+EPS){issues.push("چرخ "+w.wheelIndex+" در موقعیت z="+z.toFixed(4)+" m خارج از طول واقعی تیر حمال [0، "+length+" m] قرار گرفته است؛ حذف خاموش این بار مجاز نیست و حالت تحلیل متوقف شد.");return;}
    const sides=sideMode==="both"?["left","right"]:[sideMode];
    sides.forEach(side=>{
     const pointSource={kind:"crane-wheel-horizontal",side,wheelIndex:w.wheelIndex,casePosition_m:c.referencePosition_m,source:w.source,document:w.document};
     const exactNode=nodeFor(model,side,z);
     if(exactNode){const M=cross(hOffset,w.globalForce_N);add(nodal,exactNode.id,[...w.globalForce_N,...M],pointSource);return;}
     const row=memberAt(model,side,z);
     if(!row){issues.push("بار افقی چرخ "+w.wheelIndex+" در موقعیت z="+z+" روی عضو تیر حمال "+side+" قرار نگرفت.");return;}
     addPointOnGirder(model,row,z,w.globalForce_N,hOffset,nodal,pointSource,issues);
    });
   });
  }
 }
 const sourceDocs=c?.sourceDocuments;
 const sourceProvenanceAudit=auditSourceProvenance(sourceDocs,horizontalInput);
 if(c&&(!sourceDocs?.geometrySource||!sourceDocs?.supportStiffnessSource||!sourceDocs?.wheelTrackSource||!Array.isArray(sourceDocs?.wheelSources)||sourceDocs.wheelSources.some(w=>!w.source||!w.document)))issues.push("زنجیره اسناد پایه هندسه، سختی تکیه‌گاه و بار چرخ برای این حالت کامل نیست.");
 const loads=[...nodal.values()].map(x=>({nodeId:x.nodeId,values:x.values,sources:x.sources}));
 const ok=issues.length===0&&loads.length>0;
 return {success:ok,ready:ok,solverInputReady:ok,analysisEnabled:false,caseIndex,referencePosition_m:c?.referencePosition_m??null,nodalLoads:loads,loadCount:loads.length,sourceDocuments:sourceDocs||null,sourceProvenanceAudit,readyForCodeDesign:sourceProvenanceAudit.complete===true,horizontalAudit,issues,modelFingerprint:model?{nodeCount:model.nodes.length,memberCount:model.members.length}:null,note:"بارهای قائم واکنش ریل روی گره‌های دقیق تیر حمال اعمال می‌شوند؛ نیروهای افقی در محل واقعی چرخ با بارهای گره‌ای معادل سازگار تیر توزیع می‌شوند. خروج از مرکزیت باید از نقشه وارد شود. هنوز کنترل مقاومت/اتصال و تأیید طراحی انجام نشده است."};
}
function prepareAll(model,transferResult,horizontalInput,trainInput,config){
 if(!transferResult?.success)return {success:false,analysisEnabled:false,issues:["نتیجه تحلیل هم‌زمان دو ریل در دسترس نیست."]};
 const cases=transferResult.cases.map((_,i)=>prepareCase(model,transferResult,i,horizontalInput,trainInput,config));
 return {success:cases.every(x=>x.success),analysisEnabled:false,readyForCodeDesign:false,sourceProvenanceComplete:cases.every(x=>x.sourceProvenanceAudit?.complete===true),sourceProvenanceIncompleteCount:cases.filter(x=>x.sourceProvenanceAudit?.complete!==true).length,total:cases.length,readyCount:cases.filter(x=>x.success).length,blockedCount:cases.filter(x=>!x.success).length,cases,issues:cases.flatMap(x=>x.issues).slice(0,50)};
}
function auditCraneType(config){
 const d=config||{};
 if(!d.craneType)return {valid:true,legacyUnspecified:true,issues:[]};
 if(!root.SteelCraneLoadPath?.classify)return {valid:false,issues:["ماژول تشخیص مسیر جرثقیل بارگذاری نشده است."]};
 const r=root.SteelCraneLoadPath.classify({craneType:d.craneType,supportSystem:d.supportSystem||"runway_girder"});
 if(!r.valid)return {valid:false,issues:r.issues};
 if(r.craneType!=="overhead")return {valid:false,issues:["این انتقال FEM فقط برای جرثقیل سقفی و تیر حمال طراحی شده است؛ بار جرثقیل زمینی نباید به مدل تیر حمال سقفی تزریق شود."]};
 return {valid:true,loadTarget:r.loadTarget,loadPath:r.loadPath,issues:[]};
}
async function analyzeCase(caseIndex,transferResult,horizontalInput,trainInput,config){
 const routeAudit=auditCraneType(config);
 if(!routeAudit.valid)return {success:false,analysisEnabled:false,issues:routeAudit.issues,routeAudit};
 const model=root.SteelStructuralModel?.model;
 const p=prepareCase(model,transferResult,caseIndex,horizontalInput,trainInput,config);
 if(!p.success)return {success:false,analysisEnabled:false,transfer:p};
 const chain=root.SteelStructuralLoadChain;
 if(!chain||typeof chain.auditEquilibrium!=="function"||typeof chain.buildExternalLoadLedger!=="function"||typeof chain.compareExternalLedger!=="function")
  return {success:false,analysisEnabled:false,transfer:p,issues:["ممیزی مستقل دفتر بار خارجی و تعادل حل‌گر بارگذاری نشده است؛ تحلیل جرثقیل تا دسترسی به این کنترل‌ها متوقف شد."]};
 const result=await root.SteelStructuralModel.analyze3D({label:"بار مرده + جرثقیل ـ حالت هم‌زمان "+(caseIndex+1),factors:{dead:1,live:0,snow:0,wind:0},nodalLoads:p.nodalLoads,craneLoadCaseId:caseIndex,craneLoadTransfer:{referencePosition_m:p.referencePosition_m,sourceDocuments:p.sourceDocuments}});
 const equilibriumAudit=chain.auditEquilibrium(result?.equilibrium);
 if(!equilibriumAudit?.ok)return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,issues:["ممیزی مستقل تعادل حالت جرثقیل ناموفق است: "+(equilibriumAudit?.issues||[]).join("؛ ")]};
 const externalLoadLedger=chain.buildExternalLoadLedger(model,result?.members,p.nodalLoads,result?.equivalentReleasedRotationLoads||[]);
 const externalLoadLedgerComparison=chain.compareExternalLedger(externalLoadLedger,result?.equilibrium);
 if(!externalLoadLedgerComparison?.ok)return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,issues:["دفتر مستقل بار خارجی با برآیند بار اعمال‌شده حل‌گر تطبیق ندارد: "+(externalLoadLedgerComparison?.issues||[]).join("؛ ")]};
 if(typeof chain.extractSupportReactions!=="function")return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,issues:["استخراج مستقل واکنش گره‌های پایه در دفتر زنجیره بار موجود نیست؛ خروجی فونداسیون ساخته نمی‌شود."]};
 let supportReactionActions;
 try{supportReactionActions=chain.extractSupportReactions(result,model);}catch(e){return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,issues:["استخراج واکنش پایه/نیروی ستون ناموفق است: "+String(e.message||e)]};}
 lastAnalysis={success:true,analysisEnabled:false,caseIndex,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,supportReactionActions,loadPathAudit:{ok:true,method:"independent external-load resultant, solver equilibrium recheck and explicit base support reaction extraction",designApproved:false}};
 return lastAnalysis;
}
let lastAutomaticEnvelope=null;
function applyVerticalImpact(input,factor){
 const f=Number(factor);
 if(!(Number.isFinite(f)&&f>0))throw Error("ضریب اثر دینامیکی قائم جرثقیل باید مثبت و مستند باشد.");
 const out={...input};
 for(const side of ["left","right"]){
  if(!Array.isArray(out[side+"Wheels"]))throw Error("قطار چرخ "+side+" تعریف نشده است.");
  out[side+"Wheels"]=out[side+"Wheels"].map((w)=>({...w,P_N:Number(w.P_N)*f,
   source:String(w.source||"")+"؛ ضریب دینامیکی قائم ×"+f,
   dynamicFactorApplied:f,staticInputP_N:Number(w.P_N)}));
 }
 return out;
}
function buildCraneSupportReactionEnvelope(model,results){
 const issues=[],supports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
 if(!supports.length)issues.push("گره پایه برای استخراج واکنش‌های فونداسیون جرثقیل وجود ندارد.");
 if(!Array.isArray(results)||!results.length)issues.push("نتایج موقعیت‌های جرثقیل برای استخراج واکنش پایه موجود نیست.");
 const expected=new Set(supports.map(n=>String(n.id))),byNode=new Map();
 (results||[]).forEach((sample,index)=>{
  const rows=sample?.analysis?.supportReactionActions?.rows;
  if(!Array.isArray(rows)){issues.push("واکنش‌های پایه در موقعیت "+(index+1)+" موجود نیست.");return;}
  const seen=new Set();
  rows.forEach(row=>{
   const id=String(row?.nodeId??"");
   if(!expected.has(id)){issues.push("واکنش گره غیرپایه یا ناشناخته در موقعیت "+(index+1)+": "+id);return;}
   if(seen.has(id)){issues.push("واکنش تکراری گره پایه "+id+" در موقعیت "+(index+1));return;}
   seen.add(id);
   const action=row.columnAction,solver=row.solverReaction;
   const keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!action||!solver||keys.some(k=>!Number.isFinite(action[k])||!Number.isFinite(solver[k]))){issues.push("شش مؤلفه واکنش/نیروی ستون در گره "+id+" و موقعیت "+(index+1)+" معتبر نیست.");return;}
   if(!byNode.has(id))byNode.set(id,[]);
   byNode.get(id).push({caseIndex:sample.caseIndex??index,referencePosition_m:sample.referencePosition_m,solverReaction:{...solver},columnAction:{...action}});
  });
  const missing=[...expected].filter(id=>!seen.has(id));
  if(missing.length)issues.push("واکنش گره‌های پایه در موقعیت "+(index+1)+" ناقص است: "+missing.join("، "));
 });
 const rows=[...byNode.entries()].map(([nodeId,cases])=>({nodeId,caseCount:cases.length,cases,components:Object.fromEntries(["Fx","Fy","Fz","Mx","My","Mz"].map(k=>[k,{min:cases.reduce((a,b)=>b.columnAction[k]<a.columnAction[k]?b:a,cases[0])?.columnAction[k]??null,max:cases.reduce((a,b)=>b.columnAction[k]>a.columnAction[k]?b:a,cases[0])?.columnAction[k]??null}]))}));
 return{success:issues.length===0,rows,caseCount:results?.length||0,supportNodeCount:supports.length,issues,units:{force:"N",moment:"N.m"},scope:"واکنش کل پایه و نیروی متناظر ستون برای هر موقعیت جرثقیل شامل وزن مرده و بارهای فعال همان حالت؛ فقط تقاضا، نه طراحی صفحه‌ستون/مهار/پی."};
}
function auditMainFrameMemberCoverage(model,samples,rows){
 const issues=[],members=Array.isArray(model?.members)?model.members:[];
 const byId=new Map((rows||[]).map(r=>[String(r.id),r]));
 const families=[{key:"column",label:"ستون قاب اصلی"},{key:"rafter",label:"رفتر قاب اصلی"}];
 const summary={};
 families.forEach(f=>{
  const expected=members.filter(m=>m.sectionKey===f.key);
  const missing=expected.filter(m=>{
   const row=byId.get(String(m.id));
   return !row||Number(row.caseCount)!==samples.length||!Array.isArray(row.simultaneousCases)||row.simultaneousCases.length!==samples.length;
  });
  const valid=expected.length-missing.length;
  summary[f.key]={label:f.label,memberCount:expected.length,coveredCount:valid,missingMemberIds:missing.map(m=>String(m.id))};
  if(!expected.length)issues.push("هیچ عضو "+f.label+" در مدل اصلی برای ردیابی اثر جرثقیل وجود ندارد.");
  if(missing.length)issues.push("پوش نیروی "+f.label+" در همه موقعیت‌های جرثقیل کامل نیست: "+missing.slice(0,10).map(m=>String(m.id)).join("، "));
 });
 return {success:issues.length===0,caseCount:samples.length,families:summary,issues,scope:"پوش نیروهای انتهایی اعضای ستون و رفتر قاب اصلی در هر موقعیت جرثقیل؛ مقادیر محلی اعضا هستند و برآیند گره‌ای/طراحی اتصال محسوب نمی‌شوند."};
}
function buildMovingForceEnvelope(model,results){
 const api=root.SteelMemberForceEnvelope;
 if(!api?.buildRows||!api?.auditCoverage)throw Error("ماژول پوش نیروهای اعضا در دسترس نیست.");
 if(!Array.isArray(results)||!results.length)throw Error("حالات جرثقیل برای استخراج پوش نیرو موجود نیستند.");
 const samples=results.map(x=>{
  const solved=x.analysis?.result;
  if(!Array.isArray(solved?.members))throw Error("نیروهای اعضا در موقعیت جرثقیل "+(x.caseIndex+1)+" در خروجی حل‌گر موجود نیست.");
  if(!solved.equilibrium?.ok)throw Error("تعادل موقعیت جرثقیل "+(x.caseIndex+1)+" برقرار نیست.");
  return {label:"CRANE-"+(x.caseIndex+1)+" @ "+Number(x.referencePosition_m).toFixed(4)+" m",members:solved.members,equilibrium:solved.equilibrium,referencePosition_m:x.referencePosition_m,caseIndex:x.caseIndex};
 });
 const rows=api.buildRows(model,samples),coverage=api.auditCoverage(model,samples,rows);
 if(coverage.invalidForceVectors.length||coverage.analysisMemberSetMismatchCases.length||coverage.duplicateMemberIdsByCase.length||coverage.unreportedMemberIds.length)throw Error("پوش نیروهای جرثقیل ناقص است: بردار نامعتبر "+coverage.invalidForceVectors.length+"، اختلاف اعضا "+coverage.analysisMemberSetMismatchCases.length+"، عضو گزارش‌نشده "+coverage.unreportedMemberIds.length);
 if(rows.some(r=>r.caseCount!==samples.length))throw Error("برای بعضی اعضا نیروی هر موقعیت جرثقیل ثبت نشده است.");
 const mainFrameCoverage=auditMainFrameMemberCoverage(model,samples,rows);
 if(!mainFrameCoverage.success)throw Error("ردیابی اثر جرثقیل تا اعضای اصلی ستون و رفتر کامل نیست: "+mainFrameCoverage.issues.join("؛ "));
 return {rows,coverage,mainFrameCoverage,cases:samples.map(x=>({label:x.label,caseIndex:x.caseIndex,referencePosition_m:x.referencePosition_m,equilibrium:x.equilibrium})),units:"N,N.m",simultaneousEndForcesPreserved:true,scope:"پوش مؤلفه‌ای نیروهای انتهایی؛ کنترل ظرفیت و اندرکنش آیین‌نامه‌ای نیست."};
}
function buildCraneBaseReactionCsv(envelope){
 if(!envelope||envelope.success!==true||!Array.isArray(envelope.rows)||!envelope.rows.length)throw Error("پوش واکنش پایه جرثقیل معتبر یا کامل نیست.");
 const headers=["گره پایه","حالت جرثقیل","موقعیت جرثقیل m","Fx واکنش kN","Fy واکنش kN","Fz واکنش kN","Mx واکنش kN.m","My واکنش kN.m","Mz واکنش kN.m","Fx کنش ستون kN","Fy کنش ستون kN","Fz کنش ستون kN","Mx کنش ستون kN.m","My کنش ستون kN.m","Mz کنش ستون kN.m"];
 const rows=[];
 envelope.rows.forEach(support=>{
  if(!Array.isArray(support.cases)||!support.cases.length)throw Error("گره پایه "+support.nodeId+" فاقد حالت‌های واکنش است.");
  support.cases.forEach(c=>{
   const r=c.solverReaction,a=c.columnAction,keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!r||!a||keys.some(k=>!Number.isFinite(r[k])||!Number.isFinite(a[k])))throw Error("بردار شش‌مؤلفه‌ای واکنش/کنش ستون "+support.nodeId+" ناقص است.");
   rows.push([support.nodeId,"CRANE-"+(Number(c.caseIndex)+1),c.referencePosition_m,...keys.map(k=>r[k]/1000),...keys.map(k=>a[k]/1000)]);
  });
 });
 const cell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
 return "\uFEFF"+[headers,...rows].map(r=>r.map(cell).join(",")).join("\r\n");
}
function buildCraneDemandTraceAudit(model,results,memberForceEnvelope,supportReactionEnvelope){
 const issues=[],nodeMap=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 const memberMap=new Map((model?.members||[]).map(m=>[String(m.id),m]));
 const expectedCases=(results||[]).map((sample,index)=>({caseIndex:Number.isInteger(sample.caseIndex)?sample.caseIndex:index,referencePosition_m:Number(sample.referencePosition_m),label:"CRANE-"+(index+1)+" @ "+Number(sample.referencePosition_m).toFixed(4)+" m"}));
 const caseIds=expectedCases.map(x=>x.caseIndex);
 if(!results?.length)issues.push("حالات واقعی تحلیل جرثقیل برای بسته ردیابی موجود نیست.");
 if(expectedCases.some(x=>!Number.isFinite(x.referencePosition_m)))issues.push("موقعیت طولی یکی از حالات جرثقیل معتبر نیست.");
 if(new Set(caseIds).size!==caseIds.length)issues.push("شناسه حالت جرثقیل تکراری است.");
 const memberRows=[];
 (memberForceEnvelope?.rows||[]).forEach(row=>{
  const meta=memberMap.get(String(row.id));
  const start=String(row.start??meta?.start??""),end=String(row.end??meta?.end??"");
  if(!meta)issues.push("عضو نیروگزارش‌شده در مدل فیزیکی وجود ندارد: "+row.id);
  if(!start||!end||!nodeMap.has(start)||!nodeMap.has(end))issues.push("نگاشت دو انتهای عضو "+row.id+" به گره‌های واقعی مدل ناقص است.");
  if(start&&end&&start===end)issues.push("دو انتهای عضو "+row.id+" به یک گره اشاره می‌کنند.");
  const cases=(row.simultaneousCases||[]).map((item,index)=>{
   const expected=expectedCases[index];
   if(!expected||String(item.label)!==expected.label)issues.push("برچسب/ترتیب حالت نیروی عضو "+row.id+" با موقعیت جرثقیل تطبیق ندارد.");
   const finiteEnd=endObj=>endObj&&["N","Vy","Vz","T","My","Mz"].every(k=>Number.isFinite(endObj[k]));
   if(!finiteEnd(item.endI)||!finiteEnd(item.endJ))issues.push("بردار هم‌زمان دو انتهای عضو "+row.id+" ناقص است.");
   return {caseIndex:expected?.caseIndex??index,referencePosition_m:expected?.referencePosition_m??null,label:item.label,endI:item.endI?{...item.endI}:null,endJ:item.endJ?{...item.endJ}:null,sourceVector:Array.isArray(item.sourceVector)?item.sourceVector.slice():null};
  });
  if(cases.length!==expectedCases.length)issues.push("تعداد حالات هم‌زمان عضو "+row.id+" با تعداد موقعیت‌های جرثقیل برابر نیست.");
  memberRows.push({memberId:String(row.id),sectionKey:row.sectionKey||meta?.sectionKey||"",startNodeId:start,endNodeId:end,localAxes:row.localAxes||null,localEndForceConventionVersion:row.localEndForceConventionVersion??null,caseCount:cases.length,cases});
 });
 const supportRows=[];
 (supportReactionEnvelope?.rows||[]).forEach(row=>{
  const node=nodeMap.get(String(row.nodeId));
  if(!node||!(node.kind==="base"||node.kind==="endwall-base"))issues.push("گره واکنش پایه "+row.nodeId+" در مدل پایه معتبر نیست.");
  const cases=(row.cases||[]).map((item,index)=>{
   const expected=expectedCases.find(x=>x.caseIndex===item.caseIndex);
   if(!expected||expected.referencePosition_m!==Number(item.referencePosition_m))issues.push("شناسه/موقعیت واکنش پایه "+row.nodeId+" با حالت تحلیل تطبیق ندارد.");
   const keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!item.solverReaction||!item.columnAction||keys.some(k=>!Number.isFinite(item.solverReaction[k])||!Number.isFinite(item.columnAction[k])))issues.push("بردار شش‌مؤلفه‌ای واکنش پایه "+row.nodeId+" ناقص است.");
   return {caseIndex:item.caseIndex,referencePosition_m:item.referencePosition_m,solverReaction:item.solverReaction?{...item.solverReaction}:null,columnAction:item.columnAction?{...item.columnAction}:null};
  });
  if(cases.length!==expectedCases.length)issues.push("تعداد حالات واکنش پایه "+row.nodeId+" کامل نیست.");
  supportRows.push({nodeId:String(row.nodeId),coordinatesM:node?{x:node.x,y:node.y,z:node.z}:null,kind:node?.kind||"",caseCount:cases.length,cases});
 });
 const expectedSupports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
 const returnedSupportIds=new Set(supportRows.map(x=>x.nodeId));
 expectedSupports.forEach(n=>{if(!returnedSupportIds.has(String(n.id)))issues.push("بسته تقاضای جرثقیل واکنش پایه "+n.id+" را ندارد.");});
 return {success:issues.length===0,issues,caseCount:expectedCases.length,memberCount:memberRows.length,supportCount:supportRows.length,cases:expectedCases,members:memberRows,supports:supportRows,units:{memberForce:"N",memberMoment:"N.m",supportForce:"N",supportMoment:"N.m"},memberForceBasis:"member-local end actions; axes are preserved and no cross-member vector summation is performed",supportForceBasis:"global support reaction and opposite column action; signs are preserved",simultaneousCasesPreserved:true,nonConcurrentEnvelopeComponentsNotSummed:true,designApproved:false,scope:"بسته تقاضای ردیابی جرثقیل از نیروهای انتهایی ستون/رفتر تا واکنش پایه؛ فاقد تبدیل محورها، طراحی اتصال، بولت، صفحه‌ستون و پی."};
}
async function analyzeAllFromUI(options){
 const opt=options||{},progress=typeof opt.onProgress==="function"?opt.onProgress:()=>{},maxCases=Number.isInteger(opt.maxCases)&&opt.maxCases>0?opt.maxCases:300;
 lastAutomaticEnvelope=null;
 const crane=root.SteelCraneReadiness?.getData?.()||{};
 if(!crane.enabled)return {success:true,notApplicable:true,analysisEnabled:false,total:0,results:[]};
 const route=root.SteelCraneLoadPath?.readUI?.()||{craneType:"overhead",supportSystem:"runway_girder"};
 const routeAudit=auditCraneType(route);
 if(!routeAudit.valid)return {success:false,analysisEnabled:false,issues:routeAudit.issues,results:[]};
 const readiness=root.SteelCraneReadiness?.audit?.(crane);
 if(readiness?.missing?.length)return {success:false,analysisEnabled:false,issues:["اطلاعات اصلی جرثقیل ناقص است: "+readiness.missing.join("، ")],results:[]};
 const advisoryPrefixes=["ضرایب ضربه و نیروهای افقی باید","بارهای حداکثر و حداقل چرخ باید","بارهای جرثقیل باید"];
 const fatalReadinessIssues=(readiness?.issues||[]).filter(x=>!advisoryPrefixes.some(prefix=>String(x).startsWith(prefix)));
 if(fatalReadinessIssues.length)return {success:false,analysisEnabled:false,issues:fatalReadinessIssues,results:[]};
 const impact=Number(crane.verticalImpact);
 if(!(Number.isFinite(impact)&&impact>0))return {success:false,analysisEnabled:false,issues:["ضریب اثر دینامیکی قائم باید مثبت و مستند باشد."],results:[]};
 const structural=root.SteelStructuralModel;
 if(!structural?.build||!structural?.analyze3D)return {success:false,analysisEnabled:false,issues:["مدل یا حل‌گر سه‌بعدی بارگذاری نشده است."],results:[]};
 let model;
 try{model=structural.build();}catch(e){return {success:false,analysisEnabled:false,issues:["تولید مدل سوله/جرثقیل ناموفق: "+String(e.message||e)],results:[]};}
 if(!model?.geometry?.craneRunway?.enabled)return {success:false,analysisEnabled:false,issues:["جرثقیل فعال است اما هندسه تیر حمال در مدل سه‌بعدی فعال نشده است."],results:[]};
 const bayAllocation=root.SteelCraneBayConfiguration?.readAndAudit?.(Number(model.geometry.bayCount));
 if(!bayAllocation)return {success:false,analysisEnabled:false,issues:["ماژول ممیزی جانمایی جرثقیل در دسترس نیست؛ تحلیل جرثقیل متوقف شد."],results:[]};
 if(!bayAllocation.valid||!bayAllocation.solverCompatible)return {success:false,analysisEnabled:false,issues:[...(bayAllocation.issues||[]),...(bayAllocation.warnings||[]),"حل‌گر فعلی فقط یک جرثقیل با مسیر سراسری تمام دهانه‌ها را پشتیبانی می‌کند؛ تحلیل جزئی/چندجرثقیل تا تکمیل مسیرهای مستقل بار اجرا نمی‌شود."],bayAllocation,results:[]};
 const craneMembers=model.members.filter(x=>x.craneIntegration===true);
 if(!model.geometry.craneRunway.integrationAudit?.success||!craneMembers.some(x=>x.sectionKey==="craneRunwayGirder")||!craneMembers.some(x=>x.sectionKey==="craneRunwayBracket"))
  return {success:false,analysisEnabled:false,issues:["تیر حمال و براکت با مقاطع SI و مراجع نقشه به مدل FEM متصل نشده‌اند؛ JSON یکپارچه‌سازی را تکمیل کنید."],results:[]};
 const twoRail=root.SteelCraneTwoRailTransfer;
 if(!twoRail?.readUI||!twoRail?.analyze)return {success:false,analysisEnabled:false,issues:["ماژول تحلیل هم‌زمان دو ریل در دسترس نیست."],results:[]};
 let railInput;
 try{railInput=applyVerticalImpact(twoRail.readUI(),impact);}catch(e){return {success:false,analysisEnabled:false,issues:[String(e.message||e)],results:[]};}
 const transfer=twoRail.analyze(railInput);
 if(!transfer?.success)return {success:false,analysisEnabled:false,issues:transfer?.audit?.issues||transfer?.issues||["تحلیل قطار چرخ روی دو ریل ناموفق است."],results:[]};
 const horizontal=root.SteelCraneHorizontalLoads?.getData?.()||{enabled:false};
 const train=root.SteelCraneTrainAnalysis?.getData?.()||{};
 const integration=root.SteelCrane3DIntegration?.readUI?.()||{};
 const prepared=prepareAll(model,transfer,horizontal,train,integration);
 if(!prepared.success)return {success:false,analysisEnabled:false,total:prepared.total,readyCount:prepared.readyCount,issues:prepared.issues,results:[]};
 if(prepared.total>maxCases)return {success:false,analysisEnabled:false,total:prepared.total,issues:["تعداد حالات جاروب جرثقیل "+prepared.total+" است و از سقف اجرای خودکار "+maxCases+" بیشتر است؛ گام مکانی را بزرگ‌تر کنید."],results:[]};
 const results=[];
 for(let i=0;i<prepared.cases.length;i++){
  progress("تحلیل موقعیت جرثقیل "+(i+1)+" از "+prepared.total+" ...");
  const one=await analyzeCase(i,transfer,horizontal,train,{...integration,...route});
  if(!one?.success)return {success:false,analysisEnabled:false,total:prepared.total,completed:results.length,failedCase:i+1,issues:one?.transfer?.issues||one?.issues||["حل سه‌بعدی یکی از موقعیت‌های جرثقیل ناموفق بود."],results};
  if(!one.result?.equilibrium?.ok)return {success:false,analysisEnabled:false,total:prepared.total,completed:results.length,failedCase:i+1,issues:["تعادل حل‌گر در موقعیت جرثقیل "+(i+1)+" برقرار نیست."],results};
  results.push({caseIndex:i,referencePosition_m:one.transfer.referencePosition_m,maxTranslation_m:Number(one.result.maxTranslation),equilibrium:one.result.equilibrium,analysis:one});
 }
 const critical=results.reduce((best,x)=>!best||x.maxTranslation_m>best.maxTranslation_m?x:best,null);
 const supportReactionEnvelope=buildCraneSupportReactionEnvelope(model,results);
 if(!supportReactionEnvelope.success)return {success:false,analysisEnabled:false,total:results.length,completed:results.length,issues:["پوش واکنش‌های پایه جرثقیل ناقص است: "+supportReactionEnvelope.issues.join("؛ ")],results};
 let memberForceEnvelope;
 try{memberForceEnvelope=buildMovingForceEnvelope(model,results);}catch(e){return {success:false,analysisEnabled:false,total:results.length,completed:results.length,issues:["استخراج پوش نیروهای اعضای جرثقیل ناموفق است: "+String(e.message||e)],results};}
 const demandTraceAudit=buildCraneDemandTraceAudit(model,results,memberForceEnvelope,supportReactionEnvelope);
 if(!demandTraceAudit.success)return {success:false,analysisEnabled:false,total:results.length,completed:results.length,issues:["ممیزی ردیابی هم‌زمان نیرو از ستون/رفتر تا پایه ناموفق است: "+demandTraceAudit.issues.join("؛ ")],results,memberForceEnvelope,supportReactionEnvelope};
 lastAutomaticEnvelope={success:true,analysisEnabled:false,total:results.length,results,memberForceEnvelope,mainFrameCoverage:memberForceEnvelope.mainFrameCoverage,supportReactionEnvelope,demandTraceAudit,criticalCase:critical?.caseIndex??null,maxTranslation_m:critical?.maxTranslation_m??null,
  loadBasis:"بار مرده و وزن خود اعضا + بار چرخ‌های قائم با ضریب دینامیکی قائم اعمال‌شده + نیروهای افقی مستند در صورت فعال‌بودن؛ هر موقعیت قطار جداگانه حل شده است.",
  note:"پوش تغییرمکان از نتایج حالات جداگانه؛ بیشینه‌های غیرهم‌زمان نیرو/لنگر با هم جمع نشده‌اند. این مرحله هنوز ترکیبات کامل آیین‌نامه‌ای جرثقیل، خستگی و طراحی نهایی تیر حمال/اتصالات را تأیید نمی‌کند."};
 return lastAutomaticEnvelope;
}
function selfTestSourceProvenance(){
 const legacy={geometrySource:"GA-1",wheelTrackSource:"GA-2",supportStiffnessSource:"TEST-1",wheelSources:[{side:"left",offset_m:0,source:"CR-1",document:"p.2"}]};
 const full={geometrySource:{document:"نقشه مصوب",revision:"A",locator:"GA-1",authority:"کارفرما"},wheelTrackSource:{document:"نقشه مصوب",revision:"A",locator:"GA-2",authority:"کارفرما"},supportStiffnessSource:{document:"گزارش آزمایش",revision:"1",locator:"بخش ۲",authority:"آزمایشگاه"},wheelSources:[{side:"left",document:"کاتالوگ سازنده",revision:"2026",locator:"صفحه ۲",authority:"سازنده"}]};
 const a=auditSourceProvenance(legacy,null),b=auditSourceProvenance(full,null),h=auditSourceProvenance(full,{enabled:true,source:"CR-1",document:"p.3"});
 return {checks:[{name:"rejects shorthand source identifiers as full provenance",ok:!a.complete&&a.incompleteCount===4},{name:"accepts explicit document, revision, locator and authority",ok:b.complete&&b.incompleteCount===0},{name:"requires horizontal-load provenance when enabled",ok:!h.complete}],analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 t("vertical dynamic factor scales both rail wheel trains without changing source sign",()=>{const x=applyVerticalImpact({leftWheels:[{P_N:-1000,source:"S",document:"p1"}],rightWheels:[{P_N:-1200,source:"S",document:"p1"}]},1.25);return x.leftWheels[0].P_N===-1250&&x.rightWheels[0].P_N===-1500&&x.leftWheels[0].staticInputP_N===-1000;});
 t("explicit overhead crane path is accepted for runway FEM",()=>{const old=root.SteelCraneLoadPath;root.SteelCraneLoadPath={classify:()=>({valid:true,craneType:"overhead",loadTarget:"crane_runway_and_frame",loadPath:["wheel","rail","runway_girder"]})};const r=auditCraneType({craneType:"overhead",supportSystem:"runway_girder"});root.SteelCraneLoadPath=old;return r.valid&&r.loadTarget==="crane_runway_and_frame";});
 t("ground gantry crane is blocked from overhead runway FEM",()=>{const old=root.SteelCraneLoadPath;root.SteelCraneLoadPath={classify:()=>({valid:true,craneType:"gantry"})};const r=auditCraneType({craneType:"gantry",supportSystem:"slab"});root.SteelCraneLoadPath=old;return !r.valid;});
 t("overhead crane on slab support is rejected",()=>{const old=root.SteelCraneLoadPath;root.SteelCraneLoadPath={classify:()=>({valid:false,issues:["invalid support"]})};const r=auditCraneType({craneType:"overhead",supportSystem:"slab"});root.SteelCraneLoadPath=old;return !r.valid;});
 t("legacy crane configuration remains explicitly unspecified",()=>auditCraneType({}).valid&&auditCraneType({}).legacyUnspecified===true);
 const model={geometry:{length:10},nodes:[{id:"L0",x:-.5,y:5,z:0},{id:"L1",x:-.5,y:5,z:5},{id:"L2",x:-.5,y:5,z:10},{id:"R0",x:10.5,y:5,z:0},{id:"R1",x:10.5,y:5,z:5},{id:"R2",x:10.5,y:5,z:10}],members:[
  {id:"GL1",start:"L0",end:"L1",side:"left",sectionKey:"craneRunwayGirder",craneIntegration:true},{id:"GL2",start:"L1",end:"L2",side:"left",sectionKey:"craneRunwayGirder",craneIntegration:true},
  {id:"GR1",start:"R0",end:"R1",side:"right",sectionKey:"craneRunwayGirder",craneIntegration:true},{id:"GR2",start:"R1",end:"R2",side:"right",sectionKey:"craneRunwayGirder",craneIntegration:true}]};
 const sourceDocuments={geometrySource:"GA-1",wheelTrackSource:"GA-2",supportStiffnessSource:"TEST-1",wheelSources:[{side:"left",offset_m:0,source:"CR-1",document:"p.2"},{side:"right",offset_m:0,source:"CR-1",document:"p.2"}]};
 const transfer={success:true,cases:[{referencePosition_m:1,girderPointLoads:{left:[{x_m:5,P_N:-5000,station:2,source:"rail-support-reaction"}],right:[{x_m:5,P_N:-6000,station:2,source:"rail-support-reaction"}]},sourceDocuments}]};
 const h={enabled:true,transverseLoads_kN:"10",longitudinalLoads_kN:"2",transverseSign:"+X",longitudinalSign:"+Z",source:"CR-1",document:"p.3"};
 const train={positions_m:"0"};
 const cfg={verticalReactionOffset_m:[0,.2,0],horizontalWheelOffset_m:[0,.3,0],horizontalApplicationSides:"both"};
 const r=prepareCase(model,transfer,0,h,train,cfg),sum=[0,0,0];
 r.nodalLoads.forEach(n=>n.values.slice(0,3).forEach((v,i)=>sum[i]+=v));
 t("maps concurrent left/right vertical reactions to exact support nodes",()=>r.success&&Math.abs(sum[1]+11000)<1e-8);
 t("horizontal point forces are distributed on both girder lines",()=>r.success&&Math.abs(sum[0]-20000)<1e-7&&Math.abs(sum[2]-4000)<1e-7);
 t("creates global eccentric moments for vertical and horizontal forces",()=>r.success&&r.nodalLoads.some(n=>Math.abs(n.values[3])+Math.abs(n.values[5])>0));
 t("does not mutate source 3D model",()=>model.nodes.length===6&&model.members.length===4);
 t("rejects missing load eccentricity",()=>!prepareCase(model,transfer,0,h,train,{...cfg,verticalReactionOffset_m:null}).success);
 t("rejects unspecified horizontal rail side",()=>!prepareCase(model,transfer,0,h,train,{...cfg,horizontalApplicationSides:""}).success);
 t("rejects unmatched vertical support station",()=>{const bad=JSON.parse(JSON.stringify(transfer));bad.cases[0].girderPointLoads.left[0].x_m=4.8;return !prepareCase(model,bad,0,h,train,cfg).success;});
 t("rejects incomplete load source chain",()=>{const bad=JSON.parse(JSON.stringify(transfer));bad.cases[0].sourceDocuments.wheelSources[0].document="";return !prepareCase(model,bad,0,h,train,cfg).success;});
 t("maps horizontal force at an exact support node without duplicate member mapping",()=>{const exact=prepareCase(model,transfer,0,{...h,enabled:true}, {positions_m:"4"},cfg);return exact.success&&exact.nodalLoads.some(n=>n.nodeId==="L1"&&Math.abs(n.values[0])>0);});
 t("rejects a moving wheel outside the physical runway instead of silently dropping its force",()=>{const outside=prepareCase(model,transfer,0,{...h,enabled:true},{positions_m:"20"},{...cfg,horizontalApplicationSides:"left"});return !outside.success&&outside.issues.some(x=>x.includes("خارج از طول واقعی تیر حمال"));});
 t("rejects missing runway length when horizontal wheel positions are evaluated",()=>{const noLength={...model,geometry:{}};const bad=prepareCase(noLength,transfer,0,{...h,enabled:true},{positions_m:"4"},{...cfg,horizontalApplicationSides:"left"});return !bad.success&&bad.issues.some(x=>x.includes("طول مؤثر مسیر ریل"));});
 const beam={geometry:{length:10},nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:0,z:10}],members:[{id:"M",start:"A",end:"B",side:"left",sectionKey:"craneRunwayGirder",craneIntegration:true}]};
 const oneRail={success:true,cases:[{referencePosition_m:0,girderPointLoads:{left:[],right:[]},sourceDocuments}]};
 const point=prepareCase(beam,oneRail,0,{...h,transverseLoads_kN:"1",longitudinalLoads_kN:"0"}, {positions_m:"5"}, {...cfg,horizontalApplicationSides:"left",horizontalWheelOffset_m:[0,0,0]});
 const solver=point.success?root.SteelFrame3D.analyze(beam,{sectionResolver:()=>({E:2e11,G:7.7e10,A:.01,Iy:2e-4,Iz:1e-4,J:1e-5}),supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}],nodalLoads:point.nodalLoads}):null;
 const expected=1000*25*25/(6*2e11*1e-4);
 const actual=solver?.displacements.find(n=>n.nodeId==="B")?.values[0];
 t("consistent horizontal point load matches cantilever closed-form deflection",()=>!!solver?.success&&solver.equilibrium.ok&&Math.abs(actual-expected)<expected*1e-7);
 t("crane base reaction envelope rejects a missing support reaction",()=>{const m={nodes:[{id:"B1",kind:"base"},{id:"B2",kind:"base"}]},r=[{caseIndex:0,referencePosition_m:1,analysis:{supportReactionActions:{rows:[{nodeId:"B1",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}}}],a=buildCraneSupportReactionEnvelope(m,r);return !a.success&&a.issues.some(x=>x.includes("B2"));});
 t("crane base reaction envelope preserves column action signs per position",()=>{const m={nodes:[{id:"B1",kind:"base"}]},r=[{caseIndex:0,referencePosition_m:1,analysis:{supportReactionActions:{rows:[{nodeId:"B1",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}}}],a=buildCraneSupportReactionEnvelope(m,r);return a.success&&a.rows[0].cases[0].columnAction.Fy===-2&&a.rows[0].cases[0].solverReaction.Fy===2;});
 t("main-frame coverage rejects a missing column action row",()=>{const m={members:[{id:"C1",sectionKey:"column"},{id:"R1",sectionKey:"rafter"}]},samples=[{label:"A"},{label:"B"}],rows=[{id:"C1",caseCount:2,simultaneousCases:[{},{}]},{id:"R1",caseCount:1,simultaneousCases:[{}]}],a=auditMainFrameMemberCoverage(m,samples,rows);return !a.success&&a.issues.some(x=>x.includes("رفتر قاب اصلی"));});
 t("main-frame coverage accepts complete column and rafter force traces",()=>{const m={members:[{id:"C1",sectionKey:"column"},{id:"R1",sectionKey:"rafter"}]},samples=[{label:"A"},{label:"B"}],rows=[{id:"C1",caseCount:2,simultaneousCases:[{},{}]},{id:"R1",caseCount:2,simultaneousCases:[{},{}]}],a=auditMainFrameMemberCoverage(m,samples,rows);return a.success&&a.families.column.coveredCount===1&&a.families.rafter.coveredCount===1;}); 
 t("crane base reaction CSV preserves signed six-component reactions and column actions per position",()=>{const csv=buildCraneBaseReactionCsv({success:true,rows:[{nodeId:"B1",cases:[{caseIndex:1,referencePosition_m:4.5,solverReaction:{Fx:1000,Fy:-2000,Fz:3000,Mx:-4000,My:5000,Mz:-6000},columnAction:{Fx:-1000,Fy:2000,Fz:-3000,Mx:4000,My:-5000,Mz:6000}}]}]});return csv.includes("B1")&&csv.includes("CRANE-2")&&csv.includes("-2")&&csv.includes("6");});
 t("crane demand trace preserves simultaneous member end forces and support actions",()=>{const m={nodes:[{id:"B",kind:"base",x:0,y:0,z:0},{id:"T",kind:"joint",x:0,y:5,z:0}],members:[{id:"C",start:"B",end:"T",sectionKey:"column"}]},r=[{caseIndex:0,referencePosition_m:2}],mf={rows:[{id:"C",sectionKey:"column",start:"B",end:"T",localAxes:{x:[1,0,0]},localEndForceConventionVersion:1,simultaneousCases:[{label:"CRANE-1 @ 2.0000 m",endI:{N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},endJ:{N:7,Vy:8,Vz:9,T:10,My:11,Mz:12},sourceVector:Array(12).fill(1)}]}]},sr={rows:[{nodeId:"B",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}]},a=buildCraneDemandTraceAudit(m,r,mf,sr);return a.success&&a.members[0].cases[0].endJ.Mz===12&&a.supports[0].cases[0].columnAction.Fy===-2;});
 t("crane demand trace blocks unmapped physical member ends",()=>{const m={nodes:[{id:"B",kind:"base",x:0,y:0,z:0}],members:[{id:"C",start:"B",end:"MISSING",sectionKey:"column"}]},r=[{caseIndex:0,referencePosition_m:2}],mf={rows:[{id:"C",start:"B",end:"MISSING",sectionKey:"column",simultaneousCases:[{label:"CRANE-1 @ 2.0000 m",endI:{N:0,Vy:0,Vz:0,T:0,My:0,Mz:0},endJ:{N:0,Vy:0,Vz:0,T:0,My:0,Mz:0}}]}]},sr={rows:[{nodeId:"B",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0},columnAction:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0}}]}]},a=buildCraneDemandTraceAudit(m,r,mf,sr);return !a.success&&a.issues.some(x=>x.includes("گره‌های واقعی"));});

 t("keeps analysis approval disabled",()=>r.analysisEnabled===false&&r.solverInputReady===true);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
function ensurePanel(){
 if(!root.document||root.document.getElementById("crane3DLoadTransferPanel"))return;
 const main=root.document.querySelector("main");if(!main)return;
 const panel=root.document.createElement("section");panel.className="panel";panel.id="crane3DLoadTransferPanel";
 panel.innerHTML='<div class="panel-title"><h3>انتقال بار جرثقیل به قاب سه‌بعدی</h3><span class="status">حالت‌های هم‌زمان</span></div>'+
 '<div class="notice">ابتدا تحلیل دو ریل و مشخصات اتصال/مقاطع را تکمیل کنید. در JSON یکپارچه‌سازی، خروج از مرکزیت واکنش قائم و بار افقی را از نقشه وارد کنید. این بخش هر حالت را جداگانه آماده می‌کند؛ بیشینه‌های غیرهم‌زمان با هم جمع نمی‌شوند.</div>'+
 '<div class="form-grid"><div class="field"><label for="crane3DLoadCaseSelect">حالت بار هم‌زمان</label><select id="crane3DLoadCaseSelect"><option value="">ابتدا آماده‌سازی حالات</option></select></div></div>'+
 '<div class="button-grid"><button type="button" class="btn secondary" id="crane3DPrepareCases">آماده‌سازی حالات بار</button><button type="button" class="btn" id="crane3DAnalyzeCase">تحلیل حالت انتخابی در قاب سه‌بعدی</button><button type="button" class="btn primary" id="crane3DAutomaticSweep">جاروب کامل موقعیت‌های جرثقیل و استخراج تقاضا</button><button type="button" class="btn secondary" id="crane3DDemandExport" disabled>دریافت بسته مهندسی تقاضا (JSON)</button><button type="button" class="btn secondary" id="crane3DConnectionExport" disabled>خروجی تقاضای اتصالات جرثقیل (CSV)</button><button type="button" class="btn secondary" id="crane3DBaseReactionExport" disabled>خروجی واکنش پایه و کنش ستون (CSV)</button></div>'+
 '<div id="crane3DLoadTransferResult" class="notice">هنوز حالتی آماده نشده است.</div>';
 const anchor=root.document.getElementById("shedLayoutPanel");
 if(anchor)anchor.insertAdjacentElement("afterend",panel);else main.appendChild(panel);
 let prepared=null;
 const status=()=>root.document.getElementById("crane3DLoadTransferResult");
 root.document.getElementById("crane3DPrepareCases").addEventListener("click",()=>{
  try{
   const model=root.SteelStructuralModel?.build?.()||root.SteelStructuralModel?.model;
   const transfer=root.SteelCraneTwoRailTransfer?.getLastResult?.();
   const horizontal=root.SteelCraneHorizontalLoads?.getData?.()||{enabled:false};
   const train=root.SteelCraneTrainAnalysis?.getData?.()||{};
   const config=root.SteelCrane3DIntegration?.readUI?.()||{};
   prepared=prepareAll(model,transfer,horizontal,train,config);
   const select=root.document.getElementById("crane3DLoadCaseSelect");select.innerHTML="";
   if(transfer?.cases)transfer.cases.forEach((c,i)=>{const option=root.document.createElement("option");option.value=String(i);option.textContent="حالت "+(i+1)+" ـ موقعیت قطار "+Number(c.referencePosition_m).toFixed(3)+" m";select.appendChild(option);});
   status().textContent=prepared.success?"آماده‌سازی موفق: "+prepared.readyCount+" از "+prepared.total+" حالت دارای بار گره‌ای معتبر هستند. تحلیل هر حالت جداگانه انجام می‌شود.":("آماده‌سازی کامل نشد. حالات آماده: "+prepared.readyCount+"/"+prepared.total+"؛ موارد مسدود: "+prepared.issues.slice(0,8).join(" | "));
  }catch(e){prepared=null;status().textContent="خطا: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DAutomaticSweep").addEventListener("click",async()=>{
  const sweepButton=root.document.getElementById("crane3DAutomaticSweep"),exportButton=root.document.getElementById("crane3DDemandExport");
  try{
   sweepButton.disabled=true;exportButton.disabled=true;
   const result=await analyzeAllFromUI({onProgress:message=>{status().textContent=message;}});
   if(!result?.success)throw Error((result?.issues||["جاروب خودکار جرثقیل کامل نشد."]).join("؛ "));
   exportButton.disabled=false;root.document.getElementById("crane3DConnectionExport").disabled=false;root.document.getElementById("crane3DBaseReactionExport").disabled=false;
   status().textContent="جاروب کامل شد: "+result.total+" موقعیت؛ "+result.demandTraceAudit.memberCount+" عضو و "+result.demandTraceAudit.supportCount+" پایه در بسته تقاضا ثبت شد. کنترل ظرفیت و طراحی اتصال/پی هنوز انجام نشده است.";
  }catch(e){status().textContent="جاروب متوقف شد: "+String(e.message||e);}
  finally{sweepButton.disabled=false;}
 });
 root.document.getElementById("crane3DAutomaticSweep").addEventListener("click",()=>{root.document.getElementById("crane3DConnectionExport").disabled=true;});
 root.document.getElementById("crane3DBaseReactionExport").addEventListener("click",()=>{
  try{
   if(!lastAutomaticEnvelope?.success||!lastAutomaticEnvelope.supportReactionEnvelope?.success)throw Error("ابتدا جاروب کامل و موفق موقعیت‌های جرثقیل را اجرا کنید.");
   const csv=buildCraneBaseReactionCsv(lastAutomaticEnvelope.supportReactionEnvelope),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");
   a.href=url;a.download="SAHROUD-STEEL-crane-base-reactions.csv";root.document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
   status().textContent="خروجی واکنش پایه و کنش ستون ساخته شد؛ هر پایه و هر موقعیت جرثقیل یک ردیف مستقل دارد. علامت‌ها حفظ شده‌اند؛ این خروجی طراحی صفحه‌ستون/بولت/پی نیست.";
  }catch(e){status().textContent="خروجی واکنش پایه ساخته نشد: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DConnectionExport").addEventListener("click",()=>{
  try{
   const registry=root.SteelConnectionDemandRegistry;
   if(!registry?.collectFromCraneDemandTrace||!registry?.toCraneCsv)throw Error("مبدل تقاضای جرثقیل به بانک اتصالات بارگذاری نشده است.");
   if(!lastAutomaticEnvelope?.success||!lastAutomaticEnvelope.demandTraceAudit?.success)throw Error("ابتدا جاروب کامل و موفق موقعیت‌های جرثقیل را اجرا کنید.");
   const rows=registry.collectFromCraneDemandTrace(lastAutomaticEnvelope.demandTraceAudit,root.SteelStructuralModel?.getData?.());
   const csv=registry.toCraneCsv(rows),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");
   a.href=url;a.download="SAHROUD-STEEL-crane-connection-demands.csv";root.document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
   status().textContent="خروجی CSV تقاضای اتصال ساخته شد: "+rows.length+" رکورد در گره‌های مشترک واقعی؛ مقادیر محلی با علامت و موقعیت مستقل حفظ شده‌اند.";
  }catch(e){status().textContent="خروجی تقاضای اتصالات ساخته نشد: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DDemandExport").addEventListener("click",()=>{
  try{
   if(!lastAutomaticEnvelope?.success||!lastAutomaticEnvelope.demandTraceAudit?.success)throw Error("ابتدا جاروب کامل موقعیت‌های جرثقیل را با موفقیت اجرا کنید.");
   const data={schema:"SAHROUD-STEEL-CRANE-DEMAND-TRACE-1.0",generatedAt:new Date().toISOString(),analysisEnabled:false,caseCount:lastAutomaticEnvelope.total,loadBasis:lastAutomaticEnvelope.loadBasis,notes:lastAutomaticEnvelope.note,demandTraceAudit:lastAutomaticEnvelope.demandTraceAudit,memberForceEnvelope:lastAutomaticEnvelope.memberForceEnvelope,supportReactionEnvelope:lastAutomaticEnvelope.supportReactionEnvelope,criticalCase:lastAutomaticEnvelope.criticalCase,maxTranslation_m:lastAutomaticEnvelope.maxTranslation_m};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");
   a.href=url;a.download="SAHROUD-STEEL-crane-demand-trace.json";root.document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }catch(e){status().textContent="ساخت بسته خروجی ناموفق بود: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DAnalyzeCase").addEventListener("click",async()=>{
  try{
   const select=root.document.getElementById("crane3DLoadCaseSelect"),i=Number(select.value);
   if(!prepared||!Number.isInteger(i)||!prepared.cases[i])throw Error("ابتدا حالات بار را آماده و یک حالت معتبر انتخاب کنید.");
   if(!prepared.cases[i].success)throw Error("این حالت آماده نیست: "+prepared.cases[i].issues.join(" | "));
   status().textContent="حل حالت انتخابی در پردازشگر سه‌بعدی در حال انجام است...";
   const transfer=root.SteelCraneTwoRailTransfer.getLastResult();
   const horizontal=root.SteelCraneHorizontalLoads?.getData?.()||{enabled:false};
   const train=root.SteelCraneTrainAnalysis?.getData?.()||{};
   const config=root.SteelCrane3DIntegration?.readUI?.()||{};
   const r=await analyzeCase(i,transfer,horizontal,train,config);
   if(!r.success)throw Error(r.transfer?.issues?.join(" | ")||"تحلیل حالت ناموفق بود.");
   const q=r.result;
   status().textContent="حل نرم‌افزاری انجام شد؛ گره بارگذاری: "+r.transfer.loadCount+"؛ بیشینه جابه‌جایی انتقالی: "+(q.maxTranslation??0).toExponential(4)+" m؛ واکنش‌های پایه/نیروی متناظر ستون: "+(r.supportReactionActions?.rows?.length??0)+" گره؛ تعادل نیرو: "+(q.equilibrium?.ok?"برقرار":"نیازمند بررسی")+"؛ تعادل لنگر: "+(q.equilibrium?.momentResidualNm||[]).map(v=>Number(v).toExponential(2)).join(", ")+" N.m. نیروهای پایه فقط تقاضا هستند؛ طراحی صفحه‌ستون، مهار و فونداسیون انجام نشده است.";
  }catch(e){status().textContent="تحلیل متوقف شد: "+String(e.message||e);}
 });
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
root.SteelCrane3DLoadTransfer={prepareCase,prepareAll,analyzeCase,analyzeAllFromUI,auditCraneType,auditSourceProvenance,selfTestSourceProvenance,selfTest,buildMovingForceEnvelope,buildCraneSupportReactionEnvelope,buildCraneDemandTraceAudit,buildCraneBaseReactionCsv,getLastAnalysis:()=>lastAnalysis,getLastAutomaticEnvelope:()=>lastAutomaticEnvelope};
})(typeof window!=="undefined"?window:globalThis);

