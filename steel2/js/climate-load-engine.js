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
    const required = Object.keys(windCoefficientDefaults);
    const values = {};
    required.forEach(key => values[key] = finite(c[key]));
    const complete = q !== null && required.every(key => values[key] !== null);
    if (!complete) return { q, coefficients:c, complete:false, external:null, internal:null, net:null };
    const common = values.importance * q * values.exposure * values.topography * values.directionality;
    const external = common * values.gust * values.externalPressure;
    const internal = common * values.internalGust * values.internalPressure;
    return { q, coefficients:c, complete:true, external, internal, net:external-internal };
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
      out.textContent = qText + "برای محاسبه فشار خارجی و داخلی، همه ضرایب این بخش باید از متن معتبر مبحث ششم ۱۳۹۸ وارد شوند. هیچ ضریب پیش‌فرض یا حدسی اعمال نمی‌شود.";
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
  const windDirections=Object.freeze([
    {id:"transverse-positive",label:"عرضی +X (باد از چپ به راست)"},
    {id:"transverse-negative",label:"عرضی −X (باد از راست به چپ)"},
    {id:"longitudinal-positive",label:"طولی +Z (باد از جلو به عقب)"},
    {id:"longitudinal-negative",label:"طولی −Z (باد از عقب به جلو)"}
  ]);
  const windZoneRows=[
    ["roof-left","شیب چپ بام"],["roof-right","شیب راست بام"],
    ["long-wall-left","دیوار طولی چپ"],["long-wall-right","دیوار طولی راست"],
    ["end-wall-front","دیوار انتهایی جلو"],["end-wall-back","دیوار انتهایی عقب"]
  ];
  const zoneToken=key=>key.replace(/-/g,"_");
  const zoneResultId=(direction,key,sign)=>"windZone_"+direction+"_"+zoneToken(key)+"_"+sign;
  function readWindZones(direction) {
    const saved=restoredMeta&&restoredMeta.windZonesByDirection?restoredMeta.windZonesByDirection:{};
    const legacy=restoredMeta&&restoredMeta.windZones?restoredMeta.windZones:{};
    const savedForDirection=saved[direction]||{};
    const result={};
    Object.keys(windZoneIds).forEach(key=>{
      const el=document.querySelector('.wind-zone-cp[data-direction="'+direction+'"][data-zone="'+key+'"]');
      const fallback=direction==="transverse-positive"&&legacy[key]!==undefined?legacy[key]:"";
      result[key]=el?el.value:(savedForDirection[key]!==undefined?savedForDirection[key]:fallback);
    });
    return result;
  }
  function calculateWindZones(direction) {
    const selected=direction===undefined?"transverse-positive":
      (windDirections.some(x=>x.id===direction)?direction:null);
    if(!selected)return {q:null,rows:{},zones:{},ready:false,direction:null};
    const loads=window.SteelLoads&&window.SteelLoads.getData?window.SteelLoads.getData():{};
    const climate=loads.climate||{};
    if(!window.SteelLoadTransfer||typeof window.SteelLoadTransfer.calculateWindZonePressures!=="function")
      return {q:null,rows:{},zones:readWindZones(selected),ready:false,direction:selected};
    const zones=readWindZones(selected);
    const result=window.SteelLoadTransfer.calculateWindZonePressures({
      direction:selected,basicWindKmh:climate.basicWind,
      coefficients:readWindCoefficients(),zones
    });
    return {...result,zones,direction:selected};
  }
  function buildWindDirectionTables() {
    return windDirections.map((direction,index)=>{
      const rows=windZoneRows.map(([key,label])=>{
        const plus=zoneResultId(direction.id,key,"plus"),minus=zoneResultId(direction.id,key,"minus");
        return '<tr><td>'+label+'</td><td><input class="wind-zone-cp" data-direction="'+direction.id+'" data-zone="'+key+'" type="number" step="0.01" placeholder="Cp"></td><td id="'+plus+'">—</td><td id="'+minus+'">—</td></tr>';
      }).join("");
      return '<details class="wind-direction-block"'+(index===0?" open":"")+'><summary>'+direction.label+'</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>سطح</th><th>Cp خارجی</th><th>فشار خالص با فشار داخلی مثبت</th><th>فشار خالص با فشار داخلی منفی</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
    }).join("");
  }
  function updateWindZones() {
    let readyCount=0;
    windDirections.forEach(direction=>{
      const r=calculateWindZones(direction.id);
      if(r.ready)readyCount++;
      windZoneRows.forEach(([key])=>{
        const row=r.rows&&r.rows[key];
        const plus=$(zoneResultId(direction.id,key,"plus")),minus=$(zoneResultId(direction.id,key,"minus"));
        if(plus)plus.textContent=row?row.netInternalPositive.toFixed(3)+" kN/m²":"—";
        if(minus)minus.textContent=row?row.netInternalNegative.toFixed(3)+" kN/m²":"—";
      });
    });
    const out=$("windZoneStatus");
    if(out)out.textContent="جهت‌های کامل‌شده: "+readyCount+" از ۴. برای هر جهت باید Cp شش سطح و ضرایب مشترک وارد شود. فشارهای محاسبه‌شده دستی و تأییدنشده‌اند؛ تا تکمیل کنترل‌های آیین‌نامه‌ای، خروجی نهایی طراحی محسوب نمی‌شوند.";
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
        zones:readWindZones("transverse-positive"),
        zonesByDirection:Object.fromEntries(windDirections.map(direction=>[direction.id,readWindZones(direction.id)])),
        zoneResults:calculateWindZones("transverse-positive"),
        zoneResultsByDirection:Object.fromEntries(windDirections.map(direction=>[direction.id,calculateWindZones(direction.id)])),
        status:"manual-directional-six-surface-coefficients-preliminary-unverified",
        formulaExternal:"P = Iw q Ce Ct Cg Cp Cd",
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
      '<p>رابطه فشار خارجی: P = Iw × q × Ce × Ct × Cg × Cp × Cd</p>' +
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
      '<hr><b>دفتر فشار باد ـ چهار جهت مستقل و دو حالت فشار داخلی</b>' +
      '<p>ضرایب Cp را برای هر یک از چهار جهت باد و هر شش سطح جداگانه، با علامت و مستند به مبحث ششم وارد کنید. نرم‌افزار هیچ ضریب آیین‌نامه‌ای را حدس نمی‌زند.</p>' +
      buildWindDirectionTables() +
      '<p id="windZoneStatus" class="notice" aria-live="polite">برای هر جهت، ضرایب مشترک و Cp هر شش سطح باید تکمیل شوند.</p>' +
      '<p><b>محدودیت مهم:</b> این جدول فشار متوسط سطحی است؛ نواحی موضعی لبه/گوشه اجزای پوششی، محاسبه خودکار Ce از زبری و ارتفاع، بازشوی غالب و ضرایب رسمی هنوز جداگانه باید تکمیل شوند. داده ناقص یا جهت تعریف‌نشده مجاز به تحلیل نیست.</p>';
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
    const savedByDirection=restoredMeta&&restoredMeta.windZonesByDirection;
    if(savedByDirection)Object.entries(savedByDirection).forEach(([direction,zones])=>Object.keys(zones||{}).forEach(key=>{
      const el=panel.querySelector('.wind-zone-cp[data-direction="'+direction+'"][data-zone="'+key+'"]');
      if(el)el.value=zones[key];
    }));
    else if(savedZones)Object.keys(savedZones).forEach(key=>{
      const el=panel.querySelector('.wind-zone-cp[data-direction="transverse-positive"][data-zone="'+key+'"]');
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
      windZones:data.windCalculation&&data.windCalculation.zones?data.windCalculation.zones:null,
      windZonesByDirection:data.windCalculation&&data.windCalculation.zonesByDirection?data.windCalculation.zonesByDirection:null
    }:null;
    if (document.readyState !== "loading") {
      const coeff=restoredMeta&&restoredMeta.windCalculation&&restoredMeta.windCalculation.coefficients;
      if(coeff) Object.keys(coeff).forEach(key=>{
        const map={importance:"windCoeffIw",exposure:"windCoeffCe",topography:"windCoeffCt",gust:"windCoeffCg",externalPressure:"windCoeffCp",directionality:"windCoeffCd",internalGust:"windCoeffCgi",internalPressure:"windCoeffCpi"};
        if($(map[key])) $(map[key]).value=coeff[key];
      });
      const zonesByDirection=restoredMeta&&restoredMeta.windZonesByDirection;
      if(zonesByDirection)Object.entries(zonesByDirection).forEach(([direction,zones])=>Object.keys(zones||{}).forEach(key=>{
        const el=document.querySelector('.wind-zone-cp[data-direction="'+direction+'"][data-zone="'+key+'"]');
        if(el)el.value=zones[key];
      }));
      else {
        const zones=restoredMeta&&restoredMeta.windZones;
        if(zones)Object.keys(zones).forEach(key=>{
          const el=document.querySelector('.wind-zone-cp[data-direction="transverse-positive"][data-zone="'+key+'"]');
          if(el)el.value=zones[key];
        });
      }
    }
    updateSummary();
  }
  window.SteelClimateLoadEngine={getData,setData,getRoofSideCases,calculateWindZones,updateSummary};
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    document.addEventListener("input",e=>{if(e.target&&e.target.closest("#advancedLoadPanel"))updateSummary();});
  });
})();