(function(root){
 "use strict";
 let lastResult=null;
 const finite=(v,label)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;};
 function validateSoil(input){
  const d=input||{},qa=finite(d.allowableBearingKPa,"ظرفیت مجاز باربری خاک");
  const soilType=String(d.soilType||"").trim().toUpperCase();
  if(!["I","II","III"].includes(soilType))throw new Error("تیپ خاک باید طبق گزارش ژئوتکنیک یکی از I، II یا III انتخاب شود.");
  if(!(qa>0))throw new RangeError("ظرفیت مجاز باربری خاک باید مثبت باشد.");
  if(!["gross","net"].includes(d.allowableBearingBasis))
   throw new Error("مبنای ظرفیت مجاز باید از گزارش ژئوتکنیک به‌صورت gross (ناخالص) یا net (خالص) مشخص شود.");
  if(typeof d.sourceReference!=="string"||!d.sourceReference.trim())throw new Error("مرجع گزارش ژئوتکنیک و شماره صفحه/بند الزامی است.");
  return Object.freeze({soilType,allowableBearingKPa:qa,allowableBearingBasis:d.allowableBearingBasis,sourceReference:d.sourceReference.trim()});
 }
 function checkRectangularFooting(input){
  const d=input||{},soil=validateSoil(d.soil);
  const B=finite(d.Bm,"عرض پی"),L=finite(d.Lm,"طول پی");
  if(!(B>0&&L>0))throw new RangeError("ابعاد پی باید مثبت باشند.");
  const loads=d.footingLoads||{};
  const thickness=finite(loads.thicknessM,"ضخامت پی");
  const cover=finite(loads.soilCoverAboveFootingM,"ارتفاع خاک روی پی");
  const gammaConcrete=finite(loads.concreteUnitWeightKNm3,"وزن مخصوص بتن");
  const gammaSoil=finite(loads.soilUnitWeightKNm3,"وزن مخصوص خاک");
  if(!(thickness>0)||cover<0||!(gammaConcrete>0)||!(gammaSoil>0))
   throw new RangeError("ضخامت پی و وزن مخصوص مصالح باید مثبت و ارتفاع خاک روی پی نامنفی باشد.");
  if(!Array.isArray(d.cases)||!d.cases.length)throw new Error("حداقل یک حالت بار بهره‌برداری تأییدشده لازم است.");
  const A=B*L,footingWeight=A*thickness*gammaConcrete,soilCoverWeight=A*cover*gammaSoil;
  const overburden=gammaSoil*(cover+thickness);
  const results=d.cases.map((c,index)=>{
   const name=String(c.name||("case-"+(index+1)));
   if(!/^SLS(?:[-_ ]|$)/i.test(name)&&!name.includes("بهره‌برداری"))
    throw new Error("حالت "+name+" ترکیب بهره‌برداری SLS مشخص‌شده نیست؛ بارهای ULS یا بار منفرد پذیرفته نمی‌شوند.");
   if(typeof c.sourceReference!=="string"||!c.sourceReference.trim())
    throw new Error("مرجع گزارش تحلیل/جدول واکنش برای حالت "+name+" الزامی است.");
   const reactionN=finite(c.NkN,"نیروی قائم واکنش "+name);
   const Mx=finite(c.MxkNm||0,"لنگر Mx "+name),Mz=finite(c.MzkNm||0,"لنگر Mz "+name);
   const N=reactionN+footingWeight+soilCoverWeight;
   if(!(N>0))throw new Error("مجموع نیروی قائم شامل واکنش، وزن پی و خاک روی پی در "+name+" باید فشاری و مثبت باشد.");
   const ex=Mz/N,ez=Mx/N,qAvg=N/A;
   const qMaxGross=qAvg*(1+6*Math.abs(ex)/B+6*Math.abs(ez)/L);
   const qMinGross=qAvg*(1-6*Math.abs(ex)/B-6*Math.abs(ez)/L);
   const qMaxNet=qMaxGross-overburden,qMinNet=qMinGross-overburden;
   const fullContact=qMinGross>=-1e-9;
   const qMaxChecked=soil.allowableBearingBasis==="gross"?qMaxGross:qMaxNet;
   const qMinChecked=soil.allowableBearingBasis==="gross"?qMinGross:qMinNet;
   const bearingPass=fullContact&&qMaxChecked<=soil.allowableBearingKPa+1e-9;
   return Object.freeze({name,sourceReference:c.sourceReference.trim(),reactionNkN:reactionN,NkN:N,MxkNm:Mx,MzkNm:Mz,
    footingWeightKN:footingWeight,soilCoverWeightKN:soilCoverWeight,totalAddedWeightKN:footingWeight+soilCoverWeight,
    overburdenAtBaseKPa:overburden,areaM2:A,eccentricityX_m:ex,eccentricityZ_m:ez,
    qAverageGrossKPa:qAvg,qMaxGrossKPa:qMaxGross,qMinGrossKPa:qMinGross,
    qMaxNetKPa:qMaxNet,qMinNetKPa:qMinNet,qMaxCheckedKPa:qMaxChecked,qMinCheckedKPa:qMinChecked,
    fullContact,bearingPass,
    status:!fullContact?"blocked-no-tension-contact":qMaxChecked>soil.allowableBearingKPa?"fail-bearing-pressure":"pass-bearing-pressure"});
  });
  return Object.freeze({success:results.every(x=>x.bearingPass),
   method:"linear-elastic rectangular footing pressure; full-contact only; centered footing and soil-cover weights included",
   soil,footing:Object.freeze({B_m:B,L_m:L,areaM2:A,thicknessM:thickness,soilCoverAboveFootingM:cover,
    concreteUnitWeightKNm3:gammaConcrete,soilUnitWeightKNm3:gammaSoil,footingWeightKN:footingWeight,
    soilCoverWeightKN:soilCoverWeight,overburdenAtBaseKPa:overburden}),
   results:Object.freeze(results),
   limitations:Object.freeze([
    "وزن پی و وزن خاک روی آن به‌صورت بار قائم متمرکز در مرکز هندسی پی منظور شده‌اند؛ خروج از مرکزیت این وزن‌ها صفر فرض شده است.",
    "مبنای gross/net باید دقیقاً با تعریف ظرفیت مجاز در گزارش ژئوتکنیک یکسان باشد؛ برای net، سربار اولیه خاک تا زیر پی از فشار ناخالص کسر شده است.",
    "این کنترل فقط فشار تماس قائم پی مستطیلی با توزیع خطی و فرض تماس کامل را بررسی می‌کند؛ qmin ناخالص معیار تشخیص جداشدگی است.",
    "اگر qmin ناخالص منفی شود، تحلیل تماس جزئی/بلندشدگی لازم است؛ فشار کششی به خاک مجاز فرض نشده است.",
    "کنترل نشست، ظرفیت نهایی، لغزش، واژگونی، آب زیرزمینی، اثر لایه‌بندی، اندرکنش پی‌ها و طراحی آرماتور/برش پانچ در این ماژول انجام نمی‌شود.",
    "وزن شناژ، پدستال، دیوار، خاک جانبی، بارهای افقی و لنگر ناشی از اجزای خارج از مرکز در این محاسبه منظور نشده‌اند.",
    "وزن مخصوص بتن و خاک و ارتفاع پوشش باید از مشخصات واقعی پروژه/گزارش ژئوتکنیک وارد شوند؛ مقادیر پیش‌فرض ساخته نشده‌اند.",
    "بارهای ورودی باید ترکیبات بهره‌برداری (SLS) تأییدشده از تحلیل سازه باشند؛ نتایج ULS یا یک حالت بار منفرد جایگزین آن نیستند.",
    "تیپ I/II/III جایگزین ظرفیت باربری، پارامترهای مقاومت یا کنترل نشست گزارش ژئوتکنیک نیست."
   ])});
 }
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.soilCheckInitialized==="true")return;
  panel.dataset.soilCheckInitialized="true";
  const $=id=>root.document.getElementById(id);
  const enabled=$("soilControlEnabled"),fields=["soilType","soilQa","soilQaBasis","soilSource","soilFootingB","soilFootingL","sizingMinB","sizingMaxB","sizingStepB","sizingMinL","sizingMaxL","sizingStepL","sizingShape","btnSearchFootingDimensions","soilFootingThickness","soilCoverAboveFooting","concreteUnitWeight","soilUnitWeight","soilReactionCases","btnRunSoilCheck","foundationSlsBatchInput","btnValidateFoundationSlsBatch","foundationUlsBatchInput","btnMapFoundationUlsActions","foundationReactionSense","selectedFoundationNodeId","foundationLocalGeometryInput","btnMapFoundationActions","footingDesignInputJson","btnValidateFootingDesignInput"];
  const update=()=>{fields.forEach(id=>{const e=$(id);if(e)e.disabled=!enabled.checked;});};
  enabled.addEventListener("change",update);update();
  $("btnRunSoilCheck").addEventListener("click",()=>{
   const out=$("soilCheckResult");
   try{
    const cases=JSON.parse($("soilReactionCases").value||"[]");
    const result=checkRectangularFooting({soil:{soilType:$("soilType").value,allowableBearingKPa:$("soilQa").value,
     allowableBearingBasis:$("soilQaBasis").value,sourceReference:$("soilSource").value},
     Bm:$("soilFootingB").value,Lm:$("soilFootingL").value,
     footingLoads:{thicknessM:$("soilFootingThickness").value,soilCoverAboveFootingM:$("soilCoverAboveFooting").value,
      concreteUnitWeightKNm3:$("concreteUnitWeight").value,soilUnitWeightKNm3:$("soilUnitWeight").value},cases});
    const fmt=n=>Number(n).toFixed(2);
    out.textContent=[
     result.success?"کنترل فشار باربری در همه حالت‌های واردشده قبول شد.":"کنترل فشار باربری مردود یا مسدود است.",
     "تیپ خاک: "+result.soil.soilType+" | مبنای qa: "+result.soil.allowableBearingBasis+" | مرجع: "+result.soil.sourceReference+" | qa="+fmt(result.soil.allowableBearingKPa)+" kPa",
     "ابعاد پی: "+fmt(result.footing.B_m)+" × "+fmt(result.footing.L_m)+" m | وزن پی="+fmt(result.footing.footingWeightKN)+" kN | وزن خاک روی پی="+fmt(result.footing.soilCoverWeightKN)+" kN",
     ...result.results.map(x=>x.name+" | N کل="+fmt(x.NkN)+" kN | qmax ناخالص="+fmt(x.qMaxGrossKPa)+" | qmax خالص="+fmt(x.qMaxNetKPa)+" kPa | "+x.status),
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x)
    ].join("\n");
    out.style.color=result.success?"#15803d":"#b45309";lastResult=result;
   }catch(error){out.textContent="کنترل خاک انجام نشد: "+error.message;out.style.color="#b45309";lastResult=null;}
  });
 }
 const api=Object.freeze({validateSoil,checkRectangularFooting,render,get lastResult(){return lastResult;}});
 root.SahroudFoundationSoilCheck=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
