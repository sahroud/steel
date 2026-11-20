/* SAHROUD STEEL — explicit knee connection detail input.
 * Geometry/input validation only. No resistance equations or pass/fail design.
 * All plate/bolt/weld coordinates are in the declared connection frame, mm.
 */
(function(root){
 "use strict";
 const SCHEMA="SAHROUD-KNEE-CONNECTION-DETAIL-1.3";
 const finite=v=>typeof v==="number"&&Number.isFinite(v);
 const positive=v=>finite(v)&&v>0;
 const text=v=>typeof v==="string"&&v.trim().length>0;
 const vec=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(finite);
 function fail(errors,message){errors.push(message);}
 function cross2(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
 function onSegment(a,b,p){return Math.abs(cross2(a,b,p))<1e-9&&p.x>=Math.min(a.x,b.x)-1e-9&&p.x<=Math.max(a.x,b.x)+1e-9&&p.y>=Math.min(a.y,b.y)-1e-9&&p.y<=Math.max(a.y,b.y)+1e-9;}
 function intersects(a,b,c,d){
  const o1=cross2(a,b,c),o2=cross2(a,b,d),o3=cross2(c,d,a),o4=cross2(c,d,b);
  if(o1*o2<0&&o3*o4<0)return true;
  return (Math.abs(o1)<1e-9&&onSegment(a,b,c))||(Math.abs(o2)<1e-9&&onSegment(a,b,d))||
   (Math.abs(o3)<1e-9&&onSegment(c,d,a))||(Math.abs(o4)<1e-9&&onSegment(c,d,b));
 }
 function pointInPolygon(p,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if(onSegment(a,b,p))return true;
   if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))inside=!inside;
  }
  return inside;
 }
 function triangulatePolygon(poly){
  const area=poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a.x*b.y-b.x*a.y;},0)/2;
  const order=poly.map((_,i)=>i);if(area<0)order.reverse();
  const triangles=[];let guard=0;
  const inside=(p,a,b,c)=>cross2(a,b,p)>=-1e-9&&cross2(b,c,p)>=-1e-9&&cross2(c,a,p)>=-1e-9;
  while(order.length>3&&guard++<poly.length*poly.length){
   let clipped=false;
   for(let j=0;j<order.length;j++){
    const ia=order[(j+order.length-1)%order.length],ib=order[j],ic=order[(j+1)%order.length];
    const a=poly[ia],b=poly[ib],d=poly[ic];
    if(cross2(a,b,d)<=1e-9)continue;
    if(order.some(ix=>ix!==ia&&ix!==ib&&ix!==ic&&inside(poly[ix],a,b,d)))continue;
    triangles.push([ia,ib,ic]);order.splice(j,1);clipped=true;break;
   }
   if(!clipped)throw new Error("چندضلعی ورق برای مثلث‌بندی معتبر نیست یا رأس هم‌خط/تکراری دارد.");
  }
  if(order.length===3)triangles.push(order.slice());
  return triangles;
 }
 function edgeDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
  const t=l2?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
 }
 function auditHardwareAxialIntervals(hardware){
  const parts=Array.isArray(hardware)?hardware:[];
  const pairs=[];
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
   const a=parts[i],b=parts[j];
   if(!finite(a.centerOffsetMm)||!positive(a.thicknessMm)||!finite(b.centerOffsetMm)||!positive(b.thicknessMm)){
    pairs.push({firstId:a.id||null,secondId:b.id||null,status:"NOT_ASSESSABLE",overlapMm:null});continue;
   }
   const a0=a.centerOffsetMm-a.thicknessMm/2,a1=a.centerOffsetMm+a.thicknessMm/2;
   const b0=b.centerOffsetMm-b.thicknessMm/2,b1=b.centerOffsetMm+b.thicknessMm/2;
   const overlap=Math.min(a1,b1)-Math.max(a0,b0);
   const status=overlap>1e-6?"AXIAL_INTERFERENCE":Math.abs(overlap)<=1e-6?"FACE_CONTACT":"AXIAL_CLEARANCE";
   pairs.push({firstId:a.id||null,secondId:b.id||null,status,overlapMm:Number(overlap.toFixed(9))});
  }
  return{method:"coaxial-axial-interval-screen",status:pairs.some(p=>p.status==="NOT_ASSESSABLE")?"NOT_ASSESSABLE":pairs.some(p=>p.status==="AXIAL_INTERFERENCE")?"INTERFERENCE_DETECTED":"NO_AXIAL_INTERFERENCE_DETECTED",pairs,
   limitation:"فقط هم‌پوشانی بازه‌های محوری قطعات هم‌محور یک پیچ بررسی می‌شود؛ این ممیزی جایگزین کنترل جامد سه‌بعدی عمومی، تماس با ورق یا کنترل رزوه نیست."};
 }
 function buildHolePolygon(b,semicircleSegments=16){
  const x=Number(b.xMm),y=Number(b.yMm),r=Number(b.holeDiameterMm)/2;
  if(!finite(x)||!finite(y)||!positive(r))throw new Error("ابعاد سوراخ برای تولید چندضلعی معتبر نیست.");
  if(["standard","oversized"].includes(b.holeType)){
   return Array.from({length:32},(_,i)=>({x:x+r*Math.cos(2*Math.PI*i/32),y:y+r*Math.sin(2*Math.PI*i/32)}));
  }
  if(!["short-slotted","long-slotted"].includes(b.holeType))
   throw new Error("نوع سوراخ برای تولید هندسه مشخص یا پشتیبانی‌شده نیست.");
  const length=Number(b.slotLengthMm),width=Number(b.slotWidthMm),angle=Number(b.slotAngleDeg)*Math.PI/180;
  if(!positive(length)||!positive(width)||length<width||!finite(angle))throw new Error("ابعاد شیار برای تولید هندسه معتبر نیست.");
  const straight=(length-width)/2,ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux;
  const plus={x:x+straight*ux,y:y+straight*uy},minus={x:x-straight*ux,y:y-straight*uy};
  const points=[];
  for(let i=0;i<=semicircleSegments;i++){
   const a=angle-Math.PI/2+i*Math.PI/semicircleSegments;
   points.push({x:plus.x+r*Math.cos(a),y:plus.y+r*Math.sin(a)});
  }
  for(let i=0;i<=semicircleSegments;i++){
   const a=angle+Math.PI/2+i*Math.PI/semicircleSegments;
   points.push({x:minus.x+r*Math.cos(a),y:minus.y+r*Math.sin(a)});
  }
  return points;
 }
 function polygonsOverlap(a,b){
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)
   if(intersects(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]))return true;
  return pointInPolygon(a[0],b)||pointInPolygon(b[0],a);
 }
 function polygonDistance(a,b){
  if(polygonsOverlap(a,b))return 0;
  let min=Infinity;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
   min=Math.min(min,edgeDistance(a[i],b[j],b[(j+1)%b.length]),
    edgeDistance(b[j],a[i],a[(i+1)%a.length]));
  }
  return min;
 }
 function analyzeHoleLayout(input,plateId,options={}){
  const checked=validate(input);
  if(!checked.valid)throw new Error("هندسه اتصال معتبر نیست: "+checked.errors.join(" | "));
  const plate=input.plates.find(p=>String(p.id)===String(plateId));
  if(!plate)throw new Error("ورق مورد تحلیل پیدا نشد: "+plateId);
  const direction=options.forceDirectionLocal;
  if(!direction||!finite(direction.x)||!finite(direction.y)||Math.hypot(direction.x,direction.y)<=1e-9)
   throw new Error("بردار راستای نیرو در صفحه محلی ورق باید صریح و غیرصفر باشد.");
  const tolerance=options.rowToleranceMm===undefined?1:Number(options.rowToleranceMm);
  if(!positive(tolerance))throw new Error("تلرانس دسته‌بندی ردیف پیچ باید مثبت باشد.");
  const length=Math.hypot(direction.x,direction.y),fx=direction.x/length,fy=direction.y/length;
  const tx=-fy,ty=fx,holes=input.bolts.filter(b=>String(b.plateId)===String(plateId)).map(b=>{
   const polygon=buildHolePolygon(b);
   const edgeClearance=Math.min(...polygon.flatMap((p,i)=>plate.polygonMm.map((a,j)=>edgeDistance(p,a,plate.polygonMm[(j+1)%plate.polygonMm.length]))));
   return{id:String(b.id),center:{x:b.xMm,y:b.yMm},holeType:b.holeType,polygon,
    longitudinalProjection:b.xMm*fx+b.yMm*fy,transverseProjection:b.xMm*tx+b.yMm*ty,
    edgeClearanceMm:edgeClearance};
  });
  const sorted=holes.slice().sort((a,b)=>a.transverseProjection-b.transverseProjection||a.longitudinalProjection-b.longitudinalProjection);
  const groups=[];
  for(const hole of sorted){
   let group=groups.find(g=>Math.abs(g.transverseProjection-hole.transverseProjection)<=tolerance);
   if(!group){group={transverseProjection:hole.transverseProjection,holes:[]};groups.push(group);}
   group.holes.push(hole);
  }
  const rows=groups.map((g,index)=>({rowId:"ROW-"+(index+1),
   transverseProjectionMm:g.transverseProjection,
   holes:g.holes.slice().sort((a,b)=>a.longitudinalProjection-b.longitudinalProjection).map(h=>({
    id:h.id,longitudinalProjectionMm:h.longitudinalProjection,center:h.center,
    holeType:h.holeType,edgeClearanceMm:h.edgeClearanceMm}))}));
  const clearances=[];
  for(let i=0;i<holes.length;i++)for(let j=i+1;j<holes.length;j++)
   clearances.push({holeA:holes[i].id,holeB:holes[j].id,
    clearDistanceMm:polygonDistance(holes[i].polygon,holes[j].polygon)});
  return{plateId:String(plateId),coordinateSystem:"plate-local mm",
   forceDirectionLocal:{x:fx,y:fy},transverseDirectionLocal:{x:tx,y:ty},
   rowToleranceMm:tolerance,holes:holes.map(h=>({id:h.id,center:h.center,holeType:h.holeType,
    polygon:h.polygon,edgeClearanceMm:h.edgeClearanceMm})),
   rows,holeClearances:clearances,
   status:"GEOMETRY_AUDIT_ONLY",blockShearPathsDerived:false,
   limitations:["ردیف‌بندی فقط بر اساس تصویر مختصات مرکز سوراخ‌ها روی راستای عمود بر نیرو و تلرانس اعلام‌شده انجام می‌شود.",
    "این ردیف‌ها مسیر شکست برش قالبی نیستند؛ انتخاب لبه باربر، مسیرهای برشی/کششی، طول‌های مؤثر و سطوح Agv/Anv/Ant هنوز باید با قیود هندسی و جهت انتقال نیرو استخراج و کنترل شوند."]};
 }
 function validate(input){
  const errors=[],warnings=[];
  if(!input||typeof input!=="object")return{valid:false,errors:["رکورد جزئیات اتصال ارائه نشده است."],warnings,capacityDesigned:false,executionReady:false};
  if(input.schema!==SCHEMA)fail(errors,"نسخه schema جزئیات اتصال نامعتبر یا ثبت‌نشده است.");
  if(!text(input.connectionId))fail(errors,"شناسه یکتای اتصال الزامی است.");
  if(!text(input.jointId))fail(errors,"شناسه گره تحلیلی زانویی الزامی است.");
  if(!text(input.drawingReference))fail(errors,"شماره/مرجع نقشه ساخت یا جزئیات مصوب الزامی است.");
  if(input.units!=="mm")fail(errors,"واحد هندسه باید صریحاً mm باشد.");
  const frame=input.connectionFrame;
  if(!frame||!vec(frame.originM,3)||!frame.axes||!["x","y","z"].every(k=>vec(frame.axes[k],3))||frame.verifiedByDrawing!==true)
   fail(errors,"مبدأ و سه محور دستگاه اتصال به‌همراه تأیید جهت صفحه از نقشه لازم است.");
  else{
   const [x,y,z]=[frame.axes.x,frame.axes.y,frame.axes.z];
   const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
   const norm=a=>Math.hypot(...a);
   const cr=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
   if([x,y,z].some(a=>Math.abs(norm(a)-1)>1e-6)||Math.abs(dot(x,y))>1e-6||Math.abs(dot(x,z))>1e-6||Math.abs(dot(y,z))>1e-6||cr.some((v,i)=>Math.abs(v-z[i])>1e-6))
    fail(errors,"محورهای دستگاه اتصال باید یکه، متعامد و راست‌گرد باشند.");
  }
  const members=input.memberForceTransferPoints;
  if(!Array.isArray(members)||members.length!==2)fail(errors,"برای اتصال زانویی باید دقیقاً دو نقطه انتقال نیرو، یکی برای ستون و دیگری برای رفتر، ثبت شود.");
  else{
   const ids=new Set(),roles=new Set();
   members.forEach((m,i)=>{
    if(!text(m.memberId)||ids.has(String(m.memberId)))fail(errors,"شناسه عضو در نقاط انتقال نیرو خالی یا تکراری است.");
    ids.add(String(m.memberId));
    if(!["column","rafter"].includes(m.role)||roles.has(m.role))fail(errors,"نقش نقاط انتقال نیرو باید دقیقاً شامل یک column و یک rafter باشد.");
    roles.add(m.role);
    if(!vec(m.pointMm,3))fail(errors,"نقطه انتقال نیروی عضو "+(m.memberId||i)+" باید مختصات سه‌بعدی mm داشته باشد.");
   });
   if(!roles.has("column")||!roles.has("rafter"))fail(errors,"نقاط انتقال نیروی ستون و رفتر باید هر دو ثبت شوند.");
  }
  if(!Array.isArray(input.plates)||!input.plates.length)fail(errors,"حداقل یک ورق واقعی با هندسه و مصالح صریح لازم است.");
  const plateIds=new Set();
  (input.plates||[]).forEach((p,i)=>{
   if(!text(p.id)||plateIds.has(String(p.id)))fail(errors,"شناسه ورق خالی یا تکراری است.");plateIds.add(String(p.id));
   if(!positive(p.thicknessMm))fail(errors,"ضخامت ورق "+(p.id||i)+" باید مثبت و صریح باشد.");
   if(p.thicknessReference!=="mid-plane")fail(errors,"مرجع ضخامت ورق "+(p.id||i)+" باید صریحاً mid-plane باشد؛ محل سطح مرجع حدس زده نمی‌شود.");
   if(!text(p.material?.grade)||!positive(p.material?.FyMPa)||!positive(p.material?.FuMPa)||p.material.FuMPa<p.material.FyMPa)
    fail(errors,"گرید، Fy و Fu معتبر ورق "+(p.id||i)+" الزامی است.");
   const pf=p.frame;
   if(!pf||!vec(pf.originMm,3)||!pf.axes||!["u","v","n"].every(k=>vec(pf.axes[k],3))){
    fail(errors,"مبدأ و محورهای محلی سه‌بعدی ورق "+(p.id||i)+" الزامی است.");
   }else{
    const [u,v,n]=[pf.axes.u,pf.axes.v,pf.axes.n],dot=(a,b)=>a.reduce((sum,x,j)=>sum+x*b[j],0),norm=a=>Math.hypot(...a);
    const cr=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if([u,v,n].some(a=>Math.abs(norm(a)-1)>1e-6)||Math.abs(dot(u,v))>1e-6||Math.abs(dot(u,n))>1e-6||Math.abs(dot(v,n))>1e-6||cr.some((x,j)=>Math.abs(x-n[j])>1e-6))
     fail(errors,"محورهای محلی ورق "+(p.id||i)+" باید یکه، متعامد و راست‌گرد باشند.");
   }
   const poly=p.polygonMm;
   if(!Array.isArray(poly)||poly.length<3||poly.some(v=>!v||!finite(v.x)||!finite(v.y))){
    fail(errors,"چندضلعی ورق "+(p.id||i)+" باید حداقل سه رأس دوبعدی معتبر داشته باشد.");return;
   }
   const area=poly.reduce((s,a,j)=>{const b=poly[(j+1)%poly.length];return s+a.x*b.y-b.x*a.y;},0)/2;
   if(Math.abs(area)<1e-6)fail(errors,"مساحت چندضلعی ورق "+p.id+" صفر است.");
   // Reject ambiguous vertices before ear clipping: duplicate vertices, zero-length edges,
   // and consecutive collinear points can otherwise create zero-area triangles or stalls.
   const samePoint=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<=1e-8;
   for(let a=0;a<poly.length;a++){
    const next=(a+1)%poly.length,prev=(a+poly.length-1)%poly.length;
    if(samePoint(poly[a],poly[next]))fail(errors,"دو رأس متوالی چندضلعی ورق "+p.id+" تکراری یا دارای ضلع با طول صفر هستند.");
    for(let b=a+1;b<poly.length;b++)if(samePoint(poly[a],poly[b]))
     fail(errors,"رأس تکراری در چندضلعی ورق "+p.id+" مجاز نیست.");
    const turn=Math.abs(cross2(poly[prev],poly[a],poly[next]));
    const scale=Math.max(1,edgeDistance(poly[a],poly[prev],poly[next]));
    if(turn<=1e-9*scale)fail(errors,"سه رأس متوالی چندضلعی ورق "+p.id+" هم‌خط یا تقریباً هم‌خط هستند؛ نقشه هندسی را اصلاح کنید.");
   }
   for(let a=0;a<poly.length;a++)for(let b=a+1;b<poly.length;b++){
    if(b===a+1||(a===0&&b===poly.length-1))continue;
    if(intersects(poly[a],poly[(a+1)%poly.length],poly[b],poly[(b+1)%poly.length]))fail(errors,"مرز چندضلعی ورق "+p.id+" خودمتقاطع است.");
   }
   if(Math.abs(area)>=1e-6){
    try{triangulatePolygon(poly);}
    catch(error){fail(errors,"مثلث‌بندی چندضلعی ورق "+p.id+" ناموفق است: "+error.message);}
   }
  });
  if(!Array.isArray(input.bolts)||!input.bolts.length)fail(errors,"آرایش واقعی پیچ‌ها باید به‌صورت مختصات تک‌تک پیچ‌ها ثبت شود.");
  const boltIds=new Set(),boltPoints=new Set();
  (input.bolts||[]).forEach((b,i)=>{
   if(!text(b.id)||boltIds.has(String(b.id)))fail(errors,"شناسه پیچ خالی یا تکراری است.");boltIds.add(String(b.id));
   if(!finite(b.xMm)||!finite(b.yMm)||!positive(b.diameterMm)||!positive(b.holeDiameterMm)||b.holeDiameterMm<b.diameterMm)
    fail(errors,"مختصات، قطر پیچ و قطر سوراخ پیچ "+(b.id||i)+" نامعتبر است.");
   const key=String(b.plateId)+":"+String(b.xMm)+","+String(b.yMm);if(boltPoints.has(key))fail(errors,"دو پیچ در مختصات یکسان ثبت شده‌اند.");boltPoints.add(key);
   if(!text(b.grade)||!positive(b.FuMPa))fail(errors,"گرید و Fu پیچ "+(b.id||i)+" باید صریح باشد.");
   if(!vec(b.axisConnectionFrame,3)||!positive(b.gripLengthMm)||b.axisVerifiedByDrawing!==true)
    fail(errors,"محور سه‌بعدی پیچ در دستگاه اتصال، طول واقعی بدنه/گیرایی و تأیید جهت از نقشه برای پیچ "+(b.id||i)+" الزامی است.");
   else{
    const axisLength=Math.hypot(...b.axisConnectionFrame);
    if(Math.abs(axisLength-1)>1e-6)fail(errors,"محور پیچ "+(b.id||i)+" باید بردار یکه باشد؛ جهت از نقشه وارد شود.");
   }
   if(Array.isArray(b.hardware)&&b.hardware.length){
    const axis=b.axisConnectionFrame,ref=b.transverseReferenceConnectionFrame;
    if(!vec(ref,3))fail(errors,"بردار مرجع عرضی برای جهت‌گیری سرپیچ/مهره/واشر "+(b.id||i)+" باید از نقشه وارد شود.");
    else{
     const dot=axis.reduce((s,v,j)=>s+v*ref[j],0),norm=Math.hypot(...ref);
     if(Math.abs(norm-1)>1e-6||Math.abs(dot)>1e-6)fail(errors,"بردار مرجع عرضی پیچ "+(b.id||i)+" باید یکه و عمود بر محور پیچ باشد.");
    }
    const hwIds=new Set();
    b.hardware.forEach((h,j)=>{
     if(!text(h.id)||hwIds.has(String(h.id)))fail(errors,"شناسه قطعه جانبی پیچ خالی یا تکراری است.");hwIds.add(String(h.id));
     if(!["head","nut","washer"].includes(h.kind)||!finite(h.centerOffsetMm)||!positive(h.thicknessMm))
      fail(errors,"نوع، موقعیت محوری و ضخامت قطعه جانبی "+(h.id||j)+" باید صریح باشد.");
     if(h.kind==="washer"&&(!positive(h.outerDiameterMm)||!positive(h.innerDiameterMm)||h.outerDiameterMm<=h.innerDiameterMm||h.innerDiameterMm<b.diameterMm))
      fail(errors,"قطر داخلی/خارجی واشر "+(h.id||j)+" باید معتبر و با قطر بدنه پیچ سازگار باشد.");
     if(h.kind!=="washer"&&(!positive(h.acrossFlatsMm)||h.acrossFlatsMm<=b.diameterMm))
      fail(errors,"عرض آچارخور سرپیچ/مهره "+(h.id||j)+" باید صریح و بزرگ‌تر از قطر پیچ باشد.");
    });
    const hardwareAudit=auditHardwareAxialIntervals(b.hardware);
    hardwareAudit.pairs.filter(pair=>pair.status==="AXIAL_INTERFERENCE").forEach(pair=>
     fail(errors,"تداخل محوری قطعات جانبی پیچ "+(b.id||i)+" بین "+pair.firstId+" و "+pair.secondId+"؛ هم‌پوشانی مثبت "+pair.overlapMm+" mm است.")
    );
   }
   if(!text(b.plateId)||!plateIds.has(String(b.plateId)))fail(errors,"شناسه ورق میزبان پیچ "+(b.id||i)+" باید صریح و معتبر باشد.");
   if(!["standard","oversized","short-slotted","long-slotted"].includes(b.holeType))fail(errors,"نوع سوراخ پیچ "+(b.id||i)+" باید از گزینه‌های تعریف‌شده انتخاب شود.");
   if(["short-slotted","long-slotted"].includes(b.holeType)&&(!positive(b.slotLengthMm)||!positive(b.slotWidthMm)||!finite(b.slotAngleDeg)||b.slotLengthMm<b.slotWidthMm||Math.abs(b.slotWidthMm-b.holeDiameterMm)>1e-6))
    fail(errors,"طول، عرض و زاویه شیار پیچ "+(b.id||i)+" باید صریح باشد و عرض شیار با قطر سوراخ تطابق داشته باشد.");
   if(!["short-slotted","long-slotted"].includes(b.holeType)&&[b.slotLengthMm,b.slotWidthMm,b.slotAngleDeg].some(v=>v!==undefined&&v!==null))
    fail(errors,"ابعاد شیار فقط برای سوراخ‌های شیاردار قابل ثبت است.");
   if(typeof b.threadsInShearPlane!=="boolean"||!Number.isInteger(b.shearPlaneCount)||b.shearPlaneCount<1)
    fail(errors,"وضعیت رزوه در صفحه برش و تعداد صفحات برش پیچ "+(b.id||i)+" الزامی است.");
   if(Array.isArray(input.plates)&&input.plates.length&&finite(b.xMm)&&finite(b.yMm)&&positive(b.holeDiameterMm)){
    const p=input.plates.find(q=>String(q.id)===String(b.plateId));
    if(!p||!Array.isArray(p.polygonMm)||p.polygonMm.length<3||!pointInPolygon({x:b.xMm,y:b.yMm},p.polygonMm))
     fail(errors,"مرکز سوراخ پیچ "+(b.id||i)+" داخل ورق میزبان تعیین‌شده نیست.");
    else{
     const poly=p.polygonMm,clear=Math.min(...poly.map((a,j)=>edgeDistance({x:b.xMm,y:b.yMm},a,poly[(j+1)%poly.length])));
     if(clear+1e-8<b.holeDiameterMm/2)fail(errors,"سوراخ پیچ "+(b.id||i)+" از مرز ورق عبور می‌کند.");
    }
    }
  });
  // Validate the complete hole boundary, not only its centre. This is still
  // geometry validation; no net-section or block-shear resistance is inferred.
  const holeRecords=[];
  (input.bolts||[]).forEach((b,i)=>{
   if(!finite(b.xMm)||!finite(b.yMm)||!positive(b.holeDiameterMm)||!text(b.plateId))return;
   const plate=(input.plates||[]).find(p=>String(p.id)===String(b.plateId));
   if(!plate||!Array.isArray(plate.polygonMm)||plate.polygonMm.length<3)return;
   let hole;
   try{hole=buildHolePolygon(b);}catch(error){return;}
   const poly=plate.polygonMm;
   const outside=hole.some((p,j)=>{
    const q=hole[(j+1)%hole.length],mid={x:(p.x+q.x)/2,y:(p.y+q.y)/2};
    if(!pointInPolygon(p,poly)||!pointInPolygon(mid,poly))return true;
    return poly.some((a,k)=>intersects(p,q,a,poly[(k+1)%poly.length]));
   });
   if(outside)fail(errors,"تمام محیط سوراخ پیچ "+(b.id||i)+"، شامل انتهای شیار، باید داخل ورق میزبان باقی بماند.");
   holeRecords.push({id:String(b.id),plateId:String(b.plateId),polygon:hole});
  });
  for(let i=0;i<holeRecords.length;i++)for(let j=i+1;j<holeRecords.length;j++){
   const a=holeRecords[i],b=holeRecords[j];
   if(a.plateId===b.plateId&&polygonsOverlap(a.polygon,b.polygon))
    fail(errors,"محیط سوراخ‌های "+a.id+" و "+b.id+" در ورق "+a.plateId+" با یکدیگر تداخل دارد.");
  }
  if(!Array.isArray(input.welds)||!input.welds.length)fail(errors,"خطوط جوش واقعی باید با ابتدا و انتهای هر قطعه تعریف شوند.");
  const weldIds=new Set();
  (input.welds||[]).forEach((w,i)=>{
   if(!text(w.id)||weldIds.has(String(w.id)))fail(errors,"شناسه خط جوش خالی یا تکراری است.");weldIds.add(String(w.id));
   if(!vec(w.startMm,3)||!vec(w.endMm,3)||Math.hypot(...w.startMm.map((v,j)=>v-w.endMm[j]))<=1e-8)
    fail(errors,"ابتدا و انتهای خط جوش "+(w.id||i)+" باید دو نقطه سه‌بعدی متفاوت باشند.");
   if(!text(w.plateId)||!plateIds.has(String(w.plateId)))fail(errors,"شناسه ورق متصل به خط جوش "+(w.id||i)+" باید صریح و معتبر باشد.");
   else{
    const plate=input.plates.find(p=>String(p.id)===String(w.plateId));
    const frame=plate.frame,poly=plate.polygonMm;
    if(frame&&vec(frame.originMm,3)&&frame.axes&&["u","v","n"].every(k=>vec(frame.axes[k],3))&&Array.isArray(poly)&&poly.length>=3){
     const dot=(a,b)=>a.reduce((sum,v,j)=>sum+v*b[j],0);
     const localEndpoints=[w.startMm,w.endMm].map((point,endIndex)=>{
      if(!vec(point,3))return null;
      const delta=point.map((v,j)=>v-frame.originMm[j]);
      const local={x:dot(delta,frame.axes.u),y:dot(delta,frame.axes.v)};
      const offset=dot(delta,frame.axes.n);
      if(Math.abs(offset)>0.1)fail(errors,"انتهای "+(endIndex?"دوم":"اول")+" خط جوش "+(w.id||i)+" روی صفحه ورق "+plate.id+" قرار ندارد.");
      if(!pointInPolygon(local,poly))fail(errors,"انتهای "+(endIndex?"دوم":"اول")+" خط جوش "+(w.id||i)+" خارج از محدوده چندضلعی ورق "+plate.id+" است.");
      return local;
     });
     if(localEndpoints.every(Boolean)){
      const [a,b]=localEndpoints;
      for(let edge=0;edge<poly.length;edge++){
       const c=poly[edge],d=poly[(edge+1)%poly.length];
       if(!intersects(a,b,c,d))continue;
       // Boundary contact is permitted only at a weld endpoint.
       if(!onSegment(c,d,a)&&!onSegment(c,d,b)){
        fail(errors,"مسیر کامل خط جوش "+(w.id||i)+" از مرز چندضلعی ورق "+plate.id+" عبور می‌کند یا با آن تماس میانی دارد.");
        break;
       }
      }
      const samples=[0.25,0.5,0.75].map(t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}));
      if(samples.some(point=>!pointInPolygon(point,poly)))
       fail(errors,"تمام طول خط جوش "+(w.id||i)+" باید داخل محدوده ورق "+plate.id+" باقی بماند.");
     }
    }
   }
   if(!text(w.faceReference))fail(errors,"سطح/وجه اتصال خط جوش "+(w.id||i)+" باید با ارجاع نقشه مشخص شود.");
   if(!positive(w.electrodeFexxMPa)||!["fillet","groove"].includes(w.type))
    fail(errors,"نوع جوش و FEXX خط جوش "+(w.id||i)+" باید صریح و معتبر باشد.");
   if(w.type==="fillet"&&!positive(w.legSizeMm))fail(errors,"اندازه ساق جوش گوشه "+(w.id||i)+" باید مثبت باشد.");
   if(w.type==="groove"&&(!["CJP","PJP"].includes(w.grooveType)||!positive(w.effectiveThroatMm)))
    fail(errors,"نوع شیار CJP/PJP و گلویی مؤثر جوش شیاری "+(w.id||i)+" باید صریح باشد.");
   if(w.type==="fillet"&&(w.effectiveThroatMm!==undefined&&w.effectiveThroatMm!==null||w.grooveType!==undefined&&w.grooveType!==null))
    fail(errors,"پارامترهای جوش شیاری نباید برای جوش گوشه ثبت شوند.");
  });
  if(!text(input.fabricationStatus))warnings.push("وضعیت ساخت/بازرسی اتصال ثبت نشده است؛ این داده برای تأیید اجرایی جداگانه لازم خواهد بود.");
  return{valid:errors.length===0,errors,warnings,schema:SCHEMA,connectionId:input.connectionId||null,
   jointId:input.jointId||null,plateCount:input.plates?.length||0,boltCount:input.bolts?.length||0,weldCount:input.welds?.length||0,
   capacityDesigned:false,executionReady:false,geometryOnly:true};
 }
 function buildGlobalGeometry(input){
  const checked=validate(input);
  if(!checked.valid)throw new Error("هندسه اتصال معتبر نیست: "+checked.errors.join(" | "));
  const cf=input.connectionFrame,origin=cf.originM.map(Number),axes=cf.axes;
  const toGlobal=(connectionMm)=>{
   const p=connectionMm.map(v=>Number(v)/1000);
   return [0,1,2].map(i=>origin[i]+axes.x[i]*p[0]+axes.y[i]*p[1]+axes.z[i]*p[2]);
  };
  const plates=input.plates.map(plate=>{
   const frame=plate.frame,u=frame.axes.u,v=frame.axes.v,n=frame.axes.n,o=frame.originMm;
   const localToConnection=(x,y)=>[0,1,2].map(i=>o[i]+u[i]*x+v[i]*y);
   const normalGlobal=[0,1,2].map(i=>axes.x[i]*n[0]+axes.y[i]*n[1]+axes.z[i]*n[2]);
   const half=Number(plate.thicknessMm)/2000;
   const triangles=triangulatePolygon(plate.polygonMm);
   const vertices=plate.polygonMm.map(point=>{
    const center=localToConnection(point.x,point.y);
    const minus=center.map((v,i)=>v-n[i]*half*1000);
    const plus=center.map((v,i)=>v+n[i]*half*1000);
    return{localMm:{x:point.x,y:point.y},minusFaceGlobalM:toGlobal(minus),plusFaceGlobalM:toGlobal(plus)};
   });
   const sideFaces=vertices.map((vertex,i)=>({edgeIndex:i,
    verticesGlobalM:[vertex.minusFaceGlobalM,vertices[(i+1)%vertices.length].minusFaceGlobalM,
     vertices[(i+1)%vertices.length].plusFaceGlobalM,vertex.plusFaceGlobalM]}));
   return{id:String(plate.id),thicknessMm:plate.thicknessMm,thicknessReference:"mid-plane",material:plate.material,
    referencePlaneOriginGlobalM:toGlobal(o),normalGlobal,
    polygon:plate.polygonMm.map(point=>({localMm:{x:point.x,y:point.y},
     connectionFrameMm:localToConnection(point.x,point.y),
     globalM:toGlobal(localToConnection(point.x,point.y))})),
    solid:{minusFaceGlobalM:vertices.map(v=>v.minusFaceGlobalM),plusFaceGlobalM:vertices.map(v=>v.plusFaceGlobalM),sideFaces,
     triangulation:{method:"ear-clipping",top:triangles.map(t=>t.map(i=>vertices[i].plusFaceGlobalM)),
      bottom:triangles.map(t=>t.slice().reverse().map(i=>vertices[i].minusFaceGlobalM))}},
    bolts:input.bolts.filter(b=>String(b.plateId)===String(plate.id)).map(b=>{
     const point=localToConnection(b.xMm,b.yMm);
     const axis=b.axisConnectionFrame.map(Number);
     const halfLength=Number(b.gripLengthMm)/2;
     const start=point.map((v,i)=>v-axis[i]*halfLength);
     const end=point.map((v,i)=>v+axis[i]*halfLength);
     const axisGlobal=axis.map((_,i)=>axes.x[i]*axis[0]+axes.y[i]*axis[1]+axes.z[i]*axis[2]);
     return{id:String(b.id),centerLocalMm:{x:b.xMm,y:b.yMm},centerGlobalM:toGlobal(point),
      axisConnectionFrame:axis,axisGlobal,gripLengthMm:b.gripLengthMm,
      shank:{startGlobalM:toGlobal(start),endGlobalM:toGlobal(end),radiusMm:b.diameterMm/2},
      diameterMm:b.diameterMm,holeDiameterMm:b.holeDiameterMm,holeType:b.holeType,
      holeGeometry:{method:["short-slotted","long-slotted"].includes(b.holeType)?"capsule-polygon-approximation":"32-segment-circle-approximation",
       slotLengthMm:b.slotLengthMm||null,slotWidthMm:b.slotWidthMm||null,slotAngleDeg:b.slotAngleDeg??null,
       verticesLocalMm:buildHolePolygon(b),verticesGlobalM:buildHolePolygon(b).map(p=>toGlobal(localToConnection(p.x,p.y)))},
      hardwareAxialAudit:auditHardwareAxialIntervals(b.hardware||[]),
      hardware:(b.hardware||[]).map(h=>{
       const axis=b.axisConnectionFrame.map(Number),ref=b.transverseReferenceConnectionFrame.map(Number);
       const second=[axis[1]*ref[2]-axis[2]*ref[1],axis[2]*ref[0]-axis[0]*ref[2],axis[0]*ref[1]-axis[1]*ref[0]];
       const center=point.map((v,i)=>v+axis[i]*h.centerOffsetMm);
       const half=Number(h.thicknessMm)/2;
       const ring=h.kind==="washer",count=ring?32:6;
       const radius=ring?Number(h.outerDiameterMm)/2:Number(h.acrossFlatsMm)/Math.sqrt(3);
       const inner=ring?Number(h.innerDiameterMm)/2:0;
       const perimeter=Array.from({length:count},(_,k)=>{
        const angle=2*Math.PI*k/count;
        return [0,1,2].map(i=>center[i]+radius*Math.cos(angle)*ref[i]+radius*Math.sin(angle)*second[i]);
       });
       const innerPerimeter=ring?Array.from({length:count},(_,k)=>{
        const angle=2*Math.PI*k/count;
        return [0,1,2].map(i=>center[i]+inner*Math.cos(angle)*ref[i]+inner*Math.sin(angle)*second[i]);
       }):null;
       const face=(sign)=>perimeter.map((p,k)=>toGlobal(p.map((v,i)=>v+axis[i]*half*sign)));
       return{id:String(h.id),kind:h.kind,centerOffsetMm:h.centerOffsetMm,thicknessMm:h.thicknessMm,
        acrossFlatsMm:h.acrossFlatsMm||null,outerDiameterMm:h.outerDiameterMm||null,innerDiameterMm:h.innerDiameterMm||null,
        geometry:{method:ring?"32-segment-annulus":"regular-hex-prism",topFaceGlobalM:face(1),bottomFaceGlobalM:face(-1),
         innerTopFaceGlobalM:ring?innerPerimeter.map(p=>toGlobal(p.map((v,i)=>v+axis[i]*half))):null,
         innerBottomFaceGlobalM:ring?innerPerimeter.map(p=>toGlobal(p.map((v,i)=>v-axis[i]*half))):null}};
      })};
    })};
  });
  const welds=input.welds.map(w=>({id:String(w.id),plateId:String(w.plateId),faceReference:w.faceReference,
   type:w.type,startGlobalM:toGlobal(w.startMm),endGlobalM:toGlobal(w.endMm)}));
  return{success:true,schema:"SAHROUD-KNEE-CONNECTION-GLOBAL-GEOMETRY-1.0",
   connectionId:String(input.connectionId),jointId:String(input.jointId),
   coordinateSystems:{platePolygonAndBolt:"plate-local mm",plateFrame:"connection-frame mm",
    weldEndpoints:"connection-frame mm",output:"global m"},
   plates,welds,capacityDesigned:false,executionReady:false,
   limitations:["سطوح دوطرفه و وجوه جانبی ورق با فرض صریح مرجع ضخامت mid-plane ساخته شده‌اند؛ تماس بین ورق‌های مختلف هنوز کنترل نشده است.",
    "هندسه بدنه پیچ فقط به‌صورت محور و استوانه اسمی با طول صریح نقشه ساخته می‌شود؛ سرپیچ شش‌گوش و مهره شش‌گوش فقط با عرض آچارخور، ضخامت و موقعیت محوری صریح مدل می‌شوند؛ واشر به‌صورت حلقه ۳۲ضلعی تقریبی و با قطر داخلی/خارجی و ضخامت نقشه ساخته می‌شود. رزوه، پیش‌تنیدگی، سطح تماس، نفوذ جوش و توزیع نیرو میان اجزا هنوز مدل نشده‌اند."]};
 }
 const api={SCHEMA,validate,pointInPolygon,edgeDistance,buildHolePolygon,polygonsOverlap,polygonDistance,analyzeHoleLayout,auditHardwareAxialIntervals,buildGlobalGeometry};
 root.SahroudKneeConnectionDetail=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
