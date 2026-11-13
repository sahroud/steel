/* SAHROUD STEEL — user-specified concrete/grout bearing resistance comparison.
 * No code bearing strength is inferred; user enters verified design resistance.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
function compare(i){
 if(!(i.qmaxMPa>0&&i.designBearingMPa>0))throw Error("فشار بیشینه و مقاومت طراحی فشاری باید مثبت باشند.");
 const ratio=i.qmaxMPa/i.designBearingMPa;
 return{qmaxMPa:i.qmaxMPa,designBearingMPa:i.designBearingMPa,ratio,marginMPa:i.designBearingMPa-i.qmaxMPa,pass:ratio<=1,limitations:["مقاومت طراحی فشاری باید با توجه به بتن، گروت، مساحت بارگذاری، هندسه پی و ضوابط آیین‌نامه‌ای توسط طراح تعیین شود.","این مقایسه ساده، توزیع واقعی تنش در گروت/بتن، شکست موضعی، لبه پی، آرماتورگذاری، ترک‌خوردگی، لنگرهای موضعی و تنش‌های کششی را طراحی نمی‌کند.","فشار qmax باید از ترکیب بار هم‌زمان مربوط به همین صفحه و همان ابعاد گرفته شود؛ مقایسه بارهای نامتجانس معتبر نیست."]};
}
function mount(){
 if($("baseplateBearingCapacityPanel"))return;
 const a=$("baseplateThicknessScreenPanel")||$("anchorSteelCapacityPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="baseplateBearingCapacityPanel";
 p.innerHTML='<div class="panel-title"><h3>مقایسه فشار صفحه‌ستون با مقاومت فشاری بتن/گروت</h3><span class="status">مقاومت ورودی کاربر</span></div><div class="notice">فشار بیشینه را از خروجی محاسبه صفحه‌ستون وارد کنید. مقاومت طراحی فشاری باید با روش آیین‌نامه‌ای و مشخصات بتن/گروت تعیین شده باشد؛ نرم‌افزار آن را حدس نمی‌زند.</div><div class="form-grid">'+
 '<div class="field"><label>فشار بیشینه زیر صفحه qmax (MPa)</label><input id="bcQmax" type="number" min="0" step="0.001" placeholder="از تحلیل صفحه‌ستون"></div>'+
 '<div class="field"><label>مقاومت طراحی فشاری بتن/گروت (MPa)</label><input id="bcDesign" type="number" min="0" step="0.1" placeholder="از محاسبه آیین‌نامه‌ای"></div>'+
 '</div><div class="button-grid"><button id="bcRun" class="btn primary" type="button">مقایسه فشار و مقاومت</button><button id="bcCsv" class="btn secondary" type="button" disabled>خروجی CSV</button></div><div id="bcResult" class="notice">دو مقدار را وارد کنید.</div><div class="notice">این مقایسه به‌تنهایی کنترل کامل فشار تکیه‌گاهی بتن یا گروت نیست.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("bcRun").addEventListener("click",run);$("bcCsv").addEventListener("click",csv);
}
let last=null;
function run(){try{const i={qmaxMPa:num("bcQmax"),designBearingMPa:num("bcDesign")},r=compare(i);r.input=i;last=r;$("bcResult").textContent="نسبت فشار به مقاومت: "+fmt(r.ratio)+" | حاشیه مقاومت: "+fmt(r.marginMPa)+" MPa | "+(r.pass?"مقایسه عددی: فشار از مقاومت طراحی بیشتر نیست":"مقایسه عددی: فشار از مقاومت طراحی بیشتر است")+" — کنترل کامل آیین‌نامه‌ای همچنان لازم است.";$("bcCsv").disabled=false;return r;}catch(e){last=null;$("bcCsv").disabled=true;$("bcResult").textContent=e.message;return null;}}
function csv(){if(!last)return;const rows=[["SAHROUD STEEL - Bearing comparison"],["qmax MPa",last.qmaxMPa],["design bearing resistance MPa",last.designBearingMPa],["ratio",last.ratio],["margin MPa",last.marginMPa],["numeric comparison pass",last.pass],...last.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Concrete-Grout-Bearing.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){const r=compare({qmaxMPa:8,designBearingMPa:10}),checks=[["نسبت فشار به مقاومت",Math.abs(r.ratio-.8)<1e-9],["حاشیه مقاومت",r.marginMPa===2],["رد فشار بیش از مقاومت",!compare({qmaxMPa:12,designBearingMPa:10}).pass],["قبول مقایسه زیر مقاومت",r.pass]];return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};}
root.SteelBaseplateBearingCapacity={compare,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
