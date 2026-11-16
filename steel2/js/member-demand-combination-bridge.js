/* SAHROUD STEEL — explicit, case-preserving member demand combination proposal.
 * Applies engineer-entered factors only when every referenced case has matching
 * member/station topology, coordinates, local axes and six concurrent actions.
 * Linear superposition assumptions are declarations, not independent validation.
 */
(function(root){"use strict";
const ACTIONS=["N","Vy","Vz","T","My","Mz"];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const txt=v=>String(v??"").trim();
function stable(v){
 if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
 if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";
 return JSON.stringify(v);
}
function flatten(member){
 if(member?.kind==="prismatic")return (member.stations||[]).map(s=>({station:s,segmentId:null,segmentIndex:null}));
 if(member?.kind==="tapered")return (member.segments||[]).flatMap(seg=>(seg.stations||[]).map(s=>({station:s,segmentId:seg.segmentId,segmentIndex:seg.segmentIndex})));
 return [];
}
function topologyKey(x){
 const s=x.station;
 return [x.segmentId||"whole",s.xLocal_m,s.xMember_m,stable(s.localAxes||null)].join("|");
}
function build(demandPackage,combinationSet,assumptions){
 const issues=[],p=demandPackage||{},set=combinationSet||{},a=assumptions||{};
 if(p.success!==true)issues.push("بسته تقاضای ایستگاهی باید با موفقیت و بدون نقص ساخته شده باشد.");
 if(p.designApproved!==false||p.designGate?.designApproved!==false)issues.push("وضعیت بسته تقاضا باید صریحاً غیرتأییدشده باشد.");
 if(p.concurrencyPreserved!==true||p.caseSeparationPreserved!==true)issues.push("حفظ هم‌زمانی و جدایی حالت‌ها در بسته تقاضا احراز نشده است.");
 const members=Array.isArray(p.members)?p.members:[];
 const loadCases=Array.isArray(set.loadCases)?set.loadCases:[];
 const combinations=Array.isArray(set.combinations)?set.combinations:[];
 if(!members.length)issues.push("هیچ عضو فیزیکی در بسته تقاضا وجود ندارد.");
 if(!loadCases.length)issues.push("فهرست حالت‌های بار مستند خالی است.");
 const packageCaseIds=Array.isArray(p.caseIds)?p.caseIds.map(txt):[];
 const caseIds=new Set();
 loadCases.forEach(c=>{const id=txt(c?.id);if(!id)issues.push("حالت بار بدون شناسه است.");if(caseIds.has(id))issues.push("شناسه حالت بار تکراری است: "+id);caseIds.add(id);if(!packageCaseIds.includes(id))issues.push("حالت بار "+id+" در بسته تقاضا موجود نیست.");});
 const registryInput={loadCases:loadCases.map(c=>({id:c.id,category:c.category||"evidence"})),combinations};
 const registry=root.SteelLoadCombinationRegistry?.auditDefinitions?.(registryInput);
 if(!registry)issues.push("رجیستری ترکیب بار بارگذاری نشده است.");
 else issues.push(...registry.issues);
 if(!combinations.length)issues.push("هیچ ترکیب باری برای اعمال ضرایب ارائه نشده است.");
 const assumptionKeys=["sameModelRevision","sameGeometry","sameSupports","sameStiffnessModel","linearElasticFirstOrder"];
 assumptionKeys.forEach(k=>{if(a[k]!==true)issues.push("فرض تحلیل برای ترکیب خطی صریحاً تأیید نشده است: "+k);});
 const memberMaps=new Map();
 members.forEach(m=>{
  const id=txt(m?.memberId);if(!id||memberMaps.has(id)){issues.push("شناسه عضو خالی یا تکراری: "+id);return;}
  if(m.complete!==true)issues.push("تقاضای عضو "+id+" ناقص است.");
  const byCase=new Map();
  (m.cases||[]).forEach(c=>{const cid=txt(c?.caseId);if(!cid||byCase.has(cid)){issues.push("حالت تکراری/بی‌نام برای عضو "+id+": "+cid);return;}byCase.set(cid,c);});
  memberMaps.set(id,byCase);
 });
 const proposals=[];
 if(!issues.length){
  combinations.forEach(combo=>{
   const comboId=txt(combo.id),factors=combo.factors||{},factorIds=Object.keys(factors);
   const memberResults=[];
   members.forEach(m=>{
    const id=txt(m.memberId),byCase=memberMaps.get(id),selected=factorIds.map(cid=>({caseId:cid,entry:byCase.get(cid)}));
    selected.forEach(x=>{if(!x.entry)issues.push("حالت "+x.caseId+" برای عضو "+id+" موجود نیست.");});
    if(selected.some(x=>!x.entry))return;
    const shapes=selected.map(x=>{
     const e=x.entry,flat=flatten(e),map=new Map();
     if(e.complete!==true)issues.push("حالت "+x.caseId+" برای عضو "+id+" کامل نیست.");
     if(!flat.length)issues.push("ایستگاه‌های عضو "+id+" در حالت "+x.caseId+" خالی/ناشناخته است.");
     flat.forEach(z=>{
      const s=z.station,key=topologyKey(z);
      if(!finite(s?.xLocal_m)||!finite(s?.xMember_m))issues.push("مختصات ایستگاه عضو "+id+" در حالت "+x.caseId+" معتبر نیست.");
      if(map.has(key))issues.push("ایستگاه تکراری/هم‌مختصات در عضو "+id+" و حالت "+x.caseId+" شناسایی شد.");
      else map.set(key,z);
     });
     return {caseId:x.caseId,flat,map};
    });
    const ref=shapes[0],refKeys=ref?Array.from(ref.map.keys()):[];
    shapes.slice(1).forEach(s=>{
     if(s.map.size!==refKeys.length||refKeys.some(k=>!s.map.has(k)))issues.push("توپولوژی، مختصات، قطعه‌بندی یا محورهای محلی عضو "+id+" بین حالت‌ها یکسان نیست.");
    });
    if(issues.length||!ref)return;
    const stations=ref.flat.map(z=>{
     const key=topologyKey(z),sum={N:0,Vy:0,Vz:0,T:0,My:0,Mz:0};
     selected.forEach(x=>{
      const found=byCase.get(x.caseId),row=flatten(found).find(v=>topologyKey(v)===key)?.station;
      const factor=factors[x.caseId];
      if(!row||!row.actions||ACTIONS.some(k=>!finite(row.actions[k]))){issues.push("شش مؤلفه همزمان در عضو "+id+"، ایستگاه "+key+" برای ترکیب "+comboId+" ناقص است.");return;}
      ACTIONS.forEach(k=>sum[k]+=factor*row.actions[k]);
     });
     return {stationId:comboId+"|"+id+"|"+key,memberId:id,kind:m.cases[0]?.kind||null,segmentId:z.segmentId,segmentIndex:z.segmentIndex,xLocal_m:z.station.xLocal_m,xMember_m:z.station.xMember_m,localAxes:z.station.localAxes||null,actions:sum,units:{force:"N",moment:"N.m",length:"m"},sourceCaseIds:factorIds.slice(),concurrencyPreserved:true};
    });
    memberResults.push({memberId:id,stations,complete:stations.length===ref.flat.length});
   });
   proposals.push({combinationId:comboId,source:{...combo.source},factors:{...factors},members:memberResults,linearSuperpositionProposal:true,designApproved:false});
  });
 }
 const success=issues.length===0&&proposals.length===combinations.length;
 const result={success,status:success?"linear-combination-demand-proposal":"insufficient_data",proposals,issues,assumptions:{...a},assumptionsIndependentlyVerified:false,sourceCombinationAudit:registry?{success:registry.success,issues:registry.issues.slice()}:null,concurrencyPreserved:true,caseSpecificVectorsRetainedAsSources:true,componentWiseEnvelopeMixing:false,capacityCalculated:false,designApproved:false,readyForCodeDesign:false,limitations:["ضرایب فقط از ورودی صریح کاربر/طراح گرفته می‌شوند؛ هیچ ضریب آیین‌نامه‌ای تولید نمی‌شود.","جمع خطی فقط یک پیشنهاد محاسباتی است و فرض‌های یکسان‌بودن مدل و تحلیل خطی را مستقلاً اثبات نمی‌کند.","تطابق شناسه، مختصات، قطعه‌بندی و محورهای محلی در ایستگاه‌ها الزامی است.","هیچ پوش مؤلفه‌ای ساخته نمی‌شود؛ بردار شش‌گانه هر ایستگاه در یک ترکیب حفظ می‌شود.","اثر مرتبه دوم، تحلیل غیرخطی، تغییر وضعیت تماس/تکیه‌گاه، ظرفیت، کمانش، اندرکنش و کنترل آیین‌نامه‌ای محاسبه نمی‌شود."]};
 return result;
}
function selfTest(){
 const src={code:"M6",edition:"1401",clause:"user-verified",document:"project-approved-basis"};
 const mk=(id,scale)=>({memberId:"M1",complete:true,cases:[{caseId:id,kind:"prismatic",complete:true,stations:[{xLocal_m:0,xMember_m:0,localAxes:{x:[1,0,0]},actions:{N:10*scale,Vy:2*scale,Vz:3*scale,T:4*scale,My:5*scale,Mz:6*scale}},{xLocal_m:2,xMember_m:2,localAxes:{x:[1,0,0]},actions:{N:20*scale,Vy:4*scale,Vz:6*scale,T:8*scale,My:10*scale,Mz:12*scale}}]}]});
 const pkg={success:true,designApproved:false,concurrencyPreserved:true,caseSeparationPreserved:true,caseIds:["D","W"],members:[{memberId:"M1",complete:true,cases:[mk("D",1).cases[0],mk("W",2).cases[0]]}],designGate:{designApproved:false}};
 const combos={loadCases:[{id:"D",category:"dead"},{id:"W",category:"wind"}],combinations:[{id:"C1",factors:{D:1.2,W:1},source:src}]};
 const assumptions={sameModelRevision:true,sameGeometry:true,sameSupports:true,sameStiffnessModel:true,linearElasticFirstOrder:true};
 const ok=build(pkg,combos,assumptions);
 const t=[
  ["valid matching station vectors combined",()=>ok.success&&ok.proposals[0].members[0].stations[0].actions.N===32&&ok.proposals[0].members[0].stations[0].actions.Mz===19.2],
  ["source case IDs and explicit factors retained",()=>ok.proposals[0].factors.D===1.2&&ok.proposals[0].members[0].stations[0].sourceCaseIds.length===2],
  ["missing assumptions fail closed",()=>!build(pkg,combos,{}).success],
  ["missing code source rejected",()=>{const x=JSON.parse(JSON.stringify(combos));delete x.combinations[0].source.clause;return !build(pkg,x,assumptions).success;}],
  ["unknown factor case rejected",()=>{const x=JSON.parse(JSON.stringify(combos));x.combinations[0].factors.X=1;return !build(pkg,x,assumptions).success;}],
  ["missing member case rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases.pop();return !build(x,combos,assumptions).success;}],
  ["station coordinate mismatch rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[1].xMember_m=2.1;return !build(x,combos,assumptions).success;}],
  ["duplicate station topology rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[1].xLocal_m=0;x.members[0].cases[1].stations[1].xMember_m=0;return !build(x,combos,assumptions).success;}],
  ["non-finite station coordinate rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[0].xLocal_m=NaN;return !build(x,combos,assumptions).success;}],
  ["local axis mismatch rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.members[0].cases[1].stations[0].localAxes.x=[0,1,0];return !build(x,combos,assumptions).success;}],
  ["incomplete concurrent vector rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));delete x.members[0].cases[1].stations[0].actions.Mz;return !build(x,combos,assumptions).success;}],
  ["failed demand package rejected",()=>{const x=JSON.parse(JSON.stringify(pkg));x.success=false;return !build(x,combos,assumptions).success;}],
  ["design approval never granted",()=>ok.designApproved===false&&ok.readyForCodeDesign===false&&ok.proposals.every(c=>c.designApproved===false)],
  ["no component envelope is generated",()=>ok.componentWiseEnvelopeMixing===false&&ok.proposals[0].members[0].stations[0].concurrencyPreserved===true]
 ];
 const results=t.map(([name,fn])=>({name,ok:!!fn()}));
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelMemberDemandCombinationBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
