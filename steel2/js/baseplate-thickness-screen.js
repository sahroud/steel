/* SAHROUD STEEL — base-plate elastic bearing and thickness screening.
 * Full-contact linear pressure only. Partial contact / anchor tension is deliberately rejected.
 * Plate cantilever strips use maximum corner pressure as a conservative preliminary screen.
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
 if(!Number.isFinite(i.momentX)||!Number.isFinite(i.momentZ))throw Error("هر دو لنگر هم‌زمان را وارد کنید؛ برای صفر، عدد صفر بنویسید.");
 if(i.compressionKN<=0)throw Error("نیروی محوری باید فشار مثبت باشد؛ کشش محوری در این غربال قابل بررسی نیست.");
 const B=i.plateX,L=i.plateZ,N=i.compressionKN*1000;
 const Mx=i.momentX*1e6,Mz=i.momentZ*1e6;
 const A=B*L,Ix=B*Math.pow(L,3)/12,Iz=L*Math.pow(B,3)/12;
 const corners=[
  {name:"X− / Z−",x:-B/2,z:-L/2},{name:"X+ / Z−",x:B/2,z:-L/2},
  {name:"X− / Z+",x:-B/2,z:L/2},{name:"X+ / Z+",x:B/2,z:L/2}
 ].map(c=>({...c,pressureMPa:N/A+Mx*c.z/Ix+Mz*c.x/Iz}));
 const qmin=Math.min(...corners.map(c=>c.pressureMPa)),qmax=Math.max(...corners.map(c=>c.pressureMPa));
 if(qmin<=0)throw Error("فشار گوشه‌ای حداقل "+fmt(qmin)+" MPa است؛ صفحه در فرض تماس کامل جداشدگی/کشش پیدا می‌کند. این حالت به تحلیل تماس جزئی و اندرکنش انکربولت نیاز دارد و عمداً در این غربال محاسبه نمی‌شود.");
 const ax=(B-i.columnX)/2,az=(L-i.columnZ)/2;
 const mx=qmax*ax*ax/2,mz=qmax*az*az/2;
 const tx=Math.sqrt(6*mx/i.fyMPa),tz=Math.sqrt(6*mz/i.fyMPa);
 const reqT=Math.max(tx,tz),provided=i.plateT;
 return {areaMm2:A,inertiaXmm4:Ix,inertiaZmm4:Iz,corners,qminMPa:qmin,qmaxMPa:qmax,averagePressureMPa:N/A,projectionXmm:ax,projectionZmm:az,momentX_NmmPerMm:mx,momentZ_NmmPerMm:mz,requiredThicknessXmm:tx,requiredThicknessZmm:tz,requiredThicknessMm:reqT,providedThicknessMm:provided,ratio:reqT/provided,screenStatus:provided>=reqT?"ضخامت ورودی از ضخامت غربال‌شده کمتر نیست":"ضخامت ورودی از ضخامت غربال‌شده کمتر است",method:"linear_full_contact_bearing_plus_qmax_cantilever_strip_first_yield",limitations:["فشار زیر صفحه به‌صورت خطی و الاستیک روی کل سطح صفحه فرض شده است؛ نتیجه فقط وقتی معتبر است که فشار تمام گوشه‌ها فشاری و مثبت بماند.","اگر هر گوشه از تماس خارج شود، این ابزار متوقف می‌شود؛ تماس جزئی و کشش بولت‌ها تحلیل نشده‌اند.","برای خم‌شدگی طره‌ای، فشار بیشینه گوشه‌ای به‌طور یکنواخت روی نوار فرض شده؛ این تقریب مقدماتی است و مدل واقعی صفحه/ستون را جایگزین نمی‌کند.","Fy از ورودی کاربر است؛ ضریب مقاومت، ضوابط آیین‌نامه‌ای، خستگی و لرزه‌ای اعمال نشده‌اند.","کنترل مقاومت بتن و گروت، جوش ستون به صفحه، سخت‌کننده، سوراخ‌ها، کمانش موضعی، prying و اندرکنش بولت‌ها انجام نشده است.","این خروجی طراحی نهایی یا مجوز ساخت نیست و باید با روش معتبر آیین‌نامه‌ای و مهندس محاسب بازبینی شود."]};
}
function mount(){
 if($("baseplateThicknessScreenPanel"))return;
 const anchor=$("anchorDemandScreenPanel")||$("baseplateAnchorDrawingsPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="baseplateThicknessScreenPanel";
 p.innerHTML='<div class="panel-title"><h3>غربال ضخامت صفحه‌ستون و فشار زیر صفحه</h3><span class="status">تماس کامل الاستیک</span></div>'+
 '<div class="notice">نیروی محوری N را با فشار مثبت و لنگرهای هم‌زمان یک ترکیب بار وارد کنید. توزیع فشار خطی روی کل صفحه محاسبه می‌شود. اگر هر گوشه از تماس خارج شود، محاسبه متوقف می‌شود تا طراحی تماس جزئی و بولت‌ها جداگانه انجام شود.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label>عرض صفحه X (mm)</label><input id="bpTsPlateX" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>طول صفحه Z (mm)</label><input id="bpTsPlateZ" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>ضخامت موجود صفحه (mm)</label><input id="bpTsPlateT" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>عرض footprint ستون X (mm)</label><input id="bpTsColumnX" type="number" min="1" step="1" placeholder="از مقطع واقعی ستون"></div>'+
 '<div class="field"><label>طول footprint ستون Z (mm)</label><input id="bpTsColumnZ" type="number" min="1" step="1" placeholder="از مقطع واقعی ستون"></div>'+
 '<div class="field"><label>نیروی محوری N (kN؛ فشار مثبت)</label><input id="bpTsN" type="number" min="0" step="0.1" placeholder="از ترکیب بار"></div>'+
 '<div class="field"><label>لنگر Mx (kN.m)</label><input id="bpTsMx" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>لنگر Mz (kN.m)</label><input id="bpTsMz" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>تنش تسلیم صفحه Fy (MPa)</label><input id="bpTsFy" type="number" min="1" step="1" placeholder="از مشخصات فولاد"></div>'+
 '</div><div class="button-grid"><button id="btnBaseplateThicknessRun" class="btn primary" type="button">محاسبه فشار و ضخامت غربال‌شده</button><button id="btnBaseplateThicknessCSV" class="btn secondary" type="button" disabled>دریافت گزارش CSV</button></div>'+
 '<div id="baseplateThicknessResult" class="notice">ابعاد صفحه، footprint ستون، N، Mx، Mz و Fy را وارد کنید.</div>'+
 '<div id="baseplateCornerPressures" class="notice">فشار چهار گوشه پس از محاسبه نمایش داده می‌شود.</div>'+
 '<div class="notice">این ابزار تماس جزئی، کشش بولت، اثر اهرمی صفحه، جوش و سخت‌کننده را طراحی نمی‌کند. نتیجه صرفاً غربال مقدماتی است.</div>';
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
 $("baseplateThicknessResult").textContent="فشار متوسط: "+fmt(r.averagePressureMPa)+" MPa | حداقل فشار گوشه: "+fmt(r.qminMPa)+" MPa | حداکثر فشار گوشه: "+fmt(r.qmaxMPa)+" MPa | ضخامت غربال‌شده X: "+fmt(r.requiredThicknessXmm)+" mm | ضخامت غربال‌شده Z: "+fmt(r.requiredThicknessZmm)+" mm | حداقل ضخامت غربال‌شده: "+fmt(r.requiredThicknessMm)+" mm | ضخامت موجود: "+fmt(r.providedThicknessMm)+" mm | "+r.screenStatus;
 $("baseplateCornerPressures").textContent="فشار گوشه‌ها (MPa): "+r.corners.map(c=>c.name+": "+fmt(c.pressureMPa)).join(" | ");
 $("btnBaseplateThicknessCSV").disabled=false;return r;
 }catch(e){last=null;$("btnBaseplateThicknessCSV").disabled=true;$("baseplateThicknessResult").textContent=e.message;$("baseplateCornerPressures").textContent="نتیجه فشار گوشه‌ای در دسترس نیست.";return null;}
}
function csv(){
 if(!last)return;
 const rows=[["SAHROUD STEEL - Base plate elastic bearing screen"],["method",last.method],["average pressure MPa",last.averagePressureMPa],["minimum corner pressure MPa",last.qminMPa],["maximum corner pressure MPa",last.qmaxMPa],["required thickness X mm",last.requiredThicknessXmm],["required thickness Z mm",last.requiredThicknessZmm],["required thickness mm",last.requiredThicknessMm],["provided thickness mm",last.providedThicknessMm],["status",last.screenStatus],["corner","x mm","z mm","pressure MPa"],...last.corners.map(c=>[c.name,c.x,c.z,c.pressureMPa]),...last.limitations.map(x=>["limitation",x])];
 const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Baseplate-Bearing-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function selfTest(){
 const base={plateX:400,plateZ:400,plateT:20,columnX:200,columnZ:200,compressionKN:400,fyMPa:240,momentX:0,momentZ:0};
 const r=calculate(base);
 const ecc=calculate({...base,momentX:5});
 const checks=[
 ["فشار یکنواخت مثبت",r.qminMPa>0&&r.qmaxMPa>0],
 ["ضخامت تقاضای مثبت",r.requiredThicknessMm>0],
 ["تقارن دو راستا",Math.abs(r.requiredThicknessXmm-r.requiredThicknessZmm)<1e-9],
 ["افزایش بار ضخامت لازم را افزایش می‌دهد",calculate({...base,compressionKN:800}).requiredThicknessMm>r.requiredThicknessMm],
 ["لنگر کوچک فشار گوشه‌ها را تفکیک می‌کند",ecc.qmaxMPa>ecc.qminMPa],
 ["لنگر علامت معکوس، بیشینه فشار یکسان دارد",Math.abs(ecc.qmaxMPa-calculate({...base,momentX:-5}).qmaxMPa)<1e-9],
 ["تماس ناقص رد می‌شود",(()=>{try{calculate({...base,momentX:100});return false;}catch(e){return e.message.includes("تماس")||e.message.includes("گوشه");}})()]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelBaseplateThicknessScreen={calculate,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
