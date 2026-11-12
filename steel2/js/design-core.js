/* SAHROUD STEEL — Independent Engineering Design Core
 * Project brief, input normalization and readiness gates.
 * This module does not generate code loads or certify structural safety.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const SCHEMA_VERSION = 1;
  const OPTIONS = {
    occupancy:["industrial","commercial","agricultural","workshop","storage","other"],
    enclosure:["enclosed","partially-enclosed","open","undetermined"],
    doorState:["closed","normally-open","intermittent-open","permanently-open","unknown"],
    system:["auto-compare","rigid-portal","truss","braced-frame","hybrid","other"],
    tri:["no","yes","unknown"],
    exposure:["normal","corrosive","marine","chemical","high-humidity","unknown"],
    fire:["not-required","to-be-determined","required"]
  };
  const DEFAULTS = Object.freeze({
    schemaVersion:SCHEMA_VERSION, occupancy:"industrial", occupancyDescription:"",
    enclosure:"enclosed", doorState:"closed", structuralSystem:"auto-compare",
    crane:"no", craneCapacityKN:"", craneWheelLoadKN:"", mezzanine:"no",
    futureExpansion:"no", exposure:"normal", fireRequirement:"to-be-determined",
    codeEdition:"مقررات ملی ساختمان ایران؛ ویرایش و سال باید برای پروژه تثبیت شود",
    windDataVerified:false, snowDataVerified:false, geotechnicalReport:"unknown",
    allowableSoilPressureKPa:"", designNotes:""
  });
  let data=Object.assign({},DEFAULTS);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const valid=(v,list,fallback)=>list.includes(v)?v:fallback;

  function panelHTML(){
    return [
      '<section class="panel" id="engineeringBriefPanel">',
      '<div class="panel-title"><h3>۳ ـ مبانی طراحی و نیازهای بهره‌برداری</h3><span class="status">هسته طراحی مهندسی</span></div>',
      '<div class="notice">این بخش مشخصات واقعی پروژه را از فرضیات تحلیل جدا می‌کند. سوله بسته حالت پیش‌فرض است؛ طبقه‌بندی باد و فشار داخلی باید با مساحت و آرایش واقعی بازشوها کنترل شود.</div>',
      '<h4>کاربری، پوسته و سیستم باربر</h4><div class="form-grid">',
      '<div class="field"><label for="designOccupancy">کاربری اصلی</label><select id="designOccupancy"><option value="industrial">صنعتی</option><option value="commercial">تجاری</option><option value="agricultural">کشاورزی</option><option value="workshop">کارگاهی</option><option value="storage">انبار</option><option value="other">سایر</option></select></div>',
      '<div class="field"><label for="designOccupancyDescription">شرح فعالیت و تجهیزات</label><input id="designOccupancyDescription" type="text" placeholder="مثلاً تولید، انبار، تعمیرگاه..." /></div>',
      '<div class="field"><label for="designEnclosure">طبقه‌بندی اولیه پوسته</label><select id="designEnclosure"><option value="enclosed">بسته</option><option value="partially-enclosed">نیمه‌بسته</option><option value="open">باز</option><option value="undetermined">هنوز تعیین نشده</option></select></div>',
      '<div class="field"><label for="designDoorState">وضعیت معمول درها هنگام باد طراحی</label><select id="designDoorState"><option value="closed">بسته (پیش‌فرض)</option><option value="normally-open">معمولاً باز</option><option value="intermittent-open">بازشدن متناوب</option><option value="permanently-open">دائماً باز</option><option value="unknown">نامشخص</option></select></div>',
      '<div class="field"><label for="designStructuralSystem">سیستم سازه‌ای مورد بررسی</label><select id="designStructuralSystem"><option value="auto-compare">مقایسه و انتخاب گزینه‌ها</option><option value="rigid-portal">قاب خمشی پرتال</option><option value="truss">خرپایی</option><option value="braced-frame">قاب مهاربندی‌شده</option><option value="hybrid">سیستم ترکیبی</option><option value="other">سایر</option></select></div>',
      '<div class="field"><label for="designExposure">شرایط محیطی و خوردگی</label><select id="designExposure"><option value="normal">عادی</option><option value="corrosive">خورنده صنعتی</option><option value="marine">ساحلی / نمکی</option><option value="chemical">مجاورت مواد شیمیایی</option><option value="high-humidity">رطوبت زیاد</option><option value="unknown">نامشخص</option></select></div></div>',
      '<h4>تجهیزات و توسعه آتی</h4><div class="form-grid">',
      '<div class="field"><label for="designCrane">جرثقیل سقفی</label><select id="designCrane"><option value="no">ندارد</option><option value="yes">دارد</option><option value="unknown">هنوز مشخص نیست</option></select></div>',
      '<div class="field"><label for="designCraneCapacity">ظرفیت نامی جرثقیل (kN)</label><input id="designCraneCapacity" type="number" min="0" step="1" placeholder="در صورت وجود" /></div>',
      '<div class="field"><label for="designCraneWheelLoad">بار چرخ بحرانی سازنده (kN)</label><input id="designCraneWheelLoad" type="number" min="0" step="0.1" placeholder="از کاتالوگ جرثقیل" /></div>',
      '<div class="field"><label for="designMezzanine">نیم‌طبقه / سکوی داخلی</label><select id="designMezzanine"><option value="no">ندارد</option><option value="yes">دارد</option><option value="unknown">نامشخص</option></select></div>',
      '<div class="field"><label for="designExpansion">امکان توسعه</label><select id="designExpansion"><option value="no">در نظر گرفته نشده</option><option value="yes">باید پیش‌بینی شود</option><option value="unknown">نامشخص</option></select></div>',
      '<div class="field"><label for="designFire">الزامات مقاومت حریق</label><select id="designFire"><option value="to-be-determined">نیازمند تعیین</option><option value="not-required">طبق ضوابط پروژه لازم نیست</option><option value="required">الزام دارد</option></select></div></div>',
      '<h4>مبنای طراحی و ژئوتکنیک</h4><div class="form-grid">',
      '<div class="field"><label for="designCodeEdition">مبنای آیین‌نامه‌ای و ویرایش</label><input id="designCodeEdition" type="text" /></div>',
      '<div class="field"><label for="designGeotech">وضعیت گزارش ژئوتکنیک</label><select id="designGeotech"><option value="unknown">گزارش موجود نیست / نامشخص</option><option value="available">گزارش معتبر موجود است</option><option value="pending">در دست تهیه</option></select></div>',
      '<div class="field"><label for="designSoilPressure">ظرفیت مجاز باربری خاک (kPa)</label><input id="designSoilPressure" type="number" min="0" step="1" placeholder="فقط از گزارش ژئوتکنیک" /></div></div>',
      '<div class="form-grid"><label><input id="designWindVerified" type="checkbox" /> داده باد محل از منبع معتبر تأیید شده است</label><label><input id="designSnowVerified" type="checkbox" /> داده برف محل از منبع معتبر تأیید شده است</label></div>',
      '<div class="field"><label for="designNotes">ملاحظات خاص پروژه</label><textarea id="designNotes" rows="3" placeholder="محدودیت ساخت، حمل، ارتفاع، پوشش، توسعه و ..."></textarea></div>',
      '<div class="notice" id="designReadiness" aria-live="polite">در حال ارزیابی مبانی طراحی...</div></section>'
    ].join("");
  }
  function readForm(){
    const map={occupancy:"designOccupancy",occupancyDescription:"designOccupancyDescription",enclosure:"designEnclosure",doorState:"designDoorState",structuralSystem:"designStructuralSystem",crane:"designCrane",craneCapacityKN:"designCraneCapacity",craneWheelLoadKN:"designCraneWheelLoad",mezzanine:"designMezzanine",futureExpansion:"designExpansion",exposure:"designExposure",fireRequirement:"designFire",codeEdition:"designCodeEdition",allowableSoilPressureKPa:"designSoilPressure",designNotes:"designNotes"};
    Object.keys(map).forEach(k=>{const el=$(map[k]);if(el)data[k]=el.value;});
    data.windDataVerified=!!$("designWindVerified")?.checked;
    data.snowDataVerified=!!$("designSnowVerified")?.checked;
    data.geotechnicalReport=$("designGeotech")?.value||"unknown";
    return clone(data);
  }
  function getReadiness(){
    const d=readForm(), blockers=[];
    if(d.occupancy==="other"&&!d.occupancyDescription.trim())blockers.push("شرح کاربری سفارشی ثبت نشده است.");
    if(d.enclosure==="undetermined")blockers.push("طبقه‌بندی پوسته تعیین نشده است.");
    if(d.doorState==="unknown")blockers.push("سناریوی باز و بسته بودن درها تعیین نشده است.");
    if(d.crane==="yes"&&(!(Number(d.craneCapacityKN)>0)||!(Number(d.craneWheelLoadKN)>0)))blockers.push("ظرفیت و بار چرخ جرثقیل از سازنده دریافت نشده است.");
    if(d.crane==="unknown")blockers.push("وجود یا عدم وجود جرثقیل مشخص نیست.");
    if(d.mezzanine==="unknown")blockers.push("وضعیت نیم‌طبقه مشخص نیست.");
    if(d.exposure==="unknown")blockers.push("شرایط خوردگی محیط مشخص نیست.");
    if(!d.windDataVerified)blockers.push("داده باد محل تأیید نشده است.");
    if(!d.snowDataVerified)blockers.push("داده برف محل تأیید نشده است.");
    if(d.geotechnicalReport!=="available"||!(Number(d.allowableSoilPressureKPa)>0))blockers.push("گزارش ژئوتکنیک و ظرفیت باربری خاک لازم است.");
    if(d.fireRequirement==="to-be-determined")blockers.push("الزامات حریق باید تعیین شود.");
    return {ready:blockers.length===0,blockers,schemaVersion:SCHEMA_VERSION};
  }
  function update(){
    const out=$("designReadiness");if(!out)return;
    const d=readForm(),r=getReadiness();
    const warning=d.doorState==="closed"&&d.enclosure!=="enclosed"?"توجه: بسته بودن درها به‌تنهایی طبقه‌بندی پوسته بسته را اثبات نمی‌کند. ":"";
    out.textContent=warning+(r.ready?"مبانی ورودی ثبت شده‌اند؛ کنترل آیین‌نامه‌ای و تحلیل همچنان لازم است.":"موارد باز: "+r.blockers.join(" | "));
    out.dataset.ready=String(r.ready);
  }
  function renderValues(){
    const d=data,map={designOccupancy:d.occupancy,designOccupancyDescription:d.occupancyDescription,designEnclosure:d.enclosure,designDoorState:d.doorState,designStructuralSystem:d.structuralSystem,designCrane:d.crane,designCraneCapacity:d.craneCapacityKN,designCraneWheelLoad:d.craneWheelLoadKN,designMezzanine:d.mezzanine,designExpansion:d.futureExpansion,designExposure:d.exposure,designFire:d.fireRequirement,designCodeEdition:d.codeEdition,designSoilPressure:d.allowableSoilPressureKPa,designNotes:d.designNotes};
    Object.entries(map).forEach(([id,v])=>{if($(id))$(id).value=v??"";});
    if($("designWindVerified"))$("designWindVerified").checked=!!d.windDataVerified;
    if($("designSnowVerified"))$("designSnowVerified").checked=!!d.snowDataVerified;
    if($("designGeotech"))$("designGeotech").value=d.geotechnicalReport||"unknown";
    update();
  }
  function render(){
    if($("engineeringBriefPanel"))return;
    const anchor=$("span")?.closest(".panel");
    if(anchor)anchor.insertAdjacentHTML("afterend",panelHTML());else document.querySelector("main")?.insertAdjacentHTML("beforeend",panelHTML());
    renderValues();
    $("engineeringBriefPanel")?.addEventListener("input",update);
    $("engineeringBriefPanel")?.addEventListener("change",update);
  }
  function setData(saved){
    if(!saved||typeof saved!=="object")return;
    const source=saved.designBrief&&typeof saved.designBrief==="object"?saved.designBrief:saved;
    data=Object.assign({},DEFAULTS,source,{schemaVersion:SCHEMA_VERSION});
    data.occupancy=valid(data.occupancy,OPTIONS.occupancy,DEFAULTS.occupancy);
    data.enclosure=valid(data.enclosure,OPTIONS.enclosure,DEFAULTS.enclosure);
    data.doorState=valid(data.doorState,OPTIONS.doorState,DEFAULTS.doorState);
    data.structuralSystem=valid(data.structuralSystem,OPTIONS.system,DEFAULTS.structuralSystem);
    data.crane=valid(data.crane,OPTIONS.tri,DEFAULTS.crane);
    data.mezzanine=valid(data.mezzanine,OPTIONS.tri,DEFAULTS.mezzanine);
    data.futureExpansion=valid(data.futureExpansion,OPTIONS.tri,DEFAULTS.futureExpansion);
    data.exposure=valid(data.exposure,OPTIONS.exposure,DEFAULTS.exposure);
    data.fireRequirement=valid(data.fireRequirement,OPTIONS.fire,DEFAULTS.fireRequirement);
    if($("engineeringBriefPanel"))renderValues();
  }
  function validate(){
    const d=readForm();
    if(d.crane==="yes"&&(!(Number(d.craneCapacityKN)>0)||!(Number(d.craneWheelLoadKN)>0)))return "برای جرثقیل، ظرفیت نامی و بار چرخ بحرانی لازم است.";
    if(d.allowableSoilPressureKPa!==""&&!(Number(d.allowableSoilPressureKPa)>0))return "ظرفیت باربری خاک نامعتبر است.";
    return "";
  }
  document.addEventListener("DOMContentLoaded",render);
  window.SteelDesignCore={getData:readForm,setData,getReadiness,validate,update,schemaVersion:SCHEMA_VERSION};
})();