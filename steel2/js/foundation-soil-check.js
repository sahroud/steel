(function(root){
 "use strict";
 let lastResult=null;
 const finite=(v,label)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;};
 function validateSoil(input){
  const d=input||{},qa=finite(d.allowableBearingKPa,"ظرفیت مجاز باربری خاک");
  const soilType=String(d.soilType||"").trim().toUpperCase();
  if(!["I","II","III"].includes(soilType))throw new Error("تیپ خاک باید طبق گزارش ژئوتکنیک یکی از I، II یا III انتخاب شود.");
  if(!(qa>0))throw new RangeError("ظرفیت مجاز باربری خاک باید مثبت باشد.");
  if(typeof d.sourceReference!=="string"||!d.sourceReference.trim())throw new Error("مرجع گزارش ژئوتکنیک و شماره صفحه/بند الزامی است.");
  return Object.freeze({soilType,allowableBearingKPa:qa,sourceReference:d.sourceReference.trim()});
 }
 function checkRectangularFooting(input){
  const d=input||{},soil=validateSoil(d.soil);
  const B=finite(d.Bm,"عرض پی"),L=finite(d.Lm,"طول پی");
  if(!(B>0&&L>0))throw new RangeError("ابعاد پی باید مثبت باشند.");
  if(!Array.isArray(d.cases)||!d.cases.length)throw new Error("حداقل یک حالت بار بهره‌برداری تأییدشده لازم است.");
  const results=d.cases.map((c,index)=>{
   const name=String(c.name||("case-"+(index+1)));
   if(!/^SLS(?:[-_ ]|$)/i.test(name)&&!name.includes("بهره‌برداری"))
    throw new Error("حالت "+name+" ترکیب بهره‌برداری SLS مشخص‌شده نیست؛ بارهای ULS یا بار منفرد پذیرفته نمی‌شوند.");
   if(typeof c.sourceReference!=="string"||!c.sourceReference.trim())
    throw new Error("مرجع گزارش تحلیل/جدول واکنش برای حالت "+name+" الزامی است.");
   const N=finite(c.NkN,"نیروی قائم "+name),Mx=finite(c.MxkNm||0,"لنگر Mx "+name),Mz=finite(c.MzkNm||0,"لنگر Mz "+name);
   if(!(N>0))throw new Error("نیروی قائم فشاری در "+name+" باید مثبت باشد؛ کشش/بلندشدگی نیازمند کنترل جداگانه است.");
   const A=B*L,ex=Mz/N,ez=Mx/N;
   const qAvg=N/A,qMax=qAvg*(1+6*Math.abs(ex)/B+6*Math.abs(ez)/L),qMin=qAvg*(1-6*Math.abs(ex)/B-6*Math.abs(ez)/L);
   const fullContact=qMin>=-1e-9;
   return Object.freeze({name,sourceReference:c.sourceReference.trim(),NkN:N,MxkNm:Mx,MzkNm:Mz,areaM2:A,eccentricityX_m:ex,eccentricityZ_m:ez,
    qAverageKPa:qAvg,qMaxKPa:qMax,qMinKPa:qMin,fullContact,
    bearingPass:fullContact&&qMax<=soil.allowableBearingKPa+1e-9,
    status:!fullContact?"blocked-no-tension-contact":qMax>soil.allowableBearingKPa?"fail-bearing-pressure":"pass-bearing-pressure"});
  });
  return Object.freeze({success:results.every(x=>x.bearingPass),method:"linear-elastic rectangular footing pressure; full-contact only",
   soil,footing:Object.freeze({B_m:B,L_m:L,areaM2:B*L}),results:Object.freeze(results),
   limitations:Object.freeze([
    "این کنترل فقط فشار تماس قائم پی مستطیلی با توزیع خطی و فرض تماس کامل را بررسی می‌کند.",
    "اگر qmin منفی شود، نتیجه باطل و تحلیل تماس جزئی/بلندشدگی لازم است؛ فشار کششی به خاک مجاز فرض نشده است.",
    "کنترل نشست، ظرفیت نهایی، لغزش، واژگونی، آب زیرزمینی، اثر لایه‌بندی، اندرکنش پی‌ها و طراحی آرماتور/برش پانچ در این ماژول انجام نمی‌شود.",
    "بارهای ورودی باید ترکیبات بهره‌برداری (SLS) تأییدشده از تحلیل سازه باشند؛ نتایج ULS یا یک حالت بار منفرد جایگزین آن نیستند.",
    "تیپ I/II/III فقط رده‌بندی لرزه‌ای/ژئوتکنیکی ثبت‌شده است و جایگزین ظرفیت باربری، پارامترهای مقاومت یا کنترل نشست گزارش ژئوتکنیک نیست.",
    "ظرفیت مجاز خاک باید از گزارش ژئوتکنیک همان پروژه و با لحاظ عمق و ابعاد پی اخذ شود."
   ])});
 }
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.soilCheckInitialized==="true")return;
  panel.dataset.soilCheckInitialized="true";
  const $=id=>root.document.getElementById(id);
  const enabled=$("soilControlEnabled"),fields=["soilType","soilQa","soilSource","soilFootingB","soilFootingL","soilReactionCases","btnRunSoilCheck","foundationSlsBatchInput","btnValidateFoundationSlsBatch","foundationReactionSense","selectedFoundationNodeId","foundationLocalGeometryInput","btnMapFoundationActions"];
  const update=()=>{fields.forEach(id=>{const e=$(id);if(e)e.disabled=!enabled.checked;});};
  enabled.addEventListener("change",update);update();
  $("btnRunSoilCheck").addEventListener("click",()=>{
   const out=$("soilCheckResult");
   try{
    const cases=JSON.parse($("soilReactionCases").value||"[]");
    const result=checkRectangularFooting({soil:{soilType:$("soilType").value,allowableBearingKPa:$("soilQa").value,sourceReference:$("soilSource").value},
     Bm:$("soilFootingB").value,Lm:$("soilFootingL").value,cases});
    const fmt=n=>Number(n).toFixed(2);
    out.textContent=[
     result.success?"کنترل فشار باربری در همه حالت‌های واردشده قبول شد.":"کنترل فشار باربری مردود یا مسدود است.",
     "تیپ خاک: "+result.soil.soilType+" | مرجع خاک: "+result.soil.sourceReference+" | qa="+fmt(result.soil.allowableBearingKPa)+" kPa | مساحت پی="+fmt(result.footing.areaM2)+" m²",
     ...result.results.map(x=>x.name+" | N="+fmt(x.NkN)+" kN | ex="+fmt(x.eccentricityX_m)+" m | ez="+fmt(x.eccentricityZ_m)+" m | qmin="+fmt(x.qMinKPa)+" kPa | qmax="+fmt(x.qMaxKPa)+" kPa | "+x.status),
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x)
    ].join("\n");
    out.style.color=result.success?"#15803d":"#b45309";
    lastResult=result;
   }catch(error){out.textContent="کنترل خاک انجام نشد: "+error.message;out.style.color="#b45309";lastResult=null;}
  });
 }
 const api=Object.freeze({validateSoil,checkRectangularFooting,render,get lastResult(){return lastResult;}});
 root.SahroudFoundationSoilCheck=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
