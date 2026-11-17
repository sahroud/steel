/* SAHROUD STEEL — explicit scope audit for the legacy 2D analysis path.
 * This is a limitation register, not a solver and never a design approval.
 */
(function(root){
 "use strict";
 const limitations=[
  {id:"combination-analysis",label:"ترکیبات بار آیین‌نامه‌ای در تحلیل قاب دوبعدی قدیمی اعمال نمی‌شوند",status:"not-included",scope:"legacy-2d"},
  {id:"pdelta",label:"تحلیل مرتبه دوم و اثر P-Delta در تحلیل قاب دوبعدی قدیمی انجام نمی‌شود",status:"not-included",scope:"legacy-2d"},
  {id:"longitudinal-wind",label:"باد طولی و باد دیوارهای جلو و عقب در تحلیل قاب دوبعدی قدیمی پوشش داده نمی‌شوند",status:"not-included",scope:"legacy-2d"},
  {id:"member-design",label:"کنترل کامل مقاومت، پایداری، تغییرشکل و اتصالات از خروجی تحلیل قاب دوبعدی نتیجه نمی‌شود",status:"not-included",scope:"legacy-2d"},
  {id:"3d-first-order",label:"حل‌گر سه‌بعدی فعلی تحلیل خطی مرتبه اول انجام می‌دهد؛ اثرات P-Delta و تحلیل غیرخطی در آن پیاده‌سازی نشده‌اند",status:"not-included",scope:"3d-solver"},
  {id:"3d-shear-deformation",label:"تغییرشکل برشی و اثرات وابسته به مدل‌های تیر تیموشنکو در حل‌گر سه‌بعدی منظور نشده‌اند",status:"not-included",scope:"3d-solver"},
  {id:"3d-warping",label:"پیچش مقاطع باز با درجات آزادی وارپینگ در حل‌گر سه‌بعدی مدل نشده است",status:"not-included",scope:"3d-solver"},
  {id:"3d-stability",label:"حل‌گر سه‌بعدی به‌تنهایی کنترل کمانش کلی، موضعی و پیچشی یا مقاومت اعضا را انجام نمی‌دهد",status:"not-included",scope:"3d-solver"},
  {id:"load-input-transfer",label:"مدیریت ورودی بار به‌تنهایی اثبات نمی‌کند که همه بارهای ثقلی، برف، باد، زلزله و جرثقیل به مدل سه‌بعدی منتقل شده‌اند",status:"not-proven",scope:"load-path"},
  {id:"code-combination-coverage",label:"وجود قالب ترکیبات مبحث ششم به‌تنهایی اثبات‌کننده تولید و تحلیل تمام خانواده‌ها و شاخه‌های لازم برای پروژه نیست",status:"not-proven",scope:"load-combinations"},
  {id:"member-capacity-design",label:"بسته تقاضای اعضا و دروازه دامنه طراحی، جایگزین کنترل کامل مقاومت، پایداری، خیز و اتصالات نیستند",status:"not-included",scope:"member-design"},
  {id:"foundation-design",label:"پل واکنش فونداسیون فقط واکنش‌ها را منتقل و ممیزی می‌کند؛ طراحی پی، خاک، لغزش، واژگونی و آرماتور نهایی را تأیید نمی‌کند",status:"not-included",scope:"foundation"},
  {id:"crane-final-design",label:"انتقال بار جرثقیل و استخراج تقاضا به‌تنهایی تأیید طراحی تیر حمال، براکت، خستگی، اتصالات و ستون نیست",status:"not-included",scope:"crane"}
 ];
 function audit(){
  const legacy=!!root.SteelAnalysis;
  const solver3D=!!root.SteelFrame3D&&typeof root.SteelFrame3D.analyze==="function";
  const model3D=!!root.SteelStructuralModel;
  const loadsInput=!!root.SteelLoads;
  const loadChain=!!root.SteelStructuralLoadChain;
  const memberGate=!!root.SteelMemberDesignScopeGate;
  const foundationBridge=!!root.SteelFoundationReactionBridge;
  const craneTransfer=!!root.SteelCrane3DLoadTransfer;
  return {
   legacy2DAnalysisAvailable:legacy,
   general3DSolverAvailable:solver3D,
   structuralModelApiAvailable:model3D,
   loadInputApiAvailable:loadsInput,
   structuralLoadChainApiAvailable:loadChain,
   memberDesignScopeGateAvailable:memberGate,
   foundationReactionBridgeAvailable:foundationBridge,
   craneLoadTransferApiAvailable:craneTransfer,
   legacy2DLimitations:limitations.filter(x=>x.scope==="legacy-2d").map(x=>({...x})),
   threeDSolverLimitations:limitations.filter(x=>x.scope==="3d-solver").map(x=>({...x})),
   loadPathLimitations:limitations.filter(x=>["load-path","load-combinations"].includes(x.scope)).map(x=>({...x})),
   downstreamDesignLimitations:limitations.filter(x=>["member-design","foundation","crane"].includes(x.scope)).map(x=>({...x})),
   fullBuildingAnalysisProven:false,
   codeCombinationCoverageProven:false,
   pDeltaCoverageProven:false,
   memberCapacityDesignProven:false,
   foundationDesignProven:false,
   craneFinalDesignProven:false,
   designApproved:false,
   analysisApprovalGranted:false,
   message:"وجود حل‌گر سه‌بعدی، قالب ترکیبات یا پل واکنش به‌تنهایی اثبات‌کننده تحلیل کامل ساختمان، پوشش همه بارها و ترکیبات، یا تأیید طراحی اعضا، جرثقیل و فونداسیون نیست."
  };
 }
 function selfTest(){
  const r=audit();
  const required=["3d-first-order","3d-stability","load-input-transfer","code-combination-coverage","member-capacity-design","foundation-design","crane-final-design"];
  const ids=new Set(limitations.map(x=>x.id));
  const ok=r.designApproved===false&&r.analysisApprovalGranted===false&&
   r.fullBuildingAnalysisProven===false&&r.codeCombinationCoverageProven===false&&
   r.pDeltaCoverageProven===false&&required.every(x=>ids.has(x))&&
   r.threeDSolverLimitations.length>=3&&r.downstreamDesignLimitations.length>=3;
  return {passed:ok?1:0,failed:ok?0:1,total:1,checks:[{name:"legacy and 3D analysis limitations remain explicit; no full design approval is implied",ok}]};
 }
 root.SteelAnalysisScopeAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
