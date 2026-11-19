(function(root){
 "use strict";
 function exportSupportReactions(input){
  const d=input||{},nodes=Array.isArray(d.nodes)?d.nodes:[],supports=Array.isArray(d.supports)?d.supports:[],reactions=Array.isArray(d.reactions)?d.reactions:[];
  if(!supports.length)throw new Error("فهرست تکیه‌گاه‌های تحلیل برای استخراج واکنش پی خالی است.");
  if(!Array.isArray(nodes)||!nodes.length)throw new Error("هندسه گره‌های مدل برای استخراج واکنش پی موجود نیست.");
  if(typeof d.loadCase!=="string"||!d.loadCase.trim())throw new Error("شناسه حالت بار تحلیل الزامی است.");
  const nodeById=new Map(nodes.map(n=>[String(n.id),n]));
  const reactionById=new Map(reactions.map(r=>[String(r.nodeId),r]));
  const rows=supports.map(s=>{
   const id=String(s.nodeId),node=nodeById.get(id);
   if(!node)throw new Error("گره تکیه‌گاهی "+id+" در هندسه مدل یافت نشد.");
   const r=reactionById.get(id),v=r&&Array.isArray(r.values)?r.values:Array(6).fill(0);
   if(v.length!==6||v.some(x=>!Number.isFinite(Number(x))))throw new Error("واکنش گره "+id+" باید شش مؤلفه محدود داشته باشد.");
   const dofs=Array.isArray(s.fixedDofs)?s.fixedDofs.slice():[];
   return Object.freeze({nodeId:id,coordinatesM:Object.freeze({x:Number(node.x),y:Number(node.y),z:Number(node.z)}),
    fixedDofs:Object.freeze(dofs),FxkN:Number(v[0])/1000,FykN:Number(v[1])/1000,FzkN:Number(v[2])/1000,
    MxkNm:Number(v[3])/1000,MykNm:Number(v[4])/1000,MzkNm:Number(v[5])/1000});
  });
  return Object.freeze({schema:"SAHROUD-FOUNDATION-REACTIONS-1.0",loadCase:d.loadCase.trim(),
   loadCaseLabel:String(d.loadCaseLabel||d.loadCase),units:"kN,kN.m,m",
   signConvention:"علامت‌ها مطابق واکنش حل‌گر در محورهای جهانی؛ نیروی تکیه‌گاهی وارد بر سازه. برای طراحی پی، قرارداد کنش/واکنش و محور محلی پی باید کنترل شود.",
   sourceReference:"خروجی مستقیم حل‌گر سه‌بعدی SAHROUD STEEL؛ حالت بار "+d.loadCase.trim()+"؛ این مرجع جایگزین تأیید مهندس محاسب نیست.",
   solverEquilibriumOK:d.equilibrium&&d.equilibrium.ok===true,
   supports:Object.freeze(rows),
   limitations:Object.freeze(["این خروجی فقط واکنش‌های یک حالت تحلیل است و ترکیب SLS تأییدشده تولید نمی‌کند.",
    "واکنش‌های لنگری فقط در درجات آزادی گیردار غیرصفر خواهند بود؛ برای تکیه‌گاه مفصلی لنگر تکیه‌گاهی صفر است.",
    "برای کنترل خاک باید واکنش‌های تمام ترکیبات SLS، وزن پی/خاک روی پی، خروج از مرکزیت هندسی و قرارداد علامت طراحی پی جداگانه لحاظ شوند."])});
 }
 root.SahroudFoundationReactionExport=Object.freeze({exportSupportReactions});
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudFoundationReactionExport;
})(typeof window!=="undefined"?window:globalThis);
