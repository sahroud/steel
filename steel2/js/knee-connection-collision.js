/* SAHROUD STEEL — plate-to-plate solid interference audit.
 * Convex SAT is applied to triangular-prism pieces of each validated plate.
 * Results distinguish positive-volume overlap, tolerance contact and clear separation.
 * This is geometry QA only; it does not infer intended structural contact or capacity.
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
 function prism(triTop,triBottom){
  if(!Array.isArray(triTop)||!Array.isArray(triBottom)||triTop.length!==3||triBottom.length!==3)throw new Error("مثلث‌بندی جامد ورق ناقص است.");
  const vertices=[...triTop,...triBottom].map(p=>{if(!Array.isArray(p)||p.length!==3||!p.every(finite))throw new Error("مختصات جامد ورق نامعتبر است.");return p.map(v=>v*1000);});
  const edges=[];
  for(let i=0;i<3;i++){const j=(i+1)%3;edges.push(sub(vertices[j],vertices[i]),sub(vertices[j+3],vertices[i+3]),sub(vertices[i+3],vertices[i]));}
  const axes=[];
  const n=unit(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0])));
  if(n)axes.push(n);
  for(let i=0;i<3;i++){const e=sub(vertices[(i+1)%3],vertices[i]),vertical=sub(vertices[i+3],vertices[i]);const side=unit(cross(e,vertical));if(side)axes.push(side);}
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
 function audit(input,options={}){
  const detail=root.SahroudKneeConnectionDetail;
  if(!detail||typeof detail.buildGlobalGeometry!=="function")throw new Error("ماژول هندسه جزئیات اتصال بارگذاری نشده است.");
  const checked=detail.validate(input);
  if(!checked.valid)throw new Error("جزئیات اتصال برای ممیزی برخورد معتبر نیست: "+checked.errors.join(" | "));
  const tolerance=options.toleranceMm===undefined?0.1:options.toleranceMm;
  if(!finite(tolerance)||tolerance<0)throw new Error("تلرانس تماس باید عدد متناهی و نامنفی بر حسب mm باشد.");
  const geometry=detail.buildGlobalGeometry(input);
  const pieces=geometry.plates.map(plate=>({id:plate.id,prisms:plate.solid.triangulation.top.map((top,i)=>prism(top,plate.solid.triangulation.bottom[i].slice().reverse()))}));
  const pairs=[];
  for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
   const a=pieces[i],b=pieces[j];let best={state:"clear",minimumPenetrationMm:-Infinity};
   for(const pa of a.prisms)for(const pb of b.prisms){
    const r=pairState(pa,pb,tolerance);
    if(r.state==="overlap"){if(best.state!=="overlap"||r.minimumPenetrationMm>best.minimumPenetrationMm)best=r;}
    else if(r.state==="contact"&&best.state!=="overlap")best=r;
    else if(r.state==="clear"&&best.state==="clear"&&r.minimumPenetrationMm>best.minimumPenetrationMm)best=r;
   }
   pairs.push({plateA:a.id,plateB:b.id,state:best.state,minimumPenetrationMm:best.minimumPenetrationMm});
  }
  return{success:true,method:"triangle-prism SAT",toleranceMm:tolerance,pairs,
   overlapCount:pairs.filter(p=>p.state==="overlap").length,
   contactCount:pairs.filter(p=>p.state==="contact").length,
   clearCount:pairs.filter(p=>p.state==="clear").length,
   geometryOnly:true,capacityDesigned:false,executionReady:false,
   limitations:["تماس هندسی به‌معنای اتصال سازه‌ای تأییدشده نیست؛ هدف تماس باید از نقشه/روش ساخت مشخص شود.",
    "تلرانس فقط برای طبقه‌بندی فاصله/نفوذ هندسی است و جایگزین تلرانس ساخت یا کنترل جوش/پیچ نیست.",
    "ممیزی فقط ورق‌های جامد را مقایسه می‌کند؛ پیچ، مهره، واشر، جوش و اعضای اصلی در این نسخه وارد آزمون برخورد نشده‌اند."]};
 }
 const api={audit};
 root.SahroudKneeConnectionCollision=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
