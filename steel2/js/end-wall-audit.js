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
  const topChords=members.filter(m=>m.sectionKey==="rafter"&&["front","rear"].includes(m.gableChordFace));
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
   const postGroups=new Map();
   posts.forEach(m=>{const key=String(m.post);if(!postGroups.has(key))postGroups.set(key,[]);postGroups.get(key).push(m);});
   const postTopNodeIds=[];
   const postsReachingRoof=Array.from(postGroups.values()).filter(chain=>{
    const top=chain.flatMap(m=>[nodes.get(m.start),nodes.get(m.end)]).filter(n=>
     n&&near(n.y,roofY(n.x))&&near(n.z,face==="front"?0:num(g.length)));
    if(top.length)postTopNodeIds.push(top[0].id);
    return top.length>0;
   });
   const chordLength=chords.reduce((s,m)=>{
    const a=nodes.get(m.start),b=nodes.get(m.end);
    return s+(a&&b?Math.hypot(b.x-a.x,b.y-a.y):0);
   },0);
   const expectedChordLength=2*Math.hypot(span/2,rise);
   const chordClosure=expectedChordLength>0?chordLength/expectedChordLength:0;
   const chordAdj=new Map(),chordNodeIds=new Set();
   chords.forEach(m=>{chordNodeIds.add(m.start);chordNodeIds.add(m.end);
    if(!chordAdj.has(m.start))chordAdj.set(m.start,new Set());if(!chordAdj.has(m.end))chordAdj.set(m.end,new Set());
    chordAdj.get(m.start).add(m.end);chordAdj.get(m.end).add(m.start);
   });
   const visited=new Set(),stack=chordNodeIds.size?[chordNodeIds.values().next().value]:[];
   while(stack.length){const id=stack.pop();if(visited.has(id))continue;visited.add(id);(chordAdj.get(id)||[]).forEach(next=>{if(!visited.has(next))stack.push(next);});}
   const chordConnected=chordNodeIds.size>0&&visited.size===chordNodeIds.size&&Array.from(chordAdj.values()).filter(v=>v.size===1).length===2;
   const postTopOnChord=postTopNodeIds.every(id=>chordNodeIds.has(id));
   const missingPostTops=postGroups.size-postsReachingRoof.length;
   return {face,endPostSegments:posts.length,endGirtSegments:girts.length,gableTopChordSegments:chords.length,
    postsReachingRoofline:postsReachingRoof.length,postCount:postGroups.size,missingPostTops,
    topChordLengthM:chordLength,expectedTopChordLengthM:expectedChordLength,
    topChordLengthRatio:chordClosure,chordConnected,postTopOnChord,
    topologyOk:posts.length>0&&chords.length>0&&missingPostTops===0&&near(chordClosure,1,1e-5)&&chordConnected&&postTopOnChord};
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
    const faces=result.faces.map(f=>f.face+": ستونک‌ها "+f.postsReachingRoofline+"/"+f.postCount+
     " به خط بام می‌رسند؛ وتر بالایی "+f.topChordLengthM.toFixed(3)+"/"+f.expectedTopChordLengthM.toFixed(3)+" m؛ پیوستگی وتر: "+
     (f.chordConnected?"برقرار":"ناقص")+"؛ اتصال گره رأس ستونک‌ها به وتر: "+(f.postTopOnChord?"برقرار":"ناقص")+"؛ "+
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
  function selfTest(){
  const nodes=[],members=[];
  ["front","rear"].forEach((face,fi)=>{
   const z=fi===0?0:20, ids=[0,5,10].map((x,i)=>"G_"+face+"_"+i);
   [0,5,10].forEach((x,i)=>nodes.push({id:ids[i],x,y:i===1?7:5,z,kind:"endwall-head"}));
   members.push({id:"C1_"+face,start:ids[0],end:ids[1],sectionKey:"rafter",gableChordFace:face});
   members.push({id:"C2_"+face,start:ids[1],end:ids[2],sectionKey:"rafter",gableChordFace:face});
   const base="B_"+face;nodes.push({id:base,x:5,y:0,z,kind:"endwall-base"});
   members.push({id:"P_"+face,post:1,endFace:face,start:base,end:ids[1],sectionKey:"endPost"});
  });
  const result=audit({geometry:{span:10,length:20,height:5,rise:2},nodes,members});
  return {passed:result.faces.filter(x=>x.topologyOk).length,total:2,failed:result.faces.filter(x=>!x.topologyOk).length,faces:result.faces};
 }
window.SteelEndWallAudit={audit,getLastResult:()=>window.SteelEndWallAudit.lastResult||null,lastResult:null,designEligible:false,loadTransferEnabled:false,selfTest};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();