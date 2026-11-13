/* SAHROUD STEEL — 1D Euler-Bernoulli continuous rail beam FEM.
 * Linear elastic small-displacement model. Units: N, m, Pa, N/m, N.m/rad.
 * Software verification is not independent engineering validation.
 */
(function(root){
"use strict";
function solveLinear(A,b){
 const n=b.length,M=A.map((r,i)=>r.slice().concat([b[i]]));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(!(Math.abs(M[p][k])>1e-12))throw Error("ماتریس سختی تیر ریل تکین یا ناپایدار است؛ قیود و فنرهای تکیه‌گاهی را بررسی کنید.");
  [M[k],M[p]]=[M[p],M[k]];
  const pivot=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=pivot;
  for(let i=0;i<n;i++){if(i===k)continue;const f=M[i][k];if(f===0)continue;for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j];}
 }
 return M.map(r=>r[n]);
}
function shape(xi,L){
 const x=Math.max(0,Math.min(1,xi)),x2=x*x,x3=x2*x;
 return [1-3*x2+2*x3,L*(x-2*x2+x3),3*x2-2*x3,L*(-x2+x3)];
}
function elementK(EI,L){
 const L2=L*L,L3=L2*L,s=EI/L3;
 return [[12*s,6*L*s,-12*s,6*L*s],[6*L*s,4*L2*s,-6*L*s,2*L2*s],[-12*s,-6*L*s,12*s,-6*L*s],[6*L*s,2*L2*s,-6*L*s,4*L2*s]];
}
function analyze(input){
 const p=input||{},length=Number(p.length_m),E=Number(p.E_MPa),I=Number(p.Ix_mm4);
 if(!(Number.isFinite(length)&&length>0&&Number.isFinite(E)&&E>0&&Number.isFinite(I)&&I>0))throw Error("طول، مدول الاستیسیته و ممان اینرسی ریل باید مثبت و معتبر باشند.");
 const EI=E*I/1e6;
 const mesh=(Array.isArray(p.meshPositions_m)?p.meshPositions_m:[]).concat([0,length],(p.supports||[]).map(s=>Number(s.x_m))).filter(Number.isFinite).sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-8);
 if(mesh.length<2||Math.abs(mesh[0])>1e-8||Math.abs(mesh[mesh.length-1]-length)>1e-8)throw Error("شبکه تیر باید از صفر تا طول کامل ریل را پوشش دهد.");
 if(mesh.some(x=>x<0||x>length))throw Error("مختصات شبکه خارج از طول ریل است.");
 const supports=p.supports||[],loads=p.pointLoads||[];
 if(supports.length<2)throw Error("حداقل دو ایستگاه تکیه‌گاهی فنری لازم است.");
 supports.forEach((s,i)=>{if(!(Number.isFinite(Number(s.x_m))&&Number(s.x_m)>=0&&Number(s.x_m)<=length&&Number.isFinite(Number(s.kVertical_N_m))&&Number(s.kVertical_N_m)>0))throw Error("مختصات و سختی قائم تکیه‌گاه شماره "+(i+1)+" باید معتبر و سختی مثبت باشد.");if(s.kRotational_Nm_rad!==undefined&&s.kRotational_Nm_rad!==null&&!(Number.isFinite(Number(s.kRotational_Nm_rad))&&Number(s.kRotational_Nm_rad)>=0))throw Error("سختی دورانی تکیه‌گاه باید صفر یا مثبت باشد.");});
 if(new Set(supports.map(s=>Number(s.x_m).toFixed(8))).size<2)throw Error("حداقل دو موقعیت مکانی مستقل برای تکیه‌گاه‌های قائم لازم است.");
 loads.forEach((l,i)=>{if(!(Number.isFinite(Number(l.x_m))&&Number(l.x_m)>=0&&Number(l.x_m)<=length&&Number.isFinite(Number(l.P_N))))throw Error("مختصات و مقدار بار چرخ شماره "+(i+1)+" نامعتبر است.");});
 const n=mesh.length,nd=2*n,K=Array.from({length:nd},()=>Array(nd).fill(0)),F=Array(nd).fill(0),elements=[];
 for(let e=0;e<n-1;e++){
  const L=mesh[e+1]-mesh[e];if(!(L>1e-9))throw Error("طول المان تیر ریل باید مثبت باشد.");
  const ke=elementK(EI,L),dofs=[2*e,2*e+1,2*(e+1),2*(e+1)+1];
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)K[dofs[i]][dofs[j]]+=ke[i][j];
  elements.push({index:e+1,x1_m:mesh[e],x2_m:mesh[e+1],length_m:L,dofs,ke,loadVector:[0,0,0,0]});
 }
 const loadAudit=[];
 loads.forEach((load,index)=>{
  const x=Number(load.x_m),P=Number(load.P_N);let e=elements.findIndex(el=>x>=el.x1_m-1e-9&&x<=el.x2_m+1e-9);
  if(e<0)throw Error("بار چرخ خارج از شبکه تیر است.");
  const el=elements[e],xi=(x-el.x1_m)/el.length_m,N=shape(xi,el.length_m),equiv=N.map(v=>v*P);
  el.dofs.forEach((d,j)=>{F[d]+=equiv[j];el.loadVector[j]+=equiv[j];});
  loadAudit.push({index:index+1,x_m:x,P_N:P,element:e+1,localCoordinate:xi,shapeFunctions:N,equivalentNodalLoads:equiv});
 });
 const springRows=[];
 supports.forEach((s,index)=>{
  const x=Number(s.x_m),i=mesh.findIndex(v=>Math.abs(v-x)<1e-7);
  if(i<0)throw Error("ایستگاه تکیه‌گاهی در شبکه تیر وجود ندارد.");
  const kv=Number(s.kVertical_N_m),kr=s.kRotational_Nm_rad==null?0:Number(s.kRotational_Nm_rad);
  K[2*i][2*i]+=kv;if(kr>0)K[2*i+1][2*i+1]+=kr;
  springRows.push({station:index+1,x_m:x,nodeIndex:i,verticalStiffness_N_m:kv,rotationalStiffness_Nm_rad:kr});
 });
 const D=solveLinear(K,F),springReactions=springRows.map(s=>({station:s.station,x_m:s.x_m,verticalReaction_N:-s.verticalStiffness_N_m*D[2*s.nodeIndex],rotationalReaction_Nm:-s.rotationalStiffness_Nm_rad*D[2*s.nodeIndex+1],verticalDisplacement_m:D[2*s.nodeIndex],rotation_rad:D[2*s.nodeIndex+1]}));
 const totalLoad=loads.reduce((a,l)=>a+Number(l.P_N),0),totalReaction=springReactions.reduce((a,r)=>a+r.verticalReaction_N,0);
 const appliedMoment=loads.reduce((a,l)=>a+Number(l.P_N)*Number(l.x_m),0),reactionMoment=springReactions.reduce((a,r)=>a+r.verticalReaction_N*r.x_m,0)+springReactions.reduce((a,r)=>a+r.rotationalReaction_Nm,0);
 const elementResults=elements.map(el=>{const d=el.dofs.map(i=>D[i]),end=el.ke.map((row,i)=>row.reduce((a,v,j)=>a+v*d[j],0)-el.loadVector[i]);return {index:el.index,start_m:el.x1_m,end_m:el.x2_m,endActions:[end[0],end[1],end[2],end[3]]};});
 const maxDeflection=D.filter((_,i)=>i%2===0).reduce((best,v,i)=>Math.abs(v)>Math.abs(best.value)?{value:v,x_m:mesh[i]}:best,{value:0,x_m:0});
 return {success:true,method:"linear Euler-Bernoulli beam FEM with cubic Hermite interpolation",units:{force:"N",length:"m",moment:"N.m",verticalSpring:"N/m",rotationalSpring:"N.m/rad"},length_m:length,EI_Nm2:EI,nodeCount:n,elementCount:elements.length,supportCount:springRows.length,pointLoadCount:loads.length,nodes:mesh.map((x,i)=>({x_m:x,verticalDisplacement_m:D[2*i],rotation_rad:D[2*i+1]})),supports:springReactions,loads:loadAudit,elements:elementResults,maxNodalDeflection:maxDeflection,equilibrium:{verticalLoad_N:totalLoad,verticalReaction_N:totalReaction,verticalResidual_N:totalLoad+totalReaction,globalMoment_Nm:appliedMoment+reactionMoment,ok:Math.abs(totalLoad+totalReaction)<=Math.max(1e-5,Math.abs(totalLoad)*1e-7)&&Math.abs(appliedMoment+reactionMoment)<=Math.max(1e-5,Math.abs(appliedMoment)*1e-7)},analysisEnabled:false,solverExecuted:true,limitations:["Linear elastic Euler-Bernoulli beam; shear deformation and warping torsion omitted.","Small displacement, constant EI per run; no geometric or material nonlinearity.","Support springs are independent scalar vertical/rotational springs; no uplift-only contact, gap, friction, slip, hysteresis or coupled stiffness.","Point loads between nodes are transferred by cubic Hermite shape functions; wheel load dynamics/impact are not included.","Rail joints, fishplates, weld continuity, lateral restraint and torsional behavior require separately verified models.","Not a code-compliance design or approval; support stiffness and section properties must be documented."]};
}
function auditReadiness(input){
 const p=input||{},issues=[],L=Number(p.length_m),E=Number(p.E_MPa),I=Number(p.Ix_mm4);
 if(!(Number.isFinite(L)&&L>0))issues.push("طول ریل معتبر نیست.");
 if(!(Number.isFinite(E)&&E>0))issues.push("مدول الاستیسیته مستند و مثبت لازم است.");
 if(!(Number.isFinite(I)&&I>0))issues.push("ممان اینرسی حول محور خمش قائم با مرجع معتبر لازم است.");
 if(!String(p.propertySource||"").trim())issues.push("مرجع خواص مقطع ریل ثبت نشده است.");
 if(p.continuity!=="continuous")issues.push("این نسخه فقط ریل پیوسته با رفتار خمشی پیوسته را می‌پذیرد؛ حالت ساده‌تکیه‌گاهی/وصله نامشخص هنوز مدل نشده است.");
 if(Array.isArray(p.jointPositions_m)&&p.jointPositions_m.some(x=>Number(x)>1e-8&&Number(x)<L-1e-8))issues.push("برای وصله‌های میانی، جزئیات انتقال برش و لنگر و پیوستگی دورانی باید پیش از تحلیل مشخص شود.");
 const stations=Array.isArray(p.supportStations_m)?p.supportStations_m:[],ks=Array.isArray(p.verticalSpringStiffness_N_m)?p.verticalSpringStiffness_N_m:[];
 if(stations.length<2)issues.push("حداقل دو ایستگاه تکیه‌گاهی لازم است.");
 if(ks.length!==stations.length||ks.some(k=>!(Number.isFinite(Number(k))&&Number(k)>0)))issues.push("برای تک‌تک ایستگاه‌ها سختی قائم مثبت و مستند لازم است.");
 if(!String(p.supportStiffnessSource||"").trim())issues.push("مرجع سختی قائم بست/پد ثبت نشده است.");
 const loads=Array.isArray(p.pointLoads)?p.pointLoads:[];
 if(!loads.length)issues.push("قطار چرخ مستند و بارهای قائم چرخ لازم است.");
 loads.forEach((l,i)=>{if(!(Number.isFinite(Number(l.x_m))&&Number(l.x_m)>=0&&Number(l.x_m)<=L&&Number.isFinite(Number(l.P_N))))issues.push("مختصات/بار چرخ شماره "+(i+1)+" نامعتبر است.");if(!String(l.source||"").trim()||!String(l.document||"").trim())issues.push("منبع و شماره صفحه/مرجع بار چرخ شماره "+(i+1)+" لازم است.");});
 return {ready:issues.length===0,analysisEnabled:false,issues,note:"ممیزی فقط کامل بودن ورودی را می‌سنجد؛ حتی پس از تکمیل، تحلیل نیازمند اعتبارسنجی مستقل و بررسی مهندسی است."};
}
function analyzeIfReady(input){
 const audit=auditReadiness(input);
 if(!audit.ready)return {success:false,analysisEnabled:false,audit};
 const supports=input.supportStations_m.map((x,i)=>({x_m:Number(x),kVertical_N_m:Number(input.verticalSpringStiffness_N_m[i])}));
 const pointLoads=input.pointLoads.map(l=>({x_m:Number(l.x_m),P_N:Number(l.P_N)}));
 const result=analyze({...input,supports,pointLoads});
 return {...result,inputAudit:audit,analysisEnabled:false,note:"نتیجه تحلیل عددی مقدماتی است؛ برای طراحی/تأیید اجرایی کافی نیست."};
}
function selfTest(){
 const tests=[],test=(name,fn)=>{try{const detail=fn();tests.push({name,ok:detail!==false,detail:detail===true?"passed":detail});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const base={length_m:10,E_MPa:200000,Ix_mm4:1e8,meshPositions_m:[0,5,10],supports:[{x_m:0,kVertical_N_m:1e12},{x_m:10,kVertical_N_m:1e12}],pointLoads:[{x_m:5,P_N:-1000}]};
 test("simply-supported-midpoint-load-reaction-equilibrium",()=>{const r=analyze(base);return Math.abs(r.supports[0].verticalReaction_N-500)<1e-3&&Math.abs(r.supports[1].verticalReaction_N-500)<1e-3&&r.equilibrium.ok;});
 test("midpoint-deflection-approaches-closed-form",()=>{const r=analyze(base),expected=-1000*Math.pow(10,3)/(48*(200000*1e8/1e6));return Math.abs(r.nodes[1].verticalDisplacement_m-expected)<1e-8;});
 test("hermite-point-load-between-nodes",()=>{const r=analyze({...base,meshPositions_m:[0,10],pointLoads:[{x_m:3.7,P_N:-1000}]});const a=r.loads[0];return a.element===1&&a.localCoordinate>0&&a.localCoordinate<1&&Math.abs(a.equivalentNodalLoads[0]+a.equivalentNodalLoads[2]+1000)<1e-8;});
 test("reject-missing-support-stiffness",()=>{try{analyze({...base,supports:[{x_m:0,kVertical_N_m:0},{x_m:10,kVertical_N_m:1e12}]});return false;}catch(e){return String(e.message).includes("مثبت");}});
 test("reject-singular-unrestrained-beam",()=>{try{analyze({...base,supports:[{x_m:0,kVertical_N_m:1e12},{x_m:0,kVertical_N_m:1e12}]});return false;}catch(e){return true;}});
 test("readiness-rejects-undocumented-spring-stiffness",()=>{const a=auditReadiness({length_m:10,E_MPa:200000,Ix_mm4:1e8,propertySource:"rail catalog",continuity:"continuous",supportStations_m:[0,10],verticalSpringStiffness_N_m:[1e9,1e9],supportStiffnessSource:"",pointLoads:[{x_m:5,P_N:-1000,source:"crane drawing",document:"sheet 2"}]});return !a.ready&&a.issues.some(x=>x.includes("مرجع سختی"))&&a.analysisEnabled===false;});
 test("readiness-gated-rail-analysis-remains-unapproved",()=>{const r=analyzeIfReady({length_m:10,E_MPa:200000,Ix_mm4:1e8,propertySource:"rail catalog p.2",continuity:"continuous",supportStations_m:[0,10],verticalSpringStiffness_N_m:[1e12,1e12],supportStiffnessSource:"verified connector test",pointLoads:[{x_m:5,P_N:-1000,source:"crane drawing",document:"sheet 2"}]});return r.success&&r.equilibrium.ok&&r.analysisEnabled===false;});

 test("continuous two-span rail with unequal support springs and multiple wheel loads",()=>{const r=analyze({length_m:12,E_MPa:200000,Ix_mm4:1.5e8,meshPositions_m:[0,6,12],supports:[{x_m:0,kVertical_N_m:8e8},{x_m:6,kVertical_N_m:1.1e9},{x_m:12,kVertical_N_m:7e8}],pointLoads:[{x_m:3,P_N:-12000},{x_m:9,P_N:-8000}]});return r.success&&r.supports.length===3&&r.loads.length===2&&r.equilibrium.ok;});
 return {schemaVersion:1,passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok).length,total:tests.length,tests,note:"Deterministic mathematical/software checks only; not independent engineering validation or code compliance."};
}
root.SteelRailBeamFEM={analyze,auditReadiness,analyzeIfReady,selfTest};
})(typeof window!=="undefined"?window:globalThis);
