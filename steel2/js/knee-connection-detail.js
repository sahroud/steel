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
 function clipConvex(subject,clip){
  let out=subject.slice();const signed=clip.reduce((s,p,i)=>{const q=clip[(i+1)%clip.length];return s+p.x*q.y-q.x*p.y;},0),orient=signed>=0?1:-1;
  for(let i=0;i<clip.length&&out.length;i++){const a=clip[i],b=clip[(i+1)%clip.length],inside=p=>orient*cross2(a,b,p)>=-1e-8,input=out;out=[];
   for(let j=0;j<input.length;j++){const p=input[j],q=input[(j+1)%input.length],ip=inside(p),iq=inside(q);
    if(ip&&iq)out.push(q);else if(ip!==iq){const dx=q.x-p.x,dy=q.y-p.y,ex=b.x-a.x,ey=b.y-a.y,den=dx*ey-dy*ex;
     if(Math.abs(den)>1e-12){const t=((a.x-p.x)*ey-(a.y-p.y)*ex)/den;out.push({x:p.x+t*dx,y:p.y+t*dy});}if(!ip&&iq)out.push(q);}
   }
  }return out;
 }
 function polygonIntersectionArea(a,b){
  let area=0;const ta=triangulatePolygon(a).map(t=>t.map(i=>a[i])),tb=triangulatePolygon(b).map(t=>t.map(i=>b[i]));
  for(const x of ta)for(const y of tb){const p=clipConvex(x,y);if(p.length>=3)area+=Math.abs(p.reduce((s,v,i)=>{const q=p[(i+1)%p.length];return s+v.x*q.y-q.x*v.y;},0))/2;}return area;
 }
 function auditPlateInteractions(plates,tolerance=1e-6){
  const pairs=[],items=Array.isArray(plates)?plates:[],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=items[i],b=items[j],fa=a.frame,fb=b.frame,base={firstPlateId:a.id,secondPlateId:b.id};
   if(!fa?.axes||!fb?.axes||!Array.isArray(fa.originMm)||!Array.isArray(fb.originMm)||!positive(a.thicknessMm)||!positive(b.thicknessMm)||!Array.isArray(a.polygonMm)||!Array.isArray(b.polygonMm)){pairs.push({...base,status:"NOT_ASSESSABLE",reason:"داده چارچوب، ضخامت یا چندضلعی ورق ناقص است."});continue;}
   const u=fa.axes.u,v=fa.axes.v,n=fa.axes.n,m=fb.axes.n,alignment=dot(n,m);
   if(Math.abs(Math.abs(alignment)-1)>1e-6){pairs.push({...base,status:"NOT_ASSESSABLE",reason:"صفحات غیرموازی‌اند؛ این غربالگر فقط صفحات موازی/پادموازی را پوشش می‌دهد.",normalAlignment:alignment});continue;}
   const separation=dot(sub(fb.originMm,fa.originMm),n),thicknessOverlap=(Number(a.thicknessMm)+Number(b.thicknessMm))/2-Math.abs(separation);
   const projected=b.polygonMm.map(p=>{const point=fb.originMm.map((x,k)=>x+fb.axes.u[k]*p.x+fb.axes.v[k]*p.y),d=sub(point,fa.originMm);return{x:dot(d,u),y:dot(d,v)};});
   let area;try{area=polygonIntersectionArea(a.polygonMm,projected);}catch(error){pairs.push({...base,status:"NOT_ASSESSABLE",reason:"محاسبه هم‌پوشانی چندضلعی ناموفق است: "+error.message});continue;}
   let status,reason;if(area<=tolerance){status="NO_PROJECTED_OVERLAP";reason="سطوح تصویرشده هم‌پوشانی مساحتی ندارند.";}
   else if(thicknessOverlap>tolerance){status="VOLUME_INTERFERENCE";reason="هم‌پوشانی مساحتی و ضخامت مثبت؛ تداخل حجمی در صفحات موازی.";}
   else if(Math.abs(thicknessOverlap)<=tolerance){status="FACE_CONTACT";reason="سطوح تصویرشده هم‌پوشانی دارند اما بازه ضخامت‌ها فقط تماس دارند.";}
   else{status="THICKNESS_CLEARANCE";reason="بین بازه ضخامت‌ها فاصله وجود دارد.";}
   pairs.push({...base,status,reason,normalAlignment:alignment,planeSeparationMm:Number(separation.toFixed(9)),thicknessOverlapMm:Number(thicknessOverlap.toFixed(9)),projectedOverlapAreaMm2:Number(area.toFixed(6)),method:"parallel-plate-prism-intersection-screen"});
  }
  return{status:pairs.some(p=>p.status==="VOLUME_INTERFERENCE")?"INTERFERENCE_DETECTED":pairs.some(p=>p.status==="NOT_ASSESSABLE")?"PARTIALLY_ASSESSABLE":"NO_VOLUME_INTERFERENCE_DETECTED",pairs,
   limitations:["فقط صفحات موازی یا پادموازی بررسی می‌شوند؛ صفحات غیرموازی NOT_ASSESSABLE هستند.","این کنترل فقط ورق با ورق را پوشش می‌دهد، نه پیچ، واشر، مهره، جوش یا اعضای نامنظم.","تلرانس ساخت، تغییرشکل و تماس چندجسمی عمومی مدل نشده‌اند."]};
 }
 function auditHardwarePlateInteractions(input,tolerance=1e-6){
  const pairs=[],plates=Array.isArray(input?.plates)?input.plates:[],bolts=Array.isArray(input?.bolts)?input.bolts:[];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  for(const bolt of bolts){
   const plate=plates.find(p=>String(p.id)===String(bolt.plateId));
   if(!plate||!plate.frame?.axes||!Array.isArray(bolt.hardware))continue;
   const n=plate.frame.axes.n,axis=bolt.axisConnectionFrame;
   for(const h of bolt.hardware){
    const base={boltId:String(bolt.id),hardwareId:String(h.id),kind:h.kind,plateId:String(plate.id)};
    if(!vec(axis,3)||Math.abs(Math.abs(dot(axis,n))-1)>1e-6){
     pairs.push({...base,status:"NOT_ASSESSABLE",reason:"محور قطعه جانبی با نرمال ورق میزبان موازی نیست؛ هندسه عمومی مایل در این ممیزی پوشش داده نمی‌شود."});continue;
    }
    const holeRadius=Number(bolt.holeDiameterMm)/2;
    let radialStatus="NOT_ASSESSABLE",radialEvidence={};
    if(h.kind==="washer"&&positive(h.outerDiameterMm)&&positive(h.innerDiameterMm)){
     const inner=Number(h.innerDiameterMm)/2,outer=Number(h.outerDiameterMm)/2;
     radialEvidence={holeRadiusMm:holeRadius,hardwareInnerRadiusMm:inner,hardwareOuterRadiusMm:outer};
     radialStatus= Math.min(outer,Infinity)-Math.max(inner,holeRadius)>tolerance?"RADIAL_OVERLAP":"NO_RADIAL_OVERLAP";
    }else if((h.kind==="head"||h.kind==="nut")&&positive(h.acrossFlatsMm)){
     const apothem=Number(h.acrossFlatsMm)/2,circumradius=Number(h.acrossFlatsMm)/Math.sqrt(3);
     radialEvidence={holeRadiusMm:holeRadius,hexApothemMm:apothem,hexCircumradiusMm:circumradius};
     radialStatus=apothem>=holeRadius-tolerance?"RADIAL_OVERLAP":circumradius<=holeRadius+tolerance?"NO_RADIAL_OVERLAP":"RADIAL_OVERLAP_AMBIGUOUS";
    }
    const center=Number(h.centerOffsetMm),half=Number(h.thicknessMm)/2,plateHalf=Number(plate.thicknessMm)/2;
    if(!finite(center)||!positive(h.thicknessMm)||!positive(plate.thicknessMm)||!positive(bolt.holeDiameterMm)||radialStatus==="NOT_ASSESSABLE"||radialStatus==="RADIAL_OVERLAP_AMBIGUOUS"){
     pairs.push({...base,status:"NOT_ASSESSABLE",reason:"ابعاد یا نسبت شعاعی برای تصمیم قطعی کافی نیست.",radialStatus,...radialEvidence});continue;
    }
    const overlap=Math.min(center+half,plateHalf)-Math.max(center-half,-plateHalf);
    let status,reason;
    if(radialStatus==="NO_RADIAL_OVERLAP"){status="NO_SOLID_OVERLAP";reason="تصویر شعاعی قطعه در محدوده سوراخ باقی می‌ماند و با ماده ورق هم‌پوشانی ندارد.";}
    else if(overlap>tolerance){status="VOLUME_INTERFERENCE";reason="هم‌پوشانی شعاعی قطعه با ماده ورق و هم‌پوشانی مثبت بازه ضخامت‌ها تشخیص داده شد.";}
    else if(Math.abs(overlap)<=tolerance){status="FACE_CONTACT";reason="هم‌پوشانی شعاعی با ماده ورق وجود دارد و بازه‌های ضخامت فقط در سطح تماس دارند.";}
    else{status="AXIAL_CLEARANCE";reason="قطعه در راستای محور از ضخامت ورق فاصله دارد.";}
    pairs.push({...base,status,reason,radialStatus,...radialEvidence,axialOverlapMm:Number(overlap.toFixed(9)),
     method:"coaxial-hardware-to-host-plate-screen"});
   }
  }
  return{status:pairs.some(p=>p.status==="VOLUME_INTERFERENCE")?"INTERFERENCE_DETECTED":pairs.some(p=>p.status==="NOT_ASSESSABLE")?"PARTIALLY_ASSESSABLE":"NO_VOLUME_INTERFERENCE_DETECTED",pairs,
   limitations:["فقط قطعات هم‌محور با نرمال ورق میزبان بررسی می‌شوند؛ محورهای مایل یا قطعات نسبت به ورق‌های غیرمیزبان NOT_ASSESSABLE هستند.",
    "واشر به‌صورت حلقه هم‌مرکز و سرپیچ/مهره با حدود شعاعی محافظه‌کارانه بررسی می‌شوند؛ وضعیت شش‌گوش در ناحیه مبهم NOT_ASSESSABLE است.",
    "این غربالگر جایگزین مدل جامد سه‌بعدی عمومی، تماس رزوه، تغییرشکل، تلرانس ساخت یا کنترل چندجسمی نیست."]};
 }
 function auditHardwareOtherPlateInteractions(input,tolerance=1e-6){
  const pairs=[],plates=Array.isArray(input?.plates)?input.plates:[],bolts=Array.isArray(input?.bolts)?input.bolts:[];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  for(const bolt of bolts){
   if(!Array.isArray(bolt.hardware)||!bolt.hardware.length)continue;
   const host=plates.find(p=>String(p.id)===String(bolt.plateId));
   if(!host?.frame?.axes||!vec(bolt.axisConnectionFrame,3)||!vec(bolt.transverseReferenceConnectionFrame,3))continue;
   const axis=bolt.axisConnectionFrame.map(Number),ref=bolt.transverseReferenceConnectionFrame.map(Number),side=cross(axis,ref);
   const boltCenter=host.frame.originMm.map((v,i)=>v+host.frame.axes.u[i]*bolt.xMm+host.frame.axes.v[i]*bolt.yMm);
   for(const h of bolt.hardware)for(const plate of plates){
    if(String(plate.id)===String(host.id))continue;
    const base={boltId:String(bolt.id),hardwareId:String(h.id),kind:h.kind,hostPlateId:String(host.id),otherPlateId:String(plate.id)};
    const frame=plate.frame,axes=frame?.axes;
    if(!axes||!vec(frame.originMm,3)||!vec(axes.u,3)||!vec(axes.v,3)||!vec(axes.n,3)||!positive(plate.thicknessMm)){
     pairs.push({...base,status:"NOT_ASSESSABLE",reason:"چارچوب یا ضخامت ورق غیرمیزبان ناقص است."});continue;
    }
    const alignment=dot(axis,axes.n);
    if(Math.abs(Math.abs(alignment)-1)>1e-6){
     pairs.push({...base,status:"NOT_ASSESSABLE",reason:"محور قطعه و نرمال ورق غیرمیزبان موازی نیستند؛ برخورد مایل در این غربالگر پوشش داده نمی‌شود.",normalAlignment:alignment});continue;
    }
    if(!positive(h.thicknessMm)||!finite(h.centerOffsetMm)||!positive(h.acrossFlatsMm)&&h.kind!=="washer"||h.kind==="washer"&&(!positive(h.outerDiameterMm)||!positive(h.innerDiameterMm))){
     pairs.push({...base,status:"NOT_ASSESSABLE",reason:"ابعاد قطعه جانبی برای ساخت footprint معتبر کافی نیست."});continue;
    }
    const center=boltCenter.map((v,i)=>v+axis[i]*Number(h.centerOffsetMm));
    const signed=dot(sub(center,frame.originMm),axes.n),half=Number(h.thicknessMm)/2,plateHalf=Number(plate.thicknessMm)/2;
    const axialOverlap=Math.min(signed+half,plateHalf)-Math.max(signed-half,-plateHalf);
    const count=h.kind==="washer"?48:6,outer=h.kind==="washer"?Number(h.outerDiameterMm)/2:Number(h.acrossFlatsMm)/Math.sqrt(3);
    const inner=h.kind==="washer"?Number(h.innerDiameterMm)/2:0;
    const toLocal=(radius,k)=>{const a=2*Math.PI*k/count,p=center.map((v,i)=>v+radius*Math.cos(a)*ref[i]+radius*Math.sin(a)*side[i]),delta=sub(p,frame.originMm);return{x:dot(delta,axes.u),y:dot(delta,axes.v)};};
    const outerPoly=Array.from({length:count},(_,k)=>toLocal(outer,k));
    const innerPoly=h.kind==="washer"?Array.from({length:count},(_,k)=>toLocal(inner,k)):null;
    let overlapArea;
    try{
     overlapArea=polygonIntersectionArea(outerPoly,plate.polygonMm);
     if(innerPoly)overlapArea-=polygonIntersectionArea(innerPoly,plate.polygonMm);
     const holes=bolts.filter(b=>String(b.plateId)===String(plate.id)).map(b=>buildHolePolygon(b));
     for(const hole of holes){
      let cut=polygonIntersectionArea(outerPoly,hole);
      if(innerPoly)cut-=polygonIntersectionArea(innerPoly,hole);
      overlapArea-=Math.max(0,cut);
     }
    }catch(error){pairs.push({...base,status:"NOT_ASSESSABLE",reason:"محاسبه هم‌پوشانی footprint با ورق ناموفق بود: "+error.message});continue;}
    overlapArea=Math.max(0,overlapArea);
    let status,reason;
    if(overlapArea<=tolerance){status="NO_PROJECTED_OVERLAP";reason="اثر footprint قطعه با ماده ورق غیرمیزبان هم‌پوشانی مساحتی ندارد.";}
    else if(axialOverlap>tolerance){status="VOLUME_INTERFERENCE";reason="هم‌پوشانی footprint با ماده ورق غیرمیزبان و هم‌پوشانی مثبت ضخامت‌ها تشخیص داده شد.";}
    else if(Math.abs(axialOverlap)<=tolerance){status="FACE_CONTACT";reason="footprint با ماده ورق هم‌پوشانی دارد و بازه ضخامت‌ها فقط تماس دارند.";}
    else{status="AXIAL_CLEARANCE";reason="قطعه در راستای نرمال ورق غیرمیزبان فاصله دارد.";}
    pairs.push({...base,status,reason,normalAlignment:alignment,planeOffsetMm:Number(signed.toFixed(9)),axialOverlapMm:Number(axialOverlap.toFixed(9)),projectedMaterialOverlapAreaMm2:Number(overlapArea.toFixed(6)),method:"coaxial-hardware-to-nonhost-plate-prism-screen"});
   }
  }
  return{status:pairs.some(p=>p.status==="VOLUME_INTERFERENCE")?"INTERFERENCE_DETECTED":pairs.some(p=>p.status==="NOT_ASSESSABLE")?"PARTIALLY_ASSESSABLE":"NO_VOLUME_INTERFERENCE_DETECTED",pairs,
   limitations:["فقط ورق‌های غیرمیزبان با نرمال موازی/پادموازی محور قطعه بررسی می‌شوند؛ هندسه مایل NOT_ASSESSABLE است.",
    "footprint شش‌گوش با شش رأس و واشر با حلقه ۴۸ضلعی تقریب زده می‌شود؛ رزوه، تغییرشکل و تلرانس ساخت مدل نشده‌اند.",
    "سوراخ‌های ورق غیرمیزبان از سطح ماده کسر می‌شوند؛ تماس چندجسمی عمومی یا تداخل با اعضای نامنظم بررسی نمی‌شود."]};
 }
 function convexHull2D(points){
  const p=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y);
  if(p.length<3)throw new Error("برای پوش محدب حداقل سه نقطه لازم است.");
  const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),lower=[],upper=[];
  for(const q of p){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],q)<=1e-9)lower.pop();lower.push(q);}
  for(let i=p.length-1;i>=0;i--){const q=p[i];while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],q)<=1e-9)upper.pop();upper.push(q);}
  lower.pop();upper.pop();const hull=lower.concat(upper);
  if(hull.length<3)throw new Error("پوش محدب تصویرشده مساحت ندارد.");
  return hull;
 }
 function auditWeldPlateInteractions(input){
  const pairs=[],solids=[],plates=Array.isArray(input?.plates)?input.plates:[],welds=Array.isArray(input?.welds)?input.welds:[];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>Math.hypot(...a),scale=(a,k)=>a.map(v=>v*k),add=(a,b)=>a.map((v,i)=>v+b[i]);
  for(const w of welds){
   const base={weldId:String(w.id),plateId:String(w.plateId),type:w.type};
   const plate=plates.find(p=>String(p.id)===String(w.plateId));
   if(w.type!=="fillet"||!plate?.frame?.axes||!positive(w.legSizeMm)||![1,-1].includes(w.plateFaceSide)||
    !vec(w.plateLegDirectionConnection,3)||!vec(w.connectedLegDirectionConnection,3)){
    pairs.push({...base,status:"NOT_ASSESSABLE",reason:"برای ساخت حجم جوش گوشه، نوع جوش، ساق، سمت وجه و دو راستای واحد leg در دستگاه اتصال باید صریح باشند؛ جوش شیاری به مدل آماده‌سازی شیار نیاز دارد."});continue;
   }
   const axis=w.endMm.map((v,i)=>v-w.startMm[i]),L=norm(axis),t=scale(axis,1/L);
   const a=w.plateLegDirectionConnection.map(Number),b=w.connectedLegDirectionConnection.map(Number),n=plate.frame.axes.n.map(Number);
   if(Math.abs(norm(a)-1)>1e-6||Math.abs(norm(b)-1)>1e-6||Math.abs(dot(t,a))>1e-6||Math.abs(dot(t,b))>1e-6||
    Math.abs(dot(a,b))>1e-6||Math.abs(dot(a,n))>1e-6||dot(b,n)*w.plateFaceSide<=0.5){
    pairs.push({...base,status:"NOT_ASSESSABLE",reason:"دو راستای ساق باید واحد، عمود بر خط جوش و بر یکدیگر باشند؛ ساق روی ورق مماس و ساق قطعه متصل‌شونده رو به بیرون وجه انتخابی باشد."});continue;
   }
   const frame=plate.frame,origin=frame.originMm.map(Number),u=frame.axes.u.map(Number),v=frame.axes.v.map(Number);
   const toGlobal=p=>{const q=p.map(x=>x/1000),cf=input.connectionFrame;return[0,1,2].map(i=>cf.originM[i]+cf.axes.x[i]*q[0]+cf.axes.y[i]*q[1]+cf.axes.z[i]*q[2]);};
   const roots=[w.startMm,w.endMm].map(p=>add(p,scale(n,w.plateFaceSide*plate.thicknessMm/2)));
   const vertices=roots.flatMap(root=>[root,add(root,scale(a,w.legSizeMm)),add(root,scale(b,w.legSizeMm))]);
   const toPlateLocal=p=>{const delta=p.map((x,i)=>x-origin[i]);return{x:dot(delta,u),y:dot(delta,v)};};
   const hostFaceSide=roots.every(p=>Math.abs(dot(p.map((x,i)=>x-origin[i]),n)-w.plateFaceSide*plate.thicknessMm/2)<=1e-6);
   const rootInside=roots.every(p=>pointInPolygon(toPlateLocal(p),plate.polygonMm));
   const legAOutward=vertices.every((p,i)=>i%3!==1||Math.abs(dot(p.map((x,j)=>x-origin[j]),n)-w.plateFaceSide*plate.thicknessMm/2)<=1e-6);
   if(!hostFaceSide||!rootInside||!legAOutward){
    pairs.push({...base,status:"NOT_ASSESSABLE",reason:"ریشه جوش یا ساق روی ورق با وجه/پلی‌گون میزبان منطبق نیست؛ حجم جوش صادر نشد."});continue;
   }
   const globalVertices=vertices.map(toGlobal);
   const triangles=[[0,1,2],[3,5,4],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]];
   const solid={weldId:String(w.id),plateId:String(w.plateId),geometryType:"triangular-fillet-prism",
    legSizeMm:w.legSizeMm,rootFaceSide:w.plateFaceSide,verticesConnectionMm:vertices,verticesGlobalM:globalVertices,
    faces:triangles.map(face=>face.map(i=>globalVertices[i])),volumeMm3:L*w.legSizeMm*w.legSizeMm/2,
    hostPlateContact:{status:"ROOT_FACE_CONTACT_ONLY",rootPointsGlobalM:roots.map(toGlobal)},
    assumptions:["مقطع جوش گوشه مثلث قائم‌الزاویه با دو ساق مساوی legSizeMm مدل شده است.",
     "پروفیل جوش در طول مستقیم خط جوش ثابت فرض شده است؛ شروع/پایان، crater، تحدب/تقعر، نفوذ و گرده واقعی مدل نشده‌اند."]};
   solids.push(solid);
   const otherPlatePairs=[];
   for(const target of plates){
    if(String(target.id)===String(plate.id))continue;
    const otherBase={weldId:String(w.id),hostPlateId:String(plate.id),otherPlateId:String(target.id)};
    const tf=target.frame;
    if(!tf?.axes||!vec(tf.originMm,3)||!vec(tf.axes.u,3)||!vec(tf.axes.v,3)||!vec(tf.axes.n,3)||
      !positive(target.thicknessMm)||!Array.isArray(target.polygonMm)||target.polygonMm.length<3){
     otherPlatePairs.push({...otherBase,status:"NOT_ASSESSABLE",reason:"چارچوب، ضخامت یا چندضلعی ورق غیرمیزبان ناقص است."});continue;
    }
    const n2=tf.axes.n.map(Number),o2=tf.originMm.map(Number),u2=tf.axes.u.map(Number),v2=tf.axes.v.map(Number);
    const local=vertices.map(p=>{const delta=p.map((x,i)=>x-o2[i]);return{x:dot(delta,u2),y:dot(delta,v2),depth:dot(delta,n2)};});
    const hull=convexHull2D(local.map(p=>({x:p.x,y:p.y})));
    let area;
    try{area=polygonIntersectionArea(hull,target.polygonMm);}catch(error){
     otherPlatePairs.push({...otherBase,status:"NOT_ASSESSABLE",reason:"تقاطع تصویر محدب جوش با ورق محاسبه نشد: "+error.message});continue;
    }
    const minDepth=Math.min(...local.map(p=>p.depth)),maxDepth=Math.max(...local.map(p=>p.depth)),half=Number(target.thicknessMm)/2;
    const depthOverlap=Math.min(maxDepth,half)-Math.max(minDepth,-half);
    let status,reason;
    if(area<=1e-6){status="NO_PROJECTED_OVERLAP";reason="پوش محدب تصویرشده حجم جوش با چندضلعی ورق هم‌پوشانی ندارد.";}
    else if(depthOverlap<=1e-6){status="NO_THICKNESS_OVERLAP";reason="تصویر جوش هم‌پوشانی دارد، اما بازه عمقی جوش و ضخامت ورق جدا یا مماس است.";}
    else{status="POTENTIAL_INTERFERENCE";reason="پوش محدب تصویرشده و بازه عمقی هم‌پوشانی دارند؛ این غربالگر فقط برخورد محتمل را نشان می‌دهد و تداخل واقعی جامد را اثبات نمی‌کند.";}
    otherPlatePairs.push({...otherBase,status,reason,projectedConvexHullOverlapAreaMm2:Number(area.toFixed(6)),
     weldDepthRangeMm:[Number(minDepth.toFixed(6)),Number(maxDepth.toFixed(6))],plateDepthRangeMm:[-half,half],
     depthOverlapMm:Number(depthOverlap.toFixed(6)),method:"weld-convex-projection-and-depth-broadphase"});
   }
   pairs.push({...base,status:"GEOMETRY_BUILT_HOST_FACE_CONTACT_ONLY",
    reason:"منشور مثلثی ساخته شد؛ تماس ریشه با وجه میزبان کنترل شده و ورق‌های غیرمیزبان با غربالگر پوش محدب/عمق بررسی شدند.",
    volumeMm3:solid.volumeMm3,legSizeMm:solid.legSizeMm,plateFaceSide:solid.plateFaceSide,otherPlatePairs});
  }
  const otherPairs=pairs.flatMap(p=>p.otherPlatePairs||[]);
  return{status:solids.length===0?"NOT_ASSESSABLE":pairs.some(p=>p.status!=="GEOMETRY_BUILT_HOST_FACE_CONTACT_ONLY")||otherPairs.some(p=>p.status==="NOT_ASSESSABLE")?"PARTIALLY_ASSESSABLE":
   otherPairs.some(p=>p.status==="POTENTIAL_INTERFERENCE")?"POTENTIAL_INTERFERENCE_DETECTED":"GEOMETRY_BUILT_HOST_CONTACT_ONLY",
   pairs,solids,otherPlatePairs:otherPairs,
   limitations:["مدل منشور مثلثی فقط برای جوش گوشه با جهت‌گیری صریح دو ساق است؛ جوش شیاری NOT_ASSESSABLE باقی می‌ماند.",
    "برخورد با ورق غیرمیزبان فقط با پوش محدب تصویرشده و بازه عمقی غربال می‌شود؛ POTENTIAL_INTERFERENCE اثبات تداخل واقعی نیست و ممکن است مثبت کاذب داشته باشد.",
    "تقاطع دقیق سطح مثلثی منشور با مرز ورق، اعضای متصل‌شونده، پیچ‌ها و سایر جوش‌ها هنوز مدل نشده‌اند.",
    "تماس ریشه با وجه میزبان کنترل می‌شود؛ کیفیت جوش، نفوذ، گلویی مؤثر، مقاومت و تأیید آیین‌نامه‌ای از این هندسه نتیجه نمی‌شود."]};
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
  const plateInteractionAudit=auditPlateInteractions(input.plates);
  const hardwarePlateInteractionAudit=auditHardwarePlateInteractions(input);
  const weldPlateInteractionAudit=auditWeldPlateInteractions(input);
  const hardwareOtherPlateInteractionAudit=auditHardwareOtherPlateInteractions(input);
   const welds=input.welds.map(w=>({id:String(w.id),plateId:String(w.plateId),faceReference:w.faceReference,
   type:w.type,startGlobalM:toGlobal(w.startMm),endGlobalM:toGlobal(w.endMm),solidGeometry:weldPlateInteractionAudit.solids.find(s=>s.weldId===String(w.id))||null}));
  return{success:true,schema:"SAHROUD-KNEE-CONNECTION-GLOBAL-GEOMETRY-1.0",
   connectionId:String(input.connectionId),jointId:String(input.jointId),
   coordinateSystems:{platePolygonAndBolt:"plate-local mm",plateFrame:"connection-frame mm",
    weldEndpoints:"connection-frame mm",output:"global m"},
   plates,plateInteractionAudit,hardwarePlateInteractionAudit,hardwareOtherPlateInteractionAudit,weldPlateInteractionAudit,welds,capacityDesigned:false,executionReady:false,
   limitations:["سطوح دوطرفه و وجوه جانبی ورق با فرض صریح مرجع ضخامت mid-plane ساخته شده‌اند؛ ممیزی ورق‌به‌ورق فقط برای صفحات موازی/پادموازی در plateInteractionAudit ارائه می‌شود و زوج‌های غیرموازی NOT_ASSESSABLE هستند.",
    "هندسه بدنه پیچ فقط به‌صورت محور و استوانه اسمی با طول صریح نقشه ساخته می‌شود؛ سرپیچ شش‌گوش و مهره شش‌گوش فقط با عرض آچارخور، ضخامت و موقعیت محوری صریح مدل می‌شوند؛ واشر به‌صورت حلقه ۳۲ضلعی تقریبی و با قطر داخلی/خارجی و ضخامت نقشه ساخته می‌شود. رزوه، پیش‌تنیدگی، سطح تماس، نفوذ جوش و توزیع نیرو میان اجزا هنوز مدل نشده‌اند."]};
 }
 const api={SCHEMA,validate,pointInPolygon,edgeDistance,buildHolePolygon,polygonsOverlap,polygonDistance,analyzeHoleLayout,auditHardwareAxialIntervals,auditPlateInteractions,auditHardwarePlateInteractions,auditHardwareOtherPlateInteractions,auditWeldPlateInteractions,buildGlobalGeometry};
 root.SahroudKneeConnectionDetail=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
