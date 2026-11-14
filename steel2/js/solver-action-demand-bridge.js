/* SAHROUD STEEL — bridge from isolated 3D FEM results to concurrent action audit.
 * Maps solver-local end action components by documented position only.
 * It does NOT assert code section-force signs or calculate resistance.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v),names=["Fx","Fy","Fz","Mx","My","Mz"];
function build(runnerOutput,expectedMemberIds){
 const issues=[],result=runnerOutput?.solverResult,sim=runnerOutput?.simultaneousActionCase;
 if(runnerOutput?.success!==true||runnerOutput?.status!=="isolated_analysis_proposal")issues.push("خروجی باید تحلیل ایزوله موفق باشد.");
 if(!result?.success||result?.equilibrium?.ok!==true)issues.push("حل‌گر موفق یا متعادل نیست.");
 if(!sim?.caseId||!Array.isArray(result?.members)||!result.members.length)issues.push("شناسه حالت یا نتایج اعضا موجود نیست.");
 const seen=new Set(),members=[];
 (result?.members||[]).forEach(m=>{
  const id=String(m?.id||"");if(!id||seen.has(id))issues.push("شناسه عضو خالی یا تکراری در خروجی حل‌گر.");seen.add(id);
  const v=m?.localEndForces;if(!Array.isArray(v)||v.length!==12||!v.every(finite)){issues.push("بردار ۱۲ مؤلفه‌ای محلی عضو "+id+" ناقص/نامعتبر است.");return;}
  const endI={},endJ={};names.forEach((k,i)=>{endI[k]=v[i];endJ[k]=v[i+6];});
  members.push({memberId:id,endI,endJ,parentMemberId:m.parentMemberId||null,taperSegmentIndex:m.taperSegmentIndex??null,taperSegmentCount:m.taperSegmentCount??null,rawLocalEndForces:v.slice(),localAxes:m.localAxes||null});
 });
 if(Array.isArray(expectedMemberIds)){const expected=new Set(expectedMemberIds.map(String));expected.forEach(id=>{if(!seen.has(id))issues.push("عضو مورد انتظار "+id+" در نتایج حل‌گر وجود ندارد.");});seen.forEach(id=>{if(!expected.has(id))issues.push("عضو "+id+" خارج از فهرست مدل مورد انتظار است.");});}
 if(!sim?.equilibriumOk)issues.push("پرچم تعادل حالت تحلیل تأیید نشده است.");
 if(issues.length)return {success:false,status:"incomplete",issues,designApproved:false};
 const payload={memberIds:members.map(m=>m.memberId),cases:[{caseId:sim.caseId,equilibriumOk:true,members}]};
 const audit=root.SteelMemberSimultaneousActionContract?.audit?.(payload);
 if(!audit?.success)return {success:false,status:"incomplete",issues:audit?.issues||["قرارداد تقاضای هم‌زمان در دسترس نیست."],designApproved:false};
 return {success:true,status:"concurrent-demand-audited",caseId:sim.caseId,source:sim.source,units:"N,N.m",basis:"member-local solver end actions",componentMapping:{Fx:"N",Fy:"Vy",Fz:"Vz",Mx:"T",My:"My",Mz:"Mz"},signConventionVersion:result.localEndForceConvention?.version??null,signConventionDefinition:result.localEndForceConvention?.definition||"نامشخص",members,audit,designApproved:false,capacityCalculated:false,readyForCodeDesign:false,limitations:["مولفه‌ها در دستگاه محلی عضو هستند و به علامت نیروی مقطع آیین‌نامه‌ای تبدیل نشده‌اند؛ پیش از طراحی باید قرارداد علامت هر خانواده عضو مستقلاً تأیید شود.","هر ردیف فقط برای همین حالت بار است؛ ترکیب بار یا پوش هم‌زمان‌سازی نشده است.","خروجی حل‌گر خطی مرتبه اول است و ظرفیت/پایداری/اتصال را کنترل نمی‌کند."]};
}
function selfTest(){
 const raw={success:true,status:"isolated_analysis_proposal",simultaneousActionCase:{caseId:"LC-A",source:{document:"x"},equilibriumOk:true},solverResult:{success:true,equilibrium:{ok:true},localEndForceConvention:{version:1,definition:"raw local end actions"},members:[{id:"M1",localEndForces:[1,2,3,4,5,6,7,8,9,10,11,12]},{id:"M2",localEndForces:Array(12).fill(0)}]}};
 const t=[["maps all 12 local components",()=>{const r=build(raw,["M1","M2"]);return r.success&&r.members[0].endI.Mx===4&&r.members[0].endJ.Mz===12;}],["preserves exact load case ID",()=>build(raw).caseId==="LC-A"],["requires equilibrium",()=>!build({...raw,solverResult:{...raw.solverResult,equilibrium:{ok:false}}}).success],["rejects failed isolated runner",()=>!build({...raw,success:false}).success],["rejects incomplete 12 component vector",()=>!build({...raw,solverResult:{...raw.solverResult,members:[{id:"M1",localEndForces:[1,2]}]}}).success],["rejects nonfinite components",()=>!build({...raw,solverResult:{...raw.solverResult,members:[{id:"M1",localEndForces:[...Array(11).fill(0),Infinity]}]}}).success],["detects missing expected members",()=>!build(raw,["M1","M3"]).success],["detects unexpected solver members",()=>!build(raw,["M1"]).success],["does not grant design approval",()=>build(raw).designApproved===false],["does not claim code design readiness",()=>build(raw).readyForCodeDesign===false]];
 const results=t.map(([name,fn])=>{try{return{name,ok:!!fn()};}catch(e){return{name,ok:false,error:String(e.message||e)};}});
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelSolverActionDemandBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
