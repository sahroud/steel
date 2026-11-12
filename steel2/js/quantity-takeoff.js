/* SAHROUD STEEL — Bill of quantities and material takeoff
 * Quantities are estimates from current model geometry and user-entered material data.
 * Does not infer steel mass, reinforcement, mortar mix components, or connection quantities.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id), num=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN;};
 const fmt=x=>Number(x).toFixed(3);
 const labels={front:"دیوار انتهایی جلو",rear:"دیوار انتهایی عقب",left:"دیوار طولی چپ",right:"دیوار طولی راست"};
 const materials={brick:"آجرچینی","metal-sheet":"ورق فلزی","sandwich-panel":"ساندویچ‌پنل",other:"سیستم دیگر"};
 function calculate(model){
  if(!model?.geometry||!Array.isArray(model.members))throw Error("ابتدا مدل هندسی سوله را تولید کنید.");
  const g=model.geometry,span=num(g.span),length=num(g.length),height=num(g.height),rise=num(g.rise);
  if(!(span>0&&length>0&&height>0&&rise>=0))throw Error("ابعاد هندسی مدل معتبر نیست.");
  const brief=window.SteelDesignCore?.getData?.();if(!brief)throw Error("مبانی پروژه در دسترس نیست.");
  const m=brief.masonry||{},walls=brief.wallEnvelope||{},opens=window.SteelOpenings?.getData?.()||{};
  const t=num(m.thicknessMm)/1000,gamma=num(m.unitWeightKNm3);
  const brickL=num(m.brickLengthMm)/1000,brickH=num(m.brickHeightMm)/1000,brickD=num(m.brickDepthMm)/1000,joint=num(m.mortarJointMm)/1000;
  const plasterT=num(m.plasterThicknessMm)/1000;
  const brickValid=brickL>0&&brickH>0&&brickD>0&&joint>=0&&t>0;
  const rows=[];let totalMasonryArea=0,totalMasonryVol=0,totalMasonryWeight=0,totalBrickCount=0,totalMortar=0,totalPlasterArea=0,totalPlasterVol=0;
  for(const face of ["front","rear","left","right"]){
   const w=walls[face]||{material:"brick",orientation:"vertical"},end=face==="front"||face==="rear";
   const gross=end?span*height+span*rise/2:length*height,op=opens[face]||{};
   let opArea=0,openingStatus="بدون بازشو معتبر";
   if(op.enabled){
    const ow=num(op.width),oh=num(op.height),pos=end?0:num(op.position),run=end?span:length;
    if(ow>0&&oh>0&&pos>=0&&pos+ow<=run+1e-8&&oh<=height+1e-8){opArea=ow*oh;openingStatus="بازشوی معتبر کسر شد";}
    else openingStatus="بازشو نامعتبر؛ کسر نشده";
   }
   const net=Math.max(0,gross-opArea),isBrick=w.material==="brick",vol=isBrick?net*t:null;
   const weight=isBrick&&vol!==null&&gamma>0?vol*gamma:null;
   let brickCount=null,mortarVol=null;
   if(isBrick&&brickValid){
    const countBase=vol/((brickL+joint)*(brickH+joint)*brickD);
    brickCount=Math.ceil(countBase*1.05);
    mortarVol=Math.max(0,vol-countBase*brickL*brickH*brickD);
    totalBrickCount+=brickCount;totalMortar+=mortarVol;
   }
   const plasterArea=isBrick&&plasterT>0?net*2:null,plasterVol=plasterArea!==null?plasterArea*plasterT:null;
   if(isBrick){totalMasonryArea+=net;totalMasonryVol+=vol;if(weight!==null)totalMasonryWeight+=weight;if(plasterArea!==null){totalPlasterArea+=plasterArea;totalPlasterVol+=plasterVol;}}
   rows.push({face,material:w.material,orientation:w.orientation,grossAreaM2:gross,openingAreaM2:opArea,netAreaM2:net,masonryVolumeM3:vol,masonryWeightKN:weight,estimatedBrickCount:brickCount,estimatedMortarVolumeM3:mortarVol,plasterAreaM2:plasterArea,plasterVolumeM3:plasterVol,openingStatus});
  }
  const grouped={};
  model.members.forEach(mem=>{const key=mem.sectionKey||mem.type||"unassigned";if(!grouped[key])grouped[key]={group:key,count:0,totalLengthM:0};grouped[key].count++;grouped[key].totalLengthM+=num(mem.length)||0;});
  const half=span/2,roofSlope=Math.hypot(half,rise),overhang=num(g.roofOverhang)>0?num(g.roofOverhang):0;
  const overhangSlope=overhang>0?overhang*Math.hypot(half,rise)/half:0;
  const endOverhang=num(g.endOverhang)>0?num(g.endOverhang):0;
  const roofArea=2*(roofSlope+overhangSlope)*(length+2*endOverhang);
  const warnings=[
   "تعداد آجر برآورد حجمی با ۵٪ پرت فرضی است؛ ابعاد واقعی آجر، الگوی چیدمان، شکست و پرت کارگاهی باید تأیید شود.",
   "حجم ملات، حجم نظری بندها بر پایه ابعاد آجر و بند واردشده است؛ نسبت اختلاط و مقدار سیمان/ماسه جداگانه محاسبه نشده است.",
   "وزن دیوار فقط در صورت ورود وزن مخصوص حجمی مصالح محاسبه می‌شود؛ وزن ۳۵۰ میلی‌متر به‌تنهایی برای تعیین وزن کافی نیست.",
   "طول فولاد از اعضای مدل هندسی جمع شده است؛ وزن فولاد، ورق اتصال، پیچ، جوش و پرت برش بدون فهرست مقاطع و جرم واحد معتبر محاسبه نشده است.",
   "مساحت پوشش سقف تقریبی و بر پایه هندسه مدل و پیش‌آمدگی‌های ثبت‌شده است؛ بازشوها و جزئیات لبه/فلاشینگ جداگانه لحاظ نشده‌اند."
  ];
  return {title:"SAHROUD STEEL — متره و برآورد مصالح",generatedAt:new Date().toISOString(),geometry:{spanM:span,lengthM:length,eavesHeightM:height,riseM:rise,frameCount:g.frames?.length??null},masonryInputs:{thicknessMm:Number.isFinite(num(m.thicknessMm))?num(m.thicknessMm):350,unitWeightKNm3:Number.isFinite(gamma)?gamma:null,brickDimensionsMm:{length:Number.isFinite(num(m.brickLengthMm))?num(m.brickLengthMm):null,height:Number.isFinite(num(m.brickHeightMm))?num(m.brickHeightMm):null,depth:Number.isFinite(num(m.brickDepthMm))?num(m.brickDepthMm):null},mortarJointMm:Number.isFinite(num(m.mortarJointMm))?num(m.mortarJointMm):null,plasterThicknessMm:Number.isFinite(num(m.plasterThicknessMm))?num(m.plasterThicknessMm):null},facades:rows,totals:{masonryNetAreaM2:totalMasonryArea,masonryVolumeM3:totalMasonryVol,masonryWeightKN:gamma>0?totalMasonryWeight:null,estimatedBrickCount:brickValid?totalBrickCount:null,estimatedMortarVolumeM3:brickValid?totalMortar:null,plasterAreaBothFacesM2:plasterT>0?totalPlasterArea:null,plasterVolumeM3:plasterT>0?totalPlasterVol:null,roofCoverAreaApproxM2:roofArea},steelMemberSchedule:Object.values(grouped),warnings,designStatus:"متره مقدماتی؛ فاقد تأیید اجرایی/آیین‌نامه‌ای"};
 }
 function csv(report){
  const lines=[["بخش","شرح","واحد","مقدار","توضیحات"]];
  const add=(a,b,u,v,note="")=>{if(v!==null&&v!==undefined)lines.push([a,b,u,typeof v==="number"?fmt(v):v,note]);};
  add("هندسه","دهانه","m",report.geometry.spanM);add("هندسه","طول سوله","m",report.geometry.lengthM);add("هندسه","ارتفاع کناره","m",report.geometry.eavesHeightM);add("هندسه","خیز سقف","m",report.geometry.riseM);
  report.facades.forEach(f=>{const title=labels[f.face]+" — "+(materials[f.material]||f.material);add("دیوار",title+" مساحت ناخالص","m²",f.grossAreaM2);add("دیوار",title+" بازشو کسرشده","m²",f.openingAreaM2,f.openingStatus);add("دیوار",title+" مساحت خالص","m²",f.netAreaM2);add("دیوار",title+" حجم بنایی","m³",f.masonryVolumeM3);add("دیوار",title+" وزن تقریبی","kN",f.masonryWeightKN);add("مصالح",title+" تعداد آجر تخمینی","عدد",f.estimatedBrickCount);add("مصالح",title+" حجم ملات نظری","m³",f.estimatedMortarVolumeM3);add("نازک‌کاری",title+" سطح اندود دو طرف","m²",f.plasterAreaM2);add("نازک‌کاری",title+" حجم اندود","m³",f.plasterVolumeM3);});
  const t=report.totals;add("جمع","مساحت خالص دیوار آجری","m²",t.masonryNetAreaM2);add("جمع","حجم بنایی","m³",t.masonryVolumeM3);add("جمع","وزن تقریبی بنایی","kN",t.masonryWeightKN);add("جمع","تعداد آجر تخمینی","عدد",t.estimatedBrickCount);add("جمع","حجم ملات نظری","m³",t.estimatedMortarVolumeM3);add("جمع","سطح اندود دو طرف","m²",t.plasterAreaBothFacesM2);add("پوشش","مساحت تقریبی سقف","m²",t.roofCoverAreaApproxM2);
  report.steelMemberSchedule.forEach(s=>{add("فولاد","تعداد عضو "+s.group,"عدد",s.count);add("فولاد","طول کل عضو "+s.group,"m",s.totalLengthM,"وزن واحد مقطع ثبت نشده؛ وزن محاسبه نشده");});
  report.warnings.forEach((w,i)=>lines.push(["ملاحظات","هشدار "+(i+1),"","",w]));
  return "\uFEFF"+lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 }
 function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function render(){
  if($("quantityTakeoffPanel"))return;
  const anchor=$("masonryWallAuditPanel")||$("engineeringBriefPanel"),panel=document.createElement("section");
  panel.id="quantityTakeoffPanel";panel.className="panel";
  panel.innerHTML='<div class="panel-title"><h3>متره و برآورد مصالح و اجزای سوله</h3><span class="status">گزارش قابل خروجی</span></div>'+
   '<div class="notice">ضخامت دیوار آجری پروژه روی ۳۵۰ میلی‌متر تنظیم شده است. ابعاد آجر، بند ملات، وزن مخصوص و اندود را فقط مطابق مصالح و نقشه واقعی وارد کنید؛ خانه‌های خالی به‌عنوان داده نامعلوم باقی می‌مانند.</div>'+
   '<div class="button-grid"><button type="button" class="btn primary" id="btnRunQuantityTakeoff">محاسبه متره و برآورد</button><button type="button" class="btn secondary" id="btnExportQuantityCsv" disabled>دریافت فایل Excel-compatible (CSV)</button><button type="button" class="btn secondary" id="btnExportQuantityJson" disabled>دریافت فایل JSON پروژه</button></div>'+
   '<div class="notice" id="quantityTakeoffResult" aria-live="polite">پس از تولید مدل هندسی، محاسبه متره را اجرا کنید. فایل CSV در Excel باز می‌شود.</div>';
  if(anchor?.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);else document.querySelector("main")?.appendChild(panel);
  let last=null;
  $("btnRunQuantityTakeoff").addEventListener("click",()=>{try{last=calculate(window.SteelStructuralModel?.build?.());window.SteelQuantityTakeoff.lastResult=last;window.SteelCostEstimate?.refreshFromBOQ?.(last);const t=last.totals;const out=$("quantityTakeoffResult");out.textContent="متره با موفقیت محاسبه شد.\nمساحت خالص دیوار آجری: "+fmt(t.masonryNetAreaM2)+" m²\nحجم بنایی با ضخامت "+last.masonryInputs.thicknessMm+" mm: "+fmt(t.masonryVolumeM3)+" m³\nوزن دیوار: "+(t.masonryWeightKN===null?"نیازمند ورود وزن مخصوص":fmt(t.masonryWeightKN)+" kN")+"\nتعداد آجر: "+(t.estimatedBrickCount===null?"نیازمند ابعاد واقعی آجر و بند ملات":t.estimatedBrickCount+" عدد (با ۵٪ پرت)")+"\nحجم ملات نظری: "+(t.estimatedMortarVolumeM3===null?"نامشخص":fmt(t.estimatedMortarVolumeM3)+" m³")+"\nسطح اندود دو طرف: "+(t.plasterAreaBothFacesM2===null?"ضخامت اندود وارد نشده":fmt(t.plasterAreaBothFacesM2)+" m²")+"\nمساحت تقریبی پوشش سقف: "+fmt(t.roofCoverAreaApproxM2)+" m²\nتعداد گروه‌های مقاطع فولادی: "+last.steelMemberSchedule.length+"\n\n"+last.warnings.join("\n");if(last.steelMassTakeoff){const sm=last.steelMassTakeoff;out.textContent+="\n\nوزن اسکلت فولادی: "+(sm.structuralSteelMassKg===null?"ناقص":fmt(sm.structuralSteelMassKg)+" kg")+"\nوزن ورق‌های اتصال ثبت‌شده: "+fmt(sm.connectionPlateMassKg)+" kg\nوزن ساق پیچ‌ها: "+fmt(sm.boltShankMassKg)+" kg\nوزن نظری فلز جوش: "+fmt(sm.theoreticalWeldMetalMassKg)+" kg\nپرت برش: "+(sm.cutWastePct===null?"وارد نشده":sm.cutWastePct+"٪")+"\nوزن خرید اسکلت و ورق با پرت: "+fmt(sm.procurementMassExcludingBoltsAndWeldKg)+" kg";sm.groups.forEach(g=>{out.textContent+="\n"+g.label+": "+(g.massKg===null?"سطح مقطع ناقص":fmt(g.massKg)+" kg")+" | "+fmt(g.totalLengthM)+" m | "+g.count+" عضو";});}$("btnExportQuantityCsv").disabled=false;$("btnExportQuantityJson").disabled=false;}catch(e){$("quantityTakeoffResult").textContent="خطا در متره: "+e.message;$("btnExportQuantityCsv").disabled=true;$("btnExportQuantityJson").disabled=true;last=null;}});
  $("btnExportQuantityCsv").addEventListener("click",()=>{if(last)download("SAHROUD-STEEL-BOQ.csv",window.SteelQuantityTakeoff?.csv?.(last)||csv(last),"text/csv;charset=utf-8");});
  $("btnExportQuantityJson").addEventListener("click",()=>{if(last)download("SAHROUD-STEEL-BOQ.json",JSON.stringify(last,null,2),"application/json;charset=utf-8");});
 }
 document.addEventListener("DOMContentLoaded",render);
 window.SteelQuantityTakeoff={calculate,csv,lastResult:null};
})();