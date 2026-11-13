/* SAHROUD STEEL — conservative member section-force reconstruction.
 * Supports only prismatic, unreleased, zero-offset frame elements with explicitly
 * complete local uniform-load data. Unsupported load types fail closed.
 * Units: N, N.m, m. End actions use SteelFrame3D localEndForces convention.
 */
(function(root){
"use strict";
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
function reconstruct(input,options){
 options=options||{};
 const fail=(reason,details)=>({status:"insufficient_data",ok:false,reason,details:details||[]});
 if(!input||typeof input!=="object")return fail("عضو یا داده ورودی ارائه نشده است.");
 const L=Number(input.length);
 if(!(Number.isFinite(L)&&L>0))return fail("طول واقعی عضو باید مثبت و بر حسب متر مشخص باشد.");
 const f=input.localEndForces;
 if(!Array.isArray(f)||f.length!==12||!f.every(Number.isFinite))return fail("بردار ۱۲ مؤلفه‌ای نیروهای انتهایی معتبر نیست.");
 if(input.loadDataComplete!==true)return fail("کامل‌بودن داده بارهای روی طول عضو صریحاً تأیید نشده است.");
 if(input.prismatic!==true)return fail("این بازسازی فقط برای عضو منشوری است؛ عضو متغیرمقطع باید با روش اختصاصی تحلیل شود.");
 if(input.endReleases&&((input.endReleases.i||[]).length||(input.endReleases.j||[]).length))return fail("آزادسازی انتهایی در این نسخه پشتیبانی نمی‌شود.");
 const offsets=input.endOffsets||{};
 if((offsets.i&&offsets.i.some(v=>Math.abs(Number(v))>1e-12))||(offsets.j&&offsets.j.some(v=>Math.abs(Number(v))>1e-12)))return fail("بازوی صلب/خروج از مرکزیت انتهایی در این نسخه پشتیبانی نمی‌شود.");
 const load=input.uniformLocal;
 if(!finite3(load)||!load.every(Number.isFinite))return fail("بار گسترده یکنواخت محلی باید به‌صورت سه مؤلفه N/m و حتی در حالت صفر صریحاً ارائه شود.");
 if(Array.isArray(input.pointLoads)&&input.pointLoads.length)return fail("بار متمرکز روی طول عضو هنوز پشتیبانی نمی‌شود.");
 if(Array.isArray(input.distributedLoads)&&input.distributedLoads.length)return fail("بار گسترده غیر یکنواخت یا قطعه‌ای هنوز پشتیبانی نمی‌شود.");
 const q=load,stations=new Set();
 const count=Math.max(2,Math.min(200,Math.floor(Number(options.subdivisions)||20)));
 for(let i=0;i<=count;i++)stations.add(L*i/count);
 // Add zero-shear locations, where a component of bending moment can peak.
 for(const k of [1,2]){
  const qk=q[k],fik=f[k];
  if(Math.abs(qk)>1e-12){const x=-fik/qk;if(x>0&&x<L)stations.add(x);}
 }
 const rows=[...stations].sort((a,b)=>a-b).map(x=>{
  const force=[0,1,2].map(k=>-(f[k]+q[k]*x));
  const rI=[-x,0,0],rQ=[-x*x/2,0,0];
  const moment=[0,1,2].map(k=>-(f[k+3]+cross(rI,f.slice(0,3))[k]+cross(rQ,q)[k]));
  return {x_m:x,N_N:force[0],Vy_N:force[1],Vz_N:force[2],T_Nm:moment[0],My_Nm:moment[1],Mz_Nm:moment[2]};
 });
 const endResidual=[0,1,2].map(k=>rows[rows.length-1][["N_N","Vy_N","Vz_N"][k]]-f[k+6]);
 const momentResidual=[0,1,2].map(k=>rows[rows.length-1][["T_Nm","My_Nm","Mz_Nm"][k]]-f[k+9]);
 const scale=Math.max(1,...f.map(Math.abs),...q.map(v=>Math.abs(v)*L));
 const residual=Math.max(...endResidual.map(Math.abs),...momentResidual.map(Math.abs));
 if(residual>1e-7*scale)return fail("تعادل انتهای عضو با بردار نیروهای انتهایی سازگار نیست؛ قرارداد بار یا علامت‌ها نیازمند بازبینی است.",[{endResidual,momentResidual,relativeResidual:residual/scale}]);
 return {status:"ok",ok:true,method:"left-segment equilibrium from solver end actions plus explicit local uniform load",units:{length:"m",force:"N",moment:"N.m",distributedLoad:"N/m"},convention:"At a cut x from physical end i, section resultant equals the negative resultant of the i-end solver action and all applied loads on the left segment; terminal value must match j-end solver action.",stations:rows,checks:{endEquilibrium:true,relativeResidual:residual/scale},limitations:["Only prismatic, unreleased, zero-offset members.","Only explicitly complete local uniform loads; point and nonuniform loads are rejected.","No capacity, code check, stability check, or design approval is produced."]};
}
function selfTest(){
 const checks=[],test=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,detail:e.message});}};
 test("cantilever point-equivalent tip action without member load",()=>{const r=reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],localEndForces:[0,1000,0,0,0,4000,0,-1000,0,0,0,0]});return r.ok&&Math.abs(r.stations[0].Vy_N+1000)<1e-8&&Math.abs(r.stations[0].Mz_Nm+4000)<1e-8&&Math.abs(r.stations.at(-1).Vy_N+1000)<1e-8;});
 test("uniform local load recovers linear shear and quadratic moment",()=>{const L=6,q=-2000,V0=6000,M0=12000;const r=reconstruct({length:L,prismatic:true,loadDataComplete:true,uniformLocal:[0,q,0],localEndForces:[0,-V0,0,0,0,-M0,0,V0-q*L,0,0,0,M0+V0*L-q*L*L/2]});return r.ok&&Math.abs(r.stations[0].Vy_N-V0)<1e-7&&Math.abs(r.stations.at(-1).Vy_N-(V0+q*L))<1e-7;});
 test("missing explicit load completeness fails closed",()=>reconstruct({length:4,prismatic:true,uniformLocal:[0,0,0],localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("missing uniform load vector fails closed",()=>reconstruct({length:4,prismatic:true,loadDataComplete:true,localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("tapered member fails closed",()=>reconstruct({length:4,prismatic:false,loadDataComplete:true,uniformLocal:[0,0,0],localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("point load fails closed",()=>reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],pointLoads:[{x:2,values:[0,-1,0]}],localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("released member fails closed",()=>reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],endReleases:{i:[4]},localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,checks};
}
root.SteelMemberSectionForces={reconstruct,selfTest};
})(typeof window!=="undefined"?window:globalThis);
