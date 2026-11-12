/* SAHROUD STEEL — End-wall / gable geometry audit
 * Read-only geometry and topology audit. No load generation or solver changes.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b));
 function audit(model){
  if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر در دسترس نیست.");
  const g=model.geometry,span=num(g.span),height=num(g.height),rise=num(g.rise);
  if(!(span>0&&height>0&&rise>=0))throw Error("ابعاد دهانه، ارتفاع و خیز بام معتبر نیست.");
  const nodes=new Map(model.nodes.map(n=>[n.id,n])),members=model.members;
  const endPosts=members.filter(m=>m.sectionKey==="endPost");
  const endGirts=members.filter(m=>m.sectionKey==="endGirt");
  const topChords=members.filter(m=>m.sectionKey==="rafter"&&m.axis==="endwall");
  const faces=["front","rear"];
  const roofY=x=>height+rise*(x<=span/2?x/(span/2):(span-x)/(span/2));
  const topGirtY=endGirts.reduce((v,m)=>Math.max(v,num(nodes.get(m.start)?.y),num(nodes.get(m.end)?.y)),0);
  // Exact integral of max(roofY(x)-topGirtY,0) over the two roof slopes.
  const upperBandArea=(()=>{
   if(topGirtY<=height)return span*(height-topGirtY)+span*rise/2;
   if(topGirtY>=height+rise)return 0;
   const d=height+rise-topGirtY;
   return span*d*d/(2*rise);
  })();
  const fullGableTriangleArea=span*rise/2;
  const faceResults=faces.map(face=>{
   const posts=endPosts.filter(m=>m.endFace===face);
   const chords=topChords.filter(m=>m.endFace===face);
   const girts=endGirts.filter(m=>m.endFace===face);
   const postTop=posts.filter(m=>{
    const a=nodes.get(m.start),b=nodes.get(m.end);
    return [a,b].some(n=>n&&near(n.y,roofY(n.x))&&near(n.z,face==="front"?0:num(g.length)));
   });
   const chordLength=chords.reduce((s,m)=>{
    const a=nodes.get(m.start),b=nodes.get(m.end);
    return s+(a&&b?Math.hypot(b.x-a.x,b.y-a.y):0);
   },0);
   const expectedChordLength=2*Math.hypot(span/2,rise);
   const chordClosure=expectedChordLength>0?chordLength/expectedChordLength:0;
   const missingPostTops=posts.length-postTop.length;
   return {face,endPostSegments:posts.length,endGirtSegments:girts.length,gableTopChordSegments:chords.length,
    postSegmentsReachingRoofline:postTop.length,missingPostTopSegments:missingPostTops,
    topChordLengthM:chordLength,expectedTopChordLengthM:expectedChordLength,
    topChordLengthRatio:chordClosure,
    topologyOk:posts.length>0&&chords.length>0&&missingPostTops===0&&near(chordClosure,1,1e-5)};
  });
  const areaChecks=[
   {id:"gable-triangle",areaM2:fullGableTriangleArea,formula:"span × rise / 2",status:"geometry-only"},
   {id:"above-highest-end-girt",areaM2:upperBandArea,formula:"integral(max(roofY(x) − highest end-girt elevation, 0))",status:"not-loaded"}
  ];
  const warnings=[
   "مدل هندسی، وجود ستونک‌های قائم و وتر بالایی را نشان می‌دهد؛ اما وجود ورق پوشش، زیرسازی واقعی، نوع دهانه‌گیری ورق و اتصال ورق به ستونک/قید/وتر را اثبات نمی‌کند.",
   "مساحت بالای آخرین قید افقی فقط بخش مثلثی نیست؛ نوار مستطیلی بین آخرین قید و خط لبه بام نیز در مساحت محاسبه شده است.",
   "هیچ فشار باد یا بار سطحی به endPost، endGirt یا رفتر انتهایی منتقل نشده است. بارگذاری ناحیه فوقانی تا تکمیل مدل پوشش و مسیر اتصال غیرفعال می‌ماند."
  ];
  if(faceResults.some(x=>!x.topologyOk))warnings.push("پیوستگی هندسی وتر بالایی یا رسیدن ستونک‌ها به خط بام در یک یا هر دو انتها کامل نیست؛ جزئیات توپولوژی باید اصلاح شود.");
  return {schema:"sahroud-steel-end-wall-audit",version:1,geometry:{spanM:span,eavesHeightM:height,riseM:rise,highestEndGirtElevationM:topGirtY},
   areasPerEndM2:areaChecks,faces:faceResults,
   totalUpperBandAreaBothEndsM2:2*upperBandArea,
   checks:[{id:"front-gable-topology",ok:faceResults[0].topologyOk,detail:"کنترل اعضای انتهایی جلو بر اساس شناسه گره و طول وتر"},
    {id:"rear-gable-topology",ok:faceResults[1].topologyOk,detail:"کنترل اعضای انتهایی عقب بر اساس شناسه گره و طول وتر"}],
   warnings,designEligible:false,loadTransferEnabled:false,
   note:"این ممیزی هندسه و توپولوژی است؛ کنترل بارگیر پوشش، سختی/مقاومت اتصالات، پایداری، مقاومت اعضا و ضوابط باد را انجام نمی‌دهد."};
 }
 function render(){
  if($("endWallAuditPanel"))return;
  const anchor=$("loadPathAuditPanel")||$("tributaryAuditPanel")||$("windZoneGeometryPanel");
  if(!anchor?.parentNode)return;
  const panel=document.createElement("section");panel.className="panel";panel.id="endWallAuditPanel";
  panel.innerHTML='<div class="panel-title"><h3>ممیزی هندسه دیوار انتهایی و گابل</h3><span class="status">فقط‌خواندنی</span></div>'+
   '<div class="notice">مساحت واقعی ناحیه بالای آخرین قید افقی را با احتساب نوار مستطیلی زیر خط بام و مثلث زیر شیب محاسبه می‌کند؛ همچنین پیوستگی ستونک‌ها و وتر بالایی را کنترل می‌کند. هیچ باری به حل‌گر اضافه نمی‌شود.</div>'+
   '<button type="button" class="btn secondary" id="btnRunEndWallAudit">اجرای ممیزی دیوار انتهایی</button>'+
   '<div id="endWallAuditResult" class="notice" aria-live="polite">پس از تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
  anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  $("btnRunEndWallAudit").addEventListener("click",()=>{
   const box=$("endWallAuditResult");
   try{
    const result=audit(window.SteelStructuralModel?.build?.());
    window.SteelEndWallAudit.lastResult=result;
    const areas=result.areasPerEndM2.map(a=>a.id+": "+a.areaM2.toFixed(3)+" m² در هر انتها").join("\n");
    const faces=result.faces.map(f=>f.face+": ستونک‌ها "+f.postSegmentsReachingRoofline+"/"+f.endPostSegments+
     " به خط بام می‌رسند؛ وتر بالایی "+f.topChordLengthM.toFixed(3)+"/"+f.expectedTopChordLengthM.toFixed(3)+" m؛ "+
     (f.topologyOk?"توپولوژی هندسی برقرار":"نیازمند اصلاح")).join("\n");
    box.textContent="ممیزی گابل — "+result.geometry.spanM.toFixed(2)+" m دهانه، "+
     result.geometry.eavesHeightM.toFixed(2)+" m ارتفاع لبه و "+
     result.geometry.riseM.toFixed(2)+" m خیز بام.\n"+
     "ارتفاع آخرین قید: "+result.geometry.highestEndGirtElevationM.toFixed(3)+" m\n"+
     areas+"\nمساحت ناحیه بالای آخرین قید در دو انتها: "+
     result.totalUpperBandAreaBothEndsM2.toFixed(3)+" m²\n\n"+faces+
     "\n\nمحدودیت‌ها:\n"+result.warnings.join("\n")+
     "\n\nبارگذاری ناحیه فوقانی و انتقال آن به حل‌گر: غیرفعال.";
    box.style.color=result.checks.every(c=>c.ok)?"#92400e":"#b45309";
   }catch(e){box.textContent="ممیزی دیوار انتهایی انجام نشد: "+e.message;box.style.color="#b45309";}
  });
 }
 window.SteelEndWallAudit={audit,getLastResult:()=>window.SteelEndWallAudit.lastResult||null,lastResult:null,designEligible:false,loadTransferEnabled:false};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();