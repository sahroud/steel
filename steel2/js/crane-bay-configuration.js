/* SAHROUD STEEL — explicit crane-to-bay allocation and per-crane data readiness.
 * Partial/multiple runway FEM remains blocked until independent systems and interaction are solved.
 */
(function(root){
"use strict";
const $=id=>root.document?.getElementById(id);
const profileFields=["ratedCapacity_t","bridgeMass_t","trolleyMass_t","wheelsPerSide","wheelSpacing_m","maxWheelLoad_t","minWheelLoad_t","verticalImpact","wheelLoadSource","wheelLoadDocument"];
function audit(raw,bayCount){
 const issues=[],warnings=[],count=Number(bayCount);
 if(!Number.isInteger(count)||count<1)return{valid:false,solverCompatible:false,status:"invalid_geometry",issues:["تعداد دهانه‌های سوله برای ممیزی جانمایی جرثقیل معتبر نیست."],cranes:[],bayCount:null};
 let cranes=[];
 if(raw==null||String(raw).trim()===""){
  cranes=[{id:"CR-LEGACY-1",runwaySystemId:"RUNWAY-LEGACY",bays:Array.from({length:count},(_,i)=>i+1),legacy:true}];
  warnings.push("جانمایی جرثقیل جداگانه تعریف نشده است؛ رفتار قدیمی یعنی یک جرثقیل با مسیر سراسری تمام دهانه‌ها فرض می‌شود.");
 }else{
  let parsed;try{parsed=typeof raw==="string"?JSON.parse(raw):raw;}catch(e){return{valid:false,solverCompatible:false,status:"invalid_json",issues:["JSON جانمایی جرثقیل قابل خواندن نیست: "+e.message],cranes:[],bayCount:count};}
  if(!Array.isArray(parsed)||!parsed.length)return{valid:false,solverCompatible:false,status:"invalid_schema",issues:["جانمایی باید آرایه‌ای غیرخالی از جرثقیل‌ها باشد."],cranes:[],bayCount:count};
  cranes=parsed.map((c,i)=>({...c,id:String(c?.id??"").trim(),runwaySystemId:String(c?.runwaySystemId??"").trim(),bays:Array.isArray(c?.bays)?c.bays.slice():[],source:c?.source||null}));
 }
 const ids=new Set(),occupancy=new Map();
 cranes.forEach((c,i)=>{
  if(!c.id)issues.push("شناسه جرثقیل شماره "+(i+1)+" خالی است.");
  else if(ids.has(c.id))issues.push("شناسه جرثقیل تکراری است: "+c.id);
  ids.add(c.id);
  if(!Array.isArray(c.bays)||!c.bays.length)issues.push("برای جرثقیل "+(c.id||i+1)+" هیچ دهانه‌ای انتخاب نشده است.");
  if(!c.legacy&&!c.runwaySystemId)warnings.push("شناسه سامانه ریل برای "+(c.id||"جرثقیل شماره "+(i+1))+" ثبت نشده؛ تعیین استقلال یا اشتراک مسیر ریل ممکن نیست.");
  const seen=new Set();
  c.bays.forEach(b=>{
   if(!Number.isInteger(b)||b<1||b>count){issues.push("شماره دهانه "+b+" برای جرثقیل "+(c.id||i+1)+" خارج از بازه ۱ تا "+count+" است.");return;}
   if(seen.has(b))issues.push("دهانه "+b+" در جانمایی جرثقیل "+c.id+" تکرار شده است.");
   seen.add(b);
   const prior=occupancy.get(b)||[];
   prior.forEach(p=>{
    if(!c.runwaySystemId||!p.runwaySystemId||c.runwaySystemId!==p.runwaySystemId)issues.push("دهانه "+b+" به دو سامانه ریل متفاوت ("+p.id+" و "+c.id+") تخصیص یافته؛ هندسه چند سامانه ریل در یک دهانه مدل نشده است.");
    else warnings.push("جرثقیل‌های "+p.id+" و "+c.id+" در دهانه "+b+" روی سامانه ریل مشترک تعریف شده‌اند؛ فاصله ایمن، برخورد و هم‌زمانی حرکت هنوز تحلیل نمی‌شود.");
   });
   occupancy.set(b,[...prior,{id:c.id,runwaySystemId:c.runwaySystemId}]);
  });
  c.bays=[...seen].sort((a,b)=>a-b);
  c.profileMissing=profileFields.filter(k=>c[k]===undefined||c[k]===null||String(c[k]).trim()==="");
  c.profileReady=c.profileMissing.length===0;
  if(!c.profileReady)warnings.push("اطلاعات اختصاصی جرثقیل "+(c.id||i+1)+" ناقص است؛ موارد ثبت‌نشده: "+c.profileMissing.join("، "));
  ["ratedCapacity_t","bridgeMass_t","trolleyMass_t","wheelsPerSide","wheelSpacing_m","maxWheelLoad_t","minWheelLoad_t","verticalImpact"].forEach(k=>{
   if(c[k]!==undefined&&c[k]!==null&&String(c[k]).trim()!==""&&(!Number.isFinite(Number(c[k]))||Number(c[k])<0))issues.push("پارامتر "+k+" برای جرثقیل "+c.id+" باید عددی و نامنفی باشد.");
  });
  ["ratedCapacity_t","wheelsPerSide","wheelSpacing_m","verticalImpact"].forEach(k=>{if(c[k]!==undefined&&c[k]!==null&&String(c[k]).trim()!==""&&Number(c[k])<=0)issues.push("پارامتر "+k+" برای جرثقیل "+c.id+" باید بزرگ‌تر از صفر باشد.");});
  if(c.wheelsPerSide!==undefined&&c.wheelsPerSide!==null&&String(c.wheelsPerSide).trim()!==""&&!Number.isInteger(Number(c.wheelsPerSide)))issues.push("تعداد چرخ هر سمت برای "+c.id+" باید عدد صحیح باشد.");
  if(Number.isFinite(Number(c.minWheelLoad_t))&&Number.isFinite(Number(c.maxWheelLoad_t))&&Number(c.maxWheelLoad_t)<Number(c.minWheelLoad_t))issues.push("بار بیشینه چرخ جرثقیل "+c.id+" از بار کمینه کمتر است.");
 });
 const valid=issues.length===0,all=Array.from({length:count},(_,i)=>i+1);
 const full=valid&&cranes.length===1&&cranes[0].bays.length===count&&cranes[0].bays.every((b,i)=>b===all[i]);
 const solverCompatible=valid&&full;
 if(valid&&!solverCompatible)warnings.push(cranes.length>1?"چند جرثقیل ثبت شده‌اند؛ حل‌گر فعلی فقط یک قطار چرخ و یک سامانه ریل سراسری را پشتیبانی می‌کند.":"جانمایی جرثقیل فقط بخشی از دهانه‌ها را پوشش می‌دهد؛ قطعه‌بندی مسیر ریل و محدودیت حرکت هنوز به FEM متصل نشده است.");
 const active=[...occupancy.keys()].sort((a,b)=>a-b);
 return{valid,solverCompatible,status:!valid?"invalid":solverCompatible?"single_crane_full_run":"configuration_recorded_solver_blocked",bayCount:count,cranes,activeBays:active,unassignedBays:all.filter(b=>!occupancy.has(b)),profileReady:cranes.every(c=>c.profileReady),profileMissingByCrane:cranes.filter(c=>!c.profileReady).map(c=>({id:c.id,missing:c.profileMissing})),sharedRunwayBays:active.filter(b=>(occupancy.get(b)||[]).length>1),warnings:[...new Set(warnings)],issues,analysisEnabled:false,designApproved:false};
}
function readAndAudit(bayCount){return audit($("craneBayConfigurationJson")?.value??"",bayCount);}
function render(){
 const out=$("craneBayConfigurationAudit");if(!out)return;
 const g=root.SteelStructuralModel?.model?.geometry,count=Number(g?.bayCount)||((Number(g?.length)>0&&Number(g?.spacing)>0)?Math.ceil(Number(g.length)/Number(g.spacing)):0),r=readAndAudit(count);
 out.textContent=(r.valid?"جانمایی معتبر؛ ":"جانمایی نامعتبر؛ ")+(r.solverCompatible?"با FEM فعلی سازگار است.":"تحلیل خودکار تا تکمیل FEM مستقل مسدود است.")+" دهانه‌های فعال: "+(r.activeBays||[]).join("، ")+"؛ دهانه‌های بدون جرثقیل: "+(r.unassignedBays||[]).join("، ")+"؛ "+[...(r.issues||[]),...(r.warnings||[])].join(" | ");
}
function init(){const el=$("craneBayConfigurationJson");if(el){el.addEventListener("input",render);el.addEventListener("change",render);}$("craneBayConfigurationAuditButton")?.addEventListener("click",render);}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 t("legacy empty configuration preserves one full-length crane",()=>{const r=audit("",4);return r.valid&&r.solverCompatible&&r.cranes[0].bays.length===4;});
 t("single crane explicitly assigned to all bays is FEM compatible",()=>audit([{id:"C1",bays:[1,2,3]}],3).solverCompatible);
 t("partial bay assignment is recorded but blocked from current FEM",()=>{const r=audit([{id:"C1",bays:[1,2]}],4);return r.valid&&!r.solverCompatible&&r.unassignedBays.join(",")==="3,4";});
 t("multiple separate cranes are recorded but blocked from current FEM",()=>{const r=audit([{id:"C1",bays:[1,2]},{id:"C2",bays:[4]}],4);return r.valid&&!r.solverCompatible&&r.cranes.length===2;});
 t("duplicate bay allocation on different runway systems is rejected",()=>!audit([{id:"C1",runwaySystemId:"R1",bays:[1]},{id:"C2",runwaySystemId:"R2",bays:[1]}],2).valid);
 t("shared runway occupancy is recorded but collision analysis remains warned",()=>{const r=audit([{id:"C1",runwaySystemId:"R1",bays:[1]},{id:"C2",runwaySystemId:"R1",bays:[1]}],2);return r.valid&&r.sharedRunwayBays[0]===1&&r.warnings.some(x=>x.includes("برخورد"));});
 t("duplicate crane identifiers are rejected",()=>!audit([{id:"C1",bays:[1]},{id:"C1",bays:[2]}],2).valid);
 t("out-of-range bay number is rejected",()=>!audit([{id:"C1",bays:[0,3]}],2).valid);
 t("empty bay list is rejected",()=>!audit([{id:"C1",bays:[]}],2).valid);
 t("malformed JSON is rejected",()=>!audit("[{bad",2).valid);
 t("per-crane wheel data completeness is reported",()=>{const r=audit([{id:"C1",bays:[1],ratedCapacity_t:10}],2);return !r.profileReady&&r.profileMissingByCrane[0].missing.includes("maxWheelLoad_t");});
 t("invalid per-crane wheel data is rejected",()=>!audit([{id:"C1",bays:[1],ratedCapacity_t:-5}],2).valid);
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init);else init();}
root.SteelCraneBayConfiguration={audit,readAndAudit,render,selfTest};
})(typeof window!=="undefined"?window:globalThis);
