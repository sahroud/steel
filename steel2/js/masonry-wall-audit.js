/* SAHROUD STEEL — Masonry wall quantity and restraint-data audit
 * Read-only estimate. No gravity, wind, restraint, or solver loads are generated.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const n=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN;};
 const fmt=v=>Number(v).toFixed(3);
 const names={front:"انتهایی جلو",rear:"انتهایی عقب",left:"طولی چپ",right:"طولی راست"};
 const materialNames={brick:"آجرچینی","metal-sheet":"ورق فلزی","sandwich-panel":"ساندویچ‌پنل",other:"سیستم دیگر"};
 function audit(model){
  if(!model||!model.geometry||!Array.isArray(model.members))throw Error("ابتدا مدل هندسی معتبر سوله را بسازید.");
  const g=model.geometry,span=n(g.span),length=n(g.length),height=n(g.height),rise=n(g.rise);
  if(!(span>0&&length>0&&height>0&&rise>=0))throw Error("ابعاد هندسی سوله معتبر نیست.");
  const brief=window.SteelDesignCore?.getData?.();
  if(!brief)throw Error("مبانی طراحی و نوع دیوارها در دسترس نیست.");
  const walls=brief.wallEnvelope||{},m=brief.masonry||{};
  const openings=window.SteelOpenings?.getData?.()||{};
  const tmm=n(m.thicknessMm),gamma=n(m.unitWeightKNm3);
  const thicknessM=tmm>0?tmm/1000:NaN;
  const weightInputsValid=Number.isFinite(thicknessM)&&thicknessM>0&&Number.isFinite(gamma)&&gamma>0;
  const rows=[];
  const warnings=[];
  let totalGross=0,totalOpenings=0,totalNet=0,totalWeight=0,brickFaceCount=0;
  ["front","rear","left","right"].forEach(face=>{
   const w=walls[face]||{material:"brick",orientation:"vertical"};
   const brick=w.material==="brick";
   const gross=face==="front"||face==="rear"?(span*height+span*rise/2):(length*height);
   const op=openings[face]||{enabled:false};
   let openingArea=0,openingValid=true,openingNote="بدون بازشوی ثبت‌شده";
   if(op.enabled){
    const ow=n(op.width),oh=n(op.height),pos=face==="front"||face==="rear"?0:n(op.position);
    const run=face==="front"||face==="rear"?span:length;
    if(!(ow>0&&oh>0&&Number.isFinite(pos)&&pos>=0&&pos+ow<=run+1e-6&&oh<=height+1e-6)){
     openingValid=false;
     openingNote="ابعاد/موقعیت بازشو خارج از محدوده مستطیلی قابل کسر است؛ مساحت آن کسر نشد";
     warnings.push(names[face]+": بازشو برای محاسبه مساحت خالص نیازمند اصلاح است.");
    }else{
     openingArea=ow*oh;
     openingNote="بازشوی ثبت‌شده "+fmt(openingArea)+" m² از مساحت کسر شد";
    }
   }
   const net=Math.max(0,gross-openingArea);
   const weight=brick&&weightInputsValid?net*thicknessM*gamma:null;
   const candidateCount=face==="left"||face==="right"
    ?model.members.filter(x=>x.sectionKey==="wallGirt"&&x.side===face).length
    :model.members.filter(x=>x.sectionKey==="endGirt"&&x.endFace===face).length;
   rows.push({face,material:w.material,orientation:w.orientation,grossAreaM2:gross,openingAreaM2:openingArea,netAreaM2:net,weightKN:weight,candidateSteelSecondaryMembers:candidateCount,openingValid,openingNote});
   if(brick){
    brickFaceCount++;totalGross+=gross;totalOpenings+=openingArea;totalNet+=net;
    if(weight!==null)totalWeight+=weight;
   }
  });
  if(brickFaceCount===0)warnings.push("در هیچ‌یک از چهار وجه دیوار آجری انتخاب نشده است؛ ممیزی وزن بنایی کاربردی ندارد.");
  if(!Number.isFinite(tmm)||tmm<=0)warnings.push("ضخامت دیوار آجری وارد نشده است؛ وزن دیوار محاسبه نشد.");
  if(!Number.isFinite(gamma)||gamma<=0)warnings.push("وزن مخصوص حجمی مصالح بنایی وارد نشده است؛ وزن دیوار محاسبه نشد.");
  if(m.restraintSystem==="unknown")warnings.push("روش مهار دیوار به قاب یا زیرسازی مشخص نشده است.");
  const hs=n(m.horizontalTieSpacingM),vs=n(m.verticalTieSpacingM);
  if(!(hs>0))warnings.push("فاصله قائم مهارهای افقی ثبت نشده است.");
  if(!(vs>0))warnings.push("فاصله افقی مهارهای قائم ثبت نشده است.");
  warnings.push("تعداد قیدهای فولادی فقط شمارش هندسی اعضای بالقوه است؛ اتصال دیوار آجری به آن‌ها و ظرفیت مهار اثبات نشده است.");
  warnings.push("کنترل برون‌صفحه، ترک‌خوردگی، لغزش، واژگونی، لاغری، کلاف‌بندی، جزئیات وال‌پست/اتصال و ضوابط لرزه‌ای انجام نشده است.");
  warnings.push("مساحت بازشوها فقط در صورت ثبت ابعاد معتبر و قرارگیری کامل در محدوده مستطیلی دیوار کسر شده است؛ بازشوهای نامعتبر کسر نشده‌اند.");
  const allMasonryInputs=weightInputsValid&&m.restraintSystem!=="unknown"&&hs>0&&vs>0;
  return {
   geometry:{spanM:span,lengthM:length,eavesHeightM:height,riseM:rise},
   masonryInputs:{thicknessMm:Number.isFinite(tmm)?tmm:null,unitWeightKNm3:Number.isFinite(gamma)?gamma:null,restraintSystem:m.restraintSystem||"unknown",horizontalTieSpacingM:Number.isFinite(hs)?hs:null,verticalTieSpacingM:Number.isFinite(vs)?vs:null},
   faces:rows,
   totals:{brickFaceCount,grossAreaM2:totalGross,openingAreaM2:totalOpenings,netAreaM2:totalNet,estimatedSelfWeightKN:weightInputsValid?totalWeight:null},
   candidateSteelSecondaryMembers:rows.reduce((s,r)=>s+(r.material==="brick"?r.candidateSteelSecondaryMembers:0),0),
   inputCompleteness:allMasonryInputs,
   designEligible:false,loadTransferEnabled:false,
   warnings
  };
 }
 function render(){
  if($("masonryWallAuditPanel"))return;
  const anchor=$("endWallAuditPanel")||$("loadPathAuditPanel")||$("engineeringBriefPanel");
  const panel=document.createElement("section");
  panel.id="masonryWallAuditPanel";panel.className="panel";
  panel.innerHTML='<div class="panel-title"><h3>ممیزی مستقل دیوار آجری و مهار آن</h3><span class="status">فقط محاسبه و کنترل داده‌ها</span></div>'+
   '<div class="notice">این ممیزی مساحت دیوارهای آجری و در صورت ورود ضخامت و وزن مخصوص، وزن تقریبی آن‌ها را محاسبه می‌کند. هنوز هیچ بار مرده یا باد به مدل سازه منتقل نمی‌شود.</div>'+
   '<button type="button" class="btn primary" id="btnRunMasonryWallAudit">اجرای ممیزی دیوار آجری</button>'+
   '<div class="notice" id="masonryWallAuditResult" aria-live="polite">پس از تکمیل مشخصات دیوار و تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
  if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  else document.querySelector("main")?.appendChild(panel);
  $("btnRunMasonryWallAudit").addEventListener("click",()=>{
   const out=$("masonryWallAuditResult");
   try{
    const r=audit(window.SteelStructuralModel?.build?.());
    window.SteelMasonryWallAudit.lastResult=r;
    const lines=r.faces.filter(x=>x.material==="brick").map(x=>{
     const wt=x.weightKN===null?"وزن: نامشخص":("وزن تقریبی: "+fmt(x.weightKN)+" kN");
     return names[x.face]+": مساحت ناخالص "+fmt(x.grossAreaM2)+"؛ بازشو "+fmt(x.openingAreaM2)+"؛ خالص "+fmt(x.netAreaM2)+" m²؛ "+wt+"؛ اعضای فولادی بالقوه مجاور: "+x.candidateSteelSecondaryMembers+"؛ "+x.openingNote;
    });
    out.textContent="نتیجه ممیزی دیوار آجری\n"+lines.join("\n")+
     "\n\nجمع مساحت ناخالص: "+fmt(r.totals.grossAreaM2)+" m²"+
     "\nجمع بازشوهای معتبر: "+fmt(r.totals.openingAreaM2)+" m²"+
     "\nجمع مساحت خالص: "+fmt(r.totals.netAreaM2)+" m²"+
     "\nوزن تقریبی کل دیوارهای آجری: "+(r.totals.estimatedSelfWeightKN===null?"قابل محاسبه نیست":fmt(r.totals.estimatedSelfWeightKN)+" kN")+
     "\n\nکامل‌بودن داده‌های اولیه مهار: "+(r.inputCompleteness?"ورودی‌های اولیه ثبت شده؛ کنترل مهندسی همچنان لازم است":"ناقص")+
     "\n\nمحدودیت‌ها:\n"+r.warnings.join("\n")+
     "\n\nانتقال بار به حل‌گر: غیرفعال؛ designEligible=false.";
    out.style.color="#92400e";
   }catch(e){out.textContent="ممیزی اجرا نشد: "+e.message;out.style.color="#b45309";}
  });
 }
 document.addEventListener("DOMContentLoaded",render);
 window.SteelMasonryWallAudit={audit,lastResult:null};
})();
