/* SAHROUD STEEL — clause-based fillet-weld detail checks.
 * Geometry/detail compliance only; this module does not calculate weld resistance.
 * Basis: Iranian National Building Regulations, Part 10 (1401), 10-2-9-2-2.
 */
(function(root){
 "use strict";
 const finite=v=>typeof v==="number"&&Number.isFinite(v);
 const positive=v=>finite(v)&&v>0;
 const length=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 function fail(message){throw new Error(message);}
 function minLeg(t){
  if(t<=6)return 3;
  if(t<=12)return 5;
  if(t<=20)return 6;
  return 8;
 }
 function assess(detail){
  const api=root.SahroudKneeConnectionDetail;
  if(!api)fail("ماژول اعتبارسنجی جزئیات زانویی بارگذاری نشده است.");
  const validation=api.validate(detail);
  if(!validation.valid)return{success:false,overallStatus:"INCOMPLETE",errors:validation.errors,
   checks:[],effectiveWelds:[],lineDemandGeometryComplete:false,capacityDesigned:false,executionReady:false};
  const plates=new Map(detail.plates.map(p=>[String(p.id),p]));
  const checks=[],effectiveWelds=[];
  let lineDemandGeometryComplete=true;
  const intermittentGroups=new Map();
  const add=(w,id,status,detailText,values={})=>checks.push({weldId:String(w.id),checkId:id,status,detail:detailText,...values});
  for(const w of detail.welds){
   const plate=plates.get(String(w.plateId));
   const L=length(w.startMm,w.endMm),a=w.legSizeMm;
   if(w.type!=="fillet"){
    add(w,"fillet-detail","NOT_ASSESSABLE","این موتور فقط جزئیات جوش گوشه را پوشش می‌دهد؛ جوش شیاری نیازمند کنترل مستقل است.");
    effectiveWelds.push({...w,effectiveStartMm:w.startMm.slice(),effectiveEndMm:w.endMm.slice(),effectiveLengthMm:L,effectiveLengthFactor:1});
    continue;
   }
   if(!positive(w.connectedPartThicknessMm)){
    add(w,"minimum-leg","NOT_ASSESSABLE","ضخامت قطعه متصل‌شونده به ورق میزبان ثبت نشده است؛ حداقل بعد بر اساس قطعه نازک‌تر قابل تعیین نیست.");
   }else{
    const thinner=Math.min(plate.thicknessMm,w.connectedPartThicknessMm);
    if(w.highCycleDynamic!==true&&w.highCycleDynamic!==false){
     add(w,"minimum-leg","NOT_ASSESSABLE","وضعیت بارگذاری دینامیکی با تکرار زیاد باید صریحاً تعیین شود.");
    }else{
     const required=Math.max(minLeg(thinner),w.highCycleDynamic?5:0);
     const status=a+1e-9>=required?"PASS":"FAIL";
     add(w,"minimum-leg",status,"حداقل بعد بر اساس ضخامت قطعه نازک‌تر و شرط بارگذاری پرتکرار کنترل شد.",
      {thinnerPartThicknessMm:thinner,requiredLegMm:required,providedLegMm:a,
       highCycleDynamic:w.highCycleDynamic,reference:"مبحث دهم ۱۴۰۱، بند 10-2-9-2-2(ب)(1)"});
    }
   }
   if(w.edgeWeld!==true&&w.edgeWeld!==false){
    add(w,"maximum-edge-leg","NOT_ASSESSABLE","مشخص نیست جوش در لبه قطعه اجرا می‌شود یا روی سطح؛ شرط حداکثر بعد قابل ارزیابی نیست.");
   }else if(w.edgeWeld===false){
    add(w,"maximum-edge-leg","NOT_APPLICABLE","جوش به‌عنوان جوش لبه‌ای طبقه‌بندی نشده است.");
   }else if(!["host","connected"].includes(w.edgePart)){
    add(w,"maximum-edge-leg","NOT_ASSESSABLE","قطعه‌ای که جوش روی لبه آن اجرا می‌شود باید host یا connected مشخص شود.");
   }else{
    const edgeThickness=w.edgePart==="host"?plate.thicknessMm:w.connectedPartThicknessMm;
    if(!positive(edgeThickness)){
     add(w,"maximum-edge-leg","NOT_ASSESSABLE","ضخامت قطعه لبه‌ای ثبت نشده است.");
    }else if(Math.abs(edgeThickness-6)<=1e-9){
     add(w,"maximum-edge-leg","NOT_ASSESSABLE","متن بند برای ضخامت دقیقاً ۶ میلی‌متر حد بالای صریحی بین دو حالت کمتر/بیشتر از ۶ تعیین نمی‌کند؛ بررسی دستی لازم است.");
    }else{
     const maxLeg=edgeThickness<6?edgeThickness:edgeThickness-2;
     add(w,"maximum-edge-leg",a<=maxLeg+1e-9?"PASS":"FAIL",
      "حداکثر بعد جوش لبه‌ای با ضخامت قطعه لبه‌ای کنترل شد.",
      {edgePart:w.edgePart,edgeThicknessMm:edgeThickness,maximumLegMm:maxLeg,providedLegMm:a,
       reference:"مبحث دهم ۱۴۰۱، بند 10-2-9-2-2(ب)(2)"});
    }
   }
   if(w.continuity!=="continuous"&&w.continuity!=="intermittent"){
    add(w,"minimum-effective-length","NOT_ASSESSABLE","پیوسته یا منقطع بودن قطعه جوش باید مشخص شود.");
   }else{
    const requiredLength=w.continuity==="intermittent"?Math.max(4*a,40):4*a;
    add(w,"minimum-effective-length",L+1e-9>=requiredLength?"PASS":"FAIL",
     "حداقل طول مؤثر قطعه جوش با توجه به پیوسته/منقطع بودن کنترل شد.",
     {providedLengthMm:L,requiredLengthMm:requiredLength,continuity:w.continuity,
      reference:"مبحث دهم ۱۴۰۱، بند 10-2-9-2-2(ب)"});
    if(w.continuity==="intermittent"){
     const allowedUses=["web-to-flange-built-up-girder","flange-cover-plate","web-stiffener","built-up-member-component"];
     if(!allowedUses.includes(w.intermittentUseCase)){
      add(w,"intermittent-use","NOT_ASSESSABLE","کاربرد جوش منقطع باید صریحاً از کاربردهای مجاز بند آیین‌نامه انتخاب و مستند شود؛ این کنترل به‌تنهایی مجاز بودن سایر کاربردها را تأیید نمی‌کند.");
     }else{
      add(w,"intermittent-use","PASS","کاربرد اعلام‌شده در فهرست کاربردهای مجاز جوش منقطع قرار دارد؛ انطباق جزئیات و الزامات تکمیلی همچنان لازم است.",
       {intermittentUseCase:w.intermittentUseCase,reference:"مبحث دهم ۱۴۰۱، بند 10-2-9-2-2(ب)"});
     }
     const groupId=typeof w.intermittentGroupId==="string"?w.intermittentGroupId.trim():"";
     if(!groupId){
      add(w,"intermittent-spacing","NOT_ASSESSABLE","شناسه گروه خط جوش منقطع برای کنترل فاصله آزاد قطعات لازم است.");
     }else{
      if(!intermittentGroups.has(groupId))intermittentGroups.set(groupId,[]);
      intermittentGroups.get(groupId).push(w);
     }
    }
   }
   let beta=1,known=true;
   if(L/a>100){
    if(typeof w.axialEndConnection!=="boolean"||typeof w.longitudinallyLoaded!=="boolean"){
     known=false;lineDemandGeometryComplete=false;
     add(w,"long-weld-reduction","NOT_ASSESSABLE","برای نسبت طول به بعد بیش از ۱۰۰، نوع اتصال انتهایی محوری و بارگذاری طولی باید صریحاً مشخص شود؛ کاهش طول مؤثر نامعلوم است.",
      {lengthToLegRatio:L/a,reference:"مبحث دهم ۱۴۰۱، بند 10-2-9-2-2(ب)"});
    }else if(w.axialEndConnection&&w.longitudinallyLoaded){
     beta=Math.max(0.6,Math.min(1,1.2-0.002*(L/a)));
     add(w,"long-weld-reduction","PASS","کاهش طول مؤثر جوش طولی در اتصال انتهایی عضو محوری اعمال شد.",
      {lengthToLegRatio:L/a,beta,effectiveLengthMm:beta*L,
       reference:"مبحث دهم ۱۴۰۱، رابطه کاهش طول مؤثر در بند 10-2-9-2-2(ب)"});
    }else{
     add(w,"long-weld-reduction","NOT_APPLICABLE","شرط هم‌زمان اتصال انتهایی محوری و بارگذاری طولی برقرار نیست.",
      {lengthToLegRatio:L/a});
    }
   }else{
    add(w,"long-weld-reduction","NOT_APPLICABLE","نسبت طول به بعد جوش از ۱۰۰ تجاوز نمی‌کند.",{lengthToLegRatio:L/a});
   }
   const midpoint=w.startMm.map((x,i)=>(x+w.endMm[i])/2),direction=w.endMm.map((x,i)=>(x-w.startMm[i])/L);
   const effectiveLength=known?beta*L:L;
   const half=effectiveLength/2;
   const start=midpoint.map((x,i)=>x-direction[i]*half),end=midpoint.map((x,i)=>x+direction[i]*half);
   effectiveWelds.push({...w,effectiveStartMm:start,effectiveEndMm:end,effectiveLengthMm:effectiveLength,effectiveLengthFactor:beta,
    effectiveLengthKnown:known});
  }

  // The free spacing rule applies to successive beads on one collinear weld line.
  // Group identity, corrosion condition and line geometry must be explicit; no
  // automatic grouping across different faces or rows is attempted.
  for(const [groupId,beads] of intermittentGroups){
   const first=beads[0],plate=plates.get(String(first.plateId));
   const conditionSet=new Set(beads.map(w=>w.corrosionCondition));
   const plateSet=new Set(beads.map(w=>String(w.plateId)));
   const faceSet=new Set(beads.map(w=>String(w.faceReference)));
   const thicknesses=beads.map(w=>{
    const p=plates.get(String(w.plateId));
    return Math.min(p?.thicknessMm||Infinity,w.connectedPartThicknessMm||Infinity);
   });
   const tmin=Math.min(...thicknesses);
   const addGroup=(status,detailText,values={})=>checks.push({weldId:"group:"+groupId,checkId:"intermittent-spacing",status,detail:detailText,...values});
   if(beads.length<2){
    addGroup("NOT_ASSESSABLE","برای کنترل فاصله آزاد، حداقل دو قطعه جوش منقطع در یک گروه لازم است.",{groupId,beadCount:beads.length});
    continue;
   }
   if(conditionSet.size!==1||!["protected","painted","unpainted-noncorrosive","weather-exposed-unpainted"].includes(first.corrosionCondition)){
    addGroup("NOT_ASSESSABLE","وضعیت حفاظت/خوردگی باید برای تمام قطعات گروه یکسان و صریح باشد.",{groupId,corrosionConditions:[...conditionSet]});
    continue;
   }
   if(plateSet.size!==1||faceSet.size!==1||!positive(tmin)){
    addGroup("NOT_ASSESSABLE","قطعات یک گروه باید روی یک ورق و یک وجه باشند و ضخامت نازک‌ترین قطعه مشخص باشد.",{groupId});
    continue;
   }
   const p0=first.startMm,p1=first.endMm,axis=p1.map((v,i)=>v-p0[i]);
   const axisLength=Math.hypot(...axis),unit=axis.map(v=>v/axisLength);
   const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
   const intervals=[];let collinear=true;
   for(const bead of beads){
    const d=bead.endMm.map((v,i)=>v-bead.startMm[i]),dl=Math.hypot(...d);
    const parallel=Math.hypot(...cross(d.map(v=>v/dl),unit))<=1e-6;
    const distance=point=>Math.hypot(...cross(point.map((v,i)=>v-p0[i]),unit));
    if(!parallel||distance(bead.startMm)>0.1||distance(bead.endMm)>0.1){collinear=false;break;}
    const s=bead.startMm.map((v,i)=>v-p0[i]).reduce((sum,v,i)=>sum+v*unit[i],0);
    const e=bead.endMm.map((v,i)=>v-p0[i]).reduce((sum,v,i)=>sum+v*unit[i],0);
    intervals.push([Math.min(s,e),Math.max(s,e)]);
   }
   if(!collinear){
    addGroup("NOT_ASSESSABLE","قطعات گروه روی یک خط مستقیم هم‌محور نیستند؛ برای هر ردیف/خط جوش گروه جداگانه تعریف کنید.",{groupId});
    continue;
   }
   intervals.sort((a,b)=>a[0]-b[0]);
   const gaps=[];
   for(let i=1;i<intervals.length;i++)gaps.push(intervals[i][0]-intervals[i-1][1]);
   if(gaps.some(g=>g< -0.1)){
    addGroup("NOT_ASSESSABLE","قطعات جوش گروه هم‌پوشانی دارند؛ هندسه گروه برای کنترل فاصله آزاد مبهم است.",{groupId,gapsMm:gaps});
    continue;
   }
   const useCases=new Set(beads.map(w=>w.intermittentUseCase));
   if(useCases.size!==1||!["web-to-flange-built-up-girder","flange-cover-plate","web-stiffener","built-up-member-component"].includes(first.intermittentUseCase)){
    addGroup("NOT_ASSESSABLE","کاربرد جوش منقطع در تمام قطعات گروه باید یکسان و از موارد مجاز آیین‌نامه باشد.",{groupId,intermittentUseCases:[...useCases]});
    continue;
   }
   const maximum=first.corrosionCondition==="weather-exposed-unpainted"
    ?Math.min(14*tmin,180):Math.min(24*tmin,300);
   const worst=Math.max(...gaps);
   addGroup(worst<=maximum+1e-9?"PASS":"FAIL",
    "فاصله آزاد بین قطعات متوالی جوش منقطع با توجه به ضخامت نازک‌ترین ورق و وضعیت خوردگی کنترل شد.",
    {groupId,beadCount:beads.length,minimumPlateThicknessMm:tmin,corrosionCondition:first.corrosionCondition,
     gapsMm:gaps,maximumFreeSpacingMm:maximum,maximumProvidedGapMm:worst,
     reference:"مبحث دهم ۱۴۰۱، بند 10-2-9-2-2(ب)، محدودیت جوش‌های منقطع"});
  }
  const statuses=checks.map(c=>c.status);
  const overallStatus=statuses.includes("FAIL")?"FAIL":statuses.includes("NOT_ASSESSABLE")?"INCOMPLETE":"PASS";
  return{success:true,schema:"SAHROUD-FILLET-WELD-DETAIL-CHECK-1.0",
   codeBasis:{document:"مبحث دهم مقررات ملی ساختمان، ویرایش ۱۴۰۱",clause:"10-2-9-2-2",
    sourceVerification:"متن بند از بازنشر برخط استخراج شده و فایل رسمی ناشر مستقلاً تطبیق نشده است؛ پیش از تأیید نهایی باید با نسخه رسمی کنترل شود.",
    note:"کنترل‌های این ماژول محدود به جزئیات هندسی جوش گوشه هستند؛ مقاومت موجود جوش طبق 10-2-9-2-4 جداگانه لازم است."},
   overallStatus,checks,effectiveWelds,lineDemandGeometryComplete,
   capacityDesigned:false,executionReady:false,
   limitations:["این گزارش ظرفیت فلز جوش و فلز پایه را محاسبه نمی‌کند.",
    "کنترل‌های خستگی، کیفیت ساخت، اندازه جوش واقعی، دسترسی جوشکاری و بازرسی در این ماژول پوشش داده نمی‌شوند.",
    "برای جوش‌های شیاری و اتصالات مرکب، این کنترل‌ها قابل تعمیم نیستند."]};
 }
 root.SahroudKneeWeldDetailCheck={assess,minLeg};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudKneeWeldDetailCheck;
})(typeof window!=="undefined"?window:globalThis);
