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
