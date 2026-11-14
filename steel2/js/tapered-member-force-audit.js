(function(root){
"use strict";
const forceKeys=["Fx_i","Fy_i","Fz_i","Mx_i","My_i","Mz_i","Fx_j","Fy_j","Fz_j","Mx_j","My_j","Mz_j"];
function audit(result){
 const issues=[],members=Array.isArray(result?.members)?result.members:[];
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null||m.parentMemberId));
 if(!tapered.length)return {success:true,status:"no-tapered-members",physicalMemberCount:0,analysisElementCount:0,issues,rows:[],analysisEnabled:false,designApproved:false};
 const groups=new Map();
 for(const m of tapered){
  const parent=String(m.parentMemberId||"");
  if(!parent){issues.push("قطعه "+String(m.id)+" شناسه عضو فیزیکی والد ندارد.");continue;}
  const g=groups.get(parent)||{parentMemberId:parent,declaredCount:Number(m.taperSegmentCount),segments:[]};
  if(!Number.isInteger(g.declaredCount)||g.declaredCount<2)issues.push("تعداد قطعات اعلام‌شده برای "+parent+" نامعتبر است.");
  if(Number(m.taperSegmentCount)!==g.declaredCount)issues.push("تعداد قطعات در عضو "+parent+" یکسان نیست.");
  g.segments.push(m);groups.set(parent,g);
 }
 const rows=[];
 for(const g of groups.values()){
  const seen=new Set();
  for(const m of g.segments){
   const index=Number(m.taperSegmentIndex);
   if(!Number.isInteger(index)||index<1||index>g.declaredCount)issues.push("شماره قطعه "+String(m.id)+" خارج از بازه است.");
   if(seen.has(index))issues.push("شماره قطعه تکراری در عضو "+g.parentMemberId+": "+index);
   seen.add(index);
   if(!Number.isFinite(Number(m.taperCoordinate))||m.taperCoordinate<0||m.taperCoordinate>1)issues.push("مختصات نسبی مقطع در "+String(m.id)+" نامعتبر است.");
   const d=m.taperDimensions||m.taperProperties?.dimensions;
   if(!d||["d","bf","tw","tf"].some(k=>!(Number.isFinite(Number(d[k]))&&Number(d[k])>0)))issues.push("ابعاد مقطع ایستگاه برای "+String(m.id)+" ناقص است.");
   const s=m.section||{};
   for(const k of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(Number(s[k]))&&Number(s[k])>0))issues.push("خاصیت "+k+" در قطعه "+String(m.id)+" معتبر نیست.");
   const f=Array.isArray(m.localEndForces)?m.localEndForces:[];
   if(f.length!==12||f.some(v=>!Number.isFinite(Number(v))))issues.push("بردار نیروهای دو انتهای قطعه "+String(m.id)+" کامل نیست.");
   if(!Array.isArray(m.analysisLoad?.uniformLocal)||m.analysisLoad.uniformLocal.length!==3||m.analysisLoad.uniformLocal.some(v=>!Number.isFinite(Number(v))))issues.push("بار محلی عضو "+String(m.id)+" ثبت نشده است.");
  }
  for(let i=1;i<=g.declaredCount;i++)if(!seen.has(i))issues.push("قطعه "+i+" از عضو "+g.parentMemberId+" در نتیجه تحلیل وجود ندارد.");
  const ordered=g.segments.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex));
  rows.push({parentMemberId:g.parentMemberId,declaredSegmentCount:g.declaredCount,reportedSegmentCount:g.segments.length,segmentIndices:ordered.map(m=>Number(m.taperSegmentIndex)),stationCoordinates:ordered.map(m=>Number(m.taperCoordinate)),complete:seen.size===g.declaredCount&&g.segments.length===g.declaredCount});
 }
 return {success:issues.length===0,status:issues.length?"incomplete":"demand-trace-complete",physicalMemberCount:groups.size,analysisElementCount:tapered.length,issues,rows,forceComponents:forceKeys,scope:"Per-analysis-case traceability of tapered member segments and simultaneous 12-component end forces. No resistance, stability, convergence or code approval is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const seg=(id,i)=>({id,parentMemberId:"R1",taperSegmentIndex:i,taperSegmentCount:2,taperApplied:true,taperCoordinate:(i-.5)/2,taperDimensions:{d:500-i*50,bf:200,tw:8,tf:12},section:{E:2e11,G:7.7e10,A:.01,Iy:1e-5,Iz:1e-4,J:1e-6},localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0]}});
 const good=audit({members:[seg("R1_TAPER_01",1),seg("R1_TAPER_02",2)]});
 const missing=audit({members:[seg("R1_TAPER_01",1)]});
 const duplicate=audit({members:[seg("R1_TAPER_01",1),seg("R1_TAPER_02",1)]});
 const bad=seg("R1_TAPER_02",2);bad.localEndForces=[0];
 const malformed=audit({members:[seg("R1_TAPER_01",1),bad]});
 const checks=[good.success&&good.physicalMemberCount===1&&good.analysisElementCount===2,!missing.success,!duplicate.success,!malformed.success,!good.designApproved&&!good.analysisEnabled];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelTaperedMemberForceAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
