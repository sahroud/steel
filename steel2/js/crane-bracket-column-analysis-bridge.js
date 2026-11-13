/* SAHROUD STEEL — explicit crane bracket/column demand to 3D solver bridge.
 * prepare() only validates and builds a case. runPrepared() solves only with allowSolve:true.
 * The model-3d analyze3D(loadCase) path accepts factors + nodalLoads and sends them to
 * the worker's SteelFrame3D nodal-load vector. No global analysis switch or design approval.
 */
(function(root){"use strict";
function prepare(input){
 const issues=[],api=root.SteelStructuralModel,model=input?.model||api?.getData?.();
 if(!api||typeof api.analyze3D!=="function")issues.push("SteelStructuralModel.analyze3D(loadCase) در دسترس نیست.");
 if(!api||typeof api.getData!=="function")issues.push("SteelStructuralModel.getData() در دسترس نیست.");
 const base=input?.baseLoadCase;
 if(!base||typeof base!=="object")issues.push("حالت بار پایه ارائه نشده است.");
 if(!base?.factors||!["dead","live","snow","wind"].every(k=>typeof base.factors[k]==="number"&&Number.isFinite(base.factors[k])))issues.push("ضرایب dead/live/snow/wind باید صریح و عددی باشند؛ مقدار نامشخص صفر فرض نمی‌شود.");
 const id=String(base?.id||base?.caseId||"");
 if(!id)issues.push("شناسه یکتای حالت بار پایه الزامی است.");
 const contract=root.SteelStructuralLoadChain?.auditSolverContract?.(api,model);
 if(!contract?.ready)issues.push(...(contract?.issues||["ممیزی قرارداد حل‌گر انجام نشد."]));
 const built=root.SteelCraneBracketColumnFEMAdapter?.buildLoadCase?.(model,base,input?.transferResult);
 if(!built?.success)issues.push(...(built?.issues||["آداپتور FEM تقاضای براکت ناموفق است."]));
 const ready=issues.length===0;
 return {success:ready,ready,caseId:id,loadCase:ready?built.loadCase:null,addedDemandCount:built?.addedDemandCount||0,
  aggregatedNodeCount:built?.aggregatedNodeCount||0,solverContract:contract||null,issues,
  analysisExecuted:false,analysisEnabled:false,designApproved:false,
  route:"crane wheel → rail → runway girder → bracket → column node → global six-DOF nodal load → 3D frame solver",
  note:"این مرحله فقط حالت بار حل‌گر را آماده می‌کند. اجرای تحلیل نیازمند فراخوانی جداگانه runPrepared با allowSolve:true است."};
}
function runPrepared(prepared,options){
 if(options?.allowSolve!==true)throw Error("اجرای حل‌گر مسدود است؛ فقط با تأیید صریح allowSolve:true اجرا می‌شود.");
 if(!prepared?.success||!prepared.ready||!prepared.loadCase||!prepared.caseId)throw Error("حالت بار آماده و معتبر برای حل وجود ندارد.");
 const chain=root.SteelStructuralLoadChain;
 if(!chain||typeof chain.run!=="function")throw Error("زنجیره استخراج واکنش و ممیزی تعادل بارگذاری نشده است.");
 return chain.run([{id:prepared.caseId,label:String(prepared.loadCase.label||prepared.caseId),loadCase:prepared.loadCase}]).then(result=>({success:result?.success===true,analysisExecuted:true,analysisEnabled:false,designApproved:false,caseId:prepared.caseId,addedDemandCount:prepared.addedDemandCount,aggregatedNodeCount:prepared.aggregatedNodeCount,result,scope:"حل خطی مرتبه اول واقعی از مسیر SteelStructuralModel.analyze3D و ممیزی واکنش/تعادل بار؛ بدون P-Delta، طراحی ظرفیت یا تأیید مهندسی."}));
}
function selfTest(){
 const tests=[],ck=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const old={api:root.SteelStructuralModel,chain:root.SteelStructuralLoadChain,adapter:root.SteelCraneBracketColumnFEMAdapter};
 const model={nodes:[{id:"BASE",x:0,y:0,z:0,kind:"base"},{id:"COL",x:0,y:5,z:0,kind:"column"}],members:[{id:"C1",start:"BASE",end:"COL"}]};
 const base={id:"CRANE-ULS-1",label:"جرثقیل ULS",factors:{dead:1.2,live:0,snow:0,wind:0},nodalLoads:[]};
 const transfer={success:true,transferType:"demand-only-global-coordinate",demands:[{connectionId:"BR-1",caseId:base.id,columnNodeId:"COL",coordinateSystem:"global",columnNodeCoordinate_m:[0,5,0],force_N:[1,2,3],momentAtColumnNode_Nm:[4,5,6],source:"test",document:"T-1"}]};
 try{
  root.SteelStructuralModel={getData:()=>model,analyze3D:async()=>({})};
  root.SteelStructuralLoadChain={auditSolverContract:()=>({ready:true,issues:[]}),run:async cases=>({success:true,caseCount:cases.length,received:cases[0]})};
  root.SteelCraneBracketColumnFEMAdapter={buildLoadCase:(m,b,t)=>({success:true,loadCase:{...b,nodalLoads:[{nodeId:"COL",values:[1,2,3,4,5,6]}]},addedDemandCount:1,aggregatedNodeCount:1,issues:[]})};
  ck("prepares case without executing solver",()=>{const r=prepare({baseLoadCase:base,transferResult:transfer});return r.success&&!r.analysisExecuted&&r.loadCase.nodalLoads.length===1;});
  ck("requires explicit complete load factors",()=>!prepare({baseLoadCase:{...base,factors:{dead:1}},transferResult:transfer}).success);
  ck("requires solver contract readiness",()=>{root.SteelStructuralLoadChain.auditSolverContract=()=>({ready:false,issues:["bad"]});return !prepare({baseLoadCase:base,transferResult:transfer}).success;});
  root.SteelStructuralLoadChain.auditSolverContract=()=>({ready:true,issues:[]});
  ck("blocks solve without explicit allowSolve",()=>{try{runPrepared({success:true,ready:true,caseId:"X",loadCase:base},{});return false;}catch(e){return true;}});
  ck("blocks solve for unready preparation",()=>{try{runPrepared({success:false,ready:false,caseId:"X",loadCase:base},{allowSolve:true});return false;}catch(e){return true;}});
 }finally{
  root.SteelStructuralModel=old.api;root.SteelStructuralLoadChain=old.chain;root.SteelCraneBracketColumnFEMAdapter=old.adapter;
 }
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelCraneBracketColumnAnalysisBridge={prepare,runPrepared,selfTest};
})(typeof window!=="undefined"?window:globalThis);
