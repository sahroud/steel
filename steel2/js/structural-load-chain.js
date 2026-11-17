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
 (model?.nodes||[]).forEach(n=>{const id=String(n?.id??"");if(!id||ids.has(id))issues.push("شناسه گره خالی یا تکراری است: "+id);ids.add(id);if(![n?.x,n?.y,n?.z].every(finite))issues.push("مختصات سه‌بعدی گره "+(id||"?")+" ناقص یا نامعتبر است.");});
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
  if(![n.x,n.y,n.z].every(finite))throw Error("مختصات گره پایه "+String(n.id)+" باید سه مؤلفه عددی معتبر داشته باشد.");
  return{nodeId:String(n.id),coordinatesM:{x:n.x,y:n.y,z:n.z},kind:n.kind,
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
function buildExternalLoadLedger(model,solverMembers,nodalLoads,releasedRotationLoads){
 const issues=[],force=[0,0,0],moment=[0,0,0],memberRows=[],nodeRows=[],releasedRows=[];
 const nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 const solvedById=new Map((solverMembers||[]).map(m=>[String(m.id),m]));
 const sourceMembers=Array.isArray(model?.members)?model.members:[];
 const add=(f,m,p)=>{for(let i=0;i<3;i++)force[i]+=f[i];moment[0]+=m[0]+p[1]*f[2]-p[2]*f[1];moment[1]+=m[1]+p[2]*f[0]-p[0]*f[2];moment[2]+=m[2]+p[0]*f[1]-p[1]*f[0];};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 if(!Array.isArray(solverMembers)||!solverMembers.length)issues.push("فهرست اعضای حل‌شده خالی است.");
 if(!sourceMembers.length)issues.push("فهرست اعضای فیزیکی مدل خالی است.");
 const solvedIds=new Set((solverMembers||[]).map(m=>String(m.id)));
 sourceMembers.forEach((source,index)=>{
  const id=String(source?.id??"").trim(),solved=solvedById.get(id),ledger=source?.analysisLoad||{};
  if(!id||!solved){issues.push("عضو مدل "+(id||index+1)+" در خروجی حل‌گر متناظر ندارد.");return;}
  if(ledger.loadDataComplete!==true&&source.loadDataComplete!==true){issues.push("کامل‌بودن دفتر بار عضو "+id+" صریحاً تأیید نشده است.");return;}
  const ni=nodes.get(String(source.start)),nj=nodes.get(String(source.end));
  if(!ni||!nj){issues.push("گره‌های عضو "+id+" در مدل موجود نیستند.");return;}
  const oi=source.endOffsets?.i||[0,0,0],oj=source.endOffsets?.j||[0,0,0];
  if(oi.length!==3||oj.length!==3||[...oi,...oj].some(v=>!finite(v))){issues.push("بازوی انتهایی عضو "+id+" نامعتبر است.");return;}
  const a=[ni.x+oi[0],ni.y+oi[1],ni.z+oi[2]],b=[nj.x+oj[0],nj.y+oj[1],nj.z+oj[2]];
  if([...a,...b].some(v=>!finite(v))){issues.push("مختصات هندسی عضو "+id+" نامعتبر است.");return;}
  const delta=b.map((v,i)=>v-a[i]),L=Math.hypot(...delta);
  if(!(L>0)){issues.push("طول فیزیکی عضو "+id+" صفر/نامعتبر است.");return;}
  const ex=delta.map(v=>v/L),axes=solved.localAxes;
  const basis=axes&&[axes.x,axes.y,axes.z];
  if(!basis||basis.length!==3||basis.some(v=>!Array.isArray(v)||v.length!==3||v.some(x=>!finite(x)))){
   issues.push("محورهای محلی حل‌شده عضو "+id+" برای تبدیل مستقل بار محلی به جهانی موجود/معتبر نیست.");return;
  }
  const transform=q=>[0,1,2].map(g=>q.reduce((sum,v,k)=>sum+v*basis[k][g],0));
  const uniform=ledger.uniformLocal;
  if(!Array.isArray(uniform)||uniform.length!==3||uniform.some(v=>!finite(v))){issues.push("سه مؤلفه بار یکنواخت محلی عضو "+id+" باید صریح و متناهی باشد.");return;}
  const linear=ledger.linearLocal;
  if(linear!==undefined&&linear!==null&&(!Array.isArray(linear.start)||linear.start.length!==3||linear.start.some(v=>!finite(v))||!Array.isArray(linear.end)||linear.end.length!==3||linear.end.some(v=>!finite(v)))){
   issues.push("بار خطی‌متغیر محلی عضو "+id+" باید دو بردار سه‌مؤلفه‌ای متناهی داشته باشد.");return;
  }
  const q0=uniform.map((v,i)=>v+(linear?Number(linear.start[i]):0)),q1=uniform.map((v,i)=>v+(linear?Number(linear.end[i]):0));
  const resultantLocal=q0.map((v,i)=>L*(v+q1[i])/2);
  const firstMomentLocal=q0.map((v,i)=>L*L*(v+2*q1[i])/6);
  const resultant=transform(resultantLocal),firstMoment=transform(firstMomentLocal);
  const distributedMoment=cross(ex,firstMoment);
  const centroidMoment=cross(a,resultant);
  add(resultant,distributedMoment.map((v,i)=>v+centroidMoment[i]),[0,0,0]);
  memberRows.push({memberId:id,sourceMemberPresent:true,localUniformNPerM:q0,localLinearEndNPerM:linear?linear.end.map(Number):null,
   localResultantN:resultantLocal,globalResultantN:resultant,globalFirstMomentAboutStartNm:firstMoment,
   distributedMomentAboutGlobalOriginNm:distributedMoment.map((v,i)=>v+centroidMoment[i]),lengthM:L,localAxes:basis});
 });
 (solverMembers||[]).forEach(solved=>{if(!sourceMembers.some(m=>String(m.id)===String(solved.id)))issues.push("عضو حل‌شده "+String(solved.id)+" در مدل فیزیکی منبع وجود ندارد.");});
 (nodalLoads||[]).forEach((load,index)=>{
  const n=nodes.get(String(load?.nodeId)),v=load?.values;
  if(!n||!Array.isArray(v)||v.length!==6||v.some(x=>!finite(x))){issues.push("بار گره‌ای شماره "+(index+1)+" ناقص یا نامعتبر است.");return;}
  const f=v.slice(0,3),m=v.slice(3,6),p=[n.x,n.y,n.z];
  if(p.some(x=>!finite(x))){issues.push("مختصات گره بارگذاری‌شده "+load.nodeId+" معتبر نیست.");return;}
  add(f,m,p);nodeRows.push({nodeId:String(load.nodeId),forceN:f,momentNm:m,coordinatesM:p});
 });
 (releasedRotationLoads||[]).forEach((load,index)=>{
  const n=nodes.get(String(load?.nodeId)),m=load?.momentNm;
  if(!n||!Array.isArray(m)||m.length!==3||m.some(x=>!finite(x))){issues.push("بار معادل دوران آزادشده شماره "+(index+1)+" ناقص یا نامعتبر است.");return;}
  const p=[n.x,n.y,n.z];if(p.some(x=>!finite(x))){issues.push("مختصات گره دوران آزادشده "+load.nodeId+" نامعتبر است.");return;}
  add([0,0,0],m,p);releasedRows.push({nodeId:String(load.nodeId),memberId:String(load.memberId||""),end:String(load.end||""),momentNm:m.slice(),coordinatesM:p});
 });
 return{complete:issues.length===0,issues,memberCount:memberRows.length,nodalLoadCount:nodeRows.length,releasedRotationLoadCount:releasedRows.length,
  members:memberRows,nodalLoads:nodeRows,releasedRotationLoads:releasedRows,resultant:{forceN:force,momentNm:moment,momentReference:"global origin (0,0,0)"},
  method:"independent integration of explicit uniform and linearly varying local member-load vectors using solved local axes, plus explicit nodal and released-rotation loads; not a full FE load-vector reconstruction"};
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
  const externalLoadLedger=buildExternalLoadLedger(model,solved.members,spec.loadCase?.nodalLoads||[],solved.equivalentReleasedRotationLoads||[]);
  const externalLoadLedgerComparison=compareExternalLedger(externalLoadLedger,solved.equilibrium);
  results.push({id:spec.id,label:String(spec.label||spec.id),equilibrium,reactions:extracted.rows,externalLoadLedger,externalLoadLedgerComparison,
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
async function runMemberDesignPipeline(loadCaseSpecs,options){
 options=options||{};
 const issues=[];
 const specs=Array.isArray(loadCaseSpecs)?loadCaseSpecs:[];
 const expected=Array.isArray(options.expectedMemberIds)?options.expectedMemberIds.map(String):[];
 const combinationSet=options.combinationSet||root.SteelLoadCaseWorkbench?.read?.();
 if(!specs.length)issues.push("برای زنجیره طراحی، حالت‌های بار حل‌شونده باید صریحاً ارائه شوند.");
 if(!expected.length)issues.push("فهرست شناسه اعضای فیزیکی مورد انتظار الزامی است.");
 if(!combinationSet||!Array.isArray(combinationSet.loadCases)||!Array.isArray(combinationSet.combinations))
  issues.push("دفترچه حالت‌ها و ترکیبات بار در دسترس نیست.");
 const seen=new Set();
 specs.forEach(s=>{
  const id=String(s?.id??"").trim();
  if(typeof s?.id!=="string"||!id||seen.has(id))issues.push("شناسه حالت بار باید رشته‌ای، غیرخالی و یکتا باشد: "+id);
  seen.add(id);
  const src=s?.source||{};
  ["document","revision","locator","authority"].forEach(k=>{
   if(typeof src[k]!=="string"||!src[k].trim())issues.push("مدرک حالت "+(id||"?")+" فاقد "+k+" است.");
  });
  if(!Object.prototype.hasOwnProperty.call(s||{},"loadCase"))issues.push("ورودی حل‌گر برای حالت "+(id||"?")+" مشخص نشده است.");
 });
 if(new Set(expected).size!==expected.length)issues.push("شناسه اعضای مورد انتظار تکراری است.");
 const comboCases=(combinationSet?.loadCases||[]).map(c=>String(c?.id??""));
 const comboIds=new Set(comboCases);
 comboCases.forEach(id=>{if(!seen.has(id))issues.push("حالت "+(id||"?")+" در دفترچه ترکیبات ثبت شده ولی خروجی حل‌شده متناظر ندارد.");});
 (combinationSet?.combinations||[]).forEach(c=>{
  Object.keys(c?.factors||{}).forEach(id=>{
   if(!seen.has(id))issues.push("حالت "+id+" که در ترکیب "+String(c?.id||"?")+" استفاده شده، در ورودی حل‌گر وجود ندارد.");
   if(!comboIds.has(id))issues.push("حالت "+id+" در دفترچه ترکیبات ثبت نشده است.");
  });
 });
 if(!root.SteelMemberDesignDemandPackage?.buildFromSolverCases)
  issues.push("بسته تقاضای اعضا بارگذاری نشده است.");
 if(!root.SteelMemberDemandCombinationBridge?.build)
  issues.push("پل ترکیب تقاضای اعضا بارگذاری نشده است.");
 const assumptions=options.assumptions||{};
 ["sameModelRevision","sameGeometry","sameSupports","sameStiffnessModel","linearElasticFirstOrder"].forEach(k=>{
  if(assumptions[k]!==true)issues.push("فرض تحلیل باید صریحاً تأیید شود: "+k);
 });
 if(issues.length)return{success:false,status:"blocked-before-analysis",issues,analysisEnabled:false,designApproved:false};
 try{
  const solved=await run(specs);
  const sourceById=new Map(specs.map(s=>[s.id,s.source]));
  const runnerCases=solved.results.map(row=>({
   ...row.solverResult,
   simultaneousActionCase:{caseId:row.id,source:sourceById.get(row.id)}
  }));
  const model=root.SteelStructuralModel?.getData?.();
  const demand=root.SteelMemberDesignDemandPackage.buildFromSolverCases(model,runnerCases,{expectedMemberIds:expected});
  if(demand.success!==true)return{success:false,status:"member-demand-evidence-incomplete",issues:demand.issues||["بسته تقاضای اعضا کامل نشد."],loadCaseCount:solved.caseCount,demand,analysisEnabled:false,designApproved:false};
  const proposal=root.SteelMemberDemandCombinationBridge.build(demand,combinationSet,assumptions);
  const loadLedgerVerified=solved.results.every(r=>r.externalLoadLedger?.complete===true&&r.externalLoadLedgerComparison?.ok===true);
  return{
   success:proposal.success===true&&loadLedgerVerified,
   status:!loadLedgerVerified?"load-ledger-audit-incomplete":(proposal.success?"combined-member-demand-proposal":"combination-proposal-incomplete"),
   caseCount:solved.caseCount,
   equilibriumAudit:solved.results.map(r=>({id:r.id,ok:r.equilibrium.ok,externalLoadLedgerComplete:r.externalLoadLedger.complete,externalLoadLedgerMatchesSolver:r.externalLoadLedgerComparison.ok})),
   demandPackage:demand,
   combinationProposal:proposal,
   issues:[...(proposal.issues||[]),...(!loadLedgerVerified?["دفتر بار خارجی و تطبیق مستقل آن با بردار بار اعمال‌شده در یک یا چند حالت کامل/منطبق نیست؛ پیشنهاد ترکیب برای طراحی قابل پذیرش نیست."]:[])],
   capacityCalculated:false,
   codeChecksCalculated:false,
   analysisEnabled:false,
   designApproved:false,
   nextRequired:"تبدیل قرارداد علامت و محورها برای هر خانواده عضو، سپس کنترل مقاومت، پایداری، تغییرمکان و اتصالات با مبنای آیین‌نامه‌ای تأییدشده."
  };
 }catch(error){
  return{success:false,status:"solver-or-demand-failure",issues:[String(error?.message||error)],analysisEnabled:false,designApproved:false};
 }
}
function auditSolverLoadTransfer(model,solverResult,nodalLoads){
 const issues=[];
 if(!solverResult||solverResult.success!==true)issues.push("خروجی موفق حل‌گر برای ممیزی انتقال بار موجود نیست.");
 const ledger=buildExternalLoadLedger(model,solverResult?.members,nodalLoads,solverResult?.equivalentReleasedRotationLoads);
 if(!ledger.complete)issues.push(...ledger.issues);
 const comparison=compareExternalLedger(ledger,solverResult?.equilibrium);
 if(!comparison.ok)issues.push(...comparison.issues);
 const equilibrium=auditEquilibrium(solverResult?.equilibrium);
 if(!equilibrium.ok)issues.push(...equilibrium.issues);
 return{success:issues.length===0,status:issues.length?"incomplete-or-mismatch":"verified",
  issues,externalLoadLedger:ledger,solverAppliedResultantComparison:comparison,
  supportReactionEquilibrium:equilibrium,analysisEnabled:false,designApproved:false,
  scope:"مقایسه مستقل برآیند بارهای صریح عضو/گره/دوران آزادشده با برآیند اعمال‌شده گزارش‌شده حل‌گر و کنترل تعادل واکنش‌ها؛ نه بازسازی مستقل کامل بردار سختی/بار FEM"};
}
function selfTest(){
 const tests=[],ck=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"},{id:"B2",x:4,y:0,z:0,kind:"endwall-base"},{id:"N",x:0,y:3,z:0,kind:"frame"}],members:[{id:"C1",start:"B1",end:"N"},{id:"C2",start:"B2",end:"N"}]};
 const api={analyze3D(){},getData(){return model;}};
 ck("solver contract accepted",()=>auditSolverContract(api,model).ready);
 ck("missing solver blocked",()=>!auditSolverContract({},model).ready);
 ck("missing base nodes blocked",()=>!auditSolverContract(api,{nodes:[{id:"N"}],members:[]}).ready);
  ck("nonfinite model node coordinates blocked",()=>!auditSolverContract(api,{nodes:[{id:"B",x:0,y:0,z:NaN,kind:"base"}],members:[]}).ready);
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
  ck("missing support coordinate blocked instead of silently replacing it with zero",()=>{try{extractSupportReactions(res,{...model,nodes:model.nodes.map(n=>n.id==="B1"?{...n,x:undefined}:n)});return false;}catch(e){return true;}});
 ck("duplicate reaction blocked",()=>{try{extractSupportReactions({reactions:[res.reactions[0],res.reactions[0],res.reactions[1]]},model);return false;}catch(e){return true;}});
 ck("nonfinite reaction blocked",()=>{try{extractSupportReactions({reactions:[{nodeId:"B1",values:[0,0,0,0,0,NaN]},{nodeId:"B2",values:[0,0,0,0,0,0]}]},model);return false;}catch(e){return true;}});
 const eqGood={ok:true,appliedForceN:[0,-1000,0],supportReactionN:[0,1000,0],forceResidualN:[0,0,0],appliedMomentNm:[0,0,0],supportMomentNm:[0,0,0],momentResidualNm:[0,0,0],relativeForceResidual:0,relativeMomentResidual:0};
 ck("failed equilibrium blocked",()=>!auditEquilibrium({...eqGood,ok:false}).ok);
 ck("missing equilibrium vectors blocked",()=>!auditEquilibrium({ok:true,relativeForceResidual:0,relativeMomentResidual:0}).ok);
 ck("high residual blocked despite solver ok flag",()=>!auditEquilibrium({...eqGood,appliedForceN:[0,-1000,0],supportReactionN:[0,900,0],forceResidualN:[0,-100,0],relativeForceResidual:0.1}).ok);
 ck("inconsistent residual vector blocked",()=>!auditEquilibrium({...eqGood,forceResidualN:[0,1,0]}).ok);
 ck("reported residual ratio mismatch blocked",()=>!auditEquilibrium({...eqGood,relativeForceResidual:0.25}).ok);
 ck("valid equilibrium vectors independently rechecked",()=>auditEquilibrium(eqGood).ok);
 const ledgerModel={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:4,y:0,z:0}],members:[{id:"M",start:"A",end:"B",analysisLoad:{loadDataComplete:true,uniformLocal:[0,-100,0],linearLocal:{start:[0,0,0],end:[0,-200,0]}}}]};
 const ledger=buildExternalLoadLedger(ledgerModel,[{id:"M",start:"A",end:"B",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}],[{nodeId:"B",values:[10,0,0,0,0,5]}],[{nodeId:"A",memberId:"M",end:"i",momentNm:[0,0,7]}]);
 ck("ledger integrates explicit uniform plus linear local member loads from source model",()=>ledger.complete&&ledger.memberCount===1&&ledger.resultant.forceN[0]===10&&ledger.resultant.forceN[1]===-800&&ledger.resultant.forceN[2]===0&&Math.abs(ledger.resultant.momentNm[2]+1854.6666666666667)<1e-8);
 const rotatedLedger=buildExternalLoadLedger({nodes:ledgerModel.nodes,members:[{id:"M",start:"A",end:"B",analysisLoad:{loadDataComplete:true,uniformLocal:[0,-100,0]}}]},[{id:"M",localAxes:{x:[1,0,0],y:[0,0,1],z:[0,-1,0]}}],[],[]);
 ck("local member load transformed through actual solver axes",()=>rotatedLedger.complete&&rotatedLedger.resultant.forceN[2]===-400);
 ck("missing member load prevents complete ledger",()=>!buildExternalLoadLedger({nodes:ledgerModel.nodes,members:[{id:"M",start:"A",end:"B",analysisLoad:{loadDataComplete:true}}]},[{id:"M",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}],[]).complete);
 const eqLedger={appliedForceN:[10,-800,0],appliedMomentNm:[0,0,-1854.6666666666667]};
 ck("external load ledger matches solver applied resultant",()=>compareExternalLedger(ledger,eqLedger).ok);
 ck("external load ledger mismatch is detected",()=>!compareExternalLedger(ledger,{...eqLedger,appliedForceN:[10,-390,0]}).ok);
 ck("missing member load prevents complete ledger",()=>!buildExternalLoadLedger(ledgerModel,[{id:"M"}],[]).complete);
 const integratedFixture={success:true,members:[{id:"M",start:"A",end:"B",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}],equivalentReleasedRotationLoads:[],equilibrium:{...eqLedger,supportReactionN:[-10,800,0],forceResidualN:[0,0,0],supportMomentNm:[0,1854.6666666666667,0],momentResidualNm:[0,0,0],relativeForceResidual:0,relativeMomentResidual:0,ok:true}};
 ck("integrated load-transfer audit compares ledger, solver resultant and support equilibrium",()=>auditSolverLoadTransfer(ledgerModel,integratedFixture,[{nodeId:"B",values:[10,0,0,0,0,5]}]).success);
 ck("integrated load-transfer audit blocks solver-resultant mismatch",()=>!auditSolverLoadTransfer(ledgerModel,{...integratedFixture,equilibrium:{...integratedFixture.equilibrium,appliedForceN:[10,-390,0]}},[{nodeId:"B",values:[10,0,0,0,0,5]}]).success);
 ck("integrated load-transfer audit blocks incomplete member ledger",()=>!auditSolverLoadTransfer({nodes:ledgerModel.nodes,members:[{...ledgerModel.members[0],analysisLoad:{loadDataComplete:true}}]},{...integratedFixture,members:[{id:"M",start:"A",end:"B",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}]},[]).success);
 ck("demand-only status never implies design",()=>x.rows.every(r=>r.designStatus==="demand_only_not_designed")&&!("capacity" in x.rows[0]));
 ck("wind cases use directional adapter output",()=>typeof runDirectionalWind==="function"&&runDirectionalWind.toString().includes("SteelDirectionalWind3D"));
 ck("seismic cases use explicit seismic distributor input",()=>typeof runSeismic==="function"&&runSeismic.toString().includes("SteelSeismicEquivalentLateral"));
 return{passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelStructuralLoadChain={auditSolverContract,extractSupportReactions,buildExternalLoadLedger,compareExternalLedger,auditEquilibrium,auditSolverLoadTransfer,run,runDirectionalWind,runSeismic,runMemberDesignPipeline,selfTest};
})(typeof window!=="undefined"?window:globalThis);
