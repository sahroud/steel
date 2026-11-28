/* SAHROUD STEEL V3 - engineering input and scope audit
 * This module checks completeness only. It does not perform code design.
 */
(function () {
  "use strict";
  const form = document.getElementById("projectForm");
  const button = document.getElementById("projectAuditBtn");
  const output = document.getElementById("projectAuditResult");
  if (!form || !button || !output) return;
  const get = name => {
    const el = form.elements.namedItem(name);
    return el ? String(el.value ?? "").trim() : "";
  };
  const num = name => {
    const value = get(name);
    if (!value) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const present = name => get(name) !== "";
  function runAudit() {
    const blockers = [], warnings = [], ready = [];
    const addMissing = (condition, message) => condition ? blockers.push(message) : ready.push(message);
    addMissing(!present("projectName"), "نام پروژه ثبت نشده است.");
    addMissing(!(num("span") > 0 && num("length") > 0 && num("frameSpacing") > 0 && num("columnHeight") > 0 && num("roofSlope") > 0), "هندسه اصلی سوله ناقص یا نامعتبر است.");
    addMissing(!present("soilType") || !(num("soilQa") > 0) || !present("soilQaBasis") || !present("soilSource"), "گزارش ژئوتکنیک، تیپ خاک، ظرفیت مجاز و مبنای خالص/ناخالص کامل نیست.");
    addMissing(!present("roofSurface"), "نوع سطح پوشش برای محاسبه برف بام انتخاب نشده است.");
    addMissing(!present("snowLoad") || !present("snowRegion"), "بار برف زمین یا منطقه برف وارد نشده است.");
    addMissing(!present("climateSource"), "منبع داده‌های اقلیمی ثبت نشده است.");
    const windFields = ["windwardWallNet", "leewardWallNet", "windwardRoofNet", "leewardRoofNet"];
    addMissing(windFields.some(k => !present(k)), "چهار فشار خالص باد عرضی وارد نشده‌اند.");
    if (get("city") !== "shahroud") warnings.push("برای شهر انتخابی پروفایل اقلیمی تأییدشده داخلی وجود ندارد؛ همه داده‌های اقلیمی باید مستند و مستقل وارد شوند.");
    if (/اولیه|موقت|نیازمند تطبیق|نیازمند تأیید/i.test(get("climateSource"))) warnings.push("منبع اقلیم هنوز عبارت‌های هشدار/موقت دارد؛ مقادیر باد و برف برای طراحی نهایی تأیید نشده‌اند.");
    if (get("crane") !== "none") blockers.push("جرثقیل انتخاب شده، اما بارهای چرخ، ضربه، ترمز و مسیر بار جرثقیل در مدل فعلی پیاده‌سازی نشده‌اند.");
    if (get("openings") !== "none") blockers.push("بازشو انتخاب شده، اما جانمایی و اثر آن بر فشار داخلی و اعضای پیرامونی مدل نشده است.");
    if (get("longitudinalBracing") === "custom" || get("roofBracing") === "custom") blockers.push("آرایش سفارشی مهاربند انتخاب شده، اما انتخاب دهانه‌ها/مختصات سفارشی هنوز به رابط متصل نیست.");
    if (get("city") === "shahroud" && (num("windSpeed") !== 90 || num("windPressure") === null)) warnings.push("مقادیر مرجع اولیه باد شاهرود تغییر کرده یا ناقص است؛ منبع و مبنای آن را دوباره کنترل کنید.");
    if (!present("soilQa") || !present("soilSource")) warnings.push("هیچ کنترل ظرفیت باربری، نشست، لغزش، واژگونی، پانچ یا برش پی را نمی‌توان از داده‌های فعلی نتیجه گرفت.");
    warnings.push("بار باد خودکار از سرعت باد تولید نمی‌شود؛ فشارهای خالص باید طبق مبحث ششم و برای هر جهت/ناحیه مستند شوند.");
    warnings.push("تحلیل فعلی خطی مرتبه اول است؛ ترکیبات بار کامل، P-Delta، کمانش، اثرات مرتبه دوم و طراحی مقاومت اعضا هنوز تکمیل نشده‌اند.");
    warnings.push("طراحی اتصالات، صفحه‌ستون و مهارها، فونداسیون و آرماتورگذاری، نقشه اجرایی و متره نهایی هنوز در موتور طراحی پیاده‌سازی نشده‌اند.");
    let catalog = null;
    try { catalog = JSON.parse(document.getElementById("sectionCatalogInput")?.value || "null"); }
    catch (_) { blockers.push("JSON بانک مقاطع قابل خواندن نیست."); }
    if (!catalog) blockers.push("بانک مقاطع بارگذاری نشده یا خالی است.");
    else if (window.SahroudSteelGeometry && window.SahroudSteelSections) {
      try {
        const built = window.SahroudSteelGeometry.build({
          inputs: Object.fromEntries([...form.elements].filter(e => e.name).map(e => [e.name, e.value]))
        });
        const checked = window.SahroudSteelSections.validate(built.model, catalog);
        if (!checked.valid) blockers.push("مقاطع برای همه گروه‌های عضو معتبر نیستند: " + checked.errors.slice(0, 5).join("؛ "));
        else ready.push("برای گروه‌های عضو مدل، مشخصات مقطع از نظر ساختاری ثبت شده است.");
      } catch (error) { blockers.push("مدل هندسی/اعتبارسنجی مقاطع اجرا نشد: " + error.message); }
    }
    const status = blockers.length ? "آمادگی طراحی نهایی: متوقف — " + blockers.length + " مانع" : "آمادگی داده‌های پایه: بدون مانع ساختاری شناسایی‌شده";
    const lines = [
      "گزارش ممیزی ورودی و دامنه طراحی SAHROUD STEEL V3",
      "پروژه: " + (get("projectName") || "بدون نام"),
      "شهر: " + (get("city") || "ثبت نشده"),
      "ابعاد: " + [get("span"), get("length"), get("columnHeight")].join(" × ") + " متر",
      status,
      "",
      "موارد مانع:",
      ...(blockers.length ? blockers.map((x, i) => (i + 1) + ". " + x) : ["موردی در این ممیزی شناسایی نشد."]),
      "",
      "هشدارها و محدودیت‌ها:",
      ...warnings.map((x, i) => (i + 1) + ". " + x),
      "",
      "موارد ثبت‌شده:",
      ...(ready.length ? ready.map((x, i) => (i + 1) + ". " + x) : ["هنوز موردی تأیید ساختاری نشده است."]),
      "",
      "این گزارش ممیزی ورودی و دامنه نرم‌افزار است؛ محاسبه، طراحی یا تأیید ایمنی سازه محسوب نمی‌شود."
    ];
    const report = lines.join("\n");
    output.textContent = report;
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sahroud-steel-input-audit.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  button.addEventListener("click", runAudit);
  window.SahroudSteelProjectAudit = { run: runAudit };
})();