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
 return {ready:false,inputAuditComplete:issues.length===0&&rows.length===GROUPS.length&&missingGroups.length===0&&cases.length>0&&failedCases.length===0,forceDemandComplete:rows.length===GROUPS.length&&rows.every(x=>x.forceDemandComplete),resistanceCalculated:false,designApproved:false,status:"demand-and-input-audit-only",rows,issues,warnings,missingGroups,memberCoverage,failedCases:failedCases.map(x=>x.label),modelMemberCount:Number.isFinite(modelMemberCount)?modelMemberCount:null,sourceCases:cases.length,disclaimer:"این کنترل پوشش اعضای اصلی و فرعی را ممیزی می‌کند؛ برای لاپه/قید نوع مقطع و مسیر اختصاصی و برای مهاربندها موتور محوری/اتصال لازم است. بیشینه خمش و برش به‌صورت مستقل و همراه حالت/انتهای بحرانی گزارش می‌شوند و نباید به‌عنوان یک حالت هم‌زمان ترکیب شوند. ظرفیت خمشی، کمانش پیچشی-جانبی، ظرفیت برشی جان، اثر سخت‌کننده‌ها، طبقه‌بندی مقطع و اندرکنش محاسبه نشده‌اند؛ نتیجه تأیید آیین‌نامه‌ای یا مجوز اجرا نیست."};
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
  {name:"complete force vectors and input data never imply calculated resistance or approval",pass:r.rows.every(x=>x.ready===false&&x.resistanceCalculated===false&&x.designApproved===false)&&r.resistanceCalculated===false&&r.designApproved===false&&r.status==="demand-and-input-audit-only"},
  {name:"input audit completion is explicitly separate from design readiness",pass:r.inputAuditComplete===false&&r.rows.every(x=>typeof x.inputDataComplete==="boolean"&&typeof x.forceDemandComplete==="boolean")},
  {name:"missing force demand does not contaminate member input completeness",pass:(()=>{const bad=members.map((m,i)=>i===0?{...m,simultaneousCases:[{...m.simultaneousCases[0],endI:{...m.simultaneousCases[0].endI,T:null}}]}:m);const x=audit({...env,members:bad}).rows.find(y=>y.group==="column");return x.inputDataComplete===true&&x.forceDemandComplete===false&&x.resistanceCalculated===false;})()},
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
