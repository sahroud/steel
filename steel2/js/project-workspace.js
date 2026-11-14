/* SAHROUD STEEL — unified project workspace */
(function(){
"use strict";
const $=id=>document.getElementById(id),v=id=>$(id)?.value??"";
let lastRun=null,model=null,audit=null,drawings=null;
function addStyle(){
 if($("ssWorkspaceStyle"))return;
 const s=document.createElement("style");s.id="ssWorkspaceStyle";
 s.textContent="#ssWorkspace{border:1px solid #b8c9d5;border-radius:16px;padding:18px;margin:16px 0;background:#f8fbfd}#ssWorkspace h2{margin:0 0 8px;color:#123b52}#ssWorkspace .ss-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}#ssWorkspace label{display:block;font-size:13px;font-weight:700;margin-bottom:5px}#ssWorkspace input,#ssWorkspace select{box-sizing:border-box;padding:10px;border:1px solid #b8c9d5;border-radius:8px;background:white;max-width:100%}#ssWorkspace .ss-card{background:white;border:1px solid #d6e0e7;border-radius:12px;padding:14px;margin-top:14px}#ssWorkspace .ss-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}#ssWorkspace button{border:0;border-radius:9px;padding:11px 16px;cursor:pointer;font-weight:700}#ssWorkspace .ss-primary{background:#123b52;color:white}#ssWorkspace .ss-secondary{background:#e5edf2;color:#123b52}#ssWorkspace .ss-status{padding:12px;border-radius:9px;background:#edf4f8;margin-top:12px;white-space:pre-wrap}#ssWorkspace .ss-output{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}#ssWorkspace .ss-output label{display:flex;align-items:center;gap:8px;font-weight:500}#ssLegacyDetails{margin-top:18px;border:1px solid #d5e0e7;border-radius:12px;padding:10px;background:#fff}#ssLegacyDetails>summary{font-weight:700;cursor:pointer;color:#123b52;padding:8px}@media(max-width:600px){#ssWorkspace{padding:12px}#ssWorkspace .ss-actions button{width:100%}}";
 document.head.appendChild(s);
}
function set(id,value){const e=$(id);if(!e||value===undefined||value===null)return;e.value=String(value);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}
function read(){
 return {schema:"sahroud-steel-project-inputs",version:1,createdAt:new Date().toISOString(),
 project:{name:v("ssName"),owner:v("ssOwner"),designer:v("ssDesigner"),city:v("ssCity")},
 materials:window.SteelSections?.read?.()||null,
 geometry:{spanM:Number(v("ssSpan")),lengthM:Number(v("ssLength")),frameSpacingM:Number(v("ssSpacing")),columnHeightM:Number(v("ssHeight")),roofRiseM:Number(v("ssRise")),baseConnection:v("ssSupport")},
 configuration:{overheadCrane:$("ssCrane").checked,requestedMaxPurlinSpacingM:Number(v("ssPurlin")),requestedGirtSpacingM:Number(v("ssGirt")),longitudinalBraceBays:Number(v("ssBraceBays"))}};
}
function apply(){
 const d=read(),p=d.project,g=d.geometry,c=d.configuration;
 [["projectName",p.name],["owner",p.owner],["designer",p.designer],["city",p.city],["span",g.spanM],["length",g.lengthM],["spacing",g.frameSpacingM],["height",g.columnHeightM],["rise",g.roofRiseM],["baseConnection",g.baseConnection],["modelPurlinSpacing",c.requestedMaxPurlinSpacingM],["modelGirtSpacing",c.requestedGirtSpacingM],["modelBraceBays",c.longitudinalBraceBays]].forEach(x=>set(x[0],x[1]));
 if($("crane_enabled")){$("crane_enabled").checked=c.overheadCrane;$("crane_enabled").dispatchEvent(new Event("change",{bubbles:true}));}
 if($("climateCity"))set("climateCity",p.city);
 window.updateRoofGeometry?.();return d;
}
function ui(){
 if($("ssWorkspace"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.id="ssWorkspace";
 p.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h2>پروژه جدید سوله</h2><div>مشخصات پایه را یک‌بار وارد کنید؛ مدل، محاسبات قابل انجام و مدارک از همین صفحه مدیریت می‌شوند.</div></div><strong>SAHROUD STEEL</strong></div>'+
 '<div class="ss-card"><h3>۱. مشخصات پروژه و محل اجرا</h3><div class="ss-grid"><div><label>نام پروژه</label><input id="ssName" value="سوله صنعتی"></div><div><label>کارفرما</label><input id="ssOwner" placeholder="نام کارفرما"></div><div><label>طراح</label><input id="ssDesigner" placeholder="نام مهندس"></div><div><label>شهر</label><select id="ssCity"></select></div></div></div>'+
 '<div class="ss-card"><h3>۲. هندسه سوله</h3><div class="ss-grid"><div><label>دهانه (m)</label><input id="ssSpan" type="number" min="1" step=".1" value="12"></div><div><label>طول (m)</label><input id="ssLength" type="number" min="1" step=".1" value="36"></div><div><label>فاصله قاب‌ها (m)</label><input id="ssSpacing" type="number" min="1" step=".1" value="6"></div><div><label>ارتفاع ستون (m)</label><input id="ssHeight" type="number" min="1" step=".1" value="6"></div><div><label>افزایش ارتفاع تاج (m)</label><input id="ssRise" type="number" min="0" step=".1" value="1.2"></div><div><label>اتصال پای ستون</label><select id="ssSupport"><option value="pinned">مفصلی</option><option value="fixed">گیردار</option></select></div></div></div>'+
 '<div class="ss-card"><h3>۳. تجهیزات و فاصله‌گذاری</h3><div class="ss-grid"><div><label><input id="ssCrane" type="checkbox" style="width:auto"> جرثقیل سقفی دارد</label></div><div><label>حداکثر فاصله درخواستی پرلین (m)</label><input id="ssPurlin" type="number" min=".2" step=".05" value="1.2"></div><div><label>فاصله درخواستی گرت (m)</label><input id="ssGirt" type="number" min=".2" step=".05" value="1.5"></div><div><label>دهانه‌های مهاربندی طولی</label><input id="ssBraceBays" type="number" min="0" step="1" value="1"></div></div><p>با فعال‌کردن جرثقیل، اطلاعات بار چرخ و مسیر تیر حمال باید از سازنده/نقشه وارد شود؛ بار جرثقیل حدس زده نمی‌شود.</p></div>'+
 '<div class="ss-card"><h3>۴. ساخت مدل و اجرای خودکار</h3><div class="ss-actions"><button id="ssRun" class="ss-primary" type="button">ساخت مدل و اجرای مراحل قابل انجام</button><button id="ssSave" class="ss-secondary" type="button">ذخیره ورودی‌ها (JSON)</button></div><div id="ssRunStatus" class="ss-status">مشخصات را وارد و اجرای مدل را انتخاب کنید.</div></div>'+
 '<div class="ss-card"><h3>۶. انتخاب و دریافت خروجی</h3><div class="ss-output"><label><input type="checkbox" id="ssOutReport" checked> دفترچه گزارش Word (RTF)</label><label><input type="checkbox" id="ssOutPDF" checked> گزارش PDF</label><label><input type="checkbox" id="ssOutDrawings" checked> نقشه‌های موجود (PDF از پنجره چاپ)</label><label><input type="checkbox" id="ssOutJSON" checked> مدل و داده‌ها (JSON)</label><label><input type="checkbox" id="ssOutBOQ" checked> متره (CSV در صورت وجود داده)</label><label><input type="checkbox" id="ssOutCode"> گزارش ضوابط و نواقص (RTF)</label></div><div class="ss-actions"><button id="ssExport" class="ss-primary" type="button">آماده‌سازی خروجی‌های انتخاب‌شده</button><button id="ssPrintDrawings" class="ss-secondary" type="button">چاپ نقشه‌های موجود</button></div><div id="ssExportStatus" class="ss-status">نقشه و گزارش ناقص با عنوان اجرایی یا تأییدشده صادر نمی‌شود.</div></div>';
 main.insertBefore(p,main.firstChild);
 const city=$("city"),sel=$("ssCity");if(city){[...city.options].forEach(o=>{const n=document.createElement("option");n.value=o.value;n.textContent=o.textContent;sel.appendChild(n);});sel.value=city.value||"shahroud";}else sel.innerHTML='<option value="shahroud">شاهرود</option>';
 $("ssRun").addEventListener("click",run);$("ssSave").addEventListener("click",()=>download("SAHROUD-STEEL-inputs.json",JSON.stringify(read(),null,2),"application/json;charset=utf-8"));
 $("ssExport").addEventListener("click",exportFiles);$("ssPrintDrawings").addEventListener("click",printDrawings);
 const sectionPanel=$("steelSectionsPanel");
 const old=document.createElement("details");old.id="ssLegacyDetails";old.innerHTML="<summary>تنظیمات تخصصی، جزئیات مهندسی و ابزارهای پیشرفته</summary>";
 [...main.children].filter(n=>n!==p).forEach(n=>old.appendChild(n));main.appendChild(old);
 if(sectionPanel&&$("ssMaterialsSlot"))$("ssMaterialsSlot").appendChild(sectionPanel);
}
function validateInputObject(d){const g=d?.geometry||{},issues=[];if(![g.spanM,g.lengthM,g.frameSpacingM,g.columnHeightM].every(x=>Number.isFinite(x)&&x>0))issues.push("ابعاد اصلی باید مثبت و عددی باشند.");if(!Number.isFinite(g.roofRiseM)||g.roofRiseM<0)issues.push("افزایش ارتفاع تاج باید نامنفی باشد.");if(Number.isFinite(g.frameSpacingM)&&Number.isFinite(g.lengthM)&&g.frameSpacingM>g.lengthM)issues.push("فاصله قاب‌ها نباید از طول سوله بیشتر باشد.");const c=d?.configuration||{};if(c.overheadCrane&&!(Number(c.requestedMaxPurlinSpacingM)>0))issues.push("فاصله پرلین برای پروژه جرثقیل‌دار باید معتبر باشد.");return issues;}
function selfTest(){const checks=[],test=(name,fn)=>{try{checks.push({name,pass:!!fn()});}catch(e){checks.push({name,pass:false,error:e.message});}};const valid={geometry:{spanM:20,lengthM:40,frameSpacingM:5,columnHeightM:7,roofRiseM:2},configuration:{overheadCrane:false,requestedMaxPurlinSpacingM:1.2}};test("valid project geometry passes",()=>validateInputObject(valid).length===0);test("zero span is rejected",()=>validateInputObject({...valid,geometry:{...valid.geometry,spanM:0}}).length>0);test("negative roof rise is rejected",()=>validateInputObject({...valid,geometry:{...valid.geometry,roofRiseM:-1}}).length>0);test("frame spacing beyond building length is rejected",()=>validateInputObject({...valid,geometry:{...valid.geometry,frameSpacingM:50}}).length>0);test("crane configuration preserves explicit flag",()=>valid.configuration.overheadCrane===false);return {passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,scope:"input validation only; no engineering approval"};}
function run(){
 const status=$("ssRunStatus");
 try{
  const d=apply(),g=d.geometry,c=d.configuration;
  const inputIssues=validateInputObject(d);if(inputIssues.length)throw Error(inputIssues.join(" "));
  if(!$("ssMaterialConfirm")?.checked)throw Error("ابتدا مشخصات مصالح و مقاطع را در همین صفحه بررسی و تأیید کنید.");
  if(window.SteelSections?.validate&&!window.SteelSections.validate())throw Error("مشخصات مصالح، ستون و رفتر ناقص است؛ فرم مصالح و مقاطع را تکمیل کنید.");
  const err=window.SteelProject?.validate?.()||"";if(err)throw Error(err);
  model=window.SteelStructuralModel?.build?.();if(!model||!model.members?.length)throw Error("مدل هندسی تولید نشد.");
  window.SteelStructuralModel.draw?.();
  audit=window.SteelFreshModelStructuralAudit?.audit?.(model,window.SteelLoads?.getData?.()||{})||null;
  window.SteelAutoWorkflow?.run?.();
  try{drawings=window.SteelConstructionDrawings?.build?.()||null;}catch(e){drawings={success:false,issue:e?.message||String(e)};}
  let boq=null;try{boq=window.SteelProjectBOQ?.refresh?.()||null;}catch(e){boq={success:false,issue:e?.message||String(e)};}
  const workflow=$("steelAutoWorkflowResults")?.innerText||"";
  lastRun={generatedAt:new Date().toISOString(),inputs:d,model:{nodeCount:model.nodes?.length||0,memberCount:model.members?.length||0,nodes:model.nodes,members:model.members},freshModelAudit:audit,workflowReport:workflow,combinationResults:window.SteelAnalysis?.combinationResults||[],drawings:drawings,boq:boq,limitations:["این اجرا به معنی تکمیل طراحی آیین‌نامه‌ای نیست.","تحلیل سه‌بعدی کامل همه اعضای طولی/مهاربندها هنوز باید مستقل اعتبارسنجی شود.","ظرفیت همه اعضا، اتصالات، انکرها، بتن و خاک تا تکمیل داده و ماژول معتبر تأیید نمی‌شود.","داده اقلیمی شهر باید از منبع رسمی و موقعیت دقیق پروژه کنترل شود.","نقشه‌های موجود پارامتریک/شماتیک‌اند و لزوماً نقشه اجرایی نیستند."]};
  status.textContent="مدل ساخته شد: "+lastRun.model.nodeCount+" گره و "+lastRun.model.memberCount+" عضو.\nممیزی مدل تازه: "+(audit?.success?"موفق در کنترل‌های موجود":"ناقص/نیازمند بررسی")+"\nگزارش مراحل خودکار در بخش تخصصی قابل مشاهده است.\nهیچ تأیید نهایی مهندسی از این اجرا استنباط نمی‌شود.";
  $("ssExportStatus").textContent="مدل آماده است؛ خروجی‌های مورد نظر را انتخاب کنید.";
 }catch(e){status.textContent="توقف امن: "+(e?.message||String(e))+"\nنتیجه تأییدنشده صادر نشد.";}
}
function download(name,data,type){const b=new Blob([data],{type}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function rtf(s){let o="";s=String(s??"");for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c===92||c===123||c===125)o+="\\"+s[i];else if(c<128)o+=s[i];else o+="\\u"+(c>32767?c-65536:c)+"?";}return o;}
function report(){
 const a=lastRun?.freshModelAudit||{},g=lastRun?.inputs?.geometry||{},p=lastRun?.inputs?.project||{},lines=["SAHROUD STEEL — گزارش محاسبات و کنترل آمادگی","تاریخ: "+(lastRun?.generatedAt||new Date().toISOString()),"پروژه: "+(p.name||"—")+" | شهر: "+(p.city||"—"),"دهانه: "+g.spanM+" m | طول: "+g.lengthM+" m | ارتفاع ستون: "+g.columnHeightM+" m | فاصله قاب: "+g.frameSpacingM+" m","مدل: "+(lastRun?.model?.nodeCount||0)+" گره، "+(lastRun?.model?.memberCount||0)+" عضو","وضعیت ممیزی: "+(a.success?"موفق در کنترل‌های اجراشده":"ناقص/نیازمند بررسی")];
 (a.issues||[]).forEach((x,i)=>lines.push("مانع "+(i+1)+": "+x));lines.push("گزارش مراحل خودکار:",lastRun?.workflowReport||"در دسترس نیست.","محدودیت‌ها:");(lastRun?.limitations||[]).forEach((x,i)=>lines.push((i+1)+". "+x));
 lines.push("این سند گزارش نرم‌افزاری مقدماتی است؛ دفترچه محاسبات نهایی و قابل مهر نیست تا همه کنترل‌های آیین‌نامه‌ای، داده‌های پروژه و بازبینی مهندس مسئول تکمیل شوند.");
 return lines.join("\n");
}
function makeRTF(s){return "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\viewkind4\\uc1\\f0\\fs22 "+s.split("\n").map(x=>"\\par "+rtf(x)).join("")+"}";}
function csvRows(){
 const d=lastRun?.boq,rows=Array.isArray(d)?d:(d?.rows||d?.items||d?.lines||[]);
 return rows.map(x=>[x.category||x.code||x.key||"",x.description||x.label||x.name||"",x.quantity??x.qty??"",x.unit||"",x.status||x.source||""]);
}
function exportFiles(){
 if(!lastRun){$("ssExportStatus").textContent="ابتدا مدل را اجرا کنید.";return;}
 const done=[];
 if($("ssOutReport").checked){download("SAHROUD-STEEL-Calculation-Report.rtf",makeRTF(report()),"application/rtf;charset=utf-8");done.push("گزارش RTF قابل بازشدن در Word");}
 if($("ssOutJSON").checked){download("SAHROUD-STEEL-Project-Package.json",JSON.stringify(lastRun,null,2),"application/json;charset=utf-8");done.push("بسته JSON");}
 if($("ssOutBOQ").checked){const snap=lastRun.boq,rows=csvRows();if(snap?.rows?.length&&window.SteelProjectBOQ?.csv){download("SAHROUD-STEEL-BOQ.csv",window.SteelProjectBOQ.csv(snap),"text/csv;charset=utf-8");done.push("متره CSV");}else if(rows.length){const q=x=>'"'+String(x??"").replace(/"/g,'""')+'"';download("SAHROUD-STEEL-BOQ.csv","\uFEFF"+[["بخش","شرح","مقدار","واحد","وضعیت"],...rows].map(r=>r.map(q).join(",")).join("\r\n"),"text/csv;charset=utf-8");done.push("متره CSV");}else done.push("متره هنوز خروجی قابل استخراج ندارد");}
 if($("ssOutCode").checked){download("SAHROUD-STEEL-Code-Readiness.rtf",makeRTF(report()),"application/rtf;charset=utf-8");done.push("گزارش ضوابط RTF");}
 if($("ssOutDrawings").checked){printDrawings();done.push("پنجره چاپ نقشه‌های موجود؛ مقصد Save as PDF را انتخاب کنید");}
 if($("ssOutPDF").checked){printReport();done.push("پنجره چاپ گزارش؛ گزینه Save as PDF را انتخاب کنید");}
 $("ssExportStatus").textContent=done.join("؛ ");
}
function printReport(){const w=window.open("","_blank");if(!w)throw Error("پنجره چاپ مسدود شده است.");const s=report().replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>SAHROUD STEEL</title><style>body{font:14px Tahoma;line-height:2;margin:22mm;white-space:pre-wrap}</style><h2>SAHROUD STEEL</h2>'+s+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),300);}
function printDrawings(){
 try{if(!drawings)drawings=window.SteelConstructionDrawings?.build?.();const b=$("btnPrintConstructionDrawings");if(b)b.click();else alert("ماژول چاپ نقشه در دسترس نیست.");}catch(e){alert(e.message||String(e));}
}
window.SteelProjectWorkspace={run,getLast:()=>lastRun,readInputs:read,exportSelected:exportFiles,validateInputObject,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{addStyle();ui();});else{addStyle();ui();}
})();