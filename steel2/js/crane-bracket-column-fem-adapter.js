/* SAHROUD STEEL — validated bracket/column demand to solver load-case adapter.
 * Builds an explicit loadCase copy; caller decides when/if to solve it.
 * Global axes; N and N.m; no automatic solve or design approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const v3=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const close=(a,b,t=1e-7)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b));
function buildLoadCase(model,baseLoadCase,transferResult){
 const issues=[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 if(!Array.isArray(model?.nodes)||!Array.isArray(model?.members))issues.push("مدل سه‌بعدی معتبر نیست.");
 if(!baseLoadCase||typeof baseLoadCase!=="object")issues.push("حالت بار پایه معتبر نیست.");
 if(!Array.isArray(baseLoadCase?.nodalLoads))issues.push("nodalLoads حالت بار پایه باید آرایه باشد؛ بارهای موجود نباید حذف شوند.");
 if(!transferResult?.success||transferResult.transferType!=="demand-only-global-coordinate"||!Array.isArray(transferResult.demands))issues.push("خروجی انتقال تقاضای معتبر در دسترس نیست.");
 const expectedCase=String(baseLoadCase?.id||baseLoadCase?.caseId||"");
 if(!expectedCase)issues.push("حالت بار مقصد باید شناسه id یا caseId داشته باشد.");
 const priorRaw=baseLoadCase?.craneBracketColumnDemandIds??[];
 if(!Array.isArray(priorRaw))issues.push("فهرست شناسه‌های تقاضای تزریق‌شده در حالت بار باید آرایه باشد.");
 const prior=new Set(Array.isArray(priorRaw)?priorRaw.map(String):[]);
 if(prior.size!==(Array.isArray(priorRaw)?priorRaw.length:0))issues.push("شناسه‌های قبلی تقاضای جرثقیل در metadata تکراری‌اند.");
 const baseSeen=new Set();
 (Array.isArray(baseLoadCase?.nodalLoads)?baseLoadCase.nodalLoads:[]).forEach((load,i)=>{
  const nodeId=String(load?.nodeId??"");
  if(!nodeId||!nodes.has(nodeId))issues.push("بار گره‌ای پایه شماره "+(i+1)+" به گره معتبر مدل ارجاع نمی‌دهد.");
  if(baseSeen.has(nodeId))issues.push("بار گره‌ای پایه برای گره "+nodeId+" تکراری است؛ ابتدا آن‌ها را به‌صورت صریح تجمیع کنید.");
  baseSeen.add(nodeId);
  if(!Array.isArray(load?.values)||load.values.length!==6||load.values.some(v=>!finite(v)))issues.push("بار گره‌ای پایه شماره "+(i+1)+" باید دقیقاً شش مؤلفه عددی محدود داشته باشد.");
 });
 const rows=transferResult?.demands||[],aggregate=new Map(),used=[],batchSeen=new Set();
 rows.forEach((d,i)=>{
  const id=String(d?.connectionId||""),caseId=String(d?.caseId||""),nodeId=String(d?.columnNodeId||""),key=id+"|"+caseId;
  if(!id||!caseId||!nodeId)issues.push("رکورد "+(i+1)+": شناسه اتصال/حالت بار/گره ناقص است.");
  if(batchSeen.has(key))issues.push(id+": رکورد اتصال/حالت بار در همین بسته تکراری است.");
  batchSeen.add(key);
  if(caseId!==expectedCase)issues.push(id+": شناسه حالت بار با حالت بار مقصد تطبیق ندارد.");
  if(prior.has(key))issues.push(id+": این تقاضا قبلاً در همین حالت بار تزریق شده است.");
  const node=nodes.get(nodeId);
  if(!node)issues.push(id+": گره مقصد در مدل سه‌بعدی وجود ندارد: "+nodeId);
  if(!v3(d?.columnNodeCoordinate_m)||!v3(d?.force_N)||!v3(d?.momentAtColumnNode_Nm))issues.push(id+": مختصات و بردارهای شش‌مؤلفه‌ای نامعتبرند.");
  if(d?.coordinateSystem!=="global")issues.push(id+": دستگاه مختصات global نیست.");
  if(node&&v3(d.columnNodeCoordinate_m)&&![node.x,node.y,node.z].every(finite))issues.push(id+": مختصات گره مدل نامعتبر است.");
  if(node&&v3(d.columnNodeCoordinate_m)&&[node.x,node.y,node.z].every(finite)&&!d.columnNodeCoordinate_m.every((v,j)=>close(v,[node.x,node.y,node.z][j])))issues.push(id+": مختصات ثبت‌شده با مختصات واقعی گره مدل تطبیق ندارد.");
  if(!String(d?.source||"").trim()||!String(d?.document||"").trim())issues.push(id+": ردیابی منبع و سند ناقص است.");
  if(node&&v3(d?.force_N)&&v3(d?.momentAtColumnNode_Nm)){
   const old=aggregate.get(nodeId)||[0,0,0,0,0,0];
   d.force_N.forEach((v,j)=>old[j]+=v);d.momentAtColumnNode_Nm.forEach((v,j)=>old[j+3]+=v);
   aggregate.set(nodeId,old);used.push(key);
  }
 });
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,designApproved:false,issues,loadCase:null};
 const nodalLoads=baseLoadCase.nodalLoads.map(x=>({...x,values:x.values.slice()}));
 aggregate.forEach((values,nodeId)=>nodalLoads.push({nodeId,values,sources:rows.filter(d=>String(d.columnNodeId)===nodeId).map(d=>({kind:"crane-bracket-column-demand",connectionId:d.connectionId,caseId:d.caseId,source:d.source,document:d.document}))}));
 const out={...baseLoadCase,nodalLoads,craneBracketColumnDemandIds:[...prior,...used],craneBracketColumnDemandTransfer:{coordinateSystem:"global",units:{force:"N",moment:"N.m"},connectionCount:rows.length,aggregatedNodeCount:aggregate.size,analysisEnabled:false,designApproved:false}};
 return {success:true,ready:true,analysisEnabled:false,designApproved:false,loadCase:out,addedDemandCount:rows.length,aggregatedNodeCount:aggregate.size,issues:[],note:"حالت بار جدید ساخته شد؛ هنوز به حل‌گر ارسال نشده است. پیش از حل، هم‌زمانی بارها، نبود بارگذاری تکراری و قرارداد اتصال باید بررسی شود."};
}
function selfTest(){
 const t=[],ck=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const model={nodes:[{id:"C1",x:0,y:5,z:0,kind:"column"},{id:"OTHER",x:2,y:0,z:0,kind:"frame"}],members:[]};
 const demand={success:true,transferType:"demand-only-global-coordinate",demands:[{connectionId:"BR1",caseId:"LC1",columnNodeId:"C1",coordinateSystem:"global",columnNodeCoordinate_m:[0,5,0],force_N:[1,2,3],momentAtColumnNode_Nm:[4,5,6],source:"3D model",document:"RPT-1"}]};
 const base={id:"LC1",nodalLoads:[{nodeId:"OTHER",values:[0,0,0,0,0,0]}]};
 ck("creates solver-compatible six-DOF nodal load",()=>{const r=buildLoadCase(model,base,demand),x=r.loadCase?.nodalLoads.find(n=>n.nodeId==="C1");return r.success&&x.values.join(",")==="1,2,3,4,5,6";});
 ck("preserves pre-existing nodal loads",()=>{const r=buildLoadCase(model,base,demand);return r.success&&r.loadCase.nodalLoads.some(n=>n.nodeId==="OTHER");});
 ck("aggregates demands at same column node",()=>{const d={...demand,demands:[demand.demands[0],{...demand.demands[0],connectionId:"BR2",force_N:[2,0,0]}]};const r=buildLoadCase(model,base,d);return r.success&&r.aggregatedNodeCount===1&&r.loadCase.nodalLoads.find(n=>n.nodeId==="C1").values[0]===3;});
 ck("rejects unknown column node",()=>!buildLoadCase(model,base,{...demand,demands:[{...demand.demands[0],columnNodeId:"MISSING"}]}).success);
 ck("rejects coordinate mismatch",()=>!buildLoadCase(model,base,{...demand,demands:[{...demand.demands[0],columnNodeCoordinate_m:[0,4,0]}]}).success);
 ck("rejects load case ID mismatch",()=>!buildLoadCase(model,{...base,id:"LC2"},demand).success);
 ck("rejects missing base nodal load array",()=>!buildLoadCase(model,{id:"LC1"},demand).success);
 ck("rejects repeated injection into same load case",()=>{const first=buildLoadCase(model,base,demand);return !buildLoadCase(model,first.loadCase,demand).success;});
 ck("requires global coordinate declaration",()=>!buildLoadCase(model,base,{...demand,demands:[{...demand.demands[0],coordinateSystem:"local"}]}).success);
 ck("does not auto-run solver or approve design",()=>{const r=buildLoadCase(model,base,demand);return r.success&&r.analysisEnabled===false&&r.designApproved===false;});
 ck("rejects duplicate connection/case rows inside one transfer batch",()=>!buildLoadCase(model,base,{...demand,demands:[demand.demands[0],demand.demands[0]]}).success);
 ck("rejects malformed or unknown pre-existing nodal loads",()=>!buildLoadCase(model,{...base,nodalLoads:[{nodeId:"MISSING",values:[0,0,0,0,0,0]}]},demand).success);
 ck("rejects duplicate pre-existing nodal-load node entries",()=>!buildLoadCase(model,{...base,nodalLoads:[{nodeId:"C1",values:[0,0,0,0,0,0]},{nodeId:"C1",values:[0,0,0,0,0,0]}]},demand).success);
 ck("rejects nonfinite base nodal-load components",()=>!buildLoadCase(model,{...base,nodalLoads:[{nodeId:"C1",values:[0,0,0,0,0,Infinity]}]},demand).success);
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,designApproved:false};
}
root.SteelCraneBracketColumnFEMAdapter={buildLoadCase,selfTest};
})(typeof window!=="undefined"?window:globalThis);
