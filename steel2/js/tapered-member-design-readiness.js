/* SAHROUD STEEL — tapered-member design readiness gate.
 * Verifies segment geometry, simultaneous load-case forces and required inputs.
 * No strength, buckling, interaction, deflection or code approval is calculated.
 */
(function(root){
"use strict";
const POSITIVE=["Fy_MPa","Fu_MPa","E_MPa","G_MPa","Kx","Ky","Kz","Lx_mm","Ly_mm","Lz_mm","Lb_mm"];
const BOOLEAN=["localSlendernessReviewed","restraintLayoutVerified","connectionDesignInputsVerified","serviceabilityCasesProvided"];
function positive(v){return Number.isFinite(Number(v))&&Number(v)>0;}
function audit(input){
 const src=input||{},issues=[],warnings=[],members=Array.isArray(src.members)?src.members:[],cases=Array.isArray(src.loadCases)?src.loadCases:[];
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null)),groups=new Map();
 if(!tapered.length)issues.push("هیچ قطعه متغیرمقطع معتبری برای ممیزی دریافت نشد.");
 tapered.forEach(m=>{
  const parent=String(m.parentMemberId||"");
  if(!parent){issues.push("قطعه "+String(m.id)+" شناسه عضو فیزیکی والد ندارد.");return;}
  const count=Number(m.taperSegmentCount),idx=Number(m.taperSegmentIndex);
  if(!Number.isInteger(count)||count<2||!Number.isInteger(idx)||idx<1||idx>count)issues.push("شماره/تعداد قطعات عضو "+parent+" نامعتبر است.");
  const g=groups.get(parent)||{parentMemberId:parent,count,segments:[]};
  if(g.count!==count)issues.push("تعداد قطعات عضو "+parent+" بین قطعات یکسان نیست.");
  if(g.segments.some(x=>Number(x.taperSegmentIndex)===idx))issues.push("شماره قطعه تکراری در عضو "+parent+": "+idx);
  g.segments.push(m);groups.set(parent,g);
 });
 const memberInputs=src.memberInputs||{},memberRows=[],caseLabels=new Set();
 cases.forEach(c=>{const label=String(c?.label||"");if(!label||caseLabels.has(label))issues.push("شناسه ترکیب بار خالی یا تکراری است: "+label);caseLabels.add(label);if(c?.equilibrium?.ok!==true)issues.push("تعادل ترکیب "+(label||"(بدون شناسه)")+" صریحاً موفق اعلام نشده است.");});
 for(const g of groups.values()){
  const ordered=g.segments.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex)),seen=new Set(ordered.map(m=>Number(m.taperSegmentIndex)));
  for(let i=1;i<=g.count;i++)if(!seen.has(i))issues.push("قطعه "+i+" از عضو "+g.parentMemberId+" مفقود است.");
  ordered.forEach(m=>{
   const d=m.taperDimensions||m.taperProperties?.dimensions;
   if(!d||["d","bf","tw","tf"].some(k=>!positive(d[k])))issues.push("ابعاد مقطع در قطعه "+String(m.id)+" ناقص است.");
   else if(Number(d.d)<=2*Number(d.tf)||Number(d.bf)<=Number(d.tw))issues.push("هندسه I در قطعه "+String(m.id)+" نامعتبر است.");
   const s=m.section||{};["E","G","A","Iy","Iz","J"].forEach(k=>{if(!positive(s[k]))issues.push("خاصیت "+k+" در قطعه "+String(m.id)+" ناقص است.");});
  });
  const mi=memberInputs[g.parentMemberId]||{},missing=[];
  if(mi.sectionType!=="welded-I")missing.push("نوع مقطع جوشی I و دامنه معتبر موتور طراحی");
  POSITIVE.forEach(k=>{if(!positive(mi[k]))missing.push(k);});
  BOOLEAN.forEach(k=>{if(mi[k]!==true)missing.push(k);});
  if(!["verified-nonslender","verified-slender-with-effective-section"].includes(mi.localSlendernessClass))missing.push("طبقه‌بندی لاغری موضعی و مسیر سطح مؤثر");
  if(!Array.isArray(mi.restraintStations)||mi.restraintStations.length<2)missing.push("مختصات و نوع مهارهای جانبی/پیچشی واقعی");
  else {const stations=mi.restraintStations.slice().sort((a,b)=>Number(a.coordinate)-Number(b.coordinate));if(stations.some(x=>!Number.isFinite(Number(x.coordinate))||Number(x.coordinate)<0||Number(x.coordinate)>1||!x.lateral||!x.torsional)||Math.abs(Number(stations[0].coordinate))>1e-8||Math.abs(Number(stations[stations.length-1].coordinate)-1)>1e-8||stations.some((x,i)=>i&&Number(x.coordinate)<=Number(stations[i-1].coordinate)))missing.push("مهار جانبی و پیچشی معتبر، مرتب و پوشش‌دهنده دو انتهای عضو");}
  if(!Array.isArray(mi.connectionIds)||!mi.connectionIds.length||mi.connectionIds.some(x=>!String(x).trim()))missing.push("شناسه و داده اتصالات ابتدا/انتها و وصله‌ها");
  const caseRows=[];
  if(!cases.length)missing.push("ترکیبات بار طراحی به‌صورت مجموعه هم‌زمان");
  cases.forEach(c=>{
   const label=String(c?.label||"");if(!label){issues.push("ترکیب بار بدون شناسه/عنوان وجود دارد.");return;}
   const cm=Array.isArray(c.members)?c.members:[],byId=new Map();
   cm.forEach(x=>{const id=String(x.id||"");if(!id||byId.has(id))issues.push("شناسه عضو در ترکیب "+label+" خالی یا تکراری است.");else byId.set(id,x);});
   const missingSegments=ordered.filter(m=>!byId.has(String(m.id))).map(m=>String(m.id));
   const invalid=ordered.filter(m=>{const f=byId.get(String(m.id))?.localEndForces;return !Array.isArray(f)||f.length!==12||f.some(v=>!Number.isFinite(Number(v)));}).map(m=>String(m.id));
   if(missingSegments.length||invalid.length)issues.push("ترکیب "+label+" برای عضو "+g.parentMemberId+" ناقص است؛ قطعات مفقود: "+missingSegments.join(", ")+"؛ بردارهای ۱۲ مؤلفه‌ای نامعتبر: "+invalid.join(", "));
   caseRows.push({label,segmentCount:ordered.length,complete:!missingSegments.length&&!invalid.length,simultaneousForcesPreserved:true});
  });
  if(mi.restraintLayoutVerified!==true)warnings.push("مهارهای عضو "+g.parentMemberId+" هنوز به‌صورت مستقل مستند نشده‌اند.");
  memberRows.push({parentMemberId:g.parentMemberId,segmentCount:ordered.length,requiredInputsComplete:missing.length===0,missingInputs:missing,loadCases:caseRows});
 }
 const complete=issues.length===0&&memberRows.length>0&&memberRows.every(x=>x.requiredInputsComplete&&x.loadCases.every(c=>c.complete));
 return {success:issues.length===0&&complete,status:complete?"inputs-ready-for-resistance-engines":"blocked-incomplete",physicalMemberCount:groups.size,analysisSegmentCount:tapered.length,memberRows,issues,warnings,scope:"Input and simultaneous-demand readiness only. No member strength, local/global buckling, LTB, interaction, deflection, fabrication or code compliance is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const seg=i=>({id:"R1_"+i,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:i,taperSegmentCount:2,taperDimensions:{d:500-i*30,bf:200,tw:8,tf:12},section:{E:2e11,G:7.7e10,A:.01,Iy:1e-5,Iz:1e-4,J:1e-6}});
 const input={members:[seg(1),seg(2)],loadCases:[{label:"ULS-1",equilibrium:{ok:true},members:[{id:"R1_1",localEndForces:Array(12).fill(0)},{id:"R1_2",localEndForces:Array(12).fill(0)}]}],memberInputs:{R1:{sectionType:"welded-I",Fy_MPa:345,Fu_MPa:450,E_MPa:200000,G_MPa:76923,Kx:1,Ky:1,Kz:1,Lx_mm:6000,Ly_mm:6000,Lz_mm:6000,Lb_mm:1500,localSlendernessReviewed:true,localSlendernessClass:"verified-nonslender",restraintLayoutVerified:true,restraintStations:[{coordinate:0,lateral:true,torsional:true},{coordinate:1,lateral:true,torsional:true}],connectionDesignInputsVerified:true,connectionIds:["C1","C2"],serviceabilityCasesProvided:true}}};
 const good=audit(input),missing=audit({...input,loadCases:[{label:"ULS-1",members:[{id:"R1_1",localEndForces:[0]}]}]}),noMaterial=audit({...input,memberInputs:{R1:{}}}),duplicate=audit({...input,members:[...input.members,seg(2)]});
 const failedEquilibrium=audit({...input,loadCases:[{...input.loadCases[0],equilibrium:{ok:false}}]});
 const duplicateCase=audit({...input,loadCases:[...input.loadCases,{...input.loadCases[0]}]});
 const incompleteRestraint=audit({...input,memberInputs:{R1:{...input.memberInputs.R1,restraintStations:[{coordinate:.2,lateral:true,torsional:true},{coordinate:.8,lateral:true,torsional:true}]}}});
 const checks=[good.success&&good.status==="inputs-ready-for-resistance-engines",!missing.success,!noMaterial.success,!duplicate.success,!good.designApproved&&!good.analysisEnabled,!failedEquilibrium.success,!duplicateCase.success,!incompleteRestraint.success];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedMemberDesignReadiness={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
