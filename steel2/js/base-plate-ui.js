(function(root){
 "use strict";
 function init(){
  const $=id=>root.document.getElementById(id);
  const button=$("btnCheckBasePlateBending"),enabled=$("soilControlEnabled");
  if(!button||button.dataset.bound==="1")return;
  button.dataset.bound="1";
  const fields=["basePlateBearingInput","anchorSteelInput","concreteAnchorInput","anchorInteractionInput","anchorGroupInput","anchorGeometryInput","basePlateThicknessMM","basePlateFyMPa","basePlatePhi","basePlatePryingFactor","basePlateGeometryRef","basePlateStripInput"];
  const sync=()=>{fields.forEach(id=>{const e=$(id);if(e)e.disabled=!enabled?.checked;});button.disabled=!enabled?.checked;const b=$("btnCheckBasePlateBearing");if(b)b.disabled=!enabled?.checked;const a=$("btnCheckAnchorSteel");if(a)a.disabled=!enabled?.checked;const c=$("btnCheckConcreteAnchor");if(c)c.disabled=!enabled?.checked;const i=$("btnCheckAnchorInteraction");if(i)i.disabled=!enabled?.checked;const g=$("btnCheckAnchorGroup");if(g)g.disabled=!enabled?.checked;const geo=$("btnCheckAnchorGeometry");if(geo)geo.disabled=!enabled?.checked;};
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


  const concreteButton=$("btnCheckConcreteAnchor");
  if(concreteButton)concreteButton.addEventListener("click",()=>{
   const out=$("concreteAnchorResult");
   try{
    const r=root.SahroudBasePlateCheck.checkConcreteAnchorFailure(JSON.parse($("concreteAnchorInput").value));
    const f=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:3});
    const labels={"concrete-breakout-tension":"شکست مخروطی بتن در کشش","pullout-tension":"بیرون‌کشیدگی در کشش","concrete-edge-shear":"شکست لبه بتن در برش","pryout-shear":"Pryout در برش"};
    out.textContent=[
     r.success?"نتیجه: تمام مقایسه‌های ظرفیت بتنِ واردشده قبول‌اند؛ کنترل گروه و اندرکنش انجام نشده است.":"نتیجه: حداقل یک حالت شکست بتن/انکر از ظرفیت طراحی واردشده عبور کرده است.",
     ...r.anchors.map(a=>a.id+" | "+a.checks.map(x=>labels[x.mode]+": "+f(x.demandKN)+"/"+f(x.capacityKN)+" kN، نسبت "+f(x.utilization)+(x.pass?" قبول":" مردود")).join(" ؛ ")+" | حاکم: "+labels[a.governingMode.mode]),
     "مرجع هندسه: "+r.geometrySourceReference+" | مرجع ظرفیت: "+r.capacitySourceReference+" | ترکیب: "+r.combinationDefinition,
     "محدودیت‌ها:",...r.limitations.map(x=>"• "+x)
    ].join("\\n");
    out.style.color="#b45309";
   }catch(e){out.textContent="کنترل شکست بتن انجام نشد: "+e.message;out.style.color="#b45309";}
  });



  const geometryButton=$("btnCheckAnchorGeometry");
  if(geometryButton)geometryButton.addEventListener("click",()=>{
   const out=$("anchorGeometryResult");
   try{
    const r=root.SahroudBasePlateCheck.checkAnchorGeometry(JSON.parse($("anchorGeometryInput").value));
    const f=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:2});
    out.textContent=[r.success?"نتیجه: فاصله‌های هندسی انکرها از حداقل‌های ورودی کمتر نیست.":"نتیجه: حداقل یکی از فاصله‌های لبه یا محور انکرها ناکافی است.",
     ...r.anchors.map(a=>a.id+" | لبه‌های X-/X+/Z-/Z+ = "+Object.values(a.edgeDistancesMM).map(f).join(" / ")+" mm | حداقل="+f(a.governingEdgeDistanceMM)+" mm | "+(a.edgePass?"قبول":"مردود")),
     ...r.pairs.map(p=>p.anchorA+"–"+p.anchorB+" | فاصله محور="+f(p.spacingMM)+" mm | "+(p.pass?"قبول":"مردود")),
     "عمق مؤثر ثبت‌شده="+f(r.effectiveEmbedmentMM)+" mm | مرجع هندسه: "+r.geometrySourceReference,
     "محدودیت‌ها:",...r.limitations.map(x=>"• "+x)].join("\\n");
    out.style.color="#b45309";
   }catch(e){out.textContent="کنترل هندسه انکر انجام نشد: "+e.message;out.style.color="#b45309";}
  });
  const groupButton=$("btnCheckAnchorGroup");
  if(groupButton)groupButton.addEventListener("click",()=>{
   const out=$("anchorGroupResult");
   try{
    const r=root.SahroudBasePlateCheck.checkAnchorGroupCapacity(JSON.parse($("anchorGroupInput").value));
    const f=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:4});
    out.textContent=[r.success?"نتیجه: تقاضای کل گروه در هر چهار ظرفیت طراحی گروهِ واردشده قرار دارد.":"نتیجه: دست‌کم یک تقاضای کل گروه از ظرفیت طراحی گروه عبور کرده است.",
     ...r.checks.map(x=>x.label+" | تقاضا="+f(x.demandKN)+" kN | ظرفیت گروه="+f(x.designCapacityKN)+" kN | نسبت="+f(x.utilization)+" | "+(x.pass?"قبول":"مردود")),
     "تعداد انکر="+f(r.anchorCount)+" | مرجع هندسه: "+r.geometrySourceReference+" | مرجع ظرفیت گروه: "+r.groupCapacitySourceReference+" | ترکیب: "+r.combinationDefinition,
     "محدودیت‌ها:",...r.limitations.map(x=>"• "+x)].join("\\n");
    out.style.color="#b45309";
   }catch(e){out.textContent="کنترل گروه انکر انجام نشد: "+e.message;out.style.color="#b45309";}
  });
  const interactionButton=$("btnCheckAnchorInteraction");
  if(interactionButton)interactionButton.addEventListener("click",()=>{
   const out=$("anchorInteractionResult");
   try{
    const r=root.SahroudBasePlateCheck.checkAnchorSteelInteraction(JSON.parse($("anchorInteractionInput").value));
    const f=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:4});
    out.textContent=[
     r.success?"نتیجه: مقدار رابطه اندرکنش در محدوده مجاز واردشده است.":"نتیجه: رابطه اندرکنش از حد مجاز واردشده عبور کرده است.",
     ...r.anchors.map(a=>a.id+" | نسبت کشش="+f(a.tensionRatio)+" | نسبت برش="+f(a.shearRatio)+" | مقدار رابطه="+f(a.interactionValue)+" / حد="+f(a.interactionLimit)+" | "+a.status),
     "رابطه: "+r.method+" | مرجع ضابطه: "+r.interactionRuleReference+" | مرجع ظرفیت: "+r.capacitySourceReference+" | ترکیب: "+r.combinationDefinition,
     "محدودیت‌ها:",...r.limitations.map(x=>"• "+x)
    ].join("\\n");
    out.style.color="#b45309";
   }catch(e){out.textContent="کنترل اندرکنش انجام نشد: "+e.message;out.style.color="#b45309";}
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
