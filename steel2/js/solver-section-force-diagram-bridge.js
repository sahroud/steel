/* SAHROUD STEEL — isolated solver-to-section-force diagram bridge.
 * Connects a successful nodal runner result to per-member section resultants.
 * Requires explicit complete local load ledgers. No capacity or approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function build(model,runnerOutput,options){
 options=options||{};
 const issues=[],result=runnerOutput?.solverResult,sim=runnerOutput?.simultaneousActionCase;
 const modelMembers=Array.isArray(model?.members)?model.members:[];
 const solved=Array.isArray(result?.members)?result.members:[];
 const modelById=new Map(),solvedById=new Map();
 modelMembers.forEach(m=>{const id=String(m?.id??"");if(!id||modelById.has(id))issues.push("شناسه عضو مدل خالی یا تکراری است: "+id);else modelById.set(id,m);});
 solved.forEach(m=>{const id=String(m?.id??"");if(!id||solvedById.has(id))issues.push("شناسه عضو حل‌شده خالی یا تکراری است: "+id);else solvedById.set(id,m);});
 if(runnerOutput?.success!==true||runnerOutput?.status!=="isolated_analysis_proposal")issues.push("ورودی باید خروجی تحلیل ایزوله موفق باشد.");
 if(result?.success!==true||result?.equilibrium?.ok!==true||!sim?.equilibriumOk)issues.push("حل‌گر یا تعادل حالت بار موفق/تأییدشده نیست.");
 if(!sim?.caseId)issues.push("شناسه یکتای حالت بار موجود نیست.");
 if(!modelMembers.length||!solved.length)issues.push("فهرست اعضای مدل یا نتایج حل‌شده خالی است.");
 modelById.forEach((m,id)=>{if(!solvedById.has(id))issues.push("نتیجه عضو "+id+" در حل‌گر موجود نیست.");});
 solvedById.forEach((m,id)=>{if(!modelById.has(id))issues.push("عضو حل‌شده "+id+" در مدل ورودی وجود ندارد.");});
 if(issues.length)return {success:false,status:"insufficient_data",issues,loadCaseId:sim?.caseId||null,designApproved:false,capacityCalculated:false};
 const joined=modelMembers.map(m=>{
  const s=solvedById.get(String(m.id));
  return {...s,analysisLoad:m.analysisLoad,loadDataComplete:m.loadDataComplete,pointLoads:m.pointLoads,distributedLoads:m.distributedLoads,endReleases:s.endReleases??m.endReleases,endOffsets:s.endOffsets??m.endOffsets,prismatic:m.prismatic};
 });
 const taperModel={...model,members:modelMembers};
 const tapered=joined.some(m=>m.taperApplied===true||m.taperSegmentCount!=null);
 let taperedReport=null,prismaticDiagrams=[];
 if(tapered){
  if(!root.SteelTaperedSectionForceDiagram?.build)return {success:false,status:"missing_dependency",issues:["موتور نمودار اعضای متغیرمقطع بارگذاری نشده است."],designApproved:false};
  const c={label:String(sim.caseId),equilibrium:result.equilibrium,members:joined};
  taperedReport=root.SteelTaperedSectionForceDiagram.build(taperModel,[c],options.taperedOptions||{});
  if(!taperedReport.success)issues.push(...(taperedReport.issues||["بازسازی اعضای متغیرمقطع ناموفق بود."]));
 }
 joined.forEach(m=>{
  if(m.taperApplied===true||m.taperSegmentCount!=null)return;
  const ledger=m.analysisLoad||{};
  const complete=ledger.loadDataComplete===true||m.loadDataComplete===true||options.loadCompletenessByMember?.[String(m.id)]===true;
  if(!complete){issues.push("کامل‌بودن دفتر بارگذاری عضو "+m.id+" صریحاً تأیید نشده است.");return;}
  const uniform=ledger.uniformLocal;
  if(!Array.isArray(uniform)||uniform.length!==3||!uniform.every(v=>finite(v))){issues.push("بار گسترده محلی عضو "+m.id+" باید با سه مؤلفه عددی N/m ثبت شود.");return;}
  const length=Number(m.length);
  if(!(Number.isFinite(length)&&length>0)){issues.push("طول حل‌شده عضو "+m.id+" معتبر نیست.");return;}
  const diagram=root.SteelMemberSectionForces?.reconstruct?.({
   length,localEndForces:m.localEndForces,loadDataComplete:true,prismatic:true,
   uniformLocal:uniform,pointLoads:ledger.pointLoads||m.pointLoads||[],
   distributedLoads:ledger.distributedLoads||m.distributedLoads||[],
   endReleases:m.endReleases,endOffsets:m.endOffsets
  },options.diagramOptions||{});
  if(!diagram?.ok){issues.push("نمودار عضو "+m.id+" بازسازی نشد: "+(diagram?.reason||"موتور بازسازی در دسترس نیست."));return;}
  prismaticDiagrams.push({memberId:String(m.id),parentMemberId:m.parentMemberId||String(m.id),length_m:length,localAxes:m.localAxes,section:m.section,stations:diagram.stations,checks:diagram.checks,method:diagram.method});
 });
 const expectedPrismatic=joined.filter(m=>!(m.taperApplied===true||m.taperSegmentCount!=null)).length;
 if(prismaticDiagrams.length!==expectedPrismatic&&issues.length===0)issues.push("تمام اعضای منشوری نتیجه نمودار معتبر ندارند.");
 const success=issues.length===0&&prismaticDiagrams.length===expectedPrismatic&&(!tapered||taperedReport?.success===true);
 return {success,status:success?"complete-per-case-section-force-diagrams":"insufficient_data",loadCaseId:sim.caseId,source:sim.source||null,units:"N,N.m,m",prismaticMemberCount:expectedPrismatic,prismaticDiagrams,taperedReport,issues,designApproved:false,capacityCalculated:false,readyForCodeDesign:false,limitations:["فقط بار گسترده یکنواخت محلی با دفتر بارگذاری کامل و صریح؛ بار نقطه‌ای/غیریکنواخت در این نسخه رد می‌شود.","اعضای منشوری آزادشده یا دارای بازوی صلب توسط بازساز منشوری فعلی رد می‌شوند.","اعضای متغیرمقطع در هر قطعه جداگانه بازسازی می‌شوند؛ نیروها در محور محلی قطعات مختلف با هم پوش‌گیری نمی‌شوند.","این خروجی تقاضای مقطع است و ظرفیت، کمانش، سرویس‌پذیری یا انطباق آیین‌نامه‌ای را کنترل نمی‌کند."]};
}
function selfTest(){
 const tests=[],add=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const sec={E:200e9,G:77e9,A:.01,Iy:8e-5,Iz:2e-5,J:1e-5};
 const make=(load=[0,0,0],extra={})=>({nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:3,y:0,z:0}],members:[{id:"M",start:"A",end:"B",type:"test",length:3,prismatic:true,analysisLoad:{uniformLocal:load,loadDataComplete:true},...extra}]});
 const run=(model,load=[0,-1000,0])=>{const first=model.nodes[0].id,last=model.nodes[model.nodes.length-1].id;const r=root.SteelNodalLoadCaseRunner.run(model,{id:"DIAGRAM-CASE",type:"nodal",coordinateSystem:"global",target:"node:"+last,forceUnit:"N",momentUnit:"N.m",values:{Fx:0,Fy:load[1],Fz:load[2],Mx:0,My:0,Mz:0},source:{document:"fixture",revision:"1",locator:"case",authority:"test"}},{runSolver:true,supports:[{nodeId:first,fixedDofs:[0,1,2,3,4,5]}],sectionResolver:()=>sec});return r;};
 add("live solver to prismatic section diagram",()=>{const m=make([0,0,0]),r=run(m),d=build(m,r);return d.success&&d.prismaticDiagrams.length===1&&d.prismaticDiagrams[0].stations.length>=3&&d.prismaticDiagrams[0].stations[0].Vy_N<0;});
 add("uniform local load included in reconstructed section actions",()=>{const m=make([0,-500,0]),r=run(m,[0,-1000,0]),d=build(m,r);return d.success&&d.prismaticDiagrams[0].stations[0].Vy_N<d.prismaticDiagrams[0].stations.at(-1).Vy_N&&Math.abs(d.prismaticDiagrams[0].stations.at(-1).Vy_N+1000)<1e-6;});
 add("missing load completeness blocked",()=>{const m=make([0,0,0]);delete m.members[0].analysisLoad.loadDataComplete;return build(m,run(m)).status==="insufficient_data";});
 add("missing uniform load vector blocked",()=>{const m=make([0,0,0]);delete m.members[0].analysisLoad.uniformLocal;return build(m,run(m)).status==="insufficient_data";});
 add("point load on member blocked",()=>{const m=make([0,0,0]);m.members[0].analysisLoad.pointLoads=[{x:1,values:[0,-1,0]}];return build(m,run(m)).status==="insufficient_data";});
 add("solver imbalance blocked",()=>{const m=make([0,0,0]),r=run(m);r.solverResult.equilibrium.ok=false;return build(m,r).status==="insufficient_data";});
 add("missing model member result blocked",()=>{const m=make([0,0,0]),r=run(m);r.solverResult.members=[];return build(m,r).status==="insufficient_data";});
 add("live solver to segmented tapered section diagrams",()=>{const model={nodes:[{id:"n0",x:0,y:0,z:0},{id:"n1",x:2,y:0,z:0},{id:"n2",x:5,y:0,z:0}],members:[{id:"T1",start:"n0",end:"n1",length:2,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:1,taperSegmentCount:2,analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}},{id:"T2",start:"n1",end:"n2",length:3,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:2,taperSegmentCount:2,analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}}]};const r=run(model,[0,-1000,0]),d=build(model,r);return d.success&&d.taperedReport?.loadCases?.[0]?.members?.[0]?.segments?.length===2&&d.taperedReport.loadCases[0].members[0].segments[1].startStation_m===2;});
 add("no design approval or capacity claim",()=>{const m=make([0,0,0]),d=build(m,run(m));return d.designApproved===false&&d.capacityCalculated===false&&d.readyForCodeDesign===false;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests};
}
root.SteelSolverSectionForceDiagramBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
