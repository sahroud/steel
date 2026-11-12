/* SAHROUD STEEL — Load-path coverage audit
 * Read-only topology and line-load audit. Never mutates loads or solver state.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const n=v=>Number.isFinite(Number(v))?Number(v):0;
 const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b));
 function audit(model){
  if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر در دسترس نیست.");
  const g=model.geometry, nodes=new Map(model.nodes.map(x=>[x.id,x])), members=model.members;
  const groups={roofPurlin:members.filter(m=>m.sectionKey==="roofPurlin"),rafter:members.filter(m=>m.sectionKey==="rafter"),wallGirt:members.filter(m=>m.sectionKey==="wallGirt"),column:members.filter(m=>m.sectionKey==="column"),endGirt:members.filter(m=>m.sectionKey==="endGirt"),endPost:members.filter(m=>m.sectionKey==="endPost"),roofEdge:members.filter(m=>m.sectionKey==="roofEdge")};
  const memberLength=m=>{const a=nodes.get(m.start),b=nodes.get(m.end);return a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z):0;};
  const endpoints=(m)=>[nodes.get(m.start),nodes.get(m.end)];
  const hasSharedAtNode=(m,p,keys)=>!!p&&members.some(q=>q.id!==m.id&&keys.includes(q.sectionKey)&&(q.start===p.id||q.end===p.id));
  const lineCoverage=(arr,keys)=>arr.filter(m=>keys.every(k=>Number.isFinite(Number(m.lineLoads?.[k]))));
  const integrate=(arr,key)=>arr.reduce((s,m)=>s+n(m.lineLoads?.[key])*memberLength(m),0);
  const purlins=groups.roofPurlin, girts=groups.wallGirt, endGirts=groups.endGirt;
  const purlinSupported=purlins.filter(m=>endpoints(m).every(p=>hasSharedAtNode(m,p,["rafter"])));
  const girtSupported=girts.filter(m=>endpoints(m).every(p=>hasSharedAtNode(m,p,["column"])));
  const endGirtSupported=endGirts.filter(m=>endpoints(m).every(p=>hasSharedAtNode(m,p,["endPost","rafter"])));
  const endWallTriangleArea=Number(g.span)*Number(g.rise)/2;
  const topGirtHeight=Math.max(0,...endGirts.map(m=>n(m.row)));
  const purlinLoads=lineCoverage(purlins,["dead","live","snow","wind","windLeft","windRight"]);
  const girtLoads=lineCoverage(girts,["wind"]);
  const endLoads=lineCoverage(endGirts,["windEnd","pressureKPa"]);
  const raftersWithDirectGravity=groups.rafter.filter(m=>n(m.lineLoads?.dead)!==0||n(m.lineLoads?.live)!==0||n(m.lineLoads?.snow)!==0);
  const results=[
   {id:"roof-load-carriers",label:"بارهای سطحی سقف به پرلین‌ها اختصاص یافته‌اند",ok:purlins.length>0&&purlinLoads.length===purlins.length,detail:purlinLoads.length+" از "+purlins.length+" قطعه پرلین دارای رکورد کامل بار هستند"},
   {id:"purlin-to-rafter",label:"انتهای پرلین‌ها به گره مشترک رفتر می‌رسند",ok:purlinSupported.length===purlins.length,detail:purlinSupported.length+" از "+purlins.length+" قطعه پرلین؛ کنترل بر اساس شناسه گره مشترک"},
   {id:"wall-load-carriers",label:"بار باد دیوار طولی به قیدهای دیوار اختصاص یافته است",ok:girts.length>0&&girtLoads.length===girts.length,detail:girtLoads.length+" از "+girts.length+" قطعه قید دارای رکورد باد هستند"},
   {id:"girt-to-column",label:"دو انتهای قیدهای طولی با ستون قاب گره مشترک دارند",ok:girtSupported.length===girts.length,detail:girtSupported.length+" از "+girts.length+" قطعه قید"},
   {id:"endwall-load-carriers",label:"بار باد دیوار انتهایی به قیدهای انتهایی اختصاص یافته است",ok:endGirts.length>0&&endLoads.length===endGirts.length,detail:endLoads.length+" از "+endGirts.length+" قطعه قید انتهایی"},
   {id:"endgirt-supports",label:"انتهای قیدهای دیوار انتهایی به ستونک/رفتر متصل است",ok:endGirtSupported.length===endGirts.length,detail:endGirtSupported.length+" از "+endGirts.length+" قطعه قید انتهایی"}
  ];
  const warnings=[];
  if(raftersWithDirectGravity.length===0)warnings.push("رفترها بار ثقلی سطحی مستقیم ندارند؛ انتقال بار سقف باید از مسیر پرلین‌ها و گره‌های مشترک پرلین–رفتر انجام شود. این ممیزی فقط اشتراک هندسی گره را کنترل می‌کند، نه صحت جزئیات اتصال.");
  if(endGirts.length===0||!groups.endPost.length)warnings.push("مسیر انتقال بار دیوار انتهایی به ستونک‌ها/قاب انتهایی کامل قابل ارزیابی نیست.");
  warnings.push("سطح مثلثی بالای دیوار انتهایی در مدل بارگذاری فعلی پوشش داده نشده است؛ مساحت هندسی این قسمت برای هر انتها "+endWallTriangleArea.toFixed(3)+" m² است (مجموع دو انتها "+(2*endWallTriangleArea).toFixed(3)+" m²).");
  warnings.push("تیر لبه پیش‌آمدگی، پوشش سقف، اتصالات واقعی ورق به پرلین، کلیپس‌ها، پیچ‌ها، کشش/فشار مهاربندها و انتقال نیرو به فونداسیون در این ممیزی به‌صورت کامل مدل نشده‌اند.");
  const integrated={
   roofDeadKN:integrate(purlins,"dead"),roofLiveKN:integrate(purlins,"live"),roofSnowKN:integrate(purlins,"snow"),
   roofWindLeftKN:integrate(purlins,"windLeft"),roofWindRightKN:integrate(purlins,"windRight"),
   sideWallWindKN:integrate(girts,"wind"),endWallFrontWindKN:integrate(endGirts.filter(m=>m.endFace==="front"),"windEnd"),
   endWallRearWindKN:integrate(endGirts.filter(m=>m.endFace==="rear"),"windEnd")
  };
  return {schema:"sahroud-steel-load-path-audit",version:1,generatedAt:new Date().toISOString(),
   counts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),
   supportConnectivity:{purlinToRafter:purlinSupported.length+"/"+purlins.length,wallGirtToColumn:girtSupported.length+"/"+girts.length,endGirtToEndPostOrRafter:endGirtSupported.length+"/"+endGirts.length},
   loadRecordCoverage:{purlin:purlinLoads.length+"/"+purlins.length,wallGirt:girtLoads.length+"/"+girts.length,endGirt:endLoads.length+"/"+endGirts.length},
   integratedLineLoadTotalsKN:integrated,
   knownUncoveredEndWallGable:{areaEachEndM2:endWallTriangleArea,totalAreaM2:2*endWallTriangleArea,status:"not-loaded"},
   checks:results,warnings,designEligible:false,loadTransferEnabled:false,
   note:"برآورد انتگرال بار خطی روی اعضای بارگیر و توپولوژی گره‌هاست؛ جایگزین تحلیل مسیر بار کامل، کنترل اتصال، پوشش سطحی یا کنترل آیین‌نامه‌ای نیست."};
 }
 function render(){
  if($("loadPathAuditPanel"))return;
  const anchor=$("tributaryAuditPanel")||$("windZoneGeometryPanel");
  if(!anchor?.parentNode)return;
  const panel=document.createElement("section");panel.className="panel";panel.id="loadPathAuditPanel";
  panel.innerHTML='<div class="panel-title"><h3>ممیزی مسیر انتقال بار</h3><span class="status">فقط‌خواندنی</span></div><div class="notice">بررسی می‌کند بارهای ورودی در کدام گروه اعضا ثبت شده‌اند و آیا گره‌های انتهایی اعضای بارگیر به اعضای تکیه‌گاهی مشترک متصل هستند. هیچ ورودی یا نتیجه تحلیلی را تغییر نمی‌دهد.</div><button type="button" class="btn secondary" id="btnRunLoadPathAudit">اجرای ممیزی مسیر بار</button><div id="loadPathAuditResult" class="notice" aria-live="polite">پس از تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
  anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  $("btnRunLoadPathAudit").addEventListener("click",()=>{
   const box=$("loadPathAuditResult");
   try{
    const result=audit(window.SteelStructuralModel?.build?.());window.SteelLoadPathAudit.lastResult=result;
    const lines=result.checks.map(c=>(c.ok?"✓ ":"⚠ ")+c.label+" — "+c.detail);
    const totals=Object.entries(result.integratedLineLoadTotalsKN).map(([k,v])=>k+": "+v.toFixed(3)+" kN").join("\n");
    box.textContent="ممیزی مسیر بار: "+result.checks.filter(c=>c.ok).length+" از "+result.checks.length+" کنترل برقرار است.\n"+lines.join("\n")+
     "\n\nبرآورد انتگرال بارهای خطی ثبت‌شده (kN):\n"+totals+
     "\n\nناحیه مثلثی دیوار انتهاییِ بدون بارگذاری: "+result.knownUncoveredEndWallGable.areaEachEndM2.toFixed(3)+" m² در هر انتها؛ مجموع "+result.knownUncoveredEndWallGable.totalAreaM2.toFixed(3)+" m²"+
     "\n\nمحدودیت‌ها:\n"+result.warnings.join("\n")+
     "\n\nاین گزارش ممیزی توپولوژی و داده‌های بار است؛ تأیید طراحی یا ایمنی نیست.";
    box.style.color=result.checks.every(c=>c.ok)?"#92400e":"#92400e";
   }catch(e){box.textContent="ممیزی مسیر بار انجام نشد: "+e.message;box.style.color="#b45309";}
  });
 }
 window.SteelLoadPathAudit={audit,getLastResult:()=>window.SteelLoadPathAudit.lastResult||null,lastResult:null,designEligible:false,loadTransferEnabled:false};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();
