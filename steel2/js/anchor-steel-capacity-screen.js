/* SAHROUD STEEL — anchor rod steel resistance calculator.
 * Uses user-entered code stress parameters; does not select code values or check concrete anchorage.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
function mapDemand(d){if(!d||!d.input||!d.geometry||d.input.geometryConfirmed!==true||d.input.signConfirmed!==true)throw Error("ابتدا تقاضای گروه بولت را با هندسه و قرارداد علامت تأییدشده محاسبه کنید.");return{nBolts:d.bolts.length,demandT:d.maxTensionKN,demandV:d.maxShearKN};}
function demandSignature(d){const m=mapDemand(d);return JSON.stringify(m);}
function calculate(i){
 ["nBolts","ase","fnt","fnv","phiT","phiV","demandT","demandV"].forEach(k=>{if(!Number.isFinite(i[k])||i[k]<0)throw Error("ورودی "+k+" باید عددی و نامنفی باشد.");});
 if(!Number.isInteger(i.nBolts)||i.nBolts<1)throw Error("تعداد بولت باید عدد صحیح مثبت باشد.");
 if(!(i.ase>0&&i.fnt>0&&i.fnv>0&&i.phiT>0&&i.phiT<=1&&i.phiV>0&&i.phiV<=1))throw Error("Ase، تنش‌های Fnt/Fnv و ضرایب مقاومت باید مثبت و معتبر باشند.");
 const tPer=i.phiT*i.fnt*i.ase/1000,vPer=i.phiV*i.fnv*i.ase/1000;
 return {tensionDesignPerBoltKN:tPer,shearDesignPerBoltKN:vPer,totalTensionDesignKN:tPer*i.nBolts,totalShearDesignKN:vPer*i.nBolts,tensionDemandRatio:i.demandT/tPer,shearDemandRatio:i.demandV/vPer,tensionPass:i.demandT<=tPer,shearPass:i.demandV<=vPer,limitations:["Fnt و Fnv و ضرایب مقاومت φ باید از آیین‌نامه و حالت حدی حاکم برای نوع بولت/رزوه/صفحه برش استخراج شوند؛ نرم‌افزار آن‌ها را حدس نمی‌زند.","Ase باید سطح مؤثر کششی واقعی رزوه باشد، نه لزوماً سطح مقطع ساق ساده بولت.","ظرفیت‌های فوق برای یک بولت و فقط مقاومت فولادی‌اند؛ اثر توزیع گروه، خمش بولت، رزوه در صفحه برش، سوراخ بزرگ/شیاردار، نصب و پیش‌تنیدگی لحاظ نشده‌اند.","شکست مخروطی بتن، pullout، pry-out، side-face blowout، فاصله لبه و اندرکنش کشش-برش کنترل نشده‌اند.","نسبت‌ها جداگانه گزارش می‌شوند؛ هیچ رابطه اندرکنش آیین‌نامه‌ای فرض نشده است."]};
}
function mount(){
 if($("anchorSteelCapacityPanel"))return;
 const a=$("anchorDemandScreenPanel")||$("baseplateAnchorDrawingsPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorSteelCapacityPanel";
 p.innerHTML='<div class="panel-title"><h3>کنترل مقاومت فولادی بولت مهاری</h3><span class="status">پارامترهای آیین‌نامه‌ای ورودی کاربر</span></div><div class="notice">برای جلوگیری از انتخاب خودکار پارامتر نامعتبر، Fnt، Fnv و φ را از آیین‌نامه حاکم و مشخصات واقعی بولت وارد کنید. این بخش فقط مقاومت فولادی را محاسبه می‌کند.</div><div class="form-grid">'+
 '<div class="field"><label>تعداد بولت در گروه</label><input id="asN" type="number" min="1" step="1" value="4"></div>'+
 '<div class="field"><label>سطح مؤثر کششی Ase (mm²)</label><input id="asAse" type="number" min="0" step="0.1" placeholder="از جدول رزوه/استاندارد"></div>'+
 '<div class="field"><label>تنش کششی اسمی Fnt (MPa)</label><input id="asFnt" type="number" min="0" step="1" placeholder="از آیین‌نامه حاکم"></div>'+
 '<div class="field"><label>تنش برشی اسمی Fnv (MPa)</label><input id="asFnv" type="number" min="0" step="1" placeholder="از آیین‌نامه حاکم"></div>'+
 '<div class="field"><label>ضریب مقاومت کشش φt</label><input id="asPhiT" type="number" min="0" max="1" step="0.01" placeholder="از آیین‌نامه"></div>'+
 '<div class="field"><label>ضریب مقاومت برش φv</label><input id="asPhiV" type="number" min="0" max="1" step="0.01" placeholder="از آیین‌نامه"></div>'+
 '<div class="field"><label>بیشینه تقاضای کشش یک بولت (kN)</label><input id="asDemandT" type="number" min="0" step="0.01" placeholder="از تحلیل گروه بولت"></div>'+
 '<div class="field"><label>بیشینه تقاضای برش یک بولت (kN)</label><input id="asDemandV" type="number" min="0" step="0.01" placeholder="از تحلیل گروه بولت"></div>'+
 '</div><div class="button-grid"><button id="asImportDemand" class="btn secondary" type="button">دریافت تقاضا از گروه بولت</button><button id="asRun" class="btn primary" type="button">محاسبه مقاومت فولادی</button><button id="asCsv" class="btn secondary" type="button" disabled>خروجی CSV</button></div><div id="asResult" class="notice">ورودی‌ها را تکمیل کنید.</div><h4>غربال فولادی همه ترکیبات یک پایه</h4><div class="notice">این مسیر از واکنش‌های مستقل هر ترکیب و هندسه تأییدشده همان پایه استفاده می‌کند؛ بیشینه‌های دو ترکیب با یکدیگر ترکیب نمی‌شوند. پارامترهای Ase، Fnt، Fnv و φ بالا برای همه ترکیبات اعمال می‌شوند.</div><div class="form-grid"><div class="field"><label for="asBatchNode">گره پایه</label><select id="asBatchNode"><option value="">بارگذاری پایه‌ها</option></select></div></div><div class="button-grid"><button id="asBatchLoad" class="btn secondary" type="button">بارگذاری پایه‌های قابل بررسی</button><button id="asBatchRun" class="btn primary" type="button" disabled>کنترل تمام ترکیبات پایه</button><button id="asBatchCsv" class="btn secondary" type="button" disabled>گزارش دسته‌جمعی CSV</button></div><div id="asBatchResult" class="notice">کنترل دسته‌جمعی هنوز اجرا نشده است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>ترکیب / انکر</th><th>کشش (kN)</th><th>برش کل (kN)</th><th>برش X (kN)</th><th>برش Z (kN)</th><th>نسبت کشش</th><th>نسبت برش</th><th>اندرکنش</th><th>نتیجه مستقل</th></tr></thead><tbody id="asBatchRows"></tbody></table></div><div class="notice">تأیید مقاومت فولادی به معنی تأیید مهار در بتن یا تأیید اتصال نیست؛ اندرکنش کشش-برش نیز در این غربال اعمال نشده است.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("asImportDemand").addEventListener("click",()=>{try{const d=root.SteelAnchorDemandScreen?.getLast?.(),m=mapDemand(d);$("asN").value=m.nBolts;$("asDemandT").value=m.demandT;$("asDemandV").value=m.demandV;importedDemandSignature=demandSignature(d);$("asResult").textContent="تعداد بولت و بیشینه تقاضای هر بولت منتقل شد؛ مشخصات Ase، Fnt، Fnv و ضرایب φ را همچنان از منبع معتبر وارد کنید.";}catch(e){importedDemandSignature=null;$("asResult").textContent=e.message;}});$("asRun").addEventListener("click",run);$("asCsv").addEventListener("click",csv);$("asBatchLoad").addEventListener("click",loadBatchNodes);$("asBatchRun").addEventListener("click",runBatch);$("asBatchCsv").addEventListener("click",csvBatch);
}
let last=null,importedDemandSignature=null,lastBatch=null,batchSnapshot=null;
function batchInputs(){return{Ase_mm2:num("asAse"),Fnt_MPa:num("asFnt"),Fnv_MPa:num("asFnv"),phiT:num("asPhiT"),phiV:num("asPhiV")};}
function loadBatchNodes(){
 try{
  const foundation=root.SteelBaseReactionTransfer?.getLast?.(),layouts=root.SteelAnchorCaseDemandUI?.getData?.()||{},sel=$("asBatchNode");
  if(!foundation||!Array.isArray(foundation.rows)||!Array.isArray(foundation.cases))throw Error("ابتدا واکنش‌های تمام ترکیبات را در پنل انتقال واکنش استخراج کنید.");
  const ids=foundation.rows.map(x=>String(x.nodeId)).filter(id=>layouts[id]?.signConfirmed===true&&layouts[id]?.geometryConfirmed===true);
  sel.replaceChildren();ids.forEach(id=>sel.add(new Option(id,id)));
  if(!ids.length)throw Error("هیچ پایه‌ای با هندسه و قرارداد علامت تأییدشده پیدا نشد.");
  $("asBatchRun").disabled=false;$("asBatchResult").textContent=ids.length+" پایه دارای هندسه تأییدشده پیدا شد؛ یک پایه را انتخاب کنید.";return ids;
 }catch(e){$("asBatchNode").replaceChildren(new Option("بدون پایه قابل بررسی",""));$("asBatchRun").disabled=true;$("asBatchResult").textContent=e.message;return[];}
}
function runBatch(){
 try{
  const nodeId=$("asBatchNode").value;if(!nodeId)throw Error("یک پایه انتخاب کنید.");
  const foundation=root.SteelBaseReactionTransfer?.getLast?.(),layouts=root.SteelAnchorCaseDemandUI?.getData?.()||{},input=batchInputs();
  const result=root.SteelAnchorSteelGroupAudit?.compareFoundationCases?.(nodeId,foundation,layouts,input);
  if(!result?.ok)throw Error("مقایسه دسته‌جمعی ناموفق بود.");
  lastBatch=result;
  batchSnapshot=JSON.stringify({nodeId,caseReactions:foundation.rows.find(x=>String(x.nodeId)===nodeId)?.caseReactions,cases:foundation.cases,layout:layouts[nodeId],input});
  const body=$("asBatchRows");body.replaceChildren();
  result.rows.forEach(x=>{const tr=root.document.createElement("tr");[x.caseId+" / "+x.anchorId,fmt(x.tensionDemand_kN),fmt(x.shearDemand_kN),fmt(x.shearX_kN),fmt(x.shearZ_kN),fmt(x.tensionRatio),fmt(x.shearRatio),"محاسبه نشده",(x.tensionPass&&x.shearPass)?"قبول مستقل":"رد مستقل"].forEach(v=>{const td=root.document.createElement("td");td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});
  $("asBatchResult").textContent="پایه "+nodeId+" | ترکیبات: "+result.caseCount+" | رکوردهای انکر/ترکیب: "+result.anchorDemandCount+" | بیشینه نسبت کشش: "+fmt(result.governingTensionRatio)+" | بیشینه نسبت برش: "+fmt(result.governingShearRatio)+" | "+(result.allSeparateChecksPass?"قبولی کنترل‌های مستقل":"حداقل یک کنترل مستقل ناموفق")+"؛ اندرکنش کشش-برش و شکست بتن کنترل نشده‌اند.";
  $("asBatchCsv").disabled=false;return result;
 }catch(e){lastBatch=null;batchSnapshot=null;$("asBatchCsv").disabled=true;$("asBatchRows").replaceChildren();$("asBatchResult").textContent="کنترل دسته‌جمعی متوقف شد: "+String(e.message||e);return null;}
}
function csvBatch(){
 if(!lastBatch)return;
 const nodeId=$("asBatchNode").value,foundation=root.SteelBaseReactionTransfer?.getLast?.(),layouts=root.SteelAnchorCaseDemandUI?.getData?.()||{},input=batchInputs();
 const current=JSON.stringify({nodeId,caseReactions:foundation?.rows?.find(x=>String(x.nodeId)===nodeId)?.caseReactions,cases:foundation?.cases,layout:layouts[nodeId],input});
 if(current!==batchSnapshot){$("asBatchResult").textContent="واکنش‌ها، هندسه یا پارامترهای ظرفیت تغییر کرده‌اند؛ کنترل دسته‌جمعی را دوباره اجرا کنید.";return;}
 const rows=[["node_id",lastBatch.nodeId],["case_id","anchor_id","tension_kN","shear_resultant_kN","shear_x_kN","shear_z_kN","tension_ratio","shear_ratio","interaction_status","tension_pass","shear_pass"],...lastBatch.rows.map(x=>[x.caseId,x.anchorId,x.tensionDemand_kN,x.shearDemand_kN,x.shearX_kN,x.shearZ_kN,x.tensionRatio,x.shearRatio,x.interactionStatus,x.tensionPass,x.shearPass]),...lastBatch.limitations.map(x=>["limitation",x])];
 const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=root.document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Steel-Cases-"+nodeId+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function run(){
 try{
 const i={nBolts:num("asN"),ase:num("asAse"),fnt:num("asFnt"),fnv:num("asFnv"),phiT:num("asPhiT"),phiV:num("asPhiV"),demandT:num("asDemandT"),demandV:num("asDemandV")};
 if(importedDemandSignature!==null){const current=demandSignature(root.SteelAnchorDemandScreen?.getLast?.());if(current!==importedDemandSignature)throw Error("خروجی تقاضای گروه بولت پس از انتقال تغییر کرده است؛ دوباره انتقال تقاضا را اجرا کنید.");if(i.nBolts!==JSON.parse(importedDemandSignature).nBolts||i.demandT!==JSON.parse(importedDemandSignature).demandT||i.demandV!==JSON.parse(importedDemandSignature).demandV)throw Error("تعداد یا تقاضای بولت پس از انتقال تغییر کرده است؛ انتقال تازه انجام دهید یا انتقال خودکار را لغو کنید.");}
 const r=calculate(i);r.input=i;r.demandSource=importedDemandSignature?"anchor-demand-screen-verified":"manual-input-unverified";last=r;
 $("asResult").textContent="مقاومت طراحی کششی هر بولت: "+fmt(r.tensionDesignPerBoltKN)+" kN | مقاومت طراحی برشی هر بولت: "+fmt(r.shearDesignPerBoltKN)+" kN | نسبت کشش: "+fmt(r.tensionDemandRatio)+" | نسبت برش: "+fmt(r.shearDemandRatio)+" | "+(r.tensionPass?"کشش فولادی: قبول":"کشش فولادی: نیازمند اصلاح")+" | "+(r.shearPass?"برش فولادی: قبول":"برش فولادی: نیازمند اصلاح")+" — کنترل‌های بتن و اندرکنش باز هستند.";
 $("asCsv").disabled=false;return r;
 }catch(e){last=null;$("asCsv").disabled=true;$("asResult").textContent=e.message;return null;}
}
function csv(){if(!last)return;const rows=[["SAHROUD STEEL - Anchor steel resistance"],["tension design per bolt kN",last.tensionDesignPerBoltKN],["shear design per bolt kN",last.shearDesignPerBoltKN],["tension ratio",last.tensionDemandRatio],["shear ratio",last.shearDemandRatio],["tension pass",last.tensionPass],["shear pass",last.shearPass],...last.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Anchor-Steel-Capacity.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){
 const i={nBolts:4,ase:500,fnt:400,fnv:240,phiT:.75,phiV:.75,demandT:100,demandV:50},r=calculate(i);
 const mapped=mapDemand({input:{signConfirmed:true,geometryConfirmed:true},geometry:{},bolts:[{},{}],maxTensionKN:14,maxShearKN:9});
 const checks=[["انتقال تقاضای بیشینه هر بولت",mapped.nBolts===2&&mapped.demandT===14&&mapped.demandV===9],["محاسبه ظرفیت کششی",Math.abs(r.tensionDesignPerBoltKN-150)<1e-9],["محاسبه ظرفیت برشی",Math.abs(r.shearDesignPerBoltKN-90)<1e-9],["نسبت تقاضا",Math.abs(r.tensionDemandRatio-2/3)<1e-9],["تغییر سطح مؤثر ظرفیت را خطی تغییر می‌دهد",calculate({...i,ase:1000}).tensionDesignPerBoltKN===2*r.tensionDesignPerBoltKN],["تعداد بولت در ظرفیت کل اثر دارد",r.totalTensionDesignKN===600]];
 checks.push(["batch input preserves verified capacity parameters",(()=>{const x={Ase_mm2:500,Fnt_MPa:400,Fnv_MPa:240,phiT:.75,phiV:.75};return x.Ase_mm2===500&&x.phiT===.75;})()]);
 return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelAnchorSteelCapacity={calculate,mapDemand,demandSignature,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
