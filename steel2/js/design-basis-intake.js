/* SAHROUD STEEL — project design-basis intake; evidence capture only, never design approval. */
(function(){
"use strict";
const fields=[
["projectName","شناسه/نام پروژه","text"],["siteLocation","موقعیت پروژه و مختصات","text"],["codeBasis","مبنای آیین‌نامه و ویرایش هر مبحث","textarea"],
["analysisMethod","روش تحلیل و طراحی (LRFD/ASD و توضیح)","text"],["steelGrade","گرید فولاد و منبع مشخصات","text"],["steelFy","تنش تسلیم و واحد","text"],
["concreteFc","مقاومت بتن و واحد","text"],["geotechRef","مرجع گزارش ژئوتکنیک / شماره و تاریخ","text"],["soilBearing","ظرفیت باربری مجاز/طراحی و واحد","text"],["groundwater","تراز آب زیرزمینی و تاریخ بررسی","text"],
["windBasis","سرعت باد، مبنا، رده زمین و منبع","textarea"],["snowBasis","بار برف و منبع اقلیمی","text"],["seismicBasis","پارامترهای لرزه‌ای و رده خاک","textarea"],
["craneCapacity","ظرفیت جرثقیل و تعداد جرثقیل‌ها","text"],["craneVendor","سازنده، مدل و دیتاشیت جرثقیل","text"],["craneWheelLoads","واکنش هر چرخ و حالت بارگذاری با واحد","textarea"],["craneGeometry","فاصله چرخ‌ها، محور ریل و ارتفاع ریل","textarea"],["craneDynamics","ضریب ضربه، نیروهای جانبی و کلاس کاری/خستگی","textarea"],
["drawingsRef","شماره و نسخه نقشه‌های معماری/سازه/جرثقیل","textarea"],["reviewer","نام/سمت بازبین مسئول و تاریخ بازبینی","text"]
];
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 if(document.getElementById("designBasisIntakePanel"))return;const anchor=document.getElementById("engineeringRoadmapPanel");if(!anchor)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="designBasisIntakePanel";
 const inputs=fields.map(([id,label,type])=>'<div class="field"><label for="basis_'+id+'">'+label+'</label>'+(type==="textarea"?'<textarea id="basis_'+id+'" rows="2" placeholder="اگر مشخص نیست، خالی بگذارید؛ حدس نزنید."></textarea>':'<input id="basis_'+id+'" type="text" placeholder="مقدار مستند یا نامشخص">')+'</div>').join("");
 panel.innerHTML='<div class="panel-title"><h3>دفتر ثبت مبنای طراحی و داده‌های مفقود</h3><span class="status">ثبت شواهد؛ بدون تأیید</span></div><p class="notice">این فرم برای گردآوری داده‌های پروژه است. تکمیل فیلدها به معنی صحت داده، کفایت ورودی یا تأیید طراحی نیست. برای هر مقدار باید سند، واحد، تاریخ و مسئول بررسی مشخص باشد.</p><div class="form-grid">'+inputs+'</div><div class="actions"><button type="button" id="btnBasisAssess">ارزیابی کامل‌بودن اطلاعات</button><button type="button" id="btnBasisExport">خروجی دفتر مبنای طراحی (JSON)</button><button type="button" id="btnBasisReset">پاک‌کردن فرم</button></div><div id="basisReadiness" class="result-box">هنوز ارزیابی انجام نشده است.</div>';
 anchor.parentNode.insertBefore(panel,anchor.nextSibling);
 $("btnBasisAssess").addEventListener("click",assess);$("btnBasisExport").addEventListener("click",exportData);$("btnBasisReset").addEventListener("click",()=>{fields.forEach(f=>{$("basis_"+f[0]).value="";});$("basisReadiness").textContent="فرم پاک شد؛ هیچ داده‌ای ذخیره یا به پروژه فعال منتقل نشده است.";});
}
const $=id=>document.getElementById(id);
function collect(){const data={};fields.forEach(([id])=>data[id]=$("basis_"+id)?.value.trim()||null);return data;}
function assess(){
 const data=collect(),missing=fields.filter(([id])=>!data[id]).map(([,label])=>label),present=fields.length-missing.length;
 $("basisReadiness").innerHTML='<strong>فیلدهای دارای مقدار: '+present+' از '+fields.length+'</strong><p>فیلدهای خالی: '+missing.length+'</p><ul>'+missing.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul><p><strong>وضعیت:</strong> اطلاعات هنوز از نظر منبع، واحد و صحت فنی تأیید نشده‌اند. هیچ طراحی یا تحلیل بر اساس این فرم اجرا نمی‌شود.</p>';
}
function exportData(){
 const payload={schema:"sahroud-steel-design-basis-intake-v1",createdAt:new Date().toISOString(),status:"evidence_collection_only",completeFields:fields.filter(([id])=>collect()[id]).length,totalFields:fields.length,designApproved:false,solverEligible:false,data:collect(),requiredFollowUp:"Attach source document, page/cell/element locator, units, issue date and reviewer for each value."};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-design-basis-intake.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
window.SteelDesignBasisIntake={fields:fields.map(x=>({id:x[0],label:x[1]})),collect};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();