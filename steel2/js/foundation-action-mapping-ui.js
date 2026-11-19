(function(root){
 "use strict";
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.actionMappingUiInitialized==="true")return;
  panel.dataset.actionMappingUiInitialized="true";
  const $=id=>root.document.getElementById(id);
  const button=$("btnMapFoundationActions"),input=$("foundationLocalGeometryInput"),
   sense=$("foundationReactionSense"),selected=$("selectedFoundationNodeId"),
   batchInput=$("foundationSlsBatchInput"),out=$("foundationActionMappingResult"),
   soilCases=$("soilReactionCases");
  if(!button||!input||!sense||!selected||!batchInput||!out||!soilCases)return;
  button.addEventListener("click",()=>{
   try{
    if(!root.SahroudFoundationReactionBatch||!root.SahroudFoundationActionMapping)
     throw new Error("ماژول‌های اعتبارسنجی و تبدیل واکنش بارگذاری نشده‌اند.");
    const batchPayload=JSON.parse(batchInput.value||"{}");
    const batch=root.SahroudFoundationReactionBatch.collectSlsReactionCases(batchPayload);
    const geometryPayload=JSON.parse(input.value||"{}");
    const mapped=root.SahroudFoundationActionMapping.mapSlsReactionBatchToFootingActions({
     batch,reactionSense:sense.value,foundations:geometryPayload.foundations
    });
    const nodeId=String(selected.value||"").trim();
    if(!nodeId)throw new Error("شناسه پایه موردنظر برای کنترل فشار خاک را وارد کنید.");
    const footing=mapped.foundations.find(x=>x.nodeId===nodeId);
    if(!footing)throw new Error("شناسه پایه انتخاب‌شده در بسته واکنش وجود ندارد.");
    const cases=footing.cases.map(c=>({
     name:c.loadCase,nameLabel:c.loadCaseLabel,sourceReference:c.sourceReference,
     NkN:c.NkN,MxkNm:c.MxkNm,MzkNm:c.MzkNm
    }));
    soilCases.value=JSON.stringify(cases,null,2);
    out.textContent="تبدیل واکنش‌ها برای پایه "+nodeId+" انجام شد. "+cases.length+
     " ترکیب SLS به ورودی کنترل فشار خاک منتقل شد.\n"+
     "اکنون ابعاد پی، ظرفیت مجاز و مرجع ژئوتکنیک را بررسی و سپس دکمه کنترل فشار را اجرا کنید.\n"+
     "خروجی کامل تبدیل:\n"+JSON.stringify(mapped,null,2);
    out.style.color="#15803d";
   }catch(error){out.textContent="تبدیل واکنش‌ها انجام نشد: "+error.message;out.style.color="#b45309";}
  });
 }
 const api=Object.freeze({render});
 root.SahroudFoundationActionMappingUI=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
