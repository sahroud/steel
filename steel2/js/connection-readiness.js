/* SAHROUD STEEL — connection completeness gate.
 * This is an audit registry, not a connection resistance calculator.
 * It deliberately prevents an execution-ready claim while any required
 * connection family lacks a verified design and detailing package.
 */
(function(root){
  "use strict";
  const ITEMS=[
    {id:"basePlate",label:"صفحه‌ستون و انکربولت",scope:"plate, anchors, welds, concrete bearing, base restraint",status:"not-designed"},
    {id:"knee",label:"اتصال زانویی ستون به رفتر",scope:"geometry only; no verified bolt/weld/plate resistance",status:"geometry-only"},
    {id:"ridge",label:"اتصال تاج رفترها",scope:"moment/shear/axial transfer and detailing",status:"not-designed"},
    {id:"splice",label:"وصله ستون و رفتر",scope:"splice location, bolts/welds and member continuity",status:"not-designed"},
    {id:"braceGusset",label:"ورق گاست مهاربندها",scope:"gusset, bolts/welds, block shear and stability",status:"not-designed"},
    {id:"purlinCleat",label:"اتصال پرلین به رفتر",scope:"idealized rotational releases only; no verified clip/bolt stiffness or resistance",status:"analysis-idealization-only"},
    {id:"wallGirt",label:"اتصال قیدهای دیوار",scope:"cleats, fasteners and load transfer",status:"not-designed"},
    {id:"craneRail",label:"اتصال ریل جرثقیل به ستون",scope:"wheel loads, bracket, local web/flange and fatigue",status:"not-designed"},
    {id:"endWall",label:"اتصالات قاب و مهاربندی دیوار انتهایی",scope:"end-post, girt and bracing joints",status:"not-designed"}
  ];
  function assess(demand){
    const demandFamilies=new Map((demand?.families||[]).map(x=>[x.id,x]));
    const items=ITEMS.map(x=>{
      const source=demandFamilies.get(x.id);
      return {...x,verifiedDesign:false,executionReady:false,
        demandJointCount:source?.jointCount||0,
        demandStatus:source?.jointCount>0?"نیروهای گره از تحلیل منتقل شده؛ ظرفیت طراحی نشده":"گره/نیروی متناظر در مدل فعلی شناسایی نشده"};
    });
    const missing=items.filter(x=>!x.verifiedDesign);
    return {
      readyForExecution:missing.length===0,
      status:missing.length?"blocked-incomplete-connection-design":"verified",
      total:items.length,verified:items.length-missing.length,missing:missing.length,
      items,limitations:[
        "وجود فایل یا پنل محاسباتی به معنی طراحی ظرفیت اتصال نیست.",
        "مدل آزادسازی پرلین فقط ایده‌آل‌سازی تحلیل است و سختی/مقاومت کلیپس واقعی را اثبات نمی‌کند.",
        "جزئیات واقعی پیچ، جوش، ورق، مصالح پایه و مدارک سازنده برای تأیید لازم است."
      ]
    };
  }
  function render(demand){
    if(!root.document)return;
    const existing=root.document.getElementById("connectionReadinessPanel");
    if(existing)existing.remove();
    const panel=root.document.createElement("section");
    panel.className="panel";panel.id="connectionReadinessPanel";
    const result=assess(demand||root.SteelStructuralModel?.lastConnectionDemand);
    const rows=result.items.map(x=>"<tr><td>"+x.label+"</td><td>"+x.status+"</td><td>"+x.demandJointCount+"</td><td>"+x.demandStatus+"</td><td>"+x.scope+"</td></tr>").join("");
    panel.innerHTML="<div class='panel-title'><h3>ممیزی تکمیل اتصالات سازه</h3><span class='status'>گیت ایمنی خروجی</span></div>"+
      "<div class='notice'>وضعیت فعلی: "+result.verified+" از "+result.total+" اتصال دارای طراحی و جزئیات تأییدشده است. تا تکمیل همه ردیف‌ها، گزارش اجرایی نهایی مسدود می‌ماند.</div>"+
      "<div style='overflow-x:auto'><table style='width:100%;min-width:820px;border-collapse:collapse'><thead><tr><th>اتصال</th><th>وضعیت طراحی</th><th>گره دارای تقاضا</th><th>وضعیت انتقال نیرو</th><th>دامنه لازم</th></tr></thead><tbody>"+rows+"</tbody></table></div>"+
      "<div class='notice'>"+result.limitations.map(x=>"<p>"+x+"</p>").join("")+"</div>";
    const target=root.document.getElementById("finalReportPanel")||root.document.querySelector("main");
    if(target&&target.parentNode)target.parentNode.insertBefore(panel,target);
    else if(target)target.appendChild(panel);
  }
  function selfTest(){
    const a=assess();
    const tests=[
      {name:"execution report stays blocked with incomplete connection designs",pass:a.readyForExecution===false},
      {name:"all required connection families are explicitly listed",pass:a.items.length===9},
      {name:"purlin idealization is not treated as a designed connection",pass:a.items.find(x=>x.id==="purlinCleat")?.status==="analysis-idealization-only"},
      {name:"knee geometry is not treated as a resistance design",pass:a.items.find(x=>x.id==="knee")?.status==="geometry-only"}
    ];
    return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests};
  }
  root.SahroudConnectionReadiness={assess,render,selfTest};
  if(root.document){
    if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",()=>render());
    else render();
    root.addEventListener("sahroud:connection-demand-ready",event=>render(event.detail));
  }
})(typeof window!=="undefined"?window:globalThis);
