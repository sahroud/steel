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
  const snowGround=Number(inputs?.snowLoad),snowImportance=Number(inputs?.snowImportance),snowThermal=Number(inputs?.snowThermal);
  const snowRegion=Number(inputs?.snowRegion),roofSlopePercent=Number(inputs?.roofSlope);
  const roofSurface=String(inputs?.roofSurface||"");
  if(!Number.isFinite(snowGround)||snowGround<0)throw Error("بار برف مبنای زمین باید عددی و نامنفی باشد.");
  if(!Number.isFinite(snowImportance)||snowImportance<=0)throw Error("ضریب اهمیت برف باید از جدول مربوط به گروه خطرپذیری وارد شود.");
  if(!Number.isFinite(snowThermal)||snowThermal<1||snowThermal>1.3)throw Error("ضریب شرایط دمایی برف باید بین 1 تا 1.3 باشد.");
  if(!Number.isFinite(snowRegion)||snowRegion<1||snowRegion>6)throw Error("منطقه بار برف معتبر نیست.");
  if(!Number.isFinite(roofSlopePercent)||roofSlopePercent<0)throw Error("شیب سقف برای محاسبه برف معتبر نیست.");
  if(!["slippery","nonSlippery"].includes(roofSurface))throw Error("نوع سطح پوشش سقف را برای محاسبه ضریب شیب برف انتخاب کنید.");
  if(snowRegion>3)throw Error("برای مناطق برف 4 تا 6، ضریب برف‌گیری Ce باید با جدول رسمی و شرایط سایت تعیین شود؛ این نسخه فقط منطقه 1 تا 3 را خودکار پشتیبانی می‌کند.");
  const alpha=Math.atan(roofSlopePercent/100)*180/Math.PI;
  const alpha0=roofSurface==="slippery"?(snowThermal===1?5:(snowThermal<=1.1?10:15)):(snowThermal===1?30:45);
  const snowSlope=alpha<=alpha0?1:(alpha>=70?0:1-(alpha-alpha0)/(70-alpha0));
  const snowExposure=1;
  const snowRoof=snowGround*snowImportance*snowExposure*snowThermal*snowSlope;
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
  // Roof area loads in the loading code are defined per horizontal plan area.
  // Therefore tributary width is the horizontal projection, not the sloped roof distance.
  const s=[0];
  for(let i=1;i<ordered.length;i++)s[i]=s[i-1]+Math.abs(ordered[i].x-ordered[i-1].x);
  const tributary=new Map();
  ordered.forEach((r,i)=>{
   const left=i===0?0:(s[i]-s[i-1])/2;
   const right=i===ordered.length-1?0:(s[i+1]-s[i])/2;
   const width=left+right;
   if(!(width>0&&Number.isFinite(width)))throw Error("عرض بارگیر ردیف پرلین "+r.key+" معتبر نیست.");
   tributary.set(r.key,width);
  });
  const cases={};
  [["DEAD_ROOF",dead],["LIVE_ROOF",live],["BALANCED_SNOW_ROOF",snowRoof]].forEach(([name,pressure])=>{
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
  return {cases,rows:ordered.map((r,i)=>({row:r.key,tributaryWidth_m:tributary.get(r.key)})),snow:{ground_kN_m2:snowGround,importanceFactor:snowImportance,exposureFactor:snowExposure,thermalFactor:snowThermal,slopeAngle_deg:alpha,slopeFactor:snowSlope,balancedRoof_kN_m2:snowRoof,region:snowRegion},scope:"بار مرده، زنده و برف متوازن سقف به‌صورت حالت‌های مستقل و با توزیع بارگیر هندسی روی پرلین‌های طولی. برف نامتوازن/جزئی/انباشتگی/لغزش، باد، جرثقیل، پوشش دیوار و ترکیبات بار هنوز تولید نمی‌شوند."};
 }
 root.SahroudSteelLoads={generate};
})(window);
