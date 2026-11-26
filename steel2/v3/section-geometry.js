(function(root){"use strict";
const EPS=1e-9;
function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function onSegment(a,b,p){return Math.min(a[0],b[0])-EPS<=p[0]&&p[0]<=Math.max(a[0],b[0])+EPS&&Math.min(a[1],b[1])-EPS<=p[1]&&p[1]<=Math.max(a[1],b[1])+EPS;}
function intersects(a,b,c,d){
 const x1=cross(a,b,c),x2=cross(a,b,d),x3=cross(c,d,a),x4=cross(c,d,b);
 if(((x1>EPS&&x2< -EPS)||(x1< -EPS&&x2>EPS))&&((x3>EPS&&x4< -EPS)||(x3< -EPS&&x4>EPS)))return true;
 return (Math.abs(x1)<=EPS&&onSegment(a,b,c))||(Math.abs(x2)<=EPS&&onSegment(a,b,d))||(Math.abs(x3)<=EPS&&onSegment(c,d,a))||(Math.abs(x4)<=EPS&&onSegment(c,d,b));
}
function calculate(points){
 if(!Array.isArray(points)||points.length<3)throw Error("حداقل سه رأس برای مقطع لازم است.");
 const p=points.map(v=>{
  if(!Array.isArray(v)||v.length!==2||!v.every(n=>Number.isFinite(Number(n))))throw Error("مختصات هر رأس باید [x,y] عددی باشد.");
  return [Number(v[0]),Number(v[1])];
 });
 const n=p.length;
 for(let i=0;i<n;i++){
  const q=p[(i+1)%n];
  if(Math.hypot(p[i][0]-q[0],p[i][1]-q[1])<EPS)throw Error("دو رأس متوالی تکراری یا یک ضلع با طول صفر وجود دارد.");
 }
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  if(j===i||j===(i+1)%n||i===(j+1)%n)continue;
  if(intersects(p[i],p[(i+1)%n],p[j],p[(j+1)%n]))throw Error("مرز مقطع خودتقاطع دارد؛ ترتیب رأس‌ها را اصلاح کنید.");
 }
 let A2=0,Cx6=0,Cy6=0,Ix12=0,Iy12=0,Ixy24=0;
 for(let i=0;i<n;i++){
  const [x,y]=p[i],[u,v]=p[(i+1)%n],z=x*v-u*y;
  A2+=z;Cx6+=(x+u)*z;Cy6+=(y+v)*z;
  Ix12+=(y*y+y*v+v*v)*z;Iy12+=(x*x+x*u+u*u)*z;
  Ixy24+=(2*x*y+x*v+u*y+2*u*v)*z;
 }
 if(Math.abs(A2)<EPS)throw Error("مساحت چندضلعی صفر است.");
 const signedA=A2/2,cx=Cx6/(3*A2),cy=Cy6/(3*A2),sign=Math.sign(signedA);
 const area=Math.abs(signedA);
 const Ix=sign*Ix12/12-area*cy*cy;
 const Iy=sign*Iy12/12-area*cx*cx;
 const Ixy=sign*Ixy24/24-area*cx*cy;
 const mean=(Ix+Iy)/2,rad=Math.hypot((Ix-Iy)/2,Ixy);
 const I1=mean+rad,I2=mean-rad;
 const angle=0.5*Math.atan2(-2*Ixy,Iy-Ix)*180/Math.PI;
 if(!(area>0&&Ix>0&&Iy>0&&I2>0))throw Error("هندسه یا جهت پیمایش رأس‌ها خواص سطح معتبر تولید نکرد.");
 return {area_mm2:area,cx_mm:cx,cy_mm:cy,Ix_mm4:Ix,Iy_mm4:Iy,Ixy_mm4:Ixy,principalI1_mm4:I1,principalI2_mm4:I2,principalAngle_deg:angle,A_cm2:area/100,Iy_cm4:Ix/1e4,Iz_cm4:Iy/1e4,Ixy_cm4:Ixy/1e4,principalI1_cm4:I1/1e4,principalI2_cm4:I2/1e4};
}
root.SahroudSectionGeometry={calculate};
})(window);
