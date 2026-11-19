/* SAHROUD STEEL — independent load-path coverage audit.
 * Audits connectivity and steel self-weight accounting; never certifies code design.
 */
(function(root){
 "use strict";
 function audit(input){
  const d=input||{},model=d.model||{},result=d.result||{},members=Array.isArray(model.members)?model.members:[],
   nodes=Array.isArray(model.nodes)?model.nodes:[],sections=d.sectionsByMemberId||{},supports=Array.isArray(d.supports)?d.supports:[];
  const blockers=[],warnings=[],nodeIds=new Set(nodes.map(n=>n.id)),memberIds=new Set(),adj=new Map();
  let invalidGeometry=0,unresolvedSections=0;
  const connect=(id,other)=>{if(!adj.has(id))adj.set(id,new Set());adj.get(id).add(other);};
  members.forEach(m=>{
   if(!m||!m.id||memberIds.has(String(m.id))){blockers.push("شناسه عضو خالی یا تکراری");return;}
   memberIds.add(String(m.id));
   if(!nodeIds.has(m.start)||!nodeIds.has(m.end)){invalidGeometry++;blockers.push("گره عضو "+m.id+" در مدل موجود نیست");return;}
   connect(m.start,m.end);connect(m.end,m.start);
   const s=sections[String(m.id)];
   if(!s||!(Number(s.A)>0))unresolvedSections++;
  });
  const reachable=new Set(),queue=supports.map(s=>s.nodeId).filter(id=>nodeIds.has(id));
  queue.forEach(id=>reachable.add(id));
  for(let i=0;i<queue.length;i++)for(const next of adj.get(queue[i])||[])if(!reachable.has(next)){reachable.add(next);queue.push(next);}
  const disconnected=members.filter(m=>nodeIds.has(m.start)&&nodeIds.has(m.end)&&(!reachable.has(m.start)||!reachable.has(m.end))).map(m=>m.id);
  if(!supports.length)blockers.push("هیچ تکیه‌گاه پایه‌ای به ممیزی داده نشده است");
  if(disconnected.length)blockers.push(disconnected.length+" عضو به شبکه متصل به پایه‌ها راه ندارد");
  if(invalidGeometry)blockers.push(invalidGeometry+" عضو دارای هندسه/گره نامعتبر است");
  if(unresolvedSections)blockers.push(unresolvedSections+" عضو خاصیت سطح مقطع قابل ممیزی ندارد");
  const sw=result.selfWeight||{},factor=Number(sw.deadLoadFactor||0);
  let expectedSelfWeightKN=0;
  if(factor>0){
   for(const m of members){
    const a=nodes.find(n=>n.id===m.start),b=nodes.find(n=>n.id===m.end),s=sections[String(m.id)];
    if(!a||!b||!s||!(Number(s.A)>0))continue;
    const L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
    expectedSelfWeightKN+=Number(s.A)*78.5*factor*L;
   }
   const actual=Number(sw.totalKN);
   if(!Number.isFinite(actual)||Math.abs(actual-expectedSelfWeightKN)>Math.max(1e-6,expectedSelfWeightKN*1e-8))
    blockers.push("جمع خودوزن فولاد با محاسبه مستقل اعضا تطبیق ندارد");
   if(Number(sw.memberCount)!==members.length)blockers.push("تعداد اعضای مشمول خودوزن با تعداد اعضای مدل برابر نیست");
  }else warnings.push("این حالت بار ضریب D مثبت ندارد؛ خودوزن فولاد در این حالت بار انتظار نمی‌رود.");
  const hasPurlins=members.some(m=>m.sectionKey==="roofPurlin");
  if(hasPurlins&&members.some(m=>m.sectionKey==="rafter"&&["dead","live","snow"].some(k=>Math.abs(Number(m.lineLoads?.[k]||0))>1e-10)))
   blockers.push("بار سطحی سقف هم‌زمان به پرلین و رفتر اعمال شده و احتمال دوباره‌شماری وجود دارد");
  const craneMembers=members.filter(m=>["craneRunway","craneRail","craneBracket"].includes(m.sectionKey)).length;
  const loadCase=String(d.loadCase||"");
  const seismicApplied=loadCase==="seismic",craneApplied=loadCase==="crane";
  if(craneApplied&&craneMembers===0)blockers.push("بار جرثقیل بدون اعضای واقعی تیر حمال/ریل/کنسول در مدل اعمال شده است");
  if(seismicApplied&&!result.externalLoadSource)blockers.push("بار زلزله بدون شناسه منبع مستند در نتیجه ثبت شده است");
  const wallDeadLongitudinal=members.filter(m=>m.sectionKey==="wallGirt"&&Number(m.lineLoads?.dead)>0).length;
  const wallDeadEnd=members.filter(m=>m.sectionKey==="endGirt"&&Number(m.lineLoads?.dead)>0).length;
  if(result.loadPathCoverage?.wallDeadSupportPath==="girts"&&
    ((Number(result.loadPathCoverage.wallDeadLongitudinalInput||0)>0&&wallDeadLongitudinal===0)||
     (Number(result.loadPathCoverage.wallDeadEndInput||0)>0&&wallDeadEnd===0)))
   blockers.push("وزن دیوار برای انتقال به قیدها وارد شده ولی عضو باربر متناظر بار دریافت نکرده است");
  if(result.loadPathCoverage?.wallDeadSupportPath==="foundation")
   warnings.push("وزن دیوار با مسیر باربری روی شناژ/فونداسیون انتخاب شده و عمداً به قیدهای فلزی منتقل نشده است؛ تا مدل‌سازی شناژ و پی، این وزن در تحلیل قاب منظور نمی‌شود.");
  else if(!result.loadPathCoverage||result.loadPathCoverage.wallDeadGableTriangle!=="applied")
   warnings.push("وزن دیوار مثلثی بالای قاب انتهایی هنوز در این حالت بار اعمال نشده است.");
  warnings.push("بازشوها، وزن پیچ/جوش، ورق‌های اتصال و جزئیات پوشش باید جداگانه وارد و ممیزی شوند.");
  warnings.push("وجود مسیر گره‌ای تا پایه به معنی طراحی اتصال، صفحه‌ستون، مهاری، فونداسیون یا خاک نیست.");
  return Object.freeze({success:blockers.length===0,readyForAnalysis:blockers.length===0,
   readyForCodeDesign:false,loadCase,memberCount:members.length,nodeCount:nodes.length,
   connectedNodeCount:reachable.size,disconnectedMemberIds:Object.freeze(disconnected),
   selfWeight:{included:factor>0,expectedKN:expectedSelfWeightKN,reportedKN:Number(sw.totalKN||0),memberCount:Number(sw.memberCount||0)},
   wallDead:{longitudinalGirtCount:wallDeadLongitudinal,endWallGirtCount:wallDeadEnd,
    supportPath:result.loadPathCoverage?.wallDeadSupportPath||"foundation",
    gableTriangle:result.loadPathCoverage?.wallDeadGableTriangle||"not-applied",
    foundationLoadsPending:result.loadPathCoverage?.foundationWallLoadsPending!==false},
   wind:{caseApplied:loadCase.toLowerCase().includes("wind")||loadCase==="zoneWind",fullCodePathVerified:false},
   seismic:{caseApplied:seismicApplied,sourceReference:result.externalLoadSource||null,codePathVerified:false},
   crane:{caseApplied:craneApplied,runwayMemberCount:craneMembers,fullPathVerified:false},
   blockers:Object.freeze(blockers),warnings:Object.freeze(warnings),
   note:"ممیزی هندسه، اتصال گرافی به تکیه‌گاه و حسابداری خودوزن است؛ تأیید بارگذاری آیین‌نامه‌ای یا طراحی اجرایی صادر نمی‌کند."});
 }
 root.SahroudLoadPathAudit=Object.freeze({audit});
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudLoadPathAudit;
})(typeof globalThis!=="undefined"?globalThis:this);
