/* SAHROUD STEEL — knee connection demand mapping.
 * Maps each member's signed global solver action from the analysis joint
 * to the drawing-defined connection origin and axes, per load combination.
 * It does not combine joint equilibrium or calculate connection resistance.
 */
(function(root){
 "use strict";
 function fail(message){throw new Error(message);}
 function map(detail,connectionDemand,geometry){
  if(!root.SahroudKneeConnectionDetail||!root.SahroudConnectionDemandRegistry)fail("ماژول اعتبارسنجی جزئیات یا رجیستری تقاضای اتصال بارگذاری نشده است.");
  const validation=root.SahroudKneeConnectionDetail.validate(detail);
  if(!validation.valid)fail("جزئیات اتصال معتبر نیست: "+validation.errors.join(" | "));
  if(!connectionDemand||connectionDemand.success!==true)fail("بسته تقاضای اتصال از تحلیل سه‌بعدی موجود نیست.");
  if(!geometry||!geometry.node||!geometry.column||!geometry.rafter)fail("هندسه زانویی انتخاب‌شده در مدل جاری موجود نیست.");
  if(String(detail.jointId)!==String(geometry.node.id))fail("شناسه گره جزئیات با گره زانویی انتخاب‌شده تطابق ندارد.");
  const expected=[{role:"column",id:geometry.column.id},{role:"rafter",id:geometry.rafter.id}];
  for(const item of expected){
   if(!(detail.memberForceTransferPoints||[]).some(p=>p.role===item.role&&String(p.memberId)===String(item.id)))
    fail("شناسه عضو "+item.role+" در جزئیات با مدل جاری تطابق ندارد.");
  }
  const joint=(connectionDemand.joints||[]).find(j=>String(j.nodeId)===String(detail.jointId));
  if(!joint)fail("گره انتخاب‌شده در بسته تقاضای تحلیل وجود ندارد.");
  if(!Array.isArray(joint.cases)||!joint.cases.length)fail("هیچ ترکیب بار قابل انتقال برای گره انتخاب‌شده وجود ندارد.");
  const origin=detail.connectionFrame.originM.map(Number);
  const axes=detail.connectionFrame.axes;
  const mapped=joint.cases.map(c=>{
   const actions=expected.map(item=>{
    const rows=(c.memberActions||[]).filter(a=>String(a.memberId)===String(item.id));
    if(rows.length!==1)fail("در ترکیب "+c.combination+" باید دقیقاً یک کنش برای عضو "+item.id+" وجود داشته باشد.");
    const a=rows[0];
    if(!a.global||![a.global.Fx,a.global.Fy,a.global.Fz,a.global.Mx,a.global.My,a.global.Mz].every(v=>Number.isFinite(Number(v))))
     fail("کنش جهانی عضو "+item.id+" در ترکیب "+c.combination+" ناقص است.");
    const transformed=root.SahroudConnectionDemandRegistry.toConnectionFrame(
     a.global,[joint.coordinatesM.x,joint.coordinatesM.y,joint.coordinatesM.z],origin,axes);
    return{role:item.role,memberId:String(item.id),end:a.end,globalAtConnectionOrigin:transformed.globalAtConnectionOrigin,
     connectionFrame:transformed};
   });
   return{combinationId:c.combinationId,combination:c.combination,memberActions:actions};
  });
  return{success:true,schema:"SAHROUD-KNEE-CONNECTION-MAPPED-DEMAND-1.0",jointId:String(detail.jointId),
   connectionId:String(detail.connectionId),originM:origin,axes,
   units:{force:"N",moment:"N.m",length:"m"},cases:mapped,
   capacityDesigned:false,executionReady:false,
   limitations:["کنش هر عضو جداگانه و با علامت اصلی منتقل شده است؛ جمع آن‌ها جایگزین تعادل کامل گره نیست.",
    "بارهای گره‌ای، واکنش‌ها، تماس اجزا و توزیع داخلی پیچ/جوش/ورق در این نگاشت لحاظ نشده‌اند.",
    "این خروجی صرفاً تقاضای منتقل‌شده است و هیچ ظرفیت یا قبولی اتصال را نشان نمی‌دهد."]};
 }
 root.SahroudKneeConnectionDemandMapper={map};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudKneeConnectionDemandMapper;
})(typeof window!=="undefined"?window:globalThis);
