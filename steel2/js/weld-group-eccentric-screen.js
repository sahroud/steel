(function(root){
"use strict";
function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function fail(issues){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false,method:"Elastic planar eccentric fillet-weld-group screen"};}
function evaluate(input){
 const x=input||{},issues=[],segments=Array.isArray(x.segments)?x.segments:[];
 const F=n(x.FEXX_MPa),w=n(x.weldSize_mm),Fx=n(x.Fx_N),Fy=n(x.Fy_N),Mz=n(x.Mz_Nmm);
 if(F===null||w===null||Fx===null||Fy===null||Mz===null||segments.length===0)issues.push("FEXX، اندازه جوش، Fx، Fy، Mz و خطوط جوش لازم‌اند.");
 if(x.weldType!=="fillet")issues.push("این نسخه فقط جوش گوشه را پشتیبانی می‌کند.");
 if(x.loadPlane!=="in-plane")issues.push("فقط بارگذاری درون‌صفحه‌ای Fx، Fy و Mz پشتیبانی می‌شود.");
 if(x.baseMetalChecksComplete!==true)issues.push("تکمیل کنترل فلز پایه باید جداگانه تأیید شود.");
 if(x.loadPathReviewed!==true||x.connectionDrawingReference==null||!String(x.connectionDrawingReference).trim())issues.push("بازبینی مسیر بار و مرجع نقشه اتصال لازم است.");
 if([F,w,Fx,Fy,Mz].some(v=>v===null)||!segments.length)return fail(issues);
 if(F<=0||w<=0)issues.push("مقاومت فلز جوش و اندازه جوش باید مثبت باشند.");
 const lines=segments.map((s,i)=>{const x1=n(s.x1_mm),y1=n(s.y1_mm),x2=n(s.x2_mm),y2=n(s.y2_mm);if([x1,y1,x2,y2].some(v=>v===null))issues.push("مختصات خط جوش "+(i+1)+" نامعتبر است.");const L=Math.hypot((x2||0)-(x1||0),(y2||0)-(y1||0));if(L<=0)issues.push("طول خط جوش "+(i+1)+" باید مثبت باشد.");return {i:i+1,x1,y1,x2,y2,L};});
 if(issues.length)return fail(issues);
 const totalL=lines.reduce((a,s)=>a+s.L,0);
 const cx=lines.reduce((a,s)=>a+s.L*(s.x1+s.x2)/2,0)/totalL;
 const cy=lines.reduce((a,s)=>a+s.L*(s.y1+s.y2)/2,0)/totalL;
 let J=0;
 for(const s of lines){
  const ax=s.x1-cx,ay=s.y1-cy,dx=s.x2-s.x1,dy=s.y2-s.y1;
  J+=s.L*(ax*ax+ay*ay)+(ax*dx+ay*dy)*s.L+(dx*dx+dy*dy)*s.L/3;
 }
 if(!(J>0)){issues.push("ممان قطبی خطی گروه جوش صفر یا نامعتبر است.");return fail(issues);}
 const qx=Fx/totalL,qy=Fy/totalL,points=[];
 for(const s of lines){
  for(const [end,px,py] of [["start",s.x1,s.y1],["end",s.x2,s.y2]]){
   const rx=px-cx,ry=py-cy;
   const tx=qx-Mz*ry/J,ty=qy+Mz*rx/J;
   points.push({segment:s.i,end,x_mm:px,y_mm:py,shearX_N_per_mm:tx,shearY_N_per_mm:ty,resultant_N_per_mm:Math.hypot(tx,ty)});
  }
 }
 const governing=points.reduce((a,b)=>b.resultant_N_per_mm>a.resultant_N_per_mm?b:a,points[0]);
 const throat=.707*w,phi=.75,capacity=phi*.60*F*throat;
 const demand=governing.resultant_N_per_mm,util=demand/capacity;
 return {ok:true,pass:util<=1,issues,method:"AISC 360-22 J2 LRFD; elastic line-weld-group distribution for in-plane Fx/Fy/Mz; directionality factor 1.0",centroid_mm:{x:cx,y:cy},totalEffectiveLength_mm:totalL,linePolarMoment_mm3:J,effectiveThroat_mm:throat,phi,nominalStrength_N_per_mm:.60*F*throat,designStrength_N_per_mm:capacity,maximumDemand_N_per_mm:demand,utilization:util,governingPoint:governing,pointDemands:points,analysisEnabled:false,designApproved:false,scope:"Planar fillet weld group only. Elastic method, constant weld size and FEXX. No out-of-plane forces/moments, torsion about in-plane axes, CJP/PJP, base-metal strength calculation, long-weld reduction, fatigue, plastic instantaneous-center method or code-specific local detailing."};
}
function selfTest(){
 const base={FEXX_MPa:490,weldSize_mm:6,Fx_N:12000,Fy_N:0,Mz_Nmm:200000,weldType:"fillet",loadPlane:"in-plane",baseMetalChecksComplete:true,loadPathReviewed:true,connectionDrawingReference:"W-01",segments:[{x1_mm:-50,y1_mm:-40,x2_mm:50,y2_mm:-40},{x1_mm:50,y1_mm:-40,x2_mm:50,y2_mm:40},{x1_mm:50,y1_mm:40,x2_mm:-50,y2_mm:40},{x1_mm:-50,y1_mm:40,x2_mm:-50,y2_mm:-40}]};
 const a=evaluate(base),b=evaluate({...base,segments:[]}),c=evaluate({...base,loadPlane:"3d"}),d=evaluate({...base,baseMetalChecksComplete:false}),e=evaluate({...base,Mz_Nmm:0});
 const checks=[a.ok&&a.centroid_mm.x===0&&a.centroid_mm.y===0,!b.ok,!c.ok,!d.ok,e.ok&&e.utilization<a.utilization];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelWeldGroupEccentricScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);
