/* SAHROUD STEEL — crane load-path readiness and horizontal load ledger.
 * Audits exact crane runway -> bracket -> column topology. Never applies wheel loads.
 */
(function(root){
"use strict";
const num=x=>Number.isFinite(Number(x))?Number(x):null;
function auditGeometry(model){
 const issues=[],g=model?.geometry?.craneRunway,nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))issues.push("مدل سه‌بعدی ساخته نشده یا آرایه گره/عضو ندارد.");
 if(!g?.enabled)issues.push("جرثقیل در هندسه سه‌بعدی فعال نیست.");
 const supports=Array.isArray(g?.supportNodes)?g.supportNodes:[];
 const segments=Array.isArray(g?.beamSegments)?g.beamSegments:[];
 const brackets=Array.isArray(g?.brackets)?g.brackets:[];
 if(!supports.length)issues.push("گره‌های هندسی تکیه‌گاه تیر حمال تعریف نشده‌اند.");
 if(!segments.length)issues.push("قطعات مستقل تیر حمال تعریف نشده‌اند.");
 if(!brackets.length)issues.push("براکت‌های هندسی تیر حمال تعریف نشده‌اند.");
 const frameStations=[...new Set(supports.map(x=>num(x.z)).filter(x=>x!==null))].sort((a,b)=>a-b);
 if(frameStations.length<2)issues.push("برای تیر حمال حداقل دو ایستگاه قاب طولی معتبر لازم است.");
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n])),memberMap=new Map(members.map(m=>[String(m.id),m]));
 if(nodeMap.size!==nodes.length)issues.push("شناسه گره تکراری در مدل سه‌بعدی وجود دارد.");
 if(memberMap.size!==members.length)issues.push("شناسه عضو تکراری در مدل سه‌بعدی وجود دارد.");
 const mesh=g?.meshProposal,integrated=g?.integrated3D,bridge=g?.integrationAudit;
 if(!mesh?.geometryReady)issues.push("تطبیق دقیق گره‌های پیشنهادی تیر حمال با گره‌های ستون کامل نیست.");
 if(!integrated?.ready||!bridge?.success)issues.push("اعضای تیر حمال و براکت هنوز با مقطع و آزادسازی مستند به شبکه واقعی مدل افزوده نشده‌اند.");
 const beamNodes=Array.isArray(mesh?.beamNodes)?mesh.beamNodes:[];
 const beamMembers=Array.isArray(mesh?.beamMembers)?mesh.beamMembers:[];
 const bracketMembers=Array.isArray(mesh?.brackets)?mesh.brackets:[];
 const missingBeamNodes=beamNodes.filter(n=>!nodeMap.has(String(n.id)));
 const missingBeamMembers=beamMembers.filter(m=>{
  const actual=memberMap.get(String(m.id));
  return !actual||String(actual.start)!==String(m.start)||String(actual.end)!==String(m.end);
 });
 const missingBrackets=bracketMembers.filter(b=>{
  const actual=memberMap.get(String(b.id));
  return !actual||String(actual.start)!==String(b.columnNodeId)||String(actual.end)!==String(b.beamNodeId);
 });
 if(missingBeamNodes.length)issues.push("گره‌های تیر حمال در شبکه واقعی موجود نیستند: "+missingBeamNodes.slice(0,6).map(n=>n.id).join("، "));
 if(missingBeamMembers.length)issues.push("قطعات تیر حمال با شناسه و دو سر واقعی در شبکه FEM تطبیق ندارند: "+missingBeamMembers.slice(0,6).map(m=>m.id).join("، "));
 if(missingBrackets.length)issues.push("عضو براکت، اتصال گره ستون به گره تیر حمال را در شبکه FEM برقرار نمی‌کند: "+missingBrackets.slice(0,6).map(b=>b.id).join("، "));
 const integratedMembers=[...beamMembers.map(x=>x.id),...bracketMembers.map(x=>x.id)].map(String);
 const invalidSections=integratedMembers.filter(id=>{
  const m=memberMap.get(id),p=m?.analysisSection;
  return !p||!["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"].every(k=>Number.isFinite(Number(p[k]))&&Number(p[k])>0)||!String(p?.source||"").trim();
 });
 if(invalidSections.length)issues.push("خواص مقطع SI یا مرجع مستند برای اعضای جرثقیل ناقص است: "+invalidSections.slice(0,6).join("، "));
 const invalidReleases=integratedMembers.filter(id=>{
  const r=memberMap.get(id)?.endReleases;
  return !r||!Array.isArray(r.i)||!Array.isArray(r.j);
 });
 if(invalidReleases.length)issues.push("آزادسازی انتهایی تیر حمال/براکت صریح نیست: "+invalidReleases.slice(0,6).join("، "));
 const solverIncompatible=integratedMembers.filter(id=>{
  const m=memberMap.get(id),p=m?.analysisSection,r=m?.endReleases;
  return !m?.craneIntegration||!["craneRunwayGirder","craneRunwayBracket"].includes(m?.sectionKey)||
   !p||!["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"].every(k=>Number.isFinite(Number(p[k]))&&Number(p[k])>0)||
   !String(p?.source||"").trim()||
   !r||!["i","j"].every(end=>Array.isArray(r[end])&&r[end].every(d=>[4,5].includes(Number(d))));
 });
 if(solverIncompatible.length)issues.push("اعضای جرثقیل با قرارداد ورودی حل‌گر قاب سه‌بعدی سازگار نیستند (craneIntegration/sectionKey/خواص SI/آزادسازی محلی ۴ و ۵): "+solverIncompatible.slice(0,6).join("، "));
 const invalidMemberGeometry=integratedMembers.filter(id=>{
  const m=memberMap.get(id),a=nodeMap.get(String(m?.start)),b=nodeMap.get(String(m?.end));
  return !a||!b||!(Math.hypot(Number(a.x)-Number(b.x),Number(a.y)-Number(b.y),Number(a.z)-Number(b.z))>1e-8);
 });
 if(invalidMemberGeometry.length)issues.push("هندسه عضو جرثقیل برای تشکیل ماتریس سختی معتبر نیست یا طول صفر دارد: "+invalidMemberGeometry.slice(0,6).join("، "));
 const nonzeroOrUndeclaredLoads=integratedMembers.filter(id=>{
  const load=memberMap.get(id)?.analysisLoad?.uniformLocal;
  return !Array.isArray(load)||load.length!==3||load.some(v=>!Number.isFinite(Number(v))||Number(v)!==0);
 });
 if(nonzeroOrUndeclaredLoads.length)issues.push("تا تکمیل مسیر بار چرخ، بار گسترده اعضای جرثقیل باید صریحاً صفر و سه‌مولفه‌ای بماند: "+nonzeroOrUndeclaredLoads.slice(0,6).join("، "));
 const unsupported=brackets.filter(x=>!["simple","moment"].includes(x.connectionType));
 if(unsupported.length)issues.push("نوع اتصال براکت باید ساده یا گیردار و مطابق نقشه باشد.");
 const spanTypes=[...new Set(segments.map(s=>s.continuity))];
 if(spanTypes.some(x=>x!=="separate_span_segment_between_adjacent_frames"))issues.push("تعریف قطعات تیر حمال با الگوی دهانه‌های مستقل بین قاب‌های مجاور سازگار نیست.");
 return {ready:issues.length===0,geometryReady:issues.length===0,analysisEnabled:false,issues,
  counts:{modelNodes:nodes.length,modelMembers:members.length,geometricSupports:supports.length,proposalBeamNodes:beamNodes.length,missingBeamNodes:missingBeamNodes.length,beamSegments:segments.length,integratedBeamMembers:beamMembers.length,missingBeamMembers:missingBeamMembers.length,brackets:brackets.length,integratedBracketMembers:bracketMembers.length,missingBrackets:missingBrackets.length,longitudinalFrameStations:frameStations.length},
  supportStations_m:frameStations,spanModel:"دهانه‌های تیر حمال مستقل بین قاب‌های مجاور؛ پیوستگی خمشی چنددهانه فرض نشده است.",
  note:"آمادگی هندسی مسیر تا گره ستون ممیزی شده است؛ تحلیل تیر حمال، اعمال بار چرخ، کنترل اتصال و تأیید طراحی همچنان غیرفعال است."};
}
function horizontalLedger(horizontal,train){
 const d=horizontal||{},issues=[],positions=String(train?.positions_m??"").split(/[,،;；\s]+/).filter(Boolean).map(Number);
 const parse=s=>String(s??"").trim()===""?[]:String(s).split(",").map(x=>x.trim()).map(Number);
 const transverse=parse(d.transverseLoads_kN),longitudinal=parse(d.longitudinalLoads_kN);
 if(!d.enabled)return {ready:false,issues:["ثبت نیروهای افقی غیرفعال است."],loads:[]};
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0)||positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("مختصات قطار چرخ معتبر نیست.");
 if(transverse.length!==positions.length||transverse.some(x=>!Number.isFinite(x)||x<0))issues.push("فهرست نیروهای عرضی باید برای هر چرخ یک مقدار نامنفی داشته باشد.");
 if(longitudinal.length!==positions.length||longitudinal.some(x=>!Number.isFinite(x)||x<0))issues.push("فهرست نیروهای طولی باید برای هر چرخ یک مقدار نامنفی داشته باشد.");
 if(!transverse.some(x=>x>0)&&!longitudinal.some(x=>x>0))issues.push("حداقل یک نیروی افقی باید بزرگ‌تر از صفر باشد.");
 if(!["+X","-X"].includes(d.transverseSign))issues.push("علامت محور X نامعتبر است.");
 if(!["+Z","-Z"].includes(d.longitudinalSign))issues.push("علامت محور Z نامعتبر است.");
 if(!String(d.source||"").trim()||!String(d.document||"").trim())issues.push("منبع و شماره سند نیروهای افقی الزامی است.");
 const sx=d.transverseSign==="-X"?-1:1,sz=d.longitudinalSign==="-Z"?-1:1;
 const loads=positions.map((x,i)=>({wheelIndex:i+1,x_m:x,globalForce_N:[(transverse[i]||0)*1000*sx,0,(longitudinal[i]||0)*1000*sz],source:d.source||"",document:d.document||"",units:"N"}));
 return {ready:issues.length===0,analysisEnabled:false,issues,loads,coordinateConvention:{X:"عرضی سوله",Y:"قائم",Z:"طولی سوله"},note:"این دفتر ثبت برداری فقط نیروها را با علامت و واحد SI مرتب می‌کند؛ بارگذاری مدل سه‌بعدی مجاز نیست تا زنجیره چرخ-ریل-تیر حمال-براکت-ستون و مبانی بارگذاری کامل شود."};
}
function audit(model,horizontal,train){
 const geometry=auditGeometry(model),ledger=horizontalLedger(horizontal,train),issues=[...geometry.issues,...ledger.issues];
 issues.push("نیروهای افقی و قائم چرخ هنوز به حل‌گر تزریق نمی‌شوند؛ انتخاب گره نزدیک یا پایه ستون به‌جای محل واقعی تماس چرخ ممنوع است.");
 return {ready:false,analysisEnabled:false,geometry,ledger,issues,blockedReason:"ممیزی هندسی اتصال اعضا به‌تنهایی برای انتقال نیروهای چرخ کافی نیست؛ ریل، بست، محل تماس چرخ، توزیع بار، اثرات دینامیکی و ترکیبات بار باید جداگانه مدل و کنترل شوند."};
}
function prepare3DLoads(model,horizontal,train){
 const r=audit(model,horizontal,train);
 return {success:false,ready:false,analysisEnabled:false,audit:r,loads:[],message:"اعمال بار به حل‌گر سه‌بعدی تا تکمیل زنجیره بارگذاری و کنترل‌های مربوط مسدود است."};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={geometry:{craneRunway:{enabled:true,supportNodes:[{id:"S1",z:0},{id:"S2",z:5}],beamSegments:[{id:"B1",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{connectionType:"simple"}],supportType:"simple"}},nodes:[],members:[]};
 const validH={enabled:true,transverseLoads_kN:"10,12",longitudinalLoads_kN:"2,3",transverseSign:"-X",longitudinalSign:"+Z",source:"catalog",document:"page 4"};
 const tr={positions_m:"0, 2"};
 const geo=auditGeometry(model),ledger=horizontalLedger(validH,tr),blocked=prepare3DLoads(model,validH,tr);
 t("virtual supports without integrated topology are blocked",()=>!geo.ready&&geo.counts.missingBeamNodes===0&&geo.issues.some(x=>x.includes("اعضای تیر حمال")));
 t("separate-span runway geometry is accepted as the declared span model when integrated",()=>{
  const sec={E_Pa:2e11,G_Pa:7.7e10,A_m2:.01,Iy_m4:1e-4,Iz_m4:2e-4,J_m4:1e-5,source:"drawing"};
  const nodes=[{id:"C1",x:0,y:5,z:0},{id:"C2",x:0,y:5,z:5},{id:"B1",x:-.5,y:5,z:0},{id:"B2",x:-.5,y:5,z:5}];
  const members=[{id:"BC1",start:"C1",end:"B1",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"BC2",start:"C2",end:"B2",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"G1",start:"B1",end:"B2",sectionKey:"craneRunwayGirder",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}}];
  const p={geometryReady:true,beamNodes:[nodes[2],nodes[3]],beamMembers:[{id:"G1",start:"B1",end:"B2",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{id:"BC1",columnNodeId:"C1",beamNodeId:"B1",connectionType:"simple"},{id:"BC2",columnNodeId:"C2",beamNodeId:"B2",connectionType:"simple"}]};
  const fixture={nodes,members,geometry:{craneRunway:{enabled:true,supportNodes:[{id:"S1",z:0},{id:"S2",z:5}],beamSegments:[{id:"B1",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{connectionType:"simple"},{connectionType:"simple"}],meshProposal:p,integrated3D:{ready:true},integrationAudit:{success:true}}}};
  const result=auditGeometry(fixture); return result.ready&&result.counts.integratedBeamMembers===1&&result.spanModel.includes("مستقل");
 });
 const makeIntegratedFixture=()=>{
  const sec={E_Pa:2e11,G_Pa:7.7e10,A_m2:.01,Iy_m4:1e-4,Iz_m4:2e-4,J_m4:1e-5,source:"drawing"};
  const nodes=[{id:"C1",x:0,y:5,z:0},{id:"C2",x:0,y:5,z:5},{id:"B1",x:-.5,y:5,z:0},{id:"B2",x:-.5,y:5,z:5}];
  const members=[{id:"BC1",start:"C1",end:"B1",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"BC2",start:"C2",end:"B2",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"G1",start:"B1",end:"B2",sectionKey:"craneRunwayGirder",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}}];
  const meshProposal={geometryReady:true,beamNodes:[nodes[2],nodes[3]],beamMembers:[{id:"G1",start:"B1",end:"B2",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{id:"BC1",columnNodeId:"C1",beamNodeId:"B1",connectionType:"simple"},{id:"BC2",columnNodeId:"C2",beamNodeId:"B2",connectionType:"simple"}]};
  return {nodes,members,geometry:{craneRunway:{enabled:true,supportNodes:[{id:"S1",z:0},{id:"S2",z:5}],beamSegments:[{id:"S1-B1",continuity:"separate_span_segment_between_adjacent_frames"},{id:"B1-S2",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{connectionType:"simple"},{connectionType:"simple"}],meshProposal,integrated3D:{ready:true},integrationAudit:{success:true}}}};
 };
 const integratedFixture=makeIntegratedFixture(),integrated=auditGeometry(integratedFixture);
 t("crane integration members satisfy the 3D solver member contract",()=>integrated.ready&&integratedFixture.members.every(m=>m.craneIntegration===true&&["craneRunwayGirder","craneRunwayBracket"].includes(m.sectionKey)));
 const badRelease=makeIntegratedFixture();badRelease.members.find(m=>m.id==="G1").endReleases.i=[3];
 t("rejects local axial or torsional releases outside solver-supported bending rotations",()=>!auditGeometry(badRelease).ready&&auditGeometry(badRelease).issues.some(x=>x.includes("قرارداد ورودی حل‌گر")));
 const zeroLength=makeIntegratedFixture();zeroLength.nodes.find(n=>n.id==="B2").z=zeroLength.nodes.find(n=>n.id==="B1").z;
 t("rejects zero-length integrated runway member",()=>!auditGeometry(zeroLength).ready&&auditGeometry(zeroLength).issues.some(x=>x.includes("طول صفر")));

 t("integrated member topology and SI section data pass geometry audit",()=>integrated.ready&&integrated.counts.integratedBeamMembers===1&&integrated.counts.integratedBracketMembers===2);
 const brokenFixture=makeIntegratedFixture();brokenFixture.members=brokenFixture.members.filter(m=>m.id!=="BC1");
 const brokenAudit=auditGeometry(brokenFixture);
 t("missing bracket-to-column FEM member is rejected",()=>!brokenAudit.ready&&brokenAudit.counts.missingBrackets===1);
 const noLoadModel=makeIntegratedFixture();noLoadModel.members.find(m=>m.id==="G1").analysisLoad={uniformLocal:[1,0,0]};
 t("blocks premature nonzero member loads before crane load-path approval",()=>!auditGeometry(noLoadModel).ready&&auditGeometry(noLoadModel).issues.some(x=>x.includes("بار گسترده اعضای جرثقیل")));
 t("horizontal wheel force count aligned with wheel train",()=>ledger.ready&&ledger.loads.length===2);
 t("kN converted to N",()=>ledger.loads[0].globalForce_N[0]===-10000&&ledger.loads[1].globalForce_N[2]===3000);
 t("global force signs preserved",()=>ledger.loads[0].globalForce_N[0]<0&&ledger.loads[0].globalForce_N[2]>0);
 t("empty horizontal force lists rejected",()=>!horizontalLedger({...validH,transverseLoads_kN:"",longitudinalLoads_kN:""},tr).ready);
 t("all-zero horizontal actions rejected",()=>!horizontalLedger({...validH,transverseLoads_kN:"0,0",longitudinalLoads_kN:"0,0"},tr).ready);
 t("missing horizontal source rejected",()=>!horizontalLedger({...validH,source:""},tr).ready);
 t("mismatched wheel force count rejected",()=>!horizontalLedger({...validH,transverseLoads_kN:"10"},tr).ready);
 t("no nodal loads injected before load-path approval",()=>!blocked.success&&blocked.loads.length===0&&blocked.analysisEnabled===false);
 t("geometry and horizontal readiness both reported",()=>!!blocked.audit.geometry&&!!blocked.audit.ledger);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,note:"Software audit tests only; not engineering validation."};
}
root.SteelCraneLoadPathAudit={audit,auditGeometry,horizontalLedger,prepare3DLoads,selfTest};
})(typeof window!=="undefined"?window:globalThis);
