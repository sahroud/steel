/* SAHROUD STEEL — explicit 3D crane runway mesh proposal.
 * Maps only exact existing column support nodes; never injects elements or loads.
 */
(function(root){
"use strict";
const TOL=1e-7;
const near=(a,b)=>Number.isFinite(Number(a))&&Math.abs(Number(a)-Number(b))<=TOL;
function audit(model){
 const issues=[],g=model?.geometry?.craneRunway,frames=model?.geometry?.frames,nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!g?.enabled)issues.push("جرثقیل در مدل هندسی فعال نیست.");
 if(!Array.isArray(frames)||frames.length<2)issues.push("حداقل دو قاب طولی لازم است.");
 if(!nodes.length||!members.length)issues.push("شبکه واقعی گره‌ها و اعضای سازه‌ای موجود نیست.");
 const span=Number(model?.geometry?.span),y=Number(g?.elevationM),offset=Number(g?.axisOffsetM);
 if(!(Number.isFinite(span)&&span>0))issues.push("دهانه مدل معتبر نیست.");
 if(!(Number.isFinite(y)&&y>0))issues.push("تراز ریل معتبر نیست.");
 if(!(Number.isFinite(offset)&&offset>=0.05))issues.push("فاصله محور تیر حمال از ستون معتبر نیست.");
 const proposals={left:[],right:[]},beamNodes=[],beamMembers=[],brackets=[],columnNodeIds=[];
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const findExact=(x,z,side)=>{
  const matches=nodes.filter(n=>near(n.x,x)&&near(n.y,y)&&near(n.z,z));
  if(matches.length!==1){issues.push("تطبیق گره ستون "+side+" در قاب z="+z+" یکتا نیست؛ تعداد تطبیق: "+matches.length);return null;}
  const node=matches[0],attached=members.filter(m=>(m.sectionKey||"")==="column"&&(m.start===node.id||m.end===node.id));
  if(!attached.length){issues.push("گره "+node.id+" در تراز ریل به عضو ستون واقعی متصل نیست.");return null;}
  return node;
 };
 if(Array.isArray(frames)&&frames.length>=2&&Number.isFinite(span)&&Number.isFinite(y)&&Number.isFinite(offset)){
  for(const side of ["left","right"]){
   const colX=side==="left"?0:span,beamX=side==="left"?-offset:span+offset;
   const geomSupports=Array.isArray(g?.supportNodes)?g.supportNodes.filter(n=>n.side===side):[];
   frames.forEach((z,i)=>{
    const column=findExact(colX,z,side);
    const geometric=geomSupports.filter(n=>near(n.z,z)&&near(n.x,beamX)&&near(n.y,y));
    if(geomSupports.length&&geometric.length!==1)issues.push("گره کمکی تیر حمال "+side+" در قاب "+(i+1)+" با مختصات مورد انتظار تطبیق یکتا ندارد.");
    if(!column)return;
    const beamId="CRANE_MESH_"+side.toUpperCase()+"_NODE_"+(i+1);
    const beamNode={id:beamId,x:beamX,y,z,kind:"crane-runway-beam-proposal",proposalOnly:true,sourceColumnNodeId:column.id,frameIndex:i+1,side};
    beamNodes.push(beamNode);columnNodeIds.push(column.id);proposals[side].push({frameIndex:i+1,z,columnNodeId:column.id,beamNodeId:beamId});
    brackets.push({id:"CRANE_MESH_"+side.toUpperCase()+"_BRACKET_"+(i+1),side,frameIndex:i+1,columnNodeId:column.id,beamNodeId:beamId,from:{x:colX,y,z},to:{x:beamX,y,z},lengthM:offset,connectionType:g.supportType||"unselected",sectionDefined:false,stiffnessDefined:false,proposalOnly:true});
   });
   for(let i=0;i<frames.length-1;i++){
    const a=proposals[side][i],b=proposals[side][i+1];
    if(!a||!b)continue;
    beamMembers.push({id:"CRANE_MESH_"+side.toUpperCase()+"_BAY_"+(i+1),side,start:a.beamNodeId,end:b.beamNodeId,lengthM:Number(b.z)-Number(a.z),continuity:"separate_span_segment_between_adjacent_frames",endReleases:"not_defined",sectionDefined:false,proposalOnly:true});
   }
  }
 }
 const expected=Array.isArray(frames)?frames.length*2:0;
 const mapped=columnNodeIds.length===expected&&beamNodes.length===expected&&brackets.length===expected&&beamMembers.length===Math.max(0,expected-2);
 const geometryReady=issues.length===0&&mapped;
 if(!mapped&&issues.length===0)issues.push("تعداد گره‌ها، براکت‌ها یا قطعات پیشنهادی با تعداد قاب‌ها سازگار نیست.");
 return {success:true,geometryReady,ready:false,analysisEnabled:false,proposalOnly:true,counts:{frames:frames?.length||0,columnNodesMapped:columnNodeIds.length,beamNodes:beamNodes.length,brackets:brackets.length,beamMembers:beamMembers.length},columnNodeIds:[...new Set(columnNodeIds)],beamNodes,beamMembers,brackets,issues,blockers:["مقطع و خواص سازه‌ای تیر حمال تعریف نشده یا به حل‌گر تخصیص نیافته است.","مقطع و سختی واقعی براکت/اتصال و خروج از مرکزیت اجرایی باید تعیین شود.","نوع اتصال و رهاسازی درجات آزادی در دو انتهای اعضا باید از نقشه/محاسبات مشخص شود.","تیر حمال فعلاً قطعات مستقل بین قاب‌هاست؛ پیوستگی چنددهانه فرض نمی‌شود.","این پیشنهاد به model.nodes/model.members افزوده نمی‌شود و هیچ نیرویی اعمال نمی‌کند."]};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={geometry:{span:12,frames:[0,6,12],craneRunway:{enabled:true,elevationM:5,axisOffsetM:.5,supportType:"simple",supportNodes:["left","right"].flatMap(side=>[0,6,12].map((z,i)=>({id:"G"+side+i,x:side==="left"?-.5:12.5,y:5,z,side}))),beamSegments:[]}},nodes:[],members:[]};
 ["left","right"].forEach(side=>[0,6,12].forEach((z,i)=>{const id="C"+side+i;model.nodes.push({id,x:side==="left"?0:12,y:5,z});model.members.push({id:"M"+id,start:id,end:"TOP"+id,sectionKey:"column"});model.nodes.push({id:"TOP"+id,x:side==="left"?0:12,y:6,z});}));
 const good=audit(model);
 t("maps exact existing left/right column nodes",()=>good.geometryReady&&good.counts.columnNodesMapped===6);
 t("creates separate proposal-only beam nodes",()=>good.beamNodes.length===6&&good.beamNodes.every(n=>n.proposalOnly));
 t("creates one bracket proposal per frame and side",()=>good.brackets.length===6);
 t("creates separate beam bays without assuming continuity",()=>good.beamMembers.length===4&&good.beamMembers.every(m=>m.continuity==="separate_span_segment_between_adjacent_frames"));
 t("keeps solver and analysis disabled",()=>!good.ready&&!good.analysisEnabled);
 t("does not mutate source model arrays",()=>model.nodes.length===12&&model.members.length===6);
 const bad=JSON.parse(JSON.stringify(model));bad.nodes=bad.nodes.filter(n=>n.id!=="Cleft1");
 const missing=audit(bad);
 t("rejects missing exact column node instead of nearest-node matching",()=>!missing.geometryReady&&missing.issues.some(x=>x.includes("تطبیق گره ستون")));
 const ambiguous=JSON.parse(JSON.stringify(model));ambiguous.nodes.push({...ambiguous.nodes.find(n=>n.id==="Cleft1"),id:"DUP"});
 const dup=audit(ambiguous);
 t("rejects ambiguous coincident column nodes",()=>!dup.geometryReady&&dup.issues.some(x=>x.includes("تطبیق گره ستون")));
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelCrane3DMeshProposal={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
