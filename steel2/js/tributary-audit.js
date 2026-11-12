/* SAHROUD STEEL — Tributary geometry audit
 * Independent geometry audit only. Does not create loads or enable design eligibility.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const finite = v => Number.isFinite(Number(v));
  const close = (a,b,tol=1e-6) => Math.abs(a-b) <= tol*Math.max(1,Math.abs(a),Math.abs(b));

  function audit(model) {
    if (!model || !model.geometry || !Array.isArray(model.nodes) || !Array.isArray(model.members))
      throw new Error("مدل هندسی معتبر برای ممیزی سطح بارگیر دریافت نشد.");
    const g=model.geometry, members=model.members, nodes=model.nodes;
    const nodeById=new Map(nodes.map(n=>[n.id,n]));
    const frames=Array.isArray(g.frames)?g.frames:[];
    const length=Number(g.length), span=Number(g.span), rise=Number(g.rise), over=Number(g.roofOverhang||0);
    if (![length,span,rise,over].every(finite) || length<=0 || span<=0 || over<0)
      throw new Error("ابعاد هندسی مدل برای کنترل سطح بارگیر نامعتبر است.");

    const purlins=members.filter(m=>m.sectionKey==="roofPurlin");
    const girts=members.filter(m=>m.sectionKey==="wallGirt");
    const endGirts=members.filter(m=>m.sectionKey==="endGirt");
    const rafters=members.filter(m=>m.sectionKey==="rafter");
    const slope=Math.hypot(span/2,rise);
    const slopeOverhang=over/(span/2/slope);
    const expectedRoofArea=2*(slope+slopeOverhang)*(length+2*over);
    const purlinArea=purlins.reduce((sum,m)=>{
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return sum+(a&&b&&finite(m.tributaryWidth)?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*Number(m.tributaryWidth):0);
    },0);
    const purlinMissing=purlins.filter(m=>!(Number(m.tributaryWidth)>0) ||
      !m.lineLoads || !["dead","live","snow","wind"].every(k=>finite(m.lineLoads[k])));
    const ridgeMissing=purlins.filter(m=>m.side==="ridge" &&
      (!(Number(m.tributaryWidthLeft)>0)||!(Number(m.tributaryWidthRight)>0)||
       !finite(m.lineLoads?.windLeft)||!finite(m.lineLoads?.windRight)));
    const frameStations=new Set(frames.map(z=>Number(z).toFixed(7)));
    const rafterNodeIds=new Set();
    rafters.forEach(m=>{rafterNodeIds.add(m.start);rafterNodeIds.add(m.end);});
    const unsupportedPurlinEnds=[];
    purlins.forEach(m=>{
      [m.start,m.end].forEach(id=>{
        const n=nodeById.get(id);
        if(n && frameStations.has(Number(n.z).toFixed(7)) && !rafterNodeIds.has(id))
          unsupportedPurlinEnds.push({member:m.id,node:id,z:n.z});
      });
    });

    const girtArea=girts.reduce((sum,m)=>{
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return sum+(a&&b&&finite(m.tributaryHeight)?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*Number(m.tributaryHeight):0);
    },0);
    const expectedWallArea=2*Number(g.height)*length;
    const girtRows=[...new Set(girts.map(m=>m.row))].length;
    const maxGirtTributaryHeight=Math.max(0,...girts.map(m=>Number(m.tributaryHeight)||0));
    const girtSpacing=Number(g.wallGirtSpacing||0);

    const endGirtInvalid=endGirts.filter(m=>!(Number(m.tributaryHeight)>0)||
      !finite(m.lineLoads?.windEnd)||!finite(m.lineLoads?.pressureKPa));
    const purlinClosureRatio=expectedRoofArea>0?purlinArea/expectedRoofArea:null;
    const wallClosureRatio=expectedWallArea>0?girtArea/expectedWallArea:null;
    const checks=[
      {id:"roof-area-closure",label:"بسته‌شدن سطح بارگیر سقف",ok:close(purlinArea,expectedRoofArea,1e-5),actualM2:purlinArea,expectedM2:expectedRoofArea},
      {id:"purlin-load-data",label:"کامل بودن مشخصات بار خطی پرلین‌ها",ok:purlins.length>0&&purlinMissing.length===0,affected:purlinMissing.length},
      {id:"ridge-two-sides",label:"وجود عرض بارگیر مستقل دو طرف در پرلین تاج",ok:ridgeMissing.length===0,affected:ridgeMissing.length},
      {id:"purlin-frame-support",label:"اشتراک گره پرلین با رفتر در محل قاب‌ها",ok:unsupportedPurlinEnds.length===0,affected:unsupportedPurlinEnds.length},
      {id:"wall-area-closure",label:"بسته‌شدن سطح بارگیر قیدهای طولی دیوار",ok:close(girtArea,expectedWallArea,1e-5),actualM2:girtArea,expectedM2:expectedWallArea},
      {id:"end-girt-inputs",label:"کامل بودن داده هندسی و بار قیدهای دیوار انتهایی",ok:endGirts.length>0&&endGirtInvalid.length===0,affected:endGirtInvalid.length}
    ];
    const warnings=[];
    if(girtRows && girtSpacing>0 && maxGirtTributaryHeight>1.5*girtSpacing)
      warnings.push("بیشینه ارتفاع بارگیر یک قید طولی ("+maxGirtTributaryHeight.toFixed(3)+" m) بیش از ۱٫۵ برابر فاصله اسمی قیدهاست؛ سهم انتقال بار به ستون‌ها، تیر لبه و تراز پایه باید با جزئیات واقعی پوشش و تکیه‌گاه‌ها بازبینی شود.");
    if(!close(purlinArea,expectedRoofArea,1e-5))
      warnings.push("سطح بارگیر تجمعی پرلین‌ها با سطح هندسی دو شیب سقف و پیش‌آمدگی‌ها برابر نیست.");
    if(!close(girtArea,expectedWallArea,1e-5))
      warnings.push("سطح بارگیر تجمعی قیدهای طولی با سطح ناخالص دو دیوار طولی برابر نیست؛ سهم ستون‌ها/تیرهای مرزی یا هندسه گریت‌ها باید بررسی شود.");
    return {
      schema:"sahroud-steel-tributary-geometry-audit",version:1,
      generatedAt:new Date().toISOString(),
      geometry:{spanM:span,lengthM:length,eavesHeightM:Number(g.height),riseM:rise,roofOverhangHorizontalM:over,slopeOverhangM:slopeOverhang,frameCount:frames.length},
      roof:{purlinMemberSegments:purlins.length,expectedAreaM2:expectedRoofArea,tributaryAreaM2:purlinArea,closureRatio:purlinClosureRatio,missingLoadRecords:purlinMissing.length,ridgeSegmentsMissingSideData:ridgeMissing.length,unsupportedFrameEnds:unsupportedPurlinEnds.length},
      longitudinalWalls:{girtSegments:girts.length,rows:girtRows,expectedGrossAreaM2:expectedWallArea,tributaryAreaM2:girtArea,closureRatio:wallClosureRatio,maxTributaryHeightM:maxGirtTributaryHeight},
      endWalls:{endGirtSegments:endGirts.length,invalidSegments:endGirtInvalid.length,rafterEndWallMembers:rafters.filter(m=>m.axis==="endwall").length},
      checks,warnings,
      designEligible:false,loadTransferEnabled:false,
      note:"این ممیزی فقط سازگاری هندسی و بسته‌شدن مساحت را می‌سنجد؛ تأیید مسیر بار، تکیه‌گاه واقعی پوشش، فشار باد، مقاومت یا ایمنی سازه نیست."
    };
  }

  function render() {
    if($("tributaryAuditPanel"))return;
    const anchor=$("shedLayoutPanel")||$("windZoneGeometryPanel");
    if(!anchor||!anchor.parentNode)return;
    const panel=document.createElement("section");
    panel.className="panel";panel.id="tributaryAuditPanel";
    panel.innerHTML='<div class="panel-title"><h3>ممیزی مستقل سطوح بارگیر اعضا</h3><span class="status">کنترل هندسی</span></div>'+
      '<div class="notice">این ابزار سطح بارگیر تجمعی پرلین‌ها و قیدهای دیوار را با مساحت هندسی پوسته مقایسه می‌کند و اشتراک گره‌های پرلین و رفتر را می‌سنجد. هیچ بار جدیدی تولید یا به حل‌گر منتقل نمی‌شود.</div>'+
      '<button type="button" class="btn secondary" id="btnRunTributaryAudit">اجرای ممیزی سطوح بارگیر</button>'+
      '<div id="tributaryAuditResult" class="notice" aria-live="polite">پس از تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
    anchor.parentNode.insertBefore(panel,anchor.nextSibling);
    $("btnRunTributaryAudit").addEventListener("click",()=>{
      const box=$("tributaryAuditResult");
      try{
        const model=window.SteelStructuralModel?.build?.();
        const result=audit(model);
        window.SteelTributaryAudit.lastResult=result;
        const lines=result.checks.map(c=>(c.ok?"✓ ":"⚠ ")+c.label+
          (c.actualM2!==undefined?" — محاسبه: "+c.actualM2.toFixed(3)+" m²؛ مرجع هندسی: "+c.expectedM2.toFixed(3)+" m²":"")+
          (c.affected?" — موارد نیازمند بررسی: "+c.affected:""));
        box.textContent="ممیزی هندسی انجام شد؛ "+result.checks.filter(c=>c.ok).length+" از "+result.checks.length+" کنترل برقرار است.\n"+
          lines.join("\n")+
          "\n\nسطح سقف: "+result.roof.tributaryAreaM2.toFixed(3)+" / "+result.roof.expectedAreaM2.toFixed(3)+" m²"+
          "\nسطح دیوارهای طولی: "+result.longitudinalWalls.tributaryAreaM2.toFixed(3)+" / "+result.longitudinalWalls.expectedGrossAreaM2.toFixed(3)+" m²"+
          "\nقیدهای طولی: "+result.longitudinalWalls.girtSegments+" قطعه در "+result.longitudinalWalls.rows+" ردیف"+
          (result.warnings.length?"\n\nهشدارها:\n"+result.warnings.join("\n"):"\n\nهشدار هندسی اضافه‌ای ثبت نشد.")+
          "\n\nاین نتیجه صرفاً ممیزی هندسی است و تأیید طراحی یا ایمنی نیست.";
        box.style.color=result.checks.every(c=>c.ok)&&!result.warnings.length?"#166534":"#92400e";
      }catch(e){box.textContent="ممیزی انجام نشد: "+e.message;box.style.color="#b45309";}
    });
  }
  window.SteelTributaryAudit={audit,getLastResult:()=>window.SteelTributaryAudit.lastResult||null,lastResult:null,designEligible:false,loadTransferEnabled:false};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();
