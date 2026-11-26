/* SAHROUD STEEL V3 - preliminary roof gravity load case generator
 * Applies area loads to longitudinal roof purlins using geometric tributary widths.
 * Coordinates: global Y is vertical. Loads are separate cases, not combinations.
 */
(function(root){
 "use strict";
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 function generate(model,inputs,engine){
  if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر نیست.");
  if(!engine||typeof engine.makeTransform!=="function")throw Error("تبدیل محورهای محلی موتور تحلیل در دسترس نیست.");
  const dead=Number(inputs?.deadLoad),live=Number(inputs?.liveLoad);
  if(!Number.isFinite(dead)||dead<0)throw Error("بار مرده سقف باید عددی و نامنفی باشد.");
  if(!Number.isFinite(live)||live<0)throw Error("بار زنده سقف باید عددی و نامنفی باشد.");
  const nodes=new Map(model.nodes.map(n=>[n.id,n]));
  const purlins=model.members.filter(m=>m.sectionKey==="roofPurlin");
  if(!purlins.length)throw Error("در مدل هیچ پرلین طولی سقف وجود ندارد.");
  const rows=new Map();
  purlins.forEach(m=>{
   const n=nodes.get(m.start);if(!n)throw Error("گره عضو پرلین "+m.id+" یافت نشد.");
   const key=String(m.row??m.id);
   if(!rows.has(key))rows.set(key,{key,x:Number(n.x),y:Number(n.y)});
  });
  const ordered=[...rows.values()].sort((a,b)=>a.x-b.x);
  if(ordered.length<2)throw Error("برای تعیین عرض بارگیر، حداقل دو ردیف پرلین لازم است.");
  const s=[0];
  for(let i=1;i<ordered.length;i++)s[i]=s[i-1]+Math.hypot(ordered[i].x-ordered[i-1].x,ordered[i].y-ordered[i-1].y);
  const tributary=new Map();
  ordered.forEach((r,i)=>{
   const left=i===0?0:(s[i]-s[i-1])/2;
   const right=i===ordered.length-1?0:(s[i+1]-s[i])/2;
   const width=left+right;
   if(!(width>0&&Number.isFinite(width)))throw Error("عرض بارگیر ردیف پرلین "+r.key+" معتبر نیست.");
   tributary.set(r.key,width);
  });
  const cases={};
  [["DEAD_ROOF",dead],["LIVE_ROOF",live]].forEach(([name,pressure])=>{
   const members=model.members.map(m=>{
    if(m.sectionKey!=="roofPurlin")return {...m,analysisLoad:undefined};
    const width=tributary.get(String(m.row??m.id));
    if(!(width>0))throw Error("عرض بارگیر برای پرلین "+m.id+" تعیین نشد.");
    const qNpm=pressure*width*1000; // kN/m2 * m -> kN/m -> N/m
    const a=nodes.get(m.start),b=nodes.get(m.end);
    const tr=engine.makeTransform([a.x,a.y,a.z],[b.x,b.y,b.z],[0,0,1]);
    const global=[0,-qNpm,0];
    const local=tr.axes?["x","y","z"].map(k=>dot(tr.axes[k],global)):null;
    if(!local||local.some(v=>!Number.isFinite(v)))throw Error("تبدیل بار قائم به محور محلی عضو "+m.id+" ناموفق بود.");
    return {...m,analysisLoad:{uniformLocal:local}};
   });
   const totalN=members.reduce((sum,m)=>{
    if(m.sectionKey!=="roofPurlin"||!m.analysisLoad)return sum;
    const a=nodes.get(m.start),b=nodes.get(m.end),L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
    const q=Math.hypot(...m.analysisLoad.uniformLocal);
    return sum+q*L;
   },0);
   cases[name]={model:{...model,members},pressure_kN_m2:pressure,totalVertical_kN:totalN/1000};
  });
  return {cases,rows:ordered.map((r,i)=>({row:r.key,tributaryWidth_m:tributary.get(r.key)})),scope:"بار مرده و زنده سطحی سقف به‌صورت دو حالت بارگذاری مستقل، با توزیع بارگیر هندسی روی پرلین‌های طولی. این تابع ترکیبات آیین‌نامه‌ای، برف بام، باد، بار جرثقیل، بار پوشش دیوار یا تحلیل سازه را تولید نمی‌کند."};
 }
 root.SahroudSteelLoads={generate};
})(window);
