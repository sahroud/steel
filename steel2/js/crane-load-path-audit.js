/* SAHROUD STEEL — crane load-path readiness and horizontal load ledger.
 * Audits the geometric connection chain. Does not apply loads to the 3D solver.
 */
(function(root){
"use strict";
const num=x=>Number.isFinite(Number(x))?Number(x):null;
function auditGeometry(model){
 const issues=[],g=model?.geometry?.craneRunway,allNodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))issues.push("مدل سه‌بعدی ساخته نشده یا آرایه گره/عضو ندارد.");
 if(!g||!g.enabled)issues.push("جرثقیل در هندسه سه‌بعدی فعال نیست.");
 const supports=Array.isArray(g?.supportNodes)?g.supportNodes:[];
 if(!supports.length)issues.push("گره‌های هندسی تکیه‌گاه تیر حمال در مدل تعریف نشده‌اند.");
 const nodeIds=new Set(allNodes.map(n=>n.id));
 const missing=supports.filter(n=>!nodeIds.has(n.id));
 if(missing.length)issues.push("گره‌های تیر حمال فقط در هندسه کمکی ثبت شده‌اند و عضو واقعی آرایه model.nodes نیستند: "+missing.map(n=>n.id).join("، "));
 const segments=Array.isArray(g?.beamSegments)?g.beamSegments:[];
 if(!segments.length)issues.push("قطعات تیر حمال برای اتصال سازه‌ای در مدل موجود نیستند.");
 const memberIds=new Set(members.map(m=>m.id));
 const unmeshed=segments.filter(s=>!memberIds.has(s.id));
 if(unmeshed.length)issues.push("قطعات تیر حمال هنوز به اعضای حل‌گر سه‌بعدی تبدیل نشده‌اند: "+unmeshed.map(s=>s.id).slice(0,6).join("، "));
 const brackets=Array.isArray(g?.brackets)?g.brackets:[];
 if(!brackets.length)issues.push("جزئیات هندسی براکت در دسترس نیست.");
 const unsupported=brackets.filter(x=>!["simple","moment","spring"].includes(x.connectionType));
 if(unsupported.length)issues.push("نوع اتصال برای برخی براکت‌ها تعیین نشده است.");
 if(g?.supportType==="simple"||g?.supportType==="moment"||g?.supportType==="spring"){
  if(!String(g.supportType).trim())issues.push("نوع اتصال نامعتبر است.");
 }
 const frameStations=[...new Set(supports.map(x=>num(x.z)).filter(x=>x!==null))].sort((a,b)=>a-b);
 if(supports.length&&frameStations.length<2)issues.push("برای تعریف تیر حمال حداقل دو قاب طولی مستقل لازم است.");
 const hasContinuity=segments.length>0&&segments.every(s=>s.continuity==="continuous");
 if(!hasContinuity)issues.push("هندسه فعلی تیر حمال قطعات جداگانه بین قاب‌هاست؛ پیوستگی خمشی چنددهانه مستند نشده است.");
 return {ready:issues.length===0,analysisEnabled:false,issues,counts:{modelNodes:allNodes.length,modelMembers:members.length,virtualSupports:supports.length,missingSupportNodes:missing.length,beamSegments:segments.length,unmeshedBeamSegments:unmeshed.length,brackets:brackets.length,longitudinalFrameStations:frameStations.length},supportStations_m:frameStations};
}
function horizontalLedger(horizontal,train){
 const d=horizontal||{},issues=[],positions=String(train?.positions_m??"").split(/[,،;；\s]+/).filter(Boolean).map(Number);
 const parse=s=>String(s??"").split(",").map(x=>x.trim()).map(Number);
 const transverse=parse(d.transverseLoads_kN),longitudinal=parse(d.longitudinalLoads_kN);
 if(!d.enabled)return {ready:false,issues:["ثبت نیروهای افقی غیرفعال است."],loads:[]};
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0)||positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("مختصات قطار چرخ معتبر نیست.");
 if(transverse.length!==positions.length||transverse.some(x=>!Number.isFinite(x)||x<0))issues.push("فهرست نیروهای عرضی باید برای هر چرخ یک مقدار نامنفی داشته باشد.");
 if(longitudinal.length!==positions.length||longitudinal.some(x=>!Number.isFinite(x)||x<0))issues.push("فهرست نیروهای طولی باید برای هر چرخ یک مقدار نامنفی داشته باشد.");
 if(!["+X","-X"].includes(d.transverseSign))issues.push("علامت محور X نامعتبر است.");
 if(!["+Z","-Z"].includes(d.longitudinalSign))issues.push("علامت محور Z نامعتبر است.");
 if(!String(d.source||"").trim()||!String(d.document||"").trim())issues.push("منبع و شماره سند نیروهای افقی الزامی است.");
 const sx=d.transverseSign==="-X"?-1:1,sz=d.longitudinalSign==="-Z"?-1:1;
 const loads=positions.map((x,i)=>({wheelIndex:i+1,x_m:x,globalForce_N:[(transverse[i]||0)*1000*sx,0,(longitudinal[i]||0)*1000*sz],source:d.source||"",document:d.document||"",units:"N"}));
 return {ready:issues.length===0,analysisEnabled:false,issues,loads,coordinateConvention:{X:"عرضی سوله",Y:"قائم",Z:"طولی سوله"},note:"این دفتر ثبت برداری فقط نیروها را با علامت و واحد SI مرتب می‌کند؛ بارگذاری مدل سه‌بعدی مجاز نیست تا زنجیره واقعی چرخ-ریل-تیر حمال-براکت-ستون مدل و ممیزی شود."};
}
function audit(model,horizontal,train){
 const geometry=auditGeometry(model),ledger=horizontalLedger(horizontal,train),issues=[...geometry.issues,...ledger.issues];
 issues.push("نیروهای افقی فعلاً به هیچ گره‌ای تزریق نمی‌شوند؛ انتخاب گره نزدیک یا پایه ستون به‌جای محل واقعی اتصال ممنوع است.");
 return {ready:false,analysisEnabled:false,geometry,ledger,issues,blockedReason:"مسیر انتقال بار و اعضای تیر حمال/براکت هنوز در شبکه واقعی حل‌گر سه‌بعدی یکپارچه نشده‌اند."};
}
function prepare3DLoads(model,horizontal,train){
 const r=audit(model,horizontal,train);
 return {success:false,ready:false,analysisEnabled:false,audit:r,loads:[],message:"اعمال بار به حل‌گر سه‌بعدی تا تکمیل و تأیید مسیر انتقال بار مسدود است."};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={geometry:{craneRunway:{enabled:true,supportNodes:[{id:"S1",z:0},{id:"S2",z:5}],beamSegments:[{id:"B1",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{connectionType:"simple"}],supportType:"simple"}},nodes:[],members:[]};
 const validH={enabled:true,transverseLoads_kN:"10,12",longitudinalLoads_kN:"2,3",transverseSign:"-X",longitudinalSign:"+Z",source:"catalog",document:"page 4"};
 const tr={positions_m:"0, 2"};
 const geo=auditGeometry(model),ledger=horizontalLedger(validH,tr),blocked=prepare3DLoads(model,validH,tr);
 t("virtual runway support nodes detected outside 3D mesh",()=>geo.counts.missingSupportNodes===2&&!geo.ready);
 t("unmeshed runway beam segments detected",()=>geo.counts.unmeshedBeamSegments===1);
 t("separate-span geometry not mistaken for continuous beam",()=>geo.issues.some(x=>x.includes("پیوستگی خمشی")));
 t("horizontal wheel force count aligned with wheel train",()=>ledger.ready&&ledger.loads.length===2);
 t("kN converted to N",()=>ledger.loads[0].globalForce_N[0]===-10000&&ledger.loads[1].globalForce_N[2]===3000);
 t("global force signs preserved",()=>ledger.loads[0].globalForce_N[0]<0&&ledger.loads[0].globalForce_N[2]>0);
 t("missing horizontal source rejected",()=>!horizontalLedger({...validH,source:""},tr).ready);
 t("mismatched wheel force count rejected",()=>!horizontalLedger({...validH,transverseLoads_kN:"10"},tr).ready);
 t("no nodal loads injected before load-path approval",()=>!blocked.success&&blocked.loads.length===0&&blocked.analysisEnabled===false);
 t("geometry and horizontal readiness both reported",()=>!!blocked.audit.geometry&&!!blocked.audit.ledger);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,note:"Software audit tests only; not engineering validation."};
}
root.SteelCraneLoadPathAudit={audit,auditGeometry,horizontalLedger,prepare3DLoads,selfTest};
})(typeof window!=="undefined"?window:globalThis);
