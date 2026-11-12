/* SAHROUD STEEL — foundation reaction takeoff
 * Extracts support actions from the latest 3D analysis and calculates only user-dimensioned
 * preliminary quantities. It does NOT design footings, reinforcement, anchors or soil bearing.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const keys=["footingWidthM","footingLengthM","footingThicknessM","pedestalWidthM","pedestalLengthM","pedestalHeightM","columnOffsetXM","columnOffsetZM","excavationDepthM","workingSpaceM","anchorsPerBase","tieCount","tieTotalLengthM","tieWidthM","tieHeightM","tieRebarKgPerM","soilAllowableKPa","concreteUnitWeightKNm3","soilUnitWeightKNm3","soilCoverDepthM","slidingFrictionMu","bottomBarDiaXmm","bottomBarSpacingXmm","bottomBarDiaZmm","bottomBarSpacingZmm","topBarDiaXmm","topBarSpacingXmm","topBarDiaZmm","topBarSpacingZmm","pedestalLongBarDiaMm","pedestalLongBarsPerBase","pedestalLongBarCutLengthM","pedestalTieBarDiaMm","pedestalTiesPerBase","pedestalTieCutLengthM","rebarCoverMm"];
 const state={footingWidthM:"",footingLengthM:"",footingThicknessM:"",pedestalWidthM:"",pedestalLengthM:"",pedestalHeightM:"",columnOffsetXM:"",columnOffsetZM:"",excavationDepthM:"",workingSpaceM:"",anchorsPerBase:"",tieCount:"",tieTotalLengthM:"",tieWidthM:"0.60",tieHeightM:"0.50",tieRebarKgPerM:"",soilAllowableKPa:"",concreteUnitWeightKNm3:"",soilUnitWeightKNm3:"",soilCoverDepthM:"",slidingFrictionMu:"",bottomBarDiaXmm:"",bottomBarSpacingXmm:"",bottomBarDiaZmm:"",bottomBarSpacingZmm:"",topBarDiaXmm:"",topBarSpacingXmm:"",topBarDiaZmm:"",topBarSpacingZmm:"",pedestalLongBarDiaMm:"",pedestalLongBarsPerBase:"",pedestalLongBarCutLengthM:"",pedestalTieBarDiaMm:"",pedestalTiesPerBase:"",pedestalTieCutLengthM:"",rebarCoverMm:""};
 const map={footingWidthM:"ftWidth",footingLengthM:"ftLength",footingThicknessM:"ftThickness",pedestalWidthM:"ftPedWidth",pedestalLengthM:"ftPedLength",pedestalHeightM:"ftPedHeight",columnOffsetXM:"ftColumnOffsetX",columnOffsetZM:"ftColumnOffsetZ",excavationDepthM:"ftExcDepth",workingSpaceM:"ftWorking",anchorsPerBase:"ftAnchors",tieCount:"ftTieCount",tieTotalLengthM:"ftTieLength",tieWidthM:"ftTieWidth",tieHeightM:"ftTieHeight",tieRebarKgPerM:"ftTieRebar",soilAllowableKPa:"ftSoilAllow",concreteUnitWeightKNm3:"ftConcreteGamma",soilUnitWeightKNm3:"ftSoilGamma",soilCoverDepthM:"ftSoilCover",slidingFrictionMu:"ftSlidingMu",bottomBarDiaXmm:"ftBarDiaX",bottomBarSpacingXmm:"ftBarSpacingX",bottomBarDiaZmm:"ftBarDiaZ",bottomBarSpacingZmm:"ftBarSpacingZ",topBarDiaXmm:"ftTopBarDiaX",topBarSpacingXmm:"ftTopBarSpacingX",topBarDiaZmm:"ftTopBarDiaZ",topBarSpacingZmm:"ftTopBarSpacingZ",pedestalLongBarDiaMm:"ftPedLongDia",pedestalLongBarsPerBase:"ftPedLongCount",pedestalLongBarCutLengthM:"ftPedLongLength",pedestalTieBarDiaMm:"ftPedTieDia",pedestalTiesPerBase:"ftPedTieCount",pedestalTieCutLengthM:"ftPedTieLength",rebarCoverMm:"ftRebarCover"};
 const fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:3});
 const num=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
 const signedNum=x=>{if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(x);return Number.isFinite(n)?n:null;};
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
   '<div class="field"><label for="ftColumnOffsetX">جابه‌جایی محور ستون از مرکز پی در X (متر؛ مثبت به سمت +X)</label><input id="ftColumnOffsetX" type="number" step="0.01" placeholder="اگر وسط است، صفر وارد کنید"></div>'+
   '<div class="field"><label for="ftColumnOffsetZ">جابه‌جایی محور ستون از مرکز پی در Z (متر؛ مثبت به سمت +Z)</label><input id="ftColumnOffsetZ" type="number" step="0.01" placeholder="اگر وسط است، صفر وارد کنید"></div>'+
   '<div class="field"><label for="ftExcDepth">عمق خاکبرداری (متر)</label><input id="ftExcDepth" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftWorking">فضای کار خاکبرداری هر طرف (متر)</label><input id="ftWorking" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftAnchors">تعداد بولت در هر پایه</label><input id="ftAnchors" type="number" min="0" step="1"></div>'+
   '<div class="notice">متره شناژهای رابط — مقادیر را از نقشه فونداسیون وارد کنید؛ نرم‌افزار مسیر شناژ را حدس نمی‌زند.</div>'+
   '<div class="field"><label for="ftTieCount">تعداد شناژها</label><input id="ftTieCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="ftTieLength">مجموع طول شناژها (متر)</label><input id="ftTieLength" type="number" min="0" step="0.1" placeholder="جمع طول محور یا طول اجرایی"></div>'+
   '<div class="field"><label for="ftTieWidth">عرض شناژ (متر)</label><input id="ftTieWidth" type="number" min="0" step="0.05" value="0.60"></div>'+
   '<div class="field"><label for="ftTieHeight">ارتفاع شناژ (متر)</label><input id="ftTieHeight" type="number" min="0" step="0.05" value="0.50"></div>'+
   '<div class="field"><label for="ftTieRebar">وزن آرماتور شناژ (کیلوگرم بر متر؛ اختیاری)</label><input id="ftTieRebar" type="number" min="0" step="0.1" placeholder="از جدول آرماتوربندی"></div></div>'+'<h4>ورودی‌های ژئوتکنیک و وزن‌های مؤثر برای غربال فشار زیر پی</h4><div class="notice">این مقادیر باید از گزارش مکانیک خاک و مشخصات مصالح برداشته شوند. فشار مجاز واردشده باید از نظر gross/net بودن روشن باشد؛ فعلاً فقط فشار مجاز ناخالص قابل مقایسه است. وزن پی و خاک روی پی فقط با ورودی‌های زیر افزوده می‌شود.</div><div class="form-grid">'+'<div class="field"><label for="ftSoilAllow">ظرفیت باربری مجاز ناخالص خاک (kPa)</label><input id="ftSoilAllow" type="number" min="0" step="1" placeholder="از گزارش ژئوتکنیک؛ نه حدس"></div>'+'<div class="field"><label for="ftConcreteGamma">وزن مخصوص بتن (kN/m³)</label><input id="ftConcreteGamma" type="number" min="0" step="0.1" placeholder="طبق مشخصات پروژه"></div>'+'<div class="field"><label for="ftSoilGamma">وزن مخصوص خاک روی پی (kN/m³)</label><input id="ftSoilGamma" type="number" min="0" step="0.1" placeholder="در صورت وجود خاک پوششی"></div>'+'<div class="field"><label for="ftSoilCover">ضخامت خاک پوششی روی پی (متر)</label><input id="ftSoilCover" type="number" min="0" step="0.05" placeholder="از ترازهای واقعی"></div></div><div class="field"><label for="ftSlidingMu">ضریب اصطکاک خاک و بتن (μ)</label><input id="ftSlidingMu" type="number" min="0" step="0.01" placeholder="فقط از گزارش ژئوتکنیک"></div></div><h4>متره شبکه آرماتور تحتانی پی (بر اساس نقشه اجرایی)</h4><div class="notice">این بخش فقط تعداد، طول برش مستقیم و وزن تقریبی میلگردهای شبکه تحتانی را از قطر، فاصله و پوشش واردشده محاسبه می‌کند. قلاب، وصله، خم، تقویت موضعی، شبکه فوقانی و آرماتور پدستال منظور نشده‌اند؛ این محاسبه طراحی آرماتور نیست.</div><div class="form-grid"><div class="field"><label for="ftBarDiaX">قطر میلگردهای موازی X (mm)</label><input id="ftBarDiaX" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftBarSpacingX">فاصله میلگردهای موازی X (mm)</label><input id="ftBarSpacingX" type="number" min="0" step="5" placeholder="طبق نقشه"></div><div class="field"><label for="ftBarDiaZ">قطر میلگردهای موازی Z (mm)</label><input id="ftBarDiaZ" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftBarSpacingZ">فاصله میلگردهای موازی Z (mm)</label><input id="ftBarSpacingZ" type="number" min="0" step="5" placeholder="طبق نقشه"></div><div class="field"><label for="ftRebarCover">پوشش بتن تا سطح خارجی میلگرد (mm)</label><input id="ftRebarCover" type="number" min="0" step="5" placeholder="طبق نقشه و شرایط محیطی"></div></div><h4>متره شبکه آرماتور فوقانی پی</h4><div class="notice">ورودی‌های شبکه فوقانی مستقل‌اند؛ فقط در صورت وجود در نقشه اجرایی وارد کنید. اگر شبکه فوقانی وجود ندارد، این چهار ورودی را خالی بگذارید.</div><div class="form-grid"><div class="field"><label for="ftTopBarDiaX">قطر میلگردهای فوقانی موازی X (mm)</label><input id="ftTopBarDiaX" type="number" min="0" step="1" placeholder="طبق نقشه؛ در صورت عدم وجود خالی"></div><div class="field"><label for="ftTopBarSpacingX">فاصله میلگردهای فوقانی موازی X (mm)</label><input id="ftTopBarSpacingX" type="number" min="0" step="5" placeholder="طبق نقشه"></div><div class="field"><label for="ftTopBarDiaZ">قطر میلگردهای فوقانی موازی Z (mm)</label><input id="ftTopBarDiaZ" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftTopBarSpacingZ">فاصله میلگردهای فوقانی موازی Z (mm)</label><input id="ftTopBarSpacingZ" type="number" min="0" step="5" placeholder="طبق نقشه"></div></div><h4>متره آرماتور پدستال و خاموت‌ها</h4><div class="notice">تعداد و طول برش را از نقشه اجرایی یا جدول خم و برش وارد کنید. نرم‌افزار طول مهاری، قلاب، خم، وصله یا تعداد خاموت را حدس نمی‌زند. تعدادها برای هر پدستال هستند.</div><div class="form-grid"><div class="field"><label for="ftPedLongDia">قطر میلگرد طولی پدستال (mm)</label><input id="ftPedLongDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedLongCount">تعداد میلگرد طولی در هر پدستال</label><input id="ftPedLongCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedLongLength">طول برش هر میلگرد طولی (m)</label><input id="ftPedLongLength" type="number" min="0" step="0.01" placeholder="از جدول خم و برش"></div><div class="field"><label for="ftPedTieDia">قطر خاموت پدستال (mm)</label><input id="ftPedTieDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedTieCount">تعداد خاموت در هر پدستال</label><input id="ftPedTieCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedTieLength">طول برش هر خاموت (m)</label><input id="ftPedTieLength" type="number" min="0" step="0.01" placeholder="از جدول خم و برش"></div></div><div id="foundationPedestalRebarSummary" class="notice">برای متره پدستال، مشخصات واقعی نقشه را وارد کنید.</div><div id="foundationRebarSummary" class="notice">برای متره آرماتور، قطر، فاصله و پوشش واقعی را وارد کنید.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:680px"><thead><tr><th>لایه</th><th>جهت میلگرد</th><th>تعداد در هر پی</th><th>طول هر شاخه (m)</th><th>طول کل (m)</th><th>وزن تقریبی (kg)</th></tr></thead><tbody id="foundationRebarRows"></tbody></table></div><h4>غربال مقدماتی لغزش پی منفرد</h4><div class="notice">ضریب اصطکاک باید از گزارش ژئوتکنیک/مشخصات تماس گرفته شود؛ مقدار پیش‌فرض نداریم. کنترل زیر فقط اصطکاک پایه پی منفرد را می‌سنجد و اثر چسبندگی، فشار جانبی خاک، شناژها، شمع، کلید برشی، آب زیرزمینی و ضرایب اطمینان آیین‌نامه‌ای را لحاظ نمی‌کند.</div><div id="foundationSlidingSummary" class="notice">برای غربال لغزش، ضریب اصطکاک معتبر و ابعاد پی لازم است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:700px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>H (kN)</th><th>N مؤثر (kN)</th><th>μN (kN)</th><th>μN/H</th><th>نتیجه</th></tr></thead><tbody id="foundationSlidingRows"></tbody></table></div>'+'<h4>غربال مقدماتی بالاکشیدگی و نیاز احتمالی به مهار کششی</h4><div class="notice">این بخش فقط تقاضای کششی قائم را با وزن ثقلی پی و خاک پوششی مقایسه می‌کند. ظرفیت بولت، صفحه‌ستون و مهار بتن محاسبه نمی‌شود؛ نتیجه مثبت به‌هیچ‌وجه تأیید طراحی انکر نیست.</div><div id="foundationUpliftSummary" class="notice">پس از ورود ابعاد واقعی پی و وزن مخصوص مصالح، غربال انجام می‌شود.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>تقاضای بالاکشیدگی (kN)</th><th>وزن پی و خاک (kN)</th><th>کسری ثقلی (kN)</th><th>نسبت تقاضا/وزن</th><th>نتیجه</th></tr></thead><tbody id="foundationUpliftRows"></tbody></table></div>'+'<div id="foundationBearingSummary" class="notice">پس از ورود داده‌های ژئوتکنیک و ابعاد واقعی، غربال فشار انجام می‌شود.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:780px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>N (kN)</th><th>eX / eZ (m)</th><th>qmin (kPa)</th><th>qmax (kPa)</th><th>نتیجه غربال</th></tr></thead><tbody id="foundationBearingRows"></tbody></table></div>'+
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
 function selfTest(){
  const bases=[{nodeId:"B1",x:0,y:0,z:0}],specs=[{layer:"bottom",direction:"X",diaMm:16,spacingMm:200},{layer:"bottom",direction:"Z",diaMm:16,spacingMm:200},{layer:"top",direction:"X",diaMm:14,spacingMm:200},{layer:"top",direction:"Z",diaMm:14,spacingMm:200}];
  const g=buildFootingRebarGeometry(bases,2,2,0.5,50,specs);
  const checks={fourGridLayers:g.ok&&g.count>0&&new Set(g.bars.map(x=>x.layer+"-"+x.direction)).size===4,bottomTopElevation:g.ok&&g.bars.some(x=>x.layer==="bottom"&&x.a.y<0.1)&&g.bars.some(x=>x.layer==="top"&&x.a.y>0.4),gridBarsStayInsideFootprint:g.ok&&g.bars.every(x=>Math.abs(x.a.x)<=1&&Math.abs(x.a.z)<=1&&Math.abs(x.b.x)<=1&&Math.abs(x.b.z)<=1)};
  return{passed:Object.values(checks).every(Boolean),checks,barCount:g.count,assumptions:g.assumptions};
}
function checkTieBeamRebarClearance(tieBars,requiredClearanceMm=0){
  readInputs();
  if(!lastReport?.rows?.length)return{ok:false,reason:"ابتدا واکنش‌های پی یا پوش واکنش را استخراج کنید تا مختصات پایه‌ها مشخص شود."};
  const B=num(state.footingWidthM),L=num(state.footingLengthM),T=num(state.footingThicknessM),cover=signedNum(state.rebarCoverMm);
  if(!B||!L||!T||cover===null)return{ok:false,reason:"عرض، طول، ضخامت پی و پوشش بتن را از نقشه وارد کنید؛ مقدار فرضی استفاده نمی‌شود."};
  const specs=footingGridSpecs(state);
  if(!specs.length)return{ok:false,reason:"قطر و فاصله حداقل یک شبکه میلگرد پی را در ورودی‌های آرماتور وارد کنید."};
  const grid=buildFootingRebarGeometry(lastReport.rows,B,L,T,cover,specs);
  if(!grid.ok)return grid;
  const checker=window.SteelTieBeamReinforcement?.checkFootingBarClearance;
  if(typeof checker!=="function")return{ok:false,reason:"ماژول کنترل سه‌بعدی میلگرد شناژ بارگذاری نشده است."};
  const result=checker(tieBars,grid.bars,requiredClearanceMm);
  return{...result,footingGridBarCount:grid.count,baseCount:grid.baseCount,gridAssumptions:grid.assumptions};
}
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
   return {nodeId:n.id,x:Number(n.x)||0,y:Number(n.y),z:Number(n.z)||0,kind:n.kind,hasReaction:!!r,values:r?(r.values||[]).slice(0,6).map(v=>Number(v)||0):[0,0,0,0,0,0]};
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
 function screenBearing(q){
  const box=$("foundationBearingSummary"),body=$("foundationBearingRows");
  if(body)body.replaceChildren();
  if(!lastReport||!Array.isArray(lastReport.rows)||!lastReport.rows.length){if(box)box.textContent="ابتدا پوش واکنش را استخراج کنید.";return null;}
  const B=num(state.footingWidthM),L=num(state.footingLengthM),t=num(state.footingThicknessM);
  const allow=num(state.soilAllowableKPa),gammaC=num(state.concreteUnitWeightKNm3);
  const offsetX=signedNum(state.columnOffsetXM),offsetZ=signedNum(state.columnOffsetZM);
  const cover=state.soilCoverDepthM===""?0:Number(state.soilCoverDepthM);
  const gammaS=cover>0?num(state.soilUnitWeightKNm3):0;
  if(!B||!L||!t||!allow||!gammaC||offsetX===null||offsetZ===null||cover<0||!Number.isFinite(cover)||(cover>0&&!gammaS)){
   if(box)box.textContent="برای غربال فشار زیر پی، ابعاد پی، فشار مجاز ناخالص، وزن مخصوص بتن و مختصات محور ستون نسبت به مرکز پی در هر دو راستای X و Z را وارد کنید؛ اگر ستون دقیقاً وسط است، صفر وارد کنید. در صورت وجود خاک پوششی، وزن مخصوص آن نیز لازم است.";
   return null;
  }
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM);
  const pedComplete=!!(pw&&pl&&ph);
  if((pw||pl||ph)&&!pedComplete){if(box)box.textContent="ابعاد پدستال ناقص است؛ هر سه بعد را وارد کنید یا هر سه را خالی بگذارید.";return null;}
  if(pw>B||pl>L){if(box)box.textContent="ابعاد پدستال از ابعاد پی بزرگ‌تر است؛ ورودی‌ها را اصلاح کنید.";return null;}
  if(Math.abs(offsetX)+(pedComplete?pw:0)/2>B/2+1e-9||Math.abs(offsetZ)+(pedComplete?pl:0)/2>L/2+1e-9){if(box)box.textContent="محور ستون/ابعاد پدستال از محدوده پی خارج می‌شود؛ ابعاد و جابه‌جایی‌ها را بررسی کنید.";return null;}
  const pedestalWeight=pedComplete?gammaC*pw*pl*ph:0,concreteWeight=gammaC*B*L*t+pedestalWeight;
  const soilWeight=cover>0?gammaS*Math.max(0,B*L-(pedComplete?pw*pl:0))*cover:0;
  const permanentWeight=concreteWeight+soilWeight,area=B*L;
  const cases=[];
  lastReport.rows.forEach(row=>{
   const source=Array.isArray(row.caseReactions)&&row.caseReactions.length?row.caseReactions:[{label:lastReport.loadCase,values:row.values||[]}];
   source.forEach(item=>{
    const v=item.values||[],N=Number(v[1])/1000,MxBase=Number(v[3])/1e6,MzBase=Number(v[5])/1e6,Mx=MxBase-offsetZ*(N+pedestalWeight),Mz=MzBase+offsetX*(N+pedestalWeight);
    if(![N,Mx,Mz].every(Number.isFinite))return;
    const totalN=N+permanentWeight;
    let status="",qmin=null,qmax=null,eX=null,eZ=null;
    if(totalN<=0){status="کشش/بالاکشیدگی؛ فشار فشاری قابل محاسبه نیست";}
    else{
     eX=Math.abs(Mz)/totalN;eZ=Math.abs(Mx)/totalN;
     const bending=6*Math.abs(Mx)/(B*L*L)+6*Math.abs(Mz)/(L*B*B);
     qmin=totalN/area-bending;qmax=totalN/area+bending;
     const kern=eX<=B/6+1e-9&&eZ<=L/6+1e-9;
     if(qmin<0||!kern)status="تماس کامل برقرار نیست؛ تحلیل تماس جزئی/غیرخطی لازم است";
     else if(qmax>allow)status="فشار بیشینه از ظرفیت مجاز واردشده بیشتر است";
     else status="غربال اولیه: فشار در محدوده مجاز واردشده";
    }
    const record={nodeId:row.nodeId,label:item.label,NkN:N,totalNkN:totalN,baseMxKNm:MxBase,baseMzKNm:MzBase,offsetXFromFootingCenterM:offsetX,offsetZFromFootingCenterM:offsetZ,effectiveMxKNm:Mx,effectiveMzKNm:Mz,eXM:eX,eZM:eZ,qminKPa:qmin,qmaxKPa:qmax,allowableKPa:allow,status,concreteWeightKN:concreteWeight,soilCoverWeightKN:soilWeight};
    cases.push(record);
    if(body){const tr=document.createElement("tr");[record.nodeId,record.label,fmt(N),eX===null?"—":fmt(eX)+" / "+fmt(eZ),qmin===null?"—":fmt(qmin),qmax===null?"—":fmt(qmax),status].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);}
   });
  });
  const failed=cases.filter(x=>x.status!=="غربال اولیه: فشار در محدوده مجاز واردشده").length;
  if(box)box.textContent="غربال فشار برای "+cases.length+" حالت-پایه انجام شد. وزن بتن پی/پدستال افزوده‌شده: "+fmt(concreteWeight)+" kN برای هر پی؛ خاک پوششی: "+fmt(soilWeight)+" kN برای هر پی. موارد نیازمند بررسی بیشتر: "+failed+". این نتیجه فقط کنترل فشار خطی با فرض پی مستطیلی صلب، تماس کامل و بار متمرکز در مرکز پدستال است؛ در صورت خروج از هسته، کشش خاک مجاز فرض نشده و نتیجه قبولی صادر نمی‌شود.";
  return {basis:"preliminary_gross_bearing_full_contact_with_column_offset",allowableKPa:allow,footing:{B,L,t},columnOffsetXM:offsetX,columnOffsetZM:offsetZ,concreteUnitWeightKNm3:gammaC,soilUnitWeightKNm3:gammaS||null,soilCoverDepthM:cover,concreteWeightPerFootingKN:concreteWeight,soilCoverWeightPerFootingKN:soilWeight,cases,limitations:["فقط واکنش‌های خطی موجود در پوش مقدماتی؛ ضرایب ترکیبات هنوز با آیین‌نامه رسمی تطبیق نهایی نشده‌اند.","اثر خروج از مرکز محور ستون در صفحه پی با مختصات واردشده و رابطه r×F فقط برای مؤلفه قائم Fy به لنگرهای Mx و Mz افزوده شده است؛ اثر ارتفاع انتقال نیرو، خروج از مرکز افقی نیروها و جزئیات واقعی صفحه‌ستون/پدستال کامل مدل نشده است.","پی به‌صورت مستطیلی صلب و فشار خاک خطی با تماس کامل فرض شده است.","در صورت qmin منفی یا خروج از هسته، تماس جزئی خاک، uplift و اندرکنش خاک-سازه تحلیل نشده و نتیجه قبولی صادر نمی‌شود.","وزن خاک پوششی فقط روی سطح خالص پی خارج از پدستال برآورد شده؛ سربار سطحی، آب زیرزمینی، شناژ، خاکبرداری، اثر زلزله و کنترل لغزش/واژگونی لحاظ نشده‌اند.","این غربال جایگزین طراحی ژئوتکنیکی و سازه‌ای فونداسیون نیست."]};
 }
 function screenSliding(){
  const box=$("foundationSlidingSummary"),body=$("foundationSlidingRows");
  if(body)body.replaceChildren();
  if(!lastReport||!Array.isArray(lastReport.rows)||!lastReport.rows.length){if(box)box.textContent="ابتدا پوش واکنش را استخراج کنید.";return null;}
  const B=num(state.footingWidthM),L=num(state.footingLengthM),t=num(state.footingThicknessM),gammaC=num(state.concreteUnitWeightKNm3),mu=num(state.slidingFrictionMu);
  const cover=state.soilCoverDepthM===""?0:Number(state.soilCoverDepthM),gammaS=cover>0?num(state.soilUnitWeightKNm3):0;
  if(!B||!L||!t||!gammaC||!mu||!Number.isFinite(cover)||cover<0||(cover>0&&!gammaS)){
   if(box)box.textContent="برای غربال لغزش، ابعاد پی، وزن مخصوص بتن، ضریب اصطکاک معتبر و در صورت وجود خاک پوششی، وزن مخصوص آن لازم است.";
   return null;
  }
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM),pedComplete=!!(pw&&pl&&ph);
  if((pw||pl||ph)&&!pedComplete){if(box)box.textContent="ابعاد پدستال ناقص است؛ هر سه بعد را وارد کنید یا هر سه را خالی بگذارید.";return null;}
  if(pw>B||pl>L){if(box)box.textContent="ابعاد پدستال از ابعاد پی بزرگ‌تر است.";return null;}
  const concrete=gammaC*(B*L*t+(pedComplete?pw*pl*ph:0));
  const soil=cover>0?gammaS*Math.max(0,B*L-(pedComplete?pw*pl:0))*cover:0;
  const added=concrete+soil,records=[];
  lastReport.rows.forEach(row=>{
   const cases=Array.isArray(row.caseReactions)&&row.caseReactions.length?row.caseReactions:[{label:lastReport.loadCase,values:row.values||[]}];
   cases.forEach(item=>{
    const v=item.values||[],fx=Number(v[0])/1000,fz=Number(v[2])/1000,fy=Number(v[1])/1000;
    if(![fx,fz,fy].every(Number.isFinite))return;
    const H=Math.hypot(fx,fz),N=fy+added,resistance=mu*Math.max(N,0),ratio=H>1e-9?resistance/H:null;
    let status;
    if(N<=0)status="نیروی قائم فشاری کافی وجود ندارد؛ لغزش قابل تأیید نیست";
    else if(H<=1e-9)status="در این حالت بار، نیروی افقی پایه ناچیز است";
    else if(resistance>=H)status="مقاومت اصطکاکی اسمی از تقاضا بیشتر است؛ کنترل آیین‌نامه‌ای باقی است";
    else status="تقاضای افقی از مقاومت اصطکاکی اسمی بیشتر است";
    const rec={nodeId:row.nodeId,label:item.label,HkN:H,NkN:N,mu,resistanceKN:resistance,resistanceDemandRatio:ratio,status};
    records.push(rec);
    if(body){const tr=document.createElement("tr");[rec.nodeId,rec.label,fmt(H),fmt(N),fmt(resistance),ratio===null?"—":fmt(ratio),status].forEach(x=>{const td=document.createElement("td");td.textContent=x;tr.appendChild(td);});body.appendChild(tr);}
   });
  });
  const fail=records.filter(x=>x.status.startsWith("تقاضای افقی")||x.status.startsWith("نیروی قائم")).length;
  if(box)box.textContent="غربال لغزش برای "+records.length+" حالت-پایه با μ="+fmt(mu)+" انجام شد؛ وزن بتن و خاک پوششی هر پی به‌صورت ساده افزوده شده است. موارد دارای هشدار/عدم کفایت اصطکاک اسمی: "+fail+". نسبت μN/H فقط نسبت اسمی مقاومت به تقاضاست و معیار قبولی آیین‌نامه‌ای یا ضریب اطمینان طراحی نیست.";
  return {basis:"preliminary_isolated_footing_base_friction_only",frictionCoefficient:mu,addedWeightPerFootingKN:added,cases:records,limitations:["کنترل فقط برای پی منفرد و اصطکاک کف پی؛ اثر شناژها و عملکرد گروهی پی‌ها منظور نشده است.","چسبندگی خاک، فشار جانبی، کلید برشی، شمع، آب زیرزمینی و اثرات هیدرواستاتیک لحاظ نشده‌اند.","ضریب اصطکاک باید مستند به گزارش ژئوتکنیک و شرایط تماس واقعی باشد.","هیچ ضریب اطمینان یا ترکیب بار نهایی آیین‌نامه‌ای اعمال نشده است؛ این نتیجه تأیید طراحی نیست."]};
 }
 function screenUplift(){
  const box=$("foundationUpliftSummary"),body=$("foundationUpliftRows");
  if(body)body.replaceChildren();
  if(!lastReport||!Array.isArray(lastReport.rows)||!lastReport.rows.length){if(box)box.textContent="ابتدا پوش واکنش را استخراج کنید.";return null;}
  const B=num(state.footingWidthM),L=num(state.footingLengthM),t=num(state.footingThicknessM),gammaC=num(state.concreteUnitWeightKNm3);
  const cover=state.soilCoverDepthM===""?0:Number(state.soilCoverDepthM),gammaS=cover>0?num(state.soilUnitWeightKNm3):0;
  if(!B||!L||!t||!gammaC||!Number.isFinite(cover)||cover<0||(cover>0&&!gammaS)){
   if(box)box.textContent="برای غربال بالاکشیدگی، ابعاد پی، وزن مخصوص بتن و در صورت وجود خاک پوششی، ضخامت و وزن مخصوص خاک لازم است.";
   return null;
  }
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM),pedComplete=!!(pw&&pl&&ph);
  if((pw||pl||ph)&&!pedComplete){if(box)box.textContent="ابعاد پدستال ناقص است؛ هر سه بعد را وارد کنید یا هر سه را خالی بگذارید.";return null;}
  if(pw>B||pl>L){if(box)box.textContent="ابعاد پدستال از ابعاد پی بزرگ‌تر است.";return null;}
  const concrete=gammaC*(B*L*t+(pedComplete?pw*pl*ph:0));
  const soil=cover>0?gammaS*Math.max(0,B*L-(pedComplete?pw*pl:0))*cover:0;
  const resistance=concrete+soil,records=[];
  lastReport.rows.forEach(row=>{
   const cases=Array.isArray(row.caseReactions)&&row.caseReactions.length?row.caseReactions:[{label:lastReport.loadCase,values:row.values||[]}];
   cases.forEach(item=>{
    const fy=Number((item.values||[])[1])/1000;
    if(!Number.isFinite(fy))return;
    const demand=Math.max(0,-fy),net=demand-resistance,ratio=resistance>0?demand/resistance:null;
    let status;
    if(demand<=1e-9)status="در این حالت واکنش قائم، بالاکشیدگی ندارد";
    else if(net<=0)status="وزن پی و خاک پوششی از تقاضای قائم بیشتر است؛ کنترل مهار و آیین‌نامه باقی است";
    else status="کسری مقاومت ثقلی؛ نیروی مهار/انکر لازم بررسی شود";
    const rec={nodeId:row.nodeId,label:item.label,structureUpliftDemandKN:demand,footingAndCoverWeightKN:resistance,residualUpliftKN:Math.max(0,net),demandToWeightRatio:ratio,status};
    records.push(rec);
    if(body){const tr=document.createElement("tr");[rec.nodeId,rec.label,fmt(demand),fmt(resistance),fmt(rec.residualUpliftKN),ratio===null?"—":fmt(ratio),status].forEach(x=>{const td=document.createElement("td");td.textContent=x;tr.appendChild(td);});body.appendChild(tr);}
   });
  });
  const residual=records.filter(x=>x.residualUpliftKN>1e-9).length;
  if(box)box.textContent="غربال بالاکشیدگی برای "+records.length+" حالت-پایه انجام شد. وزن ثقلی محاسبه‌شده هر پی (بتن + خاک پوششی واردشده): "+fmt(resistance)+" kN؛ موارد دارای کسری مقاومت ثقلی: "+residual+". این محاسبه ظرفیت بولت، صفحه‌ستون، مهار بتن، مخروط شکست، وزن خاک اطراف، آب زیرزمینی یا ضرایب آیین‌نامه‌ای را بررسی نمی‌کند و حتی در صورت صفر بودن کسری، به‌معنای تأیید مهار نیست.";
  return {basis:"preliminary_gravity_uplift_screen_only",concreteWeightPerFootingKN:concrete,soilCoverWeightPerFootingKN:soil,gravityResistancePerFootingKN:resistance,cases:records,limitations:["علامت Fy بر اساس قرارداد واکنش حل‌گر تفسیر شده و باید با یک حالت بارگذاری معلوم تطبیق شود.","فقط وزن بتن پی/پدستال و خاک پوششی واردشده لحاظ شده؛ خاک اطراف، شناژها، آب زیرزمینی و سایر بارهای دائمی لحاظ نشده‌اند.","ظرفیت کششی بولت، صفحه‌ستون، مهار بتن، شکست مخروطی/لبه‌ای و اندرکنش گروهی پی‌ها بررسی نشده است.","ترکیبات بار و ضرایب آیین‌نامه‌ای هنوز تأیید نهایی نشده‌اند؛ این غربال طراحی یا تأیید نهایی نیست."]};
 }
 function buildFootingRebarGeometry(baseRows,B,L,T,coverMm,specs){
  if(!Array.isArray(baseRows)||!baseRows.length||![B,L,T,coverMm].every(Number.isFinite)||B<=0||L<=0||T<=0||coverMm<0)return{ok:false,reason:"مختصات پایه‌ها، ابعاد پی، ضخامت و پوشش بتن باید معتبر باشند."};
  const bars=[],layers=Array.isArray(specs)?specs:[];
  for(const row of baseRows){
   if(![row.x,row.y,row.z].every(Number.isFinite))return{ok:false,reason:"مختصات سه‌بعدی یکی از پایه‌ها موجود نیست."};
   for(const sp of layers){
    if(!sp||!["bottom","top"].includes(sp.layer)||!["X","Z"].includes(sp.direction)||![sp.diaMm,sp.spacingMm].every(Number.isFinite)||sp.diaMm<=0||sp.spacingMm<=0)continue;
    const available=(sp.direction==="X"?L:B)*1000-2*coverMm;
    const cross=(sp.direction==="X"?B:L)*1000-2*coverMm;
    if(available<=0||cross<=0||T*1000<=2*coverMm+sp.diaMm)return{ok:false,reason:"پوشش و قطر میلگرد با ابعاد پی سازگار نیست."};
    const count=Math.floor(cross/sp.spacingMm)+1;
    const y=row.y+(sp.layer==="bottom"?coverMm+sp.diaMm/2:T*1000-coverMm-sp.diaMm/2)/1000;
    for(let i=0;i<count;i++){
     const offset=-cross/2+(count===1?0:i*cross/(count-1));
     const a=sp.direction==="X"?{x:row.x-available/2000,y,z:row.z+offset/1000}:{x:row.x+offset/1000,y,z:row.z-available/2000};
     const b=sp.direction==="X"?{x:row.x+available/2000,y,z:row.z+offset/1000}:{x:row.x+offset/1000,y,z:row.z+available/2000};
     bars.push({id:[row.nodeId||"base",sp.layer,sp.direction,i+1].join("-"),baseNodeId:row.nodeId||null,layer:sp.layer,direction:sp.direction,a,b,diameterMm:sp.diaMm});
    }
   }
  }
  return{ok:bars.length>0,bars,count:bars.length,baseCount:baseRows.length,assumptions:"مرکز هر پی منطبق بر مختصات گره پایه فرض شده؛ میلگردها مستقیم و بدون خم/قلاب/وصله مدل شده‌اند. تراز y گره پایه مبنای تراز رویه پی است و شبکه بالا/پایین با پوشش واردشده جانمایی می‌شود. این هندسه برای کنترل برخورد اولیه است، نه نقشه اجرایی."};
}
function footingGridSpecs(state){
 const out=[];
 for(const layer of ["bottom","top"])for(const direction of ["X","Z"]){
  const prefix=layer==="bottom"?"bottomBar":"topBar",suffix=direction==="X"?"Xmm":"Zmm";
  const dia=Number(state[prefix+"Dia"+suffix]),spacing=Number(state[prefix+"Spacing"+suffix]);
  if(dia>0&&spacing>0)out.push({layer,direction,diaMm:dia,spacingMm:spacing});
 }
 return out;
}
function calculateFootingRebar(baseCount,B,L){
  const cover=state.rebarCoverMm===""?null:Number(state.rebarCoverMm);
  const specs=[
   {layer:"تحتانی",direction:"موازی X",dia:num(state.bottomBarDiaXmm),spacing:num(state.bottomBarSpacingXmm),perp:"Z",parallel:"X"},
   {layer:"تحتانی",direction:"موازی Z",dia:num(state.bottomBarDiaZmm),spacing:num(state.bottomBarSpacingZmm),perp:"X",parallel:"Z"},
   {layer:"فوقانی",direction:"موازی X",dia:num(state.topBarDiaXmm),spacing:num(state.topBarSpacingXmm),perp:"Z",parallel:"X"},
   {layer:"فوقانی",direction:"موازی Z",dia:num(state.topBarDiaZmm),spacing:num(state.topBarSpacingZmm),perp:"X",parallel:"Z"}
  ];
  const any=specs.some(x=>String(x.dia??"")!==""||String(x.spacing??"")!=="")||String(state.rebarCoverMm??"").trim()!=="";
  const box=$("foundationRebarSummary"),body=$("foundationRebarRows");if(body)body.replaceChildren();
  if(!any){if(box)box.textContent="ورودی شبکه آرماتور وارد نشده است؛ وزن آرماتور پی در متره خالی می‌ماند.";return null;}
  if(cover===null||!Number.isFinite(cover)||cover<0){if(box)box.textContent="پوشش بتن باید از نقشه اجرایی وارد شود.";return null;}
  const cx=B*1000-2*cover,cz=L*1000-2*cover;if(cx<=0||cz<=0){if(box)box.textContent="پوشش بتن از ابعاد پی بیشتر است؛ ورودی‌ها را بررسی کنید.";return null;}
  const rows=[];
  for(const sp of specs){
   const rawDia=state[sp.layer==="تحتانی"?(sp.parallel==="X"?"bottomBarDiaXmm":"bottomBarDiaZmm"):(sp.parallel==="X"?"topBarDiaXmm":"topBarDiaZmm")];
   const rawSpacing=state[sp.layer==="تحتانی"?(sp.parallel==="X"?"bottomBarSpacingXmm":"bottomBarSpacingZmm"):(sp.parallel==="X"?"topBarSpacingXmm":"topBarSpacingZmm")];
   if(String(rawDia??"").trim()===""&&String(rawSpacing??"").trim()==="")continue;
   if(!sp.dia||!sp.spacing){if(box)box.textContent="هر شبکه/جهت انتخاب‌شده باید هم قطر و هم فاصله مثبت داشته باشد؛ شبکه‌های غیرموجود را کاملاً خالی بگذارید.";return null;}
   const clearPerp=sp.perp==="Z"?cz:cx,clearParallel=sp.parallel==="X"?cx:cz;
   const count=Math.floor(clearPerp/sp.spacing)+1,cutLengthM=clearParallel/1000,unitWeightKgM=sp.dia*sp.dia/162;
   rows.push({layer:sp.layer,direction:sp.direction,countPerFooting:count,cutLengthM,totalLengthM:count*cutLengthM*baseCount,unitWeightKgM,totalWeightKg:count*cutLengthM*baseCount*unitWeightKgM});
  }
  if(!rows.length){if(box)box.textContent="هیچ قطر و فاصله معتبری برای شبکه انتخاب‌شده وارد نشده است.";return null;}
  rows.forEach(r=>{if(body){const tr=document.createElement("tr");[r.layer,r.direction,fmt(r.countPerFooting*baseCount),fmt(r.cutLengthM),fmt(r.totalLengthM),fmt(r.totalWeightKg)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);}});
  const totalWeightKg=rows.reduce((a,r)=>a+r.totalWeightKg,0),bottom=rows.filter(r=>r.layer==="تحتانی").reduce((a,r)=>a+r.totalWeightKg,0),top=rows.filter(r=>r.layer==="فوقانی").reduce((a,r)=>a+r.totalWeightKg,0);
  if(box)box.textContent="وزن تقریبی شبکه‌ها برای "+baseCount+" پی: تحتانی "+fmt(bottom)+" kg، فوقانی "+fmt(top)+" kg، مجموع "+fmt(totalWeightKg)+" kg. فقط شاخه‌های مستقیم با وزن واحد d²/162؛ قلاب، وصله، خم، پرت، تقویت موضعی و آرماتور پدستال منظور نشده‌اند.";
  return {basis:"straight_top_and_bottom_mat_bars_only",coverMm:cover,rows,totalBottomWeightKg:bottom,totalTopWeightKg:top,totalWeightKg,limitations:["شبکه‌های فوقانی و تحتانی فقط در صورت ورود مشخصات واقعی نقشه متره می‌شوند؛ ورودی خالی به معنی عدم متره آن شبکه است.","طول برش مستقیم برابر بعد پی منهای دو برابر پوشش است؛ قلاب، خم، وصله و طول مهاری منظور نشده‌اند.","تعداد میلگرد با فاصله حداکثرِ ورودی و یک میلگرد در لبه محاسبه شده است؛ آرایش اجرایی باید با نقشه تطبیق داده شود.","وزن واحد تقریبی d²/162 kg/m است؛ وزن اسمی استاندارد محصول می‌تواند اندکی متفاوت باشد.","این متره، طراحی یا کنترل مقاومت خمشی/برشی/پانچ و ضوابط لرزه‌ای نیست."]};
 }
 function calculatePedestalRebar(baseCount){
  const specs=[
   {key:"longitudinal",label:"میلگرد طولی",diaKey:"pedestalLongBarDiaMm",countKey:"pedestalLongBarsPerBase",lengthKey:"pedestalLongBarCutLengthM"},
   {key:"ties",label:"خاموت",diaKey:"pedestalTieBarDiaMm",countKey:"pedestalTiesPerBase",lengthKey:"pedestalTieCutLengthM"}
  ];
  const entered=specs.some(x=>[state[x.diaKey],state[x.countKey],state[x.lengthKey]].some(v=>String(v??"").trim()!==""));
  const box=$("foundationPedestalRebarSummary");if(!entered){if(box)box.textContent="ورودی آرماتور پدستال وارد نشده است؛ مقدار آن در متره خالی می‌ماند.";return null;}
  const rows=[];
  for(const sp of specs){
   const raw=[state[sp.diaKey],state[sp.countKey],state[sp.lengthKey]];
   if(raw.every(v=>String(v??"").trim()===""))continue;
   const dia=num(raw[0]),count=raw[1]===""?null:Number(raw[1]),length=num(raw[2]);
   if(!dia||!Number.isInteger(count)||count<=0||!length){if(box)box.textContent="برای هر قلم انتخاب‌شده آرماتور پدستال، قطر، تعداد در هر پدستال و طول برش مثبت و معتبر لازم است.";return null;}
   const unitWeightKgM=dia*dia/162,totalCount=count*baseCount,totalLengthM=totalCount*length;
   rows.push({key:sp.key,label:sp.label,diameterMm:dia,countPerBase:count,totalCount,cutLengthM:length,totalLengthM,unitWeightKgM,totalWeightKg:totalLengthM*unitWeightKgM});
  }
  if(!rows.length)return null;
  const totalWeightKg=rows.reduce((a,x)=>a+x.totalWeightKg,0);
  if(box)box.textContent="وزن نظری آرماتور پدستال برای "+baseCount+" پایه: "+fmt(totalWeightKg)+" kg؛ طول‌ها و تعدادها عیناً از ورودی نقشه/جدول خم و برش گرفته شده‌اند. قلاب و وصله فقط در صورتی لحاظ می‌شوند که در طول برش ورودی منظور شده باشند.";
  return {basis:"manual_bar_bending_schedule_quantities",rows,totalWeightKg,limitations:["تعداد و طول برش باید از نقشه اجرایی یا جدول خم و برش وارد شود؛ هیچ جزئیات اجرایی حدس زده نمی‌شود.","وزن واحد تقریبی d²/162 kg/m است.","طول مهاری، قلاب، خم، وصله و پرت جداگانه محاسبه نشده‌اند مگر اینکه در طول برش واردشده منظور شده باشند.","این متره، طراحی یا کنترل مقاومت پدستال و خاموت‌ها نیست."]};
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
  const rebar=calculateFootingRebar(count,w,l);
  const pedestalRebar=calculatePedestalRebar(count);
   const q={baseCount:count,footingConcreteM3:footingConcrete,pedestalConcreteM3:pedComplete?pedConcrete:null,tieCount,tieTotalLengthM:tieLength,tieConcreteM3:tieConcrete,tieSideFormworkM2:tieFormwork,tieRebarKg:tieRebar,footingRebarKg:rebar?.totalWeightKg??null,footingRebar:rebar,pedestalRebarKg:pedestalRebar?.totalWeightKg??null,pedestalRebar,totalConcreteM3:totalConcrete,excavationM3:excavation,sideFormworkM2:totalFormwork,anchorsCount:anchors,dimensions:{w,l,t,pw:pw||null,pl:pl||null,ph:ph||null,excavationDepthM:excavationDepth,workingSpaceM:clearance,tieWidthM:tw||null,tieHeightM:th||null}};
  lastReport.quantities=q;
  lastReport.foundationBearing=screenBearing(q);
  lastReport.foundationSliding=screenSliding();
  lastReport.foundationUplift=screenUplift();
  window.SteelCostEstimate?.refreshFromFoundation?.(q);
  $("foundationQuantitySummary").textContent="تعداد پی: "+count+" | بتن پی: "+fmt(footingConcrete)+" م³"+(pedComplete?" | بتن پدستال: "+fmt(pedConcrete)+" م³":" | پدستال: ابعاد کامل وارد نشده")+(tieReady?" | شناژها: "+fmt(tieLength)+" متر طول، "+fmt(tieConcrete)+" م³ بتن، "+fmt(tieFormwork)+" م² قالب جانبی"+(tieRebar!==null?"، "+fmt(tieRebar)+" کیلوگرم آرماتور بر اساس وزن واحد واردشده":"، آرماتور شناژ محاسبه نشده"):" | شناژها هنوز متره نشده‌اند؛ تعداد، طول کل، عرض و ارتفاع را از نقشه وارد کنید")+(rebar?" | آرماتور شبکه‌های پی: "+fmt(rebar.totalWeightKg)+" kg":" | آرماتور شبکه پی محاسبه نشده؛ قطر، فاصله و پوشش را از نقشه وارد کنید")+(pedestalRebar?" | آرماتور پدستال: "+fmt(pedestalRebar.totalWeightKg)+" kg":" | آرماتور پدستال متره نشده")+" | مجموع بتن پی، پدستال و شناژِ محاسبه‌شده: "+fmt(q.totalConcreteM3)+" م³"+(excavation!==null?" | خاکبرداری هندسی: "+fmt(excavation)+" م³":" | خاکبرداری محاسبه نشده؛ عمق و فضای کار را وارد کنید")+" | قالب جانبی کلِ محاسبه‌شده: "+fmt(totalFormwork)+" م²"+(anchors!==null?" | تعداد بولت: "+anchors:" | تعداد بولت وارد نشده")+". قالب کف شناژ، وصله/خم میلگرد، بتن مگر، پرت، خاک متورم و اصلاح حجم خاکبرداری در این محاسبه نیستند. مقدار شناژ بر اساس ورودی نقشه است، نه تشخیص خودکار مسیر.";
 }
 function exportCSV(){
  if(!lastReport)return;
  readInputs();quantify();
  const lines=[["نوع گزارش","واکنش و متره مقدماتی فونداسیون"],["حالت بار",lastReport.loadCase],["نوع تکیه‌گاه",lastReport.supportType]];
  if(lastReport.rows.some(r=>Array.isArray(r.envelopes))){lines.push(["گره","X (m)","Z (m)",...["Fx","Fy","Fz"].map(x=>x+" min (kN)"),...["Fx","Fy","Fz"].map(x=>x+" max (kN)"),...["Mx","My","Mz"].map(x=>x+" min (kN.m)"),...["Mx","My","Mz"].map(x=>x+" max (kN.m)")]);lastReport.rows.forEach(r=>lines.push([r.nodeId,r.x,r.z,...r.envelopes.slice(0,3).map(e=>e.min/1000),...r.envelopes.slice(0,3).map(e=>e.max/1000),...r.envelopes.slice(3).map(e=>e.min/1e6),...r.envelopes.slice(3).map(e=>e.max/1e6)]));lines.push([],["واکنش‌های هم‌زمان هر ترکیب (برای جلوگیری از ترکیب کمینه/بیشینه‌های نامتجانس)"],["گره","حالت بار","Fx (kN)","Fy (kN)","Fz (kN)","Mx (kN.m)","My (kN.m)","Mz (kN.m)"]);lastReport.rows.forEach(r=>(r.caseReactions||[]).forEach(s=>lines.push([r.nodeId,s.label,...s.values.slice(0,3).map(v=>v/1000),...s.values.slice(3,6).map(v=>v/1e6)])));}
  else{lines.push(["گره","X (m)","Z (m)","Fx (kN)","Fy (kN)","Fz (kN)","Mx (kN.m)","My (kN.m)","Mz (kN.m)"],...lastReport.rows.map(r=>[r.nodeId,r.x,r.z,...r.values.slice(0,3).map(v=>v/1000),...r.values.slice(3,6).map(v=>v/1e6)]));}
  if(lastReport.foundationSliding){const fs=lastReport.foundationSliding;lines.push([],["غربال مقدماتی لغزش پی منفرد"],["ضریب اصطکاک μ",fs.frictionCoefficient],["وزن افزوده هر پی (kN)",fs.addedWeightPerFootingKN],["گره","حالت بار","H (kN)","N مؤثر (kN)","μN (kN)","μN/H","نتیجه"],...fs.cases.map(x=>[x.nodeId,x.label,x.HkN,x.NkN,x.resistanceKN,x.resistanceDemandRatio,x.status]));}if(lastReport.foundationUplift){const fu=lastReport.foundationUplift;lines.push([],["غربال مقدماتی بالاکشیدگی بر اساس وزن ثقلی"],["مبنای کنترل",fu.basis],["وزن بتن هر پی (kN)",fu.concreteWeightPerFootingKN],["وزن خاک پوششی هر پی (kN)",fu.soilCoverWeightPerFootingKN],["مجموع مقاومت ثقلی هر پی (kN)",fu.gravityResistancePerFootingKN],["گره","حالت بار","تقاضای بالاکشیدگی (kN)","وزن پی و خاک (kN)","کسری ثقلی (kN)","نسبت تقاضا/وزن","نتیجه"],...fu.cases.map(x=>[x.nodeId,x.label,x.structureUpliftDemandKN,x.footingAndCoverWeightKN,x.residualUpliftKN,x.demandToWeightRatio,x.status]));}if(lastReport.foundationBearing){const fb=lastReport.foundationBearing;lines.push([],["غربال مقدماتی فشار زیر پی"],["مبنای کنترل",fb.basis],["فشار مجاز ناخالص (kPa)",fb.allowableKPa],["جابه‌جایی محور ستون در X از مرکز پی (m)",fb.columnOffsetXM],["جابه‌جایی محور ستون در Z از مرکز پی (m)",fb.columnOffsetZM],["وزن بتن هر پی (kN)",fb.concreteWeightPerFootingKN],["وزن خاک پوششی هر پی (kN)",fb.soilCoverWeightPerFootingKN],["گره","حالت بار","N سازه (kN)","N با وزن‌های افزوده (kN)","Mx مؤثر (kN.m)","Mz مؤثر (kN.m)","eX (m)","eZ (m)","qmin (kPa)","qmax (kPa)","نتیجه"],...fb.cases.map(x=>[x.nodeId,x.label,x.NkN,x.totalNkN,x.effectiveMxKNm,x.effectiveMzKNm,x.eXM,x.eZM,x.qminKPa,x.qmaxKPa,x.status]));}if(lastReport.quantities){const q=lastReport.quantities;if(q.footingRebar?.rows){lines.push([],["متره شبکه تحتانی پی"],["لایه","جهت","تعداد هر پی","طول برش (m)","طول کل (m)","وزن واحد (kg/m)","وزن کل (kg)"],...q.footingRebar.rows.map(r=>[r.layer,r.direction,r.countPerFooting,r.cutLengthM,r.totalLengthM,r.unitWeightKgM,r.totalWeightKg]));}if(q.pedestalRebar?.rows){lines.push([],["متره آرماتور پدستال"],["شرح","قطر (mm)","تعداد در هر پایه","تعداد کل","طول برش (m)","طول کل (m)","وزن واحد (kg/m)","وزن کل (kg)"],...q.pedestalRebar.rows.map(r=>[r.label,r.diameterMm,r.countPerBase,r.totalCount,r.cutLengthM,r.totalLengthM,r.unitWeightKgM,r.totalWeightKg]));}lines.push(["تعداد پی",q.baseCount],["بتن پی (m3)",q.footingConcreteM3],["بتن پدستال (m3)",q.pedestalConcreteM3??"نامشخص"],["مجموع بتن (m3)",q.totalConcreteM3],["خاکبرداری (m3)",q.excavationM3??"نامشخص"],["بتن شناژ (m3)",q.tieConcreteM3??"نامشخص"],["طول کل شناژ (m)",q.tieTotalLengthM??"نامشخص"],["تعداد شناژ",q.tieCount??"نامشخص"],["قالب جانبی شناژ (m2)",q.tieSideFormworkM2??"نامشخص"],["آرماتور شناژ (kg)",q.tieRebarKg??"نامشخص"],["آرماتور شبکه تحتانی پی (kg)",q.footingRebarKg??"نامشخص"],["قالب جانبی کل (m2)",q.sideFormworkM2],["تعداد بولت",q.anchorsCount??"نامشخص"]);}
  const csv="\uFEFF"+lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Foundation-Takeoff.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){readInputs();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;keys.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];const el=$(map[k]);if(el)el.value=state[k]??"";});}
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelFoundationTakeoff={getData,setData,extract,quantify,buildFootingRebarGeometry,footingGridSpecs,checkTieBeamRebarClearance,selfTest,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
})();