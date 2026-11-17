/* SAHROUD STEEL — runtime dependency integrity gate.
 * Reports missing core modules; never upgrades a project to design-approved.
 */
(function(root){
"use strict";
const required=[
 ["SteelProject","مدیریت پروژه"],
 ["SteelClimateDB","پایگاه اقلیم"],
 ["SteelLoads","بارگذاری"],
 ["SteelAnalysis","تحلیل"],
 ["SteelStructuralModel","مدل سازه"],
 ["SteelAutoWorkflow","گردش کار"],
 ["SteelMemberDesignDemandPackage","تقاضای طراحی اعضا"],
 ["SteelM6AnalysisCoverageAudit","پوشش ترکیبات بار"],
 ["SteelCrane3DLoadTransfer","انتقال بار جرثقیل"],
 ["SteelFoundationModelFingerprint","شناسه مدل فونداسیون"],
 ["SteelFoundationReactionBridge","انتقال واکنش فونداسیون"]
];
function audit(){
 const missing=required.filter(([name])=>!root[name]).map(([name,label])=>({name,label}));
 return {success:missing.length===0,ready:missing.length===0,missing,loaded:required.length-missing.length,total:required.length,
  designApproved:false,analysisApprovalGranted:false,
  message:missing.length?"ماژول‌های ضروری بارگذاری نشده‌اند: "+missing.map(x=>x.label).join("، "):"ماژول‌های اصلی نرم‌افزار بارگذاری شده‌اند."};
}
function report(){
 const result=audit(),doc=root.document;
 if(!doc)return result;
 const status=doc.getElementById("homeWorkflowStatus");
 if(status){
  status.dataset.runtimeStatus=result.success?"ready":"blocked";
  if(!result.success)status.textContent=result.message;
 }
 if(!result.success){
  const panel=doc.getElementById("analysisMessage");
  if(panel)panel.textContent=result.message+" اجرای تحلیل/طراحی تا رفع این نقص معتبر نیست.";
 }
 return result;
}
root.SteelRuntimeIntegrity={audit,report,required:required.map(x=>x[0])};
if(root.document){
 if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",report,{once:true});
 else report();
}
})(typeof window!=="undefined"?window:globalThis);
