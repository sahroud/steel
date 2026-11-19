(function(root){
 "use strict";
 const finite=(v,label)=>{if(v===null||v===undefined||typeof v==="boolean"||(typeof v==="string"&&!v.trim()))throw new Error(label+" نباید خالی باشد.");const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;};
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
 const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
 const scale=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
 function vector(v,label){
  if(!v||typeof v!=="object")throw new Error(label+" باید بردار سه‌بعدی داشته باشد.");
  return {x:finite(v.x,label+".x"),y:finite(v.y,label+".y"),z:finite(v.z,label+".z")};
 }
 function unitAxes(input){
  const axes=input&&input.localAxes||{};
  const x=vector(axes.x,"محور محلی x"),y=vector(axes.y,"محور محلی y"),z=vector(axes.z,"محور محلی z");
  const tolerance=1e-6;
  for(const [name,v] of [["x",x],["y",y],["z",z]]){
   if(Math.abs(Math.hypot(v.x,v.y,v.z)-1)>tolerance)throw new Error("بردار محور محلی "+name+" باید یکه (طول واحد) باشد.");
  }
  if(Math.abs(dot(x,y))>tolerance||Math.abs(dot(x,z))>tolerance||Math.abs(dot(y,z))>tolerance)
   throw new Error("محورهای محلی پی باید بر هم عمود باشند.");
  if(Math.abs(dot(x,cross(y,z))-1)>tolerance)
   throw new Error("دستگاه محورهای محلی باید راست‌گرد باشد: x × y = z.");
  return Object.freeze({x:Object.freeze(x),y:Object.freeze(y),z:Object.freeze(z)});
 }
 function toLocal(v,axes){return {x:dot(v,axes.x),y:dot(v,axes.y),z:dot(v,axes.z)};}
 function mapUlsReactionBatchToFootingActions(input){
  const d=input||{},batch=d.batch;
  if(!batch||batch.schema!=="SAHROUD-FOUNDATION-ULS-REACTION-BATCH-1.0"||batch.success!==true)
   throw new Error("بسته معتبر واکنش‌های ULS لازم است.");
  if(d.reactionSense!=="on-structure"&&d.reactionSense!=="on-foundation")
   throw new Error("جهت واکنش باید صریحاً on-structure یا on-foundation تعیین شود.");
  if(!Array.isArray(d.foundations)||!d.foundations.length)
   throw new Error("برای هر پایه، دستگاه مختصات و مرکز پی باید مشخص شود.");
  const byId=new Map();
  d.foundations.forEach(f=>{
   const id=String(f&&f.nodeId||"").trim();
   if(!id||byId.has(id))throw new Error("شناسه پی خالی یا تکراری است.");
   const center=vector(f.footingCentroidGlobalM,"مرکز هندسی پی "+id);
   const axes=unitAxes(f);
   if(f.verticalLocalAxis!=="y")throw new Error("برای اتصال به کنترل فشار پی، محور قائم محلی باید y باشد و صفحه پی در x-z تعریف شود.");
   const compressionSign=finite(f.compressionSign,"علامت مثبت فشار در محور محلی y");
   if(compressionSign!==1&&compressionSign!==-1)throw new Error("علامت فشار باید فقط +1 یا -1 باشد.");
   byId.set(id,{nodeId:id,footingCentroidGlobalM:center,localAxes:axes,compressionSign});
  });
  const sourceIds=new Set((batch.foundations||[]).map(x=>String(x.nodeId)));
  if(sourceIds.size!==byId.size||Array.from(sourceIds).some(id=>!byId.has(id)))
   throw new Error("برای تمام و فقط پایه‌های موجود در بسته ULS باید مشخصات مرکز و محور محلی پی وارد شود.");
  const sense=d.reactionSense==="on-structure"?-1:1;
  const mapped=(batch.foundations||[]).map(base=>{
   const footing=byId.get(String(base.nodeId));
   const cases=base.cases.map(c=>{
    if(!batch.cases.some(x=>x.loadCase===c.loadCase&&x.classification==="ULS"))
     throw new Error("حالت "+c.loadCase+" در فهرست ترکیبات ULS بسته موجود نیست.");
    const Fglobal=scale({x:finite(c.FxkN,"Fx"),y:finite(c.FykN,"Fy"),z:finite(c.FzkN,"Fz")},sense);
    const MglobalAtSupport=scale({x:finite(c.MxkNm,"Mx"),y:finite(c.MykNm,"My"),z:finite(c.MzkNm,"Mz")},sense);
    const supportPoint=vector(base.coordinatesM,"مختصات پایه "+base.nodeId);
    const arm=subtract(supportPoint,footing.footingCentroidGlobalM);
    const MglobalAtCentroid=add(MglobalAtSupport,cross(arm,Fglobal));
    const Flocal=toLocal(Fglobal,footing.localAxes),Mlocal=toLocal(MglobalAtCentroid,footing.localAxes);
    const N=footing.compressionSign*Flocal.y;
    return Object.freeze({loadCase:c.loadCase,loadCaseLabel:c.loadCaseLabel,sourceReference:c.sourceReference,
     FxLocalkN:Flocal.x,FylocalkN:Flocal.y,FzLocalkN:Flocal.z,
     MxkNm:Mlocal.x,MykNm:Mlocal.y,MzkNm:Mlocal.z,NkN:N});
   });
   return Object.freeze({nodeId:base.nodeId,footingCentroidGlobalM:Object.freeze(footing.footingCentroidGlobalM),
    cases:Object.freeze(cases)});
  });
  return Object.freeze({schema:"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0",success:true,
   sourceSchema:batch.schema,reactionSense:d.reactionSense,
   axisConvention:"محورها از بردارهای یکه راست‌گرد ورودی ساخته شده‌اند؛ گشتاور به مرکز هندسی پی منتقل شده است.",
   foundations:Object.freeze(mapped),
   limitations:Object.freeze(["تبدیل فقط تبدیل برداری، تغییر علامت کنش/واکنش و انتقال گشتاور به مرکز پی است؛ صحت دستگاه محورهای ورودی باید توسط طراح کنترل شود.",
    "N مثبت به‌عنوان فشار فقط با compressionSign صریح کاربر تعریف می‌شود؛ علامت یا جهت قائم از مدل حدس زده نشده است.",
    "این خروجی به‌تنهایی کنترل خاک، تماس جزئی، نشست، لغزش، واژگونی یا طراحی بتن‌آرمه را انجام نمی‌دهد.",
    "واکنش‌ها باید از ترکیبات ULS معتبر و مستند باشند؛ این ماژول ترکیبات بار را تولید یا تأیید آیین‌نامه‌ای نمی‌کند."])});
 }
 const api=Object.freeze({mapUlsReactionBatchToFootingActions});
 root.SahroudFoundationUlsActionMapping=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
