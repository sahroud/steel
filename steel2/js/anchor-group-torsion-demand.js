/* SAHROUD STEEL — elastic anchor-group torsional shear demand distribution.
 * Distributes a pure vertical-axis moment My over explicitly located anchors.
 * This is demand bookkeeping only: no anchor/concrete/plate capacity or code approval.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function distribute(momentNm,anchors){
 const issues=[],M=Number(momentNm),items=Array.isArray(anchors)?anchors:[];
 if(!Number.isFinite(M))issues.push("گشتاور پیچشی My باید عددی و محدود باشد.");
 if(items.length<2)issues.push("حداقل دو انکربولت با مختصات مستقل لازم است.");
 const ids=new Set();
 items.forEach((a,i)=>{
  const id=String(a?.id??"").trim(),x=Number(a?.x_m),z=Number(a?.z_m);
  if(!id||ids.has(id))issues.push("شناسه انکربولت خالی یا تکراری است: "+id);
  ids.add(id);
  if(!Number.isFinite(x)||!Number.isFinite(z))issues.push("مختصات X/Z انکربولت "+(id||i+1)+" معتبر نیست.");
 });
 if(issues.length)return{ok:false,issues,demands:[],analysisEnabled:false,designApproved:false};
 const cx=items.reduce((s,a)=>s+Number(a.x_m),0)/items.length;
 const cz=items.reduce((s,a)=>s+Number(a.z_m),0)/items.length;
 const rel=items.map(a=>({id:String(a.id),x:Number(a.x_m)-cx,z:Number(a.z_m)-cz}));
 const J=rel.reduce((s,a)=>s+a.x*a.x+a.z*a.z,0);
 if(!(J>1e-14&&Number.isFinite(J)))return{ok:false,issues:["گروه انکربولت حول مرکز هندسی بازوی مؤثر برای تحمل پیچش قائم ندارد."],demands:[],analysisEnabled:false,designApproved:false};
 const demands=rel.map(a=>({anchorId:a.id,relativeX_m:a.x,relativeZ_m:a.z,Fx_N:M*a.z/J,Fz_N:-M*a.x/J,sourceMomentMy_Nm:M}));
 const sumFx=demands.reduce((s,a)=>s+a.Fx_N,0),sumFz=demands.reduce((s,a)=>s+a.Fz_N,0);
 const recoveredMy=demands.reduce((s,a)=>s+a.relativeZ_m*a.Fx_N-a.relativeX_m*a.Fz_N,0);
 const forceTol=Math.max(1e-8,Math.abs(M)*1e-10),momentTol=Math.max(1e-7,Math.abs(M)*1e-9);
 const equilibrium={sumFx_N:sumFx,sumFz_N:sumFz,recoveredMy_Nm:recoveredMy,forceResidual_N:Math.hypot(sumFx,sumFz),momentResidual_Nm:recoveredMy-M,ok:Math.hypot(sumFx,sumFz)<=forceTol&&Math.abs(recoveredMy-M)<=momentTol};
 if(!equilibrium.ok)issues.push("تعادل نیرو/گشتاور توزیع پیچش گروه انکر برقرار نیست.");
 return{ok:issues.length===0,ready:issues.length===0,centroid_m:{x:cx,z:cz},polarCoordinateSum_m2:J,demands,equilibrium,units:{moment:"N.m",force:"N",coordinates:"m"},method:"elastic tangential distribution: Fx=My*z/J, Fz=-My*x/J, coordinates measured from anchor-group centroid",scope:"تقاضای برشی ناشی از پیچش قائم فقط؛ بدون اندرکنش با برش مستقیم، کشش انکر، سختی صفحه‌ستون، تماس بتن، ظرفیت فولاد/بتن، اثر اهرمی یا طراحی آیین‌نامه‌ای.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const square=[{id:"A",x_m:-.1,z_m:-.1},{id:"B",x_m:.1,z_m:-.1},{id:"C",x_m:.1,z_m:.1},{id:"D",x_m:-.1,z_m:.1}];
 ck("pure torsion creates zero resultant horizontal force",()=>{const r=distribute(10000,square);return r.ok&&r.equilibrium.forceResidual_N<1e-8;});
 ck("recovered torsion equals applied My",()=>{const r=distribute(-25000,square);return r.ok&&Math.abs(r.equilibrium.recoveredMy_Nm+25000)<1e-8;});
 ck("anchor forces reverse with moment sign",()=>{const a=distribute(1000,square),b=distribute(-1000,square);return a.ok&&b.ok&&Math.abs(a.demands[0].Fx_N+b.demands[0].Fx_N)<1e-8;});
 ck("rejects missing anchor geometry",()=>!distribute(1000,[{id:"A",x_m:0,z_m:0}]).ok);
 ck("rejects duplicate anchor IDs",()=>!distribute(1000,[square[0],{...square[1],id:"A"}]).ok);
 ck("rejects non-finite coordinates",()=>!distribute(1000,[square[0],{...square[1],x_m:NaN}]).ok);
 ck("rejects coincident anchor group with no torsional lever arm",()=>!distribute(1000,square.map(a=>({...a,x_m:0,z_m:0})).map((a,i)=>({...a,id:"P"+i}))).ok);
 ck("does not approve anchor or foundation design",()=>{const r=distribute(1000,square);return r.analysisEnabled===false&&r.designApproved===false;});
 const passed=checks.filter(x=>x.ok).length;return{passed,failed:checks.length-passed,total:checks.length,checks,analysisEnabled:false,designApproved:false};
}
root.SteelAnchorGroupTorsionDemand={distribute,selfTest};
})(typeof window!=="undefined"?window:globalThis);
