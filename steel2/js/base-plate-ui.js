(function(root){
 "use strict";
 function init(){
  const $=id=>root.document.getElementById(id);
  const button=$("btnCheckBasePlateBending"),enabled=$("soilControlEnabled");
  if(!button||button.dataset.bound==="1")return;
  button.dataset.bound="1";
  const fields=["basePlateThicknessMM","basePlateFyMPa","basePlatePhi","basePlatePryingFactor","basePlateGeometryRef","basePlateStripInput"];
  const sync=()=>{fields.forEach(id=>{const e=$(id);if(e)e.disabled=!enabled?.checked;});button.disabled=!enabled?.checked;};
  enabled?.addEventListener("change",sync);sync();
  button.addEventListener("click",()=>{
   const out=$("basePlateBendingResult");
   try{
    const anchors=JSON.parse($("basePlateStripInput").value);
    const result=root.SahroudBasePlateCheck.checkBasePlateCantileverBending({
     plateThicknessMM:$("basePlateThicknessMM").value,
     plateFyMPa:$("basePlateFyMPa").value,
     phi:$("basePlatePhi").value,
     pryingFactor:$("basePlatePryingFactor").value,
     geometrySourceReference:$("basePlateGeometryRef").value,
     anchors
    });
    const f=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:3});
    out.textContent=[
     result.success?"نتیجه: خمش نوار صفحه در مدل ساده‌شده قبول است؛ این به معنی تأیید صفحه‌ستون نیست.":"نتیجه: خمش نوار صفحه در مدل ساده‌شده مردود است یا به بازطراحی نیاز دارد.",
     "ضخامت="+f(result.plateThicknessMM)+" mm | Fy="+f(result.plateFyMPa)+" MPa | φ="+f(result.phi)+" | ضریب پریینگ ورودی="+f(result.pryingFactor),
     ...result.anchors.map(a=>a.id+" | کشش تشدیدشده="+f(a.pryingAmplifiedTensionKN)+" kN | Mu="+f(a.momentDemandNmmPerMM)+" N.mm/mm | φMn="+f(a.designMomentCapacityNmmPerMM)+" N.mm/mm | نسبت="+f(a.utilization)+" | "+a.status),
     "بیشترین نسبت تقاضا به ظرفیت: "+f(result.maximumUtilization),
     "مرجع هندسه: "+result.geometrySourceReference,
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x)
    ].join("\n");
    out.style.color=result.success?"#b45309":"#b45309";
   }catch(e){out.textContent="کنترل خمش صفحه انجام نشد: "+e.message;out.style.color="#b45309";}
  });
 }
 if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
