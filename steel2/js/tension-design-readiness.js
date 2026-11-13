/* SAHROUD STEEL — tensile-member input completeness audit.
 * This module intentionally does NOT calculate tensile resistance.
 * M10 clause 10-2-3 and connection/block-shear checks require verified
 * official clauses, section geometry and connection-specific data.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const GROUPS=[["roofBrace","مهارب سقف"],["wallBrace","مهارب دیوار"],["endPost","ستونک انتهایی"]];
const FIELDS=[["Ag_cm2","سطح ناخالص Ag (cm²)"],["An_cm2","سطح خالص An (cm²)"],["Ae_cm2","سطح خالص مؤثر Ae (cm²)"],["U","ضریب تأخیر برشی U"],["eccentricity_mm","خروج از مرکزیت اتصال (mm)"],["forceDemandKN","نیروی کششی تقاضا (kN)"]];
let data={schemaVersion:1,groups:{}};
function fresh(){const o={schemaVersion:1,groups:{}};GROUPS.forEach(([g])=>o.groups[g]={});return o;}
function normalize(v){
 const out=fresh();
 GROUPS.forEach(([g])=>{
  const s=v?.groups?.[g]||{},d={};
  FIELDS.forEach(([k])=>{const n=Number(s[k]);d[k]=s[k]!==undefined&&s[k]!==null&&s[k]!==""&&Number.isFinite(n)?n:null;});
  d.connectionType=["bolted","welded","unknown"].includes(s.connectionType)?s.connectionType:"unknown";
  ["holePatternReviewed","connectionDetailsReviewed","blockShearReviewed"].forEach(k=>d[k]===undefined&&(d[k]=s[k]===true));
  ["holePatternReviewed","connectionDetailsReviewed","blockShearReviewed"].forEach(k=>d[k]=s[k]===true);
  out.groups[g]=d;
 });
 return out;
}
function setData(v){data=normalize(v);render();}
function getData(){return JSON.parse(JSON.stringify(data));}
function readUI(){
 GROUPS.forEach(([g])=>{
  const d={};
  FIELDS.forEach(([k])=>{const e=$("tension_"+g+"_"+k);d[k]=e&&e.value!==""?Number(e.value):null;});
  d.connectionType=$("tension_"+g+"_connectionType")?.value||"unknown";
  ["holePatternReviewed","connectionDetailsReviewed","blockShearReviewed"].forEach(k=>d[k]=!!$("tension_"+g+"_"+k)?.checked);
  data.groups[g]=d;
 });
 return getData();
}
function audit(input){
 const src=input?normalize(input):readUI(),issues=[],warnings=[],groups={};
 GROUPS.forEach(([g,label])=>{
  const d=src.groups[g],local=[];
  if(!(d.Ag_cm2>0))local.push("سطح ناخالص Ag وارد نشده است.");
  if(!(d.An_cm2>0))local.push("سطح خالص An وارد نشده است؛ آرایش سوراخ‌ها و مسیر گسیختگی باید مستند شود.");
  if(d.Ag_cm2>0&&d.An_cm2>d.Ag_cm2) local.push("An نمی‌تواند از Ag بزرگ‌تر باشد.");
  const hasAe=d.Ae_cm2>0,hasU=d.U>0&&d.U<=1;
  if(!hasAe&&!hasU)local.push("Ae یا U معتبر وارد نشده است.");
  if(d.U!==null&&d.U!==undefined&&!(d.U>0&&d.U<=1))local.push("U باید بزرگ‌تر از صفر و حداکثر برابر ۱ باشد.");
  if(hasAe&&d.An_cm2>0&&hasU){
   const calc=d.An_cm2*d.U,delta=Math.abs(d.Ae_cm2-calc)/Math.max(calc,1e-9)*100;
   if(delta>3)warnings.push(label+": اختلاف Ae با An×U برابر "+delta.toFixed(1)+"٪ است؛ داده‌ها بازبینی شوند.");
  }
  if(d.connectionType==="unknown")local.push("نوع اتصال (پیچی یا جوشی) مشخص نشده است.");
  if(d.connectionType==="bolted"&&!d.holePatternReviewed)local.push("بازبینی قطر، تعداد، فاصله و آرایش سوراخ‌ها تأیید نشده است.");
  if(!d.connectionDetailsReviewed)local.push("جزئیات اتصال و مسیر انتقال نیرو بازبینی نشده است.");
  if(!d.blockShearReviewed)local.push("کنترل مستقل گسیختگی بلوکی اتصال (مبحث ۱۰، بند ۱۰-۲-۹) تأیید نشده است.");
  const mat=root.SteelMemberDesignInputs?.getForGroup?.(g)||{};
  if(!(Number(mat.Fy)>0))local.push("Fy معتبر گروه عضو در ورودی مصالح موجود نیست.");
  if(!(Number(mat.Fu)>0))local.push("Fu معتبر گروه عضو در ورودی مصالح موجود نیست.");
  if(!(d.forceDemandKN>0))warnings.push(label+": نیروی کششی تقاضا وارد نشده؛ اتصال به پوش نیروها هنوز انجام نشده است.");
  groups[g]={label,complete:local.length===0,issues:local,connectionType:d.connectionType,Ag_cm2:d.Ag_cm2,An_cm2:d.An_cm2,Ae_cm2:d.Ae_cm2,U:d.U};
  local.forEach(x=>issues.push(label+": "+x));
 });
 return {schemaVersion:1,readyForDataReview:issues.length===0,issues,warnings,groups,
  note:"این ممیزی فقط کفایت داده‌های ورودی را می‌سنجد. ظرفیت تسلیم سطح ناخالص، گسیختگی سطح خالص/مؤثر، تأخیر برشی، خروج از مرکزیت و گسیختگی بلوکی محاسبه نشده‌اند.",
  disclaimer:"تا زمان پیاده‌سازی و اعتبارسنجی ضوابط رسمی مبحث دهم، این گزارش مجوز طراحی یا اجرا نیست."};
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 const host=$("tensionDesignContent");if(!host)return;
 host.innerHTML=GROUPS.map(([g,label])=>{
  const d=data.groups[g]||{};
  const fields=FIELDS.map(([k,caption])=>'<div class="field"><label for="tension_'+g+'_'+k+'">'+caption+'</label><input type="number" step="any" id="tension_'+g+'_'+k+'" value="'+(d[k]??"")+'"></div>').join("");
  return '<details class="sub-panel"><summary>'+label+'</summary><div class="form-grid">'+fields+
   '<div class="field"><label for="tension_'+g+'_connectionType">نوع اتصال</label><select id="tension_'+g+'_connectionType"><option value="unknown">مشخص نشده</option><option value="bolted">پیچی</option><option value="welded">جوشی</option></select></div></div>'+
   '<div class="form-grid"><label><input type="checkbox" id="tension_'+g+'_holePatternReviewed" '+(d.holePatternReviewed?'checked':'')+'> آرایش سوراخ‌ها و سطح خالص بازبینی شد</label><label><input type="checkbox" id="tension_'+g+'_connectionDetailsReviewed" '+(d.connectionDetailsReviewed?'checked':'')+'> جزئیات اتصال و انتقال نیرو بازبینی شد</label><label><input type="checkbox" id="tension_'+g+'_blockShearReviewed" '+(d.blockShearReviewed?'checked':'')+'> کنترل گسیختگی بلوکی جداگانه انجام شد</label></div></details>';
 }).join("");
 GROUPS.forEach(([g])=>{const el=$("tension_"+g+"_connectionType");if(el)el.value=data.groups[g].connectionType||"unknown";});
}
function renderResult(r){
 const host=$("tensionDesignResults");if(!host)return;
 host.innerHTML="<h4>"+(r.readyForDataReview?"داده‌های اولیه تکمیل شده‌اند؛ هنوز ظرفیت محاسبه نشده":"ورودی‌های ناقص برای طراحی کششی")+"</h4>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>کمبود اجباری در این ممیزی شناسایی نشد.</p>")+(r.warnings.length?"<h4>هشدارها</h4><ul>"+r.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<div class='notice'>"+esc(r.note)+"<br>"+esc(r.disclaimer)+"</div>";
}
function init(){
 if($("tensionDesignReadinessPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="tensionDesignReadinessPanel";
 p.innerHTML="<div class='panel-title'><h3>ورودی‌های طراحی اعضای کششی</h3><span class='status'>ممیزی داده‌ها — بدون محاسبه ظرفیت</span></div><div class='notice'>برای مهاربندهای سقف و دیوار و ستونک انتهایی. اطلاعات سطح مقطع و اتصال را وارد کنید؛ این بخش فعلاً هیچ ظرفیت مقاومتی صادر نمی‌کند.</div><div id='tensionDesignContent'></div><div class='button-grid'><button class='btn secondary' id='btnTensionDesignAudit' type='button'>ذخیره ورودی‌ها و ممیزی</button></div><div id='tensionDesignResults'></div>";
 const anchor=$("memberDesignReadinessPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 render();
 $("btnTensionDesignAudit").addEventListener("click",()=>{readUI();renderResult(audit(data));});
}
root.SteelTensionDesignReadiness={getData,setData,readUI,audit,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
