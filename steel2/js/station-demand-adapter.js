/* SAHROUD STEEL — case-preserving station demand adapter.
 * Converts section-diagram rows into traceable simultaneous six-action station records.
 * No envelopes, sign reinterpretation, resistance or code approval.
 */
(function(root){"use strict";
const KEYS=["N_N","Vy_N","Vz_N","T_Nm","My_Nm","Mz_Nm"];
function build(diagrams,options){
 options=options||{};const issues=[],cases=Array.isArray(diagrams)?diagrams:[];
 if(!cases.length)issues.push("هیچ نمودار حالت بار ارائه نشده است.");
 const seenCases=new Set(),out=[];
 cases.forEach((c,ci)=>{
  const caseId=String(c?.loadCaseId||c?.caseId||"").trim();
  if(!caseId)issues.push("شناسه حالت بار در ردیف "+(ci+1)+" خالی است.");
  if(seenCases.has(caseId))issues.push("شناسه حالت بار تکراری است: "+caseId);seenCases.add(caseId);
  if(c?.success!==true)issues.push("نمودار حالت "+(caseId||ci+1)+" موفق نیست.");
  if(c?.equilibriumOk===false||c?.equilibrium?.ok===false)issues.push("تعادل حالت "+caseId+" رد شده است.");
  if(c?.units!=="N,N.m,m"&&!(c?.units?.force==="N"&&c?.units?.moment==="N.m"&&c?.units?.length==="m"))issues.push("واحدهای نمودار حالت "+caseId+" باید صریحاً N، N.m و m باشند.");
  const members=[],ids=new Set();
  const pr=Array.isArray(c?.prismaticDiagrams)?c.prismaticDiagrams:[];
  pr.forEach(m=>{
   const id=String(m?.memberId||"").trim();if(!id||ids.has(id)){issues.push("شناسه عضو منشوری خالی یا تکراری در حالت "+caseId+": "+id);return;}ids.add(id);
   const rows=mapRows(m.stations,{caseId,memberId:id,segmentId:null,segmentIndex:null,axes:m.localAxes,length:m.length_m},issues);
   members.push({memberId:id,parentMemberId:String(m.parentMemberId||id),kind:"prismatic",length_m:m.length_m,localAxes:m.localAxes||null,stations:rows,complete:rows.length===(m.stations||[]).length&&rows.length>0});
  });
  const tr=c?.taperedReport;
  if(tr){
   if(tr.success!==true)issues.push("گزارش قطعات متغیرمقطع در حالت "+caseId+" کامل نیست.");
   (tr.loadCases||[]).forEach(tc=>{
    if(String(tc.label)!==caseId)issues.push("شناسه حالت نمودار قطعات متغیرمقطع با شناسه اصلی یکسان نیست.");
    (tc.members||[]).forEach(m=>{
     const id=String(m.parentMemberId||"").trim();if(!id||ids.has(id)){issues.push("شناسه عضو متغیرمقطع خالی یا تکراری در حالت "+caseId+": "+id);return;}ids.add(id);
     const segments=[];
     (m.segments||[]).forEach(seg=>{
      const rows=mapRows(seg.stations,{caseId,memberId:id,segmentId:String(seg.segmentId||""),segmentIndex:seg.segmentIndex,axes:seg.localAxes,length:seg.length_m},issues);
      segments.push({segmentId:String(seg.segmentId||""),segmentIndex:seg.segmentIndex,startStation_m:seg.startStation_m,endStation_m:seg.endStation_m,length_m:seg.length_m,localAxes:seg.localAxes||null,stations:rows,complete:rows.length===(seg.stations||[]).length&&rows.length>0});
     });
     members.push({memberId:id,parentMemberId:id,kind:"tapered",length_m:m.totalLength_m,segmentCount:m.segmentCount,segments,complete:m.complete===true&&segments.length===m.segmentCount&&segments.every(s=>s.complete)});
    });
   });
  }
  if(!members.length)issues.push("هیچ تقاضای ایستگاهی برای حالت "+caseId+" وجود ندارد.");
  if(options.expectedMemberIds){
   const expected=new Set(options.expectedMemberIds.map(String));
   expected.forEach(id=>{if(!ids.has(id))issues.push("عضو مورد انتظار "+id+" در حالت "+caseId+" موجود نیست.");});
   ids.forEach(id=>{if(!expected.has(id))issues.push("عضو اضافی "+id+" در حالت "+caseId+" وجود دارد.");});
  }
  out.push({caseId,source:c.source||null,members,complete:members.length>0&&members.every(m=>m.complete)});
 });
 const success=issues.length===0&&out.length===cases.length&&out.every(c=>c.complete);
 return {success,status:success?"station-demands-complete-per-case":"insufficient_data",cases:out,issues,components:["N","Vy","Vz","T","My","Mz"],units:{force:"N",moment:"N.m",length:"m"},concurrencyPreserved:true,independentEnvelopeMixing:false,signConvention:"Raw section-diagram sign convention is retained unchanged; no code-design sign conversion is performed.",capacityCalculated:false,designApproved:false,readyForCodeDesign:false,limitations:["Each station retains all six simultaneous actions from the same load case and same section-diagram row.","No component-wise envelope or cross-case mixing is performed.","Tapered segments remain separate; local axes are retained and station coordinates are physical-member coordinates.","No capacity, stability, serviceability, fatigue or code compliance is calculated."]};
}
function mapRows(rows,meta,issues){
 if(!Array.isArray(rows)||!rows.length){issues.push("ایستگاه‌های عضو "+meta.memberId+" در حالت "+meta.caseId+" خالی است.");return [];}
 const seen=new Set(),out=[];
 rows.forEach((r,i)=>{
  const x=Number(r?.memberStation_m??r?.x_m);
  if(!Number.isFinite(x)||x<0){issues.push("مختصات ایستگاه "+i+" عضو "+meta.memberId+" نامعتبر است.");return;}
  const local=Number(r?.x_m);
  const key=(meta.segmentId||"whole")+":"+String(local);
  if(seen.has(key)){issues.push("ایستگاه تکراری در عضو "+meta.memberId+" / "+key);return;}seen.add(key);
  if(KEYS.some(k=>typeof r?.[k]!=="number"||!Number.isFinite(r[k]))){issues.push("شش مؤلفه همزمان در ایستگاه "+key+" عضو "+meta.memberId+" کامل نیست.");return;}
  out.push({stationId:meta.caseId+"|"+meta.memberId+"|"+key,caseId:meta.caseId,memberId:meta.memberId,segmentId:meta.segmentId,segmentIndex:meta.segmentIndex,xLocal_m:Number.isFinite(local)?local:null,xMember_m:x,localAxes:meta.axes||null,actions:{N:r.N_N,Vy:r.Vy_N,Vz:r.Vz_N,T:r.T_Nm,My:r.My_Nm,Mz:r.Mz_Nm},sourceRow:{...r},units:{force:"N",moment:"N.m",length:"m"}});
 });
 return out;
}
function selfTest(){
 const row=(x,extra={})=>({x_m:x,N_N:1,Vy_N:2,Vz_N:3,T_Nm:4,My_Nm:5,Mz_Nm:6,...extra});
 const base={success:true,loadCaseId:"LC1",source:{document:"fixture"},units:"N,N.m,m",prismaticDiagrams:[{memberId:"M1",parentMemberId:"M1",length_m:2,localAxes:{x:[1,0,0]},stations:[row(0),row(2)]}]};
 const good=build([base],{expectedMemberIds:["M1"]});
 const other=build([{...base,loadCaseId:"LC2",prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[row(0,{My_Nm:99}),row(2,{My_Nm:88})]}]}]);
 const missing=build([{...base,success:false}]);
 const duplicate=build([{...base,prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[row(0),row(0)]}]}]);
 const incomplete=build([{...base,prismaticDiagrams:[{...base.prismaticDiagrams[0],stations:[{...row(0),Mz_Nm:NaN}]}]}]);
 const noUnits=build([{...base,units:null}]);
 const tapered=build([{success:true,loadCaseId:"T1",units:"N,N.m,m",prismaticDiagrams:[],taperedReport:{success:true,loadCases:[{label:"T1",members:[{parentMemberId:"R1",totalLength_m:5,segmentCount:2,complete:true,segments:[{segmentId:"S1",segmentIndex:1,startStation_m:0,endStation_m:2,length_m:2,stations:[{...row(0),memberStation_m:0},{...row(2),memberStation_m:2}]},{segmentId:"S2",segmentIndex:2,startStation_m:2,endStation_m:5,length_m:3,stations:[{...row(0),memberStation_m:2},{...row(3),memberStation_m:5}]}]}]}]}}]);
 const tests=[good.success&&good.cases[0].members[0].stations[0].actions.My===5,good.cases[0].members[0].stations[0].localAxes.x[0]===1,good.cases[0].members[0].stations[0].actions.My===5&&other.cases[0].members[0].stations[0].actions.My===99,good.cases.length===1&&good.cases[0].caseId==="LC1",!missing.success,!duplicate.success,!incomplete.success,!noUnits.success,tapered.success&&tapered.cases[0].members[0].segments[1].stations[0].xMember_m===2&&!tapered.cases[0].members[0].segments[1].stations[0].segmentId===false,!good.designApproved&&good.independentEnvelopeMixing===false];
 return {passed:tests.filter(Boolean).length,failed:tests.filter(x=>!x).length,total:tests.length,tests};
}
root.SteelStationDemandAdapter={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
