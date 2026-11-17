/* SAHROUD STEEL — evidence-only member design demand package.
 * Aggregates complete station rows by physical member and load case.
 * No load combinations, envelopes, sign conversion, resistance or approval.
 */
(function(root){"use strict";
let last=null;
const REQUIRED_SOURCE=["document","revision","locator","authority"];
function auditSources(cases){
 const rows=(Array.isArray(cases)?cases:[]).map((c,index)=>{
  const source=c?.simultaneousActionCase?.source||c?.source||{};
  const missing=REQUIRED_SOURCE.filter(k=>!(typeof source[k]==="string"&&source[k].trim()));
  const loadTransferAuditPresent=!!c?.solverLoadTransferAudit;const loadTransferAuditVerified=!loadTransferAuditPresent||c.solverLoadTransferAudit.success===true; if(loadTransferAuditPresent&&!loadTransferAuditVerified)missing.push("solverLoadTransferAudit.success"); return {caseId:String(c?.simultaneousActionCase?.caseId||c?.loadCaseId||c?.caseId||"CASE-"+(index+1)),source:{...source},missing,loadTransferAuditPresent,loadTransferAuditVerified,complete:missing.length===0&&loadTransferAuditVerified};
 });
 return {success:rows.length>0&&rows.every(x=>x.complete),requiredFields:REQUIRED_SOURCE.slice(),caseCount:rows.length,completeCaseCount:rows.filter(x=>x.complete).length,rows};
}
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
function buildFromSolverCases(model,runnerCases,options){
 options=options||{};const issues=[],inputs=Array.isArray(runnerCases)?runnerCases:[];
 if(!root.SteelSolverSectionForceDiagramBridge?.build)return {success:false,status:"missing_dependency",issues:["پل حل‌گر به نمودار نیروهای داخلی بارگذاری نشده است."],designApproved:false};
 if(!inputs.length)return {success:false,status:"insufficient_data",issues:["هیچ خروجی تحلیل حالت بار ارائه نشده است."],designApproved:false};
 const sourceAudit=auditSources(inputs);
 if(!sourceAudit.success){
  const sourceIssues=sourceAudit.rows.filter(x=>!x.complete).map(x=>"مدرک منبع حالت "+x.caseId+" ناقص است؛ فیلدهای لازم: "+x.missing.join("، ")+".");
  const blocked={success:false,status:"source-provenance-incomplete",issues:sourceIssues,sourceAudit,solverPipeline:{inputCaseCount:inputs.length,diagramCaseCount:0,diagramSuccessCount:0,skippedForSourceAudit:true,issues:[]},designApproved:false,capacityCalculated:false,readyForCodeDesign:false};
  last=blocked;return blocked;
 }
 const diagrams=inputs.map((runnerOutput,index)=>{
  try{return root.SteelSolverSectionForceDiagramBridge.build(model,runnerOutput,options.diagramOptions||{});}
  catch(e){issues.push("ساخت نمودار حالت "+index+" با خطا مواجه شد: "+String(e.message||e));return {success:false,loadCaseId:runnerOutput?.simultaneousActionCase?.caseId||null,source:runnerOutput?.simultaneousActionCase?.source||null,issues:[String(e.message||e)],designApproved:false};}
 });
 const result=build(diagrams,{expectedMemberIds:options.expectedMemberIds});
 result.sourceAudit=sourceAudit;
 result.solverPipeline={inputCaseCount:inputs.length,diagramCaseCount:diagrams.length,diagramSuccessCount:diagrams.filter(x=>x.success===true).length,issues,isolatedPerCase:true,skippedForSourceAudit:false};
 if(issues.length){result.success=false;result.status="insufficient_data";result.issues.push(...issues);}
 last=result;return result;
}
function buildCombinedFromSolverCases(model,runnerCases,options){
 options=options||{};
 const result=buildFromSolverCases(model,runnerCases,options);
 if(result.success!==true){
  result.combinationProposal={success:false,status:"blocked-demand-package-incomplete",issues:["بسته تقاضای ایستگاهی کامل نیست؛ ترکیب نیرو اجرا نشد."],designApproved:false,capacityCalculated:false};
  last=result;return result;
 }
 if(!options.combinationSet||!options.assumptions){
  result.combinationProposal={success:false,status:"missing-explicit-combination-input",issues:["مجموعه ترکیب‌های دارای اثرات واقعی حل‌گر و فرض‌های صریح تحلیل باید جداگانه ارائه شوند."],designApproved:false,capacityCalculated:false};
  last=result;return result;
 }
 if(!root.SteelMemberDemandCombinationBridge?.build){
  result.combinationProposal={success:false,status:"missing_dependency",issues:["پل ترکیب تقاضای اعضا بارگذاری نشده است."],designApproved:false,capacityCalculated:false};
  last=result;return result;
 }
 const proposal=root.SteelMemberDemandCombinationBridge.build(result,options.combinationSet,options.assumptions);
 result.combinationProposal=proposal;
 result.combinationStatus=proposal.success?"linear-combination-demand-proposal":"blocked";
 result.designGate={...(result.designGate||{}),capacityCalculated:false,codeInteractionCalculated:false,designApproved:false,readyForCodeDesign:false};
 last=result;return result;
}
function buildCombinedFromBatch(model,batchResult,options){
 if(batchResult?.success!==true||batchResult?.status!=="isolated_cases_complete"||batchResult?.commonSolverTopologyVerified!==true||!Array.isArray(batchResult.cases)||!batchResult.cases.length){
  const blocked={success:false,status:"batch-analysis-incomplete",issues:batchResult?.issues?.length?batchResult.issues.slice():["خروجی دسته‌ای باید موفق، کامل و دارای توپولوژی مشترک تأییدشده باشد."],caseIds:batchResult?.caseIds||[],designApproved:false,capacityCalculated:false,readyForCodeDesign:false};
  last=blocked;return blocked;
 }
 const result=buildCombinedFromSolverCases(model,batchResult.cases,options||{});
 result.batchAudit={status:batchResult.status,caseIds:batchResult.caseIds.slice(),isolatedPerCase:true,commonSolverTopologyVerified:true};
 last=result;return result;
}
function getLast(){return last?JSON.parse(JSON.stringify(last)):null;}
function selfTest(){
 const row=(x,extra={})=>({x_m:x,N_N:1,Vy_N:2,Vz_N:3,T_Nm:4,My_Nm:5,Mz_Nm:6,...extra});
 const src={document:"calc.xlsx",revision:"rev-1",locator:"Sheet1!A1:F2",authority:"engineer-review"};
 const c={success:true,loadCaseId:"LC1",source:src,units:"N,N.m,m",prismaticDiagrams:[{memberId:"M1",length_m:2,localAxes:{x:[1,0,0]},stations:[row(0),row(2)]}]};
 const good=build([c],{expectedMemberIds:["M1"]});
 const noSource=build([{...c,source:{document:"x"}}],{expectedMemberIds:["M1"]});
 const noMember=build([c],{expectedMemberIds:["M1","M2"]});
 const duplicate=build([c,c],{expectedMemberIds:["M1"]});
 const mixed=build([c,{...c,loadCaseId:"LC2",prismaticDiagrams:[{...c.prismaticDiagrams[0],stations:[row(0,{My_Nm:99}),row(2,{My_Nm:99})]}]}],{expectedMemberIds:["M1"]});
 const tapered=build([{success:true,loadCaseId:"T1",source:src,units:"N,N.m,m",prismaticDiagrams:[],taperedReport:{success:true,loadCases:[{label:"T1",members:[{parentMemberId:"R",totalLength_m:3,segmentCount:1,complete:true,segments:[{segmentId:"R1",segmentIndex:1,startStation_m:0,endStation_m:3,length_m:3,stations:[{...row(0),memberStation_m:0},{...row(3),memberStation_m:3}]}]}]}]}}],{expectedMemberIds:["R"]});
 const prior=root.SteelSolverSectionForceDiagramBridge,priorCombo=root.SteelMemberDemandCombinationBridge,priorAdapter=root.SteelStationDemandAdapter;let diagramCalled=false;root.SteelSolverSectionForceDiagramBridge={build:(_m,r)=>{diagramCalled=true;return {...c,loadCaseId:r.simultaneousActionCase.caseId,source:r.simultaneousActionCase.source};}};root.SteelStationDemandAdapter={build:diagrams=>({success:true,issues:[],cases:diagrams.map(d=>({caseId:d.loadCaseId,source:d.source,members:[{memberId:"M1",kind:"prismatic",length_m:2,complete:true,stations:[row(0),row(2)]}]}))})};const source={document:"calc.pdf",revision:"R1",locator:"p.2",authority:"designer"};const runner=[{simultaneousActionCase:{caseId:"LC1",source}}];const incomplete=buildFromSolverCases({},[{simultaneousActionCase:{caseId:"LC-MISSING"}}],{expectedMemberIds:["M1"]});const incompleteSkipped=!diagramCalled;const pipeline=buildFromSolverCases({},runner,{expectedMemberIds:["M1"]});const blockedCombo=buildCombinedFromSolverCases({},[{simultaneousActionCase:{caseId:"LC-MISSING"}}],{expectedMemberIds:["M1"]});let bridgeCalled=false;root.SteelMemberDemandCombinationBridge={build:()=>{bridgeCalled=true;return {success:true,designApproved:false,proposals:[]};}};const combined=buildCombinedFromSolverCases({},runner,{expectedMemberIds:["M1"],combinationSet:{loadCases:[],combinations:[]},assumptions:{}});const batchCombined=buildCombinedFromBatch({}, {success:true,status:"isolated_cases_complete",cases:runner,caseIds:["LC1"],commonSolverTopologyVerified:true},{expectedMemberIds:["M1"],combinationSet:{loadCases:[],combinations:[]},assumptions:{}});const blockedBatch=buildCombinedFromBatch({}, {success:false,status:"batch_incomplete",issues:["fixture failure"]},{});root.SteelSolverSectionForceDiagramBridge=prior;root.SteelMemberDemandCombinationBridge=priorCombo;root.SteelStationDemandAdapter=priorAdapter;const t=[good.success&&good.designGate.designApproved===false,noSource.success===false,noMember.success===false,duplicate.success===false,mixed.success&&mixed.members[0].cases.length===2&&mixed.members[0].cases[0].stations[0].actions.My===5&&mixed.members[0].cases[1].stations[0].actions.My===99,tapered.success&&tapered.members[0].cases[0].segments.length===1,incomplete.status==="source-provenance-incomplete"&&incomplete.solverPipeline.diagramCaseCount===0&&incompleteSkipped,pipeline.success&&pipeline.solverPipeline.isolatedPerCase&&pipeline.caseIds.length===1&&pipeline.sourceAudit?.success===true,blockedCombo.combinationProposal?.status==="blocked-demand-package-incomplete",bridgeCalled&&combined.combinationProposal?.success===true&&combined.designGate.designApproved===false,batchCombined.success&&batchCombined.batchAudit?.commonSolverTopologyVerified===true,blockedBatch.success===false&&blockedBatch.status==="batch-analysis-incomplete"];
 return {passed:t.filter(Boolean).length,failed:t.filter(x=>!x).length,total:t.length,tests:t};
}
root.SteelMemberDesignDemandPackage={build,buildFromSolverCases,buildCombinedFromSolverCases,buildCombinedFromBatch,getLast,selfTest};
})(typeof window!=="undefined"?window:globalThis);
