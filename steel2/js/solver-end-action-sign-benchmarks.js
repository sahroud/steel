/* SAHROUD STEEL — independent local end-action sign benchmarks.
 * Analytical single-member checks only; not code design or independent validation of the full building solver.
 */
(function(root){
"use strict";
function selfTest(){
 const E=200e9,G=77e9,A=.01,Iy=8e-5,Iz=2e-5,J=1e-5,L=3;
 const section={E,G,A,Iy,Iz,J},solver=root.SteelFrame3D;
 const close=(a,b,t=1e-7)=>Number.isFinite(a)&&Math.abs(a-b)<=Math.max(Math.abs(b)*t,1e-9);
 const tests=[];
 const add=(name,fn)=>{try{const detail=fn();tests.push({name,ok:detail===true,detail:detail===true?"passed":detail});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const solve=(nodes,members,supportNode,loadNode,load,extra={})=>{
  if(!solver?.analyze)throw Error("SteelFrame3D.analyze در دسترس نیست.");
  return solver.analyze({nodes,members},{sectionResolver:()=>section,supports:[{nodeId:supportNode,fixedDofs:[0,1,2,3,4,5]}],nodalLoads:[{nodeId:loadNode,values:load}],...extra});
 };
 add("cantilever-tip-concentrated-Mz",()=>{
  const r=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],[{id:"M",start:"A",end:"B"}],"A","B",[0,0,0,0,0,1000]);
  const f=r.members[0].localEndForces;
  return r.equilibrium.ok&&close(f[5],-1000)&&close(f[11],1000);
 });
 add("cantilever-tip-concentrated-My",()=>{
  const r=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],[{id:"M",start:"A",end:"B"}],"A","B",[0,0,0,0,1000,0]);
  const f=r.members[0].localEndForces;
  return r.equilibrium.ok&&close(f[4],-1000)&&close(f[10],1000);
 });
 add("reversed-node-order-axial-tension",()=>{
  const r=solve([{id:"B",x:L,y:0,z:0},{id:"A",x:0,y:0,z:0}],[{id:"M",start:"B",end:"A"}],"B","A",[-1000,0,0,0,0,0]);
  const f=r.members[0].localEndForces,ex=r.members[0].localAxes.x;
  return r.equilibrium.ok&&close(ex[0],-1)&&close(ex[1],0)&&close(f[0],-1000)&&close(f[6],1000);
 });
 add("rotated-member-local-y-axis-and-bending",()=>{
  const r=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:L,z:0}],[{id:"M",start:"A",end:"B"}],"A","B",[1000,0,0,0,0,0]);
  const m=r.members[0],f=m.localEndForces;
  return r.equilibrium.ok&&close(m.localAxes.y[0],-1)&&close(m.localAxes.y[1],0)&&close(f[1],1000)&&close(f[7],-1000)&&close(f[5],3000);
 });
 add("cantilever-tip-concentrated-Mx-torsion",()=>{
  const r=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],[{id:"M",start:"A",end:"B"}],"A","B",[0,0,0,1000,0,0]);
  const f=r.members[0].localEndForces;
  return r.equilibrium.ok&&close(f[3],-1000)&&close(f[9],1000);
 });
 add("released-j-end-bending-moment",()=>{
  const r=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],[{id:"M",start:"A",end:"B",endReleases:{j:[5]}}],"A","B",[0,-1000,0,0,0,0]);
  const f=r.members[0].localEndForces;
  return r.equilibrium.ok&&Math.abs(f[11])<1e-6&&close(f[1],1000)&&close(f[7],-1000);
 });
 add("axial-compression-sign-reversal",()=>{
  const tension=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],[{id:"M",start:"A",end:"B"}],"A","B",[1000,0,0,0,0,0]);
  const compression=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],[{id:"M",start:"A",end:"B"}],"A","B",[-1000,0,0,0,0,0]);
  const a=tension.members[0].localEndForces,b=compression.members[0].localEndForces;
  return tension.equilibrium.ok&&compression.equilibrium.ok&&a[0]<0&&a[6]>0&&b[0]>0&&b[6]<0;
 });
 add("local-axis-and-force-metadata-consistency",()=>{
  const r=solve([{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],[{id:"M",start:"A",end:"B"}],"A","B",[0,-1000,0,0,0,0]);
  const c=r.localEndForceConvention,m=r.members[0];
  return c?.version===1&&c.basis==="member-local"&&m.localEndForceConventionVersion===c.version&&m.localAxes.x[0]===1&&m.localEndForces.length===12&&r.equilibrium.ok;
 });
 return {passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok).length,total:tests.length,tests,note:"آزمون‌های تحلیلی عضو منفرد برای قرارداد علامت؛ جایگزین اعتبارسنجی مستقل حل‌گر، مدل سه‌بعدی کامل یا کنترل آیین‌نامه‌ای نیست."};
}
root.SteelSolverEndActionSignBenchmarks={selfTest};
})(typeof window!=="undefined"?window:globalThis);
