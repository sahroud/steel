/* SAHROUD STEEL — foundation reaction takeoff
 * Extracts support actions from the latest 3D analysis and calculates only user-dimensioned
 * preliminary quantities. It does NOT design footings, reinforcement, anchors or soil bearing.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const keys=["footingWidthM","footingLengthM","footingThicknessM","pedestalWidthM","pedestalLengthM","pedestalHeightM","excavationDepthM","workingSpaceM","anchorsPerBase"];
 const state={footingWidthM:"",footingLengthM:"",footingThicknessM:"",pedestalWidthM:"",pedestalLengthM:"",pedestalHeightM:"",excavationDepthM:"",workingSpaceM:"",anchorsPerBase:""};
 const map={footingWidthM:"ftWidth",footingLengthM:"ftLength",footingThicknessM:"ftThickness",pedestalWidthM:"ftPedWidth",pedestalLengthM:"ftPedLength",pedestalHeightM:"ftPedHeight",excavationDepthM:"ftExcDepth",workingSpaceM:"ftWorking",anchorsPerBase:"ftAnchors"};
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
   '<div class="field"><label for="ftAnchors">تعداد بولت در هر پایه</label><input id="ftAnchors" type="number" min="0" step="1"></div></div>'+
   '<div class="button-grid"><button id="btnFoundationReactions" class="btn primary" type="button">استخراج واکنش‌های آخرین تحلیل</button><button id="btnFoundationQuantities" class="btn secondary" type="button">محاسبه متره هندسی فونداسیون</button><button id="btnFoundationCSV" class="btn secondary" type="button" disabled>خروجی CSV واکنش و متره</button></div>'+
   '<div id="foundationTakeoffSummary" class="notice">هنوز واکنش تحلیل سه‌بعدی استخراج نشده است.</div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:920px"><thead><tr><th>گره پایه</th><th>مختصات X/Z (متر)</th><th>Fx (kN)</th><th>Fy (kN)</th><th>Fz (kN)</th><th>Mx (kN.m)</th><th>My (kN.m)</th><th>Mz (kN.m)</th></tr></thead><tbody id="foundationReactionRows"></tbody></table></div>'+
   '<div id="foundationQuantitySummary" class="notice">برای متره، ابعاد واقعی پی را وارد کنید.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  keys.forEach(k=>{const el=$(map[k]);if(el){el.value=state[k]??"";el.addEventListener("change",()=>{state[k]=el.value;});}});
  $("btnFoundationReactions").addEventListener("click",extract);
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
  const q={baseCount:count,footingConcreteM3:footingConcrete,pedestalConcreteM3:pedComplete?pedConcrete:null,totalConcreteM3:pedComplete?footingConcrete+pedConcrete:footingConcrete,excavationM3:excavation,sideFormworkM2:formFoot+formPed,anchorsCount:anchors,dimensions:{w,l,t,pw:pw||null,pl:pl||null,ph:ph||null,excavationDepthM:excavationDepth,workingSpaceM:clearance}};
  lastReport.quantities=q;
  window.SteelCostEstimate?.refreshFromFoundation?.(q);
  $("foundationQuantitySummary").textContent="تعداد پی بر اساس گره‌های پایه مدل: "+count+" | بتن بدنه پی: "+fmt(footingConcrete)+" مترمکعب"+(pedComplete?" | بتن پدستال: "+fmt(pedConcrete)+" مترمکعب":" | پدستال محاسبه نشده (ابعاد کامل وارد نشده)")+" | مجموع بتن محاسبه‌شده: "+fmt(q.totalConcreteM3)+" مترمکعب"+(excavation!==null?" | خاکبرداری هندسی: "+fmt(excavation)+" مترمکعب":" | خاکبرداری محاسبه نشده؛ عمق و فضای کار را وارد کنید")+" | سطح جانبی قالب: "+fmt(formFoot+formPed)+" مترمربع"+(anchors!==null?" | تعداد بولت بر اساس ورودی کاربر: "+anchors:" | تعداد بولت وارد نشده")+". آرماتور، بتن مگر، لایه‌های زیرسازی، شیب دیواره گود، حجم پرت و حجم خاک متورم در این متره نیستند.";
 }
 function exportCSV(){
  if(!lastReport)return;
  readInputs();quantify();
  const lines=[["نوع گزارش","واکنش و متره مقدماتی فونداسیون"],["حالت بار",lastReport.loadCase],["نوع تکیه‌گاه",lastReport.supportType],["گره","X (m)","Z (m)","Fx (kN)","Fy (kN)","Fz (kN)","Mx (kN.m)","My (kN.m)","Mz (kN.m)"],...lastReport.rows.map(r=>[r.nodeId,r.x,r.z,...r.values.slice(0,3).map(v=>v/1000),...r.values.slice(3,6).map(v=>v/1e6)])];
  if(lastReport.quantities){const q=lastReport.quantities;lines.push(["تعداد پی",q.baseCount],["بتن پی (m3)",q.footingConcreteM3],["بتن پدستال (m3)",q.pedestalConcreteM3??"نامشخص"],["مجموع بتن (m3)",q.totalConcreteM3],["خاکبرداری (m3)",q.excavationM3??"نامشخص"],["قالب جانبی (m2)",q.sideFormworkM2],["تعداد بولت",q.anchorsCount??"نامشخص"]);}
  const csv="\uFEFF"+lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Foundation-Takeoff.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){readInputs();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;keys.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];const el=$(map[k]);if(el)el.value=state[k]??"";});}
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelFoundationTakeoff={getData,setData,extract,quantify,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
})();