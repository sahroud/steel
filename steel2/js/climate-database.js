/* SAHROUD STEEL - Climate City Database 1.0 */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const cities = [
["shahroud","شاهرود"],["semnan","سمنان"],["tehran","تهران"],["mashhad","مشهد"],["tabriz","تبریز"],["isfahan","اصفهان"],["yazd","یزد"],["rasht","رشت"],["sari","ساری"],["kerman","کرمان"],["arak","اراک"],["ardabil","اردبیل"],["urmia","ارومیه"],["ahvaz","اهواز"],["bandar-abbas","بندرعباس"],["bushehr","بوشهر"],["birjand","بیرجند"],["bojnord","بجنورد"],["hamedan","همدان"],["sanandaj","سنندج"],["kermanshah","کرمانشاه"],["ilam","ایلام"],["khorramabad","خرم‌آباد"],["qazvin","قزوین"],["zanjan","زنجان"],["gorgan","گرگان"],["yasuj","یاسوج"],["shiraz","شیراز"],["zahedan","زاهدان"],["zabol","زابل"],["qom","قم"],["kish","کیش"],["abadan","آبادان"],["dezful","دزفول"],["sabzevar","سبزوار"],["neyshabur","نیشابور"],["damghan","دامغان"],["garmsar","گرمسار"],["torbat-heydariyeh","تربت حیدریه"],["chabahar","چابهار"],["bandar-anzali","بندر انزلی"],["amol","آمل"],["babol","بابل"]
];
let records = {};
cities.forEach(([id,name]) => records[id] = {id,name,groundSnow:null,basicWind:null,basicWindPressure:null,snowRegion:null,elevation:null,seismicZone:null,meanAnnualTemperature:null,designTemperature:null,source:"",sourceTitle:"",sourceClause:"",sourceUrl:"",sourceDate:"",codeEdition:"",verified:false,status:"نیازمند ورود و تطبیق با منبع رسمی"});
function applyShahroudReference(){
 const r=records.shahroud;if(!r)return;
 r.name="شاهرود";r.basicWind=90;r.basicWindPressure=0.383;r.groundSnow=1.0;r.snowRegion=3;
 if(r.elevation===null||r.elevation===undefined)r.elevation=1350;
 r.siteCoordinates=r.siteCoordinates||{latitude:36.37478,longitude:54.88545};
 r.elevationSource=r.elevationSource||"برآورد تقریبی مرکز شهرک صنعتی؛ نیازمند کنترل با DEM یا برداشت نقشه‌برداری";
 r.sourceTitle=r.sourceTitle||"مبحث ششم ۱۳۹۸؛ جدول ۶-۱۰-۱";
 r.sourceClause=r.sourceClause||"جدول ۶-۱۰-۱ و رابطه ۶-۱۰-۲؛ مقدار برف نیازمند تطبیق مستقل";
 r.codeEdition=r.codeEdition||"مبحث ششم ۱۳۹۸";
 r.source="مبحث ششم ۱۳۹۸؛ جدول ۶-۱۰-۱ و رکورد PDF پروژه برای سرعت باد؛ سرعت ۹۰ km/h مطابق جدول ۶-۱۰-۱ ویرایش ۱۳۹۸؛ q≈۰٫۳۸۳ kN/m². ارتفاع ۱۳۵۰ متر برآورد تقریبی مرکز شهرک صنعتی شاهرود.";
 r.sourceDate="1398";r.status="سرعت باد و برف استخراج‌شده از رکورد پروژه؛ ارتفاع محل تقریبی و نیازمند کنترل نقشه‌برداری";
}
function currentClimate(){return window.SteelLoads?.getData?.().climate || {};}
function refreshStatus(){
 const el=$("climateDatabaseStatus"); if(!el)return;
 const all=Object.values(records), filled=all.filter(r=>r.basicWind!==null||r.groundSnow!==null).length;
 el.textContent="تعداد شهرهای فهرست: "+all.length+" | شهرهای دارای داده عددی: "+filled+" | داده‌های ثبت‌شده نیازمند کنترل منبع هستند.";
}
function loadSelectedCity(){
 const id=$("climateCity")?.value, r=records[id]; if(!r)return;
 const assign=(field,value)=>{
  const el=$(field);if(!el)return;
  el.value=value===null||value===undefined?"":String(value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
 };
 assign("climateCustomCity",r.name);
 assign("climateGroundSnow",r.groundSnow);
 assign("climateBasicWind",r.basicWind);
 assign("climateElevation",r.elevation);
 assign("climateSource",r.source||"");
 assign("climateSourceDocument",r.sourceTitle||"");
 assign("climateSourceClause",r.sourceClause||"");
 assign("climateSourceVerified",r.verified===true);
 assign("climateElevationSource",r.elevationSource||"");
 const status=$("climateNotice");
 if(status){
  const available=[r.basicWind!==null&&r.basicWind!==undefined,r.groundSnow!==null&&r.groundSnow!==undefined,r.elevation!==null&&r.elevation!==undefined].filter(Boolean).length;
  status.textContent=available
   ?("اطلاعات ثبت‌شده "+r.name+": "+(r.basicWind!=null?"سرعت مبنای باد "+r.basicWind+" km/h؛ ":"")+(r.groundSnow!=null?"برف مبنا "+r.groundSnow+" kN/m²؛ ":"")+(r.elevation!=null?"ارتفاع "+r.elevation+" m؛ ":"")+"منبع: "+(r.source||"ثبت نشده")+" | وضعیت: "+(r.status||"نیازمند بررسی")+". مقادیر مبنا هستند و بارهای نهایی باید طبق ویرایش آیین‌نامه و شرایط دقیق محل محاسبه شوند.")
   :"برای "+r.name+" داده عددی معتبر در بانک فعلی ثبت نشده است؛ فیلدهای شهر قبلی پاک شدند و هیچ مقدار حدسی جایگزین نشد.";
 }
 refreshStatus();
 window.dispatchEvent(new CustomEvent("sahroud:climate-city-loaded",{detail:{city:id,record:JSON.parse(JSON.stringify(r))}}));
}
function addOptions(){
 const sel=$("climateCity"), legacy=$("city"); if(!sel)return;
 cities.forEach(([id,name])=>{
  if(![...sel.options].some(o=>o.value===id)){const o=document.createElement("option");o.value=id;o.textContent=name;const other=sel.querySelector('option[value="other"]');sel.insertBefore(o,other||null);}
  if(legacy&&![...legacy.options].some(o=>o.value===id)){const o=document.createElement("option");o.value=id;o.textContent=name;legacy.appendChild(o);}
 });
 sel.addEventListener("change",loadSelectedCity);
}
function saveCurrentCity(){
 const c=currentClimate(),id=c.city||"other",name=(c.customCity||"").trim()||"شهر بدون نام";
 const num=v=>v===""||v===undefined?null:Number(v);
 const wind=num(c.basicWind),snow=num(c.groundSnow),elev=num(c.elevation);
 if([wind,snow,elev].some(v=>v!==null&&!Number.isFinite(v))){alert("مقادیر اقلیمی باید عددی باشند.");return;}
 const source=(c.source||"").trim();
 if((wind!==null||snow!==null)&&!source){alert("برای ثبت مقدار باد یا برف، منبع داده را وارد کنید.");return;}
 const previous=records[id]||{};
 records[id]={...previous,id,name,basicWind:wind,groundSnow:snow,basicWindPressure:previous.basicWindPressure??null,snowRegion:previous.snowRegion??null,elevation:elev,elevationSource:String(c.elevationSource||previous.elevationSource||""),source,sourceTitle:String(c.sourceDocument||previous.sourceTitle||""),sourceClause:String(c.sourceClause||previous.sourceClause||""),sourceUrl:String(previous.sourceUrl||""),sourceDate:String(previous.sourceDate||new Date().toISOString().slice(0,10)),codeEdition:String(previous.codeEdition||""),verified:c.sourceVerified===true,status:c.sourceVerified===true?"تأیید توسط مهندس مسئول؛ نیازمند نگهداری مرجع":"ثبت کاربر؛ نیازمند کنترل منبع"};
 refreshStatus(); alert("رکورد شهر در بانک جاری ثبت شد. برای انتقال آن، پروژه را ذخیره یا از بانک خروجی JSON بگیرید.");
}
function exportDatabase(){
 const data={schema:"sahroud-steel-climate-db",version:1,exportedAt:new Date().toISOString(),records};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="Sahroud_Steel_Climate_DB.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function importDatabase(event){
 const file=event.target.files?.[0];if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const data=JSON.parse(reader.result);if(data.schema!=="sahroud-steel-climate-db"||!data.records)throw new Error("ساختار فایل بانک اقلیمی معتبر نیست.");
   Object.keys(data.records).forEach(id=>{
    const r=data.records[id];if(!r||typeof r!=="object")return;
    const n=v=>v===null||v===""||v===undefined?null:Number(v),wind=n(r.basicWind),snow=n(r.groundSnow),elev=n(r.elevation);
    if([wind,snow,elev].some(v=>v!==null&&(!Number.isFinite(v)||v<0)))return;
    records[id]={id,name:String(r.name||id),basicWind:wind,groundSnow:snow,basicWindPressure:n(r.basicWindPressure),snowRegion:n(r.snowRegion),elevation:elev,siteCoordinates:r.siteCoordinates&&typeof r.siteCoordinates==="object"?{latitude:Number(r.siteCoordinates.latitude),longitude:Number(r.siteCoordinates.longitude)}:null,elevationSource:String(r.elevationSource||""),seismicZone:r.seismicZone??null,meanAnnualTemperature:n(r.meanAnnualTemperature),designTemperature:n(r.designTemperature),source:String(r.source||""),sourceTitle:String(r.sourceTitle||""),sourceClause:String(r.sourceClause||""),sourceUrl:String(r.sourceUrl||""),sourceDate:String(r.sourceDate||""),codeEdition:String(r.codeEdition||""),verified:r.verified===true,status:String(r.status||"واردشده؛ نیازمند کنترل")};
   });
   applyShahroudReference();refreshStatus();loadSelectedCity();alert("بانک اقلیمی وارد شد؛ داده مرجع شاهرود حفظ شد.");
  }catch(e){alert("خطا در وارد کردن بانک: "+e.message);}
  event.target.value="";
 };
 reader.readAsText(file,"UTF-8");
}
function ensureTools(){
 const anchor=$("climateNotice");if(!anchor||$("climateDatabaseTools"))return;
 const box=document.createElement("div");box.id="climateDatabaseTools";
 box.innerHTML='<div class="notice"><b>بانک شهرها و سوابق اقلیمی</b><p id="climateDatabaseStatus"></p><div class="button-grid"><button type="button" class="btn primary" id="btnClimateSaveCity">ثبت مقادیر فعلی برای این شهر</button><button type="button" class="btn secondary" id="btnClimateExport">خروجی بانک شهرها (JSON)</button><button type="button" class="btn secondary" id="btnClimateImport">وارد کردن بانک شهرها (JSON)</button><input type="file" id="climateDatabaseFile" accept=".json,application/json" hidden></div><p class="hint">فهرست شهرها داخلی است؛ اعداد تا زمان تأیید منبع رسمی خالی می‌مانند. بانک را می‌توان بین پروژه‌ها و دستگاه‌ها منتقل کرد.</p></div>';
 anchor.insertAdjacentElement("afterend",box);
 $("btnClimateSaveCity").addEventListener("click",saveCurrentCity);
 $("btnClimateExport").addEventListener("click",exportDatabase);
 $("btnClimateImport").addEventListener("click",()=>$("climateDatabaseFile").click());
 $("climateDatabaseFile").addEventListener("change",importDatabase);
 refreshStatus();
}
function getData(){return {schema:"sahroud-steel-climate-db",version:1,records:JSON.parse(JSON.stringify(records))};}
function setData(data){
 if(!data||data.schema!=="sahroud-steel-climate-db"||!data.records)return;
 const cleanNumber=v=>v===null||v===undefined||v===""?null:(Number.isFinite(Number(v))?Number(v):null);
 Object.keys(data.records).forEach(id=>{const r=data.records[id];if(!r||typeof r!=="object")return;records[id]={id,name:String(r.name||id),basicWind:cleanNumber(r.basicWind),groundSnow:cleanNumber(r.groundSnow),basicWindPressure:cleanNumber(r.basicWindPressure),snowRegion:cleanNumber(r.snowRegion),elevation:cleanNumber(r.elevation),siteCoordinates:r.siteCoordinates&&Number.isFinite(Number(r.siteCoordinates.latitude))&&Number.isFinite(Number(r.siteCoordinates.longitude))?{latitude:Number(r.siteCoordinates.latitude),longitude:Number(r.siteCoordinates.longitude)}:null,elevationSource:String(r.elevationSource||""),source:String(r.source||""),sourceTitle:String(r.sourceTitle||""),sourceClause:String(r.sourceClause||""),sourceUrl:String(r.sourceUrl||""),sourceDate:String(r.sourceDate||""),codeEdition:String(r.codeEdition||""),verified:r.verified===true,seismicZone:r.seismicZone??null,meanAnnualTemperature:cleanNumber(r.meanAnnualTemperature),designTemperature:cleanNumber(r.designTemperature),status:String(r.status||"")};});
 applyShahroudReference();
 refreshStatus();
}
applyShahroudReference();
records.shahroud.basicWind=90;
records.shahroud.basicWindPressure=0.383;
records.shahroud.groundSnow=1.0;
records.shahroud.snowRegion=3;
records.shahroud.source="مبحث ششم ویرایش چهارم ۱۳۹۸؛ جدول ۶-۱۰-۱ برای سرعت مبنای باد شاهرود: ۹۰ km/h؛ فشار مبنا از رابطه ۶-۱۰-۲: حدود ۰٫۳۸۳ kN/m². مقدار برف طبق رکورد قبلی پروژه و جداگانه نیازمند تطبیق نهایی است.";
records.shahroud.sourceTitle="مبحث ششم ۱۳۹۸؛ جدول ۶-۱۰-۱";
records.shahroud.sourceClause="جدول ۶-۱۰-۱ و رابطه ۶-۱۰-۲؛ مقدار برف نیازمند تطبیق مستقل";
records.shahroud.codeEdition="مبحث ششم ۱۳۹۸";
records.shahroud.sourceDate="1398";
records.shahroud.status="سرعت باد با جدول ویرایش ۱۳۹۸ تطبیق داده شد؛ ارتفاع محل همچنان تقریبی است و بار برف نیازمند کنترل مستقل";
window.SteelClimateDB={getData,setData,saveCurrentCity,exportDatabase,loadSelectedCity,getCity:id=>records[id]?JSON.parse(JSON.stringify(records[id])):null};
document.addEventListener("DOMContentLoaded",()=>{ensureTools();addOptions();});
})();