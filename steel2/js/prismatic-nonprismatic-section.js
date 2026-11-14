(function(root){
"use strict";
const KEYS=["depth_mm","flangeWidth_mm","flangeThickness_mm","webThickness_mm"];
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function fail(issues){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false};}
function section(s){
 const d=s.depth_mm,b=s.flangeWidth_mm,tf=s.flangeThickness_mm,tw=s.webThickness_mm;
 const hw=d-2*tf;
 if(d<=0||b<=0||tf<=0||tw<=0||hw<=0||tw>=b)throw Error("ابعاد مقطع I نامعتبر یا جان/بال نامتناسب است.");
 const A=2*b*tf+tw*hw;
 const Ix=2*((b*Math.pow(tf,3))/12+b*tf*Math.pow((d-tf)/2,2))+tw*Math.pow(hw,3)/12;
 const Iy=2*tf*Math.pow(b,3)/12+hw*Math.pow(tw,3)/12;
 const J=(2*b*Math.pow(tf,3)+hw*Math.pow(tw,3))/3;
 return {A_mm2:A,Ix_mm4:Ix,Iy_mm4:Iy,J_mm4_thinWall:J,rx_mm:Math.sqrt(Ix/A),ry_mm:Math.sqrt(Iy/A),Sx_mm3:Ix/(d/2),Sy_mm3:Iy/(b/2),webClearDepth_mm:hw,depth_mm:d,flangeWidth_mm:b,flangeThickness_mm:tf,webThickness_mm:tw};
}
function evaluate(input){
 const x=input||{},issues=[],L=num(x.length_m),raw=Array.isArray(x.stations)?x.stations:[];
 if(L===null||L<=0)issues.push("طول واقعی عضو باید مثبت و بر حسب متر باشد.");
 if(raw.length<2)issues.push("حداقل مشخصات مقطع در ابتدا و انتهای عضو لازم است.");
 if(x.sectionFamily!=="welded-I")issues.push("نسخه حاضر فقط مقطع I ورق‌ساخته با بال‌های موازی را پشتیبانی می‌کند.");
 if(x.geometrySource!=="shop-drawing"&&x.geometrySource!=="design-input")issues.push("منبع ابعاد مقطع باید نقشه ساخت یا ورودی طراحی مشخص باشد.");
 if(x.dimensionsVerified!==true)issues.push("ابعاد مقطع باید با نقشه/اندازه‌گیری تأیید شوند.");
 if(raw.some(s=>!s||num(s.x_m)===null||KEYS.some(k=>num(s[k])===null)))issues.push("مختصات ایستگاه و تمام ابعاد مقطع باید عددی و کامل باشند.");
 if(issues.length)return fail(issues);
 const stations=raw.map(s=>({x_m:num(s.x_m),depth_mm:num(s.depth_mm),flangeWidth_mm:num(s.flangeWidth_mm),flangeThickness_mm:num(s.flangeThickness_mm),webThickness_mm:num(s.webThickness_mm)})).sort((a,b)=>a.x_m-b.x_m);
 if(Math.abs(stations[0].x_m)>1e-8||Math.abs(stations[stations.length-1].x_m-L)>1e-6)issues.push("ایستگاه اول باید صفر و ایستگاه آخر برابر طول عضو باشد.");
 for(let i=0;i<stations.length;i++){
  if(stations[i].x_m<0||stations[i].x_m>L)issues.push("ایستگاه خارج از طول عضو است.");
  if(i&&stations[i].x_m-stations[i-1].x_m<=1e-8)issues.push("مختصات ایستگاه‌ها باید یکتا و افزایشی باشند.");
 }
 if(issues.length)return fail(issues);
 const maxStep=num(x.maxStationSpacing_m);
 if(maxStep===null||maxStep<=0)issues.push("حداکثر فاصله ایستگاه‌های محاسبات هندسی باید صریح و مثبت باشد.");
 if(issues.length)return fail(issues);
 const grid=[];
 for(let i=0;i<stations.length-1;i++){
  const a=stations[i],b=stations[i+1],span=b.x_m-a.x_m,n=Math.max(1,Math.ceil(span/maxStep));
  for(let j=0;j<n;j++){
   const t=j/n,p={x_m:a.x_m+span*t};
   KEYS.forEach(k=>p[k]=a[k]+(b[k]-a[k])*t);
   grid.push(p);
  }
 }
 grid.push({...stations[stations.length-1]});
 const tol=1e-8,first=stations[0];
 const prismatic=stations.every(s=>KEYS.every(k=>Math.abs(s[k]-first[k])<=tol*Math.max(1,Math.abs(first[k]))));
 let samples;
 try{samples=grid.map(s=>({x_m:s.x_m,geometry:{depth_mm:s.depth_mm,flangeWidth_mm:s.flangeWidth_mm,flangeThickness_mm:s.flangeThickness_mm,webThickness_mm:s.webThickness_mm},properties:section(s)}));}
 catch(e){return fail([e.message]);}
 const transitions=[];
 for(let i=1;i<stations.length-1;i++)transitions.push({x_m:stations[i].x_m,geometryChange:true});
 const minWeb=Math.min(...samples.map(s=>s.properties.webClearDepth_mm));
 return {ok:true,pass:true,memberType:prismatic?"prismatic":"non-prismatic",memberLabel:prismatic?"منشوری":"غیرمنشوری",method:"Piecewise-linear welded-I geometry interpolation and station-wise section-property calculation",length_m:L,stationCount:samples.length,definitionStations:stations.length,transitions,minWebClearDepth_mm:minWeb,stations:samples,analysisEnabled:false,designApproved:false,scope:"Geometry/property engine only. Not a variable-stiffness FEM element, not a code resistance check, and not a substitute for local plate slenderness, tapered-member buckling, lateral-torsional buckling, shear, interaction, second-order analysis, weld design or connection checks. Linear interpolation is assumed only between explicitly supplied geometry stations."};
}
function selfTest(){
 const base={length_m:6,sectionFamily:"welded-I",geometrySource:"shop-drawing",dimensionsVerified:true,maxStationSpacing_m:1,stations:[{x_m:0,depth_mm:500,flangeWidth_mm:200,flangeThickness_mm:12,webThickness_mm:8},{x_m:6,depth_mm:500,flangeWidth_mm:200,flangeThickness_mm:12,webThickness_mm:8}]};
 const a=evaluate(base),b=evaluate({...base,stations:[{...base.stations[0]},{...base.stations[1],depth_mm:900}]}),c=evaluate({...base,dimensionsVerified:false}),d=evaluate({...base,stations:[base.stations[0],{...base.stations[1],depth_mm:10}]});
 const checks=[a.ok&&a.memberType==="prismatic"&&a.stations.length===7,b.ok&&b.memberType==="non-prismatic"&&b.stations[3].properties.depth_mm>500,!c.ok,!d.ok];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelPrismaticNonprismaticSection={evaluate,sectionProperties:section,selfTest};
})(typeof window!=="undefined"?window:globalThis);
