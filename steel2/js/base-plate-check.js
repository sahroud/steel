/* SAHROUD STEEL — preliminary base-plate cantilever strip check
   Elastic/plastic strip idealization for plate bending only.
   Not a complete base-plate, anchor, weld, concrete or code design.
*/
(function(root){
 "use strict";
 function finite(v,label){
  if(v===undefined||v===null||String(v).trim()==="")throw new Error(label+" باید صریحاً وارد شود.");
  const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;
 }
 function checkBasePlateCantileverBending(input){
  const d=input||{};
  const t=finite(d.plateThicknessMM,"ضخامت صفحه‌ستون");
  const fy=finite(d.plateFyMPa,"تنش تسلیم صفحه Fy");
  const phi=d.phi===undefined?0.9:finite(d.phi,"ضریب مقاومت");
  const pryingFactor=d.pryingFactor===undefined?1:finite(d.pryingFactor,"ضریب تشدید کشش ناشی از پریینگ");
  if(!(t>0&&fy>0&&phi>0&&phi<=1&&pryingFactor>=1))throw new Error("ضخامت، Fy و ضریب مقاومت معتبر و ضریب پریینگ حداقل ۱ باشد.");
  if(typeof d.geometrySourceReference!=="string"||!d.geometrySourceReference.trim())throw new Error("مرجع نقشه صفحه‌ستون و محل انکر الزامی است.");
  if(!Array.isArray(d.anchors)||!d.anchors.length)throw new Error("حداقل یک رکورد تقاضای انکر لازم است.");
  const ids=new Set();
  const anchors=d.anchors.map((a,i)=>{
   const id=String(a?.id??"").trim();if(!id||ids.has(id))throw new Error("شناسه انکرها باید یکتا و غیرخالی باشد.");ids.add(id);
   const T=finite(a.tensionDemandKN,"تقاضای کشش انکر "+id);
   const m=finite(a.projectionMM,"پیش‌آمدگی کنسولی صفحه "+id);
   const b=finite(a.effectiveWidthMM,"عرض مؤثر نوار صفحه "+id);
   if(T<0||m<0||b<=0)throw new Error("کشش و پیش‌آمدگی نباید منفی و عرض مؤثر باید مثبت باشد.");
   const amplifiedT=T*pryingFactor;
   const Mu=amplifiedT*1000*m/b; // N.mm per mm width
   const phiMn=phi*fy*t*t/4; // N.mm per mm width, plastic strip upper-bound idealization
   const ratio=phiMn>0?Mu/phiMn:Infinity;
   return Object.freeze({id,tensionDemandKN:T,pryingAmplifiedTensionKN:amplifiedT,projectionMM:m,effectiveWidthMM:b,
    momentDemandNmmPerMM:Mu,designMomentCapacityNmmPerMM:phiMn,utilization:ratio,
    status:ratio<=1?"pass-in-simplified-strip-model":"fail-in-simplified-strip-model"});
  });
  return Object.freeze({success:anchors.every(a=>a.utilization<=1),
   method:"cantilever strip per unit width; Mu=T*a/beff; phiMn=phi*Fy*t^2/4",
   plateThicknessMM:t,plateFyMPa:fy,phi,pryingFactor,
   anchors:Object.freeze(anchors),
   maximumUtilization:Math.max(...anchors.map(a=>a.utilization)),
   geometrySourceReference:d.geometrySourceReference.trim(),
   limitations:Object.freeze([
    "این مدل فقط خمش نواری مقدماتی صفحه در امتداد پیش‌آمدگی از وجه تکیه‌گاه/ستون تا خط اثر انکر را تقریب می‌زند؛ محل واقعی تکیه‌گاه و هندسه باید با مدل سازگار باشد.",
    "فرض عرض مؤثر مستقل برای هر انکر و مقاومت خمشی پلاستیک نوار است؛ اندرکنش نوارها، خمش دوطرفه صفحه، توزیع واقعی فشار تماس بتن و سختی صفحه مدل نشده‌اند.",
    "ضریب پریینگ فقط یک ضریب تشدید ورودی کاربر برای تحلیل حساسیت است؛ این نرم‌افزار آن را از هندسه/سختی صفحه محاسبه نمی‌کند. انتخاب ضریب باید مستند و توسط مهندس محاسب انجام شود.",
    "کنترل جوش ستون به صفحه، شکست فولاد انکر، بیرون‌کشیدگی، شکست مخروطی بتن، pryout، فاصله لبه، عمق مهاری، گروه انکر و اندرکنش کشش-برش انجام نمی‌شود.",
    "این خروجی ظرفیت نهایی اتصال یا تأیید آیین‌نامه‌ای نیست؛ طراحی نهایی نیازمند تحلیل سازگار صفحه/تماس و کنترل ضوابط معتبر پروژه است."
   ])});
 }

 function checkBasePlateBearingContact(input){
  const d=input||{};
  const B=finite(d.plateWidthMM,"عرض صفحه‌ستون");
  const L=finite(d.plateLengthMM,"طول صفحه‌ستون");
  const N=finite(d.compressionKN,"نیروی فشاری صفحه‌ستون");
  const Mx=finite(d.MxKNm,"لنگر حول محور X");
  const Mz=finite(d.MzKNm,"لنگر حول محور Z");
  const qa=finite(d.allowableBearingMPa,"تنش/ظرفیت مجاز تماس بتن یا گروت");
  if(!(B>0&&L>0&&N>0&&qa>0))throw new Error("ابعاد، نیروی فشاری و ظرفیت مجاز تماس باید مثبت باشند.");
  if(typeof d.geometrySourceReference!=="string"||!d.geometrySourceReference.trim())throw new Error("مرجع هندسه صفحه‌ستون الزامی است.");
  if(typeof d.sourceReference!=="string"||!d.sourceReference.trim())throw new Error("مرجع گزارش مصالح/ژئوتکنیک یا مبنای ظرفیت تماس الزامی است.");
  if(typeof d.combinationDefinition!=="string"||!d.combinationDefinition.trim())throw new Error("تعریف ترکیب بار فشاری و لنگرها الزامی است.");
  const area=B*L, qAvg=N*1000/area;
  const qMx=6*Math.abs(Mx)*1e6/(B*L*L);
  const qMz=6*Math.abs(Mz)*1e6/(L*B*B);
  const qMax=qAvg+qMx+qMz, qMin=qAvg-qMx-qMz;
  const fullContact=qMin>=-1e-9;
  const bearingPass=fullContact&&qMax<=qa+1e-9;
  return Object.freeze({success:bearingPass,method:"rigid rectangular plate; linear full-contact pressure; biaxial moments; no tensile contact",
   plateWidthMM:B,plateLengthMM:L,compressionKN:N,MxKNm:Mx,MzKNm:Mz,areaMM2:area,
   averagePressureMPa:qAvg,qMaxMPa:qMax,qMinMPa:qMin,allowableBearingMPa:qa,fullContact,bearingPass,
   geometrySourceReference:d.geometrySourceReference.trim(),sourceReference:d.sourceReference.trim(),combinationDefinition:d.combinationDefinition.trim(),
   status:!fullContact?"blocked-partial-contact-analysis-required":qMax>qa?"fail-bearing-pressure":"pass-full-contact-bearing",
   limitations:Object.freeze([
    "صفحه کاملاً صلب و توزیع خطی فشار تماس مستطیلی فرض شده است؛ انعطاف صفحه و سختی واقعی گروت/بتن مدل نشده‌اند.",
    "اگر فشار حداقل منفی شود، تماس جزئی و ناحیه جداشده ایجاد می‌شود؛ این مدل آن را حل نمی‌کند و نتیجه مسدود است.",
    "ظرفیت مجاز تماس باید از مبنای معتبر طراحی بتن/گروت و مشخصات پروژه وارد شود؛ این ماژول آن را از مقاومت بتن استخراج نمی‌کند.",
    "کنترل خردشدگی موضعی، پخش بار در پی، مقاومت بتن، آرماتور، پانچ، لغزش، انکر و جوش در این تابع انجام نمی‌شود.",
    "این کنترل مقدماتی جایگزین کنترل‌های آیین‌نامه‌ای صفحه‌ستون و بتن نیست."
   ])});
 }

 function checkAnchorSteelCapacity(input){
  const d=input||{};
  if(typeof d.geometrySourceReference!=="string"||!d.geometrySourceReference.trim())throw new Error("مرجع نقشه و آرایش انکرها الزامی است.");
  if(typeof d.capacitySourceReference!=="string"||!d.capacitySourceReference.trim())throw new Error("مرجع ظرفیت طراحی فولاد انکر الزامی است.");
  if(typeof d.combinationDefinition!=="string"||!d.combinationDefinition.trim())throw new Error("تعریف ترکیب بار ULS الزامی است.");
  if(!Array.isArray(d.anchors)||!d.anchors.length)throw new Error("حداقل یک انکر لازم است.");
  const ids=new Set();
  const anchors=d.anchors.map(a=>{
   const id=String(a?.id??"").trim();
   if(!id||ids.has(id))throw new Error("شناسه انکرها باید یکتا و غیرخالی باشد.");
   ids.add(id);
   const T=finite(a.tensionDemandKN,"تقاضای کشش انکر "+id);
   const Vx=finite(a.shearXDemandKN,"تقاضای برش X انکر "+id);
   const Vz=finite(a.shearZDemandKN,"تقاضای برش Z انکر "+id);
   const Tc=finite(a.designTensionCapacityKN,"ظرفیت طراحی کششی فولاد انکر "+id);
   const Vc=finite(a.designShearCapacityKN,"ظرفیت طراحی برشی فولاد انکر "+id);
   if(T<0||Tc<=0||Vc<=0)throw new Error("تقاضاها نباید منفی و ظرفیت‌های طراحی باید مثبت باشند.");
   const V=Math.hypot(Vx,Vz), tensionRatio=T/Tc, shearRatio=V/Vc;
   return Object.freeze({id,tensionDemandKN:T,shearXDemandKN:Vx,shearZDemandKN:Vz,
    resultantShearDemandKN:V,designTensionCapacityKN:Tc,designShearCapacityKN:Vc,
    tensionUtilization:tensionRatio,shearUtilization:shearRatio,
    tensionPass:tensionRatio<=1+1e-9,shearPass:shearRatio<=1+1e-9,
    status:tensionRatio<=1+1e-9&&shearRatio<=1+1e-9?"pass-independent-steel-checks":"fail-independent-steel-checks"});
  });
  return Object.freeze({success:anchors.every(a=>a.tensionPass&&a.shearPass),
   method:"independent per-anchor steel tension and resultant shear demand-to-design-capacity screening",
   interactionChecked:false,anchors:Object.freeze(anchors),
   maximumTensionUtilization:Math.max(...anchors.map(a=>a.tensionUtilization)),
   maximumShearUtilization:Math.max(...anchors.map(a=>a.shearUtilization)),
   geometrySourceReference:d.geometrySourceReference.trim(),capacitySourceReference:d.capacitySourceReference.trim(),
   combinationDefinition:d.combinationDefinition.trim(),
   limitations:Object.freeze([
    "ظرفیت‌های طراحی کششی و برشی فولاد انکر باید از گواهی محصول و مبنای طراحی معتبر استخراج و توسط مهندس تأیید شوند؛ نرم‌افزار آن‌ها را از قطر، رده یا رزوه حدس نمی‌زند.",
    "کنترل کشش و برش به‌صورت مستقل انجام شده است؛ اندرکنش کشش-برش طبق ضابطه حاکم بررسی نشده و قبولی این دو کنترل به‌تنهایی قبولی ترکیبی نیست.",
    "شکست مخروطی بتن، بیرون‌کشیدگی، pryout، شکست لبه بتن، فاصله لبه، عمق مهاری، اثر گروه، آرماتور مهاری و شکست جوش/صفحه کنترل نمی‌شوند.",
    "تقاضا باید برای هر انکر از تحلیل معتبر گروه انکر و با لحاظ سختی صفحه، تماس و پریینگ استخراج شده باشد؛ ورودی این تابع آن را محاسبه نمی‌کند.",
    "این غربال مقدماتی جایگزین طراحی آیین‌نامه‌ای یا تأیید نهایی اتصال نیست."
   ])});
 }


 function checkConcreteAnchorFailure(input){
  const d=input||{};
  if(typeof d.geometrySourceReference!=="string"||!d.geometrySourceReference.trim())throw new Error("مرجع هندسه، فاصله لبه و عمق مهاری الزامی است.");
  if(typeof d.capacitySourceReference!=="string"||!d.capacitySourceReference.trim())throw new Error("مرجع ظرفیت‌های طراحی بتن/انکر الزامی است.");
  if(typeof d.combinationDefinition!=="string"||!d.combinationDefinition.trim())throw new Error("تعریف ترکیب بار ULS الزامی است.");
  if(!Array.isArray(d.anchors)||!d.anchors.length)throw new Error("حداقل یک رکورد تقاضا و ظرفیت انکر لازم است.");
  const ids=new Set();
  const anchors=d.anchors.map(a=>{
   const id=String(a?.id??"").trim();
   if(!id||ids.has(id))throw new Error("شناسه انکرها باید یکتا و غیرخالی باشد.");
   ids.add(id);
   const T=finite(a.tensionDemandKN,"تقاضای کشش انکر "+id);
   const V=finite(a.resultantShearDemandKN,"تقاضای برش برآیند انکر "+id);
   const caps={
    concreteBreakoutTensionKN:finite(a.concreteBreakoutTensionCapacityKN,"ظرفیت طراحی شکست مخروطی بتن در کشش "+id),
    pulloutTensionKN:finite(a.pulloutTensionCapacityKN,"ظرفیت طراحی بیرون‌کشیدگی در کشش "+id),
    concreteEdgeShearKN:finite(a.concreteEdgeShearCapacityKN,"ظرفیت طراحی شکست لبه بتن در برش "+id),
    pryoutShearKN:finite(a.pryoutShearCapacityKN,"ظرفیت طراحی pryout در برش "+id)
   };
   if(T<0||V<0||Object.values(caps).some(x=>x<=0))throw new Error("تقاضاها نباید منفی و تمام ظرفیت‌های طراحی باید مثبت باشند.");
   const checks=[
    {mode:"concrete-breakout-tension",demandKN:T,capacityKN:caps.concreteBreakoutTensionKN},
    {mode:"pullout-tension",demandKN:T,capacityKN:caps.pulloutTensionKN},
    {mode:"concrete-edge-shear",demandKN:V,capacityKN:caps.concreteEdgeShearKN},
    {mode:"pryout-shear",demandKN:V,capacityKN:caps.pryoutShearKN}
   ].map(x=>({...x,utilization:x.demandKN/x.capacityKN,pass:x.demandKN<=x.capacityKN+1e-9}));
   return Object.freeze({id,checks:Object.freeze(checks),success:checks.every(x=>x.pass),
    governingMode:checks.reduce((p,x)=>x.utilization>p.utilization?x:p),status:checks.every(x=>x.pass)?"pass-capacity-screening":"fail-capacity-screening"});
  });
  return Object.freeze({success:anchors.every(a=>a.success),anchors:Object.freeze(anchors),
   interactionChecked:false,groupEffectsChecked:false,
   geometrySourceReference:d.geometrySourceReference.trim(),capacitySourceReference:d.capacitySourceReference.trim(),
   combinationDefinition:d.combinationDefinition.trim(),
   limitations:Object.freeze([
    "این بخش فقط تقاضای ورودی را با ظرفیت‌های طراحی ورودی مقایسه می‌کند؛ هیچ ظرفیت بتن یا انکر را از روی مقاومت بتن، قطر، عمق کاشت یا فاصله لبه تولید نمی‌کند.",
    "ظرفیت‌های شکست مخروطی بتن، بیرون‌کشیدگی، شکست لبه بتن و pryout باید برای هندسه واقعی، بتن ترک‌خورده/ترک‌نخورده، فاصله لبه، فاصله انکرها، عمق مهاری، ضخامت عضو و آرماتور از ضابطه معتبر استخراج شوند.",
    "اثر گروه انکر، هم‌پوشانی مخروط‌ها، خروج از مرکز گروه، آرماتور مکمل، شکست فولاد و اندرکنش کشش-برش در این تابع محاسبه نشده‌اند.",
    "برای کنترل محافظه‌کارانه، ظرفیت‌های واردشده باید ظرفیت طراحی نهایی و سازگار با همان ترکیب بار باشند؛ استفاده از مقاومت اسمی به‌جای ظرفیت طراحی مجاز نیست.",
    "این غربال جایگزین طراحی کامل اتصال و کنترل آیین‌نامه‌ای نیست."
   ])});
 }


 function checkAnchorSteelInteraction(input){
  const d=input||{};
  for(const [k,label] of [["geometrySourceReference","مرجع هندسه و آرایش انکر"],["capacitySourceReference","مرجع ظرفیت طراحی فولاد"],["interactionRuleReference","مرجع ضابطه اندرکنش کشش-برش"],["combinationDefinition","تعریف ترکیب بار ULS"]]){
   if(typeof d[k]!=="string"||!d[k].trim())throw new Error(label+" الزامی است.");
  }
  const limit=finite(d.interactionLimit,"حد مجاز رابطه اندرکنش");
  const tensionExponent=finite(d.tensionExponent,"توان نسبت کشش");
  const shearExponent=finite(d.shearExponent,"توان نسبت برش");
  if(!(limit>0&&tensionExponent>0&&shearExponent>0))throw new Error("حد رابطه و توان‌ها باید مثبت باشند.");
  if(!Array.isArray(d.anchors)||!d.anchors.length)throw new Error("حداقل یک انکر لازم است.");
  const ids=new Set();
  const anchors=d.anchors.map(a=>{
   const id=String(a?.id??"").trim();
   if(!id||ids.has(id))throw new Error("شناسه انکرها باید یکتا و غیرخالی باشد.");
   ids.add(id);
   const T=finite(a.tensionDemandKN,"تقاضای کشش "+id), Vx=finite(a.shearXDemandKN,"برش X "+id), Vz=finite(a.shearZDemandKN,"برش Z "+id);
   const Tc=finite(a.designTensionCapacityKN,"ظرفیت طراحی کششی "+id), Vc=finite(a.designShearCapacityKN,"ظرفیت طراحی برشی "+id);
   if(T<0||Tc<=0||Vc<=0)throw new Error("تقاضاها نباید منفی و ظرفیت‌ها باید مثبت باشند.");
   const V=Math.hypot(Vx,Vz), tr=T/Tc, vr=V/Vc;
   const interaction=Math.pow(tr,tensionExponent)+Math.pow(vr,shearExponent);
   const pass=interaction<=limit+1e-9;
   return Object.freeze({id,tensionRatio:tr,shearRatio:vr,resultantShearDemandKN:V,
    interactionValue:interaction,interactionLimit:limit,pass,status:pass?"pass-user-defined-interaction-envelope":"fail-user-defined-interaction-envelope"});
  });
  return Object.freeze({success:anchors.every(a=>a.pass),anchors:Object.freeze(anchors),
   interactionLimit:limit,tensionExponent,shearExponent,
   interactionRuleReference:d.interactionRuleReference.trim(),capacitySourceReference:d.capacitySourceReference.trim(),
   geometrySourceReference:d.geometrySourceReference.trim(),combinationDefinition:d.combinationDefinition.trim(),
   method:"user-specified power interaction envelope: (T/Td)^p + (V/Vd)^q <= limit",
   limitations:Object.freeze([
    "این تابع رابطه اندرکنش را از روی ورودی کاربر ارزیابی می‌کند و هیچ ضابطه یا رابطه آیین‌نامه‌ای را به‌طور پیش‌فرض انتخاب نمی‌کند.",
    "حد مجاز و توان‌های رابطه باید دقیقاً از ضابطه حاکم بر پروژه و برای نوع انکر/حالت حدی مربوط استخراج و توسط مهندس تأیید شوند؛ مقادیر نمونه یا فرضی، مبنای طراحی نیستند.",
    "ظرفیت‌های کششی و برشی باید ظرفیت طراحی فولاد انکر و مربوط به همان ترکیب بار باشند؛ کنترل شکست بتن و اثر گروه در این تابع انجام نمی‌شود.",
    "تقاضای هر انکر باید با تحلیل معتبر صفحه، تماس، توزیع گروه و پریینگ تعیین شده باشد.",
    "این محاسبه عمومی جایگزین کنترل آیین‌نامه‌ای نیست؛ اگر ضابطه رابطه غیرتوانی یا حدود جداگانه دارد، این مدل قابل استفاده نیست."
   ])});
 }

 const api=Object.freeze({checkBasePlateCantileverBending,checkBasePlateBearingContact,checkAnchorSteelCapacity,checkConcreteAnchorFailure,checkAnchorSteelInteraction});
 root.SahroudBasePlateCheck=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
