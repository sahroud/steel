/* ===== steel2/js/tapered-section-force-diagram.js ===== */
/* SAHROUD STEEL — per-case section-force diagrams for segmented tapered members.
 * Each analysis segment is reconstructed independently using its own 12-DOF end
 * actions, physical length and explicitly certified complete local uniform-load ledger.
 * No segment envelope mixing, capacity check or design approval.
 */
(function(root){
"use strict";
function build(model,caseResults,options){
 options=options||{};
 const issues=[],nodes=new Map((Array.isArray(model?.nodes)?model.nodes:[]).map(n=>[String(n.id),n]));
 const modelMembers=Array.isArray(model?.members)?model.members:[];
 const tapered=modelMembers.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 const cases=Array.isArray(caseResults)?caseResults:[];
 if(!tapered.length)return {success:true,status:"no-tapered-members",members:[],loadCases:[],issues,analysisEnabled:false,designApproved:false};
 if(!root.SteelMemberSectionForces?.reconstruct){return {success:false,status:"missing-dependency",members:[],loadCases:[],issues:["بازسازی‌کننده نمودار عضو منشوری بارگذاری نشده است."],analysisEnabled:false,designApproved:false};}
 if(!cases.length)issues.push("نتیجه هیچ ترکیب باری دریافت نشده است.");
 const groups=new Map();
 for(const m of tapered){
  const parent=String(m.parentMemberId||"");
  const count=Number(m.taperSegmentCount),index=Number(m.taperSegmentIndex);
  if(!parent)issues.push("قطعه "+String(m.id)+" شناسه عضو فیزیکی والد ندارد.");
  if(!Number.isInteger(count)||count<2||!Number.isInteger(index)||index<1||index>count)issues.push("شماره/تعداد قطعات "+String(m.id)+" نامعتبر است.");
  const g=groups.get(parent)||{parentMemberId:parent,count,segments:[]};
  if(g.count!==count)issues.push("تعداد قطعات عضو "+parent+" یکسان نیست.");
  if(g.segments.some(x=>Number(x.taperSegmentIndex)===index))issues.push("شماره قطعه تکراری در عضو "+parent+": "+index);
  g.segments.push(m);groups.set(parent,g);
 }
 const prepared=[];
 for(const g of groups.values()){
  const ordered=g.segments.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex));
  if(ordered.length!==g.count)issues.push("تعداد قطعات عضو "+g.parentMemberId+" با تعداد اعلام‌شده برابر نیست.");
  for(let i=0;i<g.count;i++)if(Number(ordered[i]?.taperSegmentIndex)!==i+1)issues.push("قطعه "+(i+1)+" عضو "+g.parentMemberId+" مفقود است.");
  let offset=0,previousEnd=null;
  const segments=ordered.map(m=>{
   const a=nodes.get(String(m.start)),b=nodes.get(String(m.end));
   if(!a||!b){issues.push("گره ابتدا/انتها برای "+String(m.id)+" پیدا نشد.");return null;}
   if(previousEnd!==null&&String(m.start)!==previousEnd)issues.push("اتصال هندسی قطعات عضو "+g.parentMemberId+" در قطعه "+String(m.id)+" پیوسته نیست.");
   previousEnd=String(m.end);
   const xyz=[a.x,a.y,a.z,b.x,b.y,b.z].map(Number);
   if(!xyz.every(Number.isFinite)){issues.push("مختصات هندسی قطعه "+String(m.id)+" نامعتبر است.");return null;}
   const length=Math.hypot(xyz[3]-xyz[0],xyz[4]-xyz[1],xyz[5]-xyz[2]);
   if(!(Number.isFinite(length)&&length>0)){issues.push("طول واقعی قطعه "+String(m.id)+" مثبت نیست.");return null;}
   if(Number.isFinite(Number(m.length))&&Math.abs(Number(m.length)-length)>1e-8*Math.max(1,length))issues.push("طول ثبت‌شده قطعه "+String(m.id)+" با مختصات گره‌ها سازگار نیست.");
   const item={modelMember:m,length,startStation_m:offset,endStation_m:offset+length};
   offset+=length;return item;
  });
  prepared.push({parentMemberId:g.parentMemberId,segmentCount:g.count,totalLength_m:offset,segments});
 }
 const labels=cases.map(c=>String(c?.label||c?.name||"").trim());
 if(labels.some(x=>!x))issues.push("نام هر ترکیب بار باید صریحاً ثبت شده باشد.");
 if(new Set(labels).size!==labels.length)issues.push("نام ترکیبات بار باید یکتا باشد.");
 const loadCases=[];
 cases.forEach((c,caseIndex)=>{
  const label=labels[caseIndex],resultMembers=Array.isArray(c?.members)?c.members:[];
  if(c?.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای ترکیب "+(label||caseIndex+1)+" تأیید نشده است.");
  const byId=new Map();
  resultMembers.forEach(m=>{const id=String(m?.id??"");if(!id||byId.has(id))issues.push("شناسه عضو در ترکیب "+label+" خالی یا تکراری است: "+id);else byId.set(id,m);});
  const memberDiagrams=[];
  prepared.forEach(group=>{
   const segmentDiagrams=[];
   group.segments.forEach(seg=>{
    if(!seg)return;
    const m=seg.modelMember,id=String(m.id),solved=byId.get(id);
    if(!solved){issues.push("قطعه "+id+" در ترکیب "+label+" نتیجه تحلیل ندارد.");return;}
    const ledger=solved.analysisLoad||m.analysisLoad||{};
    const explicitlyComplete=ledger.loadDataComplete===true||solved.loadDataComplete===true||m.loadDataComplete===true||options.loadCompletenessByMember?.[id]===true;
    if(!explicitlyComplete){issues.push("کامل‌بودن دفتر بارگذاری روی طول قطعه "+id+" در ترکیب "+label+" صریحاً تأیید نشده است.");return;}
    const uniform=ledger.uniformLocal;
    if(!Array.isArray(uniform)||uniform.length!==3||!uniform.every(v=>Number.isFinite(Number(v)))){issues.push("بردار بار گسترده محلی قطعه "+id+" در ترکیب "+label+" ناقص است.");return;}
    const pointLoads=ledger.pointLoads||solved.pointLoads||m.pointLoads||[];
    const distributedLoads=ledger.distributedLoads||solved.distributedLoads||m.distributedLoads||[];
    if(!Array.isArray(pointLoads)||pointLoads.length||!Array.isArray(distributedLoads)||distributedLoads.length){issues.push("بار متمرکز/غیریکنواخت قطعه "+id+" در این بازسازی پشتیبانی نمی‌شود.");return;}
    const reconstructed=root.SteelMemberSectionForces.reconstruct({
     length:seg.length,localEndForces:solved.localEndForces,
     loadDataComplete:true,prismatic:true,uniformLocal:uniform.map(Number),
     pointLoads:[],distributedLoads:[],endReleases:m.endReleases,endOffsets:m.endOffsets
    },options.diagramOptions||{});
    if(!reconstructed.ok){issues.push("بازسازی نمودار قطعه "+id+" در ترکیب "+label+" ناموفق است: "+reconstructed.reason);return;}
    segmentDiagrams.push({segmentId:id,segmentIndex:Number(m.taperSegmentIndex),startStation_m:seg.startStation_m,endStation_m:seg.endStation_m,length_m:seg.length,localAxes:m.localAxes||solved.localAxes||null,section:m.section||solved.section||null,stations:reconstructed.stations.map(row=>({...row,memberStation_m:seg.startStation_m+row.x_m})),checks:reconstructed.checks,method:reconstructed.method});
   });
   memberDiagrams.push({parentMemberId:group.parentMemberId,totalLength_m:group.totalLength_m,segmentCount:group.segmentCount,segments:segmentDiagrams,complete:segmentDiagrams.length===group.segmentCount});
  });
  loadCases.push({label,equilibrium:c?.equilibrium||null,members:memberDiagrams,complete:memberDiagrams.length===prepared.length&&memberDiagrams.every(m=>m.complete)});
 });
 const success=issues.length===0&&loadCases.length===cases.length&&loadCases.every(c=>c.complete);
 return {success,status:success?"complete-per-case-segment-diagrams":"insufficient_data",physicalMemberCount:prepared.length,analysisSegmentCount:tapered.length,caseCount:loadCases.length,loadCases,issues,scope:"Independent segment diagrams for each named load combination. Local axes and segment boundaries are retained; values are not enveloped across combinations or across segment-local axes. No member capacity, stability, serviceability, convergence or code approval is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const n=[{id:"n0",x:0,y:0,z:0},{id:"n1",x:2,y:0,z:0},{id:"n2",x:5,y:0,z:0}];
 const make=(id,i,start,end,length)=>({id,start,end,length,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:i,taperSegmentCount:2,analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}});
 const m=[make("R1_TAPER_01",1,"n0","n1",2),make("R1_TAPER_02",2,"n1","n2",3)];
 const solved=(id)=>({id,localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}});
 const cases=[{label:"ULS-A",equilibrium:{ok:true},members:m.map(x=>solved(x.id))},{label:"ULS-B",equilibrium:{ok:true},members:m.map(x=>solved(x.id))}];
 const good=build({nodes:n,members:m},cases);
 const noLedger=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:m.map(x=>({id:x.id,localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0]}}))}]);
 const missing=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:[solved(m[0].id)]}]);
 const broken=build({nodes:n,members:[m[0],{...m[1],start:"n0"}]},cases.slice(0,1));
 const badEq=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:false},members:m.map(x=>solved(x.id))}]);
 const point=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:m.map(x=>({...solved(x.id),pointLoads:[{x_m:1}]}))}]);
 const duplicate=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:m.map(x=>solved(x.id))},{label:"ULS",equilibrium:{ok:true},members:m.map(x=>solved(x.id))}]);
 const checks=[
  good.success&&good.loadCases.length===2&&good.loadCases[0].members[0].segments[1].stations[0].memberStation_m===2,
  good.loadCases[0].members[0].segments.length===2&&good.loadCases[1].label==="ULS-B",
  !noLedger.success&&noLedger.issues.some(x=>x.includes("کامل‌بودن دفتر بارگذاری")),
  !missing.success,
  !broken.success,
  !badEq.success,
  !point.success,
  !duplicate.success,
  !good.designApproved&&!good.analysisEnabled
 ];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedSectionForceDiagram={build,selfTest};
if(root.SteelTaperedCaseForceBridge)root.SteelTaperedCaseForceBridge.buildSectionForceDiagrams=(model,cases,options)=>build(model,cases,options);
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-combined-action-screen.js ===== */
/* SAHROUD STEEL — biaxial axial/flexural interaction screen.
 * H1-style interaction pattern only; exact M10-1401 clause/equation mapping has NOT been verified.
 * Uses externally verified LRFD design strengths; it does not calculate member capacities.
 * Demand convention: N_kN > 0 tension, N_kN < 0 compression; moments are absolute magnitudes.
 * Shear, torsion resistance, connection resistance and seismic detailing are separate checks.
 */
(function(root){"use strict";
const finitePositive=v=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function evaluate(d){
 d=d||{};const issues=[],warnings=[];
 if(d.codeBasis!=="H1-pattern-unverified-M10")issues.push("مبنای مبحث دهم ۱۴۰۱ به‌صورت صریح انتخاب نشده است.");
 if(d.officialTextVerified!==true)warnings.push("متن رسمی/اصلاحیه‌ها در این موتور مستقلاً تطبیق نشده‌اند؛ فرمول فقط غربال مقدماتی است.");
 if(d.capacityBasisVerified!==true)issues.push("مبنای ظرفیت‌های طراحی LRFD باید توسط مهندس و با ارجاع مستند تأیید شود.");
 if(d.secondOrderVerified!==true)issues.push("تأیید تحلیل مرتبه دوم/اثرات پایداری برای تقاضاهای مورد استفاده لازم است.");
 if(d.localSlendernessVerified!==true)issues.push("طبقه‌بندی لاغری موضعی مقطع طبق مبحث دهم تأیید نشده است.");
 if(!finite(d.N_kN))issues.push("نیروی محوری هم‌زمان N_kN باید عددی و با قرارداد علامت مشخص باشد.");
 ["Mx_kNm","My_kNm"].forEach(k=>{if(!finite(d[k])||d[k]<0)issues.push(k+" باید قدرمطلق لنگر هم‌زمان و نامنفی باشد.");});
 const tension=finite(d.N_kN)&&d.N_kN>=0;
 const axial=tension?d.tensionDesignStrengthKN:d.compressionDesignStrengthKN;
 const axialLabel=tension?"مقاومت طراحی کششی":"مقاومت طراحی فشاری";
 if(!finitePositive(axial))issues.push(axialLabel+" مستند و مثبت لازم است.");
 if(!finitePositive(d.momentDesignStrengthXKNm))issues.push("مقاومت طراحی خمشی محور X لازم است.");
 if(!finitePositive(d.momentDesignStrengthYKNm))issues.push("مقاومت طراحی خمشی محور Y لازم است.");
 if(d.torsionChecked!==true&&(!finite(d.torsionDemandKNm)||Math.abs(d.torsionDemandKNm)>1e-9))issues.push("پیچش عضو صفر/کنترل‌شده نیست؛ این موتور اندرکنش پیچش را پوشش نمی‌دهد.");
 if(issues.length)return{ok:false,issues,warnings,screeningOnly:true,designApproved:false,codeBasis:"H1-pattern-unverified-M10"};
 const Pr=Math.abs(d.N_kN),Mrx=d.Mx_kNm,Mry=d.My_kNm;
 const axialRatio=Pr/axial,momentRatioX=Mrx/d.momentDesignStrengthXKNm,momentRatioY=Mry/d.momentDesignStrengthYKNm;
 const branch=axialRatio>=0.20?"axial-dominant":"flexure-dominant";
 const interactionRatio=branch==="axial-dominant"?axialRatio+(8/9)*(momentRatioX+momentRatioY):axialRatio/2+momentRatioX+momentRatioY;
 warnings.push("برش، پیچش، کمانش موضعی محاسباتی، اندرکنش با اثرات موضعی جان/بال، اتصالات و الزامات لرزه‌ای باید جداگانه کنترل شوند.");
 warnings.push("مقاومت‌های طراحی ورودی از این موتور تولید نمی‌شوند؛ صحت مقطع، مهاربندی و ظرفیت‌های φRn باید مستقل مستند شود.");
 return{ok:true,branch,axialMode:tension?"tension":"compression",axialDesignStrengthKN:axial,axialRatio,momentRatioX,momentRatioY,interactionRatio,limit:1,pass:interactionRatio<=1+1e-12,LRFD:{interactionRatio,pass:interactionRatio<=1+1e-12},codeBasis:"H1-pattern-unverified-M10",clause:null,referenceStatus:"M10-1401 exact clause/equation not verified",screeningOnly:true,designApproved:false,warnings};
}
function selfTest(){
 const base={codeBasis:"H1-pattern-unverified-M10",officialTextVerified:false,capacityBasisVerified:true,secondOrderVerified:true,localSlendernessVerified:true,N_kN:-100,Mx_kNm:20,My_kNm:10,compressionDesignStrengthKN:400,tensionDesignStrengthKN:300,momentDesignStrengthXKNm:100,momentDesignStrengthYKNm:80,torsionDemandKNm:0,torsionChecked:false};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("compression axial-dominant branch",()=>{const r=evaluate({...base,N_kN:-160,Mx_kNm:10,My_kNm:8});return r.ok&&r.branch==="axial-dominant"&&Math.abs(r.interactionRatio-(0.4+(8/9)*(0.1+0.1)))<1e-12;});
 t("flexure-dominant branch",()=>{const r=evaluate({...base,N_kN:-40,Mx_kNm:20,My_kNm:16});return r.ok&&r.branch==="flexure-dominant"&&Math.abs(r.interactionRatio-(0.05+0.2+0.2))<1e-12;});
 t("exact 0.20 threshold uses axial-dominant branch",()=>evaluate({...base,N_kN:-80,Mx_kNm:0,My_kNm:0}).branch==="axial-dominant");
 t("tension uses tensile design strength",()=>{const r=evaluate({...base,N_kN:150,tensionDesignStrengthKN:300,compressionDesignStrengthKN:900,Mx_kNm:0,My_kNm:0});return r.ok&&r.axialMode==="tension"&&r.axialDesignStrengthKN===300&&r.axialRatio===0.5;});
 t("compression uses compressive design strength",()=>{const r=evaluate({...base,N_kN:-200,tensionDesignStrengthKN:900,compressionDesignStrengthKN:400,Mx_kNm:0,My_kNm:0});return r.ok&&r.axialMode==="compression"&&r.axialDesignStrengthKN===400&&r.axialRatio===0.5;});
 t("rejects missing axial or biaxial capacities",()=>!evaluate({...base,momentDesignStrengthYKNm:null}).ok&&!evaluate({...base,compressionDesignStrengthKN:null}).ok);
 t("rejects unverified second-order effects",()=>!evaluate({...base,secondOrderVerified:false}).ok);
 t("rejects unverified local slenderness",()=>!evaluate({...base,localSlendernessVerified:false}).ok);
 t("rejects nonzero torsion without separate verification",()=>!evaluate({...base,torsionDemandKNm:5,torsionChecked:false}).ok);
 t("allows separately verified torsion but keeps separate warning",()=>evaluate({...base,torsionDemandKNm:5,torsionChecked:true}).ok);
 t("over-utilized member is not passed",()=>evaluate({...base,N_kN:-400,Mx_kNm:50,My_kNm:40}).pass===false);
 t("never grants design approval",()=>evaluate(base).designApproved===false&&evaluate(base).screeningOnly===true);
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"H1-style interaction pattern regression only; exact M10-1401 mapping unverified; externally verified capacities required; no approval"};
}
root.SteelMemberCombinedActionScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/cold-formed-member-design-contract.js ===== */
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
function sourceIssues(label,source){const missing=SOURCE.filter(k=>!text(source?.[k]));return missing.length?[label+" فاقد ردگیری مستند است: "+missing.join("، ")+"."]:[];}
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
 issues.push(...sourceIssues("کاتالوگ/نقشه هندسه مقطع",p.catalogEvidence));
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
 issues.push(...sourceIssues("گواهی مصالح",m.certificateEvidence));
 const s=d.sectionProperties||{};
 PROPERTY_FIELDS.forEach(k=>{if(!finite(s[k])||(k!=="Ixy_mm4"&&k!=="shearCenterX_mm"&&k!=="shearCenterY_mm"&&s[k]<=0))issues.push("خاصیت واقعی مقطع "+k+" معتبر نیست.");});
 if(positive(s.Ix_mm4)&&positive(s.Iy_mm4)&&Math.abs(Number(s.Ixy_mm4)||0)>=Math.sqrt(s.Ix_mm4*s.Iy_mm4))issues.push("ماتریس اینرسی مقطع نامعتبر یا تکین است.");
 if(!text(s.source)||!text(s.method)||!text(s.revision))issues.push("منبع، روش استخراج و نسخه خواص مقطع باید مشخص باشد.");
 issues.push(...sourceIssues("مدرک خواص هندسی مقطع",s.evidence));
 const b=d.elasticBuckling||{};
 BUCKLING_FIELDS.forEach(k=>{if(!positive(b[k]))issues.push("خروجی کمانش الاستیک "+k+" لازم است.");});
 if(!text(b.solver)||!text(b.version)||!text(b.modelReference)||b.reviewed!==true)issues.push("مدل و خروجی کمانش الاستیک باید دارای نرم‌افزار/نسخه/مرجع مدل و بازبینی مستند باشد.");
 issues.push(...sourceIssues("گزارش محاسبه کمانش الاستیک",b.evidence));
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
 issues.push(...sourceIssues("مدرک ظرفیت اتصال",connection.evidence));
 const service=d.serviceability||{};
 if(service.checked!==true||!text(service.combinationReference)||!positive(service.limitRatio))issues.push("کنترل خیز/تغییرمکان در ترکیب بهره‌برداری و حد مجاز مستند نیست.");
 issues.push(...sourceIssues("مدرک کنترل بهره‌برداری/خیز",service.evidence));
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
 const good={group:"roofPurlin",memberId:"P-01",profile:{family:"Z",designation:"Z200-70-20-2.5",manufacturer:"MFG",catalogRevision:"R2",catalogEvidence:{document:"fixture.pdf",revision:"R2",locator:"sheet-1",authority:"manufacturer"},webHeight_mm:200,flange1_mm:70,flange2_mm:70,lip1_mm:20,lip2_mm:20,thickness_mm:2.5,insideRadius_mm:3},material:{Fy_MPa:350,Fu_MPa:420,E_MPa:200000,standard:"EN 10346",certificateReference:"MTC-01",certificateEvidence:{document:"fixture.pdf",revision:"R2",locator:"sheet-1",authority:"manufacturer"}},sectionProperties:{Ag_mm2:900,Ix_mm4:4e6,Iy_mm4:2e6,Ixy_mm4:0,J_mm4:5000,Cw_mm6:1e10,SxTop_mm3:40000,SxBottom_mm3:40000,SyTop_mm3:20000,SyBottom_mm3:20000,shearCenterX_mm:0,shearCenterY_mm:0,source:"manufacturer table",method:"tested section properties",revision:"R2",evidence:{document:"fixture.pdf",revision:"R2",locator:"sheet-1",authority:"manufacturer"}},elasticBuckling:{PcrGlobal_N:50000,PcrLocal_N:30000,PcrDistortional_N:40000,McrGlobal_Nmm:2e7,McrLocal_Nmm:1e7,McrDistortional_Nmm:1.5e7,solver:"CUFSM",version:"5.0",modelReference:"model-P01",reviewed:true,evidence:{document:"fixture.pdf",revision:"R2",locator:"sheet-1",authority:"manufacturer"}},restraint:{compressionFlangeBraced:true,braceSpacing_mm:1500,unbracedLength_mm:1500,braceType:"sag rod and sheeting",braceConnectionReference:"BR-01",braceCapacityVerified:true},loadCases:[{caseId:"ULS-1",label:"ULS-1",source:{document:"calc.pdf",revision:"A",locator:"p.10",authority:"engineer"},stations:[{station_mm:0,N_N:0,Vy_N:100,Vz_N:0,T_Nmm:0,My_Nmm:1000,Mz_Nmm:0},{station_mm:6000,N_N:0,Vy_N:-100,Vz_N:0,T_Nmm:0,My_Nmm:1000,Mz_Nmm:0}]}],connection:{type:"self-drilling screws",reference:"CONN-01",capacityVerified:true,evidence:{document:"fixture.pdf",revision:"R2",locator:"sheet-1",authority:"manufacturer"}},serviceability:{checked:true,combinationReference:"SLS-1",limitRatio:180,evidence:{document:"fixture.pdf",revision:"R2",locator:"sheet-1",authority:"manufacturer"}}};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:String(e)});}};
 t("complete evidence package passes readiness only",()=>{const x=audit(good);return x.success&&x.readyForResistanceReview&&!x.designApproved&&!x.capacityCalculated;});
 t("missing exact geometry blocks",()=>!audit({...good,profile:{...good.profile,lip1_mm:null}}).success);
 t("missing manufacturer geometry provenance blocks",()=>!audit({...good,profile:{...good.profile,catalogEvidence:null}}).success);
 t("missing material certificate provenance blocks",()=>!audit({...good,material:{...good.material,certificateEvidence:null}}).success);
 t("missing section property source provenance blocks",()=>!audit({...good,sectionProperties:{...good.sectionProperties,evidence:{document:"x"}}}).success);
 t("missing elastic buckling report provenance blocks",()=>!audit({...good,elasticBuckling:{...good.elasticBuckling,evidence:null}}).success);
 t("missing connection capacity provenance blocks",()=>!audit({...good,connection:{...good.connection,evidence:{document:"x"}}}).success);
 t("missing serviceability report provenance blocks",()=>!audit({...good,serviceability:{...good.serviceability,evidence:null}}).success);
 t("complete evidence sources retain readiness-only status",()=>{const x=audit(good);return x.success&&x.designApproved===false&&x.capacityCalculated===false;});

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


/* ===== steel2/js/member-design-scope-gate.js ===== */
/* SAHROUD STEEL — member-specific design scope gate.
 * This module prevents preliminary legacy screens from being mistaken for
 * complete code design. It reports supported scope and hard blockers only.
 */
(function(root){
"use strict";
const GROUPS=[
 {key:"column",label:"ستون",family:"hot-rolled-I",required:["section","compression","torsional-buckling","simultaneous-demand","biaxial-flexure","second-order","local-slenderness","shear","torsion","connection"]},
 {key:"rafter",label:"تیر/رفتر",family:"hot-rolled-I-or-tapered",required:["section","section-forces","simultaneous-demand","flexure","ltb","shear","interaction","second-order","local-slenderness","torsion","deflection","connection"]},
 {key:"roofPurlin",label:"لاپه سقف",family:"cold-formed-or-hot-rolled",required:["exact-profile","cold-formed-local-distortional","restraint","biaxial-actions","shear","torsion","load-combination","deflection","connections"]},
 {key:"wallGirt",label:"قید دیوار",family:"cold-formed-or-hot-rolled",required:["exact-profile","cold-formed-local-distortional","restraint","biaxial-actions","shear","torsion","load-combination","deflection","connections"]},
 {key:"braces",label:"مهاربندهای طولی سقف و دیوار",family:"brace-specific",required:["brace-force-demand","tension","compression","unbraced-length","connections","collector-diaphragm"]},
 {key:"endPost",label:"ستونک‌های انتهایی",family:"hot-rolled-or-built-up",required:["section","compression","torsional-buckling","biaxial-flexure","shear","interaction","second-order","local-slenderness","stability","connections"]},
 {key:"endGirt",label:"تیرهای انتهایی و گرت انتهایی",family:"cold-formed-or-hot-rolled",required:["exact-profile","biaxial-actions","local-distortional-buckling","shear","deflection","connections"]},
 {key:"roofEdge",label:"اعضای لبه و کناره سقف",family:"section-specific",required:["exact-section","biaxial-actions","stability","shear","deflection","connections"]},
 {key:"craneRunwayGirder",label:"تیر حمال جرثقیل",family:"crane-runway",required:["wheel-load-envelope","biaxial-flexure","shear","web-crippling","fatigue","serviceability","lateral-stability","connections"]},
 {key:"tieBeam",label:"شناژ و اعضای بتنی رابط",family:"reinforced-concrete",required:["concrete-material","reinforcement-layout","axial-flexure","shear","anchorage","foundation-interface"]}
];
const SUPPORT={
 column:["compression-global-buckling-limited"],
 rafter:[],
 roofPurlin:["preliminary-elastic-screen-only"],
 wallGirt:[]
};
const LABELS={
 section:"خواص و هندسه مقطع واقعی",compression:"مقاومت فشاری و کمانش کلی",
 "simultaneous-demand":"تقاضاهای هم‌زمان در هر ترکیب بار","biaxial-flexure":"خمش حول دو محور",
 "second-order":"تحلیل مرتبه دوم و اثرات پایداری","local-slenderness":"طبقه‌بندی لاغری موضعی و مقطع مؤثر",
 connection:"طراحی اتصال عضو","section-forces":"نمودار معتبر نیروهای داخلی در طول عضو",
 flexure:"مقاومت خمشی آیین‌نامه‌ای","ltb":"کمانش جانبی‌پیچشی و مهار واقعی",
 "torsional-buckling":"کمانش پیچشی و خمشی‌ـ‌پیچشی عضو",
 shear:"مقاومت برشی و اندرکنش لازم",torsion:"مقاومت پیچشی و اندرکنش پیچش با برش/خمش",
 "load-combination":"ترکیبات بار معتبر و هم‌زمان برای عضو",interaction:"اندرکنش کامل N-M دو‌محوره",
 deflection:"کنترل تغییرمکان/خیز در ترکیب بهره‌برداری","exact-profile":"نوع و مشخصات دقیق پروفیل",
 "cold-formed-local-distortional":"کمانش موضعی و اعوجاجی مقطع سردنورد",
 restraint:"مهار جانبی و پیچشی واقعی","biaxial-actions":"بارگذاری دو‌محوره و پیچش",
 connections:"اتصالات و پیچ‌های لاپه/قید",
 "analysis-integrity":"سلامت تحلیل: تعادل، پوشش اعضا/حالت‌ها و بردارهای نیرو", "brace-force-demand":"استخراج نیروهای محوری هم‌زمان هر ترکیب",tension:"ظرفیت کششی و گسیختگی مقطع مهاربند",
 "unbraced-length":"طول مهارنشده و ضریب طول مؤثر مستند","collector-diaphragm":"دیافراگم و جمع‌کننده و انتقال بار طولی مستند",
 "local-distortional-buckling":"کمانش موضعی و اعوجاجی مقطع","exact-section":"هندسه و خواص مقطع واقعی","wheel-load-envelope":"قطار بار چرخ و پوش نیروهای جرثقیل",
 "web-crippling":"لهیدگی جان و اثر بار متمرکز چرخ","fatigue":"خستگی و طیف چرخه بار","serviceability":"تغییرمکان و ارتعاش بهره‌برداری",
 "lateral-stability":"پایداری جانبی و پیچشی تیر حمال","concrete-material":"مقاومت و مشخصات بتن و فولاد","reinforcement-layout":"آرایش و مهار آرماتورها",
 "axial-flexure":"اندرکنش نیروی محوری و خمش بتن‌آرمه","anchorage":"طول مهاری و وصله آرماتور","foundation-interface":"انتقال نیرو به فونداسیون"
};
function audit(){
 const env=root.SteelMemberForceEnvelope?.getLast?.()||null;
 const demand=root.SteelMemberDesignDemandPackage?.getLast?.()||null;
 const demandPackage={available:!!demand,success:demand?.success===true,status:demand?.status||"not-built",caseCount:Array.isArray(demand?.caseIds)?demand.caseIds.length:0,memberCount:Array.isArray(demand?.members)?demand.members.length:0,issues:Array.isArray(demand?.issues)?demand.issues.slice():[],blockers:Array.isArray(demand?.designGate?.blockers)?demand.designGate.blockers.slice():[],designApproved:false};
 const workbench=root.SteelLoadCaseWorkbench?.read?.()||null;
 const combinationAudit=workbench&&root.SteelLoadCaseWorkbench?.audit?root.SteelLoadCaseWorkbench.audit(workbench):null;
 const proposal=demand?.combinationProposal||null;
 const integrityIssues=[];
 if(!env)integrityIssues.push("پوش نیرو/خروجی تحلیل هنوز ساخته نشده است.");
 else{
  if(env.allCasesEquilibriumOK!==true)integrityIssues.push("تعادل عددی تمام حالت‌های تحلیل تأیید نشده است.");
  if(env.caseLabelCoverageOK!==true)integrityIssues.push("پوشش کامل و یکتای برچسب ترکیب‌های تحلیل تأیید نشده است.");
  if((env.invalidForceVectors||[]).length)integrityIssues.push("بردارهای نیروی انتهایی نامعتبر وجود دارد.");
  if((env.unreportedMemberIds||[]).length)integrityIssues.push("اعضای مدل در گزارش نیرو جا افتاده‌اند.");
  if((env.extraMemberIds||[]).length)integrityIssues.push("شناسه عضو خارج از مدل در گزارش نیرو وجود دارد.");
  if((env.analysisMemberSetMismatchCases||[]).length)integrityIssues.push("مجموعه اعضای تحلیل بین حالت‌های بار یکسان نیست.");
  if((env.duplicateMemberIdsByCase||[]).length)integrityIssues.push("شناسه عضو در یک حالت تحلیل تکراری است.");
  if(env.taperedForceTrace?.applicable===true&&env.taperedForceTrace?.allApplicableCasesComplete!==true)integrityIssues.push("ردیابی نیرو در قطعات تیرورق متغیرمقطع کامل نیست.");
 }
 const combinationBridge={engineAvailable:!!root.SteelMemberDemandCombinationBridge?.build,proposalExecuted:!!proposal,proposalSuccess:proposal?.success===true,status:proposal?.status||"not-executed",issues:Array.isArray(proposal?.issues)?proposal.issues.slice():[],designApproved:false};
 const combinationStatus={available:!!combinationAudit,success:combinationAudit?.success===true,loadCaseCount:Array.isArray(workbench?.loadCases)?workbench.loadCases.length:0,combinationCount:Array.isArray(workbench?.combinations)?workbench.combinations.length:0,issues:Array.isArray(combinationAudit?.issues)?combinationAudit.issues.slice():[],linkedToDemandPackage:proposal?.success===true,solverDemandCasesAvailable:proposal?.success===true,designApproved:false};
 const rows=GROUPS.map(g=>{
  const members=Array.isArray(env?.members)?env.members.filter(m=>g.key==="braces"?["wallBrace","roofBrace"].includes(m.sectionKey):m.sectionKey===g.key):[];
  const missing=[...g.required];
  if(integrityIssues.length)missing.unshift("analysis-integrity");
  if(g.key==="braces"&&root.SteelBraceForceDemandAudit?.audit&&env){const br=root.SteelBraceForceDemandAudit.audit(env,root.SteelStructuralModel?.getData?.());if(br.success)missing.splice(missing.indexOf("brace-force-demand"),1);}
  if(!members.length)missing.unshift("وجود اعضا و نیروهای معتبر در مدل");
  if(g.key==="column"&&root.SteelCompressionCapacity?.analyze)missing.splice(missing.indexOf("compression"),1);
  if((g.key==="column"||g.key==="rafter")&&members.length){
   const components=["N","Vy","Vz","T","My","Mz"];
   const validCase=c=>!!c?.label&&["endI","endJ"].every(end=>c[end]&&components.every(k=>typeof c[end][k]==="number"&&Number.isFinite(c[end][k])));
   const noSim=members.some(m=>!Array.isArray(m.simultaneousCases)||!m.simultaneousCases.length||m.simultaneousCases.some(c=>!validCase(c)));
   if(noSim){if(!missing.includes("simultaneous-demand"))missing.push("simultaneous-demand");}
   else{const i=missing.indexOf("simultaneous-demand");if(i>=0)missing.splice(i,1);}
  }
  const blockers=missing.map(k=>LABELS[k]||k);
  const supported=(SUPPORT[g.key]||[]).slice();
  if((g.key==="column"||g.key==="rafter")&&root.SteelMemberCombinedActionScreen?.evaluate)supported.push("موتور اندرکنش مقدماتی N-Mx-My؛ ظرفیت‌های طراحی باید جداگانه و مستند وارد شوند و اتصال به تقاضای تحلیل هنوز کامل نیست");
  if(["roofPurlin","wallGirt","endGirt"].includes(g.key)&&root.SteelColdFormedMemberContract?.audit)supported.push("قرارداد ممیزی خواص واقعی، کمانش موضعی/اعوجاجی، مهار، تقاضای هم‌زمان و اتصالات؛ بدون محاسبه ظرفیت");
  return {group:g.key,label:g.label,memberCount:members.length,availableLimitedEngines:supported,missing:blockers,status:blockers.length?"blocked":"limited-only",designApproved:false};
 });
 return {designApproved:false,rows,demandPackage,combinationStatus,combinationBridge,analysisIntegrity:{success:integrityIssues.length===0,issues:integrityIssues},summary:{groups:rows.length,blocked:rows.filter(x=>x.status==="blocked").length,limitedOnly:rows.filter(x=>x.status==="limited-only").length,demandPackageAvailable:demandPackage.available,demandPackageComplete:demandPackage.success,documentedCombinationSetValid:combinationStatus.success,combinationsLinkedToDemand:combinationStatus.linkedToDemandPackage},rules:[
  "بسته تقاضای ایستگاهی فقط در صورت ساخت موفق نمایش داده می‌شود؛ این وضعیت به‌تنهایی مجوز طراحی نیست.",
  "ممیزی ترکیب‌ها در دفترچه شواهد، جایگزین اجرای تحلیل اثر ترکیب‌ها و اتصال آن‌ها به بسته تقاضا نیست.",
  "هیچ‌یک از مسیرهای این ممیزی مجوز طراحی اجرایی صادر نمی‌کند.",
  "وجود موتور محدود کمانش فشاری ستون به معنی کنترل کامل ستون نیست.",
  "کنترل مقدماتی لاپه موجود، جایگزین روش طراحی سردنورد و کمانش موضعی/اعوجاجی نیست.",
  "مقادیر بیشینه مستقل ترکیبات بار نباید برای ساخت تقاضای هم‌زمان با یکدیگر ترکیب شوند.",
  "موتور اندرکنش N-Mx-My فقط با ظرفیت‌های طراحی مستند و تقاضای هم‌زمان قابل استفاده است؛ تا اتصال کامل به تحلیل و تأیید ظرفیت‌ها، مسیر طراحی نهایی نیست.",
  "قرارداد اعضای سردنورد فقط کامل بودن شواهد هندسه، خواص، کمانش الاستیک، مهار، تقاضا و اتصال را ممیزی می‌کند؛ مقاومت طراحی سردنورد هنوز محاسبه نمی‌شود."
 ]};
}
function selfTest(){
 const saved={env:root.SteelMemberForceEnvelope,cold:root.SteelColdFormedMemberContract,demand:root.SteelMemberDesignDemandPackage,workbench:root.SteelLoadCaseWorkbench,bridge:root.SteelMemberDemandCombinationBridge};
 const validSim=[{label:"ULS-1",endI:{N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},endJ:{N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}}];
 root.SteelMemberForceEnvelope={getLast:()=>({members:[{sectionKey:"column",simultaneousCases:validSim},{sectionKey:"rafter",simultaneousCases:validSim},{sectionKey:"roofPurlin"},{sectionKey:"wallGirt"}],allCasesEquilibriumOK:true,caseLabelCoverageOK:true,invalidForceVectors:[],unreportedMemberIds:[],extraMemberIds:[],analysisMemberSetMismatchCases:[],duplicateMemberIdsByCase:[],taperedForceTrace:{applicable:false,allApplicableCasesComplete:true}})};
 root.SteelColdFormedMemberContract={audit:()=>({success:false,designApproved:false})};
 root.SteelMemberDesignDemandPackage={getLast:()=>null};
 root.SteelLoadCaseWorkbench={read:()=>null};
 root.SteelMemberDemandCombinationBridge={build:()=>({})};
 const r=audit();
 root.SteelMemberForceEnvelope={getLast:()=>({members:[],allCasesEquilibriumOK:false,caseLabelCoverageOK:false,invalidForceVectors:[{memberId:"M1"}],unreportedMemberIds:["M2"],extraMemberIds:[],analysisMemberSetMismatchCases:[],duplicateMemberIdsByCase:[],taperedForceTrace:{applicable:false,allApplicableCasesComplete:true}})};
 const broken=audit();
 root.SteelMemberForceEnvelope=saved.env;root.SteelColdFormedMemberContract=saved.cold;root.SteelMemberDesignDemandPackage=saved.demand;root.SteelLoadCaseWorkbench=saved.workbench;root.SteelMemberDemandCombinationBridge=saved.bridge;
 const tests=[
  {name:"four primary member families and longitudinal braces reported",ok:r.rows.length===10},
  {name:"column global compression engine remains limited",ok:r.rows[0].availableLimitedEngines.includes("compression-global-buckling-limited")&&r.rows[0].designApproved===false},
  {name:"column remains blocked by missing full design checks",ok:r.rows[0].status==="blocked"&&r.rows[0].missing.some(x=>x.includes("خمش حول دو محور"))},
  {name:"column requires torsional buckling, shear and torsion checks",ok:r.rows[0].missing.some(x=>x.includes("کمانش پیچشی"))&&r.rows[0].missing.some(x=>x.includes("مقاومت برشی"))&&r.rows[0].missing.some(x=>x.includes("مقاومت پیچشی"))},
  {name:"rafter requires internal force diagram, LTB, stability and connections",ok:r.rows[1].missing.some(x=>x.includes("نمودار معتبر"))&&r.rows[1].missing.some(x=>x.includes("کمانش جانبی"))&&r.rows[1].missing.some(x=>x.includes("مرتبه دوم"))&&r.rows[1].missing.some(x=>x.includes("اتصال عضو"))},
  {name:"valid simultaneous six-action vectors satisfy the demand gate for column and rafter",ok:!r.rows[0].missing.includes("تقاضاهای هم‌زمان در هر ترکیب بار")&&!r.rows[1].missing.includes("تقاضاهای هم‌زمان در هر ترکیب بار")},
  {name:"malformed simultaneous vectors block both column and rafter",ok:(()=>{root.SteelMemberForceEnvelope={getLast:()=>({members:[{sectionKey:"column",simultaneousCases:[{}]},{sectionKey:"rafter",simultaneousCases:[{}]}],allCasesEquilibriumOK:true,caseLabelCoverageOK:true,invalidForceVectors:[],unreportedMemberIds:[],extraMemberIds:[],analysisMemberSetMismatchCases:[],duplicateMemberIdsByCase:[],taperedForceTrace:{applicable:false,allApplicableCasesComplete:true}})};const x=audit();return x.rows[0].missing.includes("تقاضاهای هم‌زمان در هر ترکیب بار")&&x.rows[1].missing.includes("تقاضاهای هم‌زمان در هر ترکیب بار");})()},
  {name:"purlin requires cold-formed local and distortional checks",ok:r.rows[2].missing.some(x=>x.includes("کمانش موضعی"))},
  {name:"girt follows a section-specific route",ok:r.rows[3].missing.length>0},
  {name:"purlin and girt expose evidence-only cold-formed contract",ok:r.rows[2].availableLimitedEngines.some(x=>x.includes("قرارداد ممیزی"))&&r.rows[3].availableLimitedEngines.some(x=>x.includes("قرارداد ممیزی"))},
  {name:"brace group remains blocked pending capacity and collector checks",ok:r.rows[4].status==="blocked"&&r.rows[4].missing.some(x=>x.includes("کمانش کلی"))&&r.rows[4].missing.some(x=>x.includes("جمع‌کننده"))},
  {name:"crane girder requires wheel loads, fatigue and web crippling",ok:r.rows.find(x=>x.group==="craneRunwayGirder")?.missing.some(x=>x.includes("خستگی"))&&r.rows.find(x=>x.group==="craneRunwayGirder")?.status==="blocked"},
 {name:"reinforced concrete tie remains outside steel capacity engine",ok:r.rows.find(x=>x.group==="tieBeam")?.missing.some(x=>x.includes("بتن"))},
 {name:"no group receives design approval",ok:r.rows.every(x=>x.designApproved===false)&&r.designApproved===false},
  {name:"demand package status is exposed without design approval",ok:r.demandPackage&&r.demandPackage.designApproved===false&&r.designApproved===false},
  {name:"combination audit is not treated as solver demand linkage",ok:r.combinationStatus&&r.combinationStatus.linkedToDemandPackage===false&&r.combinationStatus.solverDemandCasesAvailable===false},
  {name:"combination demand bridge is surfaced as unexecuted and non-approving",ok:r.combinationBridge&&r.combinationBridge.designApproved===false&&r.combinationBridge.proposalExecuted===false},
 {name:"valid analysis integrity is reported separately",ok:r.analysisIntegrity.success===true},
 {name:"failed equilibrium, missing members and invalid vectors block every family",ok:broken.analysisIntegrity.success===false&&broken.rows.every(x=>x.missing.includes("سلامت تحلیل: تعادل، پوشش اعضا/حالت‌ها و بردارهای نیرو"))}
 ];
 root.SteelMemberForceEnvelope=saved.env;
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,tests};
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function render(){
 const host=document.getElementById("memberDesignScopeGateResults");if(!host)return;
 const r=audit();
 const d=r.demandPackage,k=r.combinationStatus;
 const bridgeText="مبدل تقاضای ترکیبی: "+(r.combinationBridge.proposalExecuted?(r.combinationBridge.proposalSuccess?"پیشنهاد ترکیب نیرو ساخته شده؛ تأیید طراحی نیست":"اجرا شده اما مسدود/ناموفق"):(r.combinationBridge.engineAvailable?"آماده استفاده؛ هنوز اجرا نشده":"ماژول بارگذاری نشده"))+".";
 const demandText="بسته تقاضا: "+(d.available?(d.success?"ساخته شده؛ "+d.caseCount+" حالت و "+d.memberCount+" عضو":"ناقص / ناموفق"):"هنوز ساخته نشده")+" — دفترچه ترکیب‌ها: "+k.combinationCount+" از "+k.loadCaseCount+" حالت بار؛ "+(k.success?"ممیزی ساختاری موفق":"ممیزی ناقص یا ناموفق")+" — اتصال تقاضای تحلیل به پیشنهاد ترکیب: "+(k.linkedToDemandPackage?"انجام شده":"انجام نشده")+"؛ این اتصال ظرفیت عضو را تأیید نمی‌کند.";
 const details=[...r.analysisIntegrity.issues,...d.issues,...d.blockers,...k.issues,...r.combinationBridge.issues].filter(Boolean);
 host.innerHTML="<h4>وضعیت مسیر طراحی اعضا</h4><p>گروه‌های مسدود: "+r.summary.blocked+" از "+r.summary.groups+" — هیچ گروهی تأیید طراحی نشده است.</p><div class='notice'>"+esc(bridgeText)+"<br>"+esc(demandText)+(details.length?"<br>"+esc(details.join("؛ ")):"")+"</div><div style='overflow-x:auto'><table class='data-table'><thead><tr><th>گروه</th><th>تعداد اعضای دارای پوش نیرو</th><th>موتور محدود موجود</th><th>موارد تکمیل‌نشده</th><th>وضعیت</th></tr></thead><tbody>"+r.rows.map(x=>"<tr><td>"+esc(x.label)+"</td><td>"+x.memberCount+"</td><td>"+esc(x.availableLimitedEngines.join("، ")||"ندارد")+"</td><td>"+esc(x.missing.join("؛ "))+"</td><td>مسدود / غیرنهایی</td></tr>").join("")+"</tbody></table></div><div class='notice'>"+r.rules.map(esc).join("<br>")+"</div>";
}
function init(){
 if(document.getElementById("memberDesignScopeGatePanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="memberDesignScopeGatePanel";p.setAttribute("data-focus-group","member-design");
 p.innerHTML="<div class='panel-title'><h3>دروازه کنترل دامنه طراحی تمام اعضای سوله</h3><span class='status'>کنترل عدم تأیید کاذب</span></div><div class='notice'>این بخش مشخص می‌کند کدام کنترل‌های واقعی هنوز برای هر گروه عضو لازم‌اند؛ از نمایش قبولی بر اساس موتورهای مقدماتی جلوگیری می‌کند.</div><div class='button-grid'><button class='btn secondary' id='btnMemberDesignScopeGate' type='button'>بازبینی دامنه طراحی اعضا</button></div><div id='memberDesignScopeGateResults'></div>";
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);
 document.getElementById("btnMemberDesignScopeGate").addEventListener("click",render);
}
root.SteelMemberDesignScopeGate={audit,selfTest,render};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/prismatic-nonprismatic-section.js ===== */
(function(root){
"use strict";
const KEYS=["depth_mm","flangeWidth_mm","flangeThickness_mm","webThickness_mm"];
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function fail(issues){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false};}
function section(s){
 const d=s.depth_mm,b=s.flangeWidth_mm,tf=s.flangeThickness_mm,tw=s.webThickness_mm;
 const hw=d-2*tf;
 if(d<=0||b<=0||tf<=0||tw<=0||hw<=0||tw>=b)throw Error("ابعاد مقطع I نامعتبر یا جان/بال نامتناسب است.");
 const A=2*b*tf+tw*hw;
 const Ix=2*((b*Math.pow(tf,3))/12+b*tf*Math.pow((d-tf)/2,2))+tw*Math.pow(hw,3)/12;
 const Iy=2*tf*Math.pow(b,3)/12+hw*Math.pow(tw,3)/12;
 const J=(2*b*Math.pow(tf,3)+hw*Math.pow(tw,3))/3;
 const h0=d-tf,Cw_mm6=Iy*h0*h0/4,Zpx_mm3=b*tf*(d-tf)+tw*hw*hw/4,Zpy_mm3=tf*b*b/2+hw*tw*tw/4,Aw_mm2=hw*tw;
 return {A_mm2:A,Ix_mm4:Ix,Iy_mm4:Iy,J_mm4_thinWall:J,Cw_mm6,rx_mm:Math.sqrt(Ix/A),ry_mm:Math.sqrt(Iy/A),Sx_mm3:Ix/(d/2),Sy_mm3:Iy/(b/2),Zpx_mm3,Zpy_mm3,Aw_mm2,webClearDepth_mm:hw,flangeOutstand_mm:(b-tw)/2,flangeOutstandRatio:(b-tw)/(2*tf),webDepthThicknessRatio:hw/tw,depth_mm:d,flangeWidth_mm:b,flangeThickness_mm:tf,webThickness_mm:tw};
}
function evaluate(input){
 const x=input||{},issues=[],L=num(x.length_m),raw=Array.isArray(x.stations)?x.stations:[];
 if(L===null||L<=0)issues.push("طول واقعی عضو باید مثبت و بر حسب متر باشد.");
 if(raw.length<2)issues.push("حداقل مشخصات مقطع در ابتدا و انتهای عضو لازم است.");
 if(x.sectionFamily!=="welded-I")issues.push("نسخه حاضر فقط مقطع I ورق‌ساخته با بال‌های موازی را پشتیبانی می‌کند.");
 if(x.geometrySource!=="shop-drawing"&&x.geometrySource!=="design-input")issues.push("منبع ابعاد مقطع باید نقشه ساخت یا ورودی طراحی مشخص باشد.");
 if(x.dimensionsVerified!==true)issues.push("ابعاد مقطع باید با نقشه/اندازه‌گیری تأیید شوند.");
 if(raw.some(s=>!s||num(s.x_m)===null||KEYS.some(k=>num(s[k])===null)))issues.push("مختصات ایستگاه و تمام ابعاد مقطع باید عددی و کامل باشند.");
 if(issues.length)return fail(issues);
 const stations=raw.map(s=>({x_m:num(s.x_m),depth_mm:num(s.depth_mm),flangeWidth_mm:num(s.flangeWidth_mm),flangeThickness_mm:num(s.flangeThickness_mm),webThickness_mm:num(s.webThickness_mm)})).sort((a,b)=>a.x_m-b.x_m);
 if(Math.abs(stations[0].x_m)>1e-8||Math.abs(stations[stations.length-1].x_m-L)>1e-6)issues.push("ایستگاه اول باید صفر و ایستگاه آخر برابر طول عضو باشد.");
 for(let i=0;i<stations.length;i++){
  if(stations[i].x_m<0||stations[i].x_m>L)issues.push("ایستگاه خارج از طول عضو است.");
  if(i&&stations[i].x_m-stations[i-1].x_m<=1e-8)issues.push("مختصات ایستگاه‌ها باید یکتا و افزایشی باشند.");
 }
 if(issues.length)return fail(issues);
 const maxStep=num(x.maxStationSpacing_m);
 if(maxStep===null||maxStep<=0)issues.push("حداکثر فاصله ایستگاه‌های محاسبات هندسی باید صریح و مثبت باشد.");
 if(issues.length)return fail(issues);
 const grid=[];
 for(let i=0;i<stations.length-1;i++){
  const a=stations[i],b=stations[i+1],span=b.x_m-a.x_m,n=Math.max(1,Math.ceil(span/maxStep));
  for(let j=0;j<n;j++){
   const t=j/n,p={x_m:a.x_m+span*t};
   KEYS.forEach(k=>p[k]=a[k]+(b[k]-a[k])*t);
   grid.push(p);
  }
 }
 grid.push({...stations[stations.length-1]});
 const tol=1e-8,first=stations[0];
 const prismatic=stations.every(s=>KEYS.every(k=>Math.abs(s[k]-first[k])<=tol*Math.max(1,Math.abs(first[k]))));
 let samples;
 try{samples=grid.map(s=>({x_m:s.x_m,geometry:{depth_mm:s.depth_mm,flangeWidth_mm:s.flangeWidth_mm,flangeThickness_mm:s.flangeThickness_mm,webThickness_mm:s.webThickness_mm},properties:section(s)}));}
 catch(e){return fail([e.message]);}
 const transitions=[];
 for(let i=1;i<stations.length-1;i++)transitions.push({x_m:stations[i].x_m,geometryChange:true});
 const minWeb=Math.min(...samples.map(s=>s.properties.webClearDepth_mm));
 return {ok:true,pass:true,memberType:prismatic?"prismatic":"non-prismatic",memberLabel:prismatic?"منشوری":"غیرمنشوری",method:"Piecewise-linear welded-I geometry interpolation and station-wise section-property calculation",length_m:L,stationCount:samples.length,definitionStations:stations.length,transitions,minWebClearDepth_mm:minWeb,stations:samples,analysisEnabled:false,designApproved:false,scope:"Geometry/property engine only. Not a variable-stiffness FEM element, not a code resistance check, and not a substitute for local plate slenderness, tapered-member buckling, lateral-torsional buckling, shear, interaction, second-order analysis, weld design or connection checks. Linear interpolation is assumed only between explicitly supplied geometry stations."};
}
function selfTest(){
 const base={length_m:6,sectionFamily:"welded-I",geometrySource:"shop-drawing",dimensionsVerified:true,maxStationSpacing_m:1,stations:[{x_m:0,depth_mm:500,flangeWidth_mm:200,flangeThickness_mm:12,webThickness_mm:8},{x_m:6,depth_mm:500,flangeWidth_mm:200,flangeThickness_mm:12,webThickness_mm:8}]};
 const a=evaluate(base),b=evaluate({...base,stations:[{...base.stations[0]},{...base.stations[1],depth_mm:900}]}),c=evaluate({...base,dimensionsVerified:false}),d=evaluate({...base,stations:[base.stations[0],{...base.stations[1],depth_mm:10}]});
 const p=section({depth_mm:500,flangeWidth_mm:200,flangeThickness_mm:12,webThickness_mm:8});
 const propertyCheck=p.Cw_mm6>0&&p.Zpx_mm3>p.Sx_mm3&&p.Aw_mm2===3808&&p.flangeOutstand_mm===96;
 const checks=[a.ok&&a.memberType==="prismatic"&&a.stations.length===7,b.ok&&b.memberType==="non-prismatic"&&b.stations[3].properties.depth_mm>500,!c.ok,!d.ok,propertyCheck];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelPrismaticNonprismaticSection={evaluate,sectionProperties:section,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/design-code-registry.js ===== */
/* SAHROUD STEEL — controlled design-code register.
 * Iranian mandatory requirements are primary. Supplementary standards never
 * silently replace them. Applicability and edition are project-controlled.
 */
(function(root){
"use strict";
const codes=[
 {id:"m5",name:"مبحث پنجم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۳۹۶",scope:"مصالح و فرآورده‌ها؛ انطباق محصول، مشخصات و مدارک مصالح",status:"primary",modules:["materials","steel-products","concrete-materials"],source:"https://qsce.ir/uploads/مبحث%20پنجم%20مقررات%20ملی.pdf"},
 {id:"m6",name:"مبحث ششم مقررات ملی ساختمان",edition:"ویرایش چهارم، ۱۳۹۸",scope:"بارهای مرده، زنده، برف، باد، باران و ترکیبات بار",status:"primary",modules:["loads","roof","frame","serviceability"],source:"https://archweb.ir/2024/09/26/"},
 {id:"m7",name:"مبحث هفتم مقررات ملی ساختمان",edition:"ویرایش چهارم، ۱۴۰۰",scope:"ژئوتکنیک، ظرفیت باربری، نشست، گودبرداری و پی‌سازی",status:"primary",modules:["geotechnical","foundations","settlement"],source:"https://archweb.ir/2024/09/26/"},
 {id:"m9",name:"مبحث نهم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۳۹۹",scope:"طراحی و اجرای بتن‌آرمه؛ پی، شناژ، جزئیات آرماتور و مهار به بتن (فصل هجدهم)",status:"primary",modules:["footings","tie-beams","reinforced-concrete","concrete-anchors"],source:"https://inbr.ir/upload/mabhas/1402-08/mabhas9-1402-08.pdf"},
 {id:"m10",name:"مبحث دهم مقررات ملی ساختمان",edition:"ویرایش پنجم، ۱۴۰۱",scope:"طراحی و اجرای فولاد؛ اعضا، پایداری، اتصالات، الزامات لرزه‌ای و ساخت",status:"primary",modules:["steel-members","columns","rafters","bracing","connections","fabrication"],source:"https://technobetar.ir/code/nbri/mabhas-10"},
 {id:"m11",name:"مبحث یازدهم مقررات ملی ساختمان",edition:"ویرایش سوم، ۱۴۰۰",scope:"الزامات مرتبط با طرح و اجرای صنعتی ساختمان‌ها؛ در بخش‌های واقعاً مشمول پروژه",status:"primary",modules:["industrial-building","fabrication","erection"],source:"https://archweb.ir/2024/09/26/"},
 {id:"std2800",name:"استاندارد ۲۸۰۰ ایران",edition:"ویرایش چهارم و پنجم؛ اجرای همزمان تا پایان اردیبهشت ۱۴۰۶ تمدید شده است",scope:"خطر لرزه‌ای، سیستم سازه‌ای، تحلیل و طراحی لرزه‌ای و اجزای غیرسازه‌ای",status:"primary-transition",modules:["seismic","global-stability","nonstructural"],source:"https://irceo.ir/fa/news/36432/"},
 {id:"aisi-s100",name:"AISI S100",edition:"2024 Edition (مرجع تکمیلی؛ مشروط به تعیین روش مجاز و تأیید پروژه)",scope:"اعضای فولادی سردنوردشده نازک‌جداره مانند لاپه‌های Z و C؛ نه جایگزین خودکار مبحث دهم",status:"supplementary",modules:["cold-formed-purlins"],source:"https://www.cfsteel.org/publications"},
 {id:"aisc360",name:"ANSI/AISC 360-22",edition:"2022 Edition (مرجع تطبیقی تکمیلی)",scope:"تطبیق و کنترل مستقل؛ فقط در حدودی که با ضوابط لازم‌الاجرای ایران تعارض نداشته باشد",status:"supplementary",modules:["steel-members","connections","benchmark"],source:"https://www.aisc.org/aisc/publications/current-standards/aisc-360/"},
 {id:"aws-d11",name:"AWS D1.1/D1.1M",edition:"نسخه قرارداد/پروژه باید صریحاً تعیین و با مبحث دهم تطبیق داده شود",scope:"کیفیت و الزامات جوشکاری سازه‌های فولادی در حدود کاربرد مصوب پروژه",status:"pending",modules:["welds","fabrication"],source:"https://www.aws.org/"}
];
const materialNotes=[
 "نام‌های تجاری/تاریخی مانند ST37 و ST52 به‌تنهایی اثبات‌کننده انطباق محصول با مصالح مجاز و مشخصات مبحث دهم نیستند.",
 "برای هر محموله باید استاندارد محصول، گرید/زیرگرید، ضخامت، گواهی کارخانه، خواص مکانیکی و الزامات چقرمگی حسب مورد بررسی شود.",
 "خواص مصالح نامعلوم یا فاقد مدرک معتبر نباید با مقدار پیش‌فرض به طراحی تأییدشده راه یابند."
];
const moduleMap=[
 ["بارگذاری و ترکیبات بار","مبحث ششم ۱۳۹۸"],
 ["قاب، تیر و ستون فولادی","مبحث دهم ۱۴۰۱ + استاندارد ۲۸۰۰ با ویرایش انتخاب‌شده پروژه"],
 ["مهاربند و پایداری لرزه‌ای","مبحث دهم + ویرایش انتخاب‌شده استاندارد ۲۸۰۰"],
 ["لاپه Z/C سردنورد","مبحث دهم + روش تکمیلی سردنوردِ صریحاً مجاز و ثبت‌شده"],
 ["اتصالات پیچ و جوش","مبحث دهم؛ استاندارد تکمیلی فقط با تعیین نسخه و دامنه"],
 ["صفحه‌ستون و انکر","مبحث دهم + مبحث نهم + ضوابط ژئوتکنیکی مربوط"],
 ["فونداسیون و شناژ","مبحث هفتم + مبحث نهم"],
 ["مصالح و گواهی محصول","مبحث پنجم + الزامات مصالح مبحث دهم"],
 ["ساخت و نصب صنعتی","مبحث یازدهم در حدود شمول + مبحث دهم"]
];
const transition={
 code:"std2800",
 notice:"اجرای همزمان ویرایش چهارم و پنجم استاندارد ۲۸۰۰ تا پایان اردیبهشت ۱۴۰۶ تمدید شده است.",
 projectRule:"نسخه حاکم باید برای هر پروژه صریحاً با توجه به تاریخ و ضوابط ابلاغی/مرجع صدور پروانه تعیین و در پرونده پروژه ثبت شود. نرم‌افزار نباید ویرایش چهارم و پنجم را در یک پروژه بی‌قاعده مخلوط کند یا بدون انتخاب مستند یکی را تحمیل کند.",
 officialSource:"https://irceo.ir/fa/news/36432/"
};
function getData(){return {schemaVersion:2,primary:"مقررات ملی ساختمان ایران و ضوابط لازم‌الاجرای پروژه",codes:codes.map(c=>({...c})),materialNotes:[...materialNotes],moduleMap:moduleMap.map(x=>({module:x[0],basis:x[1]})),transition:{...transition},policy:"هر کنترل باید مرجع، ویرایش، بند دقیق، ورودی‌ها، واحدها، فرضیات، نتیجه و وضعیت اعتبارسنجی خود را ثبت کند. مرجع بین‌المللی فقط تکمیلی است و جایگزین خودکار الزام ایرانی نیست."};}
function render(){
 const host=root.document?.getElementById("designCodeRegistryContent");if(!host)return;
 const status=c=>c.status==="primary"?"مرجع اصلی":c.status==="primary-transition"?"مرجع اصلی با دوره گذار":c.status==="supplementary"?"تکمیلی":"نیازمند تعیین ویرایش";
 host.innerHTML='<div class="notice"><b>سیاست مبنای طراحی:</b> مقررات ملی و ضوابط لازم‌الاجرای ایران مرجع اصلی‌اند. استاندارد خارجی جایگزین خودکار ضابطه ملی نمی‌شود.</div>'+
 '<div class="notice"><b>وضعیت استاندارد ۲۸۰۰:</b> '+transition.notice+' '+transition.projectRule+' <a href="'+transition.officialSource+'" target="_blank" rel="noopener">اطلاعیه رسمی شورای مرکزی</a></div>'+
 '<div class="notice"><b>کنترل مصالح:</b> '+materialNotes.join(" ")+'</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:760px;width:100%"><thead><tr><th>مرجع</th><th>ویرایش/وضعیت</th><th>حوزه کاربرد</th><th>طبقه</th></tr></thead><tbody>'+
 codes.map(c=>'<tr><td><a href="'+c.source+'" target="_blank" rel="noopener">'+c.name+'</a></td><td>'+c.edition+'</td><td>'+c.scope+'</td><td>'+status(c)+'</td></tr>').join("")+
 '</tbody></table></div><h4>اتصال مرجع به بخش‌های نرم‌افزار</h4><ul>'+moduleMap.map(x=>'<li><b>'+x[0]+'</b>: '+x[1]+'</li>').join("")+'</ul>'+
 '<div class="notice">این رجیستر، فهرست مبانی و کنترل نسخه‌هاست؛ به‌تنهایی اثبات‌کننده انطباق محاسبات نیست. گزارش طراحی بدون ثبت بند دقیق و وضعیت کنترل، نباید تأییدشده نمایش داده شود.</div>';
}
function selfTest(){
 const ids=new Set(codes.map(c=>c.id));
 const tests=[
  {name:"Iranian core references include loads, steel, geotechnics and reinforced concrete",ok:["m6","m10","m7","m9"].every(x=>ids.has(x))},
  {name:"M9 chapter 18 concrete anchorage is registered without inventing clause formulas",ok:codes.find(c=>c.id==="m9")?.modules.includes("concrete-anchors")&&codes.find(c=>c.id==="m9")?.scope.includes("فصل هجدهم")},
  {name:"industrial building requirements are represented",ok:ids.has("m11")},
  {name:"material conformity basis is represented",ok:ids.has("m5")},
  {name:"2800 transition is explicit through end of Ordibehesht 1406",ok:transition.notice.includes("اردیبهشت ۱۴۰۶")&&transition.projectRule.includes("صریحاً")},
  {name:"supplementary foreign standards are not marked primary",ok:codes.filter(c=>["aisi-s100","aisc360"].includes(c.id)).every(c=>c.status==="supplementary")},
  {name:"no default selection silently mixes 2800 editions",ok:transition.projectRule.includes("مخلوط")},
  {name:"material certificates remain required evidence",ok:materialNotes.some(x=>x.includes("گواهی کارخانه"))}
 ];
 return {passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok).length,total:tests.length,tests,designApproved:false};
}
function init(){
 if(root.document.getElementById("designCodeRegistryPanel"))return;
 const main=root.document.querySelector("main");if(!main)return;
 const sec=root.document.createElement("section");sec.className="panel";sec.id="designCodeRegistryPanel";
 sec.innerHTML='<div class="panel-title"><h3>مبنای آیین‌نامه‌ای و کنترل نسخه‌ها</h3><span class="status">مرجع اصلی: مقررات ملی ایران</span></div><div id="designCodeRegistryContent"></div>';
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",sec);else main.appendChild(sec);
 render();
}
root.SteelDesignCodes={getData,render,selfTest,codes:codes.map(c=>({...c}))};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-girder-design-basis.js ===== */
/* SAHROUD STEEL — runway-girder design-basis and evidence gate.
 * This module selects and records a code basis; it does not calculate resistance.
 */
(function(root){
"use strict";
const api=()=>root.SteelDesignCodes?.getData?.();
function audit(p){
 p=p||{};const issues=[],registry=api(),codes=registry?.codes||[];
 const primary=codes.find(c=>c.id===p.primaryCodeId);
 if(!primary)issues.push("مرجع اصلی انتخاب‌شده در رجیستر آیین‌نامه‌ها وجود ندارد.");
 else if(primary.status!=="primary")issues.push("مرجع اصلی باید از گروه مقررات/استاندارد اصلی پروژه انتخاب شود.");
 if(primary&&String(p.primaryEdition||"").trim()!==String(primary.edition||"").trim())issues.push("ویرایش مرجع اصلی باید دقیقاً با رجیستر آیین‌نامه‌ها منطبق شود.");
 if(!String(p.primaryClause||"").trim())issues.push("بند/جدول/شکل دقیق مرجع اصلی ثبت نشده است.");
 if(!String(p.primaryPage||"").trim())issues.push("شماره صفحه یا شناسه محل متن کنترل‌شده ثبت نشده است.");
 if(p.officialTextVerified!==true)issues.push("تأیید مشاهده متن رسمی و اصلاحیه‌های معتبر الزامی است.");
 if(!["LRFD","ASD","not-selected"].includes(p.designMethod)||p.designMethod==="not-selected")issues.push("روش طراحی LRFD یا ASD باید صریحاً انتخاب شود.");
 if(!["weldedI","rolledI","box","channel","other"].includes(p.sectionForm))issues.push("نوع ساخت/شکل مقطع تیر حمال باید تعیین شود.");
 if(!String(p.sectionSource||"").trim())issues.push("مرجع نقشه/کاتالوگ مقطع و خواص آن الزامی است.");
 if(!String(p.geometrySource||"").trim())issues.push("مرجع ابعاد واقعی و تلرانس‌های هندسی مقطع الزامی است.");
 if(!String(p.materialStandard||"").trim()||!String(p.materialGrade||"").trim())issues.push("استاندارد محصول و گرید فولاد باید جداگانه ثبت شوند.");
 if(!String(p.materialCertificate||"").trim())issues.push("مرجع گواهی کارخانه/مدرک مصالح الزامی است.");
 if(!String(p.loadCombinationSource||"").trim())issues.push("مرجع ترکیب بار و حالت بار حاکم ثبت نشده است.");
 if(!String(p.restraintDrawing||"").trim())issues.push("نقشه/مدرک مهاربندی بال فشاری و نقاط مهار الزامی است.");
 if(!String(p.supportDetailSource||"").trim())issues.push("جزئیات تکیه‌گاه، براکت و انتقال بار باید مستند شود.");
 let supplementary=null;
 if(String(p.supplementaryCodeId||"").trim()){
  supplementary=codes.find(c=>c.id===p.supplementaryCodeId);
  if(!supplementary)issues.push("مرجع تکمیلی انتخاب‌شده در رجیستر یافت نشد.");
  else if(supplementary.status!=="supplementary")issues.push("مرجع دوم باید در رجیستر به‌عنوان تکمیلی مشخص شده باشد.");
  if(!String(p.supplementaryClause||"").trim())issues.push("بند مرجع تکمیلی برای تطبیق مستقل ثبت نشده است.");
  if(!String(p.supplementaryPurpose||"").trim())issues.push("هدف و حدود استفاده از مرجع تکمیلی روشن نشده است.");
 }
 const ready=issues.length===0;
 return {success:ready,sourceBasisComplete:ready,analysisEnabled:false,designApproved:false,primaryCode:primary?{id:primary.id,name:primary.name,edition:primary.edition,scope:primary.scope}:null,supplementaryCode:supplementary?{id:supplementary.id,name:supplementary.name,edition:supplementary.edition}:null,designMethod:p.designMethod||null,sectionForm:p.sectionForm||null,issues,limitations:[
 "این ممیزی فقط کامل‌بودن مبنای طراحی و مدارک ورودی را بررسی می‌کند؛ هیچ ظرفیت، مقاومت یا نسبت بهره‌برداری محاسبه نمی‌شود.",
 "تطبیق نام ویرایش با رجیستر به معنی کنترل حقوقی آخرین اصلاحیه، تاریخ لازم‌الاجرا یا صحت بند نیست؛ متن رسمی باید توسط مهندس مسئول بررسی شود.",
 "مرجع تکمیلی خارجی جایگزین مقررات ملی ایران نیست و فقط در محدوده و هدف ثبت‌شده قابل استفاده است.",
 "تأیید این ممیزی به معنی تأیید طراحی، ساخت یا ایمنی تیر حمال جرثقیل نیست."
 ]};
}
function readUI(){
 const ids=["primaryCodeId","primaryEdition","primaryClause","primaryPage","officialTextVerified","designMethod","sectionForm","sectionSource","geometrySource","materialStandard","materialGrade","materialCertificate","loadCombinationSource","restraintDrawing","supportDetailSource","supplementaryCodeId","supplementaryClause","supplementaryPurpose"],p={};
 ids.forEach(k=>{const e=root.document?.getElementById?.("craneBasis_"+k);if(e)p[k]=k==="officialTextVerified"?e.checked:e.value;});
 return p;
}
function setData(p){
 p=p||{};Object.keys(p).forEach(k=>{const e=root.document?.getElementById?.("craneBasis_"+k);if(e){if(k==="officialTextVerified")e.checked=p[k]===true;else e.value=p[k]??"";}});
}
function renderResult(r){
 const host=root.document?.getElementById?.("craneGirderBasisResult");if(host)host.textContent=JSON.stringify(r,null,2);return r;
}
function run(){return renderResult(audit(readUI()));}
function mount(){
 const doc=root.document;if(!doc||doc.getElementById("craneGirderBasisPanel"))return;
 const main=doc.querySelector("main");if(!main)return;
 const codes=api()?.codes||[],primary=codes.filter(c=>c.status==="primary"),supp=codes.filter(c=>c.status==="supplementary");
 const opts=a=>'<option value="">— انتخاب نشده —</option>'+a.map(c=>'<option value="'+c.id+'">'+c.name+' | '+c.edition+'</option>').join("");
 const p=doc.createElement("section");p.className="panel";p.id="craneGirderBasisPanel";
 p.innerHTML='<div class="panel-title"><h3>مبنای آیین‌نامه‌ای تیر حمال جرثقیل</h3><span class="status">ثبت شواهد، بدون محاسبه مقاومت</span></div>'+
 '<div class="notice">برای جلوگیری از استفاده خاموش از ویرایش یا بند اشتباه، مرجع اصلی، روش طراحی، شکل مقطع، مدارک مصالح، ترکیب بار و جزئیات مهار/تکیه‌گاه را ثبت کنید. این بخش هیچ ظرفیت طراحی تولید نمی‌کند.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label>مرجع اصلی</label><select id="craneBasis_primaryCodeId">'+opts(primary)+'</select></div>'+
 '<div class="field"><label>ویرایش دقیق مطابق رجیستر</label><input id="craneBasis_primaryEdition"></div>'+
 '<div class="field"><label>بند / جدول / شکل دقیق</label><input id="craneBasis_primaryClause"></div>'+
 '<div class="field"><label>صفحه یا شناسه محل متن</label><input id="craneBasis_primaryPage"></div>'+
 '<div class="field"><label>روش طراحی</label><select id="craneBasis_designMethod"><option value="not-selected">انتخاب نشده</option><option value="LRFD">LRFD</option><option value="ASD">ASD</option></select></div>'+
 '<div class="field"><label>شکل/نوع مقطع</label><select id="craneBasis_sectionForm"><option value="">انتخاب نشده</option><option value="weldedI">I ساخته‌شده جوشی</option><option value="rolledI">I نوردشده</option><option value="box">جعبه‌ای</option><option value="channel">ناودانی</option><option value="other">سایر</option></select></div>'+
 '<div class="field"><label>مرجع نقشه/کاتالوگ مقطع</label><input id="craneBasis_sectionSource"></div>'+
 '<div class="field"><label>مرجع هندسه و تلرانس</label><input id="craneBasis_geometrySource"></div>'+
 '<div class="field"><label>استاندارد محصول فولاد</label><input id="craneBasis_materialStandard" placeholder="استاندارد محصول، نه فقط نام تجاری"></div>'+
 '<div class="field"><label>گرید فولاد</label><input id="craneBasis_materialGrade" placeholder="مثلاً ST37 / S235 با مدرک انطباق"></div>'+
 '<div class="field"><label>گواهی کارخانه/مصالح</label><input id="craneBasis_materialCertificate"></div>'+
 '<div class="field"><label>مرجع ترکیبات بار و حالت بار</label><input id="craneBasis_loadCombinationSource"></div>'+
 '<div class="field"><label>نقشه مهاربندی بال فشاری</label><input id="craneBasis_restraintDrawing"></div>'+
 '<div class="field"><label>جزئیات تکیه‌گاه و براکت</label><input id="craneBasis_supportDetailSource"></div>'+
 '<div class="field"><label>مرجع تکمیلی اختیاری</label><select id="craneBasis_supplementaryCodeId">'+opts(supp)+'</select></div>'+
 '<div class="field"><label>بند مرجع تکمیلی</label><input id="craneBasis_supplementaryClause"></div>'+
 '<div class="field"><label>هدف و حدود تطبیق تکمیلی</label><input id="craneBasis_supplementaryPurpose"></div>'+
 '<div class="field"><label><input type="checkbox" id="craneBasis_officialTextVerified"> متن رسمی و اصلاحیه‌های لازم‌الاجرا را شخصاً کنترل کرده‌ام</label></div>'+
 '</div><div class="button-grid"><button id="craneBasisRun" class="btn primary" type="button">ممیزی مبنای طراحی</button></div><pre id="craneGirderBasisResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const anchor=doc.getElementById("craneGirderLocalScreenPanel");if(anchor)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 doc.getElementById("craneBasisRun").addEventListener("click",run);
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const valid={primaryCodeId:"m10",primaryEdition:"ویرایش پنجم، ۱۴۰۱",primaryClause:"بند آزمایشی ثبت‌شده توسط بازبین",primaryPage:"صفحه کنترل‌شده",officialTextVerified:true,designMethod:"LRFD",sectionForm:"weldedI",sectionSource:"DWG-1",geometrySource:"QA-2",materialStandard:"product standard",materialGrade:"ST37",materialCertificate:"MTC-1",loadCombinationSource:"LC-1",restraintDrawing:"BR-1",supportDetailSource:"SUP-1"};
 t("accepts complete primary evidence without claiming design approval",()=>{const r=audit(valid);return r.success&&r.sourceBasisComplete&&!r.designApproved&&!r.analysisEnabled;});
 t("rejects missing official-text verification",()=>!audit({...valid,officialTextVerified:false}).success);
 t("rejects unregistered code",()=>!audit({...valid,primaryCodeId:"made-up"}).success);
 t("rejects edition mismatch",()=>!audit({...valid,primaryEdition:"نسخه نامعلوم"}).success);
 t("rejects missing clause and page",()=>!audit({...valid,primaryClause:"",primaryPage:""}).success);
 t("rejects unselected design method",()=>!audit({...valid,designMethod:"not-selected"}).success);
 t("rejects missing material certificate",()=>!audit({...valid,materialCertificate:""}).success);
 t("rejects missing restraint evidence",()=>!audit({...valid,restraintDrawing:""}).success);
 t("rejects foreign code as primary when supplementary",()=>!audit({...valid,primaryCodeId:"aisc360"}).success);
 t("requires purpose and clause for supplementary code",()=>!audit({...valid,supplementaryCodeId:"aisc360"}).success);
 t("accepts explicitly scoped supplementary reference",()=>audit({...valid,supplementaryCodeId:"aisc360",supplementaryClause:"F section",supplementaryPurpose:"independent comparison only"}).success);
 t("does not infer resistance from complete evidence",()=>{const r=audit(valid);return !("resistance" in r)&&!r.designApproved;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,note:"Evidence-gate software tests only; no code or design approval."};
}
root.SteelCraneGirderDesignBasis={audit,readUI,setData,run,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-girder-fatigue-readiness.js ===== */
/* SAHROUD STEEL — runway-girder fatigue evidence/readiness audit.
 * Counts documented service cycles; it does not calculate fatigue resistance or damage.
 */
(function(root){
"use strict";
function audit(p){
 p=p||{};const issues=[],bins=Array.isArray(p.spectrumBins)?p.spectrumBins:[];
 const positive=["cyclesPerDay","operatingDaysPerYear","serviceYears"];
 positive.forEach(k=>{if(!(Number.isFinite(Number(p[k]))&&Number(p[k])>0))issues.push(k+" باید عدد مثبت و مستند داشته باشد.");});
 ["craneClass","craneClassSource","fatigueCode","fatigueClause","detailCategory","detailCategorySource","stressRangeMethod","stressRangeSource","loadSpectrumSource","weldCondition","inspectionBasis"].forEach(k=>{if(!String(p[k]||"").trim())issues.push(k+" الزامی است.");});
 if(!["as-welded","stress-relieved","base-metal","unknown"].includes(p.weldCondition))issues.push("وضعیت جوش/جزئیات خستگی نامعتبر است.");
 if(p.weldCondition==="unknown")issues.push("وضعیت نامشخص جوش برای ممیزی خستگی پذیرفته نیست.");
 if(!bins.length)issues.push("طیف دامنه تنش باید حداقل یک بازه مستند داشته باشد.");
 let totalCycles=0;
 bins.forEach((b,i)=>{
  if(!(Number.isFinite(Number(b.stressRange_MPa))&&Number(b.stressRange_MPa)>0))issues.push("بازه "+(i+1)+": دامنه تنش باید مثبت باشد.");
  if(!(Number.isFinite(Number(b.cycles))&&Number(b.cycles)>0))issues.push("بازه "+(i+1)+": تعداد چرخه باید مثبت باشد.");
  if(!String(b.source||"").trim())issues.push("بازه "+(i+1)+": مرجع داده طیف الزامی است.");
  if(Number.isFinite(Number(b.cycles))&&Number(b.cycles)>0)totalCycles+=Number(b.cycles);
 });
 const designCycles=Number(p.cyclesPerDay)*Number(p.operatingDaysPerYear)*Number(p.serviceYears);
 if(Number.isFinite(designCycles)&&designCycles>0&&totalCycles>designCycles*1.001)issues.push("مجموع چرخه‌های طیف از چرخه‌های عمر بهره‌برداری بیشتر است؛ واحد/مبنای طیف را کنترل کنید.");
 if(p.fatigueCode&&p.fatigueCode!=="m10"&&p.fatigueCode!=="aisc360")issues.push("مرجع خستگی باید از مبحث دهم یا مرجع تطبیقی ثبت‌شده انتخاب شود.");
 const ready=issues.length===0;
 return {success:ready,readiness:ready?"evidence-complete":"incomplete",analysisEnabled:false,fatigueAssessment:null,fatigueDamage:null,designCycles:Number.isFinite(designCycles)?designCycles:null,spectrumCycles:totalCycles,spectrumBinCount:bins.length,issues,limitations:["این ممیزی فقط مدارک و شمار چرخه‌ها را کنترل می‌کند؛ منحنی S-N، مقاومت خستگی، دامنه تنش مجاز و آسیب تجمعی محاسبه نمی‌شود.","طبقه‌بندی جرثقیل/جزئیات جوش و پیچ باید از نسخه دقیق آیین‌نامه و مدارک ساخت استخراج و توسط مهندس مسئول تأیید شود.","اثر ضربه، طیف واقعی بار، تنش‌های موضعی، تمرکز تنش، کیفیت جوش، بازرسی و رشد ترک هنوز تحلیل نشده‌اند."]};
}
function readUI(){const e=root.document?.getElementById?.("craneFatigueJson");if(!e||!String(e.value||"").trim())return {};try{return JSON.parse(e.value);}catch(x){return {parseError:String(x.message||x)};}}
function run(){const p=readUI(),r=p.parseError?{success:false,issues:[p.parseError]}:audit(p),h=root.document?.getElementById?.("craneFatigueResult");if(h)h.textContent=JSON.stringify(r,null,2);return r;}
function mount(){const d=root.document;if(!d||d.getElementById("craneFatiguePanel"))return;const main=d.querySelector("main");if(!main)return;const p=d.createElement("section");p.className="panel";p.id="craneFatiguePanel";p.innerHTML='<div class="panel-title"><h3>ممیزی مدارک خستگی تیر حمال</h3><span class="status">چرخه و طیف بار</span></div><div class="notice">ورودی‌ها را با مستندات سازنده، بهره‌برداری، نقشه ساخت و مرجع آیین‌نامه‌ای تکمیل کنید. این ابزار فقط کامل‌بودن شواهد و جمع چرخه‌ها را بررسی می‌کند و مقاومت خستگی یا عمر ایمن اعلام نمی‌کند.</div><div class="field"><label for="craneFatigueJson">اطلاعات خستگی و طیف دامنه تنش (JSON)</label><textarea id="craneFatigueJson" rows="10" placeholder="{ &quot;craneClass&quot;:&quot;...&quot;, &quot;craneClassSource&quot;:&quot;...&quot;, &quot;cyclesPerDay&quot;:100, &quot;operatingDaysPerYear&quot;:250, &quot;serviceYears&quot;:25, &quot;fatigueCode&quot;:&quot;m10&quot;, &quot;fatigueClause&quot;:&quot;...&quot;, &quot;detailCategory&quot;:&quot;...&quot;, &quot;detailCategorySource&quot;:&quot;...&quot;, &quot;stressRangeMethod&quot;:&quot;...&quot;, &quot;stressRangeSource&quot;:&quot;...&quot;, &quot;loadSpectrumSource&quot;:&quot;...&quot;, &quot;weldCondition&quot;:&quot;as-welded&quot;, &quot;inspectionBasis&quot;:&quot;...&quot;, &quot;spectrumBins&quot;:[{&quot;stressRange_MPa&quot;:40,&quot;cycles&quot;:1000,&quot;source&quot;:&quot;...&quot;}] }"></textarea></div><button class="btn primary" id="craneFatigueRun" type="button">ممیزی چرخه و طیف</button><pre id="craneFatigueResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';const a=d.getElementById("craneGirderBasisPanel");if(a)a.insertAdjacentElement("afterend",p);else main.appendChild(p);d.getElementById("craneFatigueRun").addEventListener("click",run);}
function selfTest(){const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e)});}};const p={craneClass:"A5",craneClassSource:"CAT-1",cyclesPerDay:100,operatingDaysPerYear:250,serviceYears:20,fatigueCode:"m10",fatigueClause:"verified clause",detailCategory:"detail X",detailCategorySource:"DWG-1",stressRangeMethod:"linear stress range",stressRangeSource:"FEM-1",loadSpectrumSource:"LOG-1",weldCondition:"as-welded",inspectionBasis:"ITP-1",spectrumBins:[{stressRange_MPa:40,cycles:1000,source:"LOG-1"}]};t("accepts complete documented fatigue spectrum",()=>audit(p).success&&audit(p).designCycles===500000);t("rejects missing crane class source",()=>!audit({...p,craneClassSource:""}).success);t("rejects missing detail category source",()=>!audit({...p,detailCategorySource:""}).success);t("rejects unknown weld condition",()=>!audit({...p,weldCondition:"unknown"}).success);t("rejects missing spectrum bins",()=>!audit({...p,spectrumBins:[]}).success);t("rejects nonpositive stress range",()=>!audit({...p,spectrumBins:[{stressRange_MPa:0,cycles:100,source:"S"}]}).success);t("rejects undocumented spectrum bin",()=>!audit({...p,spectrumBins:[{stressRange_MPa:20,cycles:100,source:""}]}).success);t("rejects spectrum cycles above design service cycles",()=>!audit({...p,spectrumBins:[{stressRange_MPa:20,cycles:6000000,source:"S"}]}).success);t("rejects unsupported fatigue reference",()=>!audit({...p,fatigueCode:"made-up"}).success);t("never calculates fatigue damage or enables analysis",()=>{const r=audit(p);return r.analysisEnabled===false&&r.fatigueAssessment===null&&r.fatigueDamage===null;});return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false};}
root.SteelCraneFatigueReadiness={audit,readUI,run,selfTest};if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-girder-connection-readiness.js ===== */
/* SAHROUD STEEL — runway-girder connection evidence/readiness audit.
 * Captures connection geometry and fabrication records; does not calculate capacity.
 */
(function(root){
"use strict";
function audit(data){
 const rows=[],issues=[],items=Array.isArray(data)?data:(Array.isArray(data?.connections)?data.connections:[]);
 if(!items.length)issues.push("حداقل یک اتصال تیر حمال باید تعریف شود.");
 items.forEach((c,i)=>{
  const id=String(c.id||("connection-"+(i+1))),before=issues.length;
  ["connectionType","detailSource","forceSource","connectedPartGrade","connectedPartThickness_mm","plateThickness_mm","loadPathDescription"].forEach(k=>{if(c[k]===undefined||c[k]===null||String(c[k]).trim()==="")issues.push(id+": "+k+" الزامی است.");});
  if(!["welded","bolted","mixed"].includes(c.connectionType))issues.push(id+": نوع اتصال نامعتبر است.");
  ["connectedPartThickness_mm","plateThickness_mm"].forEach(k=>{if(!(Number.isFinite(Number(c[k]))&&Number(c[k])>0))issues.push(id+": "+k+" باید مثبت باشد.");});
  if(["welded","mixed"].includes(c.connectionType)){
   ["weldType","weldSize_mm","electrodeGrade","weldingProcedure","inspectionRecord"].forEach(k=>{if(c[k]===undefined||c[k]===null||String(c[k]).trim()==="")issues.push(id+": "+k+" برای اتصال جوشی الزامی است.");});
   if(!(Number(c.weldSize_mm)>0))issues.push(id+": اندازه جوش باید مثبت باشد.");
  }
  if(["bolted","mixed"].includes(c.connectionType)){
   ["boltDiameter_mm","boltGrade","holeType","edgeDistance_mm","pitch_mm","boltCount","boltArrangementSource"].forEach(k=>{if(c[k]===undefined||c[k]===null||String(c[k]).trim()==="")issues.push(id+": "+k+" برای اتصال پیچی الزامی است.");});
   ["boltDiameter_mm","edgeDistance_mm","pitch_mm","boltCount"].forEach(k=>{if(!(Number.isFinite(Number(c[k]))&&Number(c[k])>0))issues.push(id+": "+k+" باید مثبت باشد.");});
   if(!["standard","oversized","short-slot","long-slot"].includes(c.holeType))issues.push(id+": نوع سوراخ پیچ نامعتبر است.");
   if(c.slipCritical===true&&!String(c.fayingSurfaceClass||"").trim())issues.push(id+": کلاس سطح تماس اتصال لغزش‌بحرانی باید مستند شود.");
  }
  rows.push({id,connectionType:c.connectionType||null,evidenceComplete:issues.length===before,detailSource:c.detailSource||null,forceSource:c.forceSource||null,capacity:null,utilization:null});
 });
 const ready=issues.length===0&&rows.length===items.length;
 return {success:ready,readiness:ready?"evidence-complete":"incomplete",analysisEnabled:false,designApproved:false,connectionCount:items.length,checkedCount:rows.length,issues,results:rows,limitations:["این ممیزی فقط هندسه، مسیر بار و مدارک ساخت/بازرسی اتصال را کنترل می‌کند؛ مقاومت جوش، پیچ، لهیدگی، پارگی بلوکی، لغزش، خستگی یا ظرفیت صفحه محاسبه نمی‌شود.","بارهای طراحی باید از تحلیل قاب و حالات بار هم‌زمان معتبر استخراج و به هر اتصال تخصیص داده شوند.","طراحی اتصال باید با نسخه رسمی آیین‌نامه، خواص مصالح/الکترود/پیچ، جزئیات اجرایی و الزامات بازرسی توسط مهندس مسئول انجام شود."]};
}
function auditConnectionDemand(data){
 const rows=Array.isArray(data)?data:(Array.isArray(data?.demands)?data.demands:[]),issues=[],out=[],seen=new Set();
 if(!rows.length)issues.push("حداقل یک رکورد تقاضای اتصال لازم است.");
 rows.forEach((d,i)=>{
  const id=String(d.connectionId||("demand-"+(i+1))),key=id+"|"+String(d.caseId||"");
  const before=issues.length;
  if(!String(d.connectionId||"").trim())issues.push(id+": شناسه اتصال الزامی است.");
  if(!String(d.caseId||"").trim())issues.push(id+": شناسه حالت بار الزامی است.");
  if(seen.has(key))issues.push(id+": رکورد تقاضای تکراری برای همین حالت بار وجود دارد.");seen.add(key);
  if(!String(d.source||"").trim()||!String(d.document||"").trim())issues.push(id+": منبع و سند تقاضای اتصال الزامی است.");
  const F=d.force_N,M=d.moment_Nm,r=d.eccentricity_m;
  if(!Array.isArray(F)||F.length!==3||F.some(x=>!Number.isFinite(Number(x))))issues.push(id+": بردار نیرو باید سه مؤلفه محدود بر حسب N داشته باشد.");
  if(!Array.isArray(M)||M.length!==3||M.some(x=>!Number.isFinite(Number(x))))issues.push(id+": بردار لنگر باید سه مؤلفه محدود بر حسب N.m داشته باشد.");
  if(!Array.isArray(r)||r.length!==3||r.some(x=>!Number.isFinite(Number(x))))issues.push(id+": خروج از مرکزیت باید سه مؤلفه محدود بر حسب متر داشته باشد.");
  let transferred=null;
  if(Array.isArray(F)&&F.length===3&&F.every(x=>Number.isFinite(Number(x)))&&Array.isArray(M)&&M.length===3&&M.every(x=>Number.isFinite(Number(x)))&&Array.isArray(r)&&r.length===3&&r.every(x=>Number.isFinite(Number(x)))){
   const f=F.map(Number),m=M.map(Number),e=r.map(Number);
   const cross=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]];
   transferred=m.map((x,j)=>x+cross[j]);
  }
  out.push({connectionId:id,caseId:String(d.caseId||""),force_N:Array.isArray(F)?F:null,appliedMomentAtReference_Nm:transferred,complete:issues.length===before});
 });
 return {success:issues.length===0&&out.every(x=>x.complete),analysisEnabled:false,designApproved:false,demands:out,issues,limitations:["این پل فقط نیروی اتصال و لنگر انتقال‌یافته به نقطه مرجع را با رابطه M_ref=M_connection+r×F ثبت می‌کند.","هیچ ظرفیت جوش، پیچ، صفحه، براکت، ستون یا مقاومت موضعی محاسبه نمی‌شود.","قرارداد محور، علامت، واحد و نقطه مرجع باید از مدل سه‌بعدی و نقشه اتصال تأیید شود."]};
}
function readUI(){const e=root.document?.getElementById?.("craneConnectionJson");if(!e||!String(e.value||"").trim())return [];try{return JSON.parse(e.value);}catch(x){return {parseError:String(x.message||x)};}}
function run(){const p=readUI(),r=p.parseError?{success:false,issues:[p.parseError]}:audit(p),h=root.document?.getElementById?.("craneConnectionResult");if(h)h.textContent=JSON.stringify(r,null,2);return r;}
function mount(){const d=root.document;if(!d||d.getElementById("craneConnectionPanel"))return;const main=d.querySelector("main");if(!main)return;const p=d.createElement("section");p.className="panel";p.id="craneConnectionPanel";p.innerHTML='<div class="panel-title"><h3>ممیزی مدارک اتصالات تیر حمال و براکت</h3><span class="status">جوش و پیچ</span></div><div class="notice">برای هر اتصال، مسیر بار، نقشه، نیروهای طراحی و جزئیات جوش/پیچ را وارد کنید. این بخش فقط شواهد را کنترل می‌کند و ظرفیت اتصال را محاسبه نمی‌کند.</div><div class="field"><label for="craneConnectionJson">فهرست اتصالات (JSON array)</label><textarea id="craneConnectionJson" rows="10" placeholder="[{ &quot;id&quot;:&quot;BR-1&quot;, &quot;connectionType&quot;:&quot;welded&quot;, &quot;detailSource&quot;:&quot;DWG-1&quot;, &quot;forceSource&quot;:&quot;LC-1&quot;, &quot;connectedPartGrade&quot;:&quot;ST37&quot;, &quot;connectedPartThickness_mm&quot;:12, &quot;plateThickness_mm&quot;:16, &quot;loadPathDescription&quot;:&quot;...&quot;, &quot;weldType&quot;:&quot;fillet&quot;, &quot;weldSize_mm&quot;:8, &quot;electrodeGrade&quot;:&quot;...&quot;, &quot;weldingProcedure&quot;:&quot;WPS-1&quot;, &quot;inspectionRecord&quot;:&quot;ITP-1&quot; }]"></textarea></div><button class="btn primary" id="craneConnectionRun" type="button">ممیزی مدارک اتصالات</button><pre id="craneConnectionResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';const a=d.getElementById("craneFatiguePanel");if(a)a.insertAdjacentElement("afterend",p);else main.appendChild(p);d.getElementById("craneConnectionRun").addEventListener("click",run);}
function selfTest(){const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e)});}};const welded={id:"W1",connectionType:"welded",detailSource:"DWG-1",forceSource:"LC-1",connectedPartGrade:"ST37",connectedPartThickness_mm:12,plateThickness_mm:16,loadPathDescription:"bracket to girder",weldType:"fillet",weldSize_mm:8,electrodeGrade:"E70",weldingProcedure:"WPS-1",inspectionRecord:"ITP-1"};const bolted={id:"B1",connectionType:"bolted",detailSource:"DWG-2",forceSource:"LC-2",connectedPartGrade:"ST37",connectedPartThickness_mm:12,plateThickness_mm:16,loadPathDescription:"end plate",boltDiameter_mm:20,boltGrade:"8.8",holeType:"standard",edgeDistance_mm:40,pitch_mm:60,boltCount:4,boltArrangementSource:"DWG-2",slipCritical:true,fayingSurfaceClass:"Class A"};t("accepts complete welded evidence",()=>audit([welded]).success);t("accepts complete bolted evidence",()=>audit([bolted]).success);t("accepts mixed connection with both detail sets",()=>audit([{...welded,...bolted,id:"M1",connectionType:"mixed"}]).success);t("rejects missing load path",()=>!audit([{...welded,loadPathDescription:""}]).success);t("rejects missing weld procedure",()=>!audit([{...welded,weldingProcedure:""}]).success);t("rejects nonpositive weld size",()=>!audit([{...welded,weldSize_mm:0}]).success);t("rejects missing bolt grade",()=>!audit([{...bolted,boltGrade:""}]).success);t("rejects invalid hole type",()=>!audit([{...bolted,holeType:"oval"}]).success);t("requires faying surface for slip-critical bolts",()=>!audit([{...bolted,fayingSurfaceClass:""}]).success);t("does not produce capacity or design approval",()=>{const r=audit([welded]);return r.analysisEnabled===false&&!r.designApproved&&r.results[0].capacity===null&&r.results[0].utilization===null;});t("connection demand preserves six-component force path and eccentricity moment",()=>{const r=auditConnectionDemand([{connectionId:"BR1",caseId:"LC1",force_N:[1000,0,0],moment_Nm:[10,0,0],eccentricity_m:[0,0.2,0],source:"frame model",document:"RPT-1"}]);return r.success&&r.demands[0].appliedMomentAtReference_Nm[2]===-200;});t("connection demand rejects missing source or eccentricity",()=>!auditConnectionDemand([{connectionId:"BR1",caseId:"LC1",force_N:[0,1,0],moment_Nm:[0,0,0],eccentricity_m:[0,0,0]}]).success);t("connection demand rejects duplicate case records",()=>!auditConnectionDemand([{connectionId:"BR1",caseId:"LC1",force_N:[0,1,0],moment_Nm:[0,0,0],eccentricity_m:[0,0,0],source:"s",document:"d"},{connectionId:"BR1",caseId:"LC1",force_N:[0,1,0],moment_Nm:[0,0,0],eccentricity_m:[0,0,0],source:"s",document:"d"}]).success);return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false};}
root.SteelCraneConnectionReadiness={audit,auditConnectionDemand,readUI,run,selfTest};if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-runway-bracket-demand-bridge.js ===== */
/* SAHROUD STEEL — numerical runway-girder reaction to bracket/column demand bridge.
 * Consumes solved runway FEM support reactions; requires explicit, surveyed global geometry.
 * Sign convention: supportReaction_N is the spring force acting ON the runway beam.
 * The equal/opposite beam force ON the bracket/column is -supportReaction_N * verticalUnitVector_global.
 * Coordinates m, forces N, moments N.m. No design approval.
 */
(function(root){"use strict";
const v3=v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(Number(x)));
const close=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=Math.max(1e-7,Math.max(Math.abs(Number(a)),Math.abs(Number(b)))*1e-9);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function audit(runwayResult,mappings,options){
 const issues=[],demands=[],mapRows=Array.isArray(mappings)?mappings:[],axis=options?.verticalUnitVector_global;
 if(runwayResult?.success!==true)issues.push("نتیجه تحلیل تیر حمال موفق و معتبر نیست.");
 if(!Array.isArray(runwayResult?.cases?.left)||!Array.isArray(runwayResult?.cases?.right)||!runwayResult.cases.left.length||runwayResult.cases.left.length!==runwayResult.cases.right.length)issues.push("حالات حل‌شده دو تیر حمال باید کامل و هم‌شمار باشند.");
 if(!v3(axis)||!close(Math.hypot(...(axis||[])),1))issues.push("بردار واحد قائم در دستگاه مختصات global باید صریحاً با طول واحد ثبت شود.");
 if(!mapRows.length)issues.push("نقشه تطبیق براکت‌ها با ایستگاه‌های تیر حمال ارائه نشده است.");
 const keys=new Set();
 mapRows.forEach((m,i)=>{
  const key=String(m?.side||"")+"|"+String(m?.station??"")+"|"+String(m?.connectionId||"");
  if(!["left","right"].includes(m?.side))issues.push("ردیف نقشه "+(i+1)+": سمت تیر باید left یا right باشد.");
  if(!Number.isInteger(Number(m?.station))||Number(m.station)<1)issues.push("ردیف نقشه "+(i+1)+": شماره ایستگاه باید عدد صحیح مثبت باشد.");
  if(!String(m?.connectionId||"").trim()||!String(m?.columnNodeId||"").trim())issues.push("ردیف نقشه "+(i+1)+": شناسه اتصال و گره ستون الزامی است.");
  if(keys.has(key))issues.push("ردیف نقشه "+(i+1)+": نگاشت براکت/ایستگاه تکراری است.");keys.add(key);
  if(!Number.isFinite(Number(m?.x_m))||Number(m.x_m)<0)issues.push("ردیف نقشه "+(i+1)+": مختصات طولی براکت نامعتبر است.");
  if(!v3(m?.connectionCoordinate_m)||!v3(m?.columnNodeCoordinate_m))issues.push("ردیف نقشه "+(i+1)+": مختصات سه‌بعدی نقطه اتصال و گره ستون باید از مدل/نقشه وارد شود.");
  if(m?.coordinateSystem!=="global")issues.push("ردیف نقشه "+(i+1)+": دستگاه مختصات باید global باشد.");
  if(!String(m?.source||"").trim()||!String(m?.document||"").trim())issues.push("ردیف نقشه "+(i+1)+": مرجع هندسه و سند/شماره نقشه الزامی است.");
 });
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,designApproved:false,demands:[],issues};
 const left=runwayResult.cases.left,right=runwayResult.cases.right;
 const leftKeys=left.map(x=>String(x.caseId??x.caseIndex)),rightKeys=right.map(x=>String(x.caseId??x.caseIndex));
 if(new Set(leftKeys).size!==leftKeys.length||new Set(rightKeys).size!==rightKeys.length||leftKeys.some((k,i)=>k!==rightKeys[i]))issues.push("شناسه و ترتیب حالات چپ/راست تیر حمال هم‌خوانی یک‌به‌یک ندارد.");
 const demandApi=root.SteelCraneBracketColumnDemandTransfer;
 if(!demandApi?.audit)issues.push("ممیزی شش‌مؤلفه‌ای تقاضای براکت به ستون بارگذاری نشده است.");
 const supportRows=[...left.map((c,i)=>({side:"left",caseRow:c,caseKey:leftKeys[i]})),...right.map((c,i)=>({side:"right",caseRow:c,caseKey:rightKeys[i]}))];
 supportRows.forEach(({side,caseRow,caseKey})=>{
  const supports=caseRow?.result?.supports;
  if(!Array.isArray(supports)||!supports.length){issues.push("حالت "+caseKey+" تیر "+side+" فاقد واکنش‌های تکیه‌گاهی حل‌شده است.");return;}
  const sideMaps=mapRows.filter(m=>m.side===side);
  if(sideMaps.length!==supports.length){issues.push("تعداد نگاشت براکت‌های "+side+" با تعداد تکیه‌گاه‌های FEM برابر نیست؛ نگاشت ناقص/اضافی مسدود شد.");return;}
  const used=new Set();
  supports.forEach(s=>{
   const m=sideMaps.find(x=>Number(x.station)===Number(s.station));
   if(!m){issues.push("حالت "+caseKey+" تیر "+side+": براکت متناظر با ایستگاه "+s.station+" یافت نشد.");return;}
   if(used.has(Number(m.station))){issues.push("حالت "+caseKey+" تیر "+side+": نگاشت ایستگاه تکراری است.");return;}used.add(Number(m.station));
   if(!close(m.x_m,s.x_m))issues.push("حالت "+caseKey+" تیر "+side+" ایستگاه "+s.station+": مختصات طولی FEM و براکت یکسان نیست.");
   if(!Number.isFinite(Number(s.verticalReaction_N)))issues.push("واکنش قائم ایستگاه "+s.station+" در حالت "+caseKey+" عددی نیست.");
  });
  if(used.size!==supports.length)issues.push("همه واکنش‌های FEM به یک براکت یکتا نگاشت نشده‌اند.");
 });
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,designApproved:false,demands:[],issues};
 const raw=[];
 supportRows.forEach(({side,caseRow,caseKey})=>caseRow.result.supports.forEach(s=>{
  const m=mapRows.find(x=>x.side===side&&Number(x.station)===Number(s.station));
  const R=Number(s.verticalReaction_N),F=axis.map(v=>-R*Number(v));
  raw.push({connectionId:String(m.connectionId),caseId:caseKey,columnNodeId:String(m.columnNodeId),coordinateSystem:"global",columnNodeCoordinate_m:m.columnNodeCoordinate_m.map(Number),connectionCoordinate_m:m.connectionCoordinate_m.map(Number),force_N:F,momentAtConnection_Nm:[0,0,0],source:"runway-girder FEM support reaction (equal-and-opposite beam action)",document:String(m.document)+"; "+String(m.source)});
 }));
 const checked=demandApi.audit(raw);
 if(!checked.success)return {success:false,ready:false,analysisEnabled:false,designApproved:false,demands:checked.demands||[],issues:checked.issues||["ممیزی تقاضای خروجی ناموفق است."]};
 return {success:true,ready:true,analysisEnabled:false,designApproved:false,transferType:"demand-only-global-coordinate",sourceTransferType:"runway-reaction-to-bracket-column-global-six-dof",coordinateSystem:"global",verticalUnitVector_global:axis.map(Number),caseCount:left.length,mappingCount:mapRows.length,demandCount:checked.demands.length,demands:checked.demands,issues:[],equilibriumMeaning:"نیروی وارد بر براکت/ستون برابر و مخالف واکنش فنر وارد بر تیر حمال است؛ لنگر گره ستون با r×F از مختصات واقعی اتصال محاسبه شده است.",limitations:["این پل فقط واکنش قائم حل‌گر تیر حمال را منتقل می‌کند؛ بارهای افقی، پیچش، خستگی و اثرات دینامیکی در آن نیست.","مختصات سه‌بعدی اتصال و گره ستون و بردار قائم باید از مدل واقعی و نقشه معتبر وارد شوند؛ این ماژول مختصات را حدس نمی‌زند.","این تبدیل به‌تنهایی ظرفیت براکت، جوش، پیچ، ورق، ستون یا اتصال را کنترل نمی‌کند.","پیش از اعمال به FEM سه‌بعدی باید تطبیق نسخه مدل، شناسه حالت بار و جلوگیری از دوباره‌شماری بار مستقل انجام شود."]};
}
function selfTest(){
 const t=[],ck=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const old=root.SteelCraneBracketColumnDemandTransfer;
 root.SteelCraneBracketColumnDemandTransfer={audit:old?.audit||function(rows){return {success:rows.every(r=>v3(r.force_N)&&v3(r.columnNodeCoordinate_m)&&v3(r.connectionCoordinate_m)),demands:rows.map(r=>({...r,momentAtColumnNode_Nm:[0,0,0]})),issues:[]};}};
 const result={success:true,cases:{left:[{caseId:"LC1",caseIndex:0,result:{supports:[{station:1,x_m:0,verticalReaction_N:1000},{station:2,x_m:5,verticalReaction_N:2000}]}}],right:[{caseId:"LC1",caseIndex:0,result:{supports:[{station:1,x_m:0,verticalReaction_N:1500},{station:2,x_m:5,verticalReaction_N:2500}]}}]}};
 const map=["left","right"].flatMap(side=>[1,2].map(station=>({side,station,connectionId:side+"-BR"+station,columnNodeId:side+"-COL"+station,x_m:station===1?0:5,coordinateSystem:"global",connectionCoordinate_m:[side==="left"?-1:1,5,station===1?0:5],columnNodeCoordinate_m:[side==="left"?0:2,5,station===1?0:5],source:"GA-CRANE-01",document:"detail "+side+" "+station})));
 try{
  ck("maps every left/right support reaction to one unique bracket",()=>audit(result,map,{verticalUnitVector_global:[0,1,0]}).success);
  ck("uses equal-and-opposite beam-on-bracket vertical force",()=>{const r=audit(result,map,{verticalUnitVector_global:[0,1,0]});return r.success&&r.demands.find(x=>x.connectionId==="left-BR1").force_N[1]===-1000;});
  ck("transfers eccentric vertical reaction into the correct column-node moment",()=>{const r=audit(result,map,{verticalUnitVector_global:[0,1,0]});const d=r.demands.find(x=>x.connectionId==="left-BR1");return r.success&&d.momentAtColumnNode_Nm[2]===1000;});
  ck("bridge output is accepted by the six-DOF FEM load-case adapter",()=>{const model={nodes:[{id:"left-COL1",x:0,y:5,z:0},{id:"left-COL2",x:0,y:5,z:5},{id:"right-COL1",x:2,y:5,z:0},{id:"right-COL2",x:2,y:5,z:5}],members:[]};const rows=map.map(m=>({...m,columnNodeId:m.side+"-COL"+m.station,columnNodeCoordinate_m:m.side==="left"?[0,5,m.x_m]:[2,5,m.x_m],connectionCoordinate_m:m.side==="left"?[-1,5,m.x_m]:[3,5,m.x_m]}));const tr=audit(result,rows,{verticalUnitVector_global:[0,1,0]});const built=root.SteelCraneBracketColumnFEMAdapter?.buildLoadCase?.(model,{id:"LC1",nodalLoads:[]},tr);return !!built?.success&&built.addedDemandCount===4&&built.loadCase.nodalLoads.every(x=>x.values.length===6);});
  ck("rejects incomplete bracket mapping",()=>!audit(result,map.slice(1),{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects incorrect longitudinal station coordinate",()=>!audit(result,map.map((x,i)=>i===0?{...x,x_m:0.1}:x),{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects duplicate bracket mapping",()=>!audit(result,[...map,map[0]],{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects non-unit vertical axis",()=>!audit(result,map,{verticalUnitVector_global:[0,2,0]}).success);
  ck("rejects mismatched left/right case identities",()=>!audit({...result,cases:{...result.cases,right:[{...result.cases.right[0],caseId:"OTHER"}]}},map,{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects missing global connection coordinates",()=>!audit(result,map.map((x,i)=>i===0?{...x,connectionCoordinate_m:null}:x),{verticalUnitVector_global:[0,1,0]}).success);
 }finally{root.SteelCraneBracketColumnDemandTransfer=old;}
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,designApproved:false};
}
root.SteelCraneRunwayBracketDemandBridge={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-bracket-column-demand-transfer.js ===== */
/* SAHROUD STEEL — crane bracket-to-column six-DOF demand transfer audit.
 * Global-coordinate demand bridge only; deliberately does not inject loads into FEM.
 * Units: coordinates m, force N, moment N.m. Positive axes follow the global model frame.
 */
(function(root){
"use strict";
const v3=(v)=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(Number(x)));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function audit(input){
 const rows=Array.isArray(input)?input:(Array.isArray(input?.demands)?input.demands:[]);
 const issues=[],out=[],seen=new Set();
 if(!rows.length)issues.push("حداقل یک تقاضای اتصال براکت به گره ستون لازم است.");
 rows.forEach((d,i)=>{
  const id=String(d.connectionId||("connection-"+(i+1))),caseId=String(d.caseId||"");
  const key=id+"|"+caseId,before=issues.length;
  if(!String(d.connectionId||"").trim())issues.push(id+": شناسه اتصال الزامی است.");
  if(!caseId.trim())issues.push(id+": شناسه حالت بار الزامی است.");
  if(seen.has(key))issues.push(id+": رکورد اتصال/حالت بار تکراری است.");seen.add(key);
  if(!String(d.columnNodeId||"").trim())issues.push(id+": شناسه گره ستون الزامی است.");
  if(d.coordinateSystem!=="global")issues.push(id+": دستگاه مختصات باید صریحاً global باشد.");
  if(!v3(d.columnNodeCoordinate_m))issues.push(id+": مختصات گره ستون باید سه مؤلفه محدود بر حسب متر باشد.");
  if(!v3(d.connectionCoordinate_m))issues.push(id+": مختصات نقطه اتصال باید سه مؤلفه محدود بر حسب متر باشد.");
  if(!v3(d.force_N))issues.push(id+": نیرو باید سه مؤلفه محدود بر حسب N داشته باشد.");
  if(!v3(d.momentAtConnection_Nm))issues.push(id+": لنگر نقطه اتصال باید سه مؤلفه محدود بر حسب N.m داشته باشد.");
  if(!String(d.source||"").trim()||!String(d.document||"").trim())issues.push(id+": منبع و سند بارگذاری الزامی است.");
  let mapped=null;
  if(v3(d.columnNodeCoordinate_m)&&v3(d.connectionCoordinate_m)&&v3(d.force_N)&&v3(d.momentAtConnection_Nm)){
   const node=d.columnNodeCoordinate_m.map(Number),point=d.connectionCoordinate_m.map(Number),F=d.force_N.map(Number),M=d.momentAtConnection_Nm.map(Number);
   const r=point.map((x,j)=>x-node[j]),rxF=cross(r,F);
   mapped={connectionId:id,caseId,columnNodeId:String(d.columnNodeId||""),coordinateSystem:"global",columnNodeCoordinate_m:node,connectionCoordinate_m:point,leverArm_m:r,force_N:F,momentAtConnection_Nm:M,momentAtColumnNode_Nm:M.map((x,j)=>x+rxF[j]),source:d.source||null,document:d.document||null};
  }
  out.push({...mapped,complete:issues.length===before});
 });
 const success=issues.length===0&&out.length===rows.length&&out.every(x=>x.complete);
 return {success,ready:success,analysisEnabled:false,designApproved:false,transferType:"demand-only-global-coordinate",count:out.length,demands:out,issues,limitations:[
  "این خروجی فقط معادل‌سازی استاتیکی تقاضا از نقطه اتصال براکت به مختصات گره ستون با M_node=M_connection+r×F است.",
  "هیچ بار به مدل FEM تزریق نشده و هیچ ظرفیت اتصال، ستون، ورق، جوش، پیچ، کمانش موضعی یا مقاومت موضعی محاسبه نشده است.",
  "شناسه گره، مختصات، دستگاه مختصات، قرارداد علامت و واحدها باید با مدل سه‌بعدی و نقشه اجرایی تطبیق داده شوند.",
  "برای اعمال به FEM باید یکپارچگی توپولوژی، بازوی صلب/offset، قیود اتصال و عدم دوباره‌شماری بارها جداگانه اعتبارسنجی شود."
 ]};
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const base={connectionId:"BR-1",caseId:"LC-1",columnNodeId:"COL-1",coordinateSystem:"global",columnNodeCoordinate_m:[0,0,0],connectionCoordinate_m:[0,0.2,0],force_N:[1000,0,0],momentAtConnection_Nm:[0,0,0],source:"3D analysis",document:"RPT-01"};
 t("eccentric bracket force transfers moment to column node",()=>{const r=audit([base]);return r.success&&r.demands[0].momentAtColumnNode_Nm[2]===-200;});
 t("zero eccentricity preserves connection moment",()=>{const r=audit([{...base,connectionCoordinate_m:[0,0,0],momentAtConnection_Nm:[2,3,4]}]);return r.success&&r.demands[0].momentAtColumnNode_Nm.join(",")==="2,3,4";});
 t("rejects missing column coordinate",()=>!audit([{...base,columnNodeCoordinate_m:null}]).success);
 t("rejects missing connection coordinate",()=>!audit([{...base,connectionCoordinate_m:null}]).success);
 t("rejects duplicate connection and load case",()=>!audit([base,base]).success);
 t("rejects wrong vector dimensions",()=>!audit([{...base,force_N:[1,2]}]).success);
 t("requires source and document provenance",()=>!audit([{...base,source:"",document:""}]).success);
 t("preserves all six global demand components",()=>{const r=audit([{...base,force_N:[1,2,3],momentAtConnection_Nm:[4,5,6],connectionCoordinate_m:[0,0,0]}]);const d=r.demands[0];return r.success&&d.force_N.join(",")==="1,2,3"&&d.momentAtColumnNode_Nm.join(",")==="4,5,6";});
 t("rejects non-global coordinate declaration",()=>!audit([{...base,coordinateSystem:"local"}]).success);
 t("never enables FEM analysis or design approval",()=>{const r=audit([base]);return r.analysisEnabled===false&&r.designApproved===false&&r.transferType==="demand-only-global-coordinate";});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelCraneBracketColumnDemandTransfer={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-bracket-column-fem-adapter.js ===== */
/* SAHROUD STEEL — validated bracket/column demand to solver load-case adapter.
 * Builds an explicit loadCase copy; caller decides when/if to solve it.
 * Global axes; N and N.m; no automatic solve or design approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const v3=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const close=(a,b,t=1e-7)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b));
function buildLoadCase(model,baseLoadCase,transferResult){
 const issues=[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 if(!Array.isArray(model?.nodes)||!Array.isArray(model?.members))issues.push("مدل سه‌بعدی معتبر نیست.");
 if(!baseLoadCase||typeof baseLoadCase!=="object")issues.push("حالت بار پایه معتبر نیست.");
 if(!Array.isArray(baseLoadCase?.nodalLoads))issues.push("nodalLoads حالت بار پایه باید آرایه باشد؛ بارهای موجود نباید حذف شوند.");
 if(!transferResult?.success||transferResult.transferType!=="demand-only-global-coordinate"||!Array.isArray(transferResult.demands))issues.push("خروجی انتقال تقاضای معتبر در دسترس نیست.");
 const expectedCase=String(baseLoadCase?.id||baseLoadCase?.caseId||"");
 if(!expectedCase)issues.push("حالت بار مقصد باید شناسه id یا caseId داشته باشد.");
 const priorRaw=baseLoadCase?.craneBracketColumnDemandIds??[];
 if(!Array.isArray(priorRaw))issues.push("فهرست شناسه‌های تقاضای تزریق‌شده در حالت بار باید آرایه باشد.");
 const prior=new Set(Array.isArray(priorRaw)?priorRaw.map(String):[]);
 if(prior.size!==(Array.isArray(priorRaw)?priorRaw.length:0))issues.push("شناسه‌های قبلی تقاضای جرثقیل در metadata تکراری‌اند.");
 const baseSeen=new Set();
 (Array.isArray(baseLoadCase?.nodalLoads)?baseLoadCase.nodalLoads:[]).forEach((load,i)=>{
  const nodeId=String(load?.nodeId??"");
  if(!nodeId||!nodes.has(nodeId))issues.push("بار گره‌ای پایه شماره "+(i+1)+" به گره معتبر مدل ارجاع نمی‌دهد.");
  if(baseSeen.has(nodeId))issues.push("بار گره‌ای پایه برای گره "+nodeId+" تکراری است؛ ابتدا آن‌ها را به‌صورت صریح تجمیع کنید.");
  baseSeen.add(nodeId);
  if(!Array.isArray(load?.values)||load.values.length!==6||load.values.some(v=>!finite(v)))issues.push("بار گره‌ای پایه شماره "+(i+1)+" باید دقیقاً شش مؤلفه عددی محدود داشته باشد.");
 });
 const rows=transferResult?.demands||[],aggregate=new Map(),used=[],batchSeen=new Set();
 rows.forEach((d,i)=>{
  const id=String(d?.connectionId||""),caseId=String(d?.caseId||""),nodeId=String(d?.columnNodeId||""),key=id+"|"+caseId;
  if(!id||!caseId||!nodeId)issues.push("رکورد "+(i+1)+": شناسه اتصال/حالت بار/گره ناقص است.");
  if(batchSeen.has(key))issues.push(id+": رکورد اتصال/حالت بار در همین بسته تکراری است.");
  batchSeen.add(key);
  if(caseId!==expectedCase)issues.push(id+": شناسه حالت بار با حالت بار مقصد تطبیق ندارد.");
  if(prior.has(key))issues.push(id+": این تقاضا قبلاً در همین حالت بار تزریق شده است.");
  const node=nodes.get(nodeId);
  if(!node)issues.push(id+": گره مقصد در مدل سه‌بعدی وجود ندارد: "+nodeId);
  if(!v3(d?.columnNodeCoordinate_m)||!v3(d?.force_N)||!v3(d?.momentAtColumnNode_Nm))issues.push(id+": مختصات و بردارهای شش‌مؤلفه‌ای نامعتبرند.");
  if(d?.coordinateSystem!=="global")issues.push(id+": دستگاه مختصات global نیست.");
  if(node&&v3(d.columnNodeCoordinate_m)&&![node.x,node.y,node.z].every(finite))issues.push(id+": مختصات گره مدل نامعتبر است.");
  if(node&&v3(d.columnNodeCoordinate_m)&&[node.x,node.y,node.z].every(finite)&&!d.columnNodeCoordinate_m.every((v,j)=>close(v,[node.x,node.y,node.z][j])))issues.push(id+": مختصات ثبت‌شده با مختصات واقعی گره مدل تطبیق ندارد.");
  if(!String(d?.source||"").trim()||!String(d?.document||"").trim())issues.push(id+": ردیابی منبع و سند ناقص است.");
  if(node&&v3(d?.force_N)&&v3(d?.momentAtColumnNode_Nm)){
   const old=aggregate.get(nodeId)||[0,0,0,0,0,0];
   d.force_N.forEach((v,j)=>old[j]+=v);d.momentAtColumnNode_Nm.forEach((v,j)=>old[j+3]+=v);
   aggregate.set(nodeId,old);used.push(key);
  }
 });
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,designApproved:false,issues,loadCase:null};
 const nodalLoads=baseLoadCase.nodalLoads.map(x=>({...x,values:x.values.slice()}));
 aggregate.forEach((values,nodeId)=>nodalLoads.push({nodeId,values,sources:rows.filter(d=>String(d.columnNodeId)===nodeId).map(d=>({kind:"crane-bracket-column-demand",connectionId:d.connectionId,caseId:d.caseId,source:d.source,document:d.document}))}));
 const out={...baseLoadCase,nodalLoads,craneBracketColumnDemandIds:[...prior,...used],craneBracketColumnDemandTransfer:{coordinateSystem:"global",units:{force:"N",moment:"N.m"},connectionCount:rows.length,aggregatedNodeCount:aggregate.size,analysisEnabled:false,designApproved:false}};
 return {success:true,ready:true,analysisEnabled:false,designApproved:false,loadCase:out,addedDemandCount:rows.length,aggregatedNodeCount:aggregate.size,issues:[],note:"حالت بار جدید ساخته شد؛ هنوز به حل‌گر ارسال نشده است. پیش از حل، هم‌زمانی بارها، نبود بارگذاری تکراری و قرارداد اتصال باید بررسی شود."};
}
function selfTest(){
 const t=[],ck=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const model={nodes:[{id:"C1",x:0,y:5,z:0,kind:"column"},{id:"OTHER",x:2,y:0,z:0,kind:"frame"}],members:[]};
 const demand={success:true,transferType:"demand-only-global-coordinate",demands:[{connectionId:"BR1",caseId:"LC1",columnNodeId:"C1",coordinateSystem:"global",columnNodeCoordinate_m:[0,5,0],force_N:[1,2,3],momentAtColumnNode_Nm:[4,5,6],source:"3D model",document:"RPT-1"}]};
 const base={id:"LC1",nodalLoads:[{nodeId:"OTHER",values:[0,0,0,0,0,0]}]};
 ck("creates solver-compatible six-DOF nodal load",()=>{const r=buildLoadCase(model,base,demand),x=r.loadCase?.nodalLoads.find(n=>n.nodeId==="C1");return r.success&&x.values.join(",")==="1,2,3,4,5,6";});
 ck("preserves pre-existing nodal loads",()=>{const r=buildLoadCase(model,base,demand);return r.success&&r.loadCase.nodalLoads.some(n=>n.nodeId==="OTHER");});
 ck("aggregates demands at same column node",()=>{const d={...demand,demands:[demand.demands[0],{...demand.demands[0],connectionId:"BR2",force_N:[2,0,0]}]};const r=buildLoadCase(model,base,d);return r.success&&r.aggregatedNodeCount===1&&r.loadCase.nodalLoads.find(n=>n.nodeId==="C1").values[0]===3;});
 ck("rejects unknown column node",()=>!buildLoadCase(model,base,{...demand,demands:[{...demand.demands[0],columnNodeId:"MISSING"}]}).success);
 ck("rejects coordinate mismatch",()=>!buildLoadCase(model,base,{...demand,demands:[{...demand.demands[0],columnNodeCoordinate_m:[0,4,0]}]}).success);
 ck("rejects load case ID mismatch",()=>!buildLoadCase(model,{...base,id:"LC2"},demand).success);
 ck("rejects missing base nodal load array",()=>!buildLoadCase(model,{id:"LC1"},demand).success);
 ck("rejects repeated injection into same load case",()=>{const first=buildLoadCase(model,base,demand);return !buildLoadCase(model,first.loadCase,demand).success;});
 ck("requires global coordinate declaration",()=>!buildLoadCase(model,base,{...demand,demands:[{...demand.demands[0],coordinateSystem:"local"}]}).success);
 ck("does not auto-run solver or approve design",()=>{const r=buildLoadCase(model,base,demand);return r.success&&r.analysisEnabled===false&&r.designApproved===false;});
 ck("rejects duplicate connection/case rows inside one transfer batch",()=>!buildLoadCase(model,base,{...demand,demands:[demand.demands[0],demand.demands[0]]}).success);
 ck("rejects malformed or unknown pre-existing nodal loads",()=>!buildLoadCase(model,{...base,nodalLoads:[{nodeId:"MISSING",values:[0,0,0,0,0,0]}]},demand).success);
 ck("rejects duplicate pre-existing nodal-load node entries",()=>!buildLoadCase(model,{...base,nodalLoads:[{nodeId:"C1",values:[0,0,0,0,0,0]},{nodeId:"C1",values:[0,0,0,0,0,0]}]},demand).success);
 ck("rejects nonfinite base nodal-load components",()=>!buildLoadCase(model,{...base,nodalLoads:[{nodeId:"C1",values:[0,0,0,0,0,Infinity]}]},demand).success);
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,designApproved:false};
}
root.SteelCraneBracketColumnFEMAdapter={buildLoadCase,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-runway-serviceability-audit.js ===== */
/* SAHROUD STEEL — crane runway serviceability criterion comparison.
 * Compares explicitly supplied analysis responses with documented project limits.
 * It never invents deflection limits or declares code compliance.
 */
(function(root){
"use strict";
function audit(p){
 p=p||{};const issues=[],checks=[];
 ["memberOrRailId","loadCaseId","serviceCombinationSource","responseSource","criterionSource","criterionClause","reviewer"].forEach(k=>{if(!String(p[k]||"").trim())issues.push(k+" الزامی است.");});
 const pairs=[["verticalDeflection_mm","verticalLimit_mm","خیز قائم"],["horizontalDeflection_mm","horizontalLimit_mm","جابجایی افقی"],["rotation_rad","rotationLimit_rad","چرخش/شیب"],["relativeSettlement_mm","settlementLimit_mm","نشست نسبی"]];
 pairs.forEach(([d,l,label])=>{
  const dv=Number(p[d]),lv=Number(p[l]);
  if(p[d]===undefined||p[d]===""||!Number.isFinite(dv)||dv<0)issues.push(label+": مقدار پاسخ باید عددی و نامنفی باشد.");
  if(p[l]===undefined||p[l]===""||!Number.isFinite(lv)||lv<=0)issues.push(label+": حد مجاز باید مثبت و مستند باشد.");
  if(String(p[l+"Source"]||"").trim()==="")issues.push(label+": مرجع حد مجاز الزامی است.");
  if(Number.isFinite(dv)&&dv>=0&&Number.isFinite(lv)&&lv>0)checks.push({response:d,limit:l,label,demand:dv,allowable:lv,ratio:dv/lv,withinEnteredLimit:dv<=lv});
 });
 const ready=issues.length===0&&checks.length===pairs.length;
 return {success:ready,criteriaSatisfied:ready&&checks.every(x=>x.withinEnteredLimit),analysisEnabled:false,designApproved:false,memberOrRailId:p.memberOrRailId||null,loadCaseId:p.loadCaseId||null,checks,issues,limitations:["این مقایسه فقط پاسخ‌های واردشده را با حدودی که کاربر مستند کرده می‌سنجد؛ حدود آیین‌نامه‌ای پیش‌فرض ندارد.","این ابزار پاسخ را مستقیماً از حل‌گر استخراج یا صحت بار حالت بهره‌برداری را اثبات نمی‌کند؛ منبع پاسخ و شناسه حالت باید توسط کاربر کنترل شوند.","عبور نکردن از حدود واردشده به معنی انطباق کامل سازه، ریل، جرثقیل یا آیین‌نامه نیست."]};
}
function readUI(){const e=root.document?.getElementById?.("craneServiceabilityJson");if(!e||!String(e.value||"").trim())return {};try{return JSON.parse(e.value);}catch(x){return {parseError:String(x.message||x)};}}
function run(){const p=readUI(),r=p.parseError?{success:false,issues:[p.parseError]}:audit(p),h=root.document?.getElementById?.("craneServiceabilityResult");if(h)h.textContent=JSON.stringify(r,null,2);return r;}
function mount(){const d=root.document;if(!d||d.getElementById("craneServiceabilityPanel"))return;const main=d.querySelector("main");if(!main)return;const p=d.createElement("section");p.className="panel";p.id="craneServiceabilityPanel";p.innerHTML='<div class="panel-title"><h3>کنترل تغییرمکان و سرویس‌پذیری ریل جرثقیل</h3><span class="status">بدون حد پیش‌فرض</span></div><div class="notice">پاسخ‌های استخراج‌شده از تحلیل بهره‌برداری و حدود مجاز مستند پروژه را وارد کنید. هیچ حدی از پیش فرض نشده است؛ نتیجه فقط مقایسه با معیارهای ثبت‌شده است.</div><div class="field"><label for="craneServiceabilityJson">پاسخ‌ها و معیارهای سرویس‌پذیری (JSON)</label><textarea id="craneServiceabilityJson" rows="10" placeholder="{ &quot;memberOrRailId&quot;:&quot;G1&quot;, &quot;loadCaseId&quot;:&quot;SLS-1&quot;, &quot;serviceCombinationSource&quot;:&quot;...&quot;, &quot;responseSource&quot;:&quot;analysis report&quot;, &quot;criterionSource&quot;:&quot;...&quot;, &quot;criterionClause&quot;:&quot;...&quot;, &quot;reviewer&quot;:&quot;...&quot;, &quot;verticalDeflection_mm&quot;:8, &quot;verticalLimit_mm&quot;:12, &quot;verticalLimit_mmSource&quot;:&quot;...&quot;, &quot;horizontalDeflection_mm&quot;:3, &quot;horizontalLimit_mm&quot;:5, &quot;horizontalLimit_mmSource&quot;:&quot;...&quot;, &quot;rotation_rad&quot;:0.001, &quot;rotationLimit_rad&quot;:0.002, &quot;rotationLimit_radSource&quot;:&quot;...&quot;, &quot;relativeSettlement_mm&quot;:1, &quot;settlementLimit_mm&quot;:2, &quot;settlementLimit_mmSource&quot;:&quot;...&quot; }"></textarea></div><button class="btn primary" id="craneServiceabilityRun" type="button">مقایسه پاسخ و حدود مستند</button><pre id="craneServiceabilityResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';const a=d.getElementById("craneConnectionPanel");if(a)a.insertAdjacentElement("afterend",p);else main.appendChild(p);d.getElementById("craneServiceabilityRun").addEventListener("click",run);}
function selfTest(){const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message)});}};const p={memberOrRailId:"G1",loadCaseId:"SLS-1",serviceCombinationSource:"SLS-1 doc",responseSource:"FEM-1",criterionSource:"project spec",criterionClause:"clause 4",reviewer:"engineer",verticalDeflection_mm:8,verticalLimit_mm:12,verticalLimit_mmSource:"spec p.4",horizontalDeflection_mm:3,horizontalLimit_mm:5,horizontalLimit_mmSource:"spec p.4",rotation_rad:.001,rotationLimit_rad:.002,rotationLimit_radSource:"spec p.5",relativeSettlement_mm:1,settlementLimit_mm:2,settlementLimit_mmSource:"spec p.5"};t("accepts complete documented serviceability comparison",()=>audit(p).success&&audit(p).criteriaSatisfied);t("calculates exact vertical utilization",()=>Math.abs(audit(p).checks[0].ratio-8/12)<1e-12);t("flags demand above entered limit",()=>!audit({...p,verticalDeflection_mm:13}).criteriaSatisfied);t("rejects missing criterion source",()=>!audit({...p,horizontalLimit_mmSource:""}).success);t("rejects missing service combination source",()=>!audit({...p,serviceCombinationSource:""}).success);t("rejects negative response",()=>!audit({...p,rotation_rad:-.1}).success);t("rejects zero allowable limit",()=>!audit({...p,verticalLimit_mm:0}).success);t("requires all four response criteria",()=>!audit({...p,settlementLimit_mmSource:""}).success);t("does not invent missing response",()=>!audit({...p,horizontalDeflection_mm:""}).success);t("does not claim code compliance or enable analysis",()=>{const r=audit(p);return r.analysisEnabled===false&&!r.designApproved;});return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false};}
root.SteelCraneServiceabilityAudit={audit,readUI,run,selfTest};if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-engineering-chain-audit.js ===== */
/* SAHROUD STEEL — crane engineering chain consistency audit.
 * Cross-checks identifiers and provenance between synchronized rail transfer,
 * 3D frame analysis, and separate runway-girder FEM results.
 * This is a traceability/consistency gate, never a structural capacity check.
 */
(function(root){
"use strict";
const text=v=>String(v??"").trim();
const finite=v=>Number.isFinite(Number(v));
function audit(p){
 p=p||{};const issues=[],checks=[];
 const req=(obj,key,label)=>{if(!text(obj?.[key]))issues.push(label+" ثبت نشده است.");};
 const add=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 const transfer=p.twoRailTransfer||{},frame=p.frameAnalysis||{},girder=p.runwayGirder||{};
 req(p,"projectId","شناسه پروژه");
 req(p,"modelRevision","نسخه مدل");
 req(transfer,"sourceDocument","مرجع بارهای چرخ/انتقال دو ریل");
 req(frame,"loadCaseId","شناسه حالت بار تحلیل سه‌بعدی");
 req(frame,"modelRevision","نسخه مدل تحلیل سه‌بعدی");
 req(girder,"modelRevision","نسخه مدل تحلیل تیر حمال");
 if(!Array.isArray(transfer.cases)||!transfer.cases.length)issues.push("حالات بار هم‌زمان دو ریل موجود نیست.");
 if(!Array.isArray(frame.cases)||!frame.cases.length)issues.push("نتایج حالات تحلیل سه‌بعدی موجود نیست.");
 if(!Array.isArray(girder.cases)||!girder.cases.length)issues.push("نتایج تحلیل FEM تیرهای حمال موجود نیست.");
 const sameModel=text(p.modelRevision)&&text(frame.modelRevision)===text(p.modelRevision)&&text(girder.modelRevision)===text(p.modelRevision);
 add("model-revision-consistency",sameModel,"نسخه مدل پروژه، تحلیل سه‌بعدی و تیر حمال باید دقیقاً یکسان باشد.");
 const transferIds=(transfer.cases||[]).map(x=>text(x.caseId)).filter(Boolean);
 const frameIds=(frame.cases||[]).map(x=>text(x.caseId)).filter(Boolean);
 const girderIds=(girder.cases||[]).map(x=>text(x.caseId)).filter(Boolean);
 const unique=a=>new Set(a).size===a.length;
 add("unique-transfer-case-identifiers",transferIds.length===(transfer.cases||[]).length&&unique(transferIds),"هر حالت انتقال باید شناسه مستقل و یکتا داشته باشد.");
 add("unique-frame-case-identifiers",frameIds.length===(frame.cases||[]).length&&unique(frameIds),"هر حالت تحلیل سه‌بعدی باید شناسه مستقل و یکتا داشته باشد.");
 add("unique-girder-case-identifiers",girderIds.length===(girder.cases||[]).length&&unique(girderIds),"هر حالت تحلیل تیر حمال باید شناسه مستقل و یکتا داشته باشد.");
 const transferSet=new Set(transferIds),frameSet=new Set(frameIds),girderSet=new Set(girderIds);
 const frameSourceIds=(frame.cases||[]).map(x=>text(x.sourceTransferCaseId)).filter(Boolean);
 const girderSourceIds=(girder.cases||[]).map(x=>text(x.sourceTransferCaseId)).filter(Boolean);
 const frameCovers=transferIds.length>0&&frameSourceIds.length===transferIds.length&&unique(frameSourceIds)&&transferIds.every(x=>frameSourceIds.includes(x));
 const girderCovers=transferIds.length>0&&girderSourceIds.length===transferIds.length&&unique(girderSourceIds)&&transferIds.every(x=>girderSourceIds.includes(x));
 add("one-to-one-transfer-case-coverage-in-3d-frame",frameCovers,"هر حالت انتقال باید دقیقاً یک نتیجه قاب متناظر داشته باشد؛ تکرار پیوند یا حذف حالت پذیرفته نیست.");
 add("one-to-one-transfer-case-coverage-in-runway-girders",girderCovers,"هر حالت انتقال باید دقیقاً یک نتیجه تیر حمال متناظر داشته باشد؛ تکرار پیوند یا حذف حالت پذیرفته نیست.");
 const frameNoOrphans=frameSourceIds.every(x=>transferSet.has(x));
 const girderNoOrphans=girderSourceIds.every(x=>transferSet.has(x));
 add("no-unmatched-frame-cases",frameNoOrphans,"حالت تحلیل سه‌بعدی بدون حالت انتقال متناظر پذیرفته نیست.");
 add("no-unmatched-girder-cases",girderNoOrphans,"حالت تحلیل تیر حمال بدون حالت انتقال متناظر پذیرفته نیست.");
 const railPair=(transfer.cases||[]).every(c=>c.leftRailPresent===true&&c.rightRailPresent===true);
 add("both-rail-results-per-case",railPair,"برای هر حالت، پاسخ هر دو ریل باید هم‌زمان وجود داشته باشد.");
 const frameLoadMatch=(frame.cases||[]).every(c=>text(c.sourceTransferCaseId)&&transferSet.has(text(c.sourceTransferCaseId)));
 add("frame-case-source-link",frameLoadMatch,"هر تحلیل سه‌بعدی باید به شناسه حالت انتقال مبدأ پیوند داشته باشد.");
 const girderSourceMatch=(girder.cases||[]).every(c=>text(c.sourceTransferCaseId)&&transferSet.has(text(c.sourceTransferCaseId)));
 add("girder-case-source-link",girderSourceMatch,"هر تحلیل تیر حمال باید به شناسه حالت انتقال مبدأ پیوند داشته باشد.");
 const equilibrium=(frame.cases||[]).every(c=>c.equilibriumOK===true&&c.memberEndEquilibriumOK===true)&&(girder.cases||[]).every(c=>c.leftEquilibriumOK===true&&c.rightEquilibriumOK===true);
 add("equilibrium-status",equilibrium,"تعادل قاب سه‌بعدی، ممیزی مستقل نیروهای انتهایی اعضا در گره‌ها و تعادل هر دو تیر حمال باید برای تک‌تک حالات تأیید شده باشد.");
 const completeSources=(transfer.cases||[]).every(c=>text(c.leftRailSource)&&text(c.rightRailSource)&&text(c.wheelLoadSource))&&text(transfer.sourceDocument);
 add("source-provenance-complete",completeSources,"منبع هر ریل، بار چرخ و سند مبنای انتقال باید ثبت شود.");
 const counts=(transfer.cases||[]).length===(frame.cases||[]).length&&(transfer.cases||[]).length===(girder.cases||[]).length;
 add("case-counts-match",counts,"تعداد حالات در سه مرحله انتقال، قاب و تیر حمال باید برابر باشد.");
 const passed=checks.filter(x=>x.ok).length,failed=checks.length-passed;
 return {success:issues.length===0&&failed===0,readyForEngineeringReview:issues.length===0&&failed===0,analysisEnabled:false,designApproved:false,projectId:text(p.projectId)||null,modelRevision:text(p.modelRevision)||null,caseCounts:{transfer:(transfer.cases||[]).length,frame:(frame.cases||[]).length,girder:(girder.cases||[]).length},passed,failed,checks,issues,limitations:[
 "این ممیزی فقط پیوستگی شناسه‌ها، تعداد حالات، حضور هم‌زمان دو ریل، تعادل گزارش‌شده و ردیابی منابع را بررسی می‌کند.",
 "این ممیزی صحت فیزیکی بارگذاری، مدل اجزای محدود، سختی تکیه‌گاه، قرارداد علامت یا اعتبار خروجی حل‌گر را اثبات نمی‌کند.",
 "موفقیت این ممیزی به معنی ظرفیت‌سنجی، کنترل آیین‌نامه‌ای، کفایت خستگی/پایداری یا تأیید طراحی نیست.",
 "شناسه‌های حالت باید در خروجی‌های واقعی برنامه به شکل دقیق و یکسان صادر شوند؛ ورود دستی نادرست می‌تواند نتیجه ممیزی را مخدوش کند."
 ]};
}
function readUI(){const el=root.document?.getElementById?.("craneChainAuditJson");if(!el||!text(el.value))return {parseError:"ابتدا داده زنجیره تحلیل را وارد کنید."};try{return JSON.parse(el.value);}catch(e){return {parseError:String(e.message||e)};}}
function run(){const p=readUI(),r=p.parseError?{success:false,issues:[p.parseError],analysisEnabled:false}:audit(p),el=root.document?.getElementById?.("craneChainAuditResult");if(el)el.textContent=JSON.stringify(r,null,2);return r;}
function mount(){const d=root.document;if(!d||d.getElementById("craneChainAuditPanel"))return;const main=d.querySelector("main");if(!main)return;const panel=d.createElement("section");panel.className="panel";panel.id="craneChainAuditPanel";panel.innerHTML='<div class="panel-title"><h3>ممیزی زنجیره انتقال بار جرثقیل تا تیر حمال</h3><span class="status">کنترل ردیابی</span></div><div class="notice">شناسه پروژه، نسخه مدل و شناسه هر حالت را از گزارش‌های واقعی انتقال دو ریل، تحلیل سه‌بعدی و FEM تیر حمال وارد کنید. این ممیزی از ترکیب ناخواسته حالات غیرهم‌زمان و گم‌شدن پیوند منابع جلوگیری می‌کند؛ ظرفیت سازه را کنترل نمی‌کند.</div><div class="field"><label for="craneChainAuditJson">داده زنجیره تحلیل (JSON)</label><textarea id="craneChainAuditJson" rows="12" placeholder="{ &quot;projectId&quot;:&quot;P-01&quot;, &quot;modelRevision&quot;:&quot;MODEL-REV-01&quot;, &quot;twoRailTransfer&quot;:{ &quot;sourceDocument&quot;:&quot;Crane vendor drawing p.4&quot;, &quot;cases&quot;:[{ &quot;caseId&quot;:&quot;CASE-01&quot;, &quot;leftRailPresent&quot;:true, &quot;rightRailPresent&quot;:true, &quot;leftRailSource&quot;:&quot;...&quot;, &quot;rightRailSource&quot;:&quot;...&quot;, &quot;wheelLoadSource&quot;:&quot;...&quot; }] }, &quot;frameAnalysis&quot;:{ &quot;loadCaseId&quot;:&quot;CASE-01&quot;, &quot;modelRevision&quot;:&quot;MODEL-REV-01&quot;, &quot;cases&quot;:[{ &quot;caseId&quot;:&quot;CASE-01-FRAME&quot;, &quot;sourceTransferCaseId&quot;:&quot;CASE-01&quot;, &quot;equilibriumOK&quot;:true }] }, &quot;runwayGirder&quot;:{ &quot;modelRevision&quot;:&quot;MODEL-REV-01&quot;, &quot;cases&quot;:[{ &quot;caseId&quot;:&quot;CASE-01-GIRDER&quot;, &quot;sourceTransferCaseId&quot;:&quot;CASE-01&quot;, &quot;leftEquilibriumOK&quot;:true, &quot;rightEquilibriumOK&quot;:true }] } }"></textarea></div><div class="button-grid"><button id="craneChainAuditRun" class="btn primary" type="button">اجرای ممیزی زنجیره</button></div><pre id="craneChainAuditResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const anchor=d.getElementById("craneServiceabilityPanel")||d.getElementById("runwayGirderPanel");if(anchor)anchor.insertAdjacentElement("afterend",panel);else{const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);}d.getElementById("craneChainAuditRun").addEventListener("click",run);}
function selfTest(){const t=[],test=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const p={projectId:"P1",modelRevision:"M1",twoRailTransfer:{sourceDocument:"vendor drawing",cases:[{caseId:"C1",leftRailPresent:true,rightRailPresent:true,leftRailSource:"left",rightRailSource:"right",wheelLoadSource:"wheel page"},{caseId:"C2",leftRailPresent:true,rightRailPresent:true,leftRailSource:"left",rightRailSource:"right",wheelLoadSource:"wheel page"}]},frameAnalysis:{loadCaseId:"C1",modelRevision:"M1",cases:[{caseId:"F1",sourceTransferCaseId:"C1",equilibriumOK:true,memberEndEquilibriumOK:true},{caseId:"F2",sourceTransferCaseId:"C2",equilibriumOK:true,memberEndEquilibriumOK:true}]},runwayGirder:{modelRevision:"M1",cases:[{caseId:"G1",sourceTransferCaseId:"C1",leftEquilibriumOK:true,rightEquilibriumOK:true},{caseId:"G2",sourceTransferCaseId:"C2",leftEquilibriumOK:true,rightEquilibriumOK:true}]}};
 test("accepts complete matched synchronized analysis chain",()=>audit(p).success);
 test("rejects model revision mismatch",()=>!audit({...p,runwayGirder:{...p.runwayGirder,modelRevision:"M2"}}).success);
 test("rejects missing transfer case",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[]}}).success);
 test("rejects absent right rail",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[{...p.twoRailTransfer.cases[0],rightRailPresent:false}]}}).success);
 test("rejects unmatched frame case",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[{...p.frameAnalysis.cases[0],sourceTransferCaseId:"MISSING"}]}}).success);
 test("rejects unmatched girder case",()=>!audit({...p,runwayGirder:{...p.runwayGirder,cases:[{...p.runwayGirder.cases[0],sourceTransferCaseId:"MISSING"}]}}).success);
 test("rejects missing equilibrium confirmation",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[{...p.frameAnalysis.cases[0],equilibriumOK:false},p.frameAnalysis.cases[1]]}}).success);
 test("rejects frame case without independent member-end node equilibrium",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[{...p.frameAnalysis.cases[0],memberEndEquilibriumOK:false},p.frameAnalysis.cases[1]]}}).success);
 test("rejects incomplete wheel source",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[{...p.twoRailTransfer.cases[0],wheelLoadSource:""},p.twoRailTransfer.cases[1]]}}).success);
 test("rejects duplicate transfer identifiers",()=>!audit({...p,twoRailTransfer:{...p.twoRailTransfer,cases:[p.twoRailTransfer.cases[0],p.twoRailTransfer.cases[0]]}}).success);
 test("rejects duplicate frame identifiers",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[p.frameAnalysis.cases[0],p.frameAnalysis.cases[0]]}}).success);
 test("rejects duplicate girder identifiers",()=>!audit({...p,runwayGirder:{...p.runwayGirder,cases:[p.runwayGirder.cases[0],p.runwayGirder.cases[0]]}}).success);
 test("rejects unequal stage case counts",()=>!audit({...p,runwayGirder:{...p.runwayGirder,cases:[p.runwayGirder.cases[0]]}}).success);
 test("rejects duplicated source-transfer link that hides an omitted frame case",()=>!audit({...p,frameAnalysis:{...p.frameAnalysis,cases:[p.frameAnalysis.cases[0],{...p.frameAnalysis.cases[1],sourceTransferCaseId:"C1"}]}}).success);
 test("rejects duplicated source-transfer link that hides an omitted runway case",()=>!audit({...p,runwayGirder:{...p.runwayGirder,cases:[p.runwayGirder.cases[0],{...p.runwayGirder.cases[1],sourceTransferCaseId:"C1"}]}}).success);
 test("does not enable analysis or approve design",()=>{const r=audit(p);return r.analysisEnabled===false&&r.designApproved===false;});
 test("does not label traceability as code compliance",()=>audit(p).limitations.some(x=>x.includes("ظرفیت‌سنجی")));
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,note:"Software traceability tests only; no structural validation or code approval."};
}
root.SteelCraneEngineeringChainAudit={audit,readUI,run,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-design-inputs.js ===== */
/* SAHROUD STEEL — member design parameter register.
 * Group-level values are recorded only; no capacity check consumes them yet.
 */
(function(root){
"use strict";
const groups=[
 {key:"column",label:"ستون‌ها",family:"hot-rolled"},
 {key:"rafter",label:"تیرها و رفترها",family:"hot-rolled-or-built-up"},
 {key:"endPost",label:"ستونک‌های انتهایی",family:"hot-rolled-or-built-up"},
 {key:"endGirt",label:"تیرهای انتهایی",family:"section-specific"},
 {key:"roofPurlin",label:"لاپه‌های سقف",family:"cold-formed-or-hot-rolled"},
 {key:"wallGirt",label:"قیدهای دیوار",family:"cold-formed-or-hot-rolled"},
 {key:"roofBrace",label:"مهاربندهای سقف",family:"brace"},
 {key:"wallBrace",label:"مهاربندهای دیوار",family:"brace"},
 {key:"roofEdge",label:"اعضای لبه سقف",family:"section-specific"}
];
const fields=[
 ["t_mm","ضخامت فولاد t (mm)"],["Fy","Fy (MPa)"],["Fu","Fu (MPa)"],["E_MPa","مدول الاستیسیته E (MPa)"],["G_MPa","مدول برشی G (MPa)"],["Kx","Kx"],["Ky","Ky"],["Kz","Kz"],
 ["Lcx","طول مؤثر فشاری حول x (m)"],["Lcy","طول مؤثر فشاری حول y (m)"],["Lcz","طول مؤثر پیچشی (m)"],
 ["Lb","طول مهارنشده خمشی Lb (m)"],["Cb","Cb"]
];
let data={schemaVersion:1,groups:{}};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function readUI(){
 groups.forEach(g=>{
  const row={};
  fields.forEach(([k])=>{const el=$("mdi_"+g.key+"_"+k),v=el?.value??"";row[k]=v===""?null:Number(v);});
  row.applyToAll=$("mdi_"+g.key+"_apply")?.checked===true;
  row.bracingNote=$("mdi_"+g.key+"_note")?.value||"";
  data.groups[g.key]=row;
 });
 return getData();
}
function getData(){return JSON.parse(JSON.stringify(data));}
function setData(value){
 if(!value||typeof value!=="object")return;
 data={schemaVersion:1,groups:{}};
 groups.forEach(g=>{
  const src=value.groups?.[g.key]||{},row={};
  fields.forEach(([k])=>row[k]=src[k]===null||src[k]===undefined||src[k]===""?null:(Number.isFinite(Number(src[k]))?Number(src[k]):null));
  row.applyToAll=src.applyToAll===true;row.bracingNote=String(src.bracingNote||"");data.groups[g.key]=row;
 });
 render();
}
function getForGroup(key){
 const raw=JSON.parse(JSON.stringify(data.groups[key]||{}));
 const coldFormed=["roofPurlin","wallGirt"].includes(key);
 const material=window.SteelSections?.read?.().material||{};
 const rawThickness=Number(raw.t_mm);
 const thickness=rawThickness>0?rawThickness:(coldFormed?NaN:Number(material.thickness_mm));
 const defaults=coldFormed?{}:(window.SteelSections?.getMaterialDefaults?.(material.grade,thickness)||{});
 const hasFy=Number.isFinite(raw.Fy)&&raw.Fy>0,hasFu=Number.isFinite(raw.Fu)&&raw.Fu>0;
 return {...raw,t_mm:Number.isFinite(thickness)&&thickness>0?thickness:null,
   Fy:hasFy?raw.Fy:defaults.Fy_MPa,Fu:hasFu?raw.Fu:defaults.Fu_MPa,
   materialSource:coldFormed?(hasFy&&hasFu?"ورودی گروه؛ تطبیق با گواهی هر عضو الزامی است":"نیازمند گواهی مصالح اختصاصی هر عضو"):(hasFy&&hasFu?"ورودی اختصاصی گروه":defaults.source||"نیازمند گواهی مصالح"),
   requiresMemberSpecificRecord:coldFormed};
}
function validate(){
 const issues=[];
 groups.forEach(g=>{
  const raw=data.groups[g.key]||{};
  if(!raw.applyToAll)return;
  const x=getForGroup(g.key);
  ["Fy","Fu","E_MPa","G_MPa","Kx","Ky","Kz","Lcx","Lcy","Lcz","Lb","Cb"].forEach(k=>{
   if(!(Number.isFinite(x[k])&&x[k]>0))issues.push(g.label+": مقدار "+k+" برای اعمال گروهی باید مثبت و معتبر باشد.");
  });
  if(x.Fu<x.Fy)issues.push(g.label+": Fu کمتر از Fy ثبت شده است؛ داده مصالح را بازبینی کنید.");
  if(!(Number.isFinite(x.t_mm)&&x.t_mm>0))issues.push(g.label+": ضخامت مبنای مصالح معتبر نیست.");
 });
 return issues;
}
function render(){
 const host=$("memberDesignInputsContent");if(!host)return;
 host.innerHTML='<div class="notice">این رجیستر پارامترهای عمومی و مشترک هر گروه را ثبت می‌کند؛ گرید از پنل مصالح به ارث می‌رسد و ضخامت و خواص مصالح باید با مدارک واقعی تطبیق داده شوند. برای تیر و ستون، این داده‌ها ورودی مقدماتی مسیر طراحی‌اند. برای لاپه و قید، این جدول جایگزین شناسه و هندسه دقیق تک‌تک پروفیل‌ها، خواص مقطع، کمانش موضعی/اعوجاجی، مهار و اتصال در قرارداد اختصاصی مقاطع سردنورد نیست. اعمال گروهی فقط وقتی مجاز است که شرایط تمام اعضای گروه واقعاً یکسان باشد.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:1150px;width:100%"><thead><tr><th>گروه عضو</th>'+fields.map(x=>'<th>'+x[1]+'</th>').join("")+'<th>اعمال به همه اعضای گروه</th><th>شرح مهاربندی/منبع</th></tr></thead><tbody>'+
 groups.map(g=>{const x=data.groups[g.key]||{};return '<tr><td>'+g.label+'</td>'+
 fields.map(([k])=>'<td><input type="number" step="any" min="0" id="mdi_'+g.key+'_'+k+'" value="'+(x[k]??"")+'" style="width:90px"></td>').join("")+
 '<td><input type="checkbox" id="mdi_'+g.key+'_apply" '+(x.applyToAll?"checked":"")+'></td>'+
 '<td><input type="text" id="mdi_'+g.key+'_note" value="'+esc(x.bracingNote||"")+'" placeholder="مثلاً مهار جانبی در هر لاپه" style="min-width:180px"></td></tr>';}).join("")+
 '</tbody></table></div>'+
 '<div class="notice">برای لاپه و قید، مسیر اختصاصی SteelColdFormedMemberContract باید برای هر عضو به‌صورت مستقل تکمیل شود؛ این جدول فقط داده‌های مشترک گروه را نگه می‌دارد. شناژهای بتنی در این رجیستر فولادی قرار نمی‌گیرند. این پارامترها هنوز به روابط مقاومت نهایی متصل نشده‌اند و ثبت آن‌ها به معنی تأیید یا طراحی عضو نیست.</div>'+
 '<div class="button-grid"><button type="button" class="btn secondary" id="btnMemberDesignInputCheck">بررسی کامل بودن داده‌های گروهی</button><button type="button" class="btn secondary" id="btnMemberDesignInputExport">خروجی پارامترها JSON</button></div>'+
 '<div class="notice" id="memberDesignInputStatus">پارامترها در فایل پروژه ذخیره می‌شوند.</div>';
 groups.forEach(g=>[...fields.map(x=>"mdi_"+g.key+"_"+x[0]),"mdi_"+g.key+"_apply","mdi_"+g.key+"_note"].forEach(id=>$(id)?.addEventListener("input",readUI)));
 $("btnMemberDesignInputCheck").addEventListener("click",()=>{readUI();const issues=validate();$("memberDesignInputStatus").textContent=issues.length?issues.join(" | "):"داده‌های گروهی تأییدشده از نظر کامل بودن فیلدها بررسی شدند؛ صحت مقادیر و یکسان بودن شرایط اعضا همچنان نیازمند کنترل نقشه و مدارک است.";});
 $("btnMemberDesignInputExport").addEventListener("click",()=>{readUI();const blob=new Blob([JSON.stringify(getData(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-member-design-inputs.json";a.click();URL.revokeObjectURL(url);});
}
function init(){
 if($("memberDesignInputsPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="memberDesignInputsPanel";p.setAttribute("data-focus-group","member-design");
 p.innerHTML='<div class="panel-title"><h3>پارامترهای طراحی اعضا — مبنای کنترل مبحث دهم</h3><span class="status">ورودی‌های مهندسی</span></div><div id="memberDesignInputsContent"></div>';
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);render();
}
function selfTest(){
 const prior=JSON.parse(JSON.stringify(data)),tests=[];
 const keys=groups.map(g=>g.key);
 tests.push({name:"all requested steel member groups have input rows",pass:["column","rafter","roofPurlin","wallGirt"].every(k=>keys.includes(k))});
 const fixture={schemaVersion:1,groups:{roofPurlin:{Fy:240,Fu:360,t_mm:2.5,applyToAll:true,bracingNote:"مهار طبق نقشه P-01"},wallGirt:{Fy:235,Fu:360,t_mm:2,applyToAll:false}}};
 setData(fixture);
 const round=getData();
 tests.push({name:"purlin and wall-girt group values survive save/load",pass:round.groups.roofPurlin.Fy===240&&round.groups.roofPurlin.t_mm===2.5&&round.groups.wallGirt.Fu===360});
 tests.push({name:"cold-formed groups remain identified as section-specific families",pass:groups.filter(g=>["roofPurlin","wallGirt"].includes(g.key)).every(g=>g.family==="cold-formed-or-hot-rolled")});
 setData({schemaVersion:1,groups:{}});
 tests.push({name:"missing member-group inputs are not silently populated with fabricated capacities",pass:getData().groups.roofPurlin.Fy===null&&getData().groups.wallGirt.Fy===null});
 const priorWindow=typeof window!=="undefined"?window.SteelSections:undefined;
 if(typeof window!=="undefined")window.SteelSections={read:()=>({material:{grade:"ST37",thickness_mm:10}}),getMaterialDefaults:()=>({Fy_MPa:240,Fu_MPa:370,source:"hot-rolled material defaults"})};
 setData({schemaVersion:1,groups:{}});
 const purlinDefaults=getForGroup("roofPurlin"),girtDefaults=getForGroup("wallGirt"),columnDefaults=getForGroup("column");
 tests.push({name:"cold-formed groups do not inherit hot-rolled grade or thickness defaults",pass:purlinDefaults.Fy===undefined&&purlinDefaults.Fu===undefined&&purlinDefaults.t_mm===null&&girtDefaults.Fy===undefined&&girtDefaults.t_mm===null});
 tests.push({name:"cold-formed group output requires member-specific evidence",pass:purlinDefaults.requiresMemberSpecificRecord===true&&girtDefaults.requiresMemberSpecificRecord===true&&purlinDefaults.materialSource.includes("گواهی")});
 tests.push({name:"hot-rolled groups retain their material-panel fallback",pass:columnDefaults.Fy===240&&columnDefaults.Fu===370&&columnDefaults.t_mm===10&&columnDefaults.requiresMemberSpecificRecord===false});
 setData({schemaVersion:1,groups:{roofPurlin:{Fy:350,Fu:420,t_mm:2.5},wallGirt:{Fy:345,Fu:410,t_mm:2}}});
 const explicit=getForGroup("roofPurlin");
 tests.push({name:"explicit cold-formed group values are preserved without defaults",pass:explicit.Fy===350&&explicit.Fu===420&&explicit.t_mm===2.5&&explicit.requiresMemberSpecificRecord===true});
 if(typeof window!=="undefined"){if(priorWindow===undefined)delete window.SteelSections;else window.SteelSections=priorWindow;}
 data=prior;render();
 return{passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,scope:"group input registration and persistence only; no member resistance or approval"};
}
root.SteelMemberDesignInputs={getData,readUI,setData,getForGroup,validate,selfTest,groups:groups.map(x=>({...x}))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);

