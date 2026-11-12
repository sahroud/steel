/* SAHROUD STEEL — Wind Basis Engine 1.0
 * Geometry-based opening inventory and scenario audit.
 * Computes geometric areas and basic velocity pressure only.
 * Does NOT classify enclosure, select Cpi/Cp, generate design wind loads,
 * or transfer pressures to the structural model.
 */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const SIDES=["front","rear","left","right"];
  const LABELS={front:"دیوار انتهایی جلو",rear:"دیوار انتهایی عقب",left:"دیوار طولی چپ",right:"دیوار طولی راست"};
  let restored={};

  function num(id){
    const el=$(id); if(!el||el.value==="")return null;
    const n=Number(el.value); return Number.isFinite(n)?n:null;
  }
  function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
  function getScenario(){
    const o=window.SteelOpenings?.getData?.()||{};
    return ["closed","front-open","custom"].includes(o.windScenario)?o.windScenario:"closed";
  }
  function geometry(){
    const span=num("span"),length=num("length"),eave=num("height"),rise=num("rise");
    const valid=[span,length,eave,rise].every(v=>v!==null&&v>0);
    const gross={front:null,rear:null,left:null,right:null};
    if(valid){
      gross.front=gross.rear=span*eave+0.5*span*rise;
      gross.left=gross.right=length*eave;
    }
    const openings=window.SteelOpenings?.getData?.()||{};
    const physical={};
    SIDES.forEach(side=>{
      const x=openings[side]||{};
      physical[side]=x.enabled&&n(x.width)>0&&n(x.height)>0?n(x.width)*n(x.height):0;
    });
    return {valid,span,length,eave,rise,gross,physical};
  }
  function readAreas(){
    const result={};
    SIDES.forEach(side=>result[side]=num("windOpenArea_"+side));
    return result;
  }
  function effectiveAreas(){
    const g=geometry(),scenario=getScenario(),manual=readAreas(),effective={};
    SIDES.forEach(side=>{
      if(scenario==="closed")effective[side]=0;
      else if(scenario==="front-open")effective[side]=side==="front"?g.physical.front:0;
      else effective[side]=manual[side];
    });
    return {scenario,manual,effective};
  }
  function audit(){
    const g=geometry(),a=effectiveAreas(),errors=[],rows={};
    if(!g.valid)errors.push("ابعاد دهانه، طول، ارتفاع ستون و خیز بام باید معتبر باشند.");
    if(a.scenario==="front-open"&&g.physical.front<=0)errors.push("سناریوی درِ جلو باز انتخاب شده، اما بازشوی جلویی فعال و دارای ابعاد معتبر نیست.");
    SIDES.forEach(side=>{
      const open=a.effective[side],gross=g.gross[side],physical=g.physical[side];
      if(a.scenario==="custom"&&open===null)errors.push("مساحت بازشوی باز در "+LABELS[side]+" مشخص نشده است.");
      if(open!==null&&open<0)errors.push("مساحت بازشوی "+LABELS[side]+" منفی است.");
      if(open!==null&&open>physical+1e-8)errors.push("مساحت بازشوی باز در "+LABELS[side]+" از مجموع مساحت بازشوهای تعریف‌شده بیشتر است.");
      if(open!==null&&gross!==null&&open>gross+1e-8)errors.push("مساحت بازشوی "+LABELS[side]+" از مساحت ناخالص دیوار بیشتر است.");
      rows[side]={grossWallArea:gross,physicalOpeningArea:physical,openArea:open,
        openToGrossRatio:open!==null&&gross>0?open/gross:null};
    });
    const loads=window.SteelLoads?.getData?.()||{},climate=loads.climate||{};
    const wind=n(climate.basicWind);
    const q=wind!==null&&wind>=0?0.000613*Math.pow(wind/3.6,2):null;
    const brief=window.SteelDesignCore?.getData?.()||{};
    const classification=brief.enclosure||climate.openingState||"undetermined";
    if(a.scenario==="closed"&&classification!=="enclosed")
      errors.push("سناریوی درهای بسته با طبقه‌بندی پوسته انتخاب‌شده یکسان نیست؛ این دو را آگاهانه بازبینی کنید.");
    if(a.scenario!=="closed"&&classification==="enclosed")
      errors.push("سناریوی بازشو باز است ولی پوسته «بسته» انتخاب شده؛ طبقه‌بندی باید توسط مهندس بازبینی شود.");
    return {schema:"sahroud-steel-wind-basis",version:1,scenario:a.scenario,
      geometry:{span:g.span,length:g.length,eaveHeight:g.eave,ridgeRise:g.rise},
      faces:rows,windSpeed:wind,windSpeedUnit:"km/h",basicVelocityPressure:q,
      pressureUnit:"kN/m2",enclosureClassification:classification,
      classificationStatus:"not-automatically-classified",
      codeDesignEligible:false,errors,geometryReady:g.valid,
      status:errors.length?"input-review-required":"geometry-inventory-ready-only",
      limitations:["مساحت دیوارها با تقریب مستطیل به‌علاوه مثلث زیر تاج محاسبه شده است؛ بازشوها و شکل واقعی نما باید کنترل شوند.",
       "نسبت بازشو فقط گزارش هندسی است و معیار طبقه‌بندی آیین‌نامه‌ای نیست.",
       "Cpi، Cp، ضرایب ارتفاع/زبری/توپوگرافی و ترکیبات باد هنوز محاسبه نشده‌اند.",
       "هیچ فشاری به مدل سه‌بعدی اعمال نمی‌شود."]};
  }
  function render(){
    if($("windBasisPanel"))return;
    const panel=document.createElement("section");
    panel.id="windBasisPanel";panel.className="panel";
    panel.innerHTML=[
      '<div class="panel-title"><h3>۶ ـ دفتر هندسی باد و بازشوها</h3><span class="status">مرحله مقدماتی</span></div>',
      '<div class="notice">این مرحله مساحت پوسته و بازشوهای باز در سناریوی باد را محاسبه و کنترل می‌کند. نسبت‌ها صرفاً هندسی‌اند؛ نرم‌افزار هنوز طبقه‌بندی آیین‌نامه‌ای پوسته یا ضریب فشار داخلی را حدس نمی‌زند.</div>',
      '<div class="form-grid">',
      '<div class="field"><label>سناریوی فعال بازشوها</label><output id="windBasisScenario">—</output></div>',
      '<div class="field"><label>فشار مبنای سرعت باد q (kN/m²)</label><output id="windBasisQ">—</output></div></div>',
      '<p class="hint">در سناریوی سفارشی، مساحت مؤثر بازشوهایی را وارد کنید که واقعاً در وضعیت باد طراحی باز خواهند بود. این مقدار نباید از مساحت فیزیکی بازشوهای تعریف‌شده بیشتر باشد.</p>',
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>نما</th><th>مساحت بازشوی باز در باد (m²)</th><th>مساحت ناخالص نما (m²)</th><th>نسبت بازشو به نما</th></tr></thead><tbody>',
      ...SIDES.map(side=>'<tr><td>'+LABELS[side]+'</td><td><input id="windOpenArea_'+side+'" type="number" min="0" step="0.1" placeholder="فقط سناریوی سفارشی"></td><td id="windGross_'+side+'">—</td><td id="windRatio_'+side+'">—</td></tr>'),
      '</tbody></table></div>',
      '<div class="notice" id="windBasisStatus" aria-live="polite">در حال بررسی هندسه...</div>',
      '<div class="notice"><b>مرز اعتبار:</b> حتی با تکمیل این جدول، فشار طراحی باد تولید نمی‌شود. برای آن باید ضوابط طبقه‌بندی پوسته، بازشوی غالب، ضرایب خارجی و داخلی، نواحی موضعی، جهت‌های باد و ترکیبات بار جداگانه پیاده‌سازی و آزمون شوند.</div>'
    ].join("");
    const anchor=$("openingPanel")||$("engineeringBriefPanel")||$("climateLoadCasePanel");
    if(anchor)anchor.insertAdjacentElement("afterend",panel);
    else document.querySelector("main")?.appendChild(panel);
    SIDES.forEach(side=>{
      $("windOpenArea_"+side)?.addEventListener("input",update);
    });
    update();
  }
  function update(){
    const beforeScenario=getScenario();
    if(beforeScenario==="custom")restored=readAreas();
    const result=audit(),g=geometry(),a=effectiveAreas();
    const scenarioNames={closed:"تمام بازشوهای قابل‌بستن بسته", "front-open":"درِ اصلی جلو باز",custom:"سناریوی سفارشی"};
    if($("windBasisScenario"))$("windBasisScenario").textContent=scenarioNames[a.scenario];
    if($("windBasisQ"))$("windBasisQ").textContent=result.basicVelocityPressure===null?"—":result.basicVelocityPressure.toFixed(3);
    SIDES.forEach(side=>{
      const open=result.faces[side].openArea,gross=result.faces[side].grossWallArea,ratio=result.faces[side].openToGrossRatio;
      if($("windGross_"+side))$("windGross_"+side).textContent=gross===null?"—":gross.toFixed(2);
      if($("windRatio_"+side))$("windRatio_"+side).textContent=ratio===null?"—":(100*ratio).toFixed(2)+"%";
      const el=$("windOpenArea_"+side);
      if(el){
        el.disabled=a.scenario!=="custom";
        if(a.scenario==="closed")el.value="0";
        else if(a.scenario==="front-open")el.value=side==="front"?String(g.physical.front):"0";
        else if(restored[side]!==undefined&&el.value==="")el.value=restored[side];
      }
    });
    const status=$("windBasisStatus");
    if(status){
      status.textContent=(result.errors.length?"نیازمند اصلاح: "+result.errors.join(" "):
       "کنترل هندسی اولیه انجام شد. نسبت‌ها فقط گزارش هندسی‌اند و طبقه‌بندی پوسته یا فشار طراحی باد محسوب نمی‌شوند.")
       +" وضعیت: "+result.status+" | واجد محاسبه طراحی آیین‌نامه‌ای: خیر";
    }
  }
  function getData(){
    const r=audit();r.customOpenAreas=readAreas();return r;
  }
  function setData(saved){
    if(!saved||typeof saved!=="object")return;
    restored=saved.customOpenAreas&&typeof saved.customOpenAreas==="object"?saved.customOpenAreas:{};
    if(document.readyState!=="loading"&&$("windBasisPanel")){
      SIDES.forEach(side=>{const el=$("windOpenArea_"+side);if(el&&restored[side]!==undefined)el.value=restored[side];});
      update();
    }
  }
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    document.addEventListener("input",e=>{
      if(e.target&&["span","length","height","rise","openingFrontWidth","openingFrontHeight","openingFrontEnabled","openingRearWidth","openingRearHeight","openingRearEnabled","openingLeftWidth","openingLeftHeight","openingLeftEnabled","openingRightWidth","openingRightHeight","openingRightEnabled"].includes(e.target.id))update();
    });
    document.addEventListener("change",e=>{
      if(e.target&&e.target.id==="windOpeningScenario")update();
      if(e.target&&e.target.closest("#openingPanel"))update();
    });
  });
  window.SteelWindBasis={getData,setData,audit,update};
})();