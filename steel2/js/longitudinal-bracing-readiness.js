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
 wallBraces.forEach(m=>[m.start,m.end].forEach(n=>braceTargets.push({nodeId:String(n),braceId:String(m.id),braceType:"wallBrace",longitudinalKey:"wallGirt"})));
 roofBraces.forEach(m=>[m.start,m.end].forEach(n=>braceTargets.push({nodeId:String(n),braceId:String(m.id),braceType:"roofBrace",longitudinalKey:"roofPurlin"})));
 const adjacency=new Map();
 const add=(from,edge)=>{const k=String(from);if(!adjacency.has(k))adjacency.set(k,[]);adjacency.get(k).push(edge);};
 members.forEach(m=>{
  if(!nodeIds.has(String(m.start))||!nodeIds.has(String(m.end)))return;
  add(m.start,{to:String(m.end),id:String(m.id),sectionKey:m.sectionKey});
  add(m.end,{to:String(m.start),id:String(m.id),sectionKey:m.sectionKey});
 });
 function trace(sourceNode,longitudinalKey){
  const queue=[{node:String(sourceNode),usedLongitudinal:false,memberIds:[],sectionKeys:[]}],seen=new Set([String(sourceNode)+"|0"]);
  while(queue.length){
   const cur=queue.shift();
   const target=braceTargets.find(t=>t.nodeId===cur.node&&t.longitudinalKey===longitudinalKey);
   if(target&&cur.usedLongitudinal)return{ok:true,sourceNode:String(sourceNode),targetNode:cur.node,braceId:target.braceId,braceType:target.braceType,memberIds:cur.memberIds,sectionKeys:cur.sectionKeys};
   for(const e of adjacency.get(cur.node)||[]){
    const used=cur.usedLongitudinal||e.sectionKey===longitudinalKey;
    const key=e.to+"|"+(used?1:0);if(seen.has(key))continue;seen.add(key);
    queue.push({node:e.to,usedLongitudinal:used,memberIds:[...cur.memberIds,e.id],sectionKeys:[...cur.sectionKeys,e.sectionKey]});
   }
  }
  return{ok:false,sourceNode:String(sourceNode),targetNode:null,braceId:null,braceType:null,memberIds:[],sectionKeys:[]};
 }
 const routes=[];
 endGirts.forEach(m=>{
  [m.start,m.end].forEach(nodeId=>{
   const options=[trace(nodeId,"wallGirt"),trace(nodeId,"roofPurlin")].filter(x=>x.ok);
   const route=options.sort((a,b)=>a.memberIds.length-b.memberIds.length)[0]||{ok:false,sourceNode:String(nodeId),targetNode:null,braceId:null,braceType:null,memberIds:[],sectionKeys:[]};
   routes.push({endGirtId:String(m.id),endFace:m.endFace,nodeId:String(nodeId),...route});
  });
 });
 const missingRoutes=routes.filter(x=>!x.ok);
 if(missingRoutes.length)issues.push("برای "+missingRoutes.length+" انتهای گرت بارگیر، مسیر پیوسته از طریق گرت طولی/پرلین تا گره مهاربند پیدا نشد؛ collector/دیافراگم نباید فرض شود.");
 const validLoads=loadChecks.length>0&&loadChecks.every(x=>x.ok);
 const routeOK=routes.length>0&&missingRoutes.length===0;
 rows.push({id:"endwall-wind-to-longitudinal-bracing",label:"مسیر باد دیوار انتهایی تا مهاربندهای طولی",memberCount:loadChecks.length,coveredCount:loadChecks.filter(x=>x.ok).length,missingCount:missingRoutes.length+loadChecks.filter(x=>!x.ok).length,status:validLoads&&routeOK?"connected":"incomplete",loadChecks,routes,transfer:"end-wall pressure → end-girt → connected longitudinal wall-girt/roof-purlin member → brace endpoint"});
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
 t("route without longitudinal girt or purlin rejected",()=>{const m=JSON.parse(JSON.stringify(base));m.members=m.members.filter(x=>x.sectionKey!=="wallGirt");return !audit(m,{windEndFront:3,windEndBack:0}).success;});
 t("disconnected brace network rejected",()=>{const m=JSON.parse(JSON.stringify(base));m.members=m.members.filter(x=>x.id!=="WB"&&x.id!=="WB2");return !audit(m,{windEndFront:3,windEndBack:0}).success;});
 t("roof purlin path to roof brace accepted",()=>{const m=JSON.parse(JSON.stringify(base));m.members=m.members.filter(x=>x.sectionKey!=="wallGirt"&&x.sectionKey!=="wallBrace");m.members.push({id:"P1",sectionKey:"roofPurlin",start:"e1",end:"g1"},{id:"P2",sectionKey:"roofPurlin",start:"e2",end:"g2"},{id:"RB1",sectionKey:"roofBrace",start:"g1",end:"b1"},{id:"RB2",sectionKey:"roofBrace",start:"g2",end:"b2"});return audit(m,{windEndFront:3,windEndBack:0}).success;});
 t("does not claim diaphragm or design approval",()=>{const r=audit(base,{windEndFront:3,windEndBack:0});return r.topologyOnly&&r.diaphragmStiffnessVerified===false&&r.collectorCapacityVerified===false&&r.designApproved===false;});
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests};
}
root.SteelLongitudinalBracingReadiness={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
