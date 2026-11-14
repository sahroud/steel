(function(root){
"use strict";
const EDGE_MM={12:18,16:22,20:26,22:28,24:30,27:34,30:38,36:46};
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function evaluate(input){
 const x=input||{},issues=[],d=finite(x.boltDiameter_mm),t=finite(x.plateThickness_mm),W=finite(x.plateWidth_mm),H=finite(x.plateHeight_mm),pts=x.bolts;
 if([d,t,W,H].some(v=>v===null)||!Array.isArray(pts)||pts.length<2)issues.push("قطر پیچ، ضخامت و ابعاد ورق و مختصات حداقل دو پیچ لازم است.");
 if(x.holeType!=="standard")issues.push("این نسخه فقط سوراخ استاندارد گرد را کنترل می‌کند؛ سوراخ بزرگ و لوبیایی نیازمند ضوابط افزوده است.");
 if(x.edgeCondition!=="sheared"&&x.edgeCondition!=="rolled"&&x.edgeCondition!=="flame-cut"&&x.edgeCondition!=="machined")issues.push("نوع لبه باید مشخص شود.");
 if(x.corrosionClass!=="protected"&&x.corrosionClass!=="weathering")issues.push("شرایط خوردگی/نوع سطح عضو باید مشخص شود.");
 if(x.materialThicknessVerified!==true||x.geometryDrawingReference==null||!String(x.geometryDrawingReference).trim())issues.push("ضخامت واقعی و مرجع نقشه هندسه باید تأیید شود.");
 if([d,t,W,H].some(v=>v===null)||!Array.isArray(pts)||pts.length<2)return fail();
 if(d<=0||t<=0||W<=0||H<=0||pts.some(p=>!p||finite(p.x_mm)===null||finite(p.y_mm)===null))issues.push("ابعاد یا مختصات پیچ نامعتبر است.");
 if(issues.length)return fail();
 const minEdge=EDGE_MM[d]|| (d>36?1.25*d:null);
 if(minEdge===null){issues.push("قطر پیچ خارج از جدول متریک J3.4M این ماژول است.");return fail();}
 const minSpacing=2.667*d,maxEdge=Math.min(12*t,150),maxSpacing=x.corrosionClass==="weathering"?Math.min(14*t,180):Math.min(24*t,300);
 const edges=[],pairs=[],spacing=[];
 pts.forEach((p,i)=>{
  const px=Number(p.x_mm),py=Number(p.y_mm),dist=[px,W-px,py,H-py],actual=Math.min(...dist);
  edges.push({bolt:i+1,actual_mm:actual,requiredMinimum_mm:minEdge,maximum_mm:maxEdge,pass:actual>=minEdge&&actual<=maxEdge});
  if(actual<minEdge)issues.push("فاصله لبه پیچ "+(i+1)+" کمتر از حداقل J3.4M است.");
  if(actual>maxEdge)issues.push("فاصله پیچ "+(i+1)+" تا لبه از حد مجاز J3.6 بیشتر است.");
  for(let j=0;j<i;j++){
   const dx=px-Number(pts[j].x_mm),dy=py-Number(pts[j].y_mm),s=Math.hypot(dx,dy);
   pairs.push({boltA:j+1,boltB:i+1,spacing_mm:s,minimum_mm:minSpacing,pass:s>=minSpacing});
   if(s<minSpacing)issues.push("فاصله مرکز پیچ‌های "+(j+1)+" و "+(i+1)+" کمتر از 2.667d است.");
   if(Math.abs(dy)<=Math.max(1,0.02*d)){
    spacing.push({boltA:j+1,boltB:i+1,spacing_mm:s,maximum_mm:maxSpacing,pass:s<=maxSpacing});
    if(s>maxSpacing)issues.push("فاصله طولی پیچ‌های هم‌ردیف از حد J3.6 بیشتر است.");
   }
  }
 });
 return {ok:true,pass:issues.length===0,issues,method:"AISC 360-22 J3.3/J3.4M/J3.6 limited geometry screen",minimumEdge_mm:minEdge,minimumCenterSpacing_mm:minSpacing,maximumEdge_mm:maxEdge,maximumLongitudinalSpacing_mm:maxSpacing,edgeChecks:edges,pairChecks:pairs,longitudinalSpacingChecks:spacing,analysisEnabled:false,designApproved:false,scope:"Only standard round holes in a rectangular plate; edge distances use the metric table. Hole bearing/tearout, block shear, net-section rupture, staggered paths, welds and connection force transfer are not checked."};
 function fail(){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false,method:"AISC 360-22 limited bolt geometry screen"};}
}
function selfTest(){
 const base={boltDiameter_mm:20,plateThickness_mm:12,plateWidth_mm:220,plateHeight_mm:160,holeType:"standard",edgeCondition:"machined",corrosionClass:"protected",materialThicknessVerified:true,geometryDrawingReference:"D-02",bolts:[{x_mm:40,y_mm:40},{x_mm:100,y_mm:40},{x_mm:160,y_mm:40}]};
 const a=evaluate(base),b=evaluate({...base,bolts:[{x_mm:10,y_mm:10},{x_mm:30,y_mm:10}]}),c=evaluate({...base,holeType:"long-slot"}),d=evaluate({...base,corrosionClass:""});
 const checks=[a.ok&&a.pass&&!a.designApproved,!b.pass,!c.ok,!d.ok];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelBoltGeometryScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);
