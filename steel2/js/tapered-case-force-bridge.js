/* SAHROUD STEEL — synchronized tapered-member case-force bridge.
 * Rebuilds per-combination, per-segment 12-DOF force records from retained FEM results.
 * Demand traceability only; no resistance or stability design is performed.
 */
(function(root){
"use strict";
function build(model,combinationResults){
 const issues=[],modelMembers=Array.isArray(model?.members)?model.members:[],cases=Array.isArray(combinationResults)?combinationResults:[];
 const firstCaseMembers=Array.isArray(cases[0]?.members)?cases[0].members:[];
 const modelHasTaper=modelMembers.some(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 const members=modelHasTaper?modelMembers:firstCaseMembers;
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 if(!tapered.length)return {success:true,status:"no-tapered-members",physicalMemberCount:0,analysisSegmentCount:0,loadCases:[],issues,analysisEnabled:false,designApproved:false};
 if(!cases.length)issues.push("هیچ نتیجه ترکیب بار ذخیره‌شده‌ای دریافت نشد.");
 const byId=new Map();
 members.forEach(m=>{const id=String(m?.id??"");if(!id||byId.has(id))issues.push("شناسه عضو مدل خالی یا تکراری است: "+id);else byId.set(id,m);});
 const groups=new Map();
 tapered.forEach(m=>{
  const parent=String(m.parentMemberId||"");
  if(!parent){issues.push("قطعه "+m.id+" شناسه عضو فیزیکی والد ندارد.");return;}
  const count=Number(m.taperSegmentCount),index=Number(m.taperSegmentIndex);
  if(!Number.isInteger(count)||count<2||!Number.isInteger(index)||index<1||index>count)issues.push("شماره/تعداد قطعات برای "+m.id+" نامعتبر است.");
  const g=groups.get(parent)||{parentMemberId:parent,count,segments:[]};
  if(g.count!==count)issues.push("تعداد قطعات عضو "+parent+" یکسان نیست.");
  if(g.segments.some(x=>Number(x.taperSegmentIndex)===index))issues.push("شماره قطعه تکراری در عضو "+parent+": "+index);
  g.segments.push(m);groups.set(parent,g);
 });
 groups.forEach(g=>{const seen=new Set(g.segments.map(m=>Number(m.taperSegmentIndex)));for(let i=1;i<=g.count;i++)if(!seen.has(i))issues.push("قطعه "+i+" از عضو "+g.parentMemberId+" در مدل مفقود است.");});
 const loadCases=[];
 cases.forEach((c,ci)=>{
  const label=String(c?.label||c?.name||"");
  if(!label){issues.push("نتیجه ترکیب شماره "+(ci+1)+" شناسه ندارد.");return;}
  if(c.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای ترکیب "+label+" تأیید نشده است.");
  const resultMembers=Array.isArray(c.members)?c.members:[];
  const resultById=new Map();
  resultMembers.forEach(m=>{const id=String(m?.id??"");if(!id||resultById.has(id))issues.push("شناسه عضو در ترکیب "+label+" خالی یا تکراری است: "+id);else resultById.set(id,m);});
  const caseMembers=[];
  tapered.forEach(m=>{
   const id=String(m.id),rm=resultById.get(id),f=rm?.localEndForces;
   if(!rm){issues.push("عضو متغیرمقطع "+id+" در ترکیب "+label+" مفقود است.");return;}
   if(!Array.isArray(f)||f.length!==12||f.some(v=>!Number.isFinite(Number(v)))){issues.push("بردار ۱۲ مؤلفه‌ای عضو "+id+" در ترکیب "+label+" ناقص است.");return;}
   caseMembers.push({id,parentMemberId:String(m.parentMemberId),taperSegmentIndex:Number(m.taperSegmentIndex),taperSegmentCount:Number(m.taperSegmentCount),taperCoordinate:Number(m.taperCoordinate),localEndForces:f.map(Number)});
  });
  loadCases.push({label,factors:c.factors||null,windSign:c.windSign??null,equilibrium:c.equilibrium||null,members:caseMembers,complete:caseMembers.length===tapered.length});
 });
 const complete=issues.length===0&&loadCases.length===cases.length&&loadCases.every(c=>c.complete);
 return {success:complete,status:complete?"synchronized-case-forces-complete":"incomplete",physicalMemberCount:groups.size,analysisSegmentCount:tapered.length,caseCount:loadCases.length,loadCases,issues,forceComponents:["Fx_i","Fy_i","Fz_i","Mx_i","My_i","Mz_i","Fx_j","Fy_j","Fz_j","Mx_j","My_j","Mz_j"],scope:"Per-combination simultaneous end-force transfer and segment traceability only. No resistance, stability, serviceability, convergence or code approval is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const m=[1,2].map(i=>({id:"R1_TAPER_0"+i,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:i,taperSegmentCount:2}));
 const f1=[1,2,3,4,5,6,-1,-2,-3,-4,-5,-6],f2=[10,20,30,40,50,60,-10,-20,-30,-40,-50,-60];
 const good=build({members:m},[{label:"ULS-A",equilibrium:{ok:true},members:m.map((x,i)=>({id:x.id,localEndForces:i?f2:f1}))},{label:"ULS-B",equilibrium:{ok:true},members:m.map((x,i)=>({id:x.id,localEndForces:i?f1:f2}))}]);
 const missing=build({members:m},[{label:"ULS-A",equilibrium:{ok:true},members:[{id:m[0].id,localEndForces:f1}]}]);
 const bad=build({members:m},[{label:"ULS-A",equilibrium:{ok:false},members:m.map(x=>({id:x.id,localEndForces:[1,2]}))}]);
 const fallback=build({members:[{id:"R1",sectionKey:"rafter"}]},[{label:"ULS",equilibrium:{ok:true},members:m.map((x,i)=>({...x,localEndForces:i?f2:f1}))}]);
 const checks=[good.success&&good.loadCases[1].members[1].localEndForces[4]===5,good.loadCases[0].members[0].localEndForces[4]===5&&!good.designApproved,!missing.success,!bad.success,build({members:[]},[]).status==="no-tapered-members",fallback.success&&fallback.analysisSegmentCount===2];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedCaseForceBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
