/* SAHROUD STEEL — member force envelope from the shared 3D model.
 * Reports simultaneous local end-force components per member and load case.
 * It deliberately does not claim code capacity or member adequacy.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
let last=null,selectedMemberId="",selectedCaseLabel="";
const groups=[
 ["all","همه اعضا"],["column","ستون‌ها"],["rafter","رفترها"],["roofPurlin","پرلین‌های سقف"],
 ["wallGirt","قیدهای دیوار"],["endPost","ستونک‌های انتهایی"],["endGirt","تیرهای انتهایی"],
 ["roofBrace","مهاربندهای سقف"],["wallBrace","مهاربندهای دیوار"],["roofEdge","اعضای لبه سقف"],["tieBeam","شناژهای بتنی"]
];
const names=Object.fromEntries(groups);
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cases(){
 const combos=window.SteelLoads?.getData?.().combinations;
 if(!Array.isArray(combos)||!combos.length)throw Error("ترکیبات بار در دسترس نیستند.");
 const out=combos.map((c,i)=>{const missing=["dead","live","snow"].filter(k=>c[k]===undefined||c[k]===null||c[k]==="");if(c.wind===null||c.wind==="")missing.push("wind");const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:c.wind===undefined?0:Number(c.wind)};if(missing.length||!String(c.name||("ترکیب "+(i+1))).trim()||Object.values(factors).some(v=>!Number.isFinite(v)||v<0))throw Error("نام یا ضریب ترکیب بار "+(i+1)+" ناقص/نامعتبر است؛ مقدار نامشخص به صفر تبدیل نمی‌شود.");return {label:String(c.name||("ترکیب "+(i+1))),factors};});
 const labels=out.map(x=>x.label);if(new Set(labels).size!==labels.length)throw Error("نام ترکیبات بار باید یکتا باشد؛ نام تکراری اجازه نمی‌دهد یک حالت بار، حالت دیگر را پنهان کند.");
 const model=window.SteelStructuralModel?.getData?.();
 const hasWind=(model?.members||[]).some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
 if(hasWind)combos.forEach((c,i)=>{const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:1};if(["dead","live","snow"].some(k=>c[k]===undefined||c[k]===null||c[k]==="")||Object.values(factors).some(v=>!Number.isFinite(v)||v<0))throw Error("ضرایب ترکیب باد "+(i+1)+" ناقص یا نامعتبرند.");[1,-1].forEach(sign=>out.push({label:String(c.name||("ترکیب "+(i+1)))+" + باد "+(sign>0?"مثبت":"منفی"),factors,windSign:sign}));});
 return out;
}
function maxAbs(samples,index){
 let best={value:0,caseLabel:""};
 samples.forEach(s=>{const v=Number(s.values?.[index])||0;if(Math.abs(v)>Math.abs(best.value))best={value:v,caseLabel:s.label};});
 return best;
}
function buildRows(model,samples){
 const byId=new Map(),metaById=new Map((model.members||[]).map(m=>[String(m.id),m]));
 samples.forEach(sample=>(sample.members||[]).forEach(m=>{
  if(!byId.has(String(m.id))){const meta=metaById.get(String(m.id))||{};byId.set(String(m.id),{id:m.id,localAxes:m.localAxes||null,localEndForceConventionVersion:Number(m.localEndForceConventionVersion)||null,parentMemberId:m.parentMemberId||meta.parentMemberId||null,taperSegmentIndex:m.taperSegmentIndex||meta.taperSegmentIndex||null,taperSegmentCount:m.taperSegmentCount||meta.taperSegmentCount||null,type:m.type||meta.type||"",sectionKey:meta.sectionKey||m.sectionKey||m.section?.sectionKey||"",profile:meta.profile||meta.sectionLabel||m.section?.profile||"",start:meta.start||m.start||null,end:meta.end||m.end||null,section:m.section||{},length:Number(m.length||meta.length)||null,ends:[]});}
  const row=byId.get(String(m.id));
  const raw=Array.isArray(m.localEndForces)?m.localEndForces.slice(0,12):[];
  row.ends.push({label:sample.label,values:raw.length===12&&raw.every(Number.isFinite)?raw:[],invalidForceVector:!(raw.length===12&&raw.every(Number.isFinite))});
 }));
 return [...byId.values()].map(row=>{
  const valid=row.ends.filter(e=>e.values.length===12);
  const componentNames=["Nᵢ","Vyᵢ","Vzᵢ","Tᵢ","Myᵢ","Mzᵢ","Nⱼ","Vyⱼ","Vzⱼ","Tⱼ","Myⱼ","Mzⱼ"];
  const envelopes=componentNames.map((name,i)=>({name,...maxAbs(valid,i)}));
  const peak={N:Math.max(Math.abs(envelopes[0].value),Math.abs(envelopes[6].value)),
   Vy:Math.max(Math.abs(envelopes[1].value),Math.abs(envelopes[7].value)),
   Vz:Math.max(Math.abs(envelopes[2].value),Math.abs(envelopes[8].value)),
   T:Math.max(Math.abs(envelopes[3].value),Math.abs(envelopes[9].value)),
   My:Math.max(Math.abs(envelopes[4].value),Math.abs(envelopes[10].value)),
   Mz:Math.max(Math.abs(envelopes[5].value),Math.abs(envelopes[11].value))};
  const simultaneousCases=valid.map(e=>({
   label:e.label,
   endI:{N:e.values[0],Vy:e.values[1],Vz:e.values[2],T:e.values[3],My:e.values[4],Mz:e.values[5]},
   endJ:{N:e.values[6],Vy:e.values[7],Vz:e.values[8],T:e.values[9],My:e.values[10],Mz:e.values[11]},
   sourceVector:e.values.slice()
  }));
  return {...row,envelopes,peak,simultaneousCases,caseCount:valid.length};
 }).sort((a,b)=>String(a.sectionKey).localeCompare(String(b.sectionKey))||String(a.id).localeCompare(String(b.id)));
}
function auditCoverage(model,samples,rows,expectedCaseLabels){
 const first=Array.isArray(samples?.[0]?.members)?samples[0].members:[];
 const expectedIds=new Set(first.map(m=>String(m.id)));
 const reportedIds=new Set((rows||[]).filter(r=>Number(r.caseCount)>0).map(r=>String(r.id)));
 const unreportedMemberIds=[...expectedIds].filter(id=>!reportedIds.has(id));
 const extraMemberIds=[...(rows||[])].map(r=>String(r.id)).filter(id=>!expectedIds.has(id));
 const duplicateMemberIdsByCase=[];
 const invalidForceVectors=[];
 const caseLabels=(samples||[]).map(s=>String(s?.label??"").trim());
 const blankCaseLabels=caseLabels.map((label,i)=>({label,index:i})).filter(x=>!x.label).map(x=>x.index);
 const duplicateCaseLabels=[...new Set(caseLabels.filter((label,i)=>label&&caseLabels.indexOf(label)!==i))];
 const expectedLabels=Array.isArray(expectedCaseLabels)?expectedCaseLabels.map(x=>String(x??"").trim()):null;
 const missingCaseLabels=expectedLabels?expectedLabels.filter(label=>label&&!caseLabels.includes(label)):[];
 const unexpectedCaseLabels=expectedLabels?caseLabels.filter(label=>label&&!expectedLabels.includes(label)):[];
 const duplicateExpectedCaseLabels=expectedLabels?[...new Set(expectedLabels.filter((label,i)=>!label||expectedLabels.indexOf(label)!==i))]:[];
 const analysisMemberSetMismatchCases=(samples||[]).filter(s=>{
  const list=Array.isArray(s.members)?s.members:[];
  const ids=list.map(m=>String(m.id)),unique=new Set(ids);
  const duplicate=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  duplicate.forEach(id=>duplicateMemberIdsByCase.push({caseLabel:s.label||"حالت بدون نام",memberId:id}));
  list.forEach(m=>{
   const v=m?.localEndForces;
   if(!Array.isArray(v)||v.length!==12||!v.every(Number.isFinite))
    invalidForceVectors.push({caseLabel:s.label||"حالت بدون نام",memberId:String(m?.id??""),length:Array.isArray(v)?v.length:0});
  });
  return unique.size!==expectedIds.size||[...expectedIds].some(id=>!unique.has(id))||duplicate.length>0;
 }).map(s=>s.label||"حالت بدون نام");
 return {modelMemberCount:expectedIds.size,physicalMemberCount:(model?.members||[]).length,
  unreportedMemberIds,extraMemberIds,analysisMemberSetMismatchCases,
  duplicateMemberIdsByCase,invalidForceVectors,blankCaseLabels,duplicateCaseLabels,missingCaseLabels,unexpectedCaseLabels,duplicateExpectedCaseLabels,
  caseLabelCoverageOK:!blankCaseLabels.length&&!duplicateCaseLabels.length&&!missingCaseLabels.length&&!unexpectedCaseLabels.length&&!duplicateExpectedCaseLabels.length};
}
async function run(){
 const box=$("memberForceEnvelopeResult"),btn=$("btnMemberForceEnvelope");
 try{
  if(!window.SteelStructuralModel?.analyze3D)throw Error("مدل سه‌بعدی در دسترس نیست.");
  btn.disabled=true;box.textContent="در حال تحلیل ترکیبات بار و استخراج نیروهای انتهایی اعضا…";
  const model=window.SteelStructuralModel.getData();if(!model)throw Error("ابتدا مدل کامل سوله را تولید کنید.");
  const specs=cases(),samples=[];
  for(let i=0;i<specs.length;i++){
   const s=specs[i];
   const result=await window.SteelStructuralModel.analyze3D({label:s.label,factors:s.factors,windSign:s.windSign||1});
   if(!result?.success||!Array.isArray(result.members))throw Error("تحلیل ناموفق در حالت "+s.label);
   if(samples.some(x=>x.label===s.label))throw Error("برچسب ترکیب بار تکراری در فهرست تحلیل: "+s.label);
   samples.push({label:s.label,members:result.members,equilibrium:result.equilibrium,localEndForceConvention:result.localEndForceConvention||null});
   box.textContent="تحلیل "+(i+1)+" از "+specs.length+" — "+s.label;
  }
  const rows=buildRows(model,samples);
  const bad=samples.filter(s=>!s.equilibrium?.ok);
  const coverage=auditCoverage(model,samples,rows,specs.map(s=>s.label));
  last={generatedAt:new Date().toISOString(),codeBasis:window.SteelDesignCodes?.getData?.()||null,units:"N,N.m",localEndForceConvention:samples[0]?.localEndForceConvention||null,cases:samples.map(s=>({label:s.label,equilibrium:s.equilibrium})),members:rows,memberCount:rows.length,modelMemberCount:coverage.modelMemberCount,physicalMemberCount:coverage.physicalMemberCount,unreportedMemberIds:coverage.unreportedMemberIds,extraMemberIds:coverage.extraMemberIds,analysisMemberSetMismatchCases:coverage.analysisMemberSetMismatchCases,duplicateMemberIdsByCase:coverage.duplicateMemberIdsByCase,invalidForceVectors:coverage.invalidForceVectors,allCasesEquilibriumOK:bad.length===0,caseLabelCoverageOK:coverage.caseLabelCoverageOK,caseLabelAudit:{blank:coverage.blankCaseLabels,duplicates:coverage.duplicateCaseLabels,missing:coverage.missingCaseLabels,unexpected:coverage.unexpectedCaseLabels,duplicateExpected:coverage.duplicateExpectedCaseLabels},limitations:["این خروجی تقاضای نیروهای انتهایی محلی اعضا در تحلیل خطی مرتبه اول است؛ ظرفیت یا نسبت بهره‌برداری آیین‌نامه‌ای محاسبه نمی‌شود.","ترکیبات ثقلی از فهرست فعلی پروژه گرفته شده‌اند؛ در صورت وجود فشار باد، دو حالت افزوده‌شده با ضریب واحد مثبت و منفی صرفاً سناریوی تحلیل مقدماتی‌اند و ترکیب‌بار آیین‌نامه‌ای کامل محسوب نمی‌شوند.","کمانش، P-Delta، کمانش پیچشی-جانبی، اندرکنش نیروها، طبقه‌بندی مقطع و کنترل خیز/ارتعاش در این گزارش انجام نشده‌اند.","قرارداد محورها و ترتیب مؤلفه‌ها در گزارش ذخیره می‌شود؛ علامت‌های خمشی و برشی هنوز به‌صورت مستقل با مثال‌های مرجع اعتبارسنجی نشده‌اند و نباید برای اندرکنش آیین‌نامه‌ای مصرف شوند."]};
  render();
 }catch(e){box.textContent="خطا: "+e.message;}
 finally{btn.disabled=false;}
}
function render(){
 const filter=$("memberForceGroup")?.value||"all",all=last?.members||[];
 const rows=all.filter(r=>filter==="all"||r.sectionKey===filter);
 const body=$("memberForceRows");
 body.innerHTML=rows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.sectionKey)+'</td><td>'+fmt(r.length||0)+'</td><td>'+fmt(r.peak.N/1000)+'</td><td>'+fmt(r.peak.Vy/1000)+'</td><td>'+fmt(r.peak.Vz/1000)+'</td><td>'+fmt(r.peak.My/1e6)+'</td><td>'+fmt(r.peak.Mz/1e6)+'</td><td>'+r.caseCount+'</td></tr>').join("")||'<tr><td colspan="9">عضوی برای این گروه پیدا نشد.</td></tr>';
 const memberSelect=$("memberForceDetailMember"),caseSelect=$("memberForceDetailCase");
 if(memberSelect){
  const prior=selectedMemberId||memberSelect.value;
  memberSelect.innerHTML=all.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.id)+' — '+esc(r.sectionKey)+'</option>').join("");
  selectedMemberId=all.some(r=>String(r.id)===String(prior))?String(prior):String(all[0]?.id||"");
  memberSelect.value=selectedMemberId;
 }
 if(caseSelect){
  const prior=selectedCaseLabel||caseSelect.value;
  const selected=all.find(r=>String(r.id)===selectedMemberId);
  const labels=selected?.ends?.filter(e=>e.values.length===12).map(e=>e.label)||[];
  caseSelect.innerHTML=labels.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  selectedCaseLabel=labels.includes(prior)?prior:(labels[0]||"");
  caseSelect.value=selectedCaseLabel;
 }
 renderDetail();
 const eq=last.allCasesEquilibriumOK?"تعادل همه تحلیل‌ها برقرار است":"هشدار: در برخی تحلیل‌ها تعادل عددی برقرار نیست";
 const segmentationInfo=Number.isFinite(last.physicalMemberCount)&&last.physicalMemberCount!==last.modelMemberCount?" | "+last.modelMemberCount+" قطعه تحلیل برای "+last.physicalMemberCount+" عضو فیزیکی":"";
 $("memberForceSummary").textContent="اعضای گزارش‌شده: "+last.memberCount+segmentationInfo+" | حالت‌های بار: "+last.cases.length+" | "+eq+" | نیرو: kN، لنگر: kN.m. مقادیر جدول بیشینه قدرمطلق هر مؤلفه‌اند و ممکن است از ترکیب‌های متفاوت باشند.";
 $("btnMemberForceJSON").disabled=false;
}
function renderDetail(){
 const host=$("memberForceSimultaneousDetail");if(!host||!last)return;
 const member=(last.members||[]).find(r=>String(r.id)===String(selectedMemberId));
 const end=member?.ends?.find(e=>e.label===selectedCaseLabel&&e.values.length===12);
 if(!end){host.textContent="برای عضو و حالت انتخاب‌شده بردار نیروی معتبر در دسترس نیست.";return;}
 const labels=["Nᵢ (kN)","Vyᵢ (kN)","Vzᵢ (kN)","Tᵢ (kN.m)","Myᵢ (kN.m)","Mzᵢ (kN.m)","Nⱼ (kN)","Vyⱼ (kN)","Vzⱼ (kN)","Tⱼ (kN.m)","Myⱼ (kN.m)","Mzⱼ (kN.m)"];
 const p=member.section||{};
 const axes=member.localAxes||{};
 const axisSummary=["x","y","z"].map(k=>k.toUpperCase()+"=["+(Array.isArray(axes[k])?axes[k].map(v=>Number(v).toFixed(4)).join(", "):"ثبت‌نشده")+"]").join("؛ ");
 const props=[["مساحت A (cm²)",Number(p.A)*1e4],["Iy (cm⁴)",Number(p.Iy)*1e8],["Iz (cm⁴)",Number(p.Iz)*1e8],["J (cm⁴)",Number(p.J)*1e8],["E (GPa)",Number(p.E)/1e9],["G (GPa)",Number(p.G)/1e9]];
 const missing=props.filter(x=>!(Number.isFinite(x[1])&&x[1]>0)).map(x=>x[0]);
 const design=window.SteelMemberDesignInputs?.getForGroup?.(member.sectionKey)||{};
 const designFields=[["ضخامت مبنای مصالح (mm)",design.t_mm],["Fy (MPa)",design.Fy],["Fu (MPa)",design.Fu],["منبع خواص مصالح",design.materialSource],["Kx",design.Kx],["Ky",design.Ky],["Lcx (m)",design.Lcx],["Lcy (m)",design.Lcy],["Lb (m)",design.Lb],["Cb",design.Cb]];
 host.innerHTML='<div class="notice">عضو <b>'+esc(member.id)+'</b> — '+esc(member.profile||"مقطع ثبت‌نشده")+' — گره ابتدا: '+esc(member.start||"—")+' — گره انتها: '+esc(member.end||"—")+' — طول: '+fmt(member.length||0)+' m — حالت بار <b>'+esc(end.label)+'</b>. تمام ۱۲ مؤلفه زیر متعلق به همین یک تحلیل و هم‌زمان هستند.<br>نسخه قرارداد نیرو: '+(member.localEndForceConventionVersion||"نامشخص")+'؛ محورهای محلی: '+esc(axisSummary)+'</div>'+
 '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>مؤلفه</th><th>مقدار</th></tr></thead><tbody>'+
 labels.map((label,i)=>'<tr><td>'+label+'</td><td>'+fmt(i%6<3?end.values[i]/1000:end.values[i]/1e6)+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<h4>مشخصات مقطع دریافت‌شده از حل‌گر</h4><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>پارامتر</th><th>مقدار</th></tr></thead><tbody>'+
 props.map(x=>'<tr><td>'+x[0]+'</td><td>'+fmt(x[1])+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<div class="notice">'+(missing.length?"مشخصات لازم برای طراحی ناقص است: "+missing.join("، "):"مشخصات هندسی و الاستیک پایه مقطع از حل‌گر دریافت شده است.")+
 '؛ پارامترهای ورودی گروهی از رجیستر پروژه:</div>'+
 '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>پارامتر</th><th>مقدار ثبت‌شده</th></tr></thead><tbody>'+
 designFields.map(x=>'<tr><td>'+x[0]+'</td><td>'+(typeof x[1]==="string"?esc(x[1]):Number.isFinite(Number(x[1]))?fmt(Number(x[1])):"ثبت نشده")+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<div class="notice">'+(design.applyToAll?"تأیید شده که این پارامترهای گروهی برای تمام اعضای گروه یکسان‌اند؛ این تأیید باید با نقشه‌های مهاربندی و جزئیات واقعی تطبیق داده شود.":"پارامترهای گروهی برای این عضو به‌عنوان ورودی طراحی تأیید نشده‌اند.")+
 '؛ طبقه‌بندی مقطع و ضوابط موضعی هنوز باید از ابعاد واقعی مقطع تعیین شوند. این رجیستر فقط داده ورودی را نگهداری می‌کند و هیچ ظرفیت یا نسبت بهره‌برداری محاسبه نمی‌کند.</div>';
}
function exportJSON(){if(!last)return;const blob=new Blob([JSON.stringify(last,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-member-force-envelope.json";a.click();URL.revokeObjectURL(url);}
function init(){
 if($("memberForceEnvelopePanel"))return;
 const main=document.querySelector("main"),footer=main?.querySelector("footer");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="memberForceEnvelopePanel";
 p.innerHTML='<div class="panel-title"><h3>پوش نیروهای تیر، ستون، رفتر و اعضای فرعی</h3><span class="status">استخراج مستقیم از مدل سه‌بعدی</span></div>'+
 '<div class="notice">این بخش مستقل از طراحی صفحه‌ستون، نیروهای انتهایی محلی تمام اعضای مدل را در ترکیبات بار موجود استخراج می‌کند. مقادیر جدول بیشینه قدرمطلق هر مؤلفه در بین ترکیبات‌اند؛ این مقادیر را نباید به‌عنوان یک بردار هم‌زمان برای کنترل اندرکنش استفاده کرد.</div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="btnMemberForceEnvelope">تحلیل همه ترکیبات و استخراج نیروها</button><button type="button" class="btn secondary" id="btnMemberForceJSON" disabled>دریافت گزارش JSON</button></div>'+
 '<div class="form-grid"><div class="field"><label for="memberForceGroup">فیلتر گروه عضو</label><select id="memberForceGroup">'+groups.map(g=>'<option value="'+g[0]+'">'+g[1]+'</option>').join("")+'</select></div></div>'+
 '<div class="notice" id="memberForceForceNote">ابتدا مدل کامل و مشخصات مقاطع سه‌بعدی را آماده کنید.</div>'+
 '<div class="notice" id="memberForceEnvelopeResult">هنوز تحلیلی اجرا نشده است.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:850px;width:100%"><thead><tr><th>شناسه</th><th>گروه</th><th>طول m</th><th>N kN</th><th>Vy kN</th><th>Vz kN</th><th>My kN.m</th><th>Mz kN.m</th><th>حالت‌های معتبر</th></tr></thead><tbody id="memberForceRows"><tr><td colspan="9">پس از تحلیل نتایج نمایش داده می‌شود.</td></tr></tbody></table></div>'+
 '<div class="panel-title"><h4>بردار نیروهای هم‌زمان برای یک عضو و یک حالت بار</h4></div>'+
 '<div class="form-grid"><div class="field"><label for="memberForceDetailMember">انتخاب عضو</label><select id="memberForceDetailMember"></select></div><div class="field"><label for="memberForceDetailCase">انتخاب حالت بار</label><select id="memberForceDetailCase"></select></div></div>'+
 '<div id="memberForceSimultaneousDetail" class="notice">پس از تحلیل، عضو و حالت بار را انتخاب کنید.</div>'+
 '<div class="notice">این بردار هم‌زمان برای آماده‌سازی کنترل اندرکنش طبق بند ۱۰-۲-۷ مبحث دهم ارائه می‌شود؛ خود کنترل اندرکنش و ظرفیت هنوز پیاده‌سازی نشده است.</div>'+
 '<div class="notice">برای هر عضو، خروجی JSON شامل تمام ۱۲ مؤلفه نیروی انتهایی در هر ترکیب نگهداری می‌شود. تا تکمیل روابط مقاومت و اعتبارسنجی مستقل، نسبت قبولی/ردی خودکار اعلام نمی‌شود.</div>';
 if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);
 $("btnMemberForceEnvelope").addEventListener("click",run);$("btnMemberForceJSON").addEventListener("click",exportJSON);$("memberForceGroup").addEventListener("change",()=>{if(last)render();});$("memberForceDetailMember").addEventListener("change",e=>{selectedMemberId=e.target.value;selectedCaseLabel="";if(last)render();});$("memberForceDetailCase").addEventListener("change",e=>{selectedCaseLabel=e.target.value;renderDetail();});
}
function selfTest(){
 const checks=[],test=(name,fn)=>{try{checks.push({name,pass:!!fn()});}catch(e){checks.push({name,pass:false,error:e.message});}};
 const valid=Array(12).fill(0);
 test("valid simultaneous 12-DOF vector is retained",()=>buildRows({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:valid}]}])[0].caseCount===1);
 test("malformed force vector is excluded from envelope",()=>buildRows({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:[1,2,3]}]}])[0].caseCount===0);
 test("duplicate IDs in one case are reported",()=>auditCoverage({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:valid},{id:"A",localEndForces:valid}]}],[{id:"A",caseCount:1}]).duplicateMemberIdsByCase.length===1);
 test("inconsistent member sets across cases are reported",()=>auditCoverage({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:valid}]},{label:"SLS",members:[]}],[{id:"A",caseCount:1}]).analysisMemberSetMismatchCases.includes("SLS"));
 test("simultaneous member actions preserve same-case axial and biaxial moments",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"C1",members:[{id:"A",localEndForces:[100,2,3,4,50,60,-100,-2,-3,-4,-50,-60]}]},{label:"C2",members:[{id:"A",localEndForces:[200,4,6,8,5,6,-200,-4,-6,-8,-5,-6]}]}])[0];const d=getSimultaneousCaseDemand(r,"C1");return d?.endI.compression===100&&d.endI.My===50&&d.endI.Mz===60&&d.endI.Vy===2&&d.endI.T===4&&d.endJ.Mz===-60;});
 test("simultaneous demand lookup does not synthesize a case from independent envelopes",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"AXIAL",members:[{id:"A",localEndForces:[100,0,0,0,0,0,-100,0,0,0,0,0]}]},{label:"BENDING",members:[{id:"A",localEndForces:[0,0,0,0,0,900,0,0,0,0,0,-900]}]}])[0];const d=getSimultaneousCaseDemand(r,"AXIAL");return d.endI.Mz===0&&d.endI.compression===100;});
 test("invalid force vectors are reported with case identity",()=>auditCoverage({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:[1,2]}]}],[{id:"A",caseCount:0}]).invalidForceVectors[0]?.caseLabel==="ULS");
 test("axial tension sign is normalized consistently at both member ends",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"T",members:[{id:"A",localEndForces:[-100,0,0,0,0,0,120,0,0,0,0,0]}]}])[0],d=getSimultaneousCaseDemand(r,"T");return d.endI.tension===100&&d.endI.compression===0&&d.endJ.tension===120&&d.endJ.compression===0;});
 test("axial compression sign is normalized consistently at both member ends",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"C",members:[{id:"A",localEndForces:[100,0,0,0,0,0,-120,0,0,0,0,0]}]}])[0],d=getSimultaneousCaseDemand(r,"C");return d.endI.compression===100&&d.endI.tension===0&&d.endJ.compression===120&&d.endJ.tension===0;});
 test("duplicate and blank analyzed case labels are rejected",()=>{const x=auditCoverage({members:[]},[{label:"ULS",members:[]},{label:"ULS",members:[]},{label:"",members:[]}],[],["ULS","SLS"]);return !x.caseLabelCoverageOK&&x.duplicateCaseLabels.includes("ULS")&&x.blankCaseLabels.length===1&&x.missingCaseLabels.includes("SLS");});
 test("unexpected analyzed case labels are rejected",()=>!auditCoverage({members:[]},[{label:"ULS",members:[]},{label:"EXTRA",members:[]}],[],["ULS"]).caseLabelCoverageOK);
 test("duplicate expected case labels are rejected",()=>auditCoverage({members:[]},[{label:"ULS",members:[]}],[],["ULS","ULS"]).duplicateExpectedCaseLabels.includes("ULS"));
 return {passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,scope:"simultaneous action preservation and deterministic data-integrity tests only; no structural design approval"};
}
function getSimultaneousCaseDemand(row,label){
 const c=(row?.simultaneousCases||[]).find(x=>x.label===label);
 if(!c)return null;
 // Solver convention: tension is -Fx_i at end I and +Fx_j at end J.
 // Normalize both ends to one signed member-axial convention (tension positive).
 const endDemand=(e,end)=>{const raw=Number(e.N)||0,signedTension=end==="i"?-raw:raw;return {rawAxialN:raw,signedTensionN:signedTension,compression:Math.max(0,-signedTension),tension:Math.max(0,signedTension),Vy:Number(e.Vy)||0,Vz:Number(e.Vz)||0,T:Number(e.T)||0,My:Number(e.My)||0,Mz:Number(e.Mz)||0};};
 return {label:c.label,axialSignConvention:"tension-positive; endI=-Fx_i; endJ=+Fx_j",endI:endDemand(c.endI,"i"),endJ:endDemand(c.endJ,"j")};
}
root.SteelMemberForceEnvelope={run,getLast:()=>last,buildRows,auditCoverage,getSimultaneousCaseDemand,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
