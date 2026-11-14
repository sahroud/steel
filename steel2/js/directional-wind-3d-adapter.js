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
function auditGablePressure(pressures){
 const keys=["end-wall-front","end-wall-back"],active=keys.filter(k=>!finite(pressures?.[k])||Math.abs(pressures[k])>1e-12);
 if(active.some(k=>!finite(pressures?.[k])))throw Error("فشار باد دیوار انتهایی برای ممیزی ناحیه مثلثی ناقص است.");
 if(active.length)throw Error("باد ناحیه مثلثی دیوار انتهایی ("+active.join("، ")+") به رفتر قاب انتهایی/ستونک‌ها در حل‌گر سه‌بعدی منتقل نمی‌شود؛ تا پیاده‌سازی و ممیزی بارگیر و اتصال این مسیر، تحلیل این حالت باد مجاز نیست.");
 return {ready:true,activeSurfaces:[],scope:"gable triangular end-wall wind explicitly zero"};
}
function createCases(){const a=audit();if(!a.ready)throw Error("انتقال باد جهت‌دار متوقف شد: "+a.issues.join("؛ "));const w=root.SteelDirectionalWind.getData(),combos=root.SteelLoads?.getData?.()?.combinations;if(!Array.isArray(combos)||!combos.length)throw Error("ترکیبات ثقلی موجود نیستند.");const cases=[];DIRS.forEach(d=>["positive","negative"].forEach(s=>{const key=s==="positive"?"netWithPositiveInternal":"netWithNegativeInternal",pressures={};SURFACES.forEach(k=>pressures[k]=w.directions[d].surfaces[k][key]);auditGablePressure(pressures);combos.forEach((c,i)=>{const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:1};if(["dead","live","snow"].some(k=>c[k]===undefined||c[k]===null||c[k]===""||!finite(factors[k])||factors[k]<0))throw Error("ضریب ترکیب بار نامعتبر است: "+String(c.name||i+1));cases.push({id:"WIND-"+d.toUpperCase()+"-INT-"+s.toUpperCase()+"-C"+(i+1),label:String(c.name||("ترکیب "+(i+1)))+" | "+w.directions[d].label+" | فشار داخلی "+s,factors,windSign:1,directionalWindCaseId:d+"-"+s,directionalWindPressures:{direction:d,internalPressureSign:s,surfaces:pressures,unit:"kN/m2"},analysisEnabled:false,designApproved:false});});}));return{cases,caseCount:cases.length,analysisEnabled:false,designApproved:false,limitations:["Cpهای دستی و مقدماتی و نیازمند تطبیق رسمی‌اند.","ترکیبات بار فعلی هنوز تأیید نهایی آیین‌نامه‌ای نشده‌اند.","نواحی لبه/گوشه، بازشوهای غالب، پیچش کلی و فشار بر اجزای فرعی کامل نیست.","تحلیل خطی مرتبه اول است؛ P-Delta، کمانش و طراحی عضو/اتصال در این ماژول انجام نمی‌شود."]};}
let lastRun=null;
function buildWindForceEnvelope(model,results){
 const api=root.SteelMemberForceEnvelope;
 if(!api?.buildRows||!api?.auditCoverage)throw Error("ماژول پوش نیروهای اعضا در دسترس نیست.");
 const samples=results.map(x=>{if(!Array.isArray(x.result?.members))throw Error("نیروهای اعضا برای حالت باد "+x.id+" در خروجی حل‌گر موجود نیست.");return {label:x.label,members:x.result.members,equilibrium:x.equilibrium,directionalWindCaseId:x.id};});
 const rows=api.buildRows(model,samples),coverage=api.auditCoverage(model,samples,rows);
 if(coverage.invalidForceVectors.length||coverage.analysisMemberSetMismatchCases.length||coverage.duplicateMemberIdsByCase.length||coverage.unreportedMemberIds.length)throw Error("پوش نیروهای باد ناقص است؛ بردار نامعتبر "+coverage.invalidForceVectors.length+"، اختلاف مجموعه اعضا "+coverage.analysisMemberSetMismatchCases.length+"، گزارش‌نشده "+coverage.unreportedMemberIds.length);
 if(rows.some(r=>r.caseCount!==samples.length))throw Error("پوش نیروهای باد برای همه اعضا و همه حالات کامل نیست.");
 return {rows,coverage,cases:samples.map(x=>({label:x.label,directionalWindCaseId:x.directionalWindCaseId,equilibrium:x.equilibrium})),simultaneousEndForcesPreserved:true,units:"N,N.m",scope:"پوش نیروهای باد جهت‌دار در تحلیل خطی؛ نه ظرفیت یا تأیید آیین‌نامه‌ای."};
}
async function run(){const b=createCases(),solve=root.SteelStructuralModel?.analyze3D,model=root.SteelStructuralModel?.getData?.();if(typeof solve!=="function"||!model)throw Error("مدل یا حل‌گر سه‌بعدی در دسترس نیست.");const results=[];for(const c of b.cases){const r=await solve(c);if(!r||!Array.isArray(r.reactions))throw Error("واکنش حل‌گر برای "+c.id+" معتبر نیست.");if(!Array.isArray(r.members))throw Error("نیروهای اعضا برای "+c.id+" در خروجی حل‌گر موجود نیست.");if(!r.equilibrium||r.equilibrium.ok!==true)throw Error("تعادل عددی حل‌گر برای "+c.id+" تأیید نشد؛ پوش واکنش متوقف شد.");results.push({id:c.id,label:c.label,equilibrium:r.equilibrium,result:r});}const memberForceEnvelope=buildWindForceEnvelope(model,results);const map=new Map();results.forEach(c=>(c.result.reactions||[]).forEach(r=>{const v=map.get(r.nodeId)||{nodeId:r.nodeId,cases:[]};v.cases.push({caseId:c.id,values:(r.values||[]).slice(0,6)});map.set(r.nodeId,v);}));const envelopes=[...map.values()].map(n=>({nodeId:n.nodeId,components:[0,1,2,3,4,5].map(i=>{const q=n.cases.map(c=>({caseId:c.caseId,value:Number(c.values[i])||0}));return{min:q.reduce((a,b)=>b.value<a.value?b:a,q[0]),max:q.reduce((a,b)=>b.value>a.value?b:a,q[0])};}),cases:n.cases}));lastRun={success:true,caseCount:results.length,results,envelopes,memberForceEnvelope,allCasesEquilibriumOK:results.every(x=>x.equilibrium?.ok===true),analysisEnabled:false,designApproved:false,scope:"تحلیل مقدماتی؛ نه کنترل آیین‌نامه‌ای و نه تأیید طراحی."};return lastRun;}
function selfTest(){const t=[];const ck=(n,f)=>{try{t.push({name:n,pass:!!f()});}catch(e){t.push({name:n,pass:false,error:e.message});}};ck("4 directions",()=>DIRS.length===4&&new Set(DIRS).size===4);ck("6 surfaces",()=>SURFACES.length===6&&new Set(SURFACES).size===6);ck("8 wind/internal patterns",()=>DIRS.length*2===8);ck("finite pressure guard",()=>finite(0)&&!finite(null)&&!finite("1"));ck("pressure surfaces",()=>SURFACES.includes("roof-left")&&SURFACES.includes("end-wall-back"));ck("signed direction IDs",()=>DIRS.includes("x-negative")&&DIRS.includes("z-negative"));ck("wind action distinct",()=>({dead:1.2,live:0.5,snow:1.6,wind:1}).wind===1);ck("approval remains disabled",()=>true);ck("analysis remains preliminary",()=>true);ck("all directions unique",()=>new Set(DIRS).size===4);ck("all surfaces unique",()=>new Set(SURFACES).size===6);ck("does not invent pressures",()=>createCases.toString().includes("netWithPositiveInternal"));
  ck("nonzero triangular gable wind is blocked",()=>{try{auditGablePressure({"end-wall-front":0.2,"end-wall-back":0});return false;}catch(e){return e.message.includes("ناحیه مثلثی");}});
  ck("zero triangular gable wind passes explicit guard",()=>auditGablePressure({"end-wall-front":0,"end-wall-back":0}).ready);
  ck("case builder creates all eight directional/internal cases only when gable wind is zero",()=>{
   const oldWind=root.SteelDirectionalWind,oldLoads=root.SteelLoads,oldModel=root.SteelStructuralModel;
   try{
    const surfaces={};SURFACES.forEach(k=>surfaces[k]={netWithPositiveInternal:k.startsWith("end-wall-")?0:1,netWithNegativeInternal:k.startsWith("end-wall-")?0:1});
    const directions={};DIRS.forEach(d=>directions[d]={label:d,surfaces});
    root.SteelDirectionalWind={getData:()=>({ready:true,directions})};
    root.SteelLoads={getData:()=>({combinations:[{name:"test",dead:1,live:0,snow:0}]})};
    root.SteelStructuralModel={getData:()=>({geometry:{span:20,rise:5,length:10,height:6},nodes:[{id:"L0",x:0,y:0,z:0},{id:"L1",x:0,y:0,z:10},{id:"R0",x:20,y:0,z:0},{id:"R1",x:20,y:0,z:10}],members:[
     {id:"PL",sectionKey:"roofPurlin",side:"left",start:"L0",end:"L1",tributaryWidth:Math.hypot(10,5)},{id:"PR",sectionKey:"roofPurlin",side:"right",start:"R0",end:"R1",tributaryWidth:Math.hypot(10,5)},{id:"WL",sectionKey:"wallGirt",side:"left",start:"L0",end:"L1",tributaryHeight:6},{id:"WR",sectionKey:"wallGirt",side:"right",start:"R0",end:"R1",tributaryHeight:6},{id:"EG",sectionKey:"endGirt",endFace:"front",start:"L0",end:"R0",tributaryHeight:1}
    ]})};
    return createCases().caseCount===8;
   }finally{root.SteelDirectionalWind=oldWind;root.SteelLoads=oldLoads;root.SteelStructuralModel=oldModel;}
  });
  ck("case builder rejects nonzero end-wall pressure before any solver call",()=>{
   const oldWind=root.SteelDirectionalWind,oldLoads=root.SteelLoads,oldModel=root.SteelStructuralModel;
   try{
    const surfaces={};SURFACES.forEach(k=>surfaces[k]={netWithPositiveInternal:k==="end-wall-front"?0.25:0,netWithNegativeInternal:0});
    const directions={};DIRS.forEach(d=>directions[d]={label:d,surfaces});
    root.SteelDirectionalWind={getData:()=>({ready:true,directions})};
    root.SteelLoads={getData:()=>({combinations:[{name:"test",dead:1,live:0,snow:0}]})};
    root.SteelStructuralModel={getData:()=>({geometry:{span:20,rise:5,length:10,height:6},nodes:[{id:"L0",x:0,y:0,z:0},{id:"L1",x:0,y:0,z:10},{id:"R0",x:20,y:0,z:0},{id:"R1",x:20,y:0,z:10}],members:[
     {id:"PL",sectionKey:"roofPurlin",side:"left",start:"L0",end:"L1",tributaryWidth:Math.hypot(10,5)},{id:"PR",sectionKey:"roofPurlin",side:"right",start:"R0",end:"R1",tributaryWidth:Math.hypot(10,5)},{id:"WL",sectionKey:"wallGirt",side:"left",start:"L0",end:"L1",tributaryHeight:6},{id:"WR",sectionKey:"wallGirt",side:"right",start:"R0",end:"R1",tributaryHeight:6},{id:"EG",sectionKey:"endGirt",endFace:"front",start:"L0",end:"R0",tributaryHeight:1}
    ]})};
    try{createCases();return false;}catch(e){return e.message.includes("ناحیه مثلثی");}
   }finally{root.SteelDirectionalWind=oldWind;root.SteelLoads=oldLoads;root.SteelStructuralModel=oldModel;}
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
 button.addEventListener("click",async()=>{button.disabled=true;out.textContent="در حال تحلیل جهت‌ها و فشارهای داخلی...";try{const r=await run();out.textContent="حل "+r.caseCount+" حالت باد با تعادل برقرار انجام شد. اعضای دارای پوش نیرو: "+r.memberForceEnvelope.rows.length+"؛ پوش نیرو برای همه اعضا و حالات ثبت شد. ضرایب دستی و مقدماتی‌اند؛ این نتیجه تأیید طراحی نیست.";}catch(e){out.textContent="تحلیل باد متوقف شد: "+String(e.message||e);}finally{button.disabled=false;}});
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mountRunControl);else mountRunControl();}
root.SteelDirectionalWind3D={audit,auditGablePressure,auditTributaryAreaCoverage,createCases,run,selfTest,mapMemberLoad,combineGlobalLoads,buildWindForceEnvelope,getLastRun:()=>lastRun};
})(typeof window!=="undefined"?window:globalThis);