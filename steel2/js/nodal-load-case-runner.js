/* SAHROUD STEEL — isolated, fail-closed nodal load-case solver runner.
 * Converts only explicit global nodal forces/moments to SI and runs a cloned model.
 * No project mutation, no combination factors, no design approval.
 */
(function(root){"use strict";
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const forceFactor={N:1,kN:1000},momentFactor={"N.m":1,"kN.m":1000};
function validateCase(c,model){
 const issues=[];
 if(!c||c.type!=="nodal")issues.push("فقط حالت بار گره‌ای پشتیبانی می‌شود.");
 if(c?.coordinateSystem!=="global")issues.push("فقط دستگاه مختصات global پشتیبانی می‌شود.");
 if(!c?.id||!c?.target?.startsWith("node:"))issues.push("شناسه حالت و مقصد node:<id> الزامی است.");
 if(!forceFactor[c?.forceUnit])issues.push("واحد نیرو باید N یا kN باشد.");
 if(!momentFactor[c?.momentUnit])issues.push("واحد لنگر باید N.m یا kN.m باشد.");
 const s=c?.source||{};
 if(!s.document||!s.revision||!s.locator||!s.authority)issues.push("ردیابی کامل سند، ویرایش، محل دقیق و مرجع لازم است.");
 const values=c?.values;
 const keys=["Fx","Fy","Fz","Mx","My","Mz"];
 if(!values||typeof values!=="object"||Array.isArray(values)||keys.some(k=>!finite(values[k]))||Object.keys(values).some(k=>!keys.includes(k)))issues.push("مقادیر باید دقیقاً شش مؤلفه عددی متناهی Fx,Fy,Fz,Mx,My,Mz باشند؛ صفرها نیز صریح ثبت شوند.");
 const nodeId=c?.target?.slice(5);
 if(!Array.isArray(model?.nodes)||!model.nodes.some(n=>String(n.id)===nodeId))issues.push("گره مقصد در مدل فعال پیدا نشد.");
 if(!Array.isArray(model?.members)||!model.members.length)issues.push("مدل باید اعضای سازه‌ای داشته باشد.");
 if(Array.isArray(model?.members)&&model.members.some(m=>!Array.isArray(m.analysisLoad?.uniformLocal)||m.analysisLoad.uniformLocal.length!==3||m.analysisLoad.uniformLocal.some(v=>!finite(v))))issues.push("بار گسترده هر عضو باید در مدل صریحاً با سه مؤلفه محلی ثبت شده باشد؛ بار صفر را نیز صریح وارد کنید.");
 return {success:issues.length===0,issues,nodeId};
}
function run(model,loadCase,options){
 const gate=validateCase(loadCase,model);
 if(!gate.success)return {success:false,status:"blocked",issues:gate.issues,designApproved:false,solverEnabled:false};
 if(!root.SteelFrame3D?.analyze)return {success:false,status:"blocked",issues:["حل‌گر سه‌بعدی بارگذاری نشده است."],designApproved:false,solverEnabled:false};
 if(!options||options.runSolver!==true||typeof options.sectionResolver!=="function"||!Array.isArray(options.supports)||!options.supports.length)
  return {success:false,status:"blocked",issues:["اجرای صریح runSolver:true، تابع تخصیص مقطع و تکیه‌گاه‌های مستند الزامی است."],designApproved:false,solverEnabled:false};
 const nodeId=gate.nodeId,v=loadCase.values;
 const nodalLoad={nodeId,values:[v.Fx*forceFactor[loadCase.forceUnit],v.Fy*forceFactor[loadCase.forceUnit],v.Fz*forceFactor[loadCase.forceUnit],v.Mx*momentFactor[loadCase.momentUnit],v.My*momentFactor[loadCase.momentUnit],v.Mz*momentFactor[loadCase.momentUnit]]};
 const isolated=clone(model);
 try{
  const result=root.SteelFrame3D.analyze(isolated,{supports:clone(options.supports),sectionResolver:options.sectionResolver,nodalLoads:[nodalLoad],requireExplicitMemberLoads:true,referenceAxis:options.referenceAxis});
  if(!result?.success||!result.equilibrium?.ok)return {success:false,status:"analysis_failed",issues:["حل‌گر موفق نشد یا تعادل نیرو/لنگر برقرار نیست."],solverResult:result||null,designApproved:false,solverEnabled:false};
  const simultaneousCase={caseId:loadCase.id,source:clone(loadCase.source),equilibriumOk:true,members:result.members.map(m=>({id:m.id,endI:{Fx:m.localEndForces[0],Fy:m.localEndForces[1],Fz:m.localEndForces[2],Mx:m.localEndForces[3],My:m.localEndForces[4],Mz:m.localEndForces[5]},endJ:{Fx:m.localEndForces[6],Fy:m.localEndForces[7],Fz:m.localEndForces[8],Mx:m.localEndForces[9],My:m.localEndForces[10],Mz:m.localEndForces[11]},parentMemberId:m.parentMemberId,taperSegmentIndex:m.taperSegmentIndex,taperSegmentCount:m.taperSegmentCount}))};
  return {success:true,status:"isolated_analysis_proposal",caseId:loadCase.id,units:"N,m,Pa",nodalLoad,solverResult:result,simultaneousActionCase:simultaneousCase,designApproved:false,solverEnabled:false,activeProjectMutated:false,limitations:["فقط بار گره‌ای سراسری؛ بارهای عضو، سطحی، جرثقیل، دما، نشست و ترکیب بار پشتیبانی نمی‌شوند.","حل‌گر خطی مرتبه اول است و اثرات مرتبه دوم، کمانش و کنترل آیین‌نامه‌ای را انجام نمی‌دهد.","نتیجه صرفاً پیشنهاد تحلیل ایزوله است و تأیید طراحی محسوب نمی‌شود."]};
 }catch(e){return {success:false,status:"analysis_failed",issues:[String(e.message||e)],designApproved:false,solverEnabled:false};}
}
function selfTest(){
 const section={E:200e9,G:77e9,A:.01,Iy:8e-5,Iz:2e-5,J:1e-5};
 const model={nodes:[{id:"FIX",x:0,y:0,z:0},{id:"TIP",x:3,y:0,z:0}],members:[{id:"M1",start:"FIX",end:"TIP",type:"validation",analysisLoad:{uniformLocal:[0,0,0]}}]};
 const supports=[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}];
 const base={id:"LC-1",type:"nodal",coordinateSystem:"global",target:"node:TIP",forceUnit:"kN",momentUnit:"kN.m",values:{Fx:0,Fy:-1,Fz:0,Mx:0,My:0,Mz:0},source:{document:"calc.pdf",revision:"R1",locator:"p.2",authority:"Designer"}};
 const opts={runSolver:true,supports,sectionResolver:()=>section};
 const tests=[
 ["kN converted to N",()=>run(model,base,opts).nodalLoad?.values[1]===-1000],
 ["kN.m converted to N.m",()=>run(model,{...base,values:{...base.values,Fx:0,Fy:0,Mz:2}},opts).nodalLoad?.values[5]===2000],
 ["unsupported load type blocked",()=>!run(model,{...base,type:"crane_wheel"},opts).success],
 ["local coordinate system blocked",()=>!run(model,{...base,coordinateSystem:"member-local"},opts).success],
 ["missing node blocked",()=>!run(model,{...base,target:"node:ABSENT"},opts).success],
 ["missing source blocked",()=>!run(model,{...base,source:{document:"x"}},opts).success],
 ["missing explicit zero member load blocked",()=>!run({nodes:model.nodes,members:[{...model.members[0],analysisLoad:undefined}]},base,opts).success],
 ["solver opt-in required",()=>!run(model,base,{...opts,runSolver:false}).success],
 ["analysis equilibrium and simultaneous end vectors",()=>{const r=run(model,base,opts);return r.success&&r.solverResult.equilibrium.ok&&r.simultaneousActionCase.members[0].endI&&r.simultaneousActionCase.members[0].endJ;}],
 ["model not mutated",()=>{const before=JSON.stringify(model);run(model,base,opts);return JSON.stringify(model)===before;}],
 ["no design approval",()=>run(model,base,opts).designApproved===false]
 ];
 const results=tests.map(([name,fn])=>{try{return{name,ok:!!fn()};}catch(e){return{name,ok:false,error:String(e.message||e)};}});
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelNodalLoadCaseRunner={validateCase,run,selfTest};
})(typeof window!=="undefined"?window:globalThis);
