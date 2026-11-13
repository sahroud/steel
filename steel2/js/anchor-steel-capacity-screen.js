/* SAHROUD STEEL — anchor rod steel resistance calculator.
 * Uses user-entered code stress parameters; does not select code values or check concrete anchorage.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
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
 '</div><div class="button-grid"><button id="asRun" class="btn primary" type="button">محاسبه مقاومت فولادی</button><button id="asCsv" class="btn secondary" type="button" disabled>خروجی CSV</button></div><div id="asResult" class="notice">ورودی‌ها را تکمیل کنید.</div><div class="notice">تأیید مقاومت فولادی به معنی تأیید مهار در بتن یا تأیید اتصال نیست.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("asRun").addEventListener("click",run);$("asCsv").addEventListener("click",csv);
}
let last=null;
function run(){
 try{
 const i={nBolts:num("asN"),ase:num("asAse"),fnt:num("asFnt"),fnv:num("asFnv"),phiT:num("asPhiT"),phiV:num("asPhiV"),demandT:num("asDemandT"),demandV:num("asDemandV")};
 const r=calculate(i);r.input=i;last=r;
 $("asResult").textContent="مقاومت طراحی کششی هر بولت: "+fmt(r.tensionDesignPerBoltKN)+" kN | مقاومت طراحی برشی هر بولت: "+fmt(r.shearDesignPerBoltKN)+" kN | نسبت کشش: "+fmt(r.tensionDemandRatio)+" | نسبت برش: "+fmt(r.shearDemandRatio)+" | "+(r.tensionPass?"کشش فولادی: قبول":"کشش فولادی: نیازمند اصلاح")+" | "+(r.shearPass?"برش فولادی: قبول":"برش فولادی: نیازمند اصلاح")+" — کنترل‌های بتن و اندرکنش باز هستند.";
 $("asCsv").disabled=false;return r;
 }catch(e){last=null;$("asCsv").disabled=true;$("asResult").textContent=e.message;return null;}
}
function csv(){if(!last)return;const rows=[["SAHROUD STEEL - Anchor steel resistance"],["tension design per bolt kN",last.tensionDesignPerBoltKN],["shear design per bolt kN",last.shearDesignPerBoltKN],["tension ratio",last.tensionDemandRatio],["shear ratio",last.shearDemandRatio],["tension pass",last.tensionPass],["shear pass",last.shearPass],...last.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Anchor-Steel-Capacity.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){
 const i={nBolts:4,ase:500,fnt:400,fnv:240,phiT:.75,phiV:.75,demandT:100,demandV:50},r=calculate(i);
 const checks=[["محاسبه ظرفیت کششی",Math.abs(r.tensionDesignPerBoltKN-150)<1e-9],["محاسبه ظرفیت برشی",Math.abs(r.shearDesignPerBoltKN-90)<1e-9],["نسبت تقاضا",Math.abs(r.tensionDemandRatio-2/3)<1e-9],["تغییر سطح مؤثر ظرفیت را خطی تغییر می‌دهد",calculate({...i,ase:1000}).tensionDesignPerBoltKN===2*r.tensionDesignPerBoltKN],["تعداد بولت در ظرفیت کل اثر دارد",r.totalTensionDesignKN===600]];
 return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelAnchorSteelCapacity={calculate,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
