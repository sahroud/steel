"use strict";
const assert=require("node:assert/strict");
function equivalentLinearLoad(qStart,qEnd,L){
 if(!Array.isArray(qStart)||!Array.isArray(qEnd)||qStart.length!==3||qEnd.length!==3||
    !Number.isFinite(L)||L<=0||qStart.concat(qEnd).some(v=>!Number.isFinite(Number(v))))
  throw Error("بار خطی متغیر یا طول عضو نامعتبر است.");
 const [x0,y0,z0]=qStart.map(Number),[x1,y1,z1]=qEnd.map(Number);
 const f=Array(12).fill(0);
 f[0]=L*(2*x0+x1)/6; f[6]=L*(x0+2*x1)/6;
 f[1]=L*(7*y0+3*y1)/20;
 f[5]=L*L*(y0/20+y1/30);
 f[7]=L*(3*y0+7*y1)/20;
 f[11]=-L*L*(y0/30+y1/20);
 f[2]=L*(7*z0+3*z1)/20;
 f[4]=-L*L*(z0/20+z1/30);
 f[8]=L*(3*z0+7*z1)/20;
 f[10]=L*L*(z0/30+z1/20);
 return f;
}
function close(actual,expected,label){
 const tol=1e-9*Math.max(1,Math.abs(expected));
 assert.ok(Math.abs(actual-expected)<=tol,label+": "+actual+" != "+expected);
}
const L=7.3;
const cases=[
 {a:[1200,800,-450],b:[2600,1700,-900]},
 {a:[0,0,0],b:[0,0,0]},
 {a:[-500,900,300],b:[1100,-200,750]}
];
for(const {a,b} of cases){
 const f=equivalentLinearLoad(a,b,L);
 close(f[0]+f[6],L*(a[0]+b[0])/2,"axial resultant");
 close(f[1]+f[7],L*(a[1]+b[1])/2,"local-y resultant");
 close(f[2]+f[8],L*(a[2]+b[2])/2,"local-z resultant");
 close(f[5]+f[11]+L*f[7],L*L*(a[1]/6+b[1]/3),"local-z first moment");
 close(f[4]+f[10]-L*f[8],-L*L*(a[2]/6+b[2]/3),"local-y first moment");
}
const zero=equivalentLinearLoad([0,0,0],[0,0,0],L);
assert.ok(zero.every(v=>v===0),"zero load must produce zero vector");
assert.throws(()=>equivalentLinearLoad([1,2],[1,2,3],L));
assert.throws(()=>equivalentLinearLoad([1,2,3],[1,2,3],0));
console.log("PASS: linear-load vector force and first-moment equilibrium (3 cases), zero and invalid-input checks");


// Regression tests for the exact global-to-local vector transform used by
// end-wall wind loading in model-3d.js.
const fs=require("node:fs");
const vm=require("node:vm");
const solverSource=fs.readFileSync(require("node:path").join(__dirname,"../js/analysis-3d.js"),"utf8");
vm.runInThisContext(solverSource,{filename:"analysis-3d.js"});
const solver=globalThis.SteelFrame3D;
assert.equal(typeof solver.globalToLocalVector,"function","solver exports globalToLocalVector");
function dot(a,b){return a.reduce((sum,v,i)=>sum+v*b[i],0);}
function norm(v){return Math.hypot(...v);}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function reconstruct(local,axes){
 return [0,1,2].map(i=>axes.x[i]*local[0]+axes.y[i]*local[1]+axes.z[i]*local[2]);
}
const memberTransform=solver.makeTransform([1,2,3],[5,7,9]);
const globalStart=[0,0,12000],globalEnd=[0,0,24000];
const localStart=solver.globalToLocalVector(globalStart,memberTransform.axes);
const localEnd=solver.globalToLocalVector(globalEnd,memberTransform.axes);
const restoredStart=reconstruct(localStart,memberTransform.axes);
const restoredEnd=reconstruct(localEnd,memberTransform.axes);
restoredStart.forEach((v,i)=>close(v,globalStart[i],"global/local start round-trip"));
restoredEnd.forEach((v,i)=>close(v,globalEnd[i],"global/local end round-trip"));
close(norm(memberTransform.axes.x),1,"local x axis unit length");
close(norm(memberTransform.axes.y),1,"local y axis unit length");
close(norm(memberTransform.axes.z),1,"local z axis unit length");
close(dot(memberTransform.axes.x,memberTransform.axes.y),0,"local x/y orthogonal");
close(dot(memberTransform.axes.x,memberTransform.axes.z),0,"local x/z orthogonal");
close(dot(memberTransform.axes.y,memberTransform.axes.z),0,"local y/z orthogonal");
const front=[0,0,1],rear=[0,0,-1];
const frontUnit=solver.globalToLocalVector(front,memberTransform.axes);
const rearUnit=solver.globalToLocalVector(rear,memberTransform.axes);
frontUnit.forEach((v,i)=>close(v,-rearUnit[i],"front/rear unit pressure sign"));
const frontGlobal=[0,0,15000],rearGlobal=[0,0,-15000];
const frontLocal=solver.globalToLocalVector(frontGlobal,memberTransform.axes);
const rearLocal=solver.globalToLocalVector(rearGlobal,memberTransform.axes);
frontLocal.forEach((v,i)=>close(v,-rearLocal[i],"front/rear sign reversal"));
assert.throws(()=>solver.globalToLocalVector([1,2],[1,2,3]));
assert.throws(()=>solver.globalToLocalVector([1,2,3],{x:[1,0,0],y:[0,1,0],z:[0,0,NaN]}));
console.log("PASS: actual solver global/local transform, 3D axis orthonormality, front/rear sign and invalid-input checks");


// End-to-end regression: pass a linearly varying local end-wall load through
// the real 3D stiffness solver and verify support reactions and global balance.
const endToEndProps={E:200e9,G:80e9,A:0.01,Iy:1e-5,Iz:1e-5,J:2e-5};
const cantilever={
 nodes:[{id:"fixed",x:0,y:0,z:0},{id:"tip",x:5,y:0,z:0}],
 members:[{id:"end-wall-girt",start:"fixed",end:"tip",type:"beam",sectionKey:"endGirt",
  analysisLoad:{linearLocal:{start:[0,0,1000],end:[0,0,2000]}}}]
};
const endToEnd=solver.analyze(cantilever,{
 sectionResolver:()=>endToEndProps,
 supports:[{nodeId:"fixed",fixedDofs:[0,1,2,3,4,5]}]
});
assert.equal(endToEnd.success,true);
assert.equal(endToEnd.members[0].appliedLoadType,"linear-local");
assert.equal(endToEnd.equilibrium.ok,true,"cantilever global force and moment equilibrium");
close(endToEnd.equilibrium.appliedForceN[2],7500,"linearly varying wind resultant");
close(endToEnd.equilibrium.supportReactionN[2],-7500,"support vertical reaction");
close(endToEnd.equilibrium.appliedMomentNm[1],-20833.333333333332,"wind first moment about global Y");
close(endToEnd.equilibrium.supportMomentNm[1],20833.333333333332,"support moment about global Y");
console.log("PASS: real 3D solver end-to-end linear end-wall load, resultant, support reactions and global equilibrium");
