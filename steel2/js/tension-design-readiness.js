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
function extractGroupTensionDemand(group){
 const env=root.SteelMemberForceEnvelope?.getLast?.(),model=root.SteelStructuralModel?.getData?.();
 const fail=reason=>({ready:false,reason,forceDemandKN:null,memberCount:0});
 if(!env||!model||!Array.isArray(env.cases)||!env.cases.length)return fail("پوش نیرو یا مدل جاری موجود نیست.");
 if(env.allCasesEquilibriumOK!==true||(env.invalidForceVectors||[]).length||(env.analysisMemberSetMismatchCases||[]).length||(env.unreportedMemberIds||[]).length||(env.duplicateMemberIdsByCase||[]).length||(env.extraMemberIds||[]).length)return fail("پوش نیرو از نظر تعادل یا پوشش اعضا/بردارها کامل نیست.");
 const sign=env.localEndForceConvention?.verifiedSignCases?.axialTension;
 if(env.localEndForceConvention?.version!==1||sign?.endI!=="negative Fx_i"||sign?.endJ!=="positive Fx_j")return fail("قرارداد علامت محوری حل‌گر معتبر نیست.");
 const members=model.members.filter(m=>m.sectionKey===group);
 if(!members.length)return fail("عضوی از این گروه در مدل جاری وجود ندارد.");
 const rows=new Map((env.members||[]).map(m=>[String(m.id),m]));
 const labels=env.cases.map(c=>String(c.label||""));
 if(!labels.length||new Set(labels).size!==labels.length||labels.some(x=>!x.trim()))return fail("نام ترکیبات بار خالی یا تکراری است.");
 let peak=0,governing=null,nonAxialActionDetected=false;
 for(const member of members){
  const row=rows.get(String(member.id));
  if(!row||!Array.isArray(row.simultaneousCases)||row.simultaneousCases.length!==labels.length)return fail("پوش نیرو برای عضو "+member.id+" کامل نیست.");
  const actual=row.simultaneousCases.map(c=>String(c.label||""));
  if(new Set(actual).size!==actual.length||labels.some(label=>!actual.includes(label)))return fail("پوش ترکیبات عضو "+member.id+" با فهرست تحلیل تطبیق ندارد.");
  for(const label of labels){
   const demand=root.SteelMemberForceEnvelope?.getSimultaneousCaseDemand?.(row,label);
   if(!demand||!Number.isFinite(demand.endI?.tension)||!Number.isFinite(demand.endJ?.tension))return fail("تقاضای کششی هم‌زمان عضو "+member.id+" معتبر نیست.");
   for(const end of [demand.endI,demand.endJ])if(["Vy","Vz","T","My","Mz"].some(k=>Number.isFinite(end[k])&&Math.abs(end[k])>1e-3))nonAxialActionDetected=true;
   for(const [end,value] of [["I",demand.endI.tension],["J",demand.endJ.tension]])if(value>peak){peak=value;governing={memberId:String(member.id),caseLabel:label,end,tensionN:value};}
  }
 }
 if(nonAxialActionDetected)return fail("در حداقل یک ترکیب، برش/پیچش/لنگر عضو غیرصفر است؛ غربال کشش محوری خالص مجاز نیست و مسیر اندرکنش N-M لازم است.");
 return {ready:true,axialOnly:true,forceDemandKN:peak/1000,memberCount:members.length,caseCount:labels.length,governing,source:"FEM envelope; tension-positive end normalization"};
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
  const demandBridge=extractGroupTensionDemand(g),manualDemand=Number(d.forceDemandKN)>0?Number(d.forceDemandKN):null;
  if(!demandBridge.ready){if(manualDemand===null)warnings.push(label+": نیروی کششی تقاضا از پوش FEM استخراج نشد؛ "+demandBridge.reason);}
  else if(manualDemand!==null&&Math.abs(manualDemand-demandBridge.forceDemandKN)>Math.max(0.01,demandBridge.forceDemandKN*0.01))warnings.push(label+": مقدار دستی تقاضا با بیشینه کشش استخراج‌شده از FEM بیش از ۱٪ اختلاف دارد؛ منبع و ترکیب کنترل شوند.");
  const capacityScreen=demandBridge.ready?root.SteelTensionCapacityScreen?.analyze?.({codeBasis:"M10-1401-provisional",officialTextVerified:false,axialOnlyVerified:demandBridge.axialOnly===true,Ag_cm2:d.Ag_cm2,An_cm2:d.An_cm2,Ae_cm2:d.Ae_cm2,U:d.U,Fy_MPa:Number(mat.Fy),Fu_MPa:Number(mat.Fu),demand_kN:demandBridge.forceDemandKN,governingMember:demandBridge.governing?.memberId,governingCase:demandBridge.governing?.caseLabel,governingEnd:demandBridge.governing?.end}):null;
  groups[g]={label,complete:local.length===0,issues:local,connectionType:d.connectionType,Ag_cm2:d.Ag_cm2,An_cm2:d.An_cm2,Ae_cm2:d.Ae_cm2,U:d.U,forceDemandKN:manualDemand??(demandBridge.ready?demandBridge.forceDemandKN:null),computedForceDemandKN:demandBridge.forceDemandKN,demandSource:demandBridge.ready?demandBridge.source:null,demandMemberCount:demandBridge.memberCount,demandCaseCount:demandBridge.caseCount,governingTension:demandBridge.governing,capacityScreen:capacityScreen||{ok:false,issues:["موتور غربال ظرفیت یا تقاضای FEM معتبر در دسترس نیست."],designApproved:false}};
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
 const demandRows=Object.values(r.groups||{}).map(g=>"<li>"+esc(g.label)+": "+(Number.isFinite(g.computedForceDemandKN)?g.computedForceDemandKN.toFixed(3)+" kN":"استخراج نشده")+(g.governingTension?" — "+esc(g.governingTension.memberId)+" / "+esc(g.governingTension.caseLabel)+" / انتهای "+esc(g.governingTension.end):"")+" — "+(g.demandSource?esc(g.demandSource):"نیازمند بررسی پوش نیرو")+"</li>").join("");
 const screenRows=Object.values(r.groups||{}).map(g=>{const x=g.capacityScreen;if(!x?.ok)return "<li>"+esc(g.label)+": غربال انجام نشد — "+esc((x?.issues||[]).join("؛ ")||"اطلاعات ناکافی")+"</li>";return "<li>"+esc(g.label)+": LRFD="+x.LRFD.designStrength_kN.toFixed(2)+" kN، نسبت تقاضا/مقاومت="+x.LRFD.utilization.toFixed(3)+"؛ ASD="+x.ASD.allowableStrength_kN.toFixed(2)+" kN، نسبت تقاضا/مجاز="+x.ASD.utilization.toFixed(3)+"؛ حالت حاکم LRFD: "+esc(x.LRFD.governing)+"؛ عضو/ترکیب: "+esc(x.governingMember||"—")+"/"+esc(x.governingCase||"—")+"</li>";}).join("");
 host.innerHTML="<h4>"+(r.readyForDataReview?"داده‌های اولیه تکمیل شده‌اند؛ کنترل‌های اتصال همچنان باید مستقل تکمیل شوند":"ورودی‌های ناقص برای طراحی کششی")+"</h4><h4>بیشینه تقاضای کششی استخراج‌شده از FEM</h4><ul>"+demandRows+"</ul><h4>غربال مقدماتی مقاومت کششی — غیرنهایی</h4><ul>"+screenRows+"</ul>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>کمبود اجباری در این ممیزی شناسایی نشد.</p>")+(r.warnings.length?"<h4>هشدارها</h4><ul>"+r.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<div class='notice'>"+esc(r.note)+"<br>"+esc(r.disclaimer)+"</div>";
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
function selfTest(){
 const saved={env:root.SteelMemberForceEnvelope,model:root.SteelStructuralModel};
 const baseEnv={allCasesEquilibriumOK:true,invalidForceVectors:[],analysisMemberSetMismatchCases:[],unreportedMemberIds:[],duplicateMemberIdsByCase:[],localEndForceConvention:{version:1,verifiedSignCases:{axialTension:{endI:"negative Fx_i",endJ:"positive Fx_j"}}},cases:[{label:"T1"},{label:"C1"}],members:[{id:"B1",simultaneousCases:[{label:"T1",endI:{N:-100000},endJ:{N:120000}},{label:"C1",endI:{N:50000},endJ:{N:-60000}}]}]};
 root.SteelMemberForceEnvelope={getLast:()=>baseEnv,getSimultaneousCaseDemand:(row,label)=>{const c=row.simultaneousCases.find(x=>x.label===label),end=(e,sign)=>({tension:Math.max(0,sign*e.N),Vy:e.Vy||0,Vz:e.Vz||0,T:e.T||0,My:e.My||0,Mz:e.Mz||0});return {endI:end(c.endI,-1),endJ:end(c.endJ,1)};}};
 root.SteelStructuralModel={getData:()=>({members:[{id:"B1",sectionKey:"roofBrace"}]})};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("extracts maximum tension and governing member, case and end",()=>{const r=extractGroupTensionDemand("roofBrace");return r.ready&&r.forceDemandKN===120&&r.memberCount===1&&r.caseCount===2&&r.governing.memberId==="B1"&&r.governing.caseLabel==="T1"&&r.governing.end==="J";});
 t("blocks extraction when equilibrium is not verified",()=>{const old=baseEnv.allCasesEquilibriumOK;baseEnv.allCasesEquilibriumOK=false;const r=extractGroupTensionDemand("roofBrace");baseEnv.allCasesEquilibriumOK=old;return !r.ready;});
 t("blocks extraction when force sign convention is unknown",()=>{const old=baseEnv.localEndForceConvention;baseEnv.localEndForceConvention={version:2};const r=extractGroupTensionDemand("roofBrace");baseEnv.localEndForceConvention=old;return !r.ready;});
 t("blocks incomplete per-member combination coverage",()=>{const old=baseEnv.members[0].simultaneousCases;baseEnv.members[0].simultaneousCases=old.slice(0,1);const r=extractGroupTensionDemand("roofBrace");baseEnv.members[0].simultaneousCases=old;return !r.ready;});
 t("blocks groups absent from current model",()=>!extractGroupTensionDemand("wallBrace").ready);
 t("blocks axial-only screening when member moments are present",()=>{baseEnv.members[0].simultaneousCases[0].endI.My=250;const r=extractGroupTensionDemand("roofBrace");baseEnv.members[0].simultaneousCases[0].endI.My=0;return !r.ready&&r.reason.includes("لنگر");});
 root.SteelMemberForceEnvelope=saved.env;root.SteelStructuralModel=saved.model;
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"automatic tensile demand extraction from complete FEM cases only; no tensile resistance or connection design"};
}
root.SteelTensionDesignReadiness={getData,setData,readUI,audit,extractGroupTensionDemand,selfTest,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
