/* SAHROUD STEEL — post-solver verification of concrete tie-beam assembly.
 * Confirms that declared tie-beam segments are present exactly once in the actual solver
 * result, with matching connectivity, section properties, offsets, releases and the actually applied uniform load vector.
 * This is an integration audit, not a concrete/member/foundation code design approval.
 */
(function(root){
 "use strict";
 const close=(a,b,tol=1e-9)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
 const vec=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>close(v,b[i]));
 const sameRelease=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Number.isInteger(v)&&v===b[i]);
 function audit(model,result,integration,loadCase){
  const selected=loadCase&&typeof loadCase==="object"?loadCase:{key:"dead",deadFactor:loadCase,direction:[0,-1,0]};
  const factors=selected.factors&&typeof selected.factors==="object"?selected.factors:null;
  const deadFactor=Number(selected.deadFactor??(factors?factors.dead:(selected.key==="dead"?1:0)));
  const issues=[],rows=[],included=Array.isArray(integration?.included)?integration.included:[];
  if(!model||!Array.isArray(model.members)||!result||!Array.isArray(result.members))return{success:false,issues:["مدل مونتاژ یا نتیجه واقعی حل‌گر در دسترس نیست."],rows,expectedSegments:0,verifiedSegments:0};
  if(!Number.isFinite(deadFactor)||deadFactor<0)issues.push("ضریب بار مرده برای ممیزی وزن خود معتبر نیست.");
  if(!Number.isInteger(result.memberCount)||result.memberCount!==model.members.length)issues.push("تعداد اعضای اعلام‌شده حل‌گر با مدل مونتاژشده برابر نیست.");
  if(result.members.length!==model.members.length)issues.push("تعداد اعضای بازگشتی حل‌گر با تعداد اعضای مدل برابر نیست.");
  const sourceCounts=new Map(),solvedCounts=new Map();
  model.members.forEach(m=>sourceCounts.set(String(m.id),(sourceCounts.get(String(m.id))||0)+1));
  result.members.forEach(m=>solvedCounts.set(String(m.id),(solvedCounts.get(String(m.id))||0)+1));
  const sourceById=new Map(model.members.map(m=>[String(m.id),m]));
  const solvedById=new Map(result.members.map(m=>[String(m.id),m]));
  const expectedIds=[];
  included.forEach(route=>{
   const ids=Array.isArray(route.memberIds)?route.memberIds:[];
   if(!ids.length)issues.push("مسیر "+String(route.id)+" هیچ شناسه قطعه حل‌گری ندارد.");
   ids.forEach(id=>{
    const key=String(id);expectedIds.push(key);
    const src=sourceById.get(key),sol=solvedById.get(key),local=[];
    if(sourceCounts.get(key)!==1)local.push("عضو متناظر در مدل مونتاژشده دقیقاً یک‌بار وجود ندارد");
    if(solvedCounts.get(key)!==1||!sol)local.push("عضو متناظر در خروجی حل‌گر دقیقاً یک‌بار وجود ندارد");
    if(!src)local.push("تعریف عضو منبع پیدا نشد");
    if(src&&sol){
     if(String(src.start)!==String(sol.start)||String(src.end)!==String(sol.end))local.push("اتصال گره‌های ابتدا و انتها با مدل منبع یکسان نیست");
     if(src.sectionKey!=="tieBeam"||sol.sectionKey!=="tieBeam")local.push("کلید مقطع بتنی شناژ در حل‌گر حفظ نشده است");
     const p=src.analysisSection||{},q=sol.section||{};
     for(const k of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(p[k])&&p[k]>0&&Number.isFinite(q[k])&&close(p[k],q[k])))local.push("خاصیت مقطع "+k+" با مقدار مصوب ورودی حل‌گر تطبیق ندارد");
     const oi=src.endOffsets||{},so=sol.endOffsets||{};
     if(!vec(oi.i,so.i)||!vec(oi.j,so.j))local.push("بازوی صلب دو انتهای عضو در خروجی حل‌گر حفظ نشده است");
     if(!sameRelease(src.endReleases?.i,sol.endReleases?.i)||!sameRelease(src.endReleases?.j,sol.endReleases?.j))local.push("آزادسازی دوران ابتدا/انتها با مدل منبع یکسان نیست");
     if(!Array.isArray(sol.localEndForces)||sol.localEndForces.length!==12||sol.localEndForces.some(v=>!Number.isFinite(v)))local.push("نیروهای انتهایی محلی ۱۲ مؤلفه عددی معتبر ندارند");
     const expected=Number(p.A)*Number(src.tieBeamDensityKNm3)*deadFactor;
     const sourceSW=src.analysisLoad?.selfWeightKNm,solvedSW=sol.analysisLoad?.selfWeightKNm;
     if(!Number.isFinite(sourceSW)||!close(sourceSW,expected))local.push("بار خطی وزن خود منبع با A×وزن مخصوص×ضریب مرده تطبیق ندارد");
     if(!Number.isFinite(solvedSW)||!close(solvedSW,expected))local.push("ردیابی وزن خود در عضو بازگشتی حل‌گر ناقص یا متفاوت است");
     const lineLoads=src.lineLoads||{};
     let factoredLineLoad=0;
     if(factors){
      for(const k of ["dead","live","snow"]){
       if(!Number.isFinite(lineLoads[k])||!Number.isFinite(factors[k]))local.push("بار/ضریب "+k+" برای بازسازی بار گسترده شناژ معتبر نیست");
       else factoredLineLoad+=lineLoads[k]*factors[k];
      }
     }else if(typeof selected.key==="string"&&Number.isFinite(lineLoads[selected.key]))factoredLineLoad=lineLoads[selected.key];
     else local.push("حالت بار برای بازسازی مستقل بار گسترده شناژ مشخص نیست");
     const windOnly=selected.key==="wind"&&!factors;
     const expectedGlobal=windOnly?[0,0,0]:[0,-(factoredLineLoad+expected)*1000,0];
     const sourceGlobal=src.analysisLoad?.globalUniform,solvedGlobal=sol.analysisLoad?.globalUniform;
     const sourceLocal=src.analysisLoad?.uniformLocal,solvedLocal=sol.analysisLoad?.uniformLocal;
     if(!vec(sourceGlobal,expectedGlobal))local.push("بردار بار گسترده جهانی منبع، وزن خود را دقیقاً یک‌بار به بارهای خطی اضافه‌شده نمی‌کند");
     if(!vec(solvedGlobal,expectedGlobal))local.push("بردار بار گسترده جهانی عضو حل‌شده با بار مورد انتظار تطبیق ندارد");
     if(!sol.localAxes||!Array.isArray(sol.localAxes.x)||!Array.isArray(sol.localAxes.y)||!Array.isArray(sol.localAxes.z))local.push("محورهای محلی عضو در نتیجه حل‌گر ثبت نشده‌اند");
     else{
      const expectedLocal=[sol.localAxes.x,sol.localAxes.y,sol.localAxes.z].map(axis=>axis.reduce((sum,v,i)=>sum+v*expectedGlobal[i],0));
      if(!vec(sourceLocal,expectedLocal))local.push("تبدیل بار گسترده جهانی به محورهای محلی در مدل منبع سازگار نیست");
      if(!vec(solvedLocal,expectedLocal))local.push("بردار بار گسترده محلی در عضو بازگشتی حل‌گر با بار مورد انتظار سازگار نیست");
     }
    }
    rows.push({routeId:String(route.id),memberId:key,verified:local.length===0,issues:local});
    local.forEach(x=>issues.push(key+": "+x));
   });
  });
  if(new Set(expectedIds).size!==expectedIds.length)issues.push("یک شناسه قطعه در بیش از یک مسیر شناژ ثبت شده است.");
  const actualTieIds=model.members.filter(m=>m.sectionKey==="tieBeam").map(m=>String(m.id));
  if(actualTieIds.length!==expectedIds.length||actualTieIds.some(id=>!expectedIds.includes(id)))issues.push("اعضای شناژ مدل مونتاژشده با فهرست مسیرهای تأییدشده تطابق کامل ندارند.");
  return{schemaVersion:1,success:issues.length===0,issues,expectedSegments:expectedIds.length,verifiedSegments:rows.filter(r=>r.verified).length,rows,solverMemberCount:result.members.length,modelMemberCount:model.members.length,deadFactor,selfWeightAudit:"برای هر قطعه، وزن خطی ثبت‌شده باید دقیقاً برابر A×γc×ضریب D باشد و همان مقدار در نتیجه عضو حل‌گر بازتاب یابد؛ این ممیزی بازسازی مستقل بردار بار FEM نیست.",designApproved:false};
 }
 function selfTest(){
  const lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0};
  const appliedLoad={uniformLocal:[0,-7500,0],globalUniform:[0,-7500,0],selfWeightKNm:7.5};
  const src={id:"T1",start:"A",end:"B",sectionKey:"tieBeam",lineLoads,analysisSection:{E:2e10,G:8e9,A:.3,Iy:.006,Iz:.004,J:.003},endOffsets:{i:[0,-.25,0],j:[0,-.25,0]},endReleases:{i:[],j:[4,5]},tieBeamDensityKNm3:25,analysisLoad:appliedLoad};
  const sol={id:"T1",start:"A",end:"B",sectionKey:"tieBeam",section:{...src.analysisSection},endOffsets:{i:[0,-.25,0],j:[0,-.25,0]},endReleases:{i:[],j:[4,5]},localEndForces:Array(12).fill(0),localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},analysisLoad:{...appliedLoad,uniformLocal:appliedLoad.uniformLocal.slice(),globalUniform:appliedLoad.globalUniform.slice()}};
  const model={members:[src]},result={memberCount:1,members:[sol]},integration={included:[{id:"R1",memberIds:["T1"]}]};
  const deadCase={key:"dead",deadFactor:1,direction:[0,-1,0]};
  const ok=audit(model,result,integration,deadCase),missing=audit(model,{memberCount:0,members:[]},integration,deadCase);
  const dup=audit({members:[src,src]},{memberCount:2,members:[sol,sol]},integration,deadCase);
  const badOffset=audit(model,{memberCount:1,members:[{...sol,endOffsets:{i:[0,0,0],j:[0,-.25,0]}}]},integration,deadCase);
  const badWeight=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,selfWeightKNm:15}}]},integration,deadCase);
  const omittedWeight=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,globalUniform:[0,0,0],uniformLocal:[0,0,0]}}]},integration,deadCase);
  const doubledWeight=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,globalUniform:[0,-15000,0],uniformLocal:[0,-15000,0]}}]},integration,deadCase);
  const badLocal=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,uniformLocal:[0,-7000,0]}}]},integration,deadCase);
  const badSection=audit(model,{memberCount:1,members:[{...sol,section:{...sol.section,A:.4}}]},integration,deadCase);
  const checks={acceptsCompleteSolverMember:ok.success&&ok.verifiedSegments===1,rejectsMissingSolverMember:!missing.success,rejectsDuplicateMember:!dup.success,rejectsWrongRigidOffset:!badOffset.success,rejectsWrongSelfWeightMetadata:!badWeight.success,rejectsOmittedSelfWeightFromAppliedLoad:!omittedWeight.success,rejectsDoubleSelfWeightInAppliedLoad:!doubledWeight.success,rejectsWrongLocalLoadProjection:!badLocal.success,rejectsWrongSolverSection:!badSection.success};
  return{passed:Object.values(checks).every(Boolean),checks,complete:ok,missing,duplicate:dup,badOffset,badWeight,omittedWeight,doubledWeight,badLocal,badSection};
 }
 root.SteelTieBeamSolverAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
