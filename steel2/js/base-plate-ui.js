(function(root){
 "use strict";
 function init(){
  const $=id=>root.document.getElementById(id);
  const button=$("btnCheckBasePlateBending"),enabled=$("soilControlEnabled");
  if(!button||button.dataset.bound==="1")return;
  button.dataset.bound="1";
  const fields=["basePlateBearingInput","basePlateThicknessMM","basePlateFyMPa","basePlatePhi","basePlatePryingFactor","basePlateGeometryRef","basePlateStripInput"];
  const sync=()=>{fields.forEach(id=>{const e=$(id);if(e)e.disabled=!enabled?.checked;});button.disabled=!enabled?.checked;const b=$("btnCheckBasePlateBearing");if(b)b.disabled=!enabled?.checked;};
  enabled?.addEventListener("change",sync);sync();
  const bearingButton=$("btnCheckBasePlateBearing");
  if(bearingButton)bearingButton.addEventListener("click",()=>{
   const out=$("basePlateBearingResult");
   try{
    const result=root.SahroudBasePlateCheck.checkBasePlateBearingContact(JSON.parse($("basePlateBearingInput").value));
    const f=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:4});
    out.textContent=[
     result.success?"نتیجه: فشار تماس در مدل خطی و با فرض تماس کامل قابل قبول است.":result.status==="blocked-partial-contact-analysis-required"?"نتیجه مسدود: فشار کششی/جداشدگی محتمل است؛ تحلیل تماس جزئی لازم است.":"نتیجه: فشار تماس از ظرفیت مجاز واردشده بیشتر است.",
     "فشار متوسط="+f(result.averagePressureMPa)+" MPa | بیشینه="+f(result.qMaxMPa)+" MPa | کمینه="+f(result.qMinMPa)+" MPa | ظرفیت مجاز="+f(result.allowableBearingMPa)+" MPa",
     "مرجع هندسه: "+result.geometrySourceReference+" | مرجع ظرفیت: "+result.sourceReference+" | ترکیب: "+result.combinationDefinition,
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x)
    ].join("\\n");
    out.style.color="#b45309";
   }catch(e){out.textContent="کنترل فشار تماس انجام نشد: "+e.message;out.style.color="#b45309";}
  });


  const steelButton=$("btnCheckAnchorSteel");
  if(steelButton)steelButton.addEventListener("click",()=>{
   const out=$("anchorSteelResult");
   try{
    const r=root.SahroudBasePlateCheck.checkAnchorSteelCapacity(JSON.parse($("anchorSteelInput").value));
    const f=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:3});
    out.textContent=[
     r.success?"نتیجه: کنترل‌های مستقل کشش و برش فولاد انکر قبول‌اند؛ کنترل اندرکنش هنوز انجام نشده است.":"نتیجه: دست‌کم یکی از کنترل‌های مستقل کشش یا برش فولاد انکر مردود است.",
     ...r.anchors.map(a=>a.id+" | کشش "+f(a.tensionDemandKN)+"/"+f(a.designTensionCapacityKN)+" kN، نسبت "+f(a.tensionUtilization)+" | برش برآیند "+f(a.resultantShearDemandKN)+"/"+f(a.designShearCapacityKN)+" kN، نسبت "+f(a.shearUtilization)+" | "+a.status),
     "مرجع هندسه: "+r.geometrySourceReference+" | مرجع ظرفیت: "+r.capacitySourceReference+" | ترکیب: "+r.combinationDefinition,
     "محدودیت‌ها:",...r.limitations.map(x=>"• "+x)
    ].join("\\n");
    out.style.color="#b45309";
   }catch(e){out.textContent="کنترل فولاد انکر انجام نشد: "+e.message;out.style.color="#b45309";}
  });

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
