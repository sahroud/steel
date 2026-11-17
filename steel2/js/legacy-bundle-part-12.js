/* ===== steel2/js/displacement-envelope.js ===== */
/* SAHROUD STEEL — node displacement envelope from shared 3D solver.
 * Linear first-order serviceability demand report; no code limits are assumed.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
let last=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
function loadCases(){
 const combos=window.SteelLoads?.getData?.().combinations;
 if(!Array.isArray(combos)||!combos.length)throw Error("ترکیبات بار فعلی در دسترس نیستند.");
 const out=combos.map((c,i)=>{
  const missing=["dead","live","snow"].filter(k=>c[k]===undefined||c[k]===null||c[k]==="");
  const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:0};
  if(missing.length||!String(c.name||("ترکیب "+(i+1))).trim()||Object.values(factors).some(v=>!Number.isFinite(v)||v<0))throw Error("نام یا ضرایب ترکیب بهره‌برداری "+(i+1)+" ناقص/نامعتبر است.");
  return {label:String(c.name||("ترکیب "+(i+1))),factors};
 });
 const model=window.SteelStructuralModel?.getData?.();
 const hasWind=(model?.members||[]).some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
 if(hasWind)combos.forEach((c,i)=>{
  const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:1};
  if(["dead","live","snow"].some(k=>c[k]===undefined||c[k]===null||c[k]==="")||Object.values(factors).some(v=>!Number.isFinite(v)||v<0))throw Error("ضرایب ترکیب باد "+(i+1)+" ناقص یا نامعتبر است.");
  [1,-1].forEach(sign=>out.push({label:String(c.name||("ترکیب "+(i+1)))+" + باد "+(sign>0?"مثبت":"منفی"),factors,windSign:sign}));
 });
 return out;
}
async function run(){
 const box=$("displacementEnvelopeResult"),btn=$("btnDisplacementEnvelope");
 try{
  if(!window.SteelStructuralModel?.analyze3D)throw Error("حل‌گر سه‌بعدی در دسترس نیست.");
  btn.disabled=true;box.textContent="در حال حل ترکیبات و استخراج جابه‌جایی گره‌ها…";
  const model=window.SteelStructuralModel.getData();if(!model)throw Error("ابتدا مدل کامل سوله را تولید کنید.");
  const nodes=new Map((model.nodes||[]).map(n=>[String(n.id),n]));
  const specs=loadCases(),samples=[];
  for(let i=0;i<specs.length;i++){
   const c=specs[i],r=await window.SteelStructuralModel.analyze3D({label:c.label,factors:c.factors,windSign:c.windSign||1});
   if(!r?.success||!Array.isArray(r.displacements))throw Error("خروجی جابه‌جایی در حالت "+c.label+" معتبر نیست.");
   samples.push({label:c.label,equilibrium:r.equilibrium,displacements:r.displacements});
   box.textContent="حل "+(i+1)+" از "+specs.length+" — "+c.label;
  }
  const map=new Map();
  samples.forEach(s=>s.displacements.forEach(d=>{
   const v=d.values||[],ux=Number(v[0]),uy=Number(v[1]),uz=Number(v[2]);
   if(![ux,uy,uz].every(Number.isFinite))return;
   const mag=Math.hypot(ux,uy,uz),id=String(d.nodeId);
   if(!map.has(id))map.set(id,{nodeId:d.nodeId,position:nodes.get(id)||null,peak:{ux:0,uy:0,uz:0,magnitude:0},controlling:{ux:"",uy:"",uz:"",magnitude:""},byCase:[]});
   const row=map.get(id);row.byCase.push({label:s.label,ux,uy,uz,magnitude:mag});
   [["ux",ux],["uy",uy],["uz",uz],["magnitude",mag]].forEach(([k,x])=>{if(Math.abs(x)>Math.abs(row.peak[k])){row.peak[k]=x;row.controlling[k]=s.label;}});
  }));
  const rows=[...map.values()].sort((a,b)=>Math.abs(b.peak.magnitude)-Math.abs(a.peak.magnitude));
  const bad=samples.filter(s=>!s.equilibrium?.ok);
  last={generatedAt:new Date().toISOString(),units:"m",method:"3D linear elastic first-order",codeBasis:window.SteelDesignCodes?.getData?.()||null,
   cases:samples.map(s=>({label:s.label,equilibrium:s.equilibrium})),nodes:rows,
   maximumTranslation:rows[0]?.peak.magnitude||0,allCasesEquilibriumOK:bad.length===0,
   limitations:["این گزارش فقط جابه‌جایی‌های تحلیل خطی مرتبه اول را نشان می‌دهد؛ P-Delta، کمانش و سختی نیمه‌صلب اتصالات لحاظ نشده‌اند.",
   "سناریوهای باد مثبت/منفی با ضریب واحد، ترکیب‌بار آیین‌نامه‌ای کامل نیستند.",
   "حدود مجاز خیز و تغییرمکان باید بر اساس کاربری، پوشش، اجزای غیرسازه‌ای و ضوابط معتبر پروژه تعیین شوند؛ نرم‌افزار در این گزارش حد مجاز فرض نکرده است.",
   "تغییرمکان نسبی قاب‌ها یا طبقات بدون تعریف صریح نقاط مرجع و ترازها به‌عنوان دریفت اعلام نمی‌شود."]};
  render();
 }catch(e){box.textContent="خطا: "+e.message;}
 finally{btn.disabled=false;}
}
function render(){
 const rows=last?.nodes||[];
 $("displacementEnvelopeRows").innerHTML=rows.slice(0,250).map(r=>'<tr><td>'+esc(r.nodeId)+'</td><td>'+fmt(r.peak.ux*1000)+'</td><td>'+fmt(r.peak.uy*1000)+'</td><td>'+fmt(r.peak.uz*1000)+'</td><td>'+fmt(r.peak.magnitude*1000)+'</td><td>'+esc(r.controlling.magnitude)+'</td></tr>').join("")||'<tr><td colspan="6">گرهی موجود نیست.</td></tr>';
 $("displacementEnvelopeSummary").textContent="گره‌ها: "+rows.length+" | ترکیبات/سناریوها: "+last.cases.length+" | بیشینه جابه‌جایی انتقالی: "+fmt(last.maximumTranslation*1000)+" mm | "+(last.allCasesEquilibriumOK?"تعادل عددی همه حل‌ها برقرار است":"هشدار: تعادل عددی حداقل یک حل برقرار نیست");
 $("btnDisplacementEnvelopeJSON").disabled=false;
}
function exportJSON(){if(!last)return;const blob=new Blob([JSON.stringify(last,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-displacement-envelope.json";a.click();URL.revokeObjectURL(url);}
function init(){
 if($("displacementEnvelopePanel"))return;
 const main=document.querySelector("main"),footer=main?.querySelector("footer");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="displacementEnvelopePanel";
 p.innerHTML='<div class="panel-title"><h3>پوش جابه‌جایی و کنترل بهره‌برداری مقدماتی</h3><span class="status">تحلیل گره‌به‌گره</span></div>'+
 '<div class="notice">تمام ترکیبات ثقلی موجود و در صورت وجود بار باد، سناریوهای باد مثبت و منفی حل می‌شوند. بیشینه مؤلفه‌ها و بردار جابه‌جایی هر گره در هر حالت در گزارش JSON نگهداری می‌شود. این پنل هیچ حد مجاز خیز یا دریفت را بدون تعیین مبنای پروژه فرض نمی‌کند.</div>'+
 '<div class="button-grid"><button id="btnDisplacementEnvelope" class="btn primary" type="button">تحلیل پوش جابه‌جایی‌ها</button><button id="btnDisplacementEnvelopeJSON" class="btn secondary" type="button" disabled>دریافت گزارش JSON</button></div>'+
 '<div id="displacementEnvelopeResult" class="notice">ابتدا مدل کامل و مقاطع تحلیل سه‌بعدی را آماده کنید.</div>'+
 '<div id="displacementEnvelopeSummary" class="notice">هنوز گزارشی تولید نشده است.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:760px;width:100%"><thead><tr><th>گره</th><th>ux mm</th><th>uy mm</th><th>uz mm</th><th>بیشینه بردار mm</th><th>حالت کنترل‌کننده</th></tr></thead><tbody id="displacementEnvelopeRows"><tr><td colspan="6">پس از تحلیل نمایش داده می‌شود.</td></tr></tbody></table></div>'+
 '<div class="notice">واحد جابه‌جایی جدول میلی‌متر است. خروجی کامل شامل مختصات گره، همه بردارهای جابه‌جایی در ترکیبات، خطای تعادل و مبنای آیین‌نامه‌ای ثبت‌شده است. این نتیجه به‌تنهایی تأیید بهره‌برداری یا انطباق با حدود مبحث ششم نیست.</div>';
 if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);
 $("btnDisplacementEnvelope").addEventListener("click",run);$("btnDisplacementEnvelopeJSON").addEventListener("click",exportJSON);
}
root.SteelDisplacementEnvelope={run,getLast:()=>last};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-detail-drawings.js ===== */
/* SAHROUD STEEL — geometric individual member sheets from the analytical model.
 * These are axis/geometry sheets, not fabrication drawings; connection details are not inferred.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=3)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
let last=null,selectedId='';
function collect(){
 const model=window.SteelStructuralModel?.getData?.()||window.SteelStructuralModel?.model;
 if(!model?.nodes?.length||!model?.members?.length)throw Error('ابتدا مدل سه‌بعدی سازه را بسازید.');
 const map=new Map(model.nodes.map(n=>[String(n.id),n]));
 const members=model.members.map(m=>{
  const a=map.get(String(m.start)),b=map.get(String(m.end));
  if(!a||!b) return {...m,valid:false,reason:'گره ابتدا یا انتها پیدا نشد.'};
  const dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y),dz=Number(b.z)-Number(a.z),length=Math.hypot(dx,dy,dz);
  return {...m,valid:Number.isFinite(length)&&length>0,from:{x:Number(a.x),y:Number(a.y),z:Number(a.z)},to:{x:Number(b.x),y:Number(b.y),z:Number(b.z)},computedLengthM:length,storedLengthM:Number.isFinite(Number(m.length))?Number(m.length):null,lengthDifferenceM:Number.isFinite(Number(m.length))?Number(m.length)-length:null};
 });
 return{model,members};
}
function svgFor(m){
 const a=m.from,b=m.to,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=m.computedLengthM;
 const W=1200,H=760,scale=Math.min(760/Math.max(Math.abs(dx)+Math.abs(dz)*.55,1),420/Math.max(Math.abs(dy)+Math.abs(dz)*.25,1),130/Math.max(len,1)*Math.max(len,1));
 const proj=p=>({x:590+(p.x-a.x)*scale+(p.z-a.z)*scale*.55,y:380-(p.y-a.y)*scale+(p.z-a.z)*scale*.28});
 const p1=proj(a),p2=proj(b),mid={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2};
 const profile=String(m.sectionKey||'نامشخص'),cut=Number.isFinite(Number(m.fabricationLengthM))?Number(m.fabricationLengthM):null;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:1200px;background:white"><rect width="1200" height="760" fill="white"/><rect x="20" y="20" width="1160" height="720" fill="none" stroke="#203746" stroke-width="2"/>';
 const tx=(x,y,t,z=15,c='#203746',anchor='middle')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+z+'" fill="'+c+'" font-family="Tahoma,Arial">'+esc(t)+'</text>';
 s+=tx(1130,58,'برگه هندسی عضو سازه — '+m.id,24,'#203746','end')+tx(1130,88,'گروه مقطع: '+profile+' | طول محور محاسبه‌شده: '+fmt(len)+' m',14,'#64748b','end');
 s+='<line x1="'+p1.x+'" y1="'+p1.y+'" x2="'+p2.x+'" y2="'+p2.y+'" stroke="#0f766e" stroke-width="16" stroke-linecap="round"/><circle cx="'+p1.x+'" cy="'+p1.y+'" r="10" fill="#1d4ed8"/><circle cx="'+p2.x+'" cy="'+p2.y+'" r="10" fill="#b91c1c"/>';
 s+=tx(p1.x,p1.y-20,'ابتدا '+m.start,12,'#1d4ed8')+tx(p2.x,p2.y-20,'انتها '+m.end,12,'#b91c1c')+tx(mid.x,mid.y-26,'L = '+fmt(len)+' m',18,'#0f766e');
 const rows=[['مختصات ابتدا',fmt(a.x)+', '+fmt(a.y)+', '+fmt(a.z)+' m'],['مختصات انتها',fmt(b.x)+', '+fmt(b.y)+', '+fmt(b.z)+' m'],['ΔX / ΔY / ΔZ',fmt(dx)+' / '+fmt(dy)+' / '+fmt(dz)+' m'],['طول ذخیره‌شده در مدل',m.storedLengthM===null?'ثبت نشده':fmt(m.storedLengthM)+' m'],['اختلاف طول مدل و مختصات',m.lengthDifferenceM===null?'قابل مقایسه نیست':fmt(m.lengthDifferenceM)+' m'],['طول ساخت ثبت‌شده',cut===null?'ثبت نشده':fmt(cut)+' m'],['قطعه فیزیکی',m.physicalPiece===true?'بله':m.physicalPiece===false?'خیر/نامشخص':'ثبت نشده'],['رکورد ساخت',m.fabricationRecord===true?'دارد':m.fabricationRecord===false?'ندارد':'ثبت نشده']];
 rows.forEach((r,i)=>{const y=520+i*25;s+='<line x1="140" y1="'+(y+8)+'" x2="1060" y2="'+(y+8)+'" stroke="#e2e8f0"/>'+tx(1020,y,r[0],12,'#475569','end')+tx(500,y,r[1],12,'#203746');});
 s+=tx(600,725,'این برگه فقط هندسه محور عضو را نشان می‌دهد؛ مقطع واقعی، برش، سوراخ‌کاری، ورق اتصال، جوش و پیچ در آن طراحی نشده‌اند.',12,'#b91c1c');
 return s+'</svg>';
}
function build(id){
 const d=collect(),m=d.members.find(x=>String(x.id)===String(id||selectedId)||x.valid);
 if(!m||!m.valid)throw Error(m?.reason||'عضو معتبری برای ترسیم وجود ندارد.');
 selectedId=String(m.id);
 const section=svgFor(m);
 last={generatedAt:new Date().toISOString(),member:{id:m.id,sectionKey:m.sectionKey||null,start:m.start,end:m.end,from:m.from,to:m.to,computedLengthM:m.computedLengthM,storedLengthM:m.storedLengthM,lengthDifferenceM:m.lengthDifferenceM,fabricationLengthM:Number.isFinite(Number(m.fabricationLengthM))?Number(m.fabricationLengthM):null,physicalPiece:m.physicalPiece??null,fabricationRecord:m.fabricationRecord??null},svg:section,limitations:['برگه فقط مختصات و طول هندسی محور عضو را نشان می‌دهد.','سطح مقطع، ابعاد بال و جان، ضخامت ورق، سوراخ‌کاری، پیچ، جوش، پخ و طول برش قطعی از این داده‌ها استخراج نشده‌اند.','عضوهای تحلیلی ممکن است به چند قطعه ساخت تقسیم شوند یا چند قطعه ساخت به چند المان تحلیلی شکسته شده باشند؛ شناسه المان به‌تنهایی شناسه قطعه کارگاهی نیست.','تا تکمیل طراحی اتصال و تفکیک قطعات فیزیکی، این برگه نقشه ساخت یا مونتاژ محسوب نمی‌شود.']};
 render(d.members);return last;
}
function render(members){
 const host=$('memberDetailDrawingPreview'),sel=$('memberDetailSelect');if(!host||!sel||!last)return;
 host.innerHTML='<div class="notice">عضو انتخاب‌شده: '+esc(last.member.id)+' | طول هندسی: '+fmt(last.member.computedLengthM)+' m | طول ساخت: '+(last.member.fabricationLengthM===null?'ثبت نشده':fmt(last.member.fabricationLengthM)+' m')+'</div>'+last.svg;
}
function refreshSelect(){
 const sel=$('memberDetailSelect');if(!sel)return;const d=collect(),old=sel.value||selectedId;
 sel.innerHTML=d.members.map(m=>'<option value="'+esc(m.id)+'" '+(String(m.id)===String(old)?'selected':'')+'>'+esc(m.id)+' — '+esc(m.sectionKey||'بدون مقطع')+'</option>').join('');
 if(!d.members.length)sel.innerHTML='<option value="">عضوی وجود ندارد</option>';
}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);}
function print(){if(!last)build($('memberDetailSelect')?.value);const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>@page{size:A3 landscape;margin:8mm}body{font-family:Tahoma}svg{width:100%;height:auto}</style>'+last.svg+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function exportCSV(){
 const d=collect(),rows=[['MemberId','SectionKey','StartNode','EndNode','StartX_m','StartY_m','StartZ_m','EndX_m','EndY_m','EndZ_m','AxisLength_m','StoredLength_m','FabricationLength_m','PhysicalPiece','FabricationRecord']];
 d.members.forEach(m=>rows.push([m.id,m.sectionKey||'',m.start,m.end,m.from?.x??'',m.from?.y??'',m.from?.z??'',m.to?.x??'',m.to?.y??'',m.to?.z??'',m.computedLengthM??'',m.storedLengthM??'',m.fabricationLengthM??'',m.physicalPiece??'',m.fabricationRecord??'']));
 download('SAHROUD-STEEL-Member-Geometry-Schedule.csv','\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv;charset=utf-8');
}
function mount(){
 if($('memberDetailDrawingsPanel'))return;const anchor=$('baseplateAnchorDrawingsPanel')||$('constructionDrawingsPanel');if(!anchor)return;
 const p=document.createElement('section');p.className='panel';p.id='memberDetailDrawingsPanel';
 p.innerHTML='<div class="panel-title"><h3>برگه هندسی تک‌عضو و جدول اعضای مدل — مرحله چهارم</h3><span class="status">استخراج از مدل سه‌بعدی</span></div><div class="notice">یک عضو را انتخاب کنید تا برگه هندسی محور آن ساخته شود. طول از مختصات واقعی دو گره دوباره محاسبه می‌شود و با طول ذخیره‌شده مقایسه خواهد شد. این برگه نقشه ساخت کارگاهی نیست.</div><div class="form-grid"><div class="field"><label for="memberDetailSelect">انتخاب عضو</label><select id="memberDetailSelect"></select></div></div><div class="button-grid"><button id="btnRefreshMemberDetails" class="btn secondary" type="button">به‌روزرسانی فهرست اعضا</button><button id="btnBuildMemberDetail" class="btn primary" type="button">تولید برگه عضو</button><button id="btnPrintMemberDetail" class="btn secondary" type="button">چاپ / ذخیره PDF</button><button id="btnExportMemberGeometry" class="btn secondary" type="button">خروجی CSV تمام اعضا</button></div><div id="memberDetailDrawingPreview" class="notice">ابتدا مدل سه‌بعدی را بسازید.</div><div class="notice">مرحله بعد: تفکیک قطعات فیزیکی از المان‌های تحلیل و طراحی واقعی اتصالات، سپس تولید نقشه تک‌قطعه و مونتاژ شامل ورق، سوراخ، پیچ، جوش و لیست برش.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 $('btnRefreshMemberDetails').addEventListener('click',()=>{try{refreshSelect();}catch(e){alert(e.message);}});
 $('btnBuildMemberDetail').addEventListener('click',()=>{try{build($('memberDetailSelect').value);}catch(e){alert(e.message);}});
 $('btnPrintMemberDetail').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportMemberGeometry').addEventListener('click',()=>{try{exportCSV();}catch(e){alert(e.message);}});
 try{refreshSelect();}catch(_){}
}
window.SteelMemberDetailDrawings={build,refreshSelect,getLast:()=>last?JSON.parse(JSON.stringify(last)):null,exportCSV};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

/* ===== steel2/js/member-section-evidence-intake.js ===== */
/* SAHROUD STEEL — evidence-backed section-property intake.
 * Maps one physical cold-formed member record to a unit-explicit design-input packet.
 * No inferred values, unit conversion, resistance calculation, or approval.
 */
(function(root){
"use strict";
const SOURCE=["document","revision","locator","authority"];
const PROPS=["Ag_mm2","Ix_mm4","Iy_mm4","Ixy_mm4","J_mm4","Cw_mm6","SxTop_mm3","SxBottom_mm3","SyTop_mm3","SyBottom_mm3","shearCenterX_mm","shearCenterY_mm"];
const POSITIVE=PROPS.filter(k=>!["Ixy_mm4","shearCenterX_mm","shearCenterY_mm"].includes(k));
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const positive=v=>finite(v)&&v>0;
const nonblank=v=>typeof v==="string"&&v.trim().length>0;
const clone=v=>JSON.parse(JSON.stringify(v));
function evidenceIssues(label,e){
 const missing=SOURCE.filter(k=>!nonblank(e?.[k]));
 return missing.length?[label+" فاقد مدرک/ردگیری: "+missing.join("، ")]:[];
}
function build(record){
 const r=record||{},issues=[],p=r.profile||{},m=r.material||{},s=r.sectionProperties||{};
 if(!nonblank(r.memberId))issues.push("شناسه عضو فیزیکی خالی است.");
 if(!["roofPurlin","wallGirt","endGirt","roofEdge"].includes(r.group))issues.push("گروه عضو سردنورد معتبر نیست.");
 if(!["C","Z","RHS","hat","custom"].includes(p.family))issues.push("خانواده مقطع مشخص یا معتبر نیست.");
 if(!nonblank(p.designation)||!nonblank(p.manufacturer)||!nonblank(p.catalogRevision))issues.push("شناسه سازنده/مقطع/نسخه کاتالوگ ناقص است.");
 issues.push(...evidenceIssues("کاتالوگ هندسه",p.catalogEvidence));
 const geometryFields=p.family==="RHS"?["width_mm","height_mm","thickness_mm","insideRadius_mm"]:p.family==="custom"?["thickness_mm","insideRadius_mm"]:["webHeight_mm","flange1_mm","flange2_mm","thickness_mm","insideRadius_mm","lip1_mm","lip2_mm"];
 if(p.family==="custom"&&(!nonblank(p.geometryDescription)||!nonblank(p.geometryReference)))issues.push("مقطع سفارشی به توصیف هندسه و مرجع نقشه/مدل نیاز دارد.");
 geometryFields.forEach(k=>{const v=p[k];if(["lip1_mm","lip2_mm"].includes(k)?(!finite(v)||v<0):!positive(v))issues.push("بعد "+k+" با واحد mm معتبر نیست.");});
 if(!nonblank(r.units?.geometry)||r.units.geometry!=="mm")issues.push("واحد هندسه باید صریحاً units.geometry='mm' باشد.");
 if(!positive(m.Fy_MPa)||!positive(m.Fu_MPa)||!positive(m.E_MPa))issues.push("Fy/Fu/E باید با واحد MPa و مقادیر مثبت ثبت شوند.");
 if(!nonblank(m.standard)||!nonblank(m.certificateReference))issues.push("استاندارد و مرجع گواهی مصالح ناقص است.");
 issues.push(...evidenceIssues("گواهی مصالح",m.certificateEvidence));
 if(!nonblank(r.units?.materialStress)||r.units.materialStress!=="MPa")issues.push("واحد تنش مصالح باید صریحاً MPa باشد.");
 PROPS.forEach(k=>{if(!finite(s[k])||(POSITIVE.includes(k)&&s[k]<=0))issues.push("خاصیت "+k+" با واحد مندرج در نام فیلد معتبر نیست.");});
 if(!nonblank(s.source)||!nonblank(s.method)||!nonblank(s.revision))issues.push("منبع/روش/نسخه استخراج خواص مقطع ناقص است.");
 issues.push(...evidenceIssues("مدرک خواص مقطع",s.evidence));
 const unitMap=r.units?.sectionProperties||{};
 PROPS.forEach(k=>{const expected=k.endsWith("_mm2")?"mm2":k.endsWith("_mm3")?"mm3":k.endsWith("_mm4")?"mm4":k.endsWith("_mm6")?"mm6":"mm";if(unitMap[k]!==expected)issues.push("واحد "+k+" باید صریحاً "+expected+" ثبت شود.");});
 const geometry={};geometryFields.forEach(k=>{if(finite(p[k]))geometry[k]=p[k];});
 if(p.family==="custom"){geometry.description=p.geometryDescription||null;geometry.reference=p.geometryReference||null;}
 const properties={};PROPS.forEach(k=>{if(finite(s[k]))properties[k]=s[k];});
 return {success:issues.length===0,status:issues.length?"blocked-incomplete-evidence-or-units":"evidence-backed-input-ready",memberId:r.memberId||null,group:r.group||null,profile:{family:p.family||null,designation:p.designation||null,manufacturer:p.manufacturer||null,catalogRevision:p.catalogRevision||null,geometry,units:"mm",catalogEvidence:clone(p.catalogEvidence||{})},material:{Fy_MPa:m.Fy_MPa??null,Fu_MPa:m.Fu_MPa??null,E_MPa:m.E_MPa??null,standard:m.standard||null,certificateReference:m.certificateReference||null,certificateEvidence:clone(m.certificateEvidence||{}),units:"MPa"},sectionProperties:{values:properties,units:clone(unitMap),source:s.source||null,method:s.method||null,revision:s.revision||null,evidence:clone(s.evidence||{})},issues:[...new Set(issues)],designApproved:false,capacityCalculated:false,scope:"evidence and unit validation only; no property derivation, resistance, buckling, serviceability, or code approval"};
}
function fromRegistry(memberId){
 const registry=root.SteelColdFormedMemberRegistry;
 if(!registry?.getData)return {success:false,status:"registry-unavailable",memberId,issues:["رجیستر اعضای سردنورد بارگذاری نشده است."],designApproved:false,capacityCalculated:false};
 const matches=(registry.getData().records||[]).filter(r=>String(r.memberId||"")===String(memberId||""));
 if(matches.length!==1)return {success:false,status:"member-not-unique",memberId,issues:["برای شناسه درخواستی باید دقیقاً یک پرونده فیزیکی وجود داشته باشد؛ تعداد یافت‌شده: "+matches.length],designApproved:false,capacityCalculated:false};
 return build(matches[0]);
}
function drawingTrace(memberId,drawing){
 const d=drawing||root.SteelMemberDetailDrawings?.getLast?.(),same=!!d&&String(d.member?.id||"")===String(memberId||"");
 return {memberId,analysisElementMatch:same,physicalFabricationIdentityVerified:false,status:same?"analysis-element-geometry-only":"no-matching-current-analysis-drawing",note:"تطبیق شناسه برگه فعلی فقط تطبیق عضو/المان مدل تحلیل است؛ قطعه فیزیکی ساخت، برش، سوراخ، جوش و اتصال را اثبات نمی‌کند.",designApproved:false};
}
function selfTest(){
 const ev={document:"catalog.pdf",revision:"R2",locator:"p.8",authority:"manufacturer"};
 const good={memberId:"P-01",group:"roofPurlin",profile:{family:"Z",designation:"Z200",manufacturer:"M",catalogRevision:"R2",webHeight_mm:200,flange1_mm:60,flange2_mm:60,thickness_mm:2,insideRadius_mm:4,lip1_mm:15,lip2_mm:15,catalogEvidence:ev},material:{Fy_MPa:350,Fu_MPa:420,E_MPa:200000,standard:"EN 10346",certificateReference:"CERT-1",certificateEvidence:ev},sectionProperties:{Ag_mm2:500,Ix_mm4:1e6,Iy_mm4:2e5,Ixy_mm4:0,J_mm4:1000,Cw_mm6:1e9,SxTop_mm3:10000,SxBottom_mm3:10000,SyTop_mm3:4000,SyBottom_mm3:4000,shearCenterX_mm:0,shearCenterY_mm:0,source:"catalogue",method:"manufacturer table",revision:"R2",evidence:ev},units:{geometry:"mm",materialStress:"MPa",sectionProperties:{Ag_mm2:"mm2",Ix_mm4:"mm4",Iy_mm4:"mm4",Ixy_mm4:"mm4",J_mm4:"mm4",Cw_mm6:"mm6",SxTop_mm3:"mm3",SxBottom_mm3:"mm3",SyTop_mm3:"mm3",SyBottom_mm3:"mm3",shearCenterX_mm:"mm",shearCenterY_mm:"mm"}}};
 const tests=[];
 tests.push({name:"complete sourced record passes unit-explicit intake",pass:build(good).success});
 const noSource=clone(good);delete noSource.profile.catalogEvidence;tests.push({name:"missing catalogue provenance blocks intake",pass:!build(noSource).success});
 const noUnits=clone(good);delete noUnits.units.sectionProperties.Ix_mm4;tests.push({name:"missing property unit blocks intake",pass:!build(noUnits).success});
 const wrongUnit=clone(good);wrongUnit.units.geometry="cm";tests.push({name:"geometry unit mismatch blocks intake without conversion",pass:!build(wrongUnit).success});
 const missingProp=clone(good);delete missingProp.sectionProperties.Ix_mm4;tests.push({name:"missing section property is not inferred",pass:!build(missingProp).success});
 const missingCert=clone(good);delete missingCert.material.certificateEvidence;tests.push({name:"missing material certificate evidence blocks intake",pass:!build(missingCert).success});
 const custom=clone(good);custom.profile.family="custom";delete custom.profile.webHeight_mm;delete custom.profile.flange1_mm;delete custom.profile.flange2_mm;delete custom.profile.lip1_mm;delete custom.profile.lip2_mm;tests.push({name:"custom geometry requires an explicit drawing/model reference",pass:!build(custom).success});
 const rhs=clone(good);rhs.profile.family="RHS";rhs.profile.width_mm=100;rhs.profile.height_mm=50;delete rhs.profile.webHeight_mm;delete rhs.profile.flange1_mm;delete rhs.profile.flange2_mm;delete rhs.profile.lip1_mm;delete rhs.profile.lip2_mm;tests.push({name:"RHS geometry uses RHS dimensions and does not require channel lips",pass:build(rhs).success});
 const priorRegistry=root.SteelColdFormedMemberRegistry;root.SteelColdFormedMemberRegistry={getData:()=>({records:[good,{...good}]})};tests.push({name:"duplicate physical member IDs block registry intake",pass:fromRegistry("P-01").status==="member-not-unique"});root.SteelColdFormedMemberRegistry=priorRegistry;
 const duplicate={...good,memberId:"P-01"};tests.push({name:"intake output never approves or calculates capacity",pass:build(duplicate).designApproved===false&&build(duplicate).capacityCalculated===false});
 tests.push({name:"drawing trace is explicitly not fabrication identity",pass:drawingTrace("P-01",{member:{id:"P-01"}}).physicalFabricationIdentityVerified===false});
 return {passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,total:tests.length,tests,scope:"unit-explicit evidence intake only; no structural design approval"};
}
root.SteelMemberSectionEvidenceIntake={build,fromRegistry,drawingTrace,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/dropbox-integration.js ===== */
/* SAHROUD STEEL - Dropbox direct upload (OAuth 2.0 PKCE) */
(function () {
  "use strict";

  const CLIENT_ID = "zevuaxek7hupqfb";
  const REDIRECT_URI = "https://sahroud.github.io/steel/steel2/dropbox-callback.html";
  const FOLDER = "/نتایج نرم‌افزارهای مهندسی";
  const TOKEN_KEY = "sahroud_dropbox_refresh_token_v1";
  const AUTO_KEY = "sahroud_dropbox_auto_upload_v1";
  const REPORT_KEY = "sahroud_steel_latest_span_report_v1";
  const $ = id => document.getElementById(id);

  let auth = null;
  let dbx = null;
  let uploadInProgress = false;

  function hasToken() {
    try { return !!localStorage.getItem(TOKEN_KEY); } catch (_) { return false; }
  }

  function getLatestReport() {
    const live = window.SteelStructuralModel?.lastSpanComparison;
    if (live && typeof live === "object") return live;
    try {
      const saved = localStorage.getItem(REPORT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (_) { return null; }
  }

  function rememberLatestReport(report) {
    if (!report || typeof report !== "object") return;
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(report)); } catch (_) {}
    if (window.SteelStructuralModel) window.SteelStructuralModel.lastSpanComparison = report;
  }

  function getClient() {
    if (!window.Dropbox || !window.Dropbox.DropboxAuth || !window.Dropbox.Dropbox) {
      throw new Error("کتابخانه رسمی Dropbox بارگذاری نشده است؛ اتصال اینترنت را بررسی کنید.");
    }
    const refreshToken = localStorage.getItem(TOKEN_KEY);
    if (!refreshToken) throw new Error("ابتدا Dropbox را متصل کنید.");
    auth = new window.Dropbox.DropboxAuth({ clientId: CLIENT_ID, refreshToken });
    dbx = new window.Dropbox.Dropbox({ auth });
    return dbx;
  }

  function setStatus(message, isError) {
    const el = $("dropboxStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "#b45309" : "#166534";
  }

  function updateUI() {
    const connected = hasToken();
    const connect = $("btnDropboxConnect");
    const disconnect = $("btnDropboxDisconnect");
    const upload = $("btnDropboxUploadLatest");
    const projectUpload = $("btnDropboxUploadProject");
    const auto = $("dropboxAutoUpload");
    if (connect) connect.hidden = connected;
    if (disconnect) disconnect.hidden = !connected;
    if (upload) upload.disabled = uploadInProgress || !connected || !getLatestReport();
    if (projectUpload) projectUpload.disabled = uploadInProgress || !connected || !window.SteelProject?.getData;
    if (auto) auto.checked = localStorage.getItem(AUTO_KEY) !== "false";
    setStatus(connected
      ? "Dropbox در این مرورگر متصل است. پوشه مقصد: " + FOLDER
      : "Dropbox هنوز در این مرورگر متصل نشده است.", false);
  }

  async function connect() {
    if (!window.Dropbox?.DropboxAuth) throw new Error("کتابخانه Dropbox در دسترس نیست.");
    if (!window.crypto?.subtle) throw new Error("مرورگر باید از Web Crypto پشتیبانی کند؛ صفحه را با HTTPS باز کنید.");
    const stateBytes = new Uint8Array(24);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes, b => b.toString(16).padStart(2, "0")).join("");
    auth = new window.Dropbox.DropboxAuth({ clientId: CLIENT_ID });
    const url = await auth.getAuthenticationUrl(
      REDIRECT_URI, state, "code", "offline",
      ["files.content.write"], undefined, true
    );
    sessionStorage.setItem("sahroud_dropbox_state", state);
    sessionStorage.setItem("sahroud_dropbox_code_verifier", auth.getCodeVerifier());
    window.location.assign(url);
  }

  async function uploadSpanReport(report) {
    if (!report || typeof report !== "object") throw new Error("گزارش آزمایش معتبر نیست.");
    const client = getClient();
    if (auth && typeof auth.checkAndRefreshAccessToken === "function") {
      await auth.checkAndRefreshAccessToken();
    }
    const date = new Date(report.generatedAt || Date.now());
    if (!Number.isFinite(date.getTime())) throw new Error("زمان ثبت گزارش معتبر نیست.");
    const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\\.\\d{3}Z$/, "Z");
    const fileName = "sahroud-steel-span10-" + stamp + ".json";
    const path = FOLDER + "/" + fileName;
    const response = await client.filesUpload({
      path,
      contents: JSON.stringify(report, null, 2),
      // Re-sending the same run updates its report instead of failing on a duplicate name.
      mode: { ".tag": "overwrite" },
      autorename: false,
      mute: true
    });
    setStatus("ارسال تأیید شد؛ گزارش در Dropbox ذخیره شد: " + (response.result.path_display || path), false);
    return response.result;
  }

  async function uploadCurrentProject() {
    if (!window.SteelProject || typeof window.SteelProject.getData !== "function") throw new Error("مدیر پروژه آماده نیست.");
    const data = window.SteelProject.getData();
    if (!data || typeof data !== "object") throw new Error("اطلاعات پروژه برای ذخیره آماده نیست.");
    const client = getClient();
    if (auth && typeof auth.checkAndRefreshAccessToken === "function") await auth.checkAndRefreshAccessToken();
    const path = FOLDER + "/Sahroud_Steel_Project.json";
    const response = await client.filesUpload({
      path,
      contents: JSON.stringify(data, null, 2),
      mode: { ".tag": "overwrite" },
      autorename: false,
      mute: true
    });
    setStatus("پروژه فعلی مستقیماً در Dropbox ذخیره شد: " + (response.result.path_display || path), false);
    return response.result;
  }

  function addPanel() {
    if ($("dropboxIntegrationPanel")) return;
    const anchor = $("shedLayoutPanel") || $("fullModel3DResult")?.closest(".panel");
    if (!anchor || !anchor.parentNode) return;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "dropboxIntegrationPanel";
    panel.innerHTML =
      '<div class="panel-title"><h3>ذخیره گزارش در Dropbox</h3><span class="status">اتصال مستقیم</span></div>' +
      '<p>گزارش آزمایش دهانه ۱۰ متر در پوشه «نتایج نرم‌افزارهای مهندسی» ذخیره می‌شود. این اتصال فقط اجازه بارگذاری فایل گزارش را درخواست می‌کند.</p>' +
      '<div class="button-grid">' +
      '<button type="button" id="btnDropboxConnect" class="btn primary">اتصال به Dropbox</button>' +
      '<button type="button" id="btnDropboxDisconnect" class="btn secondary" hidden>قطع اتصال این مرورگر</button>' +
      '<button type="button" id="btnDropboxUploadLatest" class="btn success" disabled>بارگذاری آخرین گزارش</button>' +
      '<button type="button" id="btnDropboxUploadProject" class="btn primary" disabled>ذخیره مستقیم پروژه در Dropbox</button>' +
      '</div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="dropboxAutoUpload" checked> بارگذاری خودکار گزارش‌های آزمایش بعدی پس از اتصال</label>' +
      '<div id="dropboxStatus" class="notice" aria-live="polite">وضعیت اتصال بررسی می‌شود.</div>' +
      '<p class="geometry-hint">برای اتصال، صفحه رسمی Dropbox باز می‌شود و باید دسترسی را تأیید کنید. کلید محرمانه یا رمز عبور در این نرم‌افزار ذخیره نمی‌شود. توکن تمدید دسترسی در حافظه محلی همین مرورگر نگهداری می‌شود؛ برای قطع کامل مجوز، دسترسی برنامه را از تنظیمات امنیتی Dropbox نیز لغو کنید.</p>';
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);

    $("btnDropboxConnect").addEventListener("click", async () => {
      try { setStatus("در حال انتقال به صفحه امن Dropbox…", false); await connect(); }
      catch (e) { setStatus("اتصال شروع نشد: " + e.message, true); }
    });
    $("btnDropboxDisconnect").addEventListener("click", () => {
      try { localStorage.removeItem(TOKEN_KEY); auth = null; dbx = null; }
      catch (e) { setStatus("خطا در قطع اتصال: " + e.message, true); return; }
      updateUI();
    });
    $("btnDropboxUploadLatest").addEventListener("click", async () => {
      if (uploadInProgress) return;
      const report = getLatestReport();
      if (!report) {
        setStatus("گزارش آزمایش دهانه ۱۰ متر پیدا نشد؛ ابتدا آزمایش را اجرا کنید.", true);
        return;
      }
      uploadInProgress = true;
      updateUI();
      setStatus("در حال ارسال گزارش به Dropbox؛ لطفاً دکمه را دوباره نزنید…", false);
      try {
        await uploadSpanReport(report);
      } catch (e) {
        setStatus("ارسال ناموفق بود: " + (e.error?.error_summary || e.message) + "؛ گزارش در حافظه مرورگر باقی مانده است.", true);
      } finally {
        uploadInProgress = false;
        updateUI();
      }
    });
    $("btnDropboxUploadProject").addEventListener("click", async () => {
      if (uploadInProgress) return;
      uploadInProgress = true;
      updateUI();
      setStatus("در حال ذخیره فایل کامل پروژه در Dropbox…", false);
      try { await uploadCurrentProject(); }
      catch (e) { setStatus("ذخیره پروژه ناموفق بود: " + (e.error?.error_summary || e.message), true); }
      finally { uploadInProgress = false; updateUI(); }
    });
    $("dropboxAutoUpload").addEventListener("change", e => {
      localStorage.setItem(AUTO_KEY, e.target.checked ? "true" : "false");
    });
    updateUI();
  }

  window.addEventListener("sahroud:span-report-ready", async event => {
    rememberLatestReport(event.detail);
    updateUI();
    if (localStorage.getItem(AUTO_KEY) === "false" || !hasToken()) return;
    try {
      setStatus("گزارش جدید شناسایی شد؛ بارگذاری خودکار آغاز شد…", false);
      await uploadSpanReport(event.detail);
    } catch (e) {
      setStatus("گزارش آماده است اما بارگذاری خودکار ناموفق بود: " + (e.error?.error_summary || e.message), true);
    }
  });

  window.SahroudDropbox = {
    uploadSpanReport,
    uploadCurrentProject,
    isConnected: hasToken,
    isAutoUploadEnabled: () => localStorage.getItem(AUTO_KEY) !== "false"
  };

  function init() {
    addPanel();
    const params = new URLSearchParams(location.search);
    if (params.get("dropbox") === "connected") {
      history.replaceState({}, document.title, location.pathname);
      setStatus("اتصال Dropbox با موفقیت برقرار شد. اکنون می‌توانید گزارش قبلی را بارگذاری کنید یا آزمایش را دوباره اجرا کنید.", false);
    } else if (params.get("dropbox") === "error") {
      setStatus("اتصال Dropbox ناموفق بود: " + (params.get("message") || "خطای نامشخص"), true);
    }
    updateUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ===== steel2/js/building-coverage-matrix.js ===== */
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


/* ===== steel2/js/anchor-group-torsion-demand.js ===== */
/* SAHROUD STEEL — elastic anchor-group torsional shear demand distribution.
 * Distributes a pure vertical-axis moment My over explicitly located anchors.
 * This is demand bookkeeping only: no anchor/concrete/plate capacity or code approval.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function distribute(momentNm,anchors){
 const issues=[],M=Number(momentNm),items=Array.isArray(anchors)?anchors:[];
 if(!Number.isFinite(M))issues.push("گشتاور پیچشی My باید عددی و محدود باشد.");
 if(items.length<2)issues.push("حداقل دو انکربولت با مختصات مستقل لازم است.");
 const ids=new Set();
 items.forEach((a,i)=>{
  const id=String(a?.id??"").trim(),x=Number(a?.x_m),z=Number(a?.z_m);
  if(!id||ids.has(id))issues.push("شناسه انکربولت خالی یا تکراری است: "+id);
  ids.add(id);
  if(!Number.isFinite(x)||!Number.isFinite(z))issues.push("مختصات X/Z انکربولت "+(id||i+1)+" معتبر نیست.");
 });
 if(issues.length)return{ok:false,issues,demands:[],analysisEnabled:false,designApproved:false};
 const cx=items.reduce((s,a)=>s+Number(a.x_m),0)/items.length;
 const cz=items.reduce((s,a)=>s+Number(a.z_m),0)/items.length;
 const rel=items.map(a=>({id:String(a.id),x:Number(a.x_m)-cx,z:Number(a.z_m)-cz}));
 const J=rel.reduce((s,a)=>s+a.x*a.x+a.z*a.z,0);
 if(!(J>1e-14&&Number.isFinite(J)))return{ok:false,issues:["گروه انکربولت حول مرکز هندسی بازوی مؤثر برای تحمل پیچش قائم ندارد."],demands:[],analysisEnabled:false,designApproved:false};
 const demands=rel.map(a=>({anchorId:a.id,relativeX_m:a.x,relativeZ_m:a.z,Fx_N:M*a.z/J,Fz_N:-M*a.x/J,sourceMomentMy_Nm:M}));
 const sumFx=demands.reduce((s,a)=>s+a.Fx_N,0),sumFz=demands.reduce((s,a)=>s+a.Fz_N,0);
 const recoveredMy=demands.reduce((s,a)=>s+a.relativeZ_m*a.Fx_N-a.relativeX_m*a.Fz_N,0);
 const forceTol=Math.max(1e-8,Math.abs(M)*1e-10),momentTol=Math.max(1e-7,Math.abs(M)*1e-9);
 const equilibrium={sumFx_N:sumFx,sumFz_N:sumFz,recoveredMy_Nm:recoveredMy,forceResidual_N:Math.hypot(sumFx,sumFz),momentResidual_Nm:recoveredMy-M,ok:Math.hypot(sumFx,sumFz)<=forceTol&&Math.abs(recoveredMy-M)<=momentTol};
 if(!equilibrium.ok)issues.push("تعادل نیرو/گشتاور توزیع پیچش گروه انکر برقرار نیست.");
 return{ok:issues.length===0,ready:issues.length===0,centroid_m:{x:cx,z:cz},polarCoordinateSum_m2:J,demands,equilibrium,units:{moment:"N.m",force:"N",coordinates:"m"},method:"elastic tangential distribution: Fx=My*z/J, Fz=-My*x/J, coordinates measured from anchor-group centroid",scope:"تقاضای برشی ناشی از پیچش قائم فقط؛ بدون اندرکنش با برش مستقیم، کشش انکر، سختی صفحه‌ستون، تماس بتن، ظرفیت فولاد/بتن، اثر اهرمی یا طراحی آیین‌نامه‌ای.",analysisEnabled:false,designApproved:false};
}
function fromFoundationDemand(demand,anchors){
 if(!demand||!Array.isArray(demand.columnActionN_Nm)||demand.columnActionN_Nm.length!==6||!demand.columnActionN_Nm.every(finite))return{ok:false,issues:["تقاضای واکنش فونداسیون باید بردار شش‌مؤلفه‌ای معتبر columnActionN_Nm داشته باشد."],demands:[],analysisEnabled:false,designApproved:false};
 const torsion=demand.columnActionN_Nm[4];
 const result=distribute(torsion,anchors);
 return {...result,source:{nodeId:String(demand.nodeId??""),caseId:String(demand.caseId??""),columnActionTy_Nm:torsion},mapping:"FoundationReactionBridge.columnActionN_Nm[4] → global vertical-axis My; anchor coordinates x_m/z_m",scope:"انتقال صرفاً تقاضای پیچش حول محور قائم از واکنش پایه به گروه انکر؛ سایر مؤلفه‌های برش و کشش در این محاسبه وارد نمی‌شوند.",analysisEnabled:false,designApproved:false};
}
function fromFoundationBridgeResult(bridgeResult,anchorsByNode){
 const issues=[],demands=Array.isArray(bridgeResult?.demands)?bridgeResult.demands:[],groups=anchorsByNode&&typeof anchorsByNode==="object"?anchorsByNode:{};
 if(bridgeResult?.ok!==true)issues.push("ابتدا باید ممیزی پل واکنش فونداسیون با موفقیت انجام شده باشد.");
 if(!demands.length)issues.push("فهرست تقاضاهای مستقل گره/حالت بار در پل واکنش خالی است.");
 if(issues.length)return{ok:false,issues,results:[],analysisEnabled:false,designApproved:false};
 const results=[];
 demands.forEach(d=>{
  const id=String(d?.nodeId??""),anchors=groups[id];
  if(!id||!Array.isArray(anchors)){issues.push("مختصات انکربولت برای گره پایه "+(id||"نامشخص")+" تعریف نشده است.");return;}
  const mapped=fromFoundationDemand(d,anchors);
  if(!mapped.ok){issues.push("گره "+id+" / حالت "+String(d.caseId??"")+": "+mapped.issues.join("؛ "));return;}
  results.push(mapped);
 });
 if(results.length!==demands.length)issues.push("تعداد گروه‌های توزیع‌شده با تعداد تقاضاهای مستقل واکنش برابر نیست.");
 return{ok:issues.length===0,ready:issues.length===0,issues,results:issues.length?[]:results,caseCount:new Set(demands.map(d=>String(d.caseId))).size,supportCount:new Set(demands.map(d=>String(d.nodeId))).size,independentNodeCaseDemands:true,combinesEnvelopeExtrema:false,analysisEnabled:false,designApproved:false,scope:"توزیع تقاضای پیچش خالص هر گره/حالت بار؛ بدون ظرفیت‌سنجی یا اندرکنش نیروها."};
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const square=[{id:"A",x_m:-.1,z_m:-.1},{id:"B",x_m:.1,z_m:-.1},{id:"C",x_m:.1,z_m:.1},{id:"D",x_m:-.1,z_m:.1}];
 ck("pure torsion creates zero resultant horizontal force",()=>{const r=distribute(10000,square);return r.ok&&r.equilibrium.forceResidual_N<1e-8;});
 ck("recovered torsion equals applied My",()=>{const r=distribute(-25000,square);return r.ok&&Math.abs(r.equilibrium.recoveredMy_Nm+25000)<1e-8;});
 ck("anchor forces reverse with moment sign",()=>{const a=distribute(1000,square),b=distribute(-1000,square);return a.ok&&b.ok&&Math.abs(a.demands[0].Fx_N+b.demands[0].Fx_N)<1e-8;});
 ck("rejects missing anchor geometry",()=>!distribute(1000,[{id:"A",x_m:0,z_m:0}]).ok);
 ck("rejects duplicate anchor IDs",()=>!distribute(1000,[square[0],{...square[1],id:"A"}]).ok);
 ck("rejects non-finite coordinates",()=>!distribute(1000,[square[0],{...square[1],x_m:NaN}]).ok);
 ck("rejects coincident anchor group with no torsional lever arm",()=>!distribute(1000,square.map(a=>({...a,x_m:0,z_m:0})).map((a,i)=>({...a,id:"P"+i}))).ok);
 ck("does not approve anchor or foundation design",()=>{const r=distribute(1000,square);return r.analysisEnabled===false&&r.designApproved===false;});
 const reaction={nodeId:"BASE-1",caseId:"ULS-7",columnActionN_Nm:[100,200,300,400,5000,600]};
 ck("maps foundation column-action Ty from the correct sixth-DOF slot",()=>{const r=fromFoundationDemand(reaction,square);return r.ok&&r.source.columnActionTy_Nm===5000&&Math.abs(r.equilibrium.recoveredMy_Nm-5000)<1e-8;});
 ck("preserves support node and load-case identity",()=>{const r=fromFoundationDemand(reaction,square);return r.ok&&r.source.nodeId==="BASE-1"&&r.source.caseId==="ULS-7";});
 ck("rejects missing foundation reaction vector",()=>!fromFoundationDemand({nodeId:"B",caseId:"C"},square).ok);
 ck("rejects non-finite foundation reaction component",()=>!fromFoundationDemand({...reaction,columnActionN_Nm:[1,2,3,4,NaN,6]},square).ok);
 ck("foundation-to-anchor adapter remains demand-only",()=>{const r=fromFoundationDemand(reaction,square);return r.analysisEnabled===false&&r.designApproved===false;});
 const bridge={ok:true,demands:[reaction,{...reaction,nodeId:"BASE-2",caseId:"ULS-8",columnActionN_Nm:[0,0,0,0,-3000,0]}]};
 ck("maps every support and load case from successful foundation bridge",()=>{const r=fromFoundationBridgeResult(bridge,{"BASE-1":square,"BASE-2":square});return r.ok&&r.results.length===2&&r.caseCount===2&&r.supportCount===2;});
 ck("keeps repeated support cases independent",()=>{const r=fromFoundationBridgeResult({ok:true,demands:[reaction,{...reaction,caseId:"SLS-1"}]},{"BASE-1":square});return r.ok&&r.results.length===2&&r.results[0].source.caseId!==r.results[1].source.caseId;});
 ck("rejects a missing anchor group without partial output",()=>{const r=fromFoundationBridgeResult(bridge,{"BASE-1":square});return !r.ok&&r.results.length===0;});
 ck("rejects an unapproved foundation reaction bridge",()=>!fromFoundationBridgeResult({...bridge,ok:false},{"BASE-1":square,"BASE-2":square}).ok);
 const passed=checks.filter(x=>x.ok).length;return{passed,failed:checks.length-passed,total:checks.length,checks,analysisEnabled:false,designApproved:false};
}
root.SteelAnchorGroupTorsionDemand={distribute,fromFoundationDemand,fromFoundationBridgeResult,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/foundation-reaction-bridge.js ===== */
/* SAHROUD STEEL — per-case six-DOF foundation reaction bridge.
 * Preserves torsion and case identity; never combines independent envelopes.
 * Units: N, N.m internally; kN, kN.m in display mapping.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function mapSix(values){
 if(!Array.isArray(values)||values.length!==6||values.some(v=>!finite(v)))throw Error("واکنش پایه باید دقیقاً شش مؤلفه محدود داشته باشد.");
 return {solverReactionN_Nm:values.slice(),columnActionN_Nm:values.map(v=>-v),
  columnActionDisplay:{N_tensionPositive_kN:-values[1]/1000,Vx_kN:-values[0]/1000,Vz_kN:-values[2]/1000,Mx_kNm:-values[3]/1000,Ty_kNm:-values[4]/1000,Mz_kNm:-values[5]/1000}};
}
function audit(envelope,model,options){
 options=options||{};
 const issues=[],auditFn=root.SteelFoundationReactionAudit?.audit;
 if(typeof auditFn!=="function")issues.push("ممیزی پوش واکنش فونداسیون بارگذاری نشده است.");
 const base=typeof auditFn==="function"?auditFn(envelope,model,options.footingSpecFor):null;
 if(base&&!base.ok)issues.push(...base.issues);
 if(options.expectedFingerprint&&envelope?.foundationModelFingerprint!==options.expectedFingerprint)issues.push("اثر انگشت مدل فونداسیون با مدل جاری تطبیق ندارد.");
 const cases=Array.isArray(envelope?.cases)?envelope.cases:[],rows=Array.isArray(envelope?.rows)?envelope.rows:[];
 const labels=new Set();
 cases.forEach(c=>{const label=String(c?.label||"");if(!label||labels.has(label))issues.push("شناسه/عنوان حالت بار خالی یا تکراری است: "+label);labels.add(label);});
 const demands=[];
 rows.forEach(row=>{
  const nodeId=String(row?.nodeId||"");
  const coordinates={x:row?.x,y:row?.y,z:row?.z};
  const coordinateOK=!!nodeId&&[coordinates.x,coordinates.y,coordinates.z].every(finite);
  if(!coordinateOK)issues.push("شناسه گره و مختصات سه‌بعدی آن باید صریحاً عددی و محدود باشند؛ تبدیل خودکار مختصات متنی مجاز نیست.");
  (row?.caseReactions||[]).forEach(item=>{
   const label=String(item?.label||"");
   try{
    if(!coordinateOK)throw Error("مختصات/شناسه گره معتبر نیست.");
    if(!labels.has(label))throw Error("حالت بار در فهرست اصلی پوش وجود ندارد.");
    const mapped=mapSix(item.values);
    demands.push({nodeId,caseId:label,coordinatesM:{...coordinates},kind:row.kind,
     ...mapped,units:{force:"N",moment:"N.m"},status:"demand_only_not_designed",torsionRetained:true,torsionDesignRequired:true});
   }catch(e){issues.push("گره "+nodeId+" / "+label+": "+e.message);}
  });
 });
 const expected=rows.length*cases.length;
 if(demands.length!==expected)issues.push("تعداد تقاضاهای شش‌مؤلفه‌ای با حاصل‌ضرب تعداد گره‌ها و حالات بار برابر نیست.");
 const keys=new Set();demands.forEach(d=>{const k=d.nodeId+"|"+d.caseId;if(keys.has(k))issues.push("تقاضای تکراری برای "+k);keys.add(k);});
 return {ok:issues.length===0,ready:issues.length===0,issues,demands,caseCount:cases.length,supportCount:rows.length,
  independentCaseDemands:true,combinesEnvelopeExtrema:false,analysisEnabled:false,designApproved:false,
  limitation:"این پل فقط واکنش‌های هم‌زمان هر گره/حالت بار را نگاشت می‌کند. پیچش My/Ty حفظ شده ولی غربال فعلی گروه انکربولت آن را طراحی نمی‌کند؛ ظرفیت صفحه‌ستون، انکر، بتن، پی و خاک محاسبه یا تأیید نمی‌شود."};
}

function auditCraneDemandTrace(trace,model){
 const issues=[],nodes=Array.isArray(model?.nodes)?model.nodes:[],bases=nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base");
 if(trace?.success!==true||trace?.simultaneousCasesPreserved!==true)issues.push("بسته ردیابی جرثقیل باید موفق و حافظ حالات هم‌زمان باشد.");
 if(!Array.isArray(trace?.cases)||!trace.cases.length)issues.push("فهرست موقعیت‌های جرثقیل خالی است.");
 if(!bases.length)issues.push("گره پایه‌ای در مدل فیزیکی یافت نشد.");
 const nodeMap=new Map(bases.map(n=>[String(n.id),n]));
 const expected=new Set((trace?.cases||[]).map(c=>String(c.caseIndex)+"|"+String(c.referencePosition_m)));
 if(expected.size!==(trace?.cases||[]).length)issues.push("شناسه موقعیت/حالت جرثقیل تکراری است.");
 const demands=[],seen=new Set(),coverage=new Map(),supportRowsSeen=new Set();
 (trace?.supports||[]).forEach(row=>{
  const nodeId=String(row?.nodeId??"");
  if(supportRowsSeen.has(nodeId))issues.push("ردیف پایه تکراری در بسته ردیابی جرثقیل: "+nodeId);
  supportRowsSeen.add(nodeId);
  const node=nodeMap.get(nodeId);
  if(!node){issues.push("گره واکنش جرثقیل در مدل پایه واقعی وجود ندارد: "+nodeId);return;}
  if(![node.x,node.y,node.z].every(finite)){issues.push("مختصات گره پایه جرثقیل نامعتبر است: "+nodeId);return;}
  const entries=Array.isArray(row.cases)?row.cases:[];
  if(entries.length!==expected.size)issues.push("پوش موقعیت‌های جرثقیل برای پایه "+nodeId+" ناقص است.");
  entries.forEach(c=>{
   const key=String(c?.caseIndex)+"|"+String(c?.referencePosition_m);
   if(!Number.isInteger(c?.caseIndex)||!finite(c?.referencePosition_m))issues.push("شماره حالت یا موقعیت جرثقیل برای پایه "+nodeId+" معتبر نیست.");
   if(!expected.has(key))issues.push("حالت/موقعیت ناشناخته برای پایه "+nodeId+": "+key);
   const unique=nodeId+"|"+key;if(seen.has(unique))issues.push("تقاضای تکراری پایه/موقعیت جرثقیل: "+unique);seen.add(unique);
   const a=c?.columnAction,r=c?.solverReaction,keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!a||!r||![...keys.map(k=>a[k]),...keys.map(k=>r[k])].every(finite)){issues.push("بردار واکنش/کنش ستون شش‌مؤلفه‌ای نامعتبر: "+unique);return;}
   const signTolerance=1e-7*Math.max(1,...keys.map(k=>Math.abs(r[k])));
   if(keys.some(k=>Math.abs(a[k]+r[k])>signTolerance)){issues.push("قرارداد علامت کنش ستون و واکنش حل‌گر در شش مؤلفه برای "+unique+" برقرار نیست؛ انتقال به انکر متوقف شد.");return;}
   const caseId="CRANE-"+(Number(c.caseIndex)+1)+"@"+Number(c.referencePosition_m).toFixed(4)+"m";
   demands.push({nodeId,caseId,caseIndex:c.caseIndex,referencePosition_m:c.referencePosition_m,
    coordinatesM:{x:Number(node.x),y:Number(node.y),z:Number(node.z)},kind:node.kind,
    solverReactionN_Nm:keys.map(k=>r[k]),columnActionN_Nm:keys.map(k=>a[k]),
    units:{force:"N",moment:"N.m"},source:"crane-demand-trace",status:"demand_only_not_designed",
    independentPositionDemand:true,signsPreserved:true,torsionRetained:true});
   coverage.set(nodeId,(coverage.get(nodeId)||0)+1);
  });
 });
 bases.forEach(n=>{if((coverage.get(String(n.id))||0)!==expected.size)issues.push("پوش کامل موقعیت‌های جرثقیل برای گره پایه "+n.id+" برقرار نیست.");});
 if(demands.length!==bases.length*expected.size)issues.push("تعداد تقاضاهای جرثقیل با تعداد پایه‌ها × موقعیت‌ها برابر نیست.");
 return {ok:issues.length===0,ready:issues.length===0,demands:issues.length?[]:demands,
  cases:(trace?.cases||[]).map(c=>({caseIndex:c.caseIndex,referencePosition_m:c.referencePosition_m,label:"CRANE-"+(Number(c.caseIndex)+1)+"@"+Number(c.referencePosition_m).toFixed(4)+"m"})),
  caseCount:expected.size,supportCount:bases.length,independentCaseDemands:true,combinesEnvelopeExtrema:false,
  source:"SteelCrane3DLoadTransfer.demandTraceAudit",analysisEnabled:false,designApproved:false,
  limitation:"این مبدل فقط کنش‌های ستون در پایه را برای هر موقعیت مستقل جرثقیل به قالب تقاضای فونداسیون می‌آورد؛ ترکیب بار نهایی، ظرفیت انکر/صفحه‌ستون، بتن، پی و خاک محاسبه یا تأیید نمی‌شود."};
}
function auditStructuralRun(runResult,model,options){
 const issues=[];
 if(runResult?.success!==true||!Array.isArray(runResult.results)||!runResult.results.length)
  return {ok:false,ready:false,issues:["خروجی موفق SteelStructuralLoadChain.run با آرایه نتایج لازم است."],demands:[],analysisEnabled:false,designApproved:false};
 const labels=new Set(),cases=[],rowsByNode=new Map();
 runResult.results.forEach((item,index)=>{
  const label=String(item?.label||item?.id||"");
  if(!label||labels.has(label)){issues.push("شناسه حالت بار خالی یا تکراری در نتیجه زنجیره: "+label);return;}
  labels.add(label);
  if(item?.equilibrium?.ok!==true){issues.push("تعادل حالت بار تأیید نشده است: "+label);return;}
  if(item?.solverLoadTransferAudit?.success!==true)issues.push("ممیزی مستقل انتقال بار حل‌گر برای حالت "+label+" مفقود یا ناموفق است؛ تحویل تقاضا به فونداسیون مسدود شد.");
  if(item?.externalLoadLedgerComparison?.ok!==true)issues.push("تطبیق دفتر بار مستقل با برآیند اعمال‌شده حل‌گر برای حالت "+label+" مفقود یا ناموفق است.");
  if(item?.foundationReactionMappingAudit?.success!==true)issues.push("نگاشت صریح و موفق همه گره‌های پایه به شناسه و مرجع هندسی پی در حالت "+label+" موجود نیست؛ تحویل به طراحی فونداسیون مسدود شد.");
  if(!Array.isArray(item.reactions)){issues.push("واکنش‌های حالت بار موجود نیست: "+label);return;}
  cases.push({label,equilibrium:item.equilibrium});
  item.reactions.forEach(reaction=>{
   const nodeId=String(reaction?.nodeId??"");
   const v=reaction?.solverReaction;
   if(!nodeId||!v||![v.Fx,v.Fy,v.Fz,v.Mx,v.My,v.Mz].every(finite)){
    issues.push("واکنش شش‌مؤلفه‌ای نامعتبر در حالت "+label);return;
   }
   const coordinates=reaction.coordinatesM||{};
   if(![coordinates.x,coordinates.y,coordinates.z].every(finite)){
    issues.push("مختصات گره واکنش نامعتبر است: "+nodeId);return;
   }
   let row=rowsByNode.get(nodeId);
   if(!row){row={nodeId,x:coordinates.x,y:coordinates.y,z:coordinates.z,kind:reaction.kind,caseReactions:[]};rowsByNode.set(nodeId,row);}
   else if(["x","y","z"].some(k=>Math.abs(row[k]-coordinates[k])>1e-8))issues.push("مختصات گره در حالات بار یکسان نیست: "+nodeId);
   row.caseReactions.push({label,values:[v.Fx,v.Fy,v.Fz,v.Mx,v.My,v.Mz]});
  });
 });
 const rows=[...rowsByNode.values()];
 rows.forEach(row=>{
  row.envelopes=Array.from({length:6},(_,k)=>{
   const values=row.caseReactions.map(c=>c.values[k]);
   return {min:Math.min(...values),max:Math.max(...values)};
  });
  if(row.caseReactions.length!==cases.length)issues.push("واکنش همه حالات بار برای گره "+row.nodeId+" موجود نیست.");
 });
 const envelope={cases,rows};
 const foundationSupportMappings=Array.isArray(model?.foundationSupportMappings)?model.foundationSupportMappings:[];
 const footingMappingStatus=foundationSupportMappings.length?"provided-explicit-mapping":"missing-explicit-support-to-footing-mapping";
 const foundationMappingAudits=runResult.results.map(item=>({caseId:String(item?.label||item?.id||""),audit:item?.foundationReactionMappingAudit||null}));
 const auditFn=root.SteelFoundationReactionAudit?.audit;
 if(typeof auditFn!=="function")issues.push("ممیزی پوش واکنش فونداسیون بارگذاری نشده است.");
 const base=typeof auditFn==="function"?auditFn(envelope,model,options?.footingSpecFor):null;
 if(base&&!base.ok)issues.push(...base.issues);
 const mapped=audit(envelope,model,options);
 if(!mapped.ok)issues.push(...mapped.issues);
 return {ok:issues.length===0,ready:issues.length===0,issues,demands:mapped.demands||[],footingMappingStatus,foundationMappingAudits,foundationSupportMappingsRequiredForFootingDesign:true,caseCount:cases.length,
  supportCount:rows.length,source:"SteelStructuralLoadChain.run",envelope,
  independentCaseDemands:true,combinesEnvelopeExtrema:false,analysisEnabled:false,designApproved:false,
  limitation:"این تبدیل فقط واکنش‌های واقعی هر حالت بار را به قالب ممیزی فونداسیون تبدیل می‌کند؛ ظرفیت صفحه‌ستون، انکر، بتن، پی و خاک طراحی نشده است."};
}
function getDemand(result,nodeId,caseId){
 if(!result?.ok)throw Error("ابتدا ممیزی موفق پل واکنش را اجرا کنید.");
 const matches=result.demands.filter(d=>d.nodeId===String(nodeId)&&d.caseId===String(caseId));
 if(matches.length!==1)throw Error("برای گره و حالت بار انتخابی دقیقاً یک تقاضا لازم است.");
 return matches[0];
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"}],members:[]},values=[1000,2000,3000,4000,5000,6000];
 const env={cases:[{label:"ULS-1",equilibrium:{ok:true}},{label:"ULS-2",equilibrium:{ok:true}}],rows:[{nodeId:"B1",x:0,y:0,z:0,kind:"base",caseReactions:[{label:"ULS-1",values},{label:"ULS-2",values:values.map(v=>2*v)}],envelopes:values.map(v=>({min:v,max:2*v}))}]};
 const old=root.SteelFoundationReactionAudit;
 root.SteelFoundationReactionAudit={audit:e=>({ok:e.rows.length===1&&e.cases.length===2,issues:[]})};
 try{
  ck("maps six components with opposite support-action sign",()=>mapSix(values).columnActionN_Nm.join(",")==="-1000,-2000,-3000,-4000,-5000,-6000");
  ck("keeps torsion as independent sixth component",()=>mapSix(values).columnActionDisplay.Ty_kNm===-5);
  ck("keeps each load case separate",()=>{const r=audit(env,model);return r.ok&&r.demands.length===2&&r.demands[0].caseId!==r.demands[1].caseId;});
  ck("does not combine independent envelope extrema",()=>{const r=audit(env,model);return r.ok&&r.combinesEnvelopeExtrema===false&&r.independentCaseDemands;});
  ck("rejects a missing reaction case",()=>!audit({...env,rows:[{...env.rows[0],caseReactions:[env.rows[0].caseReactions[0]]}]},model).ok);
  ck("rejects duplicate case labels",()=>!audit({...env,cases:[env.cases[0],env.cases[0]]},model).ok);
  ck("rejects malformed six-DOF vectors",()=>!audit({...env,rows:[{...env.rows[0],caseReactions:[{label:"ULS-1",values:[1,2,3]}]}]},model).ok);
  ck("rejects a case not in envelope",()=>!audit({...env,rows:[{...env.rows[0],caseReactions:[{label:"UNKNOWN",values}]}]},model).ok);
  ck("selects exact node and case only",()=>getDemand(audit(env,model),"B1","ULS-2").columnActionN_Nm[5]===-12000);
  ck("blocks selection from failed audit",()=>{try{getDemand({ok:false,demands:[]},"B1","ULS-1");return false;}catch(e){return true;}});
  ck("never enables analysis or design approval",()=>{const r=audit(env,model);return !r.analysisEnabled&&!r.designApproved&&r.demands.every(d=>d.torsionDesignRequired);});
  ck("adapts structural load-chain output without mixing cases",()=>{const run={success:true,results:env.cases.map((c,i)=>({id:c.label,label:c.label,equilibrium:{ok:true},solverLoadTransferAudit:{success:true},externalLoadLedgerComparison:{ok:true},foundationReactionMappingAudit:{success:true,footingDemands:[{footingId:"F1",referencePointM:{x:0,y:0,z:0},actions:{Fx:values[0]*(i+1),Fy:values[1],Fz:values[2],Mx:values[3],My:values[4],Mz:values[5]}}]},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:values[0]*(i+1),Fy:values[1],Fz:values[2],Mx:values[3],My:values[4],Mz:values[5]}}]}))};const r=auditStructuralRun(run,model);return r.ok&&r.demands.length===2&&r.demands[0].caseId!==r.demands[1].caseId;});
  ck("adapts crane support actions per physical base and position",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2},{caseIndex:1,referencePosition_m:4}],supports:[{nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}},{caseIndex:1,referencePosition_m:4,solverReaction:{Fx:2,Fy:3,Fz:4,Mx:5,My:6,Mz:7},columnAction:{Fx:-2,Fy:-3,Fz:-4,Mx:-5,My:-6,Mz:-7}}]}]};const r=auditCraneDemandTrace(trace,model);return r.ok&&r.demands.length===2&&r.demands[1].caseId.includes("@4.0000m")&&r.demands[0].columnActionN_Nm[4]===-5;});
  ck("rejects inconsistent solver-reaction and column-action signs",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2}],supports:[{nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:5,Mz:-6}}]}]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("rejects duplicate physical support rows",()=>{const row={nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]};const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2}],supports:[row,JSON.parse(JSON.stringify(row))]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("rejects incomplete crane position coverage",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2},{caseIndex:1,referencePosition_m:4}],supports:[{nodeId:"B1",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("blocks crane support IDs absent from physical base nodes",()=>{const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:2}],supports:[{nodeId:"GHOST",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}]};return !auditCraneDemandTrace(trace,model).ok;});
  ck("rejects structural run with failed equilibrium",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:false},reactions:[]}]};return !auditStructuralRun(run,model).ok;});
  ck("blocks foundation handoff when solver load-transfer audit is missing",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},externalLoadLedgerComparison:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};return !auditStructuralRun(run,model).ok;});
  ck("blocks foundation handoff when integrated solver load-transfer audit fails",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},solverLoadTransferAudit:{success:false},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};return !auditStructuralRun(run,model).ok;});
  ck("blocks handoff when an explicit support-to-footing mapping audit fails",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},solverLoadTransferAudit:{success:true},externalLoadLedgerComparison:{ok:true},foundationReactionMappingAudit:{success:false},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};return !auditStructuralRun(run,model).ok;});
  ck("blocks handoff when support-to-footing mapping audit is absent",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},solverLoadTransferAudit:{success:true},externalLoadLedgerComparison:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};return !auditStructuralRun(run,model).ok;});
  ck("rejects text coordinates without numeric coercion",()=>!audit({...env,rows:[{...env.rows[0],x:"0"}]},model).ok);
  ck("reports missing support-to-footing mapping without inventing footing IDs",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},kind:"base",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6}}]}]};const r=auditStructuralRun(run,model);return r.footingMappingStatus==="missing-explicit-support-to-footing-mapping"&&r.foundationSupportMappingsRequiredForFootingDesign===true;});
  ck("rejects incomplete structural reaction vector",()=>{const run={success:true,results:[{id:"ULS",label:"ULS",equilibrium:{ok:true},reactions:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},solverReaction:{Fx:1}}]}]};return !auditStructuralRun(run,model).ok;});
 }finally{root.SteelFoundationReactionAudit=old;}
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,designApproved:false};
}
root.SteelFoundationReactionBridge={audit,auditStructuralRun,auditCraneDemandTrace,getDemand,mapSix,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/anchor-steel-group-audit.js ===== */
/* SAHROUD STEEL — per-anchor steel-only capacity comparison. */
(function(root){"use strict";
function compare(demandResults,input){
 const d=input||{},cases=Array.isArray(demandResults)?demandResults:[demandResults];
 if(!cases.length||cases.some(x=>x?.ok!==true||!String(x.nodeId??"").trim()||!String(x.caseId??"").trim()||!Array.isArray(x.anchors)||!x.anchors.length))throw Error("خروجی معتبر گره/ترکیب و تقاضای کامل انکرها لازم است.");
 const required=["Ase_mm2","Fnt_MPa","Fnv_MPa","phiT","phiV"],missing=required.filter(k=>!Number.isFinite(Number(d[k])));
 if(missing.length)throw Error("پارامترهای عددی صریح لازم است: "+missing.join("، "));
 if(!(d.Ase_mm2>0&&d.Fnt_MPa>0&&d.Fnv_MPa>0&&d.phiT>0&&d.phiT<=1&&d.phiV>0&&d.phiV<=1))throw Error("Ase، Fnt، Fnv و ضرایب φ باید مثبت و در محدوده معتبر باشند.");
 const nodes=new Set(cases.map(x=>String(x.nodeId))),caseKeys=new Set(),rows=[];
 if(nodes.size!==1)throw Error("مقایسه هر بار فقط برای یک گره پایه مجاز است.");
 cases.forEach(c=>{
  const caseKey=String(c.nodeId)+"::"+String(c.caseId);
  if(caseKeys.has(caseKey))throw Error("ترکیب بار تکراری است: "+c.caseId);
  caseKeys.add(caseKey);
  const anchorIds=new Set();
  c.anchors.forEach(a=>{
   const id=String(a?.anchorId??"").trim();
   if(!id||anchorIds.has(id))throw Error("شناسه انکر خالی یا تکراری است: "+(id||"نامشخص"));
   anchorIds.add(id);
   const T=Number(a.tensionDemand_N),V=Number(a.resultantShear_N),Vx=Number(a.totalShearX_N),Vz=Number(a.totalShearZ_N);
   if(!Number.isFinite(T)||T<0||![V,Vx,Vz].every(Number.isFinite)||V<0)throw Error("تقاضای هم‌زمان کشش/برش انکر "+id+" در ترکیب "+c.caseId+" ناقص یا نامعتبر است.");
   const recovered=Math.hypot(Vx,Vz),tol=Math.max(1e-6,recovered*1e-8);
   if(Math.abs(V-recovered)>tol)throw Error("برآیند برش انکر "+id+" با مؤلفه‌های X/Z در ترکیب "+c.caseId+" سازگار نیست.");
   const tCap=Number(d.phiT)*Number(d.Fnt_MPa)*Number(d.Ase_mm2)/1000,vCap=Number(d.phiV)*Number(d.Fnv_MPa)*Number(d.Ase_mm2)/1000;
   const tr=T/1000/tCap,vr=V/1000/vCap;
   rows.push({nodeId:String(c.nodeId),caseId:String(c.caseId),anchorId:id,tensionDemand_kN:T/1000,shearDemand_kN:V/1000,shearX_kN:Vx/1000,shearZ_kN:Vz/1000,tensionDesignCapacity_kN:tCap,shearDesignCapacity_kN:vCap,tensionRatio:tr,shearRatio:vr,tensionPass:T/1000<=tCap,shearPass:V/1000<=vCap,pairedWithinSameCase:true,interactionStatus:"not_evaluated"});
  });
 });
 return{ok:true,rows,caseCount:cases.length,anchorDemandCount:rows.length,allSeparateChecksPass:rows.every(r=>r.tensionPass&&r.shearPass),interactionEvaluated:false,governingTensionRatio:Math.max(...rows.map(r=>r.tensionRatio)),governingShearRatio:Math.max(...rows.map(r=>r.shearRatio)),method:"independent per-anchor tension and vector shear checks; same-case pairing retained, interaction deferred",limitations:["نسبت‌های مستقل کشش و برش محاسبه می‌شوند؛ اندرکنش تا تعیین بند معتبر آیین‌نامه‌ای اجرا نشده است.","ظرفیت‌های فولادی ورودی باید برای نوع واقعی انکر، رزوه، مصالح و آیین‌نامه حاکم توسط مهندس تأیید شوند؛ این ماژول آن‌ها را خودکار استخراج نمی‌کند.","شکست بتن، pullout، pry-out، side-face blowout، اثر گروه، فاصله لبه، خمش بولت، رزوه در صفحه برش، خمش صفحه‌ستون، prying، جوش و فونداسیون در این ماژول طراحی نشده‌اند؛ تأیید نهایی صادر نمی‌شود."],analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const input={Ase_mm2:100,Fnt_MPa:400,Fnv_MPa:240,phiT:.75,phiV:.75},demand={ok:true,nodeId:"B1",caseId:"ULS-1",anchors:[{anchorId:"A1",tensionDemand_N:10000,resultantShear_N:5000,totalShearX_N:3000,totalShearZ_N:4000},{anchorId:"A2",tensionDemand_N:20000,resultantShear_N:10000,totalShearX_N:6000,totalShearZ_N:8000}]};
 t("calculates tension design capacity",()=>compare(demand,input).rows[0].tensionDesignCapacity_kN===30);
 t("calculates shear design capacity",()=>compare(demand,input).rows[0].shearDesignCapacity_kN===18);
 t("preserves per-anchor demand and case identity",()=>{const r=compare(demand,input);return r.rows[1].anchorId==="A2"&&r.rows[1].caseId==="ULS-1"&&r.rows[1].tensionDemand_kN===20;});
 t("preserves separate cases without envelope mixing",()=>{const r=compare([demand,{...demand,caseId:"ULS-2",anchors:[{...demand.anchors[0],tensionDemand_N:30000}]}],input);return r.caseCount===2&&r.rows[2].caseId==="ULS-2"&&r.rows[2].tensionDemand_kN===30;});
 t("reports separate tension and shear ratios",()=>{const r=compare(demand,input);return Math.abs(r.rows[0].tensionRatio-1/3)<1e-12&&Math.abs(r.rows[0].shearRatio-5/18)<1e-12;});
 t("rejects missing code parameters",()=>{try{compare(demand,{...input,Fnt_MPa:null});return false;}catch(e){return true;}});
 t("rejects invalid anchor demand",()=>{try{compare({...demand,anchors:[{anchorId:"A1",tensionDemand_N:NaN,resultantShear_N:1}]},input);return false;}catch(e){return true;}});
  t("keeps interaction explicitly unevaluated pending verified governing clause",()=>{const r=compare(demand,input);return r.interactionEvaluated===false&&r.rows.every(x=>x.interactionStatus==="not_evaluated");});
  t("never enables design approval",()=>{const r=compare(demand,input);return r.analysisEnabled===false&&r.designApproved===false&&r.interactionEvaluated===false;});
 t("retains same-case vector shear and reports interaction result",()=>{const r=compare(demand,input);return r.rows[0].pairedWithinSameCase===true&&r.rows[0].interactionStatus==="not_evaluated"&&r.interactionEvaluated===false&&r.rows[0].shearX_kN===3&&r.rows[0].shearZ_kN===4;});
 t("does not infer interaction from an unverified threshold",()=>{const r=compare({...demand,anchors:[{anchorId:"A1",tensionDemand_N:3000,resultantShear_N:18000,totalShearX_N:18000,totalShearZ_N:0}]},input);return r.interactionEvaluated===false&&r.rows[0].interactionStatus==="not_evaluated";});
 t("rejects duplicate anchor IDs within a case",()=>{try{compare({...demand,anchors:[demand.anchors[0],{...demand.anchors[0]}]},input);return false;}catch(e){return true;}});
 t("rejects duplicate node/case records",()=>{try{compare([demand,{...demand}],input);return false;}catch(e){return true;}});
 t("rejects inconsistent shear resultant and vector components",()=>{try{compare({...demand,anchors:[{...demand.anchors[0],resultantShear_N:9000}]},input);return false;}catch(e){return true;}});
 t("rejects missing node or case identity",()=>{try{compare({...demand,caseId:""},input);return false;}catch(e){return true;}});
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
function compareFoundationCases(nodeId,foundationResult,geometryGroups,input){
 const builder=root.SteelConcreteAnchorCapacity;
 if(typeof builder?.buildCaseDemandBatch!=="function")throw Error("مسیر دسته‌جمعی تقاضای انکر برای ترکیبات بار بارگذاری نشده است.");
 const built=builder.buildCaseDemandBatch(nodeId,foundationResult,geometryGroups);
 const result=compare(built.results,input);
 return{...result,geometryAudit:built.geometryAudit,source:built.source,caseLabels:built.caseLabels,combinesEnvelopeExtrema:false};
}
root.SteelAnchorSteelGroupAudit={compare,compareFoundationCases,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/anchor-case-demand-bridge.js ===== */
/* SAHROUD STEEL — per-load-case foundation reaction to individual anchor demand.
 * Demand distribution only. Rectangular/principal-axis anchor layouts are required.
 * No steel/concrete/plate resistance, prying, contact, or code approval is produced.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const tol=(v)=>Math.max(1e-7,Math.abs(v)*1e-9);
function distributeCase(demand,anchors){
 const issues=[],vec=demand?.columnActionN_Nm,items=Array.isArray(anchors)?anchors:[];
 if(!Array.isArray(vec)||vec.length!==6||!vec.every(finite))issues.push("بردار کنش ستون باید شش مؤلفه عددی محدود داشته باشد.");
 if(items.length<2)issues.push("برای توزیع گروهی، حداقل دو انکربولت با مختصات واقعی لازم است.");
 const ids=new Set();
 items.forEach((a,i)=>{const id=String(a?.id??"").trim();if(!id||ids.has(id))issues.push("شناسه انکر خالی یا تکراری است: "+(id||i+1));ids.add(id);if(!finite(a?.x_m)||!finite(a?.z_m))issues.push("مختصات X/Z انکر "+(id||i+1)+" باید عددی و محدود باشد.");});
 if(issues.length)return{ok:false,issues,anchors:[],analysisEnabled:false,designApproved:false};
 const [Vx,N,Vz,Mx,Ty,Mz]=vec;
 const cx=items.reduce((s,a)=>s+a.x_m,0)/items.length,cz=items.reduce((s,a)=>s+a.z_m,0)/items.length;
 const rel=items.map(a=>({id:String(a.id),x:a.x_m-cx,z:a.z_m-cz}));
 const sx2=rel.reduce((s,a)=>s+a.x*a.x,0),sz2=rel.reduce((s,a)=>s+a.z*a.z,0),sxz=rel.reduce((s,a)=>s+a.x*a.z,0);
 // This implementation uses the uncoupled principal axes of a rectangular/orthogonal bolt group.
 const geomScale=Math.max(1,sx2,sz2);
 if(Math.abs(sxz)>geomScale*1e-8)issues.push("محورهای مختصات گروه انکر با محورهای اصلی گروه هم‌راستا نیستند؛ توزیع کوپل‌شده لنگرها در این نسخه پشتیبانی نمی‌شود.");
 if(Math.abs(Mx)>tol(Mx)&&!(sz2>1e-14))issues.push("برای لنگر Mx بازوی مؤثر در راستای Z وجود ندارد.");
 if(Math.abs(Mz)>tol(Mz)&&!(sx2>1e-14))issues.push("برای لنگر Mz بازوی مؤثر در راستای X وجود ندارد.");
 if(issues.length)return{ok:false,issues,anchors:[],analysisEnabled:false,designApproved:false};
 const n=items.length,axial=rel.map(a=>N/n+(sz2>1e-14?Mx*a.z/sz2:0)+(sx2>1e-14?Mz*a.x/sx2:0));
 let torsion=[];
 if(Math.abs(Ty)>tol(Ty)){
  const torsionApi=root.SteelAnchorGroupTorsionDemand;
  if(typeof torsionApi?.distribute!=="function")issues.push("ماژول توزیع پیچش گروه انکر بارگذاری نشده است.");
  else {const tr=torsionApi.distribute(Ty,items);if(!tr.ok)issues.push(...tr.issues);else torsion=tr.demands;}
 }else torsion=items.map(a=>({anchorId:String(a.id),Fx_N:0,Fz_N:0,sourceMomentMy_Nm:0}));
 if(issues.length)return{ok:false,issues,anchors:[],analysisEnabled:false,designApproved:false};
 const torsionById=new Map(torsion.map(t=>[String(t.anchorId),t]));
 const rows=rel.map((a,i)=>{const t=torsionById.get(a.id);const sx=Vx/n+t.Fx_N,sz=Vz/n+t.Fz_N;return{anchorId:a.id,x_m:items[i].x_m,z_m:items[i].z_m,relativeX_m:a.x,relativeZ_m:a.z,signedAxialTension_N:axial[i],tensionDemand_N:Math.max(0,axial[i]),compressionDemand_N:Math.max(0,-axial[i]),directShearX_N:Vx/n,directShearZ_N:Vz/n,torsionalShearX_N:t.Fx_N,torsionalShearZ_N:t.Fz_N,totalShearX_N:sx,totalShearZ_N:sz,resultantShear_N:Math.hypot(sx,sz)};});
 const sumN=rows.reduce((s,a)=>s+a.signedAxialTension_N,0),recMx=rows.reduce((s,a)=>s+a.relativeZ_m*a.signedAxialTension_N,0),recMz=rows.reduce((s,a)=>s+a.relativeX_m*a.signedAxialTension_N,0);
 const sumVx=rows.reduce((s,a)=>s+a.totalShearX_N,0),sumVz=rows.reduce((s,a)=>s+a.totalShearZ_N,0);
 const torsionMoment=rows.reduce((s,a)=>s+a.relativeZ_m*a.torsionalShearX_N-a.relativeX_m*a.torsionalShearZ_N,0);
 const equilibrium={axialResidual_N:sumN-N,momentXResidual_Nm:recMx-Mx,momentZResidual_Nm:recMz-Mz,shearXResidual_N:sumVx-Vx,shearZResidual_N:sumVz-Vz,torsionResidual_Nm:torsionMoment-Ty,
  ok:Math.abs(sumN-N)<=tol(N)&&Math.abs(recMx-Mx)<=tol(Mx)&&Math.abs(recMz-Mz)<=tol(Mz)&&Math.abs(sumVx-Vx)<=tol(Vx)&&Math.abs(sumVz-Vz)<=tol(Vz)&&Math.abs(torsionMoment-Ty)<=tol(Ty)};
 if(!equilibrium.ok)issues.push("تعادل نیرو/لنگر در توزیع تقاضای گروه انکر برقرار نیست.");
 return{ok:issues.length===0,ready:issues.length===0,nodeId:String(demand.nodeId??""),caseId:String(demand.caseId??""),anchors:issues.length?[]:rows,groupGeometry:{count:n,centroid_m:{x:cx,z:cz},sumX2_m2:sx2,sumZ2_m2:sz2,sumXZ_m2:sxz},sourceActionN_Nm:vec.slice(),equilibrium,method:"equal direct shear + elastic torsional shear + uncoupled elastic axial distribution about principal group axes",limitations:["توزیع کشش/فشار با فرض صفحه صلب و محورهای اصلی هم‌راستا انجام شده است؛ انعطاف صفحه‌ستون، تماس فشاری زیر صفحه، بلندشدگی، اهرم‌وارگی و خمش موضعی صفحه لحاظ نشده‌اند.","برش مستقیم به‌طور مساوی بین انکرها تقسیم شده است؛ اصطکاک، تماس، برش‌گیر، لغزش، bearing سوراخ و انعطاف صفحه مدل نشده‌اند.","ظرفیت فولاد انکر، شکست بتن، pullout، pry-out، side-face blowout، اثر گروه، فاصله لبه، اندرکنش آیین‌نامه‌ای و طراحی پی محاسبه نشده‌اند.","برای آرایش‌های غیرمستطیلی/محورهای کوپل‌شده، این نسخه عمداً متوقف می‌شود."] ,units:{force:"N",moment:"N.m",coordinates:"m"},analysisEnabled:false,designApproved:false};
}
function fromFoundationBridgeResult(bridgeResult,anchorsByNode){
 const issues=[],demands=Array.isArray(bridgeResult?.demands)?bridgeResult.demands:[],groups=anchorsByNode&&typeof anchorsByNode==="object"?anchorsByNode:{};
 if(bridgeResult?.ok!==true)issues.push("پل واکنش فونداسیون باید با موفقیت ممیزی شده باشد.");
 if(!demands.length)issues.push("هیچ تقاضای مستقل گره/حالت بار در پل واکنش وجود ندارد.");
 if(issues.length)return{ok:false,issues,results:[],analysisEnabled:false,designApproved:false};
 const results=demands.map(d=>{const id=String(d?.nodeId??"");if(!id||!Array.isArray(groups[id])){issues.push("گروه انکر واقعی برای گره "+(id||"نامشخص")+" تعریف نشده است.");return null;}const r=distributeCase(d,groups[id]);if(!r.ok)issues.push("گره "+id+" / حالت "+String(d.caseId??"")+": "+r.issues.join("؛ "));return r;});
 const valid=results.filter(Boolean);
 if(valid.length!==demands.length)issues.push("پوشش گروه انکر با تعداد تقاضاهای پل واکنش برابر نیست.");
 return{ok:issues.length===0,ready:issues.length===0,issues,results:issues.length?[]:valid,caseCount:new Set(demands.map(d=>String(d.caseId))).size,supportCount:new Set(demands.map(d=>String(d.nodeId))).size,independentNodeCaseDemands:true,combinesEnvelopeExtrema:false,analysisEnabled:false,designApproved:false,scope:"تبدیل واکنش‌های شش‌مؤلفه‌ای به تقاضای محوری و برشی هر انکر؛ بدون ظرفیت‌سنجی و تأیید طراحی."};
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const square=[{id:"A",x_m:-.1,z_m:-.1},{id:"B",x_m:.1,z_m:-.1},{id:"C",x_m:.1,z_m:.1},{id:"D",x_m:-.1,z_m:.1}];
 const demand={nodeId:"B1",caseId:"ULS-1",columnActionN_Nm:[1000,4000,-2000,600,800,1000]};
 ck("distributes axial tension equally when bending is zero",()=>{const r=distributeCase({...demand,columnActionN_Nm:[0,4000,0,0,0,0]},square);return r.ok&&r.anchors.every(a=>a.signedAxialTension_N===1000);});
 ck("distributes biaxial bending to anchor coordinates",()=>{const r=distributeCase({...demand,columnActionN_Nm:[0,0,0,400,0,800]},square);return r.ok&&Math.abs(r.equilibrium.momentXResidual_Nm)<1e-8&&Math.abs(r.equilibrium.momentZResidual_Nm)<1e-8;});
 ck("retains compression separately from tensile demand",()=>{const r=distributeCase({...demand,columnActionN_Nm:[0,-4000,0,0,0,0]},square);return r.ok&&r.anchors.every(a=>a.compressionDemand_N===1000&&a.tensionDemand_N===0);});
 ck("distributes direct biaxial shear equally",()=>{const r=distributeCase({...demand,columnActionN_Nm:[4000,0,-8000,0,0,0]},square);return r.ok&&r.anchors.every(a=>a.directShearX_N===1000&&a.directShearZ_N===-2000);});
 ck("combines direct shear and torsional shear vectorially",()=>{const r=distributeCase(demand,square);return r.ok&&r.anchors.some(a=>Math.abs(a.torsionalShearX_N)+Math.abs(a.torsionalShearZ_N)>0)&&r.equilibrium.ok;});
 ck("preserves exact support and load-case identity",()=>{const r=distributeCase(demand,square);return r.ok&&r.nodeId==="B1"&&r.caseId==="ULS-1";});
 ck("rejects missing six-component reaction",()=>!distributeCase({...demand,columnActionN_Nm:[1,2,3]},square).ok);
 ck("rejects missing anchor geometry",()=>!distributeCase(demand,[{id:"A",x_m:0,z_m:0}]).ok);
 ck("rejects duplicate anchor identity",()=>!distributeCase(demand,[square[0],{...square[1],id:"A"}]).ok);
 ck("rejects non-finite anchor coordinates",()=>!distributeCase(demand,[square[0],{...square[1],x_m:NaN}]).ok);
 ck("rejects unsupported coupled principal axes",()=>!distributeCase({...demand,columnActionN_Nm:[0,0,0,100,0,100]},[{id:"A",x_m:0,z_m:0},{id:"B",x_m:2,z_m:1},{id:"C",x_m:3,z_m:3},{id:"D",x_m:1,z_m:2}]).ok);
 ck("rejects a bending moment without its geometric lever arm",()=>!distributeCase({...demand,columnActionN_Nm:[0,0,0,100,0,0]},[{id:"A",x_m:-1,z_m:0},{id:"B",x_m:1,z_m:0}]).ok);
 ck("rejects missing torsion dependency when torsion is present",()=>{const old=root.SteelAnchorGroupTorsionDemand;root.SteelAnchorGroupTorsionDemand=null;try{return !distributeCase(demand,square).ok;}finally{root.SteelAnchorGroupTorsionDemand=old;}});
 const bridge={ok:true,demands:[demand,{...demand,caseId:"SLS-1",columnActionN_Nm:[0,2000,0,0,0,0]}]};
 ck("maps every independent node/case demand",()=>{const r=fromFoundationBridgeResult(bridge,{B1:square});return r.ok&&r.results.length===2&&r.caseCount===2;});
 ck("keeps load cases separate without envelope mixing",()=>{const r=fromFoundationBridgeResult(bridge,{B1:square});return r.ok&&r.results[0].caseId!==r.results[1].caseId&&r.combinesEnvelopeExtrema===false;});
 ck("rejects incomplete anchor groups without partial output",()=>{const r=fromFoundationBridgeResult(bridge,{});return !r.ok&&r.results.length===0;});
 ck("never marks analysis or design approved",()=>{const r=fromFoundationBridgeResult(bridge,{B1:square});return r.ok&&!r.analysisEnabled&&!r.designApproved&&r.results.every(x=>!x.analysisEnabled&&!x.designApproved);});
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,designApproved:false};
}
root.SteelAnchorCaseDemandBridge={distributeCase,fromFoundationBridgeResult,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/anchor-case-demand-ui.js ===== */
/* SAHROUD STEEL — UI bridge for selected foundation reaction to anchor-group demands.
 * Requires explicit confirmation of sign convention and as-built anchor geometry.
 */
(function(root){"use strict";
const $=id=>root.document?.getElementById(id);
let craneAnchorGroups={},refreshCraneChoicesApi=()=>false;
function buildAnchors(layout){
 const rows=Number(layout?.rows),cols=Number(layout?.cols),px=Number(layout?.pitchX),pz=Number(layout?.pitchZ);
 if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows*cols>64)throw Error("تعداد ردیف/ستون انکر باید عدد صحیح بین ۱ تا ۶۴ باشد.");
 if((cols>1&&!(px>0))||(rows>1&&!(pz>0))||!Number.isFinite(px)||!Number.isFinite(pz))throw Error("گام واقعی انکرها در محورهای فعال باید مثبت و عددی باشد.");
 const out=[];for(let r=0;r<rows;r++)for(let col=0;col<cols;col++)out.push({id:"AB-"+String(out.length+1).padStart(2,"0"),x_m:(col-(cols-1)/2)*px/1000,z_m:(r-(rows-1)/2)*pz/1000});
 return out;
}
function auditBasePlateGeometry(layout,anchors){
 const required=["plateWidthMm","plateLengthMm","columnWidthMm","columnDepthMm","footingWidthMm","footingDepthMm","anchorEdgeDistanceMm"];
 const values={};required.forEach(k=>values[k]=Number(layout?.[k]));
 const issues=[];
 required.forEach(k=>{if(!Number.isFinite(values[k])||values[k]<=0)issues.push("ورودی هندسی معتبر برای "+k+" لازم است.");});
 if(issues.length)return {ok:false,issues,checks:[],assumption:"هم‌مرکزی صفحه‌ستون، مقطع ستون، گروه انکر و پی در محورهای X/Z فرض شده و باید با نقشه واقعی تأیید شود."};
 const halfPlateX=values.plateWidthMm/2,halfPlateZ=values.plateLengthMm/2;
 const halfColX=values.columnWidthMm/2,halfColZ=values.columnDepthMm/2;
 const halfFootX=values.footingWidthMm/2,halfFootZ=values.footingDepthMm/2;
 const maxAnchorX=Math.max(...anchors.map(a=>Math.abs(a.x_m*1000)));
 const maxAnchorZ=Math.max(...anchors.map(a=>Math.abs(a.z_m*1000)));
 const checks=[
  {name:"قرارگیری ستون داخل صفحه‌ستون",ok:halfColX<=halfPlateX&&halfColZ<=halfPlateZ},
  {name:"قرارگیری تمام انکرها با فاصله ورودی تا لبه صفحه‌ستون",ok:maxAnchorX+values.anchorEdgeDistanceMm<=halfPlateX&&maxAnchorZ+values.anchorEdgeDistanceMm<=halfPlateZ},
  {name:"قرارگیری صفحه‌ستون داخل محدوده پی",ok:halfPlateX<=halfFootX&&halfPlateZ<=halfFootZ}
 ];
 checks.filter(x=>!x.ok).forEach(x=>issues.push("کنترل هندسی ناموفق: "+x.name));
 return {ok:issues.length===0,issues,checks,dimensionsMm:values,anchorExtentsMm:{x:maxAnchorX,z:maxAnchorZ},assumption:"محورها هم‌راستا و اجزای صفحه‌ستون، ستون، گروه انکر و پی هم‌مرکز فرض شده‌اند. فاصله لبه ورودی کاربر است و به‌عنوان حد آیین‌نامه‌ای تفسیر نمی‌شود؛ این کنترل صرفاً تطبیق هندسی دوبعدی است، نه کنترل ظرفیت یا شکست بتن."};
}
function calculateSelected(selection,layout){
 if(!selection?.row||!selection?.case||!selection?.mapped)throw Error("ابتدا یک گره پایه و حالت بار معتبر انتخاب کنید.");
 if(layout?.signConfirmed!==true)throw Error("ابتدا قرارداد علامت نیروها را پس از کنترل با مدل تأیید کنید.");
 if(layout?.geometryConfirmed!==true)throw Error("تطبیق هندسه و آرایش انکرها با نقشه اجرایی/وضعیت واقعی پایه باید صریحاً تأیید شود.");
 const anchors=buildAnchors(layout),geometryAudit=auditBasePlateGeometry(layout,anchors);
 if(!geometryAudit.ok)throw Error(geometryAudit.issues.join("؛ "));
 const m=selection.mapped;
 const action=[m.Vx_kN*1000,m.N_tensionPositive_kN*1000,m.Vz_kN*1000,m.Mx_kNm*1000,m.Ty_kNm*1000,m.Mz_kNm*1000];
 if(!action.every(Number.isFinite))throw Error("کنش شش‌مؤلفه‌ای انتخاب‌شده کامل و معتبر نیست.");
 const api=root.SteelAnchorCaseDemandBridge;
 if(typeof api?.distributeCase!=="function")throw Error("ماژول توزیع تقاضای انکر بارگذاری نشده است.");
 const result=api.distributeCase({nodeId:String(selection.row.nodeId),caseId:String(selection.case.label),columnActionN_Nm:action},anchors);
 if(result&&typeof result==="object")result.basePlateGeometryAudit=geometryAudit;
 return result;
}
function mount(){
 const panel=$("baseReactionTransferPanel");if(!panel||$("brtAnchorDemandRun"))return;
 const box=root.document.createElement("section");box.className="panel";box.id="brtAnchorDemandPanel";box.setAttribute("data-focus-group","foundation");
 box.innerHTML=`<div class="panel-title"><h3>توزیع واکنش انتخابی بین تک‌تک انکرها</h3><span class="status">تقاضا؛ بدون تأیید ظرفیت</span></div><div class="notice">پس از استخراج واکنش‌ها، یک گره پایه و یک حالت بار را انتخاب کنید. آرایش و گام بولت‌ها از پنل گروه بولت خوانده می‌شود؛ پیش از محاسبه باید هم قرارداد علامت و هم تطبیق هندسه با نقشه اجرایی را تأیید کرده باشید. هر حالت بار جداگانه محاسبه می‌شود.</div><div class="button-grid"><button id="brtAnchorDemandRun" class="btn primary" type="button">محاسبه تقاضای انکرهای این حالت</button><button id="brtAnchorDemandJson" class="btn secondary" type="button" disabled>گزارش JSON تقاضای انکر</button></div><div id="brtAnchorDemandSummary" class="notice">هنوز تقاضای انکر برای حالت انتخابی محاسبه نشده است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>انکر</th><th>X (m)</th><th>Z (m)</th><th>کشش (kN)</th><th>فشار محوری (kN)</th><th>برش X (kN)</th><th>برش Z (kN)</th><th>برش برآیند (kN)</th></tr></thead><tbody id="brtAnchorDemandRows"></tbody></table></div>
<div class="notice" style="margin-top:16px"><strong>تقاضای جرثقیل سقفی در پای ستون و گروه انکر</strong><br>پس از اجرای جاروب کامل و موفق موقعیت‌های جرثقیل، گره پایه و موقعیت قطار را انتخاب کنید. هندسه گروه انکر واردشده در همین پنل فقط برای پایه انتخابی استفاده می‌شود؛ برای پایه‌های دیگر باید هندسه جداگانه تعریف و تأیید شود. این مسیر هر موقعیت را مستقل نگه می‌دارد و با ترکیبات بار عادی جمع نمی‌کند. در این نسخه فقط آرایش مستطیلی با محورهای هم‌راستا با X/Z مدل پشتیبانی می‌شود؛ گروه چرخیده، محورهای کوپل‌شده یا هندسه نامنطبق باید متوقف و جداگانه بررسی شوند.</div><div class="form-grid"><div class="field"><label for="brtCraneNode">گره پایه جرثقیل</label><select id="brtCraneNode"><option value="">ابتدا جاروب جرثقیل را اجرا کنید</option></select></div><div class="field"><label for="brtCraneCase">موقعیت جرثقیل</label><select id="brtCraneCase"><option value="">ابتدا جاروب جرثقیل را اجرا کنید</option></select></div></div><h4>هندسه مستقل گروه انکر برای پایه انتخابی</h4><div class="form-grid"><div class="field"><label for="brtCraneRows">تعداد ردیف Z</label><input id="brtCraneRows" type="number" min="1" max="8" step="1"></div><div class="field"><label for="brtCraneCols">تعداد ستون X</label><input id="brtCraneCols" type="number" min="1" max="8" step="1"></div><div class="field"><label for="brtCranePitchX">فاصله محور X (mm)</label><input id="brtCranePitchX" type="number" min="0" step="1"></div><div class="field"><label for="brtCranePitchZ">فاصله محور Z (mm)</label><input id="brtCranePitchZ" type="number" min="0" step="1"></div><div class="field"><label for="brtCranePlateW">عرض صفحه‌ستون X (mm)</label><input id="brtCranePlateW" type="number" min="1" step="1"></div><div class="field"><label for="brtCranePlateL">طول صفحه‌ستون Z (mm)</label><input id="brtCranePlateL" type="number" min="1" step="1"></div><div class="field"><label for="brtCraneColumnW">عرض مقطع ستون X (mm)</label><input id="brtCraneColumnW" type="number" min="1" step="1"></div><div class="field"><label for="brtCraneColumnD">عمق مقطع ستون Z (mm)</label><input id="brtCraneColumnD" type="number" min="1" step="1"></div><div class="field"><label for="brtCraneFootW">عرض پی X (mm)</label><input id="brtCraneFootW" type="number" min="1" step="1"></div><div class="field"><label for="brtCraneFootD">عمق پی Z (mm)</label><input id="brtCraneFootD" type="number" min="1" step="1"></div><div class="field"><label for="brtCraneEdge">فاصله موردنیاز مرکز انکر تا لبه صفحه (mm؛ طبق نقشه)</label><input id="brtCraneEdge" type="number" min="0" step="1"></div></div><label class="check-row"><input id="brtCraneSign" type="checkbox"> قرارداد علامت و جهت محورهای این پایه کنترل شده است.</label><label class="check-row"><input id="brtCraneGeometry" type="checkbox"> آرایش و مختصات این گروه با نقشه اجرایی همین پایه تطبیق داده شده است.</label><div class="button-grid"><button id="brtCraneSaveGeometry" class="btn secondary" type="button">ثبت هندسه همین پایه در پرونده پروژه</button></div><div id="brtCraneGeometryStatus" class="notice">برای هر گره پایه باید آرایش مستقل و تأییدشده ثبت شود.</div><div class="button-grid"><button id="brtCraneRefresh" class="btn secondary" type="button">بارگذاری موقعیت‌های جاروب‌شده جرثقیل</button><button id="brtCraneAnchorRun" class="btn primary" type="button">محاسبه تقاضای انکر در موقعیت جرثقیل</button><button id="brtCraneAnchorJson" class="btn secondary" type="button" disabled>گزارش JSON تقاضای جرثقیل/انکر</button></div><div id="brtCraneAnchorSummary" class="notice">هنوز تقاضای جرثقیل به گروه انکر منتقل نشده است.</div>
<div class="notice" style="margin-top:12px">غربال مستقل مقاومت فولادی انکرها: پارامترهای Fnt، Fnv، Ase و φ را فقط از آیین‌نامه و مشخصات واقعی انکر وارد کنید. کشش و برش جداگانه سنجیده می‌شوند؛ اندرکنش و شکست بتن در این بخش کنترل نمی‌شود.</div>
<div class="form-grid"><div class="field"><label>سطح مؤثر کششی Ase (mm²)</label><input id="brtAsAse" type="number" min="0" step="0.1"></div><div class="field"><label>تنش اسمی کششی Fnt (MPa)</label><input id="brtAsFnt" type="number" min="0" step="1"></div><div class="field"><label>تنش اسمی برشی Fnv (MPa)</label><input id="brtAsFnv" type="number" min="0" step="1"></div><div class="field"><label>ضریب مقاومت کشش φt</label><input id="brtAsPhiT" type="number" min="0" max="1" step="0.01"></div><div class="field"><label>ضریب مقاومت برش φv</label><input id="brtAsPhiV" type="number" min="0" max="1" step="0.01"></div></div>
<div class="button-grid"><button id="brtAnchorSteelRun" class="btn secondary" type="button">مقایسه مقاومت فولادی تک‌تک انکرها</button></div><div id="brtAnchorSteelSummary" class="notice">پس از محاسبه تقاضای انکر، پارامترهای مستند را وارد کنید.</div>
<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:680px"><thead><tr><th>انکر / حالت</th><th>نسبت کشش</th><th>نسبت برش</th><th>ظرفیت کشش (kN)</th><th>ظرفیت برش (kN)</th><th>وضعیت غربال جداگانه</th></tr></thead><tbody id="brtAnchorSteelRows"></tbody></table></div>`;
 panel.insertAdjacentElement("afterend",box);
 let last=null,lastCrane=null;
 const craneNode=$("brtCraneNode"),craneCase=$("brtCraneCase"),craneSummary=$("brtCraneAnchorSummary"),craneRun=$("brtCraneAnchorRun"),craneJson=$("brtCraneAnchorJson");
 const craneRows=$("brtCraneRows"),craneCols=$("brtCraneCols"),cranePitchX=$("brtCranePitchX"),cranePitchZ=$("brtCranePitchZ"),craneSign=$("brtCraneSign"),craneGeometry=$("brtCraneGeometry"),craneGeometryStatus=$("brtCraneGeometryStatus");
 function loadCraneLayout(){const d=craneAnchorGroups[craneNode.value]||{};craneRows.value=d.rows??"";craneCols.value=d.cols??"";cranePitchX.value=d.pitchX??"";cranePitchZ.value=d.pitchZ??"";["plateWidthMm","plateLengthMm","columnWidthMm","columnDepthMm","footingWidthMm","footingDepthMm","anchorEdgeDistanceMm"].forEach((k,i)=>{const el=$(["brtCranePlateW","brtCranePlateL","brtCraneColumnW","brtCraneColumnD","brtCraneFootW","brtCraneFootD","brtCraneEdge"][i]);if(el)el.value=d[k]??"";});craneSign.checked=d.signConfirmed===true;craneGeometry.checked=d.geometryConfirmed===true;craneGeometryStatus.textContent=d.rows?"هندسه مستقل این پایه ثبت شده است؛ پیش از استفاده، نقشه و محورهای واقعی را دوباره کنترل کنید.":"برای این پایه هنوز هندسه مستقل ثبت نشده است.";
 }
 function saveCraneLayout(){const id=craneNode.value;if(!id)throw Error("ابتدا گره پایه را انتخاب کنید.");const d={rows:Number(craneRows.value),cols:Number(craneCols.value),pitchX:Number(cranePitchX.value),pitchZ:Number(cranePitchZ.value),plateWidthMm:Number($("brtCranePlateW").value),plateLengthMm:Number($("brtCranePlateL").value),columnWidthMm:Number($("brtCraneColumnW").value),columnDepthMm:Number($("brtCraneColumnD").value),footingWidthMm:Number($("brtCraneFootW").value),footingDepthMm:Number($("brtCraneFootD").value),anchorEdgeDistanceMm:Number($("brtCraneEdge").value),signConfirmed:craneSign.checked,geometryConfirmed:craneGeometry.checked};if(!Number.isInteger(d.rows)||!Number.isInteger(d.cols)||d.rows<1||d.cols<1||d.rows>8||d.cols>8||d.rows*d.cols<2)throw Error("آرایش باید حداقل دو انکر و حداکثر ۸×۸ انکر داشته باشد.");if(!Number.isFinite(d.pitchX)||!Number.isFinite(d.pitchZ)||(d.cols>1&&d.pitchX<=0)||(d.rows>1&&d.pitchZ<=0))throw Error("فاصله محورهای فعال باید مثبت و عددی باشد.");if(!d.signConfirmed||!d.geometryConfirmed)throw Error("تأیید قرارداد علامت و تطبیق هندسه اجرایی همین پایه الزامی است.");const geometry=auditBasePlateGeometry(d,buildAnchors(d));if(!geometry.ok)throw Error(geometry.issues.join("؛ "));craneAnchorGroups[id]=d;craneNode.dispatchEvent(new Event("change",{bubbles:true}));const project=root.SteelProject;if(typeof project?.saveSnapshot!=="function")throw Error("ذخیره‌ساز پروژه در دسترس نیست؛ هندسه فقط در حافظه جاری ثبت شد. از ذخیره پروژه استفاده کنید.");if(project.saveSnapshot()!==true)throw Error("ذخیره خودکار پروژه ناموفق بود؛ از دکمه ذخیره پروژه فایل JSON بگیرید.");craneGeometryStatus.textContent="هندسه مستقل گره "+id+" در پرونده همین مرورگر ذخیره شد. برای انتقال به دستگاه دیگر، فایل پروژه را نیز ذخیره کنید.";return d;}
 $("brtCraneSaveGeometry").addEventListener("click",()=>{try{saveCraneLayout();}catch(e){craneGeometryStatus.textContent="ثبت هندسه انجام نشد: "+String(e.message||e);}});
 craneNode.addEventListener("change",loadCraneLayout);
 $("brtCraneRefresh").addEventListener("click",()=>{const ok=refreshCraneChoices();craneSummary.textContent=ok?"موقعیت‌ها و پایه‌های واقعی از جاروب جرثقیل بارگذاری شدند.":"جاروب کامل موفق پیدا نشد؛ ابتدا جاروب جرثقیل را اجرا و دوباره بارگذاری کنید.";});
 function refreshCraneChoices(){
  const envelope=root.SteelCrane3DLoadTransfer?.getLastAutomaticEnvelope?.(),trace=envelope?.demandTraceAudit;
  const model=root.SteelStructuralModel?.build?.()||root.SteelStructuralModel?.model;
  const audit=root.SteelFoundationReactionBridge?.auditCraneDemandTrace?.(trace,model);
  craneNode.replaceChildren();craneCase.replaceChildren();
  if(!audit?.ok){craneNode.add(new Option("جاروب کامل/ممیزی موفق موجود نیست",""));craneCase.add(new Option("موقعیت موجود نیست",""));return false;}
  [...new Set(audit.demands.map(d=>d.nodeId))].forEach(id=>craneNode.add(new Option(id,id)));
  audit.cases.forEach(c=>craneCase.add(new Option(c.label,c.label)));
  loadCraneLayout();
  return true;
 }
 refreshCraneChoicesApi=refreshCraneChoices;
 craneRun.addEventListener("click",()=>{
  try{
   const envelope=root.SteelCrane3DLoadTransfer?.getLastAutomaticEnvelope?.(),trace=envelope?.demandTraceAudit;
   const model=root.SteelStructuralModel?.build?.()||root.SteelStructuralModel?.model;
   const audit=root.SteelFoundationReactionBridge?.auditCraneDemandTrace?.(trace,model);
   if(!audit?.ok)throw Error(audit?.issues?.join("؛ ")||"ابتدا جاروب کامل جرثقیل را اجرا کنید.");
   const nodeId=craneNode.value,caseId=craneCase.value;
   const demand=audit.demands.find(d=>d.nodeId===nodeId&&d.caseId===caseId);
   if(!demand)throw Error("تقاضای مستقل این پایه/موقعیت در ردیابی جرثقیل یافت نشد.");
   const v=demand.columnActionN_Nm,selection={row:{nodeId},case:{label:caseId},mapped:{Vx_kN:v[0]/1000,N_tensionPositive_kN:v[1]/1000,Vz_kN:v[2]/1000,Mx_kNm:v[3]/1000,Ty_kNm:v[4]/1000,Mz_kNm:v[5]/1000}};
   const layout=craneAnchorGroups[nodeId];
   if(!layout)throw Error("برای این گره پایه هندسه مستقل انکر ثبت نشده است؛ ابتدا ردیف/ستون، فاصله محورها و تأییدهای همان پایه را ثبت کنید.");
   lastCrane=calculateSelected(selection,layout);
   if(!lastCrane.ok)throw Error(lastCrane.issues.join("؛ "));
   lastCrane.cranePosition={caseId,caseIndex:demand.caseIndex,referencePosition_m:demand.referencePosition_m};
   last=lastCrane;
   const f=x=>(x/1000).toLocaleString("fa-IR",{maximumFractionDigits:4});
   craneSummary.textContent="گره "+nodeId+" | "+caseId+" | موقعیت قطار: "+demand.referencePosition_m+" m | تعداد انکر: "+lastCrane.anchors.length+" | بیشینه کشش: "+f(Math.max(...lastCrane.anchors.map(a=>a.tensionDemand_N)))+" kN | بیشینه برش: "+f(Math.max(...lastCrane.anchors.map(a=>a.resultantShear_N)))+" kN | تعادل: "+(lastCrane.equilibrium.ok?"برقرار":"نامعتبر")+". فقط تقاضا؛ نه ظرفیت‌سنجی یا تأیید طراحی.";
   const body=$("brtAnchorDemandRows");body.replaceChildren();
   lastCrane.anchors.forEach(a=>{const tr=root.document.createElement("tr");[a.anchorId,a.x_m,a.z_m,f(a.tensionDemand_N),f(a.compressionDemand_N),f(a.totalShearX_N),f(a.totalShearZ_N),f(a.resultantShear_N)].forEach(x=>{const td=root.document.createElement("td");td.textContent=String(x);tr.appendChild(td);});body.appendChild(tr);});
   craneJson.disabled=false;
  }catch(e){lastCrane=null;craneSummary.textContent="انتقال/محاسبه متوقف شد: "+String(e.message||e);craneJson.disabled=true;}
 });
 craneJson.addEventListener("click",()=>{if(!lastCrane)return;const blob=new Blob([JSON.stringify({schema:"SAHROUD-STEEL-CRANE-ANCHOR-DEMAND-1.0",generatedAt:new Date().toISOString(),analysisEnabled:false,designApproved:false,result:lastCrane},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Crane-Anchor-Demand.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $("brtAnchorDemandRun").addEventListener("click",()=>{
  try{
   const selection=root.SteelBaseReactionTransfer?.selected?.();
   const layout=root.SteelAnchorDemandScreen?.getData?.();
   last=calculateSelected(selection,layout);
   if(!last.ok)throw Error(last.issues.join("؛ "));
   const f=v=>(v/1000).toLocaleString("fa-IR",{maximumFractionDigits:4});
   $("brtAnchorDemandSummary").textContent="گره "+last.nodeId+" | حالت "+last.caseId+" | تعداد انکر: "+last.anchors.length+" | باقیمانده تعادل محوری: "+f(last.equilibrium.axialResidual_N)+" kN | Mx: "+f(last.equilibrium.momentXResidual_Nm)+" kN.m | Mz: "+f(last.equilibrium.momentZResidual_Nm)+" kN.m | برش X/Z: "+f(last.equilibrium.shearXResidual_N)+" / "+f(last.equilibrium.shearZResidual_N)+" kN | پیچش: "+f(last.equilibrium.torsionResidual_Nm)+" kN.m. این خروجی فقط تقاضای توزیع‌شده است.";
   const body=$("brtAnchorDemandRows");body.replaceChildren();
   last.anchors.forEach(a=>{const tr=root.document.createElement("tr");[a.anchorId,a.x_m,a.z_m,f(a.tensionDemand_N),f(a.compressionDemand_N),f(a.totalShearX_N),f(a.totalShearZ_N),f(a.resultantShear_N)].forEach(v=>{const td=root.document.createElement("td");td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});
   $("brtAnchorDemandJson").disabled=false;
  }catch(e){last=null;$("brtAnchorDemandSummary").textContent="محاسبه متوقف شد: "+String(e.message||e);$("brtAnchorDemandJson").disabled=true;$("brtAnchorDemandRows").replaceChildren();}
 });
 $("brtAnchorSteelRun").addEventListener("click",()=>{
  try{
   if(!last?.ok)throw Error("ابتدا تقاضای معتبر انکر را محاسبه کنید.");
   const api=root.SteelAnchorSteelGroupAudit;if(!api?.compare)throw Error("ماژول غربال مقاومت فولادی انکر بارگذاری نشده است.");
   const result=api.compare(last,{Ase_mm2:Number($("brtAsAse").value),Fnt_MPa:Number($("brtAsFnt").value),Fnv_MPa:Number($("brtAsFnv").value),phiT:Number($("brtAsPhiT").value),phiV:Number($("brtAsPhiV").value)});
   $("brtAnchorSteelSummary").textContent="غربال فولادی جداگانه: "+(result.allSeparateChecksPass?"تمام نسبت‌های مستقل کشش و برش حداکثر ۱ هستند":"حداقل یک نسبت مستقل کشش یا برش از ۱ بیشتر است")+" | بیشینه نسبت کشش: "+result.governingTensionRatio.toLocaleString("fa-IR",{maximumFractionDigits:4})+" | بیشینه نسبت برش: "+result.governingShearRatio.toLocaleString("fa-IR",{maximumFractionDigits:4})+". این نتیجه اندرکنش یا مهار بتن را تأیید نمی‌کند.";
   const body=$("brtAnchorSteelRows");body.replaceChildren();
   result.rows.forEach(a=>{const tr=root.document.createElement("tr");[a.anchorId+" / "+a.caseId,a.tensionRatio.toFixed(4),a.shearRatio.toFixed(4),a.tensionDesignCapacity_kN.toFixed(3),a.shearDesignCapacity_kN.toFixed(3),(a.tensionPass&&a.shearPass)?"قبول جداگانه":"نیازمند بررسی"].forEach(v=>{const td=root.document.createElement("td");td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});
  }catch(e){$("brtAnchorSteelSummary").textContent="غربال متوقف شد: "+String(e.message||e);$("brtAnchorSteelRows").replaceChildren();}
 });
 $("brtAnchorDemandJson").addEventListener("click",()=>{if(!last)return;const blob=new Blob([JSON.stringify(last,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Demand-"+last.nodeId+"-"+last.caseId+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 ck("builds centered rectangular anchor coordinates in metres",()=>{const a=buildAnchors({rows:2,cols:2,pitchX:200,pitchZ:100});return a.length===4&&a[0].x_m===-.1&&a[0].z_m===-.05&&a[3].x_m===.1&&a[3].z_m===.05;});
 ck("rejects noninteger anchor row count",()=>{try{buildAnchors({rows:1.5,cols:2,pitchX:100,pitchZ:100});return false;}catch(e){return true;}});
 ck("rejects missing active-axis spacing",()=>{try{buildAnchors({rows:2,cols:2,pitchX:100,pitchZ:0});return false;}catch(e){return true;}});
 const selection={row:{nodeId:"B1"},case:{label:"ULS-1"},mapped:{N_tensionPositive_kN:4,Vx_kN:1,Vz_kN:2,Mx_kNm:0,Ty_kNm:0,Mz_kNm:0}};
 ck("requires sign confirmation",()=>{try{calculateSelected(selection,{rows:2,cols:2,pitchX:100,pitchZ:100,geometryConfirmed:true});return false;}catch(e){return e.message.includes("علامت");}});
 ck("requires as-built geometry confirmation",()=>{try{calculateSelected(selection,{rows:2,cols:2,pitchX:100,pitchZ:100,signConfirmed:true});return false;}catch(e){return e.message.includes("هندسه");}});
 ck("checks column footprint within base plate",()=>{const a=buildAnchors({rows:2,cols:2,pitchX:100,pitchZ:100});return auditBasePlateGeometry({plateWidthMm:400,plateLengthMm:400,columnWidthMm:200,columnDepthMm:200,footingWidthMm:600,footingDepthMm:600,anchorEdgeDistanceMm:40},a).checks[0].ok;});
 ck("rejects anchors outside plate edge clearance",()=>{const a=buildAnchors({rows:2,cols:2,pitchX:300,pitchZ:300});return !auditBasePlateGeometry({plateWidthMm:320,plateLengthMm:320,columnWidthMm:200,columnDepthMm:200,footingWidthMm:600,footingDepthMm:600,anchorEdgeDistanceMm:30},a).ok;});
 ck("rejects plate larger than footing footprint",()=>{const a=buildAnchors({rows:2,cols:2,pitchX:100,pitchZ:100});return !auditBasePlateGeometry({plateWidthMm:500,plateLengthMm:500,columnWidthMm:200,columnDepthMm:200,footingWidthMm:400,footingDepthMm:400,anchorEdgeDistanceMm:40},a).ok;});
 ck("normalizes and retains full measured geometry for project save/load",()=>{const d={B1:{rows:2,cols:2,pitchX:160,pitchZ:160,plateWidthMm:400,plateLengthMm:400,columnWidthMm:200,columnDepthMm:200,footingWidthMm:600,footingDepthMm:600,anchorEdgeDistanceMm:40,signConfirmed:true,geometryConfirmed:true}};const x=normalizeCraneAnchorGroups(d);return !!x.B1&&x.B1.plateWidthMm===400&&x.B1.footingDepthMm===600;});
 ck("keeps independent anchor layouts for different physical base nodes",()=>{const x=normalizeCraneAnchorGroups({B1:{rows:2,cols:2,pitchX:160,pitchZ:160,plateWidthMm:500,plateLengthMm:500,columnWidthMm:200,columnDepthMm:200,footingWidthMm:700,footingDepthMm:700,anchorEdgeDistanceMm:40,signConfirmed:true,geometryConfirmed:true},B2:{rows:3,cols:2,pitchX:220,pitchZ:180,plateWidthMm:500,plateLengthMm:500,columnWidthMm:200,columnDepthMm:200,footingWidthMm:700,footingDepthMm:700,anchorEdgeDistanceMm:40,signConfirmed:true,geometryConfirmed:true}});return x.B1.pitchX===160&&x.B2.rows===3&&Object.keys(x).length===2;});
 ck("rejects unconfirmed or invalid persisted anchor geometry",()=>{const x=normalizeCraneAnchorGroups({B1:{rows:2,cols:2,pitchX:160,pitchZ:160,signConfirmed:true,geometryConfirmed:false},B2:{rows:1,cols:1,pitchX:0,pitchZ:0,signConfirmed:true,geometryConfirmed:true}});return Object.keys(x).length===0;});
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
function normalizeCraneAnchorGroups(data){const clean={};if(data&&typeof data==="object"&&!Array.isArray(data))Object.entries(data).forEach(([id,d])=>{const rows=Number(d?.rows),cols=Number(d?.cols),pitchX=Number(d?.pitchX),pitchZ=Number(d?.pitchZ);if(id&&Number.isInteger(rows)&&Number.isInteger(cols)&&rows>=1&&cols>=1&&rows<=8&&cols<=8&&rows*cols>=2&&Number.isFinite(pitchX)&&Number.isFinite(pitchZ)&&(cols===1||pitchX>0)&&(rows===1||pitchZ>0)&&d.signConfirmed===true&&d.geometryConfirmed===true){const candidate={...d,rows,cols,pitchX,pitchZ};try{const geometry=auditBasePlateGeometry(candidate,buildAnchors(candidate));if(geometry.ok)clean[id]={...candidate,signConfirmed:true,geometryConfirmed:true};}catch(e){}}});return clean;}
function getData(){return JSON.parse(JSON.stringify(craneAnchorGroups));}
function setData(data){craneAnchorGroups=normalizeCraneAnchorGroups(data);}
root.SteelAnchorCaseDemandUI={buildAnchors,calculateSelected,refreshCraneChoices:(...args)=>refreshCraneChoicesApi(...args),getData,setData,selfTest,mount};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/structure-view-gallery.js ===== */
/* SAHROUD STEEL — model-driven structural view gallery */
(function () {
"use strict";
const NS="http://www.w3.org/2000/svg",$=id=>document.getElementById(id);
let activeIndex=0,slides=[];
const C={column:"#176b9b",rafter:"#d97706",brace:"#dc2626",crane:"#7c3aed",rail:"#f59e0b",girt:"#64748b",grid:"#e5edf2",bg:"#f8fafc"};
const api=()=>window.SteelStructuralModel;
function ensureModel(){return api()?.model||null;}
function root(svg,W=900,H=470){svg.innerHTML="";svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("preserveAspectRatio","xMidYMid meet");const el=(tag,a)=>{const n=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));svg.appendChild(n);return n;};el("rect",{x:0,y:0,width:W,height:H,fill:C.bg});for(let x=30;x<W;x+=30)el("line",{x1:x,y1:35,x2:x,y2:H-35,stroke:C.grid,"stroke-width":1});for(let y=45;y<H-35;y+=30)el("line",{x1:20,y1:y,x2:W-20,y2:y,stroke:C.grid,"stroke-width":1});const line=(x1,y1,x2,y2,color="#64748b",width=3,dash="")=>{const a={x1,y1,x2,y2,stroke:color,"stroke-width":width,"stroke-linecap":"round"};if(dash)a["stroke-dasharray"]=dash;el("line",a);};const text=(x,y,t,size=14,color="#263746",weight="normal")=>{const n=el("text",{x,y,fill:color,"font-size":size,"font-family":"Tahoma,Arial","text-anchor":"middle","font-weight":weight,direction:"rtl"});n.textContent=t;};return{el,line,text};}
function nodeMap(m){return new Map((m?.nodes||[]).map(n=>[String(n.id),n]));}
function ends(m,nodes,x){const a=nodes.get(String(x.start)),b=nodes.get(String(x.end));return a&&b?[a,b]:null;}
function fit(points,W=900,H=470,pad=85){if(!points.length)return null;let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of points){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;}if(!Number.isFinite(minX)||!Number.isFinite(minY))return null;const sx=(W-2*pad)/Math.max(1e-6,maxX-minX),sy=(H-2*pad)/Math.max(1e-6,maxY-minY),s=Math.min(sx,sy),ox=(W-(maxX-minX)*s)/2-minX*s,oy=H-pad+minY*s;return p=>({x:ox+p.x*s,y:oy-p.y*s});}
function noModel(svg,msg){const d=root(svg);d.text(450,220,msg,19,"#9f1239","bold");d.text(450,252,"ابتدا مدل هندسی جاری را تولید کنید؛ ترسیم فرضی انجام نمی‌شود.",12);}
function draw3d(svg){
 const m=api()?.model;
 if(!m?.nodes?.length||!m?.members?.length){noModel(svg,"مدل هندسی هنوز ساخته نشده است.");return;}
 const ns=nodeMap(m),items=[];
 const g=m.geometry||{},az=(api()?.getCameraView?.().azimuth||0)*Math.PI/180,ca=Math.cos(az),sa=Math.sin(az);
 (m.members||[]).forEach(member=>{
  const e=ends(m,ns,member);if(!e)return;
  const project=n=>{const x=Number(n.x)-Number(g.span||0)/2,z=Number(n.z)-Number(g.length||0)/2;return{x:x*ca-z*sa+z*.42,y:Number(n.y)+(-x*sa-z*ca)*.22};};
  items.push({member,a:project(e[0]),b:project(e[1])});
 });
 if(!items.length){noModel(svg,"اعضای قابل ترسیم در مدل وجود ندارند.");return;}
 const P=fit(items.flatMap(x=>[x.a,x.b])),d=root(svg);
 const color=k=>({column:C.column,rafter:C.rafter,roofPurlin:"#0f766e",wallGirt:C.girt,wallBrace:C.brace,roofBrace:C.brace,endPost:"#2563eb",endGirt:"#94a3b8",roofEdge:"#b45309"}[k]||"#64748b");
 items.sort((a,b)=>({roofPurlin:0,wallGirt:0,endGirt:0,endPost:1,roofBrace:2,wallBrace:2,column:3,rafter:4}[a.member.sectionKey]??1)-({roofPurlin:0,wallGirt:0,endGirt:0,endPost:1,roofBrace:2,wallBrace:2,column:3,rafter:4}[b.member.sectionKey]??1));
 items.forEach(x=>{const p=P(x.a),q=P(x.b),k=x.member.sectionKey,w=k==="column"?5:k==="rafter"?4:k==="wallBrace"||k==="roofBrace"?2.6:1.5;d.line(p.x,p.y,q.x,q.y,color(k),w);});
 d.text(450,26,"نمای سه‌بعدی — ترسیم مستقیم از اعضای مدل",17,"#123b52","bold");
 d.text(450,455,"گره‌ها "+m.nodes.length+" | اعضای ترسیم‌شده "+items.length,12);
}
function camera(item,svg){const bar=document.createElement("div");bar.className="structure-camera-controls";bar.setAttribute("aria-label","کنترل نمای سه‌بعدی");const actions=[["＋","بزرگنمایی",()=>{const v=api()?.getCameraView?.()||{zoom:1};api()?.setCameraView?.({zoom:v.zoom+.15});draw3d(svg);}],["−","کوچک‌نمایی",()=>{const v=api()?.getCameraView?.()||{zoom:1};api()?.setCameraView?.({zoom:v.zoom-.15});draw3d(svg);}],["↶","چرخش به چپ",()=>{const v=api()?.getCameraView?.()||{azimuth:0};api()?.setCameraView?.({azimuth:v.azimuth-15});draw3d(svg);}],["↷","چرخش به راست",()=>{const v=api()?.getCameraView?.()||{azimuth:0};api()?.setCameraView?.({azimuth:v.azimuth+15});draw3d(svg);}],["⟲","بازنشانی",()=>{api()?.setCameraView?.({zoom:1,azimuth:0});draw3d(svg);}]];actions.forEach(([label,title,fn])=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.title=title;b.setAttribute("aria-label",title);b.addEventListener("click",fn);bar.appendChild(b);});const hint=document.createElement("span");hint.className="structure-camera-help";hint.textContent="زوم و چرخش مدل واقعی";bar.appendChild(hint);item.insertBefore(bar,svg);svg.addEventListener("wheel",e=>{e.preventDefault();const v=api()?.getCameraView?.()||{zoom:1};api()?.setCameraView?.({zoom:v.zoom+(e.deltaY<0?.08:-.08)});draw3d(svg);},{passive:false});let pinchStart=0;svg.addEventListener("touchstart",e=>{if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;pinchStart=Math.hypot(dx,dy);}},{passive:true});svg.addEventListener("touchmove",e=>{if(e.touches.length===2&&pinchStart>0){e.preventDefault();const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,dist=Math.hypot(dx,dy),v=api()?.getCameraView?.()||{zoom:1};if(Math.abs(dist-pinchStart)>8){api()?.setCameraView?.({zoom:v.zoom*(dist/pinchStart)});pinchStart=dist;draw3d(svg);}}},{passive:false});svg.addEventListener("touchend",()=>{pinchStart=0;},{passive:true});}
function drawFrame(svg){
 const m=api()?.model;if(!m?.nodes?.length){noModel(svg,"مدل هندسی تولید نشده است.");return;}
 const ns=nodeMap(m),candidates=[];
 (m.members||[]).forEach(member=>{
  if(!["column","rafter"].includes(member.sectionKey))return;
  const e=ends(m,ns,member);if(!e||Math.abs(Number(e[0].z)-Number(e[1].z))>1e-6)return;
  candidates.push({member,ends:e,z:(Number(e[0].z)+Number(e[1].z))/2});
 });
 if(!candidates.length){noModel(svg,"عضو عرضی ستون یا رفتر در مدل پیدا نشد.");return;}
 const zs=[...new Set(candidates.map(x=>x.z.toFixed(6)))].map(Number).sort((a,b)=>a-b),z0=zs[0];
 const arr=candidates.filter(x=>Math.abs(x.z-z0)<1e-5),P=fit(arr.flatMap(x=>x.ends.map(n=>({x:Number(n.x),y:Number(n.y)})))),d=root(svg);
 arr.forEach(x=>{const p=P({x:Number(x.ends[0].x),y:Number(x.ends[0].y)}),q=P({x:Number(x.ends[1].x),y:Number(x.ends[1].y)}),col=x.member.sectionKey==="column";d.line(p.x,p.y,q.x,q.y,col?C.column:C.rafter,col?8:7);});
 d.text(450,28,"نمای عرضی قاب — استخراج از مختصات واقعی مدل",17,"#123b52","bold");
 d.text(450,455,"تراز طولی قاب "+z0.toFixed(2)+" m | اعضا "+arr.length,12);
}
function drawLongitudinal(svg,first){
 const m=api()?.model;if(!m?.nodes?.length){noModel(svg,"مدل هندسی تولید نشده است.");return;}
 const ns=nodeMap(m),all=[];
 (m.members||[]).forEach(member=>{
  if(!["column","wallGirt","wallBrace"].includes(member.sectionKey))return;
  const e=ends(m,ns,member);if(!e)return;
  all.push({member,ends:e});
 });
 if(!all.length){noModel(svg,"اعضای دیوار طولی در مدل موجود نیستند.");return;}
 const xs=all.flatMap(x=>x.ends.map(n=>Number(n.x))),x0=Math.min(...xs);
 let arr=all.filter(x=>x.ends.every(n=>Math.abs(Number(n.x)-x0)<1e-5));
 if(first){
  const g=m.geometry||{},zmax=Math.min(Number(g.spacing)||Number(g.length)||0,Number(g.length)||0);
  arr=arr.filter(x=>x.ends.every(n=>Number(n.z)>=-1e-6&&Number(n.z)<=zmax+1e-6));
 }
 if(!arr.length)arr=all.filter(x=>x.ends.every(n=>Math.abs(Number(n.x)-x0)<1e-5));
 const P=fit(arr.flatMap(x=>x.ends.map(n=>({x:Number(n.z),y:Number(n.y)})))),d=root(svg);
 arr.forEach(x=>{const p=P({x:Number(x.ends[0].z),y:Number(x.ends[0].y)}),q=P({x:Number(x.ends[1].z),y:Number(x.ends[1].y)}),k=x.member.sectionKey;d.line(p.x,p.y,q.x,q.y,k==="wallBrace"?C.brace:k==="wallGirt"?C.girt:C.column,k==="wallBrace"?4:k==="wallGirt"?2.2:6);});
 const braces=arr.filter(x=>x.member.sectionKey==="wallBrace").length;
 d.text(450,28,first?"نمای دهانه اول طولی":"نمای طولی دیوار سوله",17,"#123b52","bold");
 d.text(450,455,"طول "+(m.geometry?.length||0)+" m | بادبندهای نمایش‌داده‌شده "+braces,12,braces?C.brace:"#64748b","bold");
}
function drawCrane(svg){
 const m=api()?.model;if(!m){noModel(svg,"مدل هندسی تولید نشده است.");return;}
 const r=m.geometry?.craneRunway;if(!r?.enabled){noModel(svg,"جرثقیل در مشخصات پروژه فعال نیست.");return;}
 const seg=(r.beamSegments||[]).map(x=>({a:x.start,b:x.end,k:"beam"})).concat((r.railSegments||[]).map(x=>({a:{y:Number(r.elevationM),z:x.startM},b:{y:Number(r.elevationM),z:x.endM},k:"rail"})),(r.brackets||[]).map(x=>({a:x.from,b:x.to,k:"bracket"})));
 const pts=seg.flatMap(x=>[x.a,x.b]).filter(p=>p&&Number.isFinite(Number(p.z))&&Number.isFinite(Number(p.y)));
 if(!pts.length){noModel(svg,"هندسه تیر حمال، ریل یا براکت در مدل موجود نیست.");return;}
 const P=fit(pts.map(p=>({x:Number(p.z),y:Number(p.y)}))),d=root(svg);
 seg.forEach(x=>{if(!x.a||!x.b)return;const p=P({x:Number(x.a.z),y:Number(x.a.y)}),q=P({x:Number(x.b.z),y:Number(x.b.y)});d.line(p.x,p.y,q.x,q.y,x.k==="rail"?C.rail:x.k==="bracket"?"#a855f7":C.crane,x.k==="beam"?5:3,x.k==="bracket"?"4 3":"");});
 d.text(450,28,"نمای طولی تیر حمال و ریل جرثقیل",17,"#123b52","bold");
 d.text(450,455,"تیر حمال "+(r.beamSegments?.length||0)+" | ریل "+(r.railSegments?.length||0)+" | براکت "+(r.brackets?.length||0),12);
}
function makeSlide(title,kind){const item=document.createElement("article");item.className="structure-view-slide";item.setAttribute("role","group");item.setAttribute("aria-label",title);const h=document.createElement("h4");h.textContent=title;item.appendChild(h);const svg=document.createElementNS(NS,"svg");svg.classList.add("structure-view-svg");svg.setAttribute("role","img");svg.setAttribute("aria-label",title);item.appendChild(svg);if(kind==="3d")camera(item,svg);return{item,svg,kind};}
function update(){const track=$("structureViewTrack");if(!track)return;const list=[["نمای سه‌بعدی کل اجزای سازه‌ای سوله","3d"],["نمای دوبعدی قاب اول","frame"],["نمای طولی سوله با بادبندهای مدل","longitudinal"],["دهانه مهاربندی اول: قیدها، ستون‌ها و ضربدری‌ها","braced"]];if($("crane_enabled")?.checked)list.push(["نمای طولی تیر حمال، ریل و براکت‌های جرثقیل","crane"]);const sig=list.map(x=>x[1]).join("|");if(track.dataset.signature!==sig){track.innerHTML="";slides=list.map(x=>makeSlide(x[0],x[1]));slides.forEach(s=>track.appendChild(s.item));track.dataset.signature=sig;activeIndex=0;}slides.forEach(s=>{if(s.kind==="3d")draw3d(s.svg);else if(s.kind==="frame")drawFrame(s.svg);else if(s.kind==="longitudinal")drawLongitudinal(s.svg,false);else if(s.kind==="braced")drawLongitudinal(s.svg,true);else drawCrane(s.svg);});sync();}
function sync(){const c=$("structureViewCounter");if(c)c.textContent="نمای "+Math.min(activeIndex+1,slides.length)+" از "+slides.length;const p=$("structureViewPrev"),n=$("structureViewNext");if(p)p.disabled=activeIndex<=0;if(n)n.disabled=activeIndex>=slides.length-1;}
function go(i){activeIndex=Math.max(0,Math.min(slides.length-1,i));slides[activeIndex]?.item.scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});sync();}
function connect(){if(!$("structureViewsPanel"))return;$("structureViewPrev")?.addEventListener("click",()=>go(activeIndex-1));$("structureViewNext")?.addEventListener("click",()=>go(activeIndex+1));const track=$("structureViewTrack");track?.addEventListener("scroll",()=>{if(!slides.length)return;const i=Math.round(track.scrollLeft/(track.clientWidth||1));if(Number.isFinite(i)&&i!==activeIndex){activeIndex=Math.max(0,Math.min(slides.length-1,i));sync();}},{passive:true});/* Gallery must never build or rebuild the FEM geometry in response to form changes. The user explicitly builds the model; only then do we redraw these lightweight views. */["btnBuildFullModel","btnRunFull3D","btnRunAll3DCombinations","btnDraw"].forEach(id=>$(id)?.addEventListener("click",()=>setTimeout(update,450)));update();}
window.SteelStructureViewGallery={update,goTo:go};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",connect);else connect();
})();

/* ===== steel2/js/project-workspace.js ===== */
/* SAHROUD STEEL — unified project workspace */
(function(){
"use strict";
const $=id=>document.getElementById(id),v=id=>$(id)?.value??"";
let lastRun=null,model=null,audit=null,drawings=null;
function addStyle(){
 if($("ssWorkspaceStyle"))return;
 const s=document.createElement("style");s.id="ssWorkspaceStyle";
 s.textContent="#ssWorkspace{border:1px solid #b8c9d5;border-radius:16px;padding:18px;margin:16px 0;background:#f8fbfd}#ssWorkspace h2{margin:0 0 8px;color:#123b52}#ssWorkspace .ss-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}#ssWorkspace label{display:block;font-size:13px;font-weight:700;margin-bottom:5px}#ssWorkspace input,#ssWorkspace select{box-sizing:border-box;padding:10px;border:1px solid #b8c9d5;border-radius:8px;background:white;max-width:100%}#ssWorkspace .ss-card{background:white;border:1px solid #d6e0e7;border-radius:12px;padding:14px;margin-top:14px}#ssWorkspace .ss-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}#ssWorkspace button{border:0;border-radius:9px;padding:11px 16px;cursor:pointer;font-weight:700}#ssWorkspace .ss-primary{background:#123b52;color:white}#ssWorkspace .ss-secondary{background:#e5edf2;color:#123b52}#ssWorkspace .ss-status{padding:12px;border-radius:9px;background:#edf4f8;margin-top:12px;white-space:pre-wrap}#ssWorkspace .ss-output{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}#ssWorkspace .ss-output label{display:flex;align-items:center;gap:8px;font-weight:500}#ssLegacyDetails{margin-top:18px;border:1px solid #d5e0e7;border-radius:12px;padding:10px;background:#fff}#ssLegacyDetails>summary{font-weight:700;cursor:pointer;color:#123b52;padding:8px}@media(max-width:600px){#ssWorkspace{padding:12px}#ssWorkspace .ss-actions button{width:100%}}";
 document.head.appendChild(s);
}
function set(id,value){const e=$(id);if(!e||value===undefined||value===null)return;e.value=String(value);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}
function readModule(name,method){const api=window[name];if(!api||typeof api[method]!=="function")return {available:false,status:"unsupported",data:null};try{return {available:true,status:"captured",data:api[method]()};}catch(e){return {available:true,status:"error",data:null,error:e?.message||String(e)};}}
function compactLoadSummary(loads){if(!loads||typeof loads!=="object")return "داده بارگذاری در دسترس نیست.";const keys=Object.keys(loads);const numeric=keys.filter(k=>typeof loads[k]==="number"&&Number.isFinite(loads[k])).map(k=>k+"="+loads[k]);const nested=keys.filter(k=>loads[k]&&typeof loads[k]==="object").map(k=>k+" ("+(Array.isArray(loads[k])?loads[k].length+" مورد":Object.keys(loads[k]).length+" فیلد")+")");return "فیلدها: "+keys.join(", ")+"؛ مقادیر عددی: "+(numeric.join(", ")||"ندارد")+"؛ مجموعه‌ها: "+(nested.join(", ")||"ندارد");}
function read(){
 return {schema:"sahroud-steel-project-inputs",version:1,createdAt:new Date().toISOString(),
 project:{name:v("ssName"),owner:v("ssOwner"),designer:v("ssDesigner"),city:v("ssCity")},
 materials:window.SteelSections?.read?.()||null,
 geometry:{spanM:Number(v("ssSpan")),lengthM:Number(v("ssLength")),frameSpacingM:Number(v("ssSpacing")),columnHeightM:Number(v("ssHeight")),roofRiseM:Number(v("ssRise")),baseConnection:v("ssSupport")},
 configuration:{overheadCrane:$("ssCrane").checked,requestedMaxPurlinSpacingM:Number(v("ssPurlin")),requestedGirtSpacingM:Number(v("ssGirt")),longitudinalBraceBays:Number(v("ssBraceBays"))}};
}
function apply(){
 const d=read(),p=d.project,g=d.geometry,c=d.configuration;
 [["projectName",p.name],["owner",p.owner],["designer",p.designer],["city",p.city],["span",g.spanM],["length",g.lengthM],["spacing",g.frameSpacingM],["height",g.columnHeightM],["rise",g.roofRiseM],["baseConnection",g.baseConnection],["modelPurlinSpacing",c.requestedMaxPurlinSpacingM],["modelGirtSpacing",c.requestedGirtSpacingM],["modelBraceBays",c.longitudinalBraceBays]].forEach(x=>set(x[0],x[1]));
 if($("crane_enabled")){$("crane_enabled").checked=c.overheadCrane;$("crane_enabled").dispatchEvent(new Event("change",{bubbles:true}));}
 if($("climateCity"))set("climateCity",p.city);
 window.updateRoofGeometry?.();return d;
}
function ui(){
 if($("ssWorkspace"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.id="ssWorkspace";
 p.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h2>پروژه جدید سوله</h2><div>مشخصات پایه را یک‌بار وارد کنید؛ مدل، محاسبات قابل انجام و مدارک از همین صفحه مدیریت می‌شوند.</div></div><strong>SAHROUD STEEL</strong></div>'+
 '<div class="ss-card"><h3>۱. مشخصات پروژه و محل اجرا</h3><div class="ss-grid"><div><label>نام پروژه</label><input id="ssName" value="سوله صنعتی"></div><div><label>کارفرما</label><input id="ssOwner" placeholder="نام کارفرما"></div><div><label>طراح</label><input id="ssDesigner" placeholder="نام مهندس"></div><div><label>شهر</label><select id="ssCity"></select></div></div></div>'+
 '<div class="ss-card"><h3>۲. هندسه سوله</h3><div class="ss-grid"><div><label>دهانه (m)</label><input id="ssSpan" type="number" min="1" step=".1" value="12"></div><div><label>طول (m)</label><input id="ssLength" type="number" min="1" step=".1" value="36"></div><div><label>فاصله قاب‌ها (m)</label><input id="ssSpacing" type="number" min="1" step=".1" value="6"></div><div><label>ارتفاع ستون (m)</label><input id="ssHeight" type="number" min="1" step=".1" value="6"></div><div><label>افزایش ارتفاع تاج (m)</label><input id="ssRise" type="number" min="0" step=".1" value="1.2"></div><div><label>اتصال پای ستون</label><select id="ssSupport"><option value="pinned">مفصلی</option><option value="fixed">گیردار</option></select></div></div></div>'+
 '<div class="ss-card"><h3>۳. تجهیزات و فاصله‌گذاری</h3><div class="ss-grid"><div><label><input id="ssCrane" type="checkbox" style="width:auto"> جرثقیل سقفی دارد</label></div><div><label>حداکثر فاصله درخواستی پرلین (m)</label><input id="ssPurlin" type="number" min=".2" step=".05" value="1.2"></div><div><label>فاصله درخواستی گرت (m)</label><input id="ssGirt" type="number" min=".2" step=".05" value="1.5"></div><div><label>دهانه‌های مهاربندی طولی</label><input id="ssBraceBays" type="number" min="0" step="1" value="1"></div></div><p>با فعال‌کردن جرثقیل، اطلاعات بار چرخ و مسیر تیر حمال باید از سازنده/نقشه وارد شود؛ بار جرثقیل حدس زده نمی‌شود.</p></div>'+
 '<div class="ss-card"><h3>۴. ساخت مدل و اجرای خودکار</h3><div class="ss-actions"><button id="ssRun" class="ss-primary" type="button">ساخت مدل و اجرای مراحل قابل انجام</button><button id="ssSave" class="ss-secondary" type="button">ذخیره ورودی‌ها (JSON)</button></div><div id="ssRunStatus" class="ss-status">مشخصات را وارد و اجرای مدل را انتخاب کنید.</div></div>'+
 '<div class="ss-card"><h3>۸. انتخاب و دریافت خروجی</h3><div class="ss-output"><label><input type="checkbox" id="ssOutReport" checked> دفترچه گزارش Word (RTF)</label><label><input type="checkbox" id="ssOutPDF" checked> گزارش PDF</label><label><input type="checkbox" id="ssOutDrawings" checked> نقشه‌های موجود (PDF از پنجره چاپ)</label><label><input type="checkbox" id="ssOutJSON" checked> مدل و داده‌ها (JSON)</label><label><input type="checkbox" id="ssOutBOQ" checked> متره (CSV در صورت وجود داده)</label><label><input type="checkbox" id="ssOutCode"> گزارش ضوابط و نواقص (RTF)</label></div><div class="ss-actions"><button id="ssExport" class="ss-primary" type="button">آماده‌سازی خروجی‌های انتخاب‌شده</button><button id="ssPrintDrawings" class="ss-secondary" type="button">چاپ نقشه‌های موجود</button></div><div id="ssExportStatus" class="ss-status">نقشه و گزارش ناقص با عنوان اجرایی یا تأییدشده صادر نمی‌شود.</div></div>';
 main.insertBefore(p,main.firstChild);
 const city=$("city"),sel=$("ssCity");if(city){[...city.options].forEach(o=>{const n=document.createElement("option");n.value=o.value;n.textContent=o.textContent;sel.appendChild(n);});sel.value=city.value||"shahroud";}else sel.innerHTML='<option value="shahroud">شاهرود</option>';
 $("ssRun").addEventListener("click",run);$("ssSave").addEventListener("click",()=>download("SAHROUD-STEEL-inputs.json",JSON.stringify(read(),null,2),"application/json;charset=utf-8"));
 $("ssExport").addEventListener("click",exportFiles);$("ssPrintDrawings").addEventListener("click",printDrawings);
 const sectionPanel=$("steelSectionsPanel");
 const old=document.createElement("details");old.id="ssLegacyDetails";old.innerHTML="<summary>تنظیمات تخصصی، جزئیات مهندسی و ابزارهای پیشرفته</summary>";
 [...main.children].filter(n=>n!==p).forEach(n=>old.appendChild(n));main.appendChild(old);
 if(sectionPanel&&$("ssMaterialsSlot"))$("ssMaterialsSlot").appendChild(sectionPanel);
 [["advancedLoadPanel","ssLoadsSlot"],["climateLoadCasePanel","ssClimateCasesSlot"],["openingPanel","ssOpeningsSlot"],["craneReadinessPanel","ssCraneSlot"],["craneTrainAnalysisPanel","ssCraneTrainSlot"],["geotechnicalDataPanel","ssGeotechSlot"],["quantityTakeoffPanel","ssQuantitySlot"],["projectBoqRegistryPanel","ssBoqSlot"],["costEstimatePanel","ssCostSlot"],["foundationTakeoffPanel","ssFoundationSlot"],["foundationRebarDrawingsPanel","ssFoundationDrawingsSlot"],["baseplateAnchorDrawingsPanel","ssAnchorDrawingsSlot"],["constructionDrawingsPanel","ssConstructionDrawingsSlot"]].forEach(pair=>{const el=$(pair[0]),slot=$(pair[1]);if(el&&slot)slot.appendChild(el);});
}
function validateInputObject(d){const g=d?.geometry||{},issues=[];if(![g.spanM,g.lengthM,g.frameSpacingM,g.columnHeightM].every(x=>Number.isFinite(x)&&x>0))issues.push("ابعاد اصلی باید مثبت و عددی باشند.");if(!Number.isFinite(g.roofRiseM)||g.roofRiseM<0)issues.push("افزایش ارتفاع تاج باید نامنفی باشد.");if(Number.isFinite(g.frameSpacingM)&&Number.isFinite(g.lengthM)&&g.frameSpacingM>g.lengthM)issues.push("فاصله قاب‌ها نباید از طول سوله بیشتر باشد.");const c=d?.configuration||{};if(c.overheadCrane&&!(Number(c.requestedMaxPurlinSpacingM)>0))issues.push("فاصله پرلین برای پروژه جرثقیل‌دار باید معتبر باشد.");return issues;}
function selfTest(){const checks=[],test=(name,fn)=>{try{checks.push({name,pass:!!fn()});}catch(e){checks.push({name,pass:false,error:e.message});}};const valid={geometry:{spanM:20,lengthM:40,frameSpacingM:5,columnHeightM:7,roofRiseM:2},configuration:{overheadCrane:false,requestedMaxPurlinSpacingM:1.2}};test("valid project geometry passes",()=>validateInputObject(valid).length===0);test("zero span is rejected",()=>validateInputObject({...valid,geometry:{...valid.geometry,spanM:0}}).length>0);test("negative roof rise is rejected",()=>validateInputObject({...valid,geometry:{...valid.geometry,roofRiseM:-1}}).length>0);test("frame spacing beyond building length is rejected",()=>validateInputObject({...valid,geometry:{...valid.geometry,frameSpacingM:50}}).length>0);test("crane configuration preserves explicit flag",()=>valid.configuration.overheadCrane===false);test("load summary avoids serializing raw payload",()=>compactLoadSummary({dead:1,snow:2,cases:[{},{}]}).includes("cases (2 مورد)")&&!compactLoadSummary({dead:1}).includes("{"));test("missing module is marked unsupported",()=>readModule("__missingWorkspaceTestApi","getData").status==="unsupported");test("module snapshot captures supported getter",()=>{window.__workspaceTestApi={getData:()=>({ok:true})};const r=readModule("__workspaceTestApi","getData");delete window.__workspaceTestApi;return r.status==="captured"&&r.data.ok===true;});return {passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,scope:"workspace input and snapshot safeguards only; no engineering approval"};}
function run(){
 const status=$("ssRunStatus");
 lastRun=null;model=null;audit=null;drawings=null;
 if(window.SteelQuantityTakeoff)window.SteelQuantityTakeoff.lastResult=null;
 try{
  const d=apply(),g=d.geometry,c=d.configuration;
  const inputIssues=validateInputObject(d);if(inputIssues.length)throw Error(inputIssues.join(" "));
  if(!$("ssMaterialConfirm")?.checked)throw Error("ابتدا مشخصات مصالح و مقاطع را در همین صفحه بررسی و تأیید کنید.");
  if(window.SteelSections?.validate&&!window.SteelSections.validate())throw Error("مشخصات مصالح، ستون و رفتر ناقص است؛ فرم مصالح و مقاطع را تکمیل کنید.");
  const err=window.SteelProject?.validate?.()||"";if(err)throw Error(err);
  model=window.SteelStructuralModel?.build?.();if(!model||!model.members?.length)throw Error("مدل هندسی تولید نشد.");
  window.SteelStructuralModel.draw?.();
  const loadsRead=readModule("SteelLoads","getData"),projectRead=readModule("SteelProject","getData");
  audit=window.SteelFreshModelStructuralAudit?.audit?.(model,loadsRead.data||{})||null;
  window.SteelAutoWorkflow?.run?.();
  let quantity={available:false,status:"unsupported",data:null};
  try{
   if(window.SteelQuantityTakeoff&&typeof window.SteelQuantityTakeoff.calculate==="function"){
    let q=window.SteelQuantityTakeoff.calculate(model);
    if(window.SteelFabricationTakeoff?.enrich)q=window.SteelFabricationTakeoff.enrich(q,model);
    window.SteelQuantityTakeoff.lastResult=q;
    window.SteelCostEstimate?.refreshFromBOQ?.(q);
    quantity={available:true,status:"calculated",data:q};
   }
  }catch(e){window.SteelQuantityTakeoff&&(window.SteelQuantityTakeoff.lastResult=null);quantity={available:true,status:"error",data:null,error:e?.message||String(e)};}
  try{
   if(window.SteelConstructionDrawings?.build){const built=window.SteelConstructionDrawings.build();drawings={success:!!(built&&built.sheets&&Object.keys(built.sheets).length),data:built,issue:null};}
   else drawings={success:false,issue:"ماژول تولید نقشه در دسترس نیست."};
  }catch(e){drawings={success:false,issue:e?.message||String(e)};}
  let boq=null;try{boq=window.SteelProjectBOQ?.refresh?.()||null;}catch(e){boq={success:false,issue:e?.message||String(e)};}
  const workflow=$("steelAutoWorkflowResults")?.innerText||"";
  const climateRead=readModule("SteelClimateDB","getData"),geoRead=readModule("SteelGeotechnicalData","getData"),openingsRead=readModule("SteelOpenings","getData"),craneRead=readModule("SteelCraneReadiness","getData"),foundationRead=readModule("SteelFoundationTakeoff","getData");
  lastRun={generatedAt:new Date().toISOString(),inputs:d,projectSnapshot:projectRead,loads:loadsRead,climate:climateRead,geotechnical:geoRead,openings:openingsRead,crane:craneRead,foundation:foundationRead,quantityTakeoff:quantity,model:{nodeCount:model.nodes?.length||0,memberCount:model.members?.length||0,nodes:model.nodes,members:model.members},freshModelAudit:audit,workflowReport:workflow,combinationResults:window.SteelAnalysis?.combinationResults||[],drawings:drawings,boq:boq,limitations:["این اجرا به معنی تکمیل طراحی آیین‌نامه‌ای نیست.","تحلیل سه‌بعدی کامل همه اعضای طولی/مهاربندها هنوز باید مستقل اعتبارسنجی شود.","ظرفیت همه اعضا، اتصالات، انکرها، بتن و خاک تا تکمیل داده و ماژول معتبر تأیید نمی‌شود.","داده اقلیمی شهر باید از منبع رسمی و موقعیت دقیق پروژه کنترل شود.","نقشه‌های موجود پارامتریک/شماتیک‌اند و لزوماً نقشه اجرایی نیستند."]};
  status.textContent="مدل ساخته شد: "+lastRun.model.nodeCount+" گره و "+lastRun.model.memberCount+" عضو.\nممیزی مدل تازه: "+(audit?.success?"موفق در کنترل‌های موجود":"ناقص/نیازمند بررسی")+"\nگزارش مراحل خودکار در بخش تخصصی قابل مشاهده است.\nهیچ تأیید نهایی مهندسی از این اجرا استنباط نمی‌شود.";
  $("ssExportStatus").textContent="مدل آماده است؛ خروجی‌های مورد نظر را انتخاب کنید.";
 }catch(e){status.textContent="توقف امن: "+(e?.message||String(e))+"\nنتیجه تأییدنشده صادر نشد.";}
}
function download(name,data,type){const b=new Blob([data],{type}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function rtf(s){let o="";s=String(s??"");for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c===92||c===123||c===125)o+="\\"+s[i];else if(c<128)o+=s[i];else o+="\\u"+(c>32767?c-65536:c)+"?";}return o;}
function report(){
 const a=lastRun?.freshModelAudit||{},g=lastRun?.inputs?.geometry||{},p=lastRun?.inputs?.project||{},m=lastRun?.inputs?.materials||{},loads=lastRun?.loads?.data||{},lines=["SAHROUD STEEL — گزارش محاسبات و کنترل آمادگی","تاریخ: "+(lastRun?.generatedAt||new Date().toISOString()),"پروژه: "+(p.name||"—")+" | کارفرما: "+(p.owner||"—")+" | طراح: "+(p.designer||"—")+" | شهر: "+(p.city||"—"),"دهانه: "+g.spanM+" m | طول: "+g.lengthM+" m | ارتفاع ستون: "+g.columnHeightM+" m | افزایش تاج: "+g.roofRiseM+" m | فاصله قاب: "+g.frameSpacingM+" m","تکیه‌گاه پایه: "+g.baseConnection,"مصالح: "+(m.material?.grade||"نامشخص")+" | ضخامت: "+(m.material?.thickness_mm??"—")+" mm | E: "+(m.material?.E_GPa??"—")+" GPa | Fy: "+(m.material?.Fy_MPa??"—")+" MPa | Fu: "+(m.material?.Fu_MPa??"—")+" MPa","مقطع ستون: "+(m.column?.profile||"نامشخص")+" | مقطع رفتر: "+(m.rafter?.profile||"نامشخص"),"خلاصه بارگذاری: "+compactLoadSummary(loads),"مدل: "+(lastRun?.model?.nodeCount||0)+" گره، "+(lastRun?.model?.memberCount||0)+" عضو","تعداد نتایج ترکیبات بار: "+(lastRun?.combinationResults?.length||0),"وضعیت ممیزی: "+(a.success?"موفق در کنترل‌های اجراشده":"ناقص/نیازمند بررسی"),"ممیزی مسیر کل ساختمان: "+(a.wholeBuilding?.success?"موفق":"ناقص/غیرفعال")+" | باد طولی: "+(a.longitudinalBracing?.applicable?(a.longitudinalBracing.success?"مسیر توپولوژیک برقرار":"مسیر ناقص"):"غیرفعال/غیرقابل اعمال")];
 (a.issues||[]).forEach((x,i)=>lines.push("مانع "+(i+1)+": "+x));(lastRun?.boq?.warnings||[]).forEach((x,i)=>lines.push("هشدار متره "+(i+1)+": "+x));if(lastRun?.drawings?.issue)lines.push("نقشه‌ها: "+lastRun.drawings.issue);if(lastRun?.quantityTakeoff?.status!=="calculated")lines.push("متره: "+(lastRun?.quantityTakeoff?.error||"محاسبه انجام نشده یا ماژول در دسترس نیست."));lines.push("گزارش مراحل خودکار:",lastRun?.workflowReport||"در دسترس نیست.","محدودیت‌ها:");(lastRun?.limitations||[]).forEach((x,i)=>lines.push((i+1)+". "+x));
 lines.push("این سند گزارش نرم‌افزاری مقدماتی است؛ دفترچه محاسبات نهایی و قابل مهر نیست تا همه کنترل‌های آیین‌نامه‌ای، داده‌های پروژه و بازبینی مهندس مسئول تکمیل شوند.");
 return lines.join("\n");
}
function makeRTF(s){return "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\viewkind4\\uc1\\f0\\fs22 "+s.split("\n").map(x=>"\\par "+rtf(x)).join("")+"}";}
function csvRows(){
 const d=lastRun?.boq,rows=Array.isArray(d)?d:(d?.rows||d?.items||d?.lines||[]);
 return rows.map(x=>[x.category||x.code||x.key||"",x.description||x.label||x.name||"",x.quantity??x.qty??"",x.unit||"",x.status||x.source||""]);
}
function exportFiles(){
 if(!lastRun){$("ssExportStatus").textContent="ابتدا مدل را اجرا کنید.";return;}
 const done=[];
 if($("ssOutReport").checked){download("SAHROUD-STEEL-Calculation-Report.rtf",makeRTF(report()),"application/rtf;charset=utf-8");done.push("گزارش RTF قابل بازشدن در Word");}
 if($("ssOutJSON").checked){download("SAHROUD-STEEL-Project-Package.json",JSON.stringify(lastRun,null,2),"application/json;charset=utf-8");done.push("بسته JSON");}
 if($("ssOutBOQ").checked){const snap=lastRun.boq,rows=csvRows();if(snap?.rows?.length&&window.SteelProjectBOQ?.csv){download("SAHROUD-STEEL-BOQ.csv",window.SteelProjectBOQ.csv(snap),"text/csv;charset=utf-8");done.push("متره CSV");}else if(rows.length){const q=x=>'"'+String(x??"").replace(/"/g,'""')+'"';download("SAHROUD-STEEL-BOQ.csv","\uFEFF"+[["بخش","شرح","مقدار","واحد","وضعیت"],...rows].map(r=>r.map(q).join(",")).join("\r\n"),"text/csv;charset=utf-8");done.push("متره CSV");}else done.push("متره هنوز خروجی قابل استخراج ندارد");}
 if($("ssOutCode").checked){download("SAHROUD-STEEL-Code-Readiness.rtf",makeRTF(report()),"application/rtf;charset=utf-8");done.push("گزارش ضوابط RTF");}
 if($("ssOutDrawings").checked){if(drawings?.success){printDrawings();done.push("پنجره چاپ نقشه‌های موجود؛ مقصد Save as PDF را انتخاب کنید");}else done.push("نقشه‌ها صادر نشد: "+(drawings?.issue||"ساخت نقشه موفق نبوده است."));}
 if($("ssOutPDF").checked){printReport();done.push("پنجره چاپ گزارش؛ گزینه Save as PDF را انتخاب کنید");}
 $("ssExportStatus").textContent=done.join("؛ ");
}
function printReport(){const w=window.open("","_blank");if(!w)throw Error("پنجره چاپ مسدود شده است.");const s=report().replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>SAHROUD STEEL</title><style>body{font:14px Tahoma;line-height:2;margin:22mm;white-space:pre-wrap}</style><h2>SAHROUD STEEL</h2>'+s+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),300);}
function printDrawings(){
 try{
  if(!lastRun||!drawings?.success)throw Error("نقشه معتبر از اجرای جاری در دسترس نیست؛ ابتدا اجرای مدل و تولید موفق نقشه‌ها را انجام دهید.");
  const b=$("btnPrintConstructionDrawings");if(!b)throw Error("دکمه چاپ نقشه در دسترس نیست.");
  b.click();
 }catch(e){alert(e.message||String(e));}
}
window.SteelProjectWorkspace={run,getLast:()=>lastRun,readInputs:read,exportSelected:exportFiles,validateInputObject,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{addStyle();ui();});else{addStyle();ui();}
})();

/* ===== steel2/js/home-workflow.js ===== */
/* SAHROUD STEEL — compact home workflow
   Core intake and preview stay visible; advanced panels are grouped without deleting their controls. */
(function () {
  "use strict";

  function compactPanels() {
    const main = document.querySelector("main");
    const setup = document.getElementById("projectSetupPanel");
    const drawing = document.getElementById("frameDrawing")?.closest(".panel");
    const gallery = document.getElementById("structureViewsPanel");
    if (!main || !setup || !drawing || !gallery) return;

    let shell = document.getElementById("homeAdvancedTools");
    if (!shell) {
      shell = document.createElement("section");
      shell.className = "panel home-advanced-tools";
      shell.id = "homeAdvancedTools";
      shell.innerHTML = '<details><summary>بخش‌های تخصصی و آزمایش‌ها — بارگذاری، تحلیل، طراحی اعضا، جرثقیل و گزارش‌ها</summary><div id="homeAdvancedContent"></div></details>';
      gallery.insertAdjacentElement("afterend", shell);
    }
    const content = document.getElementById("homeAdvancedContent");
    if (!content) return;

    Array.from(main.querySelectorAll(":scope > .panel")).forEach(panel => {
      if (panel === setup || panel === drawing || panel === gallery || panel === shell) return;
      content.appendChild(panel);
    });

    if (!shell.dataset.watchPanels) {
      shell.dataset.watchPanels = "1";
      const observer = new MutationObserver(() => {
        Array.from(main.querySelectorAll(".panel")).forEach(panel => {
          if (panel === setup || panel === drawing || panel === gallery || panel === shell) return;
          if (!content.contains(panel)) content.appendChild(panel);
        });
      });
      observer.observe(main, { childList: true, subtree: true });
    }
  }

  function init() {
    compactPanels();

    const start = document.getElementById("btnBuildModelFromHome");
    if (!start || start.dataset.bound === "1") return;
    start.dataset.bound = "1";
    let running = false;

    start.addEventListener("click", function () {
      if (running) return;
      const status = document.getElementById("homeWorkflowStatus");
      const setStatus = message => { if (status) status.textContent = message; };

      if (document.getElementById("structuralSystem")?.value === "portal-single-slope") {
        setStatus("مدل سه‌بعدی سقف تک‌شیب هنوز آماده نیست؛ فعلاً فقط پیش‌نمایش دوبعدی قابل مشاهده است.");
        return;
      }

      const project = window.SteelProject;
      if (!project || typeof project.validate !== "function") {
        setStatus("ماژول ثبت پروژه هنوز بارگذاری نشده است؛ چند لحظه صبر کنید و دوباره بزنید.");
        return;
      }
      const error = project.validate();
      if (error) {
        setStatus("ورودی ناقص یا نامعتبر: " + error);
        document.getElementById("projectSetupPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const apply = document.getElementById("btnApplyProjectSetup");
      const build = document.getElementById("btnBuildFullModel");
      if (!apply || !build) {
        setStatus("دکمه‌های ثبت پروژه یا ساخت مدل هنوز آماده نشده‌اند؛ صفحه را یک بار تازه‌سازی کنید.");
        return;
      }

      running = true;
      start.disabled = true;
      setStatus("در حال ثبت مشخصات و ذخیره پروژه…");
      apply.click();
      setStatus("مشخصات ثبت شد؛ ساخت گره‌ها، قاب‌ها، پرلین‌ها و مهاربندها آغاز می‌شود…");
      build.click();

      window.setTimeout(function () {
        const model = window.SteelStructuralModel?.model;
        const summary = document.getElementById("fullModelSummary");
        if (model && model.nodes?.length && model.members?.length) {
          window.SteelStructureViewGallery?.update?.();
          const galleryPanel = document.getElementById("structureViewsPanel");
          const galleryDetails = galleryPanel?.querySelector(":scope > details");
          if (galleryDetails) galleryDetails.open = true;
          setStatus("مدل هندسی ساخته شد: " + model.nodes.length + " گره و " + model.members.length + " عضو. نماها در بخش گالری باز شدند.");
          galleryPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          const message = summary?.textContent?.trim();
          setStatus(message || "مدل ساخته نشد؛ پیام خطا را در بخش تخصصی مدل هندسی بررسی کنید.");
        }
        running = false;
        start.disabled = false;
      }, 700);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

