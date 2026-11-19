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
 function solverAxes(member,analysisResult){
  const direct=analysisResult?.members||[];
  const envelopeCases=analysisResult?.envelope?.cases||[];
  const caseMembers=envelopeCases.flatMap(item=>item?.members||[]);
  const combinationMembers=(analysisResult?.combinationResults||[]).flatMap(item=>item?.memberDemand?.members||item?.analysis?.memberDemand?.members||[]);
  const candidates=[...caseMembers,...combinationMembers,...direct];
  const matches=candidates.filter(item=>String(item.id)===String(member.id));
  if(envelopeCases.length){
   const rows=envelopeCases.map(item=>(item?.members||[]).find(row=>String(row.id)===String(member.id)));
   if(rows.some(row=>!row?.localAxes))return{available:false,status:"solver-axes-incomplete-combinations",axes:null,source:"analysisResult.envelope.cases",issues:["محورهای حل‌گر این عضو در همه ترکیبات بار موجود نیست؛ اکسترود هندسه متوقف شد."]};
  }
  const solved=matches.find(item=>item.localAxes)||matches[0];
  const axes=solved?.localAxes;
  if(!axes)return{available:false,status:"solver-axes-missing",axes:null,source:null,issues:["محورهای محلی حل‌گر برای این عضو در نتیجه تحلیل موجود نیست."]};
  const names=["x","y","z"],vectors=[];
  for(const name of names){
   const v=axes[name];
   if(!Array.isArray(v)||v.length!==3||v.some(x=>!finite(x)))
    return{available:false,status:"solver-axes-invalid",axes:null,source:"analysisResult.members.localAxes",issues:["بردار محور "+name+" در نتیجه حل‌گر نامعتبر است."]};
   vectors.push(v.map(Number));
  }
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=v=>Math.hypot(...v);
  const valid=vectors.every(v=>Math.abs(norm(v)-1)<=1e-6)&&
   Math.abs(dot(vectors[0],vectors[1]))<=1e-6&&Math.abs(dot(vectors[0],vectors[2]))<=1e-6&&
   Math.abs(dot(vectors[1],vectors[2]))<=1e-6&&
   cross(vectors[0],vectors[1]).every((v,i)=>Math.abs(v-vectors[2][i])<=1e-6);
  if(!valid)return{available:false,status:"solver-axes-invalid",axes:null,source:"analysisResult.members.localAxes",issues:["محورهای حل‌گر یکه، متعامد و راست‌گرد نیستند."]};
  const sameAxes=(a,b)=>["x","y","z"].every(key=>a?.[key]?.every((v,i)=>Math.abs(Number(v)-Number(b?.[key]?.[i]))<=1e-7));
  if(matches.some(item=>item.localAxes&&!sameAxes(axes,item.localAxes))||matches.some(item=>item.sectionRollDeg!==undefined&&item.sectionRollDeg!==null&&solved.sectionRollDeg!==undefined&&Math.abs(Number(item.sectionRollDeg)-Number(solved.sectionRollDeg))>1e-8))return{available:false,status:"solver-axes-inconsistent",axes:null,source:"analysisResult",issues:["دستگاه محور یا زاویه چرخش عضو بین ترکیبات بار یکسان نیست؛ هندسه اکسترود نمی‌شود."]};
  const source=envelopeCases.length?"analysisResult.envelope.cases[].members.localAxes":combinationMembers.length?"analysisResult.combinationResults[].memberDemand.members.localAxes":"analysisResult.members.localAxes";
  return{available:true,status:"solver-axes-valid",axes:{x:vectors[0],y:vectors[1],z:vectors[2]},sectionRollDeg:solved?.sectionRollDeg??null,source,issues:[]};
 }
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
 function extrudeBuiltUpI(member,axesRecord,model){
  const g=sectionGeometry(member),axes=axesRecord?.axes;
  const roll=member?.sectionRollDeg??member?.sectionProperties?.sectionRollDeg;
  const confirmed=member?.sectionOrientationVerified===true||member?.sectionProperties?.sectionOrientationConfirmed===true;
  if(!g.available)return{available:false,status:"section-geometry-unavailable",issues:g.issues,solids:[]};
  if(!Number.isFinite(Number(roll)))return{available:false,status:"section-roll-missing",issues:["زاویه چرخش مقطع به‌صورت صریح ثبت نشده است؛ حتی صفر نیز باید توسط کاربر ثبت شود."],solids:[]};
  if(!confirmed)return{available:false,status:"section-orientation-unconfirmed",issues:["کاربر جهت نصب جان و بال را با نقشه ساخت/نصب تأیید نکرده است."],solids:[]};
  if(!axesRecord?.available||!axes)return{available:false,status:"solver-axes-missing",issues:["محورهای واقعی حل‌گر برای اکسترود هندسه موجود نیست."],solids:[]};
  const solvedRoll=axesRecord.sectionRollDeg;
  if(solvedRoll!==null&&solvedRoll!==undefined&&Math.abs(Number(solvedRoll)-Number(roll))>1e-8)
   return{available:false,status:"solver-roll-mismatch",issues:["زاویه ثبت‌شده مقطع با زاویه به‌کاررفته در نتیجه تحلیل یکسان نیست؛ تحلیل مجدد لازم است."],solids:[]};
  const start=node(model,member.start),end=node(model,member.end);
  if(!start||!end)return{available:false,status:"member-endpoints-missing",issues:["گره‌های ابتدا و انتهای عضو برای اکسترود هندسه موجود نیستند."],solids:[]};
  const d=g.dimensionsMm,bt=d.topFlangeWidthMm,tt=d.topFlangeThicknessMm,bb=d.bottomFlangeWidthMm,tb=d.bottomFlangeThicknessMm,hw=d.webClearHeightMm,tw=d.webThicknessMm;
  const areaB=bb*tb,areaW=tw*hw,areaT=bt*tt,depth=tb+hw+tt;
  const cy=(areaB*(tb/2)+areaW*(tb+hw/2)+areaT*(tb+hw+tt/2))/(areaB+areaW+areaT);
  const rects=[
   {id:"bottom-flange",y0:-cy,y1:-cy+tb,z0:-bb/2,z1:bb/2},
   {id:"web",y0:-cy+tb,y1:-cy+tb+hw,z0:-tw/2,z1:tw/2},
   {id:"top-flange",y0:-cy+tb+hw,y1:depth-cy,z0:-bt/2,z1:bt/2}
  ];
  const L=Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z);
  const toGlobal=(x,y,z)=>[0,1,2].map(i=>
   [start.x,start.y,start.z][i]+axes.x[i]*x+axes.y[i]*y/1000+axes.z[i]*z/1000);
  const solids=rects.map(rect=>{
   const local=[[rect.y0,rect.z0],[rect.y0,rect.z1],[rect.y1,rect.z1],[rect.y1,rect.z0]];
   const vertices=local.map(([y,z])=>toGlobal(0,y,z)).concat(local.map(([y,z])=>toGlobal(L,y,z)));
   return{id:rect.id,vertices,faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]};
  });
  return{available:true,status:"extruded-built-up-I",units:"m",sectionRollDeg:Number(roll),orientationConfirmed:true,
   centroidYFromBottomMm:cy,totalDepthMm:depth,solids,memberCenterlineAssumedCentroidal:true,
   eccentricityIncluded:false,source:"member.sectionProperties.geometryDimensionsMm + solver localAxes + member endpoint coordinates",
   note:"سه جزء واقعی تیرورق (بال پایین، جان، بال بالا) بر اساس ابعاد ثبت‌شده و محورهای چرخیده حل‌گر اکسترود شده‌اند. محور عضو در مرکز هندسی مقطع فرض شده و خروج از مرکزیت اتصال/صفحه ورق هنوز مدل نشده است."};
 }
 function deriveKneeWebPlane(knee){
  const col=knee?.column,raf=knee?.rafter;
  if(!col?.solverAxes?.available||!raf?.solverAxes?.available)
   return{available:false,status:"solver-axes-missing",commonPlaneVerified:false,platePlaneVerified:false,issues:["محورهای محلی هر دو عضو برای بررسی هم‌صفحه بودن جان‌ها لازم است."]};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),norm=v=>Math.hypot(...v);
  const frameRaw=cross([col.vector.x,col.vector.y,col.vector.z],[raf.vector.x,raf.vector.y,raf.vector.z]);
  const frameLength=norm(frameRaw);
  if(!(frameLength>1e-8))return{available:false,status:"degenerate-knee-frame",commonPlaneVerified:false,platePlaneVerified:false,issues:["صفحه قاب از امتداد ستون و رفتر قابل استخراج نیست."]};
  const frameNormal=frameRaw.map(v=>v/frameLength),columnNormal=col.solverAxes.axes.z,rafterNormal=raf.solverAxes.axes.z;
  const columnAlignment=Math.abs(dot(frameNormal,columnNormal)),rafterAlignment=Math.abs(dot(frameNormal,rafterNormal));
  const commonPlaneVerified=columnAlignment>=1-1e-6&&rafterAlignment>=1-1e-6;
  const faceAtJoint=(member,solid,nodeId)=>{
   if(!solid)return null;
   if(String(member.start)===String(nodeId))return solid.vertices.slice(0,4);
   if(String(member.end)===String(nodeId))return solid.vertices.slice(4,8);
   return null;
  };
  const columnWeb=col.sectionSolids?.solids?.find(s=>s.id==="web"),rafterWeb=raf.sectionSolids?.solids?.find(s=>s.id==="web");
  const columnWebFace=faceAtJoint(col,columnWeb,knee.node.id),rafterWebFace=faceAtJoint(raf,rafterWeb,knee.node.id);
  return{available:true,status:commonPlaneVerified?"common-member-web-plane-verified":"member-web-planes-not-coplanar",
   commonPlaneVerified,platePlaneVerified:false,framePlaneNormal:frameNormal,
   columnWebNormal:columnNormal,rafterWebNormal:rafterNormal,columnAlignment,rafterAlignment,
   columnWebThicknessMm:col.sectionGeometry.dimensionsMm?.webThicknessMm??null,
   rafterWebThicknessMm:raf.sectionGeometry.dimensionsMm?.webThicknessMm??null,
   columnWebFaceAtJoint:columnWebFace,rafterWebFaceAtJoint:rafterWebFace,
   issues:commonPlaneVerified?[]:["جان ستون و رفتر در یک صفحه مشترک با صفحه قاب قرار ندارند؛ اتصال ورقی مشترک از این هندسه قابل استنتاج نیست."],
   note:"هم‌صفحه بودن جان اعضا کنترل شده است؛ این نتیجه صفحه واقعی ورق اتصال، فاصله نصب، خروج از مرکزیت یا ظرفیت اتصال را تأیید نمی‌کند."};
 }
 function extract(model,analysisResult){
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
     column:{id:col.id,start:col.start,end:col.end,length:Math.hypot(cn.x-n.x,cn.y-n.y,cn.z-n.z),vector:vc,sectionGeometry:sectionGeometry(col),solverAxes:solverAxes(col,analysisResult)},
     rafter:{id:raf.id,start:raf.start,end:raf.end,length:Math.hypot(rn.x-n.x,rn.y-n.y,rn.z-n.z),vector:vr,sectionGeometry:sectionGeometry(raf),solverAxes:solverAxes(raf,analysisResult)},
     angle:Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI});
    const item=out[out.length-1];
    item.column.sectionSolids=extrudeBuiltUpI(col,item.column.solverAxes,model);
    item.rafter.sectionSolids=extrudeBuiltUpI(raf,item.rafter.solverAxes,model);
    item.webPlane=deriveKneeWebPlane(item);
   }));
  });
  return out.sort((a,b)=>(Number(a.frame)||0)-(Number(b.frame)||0)||a.side.localeCompare(b.side));
 }
 function check(k){
  const errors=[],warnings=[
   "محورهای محلی X/Y/Z از نتیجه حل‌گر خوانده می‌شوند؛ این محورها به‌تنهایی جهت چرخش/نصب مقطع I یا جان و بال را اثبات نمی‌کنند.",
   "ابعاد مقطع فقط از رکورد sectionProperties عضو خوانده شده‌اند؛ مقطع واقعی، جهت نصب و چرخش مقطع هنوز باید با نقشه/مدرک ساخت تطبیق داده شوند.",
   "صفحه واقعی اتصال، ورق زانویی، ورق مضاعف، پیچ‌ها، سوراخ‌ها، جوش‌ها و خروج از مرکزیت در مدل تعریف نشده‌اند.",
   "این ممیزی ظرفیت، قبولی آیین‌نامه‌ای یا آمادگی اجرا را بررسی نمی‌کند."
  ];
  if(!k)errors.push("گره زانویی انتخاب نشده است.");
  else{
   if(!k.column?.sectionGeometry?.available)errors.push("هندسه واقعی/پارامتریک مقطع ستون قابل تأیید نیست: "+(k.column?.sectionGeometry?.issues||[]).join("؛ "));
   if(!k.rafter?.sectionGeometry?.available)errors.push("هندسه واقعی/پارامتریک مقطع رفتر قابل تأیید نیست: "+(k.rafter?.sectionGeometry?.issues||[]).join("؛ "));
   if(!positive(k.column?.length)||!positive(k.rafter?.length))errors.push("طول هندسی عضو مجاور گره معتبر نیست.");
   ["column","rafter"].forEach(key=>{if(!k[key]?.sectionSolids?.available)errors.push("اکسترود هندسه واقعی "+(key==="column"?"ستون":"رفتر")+" ممکن نیست: "+(k[key]?.sectionSolids?.issues||[]).join("؛ "));});
   if(!k.webPlane?.commonPlaneVerified)errors.push("صفحه مشترک جان ستون و رفتر تأیید نشده است: "+(k.webPlane?.issues||[]).join("؛ "));
   ["column","rafter"].forEach(key=>{if(k[key]?.solverAxes?.status==="solver-axes-invalid")errors.push("محورهای محلی حل‌گر برای عضو "+k[key].id+" نامعتبر است.");});
  }
  return{valid:errors.length===0,errors,warnings,geometryOnly:true,platePlaneVerified:false,capacityDesigned:false,executionReady:false};
 }
 function axesText(record){
  if(!record?.available)return '<p class="notice">محورهای حل‌گر موجود نیست: '+esc((record?.issues||["ابتدا تحلیل سه‌بعدی را اجرا کنید."]).join("؛ "))+'</p>';
  const fmt=v=>v.map(x=>Number(x).toFixed(5)).join("، ");
  return '<div class="geometry-hint">X = ['+fmt(record.axes.x)+']<br>Y = ['+fmt(record.axes.y)+']<br>Z = ['+fmt(record.axes.z)+
   ']<br>منبع: '+esc(record.source)+'؛ این دستگاه مختصات تحلیلی است و جهت نصب مقطع را تعیین نمی‌کند.</div>';
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
   '<p class="geometry-hint">هندسه سه‌بعدی: '+esc(k.column.sectionSolids?.status||"ناموجود")+'؛ اجزای اکسترودشده: '+esc(k.column.sectionSolids?.solids?.length||0)+'</p>'+
   '<h4>محورهای حل‌گر ستون</h4>'+axesText(k.column.solverAxes)+
   '<h4>هندسه ثبت‌شده مقطع رفتر</h4>'+dimensionsText(k.rafter.sectionGeometry)+
   '<p class="geometry-hint">هندسه سه‌بعدی: '+esc(k.rafter.sectionSolids?.status||"ناموجود")+'؛ اجزای اکسترودشده: '+esc(k.rafter.sectionSolids?.solids?.length||0)+'</p>'+
   '<h4>محورهای حل‌گر رفتر</h4>'+axesText(k.rafter.solverAxes)+
   '<h4>هم‌صفحه بودن جان ستون و رفتر</h4><p class="geometry-hint">'+esc(k.webPlane?.status||"ناموجود")+'؛ هم‌راستایی ستون: '+esc(k.webPlane?.columnAlignment??"—")+'؛ رفتر: '+esc(k.webPlane?.rafterAlignment??"—")+'؛ صفحه ورق اتصال همچنان تأییدنشده است.</p>';
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
    '<div class="button-grid"><button id="btnKneeExtract" class="btn primary" type="button">بازیابی هندسه از مدل جاری</button><button id="btnKneeCsv" class="btn secondary" type="button" disabled>خروجی CSV هندسه مقاطع</button><button id="btnKneeGeometryJson" class="btn secondary" type="button" disabled>خروجی JSON هندسه سه‌بعدی</button></div>'+
    '<div id="kneeSummary" class="notice">مدل سه‌بعدی و مقاطع اعضا را ابتدا تولید کنید.</div><div id="kneeSectionGeometry"></div>'+
    '<h4>نمای محورهای اعضای متصل</h4><div id="kneeDrawing" class="drawing-area"></div><div id="kneeChecks" class="notice"></div>';
   const anchor=$("connectionDemandReviewPanel");
   if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else root.document.querySelector("main")?.appendChild(p);
  }
  $("btnKneeExtract").addEventListener("click",refresh);
  $("kneeSelect").addEventListener("change",render);
  $("btnKneeCsv").addEventListener("click",exportCsv);
  root.addEventListener("sahroud:connection-demand-ready",()=>{if(knees.length)refresh();});
  root.addEventListener("sahroud:3d-analysis-ready",()=>{if(knees.length)refresh();});
  refresh();
 }
 function refresh(){
  try{
   const model=root.SteelStructuralModel?.model;
   if(!model)throw Error("مدل جاری موجود نیست؛ ابتدا مدل سه‌بعدی و مقاطع را تولید کنید.");
   knees=extract(model,root.SteelStructuralModel?.last3DResult||null);
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
  const rows=[["Frame","Side","Joint","ColumnMember","ColumnProfile","ColumnGeometryStatus","ColumnRoll_deg","ColumnOrientationConfirmed","ColumnTopFlangeWidth_mm","ColumnTopFlangeThickness_mm","ColumnBottomFlangeWidth_mm","ColumnBottomFlangeThickness_mm","ColumnWebClearHeight_mm","ColumnWebThickness_mm","RafterMember","RafterProfile","RafterGeometryStatus","RafterRoll_deg","RafterOrientationConfirmed","RafterTopFlangeWidth_mm","RafterTopFlangeThickness_mm","RafterBottomFlangeWidth_mm","RafterBottomFlangeThickness_mm","RafterWebClearHeight_mm","RafterWebThickness_mm","CommonWebPlaneVerified","ColumnWebAlignment","RafterWebAlignment","Angle_deg"]];
  knees.forEach(k=>{
   const c=k.column.sectionGeometry,r=k.rafter.sectionGeometry,cd=c.dimensionsMm||{},rd=r.dimensionsMm||{};
   rows.push([k.frame,k.side,k.node.id,k.column.id,c.profile,c.status,k.column.sectionSolids?.sectionRollDeg??"",k.column.sectionSolids?.orientationConfirmed??false,...DIMENSIONS.map(x=>cd[x]??""),k.rafter.id,r.profile,r.status,k.rafter.sectionSolids?.sectionRollDeg??"",k.rafter.sectionSolids?.orientationConfirmed??false,...DIMENSIONS.map(x=>rd[x]??""),k.webPlane?.commonPlaneVerified??false,k.webPlane?.columnAlignment??"",k.webPlane?.rafterAlignment??"",k.angle]);
  });
  const csv="\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url=root.URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=root.document.createElement("a");
  a.href=url;a.download="sahroud-knee-member-geometry.csv";a.click();root.URL.revokeObjectURL(url);
 }
 function exportGeometryJson(){
 if(!knees.length)return;
 const payload={schema:"SAHROUD-KNEE-MEMBER-GEOMETRY-1.0",units:"m",generatedAt:new Date().toISOString(),
  note:"Only verified built-up-I member solids are included. No connection plate, bolts, welds, holes or eccentricities are invented.",
  items:knees.map(k=>({frame:k.frame,side:k.side,joint:{id:k.node.id,x:k.node.x,y:k.node.y,z:k.node.z},
   column:{id:k.column.id,sectionGeometry:k.column.sectionGeometry,sectionSolids:k.column.sectionSolids},
   rafter:{id:k.rafter.id,sectionGeometry:k.rafter.sectionGeometry,sectionSolids:k.rafter.sectionSolids},
   webPlane:k.webPlane,connectionPlateIncluded:false,capacityDesigned:false,executionReady:false}))};
 const json=JSON.stringify(payload,null,2),url=root.URL.createObjectURL(new Blob([json],{type:"application/json"})),a=root.document.createElement("a");
 a.href=url;a.download="sahroud-knee-member-geometry.json";a.click();root.URL.revokeObjectURL(url);
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
   !check(k).capacityDesigned&&!check(k).executionReady,
   !check({...k,column:{...k.column,sectionGeometry:{available:false,issues:["missing"]}}}).valid,
   !sectionGeometry({sectionProperties:{geometryType:"built-up-I",geometryDimensionsMm:{}}}).available,
   !sectionGeometry({sectionProperties:{geometryType:"built-up-I",geometryDimensionsMm:{...section().geometryDimensionsMm,webThicknessMm:900}}}).available,
   !drawing(k).includes("<polygon")&&!drawing(k).includes("<circle")
  ];
  return{passed:tests.filter(Boolean).length,failed:tests.filter(x=>!x).length,total:tests.length,tests};
 }
 const api={extract,sectionGeometry,solverAxes,extrudeBuiltUpI,deriveKneeWebPlane,check,drawing,selfTest};
 root.SteelKneeConnectionGeometry=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
