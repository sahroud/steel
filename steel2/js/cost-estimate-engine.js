/* SAHROUD STEEL — Cost estimation
 * Uses BOQ quantities and explicitly entered or registered prices; never fabricates prices.
 * All monetary inputs are toman. Market prices are suggestions until user confirms them.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),N=v=>{const x=Number(v);return Number.isFinite(x)&&x>=0?x:null;};
 const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:0});
 const defaultManualItems=[
  {key:"foundationConcrete",label:"بتن فونداسیون و شناژ",unit:"مترمکعب",priceCode:"concrete.ready",priceUnit:"تومان/مترمکعب"},
  {key:"foundationRebar",label:"میلگرد فونداسیون (مقدار دستی/طراحی‌شده)",unit:"کیلوگرم",priceCode:"rebar.a3",priceUnit:"تومان/کیلوگرم"},
  {key:"pedestalRebar",label:"آرماتور طولی و خاموت پدستال",unit:"کیلوگرم",priceCode:"rebar.a3",priceUnit:"تومان/کیلوگرم"},
  {key:"tieRebar",label:"آرماتور شناژ (برآورد وزنی واردشده)",unit:"کیلوگرم",priceCode:"rebar.a3",priceUnit:"تومان/کیلوگرم"},
  {key:"excavation",label:"خاکبرداری و تسطیح",unit:"مترمکعب",priceCode:"excavation",priceUnit:"تومان/مترمکعب"},
  {key:"formwork",label:"قالب‌بندی فونداسیون",unit:"مترمربع",priceCode:"formwork",priceUnit:"تومان/مترمربع"},
  {key:"anchorBolts",label:"تعداد بولت و صفحه‌ستون (در صورت قیمت‌گذاری عددی)",unit:"عدد",priceCode:"anchor.bolt",priceUnit:"تومان/عدد"},
  {key:"floorConcrete",label:"بتن کف سوله (۱۵ سانتی‌متر؛ مقدار از متره)",unit:"مترمکعب",priceCode:"concrete.floor",priceUnit:"تومان/مترمکعب"},
  {key:"blindingConcrete",label:"بتن مگر زیر فونداسیون (ضخامت و پیش‌آمدگی از نقشه)",unit:"مترمکعب",priceCode:"concrete.ready",priceUnit:"تومان/مترمکعب"},
  {key:"siteworkExcavation",label:"خاکبرداری نوار شناژ تا زیر بتن مگر",unit:"مترمکعب"},
  {key:"siteworkBackfill",label:"خاکریزی فضای باقی‌مانده پس از بتن‌ریزی",unit:"مترمکعب"},
  {key:"siteworkGroundFill",label:"خاکریزی زمین گود تا تراز کف سوله",unit:"مترمکعب"},
  {key:"doors",label:"درب‌ها و کرکره‌ها",unit:"مترمربع",priceCode:"door.industrial",priceUnit:"تومان/مترمربع"},
  {key:"gutters",label:"آبرو و لوله‌های ناودانی",unit:"متر",priceCode:"gutter",priceUnit:"تومان/متر"},
  {key:"electrical",label:"برق و روشنایی",unit:"مجموع",priceCode:"electrical.package",priceUnit:"تومان/مجموع"},
  {key:"other",label:"سایر هزینه‌های مستقیم",unit:"مجموع"}
 ];
 const state={prices:{},percent:{transport:0,fabrication:0,installation:0,paint:0,overhead:0,contingency:0,tax:0},steelPricingMode:"steel_only",manualItems:defaultManualItems.map(x=>({...x,quantity:"",unitPrice:""})),last:null};
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
 function projectCity(){const market=window.SteelMarketPrices;const v=market&&typeof market.getProjectCity==="function"?market.getProjectCity():(document.getElementById("city")?.selectedOptions?.[0]?.textContent||"");return String(v||"").replace(/\s*\(پیش‌فرض\)\s*/g,"").trim();}
 function cityKey(v){return String(v||"").replace(/\s*\(پیش‌فرض\)\s*/g,"").replace(/\s+/g,"").trim().toLowerCase();}
 function marketPrice(code,expectedUnit){const d=window.SteelMarketPrices?.getData?.(),city=cityKey(projectCity());if(!city)return null;const compatible=(d?.prices||[]).filter(p=>p.code===code&&p.unit===expectedUnit&&cityKey(p.city)===city);compatible.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));return compatible[0]||null;}
 function render(){
  const root=$("quantityTakeoffPanel");if(!root||$("costEstimatePanel"))return;
  const p=document.createElement("section");p.className="panel";p.id="costEstimatePanel";
  p.innerHTML='<div class="panel-title"><h3>برآورد مالی و قیمت تمام‌شده سوله</h3><span class="status">تومان ـ قیمت قابل تأیید</span></div>'+
   '<div class="notice">مقادیر از آخرین متره محاسبه‌شده گرفته می‌شوند. قیمت‌ها از بانک قیمت یا ورود دستی پیشنهاد می‌شوند؛ تا زمان تأیید کاربر، قیمت منبع بازار قطعی خرید تلقی نمی‌شود. اقلام نامعلوم یا فاقد مقدار/قیمت در جمع لحاظ نمی‌شوند و هشدار می‌گیرند.</div>'+
   '<div class="form-grid"><div class="field"><label for="costSteelMode">روش قیمت‌گذاری فولاد</label><select id="costSteelMode"><option value="steel_only">فقط اسکلت و ورق اتصال؛ پیچ و جوش جدا</option><option value="fabricated">قیمت هر کیلو فولاد ساخته‌شده شامل ساخت و اتصالات؛ اقلام پیچ و جوش جداگانه صفر شوند</option></select></div></div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>قلم</th><th>مقدار</th><th>واحد</th><th>قیمت واحد (تومان)</th><th>منبع پیشنهادی</th><th>هزینه</th></tr></thead><tbody id="costEstimateRows"></tbody></table></div>'+
   '<h4>هزینه‌های تکمیلی اجرا و فونداسیون</h4><div class="notice">مقادیر این بخش هنوز از طراحی فونداسیون استخراج نشده‌اند؛ فقط پس از متره یا استعلام واقعی وارد کنید. مواردی را که قبلاً در اقلام دیگر یا قیمت ساخت منظور کرده‌اید دوباره ثبت نکنید.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:720px"><thead><tr><th>شرح</th><th>مقدار</th><th>واحد</th><th>قیمت واحد (تومان)</th><th>منبع قیمت</th><th>هزینه</th></tr></thead><tbody id="costManualRows"></tbody></table></div>'+
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
  renderRows();renderManualItems();
  $("city")?.addEventListener("change",()=>{renderRows();});
  $("cityName")?.addEventListener("input",()=>{renderRows();});
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
 function renderManualItems(){
  const body=$("costManualRows");if(!body)return;body.replaceChildren();
  state.manualItems.forEach(item=>{
   const tr=document.createElement("tr"),name=document.createElement("td");name.textContent=item.label;tr.appendChild(name);
   const qc=document.createElement("td"),q=document.createElement("input");q.type="number";q.min="0";q.step="any";q.placeholder="مقدار";q.value=item.quantity??"";q.dataset.manualKey=item.key;q.dataset.manualField="quantity";qc.appendChild(q);tr.appendChild(qc);
   const uc=document.createElement("td"),unit=document.createElement("input");unit.type="text";unit.value=item.unit;unit.dataset.manualKey=item.key;unit.dataset.manualField="unit";uc.appendChild(unit);tr.appendChild(uc);
   const pc=document.createElement("td"),price=document.createElement("input");price.type="number";price.min="0";price.step="any";price.placeholder="قیمت واحد";price.value=item.unitPrice??"";price.dataset.manualKey=item.key;price.dataset.manualField="unitPrice";pc.appendChild(price);tr.appendChild(pc);
   const src=document.createElement("td"),quote=item.priceCode?marketPrice(item.priceCode,item.priceUnit):null;
   if(quote){
    const note=document.createElement("small");note.textContent=(quote.seller||quote.source||"منبع قیمت")+" | "+(quote.city||"شهر نامشخص")+" | "+(cityKey(quote.city)===cityKey(projectCity())?"هم‌شهر پروژه":"شهر دیگر")+" | "+(quote.verifiedByUser?"تأیید دستی":"تأییدنشده");src.appendChild(note);
    const use=document.createElement("button");use.type="button";use.className="btn secondary";use.textContent="استفاده از قیمت بازار";use.addEventListener("click",()=>{item.unitPrice=String(quote.price);item.priceSource="market";renderManualItems();});src.appendChild(use);
   }else src.textContent=item.priceSource==="manual"?"ورود دستی":"قیمت هم‌واحد ثبت نشده";
   const total=document.createElement("td");total.dataset.manualTotal=item.key;total.textContent="—";tr.appendChild(src);tr.appendChild(total);
   [q,unit,price].forEach(el=>el.addEventListener("change",()=>{item[el.dataset.manualField]=el.value;if(el.dataset.manualField==="quantity")item.quantitySource="manual";if(el.dataset.manualField==="unitPrice")item.priceSource="manual";}));
   body.appendChild(tr);
  });
 }
 function refreshFromFoundation(report){
  if(!report)return;
  const links={foundationConcrete:report.totalConcreteM3,foundationRebar:report.footingRebarKg,pedestalRebar:report.pedestalRebarKg,excavation:report.excavationM3,formwork:report.totalFormworkM2,anchorBolts:report.anchorsCount,tieRebar:report.tieRebarKg};
  let changed=false;
  state.manualItems.forEach(item=>{
   if(!Object.prototype.hasOwnProperty.call(links,item.key)||item.quantitySource==="manual"||item.quantitySource==="anchorSchedule")return;
   const value=links[item.key];
   if(value===null||value===undefined||!Number.isFinite(Number(value))){if(item.quantitySource==="foundation"){item.quantity="";item.quantitySource="pending";changed=true;}return;}
   item.quantity=String(value);item.quantitySource="foundation";changed=true;
  });
  if(changed)renderManualItems();
 }
 function refreshFromSiteWork(report){
  if(!report)return;
  const links={floorConcrete:report.slabConcreteM3,blindingConcrete:report.blindingConcreteM3,siteworkExcavation:report.excavationM3,siteworkBackfill:report.backfillM3,siteworkGroundFill:report.fillNetM3};
  let changed=false;
  state.manualItems.forEach(item=>{
   if(!Object.prototype.hasOwnProperty.call(links,item.key)||item.quantitySource==="manual"||item.quantitySource==="anchorSchedule")return;
   const value=links[item.key];
   if(value===null||value===undefined||!Number.isFinite(Number(value))){if(item.quantitySource==="siteWork"){item.quantity="";item.quantitySource="pending";changed=true;}return;}
   item.quantity=String(value);item.quantitySource="siteWork";changed=true;
  });
  if(changed)renderManualItems();
 }
 function refreshFromAnchorTakeoff(report){
  if(!report||report.boltCount===null||report.boltCount===undefined)return;
  const item=state.manualItems.find(x=>x.key==="anchorBolts");
  if(item&&item.quantitySource!=="manual"){
   item.quantity=String(report.boltCount);
   item.quantitySource="anchorSchedule";
   renderManualItems();
  }
 }
 function calculate(){
  const r=window.SteelQuantityTakeoff?.lastResult;
  if(!r){$("costEstimateSummary").textContent="ابتدا دکمه محاسبه متره را اجرا کنید.";return;}
  state.last=r;renderRows();const rows=[];let subtotal=0,missing=[],pricingWarnings=[],quotedFreightTotal=0;const freightQuoteKeys=new Set();
  definitions.forEach(d=>{
   const q=d.qty(r),el=document.querySelector('[data-cost-key="'+d.key+'"]'),p=N(el?.value),quote=marketPrice(d.priceCode,d.priceUnit);
   if(el)state.prices[d.key]=el.value;
   if(quote&&el&&String(el.value)===String(quote.price)){
    if(cityKey(quote.city)!==cityKey(projectCity()))pricingWarnings.push(d.label+": قیمت از شهر دیگری است؛ هزینه تأمین تا "+(projectCity()||"شهر پروژه")+" باید جداگانه تعیین شود.");
    if(!quote.deliveryCity)pricingWarnings.push(d.label+": شهر تحویل در پیش‌فاکتور مشخص نشده است.");
    if(quote.deliveryCity&&cityKey(quote.deliveryCity)!==cityKey(projectCity()))pricingWarnings.push(d.label+": شهر تحویل اعلام‌شده با شهر پروژه یکسان نیست.");
    if(!quote.includesFreight&&quote.freightToman===null)pricingWarnings.push(d.label+": وضعیت/مبلغ حمل در قیمت بازار مشخص نیست.");
    if(!quote.includesFreight&&quote.freightToman!==null){
     if(Number(q)>0&&cityKey(quote.deliveryCity)===cityKey(projectCity())&&cityKey(projectCity())){
      const freightKey=[quote.sourceUrl||"",quote.seller,quote.source,quote.city,quote.deliveryCity,quote.updatedAt].join("|");
      if(!freightQuoteKeys.has(freightKey)){quotedFreightTotal+=Number(quote.freightToman)||0;freightQuoteKeys.add(freightKey);}
     }else pricingWarnings.push(d.label+": مبلغ حمل ثبت شده است اما چون شهر تحویل با شهر پروژه تطبیق ندارد، در جمع منظور نشد.");
    }
    if(!quote.includesTax&&quote.taxPercent===null)pricingWarnings.push(d.label+": وضعیت مالیات قیمت بازار مشخص نیست.");else if(!quote.includesTax&&quote.taxPercent!==null)pricingWarnings.push(d.label+": درصد مالیات در منبع ثبت شده اما خودکار اعمال نشده؛ آن را در مالیات عمومی برآورد لحاظ یا کنترل کنید.");
    if(!quote.verifiedByUser)pricingWarnings.push(d.label+": قیمت بازار هنوز توسط کاربر با فروشنده یا پیش‌فاکتور تأیید نشده است.");
   }
   if(q===null||q===undefined||!Number.isFinite(Number(q))){missing.push(d.label+": مقدار نامعلوم");return;}
   if(!(p>0)){if(Number(q)>0)missing.push(d.label+": قیمت واحد وارد نشده");return;}
   if(state.steelPricingMode==="fabricated"&&(d.key==="bolt"||d.key==="weld")){if(el)el.value="";return;}
   const amount=Number(q)*p;subtotal+=amount;rows.push({key:d.key,label:d.label,quantity:Number(q),unit:d.unit,unitPrice:p,cost:amount});
   const cell=document.querySelector('[data-cost-total="'+d.key+'"]');if(cell)cell.textContent=fmt(amount);
  });
  state.manualItems.forEach(item=>{
   const q=N(item.quantity),p=N(item.unitPrice);
   if((item.quantity!==""&&item.quantity!==undefined)||(item.unitPrice!==""&&item.unitPrice!==undefined)){
    if(!(q>0)||!(p>0)){missing.push(item.label+": مقدار یا قیمت واحد تکمیل نشده");return;}
    if(item.priceSource==="market"&&item.priceCode){
     const quote=marketPrice(item.priceCode,item.priceUnit);
     if(quote&&String(item.unitPrice)===String(quote.price)){
      if(cityKey(quote.city)!==cityKey(projectCity()))pricingWarnings.push(item.label+": قیمت بازار از شهر دیگری است؛ حمل تا محل پروژه باید بررسی شود.");
      if(!quote.deliveryCity)pricingWarnings.push(item.label+": شهر تحویل قیمت بازار مشخص نیست.");
      if(quote.deliveryCity&&cityKey(quote.deliveryCity)!==cityKey(projectCity()))pricingWarnings.push(item.label+": شهر تحویل قیمت بازار با شهر پروژه تطبیق ندارد.");
      if(!quote.includesFreight&&quote.freightToman===null)pricingWarnings.push(item.label+": حمل در قیمت بازار نامشخص است.");
      if(!quote.includesFreight&&quote.freightToman!==null&&Number(q)>0&&cityKey(quote.deliveryCity)===cityKey(projectCity())&&cityKey(projectCity())){
       const freightKey=[quote.sourceUrl||"",quote.seller,quote.source,quote.city,quote.deliveryCity,quote.updatedAt].join("|");
       if(!freightQuoteKeys.has(freightKey)){quotedFreightTotal+=Number(quote.freightToman)||0;freightQuoteKeys.add(freightKey);}
      }
      if(!quote.includesTax&&quote.taxPercent===null)pricingWarnings.push(item.label+": وضعیت مالیات قیمت بازار مشخص نیست.");else if(!quote.includesTax&&quote.taxPercent!==null)pricingWarnings.push(item.label+": درصد مالیات ثبت شده اما خودکار اعمال نشده است؛ آن را در مالیات عمومی کنترل کنید.");
      if(!quote.verifiedByUser)pricingWarnings.push(item.label+": قیمت بازار هنوز تأیید دستی نشده است.");
     }else pricingWarnings.push(item.label+": قیمت پیشنهادی بانک قیمت دیگر در دسترس یا هم‌واحد نیست؛ قیمت را دوباره کنترل کنید.");
    }
    const amount=q*p;subtotal+=amount;rows.push({key:item.key,label:item.label,quantity:q,unit:item.unit,unitPrice:p,cost:amount});
    const cell=document.querySelector('[data-manual-total="'+item.key+'"]');if(cell)cell.textContent=fmt(amount);
   }
  });
  const pct=state.percent,base=subtotal;
  const extras={transport:base*pct.transport/100+quotedFreightTotal,fabrication:state.steelPricingMode==="fabricated"?0:base*pct.fabrication/100,installation:base*pct.installation/100,paint:base*pct.paint/100};
  const direct=base+Object.values(extras).reduce((a,b)=>a+b,0);
  extras.overhead=direct*pct.overhead/100;
  const afterOverhead=direct+extras.overhead;
  extras.contingency=afterOverhead*pct.contingency/100;
  const afterRisk=afterOverhead+extras.contingency;
  extras.tax=afterRisk*pct.tax/100;
  const total=afterRisk+extras.tax;
  state.lastCost={generatedAt:new Date().toISOString(),currency:"تومان",projectCity:projectCity(),rows,marketFreightTotal:quotedFreightTotal,pricingWarnings:[...new Set(pricingWarnings)],materialSubtotal:subtotal,percentageInputs:clone(pct),percentageCosts:extras,totalCost:total,missing,pricingMode:state.steelPricingMode,notice:"برآورد مقدماتی؛ قیمت‌های تأییدنشده، مقادیر ناقص و هزینه‌های فاقد داده در جمع لحاظ نشده‌اند."};
  window.SteelProjectBOQ?.refresh?.();
  $("costEstimateSummary").textContent="شهر اجرای پروژه: "+(projectCity()||"نامشخص")+"\nجمع اقلام دارای قیمت: "+fmt(subtotal)+" تومان\nحمل: "+fmt(extras.transport)+" | ساخت: "+fmt(extras.fabrication)+(state.steelPricingMode==="fabricated"?" (در قیمت ساخت هر کیلو منظور شده)":"")+" | نصب: "+fmt(extras.installation)+" | رنگ: "+fmt(extras.paint)+"\nبالاسری: "+fmt(extras.overhead)+" | ذخیره ریسک: "+fmt(extras.contingency)+" | مالیات: "+fmt(extras.tax)+"\nبرآورد کل اقلام قیمت‌گذاری‌شده: "+fmt(total)+" تومان\n"+(missing.length?"موارد خارج از جمع:\n"+missing.join("\n"):"تمام اقلام دارای مقدار قیمت‌گذاری شده‌اند.")+(pricingWarnings.length?"\n\nهشدارهای قیمت و تأمین:\n"+[...new Set(pricingWarnings)].join("\n"):"")+"\n\nاین رقم قیمت قطعی پیمان یا پیشنهاد فروشنده نیست."
  $("btnExportCost").disabled=false;
 }
 function exportCSV(){
  const c=state.lastCost;if(!c)return;
  const rows=[["شهر اجرای پروژه",c.projectCity||"نامشخص","","",""],["شرح","مقدار","واحد","قیمت واحد تومان","هزینه تومان"],...c.rows.map(x=>[x.label,x.quantity,x.unit,x.unitPrice,x.cost]),["جمع اقلام","","","",c.materialSubtotal],...Object.entries(c.percentageCosts).map(([k,v])=>[k,"","درصد/تومان",c.percentageInputs[k],v]),["حمل ثبت‌شده در پیش‌فاکتور","","","",c.marketFreightTotal||0],["برآورد کل","","","",c.totalCost],["ملاحظات",c.notice,"","",""],...(c.missing||[]).map(w=>["خارج از جمع",w,"","",""]),...(c.pricingWarnings||[]).map(w=>["هشدار قیمت و تأمین",w,"","",""])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Cost-Estimate.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){return clone({prices:state.prices,percent:state.percent,steelPricingMode:state.steelPricingMode,manualItems:state.manualItems});}
 function setData(d){if(!d||typeof d!=="object")return;state.prices=d.prices||{};state.percent={...state.percent,...(d.percent||{})};state.steelPricingMode=d.steelPricingMode||"steel_only";if(Array.isArray(d.manualItems))state.manualItems=defaultManualItems.map(def=>({...def,...(d.manualItems.find(x=>x.key===def.key)||{})}));if($("costSteelMode"))$("costSteelMode").value=state.steelPricingMode;Object.keys(state.percent).forEach(k=>{const el=$("cost"+k[0].toUpperCase()+k.slice(1));if(el)el.value=state.percent[k];});renderRows();renderManualItems();}
 document.addEventListener("DOMContentLoaded",()=>{render();});
 window.SteelCostEstimate={getData,setData,calculate,refreshFromBOQ:(report)=>{if(report&&typeof report==="object"){state.last=report;renderRows();}},refreshFromFoundation,refreshFromSiteWork,refreshFromAnchorTakeoff,getLast:()=>clone(state.lastCost||null)};
})();