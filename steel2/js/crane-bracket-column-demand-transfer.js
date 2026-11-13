/* SAHROUD STEEL — crane bracket-to-column six-DOF demand transfer audit.
 * Global-coordinate demand bridge only; deliberately does not inject loads into FEM.
 * Units: coordinates m, force N, moment N.m. Positive axes follow the global model frame.
 */
(function(root){
"use strict";
const v3=(v)=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(Number(x)));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function audit(input){
 const rows=Array.isArray(input)?input:(Array.isArray(input?.demands)?input.demands:[]);
 const issues=[],out=[],seen=new Set();
 if(!rows.length)issues.push("حداقل یک تقاضای اتصال براکت به گره ستون لازم است.");
 rows.forEach((d,i)=>{
  const id=String(d.connectionId||("connection-"+(i+1))),caseId=String(d.caseId||"");
  const key=id+"|"+caseId,before=issues.length;
  if(!String(d.connectionId||"").trim())issues.push(id+": شناسه اتصال الزامی است.");
  if(!caseId.trim())issues.push(id+": شناسه حالت بار الزامی است.");
  if(seen.has(key))issues.push(id+": رکورد اتصال/حالت بار تکراری است.");seen.add(key);
  if(!String(d.columnNodeId||"").trim())issues.push(id+": شناسه گره ستون الزامی است.");
  if(d.coordinateSystem!=="global")issues.push(id+": دستگاه مختصات باید صریحاً global باشد.");
  if(!v3(d.columnNodeCoordinate_m))issues.push(id+": مختصات گره ستون باید سه مؤلفه محدود بر حسب متر باشد.");
  if(!v3(d.connectionCoordinate_m))issues.push(id+": مختصات نقطه اتصال باید سه مؤلفه محدود بر حسب متر باشد.");
  if(!v3(d.force_N))issues.push(id+": نیرو باید سه مؤلفه محدود بر حسب N داشته باشد.");
  if(!v3(d.momentAtConnection_Nm))issues.push(id+": لنگر نقطه اتصال باید سه مؤلفه محدود بر حسب N.m داشته باشد.");
  if(!String(d.source||"").trim()||!String(d.document||"").trim())issues.push(id+": منبع و سند بارگذاری الزامی است.");
  let mapped=null;
  if(v3(d.columnNodeCoordinate_m)&&v3(d.connectionCoordinate_m)&&v3(d.force_N)&&v3(d.momentAtConnection_Nm)){
   const node=d.columnNodeCoordinate_m.map(Number),point=d.connectionCoordinate_m.map(Number),F=d.force_N.map(Number),M=d.momentAtConnection_Nm.map(Number);
   const r=point.map((x,j)=>x-node[j]),rxF=cross(r,F);
   mapped={connectionId:id,caseId,columnNodeId:String(d.columnNodeId||""),coordinateSystem:"global",columnNodeCoordinate_m:node,connectionCoordinate_m:point,leverArm_m:r,force_N:F,momentAtConnection_Nm:M,momentAtColumnNode_Nm:M.map((x,j)=>x+rxF[j]),source:d.source||null,document:d.document||null};
  }
  out.push({...mapped,complete:issues.length===before});
 });
 const success=issues.length===0&&out.length===rows.length&&out.every(x=>x.complete);
 return {success,ready:success,analysisEnabled:false,designApproved:false,transferType:"demand-only-global-coordinate",count:out.length,demands:out,issues,limitations:[
  "این خروجی فقط معادل‌سازی استاتیکی تقاضا از نقطه اتصال براکت به مختصات گره ستون با M_node=M_connection+r×F است.",
  "هیچ بار به مدل FEM تزریق نشده و هیچ ظرفیت اتصال، ستون، ورق، جوش، پیچ، کمانش موضعی یا مقاومت موضعی محاسبه نشده است.",
  "شناسه گره، مختصات، دستگاه مختصات، قرارداد علامت و واحدها باید با مدل سه‌بعدی و نقشه اجرایی تطبیق داده شوند.",
  "برای اعمال به FEM باید یکپارچگی توپولوژی، بازوی صلب/offset، قیود اتصال و عدم دوباره‌شماری بارها جداگانه اعتبارسنجی شود."
 ]};
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const base={connectionId:"BR-1",caseId:"LC-1",columnNodeId:"COL-1",coordinateSystem:"global",columnNodeCoordinate_m:[0,0,0],connectionCoordinate_m:[0,0.2,0],force_N:[1000,0,0],momentAtConnection_Nm:[0,0,0],source:"3D analysis",document:"RPT-01"};
 t("eccentric bracket force transfers moment to column node",()=>{const r=audit([base]);return r.success&&r.demands[0].momentAtColumnNode_Nm[2]===-200;});
 t("zero eccentricity preserves connection moment",()=>{const r=audit([{...base,connectionCoordinate_m:[0,0,0],momentAtConnection_Nm:[2,3,4]}]);return r.success&&r.demands[0].momentAtColumnNode_Nm.join(",")==="2,3,4";});
 t("rejects missing column coordinate",()=>!audit([{...base,columnNodeCoordinate_m:null}]).success);
 t("rejects missing connection coordinate",()=>!audit([{...base,connectionCoordinate_m:null}]).success);
 t("rejects duplicate connection and load case",()=>!audit([base,base]).success);
 t("rejects wrong vector dimensions",()=>!audit([{...base,force_N:[1,2]}]).success);
 t("requires source and document provenance",()=>!audit([{...base,source:"",document:""}]).success);
 t("preserves all six global demand components",()=>{const r=audit([{...base,force_N:[1,2,3],momentAtConnection_Nm:[4,5,6],connectionCoordinate_m:[0,0,0]}]);const d=r.demands[0];return r.success&&d.force_N.join(",")==="1,2,3"&&d.momentAtColumnNode_Nm.join(",")==="4,5,6";});
 t("rejects non-global coordinate declaration",()=>!audit([{...base,coordinateSystem:"local"}]).success);
 t("never enables FEM analysis or design approval",()=>{const r=audit([base]);return r.analysisEnabled===false&&r.designApproved===false&&r.transferType==="demand-only-global-coordinate";});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelCraneBracketColumnDemandTransfer={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
