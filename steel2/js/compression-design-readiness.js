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
function extractGroupCompressionDemand(group){
 const env=root.SteelMemberForceEnvelope?.getLast?.(),model=root.SteelStructuralModel?.getData?.();
 const fail=reason=>({ready:false,reason,forceDemandKN:null,memberCount:0,caseCount:0,governing:null});
 if(!env||!model||!Array.isArray(env.cases)||!env.cases.length)return fail("پوش نیرو یا مدل جاری موجود نیست.");
 if(env.allCasesEquilibriumOK!==true||(env.invalidForceVectors||[]).length||(env.analysisMemberSetMismatchCases||[]).length||(env.unreportedMemberIds||[]).length||(env.duplicateMemberIdsByCase||[]).length||(env.extraMemberIds||[]).length)return fail("پوش نیرو از نظر تعادل یا پوشش اعضا/بردارها کامل نیست.");
 const sign=env.localEndForceConvention?.verifiedSignCases?.axialTension;
 if(env.localEndForceConvention?.version!==1||sign?.endI!=="negative Fx_i"||sign?.endJ!=="positive Fx_j")return fail("قرارداد علامت محوری حل‌گر معتبر نیست.");
 const members=model.members.filter(m=>m.sectionKey===group);
 if(!members.length)return fail("عضوی از این گروه در مدل جاری وجود ندارد.");
 const rows=new Map((env.members||[]).map(m=>[String(m.id),m])),labels=env.cases.map(c=>String(c.label||""));
 if(!labels.length||new Set(labels).size!==labels.length||labels.some(x=>!x.trim()))return fail("نام ترکیبات بار خالی یا تکراری است.");
 let peak=0,governing=null;
 for(const member of members){
  const row=rows.get(String(member.id));
  if(!row||!Array.isArray(row.simultaneousCases)||row.simultaneousCases.length!==labels.length)return fail("پوش نیرو برای عضو "+member.id+" کامل نیست.");
  const actual=row.simultaneousCases.map(c=>String(c.label||""));
  if(new Set(actual).size!==actual.length||labels.some(label=>!actual.includes(label)))return fail("پوش ترکیبات عضو "+member.id+" با فهرست تحلیل تطبیق ندارد.");
  for(const label of labels){
   const demand=root.SteelMemberForceEnvelope?.getSimultaneousCaseDemand?.(row,label);
   if(!demand||!Number.isFinite(demand.endI?.compression)||!Number.isFinite(demand.endJ?.compression))return fail("تقاضای فشاری هم‌زمان عضو "+member.id+" معتبر نیست.");
   for(const [end,value] of [["I",demand.endI.compression],["J",demand.endJ.compression]])if(value>peak){peak=value;governing={memberId:String(member.id),caseLabel:label,end,compressionN:value};}
  }
 }
 return {ready:true,forceDemandKN:peak/1000,memberCount:members.length,caseCount:labels.length,governing,source:"FEM envelope; tension-positive end normalization"};
}
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
const demandBridge=extractGroupCompressionDemand(g);
if(!demandBridge.ready)notes.push("تقاضای فشاری از پوش FEM استخراج نشد؛ "+demandBridge.reason);
rows[g]={label,complete:local.length===0,issues:local,notes,computedForceDemandKN:demandBridge.ready?demandBridge.forceDemandKN:null,demandSource:demandBridge.ready?demandBridge.source:null,demandMemberCount:demandBridge.memberCount,demandCaseCount:demandBridge.caseCount,governingCompression:demandBridge.governing};
local.forEach(x=>issues.push(label+": "+x));notes.forEach(x=>warnings.push(label+": "+x));
});
return {schemaVersion:1,readyForDataReview:issues.length===0,issues,warnings,groups:rows,disclaimer:"این ممیزی فقط کفایت داده‌ها را می‌سنجد. ظرفیت کمانش خمشی، پیچشی، خمشی-پیچشی، کمانش موضعی و اندرکنش محاسبه نشده و هیچ نتیجه‌ای تأیید آیین‌نامه‌ای یا مجوز اجرا نیست."};}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function render(){const host=$("compressionDesignContent");if(!host)return;host.innerHTML=GROUPS.map(([g,label])=>{const d=data.groups[g]||{};return '<details class="sub-panel"><summary>'+label+'</summary><div class="form-grid">'+FIELDS.map(([f,caption])=>'<div class="field"><label for="compression_'+g+'_'+f+'">'+caption+'</label><input type="number" min="0" step="any" id="compression_'+g+'_'+f+'" value="'+(d[f]??"")+'"></div>').join("")+'</div><div class="form-grid"><label><input type="checkbox" id="compression_'+g+'_bracingReviewed" '+(d.bracingReviewed?'checked':'')+'> آرایش مهاربندی و مهار جانبی بازبینی شد</label><label><input type="checkbox" id="compression_'+g+'_localSlendernessReviewed" '+(d.localSlendernessReviewed?'checked':'')+'> لاغری موضعی اجزای مقطع بازبینی شد</label></div><div class="field"><label for="compression_'+g+'_restraintNote">شرح شرایط مهار و منبع فرض‌ها</label><input type="text" id="compression_'+g+'_restraintNote" value="'+esc(d.restraintNote||"")+'" placeholder="مثلاً مهار جانبی در هر لاپه؛ مستند به نقشه مهاربندی"></div></details>';}).join("")+'<div class="button-grid"><button class="btn secondary" id="btnCompressionAudit" type="button">ممیزی ورودی اعضای فشاری</button></div><div id="compressionDesignResults"></div>'; }
function renderResult(r){const host=$("compressionDesignResults");if(!host)return;const demandRows=Object.values(r.groups||{}).map(g=>"<li>"+esc(g.label)+": "+(Number.isFinite(g.computedForceDemandKN)?g.computedForceDemandKN.toFixed(3)+" kN":"استخراج نشده")+(g.governingCompression?" — "+esc(g.governingCompression.memberId)+" / "+esc(g.governingCompression.caseLabel)+" / انتهای "+esc(g.governingCompression.end):"")+"</li>").join("");host.innerHTML="<h4>"+(r.readyForDataReview?"ورودی‌های پایه برای بازبینی موجودند":"موارد ناقص طراحی فشاری")+"</h4><h4>بیشینه تقاضای فشاری استخراج‌شده از FEM</h4><ul>"+demandRows+"</ul>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>کمبود اجباری در ممیزی ورودی‌ها یافت نشد.</p>")+(r.warnings.length?"<h4>هشدارها و داده‌های تکمیلی</h4><ul>"+r.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<div class='notice'>"+esc(r.disclaimer)+"</div>";}
function init(){if($("compressionDesignPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="compressionDesignPanel";p.innerHTML="<div class='panel-title'><h3>ورودی‌های طراحی اعضای فشاری و پایداری</h3><span class='status'>ممیزی داده‌ها — بدون محاسبه ظرفیت</span></div><div class='notice'>برای ستون، رفتر و اعضای فشاری/مهاربندی. Kx و Ky و طول‌های مهارنشده باید از شرایط واقعی مهار و تحلیل سازه تعیین شوند؛ وارد کردن مقدار پیش‌فرض بدون مستندات مجاز نیست.</div><div id='compressionDesignContent'></div>";const anchor=$("tensionDesignReadinessPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else{const footer=main.querySelector("footer");footer?footer.insertAdjacentElement("beforebegin",p):main.appendChild(p);}render();$("btnCompressionAudit").addEventListener("click",()=>renderResult(audit()));}
function selfTest(){
 const saved={env:root.SteelMemberForceEnvelope,model:root.SteelStructuralModel};
 const env={allCasesEquilibriumOK:true,invalidForceVectors:[],analysisMemberSetMismatchCases:[],unreportedMemberIds:[],extraMemberIds:[],duplicateMemberIdsByCase:[],localEndForceConvention:{version:1,verifiedSignCases:{axialTension:{endI:"negative Fx_i",endJ:"positive Fx_j"}}},cases:[{label:"C1"},{label:"C2"}],members:[{id:"R1",simultaneousCases:[{label:"C1",endI:{N:150000},endJ:{N:-180000}},{label:"C2",endI:{N:210000},endJ:{N:-90000}}]}]};
 root.SteelMemberForceEnvelope={getLast:()=>env,getSimultaneousCaseDemand:(row,label)=>{const c=row.simultaneousCases.find(x=>x.label===label);return {endI:{compression:Math.max(0,c.endI.N)},endJ:{compression:Math.max(0,-c.endJ.N)}};}};
 root.SteelStructuralModel={getData:()=>({members:[{id:"R1",sectionKey:"rafter"}]})};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("extracts maximum compression from both ends and all cases",()=>{const r=extractGroupCompressionDemand("rafter");return r.ready&&r.forceDemandKN===210&&r.governing.memberId==="R1"&&r.governing.caseLabel==="C2"&&r.governing.end==="I";});
 t("blocks extraction when equilibrium is not verified",()=>{env.allCasesEquilibriumOK=false;const r=extractGroupCompressionDemand("rafter");env.allCasesEquilibriumOK=true;return !r.ready;});
 t("blocks extraction when force sign convention is unknown",()=>{const old=env.localEndForceConvention;env.localEndForceConvention={version:2};const r=extractGroupCompressionDemand("rafter");env.localEndForceConvention=old;return !r.ready;});
 t("blocks incomplete per-member combination coverage",()=>{const old=env.members[0].simultaneousCases;env.members[0].simultaneousCases=old.slice(0,1);const r=extractGroupCompressionDemand("rafter");env.members[0].simultaneousCases=old;return !r.ready;});
 t("blocks groups absent from current model",()=>!extractGroupCompressionDemand("column").ready);
 root.SteelMemberForceEnvelope=saved.env;root.SteelStructuralModel=saved.model;
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"automatic compression-demand extraction from complete FEM cases only; no compression resistance or member approval"};
}
root.SteelCompressionDesignReadiness={getData,setData,readUI,audit,extractGroupCompressionDemand,selfTest,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
