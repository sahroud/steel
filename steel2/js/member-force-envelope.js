/* SAHROUD STEEL — member force envelope from the shared 3D model.
 * Reports simultaneous local end-force components per member and load case.
 * It deliberately does not claim code capacity or member adequacy.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
let last=null;
const groups=[
 ["all","همه اعضا"],["column","ستون‌ها"],["rafter","رفترها"],["roofPurlin","پرلین‌های سقف"],
 ["wallGirt","قیدهای دیوار"],["endPost","ستونک‌های انتهایی"],["endGirt","تیرهای انتهایی"],
 ["roofBrace","مهاربندهای سقف"],["wallBrace","مهاربندهای دیوار"]
];
const names=Object.fromEntries(groups);
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cases(){
 const combos=window.SteelLoads?.getData?.().combinations;
 if(!Array.isArray(combos)||!combos.length)throw Error("ترکیبات بار در دسترس نیستند.");
 const out=combos.map((c,i)=>({label:String(c.name||("ترکیب "+(i+1)),),factors:{dead:Number(c.dead)||0,live:Number(c.live)||0,snow:Number(c.snow)||0,wind:Number(c.wind)||0}}));
 const model=window.SteelStructuralModel?.getData?.();
 const hasWind=(model?.members||[]).some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
 if(hasWind)combos.forEach((c,i)=>[1,-1].forEach(sign=>out.push({label:String(c.name||("ترکیب "+(i+1)))+" + باد "+(sign>0?"مثبت":"منفی"),factors:{dead:Number(c.dead)||0,live:Number(c.live)||0,snow:Number(c.snow)||0,wind:1},windSign:sign})));
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
  if(!byId.has(String(m.id))){const meta=metaById.get(String(m.id))||{};byId.set(String(m.id),{id:m.id,type:m.type||meta.type||"",sectionKey:meta.sectionKey||m.sectionKey||"",length:Number(m.length||meta.length)||null,ends:[]});}
  const row=byId.get(String(m.id));
  row.ends.push({label:sample.label,values:Array.isArray(m.localEndForces)?m.localEndForces.slice(0,12):[]});
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
  return {...row,envelopes,peak,caseCount:valid.length};
 }).sort((a,b)=>String(a.sectionKey).localeCompare(String(b.sectionKey))||String(a.id).localeCompare(String(b.id)));
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
   samples.push({label:s.label,members:result.members,equilibrium:result.equilibrium});
   box.textContent="تحلیل "+(i+1)+" از "+specs.length+" — "+s.label;
  }
  const rows=buildRows(model,samples);
  const bad=samples.filter(s=>!s.equilibrium?.ok);
  last={generatedAt:new Date().toISOString(),units:"N,N.m",cases:samples.map(s=>({label:s.label,equilibrium:s.equilibrium})),members:rows,memberCount:rows.length,allCasesEquilibriumOK:bad.length===0,limitations:["این خروجی تقاضای نیروهای انتهایی محلی اعضا در تحلیل خطی مرتبه اول است؛ ظرفیت یا نسبت بهره‌برداری آیین‌نامه‌ای محاسبه نمی‌شود.","ترکیبات فقط از فهرست فعلی پروژه و باد مثبت/منفی با ضریب ۱ در صورت وجود بار باد ساخته شده‌اند؛ کامل بودن ترکیبات آیین‌نامه‌ای تضمین نشده است.","کمانش، P-Delta، کمانش پیچشی-جانبی، اندرکنش نیروها، طبقه‌بندی مقطع و کنترل خیز/ارتعاش در این گزارش انجام نشده‌اند.","علامت و محورهای محلی اعضا باید با جهت‌گیری هندسی و خروجی نرم‌افزار تحلیل مستقل کنترل شوند."]};
  render();
 }catch(e){box.textContent="خطا: "+e.message;}
 finally{btn.disabled=false;}
}
function render(){
 const filter=$("memberForceGroup")?.value||"all",rows=(last?.members||[]).filter(r=>filter==="all"||r.sectionKey===filter);
 const body=$("memberForceRows");
 body.innerHTML=rows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.sectionKey)+'</td><td>'+fmt(r.length||0)+'</td><td>'+fmt(r.peak.N/1000)+'</td><td>'+fmt(r.peak.Vy/1000)+'</td><td>'+fmt(r.peak.Vz/1000)+'</td><td>'+fmt(r.peak.My/1e6)+'</td><td>'+fmt(r.peak.Mz/1e6)+'</td><td>'+r.caseCount+'</td></tr>').join("")||'<tr><td colspan="9">عضوی برای این گروه پیدا نشد.</td></tr>';
 const eq=last.allCasesEquilibriumOK?"تعادل همه تحلیل‌ها برقرار است":"هشدار: در برخی تحلیل‌ها تعادل عددی برقرار نیست";
 $("memberForceSummary").textContent="اعضا: "+last.memberCount+" | حالت‌های بار: "+last.cases.length+" | "+eq+" | نیرو: kN، لنگر: kN.m. مقادیر جدول بیشینه قدرمطلق هر مؤلفه‌اند و ممکن است از ترکیب‌های متفاوت باشند؛ برای طراحی اندرکنش، بردار کامل هر انتها و یک ترکیب واحد باید خوانده شود.";
 $("btnMemberForceJSON").disabled=false;
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
 '<div class="notice">برای هر عضو، خروجی JSON شامل تمام ۱۲ مؤلفه نیروی انتهایی در هر ترکیب نگهداری می‌شود. در گام بعدی همین تقاضاها به کنترل مقاومت مقاطع، کمانش و خیز متصل می‌شوند؛ تا آن زمان هیچ نسبت قبولی/ردی خودکار اعلام نمی‌شود.</div>';
 if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);
 $("btnMemberForceEnvelope").addEventListener("click",run);$("btnMemberForceJSON").addEventListener("click",exportJSON);$("memberForceGroup").addEventListener("change",()=>{if(last)render();});
}
root.SteelMemberForceEnvelope={run,getLast:()=>last};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
