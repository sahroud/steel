/* SAHROUD STEEL — explicit knee connection detail input.
 * Geometry/input validation only. No resistance equations or pass/fail design.
 * All plate/bolt/weld coordinates are in the declared connection frame, mm.
 */
(function(root){
 "use strict";
 const SCHEMA="SAHROUD-KNEE-CONNECTION-DETAIL-1.0";
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
 function edgeDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
  const t=l2?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
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
  if(!Array.isArray(members)||members.length<2)fail(errors,"نقاط انتقال نیروی ستون و رفتر باید جداگانه و صریح ثبت شوند.");
  else{
   const ids=new Set();
   members.forEach((m,i)=>{
    if(!text(m.memberId)||ids.has(String(m.memberId)))fail(errors,"شناسه عضو در نقاط انتقال نیرو خالی یا تکراری است.");
    ids.add(String(m.memberId));
    if(!vec(m.pointMm,3))fail(errors,"نقطه انتقال نیروی عضو "+(m.memberId||i)+" باید مختصات سه‌بعدی mm داشته باشد.");
   });
  }
  if(!Array.isArray(input.plates)||!input.plates.length)fail(errors,"حداقل یک ورق واقعی با هندسه و مصالح صریح لازم است.");
  const plateIds=new Set();
  (input.plates||[]).forEach((p,i)=>{
   if(!text(p.id)||plateIds.has(String(p.id)))fail(errors,"شناسه ورق خالی یا تکراری است.");plateIds.add(String(p.id));
   if(!positive(p.thicknessMm))fail(errors,"ضخامت ورق "+(p.id||i)+" باید مثبت و صریح باشد.");
   if(!text(p.material?.grade)||!positive(p.material?.FyMPa)||!positive(p.material?.FuMPa)||p.material.FuMPa<p.material.FyMPa)
    fail(errors,"گرید، Fy و Fu معتبر ورق "+(p.id||i)+" الزامی است.");
   const poly=p.polygonMm;
   if(!Array.isArray(poly)||poly.length<3||poly.some(v=>!v||!finite(v.x)||!finite(v.y))){
    fail(errors,"چندضلعی ورق "+(p.id||i)+" باید حداقل سه رأس دوبعدی معتبر داشته باشد.");return;
   }
   const area=poly.reduce((s,a,j)=>{const b=poly[(j+1)%poly.length];return s+a.x*b.y-b.x*a.y;},0)/2;
   if(Math.abs(area)<1e-6)fail(errors,"مساحت چندضلعی ورق "+p.id+" صفر است.");
   for(let a=0;a<poly.length;a++)for(let b=a+1;b<poly.length;b++){
    if(b===a+1||(a===0&&b===poly.length-1))continue;
    if(intersects(poly[a],poly[(a+1)%poly.length],poly[b],poly[(b+1)%poly.length]))fail(errors,"مرز چندضلعی ورق "+p.id+" خودمتقاطع است.");
   }
  });
  if(!Array.isArray(input.bolts)||!input.bolts.length)fail(errors,"آرایش واقعی پیچ‌ها باید به‌صورت مختصات تک‌تک پیچ‌ها ثبت شود.");
  const boltIds=new Set(),boltPoints=new Set();
  (input.bolts||[]).forEach((b,i)=>{
   if(!text(b.id)||boltIds.has(String(b.id)))fail(errors,"شناسه پیچ خالی یا تکراری است.");boltIds.add(String(b.id));
   if(!finite(b.xMm)||!finite(b.yMm)||!positive(b.diameterMm)||!positive(b.holeDiameterMm)||b.holeDiameterMm<b.diameterMm)
    fail(errors,"مختصات، قطر پیچ و قطر سوراخ پیچ "+(b.id||i)+" نامعتبر است.");
   const key=String(b.xMm)+","+String(b.yMm);if(boltPoints.has(key))fail(errors,"دو پیچ در مختصات یکسان ثبت شده‌اند.");boltPoints.add(key);
   if(!text(b.grade)||!positive(b.FuMPa))fail(errors,"گرید و Fu پیچ "+(b.id||i)+" باید صریح باشد.");
   if(!["standard","oversized","short-slotted","long-slotted"].includes(b.holeType))fail(errors,"نوع سوراخ پیچ "+(b.id||i)+" باید از گزینه‌های تعریف‌شده انتخاب شود.");
   if(typeof b.threadsInShearPlane!=="boolean"||!Number.isInteger(b.shearPlaneCount)||b.shearPlaneCount<1)
    fail(errors,"وضعیت رزوه در صفحه برش و تعداد صفحات برش پیچ "+(b.id||i)+" الزامی است.");
   if(Array.isArray(input.plates)&&input.plates.length&&finite(b.xMm)&&finite(b.yMm)&&positive(b.holeDiameterMm)){
    const p=input.plates.find(q=>Array.isArray(q.polygonMm)&&q.polygonMm.length>=3&&pointInPolygon({x:b.xMm,y:b.yMm},q.polygonMm));
    if(!p)fail(errors,"مرکز سوراخ پیچ "+(b.id||i)+" داخل هیچ‌یک از ورق‌های تعریف‌شده نیست.");
    else{
     const poly=p.polygonMm,clear=Math.min(...poly.map((a,j)=>edgeDistance({x:b.xMm,y:b.yMm},a,poly[(j+1)%poly.length])));
     if(clear+1e-8<b.holeDiameterMm/2)fail(errors,"سوراخ پیچ "+(b.id||i)+" از مرز ورق عبور می‌کند.");
    }
   }
  });
  if(!Array.isArray(input.welds)||!input.welds.length)fail(errors,"خطوط جوش واقعی باید با ابتدا و انتهای هر قطعه تعریف شوند.");
  const weldIds=new Set();
  (input.welds||[]).forEach((w,i)=>{
   if(!text(w.id)||weldIds.has(String(w.id)))fail(errors,"شناسه خط جوش خالی یا تکراری است.");weldIds.add(String(w.id));
   if(!vec(w.startMm,3)||!vec(w.endMm,3)||Math.hypot(...w.startMm.map((v,j)=>v-w.endMm[j]))<=1e-8)
    fail(errors,"ابتدا و انتهای خط جوش "+(w.id||i)+" باید دو نقطه سه‌بعدی متفاوت باشند.");
   if(!positive(w.legSizeMm)||!positive(w.electrodeFexxMPa)||!["fillet","groove"].includes(w.type))
    fail(errors,"نوع جوش، اندازه مؤثر/ساق و FEXX خط جوش "+(w.id||i)+" باید صریح و معتبر باشد.");
   if(w.type==="groove"&&!["CJP","PJP"].includes(w.grooveType))fail(errors,"نوع شیار جوش نفوذی باید CJP یا PJP مشخص شود.");
  });
  if(!text(input.fabricationStatus))warnings.push("وضعیت ساخت/بازرسی اتصال ثبت نشده است؛ این داده برای تأیید اجرایی جداگانه لازم خواهد بود.");
  return{valid:errors.length===0,errors,warnings,schema:SCHEMA,connectionId:input.connectionId||null,
   jointId:input.jointId||null,plateCount:input.plates?.length||0,boltCount:input.bolts?.length||0,weldCount:input.welds?.length||0,
   capacityDesigned:false,executionReady:false,geometryOnly:true};
 }
 const api={SCHEMA,validate,pointInPolygon,edgeDistance};
 root.SahroudKneeConnectionDetail=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
