/* SAHROUD STEEL — preliminary base-plate thickness screen.
 * Centered compression only; uniform bearing pressure and cantilever-strip approximation.
 * Not a code-complete base-plate design. No eccentric contact, anchor tension, prying or stiffener design.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const n=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
function calculate(i){
 const req=["plateX","plateZ","plateT","columnX","columnZ","compressionKN","fyMPa"];
 req.forEach(k=>{if(!(Number.isFinite(i[k])&&i[k]>0))throw Error("ورودی معتبر و مثبت برای "+k+" لازم است.");});
 if(i.columnX>=i.plateX||i.columnZ>=i.plateZ)throw Error("ابعاد footprint ستون باید از ابعاد صفحه کوچک‌تر باشد.");
 if(i.momentX!==0||i.momentZ!==0)throw Error("این غربال فقط فشار محوری مرکزی را می‌پذیرد؛ برای لنگر غیرصفر باید تحلیل تماس و کشش بولت انجام شود.");
 if(i.compressionKN<=0)throw Error("نیروی فشار محوری باید مثبت باشد.");
 const ax=(i.plateX-i.columnX)/2,az=(i.plateZ-i.columnZ)/2;
 const q=i.compressionKN*1000/(i.plateX*i.plateZ); // N/mm2
 const mx=q*ax*ax/2,mz=q*az*az/2; // N.mm per mm strip
 const tx=Math.sqrt(6*mx/i.fyMPa),tz=Math.sqrt(6*mz/i.fyMPa);
 const reqT=Math.max(tx,tz),provided=i.plateT,ratio=provided>0?reqT/provided:null;
 return {pressureMPa:q,projectionXmm:ax,projectionZmm:az,momentX_NmmPerMm:mx,momentZ_NmmPerMm:mz,requiredThicknessXmm:tx,requiredThicknessZmm:tz,requiredThicknessMm:reqT,providedThicknessMm:provided,ratio,screenStatus:provided>=reqT?"ضخامت ورودی از ضخامت غربال‌شده کمتر نیست":"ضخامت ورودی از ضخامت غربال‌شده کمتر است",method:"uniform_centered_compression_cantilever_strip_first_yield",limitations:["فقط فشار محوری مرکزی و توزیع یکنواخت فشار زیر کل سطح صفحه فرض شده است.","لنگر، خروج از مرکزیت، جداشدگی صفحه از گروت/بتن، کشش بولت، prying و اندرکنش نیروها مدل نشده‌اند.","تنش تسلیم Fy فقط از ورودی کاربر گرفته می‌شود؛ ضریب مقاومت، ضوابط آیین‌نامه‌ای، خستگی و لرزه‌ای اعمال نشده‌اند.","کنترل فشار مجاز/مقاومت بتن، گروت، جوش ستون به صفحه، سخت‌کننده، سوراخ‌ها، کمانش موضعی و جزئیات ساخت انجام نشده است.","مدل نوار طره‌ای ساده برای غربال ضخامت است و جایگزین روش طراحی معتبر و بررسی مهندس محاسب نیست."]};
}
function mount(){
 if($("baseplateThicknessScreenPanel"))return;
 const anchor=$("anchorDemandScreenPanel")||$("baseplateAnchorDrawingsPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="baseplateThicknessScreenPanel";
 p.innerHTML='<div class="panel-title"><h3>غربال مقدماتی ضخامت صفحه‌ستون</h3><span class="status">فقط فشار مرکزی</span></div>'+
 '<div class="notice">ابعاد صفحه و footprint ستون در صورت وجود از بخش نقشه هندسی خوانده می‌شوند. بار فشاری و Fy باید از ترکیب بار و مشخصات واقعی مصالح وارد شوند. این ابزار برای لنگر/کشش پای ستون طراحی نشده است.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label>عرض صفحه X (mm)</label><input id="bpTsPlateX" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>طول صفحه Z (mm)</label><input id="bpTsPlateZ" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>ضخامت موجود صفحه (mm)</label><input id="bpTsPlateT" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>عرض footprint ستون X (mm)</label><input id="bpTsColumnX" type="number" min="1" step="1" placeholder="از مقطع واقعی ستون"></div>'+
 '<div class="field"><label>طول footprint ستون Z (mm)</label><input id="bpTsColumnZ" type="number" min="1" step="1" placeholder="از مقطع واقعی ستون"></div>'+
 '<div class="field"><label>نیروی فشار محوری هم‌زمان (kN؛ مثبت)</label><input id="bpTsN" type="number" min="0" step="0.1" placeholder="فقط فشار مرکزی"></div>'+
 '<div class="field"><label>تنش تسلیم صفحه Fy (MPa)</label><input id="bpTsFy" type="number" min="1" step="1" placeholder="از گواهی/مشخصات فولاد"></div>'+
 '<div class="field"><label>لنگر حول X (kN.m؛ برای کنترل صفر وارد شود)</label><input id="bpTsMx" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>لنگر حول Z (kN.m؛ برای کنترل صفر وارد شود)</label><input id="bpTsMz" type="number" step="0.1" value="0"></div>'+
 '</div><div class="button-grid"><button id="btnBaseplateThicknessRun" class="btn primary" type="button">محاسبه ضخامت غربال‌شده</button><button id="btnBaseplateThicknessCSV" class="btn secondary" type="button" disabled>دریافت گزارش CSV</button></div>'+
 '<div id="baseplateThicknessResult" class="notice">برای شروع، بار فشاری و مشخصات هندسی/مصالح را وارد کنید.</div>'+
 '<div class="notice">این نتیجه تأیید طراحی یا مجوز ساخت نیست. در حالت لنگردار یا کششی، نرم‌افزار عمداً محاسبه ساده را متوقف می‌کند.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 const copy=[["bpPlateX","bpTsPlateX"],["bpPlateZ","bpTsPlateZ"],["bpPlateT","bpTsPlateT"],["bpColumnX","bpTsColumnX"],["bpColumnZ","bpTsColumnZ"]];
 copy.forEach(([a,b])=>{const src=$(a),dst=$(b);if(src&&dst&&src.value)dst.value=src.value;});
 $("btnBaseplateThicknessRun").addEventListener("click",run);
 $("btnBaseplateThicknessCSV").addEventListener("click",csv);
}
let last=null;
function run(){
 try{
 const i={plateX:n($("bpTsPlateX").value),plateZ:n($("bpTsPlateZ").value),plateT:n($("bpTsPlateT").value),columnX:n($("bpTsColumnX").value),columnZ:n($("bpTsColumnZ").value),compressionKN:n($("bpTsN").value),fyMPa:n($("bpTsFy").value),momentX:n($("bpTsMx").value),momentZ:n($("bpTsMz").value)};
 const r=calculate(i);r.input=i;last=r;
 $("baseplateThicknessResult").textContent="فشار یکنواخت فرضی: "+fmt(r.pressureMPa)+" MPa | بیرون‌زدگی X: "+fmt(r.projectionXmm)+" mm | بیرون‌زدگی Z: "+fmt(r.projectionZmm)+" mm | ضخامت غربال‌شده X: "+fmt(r.requiredThicknessXmm)+" mm | ضخامت غربال‌شده Z: "+fmt(r.requiredThicknessZmm)+" mm | حداقل غربال‌شده: "+fmt(r.requiredThicknessMm)+" mm | ضخامت موجود: "+fmt(r.providedThicknessMm)+" mm | "+r.screenStatus+" — این نتیجه فقط غربال اولیه است.";
 $("btnBaseplateThicknessCSV").disabled=false;return r;
 }catch(e){last=null;$("btnBaseplateThicknessCSV").disabled=true;$("baseplateThicknessResult").textContent=e.message;return null;}
}
function csv(){
 if(!last)return;
 const rows=[["SAHROUD STEEL - Preliminary base plate screen"],["method",last.method],["plate pressure MPa",last.pressureMPa],["projection X mm",last.projectionXmm],["projection Z mm",last.projectionZmm],["required thickness X mm",last.requiredThicknessXmm],["required thickness Z mm",last.requiredThicknessZmm],["required thickness mm",last.requiredThicknessMm],["provided thickness mm",last.providedThicknessMm],["status",last.screenStatus],...last.limitations.map(x=>["limitation",x])];
 const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Baseplate-Thickness-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function selfTest(){
 const base={plateX:400,plateZ:400,plateT:20,columnX:200,columnZ:200,compressionKN:400,fyMPa:240,momentX:0,momentZ:0};
 const r=calculate(base),checks=[["فشار یکنواخت مثبت",r.pressureMPa>0],["ضخامت تقاضای مثبت",r.requiredThicknessMm>0],["تقارن دو راستا",Math.abs(r.requiredThicknessXmm-r.requiredThicknessZmm)<1e-9],["افزایش بار ضخامت لازم را افزایش می‌دهد",calculate({...base,compressionKN:800}).requiredThicknessMm>r.requiredThicknessMm],["لنگر غیرصفر رد می‌شود",(()=>{try{calculate({...base,momentX:10});return false;}catch(e){return true;}})()]];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelBaseplateThicknessScreen={calculate,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
