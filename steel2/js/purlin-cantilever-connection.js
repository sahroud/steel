/* SAHROUD STEEL - Preliminary purlin cantilever connection screen 1.1 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const fmt=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toLocaleString("fa-IR",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
const defaults={type:"clip",rows:2,cols:2,diameter:16,hole:18,fub:800,plateThickness:10,plateFy:240,plateFu:360,edge:40,sideEdge:35,plateWidth:130,pitch:60,gage:60};
let pendingData=Object.assign({},defaults);
const ids={type:"pcConnType",rows:"pcConnRows",cols:"pcConnCols",diameter:"pcConnDiameter",hole:"pcConnHole",fub:"pcConnFub",plateThickness:"pcConnPlateT",plateFy:"pcConnPlateFy",plateFu:"pcConnPlateFu",edge:"pcConnEdge",sideEdge:"pcConnSideEdge",plateWidth:"pcConnPlateWidth",pitch:"pcConnPitch",gage:"pcConnGage"};
function getData(){const d=Object.assign({},pendingData);Object.entries(ids).forEach(([k,id])=>{if($(id))d[k]=$(id).value;});pendingData=Object.assign({},d);return d;}
function setData(data){pendingData=Object.assign({},defaults,data||{});Object.entries(ids).forEach(([k,id])=>{if($(id)&&pendingData[k]!==undefined)$(id).value=pendingData[k];});}
function bindButton(){
 const button=$("btnPurlinConnCalc");
 if(button&&button.dataset.connectionBound!=="1"){
  button.addEventListener("click",calculate);
  button.dataset.connectionBound="1";
 }
}
function ensurePanel(){
 if($("purlinCantileverConnectionPanel")){bindButton();return;}
 const main=document.querySelector("main");if(!main)return;
 const anchor=$("roofTiesPanel")||$("longitudinalCantileverPanel")||$("connectionDesignPanel");
 const panel=document.createElement("section");panel.className="panel";panel.id="purlinCantileverConnectionPanel";
 panel.innerHTML=`
 <div class="panel-title"><h3>کنترل مقدماتی اتصال پرلین کنسول طولی</h3></div>
 <div class="notice">این بخش مستقل از طراحی گروه جوش رفتر است. مدل فعلی، اتصال پیچی ساده با انتقال برش توسط پیچ‌ها و انتقال لنگر را با توزیع الاستیک نیرو در گروه پیچ و بر اساس ردیف/ستون فرضی به‌صورت غربالگری بررسی می‌کند. نوع اتصال و آرایش واقعی باید با نقشه اجرایی تطبیق داده شود.</div>
 <h4>۱ ـ مدل و مشخصات اتصال</h4><div class="form-grid">
 <div class="field"><label for="pcConnType">مدل اتصال</label><select id="pcConnType"><option value="clip">نبشی/ورق اتصال پیچی ساده</option><option value="endplate">ورق انتهایی پیچی</option><option value="seat">نشیمن با پیچ مهاری</option></select></div>
 <div class="field"><label for="pcConnRows">تعداد ردیف پیچ در جهت انتقال لنگر</label><input id="pcConnRows" type="number" min="2" step="1" value="2"></div><div class="field"><label for="pcConnCols">تعداد پیچ در هر ردیف</label><input id="pcConnCols" type="number" min="1" step="1" value="2"></div>
 <div class="field"><label for="pcConnDiameter">قطر اسمی پیچ (mm)</label><input id="pcConnDiameter" type="number" min="8" step="1" value="16"></div><div class="field"><label for="pcConnHole">قطر سوراخ پیچ (mm)</label><input id="pcConnHole" type="number" min="8" step="1" value="18"></div>
 <div class="field"><label for="pcConnFub">مقاومت نهایی پیچ Fub (MPa)</label><input id="pcConnFub" type="number" min="300" step="10" value="800"></div>
 <div class="field"><label for="pcConnPlateT">ضخامت ورق اتصال (mm)</label><input id="pcConnPlateT" type="number" min="3" step="0.5" value="10"></div>
 <div class="field"><label for="pcConnPlateFy">تنش تسلیم ورق Fy (MPa)</label><input id="pcConnPlateFy" type="number" min="150" step="10" value="240"></div><div class="field"><label for="pcConnPlateFu">مقاومت نهایی ورق Fu (MPa)</label><input id="pcConnPlateFu" type="number" min="200" step="10" value="360"></div>
 <div class="field"><label for="pcConnEdge">فاصله انتهایی در راستای نیرو تا مرکز پیچ (mm)</label><input id="pcConnEdge" type="number" min="1" step="1" value="40"></div><div class="field"><label for="pcConnSideEdge">فاصله کناری تا مرکز سوراخ (mm)</label><input id="pcConnSideEdge" type="number" min="1" step="1" value="35"></div><div class="field"><label for="pcConnPlateWidth">عرض کل ورق اتصال (mm)</label><input id="pcConnPlateWidth" type="number" min="1" step="1" value="130"></div>
 <div class="field"><label for="pcConnPitch">فاصله ردیف‌های پیچ در جهت لنگر (mm)</label><input id="pcConnPitch" type="number" min="1" step="1" value="50"></div><div class="field"><label for="pcConnGage">فاصله پیچ‌ها در عرض اتصال (mm)</label><input id="pcConnGage" type="number" min="1" step="1" value="60"></div>
 </div>
 <div class="notice">در این مدل، ردیف‌ها در راستای انتقال لنگر و ستون‌ها در عرض اتصال فرض شده‌اند. مقادیر اولیه فقط برای آزمایش رابط هستند و مشخصات طراحی محسوب نمی‌شوند. اگر اتصال واقعی با این مدل متفاوت است، به نتیجه عددی اتکا نکنید.</div>
 <div class="button-grid"><button id="btnPurlinConnCalc" class="btn primary" type="button">محاسبه کنترل مقدماتی اتصال</button></div>
 <div id="purlinConnResults" class="notice">ابتدا طراحی پرلین و کنترل کنسول طولی را اجرا کنید.</div>
 <div class="notice" style="color:#a65d16">کنترل‌های این نسخه محدود به برش تقریبی پیچ، کشش تقریبی پیچ ناشی از لنگر، اندرکنش ساده برش/کشش و لهیدگی موضعی ورق در سوراخ است. لغزش، اثر اهرمی، خمش ورق، جوش، مقاومت عضو تکیه‌گاهی، فاصله‌های آیین‌نامه‌ای و الزامات لرزه‌ای کامل کنترل نشده‌اند. کنترل پارگی بلوکی و سطح خالص در ادامه صرفاً برای هندسه ساده‌شده ورق و بدون سوراخ لوبیایی یا آرایش stagger انجام می‌شود. خروجی تأیید اجرایی نیست.</div>`;
 const statusPanel=Array.from(main.querySelectorAll(".panel")).find(p=>p.textContent.includes("وضعیت پروژه"));
 if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);
 else if(statusPanel&&statusPanel.parentNode)statusPanel.parentNode.insertBefore(panel,statusPanel);
 else main.appendChild(panel);
 bindButton();setData(pendingData);
}
function calculate(){
 const out=$("purlinConnResults");
 try{
  const purlin=window.SteelRoofPurlins?.lastResult;
  if(!purlin||!purlin.best)throw new Error("ابتدا در بخش طراحی پرلین سقف، پیشنهاد خودکار یا محاسبه مقطع انتخابی را اجرا کنید.");
  const cantileverButton=$("btnLongitudinalCantilever");
  if(!cantileverButton)throw new Error("دکمه کنترل کنسول طولی پیدا نشد؛ صفحه را یک‌بار تازه‌سازی کنید.");
  // Re-run the cantilever calculation from the latest purlin and load inputs,
  // so a page refresh or changed purlin settings cannot leave stale/missing data.
  cantileverButton.click();
  const cant=window.SteelLongitudinalCantilever?.lastResult;
  if(!cant||!Array.isArray(cant.results)||!cant.results.length)throw new Error("کنترل کنسول طولی انجام نشد. پیام بخش کنترل کنسول طولی را بررسی کنید.");
  const d=getData(),nr=Number(d.rows),nc=Number(d.cols),n=nr*nc,db=Number(d.diameter),dh=Number(d.hole),fub=Number(d.fub),t=Number(d.plateThickness),fy=Number(d.plateFy),fu=Number(d.plateFu),e=Number(d.edge),se=Number(d.sideEdge),width=Number(d.plateWidth),p=Number(d.pitch),g=Number(d.gage);
  if(!(Number.isInteger(nr)&&nr>=2&&Number.isInteger(nc)&&nc>=1&&db>0&&dh>=db&&fub>0&&t>0&&fy>0&&fu>=fy&&e>dh/2&&se>dh/2&&width>=(nc-1)*g+2*se&&p>=dh&&g>=dh))throw new Error("هندسه گروه پیچ را بررسی کنید: حداقل ۲ ردیف، حداقل ۱ پیچ در هر ردیف، سوراخ بزرگ‌تر یا مساوی قطر پیچ و فاصله‌های معتبر لازم است.");
  const grossArea=Math.PI*db*db/4,area=.78*grossArea;const yPositions=Array.from({length:nr},(_,i)=>(i-(nr-1)/2)*p);const sumY2=yPositions.reduce((sum,y)=>sum+nc*y*y,0);const yMax=Math.max(...yPositions);
  const phiV=.75*.48*fub*area/1000,phiT=.75*.75*fub*area/1000;
  // Simplified straight-path block shear: two longitudinal shear planes and one transverse tension plane.
  const shearPath=e+(nr-1)*p,Anv=2*Math.max(0,shearPath-(nr-.5)*dh)*t,Agv=2*shearPath*t;
  const Ant=Math.max(0,width-(nc-.5)*dh)*t,An=Ant;
  const phiBlock=.75*Math.min((.6*fu*Anv+fu*Ant)/1000,(.6*fy*Agv+fu*Ant)/1000);
  const phiNet=.75*.75*fu*An/1000;
  const bearing=.75*Math.min(1.2*(e-dh/2)*t*fu,2.4*db*t*fu)/1000;
  const rows=[];
  cant.results.forEach(side=>["gravity","wind"].forEach(k=>{const c=side[k];if(!c)return;
   const V=Math.abs(Number(c.V)||0),M=Math.abs(Number(c.M)||0),v=V/n,ten=sumY2>0?M*1000*yMax/sumY2:0;
   const tensionResultant=sumY2>0?yPositions.reduce((sum,y)=>sum+(y>0?(M*1000*y/sumY2)*nc:0),0):0;
   const sr=v/phiV,tr=ten/phiT,ir=Math.sqrt(sr*sr+tr*tr),br=v/bearing;
   const blockRatio=tensionResultant/Math.max(phiBlock,1e-9),netRatio=tensionResultant/Math.max(phiNet,1e-9);
   rows.push({side:side.name,k,V,M,v,ten,tensionResultant,ir,br,blockRatio,netRatio});
  }));
  if(!rows.length)throw new Error("نیروهای کنسول در دسترس نیستند؛ کنترل کنسول را دوباره اجرا کنید.");
  const worst=rows.reduce((a,b)=>Math.max(a.ir,a.br,a.blockRatio,a.netRatio)>=Math.max(b.ir,b.br,b.blockRatio,b.netRatio)?a:b);
  const ratioCell=x=>`<td><b>${fmt(x,3)}</b><br><small style="color:${x<=1?"#18794e":"#b42318"}">${x<=1?"قبول در غربالگری":"نیازمند بازنگری"}</small></td>`;
  const body=rows.map(r=>`<tr><td>${r.side}</td><td>${r.k==="gravity"?"ثقلی":"باد"}</td><td>${fmt(r.V)}</td><td>${fmt(r.M)}</td><td>${fmt(r.v,3)}</td><td>${fmt(r.ten,3)}</td>${ratioCell(r.ir)}${ratioCell(r.br)}${ratioCell(r.blockRatio)}${ratioCell(r.netRatio)}</tr>`).join("");
  out.innerHTML=`<h4>نتایج غربالگری اتصال پیچی</h4>
  <p>مدل: ${d.type==="clip"?"نبشی/ورق اتصال":d.type==="endplate"?"ورق انتهایی":"نشیمن"}؛ آرایش فرضی: ${fmt(nr,0)} ردیف × ${fmt(nc,0)} ستون؛ تعداد کل پیچ: ${fmt(n,0)}؛ سطح مقطع مؤثر تقریبی رزوه پیچ: ${fmt(area,1)} mm²</p><p>عرض ورق: ${fmt(width,1)} mm؛ فاصله انتهایی: ${fmt(e,1)} mm؛ فاصله کناری: ${fmt(se,1)} mm؛ قطر سوراخ: ${fmt(dh,1)} mm؛ گام ردیف‌ها: ${fmt(p,1)} mm؛ فاصله عرضی: ${fmt(g,1)} mm؛ توزیع کشش با فرض رفتار الاستیک گروه پیچ حول مرکز گروه محاسبه شده است.</p>
  <p>مساحت خالص کششی ورق An: ${fmt(An,1)} mm²؛ ظرفیت طراحی تقریبی سطح خالص: ${fmt(phiNet,2)} kN؛ ظرفیت طراحی تقریبی پارگی بلوکی: ${fmt(phiBlock,2)} kN (با فرض دو مسیر برشی طولی و یک مسیر کششی عرضی؛ نیروهای این دو کنترل از برآیند کشش ردیف‌های کششی گروه پیچ گرفته شده‌اند).</p><p>ظرفیت تقریبی برش هر پیچ: ${fmt(phiV,2)} kN؛ ظرفیت تقریبی کشش هر پیچ: ${fmt(phiT,2)} kN؛ ظرفیت لهیدگی تقریبی ورق برای هر پیچ: ${fmt(bearing,2)} kN</p>
  <div style="overflow-x:auto"><table style="width:100%;min-width:720px;border-collapse:collapse"><thead><tr><th>سمت</th><th>حالت بار</th><th>V (kN)</th><th>M (kN.m)</th><th>برش هر پیچ</th><th>کشش هر پیچ</th><th>نسبت اندرکنش</th><th>نسبت لهیدگی</th><th>نسبت پارگی بلوکی</th><th>نسبت سطح خالص</th></tr></thead><tbody>${body}</tbody></table></div>
  <p><b>حالت حاکم:</b> ${worst.side} ـ ${worst.k==="gravity"?"ثقلی":"باد"}؛ نسبت اندرکنش ${fmt(worst.ir,3)}، لهیدگی ${fmt(worst.br,3)}، پارگی بلوکی ${fmt(worst.blockRatio,3)} و سطح خالص ${fmt(worst.netRatio,3)}.</p>
  <div class="notice" style="color:#a65d16"><b>${worst.ir<=1&&worst.br<=1&&worst.blockRatio<=1&&worst.netRatio<=1?"همه نسبت‌های محاسبه‌شده حداکثر ۱ هستند.":"حداقل یک نسبت بیشتر از ۱ است و باید بازنگری شود."}</b><br>این فقط وضعیت غربالگری محاسبات ساده‌شده است؛ فاصله‌ها و ظرفیت‌ها هنوز باید با نقشه اتصال و ضوابط آیین‌نامه‌ای تطبیق داده شوند.</div>
  <p>ظرفیت‌ها تقریبی و غربالگری‌اند؛ طراحی نهایی باید با آیین‌نامه و هندسه واقعی اتصال کنترل شود.</p>`;
  window.SteelPurlinCantileverConnection.lastResult={inputs:d,boltCount:n,boltGroup:{rows:nr,columns:nc,sumY2,yMax},plateChecks:{Anv,Agv,Ant,An,phiBlock,phiNet},results:rows,worst};
 }catch(err){out.innerHTML='<div class="notice" style="color:#a65d16">'+err.message+'</div>';}
}
window.SteelPurlinCantileverConnection={getData,setData,calculate,lastResult:null};
function boot(){
 ensurePanel();
 const main=document.querySelector("main");
 if(main){
  const observer=new MutationObserver(()=>ensurePanel());
  observer.observe(main,{childList:true,subtree:true});
 }
 window.addEventListener("load",ensurePanel,{once:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();