/* SAHROUD STEEL — compression-member readiness audit.
 * Input audit only. No buckling resistance or code pass is calculated here.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const GROUPS=[["column","ستون"],["rafter","رفتر"],["endPost","ستونک انتهایی"],["endGirt","تیر انتهایی"],["roofBrace","مهاربند سقف"],["wallBrace","مهاربند دیوار"],["roofEdge","عضو لبه سقف"]];
const FIELDS=[["memberLength_m","طول واقعی عضو (m)"],["Kx","ضریب طول مؤثر حول محور x"],["Ky","ضریب طول مؤثر حول محور y"],["Lcx","طول مهارنشده/مؤثر محور x (m)"],["Lcy","طول مهارنشده/مؤثر محور y (m)"]];
let data={schemaVersion:1,groups:{}};
function blank(){const x={schemaVersion:1,groups:{}};GROUPS.forEach(([k])=>x.groups[k]={});return x;}
function normalize(v){const x=blank();GROUPS.forEach(([k])=>{const s=v?.groups?.[k]||{},d={};FIELDS.forEach(([f])=>{const n=Number(s[f]);d[f]=s[f]!==""&&s[f]!==null&&s[f]!==undefined&&Number.isFinite(n)?n:null;});d.bracingReviewed=s.bracingReviewed===true;d.localSlendernessReviewed=s.localSlendernessReviewed===true;d.restraintNote=String(s.restraintNote||"");x.groups[k]=d;});return x;}
function getData(){return JSON.parse(JSON.stringify(data));}
function setData(v){data=normalize(v);render();}
function readUI(){GROUPS.forEach(([g])=>{const d={};FIELDS.forEach(([f])=>{const e=$("compression_"+g+"_"+f);d[f]=e&&e.value!==""?Number(e.value):null;});d.bracingReviewed=!!$("compression_"+g+"_bracingReviewed")?.checked;d.localSlendernessReviewed=!!$("compression_"+g+"_localSlendernessReviewed")?.checked;d.restraintNote=$("compression_"+g+"_restraintNote")?.value||"";data.groups[g]=d;});return getData();}
function audit(input){const src=input?normalize(input):readUI(),issues=[],warnings=[],rows={};const sections=root.SteelSections?.read?.()||{};const mdi=root.SteelMemberDesignInputs;
GROUPS.forEach(([g,label])=>{const d=src.groups[g],local=[],notes=[];const p=sections[g]||{};const mat=mdi?.getForGroup?.(g)||{};
["memberLength_m","Kx","Ky","Lcx","Lcy"].forEach(f=>{if(!(d[f]>0))local.push(FIELDS.find(x=>x[0]===f)[1]+" وارد نشده یا مثبت نیست.");});
if(d.memberLength_m>0&&d.Lcx>0&&d.Lcx>d.memberLength_m*1.001)warnings.push(label+": طول Lcx از طول واقعی عضو بیشتر است؛ تعریف طول مهارنشده و محور محلی بازبینی شود.");
if(d.memberLength_m>0&&d.Lcy>0&&d.Lcy>d.memberLength_m*1.001)warnings.push(label+": طول Lcy از طول واقعی عضو بیشتر است؛ تعریف طول مهارنشده و محور محلی بازبینی شود.");
if(!d.bracingReviewed)local.push("آرایش و پیوستگی مهاربندی جانبی/پیچشی بازبینی نشده است.");
if(!d.localSlendernessReviewed)local.push("نسبت‌های عرض به ضخامت اجزای مقطع و کمانش موضعی بازبینی نشده‌اند.");
if(!(Number(mat.Fy)>0))local.push("Fy معتبر گروه عضو در ورودی مصالح موجود نیست.");
if(!(Number(p.A_cm2)>0))notes.push("سطح مقطع A برای این گروه در مشخصات تحلیل عمومی پیدا نشد؛ باید از هندسه/مقطع واقعی عضو استخراج شود.");
if(!(Number(p.Ix_cm4)>0&&Number(p.Iy_cm4)>0))notes.push("ممان‌های اینرسی حول دو محور از رجیستر عمومی قابل استخراج نیستند؛ شعاع ژیراسیون rx و ry هنوز قابل تأیید نیست.");
if(!d.restraintNote.trim())notes.push("منبع فرض تکیه‌گاهی/مهاربندی ثبت نشده است.");
rows[g]={label,complete:local.length===0,issues:local,notes};
local.forEach(x=>issues.push(label+": "+x));notes.forEach(x=>warnings.push(label+": "+x));
});
return {schemaVersion:1,readyForDataReview:issues.length===0,issues,warnings,groups:rows,disclaimer:"این ممیزی فقط کفایت داده‌ها را می‌سنجد. ظرفیت کمانش خمشی، پیچشی، خمشی-پیچشی، کمانش موضعی و اندرکنش محاسبه نشده و هیچ نتیجه‌ای تأیید آیین‌نامه‌ای یا مجوز اجرا نیست."};}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function render(){const host=$("compressionDesignContent");if(!host)return;host.innerHTML=GROUPS.map(([g,label])=>{const d=data.groups[g]||{};return '<details class="sub-panel"><summary>'+label+'</summary><div class="form-grid">'+FIELDS.map(([f,caption])=>'<div class="field"><label for="compression_'+g+'_'+f+'">'+caption+'</label><input type="number" min="0" step="any" id="compression_'+g+'_'+f+'" value="'+(d[f]??"")+'"></div>').join("")+'</div><div class="form-grid"><label><input type="checkbox" id="compression_'+g+'_bracingReviewed" '+(d.bracingReviewed?'checked':'')+'> آرایش مهاربندی و مهار جانبی بازبینی شد</label><label><input type="checkbox" id="compression_'+g+'_localSlendernessReviewed" '+(d.localSlendernessReviewed?'checked':'')+'> لاغری موضعی اجزای مقطع بازبینی شد</label></div><div class="field"><label for="compression_'+g+'_restraintNote">شرح شرایط مهار و منبع فرض‌ها</label><input type="text" id="compression_'+g+'_restraintNote" value="'+esc(d.restraintNote||"")+'" placeholder="مثلاً مهار جانبی در هر لاپه؛ مستند به نقشه مهاربندی"></div></details>';}).join("")+'<div class="button-grid"><button class="btn secondary" id="btnCompressionAudit" type="button">ممیزی ورودی اعضای فشاری</button></div><div id="compressionDesignResults"></div>'; }
function renderResult(r){const host=$("compressionDesignResults");if(!host)return;host.innerHTML="<h4>"+(r.readyForDataReview?"ورودی‌های پایه برای بازبینی موجودند":"موارد ناقص طراحی فشاری")+"</h4>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>کمبود اجباری در ممیزی ورودی‌ها یافت نشد.</p>")+(r.warnings.length?"<h4>هشدارها و داده‌های تکمیلی</h4><ul>"+r.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<div class='notice'>"+esc(r.disclaimer)+"</div>";}
function init(){if($("compressionDesignPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="compressionDesignPanel";p.innerHTML="<div class='panel-title'><h3>ورودی‌های طراحی اعضای فشاری و پایداری</h3><span class='status'>ممیزی داده‌ها — بدون محاسبه ظرفیت</span></div><div class='notice'>برای ستون، رفتر و اعضای فشاری/مهاربندی. Kx و Ky و طول‌های مهارنشده باید از شرایط واقعی مهار و تحلیل سازه تعیین شوند؛ وارد کردن مقدار پیش‌فرض بدون مستندات مجاز نیست.</div><div id='compressionDesignContent'></div>";const anchor=$("tensionDesignReadinessPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else{const footer=main.querySelector("footer");footer?footer.insertAdjacentElement("beforebegin",p):main.appendChild(p);}render();$("btnCompressionAudit").addEventListener("click",()=>renderResult(audit()));}
root.SteelCompressionDesignReadiness={getData,setData,readUI,audit,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
