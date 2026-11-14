/* SAHROUD STEEL — per-case section-force diagrams for segmented tapered members.
 * Each analysis segment is reconstructed independently using its own 12-DOF end
 * actions, physical length and explicitly certified complete local uniform-load ledger.
 * No segment envelope mixing, capacity check or design approval.
 */
(function(root){
"use strict";
function build(model,caseResults,options){
 options=options||{};
 const issues=[],nodes=new Map((Array.isArray(model?.nodes)?model.nodes:[]).map(n=>[String(n.id),n]));
 const modelMembers=Array.isArray(model?.members)?model.members:[];
 const tapered=modelMembers.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 const cases=Array.isArray(caseResults)?caseResults:[];
 if(!tapered.length)return {success:true,status:"no-tapered-members",members:[],loadCases:[],issues,analysisEnabled:false,designApproved:false};
 if(!root.SteelMemberSectionForces?.reconstruct){return {success:false,status:"missing-dependency",members:[],loadCases:[],issues:["بازسازی‌کننده نمودار عضو منشوری بارگذاری نشده است."],analysisEnabled:false,designApproved:false};}
 if(!cases.length)issues.push("نتیجه هیچ ترکیب باری دریافت نشده است.");
 const groups=new Map();
 for(const m of tapered){
  const parent=String(m.parentMemberId||"");
  const count=Number(m.taperSegmentCount),index=Number(m.taperSegmentIndex);
  if(!parent)issues.push("قطعه "+String(m.id)+" شناسه عضو فیزیکی والد ندارد.");
  if(!Number.isInteger(count)||count<2||!Number.isInteger(index)||index<1||index>count)issues.push("شماره/تعداد قطعات "+String(m.id)+" نامعتبر است.");
  const g=groups.get(parent)||{parentMemberId:parent,count,segments:[]};
  if(g.count!==count)issues.push("تعداد قطعات عضو "+parent+" یکسان نیست.");
  if(g.segments.some(x=>Number(x.taperSegmentIndex)===index))issues.push("شماره قطعه تکراری در عضو "+parent+": "+index);
  g.segments.push(m);groups.set(parent,g);
 }
 const prepared=[];
 for(const g of groups.values()){
  const ordered=g.segments.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex));
  if(ordered.length!==g.count)issues.push("تعداد قطعات عضو "+g.parentMemberId+" با تعداد اعلام‌شده برابر نیست.");
  for(let i=0;i<g.count;i++)if(Number(ordered[i]?.taperSegmentIndex)!==i+1)issues.push("قطعه "+(i+1)+" عضو "+g.parentMemberId+" مفقود است.");
  let offset=0,previousEnd=null;
  const segments=ordered.map(m=>{
   const a=nodes.get(String(m.start)),b=nodes.get(String(m.end));
   if(!a||!b){issues.push("گره ابتدا/انتها برای "+String(m.id)+" پیدا نشد.");return null;}
   if(previousEnd!==null&&String(m.start)!==previousEnd)issues.push("اتصال هندسی قطعات عضو "+g.parentMemberId+" در قطعه "+String(m.id)+" پیوسته نیست.");
   previousEnd=String(m.end);
   const xyz=[a.x,a.y,a.z,b.x,b.y,b.z].map(Number);
   if(!xyz.every(Number.isFinite)){issues.push("مختصات هندسی قطعه "+String(m.id)+" نامعتبر است.");return null;}
   const length=Math.hypot(xyz[3]-xyz[0],xyz[4]-xyz[1],xyz[5]-xyz[2]);
   if(!(Number.isFinite(length)&&length>0)){issues.push("طول واقعی قطعه "+String(m.id)+" مثبت نیست.");return null;}
   if(Number.isFinite(Number(m.length))&&Math.abs(Number(m.length)-length)>1e-8*Math.max(1,length))issues.push("طول ثبت‌شده قطعه "+String(m.id)+" با مختصات گره‌ها سازگار نیست.");
   const item={modelMember:m,length,startStation_m:offset,endStation_m:offset+length};
   offset+=length;return item;
  });
  prepared.push({parentMemberId:g.parentMemberId,segmentCount:g.count,totalLength_m:offset,segments});
 }
 const labels=cases.map(c=>String(c?.label||c?.name||"").trim());
 if(labels.some(x=>!x))issues.push("نام هر ترکیب بار باید صریحاً ثبت شده باشد.");
 if(new Set(labels).size!==labels.length)issues.push("نام ترکیبات بار باید یکتا باشد.");
 const loadCases=[];
 cases.forEach((c,caseIndex)=>{
  const label=labels[caseIndex],resultMembers=Array.isArray(c?.members)?c.members:[];
  if(c?.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای ترکیب "+(label||caseIndex+1)+" تأیید نشده است.");
  const byId=new Map();
  resultMembers.forEach(m=>{const id=String(m?.id??"");if(!id||byId.has(id))issues.push("شناسه عضو در ترکیب "+label+" خالی یا تکراری است: "+id);else byId.set(id,m);});
  const memberDiagrams=[];
  prepared.forEach(group=>{
   const segmentDiagrams=[];
   group.segments.forEach(seg=>{
    if(!seg)return;
    const m=seg.modelMember,id=String(m.id),solved=byId.get(id);
    if(!solved){issues.push("قطعه "+id+" در ترکیب "+label+" نتیجه تحلیل ندارد.");return;}
    const ledger=solved.analysisLoad||m.analysisLoad||{};
    const explicitlyComplete=ledger.loadDataComplete===true||solved.loadDataComplete===true||m.loadDataComplete===true||options.loadCompletenessByMember?.[id]===true;
    if(!explicitlyComplete){issues.push("کامل‌بودن دفتر بارگذاری روی طول قطعه "+id+" در ترکیب "+label+" صریحاً تأیید نشده است.");return;}
    const uniform=ledger.uniformLocal;
    if(!Array.isArray(uniform)||uniform.length!==3||!uniform.every(v=>Number.isFinite(Number(v)))){issues.push("بردار بار گسترده محلی قطعه "+id+" در ترکیب "+label+" ناقص است.");return;}
    const pointLoads=ledger.pointLoads||solved.pointLoads||m.pointLoads||[];
    const distributedLoads=ledger.distributedLoads||solved.distributedLoads||m.distributedLoads||[];
    if(!Array.isArray(pointLoads)||pointLoads.length||!Array.isArray(distributedLoads)||distributedLoads.length){issues.push("بار متمرکز/غیریکنواخت قطعه "+id+" در این بازسازی پشتیبانی نمی‌شود.");return;}
    const reconstructed=root.SteelMemberSectionForces.reconstruct({
     length:seg.length,localEndForces:solved.localEndForces,
     loadDataComplete:true,prismatic:true,uniformLocal:uniform.map(Number),
     pointLoads:[],distributedLoads:[],endReleases:m.endReleases,endOffsets:m.endOffsets
    },options.diagramOptions||{});
    if(!reconstructed.ok){issues.push("بازسازی نمودار قطعه "+id+" در ترکیب "+label+" ناموفق است: "+reconstructed.reason);return;}
    segmentDiagrams.push({segmentId:id,segmentIndex:Number(m.taperSegmentIndex),startStation_m:seg.startStation_m,endStation_m:seg.endStation_m,length_m:seg.length,localAxes:m.localAxes||solved.localAxes||null,section:m.section||solved.section||null,stations:reconstructed.stations.map(row=>({...row,memberStation_m:seg.startStation_m+row.x_m})),checks:reconstructed.checks,method:reconstructed.method});
   });
   memberDiagrams.push({parentMemberId:group.parentMemberId,totalLength_m:group.totalLength_m,segmentCount:group.segmentCount,segments:segmentDiagrams,complete:segmentDiagrams.length===group.segmentCount});
  });
  loadCases.push({label,equilibrium:c?.equilibrium||null,members:memberDiagrams,complete:memberDiagrams.length===prepared.length&&memberDiagrams.every(m=>m.complete)});
 });
 const success=issues.length===0&&loadCases.length===cases.length&&loadCases.every(c=>c.complete);
 return {success,status:success?"complete-per-case-segment-diagrams":"insufficient_data",physicalMemberCount:prepared.length,analysisSegmentCount:tapered.length,caseCount:loadCases.length,loadCases,issues,scope:"Independent segment diagrams for each named load combination. Local axes and segment boundaries are retained; values are not enveloped across combinations or across segment-local axes. No member capacity, stability, serviceability, convergence or code approval is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const n=[{id:"n0",x:0,y:0,z:0},{id:"n1",x:2,y:0,z:0},{id:"n2",x:5,y:0,z:0}];
 const make=(id,i,start,end,length)=>({id,start,end,length,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:i,taperSegmentCount:2,analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}});
 const m=[make("R1_TAPER_01",1,"n0","n1",2),make("R1_TAPER_02",2,"n1","n2",3)];
 const solved=(id)=>({id,localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0],loadDataComplete:true}});
 const cases=[{label:"ULS-A",equilibrium:{ok:true},members:m.map(x=>solved(x.id))},{label:"ULS-B",equilibrium:{ok:true},members:m.map(x=>solved(x.id))}];
 const good=build({nodes:n,members:m},cases);
 const noLedger=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:m.map(x=>({id:x.id,localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0]}}))}]);
 const missing=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:[solved(m[0].id)]}]);
 const broken=build({nodes:n,members:[m[0],{...m[1],start:"n0"}]},cases.slice(0,1));
 const badEq=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:false},members:m.map(x=>solved(x.id))}]);
 const point=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:m.map(x=>({...solved(x.id),pointLoads:[{x_m:1}]}))}]);
 const duplicate=build({nodes:n,members:m},[{label:"ULS",equilibrium:{ok:true},members:m.map(x=>solved(x.id))},{label:"ULS",equilibrium:{ok:true},members:m.map(x=>solved(x.id))}]);
 const checks=[
  good.success&&good.loadCases.length===2&&good.loadCases[0].members[0].segments[1].stations[0].memberStation_m===2,
  good.loadCases[0].members[0].segments.length===2&&good.loadCases[1].label==="ULS-B",
  !noLedger.success&&noLedger.issues.some(x=>x.includes("کامل‌بودن دفتر بارگذاری")),
  !missing.success,
  !broken.success,
  !badEq.success,
  !point.success,
  !duplicate.success,
  !good.designApproved&&!good.analysisEnabled
 ];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedSectionForceDiagram={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
