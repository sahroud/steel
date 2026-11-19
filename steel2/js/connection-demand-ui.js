/* SAHROUD STEEL — connection demand review panel.
 * Shows concurrent solver actions at joints; no resistance/pass claim.
 */
(function(root){
 "use strict";
 const $=id=>root.document?.getElementById(id);
 function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function fmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3}):"—";}
 function render(data){
  const out=$("connectionDemandResults");if(!out)return;
  if(!data||data.success!==true){out.textContent="هنوز بسته تقاضای اتصالات تولید نشده است. ابتدا اجرای مستقل ترکیبات سه‌بعدی را انجام دهید.";return;}
  const familyRows=data.families.map(f=>"<tr><td>"+esc(f.label)+"</td><td>"+fmt(f.jointCount)+"</td><td>ظرفیت طراحی نشده</td></tr>").join("");
  const jointRows=data.joints.map(j=>{
   const combos=j.cases.map(c=>{
    const members=c.memberActions.map(a=>"<tr><td>"+esc(a.memberId)+" ("+esc(a.end)+")</td><td>"+fmt(a.localActions.N/1000)+"</td><td>"+fmt(a.localActions.Vy/1000)+"</td><td>"+fmt(a.localActions.Vz/1000)+"</td><td>"+fmt(a.localActions.T/1000)+"</td><td>"+fmt(a.localActions.My/1000)+"</td><td>"+fmt(a.localActions.Mz/1000)+"</td></tr>").join("");
    return "<details><summary>"+esc(c.combination)+"</summary><div style='overflow-x:auto'><table><thead><tr><th>عضو/انتهای عضو</th><th>N kN</th><th>Vy kN</th><th>Vz kN</th><th>T kN.m</th><th>My kN.m</th><th>Mz kN.m</th></tr></thead><tbody>"+members+"</tbody></table></div></details>";
   }).join("");
   return "<details class='notice'><summary>گره "+esc(j.nodeId)+" — "+esc(j.families.join("، "))+"</summary><p>مختصات (m): "+fmt(j.coordinatesM.x)+", "+fmt(j.coordinatesM.y)+", "+fmt(j.coordinatesM.z)+"</p>"+combos+"</details>";
  }).join("");
  out.innerHTML="<div class='notice'>بسته نیرو از "+fmt(data.source.combinationCount)+" ترکیب بار اجراشده و "+fmt(data.source.modelMemberCount)+" عضو مدل استخراج شده است. واحدها در جدول تبدیل‌شده به kN و kN.m هستند. این بسته صرفاً تقاضای اتصال است و هیچ ظرفیت یا قبولی را اثبات نمی‌کند.</div>"+
   "<h4>شمارش گره‌های هر خانواده اتصال</h4><div style='overflow-x:auto'><table><thead><tr><th>خانواده</th><th>گره‌های شناسایی‌شده</th><th>وضعیت ظرفیت</th></tr></thead><tbody>"+familyRows+"</tbody></table></div>"+
   "<h4>نیروهای هم‌زمان در گره‌ها</h4>"+(jointRows||"<p>در هندسه فعلی گره قابل طبقه‌بندی برای اتصال شناسایی نشد.</p>")+
   "<div class='notice'>محدودیت: مؤلفه‌ها در دستگاه محلی هر عضو گزارش شده‌اند؛ برای محاسبه تعادل و طراحی یک ورق مشترک باید به دستگاه مختصات اتصال منتقل شوند. ترکیبات فعلی نیز فقط همان ترکیباتی هستند که واقعاً در موتور تحلیل اجرا شده‌اند.</div>";
 }
 function mount(){
  if(!$("connectionDemandReviewPanel")){
   const main=root.document.querySelector("main");if(!main)return;
   const p=root.document.createElement("section");p.className="panel";p.id="connectionDemandReviewPanel";
   p.innerHTML="<div class='panel-title'><h3>انتقال نیروهای واقعی به گره‌های اتصال</h3></div>"+
    "<p class='notice'>پس از اجرای ترکیبات بار سه‌بعدی، نیروهای انتهایی اعضای متصل در هر ترکیب جداگانه نمایش داده می‌شوند.</p>"+
    "<button id='btnBuildConnectionDemand' class='btn primary' type='button'>نمایش بسته تقاضای اتصال حاصل از آخرین تحلیل</button><div id='connectionDemandResults' aria-live='polite'></div>";
   const target=root.document.getElementById("connectionReadinessPanel");
   if(target&&target.parentNode)target.parentNode.insertBefore(p,target);else main.appendChild(p);
   $("btnBuildConnectionDemand").addEventListener("click",()=>render(root.SteelStructuralModel?.lastConnectionDemand||null));
  }
  root.addEventListener("sahroud:connection-demand-ready",e=>render(e.detail));
  render(root.SteelStructuralModel?.lastConnectionDemand||null);
 }
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
 root.SahroudConnectionDemandUI={render};
})(typeof window!=="undefined"?window:globalThis);
