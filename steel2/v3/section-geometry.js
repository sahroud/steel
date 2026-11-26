(function(root){"use strict";
function polygon(points){
 if(!Array.isArray(points)||points.length<3)throw Error("حداقل سه رأس برای مقطع لازم است.");
 let A2=0,Cx6=0,Cy6=0,Ix12=0,Iy12=0;
 for(let i=0;i<points.length;i++){
  const p=points[i],q=points[(i+1)%points.length];
  if(!Array.isArray(p)||p.length!==2||!p.every(v=>Number.isFinite(Number(v))))throw Error("مختصات هر رأس باید [x,y] عددی باشد.");
  const x=Number(p[0]),y=Number(p[1]),u=Number(q[0]),v=Number(q[1]),cross=x*v-u*y;
  A2+=cross;Cx6+=(x+u)*cross;Cy6+=(y+v)*cross;
  Ix12+=(y*y+y*v+v*v)*cross;Iy12+=(x*x+x*u+u*u)*cross;
 }
 if(Math.abs(A2)<1e-8)throw Error("مساحت چندضلعی صفر است یا نقاط نامعتبرند.");
 const signedA=A2/2,cx=Cx6/(3*A2),cy=Cy6/(3*A2);
 const IxOrigin=Ix12/12,IyOrigin=Iy12/12;
 const IxCentroid=Math.abs(IxOrigin-signedA*cy*cy),IyCentroid=Math.abs(IyOrigin-signedA*cx*cx);
 const area=Math.abs(signedA);
 return {area_mm2:area,cx_mm:cx,cy_mm:cy,Ix_mm4:IxCentroid,Iy_mm4:IyCentroid,A_cm2:area/100,Iy_cm4:IxCentroid/1e4,Iz_cm4:IyCentroid/1e4};
}
function calculate(points){return polygon(points);}
root.SahroudSectionGeometry={calculate};
})(window);
