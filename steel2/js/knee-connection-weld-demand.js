/* SAHROUD STEEL — map validated knee weld geometry to elastic in-plane line demand.
 * Input member actions are N and N.m in the drawing-defined connection frame.
 * Plate geometry is global mm. Output demand is kN, kN.mm and kN/mm.
 * Demand distribution only; no weld or base-metal resistance is calculated.
 */
(function(root){
 "use strict";
 const finite=(v,n)=>{if(typeof v!=="number"||!Number.isFinite(v))throw new Error(n+" must be finite");return v;};
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=a=>Math.hypot(...a);
 function fail(s){throw new Error(s);}
 function sameVector(a,b,tol=1e-8){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&norm(a.map((x,i)=>x-b[i]))<=tol;}
 function localToGlobal(q,axes){
  return [0,1,2].map(i=>axes.x[i]*q.x+axes.y[i]*q.y+axes.z[i]*q.z);
 }
 function analyze(detail,mappedDemand,options={}){
  const api=root.SahroudKneeConnectionDetail,solver=root.SahroudWeldGroupDemand,detailCheck=root.SahroudKneeWeldDetailCheck;
  if(!api||!solver||!detailCheck)fail("ماژول جزئیات زانویی، کنترل جزئیات جوش یا موتور تقاضای گروه جوش بارگذاری نشده است.");
  const validation=api.validate(detail);
  if(!validation.valid)fail("جزئیات اتصال معتبر نیست: "+validation.errors.join(" | "));
  if(!mappedDemand||mappedDemand.success!==true||mappedDemand.connectionId!==String(detail.connectionId))
   fail("بسته تقاضای منتقل‌شده با شناسه اتصال تطابق ندارد.");
  if(mappedDemand.units?.force!=="N"||mappedDemand.units?.moment!=="N.m"||mappedDemand.units?.length!=="m")
   fail("واحدهای بسته تقاضای ورودی باید N، N.m و m باشند.");
  const tol=options.outOfPlaneTolerance??1e-6;
  if(!(typeof tol==="number"&&Number.isFinite(tol)&&tol>=0))fail("تلرانس خروج از صفحه نامعتبر است.");
  const weldDetail=detailCheck.assess(detail);
  if(!weldDetail.success||!weldDetail.lineDemandGeometryComplete)
   fail("طول مؤثر خطوط جوش به علت داده ناقص/نامشخص قابل تعیین نیست؛ ابتدا کنترل جزئیات جوش را تکمیل کنید.");
  // This line-group kernel is validated only for fillet-weld detail geometry.
  // Groove welds must never silently enter the same elastic line model.
  const unsupportedWelds=detail.welds.filter(w=>w.type!=="fillet");
  if(unsupportedWelds.length)
   fail("تحلیل تقاضای خطی این مرحله فقط برای جوش گوشه تعریف شده است؛ جوش شیاری/نوع پشتیبانی‌نشده: "+unsupportedWelds.map(w=>String(w.id)).join(", "));
  if(weldDetail.overallStatus!=="PASS")
   fail("کنترل جزئیات جوش گوشه دارای FAIL یا NOT_ASSESSABLE است؛ تحلیل تقاضا تا رفع همه موارد قابل ارزیابی/نامنطبق متوقف شد. وضعیت: "+weldDetail.overallStatus);
  const conn=detail.connectionFrame, connAxes=conn.axes;
  if(!sameVector(mappedDemand.originM,conn.originM)||!["x","y","z"].every(k=>sameVector(mappedDemand.axes?.[k]||[],connAxes[k])))
   fail("مبدأ یا محورهای بسته تقاضا با دستگاه تأییدشده جزئیات اتصال تطابق ندارد.");
  const connOriginMm=conn.originM.map(x=>x*1000);
  const plates=new Map(detail.plates.map(p=>[String(p.id),p]));
  const welds=detail.welds;
  const basePlate=plates.get(String(welds[0].plateId));
  const frame=basePlate.frame, u=frame.axes.u, v=frame.axes.v, n=frame.axes.n, plateOrigin=frame.originMm;
  const effectiveById=new Map(weldDetail.effectiveWelds.map(w=>[String(w.id),w]));
  const segments=welds.map(w=>{
   const effective=effectiveById.get(String(w.id));
   if(!effective||effective.effectiveLengthKnown===false)fail("طول مؤثر جوش "+w.id+" نامشخص است.");
   const plate=plates.get(String(w.plateId));
   if(!plate)fail("ورق میزبان جوش "+w.id+" موجود نیست.");
   const pframe=plate.frame;
   if(norm(pframe.axes.u.map((x,i)=>x-u[i]))>1e-6||
      norm(pframe.axes.v.map((x,i)=>x-v[i]))>1e-6||
      norm(pframe.axes.n.map((x,i)=>x-n[i]))>1e-6||
      Math.abs(dot(pframe.originMm.map((x,i)=>x-plateOrigin[i]),n))>0.1)
    fail("خطوط جوش در صفحات/جهت‌گیری‌های متفاوت قرار دارند؛ تحلیل دوبعدی گروه جوش مجاز نیست.");
   const toLocal=point=>{
    const delta=point.map((x,i)=>x-plateOrigin[i]);
    const z=dot(delta,n);
    if(Math.abs(z)>0.1)fail("خط جوش "+w.id+" از صفحه مرجع گروه جوش خارج است.");
    return [dot(delta,u),dot(delta,v)];
   };
   return{id:String(w.id),start:toLocal(effective.effectiveStartMm),end:toLocal(effective.effectiveEndMm)};
  });
  const cases=mappedDemand.cases;
  if(!Array.isArray(cases)||!cases.length)fail("هیچ ترکیب بار نگاشت‌شده‌ای وجود ندارد.");
  const expected=new Map(detail.memberForceTransferPoints.map(p=>[String(p.memberId),p.role]));
  const results=[];
  for(const c of cases){
   if(!c.combinationId||!Array.isArray(c.memberActions)||c.memberActions.length!==expected.size)
    fail("ترکیب بار باید دقیقاً شامل کنش‌های ستون و رفتر باشد.");
   const seen=new Set();
   for(const action of c.memberActions){
    const id=String(action.memberId);
    if(!expected.has(id)||seen.has(id)||action.role!==expected.get(id))
     fail("شناسه یا نقش عضو در بسته تقاضا با جزئیات اتصال تطابق ندارد.");
    seen.add(id);
    const cf=action.connectionFrame;
    if(!cf||!cf.force||!cf.moment||!cf.connectionOriginM||
       cf.units?.force!=="N"||cf.units?.moment!=="N.m"||cf.units?.length!=="m")
     fail("کنش عضو "+action.memberId+" دستگاه اتصال و واحدهای کامل ندارد.");
    if(!sameVector([cf.connectionOriginM.x,cf.connectionOriginM.y,cf.connectionOriginM.z],conn.originM))
     fail("مبدأ کنش عضو "+action.memberId+" با مبدأ اتصال تطابق ندارد.");
    const Fl=[finite(cf.force.x,"Fx"),finite(cf.force.y,"Fy"),finite(cf.force.z,"Fz")];
    const Ml=[finite(cf.moment.x,"Mx"),finite(cf.moment.y,"My"),finite(cf.moment.z,"Mz")];
    // Convert connection-frame components to global vectors before projecting onto the weld plane.
    const F=localToGlobal({x:Fl[0],y:Fl[1],z:Fl[2]},connAxes);
    const M=localToGlobal({x:Ml[0],y:Ml[1],z:Ml[2]},connAxes); // N.m
    const arm=connOriginMm.map((x,i)=>x-plateOrigin[i]); // r_connection - r_plate, mm
    const MplateNmm=M.map((x,i)=>x*1000+cross(arm,F)[i]);
    const Fn=dot(F,n), Mu=dot(MplateNmm,u), Mv=dot(MplateNmm,v);
    const forceScale=Math.max(1,norm(F));
    const momentScale=Math.max(1000,norm(MplateNmm));
    if(Math.abs(Fn)>tol*forceScale||Math.abs(Mu)>tol*momentScale||Math.abs(Mv)>tol*momentScale)
     fail("کنش عضو "+action.memberId+" مؤلفه خارج از صفحه جوش دارد؛ مدل خطی دوبعدی نمی‌تواند آن را حذف یا نادیده بگیرد.");
    const demand={
     N:dot(F,u)/1000,
     V:dot(F,v)/1000,
     Mz:dot(MplateNmm,n)/1000
    };
    const line=solver.analyzeSegments({segments,N:demand.N,V:demand.V,Mz:demand.Mz});
    results.push({combinationId:String(c.combinationId),combination:String(c.combination),
     memberId:id,role:action.role,plateId:String(basePlate.id),
     demandAtPlateOrigin:{...demand,units:{N:"kN",V:"kN",Mz:"kN.mm"}},
     lineDemand:line,capacityDesigned:false,executionReady:false});
   }
  }
  return{success:true,schema:"SAHROUD-KNEE-WELD-LINE-DEMAND-1.1",
   connectionId:String(detail.connectionId),jointId:String(detail.jointId),
   method:"independent member-action scenarios; no summation between column and rafter actions",
   outOfPlaneTolerance:tol,
   demandModel:"elastic-line-group; uniform stiffness; rigid plate",
   units:{force:"kN",moment:"kN.mm",coordinates:"mm",lineDemand:"kN/mm"},
   weldDetailCheck:{overallStatus:weldDetail.overallStatus,checks:weldDetail.checks},
   results,capacityDesigned:false,executionReady:false,
   limitations:["تقاضای ستون و رفتر جداگانه گزارش می‌شود؛ جمع آن‌ها یا سهم‌بندی نیرو میان اجزای اتصال انجام نشده است.",
    "مدل فقط گروه جوش هم‌صفحه با سختی خطی یکنواخت و ورق صلب را می‌پذیرد.",
    "ظرفیت فلز جوش، فلز پایه، گلویی مؤثر، جهت‌گیری موضعی جوش، حداقل اندازه/طول، جوش بلند، انعطاف ورق و اندرکنش پیچ-جوش محاسبه نمی‌شوند."]};
 }
 const api={analyze};
 root.SahroudKneeWeldDemand=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
