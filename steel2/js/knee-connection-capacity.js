/* SAHROUD STEEL — Mabhath 10 (1401) partial connection resistance checks.
 * Computes only explicitly supported LRFD/ASD bolt and plate limit states.
 * It does not distribute joint actions, design welds, solve prying, or approve a connection.
 */
(function(root){
 "use strict";
 const SCHEMA="SAHROUD-KNEE-CONNECTION-CAPACITY-1.0";
 const finite=v=>typeof v==="number"&&Number.isFinite(v);
 const positive=v=>finite(v)&&v>0;
 const text=v=>typeof v==="string"&&v.trim().length>0;
 const PI=Math.PI;
 const PHI_BOLT=0.75, OMEGA_BOLT=2.0;
 const PHI_TY=0.9, PHI_SY=1.0, PHI_RUPTURE=0.75, OMEGA_TY=1.67, OMEGA_SY=1.5, OMEGA_RUPTURE=2.0;
 function fail(errors,msg){errors.push(msg);}
 function factor(method,phi,omega){return method==="LRFD"?phi:1/omega;}
 function demandCheck(id,limitState,demandKN,capacityKN,method,reference){
  const utilization=capacityKN>0?demandKN/capacityKN:Infinity;
  return{id,limitState,demandKN,capacityKN,utilization,status:utilization<=1+1e-9?"PASS":"FAIL",method,reference};
 }
 function validate(detail,design){
  const errors=[],warnings=[];
  if(!root.SahroudKneeConnectionDetail||typeof root.SahroudKneeConnectionDetail.validate!=="function")
   fail(errors,"ماژول اعتبارسنجی هندسه اتصال بارگذاری نشده است.");
  else{
   const v=root.SahroudKneeConnectionDetail.validate(detail);
   if(!v.valid)fail(errors,"هندسه اتصال معتبر نیست: "+v.errors.join(" | "));
  }
  if(!design||typeof design!=="object")return{valid:false,errors:["بسته ورودی ظرفیت اتصال ارائه نشده است."],warnings};
  if(design.schema!==SCHEMA)fail(errors,"نسخه schema ورودی ظرفیت نامعتبر است.");
  if(design.method!=="LRFD"&&design.method!=="ASD")fail(errors,"روش طراحی باید LRFD یا ASD باشد.");
  if(design.connectionType!=="bearing")fail(errors,"این نسخه فقط اتصال پیچی اتکایی را محاسبه می‌کند؛ پیش‌تنیده/لغزش بحرانی پشتیبانی نشده است.");
  if(!text(design.drawingReference)||design.drawingReference!==detail?.drawingReference)
   fail(errors,"مرجع نقشه بسته ظرفیت باید با مرجع نقشه هندسه اتصال یکسان باشد.");
  if(design.boltDemandDistributionVerifiedByEngineer!==true||!text(design.boltDemandDistributionReference))
   fail(errors,"توزیع نیرو بین پیچ‌ها باید توسط مهندس با مرجع محاسبات/نقشه صریح تأیید و مستند شود.");
  if(design.axialEndConnection!==true&&design.axialEndConnection!==false)
   fail(errors,"ماهیت اتصال انتهایی محوری باید صریحاً تعیین شود.");
  if(design.axialEndConnection===true&&!positive(design.boltGroupAxialSpanMm))
   fail(errors,"برای اتصال انتهایی محوری، فاصله اولین تا آخرین پیچ در امتداد نیرو الزامی است.");
  const boltIds=new Set((detail?.bolts||[]).map(b=>String(b.id)));
  const props=design.boltProperties;
  if(!Array.isArray(props)||props.length!==boltIds.size)fail(errors,"مشخصات نوع تمام پیچ‌ها باید جداگانه ثبت شود.");
  const propIds=new Set();
  (props||[]).forEach(p=>{
   if(!boltIds.has(String(p.boltId))||propIds.has(String(p.boltId)))fail(errors,"شناسه مشخصات پیچ نامعتبر یا تکراری است.");
   propIds.add(String(p.boltId));
   if(!["ordinary","high-strength"].includes(p.boltClass))fail(errors,"کلاس پیچ باید ordinary یا high-strength باشد.");
  });
  if(!Array.isArray(design.loadCases)||!design.loadCases.length)fail(errors,"حداقل یک ترکیب ULS با تقاضای صریح لازم است.");
  const caseIds=new Set();
  (design.loadCases||[]).forEach(c=>{
   if(!text(c.id)||caseIds.has(String(c.id)))fail(errors,"شناسه ترکیب بار خالی یا تکراری است.");
   caseIds.add(String(c.id));
   if(c.classification!=="ULS"||!text(c.sourceReference))fail(errors,"هر حالت باید ULS و دارای مرجع خروجی ترکیب بار باشد.");
   if(!c.pryingAssessment||!["calculated","not-applicable"].includes(c.pryingAssessment.status)||!text(c.pryingAssessment.reference))
    fail(errors,"ارزیابی اثر اهرمی هر ترکیب باید calculated یا not-applicable و دارای مرجع مستند باشد.");
   if(c.pryingAssessment?.status==="not-applicable"&&!text(c.pryingAssessment.reason))
    fail(errors,"عدم کاربرد اثر اهرمی باید با دلیل مهندسی ثبت شود.");
   const actions=c.boltActions;
   if(!Array.isArray(actions)||actions.length!==boltIds.size)fail(errors,"تقاضای هر پیچ باید در هر ترکیب، حتی با مقدار صفر، ثبت شود.");
   const actionIds=new Set();
   (actions||[]).forEach(a=>{
    if(!boltIds.has(String(a.boltId))||actionIds.has(String(a.boltId)))fail(errors,"شناسه تقاضای پیچ نامعتبر یا تکراری است.");
    actionIds.add(String(a.boltId));
    if(!finite(a.tensionKN)||a.tensionKN<0||!finite(a.shearKN)||a.shearKN<0)
     fail(errors,"تقاضای کشش و برش هر پیچ باید متناهی و نامنفی باشد.");
    if(c.pryingAssessment?.status==="calculated"&&(!finite(a.pryingTensionKN)||a.pryingTensionKN<0))
     fail(errors,"نیروی کششی افزوده ناشی از اثر اهرمی باید برای هر پیچ صریح باشد.");
    if(c.pryingAssessment?.status==="not-applicable"&&a.pryingTensionKN!==undefined&&a.pryingTensionKN!==0)
     fail(errors,"وقتی اثر اهرمی غیرقابل‌اعمال اعلام شده، نیروی افزوده آن باید صفر باشد.");
   });
   const plateIds=new Set((detail?.plates||[]).map(p=>String(p.id)));
   const bearing=c.bearingChecks;
   if(!Array.isArray(bearing)||bearing.length===0)fail(errors,"کنترل اتکایی و پارگی جدار سوراخ برای ورق‌های درگیر الزامی است.");
   const bearingKeys=new Set();
   (bearing||[]).forEach(b=>{
    const bearingKey=String(b.boltId)+":"+String(b.plateId);
    if(bearingKeys.has(bearingKey))fail(errors,"کنترل اتکایی تکراری برای یک پیچ و ورق ثبت شده است.");
    bearingKeys.add(bearingKey);
    if(!boltIds.has(String(b.boltId))||!plateIds.has(String(b.plateId)))fail(errors,"مرجع پیچ/ورق در کنترل اتکایی نامعتبر است.");
    if(!finite(b.shearKN)||b.shearKN<0||!positive(b.LcMm))fail(errors,"برش هر سوراخ باید متناهی و نامنفی و فاصله خالص Lc مثبت باشد.");
    if(!["standard","oversized","short-slotted","long-slotted"].includes(b.holeType))fail(errors,"نوع سوراخ در کنترل اتکایی نامعتبر است.");
    const sourceBolt=(detail?.bolts||[]).find(q=>String(q.id)===String(b.boltId));
    if(sourceBolt&&sourceBolt.holeType!==b.holeType)fail(errors,"نوع سوراخ در کنترل اتکایی با هندسه پیچ "+b.boltId+" یکسان نیست.");
    if(b.holeType==="oversized")fail(errors,"سوراخ بزرگ‌شده در اتصال اتکایی مجاز نیست؛ این حالت فقط در اتصال لغزش بحرانی قابل بررسی است.");
    if(["short-slotted","long-slotted"].includes(b.holeType)&&b.forceDirectionToSlot!=="transverse")
     fail(errors,"در اتصال اتکایی، محور طولی سوراخ لوبیایی باید عمود بر راستای نیرو باشد.");
    if(b.holeType==="long-slotted"&&!["parallel","transverse"].includes(b.forceDirectionToSlot))
     fail(errors,"جهت نیرو نسبت به محور سوراخ لوبیایی بلند باید تعیین شود.");
   });
   (detail?.bolts||[]).forEach(b=>{if(!bearingKeys.has(String(b.id)+":"+String(b.plateId)))fail(errors,"کنترل اتکایی ورق میزبان برای پیچ "+b.id+" ثبت نشده است.");});
   if(!Array.isArray(c.plateSectionChecks)||c.plateSectionChecks.length!==plateIds.size)
    fail(errors,"کنترل مقطع کلی/خالص کششی و برشی تمام ورق‌ها باید ارائه شود.");
   (c.plateSectionChecks||[]).forEach(p=>{
    if(!plateIds.has(String(p.plateId)))fail(errors,"شناسه ورق در کنترل مقطع نامعتبر است.");
    ["tensionKN","shearKN","AgTensionMm2","AeTensionMm2","AgvMm2","AnvMm2"].forEach(k=>{if(!finite(p[k])||p[k]<0)fail(errors,"مقدار "+k+" در کنترل مقطع ورق نامعتبر است.");});
    if(!text(p.areaReference))fail(errors,"مرجع هندسی محاسبه سطوح مقطع کلی/خالص ورق الزامی است.");
   });
   if(!Array.isArray(c.blockShearChecks)||c.blockShearChecks.length!==plateIds.size)
    fail(errors,"مسیر برش قالبی هر ورق باید با سطوح و مرجع نقشه صریح تعریف شود.");
   (c.blockShearChecks||[]).forEach(p=>{
    if(!plateIds.has(String(p.plateId))||!text(p.pathReference)||!text(p.ubsBasis))fail(errors,"مرجع مسیر برش قالبی/مقدار Ubs ناقص است.");
    ["demandKN","AgvMm2","AnvMm2","AntMm2"].forEach(k=>{if(!positive(p[k]))fail(errors,"مقدار "+k+" در برش قالبی باید مثبت و صریح باشد.");});
    if(![0.5,1].includes(p.Ubs))fail(errors,"Ubs فقط می‌تواند 0.5 یا 1 باشد و مبنای انتخاب باید مستند شود.");
   });
  });
  return{valid:errors.length===0,errors,warnings,schema:SCHEMA,capacityDesigned:false,connectionApproved:false,executionReady:false};
 }
 function calculate(detail,design){
  const checked=validate(detail,design);
  if(!checked.valid)throw new Error("ورودی طراحی ظرفیت کامل/معتبر نیست: "+checked.errors.join(" | "));
  const method=design.method,boltChecks=[],bearingChecks=[],plateChecks=[],blockShearChecks=[];
  const props=new Map(design.boltProperties.map(p=>[String(p.boltId),p]));
  const boltById=new Map(detail.bolts.map(b=>[String(b.id),b]));
  const plateById=new Map(detail.plates.map(p=>[String(p.id),p]));
  const all=[];
  for(const c of design.loadCases){
   const actions=new Map(c.boltActions.map(a=>[String(a.boltId),a]));
   for(const bolt of detail.bolts){
    const a=actions.get(String(bolt.id)),bp=props.get(String(bolt.id));
    const Ab=PI*bolt.diameterMm*bolt.diameterMm/4;
    const Fu=bolt.FuMPa;
    const Fnt=0.75*Fu;
    const Fnv=bp.boltClass==="ordinary"||bolt.threadsInShearPlane?0.45*Fu:0.55*Fu;
    let reduction=1;
    if(bp.boltClass==="ordinary"&&bolt.gripLengthMm>5*bolt.diameterMm){
     const extra=Math.ceil((bolt.gripLengthMm-5*bolt.diameterMm)/2);
     reduction*=Math.max(0,1-0.01*extra);
    }
    if(design.axialEndConnection&&design.boltGroupAxialSpanMm>950)reduction*=1-1/6;
    const T=a.tensionKN+(a.pryingTensionKN||0),V=a.shearKN;
    const planes=bolt.shearPlaneCount;
    const phi=factor(method,PHI_BOLT,OMEGA_BOLT);
    const capT=phi*Fnt*Ab*reduction/1000;
    const capV=phi*Fnv*Ab*planes*reduction/1000;
    const ft=T*1000/Ab, fv=V*1000/(Ab*planes);
    // Apply the two interaction reductions independently: shear reduces tensile strength;
    // tension reduces shear strength. A low demand in one direction does not exempt the other check.
    let FntPrime=Fnt,FnvPrime=Fnv;
    if(fv>=0.3*Fnv){
     FntPrime=method==="LRFD"
      ?Math.min(Fnt,Fnt*(1.3-fv/(PHI_BOLT*Fnv)))
      :Math.min(Fnt,Fnt*(1.3-OMEGA_BOLT*fv/Fnv));
    }
    if(ft>=0.3*Fnt){
     FnvPrime=method==="LRFD"
      ?Math.min(Fnv,Fnv*(1.3-ft/(PHI_BOLT*Fnt)))
      :Math.min(Fnv,Fnv*(1.3-OMEGA_BOLT*ft/Fnt));
    }
    const intT=phi*Math.max(0,FntPrime)*Ab*reduction/1000;
    const intV=phi*Math.max(0,FnvPrime)*Ab*planes*reduction/1000;
    const tc=demandCheck(c.id+":"+bolt.id,"bolt-tension",T,intT,method,"10-2-9-3-4");
    const vc=demandCheck(c.id+":"+bolt.id,"bolt-shear",V,intV,method,"10-2-9-3-4");
    boltChecks.push({caseId:c.id,boltId:bolt.id,AbMm2:Ab,FntMPa:Fnt,FnvMPa:Fnv,FntPrimeMPa:FntPrime,FnvPrimeMPa:FnvPrime,gripReduction:reduction,
     interactionApplied:FntPrime<Fnt||FnvPrime<Fnv,tension:tc,shear:vc,status:tc.status==="FAIL"||vc.status==="FAIL"?"FAIL":"PASS"});
   }
   for(const b of c.bearingChecks){
    const bolt=boltById.get(String(b.boltId)),plate=plateById.get(String(b.plateId));
    const factorSlot=bolt.holeType==="long-slotted"&&b.forceDirectionToSlot==="transverse"?2.0:2.4;
    const factorTear=bolt.holeType==="long-slotted"&&b.forceDirectionToSlot==="transverse"?1.0:1.2;
    const RnBearing=factorSlot*bolt.diameterMm*plate.thicknessMm*plate.material.FuMPa;
    const RnTear=factorTear*b.LcMm*plate.thicknessMm*plate.material.FuMPa;
    const phi=factor(method,PHI_BOLT,OMEGA_BOLT);
    const bearing=demandCheck(c.id+":"+b.boltId+":"+b.plateId,"hole-bearing",b.shearKN,phi*RnBearing/1000,method,"10-2-9-3-7");
    const tear=demandCheck(c.id+":"+b.boltId+":"+b.plateId,"hole-tearout",b.shearKN,phi*RnTear/1000,method,"10-2-9-3-8");
    bearingChecks.push({caseId:c.id,boltId:b.boltId,plateId:b.plateId,LcMm:b.LcMm,bearing,tear,status:bearing.status==="FAIL"||tear.status==="FAIL"?"FAIL":"PASS"});
   }
   for(const p of c.plateSectionChecks){
    const plate=plateById.get(String(p.plateId)),m=plate.material;
    const ty=factor(method,PHI_TY,OMEGA_TY),tr=factor(method,PHI_RUPTURE,OMEGA_RUPTURE);
    const sy=factor(method,PHI_SY,OMEGA_SY),sr=factor(method,PHI_RUPTURE,OMEGA_RUPTURE);
    const checks=[
     demandCheck(c.id+":"+p.plateId,"plate-tensile-yield",p.tensionKN,ty*m.FyMPa*p.AgTensionMm2/1000,method,"10-2-9-4-1 / (17-9-2-10)"),
     demandCheck(c.id+":"+p.plateId,"plate-tensile-rupture",p.tensionKN,tr*m.FuMPa*p.AeTensionMm2/1000,method,"10-2-9-4-1 / (18-9-2-10)"),
     demandCheck(c.id+":"+p.plateId,"plate-shear-yield",p.shearKN,sy*0.6*m.FyMPa*p.AgvMm2/1000,method,"10-2-9-4-2 / (19-9-2-10)"),
     demandCheck(c.id+":"+p.plateId,"plate-shear-rupture",p.shearKN,sr*0.6*m.FuMPa*p.AnvMm2/1000,method,"10-2-9-4-2 / (20-9-2-10)")
    ];
    plateChecks.push({caseId:c.id,plateId:p.plateId,checks,status:checks.some(x=>x.status==="FAIL")?"FAIL":"PASS",areaReference:p.areaReference});
   }
   for(const p of c.blockShearChecks){
    const plate=plateById.get(String(p.plateId)),m=plate.material;
    const Rn=Math.min(0.6*m.FyMPa*p.AgvMm2,0.6*m.FuMPa*p.AnvMm2)+p.Ubs*m.FuMPa*p.AntMm2;
    const resistance=factor(method,PHI_RUPTURE,OMEGA_RUPTURE)*Rn/1000;
    const check=demandCheck(c.id+":"+p.plateId,"plate-block-shear",p.demandKN,resistance,method,"10-2-9-4-3 / (21-9-2-10)");
    blockShearChecks.push({caseId:c.id,plateId:p.plateId,check,pathReference:p.pathReference,Ubs:p.Ubs,ubsBasis:p.ubsBasis});
   }
  }
  const every=[...boltChecks,...bearingChecks,...plateChecks.flatMap(p=>p.checks),...blockShearChecks.map(p=>p.check)];
  const hasFail=every.some(x=>x.status==="FAIL");
  return{schema:SCHEMA,codeEdition:"مبحث دهم مقررات ملی ساختمان، ویرایش پنجم ۱۴۰۱",
   method,connectionType:design.connectionType,connectionId:detail.connectionId,drawingReference:design.drawingReference,
   boltChecks,bearingChecks,plateChecks,blockShearChecks,
   summary:{checks:every.length,passed:every.filter(x=>x.status==="PASS").length,failed:every.filter(x=>x.status==="FAIL").length,
    maximumUtilization:Math.max(...every.map(x=>x.utilization||0))},
   overallStatus:hasFail?"FAIL":"INCOMPLETE",
   capacityChecksCalculated:true,capacityDesigned:false,connectionApproved:false,executionReady:false,
   notEvaluated:[
    "توزیع نیرو در پیچ‌ها از مدل سه‌بعدی به‌طور خودکار محاسبه نشده؛ بسته نیروهای هر پیچ باید با روش مستند و تأیید مهندس وارد شود.",
    "اثر اهرمی فقط به‌صورت نیروی افزوده ورودی پذیرفته می‌شود؛ سختی ورق انتهایی، prying و اندرکنش تماس/پیچ حل نشده است.",
    "ظرفیت گروه جوش، تنش برداری جوش و شکست فلز پایه/فلز جوش هنوز محاسبه نشده است.",
    "خمش ورق، تسلیم موضعی، کمانش/پایداری اجزای اتصال، ظرفیت اعضای ستون و رفتر در محل اتصال و اثر خروج از مرکزیت‌های واقعی کامل نیست.",
    "اتصالات لغزش بحرانی/پیش‌تنیده، لغزش، خستگی، الزامات لرزه‌ای و طراحی ظرفیت‌محور در این ماژول محاسبه نمی‌شوند.",
    "قبولی این کنترل‌های جزئی به معنی قبولی کل اتصال یا آمادگی ساخت و اجرا نیست."
   ]};
 }
 const api={SCHEMA,validate,calculate};
 root.SahroudKneeConnectionCapacity=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
