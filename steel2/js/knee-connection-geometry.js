/* SAHROUD STEEL — evidence-based knee member geometry audit.
 * Reads only the assigned member section geometry. It deliberately does not
 * invent a connection plate, bolt grid, weld, eccentricity, or fabrication plane.
 */
(function(root){
 "use strict";
 const $=id=>root.document?.getElementById(id);
 const finite=v=>Number.isFinite(Number(v));
 const positive=v=>finite(v)&&Number(v)>0;
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const DIMENSIONS=["topFlangeWidthMm","topFlangeThicknessMm","bottomFlangeWidthMm","bottomFlangeThicknessMm","webClearHeightMm","webThicknessMm"];
 function node(model,id){return model.nodes.find(n=>String(n.id)===String(id));}
 function unit(v){const l=Math.hypot(v.x,v.y,v.z);if(!(l>0))throw Error("بردار عضو نامعتبر است.");return{x:v.x/l,y:v.y/l,z:v.z/l};}
 function sectionGeometry(member){
  const section=member?.sectionProperties;
  if(!section)return{available:false,status:"missing-section-properties",issues:["خواص مقطع نهایی عضو در رجیستری وجود ندارد."]};
  if(member.sectionPropertyFingerprint&&section.sectionPropertyFingerprint&&member.sectionPropertyFingerprint!==section.sectionPropertyFingerprint)
   return{available:false,status:"stale-section-fingerprint",issues:["اثر انگشت مقطع عضو با خواص ثبت‌شده یکسان نیست؛ مدل باید بازسازی شود."]};
  if(section.geometryType!=="built-up-I")
   return{available:false,status:"unsupported-or-unverified-profile",profile:section.profile||null,issues:["هندسه پارامتریک قابل بازیابی نیست؛ فقط مقطع تیرورق I با ابعاد صریح پذیرفته می‌شود."]};
  const dims=section.geometryDimensionsMm||{},issues=[];
  DIMENSIONS.forEach(k=>{if(!positive(dims[k]))issues.push("بعد "+k+" در مقطع عضو ثبت نشده یا نامعتبر است.");});
  if(!issues.length){
   if(Number(dims.webThicknessMm)>=Math.min(Number(dims.topFlangeWidthMm),Number(dims.bottomFlangeWidthMm)))
    issues.push("ضخامت جان از عرض بال‌ها کمتر نیست.");
   if(Number(dims.webThicknessMm)>=Number(dims.webClearHeightMm))
    issues.push("ضخامت جان از ارتفاع خالص جان کمتر نیست.");
   if(Number(dims.topFlangeThicknessMm)>=Number(dims.webClearHeightMm)||Number(dims.bottomFlangeThicknessMm)>=Number(dims.webClearHeightMm))
    issues.push("ضخامت بال با ارتفاع خالص جان سازگار نیست.");
  }
  return{available:issues.length===0,status:issues.length?"invalid-section-geometry":"verified-parametric-input",profile:section.profile||null,
   dimensionsMm:Object.fromEntries(DIMENSIONS.map(k=>[k,Number(dims[k])])),units:"mm",
   fingerprint:section.sectionPropertyFingerprint||member.sectionPropertyFingerprint||null,
   source:"member.sectionProperties.geometryDimensionsMm",issues};
 }
 function extract(model){
  if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("ابتدا مدل سه‌بعدی را تولید و مقاطع اعضا را تخصیص دهید.");
  const out=[];
  model.nodes.filter(n=>n.kind==="eave").forEach(n=>{
   const columns=model.members.filter(m=>m.sectionKey==="column"&&(m.start===n.id||m.end===n.id));
   const rafters=model.members.filter(m=>m.sectionKey==="rafter"&&m.axis==="transverse"&&!m.endFace&&(m.start===n.id||m.end===n.id));
   columns.forEach(col=>rafters.forEach(raf=>{
    const cn=node(model,col.start===n.id?col.end:col.start),rn=node(model,raf.start===n.id?raf.end:raf.start);
    if(!cn||!rn)throw Error("گره انتهایی عضو در زانویی "+n.id+" پیدا نشد.");
    const vc=unit({x:cn.x-n.x,y:cn.y-n.y,z:cn.z-n.z}),vr=unit({x:rn.x-n.x,y:rn.y-n.y,z:rn.z-n.z});
    const dot=vc.x*vr.x+vc.y*vr.y+vc.z*vr.z;
    out.push({id:"F"+(raf.frame??"؟")+"-"+(n.x<=Number(model.geometry?.span||0)/2?"left":"right"),
     frame:raf.frame??null,side:n.x<=Number(model.geometry?.span||0)/2?"left":"right",node:n,
     column:{id:col.id,length:Math.hypot(cn.x-n.x,cn.y-n.y,cn.z-n.z),vector:vc,sectionGeometry:sectionGeometry(col)},
     rafter:{id:raf.id,length:Math.hypot(rn.x-n.x,rn.y-n.y,rn.z-n.z),vector:vr,sectionGeometry:sectionGeometry(raf)},
     angle:Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI});
   }));
  });
  return out.sort((a,b)=>(Number(a.frame)||0)-(Number(b.frame)||0)||a.side.localeCompare(b.side));
 }
 function check(k){
  const errors=[],warnings=[
   "ابعاد مقطع فقط از رکورد sectionProperties عضو خوانده شده‌اند؛ مقطع واقعی، جهت نصب و چرخش مقطع هنوز باید با نقشه/مدرک ساخت تطبیق داده شوند.",
   "صفحه واقعی اتصال، ورق زانویی، ورق مضاعف، پیچ‌ها، سوراخ‌ها، جوش‌ها و خروج از مرکزیت در مدل تعریف نشده‌اند.",
   "این ممیزی ظرفیت، قبولی آیین‌نامه‌ای یا آمادگی اجرا را بررسی نمی‌کند."
  ];
  if(!k)errors.push("گره زانویی انتخاب نشده است.");
  else{
   if(!k.column?.sectionGeometry?.available)errors.push("هندسه واقعی/پارامتریک مقطع ستون قابل تأیید نیست: "+(k.column?.sectionGeometry?.issues||[]).join("؛ "));
   if(!k.rafter?.sectionGeometry?.available)errors.push("هندسه واقعی/پارامتریک مقطع رفتر قابل تأیید نیست: "+(k.rafter?.sectionGeometry?.issues||[]).join("؛ "));
   if(!positive(k.column?.length)||!positive(k.rafter?.length))errors.push("طول هندسی عضو مجاور گره معتبر نیست.");
  }
  return{valid:errors.length===0,errors,warnings,geometryOnly:true,platePlaneVerified:false,capacityDesigned:false,executionReady:false};
 }
 function dimensionsText(g){
  if(!g?.available)return '<span class="notice">غیرقابل‌تأیید: '+esc((g?.issues||["هندسه مقطع موجود نیست."]).join("؛ "))+"</span>";
  const d=g.dimensionsMm;
  return '<div class="form-grid">'+[
   ["عرض بال بالا",d.topFlangeWidthMm],["ضخامت بال بالا",d.topFlangeThicknessMm],
   ["عرض بال پایین",d.bottomFlangeWidthMm],["ضخامت بال پایین",d.bottomFlangeThicknessMm],
   ["ارتفاع خالص جان",d.webClearHeightMm],["ضخامت جان",d.webThicknessMm]
  ].map(x=>'<div class="result-card"><span>'+x[0]+' (mm)</span><strong>'+esc(x[1])+"</strong></div>").join("")+"</div>"+
   '<p class="geometry-hint">مقطع: '+esc(g.profile||"بدون نام")+'؛ منبع ابعاد: '+esc(g.source)+'؛ اثر انگشت: '+esc(g.fingerprint||"ثبت نشده")+"</p>";
 }
 function drawing(k){
  const x=350,y=275,s=150,cv=k.column.vector,rv=k.rafter.vector;
  const cp={x:x+cv.x*Math.min(1.4,k.column.length)*s,y:y-cv.y*Math.min(1.4,k.column.length)*s};
  const rp={x:x+rv.x*Math.min(1.7,k.rafter.length)*s,y:y-rv.y*Math.min(1.7,k.rafter.length)*s};
  return '<svg viewBox="0 0 700 410" role="img" aria-label="محورهای تحلیلی ستون و رفتر" style="width:100%;height:auto;background:#f8fafc">'+
   '<line x1="'+x+'" y1="'+y+'" x2="'+cp.x+'" y2="'+cp.y+'" stroke="#176b9b" stroke-width="12"/>'+
   '<line x1="'+x+'" y1="'+y+'" x2="'+rp.x+'" y2="'+rp.y+'" stroke="#d97706" stroke-width="12"/>'+
   '<rect x="'+(x-5)+'" y="'+(y-5)+'" width="10" height="10" fill="#b91c1c"/>'+
   '<text x="20" y="28" fill="#176b9b">محور عضو ستون '+esc(k.column.id)+'</text>'+
   '<text x="430" y="28" fill="#b45309">محور عضو رفتر '+esc(k.rafter.id)+'</text>'+
   '<text x="20" y="385" fill="#334155">فقط محورهای واقعی اعضا؛ هیچ ورق یا آرایش پیچی فرض نشده است.</text></svg>';
 }
 function render(){
  const summary=$("kneeSummary"),checks=$("kneeChecks"),draw=$("kneeDrawing"),dims=$("kneeSectionGeometry");
  if(!summary||!checks||!draw||!dims)return;
  const k=knees.find(x=>x.id===$("kneeSelect").value);if(!k)return;
  const v=check(k),fmt=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:3});
  summary.innerHTML='<b>قاب '+esc(k.frame??"نامشخص")+' ـ '+(k.side==="left"?"چپ":"راست")+'</b><br>گره مشترک: '+esc(k.node.id)+
   '؛ مختصات X/Y/Z: '+[k.node.x,k.node.y,k.node.z].map(fmt).join(" / ")+' m<br>ستون: '+esc(k.column.id)+' ('+fmt(k.column.length)+' m)؛ رفتر: '+esc(k.rafter.id)+' ('+fmt(k.rafter.length)+' m)'+
   '<br>زاویه امتداد دو عضو از گره: '+fmt(k.angle)+'°';
  dims.innerHTML='<h4>هندسه ثبت‌شده مقطع ستون</h4>'+dimensionsText(k.column.sectionGeometry)+
   '<h4>هندسه ثبت‌شده مقطع رفتر</h4>'+dimensionsText(k.rafter.sectionGeometry);
  draw.innerHTML=drawing(k);
  checks.innerHTML=(v.valid?"هندسه پارامتریک هر دو مقطع از رجیستری عضو بازیابی شد.":"هندسه مقاطع برای ورود به مرحله اتصال کامل نیست.")+
   (v.errors.length?"<ul>"+v.errors.map(e=>"<li>"+esc(e)+"</li>").join("")+"</ul>":"")+
   "<ul>"+v.warnings.map(w=>"<li>"+esc(w)+"</li>").join("")+"</ul>";
 }
 let knees=[];
 function mount(){
  if(!$("kneeConnectionGeometryPanel")){
   const p=root.document.createElement("section");p.className="panel";p.id="kneeConnectionGeometryPanel";
   p.innerHTML='<div class="panel-title"><h3>اتصال زانویی ـ ممیزی هندسه واقعی اعضا</h3><span class="status">هندسه، بدون طراحی ظرفیت</span></div>'+
    '<div class="notice">در این مرحله فقط هندسه مقاطع ستون و رفتر از رجیستری یکپارچه مقاطع خوانده می‌شود. ابعاد فرضی ورق و آرایش فرضی پیچ حذف شده‌اند تا با نقشه ساخت اشتباه گرفته نشوند.</div>'+
    '<div class="form-grid"><div class="field"><label for="kneeSelect">قاب و سمت</label><select id="kneeSelect"><option value="">ابتدا مدل را استخراج کنید</option></select></div></div>'+
    '<div class="button-grid"><button id="btnKneeExtract" class="btn primary" type="button">بازیابی هندسه از مدل جاری</button><button id="btnKneeCsv" class="btn secondary" type="button" disabled>خروجی CSV هندسه مقاطع</button></div>'+
    '<div id="kneeSummary" class="notice">مدل سه‌بعدی و مقاطع اعضا را ابتدا تولید کنید.</div><div id="kneeSectionGeometry"></div>'+
    '<h4>نمای محورهای اعضای متصل</h4><div id="kneeDrawing" class="drawing-area"></div><div id="kneeChecks" class="notice"></div>';
   const anchor=$("connectionDemandReviewPanel");
   if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else root.document.querySelector("main")?.appendChild(p);
  }
  $("btnKneeExtract").addEventListener("click",refresh);
  $("kneeSelect").addEventListener("change",render);
  $("btnKneeCsv").addEventListener("click",exportCsv);
  root.addEventListener("sahroud:connection-demand-ready",()=>{if(knees.length)refresh();});
  refresh();
 }
 function refresh(){
  try{
   const model=root.SteelStructuralModel?.model;
   if(!model)throw Error("مدل جاری موجود نیست؛ ابتدا مدل سه‌بعدی و مقاطع را تولید کنید.");
   knees=extract(model);
   const select=$("kneeSelect"),old=select.value;
   select.innerHTML=knees.map(k=>'<option value="'+esc(k.id)+'">قاب '+esc(k.frame??"؟")+' ـ '+(k.side==="left"?"چپ":"راست")+' ـ '+esc(k.node.id)+'</option>').join("");
   if(!knees.length)throw Error("گره مشترک ستون و رفتر در مدل پیدا نشد.");
   select.value=knees.some(k=>k.id===old)?old:knees[0].id;
   $("btnKneeCsv").disabled=false;render();
  }catch(e){
   knees=[];$("kneeSummary").textContent=e.message;$("kneeSectionGeometry").innerHTML="";$("kneeDrawing").innerHTML="";
   $("kneeChecks").textContent="برای جلوگیری از هندسه‌سازی حدسی، مرحله بعدی تا رفع موارد بالا متوقف است.";
   $("btnKneeCsv").disabled=true;
  }
 }
 function exportCsv(){
  if(!knees.length)return;
  const rows=[["Frame","Side","Joint","ColumnMember","ColumnProfile","ColumnGeometryStatus","ColumnTopFlangeWidth_mm","ColumnTopFlangeThickness_mm","ColumnBottomFlangeWidth_mm","ColumnBottomFlangeThickness_mm","ColumnWebClearHeight_mm","ColumnWebThickness_mm","RafterMember","RafterProfile","RafterGeometryStatus","RafterTopFlangeWidth_mm","RafterTopFlangeThickness_mm","RafterBottomFlangeWidth_mm","RafterBottomFlangeThickness_mm","RafterWebClearHeight_mm","RafterWebThickness_mm","Angle_deg"]];
  knees.forEach(k=>{
   const c=k.column.sectionGeometry,r=k.rafter.sectionGeometry,cd=c.dimensionsMm||{},rd=r.dimensionsMm||{};
   rows.push([k.frame,k.side,k.node.id,k.column.id,c.profile,c.status,...DIMENSIONS.map(x=>cd[x]??""),k.rafter.id,r.profile,r.status,...DIMENSIONS.map(x=>rd[x]??""),k.angle]);
  });
  const csv="\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url=root.URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=root.document.createElement("a");
  a.href=url;a.download="sahroud-knee-member-geometry.csv";a.click();root.URL.revokeObjectURL(url);
 }
 function selfTest(){
  const section=(dims={})=>({profile:"Plate girder",geometryType:"built-up-I",geometryDimensionsMm:{
   topFlangeWidthMm:220,topFlangeThicknessMm:12,bottomFlangeWidthMm:200,bottomFlangeThicknessMm:12,webClearHeightMm:500,webThicknessMm:8,...dims},sectionPropertyFingerprint:"fp1"});
  const model={geometry:{span:12},nodes:[{id:"E",x:0,y:6,z:0,kind:"eave"},{id:"C",x:0,y:0,z:0},{id:"R",x:6,y:7.2,z:0}],
   members:[{id:"COL",start:"C",end:"E",sectionKey:"column",sectionProperties:section()},{id:"RAF",start:"E",end:"R",sectionKey:"rafter",axis:"transverse",frame:1,sectionProperties:section({topFlangeWidthMm:180})}]};
  const k=extract(model)[0],tests=[
   !!k&&k.column.sectionGeometry.available&&k.rafter.sectionGeometry.available,
   k.column.sectionGeometry.dimensionsMm.topFlangeWidthMm===220,
   k.rafter.sectionGeometry.dimensionsMm.topFlangeWidthMm===180,
   check(k).valid,
   !check({...k,column:{...k.column,sectionGeometry:{available:false,issues:["missing"]}}}).valid,
   !sectionGeometry({sectionProperties:{geometryType:"built-up-I",geometryDimensionsMm:{}}}).available,
   !sectionGeometry({sectionProperties:{geometryType:"built-up-I",geometryDimensionsMm:{...section().geometryDimensionsMm,webThicknessMm:900}}}).available,
   !drawing(k).includes("<polygon")&&!drawing(k).includes("<circle")
  ];
  return{passed:tests.filter(Boolean).length,failed:tests.filter(x=>!x).length,total:tests.length,tests};
 }
 const api={extract,sectionGeometry,check,drawing,selfTest};
 root.SteelKneeConnectionGeometry=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
