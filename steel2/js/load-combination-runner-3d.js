/* SAHROUD STEEL - sequential 3D load-combination runner
 * Runs each user-defined gravity combination as an independent linear analysis.
 * Factors are input data, not a claim of code-approved LRFD combinations.
 */
(function(root){
 "use strict";
 function normalize(combinations){
  if(!Array.isArray(combinations)||!combinations.length) throw new Error("هیچ ترکیب بار ثقلی برای اجرا تعریف نشده است.");
  return combinations.map((item,index)=>{
   if(!item||typeof item!=="object") throw new Error("تعریف ترکیب بار شماره "+(index+1)+" معتبر نیست.");
   const factors={dead:Number(item.dead),live:Number(item.live),snow:Number(item.snow)};
   if(Object.values(factors).some(v=>!Number.isFinite(v)||v<0)) throw new Error("ضرایب D/L/S در ترکیب "+(item.name||index+1)+" باید عددی، متناهی و غیرمنفی باشند.");
   if(!Object.values(factors).some(v=>v>0)) throw new Error("ترکیب "+(item.name||index+1)+" هیچ ضریب بار فعالی ندارد.");
   return {id:"gravity-combination-"+(index+1),label:String(item.name||("ترکیب ثقلی "+(index+1))),factors};
  });
 }
 async function run(combinations,runCase,model,demandApi){
  if(typeof runCase!=="function") throw new Error("تابع اجرای تحلیل هر ترکیب بار ارائه نشده است.");
  if(!model||!Array.isArray(model.members)||!model.members.length) throw new Error("مدل مرجع اعضا برای اجرای ترکیبات بار موجود نیست.");
  if(!demandApi||typeof demandApi.envelope!=="function") throw new Error("موتور پوش تقاضای اعضای سه‌بعدی بارگذاری نشده است.");
  const specs=normalize(combinations),solved=[],records=[];
  for(const spec of specs){
   const result=await runCase({label:spec.label,factors:{...spec.factors}});
   if(!result||result.success!==true||!Array.isArray(result.members)) throw new Error("تحلیل ترکیب «"+spec.label+"» موفق نبود؛ پوش ناقص پذیرفته نشد.");
   const tagged={...result,loadCase:spec.id,loadCaseLabel:spec.label};
   solved.push(tagged);
   records.push({id:spec.id,label:spec.label,factors:{...spec.factors},members:tagged.members,
    memberDemand:tagged.memberDemand||null,maxTranslation:Number.isFinite(Number(tagged.maxTranslation))?Number(tagged.maxTranslation):null,analysis:tagged});
  }
  const envelope=demandApi.envelope(solved,model);
  if(!envelope||envelope.success!==true||envelope.caseCount!==specs.length) throw new Error("پوش تقاضا همه ترکیبات را پوشش نمی‌دهد؛ نتیجه برای طراحی قابل استفاده نیست.");
  return {success:true,method:"sequential-independent-linear-3d-cases",caseCount:records.length,
   combinationResults:records,envelope,note:"این اجرا فقط ترکیبات ثقلی تعریف‌شده در ورودی را جداگانه حل می‌کند. ضرایب باید پیش از استفاده طراحی با ویرایش معتبر آیین‌نامه تطبیق داده شوند. پوش مؤلفه‌ای برای اندرکنش هم‌زمان N-M کافی نیست؛ بردارهای کامل هر ترکیب جداگانه حفظ شده‌اند."};
 }
 root.Sahroud3DCombinationRunner={normalize,run};
})(typeof window!=="undefined"?window:globalThis);
