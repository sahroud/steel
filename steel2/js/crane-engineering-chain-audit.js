/* SAHROUD STEEL — crane engineering chain consistency audit.
 * Cross-checks identifiers and provenance between synchronized rail transfer,
 * 3D frame analysis, and separate runway-girder FEM results.
 * This is a traceability/consistency gate, never a structural capacity check.
 */
(function(root){
"use strict";
const text=v=>String(v??"").trim();
const finite=v=>Number.isFinite(Number(v));
function audit(p){
 p=p||{};const issues=[],checks=[];
 const req=(obj,key,label)=>{if(!text(obj?.[key]))issues.push(label+" ثبت نشده است.");};
 const add=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 const transfer=p.twoRailTransfer||{},frame=p.frameAnalysis||{},girder=p.runwayGirder||{};
 req(p,"projectId","شناسه پروژه");
 req(p,"modelRevision","نسخه مدل");
 req(transfer,"sourceDocument","مرجع بارهای چرخ/انتقال دو ریل");
 req(frame,"loadCaseId","شناسه حالت بار تحلیل سه‌بعدی");
 req(frame,"modelRevision","نسخه مدل تحلیل سه‌بعدی");
 req(girder,"modelRevision","نسخه مدل تحلیل تیر حمال");
 if(!Array.isArray(transfer.cases)||!transfer.cases.length)issues.push("حالات بار هم‌زمان دو ریل موجود نیست.");
 if(!Array.isArray(frame.cases)||!frame.cases.length)issues.push("نتایج حالات تحلیل سه‌بعدی موجود نیست.");
 if(!Array.isArray(girder.cases)||!girder.cases.length)issues.push("نتایج تحلیل FEM تیرهای حمال موجود نیست.");
 const sameModel=text(p.modelRevision)&&text(frame.modelRevision)===text(p.modelRevision)&&text(girder.modelRevision)===text(p.modelRevision);
 add("model-revision-consistency",sameModel,"نسخه مدل پروژه، تحلیل سه‌بعدی و تیر حمال باید دقیقاً یکسان باشد.");
 const transferIds=(transfer.cases||[]).map(x=>text(x.caseId)).filter(Boolean);
 const frameIds=(frame.cases||[]).map(x=>text(x.caseId)).filter(Boolean);
 const girderIds=(girder.cases||[]).map(x=>text(x.caseId)).filter(Boolean);
 const unique=a=>new Set(a).size===a.length;
 add("unique-transfer-case-identifiers",transferIds.length===(transfer.cases||[]).length&&unique(transferIds),"هر حالت انتقال باید شناسه مستقل و یکتا داشته باشد.");
 add("unique-frame-case-identifiers",frameIds.length===(frame.cases||[]).length&&unique(frameIds),"هر حالت تحلیل سه‌بعدی باید شناسه مستقل و یکتا داشته باشد.");
 add("unique-girder-case-identifiers",girderIds.length===(girder.cases||[]).length&&unique(girderIds),"هر حالت تحلیل تیر حمال باید شناسه مستقل و یکتا داشته باشد.");
 const transferSet=new Set(transferIds),frameSet=new Set(frameIds),girderSet=new Set(girderIds);
 const frameSourceIds=(frame.cases||[]).map(x=>text(x.sourceTransferCaseId)).filter(Boolean);
 const girderSourceIds=(girder.cases||[]).map(x=>text(x.sourceTransferCaseId)).filter(Boolean);
 const frameCovers=transferIds.length>0&&transferIds.every(x=>frameSourceIds.includes(x));
 const girderCovers=transferIds.length>0&&transferIds.every(x=>girderSourceIds.includes(x));
 add("all-transfer-cases-reach-3d-frame",frameCovers,"تمام شناسه‌های حالت انتقال دو ریل باید در نتایج قاب سه‌بعدی موجود باشند.");
 add("all-transfer-cases-reach-runway-girders",girderCovers,"تمام شناسه‌های حالت انتقال باید در نتایج تیر حمال نیز موجود باشند.");
 const frameNoOrphans=frameIds.every(x=>transferSet.has(x));
 const girderNoOrphans=girderIds.every(x=>transferSet.has(x));
 add("no-unmatched-frame-cases",frameNoOrphans,"حالت تحلیل سه‌بعدی بدون حالت انتقال متناظر پذیرفته نیست.");
 add("no-unmatched-girder-cases",girderNoOrphans,"حالت تحلیل تیر حمال بدون حالت انتقال متناظر پذیرفته نیست.");
 const railPair=(transfer.cases||[]).every(c=>c.leftRailPresent===true&&c.rightRailPresent===true);
 add("both-rail-results-per-case",railPair,"برای هر حالت، پاسخ هر دو ریل باید هم‌زمان وجود داشته باشد.");
 const frameLoadMatch=(frame.cases||[]).every(c=>text(c.sourceTransferCaseId)&&transferSet.has(text(c.sourceTransferCaseId)));
 add("frame-case-source-link",frameLoadMatch,"هر تحلیل سه‌بعدی باید به شناسه حالت انتقال مبدأ پیوند داشته باشد.");
 const girderSourceMatch=(girder.cases||[]).every(c=>text(c.sourceTransferCaseId)&&transferSet.has(text(c.sourceTransferCaseId)));
 add("girder-case-source-link",girderSourceMatch,"هر تحلیل تیر حمال باید به شناسه حالت انتقال مبدأ پیوند داشته باشد.");
 const equilibrium=(frame.cases||[]).every(c=>c.equilibriumOK===true)&&(girder.cases||[]).every(c=>c.leftEquilibriumOK===true&&c.rightEquilibriumOK===true);
 add("equilibrium-status",equilibrium,"تعادل قاب سه‌بعدی و هر دو تیر حمال باید برای تک‌تک حالات تأیید شده باشد.");
 const completeSources=(transfer.cases||[]).every(c=>text(c.leftRailSource)&&text(c.rightRailSource)&&text(c.wheelLoadSource))&&text(transfer.sourceDocument);
 add("source-provenance-complete",completeSources,"منبع هر ریل، بار چرخ و سند مبنای انتقال باید ثبت شود.");
 const counts=(transfer.cases||[]).length===(frame.cases||[]).length&&(transfer.cases||[]).length===(girder.cases||[]).length;
 add("case-counts-match",counts,"تعداد حالات در سه مرحله انتقال، قاب و تیر حمال باید برابر باشد.");
 const passed=checks.filter(x=>x.ok).length,failed=checks.length-passed;
 return {success:issues.length===0&&failed===0,readyForEngineeringReview:issues.length===0&&failed===0,analysisEnabled:false,designApproved:false,projectId:text(p.projectId)||null,modelRevision:text(p.modelRevision)||null,caseCounts:{transfer:(transfer.cases||[]).length,frame:(frame.cases||[]).length,girder:(girder.cases||[]).length},passed,failed,checks,issues,limitations:[
 "این ممیزی فقط پیوستگی شناسه‌ها، تعداد حالات، حضور هم‌زمان دو ریل، تعادل گزارش‌شده و ردیابی منابع را بررسی می‌کند.",
 "این ممیزی صحت فیزیکی بارگذاری، مدل اجزای محدود، سختی تکیه‌گاه، قرارداد علامت یا اعتبار خروجی حل‌گر را اثبات نمی‌کند.",
 "موفقیت این ممیزی به معنی ظرفیت‌سنجی، کنترل آیین‌نامه‌ای، کفایت خستگی/پایداری یا تأیید طراحی نیست.",
 "شناسه‌های حالت باید در خروجی‌های واقعی برنامه به شکل دقیق و یکسان صادر شوند؛ ورود دستی نادرست می‌تواند نتیجه ممیزی را مخدوش کند."
 ]};
}
function readUI(){const el=root.document?.getElementById?.("craneChainAuditJson");if(!el||!text(el.value))return {parseError:"ابتدا داده زنجیره تحلیل را وارد کنید."};try{return JSON.parse(el.value);}catch(e){return {parseError:String(e.message||e)};}}
function run(){const p=readUI(),r=p.parseError?{success:false,issues:[p.parseError],analysisEnabled:false}:audit(p),el=root.document?.getElementById?.("craneChainAuditResult");if(el)el.textContent=JSON.stringify(r,null,2);return r;}
function mount(){const d=root.document;if(!d||d.getElementById("craneChainAuditPanel"))return;const main=d.querySelector("main");if(!main)return;const panel=d.createElement("section");panel.className="panel";panel.id="craneChainAuditPanel";panel.innerHTML='<div class="panel-title"><h3>ممیزی زنجیره انتقال بار جرثقیل تا تیر حمال</h3><span class="status">کنترل ردیابی</span></div><div class="notice">شناسه پروژه، نسخه مدل و شناسه هر حالت را از گزارش‌های واقعی انتقال دو ریل، تحلیل سه‌بعدی و FEM تیر حمال وارد کنید. این ممیزی از ترکیب ناخواسته حالات غیرهم‌زمان و گم‌شدن پیوند منابع جلوگیری می‌کند؛ ظرفیت سازه را کنترل نمی‌کند.</div><div class="field"><label for="craneChainAuditJson">داده زنجیره تحلیل (JSON)</label><textarea id="craneChainAuditJson" rows="12" placeholder="{ &quot;projectId&quot;:&quot;P-01&quot;, &quot;modelRevision&quot;:&quot;MODEL-REV-01&quot;, &quot;twoRailTransfer&quot;:{ &quot;sourceDocument&quot;:&quot;Crane vendor drawing p.4&quot;, &quot;cases&quot;:[{ &quot;caseId&quot;:&quot;CASE-01&quot;, &quot;leftRailPresent&quot;:true, &quot;rightRailPresent&quot;:true, &quot;leftRailSource&quot;:&quot;...&quot;, &quot;rightRailSource&quot;:&quot;...&quot;, &quot;wheelLoadSource&quot;:&quot;...&quot; }] }, &quot;frameAnalysis&quot;:{ &quot;loadCaseId&quot;:&quot;CASE-01&quot;, &quot;modelRevision&quot;:&quot;MODEL-REV-01&quot;, &quot;cases&quot;:[{ &quot;caseId&quot;:&quot;CASE-01-FRAME&quot;, &quot;sourceTransferCaseId&quot;:&quot;CASE-01&quot;, &quot;equilibriumOK&quot;:true }] }, &quot;runwayGirder&quot;:{ &quot;modelRevision&quot;:&quot;MODEL-REV-01&quot;, &quot;cases&quot;:[{ &quot;caseId&quot;:&quot;CASE-01-GIRDER&quot;, &quot;sourceTransferCaseId&quot;:&quot;CASE-01&quot;, &quot;leftEquilibriumOK&quot;:true, &quot;rightEquilibriumOK&quot;:true }] } }"></textarea></div><div class="button-grid"><button id="craneChainAuditRun" class="btn primary" type="button">اجرای ممیزی زنجیره</button></div><pre id="craneChainAuditResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const anchor=d.getElementById("craneServiceabilityPanel")||d.getElementById("runwayGirderPanel");if(anchor)anchor.insertAdjacentElement("afterend",panel);else{const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);}d.getElementById("craneChainAuditRun").addEventListener("click",run);}
function selfTest(){const t=[],test=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const p={projectId:"P1",modelRevision:"M1",twoRailTransfer:{sourceDocument:"vendor drawing",cases:[{caseId:"C1",leftRailPresent:true,rightRailPresent:true,leftRailSource:"left",rightRailSource:"right",wheelLoadSource:"wheel page"},{caseId:"C2",leftRailPresent:true,rightRailPresent:true,leftRailSource:"left",rightRailSource:"right",wheelLoadSource:"wheel page"}]},frameAnalysis:{loadCaseId:"C1",modelRevision:"M1",cases:[{caseId:"F1",sourceTransferCaseId:"C1",equilibriumOK:true},{caseId:"F2",sourceTransferCaseId:"C2",equilibriumOK:true}]},runwayGirder:{modelRevision:"M1",cases:[{caseId:"G1",sourceTransferCaseId:"C1",leftEquilibriumOK:true,rightEquilibriumOK:true},{caseId:"G2",sourceTransferCaseId:"C2",leftEquilibriumOK:true,rightEquilibriumOK:true}]}};
 test("accepts complete matched synchronized analysis chain",()=>audit(p).success);
 test("rejects model revision mismatch",()=>!audit({...p,runwayGirder:{...p.runwayGirder,modelRevision:"M2"}}).success);
 test("rejects missing transfer case",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[]}}).success);
 test("rejects absent right rail",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[{...p.twoRailTransfer.cases[0],rightRailPresent:false}]}}).success);
 test("rejects unmatched frame case",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[{...p.frameAnalysis.cases[0],sourceTransferCaseId:"MISSING"}]}}).success);
 test("rejects unmatched girder case",()=>!audit({...p,runwayGirder:{...p.runwayGirder,cases:[{...p.runwayGirder.cases[0],sourceTransferCaseId:"MISSING"}]}}).success);
 test("rejects missing equilibrium confirmation",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[{...p.frameAnalysis.cases[0],equilibriumOK:false},p.frameAnalysis.cases[1]]}}).success);
 test("rejects incomplete wheel source",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[{...p.twoRailTransfer.cases[0],wheelLoadSource:""},p.twoRailTransfer.cases[1]]}}).success);
 test("rejects duplicate transfer identifiers",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[p.twoRailTransfer.cases[0],p.twoRailTransfer.cases[0]]}}).success);
 test("rejects duplicate frame identifiers",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[p.frameAnalysis.cases[0],p.frameAnalysis.cases[0]]}}).success);
 test("rejects duplicate girder identifiers",()=>!audit({...p,runwayGirder:{...p.runwayGirder,cases:[p.runwayGirder.cases[0],p.runwayGirder.cases[0]]}}).success);
 test("rejects unequal stage case counts",()=>!audit({...p,runwayGirder:{...p.runwayGirder,cases:[p.runwayGirder.cases[0]]}}).success);
 test("does not enable analysis or approve design",()=>{const r=audit(p);return r.analysisEnabled===false&&r.designApproved===false;});
 test("does not label traceability as code compliance",()=>audit(p).limitations.some(x=>x.includes("ظرفیت‌سنجی")));
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,note:"Software traceability tests only; no structural validation or code approval."};
}
root.SteelCraneEngineeringChainAudit={audit,readUI,run,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
