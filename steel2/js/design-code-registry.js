/* SAHROUD STEEL — controlled design-code register.
 * Iranian mandatory requirements are primary. Supplementary standards never
 * silently replace them. Applicability and edition are project-controlled.
 */
(function(root){
"use strict";
const codes=[
 {id:"m5",name:"مبحث پنجم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۳۹۶",scope:"مصالح و فرآورده‌ها؛ انطباق محصول، مشخصات و مدارک مصالح",status:"primary",modules:["materials","steel-products","concrete-materials"],source:"https://qsce.ir/uploads/مبحث%20پنجم%20مقررات%20ملی.pdf"},
 {id:"m6",name:"مبحث ششم مقررات ملی ساختمان",edition:"ویرایش چهارم، ۱۳۹۸",scope:"بارهای مرده، زنده، برف، باد، باران و ترکیبات بار",status:"primary",modules:["loads","roof","frame","serviceability"],source:"https://archweb.ir/2024/09/26/"},
 {id:"m7",name:"مبحث هفتم مقررات ملی ساختمان",edition:"ویرایش چهارم، ۱۴۰۰",scope:"ژئوتکنیک، ظرفیت باربری، نشست، گودبرداری و پی‌سازی",status:"primary",modules:["geotechnical","foundations","settlement"],source:"https://archweb.ir/2024/09/26/"},
 {id:"m9",name:"مبحث نهم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۳۹۹",scope:"طراحی و اجرای بتن‌آرمه؛ پی، شناژ و جزئیات آرماتور",status:"primary",modules:["footings","tie-beams","reinforced-concrete"],source:"https://archweb.ir/2024/09/26/"},
 {id:"m10",name:"مبحث دهم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۴۰۱",scope:"طراحی و اجرای فولاد؛ اعضا، پایداری، اتصالات، الزامات لرزه‌ای و ساخت",status:"primary",modules:["steel-members","columns","rafters","bracing","connections","fabrication"],source:"https://technobetar.ir/code/nbri/mabhas-10"},
 {id:"m11",name:"مبحث یازدهم مقررات ملی ساختمان",edition:"ویرایش سوم، ۱۴۰۰",scope:"الزامات مرتبط با طرح و اجرای صنعتی ساختمان‌ها؛ در بخش‌های واقعاً مشمول پروژه",status:"primary",modules:["industrial-building","fabrication","erection"],source:"https://archweb.ir/2024/09/26/"},
 {id:"std2800",name:"استاندارد ۲۸۰۰ ایران",edition:"ویرایش چهارم و پنجم؛ اجرای همزمان تا پایان اردیبهشت ۱۴۰۶ تمدید شده است",scope:"خطر لرزه‌ای، سیستم سازه‌ای، تحلیل و طراحی لرزه‌ای و اجزای غیرسازه‌ای",status:"primary-transition",modules:["seismic","global-stability","nonstructural"],source:"https://irceo.ir/fa/news/36432/"},
 {id:"aisi-s100",name:"AISI S100",edition:"2024 Edition (مرجع تکمیلی؛ مشروط به تعیین روش مجاز و تأیید پروژه)",scope:"اعضای فولادی سردنوردشده نازک‌جداره مانند لاپه‌های Z و C؛ نه جایگزین خودکار مبحث دهم",status:"supplementary",modules:["cold-formed-purlins"],source:"https://www.cfsteel.org/publications"},
 {id:"aisc360",name:"ANSI/AISC 360-22",edition:"2022 Edition (مرجع تطبیقی تکمیلی)",scope:"تطبیق و کنترل مستقل؛ فقط در حدودی که با ضوابط لازم‌الاجرای ایران تعارض نداشته باشد",status:"supplementary",modules:["steel-members","connections","benchmark"],source:"https://www.aisc.org/aisc/publications/current-standards/aisc-360/"},
 {id:"aws-d11",name:"AWS D1.1/D1.1M",edition:"نسخه قرارداد/پروژه باید صریحاً تعیین و با مبحث دهم تطبیق داده شود",scope:"کیفیت و الزامات جوشکاری سازه‌های فولادی در حدود کاربرد مصوب پروژه",status:"pending",modules:["welds","fabrication"],source:"https://www.aws.org/"}
];
const materialNotes=[
 "نام‌های تجاری/تاریخی مانند ST37 و ST52 به‌تنهایی اثبات‌کننده انطباق محصول با مصالح مجاز و مشخصات مبحث دهم نیستند.",
 "برای هر محموله باید استاندارد محصول، گرید/زیرگرید، ضخامت، گواهی کارخانه، خواص مکانیکی و الزامات چقرمگی حسب مورد بررسی شود.",
 "خواص مصالح نامعلوم یا فاقد مدرک معتبر نباید با مقدار پیش‌فرض به طراحی تأییدشده راه یابند."
];
const moduleMap=[
 ["بارگذاری و ترکیبات بار","مبحث ششم ۱۳۹۸"],
 ["قاب، تیر و ستون فولادی","مبحث دهم ۱۴۰۱ + استاندارد ۲۸۰۰ با ویرایش انتخاب‌شده پروژه"],
 ["مهاربند و پایداری لرزه‌ای","مبحث دهم + ویرایش انتخاب‌شده استاندارد ۲۸۰۰"],
 ["لاپه Z/C سردنورد","مبحث دهم + روش تکمیلی سردنوردِ صریحاً مجاز و ثبت‌شده"],
 ["اتصالات پیچ و جوش","مبحث دهم؛ استاندارد تکمیلی فقط با تعیین نسخه و دامنه"],
 ["صفحه‌ستون و انکر","مبحث دهم + مبحث نهم + ضوابط ژئوتکنیکی مربوط"],
 ["فونداسیون و شناژ","مبحث هفتم + مبحث نهم"],
 ["مصالح و گواهی محصول","مبحث پنجم + الزامات مصالح مبحث دهم"],
 ["ساخت و نصب صنعتی","مبحث یازدهم در حدود شمول + مبحث دهم"]
];
const transition={
 code:"std2800",
 notice:"اجرای همزمان ویرایش چهارم و پنجم استاندارد ۲۸۰۰ تا پایان اردیبهشت ۱۴۰۶ تمدید شده است.",
 projectRule:"نسخه حاکم باید برای هر پروژه صریحاً با توجه به تاریخ و ضوابط ابلاغی/مرجع صدور پروانه تعیین و در پرونده پروژه ثبت شود. نرم‌افزار نباید ویرایش چهارم و پنجم را در یک پروژه بی‌قاعده مخلوط کند یا بدون انتخاب مستند یکی را تحمیل کند.",
 officialSource:"https://irceo.ir/fa/news/36432/"
};
function getData(){return {schemaVersion:2,primary:"مقررات ملی ساختمان ایران و ضوابط لازم‌الاجرای پروژه",codes:codes.map(c=>({...c})),materialNotes:[...materialNotes],moduleMap:moduleMap.map(x=>({module:x[0],basis:x[1]})),transition:{...transition},policy:"هر کنترل باید مرجع، ویرایش، بند دقیق، ورودی‌ها، واحدها، فرضیات، نتیجه و وضعیت اعتبارسنجی خود را ثبت کند. مرجع بین‌المللی فقط تکمیلی است و جایگزین خودکار الزام ایرانی نیست."};}
function render(){
 const host=root.document?.getElementById("designCodeRegistryContent");if(!host)return;
 const status=c=>c.status==="primary"?"مرجع اصلی":c.status==="primary-transition"?"مرجع اصلی با دوره گذار":c.status==="supplementary"?"تکمیلی":"نیازمند تعیین ویرایش";
 host.innerHTML='<div class="notice"><b>سیاست مبنای طراحی:</b> مقررات ملی و ضوابط لازم‌الاجرای ایران مرجع اصلی‌اند. استاندارد خارجی جایگزین خودکار ضابطه ملی نمی‌شود.</div>'+
 '<div class="notice"><b>وضعیت استاندارد ۲۸۰۰:</b> '+transition.notice+' '+transition.projectRule+' <a href="'+transition.officialSource+'" target="_blank" rel="noopener">اطلاعیه رسمی شورای مرکزی</a></div>'+
 '<div class="notice"><b>کنترل مصالح:</b> '+materialNotes.join(" ")+'</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:760px;width:100%"><thead><tr><th>مرجع</th><th>ویرایش/وضعیت</th><th>حوزه کاربرد</th><th>طبقه</th></tr></thead><tbody>'+
 codes.map(c=>'<tr><td><a href="'+c.source+'" target="_blank" rel="noopener">'+c.name+'</a></td><td>'+c.edition+'</td><td>'+c.scope+'</td><td>'+status(c)+'</td></tr>').join("")+
 '</tbody></table></div><h4>اتصال مرجع به بخش‌های نرم‌افزار</h4><ul>'+moduleMap.map(x=>'<li><b>'+x[0]+'</b>: '+x[1]+'</li>').join("")+'</ul>'+
 '<div class="notice">این رجیستر، فهرست مبانی و کنترل نسخه‌هاست؛ به‌تنهایی اثبات‌کننده انطباق محاسبات نیست. گزارش طراحی بدون ثبت بند دقیق و وضعیت کنترل، نباید تأییدشده نمایش داده شود.</div>';
}
function selfTest(){
 const ids=new Set(codes.map(c=>c.id));
 const tests=[
  {name:"Iranian core references include loads, steel, geotechnics and reinforced concrete",ok:["m6","m10","m7","m9"].every(x=>ids.has(x))},
  {name:"industrial building requirements are represented",ok:ids.has("m11")},
  {name:"material conformity basis is represented",ok:ids.has("m5")},
  {name:"2800 transition is explicit through end of Ordibehesht 1406",ok:transition.notice.includes("اردیبهشت ۱۴۰۶")&&transition.projectRule.includes("صریحاً")},
  {name:"supplementary foreign standards are not marked primary",ok:codes.filter(c=>["aisi-s100","aisc360"].includes(c.id)).every(c=>c.status==="supplementary")},
  {name:"no default selection silently mixes 2800 editions",ok:transition.projectRule.includes("مخلوط")},
  {name:"material certificates remain required evidence",ok:materialNotes.some(x=>x.includes("گواهی کارخانه"))}
 ];
 return {passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok).length,total:tests.length,tests,designApproved:false};
}
function init(){
 if(root.document.getElementById("designCodeRegistryPanel"))return;
 const main=root.document.querySelector("main");if(!main)return;
 const sec=root.document.createElement("section");sec.className="panel";sec.id="designCodeRegistryPanel";
 sec.innerHTML='<div class="panel-title"><h3>مبنای آیین‌نامه‌ای و کنترل نسخه‌ها</h3><span class="status">مرجع اصلی: مقررات ملی ایران</span></div><div id="designCodeRegistryContent"></div>';
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",sec);else main.appendChild(sec);
 render();
}
root.SteelDesignCodes={getData,render,selfTest,codes:codes.map(c=>({...c}))};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
