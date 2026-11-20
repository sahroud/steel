/* SAHROUD STEEL — member design coverage and input-readiness audit.
 * This module does NOT calculate resistance. It prevents incomplete member coverage
 * or incomplete demand/section data from being reported as a completed design.
 * Units: N, N.m, m, Pa, m2, m4, m3.
 */
(function(root){
 "use strict";
 const ACTIONS=["N","Vy","Vz","T","My","Mz"];
 const POSITIVE_SECTION=["A","Iy","Iz","J","E","G"];
 const MODULI=["SxTop","SxBottom","Sy"];
 const finitePositive=v=>Number.isFinite(Number(v))&&Number(v)>0;
 function audit(model,demandRun){
  const errors=[],members=Array.isArray(model?.members)?model.members:[];
  if(!members.length)throw new Error("مدل اعضای فولادی خالی یا ناموجود است.");
  if(!demandRun||demandRun.success!==true||!Array.isArray(demandRun.members))
   throw new Error("بسته تقاضای طراحی سه‌بعدی معتبر در دسترس نیست.");
  const modelById=new Map();
  members.forEach(m=>{
   const id=String(m?.id??"");
   if(!id||modelById.has(id))errors.push("شناسه عضو خالی یا تکراری است: "+id);
   else modelById.set(id,m);
  });
  const demandById=new Map();
  demandRun.members.forEach(row=>{
   const id=String(row?.id??"");
   if(!id||demandById.has(id))errors.push("شناسه تقاضای عضو خالی یا تکراری است: "+id);
   else demandById.set(id,row);
  });
  const missingDemand=[...modelById.keys()].filter(id=>!demandById.has(id));
  const extraDemand=[...demandById.keys()].filter(id=>!modelById.has(id));
  if(missingDemand.length)errors.push("برای اعضای مدل تقاضا موجود نیست: "+missingDemand.join("، "));
  if(extraDemand.length)errors.push("تقاضا برای اعضای خارج از مدل وجود دارد: "+extraDemand.join("، "));
  const rows=[];
  for(const [id,m] of modelById){
   const issues=[];
   const length=Number(m.length),section=m.sectionProperties||m.initialSection||m.sectionData;
   if(!finitePositive(length))issues.push("طول عضو معتبر نیست.");
   if(!section)issues.push("مشخصات مقطع به عضو تخصیص نیافته است.");
   else{
    POSITIVE_SECTION.forEach(k=>{if(!finitePositive(section[k]))issues.push("خاصیت مقطع "+k+" ناموجود یا نامعتبر است.");});
    MODULI.forEach(k=>{if(!finitePositive(section[k]))issues.push("مدول مقطع "+k+" ناموجود یا نامعتبر است.");});
    if(!section.profile&&!section.designation&&!section.name)issues.push("شناسه/نام مقطع ثبت نشده است.");
    if(!section.geometryType&&!section.geometryDimensionsMm&&!section.geometricProperties)
     issues.push("شناسنامه هندسی مقطع ثبت نشده است.");
   }
   const demand=demandById.get(id);
   if(!demand)issues.push("بسته تقاضای شش‌مؤلفه‌ای عضو وجود ندارد.");
   else{
    if(!Array.isArray(demand.candidates)||!demand.candidates.length)issues.push("هیچ بردار تقاضای هم‌زمان برای عضو ثبت نشده است.");
    else demand.candidates.forEach((candidate,index)=>{
     if(!candidate||!candidate.values||ACTIONS.some(k=>!Number.isFinite(Number(candidate.values[k]))))
      issues.push("بردار تقاضای شماره "+(index+1)+" ناقص است.");
     if(!Number.isFinite(Number(candidate?.x))||Number(candidate.x)<-1e-9||Number(candidate.x)>length+1e-9)
      issues.push("مختصات ایستگاه تقاضای شماره "+(index+1)+" خارج از طول عضو است.");
     if(!candidate?.combinationId)issues.push("شناسه ترکیب بار در تقاضای شماره "+(index+1)+" ثبت نشده است.");
    });
   }
   if(m.sectionOrientationVerified!==true)issues.push("جهت نصب مقطع با مرجع واقعی تأیید نشده است.");
   if(!m.localAxes||m.localAxesVerified!==true)issues.push("محورهای محلی عضو به‌صورت معتبر به مدل طراحی پیوند نخورده‌اند.");
   const key=String(m.sectionKey||m.role||m.type||"unspecified");
   rows.push({memberId:id,sectionKey:key,lengthM:finitePositive(length)?length:null,
    sectionProfile:section?.profile||section?.designation||section?.name||null,
    demandCandidateCount:Array.isArray(demand?.candidates)?demand.candidates.length:0,
    inputStatus:issues.length?"INCOMPLETE":"INPUTS_PRESENT",
    designStatus:"NOT_ASSESSABLE",
    issues,
    requiredCodeChecks:["axial","biaxial-flexure","shear-y","shear-z","torsion","axial-flexure-interaction","local-buckling","lateral-torsional-buckling","member-stability","serviceability"],
    limitation:"این ممیزی فقط پوشش اعضا و کفایت داده ورودی را بررسی می‌کند؛ هیچ مقاومت، نسبت بهره‌برداری یا قبولی آیین‌نامه‌ای محاسبه نمی‌شود."
   });
  }
  const complete=errors.length===0&&rows.length===members.length&&rows.every(r=>r.inputStatus==="INPUTS_PRESENT");
  return {success:true,complete,designComplete:false,memberCount:members.length,checkedMemberCount:rows.length,
   inputReadyCount:rows.filter(r=>r.inputStatus==="INPUTS_PRESENT").length,
   inputIncompleteCount:rows.filter(r=>r.inputStatus==="INCOMPLETE").length,
   designAssessableCount:0,designNotAssessableCount:rows.length,
   errors,rows,units:{force:"N",moment:"N.m",length:"m"},
   limitation:"وجود داده ورودی کافی به معنی انجام کنترل ظرفیت نیست. تا اتصال موتورهای ظرفیت آیین‌نامه‌ای برای همه گروه‌های عضو، designStatus عمداً NOT_ASSESSABLE باقی می‌ماند."};
 }
 const api={actions:ACTIONS.slice(),audit};
 root.SahroudMemberDesignReadiness=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
