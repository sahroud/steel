/* SAHROUD STEEL - Climate Load Case Registry 1.0
   Organizes entered load values without inventing code coefficients.
   Units: kN/m2. All generated records are preliminary/unverified.
*/
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let restoredMeta = null;
  function finite(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function getData() {
    const loads = window.SteelLoads && window.SteelLoads.getData ? window.SteelLoads.getData() : {};
    const climate = loads.climate || {};
    const cases = [];
    const add = (id, type, value, side, signMeaning) => {
      const n = finite(value);
      cases.push({
        id, type, side: side || "both", value: n, unit: "kN/m2",
        signMeaning: signMeaning || "مقدار ورودی؛ تفسیر علامت نیازمند قرارداد بارگذاری پروژه",
        source: climate.source || "ورود دستی", city: climate.customCity || climate.city || "",
        codeEdition: "مبحث ششم ۱۳۹۸",
        validationStatus: n === null ? "missing" : "user-input-unverified",
        eligibleForCodeDesign: false
      });
    };
    ["Left","Right"].forEach(s => {
      const side = s === "Left" ? "left" : "right";
      add(side+"-dead","dead",loads["dead"+s],side);
      add(side+"-live","live",loads["live"+s],side);
      add(side+"-snow","snow-roof-input",loads["snow"+s],side);
      add(side+"-wind","wind-roof-input",loads["wind"+s],side,
        "علامت حفظ می‌شود؛ فشار/مکش نهایی و ضرایب خارجی/داخلی هنوز تعیین نشده‌اند");
    });
    add("wall-wind","wind-wall-input",loads.windWall,"walls",
      "علامت حفظ می‌شود؛ جهت و توزیع نهایی باید در مدل بارگذاری تعیین شود");
    return {
      schema:"sahroud-steel-load-cases", version:1,
      generatedAt:new Date().toISOString(), codeEdition:"مبحث ششم ۱۳۹۸",
      status:"preliminary-input-registry",
      note:"این فهرست فقط مقادیر واردشده را سازمان‌دهی می‌کند؛ بار آیین‌نامه‌ای یا ترکیب بار طراحی تولید نمی‌کند.",
      climate:{
        city:climate.city||"", customCity:climate.customCity||"",
        elevation:climate.elevation||"", groundSnow:climate.groundSnow||"",
        basicWind:climate.basicWind||"", terrain:climate.terrain||"",
        topography:climate.topography||"", openingState:climate.openingState||"",
        dominantOpening:climate.dominantOpening||""
      },
      windDirection:loads.windDirection||"not-specified", cases, restoredMeta
    };
  }
  function getRoofSideCases(loads, side) {
    const suffix = side === "left" ? "Left" : "Right";
    const d = loads || (window.SteelLoads && window.SteelLoads.getData ? window.SteelLoads.getData() : {});
    const dead=finite(d["dead"+suffix]) ?? 0;
    const live=finite(d["live"+suffix]) ?? 0;
    const snow=finite(d["snow"+suffix]) ?? 0;
    const wind=finite(d["wind"+suffix]) ?? 0;
    return {
      side,
      gravity:{dead,live,snow,total:dead+live+snow,status:"unfactored-user-input"},
      wind:{signed:wind,magnitude:Math.abs(wind),direction:d.windDirection||"not-specified",status:"signed-user-input-unverified"}
    };
  }
  function render() {
    const anchor=$("climateDatabaseTools")||$("climateNotice");
    if(!anchor||$("climateLoadCasePanel"))return;
    const panel=document.createElement("div");
    panel.id="climateLoadCasePanel"; panel.className="notice";
    panel.innerHTML='<b>دفتر حالت‌های بار و وضعیت اعتبار</b><p id="climateLoadCaseSummary"></p><p>این بخش بارهای واردشده را با واحد، منبع، محل و وضعیت اعتبار ثبت می‌کند. تا زمان تکمیل ضرایب رسمی باد، فشار داخلی ناشی از بازشوها، برف نامتوازن و ترکیبات بار، این رکوردها برای طراحی نهایی تأیید نشده‌اند.</p>';
    anchor.insertAdjacentElement("afterend",panel); updateSummary();
  }
  function updateSummary() {
    const el=$("climateLoadCaseSummary"); if(!el)return;
    const d=getData(), ready=d.cases.filter(x=>x.value!==null).length;
    el.textContent="حالت‌های دارای مقدار: "+ready+" از "+d.cases.length+" | موارد دارای تأیید آیین‌نامه‌ای: صفر | جهت باد: "+(d.windDirection==="left-to-right"?"چپ به راست":d.windDirection==="right-to-left"?"راست به چپ":"تعیین‌نشده");
  }
  function setData(data) { restoredMeta=data&&typeof data==="object"?{status:data.status||"",generatedAt:data.generatedAt||""}:null; }
  window.SteelClimateLoadEngine={getData,setData,getRoofSideCases,updateSummary};
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    document.addEventListener("input",e=>{if(e.target&&e.target.closest("#advancedLoadPanel"))updateSummary();});
  });
})();