/* ===== steel2/js/flexure-shear-readiness.js ===== */
/* SAHROUD STEEL — flexure and shear readiness audit.
 * Uses member-force envelopes only as demand evidence; no code resistance is calculated.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const GROUPS=[["column","ستون","flexure"],["rafter","رفتر","flexure"],["endPost","ستونک انتهایی","flexure"],["endGirt","تیر انتهایی","flexure"],["roofEdge","عضو لبه سقف","flexure"],["roofPurlin","لاپه سقف","section-specific"],["wallGirt","قید دیوار","section-specific"],["roofBrace","مهاربند سقف","axial"],["wallBrace","مهاربند دیوار","axial"]];
const ACTIONS=["N","Vy","Vz","T","My","Mz"];
function completeEndActions(end){return !!end&&ACTIONS.every(k=>{const v=end[k];return v!==null&&v!==undefined&&typeof v!=="boolean"&&!(typeof v==="string"&&!v.trim())&&Number.isFinite(Number(v));});}
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
 if(Array.isArray(env?.duplicateMemberIdsByCase)&&env.duplicateMemberIdsByCase.length)issues.push("شناسه عضو در یک یا چند ترکیب بار تکراری است؛ تا رفع تکرار، پوش نیرو قابل اتکا نیست.");
 if(Array.isArray(env?.invalidForceVectors)&&env.invalidForceVectors.length)issues.push("بردار ۱۲ مؤلفه‌ای نیروی انتهایی برای "+env.invalidForceVectors.length+" عضو/حالت بار ناقص یا نامعتبر است.");
 if(Array.isArray(env?.extraMemberIds)&&env.extraMemberIds.length)issues.push("شناسه‌های اضافی خارج از مجموعه مرجع تحلیل یافت شد: "+env.extraMemberIds.slice(0,12).join("، ")+".");
 GROUPS.forEach(([g,label,path])=>{
  const list=members.filter(m=>m.sectionKey===g);
  if(!list.length){missingGroups.push(g);warnings.push(label+": عضو/نیروی استخراج‌شده در گزارش فعلی وجود ندارد؛ پوشش طراحی این گروه تأیید نشده است.");return;}
  const d=root.SteelMemberDesignInputs?.getForGroup?.(g)||{};
  const missing=[],inputMissing=[],demandMissing=[],resistanceMissing=[];
  if(path==="section-specific"){
   resistanceMissing.push("نوع مقطع این گروه (نورد گرم یا سردنورد) و مشخصات هندسی واقعی آن هنوز برای انتخاب مسیر طراحی ثبت نشده است.");
   resistanceMissing.push("موتور مقاومت متناسب با نوع مقطع، شامل حالت‌های حدی لازم، هنوز به تقاضای این گروه متصل نشده است.");
  }else if(path==="axial"){
   resistanceMissing.push("موتور کامل مقاومت کششی/فشاری و کنترل اتصال مهاربند به تقاضای واقعی این گروه متصل نشده است.");
  }
  if(path==="flexure") [["t_mm","ضخامت مبنای مصالح"],["Fy","Fy"],["Fu","Fu"],["E_MPa","مدول الاستیسیته E"],["G_MPa","مدول برشی G"],["Kx","ضریب طول مؤثر Kx"],["Ky","ضریب طول مؤثر Ky"],["Kz","ضریب طول مؤثر پیچشی Kz"],["Lcx","طول مؤثر فشاری حول x"],["Lcy","طول مؤثر فشاری حول y"],["Lcz","طول مؤثر پیچشی"],["Lb","طول مهارنشده خمشی Lb"],["Cb","ضریب Cb"]].forEach(([k,n])=>{if(!(Number(d[k])>0))inputMissing.push(n+" معتبر نیست.");});
  if(path==="flexure"&&!(Number(d.Fu)>=Number(d.Fy)&&Number(d.Fy)>0))inputMissing.push("رابطه Fu و Fy معتبر نیست.");
  const taperedMembers=list.filter(m=>m?.taperApplied===true||m?.taperSegmentCount!=null||m?.parentMemberId);
  if(taperedMembers.length)resistanceMissing.push(taperedMembers.length+" قطعه از عضو متغیرمقطع شناسایی شد؛ مسیر مقاومت/کمانش تیرورق متغیرمقطع و اثر تغییرات در طول عضو هنوز پشتیبانی نشده است.");
  if(path==="flexure"&&!String(d.bracingNote||"").trim())inputMissing.push("شرح مهار جانبی/پیچشی ثبت نشده است.");
  const expectedLabels=cases.map(c=>String(c.label||""));
  const demand=[];
  list.forEach(m=>{
   const memberCases=Array.isArray(m.simultaneousCases)?m.simultaneousCases:[];
   const actualLabels=memberCases.map(c=>String(c.label||""));
   const duplicateLabels=[...new Set(actualLabels.filter((x,i)=>actualLabels.indexOf(x)!==i))];
   if(memberCases.length!==expectedLabels.length||duplicateLabels.length||expectedLabels.some(x=>!actualLabels.includes(x)))demandMissing.push("پوش هم‌زمان عضو "+m.id+" با برچسب دقیق تمام ترکیبات بار تطبیق ندارد.");
   let peakM={value:0,caseLabel:null,end:null,component:null},peakV={value:0,caseLabel:null,end:null,component:null};
   memberCases.forEach(c=>{
    if(!String(c?.label||"").trim())demandMissing.push("برچسب ترکیب بار برای عضو "+m.id+" خالی است.");
    [["I",c.endI],["J",c.endJ]].forEach(([end,e])=>{
     if(!completeEndActions(e)){demandMissing.push("بردار شش‌مؤلفه‌ای "+end+" عضو "+m.id+" در ترکیب "+String(c?.label||"—")+" ناقص یا نامعتبر است.");return;}
     [["My",e.My],["Mz",e.Mz]].forEach(([component,value])=>{const n=Number(value);if(Math.abs(n)>peakM.value)peakM={value:Math.abs(n),caseLabel:c.label,end,component};});
     [["Vy",e.Vy],["Vz",e.Vz]].forEach(([component,value])=>{const n=Number(value);if(Math.abs(n)>peakV.value)peakV={value:Math.abs(n),caseLabel:c.label,end,component};});
    });
   });
   demand.push({id:m.id,M:peakM.value,V:peakV.value,governingMoment:peakM,governingShear:peakV});
  });
  const noSection=list.filter(m=>!(Number(m.section?.A)>0&&Number(m.section?.Iy)>0&&Number(m.section?.Iz)>0&&Number(m.section?.J)>0));
  if(noSection.length)inputMissing.push(noSection.length+" عضو فاقد خواص کامل A/Iy/Iz/J در خروجی تحلیل است.");
  if(demand.every(x=>x.M===0&&x.V===0))warnings.push(label+": تقاضای خمش و برش در گزارش نیرو صفر است؛ بارگذاری و محورهای محلی بازبینی شوند.");
  missing.push(...inputMissing,...demandMissing,...resistanceMissing);
  if(missing.length)missing.forEach(x=>issues.push(label+": "+x));
  const governingMoment=demand.reduce((a,x)=>x.M>a.value?{value:x.M,memberId:x.id,...x.governingMoment}:a,{value:0,memberId:null,caseLabel:null,end:null,component:null});
  const governingShear=demand.reduce((a,x)=>x.V>a.value?{value:x.V,memberId:x.id,...x.governingShear}:a,{value:0,memberId:null,caseLabel:null,end:null,component:null});
  const forceDemandComplete=list.every(m=>{const mc=Array.isArray(m.simultaneousCases)?m.simultaneousCases:[];const labels=mc.map(c=>String(c?.label||""));return mc.length===expectedLabels.length&&new Set(labels).size===labels.length&&!expectedLabels.some(x=>!labels.includes(x))&&mc.every(c=>completeEndActions(c?.endI)&&completeEndActions(c?.endJ));});
  rows.push({group:g,label,designPath:path,count:list.length,ready:false,inputDataComplete:inputMissing.length===0,forceDemandComplete:demandMissing.length===0&&forceDemandComplete,resistanceCalculated:false,resistanceStatus:"not-calculated",designApproved:false,inputMissing,demandMissing,resistanceMissing,missing,maximumMoment_Nm:governingMoment.value,maximumShear_N:governingShear.value,governingMoment,governingShear,demands:demand});
 });
 const memberCoverage=root.SteelColdFormedMemberRegistry?.auditDemandLink?.(env)||null;
 if(memberCoverage?.available&&!memberCoverage.success)memberCoverage.issues.forEach(x=>issues.push("اتصال تقاضای واقعی به پرونده اعضای سردنورد: "+x));
 return {ready:false,inputAuditComplete:rows.length===GROUPS.length&&missingGroups.length===0&&rows.every(x=>x.inputDataComplete),forceDemandComplete:rows.length===GROUPS.length&&rows.every(x=>x.forceDemandComplete)&&cases.length>0&&failedCases.length===0,demandAuditComplete:rows.length===GROUPS.length&&missingGroups.length===0&&rows.every(x=>x.forceDemandComplete)&&cases.length>0&&failedCases.length===0,resistanceCalculated:false,designApproved:false,status:"demand-input-and-resistance-audit-only",rows,issues,warnings,missingGroups,memberCoverage,failedCases:failedCases.map(x=>x.label),modelMemberCount:Number.isFinite(modelMemberCount)?modelMemberCount:null,sourceCases:cases.length,disclaimer:"این کنترل پوشش اعضای اصلی و فرعی را ممیزی می‌کند؛ برای لاپه/قید نوع مقطع و مسیر اختصاصی و برای مهاربندها موتور محوری/اتصال لازم است. بیشینه خمش و برش به‌صورت مستقل و همراه حالت/انتهای بحرانی گزارش می‌شوند و نباید به‌عنوان یک حالت هم‌زمان ترکیب شوند. ظرفیت خمشی، کمانش پیچشی-جانبی، ظرفیت برشی جان، اثر سخت‌کننده‌ها، طبقه‌بندی مقطع و اندرکنش محاسبه نشده‌اند؛ نتیجه تأیید آیین‌نامه‌ای یا مجوز اجرا نیست."};
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function renderResult(r){const host=$("flexureShearReadinessResults");if(!host)return;host.innerHTML="<h4>"+(r.inputAuditComplete?"ممیزی داده‌ها تکمیل شد؛ ظرفیت محاسبه نشده":"موارد تکمیل‌نشده")+"</h4>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>کمبود داده در این ممیزی یافت نشد؛ این نتیجه به معنی محاسبه ظرفیت یا تأیید طراحی نیست.</p>")+(r.warnings.length?"<h4>هشدارها</h4><ul>"+r.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>گروه</th><th>تعداد اعضا</th><th>بیشینه |M| (kN.m)</th><th>بیشینه |V| (kN)</th><th>حالت/انتهای بحرانی خمش</th><th>حالت/انتهای بحرانی برش</th><th>ورودی/نیرو</th><th>ظرفیت</th></tr></thead><tbody>"+r.rows.map(x=>"<tr><td>"+esc(x.label)+"</td><td>"+x.count+"</td><td>"+(x.maximumMoment_Nm/1000).toFixed(2)+"</td><td>"+(x.maximumShear_N/1000).toFixed(2)+"</td><td>"+(x.governingMoment.caseLabel?esc(x.governingMoment.caseLabel)+" / "+esc(x.governingMoment.memberId)+" / "+esc(x.governingMoment.end)+" / "+esc(x.governingMoment.component):"—")+"</td><td>"+(x.governingShear.caseLabel?esc(x.governingShear.caseLabel)+" / "+esc(x.governingShear.memberId)+" / "+esc(x.governingShear.end)+" / "+esc(x.governingShear.component):"—")+"</td><td>"+(x.inputDataComplete?"داده کامل":"ناقص")+"</td><td>محاسبه نشده</td></tr>").join("")+"</tbody></table></div><div class='notice'>"+esc(r.disclaimer)+"</div>";}
function init(){if($("flexureShearReadinessPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="flexureShearReadinessPanel";p.innerHTML="<div class='panel-title'><h3>ممیزی آمادگی طراحی خمش و برش</h3><span class='status'>نیروهای تحلیل + ورودی مقاطع</span></div><div class='notice'>ابتدا تحلیل پوش نیروهای اعضا را اجرا کنید. این پنل تقاضاهای موجود را با ورودی‌های مصالح و مهاربندی تطبیق می‌دهد و ظرفیت آیین‌نامه‌ای محاسبه نمی‌کند.</div><div class='button-grid'><button type='button' class='btn secondary' id='btnFlexureShearReadiness'>ممیزی خمش و برش</button></div><div id='flexureShearReadinessResults'></div>";const anchor=$("compressionDesignPanel")||$("memberForceEnvelopePanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);$("btnFlexureShearReadiness").addEventListener("click",()=>renderResult(audit()));}
function selfTest(){
 const prior=root.SteelMemberDesignInputs;
 root.SteelMemberDesignInputs={getForGroup:()=>({t_mm:10,Fy:235,Fu:340,E_MPa:200000,G_MPa:77000,Kx:1,Ky:1,Kz:1,Lcx:3000,Lcy:3000,Lcz:3000,Lb:3000,Cb:1,bracingNote:"نقشه مهاربندی آزمایشی"})};
 const keys=["column","rafter","endPost","endGirt","roofEdge","roofPurlin","wallGirt","roofBrace","wallBrace"];
 const members=keys.map((sectionKey,i)=>({id:"M"+i,sectionKey,caseCount:1,section:{A:0.01,Iy:1e-5,Iz:1e-4,J:1e-6},peak:{My:0,Mz:0,Vy:0,Vz:0},simultaneousCases:[{label:"ULS",endI:{N:1000,My:500,Mz:-700,Vy:200,Vz:-300,T:0},endJ:{N:-1000,My:-900,Mz:400,Vy:-600,Vz:100,T:0}}]}));
 const env={members,cases:[{label:"ULS",equilibrium:{ok:true}}],allCasesEquilibriumOK:true,modelMemberCount:members.length};
 const r=audit(env);
 if(prior===undefined)delete root.SteelMemberDesignInputs;else root.SteelMemberDesignInputs=prior;
 const tests=[
  {name:"all nine member groups are represented",pass:r.rows.length===9&&r.missingGroups.length===0},
  {name:"complete force vectors and input data never imply calculated resistance or approval",pass:r.rows.every(x=>x.ready===false&&x.resistanceCalculated===false&&x.designApproved===false)&&r.resistanceCalculated===false&&r.designApproved===false&&r.status==="demand-input-and-resistance-audit-only"},
  {name:"input audit completion is explicitly separate from design readiness",pass:r.inputAuditComplete===true&&r.forceDemandComplete===true&&r.demandAuditComplete===true&&r.rows.every(x=>typeof x.inputDataComplete==="boolean"&&typeof x.forceDemandComplete==="boolean")},
  {name:"missing force demand does not contaminate member input completeness",pass:(()=>{const prior=root.SteelMemberDesignInputs;root.SteelMemberDesignInputs={getForGroup:()=>({t_mm:10,Fy:235,Fu:340,E_MPa:200000,G_MPa:77000,Kx:1,Ky:1,Kz:1,Lcx:3000,Lcy:3000,Lcz:3000,Lb:3000,Cb:1,bracingNote:"نقشه مهاربندی آزمایشی"})};const bad=members.map((m,i)=>i===0?{...m,simultaneousCases:[{...m.simultaneousCases[0],endI:{...m.simultaneousCases[0].endI,T:null}}]}:m);const x=audit({...env,members:bad}).rows.find(y=>y.group==="column");if(prior===undefined)delete root.SteelMemberDesignInputs;else root.SteelMemberDesignInputs=prior;return x.inputDataComplete===true&&x.forceDemandComplete===false&&x.resistanceCalculated===false;})()},
  {name:"missing material or stability inputs do not erase complete force demand",pass:(()=>{const prior=root.SteelMemberDesignInputs;root.SteelMemberDesignInputs={getForGroup:()=>({})};const x=audit(env).rows.find(y=>y.group==="column");if(prior===undefined)delete root.SteelMemberDesignInputs;else root.SteelMemberDesignInputs=prior;return x.inputDataComplete===false&&x.forceDemandComplete===true&&x.resistanceStatus==="not-calculated";})()},
  {name:"duplicate simultaneous case labels cannot pass force-demand completeness",pass:(()=>{const bad=members.map((m,i)=>i===0?{...m,simultaneousCases:[m.simultaneousCases[0],{...m.simultaneousCases[0]}]}:m);return audit({...env,members:bad}).rows.find(x=>x.group==="column")?.forceDemandComplete===false;})()},
  {name:"tapered physical members are explicitly blocked from prismatic resistance paths",pass:(()=>{const tapered=members.map((m,i)=>i===1?{...m,parentMemberId:"R1",taperSegmentIndex:1,taperSegmentCount:8}:m);const x=audit({...env,members:tapered});return x.rows.find(y=>y.group==="rafter")?.missing.some(v=>v.includes("متغیرمقطع"))&&x.designApproved===false;})()},
  {name:"purlins and girts require section-specific design path",pass:["roofPurlin","wallGirt"].every(k=>r.rows.find(x=>x.group===k)?.designPath==="section-specific"&&!r.rows.find(x=>x.group===k)?.ready)},
  {name:"braces require axial resistance and connection design",pass:["roofBrace","wallBrace"].every(k=>r.rows.find(x=>x.group===k)?.designPath==="axial"&&!r.rows.find(x=>x.group===k)?.ready)},
  {name:"missing capacity engines cannot produce an overall ready result",pass:r.ready===false},
  {name:"duplicate member IDs block readiness",pass:audit({...env,duplicateMemberIdsByCase:[{caseLabel:"ULS",memberId:"M1"}]}).issues.some(x=>x.includes("تکراری"))},
  {name:"invalid 12-DOF vectors block readiness",pass:audit({...env,invalidForceVectors:[{caseLabel:"ULS",memberId:"M1"}]}).issues.some(x=>x.includes("۱۲ مؤلفه‌ای"))},
  {name:"exact combination labels are required for each member",pass:audit({...env,members:members.map((m,i)=>i===0?{...m,simultaneousCases:[{...m.simultaneousCases[0],label:"OTHER"}]}:m)}).issues.some(x=>x.includes("برچسب دقیق"))},
  {name:"governing moment and shear retain member, case, end and component",pass:(()=>{const x=r.rows.find(x=>x.group==="column");return x.maximumMoment_Nm===900&&x.governingMoment.caseLabel==="ULS"&&x.governingMoment.end==="J"&&x.governingMoment.component==="My"&&x.maximumShear_N===600&&x.governingShear.end==="J"&&x.governingShear.component==="Vy";})()},
  {name:"missing axial or torsional component blocks flexure/shear readiness",pass:(()=>{const bad=members.map((m,i)=>i===0?{...m,simultaneousCases:[{...m.simultaneousCases[0],endI:{...m.simultaneousCases[0].endI,T:null}}]}:m);return audit({...env,members:bad}).issues.some(x=>x.includes("بردار شش‌مؤلفه‌ای I عضو M0"));})()},
  {name:"non-finite end action blocks readiness even when moment and shear exist",pass:(()=>{const bad=members.map((m,i)=>i===0?{...m,simultaneousCases:[{...m.simultaneousCases[0],endJ:{...m.simultaneousCases[0].endJ,N:NaN}}]}:m);return audit({...env,members:bad}).issues.some(x=>x.includes("بردار شش‌مؤلفه‌ای J عضو M0"));})()},
  {name:"blank string and boolean end actions are not silently coerced to zero",pass:(()=>{const blank=members.map((m,i)=>i===0?{...m,simultaneousCases:[{...m.simultaneousCases[0],endI:{...m.simultaneousCases[0].endI,T:""}}]}:m);const bool=members.map((m,i)=>i===0?{...m,simultaneousCases:[{...m.simultaneousCases[0],endJ:{...m.simultaneousCases[0].endJ,N:false}}]}:m);return audit({...env,members:blank}).issues.some(x=>x.includes("بردار شش‌مؤلفه‌ای I عضو M0"))&&audit({...env,members:bool}).issues.some(x=>x.includes("بردار شش‌مؤلفه‌ای J عضو M0"));})()}
  ,{name:"missing cold-formed demand-package link blocks overall readiness",pass:(()=>{const prior=root.SteelColdFormedMemberRegistry;root.SteelColdFormedMemberRegistry={auditDemandLink:()=>({available:true,success:false,issues:["missing demand link"]})};const x=audit(env);if(prior===undefined)delete root.SteelColdFormedMemberRegistry;else root.SteelColdFormedMemberRegistry=prior;return x.ready===false&&x.issues.some(v=>v.includes("missing demand link"));})()}
 ];
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests,scope:"group coverage and readiness routing only"};
}
root.SteelFlexureShearReadiness={audit,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/load-combination-registry.js ===== */
/* SAHROUD STEEL — source-controlled load combination registry.
 * User-supplied/code-reviewed coefficients only; no implicit code defaults.
 * Computes linear effect combinations from supplied case result vectors.
 * It is not a load generator, solver, or code-compliance approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const txt=v=>String(v??"").trim();
function auditDefinitions(input){
 const p=input||{},issues=[],caseIds=new Set(),comboIds=new Set();
 const cases=Array.isArray(p.loadCases)?p.loadCases:[];
 const combos=Array.isArray(p.combinations)?p.combinations:[];
 cases.forEach((c,i)=>{
  const id=txt(c?.id),category=txt(c?.category);
  if(!id)issues.push("حالت بار شماره "+(i+1)+" شناسه ندارد.");
  else if(caseIds.has(id))issues.push("شناسه حالت بار تکراری است: "+id);
  else caseIds.add(id);
  if(!category)issues.push("دسته بار برای "+(id||i+1)+" ثبت نشده است.");
 });
 combos.forEach((c,i)=>{
  const id=txt(c?.id);
  if(!id)issues.push("ترکیب شماره "+(i+1)+" شناسه ندارد.");
  else if(comboIds.has(id))issues.push("شناسه ترکیب تکراری است: "+id);
  else comboIds.add(id);
  const src=c?.source||{};
  if(!txt(src.code)||!txt(src.edition)||!txt(src.clause)||!txt(src.document))issues.push("مرجع آیین‌نامه‌ای کامل برای ترکیب "+(id||i+1)+" ثبت نشده است.");
  const factors=c?.factors;
  if(!factors||typeof factors!=="object"||Array.isArray(factors)||!Object.keys(factors).length){issues.push("ضرایب ترکیب "+(id||i+1)+" خالی است.");return;}
  Object.entries(factors).forEach(([caseId,factor])=>{
   if(!caseIds.has(caseId))issues.push("حالت بار مرجع "+caseId+" در ترکیب "+(id||i+1)+" وجود ندارد.");
   if(!finite(factor))issues.push("ضریب ترکیب برای "+caseId+" عدد متناهی نیست.");
  });
 });
 return {success:issues.length===0&&cases.length>0&&combos.length>0,issues,caseCount:cases.length,combinationCount:combos.length,analysisEnabled:false,designApproved:false,scope:"definition-only; no load effects or solver results"};
}
function audit(input){
 const p=input||{},issues=[],rows=[],ids=new Set();
 const cases=Array.isArray(p.loadCases)?p.loadCases:[];
 const combos=Array.isArray(p.combinations)?p.combinations:[];
 const caseMap=new Map();
 cases.forEach((c,i)=>{
  const id=txt(c?.id),cat=txt(c?.category);
  if(!id)issues.push("حالت بار شماره "+(i+1)+" شناسه ندارد.");
  else if(caseMap.has(id))issues.push("شناسه حالت بار تکراری است: "+id);
  else caseMap.set(id,c);
  if(!cat)issues.push("دسته بار برای "+(id||i+1)+" ثبت نشده است.");
  if(!c?.effects||typeof c.effects!=="object"||Array.isArray(c.effects)||!Object.keys(c.effects).length)issues.push("بردار اثرات برای "+(id||i+1)+" معتبر و غیرخالی نیست.");
  else Object.entries(c.effects).forEach(([k,v])=>{if(!txt(k)||!finite(v))issues.push("اثر غیرعددی/نامعتبر در حالت "+(id||i+1)+": "+k);});
 });
 combos.forEach((c,i)=>{
  const id=txt(c?.id);
  if(!id)issues.push("ترکیب شماره "+(i+1)+" شناسه ندارد.");
  else if(ids.has(id))issues.push("شناسه ترکیب تکراری است: "+id);
  else ids.add(id);
  const src=c?.source||{};
  if(!txt(src.code)||!txt(src.edition)||!txt(src.clause)||!txt(src.document))issues.push("مرجع آیین‌نامه‌ای کامل برای ترکیب "+(id||i+1)+" ثبت نشده است.");
  const factors=c?.factors;
  if(!factors||typeof factors!=="object"||Array.isArray(factors)||!Object.keys(factors).length){issues.push("ضرایب ترکیب "+(id||i+1)+" خالی است.");return;}
  Object.entries(factors).forEach(([caseId,factor])=>{
   if(!caseMap.has(caseId))issues.push("حالت بار مرجع "+caseId+" در ترکیب "+(id||i+1)+" وجود ندارد.");
   if(!finite(factor))issues.push("ضریب ترکیب برای "+caseId+" عدد متناهی نیست.");
  });
  if(Object.keys(factors).some(k=>!caseMap.has(k)))return;
  const selectedCaseIds=Object.keys(factors);
  const keys=Object.keys(caseMap.get(selectedCaseIds[0]).effects||{}).sort();
  if(!keys.length){issues.push("بردار اثرات حالت‌های مرجع ترکیب "+(id||i+1)+" خالی است.");return;}
  const keySignature=JSON.stringify(keys);
  selectedCaseIds.slice(1).forEach(caseId=>{
   const caseKeys=Object.keys(caseMap.get(caseId).effects||{}).sort();
   if(JSON.stringify(caseKeys)!==keySignature)
    issues.push("مؤلفه‌های بردار اثرات بین حالت‌های بار ترکیب "+(id||i+1)+" یکسان نیست؛ مؤلفه مفقود نباید به‌طور ضمنی صفر فرض شود.");
  });
  if(issues.length)return;
  const effects={};
  keys.forEach(k=>{effects[k]=selectedCaseIds.reduce((sum,caseId)=>sum+factors[caseId]*caseMap.get(caseId).effects[k],0);});
  rows.push({id,source:{code:txt(src.code),edition:txt(src.edition),clause:txt(src.clause),document:txt(src.document)},effects});
 });
 const keys=new Set(rows.flatMap(r=>Object.keys(r.effects)));
 const envelope={};
 keys.forEach(k=>{const vals=rows.filter(r=>finite(r.effects[k])).map(r=>({combinationId:r.id,value:r.effects[k]}));if(vals.length)envelope[k]={maximum:vals.reduce((a,b)=>b.value>a.value?b:a),minimum:vals.reduce((a,b)=>b.value<a.value?b:a)};});
 return {success:issues.length===0&&rows.length===combos.length&&combos.length>0,issues,combinations:rows,envelope,analysisEnabled:false,designApproved:false,limitations:["ضرایب از هیچ آیین‌نامه‌ای به‌طور خودکار انتخاب نمی‌شوند.","اثرهای ورودی باید خروجی معتبر تحلیل برای همان مدل و حالت بار باشند.","ترکیب خطی اثرها جایگزین تحلیل غیرخطی، اندرکنش مرتبه دوم، یا کنترل ضوابط نیست.","نتیجه این ممیزی به‌تنهایی تأیید طراحی محسوب نمی‌شود."]};
}
function selfTest(){
 const t=[],test=(name,fn)=>{try{t.push({name,ok:fn()!==false});}catch(e){t.push({name,ok:false,detail:e.message});}};
 const base={loadCases:[{id:"D",category:"dead",effects:{M:10,V:4}},{id:"W+",category:"wind",effects:{M:5,V:-2}},{id:"W-",category:"wind",effects:{M:-7,V:3}}],combinations:[{id:"C1",factors:{D:1.2,"W+":1.0},source:{code:"مبحث ششم",edition:"۱۳۹۸",clause:"بند نمونه",document:"مصوبه کنترل‌شده پروژه"}},{id:"C2",factors:{D:1.2,"W-":1.0},source:{code:"مبحث ششم",edition:"۱۳۹۸",clause:"بند نمونه",document:"مصوبه کنترل‌شده پروژه"}}]};
 test("combination effects calculated with entered factors",()=>{const r=audit(base);return r.success&&r.combinations[0].effects.M===17&&r.combinations[1].effects.M===5;});
 test("positive and negative wind cases remain separate",()=>audit(base).combinations.length===2);
 test("maximum and minimum envelopes identified",()=>{const e=audit(base).envelope.M;return e.maximum.value===17&&e.minimum.value===5;});
 test("missing code source rejected",()=>{const p=JSON.parse(JSON.stringify(base));delete p.combinations[0].source.document;return !audit(p).success;});
 test("unknown load case rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.combinations[0].factors.X=1;return !audit(p).success;});
 test("duplicate combination ID rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.combinations[1].id="C1";return !audit(p).success;});
 test("duplicate load case ID rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.loadCases[1].id="D";return !audit(p).success;});
 test("non-finite coefficient rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.combinations[0].factors.D="1.2";return !audit(p).success;});
 test("non-numeric effect rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.loadCases[0].effects.M="10";return !audit(p).success;});
 test("missing effect component is not silently treated as zero",()=>{const p=JSON.parse(JSON.stringify(base));delete p.loadCases[1].effects.V;return !audit(p).success;});
 test("empty effect vector rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.loadCases[0].effects={};return !audit(p).success;});
 test("empty combination list rejected",()=>!audit({loadCases:base.loadCases,combinations:[]}).success);
 test("no implicit factors or code presets",()=>Object.keys(audit({}).combinations).length===0);
 test("definition audit validates coefficients without synthetic effect vectors",()=>auditDefinitions({loadCases:[{id:"D",category:"dead"}],combinations:[{id:"C",factors:{D:1},source:{code:"M6",edition:"1398",clause:"6-1",document:"approved"}}]}).success);
 test("definition audit rejects unknown factor case",()=>!auditDefinitions({loadCases:[{id:"D",category:"dead"}],combinations:[{id:"C",factors:{X:1},source:{code:"M6",edition:"1398",clause:"6-1",document:"approved"}}]}).success);
 test("definition audit rejects incomplete source",()=>!auditDefinitions({loadCases:[{id:"D",category:"dead"}],combinations:[{id:"C",factors:{D:1},source:{code:"M6"}}]}).success);
 test("definition audit never approves design",()=>auditDefinitions({loadCases:[{id:"D",category:"dead"}],combinations:[{id:"C",factors:{D:1},source:{code:"M6",edition:"1398",clause:"6-1",document:"approved"}}]}).designApproved===false);
 test("never enables analysis or approves design",()=>{const r=audit(base);return r.analysisEnabled===false&&r.designApproved===false;});
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t};
}
root.SteelLoadCombinationRegistry={audit,auditDefinitions,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/load-case-evidence-contract.js ===== */
/* SAHROUD STEEL — load-case evidence contract.
 * Evidence and unit validation only. Does not generate loads or apply combinations.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v),txt=v=>String(v??"").trim();
const VALID_UNITS=new Set(["N","kN","N/m","kN/m","N/m2","kN/m2","N.m","kN.m","C","mm","m"]);
const VALID_TYPES=new Set(["nodal","member_point","member_uniform","surface","support_settlement","temperature","crane_wheel","other"]);
function audit(input){
 const p=input||{},issues=[],rows=[],ids=new Set(),cases=Array.isArray(p.loadCases)?p.loadCases:[];
 if(!cases.length)issues.push("حداقل یک حالت بار مستند لازم است.");
 cases.forEach((c,i)=>{
  const id=txt(c&&c.id),label=id||("ردیف "+(i+1));
  if(!id)issues.push(label+" شناسه ندارد.");else if(ids.has(id))issues.push("شناسه تکراری حالت بار: "+id);else ids.add(id);
  if(!VALID_TYPES.has(txt(c&&c.type)))issues.push(label+" نوع بار نامعتبر/ثبت‌نشده است.");
  if(!txt(c&&c.category))issues.push(label+" دسته بار ثبت نشده است.");
  if(!txt(c&&c.unit)||!VALID_UNITS.has(txt(c.unit)))issues.push(label+" واحد بار نامعتبر یا نامشخص است.");
  if(!txt(c&&c.coordinateSystem))issues.push(label+" دستگاه مختصات مشخص نیست.");
  if(!txt(c&&c.signConvention))issues.push(label+" قرارداد علامت مشخص نیست.");
  if(!txt(c&&c.target))issues.push(label+" مقصد اعمال بار مشخص نیست.");
  const src=c&&c.source||{};
  ["document","revision","locator"].forEach(k=>{if(!txt(src[k]))issues.push(label+" منبع "+k+" ندارد.");});
  if(!src||!txt(src.authority))issues.push(label+" مرجع/تهیه‌کننده منبع مشخص نیست.");
  const values=c&&c.values;
  if(!values||typeof values!=="object"||Array.isArray(values)||!Object.keys(values).length)issues.push(label+" مقادیر بار خالی یا نامعتبر است.");
  else Object.entries(values).forEach(([k,v])=>{if(!txt(k)||!finite(v))issues.push(label+" مقدار غیرعددی/نامتناهی: "+k);});
  if(c&&c.application&&c.application.memberId&&!txt(c.application.memberId))issues.push(label+" شناسه عضو مقصد نامعتبر است.");
  rows.push({id,type:txt(c&&c.type),category:txt(c&&c.category),unit:txt(c&&c.unit),target:txt(c&&c.target),source:src});
 });
 return {success:issues.length===0,status:issues.length?"incomplete":"evidence-complete",issues,rows,loadGenerationEnabled:false,solverEnabled:false,designApproved:false,limitations:["این قرارداد فقط کامل‌بودن شواهد و فراداده را ممیزی می‌کند؛ مقدار بار را از آیین‌نامه تولید یا تأیید نمی‌کند.","تبدیل واحد، توزیع بار، انتقال به گره/عضو و ترکیب بار در این مرحله انجام نمی‌شود.","منبع ثبت‌شده باید توسط مهندس مسئول از نظر اعتبار و انطباق پروژه بررسی شود."]};
}
function selfTest(){
 const s={document:"نقشه بارگذاری",revision:"A",locator:"شیت L-01، یادداشت ۳",authority:"مهندس محاسب"};
 const base={loadCases:[{id:"D1",type:"member_uniform",category:"dead",unit:"kN/m",coordinateSystem:"member-local",signConvention:"local +y downward",target:"member:M1",source:s,values:{qy:4}}]};
 const tests=[
 ["complete sourced case accepted",()=>audit(base).success],
 ["missing source locator rejected",()=>{const x=JSON.parse(JSON.stringify(base));delete x.loadCases[0].source.locator;return !audit(x).success;}],
 ["unknown unit rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].unit="kg-ish";return !audit(x).success;}],
 ["missing sign convention rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].signConvention="";return !audit(x).success;}],
 ["duplicate case IDs rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases.push({...x.loadCases[0]});return !audit(x).success;}],
 ["nonfinite numeric value rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].values.qy=Infinity;return !audit(x).success;}],
 ["unknown load type rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].type="magic";return !audit(x).success;}],
 ["empty case collection rejected",()=>!audit({loadCases:[]}).success],
 ["no generation or approval",()=>{const r=audit(base);return !r.loadGenerationEnabled&&!r.solverEnabled&&!r.designApproved;}]
 ];
 const results=tests.map(([name,fn])=>({name,ok:!!fn()}));return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelLoadCaseEvidenceContract={audit,selfTest,validUnits:Array.from(VALID_UNITS)};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/solver-model-proposal-adapter.js ===== */
/* SAHROUD STEEL — non-mutating adapter to SteelFrame3D.
 * It creates a validated proposal only. No project loadData call and no implicit solve.
 */
(function(root){"use strict";
const txt=v=>String(v??"").trim(),finite=v=>typeof v==="number"&&Number.isFinite(v);
function audit(model,options){
 const p=model||{},o=options||{},issues=[],warnings=[],nodes=Array.isArray(p.nodes)?p.nodes:[],members=Array.isArray(p.members)?p.members:[],supports=Array.isArray(o.supports)?o.supports:[];
 const nodeIds=new Set(),memberIds=new Set(),nodeMap=new Map();
 if(!nodes.length)issues.push("گره‌ای برای مدل پیشنهادشده وجود ندارد.");
 nodes.forEach((n,i)=>{const id=txt(n&&n.id);if(!id)issues.push("گره "+(i+1)+" شناسه ندارد.");else if(nodeIds.has(id))issues.push("شناسه گره تکراری: "+id);else nodeIds.add(id);if(!["x","y","z"].every(k=>finite(n&&n[k])))issues.push("مختصات گره "+(id||i+1)+" باید سه عدد متناهی بر حسب متر باشد.");nodeMap.set(id,n);});
 if(!members.length)issues.push("عضوی برای مدل پیشنهادشده وجود ندارد.");
 members.forEach((m,i)=>{const id=txt(m&&m.id),a=txt(m&&m.start),b=txt(m&&m.end);if(!id)issues.push("عضو "+(i+1)+" شناسه ندارد.");else if(memberIds.has(id))issues.push("شناسه عضو تکراری: "+id);else memberIds.add(id);if(!nodeIds.has(a)||!nodeIds.has(b))issues.push("اتصال گره‌ای عضو "+(id||i+1)+" نامعتبر است.");else{const A=nodeMap.get(a),B=nodeMap.get(b);if(Math.hypot(A.x-B.x,A.y-B.y,A.z-B.z)<=1e-9)issues.push("عضو با طول صفر: "+id);}if(!txt(m&&m.sectionKey)&&!txt(m&&m.sectionRef))issues.push("شناسه مقطع عضو "+(id||i+1)+" ثبت نشده است.");if(m&&m.sectionRef&&!o.sectionMap?.[m.sectionRef])issues.push("مقطع مرجع "+m.sectionRef+" برای عضو "+id+" نگاشت صریح ندارد.");if(m&&m.taperApplied&&(!Array.isArray(m.taperStations)||m.taperStations.length<2))issues.push("عضو متغیر "+id+" فاقد ایستگاه‌های هندسی کافی است؛ تبدیل به منشوری مجاز نیست.");});
 if(!supports.length)issues.push("حداقل یک تکیه‌گاه صریح لازم است.");
 supports.forEach((s,i)=>{if(!nodeIds.has(txt(s&&s.nodeId)))issues.push("گره تکیه‌گاهی ردیف "+(i+1)+" در مدل نیست.");const d=s&&s.fixedDofs;if(!Array.isArray(d)||d.some(x=>!Number.isInteger(x)||x<0||x>5)||new Set(d||[]).size!==(d||[]).length)issues.push("درجه‌های آزادی مقید تکیه‌گاه "+(i+1)+" باید آرایه یکتای ۰ تا ۵ باشد.");});
 const releaseKeys=new Set();
 (Array.isArray(o.releases)?o.releases:[]).forEach(r=>{const mid=txt(r&&r.memberId),end=txt(r&&r.end),dof=r&&r.dof,key=mid+":"+end+":"+dof;if(!memberIds.has(mid))issues.push("آزادسازی به عضو ناموجود ارجاع می‌دهد: "+mid);if(!["i","j"].includes(end)||!Number.isInteger(dof)||dof<3||dof>5)issues.push("تعریف آزادسازی انتهایی نامعتبر است.");if(releaseKeys.has(key))issues.push("آزادسازی تکراری: "+key);releaseKeys.add(key);});
 const torsionEnds=new Set();(Array.isArray(o.releases)?o.releases:[]).filter(r=>r&&r.dof===3).forEach(r=>torsionEnds.add(txt(r.memberId)+":"+txt(r.end)));memberIds.forEach(mid=>{if(torsionEnds.has(mid+":i")&&torsionEnds.has(mid+":j"))issues.push("آزادسازی پیچش در هر دو انتهای عضو "+mid+" می‌تواند ناپایداری ایجاد کند و مسدود است.");});
 if(members.some(m=>m&&m.sectionRef)&&!o.sectionMap)issues.push("جدول نگاشت مقاطع ارائه نشده است.");
 if(members.some(m=>m&&m.analysisLoad==null))warnings.push("برای بعضی اعضا بار عضو صریح ثبت نشده؛ حل با requireExplicitMemberLoads فعال مجاز نیست.");
 return {success:issues.length===0,status:issues.length?"blocked":"proposal-ready",issues,warnings,counts:{nodes:nodes.length,members:members.length,supports:supports.length},solverEnabled:false,projectMutation:false,designApproved:false,limitations:["این مبدل فقط توپولوژی و داده‌های صریح را پیش‌ممیزی می‌کند.","خواص مقطع، مصالح، تکیه‌گاه و بار باید از منابع معتبر و با واحدهای سازگار تأمین شوند.","مقاطع ناشناخته یا اعضای متغیر فاقد ایستگاه هندسی مسدود می‌مانند.","حل‌گر قاب ۳بعدی فعلی، رفتار غیرخطی/پایداری کلی و تمام جزئیات اتصال را به‌طور خودکار پوشش نمی‌دهد."]};
}
function buildProposal(model,options){const result=audit(model,options);if(!result.success)return {success:false,audit:result,proposal:null};const members=model.members.map(m=>({...m,endReleases:{i:[...(m.endReleases?.i||[])],j:[...(m.endReleases?.j||[])]}}));(options.releases||[]).forEach(r=>{if(!members.some(m=>String(m.id)===String(r.memberId)))return;const m=members.find(x=>String(x.id)===String(r.memberId));if(!m.endReleases[r.end].includes(r.dof))m.endReleases[r.end].push(r.dof);});return {success:true,audit:result,proposal:{model:{nodes:model.nodes.map(n=>({...n})),members},options:{supports:(options.supports||[]).map(s=>({...s})),sectionResolver:options.sectionResolver,requireExplicitMemberLoads:true},solverEnabled:false,projectMutation:false,designApproved:false}};}
function solveExplicit(model,options,authorization){if(!authorization||authorization.runSolver!==true)throw new Error("اجرای حل‌گر نیازمند فرمان صریح runSolver:true است.");const built=buildProposal(model,options);if(!built.success)throw new Error("مدل پیشنهادی پیش‌ممیزی را نگذرانده است.");if(typeof root.SteelFrame3D?.analyze!=="function")throw new Error("حل‌گر SteelFrame3D در دسترس نیست.");if(typeof options.sectionResolver!=="function")throw new Error("sectionResolver صریح لازم است.");const result=root.SteelFrame3D.analyze(built.proposal.model,{...built.proposal.options,...options,requireExplicitMemberLoads:true});return {result,modelAudit:built.audit,projectMutation:false,designApproved:false};}
function selfTest(){const model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:2,y:0,z:0}],members:[{id:"M1",start:"A",end:"B",sectionKey:"I"}]},opts={supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}]};const t=[["valid topology accepted",()=>audit(model,opts).success],["unknown node rejected",()=>{const x=JSON.parse(JSON.stringify(model));x.members[0].end="X";return !audit(x,opts).success;}],["zero length rejected",()=>{const x=JSON.parse(JSON.stringify(model));x.nodes[1].x=0;return !audit(x,opts).success;}],["duplicate IDs rejected",()=>{const x=JSON.parse(JSON.stringify(model));x.nodes.push({...x.nodes[0]});return !audit(x,opts).success;}],["support DOF bounds enforced",()=>!audit(model,{supports:[{nodeId:"A",fixedDofs:[6]}]}).success],["unmapped section reference rejected",()=>{const x=JSON.parse(JSON.stringify(model));x.members[0].sectionRef="UNKNOWN";return !audit(x,opts).success;}],["taper without stations blocked",()=>{const x=JSON.parse(JSON.stringify(model));x.members[0].taperApplied=true;return !audit(x,opts).success;}],["explicit releases mapped to solver member format",()=>{const r=buildProposal(model,{...opts,releases:[{memberId:"M1",end:"i",dof:4}]});return r.success&&r.proposal.model.members[0].endReleases.i.includes(4)&&r.proposal.model.members[0].endReleases.j.length===0;}],["torsion released at both ends rejected",()=>!audit(model,{...opts,releases:[{memberId:"M1",end:"i",dof:3},{memberId:"M1",end:"j",dof:3}]}).success],["no project mutation",()=>{const r=buildProposal(model,opts);return r.success&&r.proposal.projectMutation===false;}],["solver authorization required",()=>{try{solveExplicit(model,opts,{});return false;}catch(e){return true;}}]];const results=t.map(([name,fn])=>({name,ok:!!fn()}));return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};}
root.SteelSolverModelProposalAdapter={audit,buildProposal,solveExplicit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-simultaneous-action-contract.js ===== */
/* SAHROUD STEEL — simultaneous member action contract.
 * Demand trace only; does not calculate resistance or combine non-concurrent envelopes.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v),txt=v=>String(v??"").trim();
const KEYS=["Fx","Fy","Fz","Mx","My","Mz"];
function audit(input){
 const p=input||{},issues=[],rows=[],cases=Array.isArray(p.cases)?p.cases:[],members=new Set((p.memberIds||[]).map(txt));
 if(!cases.length)issues.push("هیچ حالت تحلیل عضو ارائه نشده است.");
 const caseIds=new Set();
 cases.forEach((c,ci)=>{const id=txt(c&&c.caseId);if(!id)issues.push("نتیجه تحلیل ردیف "+(ci+1)+" شناسه ترکیب/حالت بار ندارد.");else if(caseIds.has(id))issues.push("شناسه نتیجه تکراری: "+id);else caseIds.add(id);
  if(c&&c.equilibriumOk!==true)issues.push("تعادل سازه برای حالت "+(id||ci+1)+" تأیید نشده است.");
  const seen=new Set(),items=Array.isArray(c&&c.members)?c.members:[];
  items.forEach((m,mi)=>{const mid=txt(m&&m.memberId);if(!mid)issues.push("شناسه عضو در "+(id||ci+1)+" ردیف "+(mi+1)+" خالی است.");if(seen.has(mid))issues.push("عضو تکراری در حالت "+id+": "+mid);seen.add(mid);if(members.size&&!members.has(mid))issues.push("عضو "+mid+" خارج از مدل مرجع است.");["endI","endJ"].forEach(end=>{const v=m&&m[end];if(!v||KEYS.some(k=>!finite(v[k])))issues.push("شش مؤلفه همزمان "+end+" برای عضو "+mid+" در حالت "+id+" کامل نیست.");});});
  if(members.size)members.forEach(mid=>{if(!seen.has(mid))issues.push("عضو "+mid+" در نتیجه حالت "+id+" مفقود است.");});
  rows.push({caseId:id,memberCount:items.length,memberIds:items.map(m=>txt(m&&m.memberId))});
 });
 return {success:issues.length===0,status:issues.length?"incomplete":"simultaneous-demand-complete",issues,rows,actionComponents:KEYS,concurrencyPreserved:true,envelopeMixingPerformed:false,resistanceCalculated:false,designApproved:false,limitations:["هر شش مؤلفه نیرو و لنگر در دو انتهای هر عضو باید از یک حالت تحلیل واحد باشند.","حداکثر و حداقل مؤلفه‌های مستقل نباید برای ساخت یک بردار مصنوعی با هم ترکیب شوند.","این قرارداد تقاضا را ممیزی می‌کند و ظرفیت، کمانش یا انطباق آیین‌نامه‌ای را محاسبه نمی‌کند."]};
}
function selfTest(){const force={Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},base={memberIds:["M1"],cases:[{caseId:"ULS-01",equilibriumOk:true,members:[{memberId:"M1",endI:force,endJ:{...force,Fx:-1}}]},{caseId:"ULS-02",equilibriumOk:true,members:[{memberId:"M1",endI:{...force,My:99},endJ:{...force,My:-99}}]}]};const t=[["complete concurrent vectors accepted",()=>audit(base).success],["missing end component rejected",()=>{const x=JSON.parse(JSON.stringify(base));delete x.cases[0].members[0].endI.Mz;return !audit(x).success;}],["failed equilibrium rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[0].equilibriumOk=false;return !audit(x).success;}],["missing member in case rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[1].members=[];return !audit(x).success;}],["duplicate case ID rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[1].caseId="ULS-01";return !audit(x).success;}],["duplicate member within case rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[0].members.push({...x.cases[0].members[0]});return !audit(x).success;}],["nonfinite action rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[0].members[0].endJ.Mx=NaN;return !audit(x).success;}],["independent envelopes never merged",()=>{const r=audit(base);return r.concurrencyPreserved&&r.envelopeMixingPerformed===false;}]];const results=t.map(([name,fn])=>({name,ok:!!fn()}));return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};}
root.SteelMemberSimultaneousActionContract={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/load-case-workbench.js ===== */
/* SAHROUD STEEL — load case and combination evidence workbench.
 * UI + project persistence. This records engineer-supplied data only.
 */
(function(root){"use strict";
const txt=v=>String(v??"").trim();
const clone=v=>JSON.parse(JSON.stringify(v));
let state={loadCases:[],combinations:[],status:"evidence_collection_only",designApproved:false,solverEnabled:false};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function audit(data){
 const p=data||{},cases=Array.isArray(p.loadCases)?p.loadCases:[],combinations=Array.isArray(p.combinations)?p.combinations:[];
 const caseAudit=root.SteelLoadCaseEvidenceContract?.audit?.({loadCases:cases})||{success:false,issues:["قرارداد ممیزی حالت بار بارگذاری نشده است."]};
 const registry=root.SteelLoadCombinationRegistry?.audit?.({loadCases:cases.map(c=>({id:c.id,category:c.category,effects:c.values})),combinations})||{success:false,issues:["رجیستری ترکیب بار بارگذاری نشده است."]};
 const compatibilityIssues=[];
 const byId=new Map(cases.map(c=>[String(c?.id??""),c]));
 combinations.forEach(combo=>{
  const factors=combo?.factors&&typeof combo.factors==="object"&&!Array.isArray(combo.factors)?combo.factors:{};
  const selected=Object.keys(factors).map(id=>byId.get(id)).filter(Boolean);
  if(selected.length!==Object.keys(factors).length)return;
  const first=selected[0];if(!first)return;
  ["unit","coordinateSystem","signConvention"].forEach(key=>{
   if(selected.some(c=>String(c?.[key]??"").trim()!==String(first?.[key]??"").trim()))
    compatibilityIssues.push("ترکیب "+String(combo?.id??"?")+" حالت‌های بار با "+key+" متفاوت دارد؛ تبدیل/یکسان‌سازی این مشخصه در این مسیر انجام نمی‌شود.");
  });
 });
 return {success:caseAudit.success&&registry.success&&compatibilityIssues.length===0,caseAudit,registry,compatibilityIssues,issues:[...caseAudit.issues,...registry.issues,...compatibilityIssues],designApproved:false,solverEnabled:false};
}
function panelHTML(){return `
<section class="panel" id="loadCaseWorkbench">
 <div class="panel-title"><h3>۱۰ ـ دفتر ثبت حالت‌ها و ترکیب‌های بار مستند</h3><span class="status">ثبت شواهد؛ بدون اجرای تحلیل</span></div>
 <div class="notice">این دفترچه، حالت‌های بار و ضرایب ترکیب را فقط با اطلاعاتی که مهندس وارد می‌کند ثبت می‌کند. هیچ بار یا ضریب آیین‌نامه‌ای به‌طور خودکار تولید نمی‌شود. واحدها باید با یکدیگر سازگار باشند. ثبت اطلاعات به معنی تأیید مهندسی یا ارسال بار به حل‌گر نیست.</div>
 <h4>الف ـ ثبت حالت بار</h4>
 <div class="form-grid">
  <div class="field"><label for="lcw_id">شناسه یکتا</label><input id="lcw_id" placeholder="مثلاً D-01"></div>
  <div class="field"><label for="lcw_type">نوع بار</label><select id="lcw_type"><option value="nodal">گرهی</option><option value="member_point">متمرکز روی عضو</option><option value="member_uniform">گسترده روی عضو</option><option value="surface">سطحی</option><option value="crane_wheel">چرخ جرثقیل</option><option value="support_settlement">نشست تکیه‌گاه</option><option value="temperature">دما</option><option value="other">سایر</option></select></div>
  <div class="field"><label for="lcw_category">دسته بار</label><input id="lcw_category" placeholder="dead / live / snow / wind / crane"></div>
  <div class="field"><label for="lcw_unit">واحد</label><select id="lcw_unit"><option>kN</option><option>N</option><option>kN/m</option><option>N/m</option><option>kN/m2</option><option>N/m2</option><option>kN.m</option><option>N.m</option><option>mm</option><option>m</option><option>C</option></select></div>
  <div class="field"><label for="lcw_coordinates">دستگاه مختصات</label><input id="lcw_coordinates" placeholder="global / member-local"></div>
  <div class="field"><label for="lcw_sign">قرارداد علامت</label><input id="lcw_sign" placeholder="مثلاً +Z رو به بالا"></div>
  <div class="field"><label for="lcw_target">مقصد بار</label><input id="lcw_target" placeholder="node:N1 / member:M1 / surface:..."></div>
 </div>
 <div class="field"><label for="lcw_values">مقادیر عددی (JSON)</label><textarea id="lcw_values" rows="2" placeholder='{"Fz":-12.5}'></textarea></div>
 <h4>منبع و ردیابی</h4>
 <div class="form-grid">
  <div class="field"><label for="lcw_doc">نام سند</label><input id="lcw_doc"></div>
  <div class="field"><label for="lcw_revision">ویرایش / تاریخ</label><input id="lcw_revision"></div>
  <div class="field"><label for="lcw_locator">صفحه / شیت / بند دقیق</label><input id="lcw_locator"></div>
  <div class="field"><label for="lcw_authority">تهیه‌کننده / مرجع</label><input id="lcw_authority"></div>
 </div>
 <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" id="lcw_add">ثبت حالت بار</button><button type="button" id="lcw_clear" class="secondary">پاک‌کردن فرم</button></div>
 <div id="lcw_cases" class="notice">هنوز حالتی ثبت نشده است.</div>
 <h4>ب ـ ثبت ترکیب بار</h4>
 <div class="notice">ضرایب باید صریحاً توسط طراح وارد شوند. قالب ضرایب JSON است؛ کلیدها شناسه حالت بار و مقدارها ضریب عددی هستند.</div>
 <div class="form-grid">
  <div class="field"><label for="lcw_combo_id">شناسه ترکیب</label><input id="lcw_combo_id" placeholder="مثلاً ULS-01"></div>
  <div class="field"><label for="lcw_factors">ضرایب (JSON)</label><input id="lcw_factors" placeholder='{"D-01":1.2,"W-01":1.0}'></div>
  <div class="field"><label for="lcw_code">مرجع آیین‌نامه</label><input id="lcw_code" placeholder="مبحث ششم"></div>
  <div class="field"><label for="lcw_edition">ویرایش</label><input id="lcw_edition"></div>
  <div class="field"><label for="lcw_clause">بند / جدول</label><input id="lcw_clause"></div>
  <div class="field"><label for="lcw_combo_doc">سند مبنای مصوب پروژه</label><input id="lcw_combo_doc"></div>
 </div>
 <button type="button" id="lcw_add_combo">ثبت ترکیب بار</button>
 <div id="lcw_combinations" class="notice">هنوز ترکیبی ثبت نشده است.</div>
 <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" id="lcw_audit">ممیزی شواهد و ترکیب‌ها</button><button type="button" id="lcw_export" class="secondary">دریافت JSON دفترچه</button></div>
 <div id="lcw_result" class="notice">وضعیت ممیزی هنوز مشخص نشده است.</div>
</section>`;}
function render(){
 const a=$("lcw_cases"),b=$("lcw_combinations");if(!a||!b)return;
 a.innerHTML=state.loadCases.length?state.loadCases.map((x,i)=>`<div class="notice"><b>${esc(x.id)}</b> — ${esc(x.category)} / ${esc(x.type)} / ${esc(x.unit)}<br>مقصد: ${esc(x.target)} | منبع: ${esc(x.source.document)} — ${esc(x.source.locator)} <button type="button" data-lcw-remove="${i}">حذف</button></div>`).join(""):"هنوز حالتی ثبت نشده است.";
 b.innerHTML=state.combinations.length?state.combinations.map((x,i)=>`<div class="notice"><b>${esc(x.id)}</b> — ضرایب: ${esc(JSON.stringify(x.factors))}<br>${esc(x.source.code)}، ویرایش ${esc(x.source.edition)}، ${esc(x.source.clause)} <button type="button" data-lcw-combo-remove="${i}">حذف</button></div>`).join(""):"هنوز ترکیبی ثبت نشده است.";
 a.querySelectorAll("[data-lcw-remove]").forEach(el=>el.addEventListener("click",()=>{state.loadCases.splice(Number(el.dataset.lcwRemove),1);render();persistAndSave();}));
 b.querySelectorAll("[data-lcw-combo-remove]").forEach(el=>el.addEventListener("click",()=>{state.combinations.splice(Number(el.dataset.lcwComboRemove),1);render();persist();}));
}
function persist(){state.status="evidence_collection_only";state.designApproved=false;state.solverEnabled=false;return clone(state);}
function persistAndSave(){const snapshot=persist();root.SteelProject?.saveSnapshot?.();return snapshot;}
function setData(data){const d=data||{};state={loadCases:Array.isArray(d.loadCases)?clone(d.loadCases):[],combinations:Array.isArray(d.combinations)?clone(d.combinations):[],status:"evidence_collection_only",designApproved:false,solverEnabled:false};render();return true;}
function read(){return persist();}
function parseJSON(id,label){try{return JSON.parse($(id).value||"{}");}catch(e){throw new Error(label+" باید JSON معتبر باشد.");}}
function addCase(){
 const c={id:txt($("lcw_id").value),type:$("lcw_type").value,category:txt($("lcw_category").value),unit:$("lcw_unit").value,coordinateSystem:txt($("lcw_coordinates").value),signConvention:txt($("lcw_sign").value),target:txt($("lcw_target").value),values:parseJSON("lcw_values","مقادیر"),source:{document:txt($("lcw_doc").value),revision:txt($("lcw_revision").value),locator:txt($("lcw_locator").value),authority:txt($("lcw_authority").value)}};
 if(!c.id||!c.category||!c.coordinateSystem||!c.signConvention||!c.target||!Object.keys(c.values).length||!c.source.document||!c.source.revision||!c.source.locator||!c.source.authority)throw new Error("همه مشخصات، مقادیر و چهار جزء منبع باید تکمیل شوند.");
 if(state.loadCases.some(x=>x.id===c.id))throw new Error("شناسه حالت بار تکراری است.");
 if(!c.values||typeof c.values!=="object"||Array.isArray(c.values)||Object.values(c.values).some(v=>typeof v!=="number"||!Number.isFinite(v)))throw new Error("مقادیر باید یک شیء شامل اعداد متناهی باشند.");
 state.loadCases.push(c);render();persist();$("lcw_id").value="";$("lcw_values").value="";
}
function addCombo(){
 const c={id:txt($("lcw_combo_id").value),factors:parseJSON("lcw_factors","ضرایب"),source:{code:txt($("lcw_code").value),edition:txt($("lcw_edition").value),clause:txt($("lcw_clause").value),document:txt($("lcw_combo_doc").value)}};
 if(!c.id||!c.factors||typeof c.factors!=="object"||Array.isArray(c.factors)||!Object.keys(c.factors).length||!c.source.code||!c.source.edition||!c.source.clause||!c.source.document)throw new Error("شناسه، ضرایب به شکل شیء JSON و تمام مشخصات منبع ترکیب لازم است.");
 if(state.combinations.some(x=>x.id===c.id))throw new Error("شناسه ترکیب تکراری است.");
 if(Object.values(c.factors).some(v=>typeof v!=="number"||!Number.isFinite(v)))throw new Error("ضرایب باید اعداد متناهی باشند.");
 state.combinations.push(c);render();persist();$("lcw_combo_id").value="";
}
function report(result){const el=$("lcw_result");if(!el)return;el.textContent=result.success?"ممیزی شواهد و ساختار ترکیب‌ها موفق شد؛ این نتیجه تأیید طراحی نیست.":("اطلاعات ناقص یا ناسازگار است: "+result.issues.join(" | "));}
function init(){
 if(!$("advancedLoadPanel")||$("loadCaseWorkbench"))return;
 $("advancedLoadPanel").insertAdjacentHTML("afterend",panelHTML());
 $("lcw_add").addEventListener("click",()=>{try{addCase();}catch(e){report({success:false,issues:[e.message]});}});
 $("lcw_clear").addEventListener("click",()=>["lcw_id","lcw_category","lcw_coordinates","lcw_sign","lcw_target","lcw_values","lcw_doc","lcw_revision","lcw_locator","lcw_authority"].forEach(id=>$(id).value=""));
 $("lcw_add_combo").addEventListener("click",()=>{try{addCombo();}catch(e){report({success:false,issues:[e.message]});}});
 $("lcw_audit").addEventListener("click",()=>report(audit(state)));
 $("lcw_export").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(read(),null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-load-evidence.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 render();
}
function selfTest(){
 const prior=clone(state);try{
 const src={document:"Calc.pdf",revision:"R1",locator:"Sheet L-2",authority:"Designer"};
 const lc={id:"D1",type:"nodal",category:"dead",unit:"kN",coordinateSystem:"global",signConvention:"+Z upward",target:"node:N1",source:src,values:{Fz:-10}};
 const combo={id:"C1",factors:{D1:1.2},source:{code:"مبحث ششم",edition:"۱۳۹۸",clause:"6-2",document:"Project design basis"}};
 const tests=[["round-trip state retains evidence",()=>{setData({loadCases:[lc],combinations:[combo]});return read().loadCases[0].source.locator==="Sheet L-2"&&read().combinations[0].factors.D1===1.2;}],["evidence and combination audits pass",()=>audit({loadCases:[lc],combinations:[combo]}).success],["missing combination source rejected",()=>{const x=clone(combo);delete x.source.clause;return !audit({loadCases:[lc],combinations:[x]}).success;}],["unknown combination case rejected",()=>{const x=clone(combo);x.factors.MISSING=1;return !audit({loadCases:[lc],combinations:[x]}).success;}],["mixed units rejected in one combination",()=>{const x=clone(lc);x.id="W1";x.unit="N";return !audit({loadCases:[lc,x],combinations:[{...combo,factors:{D1:1,W1:1}}]}).success;}],["mixed coordinate systems rejected",()=>{const x=clone(lc);x.id="W1";x.coordinateSystem="member-local";return !audit({loadCases:[lc,x],combinations:[{...combo,factors:{D1:1,W1:1}}]}).success;}],["mixed sign conventions rejected",()=>{const x=clone(lc);x.id="W1";x.signConvention="local -Z";return !audit({loadCases:[lc,x],combinations:[{...combo,factors:{D1:1,W1:1}}]}).success;}],["no implicit design approval",()=>{const r=read();return r.designApproved===false&&r.solverEnabled===false;}]];
 const results=tests.map(([name,fn])=>({name,ok:!!fn()}));return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
 }finally{state=prior;render();}
}
root.SteelLoadCaseWorkbench={read,setData,audit,selfTest,init};
document.addEventListener("DOMContentLoaded",init);
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/nodal-load-case-runner.js ===== */
/* SAHROUD STEEL — isolated, fail-closed nodal load-case solver runner.
 * Converts only explicit global nodal forces/moments to SI and runs a cloned model.
 * No project mutation, no combination factors, no design approval.
 */
(function(root){"use strict";
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const forceFactor={N:1,kN:1000},momentFactor={"N.m":1,"kN.m":1000};
function validateCase(c,model){
 const issues=[];
 if(!c||c.type!=="nodal")issues.push("فقط حالت بار گره‌ای پشتیبانی می‌شود.");
 if(c?.coordinateSystem!=="global")issues.push("فقط دستگاه مختصات global پشتیبانی می‌شود.");
 if(!c?.id||!c?.target?.startsWith("node:"))issues.push("شناسه حالت و مقصد node:<id> الزامی است.");
 if(!forceFactor[c?.forceUnit])issues.push("واحد نیرو باید N یا kN باشد.");
 if(!momentFactor[c?.momentUnit])issues.push("واحد لنگر باید N.m یا kN.m باشد.");
 const s=c?.source||{};
 if(!s.document||!s.revision||!s.locator||!s.authority)issues.push("ردیابی کامل سند، ویرایش، محل دقیق و مرجع لازم است.");
 const values=c?.values;
 const keys=["Fx","Fy","Fz","Mx","My","Mz"];
 if(!values||typeof values!=="object"||Array.isArray(values)||keys.some(k=>!finite(values[k]))||Object.keys(values).some(k=>!keys.includes(k)))issues.push("مقادیر باید دقیقاً شش مؤلفه عددی متناهی Fx,Fy,Fz,Mx,My,Mz باشند؛ صفرها نیز صریح ثبت شوند.");
 const nodeId=c?.target?.slice(5);
 if(!Array.isArray(model?.nodes)||!model.nodes.some(n=>String(n.id)===nodeId))issues.push("گره مقصد در مدل فعال پیدا نشد.");
 if(!Array.isArray(model?.members)||!model.members.length)issues.push("مدل باید اعضای سازه‌ای داشته باشد.");
 if(Array.isArray(model?.members)){
  const ids=new Set();
  model.members.forEach((m,i)=>{
   const id=String(m?.id??"").trim(),ledger=m?.analysisLoad||{};
   if(!id||ids.has(id))issues.push("شناسه عضو شماره "+(i+1)+" خالی یا تکراری است: "+id);ids.add(id);
   if(ledger.loadDataComplete!==true&&m?.loadDataComplete!==true)issues.push("کامل‌بودن دفتر بارگذاری عضو "+(id||i+1)+" باید صریحاً تأیید شود.");
   if(!Array.isArray(ledger.uniformLocal)||ledger.uniformLocal.length!==3||!ledger.uniformLocal.every(finite))issues.push("بار گسترده یکنواخت عضو "+(id||i+1)+" باید با سه مؤلفه عددی محلی و حتی در حالت صفر صریح ثبت شود.");
   if(Array.isArray(ledger.pointLoads)&&ledger.pointLoads.length)issues.push("بار متمرکز روی عضو "+(id||i+1)+" در این مسیر حل‌گر/بازسازی پشتیبانی نمی‌شود.");
   if(Array.isArray(ledger.distributedLoads)&&ledger.distributedLoads.length)issues.push("بار گسترده غیریکنواخت/قطعه‌ای عضو "+(id||i+1)+" در این مسیر پشتیبانی نمی‌شود.");
   if(ledger.linearLocal!==undefined&&ledger.linearLocal!==null&&(!ledger.linearLocal||!Array.isArray(ledger.linearLocal.start)||ledger.linearLocal.start.length!==3||!ledger.linearLocal.start.every(finite)||!Array.isArray(ledger.linearLocal.end)||ledger.linearLocal.end.length!==3||!ledger.linearLocal.end.every(finite)))issues.push("بار خطی متغیر عضو "+(id||i+1)+" باید دو بردار محلی سه‌مؤلفه‌ای متناهی داشته باشد.");
  });
 }
 return {success:issues.length===0,issues,nodeId};
}
function run(model,loadCase,options){
 const gate=validateCase(loadCase,model);
 if(!gate.success)return {success:false,status:"blocked",issues:gate.issues,designApproved:false,solverEnabled:false};
 if(!root.SteelFrame3D?.analyze)return {success:false,status:"blocked",issues:["حل‌گر سه‌بعدی بارگذاری نشده است."],designApproved:false,solverEnabled:false};
 if(!options||options.runSolver!==true||typeof options.sectionResolver!=="function"||!Array.isArray(options.supports)||!options.supports.length)
  return {success:false,status:"blocked",issues:["اجرای صریح runSolver:true، تابع تخصیص مقطع و تکیه‌گاه‌های مستند الزامی است."],designApproved:false,solverEnabled:false};
 const nodeId=gate.nodeId,v=loadCase.values;
 const nodalLoad={nodeId,values:[v.Fx*forceFactor[loadCase.forceUnit],v.Fy*forceFactor[loadCase.forceUnit],v.Fz*forceFactor[loadCase.forceUnit],v.Mx*momentFactor[loadCase.momentUnit],v.My*momentFactor[loadCase.momentUnit],v.Mz*momentFactor[loadCase.momentUnit]]};
 const isolated=clone(model);
 try{
  const result=root.SteelFrame3D.analyze(isolated,{supports:clone(options.supports),sectionResolver:options.sectionResolver,nodalLoads:[nodalLoad],requireExplicitMemberLoads:true,referenceAxis:options.referenceAxis});
  if(!result?.success||!result.equilibrium?.ok)return {success:false,status:"analysis_failed",issues:["حل‌گر موفق نشد یا تعادل نیرو/لنگر برقرار نیست."],solverResult:result||null,designApproved:false,solverEnabled:false};
  const simultaneousCase={caseId:loadCase.id,source:clone(loadCase.source),equilibriumOk:true,members:result.members.map(m=>({id:m.id,endI:{Fx:m.localEndForces[0],Fy:m.localEndForces[1],Fz:m.localEndForces[2],Mx:m.localEndForces[3],My:m.localEndForces[4],Mz:m.localEndForces[5]},endJ:{Fx:m.localEndForces[6],Fy:m.localEndForces[7],Fz:m.localEndForces[8],Mx:m.localEndForces[9],My:m.localEndForces[10],Mz:m.localEndForces[11]},parentMemberId:m.parentMemberId,taperSegmentIndex:m.taperSegmentIndex,taperSegmentCount:m.taperSegmentCount}))};
  return {success:true,status:"isolated_analysis_proposal",caseId:loadCase.id,units:"N,m,Pa",nodalLoad,solverResult:result,simultaneousActionCase:simultaneousCase,designApproved:false,solverEnabled:false,activeProjectMutated:false,limitations:["حالت بار خارجی این اجرا فقط گره‌ای و در دستگاه سراسری است؛ بارهای موجود روی اعضا فقط از دفتر صریح مدل و در قالب بار گسترده یکنواخت یا خطی‌متغیر محلی وارد می‌شوند.","بار متمرکز روی عضو، بار سطحی خام، جرثقیل، دما، نشست و ترکیب بار در این مسیر مستقیم پشتیبانی نمی‌شوند.","حل‌گر خطی مرتبه اول است و اثرات مرتبه دوم، کمانش و کنترل آیین‌نامه‌ای را انجام نمی‌دهد.","نتیجه صرفاً پیشنهاد تحلیل ایزوله است و تأیید طراحی محسوب نمی‌شود."]};
 }catch(e){return {success:false,status:"analysis_failed",issues:[String(e.message||e)],designApproved:false,solverEnabled:false};}
}
function stable(v){
 if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
 if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";
 return JSON.stringify(v);
}
function runBatch(model,loadCases,options){
 const cases=Array.isArray(loadCases)?loadCases:[],issues=[],ids=new Set();
 if(!cases.length)return {success:false,status:"blocked",issues:["حداقل یک حالت بار برای اجرای دسته‌ای لازم است."],cases:[],designApproved:false};
 cases.forEach((c,i)=>{const id=String(c?.id??"").trim();if(!id)issues.push("حالت بار شماره "+(i+1)+" شناسه ندارد.");else if(ids.has(id))issues.push("شناسه حالت بار در اجرای دسته‌ای تکراری است: "+id);ids.add(id);});
 if(issues.length)return {success:false,status:"blocked",issues,cases:[],designApproved:false};
 const outputs=cases.map(c=>run(model,c,options));
 outputs.forEach((r,i)=>{if(r.success!==true)issues.push("تحلیل حالت "+cases[i].id+" ناموفق/مسدود است: "+(r.issues||[]).join("؛ "));});
 if(issues.length)return {success:false,status:"batch_incomplete",issues,cases:outputs,completedCaseCount:outputs.filter(x=>x.success).length,designApproved:false,solverEnabled:false};
 const signature=out=>stable((out.solverResult.members||[]).map(m=>({id:String(m.id),parentMemberId:m.parentMemberId??null,localAxes:m.localAxes??null,section:m.section??null})).sort((a,b)=>a.id.localeCompare(b.id)));
 const expected=signature(outputs[0]);
 outputs.slice(1).forEach(out=>{if(signature(out)!==expected)issues.push("توپولوژی اعضا، محورهای محلی یا مشخصات مقطع بین حالت‌های بار یکسان نیست؛ ترکیب خطی متوقف شد.");});
 if(issues.length)return {success:false,status:"incompatible_case_models",issues,cases:outputs,completedCaseCount:outputs.length,designApproved:false,solverEnabled:false};
 return {success:true,status:"isolated_cases_complete",cases:outputs,caseIds:outputs.map(x=>x.caseId),completedCaseCount:outputs.length,isolatedPerCase:true,commonSolverTopologyVerified:true,activeProjectMutated:false,designApproved:false,solverEnabled:false,limitations:["هر حالت بار به‌طور مستقل روی یک کپی از مدل تحلیل شده است؛ مدل و تکیه‌گاه‌ها باید در همه اجراها یکسان باشند.","تطابق توپولوژی، محورهای محلی و مشخصات مقطع بررسی می‌شود؛ هم‌ارزی کامل همه فرض‌های تحلیل یا صحت بارگذاری منبع مستقلاً اثبات نمی‌شود.","ترکیب اثرها فقط در پل تقاضای اعضا و با ضرایب و فرض‌های صریح قابل انجام است؛ این خروجی به‌تنهایی ترکیب بار یا تأیید طراحی نیست."]};
}
function selfTest(){
 const section={E:200e9,G:77e9,A:.01,Iy:8e-5,Iz:2e-5,J:1e-5};
 const model={nodes:[{id:"FIX",x:0,y:0,z:0},{id:"TIP",x:3,y:0,z:0}],members:[{id:"M1",start:"FIX",end:"TIP",type:"validation",analysisLoad:{loadDataComplete:true,uniformLocal:[0,0,0]}}]};
 const supports=[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}];
 const base={id:"LC-1",type:"nodal",coordinateSystem:"global",target:"node:TIP",forceUnit:"kN",momentUnit:"kN.m",values:{Fx:0,Fy:-1,Fz:0,Mx:0,My:0,Mz:0},source:{document:"calc.pdf",revision:"R1",locator:"p.2",authority:"Designer"}};
 const opts={runSolver:true,supports,sectionResolver:()=>section};
 const tests=[
 ["kN converted to N",()=>run(model,base,opts).nodalLoad?.values[1]===-1000],
 ["kN.m converted to N.m",()=>run(model,{...base,values:{...base.values,Fx:0,Fy:0,Mz:2}},opts).nodalLoad?.values[5]===2000],
 ["unsupported load type blocked",()=>!run(model,{...base,type:"crane_wheel"},opts).success],
 ["local coordinate system blocked",()=>!run(model,{...base,coordinateSystem:"member-local"},opts).success],
 ["missing node blocked",()=>!run(model,{...base,target:"node:ABSENT"},opts).success],
 ["missing source blocked",()=>!run(model,{...base,source:{document:"x"}},opts).success],
 ["missing explicit zero member load blocked",()=>!run({nodes:model.nodes,members:[{...model.members[0],analysisLoad:undefined}]},base,opts).success],
 ["missing load completeness blocked before solver",()=>{let called=false;const prior=root.SteelFrame3D;root.SteelFrame3D={analyze:()=>{called=true;return {success:true,equilibrium:{ok:true},members:[]};}};const r=run({nodes:model.nodes,members:[{...model.members[0],analysisLoad:{uniformLocal:[0,0,0]}}]},base,opts);root.SteelFrame3D=prior;return !r.success&&!called&&r.issues.some(x=>x.includes("کامل‌بودن دفتر بارگذاری"));}],
 ["unsupported point load blocked before solver",()=>!run({nodes:model.nodes,members:[{...model.members[0],analysisLoad:{loadDataComplete:true,uniformLocal:[0,0,0],pointLoads:[{x:1}]}}]},base,opts).success],
 ["unsupported nonuniform load blocked before solver",()=>!run({nodes:model.nodes,members:[{...model.members[0],analysisLoad:{loadDataComplete:true,uniformLocal:[0,0,0],distributedLoads:[{start:0,end:2}]}}]},base,opts).success],
 ["malformed linear-local load blocked before solver",()=>!run({nodes:model.nodes,members:[{...model.members[0],analysisLoad:{loadDataComplete:true,uniformLocal:[0,0,0],linearLocal:{start:[0,-1],end:[0,-2,0]}}}]},base,opts).success],
 ["duplicate physical member IDs blocked",()=>!run({nodes:model.nodes,members:[model.members[0],{...model.members[0]}]},base,opts).success],
 ["solver opt-in required",()=>!run(model,base,{...opts,runSolver:false}).success],
 ["analysis equilibrium and simultaneous end vectors",()=>{const r=run(model,base,opts);return r.success&&r.solverResult.equilibrium.ok&&r.simultaneousActionCase.members[0].endI&&r.simultaneousActionCase.members[0].endJ;}],
 ["model not mutated",()=>{const before=JSON.stringify(model);run(model,base,opts);return JSON.stringify(model)===before;}],
 ["batch solves each case independently on unchanged model",()=>{const r=runBatch(model,[base,{...base,id:"LC-2",values:{...base.values,Fy:-2}}],opts);return r.success&&r.cases.length===2&&r.isolatedPerCase&&r.caseIds.join(",")==="LC-1,LC-2";}],
 ["batch duplicate IDs blocked before solver",()=>!runBatch(model,[base,base],opts).success],
 ["batch incomplete case fails closed",()=>{const r=runBatch(model,[base,{...base,id:"BAD",target:"node:ABSENT"}],opts);return !r.success&&r.completedCaseCount===1;}],
 ["batch detects incompatible solver topology",()=>{const prior=root.SteelFrame3D;let n=0;root.SteelFrame3D={analyze:(m,o)=>{n++;return {success:true,equilibrium:{ok:true},members:[{id:n===1?"M1":"M2",localEndForces:Array(12).fill(0),localAxes:{x:[1,0,0]}}]};}};const r=runBatch(model,[base,{...base,id:"LC-2"}],opts);root.SteelFrame3D=prior;return !r.success&&r.status==="incompatible_case_models";}],
 ["no design approval",()=>run(model,base,opts).designApproved===false]
 ];
 const results=tests.map(([name,fn])=>{try{return{name,ok:!!fn()};}catch(e){return{name,ok:false,error:String(e.message||e)};}});
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelNodalLoadCaseRunner={validateCase,run,runBatch,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/solver-action-demand-bridge.js ===== */
/* SAHROUD STEEL — bridge from isolated 3D FEM results to concurrent action audit.
 * Maps solver-local end action components by documented position only.
 * It does NOT assert code section-force signs or calculate resistance.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v),names=["Fx","Fy","Fz","Mx","My","Mz"];
function build(runnerOutput,expectedMemberIds){
 const issues=[],result=runnerOutput?.solverResult,sim=runnerOutput?.simultaneousActionCase;
 if(runnerOutput?.success!==true||runnerOutput?.status!=="isolated_analysis_proposal")issues.push("خروجی باید تحلیل ایزوله موفق باشد.");
 if(!result?.success||result?.equilibrium?.ok!==true)issues.push("حل‌گر موفق یا متعادل نیست.");
 if(!sim?.caseId||!Array.isArray(result?.members)||!result.members.length)issues.push("شناسه حالت یا نتایج اعضا موجود نیست.");
 const seen=new Set(),members=[];
 (result?.members||[]).forEach(m=>{
  const id=String(m?.id||"");if(!id||seen.has(id))issues.push("شناسه عضو خالی یا تکراری در خروجی حل‌گر.");seen.add(id);
  const v=m?.localEndForces;if(!Array.isArray(v)||v.length!==12||!v.every(finite)){issues.push("بردار ۱۲ مؤلفه‌ای محلی عضو "+id+" ناقص/نامعتبر است.");return;}
  const endI={},endJ={};names.forEach((k,i)=>{endI[k]=v[i];endJ[k]=v[i+6];});
  members.push({memberId:id,endI,endJ,parentMemberId:m.parentMemberId||null,taperSegmentIndex:m.taperSegmentIndex??null,taperSegmentCount:m.taperSegmentCount??null,rawLocalEndForces:v.slice(),localAxes:m.localAxes||null});
 });
 if(Array.isArray(expectedMemberIds)){const expected=new Set(expectedMemberIds.map(String));expected.forEach(id=>{if(!seen.has(id))issues.push("عضو مورد انتظار "+id+" در نتایج حل‌گر وجود ندارد.");});seen.forEach(id=>{if(!expected.has(id))issues.push("عضو "+id+" خارج از فهرست مدل مورد انتظار است.");});}
 if(!sim?.equilibriumOk)issues.push("پرچم تعادل حالت تحلیل تأیید نشده است.");
 if(issues.length)return {success:false,status:"incomplete",issues,designApproved:false};
 const payload={memberIds:members.map(m=>m.memberId),cases:[{caseId:sim.caseId,equilibriumOk:true,members}]};
 const audit=root.SteelMemberSimultaneousActionContract?.audit?.(payload);
 if(!audit?.success)return {success:false,status:"incomplete",issues:audit?.issues||["قرارداد تقاضای هم‌زمان در دسترس نیست."],designApproved:false};
 return {success:true,status:"concurrent-demand-audited",caseId:sim.caseId,source:sim.source,units:"N,N.m",basis:"member-local solver end actions",componentMapping:{Fx:"N",Fy:"Vy",Fz:"Vz",Mx:"T",My:"My",Mz:"Mz"},signConventionVersion:result.localEndForceConvention?.version??null,signConventionDefinition:result.localEndForceConvention?.definition||"نامشخص",members,audit,designApproved:false,capacityCalculated:false,readyForCodeDesign:false,limitations:["مولفه‌ها در دستگاه محلی عضو هستند و به علامت نیروی مقطع آیین‌نامه‌ای تبدیل نشده‌اند؛ پیش از طراحی باید قرارداد علامت هر خانواده عضو مستقلاً تأیید شود.","هر ردیف فقط برای همین حالت بار است؛ ترکیب بار یا پوش هم‌زمان‌سازی نشده است.","خروجی حل‌گر خطی مرتبه اول است و ظرفیت/پایداری/اتصال را کنترل نمی‌کند."]};
}
function selfTest(){
 const raw={success:true,status:"isolated_analysis_proposal",simultaneousActionCase:{caseId:"LC-A",source:{document:"x"},equilibriumOk:true},solverResult:{success:true,equilibrium:{ok:true},localEndForceConvention:{version:1,definition:"raw local end actions"},members:[{id:"M1",localEndForces:[1,2,3,4,5,6,7,8,9,10,11,12]},{id:"M2",localEndForces:Array(12).fill(0)}]}};
 const t=[["maps all 12 local components",()=>{const r=build(raw,["M1","M2"]);return r.success&&r.members[0].endI.Mx===4&&r.members[0].endJ.Mz===12;}],["preserves exact load case ID",()=>build(raw).caseId==="LC-A"],["requires equilibrium",()=>!build({...raw,solverResult:{...raw.solverResult,equilibrium:{ok:false}}}).success],["rejects failed isolated runner",()=>!build({...raw,success:false}).success],["rejects incomplete 12 component vector",()=>!build({...raw,solverResult:{...raw.solverResult,members:[{id:"M1",localEndForces:[1,2]}]}}).success],["rejects nonfinite components",()=>!build({...raw,solverResult:{...raw.solverResult,members:[{id:"M1",localEndForces:[...Array(11).fill(0),Infinity]}]}}).success],["detects missing expected members",()=>!build(raw,["M1","M3"]).success],["detects unexpected solver members",()=>!build(raw,["M1"]).success],["does not grant design approval",()=>build(raw).designApproved===false],["does not claim code design readiness",()=>build(raw).readyForCodeDesign===false]];
 const results=t.map(([name,fn])=>{try{return{name,ok:!!fn()};}catch(e){return{name,ok:false,error:String(e.message||e)};}});
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelSolverActionDemandBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/solver-section-force-diagram-bridge.js ===== */
/* SAHROUD STEEL — isolated solver-to-section-force diagram bridge.
 * Connects a successful nodal runner result to per-member section resultants.
 * Requires explicit complete local load ledgers. No capacity or approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function build(model,runnerOutput,options){
 options=options||{};
 const issues=[],result=runnerOutput?.solverResult,sim=runnerOutput?.simultaneousActionCase;
 const modelMembers=Array.isArray(model?.members)?model.members:[];
 const solved=Array.isArray(result?.members)?result.members:[];
 const modelById=new Map(),solvedById=new Map();
 modelMembers.forEach(m=>{const id=String(m?.id??"");if(!id||modelById.has(id))issues.push("شناسه عضو مدل خالی یا تکراری است: "+id);else modelById.set(id,m);});
 solved.forEach(m=>{const id=String(m?.id??"");if(!id||solvedById.has(id))issues.push("شناسه عضو حل‌شده خالی یا تکراری است: "+id);else solvedById.set(id,m);});
 if(runnerOutput?.success!==true||runnerOutput?.status!=="isolated_analysis_proposal")issues.push("ورودی باید خروجی تحلیل ایزوله موفق باشد.");
 if(result?.success!==true||result?.equilibrium?.ok!==true||!sim?.equilibriumOk)issues.push("حل‌گر یا تعادل حالت بار موفق/تأییدشده نیست.");
 if(!sim?.caseId)issues.push("شناسه یکتای حالت بار موجود نیست.");
 if(!modelMembers.length||!solved.length)issues.push("فهرست اعضای مدل یا نتایج حل‌شده خالی است.");
 modelById.forEach((m,id)=>{if(!solvedById.has(id))issues.push("نتیجه عضو "+id+" در حل‌گر موجود نیست.");});
 solvedById.forEach((m,id)=>{if(!modelById.has(id))issues.push("عضو حل‌شده "+id+" در مدل ورودی وجود ندارد.");});
 // Audit the runner's case-labelled simultaneous vectors against the solver's
 // authoritative 12-component local end-force rows before reconstructing diagrams.
 const traceRows=Array.isArray(sim?.members)?sim.members:[];
 const traceById=new Map();
 traceRows.forEach(m=>{
  const id=String(m?.id??"");
  if(!id||traceById.has(id)){issues.push("ردیابی همزمان حالت بار دارای شناسه خالی/تکراری است: "+id);return;}
  traceById.set(id,m);
 });
 if(traceRows.length!==solved.length)issues.push("تعداد اعضای بردارهای همزمان با نتایج حل‌گر برابر نیست.");
 solvedById.forEach((m,id)=>{
  const trace=traceById.get(id);
  if(!trace){issues.push("بردار همزمان عضو "+id+" در حالت بار موجود نیست.");return;}
  const f=m?.localEndForces,start=trace.endI||{},end=trace.endJ||{};
  const traced=[start.Fx,start.Fy,start.Fz,start.Mx,start.My,start.Mz,end.Fx,end.Fy,end.Fz,end.Mx,end.My,end.Mz];
  if(!Array.isArray(f)||f.length!==12||!f.every(finite)||!traced.every(finite)){
   issues.push("۱۲ مؤلفه نیرو/لنگر برای تطبیق ردیابی عضو "+id+" کامل و متناهی نیست.");return;
  }
  if(f.some((v,i)=>v!==traced[i]))issues.push("بردار همزمان ثبت‌شده عضو "+id+" با خروجی حل‌گر در همین حالت بار یکسان نیست.");
 });
 traceById.forEach((m,id)=>{if(!solvedById.has(id))issues.push("ردیابی همزمان عضو اضافی "+id+" در مدل حل‌شده وجود دارد.");});
 if(issues.length)return {success:false,status:"insufficient_data",issues,loadCaseId:sim?.caseId||null,designApproved:false,capacityCalculated:false};
 const joined=modelMembers.map(m=>{
  const s=solvedById.get(String(m.id));
  return {...s,analysisLoad:m.analysisLoad,loadDataComplete:m.loadDataComplete,pointLoads:m.pointLoads,distributedLoads:m.distributedLoads,endReleases:s.endReleases??m.endReleases,endOffsets:s.endOffsets??m.endOffsets,prismatic:m.prismatic};
 });
 const taperModel={...model,members:modelMembers};
 const tapered=joined.some(m=>m.taperApplied===true||m.taperSegmentCount!=null);
 let taperedReport=null,prismaticDiagrams=[];
 if(tapered){
  if(!root.SteelTaperedSectionForceDiagram?.build)return {success:false,status:"missing_dependency",issues:["موتور نمودار اعضای متغیرمقطع بارگذاری نشده است."],designApproved:false};
  const c={label:String(sim.caseId),equilibrium:result.equilibrium,members:joined};
  taperedReport=root.SteelTaperedSectionForceDiagram.build(taperModel,[c],options.taperedOptions||{});
  if(!taperedReport.success)issues.push(...(taperedReport.issues||["بازسازی اعضای متغیرمقطع ناموفق بود."]));
 }
 joined.forEach(m=>{
  if(m.taperApplied===true||m.taperSegmentCount!=null)return;
  if(m.prismatic===false){issues.push("عضو "+m.id+" صریحاً غیرمنشوری معرفی شده اما قطعات متغیرمقطع برای آن تعریف نشده‌اند.");return;}
  const ledger=m.analysisLoad||{};
  const complete=ledger.loadDataComplete===true||m.loadDataComplete===true||options.loadCompletenessByMember?.[String(m.id)]===true;
  if(!complete){issues.push("کامل‌بودن دفتر بارگذاری عضو "+m.id+" صریحاً تأیید نشده است.");return;}
  const uniform=ledger.uniformLocal;
  if(!Array.isArray(uniform)||uniform.length!==3||!uniform.every(v=>finite(v))){issues.push("بار گسترده محلی عضو "+m.id+" باید با سه مؤلفه عددی N/m ثبت شود.");return;}
  const length=Number(m.length);
  if(!(Number.isFinite(length)&&length>0)){issues.push("طول حل‌شده عضو "+m.id+" معتبر نیست.");return;}
  const diagram=root.SteelMemberSectionForces?.reconstruct?.({
   length,localEndForces:m.localEndForces,loadDataComplete:true,prismatic:true,
   uniformLocal:uniform,linearLocal:ledger.linearLocal||null,pointLoads:ledger.pointLoads||m.pointLoads||[],
   distributedLoads:ledger.distributedLoads||m.distributedLoads||[],
   endReleases:m.endReleases,endOffsets:m.endOffsets
  },options.diagramOptions||{});
  if(!diagram?.ok){issues.push("نمودار عضو "+m.id+" بازسازی نشد: "+(diagram?.reason||"موتور بازسازی در دسترس نیست."));return;}
  prismaticDiagrams.push({memberId:String(m.id),parentMemberId:m.parentMemberId||String(m.id),length_m:length,localAxes:m.localAxes,section:m.section,stations:diagram.stations,checks:diagram.checks,method:diagram.method});
 });
 const expectedPrismatic=joined.filter(m=>!(m.taperApplied===true||m.taperSegmentCount!=null)).length;
 if(prismaticDiagrams.length!==expectedPrismatic&&issues.length===0)issues.push("تمام اعضای منشوری نتیجه نمودار معتبر ندارند.");
 const success=issues.length===0&&prismaticDiagrams.length===expectedPrismatic&&(!tapered||taperedReport?.success===true);
 return {success,status:success?"complete-per-case-section-force-diagrams":"insufficient_data",loadCaseId:sim.caseId,source:sim.source||null,units:"N,N.m,m",prismaticMemberCount:expectedPrismatic,prismaticDiagrams,taperedReport,issues,designApproved:false,capacityCalculated:false,readyForCodeDesign:false,limitations:["فقط بار گسترده یکنواخت محلی با دفتر بارگذاری کامل و صریح؛ بار نقطه‌ای/غیریکنواخت در این نسخه رد می‌شود.","اعضای منشوری آزادشده یا دارای بازوی صلب توسط بازساز منشوری فعلی رد می‌شوند.","اعضای متغیرمقطع در هر قطعه جداگانه بازسازی می‌شوند؛ نیروها در محور محلی قطعات مختلف با هم پوش‌گیری نمی‌شوند.","این خروجی تقاضای مقطع است و ظرفیت، کمانش، سرویس‌پذیری یا انطباق آیین‌نامه‌ای را کنترل نمی‌کند."]};
}
function selfTest(){
 const tests=[],add=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const sec={E:200e9,G:77e9,A:.01,Iy:8e-5,Iz:2e-5,J:1e-5};
 const make=(load=[0,0,0],extra={})=>({nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:3,y:0,z:0}],members:[{id:"M",start:"A",end:"B",type:"test",length:3,prismatic:true,analysisLoad:{uniformLocal:load,loadDataComplete:true},...extra}]});
 const run=(model,load=[0,-1000,0])=>{const first=model.nodes[0].id,last=model.nodes[model.nodes.length-1].id;const r=root.SteelNodalLoadCaseRunner.run(model,{id:"DIAGRAM-CASE",type:"nodal",coordinateSystem:"global",target:"node:"+last,forceUnit:"N",momentUnit:"N.m",values:{Fx:0,Fy:load[1],Fz:load[2],Mx:0,My:0,Mz:0},source:{document:"fixture",revision:"1",locator:"case",authority:"test"}},{runSolver:true,supports:[{nodeId:first,fixedDofs:[0,1,2,3,4,5]}],sectionResolver:()=>sec});return r;};
 add("live solver to prismatic section diagram",()=>{const m=make([0,0,0]),r=run(m),d=build(m,r);return d.success&&d.prismaticDiagrams.length===1&&d.prismaticDiagrams[0].stations.length>=3&&d.prismaticDiagrams[0].stations[0].Vy_N<0;});
 add("uniform local load included in reconstructed section actions",()=>{const m=make([0,-500,0]),r=run(m,[0,-1000,0]),d=build(m,r);return d.success&&d.prismaticDiagrams[0].stations[0].Vy_N<d.prismaticDiagrams[0].stations.at(-1).Vy_N&&Math.abs(d.prismaticDiagrams[0].stations.at(-1).Vy_N+1000)<1e-6;});
 add("linearly varying local member load reaches solver and section diagram",()=>{const m=make([0,0,0]);m.members[0].analysisLoad.linearLocal={start:[0,-100,0],end:[0,-300,0]};const r=run(m,[0,0,0]),d=build(m,r);return d.success&&Math.abs(r.solverResult.equilibrium.appliedForceN[1]+600)<1e-7&&Math.abs(d.prismaticDiagrams[0].stations.at(-1).Vy_N)<1e-7&&Math.abs(d.prismaticDiagrams[0].stations.at(-1).Mz_Nm)<1e-7;});
 add("missing load completeness blocked",()=>{const m=make([0,0,0]);delete m.members[0].analysisLoad.loadDataComplete;return build(m,run(m)).status==="insufficient_data";});
 add("missing uniform load vector blocked",()=>{const m=make([0,0,0]);delete m.members[0].analysisLoad.uniformLocal;return build(m,run(m)).status==="insufficient_data";});
 add("explicit non-prismatic member without segment model blocked",()=>{const m=make([0,0,0],{prismatic:false});return build(m,run(m)).status==="insufficient_data";});
 add("point load on member blocked",()=>{const m=make([0,0,0]);m.members[0].analysisLoad.pointLoads=[{x:1,values:[0,-1,0]}];return build(m,run(m)).status==="insufficient_data";});
 add("solver imbalance blocked",()=>{const m=make([0,0,0]),r=run(m);r.solverResult.equilibrium.ok=false;return build(m,r).status==="insufficient_data";});
 add("missing model member result blocked",()=>{const m=make([0,0,0]),r=run(m);r.solverResult.members=[];return build(m,r).status==="insufficient_data";});
 add("missing simultaneous force trace blocked",()=>{const m=make([0,0,0]),r=run(m);r.simultaneousActionCase.members=[];return build(m,r).status==="insufficient_data";});
 add("mismatched simultaneous force trace blocked",()=>{const m=make([0,0,0]),r=run(m);r.simultaneousActionCase.members[0].endI.Fy+=1;return build(m,r).status==="insufficient_data";});
 add("duplicate simultaneous trace member blocked",()=>{const m=make([0,0,0]),r=run(m);r.simultaneousActionCase.members.push(r.simultaneousActionCase.members[0]);return build(m,r).status==="insufficient_data";});
 add("live solver to segmented tapered section diagrams",()=>{const model={nodes:[{id:"n0",x:0,y:0,z:0},{id:"n1",x:2,y:0,z:0},{id:"n2",x:5,y:0,z:0}],members:[{id:"T1",start:"n0",end:"n1",length:2,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:1,taperSegmentCount:2,analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}},{id:"T2",start:"n1",end:"n2",length:3,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:2,taperSegmentCount:2,analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}}]};const r=run(model,[0,-1000,0]),d=build(model,r);return d.success&&d.taperedReport?.loadCases?.[0]?.members?.[0]?.segments?.length===2&&d.taperedReport.loadCases[0].members[0].segments[1].startStation_m===2;});
 add("no design approval or capacity claim",()=>{const m=make([0,0,0]),d=build(m,run(m));return d.designApproved===false&&d.capacityCalculated===false&&d.readyForCodeDesign===false;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests};
}
root.SteelSolverSectionForceDiagramBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/station-demand-adapter.js ===== */
/* SAHROUD STEEL — case-preserving station demand adapter.
 * Converts section-diagram rows into traceable simultaneous six-action station records.
 * No envelopes, sign reinterpretation, resistance or code approval.
 */
(function(root){"use strict";
const KEYS=["N_N","Vy_N","Vz_N","T_Nm","My_Nm","Mz_Nm"];
function build(diagrams,options){
 options=options||{};const issues=[],cases=Array.isArray(diagrams)?diagrams:[];
 if(!cases.length)issues.push("هیچ نمودار حالت بار ارائه نشده است.");
 const seenCases=new Set(),out=[];
 cases.forEach((c,ci)=>{
  const caseId=String(c?.loadCaseId||c?.caseId||"").trim();
  if(!caseId)issues.push("شناسه حالت بار در ردیف "+(ci+1)+" خالی است.");
  if(seenCases.has(caseId))issues.push("شناسه حالت بار تکراری است: "+caseId);seenCases.add(caseId);
  if(c?.success!==true)issues.push("نمودار حالت "+(caseId||ci+1)+" موفق نیست.");
  if(c?.equilibriumOk===false||c?.equilibrium?.ok===false)issues.push("تعادل حالت "+caseId+" رد شده است.");
  if(c?.units!=="N,N.m,m"&&!(c?.units?.force==="N"&&c?.units?.moment==="N.m"&&c?.units?.length==="m"))issues.push("واحدهای نمودار حالت "+caseId+" باید صریحاً N، N.m و m باشند.");
  const members=[],ids=new Set();
  const pr=Array.isArray(c?.prismaticDiagrams)?c.prismaticDiagrams:[];
  pr.forEach(m=>{
   const id=String(m?.memberId||"").trim();if(!id||ids.has(id)){issues.push("شناسه عضو منشوری خالی یا تکراری در حالت "+caseId+": "+id);return;}ids.add(id);
   const rows=mapRows(m.stations,{caseId,memberId:id,segmentId:null,segmentIndex:null,axes:m.localAxes,length:m.length_m,startStation:0,endStation:m.length_m},issues);
   members.push({memberId:id,parentMemberId:String(m.parentMemberId||id),kind:"prismatic",length_m:m.length_m,localAxes:m.localAxes||null,stations:rows,complete:rows.length===(m.stations||[]).length&&rows.length>0});
  });
  const tr=c?.taperedReport;
  if(tr){
   if(tr.success!==true)issues.push("گزارش قطعات متغیرمقطع در حالت "+caseId+" کامل نیست.");
   (tr.loadCases||[]).forEach(tc=>{
    if(String(tc.label)!==caseId)issues.push("شناسه حالت نمودار قطعات متغیرمقطع با شناسه اصلی یکسان نیست.");
    (tc.members||[]).forEach(m=>{
     const id=String(m.parentMemberId||"").trim();if(!id||ids.has(id)){issues.push("شناسه عضو متغیرمقطع خالی یا تکراری در حالت "+caseId+": "+id);return;}ids.add(id);
     const segments=[];
     (m.segments||[]).forEach(seg=>{
      const rows=mapRows(seg.stations,{caseId,memberId:id,segmentId:String(seg.segmentId||""),segmentIndex:seg.segmentIndex,axes:seg.localAxes,length:seg.length_m,startStation:seg.startStation_m,endStation:seg.endStation_m},issues);
      segments.push({segmentId:String(seg.segmentId||""),segmentIndex:seg.segmentIndex,startStation_m:seg.startStation_m,endStation_m:seg.endStation_m,length_m:seg.length_m,localAxes:seg.localAxes||null,stations:rows,complete:rows.length===(seg.stations||[]).length&&rows.length>0});
     });
     members.push({memberId:id,parentMemberId:id,kind:"tapered",length_m:m.totalLength_m,segmentCount:m.segmentCount,segments,complete:m.complete===true&&segments.length===m.segmentCount&&segments.every(s=>s.complete)});
    });
   });
  }
  if(!members.length)issues.push("هیچ تقاضای ایستگاهی برای حالت "+caseId+" وجود ندارد.");
  if(options.expectedMemberIds){
   const expected=new Set(options.expectedMemberIds.map(String));
   expected.forEach(id=>{if(!ids.has(id))issues.push("عضو مورد انتظار "+id+" در حالت "+caseId+" موجود نیست.");});
   ids.forEach(id=>{if(!expected.has(id))issues.push("عضو اضافی "+id+" در حالت "+caseId+" وجود دارد.");});
  }
  out.push({caseId,source:c.source||null,members,complete:members.length>0&&members.every(m=>m.complete)});
 });
 const success=issues.length===0&&out.length===cases.length&&out.every(c=>c.complete);
 return {success,status:success?"station-demands-complete-per-case":"insufficient_data",cases:out,issues,components:["N","Vy","Vz","T","My","Mz"],units:{force:"N",moment:"N.m",length:"m"},concurrencyPreserved:true,independentEnvelopeMixing:false,signConvention:"Raw section-diagram sign convention is retained unchanged; no code-design sign conversion is performed.",capacityCalculated:false,designApproved:false,readyForCodeDesign:false,limitations:["Each station retains all six simultaneous actions from the same load case and same section-diagram row.","No component-wise envelope or cross-case mixing is performed.","Tapered segments remain separate; local axes are retained and station coordinates are physical-member coordinates.","No capacity, stability, serviceability, fatigue or code compliance is calculated."]};
}
function mapRows(rows,meta,issues){
 if(!Array.isArray(rows)||!rows.length){issues.push("ایستگاه‌های عضو "+meta.memberId+" در حالت "+meta.caseId+" خالی است.");return [];}
 const seen=new Set(),out=[];
 rows.forEach((r,i)=>{
  const local=Number(r?.x_m);
  const x=Number(r?.memberStation_m??(Number(meta.startStation||0)+local));
  if(!Number.isFinite(local)||!Number.isFinite(x)||local< -1e-8||!(Number(meta.length)>0)||local>Number(meta.length)+1e-8){issues.push("مختصات محلی/فیزیکی ایستگاه "+i+" عضو "+meta.memberId+" نامعتبر یا خارج از طول عضو است.");return;}
  if(Number.isFinite(Number(meta.startStation))&&x<Number(meta.startStation)-1e-8){issues.push("ایستگاه از ابتدای قطعه عضو "+meta.memberId+" خارج شده است.");return;}
  if(Number.isFinite(Number(meta.endStation))&&x>Number(meta.endStation)+1e-8){issues.push("ایستگاه از انتهای قطعه عضو "+meta.memberId+" عبور کرده است.");return;}
  const key=(meta.segmentId||"whole")+":"+String(local);
  if(seen.has(key)){issues.push("ایستگاه تکراری در عضو "+meta.memberId+" / "+key);return;}seen.add(key);
  if(KEYS.some(k=>typeof r?.[k]!=="number"||!Number.isFinite(r[k]))){issues.push("شش مؤلفه همزمان در ایستگاه "+key+" عضو "+meta.memberId+" کامل نیست.");return;}
  out.push({stationId:meta.caseId+"|"+meta.memberId+"|"+key,caseId:meta.caseId,memberId:meta.memberId,segmentId:meta.segmentId,segmentIndex:meta.segmentIndex,xLocal_m:Number.isFinite(local)?local:null,xMember_m:x,localAxes:meta.axes||null,actions:{N:r.N_N,Vy:r.Vy_N,Vz:r.Vz_N,T:r.T_Nm,My:r.My_Nm,Mz:r.Mz_Nm},sourceRow:{...r},units:{force:"N",moment:"N.m",length:"m"}});
 });
 if(out.length===rows.length&&out.length){
  for(let i=1;i<out.length;i++)if(!(out[i].xLocal_m>out[i-1].xLocal_m)){issues.push("ترتیب ایستگاه‌ها در عضو "+meta.memberId+" صعودی و یکتا نیست.");break;}
  if(Math.abs(out[0].xLocal_m)>1e-8||Math.abs(out[out.length-1].xLocal_m-Number(meta.length))>1e-8)issues.push("پوشش ایستگاه‌ها در عضو/قطعه "+meta.memberId+" از ابتدا تا انتها کامل نیست.");
 }
 return out;
}
function selfTest(){
 const row=(x,extra={})=>({x_m:x,N_N:1,Vy_N:2,Vz_N:3,T_Nm:4,My_Nm:5,Mz_Nm:6,...extra});
 const base={success:true,loadCaseId:"LC1",source:{document:"fixture"},units:"N,N.m,m",prismaticDiagrams:[{memberId:"M1",parentMemberId:"M1",length_m:2,localAxes:{x:[1,0,0]},stations:[row(0),row(2)]}]};
 const good=build([base],{expectedMemberIds:["M1"]});
 const other=build([{...base,loadCaseId:"LC2",prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[row(0,{My_Nm:99}),row(2,{My_Nm:88})]}]}]);
 const missing=build([{...base,success:false}]);
 const duplicate=build([{...base,prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[row(0),row(0)]}]}]);
 const incomplete=build([{...base,prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[{...row(0),Mz_Nm:NaN}]}]}]);
 const noUnits=build([{...base,units:null}]);
 const reversed=build([{...base,prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[row(2),row(0)]}]}]);
 const missingEnd=build([{...base,prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[row(0),row(1)]}]}]);
 const tapered=build([{success:true,loadCaseId:"T1",units:"N,N.m,m",prismaticDiagrams:[],taperedReport:{success:true,loadCases:[{label:"T1",members:[{parentMemberId:"R1",totalLength_m:5,segmentCount:2,complete:true,segments:[{segmentId:"S1",segmentIndex:1,startStation_m:0,endStation_m:2,length_m:2,stations:[{...row(0),memberStation_m:0},{...row(2),memberStation_m:2}]},{segmentId:"S2",segmentIndex:2,startStation_m:2,endStation_m:5,length_m:3,stations:[{...row(0),memberStation_m:2},{...row(3),memberStation_m:5}]}]}]}]}}]);
 const tests=[good.success&&good.cases[0].members[0].stations[0].actions.My===5,good.cases[0].members[0].stations[0].localAxes.x[0]===1,good.cases[0].members[0].stations[0].actions.My===5&&other.cases[0].members[0].stations[0].actions.My===99,good.cases.length===1&&good.cases[0].caseId==="LC1",!missing.success,!duplicate.success,!incomplete.success,!noUnits.success,tapered.success&&tapered.cases[0].members[0].segments[1].stations[0].xMember_m===2&&!tapered.cases[0].members[0].segments[1].stations[0].segmentId===false,!good.designApproved&&good.independentEnvelopeMixing===false,!reversed.success,!missingEnd.success];
 return {passed:tests.filter(Boolean).length,failed:tests.filter(x=>!x).length,total:tests.length,tests};
}
root.SteelStationDemandAdapter={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-design-demand-package.js ===== */
/* SAHROUD STEEL — evidence-only member design demand package.
 * Aggregates complete station rows by physical member and load case.
 * No load combinations, envelopes, sign conversion, resistance or approval.
 */
(function(root){"use strict";
let last=null;
const REQUIRED_SOURCE=["document","revision","locator","authority"];
function auditSources(cases){
 const rows=(Array.isArray(cases)?cases:[]).map((c,index)=>{
  const source=c?.simultaneousActionCase?.source||c?.source||{};
  const missing=REQUIRED_SOURCE.filter(k=>!(typeof source[k]==="string"&&source[k].trim()));
  const loadTransferAuditPresent=!!c?.solverLoadTransferAudit;const loadTransferAuditVerified=!loadTransferAuditPresent||c.solverLoadTransferAudit.success===true; if(loadTransferAuditPresent&&!loadTransferAuditVerified)missing.push("solverLoadTransferAudit.success"); return {caseId:String(c?.simultaneousActionCase?.caseId||c?.loadCaseId||c?.caseId||"CASE-"+(index+1)),source:{...source},missing,loadTransferAuditPresent,loadTransferAuditVerified,complete:missing.length===0&&loadTransferAuditVerified};
 });
 return {success:rows.length>0&&rows.every(x=>x.complete),requiredFields:REQUIRED_SOURCE.slice(),caseCount:rows.length,completeCaseCount:rows.filter(x=>x.complete).length,rows};
}
function build(diagramCases,options){
 options=options||{};const issues=[];
 const expected=Array.isArray(options.expectedMemberIds)?options.expectedMemberIds.map(String):[];
 if(!expected.length)issues.push("فهرست شناسه اعضای فیزیکی مورد انتظار باید صریحاً ارائه شود.");
 if(new Set(expected).size!==expected.length)issues.push("شناسه اعضای مورد انتظار تکراری است.");
 if(!root.SteelStationDemandAdapter?.build)issues.push("مبدل تقاضای ایستگاهی بارگذاری نشده است.");
 if(issues.length){last={success:false,status:"insufficient_data",issues,designApproved:false};return last;}
 const adapted=root.SteelStationDemandAdapter.build(diagramCases,{expectedMemberIds:expected});
 issues.push(...(adapted.issues||[]));
 const memberPackages=expected.map(memberId=>{
  const cases=[];
  (adapted.cases||[]).forEach(c=>{
   const member=(c.members||[]).find(m=>m.memberId===memberId);
   if(!member){issues.push("عضو "+memberId+" در حالت "+c.caseId+" موجود نیست.");return;}
   cases.push({caseId:c.caseId,source:c.source,kind:member.kind,length_m:member.length_m,localAxes:member.localAxes||null,stations:member.kind==="prismatic"?member.stations:undefined,segments:member.kind==="tapered"?member.segments:undefined,complete:member.complete===true});
  });
  return {memberId,cases,complete:cases.length===(diagramCases||[]).length&&cases.every(c=>c.complete)};
 });
 (diagramCases||[]).forEach(c=>{
  const src=c?.source||{};
  REQUIRED_SOURCE.forEach(k=>{if(!(typeof src[k]==="string"&&src[k].trim()))issues.push("مدرک منبع حالت "+String(c?.loadCaseId||c?.caseId||"?")+" فاقد "+k+" است.");});
 });
 const complete=issues.length===0&&adapted.success===true&&memberPackages.every(m=>m.complete);
 const result={success:complete,status:complete?"station-demand-evidence-complete":"insufficient_data",members:memberPackages,caseIds:(adapted.cases||[]).map(c=>c.caseId),expectedMemberIds:expected,sourceTraceabilityRequired:REQUIRED_SOURCE,concurrencyPreserved:true,caseSeparationPreserved:true,combinationStatus:"not-provided",envelopeStatus:"not-generated",designInputStatus:"demand-evidence-only",issues,designGate:{capacityCalculated:false,codeInteractionCalculated:false,designApproved:false,readyForCodeDesign:false,blockers:["ترکیبات بار آیین‌نامه‌ای معتبر و مستند هنوز به بسته تقاضا متصل نشده‌اند.","قرارداد علامت و تبدیل نیروها به قرارداد طراحی باید برای خانواده هر عضو اعتبارسنجی شود.","مقاومت مقطع، کمانش، اندرکنش، پایداری، تغییرمکان و اتصالات هنوز در این بسته محاسبه نمی‌شوند."]},limitations:["هر ایستگاه شش مؤلفه همزمان خود را از یک ردیف و یک حالت تحلیل حفظ می‌کند.","هیچ پوش مؤلفه‌ای یا ترکیب بین حالت‌ها ساخته نمی‌شود.","قطعات متغیرمقطع و محورهای محلی آن‌ها مستقل باقی می‌مانند.","این بسته فقط شاهد تقاضای تحلیل است؛ ورودی نهایی طراحی آیین‌نامه‌ای محسوب نمی‌شود."]};
 last=result;return result;
}
function buildFromSolverCases(model,runnerCases,options){
 options=options||{};const issues=[],inputs=Array.isArray(runnerCases)?runnerCases:[];
 if(!root.SteelSolverSectionForceDiagramBridge?.build)return {success:false,status:"missing_dependency",issues:["پل حل‌گر به نمودار نیروهای داخلی بارگذاری نشده است."],designApproved:false};
 if(!inputs.length)return {success:false,status:"insufficient_data",issues:["هیچ خروجی تحلیل حالت بار ارائه نشده است."],designApproved:false};
 const sourceAudit=auditSources(inputs);
 if(!sourceAudit.success){
  const sourceIssues=sourceAudit.rows.filter(x=>!x.complete).map(x=>"مدرک منبع حالت "+x.caseId+" ناقص است؛ فیلدهای لازم: "+x.missing.join("، ")+".");
  const blocked={success:false,status:"source-provenance-incomplete",issues:sourceIssues,sourceAudit,solverPipeline:{inputCaseCount:inputs.length,diagramCaseCount:0,diagramSuccessCount:0,skippedForSourceAudit:true,issues:[]},designApproved:false,capacityCalculated:false,readyForCodeDesign:false};
  last=blocked;return blocked;
 }
 const diagrams=inputs.map((runnerOutput,index)=>{
  try{return root.SteelSolverSectionForceDiagramBridge.build(model,runnerOutput,options.diagramOptions||{});}
  catch(e){issues.push("ساخت نمودار حالت "+index+" با خطا مواجه شد: "+String(e.message||e));return {success:false,loadCaseId:runnerOutput?.simultaneousActionCase?.caseId||null,source:runnerOutput?.simultaneousActionCase?.source||null,issues:[String(e.message||e)],designApproved:false};}
 });
 const result=build(diagrams,{expectedMemberIds:options.expectedMemberIds});
 result.sourceAudit=sourceAudit;
 result.solverPipeline={inputCaseCount:inputs.length,diagramCaseCount:diagrams.length,diagramSuccessCount:diagrams.filter(x=>x.success===true).length,issues,isolatedPerCase:true,skippedForSourceAudit:false};
 if(issues.length){result.success=false;result.status="insufficient_data";result.issues.push(...issues);}
 last=result;return result;
}
function buildCombinedFromSolverCases(model,runnerCases,options){
 options=options||{};
 const result=buildFromSolverCases(model,runnerCases,options);
 if(result.success!==true){
  result.combinationProposal={success:false,status:"blocked-demand-package-incomplete",issues:["بسته تقاضای ایستگاهی کامل نیست؛ ترکیب نیرو اجرا نشد."],designApproved:false,capacityCalculated:false};
  last=result;return result;
 }
 if(!options.combinationSet||!options.assumptions){
  result.combinationProposal={success:false,status:"missing-explicit-combination-input",issues:["مجموعه ترکیب‌های دارای اثرات واقعی حل‌گر و فرض‌های صریح تحلیل باید جداگانه ارائه شوند."],designApproved:false,capacityCalculated:false};
  last=result;return result;
 }
 if(!root.SteelMemberDemandCombinationBridge?.build){
  result.combinationProposal={success:false,status:"missing_dependency",issues:["پل ترکیب تقاضای اعضا بارگذاری نشده است."],designApproved:false,capacityCalculated:false};
  last=result;return result;
 }
 const proposal=root.SteelMemberDemandCombinationBridge.build(result,options.combinationSet,options.assumptions);
 result.combinationProposal=proposal;
 result.combinationStatus=proposal.success?"linear-combination-demand-proposal":"blocked";
 result.designGate={...(result.designGate||{}),capacityCalculated:false,codeInteractionCalculated:false,designApproved:false,readyForCodeDesign:false};
 last=result;return result;
}
function buildCombinedFromBatch(model,batchResult,options){
 if(batchResult?.success!==true||batchResult?.status!=="isolated_cases_complete"||batchResult?.commonSolverTopologyVerified!==true||!Array.isArray(batchResult.cases)||!batchResult.cases.length){
  const blocked={success:false,status:"batch-analysis-incomplete",issues:batchResult?.issues?.length?batchResult.issues.slice():["خروجی دسته‌ای باید موفق، کامل و دارای توپولوژی مشترک تأییدشده باشد."],caseIds:batchResult?.caseIds||[],designApproved:false,capacityCalculated:false,readyForCodeDesign:false};
  last=blocked;return blocked;
 }
 const result=buildCombinedFromSolverCases(model,batchResult.cases,options||{});
 result.batchAudit={status:batchResult.status,caseIds:batchResult.caseIds.slice(),isolatedPerCase:true,commonSolverTopologyVerified:true};
 last=result;return result;
}
function getLast(){return last?JSON.parse(JSON.stringify(last)):null;}
function selfTest(){
 const row=(x,extra={})=>({x_m:x,N_N:1,Vy_N:2,Vz_N:3,T_Nm:4,My_Nm:5,Mz_Nm:6,...extra});
 const src={document:"calc.xlsx",revision:"rev-1",locator:"Sheet1!A1:F2",authority:"engineer-review"};
 const c={success:true,loadCaseId:"LC1",source:src,units:"N,N.m,m",prismaticDiagrams:[{memberId:"M1",length_m:2,localAxes:{x:[1,0,0]},stations:[row(0),row(2)]}]};
 const good=build([c],{expectedMemberIds:["M1"]});
 const noSource=build([{...c,source:{document:"x"}}],{expectedMemberIds:["M1"]});
 const noMember=build([c],{expectedMemberIds:["M1","M2"]});
 const duplicate=build([c,c],{expectedMemberIds:["M1"]});
 const mixed=build([c,{...c,loadCaseId:"LC2",prismaticDiagrams:[{...c.prismaticDiagrams[0],stations:[row(0,{My_Nm:99}),row(2,{My_Nm:99})]}]}],{expectedMemberIds:["M1"]});
 const tapered=build([{success:true,loadCaseId:"T1",source:src,units:"N,N.m,m",prismaticDiagrams:[],taperedReport:{success:true,loadCases:[{label:"T1",members:[{parentMemberId:"R",totalLength_m:3,segmentCount:1,complete:true,segments:[{segmentId:"R1",segmentIndex:1,startStation_m:0,endStation_m:3,length_m:3,stations:[{...row(0),memberStation_m:0},{...row(3),memberStation_m:3}]}]}]}]}}],{expectedMemberIds:["R"]});
 const prior=root.SteelSolverSectionForceDiagramBridge,priorCombo=root.SteelMemberDemandCombinationBridge,priorAdapter=root.SteelStationDemandAdapter;let diagramCalled=false;root.SteelSolverSectionForceDiagramBridge={build:(_m,r)=>{diagramCalled=true;return {...c,loadCaseId:r.simultaneousActionCase.caseId,source:r.simultaneousActionCase.source};}};root.SteelStationDemandAdapter={build:diagrams=>({success:true,issues:[],cases:diagrams.map(d=>({caseId:d.loadCaseId,source:d.source,members:[{memberId:"M1",kind:"prismatic",length_m:2,complete:true,stations:[row(0),row(2)]}]}))})};const source={document:"calc.pdf",revision:"R1",locator:"p.2",authority:"designer"};const runner=[{simultaneousActionCase:{caseId:"LC1",source}}];const incomplete=buildFromSolverCases({},[{simultaneousActionCase:{caseId:"LC-MISSING"}}],{expectedMemberIds:["M1"]});const incompleteSkipped=!diagramCalled;const loadAuditBlocked=buildFromSolverCases({},[{simultaneousActionCase:{caseId:"LC-BAD",source},solverLoadTransferAudit:{success:false,issues:["fixture mismatch"]}}],{expectedMemberIds:["M1"]});const loadAuditSkipped=!diagramCalled;const pipeline=buildFromSolverCases({},runner,{expectedMemberIds:["M1"]});const blockedCombo=buildCombinedFromSolverCases({},[{simultaneousActionCase:{caseId:"LC-MISSING"}}],{expectedMemberIds:["M1"]});let bridgeCalled=false;root.SteelMemberDemandCombinationBridge={build:()=>{bridgeCalled=true;return {success:true,designApproved:false,proposals:[]};}};const combined=buildCombinedFromSolverCases({},runner,{expectedMemberIds:["M1"],combinationSet:{loadCases:[],combinations:[]},assumptions:{}});const batchCombined=buildCombinedFromBatch({}, {success:true,status:"isolated_cases_complete",cases:runner,caseIds:["LC1"],commonSolverTopologyVerified:true},{expectedMemberIds:["M1"],combinationSet:{loadCases:[],combinations:[]},assumptions:{}});const blockedBatch=buildCombinedFromBatch({}, {success:false,status:"batch_incomplete",issues:["fixture failure"]},{});root.SteelSolverSectionForceDiagramBridge=prior;root.SteelMemberDemandCombinationBridge=priorCombo;root.SteelStationDemandAdapter=priorAdapter;const t=[good.success&&good.designGate.designApproved===false,noSource.success===false,noMember.success===false,duplicate.success===false,mixed.success&&mixed.members[0].cases.length===2&&mixed.members[0].cases[0].stations[0].actions.My===5&&mixed.members[0].cases[1].stations[0].actions.My===99,tapered.success&&tapered.members[0].cases[0].segments.length===1,incomplete.status==="source-provenance-incomplete"&&incomplete.solverPipeline.diagramCaseCount===0&&incompleteSkipped,loadAuditBlocked.status==="source-provenance-incomplete"&&loadAuditSkipped,pipeline.success&&pipeline.solverPipeline.isolatedPerCase&&pipeline.caseIds.length===1&&pipeline.sourceAudit?.success===true,blockedCombo.combinationProposal?.status==="blocked-demand-package-incomplete",bridgeCalled&&combined.combinationProposal?.success===true&&combined.designGate.designApproved===false,batchCombined.success&&batchCombined.batchAudit?.commonSolverTopologyVerified===true,blockedBatch.success===false&&blockedBatch.status==="batch-analysis-incomplete"];
 return {passed:t.filter(Boolean).length,failed:t.filter(x=>!x).length,total:t.length,tests:t};
}
root.SteelMemberDesignDemandPackage={build,buildFromSolverCases,buildCombinedFromSolverCases,buildCombinedFromBatch,getLast,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-demand-combination-bridge.js ===== */
/* SAHROUD STEEL — explicit, case-preserving member demand combination proposal.
 * Applies engineer-entered factors only when every referenced case has matching
 * member/station topology, coordinates, local axes and six concurrent actions.
 * Linear superposition assumptions are declarations, not independent validation.
 */
(function(root){"use strict";
const ACTIONS=["N","Vy","Vz","T","My","Mz"];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const txt=v=>String(v??"").trim();
function stable(v){
 if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
 if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";
 return JSON.stringify(v);
}
function flatten(member){
 if(member?.kind==="prismatic")return (member.stations||[]).map(s=>({station:s,segmentId:null,segmentIndex:null}));
 if(member?.kind==="tapered")return (member.segments||[]).flatMap(seg=>(seg.stations||[]).map(s=>({station:s,segmentId:seg.segmentId,segmentIndex:seg.segmentIndex})));
 return [];
}
function topologyKey(x){
 const s=x.station;
 return [x.segmentId||"whole",s.xLocal_m,s.xMember_m,stable(s.localAxes||null)].join("|");
}
function build(demandPackage,combinationSet,assumptions){
 const issues=[],p=demandPackage||{},set=combinationSet||{},a=assumptions||{};
 if(p.success!==true)issues.push("بسته تقاضای ایستگاهی باید با موفقیت و بدون نقص ساخته شده باشد.");
 if(p.designApproved!==false||p.designGate?.designApproved!==false)issues.push("وضعیت بسته تقاضا باید صریحاً غیرتأییدشده باشد.");
 if(p.concurrencyPreserved!==true||p.caseSeparationPreserved!==true)issues.push("حفظ هم‌زمانی و جدایی حالت‌ها در بسته تقاضا احراز نشده است.");
 const members=Array.isArray(p.members)?p.members:[];
 const loadCases=Array.isArray(set.loadCases)?set.loadCases:[];
 const combinations=Array.isArray(set.combinations)?set.combinations:[];
 if(!members.length)issues.push("هیچ عضو فیزیکی در بسته تقاضا وجود ندارد.");
 if(!loadCases.length)issues.push("فهرست حالت‌های بار مستند خالی است.");
 const packageCaseIds=Array.isArray(p.caseIds)?p.caseIds.map(txt):[];
 const caseIds=new Set();
 loadCases.forEach(c=>{const id=txt(c?.id);if(!id)issues.push("حالت بار بدون شناسه است.");if(caseIds.has(id))issues.push("شناسه حالت بار تکراری است: "+id);caseIds.add(id);if(!packageCaseIds.includes(id))issues.push("حالت بار "+id+" در بسته تقاضا موجود نیست.");});
 const registryInput={loadCases:loadCases.map(c=>({id:c.id,category:c.category})),combinations};
 const registry=root.SteelLoadCombinationRegistry?.auditDefinitions?.(registryInput);
 if(!registry)issues.push("رجیستری ترکیب بار بارگذاری نشده است.");
 else issues.push(...registry.issues);
 if(!combinations.length)issues.push("هیچ ترکیب باری برای اعمال ضرایب ارائه نشده است.");
 const assumptionKeys=["sameModelRevision","sameGeometry","sameSupports","sameStiffnessModel","linearElasticFirstOrder"];
 assumptionKeys.forEach(k=>{if(a[k]!==true)issues.push("فرض تحلیل برای ترکیب خطی صریحاً تأیید نشده است: "+k);});
 const memberMaps=new Map();
 members.forEach(m=>{
  const id=txt(m?.memberId);if(!id||memberMaps.has(id)){issues.push("شناسه عضو خالی یا تکراری: "+id);return;}
  if(m.complete!==true)issues.push("تقاضای عضو "+id+" ناقص است.");
  const byCase=new Map();
  (m.cases||[]).forEach(c=>{const cid=txt(c?.caseId);if(!cid||byCase.has(cid)){issues.push("حالت تکراری/بی‌نام برای عضو "+id+": "+cid);return;}byCase.set(cid,c);});
  memberMaps.set(id,byCase);
 });
 const sourceByCase=new Map();
 members.forEach(m=>(m.cases||[]).forEach(c=>{
  const cid=txt(c?.caseId),signature=stable(c?.source||null);
  if(!sourceByCase.has(cid))sourceByCase.set(cid,signature);
  else if(sourceByCase.get(cid)!==signature)issues.push("منبع حالت بار "+cid+" بین اعضای مختلف یکسان نیست؛ منشأ تحلیل باید یکپارچه باشد.");
 }));
 const proposals=[];
 if(!issues.length){
  combinations.forEach(combo=>{
   const comboId=txt(combo.id),factors=combo.factors||{},factorIds=Object.keys(factors);
   const memberResults=[];
   members.forEach(m=>{
    const id=txt(m.memberId),byCase=memberMaps.get(id),selected=factorIds.map(cid=>({caseId:cid,entry:byCase.get(cid)}));
    selected.forEach(x=>{if(!x.entry)issues.push("حالت "+x.caseId+" برای عضو "+id+" موجود نیست.");});
    if(selected.some(x=>!x.entry))return;
    const shapes=selected.map(x=>{
     const e=x.entry,flat=flatten(e),map=new Map();
     if(e.complete!==true)issues.push("حالت "+x.caseId+" برای عضو "+id+" کامل نیست.");
     if(!flat.length)issues.push("ایستگاه‌های عضو "+id+" در حالت "+x.caseId+" خالی/ناشناخته است.");
     flat.forEach(z=>{
      const s=z.station,key=topologyKey(z);
      if(!finite(s?.xLocal_m)||!finite(s?.xMember_m))issues.push("مختصات ایستگاه عضو "+id+" در حالت "+x.caseId+" معتبر نیست.");
      if(map.has(key))issues.push("ایستگاه تکراری/هم‌مختصات در عضو "+id+" و حالت "+x.caseId+" شناسایی شد.");
      else map.set(key,z);
     });
     return {caseId:x.caseId,flat,map};
    });
    const ref=shapes[0],refKeys=ref?Array.from(ref.map.keys()):[];
    shapes.slice(1).forEach(s=>{
     if(s.map.size!==refKeys.length||refKeys.some(k=>!s.map.has(k)))issues.push("توپولوژی، مختصات، قطعه‌بندی یا محورهای محلی عضو "+id+" بین حالت‌ها یکسان نیست.");
    });
    if(issues.length||!ref)return;
    const stations=ref.flat.map(z=>{
     const key=topologyKey(z),sum={N:0,Vy:0,Vz:0,T:0,My:0,Mz:0};
     selected.forEach(x=>{
      const found=byCase.get(x.caseId),row=flatten(found).find(v=>topologyKey(v)===key)?.station;
      const factor=factors[x.caseId];
      if(!row||!row.actions||ACTIONS.some(k=>!finite(row.actions[k]))){issues.push("شش مؤلفه همزمان در عضو "+id+"، ایستگاه "+key+" برای ترکیب "+comboId+" ناقص است.");return;}
      ACTIONS.forEach(k=>sum[k]+=factor*row.actions[k]);
     });
     return {stationId:comboId+"|"+id+"|"+key,memberId:id,kind:m.cases[0]?.kind||null,segmentId:z.segmentId,segmentIndex:z.segmentIndex,xLocal_m:z.station.xLocal_m,xMember_m:z.station.xMember_m,localAxes:z.station.localAxes||null,actions:sum,units:{force:"N",moment:"N.m",length:"m"},sourceCaseIds:factorIds.slice(),concurrencyPreserved:true};
    });
    memberResults.push({memberId:id,stations,complete:stations.length===ref.flat.length});
   });
   proposals.push({combinationId:comboId,source:{...combo.source},sourceCases:factorIds.map(caseId=>({caseId,source:members[0]?.cases?.find(c=>txt(c.caseId)===caseId)?.source||null})),factors:{...factors},members:memberResults,linearSuperpositionProposal:true,designApproved:false});
  });
 }
 const success=issues.length===0&&proposals.length===combinations.length;
 const result={success,status:success?"linear-combination-demand-proposal":"insufficient_data",proposals,issues,assumptions:{...a},assumptionsIndependentlyVerified:false,sourceCombinationAudit:registry?{success:registry.success,issues:registry.issues.slice()}:null,concurrencyPreserved:true,caseSpecificVectorsRetainedAsSources:true,componentWiseEnvelopeMixing:false,capacityCalculated:false,designApproved:false,readyForCodeDesign:false,limitations:["ضرایب فقط از ورودی صریح کاربر/طراح گرفته می‌شوند؛ هیچ ضریب آیین‌نامه‌ای تولید نمی‌شود.","جمع خطی فقط یک پیشنهاد محاسباتی است و فرض‌های یکسان‌بودن مدل و تحلیل خطی را مستقلاً اثبات نمی‌کند.","تطابق شناسه، مختصات، قطعه‌بندی و محورهای محلی در ایستگاه‌ها الزامی است.","هیچ پوش مؤلفه‌ای ساخته نمی‌شود؛ بردار شش‌گانه هر ایستگاه در یک ترکیب حفظ می‌شود.","اثر مرتبه دوم، تحلیل غیرخطی، تغییر وضعیت تماس/تکیه‌گاه، ظرفیت، کمانش، اندرکنش و کنترل آیین‌نامه‌ای محاسبه نمی‌شود."]};
 return result;
}
function selfTest(){
 const src={code:"M6",edition:"1401",clause:"user-verified",document:"project-approved-basis"};
 const mk=(id,scale)=>({memberId:"M1",complete:true,cases:[{caseId:id,source:{document:"fixture",revision:"R1",locator:"Sheet1!A1",authority:"solver"},kind:"prismatic",complete:true,stations:[{xLocal_m:0,xMember_m:0,localAxes:{x:[1,0,0]},actions:{N:10*scale,Vy:2*scale,Vz:3*scale,T:4*scale,My:5*scale,Mz:6*scale}},{xLocal_m:2,xMember_m:2,localAxes:{x:[1,0,0]},actions:{N:20*scale,Vy:4*scale,Vz:6*scale,T:8*scale,My:10*scale,Mz:12*scale}}]}]});
 const pkg={success:true,designApproved:false,concurrencyPreserved:true,caseSeparationPreserved:true,caseIds:["D","W"],members:[{memberId:"M1",complete:true,cases:[mk("D",1).cases[0],mk("W",2).cases[0]]}],designGate:{designApproved:false}};
 const combos={loadCases:[{id:"D",category:"dead"},{id:"W",category:"wind"}],combinations:[{id:"C1",factors:{D:1.2,W:1},source:src}]};
 const assumptions={sameModelRevision:true,sameGeometry:true,sameSupports:true,sameStiffnessModel:true,linearElasticFirstOrder:true};
 const ok=build(pkg,combos,assumptions);
 const t=[
  ["valid matching station vectors combined",()=>ok.success&&ok.proposals[0].members[0].stations[0].actions.N===32&&ok.proposals[0].members[0].stations[0].actions.Mz===19.2],
  ["source case IDs and explicit factors retained",()=>ok.proposals[0].factors.D===1.2&&ok.proposals[0].members[0].stations[0].sourceCaseIds.length===2],
  ["underlying analysis case provenance retained in combination",()=>ok.proposals[0].sourceCases?.length===2&&ok.proposals[0].sourceCases[0].source.document==="fixture"],
  ["inconsistent case provenance across members rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members.push({memberId:"M2",complete:true,cases:[{...mk("D",1).cases[0],source:{document:"other",revision:"1",locator:"p.1",authority:"reviewed"}},mk("W",2).cases[0]]});return !build(x,combos,assumptions).success;}],
  ["missing assumptions fail closed",()=>!build(pkg,combos,{}).success],
  ["missing code source rejected",()=>{const x=JSON.parse(JSON.stringify(combos));delete x.combinations[0].source.clause;return !build(pkg,x,assumptions).success;}],
  ["missing load-case category is not defaulted",()=>{const x=JSON.parse(JSON.stringify(combos));x.loadCases[0].category="";return !build(pkg,x,assumptions).success;}],
  ["unknown factor case rejected",()=>{const x=JSON.parse(JSON.stringify(combos));x.combinations[0].factors.X=1;return !build(pkg,x,assumptions).success;}],
  ["missing member case rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases.pop();return !build(x,combos,assumptions).success;}],
  ["station coordinate mismatch rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[1].xMember_m=2.1;return !build(x,combos,assumptions).success;}],
  ["duplicate station topology rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[1].xLocal_m=0;x.members[0].cases[1].stations[1].xMember_m=0;return !build(x,combos,assumptions).success;}],
  ["non-finite station coordinate rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[0].xLocal_m=NaN;return !build(x,combos,assumptions).success;}],
  ["local axis mismatch rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[0].localAxes.x=[0,1,0];return !build(x,combos,assumptions).success;}],
  ["incomplete concurrent vector rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));delete x.members[0].cases[1].stations[0].actions.Mz;return !build(x,combos,assumptions).success;}],
  ["failed demand package rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.success=false;return !build(x,combos,assumptions).success;}],
  ["design approval never granted",()=>ok.designApproved===false&&ok.readyForCodeDesign===false&&ok.proposals.every(c=>c.designApproved===false)],
  ["no component envelope is generated",()=>ok.componentWiseEnvelopeMixing===false&&ok.proposals[0].members[0].stations[0].concurrencyPreserved===true]
 ];
 const results=t.map(([name,fn])=>({name,ok:!!fn()}));
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelMemberDemandCombinationBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-demand-combination-ui.js ===== */
/* SAHROUD STEEL — user-confirmed combination proposal UI.
 * Reads existing evidence and a completed demand package; never runs automatically.
 * Results stay in memory and remain non-approving.
 */
(function(root){
"use strict";
let lastProposal=null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const ASSUMPTIONS=[
 ["sameModelRevision","نسخه مدل در تمام حالت‌ها یکسان است"],
 ["sameGeometry","هندسه و تقسیم‌بندی اعضا یکسان است"],
 ["sameSupports","تکیه‌گاه‌ها و قیود یکسان‌اند"],
 ["sameStiffnessModel","مدل سختی و خواص اعضا یکسان‌اند"],
 ["linearElasticFirstOrder","تحلیل خطی الاستیک مرتبه اول معتبر است"]
];
function readInputs(){
 const demand=root.SteelMemberDesignDemandPackage?.getLast?.()||null;
 const workbench=root.SteelLoadCaseWorkbench?.read?.()||null;
 const audit=workbench?root.SteelLoadCaseWorkbench?.audit?.(workbench):null;
 const loadCases=(workbench?.loadCases||[]).map(c=>({id:c.id,category:c.category}));
 return {demand,workbench,audit,combinationSet:{loadCases,combinations:clone(workbench?.combinations||[])}};
}
function panelHTML(){
 return `<section class="panel" id="memberDemandCombinationPanel">
 <div class="panel-title"><h3>پیشنهاد ترکیب تقاضای اعضا</h3><span class="status">اجرای دستی؛ بدون تأیید طراحی</span></div>
 <div class="notice">این بخش فقط بسته تقاضای ایستگاهیِ از قبل ساخته‌شده را با ضرایب صریح دفترچه شواهد ترکیب می‌کند. هیچ تحلیل جدیدی اجرا نمی‌شود و هیچ ضریب آیین‌نامه‌ای تولید نمی‌شود. پنج فرض زیر باید توسط مهندس مسئول بررسی و صریحاً تأیید شوند؛ این تأییدها خودکار راستی‌آزمایی نمی‌شوند.</div>
 <div id="mdcb_readiness" class="notice">برای مشاهده وضعیت، دکمه بازخوانی را بزنید.</div>
 <h4>فرض‌های لازم برای جمع خطی</h4>
 <div id="mdcb_assumptions" class="form-grid">${ASSUMPTIONS.map(([k,label])=>`<label class="field"><input type="checkbox" id="mdcb_${k}"> ${esc(label)}</label>`).join("")}</div>
 <div class="button-grid"><button class="btn secondary" type="button" id="mdcb_refresh">بازخوانی بسته و دفترچه</button><button class="btn primary" type="button" id="mdcb_build">ساخت پیشنهاد ترکیب</button><button class="btn secondary" type="button" id="mdcb_export">دریافت JSON پیشنهاد</button></div>
 <div id="mdcb_result" class="notice">هنوز پیشنهادی ساخته نشده است.</div>
 <div id="mdcb_details"></div>
 </section>`;
}
function readiness(){
 const x=readInputs(),d=x.demand,w=x.workbench;
 const ready=!!(d?.success===true&&x.audit?.success===true&&x.combinationSet.loadCases.length&&x.combinationSet.combinations.length);
 return {ready,demandStatus:d?(d.success?"بسته تقاضا کامل":"بسته تقاضا ناقص"):"بسته تقاضا ساخته نشده",memberCount:d?.members?.length||0,caseCount:d?.caseIds?.length||0,loadCaseCount:x.combinationSet.loadCases.length,combinationCount:x.combinationSet.combinations.length,evidenceAudit:x.audit?.success===true,issues:[...(d?.issues||[]),...(x.audit?.issues||[])],workbenchAvailable:!!w};
}
function renderReadiness(){
 const host=$("mdcb_readiness");if(!host)return;
 const r=readiness();
 host.innerHTML="<b>وضعیت پیش‌نیازها:</b> "+(r.ready?"آماده ساخت پیشنهاد":"پیش‌نیازها کامل نیستند")+
 "<br>"+esc(r.demandStatus)+"؛ اعضا: "+r.memberCount+"؛ حالت‌های تقاضا: "+r.caseCount+
 "<br>حالت‌های ثبت‌شده در دفترچه: "+r.loadCaseCount+"؛ ترکیب‌ها: "+r.combinationCount+
 "<br>ممیزی دفترچه: "+(r.evidenceAudit?"موفق":"ناموفق/در دسترس نیست")+
 (r.issues.length?"<br>"+esc(r.issues.join(" | ")):"");
 return r;
}
function selectedAssumptions(){
 const out={};ASSUMPTIONS.forEach(([k])=>{out[k]=!!$("mdcb_"+k)?.checked;});return out;
}
function renderProposal(result){
 const host=$("mdcb_result"),details=$("mdcb_details");if(!host||!details)return;
 if(!result){host.textContent="هنوز پیشنهادی ساخته نشده است.";details.innerHTML="";return;}
 host.innerHTML="<b>"+(result.success?"پیشنهاد با موفقیت ساخته شد":"ساخت پیشنهاد متوقف شد")+"</b><br>ترکیب‌ها: "+result.proposals.length+
 "<br>تأیید طراحی: خیر؛ محاسبه ظرفیت: خیر؛ آماده طراحی آیین‌نامه‌ای: خیر"+
 (result.issues.length?"<br>"+esc(result.issues.join(" | ")):"");
 details.innerHTML="<h4>جزئیات کامل پیشنهاد و ردیابی</h4><pre style='white-space:pre-wrap;overflow-wrap:anywhere;max-height:480px;overflow:auto'>"+esc(JSON.stringify(result,null,2))+"</pre>";
}
function build(){
 const x=readInputs(),r=renderReadiness();
 if(!r.ready){lastProposal=null;lastProposal={success:false,proposals:[],issues:["بسته تقاضا و ممیزی دفترچه باید هر دو موفق باشند."],designApproved:false};renderProposal(lastProposal);return clone(lastProposal);}
 const assumptions=selectedAssumptions();
 if(ASSUMPTIONS.some(([k])=>assumptions[k]!==true)){
  lastProposal={success:false,proposals:[],issues:["هر پنج فرض باید بررسی و صریحاً علامت‌گذاری شوند."],designApproved:false};renderProposal(lastProposal);return clone(lastProposal);
 }
 const engine=root.SteelMemberDemandCombinationBridge?.build;
 if(typeof engine!=="function"){lastProposal={success:false,proposals:[],issues:["موتور پیشنهاد ترکیب بار بارگذاری نشده است."],designApproved:false};renderProposal(lastProposal);return clone(lastProposal);}
 try{lastProposal=engine(x.demand,x.combinationSet,assumptions);}
 catch(e){lastProposal={success:false,proposals:[],issues:[String(e?.message||e)],designApproved:false};}
 renderProposal(lastProposal);
 return clone(lastProposal);
}
function exportProposal(){
 if(!lastProposal){renderProposal({success:false,proposals:[],issues:["ابتدا یک پیشنهاد موفق بسازید."],designApproved:false});return;}
 const blob=new Blob([JSON.stringify(lastProposal,null,2)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-member-demand-combination-proposal.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 if($("memberDemandCombinationPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const footer=main.querySelector("footer");
 const wrap=document.createElement("div");wrap.innerHTML=panelHTML();
 const panel=wrap.firstElementChild;
 const scope=$("memberDesignScopeGatePanel");
 if(scope)scope.insertAdjacentElement("beforebegin",panel);else if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
 $("mdcb_refresh").addEventListener("click",renderReadiness);
 $("mdcb_build").addEventListener("click",build);
 $("mdcb_export").addEventListener("click",exportProposal);
 renderReadiness();
}
root.SteelMemberDemandCombinationUI={readiness,selectedAssumptions,build,exportProposal,renderReadiness,init,getLast:()=>lastProposal?clone(lastProposal):null};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/climate-design-readiness.js ===== */
/* SAHROUD STEEL — climate and load-basis evidence gate.
 * Default project city is Shahrud, but city defaults never certify climate values.
 * This audit intentionally produces readiness only, never loads or design approval.
 */
(function(root){
"use strict";
const finite=v=>v!==""&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
function audit(data){
 const loads=data||root.SteelLoads?.getData?.()||{};
 const c=loads.climate||{};
 const issues=[],missing=[];
 const add=(key,label,ok)=>{if(!ok){missing.push(key);issues.push(label);}};
 add("city","شهر/محل پروژه مشخص نیست.",!!String(c.city||"").trim()&&!!String(c.customCity||"").trim());
 add("wind-speed","سرعت مبنای باد معتبر وارد نشده است.",finite(c.basicWind)&&Number(c.basicWind)>0);
 add("ground-snow","بار برف مبنای زمین معتبر وارد نشده است.",finite(c.groundSnow)&&Number(c.groundSnow)>=0);
 add("elevation","ارتفاع واقعی محل پروژه از منبع معتبر ثبت نشده است.",finite(c.elevation)&&Number(c.elevation)>=0);
 add("source-document","شناسه سند و بند/جدول منبع اقلیمی ثبت نشده است.",!!String(c.sourceDocument||"").trim()&&!!String(c.sourceClause||"").trim());
 add("source-verification","تأیید مستند داده اقلیمی ثبت نشده است.",c.sourceVerified===true);
 add("site-elevation-source","منبع ارتفاع محل (نقشه‌برداری/مدل ارتفاعی معتبر) ثبت نشده است.",!!String(c.elevationSource||"").trim());
 const requiredLoads=["deadLeft","deadRight","liveLeft","liveRight","snowLeft","snowRight","windLeft","windRight","windWall","windEndFront","windEndBack"];
 requiredLoads.forEach(k=>add("load:"+k,"ورودی بار "+k+" صریح و عددی نیست.",finite(loads[k])));
 const code=root.SteelDesignCodes?.getData?.()||{};
 const codeText=JSON.stringify(code);
 const hasLoadCode=/مبحث ششم|Mabhas.?6|NB.?RI.?6/i.test(codeText);
 add("load-code-edition","ویرایش مبحث ششم در پیکربندی فعال پروژه به‌طور صریح ثبت نشده است.",hasLoadCode);
 const status=missing.length?"blocked":"evidence-complete-review-required";
 return {
  status,ready:missing.length===0,designApproved:false,analysisEnabled:false,
  city:c.customCity||c.city||null,missing,issues,
  climate:{basicWind:finite(c.basicWind)?Number(c.basicWind):null,groundSnow:finite(c.groundSnow)?Number(c.groundSnow):null,elevation:finite(c.elevation)?Number(c.elevation):null,sourceVerified:c.sourceVerified===true},
  loadInputsChecked:requiredLoads.length,
  disclaimer:"این ممیزی فقط کامل‌بودن شواهد و ورودی‌ها را بررسی می‌کند؛ بار باد/برف را محاسبه یا ترکیبات بار را تأیید نمی‌کند و مجوز تحلیل یا طراحی اجرایی صادر نمی‌کند."
 };
}
function selfTest(){
 const base={climate:{city:"shahroud",customCity:"شاهرود",basicWind:90,groundSnow:1,elevation:1350,sourceDocument:"Mabhas 6",sourceClause:"Table 6-10-1",sourceVerified:true,elevationSource:"survey"},deadLeft:1,deadRight:1,liveLeft:0,liveRight:0,snowLeft:1,snowRight:1,windLeft:0,windRight:0,windWall:0,windEndFront:0,windEndBack:0};
 const prior=root.SteelDesignCodes;root.SteelDesignCodes={getData:()=>({codes:[{id:"m6",name:"مبحث ششم",edition:"۱۳۹۸"}]})}; 
 const good=audit(base),bad=audit({...base,climate:{...base.climate,groundSnow:"",sourceVerified:false},windLeft:""});
 const tests=[
  ["complete documented inputs reach review-only state",good.ready&&good.status==="evidence-complete-review-required"&&!good.designApproved],
  ["missing snow and wind data are blocked",!bad.ready&&bad.missing.includes("ground-snow")&&bad.missing.includes("load:windLeft")],
  ["unverified source is blocked",bad.missing.includes("source-verification")],
  ["missing source clause is blocked",!audit({...base,climate:{...base.climate,sourceClause:""}}).ready],
  ["missing site elevation source is blocked",!audit({...base,climate:{...base.climate,elevationSource:""}}).ready],
  ["zero wind is accepted only when explicitly numeric",audit({...base,windLeft:0}).missing.every(x=>x!=="load:windLeft")],
  ["negative ground snow is rejected",!audit({...base,climate:{...base.climate,groundSnow:-1}}).ready],
  ["audit never enables analysis or approves design",!good.analysisEnabled&&!good.designApproved&&!bad.analysisEnabled&&!bad.designApproved]
 ];
 root.SteelDesignCodes=prior; 
 return {passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,tests:tests.map(x=>({name:x[0],ok:x[1]}))};
}
function render(){
 const host=document.getElementById("climateDesignReadinessResults");if(!host)return;
 const r=audit();
 host.innerHTML="<h4>ممیزی مستندات اقلیمی و ورودی بار</h4><p><b>شهر پیش‌فرض/انتخابی:</b> "+String(r.city||"ثبت نشده")+"</p><p><b>وضعیت:</b> "+(r.ready?"ورودی‌ها برای بازبینی مهندسی کامل‌اند؛ هنوز تأیید طراحی نیست":"مسدود — "+r.missing.length+" مورد ناقص")+"</p><ul>"+r.issues.map(x=>"<li>"+x+"</li>").join("")+"</ul><div class='notice'>"+r.disclaimer+"</div>";
}
function init(){
 if(document.getElementById("climateDesignReadinessPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="climateDesignReadinessPanel";
 p.innerHTML="<div class='panel-title'><h3>دروازه شواهد بارهای اقلیمی و ترکیبات بار</h3><span class='status'>عدم تأیید کاذب</span></div><p>شاهرود شهر پیش‌فرض است. اعداد اقلیمی تا ثبت سند، بند/جدول، منبع ارتفاع و تأیید مهندس، مبنای طراحی نهایی محسوب نمی‌شوند.</p><div class='button-grid'><button class='btn secondary' id='btnClimateDesignReadiness' type='button'>ممیزی ورودی‌های اقلیمی</button></div><div id='climateDesignReadinessResults'></div>";
 const anchor=document.getElementById("advancedLoadPanel")||main.querySelector("footer");
 if(anchor)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 document.getElementById("btnClimateDesignReadiness").addEventListener("click",render);
}
root.SteelClimateDesignReadiness={audit,selfTest,render};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/endwall-gable-support-audit.js ===== */
/* SAHROUD STEEL — end-wall gable support topology audit.
 * Checks geometric support continuity only. It does not transfer gable wind
 * pressure, establish cladding restraint, or approve member/connection capacity.
 */
(function(root){
"use strict";
const finite=v=>Number.isFinite(Number(v));
const near=(a,b)=>Math.abs(Number(a)-Number(b))<=1e-6;
function audit(model){
 const issues=[],faces=[],g=model?.geometry||{},nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 const span=Number(g.span),length=Number(g.length),height=Number(g.height),rise=Number(g.rise),postSpacing=Number(g.endPostSpacing);
 if(!(span>0&&length>0&&height>0&&rise>=0&&postSpacing>0))issues.push("ابعاد دهانه، طول، ارتفاع، خیز و فاصله ستونک انتهایی باید معتبر باشند.");
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 if(nodeMap.size!==nodes.length)issues.push("شناسه گره تکراری یا نامعتبر است.");
 const roofY=x=>height+rise*(x<=span/2?x/(span/2):(span-x)/(span/2));
 const nBay=Math.max(1,Math.ceil(span/postSpacing));
 const xs=[...new Set([...Array.from({length:nBay+1},(_,i)=>span*i/nBay),span/2])].sort((a,b)=>a-b);
 const near=(a,b)=>Math.abs(Number(a)-Number(b))<=1e-6;
 const faceAudit=(face,z,frame)=>{
  const local=[],fail=m=>{local.push(m);issues.push(face+": "+m);};
  const getNode=id=>nodeMap.get(String(id));
  const vertical=[];
  xs.forEach((x,i)=>{
   const isBoundary=i===0||i===xs.length-1;
   const candidates=members.filter(m=>{
    if(isBoundary){if(m.sectionKey!=="column"||m.axis!=="transverse"||m.frame!==frame)return false;}
    else if(m.sectionKey!=="endPost"||m.endFace!==face)return false;
    const a=getNode(m.start),b=getNode(m.end);
    return a&&b&&near(a.x,x)&&near(b.x,x)&&near(a.z,z)&&near(b.z,z)&&!near(a.y,b.y);
   });
   const segments=candidates.map(m=>{const a=getNode(m.start),b=getNode(m.end);return{memberId:String(m.id),low:Math.min(a.y,b.y),high:Math.max(a.y,b.y),start:m.start,end:m.end};}).sort((a,b)=>a.low-b.low);
   const top=roofY(x),expectedTop=isBoundary?height:top;
   let cursor=0;
   if(!segments.length)fail("تکیه‌گاه قائم در ایستگاه x="+x+" وجود ندارد.");
   segments.forEach(s=>{
    if(!near(s.low,cursor))fail("شکاف یا هم‌پوشانی در زنجیره قائم x="+x+"، عضو "+s.memberId);
    cursor=s.high;
   });
   if(!near(cursor,expectedTop))fail("زنجیره قائم x="+x+" تا تراز مورد انتظار "+expectedTop+" متر ادامه ندارد.");
   vertical.push({x,kind:isBoundary?"end-frame-column":"end-post",topM:expectedTop,segmentCount:segments.length,memberIds:segments.map(s=>s.memberId),connected:local.length===0});
  });
  // The gable top chord must be a single, shared-node path on the roof profile.
  const chord=members.filter(m=>m.sectionKey==="rafter"&&m.axis==="transverse"&&m.frame===frame).filter(m=>{
   const a=getNode(m.start),b=getNode(m.end);return a&&b&&a.x>=-1e-6&&b.x<=span+1e-6&&near(a.y,roofY(a.x))&&near(b.y,roofY(b.x))&&near(a.z,z)&&near(b.z,z);
  });
  const graph=new Map();
  chord.forEach(m=>{if(!graph.has(m.start))graph.set(m.start,[]);if(!graph.has(m.end))graph.set(m.end,[]);graph.get(m.start).push({to:m.end,id:m.id});graph.get(m.end).push({to:m.start,id:m.id});});
  const start=nodes.find(n=>near(n.x,0)&&near(n.y,height)&&near(n.z,z));
  const end=nodes.find(n=>near(n.x,span)&&near(n.y,height)&&near(n.z,z));
  let pathCount=0,pathIds=[];
  if(start&&end){
   const visit=(id,seen,ids)=>{if(pathCount>=2)return;if(id===String(end.id)){pathCount++;if(pathCount===1)pathIds=ids;return;}(graph.get(String(id))||[]).forEach(e=>{if(!seen.has(e.to)){const next=new Set(seen);next.add(e.to);visit(e.to,next,[...ids,String(e.id)]);}});};
   visit(String(start.id),new Set([String(start.id)]),[]);
  }
  if(pathCount!==1)fail("وتر بالایی گابل باید دقیقاً یک مسیر پیوسته و یکتا از رفتر قاب انتهایی داشته باشد؛ تعداد مسیر: "+pathCount);
  // Each modeled horizontal end girt row must span every adjacent active station.
  const girts=members.filter(m=>m.sectionKey==="endGirt"&&m.endFace===face);
  const levels=[...new Set(girts.map(m=>{const a=getNode(m.start);return a?Number(a.y):NaN;}).filter(Number.isFinite))].sort((a,b)=>a-b);
  levels.forEach(y=>{
   const active=xs.filter(x=>roofY(x)>=y-1e-6);
   for(let i=0;i<active.length-1;i++){
    const x1=active[i],x2=active[i+1];
    const matching=girts.filter(m=>{const a=getNode(m.start),b=getNode(m.end);return a&&b&&near(a.y,y)&&near(b.y,y)&&near(a.z,z)&&near(b.z,z)&&((near(a.x,x1)&&near(b.x,x2))||(near(a.x,x2)&&near(b.x,x1)));});
    const count=matching.length;
    if(count!==1)fail("ردیف گرت y="+y+" بین x="+x1+" و x="+x2+" باید دقیقاً یک عضو داشته باشد؛ تعداد: "+count);
    matching.forEach(m=>{
     const a=getNode(m.start),b=getNode(m.end);
     const connected=(id,x)=>members.some(v=>{
      if(!["column","endPost"].includes(v.sectionKey))return false;
      if(v.start!==id&&v.end!==id)return false;
      const p=getNode(id);return !!p&&near(p.x,x)&&near(p.z,z);
     });
     if(!connected(m.start,a.x)||!connected(m.end,b.x))fail("اتصال گره‌ای گرت "+m.id+" به ستون/ستونک در دو انتها برقرار نیست.");
    });
   }
  });
  const faceOk=local.length===0;
  faces.push({face,z,frame,success:faceOk,issues:local,verticalSupports:vertical,gableChord:{pathCount,memberIds:pathIds},girtRows:levels.length});
 };
 if(!issues.some(x=>x.includes("ابعاد دهانه"))){
  faceAudit("front",0,1);
  const frameCount=nodes.filter(n=>n.kind==="base"&&near(n.z,length)).length?Math.max(2,new Set(nodes.filter(n=>n.kind==="base").map(n=>Number(n.z))).size):2;
  faceAudit("rear",length,frameCount);
 }
 return{success:issues.length===0,faces,issues,geometry:{expectedSupportStationsM:xs,expectedStationCount:xs.length},scope:"ممیزی توپولوژی ستونک‌ها، ستون‌های قاب انتهایی، گرت‌های انتهایی و وتر رفتر؛ بدون انتقال فشار باد یا تأیید ظرفیت.",analysisEnabled:false,designApproved:false};
}
function fixture(){
 const span=20,height=6,rise=2,length=30,endPostSpacing=5,frames=[0,length],nodes=[],members=[];
 const roofY=x=>height+rise*(x<=span/2?x/(span/2):(span-x)/(span/2));
 let id=0;const add=(x,y,z,kind="joint")=>{const old=nodes.find(n=>near(n.x,x)&&near(n.y,y)&&near(n.z,z));if(old)return old;const n={id:"N"+(++id),x,y,z,kind};nodes.push(n);return n;};
 const addM=(a,b,sectionKey,extra={})=>members.push({id:"M"+(members.length+1),start:a.id,end:b.id,sectionKey,...extra});
 const xs=[0,5,10,15,20];
 [0,length].forEach((z,fi)=>{
  xs.forEach((x,i)=>{
   const top=i===0||i===xs.length-1?height:roofY(x),ys=[0,3,6,top].filter((v,j,a)=>v<=top+1e-7&&(j===0||Math.abs(v-a[j-1])>1e-7));
   const row=ys.map(y=>add(x,y,z,y===0?(i===0||i===xs.length-1?"base":"endwall-base"):"joint"));
   for(let k=0;k<row.length-1;k++)addM(row[k],row[k+1],i===0||i===xs.length-1?"column":"endPost",i===0||i===xs.length-1?{axis:"transverse",frame:fi+1}:{endFace:fi===0?"front":"rear"});
  });
  const chord=xs.map(x=>add(x,roofY(x),z,"rafter"));
  for(let i=0;i<chord.length-1;i++)addM(chord[i],chord[i+1],"rafter",{axis:"transverse",frame:fi+1});
  [3,6].forEach((y,gi,levels)=>{const lower=gi===0?0:(levels[gi-1]+y)/2,next=gi===levels.length-1?Infinity:(y+levels[gi+1])/2;const active=xs.filter(x=>roofY(x)>=y-1e-7);for(let i=0;i<active.length-1;i++){const x1=active[i],x2=active[i+1],mid=(x1+x2)/2,upper=Math.min(next,roofY(mid)),a=nodes.find(n=>near(n.x,x1)&&near(n.y,y)&&near(n.z,z)),b=nodes.find(n=>near(n.x,x2)&&near(n.y,y)&&near(n.z,z));addM(a,b,"endGirt",{endFace:fi===0?"front":"rear",row:gi+1,tributaryHeight:upper-lower,tributaryHeightLowerM:lower,tributaryHeightUpperM:upper});}});
 });
 return{geometry:{span,length,height,rise,endPostSpacing},nodes,members};
}
function selfTest(){
 const checks=[],test=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:e.message});}};
 test("both gable faces have continuous vertical posts, girts and a unique rafter chord",()=>audit(fixture()).success);
 test("missing upper gable post segment is rejected",()=>{const m=fixture();const target=m.members.find(x=>x.sectionKey==="endPost"&&x.endFace==="front"&&(()=>{const a=m.nodes.find(n=>n.id===x.start),b=m.nodes.find(n=>n.id===x.end);return a&&b&&Math.max(a.y,b.y)>6;})());m.members=m.members.filter(x=>x!==target);return !audit(m).success;});
 test("duplicate end-girt segment is rejected",()=>{const m=fixture(),x=m.members.find(x=>x.sectionKey==="endGirt"&&x.endFace==="front");m.members.push({...x,id:"DUP"});return !audit(m).success;});
 test("missing rafter chord path is rejected",()=>{const m=fixture();m.members=m.members.filter(x=>!(x.sectionKey==="rafter"&&x.frame===1));return !audit(m).success;});
 test("disconnected end-girt endpoint is rejected",()=>{const m=fixture(),g=m.members.find(x=>x.sectionKey==="endGirt"&&x.endFace==="front");const old=m.nodes.find(n=>n.id===g.start);const duplicate={...old,id:"DISCONNECTED"};m.nodes.push(duplicate);g.start=duplicate.id;return !audit(m).success;});
 test("audit never enables analysis or approves design",()=>{const r=audit(fixture());return r.analysisEnabled===false&&r.designApproved===false;});
 const passed=checks.filter(x=>x.ok).length;return{passed,failed:checks.length-passed,total:checks.length,checks};
}
root.SteelEndWallGableSupportAudit={audit,selfTest,fixture};
})(typeof window!=="undefined"?window:globalThis);

