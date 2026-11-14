/* SAHROUD STEEL — proposal-only geometry for cranes sharing a runway system across selected bays.
 * This module does not mutate the structural model or enable FEM analysis.
 */
(function(root){
"use strict";
const TOL=1e-7;
const near=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=TOL;
const safeId=s=>String(s).replace(/[^A-Za-z0-9_-]/g,"_");
function audit(model,configuration){
 const issues=[],warnings=[],g=model?.geometry||{},runway=g.craneRunway||{},frames=Array.isArray(g.frames)?g.frames:[],nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 const cfg=configuration||root.SteelCraneBayConfiguration?.readAndAudit?.(Number(g.bayCount));
 if(!cfg?.valid)issues.push("جانمایی جرثقیل‌ها معتبر نیست؛ ابتدا ممیزی تخصیص دهانه‌ها باید موفق شود.");
 if(!runway.enabled)issues.push("هندسه پایه تیر حمال در مدل فعال نیست.");
 const bayCount=Number(g.bayCount);
 if(!Number.isInteger(bayCount)||bayCount<1||frames.length!==bayCount+1)issues.push("تعداد ایستگاه‌های قاب باید دقیقاً یک عدد بیشتر از تعداد دهانه‌ها باشد.");
 if(!nodes.length||!members.length)issues.push("گره‌ها و اعضای واقعی مدل برای تطبیق تکیه‌گاه‌های تیر حمال موجود نیستند.");
 const elevation=Number(runway.elevationM),offset=Number(runway.axisOffsetM),span=Number(g.span);
 if(!(Number.isFinite(elevation)&&elevation>0))issues.push("تراز واقعی ریل برای ساخت پیشنهاد هندسی معتبر نیست.");
 if(!(Number.isFinite(offset)&&offset>=0.05))issues.push("فاصله محور تیر حمال از ستون باید صریح و معتبر باشد.");
 if(!(Number.isFinite(span)&&span>0))issues.push("دهانه عرضی سوله معتبر نیست.");
 if(frames.some((z,i)=>!Number.isFinite(Number(z))||(i>0&&!(Number(z)>Number(frames[i-1])))))issues.push("ایستگاه‌های قاب باید عددی، متناهی و صعودی باشند.");
 const cranes=Array.isArray(cfg?.cranes)?cfg.cranes:[];
 if(!cranes.length)issues.push("هیچ جرثقیلی برای ساخت پیشنهاد هندسی وجود ندارد.");
 const missingSystem=cranes.filter(c=>!String(c.runwaySystemId||"").trim());
 if(missingSystem.length)issues.push("برای تمام جرثقیل‌ها شناسه runwaySystemId لازم است؛ هندسه ریل مشترک/مستقل نباید حدس زده شود.");
 const systemIds=[...new Set(cranes.map(c=>String(c.runwaySystemId||"").trim()).filter(Boolean))];
 if(systemIds.length>1)issues.push("چند سامانه ریل مستقل تعریف شده است، اما تراز/محور/مقاطع هندسی جداگانه برای هر سامانه در مدل موجود نیست؛ ساخت هندسه چندسامانه‌ای متوقف شد.");
 const result={success:false,geometryReady:false,ready:false,proposalOnly:true,analysisEnabled:false,designApproved:false,runwaySystems:[],issues,warnings,blockers:[
  "پیشنهاد هندسی به مدل FEM اضافه نمی‌شود و هیچ بار یا سختی ایجاد نمی‌کند.",
  "مقطع تیر حمال، سختی و نوع اتصال براکت، پیوستگی تیر، رهاسازی‌ها و جزئیات اتصال هنوز باید مستقل تعیین و تأیید شوند.",
  "اشتراک ریل بین جرثقیل‌ها فقط به معنی هندسه مشترک است؛ برخورد، فاصله ایمن، هم‌زمانی حرکت و ترکیبات بار چندجرثقیلی تحلیل نمی‌شوند.",
  "تحلیل FEM فعلی همچنان فقط یک جرثقیل با مسیر سراسری تمام دهانه‌ها را می‌پذیرد."
 ],counts:{cranes:cranes.length,runwaySystems:systemIds.length,beamNodes:0,beamSegments:0,brackets:0}};
 if(issues.length)return result;
 const grouped=new Map();
 cranes.forEach(c=>{const key=String(c.runwaySystemId);if(!grouped.has(key))grouped.set(key,{runwaySystemId:key,craneIds:[],bays:new Set()});const item=grouped.get(key);item.craneIds.push(String(c.id));(c.bays||[]).forEach(b=>item.bays.add(Number(b)));});
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const systems=[];
 for(const item of grouped.values()){
  const bays=[...item.bays].sort((a,b)=>a-b);
  if(!bays.length||bays.some(b=>!Number.isInteger(b)||b<1||b>bayCount)){issues.push("دهانه‌های سامانه ریل "+item.runwaySystemId+" معتبر نیستند.");continue;}
  const frameIndexes=[...new Set(bays.flatMap(b=>[b-1,b]))].sort((a,b)=>a-b);
  const system={runwaySystemId:item.runwaySystemId,craneIds:item.craneIds,bays,frameIndexes,beamNodes:[],beamSegments:[],brackets:[],columnNodeIds:[]};
  for(const side of ["left","right"]){
   const columnX=side==="left"?0:span,beamX=side==="left"?-offset:span+offset;
   const sideNodes=new Map();
   for(const frameIndex of frameIndexes){
    const z=Number(frames[frameIndex]),matches=nodes.filter(n=>near(n.x,columnX)&&near(n.y,elevation)&&near(n.z,z));
    if(matches.length!==1){issues.push("گره ستون "+side+" در قاب "+(frameIndex+1)+" برای سامانه "+item.runwaySystemId+" تطبیق یکتا ندارد؛ تعداد: "+matches.length);continue;}
    const column=matches[0],attached=members.some(m=>m.sectionKey==="column"&&(String(m.start)===String(column.id)||String(m.end)===String(column.id)));
    if(!attached){issues.push("گره "+column.id+" در تراز ریل به ستون واقعی متصل نیست.");continue;}
    const nodeId="CRANE_SYS_"+safeId(item.runwaySystemId)+"_"+side.toUpperCase()+"_N"+(frameIndex+1);
    const beamNode={id:nodeId,x:beamX,y:elevation,z,kind:"crane-runway-beam-proposal",runwaySystemId:item.runwaySystemId,side,frameIndex:frameIndex+1,sourceColumnNodeId:column.id,proposalOnly:true};
    sideNodes.set(frameIndex,nodeId);system.beamNodes.push(beamNode);system.columnNodeIds.push(column.id);
    system.brackets.push({id:"CRANE_SYS_"+safeId(item.runwaySystemId)+"_"+side.toUpperCase()+"_BR"+(frameIndex+1),runwaySystemId:item.runwaySystemId,side,frameIndex:frameIndex+1,columnNodeId:column.id,beamNodeId:nodeId,lengthM:offset,sectionDefined:false,stiffnessDefined:false,connectionType:runway.supportType||"unselected",proposalOnly:true});
   }
   bays.forEach(b=>{
    const a=sideNodes.get(b-1),z=sideNodes.get(b);
    if(!a||!z)return;
    system.beamSegments.push({id:"CRANE_SYS_"+safeId(item.runwaySystemId)+"_"+side.toUpperCase()+"_BAY"+b,runwaySystemId:item.runwaySystemId,side,bay:b,start:a,end:z,lengthM:Number(frames[b])-Number(frames[b-1]),continuity:"separate-span-segment-no-continuity-assumed",sectionDefined:false,endReleases:"not-defined",proposalOnly:true});
   });
  }
  systems.push(system);
 }
 if(issues.length)return {...result,runwaySystems:systems,counts:{...result.counts,beamNodes:systems.reduce((n,s)=>n+s.beamNodes.length,0),beamSegments:systems.reduce((n,s)=>n+s.beamSegments.length,0),brackets:systems.reduce((n,s)=>n+s.brackets.length,0)}};
 const allBays=systems.flatMap(s=>s.bays),expectedSegments=systems.reduce((n,s)=>n+s.bays.length*2,0),actualSegments=systems.reduce((n,s)=>n+s.beamSegments.length,0);
 if(actualSegments!==expectedSegments)issues.push("برای بخشی از دهانه‌های تخصیص‌یافته، قطعه تیر حمال پیشنهادی ساخته نشد.");
 if(cranes.some(c=>c.profileReady===false))warnings.push("مشخصات بار چرخ بعضی جرثقیل‌ها ناقص است؛ این پیشنهاد صرفاً هندسی است.");
 if(systems.some(s=>s.craneIds.length>1))warnings.push("چند جرثقیل روی یک سامانه ریل مشترک قرار دارند؛ کنترل برخورد و بارگذاری هم‌زمان هنوز انجام نمی‌شود.");
 return {success:issues.length===0,geometryReady:issues.length===0,ready:false,proposalOnly:true,analysisEnabled:false,designApproved:false,runwaySystems:systems,counts:{cranes:cranes.length,runwaySystems:systems.length,beamNodes:systems.reduce((n,s)=>n+s.beamNodes.length,0),beamSegments:actualSegments,brackets:systems.reduce((n,s)=>n+s.brackets.length,0),assignedBayOccurrences:allBays.length},issues,warnings,blockers:result.blockers,scope:"Proposal-only beam/bracket geometry for cranes assigned to selected bays on a single explicitly identified shared runway system; no FEM integration or load application."};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={geometry:{span:12,bayCount:3,frames:[0,5,10,15],craneRunway:{enabled:true,elevationM:5,axisOffsetM:.5,supportType:"unselected"}},nodes:[],members:[]};
 ["left","right"].forEach(side=>[0,5,10,15].forEach((z,i)=>{const x=side==="left"?0:12,id="C_"+side+"_"+i;model.nodes.push({id,x,y:5,z});model.nodes.push({id:id+"_TOP",x,y:6,z});model.members.push({id:"COL_"+side+"_"+i,start:id,end:id+"_TOP",sectionKey:"column"});}));
 const cfg={valid:true,cranes:[{id:"CR-1",runwaySystemId:"R1",bays:[1,2]},{id:"CR-2",runwaySystemId:"R1",bays:[3]}]};
 const good=audit(model,cfg);
 t("two cranes share one runway system and cover selected bays",()=>good.success&&good.geometryReady&&good.runwaySystems.length===1&&good.runwaySystems[0].craneIds.length===2);
 t("only assigned bays receive beam segments on both rails",()=>good.counts.beamSegments===6&&good.runwaySystems[0].beamSegments.every(x=>[1,2,3].includes(x.bay)));
 t("brackets are proposed only at required bay boundary frames",()=>good.counts.brackets===8&&good.counts.beamNodes===8);
 t("gaps in bay assignment remain gaps rather than full-length rails",()=>{const r=audit(model,{valid:true,cranes:[{id:"CR-1",runwaySystemId:"R1",bays:[1,3]}]});return r.success&&r.counts.beamSegments===4&&r.runwaySystems[0].bays.join(",")==="1,3";});
 t("separate runway systems are blocked until independent geometry inputs exist",()=>!audit(model,{valid:true,cranes:[{id:"A",runwaySystemId:"R1",bays:[1]},{id:"B",runwaySystemId:"R2",bays:[3]}]}).success);
 t("missing runway system identity is blocked",()=>!audit(model,{valid:true,cranes:[{id:"A",bays:[1]}]}).success);
 t("missing exact support node is rejected",()=>{const m=JSON.parse(JSON.stringify(model));m.nodes=m.nodes.filter(n=>n.id!=="C_left_1");return !audit(m,cfg).success;});
 t("ambiguous coincident support nodes are rejected",()=>{const m=JSON.parse(JSON.stringify(model));m.nodes.push({...m.nodes.find(n=>n.id==="C_left_1"),id:"DUP"});return !audit(m,cfg).success;});
 t("proposal does not mutate source structural model",()=>good.success&&model.nodes.length===16&&model.members.length===8);
 t("proposal never enables FEM or design approval",()=>good.analysisEnabled===false&&good.designApproved===false&&good.ready===false);
 t("invalid configuration is fail-closed",()=>!audit(model,{valid:false,cranes:[]}).success);
 t("non-monotonic frame stations are rejected",()=>{const m=JSON.parse(JSON.stringify(model));m.geometry.frames=[0,5,4,15];return !audit(m,cfg).success;});
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelCraneMultiBayMeshProposal={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
