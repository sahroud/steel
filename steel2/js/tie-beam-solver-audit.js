/* SAHROUD STEEL — post-solver verification of concrete tie-beam assembly.
 * Confirms that declared tie-beam segments are present exactly once in the actual solver
 * result, with matching connectivity, section properties, offsets, releases and self-weight metadata.
 * This is an integration audit, not a concrete/member/foundation code design approval.
 */
(function(root){
 "use strict";
 const close=(a,b,tol=1e-9)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
 const vec=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>close(v,b[i]));
 const sameRelease=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Array.isArray(v)&&Array.isArray(b[i])&&v.length===b[i].length&&v.every((x,j)=>x===b[i][j]));
 function audit(model,result,integration,deadFactor){
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
     if(!sol.localAxes||!Array.isArray(sol.localAxes.x)||!Array.isArray(sol.localAxes.y)||!Array.isArray(sol.localAxes.z))local.push("محورهای محلی عضو در نتیجه حل‌گر ثبت نشده‌اند");
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
  const src={id:"T1",start:"A",end:"B",sectionKey:"tieBeam",analysisSection:{E:2e10,G:8e9,A:.3,Iy:.006,Iz:.004,J:.003},endOffsets:{i:[0,-.25,0],j:[0,-.25,0]},endReleases:{i:[],j:[4,5]},tieBeamDensityKNm3:25,analysisLoad:{selfWeightKNm:7.5}};
  const sol={id:"T1",start:"A",end:"B",sectionKey:"tieBeam",section:{...src.analysisSection},endOffsets:{i:[0,-.25,0],j:[0,-.25,0]},endReleases:{i:[],j:[4,5]},localEndForces:Array(12).fill(0),localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},analysisLoad:{selfWeightKNm:7.5}};
  const model={members:[src]},result={memberCount:1,members:[sol]},integration={included:[{id:"R1",memberIds:["T1"]}]};
  const ok=audit(model,result,integration,1),missing=audit(model,{memberCount:0,members:[]},integration,1);
  const dup=audit({members:[src,src]},{memberCount:2,members:[sol,sol]},integration,1);
  const badOffset=audit(model,{memberCount:1,members:[{...sol,endOffsets:{i:[0,0,0],j:[0,-.25,0]}}]},integration,1);
  const badWeight=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{selfWeightKNm:15}}]},integration,1);
  const badSection=audit(model,{memberCount:1,members:[{...sol,section:{...sol.section,A:.4}}]},integration,1);
  const checks={acceptsCompleteSolverMember:ok.success&&ok.verifiedSegments===1,rejectsMissingSolverMember:!missing.success,rejectsDuplicateMember:!dup.success,rejectsWrongRigidOffset:!badOffset.success,rejectsDoubleSelfWeightMetadata:!badWeight.success,rejectsWrongSolverSection:!badSection.success};
  return{passed:Object.values(checks).every(Boolean),checks,complete:ok,missing,duplicate:dup,badOffset,badWeight,badSection};
 }
 root.SteelTieBeamSolverAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
