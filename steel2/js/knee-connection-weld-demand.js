/* SAHROUD STEEL — map validated knee weld geometry to elastic in-plane line demand.
 * This is demand distribution only. It does not calculate weld/base-metal resistance.
 * Forces: N -> kN; moments: N.m -> kN.mm (numerically equal).
 */
(function(root){
 "use strict";
 const finite=(v,n)=>{if(typeof v!=="number"||!Number.isFinite(v))throw new Error(n+" must be finite");return v;};
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=a=>Math.hypot(...a);
 function fail(s){throw new Error(s);}
 function analyze(detail,mappedDemand,options={}){
  const api=root.SahroudKneeConnectionDetail,solver=root.SahroudWeldGroupDemand;
  if(!api||!solver)fail("ماژول جزئیات زانویی یا موتور تقاضای گروه جوش بارگذاری نشده است.");
  const validation=api.validate(detail);
  if(!validation.valid)fail("جزئیات اتصال معتبر نیست: "+validation.errors.join(" | "));
  if(!mappedDemand||mappedDemand.success!==true||mappedDemand.connectionId!==String(detail.connectionId))
   fail("بسته تقاضای منتقل‌شده با شناسه اتصال تطابق ندارد.");
  const tol=options.outOfPlaneTolerance??1e-6;
  if(!(typeof tol==="number"&&Number.isFinite(tol)&&tol>=0))fail("تلرانس خروج از صفحه نامعتبر است.");
  const plates=new Map(detail.plates.map(p=>[String(p.id),p]));
  const welds=detail.welds;
  const basePlate=plates.get(String(welds[0].plateId));
  const frame=basePlate.frame, u=frame.axes.u, v=frame.axes.v, n=frame.axes.n, origin=frame.originMm;
  const segments=welds.map(w=>{
   const plate=plates.get(String(w.plateId));
   if(!plate)fail("ورق میزبان جوش "+w.id+" موجود نیست.");
   const pframe=plate.frame;
   // All welds must belong to the same physical plane and orientation for this 2D kernel.
   if(norm(pframe.axes.u.map((x,i)=>x-u[i]))>1e-6||
      norm(pframe.axes.v.map((x,i)=>x-v[i]))>1e-6||
      norm(pframe.axes.n.map((x,i)=>x-n[i]))>1e-6)
    fail("خطوط جوش در صفحات/جهت‌گیری‌های متفاوت قرار دارند؛ تحلیل دوبعدی گروه جوش مجاز نیست.");
   const toLocal=point=>{
    const delta=point.map((x,i)=>x-origin[i]);
    const z=dot(delta,n);
    if(Math.abs(z)>0.1)fail("خط جوش "+w.id+" از صفحه مرجع گروه جوش خارج است.");
    return [dot(delta,u),dot(delta,v)];
   };
   return{id:String(w.id),start:toLocal(w.startMm),end:toLocal(w.endMm)};
  });
  const cases=mappedDemand.cases;
  if(!Array.isArray(cases)||!cases.length)fail("هیچ ترکیب بار نگاشت‌شده‌ای وجود ندارد.");
  const results=[];
  for(const c of cases){
   if(!c.combinationId||!Array.isArray(c.memberActions)||!c.memberActions.length)
    fail("ترکیب بار دارای کنش عضو ناقص است.");
   for(const action of c.memberActions){
    const cf=action.connectionFrame;
    if(!cf||!cf.force||!cf.moment)fail("کنش عضو "+action.memberId+" دستگاه اتصال کامل ندارد.");
    const F=[finite(cf.force.x,"Fx"),finite(cf.force.y,"Fy"),finite(cf.force.z,"Fz")];
    const M=[finite(cf.moment.x,"Mx"),finite(cf.moment.y,"My"),finite(cf.moment.z,"Mz")];
    const Fn=dot(F,n), Mu=dot(M,u), Mv=dot(M,v);
    const forceScale=Math.max(1,norm(F));
    const momentScale=Math.max(1,norm(M));
    if(Math.abs(Fn)>tol*forceScale||Math.abs(Mu)>tol*momentScale||Math.abs(Mv)>tol*momentScale)
     fail("کنش عضو "+action.memberId+" مؤلفه خارج از صفحه جوش دارد؛ مدل خطی دوبعدی نمی‌تواند آن را حذف یا نادیده بگیرد.");
    const arm=origin.map(x=>-x); // r_connection(0) - r_plateOrigin, in connection-frame mm
    const shifted=cross(arm,F);
    const Mplate=M.map((x,i)=>x+shifted[i]/1000); // N.m + N.mm/1000 => kN.mm numeric
    const demand={
     N:dot(F,u)/1000,
     V:dot(F,v)/1000,
     Mz:dot(Mplate,n)
    };
    const line=solver.analyzeSegments({segments,N:demand.N,V:demand.V,Mz:demand.Mz});
    results.push({combinationId:String(c.combinationId),combination:String(c.combination),
     memberId:String(action.memberId),role:action.role,plateId:String(basePlate.id),
     demandAtPlateOrigin:{...demand,units:{N:"kN",V:"kN",Mz:"kN.mm"}},
     lineDemand:line,capacityDesigned:false,executionReady:false});
   }
  }
  return{success:true,schema:"SAHROUD-KNEE-WELD-LINE-DEMAND-1.0",
   connectionId:String(detail.connectionId),jointId:String(detail.jointId),
   method:"independent member-action scenarios; no summation between column and rafter actions",
   results,capacityDesigned:false,executionReady:false,
   limitations:["تقاضای ستون و رفتر جداگانه گزارش می‌شود؛ جمع آن‌ها یا سهم‌بندی نیرو میان اجزای اتصال انجام نشده است.",
    "مدل فقط گروه جوش هم‌صفحه با سختی خطی یکنواخت و ورق صلب را می‌پذیرد.",
    "ظرفیت فلز جوش، فلز پایه، گلویی مؤثر، جهت‌گیری موضعی جوش، حداقل اندازه/طول، جوش بلند، انعطاف ورق و اندرکنش پیچ-جوش محاسبه نمی‌شوند."]};
 }
 const api={analyze};
 root.SahroudKneeWeldDemand=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
