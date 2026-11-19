(function(root){
 "use strict";
 const finite=(v,label)=>{
  if(v===null||v===undefined||typeof v==="boolean"||(typeof v==="string"&&!v.trim()))
   throw new Error(label+" نباید خالی باشد.");
  const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;
 };
 const positive=(v,label)=>{const n=finite(v,label);if(!(n>0))throw new RangeError(label+" باید بزرگ‌تر از صفر باشد.");return n;};
 const reference=(v,label)=>{if(typeof v!=="string"||!v.trim())throw new Error("مرجع مستند "+label+" الزامی است.");return v.trim();};
 function validateFootingDesignInput(input){
  const d=input||{};
  if(d.schema!=="SAHROUD-FOOTING-DESIGN-INPUT-1.0")throw new Error("نسخه ساختار ورودی طراحی پی معتبر نیست.");
  const id=String(d.foundationId||"").trim(),nodeId=String(d.nodeId||"").trim();
  if(!id||!nodeId)throw new Error("شناسه پی و شناسه گره پایه الزامی است.");
  const actions=d.ulsLocalActions;
  if(!actions||actions.schema!=="SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0"||actions.success!==true)
   throw new Error("بسته تبدیل‌شده و معتبر کنش‌های محلی ULS لازم است.");
  if(actions.sourceSchema!=="SAHROUD-FOUNDATION-ULS-REACTION-BATCH-1.0")
   throw new Error("منشأ بسته کنش‌ها باید بسته واکنش ULS شناخته‌شده باشد.");
  if(!["on-structure","on-foundation"].includes(actions.reactionSense))
   throw new Error("جهت تبدیل واکنش ULS باید صریحاً مشخص باشد.");
  if(!Array.isArray(actions.foundations)||!actions.foundations.length)
   throw new Error("فهرست پایه‌های بسته ULS معتبر نیست.");
  const actionNodeIds=new Set(),normalizedCasesByNode=new Map();
  actions.foundations.forEach(item=>{
   const supportId=String(item&&item.nodeId||"").trim();
   if(!supportId||actionNodeIds.has(supportId))throw new Error("شناسه پایه در بسته کنش ULS خالی یا تکراری است.");
   actionNodeIds.add(supportId);
   if(!Array.isArray(item.cases)||!item.cases.length)throw new Error("فهرست ترکیبات ULS برای پایه "+supportId+" خالی است.");
   const caseIds=new Set();
   const normalized=item.cases.map(c=>{
    if(!c||typeof c!=="object"||Array.isArray(c))throw new Error("رکورد کنش ULS برای پایه "+supportId+" معتبر نیست.");
    const loadCase=String(c.loadCase||"").trim();
    if(!loadCase||caseIds.has(loadCase))throw new Error("شناسه ترکیب ULS خالی یا تکراری است؛ پایه "+supportId);
    caseIds.add(loadCase);
    const values={};
    ["FxLocalkN","FylocalkN","FzLocalkN","MxkNm","MykNm","MzkNm","NkN"].forEach(k=>values[k]=finite(c[k],"کنش "+k+" در "+loadCase+"، پایه "+supportId));
    return Object.freeze({loadCase,loadCaseLabel:String(c.loadCaseLabel||loadCase),
     sourceReference:reference(c.sourceReference,"ترکیب "+loadCase+"، پایه "+supportId),...values});
   });
   normalizedCasesByNode.set(supportId,Object.freeze(normalized));
  });
  const cases=normalizedCasesByNode.get(nodeId);
  if(!cases||!cases.length)throw new Error("برای این گره، کنش محلی ULS موجود نیست.");
  const footing=d.footing||{};
  const B=positive(footing.Bm,"عرض پی B"),L=positive(footing.Lm,"طول پی L"),h=positive(footing.thicknessM,"ضخامت پی");
  const column=d.column||{};
  const cx=positive(column.widthX_m,"عرض ستون در راستای x"),cz=positive(column.widthZ_m,"عرض ستون در راستای z");
  const ox=finite(column.offsetX_m===undefined?0:column.offsetX_m,"خروج از مرکز ستون در راستای x");
  const oz=finite(column.offsetZ_m===undefined?0:column.offsetZ_m,"خروج از مرکز ستون در راستای z");
  const inside=(x,z,wx,wz)=>Math.abs(x)+wx/2<=B/2+1e-9&&Math.abs(z)+wz/2<=L/2+1e-9;
  if(cx>B||cz>L||!inside(ox,oz,cx,cz))
   throw new RangeError("مقطع ستون باید به‌طور کامل داخل پلان پی قرار گیرد؛ ابعاد یا خروج از مرکز را اصلاح کنید.");
  const pedestal=d.pedestal||null;
  let normalizedPedestal=null;
  if(pedestal&&pedestal.enabled===true){
   const px=positive(pedestal.widthX_m,"عرض پدستال در x"),pz=positive(pedestal.widthZ_m,"عرض پدستال در z");
   const ph=positive(pedestal.heightM,"ارتفاع پدستال");
   const pox=finite(pedestal.offsetX_m===undefined?ox:pedestal.offsetX_m,"خروج از مرکز پدستال در x");
   const poz=finite(pedestal.offsetZ_m===undefined?oz:pedestal.offsetZ_m,"خروج از مرکز پدستال در z");
   if(px>B||pz>L||!inside(pox,poz,px,pz))throw new RangeError("پدستال باید به‌طور کامل داخل پلان پی قرار گیرد.");
   if(Math.abs(ox-pox)+cx/2>px/2+1e-9||Math.abs(oz-poz)+cz/2>pz/2+1e-9)
    throw new RangeError("پدستال باید در پلان، کل مقطع ستون را دربرگیرد؛ ابعاد یا خروج از مرکز را اصلاح کنید.");
   normalizedPedestal=Object.freeze({widthX_m:px,widthZ_m:pz,heightM:ph,offsetX_m:pox,offsetZ_m:poz});
  }
  const materials=d.materials||{};
  const fc=positive(materials.concreteFcMPa,"مقاومت فشاری مشخصه بتن fc");
  const fy=positive(materials.rebarFyMPa,"تنش تسلیم مشخصه میلگرد fy");
  const concreteRef=reference(materials.concreteSourceReference,"مشخصات بتن");
  const rebarRef=reference(materials.rebarSourceReference,"مشخصات میلگرد");
  const cover=d.cover||{};
  const bottom=positive(cover.bottomM,"پوشش بتن زیر پی");
  const side=positive(cover.sideM,"پوشش بتن کناری");
  if(bottom>=h/2||side>=Math.min(B,L)/2)throw new RangeError("پوشش بتن با ابعاد پی سازگار نیست؛ ضخامت یا پوشش را بازبینی کنید.");
  const reinforcement=d.proposedReinforcement||null;
  let normalizedReinforcement=null;
  if(reinforcement){
   const parseDirection=(bar,name)=>{
    if(!bar)return null;
    const diameter=positive(bar.diameterMm,"قطر میلگرد "+name);
    const count=Number(bar.count);
    if(!Number.isInteger(count)||count<2)throw new RangeError("تعداد میلگرد "+name+" باید عدد صحیح حداقل ۲ باشد.");
    const spacing=bar.spacingMm===undefined||bar.spacingMm===null?null:positive(bar.spacingMm,"فاصله میلگرد "+name);
    if(spacing!==null&&spacing>Math.max(B,L)*1000)throw new RangeError("فاصله میلگرد "+name+" از ابعاد پی بزرگ‌تر است.");
    return Object.freeze({diameterMm:diameter,count,spacingMm:spacing});
   };
   normalizedReinforcement=Object.freeze({bottomX:parseDirection(reinforcement.bottomX,"پایین X"),
    bottomZ:parseDirection(reinforcement.bottomZ,"پایین Z"),
    sourceReference:reinforcement.sourceReference?reference(reinforcement.sourceReference,"آرایش پیشنهادی آرماتور"):null});
  }
  const geometryReference=reference(d.geometrySourceReference,"نقشه/مدل هندسه ستون و پی");
  const warnings=[];
  if(cases.some(c=>c.NkN<=0))warnings.push("حداقل یک ترکیب ULS دارای نیروی محوری غیر فشاری یا صفر است؛ کنترل تماس و کشش/بلندشدگی لازم است.");
  if(!normalizedPedestal)warnings.push("پدستال خاموش است؛ انتقال بار از صفحه‌ستون/ستون به پی باید جداگانه کنترل شود.");
  if(!normalizedReinforcement)warnings.push("آرایش پیشنهادی میلگرد ارائه نشده است؛ این ماژول آرماتور لازم یا فاصله مجاز را طراحی نمی‌کند.");
  return Object.freeze({schema:"SAHROUD-FOOTING-DESIGN-INPUT-1.0",classification:"validated-input-only-not-a-structural-design",
   foundationId:id,nodeId,geometry:Object.freeze({Bm:B,Lm:L,thicknessM:h,column:Object.freeze({widthX_m:cx,widthZ_m:cz,offsetX_m:ox,offsetZ_m:oz}),pedestal:normalizedPedestal}),
   materials:Object.freeze({concreteFcMPa:fc,rebarFyMPa:fy,concreteSourceReference:concreteRef,rebarSourceReference:rebarRef}),
   cover:Object.freeze({bottomM:bottom,sideM:side}),proposedReinforcement:normalizedReinforcement,
   ulsActions:Object.freeze({sourceSchema:actions.schema,reactionSense:actions.reactionSense,cases:Object.freeze(cases)}),
   geometrySourceReference:geometryReference,warnings:Object.freeze(warnings),
   requiredNextChecks:Object.freeze(["کنترل انتقال تنش زیر صفحه‌ستون/پدستال و تنش موضعی بتن","خمش دوطرفه و تعیین آرماتور لازم در هر راستا","برش یک‌طرفه در مقاطع بحرانی","برش پانچ پیرامون ستون/پدستال و کنترل محیط بحرانی","طول گیرایی، مهاری، وصله و حداقل/حداکثر آرماتور","کنترل فشار خاک، تماس جزئی، لغزش، واژگونی و نشست با ترکیبات مناسب"]),
   limitations:Object.freeze(["این تابع فقط کامل‌بودن و سازگاری اولیه داده‌های هندسی، مصالح و کنش‌ها را اعتبارسنجی می‌کند؛ هیچ کنترل مقاومت یا طراحی آرماتور انجام نمی‌دهد.",
    "ضرایب مقاومت، روابط طراحی و جزئیات اجرایی باید با متن معتبر و قابل استناد مباحث هفتم و نهم و نسخه مصوب پروژه تطبیق داده شوند.",
    "ابعاد ستون/پدستال در این نسخه مستطیلی و محلی در صفحه x-z هستند؛ هندسه صفحه‌ستون، بولت‌ها، پدستال نامنظم و اندرکنش چندستونی مدل نشده‌اند.",
    "پوشش بتن فقط ورودی هندسی است؛ حداقل پوشش آیین‌نامه‌ای و دوام/حریق در این مرحله تأیید نمی‌شود.",
    "ترکیبات ULS در بسته ورودی صرفاً اعتبارسنجی ساختاری می‌شوند؛ این ماژول صحت آیین‌نامه‌ای ترکیبات یا حل‌گر را مستقلاً اثبات نمی‌کند."])});
 }
 const api=Object.freeze({validateFootingDesignInput});
 root.SahroudFootingDesignInput=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
