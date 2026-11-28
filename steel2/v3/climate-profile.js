/* SAHROUD STEEL V3 - project-wide climate profile binding
 * Shahroud is the initial profile. Other cities deliberately clear Shahroud-only
 * values until a verified city record is entered; no geographic extrapolation.
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
    shahroud: "شاهرود",
    semnan: "سمنان",
    tehran: "تهران",
    mashhad: "مشهد",
    custom: "شهر سفارشی"
  };
  function set(name, value) {
    const el = field(name);
    if (el) el.value = value;
  }
  function updateNotice(message) {
    const el = document.getElementById("climateNotice");
    if (el) el.textContent = message;
  }
  function applyCityProfile() {
    const city = field("city")?.value || "shahroud";
    if (city === "shahroud") {
      Object.entries(shahroud).forEach(([k, v]) => set(k, v));
      updateNotice(
        "پروفایل اولیه شاهرود بارگذاری شد: Ps زمین = 1.00 kN/m²، منطقه برف ۳، سرعت مبنای باد = ۹۰ km/h و q ≈ ۰٫۳۸۳ kN/m². این داده‌ها پیش‌فرض پروژه‌اند، نه تأیید نهایی طراحی؛ بار برف بام، ضرایب باد، توپوگرافی، ارتفاع و مختصات باید برای نشانی دقیق پروژه با مرجع رسمی کنترل شوند."
      );
    } else {
      ["snowLoad", "snowRegion", "windSpeed", "windPressure",
       "climateElevation", "climateLatitude", "climateLongitude"].forEach(k => set(k, ""));
      set("climateSource", "");
      updateNotice(
        "برای " + (cityNames[city] || "شهر انتخابی") +
        " پروفایل اقلیمی تأییدشده در این نسخه موجود نیست. مقادیر شاهرود پاک شدند تا به شهر دیگر منتقل نشوند. داده‌های رسمی شهر و محل دقیق پروژه را وارد و منبع آن را ثبت کنید."
      );
    }
    ["snowLoad", "snowRegion", "windSpeed", "windPressure",
     "climateElevation", "climateLatitude", "climateLongitude", "climateSource"]
      .forEach(k => field(k)?.dispatchEvent(new Event("input", { bubbles: true })));
    set("snowRegion", city === "shahroud" ? shahroud.snowRegion : "");
  }
  field("city")?.addEventListener("change", applyCityProfile);
  window.SahroudV3ClimateProfiles = {
    getSelectedCity: () => field("city")?.value || "shahroud",
    getShahroudReference: () => ({ ...shahroud }),
    hasVerifiedProfile: city => city === "shahroud" ? false : false,
    applyCityProfile
  };
})();
