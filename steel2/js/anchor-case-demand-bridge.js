/* SAHROUD STEEL — per-load-case foundation reaction to individual anchor demand.
 * Demand distribution only. Rectangular/principal-axis anchor layouts are required.
 * No steel/concrete/plate resistance, prying, contact, or code approval is produced.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const tol=(v)=>Math.max(1e-7,Math.abs(v)*1e-9);
function distributeCase(demand,anchors){
 const issues=[],vec=demand?.columnActionN_Nm,items=Array.isArray(anchors)?anchors:[];
 if(!Array.isArray(vec)||vec.length!==6||!vec.every(finite))issues.push("بردار کنش ستون باید شش مؤلفه عددی محدود داشته باشد.");
 if(items.length<2)issues.push("برای توزیع گروهی، حداقل دو انکربولت با مختصات واقعی لازم است.");
 const ids=new Set();
 items.forEach((a,i)=>{const id=String(a?.id??"").trim();if(!id||ids.has(id))issues.push("شناسه انکر خالی یا تکراری است: "+(id||i+1));ids.add(id);if(!finite(a?.x_m)||!finite(a?.z_m))issues.push("مختصات X/Z انکر "+(id||i+1)+" باید عددی و محدود باشد.");});
 if(issues.length)return{ok:false,issues,anchors:[],analysisEnabled:false,designApproved:false};
 const [N,Vx,Vz,Mx,Ty,Mz]=vec;
 const cx=items.reduce((s,a)=>s+a.x_m,0)/items.length,cz=items.reduce((s,a)=>s+a.z_m,0)/items.length;
 const rel=items.map(a=>({id:String(a.id),x:a.x_m-cx,z:a.z_m-cz}));
 const sx2=rel.reduce((s,a)=>s+a.x*a.x,0),sz2=rel.reduce((s,a)=>s+a.z*a.z,0),sxz=rel.reduce((s,a)=>s+a.x*a.z,0);
 // This implementation uses the uncoupled principal axes of a rectangular/orthogonal bolt group.
 const geomScale=Math.max(1,sx2,sz2);
 if(Math.abs(sxz)>geomScale*1e-8)issues.push("محورهای مختصات گروه انکر با محورهای اصلی گروه هم‌راستا نیستند؛ توزیع کوپل‌شده لنگرها در این نسخه پشتیبانی نمی‌شود.");
 if(Math.abs(Mx)>tol(Mx)&&!(sz2>1e-14))issues.push("برای لنگر Mx بازوی مؤثر در راستای Z وجود ندارد.");
 if(Math.abs(Mz)>tol(Mz)&&!(sx2>1e-14))issues.push("برای لنگر Mz بازوی مؤثر در راستای X وجود ندارد.");
 if(issues.length)return{ok:false,issues,anchors:[],analysisEnabled:false,designApproved:false};
 const n=items.length,axial=rel.map(a=>N/n+(sz2>1e-14?Mx*a.z/sz2:0)+(sx2>1e-14?Mz*a.x/sx2:0));
 let torsion=[];
 if(Math.abs(Ty)>tol(Ty)){
  const torsionApi=root.SteelAnchorGroupTorsionDemand;
  if(typeof torsionApi?.distribute!=="function")issues.push("ماژول توزیع پیچش گروه انکر بارگذاری نشده است.");
  else {const tr=torsionApi.distribute(Ty,items);if(!tr.ok)issues.push(...tr.issues);else torsion=tr.demands;}
 }else torsion=items.map(a=>({anchorId:String(a.id),Fx_N:0,Fz_N:0,sourceMomentMy_Nm:0}));
 if(issues.length)return{ok:false,issues,anchors:[],analysisEnabled:false,designApproved:false};
 const torsionById=new Map(torsion.map(t=>[String(t.anchorId),t]));
 const rows=rel.map((a,i)=>{const t=torsionById.get(a.id);const sx=Vx/n+t.Fx_N,sz=Vz/n+t.Fz_N;return{anchorId:a.id,x_m:items[i].x_m,z_m:items[i].z_m,relativeX_m:a.x,relativeZ_m:a.z,signedAxialTension_N:axial[i],tensionDemand_N:Math.max(0,axial[i]),compressionDemand_N:Math.max(0,-axial[i]),directShearX_N:Vx/n,directShearZ_N:Vz/n,torsionalShearX_N:t.Fx_N,torsionalShearZ_N:t.Fz_N,totalShearX_N:sx,totalShearZ_N:sz,resultantShear_N:Math.hypot(sx,sz)};});
 const sumN=rows.reduce((s,a)=>s+a.signedAxialTension_N,0),recMx=rows.reduce((s,a)=>s+a.relativeZ_m*a.signedAxialTension_N,0),recMz=rows.reduce((s,a)=>s+a.relativeX_m*a.signedAxialTension_N,0);
 const sumVx=rows.reduce((s,a)=>s+a.totalShearX_N,0),sumVz=rows.reduce((s,a)=>s+a.totalShearZ_N,0);
 const torsionMoment=rows.reduce((s,a)=>s+a.relativeZ_m*a.torsionalShearX_N-a.relativeX_m*a.torsionalShearZ_N,0);
 const equilibrium={axialResidual_N:sumN-N,momentXResidual_Nm:recMx-Mx,momentZResidual_Nm:recMz-Mz,shearXResidual_N:sumVx-Vx,shearZResidual_N:sumVz-Vz,torsionResidual_Nm:torsionMoment-Ty,
  ok:Math.abs(sumN-N)<=tol(N)&&Math.abs(recMx-Mx)<=tol(Mx)&&Math.abs(recMz-Mz)<=tol(Mz)&&Math.abs(sumVx-Vx)<=tol(Vx)&&Math.abs(sumVz-Vz)<=tol(Vz)&&Math.abs(torsionMoment-Ty)<=tol(Ty)};
 if(!equilibrium.ok)issues.push("تعادل نیرو/لنگر در توزیع تقاضای گروه انکر برقرار نیست.");
 return{ok:issues.length===0,ready:issues.length===0,nodeId:String(demand.nodeId??""),caseId:String(demand.caseId??""),anchors:issues.length?[]:rows,groupGeometry:{count:n,centroid_m:{x:cx,z:cz},sumX2_m2:sx2,sumZ2_m2:sz2,sumXZ_m2:sxz},sourceActionN_Nm:vec.slice(),equilibrium,method:"equal direct shear + elastic torsional shear + uncoupled elastic axial distribution about principal group axes",limitations:["توزیع کشش/فشار با فرض صفحه صلب و محورهای اصلی هم‌راستا انجام شده است؛ انعطاف صفحه‌ستون، تماس فشاری زیر صفحه، بلندشدگی، اهرم‌وارگی و خمش موضعی صفحه لحاظ نشده‌اند.","برش مستقیم به‌طور مساوی بین انکرها تقسیم شده است؛ اصطکاک، تماس، برش‌گیر، لغزش، bearing سوراخ و انعطاف صفحه مدل نشده‌اند.","ظرفیت فولاد انکر، شکست بتن، pullout، pry-out، side-face blowout، اثر گروه، فاصله لبه، اندرکنش آیین‌نامه‌ای و طراحی پی محاسبه نشده‌اند.","برای آرایش‌های غیرمستطیلی/محورهای کوپل‌شده، این نسخه عمداً متوقف می‌شود."] ,units:{force:"N",moment:"N.m",coordinates:"m"},analysisEnabled:false,designApproved:false};
}
function fromFoundationBridgeResult(bridgeResult,anchorsByNode){
 const issues=[],demands=Array.isArray(bridgeResult?.demands)?bridgeResult.demands:[],groups=anchorsByNode&&typeof anchorsByNode==="object"?anchorsByNode:{};
 if(bridgeResult?.ok!==true)issues.push("پل واکنش فونداسیون باید با موفقیت ممیزی شده باشد.");
 if(!demands.length)issues.push("هیچ تقاضای مستقل گره/حالت بار در پل واکنش وجود ندارد.");
 if(issues.length)return{ok:false,issues,results:[],analysisEnabled:false,designApproved:false};
 const results=demands.map(d=>{const id=String(d?.nodeId??"");if(!id||!Array.isArray(groups[id])){issues.push("گروه انکر واقعی برای گره "+(id||"نامشخص")+" تعریف نشده است.");return null;}const r=distributeCase(d,groups[id]);if(!r.ok)issues.push("گره "+id+" / حالت "+String(d.caseId??"")+": "+r.issues.join("؛ "));return r;});
 const valid=results.filter(Boolean);
 if(valid.length!==demands.length)issues.push("پوشش گروه انکر با تعداد تقاضاهای پل واکنش برابر نیست.");
 return{ok:issues.length===0,ready:issues.length===0,issues,results:issues.length?[]:valid,caseCount:new Set(demands.map(d=>String(d.caseId))).size,supportCount:new Set(demands.map(d=>String(d.nodeId))).size,independentNodeCaseDemands:true,combinesEnvelopeExtrema:false,analysisEnabled:false,designApproved:false,scope:"تبدیل واکنش‌های شش‌مؤلفه‌ای به تقاضای محوری و برشی هر انکر؛ بدون ظرفیت‌سنجی و تأیید طراحی."};
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const square=[{id:"A",x_m:-.1,z_m:-.1},{id:"B",x_m:.1,z_m:-.1},{id:"C",x_m:.1,z_m:.1},{id:"D",x_m:-.1,z_m:.1}];
 const demand={nodeId:"B1",caseId:"ULS-1",columnActionN_Nm:[1000,4000,-2000,600,800,1000]};
 ck("distributes axial tension equally when bending is zero",()=>{const r=distributeCase({...demand,columnActionN_Nm:[0,4000,0,0,0,0]},square);return r.ok&&r.anchors.every(a=>a.signedAxialTension_N===1000);});
 ck("distributes biaxial bending to anchor coordinates",()=>{const r=distributeCase({...demand,columnActionN_Nm:[0,0,0,400,0,800]},square);return r.ok&&Math.abs(r.equilibrium.momentXResidual_Nm)<1e-8&&Math.abs(r.equilibrium.momentZResidual_Nm)<1e-8;});
 ck("retains compression separately from tensile demand",()=>{const r=distributeCase({...demand,columnActionN_Nm:[0,-4000,0,0,0,0]},square);return r.ok&&r.anchors.every(a=>a.compressionDemand_N===1000&&a.tensionDemand_N===0);});
 ck("distributes direct biaxial shear equally",()=>{const r=distributeCase({...demand,columnActionN_Nm:[4000,0,-8000,0,0,0]},square);return r.ok&&r.anchors.every(a=>a.directShearX_N===1000&&a.directShearZ_N===-2000);});
 ck("combines direct shear and torsional shear vectorially",()=>{const r=distributeCase(demand,square);return r.ok&&r.anchors.some(a=>Math.abs(a.torsionalShearX_N)+Math.abs(a.torsionalShearZ_N)>0)&&r.equilibrium.ok;});
 ck("preserves exact support and load-case identity",()=>{const r=distributeCase(demand,square);return r.ok&&r.nodeId==="B1"&&r.caseId==="ULS-1";});
 ck("rejects missing six-component reaction",()=>!distributeCase({...demand,columnActionN_Nm:[1,2,3]},square).ok);
 ck("rejects missing anchor geometry",()=>!distributeCase(demand,[{id:"A",x_m:0,z_m:0}]).ok);
 ck("rejects duplicate anchor identity",()=>!distributeCase(demand,[square[0],{...square[1],id:"A"}]).ok);
 ck("rejects non-finite anchor coordinates",()=>!distributeCase(demand,[square[0],{...square[1],x_m:NaN}]).ok);
 ck("rejects unsupported coupled principal axes",()=>!distributeCase({...demand,columnActionN_Nm:[0,0,0,100,0,100]},[{id:"A",x_m:0,z_m:0},{id:"B",x_m:1,z_m:1},{id:"C",x_m:2,z_m:0},{id:"D",x_m:1,z_m:-1}]).ok);
 ck("rejects a bending moment without its geometric lever arm",()=>!distributeCase({...demand,columnActionN_Nm:[0,0,0,100,0,0]},[{id:"A",x_m:-1,z_m:0},{id:"B",x_m:1,z_m:0}]).ok);
 ck("rejects missing torsion dependency when torsion is present",()=>{const old=root.SteelAnchorGroupTorsionDemand;root.SteelAnchorGroupTorsionDemand=null;try{return !distributeCase(demand,square).ok;}finally{root.SteelAnchorGroupTorsionDemand=old;}});
 const bridge={ok:true,demands:[demand,{...demand,caseId:"SLS-1",columnActionN_Nm:[0,2000,0,0,0,0]}]};
 ck("maps every independent node/case demand",()=>{const r=fromFoundationBridgeResult(bridge,{B1:square});return r.ok&&r.results.length===2&&r.caseCount===2;});
 ck("keeps load cases separate without envelope mixing",()=>{const r=fromFoundationBridgeResult(bridge,{B1:square});return r.ok&&r.results[0].caseId!==r.results[1].caseId&&r.combinesEnvelopeExtrema===false;});
 ck("rejects incomplete anchor groups without partial output",()=>{const r=fromFoundationBridgeResult(bridge,{});return !r.ok&&r.results.length===0;});
 ck("never marks analysis or design approved",()=>{const r=fromFoundationBridgeResult(bridge,{B1:square});return r.ok&&!r.analysisEnabled&&!r.designApproved&&r.results.every(x=>!x.analysisEnabled&&!x.designApproved);});
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,designApproved:false};
}
root.SteelAnchorCaseDemandBridge={distributeCase,fromFoundationBridgeResult,selfTest};
})(typeof window!=="undefined"?window:globalThis);
