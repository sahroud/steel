/* SAHROUD STEEL — numerical runway-girder reaction to bracket/column demand bridge.
 * Consumes solved runway FEM support reactions; requires explicit, surveyed global geometry.
 * Sign convention: supportReaction_N is the spring force acting ON the runway beam.
 * The equal/opposite beam force ON the bracket/column is -supportReaction_N * verticalUnitVector_global.
 * Coordinates m, forces N, moments N.m. No design approval.
 */
(function(root){"use strict";
const v3=v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(Number(x)));
const close=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=Math.max(1e-7,Math.max(Math.abs(Number(a)),Math.abs(Number(b)))*1e-9);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function audit(runwayResult,mappings,options){
 const issues=[],demands=[],mapRows=Array.isArray(mappings)?mappings:[],axis=options?.verticalUnitVector_global;
 if(runwayResult?.success!==true)issues.push("نتیجه تحلیل تیر حمال موفق و معتبر نیست.");
 if(!Array.isArray(runwayResult?.cases?.left)||!Array.isArray(runwayResult?.cases?.right)||!runwayResult.cases.left.length||runwayResult.cases.left.length!==runwayResult.cases.right.length)issues.push("حالات حل‌شده دو تیر حمال باید کامل و هم‌شمار باشند.");
 if(!v3(axis)||!close(Math.hypot(...(axis||[])),1))issues.push("بردار واحد قائم در دستگاه مختصات global باید صریحاً با طول واحد ثبت شود.");
 if(!mapRows.length)issues.push("نقشه تطبیق براکت‌ها با ایستگاه‌های تیر حمال ارائه نشده است.");
 const keys=new Set();
 mapRows.forEach((m,i)=>{
  const key=String(m?.side||"")+"|"+String(m?.station??"")+"|"+String(m?.connectionId||"");
  if(!["left","right"].includes(m?.side))issues.push("ردیف نقشه "+(i+1)+": سمت تیر باید left یا right باشد.");
  if(!Number.isInteger(Number(m?.station))||Number(m.station)<1)issues.push("ردیف نقشه "+(i+1)+": شماره ایستگاه باید عدد صحیح مثبت باشد.");
  if(!String(m?.connectionId||"").trim()||!String(m?.columnNodeId||"").trim())issues.push("ردیف نقشه "+(i+1)+": شناسه اتصال و گره ستون الزامی است.");
  if(keys.has(key))issues.push("ردیف نقشه "+(i+1)+": نگاشت براکت/ایستگاه تکراری است.");keys.add(key);
  if(!Number.isFinite(Number(m?.x_m))||Number(m.x_m)<0)issues.push("ردیف نقشه "+(i+1)+": مختصات طولی براکت نامعتبر است.");
  if(!v3(m?.connectionCoordinate_m)||!v3(m?.columnNodeCoordinate_m))issues.push("ردیف نقشه "+(i+1)+": مختصات سه‌بعدی نقطه اتصال و گره ستون باید از مدل/نقشه وارد شود.");
  if(m?.coordinateSystem!=="global")issues.push("ردیف نقشه "+(i+1)+": دستگاه مختصات باید global باشد.");
  if(!String(m?.source||"").trim()||!String(m?.document||"").trim())issues.push("ردیف نقشه "+(i+1)+": مرجع هندسه و سند/شماره نقشه الزامی است.");
 });
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,designApproved:false,demands:[],issues};
 const left=runwayResult.cases.left,right=runwayResult.cases.right;
 const leftKeys=left.map(x=>String(x.caseId??x.caseIndex)),rightKeys=right.map(x=>String(x.caseId??x.caseIndex));
 if(new Set(leftKeys).size!==leftKeys.length||new Set(rightKeys).size!==rightKeys.length||leftKeys.some((k,i)=>k!==rightKeys[i]))issues.push("شناسه و ترتیب حالات چپ/راست تیر حمال هم‌خوانی یک‌به‌یک ندارد.");
 const demandApi=root.SteelCraneBracketColumnDemandTransfer;
 if(!demandApi?.audit)issues.push("ممیزی شش‌مؤلفه‌ای تقاضای براکت به ستون بارگذاری نشده است.");
 const supportRows=[...left.map((c,i)=>({side:"left",caseRow:c,caseKey:leftKeys[i]})),...right.map((c,i)=>({side:"right",caseRow:c,caseKey:rightKeys[i]}))];
 supportRows.forEach(({side,caseRow,caseKey})=>{
  const supports=caseRow?.result?.supports;
  if(!Array.isArray(supports)||!supports.length){issues.push("حالت "+caseKey+" تیر "+side+" فاقد واکنش‌های تکیه‌گاهی حل‌شده است.");return;}
  const sideMaps=mapRows.filter(m=>m.side===side);
  if(sideMaps.length!==supports.length){issues.push("تعداد نگاشت براکت‌های "+side+" با تعداد تکیه‌گاه‌های FEM برابر نیست؛ نگاشت ناقص/اضافی مسدود شد.");return;}
  const used=new Set();
  supports.forEach(s=>{
   const m=sideMaps.find(x=>Number(x.station)===Number(s.station));
   if(!m){issues.push("حالت "+caseKey+" تیر "+side+": براکت متناظر با ایستگاه "+s.station+" یافت نشد.");return;}
   if(used.has(Number(m.station))){issues.push("حالت "+caseKey+" تیر "+side+": نگاشت ایستگاه تکراری است.");return;}used.add(Number(m.station));
   if(!close(m.x_m,s.x_m))issues.push("حالت "+caseKey+" تیر "+side+" ایستگاه "+s.station+": مختصات طولی FEM و براکت یکسان نیست.");
   if(!Number.isFinite(Number(s.verticalReaction_N)))issues.push("واکنش قائم ایستگاه "+s.station+" در حالت "+caseKey+" عددی نیست.");
  });
  if(used.size!==supports.length)issues.push("همه واکنش‌های FEM به یک براکت یکتا نگاشت نشده‌اند.");
 });
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,designApproved:false,demands:[],issues};
 const raw=[];
 supportRows.forEach(({side,caseRow,caseKey})=>caseRow.result.supports.forEach(s=>{
  const m=mapRows.find(x=>x.side===side&&Number(x.station)===Number(s.station));
  const R=Number(s.verticalReaction_N),F=axis.map(v=>-R*Number(v));
  raw.push({connectionId:String(m.connectionId),caseId:caseKey,columnNodeId:String(m.columnNodeId),coordinateSystem:"global",columnNodeCoordinate_m:m.columnNodeCoordinate_m.map(Number),connectionCoordinate_m:m.connectionCoordinate_m.map(Number),force_N:F,momentAtConnection_Nm:[0,0,0],source:"runway-girder FEM support reaction (equal-and-opposite beam action)",document:String(m.document)+"; "+String(m.source)});
 }));
 const checked=demandApi.audit(raw);
 if(!checked.success)return {success:false,ready:false,analysisEnabled:false,designApproved:false,demands:checked.demands||[],issues:checked.issues||["ممیزی تقاضای خروجی ناموفق است."]};
 return {success:true,ready:true,analysisEnabled:false,designApproved:false,transferType:"runway-reaction-to-bracket-column-global-six-dof",coordinateSystem:"global",verticalUnitVector_global:axis.map(Number),caseCount:left.length,mappingCount:mapRows.length,demandCount:checked.demands.length,demands:checked.demands,issues:[],equilibriumMeaning:"نیروی وارد بر براکت/ستون برابر و مخالف واکنش فنر وارد بر تیر حمال است؛ لنگر گره ستون با r×F از مختصات واقعی اتصال محاسبه شده است.",limitations:["این پل فقط واکنش قائم حل‌گر تیر حمال را منتقل می‌کند؛ بارهای افقی، پیچش، خستگی و اثرات دینامیکی در آن نیست.","مختصات سه‌بعدی اتصال و گره ستون و بردار قائم باید از مدل واقعی و نقشه معتبر وارد شوند؛ این ماژول مختصات را حدس نمی‌زند.","این تبدیل به‌تنهایی ظرفیت براکت، جوش، پیچ، ورق، ستون یا اتصال را کنترل نمی‌کند.","پیش از اعمال به FEM سه‌بعدی باید تطبیق نسخه مدل، شناسه حالت بار و جلوگیری از دوباره‌شماری بار مستقل انجام شود."]};
}
function selfTest(){
 const t=[],ck=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const old=root.SteelCraneBracketColumnDemandTransfer;
 root.SteelCraneBracketColumnDemandTransfer={audit:old?.audit||function(rows){return {success:rows.every(r=>v3(r.force_N)&&v3(r.columnNodeCoordinate_m)&&v3(r.connectionCoordinate_m)),demands:rows.map(r=>({...r,momentAtColumnNode_Nm:[0,0,0]})),issues:[]};}};
 const result={success:true,cases:{left:[{caseId:"LC1",caseIndex:0,result:{supports:[{station:1,x_m:0,verticalReaction_N:1000},{station:2,x_m:5,verticalReaction_N:2000}]}}],right:[{caseId:"LC1",caseIndex:0,result:{supports:[{station:1,x_m:0,verticalReaction_N:1500},{station:2,x_m:5,verticalReaction_N:2500}]}}]}};
 const map=["left","right"].flatMap(side=>[1,2].map(station=>({side,station,connectionId:side+"-BR"+station,columnNodeId:side+"-COL"+station,x_m:station===1?0:5,coordinateSystem:"global",connectionCoordinate_m:[side==="left"?-1:1,5,station===1?0:5],columnNodeCoordinate_m:[side==="left"?0:2,5,station===1?0:5],source:"GA-CRANE-01",document:"detail "+side+" "+station})));
 try{
  ck("maps every left/right support reaction to one unique bracket",()=>audit(result,map,{verticalUnitVector_global:[0,1,0]}).success);
  ck("uses equal-and-opposite beam-on-bracket vertical force",()=>{const r=audit(result,map,{verticalUnitVector_global:[0,1,0]});return r.success&&r.demands.find(x=>x.connectionId==="left-BR1").force_N[1]===-1000;});
  ck("rejects incomplete bracket mapping",()=>!audit(result,map.slice(1),{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects incorrect longitudinal station coordinate",()=>!audit(result,map.map((x,i)=>i===0?{...x,x_m:0.1}:x),{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects duplicate bracket mapping",()=>!audit(result,[...map,map[0]],{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects non-unit vertical axis",()=>!audit(result,map,{verticalUnitVector_global:[0,2,0]}).success);
  ck("rejects mismatched left/right case identities",()=>!audit({...result,cases:{...result.cases,right:[{...result.cases.right[0],caseId:"OTHER"}]}},map,{verticalUnitVector_global:[0,1,0]}).success);
  ck("rejects missing global connection coordinates",()=>!audit(result,map.map((x,i)=>i===0?{...x,connectionCoordinate_m:null}:x),{verticalUnitVector_global:[0,1,0]}).success);
 }finally{root.SteelCraneBracketColumnDemandTransfer=old;}
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,designApproved:false};
}
root.SteelCraneRunwayBracketDemandBridge={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
