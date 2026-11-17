/* ===== steel2/js/cold-formed-member-registry.js ===== */
/* SAHROUD STEEL — per-physical-member cold-formed profile/evidence register.
 * Stores exact member records in project JSON; audits evidence only, never resistance.
 */
(function(root){
"use strict";
let records=[];
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function getData(){return {schemaVersion:1,records:clone(records)};}
function setData(value){records=(Array.isArray(value?.records)?value.records:[]).filter(x=>x&&typeof x==="object").map(clone);render();}
function auditRecord(record){return root.SteelColdFormedMemberContract?.audit?root.SteelColdFormedMemberContract.audit(record):{success:false,issues:["قرارداد کنترل مقطع سردنورد بارگذاری نشده است."]};}
function auditModelCoverage(envelope){
 const env=envelope||root.SteelMemberForceEnvelope?.getLast?.();
 if(!env||!Array.isArray(env.members))return {success:false,available:false,designApproved:false,issues:["گزارش نیرو/مدل اعضا در دسترس نیست."],missingMemberIds:[],extraMemberIds:[]};
 const groups=new Set(["roofPurlin","wallGirt","endGirt","roofEdge"]);
 const model=env.members.filter(m=>groups.has(m.sectionKey));
 const ids=model.map(m=>String(m.id??m.memberId??"").trim());
 const recordIds=records.map(r=>String(r.memberId??"").trim());
 const duplicates=[...new Set(ids.filter((id,i)=>id&&ids.indexOf(id)!==i))];
 const duplicateRecords=[...new Set(recordIds.filter((id,i)=>id&&recordIds.indexOf(id)!==i))];
 const missing=ids.filter(id=>id&&!recordIds.includes(id));
 const extra=recordIds.filter(id=>id&&!ids.includes(id));
 const blank=ids.filter(id=>!id).length;
 const issues=[];
 if(!model.length)issues.push("هیچ عضو سردنورد/لاپه/قید از مدل نیرو شناسایی نشد.");
 if(blank)issues.push(blank+" عضو در گزارش نیرو شناسه ندارد.");
 if(duplicates.length)issues.push("شناسه تکراری در مدل: "+duplicates.join("، "));
 if(duplicateRecords.length)issues.push("شناسه تکراری در پرونده‌های ثبت‌شده: "+duplicateRecords.join("، "));
 if(missing.length)issues.push("برای "+missing.length+" عضو مدل پرونده اختصاصی ثبت نشده است.");
 if(extra.length)issues.push(extra.length+" پرونده به عضو موجود در مدل متصل نیست.");
 return {success:issues.length===0,available:true,designApproved:false,modelMemberCount:model.length,registeredRecordCount:records.length,missingMemberIds:missing,extraMemberIds:extra,duplicateModelIds:duplicates,duplicateRecordIds:duplicateRecords,issues,scope:"identity coverage only; no section resistance or design approval"};
}
function auditDemandLink(envelope,demandPackage){
 const coverage=auditModelCoverage(envelope),env=envelope||root.SteelMemberForceEnvelope?.getLast?.();
 const model=Array.isArray(env?.members)?env.members.filter(m=>["roofPurlin","wallGirt","endGirt","roofEdge"].includes(m.sectionKey)):[];
 if(!coverage.available)return {success:false,available:false,designApproved:false,coverage,issues:coverage.issues.slice(),members:[]};
 const pkg=demandPackage||root.SteelMemberDesignDemandPackage?.getLast?.(),proposal=pkg?.combinationProposal,issues=coverage.issues.slice(),results=[];
 if(!pkg)issues.push("بسته تقاضای ایستگاهی عضو از تحلیل حل‌گر در دسترس نیست.");
 if(pkg&&pkg.success!==true)issues.push("بسته تقاضای ایستگاهی کامل و موفق نیست.");
 if(!proposal||proposal.success!==true)issues.push("پیشنهاد ترکیب بار صریح و موفق برای اتصال تقاضا به پرونده عضو موجود نیست.");
 const contract=root.SteelColdFormedMemberContract;
 if(!contract?.auditFromDemandPackage)issues.push("مبدل قراردادی تقاضای اعضای سردنورد بارگذاری نشده است.");
 model.forEach(m=>{
  const id=String(m.id??m.memberId??"").trim(),matches=records.filter(r=>String(r.memberId??"").trim()===id);
  if(matches.length!==1){results.push({memberId:id,success:false,issues:["برای عضو مدل دقیقاً یک پرونده فیزیکی لازم است."]});return;}
  const record=matches[0],local=[];
  if(record.group!==m.sectionKey)local.push("گروه پرونده با گروه عضو در مدل یکسان نیست.");
  let audit=null;
  if(!local.length&&pkg?.success===true&&proposal?.success===true&&contract?.auditFromDemandPackage){audit=contract.auditFromDemandPackage(record,pkg,proposal);if(audit.success!==true)local.push(...(audit.issues||["تطبیق تقاضا با پرونده عضو موفق نبود."]));}
  results.push({memberId:id,success:local.length===0&&audit?.success===true,issues:local,audit});
 });
 results.forEach(r=>r.issues.forEach(x=>issues.push("عضو "+r.memberId+": "+x)));
 return {success:issues.length===0&&results.length===model.length&&results.every(r=>r.success),available:true,designApproved:false,coverage,demandPackageStatus:pkg?.status||null,combinationStatus:proposal?.status||null,members:results,issues,scope:"physical member ID + exact demand package + explicit combination proposal; no resistance calculation"};
}
function readEditor(){try{return {value:JSON.parse($("cfmMemberJson")?.value||""),error:null};}catch(e){return {value:null,error:"JSON نامعتبر است: "+e.message};}}
function status(message){const el=$("cfmRegistryStatus");if(el)el.textContent=message;}
function render(){
 const host=$("coldFormedMemberRegistryContent");if(!host)return;
 const rows=records.map((r,i)=>{const a=auditRecord(r);return '<tr><td>'+esc(r.memberId||"—")+'</td><td>'+esc(r.group||"—")+'</td><td>'+(a.success?"آماده بازبینی مقاومت":"ناقص: "+a.issues.length+" مورد")+'</td><td><button type="button" class="btn secondary" data-cfm-edit="'+i+'">ویرایش JSON</button> <button type="button" class="btn secondary" data-cfm-delete="'+i+'">حذف</button></td></tr>';}).join("");
 host.innerHTML='<div class="notice">هر لاپه یا قید باید با شناسه فیزیکی مستقل و هندسه/خواص واقعی خودش ثبت شود. قالب JSON شامل هندسه، گواهی مصالح، خواص مقطع، خروجی کمانش مستند، مهار، شش مؤلفه هم‌زمان در ایستگاه‌ها، اتصال و بهره‌برداری است. این رجیستر فقط شواهد را ممیزی می‌کند و مقاومت یا تأیید طراحی محاسبه نمی‌کند.</div>'+
 '<div class="field"><label for="cfmMemberJson">رکورد کامل یک عضو (JSON)</label><textarea id="cfmMemberJson" rows="18" spellcheck="false" style="width:100%;font-family:monospace;direction:ltr;text-align:left" placeholder="JSON record"></textarea></div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="cfmSaveMember">ثبت / به‌روزرسانی عضو</button><button type="button" class="btn secondary" id="cfmAuditAll">ممیزی همه اعضا</button><button type="button" class="btn secondary" id="cfmModelCoverage">کنترل پوشش اعضای مدل</button><button type="button" class="btn secondary" id="cfmDemandLink">ممیزی اتصال تقاضای تحلیل به عضو</button><button type="button" class="btn secondary" id="cfmExport">خروجی JSON اعضا</button><button type="button" class="btn secondary" id="cfmImport">ورود JSON اعضا</button></div>'+
 '<div class="notice" id="cfmRegistryStatus">تعداد رکوردها: '+records.length+' | ذخیره در ساختار فایل پروژه فعال است.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="width:100%"><thead><tr><th>شناسه عضو</th><th>گروه</th><th>وضعیت شواهد</th><th>عملیات</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
 '<div class="notice">گروه‌های مجاز: roofPurlin، wallGirt، endGirt، roofEdge. شناسه تکراری پذیرفته نمی‌شود. داده ناقص برای ظرفیت به صفر یا مقدار پیش‌فرض تبدیل نمی‌شود.</div>';
 $("cfmSaveMember").addEventListener("click",()=>{const q=readEditor();if(q.error){status(q.error);return;}const r=q.value;if(!r||typeof r!=="object"||Array.isArray(r)||!String(r.memberId||"").trim()){status("رکورد باید شیء JSON و دارای memberId یکتا باشد.");return;}const id=String(r.memberId).trim(),i=records.findIndex(x=>String(x.memberId)===id);if(i>=0)records[i]=clone(r);else records.push(clone(r));render();const a=auditRecord(r);status("رکورد "+id+" ثبت شد. "+(a.success?"شواهد کامل است؛ فقط آماده بازبینی مقاومت.":"شواهد ناقص است؛ "+a.issues.length+" مانع ثبت شد."));});
 $("cfmModelCoverage").addEventListener("click",()=>{const a=auditModelCoverage();status(a.available?("پوشش مدل: "+a.modelMemberCount+" عضو؛ "+a.missingMemberIds.length+" پرونده مفقود؛ "+a.extraMemberIds.length+" پرونده بدون عضو متناظر. "+a.issues.join(" | ")):"پوشش قابل ارزیابی نیست: "+a.issues.join(" | "));});
 $("cfmDemandLink").addEventListener("click",()=>{const a=auditDemandLink();status(a.available?("اتصال تقاضا: "+a.members.filter(x=>x.success).length+" از "+a.members.length+" عضو متصل؛ "+a.issues.join(" | ")):("اتصال تقاضا قابل ارزیابی نیست: "+a.issues.join(" | ")));});
 $("cfmAuditAll").addEventListener("click",()=>{const ready=records.filter(r=>auditRecord(r).success).length;status("ممیزی "+records.length+" عضو: "+ready+" آماده بازبینی مقاومت، "+(records.length-ready)+" ناقص. ظرفیت محاسبه نشده و طراحی تأیید نشده است.");});
 $("cfmExport").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(getData(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-cold-formed-member-records.json";a.click();URL.revokeObjectURL(url);});
 $("cfmImport").addEventListener("click",()=>{const q=readEditor();if(q.error){status(q.error);return;}const incoming=Array.isArray(q.value)?q.value:q.value?.records;if(!Array.isArray(incoming)){status("برای ورود، آرایه رکوردها یا شیء دارای records لازم است.");return;}const ids=incoming.map(x=>String(x?.memberId||"").trim());if(ids.some(x=>!x)||new Set(ids).size!==ids.length){status("ورود رد شد: شناسه خالی یا تکراری وجود دارد.");return;}if(incoming.some(x=>!x||typeof x!=="object"||Array.isArray(x))){status("ورود رد شد: همه رکوردها باید شیء JSON باشند.");return;}records=incoming.map(clone);render();status("تعداد "+records.length+" رکورد وارد شد؛ ممیزی و ذخیره پروژه انجام‌پذیر است.");});
 host.querySelectorAll("[data-cfm-edit]").forEach(btn=>btn.addEventListener("click",()=>{$("cfmMemberJson").value=JSON.stringify(records[Number(btn.getAttribute("data-cfm-edit"))],null,2);status("رکورد در ویرایشگر بارگذاری شد.");}));
 host.querySelectorAll("[data-cfm-delete]").forEach(btn=>btn.addEventListener("click",()=>{const i=Number(btn.getAttribute("data-cfm-delete")),id=records[i]?.memberId;records.splice(i,1);render();status("رکورد "+id+" حذف شد.");}));
}
function init(){if($("coldFormedMemberRegistryPanel"))return;const anchor=$("memberDesignInputsPanel");if(!anchor)return;const panel=document.createElement("section");panel.className="panel";panel.id="coldFormedMemberRegistryPanel";panel.setAttribute("data-focus-group","member-design");panel.innerHTML='<div class="panel-title"><h3>پرونده اختصاصی هر لاپه و قید — مقاطع سردنورد</h3><span class="status">شناسه‌محور</span></div><div id="coldFormedMemberRegistryContent"></div>';anchor.insertAdjacentElement("afterend",panel);render();}
function selfTest(){const prior=clone(records),tests=[];records=[{memberId:"P-01",group:"roofPurlin"},{memberId:"G-01",group:"wallGirt"}];tests.push({name:"distinct physical member IDs are retained",pass:getData().records.length===2&&getData().records[0].memberId!==getData().records[1].memberId});setData({schemaVersion:1,records:[{memberId:"P-02",group:"roofPurlin"}]});tests.push({name:"project save/load round trip retains member record",pass:getData().records.length===1&&getData().records[0].memberId==="P-02"});tests.push({name:"incomplete evidence remains blocked without approval",pass:auditRecord(records[0]).success===false});const coverage=auditModelCoverage({members:[{id:"P-01",sectionKey:"roofPurlin"},{id:"G-01",sectionKey:"wallGirt"}]});tests.push({name:"model coverage detects missing physical member records",pass:coverage.available&&coverage.missingMemberIds.length===2&&coverage.designApproved===false});
records=[{memberId:"P-01",group:"roofPurlin"},{memberId:"P-01",group:"roofPurlin"}];const duplicateCoverage=auditModelCoverage({members:[{id:"P-01",sectionKey:"roofPurlin"}]});tests.push({name:"duplicate physical member records block model coverage",pass:duplicateCoverage.success===false&&duplicateCoverage.duplicateRecordIds.includes("P-01")});
 tests.push({name:"untrusted member labels are HTML-escaped before rendering",pass:esc("<img src=x onerror=alert(1)>")==="&lt;img src=x onerror=alert(1)&gt;"});
const priorContract=root.SteelColdFormedMemberContract,priorPkg=root.SteelMemberDesignDemandPackage;
const model={members:[{id:"P-01",sectionKey:"roofPurlin"}]};
root.SteelColdFormedMemberContract={auditFromDemandPackage:(record,pkg,proposal)=>({success:record.memberId==="P-01"&&pkg.success===true&&proposal.success===true,issues:[]})};
root.SteelMemberDesignDemandPackage={getLast:()=>null};records=[{memberId:"P-01",group:"roofPurlin"}];
tests.push({name:"cold-formed demand link blocks when solver package is absent",pass:auditDemandLink(model).success===false});
const validPkg={success:true,status:"station-demand-evidence-complete",combinationProposal:{success:true,status:"linear-combination-demand-proposal"}};
tests.push({name:"matching physical member and explicit demand combination are linked",pass:auditDemandLink(model,validPkg).success===true});
records=[{memberId:"P-01",group:"wallGirt"}];
tests.push({name:"record group mismatch against model blocks demand link",pass:auditDemandLink(model,validPkg).success===false});
if(priorContract===undefined)delete root.SteelColdFormedMemberContract;else root.SteelColdFormedMemberContract=priorContract;
if(priorPkg===undefined)delete root.SteelMemberDesignDemandPackage;else root.SteelMemberDesignDemandPackage=priorPkg;
records=prior;records=prior;render();return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"member-specific persistence and evidence gate only; no resistance design"};}
root.SteelColdFormedMemberRegistry={getData,setData,auditRecord,auditModelCoverage,auditDemandLink,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-design-readiness.js ===== */
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
  groups.forEach(([k,label])=>{const x=d[k]||{};if(x.applyToAll){["Fy","Fu","E_MPa","G_MPa","Kx","Ky","Kz","Lcx","Lcy","Lcz","Lb","Cb"].forEach(f=>{if(!(Number(x[f])>0))issues.push(label+": "+f+" برای تعمیم گروهی ناقص است.");});if(x.Fu<x.Fy)issues.push(label+": Fu از Fy کمتر است.");}if(!(Number(x.t_mm)>0))notes.push(label+": ضخامت اختصاصی ثبت نشده؛ ضخامت عمومی مصالح به ارث می‌رسد و باید یکسان بودن ضخامت اعضای این گروه تأیید شود.");});
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


/* ===== steel2/js/tension-capacity-screen.js ===== */
/* SAHROUD STEEL — provisional tensile resistance screen.
 * Formula transcription is provisional for M10-1401 clauses 10-2-3-3/4.
 * The official issued PDF, amendments and exact tables have NOT been independently
 * verified in this repository. This module is therefore screening-only and must
 * never be treated as an approved design engine.
 */
(function(root){
"use strict";
const finitePositive=v=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const close=(a,b,tol=0.01)=>Math.abs(a-b)<=Math.max(1e-9,Math.abs(b)*tol);
function analyze(input){
 const d=input||{},issues=[],warnings=[];
 if(d.codeBasis!=="M10-1401-provisional")issues.push("مبنای مبحث دهم ۱۴۰۱ به‌صورت صریح انتخاب نشده است.");
 if(d.officialTextVerified===true)warnings.push("پرچم تأیید متن رسمی توسط فراخواننده ثبت شده؛ این ماژول همچنان تأیید مستقل سند/اصلاحیه را انجام نمی‌دهد.");
 else warnings.push("متن رسمی و اصلاحیه‌های مبحث دهم ۱۴۰۱ در این نسخه نرم‌افزار مستقلاً اعتبارسنجی نشده‌اند.");
 if(d.axialOnlyVerified!==true)issues.push("تقاضای عضو صرفاً محوری نیست یا نبود خمش/برش/پیچش در همه ترکیبات اثبات نشده است.");
 ["Ag_cm2","An_cm2","Ae_cm2","U","Fy_MPa","Fu_MPa","demand_kN"].forEach(k=>{if(!finitePositive(d[k]))issues.push(k+" باید مثبت و معتبر باشد.");});
 if(issues.length)return {ok:false,issues,warnings,scope:"provisional-tension-screen-only",designApproved:false};
 const {Ag_cm2:Ag,An_cm2:An,Ae_cm2:Ae,U,Fy_MPa:Fy,Fu_MPa:Fu,demand_kN:demand}=d;
 if(An>Ag)issues.push("سطح خالص An از سطح ناخالص Ag بزرگ‌تر است.");
 if(Ae>An)issues.push("سطح خالص مؤثر Ae از سطح خالص An بزرگ‌تر است.");
 if(U>1)issues.push("ضریب U نباید از ۱ بیشتر باشد.");
 if(Fu<Fy)issues.push("Fu از Fy کمتر است؛ گواهی مصالح بازبینی شود.");
 if(!close(Ae,An*U,0.01))issues.push("Ae با حاصل‌ضرب An×U در تلرانس ۱٪ تطبیق ندارد؛ سطح خالص/ضریب تأخیر برشی بازبینی شود.");
 if(issues.length)return {ok:false,issues,warnings,scope:"provisional-tension-screen-only",designApproved:false};
 // MPa × cm² × 0.1 = kN.
 const nominal={
  grossYield_kN:Fy*Ag*0.1,
  netSectionRupture_kN:Fu*An*0.1,
  effectiveNetRupture_kN:Fu*Ae*0.1
 };
 const states=[
  {key:"grossYield",label:"تسلیم کششی سطح ناخالص",nominal_kN:nominal.grossYield_kN,phi:0.90,Omega:1.67,clause:"10-2-3-4(a)"},
  {key:"netRupture",label:"گسیختگی سطح خالص خارج از ناحیه اتصال",nominal_kN:nominal.netSectionRupture_kN,phi:0.75,Omega:2.00,clause:"10-2-3-4(b)"},
  {key:"effectiveNetRupture",label:"گسیختگی سطح خالص مؤثر در ناحیه اتصال",nominal_kN:nominal.effectiveNetRupture_kN,phi:0.75,Omega:2.00,clause:"10-2-3-4(c)"}
 ].map(x=>({...x,LRFD_kN:x.phi*x.nominal_kN,ASD_kN:x.nominal_kN/x.Omega}));
 const lrfd=states.reduce((a,b)=>a.LRFD_kN<=b.LRFD_kN?a:b),asd=states.reduce((a,b)=>a.ASD_kN<=b.ASD_kN?a:b);
 warnings.push("گسیختگی بلوکی، مقاومت پیچ/جوش و قطعات اتصال‌دهنده، خستگی، تمرکز تنش و اثرات برون‌محوری در این غربال محاسبه نشده‌اند.");
 warnings.push("این غربال فقط برای عضو با رفتار محوری خالص و مقادیر Ag/An/Ae/U مستند است؛ خروجی جایگزین کنترل کامل بند ۱۰-۲-۹ و بررسی مدارک رسمی نیست.");
 return {ok:true,codeBasis:"M10-1401-provisional",nominal,states,LRFD:{governing:lrfd.key,designStrength_kN:lrfd.LRFD_kN,utilization:demand/lrfd.LRFD_kN},ASD:{governing:asd.key,allowableStrength_kN:asd.ASD_kN,utilization:demand/asd.ASD_kN},demand_kN:demand,governingMember:d.governingMember||null,governingCase:d.governingCase||null,governingEnd:d.governingEnd||null,scope:"provisional-tension-screen-only",screeningOnly:true,designApproved:false,warnings,disclaimer:"نتیجه غربال مقدماتی است؛ تا تأیید متن رسمی/اصلاحیه‌ها، کنترل اتصال و بازبینی مهندس مسئول، برای طراحی اجرایی یا صدور نقشه قابل استفاده نیست."};
}
function selfTest(){
 const base={codeBasis:"M10-1401-provisional",axialOnlyVerified:true,Ag_cm2:10,An_cm2:9,Ae_cm2:8.1,U:0.9,Fy_MPa:240,Fu_MPa:360,demand_kN:100};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("calculates all three nominal limit states",()=>{const r=analyze(base);return r.ok&&r.nominal.grossYield_kN===240&&r.nominal.netSectionRupture_kN===324&&r.nominal.effectiveNetRupture_kN===291.6;});
 t("selects the lower LRFD and ASD limit state",()=>{const r=analyze(base);return r.LRFD.governing==="grossYield"&&r.ASD.governing==="grossYield";});
 t("retains exact demand provenance",()=>{const r=analyze({...base,governingMember:"B-1",governingCase:"W+X",governingEnd:"J"});return r.governingMember==="B-1"&&r.governingCase==="W+X"&&r.governingEnd==="J";});
 t("rejects unselected code basis",()=>!analyze({...base,codeBasis:"AISC-360-22"}).ok);
 t("rejects unverified non-axial action",()=>!analyze({...base,axialOnlyVerified:false}).ok);
 t("rejects missing effective area",()=>!analyze({...base,Ae_cm2:null}).ok);
 t("rejects net area greater than gross area",()=>!analyze({...base,An_cm2:11}).ok);
 t("rejects effective area greater than net area",()=>!analyze({...base,Ae_cm2:9.1}).ok);
 t("rejects U greater than one",()=>!analyze({...base,U:1.1}).ok);
 t("rejects inconsistent Ae and An times U",()=>!analyze({...base,Ae_cm2:8.5}).ok);
 t("rejects Fu lower than Fy",()=>!analyze({...base,Fu_MPa:200}).ok);
 t("never grants design approval",()=>{const r=analyze(base);return r.ok&&r.screeningOnly===true&&r.designApproved===false;});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"provisional formula-screen regression only; no official code validation or engineering approval"};
}
root.SteelTensionCapacityScreen={analyze,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tension-design-readiness.js ===== */
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
function isDocumentedAxialConnection(d){return d?.eccentricity_mm===0;}
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
  if(d.eccentricity_mm===null||d.eccentricity_mm===undefined)local.push("خروج از مرکزیت اتصال باید مشخص شود؛ مقدار صفر فقط با مستندات هم‌محوری وارد شود.");
  else if(!isDocumentedAxialConnection(d))local.push("خروج از مرکزیت اتصال غیرصفر است؛ غربال کشش محوری کافی نیست و اندرکنش کشش و خمش لازم است.");
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
  const capacityScreen=demandBridge.ready?root.SteelTensionCapacityScreen?.analyze?.({codeBasis:"M10-1401-provisional",officialTextVerified:false,axialOnlyVerified:demandBridge.axialOnly===true&&isDocumentedAxialConnection(d),Ag_cm2:d.Ag_cm2,An_cm2:d.An_cm2,Ae_cm2:d.Ae_cm2,U:d.U,Fy_MPa:Number(mat.Fy),Fu_MPa:Number(mat.Fu),demand_kN:demandBridge.forceDemandKN,governingMember:demandBridge.governing?.memberId,governingCase:demandBridge.governing?.caseLabel,governingEnd:demandBridge.governing?.end}):null;
  groups[g]={label,complete:local.length===0,issues:local,connectionType:d.connectionType,Ag_cm2:d.Ag_cm2,An_cm2:d.An_cm2,Ae_cm2:d.Ae_cm2,U:d.U,forceDemandKN:manualDemand??(demandBridge.ready?demandBridge.forceDemandKN:null),computedForceDemandKN:demandBridge.forceDemandKN,demandSource:demandBridge.ready?demandBridge.source:null,demandMemberCount:demandBridge.memberCount,demandCaseCount:demandBridge.caseCount,governingTension:demandBridge.governing,capacityScreen:capacityScreen||{ok:false,issues:["موتور غربال ظرفیت یا تقاضای FEM معتبر در دسترس نیست."],designApproved:false}};
  local.forEach(x=>issues.push(label+": "+x));
 });
 const connectionAudit=root.SteelBraceConnectionReadiness?.audit?.();
 if(connectionAudit&&connectionAudit.braceMemberCount>0)connectionAudit.issues.forEach(x=>issues.push("ممیزی اتصال مهاربند: "+x));
 return {schemaVersion:1,readyForDataReview:issues.length===0,issues,warnings,groups,connectionAudit,
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
 host.innerHTML="<h4>"+(r.readyForDataReview?"داده‌های اولیه تکمیل شده‌اند؛ کنترل‌های اتصال همچنان باید مستقل تکمیل شوند":"ورودی‌های ناقص برای طراحی کششی")+"</h4><h4>بیشینه تقاضای کششی استخراج‌شده از FEM</h4><ul>"+demandRows+"</ul><h4>غربال مقدماتی مقاومت کششی — غیرنهایی</h4><ul>"+screenRows+"</ul>"+(r.issues.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>کمبود اجباری در این ممیزی شناسایی نشد.</p>")+(r.warnings.length?"<h4>هشدارها</h4><ul>"+r.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+(r.connectionAudit?("<h4>وضعیت اتصالات دو انتهای مهاربندها</h4><p>اتصالات مورد انتظار: "+r.connectionAudit.expectedConnectionCount+"؛ رکورد ثبت‌شده: "+r.connectionAudit.recordCount+"؛ وضعیت: "+(r.connectionAudit.ready?"کفایت داده‌ها":"ناقص")+"</p>"):"")+"<div class='notice'>"+esc(r.note)+"<br>"+esc(r.disclaimer)+"</div>";
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
 t("requires explicit documented zero connection eccentricity",()=>isDocumentedAxialConnection({eccentricity_mm:0})&&!isDocumentedAxialConnection({eccentricity_mm:null})&&!isDocumentedAxialConnection({eccentricity_mm:5}));
 root.SteelMemberForceEnvelope=saved.env;root.SteelStructuralModel=saved.model;
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"automatic tensile demand extraction from complete FEM cases only; no tensile resistance or connection design"};
}
root.SteelTensionDesignReadiness={getData,setData,readUI,audit,extractGroupTensionDemand,selfTest,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/brace-connection-readiness.js ===== */
/* SAHROUD STEEL — brace-end connection geometry and documentation readiness.
 * Captures connection-specific geometry only. No Whitmore, bolt, weld, block-shear,
 * bearing, tear-out, gusset buckling, or connection resistance is calculated here.
 */
(function(root){
"use strict";
const GROUPS=new Set(["roofBrace","wallBrace"]);
const COMMON=[
 ["plateThicknessMm","ضخامت گاست‌پلیت (mm)"],["connectedThicknessMm","ضخامت عضو متصل (mm)"],
 ["whitmoreWidthMm","عرض Whitmore مستند از نقشه (mm)"],
 ["grossShearAreaMm2","سطح ناخالص مسیر برشی Agv (mm²)"],
 ["netShearAreaMm2","سطح خالص مسیر برشی Anv (mm²)"],
 ["netTensionAreaMm2","سطح خالص مسیر کششی Ant (mm²)"],
 ["eccentricityMm","خروج از مرکزیت اتصال (mm)"],
 ["plateFyMPa","تنش تسلیم ورق گاست Fy (MPa)"],["plateFuMPa","تنش نهایی ورق گاست Fu (MPa)"],["blockShearUbs","ضریب Ubs بلوکی (فقط 0.5 یا 1)"]
];
const BOLTED=[
 ["boltCount","تعداد پیچ"],["boltDiameterMm","قطر اسمی پیچ (mm)"],["holeDiameterMm","قطر سوراخ (mm)"],["boltAbMm2","سطح اسمی بدنه پیچ Ab (mm²)"],["boltFntMPa","Fnt پیچ (MPa)"],["boltFnvMPa","Fnv پیچ (MPa)"],["connectedFuMPa","Fu ورق متصل (MPa)"],["boltHoleType","نوع سوراخ (فعلاً standard)"],["boltConnectionType","نوع اتصال پیچ (فقط bearing-type)"],["deformationAtServiceLoad","تغییرشکل سوراخ در سرویس: yes/no"],["boltCaseDemandsJson","توزیع نیروهای هر پیچ در هر ترکیب (JSON)"],
 ["edgeDistanceMm","فاصله لبه (mm)"],["pitchMm","گام پیچ (mm)"],["gageMm","فاصله ردیف‌ها (mm)"],
 ["shearPlaneCount","تعداد صفحات برش"],["boltGrade","گرید/رده پیچ"]
];
const WELDED=[
 ["weldCount","تعداد خطوط/قطعات جوش"],["weldSizeMm","اندازه جوش (mm)"],
 ["weldEffectiveLengthMm","طول مؤثر جوش (mm)"],["electrodeFexxMPa","مقاومت Fexx الکترود (MPa)"],["baseMetalFyMPa","Fy فلز پایه جوش (MPa)"],["baseMetalFuMPa","Fu فلز پایه جوش (MPa)"],["weldCaseDemandsJson","نیروی هر قطعه جوش و مساحت‌های فلز پایه (JSON)"]
];
const BOOLS=["loadPathReviewed","blockShearGeometryReviewed","whitmoreGeometryReviewed","connectionDrawingReviewed","boltPryingIncluded"];
const TEXT_FIELDS=new Set(["boltGrade","boltHoleType","boltConnectionType","deformationAtServiceLoad","boltCaseDemandsJson","weldLayoutReference","weldCaseDemandsJson"]);
let data={schemaVersion:1,connections:[]};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=(id,end)=>String(id)+"::"+end;
function numberOrNull(v){if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function normalize(value){
 const rows=Array.isArray(value?.connections)?value.connections:[];
 return {schemaVersion:1,connections:rows.map(r=>{
  const x={memberId:String(r?.memberId??""),end:r?.end==="J"?"J":"I",connectionType:["bolted","welded"].includes(r?.connectionType)?r.connectionType:"",drawingReference:String(r?.drawingReference??"")};
  [...COMMON.map(a=>a[0]),...BOLTED.map(a=>a[0]),...WELDED.map(a=>a[0])].filter(k=>!TEXT_FIELDS.has(k)).forEach(k=>x[k]=numberOrNull(r?.[k]));
  TEXT_FIELDS.forEach(k=>x[k]=String(r?.[k]??""));
  x.boltGrade=String(r?.boltGrade??"");x.weldLayoutReference=String(r?.weldLayoutReference??"");
  BOOLS.forEach(k=>x[k]=r?.[k]===true);
  x.threadsInShearPlane=[true,false].includes(r?.threadsInShearPlane)?r.threadsInShearPlane:null;
  return x;
 })};
}
function getData(){return JSON.parse(JSON.stringify(data));}
function setData(v){data=normalize(v);render();}
function currentBraceMembers(model){
 const m=model||root.SteelStructuralModel?.getData?.();
 return Array.isArray(m?.members)?m.members.filter(x=>GROUPS.has(x.sectionKey)&&String(x.id??"").trim()):[];
}
function blank(memberId,end){return {memberId:String(memberId),end,connectionType:"",drawingReference:"",plateThicknessMm:null,connectedThicknessMm:null,whitmoreWidthMm:null,grossShearAreaMm2:null,netShearAreaMm2:null,netTensionAreaMm2:null,eccentricityMm:null,plateFyMPa:null,plateFuMPa:null,blockShearUbs:null,boltCount:null,boltDiameterMm:null,holeDiameterMm:null,boltAbMm2:null,boltFntMPa:null,boltFnvMPa:null,connectedFuMPa:null,boltHoleType:"",boltConnectionType:"",deformationAtServiceLoad:"",boltCaseDemandsJson:"",edgeDistanceMm:null,pitchMm:null,gageMm:null,shearPlaneCount:null,boltGrade:"",threadsInShearPlane:null,weldCount:null,weldSizeMm:null,weldEffectiveLengthMm:null,electrodeFexxMPa:null,baseMetalFyMPa:null,baseMetalFuMPa:null,weldCaseDemandsJson:"",weldLayoutReference:"",loadPathReviewed:false,blockShearGeometryReviewed:false,whitmoreGeometryReviewed:false,connectionDrawingReviewed:false};}
function rowsForModel(model){
 const rows=new Map(data.connections.map(r=>[key(r.memberId,r.end),r]));
 return currentBraceMembers(model).flatMap(m=>["I","J"].map(end=>rows.get(key(m.id,end))||blank(m.id,end)));
}
function audit(input,model){
 const src=normalize(input||data),members=currentBraceMembers(model),issues=[],warnings=[],rows=[],expected=new Set();
 const memberIds=new Set();
 members.forEach(m=>{const id=String(m.id);if(memberIds.has(id))issues.push("شناسه عضو مهاربند تکراری است: "+id);memberIds.add(id);["I","J"].forEach(end=>expected.add(key(id,end)));});
 const seen=new Set();
 src.connections.forEach((c,i)=>{
  const k=key(c.memberId,c.end),local=[];
  if(!c.memberId.trim())local.push("شناسه عضو خالی است.");
  if(!["I","J"].includes(c.end))local.push("انتهای اتصال باید I یا J باشد.");
  if(seen.has(k))local.push("برای این عضو و انتها بیش از یک رکورد اتصال ثبت شده است.");
  seen.add(k);
  if(!expected.has(k))local.push("این اتصال به مهاربند فعال مدل جاری تعلق ندارد یا شناسه آن تغییر کرده است.");
  if(!["bolted","welded"].includes(c.connectionType))local.push("نوع اتصال پیچی یا جوشی مشخص نشده است.");
  if(!c.drawingReference.trim())local.push("شماره نقشه/جزئیات اجرایی اتصال ثبت نشده است.");
  for(const [field,label] of COMMON){if(field==="eccentricityMm"){if(!Number.isFinite(c[field])||c[field]<0)local.push(label+" باید از نقشه وارد شود و غیرمنفی باشد.");}else if(!Number.isFinite(c[field])||c[field]<=0)local.push(label+" باید از نقشه وارد شود.");}
  if(c.netShearAreaMm2>0&&c.grossShearAreaMm2>0&&c.netShearAreaMm2>c.grossShearAreaMm2)local.push("سطح خالص برشی از سطح ناخالص برشی بزرگ‌تر است.");
  if(![0.5,1].includes(c.blockShearUbs))local.push("Ubs باید با توزیع تنش مستند و فقط برابر 0.5 یا 1 باشد.");
  if(!c.loadPathReviewed)local.push("مسیر انتقال نیرو از عضو به گاست‌پلیت و تکیه‌گاه بازبینی نشده است.");
  if(!c.whitmoreGeometryReviewed)local.push("هندسه و عرض Whitmore از نقشه/محاسبه مستند بازبینی نشده است.");
  if(!c.blockShearGeometryReviewed)local.push("مسیرهای سطح گسیختگی بلوکی و مساحت‌های مربوط بازبینی نشده‌اند.");
  if(!c.connectionDrawingReviewed)local.push("نقشه جزئیات اتصال و تطبیق با مدل تأیید نشده است.");
  if(c.connectionType==="bolted"){
   for(const [field,label] of BOLTED){if(TEXT_FIELDS.has(field)?!String(c[field]||"").trim():!(Number.isFinite(c[field])&&c[field]>0))local.push(label+" برای اتصال پیچی لازم است.");}
   ["boltCount","shearPlaneCount"].forEach(k=>{if(Number.isFinite(c[k])&&!Number.isInteger(c[k]))local.push(k+" باید عدد صحیح باشد.");});
   if(c.boltDiameterMm>0&&c.holeDiameterMm>0&&c.holeDiameterMm<c.boltDiameterMm)local.push("قطر سوراخ از قطر پیچ کوچک‌تر ثبت شده است؛ ورودی بازبینی شود.");
   if(c.threadsInShearPlane===null)local.push("وضعیت قرارگیری رزوه در صفحه برش مشخص نشده است.");
   if(c.boltConnectionType!=="bearing-type")local.push("نوع اتصال باید bearing-type باشد؛ اتصال slip-critical در این موتور کنترل نمی‌شود.");
   if(!c.boltPryingIncluded)local.push("اثر prying باید در تقاضای کشش پیچ لحاظ یا عدم نیاز آن مستند شود.");
  }
  if(c.connectionType==="welded"){
   for(const [field,label] of WELDED)if(TEXT_FIELDS.has(field)?!String(c[field]||"").trim():!(Number.isFinite(c[field])&&c[field]>0))local.push(label+" برای اتصال جوشی لازم است.");
   if(Number.isFinite(c.weldCount)&&!Number.isInteger(c.weldCount))local.push("تعداد خطوط/قطعات جوش باید عدد صحیح باشد.");
   if(!String(c.weldLayoutReference||"").trim())local.push("آرایش و طول‌بندی جوش باید با شماره نقشه/مدرک مشخص شود.");
  }
  const row={memberId:c.memberId,end:c.end,connectionType:c.connectionType,complete:local.length===0,issues:local};
  rows.push(row);local.forEach(x=>issues.push(c.memberId+" / "+c.end+": "+x));
 });
 expected.forEach(k=>{if(!seen.has(k))issues.push("اتصال انتهای "+k.replace("::"," / ")+" در ورودی‌ها ثبت نشده است.");});
 if(!members.length)warnings.push("در مدل جاری مهاربند سقف/دیوار شناسایی نشد؛ ابتدا مدل سه‌بعدی را بسازید.");
 return {schemaVersion:1,ready:issues.length===0&&members.length>0,braceMemberCount:members.length,expectedConnectionCount:expected.size,recordCount:src.connections.length,rows,issues,warnings,scope:"connection geometry/documentation readiness only",analysisEnabled:false,designApproved:false,limitations:["ظرفیت پیچ، برش/کشش پیچ، bearing، tear-out، لغزش و اثر رزوه محاسبه نشده است.","ظرفیت جوش، فلز جوش و فلز پایه محاسبه نشده است.","گاست‌پلیت: تسلیم، گسیختگی، کمانش، Whitmore yielding/rupture و block shear محاسبه نشده‌اند.","هیچ ضریب یا حداقل فاصله آیین‌نامه‌ای در این ممیزی فرض نشده؛ مقادیر باید از نقشه و متن معتبر ضابطه استخراج شوند."]};
}
function render(){
 const host=$("braceConnectionReadinessContent");if(!host)return;
 const rows=rowsForModel(),fields=[...COMMON,...BOLTED,...WELDED];
 host.innerHTML='<div class="notice">برای هر مهاربند، اتصال انتهای I و J جداگانه ثبت شود. همه مقادیر از نقشه مصوب/جزئیات واقعی برداشت شوند؛ این صفحه ظرفیت یا قبولی اتصال را محاسبه نمی‌کند.</div><div style="overflow-x:auto"><table class="data-table" style="min-width:1700px;width:100%"><thead><tr><th>عضو</th><th>انتها</th><th>نوع اتصال</th>'+fields.map(x=>'<th>'+x[1]+'</th>').join("")+'<th>رزوه در صفحه برش</th><th>مرجع آرایش جوش</th><th>مرجع نقشه</th>'+BOOLS.map(k=>'<th>'+({loadPathReviewed:"مسیر نیرو",blockShearGeometryReviewed:"مسیر بلوکی",whitmoreGeometryReviewed:"Whitmore",connectionDrawingReviewed:"تطبیق نقشه",boltPryingIncluded:"اثر prying در تقاضای پیچ"}[k])+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.memberId)+'</td><td>'+r.end+'</td><td><select data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="connectionType"><option value="">انتخاب</option><option value="bolted" '+(r.connectionType==="bolted"?"selected":"")+'>پیچی</option><option value="welded" '+(r.connectionType==="welded"?"selected":"")+'>جوشی</option></select></td>'+fields.map(([k])=>'<td><input data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="'+k+'" '+(TEXT_FIELDS.has(k)?"type=text":"type=number step=any")+' value="'+esc(r[k]??"")+'" style="width:'+(k.includes('Json')?260:TEXT_FIELDS.has(k)?130:100)+'px"></td>').join("")+'<td><select data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="threadsInShearPlane"><option value="">نامشخص</option><option value="true" '+(r.threadsInShearPlane===true?"selected":"")+'>بله</option><option value="false" '+(r.threadsInShearPlane===false?"selected":"")+'>خیر</option></select></td><td><input data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="weldLayoutReference" value="'+esc(r.weldLayoutReference)+'"></td><td><input data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="drawingReference" value="'+esc(r.drawingReference)+'"></td>'+BOOLS.map(k=>'<td><input type="checkbox" data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="'+k+'" '+(r[k]?"checked":"")+'></td>').join("")+'</tr>').join("")+'</tbody></table></div><div class="button-grid"><button type="button" class="btn secondary" id="btnBraceConnectionRefresh">به‌روزرسانی اعضا از مدل</button><button type="button" class="btn secondary" id="btnBraceConnectionAudit">ممیزی اتصالات دو انتهای مهاربندها</button></div><div id="braceConnectionResult" class="notice">برای هر ترکیب، JSON توزیع نیروی هر پیچ/قطعه جوش را وارد کنید. مثال پیچ: {"ULS-1":[{"transferN":10000,"tensionN":6000,"shearPerPlaneN":8000,"clearDistanceMm":30}]}. مثال جوش: {"ULS-1":[{"transferN":10000,"shearN":10000,"effectiveLengthMm":100,"baseGrossShearAreaMm2":500,"baseNetShearAreaMm2":450}]}. مجموع transferN باید با تقاضای FEM همان انتها برابر باشد. ابتدا مدل سه‌بعدی را بسازید.</div>';
 host.querySelectorAll("[data-field]").forEach(el=>el.addEventListener("change",()=>{const id=el.dataset.id,end=el.dataset.end,field=el.dataset.field;let r=data.connections.find(x=>x.memberId===id&&x.end===end);if(!r){r=blank(id,end);data.connections.push(r);}if(el.type==="checkbox")r[field]=el.checked;else if(field==="threadsInShearPlane")r[field]=el.value===""?null:el.value==="true";else if(["boltGrade","weldLayoutReference","drawingReference","connectionType"].includes(field))r[field]=el.value;else r[field]=numberOrNull(el.value);}));
 $("btnBraceConnectionRefresh").addEventListener("click",()=>render());
 $("btnBraceConnectionAudit").addEventListener("click",()=>{const r=audit(data);const out=$("braceConnectionResult");out.innerHTML='<strong>'+(r.ready?"تمام اتصال‌های دو انتهای مهاربندها دارای داده‌های موردنیاز این ممیزی هستند.":"ممیزی اتصال ناقص است.")+'</strong><p>اعضای مهاربند: '+r.braceMemberCount+' | اتصالات مورد انتظار: '+r.expectedConnectionCount+' | رکوردهای ثبت‌شده: '+r.recordCount+'</p>'+(r.issues.length?'<ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+'<p>هیچ ظرفیت یا تأیید طراحی صادر نشده است.</p>';});
}
function init(){if($("braceConnectionReadinessPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="braceConnectionReadinessPanel";p.innerHTML="<div class='panel-title'><h3>جزئیات اتصالات مهاربندها — گاست‌پلیت، پیچ و جوش</h3><span class='status'>ممیزی هندسه و مدارک</span></div><div id='braceConnectionReadinessContent'></div>";const anchor=$("tensionDesignReadinessPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);render();}
function selfTest(){
 const base={memberId:"B1",end:"I",connectionType:"bolted",drawingReference:"D-01",plateThicknessMm:10,connectedThicknessMm:8,whitmoreWidthMm:150,grossShearAreaMm2:1500,netShearAreaMm2:1200,netTensionAreaMm2:600,eccentricityMm:0,plateFyMPa:235,plateFuMPa:360,blockShearUbs:1,boltCount:4,boltDiameterMm:20,holeDiameterMm:22,edgeDistanceMm:35,pitchMm:60,gageMm:50,shearPlaneCount:1,boltGrade:"8.8",boltAbMm2:245,boltFntMPa:620,boltFnvMPa:372,connectedFuMPa:360,boltHoleType:"standard",boltConnectionType:"bearing-type",deformationAtServiceLoad:"yes",boltCaseDemandsJson:"{}",threadsInShearPlane:false,loadPathReviewed:true,blockShearGeometryReviewed:true,whitmoreGeometryReviewed:true,connectionDrawingReviewed:true,boltPryingIncluded:true};
 const model={members:[{id:"B1",sectionKey:"roofBrace"}]},both=[{...base,end:"I"},{...base,end:"J"}],tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("accepts complete two-end bolted connection records as data-ready only",()=>{const r=audit({connections:both},model);return r.ready&&r.expectedConnectionCount===2&&r.designApproved===false&&r.analysisEnabled===false;});
 t("requires both brace ends",()=>!audit({connections:[both[0]]},model).ready);
 t("rejects duplicate member-end records",()=>!audit({connections:[...both,{...base,end:"I"}]},model).ready);
 t("rejects connection record for non-model member",()=>!audit({connections:[...both,{...base,memberId:"OLD",end:"I"}]},model).ready);
 t("requires drawing reference",()=>!audit({connections:both.map(x=>({...x,drawingReference:""}))},model).ready);
 t("requires Whitmore width and documented review",()=>!audit({connections:both.map(x=>({...x,whitmoreWidthMm:null,whitmoreGeometryReviewed:false}))},model).ready);
 t("rejects net shear area above gross shear area",()=>!audit({connections:both.map(x=>({...x,netShearAreaMm2:1600}))},model).ready);
 t("requires block shear geometry review",()=>!audit({connections:both.map(x=>({...x,blockShearGeometryReviewed:false}))},model).ready);
 t("requires explicit load path review",()=>!audit({connections:both.map(x=>({...x,loadPathReviewed:false}))},model).ready);
 t("requires bolted geometry and bolt grade",()=>!audit({connections:both.map(x=>({...x,boltGrade:"",holeDiameterMm:null}))},model).ready);
 t("rejects hole smaller than bolt diameter",()=>!audit({connections:both.map(x=>({...x,holeDiameterMm:18}))},model).ready);
 t("requires threads-in-shear-plane declaration",()=>!audit({connections:both.map(x=>({...x,threadsInShearPlane:null}))},model).ready);
 t("requires welded size length and electrode strength",()=>{const r=audit({connections:both.map(x=>({...x,connectionType:"welded",weldCount:2,weldSizeMm:6,weldEffectiveLengthMm:120,electrodeFexxMPa:490,baseMetalFyMPa:235,baseMetalFuMPa:360,weldCaseDemandsJson:"{}",weldLayoutReference:"W-02"}))},model);return r.ready;});
 t("requires welded layout reference",()=>!audit({connections:both.map(x=>({...x,connectionType:"welded",weldCount:2,weldSizeMm:6,weldEffectiveLengthMm:120,electrodeFexxMPa:490,baseMetalFyMPa:235,baseMetalFuMPa:360,weldCaseDemandsJson:"{}",weldLayoutReference:""}))},model).ready);
 t("rejects missing eccentricity",()=>!audit({connections:both.map(x=>({...x,eccentricityMm:null}))},model).ready);
 t("requires explicit plate material strengths and block-shear Ubs",()=>!audit({connections:both.map(x=>({...x,plateFyMPa:null,plateFuMPa:null,blockShearUbs:null}))},model).ready);
 t("rejects unsupported block-shear Ubs",()=>!audit({connections:both.map(x=>({...x,plateFyMPa:235,plateFuMPa:360,blockShearUbs:0.75}))},model).ready);
 t("never issues capacity or approval",()=>{const r=audit({connections:both},model);return r.analysisEnabled===false&&r.designApproved===false&&!r.capacity;});
 t("connection records survive project data round-trip",()=>{const old=getData();setData({connections:both});const x=getData(),ok=x.connections.length===2&&x.connections[0].memberId==="B1"&&x.connections[1].end==="J"&&x.connections[0].boltCaseDemandsJson==="{}"&&x.connections[0].boltConnectionType==="bearing-type"&&x.connections[0].boltPryingIncluded===true;setData(old);return ok;});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"brace-end connection geometry and document completeness only; no code resistance calculation"};
}
root.SteelBraceConnectionReadiness={getData,setData,readUI:getData,audit,render,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/brace-gusset-strength-screen.js ===== */
/* SAHROUD STEEL — restricted gusset plate resistance screen.
 * Provisional reference basis: ANSI/AISC 360-22 J4-1 and J4-5.
 * This is NOT a declaration of compliance with Iranian M10. Only concentric axial
 * tension is screened; no eccentric, compression, bolt, weld, rupture, or buckling design.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
function calculate(connection,demand){
 const issues=[];
 const req=["plateThicknessMm","whitmoreWidthMm","grossShearAreaMm2","netShearAreaMm2","netTensionAreaMm2","plateFyMPa","plateFuMPa","blockShearUbs","eccentricityMm"];
 ["loadPathReviewed","whitmoreGeometryReviewed","blockShearGeometryReviewed","connectionDrawingReviewed"].forEach(k=>{if(connection[k]!==true)issues.push("بازبینی مستند "+k+" انجام نشده است.");});
 if(!String(connection.drawingReference||"").trim())issues.push("مرجع نقشه اتصال ثبت نشده است.");
 req.forEach(k=>{if(!finite(connection[k]))issues.push("ورودی "+k+" ناموجود/نامعتبر است.");});
 if(issues.length)return {ok:false,issues};
 if(connection.eccentricityMm!==0)issues.push("خروج از مرکزیت غیرصفر است؛ این غربال محوری و بدون لنگر قابل استفاده نیست.");
 if(connection.plateThicknessMm<=0||connection.whitmoreWidthMm<=0||connection.plateFyMPa<=0||connection.plateFuMPa<=0||connection.grossShearAreaMm2<=0||connection.netShearAreaMm2<=0||connection.netTensionAreaMm2<=0)issues.push("ابعاد، مساحت‌ها یا خواص مصالح باید مثبت باشند.");
 if(connection.plateFuMPa<connection.plateFyMPa)issues.push("Fu ورق از Fy کمتر است؛ داده مصالح بازبینی شود.");
 if(connection.netShearAreaMm2>connection.grossShearAreaMm2)issues.push("Anv از Agv بیشتر است.");
 if(![0.5,1].includes(connection.blockShearUbs))issues.push("Ubs باید 0.5 یا 1 و بر اساس توزیع تنش مستند باشد.");
 if(!finite(demand)||demand<0)issues.push("تقاضای کششی همان انتها/ترکیب معتبر نیست.");
 if(issues.length)return {ok:false,issues};
 const Agw=connection.plateThicknessMm*connection.whitmoreWidthMm;
 const whitmoreYield=0.90*connection.plateFyMPa*Agw;
 const termShearRupture=0.60*connection.plateFuMPa*connection.netShearAreaMm2;
 const termShearYield=0.60*connection.plateFyMPa*connection.grossShearAreaMm2;
 const termTension=connection.blockShearUbs*connection.plateFuMPa*connection.netTensionAreaMm2;
 const blockShear=0.75*Math.min(termShearRupture+termTension,termShearYield+termTension);
 const uW=whitmoreYield>0?demand/whitmoreYield:Infinity;
 const uB=blockShear>0?demand/blockShear:Infinity;
 return {ok:true,demandN:demand,whitmore:{grossAreaMm2:Agw,availableN:whitmoreYield,utilization:uW},blockShear:{ruptureBranchN:0.75*(termShearRupture+termTension),yieldBranchN:0.75*(termShearYield+termTension),availableN:blockShear,utilization:uB},governing:uW>=uB?"Whitmore tensile yielding":"Block shear",maxUtilization:Math.max(uW,uB),basis:"AISC 360-22 J4-1, J4-5 (provisional reference only)",designApproved:false};
}
function analyze(envelope,model,connectionData){
 const modelNow=model||root.SteelStructuralModel?.getData?.();
 const connections=Array.isArray(connectionData?.connections)?connectionData.connections:[];
 const demandAudit=root.SteelBraceForceDemandAudit?.audit?.(envelope,modelNow);
 const issues=[];
 if(!demandAudit)issues.push("ماژول استخراج تقاضای مهاربند در دسترس نیست.");
 else if(!demandAudit.success)issues.push(...demandAudit.issues);
 const expected=(modelNow?.members||[]).filter(m=>m.sectionKey==="roofBrace"||m.sectionKey==="wallBrace");
 const map=new Map(connections.map(c=>[String(c.memberId)+"::"+c.end,c]));
 const rows=[];
 if(!expected.length)issues.push("مهاربند فعالی در مدل جاری شناسایی نشد.");
 if(!envelope)issues.push("پوش نیروی تازه در دسترس نیست؛ تحلیل تمام ترکیبات را اجرا کنید.");
 if(issues.length)return {success:false,issues,rows,analysisEnabled:false,designApproved:false};
 demandAudit.rows.forEach(brace=>{
  ["I","J"].forEach(end=>{
   const c=map.get(brace.memberId+"::"+end);
   if(!c){issues.push("داده اتصال "+brace.memberId+" / "+end+" موجود نیست.");return;}
   brace.simultaneousDemands.forEach(d=>{
    const tension=end==="I"?d.endI_tension_N:d.endJ_tension_N;
    const compression=end==="I"?d.endI_compression_N:d.endJ_compression_N;
    const r=calculate(c,tension);
    rows.push({memberId:brace.memberId,end,caseLabel:d.caseLabel,tensionDemandN:tension,compressionDemandN:compression,...r});
   });
  });
 });
 const incomplete=rows.filter(r=>!r.ok);
 if(incomplete.length)issues.push("برخی اتصال‌ها به علت داده ناکافی یا خروج از دامنه، قابل محاسبه نیستند.");
 const completed=rows.filter(r=>r.ok);
 return {success:issues.length===0&&completed.length===expected.length*2*demandAudit.expectedCaseCount,issues,rows,completedCount:completed.length,expectedCount:expected.length*2*demandAudit.expectedCaseCount,analysisEnabled:false,designApproved:false,limitations:[
 "فقط تسلیم کششی مقطع Whitmore با Ag=t×b و گسیختگی بلوکی با Agv/Anv/Ant واردشده از نقشه غربال می‌شوند.",
 "عرض Whitmore و سطوح Agv/Anv/Ant ورودی‌های مستند نقشه‌اند؛ نرم‌افزار هندسه مسیر شکست یا سوراخ‌ها را مستقلاً استخراج/تأیید نمی‌کند.",
 "گسیختگی کششی مقطع خالص Whitmore، کمانش گاست‌پلیت، فشار، لنگر/خروج از مرکزیت، اندرکنش، پیچ، جوش، bearing و tear-out در این مرحله محاسبه نمی‌شوند.",
 "مبنای AISC 360-22 است و تا تطبیق بندبه‌بند با مبحث دهم ایران، خروجی صرفاً غربال مقدماتی است."
 ]};
}
function renderResult(r){
 const host=$("braceGussetStrengthResult");if(!host)return;
 const rows=r.rows||[];
 host.innerHTML='<strong>'+(r.success?"محاسبات غربال برای همه انتهاها و ترکیبات دارای داده کامل انجام شد.":"غربال ناقص/مسدود است.")+'</strong>'+
 '<p>موارد محاسبه‌شده: '+(r.completedCount||0)+' از '+(r.expectedCount||0)+'</p>'+
 (rows.length?'<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>عضو</th><th>انتها</th><th>ترکیب</th><th>کشش kN</th><th>فشار kN (کنترل‌نشده)</th><th>Whitmore φRn kN</th><th>Block shear φRn kN</th><th>نسبت حاکم</th><th>حالت حاکم</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.memberId)+'</td><td>'+x.end+'</td><td>'+esc(x.caseLabel)+'</td><td>'+(finite(x.tensionDemandN)?(x.tensionDemandN/1000).toFixed(3):"—")+'</td><td>'+(finite(x.compressionDemandN)?(x.compressionDemandN/1000).toFixed(3):"—")+'</td><td>'+(x.ok?(x.whitmore.availableN/1000).toFixed(3):"—")+'</td><td>'+(x.ok?(x.blockShear.availableN/1000).toFixed(3):"—")+'</td><td>'+(x.ok?x.maxUtilization.toFixed(3):"—")+'</td><td>'+(x.ok?x.governing:esc((x.issues||[]).join("؛ ")))+'</td></tr>').join("")+'</tbody></table></div>':"")+
 (r.issues?.length?'<ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+
 '<p><strong>محدودیت:</strong> این خروجی تأیید طراحی نیست. فشار مهاربند، لنگر، کمانش گاست و سایر اجزای اتصال هنوز کنترل نشده‌اند.</p>'+
 '<ul>'+((r.limitations)||[]).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>';
}
function run(){
 const envelope=root.SteelMemberForceEnvelope?.getLast?.();
 const model=root.SteelStructuralModel?.getData?.();
 const conn=root.SteelBraceConnectionReadiness?.getData?.();
 const r=analyze(envelope,model,conn);
 renderResult(r);
 return r;
}
function init(){
 if($("braceGussetStrengthPanel"))return;
 const anchor=$("braceConnectionReadinessPanel"),main=document.querySelector("main");
 if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="braceGussetStrengthPanel";
 p.innerHTML="<div class='panel-title'><h3>غربال مقاومت گاست‌پلیت مهاربند — Whitmore و Block Shear</h3><span class='status'>AISC 360-22 · مقدماتی</span></div><div class='notice'>ابتدا تحلیل همه ترکیبات بار را اجرا کنید. Fy، Fu، عرض Whitmore، Agv، Anv و Ant باید برای هر انتهای اتصال از مصالح و نقشه مستند وارد شوند. فقط کشش محوری با خروج از مرکزیت صفر بررسی می‌شود.</div><div class='button-grid'><button type='button' class='btn primary' id='btnBraceGussetStrengthRun'>محاسبه غربال گاست‌پلیت برای همه ترکیبات</button></div><div id='braceGussetStrengthResult' class='notice'>هنوز محاسبه‌ای اجرا نشده است.</div>";
 if(anchor?.parentNode)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 $("btnBraceGussetStrengthRun").addEventListener("click",run);
}
function selfTest(){
 const c={plateThicknessMm:10,whitmoreWidthMm:150,grossShearAreaMm2:1500,netShearAreaMm2:1200,netTensionAreaMm2:600,plateFyMPa:235,plateFuMPa:360,blockShearUbs:1,eccentricityMm:0,drawingReference:"D-01",loadPathReviewed:true,whitmoreGeometryReviewed:true,blockShearGeometryReviewed:true,connectionDrawingReviewed:true};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("Whitmore tensile yielding uses phi 0.90 Fy Ag",()=>{const r=calculate(c,100000);return r.ok&&Math.abs(r.whitmore.availableN-317250)<1e-6;});
 t("block shear uses J4-5 minimum of rupture and yielding branches",()=>{const r=calculate(c,100000);return r.ok&&Math.abs(r.blockShear.availableN-0.75*Math.min(0.6*360*1200+360*600,0.6*235*1500+360*600))<1e-6;});
 t("Ubs 0.5 is accepted when explicitly selected",()=>calculate({...c,blockShearUbs:0.5},100000).ok);
 t("unsupported Ubs is rejected",()=>!calculate({...c,blockShearUbs:0.75},100000).ok);
 t("nonzero eccentricity blocks axial-only screen",()=>!calculate({...c,eccentricityMm:5},100000).ok);
 t("missing material strength blocks result",()=>!calculate({...c,plateFyMPa:null},100000).ok);
 t("Fu below Fy is rejected",()=>!calculate({...c,plateFuMPa:200},100000).ok);
 t("net shear area above gross is rejected",()=>!calculate({...c,netShearAreaMm2:1600},100000).ok);
 t("negative demand is rejected",()=>!calculate(c,-1).ok);
 t("no approval is emitted",()=>calculate(c,100000).designApproved===false);
 t("N to MPa-mm2 dimensional consistency",()=>{const r=calculate(c,0);return r.ok&&r.whitmore.availableN===317250;});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"restricted axial-tension plate resistance screen; not final design or Iranian code certification"};
}
root.SteelBraceGussetStrengthScreen={calculate,analyze,run,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/brace-bolt-strength-screen.js ===== */
/* SAHROUD STEEL — AISC 360-22 J3 restricted bolt resistance screen.
 * Per-fastener demands must be supplied explicitly for every load case. No assumed
 * group distribution. LRFD only. Standard round holes only. No approval is issued.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const parse=v=>{try{return typeof v==="string"?JSON.parse(v):v;}catch(e){return null;}};
function calculateBolt(c,d){
 const issues=[];
 const req=["boltAbMm2","boltFntMPa","boltFnvMPa","boltDiameterMm","holeDiameterMm","connectedThicknessMm","connectedFuMPa","shearPlaneCount"];
 req.forEach(k=>{if(!finite(c[k])||c[k]<=0)issues.push("پارامتر "+k+" ناموجود یا نامعتبر است.");});
 if(!finite(d?.tensionN)||d.tensionN<0||!finite(d?.shearPerPlaneN)||d.shearPerPlaneN<0)issues.push("تقاضای کشش/برش هر پیچ نامعتبر است.");
 if(!finite(d?.clearDistanceMm)||d.clearDistanceMm<=0)issues.push("فاصله آزاد lc در جهت نیرو برای هر پیچ لازم است.");
 if(c.boltHoleType!=="standard")issues.push("این نسخه فقط سوراخ گرد استاندارد را پوشش می‌دهد.");
 if(c.boltConnectionType!=="bearing-type")issues.push("این موتور فقط اتصال bearing-type را پوشش می‌دهد؛ اتصال slip-critical باید جداگانه کنترل شود.");
 if(c.eccentricityMm!==0)issues.push("خروج از مرکزیت غیرصفر است؛ تحلیل گروه پیچ خارج از مرکز در این نسخه وجود ندارد.");
 if(c.boltPryingIncluded!==true)issues.push("تقاضای کشش پیچ باید اثر prying را لحاظ کند یا عدم نیاز آن مستند شده باشد.");
 if(!String(c.boltGrade||"").trim())issues.push("گرید پیچ باید مستند باشد.");
 if(c.loadPathReviewed!==true||c.connectionDrawingReviewed!==true)issues.push("بازبینی مسیر انتقال نیرو و تطبیق نقشه اتصال الزامی است.");
 if(![true,false].includes(c.threadsInShearPlane))issues.push("وضعیت رزوه در صفحه برش باید مشخص باشد.");
 if(!["yes","no"].includes(c.deformationAtServiceLoad))issues.push("ملاک تغییرشکل سوراخ در بار سرویس باید مشخص شود.");
 if(c.shearPlaneCount!==1)issues.push("این نسخه فقط یک صفحه برش پیچ را محاسبه می‌کند؛ چندصفحه‌ای نیازمند توزیع صریح برش در هر صفحه است.");
 if(c.holeDiameterMm<c.boltDiameterMm)issues.push("قطر سوراخ از قطر پیچ کوچک‌تر است.");
 if(issues.length)return {ok:false,issues};
 const Ab=c.boltAbMm2, Fnt=c.boltFntMPa, Fnv=c.boltFnvMPa;
 const phi=0.75, t=c.connectedThicknessMm, d0=c.holeDiameterMm, db=c.boltDiameterMm, Fu=c.connectedFuMPa, lc=d.clearDistanceMm;
 const shearStress=d.shearPerPlaneN/Ab;
 const FntPrime=Math.min(Fnt,1.3*Fnt-(Fnt/(phi*Fnv))*shearStress);
 if(!(FntPrime>0))return {ok:false,issues:["تنش کششی اصلاح‌شده پیچ طبق J3-3 غیرمثبت است؛ تقاضای برشی/داده پیچ باید بازبینی شود."]};
 const shearAvailable=phi*Fnv*Ab;
 const tensionAvailable=phi*FntPrime*Ab;
 const coeff=c.deformationAtServiceLoad==="yes"?2.4:3.0;
 const tearCoeff=c.deformationAtServiceLoad==="yes"?1.2:1.5;
 const bearingAvailable=phi*coeff*db*t*Fu;
 const tearoutAvailable=phi*tearCoeff*lc*t*Fu;
 const uS=d.shearPerPlaneN/shearAvailable,uT=d.tensionN/tensionAvailable,uB=d.shearPerPlaneN/Math.min(bearingAvailable,tearoutAvailable);
 const combined=d.tensionN>0?d.tensionN/tensionAvailable:0;
 return {ok:true,method:"LRFD",shear:{demandN:d.shearPerPlaneN,availableN:shearAvailable,utilization:uS},tension:{demandN:d.tensionN,modifiedFntMPa:FntPrime,availableN:tensionAvailable,utilization:uT},bearing:{availableN:bearingAvailable,utilization:d.shearPerPlaneN/bearingAvailable},tearout:{availableN:tearoutAvailable,utilization:d.shearPerPlaneN/tearoutAvailable},combinedTensionShearUtilization:combined,governing:([{name:"bolt shear",u:uS},{name:"bolt tension with J3-3",u:uT},{name:"plate bearing",u:d.shearPerPlaneN/bearingAvailable},{name:"plate tearout",u:d.shearPerPlaneN/tearoutAvailable}].sort((a,b)=>b.u-a.u)[0]).name,maximumUtilization:Math.max(uS,uT,d.shearPerPlaneN/bearingAvailable,d.shearPerPlaneN/tearoutAvailable),designApproved:false,basis:"AISC 360-22 J3.7, J3.8, J3.11a; LRFD"};
}
function analyze(envelope,model,connectionData){
 const ma=root.SteelBraceForceDemandAudit?.audit?.(envelope,model),issues=[],rows=[];
 if(!ma)issues.push("ممیزی تقاضای مهاربند در دسترس نیست.");else if(!ma.success)issues.push(...ma.issues);
 const conns=connectionData?.connections||[],map=new Map(conns.map(c=>[c.memberId+"::"+c.end,c]));
 if(issues.length)return {success:false,issues,rows,analysisEnabled:false,designApproved:false};
 ma.rows.forEach(b=>["I","J"].forEach(end=>{
  const c=map.get(b.memberId+"::"+end);
  if(!c||c.connectionType!=="bolted"){issues.push("اتصال پیچی "+b.memberId+"/"+end+" ثبت نشده است.");return;}
  const cases=parse(c.boltCaseDemandsJson);
  b.simultaneousDemands.forEach(d=>{
   const tension=end==="I"?d.endI_tension_N:d.endJ_tension_N,compression=end==="I"?d.endI_compression_N:d.endJ_compression_N;
   if(compression>0){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": تقاضای فشاری وجود دارد؛ غربال کششی پیچ برای این حالت کافی نیست.");return;}
   const arr=cases?.[d.caseLabel];
   if(!Array.isArray(arr)||arr.length!==c.boltCount){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": توزیع صریح نیرو برای تک‌تک پیچ‌ها ثبت نشده است.");return;}
   const transferred=arr.reduce((s,x)=>s+(finite(x.transferN)?x.transferN:NaN),0);
   if(!finite(transferred)||Math.abs(transferred-tension)>Math.max(1,0.01*tension)){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": جمع نیروی انتقالی پیچ‌ها با نیروی محوری FEM در محدوده ۱٪ تطبیق ندارد.");return;}
   if(arr.some(x=>!finite(x.tensionN)||!finite(x.shearPerPlaneN)||Math.abs(Math.hypot(x.tensionN,x.shearPerPlaneN)-x.transferN)>Math.max(1,0.01*x.transferN))){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": برآیند کشش و برش محلی هر پیچ با مؤلفه انتقالی ثبت‌شده آن در محدوده ۱٪ برابر نیست.");return;}
   arr.forEach((x,i)=>rows.push({memberId:b.memberId,end,caseLabel:d.caseLabel,boltIndex:i+1,transferN:x.transferN,...calculateBolt(c,x)}));
  });
 }));
 const failed=rows.some(x=>!x.ok);
 if(failed)issues.push("حداقل یک پیچ به دلیل ورودی ناقص یا خارج از دامنه قابل محاسبه نیست.");
 return {success:issues.length===0&&rows.length>0,issues,rows,completedCount:rows.filter(x=>x.ok).length,analysisEnabled:false,designApproved:false,limitations:["تقسیم نیرو میان پیچ‌ها خودکار فرض نمی‌شود؛ آرایه نیروهای هر پیچ باید برای هر ترکیب از تحلیل معتبر اتصال ارائه شود.","فقط یک صفحه برش و سوراخ استاندارد گرد؛ چندصفحه‌ای، سوراخ لوبیایی/بزرگ، لغزش، پیش‌تنیدگی و prying پوشش داده نشده‌اند.","نیروی فشار مهاربند، خمش گروه پیچ و انعطاف‌پذیری ورق/گاست در این غربال کنترل نمی‌شود.","Fnt و Fnv و سطح Ab باید از گرید و وضعیت رزوه مستند به جدول معتبر پیچ انتخاب شوند؛ نرم‌افزار آن‌ها را حدس نمی‌زند."]};
}
function render(r){const host=document.getElementById("braceBoltStrengthResult");if(!host)return;host.innerHTML="<strong>"+(r.success?"غربال پیچ برای داده‌های ثبت‌شده انجام شد؛ این نتیجه تأیید طراحی نیست.":"غربال پیچ ناقص/مسدود است.")+"</strong><p>پیچ‌های محاسبه‌شده: "+(r.completedCount||0)+"</p>"+(r.rows?.length?'<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>عضو</th><th>انتها</th><th>ترکیب</th><th>شماره پیچ</th><th>کشش kN</th><th>برش kN</th><th>ظرفیت کشش kN</th><th>ظرفیت برش kN</th><th>ظرفیت bearing kN</th><th>tear-out kN</th><th>نسبت حاکم</th><th>حالت حاکم</th></tr></thead><tbody>'+r.rows.map(x=>'<tr><td>'+esc(x.memberId)+'</td><td>'+x.end+'</td><td>'+esc(x.caseLabel)+'</td><td>'+x.boltIndex+'</td><td>'+(x.ok?(x.tension.demandN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.shear.demandN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.tension.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.shear.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.bearing.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.tearout.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?x.maximumUtilization.toFixed(3):"—")+'</td><td>'+(x.ok?esc(x.governing):esc(x.issues.join("؛ ")))+'</td></tr>').join("")+'</tbody></table></div>':"")+(r.issues?.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<p>لغزش اتصال، پیش‌تنیدگی، گروه چندصفحه‌ای و اثر prying هنوز خارج از دامنه‌اند.</p>";}
function run(){const r=analyze(root.SteelMemberForceEnvelope?.getLast?.(),root.SteelStructuralModel?.getData?.(),root.SteelBraceConnectionReadiness?.getData?.());render(r);return r;}
function init(){if(document.getElementById("braceBoltStrengthPanel"))return;const p=document.createElement("section");p.className="panel";p.id="braceBoltStrengthPanel";p.innerHTML="<div class='panel-title'><h3>غربال مقاومت اتصال پیچی مهاربند</h3><span class='status'>AISC 360-22 · LRFD مقدماتی</span></div><div class='notice'>مشخصات Ab، Fnt، Fnv و تقاضای تک‌تک پیچ‌ها برای هر ترکیب را از مدارک معتبر وارد کنید. توزیع نیرو بین پیچ‌ها خودکار فرض نمی‌شود؛ برآیند کشش و برش هر پیچ باید با transferN آن برابر باشد. فقط یک صفحه برش و سوراخ استاندارد بررسی می‌شود.</div><button type='button' class='btn primary' id='btnBraceBoltStrengthRun'>محاسبه مقاومت پیچ‌ها</button><div id='braceBoltStrengthResult' class='notice'>ابتدا اطلاعات اتصال و JSON نیروهای هر پیچ را تکمیل کنید.</div>";const a=document.getElementById("braceGussetStrengthPanel");if(a?.parentNode)a.insertAdjacentElement("afterend",p);else document.querySelector("main")?.appendChild(p);document.getElementById("btnBraceBoltStrengthRun").addEventListener("click",run);}

function selfTest(){
 const c={boltAbMm2:245,boltFntMPa:620,boltFnvMPa:372,boltDiameterMm:20,holeDiameterMm:22,connectedThicknessMm:10,connectedFuMPa:360,shearPlaneCount:1,boltHoleType:"standard",boltConnectionType:"bearing-type",deformationAtServiceLoad:"yes",eccentricityMm:0,boltPryingIncluded:true,threadsInShearPlane:false,boltGrade:"8.8",loadPathReviewed:true,connectionDrawingReviewed:true};
 const t=[],add=(n,f)=>{try{t.push({name:n,pass:f()===true});}catch(e){t.push({name:n,pass:false,error:e.message});}};
 const d={tensionN:10000,shearPerPlaneN:15000,clearDistanceMm:30};
 add("calculates bolt shear resistance with LRFD phi 0.75",()=>{const r=calculateBolt(c,d);return r.ok&&Math.abs(r.shear.availableN-0.75*372*245)<1e-6;});
 add("applies J3-3 modified tensile stress",()=>{const r=calculateBolt(c,d),expected=Math.min(620,1.3*620-(620/(0.75*372))*(15000/245));return r.ok&&Math.abs(r.tension.modifiedFntMPa-expected)<1e-9;});
 add("bearing uses J3-6a coefficient when service deformation matters",()=>{const r=calculateBolt(c,d);return r.ok&&r.bearing.availableN===0.75*2.4*20*10*360;});
 add("tearout uses J3-6c coefficient",()=>{const r=calculateBolt(c,d);return r.ok&&r.tearout.availableN===0.75*1.2*30*10*360;});
 add("rejects nonstandard holes",()=>!calculateBolt({...c,boltHoleType:"slot"},d).ok);
 add("rejects missing clear distance",()=>!calculateBolt(c,{...d,clearDistanceMm:null}).ok);
 add("rejects multiple shear planes in restricted engine",()=>!calculateBolt({...c,shearPlaneCount:2},d).ok);
 add("rejects missing bolt material strength",()=>!calculateBolt({...c,boltFnvMPa:null},d).ok);
 add("rejects unspecified service deformation criterion",()=>!calculateBolt({...c,deformationAtServiceLoad:""},d).ok);
 add("does not issue design approval",()=>calculateBolt(c,d).designApproved===false);
 add("rejects negative demand",()=>!calculateBolt(c,{...d,tensionN:-1}).ok);
 add("rejects slip-critical connection type",()=>!calculateBolt({...c,boltConnectionType:"slip-critical"},d).ok);
 add("requires prying assessment",()=>!calculateBolt({...c,boltPryingIncluded:false},d).ok);
 add("rejects eccentric bolt group",()=>!calculateBolt({...c,eccentricityMm:5},d).ok);
 add("requires thread-plane declaration",()=>!calculateBolt({...c,threadsInShearPlane:null},d).ok);
 return {passed:t.filter(x=>x.pass).length,failed:t.filter(x=>!x.pass).length,total:t.length,tests:t};
}
root.SteelBraceBoltStrengthScreen={calculateBolt,analyze,run,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/brace-slip-critical-screen.js ===== */
(function(root){
"use strict";
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function evaluate(input){
 const x=input||{},issues=[];
 const req=["boltCount","boltPretension_kN","slipCoefficient","slipPlanes","holeClass","fillersCount","slipDemand_kN","tensionDemand_kN","tensionBolts"];
 const v={};req.forEach(k=>{v[k]=num(x[k]);if(v[k]===null)issues.push("ورودی عددی معتبر برای "+k+" لازم است.");});
 if(!["standard","short-perpendicular","oversized","short-parallel","long-slot"].includes(x.holeClass))issues.push("نوع سوراخ باید صریح و در دامنه پشتیبانی باشد.");
 if(x.surfaceClass!=="A"&&x.surfaceClass!=="B"&&x.surfaceClass!=="tested")issues.push("کلاس سطح اصطکاک باید A/B یا نتیجه آزمون مستند باشد.");
 if(x.surfaceClass==="tested"&&(!x.slipTestReference||!String(x.slipTestReference).trim()))issues.push("مرجع آزمون ضریب لغزش لازم است.");
 if(x.pretensionVerified!==true)issues.push("پیش‌تنیدگی نصب‌شده باید مستند و تأیید شود.");
 if(x.bearingTypeChecksComplete!==true)issues.push("کنترل‌های حدحالت bearing-type برای اتصال لغزش‌بحرانی هنوز تأیید نشده‌اند.");
 if(x.loadCaseReference==null||!String(x.loadCaseReference).trim())issues.push("شناسه ترکیب بار/حالت بار لازم است.");
 if(x.connectionDrawingReference==null||!String(x.connectionDrawingReference).trim())issues.push("مرجع نقشه اتصال لازم است.");
 if(Object.values(v).some(z=>z===null))return result();
 if(v.boltCount<1||v.boltCount%1||v.slipPlanes<1||v.slipPlanes%1||v.fillersCount<0||v.fillersCount%1||v.tensionBolts<1||v.tensionBolts>v.boltCount||v.tensionBolts%1)issues.push("تعداد پیچ، صفحات لغزش، فیلر و پیچ‌های حامل کشش نامعتبر است.");
 if(v.boltPretension_kN<=0||v.slipCoefficient<=0||v.slipCoefficient>1||v.slipDemand_kN<0||v.tensionDemand_kN<0)issues.push("مقادیر مقاومت/تقاضا خارج از دامنه مجاز هستند.");
 if(issues.length)return result();
 const phi=({"standard":1,"short-perpendicular":1,"oversized":0.85,"short-parallel":0.85,"long-slot":0.70})[x.holeClass];
 const Du=num(x.Du)===null?1.13:num(x.Du),hf=v.fillersCount>=2?0.85:1.0;
 if(Du<=0||Du>2){issues.push("Du باید مستند و در بازه قابل قبول باشد.");return result();}
 const RnPerBolt=v.slipCoefficient*Du*hf*v.boltPretension_kN*v.slipPlanes;
 const ksc=Math.max(0,1-v.tensionDemand_kN/(Du*v.boltPretension_kN*v.tensionBolts));
 const available=phi*RnPerBolt*ksc*v.boltCount;
 const utilization=available>0?v.slipDemand_kN/available:(v.slipDemand_kN===0?0:Infinity);
 const pass=issues.length===0&&utilization<=1;
 return {ok:issues.length===0,pass,issues,method:"AISC 360-22 J3.9/J3.10 LRFD slip-resistance screen",nominalSlipResistancePerBolt_kN:RnPerBolt,phi,Du,hf,slipPlanes:v.slipPlanes,k_sc:ksc,availableSlipResistance_kN:available,slipDemand_kN:v.slipDemand_kN,utilization,governingCase:String(x.loadCaseReference),analysisEnabled:false,designApproved:false,scope:"Slip limit state only; bearing-type bolt/plate limit states, fatigue, eccentric bolt-group distribution and code adoption for Iranian projects require separate verification."};
 function result(){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false,method:"AISC 360-22 J3.9/J3.10 LRFD slip-resistance screen"};}
}
function selfTest(){
 const base={boltCount:4,boltPretension_kN:100,slipCoefficient:.3,slipPlanes:1,holeClass:"standard",fillersCount:0,slipDemand_kN:80,tensionDemand_kN:20,tensionBolts:4,surfaceClass:"A",pretensionVerified:true,bearingTypeChecksComplete:true,loadCaseReference:"ULS-1",connectionDrawingReference:"D-01"};
 const a=evaluate(base),b=evaluate({...base,pretensionVerified:false}),c=evaluate({...base,holeClass:"unsupported"}),d=evaluate({...base,tensionDemand_kN:500});
 const checks=[a.ok&&a.availableSlipResistance_kN>0&&!a.designApproved,!b.ok,b.issues.length>0,!c.ok,!d.pass&&d.k_sc===0];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelBraceSlipCriticalScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/bolt-geometry-screen.js ===== */
(function(root){
"use strict";
const EDGE_MM={12:18,16:22,20:26,22:28,24:30,27:34,30:38,36:46};
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function evaluate(input){
 const x=input||{},issues=[],d=finite(x.boltDiameter_mm),t=finite(x.plateThickness_mm),W=finite(x.plateWidth_mm),H=finite(x.plateHeight_mm),pts=x.bolts;
 if([d,t,W,H].some(v=>v===null)||!Array.isArray(pts)||pts.length<2)issues.push("قطر پیچ، ضخامت و ابعاد ورق و مختصات حداقل دو پیچ لازم است.");
 if(x.holeType!=="standard")issues.push("این نسخه فقط سوراخ استاندارد گرد را کنترل می‌کند؛ سوراخ بزرگ و لوبیایی نیازمند ضوابط افزوده است.");
 if(x.edgeCondition!=="sheared"&&x.edgeCondition!=="rolled"&&x.edgeCondition!=="flame-cut"&&x.edgeCondition!=="machined")issues.push("نوع لبه باید مشخص شود.");
 if(x.corrosionClass!=="protected"&&x.corrosionClass!=="weathering")issues.push("شرایط خوردگی/نوع سطح عضو باید مشخص شود.");
 if(x.materialThicknessVerified!==true||x.geometryDrawingReference==null||!String(x.geometryDrawingReference).trim())issues.push("ضخامت واقعی و مرجع نقشه هندسه باید تأیید شود.");
 if([d,t,W,H].some(v=>v===null)||!Array.isArray(pts)||pts.length<2)return fail();
 if(d<=0||t<=0||W<=0||H<=0||pts.some(p=>!p||finite(p.x_mm)===null||finite(p.y_mm)===null))issues.push("ابعاد یا مختصات پیچ نامعتبر است.");
 if(issues.length)return fail();
 const minEdge=EDGE_MM[d]|| (d>36?1.25*d:null);
 if(minEdge===null){issues.push("قطر پیچ خارج از جدول متریک J3.4M این ماژول است.");return fail();}
 const minSpacing=2.667*d,maxEdge=Math.min(12*t,150),maxSpacing=x.corrosionClass==="weathering"?Math.min(14*t,180):Math.min(24*t,300);
 const edges=[],pairs=[],spacing=[];
 pts.forEach((p,i)=>{
  const px=Number(p.x_mm),py=Number(p.y_mm),dist=[px,W-px,py,H-py],actual=Math.min(...dist);
  edges.push({bolt:i+1,actual_mm:actual,requiredMinimum_mm:minEdge,maximum_mm:maxEdge,pass:actual>=minEdge&&actual<=maxEdge});
  if(actual<minEdge)issues.push("فاصله لبه پیچ "+(i+1)+" کمتر از حداقل J3.4M است.");
  if(actual>maxEdge)issues.push("فاصله پیچ "+(i+1)+" تا لبه از حد مجاز J3.6 بیشتر است.");
  for(let j=0;j<i;j++){
   const dx=px-Number(pts[j].x_mm),dy=py-Number(pts[j].y_mm),s=Math.hypot(dx,dy);
   pairs.push({boltA:j+1,boltB:i+1,spacing_mm:s,minimum_mm:minSpacing,pass:s>=minSpacing});
   if(s<minSpacing)issues.push("فاصله مرکز پیچ‌های "+(j+1)+" و "+(i+1)+" کمتر از 2.667d است.");
   if(Math.abs(dy)<=Math.max(1,0.02*d)){
    spacing.push({boltA:j+1,boltB:i+1,spacing_mm:s,maximum_mm:maxSpacing,pass:s<=maxSpacing});
    if(s>maxSpacing)issues.push("فاصله طولی پیچ‌های هم‌ردیف از حد J3.6 بیشتر است.");
   }
  }
 });
 return {ok:true,pass:issues.length===0,issues,method:"AISC 360-22 J3.3/J3.4M/J3.6 limited geometry screen",minimumEdge_mm:minEdge,minimumCenterSpacing_mm:minSpacing,maximumEdge_mm:maxEdge,maximumLongitudinalSpacing_mm:maxSpacing,edgeChecks:edges,pairChecks:pairs,longitudinalSpacingChecks:spacing,analysisEnabled:false,designApproved:false,scope:"Only standard round holes in a rectangular plate; edge distances use the metric table. Hole bearing/tearout, block shear, net-section rupture, staggered paths, welds and connection force transfer are not checked."};
 function fail(){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false,method:"AISC 360-22 limited bolt geometry screen"};}
}
function selfTest(){
 const base={boltDiameter_mm:20,plateThickness_mm:12,plateWidth_mm:220,plateHeight_mm:160,holeType:"standard",edgeCondition:"machined",corrosionClass:"protected",materialThicknessVerified:true,geometryDrawingReference:"D-02",bolts:[{x_mm:40,y_mm:40},{x_mm:100,y_mm:40},{x_mm:160,y_mm:40}]};
 const a=evaluate(base),b=evaluate({...base,bolts:[{x_mm:10,y_mm:10},{x_mm:30,y_mm:10}]}),c=evaluate({...base,holeType:"long-slot"}),d=evaluate({...base,corrosionClass:""});
 const checks=[a.ok&&a.pass&&!a.designApproved,!b.pass,!c.ok,!d.ok];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelBoltGeometryScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/brace-weld-strength-screen.js ===== */
/* SAHROUD STEEL — AISC 360-22 J2 restricted fillet-weld screen.
 * Explicit per-segment force transfer is required for every FEM case. LRFD only.
 * No automatic weld-group force distribution, eccentric group analysis or approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const parse=v=>{try{return typeof v==="string"?JSON.parse(v):v;}catch(e){return null;}};
function effectiveLength(length,size){
 if(length<=0||size<=0)return null;
 if(length>300*size)return 180*size;
 if(length>100*size){const beta=Math.min(1,1.2-0.002*(length/size));return length*beta;}
 return length;
}
function calculateSegment(c,s){
 const issues=[];
 if(c.eccentricityMm!==0)issues.push("خروج از مرکزیت غیرصفر است؛ تحلیل گروه جوش خارج از مرکز در این نسخه وجود ندارد.");
 if(c.loadPathReviewed!==true||c.connectionDrawingReviewed!==true||!String(c.weldLayoutReference||"").trim())issues.push("بازبینی مسیر نیرو، نقشه اتصال و مرجع آرایش جوش الزامی است.");
 ["weldSizeMm","electrodeFexxMPa","baseMetalFyMPa","baseMetalFuMPa"].forEach(k=>{if(!finite(c[k])||c[k]<=0)issues.push(k+" ناموجود یا نامعتبر است.");});
 ["effectiveLengthMm","baseGrossShearAreaMm2","baseNetShearAreaMm2","shearN"].forEach(k=>{if(!finite(s?.[k])||s[k]<0)issues.push(k+" ناموجود یا نامعتبر است.");});
 if(!finite(s?.shearN)||s.shearN<0||s.effectiveLengthMm<=0||s.baseGrossShearAreaMm2<=0||s.baseNetShearAreaMm2<=0)issues.push("نیرو، طول مؤثر یا مساحت فلز پایه باید مثبت/غیرمنفی باشد.");
 if(c.baseMetalFuMPa<c.baseMetalFyMPa)issues.push("Fu فلز پایه از Fy کمتر است.");
 if(issues.length)return {ok:false,issues};
 const le=effectiveLength(s.effectiveLengthMm,c.weldSizeMm);
 const throat=0.707*c.weldSizeMm, weldArea=le*throat;
 const phiWeld=0.75, weldAvailable=phiWeld*0.60*c.electrodeFexxMPa*weldArea;
 const baseYield=1.00*0.60*c.baseMetalFyMPa*s.baseGrossShearAreaMm2;
 const baseRupture=0.75*0.60*c.baseMetalFuMPa*s.baseNetShearAreaMm2;
 const baseAvailable=Math.min(baseYield,baseRupture);
 const uW=s.shearN/weldAvailable,uB=s.shearN/baseAvailable;
 return {ok:true,demandN:s.shearN,weld:{effectiveLengthMm:le,effectiveThroatMm:throat,effectiveAreaMm2:weldArea,availableN:weldAvailable,utilization:uW},baseMetal:{shearYieldAvailableN:baseYield,shearRuptureAvailableN:baseRupture,availableN:baseAvailable,utilization:uB},governing:uW>=uB?"فلز جوش":"فلز پایه",maximumUtilization:Math.max(uW,uB),designApproved:false,basis:"AISC 360-22 J2.2, J2.4, J2-1, Table J2.5; J4.2; LRFD"};
}
function analyze(envelope,model,connectionData){
 const ma=root.SteelBraceForceDemandAudit?.audit?.(envelope,model),issues=[],rows=[];
 if(!ma)issues.push("ممیزی تقاضای مهاربند در دسترس نیست.");else if(!ma.success)issues.push(...ma.issues);
 const map=new Map((connectionData?.connections||[]).map(c=>[c.memberId+"::"+c.end,c]));
 if(issues.length)return {success:false,issues,rows,analysisEnabled:false,designApproved:false};
 ma.rows.forEach(b=>["I","J"].forEach(end=>{
  const c=map.get(b.memberId+"::"+end);
  if(!c||c.connectionType!=="welded"){issues.push("اتصال جوشی "+b.memberId+"/"+end+" ثبت نشده است.");return;}
  const cases=parse(c.weldCaseDemandsJson);
  b.simultaneousDemands.forEach(d=>{
   const tension=end==="I"?d.endI_tension_N:d.endJ_tension_N,compression=end==="I"?d.endI_compression_N:d.endJ_compression_N;
   if(compression>0){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": تقاضای فشاری وجود دارد؛ این غربال محدود جوش کافی نیست.");return;}
   const arr=cases?.[d.caseLabel];
   if(!Array.isArray(arr)||arr.length!==c.weldCount){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": تقاضای صریح هر قطعه جوش ثبت نشده است.");return;}
   const transferred=arr.reduce((s,x)=>s+(finite(x.transferN)?x.transferN:NaN),0);
   if(!finite(transferred)||Math.abs(transferred-tension)>Math.max(1,0.01*tension)){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": جمع انتقال نیرو در جوش‌ها با تقاضای FEM در محدوده ۱٪ تطبیق ندارد.");return;}
   if(arr.some(x=>!finite(x.shearN)||Math.abs(x.shearN-x.transferN)>Math.max(1,0.01*x.transferN))){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": در غربال برش‌محور، نیروی برشی هر قطعه باید با مؤلفه انتقالی همان قطعه در محدوده ۱٪ برابر باشد.");return;}
   arr.forEach((x,i)=>rows.push({memberId:b.memberId,end,caseLabel:d.caseLabel,weldIndex:i+1,transferN:x.transferN,...calculateSegment(c,x)}));
  });
 }));
 if(rows.some(x=>!x.ok))issues.push("حداقل یک قطعه جوش به علت داده ناقص یا خارج از دامنه محاسبه نشده است.");
 return {success:issues.length===0&&rows.length>0,issues,rows,completedCount:rows.filter(x=>x.ok).length,analysisEnabled:false,designApproved:false,limitations:["فقط جوش گوشه با بار برشی و LRFD؛ جوش شیاری CJP/PJP، plug/slot و بارگذاری پیچیده پوشش داده نشده‌اند.","نیروی هر قطعه جوش و توزیع آن باید صریحاً ارائه شود؛ گروه جوش خارج از مرکز یا ترکیب نیرو/لنگر به‌طور خودکار تحلیل نمی‌شود.","کنترل فلز پایه بر مبنای مساحت‌های خالص و ناخالص برشی ورودی کاربر است؛ استخراج مسیر شکست از نقشه انجام نمی‌شود.","ضریب افزایش جهت‌داری kds عمداً برابر 1.0 منظور شده؛ افزایش مقاومت به دلیل زاویه بار لحاظ نشده است."]};
}
function render(r){const host=document.getElementById("braceWeldStrengthResult");if(!host)return;host.innerHTML="<strong>"+(r.success?"غربال جوش برای داده‌های ثبت‌شده انجام شد؛ این نتیجه تأیید طراحی نیست.":"غربال جوش ناقص/مسدود است.")+"</strong><p>قطعات جوش محاسبه‌شده: "+(r.completedCount||0)+"</p>"+(r.rows?.length?'<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>عضو</th><th>انتها</th><th>ترکیب</th><th>قطعه</th><th>نیرو kN</th><th>ظرفیت فلز جوش kN</th><th>ظرفیت فلز پایه kN</th><th>نسبت حاکم</th><th>حاکم</th></tr></thead><tbody>'+r.rows.map(x=>'<tr><td>'+esc(x.memberId)+'</td><td>'+x.end+'</td><td>'+esc(x.caseLabel)+'</td><td>'+x.weldIndex+'</td><td>'+(x.ok?(x.demandN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.weld.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.baseMetal.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?x.maximumUtilization.toFixed(3):"—")+'</td><td>'+(x.ok?esc(x.governing):esc(x.issues.join("؛ ")))+'</td></tr>').join("")+'</tbody></table></div>':"")+(r.issues?.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<p>گروه جوش خارج از مرکز، بارهای مختلط و جوش شیاری هنوز خارج از دامنه‌اند.</p>";}
function run(){const r=analyze(root.SteelMemberForceEnvelope?.getLast?.(),root.SteelStructuralModel?.getData?.(),root.SteelBraceConnectionReadiness?.getData?.());render(r);return r;}
function init(){if(document.getElementById("braceWeldStrengthPanel"))return;const p=document.createElement("section");p.className="panel";p.id="braceWeldStrengthPanel";p.innerHTML="<div class='panel-title'><h3>غربال مقاومت اتصال جوشی مهاربند</h3><span class='status'>AISC 360-22 · LRFD مقدماتی</span></div><div class='notice'>فقط جوش گوشه در برش بررسی می‌شود. نیروی هر قطعه جوش و مساحت ناخالص/خالص فلز پایه باید جداگانه و برای هر ترکیب وارد شود؛ kds برابر ۱ در نظر گرفته شده است.</div><button type='button' class='btn primary' id='btnBraceWeldStrengthRun'>محاسبه مقاومت جوش‌ها</button><div id='braceWeldStrengthResult' class='notice'>ابتدا اطلاعات جوش و JSON نیروهای قطعات جوش را تکمیل کنید.</div>";const a=document.getElementById("braceBoltStrengthPanel");if(a?.parentNode)a.insertAdjacentElement("afterend",p);else document.querySelector("main")?.appendChild(p);document.getElementById("btnBraceWeldStrengthRun").addEventListener("click",run);}

function selfTest(){
 const c={weldSizeMm:6,electrodeFexxMPa:490,baseMetalFyMPa:235,baseMetalFuMPa:360,eccentricityMm:0,loadPathReviewed:true,connectionDrawingReviewed:true,weldLayoutReference:"W-01"};
 const s={effectiveLengthMm:100,baseGrossShearAreaMm2:1000,baseNetShearAreaMm2:900,shearN:20000};
 const t=[],add=(n,f)=>{try{t.push({name:n,pass:f()===true});}catch(e){t.push({name:n,pass:false,error:e.message});}};
 add("fillet weld throat is 0.707 times leg size",()=>{const r=calculateSegment(c,s);return r.ok&&Math.abs(r.weld.effectiveThroatMm-4.242)<1e-9;});
 add("weld metal LRFD strength uses 0.75 times 0.60 Fexx Awe",()=>{const r=calculateSegment(c,s);return r.ok&&Math.abs(r.weld.availableN-0.75*0.6*490*100*0.707*6)<1e-6;});
 add("long end-loaded weld uses beta above 100w",()=>Math.abs(effectiveLength(800,6)-800*Math.min(1,1.2-0.002*(800/6)))<1e-9);
 add("very long end-loaded weld is capped at 180w",()=>effectiveLength(2000,6)===1080);
 add("base metal shear yielding uses phi 1.0 and 0.60FyAgv",()=>{const r=calculateSegment(c,s);return r.ok&&r.baseMetal.shearYieldAvailableN===0.6*235*1000;});
 add("base metal shear rupture uses phi 0.75 and 0.60FuAnv",()=>{const r=calculateSegment(c,s);return r.ok&&r.baseMetal.shearRuptureAvailableN===0.75*0.6*360*900;});
 add("governing base-metal strength is the lesser branch",()=>{const r=calculateSegment(c,s);return r.ok&&r.baseMetal.availableN===Math.min(0.6*235*1000,0.75*0.6*360*900);});
 add("rejects missing base-metal area",()=>!calculateSegment(c,{...s,baseNetShearAreaMm2:null}).ok);
 add("rejects Fu lower than Fy",()=>!calculateSegment({...c,baseMetalFuMPa:200},s).ok);
 add("rejects zero weld length",()=>!calculateSegment(c,{...s,effectiveLengthMm:0}).ok);
 add("does not issue design approval",()=>calculateSegment(c,s).designApproved===false);
 add("rejects eccentric weld group",()=>!calculateSegment({...c,eccentricityMm:5},s).ok);
 add("requires weld layout and load-path review",()=>!calculateSegment({...c,weldLayoutReference:"",loadPathReviewed:false},s).ok);
 return {passed:t.filter(x=>x.pass).length,failed:t.filter(x=>!x.pass).length,total:t.length,tests:t};
}
root.SteelBraceWeldStrengthScreen={effectiveLength,calculateSegment,analyze,run,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/weld-group-eccentric-screen.js ===== */
(function(root){
"use strict";
function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function fail(issues){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false,method:"Elastic planar eccentric fillet-weld-group screen"};}
function evaluate(input){
 const x=input||{},issues=[],segments=Array.isArray(x.segments)?x.segments:[];
 const F=n(x.FEXX_MPa),w=n(x.weldSize_mm),Fx=n(x.Fx_N),Fy=n(x.Fy_N),Mz=n(x.Mz_Nmm);
 if(F===null||w===null||Fx===null||Fy===null||Mz===null||segments.length===0)issues.push("FEXX، اندازه جوش، Fx، Fy، Mz و خطوط جوش لازم‌اند.");
 if(x.weldType!=="fillet")issues.push("این نسخه فقط جوش گوشه را پشتیبانی می‌کند.");
 if(x.loadPlane!=="in-plane")issues.push("فقط بارگذاری درون‌صفحه‌ای Fx، Fy و Mz پشتیبانی می‌شود.");
 if(x.baseMetalChecksComplete!==true)issues.push("تکمیل کنترل فلز پایه باید جداگانه تأیید شود.");
 if(x.loadPathReviewed!==true||x.connectionDrawingReference==null||!String(x.connectionDrawingReference).trim())issues.push("بازبینی مسیر بار و مرجع نقشه اتصال لازم است.");
 if([F,w,Fx,Fy,Mz].some(v=>v===null)||!segments.length)return fail(issues);
 if(F<=0||w<=0)issues.push("مقاومت فلز جوش و اندازه جوش باید مثبت باشند.");
 const lines=segments.map((s,i)=>{const x1=n(s.x1_mm),y1=n(s.y1_mm),x2=n(s.x2_mm),y2=n(s.y2_mm);if([x1,y1,x2,y2].some(v=>v===null))issues.push("مختصات خط جوش "+(i+1)+" نامعتبر است.");const L=Math.hypot((x2||0)-(x1||0),(y2||0)-(y1||0));if(L<=0)issues.push("طول خط جوش "+(i+1)+" باید مثبت باشد.");return {i:i+1,x1,y1,x2,y2,L};});
 if(issues.length)return fail(issues);
 const totalL=lines.reduce((a,s)=>a+s.L,0);
 const cx=lines.reduce((a,s)=>a+s.L*(s.x1+s.x2)/2,0)/totalL;
 const cy=lines.reduce((a,s)=>a+s.L*(s.y1+s.y2)/2,0)/totalL;
 let J=0;
 for(const s of lines){
  const ax=s.x1-cx,ay=s.y1-cy,dx=s.x2-s.x1,dy=s.y2-s.y1;
  J+=s.L*(ax*ax+ay*ay)+(ax*dx+ay*dy)*s.L+(dx*dx+dy*dy)*s.L/3;
 }
 if(!(J>0)){issues.push("ممان قطبی خطی گروه جوش صفر یا نامعتبر است.");return fail(issues);}
 const qx=Fx/totalL,qy=Fy/totalL,points=[];
 for(const s of lines){
  for(const [end,px,py] of [["start",s.x1,s.y1],["end",s.x2,s.y2]]){
   const rx=px-cx,ry=py-cy;
   const tx=qx-Mz*ry/J,ty=qy+Mz*rx/J;
   points.push({segment:s.i,end,x_mm:px,y_mm:py,shearX_N_per_mm:tx,shearY_N_per_mm:ty,resultant_N_per_mm:Math.hypot(tx,ty)});
  }
 }
 const governing=points.reduce((a,b)=>b.resultant_N_per_mm>a.resultant_N_per_mm?b:a,points[0]);
 const throat=.707*w,phi=.75,capacity=phi*.60*F*throat;
 const demand=governing.resultant_N_per_mm,util=demand/capacity;
 return {ok:true,pass:util<=1,issues,method:"AISC 360-22 J2 LRFD; elastic line-weld-group distribution for in-plane Fx/Fy/Mz; directionality factor 1.0",centroid_mm:{x:cx,y:cy},totalEffectiveLength_mm:totalL,linePolarMoment_mm3:J,effectiveThroat_mm:throat,phi,nominalStrength_N_per_mm:.60*F*throat,designStrength_N_per_mm:capacity,maximumDemand_N_per_mm:demand,utilization:util,governingPoint:governing,pointDemands:points,analysisEnabled:false,designApproved:false,scope:"Planar fillet weld group only. Elastic method, constant weld size and FEXX. No out-of-plane forces/moments, torsion about in-plane axes, CJP/PJP, base-metal strength calculation, long-weld reduction, fatigue, plastic instantaneous-center method or code-specific local detailing."};
}
function selfTest(){
 const base={FEXX_MPa:490,weldSize_mm:6,Fx_N:12000,Fy_N:0,Mz_Nmm:200000,weldType:"fillet",loadPlane:"in-plane",baseMetalChecksComplete:true,loadPathReviewed:true,connectionDrawingReference:"W-01",segments:[{x1_mm:-50,y1_mm:-40,x2_mm:50,y2_mm:-40},{x1_mm:50,y1_mm:-40,x2_mm:50,y2_mm:40},{x1_mm:50,y1_mm:40,x2_mm:-50,y2_mm:40},{x1_mm:-50,y1_mm:40,x2_mm:-50,y2_mm:-40}]};
 const a=evaluate(base),b=evaluate({...base,segments:[]}),c=evaluate({...base,loadPlane:"3d"}),d=evaluate({...base,baseMetalChecksComplete:false}),e=evaluate({...base,Mz_Nmm:0});
 const checks=[a.ok&&a.centroid_mm.x===0&&a.centroid_mm.y===0,!b.ok,!c.ok,!d.ok,e.ok&&e.utilization<a.utilization];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelWeldGroupEccentricScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/compression-design-readiness.js ===== */
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


/* ===== steel2/js/compression-capacity.js ===== */
/* SAHROUD STEEL — axial compression resistance engine (doubly-symmetric I only).
 * Formula basis: M10-1401 clause family 10-2-4; implementation scope is deliberately
 * restricted to global flexural/torsional buckling of compact, doubly-symmetric I sections.
 * Local slender-element reduction, built-up member effects, flexural-torsional coupling
 * for singly/asymmetric sections, imperfections, second-order analysis and seismic checks
 * are not included. Never treat this module alone as final member approval.
 */
(function(root){
"use strict";
const PI=Math.PI;
function finitePositive(v){return Number.isFinite(Number(v))&&Number(v)>0;}
function fcrFromFe(Fy,Fe){
 if(!finitePositive(Fy)||!finitePositive(Fe))throw Error("Fy و Fe باید مثبت باشند.");
 const ratio=Fy/Fe;
 return ratio<=2.25?{Fcr:Math.pow(0.658,ratio)*Fy,branch:"inelastic"}:{Fcr:0.877*Fe,branch:"elastic"};
}
function analyze(input){
 const d=input||{},issues=[],warnings=[];
 const required=["Ag_mm2","Ix_mm4","Iy_mm4","J_mm4","h0_mm","Lx_mm","Ly_mm","Lz_mm","Kx","Ky","Kz","Fy_MPa","E_MPa","G_MPa"];
 required.forEach(k=>{if(!finitePositive(d[k]))issues.push(k+" باید مقدار مثبت و معتبر داشته باشد.");});
 const E=Number(d.E_MPa),G=Number(d.G_MPa);
 if(!finitePositive(E)||!finitePositive(G))issues.push("E و G باید مثبت باشند.");
 if(d.sectionType!=="doubly-symmetric-I")issues.push("نسخه فعلی فقط برای مقطع I دارای دو محور تقارن معتبر است.");
 if(d.localSlendernessReviewed!==true)issues.push("کنترل لاغری موضعی بال و جان طبق جدول‌های مبحث دهم ثبت نشده است.");
 if(d.localSlendernessClass!=="non-slender")issues.push("این نسخه فقط مقاطع غیرلاغر را می‌پذیرد؛ برای اجزای لاغر باید سطح مقطع مؤثر و ضوابط بند ۱۰-۲-۴-۷ پیاده‌سازی شود.");
 if(issues.length)return {ok:false,issues,warnings,scope:"global-buckling-only",disclaimer:"ظرفیت ارائه نشد؛ داده‌ها یا دامنه کاربرد کامل نیست."};
 const A=Number(d.Ag_mm2),Ix=Number(d.Ix_mm4),Iy=Number(d.Iy_mm4),J=Number(d.J_mm4),h0=Number(d.h0_mm);
 const rx=Math.sqrt(Ix/A),ry=Math.sqrt(Iy/A);
 const lambdaX=Number(d.Kx)*Number(d.Lx_mm)/rx,lambdaY=Number(d.Ky)*Number(d.Ly_mm)/ry;
 const lambdaZ=Math.max(lambdaX,lambdaY);
 const Cw=Iy*h0*h0/4;
 const FeX=PI*PI*E/(lambdaX*lambdaX),FeY=PI*PI*E/(lambdaY*lambdaY);
 const kzLz=Number(d.Kz)*Number(d.Lz_mm);
 const FeT=(PI*PI*E*Cw/(kzLz*kzLz)+G*J)/(Ix+Iy);
 const modes=[{mode:"flexural-x",Fe:FeX},{mode:"flexural-y",Fe:FeY},{mode:"torsional",Fe:FeT}].sort((a,b)=>a.Fe-b.Fe);
 const governing=modes[0],curve=fcrFromFe(Number(d.Fy_MPa),governing.Fe);
 warnings.push("نسبت‌های لاغری حول دو محور گزارش شده‌اند؛ هیچ سقف عددی عمومی بدون ارجاع قطعی به بند قابل اعمال و شرایط پروژه به‌صورت خودکار تحمیل نشده است.");
 if(!finitePositive(FeT))issues.push("تنش بحرانی کمانش پیچشی معتبر نیست؛ J و Cw و طول مهارنشده پیچشی بازبینی شود.");
 if(issues.length)return {ok:false,issues,warnings,slenderness:{x:lambdaX,y:lambdaY},elasticCriticalStress_MPa:{x:FeX,y:FeY,torsional:FeT},scope:"global-buckling-only",disclaimer:"مقاومت طراحی ارائه نشد."};
 const Pn=curve.Fcr*A/1000,phiPn=0.9*Pn,allowable=Pn/1.67;
 warnings.push("فقط کمانش خمشی حول دو محور و کمانش پیچشی مقطع I دو‌محوره بررسی شده‌اند.");
 warnings.push("کمانش موضعی فقط با فرض صریح غیرلاغر بودن مقطع پذیرفته شده؛ بررسی مستقل جدول‌های مبحث دهم باید در پرونده طراحی ثبت شود.");
 warnings.push("این خروجی اندرکنش فشار و خمش، تحلیل مرتبه دوم، اثرات لرزه‌ای، اعضای متغیرمقطع و ضوابط اعضای مرکب را پوشش نمی‌دهد.");
 return {ok:true,issues,warnings,scope:"global-buckling-only",section:{Ag_mm2:A,rx_mm:rx,ry_mm:ry,Cw_mm6:Cw},slenderness:{x:lambdaX,y:lambdaY,max:Math.max(lambdaX,lambdaY)},elasticCriticalStress_MPa:{x:FeX,y:FeY,torsional:FeT},governingMode:governing.mode,Fe_MPa:governing.Fe,Fcr_MPa:curve.Fcr,curveBranch:curve.branch,Pn_kN:Pn,LRFD:{phi:0.9,designStrength_kN:phiPn},ASD:{Omega:1.67,allowableStrength_kN:allowable},disclaimer:"محاسبه محدود مقاومت کمانش کلی برای مقطع I دو‌محوره متقارن و غیرلاغر؛ این نتیجه به‌تنهایی تأیید نهایی طراحی یا مجوز اجرا نیست."};
}
function selfTest(){
 const base={sectionType:"doubly-symmetric-I",Ag_mm2:10000,Ix_mm4:8e8,Iy_mm4:1e8,J_mm4:2e6,h0_mm:500,Lx_mm:6000,Ly_mm:6000,Lz_mm:6000,Kx:1,Ky:1,Kz:1,Fy_MPa:235,E_MPa:200000,G_MPa:76923,localSlendernessReviewed:true,localSlendernessClass:"non-slender"};
 const tests=[];
 const t=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("valid doubly symmetric I section",()=>analyze(base).ok);
 t("flexural and torsional modes reported",()=>{const r=analyze(base);return !!r.elasticCriticalStress_MPa.x&&!!r.elasticCriticalStress_MPa.y&&!!r.elasticCriticalStress_MPa.torsional&&r.governingMode;});
 t("LRFD and ASD factors",()=>{const r=analyze(base);return Math.abs(r.LRFD.designStrength_kN/r.Pn_kN-.9)<1e-12&&Math.abs(r.Pn_kN/r.ASD.allowableStrength_kN-1.67)<1e-12;});
 t("invalid missing dimensions rejected",()=>!analyze({...base,Lx_mm:0}).ok);
 t("missing elastic properties rejected without defaults",()=>!analyze({...base,E_MPa:null}).ok&&!analyze({...base,G_MPa:null}).ok);
 t("asymmetric section rejected",()=>!analyze({...base,sectionType:"channel"}).ok);
 t("local slenderness not reviewed rejected",()=>!analyze({...base,localSlendernessReviewed:false}).ok);
 t("slender elements require effective-area implementation",()=>!analyze({...base,localSlendernessClass:"slender"}).ok);
 t("large slenderness is reported without unverified cutoff",()=>{const r=analyze({...base,Lx_mm:30000,Ly_mm:30000,Lz_mm:30000});return r.ok&&r.slenderness.max>200&&r.warnings.some(x=>x.includes("سقف عددی"));});
 t("inelastic column curve branch",()=>fcrFromFe(235,200).branch==="inelastic");
 t("elastic column curve branch",()=>fcrFromFe(235,80).branch==="elastic");
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests,scope:"deterministic formula/software tests only"};
}
root.SteelCompressionCapacity={analyze,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/compression-design-integration.js ===== */
/* SAHROUD STEEL — compression capacity integration.
 * Stores explicit section and stability inputs for the limited global-buckling engine.
 * A utilization ratio is exposed only for verified pure-axial cases; combined actions remain blocked.
 */
(function(root){
"use strict";
const GROUPS=[["column","ستون"],["rafter","رفتر"]];
const FIELDS=[
 ["Ag_mm2","مساحت کل Ag (mm²)"],["Ix_mm4","ممان اینرسی Ix (mm⁴)"],["Iy_mm4","ممان اینرسی Iy (mm⁴)"],
 ["J_mm4","ثابت پیچشی J (mm⁴)"],["h0_mm","فاصله مرکز تا مرکز بال‌ها h0 (mm)"],
 ["Lx_mm","طول مهارنشده محور x (mm)"],["Ly_mm","طول مهارنشده محور y (mm)"],["Lz_mm","طول مهارنشده پیچشی (mm)"],
 ["Kx","ضریب Kx"],["Ky","ضریب Ky"],["Kz","ضریب Kz"],["Fy_MPa","تنش تسلیم Fy (MPa)"],["E_MPa","مدول الاستیسیته E (MPa)"],["G_MPa","مدول برشی G (MPa)"]
];
const $=id=>document.getElementById(id);
let data={schemaVersion:1,groups:{column:{},rafter:{}},memberOverrides:{}};
const EVIDENCE_KEYS=["document","revision","locator","authority"];
function normalizeEvidence(v){const out={};EVIDENCE_KEYS.forEach(k=>out[k]=String(v?.[k]??"").trim());return out;}
function evidenceIssues(label,v){const e=normalizeEvidence(v),missing=EVIDENCE_KEYS.filter(k=>!e[k]);return missing.length?[label+" — مدرک ناقص است: "+missing.join("، ")]:[];}
function evidenceText(v){const e=normalizeEvidence(v);return EVIDENCE_KEYS.map(k=>e[k]).join(" | ");}
function parseEvidenceText(v){const parts=String(v??"").split("|").map(x=>x.trim());return parts.length===4?{document:parts[0],revision:parts[1],locator:parts[2],authority:parts[3]}:{document:"",revision:"",locator:"",authority:""};}
function normalize(v){
 const out={schemaVersion:1,groups:{},memberOverrides:{}};
 GROUPS.forEach(([g])=>{
  const src=v?.groups?.[g]||{},dst={};
  FIELDS.forEach(([k])=>{const n=Number(src[k]);dst[k]=src[k]!==""&&src[k]!==null&&src[k]!==undefined&&Number.isFinite(n)?n:null;});
  dst.sectionTypeReviewed=src.sectionTypeReviewed===true;
  dst.sectionPropertiesMatchReviewed=src.sectionPropertiesMatchReviewed===true;
  dst.localSlendernessReviewed=src.localSlendernessReviewed===true;
  dst.localSlendernessClass=src.localSlendernessClass==="non-slender"?"non-slender":"unreviewed";
  dst.note=String(src.note||"");
  dst.sectionEvidence=normalizeEvidence(src.sectionEvidence);
  dst.materialEvidence=normalizeEvidence(src.materialEvidence);
  dst.stabilityEvidence=normalizeEvidence(src.stabilityEvidence);
  out.groups[g]=dst;
 });
 const overrides=v?.memberOverrides||{};
 Object.keys(overrides).forEach(id=>{const src=overrides[id]||{},row={};["Lx_mm","Ly_mm","Lz_mm"].forEach(k=>{const n=Number(src[k]);row[k]=src[k]!==null&&src[k]!==undefined&&src[k]!==""&&Number.isFinite(n)&&n>0?n:null;});row.restraintEvidence=normalizeEvidence(src.restraintEvidence);out.memberOverrides[String(id)]=row;});
 return out;
}
function getData(){return JSON.parse(JSON.stringify(data));}
function readUI(){
 GROUPS.forEach(([g])=>{
  if(!$("cc_"+g+"_Ag_mm2"))return;
  const d={};
  FIELDS.forEach(([k])=>{const el=$("cc_"+g+"_"+k);d[k]=el&&el.value!==""?Number(el.value):null;});
  d.sectionTypeReviewed=$("cc_"+g+"_sectionTypeReviewed")?.checked===true;
  d.sectionPropertiesMatchReviewed=$("cc_"+g+"_sectionPropertiesMatchReviewed")?.checked===true;
  d.localSlendernessReviewed=$("cc_"+g+"_localSlendernessReviewed")?.checked===true;
  d.localSlendernessClass=d.localSlendernessReviewed?"non-slender":"unreviewed";
  d.note=$("cc_"+g+"_note")?.value||"";
  d.sectionEvidence=parseEvidenceText($("cc_"+g+"_sectionEvidence")?.value);
  d.materialEvidence=parseEvidenceText($("cc_"+g+"_materialEvidence")?.value);
  d.stabilityEvidence=parseEvidenceText($("cc_"+g+"_stabilityEvidence")?.value);
  data.groups[g]=d;
 });
 const resultHost=$("compressionCapacityResults");
 if(resultHost){
 resultHost.querySelectorAll("[data-member-length]").forEach(el=>{const id=el.getAttribute("data-member-id"),key=el.getAttribute("data-member-length");if(!id||!key)return;data.memberOverrides[id]=data.memberOverrides[id]||{Lx_mm:null,Ly_mm:null,Lz_mm:null};data.memberOverrides[id][key]=el.value===""?null:Number(el.value);});
 resultHost.querySelectorAll("[data-member-restraint-evidence]").forEach(el=>{const id=el.getAttribute("data-member-id");if(!id)return;data.memberOverrides[id]=data.memberOverrides[id]||{Lx_mm:null,Ly_mm:null,Lz_mm:null};data.memberOverrides[id].restraintEvidence=parseEvidenceText(el.value);});
}
 return getData();
}
function setData(v){data=normalize(v);render();}
function materialFy(g){
 const m=root.SteelMemberDesignInputs?.getForGroup?.(g)||{};
 if(Number(m.Fy)>0)return Number(m.Fy);
 const s=root.SteelSections?.read?.()||{};
 return Number(s.material?.Fy_MPa)>0?Number(s.material.Fy_MPa):null;
}
function getInput(g){
 const d=readUI().groups[g],member=root.SteelMemberDesignInputs?.getForGroup?.(g)||{};
 return {...d,sectionType:d.sectionTypeReviewed?"doubly-symmetric-I":"unreviewed",
  Fy_MPa:Number(d.Fy_MPa)>0?d.Fy_MPa:materialFy(g),
  E_MPa:Number(d.E_MPa)>0?Number(d.E_MPa):(Number(member.E_MPa)>0?Number(member.E_MPa):null),
  G_MPa:Number(d.G_MPa)>0?Number(d.G_MPa):(Number(member.G_MPa)>0?Number(member.G_MPa):null)};
}
function groupEvidenceIssues(g,source){
 const d=source||data.groups[g]||{};
 return [
  ...evidenceIssues("منبع هندسه و خواص مقطع گروه "+g,d.sectionEvidence),
  ...evidenceIssues("گواهی مصالح گروه "+g,d.materialEvidence),
  ...evidenceIssues("مبنای مهاربندی و طول‌های مؤثر گروه "+g,d.stabilityEvidence)
 ];
}
function analyzeGroup(g){
 const evidence=groupEvidenceIssues(g);
 if(evidence.length)return {ok:false,issues:evidence,scope:"blocked-missing-source-provenance"};
 const engine=root.SteelCompressionCapacity;
 if(!engine||typeof engine.analyze!=="function")throw Error("موتور مقاومت فشاری بارگذاری نشده است.");
 const tapered=root.SteelTaperedSections?.getData?.().groups?.[g];
 if(tapered?.enabled===true)return {ok:false,issues:["عضو "+(g==="column"?"ستون":"رفتر")+" به‌صورت متغیرعمق تعریف شده است؛ موتور فعلی فقط عضو منشوری را می‌پذیرد."]};
 const input=getInput(g);
 input.localSlendernessClass=input.localSlendernessReviewed?"non-slender":"unreviewed";
 return engine.analyze(input);
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function buildCompressionDemandRows(forceResult){
 const members=Array.isArray(forceResult?.members)?forceResult.members:[];
 const expectedCaseCount=Number(forceResult?.expectedCaseCount)||0;
 const sourceComplete=forceResult?.success!==false;
 const rows=members.map(m=>{
  const ends=Array.isArray(m.ends)?m.ends:[];
  let demand=0,caseLabel="",governing=null,validCount=0,invalidCount=0;
  const simultaneousCases=[];
  ends.forEach(e=>{
   const raw=Array.isArray(e.values)?e.values:[];
   const v=raw.map(Number);
   if(v.length!==12||!v.every(Number.isFinite)){invalidCount++;simultaneousCases.push({label:String(e.label||""),valid:false,source:e.source||null});return;}
   validCount++;
   simultaneousCases.push({label:String(e.label||""),valid:true,source:e.source||null,vector:v.slice(),endI:{N:v[0],Vy:v[1],Vz:v[2],T:v[3],My:v[4],Mz:v[5]},endJ:{N:v[6],Vy:v[7],Vz:v[8],T:v[9],My:v[10],Mz:v[11]}});
   const ni=v[0],nj=v[6],candidate=Math.max(0,ni,-nj);
   if(candidate>demand){
    demand=candidate;caseLabel=e.label||"";
    const end=ni>=-nj?"I":"J",o=end==="I"?0:6;
    governing={label:caseLabel,end,compression_N:candidate,
     Vy_N:v[o+1],Vz_N:v[o+2],T_Nmm:v[o+3],My_Nmm:v[o+4],Mz_Nmm:v[o+5],
     otherEnd:{Vy_N:v[end==="I"?7:1],Vz_N:v[end==="I"?8:2],T_Nmm:v[end==="I"?9:3],My_Nmm:v[end==="I"?10:4],Mz_Nmm:v[end==="I"?11:5]}};
   }
  });
  const nonAxial=ends.some(e=>{const v=Array.isArray(e.values)?e.values.map(Number):[];return v.length===12&&v.every(Number.isFinite)&&[1,2,3,4,5,7,8,9,10,11].some(i=>Math.abs(v[i])>1e-6);});
  const coverageComplete=sourceComplete&&invalidCount===0&&validCount>0&&(!expectedCaseCount||validCount===expectedCaseCount);
  return {id:String(m.id||""),parentMemberId:m.parentMemberId||null,taperSegmentIndex:m.taperSegmentIndex||null,sectionKey:String(m.sectionKey||""),length_m:Number(m.length)||null,compressionDemand_kN:demand/1000,governingCase:caseLabel,governing,simultaneousCases,axialOnlyCase:!!governing&&!nonAxial,interactionRequired:!!governing&&nonAxial,caseCount:validCount,expectedCaseCount,invalidCaseCount:invalidCount,coverageComplete};
 }).filter(r=>r.caseCount>0||r.invalidCaseCount>0).sort((a,b)=>a.sectionKey.localeCompare(b.sectionKey)||a.id.localeCompare(b.id));
 return rows;
}
function buildCompressionDemandRowsFrom3D(combinations,modelData){
 const cases=Array.isArray(combinations)?combinations:[];
 if(!cases.length)return {success:false,issues:["نتایج ترکیبات تحلیل سه‌بعدی در دسترس نیستند."],members:[],expectedCaseCount:0};
 const modelMembers=Array.isArray(modelData?.members)?modelData.members:[];
 const issues=[],modelById=new Map(),resultIds=new Set();
 if(!modelMembers.length)issues.push("فهرست اعضای مدل مرجع موجود نیست؛ کنترل کامل بودن پوشش تحلیل ممکن نیست.");
 modelMembers.forEach((m,i)=>{
  const id=String(m?.id??"").trim();
  if(!id){issues.push("شناسه یکی از اعضای مدل مرجع خالی است.");return;}
  if(modelById.has(id))issues.push("شناسه عضو در مدل مرجع تکراری است: "+id+".");
  else modelById.set(id,m);
 });
 cases.forEach((c,ci)=>{
  const label=String(c?.id||c?.label||c?.name||ci+1);
  if(!Array.isArray(c?.members)){issues.push("فهرست اعضای ترکیب "+label+" موجود نیست.");return;}
  c.members.forEach(m=>{
   const id=String(m?.id??"").trim();
   if(!id){issues.push("شناسه عضو در نتایج ترکیب "+label+" خالی است.");return;}
   resultIds.add(id);
  });
 });
 const allIds=new Set([...modelById.keys(),...resultIds]);
 resultIds.forEach(id=>{if(!modelById.has(id))issues.push("عضو "+id+" در نتایج تحلیل وجود دارد اما در مدل مرجع یافت نشد.");});
 const rows=[...allIds].map(id=>{
  const source=modelById.get(id)||{};
  const sample=(cases.find(c=>Array.isArray(c?.members)&&c.members.some(m=>String(m?.id??"").trim()===id))?.members||[]).find(m=>String(m?.id??"").trim()===id)||{};
  const ends=cases.map((c,ci)=>{
   const label=String(c?.id||c?.label||c?.name||"—");
   const matches=Array.isArray(c?.members)?c.members.filter(m=>String(m?.id??"").trim()===id):[];
   if(matches.length!==1)return {label,values:[],invalidForceVector:true};
   const forces=matches[0]?.localEndForces;
   return {label,source:c?.source||null,values:Array.isArray(forces)?forces.slice(0,12):[],invalidForceVector:false};
  });
  return {id,parentMemberId:sample.parentMemberId||source.parentMemberId||null,taperSegmentIndex:sample.taperSegmentIndex??source.taperSegmentIndex??null,
   sectionKey:String(source.sectionKey||sample.sectionKey||source.section?.sectionKey||""),length:Number(sample.length||source.length)||null,ends};
 });
 cases.forEach(c=>{
  const members=Array.isArray(c?.members)?c.members:[];
  const seen=members.map(m=>String(m?.id??"").trim()).filter(Boolean);
  if(new Set(seen).size!==seen.length)issues.push("شناسه عضو تکراری در ترکیب "+String(c?.id||c?.label||"—")+".");
  modelById.forEach((_,id)=>{
   const count=seen.filter(x=>x===id).length;
   if(count!==1)issues.push("عضو "+id+" در ترکیب "+String(c?.id||c?.label||"—")+" دقیقاً یک نتیجه ندارد.");
  });
 });
 const success=issues.length===0;
 const prepared=buildCompressionDemandRows({members:rows,expectedCaseCount:cases.length,success});
 return {success,members:prepared,expectedCaseCount:cases.length,caseIds:cases.map(c=>String(c?.id||c?.label||c?.name||"—")),issues};
}

function evaluateAxialOnlyMember(row,base,override,taperedEnabled){
 if(row?.coverageComplete!==true)return {ok:false,reason:"پوشش همه ترکیب‌های تحلیل سه‌بعدی برای این عضو کامل نیست."};
 if(!row?.axialOnlyCase||row.interactionRequired)return {ok:false,reason:"بارگذاری حاکم دارای خمش، برش یا پیچش هم‌زمان است؛ کنترل اندرکنش کامل هنوز موجود نیست."};
 if(!(row.compressionDemand_kN>0))return {ok:false,reason:"تقاضای فشاری مثبت در حالت حاکم ثبت نشده است."};
 const cap=memberCapacityFromInput(row,base,override,taperedEnabled);
 if(!cap.ok)return {ok:false,reason:(cap.issues||[]).join("؛ ")};
 const ratio=row.compressionDemand_kN/cap.LRFD.designStrength_kN;
 return {ok:true,scope:"axial-only-global-buckling-screen",demand_kN:row.compressionDemand_kN,designStrength_kN:cap.LRFD.designStrength_kN,ratio,withinAxialStrength:ratio<=1,capacity:cap,disclaimer:"فقط غربال مقاومت محوری در حالت بدون خمش/برش/پیچش؛ تأیید طراحی عضو نیست."};
}
function selfTest(){
 const rows=buildCompressionDemandRows({members:[
  {id:"T1",sectionKey:"column",ends:[{label:"TENSION",values:[-1000,0,0,0,0,0,1000,0,0,0,0,0]}]},
  {id:"C1",sectionKey:"column",ends:[{label:"C1",values:[800,0,0,0,0,0,-800,0,0,0,0,0]},{label:"C2",values:[1500,0,0,0,0,0,-1500,0,0,0,0,0]}]},
  {id:"BAD",sectionKey:"rafter",ends:[{label:"BAD",values:[0,1,2]}]}
 ]});
 const tension=rows.find(r=>r.id==="T1"),compression=rows.find(r=>r.id==="C1");
 const ev={document:"design-basis.pdf",revision:"R1",locator:"p.4",authority:"engineer-reviewed"};
 const base={sectionPropertiesMatchReviewed:true,sectionType:"doubly-symmetric-I",sectionTypeReviewed:true,localSlendernessReviewed:true,localSlendernessClass:"non-slender",Ag_mm2:10000,Ix_mm4:8e8,Iy_mm4:1e8,J_mm4:2e6,h0_mm:500,Kx:1,Ky:1,Kz:1,Fy_MPa:235,E_MPa:200000,G_MPa:76923,nu:0.3,sectionEvidence:ev,materialEvidence:ev,stabilityEvidence:ev};
 const restraint={Lx_mm:6000,Ly_mm:4000,Lz_mm:5000,restraintEvidence:ev};
 const good=memberCapacityFromInput({id:"M1",sectionKey:"column"}, {...base}, {...restraint},false);
 const missing=memberCapacityFromInput({id:"M2",sectionKey:"column"}, {...base}, {},false);
 const noGroupEvidence=memberCapacityFromInput({id:"M5",sectionKey:"column"}, {...base,sectionEvidence:{}}, {...restraint},false);
 const noMaterialEvidence=memberCapacityFromInput({id:"M7",sectionKey:"column"}, {...base,materialEvidence:{}}, {...restraint},false);
 const noStabilityEvidence=memberCapacityFromInput({id:"M8",sectionKey:"column"}, {...base,stabilityEvidence:{}}, {...restraint},false);
 const noRestraintEvidence=memberCapacityFromInput({id:"M6",sectionKey:"column"}, {...base}, {Lx_mm:6000,Ly_mm:4000,Lz_mm:5000},false);
 const mismatch=memberCapacityFromInput({id:"M3",sectionKey:"column"}, {...base,sectionPropertiesMatchReviewed:false}, {Lx_mm:6000,Ly_mm:4000,Lz_mm:5000},false);
 const tapered=memberCapacityFromInput({id:"M4",sectionKey:"column",taperSegmentIndex:1}, {...base}, {Lx_mm:6000,Ly_mm:4000,Lz_mm:5000},false);
 const tests=[
  {name:"tension is not classified as compression",pass:!!tension&&tension.compressionDemand_kN===0},
  {name:"compression demand uses largest end compression",pass:!!compression&&compression.compressionDemand_kN===1.5&&compression.governingCase==="C2"},
  {name:"same-case bending and shear block axial-only screen",pass:(()=>{const x=buildCompressionDemandRows({members:[{id:"B",sectionKey:"column",ends:[{label:"B1",values:[1000,0,0,0,0,250000,-1000,0,0,0,0,0]}]}]})[0];return x.interactionRequired&&!x.axialOnlyCase;})()},
  {name:"all concurrent case vectors and both ends are retained without envelope mixing",pass:(()=>{const x=buildCompressionDemandRows({members:[{id:"C",sectionKey:"column",ends:[{label:"ULS-1",values:[1000,2,3,4,5,6,-1000,-2,-3,-4,-5,-6]},{label:"ULS-2",values:[2000,20,30,40,50,60,-2000,-20,-30,-40,-50,-60]}]}]})[0];return x.simultaneousCases.length===2&&x.simultaneousCases[0].endI.My===5&&x.simultaneousCases[1].endJ.Mz===-60&&x.simultaneousCases[0].vector[1]===2;})()},
  {name:"pure axial case is separately identified",pass:(()=>{const x=buildCompressionDemandRows({members:[{id:"A",sectionKey:"column",ends:[{label:"A1",values:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]}]})[0];return x.axialOnlyCase&&!x.interactionRequired;})()},
  {name:"bending in any other combination blocks pure-axial screening",pass:(()=>{const x=buildCompressionDemandRows({members:[{id:"MIX",sectionKey:"column",ends:[{label:"AXIAL",values:[2000,0,0,0,0,0,-2000,0,0,0,0,0]},{label:"BENDING",values:[1000,0,0,0,0,250000,-1000,0,0,0,0,0]}]}]})[0];return x.interactionRequired&&!x.axialOnlyCase;})()},
  {name:"invalid force vectors are retained as blocked evidence, never silently ignored",pass:(()=>{const x=rows.find(r=>r.id==="BAD");return !!x&&x.coverageComplete===false&&x.invalidCaseCount===1;})()},
  {name:"3D combinations are mapped without losing per-case concurrent actions",pass:(()=>{const x=buildCompressionDemandRowsFrom3D([{id:"U1",members:[{id:"M1",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]},{id:"U2",members:[{id:"M1",localEndForces:[1500,0,0,0,0,0,-1500,0,0,0,0,0]}]}],{members:[{id:"M1",sectionKey:"column",length:6}]});return x.success&&x.members[0].coverageComplete&&x.members[0].caseCount===2&&x.members[0].compressionDemand_kN===1.5;})()},
  {name:"missing member in any 3D combination blocks its demand coverage",pass:(()=>{const x=buildCompressionDemandRowsFrom3D([{id:"U1",members:[{id:"M1",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]},{id:"U2",members:[]}],{members:[{id:"M1",sectionKey:"column"}]});return !x.success&&!x.members[0].coverageComplete;})()},
  {name:"model member absent from every combination is retained and blocked",pass:(()=>{const x=buildCompressionDemandRowsFrom3D([{id:"U1",members:[{id:"M1",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]},{id:"U2",members:[{id:"M1",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]}],{members:[{id:"M1",sectionKey:"column"},{id:"M2",sectionKey:"rafter"}]});const m=x.members.find(r=>r.id==="M2");return !x.success&&!!m&&m.coverageComplete===false&&m.invalidCaseCount===2;})()},
  {name:"global 3D mapping issues block every member capacity row",pass:(()=>{const x=buildCompressionDemandRowsFrom3D([{id:"U1",members:[{id:"M1",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]},{id:"EXTRA",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]}],{members:[{id:"M1",sectionKey:"column"}]});return !x.success&&x.members.every(r=>r.coverageComplete===false);})()},
  {name:"results for members outside the reference model block completeness",pass:(()=>{const x=buildCompressionDemandRowsFrom3D([{id:"U1",members:[{id:"M1",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]},{id:"EXTRA",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]}],{members:[{id:"M1",sectionKey:"column"}]});return !x.success&&x.issues.some(s=>s.includes("در مدل مرجع یافت نشد"));})()},
  {name:"missing model member registry blocks completeness",pass:(()=>{const x=buildCompressionDemandRowsFrom3D([{id:"U1",members:[{id:"M1",localEndForces:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]}],{});return !x.success&&x.issues.some(s=>s.includes("مدل مرجع موجود نیست"));})()},
  {name:"member capacity calculated only with sourced group and member restraint records",pass:good.ok&&good.LRFD.designStrength_kN>0},
  {name:"missing member unbraced lengths are blocked",pass:!missing.ok},
  {name:"missing section-property provenance blocks member capacity",pass:!noGroupEvidence.ok&&noGroupEvidence.scope==="blocked-missing-source-provenance"},
  {name:"missing material certificate provenance blocks member capacity",pass:!noMaterialEvidence.ok&&noMaterialEvidence.scope==="blocked-missing-source-provenance"},
  {name:"missing group stability provenance blocks member capacity",pass:!noStabilityEvidence.ok&&noStabilityEvidence.scope==="blocked-missing-source-provenance"},
  {name:"missing member-specific restraint provenance blocks member capacity",pass:!noRestraintEvidence.ok&&noRestraintEvidence.scope==="blocked-missing-source-provenance"},
  {name:"unconfirmed section-property mapping is blocked",pass:!mismatch.ok},
  {name:"tapered analysis segment is blocked",pass:!tapered.ok}
 ];
 const priorData=getData();
 const groupBase={...base,Lx_mm:6000,Ly_mm:4000,Lz_mm:5000};
 setData({schemaVersion:1,groups:{column:{...groupBase,sectionEvidence:{},materialEvidence:ev,stabilityEvidence:ev}}});
 const blockedGroup=analyzeGroup("column");
 tests.push({name:"group-level compression calculation is blocked when section evidence is absent",pass:blockedGroup.ok===false&&blockedGroup.scope==="blocked-missing-source-provenance"});
 setData({schemaVersion:1,groups:{column:groupBase}});
 const persisted=getData().groups.column;
 tests.push({name:"source provenance records survive project data normalization",pass:persisted.sectionEvidence.document===ev.document&&persisted.materialEvidence.locator===ev.locator&&persisted.stabilityEvidence.authority===ev.authority});
 setData(priorData);
 return {passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests};
}
function sectionDefaults(g){
 const s=root.SteelSections?.read?.()||{},m=s[g]||{},p=s.analysis3d?.groups?.[g]||{};
 return {Ag_mm2:Number(m.A_cm2)>0?Number(m.A_cm2)*100:null,Ix_mm4:Number(m.Ix_cm4)>0?Number(m.Ix_cm4)*1e4:null,Iy_mm4:Number(m.Iy_cm4)>0?Number(m.Iy_cm4)*1e4:null,J_mm4:Number(p.J_cm4)>0?Number(p.J_cm4)*1e4:null};
}
function render(){
 const host=$("compressionCapacityIntegrationContent");if(!host)return;
 host.innerHTML=GROUPS.map(([g,label])=>{
  const d=data.groups[g]||{},defaults=sectionDefaults(g);
  return '<details class="sub-panel"><summary>'+label+' — ظرفیت فشاری محدود</summary><div class="form-grid">'+
   FIELDS.map(([k,caption])=>'<div class="field"><label for="cc_'+g+'_'+k+'">'+caption+'</label><input type="number" min="0" step="any" id="cc_'+g+'_'+k+'" value="'+(d[k]??defaults[k]??"")+'"></div>').join("")+
   '</div><div class="form-grid"><label><input type="checkbox" id="cc_'+g+'_sectionTypeReviewed" '+(d.sectionTypeReviewed?'checked':'')+'> تأیید شد مقطع واقعاً I دوبل‌متقارن است</label>'+
   '<label><input type="checkbox" id="cc_'+g+'_sectionPropertiesMatchReviewed" '+(d.sectionPropertiesMatchReviewed?'checked':'')+'> تأیید شد خواص هندسی ثبت‌شده دقیقاً به اعضای این گروه تعلق دارد</label>'+
   '<label><input type="checkbox" id="cc_'+g+'_localSlendernessReviewed" '+(d.localSlendernessReviewed?'checked':'')+'> کنترل لاغری موضعی بال و جان طبق جدول معتبر انجام شده و مقطع غیرلاغر است</label></div>'+
   '<div class="field"><label for="cc_'+g+'_note">یادداشت مهندسی</label><input type="text" id="cc_'+g+'_note" value="'+esc(d.note)+'" placeholder="توضیح تکمیلی"></div>'+
   '<details class="sub-panel"><summary>ردگیری مدارک الزامی (سند | ویرایش | محل دقیق | مرجع تأیید)</summary>'+
   ['sectionEvidence','materialEvidence','stabilityEvidence'].map((k,i)=>'<div class="field"><label for="cc_'+g+'_'+k+'">'+['مدرک هندسه و خواص مقطع','گواهی مصالح','مدرک مهاربندی و طول‌های مؤثر'][i]+'</label><input type="text" id="cc_'+g+'_'+k+'" value="'+esc(evidenceText(d[k]))+'" placeholder="drawing.pdf | R2 | Sheet 3 / Detail 4 | designer review"></div>').join('')+
   '</details></details>';
 }).join("")+
 '<div class="notice">مساحت، ممان‌های اینرسی و J در صورت خالی بودن، از رجیستر مقطع همین گروه به‌صورت اولیه خوانده می‌شوند (A: cm²→mm² و ممان‌ها: cm⁴→mm⁴)؛ آن‌ها را با مشخصات واقعی مقطع تطبیق دهید. مقدار h0 و طول‌های مهارنشده باید از هندسه و نقشه واقعی برداشت شوند. E و G فقط از ورودی صریح همین فرم یا رجیستر اختصاصی اعضا خوانده می‌شوند؛ مقدار پیش‌فرض یا تخمین برای آن‌ها وجود ندارد و در صورت فقدان، موتور مقاومت ظرفیت ارائه نمی‌کند. Fy از رجیستر گروه عضو یا پنل مصالح خوانده می‌شود، مگر آنکه جداگانه در این فرم وارد شود. Kها را بدون تحلیل/پیوست معتبر حدس نزنید.</div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="btnCompressionCapacityRun">محاسبه مقاومت کمانش کلی ستون و رفتر</button></div><div id="compressionCapacityResults"></div>';
}
function memberCapacityFromInput(row,base,override,taperedEnabled){
 const g=row.sectionKey;
 if(g!=="column"&&g!=="rafter")return {ok:false,issues:["گروه عضو در موتور فعلی پشتیبانی نمی‌شود."]};
 if(row.taperSegmentIndex!==null&&row.taperSegmentIndex!==undefined)return {ok:false,issues:["قطعه متعلق به عضو متغیرعمق است؛ ظرفیت منشوری مجاز نیست."]};
 if(taperedEnabled===true)return {ok:false,issues:["گروه در مدل متغیرعمق فعال است."]};
 if(base.sectionPropertiesMatchReviewed!==true)return {ok:false,issues:["یکسان بودن خواص هندسی ثبت‌شده با این عضو هنوز تأیید نشده است."]};
 const evidence=[...groupEvidenceIssues(g,base),...evidenceIssues("مرجع طول‌های مهارنشده/مهاربندی عضو "+String(row.id||""),override?.restraintEvidence)];
 if(evidence.length)return {ok:false,issues:evidence,scope:"blocked-missing-source-provenance"};
 for(const k of ["Lx_mm","Ly_mm","Lz_mm"]){
  if(!(Number(override?.[k])>0))return {ok:false,issues:["طول مهارنشده "+k+" برای این عضو باید جداگانه وارد و تأیید شود."]};
  base[k]=Number(override[k]);
 }
 base.localSlendernessClass=base.localSlendernessReviewed?"non-slender":"unreviewed";
 return root.SteelCompressionCapacity.analyze(base);
}
function capacityForMember(row){
 const g=row.sectionKey;
 if(g!=="column"&&g!=="rafter")return {ok:false,issues:["گروه عضو در موتور فعلی پشتیبانی نمی‌شود."]};
 const base=getInput(g),override=data.memberOverrides[String(row.id)]||{};
 const tapered=root.SteelTaperedSections?.getData?.().groups?.[g];
 return memberCapacityFromInput(row,base,override,tapered?.enabled===true);
}
function renderResults(){
 const host=$("compressionCapacityResults");if(!host)return;
 readUI();
 const html=GROUPS.map(([g,label])=>{
  let r;try{r=analyzeGroup(g);}catch(e){return '<div class="notice"><b>'+label+'</b><p>'+esc(e.message)+'</p></div>';}
  if(!r.ok)return '<div class="notice"><b>'+label+' — ظرفیت محاسبه نشد</b><ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>';
  return '<div class="notice"><b>'+label+' — نتیجه محدود کمانش کلی</b><p>حالت حاکم: '+esc(r.governingMode)+' | Fe='+r.Fe_MPa.toFixed(2)+' MPa | Fcr='+r.Fcr_MPa.toFixed(2)+' MPa</p>'+
   '<p>Pn='+r.Pn_kN.toFixed(2)+' kN | LRFD: φPn='+r.LRFD.designStrength_kN.toFixed(2)+' kN | ASD: Pn/Ω='+r.ASD.allowableStrength_kN.toFixed(2)+' kN</p>'+
   '<p>لاغری: λx='+r.slenderness.x.toFixed(1)+'، λy='+r.slenderness.y.toFixed(1)+'</p><ul>'+r.warnings.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>';
 }).join("");
 const modelData=root.SteelStructuralModel?.getData?.();
 const combinationResults=root.SteelStructuralModel?.combinationResults||root.SteelAnalysis?.combinationResults;
 const forceResult=Array.isArray(combinationResults)&&combinationResults.length
  ? buildCompressionDemandRowsFrom3D(combinationResults,modelData)
  : root.SteelMemberForceEnvelope?.getLast?.();
 const demandRows=buildCompressionDemandRows(forceResult);
 const demandHtml=demandRows.length?'<h4>تقاضای فشاری و ظرفیت کمانش کلی در سطح عضو</h4><p class="notice">برای هر عضو، سه طول مهارنشده را مستقل وارد کنید. خواص مقطع و مصالح از فرم گروه ستون/رفتر خوانده می‌شود؛ قبل از استفاده باید یکسان بودن آن‌ها با عضو انتخابی را کنترل کنید.</p><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>شناسه عضو/قطعه</th><th>گروه</th><th>ترکیب حاکم</th><th>انتهای حاکم</th><th>فشار بیشینه (kN)</th><th>Lx (mm)</th><th>Ly (mm)</th><th>Lz (mm)</th><th>مرجع مهاربندی عضو (سند | ویرایش | محل | تأییدکننده)</th><th>ظرفیت LRFD φPn (kN)</th><th>ظرفیت ASD (kN)</th><th>نسبت محوری P/φPn</th><th>نتیجه غربال</th></tr></thead><tbody>'+demandRows.map(r=>{
  const ov=data.memberOverrides[String(r.id)]||{},g=r.sectionKey;
  let cap=null,screen=null,why="";
  if(r.compressionDemand_kN>0&&r.coverageComplete){
   try{
    cap=capacityForMember(r);
    if(!cap.ok)why=(cap.issues||[]).join("؛ ");
    if(r.axialOnlyCase)screen=evaluateAxialOnlyMember(r,getInput(g),ov,root.SteelTaperedSections?.getData?.().groups?.[g]?.enabled===true);
    else why="نیازمند کنترل اندرکنش هم‌زمان N-M-V-T؛ نسبت محوری به‌تنهایی مجاز نیست.";
   }catch(e){why=e.message;}
  }else if(!r.coverageComplete)why="پوشش ترکیبات سه‌بعدی ناقص است؛ ظرفیت/نسبت نمایش داده نمی‌شود.";
  return '<tr><td>'+esc(r.id)+'</td><td>'+esc(g)+'</td><td>'+esc(r.governingCase||'—')+'</td><td>'+esc(r.governing?.end||'—')+'</td><td>'+r.compressionDemand_kN.toFixed(2)+'</td>'+["Lx_mm","Ly_mm","Lz_mm"].map(k=>'<td><input type="number" min="1" step="any" data-member-id="'+esc(r.id)+'" data-member-length="'+k+'" value="'+(ov[k]??"")+'" style="width:92px"></td>').join("")+'<td><input type="text" data-member-id="'+esc(r.id)+'" data-member-restraint-evidence value="'+esc(evidenceText(ov.restraintEvidence))+'" placeholder="drawing.pdf | R1 | Detail 2 | designer" style="min-width:220px"></td><td>'+(cap?.ok?cap.LRFD.designStrength_kN.toFixed(2):"—")+'</td><td>'+(cap?.ok?cap.ASD.allowableStrength_kN.toFixed(2):"—")+'</td><td>'+(screen?.ok?screen.ratio.toFixed(3):"—")+'</td><td>'+(screen?.ok?(screen.withinAxialStrength?"در محدوده مقاومت محوری — غیرنهایی":"بیش از مقاومت محوری — مردود در غربال"):esc(why||"ابتدا طول‌های مهارنشده را وارد کنید"))+'</td></tr>';
}).join("")+'</tbody></table></div><button type="button" class="btn" id="btnCompressionMemberRecalc">به‌روزرسانی ظرفیت اعضا</button>':'<div class="notice">برای نمایش تقاضای فشاری، ابتدا تحلیل سه‌بعدی و استخراج پوش نیروها را اجرا کنید.</div>';
 host.innerHTML=html+demandHtml+'<div class="notice">تقاضای فشاری از قرارداد علامت نیروی محلی حل‌گر استخراج شده است: کشش (Nᵢ منفی و Nⱼ مثبت) فشار محسوب نمی‌شود؛ فشار (Nᵢ مثبت و Nⱼ منفی) با بیشینه دو انتها گزارش می‌شود. این قرارداد با آزمون عضو محوری کنترل شده است. نسبت P/φPn فقط در حالتی نمایش داده می‌شود که بارگذاری حاکم واقعاً محوری باشد و در همان ترکیب هیچ خمش، برش یا پیچشی در دو انتهای عضو وجود نداشته باشد. در بارگذاری مرکب، محاسبه نسبت محوری مسدود است تا اندرکنش کامل پیاده‌سازی شود. همچنین کمانش موضعی، اعضای مرکب، مقاطع نامتقارن/متغیرعمق، اندرکنش فشار و خمش، تحلیل مرتبه دوم و کنترل لرزه‌ای خارج از دامنه‌اند. ظرفیت‌های نمایش‌داده‌شده فقط مقاومت کمانش کلی بر مبنای طول‌های واردشده هستند و به معنی قبولی عضو نیستند؛ تقاضا و ظرفیت تا زمان تأیید مبنای ترکیب‌بار و همه کنترل‌های لازم نباید به‌صورت نسبت بهره‌برداری یا قبولی/ردی تفسیر شوند.</div>';
 const recalc=$("btnCompressionMemberRecalc");if(recalc)recalc.addEventListener("click",()=>{readUI();renderResults();});
}
function init(){
 if($("compressionCapacityIntegrationPanel"))return;
 const anchor=$("compressionDesignPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="compressionCapacityIntegrationPanel";
 p.innerHTML='<div class="panel-title"><h3>محاسبه محدود مقاومت اعضای فشاری — ستون و رفتر</h3><span class="status">موتور کمانش کلی</span></div>'+
 '<div class="notice">این ماژول به موتور محاسباتی متصل است، اما تنها برای مقطع I دوبل‌متقارن منشوری و غیرلاغر. برای رفتر متغیرعمق، مقاطع لاغر یا هر مقطع دیگر فعلاً نتیجه ظرفیت معتبر تولید نمی‌شود.</div><div id="compressionCapacityIntegrationContent"></div>';
 anchor.insertAdjacentElement("afterend",p);render();
 $("btnCompressionCapacityRun")?.addEventListener("click",renderResults);
}
root.SteelCompressionCapacityIntegration={getData,readUI,setData,analyzeGroup,capacityForMember,memberCapacityFromInput,getSectionDefaults:sectionDefaults,buildCompressionDemandRows,buildCompressionDemandRowsFrom3D,selfTest,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/simultaneous-member-action-audit.js ===== */
/* SAHROUD STEEL — simultaneous member action audit.
 * Demand provenance only: preserves each exact load case and both member ends.
 * No resistance equations or code approval are produced by this module.
 */
(function(root){
"use strict";
const COMPONENTS=["N","Vy","Vz","T","My","Mz"];
const EPS=1e-9;
function finiteVector(values){
 return Array.isArray(values)&&values.length===12&&values.every(v=>Number.isFinite(Number(v)));
}
function endRecord(v,offset){
 return {N:Number(v[offset]),Vy:Number(v[offset+1]),Vz:Number(v[offset+2]),T:Number(v[offset+3]),My:Number(v[offset+4]),Mz:Number(v[offset+5])};
}
function nonzeroActions(e){return COMPONENTS.filter(k=>Math.abs(e[k])>EPS);}
function audit(forceResult){
 const issues=[],warnings=[],rows=[];
 const members=Array.isArray(forceResult?.members)?forceResult.members:[];
 const cases=Array.isArray(forceResult?.cases)?forceResult.cases:[];
 if(!members.length)issues.push("گزارش عضو/نیرو خالی است.");
 if(!cases.length)warnings.push("فهرست مرجع ترکیبات بار در گزارش موجود نیست؛ پوشش ترکیبات مستقل قابل اثبات نیست.");
 const ids=new Set();
 members.forEach(m=>{
  const id=String(m?.id||"");
  if(!id)issues.push("عضوی بدون شناسه یکتا در گزارش وجود دارد.");
  if(ids.has(id))issues.push("شناسه عضو تکراری است: "+id);
  ids.add(id);
  const entries=Array.isArray(m?.ends)?m.ends:[];
  if(!entries.length){issues.push("برای عضو "+(id||"بدون شناسه")+" هیچ بردار نیروی انتهایی ثبت نشده است.");return;}
  const labels=new Set();
  entries.forEach(entry=>{
   const label=String(entry?.label||"");
   if(!label)issues.push("برچسب ترکیب بار برای عضو "+id+" خالی است.");
   if(labels.has(label))issues.push("ترکیب بار "+label+" برای عضو "+id+" تکراری است.");
   labels.add(label);
   if(!finiteVector(entry?.values)){
    issues.push("بردار ۱۲ مؤلفه‌ای عضو "+id+" در حالت "+(label||"نامشخص")+" ناقص یا نامعتبر است.");
    return;
   }
   const v=entry.values.map(Number),I=endRecord(v,0),J=endRecord(v,6);
   const activeI=nonzeroActions(I),activeJ=nonzeroActions(J);
   const maxAbs=Math.max(...v.map(Math.abs));
   rows.push({memberId:id,parentMemberId:m.parentMemberId||null,sectionKey:String(m.sectionKey||""),caseLabel:label,
    I,J,activeI,activeJ,maxAbs,axialOnly:activeI.every(k=>k==="N")&&activeJ.every(k=>k==="N"),
    combinedAction:activeI.some(k=>k!=="N")||activeJ.some(k=>k!=="N"),
    source:"member-force-envelope.ends.values[12]"});
  });
  if(cases.length){
   const expected=cases.map(c=>String(c?.label||"")).filter(Boolean);
   expected.forEach(label=>{if(!labels.has(label))issues.push("حالت "+label+" در گزارش عضو "+id+" وجود ندارد.");});
   labels.forEach(label=>{if(!expected.includes(label))warnings.push("حالت "+label+" برای عضو "+id+" خارج از فهرست مرجع ترکیبات گزارش شده است.");});
  }
 });
 const combined=rows.filter(r=>r.combinedAction);
 const axial=rows.filter(r=>r.axialOnly);
 const noDemand=rows.filter(r=>!r.maxAbs);
 return {ok:issues.length===0,designApproved:false,issues:[...new Set(issues)],warnings:[...new Set(warnings)],rows,
  summary:{members:members.length,caseEndRows:rows.length,combinedActionRows:combined.length,axialOnlyRows:axial.length,zeroDemandRows:noDemand.length},
  combinedActionRows:combined.map(r=>({memberId:r.memberId,caseLabel:r.caseLabel,I:r.I,J:r.J,activeI:r.activeI,activeJ:r.activeJ})),
  rules:["هر ردیف فقط متعلق به یک عضو و یک ترکیب بار است؛ مؤلفه‌های ترکیبات متفاوت ادغام نمی‌شوند.",
   "نیروهای I و J از همان بردار ۱۲ مؤلفه‌ای استخراج شده‌اند و جداگانه نگهداری می‌شوند.",
   "این ممیزی فقط منشأ و هم‌زمانی تقاضا را کنترل می‌کند؛ ظرفیت، نسبت بهره‌برداری یا قبولی آیین‌نامه‌ای محاسبه نمی‌کند.",
   "برای اعضای متغیرمقطع، شناسه والد باید به مسیر طراحی اختصاصی taper متصل شود." ]};
}
function selfTest(){
 const good={cases:[{label:"ULS-A"},{label:"ULS-B"}],members:[{id:"C1",sectionKey:"column",ends:[
  {label:"ULS-A",values:[100,0,0,0,0,0,90,0,0,0,0,0]},
  {label:"ULS-B",values:[80,5,0,2,0,30,70,4,0,1,0,25]}]}]};
 const r=audit(good);
 const broken=audit({cases:[{label:"ULS-A"}],members:[{id:"X",ends:[{label:"ULS-A",values:[1,2]}]}]});
 const dup=audit({cases:[{label:"A"}],members:[{id:"X",ends:[{label:"A",values:Array(12).fill(0)},{label:"A",values:Array(12).fill(0)}]}]});
 const missing=audit({cases:[{label:"A"},{label:"B"}],members:[{id:"X",ends:[{label:"A",values:Array(12).fill(0)}]}]});
 const tests=[
  {name:"keeps each combination as a separate row",pass:r.rows.length===2&&r.rows[0].caseLabel==="ULS-A"&&r.rows[1].caseLabel==="ULS-B"},
  {name:"retains simultaneous six-component actions at both ends",pass:r.rows[1].I.Vy===5&&r.rows[1].I.T===2&&r.rows[1].J.Vy===4&&r.rows[1].J.My===0&&r.rows[1].J.Mz===25},
  {name:"classifies combined action without generating utilization",pass:r.summary.combinedActionRows===1&&r.rows[1].combinedAction&&r.designApproved===false},
  {name:"identifies pure axial cases only when both ends have no other action",pass:r.rows[0].axialOnly===true},
  {name:"rejects malformed 12-component vectors",pass:!broken.ok&&broken.issues.some(x=>x.includes("۱۲ مؤلفه‌ای"))},
  {name:"rejects duplicate member combination labels",pass:!dup.ok&&dup.issues.some(x=>x.includes("تکراری"))},
  {name:"detects missing reference combinations per member",pass:!missing.ok&&missing.issues.some(x=>x.includes("وجود ندارد"))},
  {name:"never grants design approval",pass:r.designApproved===false}
 ];
 return {passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests};
}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function render(){
 const host=document.getElementById("simultaneousMemberActionAuditResults");if(!host)return;
 const r=audit(root.SteelMemberForceEnvelope?.getLast?.());
 const fmt=o=>COMPONENTS.map(k=>k+":"+Number(o[k]).toPrecision(4)).join(" | ");
 host.innerHTML="<p><b>اعضا:</b> "+r.summary.members+" | <b>ردیف‌های عضو/حالت:</b> "+r.summary.caseEndRows+" | <b>بارگذاری مرکب:</b> "+r.summary.combinedActionRows+" | <b>محوری خالص:</b> "+r.summary.axialOnlyRows+"</p>"+
 (r.issues.length?"<h4>خطاهای پوشش داده</h4><ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>خطای ساختاری در بردارهای گزارش‌شده پیدا نشد.</p>")+
 "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>عضو</th><th>گروه</th><th>ترکیب بار</th><th>انتهای I: N,Vy,Vz,T,My,Mz</th><th>انتهای J: N,Vy,Vz,T,My,Mz</th><th>طبقه‌بندی تقاضا</th></tr></thead><tbody>"+
 r.rows.map(x=>"<tr><td>"+esc(x.memberId)+"</td><td>"+esc(x.sectionKey)+"</td><td>"+esc(x.caseLabel)+"</td><td>"+esc(fmt(x.I))+"</td><td>"+esc(fmt(x.J))+"</td><td>"+(x.combinedAction?"نیازمند اندرکنش":"محوری خالص/بدون مؤلفه جانبی")+"</td></tr>").join("")+"</tbody></table></div>"+
 "<div class='notice'>"+r.rules.map(esc).join("<br>")+"</div>";
}
function init(){
 if(document.getElementById("simultaneousMemberActionAuditPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="simultaneousMemberActionAuditPanel";
 p.innerHTML="<div class='panel-title'><h3>ممیزی نیروهای هم‌زمان اعضا برای طراحی اندرکنش</h3><span class='status'>ردیابی عضو / ترکیب / دو انتها</span></div><div class='notice'>پس از تحلیل سه‌بعدی و استخراج پوش نیروها اجرا شود. این بخش نیروهای هم‌زمان را ممیزی می‌کند و موتور مقاومت یا تأیید آیین‌نامه‌ای نیست.</div><div class='button-grid'><button type='button' class='btn secondary' id='btnSimultaneousMemberActionAudit'>ممیزی بردارهای هم‌زمان</button></div><div id='simultaneousMemberActionAuditResults'></div>";
 const anchor=document.getElementById("compressionCapacityIntegrationPanel")||document.getElementById("flexureShearReadinessPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 document.getElementById("btnSimultaneousMemberActionAudit").addEventListener("click",render);
}
root.SteelSimultaneousMemberActionAudit={audit,selfTest,render};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);

