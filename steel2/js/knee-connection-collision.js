/* SAHROUD STEEL — 3D plate and bolt-hardware interference audit.
 * SAT uses triangular-prism decomposition. Washer rings are approximated by 32 sectors.
 * Geometry QA only: no capacity, fit, contact-pressure or execution approval.
 */
(function(root){
 "use strict";
 const finite=v=>typeof v==="number"&&Number.isFinite(v);
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const norm=a=>Math.hypot(...a);
 const unit=a=>{const n=norm(a);return n>1e-12?a.map(v=>v/n):null;};
 const keyAxis=a=>{const u=unit(a);if(!u)return null;const q=u.map(v=>Math.abs(v)<1e-10?0:v);const first=q.find(v=>Math.abs(v)>1e-10);return first<0?q.map(v=>-v):q;};
 function prism(top,bottom){
  if(!Array.isArray(top)||!Array.isArray(bottom)||top.length!==3||bottom.length!==3)throw new Error("مثلث‌بندی جامد ناقص است.");
  const vertices=[...top,...bottom].map(p=>{if(!Array.isArray(p)||p.length!==3||!p.every(finite))throw new Error("مختصات جامد نامعتبر است.");return p.map(v=>v*1000);});
  const edges=[];
  for(let i=0;i<3;i++){const j=(i+1)%3;edges.push(sub(vertices[j],vertices[i]),sub(vertices[j+3],vertices[i+3]),sub(vertices[i+3],vertices[i]));}
  const axes=[],n=unit(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0])));
  if(n)axes.push(n);
  for(let i=0;i<3;i++){const e=sub(vertices[(i+1)%3],vertices[i]),v=sub(vertices[i+3],vertices[i]);const side=unit(cross(e,v));if(side)axes.push(side);}
  return{vertices,edges,faceAxes:axes};
 }
 function uniqueAxes(a,b){
  const map=new Map();
  for(const axis of [...a.faceAxes,...b.faceAxes]){const k=keyAxis(axis);if(k)map.set(k.join(","),k);}
  for(const ea of a.edges)for(const eb of b.edges){const k=keyAxis(cross(ea,eb));if(k)map.set(k.join(","),k);}
  return [...map.values()];
 }
 function pairState(a,b,toleranceMm){
  let minimum=Infinity;
  for(const axis of uniqueAxes(a,b)){
   const pa=a.vertices.map(v=>dot(v,axis)),pb=b.vertices.map(v=>dot(v,axis));
   const overlap=Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb));
   if(overlap < -toleranceMm)return{state:"clear",minimumPenetrationMm:overlap};
   minimum=Math.min(minimum,overlap);
  }
  return{state:minimum<=toleranceMm?"contact":"overlap",minimumPenetrationMm:minimum};
 }
 function triangulatedPrisms(top,bottom){
  if(!Array.isArray(top)||!Array.isArray(bottom)||top.length!==bottom.length||top.length<3)throw new Error("سطح سخت‌افزار برای ممیزی ناقص است.");
  const out=[];
  for(let i=0;i<top.length;i++)out.push(prism([top[0],top[i],top[(i+1)%top.length]],[bottom[0],bottom[i],bottom[(i+1)%bottom.length]]));
  return out;
 }
 function hardwarePrisms(hw){
  const g=hw.geometry;
  if(g.method==="regular-hex-prism")return triangulatedPrisms(g.topFaceGlobalM,g.bottomFaceGlobalM);
  if(g.method==="32-segment-annulus"){
   const out=[],n=g.topFaceGlobalM?.length;
   if(n!==32||g.bottomFaceGlobalM?.length!==32||g.innerTopFaceGlobalM?.length!==32||g.innerBottomFaceGlobalM?.length!==32)
    throw new Error("هندسه حلقوی واشر برای ممیزی کامل نیست.");
   for(let i=0;i<n;i++){
    const j=(i+1)%n;
    const ot=[g.topFaceGlobalM[i],g.topFaceGlobalM[j],g.innerTopFaceGlobalM[j],g.innerTopFaceGlobalM[i]];
    const ob=[g.bottomFaceGlobalM[i],g.bottomFaceGlobalM[j],g.innerBottomFaceGlobalM[j],g.innerBottomFaceGlobalM[i]];
    out.push(prism([ot[0],ot[1],ot[2]],[ob[0],ob[1],ob[2]]),prism([ot[0],ot[2],ot[3]],[ob[0],ob[2],ob[3]]));
   }
   return out;
  }
  throw new Error("روش هندسه سخت‌افزار پشتیبانی نمی‌شود: "+g.method);
 }
 function compareSets(a,b,tol){
  let overlap=null,contact=null,clear=null;
  for(const pa of a)for(const pb of b){
   const r=pairState(pa,pb,tol);
   if(r.state==="overlap"&&(!overlap||r.minimumPenetrationMm>overlap.minimumPenetrationMm))overlap=r;
   else if(r.state==="contact"&&(!contact||r.minimumPenetrationMm>contact.minimumPenetrationMm))contact=r;
   else if(r.state==="clear"&&(!clear||r.minimumPenetrationMm>clear.minimumPenetrationMm))clear=r;
  }
  return overlap||contact||clear||{state:"not-assessable",minimumPenetrationMm:null};
 }
 function audit(input,options={}){
  const detail=root.SahroudKneeConnectionDetail;
  if(!detail||typeof detail.buildGlobalGeometry!=="function")throw new Error("ماژول هندسه جزئیات اتصال بارگذاری نشده است.");
  const checked=detail.validate(input);
  if(!checked.valid)throw new Error("جزئیات اتصال برای ممیزی برخورد معتبر نیست: "+checked.errors.join(" | "));
  const tolerance=options.toleranceMm===undefined?0.1:options.toleranceMm;
  if(!finite(tolerance)||tolerance<0)throw new Error("تلرانس تماس باید عدد متناهی و نامنفی بر حسب mm باشد.");
  const geometry=detail.buildGlobalGeometry(input);
  const plates=geometry.plates.map(p=>({id:p.id,prisms:p.solid.triangulation.top.map((t,i)=>prism(t,p.solid.triangulation.bottom[i].slice().reverse()))}));
  const platePairs=[];
  for(let i=0;i<plates.length;i++)for(let j=i+1;j<plates.length;j++){
   const r=compareSets(plates[i].prisms,plates[j].prisms,tolerance);
   platePairs.push({plateA:plates[i].id,plateB:plates[j].id,state:r.state,minimumPenetrationMm:r.minimumPenetrationMm});
  }
  const hardware=[];
  geometry.plates.forEach(p=>p.bolts.forEach(b=>b.hardware.forEach(h=>hardware.push({
   id:h.id,boltId:b.id,plateId:p.id,kind:h.kind,prisms:hardwarePrisms(h),method:h.geometry.method
  }))));
  const hardwarePlatePairs=[];
  for(const h of hardware)for(const p of plates){
   const r=compareSets(h.prisms,p.prisms,tolerance);
   hardwarePlatePairs.push({hardwareId:h.id,boltId:h.boltId,hardwareKind:h.kind,hostPlateId:h.plateId,plateCompared:p.id,
    state:r.state==="contact"?"contact-intent-unverified":r.state==="overlap"?"interference":r.state,
    minimumPenetrationMm:r.minimumPenetrationMm,
    intentVerified:false});
  }
  const hardwarePairs=[];
  for(let i=0;i<hardware.length;i++)for(let j=i+1;j<hardware.length;j++){
   const a=hardware[i],b=hardware[j],r=compareSets(a.prisms,b.prisms,tolerance);
   hardwarePairs.push({hardwareA:a.id,boltA:a.boltId,hardwareB:b.id,boltB:b.boltId,
    state:r.state==="contact"?"contact-intent-unverified":r.state==="overlap"?"interference":r.state,
    minimumPenetrationMm:r.minimumPenetrationMm,intentVerified:false});
  }
  const shankStatus=geometry.plates.flatMap(p=>p.bolts.map(b=>({boltId:b.id,hostPlateId:p.id,state:"not-assessable",
   reason:"هندسه سه‌بعدی واقعی سوراخ/لقی و مسیر عبور پیچ در تمام ورق‌های درگیر تعریف نشده است؛ از تماس کاذب بدنه پیچ با ورق میزبان نتیجه‌گیری نمی‌شود."})));
  const count=arr=>({interference:arr.filter(x=>x.state==="interference"||x.state==="overlap").length,
   contactUnverified:arr.filter(x=>x.state==="contact-intent-unverified"||x.state==="contact").length,
   clear:arr.filter(x=>x.state==="clear").length});
  return{success:true,method:"triangle-prism SAT; 32-sector annular washer approximation",toleranceMm:tolerance,
   platePairs,hardwarePlatePairs,hardwarePairs,shankStatus,
   summary:{platePairs:count(platePairs),hardwarePlatePairs:count(hardwarePlatePairs),hardwarePairs:count(hardwarePairs),
    shanksNotAssessable:shankStatus.length},
   geometryOnly:true,capacityDesigned:false,executionReady:false,
   limitations:[
    "تماس سخت‌افزار با ورق فقط تماس هندسی است؛ تا وقتی قصد تماس از نقشه/جزئیات نصب صریحاً تأیید نشود، وضعیت contact-intent-unverified باقی می‌ماند.",
    "واشر با ۳۲ قطاع حلقوی مثلث‌بندی می‌شود؛ نتیجه هندسی آن تقریب عددی است و برای کنترل دقیق لبه/سطح تماس کافی نیست.",
    "بدنه پیچ عمداً در سوراخ ورق میزبان به‌عنوان برخورد تداخل‌زا گزارش نمی‌شود؛ به‌دلیل نبود مدل حجمی سوراخ، لقی، شیار و عبور از چند ورق، وضعیت آن not-assessable است.",
    "این ممیزی ظرفیت پیچ، رزوه، پیش‌تنیدگی، فشار تماسی، لغزش، جوش یا آمادگی ساخت را محاسبه نمی‌کند."
   ]};
 }
 const api={audit};
 root.SahroudKneeConnectionCollision=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
