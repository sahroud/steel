/* SAHROUD STEEL - Full shed geometry model 1.0 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  let model = null, originalDrawFrame = null, progressRunning = false;
  function runWithProgress(startLabel, task, onError) {
    if (progressRunning) return;
    progressRunning = true;
    const panel = $("modelProgress"), text = $("modelProgressText"), elapsed = $("modelProgressElapsed");
    const buttons = ["btnBuildFullModel", "btnCheck3DSections", "btnRunFull3D", "btnTestSpan10"];
    const started = performance.now();
    buttons.forEach(id => { if ($(id)) $(id).disabled = true; });
    if (panel) panel.hidden = false;
    if (text) text.textContent = startLabel;
    if (elapsed) elapsed.textContent = "۰٫۰ ثانیه";
    const timer = setInterval(() => {
      if (elapsed) elapsed.textContent = ((performance.now() - started) / 1000).toFixed(1).replace(".", "٫") + " ثانیه";
    }, 250);
    const stage = message => { if (text) text.textContent = message; };
    // دو فریم به مرورگر فرصت می‌دهیم نوار را واقعاً رسم کند؛ سپس محاسبات سنگین آغاز می‌شود.
    (async () => {
      // ابتدا دو فریم و سپس یک مکث کوتاه؛ تا مرورگر فرصت قطعی برای paint نوار داشته باشد.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 180))));
      try { await task(stage); }
      catch (error) { if (typeof onError === "function") onError(error); }
      finally {
        clearInterval(timer);
        const duration = (performance.now() - started) / 1000;
        if (text) text.textContent = "عملیات پایان یافت";
        if (elapsed) elapsed.textContent = duration.toFixed(2).replace(".", "٫") + " ثانیه";
        buttons.forEach(id => { if ($(id)) $(id).disabled = false; });
        progressRunning = false;
        // نتیجه برای لحظه‌ای خوانا می‌ماند و سپس نوار از صفحه جمع می‌شود.
        setTimeout(() => { if (panel) panel.hidden = true; }, 650);
      }
    })();
  }
  function ensurePanel() {
    if ($("shedLayoutPanel")) return;
    const drawingPanel = Array.from(document.querySelectorAll("main .panel")).find(p => p.querySelector("#frameDrawing"));
    if (!drawingPanel) return;
    const panel = document.createElement("section");
    panel.className = "panel"; panel.id = "shedLayoutPanel";
    panel.innerHTML = '<div class="panel-title"><h3>مدل هندسی کامل سوله</h3><span class="status">جانمایی اجزا</span></div>' +
      '<div class="notice">فاصله‌ها و تعداد اعضای فرعی برای تولید مدل هندسی استفاده می‌شوند. مقادیر پیش‌فرض صرفاً برای شروع مدل هستند و باید با نقشه اجرایی تطبیق داده شوند.</div>' +
      '<h4>هندسه مقدماتی تیر حمال جرثقیل</h4><div class="notice">فاصله محور تیر حمال از محور ستون و نوع اتصال باید از نقشه/جزئیات پروژه تعیین شود. این ورودی‌ها فقط هندسه و مشخصات را ثبت می‌کنند و هنوز وارد حل‌گر نمی‌شوند.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayAxisOffset">فاصله افقی محور تیر حمال از محور ستون (m)</label><input id="craneRunwayAxisOffset" type="number" min="0.05" step="0.01" placeholder="از نقشه وارد شود"></div>' +
      '<div class="field"><label for="craneRunwaySupportType">نوع اتصال تیر حمال به قاب</label><select id="craneRunwaySupportType"><option value="">انتخاب نشده</option><option value="simple">ساده / مفصلی</option><option value="moment">گیردار / انتقال لنگر</option><option value="spring">نیمه‌گیردار / فنری</option></select></div></div>' +
      '<h4>ورودی مقطع و اتصال برای شبکه واقعی سه‌بعدی</h4><div class="notice">برای افزودن واقعی تیر حمال و براکت به مدل FEM، خواص مقطع و آزادسازی انتهایی را با واحد SI و مرجع نقشه وارد کنید. تا تکمیل این ورودی‌ها اعضا به حل‌گر افزوده نمی‌شوند.</div><div class="field"><label for="crane3DIntegrationJson">تعریف JSON مقطع تیر حمال، براکت و اتصالات</label><textarea id="crane3DIntegrationJson" rows="9" placeholder=&quot;JSON شامل خواص دو مقطع، آزادسازی‌ها، مراجع نقشه، verticalReactionOffset_m، horizontalWheelOffset_m و horizontalApplicationSides&quot;></textarea></div><div id="crane3DIntegrationAudit" class="notice">ورودی یکپارچه‌سازی سه‌بعدی هنوز ثبت نشده است.</div>' +
      '<h4>مشخصات مقدماتی مقطع تیر حمال و ریل</h4><div class="notice">ابعاد باید از نقشه سازنده یا طراحی اولیه وارد شوند. فیلدهای خالی عمداً پیش‌فرض ندارند. این داده‌ها برای ممیزی مقدماتی‌اند و تا تکمیل کنترل‌ها برای تحلیل فعال نمی‌شوند.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayGirderType">نوع تیر حمال</label><select id="craneRunwayGirderType"><option value="">انتخاب نشده</option><option value="builtup-i">تیرورق I ساخته‌شده</option><option value="rolled-i">مقطع I نوردشده</option><option value="box">مقطع جعبه‌ای</option></select></div>' +
      '<div class="field"><label for="craneRunwaySteelGrade">گرید فولاد تیر حمال</label><select id="craneRunwaySteelGrade"><option value="ST37" selected>ST37 (پیش‌فرض)</option><option value="ST52">ST52</option><option value="other">سایر / نیازمند تعریف</option></select></div>' +
      '<div class="field"><label for="craneRunwayOverallDepth">ارتفاع کل تیر حمال (mm)</label><input id="craneRunwayOverallDepth" type="number" min="1" step="1" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayFlangeWidth">عرض بال (mm)</label><input id="craneRunwayFlangeWidth" type="number" min="1" step="1" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayFlangeThickness">ضخامت بال (mm)</label><input id="craneRunwayFlangeThickness" type="number" min="1" step="0.5" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayWebThickness">ضخامت جان (mm)</label><input id="craneRunwayWebThickness" type="number" min="1" step="0.5" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayRailDesignation">مشخصه/مدل ریل</label><input id="craneRunwayRailDesignation" type="text" placeholder="طبق کاتالوگ سازنده"></div>' +
      '<div class="field"><label for="craneRunwayRailMass">جرم ریل (kg/m)</label><input id="craneRunwayRailMass" type="number" min="0.1" step="0.1" placeholder="از کاتالوگ"></div>' +
      '<div class="field"><label for="craneRunwayRailFastening">روش اتصال ریل</label><select id="craneRunwayRailFastening"><option value="">انتخاب نشده</option><option value="clip">کلیپس/بست ریل</option><option value="welded">جوشی</option><option value="bolted">پیچی</option><option value="other">سایر</option></select></div>' +
      '<div class="field"><label for="craneRunwayStiffenerSpacing">فاصله سخت‌کننده‌های جان (m)</label><input id="craneRunwayStiffenerSpacing" type="number" min="0.05" step="0.05" placeholder="از طراحی"></div>' +
      '<div class="field"><label for="craneRunwayLateralRestraint">وضعیت مهار جانبی بال فشاری</label><select id="craneRunwayLateralRestraint"><option value="">نامشخص</option><option value="rail-only">فقط ریل (بدون تأیید مهار)</option><option value="dedicated">مهار جانبی مستقل مستند</option><option value="none">بدون مهار جانبی</option></select></div>' +
      '<div class="field"><label for="craneRunwayDetailSource">مرجع نقشه/کاتالوگ مقطع و ریل</label><input id="craneRunwayDetailSource" type="text" placeholder="شماره نقشه، صفحه یا کاتالوگ"></div></div>' +
      '<div id="craneRunwaySectionAudit" class="notice">ممیزی مشخصات تیر حمال هنوز انجام نشده است.</div>' +
      '<h4>سخت‌کننده‌ها و ناحیه بار چرخ</h4><div class="notice">ابعاد و جزئیات باید از نقشه ساخت یا طراحی محاسباتی وارد شوند. این بخش فعلاً ممیزی هندسی/اطلاعاتی است، نه کنترل ظرفیت جان.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayEndStiffenerType">نوع سخت‌کننده انتهایی</label><select id="craneRunwayEndStiffenerType"><option value="">انتخاب نشده</option><option value="pair">جفت ورق دو طرف جان</option><option value="single">تک ورق</option><option value="other">سایر</option></select></div>' +
      '<div class="field"><label for="craneRunwayIntermediateStiffenerType">نوع سخت‌کننده میانی</label><select id="craneRunwayIntermediateStiffenerType"><option value="">انتخاب نشده</option><option value="pair">جفت ورق دو طرف جان</option><option value="single">تک ورق</option><option value="none">بدون سخت‌کننده میانی</option></select></div>' +
      '<div class="field"><label for="craneRunwayStiffenerWidth">عرض ورق سخت‌کننده (mm)</label><input id="craneRunwayStiffenerWidth" type="number" min="1" step="1" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayStiffenerThickness">ضخامت ورق سخت‌کننده (mm)</label><input id="craneRunwayStiffenerThickness" type="number" min="1" step="0.5" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayStiffenerWeldSize">اندازه گلوی جوش (mm)</label><input id="craneRunwayStiffenerWeldSize" type="number" min="1" step="0.5" placeholder="طبق جزئیات جوش"></div>' +
      '<div class="field"><label for="craneRunwayBearingLength">طول نشیمن/پخش بار چرخ (mm)</label><input id="craneRunwayBearingLength" type="number" min="1" step="1" placeholder="طبق ریل و جزئیات"></div>' +
      '<div class="field"><label for="craneRunwayWheelLoadOffset">فاصله محور بار چرخ از محور جان (mm)</label><input id="craneRunwayWheelLoadOffset" type="number" step="1" placeholder="علامت‌دار طبق نقشه"></div>' +
      '<div class="field"><label for="craneRunwayStiffenerSource">مرجع نقشه سخت‌کننده/جوش/نشیمن</label><input id="craneRunwayStiffenerSource" type="text" placeholder="شماره نقشه و جزئیات"></div></div>' +
      '<div id="craneRunwayWebAudit" class="notice">ممیزی سخت‌کننده و جان هنوز انجام نشده است.</div>' +
      '<h4>هندسه ریل و سطح تماس بار چرخ</h4><div class="notice">ابعاد از کاتالوگ ریل و سازنده جرثقیل وارد شود؛ این اطلاعات برای تعریف مسیر بار لازم است و به‌تنهایی ظرفیت یا توزیع تنش را تعیین نمی‌کند.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailHeight">ارتفاع کل ریل (mm)</label><input id="craneRunwayRailHeight" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayRailBaseWidth">عرض کف ریل (mm)</label><input id="craneRunwayRailBaseWidth" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayRailFootThickness">ضخامت کف ریل (mm)</label><input id="craneRunwayRailFootThickness" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayRailPadThickness">ضخامت پد زیر ریل (mm)</label><input id="craneRunwayRailPadThickness" type="number" min="0" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayFasteningSpacing">فاصله بست‌های ریل (mm)</label><input id="craneRunwayFasteningSpacing" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayWheelContactWidth">عرض تماس چرخ (mm)</label><input id="craneRunwayWheelContactWidth" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayWheelContactLength">طول تماس مؤثر چرخ (mm)</label><input id="craneRunwayWheelContactLength" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayLoadPathSource">مرجع مقطع ریل/تماس چرخ</label><input id="craneRunwayLoadPathSource" type="text" placeholder="کاتالوگ ریل و سازنده جرثقیل"></div></div>' +
      '<div id="craneRunwayLoadPathAudit" class="notice">ممیزی هندسه ریل و تماس چرخ هنوز انجام نشده است.</div>' +
      '<h4>جزئیات اتصال ریل، بست‌ها و پد زیر ریل</h4><div class="notice">مشخصات واقعی اتصال باید از نقشه اجرایی و کاتالوگ سازنده وارد شود. این بخش فقط کامل‌بودن و سازگاری اولیه داده‌ها را ممیزی می‌کند؛ نیروی هر بست، فشار پد، ظرفیت پیچ/گیره یا جوش و توزیع بار محاسبه نمی‌شود.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayFasteningType">نوع اتصال ریل</label><select id="craneRunwayFasteningType"><option value="">انتخاب نشده</option><option value="clip">کلیپس/گیره مکانیکی</option><option value="bolted">اتصال پیچی مستقیم</option><option value="welded">اتصال جوشی</option><option value="other">سایر / جزئیات خاص</option></select></div>' +
      '<div class="field"><label for="craneRunwayFasteningModel">مدل/سازنده بست یا گیره</label><input id="craneRunwayFasteningModel" type="text" placeholder="شماره قطعه و سازنده"></div>' +
      '<div class="field"><label for="craneRunwayClampsPerStation">تعداد بست در هر ایستگاه</label><input id="craneRunwayClampsPerStation" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayBoltsPerClamp">تعداد پیچ هر بست</label><input id="craneRunwayBoltsPerClamp" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayBoltGrade">رده مقاومتی پیچ</label><input id="craneRunwayBoltGrade" type="text" placeholder="مثلاً 8.8 طبق نقشه"></div>' +
      '<div class="field"><label for="craneRunwayBoltDiameter">قطر اسمی پیچ (mm)</label><input id="craneRunwayBoltDiameter" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayRailSeatPlateWidth">عرض ورق زیرسری (mm)</label><input id="craneRunwayRailSeatPlateWidth" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayRailSeatPlateLength">طول ورق زیرسری (mm)</label><input id="craneRunwayRailSeatPlateLength" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayRailSeatPlateThickness">ضخامت ورق زیرسری (mm)</label><input id="craneRunwayRailSeatPlateThickness" type="number" min="1" step="0.5"></div>' +
      '<div class="field"><label for="craneRunwayPadMaterial">جنس/مدل پد زیر ریل</label><input id="craneRunwayPadMaterial" type="text" placeholder="الاستومر و مشخصه سازنده"></div>' +
      '<div class="field"><label for="craneRunwayPadHardness">سختی پد (Shore A)</label><input id="craneRunwayPadHardness" type="number" min="1" max="100" step="1"></div>' +
      '<div class="field"><label for="craneRunwayPadModulus">مدول فشاری پد (MPa، در صورت وجود)</label><input id="craneRunwayPadModulus" type="number" min="0.01" step="0.01"></div>' +
      '<div class="field"><label for="craneRunwayRailWeldSize">اندازه جوش اتصال ریل (mm، در صورت جوشی)</label><input id="craneRunwayRailWeldSize" type="number" min="1" step="0.5"></div>' +
      '<div class="field"><label for="craneRunwayFasteningDetailSource">مرجع نقشه/کاتالوگ بست، پیچ، ورق و پد</label><input id="craneRunwayFasteningDetailSource" type="text" placeholder="شماره نقشه، صفحه کاتالوگ و ویرایش"></div></div>' +
      '<div id="craneRunwayFasteningAudit" class="notice">ممیزی جزئیات بست و پد هنوز انجام نشده است.</div>' +
      '<h4>مدل طولی ریل و ایستگاه‌های تکیه‌گاهی</h4><div class="notice">فاصله ایستگاه‌ها و رفتار پیوستگی باید از نقشه نصب و مشخصات سازنده وارد شود. ایستگاه‌های منظم فقط برای نمایش هندسی ساخته می‌شوند؛ هیچ توزیع بار یا تحلیل تیر ریل در این مرحله انجام نمی‌شود.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailSupportPitch">فاصله ایستگاه‌های تکیه‌گاهی ریل (m)</label><input id="craneRunwayRailSupportPitch" type="number" min="0.01" step="0.01"></div>' +
      '<div class="field"><label for="craneRunwayRailFirstSupportOffset">فاصله اولین ایستگاه از ابتدای سوله (m)</label><input id="craneRunwayRailFirstSupportOffset" type="number" min="0" step="0.01" value="0"></div>' +
      '<div class="field"><label for="craneRunwayRailContinuity">رفتار پیوستگی ریل طبق جزئیات نصب</label><select id="craneRunwayRailContinuity"><option value="">انتخاب نشده</option><option value="continuous">ریل پیوسته / اتصال پیوسته</option><option value="simple-spans">قطعات مستقل بین ایستگاه‌ها</option><option value="unknown">نامشخص / نیازمند بررسی</option></select></div>' +
      '<div class="field"><label for="craneRunwayRailJointPositions">موقعیت وصله‌های ریل از ابتدای سوله (m، با ویرگول)</label><input id="craneRunwayRailJointPositions" type="text" placeholder="مثلاً 12, 24, 36"></div>' +
      '<div class="field"><label for="craneRunwayRailIx">ممان اینرسی قوی ریل Ix (mm⁴)</label><input id="craneRunwayRailIx" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailIy">ممان اینرسی ضعیف ریل Iy (mm⁴)</label><input id="craneRunwayRailIy" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailJ">ثابت پیچشی ریل J (mm⁴، طبق منبع)</label><input id="craneRunwayRailJ" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailE">مدول الاستیسیته ریل E (MPa)</label><input id="craneRunwayRailE" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailPropertySource">منبع خواص مقطع ریل و جزئیات وصله</label><input id="craneRunwayRailPropertySource" type="text" placeholder="کاتالوگ سازنده، استاندارد، صفحه/ویرایش"></div></div>' +
      '<div id="craneRunwayRailLayoutAudit" class="notice">ممیزی مدل طولی ریل هنوز انجام نشده است.</div>' +
      '<h4>تحلیل مقدماتی تیر پیوسته ریل (FEM)</h4><div class="notice">برای هر ایستگاه، سختی قائم مؤثر بست/پد را به ترتیب ایستگاه‌های نمایش‌داده‌شده وارد کنید. بارها به‌صورت آرایه JSON و با مختصات از ابتدای مسیر ثبت می‌شوند. علامت بار قائم رو به پایین منفی است. منبع و صفحه مرجع برای سختی و تک‌تک بارها اجباری است.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailSupportStiffness">سختی قائم ایستگاه‌ها (N/m، جداشده با ویرگول)</label><input id="craneRunwayRailSupportStiffness" type="text" placeholder="مثلاً 1.2e8, 1.2e8, 1.2e8"></div>' +
      '<div class="field"><label for="craneRunwayRailSupportStiffnessSource">مرجع سختی قائم بست/پد</label><input id="craneRunwayRailSupportStiffnessSource" type="text" placeholder="گزارش آزمایش/کاتالوگ، صفحه و شرایط آزمون"></div></div>' +
      '<div class="field"><label for="craneRunwayRailWheelLoads">بارهای قائم چرخ در موقعیت مشخص (JSON)</label><textarea id="craneRunwayRailWheelLoads" rows="5" placeholder="[{&quot;x_m&quot;:6,&quot;P_N&quot;:-98066.5,&quot;source&quot;:&quot;نقشه جرثقیل&quot;,&quot;document&quot;:&quot;صفحه 4&quot;}]" style="direction:ltr;text-align:left"></textarea><small>هر عضو: x_m، P_N (نیوتن؛ رو به پایین منفی)، source و document. مختصات نسبت به ابتدای مسیر همان ریل است.</small></div>' +
      '<div class="button-grid"><button type="button" id="btnAnalyzeCraneRailFEM" class="btn secondary">ممیزی و اجرای تحلیل مقدماتی ریل</button><button type="button" id="btnRailFEMSelfTest" class="btn secondary">آزمون نرم‌افزاری حل‌گر ریل</button></div>' +
      '<div id="craneRunwayRailFEMResult" class="notice">تحلیل تیر ریل هنوز اجرا نشده است.</div>' +
      '<h4>جاروب قطار چرخ متحرک روی ریل</h4><div class="notice">بار هر چرخ و فاصله آن از چرخ مبنا را وارد کنید. آفست‌ها باید صعودی و بارها دارای مرجع باشند. گام مکانی کوچک‌تر دقت نمونه‌برداری را افزایش می‌دهد اما زمان محاسبه را بیشتر می‌کند.</div>' +
      '<div class="field"><label for="craneRunwayRailMovingTrain">قطار چرخ (JSON: offset_m، P_N، source، document)</label><textarea id="craneRunwayRailMovingTrain" rows="5" placeholder="[{&quot;offset_m&quot;:0,&quot;P_N&quot;:-98066.5,&quot;source&quot;:&quot;نقشه سازنده&quot;,&quot;document&quot;:&quot;صفحه 4&quot;},{&quot;offset_m&quot;:2,&quot;P_N&quot;:-85000,&quot;source&quot;:&quot;نقشه سازنده&quot;,&quot;document&quot;:&quot;صفحه 4&quot;}]" style="direction:ltr;text-align:left"></textarea></div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailMovingStep">گام جاروب مکانی (m)</label><input id="craneRunwayRailMovingStep" type="number" min="0.01" step="0.01" value="0.25"></div></div>' +
      '<div class="button-grid"><button type="button" id="btnMovingCraneRailFEM" class="btn secondary">اجرای جاروب قطار چرخ متحرک</button></div>' +
      '<div id="craneRunwayRailMovingResult" class="notice">پوش بار متحرک هنوز محاسبه نشده است.</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="modelPurlinSpacing">فاصله پرلین‌های سقف (m)</label><input id="modelPurlinSpacing" type="number" min="0.3" step="0.05" value="0.95"></div>' +
      '<div class="field"><label for="modelRoofOverhang">پیش‌آمدگی عرضی سقف از لبه رفتر (m)</label><input id="modelRoofOverhang" type="number" min="0" step="0.05" value="0"></div>' +
      '<div class="field"><label for="modelEndOverhang">پیش‌آمدگی طولی سقف در دو انتهای سوله (m)</label><input id="modelEndOverhang" type="number" min="0" step="0.05" value="0"></div>' +
      '<div class="field"><label for="modelPurlinClipDeduction">کسر مجموع دو انتهای کلیپس از طول برش هر پرلین (m)</label><input id="modelPurlinClipDeduction" type="number" min="0" step="0.005" value="0"></div>' +
      '<div class="field"><label for="modelPurlinAssemblyGap">لقی مونتاژ کل هر قطعه پرلین (m)</label><input id="modelPurlinAssemblyGap" type="number" min="0" step="0.005" value="0"></div>' +
      '<div class="field"><label for="modelGirtSpacing">فاصله قیدهای افقی دیوار (m)</label><input id="modelGirtSpacing" type="number" min="0.3" step="0.05" value="3.00"></div>' +
      '<div class="field"><label for="modelEndPostSpacing">فاصله ستونک‌های دیوار انتهایی (m)</label><input id="modelEndPostSpacing" type="number" min="1" step="0.1" value="4.00"></div>' +
      '<div class="field"><label for="modelBraceBays">تعداد دهانه مهاربندی در ابتدا و انتها</label><input id="modelBraceBays" type="number" min="0" step="1" value="1"></div></div>' +
      '<div class="button-grid"><button type="button" id="btnBuildFullModel" class="btn primary">تولید و ترسیم تمام اجزای سوله</button><button type="button" id="btnCheck3DSections" class="btn secondary">بررسی آمادگی مقاطع تحلیل سه‌بعدی</button></div>' +
      '<div id="modelProgress" class="model-progress" hidden aria-live="polite"><div class="model-progress-head"><strong id="modelProgressText">در حال آماده‌سازی…</strong><span id="modelProgressElapsed">۰٫۰ ثانیه</span></div><div class="model-progress-track"><span></span></div><small>حل ماتریس در پردازشگر پس‌زمینه انجام می‌شود؛ نوار پیشرفت و زمان‌سنج باید در طول تحلیل فعال بمانند.</small></div>' +
      '<div id="fullModelSummary" class="notice">مدل کامل هنوز تولید نشده است.</div>' +
      '<div id="fullModel3DReadiness" class="notice">آمادگی تحلیل سه‌بعدی هنوز بررسی نشده است.</div>' +
      '<hr><h4>تحلیل واقعی سه‌بعدی مدل</h4>' +
      '<div class="form-grid"><div class="field"><label for="model3DLoadCase">حالت بار برای تحلیل آزمایشی</label><select id="model3DLoadCase"><option value="dead">بار مرده</option><option value="live">بار زنده</option><option value="snow">بار برف</option><option value="wind">باد ـ فشار خالص ورودی</option><option value="combo0">ترکیب ULS-1: 1.4D</option><option value="combo1">ترکیب ULS-2: 1.2D+1.6L+0.5S</option><option value="combo2">ترکیب ULS-3: 1.2D+1.6S+0.5L</option></select></div></div>' +
      '<div class="button-grid"><button type="button" id="btnRunFull3D" class="btn success">اجرای تحلیل سه‌بعدی کل سوله</button><button type="button" id="btnSolverSelfTest" class="btn secondary">آزمون صحت هسته تحلیل</button><button type="button" id="btnTieBeamIntegrationTest" class="btn secondary">آزمون یکپارچگی شناژ</button><button type="button" id="btnTestSpan10" class="btn secondary">آزمایش مقایسه‌ای دهانه ۱۰ متر</button><button type="button" id="btnDownloadSpanTest" class="btn secondary" disabled>دانلود گزارش آزمایش دهانه</button></div>' +
      '<div id="fullModel3DResult" class="notice">تحلیل سه‌بعدی هنوز اجرا نشده است.</div>' +
      '<div id="criticalRafterDiagram" class="notice" style="margin-top:12px;overflow:hidden">پس از اجرای تحلیل، محل قطعه رفتر متصل به گره بحرانی و مقطع شماتیک تیرورق در این قسمت نمایش داده می‌شود.</div>';
    drawingPanel.parentNode.insertBefore(panel, drawingPanel);
    $("btnBuildFullModel").addEventListener("click", function () {
      runWithProgress("در حال تولید گره‌ها، قاب‌ها، پرلین‌ها و مهاربندها…", stage => {
        build(); draw(); showSummary();
        stage("ترسیم مدل و تکمیل خلاصه هندسی انجام شد.");
      }, e => { $("fullModelSummary").textContent = "خطا در تولید مدل: " + e.message; });
    });
    $("btnSolverSelfTest").addEventListener("click", function () {
      const box=$("fullModel3DResult");
      try {
        const result=window.SteelFrame3D.selfTest();
        box.textContent="آزمون مستقل هسته تحلیل: "+result.passed+"/"+result.total+" موفق؛ ناموفق: "+result.failed+
          "\\n"+result.tests.map(t=>(t.ok?"✓ ":"✗ ")+t.name+(t.error?" — "+t.error:"")+
            (Number.isFinite(t.maxReleasedEndMomentNm)?" — بیشینه لنگر انتهای آزادشده: "+t.maxReleasedEndMomentNm.toFixed(6)+" N·m":"")).join("\\n")+
          "\\nاین آزمون‌ها کنترل پایه‌ای حل‌گرند و جایگزین اعتبارسنجی مستقل/آیین‌نامه‌ای نیستند.";
        box.style.color=result.failed===0?"#15803d":"#b45309";
      } catch(error) {
        box.textContent="اجرای آزمون هسته تحلیل ناموفق بود: "+error.message;
        box.style.color="#b45309";
      }
    });
    $("btnTieBeamIntegrationTest").addEventListener("click", function () {
      const box=$("fullModel3DResult");
      try {
        if(!window.SteelTieBeamIntegrationTest)throw new Error("آزمون یکپارچگی شناژ بارگذاری نشده است.");
        const r=window.SteelTieBeamIntegrationTest.run();
        box.textContent="آزمون مستقل اتصال شناژ: "+r.passed+"/"+r.total+" موفق؛ ناموفق: "+r.failed+
          "\\n"+r.cases.map(x=>(x.passed?"✓ ":"✗ ")+x.axis+" / "+x.joint+
            (x.error?" — "+x.error:" — واکنش قائم: "+x.verticalSupportReactionN.toFixed(2)+
            " N؛ وزن مورد انتظار: "+x.expectedSelfWeightN.toFixed(2)+" N؛ بیشینه لنگر انتهایی: "+
            x.maxTieEndBendingMomentNm.toFixed(5)+" N·m")).join("\\n")+
          "\\n"+r.note;
        box.style.color=r.failed===0?"#15803d":"#b45309";
      } catch(error) {
        box.textContent="آزمون شناژ ناموفق بود: "+error.message;
        box.style.color="#b45309";
      }
    });
    $("btnRunFull3D").addEventListener("click", function () {
      const box=$("fullModel3DResult");
      runWithProgress("مرحله ۱ از ۳: آماده‌سازی مدل هندسی…", async stage => {
      try {
        stage("مرحله ۱ از ۳: تولید و ترسیم مدل هندسی…");
        build(); draw(); showSummary();
        const lc=$("model3DLoadCase")?.value||"dead";
        stage("مرحله ۲ از ۳: مونتاژ ماتریس سختی و بارگذاری اعضا…");
        stage("مرحله ۳ از ۳: حل دستگاه معادلات سه‌بعدی؛ لطفاً صفحه را نبندید…");
        const result=await analyze3D(lc);
        let craneEnvelope=null;
        if(window.SteelCraneReadiness?.getData?.().enabled){
          if(!window.SteelCrane3DLoadTransfer?.analyzeAllFromUI)
            throw new Error("جرثقیل در پروژه فعال است اما هماهنگ‌کننده تحلیل خودکار جرثقیل بارگذاری نشده است.");
          stage("جرثقیل فعال است: آماده‌سازی و تحلیل موقعیت‌های متحرک قطار چرخ…");
          craneEnvelope=await window.SteelCrane3DLoadTransfer.analyzeAllFromUI({maxCases:300,onProgress:stage});
          if(!craneEnvelope?.success)
            throw new Error("تحلیل کامل جرثقیل انجام نشد؛ نتیجه تحلیل سوله به‌تنهایی کافی نیست: "+(craneEnvelope?.issues||["خطای نامشخص"]).join(" | "));
        }
        box.textContent="تحلیل سه‌بعدی با موفقیت حل شد. حالت بار: "+result.loadCaseLabel+
          " | گره‌ها: "+result.nodeCount+" | اعضا: "+result.memberCount+
          " | بیشینه جابه‌جایی انتقالی: "+(result.maxTranslation*1000).toFixed(3)+" میلی‌متر"+
          (result.taperedSegmentation&&result.taperedSegmentation.splitMemberCount?" | اعضای متغیرمقطع تقسیم‌شده: "+result.taperedSegmentation.splitMemberCount+"؛ قطعات تحلیل افزوده: "+result.taperedSegmentation.generatedSegmentCount+"؛ گره‌های میانی: "+result.taperedSegmentation.addedNodeCount:"")+
          " | گره‌های دارای واکنش تکیه‌گاهی: "+result.reactions.length+
          (result.criticalDisplacement
            ? " | گره بحرانی: "+result.criticalDisplacement.nodeId+" ("+result.criticalDisplacement.kind+")"+
              " | مختصات X/Y/Z: "+[result.criticalDisplacement.coordinates.x,result.criticalDisplacement.coordinates.y,result.criticalDisplacement.coordinates.z].map(v=>v.toFixed(3)).join(" / ")+" متر"+
              " | جابه‌جایی ux/uy/uz: "+[result.criticalDisplacement.ux,result.criticalDisplacement.uy,result.criticalDisplacement.uz].map(v=>(v*1000).toFixed(3)).join(" / ")+" میلی‌متر"+
              " | اعضای متصل ("+result.criticalDisplacement.connectedMembers.length+"): "+result.criticalDisplacement.connectedMembers.map(m=>m.id+" ["+m.type+"]").join("، ")
            : " | اطلاعات گره بحرانی در دسترس نیست")+
          (result.selfWeight&&result.selfWeight.included?" | وزن خود اعضا (فولاد و بتن شناژ) افزوده‌شده: "+result.selfWeight.totalKN.toFixed(2)+" کیلونیوتن در "+result.selfWeight.memberCount+" عضو"+(result.selfWeight.bySectionGroup?" | تفکیک وزن گروه‌ها: "+Object.entries(result.selfWeight.bySectionGroup).map(([k,v])=>k+"="+v.totalKN.toFixed(2)+"kN، "+v.count+" عضو، "+v.lengthM.toFixed(1)+"m").join("؛ "):""):"")+
          (result.wallDeadLoadTransfer?" | وزن مرده پوسته دیوارها: "+Number(result.wallDeadLoadTransfer.totalWeightKN).toFixed(2)+" kN؛ ضریب D="+Number(result.wallDeadLoadTransfer.deadFactor).toFixed(3)+"؛ وزن اعمال‌شده در این حالت="+Number(result.wallDeadLoadTransfer.appliedWeightKN).toFixed(2)+" kN":"")+
          (result.preparedMemberLoadAudit?" | ممیزی نهایی بار اعضا: "+result.preparedMemberLoadAudit.memberCount+" از "+result.memberCount+" عضو؛ بردار محلی/جهانی و دفتر بار صریح معتبر":" | ممیزی نهایی بار اعضا گزارش نشده")+
          (result.tieBeamIntegration?" | شناژهای واردشده به تحلیل: "+result.tieBeamIntegration.included.length+
            (result.tieBeamIntegration.included.length?" (وزن بتن فقط در حالت مرده/ترکیبات دارای D افزوده می‌شود)":"")+
            (result.tieBeamIntegration.skipped.length?" | مسیرهای شناژ ردشده: "+result.tieBeamIntegration.skipped.length:"")+
            (result.tieBeamIntegration.reinforcementWarnings.length?" | هشدار تکمیل‌نبودن جزئیات آرماتور: "+result.tieBeamIntegration.reinforcementWarnings.length:""):"")+
          (result.equilibrium?" | کنترل تعادل نیرو: "+(result.equilibrium.relativeForceResidual*100).toExponential(2)+"٪؛ تعادل لنگر: "+(result.equilibrium.relativeMomentResidual*100).toExponential(2)+"٪؛ "+(result.equilibrium.ok?"تعادل کلی برقرار":"هشدار: عدم تعادل کلی"):" | کنترل تعادل در دسترس نیست")+
          ". خودوزن فولاد با 78.5 و خودوزن شناژ با وزن مخصوص بتن ثبت‌شده محاسبه شده است؛ تحلیل خطی مرتبه اول است، P-Delta و کنترل کمانش در آن لحاظ نشده است. هر پرلین به‌صورت قطعه مستقل بین دو قاب مدل شده است؛ دوران‌های انتهایی هر قطعه از رفتر و از قطعه پرلین دهانه مجاور جدا هستند (فرض مفصل ایده‌آل). سختی واقعی کلیپس و پیچ‌ها، لغزش و خروج از صفحه هنوز مدل نشده و نتیجه تأیید طراحی یا کنترل آیین‌نامه‌ای نیست.";
        if(Array.isArray(result.criticalMemberReport)&&result.criticalMemberReport.length){
          const fmt=(v,factor=1,d=3)=>Number.isFinite(Number(v))?(Number(v)*factor).toFixed(d):"—";
          const lines=["","گزارش تشخیصی اعضای متصل به گره بحرانی:",
            "واحد نیرو: kN | واحد گشتاور: kN·m | مشخصات مقطع: A بر حسب cm² و ممان‌ها بر حسب cm⁴",
            "ترتیب نیروها در هر انتها: N، Vy، Vz، T، My، Mz"];
          result.criticalMemberReport.forEach((m,i)=>{
            const s=m.section||{},a=m.endI||{},b=m.endJ||{};
            lines.push((i+1)+") "+m.id+" — "+m.type+(m.profile?" — مقطع "+m.profile:"")+
              " — طول "+fmt(m.length,1,3)+" m");
            lines.push("   انتهای I: "+[a.N,a.Vy,a.Vz].map(v=>fmt(v,0.001)).join(" / ")+" kN؛ "+
              [a.T,a.My,a.Mz].map(v=>fmt(v,0.001)).join(" / ")+" kN·m");
            lines.push("   انتهای J: "+[b.N,b.Vy,b.Vz].map(v=>fmt(v,0.001)).join(" / ")+" kN؛ "+
              [b.T,b.My,b.Mz].map(v=>fmt(v,0.001)).join(" / ")+" kN·m");
            lines.push("   مقطع: A="+fmt(s.A,1e4,2)+" cm²؛ Iy="+fmt(s.Iy,1e8,2)+
              "؛ Iz="+fmt(s.Iz,1e8,2)+"؛ J="+fmt(s.J,1e8,2)+" cm⁴؛ E="+
              fmt(s.E,1e-9,2)+"؛ G="+fmt(s.G,1e-9,2)+" GPa");
          });
          lines.push("تذکر: این‌ها نیروهای انتهایی محلی عضو در تحلیل خطی فعلی‌اند؛ علامت‌ها مطابق قرارداد محلی حل‌گر است و به‌تنهایی کنترل مقاومت یا خیز آیین‌نامه‌ای محسوب نمی‌شوند.");
          box.textContent+="\n"+lines.join("\n");
        }else{
          box.textContent+="\nگزارش نیروهای اعضای بحرانی در دسترس نیست.";
        }
        if(craneEnvelope){
          box.textContent+="\n\nتحلیل خودکار جرثقیل سقفی: "+craneEnvelope.total+" موقعیت قطار چرخ جداگانه حل شد؛ موقعیت بحرانی نمونه‌برداری‌شده: "+craneEnvelope.results[craneEnvelope.criticalCase].referencePosition_m.toFixed(3)+" m؛ بیشینه تغییرمکان انتقالی در این مجموعه: "+(craneEnvelope.maxTranslation_m*1000).toFixed(3)+" mm؛ پوش نیروهای انتهایی اعضا برای "+(craneEnvelope.memberForceEnvelope?.cases?.length||0)+" موقعیت و "+(craneEnvelope.memberForceEnvelope?.rows?.length||0)+" عضو استخراج شد. بار مرده و وزن خود اعضا، بار چرخ با ضریب دینامیکی قائم "+Number(window.SteelCraneReadiness.getData().verticalImpact)+" و نیروهای افقی مستند (در صورت فعال بودن) منظور شده‌اند. این پوش، جایگزین ترکیبات کامل آیین‌نامه‌ای جرثقیل، خستگی یا طراحی نهایی تیر حمال و اتصالات نیست.";
        }
        box.style.color="#15803d";
        window.SteelStructuralModel.last3DResult=result;
        window.SteelStructuralModel.lastCraneEnvelope=craneEnvelope;
        renderCriticalRafterDiagram(result,"تحلیل مدل اصلی");
      } catch(e) {
        box.textContent="تحلیل سه‌بعدی انجام نشد: "+e.message+
          "؛ این پیام برای جلوگیری از ارائه نتیجه نادرست نمایش داده شده است.";
        box.style.color="#b45309";
        window.SteelStructuralModel.last3DResult=null;
      }
      }, e => {
        box.textContent = "تحلیل سه‌بعدی انجام نشد: " + e.message;
        box.style.color = "#b45309";
        window.SteelStructuralModel.last3DResult = null;
      });
    });
    $("btnTestSpan10").addEventListener("click", function () {
      runWithProgress("در حال آماده‌سازی آزمایش مقایسه‌ای دهانه ۱۰ متر…", async stage => {
      const box=$("fullModel3DResult"), spanField=$("span"), riseField=$("rise");
      stage("تغییر موقت هندسه و تولید مدل آزمایشی…");
      const originalSpan=Number(spanField?.value), originalRise=Number(riseField?.value);
      try {
        const analysisModelMemberById=id=>(window.SteelStructuralModel?.model?.members||[]).find(x=>x.id===id)||null;
        if(!spanField||!Number.isFinite(originalSpan)||originalSpan<=0) throw new Error("دهانه فعلی معتبر نیست.");
        spanField.value="10";
        if(typeof window.updateRoofGeometry==="function") window.updateRoofGeometry();
        build(); draw(); showSummary();
        stage("حل مدل سه‌بعدی دهانه ۱۰ متر و استخراج نتایج…");
        const result=await analyze3D("dead");
        const critical=result.criticalDisplacement||null;
        const report={
          test:"مقایسه دهانه ۱۰ متر با بار مرده",
          originalSpanM:originalSpan,
          testedSpanM:10,
          lengthM:Number($("length")?.value),
          frameSpacingM:Number($("spacing")?.value),
          columnHeightM:Number($("height")?.value),
          roofSlopePercent:20,
          loadCase:"dead",
          geometry:{
            spanM:Number($("span")?.value),
            lengthM:Number($("length")?.value),
            frameSpacingM:Number($("spacing")?.value),
            columnHeightM:Number($("height")?.value),
            riseM:Number($("rise")?.value),
            roofSlopePercent:(Number($("rise")?.value)/(Number($("span")?.value)/2))*100,
            roofPurlinSpacingM:Number($("modelPurlinSpacing")?.value),
            wallGirtSpacingM:Number($("modelGirtSpacing")?.value),
            braceBays:Number($("modelBraceBays")?.value)
          },
          loadInputs:window.SteelLoads?.getData?.()||null,
          purlinFabricationSchedule:(()=>{
            const pieces=(window.SteelStructuralModel?.model?.members||[]).filter(x=>x.sectionKey==="roofPurlin"&&x.fabricationRecord);
            return {pieceCount:pieces.length,clipDeductionM:pieces[0]?.clipDeductionM??0,assemblyGapM:pieces[0]?.assemblyGapM??0,
              pieces:pieces.map(x=>({id:x.id,side:x.side,row:x.row,bay:x.bay,supportAxisLengthM:x.supportAxisLengthM,frontOverhangM:x.frontOverhangM||0,rearOverhangM:x.rearOverhangM||0,fabricationLengthM:x.fabricationLengthM}))};
          })(),
          supportType:result.supportType||null,
          nodeCount:result.nodeCount,
          memberCount:result.memberCount,
          maxTranslationMm:result.maxTranslation*1000,
          criticalNode:critical?{
            id:critical.nodeId,kind:critical.kind,
            coordinatesM:critical.coordinates,
            displacementMm:{ux:critical.ux*1000,uy:critical.uy*1000,uz:critical.uz*1000},
            connectedMembers:critical.connectedMembers
          }:null,
          selfWeight:result.selfWeight||null,
          equilibrium:result.equilibrium||null,
          criticalMemberDiagnostics:result.criticalMemberDiagnostics||null,
          criticalJointEquilibrium:result.criticalJointEquilibrium||null,
          criticalRafterContinuity:(critical?(()=>{
            const linked=(critical.connectedMembers||[]).filter(m=>m.sectionKey==="rafter");
            return {nodeId:critical.nodeId,memberCount:linked.length,allShareCriticalNode:linked.every(m=>m.start===critical.nodeId||m.end===critical.nodeId),
              members:linked.map(m=>{const source=analysisModelMemberById(m.id);return {id:m.id,start:source?.start||null,end:source?.end||null,lengthM:source?.length||null,sectionKey:source?.sectionKey||null};}),
              note:"کنترل اشتراک شناسه گره در مدل هندسی است؛ به‌تنهایی جایگزین کنترل سختی اتصال یا صحت مدل نیست."};
          })():null),
          criticalMemberReport:(result.criticalMemberReport||[]).map(m=>{
            const source=analysisModelMemberById(m.id);
            return {...m,
              start:source?.start||null,end:source?.end||null,
              lineLoads:source?.lineLoads||null,
              analysisLoad:m.analysisLoad||source?.analysisLoad||null,
              localAxes:m.localAxes||null
            };
          }),
          generatedAt:new Date().toISOString(),
          note:"تحلیل خطی مقدماتی است؛ نتیجه جایگزین کنترل آیین‌نامه‌ای، بررسی اتصالات و پایداری نیست."
        };
        window.SteelStructuralModel.lastSpanComparison=report;
        renderCriticalRafterDiagram(result,"آزمایش دهانه ۱۰ متر");
        window.dispatchEvent(new CustomEvent("sahroud:span-report-ready",{detail:report}));
        $("btnDownloadSpanTest").disabled=false;
        const eq=result.equilibrium||{};
        box.textContent="آزمایش دهانه ۱۰ متری با موفقیت حل شد؛ دهانه اصلی "+originalSpan.toFixed(2)+
          " متر و دهانه آزمایشی ۱۰٫۰۰ متر است. گره‌ها: "+result.nodeCount+
          " | اعضا: "+result.memberCount+
          " | بیشینه جابه‌جایی: "+(result.maxTranslation*1000).toFixed(3)+" میلی‌متر"+
          (critical?" | گره بحرانی: "+critical.nodeId+" | مختصات: "+
            [critical.coordinates.x,critical.coordinates.y,critical.coordinates.z].map(v=>v.toFixed(3)).join(" / ")+" متر":"")+
          (eq.relativeForceResidual!==undefined?" | خطای تعادل نیرو: "+(eq.relativeForceResidual*100).toExponential(2)+"٪":"")+
          (eq.relativeMomentResidual!==undefined?" | خطای تعادل لنگر: "+(eq.relativeMomentResidual*100).toExponential(2)+"٪":"")+
          " | گزارش کامل JSON آماده دانلود است. پس از آزمایش، هندسه اصلی به دهانه قبلی بازگردانده شد.";
        box.style.color="#15803d";
      } catch(e) {
        box.textContent="آزمایش دهانه ۱۰ متری انجام نشد: "+e.message;
        box.style.color="#b45309";
        window.SteelStructuralModel.lastSpanComparison=null;
        $("btnDownloadSpanTest").disabled=true;
      } finally {
        if(spanField) spanField.value=String(originalSpan);
        if(riseField) riseField.value=String(originalRise);
        if(typeof window.updateRoofGeometry==="function") window.updateRoofGeometry();
        try { build(); draw(); showSummary(); } catch(_) {}
      }
      stage("آزمایش پایان یافت و هندسه اصلی بازگردانده شد.");
      }, e => {
        const box=$("fullModel3DResult");
        if (box) { box.textContent="آزمایش دهانه ۱۰ متری انجام نشد: "+e.message; box.style.color="#b45309"; }
      });
    });
    $("btnDownloadSpanTest").addEventListener("click", function () {
      const report=window.SteelStructuralModel?.lastSpanComparison;
      if(!report) return;
      const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="sahroud-steel-span-10m-test.json";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    });



    $("btnMovingCraneRailFEM")?.addEventListener("click", function () {
      const box=$("craneRunwayRailMovingResult");if(!box)return;
      try {
        build();const g=model.geometry,runway=g.craneRunway||{},layout=runway.railLayoutInputs||{},layoutAudit=runway.railLayoutAudit||{};
        if(!runway.enabled)throw Error("ابتدا وجود جرثقیل سقفی را فعال کنید.");
        if(!layoutAudit.ready)throw Error("ابتدا ممیزی مدل طولی ریل را کامل کنید.");
        const common=parseRunwayRailSupportInputs(readRunwayRailFEMInputs(),layoutAudit.supportStations||[]),moving=parseRunwayRailMovingInputs(readRunwayRailFEMInputs());
        const input={length_m:g.length,E_MPa:layout.E_MPa,Ix_mm4:layout.Ix_mm4,propertySource:layout.propertySource,continuity:layout.continuity,jointPositions_m:layoutAudit.jointPositions_m||[],supportStations_m:layoutAudit.supportStations||[],verticalSpringStiffness_N_m:common.verticalSpringStiffness_N_m,supportStiffnessSource:common.supportStiffnessSource,step_m:moving.step_m,wheels:moving.wheels};
        const result=window.SteelRailBeamFEM?.movingLoadEnvelope?.(input);if(!result)throw Error("تابع جاروب بار متحرک در حل‌گر موجود نیست.");box.textContent=JSON.stringify(result,null,2);box.style.color=result.success?"#166534":"#b45309";
      } catch(e) {box.textContent="جاروب بار متحرک اجرا نشد: "+e.message;box.style.color="#b45309";}
    });
    $("btnRailFEMSelfTest")?.addEventListener("click", function () {
      const box=$("craneRunwayRailFEMResult");if(!box)return;
      try {const result=window.SteelRailBeamFEM?.selfTest?.();if(!result)throw Error("ماژول آزمون حل‌گر ریل بارگذاری نشده است.");box.textContent="آزمون نرم‌افزاری حل‌گر ریل: "+result.passed+"/"+result.total+" موفق؛ ناموفق: "+result.failed+"\\n"+result.tests.map(t=>(t.ok?"✓ ":"✗ ")+t.name+(t.error?" — "+t.error:"")).join("\\n")+"\\nاین آزمون‌ها جایگزین اعتبارسنجی مستقل مهندسی نیستند.";box.style.color=result.failed===0?"#166534":"#b45309";}
      catch(e){box.textContent="اجرای آزمون حل‌گر ریل ناموفق بود: "+e.message;box.style.color="#b45309";}
    });
    $("btnAnalyzeCraneRailFEM")?.addEventListener("click", function () {
      const box=$("craneRunwayRailFEMResult");if(!box)return;
      try {
        build();const g=model.geometry,runway=g.craneRunway||{},layout=runway.railLayoutInputs||{},layoutAudit=runway.railLayoutAudit||{};
        if(!runway.enabled)throw Error("ابتدا وجود جرثقیل سقفی را در بخش اطلاعات جرثقیل فعال کنید.");
        if(!layoutAudit.ready)throw Error("ابتدا ممیزی مدل طولی ریل را کامل کنید: "+[...(layoutAudit.missing||[]),...(layoutAudit.invalid||[]),...(layoutAudit.dimensional||[])].join("؛ "));
        const parsed=parseRunwayRailFEMInputs(readRunwayRailFEMInputs(),layoutAudit.supportStations||[]);
        const input={length_m:g.length,E_MPa:layout.E_MPa,Ix_mm4:layout.Ix_mm4,propertySource:layout.propertySource,continuity:layout.continuity,jointPositions_m:layoutAudit.jointPositions_m||[],supportStations_m:layoutAudit.supportStations||[],verticalSpringStiffness_N_m:parsed.verticalSpringStiffness_N_m,supportStiffnessSource:parsed.supportStiffnessSource,pointLoads:parsed.pointLoads};
        const result=analyzeCraneRail(input);box.textContent=JSON.stringify(result,null,2);box.style.color=result.success&&result.equilibrium?.ok?"#166534":"#b45309";
      } catch(e) {box.textContent="تحلیل اجرا نشد: "+e.message;box.style.color="#b45309";}
    });
    $("btnCheck3DSections").addEventListener("click", function () {
      runWithProgress("در حال ساخت مدل و کنترل مشخصات مقاطع…", stage => {
      try {
        build();
        stage("در حال بررسی سطح مقطع، ممان‌های اینرسی، پیچش و مدول‌های مصالح…");
        const result=validate3DSections();
        const box=$("fullModel3DReadiness");
        box.textContent=result.ready
          ? "مقاطع همه گروه‌ها از نظر کامل بودن A، Iy، Iz، J، E و G دارای ورودی معتبرند. این فقط کنترل تکمیل ورودی است؛ هنوز تحلیل بارگذاری‌شده و کنترل آیین‌نامه‌ای انجام نشده است."
          : "تحلیل سه‌بعدی فعلاً مجاز نیست. گروه‌های ناقص: " + result.missing.map(x=>x.label+" ("+x.count+" عضو): "+x.reason).join(" | ");
        box.style.color=result.ready?"#15803d":"#b45309";
      } catch(e) { $("fullModel3DReadiness").textContent="خطا در بررسی: "+e.message; }
      }, e => { $("fullModel3DReadiness").textContent = "خطا در بررسی: " + e.message; });
    });
    ["span","length","spacing","height","rise","modelPurlinSpacing","modelGirtSpacing","modelEndPostSpacing","modelBraceBays","craneRunwayAxisOffset","craneRunwaySupportType",...Object.values(RUNWAY_SECTION_FIELD_IDS),...Object.values(RUNWAY_STIFFENER_FIELD_IDS),...Object.values(RUNWAY_LOAD_PATH_FIELD_IDS),...Object.values(RUNWAY_FASTENING_FIELD_IDS),...Object.values(RUNWAY_RAIL_LAYOUT_FIELD_IDS),"craneRunwayRailSupportStiffness","craneRunwayRailSupportStiffnessSource","craneRunwayRailWheelLoads","craneRunwayRailMovingTrain","craneRunwayRailMovingStep"].forEach(id => $(id)?.addEventListener("change", function () { try { build(); draw(); showSummary(); const box=$("craneRunwaySectionAudit");if(box&&model?.geometry?.craneRunway){const a=model.geometry.craneRunway.sectionAudit||{};box.textContent="ممیزی مشخصات: "+(a.ready?"اطلاعات اولیه کامل است؛ طراحی هنوز انجام نشده":"نیازمند تکمیل/اصلاح — موارد ناقص: "+(a.missing||[]).join("، ")+"؛ خطاهای عددی: "+(a.invalid||[]).join("، ")+"؛ "+(a.dimensional||[]).join("، "));const wb=$("craneRunwayWebAudit"),w=model.geometry.craneRunway.webAudit||{};if(wb)wb.textContent="ممیزی جان و سخت‌کننده: "+(w.ready?"اطلاعات کامل؛ کنترل ظرفیت انجام نشده":"ناقص/نیازمند اصلاح — "+(w.missing||[]).join("، ")+"؛ "+(w.invalid||[]).join("، ")+"؛ "+(w.dimensional||[]).join("، "))+(Number.isFinite(w.webSlenderness)?"؛ h/tw="+w.webSlenderness.toFixed(1):"");const lp=model.geometry.craneRunway.loadPathAudit||{},lb=$("craneRunwayLoadPathAudit");if(lb)lb.textContent="ممیزی مسیر بار ریل و چرخ: "+(lp.ready?"ابعاد اولیه کامل؛ ظرفیت/توزیع بار محاسبه نشده":"ناقص/نیازمند اصلاح — "+(lp.missing||[]).join("، ")+"؛ "+(lp.invalid||[]).join("، ")+"؛ "+(lp.dimensional||[]).join("، "));const fa=model.geometry.craneRunway.fasteningAudit||{},fb=$("craneRunwayFasteningAudit");if(fb)fb.textContent="ممیزی بست و پد: "+(fa.ready?"اطلاعات اولیه کامل؛ ظرفیت و توزیع نیرو محاسبه نشده":"ناقص/نیازمند اصلاح — "+(fa.missing||[]).join("، ")+"؛ "+(fa.invalid||[]).join("، ")+"؛ "+(fa.dimensional||[]).join("، "));const ra=model.geometry.craneRunway.railLayoutAudit||{},rb=$("craneRunwayRailLayoutAudit");if(rb)rb.textContent="ممیزی مدل طولی ریل: "+(ra.ready?"ورودی‌های اولیه کامل؛ تحلیل تیر ریل هنوز غیرفعال":"ناقص/نیازمند اصلاح — "+(ra.missing||[]).join("، ")+"؛ "+(ra.invalid||[]).join("، ")+"؛ "+(ra.dimensional||[]).join("، "));}} catch (_) {} }));
  }
  function val(id, fallback) { const e=$(id), n=e?Number(e.value):fallback; return Number.isFinite(n)?n:fallback; }
  function addNode(nodes,x,y,z,kind) { const old=nodes.find(n=>Math.abs(n.x-x)<1e-7&&Math.abs(n.y-y)<1e-7&&Math.abs(n.z-z)<1e-7); if(old){if(kind==="roof-edge")old.kind="roof-edge";return old;} const n={id:"N"+(nodes.length+1),x,y,z,kind:kind||"joint"}; nodes.push(n); return n; }
  function addMember(members,a,b,type,sectionKey,extra) {
    members.push({id:type.toUpperCase().replace(/[^A-Z0-9]+/g,"_")+"_"+(members.length+1),start:a.id,end:b.id,type,sectionKey:sectionKey||"unassigned",length:Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),...(extra||{})});
  }
  function runwayColumnLevels(baseY,girtHeights,eaveY,runwayY,enabled){
    const values=[baseY,...girtHeights,eaveY];
    if(enabled){
      if(!(Number.isFinite(runwayY)&&runwayY>baseY+1e-7&&runwayY<eaveY-1e-7))
        throw new Error("تراز ریل جرثقیل باید بالاتر از کف ستون و پایین‌تر از تراز کنج باشد؛ گره تراز ریل ساخته نشد.");
      values.push(runwayY);
    }
    const sorted=values.sort((a,b)=>a-b).filter((y,i,a)=>i===0||Math.abs(y-a[i-1])>1e-7);
    return sorted.map(y=>({y,kind:enabled&&Math.abs(y-runwayY)<=1e-7?"runway-support":(Math.abs(y-baseY)<=1e-7?"base":(Math.abs(y-eaveY)<=1e-7?"eave":"column-girt-joint"))}));
  }
  const RUNWAY_SECTION_FIELD_IDS={girderType:"craneRunwayGirderType",steelGrade:"craneRunwaySteelGrade",overallDepth_mm:"craneRunwayOverallDepth",flangeWidth_mm:"craneRunwayFlangeWidth",flangeThickness_mm:"craneRunwayFlangeThickness",webThickness_mm:"craneRunwayWebThickness",railDesignation:"craneRunwayRailDesignation",railMass_kg_m:"craneRunwayRailMass",railFastening:"craneRunwayRailFastening",stiffenerSpacing_m:"craneRunwayStiffenerSpacing",lateralRestraint:"craneRunwayLateralRestraint",detailSource:"craneRunwayDetailSource"};
  function readRunwaySectionInputs(){const out={};Object.entries(RUNWAY_SECTION_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["overallDepth_mm","flangeWidth_mm","flangeThickness_mm","webThickness_mm","railMass_kg_m","stiffenerSpacing_m"].includes(key)?Number(raw):raw;});return out;}
  const RUNWAY_STIFFENER_FIELD_IDS={endStiffenerType:"craneRunwayEndStiffenerType",intermediateStiffenerType:"craneRunwayIntermediateStiffenerType",stiffenerWidth_mm:"craneRunwayStiffenerWidth",stiffenerThickness_mm:"craneRunwayStiffenerThickness",stiffenerWeldSize_mm:"craneRunwayStiffenerWeldSize",bearingLength_mm:"craneRunwayBearingLength",wheelLoadOffset_mm:"craneRunwayWheelLoadOffset",stiffenerSource:"craneRunwayStiffenerSource"};
  function readRunwayStiffenerInputs(){const out={};Object.entries(RUNWAY_STIFFENER_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["stiffenerWidth_mm","stiffenerThickness_mm","stiffenerWeldSize_mm","bearingLength_mm","wheelLoadOffset_mm"].includes(key)?Number(raw):raw;});return out;}
  const RUNWAY_LOAD_PATH_FIELD_IDS={railHeight_mm:"craneRunwayRailHeight",railBaseWidth_mm:"craneRunwayRailBaseWidth",railFootThickness_mm:"craneRunwayRailFootThickness",railPadThickness_mm:"craneRunwayRailPadThickness",fasteningSpacing_mm:"craneRunwayFasteningSpacing",wheelContactWidth_mm:"craneRunwayWheelContactWidth",wheelContactLength_mm:"craneRunwayWheelContactLength",loadPathSource:"craneRunwayLoadPathSource"};
  function readRunwayLoadPathInputs(){const out={};Object.entries(RUNWAY_LOAD_PATH_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["railHeight_mm","railBaseWidth_mm","railFootThickness_mm","railPadThickness_mm","fasteningSpacing_mm","wheelContactWidth_mm","wheelContactLength_mm"].includes(key)?Number(raw):raw;});return out;}
  const RUNWAY_FASTENING_FIELD_IDS={fasteningType:"craneRunwayFasteningType",fasteningModel:"craneRunwayFasteningModel",clampsPerStation:"craneRunwayClampsPerStation",boltsPerClamp:"craneRunwayBoltsPerClamp",boltGrade:"craneRunwayBoltGrade",boltDiameter_mm:"craneRunwayBoltDiameter",seatPlateWidth_mm:"craneRunwayRailSeatPlateWidth",seatPlateLength_mm:"craneRunwayRailSeatPlateLength",seatPlateThickness_mm:"craneRunwayRailSeatPlateThickness",padMaterial:"craneRunwayPadMaterial",padHardness_ShoreA:"craneRunwayPadHardness",padCompressionModulus_MPa:"craneRunwayPadModulus",railWeldSize_mm:"craneRunwayRailWeldSize",detailSource:"craneRunwayFasteningDetailSource"};
  function readRunwayFasteningInputs(){const out={};Object.entries(RUNWAY_FASTENING_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["clampsPerStation","boltsPerClamp","boltDiameter_mm","seatPlateWidth_mm","seatPlateLength_mm","seatPlateThickness_mm","padHardness_ShoreA","padCompressionModulus_MPa","railWeldSize_mm"].includes(key)?Number(raw):raw;});return out;}
  function auditRunwayFasteningDetail(loadPath,detail){
    loadPath=loadPath||{};detail=detail||{};
    const required=["fasteningType","seatPlateWidth_mm","seatPlateLength_mm","seatPlateThickness_mm","padMaterial","padHardness_ShoreA","detailSource"];
    const missing=required.filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    if(["clip","bolted"].includes(detail.fasteningType))["fasteningModel","clampsPerStation","boltsPerClamp","boltGrade","boltDiameter_mm"].forEach(k=>{if(detail[k]===undefined||detail[k]===null||detail[k]==="")missing.push(k);});
    if(detail.fasteningType==="welded"&&(detail.railWeldSize_mm===undefined||detail.railWeldSize_mm===""))missing.push("railWeldSize_mm");
    const numeric=["seatPlateWidth_mm","seatPlateLength_mm","seatPlateThickness_mm","padHardness_ShoreA","padCompressionModulus_MPa","clampsPerStation","boltsPerClamp","boltDiameter_mm","railWeldSize_mm"];
    const invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||detail[k]<=0));
    if(detail.padHardness_ShoreA!==undefined&&Number.isFinite(detail.padHardness_ShoreA)&&detail.padHardness_ShoreA>100)invalid.push("padHardness_ShoreA_out_of_range");
    const dimensional=[];
    if(Number.isFinite(loadPath.railBaseWidth_mm)&&Number.isFinite(detail.seatPlateWidth_mm)&&detail.seatPlateWidth_mm<loadPath.railBaseWidth_mm)dimensional.push("عرض ورق زیرسری از عرض کف ریل کمتر است؛ آرایش نشیمن باید بازبینی شود.");
    if(Number.isFinite(loadPath.railPadThickness_mm)&&loadPath.railPadThickness_mm<=0)dimensional.push("ضخامت پد زیر ریل باید مثبت باشد.");
    if(detail.fasteningType==="other")dimensional.push("نوع اتصال «سایر» است؛ جزئیات اختصاصی باید توسط طراح بررسی و تعریف شود.");
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,analysisEnabled:false,note:"این ممیزی ظرفیت پیچ/گیره/جوش، لغزش و بلندشدگی ریل، فشار و سختی پد، خمش ورق زیرسری یا سهم نیروی هر بست را محاسبه نمی‌کند. فاصله بست‌ها به‌تنهایی مجوز تقسیم یکنواخت بار چرخ نیست."};
  }
  const RUNWAY_RAIL_LAYOUT_FIELD_IDS={supportPitch_m:"craneRunwayRailSupportPitch",firstSupportOffset_m:"craneRunwayRailFirstSupportOffset",continuity:"craneRunwayRailContinuity",jointPositions_m:"craneRunwayRailJointPositions",Ix_mm4:"craneRunwayRailIx",Iy_mm4:"craneRunwayRailIy",J_mm4:"craneRunwayRailJ",E_MPa:"craneRunwayRailE",propertySource:"craneRunwayRailPropertySource"};
  function readRunwayRailLayoutInputs(){const out={};Object.entries(RUNWAY_RAIL_LAYOUT_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["supportPitch_m","firstSupportOffset_m","Ix_mm4","Iy_mm4","J_mm4","E_MPa"].includes(key)?Number(raw):raw;});return out;}
  function parseRunwayJointPositions(raw){if(!String(raw||"").trim())return [];return String(raw).split(/[,،;；\s]+/).map(x=>Number(x.trim()));}
  function readRunwayRailFEMInputs(){return {supportStiffnessCsv:String($("craneRunwayRailSupportStiffness")?.value||""),supportStiffnessSource:String($("craneRunwayRailSupportStiffnessSource")?.value||""),pointLoadsJson:String($("craneRunwayRailWheelLoads")?.value||"")};}
  function parseRunwayRailMovingInputs(raw){raw=raw||{};let wheels=[];try{wheels=JSON.parse(String(raw.movingTrainJson||"[]"));}catch(e){throw Error("JSON قطار چرخ قابل خواندن نیست: "+e.message);}if(!Array.isArray(wheels))throw Error("قطار چرخ باید آرایه JSON باشد.");const step=Number(raw.movingStepM);if(!(Number.isFinite(step)&&step>0))throw Error("گام جاروب مکانی باید مثبت باشد.");if(!wheels.length)throw Error("قطار چرخ خالی است.");return {wheels,step_m:step};}
  function parseRunwayRailSupportInputs(raw,stations){raw=raw||{};const values=String(raw.supportStiffnessCsv||"").split(/[,،;；]+/).filter(Boolean).map(Number);if(values.length!==stations.length)throw Error("تعداد سختی‌های قائم باید دقیقاً برابر تعداد ایستگاه‌ها باشد ("+stations.length+" مقدار لازم است).");if(values.some(v=>!Number.isFinite(v)||v<=0))throw Error("تمام سختی‌های قائم باید عددی، مثبت و بر حسب N/m باشند.");const source=String(raw.supportStiffnessSource||"");if(!source.trim())throw Error("مرجع سختی قائم بست/پد ثبت نشده است.");return {verticalSpringStiffness_N_m:values,supportStiffnessSource:source};}
  function parseRunwayRailFEMInputs(raw,stations){const support=parseRunwayRailSupportInputs(raw,stations);let loads=[];try{loads=JSON.parse(String(raw?.pointLoadsJson||"[]"));}catch(e){throw Error("JSON بارهای چرخ قابل خواندن نیست: "+e.message);}if(!Array.isArray(loads))throw Error("ورودی بارهای چرخ باید آرایه JSON باشد.");return {...support,pointLoads:loads};}
  function auditRunwayRailLayout(detail,length,fastening){
    detail=detail||{};fastening=fastening||{};const missing=["supportPitch_m","firstSupportOffset_m","continuity","Ix_mm4","Iy_mm4","J_mm4","E_MPa","propertySource"].filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    const numeric=["supportPitch_m","firstSupportOffset_m","Ix_mm4","Iy_mm4","J_mm4","E_MPa"],invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||(k==="firstSupportOffset_m"?detail[k]<0:detail[k]<=0)));
    const joints=parseRunwayJointPositions(detail.jointPositions_m),dimensional=[];
    if(Number.isFinite(detail.supportPitch_m)&&Number.isFinite(length)&&detail.supportPitch_m>length)dimensional.push("فاصله ایستگاه‌ها از طول مسیر ریل بیشتر است.");
    if(Number.isFinite(detail.firstSupportOffset_m)&&Number.isFinite(detail.supportPitch_m)&&detail.firstSupportOffset_m>=detail.supportPitch_m)dimensional.push("فاصله اولین ایستگاه باید از فاصله تکرار ایستگاه‌ها کمتر باشد.");
    if(Number.isFinite(detail.firstSupportOffset_m)&&Number.isFinite(length)&&detail.firstSupportOffset_m>length)dimensional.push("اولین ایستگاه خارج از طول سوله قرار گرفته است.");
    if(joints.some((x,i)=>!Number.isFinite(x)||x<=0||x>=length||(i>0&&x<=joints[i-1])))dimensional.push("موقعیت وصله‌ها باید عددی، صعودی و داخل طول مسیر ریل باشند.");
    if(detail.continuity==="unknown")dimensional.push("رفتار پیوستگی ریل نامشخص است؛ برای تحلیل باید از نقشه نصب تعیین شود.");
    if(Number.isFinite(fastening.fasteningSpacing_mm)&&Number.isFinite(detail.supportPitch_m)&&Math.abs(fastening.fasteningSpacing_mm/1000-detail.supportPitch_m)>0.005)dimensional.push("فاصله ایستگاه تکیه‌گاهی با فاصله بست ثبت‌شده یکسان نیست؛ تفاوت آرایش باید مستند شود.");
    if(detail.continuity==="simple-spans"&&joints.length&&joints.some(x=>!(Number.isFinite(detail.supportPitch_m)&&detail.supportPitch_m>0&&Number.isFinite(detail.firstSupportOffset_m)&&Math.abs((x-detail.firstSupportOffset_m)/detail.supportPitch_m-Math.round((x-detail.firstSupportOffset_m)/detail.supportPitch_m))<0.01)))dimensional.push("در مدل قطعات مستقل، وصله ثبت‌شده روی ایستگاه تکیه‌گاهی قرار ندارد؛ جزئیات وصله/تکیه‌گاه باید بازبینی شود.");
    const supportStations=[];if(Number.isFinite(detail.supportPitch_m)&&detail.supportPitch_m>0&&Number.isFinite(detail.firstSupportOffset_m)&&detail.firstSupportOffset_m>=0&&detail.firstSupportOffset_m<detail.supportPitch_m&&Number.isFinite(length)&&length>0){for(let z=detail.firstSupportOffset_m;z<=length+1e-8;z+=detail.supportPitch_m)supportStations.push(Number(z.toFixed(6)));}
    if(supportStations.length<2)dimensional.push("برای تشکیل مسیر طولی ریل، دست‌کم دو ایستگاه تکیه‌گاهی در طول مسیر لازم است.");
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,supportStations,jointPositions_m:joints,analysisEnabled:false,note:"ایستگاه‌ها فقط آرایش هندسی منظم واردشده را نمایش می‌دهند. سختی بست و پد، شرایط دورانی/انتقالی تکیه‌گاه، وصله‌های واقعی و رفتار تماس مدل نشده‌اند؛ خواص مقطع واردشده نیز تا کنترل منبع و محورهای اصلی تأیید نشده‌اند."};
  }
  function calculateNominalWheelContactScreen(detail,crane){
    detail=detail||{};crane=crane||{};
    const missing=[];
    if(!(Number.isFinite(detail.wheelContactWidth_mm)&&detail.wheelContactWidth_mm>0))missing.push("عرض تماس چرخ");
    if(!(Number.isFinite(detail.wheelContactLength_mm)&&detail.wheelContactLength_mm>0))missing.push("طول تماس مؤثر چرخ");
    const wheelLoad=Number(crane.maxWheelLoad_t);
    if(!crane.enabled||!Number.isFinite(wheelLoad)||wheelLoad<=0)missing.push("حداکثر بار مستند چرخ جرثقیل");
    if(!String(crane.wheelLoadSource||"").trim()||!String(crane.wheelLoadDocument||"").trim())missing.push("منبع و مرجع بار چرخ");
    if(missing.length)return {available:false,missing,analysisEnabled:false,note:"برای غربالگری فشار متوسط اسمی، ابعاد تماس و حداکثر بار چرخ مستند لازم است."};
    const area=detail.wheelContactWidth_mm*detail.wheelContactLength_mm;
    const forceN=wheelLoad*9.80665*1000;
    const averageMPa=forceN/area;
    return {available:true,wheelLoad_t:wheelLoad,force_kN:wheelLoad*9.80665,contactArea_mm2:area,nominalAveragePressure_MPa:averageMPa,loadBasis:"حداکثر بار چرخ واردشده توسط کاربر؛ بدون اعمال ضریب ضربه یا ترکیب بار",analysisEnabled:false,limitations:"فقط تقسیم نیروی قائم بر سطح مستطیلی اسمی واردشده است؛ فشار واقعی تماس چرخ و ریل عموماً یکنواخت و مستطیلی نیست. این مقدار تحلیل هرتز، خمش کف ریل، توزیع بار به بست‌ها، فشار پد، تنش بال/جان، اثر ضربه یا کنترل مقاومت نیست و معیار پذیرش محسوب نمی‌شود."};
  }
  function auditRunwayLoadPath(section,detail){
    section=section||{};detail=detail||{};
    const required=["railHeight_mm","railBaseWidth_mm","railFootThickness_mm","railPadThickness_mm","fasteningSpacing_mm","wheelContactWidth_mm","wheelContactLength_mm","loadPathSource"];
    const missing=required.filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    const numeric=required.filter(k=>k!=="loadPathSource"),invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||detail[k]<0||(k!=="railPadThickness_mm"&&detail[k]===0)));
    const dimensional=[];
    if(Number.isFinite(detail.railFootThickness_mm)&&Number.isFinite(detail.railHeight_mm)&&detail.railFootThickness_mm>=detail.railHeight_mm)dimensional.push("ضخامت کف ریل باید از ارتفاع کل ریل کمتر باشد.");
    if(Number.isFinite(detail.wheelContactWidth_mm)&&Number.isFinite(detail.railBaseWidth_mm)&&detail.wheelContactWidth_mm>detail.railBaseWidth_mm)dimensional.push("عرض تماس چرخ از عرض کف ریل بیشتر است؛ هندسه تماس بازبینی شود.");
    if(Number.isFinite(detail.railBaseWidth_mm)&&Number.isFinite(section.flangeWidth_mm)&&detail.railBaseWidth_mm>section.flangeWidth_mm)dimensional.push("عرض کف ریل از عرض بال تیر حمال بیشتر است؛ آرایش نشیمن/اتصال نیازمند بررسی است.");
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,analysisEnabled:false,note:"ممیزی فقط هندسه ورودی را بررسی می‌کند؛ توزیع بار، فشار تماس، خمش کف ریل، ظرفیت بست و پد، تنش بال و جان یا بارهای دینامیکی محاسبه نشده‌اند."};
  }
  function auditRunwayWebDetail(section,detail){
    section=section||{};detail=detail||{};
    const required=["endStiffenerType","intermediateStiffenerType","stiffenerWidth_mm","stiffenerThickness_mm","stiffenerWeldSize_mm","bearingLength_mm","wheelLoadOffset_mm","stiffenerSource"];
    const missing=required.filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    const numeric=["stiffenerWidth_mm","stiffenerThickness_mm","stiffenerWeldSize_mm","bearingLength_mm"],invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||detail[k]<=0));
    const dimensional=[];
    if(Number.isFinite(section.webThickness_mm)&&Number.isFinite(detail.stiffenerThickness_mm)&&detail.stiffenerThickness_mm<section.webThickness_mm)dimensional.push("ضخامت سخت‌کننده از ضخامت جان کمتر است؛ نیازمند بازبینی جزئیات.");
    if(Number.isFinite(section.overallDepth_mm)&&Number.isFinite(section.flangeThickness_mm)&&Number.isFinite(detail.stiffenerWidth_mm)&&detail.stiffenerWidth_mm>section.overallDepth_mm-2*section.flangeThickness_mm)dimensional.push("عرض ورق سخت‌کننده از ارتفاع آزاد جان بیشتر است.");
    if(detail.intermediateStiffenerType==="none"&&Number.isFinite(section.stiffenerSpacing_m)&&section.stiffenerSpacing_m>0)dimensional.push("فاصله سخت‌کننده ثبت شده ولی نوع سخت‌کننده میانی «بدون سخت‌کننده» انتخاب شده است.");
    const webSlenderness=Number.isFinite(section.overallDepth_mm)&&Number.isFinite(section.flangeThickness_mm)&&Number.isFinite(section.webThickness_mm)&&section.webThickness_mm>0?(section.overallDepth_mm-2*section.flangeThickness_mm)/section.webThickness_mm:null;
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,webSlenderness,analysisEnabled:false,note:"این ممیزی ظرفیت برشی/فشاری جان، تنش موضعی زیر چرخ، کمانش پانل، طراحی جوش یا لهیدگی جان را کنترل نمی‌کند."};
  }
  function calculateRunwayBuiltupIProperties(d){
    if(!d||d.girderType!=="builtup-i")return {available:false,reason:"محاسبه خواص هندسی خودکار در این نسخه فقط برای تیرورق I متقارن با ورق‌های مستطیلی فعال است."};
    const D=d.overallDepth_mm,b=d.flangeWidth_mm,tf=d.flangeThickness_mm,tw=d.webThickness_mm;
    if(![D,b,tf,tw].every(v=>Number.isFinite(v)&&v>0)||2*tf>=D||b<=tw)return {available:false,reason:"ابعاد معتبر و سازگار برای محاسبه خواص هندسی موجود نیست."};
    const hw=D-2*tf,A=2*b*tf+tw*hw;
    const Ix=2*(b*Math.pow(tf,3)/12+b*tf*Math.pow(D/2-tf/2,2))+tw*Math.pow(hw,3)/12;
    const Iy=2*(tf*Math.pow(b,3)/12)+hw*Math.pow(tw,3)/12;
    const Sx=Ix/(D/2),Sy=Iy/(b/2),Japprox=(2*b*Math.pow(tf,3)+hw*Math.pow(tw,3))/3;
    return {available:true,model:"symmetric_welded_I_rectangular_plates",webClearHeight_mm:hw,area_mm2:A,Ix_mm4:Ix,Iy_mm4:Iy,Sx_mm3:Sx,Sy_mm3:Sy,J_approx_mm4:Japprox,steelMass_kg_m:A*0.00785,excludesRailMass:true,limitations:"خواص هندسی ایده‌آل ورق‌های مستطیلی؛ بدون شعاع گوشه، جوش، اعوجاج، تنش پسماند، warping constant و اثر اتصال ریل. برای طراحی ظرفیت کافی نیست."};
  }
  function auditRunwaySectionInputs(d){d=d||{};const required=Object.keys(RUNWAY_SECTION_FIELD_IDS),missing=required.filter(k=>d[k]===undefined||d[k]===null||d[k]===""),numeric=["overallDepth_mm","flangeWidth_mm","flangeThickness_mm","webThickness_mm","railMass_kg_m","stiffenerSpacing_m"],invalid=numeric.filter(k=>d[k]!==undefined&&(!Number.isFinite(d[k])||d[k]<=0)),dimensional=[];if(Number.isFinite(d.overallDepth_mm)&&Number.isFinite(d.flangeThickness_mm)&&2*d.flangeThickness_mm>=d.overallDepth_mm)dimensional.push("مجموع ضخامت دو بال باید از ارتفاع کل تیر کمتر باشد.");if(Number.isFinite(d.flangeWidth_mm)&&Number.isFinite(d.webThickness_mm)&&d.flangeWidth_mm<=d.webThickness_mm)dimensional.push("عرض بال نسبت به ضخامت جان نامعتبر است.");const ready=missing.length===0&&invalid.length===0&&dimensional.length===0&&d.steelGrade!=="other";return {ready,missing,invalid,dimensional,analysisEnabled:false,note:ready?"اطلاعات اولیه ثبت شده؛ طراحی مقاومت، خیز، خستگی، کمانش و اتصال هنوز انجام نشده است.":"اطلاعات مقطع/ریل ناقص یا نیازمند اصلاح است."};}
  function buildRunwayRailLongitudinalGeometry(length,layoutAudit,layoutInputs){
    const audit=layoutAudit||{},inputs=layoutInputs||{};
    if(!Number.isFinite(length)||length<=0||!Array.isArray(audit.supportStations)||!audit.supportStations.length)return [];
    const breaks=[0,length,...audit.supportStations,...(audit.jointPositions_m||[])].filter(x=>Number.isFinite(x)&&x>=0&&x<=length).sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-7);
    const joints=audit.jointPositions_m||[],supports=audit.supportStations,segments=[];
    ["left","right"].forEach(side=>{for(let i=0;i<breaks.length-1;i++){const z1=breaks[i],z2=breaks[i+1];if(z2-z1<=1e-8)continue;segments.push({id:"CRANE_RAIL_"+side.toUpperCase()+"_SEG_"+(i+1),side,startM:z1,endM:z2,lengthM:z2-z1,supportAtStart:supports.some(x=>Math.abs(x-z1)<1e-7),supportAtEnd:supports.some(x=>Math.abs(x-z2)<1e-7),jointAtStart:joints.some(x=>Math.abs(x-z1)<1e-7),jointAtEnd:joints.some(x=>Math.abs(x-z2)<1e-7),continuity:inputs.continuity||"unselected",analysisEnabled:false});}});
    return segments;
  }
  function buildCraneRunwayGeometry(config){
    if(!config.enabled)return {geometryStatus:"disabled",axisOffsetM:null,supportType:"",beamSegments:[],brackets:[],supportNodes:[]};
    const {span,length,frames,runwayElevation,offsetM,supportType,sectionInputs={},sectionAudit={}}=config;
    if(!(Number.isFinite(offsetM)&&offsetM>=0.05))return {geometryStatus:"awaiting_axis_offset",axisOffsetM:null,supportType,beamSegments:[],brackets:[],supportNodes:[],sectionInputs,sectionAudit,sectionProperties:calculateRunwayBuiltupIProperties(sectionInputs),stiffenerInputs:config.stiffenerInputs||{},webAudit:config.webAudit||{},loadPathInputs:config.loadPathInputs||{},loadPathAudit:config.loadPathAudit||{},contactScreen:config.contactScreen||{available:false,analysisEnabled:false},fasteningInputs:config.fasteningInputs||{},fasteningAudit:config.fasteningAudit||{ready:false,analysisEnabled:false},analysisEnabled:false,railLayoutInputs:config.railLayoutInputs||{},railLayoutAudit:config.railLayoutAudit||{ready:false,analysisEnabled:false,supportStations:[]},railSegments:buildRunwayRailLongitudinalGeometry(length,config.railLayoutAudit,config.railLayoutInputs),railLayoutInputs:config.railLayoutInputs||{},railLayoutAudit:config.railLayoutAudit||{ready:false,analysisEnabled:false,supportStations:[]},railSegments:buildRunwayRailLongitudinalGeometry(length,config.railLayoutAudit,config.railLayoutInputs),geometryNote:"فاصله محور تیر حمال از محور ستون باید از نقشه یا جزئیات سازنده وارد شود؛ مشخصات مقطع و مدل طولی ریل ثبت‌شده حفظ شده‌اند."};
    const sides=[{key:"left",columnX:0,beamX:-offsetM},{key:"right",columnX:span,beamX:span+offsetM}];
    const supportNodes=[],brackets=[],beamSegments=[];
    sides.forEach(side=>{
      const line=frames.map((z,i)=>{
        const node={id:"CRANE_"+side.key.toUpperCase()+"_SUPPORT_"+(i+1),x:side.beamX,y:runwayElevation,z,kind:"crane-runway-beam-support",frameIndex:i+1,side:side.key};
        supportNodes.push(node);
        brackets.push({id:"CRANE_"+side.key.toUpperCase()+"_BRACKET_"+(i+1),side:side.key,frameIndex:i+1,from:{x:side.columnX,y:runwayElevation,z},to:{x:side.beamX,y:runwayElevation,z},lengthM:offsetM,analysisEnabled:false,connectionType:supportType||"unselected"});
        return node;
      });
      for(let i=0;i<line.length-1;i++)beamSegments.push({id:"CRANE_"+side.key.toUpperCase()+"_BEAM_BAY_"+(i+1),side:side.key,bayIndex:i+1,start:line[i],end:line[i+1],lengthM:Math.abs(line[i+1].z-line[i].z),continuity:"separate_span_segment_between_adjacent_frames",analysisEnabled:false,connectionType:supportType||"unselected"});
    });
    const sectionProperties=calculateRunwayBuiltupIProperties(sectionInputs);
    return {geometryStatus:supportType?"geometry_only_review_required":"geometry_only_connection_unselected",axisOffsetM:offsetM,supportType,beamSegments,brackets,supportNodes,sectionInputs,sectionAudit,sectionProperties,stiffenerInputs:config.stiffenerInputs||{},webAudit:config.webAudit||{},loadPathInputs:config.loadPathInputs||{},loadPathAudit:config.loadPathAudit||{},fasteningInputs:config.fasteningInputs||{},fasteningAudit:config.fasteningAudit||{ready:false,analysisEnabled:false},railLayoutInputs:config.railLayoutInputs||{},railLayoutAudit:config.railLayoutAudit||{ready:false,analysisEnabled:false,supportStations:[]},railSegments:buildRunwayRailLongitudinalGeometry(length,config.railLayoutAudit,config.railLayoutInputs),analysisEnabled:false,geometryNote:"تیر حمال به قطعات مستقل بین قاب‌های مجاور تقسیم شده است؛ پیوستگی چنددهانه، سختی اتصال و انتقال نیرو هنوز مدل نشده‌اند."};
  }
  function runwayGeometrySelfTest(){
    const normal=runwayColumnLevels(0,[2,4,6],10,5,true);
    const duplicate=runwayColumnLevels(0,[2,5,6],10,5,true);
    let rejected=false;try{runwayColumnLevels(0,[2,4],10,10,true);}catch(_){rejected=true;}
    const geometry=buildCraneRunwayGeometry({enabled:true,span:20,length:24,frames:[0,5,10],runwayElevation:5,offsetM:0.6,supportType:"simple",railLayoutInputs:{continuity:"continuous"},railLayoutAudit:auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0,continuity:"continuous",jointPositions_m:"12",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600})});
    const noOffset=buildCraneRunwayGeometry({enabled:true,span:20,length:24,frames:[0,5],runwayElevation:5,offsetM:NaN,supportType:"",sectionInputs:{girderType:"builtup-i",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12},railLayoutInputs:{continuity:"continuous"},railLayoutAudit:auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0,continuity:"continuous",jointPositions_m:"12",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600})});
    const sectionGood=auditRunwaySectionInputs({girderType:"builtup-i",steelGrade:"ST37",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12,railDesignation:"test rail",railMass_kg_m:50,railFastening:"clip",stiffenerSpacing_m:1.5,lateralRestraint:"dedicated",detailSource:"test drawing"});
    const sectionBad=auditRunwaySectionInputs({girderType:"builtup-i",steelGrade:"ST37",overallDepth_mm:30,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12,railDesignation:"test rail",railMass_kg_m:50,railFastening:"clip",stiffenerSpacing_m:1.5,lateralRestraint:"dedicated",detailSource:"test drawing"});
    const properties=calculateRunwayBuiltupIProperties({girderType:"builtup-i",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12});
    const boxProperties=calculateRunwayBuiltupIProperties({girderType:"box",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12});
    const webAuditGood=auditRunwayWebDetail({overallDepth_mm:800,flangeThickness_mm:20,webThickness_mm:12,stiffenerSpacing_m:1.5},{endStiffenerType:"pair",intermediateStiffenerType:"pair",stiffenerWidth_mm:100,stiffenerThickness_mm:12,stiffenerWeldSize_mm:6,bearingLength_mm:120,wheelLoadOffset_mm:0,stiffenerSource:"detail A"});
    const webAuditBad=auditRunwayWebDetail({overallDepth_mm:800,flangeThickness_mm:20,webThickness_mm:12,stiffenerSpacing_m:1.5},{endStiffenerType:"pair",intermediateStiffenerType:"none",stiffenerWidth_mm:900,stiffenerThickness_mm:6,stiffenerWeldSize_mm:6,bearingLength_mm:0,wheelLoadOffset_mm:0,stiffenerSource:""});
    const loadPathGood=auditRunwayLoadPath({flangeWidth_mm:300},{railHeight_mm:120,railBaseWidth_mm:140,railFootThickness_mm:20,railPadThickness_mm:8,fasteningSpacing_mm:600,wheelContactWidth_mm:80,wheelContactLength_mm:40,loadPathSource:"rail and wheel catalog"});
    const loadPathBad=auditRunwayLoadPath({flangeWidth_mm:100},{railHeight_mm:100,railBaseWidth_mm:140,railFootThickness_mm:120,railPadThickness_mm:-1,fasteningSpacing_mm:0,wheelContactWidth_mm:160,wheelContactLength_mm:40,loadPathSource:""});
    const contactGood=calculateNominalWheelContactScreen({wheelContactWidth_mm:80,wheelContactLength_mm:40},{enabled:true,maxWheelLoad_t:10,wheelLoadSource:"catalog",wheelLoadDocument:"page 4"});
    const contactMissing=calculateNominalWheelContactScreen({wheelContactWidth_mm:80,wheelContactLength_mm:40},{enabled:true,maxWheelLoad_t:10,wheelLoadSource:"",wheelLoadDocument:""});
    const fasteningGood=auditRunwayFasteningDetail({railBaseWidth_mm:140,railPadThickness_mm:8},{fasteningType:"clip",fasteningModel:"clip-X",clampsPerStation:2,boltsPerClamp:2,boltGrade:"8.8",boltDiameter_mm:16,seatPlateWidth_mm:180,seatPlateLength_mm:200,seatPlateThickness_mm:16,padMaterial:"elastomer",padHardness_ShoreA:70,detailSource:"detail F-01"});
    const fasteningBad=auditRunwayFasteningDetail({railBaseWidth_mm:200,railPadThickness_mm:0},{fasteningType:"clip",seatPlateWidth_mm:100,seatPlateLength_mm:-1,seatPlateThickness_mm:0,padMaterial:"",padHardness_ShoreA:120,detailSource:""});
    const railLayoutGood=auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0,continuity:"continuous",jointPositions_m:"12",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600});
    const railOffsetAligned=auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0.3,continuity:"simple-spans",jointPositions_m:"0.9, 1.5",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600});
    const railTooSparse=auditRunwayRailLayout({supportPitch_m:30,firstSupportOffset_m:0,continuity:"continuous",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600});
    const railLayoutBad=auditRunwayRailLayout({supportPitch_m:0,firstSupportOffset_m:2,continuity:"unknown",jointPositions_m:"24, 12, 25",Ix_mm4:-1,Iy_mm4:0,J_mm4:1,E_MPa:0,propertySource:""},24,{fasteningSpacing_mm:600});
    const checks=[
      normal.length===6&&normal.filter(x=>x.kind==="runway-support").length===1,
      duplicate.filter(x=>x.y===5).length===1&&duplicate.filter(x=>x.kind==="runway-support").length===1,
      rejected,
      geometry.beamSegments.length===4&&geometry.brackets.length===6&&geometry.supportNodes.length===6&&geometry.beamSegments.every(x=>x.analysisEnabled===false)&&geometry.brackets.every(x=>x.analysisEnabled===false),
      geometry.railSegments.length===80&&geometry.railSegments.some(x=>x.jointAtStart)&&geometry.railSegments.every(x=>x.analysisEnabled===false),
      noOffset.geometryStatus==="awaiting_axis_offset"&&noOffset.beamSegments.length===0&&noOffset.sectionInputs.girderType==="builtup-i"&&noOffset.sectionProperties.available&&noOffset.railSegments.length===80,
      sectionGood.ready===true&&sectionGood.analysisEnabled===false,
      sectionBad.ready===false&&sectionBad.dimensional.length>0,
      properties.available&&properties.area_mm2>0&&properties.Ix_mm4>properties.Iy_mm4&&properties.steelMass_kg_m>0&&!boxProperties.available,
      webAuditGood.ready&&webAuditGood.webSlenderness>0&&webAuditGood.analysisEnabled===false,
      !webAuditBad.ready&&webAuditBad.dimensional.length>=2&&webAuditBad.missing.includes("stiffenerSource"),
      loadPathGood.ready&&loadPathGood.analysisEnabled===false,
      !loadPathBad.ready&&loadPathBad.dimensional.length>=2&&loadPathBad.invalid.length>=2,
      contactGood.available&&Math.abs(contactGood.nominalAveragePressure_MPa-(10*9.80665*1000/(80*40)))<1e-9&&contactGood.analysisEnabled===false,
      !contactMissing.available&&contactMissing.missing.length>=1,
      fasteningGood.ready&&fasteningGood.analysisEnabled===false,
      !fasteningBad.ready&&fasteningBad.missing.length>=1&&fasteningBad.invalid.length>=2&&fasteningBad.dimensional.length>=1,
      railLayoutGood.ready&&railLayoutGood.supportStations.length===41&&railLayoutGood.analysisEnabled===false,
      !railLayoutBad.ready&&railLayoutBad.invalid.length>=3&&railLayoutBad.dimensional.length>=2,
      railOffsetAligned.ready&&railOffsetAligned.supportStations[0]===0.3,
      !railTooSparse.ready&&railTooSparse.supportStations.length===1&&railTooSparse.dimensional.length>=1
    ];
    return {passed:checks.filter(Boolean).length,total:checks.length,checks};
  }
  function build() {
    const span=val("span",20), length=val("length",30), spacing=val("spacing",5), height=val("height",6), rise=val("rise",2);
    const craneData=window.SteelCraneReadiness?.getData?.()||{};
    const craneEnabled=!!craneData.enabled;
    const runwayElevation=Number(craneData.runwayElevation_m);
    const psp=val("modelPurlinSpacing",1.2), gsp=val("modelGirtSpacing",1.5), endsp=val("modelEndPostSpacing",4);
    const roofOverhang=val("modelRoofOverhang",0), endOverhang=val("modelEndOverhang",0);
    const braceBays=Math.max(0,Math.floor(val("modelBraceBays",1)));
    if ([span,length,spacing,height,psp,gsp,endsp].some(x=>!(x>0)) || rise<0 || !Number.isFinite(roofOverhang) || roofOverhang<0 || !Number.isFinite(endOverhang) || endOverhang<0)
      throw new Error("ابعاد اصلی، فاصله اعضای فرعی و پیش‌آمدگی‌های سقف باید معتبر و نامنفی باشند.");
    const frames=[0]; for(let z=spacing;z<length-1e-8;z+=spacing) frames.push(z);
    if(length-frames[frames.length-1]>1e-8) frames.push(length);
    const nodes=[],members=[],frameNodes=[],half=span/2,slope=Math.hypot(half,rise),cs=half/slope,sn=rise/slope,over=roofOverhang;
    const girtHeights=[],nGirt=Math.max(0,Math.floor(height/gsp));
    for(let i=1;i<=nGirt;i++) if(i*gsp<height-0.25) girtHeights.push(i*gsp);
    const roofY=x=>height+(x<=half?rise*x/half:rise*(span-x)/half);
    const totalRoofSlope=slope+over;
    const purlinLayout=window.SteelPurlinSpacingLayout?.calculate(totalRoofSlope,psp);
    if(!purlinLayout?.ok)throw new Error(purlinLayout?.reason||"ماژول تعیین فاصله پرلین‌ها بارگذاری نشده است.");
    const roofRows=purlinLayout.intervals;
    // Every purlin/rafter crossing is a shared structural node, not two coincident but disconnected nodes.
    const roofXs=[0,span];
    [-1,1].forEach(side=>{for(let ri=0;ri<=roofRows;ri++){
      const t=ri/roofRows;
      roofXs.push(side<0?(-over*cs+(half+over*cs)*t):(half+(half+over*cs)*t));
    }});
    // Force exact column/rafter intersections at both eaves and reuse their node IDs.
    const frameRoofXs=roofXs.sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-8);
    frames.forEach((z,fi)=>{
      const bl=addNode(nodes,0,0,z,"base"),el=addNode(nodes,0,height,z,"eave"),r=addNode(nodes,half,height+rise,z,"ridge");
      const er=addNode(nodes,span,height,z,"eave"),br=addNode(nodes,span,0,z,"base");
      const lt=addNode(nodes,-over*cs,height-over*sn,z,"cantilever"),rt=addNode(nodes,span+over*cs,height-over*sn,z,"cantilever");
      // Split each main column at every wall-girt elevation. The girt and
      // column must reuse the exact same node IDs to transfer forces.
      const leftLevels=runwayColumnLevels(0,girtHeights,height,runwayElevation,craneEnabled);
      const rightLevels=leftLevels;
      const leftColumnLevels=leftLevels.map(v=>addNode(nodes,0,v.y,z,v.kind));
      const rightColumnLevels=rightLevels.map(v=>addNode(nodes,span,v.y,z,v.kind));
      for(let j=0;j<leftColumnLevels.length-1;j++)
        addMember(members,leftColumnLevels[j],leftColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      for(let j=0;j<rightColumnLevels.length-1;j++)
        addMember(members,rightColumnLevels[j],rightColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      const roofLine=frameRoofXs.map(x=>addNode(nodes,x,roofY(x),z,"rafter-purlin-joint"));
      for(let j=0;j<roofLine.length-1;j++){
        const a=roofLine[j],b=roofLine[j+1],mid=(a.x+b.x)/2;
        const isOverhang=mid<0||mid>span;
        addMember(members,a,b,isOverhang?"کنسول رفتر":"رفتر قاب","rafter",{frame:fi+1,axis:"transverse",segment:j+1,connectedPurlinNodes:true});
      }
      const runwayLeft=craneEnabled?addNode(nodes,0,runwayElevation,z,"runway-support"):null;
      const runwayRight=craneEnabled?addNode(nodes,span,runwayElevation,z,"runway-support"):null;
      frameNodes.push({z,bl,el,r,er,br,lt,rt,runwayLeft,runwayRight});
    });
    // Build one physical purlin line at each roof station. The ridge is shared
    // by both slopes and must be represented once, with left/right tributary widths.
    const purlinStations=new Map();
    [-1,1].forEach(side=>{
      for(let ri=0;ri<=roofRows;ri++){
        const t=ri/roofRows;
        const x=side<0?(-over*cs+(half+over*cs)*t):(half+(half+over*cs)*t);
        const width=(totalRoofSlope/roofRows)*(ri===0||ri===roofRows?0.5:1);
        const key=x.toFixed(7);
        const existing=purlinStations.get(key);
        if(existing){
          existing.side="ridge";
          existing.tributaryWidthRight=width;
          existing.tributaryWidth+=width;
        }else{
          purlinStations.set(key,{x,side:side<0?"left":"right",row:ri+1,
            tributaryWidth:width,
            tributaryWidthLeft:side<0?width:0,
            tributaryWidthRight:side>0?width:0});
        }
      }
    });
    const clipDeduction=val("modelPurlinClipDeduction",0);
    const assemblyGap=val("modelPurlinAssemblyGap",0);
    if(clipDeduction<0||assemblyGap<0)throw new Error("کسر کلیپس و لقی مونتاژ پرلین نمی‌تواند منفی باشد.");
    purlinStations.forEach(station=>{
      // Each bay is one fabricated piece. End-bay pieces pass over the end frame.
      for(let bay=0;bay<frames.length-1;bay++){
        const z1=frames[bay],z2=frames[bay+1],axisLength=z2-z1;
        const frontExtension=bay===0?endOverhang:0, rearExtension=bay===frames.length-2?endOverhang:0;
        const fabricationLength=axisLength+frontExtension+rearExtension-clipDeduction-assemblyGap;
        if(!(fabricationLength>0))throw new Error("طول برش پرلین در دهانه "+(bay+1)+" مثبت نیست؛ ابعاد کلیپس و لقی مونتاژ را بررسی کنید.");
        const pieceId="PURLIN_"+station.row+"_"+station.side+"_BAY_"+(bay+1);
        const path=[z1-frontExtension,z1,z2,z2+rearExtension].filter((z,i,arr)=>i===0||Math.abs(z-arr[i-1])>1e-8);
        for(let seg=0;seg<path.length-1;seg++){
          const za=path[seg],zb=path[seg+1];
          const na=addNode(nodes,station.x,roofY(station.x),za,"roof-secondary-support");
          const nb=addNode(nodes,station.x,roofY(station.x),zb,"roof-secondary-support");
          addMember(members,na,nb,"پرلین مستقل عبوری از قاب انتهایی","roofPurlin",{
            side:station.side,row:station.row,bay:bay+1,pieceId,
            tributaryWidth:station.tributaryWidth,tributaryWidthLeft:station.tributaryWidthLeft,
            tributaryWidthRight:station.tributaryWidthRight,supportAxisLengthM:axisLength,
            clipDeductionM:clipDeduction,assemblyGapM:assemblyGap,
            fabricationLengthM:fabricationLength,fabricationRecord:seg===0,
            physicalPiece:true,separatePiece:true,continuousPieceSegment:true,
            cutInsetStartM:seg===0?clipDeduction/2+assemblyGap/2:0,
            cutInsetEndM:seg===path.length-2?clipDeduction/2+assemblyGap/2:0,
            endOverhang:frontExtension+rearExtension,
            frontOverhangM:frontExtension,rearOverhangM:rearExtension
          });
        }
      }
    });
    // Connect the transverse roof-edge member to every purlin tail.
    [-endOverhang,length+endOverhang].forEach(z=>{
      const edgeStations=Array.from(purlinStations.values()).sort((a,b)=>a.x-b.x);
      const edge=edgeStations.map(station=>addNode(nodes,station.x,roofY(station.x),z,"roof-edge"));
      for(let i=0;i<edge.length-1;i++){
        addMember(members,edge[i],edge[i+1],"تیر لبه عرضی پیش‌آمدگی سقف","roofEdge",{
          endFace:z<0?"front":"rear",overhang:endOverhang,
          stationStart:edgeStations[i].row,stationEnd:edgeStations[i+1].row,
          connectsPurlinTail:true
        });
      }
    });
    girtHeights.forEach((y,gi)=>[0,span].forEach((x,si)=>{
      const lower=gi===0?0:(girtHeights[gi-1]+y)/2;
      const upper=gi===girtHeights.length-1?height:(y+girtHeights[gi+1])/2;
      const row=frames.map(z=>addNode(nodes,x,y,z,"wall-secondary"));
      for(let i=0;i<row.length-1;i++) addMember(members,row[i],row[i+1],"قید افقی طولی دیوار","wallGirt",{side:si===0?"left":"right",row:gi+1,tributaryHeight:upper-lower});
    }));
    [0,length].forEach((z,endIndex)=>{
      const count=Math.max(1,Math.ceil(span/endsp)), xs=Array.from(new Set([...Array.from({length:count+1},(_,i)=>span*i/count),half])).sort((a,b)=>a-b);
      const face=endIndex===0?"front":"rear";
      // End-wall posts are split at every girt intersection so the secondary
      // members share actual nodes instead of crossing disconnected lines.
      for(let i=1;i<count;i++){
        const x=xs[i],top=roofY(x);
        const levels=[0,...girtHeights.filter(y=>y<top-1e-7),top]
          .filter((y,j,a)=>j===0||Math.abs(y-a[j-1])>1e-7);
        const vertical=levels.map(y=>addNode(nodes,x,y,z,y===0?"endwall-base":(Math.abs(y-top)<1e-7?"endwall-head":"endwall-post-joint")));
        for(let j=0;j<vertical.length-1;j++)
          addMember(members,vertical[j],vertical[j+1],"ستونک میانی دیوار انتهایی","endPost",{endFace:face,post:i,segment:j+1});
      }
      // Gable top chord connects the heads of the end posts to the main eaves/ridge.
      const topChord=xs.map(x=>addNode(nodes,x,roofY(x),z,"endwall-head"));
      for(let i=0;i<topChord.length-1;i++)
        addMember(members,topChord[i],topChord[i+1],"رفتر قاب دیوار انتهایی","rafter",{endFace:face,axis:"endwall"});
      girtHeights.forEach((y,gi)=>{
        const active=xs.map((x,i)=>({x,i})).filter(v=>roofY(v.x)>=y-1e-7);
        const lower=gi===0?0:(girtHeights[gi-1]+y)/2;
        const upper=gi===girtHeights.length-1?height:(y+girtHeights[gi+1])/2;
        for(let i=0;i<active.length-1;i++){
          const a=addNode(nodes,active[i].x,y,z,"endwall-girt"),b=addNode(nodes,active[i+1].x,y,z,"endwall-girt");
          addMember(members,a,b,"تیر افقی دیوار انتهایی","endGirt",{endFace:face,row:gi+1,tributaryHeight:upper-lower});
        }
      });
    });
    const bayCount=frames.length-1,braceSet=new Set();
    for(let i=0;i<Math.min(braceBays,bayCount);i++){braceSet.add(i);braceSet.add(bayCount-1-i);}
    braceSet.forEach(bi=>{
      const f1=frameNodes[bi],f2=frameNodes[bi+1];
      [-1,1].forEach(side=>{
        const x=side<0?0:span,a=addNode(nodes,x,0,f1.z,"brace"),b=addNode(nodes,x,height,f2.z,"brace");
        const c=addNode(nodes,x,height,f1.z,"brace"),d=addNode(nodes,x,0,f2.z,"brace");
        addMember(members,a,b,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
        addMember(members,c,d,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
      });
      [-1,1].forEach(side=>{
        const x1=side<0?0:half,x2=side<0?half:span,y1=roofY(x1),y2=roofY(x2);
        const a=addNode(nodes,x1,y1,f1.z,"brace"),b=addNode(nodes,x2,y2,f2.z,"brace");
        const c=addNode(nodes,x2,y2,f1.z,"brace"),d=addNode(nodes,x1,y1,f2.z,"brace");
        addMember(members,a,b,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
        addMember(members,c,d,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
      });
    });
    // Assign tributary line loads to the geometric members from current area-load inputs.
    const loads=window.SteelLoads?.getData?.()||{};
    const frameTrib=frames.map((z,i)=>i===0?(frames[1]-z)/2:i===frames.length-1?(z-frames[i-1])/2:(frames[i+1]-frames[i-1])/2);
    members.forEach(m=>{
      m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"self-weight-only-or-connected-reactions"};
      if(m.axis==="transverse"){
        const fi=(m.frame||1)-1,tw=frameTrib[fi]||spacing;
        if(m.type.indexOf("رفتر چپ")>=0) m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"purlin-support-reactions-and-member-self-weight",tributaryWidth:tw};
        else if(m.type.indexOf("رفتر راست")>=0) m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"purlin-support-reactions-and-member-self-weight",tributaryWidth:tw};
        else m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"self-weight-only-or-connected-reactions",tributaryWidth:tw};
      } else if(m.sectionKey==="roofPurlin"){
        const w=m.tributaryWidth||0;
        if(m.side==="ridge"){
          const wl=m.tributaryWidthLeft||0,wr=m.tributaryWidthRight||0;
          m.lineLoads={
            dead:(loads.deadLeft||0)*wl+(loads.deadRight||0)*wr,
            live:(loads.liveLeft||0)*wl+(loads.liveRight||0)*wr,
            snow:(loads.snowLeft||0)*wl+(loads.snowRight||0)*wr,
            wind:(loads.windLeft||0)*wl+(loads.windRight||0)*wr,
            windLeft:(loads.windLeft||0)*wl,windRight:(loads.windRight||0)*wr,
            windEnd:0,loadRole:"roof-surface-tributary-load",unit:"kN/m",tributaryWidth:w,tributaryWidthLeft:wl,tributaryWidthRight:wr
          };
        }else{
          const side=m.side==="left"?"Left":"Right";
          m.lineLoads={dead:(loads["dead"+side]||0)*w,live:(loads["live"+side]||0)*w,snow:(loads["snow"+side]||0)*w,wind:(loads["wind"+side]||0)*w,windLeft:m.side==="left"?(loads.windLeft||0)*w:0,windRight:m.side==="right"?(loads.windRight||0)*w:0,windEnd:0,loadRole:"roof-surface-tributary-load",unit:"kN/m",tributaryWidth:w};
        }
      } else if(m.sectionKey==="wallGirt"){
        const h=m.tributaryHeight||0;
        m.lineLoads={dead:0,live:0,snow:0,wind:(loads.windWall||0)*h,windLeft:0,windRight:0,windEnd:0,loadRole:"longitudinal-wall-pressure",unit:"kN/m",tributaryHeight:h};
      } else if(m.sectionKey==="endGirt"){
        const h=m.tributaryHeight||0;
        const pressure=m.endFace==="front"?(loads.windEndFront||0):(loads.windEndBack||0);
        m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:pressure*h,loadRole:"end-wall-pressure-below-gable",unit:"kN/m",tributaryHeight:h,pressureKPa:pressure};
      }
    });
    const runwayOffsetInput=$("craneRunwayAxisOffset"),runwaySupportInput=$("craneRunwaySupportType");
    const runwayOffset=runwayOffsetInput&&String(runwayOffsetInput.value).trim()!==""?Number(runwayOffsetInput.value):NaN;
    const runwaySupportType=runwaySupportInput?.value||"";
    const runwaySectionInputs=readRunwaySectionInputs();
    const runwaySectionAudit=auditRunwaySectionInputs(runwaySectionInputs);
    const runwayStiffenerInputs=readRunwayStiffenerInputs();
    const runwayWebAudit=auditRunwayWebDetail(runwaySectionInputs,runwayStiffenerInputs);
    const runwayLoadPathInputs=readRunwayLoadPathInputs();
    const runwayLoadPathAudit=auditRunwayLoadPath(runwaySectionInputs,runwayLoadPathInputs);
    const runwayContactScreen=calculateNominalWheelContactScreen(runwayLoadPathInputs,window.SteelCraneReadiness?.getData?.()||{});
    const runwayFasteningInputs=readRunwayFasteningInputs();
    const runwayFasteningAudit=auditRunwayFasteningDetail(runwayLoadPathInputs,runwayFasteningInputs);
    const runwayRailLayoutInputs=readRunwayRailLayoutInputs();
    const runwayRailLayoutAudit=auditRunwayRailLayout(runwayRailLayoutInputs,length,runwayLoadPathInputs);
    const runwayGeometry=buildCraneRunwayGeometry({enabled:craneEnabled,span,length,frames,runwayElevation,offsetM:runwayOffset,supportType:runwaySupportType,sectionInputs:runwaySectionInputs,sectionAudit:runwaySectionAudit,stiffenerInputs:runwayStiffenerInputs,webAudit:runwayWebAudit,loadPathInputs:runwayLoadPathInputs,loadPathAudit:runwayLoadPathAudit,contactScreen:runwayContactScreen,fasteningInputs:runwayFasteningInputs,fasteningAudit:runwayFasteningAudit,railLayoutInputs:runwayRailLayoutInputs,railLayoutAudit:runwayRailLayoutAudit});
    model={version:1,geometry:{span,length,spacing,height,rise,frames,frameTributaryWidths:frameTrib,roofPurlinSpacing:psp,roofPurlinActualSpacing:purlinLayout.actualSpacingM,roofPurlinIntervalsPerSlope:purlinLayout.intervals,roofPurlinStationCountPerSlope:purlinLayout.stationCount,wallGirtSpacing:gsp,endPostSpacing:endsp,braceBays,craneRunway:{enabled:craneEnabled,elevationM:craneEnabled?runwayElevation:null,supportNodeCount:craneEnabled?frameNodes.length*2:0,...runwayGeometry,railFemInputs:{...readRunwayRailFEMInputs(),movingTrainJson:String($("craneRunwayRailMovingTrain")?.value||""),movingStepM:String($("craneRunwayRailMovingStep")?.value||"0.25")}},roofOverhang,endOverhang},nodes,members,generatedAt:new Date().toISOString()};
    if(window.SteelCrane3DMeshProposal&&model.geometry.craneRunway.enabled){
      model.geometry.craneRunway.meshProposal=window.SteelCrane3DMeshProposal.audit(model);
    }
    if(window.SteelCrane3DIntegration&&model.geometry.craneRunway.enabled){
      const integration=window.SteelCrane3DIntegration.integrate(model);
      model.geometry.craneRunway.integrationAudit={success:integration.success,ready:integration.ready,analysisEnabled:false,issues:integration.issues||[],counts:integration.counts||null};
      if(integration.success)model=integration.model;
    }
    return model;
  }
  function draw() {
    if(!model) build(); const svg=$("frameDrawing"); if(!svg)return false;
    const g=model.geometry,W=900,H=480,sx=Math.min(430/(g.span+0.8),300/(g.length+1.6)),sy=Math.min(190/(g.height+g.rise),sx),scale=Math.min(sx,sy);
    const ox=120,oy=330,dx=scale,dz=scale*0.55,dy=scale*0.92,P=n=>({x:ox+n.x*dx+n.z*dz,y:oy-n.y*dy-n.z*dz*0.52});
    svg.innerHTML="";svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("preserveAspectRatio","xMidYMid meet");
    const el=(tag,attrs)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e;};
    el("rect",{x:0,y:0,width:W,height:H,fill:"#f8fafc"});
    const colors={column:"#176b9b",rafter:"#d97706",roofPurlin:"#0f766e",wallGirt:"#64748b",wallBrace:"#dc2626",roofBrace:"#b91c1c",endPost:"#2563eb",endGirt:"#94a3b8",roofEdge:"#b45309"};
    const widths={column:5,rafter:4,roofPurlin:1.8,wallGirt:1.8,wallBrace:2.5,roofBrace:2.5,endPost:2.2,endGirt:1.5,roofEdge:3};
    ["roofPurlin","wallGirt","endGirt","endPost","roofBrace","wallBrace","roofEdge","column","rafter"].forEach(type=>model.members.filter(m=>m.sectionKey===type).forEach(m=>{
      const a=model.nodes.find(n=>n.id===m.start),b=model.nodes.find(n=>n.id===m.end);if(!a||!b)return;
      let aa=a,bb=b;
      if(type==="roofPurlin"&&m.separatePiece){
        const dir=Math.sign(b.z-a.z)||1;
        aa={...a,z:a.z+dir*Number(m.cutInsetStartM||0)};
        bb={...b,z:b.z-dir*Number(m.cutInsetEndM||0)};
      }
      const p=P(aa),q=P(bb);
      el("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:colors[type],"stroke-width":widths[type],"stroke-linecap":"round",opacity:type==="roofPurlin"||type==="wallGirt"?"0.88":"1"});
      if(type==="roofPurlin"&&m.separatePiece){
        const sa=P(a),sb=P(b);
        [sa,sb].forEach(c=>el("circle",{cx:c.x,cy:c.y,r:2.6,fill:"#f59e0b",stroke:"#78350f","stroke-width":0.8}));
      }
    }));
    const runway=g.craneRunway;
    if(runway?.enabled&&Array.isArray(runway.beamSegments)){
      runway.beamSegments.forEach(segment=>{
        const a=P(segment.start),b=P(segment.end);
        el("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:"#7c3aed","stroke-width":4,"stroke-linecap":"round","stroke-dasharray":"7 3"});
      });
      (runway.brackets||[]).forEach(bracket=>{
        const a=P(bracket.from),b=P(bracket.to);
        el("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:"#a855f7","stroke-width":3,"stroke-dasharray":"3 3"});
      });
      (runway.supportNodes||[]).forEach(node=>{
        const p=P(node);el("circle",{cx:p.x,cy:p.y,r:3.5,fill:"#7c3aed",stroke:"#ffffff","stroke-width":1});
      });
      (runway.railSegments||[]).forEach(segment=>{const x=segment.side==="left"?-runway.axisOffsetM:g.span+runway.axisOffsetM,y=g.craneRunway.elevationM+Number(runway.loadPathInputs?.railHeight_mm||0)/1000;const p=P({x,y,z:segment.startM}),q=P({x,y,z:segment.endM});el("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:"#f59e0b","stroke-width":2.2,"stroke-linecap":"round"});if(segment.jointAtStart){el("circle",{cx:p.x,cy:p.y,r:3.2,fill:"#dc2626",stroke:"#ffffff","stroke-width":0.8});}});
    }
    const title=el("text",{x:W/2,y:25,"text-anchor":"middle",fill:"#123b52","font-size":17,"font-family":"Tahoma,Arial"});title.textContent="مدل سه‌بعدی جانمایی اجزای سوله";
    const note=el("text",{x:W/2,y:455,"text-anchor":"middle",fill:"#64748b","font-size":11,"font-family":"Tahoma,Arial"});note.textContent="نمای شماتیک آکسونومتریک ـ مقیاس تصویری";
    return true;
  }
  function renderCriticalRafterDiagram(result, contextLabel) {
    const box=$("criticalRafterDiagram");
    if(!box||!model||!result||!result.criticalDisplacement){return;}
    const critical=result.criticalDisplacement;
    const z=Number(critical.coordinates.z);
    const nodeById=new Map(model.nodes.map(n=>[n.id,n]));
    const frameMembers=model.members.filter(m=>{
      if(m.axis!=="transverse"||m.sectionKey!=="rafter")return false;
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return a&&b&&Math.abs(a.z-z)<1e-6&&Math.abs(b.z-z)<1e-6;
    });
    const selectedIds=new Set((critical.connectedMembers||[])
      .filter(m=>m.sectionKey==="rafter").map(m=>String(m.id)));
    const selected=frameMembers.filter(m=>selectedIds.has(String(m.id)));
    if(!selected.length){
      box.textContent="قطعه رفتر متصل به گره بحرانی در قاب انتخاب‌شده پیدا نشد.";
      return;
    }
    const frameNodes=frameMembers.flatMap(m=>[nodeById.get(m.start),nodeById.get(m.end)]).filter(Boolean);
    const xs=frameNodes.map(n=>n.x),ys=frameNodes.map(n=>n.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),maxY=Math.max(...ys);
    const W=980,H=370,x0=38,baseY=300,xScale=610/Math.max(maxX-minX,1),yScale=220/Math.max(maxY,1);
    const P=n=>({x:x0+(n.x-minX)*xScale,y:baseY-n.y*yScale});
    const esc=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای قاب عرضی و محل قطعه رفتر بحرانی" style="width:100%;height:auto;display:block;background:#f8fafc;border-radius:8px">';
    svg+='<text x="340" y="25" text-anchor="middle" fill="#123b52" font-size="17" font-family="Tahoma,Arial">نمای عرضی قاب سوله — '+esc(contextLabel||"مدل فعلی")+'</text>';
    svg+='<line x1="25" y1="'+baseY+'" x2="675" y2="'+baseY+'" stroke="#94a3b8" stroke-width="2"/>';
    const columns=model.members.filter(m=>m.sectionKey==="column").filter(m=>{
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return a&&b&&Math.abs(a.z-z)<1e-6&&Math.abs(b.z-z)<1e-6;
    });
    columns.forEach(m=>{const a=P(nodeById.get(m.start)),b=P(nodeById.get(m.end));svg+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#256b91" stroke-width="10" stroke-linecap="square"/>';});
    frameMembers.slice().sort((a,b)=>Math.min(nodeById.get(a.start).x,nodeById.get(a.end).x)-Math.min(nodeById.get(b.start).x,nodeById.get(b.end).x)).forEach(m=>{
      const na=nodeById.get(m.start),nb=nodeById.get(m.end),a=P(na),b=P(nb),over=m.type==="کنسول رفتر";
      const hi=selectedIds.has(String(m.id));
      svg+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+(hi?"#dc2626":over?"#8b5cf6":"#334155")+'" stroke-width="'+(hi?13:over?7:9)+'" stroke-linecap="square"'+(over?' stroke-dasharray="7 4"':"")+'/>';
      if(hi){
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        svg+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#fff" stroke-width="2"/>';
        svg+='<text x="'+mid.x+'" y="'+(mid.y-15)+'" text-anchor="middle" fill="#991b1b" font-size="12" font-weight="bold" font-family="Tahoma,Arial">'+esc(m.id)+' — '+Number(m.length).toFixed(3)+' m</text>';
      }
    });
    frameMembers.forEach(m=>[m.start,m.end].forEach(id=>{
      const n=nodeById.get(id);if(!n)return;const p=P(n);
      svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="3.2" fill="#64748b"/>';
    }));
    const cp=nodeById.get(critical.nodeId);
    if(cp){
      const p=P(cp);
      svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="8" fill="#facc15" stroke="#991b1b" stroke-width="2"/>';
      svg+='<text x="'+(p.x+10)+'" y="'+(p.y-13)+'" fill="#7f1d1d" font-size="13" font-weight="bold" font-family="Tahoma,Arial">'+esc(critical.nodeId)+' — تاج سقف</text>';
    }
    const leftCan=frameMembers.find(m=>m.type==="کنسول رفتر"&&Math.min(nodeById.get(m.start).x,nodeById.get(m.end).x)<0);
    if(leftCan){
      const a=P(nodeById.get(leftCan.start)),b=P(nodeById.get(leftCan.end)),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      svg+='<text x="'+mid.x+'" y="'+(mid.y+25)+'" text-anchor="middle" fill="#6d28d9" font-size="11" font-family="Tahoma,Arial">کنسول سایه‌بان</text>';
    }
    svg+='<text x="340" y="328" text-anchor="middle" fill="#475569" font-size="11" font-family="Tahoma,Arial">قطعات قرمز، اعضای مدل متصل به گره بحرانی‌اند؛ خط‌چین بنفش کنسول رفتر را نشان می‌دهد.</text>';
    // Schematic built-up I-girder cross-section; dimensions are intentionally not implied.
    svg+='<rect x="700" y="48" width="255" height="258" rx="8" fill="#fff" stroke="#cbd5e1"/>';
    svg+='<text x="827" y="72" text-anchor="middle" fill="#123b52" font-size="14" font-weight="bold" font-family="Tahoma,Arial">مقطع شماتیک تیرورق</text>';
    svg+='<rect x="765" y="95" width="125" height="18" fill="#64748b" stroke="#334155"/>';
    svg+='<rect x="817" y="113" width="21" height="105" fill="#94a3b8" stroke="#334155"/>';
    svg+='<rect x="765" y="218" width="125" height="18" fill="#64748b" stroke="#334155"/>';
    svg+='<text x="900" y="108" fill="#334155" font-size="11" font-family="Tahoma,Arial">بال بالا</text>';
    svg+='<text x="850" y="170" fill="#334155" font-size="11" font-family="Tahoma,Arial">جان</text>';
    svg+='<text x="900" y="232" fill="#334155" font-size="11" font-family="Tahoma,Arial">بال پایین</text>';
    svg+='<text x="827" y="265" text-anchor="middle" fill="#64748b" font-size="10" font-family="Tahoma,Arial">صرفاً شماتیک؛ نه به مقیاس</text>';
    svg+='<text x="827" y="282" text-anchor="middle" fill="#64748b" font-size="10" font-family="Tahoma,Arial">ابعاد واقعی مقطع هنوز درج نشده</text>';
    svg+='</svg>';
    const sameNode=selected.every(m=>m.start===critical.nodeId||m.end===critical.nodeId);
    box.innerHTML=svg+'<p style="margin:8px 0 0"><b>نتیجه اتصال:</b> '+(sameNode?'قطعات قرمز در گره مشترک '+esc(critical.nodeId)+' به هم می‌رسند؛ در مدل، این گره مشترک است و قطعه کوتاه به‌عنوان تیر مستقل و جدا از رفتر تعریف نشده.':'اتصال قطعات به گره بحرانی نیازمند بازبینی است.')+'</p><p style="margin:4px 0 0">نمای بالا مربوط به '+esc(contextLabel||"مدل تحلیل‌شده")+' است. شکل I فقط نوع مقطع را نشان می‌دهد؛ چون ابعاد جان و بال در گزارش موجود نیست، اندازه واقعی مقطع نمایش داده نشده است.</p>';
  }
  function showSummary(){
    if(!model)return;const counts={};model.members.forEach(m=>counts[m.type]=(counts[m.type]||0)+1);
    const rows=Object.entries(counts).map(x=>"<tr><td>"+x[0]+"</td><td>"+x[1]+"</td></tr>").join("");
    const runway=model.geometry.craneRunway;
    const runwayAudit=runway?.sectionAudit||null;
    const runwayProps=runway?.sectionProperties;
    const runwayPropsText=runwayProps?.available?" <p><b>خواص هندسی مقدماتی تیرورق I:</b> A="+(runwayProps.area_mm2/100).toFixed(2)+" cm²؛ Ix="+(runwayProps.Ix_mm4/1e4).toFixed(2)+" cm⁴؛ Iy="+(runwayProps.Iy_mm4/1e4).toFixed(2)+" cm⁴؛ Sx="+(runwayProps.Sx_mm3/1e3).toFixed(2)+" cm³؛ Sy="+(runwayProps.Sy_mm3/1e3).toFixed(2)+" cm³؛ جرم فولاد="+runwayProps.steelMass_kg_m.toFixed(2)+" kg/m (بدون ریل). J تقریبی="+(runwayProps.J_approx_mm4/1e4).toFixed(2)+" cm⁴.</p>":"";
    const runwayWeb=runway?.webAudit||{};
    const runwayWebText=runway?.enabled?" <p><b>ممیزی مقدماتی جان و سخت‌کننده:</b> "+(runwayWeb.ready?"اطلاعات هندسی کامل است؛ ظرفیت جان، لهیدگی و جوش هنوز کنترل نشده‌اند.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayWeb.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayWeb.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayWeb.dimensional||[]).join("، "))+(Number.isFinite(runwayWeb.webSlenderness)?"؛ نسبت ارتفاع آزاد جان به ضخامت: "+runwayWeb.webSlenderness.toFixed(1):"")+"</p>":"";
    const runwayLoad=runway?.loadPathAudit||{};
    const runwayContact=runway?.contactScreen||{};
    const runwayFastening=runway?.fasteningAudit||{};
    const runwayRailLayout=runway?.railLayoutAudit||{};
    const runwayRailLayoutText=runway?.enabled?" <p><b>مدل طولی ریل:</b> "+(runwayRailLayout.ready?"ایستگاه‌های هندسی: "+(runwayRailLayout.supportStations||[]).length+"؛ وصله‌های ثبت‌شده: "+(runwayRailLayout.jointPositions_m||[]).length+"؛ رفتار پیوستگی: "+(runway.railLayoutInputs?.continuity||"نامشخص")+"؛ تحلیل تیر ریل هنوز غیرفعال است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayRailLayout.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayRailLayout.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayRailLayout.dimensional||[]).join("، "))+" "+(runwayRailLayout.note||"")+"</p>":"";
    const runwayFasteningText=runway?.enabled?" <p><b>ممیزی بست‌ها، پیچ‌ها، ورق زیرسری و پد:</b> "+(runwayFastening.ready?"فیلدهای اطلاعاتی اولیه کامل‌اند؛ ظرفیت اتصالات و رفتار پد محاسبه نشده است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayFastening.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayFastening.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayFastening.dimensional||[]).join("، "))+" "+(runwayFastening.note||"")+"</p>":"";
    const runwayContactText=runway?.enabled?" <p><b>غربالگری فشار متوسط اسمی تماس چرخ:</b> "+(runwayContact.available?"بار چرخ "+runwayContact.wheelLoad_t+" تن؛ سطح مستطیلی اسمی "+runwayContact.contactArea_mm2.toFixed(0)+" mm²؛ فشار متوسط اسمی "+runwayContact.nominalAveragePressure_MPa.toFixed(3)+" MPa.":"قابل محاسبه نیست؛ اطلاعات لازم: "+(runwayContact.missing||[]).join("، "))+" <br>این مقدار فشار واقعی تماس هرتز یا کنترل مقاومت ریل/تیر نیست و معیار پذیرش طراحی محسوب نمی‌شود.</p>":"";
    const runwayLoadText=runway?.enabled?" <p><b>ممیزی هندسه مسیر بار ریل و چرخ:</b> "+(runwayLoad.ready?"ابعاد اولیه کامل‌اند؛ تحلیل توزیع بار و ظرفیت انجام نشده است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayLoad.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayLoad.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayLoad.dimensional||[]).join("، "))+"</p>"+runwayContactText+runwayFasteningText+runwayRailLayoutText:"";
    const runwayAuditText=runway?.enabled?" <p><b>ممیزی مقدماتی تیر حمال و ریل:</b> "+(runwayAudit?.ready?"فیلدهای ورودی کامل‌اند؛ طراحی و تأیید مهندسی هنوز انجام نشده است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayAudit?.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayAudit?.invalid||[]).join("، ")+"؛ کنترل ابعادی: "+(runwayAudit?.dimensional||[]).join("، "))+"</p>"+runwayPropsText+runwayWebText+runwayLoadText:"";
    const target=$("fullModelSummary");if(target)target.innerHTML="<b>مدل هندسی تولید شد:</b> "+model.geometry.frames.length+" قاب اصلی، "+model.nodes.length+" گره و "+model.members.length+" عضو هندسی."+(runway?.enabled?" گره‌های آماده اتصال تیر حمال: "+runway.supportNodeCount+" در تراز "+runway.elevationM+" متر؛ وضعیت هندسه تیر حمال: "+(runway.geometryStatus||"ثبت نشده")+"؛ قطعات تیر حمال: "+(runway.beamSegments?.length||0)+"؛ براکت‌های هندسی: "+(runway.brackets?.length||0)+"؛ این اجزا فقط داده هندسی جدا از حل‌گر هستند.":"")+runwayAuditText + "<table><thead><tr><th>نوع عضو</th><th>تعداد</th></tr></thead><tbody>"+rows+"</tbody></table><p>بارهای ثقلی سطحی به بار خطی اعضا تبدیل می‌شوند؛ بارهای مرده، زنده و برف و سه ترکیب ثقلی ULS-1 تا ULS-3 در حل‌گر خطی قابل تحلیل‌اند. بار باد و ترکیبات دارای باد/زلزله هنوز در حل‌گر اعمال نمی‌شوند. پرلین‌های سقف به‌صورت قطعات مجزا بین دو قاب ساخته شده‌اند؛ در تحلیل، انتقال جابه‌جایی در محل تکیه‌گاه برقرار و هر سه دوران انتهای هر قطعه آزاد شده است تا پرلین دهانه مجاور پیوسته فرض نشود. این مدل، مفصل ایده‌آل است و سختی واقعی کلیپس/پیچ، لغزش و اثر خروج از مرکزیت را شامل نمی‌شود؛ سایر گره‌های مشترک فعلاً صلب‌اند. مهاربندهای ترسیم‌شده نیز با مقطع تخصیص‌یافته فعال و در سختی سازه مؤثرند. اگر اتصال واقعی مفصلی، کشویی یا دارای آزادسازی باشد، نتایج فعلی می‌تواند تفاوت قابل‌توجهی داشته باشد.</p><p><b>محدوده مدل:</b> تحلیل الاستیک خطی سه‌بعدی در حال توسعه است؛ خروجی آن تا تکمیل بارگذاری، شرایط تکیه‌گاهی، آزادسازی‌ها و کنترل‌های آیین‌نامه‌ای، صرفاً مقدماتی است.</p>";
  }
  function validate3DSections(){
    if(!model)build();
    const groups=new Map();
    model.members.forEach(m=>{
      const key=m.sectionKey||"unassigned";
      if(!groups.has(key))groups.set(key,{key,count:0,member:m});
      groups.get(key).count++;
    });
    const missing=[];
    groups.forEach(g=>{
      try{
        if(g.member.craneIntegration===true){
          const s=g.member.analysisSection;
          const keys=["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"];
          if(!s||keys.some(k=>!(Number.isFinite(Number(s[k]))&&Number(s[k])>0)))
            throw new Error("خواص مستند SI تیر حمال/براکت جرثقیل ناقص است.");
          if(!String(g.member.reference||"").trim())
            throw new Error("مرجع نقشه عضو جرثقیل ثبت نشده است.");
        }else{
          if(!window.SteelSections||typeof window.SteelSections.resolveAnalysis3DSection!=="function")
            throw new Error("اتصال تخصیص‌دهنده مقطع هنوز بارگذاری نشده است.");
          window.SteelSections.resolveAnalysis3DSection(g.member);
        }
      }catch(e){
        const labels={column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید افقی دیوار",endPost:"ستونک دیوار انتهایی",endGirt:"تیر افقی دیوار انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
        missing.push({key:g.key,label:labels[g.key]||g.key,count:g.count,reason:e.message});
      }
    });
    return {ready:missing.length===0,groupCount:groups.size,memberCount:model.members.length,missing};
  }
  function run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports,extraOptions){
    return new Promise((resolve,reject)=>{
      let worker;
      try{
        worker=new Worker(new URL("js/analysis-3d-worker.js?v=20261114-crane-section-loads1",window.location.href));
      }catch(error){
        reject(new Error("امکان راه‌اندازی پردازشگر پس‌زمینه وجود ندارد: "+error.message));
        return;
      }
      let settled=false;
      const finish=(fn,value)=>{
        if(settled)return;
        settled=true;
        worker.terminate();
        fn(value);
      };
      worker.onmessage=event=>{
        const data=event.data||{};
        if(data.ok)finish(resolve,data.result);
        else finish(reject,new Error(data.error?.message||"حل‌گر پس‌زمینه پاسخ نامعتبر برگرداند."));
      };
      worker.onerror=event=>{
        event.preventDefault?.();
        finish(reject,new Error("خطای پردازشگر تحلیل سه‌بعدی: "+(event.message||"خطای ناشناخته")));
      };
      try{
        worker.postMessage({
          model:analysisModel,
          sectionsByMemberId,
          supports,
          releasePurlinRafterRotation:true,
          nodalLoads:Array.isArray(extraOptions?.nodalLoads)?extraOptions.nodalLoads:[],
          requireExplicitMemberLoads:true
        });
      }catch(error){
        finish(reject,new Error("ارسال مدل به پردازشگر پس‌زمینه ناموفق بود: "+error.message));
      }
    });
  }
  async function analyze3D(loadCase){
    if(!model)build();
    if(!window.SteelFrame3D||typeof window.SteelFrame3D.makeTransform!=="function")
      throw new Error("هسته هندسی حل‌گر سه‌بعدی بارگذاری نشده است.");
    const readiness=validate3DSections();
    if(!readiness.ready){
      const first=readiness.missing[0];
      throw new Error("مشخصات مقطع "+first.label+" ناقص است: "+first.reason+
        "؛ تعداد اعضای این گروه: "+first.count);
    }
    const cases={
      dead:{key:"dead",label:"مرده",direction:[0,-1,0],deadFactor:1},
      live:{key:"live",label:"زنده",direction:[0,-1,0],deadFactor:0},
      snow:{key:"snow",label:"برف",direction:[0,-1,0],deadFactor:0},
      wind:{key:"wind",label:"باد ـ فشار خالص ورودی",direction:null,deadFactor:0}
    };
    let selected=cases[loadCase];
    if(loadCase&&typeof loadCase==="object"&&loadCase.factors){
      const f=loadCase.factors;
      const factorKeys=["dead","live","snow","wind"];
      const badFactors=factorKeys.filter(k=>f[k]===undefined||f[k]===null||f[k]===""||!Number.isFinite(Number(f[k]))||Number(f[k])<0);
      if(badFactors.length)throw new Error("ضرایب ترکیب بار باید برای D/L/S/W صریح، عددی و نامنفی باشند: "+badFactors.join("، "));
      const windSign=loadCase.windSign===undefined?1:Number(loadCase.windSign);
      if(![1,-1].includes(windSign))throw new Error("علامت باد باید صریحاً +1 یا -1 باشد.");
      selected={...loadCase,key:"combo",label:String(loadCase.label||"ترکیب بار سه‌بعدی"),
        direction:[0,-1,0],
        factors:{dead:Number(f.dead),live:Number(f.live),snow:Number(f.snow),wind:Number(f.wind)},
        windFactor:Number(f.wind),windSign,
        directionalWindPressures:loadCase.directionalWindPressures||null,
        directionalWindCaseId:loadCase.directionalWindCaseId||null,
        deadFactor:Number(f.dead)};
    }else if(/^combo[0-2]$/.test(loadCase)){
      const comboIndex=Number(loadCase.slice(5));
      const combo=window.SteelLoads?.getData?.().combinations?.[comboIndex];
      if(!combo)throw new Error("ضرایب ترکیب بار انتخابی در دسترس نیستند.");
      const raw={dead:combo.dead,live:combo.live,snow:combo.snow};
      if(Object.values(raw).some(v=>v===undefined||v===null||v===""))throw new Error("ضرایب ترکیب انتخابی ناقص است.");
      const f={dead:Number(raw.dead),live:Number(raw.live),snow:Number(raw.snow)};
      if(Object.values(f).some(v=>!Number.isFinite(v)||v<0))throw new Error("ضرایب ترکیب انتخابی ناقص یا نامعتبر است.");
      selected={key:loadCase,label:combo.name,direction:[0,-1,0],
        factors:{...f,wind:0},windFactor:0,windSign:1,
        deadFactor:f.dead};
    }
    if(!selected)throw new Error("حالت بار انتخابی پشتیبانی نمی‌شود." );
     if(!window.SteelWholeBuildingLoadPathAudit?.audit)throw new Error("ماژول ممیزی مسیر بار کل ساختمان بارگذاری نشده است؛ تحلیل متوقف شد." );
     const loadPathAudit=window.SteelWholeBuildingLoadPathAudit.audit(model,window.SteelLoads?.getData?.()||{});
     window.SteelStructuralModel.lastLoadPathAudit=loadPathAudit;
     if(!loadPathAudit.success)throw new Error("تحلیل سه‌بعدی به‌دلیل نقص ممیزی مسیر بار متوقف شد: "+loadPathAudit.issues.slice(0,8).join("؛ "));
    const analysisModel={
      nodes:model.nodes.map(n=>({...n})),
      members:model.members.map(m=>({...m}))
    };
    // Explicit concrete tie-beam routes are admitted only after geometry audit
    // and explicit joint selection. Unknown/invalid routes never enter the solver.
    const tieBeamIntegration={included:[],skipped:[],reinforcementWarnings:[]};
    const tieData=window.SteelTieBeamLayout?.getData?.();
    const tieAudit=window.SteelTieBeamLayout?.audit?.();
    if(tieData&&Array.isArray(tieData.routes)&&tieData.routes.length){
      const auditById=new Map((tieAudit?.rows||[]).map(r=>[String(r.id),r]));
      const nodeIds=new Set(analysisModel.nodes.map(n=>String(n.id)));
      tieData.routes.forEach(route=>{
        const id=String(route.id||"");
        const audited=auditById.get(id);
        const reasons=[];
        if(!audited||!audited.valid)reasons.push(...(audited?.reasons||["ممیزی هندسی مسیر در دسترس نیست"]));
         if(!(Number(route.heightM)>0))reasons.push("ارتفاع شناژ برای تعیین محور هندسی و بازوی صلب معتبر نیست.");
        if(!nodeIds.has(String(route.start))||!nodeIds.has(String(route.end)))reasons.push("گره ابتدا/انتها در مدل تحلیل فعلی وجود ندارد");
        if(!["rigid","pinned"].includes(route.startJoint)||!["rigid","pinned"].includes(route.endJoint))reasons.push("نوع اتصال هر دو انتها باید صریحاً گیردار یا مفصلی باشد");
        if(reasons.length){tieBeamIntegration.skipped.push({id,reasons});return;}
        const p=window.SteelTieBeamLayout.rectangleProperties(route,audited.axis);
        const startNode=analysisModel.nodes.find(n=>String(n.id)===String(route.start));
        const endNode=analysisModel.nodes.find(n=>String(n.id)===String(route.end));
        const coordinate=audited.axis==="X"?"x":"z";
        const cross=audited.axis==="X"?"z":"x";
        const direction=Math.sign(Number(endNode[coordinate])-Number(startNode[coordinate]));
        const span=Math.abs(Number(endNode[coordinate])-Number(startNode[coordinate]));
        const intermediate=analysisModel.nodes.filter(n=>
          (n.kind==="base"||n.kind==="endwall-base")&&
          Math.abs(Number(n.y)-Number(startNode.y))<=0.01&&
          Math.abs(Number(n[cross])-Number(startNode[cross]))<=0.01&&
          direction*(Number(n[coordinate])-Number(startNode[coordinate]))>0.01&&
          direction*(Number(endNode[coordinate])-Number(n[coordinate]))>0.01
        ).sort((a,b)=>direction*(Number(a[coordinate])-Number(b[coordinate])));
        const routeNodes=[startNode,...intermediate,endNode];
        const segmentIds=[];
        const warnings=audited.detailingWarnings||[];
        let segmentLength=0,duplicate=false;
        for(let si=0;si<routeNodes.length-1;si++){
          const ni=routeNodes[si],nj=routeNodes[si+1];
          const length=Math.hypot(nj.x-ni.x,nj.y-ni.y,nj.z-ni.z);
          if(!(length>0.001)){duplicate=true;break;}
          const memberId="TIE_BEAM_"+id.replace(/[^A-Za-z0-9_-]/g,"_")+"_S"+(si+1);
          if(analysisModel.members.some(m=>String(m.id)===memberId)){duplicate=true;break;}
          const releases={
            i:si===0&&route.startJoint==="pinned"?[4,5]:[],
            j:si===routeNodes.length-2&&route.endJoint==="pinned"?[4,5]:[]
          };
          analysisModel.members.push({
            id:memberId,start:ni.id,end:nj.id,type:"شناژ بتنی",
            sectionKey:"tieBeam",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"concrete-member-self-weight"},endReleases:releases,
            // Base-node joint is located at the common footing/tie top datum.
            // The beam physical centroidal axis is h/2 below that joint.
            endOffsets:{i:[0,-Number(route.heightM)/2,0],j:[0,-Number(route.heightM)/2,0]},
            tieBeamDensityKNm3:Number(route.densityKNm3),
            analysisSection:{E:p.E,G:p.G,A:p.A,Iy:p.Iy,Iz:p.Iz,J:p.J,sectionKey:"tieBeam",sectionLabel:"مقطع مستطیلی شناژ "+route.widthM+"×"+route.heightM+" m"}
          });
          segmentIds.push(memberId);segmentLength+=length;
        }
        if(duplicate){
          analysisModel.members=analysisModel.members.filter(m=>!segmentIds.includes(String(m.id)));
          tieBeamIntegration.skipped.push({id,reasons:["تقسیم مسیر در گره‌های پایه میانی با شناسه تکراری یا قطعه با طول صفر روبه‌رو شد"]});return;
        }
        tieBeamIntegration.included.push({id,memberId:segmentIds[0],memberIds:segmentIds,
          intermediateBaseNodes:intermediate.map(n=>n.id),start:route.start,end:route.end,
          startJoint:route.startJoint,endJoint:route.endJoint,axis:audited.axis,
          lengthM:segmentLength,segmentCount:segmentIds.length,
          volumeM3:segmentLength*route.widthM*route.heightM,
          selfWeightKN:segmentLength*route.widthM*route.heightM*route.densityKNm3,
          reinforcement:route.reinforcement||tieData.reinforcement,detailingWarnings:warnings,
          stiffnessBasis:"gross_uncracked_rectangular_concrete_section_with_rigid_end_offsets",
          topAlignment:"رویه بالای شناژ و رویه بالای پی هم‌تراز؛ محور هندسی عضو به‌اندازه نصف ارتفاع شناژ پایین‌تر است",
          centroidOffsetDownM:Number(route.heightM)/2,
          continuity:"مسیر در گره‌های پایه میانی به قطعات متصل با پیوستگی دوران تقسیم شده است"});
        if(warnings.length)tieBeamIntegration.reinforcementWarnings.push({id,warnings});
      });
    }
    // Build an indexed node registry and validate connectivity before creating element loads.
    const nodeById=new Map();
    const duplicateNodeIds=[];
    analysisModel.nodes.forEach(n=>{
      if(nodeById.has(n.id)) duplicateNodeIds.push(n.id);
      else nodeById.set(n.id,n);
    });
    if(duplicateNodeIds.length){
      throw new Error("شناسه گره تکراری در مدل: "+duplicateNodeIds.slice(0,8).join("، ")+
        "؛ تعداد گره‌ها: "+analysisModel.nodes.length);
    }
    // Tapered columns/rafters are split into analysis elements before section assignment.
    // Each segment receives its own midpoint section properties and self-weight.
    let taperedSegmentationAudit=null;
    if(window.SteelTaperedSections&&typeof window.SteelTaperedSections.segmentModel==="function"){
      const segmented=window.SteelTaperedSections.segmentModel(analysisModel,
        {span:Number(model.geometry?.span||$("span")?.value),height:Number($("height")?.value)},window.SteelTaperedSections.getData?.().segmentsPerMember||8);
      analysisModel.nodes=segmented.model.nodes;
      analysisModel.members=segmented.model.members;
      taperedSegmentationAudit=segmented.audit;
      analysisModel.nodes.slice(model.nodes.length).forEach(n=>nodeById.set(n.id,n));
    }
    // Self-weight is added to the DEAD case only. Steel unit weight = 78.5 kN/m³.
    // Area A comes from the same assigned section properties used by the 3D solver.
    const steelUnitWeightKNm3=78.5;
    let selfWeightKN=0, selfWeightMemberCount=0;
    const selfWeightByGroup=Object.create(null);
    const sectionsByMemberId=Object.create(null);
    analysisModel.members.forEach(m=>{
      if(!m.lineLoads||!["dead","live","snow","wind","windLeft","windRight","windEnd"].every(k=>Number.isFinite(m.lineLoads[k])))
        throw new Error("دفتر بار عضو "+m.id+" ناقص است؛ مقادیر صفر نیز باید صریح ثبت شوند.");
      const lineLoad=selected.factors
        ? (m.lineLoads.dead*selected.factors.dead+
           m.lineLoads.live*selected.factors.live+
           m.lineLoads.snow*selected.factors.snow)
        : m.lineLoads[selected.key];
      if(!Number.isFinite(lineLoad))throw new Error("بار عضو "+m.id+" عدد معتبر نیست.");
      const a=nodeById.get(m.start);
      const b=nodeById.get(m.end);
      if(!a||!b){
        const missing=[!a?"ابتدا "+String(m.start):"",!b?"انتها "+String(m.end):""].filter(Boolean).join(" و ");
        const sample=analysisModel.nodes.slice(-8).map(n=>n.id).join("، ");
        throw new Error("اتصال هندسی عضو "+m.id+" ("+m.type+") ناقص است؛ گره ناموجود: "+
          missing+"؛ تعداد گره‌های مدل: "+analysisModel.nodes.length+
          "؛ شناسه‌های پایانی گره‌ها: "+sample+
          "؛ لطفاً این پیام کامل را برای بررسی بفرستید.");
      }
      let section;
      if(m.sectionKey==="tieBeam")section=m.analysisSection;
      else if(m.craneIntegration===true){
        const cs=m.analysisSection||{};
        const keys=["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"];
        if(keys.some(k=>!(Number.isFinite(Number(cs[k]))&&Number(cs[k])>0)))
          throw new Error("خواص SI عضو جرثقیل "+m.id+" ناقص است.");
        section={E:Number(cs.E_Pa),G:Number(cs.G_Pa),A:Number(cs.A_m2),Iy:Number(cs.Iy_m4),Iz:Number(cs.Iz_m4),J:Number(cs.J_m4),sectionKey:m.sectionKey,sectionLabel:m.sectionKey+" ـ مقطع مستند جرثقیل"};
      }else section=window.SteelSections.resolveAnalysis3DSection(m);
      if(m.sectionKey!=="tieBeam"&&window.SteelTaperedSections&&typeof window.SteelTaperedSections.resolveForMember==="function"){
        const taper=window.SteelTaperedSections.resolveForMember(m,analysisModel.nodes,{span:Number($("span")?.value),height:Number($("height")?.value)},section);
        section=taper.section;
        if(taper.applied){
          m.taperApplied=true;m.taperCoordinate=taper.coordinate;m.taperProperties=taper.properties;
        }
      }
      sectionsByMemberId[String(m.id)]={E:section.E,G:section.G,A:section.A,Iy:section.Iy,Iz:section.Iz,J:section.J,sectionKey:section.sectionKey,sectionLabel:section.sectionLabel,profile:section.profile};
      let selfWeightLineLoad=0;
      if(selected.deadFactor>0){
        const memberLength=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
        const memberUnitWeight=m.sectionKey==="tieBeam"?Number(m.tieBeamDensityKNm3):steelUnitWeightKNm3;
        if(!(memberUnitWeight>0&&Number.isFinite(memberUnitWeight)))throw new Error("وزن مخصوص عضو "+m.id+" معتبر نیست.");
        selfWeightLineLoad=section.A*memberUnitWeight*selected.deadFactor;
        const memberWeight=selfWeightLineLoad*memberLength;
        selfWeightKN+=memberWeight;
        selfWeightMemberCount++;
        const groupKey=String(m.sectionKey||"unknown");
        const group=selfWeightByGroup[groupKey]||(selfWeightByGroup[groupKey]={count:0,lengthM:0,areaM2:section.A,unitWeightKNm3:memberUnitWeight,totalKN:0});
        group.count++;group.lengthM+=memberLength;group.totalKN+=memberWeight;
      }
      const totalLineLoad=lineLoad+selfWeightLineLoad;
      const tr=window.SteelFrame3D.makeTransform([a.x,a.y,a.z],[b.x,b.y,b.z]);
      let global;
      if(selected.key==="wind"||selected.windFactor>0){
        // Wind inputs are signed NET pressures (kN/m²), not basic wind speed.
        const windFactor=selected.key==="wind"?1:selected.windFactor;
        const windSign=selected.key==="wind"?1:selected.windSign;
        // Positive = pressure toward the enclosed building; negative = suction.
        // Roof pressure is transferred to purlins normal to each roof slope.
        // Side-wall pressure is transferred to longitudinal wall girts, normal to the wall.
        global=[0,0,0];
        // A wind combination carries its factored gravity actions as well.
        if(selected.key!=="wind")global[1]-=totalLineLoad*1000;
        const directional=selected.directionalWindPressures
          ?window.SteelDirectionalWind3D?.mapMemberLoad?.(m,selected.directionalWindPressures,model.geometry)
          :null;
        if(selected.directionalWindPressures&&!directional)
          throw new Error("مبدل بار باد جهت‌دار بارگذاری نشده یا عضو پشتیبانی نمی‌شود: "+m.id);
        if(directional){
          const windGlobal=directional.globalKNm.map(v=>v*1000);
          global=window.SteelDirectionalWind3D.combineGlobalLoads(global,windGlobal,windFactor);
        }else if(m.sectionKey==="roofPurlin"){
          const half=Number(model.geometry.span)/2,rise=Number(model.geometry.rise),slope=rise/half,norm=Math.hypot(slope,1);
          const leftWidth=m.side==="ridge"?Number(m.lineLoads?.tributaryWidthLeft||0):(m.side==="left"?Number(m.lineLoads?.tributaryWidth||0):0);
          const rightWidth=m.side==="ridge"?Number(m.lineLoads?.tributaryWidthRight||0):(m.side==="right"?Number(m.lineLoads?.tributaryWidth||0):0);
          const left=Number(m.lineLoads?.windLeft||0)*windSign*1000*windFactor,right=Number(m.lineLoads?.windRight||0)*windSign*1000*windFactor;
          global[0]+=left*slope/norm-right*slope/norm;
          global[1]-=(left+right)/norm;
        }else if(m.sectionKey==="wallGirt"){
          const wall=Number(m.lineLoads?.wind||0)*windSign*1000*windFactor;
          global[0]+=m.side==="left"?wall:-wall;
        }else if(m.sectionKey==="endGirt"){
          const endWall=Number(m.lineLoads?.windEnd||0)*windSign*1000*windFactor;
          global[2]+=m.endFace==="front"?endWall:-endWall;
        }
      }else{
        global=selected.direction.map(v=>v*totalLineLoad*1000);
      }
      const axes=[tr.axes.x,tr.axes.y,tr.axes.z];
      const local=axes.map(axis=>axis.reduce((sum,v,i)=>sum+v*global[i],0));
      m.analysisLoad={uniformLocal:local,globalUniform:global};
      m.analysisLoad.selfWeightKNm=selfWeightLineLoad;
    });
    if(!window.SteelMemberLoadPreflight?.audit)throw new Error("ماژول ممیزی نهایی بار تک‌تک اعضا بارگذاری نشده است.");
    const preparedMemberLoadAudit=window.SteelMemberLoadPreflight.audit(analysisModel.members);
    if(!preparedMemberLoadAudit.success)throw new Error("ممیزی نهایی بار اعضا پیش از حل‌گر ناموفق است: "+preparedMemberLoadAudit.issues.slice(0,10).join("؛ "));
    const fixed= $("baseConnection")?.value==="fixed";
    const supports=analysisModel.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>({
      nodeId:n.id,
      fixedDofs:fixed?[0,1,2,3,4,5]:[0,1,2]
    }));
    if(!supports.length)throw new Error("هیچ گره پایه‌ای برای تعریف تکیه‌گاه پیدا نشد.");
    const wallDeadLoadAudit=loadPathAudit.wallDeadLoadTransfer;
    if(!wallDeadLoadAudit?.success||wallDeadLoadAudit.loadTransferEnabled!==true)throw new Error("انتقال وزن مرده دیوار به تکیه‌گاه‌های فونداسیون کامل نیست: "+(wallDeadLoadAudit?.issues||["ممیزی مسیر بار، انتقال معتبر وزن دیوار را تأیید نکرد."]).join("؛ "));
    const wallDeadNodalLoads=window.SteelWallDeadLoadTransfer.prepareNodalLoads(model,selected.deadFactor,wallDeadLoadAudit);
    const allNodalLoads=[...(Array.isArray(selected.nodalLoads)?selected.nodalLoads:[]),...wallDeadNodalLoads];
    const nodalMap=new Map();
    allNodalLoads.forEach(load=>{
      if(!load||load.nodeId==null||!Array.isArray(load.values)||load.values.length!==6||load.values.some(v=>!Number.isFinite(v)))throw new Error("بار گره‌ای افزوده دارای شناسه یا بردار شش‌مؤلفه‌ای نامعتبر است.");
      const id=String(load.nodeId),entry=nodalMap.get(id)||{nodeId:id,values:[0,0,0,0,0,0]};
      load.values.forEach((v,i)=>entry.values[i]+=v);nodalMap.set(id,entry);
    });
    const customNodalLoads=[...nodalMap.values()];
    const result=await run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports,{nodalLoads:customNodalLoads});
    result.additionalNodalLoadCount=customNodalLoads.length;
    result.wallDeadLoadTransfer={totalWeightKN:wallDeadLoadAudit.totalWeightKN,deadFactor:selected.deadFactor,appliedWeightKN:wallDeadLoadAudit.totalWeightKN*selected.deadFactor,faces:wallDeadLoadAudit.rows,nodalLoads:wallDeadNodalLoads};
    result.loadPathAudit=loadPathAudit;
     result.preparedMemberLoadAudit=preparedMemberLoadAudit;
     result.memberLoadLedger=analysisModel.members.map(m=>({
       memberId:String(m.id),type:String(m.type||""),sectionKey:String(m.sectionKey||""),
       start:String(m.start),end:String(m.end),
       lineLoads:m.lineLoads?JSON.parse(JSON.stringify(m.lineLoads)):null,
       appliedAnalysisLoad:m.analysisLoad?JSON.parse(JSON.stringify(m.analysisLoad)):null,
       loadRole:m.lineLoads?.loadRole||(
         m.sectionKey==="roofPurlin"?"roof-surface-tributary-load":
         m.sectionKey==="wallGirt"?"longitudinal-wall-pressure":
         m.sectionKey==="endGirt"?"end-wall-pressure":
         /رفتر/.test(String(m.type||""))?"purlin-reactions-and-self-weight":
         ["wallBrace","roofBrace"].includes(m.sectionKey)?"nodal-bracing-force-path":"member-self-weight-or-connected-reactions")
     }));
    result.craneLoadCaseId=selected.craneLoadCaseId||null;
    result.craneLoadTransfer=selected.craneLoadTransfer||null;
    if(taperedSegmentationAudit)result.taperedSegmentation=taperedSegmentationAudit;
    const sourceMembersById=new Map(analysisModel.members.map(m=>[String(m.id),m]));
    result.members.forEach(member=>{
      const source=sourceMembersById.get(String(member.id));
      if(source?.analysisLoad)member.analysisLoad=JSON.parse(JSON.stringify(source.analysisLoad));
    });

    if(result.maxDisplacement){
      const criticalNode=analysisModel.nodes.find(n=>n.id===result.maxDisplacement.nodeId);
      if(criticalNode){
        result.criticalDisplacement={
          nodeId:criticalNode.id,
          kind:criticalNode.kind||"",
          coordinates:{x:criticalNode.x,y:criticalNode.y,z:criticalNode.z},
          ux:result.maxDisplacement.components[0],
          uy:result.maxDisplacement.components[1],
          uz:result.maxDisplacement.components[2],
          magnitude:result.maxDisplacement.magnitude,
          connectedMembers:analysisModel.members
            .filter(m=>m.start===criticalNode.id||m.end===criticalNode.id)
            .map(m=>({id:m.id,type:m.type,sectionKey:m.sectionKey,start:m.start,end:m.end}))
        };
      }
    }
    // Create a diagnostic report for members connected to the maximum-displacement node.
    // The force signs follow the solver's local member-end convention.
    if(result.criticalDisplacement&&Array.isArray(result.members)){
      const connectedIds=new Set(result.criticalDisplacement.connectedMembers.map(m=>String(m.id)));
      const analysisMemberById=new Map(analysisModel.members.map(x=>[String(x.id),x]));
      result.criticalMemberReport=result.members
        .filter(m=>connectedIds.has(String(m.id)))
        .map(m=>{
          const source=analysisMemberById.get(String(m.id))||{};
          const f=Array.isArray(m.localEndForces)?m.localEndForces:[];
          const section=m.section||{};
          return {
            id:m.id,type:m.type,length:m.length,start:source.start||null,end:source.end||null,
            profile:source.profile||source.sectionLabel||"",
            sectionKey:source.sectionKey||"",
            endI:{N:f[0],Vy:f[1],Vz:f[2],T:f[3],My:f[4],Mz:f[5]},
            endJ:{N:f[6],Vy:f[7],Vz:f[8],T:f[9],My:f[10],Mz:f[11]},
            section:{A:section.A,Iy:section.Iy,Iz:section.Iz,J:section.J,E:section.E,G:section.G},
            analysisLoad:source.analysisLoad?JSON.parse(JSON.stringify(source.analysisLoad)):null,
            localAxes:m.localAxes?JSON.parse(JSON.stringify(m.localAxes)):null
          };
        });
      result.criticalMemberDiagnostics={
        connectedCount:result.criticalMemberReport.length,
        withAnalysisLoad:result.criticalMemberReport.filter(m=>m.analysisLoad!==null).length,
        withLocalAxes:result.criticalMemberReport.filter(m=>m.localAxes!==null).length,
        sourceMemberCount:analysisModel.members.length,
        solverMemberCount:result.members.length
      };
      // Independently transform connected member-end actions into global axes
      // and check force/moment closure at the critical joint.
      const nodeId=result.criticalDisplacement.nodeId;
      const forceSum=[0,0,0],momentSum=[0,0,0];
      const forceScale=[0,0,0],momentScale=[0,0,0],contributions=[];
      const addVector=(target,absolute,axes,values)=>{
        const v=[0,1,2].map(i=>axes.x[i]*values[0]+axes.y[i]*values[1]+axes.z[i]*values[2]);
        v.forEach((x,i)=>{target[i]+=x;absolute[i]+=Math.abs(x);});
        return v;
      };
      let complete=true;
      result.criticalMemberReport.forEach(m=>{
        const atStart=m.start===nodeId,atEnd=m.end===nodeId;
        if(!atStart&&!atEnd)return;
        if(!m.localAxes||!m.start||!m.end){complete=false;return;}
        const e=atStart?m.endI:m.endJ,a=m.localAxes;
        const fg=addVector(forceSum,forceScale,a,[e.N,e.Vy,e.Vz]);
        const mg=addVector(momentSum,momentScale,a,[e.T,e.My,e.Mz]);
        contributions.push({memberId:m.id,end:atStart?"I":"J",forceGlobalN:fg,momentGlobalNm:mg});
      });
      const vnorm=v=>Math.hypot(v[0],v[1],v[2]);
      result.criticalJointEquilibrium={
        nodeId,complete,memberCount:contributions.length,contributions,
        forceResidualN:forceSum,momentResidualNm:momentSum,
        relativeForceResidual:vnorm(forceSum)/Math.max(vnorm(forceScale),1),
        relativeMomentResidual:vnorm(momentSum)/Math.max(vnorm(momentScale),1),
        note:"کنترل جمع کنش‌های انتهایی اعضای متصل در محورهای جهانی؛ این کنترل تعادل موضعی است و تأیید مقاومت یا اتصال نیست."
      };
    }
    result.foundationModelFingerprint=JSON.stringify({
      nodes:analysisModel.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),
      members:analysisModel.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),
      nodalLoads:customNodalLoads.map(x=>[x.nodeId,x.values]),
      sections:window.SteelSections?.read?.()||null,
      support:$("baseConnection")?.value||"pinned"
    });
    result.tieBeamIntegration={...tieBeamIntegration,activeInAnalysis:tieBeamIntegration.included.length>0,
      concreteSelfWeightIncluded:selected.deadFactor>0&&tieBeamIntegration.included.length>0,
      note:"فقط مسیرهای معتبر با اتصال صریح وارد تحلیل شده‌اند. سختی مقطع ناخالص و ترک‌نخورده فرض شده؛ اثر آرماتور، ترک‌خوردگی، اندرکنش پی/خاک و ظرفیت مهاری در این مرحله طراحی نشده‌اند."};
    result.loadCase=selected.key;
    result.loadCaseLabel=selected.label;
    result.supportType=fixed?"گیردار":"مفصلی";
    result.selfWeight={included:selected.deadFactor>0,deadLoadFactor:selected.deadFactor,steelUnitWeightKNm3,unitWeightBySectionGroup:Object.fromEntries(Object.entries(selfWeightByGroup).map(([k,v])=>[k,v.unitWeightKNm3])),totalKN:selfWeightKN,memberCount:selfWeightMemberCount,bySectionGroup:selfWeightByGroup};
    result.connectionModel="اتصال پرلین به رفتر: تقریب کلیپس/نبشی دوپیچه؛ انتقال جابه‌جایی مشترک است، دو دوران خمشی پرلین از رفتر جدا شده‌اند و دوران حول محور طولی پرلین مشترک باقی مانده است. این مدل سختی واقعی اتصال را محاسبه نمی‌کند.";
    window.SteelTieBeamReinforcement?.captureAnalysis?.(result);
    result.warning="وزن خود فولاد با وزن مخصوص 78.5 kN/m³ و وزن خود شناژ بتنی با وزن مخصوص تعریف‌شده برای هر مسیر، در حالت مرده و ترکیبات دارای ضریب D محاسبه می‌شود؛ وزن شناژ فقط یک‌بار و با سطح مقطع ناخالص اضافه می‌شود. حالت باد فقط فشار خالص دستی واردشده را به‌صورت برداری به پرلین‌های سقف و قیدهای طولی دو دیوار جانبی منتقل می‌کند؛ فشارهای بادگیر/بادپناه، ضرایب فشار خارجی و داخلی، ناحیه مثلثی دیوار انتهایی بالای آخرین قید، بازشوهای غالب و پیچش کلی هنوز منظور نشده‌اند. ترکیبات موجود D، Lr، S و W در حالت سه‌بعدی مقدماتی قابل تحلیل‌اند، اما ضرایب و پوشش آن‌ها باید با متن رسمی مبحث ششم تطبیق نهایی شوند. ورودی باد در این مرحله سرعت مبنای باد نیست و باید فشار خالص بر حسب kN/m² باشد؛ مثبت به سمت داخل ساختمان و منفی مکش به سمت بیرون است. ترکیبات ثقلی ULS-1 تا ULS-3 جداگانه باقی می‌مانند. اتصال پرلین به رفتر با جداسازی دو دوران خمشی و حفظ دوران پیچشی حول محور طولی پرلین تقریب شده، اما سختی واقعی کلیپس، لغزش پیچ، مقاومت اتصال و جزئیات اجرایی کنترل نشده‌اند. P-Delta و کنترل آیین‌نامه‌ای نیز وجود ندارد. مهاربندهای پیشنهادی با سختی کامل مقطع وارد تحلیل می‌شوند؛ صحت جزئیات اتصال باید جداگانه تأیید شود.";
    return result;
  }
  async function analyzeFoundationEnvelope(){
    if(!model)build();
    const combos=window.SteelLoads?.getData?.().combinations;
    if(!Array.isArray(combos)||!combos.length)throw new Error("ترکیبات بار در دسترس نیستند.");
    const invalidCombo=combos.find(c=>!c||["dead","live","snow"].some(k=>c[k]===undefined||c[k]===null||c[k]==="")||["dead","live","snow"].some(k=>!Number.isFinite(Number(c[k]))||Number(c[k])<0));
    if(invalidCombo)throw new Error("ضرایب یکی از ترکیبات بار ناقص یا نامعتبر است؛ مقدار تهی/نامشخص به صفر تبدیل نمی‌شود.");
    const gravity=combos.map((c,i)=>({label:String(c.name||("ترکیب ثقلی "+(i+1))),factors:{dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow)}}));
    if(gravity.some(c=>!c.label.trim()||Object.values(c.factors).some(v=>!Number.isFinite(v))))throw new Error("نام یا ضرایب یکی از ترکیبات بار نامعتبر/ناقص است.");
    const windPresent=model.members.some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
    const cases=gravity.map(c=>({label:c.label,factors:c.factors}));
    if(windPresent)gravity.forEach(c=>[1,-1].forEach(sign=>cases.push({label:c.label+" + باد "+(sign>0?"مثبت":"منفی")+" (ضریب ۱٫۰)",factors:c.factors,wind:1,windSign:sign})));
    const nodes=model.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base");
    if(!nodes.length)throw new Error("گره پایه‌ای برای استخراج واکنش وجود ندارد.");
    const samples=[];
    for(let i=0;i<cases.length;i++){
      const spec=cases[i];
      const result=await analyze3D({label:spec.label,factors:{...spec.factors,wind:spec.wind||0},windSign:spec.windSign||1});
      if(!result||!Array.isArray(result.reactions)||!result.foundationModelFingerprint)throw new Error("نتیجه واکنش معتبر برای "+spec.label+" دریافت نشد.");
      if(!result.equilibrium||result.equilibrium.ok!==true)throw new Error("کنترل تعادل حل‌گر برای ترکیب «"+spec.label+"» موفق نیست؛ پوش فونداسیون متوقف شد.");
      const map=new Map();
      for(const reaction of result.reactions){
        if(!reaction||reaction.nodeId==null||map.has(reaction.nodeId))throw new Error("شناسه واکنش تهی یا تکراری در ترکیب «"+spec.label+"»؛ پوش فونداسیون متوقف شد.");
        if(!Array.isArray(reaction.values)||reaction.values.length<6||reaction.values.slice(0,6).some(v=>!Number.isFinite(Number(v))))throw new Error("بردار واکنش شش‌مؤلفه‌ای نامعتبر برای گره "+reaction.nodeId+" در ترکیب «"+spec.label+"».");
        map.set(reaction.nodeId,reaction.values.slice(0,6).map(Number));
      }
      const missing=nodes.filter(n=>!map.has(n.id)).map(n=>n.id);
      if(missing.length)throw new Error("حل‌گر واکنش این گره‌های پایه را برنگردانده است: "+missing.join(", ")+"؛ مقدار صفر جایگزین نشد.");
      samples.push({label:spec.label,factors:{...spec.factors,wind:Number(spec.wind)||0},windSign:spec.windSign||1,equilibrium:result.equilibrium,reactions:nodes.map(n=>({nodeId:n.id,values:map.get(n.id).slice()}))});
    }
    const rows=nodes.map(n=>{
      const values=samples.map(s=>({label:s.label,values:s.reactions.find(r=>r.nodeId===n.id)?.values||[0,0,0,0,0,0]}));
      const envelopes=[0,1,2,3,4,5].map(k=>{
        let min=Infinity,max=-Infinity,minCase="",maxCase="";
        values.forEach(s=>{const v=Number(s.values[k])||0;if(v<min){min=v;minCase=s.label;}if(v>max){max=v;maxCase=s.label;}});
        return {min,max,minCase,maxCase};
      });
      return {nodeId:n.id,x:Number(n.x)||0,y:Number(n.y)||0,z:Number(n.z)||0,kind:n.kind,envelopes,caseReactions:values.map(s=>({label:s.label,values:s.values.slice()}))};
    }).sort((a,b)=>a.z-b.z||a.x-b.x);
    return {generatedAt:new Date().toISOString(),supportType:$("baseConnection")?.value==="fixed"?"گیردار":"مفصلی",units:"N,N.m",rows,cases:samples.map(s=>({label:s.label,factors:s.factors,windSign:s.windSign,equilibrium:s.equilibrium})),windCasesIncluded:windPresent,windFactor:windPresent?1:null,foundationModelFingerprint:samples[0]?.reactions?JSON.stringify({nodes:model.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),members:model.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),sections:window.SteelSections?.read?.()||null,support:$("baseConnection")?.value||"pinned"}):null,limitations:["پوش فقط بر اساس ترکیبات موجود در نرم‌افزار ساخته شده و ضرایب آن هنوز با نسخه رسمی آیین‌نامه تطبیق نهایی نشده‌اند.","باد مثبت و منفی با ضریب ۱٫۰ فقط غربال مقدماتی است؛ ترکیبات کامل باد، زلزله، uplift و ضرایب بار آیین‌نامه‌ای تضمین نشده‌اند.","تحلیل خطی مرتبه اول است؛ P-Delta، کمانش، اندرکنش خاک و سازه و طراحی پی انجام نشده است."]};
  }
  function getData(){return model?{geometry:model.geometry,nodes:model.nodes,members:model.members}:null;}
  function setData(data){
    if(data&&data.geometry){const g=data.geometry,map={roofPurlinSpacing:"modelPurlinSpacing",wallGirtSpacing:"modelGirtSpacing",endPostSpacing:"modelEndPostSpacing",braceBays:"modelBraceBays"};Object.entries(map).forEach(([k,id])=>{if($(id)&&g[k]!=null)$(id).value=g[k];});if($("craneRunwayAxisOffset")&&g.craneRunway?.axisOffsetM!=null)$("craneRunwayAxisOffset").value=g.craneRunway.axisOffsetM;if($("craneRunwaySupportType"))$("craneRunwaySupportType").value=g.craneRunway?.supportType||"";Object.entries(RUNWAY_SECTION_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.sectionInputs?.[key]??(key==="steelGrade"?"ST37":"");});Object.entries(RUNWAY_STIFFENER_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.stiffenerInputs?.[key]??"";});Object.entries(RUNWAY_LOAD_PATH_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.loadPathInputs?.[key]??"";});Object.entries(RUNWAY_FASTENING_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.fasteningInputs?.[key]??"";});Object.entries(RUNWAY_RAIL_LAYOUT_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.railLayoutInputs?.[key]??(key==="firstSupportOffset_m"?"0":"");});const rf=g.craneRunway?.railFemInputs||{};if($("craneRunwayRailSupportStiffness"))$("craneRunwayRailSupportStiffness").value=rf.supportStiffnessCsv||"";if($("craneRunwayRailSupportStiffnessSource"))$("craneRunwayRailSupportStiffnessSource").value=rf.supportStiffnessSource||"";if($("craneRunwayRailWheelLoads"))$("craneRunwayRailWheelLoads").value=rf.pointLoadsJson||"";if($("craneRunwayRailMovingTrain"))$("craneRunwayRailMovingTrain").value=rf.movingTrainJson||"";if($("craneRunwayRailMovingStep"))$("craneRunwayRailMovingStep").value=rf.movingStepM||"0.25";}
    build();draw();showSummary();
  }
  function validate(){try{build();return "";}catch(e){return e.message;}}
  function analyzeCraneRail(input){if(!window.SteelRailBeamFEM)return {success:false,analysisEnabled:false,issues:["ماژول تحلیل تیر ریل بارگذاری نشده است."]};return window.SteelRailBeamFEM.analyzeIfReady(input||{});}
  function analyzeCraneRailMovingEnvelope(input){if(!window.SteelRailBeamFEM?.movingLoadEnvelope)return {success:false,analysisEnabled:false,issues:["تابع جاروب بار متحرک بارگذاری نشده است."]};return window.SteelRailBeamFEM.movingLoadEnvelope(input||{});}
  function getProposedUnbracedLengths(){if(!model)build();const g=model.geometry;return{column:g.height,rafter:Math.hypot(g.span/2,g.rise),roofPurlin:g.spacing,wallGirt:g.spacing,status:"پیشنهاد هندسی؛ تا تأیید جزئیات مهار و اتصال، مقدار قطعی طراحی نیست"};}
  function init(){
    ensurePanel();
    if (!document.getElementById("modelProgressStyle")) {
      const style = document.createElement("style");
      style.id = "modelProgressStyle";
      style.textContent = ".model-progress{position:fixed;top:10px;left:10px;right:10px;z-index:2147483000;margin:0;padding:14px;border:3px solid #075985;border-radius:12px;background:#ffffff;color:#102a43;box-shadow:0 8px 28px rgba(0,0,0,.35)}.model-progress[hidden]{display:none!important}.model-progress-head{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:12px}.model-progress-track{height:9px;overflow:hidden;border-radius:99px;background:#d9e8ee;margin:10px 0}.model-progress-track span{display:block;width:38%;height:100%;border-radius:99px;background:linear-gradient(90deg,#176b87,#20a4b8);animation:sahroudProgress 1.15s ease-in-out infinite alternate}.model-progress small{display:block;color:#526b78;font-size:11px}@keyframes sahroudProgress{from{transform:translateX(165%)}to{transform:translateX(-265%)}}";
      document.head.appendChild(style);
    }
    if(window.SteelDrawing){originalDrawFrame=window.SteelDrawing.drawFrame;window.SteelDrawing.drawFrame=function(){try{build();draw();showSummary();return true;}catch(e){console.error(e);return originalDrawFrame?originalDrawFrame():false;}};window.SteelDrawing.drawFullModel=draw;}
    try{build();draw();showSummary();}catch(e){console.warn(e);}
  }
  window.SteelStructuralModel={build,draw,getData,setData,validate,validate3DSections,analyze3D,analyzeFoundationEnvelope,analyzeCraneRail,analyzeCraneRailMovingEnvelope,parseRunwayRailSupportInputs,parseRunwayRailFEMInputs,getProposedUnbracedLengths,runwayGeometrySelfTest,get model(){return model;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();