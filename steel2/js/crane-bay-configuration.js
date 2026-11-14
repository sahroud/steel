/* SAHROUD STEEL — explicit crane-to-bay allocation.
 * Current FEM transfer supports one crane using the complete runway only.
 * Partial runs and multiple crane profiles are recorded/audited but blocked
 * from automatic FEM until independent train/runway models are implemented.
 */
(function(root){
"use strict";
const $=id=>root.document?.getElementById(id);
function audit(raw,bayCount){
 const issues=[],warnings=[];
 const count=Number(bayCount);
 if(!Number.isInteger(count)||count<1)return {valid:false,solverCompatible:false,status:"invalid_geometry",issues:["تعداد دهانه‌های سوله برای ممیزی جانمایی جرثقیل معتبر نیست."],cranes:[],bayCount:null};
 let cranes=[];
 if(raw==null||String(raw).trim()===""){
  cranes=[{id:"CR-LEGACY-1",bays:Array.from({length:count},(_,i)=>i+1),legacy:true}];
  warnings.push("جانمایی جرثقیل جداگانه تعریف نشده است؛ رفتار قدیمی یعنی یک جرثقیل با مسیر سراسری تمام دهانه‌ها فرض می‌شود.");
 }else{
  let parsed;
  try{parsed=typeof raw==="string"?JSON.parse(raw):raw;}catch(e){return {valid:false,solverCompatible:false,status:"invalid_json",issues:["JSON جانمایی جرثقیل قابل خواندن نیست: "+e.message],cranes:[],bayCount:count};}
  if(!Array.isArray(parsed)||!parsed.length)return {valid:false,solverCompatible:false,status:"invalid_schema",issues:["جانمایی باید آرایه‌ای غیرخالی از جرثقیل‌ها باشد."],cranes:[],bayCount:count};
  cranes=parsed.map((c,i)=>({id:String(c?.id??"").trim(),bays:Array.isArray(c?.bays)?c.bays.slice():[],source:c?.source||null}));
 }
 const ids=new Set(),occupied=new Map();
 cranes.forEach((c,i)=>{
  if(!c.id)issues.push("شناسه جرثقیل شماره "+(i+1)+" خالی است.");
  else if(ids.has(c.id))issues.push("شناسه جرثقیل تکراری است: "+c.id);
  ids.add(c.id);
  if(!Array.isArray(c.bays)||!c.bays.length)issues.push("برای جرثقیل "+(c.id||i+1)+" هیچ دهانه‌ای انتخاب نشده است.");
  const seen=new Set();
  c.bays.forEach(b=>{
   if(!Number.isInteger(b)||b<1||b>count){issues.push("شماره دهانه "+b+" برای جرثقیل "+(c.id||i+1)+" خارج از بازه ۱ تا "+count+" است.");return;}
   if(seen.has(b))issues.push("دهانه "+b+" در جانمایی جرثقیل "+c.id+" تکرار شده است.");
   seen.add(b);
   if(occupied.has(b)&&occupied.get(b)!==c.id)issues.push("دهانه "+b+" هم‌زمان به دو جرثقیل مستقل ("+occupied.get(b)+" و "+c.id+") تخصیص یافته؛ مدل هم‌پوشانی/اشتراک ریل هنوز تعریف نشده است.");
   else occupied.set(b,c.id);
  });
  c.bays=[...seen].sort((a,b)=>a-b);
 });
 const valid=issues.length===0;
 const allBays=Array.from({length:count},(_,i)=>i+1);
 const fullRun=valid&&cranes.length===1&&cranes[0].bays.length===count&&cranes[0].bays.every((b,i)=>b===allBays[i]);
 const solverCompatible=valid&&fullRun;
 if(valid&&!solverCompatible)warnings.push(cranes.length>1?"چند جرثقیل مستقل ثبت شده‌اند؛ FEM فعلی فقط یک مجموعه مشخصات و یک قطار چرخ را پشتیبانی می‌کند و تحلیل خودکار مسدود است.":"جانمایی جرثقیل فقط بخشی از دهانه‌ها را پوشش می‌دهد؛ محدودکردن حرکت قطار چرخ و قطعه‌بندی مستقل تیر حمال هنوز به FEM متصل نشده و تحلیل خودکار مسدود است.");
 return {valid,solverCompatible,status:!valid?"invalid":solverCompatible?"single_crane_full_run":"configuration_recorded_solver_blocked",bayCount:count,cranes,activeBays:[...occupied.keys()].sort((a,b)=>a-b),unassignedBays:allBays.filter(b=>!occupied.has(b)),warnings,issues,analysisEnabled:false,designApproved:false};
}
function readAndAudit(bayCount){
 const el=$("craneBayConfigurationJson");
 return audit(el?.value??"",bayCount);
}
function render(){
 const out=$("craneBayConfigurationAudit");
 if(!out)return;
 const g=root.SteelStructuralModel?.model?.geometry;
 const count=Number(g?.frames?.length||0)-1;
 const r=readAndAudit(count);
 out.textContent=(r.valid?"جانمایی معتبر؛ ":"جانمایی نامعتبر؛ ")+(r.solverCompatible?"با مسیر FEM فعلی سازگار است.":"تحلیل خودکار جرثقیل تا تکمیل پشتیبانی چنددهانه/چندجرثقیل مسدود است.")+" دهانه‌های فعال: "+(r.activeBays||[]).join("، ")+"؛ دهانه‌های بدون جرثقیل: "+(r.unassignedBays||[]).join("، ")+"؛ "+[...(r.issues||[]),...(r.warnings||[])].join(" | ");
}
function init(){
 const el=$("craneBayConfigurationJson");
 if(el){el.addEventListener("input",render);el.addEventListener("change",render);}
 const button=$("craneBayConfigurationAuditButton");if(button)button.addEventListener("click",render);
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 t("legacy empty configuration preserves one full-length crane",()=>{const r=audit("",4);return r.valid&&r.solverCompatible&&r.cranes[0].bays.length===4;});
 t("single crane explicitly assigned to all bays is FEM compatible",()=>audit([{id:"C1",bays:[1,2,3]}],3).solverCompatible);
 t("partial bay assignment is recorded but blocked from current FEM",()=>{const r=audit([{id:"C1",bays:[1,2]}],4);return r.valid&&!r.solverCompatible&&r.unassignedBays.join(",")==="3,4";});
 t("multiple separate cranes are recorded but blocked from current FEM",()=>{const r=audit([{id:"C1",bays:[1,2]},{id:"C2",bays:[4]}],4);return r.valid&&!r.solverCompatible&&r.cranes.length===2;});
 t("duplicate bay allocation between cranes is rejected",()=>!audit([{id:"C1",bays:[1,2]},{id:"C2",bays:[2,3]}],3).valid);
 t("duplicate crane identifiers are rejected",()=>!audit([{id:"C1",bays:[1]},{id:"C1",bays:[2]}],2).valid);
 t("out-of-range bay number is rejected",()=>!audit([{id:"C1",bays:[0,3]}],2).valid);
 t("empty bay list is rejected",()=>!audit([{id:"C1",bays:[]}],2).valid);
 t("malformed JSON is rejected",()=>!audit("[{bad",2).valid);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init);else init();}
root.SteelCraneBayConfiguration={audit,readAndAudit,render,selfTest};
})(typeof window!=="undefined"?window:globalThis);
