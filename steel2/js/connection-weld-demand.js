/* SAHROUD STEEL — elastic line-demand kernel for a rectangular weld group.
 * Demand distribution only. No weld resistance, code factor, base-metal or execution approval.
 * Inputs: width/height mm; N,V kN in the weld-group plane; M kN.mm about its normal.
 */
(function(root){
 "use strict";
 function finite(v,name){const n=Number(v);if(!Number.isFinite(n))throw new Error(name+" must be finite");return n;}
 function analyze(input){
  const b=finite(input.width,"width"),h=finite(input.height,"height");
  const N=finite(input.N,"N"),V=finite(input.V,"V"),M=finite(input.M,"M");
  if(!(b>0&&h>0))throw new Error("Weld-group dimensions must be positive");
  const L=2*(b+h),J=2*(h*b*b/4+h*h*h/12)+2*(b*h*h/4+b*b*b/12);
  if(!(L>0&&J>0))throw new Error("Invalid weld-group geometry");
  const points=[
   {name:"bottom-left",x:-b/2,y:-h/2},{name:"bottom-right",x:b/2,y:-h/2},
   {name:"top-left",x:-b/2,y:h/2},{name:"top-right",x:b/2,y:h/2}
  ];
  const samples=points.map(p=>{
   const qx=N/L-M*p.y/J,qy=V/L+M*p.x/J;
   return {...p,qx,qy,q:Math.hypot(qx,qy)};
  });
  // On each straight segment q is affine in its position; its norm is convex,
  // therefore the maximum over a segment is attained at an endpoint.
  const critical=samples.reduce((a,p)=>p.q>a.q?p:a,samples[0]);
  return {perimeter:L,linePolarMoment:J,samples,maxLineDemand:critical.q,
   criticalPoint:critical.name,components:{N,V,M},units:{lineDemand:"kN/mm",length:"mm",moment:"kN.mm"}};
 }
 const api={analyze};
 root.SahroudWeldGroupDemand=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
