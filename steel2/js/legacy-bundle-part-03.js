/* ===== steel2/js/site-work-takeoff.js ===== */
/* SAHROUD STEEL — site earthwork and floor concrete takeoff
 * Explicit site-method quantities; no assumed ground levels or hidden soil-displacement factors.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const positive=v=>v!==null&&v!==undefined&&String(v).trim()!==""&&Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;
const nonnegative=v=>v!==null&&v!==undefined&&String(v).trim()!==""&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
let state={method:"tie-corridor-cut",transverseFootingWidthM:"",excavationWidthFactor:"1.5",excavationDepthToBlindingM:"",lowGroundFillDepthM:"",floorAreaOverrideM2:"",displacedConcreteM3:"",blindingThicknessM:"",blindingOverhangM:"",slabThicknessM:"0.15",cementKgPerM3:"350"};
function geometryArea(){const span=positive($("span")?.value),length=positive($("length")?.value);return span&&length?span*length:null;}
function routeGeometry(){
 const data=root.SteelTieBeamLayout?.getData?.(),audit=root.SteelTieBeamLayout?.audit?.();
 if(!Array.isArray(data?.routes)||!data.routes.length||!Array.isArray(audit?.rows))return{complete:false,lengthM:null,count:0,warnings:["مسیر واقعی شناژ در مدل تعریف نشده است."]};
 const by=new Map(audit.rows.map(r=>[String(r.id),r])),rows=[],warnings=[],foundation=root.SteelFoundationTakeoff,fd=foundation?.getData?.()||{},model=root.SteelStructuralModel?.getData?.()||root.SteelStructuralModel?.model||{},nodes=model.nodes||[];
 for(const route of data.routes){const r=by.get(String(route.id));if(!r||!(Number(r.lengthM)>0)||!r.section||!Number.isFinite(Number(r.lengthM))){warnings.push("هندسه مسیر "+route.id+" معتبر نیست.");continue;}const geometryIssues=(r.reasons||[]).filter(x=>x!=="نوع اتصال دو سر کامل تعیین نشده");if(geometryIssues.length){warnings.push("مسیر "+route.id+" از نظر هندسی نیازمند اصلاح است: "+geometryIssues.join("، "));continue;}
  const path=foundation?.footingsAlongStraightRoute?.(nodes,route),transverseDimensions=path?.ok?path.footings.map(point=>{const spec=fd.footingSchedule?.[String(point.node.id)]||foundation?.defaultFootingSpec?.(point.node)||{};return r.axis==="X"?Number(spec.length):Number(spec.width);}):[];
  const transverseFootingWidthM=transverseDimensions.length&&transverseDimensions.every(v=>Number.isFinite(v)&&v>0)?Math.max(...transverseDimensions):null;
  if(transverseFootingWidthM===null)warnings.push("عرض پی عمود بر مسیر شناژ "+route.id+" از جدول پی‌ها قابل استخراج نیست؛ عرض را دستی وارد کنید.");
  else if(new Set(transverseDimensions.map(v=>v.toFixed(4))).size>1)warnings.push("ابعاد پی‌های واقع در مسیر "+route.id+" متفاوت است؛ عرض ترانشه با بزرگ‌ترین بعد عمود بر مسیر محاسبه می‌شود.");
  rows.push({id:route.id,lengthM:Number(r.lengthM),axis:r.axis,transverseFootingWidthM});if((r.reasons||[]).length)warnings.push("اتصال مسیر "+route.id+" هنوز نیازمند تکمیل جزئیات است.");}
 return{complete:rows.length===data.routes.length,lengthM:rows.length===data.routes.length?rows.reduce((s,r)=>s+r.lengthM,0):null,count:rows.length,rows,warnings};
}
function footingSpecs(){
 const api=root.SteelFoundationTakeoff,fd=api?.getData?.()||{},model=root.SteelStructuralModel?.getData?.()||root.SteelStructuralModel?.model||{};
 return(model.nodes||[]).filter(node=>node&&(node.kind==="base"||node.kind==="endwall-base")).map(node=>{const spec=fd.footingSchedule?.[String(node.id)]||api?.defaultFootingSpec?.(node)||{};return{nodeId:String(node.id),width:Number(spec.width),length:Number(spec.length)};});
}
function calculate(input){
 const x={...state,...(input||{})},area=positive(x.floorAreaOverrideM2)||geometryArea(),slabT=positive(x.slabThicknessM),cement=positive(x.cementKgPerM3),slabConcrete=area&&slabT?area*slabT:null,blindingT=positive(x.blindingThicknessM),blindingOverhang=nonnegative(x.blindingOverhangM),footingRows=Array.isArray(x.footingRows)?x.footingRows:footingSpecs(),blindingComplete=!!(blindingT&&blindingOverhang!==null&&footingRows.length&&footingRows.every(row=>positive(row.width)&&positive(row.length))),blindingSchedule=blindingComplete?footingRows.map(row=>({nodeId:row.nodeId,widthM:Number(row.width),lengthM:Number(row.length),overhangM:blindingOverhang,areaM2:(Number(row.width)+2*blindingOverhang)*(Number(row.length)+2*blindingOverhang),concreteM3:(Number(row.width)+2*blindingOverhang)*(Number(row.length)+2*blindingOverhang)*blindingT})):[],blindingAreaM2=blindingComplete?blindingSchedule.reduce((sum,row)=>sum+row.areaM2,0):null,blindingConcreteM3=blindingComplete?blindingSchedule.reduce((sum,row)=>sum+row.concreteM3,0):null;
 const route=x.routeGeometry||routeGeometry(),widthBase=positive(x.transverseFootingWidthM),factor=positive(x.excavationWidthFactor),depth=positive(x.excavationDepthToBlindingM),fillDepth=positive(x.lowGroundFillDepthM),displacement=nonnegative(x.displacedConcreteM3);
 let excavation=null,backfill=null,fillGross=null,fillNet=null,excavationWidth=null,excavationSchedule=[],methodWarnings=[...route.warnings];
 if(x.method==="tie-corridor-cut"){
  excavationSchedule=route.complete&&factor&&depth?((route.rows)||[]).map(row=>{const baseWidth=widthBase||row.transverseFootingWidthM;return{id:row.id,lengthM:row.lengthM,transverseFootingWidthM:baseWidth,excavationWidthM:baseWidth?baseWidth*factor:null,excavationM3:baseWidth?row.lengthM*baseWidth*factor*depth:null};}):[];
  const excavationComplete=excavationSchedule.length===route.count&&excavationSchedule.every(row=>Number.isFinite(row.excavationM3)&&row.excavationM3>=0);
  if(factor&&depth&&route.complete&&excavationComplete){excavationWidth=widthBase?widthBase*factor:null;excavation=excavationSchedule.reduce((sum,row)=>sum+row.excavationM3,0);
   if(displacement!==null&&displacement<=excavation)backfill=excavation-displacement;
   else if(displacement!==null&&displacement>excavation)methodWarnings.push("حجم بتنِ کاهنده از حجم خاکبرداری بیشتر است؛ خاکریزی محاسبه نشد.");
   else methodWarnings.push("برای خاکریزی خالص، حجم بتن مدفون داخل محدوده خاکبرداری باید جداگانه وارد شود.");
  }else methodWarnings.push("برای خاکبرداری ترانشه، عمق تا زیر بتن مگر، مسیرهای معتبر و عرض پی عمود بر مسیر (از جدول پی یا ورودی دستی) لازم است.");
 }else if(x.method==="low-ground-fill"){
  if(area&&fillDepth){fillGross=area*fillDepth;if(displacement!==null&&displacement<=fillGross)fillNet=fillGross-displacement;else if(displacement!==null)methodWarnings.push("حجم بتن مدفون از حجم خاکریزی ناخالص بیشتر است؛ خاکریزی خالص محاسبه نشد.");else methodWarnings.push("برای خاکریزی خالص تا تراز صفحه‌ستون/کف، حجم اشغال‌شده بتن مدفون را وارد کنید.");}
  else methodWarnings.push("مساحت کف سوله و اختلاف تراز زمین موجود تا تراز نهایی کف/صفحه‌ستون لازم است.");
 }else methodWarnings.push("روش اجرایی خاک نامعتبر است.");
 return{method:x.method,floorAreaM2:area,blindingThicknessM:blindingT,blindingOverhangM:blindingOverhang,blindingAreaM2,blindingConcreteM3,blindingSchedule,slabThicknessM:slabT,slabConcreteM3:slabConcrete,cementKgPerM3:cement,slabCementKg:slabConcrete&&cement?slabConcrete*cement:null,
 excavationWidthM:excavationWidth,excavationSchedule:x.method==="tie-corridor-cut"?excavationSchedule:[],routeLengthM:route.lengthM,routeCount:route.count,excavationM3:excavation,backfillM3:backfill,fillGrossM3:fillGross,fillNetM3:fillNet,displacedConcreteM3:displacement,routeWarnings:route.warnings,warnings:methodWarnings,
 basis:x.method==="tie-corridor-cut"?"طول مسیرهای شناژ × عرض ترانشه (۱٫۵ برابر عرض پی عمود بر مسیر، قابل ویرایش) × عمق تا زیر بتن مگر؛ هم‌پوشانی مسیرها و گود پی‌های خارج از این نوار کسر نشده است.":"مساحت کف سوله × ارتفاع متوسط خاکریزی تا تراز نهایی؛ حجم بتن مدفون فقط با ورودی مستقل کسر می‌شود.",
 limitations:["خاکبرداری ترانشه به‌صورت حجم ناخالص مسیرهاست؛ هم‌پوشانی مسیرهای متقاطع/مجاور و گودهای مستقل پی‌ها هنوز با هندسه سه‌بعدی union نشده‌اند.","خاکریزی خالص فقط پس از ورود حجم بتن مدفونِ واقع در همان محدوده محاسبه می‌شود؛ حجم کل بتن پروژه را بدون تطبیق محدوده وارد نکنید.","بتن مگر، زیرسازی و تراکم لایه‌ای، حمل خاک، تورم/افت حجمی، آبکشی، شیب دیواره و پایدارسازی گود در این محاسبه نیست.","بتن کف با ضخامت و عیار سیمان ورودی محاسبه می‌شود؛ شبکه/الیاف، درزها، زیرسازی، مش، پرداخت و پرت جداگانه‌اند."]};
}
function read(){const ids={method:"siteWorkMethod",transverseFootingWidthM:"siteWorkFootingWidth",excavationWidthFactor:"siteWorkWidthFactor",excavationDepthToBlindingM:"siteWorkExcDepth",lowGroundFillDepthM:"siteWorkFillDepth",floorAreaOverrideM2:"siteWorkFloorArea",displacedConcreteM3:"siteWorkDisplacement",blindingThicknessM:"siteWorkBlindingThickness",blindingOverhangM:"siteWorkBlindingOverhang",slabThicknessM:"siteWorkSlabThickness",cementKgPerM3:"siteWorkCement"};Object.entries(ids).forEach(([k,id])=>{if($(id))state[k]=$(id).value;});}
function render(){const r=calculate();const host=$("siteWorkTakeoffSummary");if(host){host.textContent=["مساحت کف: "+(r.floorAreaM2??"نامشخص")+" m²","بتن مگر زیر پی: "+(r.blindingConcreteM3??"نیازمند ضخامت، پیش‌آمدگی و جدول پی")+" m³","بتن کف: "+(r.slabConcreteM3??"نامشخص")+" m³","سیمان معادل عیار: "+(r.slabCementKg??"نامشخص")+" kg","خاکبرداری ترانشه: "+(r.excavationM3??"نامشخص")+" m³","خاکریزی/پرکردن خالص: "+(r.backfillM3??r.fillNetM3??"نامشخص")+" m³",...r.warnings,...r.limitations].join(" | ");}root.SteelSiteWorkTakeoff.lastResult=r;root.SteelCostEstimate?.refreshFromSiteWork?.(r);root.SteelProjectBOQ?.refresh?.();return r;}
function save(){try{localStorage.setItem("sahroudSteelSiteWorkTakeoff",JSON.stringify(state));}catch(e){}root.SteelProject?.scheduleAutoSave?.();}
function mount(){if($("siteWorkTakeoffPanel"))return;const anchor=$("tieBeamLayoutPanel")||$("foundationTakeoffPanel")||$("costEstimatePanel");if(!anchor)return;const p=document.createElement("section");p.id="siteWorkTakeoffPanel";p.className="panel";
p.innerHTML='<div class="panel-title"><h3>متره خاک‌برداری، خاک‌ریزی و بتن کف سوله</h3><span class="status">وابسته به روش اجرا و ترازهای پروژه</span></div><div class="notice">روش اجرا را انتخاب کنید. مقادیر نامعلوم صفر فرض نمی‌شوند. عرض ترانشه در حالت اول برای هر مسیر از ۱٫۵ برابر بزرگ‌ترین بعد پی عمود بر محور شناژ در طول همان مسیر استخراج می‌شود؛ در صورت نیاز می‌توانید عرض مبنا را دستی وارد کنید. این ضریب قابل تغییر است. هم‌پوشانی مسیرها فعلاً به‌صورت خودکار کسر نمی‌شود.</div><div class="form-grid"><div class="field"><label for="siteWorkMethod">روش آماده‌سازی زمین</label><select id="siteWorkMethod"><option value="tie-corridor-cut">زمین هم‌تراز؛ خاکبرداری مسیر شناژ تا زیر بتن مگر</option><option value="low-ground-fill">زمین گود؛ خاکریزی پس از قالب‌برداری تا تراز کف/صفحه‌ستون</option></select></div><div class="field"><label for="siteWorkFootingWidth">عرض پی عمود بر محور شناژ (m؛ خالی=استخراج خودکار از جدول پی)</label><input id="siteWorkFootingWidth" type="number" min="0" step="0.05" placeholder="از جدول پی‌ها"></div><div class="field"><label for="siteWorkWidthFactor">ضریب عرض ترانشه نسبت به عرض پی</label><input id="siteWorkWidthFactor" type="number" min="0.1" step="0.05" value="1.5"></div><div class="field"><label for="siteWorkExcDepth">عمق از زمین موجود تا زیر بتن مگر (m)</label><input id="siteWorkExcDepth" type="number" min="0" step="0.05" placeholder="از ترازهای پروژه"></div><div class="field"><label for="siteWorkFillDepth">ارتفاع متوسط خاکریزی تا تراز نهایی کف (m)</label><input id="siteWorkFillDepth" type="number" min="0" step="0.05" placeholder="فقط برای زمین گود"></div><div class="field"><label for="siteWorkFloorArea">مساحت کف سوله (m²؛ خالی=دهانه×طول)</label><input id="siteWorkFloorArea" type="number" min="0" step="1" placeholder="خودکار از هندسه سوله"></div><div class="field"><label for="siteWorkDisplacement">حجم بتن مدفون داخل محدوده خاکی (m³)</label><input id="siteWorkDisplacement" type="number" min="0" step="0.1" placeholder="برای خاکریزی خالص؛ فقط حجم واقع در محدوده"></div><div class="field"><label for="siteWorkBlindingThickness">ضخامت بتن مگر زیر پی (m؛ طبق نقشه)</label><input id="siteWorkBlindingThickness" type="number" min="0" step="0.01" placeholder="طبق نقشه"></div><div class="field"><label for="siteWorkBlindingOverhang">پیش‌آمدگی بتن مگر از هر طرف پی (m)</label><input id="siteWorkBlindingOverhang" type="number" min="0" step="0.01" placeholder="طبق جزئیات اجرایی؛ صفر مجاز است"></div><div class="field"><label for="siteWorkSlabThickness">ضخامت بتن کف (m)</label><input id="siteWorkSlabThickness" type="number" min="0" step="0.01" value="0.15"></div><div class="field"><label for="siteWorkCement">عیار سیمان بتن کف (kg/m³)</label><input id="siteWorkCement" type="number" min="0" step="10" value="350"></div></div><div class="button-grid"><button type="button" class="btn primary" id="btnCalcSiteWork">محاسبه متره خاکی و کف</button></div><div id="siteWorkTakeoffSummary" class="notice">برای محاسبه، ترازها و ابعاد واقعی را وارد کنید.</div><div class="notice">تذکر اجرایی: بتن کف ۱۵ سانتی‌متر و عیار سیمان ۳۵۰ kg/m³ مطابق مبنای فعلی پروژه ثبت شده‌اند، اما قابل ویرایش‌اند و جایگزین طراحی کف بر اساس بار چرخ، بار قفسه/ماشین‌آلات، بستر، درزها و آرماتور نیستند.</div>';
anchor.insertAdjacentElement("afterend",p);Object.keys(state).forEach(k=>{const id=({method:"siteWorkMethod",transverseFootingWidthM:"siteWorkFootingWidth",excavationWidthFactor:"siteWorkWidthFactor",excavationDepthToBlindingM:"siteWorkExcDepth",lowGroundFillDepthM:"siteWorkFillDepth",floorAreaOverrideM2:"siteWorkFloorArea",displacedConcreteM3:"siteWorkDisplacement",blindingThicknessM:"siteWorkBlindingThickness",blindingOverhangM:"siteWorkBlindingOverhang",slabThicknessM:"siteWorkSlabThickness",cementKgPerM3:"siteWorkCement"})[k];if($(id))$(id).value=state[k];});p.querySelectorAll("input,select").forEach(el=>el.addEventListener("change",()=>{read();render();save();}));$("btnCalcSiteWork").addEventListener("click",()=>{read();render();save();});render();}
function getData(){read();return{...state,calculation:calculate()};}
function setData(d){if(!d||typeof d!=="object")return;Object.keys(state).forEach(k=>{if(d[k]!==undefined)state[k]=String(d[k]);});if(document.readyState!=="loading"&&$("siteWorkTakeoffPanel")){Object.entries({method:"siteWorkMethod",transverseFootingWidthM:"siteWorkFootingWidth",excavationWidthFactor:"siteWorkWidthFactor",excavationDepthToBlindingM:"siteWorkExcDepth",lowGroundFillDepthM:"siteWorkFillDepth",floorAreaOverrideM2:"siteWorkFloorArea",displacedConcreteM3:"siteWorkDisplacement",blindingThicknessM:"siteWorkBlindingThickness",blindingOverhangM:"siteWorkBlindingOverhang",slabThicknessM:"siteWorkSlabThickness",cementKgPerM3:"siteWorkCement"}).forEach(([k,id])=>{if($(id))$(id).value=state[k];});render();}}
function selfTest(){const a=calculate({method:"tie-corridor-cut",transverseFootingWidthM:2,excavationWidthFactor:1.5,excavationDepthToBlindingM:1,slabThicknessM:.15,cementKgPerM3:350,floorAreaOverrideM2:100,displacedConcreteM3:10,routeGeometry:{complete:true,lengthM:20,count:1,rows:[{id:"TB1",lengthM:20,transverseFootingWidthM:2}],warnings:[]}});const b=calculate({method:"low-ground-fill",lowGroundFillDepthM:.8,floorAreaOverrideM2:100,displacedConcreteM3:20,slabThicknessM:.15,cementKgPerM3:350});const c=calculate({method:"low-ground-fill",lowGroundFillDepthM:.8,floorAreaOverrideM2:100,slabThicknessM:.15,cementKgPerM3:350});const tests={slabConcreteAndCement:a.slabConcreteM3===15&&a.slabCementKg===5250,fillNetSubtractsExplicitDisplacement:b.fillGrossM3===80&&b.fillNetM3===60,unknownDisplacementDoesNotAssumeZero:c.fillNetM3===null,excavationRequiresRouteAndDepth:calculate({method:"tie-corridor-cut",excavationWidthFactor:1.5,excavationDepthToBlindingM:1,routeGeometry:{complete:true,lengthM:20,count:1,rows:[{id:"TB1",lengthM:20,transverseFootingWidthM:1.8}],warnings:[]}}).excavationM3===54,blindingQuantityUsesExplicitGeometry:(()=>{const q=calculate({method:"low-ground-fill",blindingThicknessM:.1,blindingOverhangM:.1,footingRows:[{nodeId:"F1",width:2,length:3}]});return Math.abs(q.blindingConcreteM3-.704)<1e-9&&Math.abs(q.blindingAreaM2-7.04)<1e-9;})(),blindingMissingOverhangRemainsUnknown:calculate({method:"low-ground-fill",blindingThicknessM:.1,footingRows:[{nodeId:"F1",width:2,length:3}]}).blindingConcreteM3===null,defaultExcavationFactorIsOnePointFive:state.excavationWidthFactor==="1.5"};return{passed:Object.values(tests).filter(Boolean).length,failed:Object.values(tests).filter(v=>!v).length,tests};}
root.SteelSiteWorkTakeoff={getData,setData,calculate,selfTest,lastResult:null};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tie-beam-reinforcement.js ===== */
/* SAHROUD STEEL — preliminary tie-beam reinforcement screening.
 * Uses actions from the latest 3D analysis. Not code-certified design.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const defaults={fyMPa:400,coverMm:40,barDiaMm:16,stirrupDiaMm:10,stirrupLegs:2,clearSpacingMm:25,hookCutAllowancePerEndMm:0,stirrupSpacingFallbackMm:200,stirrupBendRadiusMm:20,stirrupHookExtensionPerEndMm:0,sideBarsPerSide:0,phiFlexure:0.90,phiShear:0.75,lambdaConcrete:1.0,EsMPa:200000,alpha1:0.85,beta1:0.85,epsilonCu:0.003};
 let settings={...defaults},latest=null,lastReport=null;
 const fmt=(v,d=2)=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:d});
 function mount(){
  if($("tieBeamRebarPanel"))return;
  const anchor=$("tieBeamLayoutPanel");if(!anchor)return;
  const p=document.createElement("section");p.className="panel";p.id="tieBeamRebarPanel";
  p.innerHTML='<div class="panel-title"><h3>کنترل مقدماتی آرماتور شناژ بر اساس نیروهای تحلیل</h3><span class="status">غربال اولیه؛ نه طراحی نهایی</span></div>'+
  '<div class="notice">پس از اجرای تحلیل سه‌بعدی، نیروهای انتهایی هر شناژ از نتیجه حل‌گر خوانده می‌شوند. برای برآورد خمشی از رابطه تعادل مقطع مستطیلی و منحنی سازگاری کرنش استفاده می‌شود. کنترل مقدماتی برش با مشارکت بتن و خاموت بر اساس روابط مبحث ۹ ویرایش ۱۳۹۹ انجام می‌شود؛ ویرایش معتبر، اصلاحیه‌ها، ضوابط لرزه‌ای و جزئیات مهاری باید برای پروژه تأیید شوند.</div>'+
  '<div class="form-grid">'+
  '<div class="field"><label for="tbrFy">تنش تسلیم میلگرد fy (MPa)</label><input id="tbrFy" type="number" min="200" max="700" step="5" value="400"></div>'+
  '<div class="field"><label for="tbrCover">پوشش بتن (mm)</label><input id="tbrCover" type="number" min="20" max="100" step="5" value="40"></div>'+
  '<div class="field"><label for="tbrBarDia">قطر پیشنهادی میلگرد طولی (mm)</label><select id="tbrBarDia"><option>12</option><option>14</option><option selected>16</option><option>18</option><option>20</option><option>22</option><option>25</option><option>28</option><option>32</option></select></div>'+
  '<div class="field"><label for="tbrStirrupDia">قطر خاموت (mm)</label><input id="tbrStirrupDia" type="number" min="6" max="16" step="1" value="10"></div>'+
  '<div class="field"><label for="tbrLegs">تعداد شاخه مؤثر خاموت</label><select id="tbrLegs"><option value="2" selected>۲ شاخه</option><option value="4">۴ شاخه</option></select></div>'+
  '<div class="field"><label for="tbrClearSpacing">فاصله آزاد هندسی پیشنهادی میلگردها (mm)</label><input id="tbrClearSpacing" type="number" min="10" max="100" step="1" value="25"></div><div class="field"><label for="tbrHookAllowance">افزوده طول برش قلاب در هر انتها (mm) — ورود دستی</label><input id="tbrHookAllowance" type="number" min="0" max="1000" step="5" value="0"></div><div class="field"><label for="tbrStirrupSpacing">فاصله خاموت مبنا در نبود خروجی طراحی (mm) — موقت</label><input id="tbrStirrupSpacing" type="number" min="50" max="500" step="10" value="200"></div><div class="field"><label for="tbrStirrupRadius">شعاع خم محور خاموت (mm) — دستی</label><input id="tbrStirrupRadius" type="number" min="0" max="100" step="1" value="20"></div><div class="field"><label for="tbrStirrupHook">طول دنباله قلاب خاموت در هر سر (mm) — دستی</label><input id="tbrStirrupHook" type="number" min="0" max="300" step="5" value="0"></div><div class="field"><label>آرایش پایه میلگرد طولی</label><div class="hint">۳ عدد میلگرد ۱۶ بالا و ۳ عدد میلگرد ۱۶ پایین؛ بدون میلگرد میانی جانبی. نرم‌افزار در صورت نیاز محاسباتی، افزایش تعداد یا قطر را پیشنهاد می‌کند.</div></div>'+
  '<div class="field"><label for="tbrPhi">ضریب مقاومت خمشی فرضی φ (غربال مقدماتی)</label><input id="tbrPhi" type="number" min="0.5" max="1" step="0.01" value="0.90"></div>'+
  '<div class="field"><label for="tbrPhiShear">ضریب مقاومت برشی φ</label><input id="tbrPhiShear" type="number" min="0.5" max="0.9" step="0.01" value="0.75"></div><div class="field"><label for="tbrLambda">ضریب بتن معمولی/سبک λ</label><input id="tbrLambda" type="number" min="0.75" max="1" step="0.01" value="1.0"></div><div class="field"><label for="tbrEs">مدول فولاد Es (MPa)</label><input id="tbrEs" type="number" min="150000" max="220000" step="1000" value="200000"></div>'+
  '<div class="field"><label for="tbrAlpha">ضریب بلوک تنش α1</label><input id="tbrAlpha" type="number" min="0.5" max="1" step="0.01" value="0.85"></div>'+
  '<div class="field"><label for="tbrBeta">ضریب عمق بلوک β1</label><input id="tbrBeta" type="number" min="0.5" max="1" step="0.01" value="0.85"></div>'+
  '<div class="field"><label for="tbrEpsCu">کرنش حدی بتن εcu</label><input id="tbrEpsCu" type="number" min="0.002" max="0.004" step="0.0001" value="0.003"></div>'+
  '</div><div class="notice">مقادیر fy=400، پوشش ۴۰، قطر طولی ۱۶، φ خمشی=۰٫۹ و φ برشی=۰٫۷۵ صرفاً پیش‌فرض غربال اولیه‌اند؛ باید با مشخصات واقعی میلگرد، شرایط محیطی، حریق، قطر سنگدانه و آیین‌نامه پروژه تطبیق داده شوند.</div>'+
  '<div class="button-grid"><button type="button" class="btn secondary" id="btnRunTieRebarScreen">محاسبه مقدماتی آرماتور از آخرین تحلیل</button><button type="button" class="btn secondary" id="btnResetTieRebarDefaults">بازگردانی پیش‌فرض‌ها</button></div>'+
  '<div id="tieRebarStatus" class="notice">ابتدا تحلیل سه‌بعدی را اجرا کنید؛ سپس کنترل مقدماتی در این قسمت قابل انجام است.</div>'+
  '<div id="tieRebarOutput" class="result-box">هنوز نتیجه‌ای محاسبه نشده است.</div>'+
  '<div class="notice">این محاسبه حداقل آرماتور آیین‌نامه‌ای، کنترل ترک، خیز، دوام، حداکثر فاصله میلگرد، محدودیت فاصله خاموت، برش بتن، پیچش، اثر زلزله، مهاری و وصله را تعیین نمی‌کند. فاصله خاموت از برش بتن و فولاد، حداقل فولاد برشی و محدودیت فاصله فصل ۱۱ محاسبه می‌شود؛ با این حال کنترل پیچش، زلزله، آرایش واقعی خاموت و جزئیات اجرایی هنوز کامل نیست.</div>';
  anchor.parentNode.insertBefore(p,anchor.nextSibling);
  ["tbrFy","tbrCover","tbrBarDia","tbrStirrupDia","tbrLegs","tbrClearSpacing","tbrHookAllowance","tbrStirrupSpacing","tbrStirrupRadius","tbrStirrupHook","tbrPhi","tbrPhiShear","tbrLambda","tbrEs","tbrAlpha","tbrBeta","tbrEpsCu"].forEach(id=>$(id).addEventListener("change",read));
  $("btnRunTieRebarScreen").addEventListener("click",()=>render(true));
  $("btnResetTieRebarDefaults").addEventListener("click",()=>{settings={...defaults};write();render(false);});
  write();
 }
 function read(){
  if(!$("tbrFy"))return;
  settings={fyMPa:Number($("tbrFy").value),coverMm:Number($("tbrCover").value),barDiaMm:Number($("tbrBarDia").value),stirrupDiaMm:Number($("tbrStirrupDia").value),stirrupLegs:Number($("tbrLegs").value),clearSpacingMm:Number($("tbrClearSpacing").value),hookCutAllowancePerEndMm:Number($("tbrHookAllowance").value),stirrupSpacingFallbackMm:Number($("tbrStirrupSpacing").value),stirrupBendRadiusMm:Number($("tbrStirrupRadius").value),stirrupHookExtensionPerEndMm:Number($("tbrStirrupHook").value),sideBarsPerSide:0,phiFlexure:Number($("tbrPhi").value),phiShear:Number($("tbrPhiShear").value),lambdaConcrete:Number($("tbrLambda").value),EsMPa:Number($("tbrEs").value),alpha1:Number($("tbrAlpha").value),beta1:Number($("tbrBeta").value),epsilonCu:Number($("tbrEpsCu").value)};
  try{localStorage.setItem("sahroudSteel.tieBeamRebarSettings.v1",JSON.stringify(settings));}catch(e){}
 }
 function write(){
  if(!$("tbrFy"))return;
  Object.entries({tbrFy:settings.fyMPa,tbrCover:settings.coverMm,tbrBarDia:settings.barDiaMm,tbrStirrupDia:settings.stirrupDiaMm,tbrLegs:settings.stirrupLegs,tbrClearSpacing:settings.clearSpacingMm,tbrHookAllowance:settings.hookCutAllowancePerEndMm,tbrStirrupSpacing:settings.stirrupSpacingFallbackMm,tbrStirrupRadius:settings.stirrupBendRadiusMm,tbrStirrupHook:settings.stirrupHookExtensionPerEndMm,tbrSideBars:settings.sideBarsPerSide,tbrPhi:settings.phiFlexure,tbrPhiShear:settings.phiShear,tbrLambda:settings.lambdaConcrete,tbrEs:settings.EsMPa,tbrAlpha:settings.alpha1,tbrBeta:settings.beta1,tbrEpsCu:settings.epsilonCu}).forEach(([id,v])=>{if($(id))$(id).value=v;});
 }
   function continuousBarPathDetail(routeLengthM,startFootingDimensionM,endFootingDimensionM,hookAllowancePerEndMm=0){
   if(!Number.isFinite(routeLengthM)||routeLengthM<=0||!Number.isFinite(startFootingDimensionM)||startFootingDimensionM<=0||!Number.isFinite(endFootingDimensionM)||endFootingDimensionM<=0||!Number.isFinite(hookAllowancePerEndMm)||hookAllowancePerEndMm<0)return{ok:false,reason:"طول مسیر، ابعاد پی ابتدا/انتها یا افزوده قلاب معتبر نیست"};
   const startExtensionM=startFootingDimensionM/2,endExtensionM=endFootingDimensionM/2,footingThroughLengthM=startExtensionM+endExtensionM,straightLengthPerBarM=routeLengthM+footingThroughLengthM,hookAllowancePerEndM=hookAllowancePerEndMm/1000;
   return{ok:true,routeLengthM,startFootingDimensionM,endFootingDimensionM,startExtensionM,endExtensionM,footingThroughLengthM,straightLengthPerBarM,hookAllowancePerEndMm,hookAllowancePerEndM,totalCutLengthPerBarM:straightLengthPerBarM+2*hookAllowancePerEndM,assumption:"میلگرد پیوسته از محور پی ابتدا تا محور پی انتها عبور می‌کند؛ نصف بعد پی در راستای شناژ در هر انتها افزوده می‌شود تا انتهای مستقیم تا وجه بیرونی پی برسد. قلاب فقط افزوده طول دستی است و شکل، جهت و طول مهاری آن تأیید آیین‌نامه‌ای نشده است."};
  }
  function longitudinalBarPathDetail(routeLengthM,footingDimensionM,hookAllowancePerEndMm=0){return continuousBarPathDetail(routeLengthM,footingDimensionM,footingDimensionM,hookAllowancePerEndMm);}
  function closedStirrupDetail(bMm,hMm,coverMm,diameterMm,bendRadiusMm,hookPerEndMm,lengthM,spacingMm){
   const vals=[bMm,hMm,coverMm,diameterMm,bendRadiusMm,hookPerEndMm,lengthM,spacingMm];
   if(vals.some(v=>!Number.isFinite(v))||bMm<=0||hMm<=0||coverMm<0||diameterMm<=0||bendRadiusMm<0||hookPerEndMm<0||lengthM<=0||spacingMm<=0)return{ok:false,reason:"ورودی هندسه خاموت معتبر نیست"};
   const centerB=bMm-2*coverMm-diameterMm,centerH=hMm-2*coverMm-diameterMm,r=bendRadiusMm;
   if(centerB<=2*r||centerH<=2*r)return{ok:false,reason:"شعاع خم برای ابعاد داخلی خاموت بیش از حد بزرگ است"};
   const straight=2*(centerB+centerH-4*r),arc=2*Math.PI*r,cutLength=straight+arc+2*hookPerEndMm;
   const count=Math.ceil(lengthM*1000/spacingMm)+1,actualSpacingMm=lengthM*1000/(count-1);
   return{ok:true,centerlineWidthMm:centerB,centerlineHeightMm:centerH,bendRadiusMm:r,straightLengthMm:straight,bendArcLengthMm:arc,hookExtensionPerEndMm:hookPerEndMm,cutLengthPerStirrupMm:cutLength,count,actualSpacingMm,totalCutLengthM:count*cutLength/1000,approximateMassKg:count*cutLength/1000*(diameterMm*diameterMm/162),spacingBasisMm:spacingMm};
  }
function areaBar(d){return Math.PI*d*d/4;}
 function barLayerCapacity(bMm,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm){
  const centerSpan=bMm-2*(coverMm+stirrupDiaMm+barDiaMm/2);
  const pitch=barDiaMm+clearSpacingMm;
  if(!(centerSpan>=0&&pitch>0))return{ok:false,maxBars:0,centerSpanMm:centerSpan};
  return{ok:true,maxBars:Math.floor(centerSpan/pitch+1e-9)+1,centerSpanMm:centerSpan};
 }
 function flexuralAs(MNm,bMm,dMm,fc,fy,phi){
  if(!(MNm>0&&bMm>0&&dMm>0&&fc>0&&fy>0&&phi>0&&phi<=1))return{ok:false,reason:"ورودی خمشی نامعتبر است"};
  const demand=MNm*1e6/phi;
  const c=fy/(2*0.85*fc*bMm);
  const disc=dMm*dMm-4*c*demand/fy;
  if(disc<0)return{ok:false,reason:"ظرفیت هندسی مقطع برای این لنگر با فرض میلگرد کششی تنها کافی نیست"};
  const As=(dMm-Math.sqrt(disc))/(2*c);
  if(!(As>0&&Number.isFinite(As)))return{ok:false,reason:"حل مساحت میلگرد معتبر نیست"};
  return{ok:true,AsRequiredMm2:As,nominalDepthFactor:0.85,assumption:"مقطع مستطیلی، میلگرد کششی تنها، بدون کنترل حداقل/حداکثر آرماتور آیین‌نامه‌ای"};
 }
 function buildSymmetricBarLayers(bMm,hMm,countEachFace,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm){
  const pitch=barDiaMm+clearSpacingMm,first=coverMm+stirrupDiaMm+barDiaMm/2;
  const span=bMm-2*first;
  if(!(span>=0&&pitch>0&&countEachFace>=2))return{ok:false,reason:"ابعاد یا تعداد میلگرد برای آرایش چندلایه معتبر نیست"};
  const perRow=Math.floor(span/pitch+1e-9)+1;
  if(perRow<2)return{ok:false,reason:"عرض مقطع برای جای‌گیری حداقل دو میلگرد در هر ردیف کافی نیست"};
  let remaining=countEachFace;const face=[];
  while(remaining>0){
   const n=Math.min(perRow,remaining),row=face.length,y=first+row*pitch;
   if(y>=hMm/2)return{ok:false,reason:"ارتفاع مقطع برای تعداد ردیف‌های موردنیاز کافی نیست"};
   face.push({y,area:n*areaBar(barDiaMm),count:n,row});
   remaining-=n;
  }
  const layers=[...face,...face.map(x=>({y:hMm-x.y,area:x.area,count:x.count,row:x.row}))];
  const bottomArea=face.reduce((s,x)=>s+x.area,0);
  const bottomCentroid=face.reduce((s,x)=>s+x.area*x.y,0)/bottomArea;
  return{ok:true,layers,rowsPerFace:face.length,barsPerRow:face.map(x=>x.count),bottomCentroidMm:bottomCentroid,topCentroidMm:hMm-bottomCentroid,maxBarsPerRow:perRow,totalAsMm2:2*bottomArea};
 }
 function buildPerimeterBarLayout(bMm,hMm,countEachFace,sideBarsPerSide,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm){
  const base=buildSymmetricBarLayers(bMm,hMm,countEachFace,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm);
  if(!base.ok)return base;
  if(!Number.isInteger(sideBarsPerSide)||sideBarsPerSide<0||sideBarsPerSide>8)return{ok:false,reason:"تعداد میلگرد جانبی باید عدد صحیح بین صفر تا ۸ باشد"};
  const first=coverMm+stirrupDiaMm+barDiaMm/2,pitch=barDiaMm+clearSpacingMm,xFirst=first,xLast=bMm-first,coords=[];
  for(const face of ["bottom","top"])for(let row=0;row<base.rowsPerFace;row++){
   const y0=first+row*pitch,y=face==="bottom"?y0:hMm-y0,n=base.barsPerRow[row];
   for(let j=0;j<n;j++)coords.push({xMm:n===1?bMm/2:xFirst+j*(xLast-xFirst)/(n-1),yMm:y,face,row,kind:"face"});
  }
  for(let side=0;side<2;side++)for(let j=1;j<=sideBarsPerSide;j++){
   const y=first+j*(hMm-2*first)/(sideBarsPerSide+1);
   coords.push({xMm:side===0?xFirst:xLast,yMm:y,face:side===0?"left":"right",row:j,kind:"side"});
  }
  const groups=new Map();
  for(const p of coords){const key=p.yMm.toFixed(6);if(!groups.has(key))groups.set(key,{y:Number(key),area:0,count:0,coordinates:[]});const g=groups.get(key);g.area+=areaBar(barDiaMm);g.count++;g.coordinates.push(p);}
  const layers=[...groups.values()].sort((a,b)=>a.y-b.y),bottom=coords.filter(p=>p.face==="bottom");
  const bottomCentroid=bottom.reduce((v,p)=>v+p.yMm,0)/bottom.length;
  return{...base,coordinates:coords,layers,sideBarsPerSide,totalCount:coords.length,totalAsMm2:coords.length*areaBar(barDiaMm),bottomCentroidMm:bottomCentroid,topCentroidMm:hMm-bottomCentroid,sideBarCount:2*sideBarsPerSide,faceBarCount:2*countEachFace,sideBarAreaMm2:2*sideBarsPerSide*areaBar(barDiaMm)};
 }
 function validateBarCageGeometry(bMm,hMm,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm,coordinates){
  const vals=[bMm,hMm,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm];
  if(vals.some(v=>!Number.isFinite(v))||bMm<=0||hMm<=0||coverMm<0||stirrupDiaMm<=0||barDiaMm<=0||clearSpacingMm<0||!Array.isArray(coordinates)||!coordinates.length)return{ok:false,reason:"ورودی کنترل هندسه قفس آرماتور معتبر نیست"};
  const cageInner={minX:coverMm+stirrupDiaMm/2,maxX:bMm-coverMm-stirrupDiaMm/2,minY:coverMm+stirrupDiaMm/2,maxY:hMm-coverMm-stirrupDiaMm/2};
  const barRadius=barDiaMm/2,requiredCenterDistance=barDiaMm+clearSpacingMm;
  const outside=coordinates.filter(p=>p.xMm-barRadius<cageInner.minX-1e-8||p.xMm+barRadius>cageInner.maxX+1e-8||p.yMm-barRadius<cageInner.minY-1e-8||p.yMm+barRadius>cageInner.maxY+1e-8);
  let minCenterDistance=Infinity,spacingViolations=0;
  for(let i=0;i<coordinates.length;i++)for(let j=i+1;j<coordinates.length;j++){const dx=coordinates[i].xMm-coordinates[j].xMm,dy=coordinates[i].yMm-coordinates[j].yMm,d=Math.hypot(dx,dy);if(d<minCenterDistance)minCenterDistance=d;if(d+1e-8<requiredCenterDistance)spacingViolations++;}
  return{ok:outside.length===0&&spacingViolations===0,insideStirrupCage:outside.length===0,barPairsChecked:coordinates.length*(coordinates.length-1)/2,minCenterDistanceMm:Number.isFinite(minCenterDistance)?minCenterDistance:null,requiredCenterDistanceMm:requiredCenterDistance,spacingViolations,outsideBarCount:outside.length,checks:"کنترل دوبعدی میلگردها نسبت به محدوده خاموت و فاصله هندسی؛ بدون کنترل وصله، خم، مهاری یا آرماتور داخل پی"};
 }
 function sectionInteractionCurve(bMm,hMm,fc,fy,Es,alpha1,beta1,epsilonCu,barAreaPerFace,coverMm,stirrupDiaMm,barDiaMm){
  const vals=[bMm,hMm,fc,fy,Es,alpha1,beta1,epsilonCu,coverMm,stirrupDiaMm,barDiaMm];
  if(vals.some(v=>!Number.isFinite(v)||v<=0)||alpha1>1||beta1>1||epsilonCu>0.01)return{ok:false,reason:"پارامترهای منحنی اندرکنش نامعتبرند"};
  const layers=Array.isArray(barAreaPerFace)?barAreaPerFace:null;
  if(!layers||!layers.length||layers.some(x=>!Number.isFinite(x.y)||!Number.isFinite(x.area)||x.y<=0||x.y>=hMm||x.area<=0))return{ok:false,reason:"مختصات یا سطح مقطع لایه‌های میلگرد نامعتبر است"};
  const totalAs=layers.reduce((s,x)=>s+x.area,0),points=[];
  for(let i=0;i<=100;i++){
   const c=hMm*0.01*Math.pow(10000,i/100),a=Math.min(beta1*c,hMm),Cc=alpha1*fc*bMm*a;
   let P=-Cc,M=-Cc*(hMm/2-a/2),epsT=0;
   for(const layer of layers){
    const eps=epsilonCu*(layer.y/c-1),fs=Math.max(-fy,Math.min(fy,Es*eps));
    const force=layer.area*(fs-(layer.y<=a?alpha1*fc:0));
    P+=force;M+=force*(hMm/2-layer.y);if(eps>epsT)epsT=eps;
   }
   points.push({cMm:c,aMm:a,PnN:P,MnNmm:Math.abs(M),epsilonT:epsT});
  }
  points.unshift({cMm:0,aMm:0,PnN:totalAs*fy,MnNmm:0,epsilonT:fy/Es});
  return{ok:true,points,steelAreaMm2:totalAs,assumptions:"مختصات گسسته چندردیفه میلگرد؛ بلوک مستطیلی با α1 و β1 ورودی؛ بدون ضریب φ و فقط خمش یک‌محوره"};
 }
 function shearDesignDirection(VuN,NuTensionN,bwMm,dMm,AgMm2,fcMPa,fyMPa,phi,lambda,AvMm2,AsLongMm2){
  const vals=[VuN,NuTensionN,bwMm,dMm,AgMm2,fcMPa,fyMPa,phi,lambda,AvMm2,AsLongMm2];
  if(vals.some(v=>!Number.isFinite(v))||VuN<0||bwMm<=0||dMm<=0||AgMm2<=0||fcMPa<=0||fyMPa<=0||phi<=0||phi>1||lambda<=0||lambda>1||AvMm2<=0)
   return{ok:false,reason:"ورودی‌های کنترل برش نامعتبر است"};
  const NuCompression=Math.max(0,-NuTensionN);
  const axialStress=Math.min(0.05*fcMPa,Math.max(0,NuCompression/(6*AgMm2)));
  const rho=Math.max(0.0001,Math.min(0.08,AsLongMm2/(bwMm*dMm)));
  const lambdaS=Math.min(1,Math.sqrt(2/(1+dMm/250)));
  const vcNoMin=Math.max(0,(0.66*lambdaS*Math.cbrt(rho)*Math.sqrt(fcMPa)+axialStress)*bwMm*dMm);
  const vcNoMinCap=0.66*lambda*Math.sqrt(fcMPa)*bwMm*dMm;
  const Vc0=Math.min(vcNoMin,vcNoMinCap);
  const minAvPerS=Math.max(0.062*Math.sqrt(fcMPa)*bwMm/fyMPa,0.35*bwMm/fyMPa);
  const minAv= minAvPerS; // mm²/mm
  const trigger=VuN>0.5*phi*Vc0;
  let Vc=Vc0,AvsRequired=0,VsRequired=0,spacing=null,providedAvPerS=0;
  if(trigger){
   Vc=Math.max(0,(0.17*lambda*Math.sqrt(fcMPa)+axialStress)*bwMm*dMm);
   const VcCap=0.66*lambda*Math.sqrt(fcMPa)*bwMm*dMm;
   Vc=Math.min(Vc,VcCap);
   VsRequired=Math.max(0,VuN/phi-Vc);
   AvsRequired=Math.max(minAv,VsRequired>0?VsRequired/(fyMPa*dMm):0);
   spacing=AvsRequired>0?AvMm2/AvsRequired:null;
  }
  const VsLimit=0.33*Math.sqrt(fcMPa)*bwMm*dMm;
  const spacingLimit=VsRequired>VsLimit?Math.min(dMm/4,300):Math.min(dMm/2,600);
  const maxNominal=Vc+VcCapValue(lambda,fcMPa,bwMm,dMm);
  const maxShearOK=VuN<=phi*maxNominal;
  const requiredSpacing=spacing==null?null:Math.min(spacing,spacingLimit);
  providedAvPerS=requiredSpacing&&requiredSpacing>0?AvMm2/requiredSpacing:0;
  const providedVs=requiredSpacing&&requiredSpacing>0?AvMm2*fyMPa*dMm/requiredSpacing:0;
  const phiCapacity=phi*(Vc+providedVs);
  return{ok:true,VuKN:VuN/1000,NuCompressionKN:NuCompression/1000,VcKN:Vc/1000,VcInitialKN:Vc0/1000,VsRequiredKN:VsRequired/1000,
   minAvPerSmm2PerMm:minAv,requiredAvPerSmm2PerMm:AvsRequired,providedAvPerSmm2PerMm:providedAvPerS,spacingFromSteelMm:spacing,
   maxSpacingByChapter11Mm:spacingLimit,recommendedSpacingMm:requiredSpacing,providedVsKN:providedVs/1000,phiCapacityKN:phiCapacity/1000,
   maxNominalShearKN:maxNominal/1000,maxShearOK,minimumStirrupsTriggered:trigger,minimumStirrupsSatisfied:!trigger||providedAvPerS>=minAv-1e-9,
   spacingOK:!trigger||(requiredSpacing!=null&&requiredSpacing>0&&requiredSpacing<=spacingLimit+1e-9),
   shearOK:maxShearOK&&(!trigger||(phiCapacity>=VuN-1e-6&&providedAvPerS>=minAv-1e-9&&spacingOKValue(requiredSpacing,spacingLimit))),
   lambdaS,axialStressMPa:axialStress,formula:trigger?"Vc=0.17λ√fc bw d + Nu/(6Ag)؛ Vs=Av fy d/s":"Vc=0.66λs ρ^(1/3)√fc bw d + Nu/(6Ag)؛ در صورت عبور از آستانه، حداقل خاموت فعال می‌شود"};
 }
 function VcCapValue(lambda,fc,bw,d){return 0.66*lambda*Math.sqrt(fc)*bw*d;}
 function spacingOKValue(s,lim){return Number.isFinite(s)&&s>0&&s<=lim+1e-9;}
 function shearEnvelopeForRoute(envelopes,axis){
  const key=axis==="local-y"?"VyN":"VzN";
  let critical=null;
  for(let i=0;i<envelopes.length;i++){
   const e=envelopes[i],sample=e.samples.reduce((a,b)=>Math.abs(b[key])>Math.abs(a[key])?b:a,e.samples[0]);
   if(!critical||Math.abs(sample[key])>Math.abs(critical.sample[key]))critical={sample,memberIndex:i};
  }
  return critical;
 }
 function torsionSectionGeometry(bMm,hMm,coverMm,stirrupDiaMm){
  const vals=[bMm,hMm,coverMm,stirrupDiaMm];
  if(vals.some(v=>!Number.isFinite(v))||bMm<=0||hMm<=0||coverMm<0||stirrupDiaMm<=0)return{ok:false,reason:"ابعاد هندسی مقطع برای پیچش نامعتبر است"};
  const centerlineOffset=coverMm+stirrupDiaMm/2,coreB=bMm-2*centerlineOffset,coreH=hMm-2*centerlineOffset;
  if(coreB<=0||coreH<=0)return{ok:false,reason:"هسته محصور داخل خاموت بسته، با پوشش و قطر خاموت انتخابی، ابعاد مثبت ندارد"};
  const Acp=bMm*hMm,pcp=2*(bMm+hMm),Aoh=coreB*coreH,ph=2*(coreB+coreH),Ao=0.85*Aoh;
  return{ok:true,AcpMm2:Acp,pcpMm:pcp,AohMm2:Aoh,phMm:ph,AoMm2:Ao,coreWidthMm:coreB,coreHeightMm:coreH,centerlineOffsetMm:centerlineOffset,assumption:"مقطع مستطیلی توپر و خاموت بسته؛ Aoh در خط مرکزی خاموت محاسبه و Ao=0.85Aoh مطابق رابطه روش خرپایی مبحث ۹ ویرایش ۱۳۹۹."};
 }
 function torsionDesignScreen(TuNm,NuTensionN,VuY,bwY,dY,VcY,VuZ,bwZ,dZ,VcZ,AgMm2,fcMPa,fyMPa,lambda,geometry,AtMm2,AvMm2,spacingShearMm){
  const phiT=0.75,theta=Math.PI/4;
  const vals=[TuNm,NuTensionN,VuY,bwY,dY,VcY,VuZ,bwZ,dZ,VcZ,AgMm2,fcMPa,fyMPa,lambda,AtMm2,AvMm2];
  if(vals.some(v=>!Number.isFinite(v))||TuNm<0||VuY<0||VuZ<0||bwY<=0||bwZ<=0||dY<=0||dZ<=0||VcY<0||VcZ<0||AgMm2<=0||fcMPa<=0||fyMPa<=0||lambda<=0||lambda>1||AtMm2<=0||AvMm2<=0||!geometry?.ok)
   return{ok:false,reason:"ورودی کنترل پیچش/برش-پیچش نامعتبر است"};
  const NuCompression=Math.max(0,-NuTensionN);
  const axialFactor=1+NuCompression/(0.33*AgMm2*lambda*Math.sqrt(fcMPa));
  const sqrtFc=Math.min(Math.sqrt(fcMPa),8.3);
  const Tth=0.083*lambda*sqrtFc*Math.pow(geometry.AcpMm2,2)/geometry.pcpMm*Math.sqrt(axialFactor);
  const Tcr=0.33*lambda*sqrtFc*Math.pow(geometry.AcpMm2,2)/geometry.pcpMm*Math.sqrt(axialFactor);
  const required=TuNm>=phiT*Tth;
  const minimumRequired=TuNm>=phiT*Tcr;
  const AtPerS=required?TuNm*Math.tan(theta)/(2*geometry.AoMm2*fyMPa):0;
  const AlStrength=required?TuNm*geometry.phMm/(2*geometry.AoMm2*fyMPa*Math.tan(theta)):0;
  const minCombinedPerS=Math.max(0.062*Math.sqrt(fcMPa)*bwY/fyMPa,0.35*bwY/fyMPa);
  const sByTorsion=AtPerS>0?AtMm2/AtPerS:Infinity;
  const sGeometry=Math.min(geometry.phMm/8,300);
  const sByMinimum=minimumRequired?(AvMm2+2*AtMm2)/minCombinedPerS:Infinity;
  const recommendedSpacing=Math.min(sGeometry,sByTorsion,sByMinimum,Number.isFinite(spacingShearMm)&&spacingShearMm>0?spacingShearMm:Infinity);
  const providedAtPerS=AtMm2/recommendedSpacing;
  const providedCombined=(AvMm2+2*AtMm2)/recommendedSpacing;
  const torsionTransverseCapacity=2*geometry.AoMm2*providedAtPerS*fyMPa/Math.tan(theta);
  const torsionStress=Math.pow(TuNm*geometry.phMm/(1.7*Math.pow(geometry.AohMm2,2)),2);
  const combinedDemandY=Math.sqrt(Math.pow(VuY/(bwY*dY),2)+torsionStress);
  const combinedDemandZ=Math.sqrt(Math.pow(VuZ/(bwZ*dZ),2)+torsionStress);
  const combinedCapacityY=0.75*(VcY/(bwY*dY)+0.66*sqrtFc);
  const combinedCapacityZ=0.75*(VcZ/(bwZ*dZ)+0.66*sqrtFc);
  const combinedShearTorsionOK=combinedDemandY<=combinedCapacityY+1e-12&&combinedDemandZ<=combinedCapacityZ+1e-12;
  const AlMinA=minimumRequired?0.42*sqrtFc*geometry.AcpMm2/fyMPa-providedAtPerS*geometry.phMm:0;
  const AlMinB=minimumRequired?0.175*bwY*geometry.phMm/fyMPa:0;
  const AlMinimum=minimumRequired?Math.max(0,Math.min(AlMinA,AlMinB)):0;
  const AlTorsion=required?Math.max(AlStrength,AlMinimum):0;
  return{ok:true,phiT,TthKNm:Tth/1e6,TcrKNm:Tcr/1e6,TuKNm:TuNm/1e6,required,minimumRequired,thresholdOK:!required,
   requiredAtPerSMm2PerMm:AtPerS,providedAtPerSMm2PerMm:providedAtPerS,requiredAlStrengthMm2:AlStrength,minimumAlMm2:AlMinimum,requiredAlMm2:AlTorsion,
   torsionTransverseCapacityKNm:torsionTransverseCapacity/1e6,transverseTorsionOK:!required||torsionTransverseCapacity+1e-6>=TuNm,
   minimumCombinedAv2AtPerS:minCombinedPerS,providedCombinedAv2AtPerS:providedCombined,minimumCombinedSteelOK:!minimumRequired||providedCombined+1e-9>=minCombinedPerS,
   maxSpacingByTorsionMm:sGeometry,recommendedSpacingMm:recommendedSpacing,
   combinedStressDemandYMPa:combinedDemandY,combinedStressDemandZMPa:combinedDemandZ,combinedStressCapacityYMPa:combinedCapacityY,combinedStressCapacityZMPa:combinedCapacityZ,combinedShearTorsionOK,
   combinedShearTorsionChecked:true,assumption:"روابط پیچش آستانه/ترک‌خوردگی، خرپای فضایی و حداقل آرماتور از متن مبحث ۹ ویرایش ۱۳۹۹؛ θ=45° و φT=0.75. برش و پیچش از بیشینه‌های مستقل و محافظه‌کارانه ترکیب شده‌اند؛ ظرفیت طولی پیچشی واقعی و توزیع میلگردهای پیرامونی هنوز تأیید نشده است."};
 }
 function memberTorsionEnvelope(member){
  const f=member.localEndForces||[];
  if(f.length<12)return null;
  const t1=Number(f[3]),t2=Number(f[9]);
  if(!Number.isFinite(t1)||!Number.isFinite(t2))return null;
  return{startNm:t1,endNm:t2,maxAbsNm:Math.max(Math.abs(t1),Math.abs(t2))};
 }
 function interactionMomentAtAxial(curve,axialN){
  if(!curve?.ok||!Number.isFinite(axialN))return null;
  let best=null;
  for(let i=1;i<curve.points.length;i++){
   const a=curve.points[i-1],b=curve.points[i],lo=Math.min(a.PnN,b.PnN),hi=Math.max(a.PnN,b.PnN);
   if(axialN<lo-1e-6||axialN>hi+1e-6||Math.abs(b.PnN-a.PnN)<1e-9)continue;
   const t=(axialN-a.PnN)/(b.PnN-a.PnN),m=a.MnNmm+t*(b.MnNmm-a.MnNmm);
   if(Number.isFinite(m)&&m>=0&&(!best||m>best.MnNmm))best={MnNmm:m,cMm:a.cMm+t*(b.cMm-a.cMm)};
  }
  return best?{...best,MnKNm:best.MnNmm/1e6}:null;
 }
 function sectionForceSamples(member,stations=40){
  const f=member.localEndForces||[],q=member.analysisLoad?.uniformLocal,L=Number(member.length)||0;
  if(f.length<12||!(L>0)||!Array.isArray(q)||q.length!==3)return null;
  const qx=Number(q[0])||0,qy=Number(q[1])||0,qz=Number(q[2])||0;
  const xs=new Set(Array.from({length:stations+1},(_,i)=>L*i/stations));
  if(Math.abs(qz)>1e-12){const x=-(Number(f[2])||0)/qz;if(x>0&&x<L)xs.add(x);}
  if(Math.abs(qy)>1e-12){const x=-(Number(f[1])||0)/qy;if(x>0&&x<L)xs.add(x);}
  return Array.from(xs).sort((a,b)=>a-b).map(x=>{
   const N=-(Number(f[0]||0)+qx*x);
   const Vy=-(Number(f[1]||0)+qy*x),Vz=-(Number(f[2]||0)+qz*x);
   const My=-(Number(f[4]||0)+Number(f[2]||0)*x+qz*x*x/2);
   const Mz=-(Number(f[5]||0)-Number(f[1]||0)*x-qy*x*x/2);
   return{xM:x,Nn:N,VyN:Vy,VzN:Vz,VresultantN:Math.hypot(Vy,Vz),MyNm:My,MzNm:Mz,MresultantNm:Math.hypot(My,Mz)};
  });
 }
 function memberEnvelope(member){
  const samples=sectionForceSamples(member);if(!samples)return null;
  const byMoment=samples.reduce((a,b)=>b.MresultantNm>a.MresultantNm?b:a,samples[0]);
  const byAxial=samples.reduce((a,b)=>Math.abs(b.Nn)>Math.abs(a.Nn)?b:a,samples[0]);
  const byShear=samples.reduce((a,b)=>b.VresultantN>a.VresultantN?b:a,samples[0]);
  return{MmaxNm:byMoment.MresultantNm,VmaxN:byShear.VresultantN,NmaxN:Math.abs(byAxial.Nn),criticalMoment:byMoment,criticalAxial:byAxial,samples};
 }
 function routeResult(route,members,material){
  members=Array.isArray(members)?members.filter(Boolean):[members].filter(Boolean);
  if(!members.length)return{id:route.id,ok:false,reason:"نیروهای انتهایی اعضای شناژ در نتیجه تحلیل موجود نیستند"};
  const forceRows=members.map(member=>({id:member.id,f:member.localEndForces||[]}));
  if(forceRows.some(x=>x.f.length<12))return{id:route.id,ok:false,reason:"نیروهای انتهایی یکی از قطعات شناژ موجود نیست"};
  const envelopes=members.map(memberEnvelope);
  if(envelopes.some(x=>!x))return{id:route.id,ok:false,reason:"برای محاسبه نمودار داخلی، طول/نیروهای یکی از قطعات شناژ معتبر نیست"};
  const criticalMoment=envelopes.map((x,i)=>({...x.criticalMoment,memberId:members[i].id})).reduce((a,b)=>b.MresultantNm>a.MresultantNm?b:a);
  const criticalAxial=envelopes.map((x,i)=>({...x.criticalAxial,memberId:members[i].id})).reduce((a,b)=>Math.abs(b.Nn)>Math.abs(a.Nn)?b:a);
  const criticalTension=envelopes.flatMap((x,i)=>x.samples.map(sample=>({...sample,memberId:members[i].id}))).reduce((a,b)=>b.Nn>a.Nn?b:a);
  const torsionRows=members.map(member=>({memberId:member.id,result:memberTorsionEnvelope(member)}));
  const torsionAvailable=torsionRows.every(x=>x.result);
  const criticalTorsion=torsionAvailable?torsionRows.reduce((a,b)=>b.result.maxAbsNm>a.result.maxAbsNm?b:a):null;
  const M=criticalMoment.MresultantNm/1000;
  const V=Math.max(...envelopes.map(x=>x.VmaxN))/1000;
  const N=Math.max(...envelopes.map(x=>x.NmaxN))/1000;
  const h=Number(route.heightM)*1000,b=Number(route.widthM)*1000,fc=Number(route.fcMPa)||25;
  let d=h-settings.coverMm-settings.stirrupDiaMm-settings.barDiaMm/2;
  let As=flexuralAs(M,b,d,fc,settings.fyMPa,settings.phiFlexure);
  const barA=areaBar(settings.barDiaMm);
  let count=As.ok?Math.max(3,Math.ceil(As.AsRequiredMm2/barA)):3;
  let layout=count?buildPerimeterBarLayout(b,h,count,settings.sideBarsPerSide,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm,settings.clearSpacingMm):{ok:false,reason:"تعداد میلگرد برای آرایش موجود نیست"};
  if(layout.ok){
   d=h-layout.bottomCentroidMm;
   As=flexuralAs(M,b,d,fc,settings.fyMPa,settings.phiFlexure);
   count=As.ok?Math.max(3,Math.ceil(As.AsRequiredMm2/barA)):3;
   layout=count?buildPerimeterBarLayout(b,h,count,settings.sideBarsPerSide,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm,settings.clearSpacingMm):{ok:false,reason:"محاسبه مجدد آرماتور نامعتبر است"};
   if(layout.ok)d=h-layout.bottomCentroidMm;
  }
  const AsProvided=layout.ok?layout.totalAsMm2:null;
  const interaction=layout.ok?sectionInteractionCurve(b,h,fc,settings.fyMPa,settings.EsMPa,settings.alpha1,settings.beta1,settings.epsilonCu,layout.layers,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm):{ok:false,reason:layout.reason||"آرایش میلگرد معتبر نیست"};
  const interactionAtCritical=interaction.ok?interactionMomentAtAxial(interaction,criticalMoment.Nn):null;
  const nominalUtilization=interactionAtCritical?.MnKNm>0?M/interactionAtCritical.MnKNm:null;
  const fit=barLayerCapacity(b,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm,settings.clearSpacingMm);
  const cageGeometry=layout.ok?validateBarCageGeometry(b,h,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm,settings.clearSpacingMm,layout.coordinates):{ok:false,reason:layout.reason||'آرایش میلگرد موجود نیست'};
  const singleLayerFits=!!(fit.ok&&count!==null&&count<=fit.maxBars);
  const multiLayerFits=!!layout.ok;
  const stirrupArea=settings.stirrupLegs*areaBar(settings.stirrupDiaMm);
  const shearY=shearEnvelopeForRoute(envelopes,"local-y"),shearZ=shearEnvelopeForRoute(envelopes,"local-z");
  const Ag=b*h;
  const torsionGeometry=torsionSectionGeometry(b,h,settings.coverMm,settings.stirrupDiaMm);
  const shearMaxForCombined=Math.max(shearY?.sample?Math.abs(shearY.sample.VyN):0,shearZ?.sample?Math.abs(shearZ.sample.VzN):0);
  const shearYResult=shearY?shearDesignDirection(Math.abs(shearY.sample.VyN),shearY.sample.Nn,b,d,Ag,fc,settings.fyMPa,settings.phiShear,settings.lambdaConcrete,stirrupArea,(AsProvided||0)/2):{ok:false,reason:"نیروی برش محلی y موجود نیست"};
  const dZ=b-settings.coverMm-settings.stirrupDiaMm-settings.barDiaMm/2;
  const shearZResult=shearZ?shearDesignDirection(Math.abs(shearZ.sample.VzN),shearZ.sample.Nn,h,dZ,Ag,fc,settings.fyMPa,settings.phiShear,settings.lambdaConcrete,stirrupArea,(AsProvided||0)/2):{ok:false,reason:"نیروی برش محلی z موجود نیست"};
  const shearSpacingCandidates=[shearYResult.recommendedSpacingMm,shearZResult.recommendedSpacingMm].filter(x=>Number.isFinite(x)&&x>0);
  const shearSpacingForTorsion=shearSpacingCandidates.length?Math.min(...shearSpacingCandidates):null;
  const torsionDesign=torsionAvailable&&torsionGeometry.ok?torsionDesignScreen(criticalTorsion.result.maxAbsNm,criticalTension.Nn,shearY?.sample?Math.abs(shearY.sample.VyN):0,b,d,shearYResult.ok?shearYResult.VcKN*1000:0,shearZ?.sample?Math.abs(shearZ.sample.VzN):0,h,dZ,shearZResult.ok?shearZResult.VcKN*1000:0,Ag,fc,settings.fyMPa,settings.lambdaConcrete,torsionGeometry,areaBar(settings.stirrupDiaMm),stirrupArea,shearSpacingForTorsion):{ok:false,reason:"تقاضای پیچش یا هندسه مقطع برای طراحی موجود نیست"};

  const spacing=V>0?stirrupArea*settings.fyMPa*d/(V*1000):null;
  const foundation=window.SteelFoundationTakeoff?.getData?.()||{};
  const model=window.SteelStructuralModel?.getData?.()||window.SteelStructuralModel?.model||{};
  const nodes=new Map((model.nodes||[]).map(n=>[String(n.id),n]));
  const footingFor=id=>foundation.footingSchedule?.[String(id)]||window.SteelFoundationTakeoff?.defaultFootingSpec?.(nodes.get(String(id))||{})||{width:Number(foundation.footingWidthM),length:Number(foundation.footingLengthM)};
  const startSpec=footingFor(route.start),endSpec=footingFor(route.end),axis=material?.axis;
  const startDimension=axis==="X"?Number(startSpec.width):Number(startSpec.length),endDimension=axis==="X"?Number(endSpec.width):Number(endSpec.length);
  const footingPath=continuousBarPathDetail(Number(material?.lengthM),startDimension,endDimension,settings.hookCutAllowancePerEndMm);
  const footingExtension=!!footingPath.ok;
  const straightBarLength=footingExtension?footingPath.straightLengthPerBarM:null;
  const barsBothFaces=count?2*count:null,totalLongitudinalBarCount=barsBothFaces===null?null:barsBothFaces+2*settings.sideBarsPerSide;
  const totalStraightBarLengthM=totalLongitudinalBarCount&&straightBarLength!=null?totalLongitudinalBarCount*straightBarLength:null;
   const stirrupSpacingCandidates=[shearYResult.recommendedSpacingMm,shearZResult.recommendedSpacingMm,torsionDesign?.recommendedSpacingMm].filter(x=>Number.isFinite(x)&&x>0);
   const stirrupSpacingUsed=stirrupSpacingCandidates.length?Math.min(...stirrupSpacingCandidates):settings.stirrupSpacingFallbackMm;
   const stirrupDetail=closedStirrupDetail(b,h,settings.coverMm,settings.stirrupDiaMm,settings.stirrupBendRadiusMm,settings.stirrupHookExtensionPerEndMm,Number(material?.lengthM),stirrupSpacingUsed);
   const totalCutLengthM=totalLongitudinalBarCount&&footingPath.ok?totalLongitudinalBarCount*footingPath.totalCutLengthPerBarM:null;
  const unitMassKgM=Math.pow(settings.barDiaMm,2)/162;
  return{id:route.id,memberIds:forceRows.map(x=>x.id),segmentCount:members.length,ok:As.ok,MmaxKNm:M,VmaxKN:V,NmaxKN:N,
   criticalMoment:{...criticalMoment,NkN:criticalMoment.Nn/1000,MyKNm:criticalMoment.MyNm/1000,MzKNm:criticalMoment.MzNm/1000,MresultantKNm:criticalMoment.MresultantNm/1000},
   criticalAxial:{...criticalAxial,NkN:criticalAxial.Nn/1000,MyKNm:criticalAxial.MyNm/1000,MzKNm:criticalAxial.MzNm/1000,MresultantKNm:criticalAxial.MresultantNm/1000},
   torsion:{available:torsionAvailable,criticalMemberId:criticalTorsion?.memberId||null,maxAbsKNm:criticalTorsion?criticalTorsion.result.maxAbsNm/1e6:null,memberEndValues:torsionRows.map(x=>({memberId:x.memberId,startKNm:x.result?.startNm/1e6??null,endKNm:x.result?.endNm/1e6??null})),sectionGeometry:torsionGeometry,design:torsionDesign,capacityChecked:false,combinedShearTorsionChecked:true},
   interaction:{ok:interaction.ok,assumption:interaction.assumptions,pointCount:interaction.points?.length||0,atCriticalAxial:interactionAtCritical,nominalMomentUtilization:nominalUtilization,curve:interaction.points||[]},
   effectiveDepthMm:d,AsRequiredMm2:As.ok?As.AsRequiredMm2:null,barDiaMm:settings.barDiaMm,
   barCountEachFace:count,sideBarsPerSide:settings.sideBarsPerSide,AsProvidedMm2:AsProvided,barLayer:{maxBars:fit.maxBars,centerSpanMm:fit.centerSpanMm,clearSpacingMm:settings.clearSpacingMm,cageGeometry,singleLayerFits,multiLayerFits,rowsPerFace:layout.rowsPerFace||null,barsPerRow:layout.barsPerRow||[],bottomCentroidMm:layout.bottomCentroidMm||null,topCentroidMm:layout.topCentroidMm||null,layers:layout.layers||[],coordinates:layout.coordinates||[],sideBarCount:layout.sideBarCount||0},
   longitudinalBars:{countEachFace:count,sideBarsPerSide:settings.sideBarsPerSide,totalCount:barsBothFaces,totalCountIncludingSideBars:totalLongitudinalBarCount,footingPath,straightLengthPerBarM:straightBarLength,
    totalStraightLengthM:totalStraightBarLengthM,approximateMassKg:totalStraightBarLengthM==null?null:totalStraightBarLengthM*unitMassKgM,
    hookCutAllowancePerEndMm:settings.hookCutAllowancePerEndMm,totalCutLengthM,approximateMassKg:totalCutLengthM==null?null:totalCutLengthM*unitMassKgM,
    hookAllowanceIncluded:settings.hookCutAllowancePerEndMm>0,hookAllowanceIsManual:true,footingExtensionIncluded:footingExtension},
   stirrup:{diaMm:settings.stirrupDiaMm,legs:settings.stirrupLegs,areaMm2:stirrupArea,steelOnlySpacingMm:spacing,detail:stirrupDetail,spacingSource:stirrupSpacingCandidates.length?"حداقل فاصله حاصل از غربال برش/پیچش":"فاصله موقت ورودی؛ فاقد تأیید آیین‌نامه‌ای",shearY:shearYResult,shearZ:shearZResult,phi:settings.phiShear},
   note:"نیروهای تمام قطعات مسیر پیوسته بررسی شده‌اند. برای پوشش لنگرهای مثبت و منفی، آرماتور به‌صورت متقارن در دو وجه و در چند ردیف با مختصات واقعی ارتفاعی توزیع شده است. آرایش هندسی بر اساس فاصله آزاد ورودی است و جایگزین کنترل حداقل فاصله آیین‌نامه‌ای، تراکم بتن‌ریزی و تداخل خاموت نیست. طول مستقیم میلگرد با فرض عبور مسیر از مرکز هر دو پی و افزودن نصف بعد پی در هر انتها تا وجه بیرونی محاسبه شده است؛ افزوده قلاب صرفاً ورود دستی است و جهت، شکل خم، طول مهاری و ضوابط قلاب هنوز تأیید آیین‌نامه‌ای نشده‌اند."};
 }
 function render(requireLatest){
  read();
  const box=$("tieRebarOutput"),status=$("tieRebarStatus");if(!box||!status)return;
  const tieData=window.SteelTieBeamLayout?.getData?.();
  if(!tieData?.routes?.length){status.textContent="هیچ مسیر شناژی تعریف نشده است.";return;}
  if(requireLatest&&!latest){status.textContent="نتیجه تحلیل سه‌بعدی در دسترس نیست؛ ابتدا تحلیل را اجرا کنید.";return;}
  if(!latest){status.textContent="تنظیمات ذخیره شد. برای محاسبه باید تحلیل سه‌بعدی اجرا شود.";return;}
  const included=new Map((latest.tieBeamIntegration?.included||[]).map(x=>[x.id,x]));
  const memberMap=new Map((latest.members||[]).map(x=>[String(x.id),x]));
  const rows=tieData.routes.map(route=>{
   const info=included.get(route.id);
   if(!info)return{id:route.id,ok:false,reason:"این مسیر در آخرین تحلیل وارد نشده است: "+((latest.tieBeamIntegration?.skipped||[]).find(x=>x.id===route.id)?.reasons||["ممیزی/اتصال/گره نامعتبر"]).join("؛ ")};
   const ids=info.memberIds||[info.memberId];
   return routeResult(route,ids.map(id=>memberMap.get(id)),info);
  });
  lastReport={generatedAt:new Date().toISOString(),loadCase:latest.loadCaseLabel||latest.loadCase,settings:{...settings},rows,
   limitations:["این خروجی غربال اولیه است و طراحی اجرایی یا تأیید آیین‌نامه‌ای نیست.","مقادیر نیرو از تحلیل خطی عضو با مقطع ناخالص و ترک‌نخورده گرفته شده‌اند.","برای خمش، رابطه تعادل مستطیلی قبلی صرفاً برآورد اولیه As است. منحنی N-M جدید با سازگاری کرنش خطی و بلوک مستطیلی α1/β1 ورودی، از مختصات گسسته ردیف‌های متقارن میلگرد بالا و پایین ساخته می‌شود؛ ضریب φ و اندرکنش دومحوره هنوز در آن اعمال نشده‌اند.","کنترل برش مقدماتی بر اساس روابط فصل ۸ و ۱۱ مبحث ۹ ویرایش ۱۳۹۹ پیاده شده است؛ اعتبار ویرایش و اصلاحیه‌ها باید برای پروژه تأیید شود. کنترل در دو راستای برش محلی جداگانه انجام می‌شود، اما جهت‌گیری مقطع/خاموت و مختصات دوبعدی میلگردهای بالا، پایین و میانی دو وجه جانبی ثبت می‌شود؛ اما کنترل جهت‌گیری خاموت، محصورشدگی و ضوابط لرزه‌ای ویژه هنوز کامل نیست.","نیروی محوری N با قرارداد علامت محلی (مثبت کششی) و لنگرهای هم‌زمان گزارش می‌شوند اما هنوز کنترل اندرکنش ظرفیت N-M انجام نمی‌شود.","برای گزارش M برآیند، مقاطع در ۴۰ گام طولی به‌علاوه نقاط ایستای مؤلفه‌های لنگر نمونه‌برداری می‌شوند؛ بیشینه برآیند ممکن است بین ایستگاه‌ها اندکی بزرگ‌تر باشد.","استفاده از لنگر برآیند به‌عنوان لنگر یک‌محوره صرفاً غربال اولیه است؛ طراحی خمش دومحوره و اندرکنش محوری تا پیاده‌سازی سازگاری کرنش معتبر نیست.","حد آستانه و ترک‌خوردگی پیچش، نیاز خاموت بسته، حداقل (Av+2At)/s، نیاز اولیه Al پیچشی و محدودیت فاصله Ph/8 و 300 میلی‌متر محاسبه می‌شوند؛ اما ظرفیت طولی پیچشی و کنترل نهایی جزئیات میلگردهای پیرامونی و خاموت بسته هنوز کامل نیست.",
   "فرض بستر: خاک زیر شناژ و خاکریزی طرفین پس از قالب‌برداری در واقعیت وجود دارد؛ در مدل فعلی هیچ تکیه‌گاه یا فنر خاکی منظور نشده تا بدون مدول بستر، تراکم و مشخصات تماس، سختی نامطمئن به سازه نسبت داده نشود.","پیچش، خستگی، ترک، خیز، مهاری، وصله، طول قلاب، تداخل میلگردها و جزئیات عبور از فونداسیون کنترل نهایی نشده‌اند."]};
  status.textContent="نتیجه بر اساس آخرین تحلیل: "+lastReport.loadCase+"؛ مسیرها: "+rows.length+"؛ قابل محاسبه خمشی: "+rows.filter(x=>x.ok).length+".";
  box.textContent=rows.map(r=>{
   if(!r.ok)return"شناژ "+r.id+": "+r.reason;
   return"شناژ "+r.id+" — Mmax="+fmt(r.MmaxKNm)+" kN·m؛ Vmax="+fmt(r.VmaxKN)+" kN؛ Nmax="+fmt(r.NmaxKN)+" kN"+
     "\nمقطع بحرانی M برآیند در عضو "+r.criticalMoment.memberId+" و x="+fmt(r.criticalMoment.xM)+" m: N هم‌زمان="+fmt(r.criticalMoment.NkN)+" kN؛ My="+fmt(r.criticalMoment.MyKNm)+" kN·m؛ Mz="+fmt(r.criticalMoment.MzKNm)+" kN·m."+
     "\nبیشینه N در عضو "+r.criticalAxial.memberId+" و x="+fmt(r.criticalAxial.xM)+" m: N="+fmt(r.criticalAxial.NkN)+" kN؛ M برآیند هم‌زمان="+fmt(r.criticalAxial.MresultantKNm)+" kN·m. این گزارش تقاضای هم‌زمان است، نه کنترل اندرکنش ظرفیت."+
    "\nمنحنی اسمی N-M در نیروی محوری نقطه بحرانی: "+(r.interaction.atCriticalAxial?("Mn اسمی≈"+fmt(r.interaction.atCriticalAxial.MnKNm)+" kN·m؛ نسبت تقاضای M به Mn اسمی≈"+fmt(r.interaction.nominalMomentUtilization,3)):"نیروی محوری خارج از بازه منحنی یا منحنی نامعتبر است")+"؛ این نسبت فاقد ضریب φ و صرفاً غربال تک‌محوره است."+
    "\nعمق مؤثر تقریبی d="+fmt(r.effectiveDepthMm)+" mm؛ As لازم="+fmt(r.AsRequiredMm2)+" mm²؛ برآورد صرفاً از خمش نظری (پیش از حداقل آرماتور آیین‌نامه‌ای): "+r.barCountEachFace+" میلگرد قطر "+r.barDiaMm+" در هر وجه کششی (As فراهم="+fmt(r.AsProvidedMm2)+" mm²)"+
    "\nمیلگردهای جانبی: "+r.sideBarsPerSide+" عدد در هر وجه؛ مختصات دوبعدی کل میلگردها در داده خروجی ثبت شده است (پیشنهاد هندسی، نه تأیید آیین‌نامه‌ای)."+
    "\nچیدمان طولی: "+(r.barLayer.singleLayerFits?"از نظر هندسی در یک ردیف جا می‌شود":"در یک ردیف جا نمی‌شود؛ آرایش چندلایه و بازنگری عمق مؤثر لازم است")+"؛ حداکثر تعداد در یک ردیف="+r.barLayer.maxBars+"؛ فاصله آزاد مفروض="+fmt(r.barLayer.clearSpacingMm)+" mm (غیرآیین‌نامه‌ای)"+
    "\\nهندسه مقطع برای مرحله پیچش: "+(r.torsion.sectionGeometry.ok?("Acp="+fmt(r.torsion.sectionGeometry.AcpMm2)+" mm²؛ pcp="+fmt(r.torsion.sectionGeometry.pcpMm)+" mm؛ Aoh="+fmt(r.torsion.sectionGeometry.AohMm2)+" mm²؛ ph="+fmt(r.torsion.sectionGeometry.phMm)+" mm؛ Ao مرجع="+fmt(r.torsion.sectionGeometry.AoMm2)+" mm²") : r.torsion.sectionGeometry.reason)+
    "\\nکنترل مقدماتی پیچش: "+(r.torsion.design?.ok?(r.torsion.design.required?("Tu="+fmt(r.torsion.design.TuKNm)+" kN·m؛ φTth="+fmt(r.torsion.design.phiT*r.torsion.design.TthKNm)+" kN·m؛ پیچش فعال؛ At/s لازم="+fmt(r.torsion.design.requiredAtPerSMm2PerMm,4)+" mm²/mm؛ Al لازم="+fmt(r.torsion.design.requiredAlMm2)+" mm²؛ فاصله پیشنهادی ترکیبی="+fmt(r.torsion.design.recommendedSpacingMm)+" mm؛ حد Ph/8 و 300="+fmt(r.torsion.design.maxSpacingByTorsionMm)+" mm؛ ظرفیت عرضی پیچش="+fmt(r.torsion.design.torsionTransverseCapacityKNm)+" kN·m؛ حداقل آرماتور پیچشی طبق Tcr="+(r.torsion.design.minimumRequired?"فعال":"فعال نیست")+"؛ کنترل ترکیبی برش-پیچش="+(r.torsion.design.combinedShearTorsionOK?"قبول مقدماتی":"رد مقدماتی")+"؛ کنترل طولی پیرامونی هنوز ناقص"):"Tu="+fmt(r.torsion.design.TuKNm)+" kN·m؛ کمتر از φTth="+fmt(r.torsion.design.phiT*r.torsion.design.TthKNm)+" kN·m؛ آرماتور حداقل پیچشی بر اساس آستانه فعال نیست") : (r.torsion.design?.reason||"محاسبه نشده"))+"\\nپیچش محلی: "+(r.torsion.available?("بیشینه |T|="+fmt(r.torsion.maxAbsKNm)+" kN·m در عضو "+r.torsion.criticalMemberId+"\nخاموت بسته Ø"+r.stirrup.diaMm+": "+(r.stirrup.detail?.ok?("تعداد="+r.stirrup.detail.count+"؛ فاصله="+fmt(r.stirrup.detail.actualSpacingMm)+" mm؛ طول برش هر عدد="+fmt(r.stirrup.detail.cutLengthPerStirrupMm)+" mm؛ طول کل="+fmt(r.stirrup.detail.totalCutLengthM)+" m؛ وزن≈"+fmt(r.stirrup.detail.approximateMassKg)+" kg؛ مبنا: "+r.stirrup.spacingSource):r.stirrup.detail?.reason)+"؛ غربال پیچش و برش-پیچش انجام شده، اما ظرفیت نهایی طولی و جزئیات میلگردهای پیرامونی هنوز کنترل نشده است"):"مؤلفه پیچش در نتایج موجود نیست؛ کنترل نشده است")+
    "\nکنترل برش محلی y: "+(r.stirrup.shearY.ok?("Vu="+fmt(r.stirrup.shearY.VuKN)+" kN؛ φVn,max="+fmt(r.stirrup.shearY.maxNominalShearKN*r.stirrup.phi)+" kN؛ خاموت حداقل لازم="+(r.stirrup.shearY.minimumStirrupsTriggered?"بله":"خیر")+(r.stirrup.shearY.recommendedSpacingMm==null?"":"؛ فاصله پیشنهادی="+fmt(r.stirrup.shearY.recommendedSpacingMm)+" mm؛ φ(Vc+Vs)="+fmt(r.stirrup.shearY.phiCapacityKN)+" kN؛ حد فصل ۱۱="+fmt(r.stirrup.shearY.maxSpacingByChapter11Mm)+" mm")+(r.stirrup.shearY.shearOK?"؛ کنترل مقدماتی برقرار":"؛ کنترل برش/خاموت برقرار نیست")):r.stirrup.shearY.reason)+
    "\nکنترل برش محلی z: "+(r.stirrup.shearZ.ok?("Vu="+fmt(r.stirrup.shearZ.VuKN)+" kN؛ φVn,max="+fmt(r.stirrup.shearZ.maxNominalShearKN*r.stirrup.phi)+" kN؛ خاموت حداقل لازم="+(r.stirrup.shearZ.minimumStirrupsTriggered?"بله":"خیر")+(r.stirrup.shearZ.recommendedSpacingMm==null?"":"؛ فاصله پیشنهادی="+fmt(r.stirrup.shearZ.recommendedSpacingMm)+" mm؛ φ(Vc+Vs)="+fmt(r.stirrup.shearZ.phiCapacityKN)+" kN؛ حد فصل ۱۱="+fmt(r.stirrup.shearZ.maxSpacingByChapter11Mm)+" mm")+(r.stirrup.shearZ.shearOK?"؛ کنترل مقدماتی برقرار":"؛ کنترل برش/خاموت برقرار نیست")):r.stirrup.shearZ.reason)+
    "\nمیلگرد طولی دو وجه: "+r.longitudinalBars.totalCount+" عدد؛ طول مستقیم هر میلگرد تا وجه بیرونی پی‌های انتهایی: "+(r.longitudinalBars.footingExtensionIncluded?fmt(r.longitudinalBars.straightLengthPerBarM)+" m":"ابعاد پی وارد نشده")+"؛ افزوده دستی قلاب در هر انتها: "+fmt(r.longitudinalBars.hookCutAllowancePerEndMm)+" mm؛ مجموع طول برش با افزوده دستی: "+(r.longitudinalBars.totalCutLengthM==null?"—":fmt(r.longitudinalBars.totalCutLengthM)+" m")+"؛ وزن تقریبی بر اساس طول برش ثبت‌شده: "+(r.longitudinalBars.approximateMassKg==null?"—":fmt(r.longitudinalBars.approximateMassKg)+" kg")+
    "\n"+r.note;
  }).join("\n\n")+
  "\n\nمحدودیت‌ها:\n- "+lastReport.limitations.join("\n- ");
  return lastReport;
 }
 function segmentDistance3D(a0,a1,b0,b1){
  const u={x:a1.x-a0.x,y:a1.y-a0.y,z:a1.z-a0.z},v={x:b1.x-b0.x,y:b1.y-b0.y,z:b1.z-b0.z},w={x:a0.x-b0.x,y:a0.y-b0.y,z:a0.z-b0.z};
  const dot=(p,q)=>p.x*q.x+p.y*q.y+p.z*q.z;
  const A=dot(u,u),B=dot(u,v),C=dot(v,v),D=dot(u,w),E=dot(v,w),den=A*C-B*B;
  if(A<1e-12&&C<1e-12)return Math.hypot(w.x,w.y,w.z);
  let sc=0,tc=0,sN=0,sD=den,tN=0,tD=den;
  if(A<1e-12){tc=Math.max(0,Math.min(1,E/C));}
  else if(C<1e-12){sc=Math.max(0,Math.min(1,-D/A));}
  else{
   if(den<1e-12){sN=0;sD=1;tN=E;tD=C;}
   else{sN=B*E-C*D;tN=A*E-B*D;if(sN<0){sN=0;tN=E;tD=C;}else if(sN>sD){sN=sD;tN=E+B;tD=C;}}
   if(tN<0){tN=0;if(-D<0)sN=0;else if(-D>A)sN=sD;else{sN=-D;sD=A;}}
   else if(tN>tD){tN=tD;if(-D+B<0)sN=0;else if(-D+B>A)sN=sD;else{sN=-D+B;sD=A;}}
   sc=Math.abs(sN)<1e-12?0:sN/sD;tc=Math.abs(tN)<1e-12?0:tN/tD;
  }
  return Math.hypot(w.x+sc*u.x-tc*v.x,w.y+sc*u.y-tc*v.y,w.z+sc*u.z-tc*v.z);
}
function closestPointsSegments3D(a0,a1,b0,b1){
 const sub=(p,q)=>({x:p.x-q.x,y:p.y-q.y,z:p.z-q.z}),add=(p,v,s)=>({x:p.x+v.x*s,y:p.y+v.y*s,z:p.z+v.z*s}),dot=(p,q)=>p.x*q.x+p.y*q.y+p.z*q.z;
 const u=sub(a1,a0),v=sub(b1,b0),w=sub(a0,b0),A=dot(u,u),B=dot(u,v),C=dot(v,v),D=dot(u,w),E=dot(v,w),den=A*C-B*B;let s=0,t=0;
 if(A<1e-12&&C<1e-12){s=0;t=0;}else if(A<1e-12){s=0;t=Math.max(0,Math.min(1,E/C));}else if(C<1e-12){t=0;s=Math.max(0,Math.min(1,-D/A));}else{
 let sn,sd=den,tn,td=den;if(den<1e-12){sn=0;sd=1;tn=E;td=C;}else{sn=B*E-C*D;tn=A*E-B*D;if(sn<0){sn=0;tn=E;td=C;}else if(sn>sd){sn=sd;tn=E+B;td=C;}}
 if(tn<0){tn=0;if(-D<0)sn=0;else if(-D>A)sn=sd;else{sn=-D;sd=A;}}else if(tn>td){tn=td;if(-D+B<0)sn=0;else if(-D+B>A)sn=sd;else{sn=-D+B;sd=A;}}
 s=Math.abs(sn)<1e-12?0:sn/sd;t=Math.abs(tn)<1e-12?0:tn/td;
 }
 const pointA=add(a0,u,s),pointB=add(b0,v,t),delta=sub(pointA,pointB);return{distance:Math.hypot(delta.x,delta.y,delta.z),pointA,pointB,s,t};
}
function checkFootingBarClearance(tieBars,footingBars,requiredClearanceMm=0){
  if(!Array.isArray(tieBars)||!Array.isArray(footingBars)||!tieBars.length||!footingBars.length||!Number.isFinite(requiredClearanceMm)||requiredClearanceMm<0)return{ok:false,reason:"برای کنترل تداخل، مسیر میلگردهای شناژ و شبکه پی و فاصله لازم باید مشخص باشند."};
  const valid=bar=>bar&&bar.a&&bar.b&&[bar.a.x,bar.a.y,bar.a.z,bar.b.x,bar.b.y,bar.b.z,bar.diameterMm].every(Number.isFinite)&&bar.diameterMm>0;
  if([...tieBars,...footingBars].some(bar=>!valid(bar)))return{ok:false,reason:"مختصات سه‌بعدی یا قطر یکی از میلگردها معتبر نیست."};
  let minClear=Infinity,critical=null,conflicts=0,pairs=0;
  for(const t of tieBars)for(const f of footingBars){
   const center=closestPointsSegments3D(t.a,t.b,f.a,f.b).distance*1000,clear=center-(t.diameterMm+f.diameterMm)/2;pairs++;
   if(clear<minClear){minClear=clear;critical={tieBar:t.id||null,footingBar:f.id||null,centerDistanceMm:center,clearDistanceMm:clear,tiePoint:closestPointsSegments3D(t.a,t.b,f.a,f.b).pointA,footingPoint:closestPointsSegments3D(t.a,t.b,f.a,f.b).pointB};}
   if(clear+1e-8<requiredClearanceMm)conflicts++;
  }
  return{ok:conflicts===0,pairsChecked:pairs,minimumClearDistanceMm:minClear,requiredClearanceMm,conflictPairs:conflicts,criticalPair:critical,method:"مختصات ابتدا/انتها بر حسب متر و قطر میلگرد بر حسب میلی‌متر است؛ فاصله محور به محور به میلی‌متر تبدیل و سپس مجموع شعاع‌ها کسر می‌شود. کنترل هندسی است و جایگزین کنترل مهاری، بتن‌ریزی، لرزه‌ای یا نقشه اجرایی نیست."};
}
function selfTest(){
  const pinned={length:6,localEndForces:[0,3600,0,0,0,0,0,3600,0,0,0,0],analysisLoad:{uniformLocal:[0,-1200,0]}};
  const cantileverX={length:6,localEndForces:[0,7200,0,0,0,21600,0,0,0,0,0,0],analysisLoad:{uniformLocal:[0,-1200,0]}};
  const cantileverZ={length:6,localEndForces:[0,0,7200,0,-21600,0,0,0,0,0,0,0],analysisLoad:{uniformLocal:[0,0,-1200]}};
  const ep=memberEnvelope(pinned),ex=memberEnvelope(cantileverX),ez=memberEnvelope(cantileverZ);
  const torsionTest=memberTorsionEnvelope({localEndForces:[0,0,0,1250000,0,0,0,0,0,-1750000,0,0]});
  const torsionGeometryTest=torsionSectionGeometry(600,500,40,10);
   const stirrupDetailTest=closedStirrupDetail(600,500,40,10,20,0,6,200);
  const torsionDesignTest=torsionDesignScreen(25e6,0,80e3,600,442,90000,70e3,500,442,85000,300000,25,400,1,torsionGeometryTest,areaBar(10),2*areaBar(10),200);

  const axialSample=sectionForceSamples({length:6,localEndForces:[10000,0,0,0,0,0,0,0,0,0,0,0],analysisLoad:{uniformLocal:[-1000,0,0]}});
  const axialMid=axialSample?.find(x=>Math.abs(x.xM-3)<1e-9);
  const biaxialSample=sectionForceSamples({length:6,localEndForces:[10000,3600,4800,0,0,0,0,0,0,0,0,0],analysisLoad:{uniformLocal:[-1000,-1200,-1600]}});
  const biaxialMid=biaxialSample?.find(x=>Math.abs(x.xM-3)<1e-9);
  const r=flexuralAs(100,600,442,25,400,0.90);
  if(!r.ok)return{passed:false,reason:r.reason};
  const testLayout=buildSymmetricBarLayers(600,500,4,40,10,16,25);
  const perimeterTest=buildPerimeterBarLayout(600,500,4,1,40,10,16,25);
  const ic=testLayout.ok?sectionInteractionCurve(600,500,25,400,200000,0.85,0.85,0.003,testLayout.layers,40,10,16):{ok:false,points:[]};
  const midCapacity=ic.ok?interactionMomentAtAxial(ic,0):null;
  const tensileEnd=ic.points?.[1]?.PnN,compressionEnd=ic.points?.[ic.points.length-1]?.PnN;
  const a=r.AsRequiredMm2,depth=a*400/(0.85*25*600);
  const capacity=0.90*a*400*(442-depth/2)/1e6;
  const barCount=Math.max(2,Math.ceil(a/areaBar(16)));
  const provided=barCount*areaBar(16);
  const spacing=2*areaBar(10)*400*442/(100000);
  const layer=barLayerCapacity(600,40,10,16,25);
  const shearTest=shearDesignDirection(80000,0,600,442,300000,25,400,0.75,1,2*areaBar(10),8*areaBar(16));
  const shearHigh=shearDesignDirection(3000000,0,600,442,300000,25,400,0.75,1,2*areaBar(10),8*areaBar(16));
  const shearLow=shearDesignDirection(10000,0,600,442,300000,25,400,0.75,1,2*areaBar(10),8*areaBar(16));
  const cageLayoutTest=buildPerimeterBarLayout(600,500,4,0,40,10,16,25);
  const cageTest=validateBarCageGeometry(600,500,40,10,16,25,cageLayoutTest.coordinates);
  const cageBadTest=validateBarCageGeometry(600,500,40,10,16,25,[{xMm:45,yMm:45},{xMm:55,yMm:45}]);
  const pathTest=longitudinalBarPathDetail(6,1.8,300),asymmetricPathTest=continuousBarPathDetail(6,1.8,1.4,300);
  const footingClashTest=checkFootingBarClearance([{id:"tie",a:{x:-1,y:0.1,z:0},b:{x:1,y:0.1,z:0},diameterMm:16}],[{id:"grid",a:{x:0,y:0.1,z:-1},b:{x:0,y:0.1,z:1},diameterMm:16}],0);
  const footingClearTest=checkFootingBarClearance([{id:"tie",a:{x:-1,y:0.1,z:0},b:{x:1,y:0.1,z:0},diameterMm:16}],[{id:"grid",a:{x:0,y:0.14,z:-1},b:{x:0,y:0.14,z:1},diameterMm:16}],0);
  const checks={footingGridIntersectionDetected:!footingClashTest.ok&&footingClashTest.conflictPairs===1,footingGridVerticalClearance:footingClearTest.ok&&Math.abs(footingClearTest.minimumClearDistanceMm-24)<1e-8,barCageGeometry:cageTest.ok&&cageTest.insideStirrupCage&&cageTest.spacingViolations===0,barCageRejectsClash:!cageBadTest.ok&&cageBadTest.spacingViolations>0,longitudinalFootingPath:pathTest.ok&&Math.abs(pathTest.straightLengthPerBarM-7.8)<1e-9&&Math.abs(pathTest.totalCutLengthPerBarM-8.4)<1e-9,asymmetricFootingPath:asymmetricPathTest.ok&&Math.abs(asymmetricPathTest.straightLengthPerBarM-7.6)<1e-9,closedStirrupCutLength:!!stirrupDetailTest.ok&&stirrupDetailTest.count===31&&stirrupDetailTest.cutLengthPerStirrupMm>0, torsionDesignValid:!!torsionDesignTest.ok&&torsionDesignTest.required&&torsionDesignTest.requiredAtPerSMm2PerMm>0&&torsionDesignTest.requiredAlMm2>0&&torsionDesignTest.recommendedSpacingMm>0,torsionMinimumThresholdSeparate:!!torsionDesignTest.required&&!torsionDesignTest.minimumRequired,torsionThresholdNoRebar:!!torsionDesignScreen(1e3,0,1e3,600,442,90000,1e3,500,442,85000,300000,25,400,1,torsionGeometryTest,areaBar(10),2*areaBar(10),200).ok&&!torsionDesignScreen(1e3,0,1e3,600,442,90000,1e3,500,442,85000,300000,25,400,1,torsionGeometryTest,areaBar(10),2*areaBar(10),200).required,torsionGeometryValid:!!torsionGeometryTest.ok&&Math.abs(torsionGeometryTest.AcpMm2-300000)<1e-9&&Math.abs(torsionGeometryTest.AohMm2-209100)<1e-9&&Math.abs(torsionGeometryTest.AoMm2-177735)<1e-9,torsionEndDemandExtracted:!!torsionTest&&Math.abs(torsionTest.maxAbsNm-1750000)<1e-9,shearScreenValid:shearTest.ok&&shearTest.maxNominalShearKN>0&&shearTest.minAvPerSmm2PerMm>0,
   shearSpacingUsesCodeLimit:shearTest.recommendedSpacingMm===shearTest.maxSpacingByChapter11Mm&&shearTest.providedAvPerSmm2PerMm>=shearTest.minAvPerSmm2PerMm,
   shearMaximumCapacityRejectsExcess:shearHigh.ok&&!shearHigh.maxShearOK&&!shearHigh.shearOK,
   shearLowDemandNoMinimumStirrups:shearLow.ok&&!shearLow.minimumStirrupsTriggered,barLayerCapacity:layer.ok&&layer.maxBars===12,interactionCurveGenerated:ic.ok&&ic.points.length===102,multiLayerLayout:!!testLayout.ok&&testLayout.rowsPerFace===1&&Math.abs(testLayout.totalAsMm2-8*areaBar(16))<1e-8,perimeterCoordinatesValid:!!perimeterTest.ok&&perimeterTest.coordinates.length===10&&perimeterTest.sideBarCount===2&&perimeterTest.coordinates.every(p=>p.xMm>0&&p.xMm<600&&p.yMm>0&&p.yMm<500)&&perimeterTest.layers.reduce((a,x)=>a+x.count,0)===10,zeroAxialInteractionCapacity:!!midCapacity&&midCapacity.MnKNm>100&&midCapacity.MnKNm<180&&Number.isFinite(midCapacity.MnKNm),interactionSignConvention:Number.isFinite(tensileEnd)&&tensileEnd>0&&Number.isFinite(compressionEnd)&&compressionEnd<0,concurrentAxialForceDiagram:!!axialMid&&Math.abs(axialMid.Nn+7000)<1e-6,biaxialMomentResultant:!!biaxialMid&&Math.abs(biaxialMid.MyNm+7200)<1e-6&&Math.abs(biaxialMid.MzNm-5400)<1e-6&&Math.abs(biaxialMid.MresultantNm-9000)<1e-6&&Math.abs(biaxialMid.Nn+7000)<1e-6,flexuralEquilibrium:Math.abs(capacity-100)<1e-6,barAreaSufficient:provided+1e-9>=a,positiveShearSpacing:spacing>0&&Number.isFinite(spacing),
   pinnedMidspanMoment:Math.abs(ep.MmaxNm-5400)<1e-6,pinnedMaxShear:Math.abs(ep.VmaxN-3600)<1e-6,
   cantileverXMoment:Math.abs(ex.MmaxNm-21600)<1e-6,cantileverZMoment:Math.abs(ez.MmaxNm-21600)<1e-6};
  return{passed:Object.values(checks).every(Boolean),checks,footingClashTest,footingClearTest,pathTest,cageTest,cageBadTest,stirrupDetailTest,torsionTest,torsionGeometryTest,torsionDesignTest,barLayerCapacity600mm:layer,interactionCurvePoints:ic.points?.length,multiLayerTestLayout:testLayout,perimeterTest,shearScreenTest:shearTest,shearHighDemandTest:shearHigh,shearLowDemandTest:shearLow,zeroAxialInteractionCapacity:midCapacity,axialMidSample:axialMid,biaxialMidSample:biaxialMid,AsRequiredMm2:a,phiMnKNm:capacity,bars16PerFace:barCount,AsProvidedMm2:provided,twoLeg10SteelOnlySpacingAt100kNmm:spacing,
   pinnedUniformLoadMomentNm:ep.MmaxNm,cantileverMomentNm:ex.MmaxNm};
 }
 function captureAnalysis(result){if(result&&Array.isArray(result.members)){latest=JSON.parse(JSON.stringify(result));render(false);}}
 function getData(){read();return{schemaVersion:2,settings:{...settings}};}
 function setData(d){if(d&&d.settings)settings={...defaults,...d.settings};try{const s=JSON.parse(localStorage.getItem("sahroudSteel.tieBeamRebarSettings.v1")||"null");if(s&&!d?.settings)settings={...defaults,...s};}catch(e){}write();}
 window.SteelTieBeamReinforcement={captureAnalysis,getData,setData,run:()=>render(true),checkFootingBarClearance,continuousBarPathDetail,selfTest,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
 document.addEventListener("DOMContentLoaded",()=>{try{const s=JSON.parse(localStorage.getItem("sahroudSteel.tieBeamRebarSettings.v1")||"null");if(s)settings={...defaults,...s};}catch(e){}mount();});
})();


/* ===== steel2/js/anchor-baseplate-takeoff.js ===== */
/* SAHROUD STEEL — anchor bolt and base plate quantity schedule
 * Manual schedule inputs only. This module performs quantity/mass takeoff, not connection or anchor design.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const fields=["boltsPerBase","boltDiameterMm","boltShankLengthMm","basePlatesPerBase","plateWidthMm","plateLengthMm","plateThicknessMm","nutsPerBolt","nutUnitMassKg","washersPerBolt","washerUnitMassKg","steelDensityKgM3"];
 const defaults={boltsPerBase:"",boltDiameterMm:"",boltShankLengthMm:"",basePlatesPerBase:"",plateWidthMm:"",plateLengthMm:"",plateThicknessMm:"",nutsPerBolt:"",nutUnitMassKg:"",washersPerBolt:"",washerUnitMassKg:"",steelDensityKgM3:"7850"};
 let state={...defaults},last=null;
 const ids={boltsPerBase:"abBoltsPerBase",boltDiameterMm:"abBoltDia",boltShankLengthMm:"abBoltLength",basePlatesPerBase:"abPlatesPerBase",plateWidthMm:"abPlateWidth",plateLengthMm:"abPlateLength",plateThicknessMm:"abPlateThickness",nutsPerBolt:"abNutsPerBolt",nutUnitMassKg:"abNutMass",washersPerBolt:"abWashersPerBolt",washerUnitMassKg:"abWasherMass",steelDensityKgM3:"abDensity"};
 const n=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)&&x>=0?x:null;};
 const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
 function baseCount(){const r=window.SteelFoundationTakeoff?.getLast?.();return Array.isArray(r?.rows)?r.rows.length:null;}
 function panel(){
  if($("anchorBaseplatePanel"))return;
  const root=$("foundationTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="anchorBaseplatePanel";
  p.innerHTML='<div class="panel-title"><h3>متره بولت‌های مهاری و صفحه‌ستون</h3><span class="status">متره؛ نه طراحی اتصال</span></div>'+
   '<div class="notice">تعداد پایه‌ها از آخرین استخراج واکنش فونداسیون گرفته می‌شود. تمام مشخصات بولت و صفحه‌ستون باید از نقشه یا جدول اتصال وارد شوند. این بخش فقط تعداد و وزن هندسی را برآورد می‌کند؛ ظرفیت کششی/برشی بولت، طول مهاری، بیرون‌زدگی، فاصله از لبه، شکست مخروطی بتن، جوش صفحه‌ستون، سخت‌کننده‌ها و کنترل صفحه‌ستون را طراحی یا تأیید نمی‌کند.</div>'+
   '<h4>بولت‌های مهاری</h4><div class="form-grid">'+
   '<div class="field"><label for="abBoltsPerBase">تعداد بولت در هر پایه</label><input id="abBoltsPerBase" type="number" min="0" step="1" placeholder="طبق نقشه اتصال"></div>'+
   '<div class="field"><label for="abBoltDia">قطر اسمی ساق بولت (mm)</label><input id="abBoltDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abBoltLength">طول محاسباتی ساق بولت (mm)</label><input id="abBoltLength" type="number" min="0" step="1" placeholder="طول واقعی از جدول بولت"></div>'+
   '<div class="field"><label for="abNutsPerBolt">تعداد مهره برای هر بولت</label><input id="abNutsPerBolt" type="number" min="0" step="1" placeholder="طبق جزئیات"></div>'+
   '<div class="field"><label for="abNutMass">وزن هر مهره (kg)</label><input id="abNutMass" type="number" min="0" step="0.001" placeholder="از کاتالوگ/توزین"></div>'+
   '<div class="field"><label for="abWashersPerBolt">تعداد واشر برای هر بولت</label><input id="abWashersPerBolt" type="number" min="0" step="1" placeholder="طبق جزئیات"></div>'+
   '<div class="field"><label for="abWasherMass">وزن هر واشر (kg)</label><input id="abWasherMass" type="number" min="0" step="0.001" placeholder="از کاتالوگ/توزین"></div></div>'+
   '<h4>صفحه‌ستون‌ها</h4><div class="form-grid">'+
   '<div class="field"><label for="abPlatesPerBase">تعداد صفحه‌ستون در هر پایه</label><input id="abPlatesPerBase" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abPlateWidth">عرض صفحه‌ستون (mm)</label><input id="abPlateWidth" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abPlateLength">طول صفحه‌ستون (mm)</label><input id="abPlateLength" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abPlateThickness">ضخامت صفحه‌ستون (mm)</label><input id="abPlateThickness" type="number" min="0" step="0.5" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abDensity">چگالی فولاد (kg/m³)</label><input id="abDensity" type="number" min="1" step="1"></div></div>'+
   '<div class="button-grid"><button id="btnAnchorBaseplateCalc" class="btn primary" type="button">محاسبه متره بولت و صفحه‌ستون</button><button id="btnAnchorBaseplateCSV" class="btn secondary" type="button" disabled>دریافت CSV</button></div>'+
   '<div id="anchorBaseplateSummary" class="notice">ابتدا تحلیل سه‌بعدی و استخراج واکنش پایه‌ها را اجرا کنید؛ سپس مشخصات واقعی اتصال را وارد کنید.</div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:700px"><thead><tr><th>قلم</th><th>تعداد کل</th><th>ابعاد/مبنای محاسبه</th><th>وزن کل (kg)</th></tr></thead><tbody id="anchorBaseplateRows"></tbody></table></div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  fields.forEach(k=>{const el=$(ids[k]);el.value=state[k]??"";el.addEventListener("change",()=>{state[k]=el.value;});});
  $("btnAnchorBaseplateCalc").addEventListener("click",calculate);
  $("btnAnchorBaseplateCSV").addEventListener("click",exportCSV);
 }
 function read(){fields.forEach(k=>{const el=$(ids[k]);if(el)state[k]=el.value;});}
 function calculate(){
  read();const bases=baseCount();
  if(!Number.isInteger(bases)||bases<1){$("anchorBaseplateSummary").textContent="تعداد پایه از آخرین استخراج واکنش قابل دریافت نیست؛ ابتدا تحلیل سه‌بعدی و استخراج واکنش فونداسیون را اجرا کنید.";return;}
  const rows=[],warnings=[];
  const b=n(state.boltsPerBase),d=n(state.boltDiameterMm),bl=n(state.boltShankLengthMm),density=n(state.steelDensityKgM3);
  let boltCount=null,boltMass=null,nutCount=null,nutMass=null,washerCount=null,washerMass=null;
  if(b!==null&&Number.isInteger(b)){
   boltCount=bases*b;
   if(boltCount>0&&d>0&&bl>0&&density>0){boltMass=boltCount*Math.PI*Math.pow(d/1000,2)/4*(bl/1000)*density;rows.push({label:"ساق بولت مهاری",count:boltCount,basis:"قطر "+d+" mm × طول "+bl+" mm؛ استوانه توپر نظری",massKg:boltMass});}
   else if(boltCount>0)warnings.push("برای وزن ساق بولت، تعداد، قطر، طول ساق و چگالی معتبر لازم است.");
   const np=n(state.nutsPerBolt),nm=n(state.nutUnitMassKg);
   if(np!==null&&Number.isInteger(np)){nutCount=boltCount*np;if(nutCount>0&&nm>0){nutMass=nutCount*nm;rows.push({label:"مهره‌ها",count:nutCount,basis:"وزن واحد واردشده: "+nm+" kg",massKg:nutMass});}else if(nutCount>0)warnings.push("وزن واحد مهره وارد نشده؛ وزن مهره‌ها محاسبه نشد.");}
   const wp=n(state.washersPerBolt),wm=n(state.washerUnitMassKg);
   if(wp!==null&&Number.isInteger(wp)){washerCount=boltCount*wp;if(washerCount>0&&wm>0){washerMass=washerCount*wm;rows.push({label:"واشرها",count:washerCount,basis:"وزن واحد واردشده: "+wm+" kg",massKg:washerMass});}else if(washerCount>0)warnings.push("وزن واحد واشر وارد نشده؛ وزن واشرها محاسبه نشد.");}
  }else warnings.push("تعداد صحیح بولت در هر پایه وارد نشده است.");
  const pp=n(state.basePlatesPerBase),pw=n(state.plateWidthMm),pl=n(state.plateLengthMm),pt=n(state.plateThicknessMm);
  let plateCount=null,plateMass=null;
  if(pp!==null&&Number.isInteger(pp)){
   plateCount=bases*pp;
   if(plateCount>0&&pw>0&&pl>0&&pt>0&&density>0){plateMass=plateCount*(pw/1000)*(pl/1000)*(pt/1000)*density;rows.push({label:"صفحه‌ستون مستطیلی ساده",count:plateCount,basis:pw+" × "+pl+" × "+pt+" mm؛ بدون سوراخ و کسر حجم",massKg:plateMass});}
   else if(plateCount>0)warnings.push("برای وزن صفحه‌ستون، ابعاد کامل و چگالی معتبر لازم است.");
  }else warnings.push("تعداد صفحه‌ستون در هر پایه وارد نشده است.");
  const total=rows.reduce((s,x)=>s+x.massKg,0),summary=["تعداد پایه‌های مبنا: "+bases,boltCount!==null?"تعداد بولت: "+boltCount:"تعداد بولت نامشخص",plateCount!==null?"تعداد صفحه‌ستون: "+plateCount:"تعداد صفحه‌ستون نامشخص","وزن اقلام محاسبه‌شده: "+fmt(total)+" kg","این وزن فقط شامل ردیف‌های قابل محاسبه در جدول است."];
  if(warnings.length)summary.push("هشدارها: "+warnings.join(" "));
  $("anchorBaseplateSummary").textContent=summary.join(" | ");
  const body=$("anchorBaseplateRows");body.replaceChildren();
  rows.forEach(x=>{const tr=document.createElement("tr");[x.label,fmt(x.count),x.basis,fmt(x.massKg)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  last={baseCount:bases,boltCount,boltShankMassKg:boltMass,nutCount,nutMassKg:nutMass,washerCount,washerMassKg:washerMass,basePlateCount:plateCount,basePlateMassKg:plateMass,totalCalculatedMassKg:total,rows,warnings,limitations:["وزن ساق بولت از استوانه توپر محاسبه شده و رزوه، سر، قلاب، مهره و واشر را شامل نمی‌شود مگر جداگانه ثبت شوند.","صفحه‌ستون به‌صورت ورق مستطیلی بدون سوراخ، پخ، سخت‌کننده، جوش یا کسر حجم محاسبه شده است.","این گزارش متره است و طراحی یا کنترل ظرفیت بولت، صفحه‌ستون، جوش و مهار بتن نیست.","وزن مهره و واشر فقط از وزن واحد واردشده محاسبه می‌شود؛ وزن فرضی استفاده نشده است."]};
  window.SteelCostEstimate?.refreshFromAnchorTakeoff?.(last);window.SteelProjectBOQ?.refresh?.();
  $("btnAnchorBaseplateCSV").disabled=false;
  return last;
 }
 function exportCSV(){
  if(!last)calculate();if(!last)return;
  const lines=[["گزارش متره بولت و صفحه‌ستون"],["تعداد پایه‌ها",last.baseCount],["قلم","تعداد کل","مبنای هندسی","وزن کل (kg)"],...last.rows.map(x=>[x.label,x.count,x.basis,x.massKg]),["جمع وزن اقلام محاسبه‌شده (kg)",last.totalCalculatedMassKg],...last.warnings.map(x=>["هشدار",x]),...last.limitations.map(x=>["محدودیت",x])];
  const csv="\uFEFF"+lines.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Baseplate-Takeoff.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){read();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;fields.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];const el=$(ids[k]);if(el)el.value=state[k]??"";});}
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelAnchorBaseplateTakeoff={getData,setData,calculate,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
})();

/* ===== steel2/js/project-boq-registry.js ===== */
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
  (sw.blindingSchedule||[]).forEach(row=>{add("sitework-blinding-"+row.nodeId,"بتن مگر","سطح بتن مگر زیر پی "+row.nodeId,"m²",row.areaM2,"متره بتن مگر","مساحت پی به‌علاوه پیش‌آمدگی واردشده در هر طرف");add("sitework-blinding-volume-"+row.nodeId,"بتن مگر","حجم بتن مگر زیر پی "+row.nodeId,"m³",row.concreteM3,"متره بتن مگر","مساحت بتن مگر × ضخامت واردشده");});
  add("sitework-blinding-area","بتن مگر","مساحت کل بتن مگر زیر پی‌ها","m²",sw.blindingAreaM2,"متره بتن مگر","جمع سطوح پی با پیش‌آمدگی واردشده", {aggregationRole:"summary"});
  add("sitework-blinding-concrete","بتن مگر","حجم کل بتن مگر زیر پی‌ها","m³",sw.blindingConcreteM3,"متره بتن مگر","جمع حجم‌های محاسبه‌شده از ضخامت و پیش‌آمدگی صریح", {aggregationRole:"summary"});
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
 const priceAliases={"steel-procurement-mass":"steel","steel-bolt-mass":"bolt","steel-weld-mass":"weld","masonry-brick-total":"brick","mortar-total":"mortar","roof-cover-area":"roof","panel-wall-area-total":"panel","sheet-wall-area-total":"sheet","plaster-area-total":"plaster","foundation-total-concrete":"foundationConcrete","foundation-footing-rebar":"foundationRebar","foundation-pedestal-rebar":"pedestalRebar","foundation-tie-rebar":"tieRebar","foundation-excavation":"excavation","foundation-total-formwork":"formwork","anchor-bolt-count":"anchorBolts","sitework-trench-excavation":"siteworkExcavation","sitework-backfill":"siteworkBackfill","sitework-ground-fill-net":"siteworkGroundFill","sitework-floor-concrete":"floorConcrete","sitework-blinding-concrete":"blindingConcrete"};
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
 steelMass:{groups:[{group:"column",label:"ستون",massKg:500}],connectionPlateMassKg:50,boltShankMassKg:10,theoreticalWeldMetalMassKg:5,procurementMassExcludingBoltsAndWeldKg:600,items:[]},cost:{rows:[{key:"foundationConcrete",unitPrice:100,cost:300},{key:"foundationRebar",unitPrice:200,cost:20000},{key:"excavation",unitPrice:50,cost:250},{key:"formwork",unitPrice:75,cost:825},{key:"anchorBolts",unitPrice:500,cost:12000}]},siteWork:{excavationM3:30,backfillM3:12,fillGrossM3:null,fillNetM3:null,blindingConcreteM3:.704,blindingAreaM2:7.04,blindingSchedule:[{nodeId:"F1",areaM2:7.04,concreteM3:.704}],slabConcreteM3:15,slabCementKg:5250,warnings:[]}});
 const by=new Map(d.rows.map(r=>[r.id,r]));
 const siteWorkBy=new Map(buildSnapshot({siteWork:{excavationM3:30,backfillM3:12,fillGrossM3:null,fillNetM3:null,blindingConcreteM3:.704,blindingAreaM2:7.04,blindingSchedule:[{nodeId:"F1",areaM2:7.04,concreteM3:.704}],slabConcreteM3:15,slabCementKg:5250,warnings:[]}}).rows.map(r=>[r.id,r]));
 const siteWorkCostBy=new Map(buildSnapshot({siteWork:{blindingConcreteM3:.704},cost:{rows:[{key:"blindingConcrete",unitPrice:300,cost:211.2}]}}).rows.map(r=>[r.id,r]));
 const tests={
  siteWorkRowsCaptured:siteWorkBy.get("sitework-trench-excavation")?.quantity===30&&siteWorkBy.get("sitework-backfill")?.quantity===12&&siteWorkBy.get("sitework-floor-concrete")?.quantity===15&&siteWorkBy.get("sitework-floor-cement")?.quantity===5250&&siteWorkBy.get("sitework-blinding-concrete")?.quantity===.704,
  continuousTieBarRowsCaptured:by.get("tie-rebar-TB1-longitudinal")?.quantity===100&&by.get("tie-rebar-TB1-stirrups")?.quantity===20&&by.get("foundation-tie-rebar")?.aggregationRole==="summary",
  blindingConcretePriceAlias:siteWorkCostBy.get("sitework-blinding-concrete")?.pricing?.unitPrice===300&&siteWorkCostBy.get("sitework-blinding-concrete")?.aggregationRole==="summary",
  missingSiteWorkQuantityRemainsPending:siteWorkBy.get("sitework-ground-fill-net")?.quantity===null&&siteWorkBy.get("sitework-ground-fill-net")?.status==="pending"&&siteWorkBy.get("sitework-blinding-concrete")?.quantity===.704,
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


/* ===== steel2/js/footing-structural-screen.js ===== */
/* SAHROUD STEEL — preliminary isolated footing structural screen
 * Transparent mechanics-based screening only. Not a code-compliant footing design.
 * Reactions must be checked for sign convention; load combinations require code verification.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const KEY="sahroudSteel.footingStructuralScreen.v1";
 let state={fcMPa:"",fyMPa:"",minimumSteelRatioPct:"",reactionSignConfirmed:false},last=null;
 const fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:2});
 const positive=x=>{if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
 function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&typeof x==="object")state={...state,...x};}catch(e){}}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
 function panel(){
  if($("footingStructuralScreenPanel"))return;
  const root=$("anchorBaseplatePanel")||$("foundationTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="footingStructuralScreenPanel";
  p.innerHTML='<div class="panel-title"><h3>غربال سازه‌ای پی منفرد</h3><span class="status">کنترل مقدماتی؛ نه تأیید آیین‌نامه‌ای</span></div>'+
   '<div class="notice">این ابزار با واکنش‌های هم‌زمان هر ترکیب، فشار خطی خاک را برای برآورد مقدماتی خمش، برش یک‌طرفه و پانچ به‌کار می‌برد. مدل فشار برای کنترل‌های سازه‌ای ساده‌سازی شده و انتقال لنگر نامتعادل در پانچ، حداقل آرماتور آیین‌نامه‌ای، طول مهاری، وصله، ترک، دوام، نشست، اثر شناژ و اندرکنش گروه پی‌ها را کنترل نمی‌کند. ضرایب بار موجود نیز هنوز با ویرایش رسمی آیین‌نامه پروژه تطبیق نهایی نشده‌اند؛ بنابراین هیچ نتیجه‌ای گواهی طراحی نیست.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="fsFc">مقاومت مشخصه فشاری بتن f\'c (MPa)</label><input id="fsFc" type="number" min="1" step="1" placeholder="طبق مشخصات مصالح"></div>'+
   '<div class="field"><label for="fsFy">تنش تسلیم مشخصه میلگرد fy (MPa)</label><input id="fsFy" type="number" min="1" step="10" placeholder="طبق گواهی میلگرد"></div><div class="field"><label for="fsMinRatio">حداقل نسبت آرماتور خمشی طبق آیین‌نامه پروژه (%)</label><input id="fsMinRatio" type="number" min="0" step="0.01" placeholder="بدون مقدار پیش‌فرض"></div></div><div class="notice">مقدار حداقل آرماتور باید از ویرایش معتبر آیین‌نامه پروژه تعیین شود؛ مقدار پیش‌فرضی اعمال نشده است.</div>'+
   '<label class="check-row" style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><input id="fsReactionSign" type="checkbox"><span>قرارداد علامت واکنش قائم و افقی حل‌گر با یک حالت بار معلوم کنترل شده است؛ فشار فشاری پایه مثبت در نظر گرفته می‌شود.</span></label>'+
   '<div class="button-grid"><button id="btnFootingStructuralScreen" class="btn primary" type="button">اجرای غربال خمش، برش و پانچ</button><button id="btnFootingStructuralCSV" class="btn secondary" type="button" disabled>دریافت CSV کنترل پی</button></div>'+
   '<div id="footingStructuralSummary" class="notice">برای شروع، پوش واکنش‌ها را استخراج کنید و ابعاد پی، پدستال، پوشش بتن و مشخصات مصالح را وارد کنید.</div>'+
   '<h4>نتایج هر پایه و هر حالت بار</h4><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:1000px"><thead><tr><th>پایه / حالت</th><th>ابعاد پی B×L×t (m)</th><th>جهت</th><th>لنگر تقاضا (kN.m/m)</th><th>As لازم (mm²/m)</th><th>As موجود (mm²/m)</th><th>تعداد میلگرد در عرض پی</th><th>فاصله واقعی میلگرد (mm)</th><th>فاصله متناظر با As لازم (mm)</th><th>برش یک‌طرفه Vu / φVc (kN/m)</th><th>پانچ Vu / φVc (kN)</th><th>وضعیت</th></tr></thead><tbody id="footingStructuralRows"></tbody></table></div>'+
   '<div class="notice" id="footingStructuralLimits">این غربال از فشار بیشینه یکنواخت روی طره‌ها استفاده می‌کند؛ محافظه‌کارانه و ساده‌سازی‌شده است و جای تحلیل دقیق فشار متغیر، طراحی کامل پی و کنترل آیین‌نامه‌ای را نمی‌گیرد.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  $("fsFc").value=state.fcMPa;$("fsFy").value=state.fyMPa;$("fsMinRatio").value=state.minimumSteelRatioPct??"";$("fsReactionSign").checked=!!state.reactionSignConfirmed;
  $("fsFc").addEventListener("change",()=>{state.fcMPa=$("fsFc").value;save();});
  $("fsFy").addEventListener("change",()=>{state.fyMPa=$("fsFy").value;save();});$("fsMinRatio").addEventListener("change",()=>{state.minimumSteelRatioPct=$("fsMinRatio").value;save();});
  $("fsReactionSign").addEventListener("change",()=>{state.reactionSignConfirmed=$("fsReactionSign").checked;save();});
  $("btnFootingStructuralScreen").addEventListener("click",run);
  $("btnFootingStructuralCSV").addEventListener("click",exportCSV);
 }
 function requiredAs(Mu,fc,fy,d,b=1000,phi=0.9){
  if(!(Mu>0&&fc>0&&fy>0&&d>0&&b>0))return null;
  const A=fy*fy/(2*0.85*fc*b),B=-fy*d,C=Mu*1e6/phi,disc=B*B-4*A*C;
  if(disc<0)return null;
  const As=(-B-Math.sqrt(disc))/(2*A);
  return Number.isFinite(As)&&As>0?As:null;
 }
 function clipPolygon(poly,axis,bound,greater){
  const out=[];if(!poly.length)return out;
  const inside=p=>greater?p[axis]>=bound-1e-10:p[axis]<=bound+1e-10;
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],ia=inside(a),ib=inside(b);
   if(ia&&ib)out.push(b);
   else if(ia&&!ib||!ia&&ib){
    const den=b[axis]-a[axis];
    if(Math.abs(den)>1e-12){const t=(bound-a[axis])/den,q=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];out.push(q);}
    if(!ia&&ib)out.push(b);
   }
  }
  return out;
 }
 function polygonArea(poly){
  if(poly.length<3)return 0;let a=0;
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}
  return Math.abs(a)/2;
 }
 function clipSegmentLength(a,b,xmin,xmax,zmin,zmax){
  const dx=b[0]-a[0],dz=b[1]-a[1],p=[-dx,dx,-dz,dz],q=[a[0]-xmin,xmax-a[0],a[1]-zmin,zmax-a[1]];
  let lo=0,hi=1;
  for(let i=0;i<4;i++){
   if(Math.abs(p[i])<1e-12){if(q[i]<0)return 0;continue;}
   const r=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);
   if(lo>hi)return 0;
  }
  return Math.hypot(dx,dz)*Math.max(0,hi-lo);
 }
 function clippedPunchGeometry(B,L,cx,cz,ox,oz,d){
  const hw=(cx+d)/2,hl=(cz+d)/2;
  const poly=[[ox-hw,oz-hl],[ox+hw,oz-hl],[ox+hw,oz+hl],[ox-hw,oz+hl]];
  const xmin=-B/2,xmax=B/2,zmin=-L/2,zmax=L/2;
  let clipped=poly;
  clipped=clipPolygon(clipped,0,xmin,true);clipped=clipPolygon(clipped,0,xmax,false);
  clipped=clipPolygon(clipped,1,zmin,true);clipped=clipPolygon(clipped,1,zmax,false);
  let b0=0;
  for(let i=0;i<poly.length;i++)b0+=clipSegmentLength(poly[i],poly[(i+1)%poly.length],xmin,xmax,zmin,zmax);
  return{area:polygonArea(clipped),b0,fullPerimeter:2*((cx+d)+(cz+d)),clipped: b0<2*((cx+d)+(cz+d))-1e-8};
 }
 function run(){
  const summary=$("footingStructuralSummary"),body=$("footingStructuralRows");body.replaceChildren();last=null;
  const foundation=window.SteelFoundationTakeoff?.getLast?.(),inputs=window.SteelFoundationTakeoff?.getData?.();
  if(!foundation?.rows?.length){summary.textContent="ابتدا تحلیل سه‌بعدی و استخراج پوش واکنش فونداسیون را اجرا کنید.";return;}
  if(!state.reactionSignConfirmed){summary.textContent="ابتدا قرارداد علامت واکنش‌ها را با یک حالت بار معلوم کنترل کنید و سپس گزینه تأیید را فعال کنید. در غیر این صورت تشخیص فشار و کشش ممکن است وارونه شود.";return;}
  const fc=positive(state.fcMPa),fy=positive(state.fyMPa),minRatioRaw=String(state.minimumSteelRatioPct??"").trim(),minRatio=minRatioRaw===""?null:Number(minRatioRaw),cover=positive(inputs?.rebarCoverMm),gammaC=positive(inputs?.concreteUnitWeightKNm3);
  const cx=positive(inputs?.pedestalWidthM),cz=positive(inputs?.pedestalLengthM),pedH=positive(inputs?.pedestalHeightM);
  const dx=positive(inputs?.bottomBarDiaXmm),sx=positive(inputs?.bottomBarSpacingXmm),dz=positive(inputs?.bottomBarDiaZmm),sz=positive(inputs?.bottomBarSpacingZmm);
  const ox=inputs?.columnOffsetXM===""?null:Number(inputs?.columnOffsetXM),oz=inputs?.columnOffsetZM===""?null:Number(inputs?.columnOffsetZM);
  if(!fc||!fy||!cover||!gammaC||!cx||!cz||!pedH||!dx||!sx||!dz||!sz||!Number.isFinite(ox)||!Number.isFinite(oz)||!(minRatio===null||(Number.isFinite(minRatio)&&minRatio>=0))){
   summary.textContent="ورودی لازم: f'c، fy، ابعاد و ارتفاع پدستال، پوشش بتن، وزن مخصوص بتن، شبکه میلگرد تحتانی در دو راستا و خروج از مرکز ستون (برای ستون مرکزی صفر وارد کنید).";return;
  }
  const gammaS=positive(inputs?.soilUnitWeightKNm3),soilCover=inputs?.soilCoverDepthM===""?0:Number(inputs?.soilCoverDepthM);
  if(!Number.isFinite(soilCover)||soilCover<0||(soilCover>0&&!gammaS)){summary.textContent="ضخامت یا وزن مخصوص خاک پوششی نامعتبر است.";return;}
  const coverage=window.SteelFoundationTakeoff?.validateReactionCaseCoverage?.(foundation.rows);
  if(!coverage?.ok){summary.textContent="غربال خمش، برش و پانچ متوقف شد: "+(coverage?.issues||["ممیزی پوش واکنش معتبر در دسترس نیست."]).join(" ");return;}
  const records=[],footingSummary=[];
  const addRow=rec=>{
   records.push(rec);const tr=document.createElement("tr");
   [rec.nodeId+" / "+rec.caseLabel,rec.footingDimensions||"—",rec.direction,rec.MuKNmPerM===null?"—":fmt(rec.MuKNmPerM),rec.AsRequired===null?"—":fmt(rec.AsRequired),rec.AsProvided===null?"وارد نشده":fmt(rec.AsProvided),rec.barCount===undefined?"—":fmt(rec.barCount),rec.actualSpacingMm===undefined?"—":fmt(rec.actualSpacingMm),rec.spacingByStrengthMm===null?"—":fmt(rec.spacingByStrengthMm),rec.oneWayDemand===null?"—":fmt(rec.oneWayDemand)+" / "+fmt(rec.oneWayCapacity),rec.punchDemand===null?"—":fmt(rec.punchDemand)+" / "+fmt(rec.punchCapacity),rec.status].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);
  };
  foundation.rows.forEach(row=>{
   const spec=window.SteelFoundationTakeoff?.footingSpecFor?.(row);
   if(!spec||![spec.width,spec.length,spec.thickness].every(v=>Number.isFinite(v)&&v>0)){
    addRow({nodeId:row.nodeId,caseLabel:"—",footingDimensions:"نامعتبر",direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"ابعاد مستقل این پی معتبر نیست؛ کنترل انجام نشد"});return;
   }
   const B=spec.width,L=spec.length,t=spec.thickness;
   const pedestalFits=cx<=B&&cz<=L&&Math.abs(ox)+cx/2<=B/2+1e-9&&Math.abs(oz)+cz/2<=L/2+1e-9;
   if(!pedestalFits){addRow({nodeId:row.nodeId,caseLabel:"—",footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"پدستال/خروج از مرکز در محدوده این پی قرار ندارد"});return;}
   const dX=t*1000-cover-dz/2,dZ=t*1000-cover-dx/2;
   if(dX<=0||dZ<=0){addRow({nodeId:row.nodeId,caseLabel:"—",footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"عمق مؤثر نامعتبر است"});return;}
   const pedestalWeight=gammaC*cx*cz*pedH,concreteWeight=gammaC*B*L*t+pedestalWeight;
   const soilWeight=soilCover>0?gammaS*Math.max(0,B*L-cx*cz)*soilCover:0;
   const added=concreteWeight+soilWeight,area=B*L;
   const cases=row.caseReactions;
   cases.forEach(item=>{
    const v=item.values,N=v[1]/1000,mx0=v[3]/1e6,mz0=v[5]/1e6;
    if(![N,mx0,mz0].every(Number.isFinite)){addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"واکنش ناقص یا نامعتبر"});return;}
    if(N<=0){addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"واکنش قائم فشاری مثبت نیست؛ کنترل تماس/بالاکشیدگی جداگانه لازم است"});return;}
    const Mx=mx0-oz*(N+pedestalWeight),Mz=mz0+ox*(N+pedestalWeight),totalN=N+added;
    const q0=totalN/area,bend=6*Math.abs(Mx)/(B*L*L)+6*Math.abs(Mz)/(L*B*B),qmax=q0+bend,qmin=q0-bend;
    if(qmin<0){addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"تماس کامل برقرار نیست؛ کنترل خمش/برش با این مدل فشار متوقف شد"});return;}
    const specs=[
     {direction:"طره X؛ میلگرد موازی Z",projection:(B-cx)/2+Math.abs(ox),d:dX,dia:dz,spacing:sz},
     {direction:"طره Z؛ میلگرد موازی X",projection:(L-cz)/2+Math.abs(oz),d:dZ,dia:dx,spacing:sx}
    ];
    specs.forEach(s=>{
     const leff=Math.max(0,s.projection-s.d/1000),Mu=qmax*s.projection*s.projection/2;
     const AsFlex=requiredAs(Mu,fc,fy,s.d),AsMin=minRatio===null?null:minRatio/100*1000*t*1000,AsDesign=AsFlex===null?null:Math.max(AsFlex,AsMin??0),barArea=Math.PI*s.dia*s.dia/4,cross=(s.direction.startsWith("طره X")?B:L)*1000-2*cover,barCount=Math.ceil(cross/s.spacing)+1,actualSpacing=barCount>1?cross/(barCount-1):0,AsProv=barArea*1000/actualSpacing;
     const spacingByStrength=AsDesign&&AsDesign>0?barArea*1000/AsDesign:null;
     const vu=qmax*leff,vc=0.75*0.17*Math.sqrt(fc)*s.d;
     const flex=AsFlex===null?"As لازم قابل محاسبه نیست":AsProv>=AsDesign?"فولاد موجود از نیاز طراحی خمشی کمتر نیست":"فولاد موجود از نیاز طراحی خمشی کمتر است";
     const oneWay=leff<=0?"مقطع بحرانی برش یک‌طرفه خارج از طره قرار می‌گیرد":vu<=vc?"تقاضای برش یک‌طرفه کمتر از ظرفیت فرضی است":"تقاضای برش یک‌طرفه از ظرفیت فرضی بیشتر است";
     addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:s.direction,MuKNmPerM:Mu,AsRequired:AsDesign,AsFlexural:AsFlex,AsMinimum:AsMin,AsProvided:AsProv,barCount,actualSpacingMm:actualSpacing,spacingByStrengthMm:spacingByStrength,oneWayDemand:vu,oneWayCapacity:vc,punchDemand:null,punchCapacity:null,qmaxKPa:qmax,status:flex+"؛ "+oneWay});
    });
    const dPunch=Math.min(dX,dZ),pg=clippedPunchGeometry(B,L,cx,cz,ox,oz,dPunch/1000);
    const Vu=Math.max(0,N+pedestalWeight-qmax*pg.area),Vc=0.75*0.33*Math.sqrt(fc)*pg.b0*1000*dPunch/1000;
    const punchStatus=pg.b0<=1e-8?"محیط بحرانی پانچ در داخل پی طول مؤثر ندارد":Vu<=Vc?"تقاضای پانچ کمتر از ظرفیت فرضی است":"تقاضای پانچ از ظرفیت فرضی بیشتر است";
    addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"پانچ پیرامون پدستال"+(pg.clipped?"؛ محیط بریده‌شده در لبه پی":""),MuKNmPerM:0,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:Vu,punchCapacity:Vc,punchPerimeterMm:pg.b0*1000,punchAreaM2:pg.area,qmaxKPa:qmax,status:punchStatus});
   });
   footingSummary.push({nodeId:row.nodeId,widthM:B,lengthM:L,thicknessM:t,concreteWeightKN:concreteWeight,soilCoverWeightKN:soilWeight});
  });
  if(!records.length){summary.textContent="هیچ ردیف محاسباتی تولید نشد؛ داده واکنش‌ها و ابعاد پایه‌ها را بررسی کنید.";return;}
  const warning=records.filter(r=>/کمتر است|بیشتر است|نامعتبر|برقرار نیست|متوقف شد|نیست؛|ناقص/.test(r.status)).length;
  summary.textContent="غربال مقدماتی مستقل برای "+footingSummary.length+" پی با ابعاد اختصاصی اجرا شد؛ "+records.length+" ردیف کنترل و "+warning+" ردیف هشدار. بتن "+fmt(fc)+" MPa، میلگرد "+fmt(fy)+" MPa. حداقل نسبت آرماتور: "+(minRatio===null?"وارد نشده؛ کنترل حداقل آیین‌نامه‌ای باز است":fmt(minRatio)+"٪")+"؛ تعداد میلگرد و فاصله واقعی شبکه موجود نیز برای هر راستا محاسبه شده است. اثر لنگر نامتعادل پانچ هنوز منظور نشده است. نتایج تأیید آیین‌نامه‌ای یا مجوز اجرا نیست.";
  $("btnFootingStructuralCSV").disabled=false;
  last={generatedAt:new Date().toISOString(),basis:"preliminary_per_base_mechanics_screen_not_code_design",fcMPa:fc,fyMPa:fy,minimumSteelRatioPct:minRatio,phiFlexure:0.9,phiShear:0.75,footings:footingSummary,records,limitations:["ابعاد B×L×t و وزن بتن هر پی از جدول مستقل همان پایه خوانده شده است.","فشار خطی با فرض پی صلب و تماس کامل؛ در خروج از هسته مرکزی کنترل خمش/برش متوقف می‌شود.","فشار بیشینه یکنواخت روی طره‌ها اعمال شده؛ انتگرال‌گیری دقیق فشار متغیر و سهم وزن پی در خمش موضعی انجام نشده است.","پانچ با محیط مستطیلی در d/2 و طول مؤثر بریده‌شده در لبه پی غربال شده؛ اثر لنگر نامتعادل، انتقال برش نامتقارن، گوشه‌ها و ضوابط دقیق محیط بحرانی آیین‌نامه‌ای کامل نیست.","روابط و ضرایب φ فرضی 0.90 و 0.75 هستند و هنوز با ویرایش رسمی آیین‌نامه پروژه تطبیق نشده‌اند.","حداقل نسبت آرماتور فقط در صورت ورود مقدار مصوب آیین‌نامه پروژه اعمال می‌شود؛ در غیر این صورت کنترل حداقل باز است. طول مهاری، وصله، قلاب، ترک، دوام، آرماتور بالایی/موضعی، پانچ اطراف صفحه‌ستون و جزئیات شناژ بررسی نشده‌اند.","ترکیبات بار موجود در نرم‌افزار هنوز ترکیبات نهایی/تأییدشده آیین‌نامه‌ای نیستند؛ این گزارش تأیید طراحی یا مجوز اجرا نیست."]};
  save();
 }
 function exportCSV(){
  if(!last)run();if(!last)return;
  const rows=[["گزارش غربال سازه‌ای پی منفرد"],["مبنای گزارش",last.basis],["fc MPa",last.fcMPa],["fy MPa",last.fyMPa],["φ flexure",last.phiFlexure],["φ shear",last.phiShear],["پایه/حالت","ابعاد پی B×L×t (m)","جهت","Mu kN.m/m","As design mm2/m","As flexural mm2/m","As minimum mm2/m","As provided mm2/m","bar count","actual spacing mm","spacing from As mm","Vu one-way kN/m","φVc one-way kN/m","Vu punching kN","φVc punching kN","punch perimeter mm","punch area m2","status"],...last.records.map(r=>[r.nodeId+" / "+r.caseLabel,r.footingDimensions,r.direction,r.MuKNmPerM,r.AsRequired,r.AsFlexural,r.AsMinimum,r.AsProvided,r.barCount,r.actualSpacingMm,r.spacingByStrengthMm,r.oneWayDemand,r.oneWayCapacity,r.punchDemand,r.punchCapacity,r.punchPerimeterMm,r.punchAreaM2,r.status]),...last.limitations.map(x=>["محدودیت",x])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Footing-Structural-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;state={...state,...d};if($("fsFc")){$("fsFc").value=state.fcMPa;$("fsFy").value=state.fyMPa;$("fsMinRatio").value=state.minimumSteelRatioPct??"";$("fsReactionSign").checked=!!state.reactionSignConfirmed;}save();}
 document.addEventListener("DOMContentLoaded",()=>{load();panel();});
 window.SteelFootingStructuralScreen={getData,setData,run,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
})();

/* ===== steel2/js/footing-sizing-assistant.js ===== */
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
  try{const saved=JSON.parse(localStorage.getItem("sahroudSteel.footingSizingAssistant.v1")||"null");if(saved&&typeof saved==="object")state={...state,...saved};}catch(e){}
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
  ["fsaMin","fsaMax","fsaStep"].forEach((id,i)=>$(id).addEventListener("change",()=>{state[["minSideM","maxSideM","stepM"][i]]=$(id).value;try{localStorage.setItem("sahroudSteel.footingSizingAssistant.v1",JSON.stringify(state));}catch(e){}}));
  $("btnFootingSizeSearch").addEventListener("click",search);
  $("btnFootingSizeApply").addEventListener("click",apply);
  $("btnFootingSizeCSV").addEventListener("click",exportCSV);
 }
 function search(){
  const summary=$("footingSizeSummary"),body=$("footingSizeRows");body.replaceChildren();last=null;$("btnFootingSizeApply").disabled=true;$("btnFootingSizeCSV").disabled=true;
  const report=window.SteelFoundationTakeoff?.getLast?.(),inputs=window.SteelFoundationTakeoff?.getData?.();
  if(!window.SteelFootingStructuralScreen?.getData?.()?.reactionSignConfirmed){summary.textContent="پیش از جست‌وجوی ابعاد، قرارداد علامت واکنش قائم را در بخش غربال سازه‌ای با یک حالت بار معلوم کنترل و تأیید کنید.";return;}
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
 window.SteelFootingSizingAssistant={search,getData:()=>JSON.parse(JSON.stringify(state)),setData:(d)=>{if(d&&typeof d==="object")state={...state,...d};try{localStorage.setItem("sahroudSteel.footingSizingAssistant.v1",JSON.stringify(state));}catch(e){}if($("fsaMin")){$("fsaMin").value=state.minSideM;$("fsaMax").value=state.maxSideM;$("fsaStep").value=state.stepM;}},getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
})();

/* ===== steel2/js/rail-beam-fem.js ===== */
/* SAHROUD STEEL — 1D Euler-Bernoulli continuous rail beam FEM.
 * Linear elastic small-displacement model. Units: N, m, Pa, N/m, N.m/rad.
 * Software verification is not independent engineering validation.
 */
(function(root){
"use strict";
function solveLinear(A,b){
 const n=b.length,M=A.map((r,i)=>r.slice().concat([b[i]]));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(!(Math.abs(M[p][k])>1e-12))throw Error("ماتریس سختی تیر ریل تکین یا ناپایدار است؛ قیود و فنرهای تکیه‌گاهی را بررسی کنید.");
  [M[k],M[p]]=[M[p],M[k]];
  const pivot=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=pivot;
  for(let i=0;i<n;i++){if(i===k)continue;const f=M[i][k];if(f===0)continue;for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j];}
 }
 return M.map(r=>r[n]);
}
function shape(xi,L){
 const x=Math.max(0,Math.min(1,xi)),x2=x*x,x3=x2*x;
 return [1-3*x2+2*x3,L*(x-2*x2+x3),3*x2-2*x3,L*(-x2+x3)];
}
function elementK(EI,L){
 const L2=L*L,L3=L2*L,s=EI/L3;
 return [[12*s,6*L*s,-12*s,6*L*s],[6*L*s,4*L2*s,-6*L*s,2*L2*s],[-12*s,-6*L*s,12*s,-6*L*s],[6*L*s,2*L2*s,-6*L*s,4*L2*s]];
}
function analyze(input){
 const p=input||{},length=Number(p.length_m),E=Number(p.E_MPa),I=Number(p.Ix_mm4);
 if(!(Number.isFinite(length)&&length>0&&Number.isFinite(E)&&E>0&&Number.isFinite(I)&&I>0))throw Error("طول، مدول الاستیسیته و ممان اینرسی ریل باید مثبت و معتبر باشند.");
 const EI=E*I/1e6;
 const mesh=(Array.isArray(p.meshPositions_m)?p.meshPositions_m:[]).concat([0,length],(p.supports||[]).map(s=>Number(s.x_m))).filter(Number.isFinite).sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-8);
 if(mesh.length<2||Math.abs(mesh[0])>1e-8||Math.abs(mesh[mesh.length-1]-length)>1e-8)throw Error("شبکه تیر باید از صفر تا طول کامل ریل را پوشش دهد.");
 if(mesh.some(x=>x<0||x>length))throw Error("مختصات شبکه خارج از طول ریل است.");
 const supports=p.supports||[],loads=p.pointLoads||[];
 if(supports.length<2)throw Error("حداقل دو ایستگاه تکیه‌گاهی فنری لازم است.");
 supports.forEach((s,i)=>{if(!(Number.isFinite(Number(s.x_m))&&Number(s.x_m)>=0&&Number(s.x_m)<=length&&Number.isFinite(Number(s.kVertical_N_m))&&Number(s.kVertical_N_m)>0))throw Error("مختصات و سختی قائم تکیه‌گاه شماره "+(i+1)+" باید معتبر و سختی مثبت باشد.");if(s.kRotational_Nm_rad!==undefined&&s.kRotational_Nm_rad!==null&&!(Number.isFinite(Number(s.kRotational_Nm_rad))&&Number(s.kRotational_Nm_rad)>=0))throw Error("سختی دورانی تکیه‌گاه باید صفر یا مثبت باشد.");});
 if(new Set(supports.map(s=>Number(s.x_m).toFixed(8))).size<2)throw Error("حداقل دو موقعیت مکانی مستقل برای تکیه‌گاه‌های قائم لازم است.");
 loads.forEach((l,i)=>{if(!(Number.isFinite(Number(l.x_m))&&Number(l.x_m)>=0&&Number(l.x_m)<=length&&Number.isFinite(Number(l.P_N))))throw Error("مختصات و مقدار بار چرخ شماره "+(i+1)+" نامعتبر است.");});
 const n=mesh.length,nd=2*n,K=Array.from({length:nd},()=>Array(nd).fill(0)),F=Array(nd).fill(0),elements=[];
 for(let e=0;e<n-1;e++){
  const L=mesh[e+1]-mesh[e];if(!(L>1e-9))throw Error("طول المان تیر ریل باید مثبت باشد.");
  const ke=elementK(EI,L),dofs=[2*e,2*e+1,2*(e+1),2*(e+1)+1];
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)K[dofs[i]][dofs[j]]+=ke[i][j];
  elements.push({index:e+1,x1_m:mesh[e],x2_m:mesh[e+1],length_m:L,dofs,ke,loadVector:[0,0,0,0]});
 }
 const loadAudit=[];
 loads.forEach((load,index)=>{
  const x=Number(load.x_m),P=Number(load.P_N);let e=elements.findIndex(el=>x>=el.x1_m-1e-9&&x<=el.x2_m+1e-9);
  if(e<0)throw Error("بار چرخ خارج از شبکه تیر است.");
  const el=elements[e],xi=(x-el.x1_m)/el.length_m,N=shape(xi,el.length_m),equiv=N.map(v=>v*P);
  el.dofs.forEach((d,j)=>{F[d]+=equiv[j];el.loadVector[j]+=equiv[j];});
  loadAudit.push({index:index+1,x_m:x,P_N:P,element:e+1,localCoordinate:xi,shapeFunctions:N,equivalentNodalLoads:equiv});
 });
 const springRows=[];
 supports.forEach((s,index)=>{
  const x=Number(s.x_m),i=mesh.findIndex(v=>Math.abs(v-x)<1e-7);
  if(i<0)throw Error("ایستگاه تکیه‌گاهی در شبکه تیر وجود ندارد.");
  const kv=Number(s.kVertical_N_m),kr=s.kRotational_Nm_rad==null?0:Number(s.kRotational_Nm_rad);
  K[2*i][2*i]+=kv;if(kr>0)K[2*i+1][2*i+1]+=kr;
  springRows.push({station:index+1,x_m:x,nodeIndex:i,verticalStiffness_N_m:kv,rotationalStiffness_Nm_rad:kr});
 });
 const D=solveLinear(K,F),springReactions=springRows.map(s=>({station:s.station,x_m:s.x_m,verticalReaction_N:-s.verticalStiffness_N_m*D[2*s.nodeIndex],rotationalReaction_Nm:-s.rotationalStiffness_Nm_rad*D[2*s.nodeIndex+1],verticalDisplacement_m:D[2*s.nodeIndex],rotation_rad:D[2*s.nodeIndex+1]}));
 const totalLoad=loads.reduce((a,l)=>a+Number(l.P_N),0),totalReaction=springReactions.reduce((a,r)=>a+r.verticalReaction_N,0);
 const appliedMoment=loads.reduce((a,l)=>a+Number(l.P_N)*Number(l.x_m),0),reactionMoment=springReactions.reduce((a,r)=>a+r.verticalReaction_N*r.x_m,0)+springReactions.reduce((a,r)=>a+r.rotationalReaction_Nm,0);
 const elementResults=elements.map(el=>{const d=el.dofs.map(i=>D[i]),end=el.ke.map((row,i)=>row.reduce((a,v,j)=>a+v*d[j],0)-el.loadVector[i]);return {index:el.index,start_m:el.x1_m,end_m:el.x2_m,endActions:[end[0],end[1],end[2],end[3]]};});
 const maxDeflection=D.filter((_,i)=>i%2===0).reduce((best,v,i)=>Math.abs(v)>Math.abs(best.value)?{value:v,x_m:mesh[i]}:best,{value:0,x_m:0});
 return {success:true,method:"linear Euler-Bernoulli beam FEM with cubic Hermite interpolation",units:{force:"N",length:"m",moment:"N.m",verticalSpring:"N/m",rotationalSpring:"N.m/rad"},length_m:length,EI_Nm2:EI,nodeCount:n,elementCount:elements.length,supportCount:springRows.length,pointLoadCount:loads.length,nodes:mesh.map((x,i)=>({x_m:x,verticalDisplacement_m:D[2*i],rotation_rad:D[2*i+1]})),supports:springReactions,loads:loadAudit,elements:elementResults,maxNodalDeflection:maxDeflection,equilibrium:{verticalLoad_N:totalLoad,verticalReaction_N:totalReaction,verticalResidual_N:totalLoad+totalReaction,globalMoment_Nm:appliedMoment+reactionMoment,ok:Math.abs(totalLoad+totalReaction)<=Math.max(1e-5,Math.abs(totalLoad)*1e-7)&&Math.abs(appliedMoment+reactionMoment)<=Math.max(1e-5,Math.abs(appliedMoment)*1e-7)},analysisEnabled:false,solverExecuted:true,limitations:["Linear elastic Euler-Bernoulli beam; shear deformation and warping torsion omitted.","Small displacement, constant EI per run; no geometric or material nonlinearity.","Support springs are independent scalar vertical/rotational springs; no uplift-only contact, gap, friction, slip, hysteresis or coupled stiffness.","Point loads between nodes are transferred by cubic Hermite shape functions; wheel load dynamics/impact are not included.","Rail joints, fishplates, weld continuity, lateral restraint and torsional behavior require separately verified models.","Not a code-compliance design or approval; support stiffness and section properties must be documented."]};
}
function auditReadiness(input){
 const p=input||{},issues=[],L=Number(p.length_m),E=Number(p.E_MPa),I=Number(p.Ix_mm4);
 if(!(Number.isFinite(L)&&L>0))issues.push("طول ریل معتبر نیست.");
 if(!(Number.isFinite(E)&&E>0))issues.push("مدول الاستیسیته مستند و مثبت لازم است.");
 if(!(Number.isFinite(I)&&I>0))issues.push("ممان اینرسی حول محور خمش قائم با مرجع معتبر لازم است.");
 if(!String(p.propertySource||"").trim())issues.push("مرجع خواص مقطع ریل ثبت نشده است.");
 if(p.continuity!=="continuous")issues.push("این نسخه فقط ریل پیوسته با رفتار خمشی پیوسته را می‌پذیرد؛ حالت ساده‌تکیه‌گاهی/وصله نامشخص هنوز مدل نشده است.");
 if(Array.isArray(p.jointPositions_m)&&p.jointPositions_m.some(x=>Number(x)>1e-8&&Number(x)<L-1e-8))issues.push("برای وصله‌های میانی، جزئیات انتقال برش و لنگر و پیوستگی دورانی باید پیش از تحلیل مشخص شود.");
 const stations=Array.isArray(p.supportStations_m)?p.supportStations_m:[],ks=Array.isArray(p.verticalSpringStiffness_N_m)?p.verticalSpringStiffness_N_m:[];
 if(stations.length<2)issues.push("حداقل دو ایستگاه تکیه‌گاهی لازم است.");
 if(ks.length!==stations.length||ks.some(k=>!(Number.isFinite(Number(k))&&Number(k)>0)))issues.push("برای تک‌تک ایستگاه‌ها سختی قائم مثبت و مستند لازم است.");
 if(!String(p.supportStiffnessSource||"").trim())issues.push("مرجع سختی قائم بست/پد ثبت نشده است.");
 const loads=Array.isArray(p.pointLoads)?p.pointLoads:[];
 if(!loads.length)issues.push("قطار چرخ مستند و بارهای قائم چرخ لازم است.");
 loads.forEach((l,i)=>{if(!(Number.isFinite(Number(l.x_m))&&Number(l.x_m)>=0&&Number(l.x_m)<=L&&Number.isFinite(Number(l.P_N))))issues.push("مختصات/بار چرخ شماره "+(i+1)+" نامعتبر است.");if(!String(l.source||"").trim()||!String(l.document||"").trim())issues.push("منبع و شماره صفحه/مرجع بار چرخ شماره "+(i+1)+" لازم است.");});
 return {ready:issues.length===0,analysisEnabled:false,issues,note:"ممیزی فقط کامل بودن ورودی را می‌سنجد؛ حتی پس از تکمیل، تحلیل نیازمند اعتبارسنجی مستقل و بررسی مهندسی است."};
}
function analyzeIfReady(input){
 const audit=auditReadiness(input);
 if(!audit.ready)return {success:false,analysisEnabled:false,audit};
 const supports=input.supportStations_m.map((x,i)=>({x_m:Number(x),kVertical_N_m:Number(input.verticalSpringStiffness_N_m[i])}));
 const pointLoads=input.pointLoads.map(l=>({x_m:Number(l.x_m),P_N:Number(l.P_N)}));
 const result=analyze({...input,supports,pointLoads});
 return {...result,inputAudit:audit,analysisEnabled:false,note:"نتیجه تحلیل عددی مقدماتی است؛ برای طراحی/تأیید اجرایی کافی نیست."};
}

function movingLoadEnvelope(input){
 const p=input||{},L=Number(p.length_m),step=Number(p.step_m),wheels=Array.isArray(p.wheels)?p.wheels:[];
 const issues=[];
 if(!(Number.isFinite(step)&&step>0))issues.push("گام جاروب بار متحرک باید مثبت و بر حسب متر باشد.");
 if(!wheels.length)issues.push("حداقل یک چرخ مستند برای قطار متحرک لازم است.");
 wheels.forEach((w,i)=>{if(!(Number.isFinite(Number(w.offset_m))&&Number(w.offset_m)>=0&&Number.isFinite(Number(w.P_N))))issues.push("آفست یا بار چرخ متحرک شماره "+(i+1)+" نامعتبر است.");if(!String(w.source||"").trim()||!String(w.document||"").trim())issues.push("منبع و شماره مرجع برای چرخ متحرک شماره "+(i+1)+" لازم است.");});
 if(wheels.some((w,i)=>i&&Number(w.offset_m)<Number(wheels[i-1].offset_m)))issues.push("آفست چرخ‌ها باید به ترتیب صعودی از چرخ مبنا ثبت شوند.");
 const baseLoad=wheels.length?{x_m:0,P_N:Number(wheels[0].P_N),source:wheels[0].source,document:wheels[0].document}:null;
 const baseAudit=auditReadiness({...p,pointLoads:baseLoad?[baseLoad]:[]});
 issues.push(...baseAudit.issues.filter(x=>!x.includes("قطار چرخ مستند")));
 if(issues.length)return {success:false,analysisEnabled:false,audit:{ready:false,issues},note:"جاروب بار متحرک اجرا نشد."};
 const maxOffset=Math.max(...wheels.map(w=>Number(w.offset_m))),rawCount=Math.ceil((L+maxOffset)/step)+1;
 if(rawCount>1200)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["تعداد موقعیت‌های جاروب بیش از ۱۲۰۰ است؛ گام بزرگ‌تری انتخاب کنید."]}};
 const positions=new Set();
 for(let x=-maxOffset;x<=L+step*1e-8;x+=step)positions.add(Number(x.toFixed(10)));
 // Include exact wheel entry/exit and support-crossing positions in addition to the regular grid.
 (p.supportStations_m||[]).forEach(s=>wheels.forEach(w=>positions.add(Number((Number(s)-Number(w.offset_m)).toFixed(10)))));
 wheels.forEach(w=>{positions.add(Number((-Number(w.offset_m)).toFixed(10)));positions.add(Number((L-Number(w.offset_m)).toFixed(10)));});
 const sorted=[...positions].filter(x=>x>=-maxOffset-1e-8&&x<=L+1e-8).sort((a,b)=>a-b);
 if(sorted.length>1500)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["تعداد موقعیت‌های ویژه و نمونه‌برداری‌شده بیش از ۱۵۰۰ است."]}};
 const supportEnvelope=(p.supportStations_m||[]).map((x,i)=>({station:i+1,x_m:Number(x),maxReaction_N:-Infinity,minReaction_N:Infinity,maxCase:null,minCase:null}));
 let maxDef={positive_m:-Infinity,negative_m:Infinity,maxCase:null,minCase:null},cases=0,failed=[];
 sorted.forEach(ref=>{const active=wheels.map(w=>({...w,x_m:ref+Number(w.offset_m)})).filter(w=>w.x_m>=-1e-9&&w.x_m<=L+1e-9);
  if(!active.length)return;
  try{
   const loads=active.map(w=>({x_m:Math.max(0,Math.min(L,w.x_m)),P_N:Number(w.P_N)}));
   const result=analyze({...p,supports:(p.supportStations_m||[]).map((x,i)=>({x_m:Number(x),kVertical_N_m:Number(p.verticalSpringStiffness_N_m[i])})),pointLoads:loads});
   if(!result.equilibrium.ok){failed.push({referencePosition_m:ref,reason:"تعادل کلی برقرار نیست"});return;}
   cases++;
   const concurrent=result.supports.map(s=>({station:s.station,x_m:s.x_m,verticalReaction_N:s.verticalReaction_N}));
   result.supports.forEach((r,i)=>{const e=supportEnvelope[i];if(r.verticalReaction_N>e.maxReaction_N){e.maxReaction_N=r.verticalReaction_N;e.maxCase={referencePosition_m:ref,activeWheelCount:active.length,concurrentReactions:concurrent};}if(r.verticalReaction_N<e.minReaction_N){e.minReaction_N=r.verticalReaction_N;e.minCase={referencePosition_m:ref,activeWheelCount:active.length,concurrentReactions:concurrent};}});
   result.nodes.forEach(n=>{if(n.verticalDisplacement_m>maxDef.positive_m){maxDef.positive_m=n.verticalDisplacement_m;maxDef.maxCase={referencePosition_m:ref,x_m:n.x_m};}if(n.verticalDisplacement_m<maxDef.negative_m){maxDef.negative_m=n.verticalDisplacement_m;maxDef.minCase={referencePosition_m:ref,x_m:n.x_m};}});
  }catch(e){failed.push({referencePosition_m:ref,reason:String(e.message||e)});}
 });
 if(!cases)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["هیچ موقعیت بارگذاری معتبری برای حل به دست نیامد.",...failed.slice(0,5).map(x=>x.reason)]}};
 return {success:true,method:"sampled moving wheel-train envelope using repeated continuous-beam FEM solves",length_m:L,step_m:step,positionCount:sorted.length,solvedCases:cases,skippedCases:sorted.length-cases-failed.length,failedCases:failed.slice(0,20),wheels:wheels.map(w=>({offset_m:Number(w.offset_m),P_N:Number(w.P_N),source:w.source,document:w.document})),supportReactionEnvelope:supportEnvelope,maxNodalDisplacement_m:maxDef,analysisEnabled:false,limitations:["This is a spatially sampled envelope, not a mathematically exact continuous moving-load envelope; extrema may lie between sampled positions.","Linear Euler-Bernoulli model with documented independent vertical support springs only.","No impact/dynamic amplification, fatigue, lateral force, torsion, wheel/rail contact nonlinearity, rail-joint release or multiple cranes.","Only one rail is analyzed; concurrent two-rail transfer to runway girders is not implemented.","No design approval or code compliance is implied."]};
}
function selfTest(){
 const tests=[],test=(name,fn)=>{try{const detail=fn();tests.push({name,ok:detail!==false,detail:detail===true?"passed":detail});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const base={length_m:10,E_MPa:200000,Ix_mm4:1e8,meshPositions_m:[0,5,10],supports:[{x_m:0,kVertical_N_m:1e12},{x_m:10,kVertical_N_m:1e12}],pointLoads:[{x_m:5,P_N:-1000}]};
 test("simply-supported-midpoint-load-reaction-equilibrium",()=>{const r=analyze(base);return Math.abs(r.supports[0].verticalReaction_N-500)<1e-3&&Math.abs(r.supports[1].verticalReaction_N-500)<1e-3&&r.equilibrium.ok;});
 test("midpoint-deflection-approaches-closed-form",()=>{const r=analyze(base),expected=-1000*Math.pow(10,3)/(48*(200000*1e8/1e6));return Math.abs(r.nodes[1].verticalDisplacement_m-expected)<1e-8;});
 test("hermite-point-load-between-nodes",()=>{const r=analyze({...base,meshPositions_m:[0,10],pointLoads:[{x_m:3.7,P_N:-1000}]});const a=r.loads[0];return a.element===1&&a.localCoordinate>0&&a.localCoordinate<1&&Math.abs(a.equivalentNodalLoads[0]+a.equivalentNodalLoads[2]+1000)<1e-8;});
 test("reject-missing-support-stiffness",()=>{try{analyze({...base,supports:[{x_m:0,kVertical_N_m:0},{x_m:10,kVertical_N_m:1e12}]});return false;}catch(e){return String(e.message).includes("مثبت");}});
 test("reject-singular-unrestrained-beam",()=>{try{analyze({...base,supports:[{x_m:0,kVertical_N_m:1e12},{x_m:0,kVertical_N_m:1e12}]});return false;}catch(e){return true;}});
 test("readiness-rejects-undocumented-spring-stiffness",()=>{const a=auditReadiness({length_m:10,E_MPa:200000,Ix_mm4:1e8,propertySource:"rail catalog",continuity:"continuous",supportStations_m:[0,10],verticalSpringStiffness_N_m:[1e9,1e9],supportStiffnessSource:"",pointLoads:[{x_m:5,P_N:-1000,source:"crane drawing",document:"sheet 2"}]});return !a.ready&&a.issues.some(x=>x.includes("مرجع سختی"))&&a.analysisEnabled===false;});
 test("readiness-gated-rail-analysis-remains-unapproved",()=>{const r=analyzeIfReady({length_m:10,E_MPa:200000,Ix_mm4:1e8,propertySource:"rail catalog p.2",continuity:"continuous",supportStations_m:[0,10],verticalSpringStiffness_N_m:[1e12,1e12],supportStiffnessSource:"verified connector test",pointLoads:[{x_m:5,P_N:-1000,source:"crane drawing",document:"sheet 2"}]});return r.success&&r.equilibrium.ok&&r.analysisEnabled===false;});

 test("continuous two-span rail with unequal support springs and multiple wheel loads",()=>{const r=analyze({length_m:12,E_MPa:200000,Ix_mm4:1.5e8,meshPositions_m:[0,6,12],supports:[{x_m:0,kVertical_N_m:8e8},{x_m:6,kVertical_N_m:1.1e9},{x_m:12,kVertical_N_m:7e8}],pointLoads:[{x_m:3,P_N:-12000},{x_m:9,P_N:-8000}]});return r.success&&r.supports.length===3&&r.loads.length===2&&r.equilibrium.ok;});

 test("moving wheel train sampled envelope keeps concurrent support reactions",()=>{const r=movingLoadEnvelope({length_m:12,E_MPa:200000,Ix_mm4:1.5e8,propertySource:"catalog p.3",continuity:"continuous",supportStations_m:[0,6,12],verticalSpringStiffness_N_m:[1e12,1e12,1e12],supportStiffnessSource:"support test p.2",step_m:0.5,wheels:[{offset_m:0,P_N:-10000,source:"crane drawing",document:"p.4"},{offset_m:2,P_N:-8000,source:"crane drawing",document:"p.4"}]});return r.success&&r.solvedCases>0&&r.supportReactionEnvelope.length===3&&r.supportReactionEnvelope.every(x=>x.maxCase&&x.maxCase.concurrentReactions.length===3)&&r.analysisEnabled===false;});
 test("moving wheel train rejects undocumented wheel",()=>{const r=movingLoadEnvelope({length_m:10,E_MPa:200000,Ix_mm4:1e8,propertySource:"catalog",continuity:"continuous",supportStations_m:[0,10],verticalSpringStiffness_N_m:[1e12,1e12],supportStiffnessSource:"test",step_m:1,wheels:[{offset_m:0,P_N:-1000,source:"",document:""}]});return !r.success&&r.audit.issues.some(x=>x.includes("منبع")||x.includes("مرجع"));});
 test("moving wheel train rejects excessive sampling",()=>{const r=movingLoadEnvelope({length_m:100,E_MPa:200000,Ix_mm4:1e8,propertySource:"catalog",continuity:"continuous",supportStations_m:[0,100],verticalSpringStiffness_N_m:[1e12,1e12],supportStiffnessSource:"test",step_m:0.01,wheels:[{offset_m:0,P_N:-1000,source:"catalog",document:"p.1"}]});return !r.success&&r.audit.issues.some(x=>x.includes("۱۲۰۰"));});
 return {schemaVersion:1,passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok).length,total:tests.length,tests,note:"Deterministic mathematical/software checks only; not independent engineering validation or code compliance."};
}
root.SteelRailBeamFEM={analyze,auditReadiness,analyzeIfReady,movingLoadEnvelope,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-two-rail-transfer.js ===== */
/* SAHROUD STEEL — synchronized two-rail crane load transfer.
 * Linear static vertical-only coupling. Software tests are not engineering validation.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const defaults={railGauge_m:"",wheelTrackGauge_m:"",geometrySource:"",length_m:"",E_MPa:"",Ix_mm4:"",propertySource:"",supportStationsCsv:"",girderNodeStationsCsv:"",leftSpringCsv:"",rightSpringCsv:"",supportStiffnessSource:"",continuity:"",step_m:"0.25",wheelsPerSide:"",leftWheelsJson:"[]",rightWheelsJson:"[]",wheelTrackSource:""};
let state={...defaults},lastResult=null;
function parseCsv(v){return String(v??"").split(/[,،;；\s]+/).filter(Boolean).map(Number);}
function audit(p){
 p=p||{};const issues=[];
 const positive=(v,n)=>Number.isFinite(Number(v))&&Number(v)>0;
 if(!positive(p.length_m))issues.push("طول مسیر ریل باید مثبت باشد.");
 if(!positive(p.E_MPa)||!positive(p.Ix_mm4))issues.push("E و Ix معتبر و مثبت لازم‌اند.");
 if(!String(p.propertySource||"").trim())issues.push("مرجع خواص مقطع ریل لازم است.");
 if(p.continuity!=="continuous")issues.push("فعلاً فقط پیوستگی خمشی کامل ریل پشتیبانی می‌شود.");
 if(!positive(p.railGauge_m))issues.push("فاصله محور تا محور دو ریل باید از نقشه وارد شود.");
 if(!positive(p.wheelTrackGauge_m))issues.push("فاصله محور تا محور مسیر چرخ‌های جرثقیل باید مستند وارد شود.");
 if(!String(p.geometrySource||"").trim())issues.push("مرجع نقشه هندسه دو ریل لازم است.");
 if(!String(p.wheelTrackSource||"").trim())issues.push("مرجع نقشه مسیر چرخ‌ها لازم است.");
 const stations=Array.isArray(p.supportStations_m)?p.supportStations_m:[],girders=Array.isArray(p.girderNodeStations_m)?p.girderNodeStations_m:[];
 if(stations.length<2)issues.push("حداقل دو ایستگاه تکیه‌گاهی طولی لازم است.");
 if(stations.some((x,i)=>!Number.isFinite(Number(x))||Number(x)<0||Number(x)>Number(p.length_m)||(i&&Number(x)<=Number(stations[i-1]))))issues.push("ایستگاه‌های ریل باید صعودی، متمایز و داخل طول مسیر باشند.");
 if(girders.length!==stations.length||girders.some((x,i)=>!Number.isFinite(Number(x))||Math.abs(Number(x)-Number(stations[i]))>1e-7))issues.push("مختصات گره‌های انتقال به تیر حمال باید با تمام ایستگاه‌های تکیه‌گاه ریل منطبق باشد.");
 for(const side of ["left","right"]){
  const springs=Array.isArray(p[side+"SpringStiffness_N_m"])?p[side+"SpringStiffness_N_m"]:[];
  if(springs.length!==stations.length||springs.some(x=>!positive(x)))issues.push("سختی قائم مثبت و مستقل برای تمام تکیه‌گاه‌های ریل "+(side==="left"?"چپ":"راست")+" لازم است.");
 }
 if(!String(p.supportStiffnessSource||"").trim())issues.push("مرجع سختی قائم تکیه‌گاه‌های ریل لازم است.");
 const count=Number(p.wheelsPerSide),left=Array.isArray(p.leftWheels)?p.leftWheels:[],right=Array.isArray(p.rightWheels)?p.rightWheels:[];
 if(!(Number.isInteger(count)&&count>0))issues.push("تعداد چرخ در هر سمت باید از اطلاعات جرثقیل مشخص شود.");
 if(left.length!==count||right.length!==count)issues.push("تعداد چرخ‌های ثبت‌شده در هر ریل باید با تعداد چرخ هر سمت جرثقیل برابر باشد.");
 for(const [side,ws] of [["چپ",left],["راست",right]])ws.forEach((w,i)=>{
  if(!Number.isFinite(Number(w.offset_m))||Number(w.offset_m)<0||!Number.isFinite(Number(w.P_N))||Number(w.P_N)>=0)issues.push("آفست و بار قائم فشاری چرخ "+(i+1)+" ریل "+side+" نامعتبر است؛ P_N باید منفی و بر حسب N باشد.");
  if(i&&Number(w.offset_m)<Number(ws[i-1].offset_m))issues.push("آفست چرخ‌های ریل "+side+" باید صعودی باشد.");
  if(!String(w.source||"").trim()||!String(w.document||"").trim())issues.push("منبع و شماره مرجع هر چرخ ریل "+side+" الزامی است.");
 });
 if(!(Number.isFinite(Number(p.step_m))&&Number(p.step_m)>0))issues.push("گام جاروب باید مثبت باشد.");
 return {ready:issues.length===0,analysisEnabled:false,issues,geometry:{railGauge_m:Number(p.railGauge_m),wheelTrackGauge_m:Number(p.wheelTrackGauge_m),gaugeDifference_m:Number(p.wheelTrackGauge_m)-Number(p.railGauge_m),gaugeDifferenceInterpretation:"اطلاعات مقایسه‌ای صرف؛ بدون تلرانس یا حکم سازگاری مهندسی."}};
}
function analyze(p){
 const a=audit(p);if(!a.ready)return {success:false,analysisEnabled:false,audit:a};
 const fem=root.SteelRailBeamFEM;if(!fem?.analyze)return {success:false,analysisEnabled:false,audit:{...a,ready:false,issues:["حل‌گر تیر ریل بارگذاری نشده است."]}};
 const L=Number(p.length_m),step=Number(p.step_m),wheels=[...p.leftWheels,...p.rightWheels],maxOffset=Math.max(...wheels.map(w=>Number(w.offset_m)));
 const raw=Math.ceil((L+maxOffset)/step)+1;if(raw>1200)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["تعداد موقعیت‌های جاروب بیش از ۱۲۰۰ است؛ گام بزرگ‌تری انتخاب کنید."]}};
 const positions=new Set();for(let x=-maxOffset;x<=L+1e-8;x+=step)positions.add(Number(x.toFixed(9)));
 for(const s of p.supportStations_m)for(const w of wheels)positions.add(Number((Number(s)-Number(w.offset_m)).toFixed(9)));
 for(const w of wheels){positions.add(-Number(w.offset_m));positions.add(L-Number(w.offset_m));}
 const refs=[...positions].filter(x=>x>=-maxOffset-1e-8&&x<=L+1e-8).sort((x,y)=>x-y);
 if(refs.length>1500)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["تعداد موقعیت‌های ویژه بیش از ۱۵۰۰ است."]}};
 const env={left:p.supportStations_m.map((x,i)=>({station:i+1,x_m:Number(x),minReaction_N:Infinity,maxReaction_N:-Infinity,minCase:null,maxCase:null})),right:p.supportStations_m.map((x,i)=>({station:i+1,x_m:Number(x),minReaction_N:Infinity,maxReaction_N:-Infinity,minCase:null,maxCase:null}))};
 const cases=[],failed=[];let solved=0;
 for(const ref of refs){
  const sideResults={};
  for(const side of ["left","right"]){
   const active=p[side+"Wheels"].map(w=>({...w,x_m:ref+Number(w.offset_m)})).filter(w=>w.x_m>=-1e-8&&w.x_m<=L+1e-8);
   if(!active.length){sideResults[side]=p.supportStations_m.map((x,i)=>({station:i+1,x_m:Number(x),verticalReaction_N:0}));continue;}
   try{
    const r=fem.analyze({length_m:L,E_MPa:Number(p.E_MPa),Ix_mm4:Number(p.Ix_mm4),supports:p.supportStations_m.map((x,i)=>({x_m:Number(x),kVertical_N_m:Number(p[side+"SpringStiffness_N_m"][i])})),pointLoads:active.map(w=>({x_m:Math.max(0,Math.min(L,w.x_m)),P_N:Number(w.P_N)}))});
    if(!r.equilibrium.ok)throw Error("تعادل قائم/لنگر ریل "+side+" برقرار نیست.");
    sideResults[side]=r.supports.map(s=>({station:s.station,x_m:s.x_m,verticalReaction_N:s.verticalReaction_N}));
   }catch(e){sideResults[side]=null;failed.push({referencePosition_m:ref,side,reason:String(e.message||e)});}
  }
  if(!sideResults.left||!sideResults.right)continue;
  solved++;
  const concurrent={referencePosition_m:ref,left:sideResults.left,right:sideResults.right};
  for(const side of ["left","right"])sideResults[side].forEach((r,i)=>{
   const e=env[side][i];if(r.verticalReaction_N>e.maxReaction_N){e.maxReaction_N=r.verticalReaction_N;e.maxCase=concurrent;}
   if(r.verticalReaction_N<e.minReaction_N){e.minReaction_N=r.verticalReaction_N;e.minCase=concurrent;}
  });
  const transfer={left:sideResults.left.map(r=>({x_m:r.x_m,P_N:-r.verticalReaction_N,source:"rail-support-reaction",casePosition_m:ref,station:r.station})),right:sideResults.right.map(r=>({x_m:r.x_m,P_N:-r.verticalReaction_N,source:"rail-support-reaction",casePosition_m:ref,station:r.station}))};
  const sourceDocuments={
   geometrySource:String(p.geometrySource||""),
   wheelTrackSource:String(p.wheelTrackSource||""),
   supportStiffnessSource:String(p.supportStiffnessSource||""),
   wheelSources:[...p.leftWheels.map(w=>({side:"left",offset_m:Number(w.offset_m),source:String(w.source||""),document:String(w.document||"")})),...p.rightWheels.map(w=>({side:"right",offset_m:Number(w.offset_m),source:String(w.source||""),document:String(w.document||"")}))]
  };
  cases.push({referencePosition_m:ref,concurrentSupportReactions:sideResults,girderPointLoads:transfer,sourceDocuments});
 }
 if(!solved)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["هیچ حالت هم‌زمان قابل حل نبود.",...failed.slice(0,5).map(x=>x.reason)]}};
 return {success:true,method:"synchronized two-rail vertical moving-load analysis using two independent continuous Euler-Bernoulli rail FEM models",geometry:a.geometry,positionCount:refs.length,solvedCases:solved,failedCases:failed.slice(0,30),supportReactionEnvelope:env,criticalCases:cases.filter((c,i)=>Object.values(env).some(list=>list.some(e=>e.maxCase===c||e.minCase===c))),cases,girderTransfer:{ready:true,meaning:"واکنش هر تکیه‌گاه ریل به بار متمرکز قائم روی تیر حمال همان سمت و همان مختصات طولی تبدیل شده است.",left:cases.map(c=>({referencePosition_m:c.referencePosition_m,loads:c.girderPointLoads.left})),right:cases.map(c=>({referencePosition_m:c.referencePosition_m,loads:c.girderPointLoads.right})),requiresNextStage:"تحلیل تیر حمال با خواص مقطع، تکیه‌گاه‌ها، محل براکت‌ها و اتصال مستند؛ این ماژول تیر حمال را حل نمی‌کند."},analysisEnabled:false,limitations:["دو ریل با جاروب در موقعیت طولی هم‌زمان تحلیل می‌شوند، اما مدل‌های خمشی هر ریل مستقل‌اند و سختی عرضی پل جرثقیل/تعامل دو ریل حل نمی‌شود.","فقط بار قائم استاتیکی و فنرهای قائم مستقل؛ نیروهای افقی، پیچش، ضربه، دینامیک، خستگی، تماس یک‌طرفه و چند جرثقیل لحاظ نشده‌اند.","فاصله ریل و مسیر چرخ صرفاً از داده مستند ثبت/مقایسه می‌شوند؛ اختلاف آن‌ها بدون تلرانس مصوب به‌عنوان قبولی/رد هندسی تفسیر نمی‌شود.","بارهای منتقل‌شده ورودی مرحله بعد تیر حمال هستند، نه تحلیل یا طراحی تیر حمال؛ هیچ بار به مدل سه‌بعدی قاب تزریق نشده است.","خروجی تحلیل مقدماتی است؛ analysisEnabled=false و تأیید آیین‌نامه‌ای/اجرایی نیست."]};
}
function readUI(){const d={};Object.keys(defaults).forEach(k=>{const el=$("twoRail_"+k);if(el)d[k]=el.value;});for(const k of ["railGauge_m","wheelTrackGauge_m","length_m","E_MPa","Ix_mm4","step_m","wheelsPerSide"])if(d[k]!=="")d[k]=Number(d[k]);const crane=root.SteelCraneReadiness?.getData?.()||{};d.wheelsPerSide=crane.enabled?Number(crane.wheelsPerSide):null;d.supportStations_m=parseCsv(d.supportStationsCsv);d.girderNodeStations_m=parseCsv(d.girderNodeStationsCsv);d.leftSpringStiffness_N_m=parseCsv(d.leftSpringCsv);d.rightSpringStiffness_N_m=parseCsv(d.rightSpringCsv);try{d.leftWheels=JSON.parse(d.leftWheelsJson||"[]");}catch(e){throw Error("JSON چرخ‌های ریل چپ نامعتبر است.");}try{d.rightWheels=JSON.parse(d.rightWheelsJson||"[]");}catch(e){throw Error("JSON چرخ‌های ریل راست نامعتبر است.");}return d;}
function setData(d){state={...defaults,...(d||{})};Object.keys(defaults).forEach(k=>{const el=$("twoRail_"+k);if(el)el.value=state[k]??"";});}
function getData(){try{return readUI();}catch(e){return {...state};}}
function ensurePanel(){if($("twoRailPanel"))return;const main=document.querySelector("main");if(!main)return;const panel=document.createElement("section");panel.className="panel";panel.id="twoRailPanel";panel.innerHTML='<div class="panel-title"><h3>مدل هم‌زمان دو ریل و انتقال واکنش به تیرهای حمال</h3><span class="status">تحلیل قائم مقدماتی</span></div><div class="notice">ورودی‌ها باید از نقشه و کاتالوگ مستند شوند. فاصله محور دو ریل و فاصله مسیر چرخ جداگانه ثبت می‌شوند. تعداد چرخ هر سمت به‌صورت خودکار از پنل اطلاعات جرثقیل خوانده می‌شود؛ ابتدا جرثقیل را فعال و تعداد چرخ‌ها را آنجا تکمیل کنید. این بخش تیر حمال را هنوز تحلیل نمی‌کند.</div><div class="form-grid">'+[
["railGauge_m","فاصله محور تا محور دو ریل (m)"],["wheelTrackGauge_m","فاصله مسیر چرخ‌های جرثقیل (m)"],["geometrySource","مرجع نقشه هندسه دو ریل"],["length_m","طول مسیر ریل (m)"],["E_MPa","مدول الاستیسیته (MPa)"],["Ix_mm4","Ix هر ریل (mm⁴)"],["propertySource","مرجع خواص مقطع ریل"],["supportStationsCsv","ایستگاه‌های تکیه‌گاه ریل (m، CSV)"],["girderNodeStationsCsv","مختصات گره‌های تیر حمال (m، CSV)"],["leftSpringCsv","سختی فنر قائم ریل چپ (N/m، CSV)"],["rightSpringCsv","سختی فنر قائم ریل راست (N/m، CSV)"],["supportStiffnessSource","مرجع سختی تکیه‌گاه‌ها"],["wheelTrackSource","مرجع نقشه مسیر چرخ‌ها"],["continuity","پیوستگی خمشی ریل"],["step_m","گام جاروب (m)"]
].map(([id,label])=>id==="continuity"?'<div class="field"><label for="twoRail_continuity">'+label+'</label><select id="twoRail_continuity"><option value="">نوع پیوستگی را از نقشه تعیین کنید</option><option value="continuous">پیوستگی خمشی کامل مستند</option><option value="unknown">نامشخص / نیازمند بررسی</option></select></div>':'<div class="field"><label for="twoRail_'+id+'">'+label+'</label><input id="twoRail_'+id+'" type="text"></div>').join("")+'</div><div class="field"><label for="twoRail_leftWheelsJson">قطار چرخ ریل چپ (JSON: offset_m, P_N منفی و استاتیکی (بدون ضریب دینامیکی), source, document)</label><textarea id="twoRail_leftWheelsJson" rows="4">[]</textarea></div><div class="field"><label for="twoRail_rightWheelsJson">قطار چرخ ریل راست (JSON: offset_m, P_N منفی, source, document)</label><textarea id="twoRail_rightWheelsJson" rows="4">[]</textarea></div><div class="button-grid"><button id="twoRail_audit" class="btn secondary" type="button">ممیزی هندسه و ورودی‌ها</button><button id="twoRail_run" class="btn primary" type="button">اجرای جاروب هم‌زمان دو ریل</button></div><pre id="twoRail_result" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
panel.querySelectorAll("input,textarea").forEach(el=>el.addEventListener("input",()=>{try{state=readUI();root.dispatchEvent(new CustomEvent("sahroud-two-rail-change"));}catch(e){}}));
$("twoRail_audit").addEventListener("click",()=>{const box=$("twoRail_result");try{const r=audit(readUI());box.textContent=JSON.stringify(r,null,2);}catch(e){box.textContent=e.message;}});
$("twoRail_run").addEventListener("click",()=>{const box=$("twoRail_result");try{const r=analyze(readUI());lastResult=r;box.textContent=JSON.stringify(r,null,2);}catch(e){box.textContent=e.message;}});
setData(state);
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const base={length_m:10,E_MPa:200000,Ix_mm4:1e8,propertySource:"catalog p.1",continuity:"continuous",railGauge_m:3,wheelTrackGauge_m:3,geometrySource:"GA-1",supportStations_m:[0,5,10],girderNodeStations_m:[0,5,10],leftSpringStiffness_N_m:[1e12,1e12,1e12],rightSpringStiffness_N_m:[1e12,1e12,1e12],supportStiffnessSource:"test report p.2",wheelsPerSide:1,step_m:1,wheelTrackSource:"crane drawing p.3",leftWheels:[{offset_m:0,P_N:-1000,source:"catalog",document:"p.4"}],rightWheels:[{offset_m:0,P_N:-1200,source:"catalog",document:"p.4"}]};
 t("two-rail synchronized cases preserve paired reactions",()=>{const r=analyze(base);return r.success&&r.cases.every(c=>c.concurrentSupportReactions.left.length===3&&c.concurrentSupportReactions.right.length===3);});
 t("two-rail transfer creates downward girder loads at matching stations",()=>{const r=analyze(base);return r.success&&r.cases.some(c=>c.girderPointLoads.left.some(x=>x.P_N<0)&&c.girderPointLoads.right.some(x=>x.P_N<0));});
 t("two-rail mismatch in girder transfer stations is blocked",()=>!audit({...base,girderNodeStations_m:[0,4,10]}).ready);
 t("two-rail geometry without drawing reference is blocked",()=>!audit({...base,geometrySource:""}).ready);
 t("wheel count must match crane data",()=>!audit({...base,wheelsPerSide:2}).ready);
 t("wheel source and document required on each rail",()=>!audit({...base,rightWheels:[{offset_m:0,P_N:-1200,source:"",document:""}]}).ready);
 t("positive wheel load sign is rejected",()=>!audit({...base,leftWheels:[{offset_m:0,P_N:1000,source:"catalog",document:"p.4"}]}).ready);
 t("rail and wheel track gauges remain separate measured inputs",()=>{const r=audit({...base,wheelTrackGauge_m:3.2});return r.ready&&Math.abs(r.geometry.gaugeDifference_m-0.2)<1e-9;});
 t("each rail uses its own support stiffness",()=>{const r=analyze({...base,rightSpringStiffness_N_m:[1e9,1e9,1e9]});return r.success&&r.cases.length>0;});
 t("sampled case count is bounded",()=>!analyze({...base,step_m:0.0001}).success);
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,note:"Software regression only; no independent engineering validation."};
}
root.SteelCraneTwoRailTransfer={audit,analyze,readUI,getData,setData,selfTest,getLastResult:()=>lastResult};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-wheel-evidence-intake.js ===== */
/* SAHROUD STEEL — evidence intake for individual crane runway wheel loads.
 * Keeps legacy workbook cases separate; no legacy scalar is converted into a wheel load.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const CASES=[
 {id:"CRANE-TYPE1-LEFT-LEGACY",label:"پرونده قدیمی TYPE 1 ـ بخش چپ"},
 {id:"CRANE-TYPE1-RIGHT-LEGACY",label:"پرونده قدیمی TYPE 1 ـ تحلیل سمت راست"},
 {id:"CRANE-TYPE1-OTHER-WORKBOOK-SUMMARY",label:"خلاصه وزن پل ـ تخصیص نامشخص"}
];
let last=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function read(){
 return {
  sourceCaseId:$("cwei_case")?.value||"",
  craneId:$("cwei_crane")?.value.trim()||"",
  bridgeId:$("cwei_bridge")?.value.trim()||"",
  mappingStatement:$("cwei_mapping")?.value.trim()||"",
  manufacturer:$("cwei_manufacturer")?.value.trim()||"",
  sourceDocument:$("cwei_document")?.value.trim()||"",
  sourceRevision:$("cwei_revision")?.value.trim()||"",
  sourceLocator:$("cwei_locator")?.value.trim()||"",
  loadBasis:$("cwei_basis")?.value||"",
  engineerVerified:!!$("cwei_verified")?.checked,
  leftWheelsText:$("cwei_left")?.value||"[]",
  rightWheelsText:$("cwei_right")?.value||"[]"
 };
}
function parseList(text,label,issues){
 let rows;try{rows=JSON.parse(text||"[]");}catch(e){issues.push("JSON قطار چرخ "+label+" معتبر نیست.");return [];}
 if(!Array.isArray(rows)){issues.push("قطار چرخ "+label+" باید آرایه JSON باشد.");return [];}
 rows.forEach((w,i)=>{
  if(!w||typeof w!=="object"||Array.isArray(w)){issues.push("ردیف "+(i+1)+" قطار "+label+" باید شیء باشد.");return;}
  if(!Number.isFinite(w.offset_m)||w.offset_m<0)issues.push("آفست چرخ "+(i+1)+" ریل "+label+" باید عدد متناهی نامنفی بر حسب متر باشد.");
  if(!Number.isFinite(w.P_N)||w.P_N>=0)issues.push("بار قائم چرخ "+(i+1)+" ریل "+label+" باید منفی و بر حسب N باشد؛ بار مثبت یا مقدار نامعلوم پذیرفته نیست.");
  if(i&&Number.isFinite(w.offset_m)&&Number.isFinite(rows[i-1]?.offset_m)&&w.offset_m<rows[i-1].offset_m)issues.push("آفست‌های قطار "+label+" باید صعودی باشند.");
  if(typeof w.source!=="string"||!w.source.trim()||typeof w.document!=="string"||!w.document.trim())issues.push("برای هر چرخ "+(i+1)+" ریل "+label+" منبع و صفحه/شماره نقشه مستقل لازم است.");
 });
 return rows;
}
function audit(input){
 const d=input||read(),issues=[];
 if(!CASES.some(x=>x.id===d.sourceCaseId))issues.push("پرونده مرجع باید از فهرست پرونده‌های قدیمی مشخص شود.");
 ["craneId","bridgeId","mappingStatement","manufacturer","sourceDocument","sourceRevision","sourceLocator"].forEach(k=>{if(!String(d[k]||"").trim())issues.push("مشخصات تطبیق و منبع ناقص است: "+k);});
 if(d.loadBasis!=="static_without_impact")issues.push("فقط بار قائم استاتیکی هر چرخ، بدون ضریب ضربه، قابل ورود به این مرحله است.");
 if(d.engineerVerified!==true)issues.push("مهندس مسئول باید تطبیق پرونده، پل، خطوط ریل و جدول بار چرخ را بررسی و صریحاً تأیید کند.");
 const left=parseList(d.leftWheelsText,"چپ",issues),right=parseList(d.rightWheelsText,"راست",issues);
 if(!left.length||!right.length)issues.push("جدول مستقل بار چرخ برای هر دو خط ریل الزامی است.");
 if(left.length!==right.length)issues.push("تعداد چرخ‌های دو خط ریل یکسان نیست؛ تا تعیین هندسه واقعی، انتقال دو ریل متوقف است.");
 const readiness=root.SteelCraneReadiness?.getData?.();
 if(!readiness?.enabled)issues.push("ابتدا جرثقیل را در پنل اطلاعات جرثقیل فعال کنید؛ این ابزار آن را خودکار فعال نمی‌کند.");
 if(readiness?.wheelsPerSide!==""&&Number(readiness?.wheelsPerSide)!==left.length)issues.push("تعداد چرخ هر سمت در پنل اطلاعات جرثقیل با جدول چرخ این پرونده یکسان نیست.");
 const success=issues.length===0;
 return {success,status:success?"verified-wheel-load-evidence":"blocked_incomplete_or_unverified",sourceCaseId:d.sourceCaseId,craneId:d.craneId,bridgeId:d.bridgeId,manufacturer:d.manufacturer,source:{document:d.sourceDocument,revision:d.sourceRevision,locator:d.sourceLocator},mappingStatement:d.mappingStatement,loadBasis:d.loadBasis,leftWheels:left,rightWheels:right,wheelsPerSide:left.length,engineerVerified:d.engineerVerified,issues,solverEnabled:false,analysisEnabled:false,designApproved:false,legacyScalarValuesUsed:false,limitations:["مقادیر قدیمی واکنش چرخ و جرم پل در پرونده مرجع صرفاً برای تطبیق هستند؛ هیچ‌یک به بار چرخ منفرد تبدیل یا بین چرخ‌ها توزیع نمی‌شوند.","پرونده‌های TYPE 1 چپ و راست و خلاصه جرم پل مستقل باقی می‌مانند؛ میانگین‌گیری یا انتخاب خودکار انجام نمی‌شود.","تأیید مهندس در این فرم یک اظهار مستند است و صحت نقشه/کاتالوگ را نرم‌افزار مستقلاً احراز نمی‌کند.","این ورودی فقط بار قائم استاتیکی بدون ضربه را آماده می‌کند؛ بارهای افقی، دینامیک، خستگی، چند جرثقیل و طراحی تیر حمال خارج از دامنه‌اند."]};
}
function render(result){
 const host=$("cwei_result");if(!host)return;
 host.innerHTML="<b>"+(result.success?"شواهد بار چرخ کامل است":"انتقال بار چرخ مسدود است")+"</b><br>"+esc(result.issues.join(" | ")||"جدول بار چرخ فقط پس از تأیید مستقل مهندس قابل انتقال به پنل دو ریل است.")+
 "<br><pre style='white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto'>"+esc(JSON.stringify({sourceCaseId:result.sourceCaseId,wheelsPerSide:result.wheelsPerSide,leftWheels:result.leftWheels,rightWheels:result.rightWheels,solverEnabled:false,designApproved:false},null,2))+"</pre>";
}
function collect(){last=audit(read());render(last);return last;}
function apply(){
 const r=collect();if(!r.success)return r;
 const two=root.SteelCraneTwoRailTransfer;
 if(!two?.getData||!two?.setData){r.success=false;r.issues.push("پنل انتقال دو ریل بارگذاری نشده است.");render(r);return r;}
 const readiness=root.SteelCraneReadiness?.getData?.();
 if(!readiness||!readiness.enabled||Number(readiness.wheelsPerSide)!==r.wheelsPerSide){r.success=false;r.issues.push("ابتدا جرثقیل را فعال و تعداد چرخ هر سمت را دقیقاً با این جدول منطبق کنید؛ هیچ داده‌ای منتقل نشد.");render(r);return r;}
 const current=two.getData();
 two.setData({...current,leftWheelsJson:JSON.stringify(r.leftWheels),rightWheelsJson:JSON.stringify(r.rightWheels)});
 const host=$("cwei_result");
 if(host)host.insertAdjacentHTML("beforeend","<p>جدول چرخ به ورودی‌های دو ریل منتقل شد؛ تحلیل اجرا نشده است. اکنون ورودی‌های هندسه/سختی ریل را بازبینی و سپس جداگانه ممیزی و اجرا کنید.</p>");
 return r;
}
function exportJSON(){
 const r=collect();const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="SAHROUD-STEEL-crane-wheel-load-evidence.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return r;
}
function init(){
 if($("craneWheelEvidenceIntakePanel"))return;
 const anchor=$("twoRailPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="craneWheelEvidenceIntakePanel";
 p.innerHTML='<div class="panel-title"><h3>تطبیق پرونده جرثقیل و ثبت بار تک‌تک چرخ‌ها</h3><span class="status">دروازه شواهد؛ بدون محاسبه خودکار</span></div>'+
 '<div class="notice">مقادیر قدیمی ۸٫۶۳، ۷٫۸، ۱۰٫۷۸، ۹٫۸ و واکنش‌های ۲۸٫۷۹ و ۲۱٫۴۹ تن، بار چرخ منفرد قابل استفاده نیستند. این فرم هیچ‌کدام را به بار چرخ تبدیل نمی‌کند. فقط جدول بار هر چرخ از نقشه/کاتالوگ واقعی و با تطبیق دقیق جرثقیل و پل پذیرفته می‌شود. پرونده‌های قدیمی مستقل‌اند.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label for="cwei_case">پرونده قدیمی برای ردیابی</label><select id="cwei_case">'+CASES.map(x=>'<option value="'+x.id+'">'+x.label+'</option>').join("")+'</select></div>'+
 '<div class="field"><label for="cwei_crane">شناسه دقیق جرثقیل</label><input id="cwei_crane"></div>'+
 '<div class="field"><label for="cwei_bridge">شناسه پل / شاهین</label><input id="cwei_bridge"></div>'+
 '<div class="field"><label for="cwei_manufacturer">سازنده / مرجع</label><input id="cwei_manufacturer"></div>'+
 '<div class="field"><label for="cwei_document">نام سند بار چرخ</label><input id="cwei_document"></div>'+
 '<div class="field"><label for="cwei_revision">ویرایش / تاریخ سند</label><input id="cwei_revision"></div>'+
 '<div class="field"><label for="cwei_locator">صفحه / شیت / جدول دقیق</label><input id="cwei_locator"></div>'+
 '<div class="field"><label for="cwei_basis">مبنای بار</label><select id="cwei_basis"><option value="">انتخاب کنید</option><option value="static_without_impact">بار قائم استاتیکی، بدون ضریب ضربه</option></select></div>'+
 '</div><div class="field"><label for="cwei_mapping">شرح تطبیق نقشه: این جدول دقیقاً متعلق به کدام پل و کدام خطوط ریل است؟</label><textarea id="cwei_mapping" rows="2"></textarea></div>'+
 '<div class="field"><label for="cwei_left">بارهای چرخ ریل چپ (JSON؛ offset_m، P_N منفی، source، document)</label><textarea id="cwei_left" rows="5"></textarea></div>'+
 '<div class="field"><label for="cwei_right">بارهای چرخ ریل راست (JSON؛ هر چرخ مستقل)</label><textarea id="cwei_right" rows="5"></textarea></div>'+
 '<label class="field"><input type="checkbox" id="cwei_verified"> تطبیق پرونده، هویت پل، خطوط ریل، تعداد و بار تک‌تک چرخ‌ها را با مدارک سازنده بررسی کرده‌ام.</label>'+
 '<div class="button-grid"><button class="btn secondary" type="button" id="cwei_audit">ممیزی شواهد بار چرخ</button><button class="btn primary" type="button" id="cwei_apply">انتقال جدول معتبر به پنل دو ریل</button><button class="btn secondary" type="button" id="cwei_export">دریافت JSON شواهد</button></div><div id="cwei_result" class="notice">اطلاعات بار چرخ هنوز وارد نشده است.</div>';
 anchor.insertAdjacentElement("beforebegin",p);
 $("cwei_audit").addEventListener("click",collect);$("cwei_apply").addEventListener("click",apply);$("cwei_export").addEventListener("click",exportJSON);
}
function selfTest(){
 const src={sourceCaseId:CASES[0].id,craneId:"CR-01",bridgeId:"BR-01",mappingStatement:"Vendor schedule maps bridge BR-01 to both runway rails.",manufacturer:"Vendor",sourceDocument:"DWG-01",sourceRevision:"R1",sourceLocator:"Table 2",loadBasis:"static_without_impact",engineerVerified:true,leftWheelsText:JSON.stringify([{offset_m:0,P_N:-10000,source:"Vendor",document:"DWG-01/T2"}]),rightWheelsText:JSON.stringify([{offset_m:0,P_N:-11000,source:"Vendor",document:"DWG-01/T3"}])};
 const old=root.SteelCraneReadiness;root.SteelCraneReadiness={getData:()=>({enabled:true,wheelsPerSide:"1"})};
 const good=audit(src),noImpact=audit({...src,loadBasis:"with_impact"}),noVerify=audit({...src,engineerVerified:false}),badSign=audit({...src,leftWheelsText:JSON.stringify([{offset_m:0,P_N:10000,source:"Vendor",document:"DWG-01"}])}),caseIsolation=audit({...src,sourceCaseId:"UNKNOWN"});
 root.SteelCraneReadiness=old;
 const tests=[good.success&&!good.legacyScalarValuesUsed&&!good.designApproved,!noImpact.success,!noVerify.success,!badSign.success,!caseIsolation.success];
 return {passed:tests.filter(Boolean).length,failed:tests.filter(x=>!x).length,total:tests.length,tests,analysisEnabled:false};
}
root.SteelCraneWheelEvidenceIntake={read,audit,collect,apply,exportJSON,selfTest,init,getLast:()=>last};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-bay-configuration.js ===== */
/* SAHROUD STEEL — explicit crane-to-bay allocation and per-crane data readiness.
 * Partial/multiple runway FEM remains blocked until independent systems and interaction are solved.
 */
(function(root){
"use strict";
const $=id=>root.document?.getElementById(id);
const profileFields=["ratedCapacity_t","bridgeMass_t","trolleyMass_t","wheelsPerSide","wheelSpacing_m","maxWheelLoad_t","minWheelLoad_t","verticalImpact","wheelLoadSource","wheelLoadDocument"];
function audit(raw,bayCount){
 const issues=[],warnings=[],count=Number(bayCount);
 if(!Number.isInteger(count)||count<1)return{valid:false,solverCompatible:false,status:"invalid_geometry",issues:["تعداد دهانه‌های سوله برای ممیزی جانمایی جرثقیل معتبر نیست."],cranes:[],bayCount:null};
 let cranes=[];
 if(raw==null||String(raw).trim()===""){
  cranes=[{id:"CR-LEGACY-1",runwaySystemId:"RUNWAY-LEGACY",bays:Array.from({length:count},(_,i)=>i+1),legacy:true}];
  warnings.push("جانمایی جرثقیل جداگانه تعریف نشده است؛ رفتار قدیمی یعنی یک جرثقیل با مسیر سراسری تمام دهانه‌ها فرض می‌شود.");
 }else{
  let parsed;try{parsed=typeof raw==="string"?JSON.parse(raw):raw;}catch(e){return{valid:false,solverCompatible:false,status:"invalid_json",issues:["JSON جانمایی جرثقیل قابل خواندن نیست: "+e.message],cranes:[],bayCount:count};}
  if(!Array.isArray(parsed)||!parsed.length)return{valid:false,solverCompatible:false,status:"invalid_schema",issues:["جانمایی باید آرایه‌ای غیرخالی از جرثقیل‌ها باشد."],cranes:[],bayCount:count};
  cranes=parsed.map((c,i)=>({...c,id:String(c?.id??"").trim(),runwaySystemId:String(c?.runwaySystemId??"").trim(),bays:Array.isArray(c?.bays)?c.bays.slice():[],source:c?.source||null}));
 }
 const ids=new Set(),occupancy=new Map();
 cranes.forEach((c,i)=>{
  if(!c.id)issues.push("شناسه جرثقیل شماره "+(i+1)+" خالی است.");
  else if(ids.has(c.id))issues.push("شناسه جرثقیل تکراری است: "+c.id);
  ids.add(c.id);
  if(!Array.isArray(c.bays)||!c.bays.length)issues.push("برای جرثقیل "+(c.id||i+1)+" هیچ دهانه‌ای انتخاب نشده است.");
  if(!c.legacy&&!c.runwaySystemId)warnings.push("شناسه سامانه ریل برای "+(c.id||"جرثقیل شماره "+(i+1))+" ثبت نشده؛ تعیین استقلال یا اشتراک مسیر ریل ممکن نیست.");
  const seen=new Set();
  c.bays.forEach(b=>{
   if(!Number.isInteger(b)||b<1||b>count){issues.push("شماره دهانه "+b+" برای جرثقیل "+(c.id||i+1)+" خارج از بازه ۱ تا "+count+" است.");return;}
   if(seen.has(b))issues.push("دهانه "+b+" در جانمایی جرثقیل "+c.id+" تکرار شده است.");
   seen.add(b);
   const prior=occupancy.get(b)||[];
   prior.forEach(p=>{
    if(!c.runwaySystemId||!p.runwaySystemId||c.runwaySystemId!==p.runwaySystemId)issues.push("دهانه "+b+" به دو سامانه ریل متفاوت ("+p.id+" و "+c.id+") تخصیص یافته؛ هندسه چند سامانه ریل در یک دهانه مدل نشده است.");
    else warnings.push("جرثقیل‌های "+p.id+" و "+c.id+" در دهانه "+b+" روی سامانه ریل مشترک تعریف شده‌اند؛ فاصله ایمن، برخورد و هم‌زمانی حرکت هنوز تحلیل نمی‌شود.");
   });
   occupancy.set(b,[...prior,{id:c.id,runwaySystemId:c.runwaySystemId}]);
  });
  c.bays=[...seen].sort((a,b)=>a-b);
  c.profileMissing=profileFields.filter(k=>c[k]===undefined||c[k]===null||String(c[k]).trim()==="");
  c.profileReady=c.profileMissing.length===0;
  if(!c.profileReady)warnings.push("اطلاعات اختصاصی جرثقیل "+(c.id||i+1)+" ناقص است؛ موارد ثبت‌نشده: "+c.profileMissing.join("، "));
  ["ratedCapacity_t","bridgeMass_t","trolleyMass_t","wheelsPerSide","wheelSpacing_m","maxWheelLoad_t","minWheelLoad_t","verticalImpact"].forEach(k=>{
   if(c[k]!==undefined&&c[k]!==null&&String(c[k]).trim()!==""&&(!Number.isFinite(Number(c[k]))||Number(c[k])<0))issues.push("پارامتر "+k+" برای جرثقیل "+c.id+" باید عددی و نامنفی باشد.");
  });
  ["ratedCapacity_t","wheelsPerSide","wheelSpacing_m","verticalImpact"].forEach(k=>{if(c[k]!==undefined&&c[k]!==null&&String(c[k]).trim()!==""&&Number(c[k])<=0)issues.push("پارامتر "+k+" برای جرثقیل "+c.id+" باید بزرگ‌تر از صفر باشد.");});
  if(c.wheelsPerSide!==undefined&&c.wheelsPerSide!==null&&String(c.wheelsPerSide).trim()!==""&&!Number.isInteger(Number(c.wheelsPerSide)))issues.push("تعداد چرخ هر سمت برای "+c.id+" باید عدد صحیح باشد.");
  if(Number.isFinite(Number(c.minWheelLoad_t))&&Number.isFinite(Number(c.maxWheelLoad_t))&&Number(c.maxWheelLoad_t)<Number(c.minWheelLoad_t))issues.push("بار بیشینه چرخ جرثقیل "+c.id+" از بار کمینه کمتر است.");
 });
 const valid=issues.length===0,all=Array.from({length:count},(_,i)=>i+1);
 const full=valid&&cranes.length===1&&cranes[0].bays.length===count&&cranes[0].bays.every((b,i)=>b===all[i]);
 const solverCompatible=valid&&full;
 if(valid&&!solverCompatible)warnings.push(cranes.length>1?"چند جرثقیل ثبت شده‌اند؛ حل‌گر فعلی فقط یک قطار چرخ و یک سامانه ریل سراسری را پشتیبانی می‌کند.":"جانمایی جرثقیل فقط بخشی از دهانه‌ها را پوشش می‌دهد؛ قطعه‌بندی مسیر ریل و محدودیت حرکت هنوز به FEM متصل نشده است.");
 const active=[...occupancy.keys()].sort((a,b)=>a-b);
 return{valid,solverCompatible,status:!valid?"invalid":solverCompatible?"single_crane_full_run":"configuration_recorded_solver_blocked",bayCount:count,cranes,activeBays:active,unassignedBays:all.filter(b=>!occupancy.has(b)),profileReady:cranes.every(c=>c.profileReady),profileMissingByCrane:cranes.filter(c=>!c.profileReady).map(c=>({id:c.id,missing:c.profileMissing})),sharedRunwayBays:active.filter(b=>(occupancy.get(b)||[]).length>1),warnings:[...new Set(warnings)],issues,analysisEnabled:false,designApproved:false};
}
function readAndAudit(bayCount){return audit($("craneBayConfigurationJson")?.value??"",bayCount);}
function render(){
 const out=$("craneBayConfigurationAudit");if(!out)return;
 const g=root.SteelStructuralModel?.model?.geometry,count=Number(g?.bayCount)||((Number(g?.length)>0&&Number(g?.spacing)>0)?Math.ceil(Number(g.length)/Number(g.spacing)):0),r=readAndAudit(count);
 out.textContent=(r.valid?"جانمایی معتبر؛ ":"جانمایی نامعتبر؛ ")+(r.solverCompatible?"با FEM فعلی سازگار است.":"تحلیل خودکار تا تکمیل FEM مستقل مسدود است.")+" دهانه‌های فعال: "+(r.activeBays||[]).join("، ")+"؛ دهانه‌های بدون جرثقیل: "+(r.unassignedBays||[]).join("، ")+"؛ "+[...(r.issues||[]),...(r.warnings||[])].join(" | ");
}
function init(){const el=$("craneBayConfigurationJson");if(el){el.addEventListener("input",render);el.addEventListener("change",render);}$("craneBayConfigurationAuditButton")?.addEventListener("click",render);}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 t("legacy empty configuration preserves one full-length crane",()=>{const r=audit("",4);return r.valid&&r.solverCompatible&&r.cranes[0].bays.length===4;});
 t("single crane explicitly assigned to all bays is FEM compatible",()=>audit([{id:"C1",bays:[1,2,3]}],3).solverCompatible);
 t("partial bay assignment is recorded but blocked from current FEM",()=>{const r=audit([{id:"C1",bays:[1,2]}],4);return r.valid&&!r.solverCompatible&&r.unassignedBays.join(",")==="3,4";});
 t("multiple separate cranes are recorded but blocked from current FEM",()=>{const r=audit([{id:"C1",bays:[1,2]},{id:"C2",bays:[4]}],4);return r.valid&&!r.solverCompatible&&r.cranes.length===2;});
 t("duplicate bay allocation on different runway systems is rejected",()=>!audit([{id:"C1",runwaySystemId:"R1",bays:[1]},{id:"C2",runwaySystemId:"R2",bays:[1]}],2).valid);
 t("shared runway occupancy is recorded but collision analysis remains warned",()=>{const r=audit([{id:"C1",runwaySystemId:"R1",bays:[1]},{id:"C2",runwaySystemId:"R1",bays:[1]}],2);return r.valid&&r.sharedRunwayBays[0]===1&&r.warnings.some(x=>x.includes("برخورد"));});
 t("duplicate crane identifiers are rejected",()=>!audit([{id:"C1",bays:[1]},{id:"C1",bays:[2]}],2).valid);
 t("out-of-range bay number is rejected",()=>!audit([{id:"C1",bays:[0,3]}],2).valid);
 t("empty bay list is rejected",()=>!audit([{id:"C1",bays:[]}],2).valid);
 t("malformed JSON is rejected",()=>!audit("[{bad",2).valid);
 t("per-crane wheel data completeness is reported",()=>{const r=audit([{id:"C1",bays:[1],ratedCapacity_t:10}],2);return !r.profileReady&&r.profileMissingByCrane[0].missing.includes("maxWheelLoad_t");});
 t("invalid per-crane wheel data is rejected",()=>!audit([{id:"C1",bays:[1],ratedCapacity_t:-5}],2).valid);
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init);else init();}
root.SteelCraneBayConfiguration={audit,readAndAudit,render,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-multi-bay-mesh-proposal.js ===== */
/* SAHROUD STEEL — proposal-only geometry for cranes sharing a runway system across selected bays.
 * This module does not mutate the structural model or enable FEM analysis.
 */
(function(root){
"use strict";
const TOL=1e-7;
const near=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=TOL;
const safeId=s=>Array.from(String(s)).map(ch=>ch.codePointAt(0).toString(16)).join("_");
function audit(model,configuration){
 const issues=[],warnings=[],g=model?.geometry||{},runway=g.craneRunway||{},frames=Array.isArray(g.frames)?g.frames:[],nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 const cfg=configuration||root.SteelCraneBayConfiguration?.readAndAudit?.(Number(g.bayCount));
 if(!cfg?.valid)issues.push("جانمایی جرثقیل‌ها معتبر نیست؛ ابتدا ممیزی تخصیص دهانه‌ها باید موفق شود.");
 if(!runway.enabled)issues.push("هندسه پایه تیر حمال در مدل فعال نیست.");
 const bayCount=Number(g.bayCount);
 if(!Number.isInteger(bayCount)||bayCount<1||frames.length!==bayCount+1)issues.push("تعداد ایستگاه‌های قاب باید دقیقاً یک عدد بیشتر از تعداد دهانه‌ها باشد.");
 if(!nodes.length||!members.length)issues.push("گره‌ها و اعضای واقعی مدل برای تطبیق تکیه‌گاه‌های تیر حمال موجود نیستند.");
 const elevation=Number(runway.elevationM),offset=Number(runway.axisOffsetM),span=Number(g.span);
 if(!(Number.isFinite(elevation)&&elevation>0))issues.push("تراز واقعی ریل برای ساخت پیشنهاد هندسی معتبر نیست.");
 if(!(Number.isFinite(offset)&&offset>=0.05))issues.push("فاصله محور تیر حمال از ستون باید صریح و معتبر باشد.");
 if(!(Number.isFinite(span)&&span>0))issues.push("دهانه عرضی سوله معتبر نیست.");
 if(frames.some((z,i)=>!Number.isFinite(Number(z))||(i>0&&!(Number(z)>Number(frames[i-1])))))issues.push("ایستگاه‌های قاب باید عددی، متناهی و صعودی باشند.");
 const cranes=Array.isArray(cfg?.cranes)?cfg.cranes:[];
 if(!cranes.length)issues.push("هیچ جرثقیلی برای ساخت پیشنهاد هندسی وجود ندارد.");
 const missingSystem=cranes.filter(c=>!String(c.runwaySystemId||"").trim());
 if(missingSystem.length)issues.push("برای تمام جرثقیل‌ها شناسه runwaySystemId لازم است؛ هندسه ریل مشترک/مستقل نباید حدس زده شود.");
 const systemIds=[...new Set(cranes.map(c=>String(c.runwaySystemId||"").trim()).filter(Boolean))];
 if(systemIds.length>1)issues.push("چند سامانه ریل مستقل تعریف شده است، اما تراز/محور/مقاطع هندسی جداگانه برای هر سامانه در مدل موجود نیست؛ ساخت هندسه چندسامانه‌ای متوقف شد.");
 const result={success:false,geometryReady:false,ready:false,proposalOnly:true,analysisEnabled:false,designApproved:false,runwaySystems:[],issues,warnings,blockers:[
  "پیشنهاد هندسی به مدل FEM اضافه نمی‌شود و هیچ بار یا سختی ایجاد نمی‌کند.",
  "مقطع تیر حمال، سختی و نوع اتصال براکت، پیوستگی تیر، رهاسازی‌ها و جزئیات اتصال هنوز باید مستقل تعیین و تأیید شوند.",
  "اشتراک ریل بین جرثقیل‌ها فقط به معنی هندسه مشترک است؛ برخورد، فاصله ایمن، هم‌زمانی حرکت و ترکیبات بار چندجرثقیلی تحلیل نمی‌شوند.",
  "تحلیل FEM فعلی همچنان فقط یک جرثقیل با مسیر سراسری تمام دهانه‌ها را می‌پذیرد."
 ],counts:{cranes:cranes.length,runwaySystems:systemIds.length,beamNodes:0,beamSegments:0,brackets:0}};
 if(issues.length)return result;
 const grouped=new Map();
 cranes.forEach(c=>{const key=String(c.runwaySystemId);if(!grouped.has(key))grouped.set(key,{runwaySystemId:key,craneIds:[],bays:new Set()});const item=grouped.get(key);item.craneIds.push(String(c.id));(c.bays||[]).forEach(b=>item.bays.add(Number(b)));});
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const systems=[];
 for(const item of grouped.values()){
  const bays=[...item.bays].sort((a,b)=>a-b);
  if(!bays.length||bays.some(b=>!Number.isInteger(b)||b<1||b>bayCount)){issues.push("دهانه‌های سامانه ریل "+item.runwaySystemId+" معتبر نیستند.");continue;}
  const frameIndexes=[...new Set(bays.flatMap(b=>[b-1,b]))].sort((a,b)=>a-b);
  const system={runwaySystemId:item.runwaySystemId,craneIds:item.craneIds,bays,frameIndexes,beamNodes:[],beamSegments:[],brackets:[],columnNodeIds:[]};
  for(const side of ["left","right"]){
   const columnX=side==="left"?0:span,beamX=side==="left"?-offset:span+offset;
   const sideNodes=new Map();
   for(const frameIndex of frameIndexes){
    const z=Number(frames[frameIndex]),matches=nodes.filter(n=>near(n.x,columnX)&&near(n.y,elevation)&&near(n.z,z));
    if(matches.length!==1){issues.push("گره ستون "+side+" در قاب "+(frameIndex+1)+" برای سامانه "+item.runwaySystemId+" تطبیق یکتا ندارد؛ تعداد: "+matches.length);continue;}
    const column=matches[0],attached=members.some(m=>m.sectionKey==="column"&&(String(m.start)===String(column.id)||String(m.end)===String(column.id)));
    if(!attached){issues.push("گره "+column.id+" در تراز ریل به ستون واقعی متصل نیست.");continue;}
    const nodeId="CRANE_SYS_"+safeId(item.runwaySystemId)+"_"+side.toUpperCase()+"_N"+(frameIndex+1);
    const beamNode={id:nodeId,x:beamX,y:elevation,z,kind:"crane-runway-beam-proposal",runwaySystemId:item.runwaySystemId,side,frameIndex:frameIndex+1,sourceColumnNodeId:column.id,proposalOnly:true};
    sideNodes.set(frameIndex,nodeId);system.beamNodes.push(beamNode);system.columnNodeIds.push(column.id);
    system.brackets.push({id:"CRANE_SYS_"+safeId(item.runwaySystemId)+"_"+side.toUpperCase()+"_BR"+(frameIndex+1),runwaySystemId:item.runwaySystemId,side,frameIndex:frameIndex+1,columnNodeId:column.id,beamNodeId:nodeId,lengthM:offset,sectionDefined:false,stiffnessDefined:false,connectionType:runway.supportType||"unselected",proposalOnly:true});
   }
   bays.forEach(b=>{
    const a=sideNodes.get(b-1),z=sideNodes.get(b);
    if(!a||!z)return;
    system.beamSegments.push({id:"CRANE_SYS_"+safeId(item.runwaySystemId)+"_"+side.toUpperCase()+"_BAY"+b,runwaySystemId:item.runwaySystemId,side,bay:b,start:a,end:z,lengthM:Number(frames[b])-Number(frames[b-1]),continuity:"separate-span-segment-no-continuity-assumed",sectionDefined:false,endReleases:"not-defined",proposalOnly:true});
   });
  }
  systems.push(system);
 }
 if(issues.length)return {...result,runwaySystems:systems,counts:{...result.counts,beamNodes:systems.reduce((n,s)=>n+s.beamNodes.length,0),beamSegments:systems.reduce((n,s)=>n+s.beamSegments.length,0),brackets:systems.reduce((n,s)=>n+s.brackets.length,0)}};
 const allBays=systems.flatMap(s=>s.bays),expectedSegments=systems.reduce((n,s)=>n+s.bays.length*2,0),actualSegments=systems.reduce((n,s)=>n+s.beamSegments.length,0);
 if(actualSegments!==expectedSegments)issues.push("برای بخشی از دهانه‌های تخصیص‌یافته، قطعه تیر حمال پیشنهادی ساخته نشد.");
 if(cranes.some(c=>c.profileReady===false))warnings.push("مشخصات بار چرخ بعضی جرثقیل‌ها ناقص است؛ این پیشنهاد صرفاً هندسی است.");
 if(systems.some(s=>s.craneIds.length>1))warnings.push("چند جرثقیل روی یک سامانه ریل مشترک قرار دارند؛ کنترل برخورد و بارگذاری هم‌زمان هنوز انجام نمی‌شود.");
 return {success:issues.length===0,geometryReady:issues.length===0,ready:false,proposalOnly:true,analysisEnabled:false,designApproved:false,runwaySystems:systems,counts:{cranes:cranes.length,runwaySystems:systems.length,beamNodes:systems.reduce((n,s)=>n+s.beamNodes.length,0),beamSegments:actualSegments,brackets:systems.reduce((n,s)=>n+s.brackets.length,0),assignedBayOccurrences:allBays.length},issues,warnings,blockers:result.blockers,scope:"Proposal-only beam/bracket geometry for cranes assigned to selected bays on a single explicitly identified shared runway system; no FEM integration or load application."};
}
function render(){
 const host=root.document?.getElementById("craneMultiBayMeshProposalResults");
 if(!host)return null;
 const model=root.SteelStructuralModel?.getData?.();
 if(!model){host.textContent="ابتدا مدل سه‌بعدی سوله را تولید کنید؛ هندسه واقعی قاب‌ها و ستون‌ها لازم است.";return null;}
 const cfg=root.SteelCraneBayConfiguration?.readAndAudit?.(Number(model.geometry?.bayCount));
 const r=audit(model,cfg);
 host.textContent=[
  "وضعیت پیشنهاد هندسی: "+(r.geometryReady?"هندسه پیشنهادی قابل تولید است":"متوقف / نیازمند تکمیل داده"),
  "جرثقیل: "+r.counts.cranes+" | سامانه ریل: "+r.counts.runwaySystems+" | گره تیر حمال: "+r.counts.beamNodes+" | قطعه تیر: "+r.counts.beamSegments+" | براکت: "+r.counts.brackets,
  ...r.runwaySystems.map(s=>"سامانه "+s.runwaySystemId+" | جرثقیل‌ها: "+s.craneIds.join("، ")+" | دهانه‌ها: "+s.bays.join("، ")),
  ...r.issues.map(x=>"مانع: "+x),
  ...r.warnings.map(x=>"هشدار: "+x),
  ...r.blockers.map(x=>"محدودیت: "+x),
  "این خروجی فقط پیشنهاد هندسی است؛ به FEM افزوده نشده و تحلیل/تأیید طراحی را فعال نمی‌کند."
 ].join("\\n");
 return r;
}
function init(){
 const button=root.document?.getElementById("craneMultiBayMeshProposalButton");
 if(button&&!button.dataset.bound){button.dataset.bound="1";button.addEventListener("click",render);}
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={geometry:{span:12,bayCount:3,frames:[0,5,10,15],craneRunway:{enabled:true,elevationM:5,axisOffsetM:.5,supportType:"unselected"}},nodes:[],members:[]};
 ["left","right"].forEach(side=>[0,5,10,15].forEach((z,i)=>{const x=side==="left"?0:12,id="C_"+side+"_"+i;model.nodes.push({id,x,y:5,z});model.nodes.push({id:id+"_TOP",x,y:6,z});model.members.push({id:"COL_"+side+"_"+i,start:id,end:id+"_TOP",sectionKey:"column"});}));
 const cfg={valid:true,cranes:[{id:"CR-1",runwaySystemId:"R1",bays:[1,2]},{id:"CR-2",runwaySystemId:"R1",bays:[3]}]};
 const good=audit(model,cfg);
 t("two cranes share one runway system and cover selected bays",()=>good.success&&good.geometryReady&&good.runwaySystems.length===1&&good.runwaySystems[0].craneIds.length===2);
 t("only assigned bays receive beam segments on both rails",()=>good.counts.beamSegments===6&&good.runwaySystems[0].beamSegments.every(x=>[1,2,3].includes(x.bay)));
 t("brackets are proposed only at required bay boundary frames",()=>good.counts.brackets===8&&good.counts.beamNodes===8);
 t("gaps in bay assignment remain gaps rather than full-length rails",()=>{const r=audit(model,{valid:true,cranes:[{id:"CR-1",runwaySystemId:"R1",bays:[1,3]}]});return r.success&&r.counts.beamSegments===4&&r.runwaySystems[0].bays.join(",")==="1,3";});
 t("separate runway systems are blocked until independent geometry inputs exist",()=>!audit(model,{valid:true,cranes:[{id:"A",runwaySystemId:"R1",bays:[1]},{id:"B",runwaySystemId:"R2",bays:[3]}]}).success);
 t("missing runway system identity is blocked",()=>!audit(model,{valid:true,cranes:[{id:"A",bays:[1]}]}).success);
 t("missing exact support node is rejected",()=>{const m=JSON.parse(JSON.stringify(model));m.nodes=m.nodes.filter(n=>n.id!=="C_left_1");return !audit(m,cfg).success;});
 t("ambiguous coincident support nodes are rejected",()=>{const m=JSON.parse(JSON.stringify(model));m.nodes.push({...m.nodes.find(n=>n.id==="C_left_1"),id:"DUP"});return !audit(m,cfg).success;});
 t("proposal does not mutate source structural model",()=>good.success&&model.nodes.length===16&&model.members.length===8);
 t("proposal never enables FEM or design approval",()=>good.analysisEnabled===false&&good.designApproved===false&&good.ready===false);
 t("invalid configuration is fail-closed",()=>!audit(model,{valid:false,cranes:[]}).success);
 t("non-monotonic frame stations are rejected",()=>{const m=JSON.parse(JSON.stringify(model));m.geometry.frames=[0,5,4,15];return !audit(m,cfg).success;});
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelCraneMultiBayMeshProposal={audit,render,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-runway-girder.js ===== */
/* SAHROUD STEEL — preliminary crane runway girder FEM.
 * Synchronized rail reaction cases are solved separately for left/right girders.
 * Linear vertical Euler-Bernoulli model only; not design approval.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const defaults={length_m:"",leftE_MPa:"200000",leftIx_mm4:"",leftPropertySource:"",rightE_MPa:"200000",rightIx_mm4:"",rightPropertySource:"",supportStationsCsv:"",leftSpringCsv:"",rightSpringCsv:"",supportStiffnessSource:"",detailSource:""};
let state={...defaults},lastResult=null;
const nums=v=>String(v??"").split(/[,،;；\s]+/).filter(Boolean).map(Number);
function audit(p){
 p=p||{};const issues=[],s=Array.isArray(p.supportStations_m)?p.supportStations_m:[];
 if(!(Number.isFinite(+p.length_m)&&+p.length_m>0))issues.push("طول تیر حمال باید مثبت باشد.");
 if(s.length<2)issues.push("حداقل دو تکیه‌گاه/براکت لازم است.");
 if(s.length>=2&&Number.isFinite(+p.length_m)&&+p.length_m>0&&(Math.abs(+s[0])>1e-8||Math.abs(+s[s.length-1]- +p.length_m)>1e-8))issues.push("برای این مدل تیر، تکیه‌گاه ابتدا و انتهای طول تیر باید صریحاً تعریف شوند؛ کنسول فقط با مدل هندسی جداگانه مجاز است.");
 if(s.some((x,i)=>!Number.isFinite(+x)||+x<0||+x>+p.length_m||(i&&+x<=+s[i-1])))issues.push("مختصات تکیه‌گاه‌ها باید صعودی، متمایز و داخل طول تیر باشند.");
 if(!String(p.supportStiffnessSource||"").trim())issues.push("مرجع سختی تکیه‌گاه/براکت لازم است.");
 if(!String(p.detailSource||"").trim())issues.push("مرجع نقشه جزئیات تیر حمال و براکت‌ها لازم است.");
 for(const side of ["left","right"]){
  if(!(Number.isFinite(+p[side+"E_MPa"])&&+p[side+"E_MPa"]>0))issues.push("E تیر حمال "+side+" نامعتبر است.");
  if(!(Number.isFinite(+p[side+"Ix_mm4"])&&+p[side+"Ix_mm4"]>0))issues.push("Ix تیر حمال "+side+" نامعتبر است.");
  if(!String(p[side+"PropertySource"]||"").trim())issues.push("مرجع خواص مقطع تیر حمال "+side+" لازم است.");
  const k=Array.isArray(p[side+"SpringStiffness_N_m"])?p[side+"SpringStiffness_N_m"]:[];
  if(k.length!==s.length||k.some(x=>!(Number.isFinite(+x)&&+x>0)))issues.push("سختی قائم مثبت و مستقل همه براکت‌های تیر حمال "+side+" لازم است.");
 }
 return {ready:issues.length===0,analysisEnabled:false,issues};
}
function auditLoadInterface(sourceLoads,result){
 const issues=[],rows=Array.isArray(sourceLoads)?sourceLoads:[],applied=Array.isArray(result?.loads)?result.loads:[];
 const close=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=Math.max(1e-7,Math.max(Math.abs(Number(a)),Math.abs(Number(b)))*1e-9);
 if(!rows.length)issues.push("بارهای منبع خالی‌اند.");
 if(applied.length!==rows.length)issues.push("تعداد بارهای اعمال‌شده در FEM با بارهای منتقل‌شده از ریل برابر نیست.");
 rows.forEach((x,i)=>{const y=applied[i];if(!y){issues.push("ردیف بار FEM شماره "+(i+1)+" مفقود است.");return;}if(!close(x.x_m,y.x_m))issues.push("مختصات بار شماره "+(i+1)+" در رابط ریل/تیر حمال تغییر کرده است.");if(!close(x.P_N,y.P_N))issues.push("مقدار یا علامت بار شماره "+(i+1)+" در رابط ریل/تیر حمال تغییر کرده است.");});
 const sourceForce=rows.reduce((a,x)=>a+Number(x.P_N),0),sourceMoment=rows.reduce((a,x)=>a+Number(x.P_N)*Number(x.x_m),0);
 const femForce=applied.reduce((a,x)=>a+Number(x.P_N),0),femMoment=applied.reduce((a,x)=>a+Number(x.P_N)*Number(x.x_m),0);
 if(!close(sourceForce,femForce))issues.push("برآیند قائم بارها در رابط ریل/تیر حمال حفظ نشده است.");
 if(!close(sourceMoment,femMoment))issues.push("لنگر بارها حول مبدأ طولی در رابط ریل/تیر حمال حفظ نشده است.");
 if(!close(sourceForce,result?.equilibrium?.verticalLoad_N))issues.push("برآیند بارهای ورودی با برآیند بار ثبت‌شده در تعادل FEM برابر نیست.");
 if(result?.equilibrium?.ok!==true)issues.push("تعادل مستقل FEM تیر حمال تأیید نشده است.");
 return {ok:issues.length===0,sourceLoadCount:rows.length,femLoadCount:applied.length,sourceResultant_N:sourceForce,femResultant_N:femForce,sourceFirstMoment_Nm:sourceMoment,femFirstMoment_Nm:femMoment,issues};
}
function analyze(p,transfer){
 const a=audit(p);if(!a.ready)return {success:false,analysisEnabled:false,audit:a};
 if(!transfer?.success||!Array.isArray(transfer.cases)||!transfer.cases.length)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["ابتدا جاروب هم‌زمان دو ریل را اجرا کنید."]}};
 const caseKeys=transfer.cases.map((c,i)=>String(c.caseId??c.id??i));
 if(new Set(caseKeys).size!==caseKeys.length)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["شناسه حالت‌های بار دو ریل تکراری است؛ هم‌زمانی حالات قابل اثبات نیست."]}};
 for(const [i,c] of transfer.cases.entries()){
  for(const side of ["left","right"]){const loads=c.girderPointLoads?.[side];if(!Array.isArray(loads)||!loads.length)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["حالت "+caseKeys[i]+" برای تیر "+side+" فاقد بار چرخ است؛ تحلیل ناقص دو ریل متوقف شد."]}};
   if(loads.some(x=>!Number.isFinite(Number(x.x_m))||Number(x.x_m)<0||Number(x.x_m)>Number(p.length_m)||!Number.isFinite(Number(x.P_N))||Number(x.P_N)===0))return {success:false,analysisEnabled:false,audit:{ready:false,issues:["مختصات یا مقدار بار چرخ در حالت "+caseKeys[i]+" و تیر "+side+" نامعتبر است."]}};
  }
 }
 const fem=root.SteelRailBeamFEM;if(!fem?.analyze)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["حل‌گر تیر FEM بارگذاری نشده است."]}};
 const results={left:[],right:[]},failures=[];
 for(const [caseIndex,c] of transfer.cases.entries())for(const side of ["left","right"]){
  const loads=c.girderPointLoads[side];
  try{
   const r=fem.analyze({length_m:+p.length_m,E_MPa:+p[side+"E_MPa"],Ix_mm4:+p[side+"Ix_mm4"],supports:p.supportStations_m.map((x,i)=>({x_m:+x,kVertical_N_m:+p[side+"SpringStiffness_N_m"][i]})),pointLoads:loads.map(x=>({x_m:+x.x_m,P_N:+x.P_N}))});
   const loadTransferAudit=auditLoadInterface(loads,r);
   if(!loadTransferAudit.ok)throw Error("ممیزی عددی انتقال بار ریل به تیر حمال ناموفق است: "+loadTransferAudit.issues.join("؛ "));
   results[side].push({caseIndex,caseId:caseKeys[caseIndex],referencePosition_m:c.referencePosition_m,loadCount:loads.length,loadTransferAudit,result:r});
  }catch(e){failures.push({caseIndex,side,reason:String(e.message||e)});}
 }
 const envelopes={};
 for(const side of ["left","right"]){
  const rows=results[side];envelopes[side]={solvedCases:rows.length,maxAbsNodalDeflection_m:0,governingDeflectionCase:null,maxAbsElementEndShear_N:0,governingShearCase:null,maxAbsElementEndMoment_Nm:0,governingMomentCase:null};
  rows.forEach(x=>{const d=Math.abs(x.result.maxNodalDeflection?.value||0);if(d>envelopes[side].maxAbsNodalDeflection_m){envelopes[side].maxAbsNodalDeflection_m=d;envelopes[side].governingDeflectionCase=x.caseIndex;}const shear=Math.max(0,...x.result.elements.flatMap(e=>[Math.abs(e.endActions[0]),Math.abs(e.endActions[2])])),moment=Math.max(0,...x.result.elements.flatMap(e=>[Math.abs(e.endActions[1]),Math.abs(e.endActions[3])]));if(shear>envelopes[side].maxAbsElementEndShear_N){envelopes[side].maxAbsElementEndShear_N=shear;envelopes[side].governingShearCase=x.caseIndex;}if(moment>envelopes[side].maxAbsElementEndMoment_Nm){envelopes[side].maxAbsElementEndMoment_Nm=moment;envelopes[side].governingMomentCase=x.caseIndex;}});
 }
 return {success:failures.length===0&&results.left.length===transfer.cases.length&&results.right.length===transfer.cases.length,analysisEnabled:false,method:"separate linear Euler-Bernoulli vertical FEM for two runway girders using synchronized rail reactions",length_m:+p.length_m,caseCount:transfer.cases.length,solvedCases:{left:results.left.length,right:results.right.length},failedCases:failures,envelopes,cases:results,units:{force:"N",length:"m",moment:"N.m",spring:"N/m"},limitations:["مدل تیر حمال یک‌بعدی، خطی، قائم و با EI ثابت است.","سختی براکت/اتصال فقط به شکل فنر قائم معادل وارد می‌شود.","بارهای افقی، پیچش، warping، خمش حول محور ضعیف و کمانش پیچشی-جانبی مدل نشده‌اند.","web crippling، خمش موضعی بال، سخت‌کننده، جوش، پیچ، خستگی و اثر ضربه کنترل نشده‌اند.","سختی عرضی پل جرثقیل بین دو ریل مدل نشده است.","خروجی مقدماتی است و تأیید آیین‌نامه‌ای یا طراحی اجرایی نیست."]};
}
function readUI(){const p={};Object.keys(defaults).forEach(k=>{const e=$("runwayGirder_"+k);if(e)p[k]=e.value;});for(const k of ["length_m","leftE_MPa","leftIx_mm4","rightE_MPa","rightIx_mm4"])p[k]=Number(p[k]);p.supportStations_m=nums(p.supportStationsCsv);p.leftSpringStiffness_N_m=nums(p.leftSpringCsv);p.rightSpringStiffness_N_m=nums(p.rightSpringCsv);return p;}
function setData(d){state={...defaults,...(d||{})};Object.keys(defaults).forEach(k=>{const e=$("runwayGirder_"+k);if(e)e.value=state[k]??"";});}
function getData(){try{return readUI();}catch(e){return {...state};}}
function ensurePanel(){
 if($("runwayGirderPanel"))return;const main=document.querySelector("main");if(!main)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="runwayGirderPanel";
 const fields=[["length_m","طول تیر حمال (m)"],["leftE_MPa","E تیر چپ (MPa)"],["leftIx_mm4","Ix تیر چپ (mm⁴)"],["leftPropertySource","مرجع مقطع چپ"],["rightE_MPa","E تیر راست (MPa)"],["rightIx_mm4","Ix تیر راست (mm⁴)"],["rightPropertySource","مرجع مقطع راست"],["supportStationsCsv","ایستگاه براکت‌ها (m، CSV)"],["leftSpringCsv","سختی براکت چپ (N/m، CSV)"],["rightSpringCsv","سختی براکت راست (N/m، CSV)"],["supportStiffnessSource","مرجع سختی براکت‌ها"],["detailSource","مرجع نقشه تیر حمال و براکت‌ها"]];
 panel.innerHTML='<div class="panel-title"><h3>تحلیل مقدماتی تیرهای حمال جرثقیل</h3><span class="status">FEM قائم</span></div><div class="notice">ابتدا جاروب هم‌زمان دو ریل را اجرا کنید. هر حالت مشترک جداگانه به دو تیر حمال منتقل می‌شود؛ بیشینه‌های غیرهم‌زمان جمع نمی‌شوند. تمام خواص و سختی‌ها باید مستند باشند.</div><div class="form-grid">'+fields.map(([k,l])=>'<div class="field"><label for="runwayGirder_'+k+'">'+l+'</label><input id="runwayGirder_'+k+'" type="text"></div>').join("")+'</div><div class="button-grid"><button id="runwayGirder_audit" class="btn secondary" type="button">ممیزی ورودی</button><button id="runwayGirder_run" class="btn primary" type="button">تحلیل دو تیر حمال</button></div><pre id="runwayGirder_result" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
 panel.querySelectorAll("input").forEach(e=>e.addEventListener("input",()=>{try{state=readUI();root.dispatchEvent(new CustomEvent("sahroud-runway-girder-change"));}catch(x){}}));
 $("runwayGirder_audit").addEventListener("click",()=>{$("runwayGirder_result").textContent=JSON.stringify(audit(readUI()),null,2);});
 $("runwayGirder_run").addEventListener("click",()=>{try{lastResult=analyze(readUI(),root.SteelCraneTwoRailTransfer?.getLastResult?.());$("runwayGirder_result").textContent=JSON.stringify(lastResult,null,2);}catch(e){$("runwayGirder_result").textContent=e.message;}});
 setData(state);
}
function selfTest(){
 const t=[],test=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const p={length_m:10,leftE_MPa:200000,leftIx_mm4:1e8,leftPropertySource:"catalog L",rightE_MPa:200000,rightIx_mm4:1.2e8,rightPropertySource:"catalog R",supportStations_m:[0,5,10],leftSpringStiffness_N_m:[1e12,1e12,1e12],rightSpringStiffness_N_m:[1e12,1e12,1e12],supportStiffnessSource:"test report",detailSource:"GA-2"};
 const tr={success:true,cases:[{referencePosition_m:0,girderPointLoads:{left:[{x_m:5,P_N:-1000}],right:[{x_m:5,P_N:-1200}]}}]};
 test("left/right sections audited independently",()=>audit(p).ready);
 test("missing section source rejected",()=>!audit({...p,leftPropertySource:""}).ready);
 test("missing bracket stiffness rejected",()=>!audit({...p,rightSpringStiffness_N_m:[]}).ready);
 test("unsorted supports rejected",()=>!audit({...p,supportStations_m:[0,5,4]}).ready);
 test("both girders solved from same transfer case",()=>{const r=analyze(p,tr);return r.success&&r.solvedCases.left===1&&r.solvedCases.right===1;});
 test("same synchronized case index preserved",()=>{const r=analyze(p,tr);return r.cases.left[0].caseIndex===r.cases.right[0].caseIndex;});
 test("missing two-rail result blocked",()=>!analyze(p,null).success);
 test("missing right-rail load in any synchronized case blocks whole run",()=>!analyze(p,{success:true,cases:[{girderPointLoads:{left:[{x_m:5,P_N:-1000}],right:[]}}]}).success);
 test("support stations must include both girder ends",()=>!audit({...p,supportStations_m:[1,5,10]}).ready);
 test("duplicate synchronized case identifiers rejected",()=>!analyze(p,{success:true,cases:[{caseId:"C1",girderPointLoads:{left:[{x_m:5,P_N:-1}],right:[{x_m:5,P_N:-1}]}},{caseId:"C1",girderPointLoads:{left:[{x_m:5,P_N:-1}],right:[{x_m:5,P_N:-1}]}}]}).success);
 test("numeric interface preserves every transferred load row, sign, coordinate and resultant",()=>{const r=analyze(p,tr);return r.success&&r.cases.left[0].loadTransferAudit.ok&&r.cases.right[0].loadTransferAudit.ok;});
 test("numeric interface rejects reversed wheel-load sign",()=>{const result={loads:[{x_m:5,P_N:1000}],equilibrium:{ok:true,verticalLoad_N:1000}};return !auditLoadInterface([{x_m:5,P_N:-1000}],result).ok;});
 test("numeric interface rejects omitted wheel load",()=>{const result={loads:[],equilibrium:{ok:true,verticalLoad_N:0}};return !auditLoadInterface([{x_m:5,P_N:-1000}],result).ok;});
 test("numeric interface rejects shifted application coordinate",()=>{const result={loads:[{x_m:6,P_N:-1000}],equilibrium:{ok:true,verticalLoad_N:-1000}};return !auditLoadInterface([{x_m:5,P_N:-1000}],result).ok;});
 test("numeric interface rejects altered resultant",()=>{const result={loads:[{x_m:5,P_N:-900}],equilibrium:{ok:true,verticalLoad_N:-900}};return !auditLoadInterface([{x_m:5,P_N:-1000}],result).ok;});
 test("design approval remains disabled",()=>analyze(p,tr).analysisEnabled===false);
 test("unresolved local limit states disclosed",()=>analyze(p,tr).limitations.some(x=>x.includes("web crippling")));
 test("equilibrium checked for both girder solutions",()=>{const r=analyze(p,tr);return r.cases.left[0].result.equilibrium.ok&&r.cases.right[0].result.equilibrium.ok;});
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,note:"Software regression only; no independent engineering validation."};
}
root.SteelRunwayGirderFEM={audit,analyze,auditLoadInterface,readUI,getData,setData,selfTest,getLastResult:()=>lastResult};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-load-path-audit.js ===== */
/* SAHROUD STEEL — crane load-path readiness and horizontal load ledger.
 * Audits exact crane runway -> bracket -> column topology. Never applies wheel loads.
 */
(function(root){
"use strict";
const num=x=>Number.isFinite(Number(x))?Number(x):null;
function auditGeometry(model){
 const issues=[],g=model?.geometry?.craneRunway,nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))issues.push("مدل سه‌بعدی ساخته نشده یا آرایه گره/عضو ندارد.");
 if(!g?.enabled)issues.push("جرثقیل در هندسه سه‌بعدی فعال نیست.");
 const supports=Array.isArray(g?.supportNodes)?g.supportNodes:[];
 const segments=Array.isArray(g?.beamSegments)?g.beamSegments:[];
 const brackets=Array.isArray(g?.brackets)?g.brackets:[];
 if(!supports.length)issues.push("گره‌های هندسی تکیه‌گاه تیر حمال تعریف نشده‌اند.");
 if(!segments.length)issues.push("قطعات مستقل تیر حمال تعریف نشده‌اند.");
 if(!brackets.length)issues.push("براکت‌های هندسی تیر حمال تعریف نشده‌اند.");
 const frameStations=[...new Set(supports.map(x=>num(x.z)).filter(x=>x!==null))].sort((a,b)=>a-b);
 if(frameStations.length<2)issues.push("برای تیر حمال حداقل دو ایستگاه قاب طولی معتبر لازم است.");
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n])),memberMap=new Map(members.map(m=>[String(m.id),m]));
 if(nodeMap.size!==nodes.length)issues.push("شناسه گره تکراری در مدل سه‌بعدی وجود دارد.");
 if(memberMap.size!==members.length)issues.push("شناسه عضو تکراری در مدل سه‌بعدی وجود دارد.");
 const mesh=g?.meshProposal,integrated=g?.integrated3D,bridge=g?.integrationAudit;
 if(!mesh?.geometryReady)issues.push("تطبیق دقیق گره‌های پیشنهادی تیر حمال با گره‌های ستون کامل نیست.");
 if(!integrated?.ready||!bridge?.success)issues.push("اعضای تیر حمال و براکت هنوز با مقطع و آزادسازی مستند به شبکه واقعی مدل افزوده نشده‌اند.");
 const beamNodes=Array.isArray(mesh?.beamNodes)?mesh.beamNodes:[];
 const beamMembers=Array.isArray(mesh?.beamMembers)?mesh.beamMembers:[];
 const bracketMembers=Array.isArray(mesh?.brackets)?mesh.brackets:[];
 const missingBeamNodes=beamNodes.filter(n=>!nodeMap.has(String(n.id)));
 const missingBeamMembers=beamMembers.filter(m=>{
  const actual=memberMap.get(String(m.id));
  return !actual||String(actual.start)!==String(m.start)||String(actual.end)!==String(m.end);
 });
 const missingBrackets=bracketMembers.filter(b=>{
  const actual=memberMap.get(String(b.id));
  return !actual||String(actual.start)!==String(b.columnNodeId)||String(actual.end)!==String(b.beamNodeId);
 });
 if(missingBeamNodes.length)issues.push("گره‌های تیر حمال در شبکه واقعی موجود نیستند: "+missingBeamNodes.slice(0,6).map(n=>n.id).join("، "));
 if(missingBeamMembers.length)issues.push("قطعات تیر حمال با شناسه و دو سر واقعی در شبکه FEM تطبیق ندارند: "+missingBeamMembers.slice(0,6).map(m=>m.id).join("، "));
 if(missingBrackets.length)issues.push("عضو براکت، اتصال گره ستون به گره تیر حمال را در شبکه FEM برقرار نمی‌کند: "+missingBrackets.slice(0,6).map(b=>b.id).join("، "));
 const integratedMembers=[...beamMembers.map(x=>x.id),...bracketMembers.map(x=>x.id)].map(String);
 const invalidSections=integratedMembers.filter(id=>{
  const m=memberMap.get(id),p=m?.analysisSection;
  return !p||!["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"].every(k=>Number.isFinite(Number(p[k]))&&Number(p[k])>0)||!String(p?.source||"").trim();
 });
 if(invalidSections.length)issues.push("خواص مقطع SI یا مرجع مستند برای اعضای جرثقیل ناقص است: "+invalidSections.slice(0,6).join("، "));
 const invalidReleases=integratedMembers.filter(id=>{
  const r=memberMap.get(id)?.endReleases;
  return !r||!Array.isArray(r.i)||!Array.isArray(r.j);
 });
 if(invalidReleases.length)issues.push("آزادسازی انتهایی تیر حمال/براکت صریح نیست: "+invalidReleases.slice(0,6).join("، "));
 const solverIncompatible=integratedMembers.filter(id=>{
  const m=memberMap.get(id),p=m?.analysisSection,r=m?.endReleases;
  return !m?.craneIntegration||!["craneRunwayGirder","craneRunwayBracket"].includes(m?.sectionKey)||
   !p||!["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"].every(k=>Number.isFinite(Number(p[k]))&&Number(p[k])>0)||
   !String(p?.source||"").trim()||
   !r||!["i","j"].every(end=>Array.isArray(r[end])&&r[end].every(d=>[4,5].includes(Number(d))));
 });
 if(solverIncompatible.length)issues.push("اعضای جرثقیل با قرارداد ورودی حل‌گر قاب سه‌بعدی سازگار نیستند (craneIntegration/sectionKey/خواص SI/آزادسازی محلی ۴ و ۵): "+solverIncompatible.slice(0,6).join("، "));
 const invalidMemberGeometry=integratedMembers.filter(id=>{
  const m=memberMap.get(id),a=nodeMap.get(String(m?.start)),b=nodeMap.get(String(m?.end));
  return !a||!b||!(Math.hypot(Number(a.x)-Number(b.x),Number(a.y)-Number(b.y),Number(a.z)-Number(b.z))>1e-8);
 });
 if(invalidMemberGeometry.length)issues.push("هندسه عضو جرثقیل برای تشکیل ماتریس سختی معتبر نیست یا طول صفر دارد: "+invalidMemberGeometry.slice(0,6).join("، "));
 const nonzeroOrUndeclaredLoads=integratedMembers.filter(id=>{
  const load=memberMap.get(id)?.analysisLoad?.uniformLocal;
  return !Array.isArray(load)||load.length!==3||load.some(v=>!Number.isFinite(Number(v))||Number(v)!==0);
 });
 if(nonzeroOrUndeclaredLoads.length)issues.push("تا تکمیل مسیر بار چرخ، بار گسترده اعضای جرثقیل باید صریحاً صفر و سه‌مولفه‌ای بماند: "+nonzeroOrUndeclaredLoads.slice(0,6).join("، "));
 const unsupported=brackets.filter(x=>!["simple","moment"].includes(x.connectionType));
 if(unsupported.length)issues.push("نوع اتصال براکت باید ساده یا گیردار و مطابق نقشه باشد.");
 const spanTypes=[...new Set(segments.map(s=>s.continuity))];
 if(spanTypes.some(x=>x!=="separate_span_segment_between_adjacent_frames"))issues.push("تعریف قطعات تیر حمال با الگوی دهانه‌های مستقل بین قاب‌های مجاور سازگار نیست.");
 return {ready:issues.length===0,geometryReady:issues.length===0,analysisEnabled:false,issues,
  counts:{modelNodes:nodes.length,modelMembers:members.length,geometricSupports:supports.length,proposalBeamNodes:beamNodes.length,missingBeamNodes:missingBeamNodes.length,beamSegments:segments.length,integratedBeamMembers:beamMembers.length,missingBeamMembers:missingBeamMembers.length,brackets:brackets.length,integratedBracketMembers:bracketMembers.length,missingBrackets:missingBrackets.length,longitudinalFrameStations:frameStations.length},
  supportStations_m:frameStations,spanModel:"دهانه‌های تیر حمال مستقل بین قاب‌های مجاور؛ پیوستگی خمشی چنددهانه فرض نشده است.",
  note:"آمادگی هندسی مسیر تا گره ستون ممیزی شده است؛ تحلیل تیر حمال، اعمال بار چرخ، کنترل اتصال و تأیید طراحی همچنان غیرفعال است."};
}
function horizontalLedger(horizontal,train){
 const d=horizontal||{},issues=[],positions=String(train?.positions_m??"").split(/[,،;；\s]+/).filter(Boolean).map(Number);
 const parse=s=>String(s??"").trim()===""?[]:String(s).split(",").map(x=>x.trim()).map(Number);
 const transverse=parse(d.transverseLoads_kN),longitudinal=parse(d.longitudinalLoads_kN);
 if(!d.enabled)return {ready:false,issues:["ثبت نیروهای افقی غیرفعال است."],loads:[]};
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0)||positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("مختصات قطار چرخ معتبر نیست.");
 if(transverse.length!==positions.length||transverse.some(x=>!Number.isFinite(x)||x<0))issues.push("فهرست نیروهای عرضی باید برای هر چرخ یک مقدار نامنفی داشته باشد.");
 if(longitudinal.length!==positions.length||longitudinal.some(x=>!Number.isFinite(x)||x<0))issues.push("فهرست نیروهای طولی باید برای هر چرخ یک مقدار نامنفی داشته باشد.");
 if(!transverse.some(x=>x>0)&&!longitudinal.some(x=>x>0))issues.push("حداقل یک نیروی افقی باید بزرگ‌تر از صفر باشد.");
 if(!["+X","-X"].includes(d.transverseSign))issues.push("علامت محور X نامعتبر است.");
 if(!["+Z","-Z"].includes(d.longitudinalSign))issues.push("علامت محور Z نامعتبر است.");
 if(!String(d.source||"").trim()||!String(d.document||"").trim())issues.push("منبع و شماره سند نیروهای افقی الزامی است.");
 const sx=d.transverseSign==="-X"?-1:1,sz=d.longitudinalSign==="-Z"?-1:1;
 const loads=positions.map((x,i)=>({wheelIndex:i+1,x_m:x,globalForce_N:[(transverse[i]||0)*1000*sx,0,(longitudinal[i]||0)*1000*sz],source:d.source||"",document:d.document||"",units:"N"}));
 return {ready:issues.length===0,analysisEnabled:false,issues,loads,coordinateConvention:{X:"عرضی سوله",Y:"قائم",Z:"طولی سوله"},note:"این دفتر ثبت برداری فقط نیروها را با علامت و واحد SI مرتب می‌کند؛ بارگذاری مدل سه‌بعدی مجاز نیست تا زنجیره چرخ-ریل-تیر حمال-براکت-ستون و مبانی بارگذاری کامل شود."};
}
function audit(model,horizontal,train){
 const geometry=auditGeometry(model),ledger=horizontalLedger(horizontal,train),issues=[...geometry.issues,...ledger.issues];
 issues.push("نیروهای افقی و قائم چرخ هنوز به حل‌گر تزریق نمی‌شوند؛ انتخاب گره نزدیک یا پایه ستون به‌جای محل واقعی تماس چرخ ممنوع است.");
 return {ready:false,analysisEnabled:false,geometry,ledger,issues,blockedReason:"ممیزی هندسی اتصال اعضا به‌تنهایی برای انتقال نیروهای چرخ کافی نیست؛ ریل، بست، محل تماس چرخ، توزیع بار، اثرات دینامیکی و ترکیبات بار باید جداگانه مدل و کنترل شوند."};
}
function prepare3DLoads(model,horizontal,train){
 const r=audit(model,horizontal,train);
 return {success:false,ready:false,analysisEnabled:false,audit:r,loads:[],message:"اعمال بار به حل‌گر سه‌بعدی تا تکمیل زنجیره بارگذاری و کنترل‌های مربوط مسدود است."};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={geometry:{craneRunway:{enabled:true,supportNodes:[{id:"S1",z:0},{id:"S2",z:5}],beamSegments:[{id:"B1",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{connectionType:"simple"}],supportType:"simple"}},nodes:[],members:[]};
 const validH={enabled:true,transverseLoads_kN:"10,12",longitudinalLoads_kN:"2,3",transverseSign:"-X",longitudinalSign:"+Z",source:"catalog",document:"page 4"};
 const tr={positions_m:"0, 2"};
 const geo=auditGeometry(model),ledger=horizontalLedger(validH,tr),blocked=prepare3DLoads(model,validH,tr);
 t("virtual supports without integrated topology are blocked",()=>!geo.ready&&geo.counts.missingBeamNodes===0&&geo.issues.some(x=>x.includes("اعضای تیر حمال")));
 t("separate-span runway geometry is accepted as the declared span model when integrated",()=>{
  const sec={E_Pa:2e11,G_Pa:7.7e10,A_m2:.01,Iy_m4:1e-4,Iz_m4:2e-4,J_m4:1e-5,source:"drawing"};
  const nodes=[{id:"C1",x:0,y:5,z:0},{id:"C2",x:0,y:5,z:5},{id:"B1",x:-.5,y:5,z:0},{id:"B2",x:-.5,y:5,z:5}];
  const members=[{id:"BC1",start:"C1",end:"B1",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"BC2",start:"C2",end:"B2",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"G1",start:"B1",end:"B2",sectionKey:"craneRunwayGirder",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}}];
  const p={geometryReady:true,beamNodes:[nodes[2],nodes[3]],beamMembers:[{id:"G1",start:"B1",end:"B2",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{id:"BC1",columnNodeId:"C1",beamNodeId:"B1",connectionType:"simple"},{id:"BC2",columnNodeId:"C2",beamNodeId:"B2",connectionType:"simple"}]};
  const fixture={nodes,members,geometry:{craneRunway:{enabled:true,supportNodes:[{id:"S1",z:0},{id:"S2",z:5}],beamSegments:[{id:"B1",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{connectionType:"simple"},{connectionType:"simple"}],meshProposal:p,integrated3D:{ready:true},integrationAudit:{success:true}}}};
  const result=auditGeometry(fixture); return result.ready&&result.counts.integratedBeamMembers===1&&result.spanModel.includes("مستقل");
 });
 const makeIntegratedFixture=()=>{
  const sec={E_Pa:2e11,G_Pa:7.7e10,A_m2:.01,Iy_m4:1e-4,Iz_m4:2e-4,J_m4:1e-5,source:"drawing"};
  const nodes=[{id:"C1",x:0,y:5,z:0},{id:"C2",x:0,y:5,z:5},{id:"B1",x:-.5,y:5,z:0},{id:"B2",x:-.5,y:5,z:5}];
  const members=[{id:"BC1",start:"C1",end:"B1",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"BC2",start:"C2",end:"B2",sectionKey:"craneRunwayBracket",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}},{id:"G1",start:"B1",end:"B2",sectionKey:"craneRunwayGirder",craneIntegration:true,analysisSection:sec,analysisLoad:{uniformLocal:[0,0,0]},endReleases:{i:[],j:[]}}];
  const meshProposal={geometryReady:true,beamNodes:[nodes[2],nodes[3]],beamMembers:[{id:"G1",start:"B1",end:"B2",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{id:"BC1",columnNodeId:"C1",beamNodeId:"B1",connectionType:"simple"},{id:"BC2",columnNodeId:"C2",beamNodeId:"B2",connectionType:"simple"}]};
  return {nodes,members,geometry:{craneRunway:{enabled:true,supportNodes:[{id:"S1",z:0},{id:"S2",z:5}],beamSegments:[{id:"S1-B1",continuity:"separate_span_segment_between_adjacent_frames"},{id:"B1-S2",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{connectionType:"simple"},{connectionType:"simple"}],meshProposal,integrated3D:{ready:true},integrationAudit:{success:true}}}};
 };
 const integratedFixture=makeIntegratedFixture(),integrated=auditGeometry(integratedFixture);
 t("crane integration members satisfy the 3D solver member contract",()=>integrated.ready&&integratedFixture.members.every(m=>m.craneIntegration===true&&["craneRunwayGirder","craneRunwayBracket"].includes(m.sectionKey)));
 const badRelease=makeIntegratedFixture();badRelease.members.find(m=>m.id==="G1").endReleases.i=[3];
 t("rejects local axial or torsional releases outside solver-supported bending rotations",()=>!auditGeometry(badRelease).ready&&auditGeometry(badRelease).issues.some(x=>x.includes("قرارداد ورودی حل‌گر")));
 const zeroLength=makeIntegratedFixture();zeroLength.nodes.find(n=>n.id==="B2").z=zeroLength.nodes.find(n=>n.id==="B1").z;
 t("rejects zero-length integrated runway member",()=>!auditGeometry(zeroLength).ready&&auditGeometry(zeroLength).issues.some(x=>x.includes("طول صفر")));

 t("integrated member topology and SI section data pass geometry audit",()=>integrated.ready&&integrated.counts.integratedBeamMembers===1&&integrated.counts.integratedBracketMembers===2);
 const brokenFixture=makeIntegratedFixture();brokenFixture.members=brokenFixture.members.filter(m=>m.id!=="BC1");
 const brokenAudit=auditGeometry(brokenFixture);
 t("missing bracket-to-column FEM member is rejected",()=>!brokenAudit.ready&&brokenAudit.counts.missingBrackets===1);
 const noLoadModel=makeIntegratedFixture();noLoadModel.members.find(m=>m.id==="G1").analysisLoad={uniformLocal:[1,0,0]};
 t("blocks premature nonzero member loads before crane load-path approval",()=>!auditGeometry(noLoadModel).ready&&auditGeometry(noLoadModel).issues.some(x=>x.includes("بار گسترده اعضای جرثقیل")));
 t("horizontal wheel force count aligned with wheel train",()=>ledger.ready&&ledger.loads.length===2);
 t("kN converted to N",()=>ledger.loads[0].globalForce_N[0]===-10000&&ledger.loads[1].globalForce_N[2]===3000);
 t("global force signs preserved",()=>ledger.loads[0].globalForce_N[0]<0&&ledger.loads[0].globalForce_N[2]>0);
 t("empty horizontal force lists rejected",()=>!horizontalLedger({...validH,transverseLoads_kN:"",longitudinalLoads_kN:""},tr).ready);
 t("all-zero horizontal actions rejected",()=>!horizontalLedger({...validH,transverseLoads_kN:"0,0",longitudinalLoads_kN:"0,0"},tr).ready);
 t("missing horizontal source rejected",()=>!horizontalLedger({...validH,source:""},tr).ready);
 t("mismatched wheel force count rejected",()=>!horizontalLedger({...validH,transverseLoads_kN:"10"},tr).ready);
 t("no nodal loads injected before load-path approval",()=>!blocked.success&&blocked.loads.length===0&&blocked.analysisEnabled===false);
 t("geometry and horizontal readiness both reported",()=>!!blocked.audit.geometry&&!!blocked.audit.ledger);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks,analysisEnabled:false,note:"Software audit tests only; not engineering validation."};
}
root.SteelCraneLoadPathAudit={audit,auditGeometry,horizontalLedger,prepare3DLoads,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/analysis-3d.js ===== */
/* SAHROUD STEEL - 3D elastic frame solver core
 * 6 DOF/node, 12 DOF/member, SI units (N, m, Pa).
 * Linear first-order elastic analysis; optional independent rotational DOFs
 * at each roof-purlin piece end. No P-Delta, warping, shear deformation,
 * buckling, or code design checks in this version.
 */
(function(root){
"use strict";
const EPS=1e-10;
const zeros=(r,c)=>Array.from({length:r},()=>Array(c).fill(0));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.sqrt(dot(a,a));
const scale=(a,s)=>a.map(v=>v*s);
const LOCAL_END_FORCE_CONVENTION={version:1,components:["Fx_i","Fy_i","Fz_i","Mx_i","My_i","Mz_i","Fx_j","Fy_j","Fz_j","Mx_j","My_j","Mz_j"],units:{force:"N",moment:"N.m"},basis:"member-local",axes:{x:"unit vector from physical end i toward physical end j",referenceAxis:"options.referenceAxis when supplied, otherwise [0,0,1]; replaced by [0,1,0] when abs(dot(ex,reference)/norm(reference)) > 0.95",y:"normalize(referenceAxis cross x)",z:"x cross y"},definition:"localEndForces = k_local * d_local - equivalentLocalLoad after declared end-release condensation; these are solver element end actions, not automatically code section-force signs",verifiedSignCases:{axialTension:{endI:"negative Fx_i",endJ:"positive Fx_j"},axialCompression:{endI:"positive Fx_i",endJ:"negative Fx_j"},cantileverTipNegativeLocalY:{endI:"positive Fy_i and positive Mz_i",endJ:"negative Fy_j and zero Mz_j"},cantileverTipPositiveLocalZ:{endI:"negative Fz_i and positive My_i",endJ:"positive Fz_j and zero My_j"},cantileverTipPositiveLocalXTorque:{endI:"negative Mx_i",endJ:"positive Mx_j"}},unverifiedSignCases:[]};
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function buildReactionRows(nodes,reactionVector,fixedDofs,springReactionByDof){
 const rows=[];
 (nodes||[]).forEach((node,index)=>{
  const values=Array.from({length:6},(_,d)=>{
   const dof=index*6+d;
   return (fixedDofs?.has(dof)?Number(reactionVector[dof])||0:0)+(Number(springReactionByDof?.[dof])||0);
  });
  const isSupport=Array.from({length:6},(_,d)=>fixedDofs?.has(index*6+d)).some(Boolean)||values.some(v=>Math.abs(v)>1e-8);
  if(isSupport)rows.push({nodeId:String(node.id),values});
 });
 return rows;
}
function solve(A,b){
 const n=b.length;
 // Symmetric diagonal equilibration reduces false singularity caused by
 // translational/rotational DOFs having very different stiffness units.
 const scaleD=Array(n);
 for(let i=0;i<n;i++){
  const d=Math.abs(A[i][i]);
  if(!(d>0&&Number.isFinite(d)))throw Error("DOF_SINGULAR:"+i+":قطر صفر یا نامعتبر در ماتریس سختی");
  scaleD[i]=1/Math.sqrt(d);
 }
 const M=A.map((r,i)=>r.map((v,j)=>v*scaleD[i]*scaleD[j]).concat(b[i]*scaleD[i]));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(Math.abs(M[p][k])<1e-12)throw Error("DOF_SINGULAR:"+k+":ماتریس مقیاس‌بندی‌شده تکین یا نزدیک به تکین است");
  [M[k],M[p]]=[M[p],M[k]];
  const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;
  for(let i=0;i<n;i++){if(i===k)continue;const f=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j];}
 }
 return M.map((r,i)=>r[n]*scaleD[i]);
}
function transpose(A){return A[0].map((_,j)=>A.map(r=>r[j]));}
function mul(A,B){
 const C=zeros(A.length,B[0].length);
 for(let i=0;i<A.length;i++)for(let k=0;k<B.length;k++)if(A[i][k]!==0)for(let j=0;j<B[0].length;j++)C[i][j]+=A[i][k]*B[k][j];
 return C;
}
function addBlock(K,ids,ke){for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++)K[ids[i]][ids[j]]+=ke[i][j];}
function frameLocalStiffness(p,L){
 const {E,A,Iy,Iz,G,J}=p;
 const k=zeros(12,12),ax=E*A/L,t=G*J/L;
 const put=(ids,b)=>{for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++)k[ids[i]][ids[j]]+=b[i][j];};
 put([0,6],[[ax,-ax],[-ax,ax]]);
 put([3,9],[[t,-t],[-t,t]]);
 const b=12*E*Iz/L**3,c=6*E*Iz/L**2,d=4*E*Iz/L,e=2*E*Iz/L;
 put([1,5,7,11],[
 [b,c,-b,c],[c,d,-c,e],[-b,-c,b,-c],[c,e,-c,d]
 ]);
 const f=12*E*Iy/L**3,g=6*E*Iy/L**2,h=4*E*Iy/L,j=2*E*Iy/L;
 put([2,4,8,10],[
 [f,-g,-f,-g],[-g,h,g,j],[-f,g,f,g],[-g,j,g,h]
 ]);
 return k;
}
function makeTransform(a,b,reference){
 const d=sub(b,a),L=norm(d);if(!(L>0))throw Error("عضو با طول صفر در مدل وجود دارد.");
 const ex=scale(d,1/L);let ref=reference||[0,0,1];
 if(Math.abs(dot(ex,ref)/norm(ref))>0.95)ref=[0,1,0];
 const ey=scale(cross(ref,ex),1/norm(cross(ref,ex)));
 const ez=cross(ex,ey);
 const R=[ex,ey,ez],T=zeros(12,12);
 for(let block=0;block<4;block++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)T[block*3+i][block*3+j]=R[i][j];
 return {T,L,axes:{x:ex,y:ey,z:ez}};
}
function rigidArmTransform(r){
 const [x,y,z]=r||[0,0,0];
 if(![x,y,z].every(Number.isFinite))throw Error("بردار بازوی صلب باید سه مؤلفه عددی معتبر داشته باشد.");
 const S=[[0,-z,y],[z,0,-x],[-y,x,0]],B=zeros(6,6);
 for(let i=0;i<3;i++){B[i][i]=1;B[i+3][i+3]=1;for(let j=0;j<3;j++)B[i][j+3]=-S[i][j];}
 return B;
}
function memberArmTransform(member){
 const oi=member.endOffsets?.i||[0,0,0],oj=member.endOffsets?.j||[0,0,0];
 const Bi=rigidArmTransform(oi),Bj=rigidArmTransform(oj),B=zeros(12,12);
 for(let i=0;i<6;i++)for(let j=0;j<6;j++){B[i][j]=Bi[i][j];B[i+6][j+6]=Bj[i][j];}
 return {B,offsetI:oi.slice(),offsetJ:oj.slice()};
}
function equivalentUniformLoad(q,L){
 const [qx,qy,qz]=q, f=Array(12).fill(0);
 f[0]=qx*L/2;f[6]=qx*L/2;
 f[1]=qy*L/2;f[7]=qy*L/2;f[5]=qy*L*L/12;f[11]=-qy*L*L/12;
 f[2]=qz*L/2;f[8]=qz*L/2;f[4]=-qz*L*L/12;f[10]=qz*L*L/12;
 return f;
}
function equivalentLinearLoad(qi,qj,L){
 if(!Array.isArray(qi)||!Array.isArray(qj)||qi.length!==3||qj.length!==3||
    [...qi,...qj].some(v=>!Number.isFinite(Number(v))))
  throw Error("بار گسترده خطی عضو باید دو بردار محلی سه‌مؤلفه‌ای معتبر داشته باشد.");
 const f=Array(12).fill(0),a=qi.map(Number),b=qj.map(Number);
 f[0]=L*(2*a[0]+b[0])/6;f[6]=L*(a[0]+2*b[0])/6;
 f[1]=L*(7*a[1]+3*b[1])/20;f[7]=L*(3*a[1]+7*b[1])/20;
 f[2]=L*(7*a[2]+3*b[2])/20;f[8]=L*(3*a[2]+7*b[2])/20;
 f[5]=L*L*(3*a[1]+2*b[1])/60;f[11]=-L*L*(2*a[1]+3*b[1])/60;
 f[4]=-L*L*(3*a[2]+2*b[2])/60;f[10]=L*L*(2*a[2]+3*b[2])/60;
 return f;
}

function solveSmall(A,b){
 const n=b.length,M=A.map((r,i)=>r.slice().concat([b[i]]));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(Math.abs(M[p][k])<1e-14)throw Error("آزادسازی انتهایی عضو به زیرماتریس تکین منجر شد؛ ترکیب آزادی‌های پیچشی/خمشی را بررسی کنید.");
  [M[k],M[p]]=[M[p],M[k]];
  const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;
  for(let i=0;i<n;i++)if(i!==k){const q=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=q*M[k][j];}
 }
 return M.map(r=>r[n]);
}
function normalizeEndReleases(member,options){
 const raw=(options.memberEndReleases&&options.memberEndReleases[String(member.id)])||member.endReleases||{};
 const out={i:[],j:[]};
 for(const end of ["i","j"]){
  const values=Array.isArray(raw[end])?raw[end]:[];
  values.forEach(v=>{
   const d=Number(v);
   if(!Number.isInteger(d)||d<3||d>5)throw Error("آزادسازی عضو "+member.id+" فقط برای دوران‌های محلی 3، 4 و 5 مجاز است.");
   if(!out[end].includes(d))out[end].push(d);
  });
 }
 if(out.i.includes(3)&&out.j.includes(3))
  throw Error("آزادسازی پیچش در هر دو انتهای عضو "+member.id+" هم‌زمان مجاز نیست؛ عضو می‌تواند ناپایدار شود.");
 return out;
}
function condenseMemberEndReleases(K,F,releases){
 const released=[...releases.i.map(d=>d),...releases.j.map(d=>d+6)].sort((a,b)=>a-b);
 if(!released.length)return{K,F,released,restore:null};
 const retained=Array.from({length:12},(_,i)=>i).filter(i=>!released.includes(i));
 const Kss=released.map(i=>released.map(j=>K[i][j]));
 const Ksr=released.map(i=>retained.map(j=>K[i][j]));
 const Krs=retained.map(i=>released.map(j=>K[i][j]));
 const Krr=retained.map(i=>retained.map(j=>K[i][j]));
 const Fs=released.map(i=>F[i]),Fr=retained.map(i=>F[i]);
 const invKsr=retained.map((_,j)=>solveSmall(Kss,Ksr.map(row=>row[j])));
 const invFs=solveSmall(Kss,Fs);
 const Kc=Array.from({length:12},()=>Array(12).fill(0)),Fc=Array(12).fill(0);
 for(let a=0;a<retained.length;a++){
  const i=retained[a];
  Fc[i]=Fr[a]-Krs[a].reduce((s,v,k)=>s+v*invFs[k],0);
  for(let b=0;b<retained.length;b++){
   const j=retained[b];
   Kc[i][j]=Krr[a][b]-Krs[a].reduce((s,v,k)=>s+v*invKsr[b][k],0);
  }
 }
 return{K:Kc,F:Fc,released,retained,Kss,Ksr,Fs};
}
function restoreReleasedRotations(localD,releaseData){
 if(!releaseData||!releaseData.released.length)return localD;
 const {released,retained,Kss,Ksr,Fs}=releaseData;
 const rhs=Fs.map((v,i)=>v-Ksr[i].reduce((s,k,j)=>s+k*localD[retained[j]],0));
 const values=solveSmall(Kss,rhs);
 released.forEach((d,i)=>localD[d]=values[i]);
 return localD;
}
function analyze(model,options){
 options=options||{};
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر ارائه نشده است.");
 const nodes=model.nodes, members=model.members, nodeMap=new Map(nodes.map((n,i)=>[n.id,i]));
 if(nodeMap.size!==nodes.length)throw Error("شناسه گره تکراری است.");
 let nDof=nodes.length*6;
 const purlinEndRotationDof=new Map();
 if(options.releasePurlinRafterRotation===true){
  const rafterNodes=new Set();
  members.forEach(m=>{
   if((m.sectionKey||"")==="rafter"){rafterNodes.add(m.start);rafterNodes.add(m.end);}
  });
  // Release two bending rotations (global X/Y) at each purlin support.
  // Keep global Z rotation shared: it is torsion about the longitudinal purlin axis.
  const pieceNodeRotationDof=new Map();
  members.forEach(m=>{
   if((m.sectionKey||"")!=="roofPurlin")return;
   [["i",m.start],["j",m.end]].forEach(([end,nodeId])=>{
    if(!rafterNodes.has(nodeId))return;
    // Segments of the same fabricated piece share the released bending rotations.
    const pieceKey=String(m.pieceId||m.id)+":"+String(nodeId);
    let ids=pieceNodeRotationDof.get(pieceKey);
    if(!ids){ids=[nDof,nDof+1];nDof+=2;pieceNodeRotationDof.set(pieceKey,ids);}
    purlinEndRotationDof.set(String(m.id)+":"+end,ids);
   });
  });
 }
 const K=zeros(nDof,nDof),F=Array(nDof).fill(0),elements=[];
 const props=options.sectionResolver;
 if(typeof props!=="function")throw Error("تابع تخصیص خواص مقطع برای همه اعضا تعریف نشده است؛ تحلیل متوقف شد.");
 for(const m of members){
  const ia=nodeMap.get(m.start),ib=nodeMap.get(m.end);if(ia===undefined||ib===undefined)throw Error("گره ابتدا یا انتهای عضو "+m.id+" یافت نشد.");
  const p=props(m);if(!p)throw Error("مقطع عضو "+m.id+" ("+m.type+") تخصیص نیافته است.");
  for(const key of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(Number(p[key]))&&Number(p[key])>0))throw Error("خاصیت "+key+" برای عضو "+m.id+" ناقص یا نامعتبر است.");
  const jointA=[nodes[ia].x,nodes[ia].y,nodes[ia].z],jointB=[nodes[ib].x,nodes[ib].y,nodes[ib].z];
  const arm=memberArmTransform(m);
  const a=sub(jointA,scale(arm.offsetI,-1)),b=sub(jointB,scale(arm.offsetJ,-1));
  const tr=makeTransform(a,b,options.referenceAxis),kl=frameLocalStiffness(p,tr.L);
  const ids=Array.from({length:6},(_,i)=>ia*6+i).concat(Array.from({length:6},(_,i)=>ib*6+i));
  const endReleases=normalizeEndReleases(m,options);
  const releaseData=condenseMemberEndReleases(kl,Array(12).fill(0),endReleases);
  const Tjoint=mul(tr.T,arm.B);
  const kg=mul(transpose(Tjoint),mul(releaseData.K,Tjoint));
  if(options.releasePurlinRafterRotation===true&&(m.sectionKey||"")==="roofPurlin"){
   const ri=purlinEndRotationDof.get(String(m.id)+":i"),rj=purlinEndRotationDof.get(String(m.id)+":j");
   if(ri){ids[3]=ri[0];ids[4]=ri[1];}
   if(rj){ids[9]=rj[0];ids[10]=rj[1];}
  }
  addBlock(K,ids,kg);
  const declaredLoad=m.analysisLoad&&m.analysisLoad.uniformLocal;
  if(options.requireExplicitMemberLoads===true&&(!Array.isArray(declaredLoad)||declaredLoad.length!==3))
   throw Error("بار عضو "+m.id+" در مدل تحلیل صریحاً تعریف نشده است؛ حتی بار صفر نیز باید به‌صورت [0,0,0] ثبت شود.");
  const q=Array.isArray(declaredLoad)?declaredLoad.map(Number):[0,0,0];
  if(q.length!==3||q.some(v=>!Number.isFinite(v)))throw Error("بار گسترده محلی عضو "+m.id+" معتبر نیست.");
  const linear=m.analysisLoad&&m.analysisLoad.linearLocal;
  let fl;
  if(linear!==undefined&&linear!==null){
   if(!linear||!Array.isArray(linear.start)||!Array.isArray(linear.end))
    throw Error("بار خطی متغیر عضو "+m.id+" باید ابتدا و انتهای محلی داشته باشد.");
   const varying=equivalentLinearLoad(linear.start,linear.end,tr.L);
   const uniform=equivalentUniformLoad(q,tr.L);
   fl=varying.map((v,i)=>v+uniform[i]);
  }else fl=equivalentUniformLoad(q,tr.L);
  const releasedLoad=condenseMemberEndReleases(kl,fl,endReleases);
  if(releaseData.released.length)releaseData.Fs=releasedLoad.Fs;
  const fg=mul(transpose(Tjoint),releasedLoad.F.map(v=>[v])).map(r=>r[0]);
  ids.forEach((id,i)=>F[id]+=fg[i]);
  elements.push({member:m,ids,kl,T:Tjoint,L:tr.L,axes:tr.axes,fl,props:p,releaseData,endReleases,offsetI:arm.offsetI,offsetJ:arm.offsetJ});
 }
 (options.nodalLoads||[]).forEach(load=>{
  const ni=nodeMap.get(load.nodeId);if(ni===undefined)throw Error("گره بارگذاری‌شده یافت نشد: "+load.nodeId);
  const v=load.values||[];if(v.length!==6)throw Error("بار گره‌ای باید شش مؤلفه داشته باشد.");
  v.forEach((x,j)=>{if(!Number.isFinite(Number(x)))throw Error("بار گره‌ای نامعتبر است.");F[ni*6+j]+=Number(x);});
 });
 const fixed=new Set();
 (options.supports||[]).forEach(s=>{
  const ni=nodeMap.get(s.nodeId);if(ni===undefined)throw Error("گره تکیه‌گاهی یافت نشد: "+s.nodeId);
  (s.fixedDofs||[]).forEach(d=>{if(!Number.isInteger(d)||d<0||d>5)throw Error("درجه آزادی تکیه‌گاه نامعتبر است.");fixed.add(ni*6+d);});
 });
 const nodalSprings=[];
 (options.nodalSprings||[]).forEach((spring,index)=>{
  const ni=nodeMap.get(spring.nodeId);
  if(ni===undefined)throw Error("گره فنر تکیه‌گاهی یافت نشد: "+spring.nodeId);
  const dof=Number(spring.dof),stiffness=Number(spring.stiffness);
  if(!Number.isInteger(dof)||dof<0||dof>5)throw Error("درجه آزادی فنر شماره "+(index+1)+" باید عدد صحیح بین 0 تا 5 باشد.");
  if(!(Number.isFinite(stiffness)&&stiffness>0))throw Error("سختی فنر تکیه‌گاهی باید عددی مثبت و محدود باشد.");
  const globalDof=ni*6+dof;
  if(fixed.has(globalDof))throw Error("برای یک درجه آزادی، فنر و قید صلب هم‌زمان تعریف شده‌اند؛ گره "+spring.nodeId+"، درجه آزادی "+dof);
  K[globalDof][globalDof]+=stiffness;
  nodalSprings.push({nodeId:spring.nodeId,nodeIndex:ni,dof,globalDof,stiffness,kind:dof<3?"translational":"rotational"});
 });
 const connectorSprings=[];
 (options.connectorSprings||[]).forEach((spring,index)=>{
  const ni=nodeMap.get(spring.nodeI),nj=nodeMap.get(spring.nodeJ);
  if(ni===undefined||nj===undefined)throw Error("گره ابتدا یا انتهای فنر رابط شماره "+(index+1)+" یافت نشد.");
  if(ni===nj)throw Error("فنر رابط باید دو شناسه گره مستقل داشته باشد.");
  const dof=Number(spring.dof),stiffness=Number(spring.stiffness);
  if(!Number.isInteger(dof)||dof<0||dof>5)throw Error("درجه آزادی فنر رابط باید عدد صحیح بین 0 تا 5 باشد.");
  if(!(Number.isFinite(stiffness)&&stiffness>0))throw Error("سختی فنر رابط باید عددی مثبت و محدود باشد.");
  const a=nodes[ni],b=nodes[nj],separation=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  if(separation>1e-6)throw Error("گره‌های فنر رابط باید هم‌مکان باشند؛ انتقال نیرو بین گره‌های جدا از هم بدون بازوی صلب/هندسه اتصال مجاز نیست.");
  const iDof=ni*6+dof,jDof=nj*6+dof;
  K[iDof][iDof]+=stiffness;K[jDof][jDof]+=stiffness;
  K[iDof][jDof]-=stiffness;K[jDof][iDof]-=stiffness;
  connectorSprings.push({id:spring.id||("CONNECTOR_SPRING_"+(index+1)),nodeI:spring.nodeI,nodeJ:spring.nodeJ,nodeIndexI:ni,nodeIndexJ:nj,dof,stiffness,kind:dof<3?"translational":"rotational",globalDofI:iDof,globalDofJ:jDof});
 });


 const free=Array.from({length:nDof},(_,i)=>i).filter(i=>!fixed.has(i));
 if(!free.length)throw Error("تمام درجات آزادی مقید شده‌اند.");
 const Kff=free.map(i=>free.map(j=>K[i][j])),Ff=free.map(i=>F[i]);
 let df;
 try{df=solve(Kff,Ff);}
 catch(err){
  const match=String(err.message||err).match(/DOF_SINGULAR:(\d+):(.*)/);
  if(match){
   const reduced=Number(match[1]),globalDof=free[reduced];
   const dofNames=["انتقال X","انتقال Y","انتقال Z","دوران X","دوران Y","دوران Z"];
   let nodeLabel="نامشخص",component="درجه آزادی "+globalDof;
   if(globalDof<nodes.length*6){
    const nodeIndex=Math.floor(globalDof/6),dof=globalDof%6,node=nodes[nodeIndex];
    nodeLabel=node?String(node.id)+" ("+(node.kind||"گره")+ ")":"گره نامشخص";
    component=dofNames[dof];
   }else{
    let found=false;
    purlinEndRotationDof.forEach((ids,key)=>{
     const local=ids.indexOf(globalDof);
     if(local>=0){
      const parts=String(key).split(":"),memberId=parts[0],end=parts[1];
      const member=members.find(x=>String(x.id)===memberId);
      const nodeId=member?(end==="i"?member.start:member.end):null;
      const ni=nodeMap.get(nodeId),node=ni===undefined?null:nodes[ni];
      nodeLabel=node?String(node.id)+" ("+(node.kind||"گره")+ ")":"گره پرلین نامشخص";
      component="دوران "+["X","Y"][local]+" انتهای "+end+" پرلین مستقل "+memberId;
      found=true;
     }
    });
    if(!found)component="درجه آزادی اضافی "+globalDof+" (گره متناظر شناسایی نشد)";
   }
   throw Error("ناپایداری عددی/سازه‌ای در "+nodeLabel+"، مؤلفه "+component+
    "؛ شماره درجه آزادی آزاد "+globalDof+
    ". جزئیات حل‌گر: "+match[2]+". پیوستگی پرلین، جزئیات کلیپس/نبشی، مهاربندی و تکیه‌گاه‌های این ناحیه باید بررسی شوند.");
  }
  throw err;
 }
 const D=Array(nDof).fill(0);
 free.forEach((id,i)=>D[id]=df[i]);
 const KD=K.map(r=>dot(r,D)),R=KD.map((v,i)=>v-F[i]);
 const springReactionByDof=Array(nDof).fill(0);
 nodalSprings.forEach(s=>{springReactionByDof[s.globalDof]-=s.stiffness*D[s.globalDof];});
 // Global equilibrium is evaluated from assembled equivalent nodal loads and
 // support reactions. Do not sum force and moment components into one scalar.
 const appliedForce=[0,0,0],appliedMoment=[0,0,0];
 const supportForce=[0,0,0],supportMoment=[0,0,0];
 const addGlobal=(force,moment,node,targetForce,targetMoment)=>{
  for(let k=0;k<3;k++){targetForce[k]+=force[k];targetMoment[k]+=moment[k];}
  const rx=node.x||0,ry=node.y||0,rz=node.z||0;
  targetMoment[0]+=ry*force[2]-rz*force[1];
  targetMoment[1]+=rz*force[0]-rx*force[2];
  targetMoment[2]+=rx*force[1]-ry*force[0];
 };
 nodes.forEach((node,i)=>{
  const base=i*6,sf=springReactionByDof.slice(base,base+3),sm=springReactionByDof.slice(base+3,base+6);
  addGlobal(sf,sm,node,supportForce,supportMoment);
 });

 nodes.forEach((node,i)=>{
  const base=i*6,loadForce=F.slice(base,base+3),loadMoment=F.slice(base+3,base+6);
  addGlobal(loadForce,loadMoment,node,appliedForce,appliedMoment);
  const reactionForce=[0,1,2].map(d=>fixed.has(base+d)?R[base+d]:0);
  const reactionMoment=[3,4,5].map(d=>fixed.has(base+d)?R[base+d]:0);
  addGlobal(reactionForce,reactionMoment,node,supportForce,supportMoment);
 });
 const forceResidual=appliedForce.map((v,i)=>v+supportForce[i]);
 // Equivalent end moments applied to the duplicated purlin bending rotations
 // must be included in the global moment equilibrium check as well.
 const releasedRotationLoads=[],releasedRotationKeys=new Set();
 purlinEndRotationDof.forEach((ids,key)=>{
  const parts=String(key).split(":"),memberId=parts[0],end=parts[1];
  const member=members.find(x=>String(x.id)===memberId);
  const nodeId=member?(end==="i"?member.start:member.end):null;
  const nodeIndex=nodeMap.get(nodeId),uniqueKey=String(nodeId)+"|"+ids.join(",");
  if(nodeIndex!==undefined&&!releasedRotationKeys.has(uniqueKey)){
   releasedRotationKeys.add(uniqueKey);
   const momentNm=[F[ids[0]],F[ids[1]],0];
   releasedRotationLoads.push({nodeId:String(nodeId),memberId:String(memberId),end,momentNm});
   addGlobal([0,0,0],momentNm,nodes[nodeIndex],appliedForce,appliedMoment);
  }
 });
 const momentResidual=appliedMoment.map((v,i)=>v+supportMoment[i]);
 const vectorNorm=v=>Math.hypot(...v);
 const relativeForceResidual=vectorNorm(forceResidual)/Math.max(vectorNorm(appliedForce),vectorNorm(supportForce),1);
 const relativeMomentResidual=vectorNorm(momentResidual)/Math.max(vectorNorm(appliedMoment),vectorNorm(supportMoment),1);
 // Node-by-node algebraic residual of the assembled 6-DOF system. Fixed-DOF
 // residuals are identified as support reactions; free-DOF residuals must be
 // negligible. This is a solver residual check, NOT an independent member-end
 // force equilibrium reconstruction.
 const nodeEquilibrium=nodes.map((node,i)=>{
  const base=i*6,components=[];
  for(let d=0;d<6;d++){
   const dof=base+d,isFixed=fixed.has(dof),reaction=isFixed?R[dof]:0;
   const residual=KD[dof]-F[dof]-reaction;
   const scaleValue=Math.max(Math.abs(KD[dof]),Math.abs(F[dof]),Math.abs(reaction),1);
   components.push({dof:d,residual,reaction,isFixed,relativeResidual:Math.abs(residual)/scaleValue});
  }
  const maxRelativeResidual=Math.max(0,...components.map(x=>x.relativeResidual));
  return{nodeId:String(node.id),components,maxRelativeResidual,ok:maxRelativeResidual<=1e-6};
 });
 const maxNodeResidualRatio=Math.max(0,...nodeEquilibrium.map(x=>x.maxRelativeResidual));
 const nodeEquilibriumOk=nodeEquilibrium.every(x=>x.ok);
 let equilibrium=null;
 const results=elements.map(e=>{
  const dg=e.ids.map(i=>D[i]),dl=restoreReleasedRotations(mul(e.T,dg.map(v=>[v])).map(r=>r[0]),e.releaseData),q=mul(e.kl,dl.map(v=>[v])).map(r=>r[0]);
  const end=q.map((v,i)=>v-e.fl[i]);
  return {id:e.member.id,localEndForceConventionVersion:LOCAL_END_FORCE_CONVENTION.version,parentMemberId:e.member.parentMemberId||null,taperSegmentIndex:e.member.taperSegmentIndex||null,taperSegmentCount:e.member.taperSegmentCount||null,start:e.member.start,end:e.member.end,sectionKey:e.member.sectionKey||e.props.sectionKey||"",type:e.member.type,length:e.L,localEndForces:end,localAxes:e.axes,section:e.props,endReleases:e.endReleases,endOffsets:{i:e.offsetI.slice(),j:e.offsetJ.slice()}};
 });
 // Independent node balance from recovered element end actions. End actions are
 // transformed from physical member ends to joint DOFs through Tjoint, which
 // includes rigid-arm offsets. Equivalent member-load effects are already
 // embedded in localEndForces (= k*d - equivalentLocalLoad).
 const memberEndByNode=nodes.map(()=>Array(6).fill(0));
 elements.forEach((e,index)=>{
  const local=results[index].localEndForces;
  const joint=mul(transpose(e.T),local.map(v=>[v])).map(r=>r[0]);
  const ia=nodeMap.get(e.member.start),ib=nodeMap.get(e.member.end);
  for(let d=0;d<6;d++){memberEndByNode[ia][d]+=joint[d];memberEndByNode[ib][d]+=joint[d+6];}
 });
 const appliedNodalByNode=nodes.map(()=>Array(6).fill(0));
 (options.nodalLoads||[]).forEach(load=>{
  const ni=nodeMap.get(load.nodeId);load.values.forEach((v,d)=>appliedNodalByNode[ni][d]+=Number(v));
 });
 const supportByNode=nodes.map(()=>Array(6).fill(0));
 fixed.forEach(dof=>{supportByNode[Math.floor(dof/6)][dof%6]+=R[dof];});
 const springByNode=nodes.map(()=>Array(6).fill(0));
 nodalSprings.forEach(sp=>{springByNode[sp.nodeIndex][sp.dof]+=springReactionByDof[sp.globalDof];});
 const connectorByNode=nodes.map(()=>Array(6).fill(0));
 connectorSprings.forEach(sp=>{
  const force=sp.stiffness*(D[sp.globalDofJ]-D[sp.globalDofI]);
  connectorByNode[sp.nodeIndexI][sp.dof]+=force;
  connectorByNode[sp.nodeIndexJ][sp.dof]-=force;
 });
 const memberEndEquilibrium=nodes.map((node,i)=>{
  const components=Array.from({length:6},(_,d)=>{
   const internal=memberEndByNode[i][d],applied=appliedNodalByNode[i][d],support=supportByNode[i][d],spring=springByNode[i][d],connector=connectorByNode[i][d];
   const residual=internal-applied-support-spring-connector;
   const scaleValue=Math.max(Math.abs(internal),Math.abs(applied),Math.abs(support),Math.abs(spring),Math.abs(connector),1);
   return{dof:d,memberEndAction:internal,appliedNodalLoad:applied,supportReaction:support,nodalSpringReaction:spring,connectorSpringForce:connector,residual,relativeResidual:Math.abs(residual)/scaleValue};
  });
  const maxRelativeResidual=Math.max(0,...components.map(x=>x.relativeResidual));
  return{nodeId:String(node.id),components,maxRelativeResidual,ok:maxRelativeResidual<=1e-6};
 });
 const maxMemberEndResidualRatio=Math.max(0,...memberEndEquilibrium.map(x=>x.maxRelativeResidual));
 const memberEndEquilibriumOk=memberEndEquilibrium.every(x=>x.ok);
 equilibrium={appliedForceN:appliedForce,supportReactionN:supportForce,
  forceResidualN:forceResidual,momentResidualNm:momentResidual,appliedMomentNm:appliedMoment,supportMomentNm:supportMoment,
  relativeForceResidual,relativeMomentResidual,nodeEquilibrium,nodeEquilibriumOk,maxNodeResidualRatio,
  memberEndEquilibrium,memberEndEquilibriumOk,maxMemberEndResidualRatio,
  equilibriumScope:"global resultant, assembled nodal residual, and independent recovered member-end-action balance at every physical node; includes rigid-arm transforms, equivalent member loads, nodal loads, supports, nodal springs and coincident-node connector springs",
  ok:relativeForceResidual<=1e-6&&relativeMomentResidual<=1e-6&&nodeEquilibriumOk&&memberEndEquilibriumOk,freeDofCount:free.length};
 let maxTranslation=0,maxDisplacement=null;
 nodes.forEach((n,i)=>{
  const components=D.slice(i*6,i*6+3);
  const magnitude=Math.hypot(...components);
  if(magnitude>maxTranslation){
   maxTranslation=magnitude;
   maxDisplacement={nodeId:n.id,components,rotation:D.slice(i*6+3,i*6+6),magnitude};
  }
 });
 const reactions=buildReactionRows(nodes,R,fixed,springReactionByDof);
 return {success:true,method:"3D linear elastic direct stiffness",units:"N,m,Pa",localEndForceConvention:LOCAL_END_FORCE_CONVENTION,nodeCount:nodes.length,memberCount:members.length,purlinRafterReleasedBendingRotationEnds:purlinEndRotationDof.size,nodalSpringCount:nodalSprings.length,nodalSprings:nodalSprings.map(s=>({nodeId:s.nodeId,dof:s.dof,stiffness:s.stiffness,kind:s.kind,reaction:springReactionByDof[s.globalDof]})),connectorSpringCount:connectorSprings.length,connectorSprings:connectorSprings.map(s=>{const ui=D[s.globalDofI],uj=D[s.globalDofJ],relativeDisplacement=uj-ui;return {id:s.id,nodeI:s.nodeI,nodeJ:s.nodeJ,dof:s.dof,stiffness:s.stiffness,kind:s.kind,relativeDisplacement,springForceOnNodeI:s.stiffness*relativeDisplacement,springForceOnNodeJ:-s.stiffness*relativeDisplacement};}),displacements:nodes.map((n,i)=>({nodeId:n.id,values:D.slice(i*6,i*6+6)})),reactions,members:results,equivalentReleasedRotationLoads:releasedRotationLoads,maxTranslation,maxDisplacement,limitations:["تحلیل خطی مرتبه اول","بدون اثر P-Delta و تحلیل کمانش","بدون تغییرشکل برشی و وارپینگ پیچشی","فنرهای گره‌ای خطی مستقل به زمین و فنرهای رابط دوگرهی بین گره‌های هم‌مکان؛ سختی ثابت، بدون تماس، لغزش، لقی یا هیسترزیس","آزادسازی انتهایی دوران فقط با چگالش استاتیکی و برای درجات آزادی محلی مشخص‌شده؛ بدون آزادسازی انتقالی","بدون کنترل آیین‌نامه‌ای مقاومت و اتصالات","بار گسترده عضو به‌صورت یکنواخت یا خطی‌متغیر در مؤلفه‌های محلی پذیرفته می‌شود"],equilibrium};
}

function selfTest(){
 const reactionRows=buildReactionRows([{id:"BASE_A"},{id:"BASE_B"},{id:"FREE"}],[0,0,0,0,0,0,12,-34,0,0,0,0],new Set([0,1,2,3,4,5,6,7,8,9,10,11]),Array(18).fill(0));
 const reactionRowsIncludeZeroSupport=reactionRows.length===2&&reactionRows.some(x=>x.nodeId==="BASE_A"&&x.values.every(v=>v===0))&&reactionRows.some(x=>x.nodeId==="BASE_B"&&x.values[0]===12&&x.values[1]===-34);
 const E=200e9,G=77e9,A=0.01,Iy=8e-5,Iz=2e-5,J=1e-5,L=3;
 const section={E,G,A,Iy,Iz,J};
 const makeModel=()=>({nodes:[{id:"FIX",x:0,y:0,z:0},{id:"TIP",x:L,y:0,z:0}],members:[{id:"TEST",start:"FIX",end:"TIP",type:"validation"}]});
 const base={supports:[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}],sectionResolver:()=>section};
 const close=(actual,expected,tol)=>Math.abs(actual-expected)<=Math.max(Math.abs(expected)*tol,1e-12);
 const tests=[];
 const nodeResidualFixture=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[1000,0,0,0,0,0]}]});
 const nodeResidualPass=nodeResidualFixture.equilibrium.nodeEquilibrium.length===2&&nodeResidualFixture.equilibrium.nodeEquilibrium.every(x=>x.ok)&&nodeResidualFixture.equilibrium.maxNodeResidualRatio<=1e-6;
 tests.push({name:"node-by-node-assembled-equilibrium-residual",ok:nodeResidualPass,maxRelativeResidual:nodeResidualFixture.equilibrium.maxNodeResidualRatio});
 const memberBalancePass=nodeResidualFixture.equilibrium.memberEndEquilibriumOk===true&&nodeResidualFixture.equilibrium.memberEndEquilibrium.length===2&&nodeResidualFixture.equilibrium.memberEndEquilibrium.every(x=>x.ok)&&nodeResidualFixture.equilibrium.maxMemberEndResidualRatio<=1e-6;
 tests.push({name:"independent-member-end-action-node-balance-including-support",ok:memberBalancePass,maxRelativeResidual:nodeResidualFixture.equilibrium.maxMemberEndResidualRatio});
 const offsetModel={nodes:[{id:"FIX",x:0,y:0,z:0},{id:"TIP",x:L,y:0,z:0}],members:[{id:"OFFSET",start:"FIX",end:"TIP",type:"validation",endOffsets:{i:[0,-.25,0],j:[0,0,0]}}]};
 const offsetBalance=analyze(offsetModel,{...base,nodalLoads:[{nodeId:"TIP",values:[0,0,-1000,0,0,0]}]});
 tests.push({name:"independent-node-balance-includes-rigid-arm-moment-transfer",ok:offsetBalance.equilibrium.memberEndEquilibriumOk===true&&offsetBalance.equilibrium.ok,maxRelativeResidual:offsetBalance.equilibrium.maxMemberEndResidualRatio});
 const contract=analyze(makeModel(),base).localEndForceConvention;
 tests.push({name:"local-end-force-contract-metadata",ok:contract?.version===1&&contract.components.length===12&&contract.basis==="member-local"&&contract.verifiedSignCases.axialTension.endI==="negative Fx_i"&&contract.unverifiedSignCases.length===0});
 const axes=analyze(makeModel(),base).members[0].localAxes;
 const axisDot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),axisNorm=a=>Math.hypot(...a);
 tests.push({name:"member-local-axes-orthonormal-and-right-handed",ok:!!axes&&["x","y","z"].every(k=>Array.isArray(axes[k])&&axes[k].length===3&&Math.abs(axisNorm(axes[k])-1)<1e-12)&&Math.abs(axisDot(axes.x,axes.y))<1e-12&&Math.abs(axisDot(axes.x,axes.z))<1e-12&&Math.abs(axisDot(axes.y,axes.z))<1e-12&&close(axisDot([axes.x[1]*axes.y[2]-axes.x[2]*axes.y[1],axes.x[2]*axes.y[0]-axes.x[0]*axes.y[2],axes.x[0]*axes.y[1]-axes.x[1]*axes.y[0]],axes.z),1,1e-12)});
 const run=(name,load,read,expected)=>{
  try{
   const result=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:load}]});
   const actual=read(result),ok=close(actual,expected,1e-7)&&result.equilibrium.ok;
   tests.push({name,ok,actual,expected,equilibrium:result.equilibrium.ok});
  }catch(e){tests.push({name,ok:false,error:String(e.message||e)});}
 };
 run("axial-extension",[1000,0,0,0,0,0],r=>r.displacements.find(n=>n.nodeId==="TIP").values[0],1000*L/(E*A));
 try{
  const tensile=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[1000,0,0,0,0,0]}]}).members[0].localEndForces;
  const compression=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[-1000,0,0,0,0,0]}]}).members[0].localEndForces;
  const ok=tensile[0]<0&&tensile[6]>0&&compression[0]>0&&compression[6]<0;
  tests.push({name:"axial-force-sign-convention",ok,tensionEndI:tensile[0],tensionEndJ:tensile[6],compressionEndI:compression[0],compressionEndJ:compression[6]});
 }catch(e){tests.push({name:"axial-force-sign-convention",ok:false,error:String(e.message||e)});}
 try{
  const result=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[0,-1000,0,0,0,0]}]});
  const v=result.members[0].localEndForces,ok=close(v[1],1000,1e-7)&&close(v[7],-1000,1e-7)&&close(v[5],1000*L,1e-7)&&close(v[11],0,1e-7)&&result.equilibrium.ok;
  tests.push({name:"local-y-shear-and-bending-end-force-signs",ok,endIFy:v[1],endJFy:v[7],endIMz:v[5],endJMz:v[11],equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"local-y-shear-and-bending-end-force-signs",ok:false,error:String(e.message||e)});}
 try{
  const result=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[0,0,1000,0,0,0]}]});
  const v=result.members[0].localEndForces,ok=close(v[2],-1000,1e-7)&&close(v[8],1000,1e-7)&&close(v[4],1000*L,1e-7)&&close(v[10],0,1e-7)&&result.equilibrium.ok;
  tests.push({name:"local-z-shear-and-bending-end-force-signs",ok,endIFz:v[2],endJFz:v[8],endIMy:v[4],endJMy:v[10],equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"local-z-shear-and-bending-end-force-signs",ok:false,error:String(e.message||e)});}
 try{
  const result=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[0,0,0,1000,0,0]}]});
  const v=result.members[0].localEndForces,ok=close(v[3],-1000,1e-7)&&close(v[9],1000,1e-7)&&result.equilibrium.ok;
  tests.push({name:"local-torsion-end-force-signs",ok,endIMx:v[3],endJMx:v[9],equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"local-torsion-end-force-signs",ok:false,error:String(e.message||e)});}
 try{
  const model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],members:[{id:"LINEAR",start:"A",end:"B",type:"validation",analysisLoad:{uniformLocal:[0,0,0],linearLocal:{start:[0,-100,0],end:[0,-300,0]}}}]};
  const result=analyze(model,{...base,supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]},{nodeId:"B",fixedDofs:[0,1,2]}]});
  const fy=result.equilibrium.appliedForceN[1],mz=result.equilibrium.appliedMomentNm[2];
  const ok=close(fy,-600,1e-8)&&close(mz,-1050,1e-8)&&result.equilibrium.ok;
  tests.push({name:"linearly-varying-member-load-preserves-resultant-and-first-moment",ok,appliedVerticalN:fy,expectedVerticalN:-600,appliedMomentZNm:mz,expectedMomentZNm:-1050,equilibrium:result.equilibrium.ok});
  try{const model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],members:[{id:"LINEAR_PLUS_UNIFORM",start:"A",end:"B",type:"validation",analysisLoad:{uniformLocal:[0,-100,0],linearLocal:{start:[0,-100,0],end:[0,-300,0]}}}]};const result=analyze(model,{...base,supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]},{nodeId:"B",fixedDofs:[0,1,2]}]});const fy=result.equilibrium.appliedForceN[1],mz=result.equilibrium.appliedMomentNm[2];const ok=close(fy,-900,1e-8)&&close(mz,-1500,1e-8)&&result.equilibrium.ok;tests.push({name:"uniform-and-linear-member-loads-superpose-resultants",ok,appliedVerticalN:fy,expectedVerticalN:-900,appliedMomentZNm:mz,expectedMomentZNm:-1500,equilibrium:result.equilibrium.ok});}catch(e){tests.push({name:"uniform-and-linear-member-loads-superpose-resultants",ok:false,error:String(e.message||e)});}
 }catch(e){tests.push({name:"linearly-varying-member-load-preserves-resultant-and-first-moment",ok:false,error:String(e.message||e)});}
 run("cantilever-y-deflection",[0,-1000,0,0,0,0],r=>Math.abs(r.displacements.find(n=>n.nodeId==="TIP").values[1]),1000*Math.pow(L,3)/(3*E*Iz));
 run("torsional-rotation",[0,0,0,1000,0,0],r=>Math.abs(r.displacements.find(n=>n.nodeId==="TIP").values[3]),1000*L/(G*J));

 // A uniformly loaded member with both bending rotations released must recover zero end moments.
 try{
  const q=-1200,model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],members:[{id:"PIN",start:"A",end:"B",type:"validation",analysisLoad:{uniformLocal:[0,q,0]},endReleases:{i:[4,5],j:[4,5]}}]};
  const result=analyze(model,{...base,supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]},{nodeId:"B",fixedDofs:[0,1,2,4,5]}]});
  const end=result.members[0].localEndForces;
  const maxMoment=Math.max(Math.abs(end[3]),Math.abs(end[4]),Math.abs(end[5]),Math.abs(end[9]),Math.abs(end[10]),Math.abs(end[11]));
  const expectedShear=Math.abs(q)*L/2;
  const shearOK=close(Math.abs(end[1]),expectedShear,1e-7)&&close(Math.abs(end[7]),expectedShear,1e-7);
  tests.push({name:"pinned-end-uniform-load-zero-end-moments",ok:maxMoment<1e-6&&shearOK&&result.equilibrium.ok,maxReleasedEndMomentNm:maxMoment,expectedEndShearN:expectedShear,equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"pinned-end-uniform-load-zero-end-moments",ok:false,error:String(e.message||e)});}
 // Roof purlin support rotations are released from rafters while translations
 // remain shared; the purlin's vertical load must reach the two rafter supports.
 try{
  const q=-1200,model={
   nodes:[{id:"PA",x:0,y:0,z:0},{id:"PB",x:0,y:0,z:L},{id:"BASE_A",x:0,y:-L,z:0},{id:"BASE_B",x:0,y:-L,z:L}],
   members:[
    {id:"PURLIN_TEST",start:"PA",end:"PB",sectionKey:"roofPurlin",pieceId:"PURLIN_BAY_1",analysisLoad:{uniformLocal:[0,0,q]}},
    {id:"RAFTER_A",start:"PA",end:"BASE_A",sectionKey:"rafter"},
    {id:"RAFTER_B",start:"PB",end:"BASE_B",sectionKey:"rafter"}
   ]
  };
  const result=analyze(model,{...base,releasePurlinRafterRotation:true,supports:[{nodeId:"BASE_A",fixedDofs:[0,1,2,3,4,5]},{nodeId:"BASE_B",fixedDofs:[0,1,2,3,4,5]}]});
  const p=result.members.find(m=>m.id==="PURLIN_TEST"),verticalReactions=result.reactions.reduce((s,r)=>s+(r.values[1]||0),0);
  const releasedMoments=Math.max(Math.abs(p.localEndForces[4]),Math.abs(p.localEndForces[5]),Math.abs(p.localEndForces[10]),Math.abs(p.localEndForces[11]));
  const ok=result.equilibrium.ok&&result.purlinRafterReleasedBendingRotationEnds===2&&close(verticalReactions,-q*L,1e-7)&&releasedMoments<1e-6;
  tests.push({name:"purlin-load-transfers-to-rafter-supports-with-bending-rotations-released",ok,verticalReactionsN:verticalReactions,expectedVerticalReactionsN:-q*L,releasedBendingEndMomentNm:releasedMoments,releaseEndCount:result.purlinRafterReleasedBendingRotationEnds,equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"purlin-load-transfers-to-rafter-supports-with-bending-rotations-released",ok:false,error:String(e.message||e)});}
 try{
  const model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],members:[{id:"BAD",start:"A",end:"B",type:"validation",endReleases:{i:[3],j:[3]}}]};
  analyze(model,{...base});
  tests.push({name:"reject-double-torsion-release",ok:false});
 }catch(e){tests.push({name:"reject-double-torsion-release",ok:String(e.message||e).includes("پیچش")});}

 try{
  const kBeam=3*E*Iz/Math.pow(L,3),kSpring=2.5e5,P=-1000;
  const result=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[0,P,0,0,0,0]}],nodalSprings:[{nodeId:"TIP",dof:1,stiffness:kSpring}]});
  const delta=result.displacements.find(n=>n.nodeId==="TIP").values[1],expected=P/(kBeam+kSpring);
  const springReaction=result.nodalSprings[0].reaction;
  const ok=close(delta,expected,1e-7)&&close(springReaction,-kSpring*expected,1e-7)&&result.nodalSpringCount===1&&result.equilibrium.ok;
  tests.push({name:"translational-nodal-spring-cantilever",ok,actualDisplacementM:delta,expectedDisplacementM:expected,springReactionN:springReaction,equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"translational-nodal-spring-cantilever",ok:false,error:String(e.message||e)});}
 try{
  analyze(makeModel(),{...base,nodalSprings:[{nodeId:"TIP",dof:1,stiffness:0}]});
  tests.push({name:"reject-nonpositive-spring-stiffness",ok:false});
 }catch(e){tests.push({name:"reject-nonpositive-spring-stiffness",ok:String(e.message||e).includes("مثبت")});}
 try{
  analyze(makeModel(),{...base,supports:[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}],nodalSprings:[{nodeId:"FIX",dof:1,stiffness:1e5}]});
  tests.push({name:"reject-spring-on-fixed-degree",ok:false});
 }catch(e){tests.push({name:"reject-spring-on-fixed-degree",ok:String(e.message||e).includes("هم‌زمان")});}
 try{
  const kBeam=G*J/L,kSpring=1.4e5,Torque=1000;
  const result=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:[0,0,0,Torque,0,0]}],nodalSprings:[{nodeId:"TIP",dof:3,stiffness:kSpring}]});
  const rotation=result.displacements.find(n=>n.nodeId==="TIP").values[3],expected=Torque/(kBeam+kSpring);
  const springReaction=result.nodalSprings[0].reaction;
  const ok=close(rotation,expected,1e-7)&&close(springReaction,-kSpring*expected,1e-7)&&result.equilibrium.ok;
  tests.push({name:"rotational-nodal-spring-cantilever",ok,actualRotationRad:rotation,expectedRotationRad:expected,springReactionNm:springReaction,equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"rotational-nodal-spring-cantilever",ok:false,error:String(e.message||e)});}
 try{
  const kBeam=3*E*Iz/Math.pow(L,3),kConnector=1.8e5,P=-1000;
  const model={nodes:[{id:"A1",x:0,y:0,z:0},{id:"B1",x:L,y:0,z:0},{id:"A2",x:0,y:0,z:0},{id:"B2",x:L,y:0,z:0}],members:[{id:"M1",start:"A1",end:"B1",type:"validation"},{id:"M2",start:"A2",end:"B2",type:"validation"}]};
  const result=analyze(model,{sectionResolver:()=>section,supports:[{nodeId:"A1",fixedDofs:[0,1,2,3,4,5]},{nodeId:"A2",fixedDofs:[0,1,2,3,4,5]}],nodalLoads:[{nodeId:"B1",values:[0,P,0,0,0,0]}],connectorSprings:[{id:"PAD",nodeI:"B1",nodeJ:"B2",dof:1,stiffness:kConnector}]});
  const u1=result.displacements.find(n=>n.nodeId==="B1").values[1],u2=result.displacements.find(n=>n.nodeId==="B2").values[1],expectedRelative=-P/(kBeam+2*kConnector),spring=result.connectorSprings[0];
  const ok=close(u2-u1,expectedRelative,1e-7)&&close(spring.springForceOnNodeI,kConnector*expectedRelative,1e-7)&&close(spring.springForceOnNodeI+spring.springForceOnNodeJ,0,1e-12)&&result.equilibrium.ok;
  tests.push({name:"coincident-node-connector-spring",ok,relativeDisplacementM:u2-u1,expectedRelativeDisplacementM:expectedRelative,forceOnNodeIN:spring.springForceOnNodeI,equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"coincident-node-connector-spring",ok:false,error:String(e.message||e)});}
 try{
  const B=rigidArmTransform([0,-0.25,0]);
  const d=[0,0,0,1,0,0],u=mul(B,d.map(v=>[v])).map(r=>r[0]);
  const F=[0,0,1000,0,0,0],jointF=mul(transpose(B),F.map(v=>[v])).map(r=>r[0]);
  const ok=close(u[2],-0.25,1e-12)&&close(jointF[3],-250,1e-12);
  tests.push({name:"rigid-arm-rotation-translation-and-force-moment-transfer",ok,physicalEndDisplacementZ:u[2],jointMomentXNm:jointF[3],expectedDisplacementZM:-0.25,expectedMomentXNm:-250});
 }catch(e){tests.push({name:"rigid-arm-rotation-translation-and-force-moment-transfer",ok:false,error:String(e.message||e)});}
 try{
  const model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],members:[{id:"NO_LOAD",start:"A",end:"B",type:"validation"}]};
  let rejected=false;
  try{analyze(model,{...base,requireExplicitMemberLoads:true});}catch(e){rejected=String(e.message||e).includes("بار عضو NO_LOAD");}
  const explicit=analyze({nodes:model.nodes,members:[{...model.members[0],analysisLoad:{uniformLocal:[0,0,0]}}]},{sectionResolver:()=>section,supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}],requireExplicitMemberLoads:true});
  tests.push({name:"strict-mode-rejects-undeclared-member-load-and-accepts-explicit-zero",ok:rejected&&explicit.members.length===1&&explicit.equilibrium.ok,missingLoadRejected:rejected,explicitZeroAccepted:explicit.members.length===1,equilibrium:explicit.equilibrium.ok});
 }catch(e){tests.push({name:"strict-mode-rejects-undeclared-member-load-and-accepts-explicit-zero",ok:false,error:String(e.message||e)});}
 tests.push({name:"all restrained support nodes are reported including zero-reaction supports",ok:reactionRowsIncludeZeroSupport,reported:reactionRows.map(x=>x.nodeId)});
 return{schemaVersion:1,passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok).length,total:tests.length,tests,note:"آزمون‌های تحلیلی عضو منفرد برای کنترل واحدها و قرارداد علامت؛ جایگزین اعتبارسنجی مستقل، آزمون همگرایی یا کنترل آیین‌نامه‌ای نیست."};
}
root.SteelFrame3D={analyze,selfTest,frameLocalStiffness,makeTransform,rigidArmTransform,memberArmTransform,equivalentUniformLoad,buildReactionRows,solve};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/analysis.js ===== */

/* SAHROUD STEEL - 2D Portal Frame Matrix Analysis
Version 2.3 - Corrected axial force sign convention
Linear elastic first-order analysis
Units: N, m, Pa
Axial convention in exported member data:
Tension positive, compression negative.
*/
(function () {
"use strict";

const $ = id => document.getElementById(id);

function number(id) {
    const el = $(id);
    if (!el) throw new Error("فیلد " + id + " پیدا نشد.");
    const n = Number(el.value);
    if (!Number.isFinite(n)) {
        throw new Error("مقدار فیلد " + id + " معتبر نیست.");
    }
    return n;
}

function fmt(value, digits = 3) {
    return Number(value).toLocaleString("fa-IR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

function matrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function transpose(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
}

function multiply(A, B) {
    const C = matrix(A.length, B[0].length);
    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < B[0].length; j++) {
            for (let k = 0; k < B.length; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

function solveLinearSystem(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let k = 0; k < n; k++) {
        let pivot = k;
        for (let i = k + 1; i < n; i++) {
            if (Math.abs(M[i][k]) > Math.abs(M[pivot][k])) {
                pivot = i;
            }
        }

        if (Math.abs(M[pivot][k]) < 1e-12) {
            throw new Error(
                "ماتریس سختی ناپایدار یا تکین است. " +
                "هندسه، تکیه‌گاه‌ها و مقاطع را بررسی کنید."
            );
        }

        [M[k], M[pivot]] = [M[pivot], M[k]];
        const divisor = M[k][k];

        for (let j = k; j <= n; j++) M[k][j] /= divisor;

        for (let i = 0; i < n; i++) {
            if (i === k) continue;
            const factor = M[i][k];
            for (let j = k; j <= n; j++) {
                M[i][j] -= factor * M[k][j];
            }
        }
    }

    return M.map(row => row[n]);
}

function elementStiffness(E, A, I, L) {
    const EA = E * A / L;
    const EI = E * I;
    const a = 12 * EI / Math.pow(L, 3);
    const b = 6 * EI / Math.pow(L, 2);
    const c = 4 * EI / L;
    const d = 2 * EI / L;

    return [
        [EA, 0, 0, -EA, 0, 0],
        [0, a, b, 0, -a, b],
        [0, b, c, 0, -b, d],
        [-EA, 0, 0, EA, 0, 0],
        [0, -a, -b, 0, a, -b],
        [0, -b, d, 0, b, c]
    ];
}

function transformation(c, s) {
    return [
        [c, s, 0, 0, 0, 0],
        [-s, c, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, c, s, 0],
        [0, 0, 0, -s, c, 0],
        [0, 0, 0, 0, 0, 1]
    ];
}

function elementLoad(qx, qy, L) {
    return [
        qx * L / 2,
        qy * L / 2,
        qy * L * L / 12,
        qx * L / 2,
        qy * L / 2,
        -qy * L * L / 12
    ];
}

function addVector(target, indices, values) {
    indices.forEach((index, i) => {
        target[index] += values[i];
    });
}

function addMatrix(target, indices, values) {
    for (let i = 0; i < indices.length; i++) {
        for (let j = 0; j < indices.length; j++) {
            target[indices[i]][indices[j]] += values[i][j];
        }
    }
}

function calculate() {
    const message = $("analysisMessage");

    try {
        if (!window.SteelProject || !window.SteelSections) {
            throw new Error(
                "ماژول پروژه یا مشخصات مقاطع بارگذاری نشده است."
            );
        }

        const projectError = window.SteelProject.validate();
        if (projectError) throw new Error(projectError);

        if (!window.SteelSections.validateForFrameAnalysis()) {
            throw new Error(
                "ابتدا مشخصات مصالح و مقاطع را کامل و کنترل کنید."
            );
        }

        if (window.SteelLoads) {
            const loadError = window.SteelLoads.validate();
            if (loadError) throw new Error(loadError);
        }

        const span = number("span");
        const height = number("height");
        const rise = number("rise");
        const spacing = number("spacing");

        if (span <= 0 || height <= 0 || spacing <= 0 || rise < 0) {
            throw new Error("ابعاد هندسی قاب معتبر نیستند.");
        }

        const loads = window.SteelLoads
            ? window.SteelLoads.getData()
            : {
                deadLeft: number("dead"),
                deadRight: number("dead"),
                liveLeft: number("live"),
                liveRight: number("live"),
                snowLeft: number("snow"),
                snowRight: number("snow"),
                windWall: 0,
                windDirection: "left-to-right",
                windLeft: 0,
                windRight: 0
            };

        const leftRoofPressure =
            loads.deadLeft + loads.liveLeft + loads.snowLeft;

        const rightRoofPressure =
            loads.deadRight + loads.liveRight + loads.snowRight;

        const windRoofLeft = Number(loads.windLeft) || 0;
        const windRoofRight = Number(loads.windRight) || 0;

        const connection = window.SteelProject.getBaseConnection();
        const section = window.SteelSections.getDataSI();

        const E = section.material.E;
        const column = section.column;
        const rafter = section.rafter;

        if (!(E > 0 && column.A > 0 && column.Ix > 0 &&
            rafter.A > 0 && rafter.Ix > 0)) {
            throw new Error("مشخصات مقاطع معتبر نیستند.");
        }

        // پیش‌آمدگی جانبی سقف: ۸۰ سانتی‌متر در امتداد شیب در هر طرف
        const sideOverhang = 0.80;
        const halfSpan = span / 2;
        const baseSlopeLength = Math.hypot(halfSpan, rise);
        const slopeCos = halfSpan / baseSlopeLength;
        const slopeSin = rise / baseSlopeLength;

        const nodes = [
            [0, 0],
            [0, height],
            [span / 2, height + rise],
            [span, height],
            [span, 0],
            [-sideOverhang * slopeCos, height - sideOverhang * slopeSin],
            [span + sideOverhang * slopeCos, height - sideOverhang * slopeSin]
        ];

        const definitions = [
            { start: 0, end: 1, section: column, type: "ستون چپ" },
            { start: 5, end: 1, section: rafter, type: "کنسول رفتر چپ", isRafter: true },
            { start: 1, end: 2, section: rafter, type: "رفتر چپ", isRafter: true },
            { start: 2, end: 3, section: rafter, type: "رفتر راست", isRafter: true },
            { start: 3, end: 6, section: rafter, type: "کنسول رفتر راست", isRafter: true },
            { start: 3, end: 4, section: column, type: "ستون راست" }
        ];

        const dofCount = nodes.length * 3;
        const K = matrix(dofCount, dofCount);
        const F = Array(dofCount).fill(0);
        const elements = [];

        const windSign =
            loads.windDirection === "right-to-left" ? -1 : 1;

        const wallWindLineLoad =
            (Number(loads.windWall) || 0) *
            spacing * 1000 * windSign;

        const roofWindLeftLine = windRoofLeft * spacing * 1000;
        const roofWindRightLine = windRoofRight * spacing * 1000;

        for (const definition of definitions) {
            const p1 = nodes[definition.start];
            const p2 = nodes[definition.end];

            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];

            const L = Math.hypot(dx, dy);
            const c = dx / L;
            const s = dy / L;

            const A = definition.section.A;
            const I = definition.section.Ix;

            const kl = elementStiffness(E, A, I, L);
            const T = transformation(c, s);

            const kg = multiply(
                transpose(T),
                multiply(kl, T)
            );

            const indices = [];
            for (const node of [definition.start, definition.end]) {
                indices.push(node * 3, node * 3 + 1, node * 3 + 2);
            }

            addMatrix(K, indices, kg);

            let qGlobalX = 0;
            let qGlobalY = 0;

            if (definition.isRafter && definition.type.includes("چپ")) {
                qGlobalY = -leftRoofPressure * spacing * c * 1000;
            }

            if (definition.isRafter && definition.type.includes("راست")) {
                qGlobalY = -rightRoofPressure * spacing * c * 1000;
            }

            if (
                definition.type === "ستون چپ" ||
                definition.type === "ستون راست"
            ) {
                qGlobalX = wallWindLineLoad;
            }

            const qLocalX = qGlobalX * c + qGlobalY * s;

            let qLocalY = -qGlobalX * s + qGlobalY * c;

            if (definition.isRafter && definition.type.includes("چپ")) {
                qLocalY -= roofWindLeftLine;
            }

            if (definition.isRafter && definition.type.includes("راست")) {
                qLocalY -= roofWindRightLine;
            }

            const fl = elementLoad(qLocalX, qLocalY, L);

            const fg = multiply(
                transpose(T),
                fl.map(value => [value])
            ).map(row => row[0]);

            addVector(F, indices, fg);

            elements.push({
                definition,
                indices,
                kl,
                T,
                L,
                c,
                s,
                fl
            });
        }

        const restrained = new Set([0, 1, 12, 13]);

        if (connection === "fixed") {
            restrained.add(2);
            restrained.add(14);
        }

        const free = [];
        for (let i = 0; i < dofCount; i++) {
            if (!restrained.has(i)) free.push(i);
        }

        const Kff = free.map(i => free.map(j => K[i][j]));
        const Ff = free.map(i => F[i]);
        const displacementFree = solveLinearSystem(Kff, Ff);

        const D = Array(dofCount).fill(0);
        free.forEach((index, i) => {
            D[index] = displacementFree[i];
        });

        const KD = K.map(row =>
            row.reduce((sum, value, j) => sum + value * D[j], 0)
        );

        const R = KD.map((value, i) => value - F[i]);

        let maxDisplacement = 0;
        let maxNode = 0;

        nodes.forEach((_, i) => {
            const ux = D[i * 3];
            const uy = D[i * 3 + 1];
            const value = Math.hypot(ux, uy);

            if (value > maxDisplacement) {
                maxDisplacement = value;
                maxNode = i;
            }
        });

        const memberResults = [];

        for (const element of elements) {
            const dg = element.indices.map(i => D[i]);

            const dl = multiply(
                element.T,
                dg.map(value => [value])
            ).map(row => row[0]);

            const internal = multiply(
                element.kl,
                dl.map(value => [value])
            ).map(row => row[0]);

            const endForces = internal.map(
                (value, i) => value - element.fl[i]
            );

            const maxMoment = Math.max(
                Math.abs(endForces[2]),
                Math.abs(endForces[5])
            );

            // بارهای محلی عضو بر حسب kN/m
            // قرارداد علامت: کشش مثبت و فشار منفی
            const localLoadX =
                -(2 * element.fl[0] / element.L) / 1000;

            const localLoadY =
                (2 * element.fl[1] / element.L) / 1000;

            const isLeftCantilever = element.definition.type === "کنسول رفتر چپ";
            const isRightCantilever = element.definition.type === "کنسول رفتر راست";
            let tipRelativeDeflection = null;

            // خیز نسبی نوک کنسول نسبت به مماسِ دوران‌یافته در تکیه‌گاه
            // خروجی در راستای محلی عمود بر محور رفتر و بر حسب متر است.
            if (isLeftCantilever) {
                tipRelativeDeflection =
                    dl[1] - dl[4] + dl[5] * element.L;
            } else if (isRightCantilever) {
                tipRelativeDeflection =
                    dl[4] - dl[1] - dl[2] * element.L;
            }

            memberResults.push({
                name: element.definition.type,
                length: element.L,
                localLoadX,
                localLoadY,

                // فشار منفی و کشش مثبت
                axialStart: -endForces[0] / 1000,
                axialEnd: endForces[3] / 1000,

                shearStart: endForces[1] / 1000,
                momentStart: endForces[2] / 1e6,

                shearEnd: endForces[4] / 1000,
                momentEnd: endForces[5] / 1e6,

                maxMoment: maxMoment / 1e6,
                tipRelativeDeflection
            });
        }

        const leftReaction = {
            H: R[0] / 1000,
            V: R[1] / 1000,
            M: R[2] / 1e6
        };

        const rightReaction = {
            H: R[12] / 1000,
            V: R[13] / 1000,
            M: R[14] / 1e6
        };

        const maxMoment = Math.max(
            ...memberResults.map(item => item.maxMoment)
        );

        const maxAxial = Math.max(
            ...memberResults.flatMap(item => [
                Math.abs(item.axialStart),
                Math.abs(item.axialEnd)
            ])
        );

        $("displacement").textContent =
            fmt(maxDisplacement * 1000) + " mm";

        $("reaction").textContent =
            fmt(leftReaction.V) + " / " +
            fmt(rightReaction.V) + " kN";

        $("memberCount").textContent = String(definitions.length);

        const connectionText =
            connection === "fixed" ? "گیردار" : "مفصلی";

        const windDirectionText =
            windSign > 0 ? "از چپ به راست" : "از راست به چپ";

        if (message) {
            message.innerHTML = `
                <h4>نتایج تحلیل خطی قاب دوبعدی</h4>
                <p><b>نوع تکیه‌گاه:</b> ${connectionText}</p>
                <p><b>روش تحلیل:</b> روش سختی مستقیم</p>
                <p><b>تعداد گره‌ها:</b> ${nodes.length}</p>
                <p><b>تعداد اعضا:</b> ${definitions.length}</p>
                <p><b>پیش‌آمدگی جانبی رفتر:</b> ${fmt(sideOverhang)} متر در هر طرف، در امتداد شیب</p>
                <hr>
                <h4>بارهای اعمال‌شده</h4>
                <p>بار ثقلی سقف چپ: ${fmt(leftRoofPressure)} kN/m²</p>
                <p>بار ثقلی سقف راست: ${fmt(rightRoofPressure)} kN/m²</p>
                <p>باد سقف چپ: ${fmt(windRoofLeft)} kN/m²</p>
                <p>باد سقف راست: ${fmt(windRoofRight)} kN/m²</p>
                <p>نوع اثر باد سقف: مثبت = فشار به داخل، منفی = مکش به خارج</p>
                <p>بار باد دیوار: ${fmt(Math.abs(Number(loads.windWall) || 0))} kN/m²</p>
                <p>جهت باد دیوار: ${windDirectionText}</p>
                <p>بار خطی افقی وارد بر هر ستون: ${fmt(wallWindLineLoad / 1000)} kN/m</p>
                <hr>
                <p><b>بیشینه جابه‌جایی گره‌ای:</b> ${fmt(maxDisplacement * 1000)} میلی‌متر</p>
                <p><b>شماره گره دارای بیشینه جابه‌جایی:</b> ${maxNode + 1}</p>
                <p><b>بیشینه نیروی محوری انتهایی:</b> ${fmt(maxAxial)} kN</p>
                <p><b>بیشینه لنگر انتهایی اعضا:</b> ${fmt(maxMoment)} kN.m</p>
                <hr>
                <h4>واکنش تکیه‌گاه چپ</h4>
                <p>افقی: ${fmt(leftReaction.H)} kN</p>
                <p>قائم: ${fmt(leftReaction.V)} kN</p>
                <p>لنگر: ${fmt(leftReaction.M)} kN.m</p>
                <h4>واکنش تکیه‌گاه راست</h4>
                <p>افقی: ${fmt(rightReaction.H)} kN</p>
                <p>قائم: ${fmt(rightReaction.V)} kN</p>
                <p>لنگر: ${fmt(rightReaction.M)} kN.m</p>
                <hr>
                <h4>نیروهای انتهایی اعضا</h4>
                ${memberResults.map(item => `
                    <div class="notice">
                        <b>${item.name}</b>
                        <p>محوری ابتدا: ${fmt(item.axialStart)} kN</p>
                        <p>محوری انتها: ${fmt(item.axialEnd)} kN</p>
                        <p>لنگر ابتدا: ${fmt(item.momentStart)} kN.m</p>
                        <p>لنگر انتها: ${fmt(item.momentEnd)} kN.m</p>
                    </div>
                `).join("")}
                <hr>
                <div class="notice">
                    <b>مواردی که هنوز در این تحلیل وارد نشده‌اند:</b>
                    <p>۱. پیش‌آمدگی طولی ابتدا و انتهای سوله در این قاب دوبعدی مدل نشده است</p>
                    <p>۲. باد دیوارهای جلو و عقب و تحلیل طولی سوله</p>
                    <p>۳. ترکیبات بار آیین‌نامه‌ای و ضرایب بار</p>
                    <p>۴. تحلیل مرتبه دوم، اثر P-Delta و کمانش</p>
                    <p>۵. کنترل مقاومت اعضا، تغییرشکل مجاز و اتصالات کنسول</p>
                </div>
                <p style="color:#b45309">
                    هشدار: این خروجی تحلیل خطی اولیه است و به‌تنهایی
                    برای طراحی اجرایی یا تأیید ایمنی سازه کافی نیست.
                </p>
            `;
        }

        window.SteelAnalysis.lastResult = {
            nodes,
            displacements: D,
            reactions: R,
            members: memberResults,
            connection,
            maxDisplacement,
            maxMoment,
            maxAxial,
            appliedLoads: {
                leftRoofPressure,
                rightRoofPressure,
                windRoofLeft,
                windRoofRight,
                roofWindLeftLine,
                roofWindRightLine,
                wallWindLineLoad,
                windDirection: loads.windDirection
            }
        };

        window.SteelProject.setStatus(
            "تحلیل خطی قاب با بار ثقلی، باد سقف و باد دیوار انجام شد."
        );

        return {
            success: true,
            maxDisplacement,
            reactions: R,
            members: memberResults
        };

    } catch (error) {
        if (message) {
            message.textContent = "خطا در تحلیل: " + error.message;
        }

        if (window.SteelProject) {
            window.SteelProject.setStatus(
                "خطا در تحلیل: " + error.message
            );
        }

        return {
            success: false,
            error: error.message
        };
    }
}

window.SteelAnalysis = { calculate };

})();

