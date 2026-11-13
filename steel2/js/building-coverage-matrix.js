/* SAHROUD STEEL — whole-building engineering coverage matrix.
 * Records evidence and completion state for loads, components and design stages.
 * Missing evidence is reported as a gap; no structural capacity is inferred.
 */
(function(root){
"use strict";
const loadItems=[
 ["dead","بار مرده و وزن خودکار اجزا"],["live","بار زنده بام و بهره‌برداری"],["snowBalanced","برف متوازن"],["snowUnbalanced","برف نامتوازن"],["snowDrift","انباشت/رانش برف"],["windX","باد در راستای X"],["windZ","باد در راستای Z"],["internalWind","فشار داخلی باد و حالات بازشو"],["seismicX","زلزله در راستای X"],["seismicZ","زلزله در راستای Z"],["craneVertical","بار قائم چرخ و ضربه جرثقیل"],["craneHorizontal","بارهای افقی و ترمز جرثقیل"],["temperature","اثر دما و تغییرشکل‌های اجباری"],["construction","بارهای مرحله ساخت و نصب"]];
const componentItems=[
 ["mainFrames","قاب‌های اصلی و ستون‌ها"],["rafters","رفترها و تیرهای شیبدار"],["purlins","پرلین‌های سقف"],["wallGirts","وال‌گیرت‌ها و لاپه‌های دیوار"],["roofBracing","مهاربندی سقف"],["wallBracing","مهاربندی دیوار"],["eaveStrut","تیر لبه و اعضای طولی"],["craneRunway","تیرهای حمال و براکت جرثقیل"],["craneStops","ضربه‌گیر انتهای مسیر جرثقیل"],["connections","اتصالات پیچی و جوشی"],["basePlates","صفحه‌ستون و سخت‌کننده‌ها"],["anchorBolts","انکربولت و جزئیات کاشت"],["foundations","فونداسیون‌ها"],["gradeBeams","شناژها و کلاف‌های رابط"],["slab","کف‌سازی و دال صنعتی"],["cladding","پوشش سقف و دیوار و اتصالات آن"]];
const stages=["loadDefinition","analysisModel","loadCombinations","analysisResults","memberDesign","connectionDesign","foundationDesign","drawings","quantityTakeoff","independentReview"];
function audit(p){
 p=p||{};const issues=[],missing=[],unverified=[],rows=[];
 const inspect=(group,items)=>{
  const source=p[group]||{};
  items.forEach(([id,label])=>{
   const x=source[id]||{},status=String(x.status||"not_started");
   const allowed=["not_started","in_progress","calculated","verified","not_applicable"];
   if(!allowed.includes(status)){issues.push(group+"."+id+": وضعیت نامعتبر.");return;}
   if(status==="verified"&&(!String(x.evidence||"").trim()||!String(x.reviewer||"").trim()))issues.push(group+"."+id+": تأیید بدون مدرک یا بازبین مجاز نیست.");
   if(status==="not_started")missing.push({group,id,label,status});
   if(status==="in_progress"||status==="calculated")unverified.push({group,id,label,status,evidence:x.evidence||null});
   if(status==="not_applicable"&&!String(x.reason||"").trim())issues.push(group+"."+id+": دلیل عدم کاربرد ثبت نشده است.");
   rows.push({group,id,label,status,evidence:x.evidence||null,reviewer:x.reviewer||null,reason:x.reason||null});
  });
 };
 inspect("loads",loadItems);inspect("components",componentItems);
 const stage=p.stages||{};
 stages.forEach(id=>{const x=stage[id]||{};if(x.status==="verified"&&(!String(x.evidence||"").trim()||!String(x.reviewer||"").trim()))issues.push("مرحله "+id+": مدرک و بازبین لازم است.");if(!["not_started","in_progress","calculated","verified","not_applicable"].includes(x.status||"not_started"))issues.push("مرحله "+id+": وضعیت نامعتبر.");if(!x.status||x.status==="not_started")missing.push({group:"stages",id,label:id,status:"not_started"});else if(x.status==="in_progress"||x.status==="calculated")unverified.push({group:"stages",id,label:id,status:x.status,evidence:x.evidence||null});});
 const verified=rows.filter(x=>x.status==="verified").length;
 return {success:issues.length===0,coverageStatus:issues.length?"invalid_input":missing.length||unverified.length?"incomplete":"evidence_complete",analysisEnabled:false,designApproved:false,counts:{loads:loadItems.length,components:componentItems.length,stages:stages.length,verified,missing:missing.length,unverified:unverified.length,issues:issues.length},missing,unverified,rows,issues,limitations:[
 "این ماتریس فهرست پوشش و مدارک است؛ محاسبه بار، تحلیل سازه یا کنترل ظرفیت انجام نمی‌دهد.",
 "وضعیت verified فقط ثبت اداری مدرک و بازبین است و به‌تنهایی تأیید آیین‌نامه‌ای محسوب نمی‌شود.",
 "بارهای زلزله، باد، برف، جرثقیل و ترکیبات باید بر اساس محل پروژه، ویرایش معتبر آیین‌نامه و شرایط واقعی تعیین شوند.",
 "موارد not_applicable فقط با دلیل مستند قابل قبول‌اند؛ نبود اطلاعات به معنی عدم کاربرد نیست."
 ]};
}
function template(){const loads={},components={},stagesOut={};loadItems.forEach(([k])=>loads[k]={status:"not_started",evidence:"",reviewer:""});componentItems.forEach(([k])=>components[k]={status:"not_started",evidence:"",reviewer:""});stages.forEach(k=>stagesOut[k]={status:"not_started",evidence:"",reviewer:""});return {projectId:"",codeBasis:{primaryCode:"",edition:"",location:"",importance:""},loads,components,stages:stagesOut};}
function selfTest(){const t=[],test=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};const p=template();test("template enumerates every load category",()=>Object.keys(p.loads).length===loadItems.length);test("template enumerates every building component",()=>Object.keys(p.components).length===componentItems.length);test("template enumerates every design stage",()=>Object.keys(p.stages).length===stages.length);test("empty project is incomplete",()=>audit(p).coverageStatus==="incomplete");test("unstarted dead load appears as gap",()=>audit(p).missing.some(x=>x.id==="dead"));test("calculated but unreviewed load remains unverified",()=>{p.loads.dead={status:"calculated",evidence:"calc-01"};return audit(p).unverified.some(x=>x.id==="dead");});test("verified load requires evidence",()=>{p.loads.dead={status:"verified",reviewer:"R"};return audit(p).issues.some(x=>x.includes("مدرک"));});test("verified load requires reviewer",()=>{p.loads.dead={status:"verified",evidence:"calc-01"};return audit(p).issues.some(x=>x.includes("بازبین"));});test("verified item with evidence and reviewer recorded",()=>{p.loads.dead={status:"verified",evidence:"calc-01",reviewer:"engineer"};return audit(p).rows.find(x=>x.id==="dead").status==="verified";});test("not-applicable requires reason",()=>{p.loads.dead={status:"not_applicable"};return audit(p).issues.some(x=>x.includes("دلیل عدم کاربرد"));});test("invalid status rejected",()=>{p.loads.dead={status:"done"};return audit(p).issues.length>0;});test("all major wind snow seismic and crane actions included",()=>["windX","windZ","internalWind","snowBalanced","snowUnbalanced","seismicX","seismicZ","craneVertical","craneHorizontal"].every(k=>k in p.loads));test("foundations grade beams and anchors included",()=>["foundations","gradeBeams","anchorBolts","basePlates"].every(k=>k in p.components));test("design stages include analysis design drawings and review",()=>["analysisModel","memberDesign","connectionDesign","foundationDesign","drawings","independentReview"].every(k=>k in p.stages));test("never enables analysis or approves design",()=>audit(p).analysisEnabled===false&&audit(p).designApproved===false);return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false};}
root.SteelBuildingCoverageMatrix={audit,template,selfTest,loadItems,componentItems,stages};
})(typeof window!=="undefined"?window:globalThis);
