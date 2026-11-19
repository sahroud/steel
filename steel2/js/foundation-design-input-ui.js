(function(root){
 "use strict";
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.footingDesignInputUiInitialized==="true")return;
  panel.dataset.footingDesignInputUiInitialized="true";
  const $=id=>root.document.getElementById(id);
  const button=$("btnValidateFootingDesignInput"),input=$("footingDesignInputJson"),out=$("footingDesignInputResult"),useUls=$("btnUseMappedUlsActions");
  if(!button||!input||!out)return;
  if(useUls)useUls.addEventListener("click",()=>{
   try{
    if(!root.SahroudLastFoundationUlsActions)throw new Error("ابتدا بسته واکنش ULS را در مرحله قبل اعتبارسنجی و تبدیل کنید.");
    const payload=JSON.parse(input.value||"{}");
    payload.ulsLocalActions=root.SahroudLastFoundationUlsActions;
    input.value=JSON.stringify(payload,null,2);
    out.textContent="بسته کامل ULS به ورودی طراحی پی منتقل شد. مشخصات هندسه، مصالح و پوشش بتن را تکمیل و سپس اعتبارسنجی کنید.";
    out.style.color="#15803d";
   }catch(error){out.textContent="انتقال بسته ULS انجام نشد: "+error.message;out.style.color="#b45309";}
  });
  button.addEventListener("click",()=>{
   try{
    if(!root.SahroudFootingDesignInput)throw new Error("ماژول اعتبارسنجی ورودی طراحی پی بارگذاری نشده است.");
    const result=root.SahroudFootingDesignInput.validateFootingDesignInput(JSON.parse(input.value||"{}"));
    out.textContent=["ورودی هندسه، مصالح و کنش‌های پی از نظر ساختار و سازگاری اولیه معتبر است؛ این نتیجه تأیید طراحی سازه‌ای نیست.",
     "پی: "+result.foundationId+" | گره پایه: "+result.nodeId+" | ابعاد: "+result.geometry.Bm+" × "+result.geometry.Lm+" × "+result.geometry.thicknessM+" m",
     "بتن: fc="+result.materials.concreteFcMPa+" MPa | فولاد: fy="+result.materials.rebarFyMPa+" MPa",
     "تعداد ترکیبات ULS: "+result.ulsActions.cases.length,
     "هشدارها:",...(result.warnings.length?result.warnings.map(x=>"• "+x):["• هشدار ورودی ثبت نشد."]),
     "کنترل‌های لازم بعدی:",...result.requiredNextChecks.map(x=>"• "+x),
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x),
     "داده نرمال‌شده:",JSON.stringify(result,null,2)].join("\n");
    out.style.color="#15803d";
   }catch(error){out.textContent="اعتبارسنجی ورودی طراحی پی انجام نشد: "+error.message;out.style.color="#b45309";}
  });
 }
 const api=Object.freeze({render});
 root.SahroudFootingDesignInputUI=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
