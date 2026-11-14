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
   horizontalAudit.loads.forEach(w=>{
    const z=Number(c.referencePosition_m)+Number(w.x_m);
    if(z< -EPS||z>length+EPS)return;
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
 if(c&&(!sourceDocs?.geometrySource||!sourceDocs?.supportStiffnessSource||!sourceDocs?.wheelTrackSource||!Array.isArray(sourceDocs?.wheelSources)||sourceDocs.wheelSources.some(w=>!w.source||!w.document)))issues.push("زنجیره اسناد هندسه، سختی تکیه‌گاه و بار چرخ برای این حالت کامل نیست.");
 const loads=[...nodal.values()].map(x=>({nodeId:x.nodeId,values:x.values,sources:x.sources}));
 const ok=issues.length===0&&loads.length>0;
 return {success:ok,ready:ok,solverInputReady:ok,analysisEnabled:false,caseIndex,referencePosition_m:c?.referencePosition_m??null,nodalLoads:loads,loadCount:loads.length,sourceDocuments:sourceDocs||null,horizontalAudit,issues,modelFingerprint:model?{nodeCount:model.nodes.length,memberCount:model.members.length}:null,note:"بارهای قائم واکنش ریل روی گره‌های دقیق تیر حمال اعمال می‌شوند؛ نیروهای افقی در محل واقعی چرخ با بارهای گره‌ای معادل سازگار تیر توزیع می‌شوند. خروج از مرکزیت باید از نقشه وارد شود. هنوز کنترل مقاومت/اتصال و تأیید طراحی انجام نشده است."};
}
function prepareAll(model,transferResult,horizontalInput,trainInput,config){
 if(!transferResult?.success)return {success:false,analysisEnabled:false,issues:["نتیجه تحلیل هم‌زمان دو ریل در دسترس نیست."]};
 const cases=transferResult.cases.map((_,i)=>prepareCase(model,transferResult,i,horizontalInput,trainInput,config));
 return {success:cases.every(x=>x.success),analysisEnabled:false,total:cases.length,readyCount:cases.filter(x=>x.success).length,blockedCount:cases.filter(x=>!x.success).length,cases,issues:cases.flatMap(x=>x.issues).slice(0,50)};
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
 const result=await root.SteelStructuralModel.analyze3D({label:"بار مرده + جرثقیل ـ حالت هم‌زمان "+(caseIndex+1),factors:{dead:1,live:0,snow:0,wind:0},nodalLoads:p.nodalLoads,craneLoadCaseId:caseIndex,craneLoadTransfer:{referencePosition_m:p.referencePosition_m,sourceDocuments:p.sourceDocuments}});
 lastAnalysis={success:true,analysisEnabled:false,caseIndex,transfer:p,result};
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
 lastAutomaticEnvelope={success:true,analysisEnabled:false,total:results.length,results,criticalCase:critical?.caseIndex??null,maxTranslation_m:critical?.maxTranslation_m??null,
  loadBasis:"بار مرده و وزن خود اعضا + بار چرخ‌های قائم با ضریب دینامیکی قائم اعمال‌شده + نیروهای افقی مستند در صورت فعال‌بودن؛ هر موقعیت قطار جداگانه حل شده است.",
  note:"پوش تغییرمکان از نتایج حالات جداگانه؛ بیشینه‌های غیرهم‌زمان نیرو/لنگر با هم جمع نشده‌اند. این مرحله هنوز ترکیبات کامل آیین‌نامه‌ای جرثقیل، خستگی و طراحی نهایی تیر حمال/اتصالات را تأیید نمی‌کند."};
 return lastAutomaticEnvelope;
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
 const beam={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:0,z:10}],members:[{id:"M",start:"A",end:"B",side:"left",sectionKey:"craneRunwayGirder",craneIntegration:true}]};
 const oneRail={success:true,cases:[{referencePosition_m:0,girderPointLoads:{left:[],right:[]},sourceDocuments}]};
 const point=prepareCase(beam,oneRail,0,{...h,transverseLoads_kN:"1",longitudinalLoads_kN:"0"}, {positions_m:"5"}, {...cfg,horizontalApplicationSides:"left",horizontalWheelOffset_m:[0,0,0]});
 const solver=point.success?root.SteelFrame3D.analyze(beam,{sectionResolver:()=>({E:2e11,G:7.7e10,A:.01,Iy:2e-4,Iz:1e-4,J:1e-5}),supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}],nodalLoads:point.nodalLoads}):null;
 const expected=1000*25*25/(6*2e11*1e-4);
 const actual=solver?.displacements.find(n=>n.nodeId==="B")?.values[0];
 t("consistent horizontal point load matches cantilever closed-form deflection",()=>!!solver?.success&&solver.equilibrium.ok&&Math.abs(actual-expected)<expected*1e-7);
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
 '<div class="button-grid"><button type="button" class="btn secondary" id="crane3DPrepareCases">آماده‌سازی حالات بار</button><button type="button" class="btn" id="crane3DAnalyzeCase">تحلیل حالت انتخابی در قاب سه‌بعدی</button></div>'+
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
   status().textContent="حل نرم‌افزاری انجام شد؛ گره بارگذاری: "+r.transfer.loadCount+"؛ بیشینه جابه‌جایی انتقالی: "+(q.maxTranslation??0).toExponential(4)+" m؛ تعادل نیرو: "+(q.equilibrium?.ok?"برقرار":"نیازمند بررسی")+"؛ تعادل لنگر: "+(q.equilibrium?.momentResidualNm||[]).map(v=>Number(v).toExponential(2)).join(", ")+" N.m. این نتیجه تأیید طراحی نیست.";
  }catch(e){status().textContent="تحلیل متوقف شد: "+String(e.message||e);}
 });
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
root.SteelCrane3DLoadTransfer={prepareCase,prepareAll,analyzeCase,analyzeAllFromUI,auditCraneType,selfTest,getLastAnalysis:()=>lastAnalysis,getLastAutomaticEnvelope:()=>lastAutomaticEnvelope};
})(typeof window!=="undefined"?window:globalThis);

