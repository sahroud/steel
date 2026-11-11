/* SAHROUD STEEL - Climate City Database 1.0 */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const cities = [
["shahroud","شاهرود"],["semnan","سمنان"],["tehran","تهران"],["mashhad","مشهد"],["tabriz","تبریز"],["isfahan","اصفهان"],["yazd","یزد"],["rasht","رشت"],["sari","ساری"],["kerman","کرمان"],["arak","اراک"],["ardabil","اردبیل"],["urmia","ارومیه"],["ahvaz","اهواز"],["bandar-abbas","بندرعباس"],["bushehr","بوشهر"],["birjand","بیرجند"],["bojnord","بجنورد"],["hamedan","همدان"],["sanandaj","سنندج"],["kermanshah","کرمانشاه"],["ilam","ایلام"],["khorramabad","خرم‌آباد"],["qazvin","قزوین"],["zanjan","زنجان"],["gorgan","گرگان"],["yasuj","یاسوج"],["shiraz","شیراز"],["zahedan","زاهدان"],["zabol","زابل"],["qom","قم"],["kish","کیش"],["abadan","آبادان"],["dezful","دزفول"],["sabzevar","سبزوار"],["neyshabur","نیشابور"],["damghan","دامغان"],["garmsar","گرمسار"],["torbat-heydariyeh","تربت حیدریه"],["chabahar","چابهار"],["bandar-anzali","بندر انزلی"],["amol","آمل"],["babol","بابل"]
];
let records = {};
cities.forEach(([id,name]) => records[id] = {id,name,groundSnow:null,basicWind:null,elevation:null,source:"",sourceDate:"",status:"نیازمند ورود و تطبیق با منبع رسمی"});
function currentClimate(){return window.SteelLoads?.getData?.().climate || {};}
function refreshStatus(){
 const el=$("climateDatabaseStatus"); if(!el)return;
 const all=Object.values(records), filled=all.filter(r=>r.basicWind!==null||r.groundSnow!==null).length;
 el.textContent="تعداد شهرهای فهرست: "+all.length+" | شهرهای دارای داده عددی: "+filled+" | داده‌های ثبت‌شده نیازمند کنترل منبع هستند.";
}
function loadSelectedCity(){
 const id=$("climateCity")?.value, r=records[id]; if(!r)return;
 if($("climateCustomCity"))$("climateCustomCity").value=r.name;
 if($("climateGroundSnow"))$("climateGroundSnow").value=r.groundSnow===null?"":r.groundSnow;
 if($("climateBasicWind"))$("climateBasicWind").value=r.basicWind===null?"":r.basicWind;
 if($("climateElevation"))$("climateElevation").value=r.elevation===null?"":r.elevation;
 if($("climateSource"))$("climateSource").value=r.source||"";
 const status=$("climateNotice");
 if(status)status.textContent=(r.basicWind!==null||r.groundSnow!==null)
   ?"مقادیر این شهر در بانک موجود است؛ منبع و وضعیت اعتبار را پیش از استفاده در طراحی کنترل کنید."
   :"برای این شهر هنوز داده عددی ثبت نشده است؛ مقادیر شهر قبلی پاک شدند تا اشتباهاً به این شهر تخصیص نیابند.";
 refreshStatus();
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
 records[id]={id,name,basicWind:wind,groundSnow:snow,basicWindPressure:null,snowRegion:null,elevation:elev,source,sourceDate:new Date().toISOString().slice(0,10),status:source?"ثبت کاربر؛ نیازمند کنترل منبع":"فاقد داده عددی"};
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
    records[id]={id,name:String(r.name||id),basicWind:wind,groundSnow:snow,basicWindPressure:n(r.basicWindPressure),snowRegion:n(r.snowRegion),elevation:elev,source:String(r.source||""),sourceDate:String(r.sourceDate||""),status:String(r.status||"واردشده؛ نیازمند کنترل")};
   });
   refreshStatus();loadSelectedCity();alert("بانک اقلیمی وارد شد.");
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
 Object.keys(data.records).forEach(id=>{const r=data.records[id];if(!r||typeof r!=="object")return;records[id]={id,name:String(r.name||id),basicWind:cleanNumber(r.basicWind),groundSnow:cleanNumber(r.groundSnow),basicWindPressure:cleanNumber(r.basicWindPressure),snowRegion:cleanNumber(r.snowRegion),elevation:cleanNumber(r.elevation),source:String(r.source||""),sourceDate:String(r.sourceDate||""),status:String(r.status||"")};});
 refreshStatus();
}
records.shahroud.basicWind=90;
records.shahroud.basicWindPressure=0.38;
records.shahroud.groundSnow=1.0;
records.shahroud.snowRegion=3;
records.shahroud.source="مبحث ششم ۱۳۹۸؛ جدول ۶-۱۰-۱ ردیف ۱۸۳، جدول ۶-۷-۱ ردیف ۷۶ و بند ۶-۳-۲؛ نسخه PDF ارسالی کاربر، نیازمند تطبیق نهایی با نسخه رسمی.";
records.shahroud.sourceDate="1398";
records.shahroud.status="استخراج‌شده از نسخه PDF ارسالی؛ نسخه توزیعی، نه فایل رسمی قابل احراز";
window.SteelClimateDB={getData,setData,saveCurrentCity,exportDatabase,loadSelectedCity};
document.addEventListener("DOMContentLoaded",()=>{ensureTools();addOptions();});
})();