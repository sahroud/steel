/* SAHROUD STEEL — Cost estimation
 * Uses BOQ quantities and explicitly entered or registered prices; never fabricates prices.
 * All monetary inputs are toman. Market prices are suggestions until user confirms them.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),N=v=>{const x=Number(v);return Number.isFinite(x)&&x>=0?x:null;};
 const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:0});
 const state={prices:{},percent:{transport:0,fabrication:0,installation:0,paint:0,overhead:0,contingency:0,tax:0},steelPricingMode:"steel_only",last:null};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const definitions=[
  {key:"steel",label:"فولاد اسکلت و ورق اتصال",unit:"کیلوگرم",priceCode:"steel.general",qty:r=>r.steelMassTakeoff?.procurementMassExcludingBoltsAndWeldKg??null,priceUnit:"تومان/کیلوگرم"},
  {key:"brick",label:"آجر",unit:"عدد",priceCode:"brick",qty:r=>r.totals?.estimatedBrickCount??null,priceUnit:"تومان/عدد"},
  {key:"mortar",label:"ملات",unit:"مترمکعب",priceCode:"mortar",qty:r=>r.totals?.estimatedMortarVolumeM3??null,priceUnit:"تومان/مترمکعب"},
  {key:"roof",label:"پوشش سقف",unit:"مترمربع",priceCode:"roof.cover",qty:r=>r.totals?.roofCoverAreaApproxM2??null,priceUnit:"تومان/مترمربع"},
  {key:"panel",label:"ساندویچ‌پنل دیوار",unit:"مترمربع",priceCode:"panel.wall40",qty:r=>(r.facades||[]).filter(x=>x.material==="sandwich-panel").reduce((s,x)=>s+x.netAreaM2,0),priceUnit:"تومان/مترمربع"},
  {key:"sheet",label:"ورق فلزی دیوار",unit:"مترمربع",priceCode:"sheet.wall",qty:r=>(r.facades||[]).filter(x=>x.material==="metal-sheet").reduce((s,x)=>s+x.netAreaM2,0),priceUnit:"تومان/مترمربع"},
  {key:"plaster",label:"اندود دو طرف دیوار آجری",unit:"مترمربع",priceCode:"plaster",qty:r=>r.totals?.plasterAreaBothFacesM2??null,priceUnit:"تومان/مترمربع"},
  {key:"bolt",label:"پیچ‌ها (وزن ساق نظری)",unit:"کیلوگرم",priceCode:"bolt",qty:r=>r.steelMassTakeoff?.boltShankMassKg??null,priceUnit:"تومان/کیلوگرم"},
  {key:"weld",label:"فلز جوش نظری",unit:"کیلوگرم",priceCode:"weld",qty:r=>r.steelMassTakeoff?.theoreticalWeldMetalMassKg??null,priceUnit:"تومان/کیلوگرم"}
 ];
 function projectCity(){const v=window.SteelMarketPrices?.getProjectCity?.()||document.getElementById("city")?.selectedOptions?.[0]?.textContent||"";return String(v).replace(/\\s*\\(پیش‌فرض\\)\\s*/g,"").trim();}
 function cityKey(v){return String(v||"").replace(/\\s*\\(پیش‌فرض\\)\\s*/g,"").replace(/\\s+/g,"").trim().toLowerCase();}
 function marketPrice(code,expectedUnit){const d=window.SteelMarketPrices?.getData?.(),city=cityKey(projectCity());const compatible=(d?.prices||[]).filter(p=>p.code===code&&p.unit===expectedUnit);compatible.sort((a,b)=>{const ac=city&&cityKey(a.city)===city?1:0,bc=city&&cityKey(b.city)===city?1:0;return bc-ac||new Date(b.updatedAt)-new Date(a.updatedAt);});return compatible[0]||null;}
 function render(){
  const root=$("quantityTakeoffPanel");if(!root||$("costEstimatePanel"))return;
  const p=document.createElement("section");p.className="panel";p.id="costEstimatePanel";
  p.innerHTML='<div class="panel-title"><h3>برآورد مالی و قیمت تمام‌شده سوله</h3><span class="status">تومان ـ قیمت قابل تأیید</span></div>'+
   '<div class="notice">مقادیر از آخرین متره محاسبه‌شده گرفته می‌شوند. قیمت‌ها از بانک قیمت یا ورود دستی پیشنهاد می‌شوند؛ تا زمان تأیید کاربر، قیمت منبع بازار قطعی خرید تلقی نمی‌شود. اقلام نامعلوم یا فاقد مقدار/قیمت در جمع لحاظ نمی‌شوند و هشدار می‌گیرند.</div>'+
   '<div class="form-grid"><div class="field"><label for="costSteelMode">روش قیمت‌گذاری فولاد</label><select id="costSteelMode"><option value="steel_only">فقط اسکلت و ورق اتصال؛ پیچ و جوش جدا</option><option value="fabricated">قیمت هر کیلو فولاد ساخته‌شده شامل ساخت و اتصالات؛ اقلام پیچ و جوش جداگانه صفر شوند</option></select></div></div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>قلم</th><th>مقدار</th><th>واحد</th><th>قیمت واحد (تومان)</th><th>منبع پیشنهادی</th><th>هزینه</th></tr></thead><tbody id="costEstimateRows"></tbody></table></div>'+
   '<h4>هزینه‌های درصدی</h4><div class="form-grid">'+
   '<div class="field"><label for="costTransport">حمل‌ونقل (%)</label><input id="costTransport" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costFabrication">ساخت/برش/سوراخ‌کاری (%)</label><input id="costFabrication" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costInstallation">نصب و جرثقیل (%)</label><input id="costInstallation" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costPaint">رنگ و ضدزنگ (%)</label><input id="costPaint" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costOverhead">بالاسری (%)</label><input id="costOverhead" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costContingency">ذخیره ریسک/پیش‌بینی‌نشده (%)</label><input id="costContingency" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costTax">مالیات/عوارض (%)</label><input id="costTax" type="number" min="0" step="0.1"></div></div>'+
   '<div class="button-grid"><button id="btnCalculateCost" type="button" class="btn primary">محاسبه هزینه کل</button><button id="btnExportCost" type="button" class="btn secondary" disabled>دریافت گزارش هزینه CSV</button></div>'+
   '<div id="costEstimateSummary" class="notice">ابتدا متره را اجرا کنید؛ سپس قیمت‌ها را وارد یا از بانک قیمت انتخاب کنید.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  $("costSteelMode").value=state.steelPricingMode;
  Object.keys(state.percent).forEach(k=>{const el=$("cost"+k[0].toUpperCase()+k.slice(1));if(el)el.value=state.percent[k];el?.addEventListener("change",()=>{state.percent[k]=N(el.value)??0;});});
  $("costSteelMode").addEventListener("change",()=>{state.steelPricingMode=$("costSteelMode").value;});
  $("btnCalculateCost").addEventListener("click",calculate);
  $("btnExportCost").addEventListener("click",exportCSV);
  renderRows();
  $("city")?.addEventListener("change",()=>{renderRows();});
 }
 function renderRows(){
  const body=$("costEstimateRows");if(!body)return;body.replaceChildren();
  definitions.forEach(d=>{
   const tr=document.createElement("tr"),qty=state.last?d.qty(state.last):null,mp=marketPrice(d.priceCode,d.priceUnit),manual=state.prices[d.key]??"";
   const vals=[d.label,qty===null||qty===undefined?"نامشخص":fmt(qty),d.unit];
   vals.forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
   const priceTd=document.createElement("td"),input=document.createElement("input");input.type="number";input.min="0";input.step="any";input.placeholder="قیمت واحد";input.value=manual!==""?manual:(mp?.price??"");input.dataset.costKey=d.key;input.addEventListener("change",()=>{state.prices[d.key]=input.value;});priceTd.appendChild(input);tr.appendChild(priceTd);
   const src=document.createElement("td");src.textContent=mp?((mp.seller||mp.source)+" | بازار: "+(mp.city||"نامشخص")+" | "+(cityKey(mp.city)===cityKey(projectCity())?"هم‌شهر پروژه":"قیمت شهر دیگر؛ حمل تا پروژه باید بررسی شود")+" | تحویل: "+(mp.deliveryCity||"نامشخص")+" | "+(mp.includesFreight?"حمل منظور شده":mp.freightToman!==null&&mp.freightToman!==undefined?"حمل جداگانه ثبت شده":"حمل نامشخص")+" | "+(mp.includesTax?"مالیات منظور شده":mp.taxPercent!==null&&mp.taxPercent!==undefined?"مالیات جداگانه ثبت شده":"مالیات نامشخص")+" | "+(mp.verifiedByUser?"تأیید دستی":"تأییدنشده")+" | "+new Date(mp.updatedAt).toLocaleDateString("fa-IR")+" | "+(Date.now()-new Date(mp.updatedAt).getTime()>36*3600000?"قدیمی":"جدید")+" | واحد منطبق؛ کنترل نهایی لازم"):(state.prices[d.key]!==undefined?"ورود دستی":"قیمت منطبق ثبت نشده؛ کد: "+d.priceCode+"، واحد لازم: "+d.priceUnit);tr.appendChild(src);
   const total=document.createElement("td");total.textContent="—";total.dataset.costTotal=d.key;tr.appendChild(total);body.appendChild(tr);
  });
 }
 function calculate(){
  const r=window.SteelQuantityTakeoff?.lastResult;
  if(!r){$("costEstimateSummary").textContent="ابتدا دکمه محاسبه متره را اجرا کنید.";return;}
  state.last=r;renderRows();const rows=[];let subtotal=0,missing=[],pricingWarnings=[];
  definitions.forEach(d=>{
   const q=d.qty(r),el=document.querySelector('[data-cost-key="'+d.key+'"]'),p=N(el?.value),quote=marketPrice(d.priceCode,d.priceUnit);
   if(el)state.prices[d.key]=el.value;
   if(quote&&el&&String(el.value)===String(quote.price)){
    if(cityKey(quote.city)!==cityKey(projectCity()))pricingWarnings.push(d.label+": قیمت از شهر دیگری است؛ هزینه تأمین تا "+(projectCity()||"شهر پروژه")+" باید جداگانه تعیین شود.");
    if(quote.deliveryCity&&cityKey(quote.deliveryCity)!==cityKey(projectCity()))pricingWarnings.push(d.label+": شهر تحویل اعلام‌شده با شهر پروژه یکسان نیست.");
    if(!quote.includesFreight&&quote.freightToman===null)pricingWarnings.push(d.label+": وضعیت/مبلغ حمل در قیمت بازار مشخص نیست.");
    if(!quote.includesTax&&quote.taxPercent===null)pricingWarnings.push(d.label+": وضعیت مالیات قیمت بازار مشخص نیست.");
    if(!quote.verifiedByUser)pricingWarnings.push(d.label+": قیمت بازار هنوز توسط کاربر با فروشنده یا پیش‌فاکتور تأیید نشده است.");
   }
   if(q===null||q===undefined||!Number.isFinite(Number(q))){missing.push(d.label+": مقدار نامعلوم");return;}
   if(!(p>0)){if(Number(q)>0)missing.push(d.label+": قیمت واحد وارد نشده");return;}
   if(state.steelPricingMode==="fabricated"&&(d.key==="bolt"||d.key==="weld")){if(el)el.value="";return;}
   const amount=Number(q)*p;subtotal+=amount;rows.push({key:d.key,label:d.label,quantity:Number(q),unit:d.unit,unitPrice:p,cost:amount});
   const cell=document.querySelector('[data-cost-total="'+d.key+'"]');if(cell)cell.textContent=fmt(amount);
  });
  const pct=state.percent,base=subtotal;
  const extras={transport:base*pct.transport/100,fabrication:state.steelPricingMode==="fabricated"?0:base*pct.fabrication/100,installation:base*pct.installation/100,paint:base*pct.paint/100};
  const direct=base+Object.values(extras).reduce((a,b)=>a+b,0);
  extras.overhead=direct*pct.overhead/100;
  const afterOverhead=direct+extras.overhead;
  extras.contingency=afterOverhead*pct.contingency/100;
  const afterRisk=afterOverhead+extras.contingency;
  extras.tax=afterRisk*pct.tax/100;
  const total=afterRisk+extras.tax;
  state.lastCost={generatedAt:new Date().toISOString(),currency:"تومان",projectCity:projectCity(),rows,pricingWarnings:[...new Set(pricingWarnings)],materialSubtotal:subtotal,percentageInputs:clone(pct),percentageCosts:extras,totalCost:total,missing,pricingMode:state.steelPricingMode,notice:"برآورد مقدماتی؛ قیمت‌های تأییدنشده، مقادیر ناقص و هزینه‌های فاقد داده در جمع لحاظ نشده‌اند."};
  $("costEstimateSummary").textContent="شهر اجرای پروژه: "+(projectCity()||"نامشخص")+"\nجمع اقلام دارای قیمت: "+fmt(subtotal)+" تومان\nحمل: "+fmt(extras.transport)+" | ساخت: "+fmt(extras.fabrication)+(state.steelPricingMode==="fabricated"?" (در قیمت ساخت هر کیلو منظور شده)":"")+" | نصب: "+fmt(extras.installation)+" | رنگ: "+fmt(extras.paint)+"\nبالاسری: "+fmt(extras.overhead)+" | ذخیره ریسک: "+fmt(extras.contingency)+" | مالیات: "+fmt(extras.tax)+"\nبرآورد کل اقلام قیمت‌گذاری‌شده: "+fmt(total)+" تومان\n"+(missing.length?"موارد خارج از جمع:\n"+missing.join("\n"):"تمام اقلام دارای مقدار قیمت‌گذاری شده‌اند.")+(pricingWarnings.length?"\n\nهشدارهای قیمت و تأمین:\n"+[...new Set(pricingWarnings)].join("\n"):"")+"\n\nاین رقم قیمت قطعی پیمان یا پیشنهاد فروشنده نیست."
  $("btnExportCost").disabled=false;
 }
 function exportCSV(){
  const c=state.lastCost;if(!c)return;
  const rows=[["شهر اجرای پروژه",c.projectCity||"نامشخص","","",""],["شرح","مقدار","واحد","قیمت واحد تومان","هزینه تومان"],...c.rows.map(x=>[x.label,x.quantity,x.unit,x.unitPrice,x.cost]),["جمع اقلام","","","",c.materialSubtotal],...Object.entries(c.percentageCosts).map(([k,v])=>[k,"","درصد/تومان",c.percentageInputs[k],v]),["برآورد کل","","","",c.totalCost],["ملاحظات",c.notice,"","",""],...(c.pricingWarnings||[]).map(w=>["هشدار قیمت و تأمین",w,"","",""])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Cost-Estimate.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){return clone({prices:state.prices,percent:state.percent,steelPricingMode:state.steelPricingMode});}
 function setData(d){if(!d||typeof d!=="object")return;state.prices=d.prices||{};state.percent={...state.percent,...(d.percent||{})};state.steelPricingMode=d.steelPricingMode||"steel_only";if($("costSteelMode"))$("costSteelMode").value=state.steelPricingMode;Object.keys(state.percent).forEach(k=>{const el=$("cost"+k[0].toUpperCase()+k.slice(1));if(el)el.value=state.percent[k];});renderRows();}
 document.addEventListener("DOMContentLoaded",()=>{render();});
 window.SteelCostEstimate={getData,setData,calculate,refreshFromBOQ:(report)=>{if(report&&typeof report==="object"){state.last=report;renderRows();}},getLast:()=>clone(state.lastCost||null)};
})();