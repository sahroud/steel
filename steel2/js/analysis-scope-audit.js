/* SAHROUD STEEL — explicit scope audit for the legacy 2D analysis path.
 * This is a limitation register, not a solver and never a design approval.
 */
(function(root){
 "use strict";
 const limitations=[
  {id:"combination-analysis",label:"ترکیبات بار آیین‌نامه‌ای در تحلیل قاب دوبعدی قدیمی اعمال نمی‌شوند",status:"not-included"},
  {id:"pdelta",label:"تحلیل مرتبه دوم و اثر P-Delta در تحلیل قاب دوبعدی قدیمی انجام نمی‌شود",status:"not-included"},
  {id:"longitudinal-wind",label:"باد طولی و باد دیوارهای جلو و عقب در تحلیل قاب دوبعدی قدیمی پوشش داده نمی‌شوند",status:"not-included"},
  {id:"member-design",label:"کنترل کامل مقاومت، پایداری، تغییرشکل و اتصالات از خروجی تحلیل قاب دوبعدی نتیجه نمی‌شود",status:"not-included"}
 ];
 function audit(){
  const legacy=!!root.SteelAnalysis;
  const solver3D=!!root.SteelFrame3D&&typeof root.SteelFrame3D.analyze==="function";
  const model3D=!!root.SteelStructuralModel;
  return {
   legacy2DAnalysisAvailable:legacy,
   general3DSolverAvailable:solver3D,
   structuralModelApiAvailable:model3D,
   legacy2DLimitations:limitations.map(x=>({...x})),
   fullBuildingAnalysisProven:false,
   codeCombinationCoverageProven:false,
   pDeltaCoverageProven:false,
   designApproved:false,
   analysisApprovalGranted:false,
   message:"وجود حل‌گر سه‌بعدی یا تحلیل قاب دوبعدی به‌تنهایی اثبات‌کننده تحلیل کامل ساختمان، پوشش همه بارها و ترکیبات، یا تأیید طراحی نیست."
  };
 }
 function selfTest(){
  const r=audit();
  const ok=r.designApproved===false&&r.analysisApprovalGranted===false&&
   r.legacy2DLimitations.some(x=>x.id==="combination-analysis")&&
   r.legacy2DLimitations.some(x=>x.id==="pdelta")&&
   r.fullBuildingAnalysisProven===false;
  return {passed:ok?1:0,failed:ok?0:1,total:1,checks:[{name:"legacy analysis limitations remain explicit and never imply approval",ok}]};
 }
 root.SteelAnalysisScopeAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
