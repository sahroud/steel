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
 const force=[0,0,0],momentAtOrigin=[0,0,0],nodalMomentSum=[0,0,0];
 rows.forEach(r=>{
  const v=r.solverReaction,p=r.coordinatesM;
  const f=[v.Fx,v.Fy,v.Fz],m=[v.Mx,v.My,v.Mz];
  for(let i=0;i<3;i++){force[i]+=f[i];nodalMomentSum[i]+=m[i];}
  // Move each nodal reaction moment to the common global origin: M0 = Mnode + r x F.
  momentAtOrigin[0]+=m[0]+p.y*f[2]-p.z*f[1];
  momentAtOrigin[1]+=m[1]+p.z*f[0]-p.x*f[2];
  momentAtOrigin[2]+=m[2]+p.x*f[1]-p.y*f[0];
 });
 return{rows,missingSupportNodeIds:missing,
  totalSolverReaction:{Fx:force[0],Fy:force[1],Fz:force[2],Mx:momentAtOrigin[0],My:momentAtOrigin[1],Mz:momentAtOrigin[2]},
  componentwiseNodalMomentSum:{Mx:nodalMomentSum[0],My:nodalMomentSum[1],Mz:nodalMomentSum[2]},
  resultantMomentReference:"global origin (0,0,0); includes r x F for every support node",
  units:{force:"N",moment:"N.m"}};
}
function buildExternalLoadLedger(model,solverMembers,nodalLoads){
 const issues=[],force=[0,0,0],moment=[0,0,0],memberRows=[],nodeRows=[];
 const nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 const add=(f,m,p)=>{for(let i=0;i<3;i++)force[i]+=f[i];moment[0]+=m[0]+p[1]*f[2]-p[2]*f[1];moment[1]+=m[1]+p[2]*f[0]-p[0]*f[2];moment[2]+=m[2]+p[0]*f[1]-p[1]*f[0];};
 if(!Array.isArray(solverMembers)||solverMembers.length!==(model?.members||[]).length)issues.push("تعداد اعضای دارای بارِ حل‌شده با مدل مبنا برابر نیست.");
 const memberMap=new Map((solverMembers||[]).map(m=>[String(m.id),m]));
 (model?.members||[]).forEach(m=>{
  const solved=memberMap.get(String(m.id)),q=solved?.analysisLoad?.globalUniform;
  if(!Array.isArray(q)||q.length!==3||q.some(v=>!finite(v))){issues.push("بار گسترده جهانی برای عضو "+m.id+" موجود/معتبر نیست.");return;}
  const ni=nodes.get(String(m.start)),nj=nodes.get(String(m.end));
  if(!ni||!nj){issues.push("مختصات گره‌های عضو "+m.id+" موجود نیست.");return;}
  const oi=m.endOffsets?.i||[0,0,0],oj=m.endOffsets?.j||[0,0,0];
  if(oi.length!==3||oj.length!==3||[...oi,...oj].some(v=>!finite(v))){issues.push("بازوی انتهایی عضو "+m.id+" نامعتبر است.");return;}
  const a=[ni.x+oi[0],ni.y+oi[1],ni.z+oi[2]],b=[nj.x+oj[0],nj.y+oj[1],nj.z+oj[2]];
  if([...a,...b].some(v=>!finite(v))){issues.push("مختصات هندسی عضو "+m.id+" نامعتبر است.");return;}
  const L=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  if(!(L>0)){issues.push("طول فیزیکی عضو "+m.id+" صفر/نامعتبر است.");return;}
  const f=q.map(v=>v*L),p=a.map((v,i)=>(v+b[i])/2),m0=[0,0,0];
  add(f,m0,p);memberRows.push({memberId:String(m.id),globalUniformNPerM:q.slice(),lengthM:L,resultantForceN:f,centroidM:p});
 });
 (nodalLoads||[]).forEach((load,index)=>{
  const n=nodes.get(String(load?.nodeId)),v=load?.values;
  if(!n||!Array.isArray(v)||v.length!==6||v.some(x=>!finite(x))){issues.push("بار گره‌ای شماره "+(index+1)+" ناقص یا نامعتبر است.");return;}
  const f=v.slice(0,3),m=v.slice(3,6),p=[n.x,n.y,n.z];
  if(p.some(x=>!finite(x))){issues.push("مختصات گره بارگذاری‌شده "+load.nodeId+" معتبر نیست.");return;}
  add(f,m,p);nodeRows.push({nodeId:String(load.nodeId),forceN:f,momentNm:m,coordinatesM:p});
 });
 const vnorm=v=>Math.hypot(...v);
 return{complete:issues.length===0,issues,memberCount:memberRows.length,nodalLoadCount:nodeRows.length,
  members:memberRows,nodalLoads:nodeRows,resultant:{forceN:force,momentNm:moment,momentReference:"global origin (0,0,0)"},
  method:"independent centroidal resultant of member globalUniform line loads plus explicit nodal loads; no solver assembled F vector used"};
}
function compareExternalLedger(ledger,equilibrium,tolerance=1e-6){
 const issues=[];
 if(!ledger?.complete)issues.push("دفتر بار خارجی کامل نیست.");
 if(!equilibrium||!Array.isArray(equilibrium.appliedForceN)||!Array.isArray(equilibrium.appliedMomentNm))issues.push("بردار بار اعمال‌شده حل‌گر برای تطبیق موجود نیست.");
 if(issues.length)return{ok:false,issues,forceRelativeDifference:null,momentRelativeDifference:null};
 const difference=(a,b)=>a.map((v,i)=>v-b[i]),norm=v=>Math.hypot(...v);
 const df=difference(ledger.resultant.forceN,equilibrium.appliedForceN),dm=difference(ledger.resultant.momentNm,equilibrium.appliedMomentNm);
 const rf=norm(df)/Math.max(norm(ledger.resultant.forceN),norm(equilibrium.appliedForceN),1);
 const rm=norm(dm)/Math.max(norm(ledger.resultant.momentNm),norm(equilibrium.appliedMomentNm),1);
 if(rf>tolerance)issues.push("برآیند مستقل نیرو با بردار بار اعمال‌شده حل‌گر تطبیق ندارد.");
 if(rm>tolerance)issues.push("برآیند مستقل لنگر با بردار بار اعمال‌شده حل‌گر تطبیق ندارد.");
 return{ok:issues.length===0,issues,forceDifferenceN:df,momentDifferenceNm:dm,forceRelativeDifference:rf,momentRelativeDifference:rm,tolerance,
  scope:"independent external-load resultant versus solver-reported applied resultant; not a full independent stiffness/load-vector assembly"};
}
function auditEquilibrium(eq,tolerance=1e-6){
 const issues=[];
 if(!eq||typeof eq!=="object")return{ok:false,issues:["گزارش تعادل حل‌گر موجود نیست."],relativeForceResidual:null,relativeMomentResidual:null};
 const vectorKeys=["appliedForceN","supportReactionN","forceResidualN","appliedMomentNm","supportMomentNm","momentResidualNm"];
 const vectors={};
 vectorKeys.forEach(k=>{
  const v=eq[k];
  if(!Array.isArray(v)||v.length!==3||v.some(x=>!finite(x)))issues.push("بردار تعادل سه‌مؤلفه‌ای نامعتبر/مفقود است: "+k);
  else vectors[k]=v;
 });
 const norm=v=>Math.hypot(...v);
 let forceRatio=null,momentRatio=null;
 if(vectorKeys.every(k=>vectors[k])){
  const fExpected=vectors.appliedForceN.map((v,i)=>v+vectors.supportReactionN[i]);
  const mExpected=vectors.appliedMomentNm.map((v,i)=>v+vectors.supportMomentNm[i]);
  const close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
  if(fExpected.some((v,i)=>!close(v,vectors.forceResidualN[i])))issues.push("بردار باقیمانده نیرو با جمع بار و واکنش سازگار نیست.");
  if(mExpected.some((v,i)=>!close(v,vectors.momentResidualNm[i])))issues.push("بردار باقیمانده لنگر با جمع بار و واکنش سازگار نیست.");
  forceRatio=norm(vectors.forceResidualN)/Math.max(norm(vectors.appliedForceN),norm(vectors.supportReactionN),1);
  momentRatio=norm(vectors.momentResidualNm)/Math.max(norm(vectors.appliedMomentNm),norm(vectors.supportMomentNm),1);
 }
 if(!finite(eq.relativeForceResidual)||!finite(eq.relativeMomentResidual))issues.push("شاخص نسبی تعادل معتبر/موجود نیست.");
 else if(forceRatio!==null&&(!closeNumber(eq.relativeForceResidual,forceRatio)||!closeNumber(eq.relativeMomentResidual,momentRatio)))issues.push("شاخص‌های نسبی گزارش‌شده با بردارهای تعادل سازگار نیستند.");
 if(forceRatio!==null&&forceRatio>tolerance)issues.push("باقیمانده نیروی نسبی از حد مجاز ممیزی بیشتر است.");
 if(momentRatio!==null&&momentRatio>tolerance)issues.push("باقیمانده لنگر نسبی از حد مجاز ممیزی بیشتر است.");
 if(eq.ok!==true)issues.push("حل‌گر تعادل کلی را تأیید نکرده است.");
 if(eq.ok===true&&(forceRatio===null||momentRatio===null))issues.push("پرچم موفقیت حل‌گر بدون بردارهای قابل ممیزی پذیرفته نمی‌شود.");
 return{ok:issues.length===0,issues,relativeForceResidual:forceRatio??eq.relativeForceResidual??null,relativeMomentResidual:momentRatio??eq.relativeMomentResidual??null,tolerance,method:"independent re-evaluation of returned global equilibrium vectors; not independent load assembly"};
}
function closeNumber(a,b){return Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));}
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
 ck("global support force resultant summed componentwise",()=>x.totalSolverReaction.Fx===90&&x.totalSolverReaction.Fy===180&&x.totalSolverReaction.Fz===270);
 ck("support moments transferred to common global origin",()=>x.totalSolverReaction.Mx===3&&x.totalSolverReaction.My===123&&x.totalSolverReaction.Mz===-77);
 ck("nodal moment sum retained separately",()=>x.componentwiseNodalMomentSum.Mx===3&&x.componentwiseNodalMomentSum.My===3&&x.componentwiseNodalMomentSum.Mz===3);
 ck("global resultant reference is explicit",()=>x.resultantMomentReference.includes("global origin"));
 ck("missing support reaction blocked",()=>{try{extractSupportReactions({reactions:[res.reactions[0]]},model);return false;}catch(e){return true;}});
 ck("duplicate reaction blocked",()=>{try{extractSupportReactions({reactions:[res.reactions[0],res.reactions[0],res.reactions[1]]},model);return false;}catch(e){return true;}});
 ck("nonfinite reaction blocked",()=>{try{extractSupportReactions({reactions:[{nodeId:"B1",values:[0,0,0,0,0,NaN]},{nodeId:"B2",values:[0,0,0,0,0,0]}]},model);return false;}catch(e){return true;}});
 const eqGood={ok:true,appliedForceN:[0,-1000,0],supportReactionN:[0,1000,0],forceResidualN:[0,0,0],appliedMomentNm:[0,0,0],supportMomentNm:[0,0,0],momentResidualNm:[0,0,0],relativeForceResidual:0,relativeMomentResidual:0};
 ck("failed equilibrium blocked",()=>!auditEquilibrium({...eqGood,ok:false}).ok);
 ck("missing equilibrium vectors blocked",()=>!auditEquilibrium({ok:true,relativeForceResidual:0,relativeMomentResidual:0}).ok);
 ck("high residual blocked despite solver ok flag",()=>!auditEquilibrium({...eqGood,appliedForceN:[0,-1000,0],supportReactionN:[0,900,0],forceResidualN:[0,-100,0],relativeForceResidual:0.1}).ok);
 ck("inconsistent residual vector blocked",()=>!auditEquilibrium({...eqGood,forceResidualN:[0,1,0]}).ok);
 ck("reported residual ratio mismatch blocked",()=>!auditEquilibrium({...eqGood,relativeForceResidual:0.25}).ok);
 ck("valid equilibrium vectors independently rechecked",()=>auditEquilibrium(eqGood).ok);
 const ledgerModel={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:4,y:0,z:0}],members:[{id:"M",start:"A",end:"B"}]};
 const ledger=buildExternalLoadLedger(ledgerModel,[{id:"M",analysisLoad:{globalUniform:[0,-100,0]}}],[{nodeId:"B",values:[10,0,0,0,0,5]}]);
 ck("independent ledger integrates member line load and nodal load",()=>ledger.complete&&ledger.memberCount===1&&ledger.nodalLoadCount===1&&ledger.resultant.forceN[0]===10&&ledger.resultant.forceN[1]===-400&&ledger.resultant.momentNm[2]===-795);
 const eqLedger={appliedForceN:[10,-400,0],appliedMomentNm:[0,0,20]};
 ck("external load ledger matches solver applied resultant",()=>compareExternalLedger(ledger,eqLedger).ok);
 ck("external load ledger mismatch is detected",()=>!compareExternalLedger(ledger,{...eqLedger,appliedForceN:[10,-390,0]}).ok);
 ck("missing member load prevents complete ledger",()=>!buildExternalLoadLedger(ledgerModel,[{id:"M"}],[]).complete);
 ck("demand-only status never implies design",()=>x.rows.every(r=>r.designStatus==="demand_only_not_designed")&&!("capacity" in x.rows[0]));
 ck("wind cases use directional adapter output",()=>typeof runDirectionalWind==="function"&&runDirectionalWind.toString().includes("SteelDirectionalWind3D"));
 ck("seismic cases use explicit seismic distributor input",()=>typeof runSeismic==="function"&&runSeismic.toString().includes("SteelSeismicEquivalentLateral"));
 return{passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelStructuralLoadChain={auditSolverContract,extractSupportReactions,auditEquilibrium,run,runDirectionalWind,runSeismic,selfTest};
})(typeof window!=="undefined"?window:globalThis);
