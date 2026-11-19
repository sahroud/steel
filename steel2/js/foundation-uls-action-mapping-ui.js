(function(root){
 "use strict";
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.ulsActionUiInitialized==="true")return;
  panel.dataset.ulsActionUiInitialized="true";
  const $=id=>root.document.getElementById(id);
  const button=$("btnMapFoundationUlsActions"),input=$("foundationUlsBatchInput"),out=$("foundationUlsActionResult");
  if(!button||!input||!out)return;
  button.addEventListener("click",()=>{
   try{
    if(!root.SahroudFoundationUlsReactionBatch||!root.SahroudFoundationUlsActionMapping)
     throw new Error("ماژول‌های اعتبارسنجی و تبدیل واکنش ULS بارگذاری نشده‌اند.");
    const batch=root.SahroudFoundationUlsReactionBatch.collectUlsReactionCases(JSON.parse(input.value||"{}"));
    const geometry=JSON.parse($("foundationLocalGeometryInput").value||"{}");
    const mapped=root.SahroudFoundationUlsActionMapping.mapUlsReactionBatchToFootingActions({
     batch,reactionSense:$("foundationReactionSense").value,foundations:geometry.foundations
    });
    const nodeId=String($("selectedFoundationNodeId").value||"").trim();
    if(!nodeId)throw new Error("شناسه پایه موردنظر را وارد کنید.");
    const footing=mapped.foundations.find(x=>x.nodeId===nodeId);
    if(!footing)throw new Error("پایه انتخاب‌شده در بسته واکنش ULS وجود ندارد.");
    out.textContent="بسته کنش‌های ULS برای پایه "+nodeId+" تبدیل شد: "+footing.cases.length+
     " ترکیب مستقل. این خروجی برای کنترل‌های مقاومت پی است و جایگزین ترکیبات مصوب نیست.\n"+
     "کنش‌های محلی کامل (بدون envelope مؤلفه‌ای):\n"+JSON.stringify(footing,null,2)+
     "\nمحدودیت: این مرحله هنوز خمش، برش یک‌طرفه، پانچ یا مهار آرماتور را محاسبه نمی‌کند.";
    out.style.color="#15803d";
   }catch(error){out.textContent="تبدیل واکنش ULS انجام نشد: "+error.message;out.style.color="#b45309";}
  });
 }
 const api=Object.freeze({render});
 root.SahroudFoundationUlsActionMappingUI=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
