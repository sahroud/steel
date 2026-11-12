/* SAHROUD STEEL — preliminary uniform isolated-footing plan sizing assistant
 * Searches B x L candidates against every simultaneous compression reaction case.
 * It is a preliminary gross-bearing/full-contact size finder, not final foundation design.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 let state={minSideM:"0.8",maxSideM:"6.0",stepM:"0.1"},last=null;
 const fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:3});
 const pos=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
 function panel(){
  if($("footingSizingAssistantPanel"))return;
  const root=$("footingStructuralScreenPanel")||$("foundationTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="footingSizingAssistantPanel";
  p.innerHTML='<div class="panel-title"><h3>دستیار تعیین ابعاد اولیه پی‌های منفرد</h3><span class="status">جست‌وجوی ابعاد؛ نه طراحی نهایی</span></div>'+
   '<div class="notice">این ابزار یک ابعاد مشترک B×L برای همه پایه‌ها جست‌وجو می‌کند تا در تمام حالت‌های فشاری موجود، فشار ناخالص خطی از ظرفیت مجاز واردشده بیشتر نشود و تماس کامل برقرار بماند. ضخامت پی، ابعاد پدستال، خاک پوششی و خروج از مرکز از ورودی‌های بخش فونداسیون گرفته می‌شوند. وزن پدستال با فرض قرارگیری در محور ستون و وزن خاک پوششی با فرض توزیع متقارن لحاظ می‌شود. بالاکشیدگی، طراحی بولت، نشست، گروه پی‌ها، شناژها و کنترل سازه‌ای بتن در این جست‌وجو حل نمی‌شوند.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="fsaMin">حداقل ضلع جست‌وجو (m)</label><input id="fsaMin" type="number" min="0.3" step="0.05" value="0.8"></div>'+
   '<div class="field"><label for="fsaMax">حداکثر ضلع جست‌وجو (m)</label><input id="fsaMax" type="number" min="0.5" step="0.1" value="6.0"></div>'+
   '<div class="field"><label for="fsaStep">گام جست‌وجو (m)</label><input id="fsaStep" type="number" min="0.02" step="0.01" value="0.1"></div></div>'+
   '<div class="button-grid"><button id="btnFootingSizeSearch" class="btn primary" type="button">جست‌وجوی ابعاد پیشنهادی</button><button id="btnFootingSizeApply" class="btn secondary" type="button" disabled>اعمال ابعاد مشترک به همه پی‌ها</button><button id="btnFootingSizeCSV" class="btn secondary" type="button" disabled>دریافت CSV</button></div>'+
   '<div id="footingSizeSummary" class="notice">ظرفیت باربری مجاز ناخالص، ضخامت پی، مشخصات خاک و ابعاد پدستال را در بخش فونداسیون وارد کنید.</div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:700px"><thead><tr><th>گزینه</th><th>B در X (m)</th><th>L در Z (m)</th><th>مساحت هر پی (m²)</th><th>qmin (kPa)</th><th>qmax (kPa)</th><th>پایه/حالت حاکم</th></tr></thead><tbody id="footingSizeRows"></tbody></table></div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  $("fsaMin").value=state.minSideM;$("fsaMax").value=state.maxSideM;$("fsaStep").value=state.stepM;
  ["fsaMin","fsaMax","fsaStep"].forEach((id,i)=>$(id).addEventListener("change",()=>{state[["minSideM","maxSideM","stepM"][i]]=$(id).value;}));
  $("btnFootingSizeSearch").addEventListener("click",search);
  $("btnFootingSizeApply").addEventListener("click",apply);
  $("btnFootingSizeCSV").addEventListener("click",exportCSV);
 }
 function search(){
  const summary=$("footingSizeSummary"),body=$("footingSizeRows");body.replaceChildren();last=null;
  const report=window.SteelFoundationTakeoff?.getLast?.(),inputs=window.SteelFoundationTakeoff?.getData?.();
  if(!report?.rows?.length){summary.textContent="ابتدا پوش واکنش فونداسیون را استخراج کنید.";return;}
  const allow=pos(inputs?.soilAllowableKPa),t=pos(inputs?.footingThicknessM),gammaC=pos(inputs?.concreteUnitWeightKNm3),cx=pos(inputs?.pedestalWidthM),cz=pos(inputs?.pedestalLengthM),ph=pos(inputs?.pedestalHeightM);
  const ox=inputs?.columnOffsetXM===""?null:Number(inputs?.columnOffsetXM),oz=inputs?.columnOffsetZM===""?null:Number(inputs?.columnOffsetZM);
  const cover=inputs?.soilCoverDepthM===""?0:Number(inputs?.soilCoverDepthM),gammaS=cover>0?pos(inputs?.soilUnitWeightKNm3):0;
  if(!allow||!t||!gammaC||!cx||!cz||!ph||!Number.isFinite(ox)||!Number.isFinite(oz)||!Number.isFinite(cover)||cover<0||(cover>0&&!gammaS)){
   summary.textContent="ورودی لازم: ظرفیت باربری مجاز ناخالص، ضخامت پی، وزن مخصوص بتن، سه بعد پدستال، خروج از مرکز X و Z (برای مرکز صفر) و در صورت وجود خاک پوششی، وزن مخصوص آن.";return;
  }
  const min=pos($("fsaMin").value),max=pos($("fsaMax").value),step=pos($("fsaStep").value);
  if(!min||!max||!step||max<min||step>max-min+1e-9){summary.textContent="بازه و گام جست‌وجو نامعتبر است.";return;}
  const cases=[];
  report.rows.forEach(row=>(row.caseReactions||[]).forEach(item=>{
   const v=item.values||[],N=Number(v[1])/1000,Mx=Number(v[3])/1e6,Mz=Number(v[5])/1e6;
   if([N,Mx,Mz].every(Number.isFinite)){
    if(N>0)cases.push({nodeId:row.nodeId,label:item.label,N,Mx,Mz});
   }
  }));
  if(!cases.length){summary.textContent="هیچ حالت فشاری با واکنش قائم مثبت در پوش یافت نشد؛ علامت واکنش‌ها را با حالت بار معلوم کنترل کنید.";return;}
  const nSteps=Math.floor((max-min)/step+1e-8)+1;
  if(nSteps>120){summary.textContent="تعداد گام‌ها بیش از حد زیاد است؛ گام را بزرگ‌تر یا بازه را کوچک‌تر کنید (حداکثر ۱۲۰ مقدار برای هر ضلع).";return;}
  let best=null;
  for(let i=0;i<nSteps;i++){
   const B=Number((min+i*step).toFixed(6));
   for(let j=0;j<nSteps;j++){
    const L=Number((min+j*step).toFixed(6));
    if(Math.abs(ox)+cx/2>B/2+1e-9||Math.abs(oz)+cz/2>L/2+1e-9)continue;
    const footingW=gammaC*B*L*t,pedW=gammaC*cx*cz*ph,soilW=cover>0?gammaS*Math.max(0,B*L-cx*cz)*cover:0,added=footingW+pedW+soilW;
    let qmin=Infinity,qmax=-Infinity,governing=null,ok=true;
    for(const c of cases){
     const Ntotal=c.N+added,MxEff=c.Mx-oz*(c.N+pedW),MzEff=c.Mz+ox*(c.N+pedW);
     const avg=Ntotal/(B*L),bend=6*Math.abs(MxEff)/(B*L*L)+6*Math.abs(MzEff)/(L*B*B);
     const lo=avg-bend,hi=avg+bend;
     if(lo<qmin)qmin=lo;
     if(hi>qmax){qmax=hi;governing=c;}
     if(lo<0||hi>allow){ok=false;break;}
    }
    if(ok){const candidate={B,L,area:B*L,qminKPa:qmin,qmaxKPa:qmax,governing:governing?governing.nodeId+" / "+governing.label:"",addedWeightKN:added};if(!best||candidate.area<best.area-1e-9||(Math.abs(candidate.area-best.area)<1e-9&&Math.abs(B-L)<Math.abs(best.B-best.L)))best=candidate;}
   }
  }
  if(!best){summary.textContent="در بازه جست‌وجوی "+fmt(min)+" تا "+fmt(max)+" متر، ابعاد مشترکی که همه حالت‌های فشاری را با تماس کامل و فشار مجاز تأمین کند پیدا نشد. بازه را افزایش دهید یا داده‌های بار، خاک و خروج از مرکز را بررسی کنید. حالت‌های بالاکشیدگی جداگانه و خارج از این جست‌وجو هستند.";return;}
  last={generatedAt:new Date().toISOString(),basis:"preliminary_uniform_footing_gross_bearing_full_contact_search",best,allowableGrossKPa:allow,thicknessM:t,concreteUnitWeightKNm3:gammaC,pedestal:{widthM:cx,lengthM:cz,heightM:ph},columnOffsetXM:ox,columnOffsetZM:oz,soilCoverDepthM:cover,soilUnitWeightKNm3:gammaS||null,compressionCasesChecked:cases.length,search:{minSideM:min,maxSideM:max,stepM:step},limitations:["ابعاد مشترک برای تمام پایه‌ها جست‌وجو شده؛ پی‌های لبه/گوشه ممکن است نیازمند ابعاد جداگانه باشند.","فقط ظرفیت باربری مجاز ناخالص و تماس کامل با توزیع خطی فشار کنترل شده است.","وزن پدستال با فرض قرارگیری در محور ستون و خاک پوششی با فرض توزیع متقارن منظور شده است.","حالت‌های کششی/بالاکشیدگی از جست‌وجوی فشار حذف شده‌اند و باید جداگانه با بولت، مهار بتن و وزن‌های معتبر کنترل شوند.","نشست، لغزش، واژگونی، پانچ، برش یک‌طرفه، خمش، آرماتور، شناژ، اندرکنش گروهی و ترکیبات نهایی آیین‌نامه‌ای در این الگوریتم طراحی نمی‌شوند."]};
  const tr=document.createElement("tr");[ "بهترین گزینه",fmt(best.B),fmt(best.L),fmt(best.area),fmt(best.qminKPa),fmt(best.qmaxKPa),best.governing].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);
  summary.textContent="یک گزینه مشترک مقدماتی پیدا شد: "+fmt(best.B)+" × "+fmt(best.L)+" متر برای هر پی؛ مساحت "+fmt(best.area)+" مترمربع؛ qmax="+fmt(best.qmaxKPa)+" kPa از ظرفیت مجاز "+fmt(allow)+" kPa کمتر است و qmin="+fmt(best.qminKPa)+" kPa مثبت باقی می‌ماند. این گزینه فقط برای ادامه کنترل‌های سازه‌ای/ژئوتکنیکی است، نه نقشه اجرایی.";
  $("btnFootingSizeApply").disabled=false;$("btnFootingSizeCSV").disabled=false;
 }
 function apply(){
  if(!last?.best)return;
  const current=window.SteelFoundationTakeoff?.getData?.();if(!current)return;
  window.SteelFoundationTakeoff.setData({...current,footingWidthM:String(last.best.B),footingLengthM:String(last.best.L)});
  window.SteelFoundationTakeoff.quantify?.();
  const box=$("footingSizeSummary");if(box)box.textContent+=" ابعاد مشترک به ورودی متره فونداسیون اعمال شد؛ کنترل‌های بعدی را دوباره اجرا کنید.";
 }
 function exportCSV(){
  if(!last)search();if(!last)return;
  const b=last.best,rows=[["گزارش جست‌وجوی ابعاد اولیه پی"],["مبنا",last.basis],["عرض B (m)",b.B],["طول L (m)",b.L],["مساحت هر پی (m2)",b.area],["qmin (kPa)",b.qminKPa],["qmax (kPa)",b.qmaxKPa],["ظرفیت مجاز ناخالص (kPa)",last.allowableGrossKPa],["پایه/حالت حاکم",b.governing],["تعداد حالت فشاری بررسی‌شده",last.compressionCasesChecked],...last.limitations.map(x=>["محدودیت",x])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Footing-Preliminary-Sizing.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelFootingSizingAssistant={search,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
})();