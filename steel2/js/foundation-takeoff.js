/* SAHROUD STEEL — foundation reaction takeoff
 * Extracts support actions from the latest 3D analysis and calculates only user-dimensioned
 * preliminary quantities. It does NOT design footings, reinforcement, anchors or soil bearing.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const keys=["footingWidthM","footingLengthM","footingThicknessM","pedestalWidthM","pedestalLengthM","pedestalHeightM","excavationDepthM","workingSpaceM","anchorsPerBase","tieCount","tieTotalLengthM","tieWidthM","tieHeightM","tieRebarKgPerM"];
 const state={footingWidthM:"",footingLengthM:"",footingThicknessM:"",pedestalWidthM:"",pedestalLengthM:"",pedestalHeightM:"",excavationDepthM:"",workingSpaceM:"",anchorsPerBase:"",tieCount:"",tieTotalLengthM:"",tieWidthM:"",tieHeightM:"",tieRebarKgPerM:""};
 const map={footingWidthM:"ftWidth",footingLengthM:"ftLength",footingThicknessM:"ftThickness",pedestalWidthM:"ftPedWidth",pedestalLengthM:"ftPedLength",pedestalHeightM:"ftPedHeight",excavationDepthM:"ftExcDepth",workingSpaceM:"ftWorking",anchorsPerBase:"ftAnchors",tieCount:"ftTieCount",tieTotalLengthM:"ftTieLength",tieWidthM:"ftTieWidth",tieHeightM:"ftTieHeight",tieRebarKgPerM:"ftTieRebar"};
 const fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:3});
 const num=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
 let lastReport=null;
 function panel(){
  if($("foundationTakeoffPanel"))return;
  const root=$("costEstimatePanel")||$("quantityTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="foundationTakeoffPanel";
  p.innerHTML='<div class="panel-title"><h3>متره فونداسیون بر اساس واکنش‌های تحلیل سه‌بعدی</h3><span class="status">استخراج نیرو؛ نه طراحی پی</span></div>'+
   '<div class="notice">ابتدا تحلیل سه‌بعدی موردنظر را اجرا کنید؛ سپس واکنش‌های گره‌های پایه از همان حالت بار استخراج می‌شوند. ابعاد پی باید پس از طراحی ژئوتکنیکی و سازه‌ای وارد شوند. این بخش فعلاً واکنش‌ها و مقادیر هندسیِ مبتنی بر ابعاد واردشده را گزارش می‌کند و ظرفیت خاک، برون‌مرکزی، لغزش، واژگونی، پانچ، برش یک‌طرفه، آرماتور و بولت را طراحی یا تأیید نمی‌کند.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="ftWidth">عرض پی در راستای X (متر)</label><input id="ftWidth" type="number" min="0" step="0.05" placeholder="پس از طراحی وارد شود"></div>'+
   '<div class="field"><label for="ftLength">طول پی در راستای Z (متر)</label><input id="ftLength" type="number" min="0" step="0.05" placeholder="پس از طراحی وارد شود"></div>'+
   '<div class="field"><label for="ftThickness">ضخامت پی (متر)</label><input id="ftThickness" type="number" min="0" step="0.05" placeholder="پس از طراحی وارد شود"></div>'+
   '<div class="field"><label for="ftPedWidth">عرض پدستال (متر؛ اختیاری)</label><input id="ftPedWidth" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftPedLength">طول پدستال (متر؛ اختیاری)</label><input id="ftPedLength" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftPedHeight">ارتفاع پدستال (متر؛ اختیاری)</label><input id="ftPedHeight" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftExcDepth">عمق خاکبرداری (متر)</label><input id="ftExcDepth" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftWorking">فضای کار خاکبرداری هر طرف (متر)</label><input id="ftWorking" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftAnchors">تعداد بولت در هر پایه</label><input id="ftAnchors" type="number" min="0" step="1"></div>'+
   '<div class="notice">متره شناژهای رابط — مقادیر را از نقشه فونداسیون وارد کنید؛ نرم‌افزار مسیر شناژ را حدس نمی‌زند.</div>'+
   '<div class="field"><label for="ftTieCount">تعداد شناژها</label><input id="ftTieCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="ftTieLength">مجموع طول شناژها (متر)</label><input id="ftTieLength" type="number" min="0" step="0.1" placeholder="جمع طول محور یا طول اجرایی"></div>'+
   '<div class="field"><label for="ftTieWidth">عرض شناژ (متر)</label><input id="ftTieWidth" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftTieHeight">ارتفاع شناژ (متر)</label><input id="ftTieHeight" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftTieRebar">وزن آرماتور شناژ (کیلوگرم بر متر؛ اختیاری)</label><input id="ftTieRebar" type="number" min="0" step="0.1" placeholder="از جدول آرماتوربندی"></div></div>'+
   '<div class="button-grid"><button id="btnFoundationReactions" class="btn secondary" type="button">استخراج واکنش یک حالت بار</button><button id="btnFoundationEnvelope" class="btn primary" type="button">تحلیل پوش واکنش همه ترکیبات مقدماتی</button><button id="btnFoundationQuantities" class="btn secondary" type="button">محاسبه متره هندسی فونداسیون</button><button id="btnFoundationCSV" class="btn secondary" type="button" disabled>خروجی CSV واکنش و متره</button></div>'+
   '<div id="foundationTakeoffSummary" class="notice">هنوز واکنش تحلیل سه‌بعدی استخراج نشده است.</div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:920px"><thead><tr><th>گره پایه</th><th>مختصات X/Z (متر)</th><th>Fx min/max (kN)</th><th>Fy min/max (kN)</th><th>Fz min/max (kN)</th><th>Mx min/max (kN.m)</th><th>My min/max (kN.m)</th><th>Mz min/max (kN.m)</th></tr></thead><tbody id="foundationReactionRows"></tbody></table></div>'+
   '<div id="foundationQuantitySummary" class="notice">برای متره، ابعاد واقعی پی را وارد کنید.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  keys.forEach(k=>{const el=$(map[k]);if(el){el.value=state[k]??"";el.addEventListener("change",()=>{state[k]=el.value;});}});
  $("btnFoundationReactions").addEventListener("click",extract);
  $("btnFoundationEnvelope").addEventListener("click",extractEnvelope);
  $("btnFoundationQuantities").addEventListener("click",quantify);
  $("btnFoundationCSV").addEventListener("click",exportCSV);
 }
 function readInputs(){keys.forEach(k=>{const el=$(map[k]);if(el)state[k]=el.value;});}
 function modelFingerprint(model){
  return JSON.stringify({
   nodes:(model.nodes||[]).map(n=>[n.id,n.x,n.y,n.z,n.kind]),
   members:(model.members||[]).map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),
   sections:window.SteelSections?.read?.()||null,
   support:$("baseConnection")?.value||"pinned"
  });
 }
 function extract(){
  const sm=window.SteelStructuralModel,result=sm?.last3DResult,model=sm?.model;
  if(!result||!Array.isArray(result.reactions)||!model||!Array.isArray(model.nodes)){
   $("foundationTakeoffSummary").textContent="نتیجه تحلیل سه‌بعدی در دسترس نیست. ابتدا مدل را بسازید و تحلیل سه‌بعدی را با موفقیت اجرا کنید.";return;
  }
  if(!result.foundationModelFingerprint||result.foundationModelFingerprint!==modelFingerprint(model)){
   $("foundationTakeoffSummary").textContent="مدل، مقاطع یا بارها پس از آخرین تحلیل تغییر کرده‌اند (یا نتیجه با نسخه قدیمی حل‌گر تولید شده است). برای جلوگیری از متره اشتباه، ابتدا تحلیل سه‌بعدی را دوباره اجرا کنید.";
   return;
  }
  const reactionMap=new Map(result.reactions.map(r=>[r.nodeId,r]));
  const rows=model.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>{
   const r=reactionMap.get(n.id);
   return {nodeId:n.id,x:Number(n.x)||0,z:Number(n.z)||0,kind:n.kind,hasReaction:!!r,values:r?(r.values||[]).slice(0,6).map(v=>Number(v)||0):[0,0,0,0,0,0]};
  }).sort((a,b)=>a.z-b.z||a.x-b.x);
  if(!rows.length){$("foundationTakeoffSummary").textContent="هیچ گره پایه‌ای در مدل هندسی پیدا نشد؛ ساخت مدل و نوع تکیه‌گاه را بررسی کنید.";return;}
  const body=$("foundationReactionRows");body.replaceChildren();
  rows.forEach(row=>{const tr=document.createElement("tr");const vals=[row.nodeId,fmt(row.x)+" / "+fmt(row.z),...row.values.slice(0,3).map(v=>fmt(v/1000)),...row.values.slice(3,6).map(v=>fmt(v/1e6))];vals.forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  const sum=[0,0,0,0,0,0];rows.forEach(x=>x.values.forEach((v,i)=>sum[i]+=v));
  lastReport={generatedAt:new Date().toISOString(),loadCase:result.loadCaseLabel||result.loadCase||"نامشخص",supportType:result.supportType||"نامشخص",units:"kN,kN.m",rows,total:sum.map((v,i)=>v/(i<3?1000:1e6)),equilibrium:result.equilibrium||null,quantities:null};
  $("foundationTakeoffSummary").textContent="حالت بار تحلیل‌شده: "+lastReport.loadCase+" | نوع تکیه‌گاه: "+lastReport.supportType+" | تعداد کل پایه‌های مدل: "+rows.length+" | پایه‌های دارای واکنش غیرصفر: "+rows.filter(x=>x.hasReaction).length+" | مختصات بر حسب متر؛ نیرو kN و لنگر kN.m. جمع واکنش‌ها: Fx "+fmt(sum[0]/1000)+", Fy "+fmt(sum[1]/1000)+", Fz "+fmt(sum[2]/1000)+" kN. این جمع فقط مربوط به همین حالت بار است؛ برای طراحی پی باید همه ترکیبات بار و پوش نیروها بررسی شوند.";
  $("btnFoundationCSV").disabled=false;
  quantify();
 }
 async function extractEnvelope(){
  const button=$("btnFoundationEnvelope"),summary=$("foundationTakeoffSummary");
  if(!window.SteelStructuralModel?.analyzeFoundationEnvelope){summary.textContent="تابع تحلیل پوش در این نسخه حل‌گر موجود نیست؛ صفحه را پس از انتشار نسخه جدید دوباره بارگذاری کنید.";return;}
  button.disabled=true;summary.textContent="در حال اجرای متوالی تحلیل‌های ترکیبی؛ لطفاً صفحه را نبندید…";
  try{
   const sm=window.SteelStructuralModel,model=sm.model||sm.build();
   const env=await sm.analyzeFoundationEnvelope();
   if(!env||!Array.isArray(env.rows)||!env.rows.length)throw new Error("پوش واکنش معتبری دریافت نشد.");
   if(env.foundationModelFingerprint!==modelFingerprint(model))throw new Error("مدل یا مقاطع هنگام تحلیل تغییر کرده‌اند؛ پوش برای جلوگیری از استفاده اشتباه رد شد.");
   const body=$("foundationReactionRows");body.replaceChildren();
   const fmtPair=(e,k)=>{const scale=k<3?1000:1e6;return fmt(e.min/scale)+" / "+fmt(e.max/scale);};
   const rows=env.rows.map(row=>{
    const tr=document.createElement("tr");
    [row.nodeId,fmt(row.x)+" / "+fmt(row.z),...row.envelopes.map((e,k)=>fmtPair(e,k))].forEach((v,i)=>{const td=document.createElement("td");td.textContent=v;if(i>=2){const e=row.envelopes[i-2];td.title="کمینه: "+e.minCase+" | بیشینه: "+e.maxCase;}tr.appendChild(td);});
    body.appendChild(tr);
    return {...row,values:row.envelopes.map(e=>Math.abs(e.min)>Math.abs(e.max)?e.min:e.max)};
   });
   lastReport={generatedAt:env.generatedAt,loadCase:"پوش مقدماتی "+env.cases.length+" حالت بار",supportType:env.supportType,units:"kN,kN.m",rows,total:null,equilibrium:env.cases.map(x=>x.equilibrium),cases:env.cases,windCasesIncluded:env.windCasesIncluded,limitations:env.limitations,quantities:null};
   const eqBad=env.cases.filter(x=>x.equilibrium&&!x.equilibrium.ok).length;
   summary.textContent="پوش مقدماتی استخراج شد: "+env.cases.length+" حالت بار، "+rows.length+" گره پایه. "+(env.windCasesIncluded?"باد مثبت و منفی با ضریب ۱٫۰ نیز بررسی شده است. ":"ورودی باد غیرصفر شناسایی نشد؛ فقط ترکیبات ثقلی اجرا شدند. ")+(eqBad?"هشدار: کنترل تعادل در "+eqBad+" حالت برقرار نیست. ":"کنترل تعادل در حالت‌های گزارش‌شده برقرار است. ")+"برای هر مؤلفه، کمینه و بیشینه با نام حالت حاکم در خروجی CSV ذخیره می‌شود. این پوش مقدماتی و غیرقابل استفاده به‌عنوان ترکیبات نهایی آیین‌نامه‌ای است.";
   $("btnFoundationCSV").disabled=false;quantify();
  }catch(e){summary.textContent="استخراج پوش واکنش ناموفق بود: "+e.message;}
  finally{button.disabled=false;}
 }
 function quantify(){
  readInputs();
  const count=lastReport?.rows?.length||0,w=num(state.footingWidthM),l=num(state.footingLengthM),t=num(state.footingThicknessM);
  if(!lastReport){$("foundationQuantitySummary").textContent="ابتدا واکنش‌های آخرین تحلیل را استخراج کنید تا تعداد پی‌ها مشخص شود.";return;}
  if(!count||!w||!l||!t){$("foundationQuantitySummary").textContent="برای محاسبه حجم بتن، عرض، طول و ضخامت واقعی پی را وارد کنید. هیچ ابعادی به‌صورت پیش‌فرض فرض نشده است.";return;}
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM);
  const pedComplete=pw&&pl&&ph,footingConcrete=count*w*l*t,pedConcrete=pedComplete?count*pw*pl*ph:0;
  const excavationDepth=num(state.excavationDepthM),clearance=state.workingSpaceM===""?null:Number(state.workingSpaceM);
  const excavation=excavationDepth!==null&&clearance!==null&&clearance>=0?count*(w+2*clearance)*(l+2*clearance)*excavationDepth:null;
  const formFoot=count*2*(w+l)*t,formPed=pedComplete?count*2*(pw+pl)*ph:0;
  const anchors=state.anchorsPerBase!==""&&Number.isInteger(Number(state.anchorsPerBase))&&Number(state.anchorsPerBase)>=0?count*Number(state.anchorsPerBase):null;
  const tieCount=state.tieCount!==""&&Number.isInteger(Number(state.tieCount))&&Number(state.tieCount)>=0?Number(state.tieCount):null;
  const tieLength=state.tieTotalLengthM!==""&&Number(state.tieTotalLengthM)>=0?Number(state.tieTotalLengthM):null;
  const tw=num(state.tieWidthM),th=num(state.tieHeightM),tieSectionComplete=!!(tw&&th&&tieLength!==null);
  const tieConcrete=tieSectionComplete?tieLength*tw*th:null;
  const tieReady=tieConcrete!==null;
  const tieFormwork=tieSectionComplete?tieLength*2*th:null;
  const tieRebar=tieSectionComplete&&state.tieRebarKgPerM!==""&&Number(state.tieRebarKgPerM)>=0?tieLength*Number(state.tieRebarKgPerM):null;
  const totalConcrete=footingConcrete+(pedComplete?pedConcrete:0)+(tieConcrete!==null?tieConcrete:0);
  const totalFormwork=formFoot+formPed+(tieFormwork!==null?tieFormwork:0);
  const q={baseCount:count,footingConcreteM3:footingConcrete,pedestalConcreteM3:pedComplete?pedConcrete:null,tieCount,tieTotalLengthM:tieLength,tieConcreteM3:tieConcrete,tieSideFormworkM2:tieFormwork,tieRebarKg:tieRebar,totalConcreteM3:totalConcrete,excavationM3:excavation,sideFormworkM2:totalFormwork,anchorsCount:anchors,dimensions:{w,l,t,pw:pw||null,pl:pl||null,ph:ph||null,excavationDepthM:excavationDepth,workingSpaceM:clearance,tieWidthM:tw||null,tieHeightM:th||null}};
  lastReport.quantities=q;
  window.SteelCostEstimate?.refreshFromFoundation?.(q);
  $("foundationQuantitySummary").textContent="تعداد پی: "+count+" | بتن پی: "+fmt(footingConcrete)+" م³"+(pedComplete?" | بتن پدستال: "+fmt(pedConcrete)+" م³":" | پدستال: ابعاد کامل وارد نشده")+(tieReady?" | شناژها: "+fmt(tieLength)+" متر طول، "+fmt(tieConcrete)+" م³ بتن، "+fmt(tieFormwork)+" م² قالب جانبی"+(tieRebar!==null?"، "+fmt(tieRebar)+" کیلوگرم آرماتور بر اساس وزن واحد واردشده":"، آرماتور شناژ محاسبه نشده"):" | شناژها هنوز متره نشده‌اند؛ تعداد، طول کل، عرض و ارتفاع را از نقشه وارد کنید")+" | مجموع بتن پی، پدستال و شناژِ محاسبه‌شده: "+fmt(q.totalConcreteM3)+" م³"+(excavation!==null?" | خاکبرداری هندسی: "+fmt(excavation)+" م³":" | خاکبرداری محاسبه نشده؛ عمق و فضای کار را وارد کنید")+" | قالب جانبی کلِ محاسبه‌شده: "+fmt(totalFormwork)+" م²"+(anchors!==null?" | تعداد بولت: "+anchors:" | تعداد بولت وارد نشده")+". قالب کف شناژ، وصله/خم میلگرد، بتن مگر، پرت، خاک متورم و اصلاح حجم خاکبرداری در این محاسبه نیستند. مقدار شناژ بر اساس ورودی نقشه است، نه تشخیص خودکار مسیر.";
 }
 function exportCSV(){
  if(!lastReport)return;
  readInputs();quantify();
  const lines=[["نوع گزارش","واکنش و متره مقدماتی فونداسیون"],["حالت بار",lastReport.loadCase],["نوع تکیه‌گاه",lastReport.supportType]];
  if(lastReport.rows.some(r=>Array.isArray(r.envelopes))){lines.push(["گره","X (m)","Z (m)",...["Fx","Fy","Fz"].map(x=>x+" min (kN)"),...["Fx","Fy","Fz"].map(x=>x+" max (kN)"),...["Mx","My","Mz"].map(x=>x+" min (kN.m)"),...["Mx","My","Mz"].map(x=>x+" max (kN.m)")]);lastReport.rows.forEach(r=>lines.push([r.nodeId,r.x,r.z,...r.envelopes.slice(0,3).map(e=>e.min/1000),...r.envelopes.slice(0,3).map(e=>e.max/1000),...r.envelopes.slice(3).map(e=>e.min/1e6),...r.envelopes.slice(3).map(e=>e.max/1e6)]));}
  else{lines.push(["گره","X (m)","Z (m)","Fx (kN)","Fy (kN)","Fz (kN)","Mx (kN.m)","My (kN.m)","Mz (kN.m)"],...lastReport.rows.map(r=>[r.nodeId,r.x,r.z,...r.values.slice(0,3).map(v=>v/1000),...r.values.slice(3,6).map(v=>v/1e6)]));}
  if(lastReport.quantities){const q=lastReport.quantities;lines.push(["تعداد پی",q.baseCount],["بتن پی (m3)",q.footingConcreteM3],["بتن پدستال (m3)",q.pedestalConcreteM3??"نامشخص"],["مجموع بتن (m3)",q.totalConcreteM3],["خاکبرداری (m3)",q.excavationM3??"نامشخص"],["بتن شناژ (m3)",q.tieConcreteM3??"نامشخص"],["طول کل شناژ (m)",q.tieTotalLengthM??"نامشخص"],["تعداد شناژ",q.tieCount??"نامشخص"],["قالب جانبی شناژ (m2)",q.tieSideFormworkM2??"نامشخص"],["آرماتور شناژ (kg)",q.tieRebarKg??"نامشخص"],["قالب جانبی کل (m2)",q.sideFormworkM2],["تعداد بولت",q.anchorsCount??"نامشخص"]);}
  const csv="\uFEFF"+lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Foundation-Takeoff.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){readInputs();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;keys.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];const el=$(map[k]);if(el)el.value=state[k]??"";});}
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelFoundationTakeoff={getData,setData,extract,quantify,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
})();