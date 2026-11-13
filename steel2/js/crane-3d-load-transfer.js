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
     const row=memberAt(model,side,z);
     if(!row){issues.push("بار افقی چرخ "+w.wheelIndex+" در موقعیت z="+z+" روی عضو تیر حمال "+side+" قرار نگرفت.");return;}
     addPointOnGirder(model,row,z,w.globalForce_N,hOffset,nodal,{kind:"crane-wheel-horizontal",side,wheelIndex:w.wheelIndex,casePosition_m:c.referencePosition_m,source:w.source,document:w.document},issues);
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
async function analyzeCase(caseIndex,transferResult,horizontalInput,trainInput,config){
 const model=root.SteelStructuralModel?.model;
 const p=prepareCase(model,transferResult,caseIndex,horizontalInput,trainInput,config);
 if(!p.success)return {success:false,analysisEnabled:false,transfer:p};
 const result=await root.SteelStructuralModel.analyze3D({label:"جرثقیل ـ حالت هم‌زمان "+(caseIndex+1),factors:{dead:0,live:0,snow:0,wind:0},nodalLoads:p.nodalLoads,craneLoadCaseId:caseIndex,craneLoadTransfer:{referencePosition_m:p.referencePosition_m,sourceDocuments:p.sourceDocuments}});
 return {success:true,analysisEnabled:false,caseIndex,transfer:p,result};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
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
 t("keeps analysis approval disabled",()=>r.analysisEnabled===false&&r.solverInputReady===true);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelCrane3DLoadTransfer={prepareCase,prepareAll,analyzeCase,selfTest};
})(typeof window!=="undefined"?window:globalThis);
