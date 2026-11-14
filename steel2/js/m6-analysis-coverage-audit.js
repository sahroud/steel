/* SAHROUD STEEL — M6:1398 solved-combination family coverage gate.
 * Tracks which Iranian M6 LRFD combination families actually reached the 3D
 * solver. It never invents load effects, expands missing cases, or approves design.
 */
(function(root){
"use strict";
const known=new Set(["M6-ULS-01","M6-ULS-02","M6-ULS-03","M6-ULS-04","M6-ULS-05","M6-ULS-06","M6-ULS-07","M6-ULS-08","M6-ULS-09"]);
const labels={
 "M6-ULS-01":"۱ ـ 1.4D",
 "M6-ULS-02":"۲ ـ 1.2D + 1.6L + 0.5(Lr/S/R)",
 "M6-ULS-03":"۳ ـ 1.2D + 1.6(Lr/S/R) + [L یا 0.7W]",
 "M6-ULS-04":"۴ ـ 1.2D + 1.4W + L + 0.5(Lr/S/R)",
 "M6-ULS-05":"۵ ـ 1.2D + E + L + 0.2S",
 "M6-ULS-06":"۶ ـ 0.9D + 1.4W",
 "M6-ULS-07":"۷ ـ 0.9D + E",
 "M6-ULS-08":"۸ ـ ترکیب دارای T (مشروط)",
 "M6-ULS-09":"۹ ـ ترکیب دارای T (مشروط)"
};
function audit(input){
 const p=input||{},cases=Array.isArray(p.analyzedCases)?p.analyzedCases:[],issues=[],ids=new Set(),counts={};
 cases.forEach((c,i)=>{
  const id=String(c?.id??"").trim(),family=String(c?.m6FamilyId??"").trim();
  if(!id)issues.push("شناسه حالت تحلیل شماره "+(i+1)+" خالی است.");
  else if(ids.has(id))issues.push("شناسه حالت تحلیل تکراری است: "+id);
  else ids.add(id);
  if(!known.has(family))issues.push("شناسه خانواده مبحث ششم برای حالت "+(id||i+1)+" معتبر/ثبت‌شده نیست.");
  else counts[family]=(counts[family]||0)+1;
  if(c?.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای حالت "+(id||i+1)+" تأیید نشده است.");
  if(!Array.isArray(c?.members)||!c.members.length)issues.push("نتایج اعضا برای حالت "+(id||i+1)+" موجود نیست.");
 });
 const required=["M6-ULS-01","M6-ULS-02","M6-ULS-03","M6-ULS-04","M6-ULS-05","M6-ULS-06","M6-ULS-07"];
 const conditional=p.temperatureApplicable===true?["M6-ULS-08","M6-ULS-09"]:[];
 const unresolvedTemperature=p.temperatureApplicable!==true&&p.temperatureApplicable!==false;
 const missing=required.filter(x=>!counts[x]);
 const missingConditional=conditional.filter(x=>!counts[x]);
 const variantCases=cases.filter(x=>x.m6FamilyId==="M6-ULS-03");
 const variantIds=new Set(variantCases.map(x=>x.m6VariantId).filter(Boolean));
 const missingVariants=["Lr","S"].filter(x=>!variantIds.has(x));
 if(p.temperatureApplicable!==true&&p.temperatureApplicable!==false)issues.push("قابل‌اعمال بودن اثر دما/خودکرنشی برای تعیین خانواده‌های ۸ و ۹ مشخص نشده است.");
 const rows=[...required,...(p.temperatureApplicable===true?conditional:[])].map(id=>({id,label:labels[id],solvedCases:counts[id]||0,covered:(counts[id]||0)>0,required:true}));
 const conditionalRows=["M6-ULS-08","M6-ULS-09"].map(id=>({id,label:labels[id],solvedCases:counts[id]||0,covered:(counts[id]||0)>0,required:p.temperatureApplicable===true,applicability:p.temperatureApplicable===true?"applicable":p.temperatureApplicable===false?"not-applicable":"unresolved"}));
 const familyCoverageComplete=missing.length===0&&missingConditional.length===0&&!unresolvedTemperature&&missingVariants.length===0;
 return {
  success:issues.length===0,
  familyCoverageComplete,
  status:familyCoverageComplete&&issues.length===0?"complete":"incomplete",
  analyzedCaseCount:cases.length,
  coveredFamilies:Object.keys(counts).sort(),
  missingRequiredFamilies:missing,
  missingConditionalFamilies:missingConditional,
  missingM6Combination3Variants:missingVariants,
  temperatureApplicability:p.temperatureApplicable===true?"applicable":p.temperatureApplicable===false?"not-applicable":"unresolved",
  familyRows:rows,
  conditionalFamilyRows:conditionalRows,
  familyCounts:counts,
  issues,
  analysisEnabled:false,
  designApproved:false,
  limitations:[
   "این ممیزی فقط ردیابی خانواده ترکیبات و حضور نتایج تحلیل/تعادل را کنترل می‌کند؛ صحت ضرایب و بارهای ورودی را اثبات نمی‌کند.",
   "حالات فاقد شناسه خانواده صریح، به خانواده‌ای حدس زده‌شده منتسب نمی‌شوند.",
   "خانواده‌های غایب باید پس از تعیین قابل‌اعمال بودن بارها و تولید اثرهای واقعی، به حل‌گر متصل شوند؛ این ماژول بار یا نتیجه تحلیل تولید نمی‌کند.",
   "تکمیل پوشش ترکیبات به معنی کنترل مقاومت، پایداری، تغییرمکان یا تأیید طراحی نیست."
  ]
 };
}
function selfTest(){
 const mk=(id,family,variant)=>({id,m6FamilyId:family,m6VariantId:variant,equilibrium:{ok:true},members:[{id:"M1",localEndForces:Array(12).fill(0)}]});
 const all=[
  mk("C1","M6-ULS-01"),
  mk("C2","M6-ULS-02"),
  mk("C3-LR","M6-ULS-03","Lr"),
  mk("C3-S","M6-ULS-03","S"),
  mk("C4","M6-ULS-04"),
  mk("C5","M6-ULS-05"),
  mk("C6","M6-ULS-06"),
  mk("C7","M6-ULS-07")
 ];
 const tests=[],check=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 check("all seven non-temperature families and both combination-3 branches are covered",()=>audit({analyzedCases:all,temperatureApplicable:false}).familyCoverageComplete);
 check("missing family is reported, not inferred",()=>audit({analyzedCases:all.filter(x=>x.m6FamilyId!=="M6-ULS-04"),temperatureApplicable:false}).missingRequiredFamilies.includes("M6-ULS-04"));
 check("temperature applicability unresolved blocks completeness",()=>!audit({analyzedCases:all}).familyCoverageComplete);
 check("temperature families required when applicable",()=>{const r=audit({analyzedCases:all,temperatureApplicable:true});return r.missingConditionalFamilies.length===2&&!r.familyCoverageComplete;});
 check("temperature families excluded only after explicit not-applicable declaration",()=>audit({analyzedCases:all,temperatureApplicable:false}).familyCoverageComplete);
 check("missing Lr or S variant of family 3 is reported",()=>audit({analyzedCases:all.filter(x=>x.m6VariantId!=="S"),temperatureApplicable:false}).missingM6Combination3Variants.includes("S"));
 check("duplicate solved case IDs rejected",()=>audit({analyzedCases:[...all,all[0]],temperatureApplicable:false}).success===false);
 check("failed equilibrium rejected",()=>audit({analyzedCases:[{...all[0],equilibrium:{ok:false}},...all.slice(1)],temperatureApplicable:false}).success===false);
 check("missing member results rejected",()=>audit({analyzedCases:[{...all[0],members:[]},...all.slice(1)],temperatureApplicable:false}).success===false);
 check("unknown family is not silently classified",()=>audit({analyzedCases:[{...all[0],m6FamilyId:"M6-ULS-99"},...all.slice(1)],temperatureApplicable:false}).success===false);
 check("never enables analysis or approves design",()=>{const r=audit({analyzedCases:all,temperatureApplicable:false});return r.analysisEnabled===false&&r.designApproved===false;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,scope:"family traceability only"};
}
root.SteelM6AnalysisCoverageAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
