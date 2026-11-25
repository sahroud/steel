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
 const api=Object.freeze({checkBasePlateCantileverBending,checkBasePlateBearingContact});
 root.SahroudBasePlateCheck=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
