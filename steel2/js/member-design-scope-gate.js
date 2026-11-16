/* SAHROUD STEEL — member-specific design scope gate.
 * This module prevents preliminary legacy screens from being mistaken for
 * complete code design. It reports supported scope and hard blockers only.
 */
(function(root){
"use strict";
const GROUPS=[
 {key:"column",label:"ستون",family:"hot-rolled-I",required:["section","compression","torsional-buckling","simultaneous-demand","biaxial-flexure","second-order","local-slenderness","shear","torsion","connection"]},
 {key:"rafter",label:"تیر/رفتر",family:"hot-rolled-I-or-tapered",required:["section","section-forces","flexure","ltb","shear","interaction","second-order","local-slenderness","torsion","deflection","connection"]},
 {key:"roofPurlin",label:"لاپه سقف",family:"cold-formed-or-hot-rolled",required:["exact-profile","cold-formed-local-distortional","restraint","biaxial-actions","shear","torsion","load-combination","deflection","connections"]},
 {key:"wallGirt",label:"قید دیوار",family:"cold-formed-or-hot-rolled",required:["exact-profile","cold-formed-local-distortional","restraint","biaxial-actions","shear","torsion","load-combination","deflection","connections"]},
 {key:"braces",label:"مهاربندهای طولی سقف و دیوار",family:"brace-specific",required:["brace-force-demand","tension","compression","unbraced-length","connections","collector-diaphragm"]},
 {key:"endPost",label:"ستونک‌های انتهایی",family:"hot-rolled-or-built-up",required:["section","compression","torsional-buckling","biaxial-flexure","shear","interaction","second-order","local-slenderness","stability","connections"]},
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
 "torsional-buckling":"کمانش پیچشی و خمشی‌ـ‌پیچشی عضو",
 shear:"مقاومت برشی و اندرکنش لازم",torsion:"مقاومت پیچشی و اندرکنش پیچش با برش/خمش",
 "load-combination":"ترکیبات بار معتبر و هم‌زمان برای عضو",interaction:"اندرکنش کامل N-M دو‌محوره",
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
 const demand=root.SteelMemberDesignDemandPackage?.getLast?.()||null;
 const demandPackage={available:!!demand,success:demand?.success===true,status:demand?.status||"not-built",caseCount:Array.isArray(demand?.caseIds)?demand.caseIds.length:0,memberCount:Array.isArray(demand?.members)?demand.members.length:0,issues:Array.isArray(demand?.issues)?demand.issues.slice():[],blockers:Array.isArray(demand?.designGate?.blockers)?demand.designGate.blockers.slice():[],designApproved:false};
 const workbench=root.SteelLoadCaseWorkbench?.read?.()||null;
 const combinationAudit=workbench&&root.SteelLoadCaseWorkbench?.audit?root.SteelLoadCaseWorkbench.audit(workbench):null;
 const proposal=demand?.combinationProposal||null;
 const combinationBridge={engineAvailable:!!root.SteelMemberDemandCombinationBridge?.build,proposalExecuted:!!proposal,proposalSuccess:proposal?.success===true,status:proposal?.status||"not-executed",issues:Array.isArray(proposal?.issues)?proposal.issues.slice():[],designApproved:false};
 const combinationStatus={available:!!combinationAudit,success:combinationAudit?.success===true,loadCaseCount:Array.isArray(workbench?.loadCases)?workbench.loadCases.length:0,combinationCount:Array.isArray(workbench?.combinations)?workbench.combinations.length:0,issues:Array.isArray(combinationAudit?.issues)?combinationAudit.issues.slice():[],linkedToDemandPackage:proposal?.success===true,solverDemandCasesAvailable:proposal?.success===true,designApproved:false};
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
  const supported=(SUPPORT[g.key]||[]).slice();
  if((g.key==="column"||g.key==="rafter")&&root.SteelMemberCombinedActionScreen?.evaluate)supported.push("موتور اندرکنش مقدماتی N-Mx-My؛ ظرفیت‌های طراحی باید جداگانه و مستند وارد شوند و اتصال به تقاضای تحلیل هنوز کامل نیست");
  if(["roofPurlin","wallGirt","endGirt"].includes(g.key)&&root.SteelColdFormedMemberContract?.audit)supported.push("قرارداد ممیزی خواص واقعی، کمانش موضعی/اعوجاجی، مهار، تقاضای هم‌زمان و اتصالات؛ بدون محاسبه ظرفیت");
  return {group:g.key,label:g.label,memberCount:members.length,availableLimitedEngines:supported,missing:blockers,status:blockers.length?"blocked":"limited-only",designApproved:false};
 });
 return {designApproved:false,rows,demandPackage,combinationStatus,combinationBridge,summary:{groups:rows.length,blocked:rows.filter(x=>x.status==="blocked").length,limitedOnly:rows.filter(x=>x.status==="limited-only").length,demandPackageAvailable:demandPackage.available,demandPackageComplete:demandPackage.success,documentedCombinationSetValid:combinationStatus.success,combinationsLinkedToDemand:combinationStatus.linkedToDemandPackage},rules:[
  "بسته تقاضای ایستگاهی فقط در صورت ساخت موفق نمایش داده می‌شود؛ این وضعیت به‌تنهایی مجوز طراحی نیست.",
  "ممیزی ترکیب‌ها در دفترچه شواهد، جایگزین اجرای تحلیل اثر ترکیب‌ها و اتصال آن‌ها به بسته تقاضا نیست.",
  "هیچ‌یک از مسیرهای این ممیزی مجوز طراحی اجرایی صادر نمی‌کند.",
  "وجود موتور محدود کمانش فشاری ستون به معنی کنترل کامل ستون نیست.",
  "کنترل مقدماتی لاپه موجود، جایگزین روش طراحی سردنورد و کمانش موضعی/اعوجاجی نیست.",
  "مقادیر بیشینه مستقل ترکیبات بار نباید برای ساخت تقاضای هم‌زمان با یکدیگر ترکیب شوند.",
  "موتور اندرکنش N-Mx-My فقط با ظرفیت‌های طراحی مستند و تقاضای هم‌زمان قابل استفاده است؛ تا اتصال کامل به تحلیل و تأیید ظرفیت‌ها، مسیر طراحی نهایی نیست.",
  "قرارداد اعضای سردنورد فقط کامل بودن شواهد هندسه، خواص، کمانش الاستیک، مهار، تقاضا و اتصال را ممیزی می‌کند؛ مقاومت طراحی سردنورد هنوز محاسبه نمی‌شود."
 ]};
}
function selfTest(){
 const saved=root.SteelMemberForceEnvelope,savedCold=root.SteelColdFormedMemberContract;
 root.SteelMemberForceEnvelope={getLast:()=>({members:[{sectionKey:"column",simultaneousCases:[{}]},{sectionKey:"rafter"},{sectionKey:"roofPurlin"},{sectionKey:"wallGirt"}]})};
 root.SteelColdFormedMemberContract={audit:()=>({success:false,designApproved:false})};
 const r=audit();root.SteelMemberForceEnvelope=saved;root.SteelColdFormedMemberContract=savedCold;
 const tests=[
  {name:"four primary member families and longitudinal braces reported",ok:r.rows.length===10},
  {name:"column global compression engine remains limited",ok:r.rows[0].availableLimitedEngines.includes("compression-global-buckling-limited")&&r.rows[0].designApproved===false},
  {name:"column remains blocked by missing full design checks",ok:r.rows[0].status==="blocked"&&r.rows[0].missing.some(x=>x.includes("خمش حول دو محور"))},
  {name:"column requires torsional buckling, shear and torsion checks",ok:r.rows[0].missing.some(x=>x.includes("کمانش پیچشی"))&&r.rows[0].missing.some(x=>x.includes("مقاومت برشی"))&&r.rows[0].missing.some(x=>x.includes("مقاومت پیچشی"))},
  {name:"rafter requires internal force diagram, LTB, stability and connections",ok:r.rows[1].missing.some(x=>x.includes("نمودار معتبر"))&&r.rows[1].missing.some(x=>x.includes("کمانش جانبی"))&&r.rows[1].missing.some(x=>x.includes("مرتبه دوم"))&&r.rows[1].missing.some(x=>x.includes("اتصال عضو"))},
  {name:"purlin requires cold-formed local and distortional checks",ok:r.rows[2].missing.some(x=>x.includes("کمانش موضعی"))},
  {name:"girt follows a section-specific route",ok:r.rows[3].missing.length>0},
  {name:"purlin and girt expose evidence-only cold-formed contract",ok:r.rows[2].availableLimitedEngines.some(x=>x.includes("قرارداد ممیزی"))&&r.rows[3].availableLimitedEngines.some(x=>x.includes("قرارداد ممیزی"))},
  {name:"brace group remains blocked pending capacity and collector checks",ok:r.rows[4].status==="blocked"&&r.rows[4].missing.some(x=>x.includes("کمانش کلی"))&&r.rows[4].missing.some(x=>x.includes("جمع‌کننده"))},
  {name:"crane girder requires wheel loads, fatigue and web crippling",ok:r.rows.find(x=>x.group==="craneRunwayGirder")?.missing.some(x=>x.includes("خستگی"))&&r.rows.find(x=>x.group==="craneRunwayGirder")?.status==="blocked"},
 {name:"reinforced concrete tie remains outside steel capacity engine",ok:r.rows.find(x=>x.group==="tieBeam")?.missing.some(x=>x.includes("بتن"))},
 {name:"no group receives design approval",ok:r.rows.every(x=>x.designApproved===false)&&r.designApproved===false},
  {name:"demand package status is exposed without design approval",ok:r.demandPackage&&r.demandPackage.designApproved===false&&r.designApproved===false},
  {name:"combination audit is not treated as solver demand linkage",ok:r.combinationStatus&&r.combinationStatus.linkedToDemandPackage===false&&r.combinationStatus.solverDemandCasesAvailable===false},
  {name:"combination demand bridge is surfaced as unexecuted and non-approving",ok:r.combinationBridge&&r.combinationBridge.designApproved===false&&r.combinationBridge.proposalExecuted===false}
 ];
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,tests};
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function render(){
 const host=document.getElementById("memberDesignScopeGateResults");if(!host)return;
 const r=audit();
 const d=r.demandPackage,k=r.combinationStatus;
 const bridgeText="مبدل تقاضای ترکیبی: "+(r.combinationBridge.proposalExecuted?(r.combinationBridge.proposalSuccess?"پیشنهاد ترکیب نیرو ساخته شده؛ تأیید طراحی نیست":"اجرا شده اما مسدود/ناموفق"):(r.combinationBridge.engineAvailable?"آماده استفاده؛ هنوز اجرا نشده":"ماژول بارگذاری نشده"))+".";
 const demandText="بسته تقاضا: "+(d.available?(d.success?"ساخته شده؛ "+d.caseCount+" حالت و "+d.memberCount+" عضو":"ناقص / ناموفق"):"هنوز ساخته نشده")+" — دفترچه ترکیب‌ها: "+k.combinationCount+" از "+k.loadCaseCount+" حالت بار؛ "+(k.success?"ممیزی ساختاری موفق":"ممیزی ناقص یا ناموفق")+" — اتصال تقاضای تحلیل به پیشنهاد ترکیب: "+(k.linkedToDemandPackage?"انجام شده":"انجام نشده")+"؛ این اتصال ظرفیت عضو را تأیید نمی‌کند.";
 const details=[...d.issues,...d.blockers,...k.issues,...r.combinationBridge.issues].filter(Boolean);
 host.innerHTML="<h4>وضعیت مسیر طراحی اعضا</h4><p>گروه‌های مسدود: "+r.summary.blocked+" از "+r.summary.groups+" — هیچ گروهی تأیید طراحی نشده است.</p><div class='notice'>"+esc(bridgeText)+"<br>"+esc(demandText)+(details.length?"<br>"+esc(details.join("؛ ")):"")+"</div><div style='overflow-x:auto'><table class='data-table'><thead><tr><th>گروه</th><th>تعداد اعضای دارای پوش نیرو</th><th>موتور محدود موجود</th><th>موارد تکمیل‌نشده</th><th>وضعیت</th></tr></thead><tbody>"+r.rows.map(x=>"<tr><td>"+esc(x.label)+"</td><td>"+x.memberCount+"</td><td>"+esc(x.availableLimitedEngines.join("، ")||"ندارد")+"</td><td>"+esc(x.missing.join("؛ "))+"</td><td>مسدود / غیرنهایی</td></tr>").join("")+"</tbody></table></div><div class='notice'>"+r.rules.map(esc).join("<br>")+"</div>";
}
function init(){
 if(document.getElementById("memberDesignScopeGatePanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="memberDesignScopeGatePanel";p.setAttribute("data-focus-group","member-design");
 p.innerHTML="<div class='panel-title'><h3>دروازه کنترل دامنه طراحی تمام اعضای سوله</h3><span class='status'>کنترل عدم تأیید کاذب</span></div><div class='notice'>این بخش مشخص می‌کند کدام کنترل‌های واقعی هنوز برای هر گروه عضو لازم‌اند؛ از نمایش قبولی بر اساس موتورهای مقدماتی جلوگیری می‌کند.</div><div class='button-grid'><button class='btn secondary' id='btnMemberDesignScopeGate' type='button'>بازبینی دامنه طراحی اعضا</button></div><div id='memberDesignScopeGateResults'></div>";
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);
 document.getElementById("btnMemberDesignScopeGate").addEventListener("click",render);
}
root.SteelMemberDesignScopeGate={audit,selfTest,render};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
