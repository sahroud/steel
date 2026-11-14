/* SAHROUD STEEL — longitudinal wind-to-bracing topology readiness.
 * Verifies explicit end-wall pressure-to-girt loads and a connected route from
 * loaded end-girt nodes to a braced bay through longitudinal purlin/girt members.
 * This is a topology/load-assignment gate, not a diaphragm stiffness or capacity check.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const nonzero=v=>finite(v)&&Math.abs(v)>1e-10;
function audit(model,loads){
 const issues=[],rows=[],members=Array.isArray(model?.members)?model.members:[],nodes=Array.isArray(model?.nodes)?model.nodes:[];
 const activeFaces=[["front",loads?.windEndFront],["rear",loads?.windEndBack]].filter(([,p])=>nonzero(Number(p)));
 if(!activeFaces.length)return{success:true,applicable:false,activeFaces:[],issues,rows,status:"not-applicable",analysisEnabled:false,designApproved:false};
 if(!model||!members.length||!nodes.length)issues.push("مدل هندسی/گره‌ها برای بررسی انتقال باد طولی موجود نیست.");
 const nodeIds=new Set(nodes.map(n=>String(n.id)));
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const endGirts=members.filter(m=>m.sectionKey==="endGirt"&&activeFaces.some(([face])=>m.endFace===face));
 const wallBraces=members.filter(m=>m.sectionKey==="wallBrace"),roofBraces=members.filter(m=>m.sectionKey==="roofBrace");
 if(!endGirts.length)issues.push("برای وجه انتهایی دارای فشار باد، هیچ گرت انتهایی در مدل وجود ندارد.");
 if(!wallBraces.length&&!roofBraces.length)issues.push("هیچ مهاربند طولی سقف یا دیوار برای دریافت بار طولی مدل نشده است.");
 const loadChecks=[];
 activeFaces.forEach(([face,p])=>{
  const list=endGirts.filter(m=>m.endFace===face);
  if(!list.length){issues.push("گرتی برای وجه "+face+" که فشار باد غیرصفر دارد وجود ندارد.");return;}
  list.forEach(m=>{
   const h=Number(m.tributaryHeight??m.lineLoads?.tributaryHeight),q=Number(m.lineLoads?.windEnd),expected=Number(p)*h;
   const ok=finite(h)&&h>0&&finite(q)&&finite(expected)&&Math.abs(q-expected)<=Math.max(1e-8,Math.abs(expected)*1e-6);
   loadChecks.push({face,memberId:String(m.id),pressure_kPa:Number(p),tributaryHeight_m:h,expectedLineLoad_kN_m:expected,assignedLineLoad_kN_m:q,ok});
   if(!ok)issues.push("بار باد/ارتفاع بارگیر گرت "+m.id+" در وجه "+face+" با فشار ورودی و بار خطی مدل تطبیق ندارد.");
   if(!nodeIds.has(String(m.start))||!nodeIds.has(String(m.end)))issues.push("گره ابتدا/انتها برای گرت "+m.id+" موجود نیست.");
  });
 });
 // Only a modeled longitudinal purlin/girt can serve as a candidate transfer member.
 // It is not automatically accepted as a collector: its connection and stiffness must
 // be represented in the FEM model and verified from drawings.
 const braceTargets=[];
 wallBraces.forEach(m=>[m.start,m.end].forEach(n=>braceTargets.push({nodeId:String(n),braceId:String(m.id),braceType:"wallBrace"})));
 roofBraces.forEach(m=>[m.start,m.end].forEach(n=>braceTargets.push({nodeId:String(n),braceId:String(m.id),braceType:"roofBrace"})));
 const adjacency=new Map();
 const add=(from,edge)=>{const k=String(from);if(!adjacency.has(k))adjacency.set(k,[]);adjacency.get(k).push(edge);};
 members.forEach(m=>{
  // The loaded end-girt is the source, not a collector; bracing members are target elements.
  // The intervening end-wall posts, columns, rafters, purlins and girts must be real FEM members.
  if(["endGirt","wallBrace","roofBrace"].includes(m.sectionKey))return;
  if(!nodeIds.has(String(m.start))||!nodeIds.has(String(m.end)))return;
  add(m.start,{to:String(m.end),id:String(m.id),sectionKey:m.sectionKey});
  add(m.end,{to:String(m.start),id:String(m.id),sectionKey:m.sectionKey});
 });
 function trace(sourceNode){
  const queue=[{node:String(sourceNode),memberIds:[],sectionKeys:[]}],seen=new Set([String(sourceNode)]);
  while(queue.length){
   const cur=queue.shift();
   const target=braceTargets.find(t=>t.nodeId===cur.node);
   if(target&&cur.memberIds.length)return{ok:true,sourceNode:String(sourceNode),targetNode:cur.node,braceId:target.braceId,braceType:target.braceType,memberIds:cur.memberIds,sectionKeys:cur.sectionKeys};
   for(const e of adjacency.get(cur.node)||[]){
    if(seen.has(e.to))continue;seen.add(e.to);
    queue.push({node:e.to,memberIds:[...cur.memberIds,e.id],sectionKeys:[...cur.sectionKeys,e.sectionKey]});
   }
  }
  return{ok:false,sourceNode:String(sourceNode),targetNode:null,braceId:null,braceType:null,memberIds:[],sectionKeys:[]};
 }
 const routes=[];
 endGirts.forEach(m=>{
  [m.start,m.end].forEach(nodeId=>routes.push({endGirtId:String(m.id),endFace:m.endFace,nodeId:String(nodeId),...trace(nodeId)}));
 });
 const missingRoutes=routes.filter(x=>!x.ok);
 const missingFaceCount=activeFaces.filter(([face])=>!endGirts.some(m=>m.endFace===face)).length;
 if(missingRoutes.length)issues.push("برای "+missingRoutes.length+" انتهای گرت بارگیر، مسیر گره‌ای از طریق اعضای واقعی قاب انتهایی تا یک گره مهاربند پیدا نشد؛ مسیر collector/دیافراگم فرض نمی‌شود.");
 const validLoads=loadChecks.length>0&&loadChecks.every(x=>x.ok);
 const routeOK=routes.length>0&&missingRoutes.length===0;
 rows.push({id:"endwall-wind-to-longitudinal-bracing",label:"مسیر باد دیوار انتهایی تا مهاربندهای طولی",memberCount:loadChecks.length+routes.length+missingFaceCount,coveredCount:loadChecks.filter(x=>x.ok).length+routes.filter(x=>x.ok).length,missingCount:missingFaceCount+missingRoutes.length+loadChecks.filter(x=>!x.ok).length,status:validLoads&&routeOK?"connected":"incomplete",loadChecks,routes,transfer:"end-wall pressure → end-girt → end-post/column/rafter FEM members → longitudinal brace end node"});
 return{success:issues.length===0&&validLoads&&routeOK,applicable:true,activeFaces:activeFaces.map(x=>x[0]),issues,rows,loadChecks,routes,missingRouteCount:missingRoutes.length,
  topologyOnly:true,diaphragmStiffnessVerified:false,collectorCapacityVerified:false,analysisEnabled:false,designApproved:false,
  limitations:["این ممیزی فقط اشتراک گره و پیوستگی هندسی مسیر را بررسی می‌کند؛ سختی دیافراگم، عملکرد collector، لغزش اتصالات و تقسیم واقعی نیرو را اثبات نمی‌کند.","پرلین/گرت فقط وقتی می‌تواند در تحلیل نقش انتقالی داشته باشد که خواص مقطع، اتصالات و قیود واقعی آن در مدل FEM درست تعریف شده باشد.","بارهای باد موضعی، ناحیه مثلثی گابل و طراحی ظرفیت مهاربند/اتصال در این ماژول کنترل نمی‌شود."]};
}
function selfTest(){
 const base={nodes:[{id:"e1"},{id:"e2"},{id:"g1"},{id:"g2"},{id:"b1"},{id:"b2"}],members:[
 {id:"EG",sectionKey:"endGirt",endFace:"front",start:"e1",end:"e2",tributaryHeight:2,lineLoads:{windEnd:6}},
 {id:"WG",sectionKey:"wallGirt",start:"e1",end:"g1"},{id:"WB",sectionKey:"wallBrace",start:"g1",end:"b1"},
 {id:"WG2",sectionKey:"wallGirt",start:"e2",end:"g2"},{id:"WB2",sectionKey:"wallBrace",start:"g2",end:"b2"}]};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("inactive end-wall wind is not applicable",()=>audit(base,{windEndFront:0,windEndBack:0}).status==="not-applicable");
 t("complete end-girt to wall-brace route accepted",()=>audit(base,{windEndFront:3,windEndBack:0}).success);
 t("missing loaded-face end-girt rejected",()=>!audit({...base,members:base.members.filter(m=>m.sectionKey!=="endGirt")},{windEndFront:3,windEndBack:0}).success);
 t("pressure-to-line-load mismatch rejected",()=>{const m=JSON.parse(JSON.stringify(base));m.members[0].lineLoads.windEnd=5;return !audit(m,{windEndFront:3,windEndBack:0}).success;});
 t("end-wall frame members provide an explicit shared-node path to brace",()=>{const m={nodes:[{id:"e1"},{id:"c1"},{id:"b1"}],members:[{id:"E",sectionKey:"endGirt",endFace:"front",start:"e1",end:"e1",tributaryHeight:2,lineLoads:{windEnd:6}},{id:"EP",sectionKey:"endPost",start:"e1",end:"c1"},{id:"WB",sectionKey:"wallBrace",start:"c1",end:"b1"}]};return audit(m,{windEndFront:3,windEndBack:0}).success;});
 t("disconnected brace network rejected",()=>{const m=JSON.parse(JSON.stringify(base));m.members=m.members.filter(x=>x.id!=="WB"&&x.id!=="WB2");return !audit(m,{windEndFront:3,windEndBack:0}).success;});
 t("loaded end-girt cannot serve as its own structural bridge",()=>{const m={nodes:[{id:"a"},{id:"b"},{id:"c"},{id:"d"}],members:[{id:"E",sectionKey:"endGirt",endFace:"front",start:"a",end:"b",tributaryHeight:2,lineLoads:{windEnd:6}},{id:"WB",sectionKey:"wallBrace",start:"b",end:"c"}]};const r=audit(m,{windEndFront:3,windEndBack:0});return !r.success&&r.routes.some(x=>x.nodeId==="a"&&!x.ok);});
 t("roof purlin and end-frame path to roof brace accepted",()=>{const m=JSON.parse(JSON.stringify(base));m.members=m.members.filter(x=>x.sectionKey!=="wallGirt"&&x.sectionKey!=="wallBrace");m.members.push({id:"P1",sectionKey:"roofPurlin",start:"e1",end:"g1"},{id:"P2",sectionKey:"roofPurlin",start:"e2",end:"g2"},{id:"RB1",sectionKey:"roofBrace",start:"g1",end:"b1"},{id:"RB2",sectionKey:"roofBrace",start:"g2",end:"b2"});return audit(m,{windEndFront:3,windEndBack:0}).success;});
 t("does not claim diaphragm or design approval",()=>{const r=audit(base,{windEndFront:3,windEndBack:0});return r.topologyOnly&&r.diaphragmStiffnessVerified===false&&r.collectorCapacityVerified===false&&r.designApproved===false;});
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests};
}
root.SteelLongitudinalBracingReadiness={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
