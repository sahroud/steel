/* SAHROUD STEEL — member-specific design scope gate.
 * This module prevents preliminary legacy screens from being mistaken for
 * complete code design. It reports supported scope and hard blockers only.
 */
(function(root){
"use strict";
const GROUPS=[
 {key:"column",label:"ستون",family:"hot-rolled-I",required:["section","compression","simultaneous-demand","biaxial-flexure","second-order","local-slenderness","connection"]},
 {key:"rafter",label:"تیر/رفتر",family:"hot-rolled-I-or-tapered",required:["section","section-forces","flexure","ltb","shear","interaction","deflection"]},
 {key:"roofPurlin",label:"لاپه سقف",family:"cold-formed-or-hot-rolled",required:["exact-profile","cold-formed-local-distortional","restraint","biaxial-actions","shear","deflection","connections"]},
 {key:"wallGirt",label:"قید دیوار",family:"cold-formed-or-hot-rolled",required:["exact-profile","cold-formed-local-distortional","restraint","biaxial-actions","shear","deflection","connections"]},
 {key:"braces",label:"مهاربندهای طولی سقف و دیوار",family:"brace-specific",required:["brace-force-demand","tension","compression","unbraced-length","connections","collector-diaphragm"]},
 {key:"endPost",label:"ستونک‌های انتهایی",family:"hot-rolled-or-built-up",required:["section","compression","biaxial-flexure","shear","interaction","stability","connections"]},
 {key:"endGirt",label:"تیرهای انتهایی و گرت انتهایی",family:"cold-formed-or-hot-rolled",required:["exact-profile","biaxial-actions","local-distortional-buckling","shear","deflection","connections"]},
 {key:"roofEdge",label:"اعضای لبه و کناره سقف",family:"section-specific",required:["exact-section","biaxial-actions","stability","shear","deflection","connections"]},
 {key:"craneRunwayGirder",label:"تیر حمال جرثقیل",family:"crane-runway",required:["wheel-load-envelope","biaxial-flexure","shear","web-crippling","fatigue","serviceability","lateral-stability","connections"]},
 {key:"tieBeam",label:"شناژ و اعضای بتنی رابط",family:"reinforced-concrete",required:["concrete-material","reinforcement-layout","axial-flexure","shear","anchorage","foundation-interface"]}
];
const SUPPORT={
 column:["compression-global-buckling-limited"],
 rafter:[],
 roofPurlin:["preliminary-elastic-screen-only"],
 wallGirt:[]
};
const LABELS={
 section:"خواص و هندسه مقطع واقعی",compression:"مقاومت فشاری و کمانش کلی",
 "simultaneous-demand":"تقاضاهای هم‌زمان در هر ترکیب بار","biaxial-flexure":"خمش حول دو محور",
 "second-order":"تحلیل مرتبه دوم و اثرات پایداری","local-slenderness":"طبقه‌بندی لاغری موضعی و مقطع مؤثر",
 connection:"طراحی اتصال عضو","section-forces":"نمودار معتبر نیروهای داخلی در طول عضو",
 flexure:"مقاومت خمشی آیین‌نامه‌ای","ltb":"کمانش جانبی‌پیچشی و مهار واقعی",
 shear:"مقاومت برشی و اندرکنش لازم","interaction":"اندرکنش کامل N-M دو‌محوره",
 deflection:"کنترل تغییرمکان/خیز در ترکیب بهره‌برداری","exact-profile":"نوع و مشخصات دقیق پروفیل",
 "cold-formed-local-distortional":"کمانش موضعی و اعوجاجی مقطع سردنورد",
 restraint:"مهار جانبی و پیچشی واقعی","biaxial-actions":"بارگذاری دو‌محوره و پیچش",
 connections:"اتصالات و پیچ‌های لاپه/قید",
 "brace-force-demand":"استخراج نیروهای محوری هم‌زمان هر ترکیب",tension:"ظرفیت کششی و گسیختگی مقطع مهاربند",
 "unbraced-length":"طول مهارنشده و ضریب طول مؤثر مستند","collector-diaphragm":"دیافراگم و جمع‌کننده و انتقال بار طولی مستند",
 "local-distortional-buckling":"کمانش موضعی و اعوجاجی مقطع","exact-section":"هندسه و خواص مقطع واقعی","wheel-load-envelope":"قطار بار چرخ و پوش نیروهای جرثقیل",
 "web-crippling":"لهیدگی جان و اثر بار متمرکز چرخ","fatigue":"خستگی و طیف چرخه بار","serviceability":"تغییرمکان و ارتعاش بهره‌برداری",
 "lateral-stability":"پایداری جانبی و پیچشی تیر حمال","concrete-material":"مقاومت و مشخصات بتن و فولاد","reinforcement-layout":"آرایش و مهار آرماتورها",
 "axial-flexure":"اندرکنش نیروی محوری و خمش بتن‌آرمه","anchorage":"طول مهاری و وصله آرماتور","foundation-interface":"انتقال نیرو به فونداسیون"
};
function audit(){
 const env=root.SteelMemberForceEnvelope?.getLast?.()||null;
 const rows=GROUPS.map(g=>{
  const members=Array.isArray(env?.members)?env.members.filter(m=>g.key==="braces"?["wallBrace","roofBrace"].includes(m.sectionKey):m.sectionKey===g.key):[];
  const missing=[...g.required];
  if(g.key==="braces"&&root.SteelBraceForceDemandAudit?.audit&&env){const br=root.SteelBraceForceDemandAudit.audit(env,root.SteelStructuralModel?.getData?.());if(br.success)missing.splice(missing.indexOf("brace-force-demand"),1);}
  if(!members.length)missing.unshift("وجود اعضا و نیروهای معتبر در مدل");
  if(g.key==="column"&&root.SteelCompressionCapacity?.analyze)missing.splice(missing.indexOf("compression"),1);
  if(g.key==="column"&&members.length){
   const noSim=members.some(m=>!Array.isArray(m.simultaneousCases)||!m.simultaneousCases.length);
   if(noSim)missing.push("تقاضای شش‌مؤلفه‌ای هم‌زمان برای تمام ترکیبات");
  }
  const blockers=missing.map(k=>LABELS[k]||k);
  const supported=SUPPORT[g.key]||[];
  return {group:g.key,label:g.label,memberCount:members.length,availableLimitedEngines:supported,missing:blockers,status:blockers.length?"blocked":"limited-only",designApproved:false};
 });
 return {designApproved:false,rows,summary:{groups:rows.length,blocked:rows.filter(x=>x.status==="blocked").length,limitedOnly:rows.filter(x=>x.status==="limited-only").length},rules:[
  "هیچ‌یک از مسیرهای این ممیزی مجوز طراحی اجرایی صادر نمی‌کند.",
  "وجود موتور محدود کمانش فشاری ستون به معنی کنترل کامل ستون نیست.",
  "کنترل مقدماتی لاپه موجود، جایگزین روش طراحی سردنورد و کمانش موضعی/اعوجاجی نیست.",
  "مقادیر بیشینه مستقل ترکیبات بار نباید برای ساخت تقاضای هم‌زمان با یکدیگر ترکیب شوند."
 ]};
}
function selfTest(){
 const saved=root.SteelMemberForceEnvelope;
 root.SteelMemberForceEnvelope={getLast:()=>({members:[{sectionKey:"column",simultaneousCases:[{}]},{sectionKey:"rafter"},{sectionKey:"roofPurlin"},{sectionKey:"wallGirt"}]})};
 const r=audit();root.SteelMemberForceEnvelope=saved;
 const tests=[
  {name:"four primary member families and longitudinal braces reported",ok:r.rows.length===10},
  {name:"column global compression engine remains limited",ok:r.rows[0].availableLimitedEngines.includes("compression-global-buckling-limited")&&r.rows[0].designApproved===false},
  {name:"column remains blocked by missing full design checks",ok:r.rows[0].status==="blocked"&&r.rows[0].missing.some(x=>x.includes("خمش حول دو محور"))},
  {name:"rafter requires internal force diagram and LTB",ok:r.rows[1].missing.some(x=>x.includes("نمودار معتبر"))&&r.rows[1].missing.some(x=>x.includes("کمانش جانبی"))},
  {name:"purlin requires cold-formed local and distortional checks",ok:r.rows[2].missing.some(x=>x.includes("کمانش موضعی"))},
  {name:"girt follows a section-specific route",ok:r.rows[3].missing.length>0},
  {name:"brace group remains blocked pending capacity and collector checks",ok:r.rows[4].status==="blocked"&&r.rows[4].missing.some(x=>x.includes("کمانش کلی"))&&r.rows[4].missing.some(x=>x.includes("جمع‌کننده"))},
  {name:"crane girder requires wheel loads, fatigue and web crippling",ok:r.rows.find(x=>x.group==="craneRunwayGirder")?.missing.some(x=>x.includes("خستگی"))&&r.rows.find(x=>x.group==="craneRunwayGirder")?.status==="blocked"},
 {name:"reinforced concrete tie remains outside steel capacity engine",ok:r.rows.find(x=>x.group==="tieBeam")?.missing.some(x=>x.includes("بتن"))},
 {name:"no group receives design approval",ok:r.rows.every(x=>x.designApproved===false)&&r.designApproved===false}
 ];
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,tests};
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function render(){
 const host=document.getElementById("memberDesignScopeGateResults");if(!host)return;
 const r=audit();
 host.innerHTML="<h4>وضعیت مسیر طراحی اعضا</h4><p>گروه‌های مسدود: "+r.summary.blocked+" از "+r.summary.groups+" — هیچ گروهی تأیید طراحی نشده است.</p><div style='overflow-x:auto'><table class='data-table'><thead><tr><th>گروه</th><th>تعداد اعضای دارای پوش نیرو</th><th>موتور محدود موجود</th><th>موارد تکمیل‌نشده</th><th>وضعیت</th></tr></thead><tbody>"+r.rows.map(x=>"<tr><td>"+esc(x.label)+"</td><td>"+x.memberCount+"</td><td>"+esc(x.availableLimitedEngines.join("، ")||"ندارد")+"</td><td>"+esc(x.missing.join("؛ "))+"</td><td>مسدود / غیرنهایی</td></tr>").join("")+"</tbody></table></div><div class='notice'>"+r.rules.map(esc).join("<br>")+"</div>";
}
function init(){
 if(document.getElementById("memberDesignScopeGatePanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="memberDesignScopeGatePanel";
 p.innerHTML="<div class='panel-title'><h3>دروازه کنترل دامنه طراحی تمام اعضای سوله</h3><span class='status'>کنترل عدم تأیید کاذب</span></div><div class='notice'>این بخش مشخص می‌کند کدام کنترل‌های واقعی هنوز برای هر گروه عضو لازم‌اند؛ از نمایش قبولی بر اساس موتورهای مقدماتی جلوگیری می‌کند.</div><div class='button-grid'><button class='btn secondary' id='btnMemberDesignScopeGate' type='button'>بازبینی دامنه طراحی اعضا</button></div><div id='memberDesignScopeGateResults'></div>";
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);
 document.getElementById("btnMemberDesignScopeGate").addEventListener("click",render);
}
root.SteelMemberDesignScopeGate={audit,selfTest,render};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
