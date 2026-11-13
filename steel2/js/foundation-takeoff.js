/* SAHROUD STEEL — foundation reaction takeoff
 * Extracts support actions from the latest 3D analysis and calculates only user-dimensioned
 * preliminary quantities. It does NOT design footings, reinforcement, anchors or soil bearing.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const keys=["footingClass","footingWidthM","footingLengthM","footingThicknessM","pedestalWidthM","pedestalLengthM","pedestalHeightM","columnOffsetXM","columnOffsetZM","excavationDepthM","workingSpaceM","anchorsPerBase","tieCount","tieTotalLengthM","tieWidthM","tieHeightM","tieRebarKgPerM","soilAllowableKPa","concreteUnitWeightKNm3","soilUnitWeightKNm3","soilCoverDepthM","slidingFrictionMu","bottomBarDiaXmm","bottomBarSpacingXmm","bottomBarDiaZmm","bottomBarSpacingZmm","topBarDiaXmm","topBarSpacingXmm","topBarDiaZmm","topBarSpacingZmm","pedestalLongBarDiaMm","pedestalLongBarsPerBase","pedestalLongBarCutLengthM","pedestalTieBarDiaMm","pedestalTiesPerBase","pedestalTieCutLengthM","rebarCoverMm"];
 const state={footingClass:"main",footingWidthM:"1.80",footingLengthM:"1.80",footingThicknessM:"0.80",pedestalWidthM:"",pedestalLengthM:"",pedestalHeightM:"",columnOffsetXM:"",columnOffsetZM:"",excavationDepthM:"",workingSpaceM:"",anchorsPerBase:"",tieCount:"",tieTotalLengthM:"",tieWidthM:"0.60",tieHeightM:"0.50",tieRebarKgPerM:"",soilAllowableKPa:"",concreteUnitWeightKNm3:"",soilUnitWeightKNm3:"",soilCoverDepthM:"",slidingFrictionMu:"",bottomBarDiaXmm:"16",bottomBarSpacingXmm:"150",bottomBarDiaZmm:"16",bottomBarSpacingZmm:"150",topBarDiaXmm:"",topBarSpacingXmm:"",topBarDiaZmm:"",topBarSpacingZmm:"",pedestalLongBarDiaMm:"",pedestalLongBarsPerBase:"",pedestalLongBarCutLengthM:"",pedestalTieBarDiaMm:"",pedestalTiesPerBase:"",pedestalTieCutLengthM:"",rebarCoverMm:""};
 const map={footingClass:"ftClass",footingWidthM:"ftWidth",footingLengthM:"ftLength",footingThicknessM:"ftThickness",pedestalWidthM:"ftPedWidth",pedestalLengthM:"ftPedLength",pedestalHeightM:"ftPedHeight",columnOffsetXM:"ftColumnOffsetX",columnOffsetZM:"ftColumnOffsetZ",excavationDepthM:"ftExcDepth",workingSpaceM:"ftWorking",anchorsPerBase:"ftAnchors",tieCount:"ftTieCount",tieTotalLengthM:"ftTieLength",tieWidthM:"ftTieWidth",tieHeightM:"ftTieHeight",tieRebarKgPerM:"ftTieRebar",soilAllowableKPa:"ftSoilAllow",concreteUnitWeightKNm3:"ftConcreteGamma",soilUnitWeightKNm3:"ftSoilGamma",soilCoverDepthM:"ftSoilCover",slidingFrictionMu:"ftSlidingMu",bottomBarDiaXmm:"ftBarDiaX",bottomBarSpacingXmm:"ftBarSpacingX",bottomBarDiaZmm:"ftBarDiaZ",bottomBarSpacingZmm:"ftBarSpacingZ",topBarDiaXmm:"ftTopBarDiaX",topBarSpacingXmm:"ftTopBarSpacingX",topBarDiaZmm:"ftTopBarDiaZ",topBarSpacingZmm:"ftTopBarSpacingZ",pedestalLongBarDiaMm:"ftPedLongDia",pedestalLongBarsPerBase:"ftPedLongCount",pedestalLongBarCutLengthM:"ftPedLongLength",pedestalTieBarDiaMm:"ftPedTieDia",pedestalTiesPerBase:"ftPedTieCount",pedestalTieCutLengthM:"ftPedTieLength",rebarCoverMm:"ftRebarCover"};
 const fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:3});
 const num=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
 const signedNum=x=>{if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(x);return Number.isFinite(n)?n:null;};
 let lastReport=null;
 let rebarIsoView={angle:0,zoom:1};
 function panel(){
  if($("foundationTakeoffPanel"))return;
  const root=$("costEstimatePanel")||$("quantityTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="foundationTakeoffPanel";
  p.innerHTML='<div class="panel-title"><h3>متره فونداسیون بر اساس واکنش‌های تحلیل سه‌بعدی</h3><span class="status">استخراج نیرو؛ نه طراحی پی</span></div>'+
   '<div class="notice">ابتدا تحلیل سه‌بعدی موردنظر را اجرا کنید؛ سپس واکنش‌های گره‌های پایه از همان حالت بار استخراج می‌شوند. ابعاد پی باید پس از طراحی ژئوتکنیکی و سازه‌ای وارد شوند. این بخش فعلاً واکنش‌ها و مقادیر هندسیِ مبتنی بر ابعاد واردشده را گزارش می‌کند و ظرفیت خاک، برون‌مرکزی، لغزش، واژگونی، پانچ، برش یک‌طرفه، آرماتور و بولت را طراحی یا تأیید نمی‌کند.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="ftClass">نوع پیِ مبنای ابعاد پیش‌فرض</label><select id="ftClass"><option value="main" selected>پی ستون اصلی ـ ۱٫۸۰ × ۱٫۸۰ متر</option><option value="secondary">پی ستون فرعی ـ ۱٫۴۰ × ۱٫۴۰ متر</option><option value="custom">ابعاد سفارشی</option></select><small>این انتخاب فعلاً برای مجموعه ابعاد ورودی متره است؛ تخصیص متفاوت به تک‌تک پایه‌ها در مرحله جدول‌بندی پی‌ها اضافه می‌شود.</small></div>'+
   '<div class="field"><label for="ftWidth">عرض پی در راستای X (متر)</label><input id="ftWidth" type="number" min="0" step="0.05" value="1.80"></div>'+
   '<div class="field"><label for="ftLength">طول پی در راستای Z (متر)</label><input id="ftLength" type="number" min="0" step="0.05" value="1.80"></div>'+
   '<div class="field"><label for="ftThickness">ضخامت پی (متر)</label><input id="ftThickness" type="number" min="0" step="0.05" value="0.80"></div>'+
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
   '<div class="field"><label for="ftTieRebar">وزن آرماتور شناژ (کیلوگرم بر متر؛ اختیاری)</label><input id="ftTieRebar" type="number" min="0" step="0.1" placeholder="از جدول آرماتوربندی"></div></div>'+'<h4>ورودی‌های ژئوتکنیک و وزن‌های مؤثر برای غربال فشار زیر پی</h4><div class="notice">این مقادیر باید از گزارش مکانیک خاک و مشخصات مصالح برداشته شوند. فشار مجاز واردشده باید از نظر gross/net بودن روشن باشد؛ فعلاً فقط فشار مجاز ناخالص قابل مقایسه است. وزن پی و خاک روی پی فقط با ورودی‌های زیر افزوده می‌شود.</div><div class="form-grid">'+'<div class="field"><label for="ftSoilAllow">ظرفیت باربری مجاز ناخالص خاک (kPa)</label><input id="ftSoilAllow" type="number" min="0" step="1" placeholder="از گزارش ژئوتکنیک؛ نه حدس"></div>'+'<div class="field"><label for="ftConcreteGamma">وزن مخصوص بتن (kN/m³)</label><input id="ftConcreteGamma" type="number" min="0" step="0.1" placeholder="طبق مشخصات پروژه"></div>'+'<div class="field"><label for="ftSoilGamma">وزن مخصوص خاک روی پی (kN/m³)</label><input id="ftSoilGamma" type="number" min="0" step="0.1" placeholder="در صورت وجود خاک پوششی"></div>'+'<div class="field"><label for="ftSoilCover">ضخامت خاک پوششی روی پی (متر)</label><input id="ftSoilCover" type="number" min="0" step="0.05" placeholder="از ترازهای واقعی"></div></div><div class="field"><label for="ftSlidingMu">ضریب اصطکاک خاک و بتن (μ)</label><input id="ftSlidingMu" type="number" min="0" step="0.01" placeholder="فقط از گزارش ژئوتکنیک"></div></div><h4>متره شبکه آرماتور تحتانی پی (بر اساس نقشه اجرایی)</h4><div class="notice">این بخش فقط تعداد، طول برش مستقیم و وزن تقریبی میلگردهای شبکه تحتانی را از قطر، فاصله و پوشش واردشده محاسبه می‌کند. قلاب، وصله، خم، تقویت موضعی، شبکه فوقانی و آرماتور پدستال منظور نشده‌اند؛ این محاسبه طراحی آرماتور نیست.</div><div class="form-grid"><div class="field"><label for="ftBarDiaX">قطر میلگردهای موازی X (mm)</label><input id="ftBarDiaX" type="number" min="0" step="1" value="16"></div><div class="field"><label for="ftBarSpacingX">فاصله میلگردهای موازی X (mm)</label><input id="ftBarSpacingX" type="number" min="0" step="5" value="150"></div><div class="field"><label for="ftBarDiaZ">قطر میلگردهای موازی Z (mm)</label><input id="ftBarDiaZ" type="number" min="0" step="1" value="16"></div><div class="field"><label for="ftBarSpacingZ">فاصله میلگردهای موازی Z (mm)</label><input id="ftBarSpacingZ" type="number" min="0" step="5" value="150"></div><div class="field"><label for="ftRebarCover">پوشش بتن تا سطح خارجی میلگرد (mm)</label><input id="ftRebarCover" type="number" min="0" step="5" placeholder="طبق نقشه و شرایط محیطی"></div></div><h4>متره شبکه آرماتور فوقانی پی</h4><div class="notice">ورودی‌های شبکه فوقانی مستقل‌اند؛ فقط در صورت وجود در نقشه اجرایی وارد کنید. اگر شبکه فوقانی وجود ندارد، این چهار ورودی را خالی بگذارید.</div><div class="form-grid"><div class="field"><label for="ftTopBarDiaX">قطر میلگردهای فوقانی موازی X (mm)</label><input id="ftTopBarDiaX" type="number" min="0" step="1" placeholder="طبق نقشه؛ در صورت عدم وجود خالی"></div><div class="field"><label for="ftTopBarSpacingX">فاصله میلگردهای فوقانی موازی X (mm)</label><input id="ftTopBarSpacingX" type="number" min="0" step="5" placeholder="طبق نقشه"></div><div class="field"><label for="ftTopBarDiaZ">قطر میلگردهای فوقانی موازی Z (mm)</label><input id="ftTopBarDiaZ" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftTopBarSpacingZ">فاصله میلگردهای فوقانی موازی Z (mm)</label><input id="ftTopBarSpacingZ" type="number" min="0" step="5" placeholder="طبق نقشه"></div></div><h4>متره آرماتور پدستال و خاموت‌ها</h4><div class="notice">تعداد و طول برش را از نقشه اجرایی یا جدول خم و برش وارد کنید. نرم‌افزار طول مهاری، قلاب، خم، وصله یا تعداد خاموت را حدس نمی‌زند. تعدادها برای هر پدستال هستند.</div><div class="form-grid"><div class="field"><label for="ftPedLongDia">قطر میلگرد طولی پدستال (mm)</label><input id="ftPedLongDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedLongCount">تعداد میلگرد طولی در هر پدستال</label><input id="ftPedLongCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedLongLength">طول برش هر میلگرد طولی (m)</label><input id="ftPedLongLength" type="number" min="0" step="0.01" placeholder="از جدول خم و برش"></div><div class="field"><label for="ftPedTieDia">قطر خاموت پدستال (mm)</label><input id="ftPedTieDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedTieCount">تعداد خاموت در هر پدستال</label><input id="ftPedTieCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedTieLength">طول برش هر خاموت (m)</label><input id="ftPedTieLength" type="number" min="0" step="0.01" placeholder="از جدول خم و برش"></div></div><div id="foundationPedestalRebarSummary" class="notice">برای متره پدستال، مشخصات واقعی نقشه را وارد کنید.</div><div id="foundationRebarSummary" class="notice">برای متره آرماتور، قطر، فاصله و پوشش واقعی را وارد کنید.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:680px"><thead><tr><th>لایه</th><th>جهت میلگرد</th><th>تعداد در هر پی</th><th>طول هر شاخه (m)</th><th>طول کل (m)</th><th>وزن تقریبی (kg)</th></tr></thead><tbody id="foundationRebarRows"></tbody></table></div><h4>غربال مقدماتی لغزش پی منفرد</h4><div class="notice">ضریب اصطکاک باید از گزارش ژئوتکنیک/مشخصات تماس گرفته شود؛ مقدار پیش‌فرض نداریم. کنترل زیر فقط اصطکاک پایه پی منفرد را می‌سنجد و اثر چسبندگی، فشار جانبی خاک، شناژها، شمع، کلید برشی، آب زیرزمینی و ضرایب اطمینان آیین‌نامه‌ای را لحاظ نمی‌کند.</div><div id="foundationSlidingSummary" class="notice">برای غربال لغزش، ضریب اصطکاک معتبر و ابعاد پی لازم است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:700px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>H (kN)</th><th>N مؤثر (kN)</th><th>μN (kN)</th><th>μN/H</th><th>نتیجه</th></tr></thead><tbody id="foundationSlidingRows"></tbody></table></div>'+'<h4>غربال مقدماتی بالاکشیدگی و نیاز احتمالی به مهار کششی</h4><div class="notice">این بخش فقط تقاضای کششی قائم را با وزن ثقلی پی و خاک پوششی مقایسه می‌کند. ظرفیت بولت، صفحه‌ستون و مهار بتن محاسبه نمی‌شود؛ نتیجه مثبت به‌هیچ‌وجه تأیید طراحی انکر نیست.</div><div id="foundationUpliftSummary" class="notice">پس از ورود ابعاد واقعی پی و وزن مخصوص مصالح، غربال انجام می‌شود.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>تقاضای بالاکشیدگی (kN)</th><th>وزن پی و خاک (kN)</th><th>کسری ثقلی (kN)</th><th>نسبت تقاضا/وزن</th><th>نتیجه</th></tr></thead><tbody id="foundationUpliftRows"></tbody></table></div>'+'<div id="foundationBearingSummary" class="notice">پس از ورود داده‌های ژئوتکنیک و ابعاد واقعی، غربال فشار انجام می‌شود.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:780px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>N (kN)</th><th>eX / eZ (m)</th><th>qmin (kPa)</th><th>qmax (kPa)</th><th>نتیجه غربال</th></tr></thead><tbody id="foundationBearingRows"></tbody></table></div>'+
   '<div class="button-grid"><button id="btnFoundationReactions" class="btn secondary" type="button">استخراج واکنش یک حالت بار</button><button id="btnFoundationEnvelope" class="btn primary" type="button">تحلیل پوش واکنش همه ترکیبات مقدماتی</button><button id="btnFoundationQuantities" class="btn secondary" type="button">محاسبه متره هندسی فونداسیون</button><button id="btnFoundationCSV" class="btn secondary" type="button" disabled>خروجی CSV واکنش و متره</button></div>'+
   '<div id="foundationTakeoffSummary" class="notice">هنوز واکنش تحلیل سه‌بعدی استخراج نشده است.</div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:920px"><thead><tr><th>گره پایه</th><th>مختصات X/Z (متر)</th><th>Fx min/max (kN)</th><th>Fy min/max (kN)</th><th>Fz min/max (kN)</th><th>Mx min/max (kN.m)</th><th>My min/max (kN.m)</th><th>Mz min/max (kN.m)</th></tr></thead><tbody id="foundationReactionRows"></tbody></table></div>'+
   '<div id="foundationQuantitySummary" class="notice">برای متره، ابعاد واقعی پی را وارد کنید.</div>'+
   '<h4>ترسیم آرماتور شناژ و فونداسیون</h4><div class="notice">حالت ترسیم مستقل از متره و طراحی است. حالت پیش‌فرض فقط آرایش نمایشی درخواستی را نشان می‌دهد؛ حالت طراحی از خروجی غربال/آرماتور ثبت‌شده استفاده می‌کند و اگر داده کافی موجود نباشد، بخش مربوطه را ترسیم نمی‌کند.</div><div class="form-grid"><div class="field"><label for="rebarDrawingMode">مبنای ترسیم میلگردها</label><select id="rebarDrawingMode"><option value="default" selected>آرایش پیش‌فرض اجرایی</option><option value="design">مقادیر طراحی/محاسبات نرم‌افزار</option></select></div></div><div class="button-grid"><button id="btnRefreshRebarDrawing" class="btn secondary" type="button">به‌روزرسانی ترسیم</button></div><div class="form-grid"><div class="field"><label for="footingRebarTarget">انتخاب فونداسیون برای جزئیات</label><select id="footingRebarTarget"><option value="">اولین فونداسیون</option></select></div><div class="field"><label for="tieRebarTarget">انتخاب شناژ برای جزئیات</label><select id="tieRebarTarget"><option value="">اولین شناژ</option></select></div></div><div id="rebarDrawingSummary" class="notice">آرایش پیش‌فرض انتخاب شده است.</div><div id="rebarDrawingCanvas" class="drawing-area" style="overflow-x:auto;min-height:320px"></div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  keys.forEach(k=>{const el=$(map[k]);if(el){el.value=state[k]??"";el.addEventListener("change",()=>{state[k]=el.value;});}});
  $("btnFoundationReactions").addEventListener("click",extract);
  $("btnFoundationEnvelope").addEventListener("click",extractEnvelope);
  $("btnFoundationQuantities").addEventListener("click",quantify);
  $("btnFoundationCSV").addEventListener("click",exportCSV);
  $("btnRefreshRebarDrawing").addEventListener("click",renderRebarDrawing);
  $("rebarDrawingMode").addEventListener("change",renderRebarDrawing);
  $("footingRebarTarget").addEventListener("change",renderRebarDrawing);
  $("tieRebarTarget").addEventListener("change",renderRebarDrawing);
  try{$("rebarDrawingMode").value=localStorage.getItem("sahroudSteel.rebarDrawingMode.v1")||"default";$("rebarDrawingMode").addEventListener("change",()=>{try{localStorage.setItem("sahroudSteel.rebarDrawingMode.v1",$("rebarDrawingMode").value);}catch(e){}});}catch(e){}
  renderRebarDrawing();
 }
 function readInputs(){keys.forEach(k=>{const el=$(map[k]);if(el)state[k]=el.value;});}
 function footingDatumGeometry(topElevationM,tieHeightM,footingDepthM){
  if(![topElevationM,tieHeightM,footingDepthM].every(Number.isFinite)||tieHeightM<=0||footingDepthM<=0)return{ok:false,reason:"تراز بالا، ارتفاع شناژ و ضخامت پی باید معتبر باشند."};
  const tieBottomElevationM=topElevationM-tieHeightM,footingBottomElevationM=topElevationM-footingDepthM;
  return{ok:true,commonTopElevationM:topElevationM,tieBottomElevationM,footingBottomElevationM,extraExcavationBelowTieM:Math.max(0,tieBottomElevationM-footingBottomElevationM),footingBottomAboveTieBottomM:Math.max(0,footingBottomElevationM-tieBottomElevationM),tieHeightM,footingDepthM,topLevelsCoincident:true};
 }
 function applyFootingClass(value){
  const cls=["main","secondary","custom"].includes(value)?value:"main";state.footingClass=cls;
  if(cls==="custom")return;
  const size=cls==="main"?"1.80":"1.40";state.footingWidthM=size;state.footingLengthM=size;state.footingThicknessM="0.80";
  [["ftWidth",state.footingWidthM],["ftLength",state.footingLengthM],["ftThickness",state.footingThicknessM]].forEach(([id,v])=>{if($(id))$(id).value=v;});
  quantify();renderRebarDrawing();
 }
 function selfTest(){
  const bases=[{nodeId:"B1",x:0,y:0,z:0}],specs=[{layer:"bottom",direction:"X",diaMm:16,spacingMm:200},{layer:"bottom",direction:"Z",diaMm:16,spacingMm:200},{layer:"top",direction:"X",diaMm:14,spacingMm:200},{layer:"top",direction:"Z",diaMm:14,spacingMm:200}];
  const g=buildFootingRebarGeometry(bases,2,2,0.5,50,specs);
  const checks={fourGridLayers:g.ok&&g.count>0&&new Set(g.bars.map(x=>x.layer+"-"+x.direction)).size===4,bottomTopElevation:g.ok&&g.bars.some(x=>x.layer==="bottom"&&Math.abs(x.a.y+0.442)<1e-9)&&g.bars.some(x=>x.layer==="top"&&Math.abs(x.a.y+0.057)<1e-9),gridBarsStayInsideFootprint:g.ok&&g.bars.every(x=>Math.abs(x.a.x)<=1&&Math.abs(x.a.z)<=1&&Math.abs(x.b.x)<=1&&Math.abs(x.b.z)<=1)};
  const datum=footingDatumGeometry(0,0.5,0.8),secondary=footingDatumGeometry(3,0.5,0.8),tallTie=footingDatumGeometry(0,0.9,0.8);
  checks.sharedTopDatum=datum.ok&&datum.commonTopElevationM===0&&Math.abs(datum.extraExcavationBelowTieM-0.3)<1e-9;
  checks.footingBottomFormula=datum.ok&&Math.abs(datum.footingBottomElevationM+0.8)<1e-9&&Math.abs(datum.tieBottomElevationM+0.5)<1e-9;
  checks.noExtraExcavationWhenTieDeeper=tallTie.ok&&tallTie.extraExcavationBelowTieM===0&&Math.abs(tallTie.footingBottomAboveTieBottomM-0.1)<1e-9;
  return{passed:Object.values(checks).every(Boolean),checks,barCount:g.count,assumptions:g.assumptions,datumTests:{main:datum,secondary:secondary,tallTie}};
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
  renderRebarDrawing();
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
    const y=row.y+(sp.layer==="bottom"?-T*1000+coverMm+sp.diaMm/2:-coverMm-sp.diaMm/2)/1000;
    for(let i=0;i<count;i++){
     const offset=-cross/2+(count===1?0:i*cross/(count-1));
     const a=sp.direction==="X"?{x:row.x-available/2000,y,z:row.z+offset/1000}:{x:row.x+offset/1000,y,z:row.z-available/2000};
     const b=sp.direction==="X"?{x:row.x+available/2000,y,z:row.z+offset/1000}:{x:row.x+offset/1000,y,z:row.z+available/2000};
     bars.push({id:[row.nodeId||"base",sp.layer,sp.direction,i+1].join("-"),baseNodeId:row.nodeId||null,layer:sp.layer,direction:sp.direction,a,b,diameterMm:sp.diaMm});
    }
   }
  }
  return{ok:bars.length>0,bars,count:bars.length,baseCount:baseRows.length,assumptions:"مرکز هر پی منطبق بر مختصات گره پایه فرض شده؛ میلگردها مستقیم و بدون خم/قلاب/وصله مدل شده‌اند. تراز y گره پایه مبنای تراز رویه پی است؛ محور y در مدل رو به بالا است، بنابراین شبکه تحتانی در تراز y منفی‌تر و شبکه فوقانی نزدیک‌تر به رویه پی قرار می‌گیرد. این هندسه برای کنترل برخورد اولیه است، نه نقشه اجرایی."};
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
   const datumRows=(lastReport?.rows||[]).filter(r=>Number.isFinite(Number(r.y))).map(r=>({nodeId:r.nodeId,...footingDatumGeometry(Number(r.y),th||0.5,t||0.8)}));
   const datumSummary=datumRows.length?{baseCount:datumRows.length,allTopLevelsCoincident:datumRows.every(r=>r.ok&&r.topLevelsCoincident),tieHeightM:th||0.5,footingDepthM:t||0.8,extraExcavationBelowTieM:datumRows[0].extraExcavationBelowTieM,rows:datumRows,analysisAxisCaveat:"در مدل تحلیل فعلی محور شناژ از گره پایه عبور می‌کند؛ انتقال محور به پایین به اندازه نصف ارتفاع شناژ همراه با بازوی صلب/اتصال خارج از مرکز هنوز پیاده نشده است. بنابراین این تراز مشترک فعلاً هندسه هدف متره و نقشه است و نباید به‌عنوان اصلاح‌شدن سختی/اتصال مدل تحلیل تلقی شود."}:null;
  const tieReady=tieConcrete!==null;
  const tieFormwork=tieSectionComplete?tieLength*2*th:null;
  const tieRebar=tieSectionComplete&&state.tieRebarKgPerM!==""&&Number(state.tieRebarKgPerM)>=0?tieLength*Number(state.tieRebarKgPerM):null;
  const totalConcrete=footingConcrete+(pedComplete?pedConcrete:0)+(tieConcrete!==null?tieConcrete:0);
  const totalFormwork=formFoot+formPed+(tieFormwork!==null?tieFormwork:0);
  const rebar=calculateFootingRebar(count,w,l);
  const pedestalRebar=calculatePedestalRebar(count);
   const q={baseCount:count,footingConcreteM3:footingConcrete,pedestalConcreteM3:pedComplete?pedConcrete:null,tieCount,tieTotalLengthM:tieLength,tieConcreteM3:tieConcrete,tieSideFormworkM2:tieFormwork,tieRebarKg:tieRebar,footingRebarKg:rebar?.totalWeightKg??null,footingRebar:rebar,pedestalRebarKg:pedestalRebar?.totalWeightKg??null,pedestalRebar,totalConcreteM3:totalConcrete,excavationM3:excavation,sideFormworkM2:totalFormwork,anchorsCount:anchors,sharedTopDatum:datumSummary,dimensions:{w,l,t,pw:pw||null,pl:pl||null,ph:ph||null,excavationDepthM:excavationDepth,workingSpaceM:clearance,tieWidthM:tw||null,tieHeightM:th||null}};
  lastReport.quantities=q;
  lastReport.foundationBearing=screenBearing(q);
  lastReport.foundationSliding=screenSliding();
  lastReport.foundationUplift=screenUplift();
  window.SteelCostEstimate?.refreshFromFoundation?.(q);
  $("foundationQuantitySummary").textContent="تعداد پی: "+count+" | تراز بالای مشترک هدف پی/شناژ: "+(datumSummary?"برابر در "+datumSummary.baseCount+" پایه؛ عمق اضافه زیر کف شناژ: "+fmt(datumSummary.extraExcavationBelowTieM)+" m":"مختصات تراز موجود نیست")+" | بتن پی: "+fmt(footingConcrete)+" م³"+(pedComplete?" | بتن پدستال: "+fmt(pedConcrete)+" م³":" | پدستال: ابعاد کامل وارد نشده")+(tieReady?" | شناژها: "+fmt(tieLength)+" متر طول، "+fmt(tieConcrete)+" م³ بتن، "+fmt(tieFormwork)+" م² قالب جانبی"+(tieRebar!==null?"، "+fmt(tieRebar)+" کیلوگرم آرماتور بر اساس وزن واحد واردشده":"، آرماتور شناژ محاسبه نشده"):" | شناژها هنوز متره نشده‌اند؛ تعداد، طول کل، عرض و ارتفاع را از نقشه وارد کنید")+(rebar?" | آرماتور شبکه‌های پی: "+fmt(rebar.totalWeightKg)+" kg":" | آرماتور شبکه پی محاسبه نشده؛ قطر، فاصله و پوشش را از نقشه وارد کنید")+(pedestalRebar?" | آرماتور پدستال: "+fmt(pedestalRebar.totalWeightKg)+" kg":" | آرماتور پدستال متره نشده")+" | مجموع بتن پی، پدستال و شناژِ محاسبه‌شده: "+fmt(q.totalConcreteM3)+" م³"+(excavation!==null?" | خاکبرداری هندسی: "+fmt(excavation)+" م³":" | خاکبرداری محاسبه نشده؛ عمق و فضای کار را وارد کنید")+" | قالب جانبی کلِ محاسبه‌شده: "+fmt(totalFormwork)+" م²"+(anchors!==null?" | تعداد بولت: "+anchors:" | تعداد بولت وارد نشده")+". قالب کف شناژ، وصله/خم میلگرد، بتن مگر، پرت، خاک متورم و اصلاح حجم خاکبرداری در این محاسبه نیستند. مقدار شناژ بر اساس ورودی نقشه است، نه تشخیص خودکار مسیر.";
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

 function drawingFootingSpecs(mode){
  if(mode==="default")return{specs:[
   {layer:"bottom",direction:"X",diaMm:16,spacingMm:150},
   {layer:"bottom",direction:"Z",diaMm:16,spacingMm:150}
  ],basis:"پیش‌فرض کاربر: فقط شبکه تحتانی، Ø16 با فاصله 150 میلی‌متر در دو راستا."};
  const manual=footingGridSpecs(state);
  if(manual.length)return{specs:manual,basis:"مقادیر قطر و فاصله ثبت‌شده در ورودی آرماتور فونداسیون."};
  const report=window.SteelFootingStructuralScreen?.getLast?.();
  if(!report?.records?.length)return{specs:[],basis:"خروجی غربال سازه‌ای فونداسیون موجود نیست؛ ابتدا غربال را اجرا کنید و قطر میلگردهای تحتانی را ثبت کنید."};
  const specs=[];
  for(const dir of ["X","Z"]){
   const tokens=report.records.filter(r=>r&&Number.isFinite(r.spacingByStrengthMm)&&r.spacingByStrengthMm>0&&String(r.direction||"").includes(dir==="X"?"موازی X":"موازی Z"));
   if(!tokens.length)continue;
   const dia=Number(dir==="X"?state.bottomBarDiaXmm:state.bottomBarDiaZmm);
   if(!(dia>0))continue;
   specs.push({layer:"bottom",direction:dir,diaMm:dia,spacingMm:Math.min(...tokens.map(r=>r.spacingByStrengthMm))});
  }
  return{specs,basis:"فاصله از As لازمِ غربال مقدماتی و قطر واردشده در ورودی فونداسیون؛ این خروجی طراحی نهایی یا تأیید آیین‌نامه‌ای نیست."};
 }
 function drawingTieSpecs(mode,routes){
  const report=window.SteelTieBeamReinforcement?.getLast?.(),rows=new Map((report?.rows||[]).map(r=>[String(r.id),r]));
  return routes.map(route=>{
   if(mode==="default")return{route,count:3,dia:16,width:Number(route.widthM)||Number(state.tieWidthM)||0.60,height:Number(route.heightM)||Number(state.tieHeightM)||0.50,stirrupDia:Number(route.reinforcement?.stirrupDiaMm)||10,source:"پیش‌فرض نمایشی"};
   const row=rows.get(String(route.id)),count=Number(row?.barCountEachFace),dia=Number(row?.barDiaMm),width=Number(route.widthM),height=Number(route.heightM);
   if(row?.ok&&Number.isInteger(count)&&count>0&&dia>0)return{route,count,dia,width,height,stirrupDia:Number(report?.settings?.stirrupDiaMm)||Number(route.reinforcement?.stirrupDiaMm)||10,source:"گزارش آخرین محاسبه آرماتور شناژ"};
   return{route,count:null,dia:null,width,height,source:"خروجی طراحی موجود نیست"};
  });
 }
 function checkSelectedTieFootingClash(base,route,mode,footingSpecs,tie,tieRow,model){
  if(!base||!route)return{ok:false,reason:"برای کنترل برخورد، یک فونداسیون و یک شناژ انتخاب کنید."};
  const B=num(state.footingWidthM),L=num(state.footingLengthM),T=num(state.footingThicknessM),cover=state.rebarCoverMm===""?null:Number(state.rebarCoverMm);
  if(!(B>0&&L>0&&T>0&&cover!==null&&cover>=0))return{ok:false,reason:"برای کنترل سه‌بعدی، ابعاد پی و پوشش بتن واقعی را وارد کنید."};
  if(!footingSpecs?.specs?.length)return{ok:false,reason:"شبکه میلگرد فونداسیون برای کنترل برخورد تعریف نشده است."};
  const nodes=new Map((model.nodes||[]).map(n=>[String(n.id),n])),a=nodes.get(String(route.start)),b=nodes.get(String(route.end));
  if(!a||!b)return{ok:false,reason:"مختصات دو انتهای شناژ در مدل موجود نیست."};
  if(String(base.nodeId||base.id)!==String(route.start)&&String(base.nodeId||base.id)!==String(route.end))return{ok:false,reason:"فونداسیون انتخاب‌شده در ابتدا یا انتهای این مسیر شناژ نیست؛ کنترل این اتصال در این مرحله انجام نمی‌شود."};
  const dx=Number(b.x)-Number(a.x),dz=Number(b.z)-Number(a.z),length=Math.hypot(dx,dz);
  if(!(length>0))return{ok:false,reason:"طول افقی مسیر شناژ معتبر نیست."};
  const ux=dx/length,uz=dz/length,vx=uz,vz=-ux;
  const halfProjection=(Math.abs(ux)*B+Math.abs(uz)*L)/2;
  const start={x:Number(a.x)-ux*halfProjection,y:Number(a.y),z:Number(a.z)-uz*halfProjection};
  const end={x:Number(b.x)+ux*halfProjection,y:Number(b.y),z:Number(b.z)+uz*halfProjection};
  const tieSettings=window.SteelTieBeamReinforcement?.getData?.()?.settings||{};
  const barDia=Number(tie?.dia)||16,stirrupDia=Number(tie?.stirrupDia)||10,width=Number(tie?.width),height=Number(tie?.height);
  if(!(width>0&&height>0&&barDia>0))return{ok:false,reason:"ابعاد یا قطر میلگرد شناژ معتبر نیست."};
  let coordinates=null;
  if(mode==="design"){
   coordinates=Array.isArray(tieRow?.barLayer?.coordinates)?tieRow.barLayer.coordinates:null;
   if(!coordinates?.length)return{ok:false,reason:"مختصات واقعی لایه‌های میلگرد خروجی طراحی شناژ موجود نیست؛ کنترل برخورد انجام نشد."};
  }else{
   const cov=Number(tieSettings.coverMm)||40,first=cov+stirrupDia+barDia/2,last=width*1000-first;
   if(last<first)return{ok:false,reason:"عرض شناژ برای آرایش پیش‌فرض سه میلگرد در هر وجه کافی نیست."};
   coordinates=[];
   for(const face of ["bottom","top"])for(let i=0;i<3;i++)coordinates.push({xMm:first+(last-first)*i/2,yMm:face==="bottom"?first:height*1000-first,face});
  }
  const tieBars=coordinates.map((p,i)=>{
   const cross=(Number(p.xMm)-width*500)/1000;
   const vertical=Number(p.yMm)/1000-height/2;
   return{id:String(route.id)+"-L"+(i+1),diameterMm:barDia,
    a:{x:start.x+vx*cross,y:start.y+vertical,z:start.z+vz*cross},
    b:{x:end.x+vx*cross,y:end.y+vertical,z:end.z+vz*cross}};
  });
  const grid=buildFootingRebarGeometry([{nodeId:String(base.nodeId||base.id),x:Number(base.x),y:Number(base.y),z:Number(base.z)}],B,L,T,cover,footingSpecs.specs);
  if(!grid.ok)return grid;
  const checker=window.SteelTieBeamReinforcement?.checkFootingBarClearance;
  if(typeof checker!=="function")return{ok:false,reason:"ماژول کنترل فاصله سه‌بعدی میلگردها در دسترس نیست."};
  const result=checker(tieBars,grid.bars,0);
  return{...result,tieBarCount:tieBars.length,footingBarCount:grid.count,clearanceCriterion:"فقط عدم تماس/تقاطع هندسی (فاصله آزاد لازم آیین‌نامه‌ای هنوز اعمال نشده است).",assumptions:"شناژ مستقیم بین دو پایه، عبور میلگردها از محور مسیر، امتداد تا وجه بیرونی پی بر اساس تصویر نیم‌بعد مستطیل پی روی محور شناژ، بدون خم/قلاب/وصله/مهاری. شبکه پی بر مبنای گره پایه به‌عنوان تراز رویه پی ساخته شده است."};
 }
 function renderRebarDrawing(){
  const host=$("rebarDrawingCanvas"),summary=$("rebarDrawingSummary"),mode=$("rebarDrawingMode")?.value||"default";
  if(!host||!summary)return;
  readInputs();
  const B=num(state.footingWidthM),L=num(state.footingLengthM),T=num(state.footingThicknessM),cover=state.rebarCoverMm===""?null:Number(state.rebarCoverMm);
  const model=window.SteelStructuralModel?.getData?.()||{},layout=window.SteelTieBeamLayout?.getData?.()||{};
  const bases=lastReport?.rows?.length?lastReport.rows:(model.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
  const routes=Array.isArray(layout.routes)?layout.routes:[];
  const footingSelect=$("footingRebarTarget"),tieSelect=$("tieRebarTarget");
  const previousFooting=footingSelect?.value||"",previousTie=tieSelect?.value||"";
  const baseId=n=>String(n.nodeId||n.id);
  if(footingSelect){
   const opts=bases.map(n=>({id:baseId(n),label:baseId(n)+" ("+Number(n.x).toFixed(2)+", "+Number(n.z).toFixed(2)+")"}));
   footingSelect.innerHTML=opts.map(o=>'<option value="'+o.id.replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'">'+o.label+'</option>').join("")||'<option value="">گره پایه موجود نیست</option>';
   footingSelect.value=opts.some(o=>o.id===previousFooting)?previousFooting:(opts[0]?.id||"");
  }
  if(tieSelect){
   tieSelect.innerHTML=routes.map(r=>'<option value="'+String(r.id).replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'">'+String(r.id)+'</option>').join("")||'<option value="">مسیر شناژ موجود نیست</option>';
   tieSelect.value=routes.some(r=>String(r.id)===previousTie)?previousTie:(routes[0]?.id||"");
  }
  const selectedBase=bases.find(n=>baseId(n)===(footingSelect?.value||""))||bases[0];
  const selectedRoute=routes.find(r=>String(r.id)===(tieSelect?.value||""))||routes[0];
  const footingSpecs=drawingFootingSpecs(mode),tieSpecs=drawingTieSpecs(mode,selectedRoute?[selectedRoute]:[]);
  const tie=tieSpecs[0]||null;
  const tieReport=window.SteelTieBeamReinforcement?.getLast?.();
  const tieRow=(tieReport?.rows||[]).find(r=>String(r.id)===String(selectedRoute?.id));
  const clash=checkSelectedTieFootingClash(selectedBase,selectedRoute,mode,footingSpecs,tie,tieRow,model);
  const nodeMap=new Map((model.nodes||[]).map(n=>[String(n.id),n]));
  const a=selectedRoute?nodeMap.get(String(selectedRoute.start)):null,b=selectedRoute?nodeMap.get(String(selectedRoute.end)):null;
  const routeLength=a&&b?Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y),Number(b.z)-Number(a.z)):null;
  const missing=[];
  if(!(B>0&&L>0&&T>0))missing.push("ابعاد واقعی پی برای ترسیم کامل وارد نشده است.");
  if(!selectedBase)missing.push("گره پایه‌ای برای انتخاب فونداسیون وجود ندارد.");
  if(mode==="design"&&!footingSpecs.specs.length)missing.push("داده شبکه طراحی فونداسیون موجود نیست.");
  if(mode==="design"&&tie?.count===null)missing.push("گزارش طراحی شناژ انتخاب‌شده موجود نیست.");
  const esc=s=>String(s??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const fmtSvg=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:2});
  const svg=[];
  svg.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1100" width="100%" role="img" aria-label="جزئیات جداگانه قفس آرماتور فونداسیون و شناژ">');
  svg.push('<rect width="1000" height="800" fill="#f8fafc"/>');
  const panel=(x,y,w,h,title)=>{svg.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="#fff" stroke="#94a3b8"/>');svg.push('<text x="'+(x+w/2)+'" y="'+(y+24)+'" text-anchor="middle" font-size="17" fill="#123b52">'+title+'</text>');};
  panel(20,40,465,330,"پلان فونداسیون انتخاب‌شده");
  panel(515,40,465,330,"مقطع فونداسیون انتخاب‌شده");
  panel(20,390,465,370,"مقطع شناژ انتخاب‌شده");
  panel(515,390,465,370,"نمای طولی قفس آرماتور شناژ");
  if(selectedBase&&B>0&&L>0&&footingSpecs.specs.length){
   const x0=105,y0=105,w=295,h=210;
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   footingSpecs.specs.forEach(sp=>{
    const dim=sp.direction==="X"?L:B,available=Math.max(0,dim*1000-2*(cover??0));
    const count=Math.max(1,Math.floor(available/sp.spacingMm+1e-9)+1);
    for(let i=0;i<count;i++){
     const p=count===1?0:i/(count-1);
     if(sp.direction==="X"){const y=y0+8+p*(h-16);svg.push('<line x1="'+(x0+8)+'" y1="'+y+'" x2="'+(x0+w-8)+'" y2="'+y+'" stroke="'+(sp.layer==="bottom"?"#dc2626":"#2563eb")+'" stroke-width="2"/>');}
     else{const x=x0+8+p*(w-16);svg.push('<line x1="'+x+'" y1="'+(y0+8)+'" x2="'+x+'" y2="'+(y0+h-8)+'" stroke="'+(sp.layer==="bottom"?"#dc2626":"#2563eb")+'" stroke-width="2"/>');}
    }
   });
   svg.push('<text x="252" y="340" text-anchor="middle" font-size="12" fill="#334155">'+esc(baseId(selectedBase))+' | '+fmtSvg(B)+' × '+fmtSvg(L)+' m</text>');
  }else svg.push('<text x="252" y="205" text-anchor="middle" font-size="14" fill="#64748b">'+(mode==="design"?"شبکه طراحی‌شده موجود نیست":"ابعاد یا گره پایه موجود نیست")+'</text>');
  if(B>0&&T>0&&footingSpecs.specs.length){
   const x0=610,y0=115,w=270,h=165;
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   const bottom=footingSpecs.specs.filter(s=>s.layer==="bottom"),top=footingSpecs.specs.filter(s=>s.layer==="top");
   if(bottom.length)svg.push('<line x1="'+(x0+12)+'" y1="'+(y0+h-22)+'" x2="'+(x0+w-12)+'" y2="'+(y0+h-22)+'" stroke="#dc2626" stroke-width="4"/>');
   if(top.length)svg.push('<line x1="'+(x0+12)+'" y1="'+(y0+22)+'" x2="'+(x0+w-12)+'" y2="'+(y0+22)+'" stroke="#2563eb" stroke-width="4"/>');
   svg.push('<text x="745" y="310" text-anchor="middle" font-size="12" fill="#334155">ضخامت '+fmtSvg(T)+' m | '+(top.length?"شبکه بالا و پایین":"فقط شبکه تحتانی")+'</text>');
  }else svg.push('<text x="747" y="205" text-anchor="middle" font-size="14" fill="#64748b">اطلاعات مقطع فونداسیون کافی نیست</text>');
  if(tie&&tie.count!==null&&tie.width>0&&tie.height>0){
   const x0=105,y0=455,w=295,h=210,pad=28,st=Number(tie.stirrupDia)||10;
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   svg.push('<rect x="'+(x0+pad)+'" y="'+(y0+pad)+'" width="'+(w-2*pad)+'" height="'+(h-2*pad)+'" rx="10" fill="none" stroke="#0f766e" stroke-width="4"/>');
   const coords=mode==="design"&&Array.isArray(tieRow?.barLayer?.coordinates)?tieRow.barLayer.coordinates:null;
   if(coords?.length){
    const minX=Math.min(...coords.map(p=>p.xMm)),maxX=Math.max(...coords.map(p=>p.xMm)),minY=Math.min(...coords.map(p=>p.yMm)),maxY=Math.max(...coords.map(p=>p.yMm));
    coords.forEach(p=>{const cx=x0+pad+8+(maxX===minX?0:(p.xMm-minX)/(maxX-minX)*(w-2*pad-16)),cy=y0+pad+8+(maxY===minY?0:(p.yMm-minY)/(maxY-minY)*(h-2*pad-16));svg.push('<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="#dc2626"/>');});
   }else{
    for(let i=0;i<tie.count;i++){const cx=x0+pad+12+(tie.count===1?0:i*(w-2*pad-24)/(tie.count-1));svg.push('<circle cx="'+cx+'" cy="'+(y0+pad+8)+'" r="6" fill="#dc2626"/><circle cx="'+cx+'" cy="'+(y0+h-pad-8)+'" r="6" fill="#dc2626"/>');}
   }
   svg.push('<text x="252" y="705" text-anchor="middle" font-size="12" fill="#334155">'+esc(tie.route.id)+' | '+tie.count+' بالا + '+tie.count+' پایین Ø'+tie.dia+' | خاموت Ø'+st+'</text>');
  }else svg.push('<text x="252" y="565" text-anchor="middle" font-size="14" fill="#64748b">'+(mode==="design"?"گزارش طراحی این شناژ موجود نیست":"شناژ برای نمایش موجود نیست")+'</text>');
  if(tie&&tie.count!==null&&routeLength>0){
   const x0=585,y0=490,w=325,h=125,st=Number(tie.stirrupDia)||10;
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   svg.push('<line x1="'+(x0+12)+'" y1="'+(y0+25)+'" x2="'+(x0+w-12)+'" y2="'+(y0+25)+'" stroke="#dc2626" stroke-width="4"/>');
   svg.push('<line x1="'+(x0+12)+'" y1="'+(y0+h-25)+'" x2="'+(x0+w-12)+'" y2="'+(y0+h-25)+'" stroke="#dc2626" stroke-width="4"/>');
   const spacing=mode==="design"?(Number(tieRow?.stirrup?.detail?.actualSpacingMm)||Number(tieRow?.stirrup?.steelOnlySpacingMm)||200):(Number(selectedRoute.reinforcement?.stirrupSpacingMm)||200);
   const n=Math.min(60,Math.max(2,Math.floor(routeLength*1000/spacing)+1));
   for(let i=0;i<n;i++){const x=x0+12+i*(w-24)/(n-1);svg.push('<line x1="'+x+'" y1="'+(y0+8)+'" x2="'+x+'" y2="'+(y0+h-8)+'" stroke="#0f766e" stroke-width="2"/>');}
   svg.push('<text x="747" y="650" text-anchor="middle" font-size="12" fill="#334155">'+esc(tie.route.id)+' | طول '+fmtSvg(routeLength)+' m | خاموت Ø'+st+' @'+fmtSvg(spacing)+' mm</text>');
  }else svg.push('<text x="747" y="555" text-anchor="middle" font-size="14" fill="#64748b">مختصات مسیر یا داده آرماتور شناژ موجود نیست</text>');

  // Interactive isometric overview: dimensions and node positions come only from the active model inputs.
  panel(20,810,960,260,"نمای سه‌بعدی شماتیک فونداسیون و شناژ — چرخش و بزرگ‌نمایی");
  const isoControls='<div class="button-grid" style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn secondary" data-iso="left">چرخش چپ</button><button type="button" class="btn secondary" data-iso="right">چرخش راست</button><button type="button" class="btn secondary" data-iso="in">بزرگ‌نمایی +</button><button type="button" class="btn secondary" data-iso="out">کوچک‌نمایی −</button><button type="button" class="btn secondary" data-iso="reset">نمای اولیه</button></div>';
  const clashStatus=Number.isFinite(clash?.minimumClearDistanceMm)
   ?(clash.ok?"کنترل هندسی: بدون تقاطع | حداقل فاصله آزاد "+fmtSvg(clash.minimumClearDistanceMm)+" mm":"هشدار برخورد: "+clash.conflictPairs+" جفت | "+(clash.criticalPair?.tieBar||"شناژ")+" ↔ "+(clash.criticalPair?.footingBar||"شبکه پی"))
   :(clash?.reason||"کنترل برخورد به داده‌های کامل نیاز دارد.");
  svg.push('<text x="500" y="840" text-anchor="middle" font-size="13" font-weight="bold" fill="'+(Number.isFinite(clash?.minimumClearDistanceMm)?(clash.ok?"#047857":"#b91c1c"):"#92400e")+'">'+esc(clashStatus)+'</text>');
  const projectIso=(x,y,z)=>{
   const a=rebarIsoView.angle,ca=Math.cos(a),sa=Math.sin(a),rx=x*ca-z*sa,rz=x*sa+z*ca;
   const sc=105*rebarIsoView.zoom;
   return{x:500+(rx-rz)*0.72*sc,y:940+(rx+rz)*0.34*sc-y*0.92*sc};
  };
  const isoLine=(p1,p2,color,width=3,dash="")=>{const a=projectIso(p1.x,p1.y,p1.z),b=projectIso(p2.x,p2.y,p2.z);svg.push('<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+color+'" stroke-width="'+width+'" '+(dash?'stroke-dasharray="'+dash+'"':'')+'/>');};
  const isoPoly=(pts,fill,stroke="#475569")=>{svg.push('<polygon points="'+pts.map(p=>{const q=projectIso(p.x,p.y,p.z);return q.x+","+q.y;}).join(" ")+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.5"/>');};
  const isoBox=(cx,cy,cz,sx,sy,sz,fill)=>{
   const x0=cx-sx/2,x1=cx+sx/2,z0=cz-sz/2,z1=cz+sz/2,y0=cy-sy,y1=cy;
   isoPoly([{x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y0,z:z1},{x:x0,y:y0,z:z1}],fill);
   isoPoly([{x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y1,z:z0},{x:x0,y:y1,z:z0}],"#cbd5e1");
   isoPoly([{x:x1,y:y0,z:z0},{x:x1,y:y0,z:z1},{x:x1,y:y1,z:z1},{x:x1,y:y1,z:z0}],"#94a3b8");
  };
  if(selectedBase&&selectedRoute&&a&&b&&B>0&&L>0&&T>0&&tie&&tie.count!==null){
   const ux=(Number(b.x)-Number(a.x))/Math.max(0.001,Math.hypot(Number(b.x)-Number(a.x),Number(b.z)-Number(a.z)));
   const uz=(Number(b.z)-Number(a.z))/Math.max(0.001,Math.hypot(Number(b.x)-Number(a.x),Number(b.z)-Number(a.z)));
   const vx=uz,vz=-ux,beamW=tie.width||Number(state.tieWidthM)||0.6,beamH=tie.height||Number(state.tieHeightM)||0.5;
   const pA={x:Number(a.x),y:Number(a.y),z:Number(a.z)},pB={x:Number(b.x),y:Number(b.y),z:Number(b.z)};
   const drawFoot=(p)=>{
    isoBox(p.x,p.y,p.z,B,T,L,"#cbd5e1");
    const grid=buildFootingRebarGeometry([{nodeId:"iso",x:p.x,y:p.y,z:p.z}],B,L,T,cover??50,footingSpecs.specs);
    if(grid.ok)grid.bars.forEach(bar=>isoLine(bar.a,bar.b,bar.layer==="bottom"?"#dc2626":"#2563eb",2));
   };
   drawFoot(pA);drawFoot(pB);
   const halfProjection=(Math.abs(ux)*B+Math.abs(uz)*L)/2;const start={x:pA.x+ux*halfProjection,y:pA.y,z:pA.z+uz*halfProjection},end={x:pB.x-ux*halfProjection,y:pB.y,z:pB.z-uz*halfProjection};
   const corners=[
    {x:start.x+vx*beamW/2,y:start.y,z:start.z+vz*beamW/2},
    {x:end.x+vx*beamW/2,y:end.y,z:end.z+vz*beamW/2},
    {x:end.x-vx*beamW/2,y:end.y,z:end.z-vz*beamW/2},
    {x:start.x-vx*beamW/2,y:start.y,z:start.z-vz*beamW/2}
   ];
   const top=corners.map(p=>({x:p.x,y:p.y,z:p.z}));
   const bot=corners.map(p=>({x:p.x,y:p.y-beamH,z:p.z}));
   isoPoly(top,"#dbeafe");for(let j=0;j<4;j++)isoPoly([top[j],top[(j+1)%4],bot[(j+1)%4],bot[j]],"#cbd5e1");
   const tieSettingsForIso=window.SteelTieBeamReinforcement?.getData?.()?.settings||{};const cov=(Number(tieSettingsForIso.coverMm)||40)/1000,barYtop=start.y-cov,barYbot=start.y-beamH+cov;
   for(let k=0;k<tie.count;k++){
    const off=(tie.count===1?0:(k/(tie.count-1)-0.5)*(beamW-2*cov));
    for(const yy of [barYtop,barYbot])isoLine({x:start.x+vx*off,y:yy,z:start.z+vz*off},{x:end.x+vx*off,y:yy,z:end.z+vz*off},"#dc2626",3);
   }
   const spacing=(Number(selectedRoute.reinforcement?.stirrupSpacingMm)||200)/1000,n=Math.min(35,Math.max(2,Math.floor(Math.hypot(pB.x-pA.x,pB.z-pA.z)/Math.max(spacing,0.05))+1));
   for(let i=0;i<n;i++){
    const t=i/(n-1),cx=start.x+(end.x-start.x)*t,cz=start.z+(end.z-start.z)*t,yy=start.y-cov;
    const q=[{x:cx+vx*(beamW/2-cov),y:yy,z:cz+vz*(beamW/2-cov)},{x:cx+vx*(beamW/2-cov),y:yy-beamH+2*cov,z:cz+vz*(beamW/2-cov)},{x:cx-vx*(beamW/2-cov),y:yy-beamH+2*cov,z:cz-vz*(beamW/2-cov)},{x:cx-vx*(beamW/2-cov),y:yy,z:cz-vz*(beamW/2-cov)}];
    for(let j=0;j<4;j++)isoLine(q[j],q[(j+1)%4],"#0f766e",2);
   }
   if(clash?.criticalPair?.tiePoint&&clash?.criticalPair?.footingPoint){
    const cp=clash.criticalPair,ta=projectIso(cp.tiePoint.x,cp.tiePoint.y,cp.tiePoint.z),fb=projectIso(cp.footingPoint.x,cp.footingPoint.y,cp.footingPoint.z),mc=cp.clearDistanceMm<0?"#dc2626":"#d97706";
    svg.push('<line x1="'+ta.x+'" y1="'+ta.y+'" x2="'+fb.x+'" y2="'+fb.y+'" stroke="'+mc+'" stroke-width="4" stroke-dasharray="5 3"/>');
    [ta,fb].forEach(q=>svg.push('<circle cx="'+q.x+'" cy="'+q.y+'" r="9" fill="#fff" stroke="'+mc+'" stroke-width="3"/>'));
    svg.push('<text x="'+Math.min(900,Math.max(100,(ta.x+fb.x)/2+18))+'" y="'+Math.max(875,(ta.y+fb.y)/2-14)+'" font-size="12" font-weight="bold" fill="'+mc+'">نزدیک‌ترین فاصله: '+fmtSvg(cp.clearDistanceMm)+' mm</text>');
   }
   svg.push('<text x="500" y="1060" text-anchor="middle" font-size="12" fill="#334155">پی‌ها و مسیر از مدل انتخابی | شبکه پی: '+(mode==="default"?"پیش‌فرض":"داده طراحی")+' | قفس شناژ: '+tie.count+' میلگرد بالا و '+tie.count+' پایین</text>');
  }else{
   svg.push('<text x="500" y="940" text-anchor="middle" font-size="16" fill="#64748b">برای نمای سه‌بعدی، دو گره مسیر، ابعاد پی و داده آرماتور معتبر لازم است.</text>');
  }

  svg.push('<text x="500" y="785" text-anchor="middle" font-size="11" fill="#64748b">ترسیم شماتیک؛ بدون خم، قلاب، وصله، مهاری و کنترل نهایی اجرایی. فاصله خاموت 200 میلی‌متر در حالت پیش‌فرض موقت است.</text>');
  svg.push('</svg>');
  host.innerHTML=isoControls+svg.join("");
  host.querySelectorAll("[data-iso]").forEach(btn=>btn.addEventListener("click",()=>{
   const action=btn.getAttribute("data-iso");
   if(action==="left")rebarIsoView.angle-=Math.PI/12;
   if(action==="right")rebarIsoView.angle+=Math.PI/12;
   if(action==="in")rebarIsoView.zoom=Math.min(1.8,rebarIsoView.zoom*1.15);
   if(action==="out")rebarIsoView.zoom=Math.max(0.55,rebarIsoView.zoom/1.15);
   if(action==="reset")rebarIsoView={angle:0,zoom:1};
   renderRebarDrawing();
  }));
  const footingLabel=footingSpecs.specs.length?footingSpecs.specs.map(s=>(s.layer==="bottom"?"تحتانی":"فوقانی")+" "+s.direction+" Ø"+s.diaMm+" @"+fmtSvg(s.spacingMm)).join("؛ "):"شبکه فونداسیون موجود نیست";
  const tieLabel=tie?(tie.count===null?"خروجی طراحی شناژ موجود نیست":tie.route.id+": "+tie.count+" بالا و "+tie.count+" پایین Ø"+tie.dia+"، خاموت Ø"+(tie.stirrupDia||10)):"شناژ ثبت نشده";
  const clashLabel=Number.isFinite(clash.minimumClearDistanceMm)?(clash.ok?"کنترل هندسی اتصال: بدون تقاطع؛ حداقل فاصله آزاد "+fmtSvg(clash.minimumClearDistanceMm)+" mm ("+clash.pairsChecked+" جفت میلگرد بررسی شد).":"هشدار: "+clash.conflictPairs+" جفت میلگرد دارای تقاطع/فاصله ناکافی؛ زوج بحرانی "+(clash.criticalPair?.tieBar||"شناژ")+" و "+(clash.criticalPair?.footingBar||"شبکه پی")):(clash.reason||"کنترل برخورد انجام نشد.");
  summary.textContent=(mode==="default"?"حالت پیش‌فرض اجرایی؛ ":"حالت طراحی؛ ")+"پی انتخابی "+(selectedBase?baseId(selectedBase):"نامشخص")+" | "+footingLabel+" | "+tieLabel+" | "+footingSpecs.basis+" | "+clashLabel+(cover===null?" پوشش بتن وارد نشده؛ جانمایی میلگردها در تصویر شماتیک است.":"")+(missing.length?" هشدار: "+missing.join(" "):"");
 }

 function getData(){readInputs();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;keys.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];const el=$(map[k]);if(el)el.value=state[k]??"";});}
 document.addEventListener("DOMContentLoaded",()=>{panel();$("ftClass")?.addEventListener("change",e=>applyFootingClass(e.target.value));});
 window.SteelFoundationTakeoff={getData,setData,extract,quantify,buildFootingRebarGeometry,footingGridSpecs,footingDatumGeometry,applyFootingClass,checkTieBeamRebarClearance,checkSelectedTieFootingClash,renderRebarDrawing,selfTest,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
})();