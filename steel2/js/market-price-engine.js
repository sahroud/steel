/* SAHROUD STEEL — Project-local market price registry
 * Prices are quotations, not guaranteed delivered prices. No scraping or fabricated feeds.
 */
(function(){
 "use strict";
 const KEY="sahroudSteel.marketPrices.v1", $=id=>document.getElementById(id);
 const state={endpoint:"",intervalMinutes:60,autoRefresh:false,prices:[],lastFetchAt:null,lastError:""};
 let autoTimer=null;
 const units=["تومان/کیلوگرم","تومان/تن","تومان/مترمربع","تومان/مترمکعب","تومان/عدد","تومان/متر","تومان/کیسه","تومان/مجموع"];
 const presets=[
  {code:"steel.ipe14",name:"تیرآهن IPE 14",unit:"تومان/کیلوگرم"},
  {code:"steel.sheet3",name:"ورق سیاه ۳ میلی‌متر",unit:"تومان/کیلوگرم"},
  {code:"cement.type2.bag",name:"سیمان تیپ ۲ پاکتی",unit:"تومان/تن"},
  {code:"panel.wall40",name:"ساندویچ‌پنل دیواری ۴ سانتی‌متر",unit:"تومان/مترمربع"},
  {code:"panel.roof50",name:"ساندویچ‌پنل سقفی ۵ سانتی‌متر",unit:"تومان/مترمربع"},
  {code:"brick",name:"آجر",unit:"تومان/عدد"},
  {code:"concrete.ready",name:"بتن آماده فونداسیون",unit:"تومان/مترمکعب"},
  {code:"rebar.a3",name:"میلگرد آجدار A3",unit:"تومان/کیلوگرم"},
  {code:"excavation",name:"خاکبرداری و بارگیری",unit:"تومان/مترمکعب"},
  {code:"formwork",name:"قالب‌بندی بتن",unit:"تومان/مترمربع"},
  {code:"anchor.bolt",name:"بولت و متعلقات صفحه‌ستون",unit:"تومان/عدد"},
  {code:"concrete.floor",name:"بتن کف سوله",unit:"تومان/مترمکعب"},
  {code:"door.industrial",name:"درب صنعتی و کرکره",unit:"تومان/مترمربع"},
  {code:"gutter",name:"آبرو و ناودانی",unit:"تومان/متر"},
  {code:"electrical.package",name:"برق و روشنایی پروژه",unit:"تومان/مجموع"}
 ];
 const fmt=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:2});
 function projectCity(){
  const el=$("city"); if(!el)return "";
  if(el.value==="other"||el.value==="custom")return ($("cityName")?.value||"").trim();
  const opt=el.options?.[el.selectedIndex];return (opt?.textContent||el.value||"").trim().replace(/\s*\(پیش‌فرض\)\s*/g,"");
 }
 function safeDate(v){const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;}
 function normalize(p,allowUserVerified){
  if(!p||typeof p!=="object")throw Error("رکورد قیمت ساختار معتبری ندارد.");
  const price=Number(p.price),updatedAt=safeDate(p.updatedAt||p.date);
  if(!p.code||!p.name||!Number.isFinite(price)||price<=0||!p.unit||!updatedAt)throw Error("هر قیمت باید کد، نام، مبلغ مثبت، واحد و تاریخ معتبر داشته باشد.");
  const freight= p.freightToman===""||p.freightToman==null?null:Number(p.freightToman);
  const tax= p.taxPercent===""||p.taxPercent==null?null:Number(p.taxPercent);
  return {
   code:String(p.code),name:String(p.name),productSpec:String(p.productSpec||""),
   price,unit:String(p.unit),city:String(p.city||p.quoteCity||"نامشخص"),
   seller:String(p.seller||""),source:String(p.source||"منبع تعریف‌شده توسط کاربر"),
   sourceType:String(p.sourceType||"manual"),deliveryCity:String(p.deliveryCity||""),
   includesFreight: p.includesFreight===true, freightToman:Number.isFinite(freight)&&freight>=0?freight:null,
   includesTax:p.includesTax===true,taxPercent:Number.isFinite(tax)&&tax>=0?tax:null,
   sourceUrl:String(p.sourceUrl||""),updatedAt,currency:"تومان",
   verifiedByUser:allowUserVerified&&p.verifiedByUser===true
  };
 }
 function freshness(p){const age=Date.now()-new Date(p.updatedAt).getTime();return age<0?"تاریخ نامعتبر":age>36*3600000?"قدیمی‌تر از ۳۶ ساعت":"تازه (کمتر از ۳۶ ساعت)";}
 function render(){
  const body=$("marketPriceRows");if(!body)return;body.replaceChildren();
  if(!state.prices.length){body.innerHTML='<tr><td colspan="10">هنوز قیمتی ثبت نشده است؛ قیمت را دستی وارد یا API مجاز JSON را تنظیم کنید.</td></tr>';return;}
  state.prices.forEach((p,i)=>{
   const tr=document.createElement("tr");
   const delivery=p.deliveryCity||"تحویل نامشخص";
   const freight=p.includesFreight?"حمل منظور شده":p.freightToman!==null?"حمل جدا: "+fmt(p.freightToman):"حمل نامشخص";
   const tax=p.includesTax?"مالیات منظور شده":p.taxPercent!==null?"مالیات جدا: "+p.taxPercent+"٪":"مالیات نامشخص";
   [p.name+(p.productSpec?" — "+p.productSpec:""),fmt(p.price),p.unit,p.city,p.seller||p.source,delivery,freight+"؛ "+tax,p.verifiedByUser?"تأیید دستی کاربر":"تأییدنشده",new Date(p.updatedAt).toLocaleString("fa-IR")+"؛ "+freshness(p)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
   const td=document.createElement("td"),b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent="حذف";b.addEventListener("click",()=>{state.prices.splice(i,1);persist();render();});td.appendChild(b);tr.appendChild(td);body.appendChild(tr);
  });
 }
 function status(msg,isError){const el=$("marketPriceStatus");if(el){el.textContent=msg;el.style.color=isError?"#b91c1c":"";}}
 function getData(){return JSON.parse(JSON.stringify(state));}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(getData()));}catch(e){console.warn("Market price local save failed",e);}}
 function setData(d){
  if(!d||typeof d!=="object")return;
  state.endpoint=String(d.endpoint||"");state.intervalMinutes=Math.max(5,Math.min(1440,Number(d.intervalMinutes)||60));state.autoRefresh=!!d.autoRefresh;
  state.prices=Array.isArray(d.prices)?d.prices.map(p=>{try{return normalize(p,true);}catch(_){return null;}}).filter(Boolean):[];
  state.lastFetchAt=safeDate(d.lastFetchAt);state.lastError=String(d.lastError||"");
  if($("marketPriceEndpoint"))$("marketPriceEndpoint").value=state.endpoint;
  if($("marketPriceInterval"))$("marketPriceInterval").value=state.intervalMinutes;
  if($("marketPriceAuto"))$("marketPriceAuto").checked=state.autoRefresh;
  render();configureAutoRefresh();
 }
 function configureAutoRefresh(){if(autoTimer){clearInterval(autoTimer);autoTimer=null;}if(state.autoRefresh&&state.endpoint)autoTimer=setInterval(()=>{if(document.visibilityState==="visible")refresh();},state.intervalMinutes*60000);}
 async function refresh(){
  state.endpoint=$("marketPriceEndpoint")?.value.trim()||state.endpoint;
  if(!state.endpoint){status("نشانی API وارد نشده است. فقط API مجاز JSON با دسترسی CORS قابل استفاده است.",true);return false;}
  status("در حال دریافت قیمت‌ها…");
  try{
   const response=await fetch(state.endpoint,{cache:"no-store",headers:{Accept:"application/json"}});
   if(!response.ok)throw Error("پاسخ سرویس: HTTP "+response.status);
   const payload=await response.json(),items=Array.isArray(payload)?payload:payload.prices;
   if(!Array.isArray(items)||!items.length)throw Error("ساختار پاسخ باید آرایه prices باشد.");
   const next=items.map(p=>normalize(p,false)),now=Date.now();
   if(next.some(p=>new Date(p.updatedAt).getTime()>now+5*60000))throw Error("تاریخ یکی از قیمت‌ها در آینده است.");
   const byKey=new Map(state.prices.map(p=>[p.code+"|"+p.city+"|"+p.seller,p]));
   next.forEach(p=>byKey.set(p.code+"|"+p.city+"|"+p.seller,p));
   state.prices=Array.from(byKey.values());state.lastFetchAt=new Date().toISOString();state.lastError="";
   render();persist();status("دریافت "+next.length+" قیمت انجام شد. قیمت‌های API تأییدشده محسوب نمی‌شوند؛ شهر پروژه فعلی: "+(projectCity()||"ثبت‌نشده")+".");
   return true;
  }catch(e){state.lastError=e.message;persist();status("دریافت ناموفق: "+e.message+"؛ قیمت‌های قبلی حفظ شدند.",true);return false;}
 }
 function addManual(){
  try{
   const p=normalize({
    code:$("marketPriceCode").value.trim(),name:$("marketPriceName").value.trim(),productSpec:$("marketPriceSpec").value.trim(),
    price:$("marketPriceValue").value,unit:$("marketPriceUnit").value,
    city:$("marketPriceCity").value.trim()||"نامشخص",
    seller:$("marketPriceSeller").value.trim(),source:$("marketPriceSource").value.trim()||"ورود دستی",
    sourceType:$("marketPriceSourceType").value,deliveryCity:$("marketPriceDeliveryCity").value.trim(),
    includesFreight:$("marketPriceFreightIncluded").checked,freightToman:$("marketPriceFreight").value,
    includesTax:$("marketPriceTaxIncluded").checked,taxPercent:$("marketPriceTaxPercent").value,
    sourceUrl:$("marketPriceUrl").value.trim(),verifiedByUser:$("marketPriceVerified").checked,
    updatedAt:new Date().toISOString()
   },true);
   const i=state.prices.findIndex(x=>x.code===p.code&&x.city===p.city&&x.seller===p.seller);
   if(i>=0)state.prices[i]=p;else state.prices.push(p);
   render();persist();status("قیمت ثبت شد. شهر بازار با شهر پروژه متفاوت است مگر اینکه صریحاً یکسان باشد؛ تحویل و هزینه‌های جانبی جداگانه بررسی شوند.");
  }catch(e){status(e.message,true);}
 }
 function exportCSV(){
  const cols=["code","name","productSpec","price","unit","city","seller","source","sourceType","deliveryCity","includesFreight","freightToman","includesTax","taxPercent","sourceUrl","updatedAt","verifiedByUser"];
  const rows=[cols,...state.prices.map(p=>cols.map(k=>p[k]??""))];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="Sahroud_Steel_Market_Prices.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function mount(){
  if($("marketPricePanel"))return;
  const panel=document.createElement("section");panel.className="panel";panel.id="marketPricePanel";
  panel.innerHTML=`
   <div class="panel-title"><h3>بانک قیمت بازار شهر محل اجرای پروژه</h3><span class="status">قیمت محلی و قابل رهگیری</span></div>
   <div class="notice">شهر پروژه: <strong id="marketProjectCity"></strong>. قیمت هر کالا در شهر بازار/فروشنده ثبت می‌شود؛ شهر تحویل، حمل و مالیات مستقل‌اند. قیمت شهر دیگر، قیمت تحویل محل پروژه فرض نمی‌شود. API فقط JSON مجاز با CORS است و داده API خودکار تأییدشده نیست.</div>
   <div class="form-grid">
    <div class="field"><label for="marketPriceEndpoint">نشانی API قیمت (JSON)</label><input id="marketPriceEndpoint" type="url" placeholder="https://your-domain.example/api/prices"></div>
    <div class="field"><label for="marketPriceInterval">فاصله به‌روزرسانی (دقیقه)</label><input id="marketPriceInterval" type="number" min="5" max="1440" value="60"></div>
    <div class="field"><label><input id="marketPriceAuto" type="checkbox"> به‌روزرسانی خودکار هنگام بازبودن نرم‌افزار</label></div>
   </div>
   <div class="button-grid"><button id="marketPriceRefresh" class="btn primary" type="button">دریافت قیمت‌ها</button><button id="marketPriceExport" class="btn secondary" type="button">خروجی CSV قیمت‌ها</button></div>
   <div id="marketPriceStatus" class="notice">قیمت‌ها هنوز دریافت یا ثبت نشده‌اند.</div>
   <h4>ثبت قیمت کالا یا خدمت در بازار</h4>
   <div class="form-grid">
    <div class="field"><label for="marketPriceCode">کد یکتا</label><input id="marketPriceCode" placeholder="مثلاً steel.ipe14"></div>
    <div class="field"><label for="marketPriceName">نام کالا/خدمت</label><input id="marketPriceName" placeholder="نام دقیق کالا"></div>
    <div class="field"><label for="marketPriceSpec">مشخصات فنی دقیق</label><input id="marketPriceSpec" placeholder="استاندارد، گرید، ضخامت، ابعاد و پوشش"></div>
    <div class="field"><label for="marketPriceValue">قیمت پایه (تومان)</label><input id="marketPriceValue" type="number" min="0" step="any"></div>
    <div class="field"><label for="marketPriceUnit">واحد قیمت</label><select id="marketPriceUnit">${units.map(u=>'<option>'+u+'</option>').join("")}</select></div>
    <div class="field"><label for="marketPriceCity">شهر بازار/انبار/کارخانه</label><input id="marketPriceCity" placeholder="شهر محل عرضه"><button id="marketUseProjectCity" type="button" class="btn secondary">قرار دادن شهر پروژه</button></div>
    <div class="field"><label for="marketPriceSeller">نام فروشنده/کارخانه</label><input id="marketPriceSeller" placeholder="نام فروشنده"></div>
    <div class="field"><label for="marketPriceSourceType">نوع منبع</label><select id="marketPriceSourceType"><option value="factory">کارخانه</option><option value="warehouse">انبار</option><option value="market">بازار محلی</option><option value="exchange">بورس کالا</option><option value="manual">ورود دستی</option><option value="api">API</option></select></div>
    <div class="field"><label for="marketPriceDeliveryCity">شهر تحویل اعلام‌شده (اگر قطعی است)</label><input id="marketPriceDeliveryCity" placeholder="خالی = نامشخص"></div>
    <div class="field"><label for="marketPriceFreight">هزینه حمل جداگانه (تومان؛ مبنای محاسبه در یادداشت ثبت شود)</label><input id="marketPriceFreight" type="number" min="0" step="any" placeholder="در صورت اطلاع"></div>
    <div class="field"><label for="marketPriceTaxPercent">مالیات جداگانه (%)</label><input id="marketPriceTaxPercent" type="number" min="0" step="any" placeholder="در صورت اطلاع"></div>
    <div class="field"><label for="marketPriceSource">منبع/مرجع قیمت</label><input id="marketPriceSource" placeholder="وب‌سایت، پیش‌فاکتور، تماس و ..."></div>
    <div class="field"><label for="marketPriceUrl">پیوند منبع یا پیش‌فاکتور</label><input id="marketPriceUrl" type="url" placeholder="https://..."></div>
    <div class="field"><label><input id="marketPriceFreightIncluded" type="checkbox"> هزینه حمل در قیمت منظور شده</label></div>
    <div class="field"><label><input id="marketPriceTaxIncluded" type="checkbox"> مالیات در قیمت منظور شده</label></div>
    <div class="field"><label><input id="marketPriceVerified" type="checkbox"> این قیمت را شخصاً با فروشنده/مدرک تطبیق داده‌ام</label></div>
   </div>
   <button id="marketPriceAdd" class="btn success" type="button">ثبت قیمت بازار</button>
   <h4>قیمت‌های ثبت‌شده</h4>
   <div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:1250px"><thead><tr><th>کالا و مشخصات</th><th>قیمت</th><th>واحد</th><th>شهر بازار</th><th>فروشنده/منبع</th><th>شهر تحویل</th><th>حمل و مالیات</th><th>تأیید</th><th>تاریخ و تازگی</th><th>عملیات</th></tr></thead><tbody id="marketPriceRows"></tbody></table></div>
   <h4>منابع قابل بررسی (نیازمند تطبیق شهر و مشخصات)</h4>
   <ul><li><a href="https://arznab.com/en/steel" target="_blank" rel="noopener">Arznab ـ آهن و فولاد</a></li><li><a href="https://sitahan.com/" target="_blank" rel="noopener">سایت آهن</a></li><li><a href="https://ahanonline.com/" target="_blank" rel="noopener">آهن آنلاین</a></li></ul>
   <p class="geometry-hint">API: آرایه prices با فیلدهای code, name, price, unit, city, seller, productSpec, source, sourceType, deliveryCity, includesFreight, freightToman, includesTax, taxPercent, sourceUrl, updatedAt. فیلد verified ارسالی API نادیده گرفته می‌شود.</p>
  `;
  const footer=document.querySelector("footer");if(footer)footer.parentNode.insertBefore(panel,footer);else document.querySelector("main")?.appendChild(panel);
  $("marketPriceProjectCity").textContent=projectCity()||"انتخاب نشده";
  let lastProjectCity=projectCity();
  if($("marketPriceCity")&&!$("marketPriceCity").value.trim())$("marketPriceCity").value=lastProjectCity;
  $("marketPriceEndpoint").value=state.endpoint;$("marketPriceInterval").value=state.intervalMinutes;$("marketPriceAuto").checked=state.autoRefresh;
  $("marketPriceRefresh").addEventListener("click",refresh);$("marketPriceExport").addEventListener("click",exportCSV);$("marketPriceAdd").addEventListener("click",addManual);
  $("marketPriceEndpoint").addEventListener("change",()=>{state.endpoint=$("marketPriceEndpoint").value.trim();persist();configureAutoRefresh();});
  $("marketPriceInterval").addEventListener("change",()=>{state.intervalMinutes=Math.max(5,Math.min(1440,Number($("marketPriceInterval").value)||60));persist();configureAutoRefresh();});
  $("marketPriceAuto").addEventListener("change",()=>{state.autoRefresh=$("marketPriceAuto").checked;persist();configureAutoRefresh();});
  $("marketUseProjectCity")?.addEventListener("click",()=>{$("marketPriceCity").value=projectCity();});
  const syncProjectCity=()=>{const next=projectCity();$("marketPriceProjectCity").textContent=next||"انتخاب نشده";const cityInput=$("marketPriceCity");if(cityInput&&(!cityInput.value.trim()||cityInput.value.trim()===lastProjectCity))cityInput.value=next;lastProjectCity=next;};
  $("city")?.addEventListener("change",()=>{if($("cityName"))$("cityName").style.display=($("city").value==="other"||$("city").value==="custom")?"":"none";syncProjectCity();});
  $("cityName")?.addEventListener("input",syncProjectCity);
  render();configureAutoRefresh();
 }
 window.SteelMarketPrices={getData,setData,refresh,addManual,render,getProjectCity:projectCity,syncProjectCity:()=>{const el=$("marketPriceProjectCity");if(el)el.textContent=projectCity()||"انتخاب نشده";},units,presets};
 document.addEventListener("DOMContentLoaded",mount);
})();