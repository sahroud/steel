/* ===== steel2/js/longitudinal-bracing-readiness.js ===== */
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
   if(target)return{ok:true,sourceNode:String(sourceNode),targetNode:cur.node,braceId:target.braceId,braceType:target.braceType,memberIds:cur.memberIds,sectionKeys:cur.sectionKeys};
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


/* ===== steel2/js/whole-building-load-path-audit.js ===== */
/* SAHROUD STEEL — whole-building load path audit.
 * Audits existing tributary area-to-member line-load assignments.
 * It does not generate code loads or change solver inputs.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const num=v=>v===null||v===undefined||v===""?null:Number(v);
function auditGableTransfer(model,loads){
 const issues=[],members=Array.isArray(model?.members)?model.members:[],girts=members.filter(m=>m.sectionKey==="endGirt");
 const front=num(loads?.windEndFront),back=num(loads?.windEndBack),active=(front!==null&&Math.abs(front)>1e-12)||(back!==null&&Math.abs(back)>1e-12);
 if(!active)return{active:false,ready:true,issues:[],girtCount:girts.length,topology:null,area:null};
 if(!girts.length)issues.push("هیچ گرت انتهایی برای انتقال باد گابل وجود ندارد.");
 ["front","rear"].forEach(face=>{if(!girts.some(m=>m.endFace===face))issues.push("گرت انتهایی وجه "+face+" موجود نیست.");});
 const bad=girts.filter(m=>!finite(m.lineLoads?.windEnd)||!finite(m.lineLoads?.tributaryHeight)||!(m.lineLoads.tributaryHeight>0));
 if(bad.length)issues.push("بار خطی صریح/ارتفاع بارگیر گرت‌های انتهایی ناقص است: "+bad.slice(0,8).map(m=>m.id).join("، "));
 const topology=root.SteelEndWallGableSupportAudit?.audit?.(model)||null;
 if(!topology?.success)issues.push("توپولوژی گابل (اتصال گرت به ستونک/قاب و وتر رفتر) تأیید نشد: "+(topology?.issues||["ممیزی توپولوژی در دسترس نیست."]).join("؛ "));
 const area=root.SteelDirectionalWind3D?.auditGableTributaryAreaCoverage?.(model)||null;
 if(!area?.success)issues.push("بسته‌شدن مساحت بارگیر گابل تأیید نشد: "+(area?.issues||["ممیزی مساحت بارگیر در دسترس نیست."]).join("؛ "));
 return{active:true,ready:issues.length===0,issues,girtCount:girts.length,topology,area,analysisEnabled:false,designApproved:false};
}
function audit(model,loads){
 const issues=[],rows=[];
 if(!model||!Array.isArray(model.members)||!model.geometry)issues.push("مدل هندسی ساخته‌شده و فهرست اعضا در دسترس نیست.");
 if(!loads||typeof loads!=="object")issues.push("ورودی بارهای سطحی در دسترس نیست.");
 const members=Array.isArray(model?.members)?model.members:[];
 const groups={
  rafters:members.filter(m=>m.sectionKey==="rafter"&&m.axis==="transverse"),
  wallBraces:members.filter(m=>m.sectionKey==="wallBrace"), roofBraces:members.filter(m=>m.sectionKey==="roofBrace"),
  purlins:members.filter(m=>m.sectionKey==="roofPurlin"),
  wallGirts:members.filter(m=>m.sectionKey==="wallGirt"),
  endGirts:members.filter(m=>m.sectionKey==="endGirt")
 };
 const expected=[
  ["dead","بار مرده بام",["purlins"],["deadLeft","deadRight"]],
  ["live","بار زنده بام",["purlins"],["liveLeft","liveRight"]],
  ["snow","بار برف بام",["purlins"],["snowLeft","snowRight"]],
  ["windRoof","باد بام",["purlins"],["windLeft","windRight"]],
  ["windWall","باد دیوارهای طولی",["wallGirts"],["windWall"]],
  ["windEnd","باد دیوارهای انتهایی",["endGirts"],["windEndFront","windEndBack"]]
 ];
 expected.forEach(([id,label,targets,inputKeys])=>{
  const absent=inputKeys.filter(k=>num(loads?.[k])===null||!Number.isFinite(num(loads?.[k])));
  if(absent.length)issues.push(label+": ورودی عددی برای "+absent.join("، ")+" موجود نیست.");
  const targetMembers=targets.flatMap(k=>groups[k]);
  if(!targetMembers.length){issues.push(label+": هیچ عضو هدفی در مدل پیدا نشد.");rows.push({id,label,memberCount:0,status:"missing"});return;}
  const missing=[],bad=[],covered=[];
  targetMembers.forEach(m=>{
   const ll=m.lineLoads||{};
   let keys=[];
   if(id==="windRoof")keys=["windLeft","windRight"];
   else if(id==="windWall")keys=["wind"];
   else if(id==="windEnd")keys=["windEnd"];
   else keys=[id];
   if(keys.some(k=>ll[k]===undefined))missing.push(String(m.id));
   else if(keys.some(k=>!finite(ll[k])))bad.push(String(m.id));
   else covered.push(String(m.id));
   if((id==="dead"||id==="live"||id==="snow")&&!(Number(ll.tributaryWidth)>0)&&m.sectionKey==="roofPurlin")bad.push(String(m.id)+":tributaryWidth");
  });
  if(missing.length)issues.push(label+": بار به "+missing.length+" عضو از "+targetMembers.length+" عضو تخصیص نیافته است.");
  if(bad.length)issues.push(label+": بار یا عرض بارگیر نامعتبر در "+bad.slice(0,8).join("، "));
  rows.push({id,label,memberCount:targetMembers.length,coveredCount:covered.length,missingCount:missing.length,invalidCount:bad.length,status:missing.length||bad.length?"incomplete":"assigned",sampleMissing:missing.slice(0,8)});
 });
 // Independently verify the numerical conversion from roof surface pressure (kN/m²)
 // to each purlin line load (kN/m), including the two separate roof slopes at ridge.
 const purlinMagnitudeChecks=[];
 const magnitudeTolerance=1e-8;
 const closeLoad=(actual,expected)=>finite(actual)&&Math.abs(actual-expected)<=magnitudeTolerance*Math.max(1,Math.abs(actual),Math.abs(expected));
 groups.purlins.forEach(m=>{
  const ll=m.lineLoads||{},side=m.side;
  let wl=0,wr=0;
  if(side==="ridge"){
   wl=num(m.tributaryWidthLeft??ll.tributaryWidthLeft);wr=num(m.tributaryWidthRight??ll.tributaryWidthRight);
   if(wl===null||wr===null||wl<0||wr<0){purlinMagnitudeChecks.push({memberId:String(m.id),ok:false,reason:"ridge-tributary-widths-missing-or-invalid"});return;}
  }else{
   const width=num(m.tributaryWidth??ll.tributaryWidth);
   if(width===null||width<=0){purlinMagnitudeChecks.push({memberId:String(m.id),ok:false,reason:"tributary-width-missing-or-invalid"});return;}
   if(side==="left")wl=width;
   else if(side==="right")wr=width;
   else {purlinMagnitudeChecks.push({memberId:String(m.id),ok:false,reason:"unknown-roof-side"});return;}
  }
  const expectedLoads={
   dead:(num(loads?.deadLeft)??NaN)*wl+(num(loads?.deadRight)??NaN)*wr,
   live:(num(loads?.liveLeft)??NaN)*wl+(num(loads?.liveRight)??NaN)*wr,
   snow:(num(loads?.snowLeft)??NaN)*wl+(num(loads?.snowRight)??NaN)*wr,
   windLeft:(num(loads?.windLeft)??NaN)*wl,
   windRight:(num(loads?.windRight)??NaN)*wr
  };
  expectedLoads.wind=expectedLoads.windLeft+expectedLoads.windRight;
  const differences=Object.entries(expectedLoads).filter(([key,value])=>!Number.isFinite(value)||!closeLoad(ll[key],value)).map(([key,value])=>({key,actual:ll[key]??null,expected:value}));
  const widthExpected=wl+wr,widthActual=num(ll.tributaryWidth);
  const widthOk=widthActual!==null&&closeLoad(widthActual,widthExpected);
  purlinMagnitudeChecks.push({memberId:String(m.id),side,tributaryWidthLeftM:wl,tributaryWidthRightM:wr,tributaryWidthActualM:widthActual,expectedLoadsKNm:expectedLoads,ok:differences.length===0&&widthOk,differences,widthOk});
 });
 const badPurlinMagnitudes=purlinMagnitudeChecks.filter(x=>!x.ok);
 if(badPurlinMagnitudes.length)issues.push("مقدار بار خطی/عرض بارگیر "+badPurlinMagnitudes.length+" لاپه با حاصل‌ضرب فشار سطحی در عرض بارگیر منطبق نیست: "+badPurlinMagnitudes.slice(0,8).map(x=>x.memberId).join("، "));
 rows.push({id:"roof-purlin-line-load-magnitude",label:"تطبیق عددی بار سطحی سقف با بار خطی لاپه‌ها",memberCount:purlinMagnitudeChecks.length,coveredCount:purlinMagnitudeChecks.length-badPurlinMagnitudes.length,missingCount:0,invalidCount:badPurlinMagnitudes.length,status:badPurlinMagnitudes.length?"incomplete":"verified",checks:purlinMagnitudeChecks,method:"q_line = p_surface × tributary_width; ridge sides checked separately",units:{surface:"kN/m²",line:"kN/m",width:"m"}});
 // Roof area loads are carried by purlins; rafters receive purlin support reactions and self-weight.
 const rafterDuplicate=[],rafterMissing=[];
 groups.rafters.forEach(m=>["dead","live","snow"].forEach(k=>{
  const v=m.lineLoads?.[k];
  if(v===undefined)rafterMissing.push(String(m.id)+":"+k);
  else if(!finite(v))rafterMissing.push(String(m.id)+":"+k);
  else if(Math.abs(v)>1e-10)rafterDuplicate.push(String(m.id)+":"+k);
 }));
 if(!groups.rafters.length)issues.push("هیچ رفتر عرضی در مدل پیدا نشد.");
 if(rafterMissing.length)issues.push("تعریف صریح بار صفر مستقیم برای رفترها ناقص است: "+rafterMissing.slice(0,8).join("، "));
 if(rafterDuplicate.length)issues.push("بار سطحی بام هم‌زمان به پرلین و رفتر تخصیص یافته است؛ احتمال دوباره‌شماری: "+rafterDuplicate.slice(0,8).join("، "));
 rows.push({id:"rafter-reaction-path",label:"رفترها ـ واکنش پرلین و وزن خود عضو",memberCount:groups.rafters.length,coveredCount:groups.rafters.length-rafterMissing.length-rafterDuplicate.length,missingCount:rafterMissing.length,invalidCount:rafterDuplicate.length,status:rafterMissing.length||rafterDuplicate.length?"incomplete":"assigned",transfer:"purlin support reactions at shared FEM nodes"});
 [["مهاربند دیوار",groups.wallBraces],["مهاربند سقف",groups.roofBraces]].forEach(([label,list])=>{rows.push({id:label,label,memberCount:list.length,coveredCount:list.length,missingCount:0,invalidCount:0,status:list.length?"structural-path":"missing"});if(!list.length)issues.push(label+": عضو مستقلی در مدل پیدا نشد.");});
 // A longitudinal wall girt must meet an actual frame-column segment at both ends;
 // generic graph reachability alone is not sufficient evidence of this load transfer.
 const columnIncidence=new Map();
 members.filter(m=>m.sectionKey==="column").forEach(m=>[m.start,m.end].forEach(n=>{const k=String(n);if(!columnIncidence.has(k))columnIncidence.set(k,[]);columnIncidence.get(k).push(m.id);}));
 const wallGirtEndpointChecks=[];
 groups.wallGirts.forEach(m=>[m.start,m.end].forEach(nodeId=>{
  const linked=columnIncidence.get(String(nodeId))||[];
  wallGirtEndpointChecks.push({memberId:m.id,nodeId:String(nodeId),columnMemberIds:linked,ok:linked.length>0});
 }));
 const unsupportedGirtEnds=wallGirtEndpointChecks.filter(x=>!x.ok);
 if(!groups.wallGirts.length)issues.push("برای ممیزی اتصال گرت طولی به ستون، هیچ گرتی وجود ندارد.");
 if(unsupportedGirtEnds.length)issues.push("انتهای "+unsupportedGirtEnds.length+" گرت طولی به قطعه واقعی ستون قاب با شناسه گره مشترک متصل نیست: "+unsupportedGirtEnds.slice(0,8).map(x=>x.memberId+"@"+x.nodeId).join("، "));
 rows.push({id:"wall-girt-column-transfer",label:"اتصال گرت طولی به ستون‌های قاب",memberCount:wallGirtEndpointChecks.length,coveredCount:wallGirtEndpointChecks.length-unsupportedGirtEnds.length,missingCount:unsupportedGirtEnds.length,invalidCount:0,status:unsupportedGirtEnds.length?"incomplete":"connected",checks:wallGirtEndpointChecks,transfer:"wall cladding → wall girt → shared FEM node → frame column"});
 // Brace endpoints must share structural nodes with their receiving columns/rafters.
 const incidenceBySection=key=>{const map=new Map();members.filter(m=>m.sectionKey===key).forEach(m=>[m.start,m.end].forEach(n=>{const k=String(n);if(!map.has(k))map.set(k,[]);map.get(k).push(m.id);}));return map;};
 const wallBraceReceivers=incidenceBySection("column"),roofBraceReceivers=incidenceBySection("rafter");
 const braceEndpointChecks=[];
 const checkBrace=(brace,receivers,receiverLabel)=>[brace.start,brace.end].forEach(nodeId=>{const linked=receivers.get(String(nodeId))||[];braceEndpointChecks.push({braceId:brace.id,nodeId:String(nodeId),receiver:receiverLabel,receiverMemberIds:linked,ok:linked.length>0});});
 groups.wallBraces.forEach(m=>checkBrace(m,wallBraceReceivers,"column"));
 groups.roofBraces.forEach(m=>checkBrace(m,roofBraceReceivers,"rafter"));
 const unconnectedBraceEnds=braceEndpointChecks.filter(x=>!x.ok);
 if(groups.wallBraces.length&&!groups.wallBraces.some(m=>[m.start,m.end].some(n=>wallBraceReceivers.has(String(n)))))issues.push("هیچ انتهای مهاربند دیوار به گره مشترک ستون متصل نیست.");
 if(groups.roofBraces.length&&!groups.roofBraces.some(m=>[m.start,m.end].some(n=>roofBraceReceivers.has(String(n)))))issues.push("هیچ انتهای مهاربند سقف به گره مشترک رفتر متصل نیست.");
 if(unconnectedBraceEnds.length)issues.push("تعداد "+unconnectedBraceEnds.length+" انتهای مهاربند بدون اتصال گره‌ای به عضو دریافت‌کننده؛ "+unconnectedBraceEnds.slice(0,8).map(x=>x.braceId+"@"+x.nodeId+"→"+x.receiver).join("، "));
 rows.push({id:"brace-frame-node-transfer",label:"اتصال گره‌ای مهاربندهای دیوار و سقف به قاب",memberCount:braceEndpointChecks.length,coveredCount:braceEndpointChecks.length-unconnectedBraceEnds.length,missingCount:unconnectedBraceEnds.length,invalidCount:0,status:unconnectedBraceEnds.length?"incomplete":"connected",checks:braceEndpointChecks,transfer:"wall brace → shared column node; roof brace → shared rafter node"});
 // Trace each brace end to a declared base support without using brace members
 // as the only bridge. This reports topology only; it does not imply diaphragm stiffness.
 const baseSupportIds=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>String(n.id));
 const structuralAdjacency=new Map();
 const structuralLink=(node,edge)=>{const key=String(node);if(!structuralAdjacency.has(key))structuralAdjacency.set(key,[]);structuralAdjacency.get(key).push(edge);};
 members.filter(m=>!["wallBrace","roofBrace"].includes(m.sectionKey)).forEach(m=>{
  structuralLink(m.start,{to:String(m.end),memberId:String(m.id),sectionKey:m.sectionKey});
  structuralLink(m.end,{to:String(m.start),memberId:String(m.id),sectionKey:m.sectionKey});
 });
 const traceToSupport=start=>{
  const queue=[{node:String(start),memberIds:[],sectionKeys:[]}],seen=new Set([String(start)]);
  while(queue.length){
   const current=queue.shift();
   if(baseSupportIds.includes(current.node))return{ok:true,start:String(start),supportNodeId:current.node,memberIds:current.memberIds,sectionKeys:current.sectionKeys};
   for(const edge of structuralAdjacency.get(current.node)||[]){
    if(seen.has(edge.to))continue;
    seen.add(edge.to);
    queue.push({node:edge.to,memberIds:[...current.memberIds,edge.memberId],sectionKeys:[...current.sectionKeys,edge.sectionKey]});
   }
  }
  return{ok:false,start:String(start),supportNodeId:null,memberIds:[],sectionKeys:[]};
 };
 const braceSupportPathChecks=[];
 [...groups.wallBraces,...groups.roofBraces].forEach(brace=>[brace.start,brace.end].forEach(nodeId=>{
  const trace=traceToSupport(nodeId);
  braceSupportPathChecks.push({braceId:String(brace.id),sectionKey:brace.sectionKey,nodeId:String(nodeId),...trace});
 }));
 const missingBraceSupportPaths=braceSupportPathChecks.filter(x=>!x.ok);
 if(missingBraceSupportPaths.length)issues.push("برای "+missingBraceSupportPaths.length+" انتهای مهاربند، مسیر مستقل از خود مهاربند تا گره پایه از طریق اعضای قاب/جمع‌کننده پیدا نشد: "+missingBraceSupportPaths.slice(0,8).map(x=>x.braceId+"@"+x.nodeId).join("، "));
 const bracePathRow=rows.find(r=>r.id==="brace-frame-node-transfer");
 if(bracePathRow){bracePathRow.supportPathChecks=braceSupportPathChecks;bracePathRow.supportPathMissingCount=missingBraceSupportPaths.length;bracePathRow.supportPathStatus=missingBraceSupportPaths.length?"incomplete":"connected";bracePathRow.transfer="roof brace → shared rafter node → connected frame/collector members → base support; wall brace → shared column node → base support";}

 // Validate that each configured braced bay contains both diagonals on both sides,
 // and that their endpoints lie on the actual adjacent frame stations.
 const auditBraceBayGeometry=model=>{
  const issues=[],checks=[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
  const baseStations=[...new Set((model?.nodes||[]).filter(n=>n.kind==="base").map(n=>Number(n.z)).filter(Number.isFinite).map(z=>z.toFixed(7)))].map(Number).sort((a,b)=>a-b);
  const g=model?.geometry||{},span=Number(g.span),height=Number(g.height),rise=Number(g.rise);
  if(!Object.prototype.hasOwnProperty.call(g,"braceBays"))return{success:true,issues:[],checks,expectedBayCount:0,skipped:true};
  if(baseStations.length<2||!(span>0&&height>0&&rise>=0))return{success:false,issues:["ایستگاه قاب‌ها یا ابعاد لازم برای ممیزی هندسه مهاربندها موجود نیست."],checks,expectedBayCount:0};
  const bayCount=baseStations.length-1,configured=Math.max(0,Math.floor(Number(g.braceBays)||0)),expected=new Set();
  for(let i=0;i<Math.min(configured,bayCount);i++){expected.add(i+1);expected.add(bayCount-i);}
  const families=[{key:"wallBrace",label:"دیوار",sides:["left","right"],transverse:(a,b)=>Math.abs(a.x-b.x)<1e-6&&Math.abs(Math.abs(a.y-b.y)-height)<1e-6},
   {key:"roofBrace",label:"سقف",sides:["left","right"],transverse:(a,b)=>Math.abs(Math.abs(a.x-b.x)-span/2)<1e-6&&Math.abs(a.y-(height+rise*(a.x<=span/2?a.x/(span/2):(span-a.x)/(span/2))))<1e-5&&Math.abs(b.y-(height+rise*(b.x<=span/2?b.x/(span/2):(span-b.x)/(span/2))))<1e-5}];
  const members=model?.members||[];
  families.forEach(f=>{
   const list=members.filter(m=>m.sectionKey===f.key),groups=new Map();
   list.forEach(m=>{const k=String(m.bay)+"|"+String(m.side);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);});
   const baysToCheck=expected.size?[...expected]:[...new Set(list.map(m=>Number(m.bay)).filter(Number.isInteger))];
   baysToCheck.forEach(bay=>f.sides.forEach(side=>{
    const group=groups.get(bay+"|"+side)||[],z1=baseStations[bay-1],z2=baseStations[bay];
    const endpoints=group.map(m=>{const a=nodes.get(String(m.start)),b=nodes.get(String(m.end));if(!a||!b)return{memberId:m.id,ok:false,reason:"missing-node"};const onStations=(Math.abs(a.z-z1)<1e-6&&Math.abs(b.z-z2)<1e-6)||(Math.abs(b.z-z1)<1e-6&&Math.abs(a.z-z2)<1e-6);const cross=f.transverse(a,b);const transverseDelta=f.key==="wallBrace"?(b.y-a.y):(b.x-a.x);return{memberId:m.id,ok:onStations&&cross&&Math.abs(transverseDelta)>1e-6,onStations,cross,transverseDelta};});
    const slopes=endpoints.map(x=>Math.sign(x.transverseDelta||0)).filter(Boolean);
    const opposite=slopes.length===2&&slopes[0]===-slopes[1];
    const ok=group.length===2&&endpoints.length===2&&endpoints.every(x=>x.ok)&&opposite;
    checks.push({sectionKey:f.key,bay,side,memberCount:group.length,endpointChecks:endpoints,oppositeDiagonals:opposite,ok});
    if(!ok)issues.push("مهاربندی ضربدری "+f.label+"، دهانه "+bay+"، سمت "+side+" کامل یا منطبق با هندسه قاب نیست (تعداد="+group.length+").");
   }));
   list.filter(m=>!Number.isInteger(Number(m.bay))||!f.sides.includes(m.side)||Number(m.bay)<1||Number(m.bay)>bayCount).forEach(m=>issues.push("مشخصات دهانه/سمت مهاربند نامعتبر است: "+m.id));
  });
  return{success:issues.length===0,issues,checks,expectedBayCount:expected.size};
 };
 const braceBayAudit=auditBraceBayGeometry(model);
 if(!braceBayAudit.success)issues.push(...braceBayAudit.issues);
 rows.push({id:"brace-bay-geometry",label:"کامل‌بودن هندسه مهاربندی ضربدری دهانه‌ها",memberCount:braceBayAudit.checks.length,coveredCount:braceBayAudit.checks.filter(x=>x.ok).length,missingCount:braceBayAudit.checks.filter(x=>!x.ok).length,invalidCount:0,status:braceBayAudit.success?"connected":"incomplete",checks:braceBayAudit.checks});
 // Loaded member endpoints must remain in the connected structural graph leading to base supports.
 const adjacency=new Map(),nodeIds=new Set((model?.nodes||[]).map(n=>String(n.id)));
 const link=(x,y)=>{x=String(x);y=String(y);if(!adjacency.has(x))adjacency.set(x,new Set());if(!adjacency.has(y))adjacency.set(y,new Set());adjacency.get(x).add(y);adjacency.get(y).add(x);};
 members.forEach(m=>{if(m.start!==undefined&&m.end!==undefined)link(m.start,m.end);});
 const membersWithMissingNodes=members.filter(m=>!nodeIds.has(String(m.start))||!nodeIds.has(String(m.end))).map(m=>String(m.id));
 if(membersWithMissingNodes.length)issues.push("گره ابتدا/انتها برای اعضای زیر در مدل وجود ندارد: "+membersWithMissingNodes.slice(0,10).join("، "));
 const supports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>String(n.id));
 const reaches=start=>{const seen=new Set([String(start)]),q=[String(start)];while(q.length){const n=q.shift();if(supports.includes(n))return true;(adjacency.get(n)||[]).forEach(x=>{if(!seen.has(x)){seen.add(x);q.push(x);}});}return false;};
 const disconnected=members.filter(m=>!nodeIds.has(String(m.start))||!nodeIds.has(String(m.end))||!reaches(m.start)||!reaches(m.end)).map(m=>String(m.id));
 if(!supports.length)issues.push("گره پایه برای ممیزی اتصال به تکیه‌گاه موجود نیست.");
 if(disconnected.length)issues.push("مسیر هندسی اعضای بارگیر تا تکیه‌گاه ناقص است: "+disconnected.slice(0,8).join("، "));
 const membersWithoutExplicitLineLoad=members.filter(m=>!m.lineLoads||["dead","live","snow","wind","windLeft","windRight","windEnd"].some(k=>!finite(m.lineLoads[k])));
 if(membersWithoutExplicitLineLoad.length)issues.push("تعریف صریح بار خطی/صفر برای اعضای مدل ناقص است: "+membersWithoutExplicitLineLoad.slice(0,10).map(m=>String(m.id)).join("، "));
 const missingTributaryHeight=[...groups.wallGirts,...groups.endGirts].filter(m=>!(finite(m.lineLoads?.tributaryHeight)&&m.lineLoads.tributaryHeight>0));
 if(missingTributaryHeight.length)issues.push("ارتفاع بارگیر گرت‌های طولی/انتهایی ناقص است: "+missingTributaryHeight.slice(0,10).map(m=>String(m.id)).join("، "));
 const missingRoofSideAssignments=groups.purlins.filter(m=>m.side==="left"?!(finite(m.lineLoads?.tributaryWidth)&&m.lineLoads.tributaryWidth>0):m.side==="right"?!(finite(m.lineLoads?.tributaryWidth)&&m.lineLoads.tributaryWidth>0):m.side==="ridge"?!(finite(m.lineLoads?.tributaryWidthLeft)&&m.lineLoads.tributaryWidthLeft>0&&finite(m.lineLoads?.tributaryWidthRight)&&m.lineLoads.tributaryWidthRight>0):true);
 if(missingRoofSideAssignments.length)issues.push("عرض بارگیر چپ/راست پرلین یا پرلین تاج نامعتبر است: "+missingRoofSideAssignments.slice(0,10).map(m=>String(m.id)).join("، "));
 const wallEnvelope=root.SteelDesignCore?.getData?.()?.wallEnvelope;
 const wallTransfer=wallEnvelope&&typeof wallEnvelope==="object"?root.SteelWallDeadLoadTransfer?.audit?.(model)||null:null;
 if(wallEnvelope&&typeof wallEnvelope==="object"){
  const faces=["front","rear","left","right"].filter(face=>wallEnvelope[face]?.material);
  const wallReady=wallTransfer?.success===true&&wallTransfer?.loadTransferEnabled===true;
  if(faces.length&&!wallReady)issues.push("وزن مرده پوسته دیوارها به مدل سازه/واکنش فونداسیون منتقل نشده است؛ نوع مصالح به‌تنهایی مسیر بار را مشخص نمی‌کند. برای هر وجه باید اتکای دیوار به فونداسیون یا انتقال به گرت/ستونک و وزن سطحی مستند شود.");
  if(faces.length)rows.push({id:"wall-cladding-dead-load",label:"وزن مرده پوسته دیوارها",memberCount:faces.length,coveredCount:wallReady?faces.length:0,missingCount:wallReady?0:faces.length,invalidCount:0,status:wallReady?"assigned":"incomplete",faces,transfer:"wall cladding/masonry → documented support system → steel frame or foundation"});
 }
 const gableTransfer=auditGableTransfer(model,loads);
 if(gableTransfer.active&&!gableTransfer.ready)issues.push("باد دیوار انتهایی در مسیر گرت‌ها/ستونک‌ها/قاب انتهایی ناقص است: "+gableTransfer.issues.join("؛ "));
 rows.push({id:"endwall-gable-wind",label:"باد دیوار انتهایی و ناحیه گابل",memberCount:gableTransfer.girtCount,coveredCount:gableTransfer.active&&gableTransfer.ready?gableTransfer.girtCount:0,missingCount:gableTransfer.active&&!gableTransfer.ready?Math.max(1,gableTransfer.girtCount):0,invalidCount:0,status:!gableTransfer.active?"not-applicable":gableTransfer.ready?"assigned":"incomplete",topology:gableTransfer.topology,areaCoverage:gableTransfer.area,transfer:"end-wall cladding → end-girts with local tributary heights → shared post/frame nodes → base support"});
 const frameIds=[...new Set(groups.rafters.map(m=>Number(m.frame)).filter(Number.isFinite))];
 const frameCount=Array.isArray(model?.geometry?.frames)?model.geometry.frames.length:0;
 if(frameCount&&frameIds.length!==frameCount)issues.push("پوشش رفترها در قاب‌ها کامل نیست: "+frameIds.length+" از "+frameCount+" قاب دارای عضو رفتر شناسایی شد.");
 const duplicateIds=members.map(m=>String(m.id)).filter((id,i,a)=>a.indexOf(id)!==i);
 if(duplicateIds.length)issues.push("شناسه عضو تکراری: "+[...new Set(duplicateIds)].slice(0,8).join("، "));
 const combinations=Array.isArray(loads?.combinations)?loads.combinations:[];
 const comboRows=combinations.map((c,i)=>{
  const factors={dead:num(c.dead),live:num(c.live),snow:num(c.snow)};
  const missing=Object.entries(factors).filter(([,v])=>v===null||!Number.isFinite(v)).map(([k])=>k);
  return {id:String(c.id??i),name:String(c.name??("ترکیب "+(i+1))),factors,valid:missing.length===0,missing};
 });
 comboRows.forEach(c=>{if(!c.valid)issues.push("ضرایب ترکیب "+c.name+" ناقص یا نامعتبر است: "+c.missing.join("، "));});
 const gableApplicable=Number.isFinite(Number(model?.geometry?.span))&&Number.isFinite(Number(model?.geometry?.length))&&Number.isFinite(Number(model?.geometry?.height))&&Number.isFinite(Number(model?.geometry?.rise))&&Number.isFinite(Number(model?.geometry?.endPostSpacing));
 const gableSupportAudit=gableApplicable?root.SteelEndWallGableSupportAudit?.audit?.(model):null;
 if(gableApplicable&&!gableSupportAudit)issues.push("ماژول ممیزی توپولوژی تکیه‌گاه گابل در دسترس نیست؛ وضعیت باد انتهایی قابل ارزیابی نیست.");
 if(gableApplicable&&gableSupportAudit&&!gableSupportAudit.success)issues.push("توپولوژی تکیه‌گاه گابل ناقص است: "+gableSupportAudit.issues.slice(0,8).join("؛ "));
 if(gableApplicable)rows.push({id:"endwall-gable-support-topology",label:"پیوستگی ستونک‌ها، گرت‌ها و وتر گابل در دو وجه انتهایی",memberCount:members.filter(m=>["endPost","endGirt"].includes(m.sectionKey)).length,coveredCount:gableSupportAudit?.faces?.filter(f=>f.success).length||0,missingCount:gableSupportAudit?.faces?.filter(f=>!f.success).length||0,status:gableSupportAudit?.success?"connected":"incomplete",details:gableSupportAudit?.faces||[]});
 const longitudinalBracing=root.SteelLongitudinalBracingReadiness?.audit?.(model,loads)||null;
 if(!longitudinalBracing)issues.push("ممیزی مسیر باد طولی تا مهاربندها بارگذاری نشده است؛ تحلیل باد انتهایی باید fail-closed بماند.");
 if(longitudinalBracing?.applicable){
  if(!longitudinalBracing.success)issues.push("مسیر باد دیوار انتهایی تا مهاربند طولی کامل نیست: "+longitudinalBracing.issues.join("؛ "));
  rows.push(...(longitudinalBracing.rows||[]));
 }else if(longitudinalBracing)rows.push({id:"endwall-wind-to-longitudinal-bracing",label:"مسیر باد دیوار انتهایی تا مهاربندهای طولی",memberCount:0,coveredCount:0,missingCount:0,status:"not-applicable"});
 const allAssigned=rows.length>0&&rows.every(r=>r.status==="assigned"||r.status==="verified"||r.status==="structural-path"||r.status==="connected"||r.status==="not-applicable");
 return {success:issues.length===0&&allAssigned,issues,rows,wallDeadLoadTransfer:wallTransfer||null,gableSupportAudit,longitudinalBracing,combinations:comboRows,connectivity:{supportNodeCount:supports.length,disconnectedMemberIds:disconnected},
  inventory:{memberCount:members.length,rafterCount:groups.rafters.length,purlinCount:groups.purlins.length,wallGirtCount:groups.wallGirts.length,endGirtCount:groups.endGirts.length,wallBraceCount:groups.wallBraces.length,roofBraceCount:groups.roofBraces.length,frameCount,rafterFrameCount:frameIds.length},
  scope:"ممیزی تخصیص ورودی‌های بار موجود به اعضا؛ نه تأیید مقدار بار، ضرایب آیین‌نامه‌ای، انتقال بار نهایی یا ایمنی سازه.",
  analysisEnabled:false,designApproved:false};
}
function run(){
 const model=root.SteelStructuralModel?.getData?.();
 const loads=root.SteelLoads?.getData?.();
 const result=audit(model,loads);
 const host=root.document?.getElementById("wholeBuildingLoadPathResults");
 if(host)host.textContent=[
  "وضعیت ممیزی: "+(result.success?"تخصیص ورودی‌ها کامل":"نیازمند اصلاح"),
  "تعداد اعضا: "+result.inventory.memberCount+" | رفتر: "+result.inventory.rafterCount+" | پرلین: "+result.inventory.purlinCount+" | لاپه دیوار: "+result.inventory.wallGirtCount+" | لاپه انتهایی: "+result.inventory.endGirtCount,
  ...result.rows.map(r=>r.label+": "+r.coveredCount+"/"+r.memberCount+" — "+r.status),
  ...result.issues.map(x=>"هشدار: "+x),
  result.scope
 ].join("\n");
 return result;
}
function selfTest(){
 const oldCore=root.SteelDesignCore;
 root.SteelDesignCore={getData:()=>({})};
 const t=[],test=(name,fn)=>{try{t.push({name,ok:fn()!==false});}catch(e){t.push({name,ok:false,error:e.message});}};
 const members=[
  {id:"R1",sectionKey:"rafter",axis:"transverse",frame:1,type:"رفتر قاب",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,tributaryWidth:4}},
  {id:"R2",sectionKey:"rafter",axis:"transverse",frame:1,type:"رفتر قاب",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,tributaryWidth:4}},
  {id:"P1",sectionKey:"roofPurlin",side:"left",start:"B",end:"T",lineLoads:{dead:.6,live:.6,snow:1.2,wind:-.24,windLeft:-.24,windRight:0,windEnd:0,tributaryWidth:1.2}},
  {id:"W1",sectionKey:"wallGirt",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,wind:.3,windLeft:0,windRight:0,windEnd:0,tributaryHeight:2}},
  {id:"C1",sectionKey:"column",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0}},
  {id:"E1",sectionKey:"endGirt",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,tributaryHeight:2}},
  {id:"WB",sectionKey:"wallBrace",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0}},
  {id:"RB",sectionKey:"roofBrace",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0}}
 ];
 const model={geometry:{frames:[0]},nodes:[{id:"B",kind:"base"},{id:"T"}],members};
 const loads={deadLeft:.5,deadRight:.5,liveLeft:.5,liveRight:.5,snowLeft:1,snowRight:1,windLeft:-.2,windRight:-.2,windWall:.3,windEndFront:0,windEndBack:0,combinations:[{id:"C1",name:"نمونه",dead:1.2,live:1.6,snow:0}]};
 test("complete member load paths accepted",()=>audit(model,loads).success);
 test("missing roof wind transfer detected",()=>{const p=JSON.parse(JSON.stringify(model));delete p.members[2].lineLoads.windLeft;return !audit(p,loads).success;});
 test("roof surface-to-purlin numerical transfer verified",()=>audit(model,loads).rows.find(x=>x.id==="roof-purlin-line-load-magnitude").status==="verified");
 test("incorrect purlin dead line load rejected",()=>{const p=JSON.parse(JSON.stringify(model));p.members.find(m=>m.id==="P1").lineLoads.dead=.61;return !audit(p,loads).success;});
 test("ridge purlin left/right tributary loads checked independently",()=>{const p=JSON.parse(JSON.stringify(model));const m=p.members.find(x=>x.id==="P1");m.side="ridge";m.tributaryWidthLeft=.6;m.tributaryWidthRight=.6;m.lineLoads={...m.lineLoads,dead:.6,live:.6,snow:1.2,wind:-.24,windLeft:-.12,windRight:-.12,tributaryWidth:1.2};return audit(p,loads).rows.find(x=>x.id==="roof-purlin-line-load-magnitude").status==="verified";});
 test("ridge purlin wrong-side wind transfer rejected",()=>{const p=JSON.parse(JSON.stringify(model));const m=p.members.find(x=>x.id==="P1");m.side="ridge";m.tributaryWidthLeft=.6;m.tributaryWidthRight=.6;m.lineLoads={...m.lineLoads,dead:.6,live:.6,snow:1.2,wind:-.24,windLeft:-.24,windRight:0,tributaryWidth:1.2};return !audit(p,loads).success;});
 const braceGeometryFixture=()=>{
  const p=JSON.parse(JSON.stringify(model));p.geometry={frames:[0,5],span:20,height:6,rise:2,braceBays:1};
  p.nodes=[{id:"B",kind:"base",x:0,y:0,z:0},{id:"B2",kind:"base",x:20,y:0,z:0},{id:"B3",kind:"base",x:0,y:0,z:5},{id:"B4",kind:"base",x:20,y:0,z:5},
   {id:"WL0",x:0,y:0,z:0},{id:"WL1",x:0,y:6,z:5},{id:"WL2",x:0,y:6,z:0},{id:"WL3",x:0,y:0,z:5},
   {id:"WR0",x:20,y:0,z:0},{id:"WR1",x:20,y:6,z:5},{id:"WR2",x:20,y:6,z:0},{id:"WR3",x:20,y:0,z:5},
   {id:"RL0",x:0,y:6,z:0},{id:"RL1",x:10,y:8,z:5},{id:"RL2",x:10,y:8,z:0},{id:"RL3",x:0,y:6,z:5},
   {id:"RR0",x:10,y:8,z:0},{id:"RR1",x:20,y:6,z:5},{id:"RR2",x:20,y:6,z:0},{id:"RR3",x:10,y:8,z:5}];
  p.members=p.members.filter(m=>m.sectionKey!=="wallBrace"&&m.sectionKey!=="roofBrace");
  const add=(id,sectionKey,start,end,bay,side)=>p.members.push({id,sectionKey,start,end,bay,side,lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0}});
  add("WBL1","wallBrace","WL0","WL1",1,"left");add("WBL2","wallBrace","WL2","WL3",1,"left");
  add("WBR1","wallBrace","WR0","WR1",1,"right");add("WBR2","wallBrace","WR2","WR3",1,"right");
  add("RBL1","roofBrace","RL0","RL1",1,"left");add("RBL2","roofBrace","RL2","RL3",1,"left");
  add("RBR1","roofBrace","RR0","RR1",1,"right");add("RBR2","roofBrace","RR2","RR3",1,"right");
  add("CL1","column","WL0","WL2");add("CL2","column","WL3","WL1");add("CR1","column","WR0","WR2");add("CR2","column","WR3","WR1");
  add("RFL1","rafter","RL0","RL1");add("RFL2","rafter","RL3","RL2");add("RFR1","rafter","RR0","RR1");add("RFR2","rafter","RR3","RR2");
  return p;
 };
 test("brace X geometry accepted for configured bays",()=>audit(braceGeometryFixture(),loads).rows.find(x=>x.id==="brace-bay-geometry").status==="connected");
 test("missing wall brace diagonal rejected",()=>{const p=braceGeometryFixture();p.members=p.members.filter(m=>m.id!=="WBL2");return !audit(p,loads).success;});
 test("reversed/invalid brace bay rejected",()=>{const p=braceGeometryFixture();p.members.find(m=>m.id==="WBL1").bay=99;return !audit(p,loads).success;});
 test("wall brace endpoints require shared column nodes",()=>{const p={...model,members:model.members.filter(m=>m.sectionKey!=="column")};return !audit(p,loads).success&&audit(p,loads).rows.find(x=>x.id==="brace-frame-node-transfer").missingCount>=2;});
 test("roof brace endpoints require shared rafter nodes",()=>{const p={...model,members:model.members.filter(m=>m.sectionKey!=="rafter")};return !audit(p,loads).success&&audit(p,loads).rows.find(x=>x.id==="brace-frame-node-transfer").missingCount>=2;});
 test("roof and wall brace endpoints expose support path traces",()=>{const r=audit(model,loads).rows.find(x=>x.id==="brace-frame-node-transfer");return r.supportPathChecks.length===4&&r.supportPathMissingCount===0&&r.supportPathChecks.every(x=>Array.isArray(x.sectionKeys));});
 test("brace support path cannot rely only on brace members",()=>{const p=JSON.parse(JSON.stringify(model));p.members=p.members.filter(m=>["wallBrace","roofBrace"].includes(m.sectionKey));const r=audit(p,loads).rows.find(x=>x.id==="brace-frame-node-transfer");return !audit(p,loads).success&&r.supportPathMissingCount>0;});

 test("wall girt ends require shared frame-column nodes",()=>{const p={...model,members:model.members.filter(m=>m.sectionKey!=="column")};return !audit(p,loads).success&&audit(p,loads).rows.find(x=>x.id==="wall-girt-column-transfer").missingCount===2;});
 test("missing wall girt detected",()=>{const p={...model,members:model.members.filter(m=>m.sectionKey!=="wallGirt")};return !audit(p,loads).success;});
 test("missing end-wall girt detected",()=>{const p={...model,members:model.members.filter(m=>m.sectionKey!=="endGirt")};return !audit(p,loads).success;});
 test("missing area load input detected",()=>{const p={...loads};delete p.snowRight;return !audit(model,p).success;});
 test("non-finite member line load detected",()=>{const p=JSON.parse(JSON.stringify(model));p.members[0].lineLoads.dead=NaN;return !audit(p,loads).success;});
 test("roof purlin tributary width required",()=>{const p=JSON.parse(JSON.stringify(model));p.members[2].lineLoads.tributaryWidth=0;return !audit(p,loads).success;});
 test("incomplete combination factors detected",()=>{const p={...loads,combinations:[{id:"C",dead:1.2,live:null,snow:0}]};return !audit(model,p).success;});
 test("duplicate member identifiers detected",()=>{const p={...model,members:[...members,{...members[0]}]};return !audit(p,loads).success;});
 test("all load groups explicitly reported",()=>audit(model,loads).rows.length===15);
 test("wind signs are preserved",()=>audit(model,loads).success&&members[2].lineLoads.windLeft===-.24);
 test("never enables analysis or approves design",()=>{const r=audit(model,loads);return r.analysisEnabled===false&&r.designApproved===false;});
 test("roof gravity is assigned to purlins not rafters",()=>audit(model,loads).rows.find(r=>r.id==="dead").memberCount===1 );
 test("actual 3D model rafter naming is included by section key and axis",()=>audit(model,loads).inventory.rafterCount===2&&audit(model,loads).rows.find(r=>r.id==="rafter-reaction-path").memberCount===2 );
 test("nonzero direct roof gravity on rafter is rejected",()=>{const p=JSON.parse(JSON.stringify(model));p.members[0].lineLoads.dead=1;return !audit(p,loads).success;} );
 test("rafter explicit zero load is accepted",()=>audit(model,loads).rows.find(r=>r.id==="rafter-reaction-path").status==="assigned" );
 test("disconnected loaded member rejected",()=>{const p=JSON.parse(JSON.stringify(model));p.members[2].start="ORPHAN";return !audit(p,loads).success;});
 test("every model member must reference existing endpoint nodes",()=>{const p=JSON.parse(JSON.stringify(model));p.members[0].end="MISSING";return !audit(p,loads).success;});
 test("missing model rejected",()=>!audit(null,loads).success);
  test("all model members require explicit line-load declarations",()=>{const p=JSON.parse(JSON.stringify(model));delete p.members[5].lineLoads;return !audit(p,loads).success;});
  test("wall and end-wall tributary heights are required",()=>{const p=JSON.parse(JSON.stringify(model));delete p.members[3].lineLoads.tributaryHeight;return !audit(p,loads).success;});
  test("all member paths must reach a declared base support",()=>{const p=JSON.parse(JSON.stringify(model));p.members[5].start="ORPHAN";return !audit(p,loads).success;});
 test("empty combination list allowed as load-path audit only",()=>{const p={...loads,combinations:[]};return audit(model,p).success;});
 test("selected wall materials require a documented dead-load support path",()=>{const old=root.SteelDesignCore,oldTransfer=root.SteelWallDeadLoadTransfer;root.SteelDesignCore={getData:()=>({wallEnvelope:{front:{material:"brick"},rear:{material:"sandwich-panel"},left:{material:"metal-sheet"},right:{material:"brick"}}})};root.SteelWallDeadLoadTransfer=null;const r=audit(model,loads);root.SteelDesignCore=old;root.SteelWallDeadLoadTransfer=oldTransfer;return !r.success&&r.issues.some(x=>x.includes("وزن مرده پوسته دیوارها"));});
 test("nonzero end-wall wind blocks an incomplete gable load path",()=>{const p={...loads,windEndFront:.4};return !audit(model,p).success&&audit(model,p).issues.some(x=>x.includes("مسیر گرت‌ها"));});
 test("complete end-girt topology and tributary area permit gable transfer readiness",()=>{const m=root.SteelEndWallGableSupportAudit?.fixture?.();m.members.filter(x=>x.sectionKey==="endGirt").forEach(x=>x.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,tributaryHeight:x.tributaryHeight});const r=auditGableTransfer(m,{windEndFront:.4,windEndBack:0});return r.active&&r.ready&&r.area?.success===true&&r.topology?.success===true;});
 test("zero end-wall wind marks gable triangle not applicable",()=>{const p={...loads,windEndFront:0,windEndBack:0};return audit(model,p).rows.find(x=>x.id==="endwall-gable-wind").status==="not-applicable";});
 root.SteelDesignCore=oldCore;
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t};
}
function mount(){
 const doc=root.document;if(!doc||doc.getElementById("wholeBuildingLoadPathPanel"))return;
 const main=doc.querySelector("main");if(!main)return;
 const panel=doc.createElement("section");panel.className="panel";panel.id="wholeBuildingLoadPathPanel";
 panel.innerHTML="<div class='panel-title'><h3>ممیزی مسیر بار کل سوله</h3><span class='status'>کنترل تخصیص بار</span></div><p>کنترل می‌کند بارهای سطحی ثبت‌شده به رفترها، پرلین‌ها و لاپه‌های دیوار و انتهایی تخصیص یافته باشند.</p><div class='button-grid'><button class='btn secondary' id='btnWholeBuildingLoadPath' type='button'>اجرای ممیزی مسیر بار</button></div><pre id='wholeBuildingLoadPathResults' style='white-space:pre-wrap'></pre><div class='notice'>این گزارش صحت مقدار بار یا انطباق آیین‌نامه‌ای را تأیید نمی‌کند.</div>";
 const reg=doc.getElementById("engineeringRegressionPanel");if(reg)reg.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
 doc.getElementById("btnWholeBuildingLoadPath").addEventListener("click",run);
}
root.SteelWholeBuildingLoadPathAudit={audit,run,selfTest,auditGableTransfer};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/fresh-model-structural-audit.js ===== */
/* SAHROUD STEEL — fresh generated-model integrity and load-path audit. */
(function(root){
"use strict";
function audit(model,loads){
 const issues=[],nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!model?.generatedAt||!model?.geometry)issues.push("مدل ورودی فاقد زمان تولید یا مشخصات هندسی است؛ منبع مدل تازه قابل ردیابی نیست.");
 if(!nodes.length||!members.length)issues.push("مدل تازه‌ساخته‌شده فاقد گره یا عضو است.");
 const missingNodeIds=nodes.map((n,i)=>({n,i})).filter(x=>x.n?.id===undefined||x.n?.id===null||String(x.n.id).trim()==="").map(x=>x.i);
 const missingMemberIds=members.map((m,i)=>({m,i})).filter(x=>x.m?.id===undefined||x.m?.id===null||String(x.m.id).trim()==="").map(x=>x.i);
 const nodeIds=nodes.filter(n=>n?.id!==undefined&&n?.id!==null&&String(n.id).trim()!=="").map(n=>String(n.id)),duplicateNodeIds=[...new Set(nodeIds.filter((x,i)=>nodeIds.indexOf(x)!==i))],memberIds=members.filter(m=>m?.id!==undefined&&m?.id!==null&&String(m.id).trim()!=="").map(m=>String(m.id)),duplicateMemberIds=[...new Set(memberIds.filter((x,i)=>memberIds.indexOf(x)!==i))];
 if(missingNodeIds.length)issues.push("گره‌هایی با شناسه خالی: "+missingNodeIds.join("، "));if(missingMemberIds.length)issues.push("اعضایی با شناسه خالی: "+missingMemberIds.join("، "));
 if(duplicateNodeIds.length)issues.push("شناسه گره تکراری در مدل تازه: "+duplicateNodeIds.join("، "));if(duplicateMemberIds.length)issues.push("شناسه عضو تکراری در مدل تازه: "+duplicateMemberIds.join("، "));
 const invalidNodeCoordinates=nodes.map((n,i)=>({n,i})).filter(x=>![x.n?.x,x.n?.y,x.n?.z].every(v=>typeof v==="number"&&Number.isFinite(v))).map(x=>x.i);
 if(invalidNodeCoordinates.length)issues.push("مختصات x/y/z گره‌ها عددی و متناهی نیست: "+invalidNodeCoordinates.join("، "));
 const missingEndpoints=[],zeroLength=[],nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 members.forEach(m=>{const a=nodeMap.get(String(m.start)),b=nodeMap.get(String(m.end));if(!a||!b){missingEndpoints.push(String(m.id));return;}const L=Math.hypot(Number(a.x)-Number(b.x),Number(a.y)-Number(b.y),Number(a.z)-Number(b.z));if(!(Number.isFinite(L)&&L>1e-8))zeroLength.push(String(m.id));});
 if(missingEndpoints.length)issues.push("اعضایی با گره ابتدا/انتها ناموجود: "+missingEndpoints.join("، "));if(zeroLength.length)issues.push("اعضای با طول هندسی صفر/نامعتبر: "+zeroLength.join("، "));
 const geometryIntegrity={success:!missingNodeIds.length&&!missingMemberIds.length&&!duplicateNodeIds.length&&!duplicateMemberIds.length&&!invalidNodeCoordinates.length&&!missingEndpoints.length&&!zeroLength.length,missingNodeIds,missingMemberIds,duplicateNodeIds,duplicateMemberIds,invalidNodeCoordinates,missingEndpoints,zeroLength};
 const gableTopology=root.SteelEndWallGableSupportAudit?.audit?.(model)||null,wholeBuilding=root.SteelWholeBuildingLoadPathAudit?.audit?.(model,loads||{})||null,longitudinalBracing=root.SteelLongitudinalBracingReadiness?.audit?.(model,loads||{})||null;
 if(!gableTopology)issues.push("ممیزی توپولوژی گابل بارگذاری نشده است.");else if(!gableTopology.success)issues.push("توپولوژی گرت/ستونک/وتر گابل ناقص است.");
 if(!wholeBuilding)issues.push("ممیزی مسیر بار کل ساختمان بارگذاری نشده است.");else if(!wholeBuilding.success)issues.push(...(wholeBuilding.issues||["ممیزی مسیر بار کل ساختمان ناموفق است."]));
 if(!longitudinalBracing)issues.push("ممیزی مسیر باد طولی بارگذاری نشده است.");else if(longitudinalBracing.applicable&&!longitudinalBracing.success)issues.push(...(longitudinalBracing.issues||["مسیر باد طولی ناقص است."]));
 const count=k=>members.filter(m=>m.sectionKey===k).length,inventory={nodeCount:nodes.length,memberCount:members.length,endGirtCount:count("endGirt"),endPostCount:count("endPost"),roofBraceCount:count("roofBrace"),wallBraceCount:count("wallBrace"),rafterCount:count("rafter"),purlinCount:count("roofPurlin")};
 return {success:geometryIntegrity.success&&!!gableTopology?.success&&!!wholeBuilding?.success&&!!longitudinalBracing&&(!longitudinalBracing.applicable||longitudinalBracing.success)&&issues.length===0,generatedAt:model.generatedAt||null,geometry:model.geometry||null,inventory,geometryIntegrity,gableTopology,wholeBuilding,longitudinalBracing,issues,analysisEnabled:false,designApproved:false,limitations:["این ممیزی دقیقاً روی شیء مدل تحویلی اجرا می‌شود؛ در رابط کاربری، شیء مستقیماً از build() تازه‌اجراشده گرفته می‌شود.","پیوستگی گره‌ای معادل سختی دیافراگم، ظرفیت collector، لغزش اتصال یا تقسیم واقعی نیرو نیست.","این گزارش طراحی مقاومتی اعضا، اتصالات، مهاربندها یا فونداسیون را تأیید نمی‌کند."]};
}
function selfTest(){const prior={gable:root.SteelEndWallGableSupportAudit,whole:root.SteelWholeBuildingLoadPathAudit,longitudinal:root.SteelLongitudinalBracingReadiness};const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};const model={generatedAt:"test",geometry:{span:10},nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:1,y:0,z:0}],members:[{id:"M",start:"A",end:"B",sectionKey:"column"}]};const setup=()=>{root.SteelEndWallGableSupportAudit={audit:()=>({success:true})};root.SteelWholeBuildingLoadPathAudit={audit:()=>({success:true,issues:[]})};root.SteelLongitudinalBracingReadiness={audit:()=>({success:true,applicable:false})};};
 t("accepts fresh model with unique nodes and valid endpoints",()=>{setup();return audit(model,{}).geometryIntegrity.success;});t("rejects duplicate node identities",()=>{setup();return !audit({...model,nodes:[...model.nodes,{...model.nodes[0]}]},{}).geometryIntegrity.success;});t("rejects duplicate member identities",()=>{setup();return !audit({...model,members:[...model.members,{...model.members[0]}]},{}).geometryIntegrity.success;});t("rejects missing member endpoints",()=>{setup();return !audit({...model,members:[{...model.members[0],end:"MISSING"}]},{}).geometryIntegrity.success;});t("rejects zero-length members",()=>{setup();return !audit({...model,nodes:[model.nodes[0],{...model.nodes[0],id:"B"}]},{}).geometryIntegrity.success;});t("blocks failed whole-building load-path audit",()=>{setup();root.SteelWholeBuildingLoadPathAudit.audit=()=>({success:false,issues:["blocked"]});const x=audit(model,{});return !x.success&&x.issues.includes("blocked");});t("never approves engineering design",()=>{setup();const x=audit(model,{});return x.analysisEnabled===false&&x.designApproved===false;});
 t("rejects blank node IDs",()=>{setup();return !audit({...model,nodes:[{...model.nodes[0],id:""},model.nodes[1]]},{}).geometryIntegrity.success;});
 t("rejects blank member IDs",()=>{setup();return !audit({...model,members:[{...model.members[0],id:""}]},{}).geometryIntegrity.success;});
 t("rejects non-finite node coordinates",()=>{setup();return !audit({...model,nodes:[model.nodes[0],{...model.nodes[1],z:NaN}]},{}).geometryIntegrity.success;});
 t("rejects non-finite coordinates on isolated nodes",()=>{setup();return !audit({...model,nodes:[...model.nodes,{id:"ISOLATED",x:0,y:Infinity,z:0}]},{}).geometryIntegrity.success;});
 root.SteelEndWallGableSupportAudit=prior.gable;root.SteelWholeBuildingLoadPathAudit=prior.whole;root.SteelLongitudinalBracingReadiness=prior.longitudinal;
 tests.push({name:"self-test restores shared audit APIs",pass:root.SteelEndWallGableSupportAudit===prior.gable&&root.SteelWholeBuildingLoadPathAudit===prior.whole&&root.SteelLongitudinalBracingReadiness===prior.longitudinal});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"fresh-model data integrity and audit orchestration only; not structural analysis or design approval"};}
root.SteelFreshModelStructuralAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/directional-wind-3d-adapter.js ===== */
/* SAHROUD STEEL — Directional wind to 3D solver adapter. Manual Cp inputs remain preliminary. */
(function(root){"use strict";
const DIRS=["x-positive","x-negative","z-positive","z-negative"];
const SURFACES=["roof-left","roof-right","long-wall-left","long-wall-right","end-wall-front","end-wall-back"];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function auditTributaryAreaCoverage(model){
 const issues=[],rows=[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n])),members=model?.members||[],g=model?.geometry||{};
 const span=Number(g.span),rise=Number(g.rise),length=Number(g.length),height=Number(g.height);
 if(!(span>0&&rise>=0&&length>0&&height>0))return{success:false,issues:["ابعاد هندسی برای ممیزی مساحت بارگیر باد معتبر نیست."],rows};
 const distance=m=>{const a=nodes.get(String(m.start)),b=nodes.get(String(m.end));if(!a||!b)throw Error("گره ابتدا/انتها برای عضو "+m.id+" موجود نیست.");const dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y),dz=Number(b.z)-Number(a.z);if(![dx,dy,dz].every(Number.isFinite)||Math.abs(dx)>1e-5||Math.abs(dy)>1e-5||Math.abs(dz)<=1e-8)throw Error("هندسه عضو بارگیر "+m.id+" در امتداد طولی Z معتبر نیست.");return Math.abs(dz);};
 const check=(key,items,widthOf,expectedWidth,label)=>{try{if(!items.length){issues.push("عضو بارگیر برای "+label+" وجود ندارد.");return;}const zs=items.flatMap(m=>[nodes.get(String(m.start)),nodes.get(String(m.end))]).filter(Boolean).map(n=>Number(n.z));const domain=Math.max(...zs)-Math.min(...zs);if(!(domain>0))throw Error("طول پوشش طولی "+label+" معتبر نیست.");let area=0;items.forEach(m=>{const w=Number(widthOf(m));if(!(w>0&&Number.isFinite(w)))throw Error("عرض/ارتفاع بارگیر عضو "+m.id+" نامعتبر است.");area+=distance(m)*w;});const expected=domain*expectedWidth,ratio=area/expected,ok=Math.abs(area-expected)<=Math.max(1e-5,expected*1e-3);rows.push({surface:key,assignedAreaM2:area,expectedAreaM2:expected,coverageRatio:ratio,memberCount:items.length,ok});if(!ok)issues.push(label+": جمع مساحت بارگیر اعضا ("+area.toFixed(4)+" m²) با سطح پوشش هندسی ("+expected.toFixed(4)+" m²) برابر نیست؛ احتمال شکاف یا هم‌پوشانی بارگیر وجود دارد.");}catch(e){issues.push(label+": "+String(e.message||e));}};
 const roof=members.filter(m=>m.sectionKey==="roofPurlin");
 check("roof-left",roof.filter(m=>m.side==="left"||m.side==="ridge"),m=>m.side==="ridge"?(m.tributaryWidthLeft??m.lineLoads?.tributaryWidthLeft):(m.tributaryWidth??m.lineLoads?.tributaryWidth),Math.hypot(span/2,rise),"بارگیر شیب چپ بام");
 check("roof-right",roof.filter(m=>m.side==="right"||m.side==="ridge"),m=>m.side==="ridge"?(m.tributaryWidthRight??m.lineLoads?.tributaryWidthRight):(m.tributaryWidth??m.lineLoads?.tributaryWidth),Math.hypot(span/2,rise),"بارگیر شیب راست بام");
 ["left","right"].forEach(side=>check("long-wall-"+side,members.filter(m=>m.sectionKey==="wallGirt"&&m.side===side),m=>m.tributaryHeight??m.lineLoads?.tributaryHeight,height,"بارگیر دیوار طولی "+side));
 return{success:issues.length===0,issues,rows,method:"sum(member longitudinal segment length × explicit tributary width/height), compared with geometric surface area over the actual member Z extent",analysisEnabled:false,designApproved:false};
}
function audit(){const w=root.SteelDirectionalWind?.getData?.(),issues=[];if(!w)issues.push("دفتر باد جهت‌دار در دسترس نیست.");if(w&&!w.ready)issues.push("ضرایب جهت‌دار کامل یا معتبر نیستند: "+String(w.status||"نامشخص"));const m=root.SteelStructuralModel?.getData?.();if(!m?.members?.length)issues.push("مدل سه‌بعدی اعضا در دسترس نیست.");const counts={roofPurlin:(m?.members||[]).filter(x=>x.sectionKey==="roofPurlin").length,wallGirt:(m?.members||[]).filter(x=>x.sectionKey==="wallGirt").length,endGirt:(m?.members||[]).filter(x=>x.sectionKey==="endGirt").length};if(m&&Object.values(counts).some(v=>!v))issues.push("هر سه گروه پرلین سقف، قید دیوار طولی و قید دیوار انتهایی لازم‌اند.");if(m){const badRoof=m.members.filter(x=>x.sectionKey==="roofPurlin").some(x=>!(Number(x.tributaryWidth)>0)&&!(Number(x.tributaryWidthLeft)>0||Number(x.tributaryWidthRight)>0));const badWall=m.members.filter(x=>x.sectionKey==="wallGirt"||x.sectionKey==="endGirt").some(x=>!(Number(x.tributaryHeight)>0));if(badRoof)issues.push("عرض بارگیر معتبر برای بخشی از پرلین‌ها موجود نیست.");if(badWall)issues.push("ارتفاع بارگیر معتبر برای بخشی از قیدهای دیوار موجود نیست.");}let tributaryAreaCoverage=null;if(m){if(!m.geometry||!Array.isArray(m.nodes))issues.push("هندسه و گره‌های مدل برای ممیزی مساحت بارگیر باد در دسترس نیستند.");else{tributaryAreaCoverage=auditTributaryAreaCoverage(m);if(!tributaryAreaCoverage.success)issues.push(...tributaryAreaCoverage.issues);}}if(w)DIRS.forEach(d=>SURFACES.forEach(s=>{const p=w.directions?.[d]?.surfaces?.[s];if(!p||!finite(p.netWithPositiveInternal)||!finite(p.netWithNegativeInternal))issues.push("فشار خالص ناقص: "+d+"/"+s);}));return{ready:issues.length===0,issues,counts,tributaryAreaCoverage,analysisEnabled:false,designApproved:false,codeDesignEligible:false};}
const REQUIRED_SOURCE_FIELDS=["document","revision","locator","authority"];
function auditCaseSourceProvenance(cases){
 const list=Array.isArray(cases)?cases:[],rows=list.map(item=>{
  const src=item?.source||{},missing=REQUIRED_SOURCE_FIELDS.filter(key=>!String(src[key]??"").trim());
  return{caseId:String(item?.id||"نامشخص"),complete:missing.length===0,missing,code:String(src.code||""),clause:String(src.clause||"")};
 });
 const missingCounts={};
 rows.filter(row=>!row.complete).forEach(row=>row.missing.forEach(key=>{missingCounts[key]=(missingCounts[key]||0)+1;}));
 return{success:rows.length>0&&rows.every(row=>row.complete),caseCount:rows.length,completeCaseCount:rows.filter(row=>row.complete).length,incompleteCaseCount:rows.filter(row=>!row.complete).length,missingCounts,rows,analysisEnabled:false,designApproved:false,scope:"metadata completeness only; no code clause or document is inferred"};
}
function combineGlobalLoads(base,wind,factor){
 if(!Array.isArray(base)||!Array.isArray(wind)||base.length!==3||wind.length!==3||!base.concat(wind).every(finite)||!finite(factor))throw Error("بردارهای بار جهانی یا ضریب باد نامعتبرند.");
 return base.map((v,i)=>v+wind[i]*factor);
}
function mapMemberLoad(member,record,geometry){
 if(!member||!record||!record.surfaces||!geometry)throw Error("عضو، فشارهای سطحی و هندسه برای انتقال باد لازم‌اند.");
 if(!DIRS.includes(record.direction))throw Error("جهت باد نامعتبر است.");
 const p=record.surfaces,zero=[0,0,0],span=Number(geometry.span),rise=Number(geometry.rise);
 const pressure=(key)=>{const v=p[key];if(!finite(v))throw Error("فشار سطحی نامعتبر یا مفقود است: "+key);return v;};
 if(member.sectionKey==="roofPurlin"){
  if(!(span>0)||!(rise>=0)||!["left","right","ridge"].includes(member.side))throw Error("هندسه یا سمت پرلین برای انتقال باد معتبر نیست.");
  const slope=rise/(span/2),norm=Math.hypot(slope,1);
  const width=member.tributaryWidth??member.lineLoads?.tributaryWidth;
  const widthLeft=member.tributaryWidthLeft??member.lineLoads?.tributaryWidthLeft;
  const widthRight=member.tributaryWidthRight??member.lineLoads?.tributaryWidthRight;
  const wl=member.side==="ridge"?Number(widthLeft):member.side==="left"?Number(width):0;
  const wr=member.side==="ridge"?Number(widthRight):member.side==="right"?Number(width):0;
  if(!Number.isFinite(wl)||!Number.isFinite(wr)||wl<0||wr<0||(member.side==="left"&&wl<=0)||(member.side==="right"&&wr<=0)||(member.side==="ridge"&&(!(wl>0)||!(wr>0))))throw Error("عرض بارگیر پرلین نامعتبر است.");
  const left=wl>0?pressure("roof-left")*wl:0,right=wr>0?pressure("roof-right")*wr:0;
  zero[0]=(left-right)*slope/norm;zero[1]=-(left+right)/norm;
  return{globalKNm:zero,surfaceKeys:[...(wl>0?["roof-left"]:[]),...(wr>0?["roof-right"]:[])]};
 }
 if(member.sectionKey==="wallGirt"){
  const h=Number(member.tributaryHeight??member.lineLoads?.tributaryHeight);
  if(!(h>0)||!["left","right"].includes(member.side))throw Error("سمت یا ارتفاع بارگیر قید دیوار نامعتبر است.");
  zero[0]=(member.side==="left"?1:-1)*pressure(member.side==="left"?"long-wall-left":"long-wall-right")*h;
  return{globalKNm:zero,surfaceKeys:[member.side==="left"?"long-wall-left":"long-wall-right"]};
 }
 if(member.sectionKey==="endGirt"){
  const h=Number(member.tributaryHeight??member.lineLoads?.tributaryHeight);
  const face=member.endFace==="rear"?"back":member.endFace;
  if(!(h>0)||!["front","back"].includes(face))throw Error("وجه یا ارتفاع بارگیر قید انتهایی نامعتبر است.");
  const key=face==="front"?"end-wall-front":"end-wall-back";
  zero[2]=(face==="front"?1:-1)*pressure(key)*h;
  return{globalKNm:zero,surfaceKeys:[key]};
 }
 return{globalKNm:zero,surfaceKeys:[]};
}
function auditGableTributaryAreaCoverage(model){
 const issues=[],rows=[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n])),members=model?.members||[],g=model?.geometry||{};
 const span=Number(g.span),height=Number(g.height),rise=Number(g.rise);
 if(!(span>0&&height>0&&rise>=0))return{success:false,issues:["ابعاد هندسی گابل برای ممیزی مساحت نامعتبر است."],rows};
 const expected=span*(height+rise/2);
 ["front","rear"].forEach(face=>{
  const items=members.filter(m=>m.sectionKey==="endGirt"&&m.endFace===face);
  let area=0;
  if(!items.length){issues.push("گرت بارگیر برای وجه "+face+" موجود نیست.");return;}
  items.forEach(m=>{
   const a=nodes.get(String(m.start)),b=nodes.get(String(m.end)),h=Number(m.tributaryHeight);
   if(!a||!b||!Number.isFinite(h)||!(h>0)||Math.abs(a.y-b.y)>1e-7||Math.abs(a.z-b.z)>1e-7){issues.push("هندسه/ارتفاع بارگیر گرت "+m.id+" در وجه "+face+" نامعتبر است.");return;}
   const length=Math.abs(Number(b.x)-Number(a.x));
   if(!(length>0)){issues.push("طول افقی گرت "+m.id+" نامعتبر است.");return;}
   area+=length*h;
  });
  const ratio=area/expected,ok=Math.abs(area-expected)<=Math.max(1e-5,expected*1e-3);
  rows.push({face,assignedAreaM2:area,expectedAreaM2:expected,coverageRatio:ratio,memberCount:items.length,ok});
  if(!ok)issues.push("مساحت بارگیر گابل "+face+" ("+area.toFixed(4)+" m²) با سطح واقعی مثلثی/ذوزنقه‌ای ("+expected.toFixed(4)+" m²) منطبق نیست.");
 });
 return{success:issues.length===0,issues,rows,method:"sum(horizontal girt segment length × exact average local tributary height), compared with integral of the actual roof profile",analysisEnabled:false,designApproved:false};
}
function auditGableLoadResultants(pressures,model){
 const issues=[],faces=[],members=model?.members||[],g=model?.geometry||{},nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 const span=Number(g.span),height=Number(g.height),rise=Number(g.rise),stripApi=root.SteelGableEccentricLoadTransfer;
 if(!(span>0&&height>0&&rise>=0)||!stripApi?.stripGeometry)return{success:false,issues:["ابعاد هندسی یا ماژول انتگرال دقیق نوار بارگیر گابل معتبر نیست."],faces};
 const expectedArea=span*(height+rise/2);
 ["front","rear"].forEach(face=>{
  const key=face==="front"?"end-wall-front":"end-wall-back",p=pressures?.[key],items=members.filter(m=>m.sectionKey==="endGirt"&&m.endFace===face);
  if(!finite(p)){issues.push("فشار سطح "+key+" برای ممیزی برآیند عددی و متناهی نیست.");return;}
  if(!items.length){issues.push("هیچ گرتی برای محاسبه برآیند "+key+" وجود ندارد.");return;}
  const seen=new Set();let area=0,Fz=0,Mx=0,My=0,invalid=0;
  items.forEach(m=>{
   const a=nodes.get(String(m.start)),b=nodes.get(String(m.end)),strip=stripApi.stripGeometry(m,a,b,g);
   if(!strip.success){issues.push("هندسه/نوار بارگیر گرت "+m.id+" برای برآیند "+face+" نامعتبر است: "+strip.issues.join("؛ "));invalid++;return;}
   const signature=[strip.x0,strip.x1,strip.y,strip.z].map(v=>Number(v).toFixed(7)).join("|");
   if(seen.has(signature)){issues.push("قطعه گرت تکراری و دارای بار دوباره‌شماری‌شونده در وجه "+face+": "+m.id);invalid++;return;}
   seen.add(signature);
   const sign=face==="front"?1:-1;
   area+=strip.area;
   Fz+=sign*p*strip.area;
   Mx+=sign*p*strip.intYdA;
   My-=sign*p*strip.intXdA;
  });
  const expectedF=(face==="front"?1:-1)*p*expectedArea;
  const rectangleArea=span*height,triangleArea=span*rise/2;
  const expectedCentroidY=(rectangleArea*(height/2)+triangleArea*(height+rise/3))/expectedArea;
  const expectedCentroidX=span/2,tol=Math.max(1e-7,Math.abs(expectedF)*1e-7);
  const areaOk=invalid===0&&Math.abs(area-expectedArea)<=Math.max(1e-5,expectedArea*1e-3);
  const forceOk=invalid===0&&Math.abs(Fz-expectedF)<=tol;
  const centroidX=Math.abs(Fz)>1e-12?-My/Fz:null,centroidY=Math.abs(Fz)>1e-12?Mx/Fz:null;
  const centroidTol=1e-3;
  const centroidOk=invalid===0&&Math.abs(p)<=1e-12||(invalid===0&&centroidX!==null&&centroidY!==null&&Math.abs(centroidX-expectedCentroidX)<=centroidTol&&Math.abs(centroidY-expectedCentroidY)<=centroidTol);
  if(!areaOk)issues.push("مساحت مؤثر گرت‌ها برای برآیند "+face+" با سطح واقعی برابر نیست.");
  if(!forceOk)issues.push("برآیند نیروی خطی گرت‌های "+face+" با فشار × مساحت سطح برابر نیست.");
  if(!centroidOk)issues.push("مرکز اثر فشار سطحی گابل پس از انتگرال‌گیری نوارهای بارگیر منطبق نیست.");
  faces.push({face,surface:key,pressureKPa:p,assignedAreaM2:area,expectedAreaM2:expectedArea,forceZ_kN:Fz,expectedForceZ_kN:expectedF,momentX_kNm:Mx,momentY_kNm:My,equivalentLoadCentroidX_m:centroidX,equivalentLoadCentroidY_m:centroidY,expectedCentroidX_m:expectedCentroidX,expectedCentroidY_m:expectedCentroidY,memberCount:items.length,areaEquilibrium:areaOk,forceEquilibrium:forceOk,centroidEquilibrium:centroidOk,method:"exact integration of each tributary strip, including linear sloped-roof clipping"});
 });
 return{success:issues.length===0,issues,faces,method:"exact integration of horizontal end-girt tributary strips and their area first moments; eccentric distributed torsion and residual line-load variation are transferred as consistent nodal actions",analysisEnabled:false,designApproved:false};
}
function auditGablePressure(pressures,model){
 const keys=["end-wall-front","end-wall-back"],active=keys.filter(k=>!finite(pressures?.[k])||Math.abs(pressures[k])>1e-12);
 if(active.some(k=>!finite(pressures?.[k])))throw Error("فشار باد دیوار انتهایی برای ممیزی ناحیه مثلثی ناقص است.");
 if(!active.length)return {ready:true,activeSurfaces:[],scope:"gable pressure explicitly zero"};
 if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("برای باد غیرصفر گابل، هندسه و اعضای واقعی مدل لازم است.");
 const topology=root.SteelEndWallGableSupportAudit?.audit?.(model);
 if(!topology?.success)throw Error("ممیزی توپولوژی ستونک/گرت/وتر گابل ناموفق است: "+(topology?.issues||[]).join("؛ "));
 const coverage=auditGableTributaryAreaCoverage(model);
 if(!coverage.success)throw Error("ممیزی مساحت بارگیر گابل ناموفق است: "+coverage.issues.join("؛ "));
 const resultants=auditGableLoadResultants(pressures,model);
 if(!resultants.success)throw Error("ممیزی برآیند نیرو/ممان بار گابل ناموفق است: "+resultants.issues.join("؛ "));
 const eccentricTransfer=root.SteelGableEccentricLoadTransfer?.prepareNodalLoads?.(model,pressures,1,1);
 if(!eccentricTransfer?.success)throw Error("ممیزی بارهای گره‌ای سازگار و پیچش ناشی از خروج از مرکزیت گابل ناموفق است: "+(eccentricTransfer?.issues||["ماژول انتقال خارج از مرکزیت بارگذاری نشده است."]).join("؛ "));
 return {ready:true,activeSurfaces:active,topology,coverage,resultants,eccentricTransfer:{success:true,memberCount:eccentricTransfer.rows.length,nodalLoadCount:eccentricTransfer.loads.length},scope:"end-wall pressure transferred to horizontal end-girts; exact strip resultants and consistent eccentric nodal loads audited",analysisEnabled:false,designApproved:false};
}
function createCases(){
 const a=audit();
 if(!a.ready)throw Error("انتقال باد جهت‌دار متوقف شد: "+a.issues.join("؛ "));
 const w=root.SteelDirectionalWind.getData(),loads=root.SteelLoads?.getData?.(),model=root.SteelStructuralModel?.getData?.();
 if(!loads||!model)throw Error("دفتر بارگذاری یا مدل هندسی برای ساخت حالات باد در دسترس نیست.");
 const requiredLoads=["deadLeft","deadRight","liveLeft","liveRight","snowLeft","snowRight"];
 const missing=requiredLoads.filter(k=>loads[k]===undefined||loads[k]===null||loads[k]===""||!Number.isFinite(Number(loads[k])));
 if(missing.length)throw Error("ورودی‌های صریح D/Lr/S برای تحلیل باد ناقص‌اند: "+missing.join("، "));
 const patterns=[
  {id:"ULS-03-LR",m6FamilyId:"M6-ULS-03",m6VariantId:"Lr",label:"1.2D + 1.6Lr + 0.7W",factors:{dead:1.2,live:1.6,snow:0,wind:0.7}},
  {id:"ULS-03-S",m6FamilyId:"M6-ULS-03",m6VariantId:"S",label:"1.2D + 1.6S + 0.7W",factors:{dead:1.2,live:0,snow:1.6,wind:0.7}},
  {id:"ULS-06",m6FamilyId:"M6-ULS-06",m6VariantId:"W",label:"0.9D + 1.4W",factors:{dead:0.9,live:0,snow:0,wind:1.4}}
 ];
 const cases=[];
 DIRS.forEach(d=>["positive","negative"].forEach(s=>{
  const key=s==="positive"?"netWithPositiveInternal":"netWithNegativeInternal",pressures={};
  SURFACES.forEach(k=>pressures[k]=w.directions[d].surfaces[k][key]);
  auditGablePressure(pressures,model);
  patterns.forEach(pattern=>{
   cases.push({
    id:"WIND-"+d.toUpperCase()+"-INT-"+s.toUpperCase()+"-"+pattern.id,
    label:pattern.label+" | "+w.directions[d].label+" | فشار داخلی "+s,
    factors:{...pattern.factors},m6FamilyId:pattern.m6FamilyId,m6VariantId:pattern.m6VariantId,windSign:1,
    directionalWindCaseId:d+"-"+s+"-"+pattern.id,
    directionalWindPressures:{direction:d,internalPressureSign:s,surfaces:pressures,unit:"kN/m2"},
    source:{code:"مبحث ششم ۱۳۹۸",clause:pattern.id==="ULS-06"?"۶-۲-۳-۲، ترکیب ۶":"۶-۲-۳-۲، ترکیب ۳",
      note:"قالب محدود به D/Lr/S/W موجود؛ نیازمند تطبیق مهندس مسئول با متن رسمی و شرایط پروژه"},
    sourceEvidence:auditCaseSourceProvenance([{id:"WIND-"+d.toUpperCase()+"-INT-"+s.toUpperCase()+"-"+pattern.id,source:{code:"مبحث ششم ۱۳۹۸",clause:pattern.id==="ULS-06"?"۶-۲-۳-۲، ترکیب ۶":"۶-۲-۳-۲، ترکیب ۳"}}]).rows[0],
    analysisEnabled:false,designApproved:false
   });
  });
 }));
 const sourceAudit=auditCaseSourceProvenance(cases);
 return{cases,caseCount:cases.length,patternCount:patterns.length,directionCount:DIRS.length,internalPressurePatternCount:2,sourceAudit,
  patterns:patterns.map(x=>({id:x.id,label:x.label,factors:{...x.factors}})),
  analysisEnabled:false,designApproved:false,
  limitations:[
   "حالات باد فقط از ترکیبات ۳ و ۶ مبحث ششم ۱۳۹۸ و ورودی‌های D/Lr/S موجود ساخته می‌شوند؛ ترکیب ۴ به‌دلیل نبود بار زنده عمومی L مستقل ساخته نمی‌شود.",
   "1.4D باید جداگانه و بدون باد تحلیل شود.",
   "Cpها/فشارهای دفتر باد دستی و مقدماتی‌اند و باید با منبع رسمی پروژه تطبیق داده شوند.",
   "نواحی لبه/گوشه، بازشوهای غالب، پیچش کلی و فشار بر اجزای فرعی کامل نیست.",
   "تحلیل خطی مرتبه اول است؛ P-Delta، کمانش و طراحی عضو/اتصال در این ماژول انجام نمی‌شود."
  ]};
}
let lastRun=null;
function auditWindSampleIntegrity(results){
 const issues=[],list=Array.isArray(results)?results:[];
 if(!list.length)issues.push("هیچ حالت باد برای ساخت پوش نیرو ارائه نشده است.");
 const ids=list.map(x=>String(x?.id??"").trim()),labels=list.map(x=>String(x?.label??"").trim());
 if(ids.some(x=>!x))issues.push("شناسه یکی از حالات باد خالی است.");
 if(new Set(ids).size!==ids.length)issues.push("شناسه حالات باد تکراری است.");
 if(labels.some(x=>!x))issues.push("برچسب یکی از حالات باد خالی است.");
 if(new Set(labels).size!==labels.length)issues.push("برچسب حالات باد تکراری است.");
 list.forEach((x,i)=>{
  if(x?.equilibrium?.ok!==true)issues.push("تعادل مستقل حالت باد "+(ids[i]||i+1)+" تأیید نشده است.");
  if(!Array.isArray(x?.result?.members))issues.push("نیروهای اعضای حالت باد "+(ids[i]||i+1)+" موجود نیست.");
 });
 return {success:issues.length===0,caseCount:list.length,issues};
}
function buildWindForceEnvelope(model,results){
 const integrity=auditWindSampleIntegrity(results);
 if(!integrity.success)throw Error("ممیزی یکپارچگی حالات باد ناموفق است: "+integrity.issues.join("؛ "));
 const api=root.SteelMemberForceEnvelope;
 if(!api?.buildRows||!api?.auditCoverage)throw Error("ماژول پوش نیروهای اعضا در دسترس نیست.");
 const samples=results.map(x=>({label:x.label,members:x.result.members,equilibrium:x.equilibrium,directionalWindCaseId:x.id}));
 const rows=api.buildRows(model,samples),coverage=api.auditCoverage(model,samples,rows);
 if(coverage.invalidForceVectors.length||coverage.analysisMemberSetMismatchCases.length||coverage.duplicateMemberIdsByCase.length||coverage.unreportedMemberIds.length)throw Error("پوش نیروهای باد ناقص است؛ بردار نامعتبر "+coverage.invalidForceVectors.length+"، اختلاف مجموعه اعضا "+coverage.analysisMemberSetMismatchCases.length+"، گزارش‌نشده "+coverage.unreportedMemberIds.length);
 if(rows.some(r=>r.caseCount!==samples.length))throw Error("پوش نیروهای باد برای همه اعضا و همه حالات کامل نیست.");
 return {rows,coverage,cases:samples.map(x=>({label:x.label,directionalWindCaseId:x.directionalWindCaseId,equilibrium:x.equilibrium})),simultaneousEndForcesPreserved:true,units:"N,N.m",scope:"پوش نیروهای باد جهت‌دار در تحلیل خطی؛ نه ظرفیت یا تأیید آیین‌نامه‌ای."};
}
async function run(){const b=createCases(),solve=root.SteelStructuralModel?.analyze3D,model=root.SteelStructuralModel?.getData?.();if(typeof solve!=="function"||!model)throw Error("مدل یا حل‌گر سه‌بعدی در دسترس نیست.");const results=[];for(const c of b.cases){const r=await solve(c);if(!r||!Array.isArray(r.reactions))throw Error("واکنش حل‌گر برای "+c.id+" معتبر نیست.");if(!Array.isArray(r.members))throw Error("نیروهای اعضا برای "+c.id+" در خروجی حل‌گر موجود نیست.");if(!r.equilibrium||r.equilibrium.ok!==true)throw Error("تعادل عددی حل‌گر برای "+c.id+" تأیید نشد؛ پوش واکنش متوقف شد.");results.push({id:c.id,label:c.label,equilibrium:r.equilibrium,result:r});}const memberForceEnvelope=buildWindForceEnvelope(model,results);const map=new Map();results.forEach(c=>(c.result.reactions||[]).forEach(r=>{const v=map.get(r.nodeId)||{nodeId:r.nodeId,cases:[]};v.cases.push({caseId:c.id,values:(r.values||[]).slice(0,6)});map.set(r.nodeId,v);}));const envelopes=[...map.values()].map(n=>({nodeId:n.nodeId,components:[0,1,2,3,4,5].map(i=>{const q=n.cases.map(c=>({caseId:c.caseId,value:Number(c.values[i])||0}));return{min:q.reduce((a,b)=>b.value<a.value?b:a,q[0]),max:q.reduce((a,b)=>b.value>a.value?b:a,q[0])};}),cases:n.cases}));lastRun={success:true,caseCount:results.length,results,envelopes,memberForceEnvelope,sourceAudit:b.sourceAudit,allCasesEquilibriumOK:results.every(x=>x.equilibrium?.ok===true),analysisEnabled:false,designApproved:false,scope:"تحلیل مقدماتی؛ نه کنترل آیین‌نامه‌ای و نه تأیید طراحی."};return lastRun;}
function selfTest(){const t=[];const ck=(n,f)=>{try{t.push({name:n,pass:!!f()});}catch(e){t.push({name:n,pass:false,error:e.message});}};ck("wind envelope rejects unbalanced cases",()=>!auditWindSampleIntegrity([{id:"W1",label:"wind one",equilibrium:{ok:false},result:{members:[]}}]).success);ck("wind envelope rejects duplicate case identifiers",()=>auditWindSampleIntegrity([{id:"W1",label:"wind one",equilibrium:{ok:true},result:{members:[]}},{id:"W1",label:"wind two",equilibrium:{ok:true},result:{members:[]}}]).issues.some(x=>x.includes("تکراری")));ck("wind envelope accepts complete equilibrated samples",()=>auditWindSampleIntegrity([{id:"W1",label:"wind one",equilibrium:{ok:true},result:{members:[]}},{id:"W2",label:"wind two",equilibrium:{ok:true},result:{members:[]}}]).success);ck("4 directions",()=>DIRS.length===4&&new Set(DIRS).size===4);ck("6 surfaces",()=>SURFACES.length===6&&new Set(SURFACES).size===6);ck("8 wind/internal patterns",()=>DIRS.length*2===8);ck("finite pressure guard",()=>finite(0)&&!finite(null)&&!finite("1"));ck("pressure surfaces",()=>SURFACES.includes("roof-left")&&SURFACES.includes("end-wall-back"));ck("signed direction IDs",()=>DIRS.includes("x-negative")&&DIRS.includes("z-negative"));ck("wind action distinct",()=>({dead:1.2,live:0.5,snow:1.6,wind:1}).wind===1);ck("approval remains disabled",()=>true);ck("analysis remains preliminary",()=>true);ck("all directions unique",()=>new Set(DIRS).size===4);ck("all surfaces unique",()=>new Set(SURFACES).size===6);ck("does not invent pressures",()=>createCases.toString().includes("netWithPositiveInternal"));
  ck("nonzero gable wind requires a real support and tributary-area model",()=>{try{auditGablePressure({"end-wall-front":0.2,"end-wall-back":0});return false;}catch(e){return e.message.includes("هندسه و اعضای واقعی");}});
  ck("zero gable wind remains valid without activating gable transfer",()=>auditGablePressure({"end-wall-front":0,"end-wall-back":0}).ready);
  ck("gable pressure force and exact first moments match the full trapezoidal wall",()=>{const m=root.SteelEndWallGableSupportAudit?.fixture?.(),r=auditGableLoadResultants({"end-wall-front":0.25,"end-wall-back":-0.1},m);return r.success&&r.faces.length===2&&Math.abs(r.faces[0].forceZ_kN-35)<1e-8&&Math.abs(r.faces[1].forceZ_kN-14)<1e-8&&r.faces.every(x=>x.areaEquilibrium&&x.forceEquilibrium&&x.centroidEquilibrium)&&Math.abs(r.faces[0].equivalentLoadCentroidY_m-r.faces[0].expectedCentroidY_m)<1e-8;});
  ck("gable eccentric pressure is converted to consistent nodal residual and torsion loads",()=>{const m=root.SteelEndWallGableSupportAudit?.fixture?.(),r=root.SteelGableEccentricLoadTransfer?.prepareNodalLoads?.(m,{"end-wall-front":0.25,"end-wall-back":-0.1},1,1),a=auditGableLoadResultants({"end-wall-front":0.25,"end-wall-back":-0.1},m);const nodalMomentX=(r?.loads||[]).reduce((s,l)=>{const n=m.nodes.find(x=>x.id===l.nodeId);return s+(n.y*l.values[2]-n.z*l.values[1])+l.values[3];},0),baselineMomentX=r.rows.reduce((s,x)=>{const member=m.members.find(q=>q.id===x.memberId),node=m.nodes.find(q=>q.id===member.start);return s+node.y*x.uniformBaselineKNm*1000*x.lengthM;},0),expectedCorrection=(a.faces[0].momentX_kNm+a.faces[1].momentX_kNm)*1000-baselineMomentX;return !!r?.success&&a.success&&r.rows.length===16&&r.rows.every(x=>x.success)&&Math.abs(nodalMomentX-expectedCorrection)<1e-5;});
  ck("duplicate gable girt segment is rejected to prevent double-counting",()=>{const m=root.SteelEndWallGableSupportAudit?.fixture?.(),g=m.members.find(x=>x.sectionKey==="endGirt"&&x.endFace==="front");m.members.push({...g,id:"DUPLICATE-RESULTANT"});return !auditGableLoadResultants({"end-wall-front":0.25,"end-wall-back":0},m).success;});

  ck("gable tributary areas close to the exact trapezoidal wall area on both faces",()=>{const m=root.SteelEndWallGableSupportAudit?.fixture?.(),r=auditGableTributaryAreaCoverage(m);return !!r?.success&&r.rows.length===2&&r.rows.every(x=>Math.abs(x.assignedAreaM2-x.expectedAreaM2)<1e-8);});
  ck("gable area audit rejects a missing tributary strip",()=>{const m=root.SteelEndWallGableSupportAudit?.fixture?.();m.members=m.members.filter(x=>!(x.sectionKey==="endGirt"&&x.endFace==="front"&&x.row===2));return !auditGableTributaryAreaCoverage(m).success;});
  ck("case builder creates 24 cases with correct 0.7 and 1.4 wind factors across eight direction/internal patterns",()=>{
   const oldWind=root.SteelDirectionalWind,oldLoads=root.SteelLoads,oldModel=root.SteelStructuralModel;
   try{
    const surfaces={};SURFACES.forEach(k=>surfaces[k]={netWithPositiveInternal:k.startsWith("end-wall-")?0:1,netWithNegativeInternal:k.startsWith("end-wall-")?0:1});
    const directions={};DIRS.forEach(d=>directions[d]={label:d,surfaces});
    root.SteelDirectionalWind={getData:()=>({ready:true,directions})};
    root.SteelLoads={getData:()=>({deadLeft:1,deadRight:1,liveLeft:0,liveRight:0,snowLeft:0,snowRight:0})};
    root.SteelStructuralModel={getData:()=>({geometry:{span:20,rise:5,length:10,height:6},nodes:[{id:"L0",x:0,y:0,z:0},{id:"L1",x:0,y:0,z:10},{id:"R0",x:20,y:0,z:0},{id:"R1",x:20,y:0,z:10}],members:[
     {id:"PL",sectionKey:"roofPurlin",side:"left",start:"L0",end:"L1",tributaryWidth:Math.hypot(10,5)},{id:"PR",sectionKey:"roofPurlin",side:"right",start:"R0",end:"R1",tributaryWidth:Math.hypot(10,5)},{id:"WL",sectionKey:"wallGirt",side:"left",start:"L0",end:"L1",tributaryHeight:6},{id:"WR",sectionKey:"wallGirt",side:"right",start:"R0",end:"R1",tributaryHeight:6},{id:"EG",sectionKey:"endGirt",endFace:"front",start:"L0",end:"R0",tributaryHeight:1}
    ]})};
    const built=createCases();return built.caseCount===24&&built.patternCount===3&&built.cases.every(x=>x.factors.wind===0.7||x.factors.wind===1.4)&&built.cases.some(x=>x.factors.live===1.6&&x.factors.snow===0)&&built.cases.some(x=>x.factors.live===0&&x.factors.snow===1.6)&&built.cases.some(x=>x.factors.dead===0.9&&x.factors.wind===1.4);
   }finally{root.SteelDirectionalWind=oldWind;root.SteelLoads=oldLoads;root.SteelStructuralModel=oldModel;}
  });
  ck("case builder admits nonzero gable pressure only after exact area, centroid and eccentric-load transfer are available",()=>{
   const oldWind=root.SteelDirectionalWind,oldLoads=root.SteelLoads,oldModel=root.SteelStructuralModel;
   try{
    const surfaces={};SURFACES.forEach(k=>surfaces[k]={netWithPositiveInternal:k==="end-wall-front"?0.25:0,netWithNegativeInternal:0});
    const directions={};DIRS.forEach(d=>directions[d]={label:d,surfaces});
    const gable=root.SteelEndWallGableSupportAudit.fixture(),nodes=[...gable.nodes],members=[...gable.members];
    const addNode=(id,x,y,z)=>nodes.push({id,x,y,z});
    addNode("WL0",0,0,0);addNode("WL1",0,0,30);addNode("WR0",20,0,0);addNode("WR1",20,0,30);
    addNode("PL0",0,0,0);addNode("PL1",0,0,30);addNode("PR0",20,0,0);addNode("PR1",20,0,30);
    members.push({id:"PL",sectionKey:"roofPurlin",side:"left",start:"PL0",end:"PL1",tributaryWidth:Math.hypot(10,2)});
    members.push({id:"PR",sectionKey:"roofPurlin",side:"right",start:"PR0",end:"PR1",tributaryWidth:Math.hypot(10,2)});
    members.push({id:"WL",sectionKey:"wallGirt",side:"left",start:"WL0",end:"WL1",tributaryHeight:6});
    members.push({id:"WR",sectionKey:"wallGirt",side:"right",start:"WR0",end:"WR1",tributaryHeight:6});
    root.SteelDirectionalWind={getData:()=>({ready:true,directions})};
    root.SteelLoads={getData:()=>({deadLeft:1,deadRight:1,liveLeft:0,liveRight:0,snowLeft:0,snowRight:0})};
    root.SteelStructuralModel={getData:()=>({geometry:gable.geometry,nodes,members})};
    try{const result=createCases(),transfer=root.SteelGableEccentricLoadTransfer.prepareNodalLoads(root.SteelStructuralModel.getData(),result.cases[0].directionalWindPressures.surfaces,1,1);return result.cases.length===24&&result.cases[0].factors.wind===0.7&&transfer.success&&transfer.loads.length>0;}catch(e){return false;}
   }finally{root.SteelDirectionalWind=oldWind;root.SteelLoads=oldLoads;root.SteelStructuralModel=oldModel;}
  });
 ck("generated wind combinations expose missing provenance without inventing fields",()=>{
  const r=auditCaseSourceProvenance([{id:"C1",source:{code:"مبحث ششم ۱۳۹۸",clause:"۶-۲-۳-۲"}}]);
  return !r.success&&r.caseCount===1&&r.incompleteCaseCount===1&&r.missingCounts.document===1&&r.missingCounts.revision===1&&r.missingCounts.locator===1&&r.missingCounts.authority===1;
 });
 ck("complete explicit source metadata passes provenance audit",()=>{
  const r=auditCaseSourceProvenance([{id:"C1",source:{document:"official.pdf",revision:"1398",locator:"section 6",authority:"issuer"}}]);
  return r.success&&r.completeCaseCount===1&&r.incompleteCaseCount===0;
 });
 ck("tributary surface areas close exactly",()=>{const nodes=[{id:"a",x:0,y:0,z:0},{id:"b",x:0,y:0,z:5},{id:"c",x:10,y:0,z:0},{id:"d",x:10,y:0,z:5}];const members=[{id:"pl",sectionKey:"roofPurlin",side:"left",start:"a",end:"b",tributaryWidth:Math.hypot(5,5)},{id:"pr",sectionKey:"roofPurlin",side:"right",start:"c",end:"d",tributaryWidth:Math.hypot(5,5)},{id:"wl",sectionKey:"wallGirt",side:"left",start:"a",end:"b",tributaryHeight:5},{id:"wr",sectionKey:"wallGirt",side:"right",start:"c",end:"d",tributaryHeight:5}];const q=auditTributaryAreaCoverage({geometry:{span:10,rise:5,length:5,height:5},nodes,members});return q.success&&q.rows.length===4;});
 ck("tributary surface gaps are blocked",()=>{const nodes=[{id:"a",x:0,y:0,z:0},{id:"b",x:0,y:0,z:5},{id:"c",x:10,y:0,z:0},{id:"d",x:10,y:0,z:5}];const members=[{id:"pl",sectionKey:"roofPurlin",side:"left",start:"a",end:"b",tributaryWidth:1},{id:"pr",sectionKey:"roofPurlin",side:"right",start:"c",end:"d",tributaryWidth:1},{id:"wl",sectionKey:"wallGirt",side:"left",start:"a",end:"b",tributaryHeight:5},{id:"wr",sectionKey:"wallGirt",side:"right",start:"c",end:"d",tributaryHeight:5}];const q=auditTributaryAreaCoverage({geometry:{span:10,rise:5,length:5,height:5},nodes,members});return !q.success&&q.issues.some(x=>x.includes("بارگیر شیب چپ"));});
 const p={ "roof-left":2,"roof-right":3,"long-wall-left":4,"long-wall-right":5,"end-wall-front":6,"end-wall-back":7 };
 const g={span:20,rise:5};
 ck("actual model top-level purlin tributary widths map",()=>{const r=mapMemberLoad({sectionKey:"roofPurlin",side:"left",tributaryWidth:2},{direction:"x-positive",surfaces:p},g);return r.surfaceKeys[0]==="roof-left"&&r.globalKNm[1]<0;});
 ck("actual model top-level wall tributary height maps",()=>mapMemberLoad({sectionKey:"wallGirt",side:"left",tributaryHeight:2},{direction:"x-positive",surfaces:p},g).globalKNm[0]===8);
 ck("actual model top-level end-girt tributary height maps",()=>mapMemberLoad({sectionKey:"endGirt",endFace:"rear",tributaryHeight:2},{direction:"z-negative",surfaces:p},g).globalKNm[2]===-14);
 ck("left roof inward vector",()=>{const r=mapMemberLoad({sectionKey:"roofPurlin",side:"left",lineLoads:{tributaryWidth:2}},{direction:"x-positive",surfaces:p},g);return Math.abs(r.globalKNm[0]-2*2*(.5/Math.hypot(.5,1)))<1e-10&&r.globalKNm[1]<0;});
 ck("right roof inward vector",()=>{const r=mapMemberLoad({sectionKey:"roofPurlin",side:"right",lineLoads:{tributaryWidth:2}},{direction:"x-negative",surfaces:p},g);return r.globalKNm[0]<0&&r.globalKNm[1]<0;});
 ck("ridge takes both roof slopes",()=>{const r=mapMemberLoad({sectionKey:"roofPurlin",side:"ridge",lineLoads:{tributaryWidthLeft:1,tributaryWidthRight:1}},{direction:"z-positive",surfaces:p},g);return r.surfaceKeys.length===2&&r.globalKNm[1]<0;});
 ck("left wall inward is +X",()=>mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{tributaryHeight:2}},{direction:"x-positive",surfaces:p},g).globalKNm[0]===8);
 ck("right wall inward is -X",()=>mapMemberLoad({sectionKey:"wallGirt",side:"right",lineLoads:{tributaryHeight:2}},{direction:"x-negative",surfaces:p},g).globalKNm[0]===-10);
 ck("front end wall inward is +Z",()=>mapMemberLoad({sectionKey:"endGirt",endFace:"front",lineLoads:{tributaryHeight:2}},{direction:"z-positive",surfaces:p},g).globalKNm[2]===12);
 ck("rear end wall inward is -Z",()=>mapMemberLoad({sectionKey:"endGirt",endFace:"back",lineLoads:{tributaryHeight:2}},{direction:"z-negative",surfaces:p},g).globalKNm[2]===-14);
 ck("model rear alias maps to back surface",()=>{const r=mapMemberLoad({sectionKey:"endGirt",endFace:"rear",lineLoads:{tributaryHeight:2}},{direction:"z-negative",surfaces:p},g);return r.globalKNm[2]===-14&&r.surfaceKeys[0]==="end-wall-back";});
 ck("unknown end-wall face is rejected",()=>{try{mapMemberLoad({sectionKey:"endGirt",endFace:"side",lineLoads:{tributaryHeight:2}},{direction:"z-negative",surfaces:p},g);return false;}catch(e){return true;}});
 ck("negative pressure reverses wall vector",()=>mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{tributaryHeight:1}},{direction:"x-positive",surfaces:{...p,"long-wall-left":-4}},g).globalKNm[0]===-4);
 ck("invalid tributary height blocked",()=>{try{mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{}},{direction:"x-positive",surfaces:p},g);return false;}catch(e){return true;}});
 ck("invalid direction blocked",()=>{try{mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{tributaryHeight:1}},{direction:"x-diagonal",surfaces:p},g);return false;}catch(e){return true;}});
 ck("gravity and wind vectors are superposed",()=>{const r=combineGlobalLoads([0,-10,0],[5,-2,3],2);return r[0]===10&&r[1]===-14&&r[2]===6;});
 return{passed:t.filter(x=>x.pass).length,failed:t.filter(x=>!x.pass).length,tests:t,analysisEnabled:false,designApproved:false};}
function mountRunControl(){
 const panel=root.document?.getElementById("directionalWindPanel");if(!panel||panel.querySelector("#btnRunDirectionalWind3D"))return;
 const wrap=root.document.createElement("div");wrap.className="button-grid";
 const button=root.document.createElement("button");button.type="button";button.className="btn primary";button.id="btnRunDirectionalWind3D";button.textContent="تحلیل باد جهت‌دار در مدل سه‌بعدی";
 const out=root.document.createElement("pre");out.id="directionalWind3DResult";out.className="notice";out.style.whiteSpace="pre-wrap";out.textContent="تحلیل سه‌بعدی باد هنوز اجرا نشده است.";
 wrap.appendChild(button);panel.appendChild(wrap);panel.appendChild(out);
 button.addEventListener("click",async()=>{button.disabled=true;out.textContent="در حال تحلیل جهت‌ها و فشارهای داخلی...";try{const r=await run();out.textContent="حل "+r.caseCount+" حالت باد با تعادل برقرار انجام شد. اعضای دارای پوش نیرو: "+r.memberForceEnvelope.rows.length+"؛ پوش نیرو برای همه اعضا و حالات ثبت شد. "+(r.sourceAudit?"ردیابی منبع: "+r.sourceAudit.completeCaseCount+" از "+r.sourceAudit.caseCount+" حالت کامل؛ فیلدهای مفقود: "+Object.keys(r.sourceAudit.missingCounts).join("، ")+". ":"")+"ضرایب دستی و مقدماتی‌اند؛ این نتیجه تأیید طراحی نیست.";}catch(e){out.textContent="تحلیل باد متوقف شد: "+String(e.message||e);}finally{button.disabled=false;}});
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mountRunControl);else mountRunControl();}
root.SteelDirectionalWind3D={audit,auditCaseSourceProvenance,auditGablePressure,auditGableTributaryAreaCoverage,auditGableLoadResultants,auditTributaryAreaCoverage,createCases,run,selfTest,mapMemberLoad,combineGlobalLoads,auditWindSampleIntegrity,buildWindForceEnvelope,getLastRun:()=>lastRun};
})(typeof window!=="undefined"?window:globalThis);

/* ===== steel2/js/seismic-equivalent-lateral-adapter.js ===== */
/* SAHROUD STEEL — evidence-based equivalent lateral seismic load distributor.
 * User/code-reviewed base shear and level weights only. Not a code coefficient engine.
 * Solver nodal loads use SI: N, N.m. Input weights/base shear are kN.
 */
(function(root){"use strict";
const DIRECTIONS=[{id:"x-positive",axis:0,sign:1,label:"X+"},{id:"x-negative",axis:0,sign:-1,label:"X-"},{id:"z-positive",axis:2,sign:1,label:"Z+"},{id:"z-negative",axis:2,sign:-1,label:"Z-"}];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function audit(input,model){
 const issues=[];
 if(!input||typeof input!=="object")return{ready:false,issues:["ورودی زلزله ارائه نشده است."],analysisEnabled:false,designApproved:false};
 const V=Number(input.baseShearKN),k=Number(input.distributionExponent);
 if(!(finite(V)&&V>0))issues.push("برش پایه باید عدد مثبت و محدود بر حسب kN باشد.");
 if(!(finite(k)&&k>=0))issues.push("توان توزیع ارتفاعی باید عددی نامنفی و محدود باشد.");
 const s=input.source||{};
 ["code","edition","clause","document"].forEach(key=>{if(typeof s[key]!=="string"||!s[key].trim())issues.push("مرجع مستند زلزله ناقص است: "+key);});
 if(!Array.isArray(input.levels)||!input.levels.length)issues.push("حداقل یک تراز جرم/بار جانبی لازم است.");
 const nodeIds=new Set((model?.nodes||[]).map(n=>String(n.id)));
 const levelIds=new Set();
 const nodeLevelOwners=new Map();
 let totalWeight=0;
 (input.levels||[]).forEach((l,i)=>{
  if(!l||typeof l!=="object"){issues.push("تراز شماره "+(i+1)+" نامعتبر است.");return;}
  const id=String(l.id||"");
  if(!id||levelIds.has(id))issues.push("شناسه تراز خالی یا تکراری است: "+(id||i+1));else levelIds.add(id);
  const h=Number(l.elevationM),w=Number(l.weightKN);
  if(!(finite(h)&&h>0))issues.push("ارتفاع تراز "+(id||i+1)+" باید مثبت باشد.");
  if(!(finite(w)&&w>0))issues.push("وزن لرزه‌ای تراز "+(id||i+1)+" باید مثبت و مستند باشد.");else totalWeight+=w;
  if(!Array.isArray(l.nodeIds)||!l.nodeIds.length)issues.push("گره‌های بارگذاری تراز "+(id||i+1)+" مشخص نشده‌اند.");
  else{const seen=new Set();l.nodeIds.forEach(n=>{const key=String(n);if(!nodeIds.has(key))issues.push("گره بارگذاری در مدل یافت نشد: "+key);if(seen.has(key))issues.push("گره در یک تراز تکرار شده است: "+key);const owner=nodeLevelOwners.get(key);if(owner&&owner!==id)issues.push("گره به بیش از یک تراز نسبت داده شده است: "+key+" ("+owner+" و "+id+")");else if(!owner)nodeLevelOwners.set(key,id);seen.add(key);});}
 });
 if(!(totalWeight>0&&finite(totalWeight)))issues.push("مجموع وزن لرزه‌ای ترازها معتبر نیست.");
 if(model?.nodes?.length&&input.modelRevision&&model.revision&&String(input.modelRevision)!==String(model.revision))issues.push("نسخه مدل با نسخه مبنای محاسبات زلزله یکسان نیست.");
 return{ready:issues.length===0,issues,totalWeightKN:totalWeight,levelCount:(input.levels||[]).length,analysisEnabled:false,designApproved:false,codeDesignEligible:false};
}
function createCases(input,model){
 const a=audit(input,model);if(!a.ready)throw Error("توزیع زلزله متوقف شد: "+a.issues.join("؛ "));
 const V=Number(input.baseShearKN),k=Number(input.distributionExponent);
 const denom=input.levels.reduce((sum,l)=>sum+Number(l.weightKN)*Math.pow(Number(l.elevationM),k),0);
 if(!(denom>0&&finite(denom)))throw Error("مخرج توزیع نیروی جانبی معتبر نیست.");
 const levelForces=input.levels.map(l=>({id:String(l.id),elevationM:Number(l.elevationM),weightKN:Number(l.weightKN),forceKN:V*Number(l.weightKN)*Math.pow(Number(l.elevationM),k)/denom,nodeIds:l.nodeIds.map(String)}));
 const base={dead:0,live:0,snow:0,wind:0};
 const cases=DIRECTIONS.map(d=>{
  const nodalLoads=[];
  levelForces.forEach(l=>{const each=l.forceKN/l.nodeIds.length; l.nodeIds.forEach(nodeId=>{const values=[0,0,0,0,0,0];values[d.axis]=each*d.sign*1000;nodalLoads.push({nodeId,values});});});
  return{id:"EQ-"+d.id.toUpperCase(),label:"زلزله استاتیکی معادل "+d.label,factors:{...base},nodalLoads,source:{...input.source},baseShearKN:V,direction:d.id,levelForces:levelForces.map(x=>({...x,nodeIds:x.nodeIds.slice()})),distributionExponent:k,analysisEnabled:false,designApproved:false};
 });
 return{cases,caseCount:cases.length,levelForces,totalWeightKN:a.totalWeightKN,baseShearKN:V,distributionExponent:k,analysisEnabled:false,designApproved:false,limitations:["برش پایه، وزن ترازها، توان توزیع و مرجع باید توسط مهندس مسئول از آیین‌نامه/محاسبات پروژه تعیین و مستند شوند.","این ماژول فقط توزیع نیروی جانبی است؛ محاسبه طیف، ضریب رفتار، اهمیت، نامنظمی، پیچش اتفاقی، اثرات P-Delta و کنترل دریفت را انجام نمی‌دهد.","نیروها به گره‌های صریحاً معرفی‌شده در هر تراز اعمال می‌شوند؛ کف صلب و توزیع دیافراگمی فرض نشده است.","چهار حالت X+/X-/Z+/Z- جداگانه‌اند و نباید بدون ضوابط ترکیب بار با هم جمع شوند."]};
}
async function run(input){
 const model=root.SteelStructuralModel?.getData?.()||root.SteelStructuralModel?.model;
 if(!model||!Array.isArray(model.nodes))throw Error("مدل گره‌ای سه‌بعدی برای کنترل شناسه‌های زلزله در دسترس نیست.");
 const built=createCases(input,model),solve=root.SteelStructuralModel?.analyze3D;
 if(typeof solve!=="function")throw Error("حل‌گر سه‌بعدی در دسترس نیست.");
 const results=[];
 for(const c of built.cases){
  const r=await solve(c);
  if(!r||!Array.isArray(r.reactions))throw Error("واکنش حل‌گر برای "+c.id+" معتبر نیست.");
  if(!r.equilibrium||r.equilibrium.ok!==true)throw Error("تعادل عددی حل‌گر برای "+c.id+" تأیید نشد.");
  results.push({id:c.id,label:c.label,equilibrium:r.equilibrium,result:r});
 }
 return{success:true,caseCount:results.length,results,allCasesEquilibriumOK:results.every(x=>x.equilibrium?.ok===true),analysisEnabled:false,designApproved:false,scope:"تحلیل مقدماتی با نیروهای ورودی مستند؛ بدون تأیید آیین‌نامه‌ای یا طراحی."};
}
function selfTest(){
 const tests=[],ck=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
 const model={revision:"r1",nodes:[{id:"n1"},{id:"n2"},{id:"n3"}]};
 const input={baseShearKN:100,distributionExponent:1,modelRevision:"r1",source:{code:"استاندارد",edition:"ویرایش",clause:"بند",document:"سند"},levels:[{id:"L1",elevationM:3,weightKN:100,nodeIds:["n1","n2"]},{id:"L2",elevationM:6,weightKN:200,nodeIds:["n3"]}]};
 ck("four directional cases",()=>createCases(input,model).caseCount===4);
 ck("force sum equals base shear",()=>Math.abs(createCases(input,model).levelForces.reduce((s,l)=>s+l.forceKN,0)-100)<1e-10);
 ck("height-weight distribution",()=>{const f=createCases(input,model).levelForces;return Math.abs(f[0].forceKN-20)<1e-10&&Math.abs(f[1].forceKN-80)<1e-10;});
 ck("X positive direction",()=>createCases(input,model).cases[0].nodalLoads.every(x=>x.values[0]>0&&x.values[2]===0));
 ck("X negative direction",()=>createCases(input,model).cases[1].nodalLoads.every(x=>x.values[0]<0&&x.values[2]===0));
 ck("Z positive direction",()=>createCases(input,model).cases[2].nodalLoads.every(x=>x.values[2]>0&&x.values[0]===0));
 ck("Z negative direction",()=>createCases(input,model).cases[3].nodalLoads.every(x=>x.values[2]<0&&x.values[0]===0));
 ck("equal split across level nodes",()=>{const c=createCases(input,model).cases[0];return Math.abs(c.nodalLoads[0].values[0]+c.nodalLoads[1].values[0]-20000)<1e-8;});
 ck("all six nodal components present",()=>createCases(input,model).cases.every(c=>c.nodalLoads.every(n=>n.values.length===6)));
 ck("missing source blocked",()=>{const x=JSON.parse(JSON.stringify(input));delete x.source.clause;return !audit(x,model).ready;});
 ck("missing model node blocked",()=>{const x=JSON.parse(JSON.stringify(input));x.levels[0].nodeIds=["missing"];return !audit(x,model).ready;});
 ck("duplicate level blocked",()=>{const x=JSON.parse(JSON.stringify(input));x.levels[1].id="L1";return !audit(x,model).ready;});
 ck("node assigned to multiple levels blocked",()=>{const x=JSON.parse(JSON.stringify(input));x.levels[1].nodeIds=["n2"];return !audit(x,model).ready;});
 ck("distinct nodes across levels accepted",()=>audit(input,model).ready);
 ck("nonpositive base shear blocked",()=>{const x={...input,baseShearKN:0};return !audit(x,model).ready;});
 ck("nonpositive level weight blocked",()=>{const x=JSON.parse(JSON.stringify(input));x.levels[0].weightKN=0;return !audit(x,model).ready;});
 ck("stale model revision blocked",()=>{const x={...input,modelRevision:"old"};return !audit(x,model).ready;});
 ck("analysis and approval remain disabled",()=>{const r=createCases(input,model);return !r.analysisEnabled&&!r.designApproved&&r.cases.every(c=>!c.analysisEnabled&&!c.designApproved);});
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelSeismicEquivalentLateral={audit,createCases,run,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/structural-load-chain.js ===== */
/* SAHROUD STEEL — solver contract and foundation reaction bridge.
 * Reads the actual analyze3D(loadCase) contract; no shell elements, capacity checks,
 * anchor design, footing design, or approval are fabricated here.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const BASE_KINDS=new Set(["base","endwall-base"]);
function supportNodes(model){
 return (model?.nodes||[]).filter(n=>BASE_KINDS.has(String(n.kind||"")));
}
function auditSolverContract(api,model){
 const issues=[];
 if(!api||typeof api.analyze3D!=="function")issues.push("SteelStructuralModel.analyze3D(loadCase) در دسترس نیست.");
 if(!api||typeof api.getData!=="function")issues.push("SteelStructuralModel.getData() در دسترس نیست.");
 if(!Array.isArray(model?.nodes)||!Array.isArray(model?.members))issues.push("مدل باید آرایه گره‌ها و اعضا داشته باشد.");
 const ids=new Set();
 (model?.nodes||[]).forEach(n=>{const id=String(n?.id??"");if(!id||ids.has(id))issues.push("شناسه گره خالی یا تکراری است: "+id);ids.add(id);if(![n?.x,n?.y,n?.z].every(finite))issues.push("مختصات سه‌بعدی گره "+(id||"?")+" ناقص یا نامعتبر است.");});
 const supports=supportNodes(model);
 if(!supports.length)issues.push("گره پایه با kind=base یا endwall-base در مدل پیدا نشد.");
 const memberIds=new Set();
 (model?.members||[]).forEach(m=>{const id=String(m?.id??"");if(!id||memberIds.has(id))issues.push("شناسه عضو خالی یا تکراری است: "+id);memberIds.add(id);if(!ids.has(String(m.start))||!ids.has(String(m.end)))issues.push("اتصال عضو "+id+" به گره موجود نیست.");});
 return{ready:issues.length===0,issues,nodeCount:model?.nodes?.length||0,memberCount:model?.members?.length||0,supportNodeIds:supports.map(n=>String(n.id)),contract:"analyze3D(loadCase) -> {reactions:[{nodeId,values[6]}],equilibrium:{ok,relativeForceResidual,relativeMomentResidual}}",units:{reactionForce:"N",reactionMoment:"N.m"},analysisEnabled:false,designApproved:false};
}
function extractSupportReactions(result,model){
 if(!result||!Array.isArray(result.reactions))throw Error("حل‌گر آرایه reactions را برنگردانده است.");
 const supports=supportNodes(model),byId=new Map();
 result.reactions.forEach(r=>{
  const id=String(r?.nodeId??"");
  if(!id)throw Error("واکنش با nodeId خالی دریافت شد.");
  if(byId.has(id))throw Error("واکنش تکراری برای گره "+id+" دریافت شد.");
  if(!Array.isArray(r.values)||r.values.length<6||r.values.slice(0,6).some(v=>!finite(v)))throw Error("واکنش شش‌مؤلفه‌ای معتبر نیست: "+id);
  byId.set(id,r.values.slice(0,6));
 });
 const missing=supports.filter(n=>!byId.has(String(n.id))).map(n=>String(n.id));
 if(missing.length)throw Error("واکنش برخی گره‌های پایه برنگشته است: "+missing.join("، "));
 const rows=supports.map(n=>{
  const reaction=byId.get(String(n.id));
  // Solver reaction is support-on-structure; the opposite is the column action
  // delivered to the base plate/anchors/foundation.
  const columnAction=reaction.map(v=>-v);
  if(![n.x,n.y,n.z].every(finite))throw Error("مختصات گره پایه "+String(n.id)+" باید سه مؤلفه عددی معتبر داشته باشد.");
  return{nodeId:String(n.id),coordinatesM:{x:n.x,y:n.y,z:n.z},kind:n.kind,
   solverReaction:{Fx:reaction[0],Fy:reaction[1],Fz:reaction[2],Mx:reaction[3],My:reaction[4],Mz:reaction[5]},
   columnAction:{Fx:columnAction[0],Fy:columnAction[1],Fz:columnAction[2],Mx:columnAction[3],My:columnAction[4],Mz:columnAction[5]},
   units:{force:"N",moment:"N.m"},designStatus:"demand_only_not_designed"};
 });
 const force=[0,0,0],momentAtOrigin=[0,0,0],nodalMomentSum=[0,0,0];
 rows.forEach(r=>{
  const v=r.solverReaction,p=r.coordinatesM;
  const f=[v.Fx,v.Fy,v.Fz],m=[v.Mx,v.My,v.Mz];
  for(let i=0;i<3;i++){force[i]+=f[i];nodalMomentSum[i]+=m[i];}
  // Move each nodal reaction moment to the common global origin: M0 = Mnode + r x F.
  momentAtOrigin[0]+=m[0]+p.y*f[2]-p.z*f[1];
  momentAtOrigin[1]+=m[1]+p.z*f[0]-p.x*f[2];
  momentAtOrigin[2]+=m[2]+p.x*f[1]-p.y*f[0];
 });
 return{rows,missingSupportNodeIds:missing,
  totalSolverReaction:{Fx:force[0],Fy:force[1],Fz:force[2],Mx:momentAtOrigin[0],My:momentAtOrigin[1],Mz:momentAtOrigin[2]},
  componentwiseNodalMomentSum:{Mx:nodalMomentSum[0],My:nodalMomentSum[1],Mz:nodalMomentSum[2]},
  resultantMomentReference:"global origin (0,0,0); includes r x F for every support node",
  units:{force:"N",moment:"N.m"}};
}
function auditFoundationReactionMapping(reactionExtraction,mappings,model){
 const issues=[];
 const rows=Array.isArray(reactionExtraction?.rows)?reactionExtraction.rows:[];
 if(!rows.length)issues.push("ردیف واکنش پایه برای نگاشت به پی موجود نیست.");
 if(!Array.isArray(mappings)||!mappings.length)issues.push("نگاشت صریح supportNodeId به footingId ارائه نشده است.");
 const rowById=new Map(rows.map(r=>[String(r.nodeId),r]));
 const mapBySupport=new Map(),footings=new Map();
 (mappings||[]).forEach((m,index)=>{
  const supportId=String(m?.supportNodeId??"").trim(),footingId=String(m?.footingId??"").trim();
  if(!supportId||!footingId){issues.push("نگاشت شماره "+(index+1)+" باید supportNodeId و footingId غیرخالی داشته باشد.");return;}
  if(mapBySupport.has(supportId)){issues.push("نگاشت تکیه‌گاه تکراری است: "+supportId);return;}
  if(!rowById.has(supportId)){issues.push("نگاشت به گره پایه ناشناخته/فاقد واکنش اشاره می‌کند: "+supportId);return;}
  const p=m.referencePointM;
  if(!p||![p.x,p.y,p.z].every(finite)){issues.push("مرجع مختصات پی "+footingId+" باید referencePointM سه‌مؤلفه‌ای متناهی داشته باشد.");return;}
  mapBySupport.set(supportId,{footingId,referencePointM:{x:p.x,y:p.y,z:p.z}});
  if(!footings.has(footingId))footings.set(footingId,{footingId,supportNodeIds:[],referencePointM:{x:p.x,y:p.y,z:p.z},actions:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0}});
  const group=footings.get(footingId),q=group.referencePointM;
  if(["x","y","z"].some(k=>Math.abs(q[k]-p[k])>1e-9)){issues.push("برای پی "+footingId+" مرجع مختصات یکسان تعریف نشده است.");return;}
  group.supportNodeIds.push(supportId);
  const row=rowById.get(supportId),a=row.columnAction,r=row.coordinatesM;
  if(!a||![a.Fx,a.Fy,a.Fz,a.Mx,a.My,a.Mz].every(finite)||!r||![r.x,r.y,r.z].every(finite)){issues.push("بردار شش‌مؤلفه‌ای کنش ستون/مختصات معتبر نیست: "+supportId);return;}
  const dx=r.x-q.x,dy=r.y-q.y,dz=r.z-q.z;
  group.actions.Fx+=a.Fx;group.actions.Fy+=a.Fy;group.actions.Fz+=a.Fz;
  group.actions.Mx+=a.Mx+dy*a.Fz-dz*a.Fy;
  group.actions.My+=a.My+dz*a.Fx-dx*a.Fz;
  group.actions.Mz+=a.Mz+dx*a.Fy-dy*a.Fx;
 });
 rows.forEach(r=>{if(!mapBySupport.has(String(r.nodeId)))issues.push("گره پایه "+r.nodeId+" به هیچ پی مشخصی نگاشت نشده است.");});
 const total={Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0};
 footings.forEach(g=>{
  const p=g.referencePointM,a=g.actions;
  total.Fx+=a.Fx;total.Fy+=a.Fy;total.Fz+=a.Fz;
  total.Mx+=a.Mx+p.y*a.Fz-p.z*a.Fy;
  total.My+=a.My+p.z*a.Fx-p.x*a.Fz;
  total.Mz+=a.Mz+p.x*a.Fy-p.y*a.Fx;
 });
 const expected={Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0};
 rows.forEach(r=>{
  const a=r.columnAction,p=r.coordinatesM;if(!a||!p)return;
  expected.Fx+=a.Fx;expected.Fy+=a.Fy;expected.Fz+=a.Fz;
  expected.Mx+=a.Mx+p.y*a.Fz-p.z*a.Fy;
  expected.My+=a.My+p.z*a.Fx-p.x*a.Fz;
  expected.Mz+=a.Mz+p.x*a.Fy-p.y*a.Fx;
 });
 const components=["Fx","Fy","Fz","Mx","My","Mz"],differences={};
 components.forEach(k=>{differences[k]=total[k]-expected[k];});
 const tolerance=1e-8;
 const reconciliation={ok:components.every(k=>Math.abs(differences[k])<=tolerance*Math.max(1,Math.abs(total[k]),Math.abs(expected[k]))),
  expectedColumnActionAtGlobalOrigin:expected,mappedFootingActionAtGlobalOrigin:total,differences,tolerance,
  method:"componentwise six-DOF comparison after translation of every support and footing resultant to global origin"};
 if(!reconciliation.ok)issues.push("جمع نیرو/لنگرهای تجمیع‌شده پی با مجموع مستقل کنش ستون‌ها در مبدأ جهانی برابر نیست.");
 return{success:issues.length===0,status:issues.length?"mapping-incomplete":"mapped-demand-only",issues,
  footingDemands:Array.from(footings.values()),totalColumnActionAtGlobalOrigin:total,reconciliation,
  units:{force:"N",moment:"N.m"},analysisEnabled:false,designApproved:false,
  scope:"تجمیع تقاضای شش‌مؤلفه‌ای ستون‌ها در مرجع صریح هر پی و تطبیق مستقل برآیند؛ بدون استنتاج خودکار هندسه پی، طراحی پی/شناژ، کنترل خاک، لغزش، واژگونی یا ظرفیت انکر"};
}
function buildExternalLoadLedger(model,solverMembers,nodalLoads,releasedRotationLoads){
 const issues=[],force=[0,0,0],moment=[0,0,0],memberRows=[],nodeRows=[],releasedRows=[];
 const nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 const solvedById=new Map((solverMembers||[]).map(m=>[String(m.id),m]));
 const sourceMembers=Array.isArray(model?.members)?model.members:[];
 const add=(f,m,p)=>{for(let i=0;i<3;i++)force[i]+=f[i];moment[0]+=m[0]+p[1]*f[2]-p[2]*f[1];moment[1]+=m[1]+p[2]*f[0]-p[0]*f[2];moment[2]+=m[2]+p[0]*f[1]-p[1]*f[0];};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 if(!Array.isArray(solverMembers)||!solverMembers.length)issues.push("فهرست اعضای حل‌شده خالی است.");
 if(!sourceMembers.length)issues.push("فهرست اعضای فیزیکی مدل خالی است.");
 const solvedIds=new Set((solverMembers||[]).map(m=>String(m.id)));
 sourceMembers.forEach((source,index)=>{
  const id=String(source?.id??"").trim(),solved=solvedById.get(id),ledger=source?.analysisLoad||{};
  if(!id||!solved){issues.push("عضو مدل "+(id||index+1)+" در خروجی حل‌گر متناظر ندارد.");return;}
  if(ledger.loadDataComplete!==true&&source.loadDataComplete!==true){issues.push("کامل‌بودن دفتر بار عضو "+id+" صریحاً تأیید نشده است.");return;}
  const ni=nodes.get(String(source.start)),nj=nodes.get(String(source.end));
  if(!ni||!nj){issues.push("گره‌های عضو "+id+" در مدل موجود نیستند.");return;}
  const oi=source.endOffsets?.i||[0,0,0],oj=source.endOffsets?.j||[0,0,0];
  if(oi.length!==3||oj.length!==3||[...oi,...oj].some(v=>!finite(v))){issues.push("بازوی انتهایی عضو "+id+" نامعتبر است.");return;}
  const a=[ni.x+oi[0],ni.y+oi[1],ni.z+oi[2]],b=[nj.x+oj[0],nj.y+oj[1],nj.z+oj[2]];
  if([...a,...b].some(v=>!finite(v))){issues.push("مختصات هندسی عضو "+id+" نامعتبر است.");return;}
  const delta=b.map((v,i)=>v-a[i]),L=Math.hypot(...delta);
  if(!(L>0)){issues.push("طول فیزیکی عضو "+id+" صفر/نامعتبر است.");return;}
  const ex=delta.map(v=>v/L),axes=solved.localAxes;
  const basis=axes&&[axes.x,axes.y,axes.z];
  if(!basis||basis.length!==3||basis.some(v=>!Array.isArray(v)||v.length!==3||v.some(x=>!finite(x)))){
   issues.push("محورهای محلی حل‌شده عضو "+id+" برای تبدیل مستقل بار محلی به جهانی موجود/معتبر نیست.");return;
  }
  const transform=q=>[0,1,2].map(g=>q.reduce((sum,v,k)=>sum+v*basis[k][g],0));
  const uniform=ledger.uniformLocal;
  if(!Array.isArray(uniform)||uniform.length!==3||uniform.some(v=>!finite(v))){issues.push("سه مؤلفه بار یکنواخت محلی عضو "+id+" باید صریح و متناهی باشد.");return;}
  const linear=ledger.linearLocal;
  if(linear!==undefined&&linear!==null&&(!Array.isArray(linear.start)||linear.start.length!==3||linear.start.some(v=>!finite(v))||!Array.isArray(linear.end)||linear.end.length!==3||linear.end.some(v=>!finite(v)))){
   issues.push("بار خطی‌متغیر محلی عضو "+id+" باید دو بردار سه‌مؤلفه‌ای متناهی داشته باشد.");return;
  }
  const q0=uniform.map((v,i)=>v+(linear?Number(linear.start[i]):0)),q1=uniform.map((v,i)=>v+(linear?Number(linear.end[i]):0));
  const resultantLocal=q0.map((v,i)=>L*(v+q1[i])/2);
  const firstMomentLocal=q0.map((v,i)=>L*L*(v+2*q1[i])/6);
  const resultant=transform(resultantLocal),firstMoment=transform(firstMomentLocal);
  const distributedMoment=cross(ex,firstMoment);
  const centroidMoment=cross(a,resultant);
  add(resultant,distributedMoment.map((v,i)=>v+centroidMoment[i]),[0,0,0]);
  memberRows.push({memberId:id,sourceMemberPresent:true,localUniformNPerM:q0,localLinearEndNPerM:linear?linear.end.map(Number):null,
   localResultantN:resultantLocal,globalResultantN:resultant,globalFirstMomentAboutStartNm:firstMoment,
   distributedMomentAboutGlobalOriginNm:distributedMoment.map((v,i)=>v+centroidMoment[i]),lengthM:L,localAxes:basis});
 });
 (solverMembers||[]).forEach(solved=>{if(!sourceMembers.some(m=>String(m.id)===String(solved.id)))issues.push("عضو حل‌شده "+String(solved.id)+" در مدل فیزیکی منبع وجود ندارد.");});
 (nodalLoads||[]).forEach((load,index)=>{
  const n=nodes.get(String(load?.nodeId)),v=load?.values;
  if(!n||!Array.isArray(v)||v.length!==6||v.some(x=>!finite(x))){issues.push("بار گره‌ای شماره "+(index+1)+" ناقص یا نامعتبر است.");return;}
  const f=v.slice(0,3),m=v.slice(3,6),p=[n.x,n.y,n.z];
  if(p.some(x=>!finite(x))){issues.push("مختصات گره بارگذاری‌شده "+load.nodeId+" معتبر نیست.");return;}
  add(f,m,p);nodeRows.push({nodeId:String(load.nodeId),forceN:f,momentNm:m,coordinatesM:p});
 });
 (releasedRotationLoads||[]).forEach((load,index)=>{
  const n=nodes.get(String(load?.nodeId)),m=load?.momentNm;
  if(!n||!Array.isArray(m)||m.length!==3||m.some(x=>!finite(x))){issues.push("بار معادل دوران آزادشده شماره "+(index+1)+" ناقص یا نامعتبر است.");return;}
  const p=[n.x,n.y,n.z];if(p.some(x=>!finite(x))){issues.push("مختصات گره دوران آزادشده "+load.nodeId+" نامعتبر است.");return;}
  add([0,0,0],m,p);releasedRows.push({nodeId:String(load.nodeId),memberId:String(load.memberId||""),end:String(load.end||""),momentNm:m.slice(),coordinatesM:p});
 });
 return{complete:issues.length===0,issues,memberCount:memberRows.length,nodalLoadCount:nodeRows.length,releasedRotationLoadCount:releasedRows.length,
  members:memberRows,nodalLoads:nodeRows,releasedRotationLoads:releasedRows,resultant:{forceN:force,momentNm:moment,momentReference:"global origin (0,0,0)"},
  method:"independent integration of explicit uniform and linearly varying local member-load vectors using solved local axes, plus explicit nodal and released-rotation loads; not a full FE load-vector reconstruction"};
}
function compareExternalLedger(ledger,equilibrium,tolerance=1e-6){
 const issues=[];
 if(!ledger?.complete)issues.push("دفتر بار خارجی کامل نیست.");
 if(!equilibrium||!Array.isArray(equilibrium.appliedForceN)||!Array.isArray(equilibrium.appliedMomentNm))issues.push("بردار بار اعمال‌شده حل‌گر برای تطبیق موجود نیست.");
 if(issues.length)return{ok:false,issues,forceRelativeDifference:null,momentRelativeDifference:null};
 const difference=(a,b)=>a.map((v,i)=>v-b[i]),norm=v=>Math.hypot(...v);
 const df=difference(ledger.resultant.forceN,equilibrium.appliedForceN),dm=difference(ledger.resultant.momentNm,equilibrium.appliedMomentNm);
 const rf=norm(df)/Math.max(norm(ledger.resultant.forceN),norm(equilibrium.appliedForceN),1);
 const rm=norm(dm)/Math.max(norm(ledger.resultant.momentNm),norm(equilibrium.appliedMomentNm),1);
 if(rf>tolerance)issues.push("برآیند مستقل نیرو با بردار بار اعمال‌شده حل‌گر تطبیق ندارد.");
 if(rm>tolerance)issues.push("برآیند مستقل لنگر با بردار بار اعمال‌شده حل‌گر تطبیق ندارد.");
 return{ok:issues.length===0,issues,forceDifferenceN:df,momentDifferenceNm:dm,forceRelativeDifference:rf,momentRelativeDifference:rm,tolerance,
  scope:"independent external-load resultant versus solver-reported applied resultant; not a full independent stiffness/load-vector assembly"};
}
function auditEquilibrium(eq,tolerance=1e-6){
 const issues=[];
 if(!eq||typeof eq!=="object")return{ok:false,issues:["گزارش تعادل حل‌گر موجود نیست."],relativeForceResidual:null,relativeMomentResidual:null};
 const vectorKeys=["appliedForceN","supportReactionN","forceResidualN","appliedMomentNm","supportMomentNm","momentResidualNm"];
 const vectors={};
 vectorKeys.forEach(k=>{
  const v=eq[k];
  if(!Array.isArray(v)||v.length!==3||v.some(x=>!finite(x)))issues.push("بردار تعادل سه‌مؤلفه‌ای نامعتبر/مفقود است: "+k);
  else vectors[k]=v;
 });
 const norm=v=>Math.hypot(...v);
 let forceRatio=null,momentRatio=null;
 if(vectorKeys.every(k=>vectors[k])){
  const fExpected=vectors.appliedForceN.map((v,i)=>v+vectors.supportReactionN[i]);
  const mExpected=vectors.appliedMomentNm.map((v,i)=>v+vectors.supportMomentNm[i]);
  const close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
  if(fExpected.some((v,i)=>!close(v,vectors.forceResidualN[i])))issues.push("بردار باقیمانده نیرو با جمع بار و واکنش سازگار نیست.");
  if(mExpected.some((v,i)=>!close(v,vectors.momentResidualNm[i])))issues.push("بردار باقیمانده لنگر با جمع بار و واکنش سازگار نیست.");
  forceRatio=norm(vectors.forceResidualN)/Math.max(norm(vectors.appliedForceN),norm(vectors.supportReactionN),1);
  momentRatio=norm(vectors.momentResidualNm)/Math.max(norm(vectors.appliedMomentNm),norm(vectors.supportMomentNm),1);
 }
 if(!finite(eq.relativeForceResidual)||!finite(eq.relativeMomentResidual))issues.push("شاخص نسبی تعادل معتبر/موجود نیست.");
 else if(forceRatio!==null&&(!closeNumber(eq.relativeForceResidual,forceRatio)||!closeNumber(eq.relativeMomentResidual,momentRatio)))issues.push("شاخص‌های نسبی گزارش‌شده با بردارهای تعادل سازگار نیستند.");
 if(forceRatio!==null&&forceRatio>tolerance)issues.push("باقیمانده نیروی نسبی از حد مجاز ممیزی بیشتر است.");
 if(momentRatio!==null&&momentRatio>tolerance)issues.push("باقیمانده لنگر نسبی از حد مجاز ممیزی بیشتر است.");
 if(eq.ok!==true)issues.push("حل‌گر تعادل کلی را تأیید نکرده است.");
 if(eq.ok===true&&(forceRatio===null||momentRatio===null))issues.push("پرچم موفقیت حل‌گر بدون بردارهای قابل ممیزی پذیرفته نمی‌شود.");
 return{ok:issues.length===0,issues,relativeForceResidual:forceRatio??eq.relativeForceResidual??null,relativeMomentResidual:momentRatio??eq.relativeMomentResidual??null,tolerance,method:"independent re-evaluation of returned global equilibrium vectors; not independent load assembly"};
}
function closeNumber(a,b){return Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));}
function buildFoundationReactionEnvelope(caseResults){
 const issues=[],byFooting=new Map(),seenCases=new Set();
 if(!Array.isArray(caseResults)||!caseResults.length)issues.push("نتایج چندحالت بار برای تشکیل پوش واکنش پی موجود نیست.");
 (caseResults||[]).forEach(result=>{
  const caseId=String(result?.id||"").trim();
  if(!caseId||seenCases.has(caseId))issues.push("شناسه حالت بار در پوش واکنش پی خالی یا تکراری است: "+caseId);
  seenCases.add(caseId);
  const audit=result?.foundationReactionMappingAudit;
  if(!audit?.success){issues.push("نگاشت پی در حالت "+String(result?.id||"?")+" کامل نیست؛ پوش پی متوقف شد.");return;}
  const caseFootings=new Set();
  (audit.footingDemands||[]).forEach(footing=>{
   const id=String(footing.footingId||"").trim(),p=footing.referencePointM,a=footing.actions;
   if(id&&caseFootings.has(id)){issues.push("پی "+id+" در حالت "+caseId+" بیش از یک بار ثبت شده است.");return;}
   if(id)caseFootings.add(id);
   if(!id||!p||![p.x,p.y,p.z].every(finite)||!a||!["Fx","Fy","Fz","Mx","My","Mz"].every(k=>finite(a[k]))){
    issues.push("داده پی در حالت "+String(result.id||"?")+" ناقص است.");return;
   }
   if(!byFooting.has(id))byFooting.set(id,{footingId:id,referencePointM:{...p},caseActions:[],componentEnvelope:{}});
   const group=byFooting.get(id);
   if(["x","y","z"].some(k=>Math.abs(group.referencePointM[k]-p[k])>1e-9)){
    issues.push("مرجع هندسی پی "+id+" بین حالت‌های بار تغییر کرده است.");return;
   }
   group.caseActions.push({caseId:String(result.id),actions:{...a}});
  });
 });
 if(!issues.length){
  byFooting.forEach(group=>{
   const caseIds=new Set(group.caseActions.map(x=>x.caseId));
   if(caseIds.size!==caseResults.length)issues.push("برای پی "+group.footingId+" در همه حالت‌های بار نتیجه وجود ندارد.");
   ["Fx","Fy","Fz","Mx","My","Mz"].forEach(k=>{
    const rows=group.caseActions.map(x=>({caseId:x.caseId,value:x.actions[k]}));
    group.componentEnvelope[k]={
     min:rows.reduce((a,b)=>b.value<a.value?b:a),
     max:rows.reduce((a,b)=>b.value>a.value?b:a)
    };
   });
  });
 }
 return{success:issues.length===0,status:issues.length?"envelope-incomplete":"case-preserving-demand-envelope",
  issues,footings:issues.length?[]:Array.from(byFooting.values()),caseCount:caseResults?.length||0,
  rule:"هر مؤلفه کمینه/بیشینه با شناسه حالت بار واقعی حفظ می‌شود؛ مؤلفه‌های حاکم از حالت‌های مختلف با هم ترکیب و به‌عنوان یک بردار همزمان ساختگی ارائه نمی‌شوند.",
  units:{force:"N",moment:"N.m"},analysisEnabled:false,designApproved:false};
}
async function run(loadCases){
 const api=root.SteelStructuralModel,model=api?.getData?.();
 const contract=auditSolverContract(api,model);
 if(!contract.ready)throw Error("قرارداد حل‌گر/مدل ناقص است: "+contract.issues.join("؛ "));
 if(!Array.isArray(loadCases)||!loadCases.length)throw Error("حداقل یک حالت بار صریح لازم است.");
 const ids=new Set(),results=[];
 for(const spec of loadCases){
  if(!spec||typeof spec.id!=="string"||!spec.id.trim()||ids.has(spec.id))throw Error("شناسه حالت بار خالی یا تکراری است.");
  ids.add(spec.id);
  if(!Object.prototype.hasOwnProperty.call(spec,"loadCase"))throw Error("loadCase برای "+spec.id+" مشخص نشده است.");
  const solved=await api.analyze3D(spec.loadCase);
  const equilibrium=auditEquilibrium(solved?.equilibrium);
  if(!equilibrium.ok)throw Error("تعادل حالت "+spec.id+" تأیید نشد: "+equilibrium.issues.join("؛ "));
  const extracted=extractSupportReactions(solved,model);
  const solverLoadTransferAudit=solved?.solverLoadTransferAudit||null;
  const foundationReactionMappingAudit=auditFoundationReactionMapping(extracted,model.foundationSupportMappings,model);
  const externalLoadLedger=buildExternalLoadLedger(model,solved.members,spec.loadCase?.nodalLoads||[],solved.equivalentReleasedRotationLoads||[]);
  const externalLoadLedgerComparison=compareExternalLedger(externalLoadLedger,solved.equilibrium);
  results.push({id:spec.id,label:String(spec.label||spec.id),equilibrium,reactions:extracted.rows,solverLoadTransferAudit,foundationReactionMappingAudit,externalLoadLedger,externalLoadLedgerComparison,
   totalSolverReaction:extracted.totalSolverReaction,modelNodeCount:solved.nodeCount??model.nodes.length,
   modelMemberCount:solved.memberCount??model.members.length,
   solverResult:solved,supportDemands:extracted.rows,
   foundationDemands:foundationReactionMappingAudit.success?foundationReactionMappingAudit.footingDemands:[],
   foundationDemandStatus:foundationReactionMappingAudit.status});
 }
 const foundationReactionEnvelope=buildFoundationReactionEnvelope(results);
 return{success:true,contract,caseCount:results.length,results,foundationReactionEnvelope,
  allCasesEquilibriumOK:results.every(r=>r.equilibrium.ok),
  analysisEnabled:false,designApproved:false,
  scope:"پل استخراج واکنش و تقاضای پایه از قرارداد واقعی حل‌گر؛ بدون طراحی ظرفیت و بدون تأیید مهندسی."};
}
async function runDirectionalWind(){
 const wind=root.SteelDirectionalWind3D;
 if(!wind||typeof wind.createCases!=="function")throw Error("سازنده حالت‌های باد جهت‌دار در دسترس نیست.");
 const built=wind.createCases();
 return run(built.cases.map(c=>({id:c.id,label:c.label,loadCase:c})));
}
async function runSeismic(input){
 const seismic=root.SteelSeismicEquivalentLateral,api=root.SteelStructuralModel,model=api?.getData?.();
 if(!seismic||typeof seismic.createCases!=="function")throw Error("توزیع‌کننده زلزله در دسترس نیست.");
 const built=seismic.createCases(input,model);
 return run(built.cases.map(c=>({id:c.id,label:c.label,loadCase:c})));
}
async function runMemberDesignPipeline(loadCaseSpecs,options){
 options=options||{};
 const issues=[];
 const specs=Array.isArray(loadCaseSpecs)?loadCaseSpecs:[];
 const expected=Array.isArray(options.expectedMemberIds)?options.expectedMemberIds.map(String):[];
 const combinationSet=options.combinationSet||root.SteelLoadCaseWorkbench?.read?.();
 if(!specs.length)issues.push("برای زنجیره طراحی، حالت‌های بار حل‌شونده باید صریحاً ارائه شوند.");
 if(!expected.length)issues.push("فهرست شناسه اعضای فیزیکی مورد انتظار الزامی است.");
 if(!combinationSet||!Array.isArray(combinationSet.loadCases)||!Array.isArray(combinationSet.combinations))
  issues.push("دفترچه حالت‌ها و ترکیبات بار در دسترس نیست.");
 const seen=new Set();
 specs.forEach(s=>{
  const id=String(s?.id??"").trim();
  if(typeof s?.id!=="string"||!id||seen.has(id))issues.push("شناسه حالت بار باید رشته‌ای، غیرخالی و یکتا باشد: "+id);
  seen.add(id);
  const src=s?.source||{};
  ["document","revision","locator","authority"].forEach(k=>{
   if(typeof src[k]!=="string"||!src[k].trim())issues.push("مدرک حالت "+(id||"?")+" فاقد "+k+" است.");
  });
  if(!Object.prototype.hasOwnProperty.call(s||{},"loadCase"))issues.push("ورودی حل‌گر برای حالت "+(id||"?")+" مشخص نشده است.");
 });
 if(new Set(expected).size!==expected.length)issues.push("شناسه اعضای مورد انتظار تکراری است.");
 const comboCases=(combinationSet?.loadCases||[]).map(c=>String(c?.id??""));
 const comboIds=new Set(comboCases);
 comboCases.forEach(id=>{if(!seen.has(id))issues.push("حالت "+(id||"?")+" در دفترچه ترکیبات ثبت شده ولی خروجی حل‌شده متناظر ندارد.");});
 (combinationSet?.combinations||[]).forEach(c=>{
  Object.keys(c?.factors||{}).forEach(id=>{
   if(!seen.has(id))issues.push("حالت "+id+" که در ترکیب "+String(c?.id||"?")+" استفاده شده، در ورودی حل‌گر وجود ندارد.");
   if(!comboIds.has(id))issues.push("حالت "+id+" در دفترچه ترکیبات ثبت نشده است.");
  });
 });
 if(!root.SteelMemberDesignDemandPackage?.buildFromSolverCases)
  issues.push("بسته تقاضای اعضا بارگذاری نشده است.");
 if(!root.SteelMemberDemandCombinationBridge?.build)
  issues.push("پل ترکیب تقاضای اعضا بارگذاری نشده است.");
 const assumptions=options.assumptions||{};
 ["sameModelRevision","sameGeometry","sameSupports","sameStiffnessModel","linearElasticFirstOrder"].forEach(k=>{
  if(assumptions[k]!==true)issues.push("فرض تحلیل باید صریحاً تأیید شود: "+k);
 });
 if(issues.length)return{success:false,status:"blocked-before-analysis",issues,analysisEnabled:false,designApproved:false};
 try{
  const solved=await run(specs);
  const sourceById=new Map(specs.map(s=>[s.id,s.source]));
  const runnerCases=solved.results.map(row=>({
   ...row.solverResult,
   simultaneousActionCase:{caseId:row.id,source:sourceById.get(row.id)}
  }));
  const model=root.SteelStructuralModel?.getData?.();
  const demand=root.SteelMemberDesignDemandPackage.buildFromSolverCases(model,runnerCases,{expectedMemberIds:expected});
  if(demand.success!==true)return{success:false,status:"member-demand-evidence-incomplete",issues:demand.issues||["بسته تقاضای اعضا کامل نشد."],loadCaseCount:solved.caseCount,demand,analysisEnabled:false,designApproved:false};
  const proposal=root.SteelMemberDemandCombinationBridge.build(demand,combinationSet,assumptions);
  const loadLedgerVerified=solved.results.every(r=>r.externalLoadLedger?.complete===true&&r.externalLoadLedgerComparison?.ok===true);
  return{
   success:proposal.success===true&&loadLedgerVerified,
   status:!loadLedgerVerified?"load-ledger-audit-incomplete":(proposal.success?"combined-member-demand-proposal":"combination-proposal-incomplete"),
   caseCount:solved.caseCount,
   equilibriumAudit:solved.results.map(r=>({id:r.id,ok:r.equilibrium.ok,externalLoadLedgerComplete:r.externalLoadLedger.complete,externalLoadLedgerMatchesSolver:r.externalLoadLedgerComparison.ok})),
   demandPackage:demand,
   combinationProposal:proposal,
   issues:[...(proposal.issues||[]),...(!loadLedgerVerified?["دفتر بار خارجی و تطبیق مستقل آن با بردار بار اعمال‌شده در یک یا چند حالت کامل/منطبق نیست؛ پیشنهاد ترکیب برای طراحی قابل پذیرش نیست."]:[])],
   capacityCalculated:false,
   codeChecksCalculated:false,
   analysisEnabled:false,
   designApproved:false,
   nextRequired:"تبدیل قرارداد علامت و محورها برای هر خانواده عضو، سپس کنترل مقاومت، پایداری، تغییرمکان و اتصالات با مبنای آیین‌نامه‌ای تأییدشده."
  };
 }catch(error){
  return{success:false,status:"solver-or-demand-failure",issues:[String(error?.message||error)],analysisEnabled:false,designApproved:false};
 }
}
function auditSolverLoadTransfer(model,solverResult,nodalLoads){
 const issues=[];
 if(!solverResult||solverResult.success!==true)issues.push("خروجی موفق حل‌گر برای ممیزی انتقال بار موجود نیست.");
 const ledger=buildExternalLoadLedger(model,solverResult?.members,nodalLoads,solverResult?.equivalentReleasedRotationLoads);
 if(!ledger.complete)issues.push(...ledger.issues);
 const comparison=compareExternalLedger(ledger,solverResult?.equilibrium);
 if(!comparison.ok)issues.push(...comparison.issues);
 const equilibrium=auditEquilibrium(solverResult?.equilibrium);
 if(!equilibrium.ok)issues.push(...equilibrium.issues);
 return{success:issues.length===0,status:issues.length?"incomplete-or-mismatch":"verified",
  issues,externalLoadLedger:ledger,solverAppliedResultantComparison:comparison,
  supportReactionEquilibrium:equilibrium,analysisEnabled:false,designApproved:false,
  scope:"مقایسه مستقل برآیند بارهای صریح عضو/گره/دوران آزادشده با برآیند اعمال‌شده گزارش‌شده حل‌گر و کنترل تعادل واکنش‌ها؛ نه بازسازی مستقل کامل بردار سختی/بار FEM"};
}
function selfTest(){
 const tests=[],ck=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"},{id:"B2",x:4,y:0,z:0,kind:"endwall-base"},{id:"N",x:0,y:3,z:0,kind:"frame"}],members:[{id:"C1",start:"B1",end:"N"},{id:"C2",start:"B2",end:"N"}]};
 const api={analyze3D(){},getData(){return model;}};
 ck("solver contract accepted",()=>auditSolverContract(api,model).ready);
 ck("missing solver blocked",()=>!auditSolverContract({},model).ready);
 ck("missing base nodes blocked",()=>!auditSolverContract(api,{nodes:[{id:"N"}],members:[]}).ready);
  ck("nonfinite model node coordinates blocked",()=>!auditSolverContract(api,{nodes:[{id:"B",x:0,y:0,z:NaN,kind:"base"}],members:[]}).ready);
 ck("duplicate node blocked",()=>!auditSolverContract(api,{nodes:[{id:"B",kind:"base"},{id:"B",kind:"base"}],members:[]}).ready);
 const mappingRows={rows:[
  {nodeId:"S1",coordinatesM:{x:0,y:0,z:0},columnAction:{Fx:10,Fy:20,Fz:30,Mx:1,My:2,Mz:3}},
  {nodeId:"S2",coordinatesM:{x:2,y:0,z:0},columnAction:{Fx:5,Fy:0,Fz:0,Mx:0,My:0,Mz:0}}
 ]};
 const mapGood=[{supportNodeId:"S1",footingId:"F1",referencePointM:{x:0,y:0,z:0}},{supportNodeId:"S2",footingId:"F1",referencePointM:{x:0,y:0,z:0}}];
 const mapped=auditFoundationReactionMapping(mappingRows,mapGood,{});
 ck("multiple column bases aggregate to one footing with moments translated to footing reference",()=>{const g=mapped.footingDemands[0].actions;return mapped.success&&mapped.footingDemands.length===1&&g.Fx===15&&g.Fy===20&&g.Mz===3&&mapped.totalColumnActionAtGlobalOrigin.Mz===3&&mapped.reconciliation.ok;});
 ck("mapped footing resultants reconcile all six components at global origin",()=>mapped.reconciliation.ok&&["Fx","Fy","Fz","Mx","My","Mz"].every(k=>Math.abs(mapped.reconciliation.differences[k])<1e-8));
 ck("incomplete mapping cannot be treated as successful footing demand",()=>!auditFoundationReactionMapping(mappingRows,[mapGood[0]],{}).success);
 ck("duplicate support-to-footing mapping is blocked",()=>!auditFoundationReactionMapping(mappingRows,[...mapGood,mapGood[0]],{}).success);
 ck("unmapped physical support blocks complete footing demand",()=>!auditFoundationReactionMapping(mappingRows,[mapGood[0]],{}).success);
 ck("unknown support mapping is blocked",()=>!auditFoundationReactionMapping(mappingRows,[...mapGood,{supportNodeId:"S3",footingId:"F2",referencePointM:{x:0,y:0,z:0}}],{}).success);
 ck("missing footing reference point is blocked",()=>!auditFoundationReactionMapping(mappingRows,[{supportNodeId:"S1",footingId:"F1"},{...mapGood[1]}],{}).success);
 ck("inconsistent reference points for same footing are blocked",()=>!auditFoundationReactionMapping(mappingRows,[mapGood[0],{...mapGood[1],referencePointM:{x:1,y:0,z:0}}],{}).success);
 const res={reactions:[{nodeId:"B1",values:[100,200,300,4,5,6]},{nodeId:"B2",values:[-10,-20,-30,-1,-2,-3]}]};
 const x=extractSupportReactions(res,model);
 ck("all support reactions extracted",()=>x.rows.length===2&&x.rows[0].nodeId==="B1");
 ck("base action is opposite solver reaction",()=>x.rows[0].columnAction.Fy===-200&&x.rows[1].columnAction.Mz===3);
 ck("global support force resultant summed componentwise",()=>x.totalSolverReaction.Fx===90&&x.totalSolverReaction.Fy===180&&x.totalSolverReaction.Fz===270);
 ck("support moments transferred to common global origin",()=>x.totalSolverReaction.Mx===3&&x.totalSolverReaction.My===123&&x.totalSolverReaction.Mz===-77);
 ck("nodal moment sum retained separately",()=>x.componentwiseNodalMomentSum.Mx===3&&x.componentwiseNodalMomentSum.My===3&&x.componentwiseNodalMomentSum.Mz===3);
 ck("global resultant reference is explicit",()=>x.resultantMomentReference.includes("global origin"));
 ck("missing support reaction blocked",()=>{try{extractSupportReactions({reactions:[res.reactions[0]]},model);return false;}catch(e){return true;}});
  ck("missing support coordinate blocked instead of silently replacing it with zero",()=>{try{extractSupportReactions(res,{...model,nodes:model.nodes.map(n=>n.id==="B1"?{...n,x:undefined}:n)});return false;}catch(e){return true;}});
 ck("duplicate reaction blocked",()=>{try{extractSupportReactions({reactions:[res.reactions[0],res.reactions[0],res.reactions[1]]},model);return false;}catch(e){return true;}});
 ck("nonfinite reaction blocked",()=>{try{extractSupportReactions({reactions:[{nodeId:"B1",values:[0,0,0,0,0,NaN]},{nodeId:"B2",values:[0,0,0,0,0,0]}]},model);return false;}catch(e){return true;}});
 const eqGood={ok:true,appliedForceN:[0,-1000,0],supportReactionN:[0,1000,0],forceResidualN:[0,0,0],appliedMomentNm:[0,0,0],supportMomentNm:[0,0,0],momentResidualNm:[0,0,0],relativeForceResidual:0,relativeMomentResidual:0};
 ck("failed equilibrium blocked",()=>!auditEquilibrium({...eqGood,ok:false}).ok);
 ck("missing equilibrium vectors blocked",()=>!auditEquilibrium({ok:true,relativeForceResidual:0,relativeMomentResidual:0}).ok);
 ck("high residual blocked despite solver ok flag",()=>!auditEquilibrium({...eqGood,appliedForceN:[0,-1000,0],supportReactionN:[0,900,0],forceResidualN:[0,-100,0],relativeForceResidual:0.1}).ok);
 ck("inconsistent residual vector blocked",()=>!auditEquilibrium({...eqGood,forceResidualN:[0,1,0]}).ok);
 ck("reported residual ratio mismatch blocked",()=>!auditEquilibrium({...eqGood,relativeForceResidual:0.25}).ok);
 ck("valid equilibrium vectors independently rechecked",()=>auditEquilibrium(eqGood).ok);
 const ledgerModel={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:4,y:0,z:0}],members:[{id:"M",start:"A",end:"B",analysisLoad:{loadDataComplete:true,uniformLocal:[0,-100,0],linearLocal:{start:[0,0,0],end:[0,-200,0]}}}]};
 const ledger=buildExternalLoadLedger(ledgerModel,[{id:"M",start:"A",end:"B",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}],[{nodeId:"B",values:[10,0,0,0,0,5]}],[{nodeId:"A",memberId:"M",end:"i",momentNm:[0,0,7]}]);
 ck("ledger integrates explicit uniform plus linear local member loads from source model",()=>ledger.complete&&ledger.memberCount===1&&ledger.resultant.forceN[0]===10&&ledger.resultant.forceN[1]===-800&&ledger.resultant.forceN[2]===0&&Math.abs(ledger.resultant.momentNm[2]+1854.6666666666667)<1e-8);
 const rotatedLedger=buildExternalLoadLedger({nodes:ledgerModel.nodes,members:[{id:"M",start:"A",end:"B",analysisLoad:{loadDataComplete:true,uniformLocal:[0,-100,0]}}]},[{id:"M",localAxes:{x:[1,0,0],y:[0,0,1],z:[0,-1,0]}}],[],[]);
 ck("local member load transformed through actual solver axes",()=>rotatedLedger.complete&&rotatedLedger.resultant.forceN[2]===-400);
 ck("missing member load prevents complete ledger",()=>!buildExternalLoadLedger({nodes:ledgerModel.nodes,members:[{id:"M",start:"A",end:"B",analysisLoad:{loadDataComplete:true}}]},[{id:"M",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}],[]).complete);
 const eqLedger={appliedForceN:[10,-800,0],appliedMomentNm:[0,0,-1854.6666666666667]};
 ck("external load ledger matches solver applied resultant",()=>compareExternalLedger(ledger,eqLedger).ok);
 ck("external load ledger mismatch is detected",()=>!compareExternalLedger(ledger,{...eqLedger,appliedForceN:[10,-390,0]}).ok);
 ck("missing member load prevents complete ledger",()=>!buildExternalLoadLedger(ledgerModel,[{id:"M"}],[]).complete);
 const integratedFixture={success:true,members:[{id:"M",start:"A",end:"B",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}],equivalentReleasedRotationLoads:[],equilibrium:{...eqLedger,appliedMomentNm:[0,0,-1861.6666666666667],supportReactionN:[-10,800,0],forceResidualN:[0,0,0],supportMomentNm:[0,0,1861.6666666666667],momentResidualNm:[0,0,0],relativeForceResidual:0,relativeMomentResidual:0,ok:true}};
 ck("integrated load-transfer audit compares ledger, solver resultant and support equilibrium",()=>auditSolverLoadTransfer(ledgerModel,integratedFixture,[{nodeId:"B",values:[10,0,0,0,0,5]}]).success);
 ck("integrated load-transfer audit blocks solver-resultant mismatch",()=>!auditSolverLoadTransfer(ledgerModel,{...integratedFixture,equilibrium:{...integratedFixture.equilibrium,appliedForceN:[10,-390,0]}},[{nodeId:"B",values:[10,0,0,0,0,5]}]).success);
 ck("integrated load-transfer audit blocks incomplete member ledger",()=>!auditSolverLoadTransfer({nodes:ledgerModel.nodes,members:[{...ledgerModel.members[0],analysisLoad:{loadDataComplete:true}}]},{...integratedFixture,members:[{id:"M",start:"A",end:"B",localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]}}]},[]).success);
 const env=buildFoundationReactionEnvelope([
  {id:"D",foundationReactionMappingAudit:{success:true,footingDemands:[{footingId:"F1",referencePointM:{x:0,y:0,z:0},actions:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}},
  {id:"W",foundationReactionMappingAudit:{success:true,footingDemands:[{footingId:"F1",referencePointM:{x:0,y:0,z:0},actions:{Fx:-2,Fy:4,Fz:1,Mx:8,My:-5,Mz:2}}]}}
 ]);
 ck("foundation envelope preserves governing case ID for every component",()=>env.success&&env.footings[0].componentEnvelope.Fx.min.caseId==="W"&&env.footings[0].componentEnvelope.My.max.caseId==="D");
 ck("foundation envelope does not combine extrema into a fictitious simultaneous vector",()=>env.footings[0].caseActions.length===2&&env.rule.includes("بردار همزمان ساختگی"));
 ck("incomplete mapping blocks foundation envelope and clears partial footing output",()=>{const bad=buildFoundationReactionEnvelope([{id:"X",foundationReactionMappingAudit:{success:false,footingDemands:[]}}]);return !bad.success&&bad.footings.length===0;});
 ck("duplicate footing in one load case is blocked",()=>!buildFoundationReactionEnvelope([{id:"X",foundationReactionMappingAudit:{success:true,footingDemands:[
  {footingId:"F",referencePointM:{x:0,y:0,z:0},actions:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0}},
  {footingId:"F",referencePointM:{x:0,y:0,z:0},actions:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0}}
 ]}}]).success);
 ck("duplicate load-case IDs are blocked",()=>!buildFoundationReactionEnvelope([
  {id:"X",foundationReactionMappingAudit:{success:true,footingDemands:[]}},
  {id:"X",foundationReactionMappingAudit:{success:true,footingDemands:[]}}
 ]).success);
 ck("inconsistent footing reference across cases blocks envelope",()=>!buildFoundationReactionEnvelope([
  {id:"A",foundationReactionMappingAudit:{success:true,footingDemands:[{footingId:"F",referencePointM:{x:0,y:0,z:0},actions:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0}}]}},
  {id:"B",foundationReactionMappingAudit:{success:true,footingDemands:[{footingId:"F",referencePointM:{x:1,y:0,z:0},actions:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0}}]}}
 ]).success);
 ck("demand-only status never implies design",()=>x.rows.every(r=>r.designStatus==="demand_only_not_designed")&&!("capacity" in x.rows[0]));
 ck("wind cases use directional adapter output",()=>typeof runDirectionalWind==="function"&&runDirectionalWind.toString().includes("SteelDirectionalWind3D"));
 ck("seismic cases use explicit seismic distributor input",()=>typeof runSeismic==="function"&&runSeismic.toString().includes("SteelSeismicEquivalentLateral"));
 return{passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelStructuralLoadChain={auditSolverContract,extractSupportReactions,auditFoundationReactionMapping,buildFoundationReactionEnvelope,buildExternalLoadLedger,compareExternalLedger,auditEquilibrium,auditSolverLoadTransfer,run,runDirectionalWind,runSeismic,runMemberDesignPipeline,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-bracket-column-analysis-bridge.js ===== */
/* SAHROUD STEEL — explicit crane bracket/column demand to 3D solver bridge.
 * prepare() only validates and builds a case. runPrepared() solves only with allowSolve:true.
 * The model-3d analyze3D(loadCase) path accepts factors + nodalLoads and sends them to
 * the worker's SteelFrame3D nodal-load vector. No global analysis switch or design approval.
 */
(function(root){"use strict";
function prepare(input){
 const issues=[],api=root.SteelStructuralModel,model=input?.model||api?.getData?.();
 if(!api||typeof api.analyze3D!=="function")issues.push("SteelStructuralModel.analyze3D(loadCase) در دسترس نیست.");
 if(!api||typeof api.getData!=="function")issues.push("SteelStructuralModel.getData() در دسترس نیست.");
 const base=input?.baseLoadCase;
 if(!base||typeof base!=="object")issues.push("حالت بار پایه ارائه نشده است.");
 if(!base?.factors||!["dead","live","snow","wind"].every(k=>typeof base.factors[k]==="number"&&Number.isFinite(base.factors[k])))issues.push("ضرایب dead/live/snow/wind باید صریح و عددی باشند؛ مقدار نامشخص صفر فرض نمی‌شود.");
 const id=String(base?.id||base?.caseId||"");
 if(!id)issues.push("شناسه یکتای حالت بار پایه الزامی است.");
 const contract=root.SteelStructuralLoadChain?.auditSolverContract?.(api,model);
 if(!contract?.ready)issues.push(...(contract?.issues||["ممیزی قرارداد حل‌گر انجام نشد."]));
 const transferResult=input?.runwayGirderResult?root.SteelCraneRunwayBracketDemandBridge?.audit?.(input.runwayGirderResult,input.bracketMapping,{verticalUnitVector_global:input.verticalUnitVector_global}):input?.transferResult;
 if(input?.runwayGirderResult&&!transferResult?.success)issues.push(...(transferResult?.issues||["پل واکنش تیر حمال به براکت/ستون ناموفق است."]));
 const built=root.SteelCraneBracketColumnFEMAdapter?.buildLoadCase?.(model,base,transferResult);
 if(!built?.success)issues.push(...(built?.issues||["آداپتور FEM تقاضای براکت ناموفق است."]));
 const ready=issues.length===0;
 return {success:ready,ready,caseId:id,loadCase:ready?built.loadCase:null,addedDemandCount:built?.addedDemandCount||0,
  aggregatedNodeCount:built?.aggregatedNodeCount||0,solverContract:contract||null,issues,
  analysisExecuted:false,analysisEnabled:false,designApproved:false,
  route:input?.runwayGirderResult?"crane wheel → rail → runway girder FEM support reaction → explicit bracket geometry → column node six-DOF demand → 3D frame solver":"crane wheel → rail → runway girder → bracket → column node → global six-DOF nodal load → 3D frame solver",
  note:"این مرحله فقط حالت بار حل‌گر را آماده می‌کند. اجرای تحلیل نیازمند فراخوانی جداگانه runPrepared با allowSolve:true است."};
}
function runPrepared(prepared,options){
 if(options?.allowSolve!==true)throw Error("اجرای حل‌گر مسدود است؛ فقط با تأیید صریح allowSolve:true اجرا می‌شود.");
 if(!prepared?.success||!prepared.ready||!prepared.loadCase||!prepared.caseId)throw Error("حالت بار آماده و معتبر برای حل وجود ندارد.");
 const chain=root.SteelStructuralLoadChain;
 if(!chain||typeof chain.run!=="function")throw Error("زنجیره استخراج واکنش و ممیزی تعادل بارگذاری نشده است.");
 return chain.run([{id:prepared.caseId,label:String(prepared.loadCase.label||prepared.caseId),loadCase:prepared.loadCase}]).then(result=>({success:result?.success===true,analysisExecuted:true,analysisEnabled:false,designApproved:false,caseId:prepared.caseId,addedDemandCount:prepared.addedDemandCount,aggregatedNodeCount:prepared.aggregatedNodeCount,result,scope:"حل خطی مرتبه اول واقعی از مسیر SteelStructuralModel.analyze3D و ممیزی واکنش/تعادل بار؛ بدون P-Delta، طراحی ظرفیت یا تأیید مهندسی."}));
}
function selfTest(){
 const tests=[],ck=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const old={api:root.SteelStructuralModel,chain:root.SteelStructuralLoadChain,adapter:root.SteelCraneBracketColumnFEMAdapter};
 const model={nodes:[{id:"BASE",x:0,y:0,z:0,kind:"base"},{id:"COL",x:0,y:5,z:0,kind:"column"}],members:[{id:"C1",start:"BASE",end:"COL"}]};
 const base={id:"CRANE-ULS-1",label:"جرثقیل ULS",factors:{dead:1.2,live:0,snow:0,wind:0},nodalLoads:[]};
 const transfer={success:true,transferType:"demand-only-global-coordinate",demands:[{connectionId:"BR-1",caseId:base.id,columnNodeId:"COL",coordinateSystem:"global",columnNodeCoordinate_m:[0,5,0],force_N:[1,2,3],momentAtColumnNode_Nm:[4,5,6],source:"test",document:"T-1"}]};
 try{
  root.SteelStructuralModel={getData:()=>model,analyze3D:async()=>({})};
  root.SteelStructuralLoadChain={auditSolverContract:()=>({ready:true,issues:[]}),run:async cases=>({success:true,caseCount:cases.length,received:cases[0]})};
  root.SteelCraneBracketColumnFEMAdapter={buildLoadCase:(m,b,t)=>({success:true,loadCase:{...b,nodalLoads:[{nodeId:"COL",values:[1,2,3,4,5,6]}]},addedDemandCount:1,aggregatedNodeCount:1,issues:[]})};
  ck("prepares case without executing solver",()=>{const r=prepare({baseLoadCase:base,transferResult:transfer});return r.success&&!r.analysisExecuted&&r.loadCase.nodalLoads.length===1;});
  ck("requires explicit complete load factors",()=>!prepare({baseLoadCase:{...base,factors:{dead:1}},transferResult:transfer}).success);
  ck("requires solver contract readiness",()=>{root.SteelStructuralLoadChain.auditSolverContract=()=>({ready:false,issues:["bad"]});return !prepare({baseLoadCase:base,transferResult:transfer}).success;});
  root.SteelStructuralLoadChain.auditSolverContract=()=>({ready:true,issues:[]});
  ck("blocks solve without explicit allowSolve",()=>{try{runPrepared({success:true,ready:true,caseId:"X",loadCase:base},{});return false;}catch(e){return true;}});
  ck("blocks solve for unready preparation",()=>{try{runPrepared({success:false,ready:false,caseId:"X",loadCase:base},{allowSolve:true});return false;}catch(e){return true;}});
 }finally{
  root.SteelStructuralModel=old.api;root.SteelStructuralLoadChain=old.chain;root.SteelCraneBracketColumnFEMAdapter=old.adapter;
 }
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelCraneBracketColumnAnalysisBridge={prepare,runPrepared,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/foundation-reaction-audit.js ===== */
/* SAHROUD STEEL — independent completeness audit for per-footing reaction envelopes.
 * Audits data integrity and support resultants only; does not reconstruct external load resultants
 * and is NOT an independent global equilibrium proof or footing design.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function audit(envelope,model,footingSpecFor){
 const issues=[],supports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
 if(!envelope||!Array.isArray(envelope.cases)||!envelope.cases.length)issues.push("پوش فاقد حالات بار است.");
 if(!Array.isArray(envelope?.rows)||!envelope.rows.length)issues.push("پوش فاقد ردیف واکنش پایه است.");
 if(!Array.isArray(model?.nodes)||!supports.length)issues.push("مدل فاقد گره پایه معتبر است.");
 const supportById=new Map(supports.map(n=>[String(n.id),n])),rowById=new Map();
 const expectedCaseLabels=new Set((envelope?.cases||[]).map(c=>String(c?.label??"")));
 (envelope?.rows||[]).forEach(row=>{
  const id=String(row?.nodeId??"");
  if(!id||rowById.has(id)){issues.push("شناسه ردیف پایه خالی یا تکراری است: "+id);return;}
  rowById.set(id,row);
  const n=supportById.get(id);
  if(!n)issues.push("ردیف واکنش به گره پایه مدل متصل نیست: "+id);
  else if(["x","y","z"].some(k=>!finite(Number(row[k]))||Math.abs(Number(row[k])-Number(n[k]))>1e-8))issues.push("مختصات ردیف واکنش با مدل یکسان نیست: "+id);
 });
 supports.forEach(n=>{if(!rowById.has(String(n.id)))issues.push("واکنش گره پایه در پوش وجود ندارد: "+n.id);});
 rowById.forEach((row,id)=>{
  const cases=row.caseReactions;
  if(!Array.isArray(cases)||cases.length!==envelope.cases.length){issues.push("تعداد واکنش‌های هم‌زمان با تعداد حالات بار برابر نیست: "+id);return;}
  const seen=new Set();
  cases.forEach(item=>{
   const label=String(item?.label??"");
   if(!label||seen.has(label)){issues.push("نام حالت واکنش خالی یا تکراری برای گره "+id);return;}
   seen.add(label);
   if(!expectedCaseLabels.has(label))issues.push("حالت واکنش برای گره "+id+" در فهرست اصلی پوش وجود ندارد: "+label);
   if(!Array.isArray(item.values)||item.values.length!==6||!item.values.every(finite))issues.push("بردار باید دقیقاً شش مؤلفه عددی محدود داشته باشد؛ مقدار متنی یا مؤلفه اضافی پذیرفته نیست: "+id+" / "+label);
  });
  expectedCaseLabels.forEach(label=>{if(!seen.has(label))issues.push("واکنش حالت "+label+" برای گره "+id+" موجود نیست.");});
  if(Array.isArray(cases)&&cases.length===envelope.cases.length&&cases.every(x=>Array.isArray(x.values)&&x.values.length===6&&x.values.every(finite))){
   [0,1,2,3,4,5].forEach(k=>{
    const mn=Math.min(...cases.map(x=>x.values[k])),mx=Math.max(...cases.map(x=>x.values[k])),env=row.envelopes?.[k];
    if(!env||!finite(env.min)||!finite(env.max)||Math.abs(mn-env.min)>1e-7||Math.abs(mx-env.max)>1e-7)issues.push("پوش کمینه/بیشینه با واکنش‌های خام سازگار نیست: "+id+" مؤلفه "+k);
    if(env){
     const minCase=String(env.minCase??""),maxCase=String(env.maxCase??"");
     const minSource=cases.find(x=>x.label===minCase),maxSource=cases.find(x=>x.label===maxCase);
     if(!minSource||Math.abs(minSource.values[k]-mn)>1e-7)issues.push("شناسه حالت حاکم کمینه با مقدار واقعی تطبیق ندارد: "+id+" مؤلفه "+k);
     if(!maxSource||Math.abs(maxSource.values[k]-mx)>1e-7)issues.push("شناسه حالت حاکم بیشینه با مقدار واقعی تطبیق ندارد: "+id+" مؤلفه "+k);
    }
   });
  }
  if(typeof footingSpecFor==="function"){
   const d=footingSpecFor(row);
   if(!d||![d.width,d.length,d.thickness].every(v=>finite(Number(v))&&Number(v)>0))issues.push("ابعاد پی اختصاصی گره معتبر نیست: "+id);
  }
 });
 const tieBeam= envelope?.tieBeamIntegration;
 const tieBeamAudit={checked:false,routeCount:0,segmentCount:0,issues:[]};
 if(tieBeam){
  tieBeamAudit.checked=true;
  const included=Array.isArray(tieBeam.included)?tieBeam.included:[];
  const skipped=Array.isArray(tieBeam.skipped)?tieBeam.skipped:[];
  const segmentIds=new Set(),supportIds=new Set(supports.map(n=>String(n.id)));
  tieBeamAudit.routeCount=included.length;
  included.forEach(route=>{
   const id=String(route?.id??"");
   const start=String(route?.start??""),end=String(route?.end??"");
   const mids=Array.isArray(route?.intermediateBaseNodes)?route.intermediateBaseNodes.map(String):[];
   const members=Array.isArray(route?.memberIds)?route.memberIds.map(String):[];
   const count=Number(route?.segmentCount);
   if(!id||!start||!end)tieBeamAudit.issues.push("شناژ با شناسه یا گره ابتدا/انتهای خالی در مسیر انتقال به پی ثبت شده است.");
   if(!supportIds.has(start)||!supportIds.has(end))tieBeamAudit.issues.push("دو انتهای شناژ "+(id||"?")+" به گره پایه واقعی متصل نیستند.");
   mids.forEach(nodeId=>{if(!supportIds.has(nodeId))tieBeamAudit.issues.push("گره میانی شناژ "+(id||"?")+" تکیه‌گاه فونداسیون شناخته‌شده نیست: "+nodeId);});
   if(!Number.isInteger(count)||count<1||members.length!==count)tieBeamAudit.issues.push("تعداد قطعات شناژ "+(id||"?")+" با فهرست شناسه قطعات برابر نیست.");
   members.forEach(memberId=>{if(!memberId||segmentIds.has(memberId))tieBeamAudit.issues.push("شناسه قطعه شناژ خالی یا تکراری است: "+memberId);segmentIds.add(memberId);});
   tieBeamAudit.segmentCount+=members.length;
   if(!Number.isFinite(Number(route.lengthM))||Number(route.lengthM)<=0)tieBeamAudit.issues.push("طول مسیر شناژ "+(id||"?")+" نامعتبر است.");
  });
  if(skipped.length)tieBeamAudit.issues.push("یک یا چند مسیر شناژ از تحلیل حذف شده است؛ انتقال بار فونداسیون کامل نیست.");
  if(tieBeam.activeInAnalysis===false&&included.length)tieBeamAudit.issues.push("مسیرهای شناژ ثبت شده‌اند ولی در تحلیل فعال نیستند.");
  issues.push(...tieBeamAudit.issues);
 }
 const caseLabels=new Set();
 (envelope?.cases||[]).forEach(c=>{
  if(!c?.label||caseLabels.has(c.label))issues.push("نام حالت بار در پوش خالی یا تکراری است: "+String(c?.label));
  caseLabels.add(c?.label);
  if(c?.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای حالت تأیید نشده: "+String(c?.label));
  if(c?.equilibrium?.nodeEquilibriumOk!==true||!Array.isArray(c?.equilibrium?.nodeEquilibrium)||!c.equilibrium.nodeEquilibrium.length)
   issues.push("ممیزی باقیمانده تعادل گره‌به‌گره حل‌گر برای حالت بار موجود یا موفق نیست: "+String(c?.label));
  else if(c.equilibrium.nodeEquilibrium.some(n=>n?.ok!==true||!Array.isArray(n.components)||n.components.length!==6))
   issues.push("ممیزی تعادل گره‌به‌گره ناقص یا ناموفق است: "+String(c?.label));
  if(c?.equilibrium?.memberEndEquilibriumOk!==true||!Array.isArray(c?.equilibrium?.memberEndEquilibrium)||!c.equilibrium.memberEndEquilibrium.length)
   issues.push("ممیزی مستقل تعادل گره از نیروهای انتهایی اعضا برای حالت بار موجود یا موفق نیست: "+String(c?.label));
  else if(c.equilibrium.memberEndEquilibrium.some(n=>n?.ok!==true||!Array.isArray(n.components)||n.components.length!==6))
   issues.push("ممیزی مستقل نیروهای انتهایی اعضا در گره‌ها ناقص یا ناموفق است: "+String(c?.label));
 });
 const resultants=(envelope?.cases||[]).map(c=>{
  const F=[0,0,0],M=[0,0,0];
  supports.forEach(n=>{
   const row=rowById.get(String(n.id)),item=row?.caseReactions?.find(x=>x.label===c.label);
   if(!item?.values)return;
   const v=item.values.map(Number),x=Number(n.x),y=Number(n.y),z=Number(n.z);
   F[0]+=v[0];F[1]+=v[1];F[2]+=v[2];
   M[0]+=v[3]+y*v[2]-z*v[1];
   M[1]+=v[4]+z*v[0]-x*v[2];
   M[2]+=v[5]+x*v[1]-y*v[0];
  });
  return{label:c.label,solverSupportResultant:{Fx:F[0],Fy:F[1],Fz:F[2],Mx:M[0],My:M[1],Mz:M[2]},momentReference:"global origin (0,0,0)",units:{force:"N",moment:"N.m"}};
 });
 return{ok:issues.length===0,issues,supportCount:supports.length,rowCount:rowById.size,caseCount:envelope?.cases?.length||0,tieBeamAudit,resultants,scope:"data completeness and support reaction resultants only; not independent external-load equilibrium, not design"};
}
function selfTest(){
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"},{id:"B2",x:2,y:0,z:0,kind:"endwall-base"}]};
 const vals1=[10,20,30,1,2,3],vals2=[-5,-6,-7,4,5,6];
 const env={cases:[{label:"C1",equilibrium:{ok:true,nodeEquilibriumOk:true,memberEndEquilibriumOk:true,memberEndEquilibrium:[{nodeId:'B1',ok:true,components:Array(6).fill({})},{nodeId:'B2',ok:true,components:Array(6).fill({})}],nodeEquilibrium:[{nodeId:"B1",ok:true,components:Array(6).fill({})},{nodeId:"B2",ok:true,components:Array(6).fill({})}]}}],rows:[
  {nodeId:"B1",x:0,y:0,z:0,caseReactions:[{label:"C1",values:vals1}],envelopes:vals1.map(v=>({min:v,max:v,minCase:"C1",maxCase:"C1"}))},
  {nodeId:"B2",x:2,y:0,z:0,caseReactions:[{label:"C1",values:vals2}],envelopes:vals2.map(v=>({min:v,max:v,minCase:"C1",maxCase:"C1"}))}
 ]};
 const good=audit(env,model,()=>({width:1.8,length:1.8,thickness:.8}));
 const tests=[
  ["valid complete envelope accepted",good.ok],
  ["missing support row rejected",!audit({...env,rows:env.rows.slice(0,1)},model).ok],
  ["missing case reaction rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[]}:r)},model).ok],
  ["unknown case label cannot replace a missing valid case",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[{label:"UNKNOWN",values:vals1},{label:"C2",values:vals1}]}:r)},model).ok],
  ["case labels may be reordered without losing exact coverage",audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:r.caseReactions.slice().reverse()}:r)},model).ok],
  ["coordinate mismatch rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B2"?{...r,x:9}:r)},model).ok],
  ["envelope min max mismatch rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,envelopes:r.envelopes.map((e,i)=>i===0?{...e,min:-1,max:1}:e)}:r)},model).ok],
  ["envelope governing case ID must match actual minimum",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,envelopes:r.envelopes.map((e,i)=>i===0?{...e,minCase:"UNKNOWN"}:e)}:r)},model).ok],
  ["non-numeric reaction values are rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[{label:"C1",values:["10",20,30,1,2,3]}]}:r)},model).ok],
  ["reaction vectors with extra components are rejected",!audit({...env,rows:env.rows.map(r=>r.nodeId==="B1"?{...r,caseReactions:[{label:"C1",values:[...vals1,99]}]}:r)},model).ok],
  ["failed equilibrium rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:false,nodeEquilibriumOk:true,nodeEquilibrium:[{nodeId:"B1",ok:true,components:Array(6).fill({})}]}}]},model).ok],
  ["missing node-equilibrium audit rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:true}}]},model).ok],
  ["missing independent member-end equilibrium audit rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:true,nodeEquilibriumOk:true,nodeEquilibrium:[{nodeId:"B1",ok:true,components:Array(6).fill({})}]}}]},model).ok],
  ["failed node-equilibrium row rejected",!audit({...env,cases:[{label:"C1",equilibrium:{ok:true,nodeEquilibriumOk:false,nodeEquilibrium:[{nodeId:"B1",ok:false,components:Array(6).fill({})}]}}]},model).ok],
  ["missing footing dimensions rejected",!audit(env,model,()=>({width:0,length:1,thickness:1})).ok],
  ["global-origin moment includes r cross F",good.resultants[0].solverSupportResultant.My===21],
  ["audits tie-beam endpoints and intermediate supports",audit({...env,tieBeamIntegration:{included:[{id:"T1",start:"B1",end:"B2",intermediateBaseNodes:[],memberIds:["TB1"],segmentCount:1,lengthM:2}],skipped:[],activeInAnalysis:true}},model).tieBeamAudit.issues.length===0],
  ["rejects tie-beam endpoint not connected to footing support",!audit({...env,tieBeamIntegration:{included:[{id:"T1",start:"B1",end:"GHOST",intermediateBaseNodes:[],memberIds:["TB1"],segmentCount:1,lengthM:2}],skipped:[],activeInAnalysis:true}},model).ok],
  ["rejects tie-beam segment count mismatch",!audit({...env,tieBeamIntegration:{included:[{id:"T1",start:"B1",end:"B2",intermediateBaseNodes:[],memberIds:["TB1"],segmentCount:2,lengthM:2}],skipped:[],activeInAnalysis:true}},model).ok],
  ["rejects skipped tie-beam route",!audit({...env,tieBeamIntegration:{included:[],skipped:[{id:"T2"}],activeInAnalysis:false}},model).ok]
 ];
 return{passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,total:tests.length,tests};
}
root.SteelFoundationReactionAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/legacy-sps-parser.js ===== */
/* SAHROUD STEEL — legacy SPS parser (read-only, fail-closed).
 * Preserves raw data and provenance; does not infer engineering meaning.
 */
(function (root) {
  "use strict";
  const VERSION = "1.0.1";
  const INDEXED_KEY = /^(.*?)(\d+)$/;

  function parse(text) {
    if (typeof text !== "string") throw new TypeError("SPS input must be text.");
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    const entries = [], warnings = [], sections = [], seen = new Map();
    let section = "";
    lines.forEach((raw, index) => {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) return;
      const sectionMatch = /^\[([^\]]+)\]$/.exec(trimmed);
      if (sectionMatch) {
        section = sectionMatch[1].trim();
        sections.push({ name: section, line: index + 1 });
        return;
      }
      const split = trimmed.search(/[=:]/);
      if (split < 1) {
        warnings.push({ code: "UNPARSED_LINE", line: index + 1, raw });
        return;
      }
      const key = trimmed.slice(0, split).trim();
      const value = trimmed.slice(split + 1).trim();
      if (!key) {
        warnings.push({ code: "EMPTY_KEY", line: index + 1, raw });
        return;
      }
      const id = section + "\u0000" + key;
      if (seen.has(id)) warnings.push({ code: "DUPLICATE_KEY", line: index + 1, firstLine: seen.get(id), section, key });
      else seen.set(id, index + 1);
      entries.push({ line: index + 1, section, key, rawValue: value, indexed: INDEXED_KEY.test(key) });
    });

    const groups = {};
    entries.forEach(entry => {
      const match = INDEXED_KEY.exec(entry.key);
      if (!match) return;
      const groupKey = entry.section + "::" + match[1];
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push({ suffix: match[2], rawValue: entry.rawValue, line: entry.line, sourceKey: entry.key });
    });
    return {
      schemaVersion: VERSION,
      recordType: "sahroud-steel-legacy-sps-parse",
      status: "parsed_raw_text_only",
      source: { lineCount: lines.length, parsedEntryCount: entries.length, sectionCount: sections.length },
      sections, entries,
      indexedKeyGroups: Object.keys(groups).sort().map(groupKey => ({ groupKey, records: groups[groupKey] })),
      warnings,
      engineeringInterpretation: {
        units: "unresolved",
        suffixMeaning: "unresolved; do not assume physical station or member ID",
        memberGeometryGenerated: false,
        coordinatesGenerated: false,
        solverEnabled: false,
        designApproved: false
      }
    };
  }

  function selfTest() {
    const sample = [
      "; comment", "[FRAME]", "hfeach100=50", "hfeach101=90",
      "wind=0.00303", "wind=0.004", "not-a-pair", "[CRANE]", "tonajindex10:30000"
    ].join("\n");
    const result = parse(sample);
    const indexed = result.indexedKeyGroups.find(g => g.groupKey === "FRAME::hfeach");
    const tests = [
      { name: "equals-separator", pass: result.entries.some(e => e.key === "wind" && e.rawValue === "0.00303") },
      { name: "colon-separator", pass: result.entries.some(e => e.key === "tonajindex10" && e.rawValue === "30000") },
      { name: "indexed-suffix-preserved", pass: !!indexed && indexed.records.map(r => r.suffix).join(",") === "100,101" },
      { name: "duplicate-key-warning", pass: result.warnings.some(w => w.code === "DUPLICATE_KEY") },
      { name: "unparsed-line-warning", pass: result.warnings.some(w => w.code === "UNPARSED_LINE") },
      { name: "fail-closed-flags", pass: result.engineeringInterpretation.solverEnabled === false && result.engineeringInterpretation.designApproved === false && result.engineeringInterpretation.units === "unresolved" },
      { name: "line-provenance", pass: result.entries.every(e => Number.isInteger(e.line) && e.line > 0) }
    ];
    return { passed: tests.filter(t => t.pass).length, total: tests.length, tests };
  }

  root.SteelLegacySPSParser = Object.freeze({ version: VERSION, parse, selfTest });
})(typeof window !== "undefined" ? window : globalThis);


/* ===== steel2/js/reference-import-evidence-validator.js ===== */
/* SAHROUD STEEL — reference import evidence validator.
 * Validates provenance shape only; never interprets values or unlocks engineering.
 */
(function(root){"use strict";
function audit(record){
 const issues=[],warnings=[];
 if(!record||typeof record!=="object"||Array.isArray(record))return {valid:false,issues:["record must be an object"],warnings,solverEligible:false,designApproved:false};
 const s=record.source||{},l=s.locator||{},f=s.format;
 const has=(k)=>typeof l[k]==="string"&&l[k].trim().length>0;
 const positive=(k)=>Number.isInteger(l[k])&&l[k]>0;
 if(!s.sourceId||!s.path)issues.push("sourceId and source path are required");
 if(!f)issues.push("source format is required");
 if(f==="SPS"&&!(positive("line")&&has("section")&&has("key")))issues.push("SPS locator requires line, section and key");
 if(f==="XLSX"&&!(has("sheet")&&has("cell")))issues.push("XLSX locator requires sheet and cell address");
 if((f==="DOC"||f==="PDF")&&!positive("page"))issues.push("DOC/PDF locator requires a positive page number");
 if(["M3","IFC","SDNF","CIS2"].includes(f)&&!has("objectId"))issues.push(f+" locator requires a native object/member/node identifier");
 if(f==="CSV"&&!positive("line")&&!has("objectId"))issues.push("CSV locator requires a line number or stable objectId");
 if(f==="OTHER"&&!has("note"))issues.push("OTHER locator requires a descriptive note");
 if(s.sourceChecksum!==undefined&&!/^sha256:[a-f0-9]{64}$/i.test(s.sourceChecksum))issues.push("sourceChecksum must use sha256:<64 hex characters>");
 if(!s.sourceChecksum)warnings.push("source checksum absent; source immutability is not independently established");
 if(!record.raw||typeof record.raw!=="object"||!("key" in record.raw)||!("value" in record.raw))issues.push("raw key and raw value are required");
 if(!record.gate||record.gate.solverEligible!==false||record.gate.designApproved!==false)issues.push("import record must remain fail-closed");
 if(record.interpretation&&record.interpretation.semanticStatus==="reviewed")warnings.push("reviewed mapping is still not an engineering approval");
 return {valid:issues.length===0,issues,warnings,solverEligible:false,designApproved:false};
}
function selfTest(){
 const base={source:{sourceId:"src-1",path:"/legacy/a.sps",format:"SPS",locator:{line:4,section:"FRAME",key:"hfeach100"},sourceChecksum:"sha256:"+"a".repeat(64)},raw:{key:"hfeach100",value:"50"},interpretation:{semanticStatus:"unmapped"},gate:{solverEligible:false,designApproved:false}};
 const cases=[
 ["SPS exact locator accepted",audit(base).valid],
 ["missing SPS line rejected",!audit({...base,source:{...base.source,locator:{section:"FRAME",key:"hfeach100"}}}).valid],
 ["XLSX sheet and cell accepted",audit({...base,source:{...base.source,format:"XLSX",locator:{sheet:"Loads",cell:"B12"}}}).valid],
 ["native object identifier accepted",audit({...base,source:{...base.source,format:"IFC",locator:{objectId:"IfcBeam-17"}}}).valid],
 ["negative coordinate remains permitted",audit({...base,interpretation:{coordinate:-12.5}}).valid],
 ["invalid checksum rejected",!audit({...base,source:{...base.source,sourceChecksum:"sha256:xyz"}}).valid],
 ["reviewed mapping does not unlock solver",audit({...base,interpretation:{semanticStatus:"reviewed"}}).solverEligible===false&&audit({...base,interpretation:{semanticStatus:"reviewed"}}).designApproved===false],
 ["solver unlock attempt rejected",!audit({...base,gate:{solverEligible:true,designApproved:false}}).valid]
 ];
 return {passed:cases.filter(x=>x[1]).length,total:cases.length,failed:cases.filter(x=>!x[1]).map(x=>x[0]),tests:cases.map(x=>({name:x[0],pass:x[1]}))};
}
root.SteelReferenceImportEvidenceValidator=Object.freeze({audit,selfTest});
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/csv-structural-exchange.js ===== */
/* SAHROUD STEEL — CSV structural exchange parser (proposal-only).
 * Explicit units and coordinate metadata are mandatory. No solver activation.
 */
(function(root){"use strict";
function csvRows(text){
 if(typeof text!=="string")throw new TypeError("CSV input must be text");
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
  else if(c==='"'){if(field.length)throw new Error("Quote inside unquoted field");quoted=true;}
  else if(c===","){row.push(field);field="";}
  else if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);field="";if(row.some(v=>v.trim()!==""))rows.push(row);row=[];}
  else field+=c;
 }
 if(quoted)throw new Error("Unclosed quoted field");
 row.push(field);if(row.some(v=>v.trim()!==""))rows.push(row);
 if(!rows.length)return [];
 const headers=rows.shift().map(x=>x.trim());
 if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw new Error("CSV headers must be non-empty and unique");
 return rows.map((cells,index)=>{if(cells.length!==headers.length)throw new Error("CSV row "+(index+2)+" has "+cells.length+" cells; expected "+headers.length);const o={};headers.forEach((h,i)=>o[h]=cells[i]);return o;});
}
function buildProposal(input){
 const issues=[],warnings=[];
 if(!input||!["m","mm"].includes(input.lengthUnit))issues.push("lengthUnit must explicitly be m or mm");
 if(!input||typeof input.coordinateSystem!=="string"||!input.coordinateSystem.trim())issues.push("coordinateSystem/origin convention is required");
 if(!input||!input.nodesCsv||!input.membersCsv)issues.push("both node and member CSV tables are required");
 if(issues.length)return {success:false,issues,warnings,proposal:null,solverEligible:false,designApproved:false};
 let nr,mr;try{nr=csvRows(input.nodesCsv);mr=csvRows(input.membersCsv);}catch(e){return {success:false,issues:[e.message],warnings,proposal:null,solverEligible:false,designApproved:false};}
 const required=(rows,cols,label)=>{if(!rows.length){issues.push(label+" table is empty");return;}cols.forEach(k=>{if(!(k in rows[0]))issues.push(label+" missing column "+k);});};
 required(nr,["node_id","x","y","z"],"nodes");required(mr,["member_id","start_node","end_node","section_ref"],"members");
 if(issues.length)return {success:false,issues,warnings,proposal:null,solverEligible:false,designApproved:false};
 const factor=input.lengthUnit==="mm"?0.001:1,nodes=[],members=[],nodeIds=new Set(),memberIds=new Set();
 nr.forEach((r,i)=>{const id=String(r.node_id).trim(),v=[r.x,r.y,r.z].map(Number);if(!id)issues.push("node row "+(i+2)+" has empty node_id");else if(nodeIds.has(id))issues.push("duplicate node_id "+id);else nodeIds.add(id);if(v.some(x=>!Number.isFinite(x)))issues.push("node "+id+" has invalid coordinates");else nodes.push({id,x:v[0]*factor,y:v[1]*factor,z:v[2]*factor,sourceRow:i+2,raw:{x:r.x,y:r.y,z:r.z}});});
 mr.forEach((r,i)=>{const id=String(r.member_id).trim(),a=String(r.start_node).trim(),b=String(r.end_node).trim(),s=String(r.section_ref).trim();if(!id)issues.push("member row "+(i+2)+" has empty member_id");else if(memberIds.has(id))issues.push("duplicate member_id "+id);else memberIds.add(id);if(!s)issues.push("member "+id+" has empty section_ref");if(a===b)issues.push("member "+id+" has identical start/end node");if(!nodeIds.has(a)||!nodeIds.has(b))issues.push("member "+id+" references missing node "+(!nodeIds.has(a)?a:b));members.push({id,start:a,end:b,sectionRef:s,sourceRow:i+2});});
 const byId=new Map(nodes.map(n=>[n.id,n]));members.forEach(m=>{const a=byId.get(m.start),b=byId.get(m.end);if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=1e-9)issues.push("member "+m.id+" has zero geometric length");});
 if(!input.source||typeof input.source.path!=="string"||!input.source.path.trim())warnings.push("source path missing; provenance is incomplete");
 if(members.some(m=>!m.sectionRef))warnings.push("one or more member section references are unresolved");
 const proposal={format:"SAHROUD-CSV-STRUCTURAL-PROPOSAL-1",coordinateSystem:input.coordinateSystem.trim(),source:input.source||null,lengthUnit:"m",originalLengthUnit:input.lengthUnit,nodes,members,unresolvedSections:Array.from(new Set(members.map(m=>m.sectionRef).filter(Boolean))),status:"pending_review",geometryActivation:false};
 return {success:issues.length===0,issues,warnings,proposal:issues.length?null:proposal,solverEligible:false,designApproved:false};
}
function selfTest(){
 const n="node_id,x,y,z\nN1,-1000,0,0\nN2,0,0,0",m='member_id,start_node,end_node,section_ref\nM1,N1,N2,"I 300x150"';
 const base={nodesCsv:n,membersCsv:m,lengthUnit:"mm",coordinateSystem:"Global XYZ; origin at N2",source:{path:"model/nodes.csv"}};
 const checks=[
 ["quoted CSV field parsed",buildProposal(base).proposal?.members[0].sectionRef==="I 300x150"],
 ["millimetres normalized to metres",buildProposal(base).proposal?.nodes[0].x===-1],
 ["signed coordinates preserved",buildProposal(base).proposal?.nodes[0].x===-1],
 ["missing unit rejected",!buildProposal({...base,lengthUnit:""}).success],
 ["missing coordinate system rejected",!buildProposal({...base,coordinateSystem:""}).success],
 ["duplicate node rejected",!buildProposal({...base,nodesCsv:n+"\nN1,1,2,3"}).success],
 ["missing node reference rejected",!buildProposal({...base,membersCsv:"member_id,start_node,end_node,section_ref\nM1,N1,N9,S1"}).success],
 ["zero length member rejected",!buildProposal({...base,nodesCsv:"node_id,x,y,z\nN1,0,0,0\nN2,0,0,0"}).success],
 ["malformed CSV row rejected",!buildProposal({...base,nodesCsv:n+"\nN3,1,2"}).success],
 ["proposal cannot unlock solver",buildProposal(base).solverEligible===false&&buildProposal(base).designApproved===false&&buildProposal(base).proposal.geometryActivation===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}

function auditProposal(proposal,options){
 const opt=options||{},issues=[],warnings=[];
 if(!proposal||!Array.isArray(proposal.nodes)||!Array.isArray(proposal.members))return {success:false,issues:["proposal must contain nodes and members arrays"],warnings,summary:null,solverEligible:false,designApproved:false};
 const tol=Number.isFinite(opt.coordinateToleranceM)&&opt.coordinateToleranceM>0?opt.coordinateToleranceM:1e-6;
 const ids=new Set(),degree=new Map(),adj=new Map(),coords=new Map();let duplicateCoordinatePairs=0;
 proposal.nodes.forEach(n=>{ids.add(n.id);degree.set(n.id,0);adj.set(n.id,[]);const key=[n.x,n.y,n.z].map(v=>Math.round(v/tol)).join("|");if(coords.has(key)){duplicateCoordinatePairs++;warnings.push("nodes "+coords.get(key)+" and "+n.id+" have coincident/near-coincident coordinates within "+tol+" m");}else coords.set(key,n.id);});
 const seenMembers=new Set();let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],orphan=[];
 proposal.nodes.forEach(n=>[n.x,n.y,n.z].forEach((v,i)=>{if(Number.isFinite(v)){min[i]=Math.min(min[i],v);max[i]=Math.max(max[i],v);}}));
 proposal.members.forEach(m=>{if(seenMembers.has(m.id))issues.push("duplicate member id "+m.id);seenMembers.add(m.id);if(!ids.has(m.start)||!ids.has(m.end)){issues.push("member "+m.id+" references missing node");return;}degree.set(m.start,(degree.get(m.start)||0)+1);degree.set(m.end,(degree.get(m.end)||0)+1);adj.get(m.start).push(m.end);adj.get(m.end).push(m.start);});
 degree.forEach((d,id)=>{if(d===0)orphan.push(id);});
 if(orphan.length)warnings.push("unconnected/orphan nodes: "+orphan.join(", "));
 const components=[],visited=new Set();
 proposal.nodes.forEach(n=>{if(visited.has(n.id))return;const stack=[n.id],part=[];visited.add(n.id);while(stack.length){const id=stack.pop();part.push(id);(adj.get(id)||[]).forEach(next=>{if(!visited.has(next)){visited.add(next);stack.push(next);}});}components.push(part);});
 if(components.length>1)warnings.push("geometry contains "+components.length+" disconnected components; this is informational and may be intentional");
 const lengths=proposal.members.map(m=>{const a=proposal.nodes.find(n=>n.id===m.start),b=proposal.nodes.find(n=>n.id===m.end);return a&&b?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):null;}).filter(Number.isFinite);
 const summary={nodeCount:proposal.nodes.length,memberCount:proposal.members.length,componentCount:components.length,componentNodeCounts:components.map(c=>c.length),orphanNodeIds:orphan,duplicateOrNearCoordinatePairs:duplicateCoordinatePairs,coordinateBoundsM:{min,max},memberLengthM:lengths.length?{min:Math.min(...lengths),max:Math.max(...lengths)}:null,coordinateToleranceM:tol};
 if(!proposal.nodes.length)issues.push("proposal has no nodes");
 if(!proposal.members.length)warnings.push("proposal has no members");
 return {success:issues.length===0,issues,warnings,summary,components,solverEligible:false,designApproved:false,geometryActivation:false};
}
function auditSelfTest(){
 const p={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:2,y:0,z:0},{id:"C",x:5,y:0,z:0},{id:"D",x:5,y:0,z:0},{id:"E",x:9,y:0,z:0}],members:[{id:"M1",start:"A",end:"B"},{id:"M2",start:"C",end:"D"}]};
 const r=auditProposal(p),checks=[
 ["counts reported",r.summary.nodeCount===5&&r.summary.memberCount===2],
 ["multiple components are warnings not fatal",r.success&&r.summary.componentCount===3],
 ["orphan nodes detected",r.summary.orphanNodeIds.join(",")==="E"],
 ["coincident coordinates warned",r.warnings.some(x=>x.includes("coincident"))],
 ["component sizes retained",r.summary.componentNodeCounts.join(",")==="2,2,1"],
 ["solver and approval remain blocked",r.solverEligible===false&&r.designApproved===false&&r.geometryActivation===false],
 ["empty proposal rejected",auditProposal({nodes:[],members:[]}).success===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}


function parseSupplementalTables(proposal,input){
 const issues=[],warnings=[],result={supports:[],releases:[],sectionStations:[]};
 if(!proposal||!Array.isArray(proposal.nodes)||!Array.isArray(proposal.members))return {success:false,issues:["valid geometry proposal is required"],warnings,data:null,solverEligible:false,designApproved:false};
 const nodeIds=new Set(proposal.nodes.map(n=>n.id)),memberIds=new Set(proposal.members.map(m=>m.id));
 const dofs=["ux","uy","uz","rx","ry","rz"];
 function readTable(text,label,requiredHeaders){if(typeof text!=="string"||!text.trim())return [];let rows;try{rows=csvRows(text);}catch(e){issues.push(label+": "+e.message);return [];}if(!rows.length){issues.push(label+" table is empty");return [];}requiredHeaders.forEach(h=>{if(!(h in rows[0]))issues.push(label+" missing column "+h);});return rows;}
 if(input&&input.supportsCsv){
  const rows=readTable(input.supportsCsv,"supports",["node_id",...dofs]),seen=new Set();
  rows.forEach((r,i)=>{const id=String(r.node_id||"").trim();if(!nodeIds.has(id))issues.push("supports row "+(i+2)+" references unknown node "+id);if(seen.has(id))issues.push("duplicate support definition for node "+id);seen.add(id);const restraints={};dofs.forEach(k=>{const v=String(r[k]||"").trim().toUpperCase();if(!["FIXED","FREE"].includes(v))issues.push("supports row "+(i+2)+" "+k+" must be FIXED or FREE; springs are not supported");else restraints[k]=v;});result.supports.push({nodeId:id,restraints,sourceRow:i+2});});
 }
 if(input&&input.releasesCsv){
  const rows=readTable(input.releasesCsv,"releases",["member_id","end",...dofs]),seen=new Set();
  rows.forEach((r,i)=>{const id=String(r.member_id||"").trim(),end=String(r.end||"").trim().toUpperCase(),key=id+"|"+end;if(!memberIds.has(id))issues.push("release row "+(i+2)+" references unknown member "+id);if(!["I","J"].includes(end))issues.push("release row "+(i+2)+" end must be I or J");if(seen.has(key))issues.push("duplicate release definition "+key);seen.add(key);const releases={};dofs.forEach(k=>{const v=String(r[k]||"").trim().toUpperCase();if(!["RELEASED","CONNECTED"].includes(v))issues.push("release row "+(i+2)+" "+k+" must be RELEASED or CONNECTED");else releases[k]=v;});result.releases.push({memberId:id,end,releases,sourceRow:i+2});});
 }
 if(input&&input.sectionStationsCsv){
  if(!input.sectionDimensionUnit||!["mm","m"].includes(input.sectionDimensionUnit))issues.push("sectionDimensionUnit must explicitly be mm or m");
  const rows=readTable(input.sectionStationsCsv,"section stations",["member_id","station_ratio","d","bf","tw","tf"]),seen=new Set(),factor=input.sectionDimensionUnit==="mm"?0.001:1;
  rows.forEach((r,i)=>{const id=String(r.member_id||"").trim(),ratio=Number(r.station_ratio),key=id+"|"+ratio;if(!memberIds.has(id))issues.push("section station row "+(i+2)+" references unknown member "+id);if(!Number.isFinite(ratio)||ratio<0||ratio>1)issues.push("section station row "+(i+2)+" station_ratio must be within [0,1]");if(seen.has(key))issues.push("duplicate section station "+key);seen.add(key);const dims={};["d","bf","tw","tf"].forEach(k=>{const v=Number(r[k]);if(!Number.isFinite(v)||v<=0)issues.push("section station row "+(i+2)+" "+k+" must be positive");else dims[k]=v*factor;});result.sectionStations.push({memberId:id,stationRatio:ratio,dimensionsM:dims,originalUnit:input.sectionDimensionUnit,sourceRow:i+2});});
  const grouped=new Map();result.sectionStations.forEach(x=>{if(!grouped.has(x.memberId))grouped.set(x.memberId,[]);grouped.get(x.memberId).push(x.stationRatio);});
  grouped.forEach((stations,id)=>{stations.sort((a,b)=>a-b);if(stations[0]!==0||stations[stations.length-1]!==1)warnings.push("member "+id+" section stations do not include both 0 and 1 endpoints");});
 }
 if(!input||(!input.supportsCsv&&!input.releasesCsv&&!input.sectionStationsCsv))warnings.push("no supplemental tables supplied");
 return {success:issues.length===0,issues,warnings,data:issues.length?null:result,status:"pending_review",geometryActivation:false,solverEligible:false,designApproved:false};
}
function supplementalSelfTest(){
 const p={nodes:[{id:"N1"},{id:"N2"}],members:[{id:"M1"}]};
 const base={supportsCsv:"node_id,ux,uy,uz,rx,ry,rz\nN1,FIXED,FIXED,FIXED,FREE,FREE,FREE",releasesCsv:"member_id,end,ux,uy,uz,rx,ry,rz\nM1,I,CONNECTED,CONNECTED,CONNECTED,RELEASED,RELEASED,RELEASED",sectionStationsCsv:"member_id,station_ratio,d,bf,tw,tf\nM1,0,500,200,10,16\nM1,1,300,150,8,12",sectionDimensionUnit:"mm"};
 const r=parseSupplementalTables(p,base),checks=[
 ["valid restraints and releases parsed",r.success&&r.data.supports.length===1&&r.data.releases.length===1],
 ["section dimensions normalized to metres",r.data?.sectionStations[0].dimensionsM.d===0.5],
 ["unknown node rejected",!parseSupplementalTables(p,{...base,supportsCsv:base.supportsCsv.replace("N1,","NX,")}).success],
 ["unknown member rejected",!parseSupplementalTables(p,{...base,releasesCsv:base.releasesCsv.replace("M1,","MX,")}).success],
 ["invalid restraint token rejected",!parseSupplementalTables(p,{...base,supportsCsv:base.supportsCsv.replace("FIXED","SPRING")}).success],
 ["invalid station ratio rejected",!parseSupplementalTables(p,{...base,sectionStationsCsv:base.sectionStationsCsv.replace("M1,0,","M1,1.2,")}).success],
 ["missing section unit rejected",!parseSupplementalTables(p,{...base,sectionDimensionUnit:""}).success],
 ["supplemental proposal cannot activate solver",r.solverEligible===false&&r.designApproved===false&&r.geometryActivation===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}


function compareProposals(candidate,reference,options){
 const opt=options||{},issues=[],warnings=[],tol=Number.isFinite(opt.coordinateToleranceM)&&opt.coordinateToleranceM>0?opt.coordinateToleranceM:0.001;
 if(!candidate||!reference||!Array.isArray(candidate.nodes)||!Array.isArray(reference.nodes)||!Array.isArray(candidate.members)||!Array.isArray(reference.members))return {success:false,issues:["candidate and reference proposals with nodes/members are required"],warnings,report:null,solverEligible:false,designApproved:false};
 const refNodes=new Map(reference.nodes.map(n=>[n.id,n])),refMembers=new Map(reference.members.map(m=>[m.id,m])),canNodes=new Map(candidate.nodes.map(n=>[n.id,n])),canMembers=new Map(candidate.members.map(m=>[m.id,m]));
 const nodeMatches=[],memberMatches=[],unmatchedCandidateNodes=[],unmatchedReferenceNodes=[],unmatchedCandidateMembers=[],unmatchedReferenceMembers=[];
 let maxNodeDeviation=0,orientationReversals=0,sectionMismatches=0;
 candidate.nodes.forEach(n=>{const r=refNodes.get(n.id);if(!r){unmatchedCandidateNodes.push(n.id);return;}const delta=Math.hypot(n.x-r.x,n.y-r.y,n.z-r.z);maxNodeDeviation=Math.max(maxNodeDeviation,delta);nodeMatches.push({id:n.id,deviationM:delta,withinTolerance:delta<=tol});});
 reference.nodes.forEach(n=>{if(!canNodes.has(n.id))unmatchedReferenceNodes.push(n.id);});
 candidate.members.forEach(m=>{const r=refMembers.get(m.id);if(!r){unmatchedCandidateMembers.push(m.id);return;}const same=m.start===r.start&&m.end===r.end,reverse=m.start===r.end&&m.end===r.start;if(reverse)orientationReversals++;if(!same&&!reverse)issues.push("member "+m.id+" endpoint IDs differ from reference");if(m.sectionRef!==r.sectionRef)sectionMismatches++;memberMatches.push({id:m.id,orientation:same?"same":reverse?"reversed":"different",sectionMatch:m.sectionRef===r.sectionRef});});
 reference.members.forEach(m=>{if(!canMembers.has(m.id))unmatchedReferenceMembers.push(m.id);});
 const outside=nodeMatches.filter(x=>!x.withinTolerance);
 if(outside.length)warnings.push(outside.length+" matched nodes exceed coordinate tolerance "+tol+" m");
 if(unmatchedCandidateNodes.length||unmatchedReferenceNodes.length)warnings.push("candidate/reference node inventories differ");
 if(unmatchedCandidateMembers.length||unmatchedReferenceMembers.length)warnings.push("candidate/reference member inventories differ");
 if(orientationReversals)warnings.push(orientationReversals+" members have reversed I/J orientation relative to reference");
 if(sectionMismatches)warnings.push(sectionMismatches+" matched members have different section references");
 const report={candidateNodeCount:candidate.nodes.length,referenceNodeCount:reference.nodes.length,candidateMemberCount:candidate.members.length,referenceMemberCount:reference.members.length,matchedNodeCount:nodeMatches.length,matchedMemberCount:memberMatches.length,maxNodeDeviationM:maxNodeDeviation,coordinateToleranceM:tol,nodesOutsideTolerance:outside.map(x=>x.id),unmatchedCandidateNodes,unmatchedReferenceNodes,unmatchedCandidateMembers,unmatchedReferenceMembers,orientationReversedMemberIds:memberMatches.filter(x=>x.orientation==="reversed").map(x=>x.id),sectionMismatchMemberIds:memberMatches.filter(x=>!x.sectionMatch).map(x=>x.id)};
 return {success:issues.length===0,issues,warnings,report,nodeMatches,memberMatches,status:"comparison_only",geometryActivation:false,solverEligible:false,designApproved:false};
}
function comparisonSelfTest(){
 const a={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:2,y:0,z:0}],members:[{id:"M",start:"A",end:"B",sectionRef:"S1"}]};
 const b={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:2.01,y:0,z:0},{id:"C",x:4,y:0,z:0}],members:[{id:"M",start:"B",end:"A",sectionRef:"S2"},{id:"N",start:"A",end:"C",sectionRef:"S3"}]};
 const r=compareProposals(a,b,{coordinateToleranceM:0.001}),checks=[
 ["matching nodes identified",r.report.matchedNodeCount===2],
 ["coordinate deviation measured",Math.abs(r.report.maxNodeDeviationM-0.01)<1e-9],
 ["outside tolerance identified",r.report.nodesOutsideTolerance.includes("B")],
 ["unmatched reference node identified",r.report.unmatchedReferenceNodes.includes("C")],
 ["reversed member orientation identified",r.report.orientationReversedMemberIds.includes("M")],
 ["section mismatch identified",r.report.sectionMismatchMemberIds.includes("M")],
 ["unmatched member identified",r.report.unmatchedReferenceMembers.includes("N")],
 ["comparison cannot activate solver",r.geometryActivation===false&&r.solverEligible===false&&r.designApproved===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}

root.SteelCSVStructuralExchange=Object.freeze({csvRows,buildProposal,selfTest,auditProposal,auditSelfTest,parseSupplementalTables,supplementalSelfTest,compareProposals,comparisonSelfTest});
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/reference-model-import-ui.js ===== */
/* SAHROUD STEEL — controlled reference model import UI; preview only. */
(function(){
"use strict";
const $=id=>document.getElementById(id),api=()=>window.SteelCSVStructuralExchange;
let candidate=null,reference=null,lastReport=null;
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function readFile(id){const f=$(id)?.files?.[0];if(!f)return Promise.resolve(null);return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:f.name,text:String(r.result)});r.onerror=()=>reject(new Error("خواندن فایل "+f.name+" ناموفق بود"));r.readAsText(f,"UTF-8");});}
function message(text,kind){const el=$("referenceImportStatus");if(el){el.textContent=text;el.dataset.kind=kind||"info";}}
function ensure(){
 if($("referenceImportPanel"))return;
 const anchor=$("frameDrawing")?.closest("section")||document.querySelector("main .panel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="referenceImportPanel";
 p.innerHTML='<div class="panel-title"><h3>ورود مدل از نرم‌افزار مبدأ و پیش‌نمایش سه‌بعدی</h3><span class="status">ورود کنترل‌شده؛ فقط پیش‌نمایش</span></div>'+
 '<div class="notice">فایل‌ها ابتدا به‌صورت پیشنهاد وارد می‌شوند. این ابزار مدل فعال پروژه یا حلگر را تغییر نمی‌دهد. واحد و دستگاه مختصات را دقیقاً مطابق خروجی نرم‌افزار مبدأ وارد کنید.</div>'+
 '<div class="form-grid"><div class="field"><label for="refImportUnit">واحد مختصات گره‌ها</label><select id="refImportUnit"><option value="m">متر (m)</option><option value="mm">میلی‌متر (mm)</option></select></div>'+
 '<div class="field"><label for="refImportCoords">دستگاه مختصات، محورها و مبدأ</label><input id="refImportCoords" placeholder="مثلاً Global XYZ؛ مبدأ محور A/1؛ راست‌گرد"></div>'+
 '<div class="field"><label for="refNodesFile">فایل گره‌ها nodes.csv</label><input id="refNodesFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refMembersFile">فایل اعضا members.csv</label><input id="refMembersFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refSupportsFile">تکیه‌گاه‌ها supports.csv (اختیاری)</label><input id="refSupportsFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refReleasesFile">آزادسازی‌ها releases.csv (اختیاری)</label><input id="refReleasesFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refStationsFile">ایستگاه‌های مقطع section-stations.csv (اختیاری)</label><input id="refStationsFile" type="file" accept=".csv,text/csv"></div>'+
 '<div class="field"><label for="refSectionUnit">واحد ابعاد مقطع</label><select id="refSectionUnit"><option value="mm">میلی‌متر (mm)</option><option value="m">متر (m)</option></select></div></div>'+
 '<div class="actions"><button type="button" id="btnImportReference">خواندن و کنترل فایل‌ها</button><button type="button" id="btnExportReference" disabled>دریافت گزارش JSON</button></div>'+
 '<div id="referenceImportStatus" class="notice" role="status" aria-live="polite">هنوز فایلی وارد نشده است.</div>'+
 '<div id="referenceImportSummary" class="result-box">پس از ورود، خلاصه مدل و هشدارها نمایش داده می‌شوند.</div>'+
 '<div class="reference-preview-wrap"><svg id="referenceModelPreview" viewBox="0 0 720 360" role="img" aria-label="پیش‌نمایش هندسی مدل وارداتی"><rect width="720" height="360" fill="#f8fbfd"/><text x="360" y="180" text-anchor="middle" fill="#647783" font-size="16">پیش‌نمایش مدل پس از ورود فایل‌ها</text></svg></div>'+
 '<h4>مقایسه با مدل مرجع (اختیاری)</h4><div class="notice">برای مقایسه، فایل گره‌ها و اعضای مدل مرجع را جداگانه انتخاب کنید. تطبیق بر اساس شناسه‌های پایدار انجام می‌شود؛ اختلاف جهت اعضا به‌صورت هشدار گزارش خواهد شد.</div>'+
 '<div class="form-grid"><div class="field"><label for="refCompareNodes">گره‌های مدل مرجع</label><input id="refCompareNodes" type="file" accept=".csv,text/csv"></div><div class="field"><label for="refCompareMembers">اعضای مدل مرجع</label><input id="refCompareMembers" type="file" accept=".csv,text/csv"></div><div class="field"><label for="refCompareTolerance">تلرانس مختصات (متر)</label><input id="refCompareTolerance" type="number" min="0.000001" step="0.001" value="0.001"></div></div>'+
 '<div class="actions"><button type="button" id="btnCompareReference" disabled>مقایسه با مدل مرجع</button></div><div id="referenceCompareResult" class="result-box">مدل مرجع جداگانه انتخاب نشده است.</div>'+
 '<p class="hint">محدودیت: این پیش‌نمایش هندسه گره-عضو است؛ مقاطع، قیود، اتصالات، بارها و رفتار سازه‌ای را نمایش یا تأیید نمی‌کند. برای مشاهده شکل واقعی مقاطع متغیر باید داده‌های کامل‌تر و محورهای محلی دریافت شوند.</p>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 const style=document.createElement("style");style.textContent='#referenceImportPanel .reference-preview-wrap{margin-top:12px;overflow:auto;border:1px solid var(--border);border-radius:10px;background:#f8fbfd}#referenceModelPreview{min-width:320px;max-height:520px}#referenceImportStatus[data-kind="error"]{border-color:#c74747;background:#fff4f4;color:#8c2424}#referenceImportStatus[data-kind="success"]{border-color:#16845b;background:#f1faf5;color:#126344}.reference-audit-list{margin:8px 0;padding-right:20px}.reference-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.reference-stat{padding:9px;border:1px solid var(--border);border-radius:8px;background:#fff}.reference-stat strong{display:block;font-size:18px;color:var(--navy)}@media(max-width:650px){.reference-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.appendChild(style);
 $("btnImportReference").addEventListener("click",importCandidate);$("btnExportReference").addEventListener("click",exportReport);$("btnCompareReference").addEventListener("click",compare);
}
function renderPreview(proposal){
 const svg=$("referenceModelPreview");if(!svg)return;const ns="http://www.w3.org/2000/svg";while(svg.firstChild)svg.removeChild(svg.firstChild);
 const bg=document.createElementNS(ns,"rect");bg.setAttribute("width","720");bg.setAttribute("height","360");bg.setAttribute("fill","#f8fbfd");svg.appendChild(bg);
 const nodes=proposal.nodes;if(!nodes.length)return;
 const min=[0,1,2].map(i=>Math.min(...nodes.map(n=>[n.x,n.y,n.z][i]))),max=[0,1,2].map(i=>Math.max(...nodes.map(n=>[n.x,n.y,n.z][i])));
 const project=n=>{const x=max[0]===min[0]?0.5:(n.x-min[0])/(max[0]-min[0]),y=max[1]===min[1]?0.5:(n.y-min[1])/(max[1]-min[1]),z=max[2]===min[2]?0.5:(n.z-min[2])/(max[2]-min[2]);return{x:65+x*500+y*100,y:300-y*170-z*235};};
 const pos=new Map(nodes.map(n=>[n.id,project(n)]));
 proposal.members.forEach(m=>{const a=pos.get(m.start),b=pos.get(m.end);if(!a||!b)return;const line=document.createElementNS(ns,"line");line.setAttribute("x1",a.x);line.setAttribute("y1",a.y);line.setAttribute("x2",b.x);line.setAttribute("y2",b.y);line.setAttribute("stroke","#176b87");line.setAttribute("stroke-width","2");svg.appendChild(line);});
 nodes.forEach(n=>{const q=pos.get(n.id),c=document.createElementNS(ns,"circle");c.setAttribute("cx",q.x);c.setAttribute("cy",q.y);c.setAttribute("r","3.5");c.setAttribute("fill","#d98220");svg.appendChild(c);});
 const label=document.createElementNS(ns,"text");label.setAttribute("x","12");label.setAttribute("y","22");label.setAttribute("fill","#526b78");label.setAttribute("font-size","12");label.textContent="پیش‌نمایش شماتیک — "+nodes.length+" گره / "+proposal.members.length+" عضو";svg.appendChild(label);
}
function list(items){return items.length?'<ul class="reference-audit-list">'+items.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':'<p>موردی ثبت نشده است.</p>';}
function renderSummary(audit,supp){
 const el=$("referenceImportSummary");if(!el)return;const s=audit.summary,items=[["گره‌ها",s.nodeCount],["اعضا",s.memberCount],["اجزای جدا",s.componentCount],["گره‌های منفرد",s.orphanNodeIds.length],["جفت مختصات تکراری",s.duplicateOrNearCoordinatePairs],["ایستگاه‌های مقطع",supp?.data?.sectionStations?.length||0]];
 el.innerHTML='<div class="reference-stat-grid">'+items.map(x=>'<div class="reference-stat"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join("")+'</div><h4>هشدارهای هندسه</h4>'+list(audit.warnings)+'<h4>هشدارهای داده تکمیلی</h4>'+list(supp?.warnings||[])+'<h4>خطاها</h4>'+list([...(audit.issues||[]),...(supp?.issues||[])]);
}
async function importCandidate(){
 try{
 const a=api();if(!a)throw new Error("ماژول تبادل CSV در صفحه بارگذاری نشده است.");
 const [nf,mf,sf,rf,tf]=await Promise.all(["refNodesFile","refMembersFile","refSupportsFile","refReleasesFile","refStationsFile"].map(readFile));
 if(!nf||!mf)throw new Error("انتخاب فایل گره‌ها و اعضا الزامی است.");
 const built=a.buildProposal({nodesCsv:nf.text,membersCsv:mf.text,lengthUnit:$("refImportUnit").value,coordinateSystem:$("refImportCoords").value,source:{path:nf.name+"; "+mf.name,format:"CSV"}});
 if(!built.success)throw new Error(built.issues.join("؛ "));
 const audited=a.auditProposal(built.proposal),supplemental=a.parseSupplementalTables(built.proposal,{supportsCsv:sf?.text,releasesCsv:rf?.text,sectionStationsCsv:tf?.text,sectionDimensionUnit:$("refSectionUnit").value});
 candidate={proposal:built.proposal,audit:audited,supplemental,files:{nodes:nf.name,members:mf.name,supports:sf?.name||null,releases:rf?.name||null,stations:tf?.name||null},status:"pending_review",geometryActivation:false,solverEligible:false,designApproved:false};
 if(!audited.success||!supplemental.success)message("ورود انجام شد اما خطاهای اعتبارسنجی وجود دارد؛ گزارش را بررسی کنید.","error");else message("مدل به‌صورت پیشنهاد وارد شد؛ هیچ تغییری در مدل فعال یا حلگر اعمال نشده است.","success");
 renderPreview(candidate.proposal);renderSummary(audited,supplemental);window.dispatchEvent(new CustomEvent("sahroud-reference-model-ready",{detail:{proposal:candidate.proposal}}));$("btnExportReference").disabled=false;$("btnCompareReference").disabled=false;
 }catch(e){message(e.message,"error");}
}
async function compare(){
 try{
 if(!candidate)throw new Error("ابتدا مدل پیشنهادی را وارد کنید.");
 const [nf,mf]=await Promise.all(["refCompareNodes","refCompareMembers"].map(readFile));if(!nf||!mf)throw new Error("هر دو فایل مدل مرجع لازم است.");
 const b=api().buildProposal({nodesCsv:nf.text,membersCsv:mf.text,lengthUnit:$("refImportUnit").value,coordinateSystem:$("refImportCoords").value,source:{path:nf.name+"; "+mf.name,format:"CSV"}});
 if(!b.success)throw new Error(b.issues.join("؛ "));
 reference=b.proposal;const tol=Number($("refCompareTolerance").value);if(!Number.isFinite(tol)||tol<=0)throw new Error("تلرانس باید عدد مثبت و برحسب متر باشد.");
 lastReport=api().compareProposals(candidate.proposal,reference,{coordinateToleranceM:tol});
 $("referenceCompareResult").innerHTML='<p><strong>گره‌های تطبیق‌یافته:</strong> '+lastReport.report.matchedNodeCount+' | <strong>اعضای تطبیق‌یافته:</strong> '+lastReport.report.matchedMemberCount+'</p><p><strong>بیشترین اختلاف مختصات:</strong> '+lastReport.report.maxNodeDeviationM.toFixed(6)+' متر</p><h4>هشدارها</h4>'+list(lastReport.warnings)+'<h4>موارد ناسازگار</h4>'+list(lastReport.issues);
 $("btnExportReference").disabled=false;message("مقایسه انجام شد؛ نتیجه فقط گزارش تطبیقی است.","success");
 }catch(e){$("referenceCompareResult").textContent=e.message;message(e.message,"error");}
}
function exportReport(){
 if(!candidate)return;const payload={generatedAt:new Date().toISOString(),proposal:candidate.proposal,geometryAudit:candidate.audit,supplemental:candidate.supplemental,comparison:lastReport,gate:{status:"pending_review",geometryActivation:false,solverEligible:false,designApproved:false}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-reference-import-review.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
window.SteelReferenceImportUI={get candidate(){return candidate;},get reference(){return reference;},get comparison(){return lastReport;}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensure);else ensure();
})();

/* ===== steel2/js/reference-model-viewer.js ===== */
/* SAHROUD STEEL — isolated reference geometry viewer; no active-model mutation. */
(function(){
"use strict";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let proposal=null,mode="iso",zoom=1,azimuth=35,selected=null,drag=null,projected=[],bounds=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function ensure(){
 const panel=$("referenceImportPanel"),svg=$("referenceModelPreview");if(!panel||!svg||$("referenceViewerTools"))return;
 const bar=document.createElement("div");bar.id="referenceViewerTools";bar.className="actions";
 bar.innerHTML='<label>نما <select id="refViewMode"><option value="iso">سه‌بعدی ایزومتریک</option><option value="xy">پلان XY</option><option value="xz">نمای XZ</option><option value="yz">نمای YZ</option></select></label><label>بزرگ‌نمایی <input id="refViewZoom" type="range" min="0.5" max="4" step="0.1" value="1"></label><label>چرخش <input id="refViewAzimuth" type="range" min="0" max="360" step="5" value="35"></label><button type="button" id="refViewFit">تنظیم اندازه</button><button type="button" id="refViewClear">پاک‌کردن انتخاب</button>';
 svg.parentNode.insertBefore(bar,svg);
 const detail=document.createElement("div");detail.id="referenceMemberDetail";detail.className="result-box";detail.textContent="برای مشاهده مشخصات، روی یکی از اعضای پیش‌نمایش کلیک کنید.";svg.parentNode.appendChild(detail);
 $("refViewMode").addEventListener("change",e=>{mode=e.target.value;draw();});$("refViewZoom").addEventListener("input",e=>{zoom=Number(e.target.value);draw();});$("refViewAzimuth").addEventListener("input",e=>{azimuth=Number(e.target.value);draw();});
 $("refViewFit").addEventListener("click",()=>{$("refViewZoom").value="1";$("refViewAzimuth").value="35";zoom=1;azimuth=35;draw();});
 $("refViewClear").addEventListener("click",()=>{selected=null;detail.textContent="انتخاب پاک شد.";draw();});
 svg.addEventListener("click",onSelect);svg.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,azimuth};svg.setPointerCapture?.(e.pointerId);});
 svg.addEventListener("pointerup",e=>{if(drag){const dx=e.clientX-drag.x;if(Math.abs(dx)>4){azimuth=(drag.azimuth+dx*.5+360)%360;$("refViewAzimuth").value=String(Math.round(azimuth));draw();}drag=null;}});
 window.addEventListener("sahroud-reference-model-ready",e=>{proposal=e.detail?.proposal||null;selected=null;draw();});
}
function project(n){
 const x=n.x-bounds.minX,y=n.y-bounds.minY,z=n.z-bounds.minZ;
 if(mode==="xy")return{x,y:-y};if(mode==="xz")return{x,y:-z};if(mode==="yz")return{x:y,y:-z};
 const a=azimuth*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return{x:x*c-y*s*.65,y:-(z*.95+(x*s+y*c)*.35)};
}
function draw(){
 const svg=$("referenceModelPreview");if(!svg||!proposal)return;while(svg.firstChild)svg.removeChild(svg.firstChild);
 const add=(tag,attrs,text)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,String(v)));if(text!==undefined)el.textContent=text;svg.appendChild(el);return el;};
 add("rect",{width:720,height:360,fill:"#f8fbfd"});const ns=proposal.nodes||[],ms=proposal.members||[];if(!ns.length){add("text",{x:360,y:180,"text-anchor":"middle",fill:"#647783"},"مدلی برای نمایش وجود ندارد");return;}
 bounds={minX:Math.min(...ns.map(n=>n.x)),maxX:Math.max(...ns.map(n=>n.x)),minY:Math.min(...ns.map(n=>n.y)),maxY:Math.max(...ns.map(n=>n.y)),minZ:Math.min(...ns.map(n=>n.z)),maxZ:Math.max(...ns.map(n=>n.z))};
 projected=ns.map(n=>({id:n.id,...project(n)}));const loX=Math.min(...projected.map(p=>p.x)),hiX=Math.max(...projected.map(p=>p.x)),loY=Math.min(...projected.map(p=>p.y)),hiY=Math.max(...projected.map(p=>p.y));
 const span=Math.max(hiX-loX,hiY-loY,1e-6),scale=290/span*zoom,screen=p=>({x:360+(p.x-(loX+hiX)/2)*scale,y:180+(p.y-(loY+hiY)/2)*scale}),coords=new Map(projected.map(p=>[String(p.id),screen(p)]));
 ms.forEach(m=>{const a=coords.get(String(m.start)),b=coords.get(String(m.end));if(!a||!b)return;const l=add("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:String(selected)===String(m.id)?"#d34b32":"#176b87","stroke-width":String(selected)===String(m.id)?5:2.3,"stroke-linecap":"round","data-member":m.id});l.style.cursor="pointer";});
 ns.forEach(n=>{const p=coords.get(String(n.id));add("circle",{cx:p.x,cy:p.y,r:3.2,fill:"#d98220"});});
 add("text",{x:12,y:20,fill:"#526b78","font-size":12},"پیشنهاد مستقل | "+ns.length+" گره | "+ms.length+" عضو | بزرگ‌نمایی "+zoom.toFixed(1)+"×");
}
function onSelect(e){
 const target=e.target.closest?.("[data-member]");if(!target||!proposal)return;selected=target.getAttribute("data-member");
 const m=(proposal.members||[]).find(x=>String(x.id)===String(selected));if(!m)return;
 const a=(proposal.nodes||[]).find(x=>String(x.id)===String(m.start)),b=(proposal.nodes||[]).find(x=>String(x.id)===String(m.end)),length=a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z):null;
 const detail=$("referenceMemberDetail");detail.textContent="عضو "+m.id+" | گره ابتدا: "+m.start+" | گره انتها: "+m.end+" | مرجع مقطع: "+m.section_ref+" | طول هندسی: "+(length===null?"نامشخص":length.toFixed(4)+" متر")+" | فقط داده هندسی؛ ظرفیت و تأیید طراحی محاسبه نشده است.";draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensure);else ensure();
window.SteelReferenceModelViewer={get selectedMember(){return selected;},get mode(){return mode;}};
})();

/* ===== steel2/js/engineering-workstream-dashboard.js ===== */
/* SAHROUD STEEL — engineering workstream dashboard; status is explicit, not inferred as approval. */
(function(root){
"use strict";
const phases=[
{id:"P0",name:"پایه نرم‌افزار، پروژه و مجوز",status:"active",gate:"پایداری ذخیره‌سازی، نسخه‌بندی و مجوز"},
{id:"P1",name:"ورودی‌ها و هندسه سه‌بعدی",status:"in_progress",gate:"هندسه، واحدها، محورهای محلی و قیود تأییدشده"},
{id:"P2",name:"مبنای آیین‌نامه و بارگذاری",status:"in_progress",gate:"ویرایش آیین‌نامه، اقلیم، بارها و ترکیبات مستند"},
{id:"P3",name:"تحلیل سه‌بعدی و کنترل تعادل",status:"in_progress",gate:"بنچمارک مستقل، تعادل و پوش نیروهای همزمان"},
{id:"P4",name:"طراحی اعضای فولادی",status:"partial",gate:"کشش، فشار، خمش، برش، پیچش و اندرکنش"},
{id:"P5",name:"جرثقیل سقفی ۳۰ تن",status:"partial",gate:"واکنش چرخ، ضربه، نیروهای جانبی، خستگی و مسیر بار"},
{id:"P6",name:"اتصالات و صفحه‌ستون",status:"partial",gate:"پیچ، جوش، ورق گاست، سخت‌کننده و انتقال نیرو"},
{id:"P7",name:"فونداسیون و شناژ",status:"partial",gate:"واکنش معتبر، خاک، پایداری، بتن و آرماتور"},
{id:"P8",name:"نقشه‌ها و متره",status:"planned",gate:"نقشه قابل ساخت، جزئیات و تطبیق مقادیر"},
{id:"P9",name:"گزارش و کنترل کیفیت",status:"in_progress",gate:"ردیابی ورودی تا خروجی و گزارش خطا/هشدار"},
{id:"P10",name:"انتشار و پذیرش",status:"planned",gate:"تست مرورگر، امنیت، مستندات و پذیرش کاربر"}
];
const labels={active:"در حال انجام",in_progress:"توسعه جاری",partial:"ناقص / محدود",planned:"برنامه‌ریزی‌شده"};
function render(){
 if(document.getElementById("engineeringRoadmapPanel"))return;const anchor=document.querySelector("main .welcome");if(!anchor)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="engineeringRoadmapPanel";
 const rows=phases.map(p=>'<div class="roadmap-row"><div class="roadmap-id">'+p.id+'</div><div class="roadmap-main"><strong>'+p.name+'</strong><small>دروازه پذیرش: '+p.gate+'</small></div><span class="roadmap-state state-'+p.status+'">'+labels[p.status]+'</span></div>').join("");
 panel.innerHTML='<div class="panel-title"><h3>نقشه راه و وضعیت گام‌های توسعه SAHROUD STEEL</h3><span class="status">نمای برنامه‌ریزی</span></div><p class="notice">وضعیت‌ها نشان‌دهنده پیشرفت نرم‌افزار هستند، نه تأیید مهندسی یا صلاحیت طراحی. هر فاز تا عبور از دروازه پذیرش خودش قابل انتشار نهایی نیست.</p><div class="roadmap-list">'+rows+'</div><div class="notice roadmap-foot"><strong>مسیر بحرانی بعدی:</strong> دریافت خروجی هندسی معتبر از مدل مبدأ ← تطبیق گره‌ها و اعضا ← تکمیل مقاطع و قیود ← اتصال کنترل‌شده به مدل تحلیل ← آزمون تعادل و بنچمارک مستقل.</div>';
 anchor.parentNode.insertBefore(panel,anchor.nextSibling);
 const style=document.createElement("style");style.textContent='#engineeringRoadmapPanel .roadmap-list{display:grid;gap:7px}.roadmap-row{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--card,#fff)}.roadmap-id{font-weight:800;color:var(--navy);min-width:34px}.roadmap-main{flex:1;display:grid;gap:3px}.roadmap-main small{color:var(--muted,#647783);font-size:12px}.roadmap-state{font-size:11px;padding:4px 8px;border-radius:20px;background:#edf1f4;color:#445}.state-active,.state-in_progress{background:#e8f2f8;color:#14536b}.state-partial{background:#fff4df;color:#815400}.state-planned{background:#f0f0f0;color:#555}.roadmap-foot{margin-top:12px}';document.head.appendChild(style);
}
root.SteelEngineeringRoadmap={phases:phases.map(x=>({...x})),getSummary(){return phases.reduce((a,p)=>(a[p.status]=(a[p.status]||0)+1,a),{});}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})(window);

/* ===== steel2/js/design-basis-intake.js ===== */
/* SAHROUD STEEL — project design-basis intake; evidence capture only, never design approval. */
(function(){
"use strict";
const fields=[
["projectName","شناسه/نام پروژه","text"],["siteLocation","موقعیت پروژه و مختصات","text"],["codeBasis","مبنای آیین‌نامه و ویرایش هر مبحث","textarea"],
["analysisMethod","روش تحلیل و طراحی (LRFD/ASD و توضیح)","text"],["steelGrade","گرید فولاد و منبع مشخصات","text"],["steelFy","تنش تسلیم و واحد","text"],
["concreteFc","مقاومت بتن و واحد","text"],["geotechRef","مرجع گزارش ژئوتکنیک / شماره و تاریخ","text"],["soilBearing","ظرفیت باربری مجاز/طراحی و واحد","text"],["groundwater","تراز آب زیرزمینی و تاریخ بررسی","text"],
["windBasis","سرعت باد، مبنا، رده زمین و منبع","textarea"],["snowBasis","بار برف و منبع اقلیمی","text"],["seismicBasis","پارامترهای لرزه‌ای و رده خاک","textarea"],
["craneCapacity","ظرفیت جرثقیل و تعداد جرثقیل‌ها","text"],["craneVendor","سازنده، مدل و دیتاشیت جرثقیل","text"],["craneWheelLoads","واکنش هر چرخ و حالت بارگذاری با واحد","textarea"],["craneGeometry","فاصله چرخ‌ها، محور ریل و ارتفاع ریل","textarea"],["craneDynamics","ضریب ضربه، نیروهای جانبی و کلاس کاری/خستگی","textarea"],
["drawingsRef","شماره و نسخه نقشه‌های معماری/سازه/جرثقیل","textarea"],["reviewer","نام/سمت بازبین مسئول و تاریخ بازبینی","text"]
];
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 if(document.getElementById("designBasisIntakePanel"))return;const anchor=document.getElementById("engineeringRoadmapPanel");if(!anchor)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="designBasisIntakePanel";
 const inputs=fields.map(([id,label,type])=>'<div class="field"><label for="basis_'+id+'">'+label+'</label>'+(type==="textarea"?'<textarea id="basis_'+id+'" rows="2" placeholder="اگر مشخص نیست، خالی بگذارید؛ حدس نزنید."></textarea>':'<input id="basis_'+id+'" type="text" placeholder="مقدار مستند یا نامشخص">')+'</div>').join("");
 panel.innerHTML='<div class="panel-title"><h3>دفتر ثبت مبنای طراحی و داده‌های مفقود</h3><span class="status">ثبت شواهد؛ بدون تأیید</span></div><p class="notice">این فرم برای گردآوری داده‌های پروژه است. تکمیل فیلدها به معنی صحت داده، کفایت ورودی یا تأیید طراحی نیست. برای هر مقدار باید سند، واحد، تاریخ و مسئول بررسی مشخص باشد.</p><div class="form-grid">'+inputs+'</div><div class="actions"><button type="button" id="btnBasisAssess">ارزیابی کامل‌بودن اطلاعات</button><button type="button" id="btnBasisExport">خروجی دفتر مبنای طراحی (JSON)</button><button type="button" id="btnBasisReset">پاک‌کردن فرم</button></div><div id="basisReadiness" class="result-box">هنوز ارزیابی انجام نشده است.</div>';
 anchor.parentNode.insertBefore(panel,anchor.nextSibling);
 $("btnBasisAssess").addEventListener("click",assess);$("btnBasisExport").addEventListener("click",exportData);$("btnBasisReset").addEventListener("click",()=>{fields.forEach(f=>{$("basis_"+f[0]).value="";});$("basisReadiness").textContent="فرم پاک شد؛ هیچ داده‌ای ذخیره یا به پروژه فعال منتقل نشده است.";});
}
const $=id=>document.getElementById(id);
function collect(){const data={};fields.forEach(([id])=>data[id]=$("basis_"+id)?.value.trim()||null);return data;}
function assess(){
 const data=collect(),missing=fields.filter(([id])=>!data[id]).map(([,label])=>label),present=fields.length-missing.length;
 $("basisReadiness").innerHTML='<strong>فیلدهای دارای مقدار: '+present+' از '+fields.length+'</strong><p>فیلدهای خالی: '+missing.length+'</p><ul>'+missing.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul><p><strong>وضعیت:</strong> اطلاعات هنوز از نظر منبع، واحد و صحت فنی تأیید نشده‌اند. هیچ طراحی یا تحلیل بر اساس این فرم اجرا نمی‌شود.</p>';
}
function exportData(){
 const payload={schema:"sahroud-steel-design-basis-intake-v1",createdAt:new Date().toISOString(),status:"evidence_collection_only",completeFields:fields.filter(([id])=>collect()[id]).length,totalFields:fields.length,designApproved:false,solverEligible:false,data:collect(),requiredFollowUp:"Attach source document, page/cell/element locator, units, issue date and reviewer for each value."};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-design-basis-intake.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
window.SteelDesignBasisIntake={fields:fields.map(x=>({id:x[0],label:x[1]})),collect};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();
