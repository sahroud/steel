/* SAHROUD STEEL — member design input readiness audit.
 * Reports missing/uncertain inputs only; never calculates capacity or passes a member.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const groups=[["column","ستون"],["rafter","رفتر"],["endPost","ستونک انتهایی"],["endGirt","تیر انتهایی"],["roofBrace","مهاربند سقف"],["wallBrace","مهاربند دیوار"],["roofEdge","عضو لبه سقف"]];
function audit(){
 const issues=[],notes=[],sections=window.SteelSections?.read?.(),inputs=window.SteelMemberDesignInputs?.readUI?.(),geom=window.SteelSectionGeometry?.getData?.();
 if(!sections)issues.push("پنل مشخصات مصالح و مقاطع در دسترس نیست.");
 else{
  const m=sections.material||{};
  if(!(m.grade&&m.Fy_MPa>0&&m.Fu_MPa>=m.Fy_MPa))issues.push("مشخصات عمومی فولاد (گرید، Fy و Fu) کامل/معتبر نیست.");
  if(!(m.E_GPa>0))issues.push("مدول الاستیسیته E معتبر نیست.");
  if(!(sections.analysis3d?.G_GPa>0))issues.push("مدول برشی G معتبر نیست.");
  ["column","rafter"].forEach(k=>{const x=sections[k]||{};["A_cm2","Ix_cm4","Iy_cm4"].forEach(f=>{if(!(Number(x[f])>0))issues.push(k+": "+f+" وارد نشده است.");});});
 }
 if(inputs){
  const d=inputs.groups||{};
  groups.forEach(([k,label])=>{const x=d[k]||{};if(x.applyToAll){["Fy","Fu","Kx","Ky","Lcx","Lcy","Lb","Cb"].forEach(f=>{if(!(Number(x[f])>0))issues.push(label+": "+f+" برای تعمیم گروهی ناقص است.");});if(x.Fu<x.Fy)issues.push(label+": Fu از Fy کمتر است.");}});
 }else notes.push("رجیستر پارامترهای طراحی اعضا هنوز بارگذاری نشده است.");
 if(geom){
  ["column","rafter"].forEach(k=>{const x=geom.groups?.[k]||{};const n=["d","bf","tw","tf"].filter(f=>!(Number(x[f])>0));if(!n.length)notes.push(k+": داده هندسه I ثبت شده؛ اجرای مقایسه هندسی به درخواست کاربر/اپراتور نیاز دارد.");});
 }
 notes.push("اعضای سردنورد سقف/دیوار و شناژ بتنی خارج از کنترل اعضای نوردشده این گزارش هستند.");
 return {readyForDataReview:issues.length===0,issues,notes,disclaimer:"کامل بودن ورودی‌ها به معنی کنترل مقاومت، پایداری یا تأیید آیین‌نامه‌ای عضو نیست."};
}
function renderResult(r){
 const host=$("memberDesignReadinessResults");if(!host)return;
 host.innerHTML="<h4>"+(r.readyForDataReview?"ورودی‌های پایه برای بازبینی اولیه موجودند":"موارد نیازمند تکمیل")+"</h4>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+x+"</li>").join("")+"</ul>":"<p>در کنترل‌های اولیه این گزارش، کمبود اجباری شناسایی نشد.</p>")+"<ul>"+r.notes.map(x=>"<li>"+x+"</li>").join("")+"</ul><div class='notice'>"+r.disclaimer+"</div>";
}
function init(){if($("memberDesignReadinessPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="memberDesignReadinessPanel";p.innerHTML="<div class='panel-title'><h3>آمادگی داده‌های طراحی اعضا</h3><span class='status'>ممیزی ورودی‌ها</span></div><div class='notice'>این گزارش فقط کامل بودن ورودی‌ها و تفکیک حوزه کنترل را بررسی می‌کند.</div><div class='button-grid'><button class='btn primary' id='btnMemberDesignReadiness' type='button'>ممیزی ورودی‌های طراحی</button></div><div id='memberDesignReadinessResults'></div>";const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);$("btnMemberDesignReadiness").addEventListener("click",()=>renderResult(audit()));}
root.SteelMemberDesignReadiness={audit};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
