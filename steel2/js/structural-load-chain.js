/* SAHROUD STEEL — solver contract and foundation reaction bridge.
 * Reads the actual analyze3D(loadCase) contract; no shell elements, capacity checks,
 * anchor design, footing design, or approval are fabricated here.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const BASE_KINDS=new Set(["base","endwall-base"]);
function supportNodes(model){
 return (model?.nodes||[]).filter(n=>BASE_KINDS.has(String(n.kind||"")));
}
function auditSolverContract(api,model){
 const issues=[];
 if(!api||typeof api.analyze3D!=="function")issues.push("SteelStructuralModel.analyze3D(loadCase) در دسترس نیست.");
 if(!api||typeof api.getData!=="function")issues.push("SteelStructuralModel.getData() در دسترس نیست.");
 if(!Array.isArray(model?.nodes)||!Array.isArray(model?.members))issues.push("مدل باید آرایه گره‌ها و اعضا داشته باشد.");
 const ids=new Set();
 (model?.nodes||[]).forEach(n=>{const id=String(n?.id??"");if(!id||ids.has(id))issues.push("شناسه گره خالی یا تکراری است: "+id);ids.add(id);});
 const supports=supportNodes(model);
 if(!supports.length)issues.push("گره پایه با kind=base یا endwall-base در مدل پیدا نشد.");
 const memberIds=new Set();
 (model?.members||[]).forEach(m=>{const id=String(m?.id??"");if(!id||memberIds.has(id))issues.push("شناسه عضو خالی یا تکراری است: "+id);memberIds.add(id);if(!ids.has(String(m.start))||!ids.has(String(m.end)))issues.push("اتصال عضو "+id+" به گره موجود نیست.");});
 return{ready:issues.length===0,issues,nodeCount:model?.nodes?.length||0,memberCount:model?.members?.length||0,supportNodeIds:supports.map(n=>String(n.id)),contract:"analyze3D(loadCase) -> {reactions:[{nodeId,values[6]}],equilibrium:{ok,relativeForceResidual,relativeMomentResidual}}",units:{reactionForce:"N",reactionMoment:"N.m"},analysisEnabled:false,designApproved:false};
}
function extractSupportReactions(result,model){
 if(!result||!Array.isArray(result.reactions))throw Error("حل‌گر آرایه reactions را برنگردانده است.");
 const supports=supportNodes(model),byId=new Map();
 result.reactions.forEach(r=>{
  const id=String(r?.nodeId??"");
  if(!id)throw Error("واکنش با nodeId خالی دریافت شد.");
  if(byId.has(id))throw Error("واکنش تکراری برای گره "+id+" دریافت شد.");
  if(!Array.isArray(r.values)||r.values.length<6||r.values.slice(0,6).some(v=>!finite(v)))throw Error("واکنش شش‌مؤلفه‌ای معتبر نیست: "+id);
  byId.set(id,r.values.slice(0,6));
 });
 const missing=supports.filter(n=>!byId.has(String(n.id))).map(n=>String(n.id));
 if(missing.length)throw Error("واکنش برخی گره‌های پایه برنگشته است: "+missing.join("، "));
 const rows=supports.map(n=>{
  const reaction=byId.get(String(n.id));
  // Solver reaction is support-on-structure; the opposite is the column action
  // delivered to the base plate/anchors/foundation.
  const columnAction=reaction.map(v=>-v);
  return{nodeId:String(n.id),coordinatesM:{x:Number(n.x)||0,y:Number(n.y)||0,z:Number(n.z)||0},kind:n.kind,
   solverReaction:{Fx:reaction[0],Fy:reaction[1],Fz:reaction[2],Mx:reaction[3],My:reaction[4],Mz:reaction[5]},
   columnAction:{Fx:columnAction[0],Fy:columnAction[1],Fz:columnAction[2],Mx:columnAction[3],My:columnAction[4],Mz:columnAction[5]},
   units:{force:"N",moment:"N.m"},designStatus:"demand_only_not_designed"};
 });
 const sum=Array(6).fill(0);rows.forEach(r=>{const v=Object.values(r.solverReaction);v.forEach((x,i)=>sum[i]+=x);});
 return{rows,missingSupportNodeIds:missing,totalSolverReaction:{Fx:sum[0],Fy:sum[1],Fz:sum[2],Mx:sum[3],My:sum[4],Mz:sum[5]},units:{force:"N",moment:"N.m"}};
}
function auditEquilibrium(eq){
 const issues=[];
 if(!eq||eq.ok!==true)issues.push("حل‌گر تعادل کلی را تأیید نکرده است.");
 ["relativeForceResidual","relativeMomentResidual"].forEach(k=>{if(!finite(eq?.[k]))issues.push("شاخص تعادل معتبر/موجود نیست: "+k);});
 return{ok:issues.length===0,issues,relativeForceResidual:eq?.relativeForceResidual??null,relativeMomentResidual:eq?.relativeMomentResidual??null};
}
async function run(loadCases){
 const api=root.SteelStructuralModel,model=api?.getData?.();
 const contract=auditSolverContract(api,model);
 if(!contract.ready)throw Error("قرارداد حل‌گر/مدل ناقص است: "+contract.issues.join("؛ "));
 if(!Array.isArray(loadCases)||!loadCases.length)throw Error("حداقل یک حالت بار صریح لازم است.");
 const ids=new Set(),results=[];
 for(const spec of loadCases){
  if(!spec||typeof spec.id!=="string"||!spec.id.trim()||ids.has(spec.id))throw Error("شناسه حالت بار خالی یا تکراری است.");
  ids.add(spec.id);
  if(!Object.prototype.hasOwnProperty.call(spec,"loadCase"))throw Error("loadCase برای "+spec.id+" مشخص نشده است.");
  const solved=await api.analyze3D(spec.loadCase);
  const equilibrium=auditEquilibrium(solved?.equilibrium);
  if(!equilibrium.ok)throw Error("تعادل حالت "+spec.id+" تأیید نشد: "+equilibrium.issues.join("؛ "));
  const extracted=extractSupportReactions(solved,model);
  results.push({id:spec.id,label:String(spec.label||spec.id),equilibrium,reactions:extracted.rows,
   totalSolverReaction:extracted.totalSolverReaction,modelNodeCount:solved.nodeCount??model.nodes.length,
   modelMemberCount:solved.memberCount??model.members.length,
   solverResult:solved,foundationDemands:extracted.rows.map(r=>({nodeId:r.nodeId,coordinatesM:r.coordinatesM,actions:r.columnAction,units:r.units,
    status:"نیروهای تقاضا؛ نیازمند طراحی مستقل صفحه‌ستون، انکر و پی"}))});
 }
 return{success:true,contract,caseCount:results.length,results,
  allCasesEquilibriumOK:results.every(r=>r.equilibrium.ok),
  analysisEnabled:false,designApproved:false,
  scope:"پل استخراج واکنش و تقاضای پایه از قرارداد واقعی حل‌گر؛ بدون طراحی ظرفیت و بدون تأیید مهندسی."};
}
async function runDirectionalWind(){
 const wind=root.SteelDirectionalWind3D;
 if(!wind||typeof wind.createCases!=="function")throw Error("سازنده حالت‌های باد جهت‌دار در دسترس نیست.");
 const built=wind.createCases();
 return run(built.cases.map(c=>({id:c.id,label:c.label,loadCase:c})));
}
async function runSeismic(input){
 const seismic=root.SteelSeismicEquivalentLateral,api=root.SteelStructuralModel,model=api?.getData?.();
 if(!seismic||typeof seismic.createCases!=="function")throw Error("توزیع‌کننده زلزله در دسترس نیست.");
 const built=seismic.createCases(input,model);
 return run(built.cases.map(c=>({id:c.id,label:c.label,loadCase:c})));
}
function selfTest(){
 const tests=[],ck=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"},{id:"B2",x:4,y:0,z:0,kind:"endwall-base"},{id:"N",x:0,y:3,z:0,kind:"frame"}],members:[{id:"C1",start:"B1",end:"N"},{id:"C2",start:"B2",end:"N"}]};
 const api={analyze3D(){},getData(){return model;}};
 ck("solver contract accepted",()=>auditSolverContract(api,model).ready);
 ck("missing solver blocked",()=>!auditSolverContract({},model).ready);
 ck("missing base nodes blocked",()=>!auditSolverContract(api,{nodes:[{id:"N"}],members:[]}).ready);
 ck("duplicate node blocked",()=>!auditSolverContract(api,{nodes:[{id:"B",kind:"base"},{id:"B",kind:"base"}],members:[]}).ready);
 const res={reactions:[{nodeId:"B1",values:[100,200,300,4,5,6]},{nodeId:"B2",values:[-10,-20,-30,-1,-2,-3]}]};
 const x=extractSupportReactions(res,model);
 ck("all support reactions extracted",()=>x.rows.length===2&&x.rows[0].nodeId==="B1");
 ck("base action is opposite solver reaction",()=>x.rows[0].columnAction.Fy===-200&&x.rows[1].columnAction.Mz===3);
 ck("global support resultant summed componentwise",()=>x.totalSolverReaction.Fx===90&&x.totalSolverReaction.Mz===3);
 ck("missing support reaction blocked",()=>{try{extractSupportReactions({reactions:[res.reactions[0]]},model);return false;}catch(e){return true;}});
 ck("duplicate reaction blocked",()=>{try{extractSupportReactions({reactions:[res.reactions[0],res.reactions[0],res.reactions[1]]},model);return false;}catch(e){return true;}});
 ck("nonfinite reaction blocked",()=>{try{extractSupportReactions({reactions:[{nodeId:"B1",values:[0,0,0,0,0,NaN]},{nodeId:"B2",values:[0,0,0,0,0,0]}]},model);return false;}catch(e){return true;}});
 ck("failed equilibrium blocked",()=>!auditEquilibrium({ok:false,relativeForceResidual:0,relativeMomentResidual:0}).ok);
 ck("missing equilibrium metrics blocked",()=>!auditEquilibrium({ok:true}).ok);
 ck("valid equilibrium accepted",()=>auditEquilibrium({ok:true,relativeForceResidual:1e-10,relativeMomentResidual:2e-10}).ok);
 ck("demand-only status never implies design",()=>x.rows.every(r=>r.designStatus==="demand_only_not_designed")&&!("capacity" in x.rows[0]));
 ck("wind cases use directional adapter output",()=>typeof runDirectionalWind==="function"&&runDirectionalWind.toString().includes("SteelDirectionalWind3D"));
 ck("seismic cases use explicit seismic distributor input",()=>typeof runSeismic==="function"&&runSeismic.toString().includes("SteelSeismicEquivalentLateral"));
 return{passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelStructuralLoadChain={auditSolverContract,extractSupportReactions,auditEquilibrium,run,runDirectionalWind,runSeismic,selfTest};
})(typeof window!=="undefined"?window:globalThis);
