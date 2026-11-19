/* SAHROUD STEEL — elastic line-demand kernel for arbitrary coplanar weld segments.
 * Demand distribution only. No weld resistance, base-metal check or approval.
 * Coordinates and segment lengths: mm; forces: kN; moments: kN.mm; output: kN/mm.
 * Assumes uniform line stiffness and a rigid connected plate; this is not a plate-flexibility model.
 */
(function(root){
 "use strict";
 const finite=(v,n)=>{if(typeof v!=="number"||!Number.isFinite(v))throw new Error(n+" must be finite");return v;};
 function analyzeSegments(input){
  const segments=input?.segments;
  if(!Array.isArray(segments)||!segments.length)throw new Error("At least one weld segment is required");
  const parsed=segments.map((s,i)=>{
   if(!Array.isArray(s.start)||!Array.isArray(s.end)||s.start.length!==2||s.end.length!==2)throw new Error("Each segment needs 2D start/end coordinates");
   const x1=finite(s.start[0],"segment start x"),y1=finite(s.start[1],"segment start y");
   const x2=finite(s.end[0],"segment end x"),y2=finite(s.end[1],"segment end y");
   const length=Math.hypot(x2-x1,y2-y1);
   if(!(length>0))throw new Error("Zero-length weld segment is invalid");
   return{ id:s.id??String(i+1),x1,y1,x2,y2,length };
  });
  const L=parsed.reduce((v,s)=>v+s.length,0);
  const cx=parsed.reduce((v,s)=>v+s.length*(s.x1+s.x2)/2,0)/L;
  const cy=parsed.reduce((v,s)=>v+s.length*(s.y1+s.y2)/2,0)/L;
  // Exact line integral of squared radius over each straight segment.
  const J=parsed.reduce((sum,s)=>{
   const dx=s.x2-s.x1,dy=s.y2-s.y1;
   const ax=s.x1-cx,ay=s.y1-cy;
   const bx=s.x2-cx,by=s.y2-cy;
   return sum+s.length*(ax*ax+ay*ay+ax*bx+ay*by+bx*bx+by*by)/3;
  },0);
  if(!(J>0))throw new Error("Weld segments have zero polar line moment");
  const N=finite(input.N,"N"),Vx=finite(input.Vx,"Vx"),Vy=finite(input.Vy,"Vy"),Mz=finite(input.Mz,"Mz");
  const samples=[];
  parsed.forEach(s=>{
   for(const [name,x,y] of [["start",s.x1,s.y1],["end",s.x2,s.y2]]){
    const rx=x-cx,ry=y-cy;
    const qx=N/L-Mz*ry/J,qy=Vx/L+Mz*rx/J+Vy/L;
    samples.push({segmentId:s.id,point:name,x,y,qx,qy,q:Math.hypot(qx,qy)});
   }
  });
  const critical=samples.reduce((a,p)=>p.q>a.q?p:a,samples[0]);
  return{totalLength:L,centroid:{x:cx,y:cy},linePolarMoment:J,segments:parsed,
   samples,maxLineDemand:critical.q,criticalPoint:critical,
   components:{N,Vx,Vy,Mz},assumptions:["All weld segments are coplanar.","Uniform line stiffness and rigid connected plate are assumed.","Plate flexibility, local weld orientation effects, base-metal resistance and weld resistance are not evaluated."],
   units:{lineDemand:"kN/mm",length:"mm",moment:"kN.mm"}};
 }
 function analyze(input){
  const b=finite(input.width,"width"),h=finite(input.height,"height");
  if(!(b>0&&h>0))throw new Error("Weld-group dimensions must be positive");
  return analyzeSegments({segments:[
   {id:"bottom",start:[-b/2,-h/2],end:[b/2,-h/2]},
   {id:"right",start:[b/2,-h/2],end:[b/2,h/2]},
   {id:"top",start:[b/2,h/2],end:[-b/2,h/2]},
   {id:"left",start:[-b/2,h/2],end:[-b/2,-h/2]}
  ],N:input.N,Vx:0,Vy:input.V,Mz:input.M});
 }
 const api={analyze,analyzeSegments};
 root.SahroudWeldGroupDemand=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
