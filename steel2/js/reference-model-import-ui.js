/* SAHROUD STEEL — controlled reference model import UI; preview only. */
(function(){
"use strict";
const $=id=>document.getElementById(id),api=()=>window.SteelCSVStructuralExchange;
let candidate=null,reference=null,lastReport=null;
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function readFile(id){const f=$(id)?.files?.[0];if(!f)return Promise.resolve(null);return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:f.name,text:String(r.result)});r.onerror=()=>reject(new Error("خواندن فایل "+f.name+" ناموفق بود"));r.readAsText(f,"UTF-8");});}
function message(text,kind){const el=$("referenceImportStatus");if(el){el.textContent=text;el.dataset.kind=kind||"info";}}
function ensure(){
 if($("referenceImportPanel"))return;
 const anchor=$("frameDrawing")?.closest("section")||document.querySelector("main .panel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="referenceImportPanel";
 p.innerHTML='<div class="panel-title"><h3>ورود مدل از نرم‌افزار مبدأ و پیش‌نمایش سه‌بعدی</h3><span class="status">ورود کنترل‌شده؛ فقط پیش‌نمایش</span></div>'+
 '<div class="notice">فایل‌ها ابتدا به‌صورت پیشنهاد وارد می‌شوند. این ابزار مدل فعال پروژه یا حلگر را تغییر نمی‌دهد. واحد و دستگاه مختصات را دقیقاً مطابق خروجی نرم‌افزار مبدأ وارد کنید.</div>'+
 '<div class="form-grid"><div class="field"><label for="refImportUnit">واحد مختصات گره‌ها</label><select id="refImportUnit"><option value="m">متر (m)</option><option value="mm">میلی‌متر (mm)</option></select></div>'+
 '<div class="field"><label for="refImportCoords">دستگاه مختصات، محورها و مبدأ</label><input id="refImportCoords" placeholder="مثلاً Global XYZ؛ مبدأ محور A/1؛ راست‌گرد"></div>'+
 '<div class="field"><label for="refNodesFile">فایل گره‌ها nodes.csv</label><input id="refNodesFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refMembersFile">فایل اعضا members.csv</label><input id="refMembersFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refSupportsFile">تکیه‌گاه‌ها supports.csv (اختیاری)</label><input id="refSupportsFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refReleasesFile">آزادسازی‌ها releases.csv (اختیاری)</label><input id="refReleasesFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refStationsFile">ایستگاه‌های مقطع section-stations.csv (اختیاری)</label><input id="refStationsFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refSectionUnit">واحد ابعاد مقطع</label><select id="refSectionUnit"><option value="mm">میلی‌متر (mm)</option><option value="m">متر (m)</option></select></div></div>'+
 '<div class="actions"><button type="button" id="btnImportReference">خواندن و کنترل فایل‌ها</button><button type="button" id="btnExportReference" disabled>دریافت گزارش JSON</button></div>'+
 '<div id="referenceImportStatus" class="notice" role="status" aria-live="polite">هنوز فایلی وارد نشده است.</div>'+
 '<div id="referenceImportSummary" class="result-box">پس از ورود، خلاصه مدل و هشدارها نمایش داده می‌شوند.</div>'+
 '<div class="reference-preview-wrap"><svg id="referenceModelPreview" viewBox="0 0 720 360" role="img" aria-label="پیش‌نمایش هندسی مدل وارداتی"><rect width="720" height="360" fill="#f8fbfd"/><text x="360" y="180" text-anchor="middle" fill="#647783" font-size="16">پیش‌نمایش مدل پس از ورود فایل‌ها</text></svg></div>'+
 '<h4>مقایسه با مدل مرجع (اختیاری)</h4><div class="notice">برای مقایسه، فایل گره‌ها و اعضای مدل مرجع را جداگانه انتخاب کنید. تطبیق بر اساس شناسه‌های پایدار انجام می‌شود؛ اختلاف جهت اعضا به‌صورت هشدار گزارش خواهد شد.</div>'+
 '<div class="form-grid"><div class="field"><label for="refCompareNodes">گره‌های مدل مرجع</label><input id="refCompareNodes" type="file" accept=".csv,text/csv"></div><div class="field"><label for="refCompareMembers">اعضای مدل مرجع</label><input id="refCompareMembers" type="file" accept=".csv,text/csv"></div><div class="field"><label for="refCompareTolerance">تلرانس مختصات (متر)</label><input id="refCompareTolerance" type="number" min="0.000001" step="0.001" value="0.001"></div></div>'+
 '<div class="actions"><button type="button" id="btnCompareReference" disabled>مقایسه با مدل مرجع</button></div><div id="referenceCompareResult" class="result-box">مدل مرجع جداگانه انتخاب نشده است.</div>'+
 '<p class="hint">محدودیت: این پیش‌نمایش هندسه گره-عضو است؛ مقاطع، قیود، اتصالات، بارها و رفتار سازه‌ای را نمایش یا تأیید نمی‌کند. برای مشاهده شکل واقعی مقاطع متغیر باید داده‌های کامل‌تر و محورهای محلی دریافت شوند.</p>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 const style=document.createElement("style");style.textContent='#referenceImportPanel .reference-preview-wrap{margin-top:12px;overflow:auto;border:1px solid var(--border);border-radius:10px;background:#f8fbfd}#referenceModelPreview{min-width:320px;max-height:520px}#referenceImportStatus[data-kind="error"]{border-color:#c74747;background:#fff4f4;color:#8c2424}#referenceImportStatus[data-kind="success"]{border-color:#16845b;background:#f1faf5;color:#126344}.reference-audit-list{margin:8px 0;padding-right:20px}.reference-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.reference-stat{padding:9px;border:1px solid var(--border);border-radius:8px;background:#fff}.reference-stat strong{display:block;font-size:18px;color:var(--navy)}@media(max-width:650px){.reference-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.appendChild(style);
 $("btnImportReference").addEventListener("click",importCandidate);$("btnExportReference").addEventListener("click",exportReport);$("btnCompareReference").addEventListener("click",compare);
}
function renderPreview(proposal){
 const svg=$("referenceModelPreview");if(!svg)return;const ns="http://www.w3.org/2000/svg";while(svg.firstChild)svg.removeChild(svg.firstChild);
 const bg=document.createElementNS(ns,"rect");bg.setAttribute("width","720");bg.setAttribute("height","360");bg.setAttribute("fill","#f8fbfd");svg.appendChild(bg);
 const nodes=proposal.nodes;if(!nodes.length)return;
 const min=[0,1,2].map(i=>Math.min(...nodes.map(n=>[n.x,n.y,n.z][i]))),max=[0,1,2].map(i=>Math.max(...nodes.map(n=>[n.x,n.y,n.z][i])));
 const project=n=>{const x=max[0]===min[0]?0.5:(n.x-min[0])/(max[0]-min[0]),y=max[1]===min[1]?0.5:(n.y-min[1])/(max[1]-min[1]),z=max[2]===min[2]?0.5:(n.z-min[2])/(max[2]-min[2]);return{x:65+x*500+y*100,y:300-y*170-z*235};};
 const pos=new Map(nodes.map(n=>[n.id,project(n)]));
 proposal.members.forEach(m=>{const a=pos.get(m.start),b=pos.get(m.end);if(!a||!b)return;const line=document.createElementNS(ns,"line");line.setAttribute("x1",a.x);line.setAttribute("y1",a.y);line.setAttribute("x2",b.x);line.setAttribute("y2",b.y);line.setAttribute("stroke","#176b87");line.setAttribute("stroke-width","2");svg.appendChild(line);});
 nodes.forEach(n=>{const q=pos.get(n.id),c=document.createElementNS(ns,"circle");c.setAttribute("cx",q.x);c.setAttribute("cy",q.y);c.setAttribute("r","3.5");c.setAttribute("fill","#d98220");svg.appendChild(c);});
 const label=document.createElementNS(ns,"text");label.setAttribute("x","12");label.setAttribute("y","22");label.setAttribute("fill","#526b78");label.setAttribute("font-size","12");label.textContent="پیش‌نمایش شماتیک — "+nodes.length+" گره / "+proposal.members.length+" عضو";svg.appendChild(label);
}
function list(items){return items.length?'<ul class="reference-audit-list">'+items.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':'<p>موردی ثبت نشده است.</p>';}
function renderSummary(audit,supp){
 const el=$("referenceImportSummary");if(!el)return;const s=audit.summary,items=[["گره‌ها",s.nodeCount],["اعضا",s.memberCount],["اجزای جدا",s.componentCount],["گره‌های منفرد",s.orphanNodeIds.length],["جفت مختصات تکراری",s.duplicateOrNearCoordinatePairs],["ایستگاه‌های مقطع",supp?.data?.sectionStations?.length||0]];
 el.innerHTML='<div class="reference-stat-grid">'+items.map(x=>'<div class="reference-stat"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join("")+'</div><h4>هشدارهای هندسه</h4>'+list(audit.warnings)+'<h4>هشدارهای داده تکمیلی</h4>'+list(supp?.warnings||[])+'<h4>خطاها</h4>'+list([...(audit.issues||[]),...(supp?.issues||[])]);
}
async function importCandidate(){
 try{
 const a=api();if(!a)throw new Error("ماژول تبادل CSV در صفحه بارگذاری نشده است.");
 const [nf,mf,sf,rf,tf]=await Promise.all(["refNodesFile","refMembersFile","refSupportsFile","refReleasesFile","refStationsFile"].map(readFile));
 if(!nf||!mf)throw new Error("انتخاب فایل گره‌ها و اعضا الزامی است.");
 const built=a.buildProposal({nodesCsv:nf.text,membersCsv:mf.text,lengthUnit:$("refImportUnit").value,coordinateSystem:$("refImportCoords").value,source:{path:nf.name+"; "+mf.name,format:"CSV"}});
 if(!built.success)throw new Error(built.issues.join("؛ "));
 const audited=a.auditProposal(built.proposal),supplemental=a.parseSupplementalTables(built.proposal,{supportsCsv:sf?.text,releasesCsv:rf?.text,sectionStationsCsv:tf?.text,sectionDimensionUnit:$("refSectionUnit").value});
 candidate={proposal:built.proposal,audit:audited,supplemental,files:{nodes:nf.name,members:mf.name,supports:sf?.name||null,releases:rf?.name||null,stations:tf?.name||null},status:"pending_review",geometryActivation:false,solverEligible:false,designApproved:false};
 if(!audited.success||!supplemental.success)message("ورود انجام شد اما خطاهای اعتبارسنجی وجود دارد؛ گزارش را بررسی کنید.","error");else message("مدل به‌صورت پیشنهاد وارد شد؛ هیچ تغییری در مدل فعال یا حلگر اعمال نشده است.","success");
 renderPreview(candidate.proposal);renderSummary(audited,supplemental);$("btnExportReference").disabled=false;$("btnCompareReference").disabled=false;
 }catch(e){message(e.message,"error");}
}
async function compare(){
 try{
 if(!candidate)throw new Error("ابتدا مدل پیشنهادی را وارد کنید.");
 const [nf,mf]=await Promise.all(["refCompareNodes","refCompareMembers"].map(readFile));if(!nf||!mf)throw new Error("هر دو فایل مدل مرجع لازم است.");
 const b=api().buildProposal({nodesCsv:nf.text,membersCsv:mf.text,lengthUnit:$("refImportUnit").value,coordinateSystem:$("refImportCoords").value,source:{path:nf.name+"; "+mf.name,format:"CSV"}});
 if(!b.success)throw new Error(b.issues.join("؛ "));
 reference=b.proposal;const tol=Number($("refCompareTolerance").value);if(!Number.isFinite(tol)||tol<=0)throw new Error("تلرانس باید عدد مثبت و برحسب متر باشد.");
 lastReport=api().compareProposals(candidate.proposal,reference,{coordinateToleranceM:tol});
 $("referenceCompareResult").innerHTML='<p><strong>گره‌های تطبیق‌یافته:</strong> '+lastReport.report.matchedNodeCount+' | <strong>اعضای تطبیق‌یافته:</strong> '+lastReport.report.matchedMemberCount+'</p><p><strong>بیشترین اختلاف مختصات:</strong> '+lastReport.report.maxNodeDeviationM.toFixed(6)+' متر</p><h4>هشدارها</h4>'+list(lastReport.warnings)+'<h4>موارد ناسازگار</h4>'+list(lastReport.issues);
 $("btnExportReference").disabled=false;message("مقایسه انجام شد؛ نتیجه فقط گزارش تطبیقی است.","success");
 }catch(e){$("referenceCompareResult").textContent=e.message;message(e.message,"error");}
}
function exportReport(){
 if(!candidate)return;const payload={generatedAt:new Date().toISOString(),proposal:candidate.proposal,geometryAudit:candidate.audit,supplemental:candidate.supplemental,comparison:lastReport,gate:{status:"pending_review",geometryActivation:false,solverEligible:false,designApproved:false}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-reference-import-review.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
window.SteelReferenceImportUI={get candidate(){return candidate;},get reference(){return reference;},get comparison(){return lastReport;}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensure);else ensure();
})();