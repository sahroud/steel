/* SAHROUD STEEL — Market price registry
 * Browser-side adapter. Automatic feeds require a CORS-enabled JSON endpoint controlled/authorized by the user.
 * No scraping, credentials, or fabricated prices. Prices are never treated as live without a timestamp.
 */
(function () {
 "use strict";
 const KEY="sahroudSteel.marketPrices.v1";
 const $=id=>document.getElementById(id);
 const state={endpoint:"",intervalMinutes:60,autoRefresh:false,prices:[],lastFetchAt:null,lastError:""};
 let autoTimer=null;
 function configureAutoRefresh(){
  if(autoTimer){clearInterval(autoTimer);autoTimer=null;}
  if(state.autoRefresh&&state.endpoint){
   autoTimer=setInterval(()=>{if(document.visibilityState==="visible")refresh();},state.intervalMinutes*60000);
  }
 }
 const units=["تومان/کیلوگرم","تومان/تن","تومان/مترمربع","تومان/مترمکعب","تومان/عدد","تومان/متر","تومان/کیسه"];
 const presets=[
  {code:"steel.ipe14",name:"تیرآهن IPE 14",unit:"تومان/کیلوگرم"},
  {code:"steel.sheet3",name:"ورق سیاه ۳ میلی‌متر",unit:"تومان/کیلوگرم"},
  {code:"cement.type2.bag",name:"سیمان تیپ ۲ پاکتی",unit:"تومان/تن"},
  {code:"panel.wall40",name:"ساندویچ‌پنل دیواری ۴ سانتی‌متر",unit:"تومان/مترمربع"},
  {code:"panel.roof50",name:"ساندویچ‌پنل سقفی ۵ سانتی‌متر",unit:"تومان/مترمربع"},
  {code:"brick",name:"آجر",unit:"تومان/عدد"}
 ];
 const fmt=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:2});
 function safeDate(v){const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;}
 function normalize(p){
  if(!p||typeof p!=="object")throw Error("رکورد قیمت ساختار معتبری ندارد.");
  const price=Number(p.price),updatedAt=safeDate(p.updatedAt||p.date);
  if(!p.code||!p.name||!Number.isFinite(price)||price<=0||!p.unit||!updatedAt)throw Error("هر قیمت باید کد، نام، مبلغ مثبت، واحد و تاریخ معتبر داشته باشد.");
  return {code:String(p.code),name:String(p.name),price,unit:String(p.unit),city:String(p.city||"تهران"),source:String(p.source||"منبع تعریف‌شده توسط کاربر"),updatedAt,currency:"تومان",verified:!!p.verified};
 }
 function getFreshness(p){const age=Date.now()-new Date(p.updatedAt).getTime();return age<0?"تاریخ نامعتبر":age>36*3600000?"قدیمی‌تر از ۳۶ ساعت":"به‌روز (کمتر از ۳۶ ساعت)";}
 function render(){
  const body=$("marketPriceRows");if(!body)return;
  body.innerHTML="";
  if(!state.prices.length){body.innerHTML='<tr><td colspan="6">هنوز قیمتی ثبت نشده است؛ منبع JSON را تنظیم یا قیمت را دستی وارد کنید.</td></tr>';return;}
  state.prices.forEach((p,i)=>{
   const tr=document.createElement("tr");
   [p.name,fmt(p.price),p.unit,p.city,new Date(p.updatedAt).toLocaleString("fa-IR"),getFreshness(p)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
   const td=document.createElement("td"),b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent="حذف";b.addEventListener("click",()=>{state.prices.splice(i,1);render();});td.appendChild(b);tr.appendChild(td);body.appendChild(tr);
  });
 }
 function status(msg,isError){const el=$("marketPriceStatus");if(el){el.textContent=msg;el.style.color=isError?"#b91c1c":"";}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(getData()));}catch(e){console.warn("Market price local save failed",e);}}
 function getData(){return JSON.parse(JSON.stringify(state));}
 function setData(data){
  if(!data||typeof data!=="object")return;
  state.endpoint=String(data.endpoint||"");state.intervalMinutes=Math.max(5,Math.min(1440,Number(data.intervalMinutes)||60));state.autoRefresh=!!data.autoRefresh;
  state.prices=Array.isArray(data.prices)?data.prices.map(p=>{try{return normalize(p);}catch(_){return null;}}).filter(Boolean):[];
  state.lastFetchAt=safeDate(data.lastFetchAt);state.lastError=String(data.lastError||"");
  if($("marketPriceEndpoint"))$("marketPriceEndpoint").value=state.endpoint;
  if($("marketPriceInterval"))$("marketPriceInterval").value=state.intervalMinutes;
  if($("marketPriceAuto"))$("marketPriceAuto").checked=state.autoRefresh;
  render();
  configureAutoRefresh();
 }
 async function refresh(){
  state.endpoint=$("marketPriceEndpoint")?.value.trim()||state.endpoint;
  if(!state.endpoint){status("نشانی سرویس قیمت وارد نشده است. برای دریافت خودکار، یک API مجاز با دسترسی CORS معرفی کنید.",true);return false;}
  status("در حال دریافت اطلاعات قیمت…");
  try{
   const response=await fetch(state.endpoint,{cache:"no-store",headers:{Accept:"application/json"}});
   if(!response.ok)throw Error("پاسخ سرویس: HTTP "+response.status);
   const payload=await response.json(),items=Array.isArray(payload)?payload:payload.prices;
   if(!Array.isArray(items)||!items.length)throw Error("ساختار پاسخ باید آرایه‌ای از prices داشته باشد.");
   const next=items.map(normalize),now=Date.now();
   if(next.some(p=>new Date(p.updatedAt).getTime()>now+5*60000))throw Error("تاریخ یکی از قیمت‌ها در آینده است.");
   const byCode=new Map(state.prices.map(p=>[p.code,p]));
   next.forEach(p=>byCode.set(p.code,p));
   state.prices=Array.from(byCode.values());state.lastFetchAt=new Date().toISOString();state.lastError="";
   render();persist();status("دریافت موفق: "+next.length+" قلم قیمت؛ زمان دریافت "+new Date(state.lastFetchAt).toLocaleString("fa-IR")+" .");
   return true;
  }catch(e){state.lastError=e.message;persist();status("دریافت ناموفق بود: "+e.message+"؛ قیمت‌های قبلی بدون تغییر باقی ماندند.",true);return false;}
 }
 function addManual(){
  try{
   const p=normalize({code:$("marketPriceCode").value.trim(),name:$("marketPriceName").value.trim(),price:$("marketPriceValue").value,unit:$("marketPriceUnit").value,city:$("marketPriceCity").value.trim()||"شاهرود",source:$("marketPriceSource").value.trim()||"ورود دستی",updatedAt:new Date().toISOString()});
   const i=state.prices.findIndex(x=>x.code===p.code);if(i>=0)state.prices[i]=p;else state.prices.push(p);
   render();persist();status("قیمت ثبت شد. این قیمت ورود دستی است و به‌عنوان نرخ تأییدشده بازار تلقی نمی‌شود.");
  }catch(e){status(e.message,true);}
 }
 function exportCSV(){
  const rows=[["code","name","price","unit","city","source","updatedAt","freshness"],...state.prices.map(p=>[p.code,p.name,p.price,p.unit,p.city,p.source,p.updatedAt,getFreshness(p)])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="Sahroud_Steel_Market_Prices.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function mount(){
  if($("marketPricePanel"))return;
  const panel=document.createElement("section");panel.className="panel";panel.id="marketPricePanel";
  panel.innerHTML=`
   <div class="panel-title"><h3>سامانه قیمت روز مصالح و خدمات</h3><span class="status">نسخه اولیه ـ دریافت کنترل‌شده</span></div>
   <div class="notice">قیمت‌ها به تومان ثبت می‌شوند. دریافت خودکار فقط با API مجاز و سازگار با CORS انجام می‌شود. این نسخه از استخراج غیرمجاز صفحات سایت‌ها استفاده نمی‌کند. قیمت قدیمی با برچسب هشدار نمایش داده می‌شود.</div>
   <div class="form-grid">
    <div class="field"><label for="marketPriceEndpoint">نشانی API قیمت (JSON)</label><input id="marketPriceEndpoint" type="url" placeholder="https://your-domain.example/api/prices"></div>
    <div class="field"><label for="marketPriceInterval">فاصله به‌روزرسانی (دقیقه)</label><input id="marketPriceInterval" type="number" min="5" max="1440" value="60"></div>
    <div class="field"><label><input id="marketPriceAuto" type="checkbox"> به‌روزرسانی خودکار هنگام بازبودن نرم‌افزار</label></div>
   </div>
   <div class="button-grid"><button id="marketPriceRefresh" class="btn primary" type="button">دریافت قیمت‌ها</button><button id="marketPriceExport" class="btn secondary" type="button">خروجی CSV قیمت‌ها</button></div>
   <div id="marketPriceStatus" class="notice">برای دریافت خودکار، نشانی API را وارد کنید. قیمت دستی نیز قابل ثبت است.</div>
   <h4>ثبت یا اصلاح دستی قیمت</h4>
   <div class="form-grid">
    <div class="field"><label for="marketPriceCode">کد یکتا</label><input id="marketPriceCode" placeholder="مثلاً steel.ipe14"></div>
    <div class="field"><label for="marketPriceName">نام کالا</label><input id="marketPriceName" placeholder="نام دقیق کالا"></div>
    <div class="field"><label for="marketPriceValue">قیمت (تومان)</label><input id="marketPriceValue" type="number" min="0" step="any"></div>
    <div class="field"><label for="marketPriceUnit">واحد قیمت</label><select id="marketPriceUnit">${units.map(u=>'<option>'+u+'</option>').join("")}</select></div>
    <div class="field"><label for="marketPriceCity">شهر تحویل</label><input id="marketPriceCity" value="شاهرود"></div>
    <div class="field"><label for="marketPriceSource">فروشنده / منبع</label><input id="marketPriceSource" placeholder="نام فروشنده یا منبع"></div>
   </div>
   <button id="marketPriceAdd" class="btn success" type="button">ثبت قیمت دستی</button>
   <h4>فهرست قیمت‌های ذخیره‌شده</h4>
   <div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:720px"><thead><tr><th>کالا</th><th>قیمت</th><th>واحد</th><th>شهر</th><th>تاریخ به‌روزرسانی</th><th>وضعیت تازگی</th><th>عملیات</th></tr></thead><tbody id="marketPriceRows"></tbody></table></div>
   <h4>منابع قابل بررسی</h4>
   <ul>
    <li><a href="https://arznab.com/en/steel" target="_blank" rel="noopener">Arznab ـ قیمت آهن و فولاد</a></li>
    <li><a href="https://arznab.com/en/building-materials" target="_blank" rel="noopener">Arznab ـ مصالح ساختمانی</a></li>
    <li><a href="https://sitahan.com/" target="_blank" rel="noopener">سایت آهن ـ پوشش سقف و ساندویچ‌پنل</a></li>
    <li><a href="https://ahanonline.com/product-category/انواع-ورق/ساندویچ-پانل/" target="_blank" rel="noopener">آهن آنلاین ـ ساندویچ‌پنل</a></li>
   </ul>
   <p class="geometry-hint">قرارداد API مورد انتظار: { "prices": [ { "code":"steel.ipe14", "name":"تیرآهن IPE 14", "price":120000, "unit":"تومان/کیلوگرم", "city":"تهران", "source":"نام منبع", "updatedAt":"2026-11-12T10:00:00+03:30" } ] } . هر قلم باید تاریخ واقعی به‌روزرسانی داشته باشد.</p>
  `;
  const footer=document.querySelector("footer");if(footer)footer.parentNode.insertBefore(panel,footer);else document.querySelector("main")?.appendChild(panel);
  $("marketPriceEndpoint").value=state.endpoint;$("marketPriceInterval").value=state.intervalMinutes;$("marketPriceAuto").checked=state.autoRefresh;
  $("marketPriceRefresh").addEventListener("click",refresh);$("marketPriceExport").addEventListener("click",exportCSV);$("marketPriceAdd").addEventListener("click",addManual);
  $("marketPriceEndpoint").addEventListener("change",()=>{state.endpoint=$("marketPriceEndpoint").value.trim();persist();configureAutoRefresh();});
  $("marketPriceInterval").addEventListener("change",()=>{state.intervalMinutes=Math.max(5,Math.min(1440,Number($("marketPriceInterval").value)||60));persist();configureAutoRefresh();});
  $("marketPriceAuto").addEventListener("change",()=>{state.autoRefresh=$("marketPriceAuto").checked;persist();configureAutoRefresh();});
  render();
  configureAutoRefresh();
 }
 window.SteelMarketPrices={getData,setData,refresh,addManual,render};
 document.addEventListener("DOMContentLoaded",mount);
})();