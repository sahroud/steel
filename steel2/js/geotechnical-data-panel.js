/* SAHROUD STEEL — geotechnical report data capture and controlled transfer */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const fields=["reportReference","reportDate","reviewStatus","soilClass","allowableBearingKPa","allowableBasis","foundationEmbedmentM","groundwaterDepthM","soilUnitWeightKNm3","frictionAngleDeg","cohesionKPa","interfaceFrictionMu","soilModulusMPa","totalSettlementLimitMm","differentialSettlementLimitMm","notes"];
 const ids={reportReference:"geoReportRef",reportDate:"geoReportDate",reviewStatus:"geoReviewStatus",soilClass:"geoSoilClass",allowableBearingKPa:"geoAllowable",allowableBasis:"geoAllowableBasis",foundationEmbedmentM:"geoEmbedment",groundwaterDepthM:"geoGroundwater",soilUnitWeightKNm3:"geoUnitWeight",frictionAngleDeg:"geoPhi",cohesionKPa:"geoCohesion",interfaceFrictionMu:"geoMu",soilModulusMPa:"geoModulus",totalSettlementLimitMm:"geoTotalSettlement",differentialSettlementLimitMm:"geoDiffSettlement",notes:"geoNotes"};
 const defaults={reportReference:"",reportDate:"",reviewStatus:"not-reviewed",soilClass:"",allowableBearingKPa:"",allowableBasis:"unknown",foundationEmbedmentM:"",groundwaterDepthM:"",soilUnitWeightKNm3:"",frictionAngleDeg:"",cohesionKPa:"",interfaceFrictionMu:"",soilModulusMPa:"",totalSettlementLimitMm:"",differentialSettlementLimitMm:"",notes:""};
 let state={...defaults};
 function read(){fields.forEach(k=>{const el=$(ids[k]);if(el)state[k]=el.value;});}
 function persist(){try{localStorage.setItem("sahroudSteel.geotechnicalData.v1",JSON.stringify(state));}catch(e){}}
 function panel(){
  if($("geotechnicalDataPanel"))return;
  try{const x=JSON.parse(localStorage.getItem("sahroudSteel.geotechnicalData.v1")||"null");if(x&&typeof x==="object")state={...state,...x};}catch(e){}
  const root=$("foundationTakeoffPanel")||$("costEstimatePanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="geotechnicalDataPanel";
  p.innerHTML='<div class="panel-title"><h3>پرونده ژئوتکنیک و مشخصات خاک</h3><span class="status">ورودی از گزارش خاک</span></div>'+
   '<div class="notice">هیچ مقدار ژئوتکنیکی پیش‌فرض نشده است. اعداد باید عیناً از گزارش مکانیک خاک و با توجه به تراز پی، سطح آب، نوع بارگذاری و شرایط اجرایی وارد شوند. ظرفیت باربری ناخالص و خالص قابل جایگزینی مستقیم نیستند؛ مقدار خالص به‌صورت خودکار به ناخالص تبدیل نمی‌شود.</div>'+
   '<h4>مشخصات و اعتبار گزارش</h4><div class="form-grid">'+
   '<div class="field"><label for="geoReportRef">شماره / مرجع گزارش</label><input id="geoReportRef" type="text" placeholder="شماره گزارش یا نام آزمایشگاه"></div>'+
   '<div class="field"><label for="geoReportDate">تاریخ گزارش</label><input id="geoReportDate" type="date"></div>'+
   '<div class="field"><label for="geoReviewStatus">وضعیت بررسی گزارش</label><select id="geoReviewStatus"><option value="not-reviewed">بررسی مهندس نشده</option><option value="reviewed">توسط مهندس مسئول بررسی شده</option><option value="missing">گزارش در دسترس نیست</option></select></div>'+
   '<div class="field"><label for="geoSoilClass">شرح لایه خاک در تراز پی</label><input id="geoSoilClass" type="text" placeholder="طبق گزارش ژئوتکنیک"></div></div>'+
   '<h4>ظرفیت باربری و شرایط خاک</h4><div class="form-grid">'+
   '<div class="field"><label for="geoAllowable">ظرفیت باربری مجاز (kPa)</label><input id="geoAllowable" type="number" min="0" step="1" placeholder="از گزارش"></div>'+
   '<div class="field"><label for="geoAllowableBasis">مبنای ظرفیت باربری</label><select id="geoAllowableBasis"><option value="unknown">نامشخص</option><option value="gross">ناخالص (Gross)</option><option value="net">خالص (Net)</option></select></div>'+
   '<div class="field"><label for="geoEmbedment">عمق استقرار زیر پی از سطح زمین (m)</label><input id="geoEmbedment" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="geoGroundwater">عمق سطح آب زیرزمینی از سطح زمین (m)</label><input id="geoGroundwater" type="number" min="0" step="0.1" placeholder="اگر وجود ندارد، طبق گزارش مشخص شود"></div>'+
   '<div class="field"><label for="geoUnitWeight">وزن مخصوص خاک (kN/m³)</label><input id="geoUnitWeight" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="geoPhi">زاویه اصطکاک داخلی φ (درجه)</label><input id="geoPhi" type="number" min="0" max="60" step="0.5"></div>'+
   '<div class="field"><label for="geoCohesion">چسبندگی خاک c (kPa)</label><input id="geoCohesion" type="number" min="0" step="1"></div>'+
   '<div class="field"><label for="geoMu">ضریب اصطکاک تماس بتن و خاک μ</label><input id="geoMu" type="number" min="0" step="0.01" placeholder="مقدار تماس گزارش‌شده؛ نه tan φ خودکار"></div>'+
   '<div class="field"><label for="geoModulus">مدول تغییرشکل / الاستیسیته خاک (MPa)</label><input id="geoModulus" type="number" min="0" step="0.1"></div></div>'+
   '<h4>معیارهای نشست</h4><div class="form-grid">'+
   '<div class="field"><label for="geoTotalSettlement">حد مجاز نشست کل (mm)</label><input id="geoTotalSettlement" type="number" min="0" step="1"></div>'+
   '<div class="field"><label for="geoDiffSettlement">حد مجاز نشست نسبی / تفاضلی (mm)</label><input id="geoDiffSettlement" type="number" min="0" step="1"></div>'+
   '<div class="field" style="grid-column:1/-1"><label for="geoNotes">یادداشت‌ها و شرایط خاص گزارش</label><textarea id="geoNotes" rows="3" placeholder="لایه‌بندی، خاک دستی، خطر روانگرایی، توصیه‌های اجرایی و..."></textarea></div></div>'+
   '<div class="button-grid"><button id="btnGeoSave" class="btn primary" type="button">ذخیره پرونده ژئوتکنیک</button><button id="btnGeoTransfer" class="btn secondary" type="button">انتقال داده‌های قابل استفاده به محاسبات پی</button></div>'+
   '<div id="geoSummary" class="notice">پرونده ژئوتکنیک هنوز تکمیل نشده است.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  fields.forEach(k=>{const el=$(ids[k]);el.value=state[k]??"";el.addEventListener("change",()=>{read();persist();});});
  $("btnGeoSave").addEventListener("click",()=>{read();persist();renderSummary();});
  $("btnGeoTransfer").addEventListener("click",transfer);
  renderSummary();
 }
 function renderSummary(){
  const el=$("geoSummary");if(!el)return;
  read();
  const issues=[];
  if(!String(state.reportReference||"").trim())issues.push("مرجع گزارش ثبت نشده");
  if(state.reviewStatus!=="reviewed")issues.push("گزارش هنوز بررسی‌شده علامت نخورده");
  if(!(Number(state.allowableBearingKPa)>0))issues.push("ظرفیت باربری معتبر وارد نشده");
  if(state.allowableBasis!=="gross"&&state.allowableBearingKPa!=="")issues.push("مبنای ظرفیت ناخالص نیست یا نامشخص است");
  if(state.groundwaterDepthM==="")issues.push("وضعیت عمق آب زیرزمینی ثبت نشده");
  el.textContent="وضعیت پرونده: "+(issues.length?"نیازمند تکمیل/بررسی — "+issues.join("؛ "):"اطلاعات پایه ثبت شده است؛ صحت اعداد همچنان وابسته به گزارش اصلی است.")+".";
 }
 function transfer(){
  read();persist();
  const current=window.SteelFoundationTakeoff?.getData?.();
  if(!current){$("geoSummary").textContent="ماژول فونداسیون در دسترس نیست؛ صفحه را دوباره بارگذاری کنید.";return;}
  const next={...current},transferred=[],blocked=[];
  const qa=Number(state.allowableBearingKPa),gamma=Number(state.soilUnitWeightKNm3),mu=Number(state.interfaceFrictionMu);
  if(qa>0&&state.allowableBasis==="gross"){next.soilAllowableKPa=String(qa);transferred.push("ظرفیت باربری ناخالص");}
  else if(state.allowableBearingKPa!=="")blocked.push("ظرفیت باربری خالص/نامشخص منتقل نشد");
  if(gamma>0){next.soilUnitWeightKNm3=String(gamma);transferred.push("وزن مخصوص خاک (برای خاک پوششی، در صورت تطابق نوع خاک)");}
  if(mu>0){next.slidingFrictionMu=String(mu);transferred.push("ضریب اصطکاک تماس");}
  window.SteelFoundationTakeoff.setData(next);
  window.SteelFoundationTakeoff.quantify?.();
  const review=state.reviewStatus==="reviewed"?"وضعیت گزارش: بررسی‌شده توسط کاربر علامت خورده":"هشدار: گزارش هنوز بررسی‌شده علامت نخورده است";
  $("geoSummary").textContent=review+" | منتقل شد: "+(transferred.join("، ")||"هیچ داده‌ای")+(blocked.length?" | منتقل نشد: "+blocked.join("، "):"")+". تاریخ/عمق استقرار/نشست/پارامترهای مقاومت هنوز در کنترل‌های طراحی استفاده نشده‌اند.";
 }
 function getData(){read();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;state={...defaults,...d};persist();fields.forEach(k=>{const el=$(ids[k]);if(el)el.value=state[k]??"";});renderSummary();}
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelGeotechnicalData={getData,setData,transfer};
})();