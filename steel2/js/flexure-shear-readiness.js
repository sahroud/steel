/* SAHROUD STEEL — flexure and shear readiness audit.
 * Uses member-force envelopes only as demand evidence; no code resistance is calculated.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const GROUPS=[["column","ستون","flexure"],["rafter","رفتر","flexure"],["endPost","ستونک انتهایی","flexure"],["endGirt","تیر انتهایی","flexure"],["roofEdge","عضو لبه سقف","flexure"],["roofPurlin","لاپه سقف","section-specific"],["wallGirt","قید دیوار","section-specific"],["roofBrace","مهاربند سقف","axial"],["wallBrace","مهاربند دیوار","axial"]];
function audit(envelope){
 const issues=[],warnings=[],rows=[];
 const env=envelope||root.SteelMemberForceEnvelope?.getLast?.();
 const members=Array.isArray(env?.members)?env.members:[];
 const missingGroups=[];
 const cases=Array.isArray(env?.cases)?env.cases:[];
 if(!cases.length)issues.push("هیچ ترکیب بار معتبری در گزارش نیرو ثبت نشده است.");
 if(env?.allCasesEquilibriumOK!==true)issues.push("تعادل عددی همه ترکیبات بار به‌صورت موفق تأیید نشده است.");
 const failedCases=cases.filter(x=>x?.equilibrium?.ok!==true);
 if(failedCases.length)issues.push("تعادل عددی در "+failedCases.length+" حالت بار تأیید نشده یا نامشخص است.");
 const modelMemberCount=Number(env?.modelMemberCount);
 if(!Number.isFinite(modelMemberCount)||modelMemberCount<0)issues.push("تعداد اعضای مدل مرجع در گزارش ثبت نشده است.");
 else if(modelMemberCount!==members.length)issues.push("تعداد اعضای گزارش‌شده با مدل مرجع برابر نیست ("+members.length+" از "+modelMemberCount+").");
 if(Array.isArray(env?.unreportedMemberIds)&&env.unreportedMemberIds.length)issues.push("اعضای فاقد گزارش نیرو: "+env.unreportedMemberIds.slice(0,12).join("، ")+(env.unreportedMemberIds.length>12?" و موارد بیشتر":"")+".");
 if(Array.isArray(env?.analysisMemberSetMismatchCases)&&env.analysisMemberSetMismatchCases.length)issues.push("شناسه اعضای تحلیل بین ترکیبات بار یکسان نیست: "+env.analysisMemberSetMismatchCases.join("، ")+".");
 GROUPS.forEach(([g,label,path])=>{
  const list=members.filter(m=>m.sectionKey===g);
  if(!list.length){missingGroups.push(g);warnings.push(label+": عضو/نیروی استخراج‌شده در گزارش فعلی وجود ندارد؛ پوشش طراحی این گروه تأیید نشده است.");return;}
  const d=root.SteelMemberDesignInputs?.getForGroup?.(g)||{};
  const missing=[];
  if(path==="section-specific"){
   missing.push("نوع مقطع این گروه (نورد گرم یا سردنورد) و مشخصات هندسی واقعی آن هنوز برای انتخاب مسیر طراحی ثبت نشده است.");
   missing.push("موتور مقاومت متناسب با نوع مقطع، شامل حالت‌های حدی لازم، هنوز به تقاضای این گروه متصل نشده است.");
  }else if(path==="axial"){
   missing.push("موتور کامل مقاومت کششی/فشاری و کنترل اتصال مهاربند به تقاضای واقعی این گروه متصل نشده است.");
  }
  if(path==="flexure") [["t_mm","ضخامت مبنای مصالح"],["Fy","Fy"],["Fu","Fu"],["Lb","طول مهارنشده خمشی Lb"],["Cb","ضریب Cb"]].forEach(([k,n])=>{if(!(Number(d[k])>0))missing.push(n+" معتبر نیست.");});
  if(path==="flexure"&&!(Number(d.Fu)>=Number(d.Fy)&&Number(d.Fy)>0))missing.push("رابطه Fu و Fy معتبر نیست.");
  if(path==="flexure"&&!String(d.bracingNote||"").trim())missing.push("شرح مهار جانبی/پیچشی ثبت نشده است.");
  const incompleteCases=list.filter(m=>Number(m.caseCount)!==cases.length);
  if(incompleteCases.length)missing.push(incompleteCases.length+" عضو پوشش کامل تمام ترکیبات بار را ندارد.");
  const noSection=list.filter(m=>!(Number(m.section?.A)>0&&Number(m.section?.Iy)>0&&Number(m.section?.Iz)>0&&Number(m.section?.J)>0));
  if(noSection.length)missing.push(noSection.length+" عضو فاقد خواص کامل A/Iy/Iz/J در خروجی تحلیل است.");
  const demand=list.map(m=>({id:m.id,M:Math.max(Number(m.peak?.My)||0,Number(m.peak?.Mz)||0),V:Math.max(Number(m.peak?.Vy)||0,Number(m.peak?.Vz)||0)}));
  if(demand.every(x=>x.M===0&&x.V===0))warnings.push(label+": تقاضای خمش و برش در گزارش نیرو صفر است؛ بارگذاری و محورهای محلی بازبینی شوند.");
  if(missing.length)missing.forEach(x=>issues.push(label+": "+x));
  rows.push({group:g,label,designPath:path,count:list.length,ready:missing.length===0,missing,maximumMoment_Nm:Math.max(...demand.map(x=>x.M)),maximumShear_N:Math.max(...demand.map(x=>x.V)),demands:demand});
 });
 return {ready:issues.length===0&&rows.length===GROUPS.length&&missingGroups.length===0&&cases.length>0&&failedCases.length===0,rows,issues,warnings,missingGroups,failedCases:failedCases.map(x=>x.label),modelMemberCount:Number.isFinite(modelMemberCount)?modelMemberCount:null,sourceCases:cases.length,disclaimer:"این کنترل پوشش اعضای اصلی و فرعی را ممیزی می‌کند؛ برای لاپه/قید نوع مقطع و مسیر اختصاصی و برای مهاربندها موتور محوری/اتصال لازم است. مقادیر بیشینه مستقل لزوماً هم‌زمان نیستند. ظرفیت خمشی، کمانش پیچشی-جانبی، ظرفیت برشی جان، اثر سخت‌کننده‌ها، طبقه‌بندی مقطع و اندرکنش محاسبه نشده‌اند؛ نتیجه تأیید آیین‌نامه‌ای یا مجوز اجرا نیست."};
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function renderResult(r){const host=$("flexureShearReadinessResults");if(!host)return;host.innerHTML="<h4>"+(r.ready?"داده‌های پایه موجودند":"موارد تکمیل‌نشده")+"</h4>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>کمبود اجباری در ممیزی داده‌های موجود یافت نشد.</p>")+(r.warnings.length?"<h4>هشدارها</h4><ul>"+r.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>گروه</th><th>تعداد اعضا</th><th>بیشینه |M| (kN.m)</th><th>بیشینه |V| (kN)</th><th>وضعیت داده</th></tr></thead><tbody>"+r.rows.map(x=>"<tr><td>"+esc(x.label)+"</td><td>"+x.count+"</td><td>"+(x.maximumMoment_Nm/1000).toFixed(2)+"</td><td>"+(x.maximumShear_N/1000).toFixed(2)+"</td><td>"+(x.ready?"کامل":"ناقص")+"</td></tr>").join("")+"</tbody></table></div><div class='notice'>"+esc(r.disclaimer)+"</div>";}
function init(){if($("flexureShearReadinessPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="flexureShearReadinessPanel";p.innerHTML="<div class='panel-title'><h3>ممیزی آمادگی طراحی خمش و برش</h3><span class='status'>نیروهای تحلیل + ورودی مقاطع</span></div><div class='notice'>ابتدا تحلیل پوش نیروهای اعضا را اجرا کنید. این پنل تقاضاهای موجود را با ورودی‌های مصالح و مهاربندی تطبیق می‌دهد و ظرفیت آیین‌نامه‌ای محاسبه نمی‌کند.</div><div class='button-grid'><button type='button' class='btn secondary' id='btnFlexureShearReadiness'>ممیزی خمش و برش</button></div><div id='flexureShearReadinessResults'></div>";const anchor=$("compressionDesignPanel")||$("memberForceEnvelopePanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);$("btnFlexureShearReadiness").addEventListener("click",()=>renderResult(audit()));}
root.SteelFlexureShearReadiness={audit};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
