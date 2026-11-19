/* SAHROUD STEEL — connection demand review panel.
 * Shows concurrent solver actions in member-local, global and analytical knee-frame axes.
 * Demand transfer only: no resistance/pass or fabrication claim.
 */
(function(root){
 "use strict";
 const $=id=>root.document?.getElementById(id);
 function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function fmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3}):"—";}
 function vector(v){return Array.isArray(v)?v.map(fmt).join("، "):"—";}
 function actionCells(a){
  const l=a.localActions||{},g=a.global||{};
  return "<tr><td>"+esc(a.memberId)+" ("+esc(a.end)+")</td>"+
   ["N","Vy","Vz","T","My","Mz"].map(k=>"<td>"+fmt(l[k]/1000)+"</td>").join("")+
   ["Fx","Fy","Fz","Mx","My","Mz"].map(k=>"<td>"+fmt(g[k]/1000)+"</td>").join("")+"</tr>";
 }
 function kneeCells(a){
  const k=a.kneeFrameActions;if(!k)return "";
  return "<tr><td>"+esc(a.memberId)+" ("+esc(a.end)+")</td>"+
   [k.force?.x,k.force?.y,k.force?.z].map(v=>"<td>"+fmt(v/1000)+"</td>").join("")+
   [k.moment?.x,k.moment?.y,k.moment?.z].map(v=>"<td>"+fmt(v/1000)+"</td>").join("")+
   "<td>"+(k.eccentricityIncluded?"بله":"خیر؛ مبدأ روی گره")+"</td></tr>";
 }
 function render(data){
  const out=$("connectionDemandResults");if(!out)return;
  if(!data||data.success!==true){out.textContent="هنوز بسته تقاضای اتصالات تولید نشده است. ابتدا اجرای مستقل ترکیبات سه‌بعدی را انجام دهید.";return;}
  const familyRows=(data.families||[]).map(f=>"<tr><td>"+esc(f.label)+"</td><td>"+fmt(f.jointCount)+"</td><td>ظرفیت طراحی نشده</td></tr>").join("");
  const jointRows=(data.joints||[]).map(j=>{
   const frame=j.connectionFrame;
   const axes=frame?"<div class='notice'><b>دستگاه تحلیلی صفحه قاب زانویی (نه صفحه واقعی ورق):</b><br>"+
    "محور x ستون: ["+vector(frame.axes?.x)+"]<br>محور y تصویر عمودشده رفتر: ["+vector(frame.axes?.y)+"]<br>"+
    "محور z نرمال راست‌گرد: ["+vector(frame.axes?.z)+"]<br>مبدأ (m): ["+vector(frame.originM)+"]<br>"+
    "صفحه ورق تأیید شده: خیر؛ خروج از مرکزیت واقعی اجزای اتصال لحاظ نشده است.</div>":"";
   const combos=(j.cases||[]).map(c=>{
    const members=(c.memberActions||[]).map(actionCells).join("");
    const knee=(c.memberActions||[]).filter(a=>a.kneeFrameActions).map(kneeCells).join("");
    return "<details><summary>"+esc(c.combination)+"</summary><h5>کنش عضو در گره — دستگاه محلی و جهانی</h5><div style='overflow-x:auto'><table><thead><tr><th>عضو/انتها</th><th>N kN</th><th>Vy kN</th><th>Vz kN</th><th>T kN.m</th><th>My kN.m</th><th>Mz kN.m</th><th>Fx kN</th><th>Fy kN</th><th>Fz kN</th><th>Mx kN.m</th><th>My kN.m</th><th>Mz kN.m</th></tr></thead><tbody>"+members+"</tbody></table></div>"+
     (knee?"<h5>کنش منتقل‌شده به دستگاه تحلیلی صفحه قاب زانویی</h5><div style='overflow-x:auto'><table><thead><tr><th>عضو/انتها</th><th>Fx kN</th><th>Fy kN</th><th>Fz kN</th><th>Mx kN.m</th><th>My kN.m</th><th>Mz kN.m</th><th>انتقال خروج از مرکزیت</th></tr></thead><tbody>"+knee+"</tbody></table></div>":"")+"</details>";
   }).join("");
   return "<details class='notice'><summary>گره "+esc(j.nodeId)+" — "+esc((j.families||[]).join("، "))+"</summary><p>مختصات جهانی (m): "+fmt(j.coordinatesM?.x)+", "+fmt(j.coordinatesM?.y)+", "+fmt(j.coordinatesM?.z)+"</p>"+axes+combos+"</details>";
  }).join("");
  out.innerHTML="<div class='notice'>بسته نیرو از "+fmt(data.source?.combinationCount)+" ترکیب بار اجراشده و "+fmt(data.source?.modelMemberCount)+" عضو مدل استخراج شده است. واحد جدول‌ها kN و kN.m است. این بسته صرفاً تقاضای اتصال است و هیچ ظرفیت یا قبولی را اثبات نمی‌کند.</div>"+
   "<h4>شمارش گره‌های هر خانواده اتصال</h4><div style='overflow-x:auto'><table><thead><tr><th>خانواده</th><th>گره‌های شناسایی‌شده</th><th>وضعیت ظرفیت</th></tr></thead><tbody>"+familyRows+"</tbody></table></div>"+
   "<h4>نیروهای هم‌زمان در گره‌ها</h4>"+(jointRows||"<p>در هندسه فعلی گره قابل طبقه‌بندی برای اتصال شناسایی نشد.</p>")+
   "<div class='notice'>تبدیل به دستگاه صفحه قاب فقط برای زانویی و صرفاً بر پایه محور هندسی ستون و رفتر است. این دستگاه، صفحه واقعی ورق/جان/بال نیست. مبدأ فعلی روی گره تحلیلی قرار دارد؛ بنابراین خروج از مرکزیت واقعی پیچ‌ها، جوش‌ها و ورق‌ها هنوز منظور نشده است. بارهای گره‌ای، واکنش‌ها و کنترل تعادل کامل گره نیز در این گزارش جمع‌بندی نشده‌اند.</div>";
 }
 function mount(){
  if(!$("connectionDemandReviewPanel")){
   const main=root.document.querySelector("main");if(!main)return;
   const p=root.document.createElement("section");p.className="panel";p.id="connectionDemandReviewPanel";
   p.innerHTML="<div class='panel-title'><h3>انتقال نیروهای واقعی به گره‌های اتصال</h3></div>"+
    "<p class='notice'>پس از اجرای ترکیبات بار سه‌بعدی، نیروهای انتهایی اعضای متصل در هر ترکیب جداگانه نمایش داده می‌شوند.</p>"+
    "<button id='btnBuildConnectionDemand' class='btn primary' type='button'>نمایش بسته تقاضای اتصال حاصل از آخرین تحلیل</button><div id='connectionDemandResults' aria-live='polite'></div>";
   const target=root.document.getElementById("connectionReadinessPanel");
   if(target?.parentNode)target.parentNode.insertBefore(p,target);else main.appendChild(p);
   $("btnBuildConnectionDemand").addEventListener("click",()=>render(root.SteelStructuralModel?.lastConnectionDemand||null));
  }
  root.addEventListener("sahroud:connection-demand-ready",e=>render(e.detail));
  render(root.SteelStructuralModel?.lastConnectionDemand||null);
 }
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
 root.SahroudConnectionDemandUI={render};
})(typeof window!=="undefined"?window:globalThis);
