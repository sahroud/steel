/* SAHROUD STEEL — project-wide bill of quantities registry
 * Consolidates calculated quantities from existing modules without inventing missing values
 * or double-counting component totals. Prices remain a separate estimate layer.
 */
(function(root){
"use strict";
const finite=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
const clone=v=>JSON.parse(JSON.stringify(v));
function item(id,category,description,unit,quantity,source,basis,extra){
 const known=finite(quantity);
 return{id,category,description,unit,quantity:known?Number(quantity):null,source,basis:basis||"",status:known?"calculated":"pending",aggregationRole:"detail",...(extra||{})};
}
function buildSnapshot(data){
 const rows=[],warnings=[];
 const add=(...args)=>rows.push(item(...args));
 const q=data.quantity||null,f=data.foundation||null,a=data.anchor||null,m=data.steelMass||null,c=data.cost||null,sw=data.siteWork||null;
 if(q){
  const t=q.totals||{};
  add("roof-cover-area","پوشش","مساحت تقریبی پوشش سقف","m²",t.roofCoverAreaApproxM2,"متره هندسه سوله","از سطح شیبدار هندسی؛ بازشو و فلاشینگ کسر نشده");
  add("masonry-brick-total","مصالح","تعداد کل آجر تخمینی","عدد",t.estimatedBrickCount,"متره هندسه سوله","جمع دیوارهای آجری؛ برآورد حجمی", {aggregationRole:"summary"});
  add("mortar-total","مصالح","حجم کل ملات نظری","m³",t.estimatedMortarVolumeM3,"متره هندسه سوله","حجم نظری بندها؛ نسبت اختلاط جداگانه لازم است", {aggregationRole:"summary"});
  add("plaster-area-total","نازک‌کاری","سطح کل اندود دو طرف","m²",t.plasterAreaBothFacesM2,"متره هندسه سوله","بر اساس ضخامت اندود واردشده", {aggregationRole:"summary"});
  add("masonry-volume-total","بنایی","حجم کل بنایی","m³",t.masonryVolumeM3,"متره هندسه سوله","جمع دیوارهای آجری", {aggregationRole:"summary"});
  add("panel-wall-area-total","پوسته","مساحت کل ساندویچ‌پنل دیوار","m²",(q.facades||[]).filter(x=>x.material==="sandwich-panel").reduce((sum,x)=>sum+(finite(x.netAreaM2)?Number(x.netAreaM2):0),0),"متره هندسه سوله","جمع سطوح با جنس ساندویچ‌پنل", {aggregationRole:"summary"});
  add("sheet-wall-area-total","پوسته","مساحت کل ورق فلزی دیوار","m²",(q.facades||[]).filter(x=>x.material==="metal-sheet").reduce((sum,x)=>sum+(finite(x.netAreaM2)?Number(x.netAreaM2):0),0),"متره هندسه سوله","جمع سطوح با جنس ورق فلزی", {aggregationRole:"summary"});
  (q.facades||[]).forEach(face=>{
   const label=({front:"جبهه جلو",rear:"جبهه عقب",left:"دیواره طولی چپ",right:"دیواره طولی راست"})[face.face]||String(face.face);
   add("facade-"+face.face+"-area","پوسته","مساحت خالص "+label,"m²",face.netAreaM2,"متره هندسه سوله","بازشو معتبر در صورت ثبت کسر شده");
   if(face.material==="brick"){
    add("masonry-"+face.face+"-volume","بنایی","حجم بنایی "+label,"m³",face.masonryVolumeM3,"متره هندسه سوله","ضخامت از مبانی پروژه");
    add("masonry-"+face.face+"-brick","مصالح","تعداد آجر تخمینی "+label,"عدد",face.estimatedBrickCount,"متره هندسه سوله","برآورد حجمی؛ پرت درج‌شده در گزارش");
    add("masonry-"+face.face+"-mortar","مصالح","حجم ملات نظری "+label,"m³",face.estimatedMortarVolumeM3,"متره هندسه سوله","نسبت اختلاط سیمان/ماسه محاسبه نشده");
    add("plaster-"+face.face,"نازک‌کاری","سطح اندود دو طرف "+label,"m²",face.plasterAreaM2,"متره هندسه سوله","فقط در صورت ورود ضخامت اندود");
   }
  });
  (q.steelMemberSchedule||[]).forEach(g=>{
   add("steel-count-"+g.group,"اسکلت فولادی","تعداد اعضای "+g.group,"عدد",g.count,"مدل هندسی","گروه‌بندی بر اساس sectionKey/type");
   add("steel-length-"+g.group,"اسکلت فولادی","طول کل اعضای "+g.group,"m",g.totalLengthM,"مدل هندسی","طول محور اعضا");
  });
 }else warnings.push("متره هندسه/پوسته هنوز محاسبه نشده است.");
 if(m){
  (m.groups||[]).forEach(g=>add("steel-mass-"+g.group,"اسکلت فولادی","وزن گروه "+g.label,"kg",g.massKg,"متره ساخت فولاد","سطح مقطع و چگالی ثبت‌شده"));
  add("steel-plate-mass","اتصالات فولادی","وزن ورق‌های اتصال","kg",m.connectionPlateMassKg,"متره ساخت فولاد","اقلام دستی ثبت‌شده");
  add("steel-bolt-mass","اتصالات فولادی","وزن ساق پیچ‌ها","kg",m.boltShankMassKg,"متره ساخت فولاد","بدون سر، مهره و واشر مگر جدا ثبت شوند");
  add("steel-weld-mass","اتصالات فولادی","وزن نظری فلز جوش","kg",m.theoreticalWeldMetalMassKg,"متره ساخت فولاد","مدل نظری جوش گوشه");
  add("steel-procurement-mass","خرید فولاد","وزن خرید اسکلت و ورق با پرت ثبت‌شده","kg",m.procurementMassExcludingBoltsAndWeldKg,"متره ساخت فولاد","پیچ و جوش جداگانه", {aggregationRole:"summary"});
  (m.items||[]).forEach(x=>add("fabrication-"+x.id,"ساخت و اتصالات",x.description,x.unit,x.count,"ثبت دستی ساخت",x.note||"ابعاد ثبت‌شده", {massKg:finite(x.massKg)?Number(x.massKg):null}));
 }else if(data.model)warnings.push("متره وزن اسکلت هنوز از مدل و مقاطع معتبر استخراج نشده است.");
 if(f?.quantities){
  const x=f.quantities;
  add("foundation-tie-count","شناژ","تعداد شناژها","عدد",x.tieCount,"متره فونداسیون","از مسیرهای تعریف‌شده یا ورودی نقشه",{aggregationRole:"summary"});
  add("foundation-tie-length","شناژ","طول کل شناژها","m",x.tieTotalLengthM,"متره فونداسیون","از مسیرهای تعریف‌شده یا ورودی نقشه؛ جمع‌بندی",{aggregationRole:"summary"});
  (x.tieRouteSchedule||[]).forEach(route=>{add("tie-route-"+route.id+"-length","شناژ","طول مسیر "+route.id,"m",route.lengthM,"هندسه مسیر شناژ","فاصله سه‌بعدی دو گره پایه");add("tie-route-"+route.id+"-concrete","شناژ","بتن مسیر "+route.id,"m³",route.concreteM3,"هندسه مسیر شناژ","طول × عرض × ارتفاع مقطع ثبت‌شده");add("tie-route-"+route.id+"-formwork","قالب‌بندی","قالب جانبی مسیر "+route.id,"m²",route.sideFormworkM2,"هندسه مسیر شناژ","دو وجه جانبی؛ قالب کف و سرهای آزاد منظور نشده");});
  (x.tieRebarSchedule||[]).forEach(route=>{add("tie-rebar-"+route.id+"-longitudinal","آرماتور شناژ","وزن میلگردهای طولی ممتد شناژ "+route.id,"kg",route.longitudinalMassKg,"غربال آرماتور شناژ","میلگرد ممتد از داخل پی‌ها؛ تا وجه بیرونی پی ابتدا/انتها با افزوده قلاب ثبت‌شده");add("tie-rebar-"+route.id+"-stirrups","آرماتور شناژ","وزن خاموت‌های شناژ "+route.id,"kg",route.stirrupMassKg,"غربال آرماتور شناژ","تعداد و طول برش خاموت از مقطع و فاصله محاسبه‌شده؛ کنترل اجرایی جدا لازم است");});
  if(Array.isArray(x.tieRebarTakeoffWarnings))warnings.push(...x.tieRebarTakeoffWarnings);
  if(Array.isArray(x.tieRouteWarnings))warnings.push(...x.tieRouteWarnings);
  (x.footingSchedule||[]).forEach(row=>{add("footing-"+row.nodeId,"فونداسیون","بتن پی پایه "+row.nodeId,"m³",Number(row.width)*Number(row.length)*Number(row.thickness),"جدول مستقل پی‌ها","عرض × طول × ضخامت ثبت‌شده");add("excavation-"+row.nodeId,"خاکی","خاکبرداری محل پی "+row.nodeId,"m³",row.excavationM3,"جدول مستقل پی‌ها","ابعاد پی + فضای کار ثبت‌شده × عمق خاکبرداری؛ بدون ترانشه شناژ");});
  add("foundation-footing-concrete","فونداسیون","بتن پی‌ها","m³",x.footingConcreteM3,"متره فونداسیون","ابعاد مستقل هر پایه", {aggregationRole:"summary"});
  add("foundation-pedestal-concrete","فونداسیون","بتن پدستال‌ها","m³",x.pedestalConcreteM3,"متره فونداسیون","فقط با تکمیل سه بعد پدستال");
  add("foundation-tie-concrete","شناژ","بتن شناژها","m³",x.tieConcreteM3,"متره فونداسیون","از مسیرهای تعریف‌شده یا ورودی نقشه؛ جمع‌بندی",{aggregationRole:"summary"});
  add("foundation-total-concrete","فونداسیون و شناژ","جمع بتن پی، پدستال و شناژ","m³",x.totalConcreteM3,"متره فونداسیون","ردیف جمع‌بندی؛ با اجزای بتن جمع نشود",{aggregationRole:"summary"});
  add("foundation-excavation","خاکی","حجم خاکبرداری","m³",x.excavationM3,"متره فونداسیون","عمق و فضای کار باید وارد شده باشد");
  add("foundation-footing-formwork","قالب‌بندی","قالب جانبی پی‌ها","m²",x.footingFormworkM2,"متره فونداسیون","سطح جانبی پی‌ها؛ قالب کف منظور نشده");
  add("foundation-pedestal-formwork","قالب‌بندی","قالب جانبی پدستال‌ها","m²",x.pedestalFormworkM2,"متره فونداسیون","فقط در صورت ورود هر سه بعد پدستال؛ قالب کف منظور نشده");
  add("foundation-tie-formwork","قالب‌بندی","قالب جانبی شناژ","m²",x.tieSideFormworkM2,"متره فونداسیون","جمع‌بندی دو وجه جانبی؛ قالب کف منظور نشده",{aggregationRole:"summary"});
  add("foundation-total-formwork","قالب‌بندی","جمع قالب جانبی پی، پدستال و شناژ","m²",x.totalFormworkM2,"متره فونداسیون","ردیف جمع‌بندی؛ با اجزای قالب جمع نشود",{aggregationRole:"summary"});
  add("foundation-footing-rebar","آرماتور","وزن شبکه آرماتور پی","kg",x.footingRebarKg,"متره فونداسیون","جزئیات قلاب/وصله فقط اگر در طول برش لحاظ شده باشد", {aggregationRole:"summary"});
  add("foundation-pedestal-rebar","آرماتور","وزن آرماتور پدستال","kg",x.pedestalRebarKg,"متره فونداسیون","بر اساس تعداد و طول برش واردشده");
  add("foundation-tie-rebar","آرماتور","جمع وزن آرماتور شناژ","kg",x.tieRebarKg,"متره فونداسیون/غربال آرماتور شناژ","در صورت تکمیل مسیر پیوسته، طول عبوری از پی‌ها، قلاب و خاموت؛ ردیف جمع‌بندی", {aggregationRole:"summary"});
  add("foundation-total-rebar","آرماتور","جمع وزن آرماتور پی، پدستال و شناژ","kg",x.totalRebarKg,"متره فونداسیون","فقط وقتی هر سه جزء محاسبه شده باشند؛ ردیف جمع‌بندی",{aggregationRole:"summary"});
  if(!finite(a?.boltCount))add("foundation-anchor-count","انکر","تعداد بولت بر اساس ورودی پایه","عدد",x.anchorsCount,"متره فونداسیون","تعداد بولت در هر پایه واردشده");
  (x.footingRebar?.rows||[]).forEach((r,i)=>add("foundation-rebar-"+i,"آرماتور","شبکه "+r.layer+" راستای "+r.direction,"kg",r.totalWeightKg,"جدول آرماتور پی","قطر، فاصله و طول مستقیم ثبت‌شده"));
 }else warnings.push("متره فونداسیون هنوز پس از استخراج واکنش‌ها محاسبه نشده است.");
 if(sw){
  (sw.excavationSchedule||[]).forEach(route=>add("sitework-trench-"+route.id,"خاکی","خاکبرداری مسیر شناژ "+route.id,"m³",route.excavationM3,"متره مسیر عملیات خاکی","طول مسیر × ۱٫۵ × بزرگ‌ترین بعد پی عمود بر مسیر × عمق تا زیر بتن مگر"));
  add("sitework-trench-excavation","خاکی","خاکبرداری نوار شناژ تا زیر بتن مگر","m³",sw.excavationM3,"متره عملیات خاکی","جمع مسیرهای معتبر؛ عرض مبنا ۱٫۵ برابر بعد پی عمود بر مسیر؛ هم‌پوشانی کسر نشده", {aggregationRole:"summary"});
  add("sitework-backfill","خاکی","خاکریزی فضای باقی‌مانده ترانشه پس از بتن‌ریزی و قالب‌برداری","m³",sw.backfillM3,"متره عملیات خاکی","خاکبرداری ناخالص منهای حجم بتن مدفونِ واقع در همان محدوده، با ورود صریح کاربر");
  add("sitework-ground-fill-gross","خاکی","خاکریزی ناخالص زمین گود تا تراز کف/صفحه‌ستون","m³",sw.fillGrossM3,"متره عملیات خاکی","مساحت کف × ارتفاع متوسط خاکریزی");
  add("sitework-ground-fill-net","خاکی","خاکریزی خالص زمین گود پس از کسر بتن مدفون","m³",sw.fillNetM3,"متره عملیات خاکی","خاکریزی ناخالص منهای حجم بتن مدفونِ واقع در محدوده");
  add("sitework-floor-concrete","بتن‌ریزی کف","بتن کف سوله با ضخامت ثبت‌شده","m³",sw.slabConcreteM3,"متره عملیات خاکی و کف","مساحت کف × ضخامت؛ مقدار فعلی پیش‌فرض ۱۵ سانتی‌متر", {aggregationRole:"summary"});
  add("sitework-floor-cement","مصالح بتن کف","سیمان معادل بتن کف با عیار ثبت‌شده","kg",sw.slabCementKg,"متره عملیات خاکی و کف","حجم بتن کف × عیار سیمان؛ عیار فعلی پیش‌فرض ۳۵۰ kg/m³");
  if(Array.isArray(sw.warnings))warnings.push(...sw.warnings);
 }else warnings.push("متره عملیات خاکی و بتن کف هنوز محاسبه نشده است.");
 if(a){
  add("anchor-bolt-count","انکر","تعداد بولت مهاری","عدد",a.boltCount,"متره صفحه‌ستون و انکر","تعداد پایه × بولت در هر پایه");
  add("anchor-bolt-mass","انکر","وزن ساق بولت مهاری","kg",a.boltShankMassKg,"متره صفحه‌ستون و انکر","وزن ساق؛ بدون رزوه/سر/قلاب");
  add("anchor-nut-count","انکر","تعداد مهره","عدد",a.nutCount,"متره صفحه‌ستون و انکر","وزن مهره فقط در صورت ثبت وزن واحد");
  add("anchor-nut-mass","انکر","وزن مهره‌ها","kg",a.nutMassKg,"متره صفحه‌ستون و انکر","وزن واحد از کاتالوگ/توزین وارد شده");
  add("anchor-washer-count","انکر","تعداد واشر","عدد",a.washerCount,"متره صفحه‌ستون و انکر","وزن واشر فقط در صورت ثبت وزن واحد");
  add("anchor-washer-mass","انکر","وزن واشرها","kg",a.washerMassKg,"متره صفحه‌ستون و انکر","وزن واحد از کاتالوگ/توزین وارد شده");
  add("baseplate-count","صفحه‌ستون","تعداد صفحه‌ستون","عدد",a.basePlateCount,"متره صفحه‌ستون و انکر","تعداد در هر پایه × تعداد پایه");
  add("baseplate-mass","صفحه‌ستون","وزن صفحه‌ستون ساده","kg",a.basePlateMassKg,"متره صفحه‌ستون و انکر","بدون کسر سوراخ، پخ، سخت‌کننده و جوش");
  add("anchor-total-mass","انکر و صفحه‌ستون","جمع وزن اقلام قابل محاسبه انکر و صفحه‌ستون","kg",a.totalCalculatedMassKg,"متره صفحه‌ستون و انکر","ردیف جمع‌بندی اقلام دارای وزن؛ با ردیف‌های جزئی جمع نشود",{aggregationRole:"summary"});
 }else warnings.push("متره صفحه‌ستون و انکر هنوز اجرا نشده است.");
 const ids=new Set(),duplicates=[];
 rows.forEach(r=>{if(ids.has(r.id))duplicates.push(r.id);ids.add(r.id);});
 const priced=new Map((c?.rows||[]).map(r=>[String(r.key),r]));
 const priceAliases={"steel-procurement-mass":"steel","steel-bolt-mass":"bolt","steel-weld-mass":"weld","masonry-brick-total":"brick","mortar-total":"mortar","roof-cover-area":"roof","panel-wall-area-total":"panel","sheet-wall-area-total":"sheet","plaster-area-total":"plaster","foundation-total-concrete":"foundationConcrete","foundation-footing-rebar":"foundationRebar","foundation-pedestal-rebar":"pedestalRebar","foundation-tie-rebar":"tieRebar","foundation-excavation":"excavation","foundation-total-formwork":"formwork","anchor-bolt-count":"anchorBolts","sitework-trench-excavation":"siteworkExcavation","sitework-backfill":"siteworkBackfill","sitework-ground-fill-net":"siteworkGroundFill","sitework-floor-concrete":"floorConcrete"};
 rows.forEach(r=>{const p=priced.get(r.id)||priced.get(priceAliases[r.id]||"");if(p)r.pricing={unitPrice:p.unitPrice,cost:p.cost,currency:"تومان",priceSource:p.priceSource||"برآورد مالی"};});
 (data.costInputs?.manualItems||[]).forEach(x=>{if(x&&x.quantitySource==="manual"&&String(x.quantity??"").trim()!=="")rows.push(item("manual-cost-"+String(x.key),"هزینه‌های تکمیلی",String(x.label||x.key),String(x.unit||"طبق ورودی"),x.quantity,"ورودی دستی برآورد","مقدار دستی مستقل",{unitPrice:finite(x.unitPrice)?Number(x.unitPrice):null,priceSource:x.priceSource||"manual"}));});
 const calculated=rows.filter(r=>r.status==="calculated").length;
 const pending=rows.length-calculated;
 return{title:"SAHROUD STEEL — فهرست یکپارچه مقادیر پروژه",generatedAt:new Date().toISOString(),rows,summary:{rowCount:rows.length,calculated,pending,duplicateIds:duplicates},warnings:[...warnings,...(duplicates.length?["شناسه ردیف تکراری است؛ از جمع‌بندی جلوگیری شود."]:[])],pricingStatus:"قیمت‌گذاری مستقل است؛ ردیف فاقد قیمت در برآورد مالی وارد جمع نمی‌شود.",designStatus:"فقط تجمیع مقادیر موجود؛ بدون تأیید طراحی یا اجرایی"};
}
function render(snapshot){
 const host=document.getElementById("projectBoqRegistryPanel");if(!host)return;
 const s=snapshot.summary;
 const status=document.getElementById("projectBoqRegistrySummary");
 if(status)status.textContent="ردیف‌ها: "+s.rowCount+" | مقدار محاسبه‌شده: "+s.calculated+" | نیازمند داده/متره: "+s.pending+" | قیمت‌گذاری: جداگانه";
 const body=document.getElementById("projectBoqRegistryRows");if(!body)return;body.replaceChildren();
 snapshot.rows.forEach(r=>{
  const tr=document.createElement("tr");
  [r.category,r.description,r.unit,r.quantity===null?"نامشخص":r.quantity,r.status==="calculated"?"محاسبه‌شده":"نیازمند داده",r.aggregationRole==="summary"?"جمع‌بندی؛ با جزئیات جمع نشود":"جزئیات",r.source,r.basis].forEach(v=>{const td=document.createElement("td");td.textContent=String(v??"");tr.appendChild(td);});
  body.appendChild(tr);
 });
 const warn=document.getElementById("projectBoqRegistryWarnings");if(warn)warn.textContent=snapshot.warnings.join(" | ")||"هشدار تجمیع ثبت نشده است.";
}
function csv(snapshot){
 const rows=[["بخش","شرح","واحد","مقدار","وضعیت","نقش ردیف","منبع","مبنای محاسبه","وزن افزوده (kg)"],...snapshot.rows.map(r=>[r.category,r.description,r.unit,r.quantity??"",r.status,r.aggregationRole,r.source,r.basis,r.massKg??""]),["ملاحظات",snapshot.pricingStatus],...snapshot.warnings.map(w=>["هشدار",w])];
 return"\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
}
function refresh(){
 const model=root.SteelStructuralModel?.getData?.()||root.SteelStructuralModel?.model||null;
 const data={quantity:root.SteelQuantityTakeoff?.lastResult||null,foundation:root.SteelFoundationTakeoff?.getLast?.()||null,
  anchor:root.SteelAnchorBaseplateTakeoff?.getLast?.()||null,steelMass:model?root.SteelFabricationTakeoff?.steelMass?.(model)||null:null,
  cost:root.SteelCostEstimate?.getLast?.()||null,costInputs:root.SteelCostEstimate?.getData?.()||null,siteWork:root.SteelSiteWorkTakeoff?.getData?.()?.calculation||null,model};
 const snapshot=buildSnapshot(data);root.SteelProjectBOQ.lastSnapshot=snapshot;render(snapshot);return clone(snapshot);
}
function download(){
 const snapshot=refresh(),blob=new Blob([csv(snapshot)],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="SAHROUD-STEEL-Project-BOQ.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 if(document.getElementById("projectBoqRegistryPanel"))return;
 const anchor=document.getElementById("costEstimatePanel")||document.getElementById("quantityTakeoffPanel")||document.querySelector("main");
 if(!anchor)return;
 const panel=document.createElement("section");panel.id="projectBoqRegistryPanel";panel.className="panel";
 panel.innerHTML="<div class='panel-title'><h3>فهرست یکپارچه متره و برآورد پروژه</h3><span class='status'>تجمیع مقادیر ثبت‌شده</span></div><div class='notice' id='projectBoqRegistrySummary'>هنوز داده‌ای تجمیع نشده است.</div><div class='button-grid'><button type='button' class='btn secondary' id='btnRefreshProjectBOQ'>به‌روزرسانی فهرست متره</button><button type='button' class='btn secondary' id='btnExportProjectBOQ'>خروجی CSV فهرست مقادیر</button></div><div style='overflow-x:auto'><table class='data-table' style='width:100%;min-width:900px'><thead><tr><th>بخش</th><th>شرح</th><th>واحد</th><th>مقدار</th><th>وضعیت</th><th>نقش ردیف</th><th>منبع</th><th>مبنای محاسبه</th></tr></thead><tbody id='projectBoqRegistryRows'></tbody></table></div><div class='notice' id='projectBoqRegistryWarnings'></div>";
 anchor.insertAdjacentElement("afterend",panel);
 document.getElementById("btnRefreshProjectBOQ").addEventListener("click",refresh);
 document.getElementById("btnExportProjectBOQ").addEventListener("click",download);
 refresh();
}
function selfTest(){
 const d=buildSnapshot({quantity:{totals:{roofCoverAreaApproxM2:100},facades:[{face:"front",material:"brick",netAreaM2:20,masonryVolumeM3:7,estimatedBrickCount:2000,estimatedMortarVolumeM3:1,plasterAreaM2:40}]},
 foundation:{quantities:{footingConcreteM3:2,pedestalConcreteM3:null,tieConcreteM3:1,totalConcreteM3:3,excavationM3:null,footingFormworkM2:8,pedestalFormworkM2:null,tieSideFormworkM2:3,totalFormworkM2:11,sideFormworkM2:11,footingRebarKg:100,pedestalRebarKg:null,tieRebarKg:null,totalRebarKg:null,anchorsCount:24,footingSchedule:[{nodeId:"B1",width:1.25,length:2,thickness:0.8,excavationM3:5}],tieRebarSchedule:[{id:"TB1",longitudinalMassKg:100,stirrupMassKg:20,totalMassKg:120,passesThroughFootings:true}]}},
 anchor:{boltCount:24,boltShankMassKg:80,nutCount:48,nutMassKg:1.2,washerCount:24,washerMassKg:0.2,basePlateCount:8,basePlateMassKg:120,totalCalculatedMassKg:201.4},
 steelMass:{groups:[{group:"column",label:"ستون",massKg:500}],connectionPlateMassKg:50,boltShankMassKg:10,theoreticalWeldMetalMassKg:5,procurementMassExcludingBoltsAndWeldKg:600,items:[]},cost:{rows:[{key:"foundationConcrete",unitPrice:100,cost:300},{key:"foundationRebar",unitPrice:200,cost:20000},{key:"excavation",unitPrice:50,cost:250},{key:"formwork",unitPrice:75,cost:825},{key:"anchorBolts",unitPrice:500,cost:12000}]},siteWork:{excavationM3:30,backfillM3:12,fillGrossM3:null,fillNetM3:null,slabConcreteM3:15,slabCementKg:5250,warnings:[]}});
 const by=new Map(d.rows.map(r=>[r.id,r]));
 const siteWorkBy=new Map(buildSnapshot({siteWork:{excavationM3:30,backfillM3:12,fillGrossM3:null,fillNetM3:null,slabConcreteM3:15,slabCementKg:5250,warnings:[]}}).rows.map(r=>[r.id,r]));
 const tests={
  siteWorkRowsCaptured:siteWorkBy.get("sitework-trench-excavation")?.quantity===30&&siteWorkBy.get("sitework-backfill")?.quantity===12&&siteWorkBy.get("sitework-floor-concrete")?.quantity===15&&siteWorkBy.get("sitework-floor-cement")?.quantity===5250,
  continuousTieBarRowsCaptured:by.get("tie-rebar-TB1-longitudinal")?.quantity===100&&by.get("tie-rebar-TB1-stirrups")?.quantity===20&&by.get("foundation-tie-rebar")?.aggregationRole==="summary",
  missingSiteWorkQuantityRemainsPending:siteWorkBy.get("sitework-ground-fill-net")?.quantity===null&&siteWorkBy.get("sitework-ground-fill-net")?.status==="pending",
  missingQuantityRemainsNull:by.get("foundation-excavation").quantity===null&&by.get("foundation-excavation").status==="pending",
  noAggregateConcreteDoubleCount:by.get("foundation-total-concrete")?.aggregationRole==="summary"&&by.get("foundation-footing-concrete")?.aggregationRole==="summary",
  foundationComponentsSeparate:by.get("foundation-footing-concrete").quantity===2&&by.get("foundation-tie-concrete").quantity===1,
  facadeItemsCaptured:by.get("masonry-front-volume").quantity===7&&by.get("plaster-front").quantity===40,
  steelMassCaptured:by.get("steel-mass-column").quantity===500,
  anchorCountsCaptured:by.get("anchor-bolt-count").quantity===24,
  stableIdsUnique:d.summary.duplicateIds.length===0,
  unitsRetained:by.get("anchor-bolt-count").unit==="عدد"&&by.get("steel-mass-column").unit==="kg",
  sourceTraceabilityRetained:by.get("foundation-footing-concrete").source==="متره فونداسیون",
  missingSourceProducesWarning:buildSnapshot({}).warnings.length>=3,
  summaryRowsExplicitlyMarked:by.get("foundation-footing-concrete").aggregationRole==="summary"&&by.get("foundation-footing-rebar").aggregationRole==="summary",
  footingDetailRowsNotMarkedAsSummary:by.get("footing-B1")?.aggregationRole!=="summary",
  anchorCountFallbackUsed:buildSnapshot({foundation:{quantities:{anchorsCount:12}}}).rows.find(x=>x.id==="foundation-anchor-count")?.quantity===12,
  anchorModuleCountPreventsDuplicate:!buildSnapshot({foundation:{quantities:{anchorsCount:12}},anchor:{boltCount:16}}).rows.some(x=>x.id==="foundation-anchor-count"),
  knownFootingFormworkRetainedWithoutTie:buildSnapshot({foundation:{quantities:{footingFormworkM2:10,tieSideFormworkM2:null}}}).rows.find(x=>x.id==="foundation-footing-formwork")?.quantity===10,
  footingAndTrenchExcavationSeparated:by.get("footing-B1")?.quantity===2&&by.get("excavation-B1")?.quantity===5,
  incompleteConcreteTotalRemainsUnknown:buildSnapshot({foundation:{quantities:{footingConcreteM3:2,pedestalConcreteM3:null,tieConcreteM3:null,totalConcreteM3:null}}}).rows.find(x=>x.id==="foundation-total-concrete")?.quantity===null,
  totalConcreteAndFormworkAreSummaries:by.get("foundation-total-concrete")?.aggregationRole==="summary"&&by.get("foundation-total-formwork")?.aggregationRole==="summary",
  totalRebarRequiresAllComponents:by.get("foundation-total-rebar")?.quantity===null,
  anchorNutWasherMassCaptured:by.get("anchor-nut-mass")?.quantity===1.2&&by.get("anchor-washer-mass")?.quantity===0.2&&by.get("anchor-total-mass")?.aggregationRole==="summary",
  foundationCostAliasesAttached:by.get("foundation-total-concrete")?.pricing?.unitPrice===100&&by.get("foundation-footing-rebar")?.pricing?.unitPrice===200&&by.get("foundation-total-formwork")?.pricing?.unitPrice===75&&by.get("foundation-excavation")?.pricing?.unitPrice===50&&by.get("anchor-bolt-count")?.pricing?.unitPrice===500
 };
 return{passed:Object.values(tests).filter(Boolean).length,failed:Object.values(tests).filter(x=>!x).length,tests};
}
root.SteelProjectBOQ={refresh,buildSnapshot,csv,selfTest,lastSnapshot:null};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
