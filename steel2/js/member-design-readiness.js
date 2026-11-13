/* SAHROUD STEEL — member design input readiness audit.
 * Reports missing/uncertain inputs only; never calculates capacity or passes a member.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const groups=[["column","ستون"],["rafter","رفتر"],["endPost","ستونک انتهایی"],["endGirt","تیر انتهایی"],["roofBrace","مهاربند سقف"],["wallBrace","مهاربند دیوار"],["roofEdge","عضو لبه سقف"]];
function audit(){
 const issues=[],warnings=[],notes=[],sections=window.SteelSections?.read?.(),inputs=window.SteelMemberDesignInputs?.readUI?.(),geom=window.SteelSectionGeometry?.getData?.();
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
  groups.forEach(([k,label])=>{const x=d[k]||{};if(x.applyToAll){["Fy","Fu","Kx","Ky","Lcx","Lcy","Lb","Cb"].forEach(f=>{if(!(Number(x[f])>0))issues.push(label+": "+f+" برای تعمیم گروهی ناقص است.");});if(x.Fu<x.Fy)issues.push(label+": Fu از Fy کمتر است.");}if(!(Number(x.t_mm)>0))notes.push(label+": ضخامت اختصاصی ثبت نشده؛ ضخامت عمومی مصالح به ارث می‌رسد و باید یکسان بودن ضخامت اعضای این گروه تأیید شود.");});
 }else notes.push("رجیستر پارامترهای طراحی اعضا هنوز بارگذاری نشده است.");
 if(geom){
  ["column","rafter"].forEach(k=>{
   const x=geom.groups?.[k]||{},missing=["d","bf","tw","tf"].filter(f=>!(Number(x[f])>0));
   if(missing.length){notes.push(k+": هندسه I کامل نیست ("+missing.join("، ")+").");return;}
   try{
    const calc=window.SteelSectionGeometry.calculateISection(x),actual=sections?.[k]||{};
    [["A_cm2","A"],["Ix_cm4","Ix"],["Iy_cm4","Iy"],["SxTop_cm3","SxTop"],["SxBottom_cm3","SxBottom"],["Sy_cm3","Sy"]].forEach(([field,label])=>{
     if(Number(actual[field])>0){const delta=Math.abs(calc[field]-Number(actual[field]))/Number(actual[field])*100;if(delta>3)warnings.push(k+": اختلاف "+label+" بین هندسه واردشده و خاصیت ثبت‌شده "+delta.toFixed(1)+"٪ است؛ ابعاد، واحدها و مدل مقطع را بازبینی کنید.");}
    });
   }catch(e){issues.push(k+": "+e.message);}
  });
  notes.push("مقایسه هندسی برای I متقارن منشوری و بدون شعاع گوشه/جزئیات جوش است؛ برای رفتر متغیرعمق این مقایسه مرجع نهایی نیست.");
 }
 notes.push("اعضای سردنورد سقف/دیوار و شناژ بتنی خارج از کنترل اعضای نوردشده این گزارش هستند.");
 return {readyForDataReview:issues.length===0,issues,warnings,notes,disclaimer:"کامل بودن ورودی‌ها به معنی کنترل مقاومت، پایداری یا تأیید آیین‌نامه‌ای عضو نیست."};
}
function renderResult(r){
 const host=$("memberDesignReadinessResults");if(!host)return;
 host.innerHTML="<h4>"+(r.readyForDataReview?"ورودی‌های پایه برای بازبینی اولیه موجودند":"موارد نیازمند تکمیل")+"</h4>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+x+"</li>").join("")+"</ul>":"<p>در کنترل‌های اولیه این گزارش، کمبود اجباری شناسایی نشد.</p>")+(r.warnings.length?"<h4>اختلاف‌های نیازمند بازبینی</h4><ul>"+r.warnings.map(x=>"<li>"+x+"</li>").join("")+"</ul>":"")+"<ul>"+r.notes.map(x=>"<li>"+x+"</li>").join("")+"</ul><div class='notice'>"+r.disclaimer+"</div>";
}
function init(){if($("memberDesignReadinessPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="memberDesignReadinessPanel";p.innerHTML="<div class='panel-title'><h3>آمادگی داده‌های طراحی اعضا</h3><span class='status'>ممیزی ورودی‌ها</span></div><div class='notice'>این گزارش فقط کامل بودن ورودی‌ها و تفکیک حوزه کنترل را بررسی می‌کند.</div><div class='button-grid'><button class='btn primary' id='btnMemberDesignReadiness' type='button'>ممیزی ورودی‌های طراحی</button></div><div id='memberDesignReadinessResults'></div>";const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);$("btnMemberDesignReadiness").addEventListener("click",()=>renderResult(audit()));}
root.SteelMemberDesignReadiness={audit};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
