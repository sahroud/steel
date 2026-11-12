/* SAHROUD STEEL - Climate Load Case Registry 1.0
   Organizes entered load values without inventing code coefficients.
   Units: kN/m2. All generated records are preliminary/unverified.
*/
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let restoredMeta = null;
  const windCoefficientDefaults = {
    importance: "", exposure: "", topography: "", gust: "",
    externalPressure: "", directionality: "",
    internalGust: "", internalPressure: ""
  };
  function windCoefficientBasis(breadth) {
    const span=finite($("span")?.value),length=finite($("length")?.value);
    const eave=finite($("height")?.value),rise=finite($("rise")?.value);
    const h=eave!==null&&rise!==null?eave+rise:null;
    if(h===null||!(h>0)||breadth===null||!(breadth>0))return null;
    const ratio=h/breadth;
    return {height:h,breadth,heightToBreadth:ratio,combined:h<20&&ratio<1};
  }
  function readWindCoefficients() {
    const ids = {
      importance:"windCoeffIw", exposure:"windCoeffCe",
      topography:"windCoeffCt", gust:"windCoeffCg",
      externalPressure:"windCoeffCp", directionality:"windCoeffCd",
      internalGust:"windCoeffCgi", internalPressure:"windCoeffCpi"
    };
    const saved = restoredMeta && restoredMeta.windCalculation && restoredMeta.windCalculation.coefficients
      ? restoredMeta.windCalculation.coefficients : {};
    const result = {};
    Object.keys(ids).forEach(key => {
      const el = $(ids[key]);
      result[key] = el ? el.value : (saved[key] !== undefined ? saved[key] : windCoefficientDefaults[key]);
    });
    return result;
  }
  function calculateWindPressure() {
    const loads = window.SteelLoads && window.SteelLoads.getData ? window.SteelLoads.getData() : {};
    const climate = loads.climate || {};
    const speed = finite(climate.basicWind);
    const q = speed === null ? null : 0.000613 * Math.pow(speed / 3.6, 2);
    const c = readWindCoefficients();
    const required = Object.keys(windCoefficientDefaults).filter(key => key !== "gust");
    const values = {};
    required.forEach(key => values[key] = finite(c[key]));
    const complete = q !== null && required.every(key => values[key] !== null);
    if (!complete) return { q, coefficients:c, complete:false, external:null, internal:null, net:null };
    const common = values.importance * q * values.exposure * values.topography * values.directionality;
    const span=finite($("span")?.value),length=finite($("length")?.value);
    const bx=windCoefficientBasis(span),bz=windCoefficientBasis(length);
    if(!bx||!bz||bx.combined!==bz.combined)
      return {q,coefficients:c,complete:false,external:null,internal:null,net:null,reason:"برای این محاسبه عمومی، مبنای CgCp/Cp در دو راستای اصلی یکسان یا هندسه کامل نیست؛ از دفتر باد جهت‌دار استفاده کنید."};
    if(!bx.combined&&!(values.gust>0))
      return {q,coefficients:c,complete:false,external:null,internal:null,net:null,reason:"در حالت Cp جداگانه، Cg باید مثبت و معتبر باشد."};
    const external = common * (bx.combined ? values.externalPressure : values.gust * values.externalPressure);
    const internal = common * values.internalGust * values.internalPressure;
    return { q, coefficients:c, complete:true, external, internal, net:external-internal, externalCoefficientBasis:bx.combined?"combined-CgCp":"separate-Cp" };
  }
  function updateWindPressureResult() {
    const out = $("windPressureCalculationResult");
    if (!out) return;
    const r = calculateWindPressure();
    if (r.q === null) {
      out.textContent = "ابتدا سرعت مبنای باد را در اطلاعات اقلیمی وارد کنید.";
      return;
    }
    const qText = "فشار مبنا q = " + r.q.toFixed(3) + " kN/m². ";
    if (!r.complete) {
      out.textContent = qText + (r.reason || "برای محاسبه فشار خارجی و داخلی، ضرایب لازم باید از متن معتبر مبحث ششم ۱۳۹۸ وارد شوند. هیچ ضریب پیش‌فرض یا حدسی اعمال نمی‌شود.");
      return;
    }
    out.textContent = qText +
      "فشار خارجی = " + r.external.toFixed(3) + " kN/m²؛ فشار داخلی = " + r.internal.toFixed(3) +
      " kN/m²؛ فشار خالص این سطح = " + r.net.toFixed(3) +
      " kN/m² (فشار خالص = خارجی منهای داخلی؛ علامت ضرایب حفظ شده است). " +
      "این محاسبه برای یک سطح و یک مجموعه ضریب ورودی است و هنوز به اعضای مدل سه‌بعدی منتقل نمی‌شود.";
  }
  function finite(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  const windZoneIds = {
    "roof-left":"windZoneRoofLeft","roof-right":"windZoneRoofRight",
    "long-wall-left":"windZoneLongLeft","long-wall-right":"windZoneLongRight",
    "end-wall-front":"windZoneEndFront","end-wall-back":"windZoneEndBack"
  };
  function readWindZones() {
    const saved=restoredMeta&&restoredMeta.windZones?restoredMeta.windZones:{};
    const result={};
    Object.keys(windZoneIds).forEach(key=>{
      const el=document.querySelector('.wind-zone-cp[data-zone="'+key+'"]');
      result[key]=el?el.value:(saved[key]!==undefined?saved[key]:"");
    });
    return result;
  }
  function calculateWindZones() {
    const loads=window.SteelLoads&&window.SteelLoads.getData?window.SteelLoads.getData():{};
    const climate=loads.climate||{},speed=finite(climate.basicWind);
    const q=speed===null?null:0.000613*Math.pow(speed/3.6,2);
    const c=readWindCoefficients(),v={};
    Object.keys(windCoefficientDefaults).forEach(k=>v[k]=finite(c[k]));
    const zones=readWindZones();
    const required=["importance","exposure","topography","directionality","internalGust"];
    const commonReady=q!==null&&required.every(k=>v[k]!==null);
    const internalMagnitude=v.internalPressure===null?null:Math.abs(v.internalPressure);
    const rows={};
    Object.keys(zones).forEach(key=>{
      const cp=finite(zones[key]);
      if(!commonReady||cp===null||internalMagnitude===null){rows[key]=null;return;}
      const common=v.importance*q*v.exposure*v.topography*v.directionality;
      const breadth=key.startsWith("end-wall-")?finite($("length")?.value):finite($("span")?.value);
      const basis=windCoefficientBasis(breadth);
      if(!basis||(!basis.combined&&!(v.gust>0))){rows[key]=null;return;}
      const ext=common*(basis.combined?cp:v.gust*cp);
      const intMagnitude=common*v.internalGust*internalMagnitude;
      rows[key]={cp,external:ext,externalCoefficientBasis:basis.combined?"combined-CgCp":"separate-Cp",
        heightToBreadth:basis.heightToBreadth,internalPositive:intMagnitude,internalNegative:-intMagnitude,
        netInternalPositive:ext-intMagnitude,netInternalNegative:ext+intMagnitude};
    });
    return {q,rows,zones,ready:Object.values(rows).every(Boolean)};
  }
  function updateWindZones() {
    const r=calculateWindZones();
    const map={
      "roof-left":["windZoneRoofLeftPlus","windZoneRoofLeftMinus"],
      "roof-right":["windZoneRoofRightPlus","windZoneRoofRightMinus"],
      "long-wall-left":["windZoneLongLeftPlus","windZoneLongLeftMinus"],
      "long-wall-right":["windZoneLongRightPlus","windZoneLongRightMinus"],
      "end-wall-front":["windZoneEndFrontPlus","windZoneEndFrontMinus"],
      "end-wall-back":["windZoneEndBackPlus","windZoneEndBackMinus"]
    };
    Object.keys(map).forEach(k=>{
      const x=r.rows[k],ids=map[k];
      if($(ids[0]))$(ids[0]).textContent=x?x.netInternalPositive.toFixed(3)+" kN/m²":"—";
      if($(ids[1]))$(ids[1]).textContent=x?x.netInternalNegative.toFixed(3)+" kN/m²":"—";
    });
    const out=$("windZoneStatus");
    if(out)out.textContent=r.ready
      ?"فشار خالص هر شش سطح برای دو حالت علامت فشار داخلی محاسبه شد. مبنای CgCp/Cp طبق هندسه کنترل شد. q="+r.q.toFixed(3)+" kN/m². مقادیر هنوز دستی/تأییدنشده‌اند و به تحلیل سه‌بعدی منتقل نمی‌شوند."
      :"برای محاسبه همه سطوح، ضرایب مشترک Iw، Ce، Ct، Cd، Cgi، قدرمطلق Cpi و ضریب خارجی هر سطح را وارد کنید؛ Cg فقط در حالت Cp جداگانه لازم است.";
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
    add("wall-wind","wind-wall-input",loads.windWall,"long-walls",
      "فشار خالص دستی؛ در مدل سه‌بعدی به قیدهای طولی منتقل می‌شود");
    add("front-end-wall-wind","wind-endwall-input",loads.windEndFront,"front",
      "فشار خالص دستی؛ در مدل سه‌بعدی به تیرهای افقی دیوار انتهایی جلو منتقل می‌شود؛ ناحیه مثلثی زیر تاج هنوز منظور نشده است");
    add("rear-end-wall-wind","wind-endwall-input",loads.windEndBack,"rear",
      "فشار خالص دستی؛ در مدل سه‌بعدی به تیرهای افقی دیوار انتهایی عقب منتقل می‌شود؛ ناحیه مثلثی زیر تاج هنوز منظور نشده است");
    return {
      schema:"sahroud-steel-load-cases", version:1,
      generatedAt:new Date().toISOString(), codeEdition:"مبحث ششم ۱۳۹۸",
      status:"preliminary-input-registry",
      note:"این فهرست فقط مقادیر واردشده را سازمان‌دهی می‌کند؛ بار آیین‌نامه‌ای یا ترکیب بار طراحی تولید نمی‌کند.",
      windCalculation:{
        coefficients:readWindCoefficients(),
        zones:readWindZones(),
        zoneResults:calculateWindZones(),
        status:"manual-code-coefficients-calculated-for-multiple-surfaces-not-applied-to-3d-model",
        formulaExternal:"P = Iw q Ce Ct Cd × CgCp (combined) OR × Cg × Cp (separate)",
        formulaInternal:"Pi = Iw q Ce Ct Cgi Cpi Cd",
        netConvention:"Pnet = Pexternal - Pinternal"
      },
      climate:{
        city:climate.city||"", customCity:climate.customCity||"",
        elevation:climate.elevation||"", groundSnow:climate.groundSnow||"",
        basicWind:climate.basicWind||"", basicWindUnit:"km/h",
        basicWindPressure:finite(climate.basicWind)===null?null:0.000613*Math.pow(Number(climate.basicWind)/3.6,2),
        basicWindPressureUnit:"kN/m2", groundSnowUnit:"kN/m2",
        siteElevationASL:finite(climate.elevation), terrain:climate.terrain||"",
        topography:climate.topography||"", openingState:climate.openingState||"",
        dominantOpening:climate.dominantOpening||"",
        windCalculationStatus:"basic-pressure-only; terrain and building coefficients not yet applied"
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
    panel.innerHTML='<b>دفتر حالت‌های بار و وضعیت اعتبار</b><p id="climateLoadCaseSummary"></p><p>این بخش بارهای واردشده را با واحد، منبع، محل و وضعیت اعتبار ثبت می‌کند. تا زمان تکمیل ضرایب رسمی باد، فشار داخلی ناشی از بازشوها، برف نامتوازن و ترکیبات بار، این رکوردها برای طراحی نهایی تأیید نشده‌اند.</p>' +
      '<hr><b>محاسبه فشار باد ـ مرحله اول</b>' +
      '<p>رابطه فشار خارجی: P = Iw × q × Ce × Ct × Cd × (CgCp ترکیبی، یا Cg × Cp در حالت جداگانه)</p>' +
      '<p>رابطه فشار داخلی: Pi = Iw × q × Ce × Ct × Cgi × Cpi × Cd</p>' +
      '<p>ضرایب را از بندها و جداول مبحث ششم ۱۳۹۸ وارد کنید. برای جلوگیری از محاسبه نادرست، مقدارهای تأییدنشده خالی مانده‌اند.</p>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="windCoeffIw">ضریب اهمیت باد Iw</label><input id="windCoeffIw" type="number" step="0.01" placeholder="از جدول آیین‌نامه"></div>' +
      '<div class="field"><label for="windCoeffCe">ضریب تغییر سرعت Ce</label><input id="windCoeffCe" type="number" step="0.01" placeholder="از بند زبری و ارتفاع"></div>' +
      '<div class="field"><label for="windCoeffCt">ضریب پستی و بلندی Ct</label><input id="windCoeffCt" type="number" step="0.01" placeholder="از بررسی توپوگرافی"></div>' +
      '<div class="field"><label for="windCoeffCg">ضریب اثر تندباد خارجی Cg</label><input id="windCoeffCg" type="number" step="0.01" placeholder="از بند مربوط"></div>' +
      '<div class="field"><label for="windCoeffCp">ضریب فشار خارجی Cp</label><input id="windCoeffCp" type="number" step="0.01" placeholder="علامت‌دار؛ برای سطح موردنظر"></div>' +
      '<div class="field"><label for="windCoeffCd">ضریب هم‌راستایی باد Cd</label><input id="windCoeffCd" type="number" step="0.01" placeholder="از جدول آیین‌نامه"></div>' +
      '<div class="field"><label for="windCoeffCgi">ضریب اثر تندباد داخلی Cgi</label><input id="windCoeffCgi" type="number" step="0.01" placeholder="از بند مربوط"></div>' +
      '<div class="field"><label for="windCoeffCpi">ضریب فشار داخلی Cpi</label><input id="windCoeffCpi" type="number" step="0.01" placeholder="علامت‌دار؛ بر اساس بازشوها"></div>' +
      '</div><p id="windPressureCalculationResult" class="notice" aria-live="polite"></p>' +
      '<hr><b>دفتر فشار بادِ سطوح مختلف ـ ورود ضرایب خارجی به تفکیک سطح</b>' +
      '<p>برای هر سطح، ضریب خارجی را جداگانه و با علامت از متن معتبر وارد کنید؛ در حالت h<20m و h/b<1، مقدار جدول ممکن است CgCp ترکیبی باشد و نباید Cg دوباره ضرب شود. نرم‌افزار دو حالت فشار داخلی مثبت و منفی را جداگانه می‌سازد و فشار خالص هر سطح را گزارش می‌کند. این دفتر هنوز به تحلیل سه‌بعدی متصل نیست.</p>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>سطح</th><th>جهت باد</th><th>Cp یا CgCp خارجی</th><th>فشار خالص با Cpi مثبت</th><th>فشار خالص با Cpi منفی</th></tr></thead><tbody>' +
      '<tr><td>شیب چپ بام</td><td>عمود بر قاب</td><td><input class="wind-zone-cp" data-zone="roof-left" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneRoofLeftPlus">—</td><td id="windZoneRoofLeftMinus">—</td></tr>' +
      '<tr><td>شیب راست بام</td><td>عمود بر قاب</td><td><input class="wind-zone-cp" data-zone="roof-right" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneRoofRightPlus">—</td><td id="windZoneRoofRightMinus">—</td></tr>' +
      '<tr><td>دیوار طولی چپ</td><td>طولی ±Y</td><td><input class="wind-zone-cp" data-zone="long-wall-left" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneLongLeftPlus">—</td><td id="windZoneLongLeftMinus">—</td></tr>' +
      '<tr><td>دیوار طولی راست</td><td>طولی ±Y</td><td><input class="wind-zone-cp" data-zone="long-wall-right" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneLongRightPlus">—</td><td id="windZoneLongRightMinus">—</td></tr>' +
      '<tr><td>دیوار انتهایی جلو</td><td>عرضی ±X</td><td><input class="wind-zone-cp" data-zone="end-wall-front" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneEndFrontPlus">—</td><td id="windZoneEndFrontMinus">—</td></tr>' +
      '<tr><td>دیوار انتهایی عقب</td><td>عرضی ±X</td><td><input class="wind-zone-cp" data-zone="end-wall-back" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneEndBackPlus">—</td><td id="windZoneEndBackMinus">—</td></tr>' +
      '</tbody></table></div>' +
      '<p id="windZoneStatus" class="notice" aria-live="polite">برای محاسبه، ضرایب مشترک و Cp هر سطح باید تکمیل شوند.</p>' +
      '<p><b>تذکر:</b> انتخاب Cp و علامت آن باید متناسب با جهت باد، نسبت ابعادی، شیب بام و ناحیه لبه/گوشه از جداول و شکل‌های مبحث ششم ۱۳۹۸ انجام شود. این جدول فقط سطوح کلی را تفکیک می‌کند و جایگزین تفکیک نواحی موضعی بام و نما نیست.</p>' +
      '<p><b>محدودیت این مرحله:</b> نتایج این دفتر فقط گزارش و ذخیره می‌شوند؛ هنوز به اعضای مدل سه‌بعدی منتقل نمی‌شوند و دیوارهای انتهایی نیز در بارگذاری مدل لحاظ نشده‌اند.</p>';
    anchor.insertAdjacentElement("afterend",panel);
    Object.keys({
      windCoeffIw:1,windCoeffCe:1,windCoeffCt:1,windCoeffCg:1,
      windCoeffCp:1,windCoeffCd:1,windCoeffCgi:1,windCoeffCpi:1
    }).forEach(id=>{
      const el=$(id);
      if(el) el.addEventListener("input",updateSummary);
    });
    panel.querySelectorAll(".wind-zone-cp").forEach(el=>el.addEventListener("input",updateSummary));
    const savedZones=restoredMeta&&restoredMeta.windZones;
    if(savedZones)Object.keys(savedZones).forEach(key=>{
      const el=panel.querySelector('.wind-zone-cp[data-zone="'+key+'"]');
      if(el)el.value=savedZones[key];
    });
    updateSummary();
  }
  function updateSummary() {
    const el=$("climateLoadCaseSummary"); 
    if(el) {
      const d=getData(), ready=d.cases.filter(x=>x.value!==null).length;
      el.textContent="حالت‌های دارای مقدار: "+ready+" از "+d.cases.length+" | موارد دارای تأیید آیین‌نامه‌ای: صفر | جهت باد: "+(d.windDirection==="left-to-right"?"چپ به راست":d.windDirection==="right-to-left"?"راست به چپ":"تعیین‌نشده");
    }
    updateWindPressureResult();
    updateWindZones();
  }
  function setData(data) {
    restoredMeta=data&&typeof data==="object"?{
      status:data.status||"",generatedAt:data.generatedAt||"",
      windCalculation:data.windCalculation||null,
      windZones:data.windCalculation&&data.windCalculation.zones?data.windCalculation.zones:null
    }:null;
    if (document.readyState !== "loading") {
      const coeff=restoredMeta&&restoredMeta.windCalculation&&restoredMeta.windCalculation.coefficients;
      if(coeff) Object.keys(coeff).forEach(key=>{
        const map={importance:"windCoeffIw",exposure:"windCoeffCe",topography:"windCoeffCt",gust:"windCoeffCg",externalPressure:"windCoeffCp",directionality:"windCoeffCd",internalGust:"windCoeffCgi",internalPressure:"windCoeffCpi"};
        if($(map[key])) $(map[key]).value=coeff[key];
      });
      const zones=restoredMeta&&restoredMeta.windZones;
      if(zones)Object.keys(zones).forEach(key=>{
        const el=document.querySelector('.wind-zone-cp[data-zone="'+key+'"]');
        if(el)el.value=zones[key];
      });
    }
    updateSummary();
  }
  window.SteelClimateLoadEngine={getData,setData,getRoofSideCases,calculateWindZones,updateSummary};
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    document.addEventListener("input",e=>{if(e.target&&e.target.closest("#advancedLoadPanel"))updateSummary();});
  });
})();