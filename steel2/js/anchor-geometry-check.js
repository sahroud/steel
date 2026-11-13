/* SAHROUD STEEL — anchor layout dimensional comparison.
 * Compares as-built/input dimensions against user-entered governing minimums; no code values assumed.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
function compare(i){
 const positive=["boltDia","holeDia","edgeX","edgeZ","embedment","minEdge","minEmbedment"];
 positive.forEach(k=>{if(!(Number.isFinite(i[k])&&i[k]>0))throw Error("ورودی "+k+" باید مثبت و معتبر باشد.");});
 if(i.holeDia<=i.boltDia)throw Error("قطر سوراخ باید از قطر بولت بزرگ‌تر باشد.");
 if(i.cols>1&&(!(i.pitchX>0)||!(i.minPitchX>0)))throw Error("فاصله محور بولت X و حداقل موردنیاز باید مثبت باشد.");
 if(i.rows>1&&(!(i.pitchZ>0)||!(i.minPitchZ>0)))throw Error("فاصله محور بولت Z و حداقل موردنیاز باید مثبت باشد.");
 if(!Number.isInteger(i.cols)||!Number.isInteger(i.rows)||i.cols<1||i.rows<1)throw Error("تعداد ردیف و ستون باید عدد صحیح مثبت باشد.");
 const checks=[
  {name:"فاصله لبه X",actual:i.edgeX,required:i.minEdge,pass:i.edgeX>=i.minEdge},
  {name:"فاصله لبه Z",actual:i.edgeZ,required:i.minEdge,pass:i.edgeZ>=i.minEdge},
  {name:"طول مهاری",actual:i.embedment,required:i.minEmbedment,pass:i.embedment>=i.minEmbedment}
 ];
 if(i.cols>1)checks.push({name:"گام بولت X",actual:i.pitchX,required:i.minPitchX,pass:i.pitchX>=i.minPitchX});
 if(i.rows>1)checks.push({name:"گام بولت Z",actual:i.pitchZ,required:i.minPitchZ,pass:i.pitchZ>=i.minPitchZ});
 return{checks,allPass:checks.every(c=>c.pass),boltCount:i.cols*i.rows,limitations:["حداقل‌های موردنیاز باید از آیین‌نامه حاکم، نوع مهار، بتن، شرایط لبه و نقشه مصوب استخراج شوند؛ نرم‌افزار مقدار آیین‌نامه‌ای تعیین نمی‌کند.","این مقایسه هندسی، مقاومت فولادی بولت، شکست مخروطی بتن، pullout، pry-out، side-face blowout، اندرکنش، اثر گروه و الزامات لرزه‌ای را کنترل نمی‌کند.","طول مهاری ورودی باید با تعریف دقیق عمق مؤثر مهاری و جزئیات انتهایی بولت یکسان باشد؛ طول کل بولت یا بیرون‌زدگی جایگزین آن نیست."]};
}
function mount(){
 if($("anchorGeometryCheckPanel"))return;
 const a=$("anchorSteelCapacityPanel")||$("anchorDemandScreenPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorGeometryCheckPanel";
 p.innerHTML='<div class="panel-title"><h3>کنترل ابعادی آرایش و مهار بولت</h3><span class="status">حداقل‌ها از ورودی طراح</span></div><div class="notice">فاصله‌ها و حداقل‌های موردنیاز را با واحد میلی‌متر وارد کنید. این بخش هیچ حداقل آیین‌نامه‌ای را به‌صورت پیش‌فرض حدس نمی‌زند.</div><div class="form-grid">'+
 '<div class="field"><label>قطر بولت (mm)</label><input id="agDia" type="number" min="1" step="1"></div>'+
 '<div class="field"><label>قطر سوراخ (mm)</label><input id="agHole" type="number" min="1" step="1"></div>'+
 '<div class="field"><label>تعداد ستون X</label><input id="agCols" type="number" min="1" step="1" value="2"></div>'+
 '<div class="field"><label>تعداد ردیف Z</label><input id="agRows" type="number" min="1" step="1" value="2"></div>'+
 '<div class="field"><label>فاصله محور بولت X (mm)</label><input id="agPitchX" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل گام X (mm)</label><input id="agMinPitchX" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>فاصله محور بولت Z (mm)</label><input id="agPitchZ" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل گام Z (mm)</label><input id="agMinPitchZ" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>فاصله لبه X (mm)</label><input id="agEdgeX" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>فاصله لبه Z (mm)</label><input id="agEdgeZ" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل فاصله لبه (mm)</label><input id="agMinEdge" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>عمق مهاری مؤثر (mm)</label><input id="agEmbed" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل عمق مهاری موردنیاز (mm)</label><input id="agMinEmbed" type="number" min="0" step="1"></div>'+
 '</div><div class="button-grid"><button id="agRun" class="btn primary" type="button">کنترل ابعاد مهار</button><button id="agCsv" class="btn secondary" type="button" disabled>خروجی CSV</button></div><div id="agResult" class="notice">ورودی‌ها را تکمیل کنید.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("agRun").addEventListener("click",run);$("agCsv").addEventListener("click",csv);
}
let last=null;
function run(){try{const i={boltDia:num("agDia"),holeDia:num("agHole"),cols:num("agCols"),rows:num("agRows"),pitchX:num("agPitchX"),minPitchX:num("agMinPitchX"),pitchZ:num("agPitchZ"),minPitchZ:num("agMinPitchZ"),edgeX:num("agEdgeX"),edgeZ:num("agEdgeZ"),minEdge:num("agMinEdge"),embedment:num("agEmbed"),minEmbedment:num("agMinEmbed")};const r=compare(i);r.input=i;last=r;$("agResult").textContent=r.checks.map(c=>c.name+": "+fmt(c.actual)+" / حداقل "+fmt(c.required)+" mm — "+(c.pass?"قبول عددی":"کمتر از حداقل ورودی")).join(" | ")+" | تعداد بولت: "+r.boltCount+" | "+(r.allPass?"همه مقایسه‌های عددی قبول":"حداقل یک مقایسه نیازمند اصلاح")+" — این نتیجه تأیید آیین‌نامه‌ای نیست.";$("agCsv").disabled=false;return r;}catch(e){last=null;$("agCsv").disabled=true;$("agResult").textContent=e.message;return null;}}
function csv(){if(!last)return;const rows=[["SAHROUD STEEL - Anchor geometry comparison"],["check","actual mm","required mm","numeric pass"],...last.checks.map(c=>[c.name,c.actual,c.required,c.pass]),...last.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Anchor-Geometry-Check.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){const i={boltDia:20,holeDia:24,cols:2,rows:2,pitchX:150,minPitchX:120,pitchZ:150,minPitchZ:120,edgeX:60,edgeZ:60,minEdge:50,embedment:400,minEmbedment:350};const r=compare(i),bad=compare({...i,edgeX:40});const checks=[["قبول ابعاد مطابق حداقل ورودی",r.allPass],["رد فاصله لبه ناکافی",!bad.allPass],["شمارش بولت",r.boltCount===4],["تغییر حداقل گام، وضعیت را تغییر می‌دهد",!compare({...i,minPitchX:160}).allPass]];return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};}
root.SteelAnchorGeometryCheck={compare,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
