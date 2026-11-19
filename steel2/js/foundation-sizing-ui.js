(function(root){
 "use strict";
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.foundationSizingUiInitialized==="true")return;
  panel.dataset.foundationSizingUiInitialized="true";
  const $=id=>root.document.getElementById(id);
  const button=$("btnSearchFootingDimensions"),out=$("foundationSizingResult");
  if(!button||!out)return;
  button.addEventListener("click",()=>{
   try{
    if(!root.SahroudFoundationSizing||!root.SahroudFoundationSoilCheck)
     throw new Error("ماژول جست‌وجوی ابعاد یا کنترل فشار خاک بارگذاری نشده است.");
    const cases=JSON.parse($("soilReactionCases").value||"[]");
    const result=root.SahroudFoundationSizing.searchFootingDimensions({
     soil:{soilType:$("soilType").value,allowableBearingKPa:$("soilQa").value,
      allowableBearingBasis:$("soilQaBasis").value,sourceReference:$("soilSource").value},
     footingLoads:{thicknessM:$("soilFootingThickness").value,soilCoverAboveFootingM:$("soilCoverAboveFooting").value,
      concreteUnitWeightKNm3:$("concreteUnitWeight").value,soilUnitWeightKNm3:$("soilUnitWeight").value},
     cases,
     search:{minB:$("sizingMinB").value,maxB:$("sizingMaxB").value,stepB:$("sizingStepB").value,
      minL:$("sizingMinL").value,maxL:$("sizingMaxL").value,stepL:$("sizingStepL").value,
      shape:$("sizingShape").value,maxCandidates:2500}
    });
    const f=n=>Number(n).toFixed(2);
    const lines=[
     result.success?"ابعاد مقدماتی قابل قبول بر اساس فشار تماس پیدا شد.":"در محدوده جست‌وجو هیچ ابعادی تمام کنترل‌های فشار تماس را نگذرانده است.",
     "تعداد بررسی: "+result.counts.evaluated+" | قبول: "+result.counts.accepted+" | رد: "+result.counts.rejected,
     result.selected?"ابعاد پیشنهادی مقدماتی: "+f(result.selected.B_m)+" × "+f(result.selected.L_m)+" متر | مساحت: "+f(result.selected.areaM2)+" مترمربع":"ابعاد پیشنهادی وجود ندارد.",
     "نتایج کاندیداها (به ترتیب مساحت):",
     ...result.candidates.slice(0,40).map(c=>f(c.B_m)+" × "+f(c.L_m)+" m | "+c.status+
      (c.success?"": " | "+(c.failedCases||[]).map(x=>x.name+":"+x.status).join(", "))),
     result.candidates.length>40?"نمایش ۴۰ مورد نخست؛ تمام نتایج در خروجی JSON پایین موجود است.":"",
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x),
     "داده کامل جست‌وجو:",JSON.stringify(result,null,2)
    ].filter(Boolean);
    out.textContent=lines.join("\n");out.style.color=result.success?"#15803d":"#b45309";
   }catch(error){out.textContent="جست‌وجوی ابعاد انجام نشد: "+error.message;out.style.color="#b45309";}
  });
 }
 const api=Object.freeze({render});
 root.SahroudFoundationSizingUI=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
