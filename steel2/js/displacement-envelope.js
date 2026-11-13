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
 const out=combos.map((c,i)=>({label:String(c.name||("ترکیب "+(i+1))),factors:{dead:Number(c.dead)||0,live:Number(c.live)||0,snow:Number(c.snow)||0,wind:0}}));
 const model=window.SteelStructuralModel?.getData?.();
 const hasWind=(model?.members||[]).some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
 if(hasWind)combos.forEach((c,i)=>[1,-1].forEach(sign=>out.push({
  label:String(c.name||("ترکیب "+(i+1)))+" + باد "+(sign>0?"مثبت":"منفی"),
  factors:{dead:Number(c.dead)||0,live:Number(c.live)||0,snow:Number(c.snow)||0,wind:1},windSign:sign
 })));
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
