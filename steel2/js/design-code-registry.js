/* SAHROUD STEEL — controlled design-code register.
 * National Iranian requirements are primary. International specifications are
 * supplementary only where explicitly identified; they never silently replace
 * an applicable Iranian requirement.
 */
(function(root){
"use strict";
const codes=[
 {id:"m6",name:"مبحث ششم مقررات ملی ساختمان",edition:"ویرایش چهارم، ۱۳۹۸",scope:"بارهای مرده، زنده، برف، باد، باران و ترکیبات بار",status:"primary",modules:["loads","roof","frame","serviceability"],source:"https://acedco.com/product/mabhas6/"},
 {id:"m10",name:"مبحث دهم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۴۰۱",scope:"طراحی و اجرای فولاد؛ اعضا، پایداری، اتصالات، الزامات لرزه‌ای و ساخت",status:"primary",modules:["steel-members","columns","rafters","bracing","connections","fabrication"],source:"https://technobetar.ir/code/nbri/mabhas-10"},
 {id:"std2800",name:"استاندارد ۲۸۰۰ ایران",edition:"ویرایش پنجم؛ ابلاغ لازم‌الاجرا در ۱۴۰۵ (طبق اطلاعیه ابلاغ)",scope:"خطر لرزه‌ای، سیستم سازه‌ای، تحلیل و طراحی لرزه‌ای و اجزای غیرسازه‌ای",status:"primary",modules:["seismic","global-stability","nonstructural"],source:"https://irceo.ir/fa/news/36295/"},
 {id:"m7",name:"مبحث هفتم مقررات ملی ساختمان",edition:"ویرایش چهارم، ۱۴۰۰",scope:"ژئوتکنیک، ظرفیت باربری، نشست، گودبرداری و پی‌سازی",status:"primary",modules:["geotechnical","foundations","settlement"],source:"https://archweb.ir/2024/09/26/"},
 {id:"m9",name:"مبحث نهم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۳۹۹",scope:"طراحی و اجرای بتن‌آرمه؛ پی، شناژ و جزئیات آرماتور",status:"primary",modules:["footings","tie-beams","reinforced-concrete"],source:"https://archweb.ir/2024/06/08/"},
 {id:"aisi-s100",name:"AISI S100",edition:"2024 Edition (مرجع تکمیلی)",scope:"اعضای فولادی سردنوردشده نازک‌جداره مانند لاپه‌های Z و C",status:"supplementary",modules:["cold-formed-purlins"],source:"https://www.cfsteel.org/publications"},
 {id:"aisc360",name:"ANSI/AISC 360-22",edition:"2022 Edition (مرجع تطبیقی تکمیلی)",scope:"مشخصات طراحی سازه‌های فولادی؛ فقط برای تطبیق و کنترل مستقل",status:"supplementary",modules:["steel-members","connections","benchmark"],source:"https://www.aisc.org/aisc/publications/current-standards/aisc-360/"},
 {id:"aws-d11",name:"AWS D1.1/D1.1M",edition:"نسخه قرارداد/پروژه باید تعیین شود",scope:"کیفیت و الزامات جوشکاری سازه‌های فولادی",status:"pending",modules:["welds","fabrication"],source:"https://www.aws.org/"},
];
const moduleMap=[
 ["بارگذاری و ترکیبات بار","m6"],["قاب، تیر و ستون فولادی","m10 + std2800"],["مهاربند و پایداری لرزه‌ای","m10 + std2800"],["لاپه Z/C سردنورد","m10 + aisi-s100"],["اتصالات پیچ و جوش","m10 + aws-d11"],["صفحه‌ستون و انکر","m10 + m9"],["فونداسیون و شناژ","m7 + m9"],["کنترل مستقل و مقایسه","aisc360 (تکمیلی)"]];
function getData(){return {schemaVersion:1,primary:"Iran National Building Regulations",codes:codes.map(c=>({...c})),moduleMap:moduleMap.map(x=>({module:x[0],basis:x[1]})),policy:"No foreign standard silently overrides Iranian mandatory requirements. Each calculation must record code edition, clause, assumptions, units and validation state."};}
function render(){
 const host=document.getElementById("designCodeRegistryContent");if(!host)return;
 host.innerHTML='<div class="notice"><b>سیاست مبنای طراحی:</b> مقررات ملی ایران مرجع اصلی است. استانداردهای بین‌المللی فقط مرجع تکمیلی/تطبیقی‌اند و جایگزین خودکار ضوابط ملی نمی‌شوند.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:760px;width:100%"><thead><tr><th>مرجع</th><th>ویرایش مبنا</th><th>حوزه کاربرد</th><th>وضعیت</th></tr></thead><tbody>'+
 codes.map(c=>'<tr><td><a href="'+c.source+'" target="_blank" rel="noopener">'+c.name+'</a></td><td>'+c.edition+'</td><td>'+c.scope+'</td><td>'+(c.status==="primary"?"مرجع اصلی":c.status==="supplementary"?"تکمیلی":"نیازمند تعیین ویرایش")+'</td></tr>').join("")+
 '</tbody></table></div><h4>اتصال مرجع به بخش‌های نرم‌افزار</h4><ul>'+moduleMap.map(x=>'<li><b>'+x[0]+'</b>: '+x[1]+'</li>').join("")+'</ul>'+
 '<div class="notice">هشدار نسخه: پیش از صدور گزارش طراحی باید متن رسمی، اصلاحیه‌ها، تاریخ لازم‌الاجرا شدن و بند دقیق هر کنترل ثبت شود. این فهرست، رجیستر مبناست و به‌تنهایی اثبات‌کننده انطباق محاسبات موجود نیست.</div>';
}
function init(){
 if(document.getElementById("designCodeRegistryPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const sec=document.createElement("section");sec.className="panel";sec.id="designCodeRegistryPanel";
 sec.innerHTML='<div class="panel-title"><h3>مبنای آیین‌نامه‌ای و کنترل نسخه‌ها</h3><span class="status">مرجع اصلی: مقررات ملی ایران</span></div><div id="designCodeRegistryContent"></div>';
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",sec);else main.appendChild(sec);
 render();
}
root.SteelDesignCodes={getData,render,codes:codes.map(c=>({...c}))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
