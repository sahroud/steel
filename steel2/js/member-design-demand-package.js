/* SAHROUD STEEL — evidence-only member design demand package.
 * Aggregates complete station rows by physical member and load case.
 * No load combinations, envelopes, sign conversion, resistance or approval.
 */
(function(root){"use strict";
let last=null;
const REQUIRED_SOURCE=["document","revision","locator","authority"];
function build(diagramCases,options){
 options=options||{};const issues=[];
 const expected=Array.isArray(options.expectedMemberIds)?options.expectedMemberIds.map(String):[];
 if(!expected.length)issues.push("فهرست شناسه اعضای فیزیکی مورد انتظار باید صریحاً ارائه شود.");
 if(new Set(expected).size!==expected.length)issues.push("شناسه اعضای مورد انتظار تکراری است.");
 if(!root.SteelStationDemandAdapter?.build)issues.push("مبدل تقاضای ایستگاهی بارگذاری نشده است.");
 if(issues.length){last={success:false,status:"insufficient_data",issues,designApproved:false};return last;}
 const adapted=root.SteelStationDemandAdapter.build(diagramCases,{expectedMemberIds:expected});
 issues.push(...(adapted.issues||[]));
 const memberPackages=expected.map(memberId=>{
  const cases=[];
  (adapted.cases||[]).forEach(c=>{
   const member=(c.members||[]).find(m=>m.memberId===memberId);
   if(!member){issues.push("عضو "+memberId+" در حالت "+c.caseId+" موجود نیست.");return;}
   cases.push({caseId:c.caseId,source:c.source,kind:member.kind,length_m:member.length_m,localAxes:member.localAxes||null,stations:member.kind==="prismatic"?member.stations:undefined,segments:member.kind==="tapered"?member.segments:undefined,complete:member.complete===true});
  });
  return {memberId,cases,complete:cases.length===(diagramCases||[]).length&&cases.every(c=>c.complete)};
 });
 (diagramCases||[]).forEach(c=>{
  const src=c?.source||{};
  REQUIRED_SOURCE.forEach(k=>{if(!(typeof src[k]==="string"&&src[k].trim()))issues.push("مدرک منبع حالت "+String(c?.loadCaseId||c?.caseId||"?")+" فاقد "+k+" است.");});
 });
 const complete=issues.length===0&&adapted.success===true&&memberPackages.every(m=>m.complete);
 const result={success:complete,status:complete?"station-demand-evidence-complete":"insufficient_data",members:memberPackages,caseIds:(adapted.cases||[]).map(c=>c.caseId),expectedMemberIds:expected,sourceTraceabilityRequired:REQUIRED_SOURCE,concurrencyPreserved:true,caseSeparationPreserved:true,combinationStatus:"not-provided",envelopeStatus:"not-generated",designInputStatus:"demand-evidence-only",issues,designGate:{capacityCalculated:false,codeInteractionCalculated:false,designApproved:false,readyForCodeDesign:false,blockers:["ترکیبات بار آیین‌نامه‌ای معتبر و مستند هنوز به بسته تقاضا متصل نشده‌اند.","قرارداد علامت و تبدیل نیروها به قرارداد طراحی باید برای خانواده هر عضو اعتبارسنجی شود.","مقاومت مقطع، کمانش، اندرکنش، پایداری، تغییرمکان و اتصالات هنوز در این بسته محاسبه نمی‌شوند."]},limitations:["هر ایستگاه شش مؤلفه همزمان خود را از یک ردیف و یک حالت تحلیل حفظ می‌کند.","هیچ پوش مؤلفه‌ای یا ترکیب بین حالت‌ها ساخته نمی‌شود.","قطعات متغیرمقطع و محورهای محلی آن‌ها مستقل باقی می‌مانند.","این بسته فقط شاهد تقاضای تحلیل است؛ ورودی نهایی طراحی آیین‌نامه‌ای محسوب نمی‌شود."]};
 last=result;return result;
}
function getLast(){return last?JSON.parse(JSON.stringify(last)):null;}
function selfTest(){
 const row=x=>({x_m:x,N_N:1,Vy_N:2,Vz_N:3,T_Nm:4,My_Nm:5,Mz_Nm:6});
 const src={document:"calc.xlsx",revision:"rev-1",locator:"Sheet1!A1:F2",authority:"engineer-review"};
 const c={success:true,loadCaseId:"LC1",source:src,units:"N,N.m,m",prismaticDiagrams:[{memberId:"M1",length_m:2,localAxes:{x:[1,0,0]},stations:[row(0),row(2)]}]};
 const good=build([c],{expectedMemberIds:["M1"]});
 const noSource=build([{...c,source:{document:"x"}}],{expectedMemberIds:["M1"]});
 const noMember=build([c],{expectedMemberIds:["M1","M2"]});
 const duplicate=build([c,c],{expectedMemberIds:["M1"]});
 const mixed=build([c,{...c,loadCaseId:"LC2",prismaticDiagrams:[{...c.prismaticDiagrams[0],stations:[row(0,{My_Nm:99}),row(2,{My_Nm:99})]}]}],{expectedMemberIds:["M1"]});
 const tapered=build([{success:true,loadCaseId:"T1",source:src,units:"N,N.m,m",prismaticDiagrams:[],taperedReport:{success:true,loadCases:[{label:"T1",members:[{parentMemberId:"R",totalLength_m:3,segmentCount:1,complete:true,segments:[{segmentId:"R1",segmentIndex:1,startStation_m:0,endStation_m:3,length_m:3,stations:[{...row(0),memberStation_m:0},{...row(3),memberStation_m:3}]}]}]}]}}],{expectedMemberIds:["R"]});
 const t=[good.success&&good.designGate.designApproved===false,noSource.success===false,noMember.success===false,duplicate.success===false,mixed.success&&mixed.members[0].cases.length===2&&mixed.members[0].cases[0].stations[0].actions.My===5&&mixed.members[0].cases[1].stations[0].actions.My===99,tapered.success&&tapered.members[0].cases[0].segments.length===1];
 return {passed:t.filter(Boolean).length,failed:t.filter(x=>!x).length,total:t.length,tests:t};
}
root.SteelMemberDesignDemandPackage={build,getLast,selfTest};
})(typeof window!=="undefined"?window:globalThis);
