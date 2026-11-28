/* SAHROUD STEEL V3 - project-wide climate profile binding
 * Shahroud is the initial reference profile. Other cities require user-entered,
 * sourced values; Shahroud data are never copied to another city.
 */
(function () {
  "use strict";
  const form = document.getElementById("projectForm");
  if (!form) return;
  const field = name => form.elements.namedItem(name);
  const shahroud = {
    snowLoad: "1.00",
    snowRegion: "3",
    windSpeed: "90",
    windPressure: "0.383",
    climateElevation: "1349",
    climateLatitude: "36.421",
    climateLongitude: "54.957",
    climateSource: "پروفایل اولیه شاهرود؛ سرعت باد ۹۰ km/h و فشار مبنا حدود ۰٫۳۸۳ kN/m² بر پایه رکورد مبحث ششم ۱۳۹۸؛ بار برف و ارتفاع/مختصات نیازمند تطبیق با مرجع رسمی و محل دقیق پروژه"
  };
  const cityNames = {
    shahroud: "شاهرود", semnan: "سمنان", tehran: "تهران",
    mashhad: "مشهد", custom: "شهر سفارشی"
  };
  const climateFields = [
    "snowLoad", "snowRegion", "windSpeed", "windPressure",
    "climateElevation", "climateLatitude", "climateLongitude"
  ];
  function set(name, value) {
    const el = field(name);
    if (el) el.value = value;
  }
  function updateNotice(message) {
    const el = document.getElementById("climateNotice");
    if (el) el.textContent = message;
  }
  function setEditability(isReferenceCity) {
    ["snowRegion", "windPressure", "climateLatitude", "climateLongitude"].forEach(name => {
      const el = field(name);
      if (el) el.readOnly = !!isReferenceCity;
    });
  }
  function notifyAutosave() {
    [...climateFields, "climateSource"].forEach(name => {
      const el = field(name);
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  function applyCityProfile() {
    const city = field("city")?.value || "shahroud";
    const isShahroud = city === "shahroud";
    setEditability(isShahroud);
    if (isShahroud) {
      Object.entries(shahroud).forEach(([key, value]) => set(key, value));
      updateNotice(
        "پروفایل اولیه شاهرود بارگذاری شد: Ps زمین = 1.00 kN/m²، منطقه برف ۳، سرعت مبنای باد = ۹۰ km/h و q ≈ ۰٫۳۸۳ kN/m². این داده‌ها پیش‌فرض پروژه‌اند، نه تأیید نهایی طراحی؛ بار برف بام، ضرایب باد، توپوگرافی، ارتفاع و مختصات باید برای نشانی دقیق پروژه با مرجع رسمی کنترل شوند."
      );
    } else {
      climateFields.forEach(name => set(name, ""));
      set("climateSource", "");
      updateNotice(
        "برای " + (cityNames[city] || "شهر انتخابی") +
        " پروفایل اقلیمی تأییدشده در این نسخه موجود نیست. مقادیر شاهرود پاک شدند. فیلدهای اقلیمی اکنون برای ورود دستی باز هستند؛ منبع رسمی هر مقدار را ثبت کنید. تا تکمیل داده‌ها، محاسبه بارگذاری نهایی مجاز نیست."
      );
    }
    notifyAutosave();
  }
  field("city")?.addEventListener("change", applyCityProfile);
  window.SahroudV3ClimateProfiles = {
    getSelectedCity: () => field("city")?.value || "shahroud",
    getShahroudReference: () => ({ ...shahroud }),
    hasVerifiedProfile: () => false,
    applyCityProfile
  };
  // Apply the selected city on first load as well as on later changes.
  applyCityProfile();
})();
