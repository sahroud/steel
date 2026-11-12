/* SAHROUD STEEL — Engineering reference register
 * Curated bibliographic records only. A download page is not proof of legal adoption.
 * Coefficients and clauses must be independently checked against the official issued document.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const state={records:[
  {id:"M6-1398",title:"مبحث ششم مقررات ملی ساختمان ـ بارهای وارد بر ساختمان",edition:"ویرایش چهارم، ۱۳۹۸",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"صفحه عنوان PDF کنترل شد: مبحث ششم، ویرایش چهارم ۱۳۹۸؛ اصلاحیه‌ها و آخرین وضعیت ابلاغ هنوز بررسی نشده",url:"https://inbr.ir/wp-content/uploads/2023/07/mahas6-98.pdf",notes:"PDF روی دامنه inbr.ir باز و تصویر صفحه عنوان بررسی شد؛ ناشر/مرجع روی جلد وزارت راه و شهرسازی و مرکز تحقیقات راه، مسکن و شهرسازی درج شده است. کنترل اصلاحیه‌ها و آخرین وضعیت اعتبار همچنان لازم است."},
  {id:"M10-1401",title:"مبحث دهم مقررات ملی ساختمان ـ طرح و اجرای ساختمان‌های فولادی",edition:"ویرایش ۱۴۰۱ (شناسه نسخه نیازمند تطبیق)",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"لینک مستقیم PDF روی دامنه inbr.ir پیدا شد؛ شناسنامه و اصلاحیه‌ها هنوز تطبیق نشده",url:"https://inbr.ir/upload/mabhas/1402-08/mabhas10-1402-08.pdf",notes:"لینک مستقیم از فهرست لینک‌های مقررات ملی استخراج شده؛ سال پوشه 1402-08 را نباید با سال ویرایش یکی دانست."},
  {id:"M7-1400",title:"مبحث هفتم ـ ژئوتکنیک و مهندسی پی",edition:"ویرایش ۱۴۰۰",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"لینک مستقیم PDF روی دامنه inbr.ir پیدا شد؛ شناسنامه و اصلاحیه‌ها هنوز تطبیق نشده",url:"https://inbr.ir/upload/mabhas/mabhas-7-1401-05.pdf",notes:"نشانی مستقیم PDF از فهرست لینک‌های مقررات ملی استخراج شده؛ شماره‌گذاری فایل به‌تنهایی اثبات‌کننده ویرایش/ابلاغ نیست."},
  {id:"M8-1398",title:"مبحث هشتم ـ طرح و اجرای ساختمان‌های با مصالح بنایی",edition:"ویرایش ۱۳۹۸ (شناسه نسخه نیازمند تطبیق)",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"لینک مستقیم PDF روی دامنه inbr.ir پیدا شد؛ شناسنامه و اصلاحیه‌ها هنوز تطبیق نشده",url:"https://inbr.ir/upload/mabhas/mabhas8-981.pdf",notes:"لینک مستقیم از فهرست لینک‌های مقررات ملی استخراج شده؛ صفحه عنوان و اصلاحیه‌ها باید پیش از استناد کنترل شوند."},
  {id:"M9-1399",title:"مبحث نهم ـ طرح و اجرای ساختمان‌های بتن‌آرمه",edition:"ویرایش پنجم، ۱۳۹۹",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"ابلاغ و لازم‌الاجرا شدن ویرایش پنجم در اطلاعیه منتشرشده توسط سازمان نظام کاردانی استان تهران ثبت شده؛ PDF مستقیم به‌علت محدودیت دسترسی/حجم هنوز کنترل صفحه عنوان نشده",url:"https://inbr.ir/upload/mabhas/1402-08/mabhas9-1402-08.pdf",notes:"اطلاعیه منتشرشده در ۱۳۹۹/۰۵/۱۳، ابلاغ ویرایش پنجم را اعلام می‌کند؛ منبع حقوقی ثانویه می‌گوید لازم‌الاجرا از ۱۳۹۹/۰۸/۲۰. فایل PDF در inbr.ir یافت شده ولی تا کنترل مستقیم شناسنامه و اصلاحیه‌ها، بندها/فرمول‌ها به موتور طراحی منتقل نمی‌شوند."},
  {id:"STD-2800-V4",title:"استاندارد ۲۸۰۰ ـ طراحی ساختمان‌ها در برابر زلزله",edition:"ویرایش چهارم",publisher:"مرجع تدوین استاندارد ۲۸۰۰",kind:"استاندارد ملی",status:"نسخه معرفی‌شده در منبع ثانویه؛ اصلاحیه‌ها باید کنترل شوند",url:"https://hamyarsaze.com/iran-code/",notes:"برای الزامات لرزه‌ای؛ تاریخ ابلاغ و اصلاحیه‌ها باید پیش از استفاده بررسی شود."}
 ],custom:[]};
 function all(){return [...state.records,...state.custom];}
 function getData(){return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;state.custom=Array.isArray(d.custom)?d.custom.filter(x=>x&&x.id&&x.title):[];render();}
 function render(){
  const body=$("codeReferenceRows");if(!body)return;body.replaceChildren();
  all().forEach(r=>{
   const tr=document.createElement("tr");
   [r.id,r.title,r.edition,r.status].forEach(v=>{const td=document.createElement("td");td.textContent=v||"—";tr.appendChild(td);});
   const td=document.createElement("td"),a=document.createElement("a");a.href=r.url;a.target="_blank";a.rel="noopener";a.textContent="مشاهده منبع";td.appendChild(a);tr.appendChild(td);body.appendChild(tr);
  });
 }
 function add(){
  const id=$("codeRefId").value.trim(),title=$("codeRefTitle").value.trim(),edition=$("codeRefEdition").value.trim(),url=$("codeRefUrl").value.trim();
  if(!id||!title||!edition||!/^https:\/\//i.test(url)){alert("کد، عنوان، ویرایش و نشانی HTTPS معتبر الزامی است.");return;}
  state.custom=state.custom.filter(x=>x.id!==id);
  state.custom.push({id,title,edition,publisher:$("codeRefPublisher").value.trim()||"نامشخص",kind:"منبع افزوده‌شده توسط کاربر",status:"تأییدنشده ـ نیازمند بررسی",url,notes:$("codeRefNotes").value.trim()});
  render();document.dispatchEvent(new Event("change",{bubbles:true}));
  const s=$("codeReferenceStatus");if(s)s.textContent="منبع افزوده شد؛ تا زمان بررسی فایل و مرجع رسمی، در محاسبات خودکار استفاده نمی‌شود.";
 }
 function mount(){
  if($("codeReferencePanel"))return;
  const p=document.createElement("section");p.className="panel";p.id="codeReferencePanel";
  p.innerHTML=`
   <div class="panel-title"><h3>دفترخانه مباحث و آیین‌نامه‌های مهندسی</h3><span class="status">ثبت منبع و ویرایش</span></div>
   <div class="notice">این فهرست برای مدیریت نسخه‌ها و ردیابی منابع است؛ ثبت یک لینک یا فایل، به معنی تأیید رسمی آن نیست. تا زمانی که متن سند، اصلاحیه‌ها و بند/جدول/صفحه کنترل نشده باشند، هیچ ضریب یا حکم آیین‌نامه‌ای از آن به موتور طراحی منتقل نمی‌شود.</div>
   <div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>کد</th><th>عنوان</th><th>ویرایش</th><th>وضعیت اعتبارسنجی</th><th>منبع</th></tr></thead><tbody id="codeReferenceRows"></tbody></table></div>
   <h4>افزودن منبع یا اصلاحیه جدید</h4>
   <div class="form-grid">
    <div class="field"><label for="codeRefId">کد یکتا</label><input id="codeRefId" placeholder="مثلاً M6-ERRATA-1402"></div>
    <div class="field"><label for="codeRefTitle">عنوان سند</label><input id="codeRefTitle"></div>
    <div class="field"><label for="codeRefEdition">ویرایش / تاریخ</label><input id="codeRefEdition"></div>
    <div class="field"><label for="codeRefPublisher">ناشر / مرجع</label><input id="codeRefPublisher"></div>
    <div class="field"><label for="codeRefUrl">لینک HTTPS</label><input id="codeRefUrl" type="url"></div>
    <div class="field"><label for="codeRefNotes">یادداشت بررسی</label><input id="codeRefNotes"></div>
   </div>
   <button id="codeRefAdd" class="btn primary" type="button">ثبت منبع</button>
   <div id="codeReferenceStatus" class="notice">منابع افزوده‌شده همراه فایل پروژه ذخیره می‌شوند.</div>
   <p class="geometry-hint">منابع اولیه: مبحث ۶ ویرایش ۱۳۹۸؛ مبحث ۱۰ ویرایش ۱۴۰۱؛ مباحث ۷، ۸ و ۹؛ استاندارد ۲۸۰۰ ویرایش چهارم. اصلاحیه‌ها و ابلاغیه‌های بعدی باید جداگانه ثبت و بررسی شوند.</p>
  `;
  const market=$("marketPricePanel"),footer=document.querySelector("footer");
  if(market)market.parentNode.insertBefore(p,market);else if(footer)footer.parentNode.insertBefore(p,footer);else document.querySelector("main")?.appendChild(p);
  $("codeRefAdd").addEventListener("click",add);render();
 }
 window.SteelCodeReferences={getData,setData,render};
 document.addEventListener("DOMContentLoaded",mount);
})();