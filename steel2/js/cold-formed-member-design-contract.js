/* SAHROUD STEEL — cold-formed purlin/girt evidence contract.
 * Validates exact profile, verified section/buckling data, restraint,
 * simultaneous station actions, serviceability and connection evidence.
 * It calculates NO resistance and grants NO design approval.
 */
(function(root){"use strict";
const positive=v=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const text=v=>typeof v==="string"&&v.trim().length>0;
const SOURCE=["document","revision","locator","authority"];
const ACTIONS=["N_N","Vy_N","Vz_N","T_Nmm","My_Nmm","Mz_Nmm"];
const PROPERTY_FIELDS=["Ag_mm2","Ix_mm4","Iy_mm4","Ixy_mm4","J_mm4","Cw_mm6","SxTop_mm3","SxBottom_mm3","SyTop_mm3","SyBottom_mm3","shearCenterX_mm","shearCenterY_mm"];
const BUCKLING_FIELDS=["PcrGlobal_N","PcrLocal_N","PcrDistortional_N","McrGlobal_Nmm","McrLocal_Nmm","McrDistortional_Nmm"];
function audit(input){
 const d=input||{},issues=[],warnings=[];
 const group=d.group;
 if(!["roofPurlin","wallGirt","endGirt","roofEdge"].includes(group))issues.push("گروه عضو سردنورد باید مشخص و معتبر باشد.");
 if(!text(d.memberId))issues.push("شناسه فیزیکی یکتای عضو لازم است.");
 const p=d.profile||{};
 if(!["C","Z","RHS","hat","custom"].includes(p.family))issues.push("خانواده دقیق مقطع (C/Z/RHS/کلاهکی/سفارشی) نامشخص است.");
 ["designation","manufacturer","catalogRevision"].forEach(k=>{if(!text(p[k]))issues.push("مشخصات شناسایی مقطع "+k+" ناقص است.");});
 const requirePositive=(k)=>{if(!positive(p[k]))issues.push("بعد واقعی مقطع "+k+" معتبر نیست.");};
 const requireNonnegative=(k)=>{if(!finite(p[k])||p[k]<0)issues.push("بعد مقطع "+k+" باید صریحاً صفر یا مثبت باشد.");};
 if(["C","Z","hat"].includes(p.family)){
  ["webHeight_mm","flange1_mm","flange2_mm","thickness_mm","insideRadius_mm"].forEach(requirePositive);
  ["lip1_mm","lip2_mm"].forEach(requireNonnegative);
 }else if(p.family==="RHS"){
  ["width_mm","height_mm","thickness_mm","insideRadius_mm"].forEach(requirePositive);
 }else if(p.family==="custom"){
  ["thickness_mm","insideRadius_mm"].forEach(requirePositive);
  if(!text(p.geometryDescription)||!text(p.geometryReference))issues.push("مقطع سفارشی باید توصیف هندسه و مرجع نقشه/مدل دقیق داشته باشد.");
 }
 if(positive(p.thickness_mm)&&positive(p.insideRadius_mm)&&p.insideRadius_mm>p.thickness_mm*5)warnings.push("شعاع داخلی بزرگ نسبت به ضخامت ثبت شده است؛ واحد و هندسه مقطع بازبینی شود.");
 const m=d.material||{};
 ["Fy_MPa","Fu_MPa","E_MPa"].forEach(k=>{if(!positive(m[k]))issues.push("مشخصه مصالح "+k+" معتبر نیست.");});
 if(positive(m.Fy_MPa)&&positive(m.Fu_MPa)&&m.Fu_MPa<m.Fy_MPa)issues.push("Fu از Fy کمتر ثبت شده است.");
 if(!text(m.standard)||!text(m.certificateReference))issues.push("استاندارد محصول و مرجع گواهی مصالح ثبت نشده است.");
 const s=d.sectionProperties||{};
 PROPERTY_FIELDS.forEach(k=>{if(!finite(s[k])||(k!=="Ixy_mm4"&&k!=="shearCenterX_mm"&&k!=="shearCenterY_mm"&&s[k]<=0))issues.push("خاصیت واقعی مقطع "+k+" معتبر نیست.");});
 if(positive(s.Ix_mm4)&&positive(s.Iy_mm4)&&Math.abs(Number(s.Ixy_mm4)||0)>=Math.sqrt(s.Ix_mm4*s.Iy_mm4))issues.push("ماتریس اینرسی مقطع نامعتبر یا تکین است.");
 if(!text(s.source)||!text(s.method)||!text(s.revision))issues.push("منبع، روش استخراج و نسخه خواص مقطع باید مشخص باشد.");
 const b=d.elasticBuckling||{};
 BUCKLING_FIELDS.forEach(k=>{if(!positive(b[k]))issues.push("خروجی کمانش الاستیک "+k+" لازم است.");});
 if(!text(b.solver)||!text(b.version)||!text(b.modelReference)||b.reviewed!==true)issues.push("مدل و خروجی کمانش الاستیک باید دارای نرم‌افزار/نسخه/مرجع مدل و بازبینی مستند باشد.");
 const r=d.restraint||{};
 if(![true,false].includes(r.compressionFlangeBraced))issues.push("وضعیت مهار بال فشاری باید صریحاً تعیین شود.");
 if(!positive(r.unbracedLength_mm))issues.push("طول مهارنشده واقعی باید ثبت شود.");
 if(!text(r.braceType)||!text(r.braceConnectionReference)||r.braceCapacityVerified!==true)issues.push("نوع، اتصال و ظرفیت مهار جانبی باید مستند و تأیید شده باشد.");
 if(r.compressionFlangeBraced===true&&!positive(r.braceSpacing_mm))issues.push("فاصله مهارهای بال فشاری معتبر نیست.");
 const demands=Array.isArray(d.loadCases)?d.loadCases:[];
 if(!demands.length)issues.push("هیچ ترکیب بار طراحی/بهره‌برداری با تقاضای هم‌زمان ارائه نشده است.");
 const caseIds=demands.map(x=>String(x?.caseId||""));
 if(caseIds.some(x=>!x)||new Set(caseIds).size!==caseIds.length)issues.push("شناسه ترکیب‌های بار خالی یا تکراری است.");
 demands.forEach(c=>{
  if(!text(c.label))issues.push("نام ترکیب بار "+c.caseId+" ناقص است.");
  const caseSources=Array.isArray(c.sourceCases)?c.sourceCases:[];
  if(caseSources.length){
   if(!text(c.sourceCombination?.code)||!text(c.sourceCombination?.edition)||!text(c.sourceCombination?.clause)||!text(c.sourceCombination?.document))issues.push("مرجع آیین‌نامه‌ای ترکیب "+c.caseId+" ناقص است.");
   caseSources.forEach(sc=>{
    const missing=SOURCE.filter(k=>!text(sc?.source?.[k]));
    if(!text(sc?.caseId)||missing.length)issues.push("ردیابی حالت پایه ترکیب "+c.caseId+" ناقص است: "+(!text(sc?.caseId)?"شناسه حالت، ":"")+missing.join("، ")+".");
   });
  }else{
   const missing=SOURCE.filter(k=>!text(c.source?.[k]));
   if(missing.length)issues.push("مدرک منبع ترکیب "+c.caseId+" ناقص است: "+missing.join("، ")+".");
  }
  if(!Array.isArray(c.stations)||c.stations.length<2)issues.push("ترکیب "+c.caseId+" حداقل دو ایستگاه ابتدا/انتها لازم دارد.");
  (c.stations||[]).forEach((st,i)=>{
   if(!positive(st.station_mm)&&st.station_mm!==0)issues.push("مختصات ایستگاه "+c.caseId+"/"+i+" معتبر نیست.");
   ACTIONS.forEach(k=>{if(!finite(st[k]))issues.push("تقاضای هم‌زمان "+k+" در "+c.caseId+"/"+i+" ناقص است.");});
   if(st.localAxes!==undefined&&(!st.localAxes||typeof st.localAxes!=="object"))issues.push("محورهای محلی ایستگاه "+c.caseId+"/"+i+" نامعتبر است.");
   if(st.segmentId!=null&&!text(st.segmentId))issues.push("شناسه قطعه ایستگاه "+c.caseId+"/"+i+" نامعتبر است.");
  });
 });
 const connection=d.connection||{};
 if(!text(connection.type)||!text(connection.reference)||connection.capacityVerified!==true)issues.push("نوع اتصال و مرجع/ظرفیت تأییدشده اتصال لاپه/قید لازم است.");
 const service=d.serviceability||{};
 if(service.checked!==true||!text(service.combinationReference)||!positive(service.limitRatio))issues.push("کنترل خیز/تغییرمکان در ترکیب بهره‌برداری و حد مجاز مستند نیست.");
 const governing={};
 ACTIONS.forEach(k=>{
  let best=null;
  demands.forEach(c=>(c.stations||[]).forEach(st=>{
   const value=Number(st[k]);
   if(finite(value)&&(!best||Math.abs(value)>Math.abs(best.value)))best={value,caseId:c.caseId,label:c.label,station_mm:st.station_mm};
  }));
  governing[k]=best;
 });
 return{success:issues.length===0,readyForResistanceReview:issues.length===0,designApproved:false,capacityCalculated:false,group,memberId:d.memberId,issues:[...new Set(issues)],warnings,caseCount:demands.length,governingSimultaneousActions:governing,contractVersion:2,scope:"Evidence completeness only. This contract does not calculate AISI/M10 resistance, DSM nominal strengths, local/distortional/global buckling capacity, combined-action utilization, screw/bolt/weld resistance, or code compliance."};
}
function stable(value){
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
 return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}";
}
function auditFromDemandPackage(baseInput,demandPackage,combinationProposal){
 const issues=[],base=baseInput||{},pkg=demandPackage||{},proposal=combinationProposal||{};
 if(pkg.success!==true||pkg.designApproved!==false||pkg.concurrencyPreserved!==true||pkg.caseSeparationPreserved!==true)
  issues.push("بسته تقاضای ایستگاهی باید کامل، تفکیک‌شده و صریحاً غیرتأییدشده باشد.");
 if(proposal.success!==true||proposal.designApproved!==false||proposal.capacityCalculated!==false)
  issues.push("پیشنهاد ترکیب باید موفق و صریحاً فاقد محاسبه ظرفیت/تأیید طراحی باشد.");
 const memberId=String(base.memberId||"").trim();
 if(!memberId)issues.push("شناسه عضو برای اتصال تقاضا الزامی است.");
 const packageMembers=Array.isArray(pkg.members)?pkg.members:[];
 const memberMatches=packageMembers.filter(m=>String(m?.memberId||"").trim()===memberId);
 if(memberMatches.length!==1||memberMatches[0]?.complete!==true)
  issues.push("عضو "+memberId+" باید دقیقاً یک‌بار و به‌صورت کامل در بسته تقاضا موجود باشد.");
 const member=memberMatches.length===1?memberMatches[0]:null;
 const packageCases=Array.isArray(member?.cases)?member.cases:[];
 const sourceMap=new Map();
 packageCases.forEach(c=>{
  const id=String(c?.caseId||"").trim();
  if(!id||sourceMap.has(id))issues.push("شناسه حالت پایه در بسته تحلیل عضو خالی یا تکراری است: "+id);
  else if(c.complete!==true||!c.source)issues.push("حالت پایه "+id+" کامل یا دارای منبع مستند نیست.");
  else sourceMap.set(id,c.source);
 });
 const combos=Array.isArray(proposal.proposals)?proposal.proposals:[];
 if(!combos.length)issues.push("هیچ پیشنهاد ترکیب بار برای تبدیل به تقاضای عضو موجود نیست.");
 const seen=new Set(),loadCases=[];
 combos.forEach(combo=>{
  const id=String(combo?.combinationId||"").trim();
  if(!id||seen.has(id)){issues.push("شناسه ترکیب عضو خالی یا تکراری است: "+id);return;}
  seen.add(id);
  const matches=(Array.isArray(combo.members)?combo.members:[]).filter(m=>String(m?.memberId||"").trim()===memberId);
  if(matches.length!==1||matches[0]?.complete!==true){issues.push("عضو "+memberId+" در ترکیب "+id+" دقیقاً یک بسته کامل ندارد.");return;}
  const sourceCases=Array.isArray(combo.sourceCases)?combo.sourceCases:[];
  const sourceIds=sourceCases.map(sc=>String(sc?.caseId||"").trim());
  if(!sourceCases.length||sourceIds.some(x=>!x)||new Set(sourceIds).size!==sourceIds.length)
   issues.push("فهرست منابع حالت پایه در ترکیب "+id+" خالی یا دارای شناسه تکراری است.");
  const stations=Array.isArray(matches[0].stations)?matches[0].stations:[];
  const stationSourceIds=new Set();
  let previousX=-Infinity;
  const stationRows=[];
  stations.forEach((st,index)=>{
   const a=st?.actions||{},values=[a.N,a.Vy,a.Vz,a.T,a.My,a.Mz],x=st?.xMember_m;
   if(!finite(x)||x<0||x<previousX||!values.every(finite)){
    issues.push("مختصات مرتب یا شش مؤلفه همزمان ایستگاه "+index+" عضو "+memberId+" در ترکیب "+id+" نامعتبر است.");
    return;
   }
   previousX=x;
   const stationIds=Array.isArray(st.sourceCaseIds)?st.sourceCaseIds.map(v=>String(v).trim()):[];
   if(!stationIds.length||stationIds.some(v=>!v)||new Set(stationIds).size!==stationIds.length)
    issues.push("شناسه حالت‌های پایه ایستگاه "+index+" در ترکیب "+id+" خالی یا تکراری است.");
   stationIds.forEach(v=>stationSourceIds.add(v));
   if(st.localAxes!==undefined&&(!st.localAxes||typeof st.localAxes!=="object"||Array.isArray(st.localAxes)))
    issues.push("محورهای محلی ایستگاه "+index+" در ترکیب "+id+" نامعتبر است.");
   if(st.segmentId!=null&&!text(st.segmentId))issues.push("شناسه قطعه ایستگاه "+index+" در ترکیب "+id+" نامعتبر است.");
   stationRows.push({station_mm:x*1000,N_N:a.N,Vy_N:a.Vy,Vz_N:a.Vz,T_Nmm:a.T*1000,My_Nmm:a.My*1000,Mz_Nmm:a.Mz,localAxes:st.localAxes||null,segmentId:st.segmentId||null,segmentIndex:st.segmentIndex??null,sourceCaseIds:stationIds});
  });
  if(stationRows.length!==stations.length||stationRows.length<2)issues.push("تبدیل ایستگاه‌های ترکیب "+id+" کامل نیست یا کمتر از دو ایستگاه دارد.");
  const listed=new Set(sourceIds),allStationIds=stationSourceIds;
  if([...allStationIds].some(cid=>!listed.has(cid))||sourceIds.some(cid=>!allStationIds.has(cid)))
   issues.push("فهرست منابع ترکیب "+id+" باید دقیقاً با منابع ارجاع‌شده در ایستگاه‌ها یکسان باشد.");
  sourceCases.forEach(sc=>{
   const cid=String(sc?.caseId||"").trim(),actual=sourceMap.get(cid);
   if(!actual||stable(actual)!==stable(sc.source))
    issues.push("منبع حالت پایه "+cid+" در ترکیب "+id+" با بسته تحلیل عضو تطبیق ندارد.");
  });
  if(!text(combo.source?.code)||!text(combo.source?.edition)||!text(combo.source?.clause)||!text(combo.source?.document))
   issues.push("مرجع مستند مبنای ترکیب "+id+" ناقص است.");
  loadCases.push({caseId:id,label:id,sourceCombination:combo.source||null,sourceCases:sourceCases.map(sc=>({caseId:String(sc.caseId),source:sc.source||null})),stations:stationRows});
 });
 if(issues.length)return {success:false,readyForResistanceReview:false,designApproved:false,capacityCalculated:false,memberId,issues:[...new Set(issues)],scope:"demand adaptation only"};
 const result=audit({...base,loadCases});
 result.demandAdapter={success:issues.length===0,sourcePackageCaseCount:sourceMap.size,combinationCount:loadCases.length,stationUnitConversion:"m to mm; N unchanged; N.m to N.mm",axisTransformation:"none; original local action labels and axes retained",loadCases:loadCases.map(c=>({caseId:c.caseId,sourceCombination:c.sourceCombination,sourceCases:c.sourceCases,stations:c.stations})),designApproved:false};
 result.designApproved=false;result.capacityCalculated=false;
 return result;
}
function selfTest(){
 const good={group:"roofPurlin",memberId:"P-01",profile:{family:"Z",designation:"Z200-70-20-2.5",manufacturer:"MFG",catalogRevision:"R2",webHeight_mm:200,flange1_mm:70,flange2_mm:70,lip1_mm:20,lip2_mm:20,thickness_mm:2.5,insideRadius_mm:3},material:{Fy_MPa:350,Fu_MPa:420,E_MPa:200000,standard:"EN 10346",certificateReference:"MTC-01"},sectionProperties:{Ag_mm2:900,Ix_mm4:4e6,Iy_mm4:2e6,Ixy_mm4:0,J_mm4:5000,Cw_mm6:1e10,SxTop_mm3:40000,SxBottom_mm3:40000,SyTop_mm3:20000,SyBottom_mm3:20000,shearCenterX_mm:0,shearCenterY_mm:0,source:"manufacturer table",method:"tested section properties",revision:"R2"},elasticBuckling:{PcrGlobal_N:50000,PcrLocal_N:30000,PcrDistortional_N:40000,McrGlobal_Nmm:2e7,McrLocal_Nmm:1e7,McrDistortional_Nmm:1.5e7,solver:"CUFSM",version:"5.0",modelReference:"model-P01",reviewed:true},restraint:{compressionFlangeBraced:true,braceSpacing_mm:1500,unbracedLength_mm:1500,braceType:"sag rod and sheeting",braceConnectionReference:"BR-01",braceCapacityVerified:true},loadCases:[{caseId:"ULS-1",label:"ULS-1",source:{document:"calc.pdf",revision:"A",locator:"p.10",authority:"engineer"},stations:[{station_mm:0,N_N:0,Vy_N:100,Vz_N:0,T_Nmm:0,My_Nmm:1000,Mz_Nmm:0},{station_mm:6000,N_N:0,Vy_N:-100,Vz_N:0,T_Nmm:0,My_Nmm:1000,Mz_Nmm:0}]}],connection:{type:"self-drilling screws",reference:"CONN-01",capacityVerified:true},serviceability:{checked:true,combinationReference:"SLS-1",limitRatio:180}};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:String(e)});}};
 t("complete evidence package passes readiness only",()=>{const x=audit(good);return x.success&&x.readyForResistanceReview&&!x.designApproved&&!x.capacityCalculated;});
 t("missing exact geometry blocks",()=>!audit({...good,profile:{...good.profile,lip1_mm:null}}).success);
 t("unlipped C/Z profiles accept explicit zero lip dimensions",()=>audit({...good,profile:{...good.profile,family:"C",lip1_mm:0,lip2_mm:0}}).success);
 t("RHS profile validates its own width-height geometry without channel lips",()=>{const p={...good.profile,family:"RHS",width_mm:100,height_mm:200};delete p.webHeight_mm;delete p.flange1_mm;delete p.flange2_mm;delete p.lip1_mm;delete p.lip2_mm;return audit({...good,profile:p}).success;});
 t("RHS profile without width is blocked",()=>{const p={...good.profile,family:"RHS",height_mm:200};delete p.width_mm;return !audit({...good,profile:p}).success;});
 t("custom profile requires a drawing or model geometry reference",()=>!audit({...good,profile:{...good.profile,family:"custom"}}).success);
 t("custom profile with explicit geometry provenance remains evidence-only",()=>audit({...good,profile:{...good.profile,family:"custom",geometryDescription:"بازسازی مقطع از پلی‌لاین CAD",geometryReference:"DWG-17 / detail 4"}}).success);
 t("missing local/distortional/global buckling results block",()=>!audit({...good,elasticBuckling:{...good.elasticBuckling,PcrLocal_N:null}}).success);
 t("unreviewed buckling model blocks",()=>!audit({...good,elasticBuckling:{...good.elasticBuckling,reviewed:false}}).success);
 t("unverified flange restraint blocks",()=>!audit({...good,restraint:{...good.restraint,braceCapacityVerified:false}}).success);
 t("duplicate load case IDs block",()=>!audit({...good,loadCases:[good.loadCases[0],good.loadCases[0]]}).success);
 t("incomplete simultaneous force vector blocks",()=>!audit({...good,loadCases:[{...good.loadCases[0],stations:[{...good.loadCases[0].stations[0],Mz_Nmm:undefined},good.loadCases[0].stations[1]]}]}).success);
 t("missing case provenance blocks",()=>!audit({...good,loadCases:[{...good.loadCases[0],source:{document:"x"}}]}).success);
 t("unverified connection capacity blocks",()=>!audit({...good,connection:{...good.connection,capacityVerified:false}}).success);
 t("missing serviceability evidence blocks",()=>!audit({...good,serviceability:{checked:false}}).success);
 t("governing action preserves case and station",()=>{const x=audit(good);return x.governingSimultaneousActions.My_Nmm.caseId==="ULS-1"&&x.governingSimultaneousActions.My_Nmm.station_mm===0;});
 t("does not combine independent maxima into a synthetic case",()=>{const x=audit({...good,loadCases:[{...good.loadCases[0],caseId:"ULS-2",label:"ULS-2",stations:[{...good.loadCases[0].stations[0],My_Nmm:999,Mz_Nmm:0},{...good.loadCases[0].stations[1],My_Nmm:0,Mz_Nmm:999}]}]});return x.governingSimultaneousActions.My_Nmm.caseId==="ULS-2"&&x.governingSimultaneousActions.Mz_Nmm.caseId==="ULS-2"&&x.governingSimultaneousActions.My_Nmm.station_mm!==x.governingSimultaneousActions.Mz_Nmm.station_mm;});
 const source={document:"analysis.pdf",revision:"R1",locator:"p.4",authority:"reviewed-solver"};
 const comboSource={code:"M10",edition:"1401",clause:"verified-by-engineer",document:"approved-combination-basis"};
 const baseInput={...good,loadCases:undefined};
 const demandPkg={success:true,designApproved:false,concurrencyPreserved:true,caseSeparationPreserved:true,members:[{memberId:"P-01",complete:true,cases:[{caseId:"D",source,kind:"prismatic",complete:true,stations:[]}]}]};
 const comboProposal={success:true,designApproved:false,capacityCalculated:false,proposals:[{combinationId:"ULS-1",source:comboSource,sourceCases:[{caseId:"D",source}],members:[{memberId:"P-01",complete:true,stations:[{xMember_m:0,localAxes:{x:[1,0,0]},sourceCaseIds:["D"],actions:{N:0,Vy:100,Vz:0,T:1,My:2,Mz:0}},{xMember_m:6,localAxes:{x:[1,0,0]},sourceCaseIds:["D"],actions:{N:0,Vy:-100,Vz:0,T:1,My:2,Mz:0}}]}]}]};
 const adapted=auditFromDemandPackage(baseInput,demandPkg,comboProposal);
 t("canonical station package adapts without axis remapping and converts units",()=>adapted.success&&adapted.demandAdapter.loadCases[0].stations[1].station_mm===6000&&adapted.demandAdapter.loadCases[0].stations[0].T_Nmm===1000&&adapted.demandAdapter.loadCases[0].stations[0].My_Nmm===2000&&adapted.demandAdapter.loadCases[0].stations[0].Vy_N===100&&adapted.designApproved===false);
 t("missing member in demand package blocks adaptation",()=>!auditFromDemandPackage(baseInput,demandPkg,{...comboProposal,proposals:[{...comboProposal.proposals[0],members:[]}]}).success);
 t("underlying source provenance mismatch blocks adaptation",()=>{const x=JSON.parse(JSON.stringify(comboProposal));x.proposals[0].sourceCases[0].source.revision="R2";return !auditFromDemandPackage(baseInput,demandPkg,x).success;});
 t("incomplete six-action station blocks adaptation",()=>{const x=JSON.parse(JSON.stringify(comboProposal));delete x.proposals[0].members[0].stations[0].actions.Mz;return !auditFromDemandPackage(baseInput,demandPkg,x).success;});
 t("adapter never calculates resistance or approves design",()=>adapted.capacityCalculated===false&&adapted.designApproved===false);
 t("duplicate physical member entries in solver package block adaptation",()=>{const x=JSON.parse(JSON.stringify(demandPkg));x.members.push({...x.members[0]});return !auditFromDemandPackage(baseInput,x,comboProposal).success;});
 t("duplicate base load case IDs block adaptation",()=>{const x=JSON.parse(JSON.stringify(demandPkg));x.members[0].cases.push({...x.members[0].cases[0]});return !auditFromDemandPackage(baseInput,x,comboProposal).success;});
 t("station provenance must not omit a source case",()=>{const x=JSON.parse(JSON.stringify(comboProposal));x.proposals[0].members[0].stations[0].sourceCaseIds=[];return !auditFromDemandPackage(baseInput,demandPkg,x).success;});
 t("proposal source list must exactly match station provenance",()=>{const x=JSON.parse(JSON.stringify(comboProposal));x.proposals[0].sourceCases.push({caseId:"UNUSED",source});return !auditFromDemandPackage(baseInput,demandPkg,x).success;});
 t("station coordinates must be ordered and nonnegative",()=>{const x=JSON.parse(JSON.stringify(comboProposal));x.proposals[0].members[0].stations[1].xMember_m=-1;return !auditFromDemandPackage(baseInput,demandPkg,x).success;});
 t("combination code basis must be traceable",()=>{const x=JSON.parse(JSON.stringify(comboProposal));delete x.proposals[0].source.clause;return !auditFromDemandPackage(baseInput,demandPkg,x).success;});
 t("source object key order does not create false mismatch",()=>{const x=JSON.parse(JSON.stringify(comboProposal));x.proposals[0].sourceCases[0].source={authority:source.authority,locator:source.locator,revision:source.revision,document:source.document};return auditFromDemandPackage(baseInput,demandPkg,x).success;});
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"cold-formed evidence contract and demand adapter regression only; no design capacities or approval"};
}
root.SteelColdFormedMemberContract={audit,auditFromDemandPackage,selfTest};
})(typeof window!=="undefined"?window:globalThis);
