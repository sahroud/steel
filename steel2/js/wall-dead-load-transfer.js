/* SAHROUD STEEL — Wall cladding dead-load transfer to foundation supports.
 * Only the explicitly selected foundation-bearing support mode is implemented.
 * Steel-secondary and independent wall support paths remain blocked.
 */
(function(root){
"use strict";
const FACES=["front","rear","left","right"];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const num=v=>v===undefined||v===null||v===""?null:Number(v);
const near=(a,b,t=1e-6)=>Math.abs(Number(a)-Number(b))<=t;
function roofY(x,g){const half=Number(g.span)/2;return Number(g.height)+Number(g.rise)*(1-Math.abs(Number(x)-half)/half);}
function integralRoofHeight(a,b,g){
 const half=Number(g.span)/2,pts=[a,...(a<half-1e-9&&b>half+1e-9?[half]:[]),b];let area=0;
 for(let i=0;i<pts.length-1;i++)area+=(pts[i+1]-pts[i])*(roofY(pts[i],g)+roofY(pts[i+1],g))/2;
 return area;
}
function tributaryStrips(coords,total){
 const x=[...new Set(coords.map(Number))].sort((a,b)=>a-b);
 if(x.length<2||!near(x[0],0)||!near(x[x.length-1],total))return null;
 return x.map((v,i)=>({coordinate:v,start:i===0?0:(x[i-1]+v)/2,end:i===x.length-1?total:(v+x[i+1])/2}));
}
function supportNodes(model,face){
 const g=model.geometry,nodes=model.nodes||[],tol=1e-5;
 if(face==="left"||face==="right"){
  const x=face==="left"?0:Number(g.span);
  return nodes.filter(n=>n.kind==="base"&&near(n.x,x,tol)).map(n=>({id:String(n.id),coordinate:Number(n.z)}));
 }
 const z=face==="front"?0:Number(g.length);
 return nodes.filter(n=>(n.kind==="base"||n.kind==="endwall-base")&&near(n.z,z,tol)).map(n=>({id:String(n.id),coordinate:Number(n.x)}));
}
function faceAreaWeights(model,face,nodes){
 const g=model.geometry,total=face==="left"||face==="right"?Number(g.length):Number(g.span);
 const strips=tributaryStrips(nodes.map(n=>n.coordinate),total);if(!strips)return null;
 return strips.map((s,i)=>({nodeId:nodes.find(n=>near(n.coordinate,s.coordinate))?.id,start:s.start,end:s.end,
  areaM2:face==="left"||face==="right"?(s.end-s.start)*Number(g.height):integralRoofHeight(s.start,s.end,g)}));
}
function inspectGradeBeamSupportPath(model,face,unitWeightKNm2){
 const g=model.geometry||{},routes=root.SteelTieBeamLayout?.getData?.()?.routes||[],nodes=new Map((model.nodes||[]).map(n=>[String(n.id),n]));
 const longitudinal=face==="left"||face==="right",axis=longitudinal?"z":"x",fixed=longitudinal?(face==="left"?0:Number(g.span)):(face==="front"?0:Number(g.length)),total=longitudinal?Number(g.length):Number(g.span),tol=1e-4;
 const segments=[],issues=[];
 routes.forEach(r=>{
  const a=nodes.get(String(r.start)),b=nodes.get(String(r.end));if(!a||!b)return;
  const onLine=longitudinal?near(a.x,fixed,tol)&&near(b.x,fixed,tol):near(a.z,fixed,tol)&&near(b.z,fixed,tol);
  if(!onLine||!near(a.y,0,tol)||!near(b.y,0,tol))return;
  const s=Math.min(Number(a[axis]),Number(b[axis])),e=Math.max(Number(a[axis]),Number(b[axis]));
  if(!(e-s>tol))return;
  const area=longitudinal?(e-s)*Number(g.height):integralRoofHeight(s,e,g);
  const crossesRidge=!longitudinal&&s<Number(g.span)/2-tol&&e>Number(g.span)/2+tol;
  const ridgeNode=[...nodes.values()].some(n=>(n.kind==="base"||n.kind==="endwall-base")&&near(n.x,Number(g.span)/2,tol)&&near(n.y,0,tol)&&near(n.z,fixed,tol));
  if(crossesRidge&&!ridgeNode)issues.push("مسیر "+String(r.id)+" از تاج بام عبور می‌کند اما گره پایه در محور تاج برای تقسیم واقعی شناژ وجود ندارد.");
  const startLoad=unitWeightKNm2*(longitudinal?Number(g.height):roofY(Number(a[axis]),g));
  const endLoad=unitWeightKNm2*(longitudinal?Number(g.height):roofY(Number(b[axis]),g));
  segments.push({routeId:String(r.id),start:s,end:e,startNodeId:String(r.start),endNodeId:String(r.end),lengthM:e-s,wallAreaM2:area,
   uniformEquivalentLineLoadKNm:unitWeightKNm2*area/(e-s),startLineLoadKNm:startLoad,endLineLoadKNm:endLoad,unitWeightKNm2,
   weightKN:unitWeightKNm2*area,startJoint:r.startJoint||"unknown",endJoint:r.endJoint||"unknown",crossesRidge,ridgeNodeRequired:crossesRidge});
 });
 segments.sort((a,b)=>a.start-b.start);let cursor=0;
 segments.forEach(s=>{if(s.start>cursor+tol)issues.push("فاصله بدون شناژ از "+cursor.toFixed(3)+" تا "+s.start.toFixed(3)+" متر وجود دارد.");if(s.start<cursor-tol)issues.push("مسیرهای شناژ هم‌پوشانی دارند و ممکن است وزن دیوار دوبار منظور شود.");if(s.startJoint!=="rigid"||s.endJoint!=="rigid")issues.push("اتصال ابتدا/انتهای مسیر "+s.routeId+" یکپارچه و مستند نشده است.");cursor=Math.max(cursor,s.end);});
 if(cursor<total-tol)issues.push("شناژ زیر دیوار تا انتهای وجه پیوسته نیست؛ پوشش مسیر "+cursor.toFixed(3)+" از "+total.toFixed(3)+" متر است.");
 if(!segments.length)issues.push("هیچ مسیر شناژ منطبق با خط زیر دیوار تعریف نشده است.");
 return{success:issues.length===0,face,axis,totalLengthM:total,coveredLengthM:segments.reduce((s,x)=>s+x.lengthM,0),unitWeightKNm2,weightKN:segments.reduce((s,x)=>s+x.weightKN,0),segments,issues,solverLoadsGenerated:false,limitation:"بار دیوار به‌صورت بار گسترده خطی محلی/جهانی با تغییر خطی بین دو انتهای هر قطعه شناژ اعمال می‌شود؛ مسیر واقعی، گره تاج و تعادل کلی باید جداگانه کنترل شوند."};
}
function inspectSecondarySupportPath(model,face){
 const nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const longitudinal=face==="left"||face==="right",sectionKey=longitudinal?"wallGirt":"endGirt";
 const candidates=members.filter(m=>m.sectionKey===sectionKey&&(longitudinal?m.side===face:m.endFace===face));
 const issues=[],rows=[];
 if(!candidates.length)return {success:false,face,sectionKey,candidateMemberCount:0,connectedMemberCount:0,issues:["عضو زیرسازی متناظر در مدل هندسی پیدا نشد."],rows};
 const byNode=new Map();
 members.forEach(m=>[m.start,m.end].forEach(id=>{const key=String(id);if(!byNode.has(key))byNode.set(key,[]);byNode.get(key).push(m);}));
 const allowed=longitudinal?new Set(["column"]):new Set(["column","endPost","rafter"]);
 candidates.forEach(m=>{
  const ends=[String(m.start),String(m.end)].map(nodeId=>{
   const node=nodeMap.get(nodeId),adjacent=(byNode.get(nodeId)||[]).filter(x=>x.id!==m.id),supports=adjacent.filter(x=>allowed.has(String(x.sectionKey||"")));
   const connected=!!node&&supports.length>0;
   if(!connected)issues.push("عضو "+m.id+" در گره "+nodeId+" به عضو قائم/اصلی مجاورِ قابل‌شناسایی متصل نیست.");
   return {nodeId,nodeKind:node?.kind||null,adjacentMemberIds:adjacent.map(x=>String(x.id)),supportMemberIds:supports.map(x=>String(x.id)),connected};
  });
  rows.push({memberId:String(m.id),start:ends[0],end:ends[1]});
 });
 return {success:issues.length===0,face,sectionKey,candidateMemberCount:candidates.length,connectedMemberCount:rows.filter(r=>r.start.connected&&r.end.connected).length,issues,rows,
 limitation:"فقط پیوستگی توپولوژیک بررسی می‌شود؛ اتصال اجرایی، سختی، ظرفیت و تبدیل بار سطحی به بارهای گره‌ای اثبات نمی‌شود."};
}
function audit(model){
 const issues=[],rows=[],nodalLoads=[];
 if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))return {success:false,loadTransferEnabled:false,issues:["مدل سه‌بعدی معتبر برای انتقال وزن دیوار موجود نیست."],rows,nodalLoads};
 const brief=root.SteelDesignCore?.getData?.(),walls=brief?.wallEnvelope;
 if(!walls)return {success:false,loadTransferEnabled:false,issues:["مشخصات چهار وجه دیوار در مبانی طراحی موجود نیست."],rows,nodalLoads};
 let masonry=null;
 try{masonry=root.SteelMasonryWallAudit?.audit?.(model)||null;}catch(e){issues.push("ممیزی وزن دیوار آجری اجرا نشد: "+String(e.message||e));}
 if(!masonry)issues.push("محاسبه مساحت/وزن دیوار برای کنترل بازشوها در دسترس نیست.");
 const g=model.geometry;
 if(!(Number(g.span)>0&&Number(g.length)>0&&Number(g.height)>0&&Number(g.rise)>=0))issues.push("ابعاد هندسی برای توزیع وزن دیوار معتبر نیست.");
 FACES.forEach(face=>{
  const cfg=walls[face];if(!cfg?.material)return;
  const mode=cfg.supportMode||"unknown";
  if(mode==="grade-beam"){
   const m=brief.masonry||{},thickness=num(m.thicknessMm),gamma=num(m.unitWeightKNm3),plaster=num(m.plasterThicknessMm)||0,extra=num(cfg.deadSurfaceLoadKNm2);
   if(cfg.material!=="brick"||!(thickness>0&&gamma>0)||(plaster>0&&!(extra!==null&&extra>0))){
    issues.push(face+": برای شناژ زیر دیوار، نوع مصالح آجری، ضخامت، وزن مخصوص و وزن اندود معتبر لازم است.");
    rows.push({face,status:"grade-beam-missing-wall-weight",weightKN:null,nodeCount:0});return;
   }
   const faceData=masonry?.faces?.find(x=>x.face===face),expectedArea=face==="front"||face==="rear"?Number(g.span)*Number(g.height)+Number(g.span)*Number(g.rise)/2:Number(g.length)*Number(g.height);
   if(!faceData||faceData.openingAreaM2>1e-8||Math.abs(Number(faceData.netAreaM2)-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){
    issues.push(face+": بازشو یا اختلاف مساحت دیوار وجود دارد؛ تا توزیع موضعی بار دیوار روی شناژ، انتقال متوقف است.");
    rows.push({face,status:"grade-beam-opening-or-area-unresolved",weightKN:null,nodeCount:0});return;
   }
   const q=thickness/1000*gamma+(extra||0),path=inspectGradeBeamSupportPath(model,face,q);
   if(!path.success)issues.push(face+": مسیر شناژ زیر دیوار کامل/بدون هم‌پوشانی نیست: "+path.issues.join("؛ "));
   else if(path.success){}
   rows.push({face,status:path.success?"grade-beam-line-load-ready":"grade-beam-path-incomplete",material:cfg.material,supportMode:mode,weightKN:path.weightKN,areaM2:path.segments.reduce((s,x)=>s+x.wallAreaM2,0),nodeCount:0,gradeBeamSupportAudit:path});return;
  }
  if(mode==="steel-secondary"){
   const topology=inspectSecondarySupportPath(model,face);
   issues.push(face+": "+(topology.success
    ?"اتصال توپولوژیک گرت به اعضای اصلی شناسایی شد؛ اما تبدیل وزن سطحی دیوار به بارهای گرت و واکنش‌های گره‌ای هنوز پیاده‌سازی و اعتبارسنجی نشده است."
    :"مسیر توپولوژیک زیرسازی فولادی ناقص است: "+topology.issues.join("؛ ")));
   rows.push({face,status:topology.success?"secondary-topology-only":"secondary-topology-incomplete",weightKN:null,nodeCount:0,secondarySupportAudit:topology});return;
  }
  if(mode!=="foundation-bearing"){
   issues.push(face+": مسیر تحمل وزن دیوار باید صریحاً «اتکای مستقیم به تکیه‌گاه‌های پایه مدل‌شده» باشد؛ قاب مستقل یا مسیر نامشخص هنوز مدل نشده است.");
   rows.push({face,status:"unsupported-support-mode",weightKN:null,nodeCount:0});return;
  }
  const faceData=masonry?.faces?.find(x=>x.face===face);
  if(!faceData){issues.push(face+": مساحت خالص و اطلاعات بازشو برای دیوار موجود نیست.");rows.push({face,status:"missing-area",weightKN:null,nodeCount:0});return;}
  if(faceData.openingAreaM2>1e-8){issues.push(face+": وجود بازشو ثبت شده است؛ توزیع موضعی وزن باقیمانده به تکیه‌گاه‌ها هنوز مدل نشده و انتقال متوقف شد.");rows.push({face,status:"opening-distribution-required",weightKN:null,nodeCount:0});return;}
  let q=null,source="";
  if(cfg.material==="brick"){
   const m=brief.masonry||{},thickness=num(m.thicknessMm),gamma=num(m.unitWeightKNm3),plaster=num(m.plasterThicknessMm)||0,extra=num(cfg.deadSurfaceLoadKNm2);
   if(!(thickness>0&&gamma>0)){issues.push(face+": ضخامت و وزن مخصوص دیوار آجری برای محاسبه وزن مرده لازم است.");rows.push({face,status:"missing-masonry-weight",weightKN:null,nodeCount:0});return;}
   if(plaster>0&&!(extra!==null&&extra>0)){issues.push(face+": اندود دیوار ثبت شده اما وزن سطحی افزوده آن وارد نشده است.");rows.push({face,status:"missing-plaster-weight",weightKN:null,nodeCount:0});return;}
   q=thickness/1000*gamma+(extra||0);source="masonry thickness × unit weight + declared additional surface weight";
   if(faceData.weightKN===null){issues.push(face+": وزن دیوار آجری از ممیزی مصالح قابل محاسبه نیست.");rows.push({face,status:"missing-masonry-weight",weightKN:null,nodeCount:0});return;}
  }else{
   const w=num(cfg.deadSurfaceLoadKNm2);
   if(!(w!==null&&w>0)){issues.push(face+": وزن سطحی مرده پوشش غیرآجری باید از کاتالوگ/مشخصات وارد شود.");rows.push({face,status:"missing-surface-weight",weightKN:null,nodeCount:0});return;}
   q=w;source="user-entered manufacturer/specification surface dead weight";
  }
  const area=Number(faceData.netAreaM2);
  if(!(area>0&&finite(area))){issues.push(face+": مساحت دیوار برای وزن مرده معتبر نیست.");rows.push({face,status:"invalid-area",weightKN:null,nodeCount:0});return;}
  const expectedArea=face==="front"||face==="rear"?Number(g.span)*Number(g.height)+Number(g.span)*Number(g.rise)/2:Number(g.length)*Number(g.height);
  if(Math.abs(area-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){issues.push(face+": مساحت خالص با مساحت کامل سطح تفاوت دارد؛ تا مدل‌سازی محل بازشوها، انتقال وزن متوقف شد.");rows.push({face,status:"area-mismatch",weightKN:null,nodeCount:0});return;}
  const supports=supportNodes(model,face);
  const weights=faceAreaWeights(model,face,supports);
  if(!weights||weights.some(x=>!x.nodeId||!(x.areaM2>0))){issues.push(face+": گره‌های پایه برای پوشش کامل طول/عرض دیوار کافی یا پیوسته نیستند.");rows.push({face,status:"missing-support-nodes",weightKN:null,nodeCount:supports.length});return;}
  const totalArea=weights.reduce((sum,x)=>sum+x.areaM2,0);
  if(Math.abs(totalArea-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){issues.push(face+": جمع مساحت‌های بارگیر تکیه‌گاه‌ها با سطح دیوار برابر نیست.");rows.push({face,status:"tributary-area-mismatch",weightKN:null,nodeCount:supports.length});return;}
  const weightKN=q*totalArea;
  weights.forEach(x=>nodalLoads.push({nodeId:x.nodeId,values:[0,-weightKN*1000*x.areaM2/totalArea,0,0,0,0],source:"wall-dead-load",face,tributaryAreaM2:x.areaM2,sourceWeightKN:weightKN* x.areaM2/totalArea}));
  rows.push({face,status:"assigned",material:cfg.material,supportMode:mode,source,unitWeightKNm2:q,areaM2:totalArea,weightKN,nodeCount:weights.length,tributaryAreas:weights.map(x=>({nodeId:x.nodeId,areaM2:x.areaM2}))});
 });
 const success=issues.length===0&&rows.length===FACES.filter(f=>walls[f]?.material).length&&rows.every(r=>r.status==="assigned"||r.status==="grade-beam-line-load-ready");
 return {success,loadTransferEnabled:success,issues,rows,nodalLoads,totalWeightKN:rows.filter(r=>["assigned","grade-beam-line-load-ready"].includes(r.status)).reduce((s,r)=>s+r.weightKN,0),method:"foundation-bearing wall dead weight distributed to explicit base support nodes by tributary wall area",limits:["Only walls explicitly bearing on the modeled base support nodes are supported in this version.","This is a tributary reaction distribution, not a continuous strip-footing/soil-contact model or footing design.","Walls with openings are blocked until opening-localized tributary areas are modelled.","Steel-secondary and independent wall support systems are not transferred.","Gable wind is separate and remains blocked until its cladding-to-post/top-chord path is defined."],analysisEnabled:false,designApproved:false};
}
function prepareNodalLoads(model,deadFactor,precomputedAudit){
 const factor=num(deadFactor);if(factor===null||factor<0)throw Error("ضریب بار مرده دیوار نامعتبر است.");
 const a=precomputedAudit||audit(model);if(!a.success||a.loadTransferEnabled!==true)throw Error("انتقال وزن مرده دیوار ناقص است: "+(a.issues||[]).join("؛ "));
 if(factor===0)return [];
 const map=new Map();
 a.nodalLoads.forEach(n=>{const old=map.get(n.nodeId)||{nodeId:n.nodeId,values:[0,0,0,0,0,0],sources:[]};n.values.forEach((v,i)=>old.values[i]+=v*factor);old.sources.push({face:n.face,sourceWeightKN:n.sourceWeightKN*factor});map.set(n.nodeId,old);});
 return [...map.values()];
}
function prepareMemberLineLoads(model,deadFactor,precomputedAudit){
 const factor=num(deadFactor);if(factor===null||factor<0)throw Error("ضریب بار مرده دیوار نامعتبر است.");
 const a=precomputedAudit||audit(model);if(!a.success||a.loadTransferEnabled!==true)throw Error("انتقال بار دیوار به شناژ کامل نیست: "+(a.issues||[]).join("؛ "));
 if(factor===0)return[];
 const routes=new Map();
 (root.SteelTieBeamLayout?.getData?.()?.routes||[]).forEach(r=>routes.set(String(r.id),r));
 const out=[];
 a.rows.filter(r=>r.status==="grade-beam-line-load-ready").forEach(row=>{
  const routeIds=new Set((row.gradeBeamSupportAudit?.segments||[]).map(s=>s.routeId));
  routeIds.forEach(routeId=>{
   const route=routes.get(routeId);if(!route)throw Error("مسیر شناژ "+routeId+" در زمان اعمال بار پیدا نشد.");
   const segment=row.gradeBeamSupportAudit.segments.find(s=>s.routeId===routeId);
   const start=model.nodes.find(n=>String(n.id)===segment.startNodeId),end=model.nodes.find(n=>String(n.id)===segment.endNodeId);
   if(!start||!end)throw Error("گره ابتدا/انتهای شناژ "+routeId+" در مدل موجود نیست.");
   const axis=row.face==="left"||row.face==="right"?"z":"x",cross=axis==="z"?"x":"z";
   const direction=Math.sign(Number(end[axis])-Number(start[axis]));
   const intermediate=model.nodes.filter(n=>(n.kind==="base"||n.kind==="endwall-base")&&Math.abs(Number(n.y)-Number(start.y))<=0.01&&Math.abs(Number(n[cross])-Number(start[cross]))<=1e-4&&direction*(Number(n[axis])-Number(start[axis]))>0.01&&direction*(Number(end[axis])-Number(n[axis]))>0.01).sort((a,b)=>direction*(Number(a[axis])-Number(b[axis])));
   const routeNodes=[start,...intermediate,end];
   const beamPrefix="TIE_BEAM_"+routeId.replace(/[^A-Za-z0-9_-]/g,"_")+"_S";
   const coordinate=row.face==="left"||row.face==="right"?"z":"x";
   for(let i=0;i<routeNodes.length-1;i++){
    const ni=routeNodes[i],nj=routeNodes[i+1],memberId=beamPrefix+(i+1),length=Math.hypot(nj.x-ni.x,nj.y-ni.y,nj.z-ni.z);
    const intensity=node=>Number(segment.unitWeightKNm2)*
     (row.face==="left"||row.face==="right"?Number(model.geometry.height):roofY(Number(node[coordinate]),model.geometry));
    const q0=intensity(ni),q1=intensity(nj),average=(q0+q1)/2;
    out.push({memberId,routeId,face:row.face,uniformGlobalKNm:[0,-average,0],globalStartKNm:[0,-q0,0],globalEndKNm:[0,-q1,0],
     lineLoadKNm:average,sourceWeightKN:average*length,segmentLengthM:length,deadFactor:factor,loadFactorAppliedInSolver:true,distribution:"linear-global-vertical"});
   }
  });
 });
 return out;
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:fn()!==false});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const oldBrief=root.SteelDesignCore,oldMasonry=root.SteelMasonryWallAudit,oldTransfer=root.SteelWallDeadLoadTransfer,oldTieBeam=root.SteelTieBeamLayout;
 const g={span:10,length:20,height:5,rise:2};
 const nodes=[
  {id:"L0",x:0,y:0,z:0,kind:"base"},{id:"L1",x:0,y:0,z:10,kind:"base"},{id:"L2",x:0,y:0,z:20,kind:"base"},
  {id:"R0",x:10,y:0,z:0,kind:"base"},{id:"R1",x:10,y:0,z:10,kind:"base"},{id:"R2",x:10,y:0,z:20,kind:"base"},
  {id:"F1",x:5,y:0,z:0,kind:"endwall-base"},{id:"B1",x:5,y:0,z:20,kind:"endwall-base"}
 ];
 const model={geometry:g,nodes,members:[]};
 const wallEnvelope={front:{material:"brick",supportMode:"foundation-bearing"},rear:{material:"brick",supportMode:"foundation-bearing"},left:{material:"brick",supportMode:"foundation-bearing"},right:{material:"brick",supportMode:"foundation-bearing"}};
 const brief={wallEnvelope,masonry:{thicknessMm:200,unitWeightKNm3:18,plasterThicknessMm:0}};
 root.SteelDesignCore={getData:()=>brief};
 root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:(face==="front"||face==="rear")?60:100,openingAreaM2:0,weightKN:(face==="front"||face==="rear")?216:360}))})};
 const a=audit(model);
 t("foundation-bearing brick walls produce four face transfers",()=>a.success&&a.rows.length===4&&a.nodalLoads.length===12);
 t("grade-beam support is never converted to frame-base nodal loads",()=>{brief.wallEnvelope.left.supportMode="grade-beam";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success&&x.nodalLoads.length===9&&x.rows.find(r=>r.face==="left").status==="grade-beam-path-incomplete";});
 t("tributary nodal forces equal total wall dead weight",()=>Math.abs(a.nodalLoads.reduce((s,x)=>s-x.values[1]/1000,0)-a.totalWeightKN)<1e-8);
 t("front gable tributary areas integrate exact roof slope",()=>{const f=a.rows.find(x=>x.face==="front");return Math.abs(f.areaM2-(10*5+10*2/2))<1e-8;});
 t("dead factor scales only the wall dead nodal actions",()=>{const x=prepareNodalLoads(model,1.4);return Math.abs(x.reduce((s,n)=>s-n.values[1]/1000,0)-a.totalWeightKN*1.4)<1e-8;});
 t("unknown support mode is blocked",()=>{brief.wallEnvelope.left.supportMode="unknown";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success&&x.issues.some(v=>v.includes("اتکای مستقیم"));});
 t("steel-secondary support remains explicitly unsupported",()=>{brief.wallEnvelope.left.supportMode="steel-secondary";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success;});
 t("complete longitudinal girt-to-column topology is recognized",()=>{const x=inspectSecondarySupportPath({nodes:[{id:"A"},{id:"B"},{id:"C"},{id:"D"}],members:[{id:"G",sectionKey:"wallGirt",side:"left",start:"A",end:"B"},{id:"C1",sectionKey:"column",start:"A",end:"C"},{id:"C2",sectionKey:"column",start:"B",end:"D"}]},"left");return x.success&&x.candidateMemberCount===1&&x.connectedMemberCount===1;});
 t("missing longitudinal girt support at one end is blocked",()=>{const x=inspectSecondarySupportPath({nodes:[{id:"A"},{id:"B"},{id:"C"}],members:[{id:"G",sectionKey:"wallGirt",side:"left",start:"A",end:"B"},{id:"C1",sectionKey:"column",start:"A",end:"C"}]},"left");return !x.success&&x.issues.length===1;});
 t("complete end-wall girt-to-post topology is recognized",()=>{const x=inspectSecondarySupportPath({nodes:[{id:"A"},{id:"B"},{id:"C"},{id:"D"}],members:[{id:"G",sectionKey:"endGirt",endFace:"front",start:"A",end:"B"},{id:"P1",sectionKey:"endPost",start:"A",end:"C"},{id:"P2",sectionKey:"endPost",start:"B",end:"D"}]},"front");return x.success&&x.connectedMemberCount===1;});
 t("non-brick wall requires entered surface weight",()=>{brief.wallEnvelope.left.material="sandwich-panel";const x=audit(model);brief.wallEnvelope.left.material="brick";return !x.success&&x.issues.some(v=>v.includes("وزن سطحی"));});
 t("wall openings block uniform tributary distribution",()=>{root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:59,openingAreaM2:1,weightKN:2124}))})};const x=audit(model);root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:(face==="front"||face==="rear")?60:100,openingAreaM2:0,weightKN:(face==="front"||face==="rear")?216:360}))})};return !x.success&&x.issues.some(v=>v.includes("بازشو"));});
 t("missing base support coverage is blocked",()=>{const x=audit({...model,nodes:nodes.filter(n=>n.id!=="L0")});return !x.success;});
 t("zero dead factor produces no wall nodal actions",()=>prepareNodalLoads(model,0).length===0);
 t("precomputed audit is reused without recalculating wall weights",()=>{const old=root.SteelMasonryWallAudit;root.SteelMasonryWallAudit={audit(){throw new Error("should not recalculate");}};const x=prepareNodalLoads(model,1.2,a);root.SteelMasonryWallAudit=old;return x.length>0;});
 t("grade-beam route audit accepts a continuous wall-side route",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T1",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:0,z:20}]},"left",3.6);return x.success&&Math.abs(x.weightKN-360)<1e-8&&x.solverLoadsGenerated===false;});
 t("grade-beam route audit blocks incomplete coverage",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T1",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:0,z:10}]},"left",3.6);return !x.success&&x.issues.some(v=>v.includes("پیوسته"));});
  t("gable route crossing ridge requires an actual ridge base node",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T2",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:10,y:0,z:0}]}, "front",3.6);return !x.success&&x.segments[0].crossesRidge===true&&x.issues.some(v=>v.includes("گره پایه در محور تاج"));});
 t("gable variable wall load uses exact end intensities on both roof slopes",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T3L",start:"A",end:"C",startJoint:"rigid",endJoint:"rigid"},{id:"T3R",start:"C",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0,kind:"endwall-base"},{id:"C",x:5,y:0,z:0,kind:"endwall-base"},{id:"B",x:10,y:0,z:0,kind:"endwall-base"}]},"front",3.6);return x.success&&Math.abs(x.segments[0].startLineLoadKNm-18)<1e-8&&Math.abs(x.segments[0].endLineLoadKNm-25.2)<1e-8&&Math.abs(x.segments[1].startLineLoadKNm-25.2)<1e-8&&Math.abs(x.segments[1].endLineLoadKNm-18)<1e-8&&Math.abs(x.weightKN-216)<1e-8;});
 t("grade-beam wall transfer creates line loads, not base-node loads",()=>{const old= root.SteelTieBeamLayout;root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T1",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const model={geometry:g,nodes:[{id:"A",x:0,y:0,z:0,kind:"base"},{id:"M1",x:0,y:0,z:5,kind:"base"},{id:"M2",x:0,y:0,z:15,kind:"base"},{id:"B",x:0,y:0,z:20,kind:"base"}]};const auditResult={success:true,loadTransferEnabled:true,rows:[{face:"left",status:"grade-beam-line-load-ready",gradeBeamSupportAudit:{segments:[{routeId:"T1",startNodeId:"A",endNodeId:"B",uniformEquivalentLineLoadKNm:3.6,startLineLoadKNm:3.6,endLineLoadKNm:3.6,weightKN:72}]}}]};const x=prepareMemberLineLoads(model,1.5,auditResult);root.SteelTieBeamLayout=old;return x.length===3&&x.every(v=>Math.abs(v.lineLoadKNm-3.6)<1e-8)&&Math.abs(x.reduce((s,v)=>s+v.sourceWeightKN,0)-72)<1e-8;});
 t("gable split شناژ segments carry peak ridge intensity and exact total weight",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"GL",start:"A",end:"C",startJoint:"rigid",endJoint:"rigid"},{id:"GR",start:"C",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const gm={geometry:g,nodes:[{id:"A",x:0,y:0,z:0,kind:"endwall-base"},{id:"C",x:5,y:0,z:0,kind:"endwall-base"},{id:"B",x:10,y:0,z:0,kind:"endwall-base"}]};const ar={success:true,loadTransferEnabled:true,rows:[{face:"front",status:"grade-beam-line-load-ready",gradeBeamSupportAudit:{segments:[{routeId:"GL",startNodeId:"A",endNodeId:"C",unitWeightKNm2:3.6},{routeId:"GR",startNodeId:"C",endNodeId:"B",unitWeightKNm2:3.6}]}}]};const loads=prepareMemberLineLoads(gm,1,ar);return loads.length===2&&Math.abs(loads[0].globalStartKNm[1]+18)<1e-8&&Math.abs(loads[0].globalEndKNm[1]+25.2)<1e-8&&Math.abs(loads[1].globalStartKNm[1]+25.2)<1e-8&&Math.abs(loads[1].globalEndKNm[1]+18)<1e-8&&Math.abs(loads.reduce((sum,x)=>sum+x.sourceWeightKN,0)-216)<1e-8;});
 t("analysis approval remains disabled",()=>a.analysisEnabled===false&&a.designApproved===false);
 root.SteelDesignCore=oldBrief;root.SteelMasonryWallAudit=oldMasonry;root.SteelWallDeadLoadTransfer=oldTransfer;root.SteelTieBeamLayout=oldTieBeam;
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests};
}
root.SteelWallDeadLoadTransfer={audit,prepareNodalLoads,prepareMemberLineLoads,inspectSecondarySupportPath,inspectGradeBeamSupportPath,selfTest};
})(typeof window!=="undefined"?window:globalThis);
