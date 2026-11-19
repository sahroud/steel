(function(root){
 "use strict";
 const finite=(v,label)=>{if(v===null||v===undefined||typeof v==="boolean"||(typeof v==="string"&&!v.trim()))throw new Error(label+" نباید خالی باشد.");const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;};
 const key=s=>String(s==null?"":s);
 function collectSlsReactionCases(input){
  const d=input||{},cases=Array.isArray(d.cases)?d.cases:[];
  if(!cases.length)throw new Error("حداقل یک خروجی واکنش برای ترکیب SLS لازم است.");
  const seenCases=new Set(),baseMap=new Map();
  let referenceSupports=null;
  const normalized=cases.map((item,index)=>{
   if(!item||typeof item!=="object")throw new Error("رکورد واکنش شماره "+(index+1)+" معتبر نیست.");
   const id=key(item.loadCase).trim(),label=key(item.loadCaseLabel).trim();
   if(!id||seenCases.has(id))throw new Error("شناسه حالت بار باید غیرخالی و یکتا باشد.");
   seenCases.add(id);
   if(String(item.classification||"").toUpperCase()!=="SLS")
    throw new Error("حالت «"+(label||id)+"» صریحاً به‌عنوان SLS علامت‌گذاری نشده است؛ ULS یا حالت بار منفرد پذیرفته نیست.");
   if(item.solverEquilibriumOK!==true)throw new Error("تعادل حل‌گر برای حالت «"+(label||id)+"» تأیید نشده است.");
   if(typeof item.sourceReference!=="string"||!item.sourceReference.trim())
    throw new Error("مرجع مستند ترکیب SLS «"+(label||id)+"» الزامی است.");
   if(!Array.isArray(item.supports)||!item.supports.length)
    throw new Error("واکنش پایه‌ها برای حالت «"+(label||id)+"» خالی است.");
   const ids=new Set();
   const supports=item.supports.map(row=>{
    const nodeId=key(row&&row.nodeId).trim();
    if(!nodeId||ids.has(nodeId))throw new Error("شناسه پایه در حالت «"+(label||id)+"» خالی یا تکراری است.");
    ids.add(nodeId);
    const c=row.coordinatesM||{};
    const coordinatesM={x:finite(c.x,"مختصات X پایه "+nodeId),y:finite(c.y,"مختصات Y پایه "+nodeId),z:finite(c.z,"مختصات Z پایه "+nodeId)};
    const actions={};
    ["FxkN","FykN","FzkN","MxkNm","MykNm","MzkNm"].forEach(k=>actions[k]=finite(row[k],k+" پایه "+nodeId));
    return Object.freeze({nodeId,coordinatesM:Object.freeze(coordinatesM),fixedDofs:Object.freeze(Array.isArray(row.fixedDofs)?row.fixedDofs.slice():[]),...actions});
   }).sort((a,b)=>a.nodeId.localeCompare(b.nodeId));
   const signature=supports.map(x=>x.nodeId+"@"+[x.coordinatesM.x,x.coordinatesM.y,x.coordinatesM.z].join(",")).join("|");
   if(referenceSupports===null)referenceSupports=signature;
   else if(referenceSupports!==signature)throw new Error("شناسه یا مختصات پایه‌ها بین ترکیبات SLS یکسان نیست؛ هندسه یا مجموعه تکیه‌گاه‌ها تغییر کرده است.");
   supports.forEach(row=>{
    if(!baseMap.has(row.nodeId))baseMap.set(row.nodeId,{nodeId:row.nodeId,coordinatesM:row.coordinatesM,cases:[]});
    baseMap.get(row.nodeId).cases.push(Object.freeze({loadCase:id,loadCaseLabel:label,sourceReference:item.sourceReference.trim(),
     FxkN:row.FxkN,FykN:row.FykN,FzkN:row.FzkN,MxkNm:row.MxkNm,MykNm:row.MykNm,MzkNm:row.MzkNm}));
   });
   return Object.freeze({loadCase:id,loadCaseLabel:label,classification:"SLS",sourceReference:item.sourceReference.trim(),
    supports:Object.freeze(supports)});
  });
  return Object.freeze({schema:"SAHROUD-FOUNDATION-SLS-REACTION-BATCH-1.0",success:true,
   caseCount:normalized.length,supportCount:baseMap.size,units:"kN,kN.m,m",
   signConvention:"بردارها بدون تغییر و مطابق قرارداد واکنش حل‌گر و محورهای جهانی حفظ شده‌اند؛ تبدیل به نیروهای وارد بر پی و محورها/علامت‌های محلی باید در مرحله طراحی با قرارداد صریح انجام شود.",
   cases:Object.freeze(normalized),foundations:Object.freeze(Array.from(baseMap.values()).map(x=>Object.freeze({...x,cases:Object.freeze(x.cases)}))),
   limitations:Object.freeze(["این ماژول فقط بسته واکنش‌های SLS را اعتبارسنجی و دسته‌بندی می‌کند؛ ترکیب بار را تولید یا آیین‌نامه‌ای بودن آن را تأیید نمی‌کند.",
    "برچسب SLS و مرجع منبع باید از سازنده ترکیبات معتبر و مستند وارد شود؛ صرف تغییر نام یک حالت بار آن را SLS نمی‌کند.",
    "هیچ پوش مؤلفه‌ای جایگزین بردار کامل نیرو و لنگر هر ترکیب نشده است.",
    "وزن پی، خاک روی پی، شناژ، اثر اندرکنش پی‌ها، نشست و طراحی بتن‌آرمه در این مرحله محاسبه نمی‌شود."])});
 }
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.slsBatchInitialized==="true")return;
  panel.dataset.slsBatchInitialized="true";
  const input=root.document.getElementById("foundationSlsBatchInput");
  const button=root.document.getElementById("btnValidateFoundationSlsBatch");
  const output=root.document.getElementById("foundationSlsBatchResult");
  if(!input||!button||!output)return;
  button.addEventListener("click",()=>{
   try{
    const payload=JSON.parse(input.value||"{}");
    const result=collectSlsReactionCases(payload);
    output.textContent="بسته واکنش معتبر از نظر ساختار: "+result.caseCount+" ترکیب SLS و "+result.supportCount+" پایه.\n"+
     "این اعتبارسنجی، آیین‌نامه‌ای بودن ترکیبات را تأیید نمی‌کند و هنوز تبدیل علامت/محور برای طراحی پی انجام نشده است.\n"+
     JSON.stringify(result,null,2);
    output.style.color="#15803d";
   }catch(error){output.textContent="بسته واکنش پذیرفته نشد: "+error.message;output.style.color="#b45309";}
  });
 }
 const api=Object.freeze({collectSlsReactionCases,render});
 root.SahroudFoundationReactionBatch=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
