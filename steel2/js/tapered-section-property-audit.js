/* SAHROUD STEEL — independent tapered I-section property consistency audit.
 * Recomputes geometric A, Iy, Iz and thin-wall J from each segment's recorded
 * dimensions and compares them with the exact properties passed to the 3D solver.
 * Units: dimensions mm; solver section properties m² and m⁴.
 * This is a data-integrity check, not a resistance or stability design.
 */
(function(root){
"use strict";
const positive=v=>Number.isFinite(Number(v))&&Number(v)>0;
function expected(d){
 const depth=Number(d.d),bf=Number(d.bf),tw=Number(d.tw),tf=Number(d.tf);
 if(![depth,bf,tw,tf].every(positive)||depth<=2*tf||bf<=tw)throw Error("ابعاد مقطع I نامعتبر است.");
 const hw=depth-2*tf,A=2*bf*tf+tw*hw;
 const Ix=(bf*depth**3-(bf-tw)*hw**3)/12;
 const Iy=(2*tf*bf**3+hw*tw**3)/12;
 const J=(2*bf*tf**3+hw*tw**3)/3;
 return {A_m2:A*1e-6,Iy_m4:Iy*1e-12,Iz_m4:Ix*1e-12,J_m4:J*1e-12};
}
function rel(a,b){return Math.abs(Number(a)-b)/Math.max(Math.abs(b),1e-30);}
function audit(input,options){
 const src=input||{},tol=Number(options?.relativeTolerance??1e-8),members=Array.isArray(src.members)?src.members:[],issues=[],rows=[];
 if(!(Number.isFinite(tol)&&tol>0&&tol<0.01))issues.push("تلرانس مقایسه خواص باید مثبت و کمتر از ۱٪ باشد.");
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 const groups=new Map();
 tapered.forEach(m=>{
  const id=String(m.id||""),parent=String(m.parentMemberId||"");
  if(!id||!parent)issues.push("شناسه قطعه یا عضو فیزیکی والد خالی است.");
  const d=m.taperDimensions||m.taperProperties?.dimensions,s=m.section||{};
  let e=null;try{e=expected(d);}catch(err){issues.push("قطعه "+id+": "+err.message);}
  if(e){
   const actual={A_m2:s.A,Iy_m4:s.Iy,Iz_m4:s.Iz,J_m4:s.J},errors={};
   Object.keys(e).forEach(k=>{const v=actual[k];if(!positive(v))issues.push("خاصیت حل‌گر "+k+" در قطعه "+id+" نامعتبر است.");else{errors[k]=rel(v,e[k]);if(errors[k]>tol)issues.push("عدم تطابق "+k+" در قطعه "+id+"؛ اختلاف نسبی "+errors[k]);}});
   rows.push({id,parentMemberId:parent,expected:e,actual,relativeErrors:errors,passed:Object.values(errors).length===4&&Object.values(errors).every(v=>v<=tol)});
  }
  const g=groups.get(parent)||[];g.push(m);groups.set(parent,g);
 });
 groups.forEach((g,parent)=>{
  const ordered=g.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex));
  const count=Number(ordered[0]?.taperSegmentCount);
  if(!Number.isInteger(count)||count<2||ordered.length!==count)issues.push("تعداد قطعات عضو "+parent+" با تعداد اعلام‌شده برابر نیست.");
  const indices=ordered.map(m=>Number(m.taperSegmentIndex));
  if(new Set(indices).size!==indices.length||indices.some((v,i)=>v!==i+1))issues.push("شماره قطعات عضو "+parent+" تکراری، ناقص یا نامرتب است.");
  const coords=ordered.map(m=>Number(m.taperCoordinate));
  if(coords.some(v=>!Number.isFinite(v)||v<0||v>1)||coords.some((v,i)=>i&&v<=coords[i-1]))issues.push("مختصات نسبی مقطع عضو "+parent+" باید یکتا و افزایشی در بازه صفر تا یک باشد.");
 });
 return {success:issues.length===0&&rows.length===tapered.length,status:issues.length?"property-mismatch-or-incomplete":"section-properties-consistent",checkedSegments:rows.length,rows,issues,relativeTolerance:tol,scope:"Independent geometry-to-solver-property consistency only; no plate slenderness, member resistance, buckling, LTB, interaction, deflection or code approval.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const dims={d:500,bf:200,tw:8,tf:12},e=expected(dims);
 const base={id:"R1_TAPER_01",parentMemberId:"R1",taperApplied:true,taperSegmentIndex:1,taperSegmentCount:2,taperCoordinate:.25,taperDimensions:dims,section:{A:e.A_m2,Iy:e.Iy_m4,Iz:e.Iz_m4,J:e.J_m4}};
 const second={...base,id:"R1_TAPER_02",taperSegmentIndex:2,taperCoordinate:.75};
 const good=audit({members:[base,second]});
 const bad=audit({members:[base,{...second,section:{...second.section,Iy:second.section.Iy*1.1}}]});
 const missing=audit({members:[base]});
 const invalid=audit({members:[{...base,taperDimensions:{...dims,tf:300}}]});
 const checks=[good.success&&good.checkedSegments===2,!bad.success,!missing.success,!invalid.success,!good.designApproved&&!good.analysisEnabled];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedSectionPropertyAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
