/* SAHROUD STEEL - Longitudinal Purlin End Cantilever Check 2.0
   Preliminary elastic screening only. Units: kN, m, mm, MPa.
   Does not replace code design, connection design, or manufacturer section properties.
*/
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const fmt = (v, d = 2) => Number.isFinite(v)
    ? v.toLocaleString("fa-IR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d
      }) : "—";

  function readSide(loads, side) {
    const suffix = side === "left" ? "Left" : "Right";
    return {
      dead: Math.max(0, Number(loads["dead" + suffix]) || 0),
      live: Math.max(0, Number(loads["live" + suffix]) || 0),
      snow: Math.max(0, Number(loads["snow" + suffix]) || 0),
      wind: Number(loads["wind" + suffix]) || 0,
      windDirection: loads.windDirection || "not-specified"
    };
  }

  function caseResult(qLine, a, E, I, W, Fy, limitRatio) {
    // qLine is kN/m; numerically 1 kN/m = 1 N/mm.
    const L = a * 1000;
    const q = Math.abs(qLine);
    const M = q * L * L / 2;       // N.mm, cantilever root moment
    const V = q * L / 1000;        // kN
    const stress = M / W;          // MPa, gross elastic estimate
    const deflection = q * Math.pow(L, 4) / (8 * E * I); // mm
    const limit = L / limitRatio;

    return {
      qLine: q,
      M: M / 1e6,
      V,
      stress,
      deflection,
      limit,
      bendingRatio: stress / Fy,
      deflectionRatio: deflection / Math.max(limit, 0.001),
      bendingBelowFy: stress <= Fy,
      deflectionBelowLimit: deflection <= limit
    };
  }

  function renderCase(title, result) {
    return `
      <div class="result-card">
        <strong>${title}</strong>
        <span>بار خطی تقریبی: ${fmt(result.qLine, 3)} kN/m</span>
        <span>لنگر در ریشه کنسول: ${fmt(result.M, 3)} kN.m</span>
        <span>برش در تکیه‌گاه: ${fmt(result.V, 3)} kN</span>
        <span>تنش خمشی الاستیک تخمینی: ${fmt(result.stress, 1)} MPa</span>
        <span>خیز نوک کنسول: ${fmt(result.deflection, 3)} mm</span>
        <span>حد خیز فرضی L/n: ${fmt(result.limit, 2)} mm</span>
        <span>نسبت تنش به Fy: ${fmt(result.bendingRatio * 100, 1)}٪</span>
        <span>نسبت خیز به حد فرضی: ${fmt(result.deflectionRatio * 100, 1)}٪</span>
      </div>`;
  }

  function run() {
    const out = $("longitudinalCantileverResults");
    if (!out) return;

    const purlin = window.SteelRoofPurlins;
    const loadsApi = window.SteelLoads;
    const project = purlin && purlin.lastResult;
    const loads = loadsApi && typeof loadsApi.getData === "function"
      ? loadsApi.getData() : null;

    if (!project || !project.best || !loads) {
      out.textContent =
        "ابتدا در بخش طراحی پرلین سقف، پیشنهاد خودکار یا محاسبه مقطع انتخابی را اجرا کنید.";
      return;
    }

    const geometry = project.geometry || {};
    const settings = project.settings || {};
    const section = project.best.section || {};
    const pitch = Number(project.best.pitch);
    const a = Number($("longCantileverLength")?.value || geometry.endOverhang || 0.8);
    const E = Number(settings.e || 200000);
    const Fy = Number(settings.fy || 240);
    const I = Number(section.ix);
    const W = Number(section.wx);
    const angle = Number(geometry.angle || 0);
    const widthFactor = Math.cos(angle);

    if (!(a > 0 && pitch > 0 && E > 0 && Fy > 0 && I > 0 && W > 0)) {
      out.textContent = "طول کنسول، فاصله پرلین یا خواص مقطع معتبر نیست. ابتدا مقطع پرلین را دوباره محاسبه کنید.";
      return;
    }

    const limitRatio = Number(settings.deflectionLimit || 180);
    const sides = [
      { name: "شیب چپ سقف", key: "left" },
      { name: "شیب راست سقف", key: "right" }
    ];

    const results = sides.map(side => {
      const data = readSide(loads, side.key);
      const gravityPressure = data.dead + data.live + data.snow;
      // تبدیل سطح بار به بار خطی با عرض بارگیر تقریبی؛
      // فرض شده بارهای سطحی بر مبنای تصویر افقی وارد شده‌اند.
      const tributaryWidth = pitch * widthFactor;
      const gravityLine = gravityPressure * tributaryWidth;
      const windLine = Math.abs(data.wind) * tributaryWidth;

      const gravity = caseResult(gravityLine, a, E, I, W, Fy, limitRatio);
      const wind = caseResult(windLine, a, E, I, W, Fy, limitRatio);

      return {
        name: side.name,
        gravityPressure,
        windPressure: Math.abs(data.wind),
        windSignedPressure: data.wind,
        windDirection: data.windDirection,
        tributaryWidth,
        gravity,
        wind,
        worst: gravity.stress >= wind.stress ? gravity : wind
      };
    });

    const html = results.map(r => `
      <h4>${r.name}</h4>
      <p>عرض بارگیر تقریبی: ${fmt(r.tributaryWidth, 3)} متر</p>
      <p>بار سطحی ثقلی (مرده + زنده + برف): ${fmt(r.gravityPressure, 3)} kN/m²</p>
      <p>بار باد با علامت ورودی: ${fmt(r.windSignedPressure, 3)} kN/m² | قدر مطلق برای کنترل تنش: ${fmt(r.windPressure, 3)} kN/m²</p>
      <p>جهت کلی ثبت‌شده باد: ${r.windDirection === "left-to-right" ? "چپ به راست" : r.windDirection === "right-to-left" ? "راست به چپ" : "تعیین‌نشده"}</p>
      ${renderCase("حالت بار ثقلی", r.gravity)}
      ${renderCase("حالت مکش باد (جدا از بار ثقلی)", r.wind)}
    `).join("");

    const allBelow = results.every(r =>
      r.gravity.bendingBelowFy && r.gravity.deflectionBelowLimit &&
      r.wind.bendingBelowFy && r.wind.deflectionBelowLimit
    );

    out.innerHTML = `
      <h4>گزارش کنترل مقدماتی کنسول طولی پرلین</h4>
      <p><b>مقطع انتخاب‌شده:</b> ${section.name || "نامشخص"}</p>
      <p><b>فاصله پرلین‌ها:</b> ${fmt(pitch, 2)} متر</p>
      <p><b>طول کنسول:</b> ${fmt(a, 2)} متر در هر انتهای سوله</p>
      <p><b>مدول مقطع مبنا Wx:</b> ${fmt(W, 1)} mm³</p>
      <p><b>ممان اینرسی مبنا Ix:</b> ${fmt(I, 1)} mm⁴</p>
      ${html}
      <div class="notice">
        <b>${allBelow ? "کنترل غربالگری اولیه از حدود ساده‌شده عبور کرده است" : "حداقل یک حالت از حدود ساده‌شده عبور نکرده است"}</b>
        <p>این عبارت تأیید طراحی نیست. کنترل فقط یک طره منفرد با بار گسترده یکنواخت را بررسی می‌کند. بار ثقلی و باد جداگانه گزارش شده‌اند و ترکیب بار آیین‌نامه‌ای در این ماژول انجام نمی‌شود.</p>
        <p>خواص Z و RHS در نسخه فعلی تقریبی‌اند. پیچش مقطع Z، کمانش موضعی و اعوجاجی، کمانش جانبی-پیچشی، مهارها، پیوستگی پرلین روی قاب، وصله، پیچ و ورق اتصال، اثر مکش موضعی باد و ظرفیت واقعی تکیه‌گاه کنترل نشده‌اند.</p>
        <p>بارهای ورودی باید توسط مهندس محاسب و بر اساس محل و ضوابط پروژه تعیین شوند. انتخاب شهر شاهرود به‌تنهایی بار برف و باد معتبر ایجاد نمی‌کند.</p>
      </div>
    `;

    window.SteelLongitudinalCantilever = {
      lastResult: {
        results,
        section: section.name,
        overhang: a,
        assumptions: {
          model: "single uniformly loaded cantilever",
          loadCases: "gravity and wind checked separately",
          deflectionLimitRatio: limitRatio
        }
      }
    };
  }

  function init() {
    if ($("longitudinalCantileverPanel")) return;

    const main = document.querySelector("main");
    if (!main) return;

    const statusPanel = Array.from(main.querySelectorAll(".panel"))
      .find(panel => panel.textContent.includes("وضعیت پروژه"));
    const insertionPoint = statusPanel || main.querySelector("footer");
    if (!insertionPoint) return;

    insertionPoint.insertAdjacentHTML("beforebegin", `
      <section class="panel" id="longitudinalCantileverPanel">
        <div class="panel-title"><h3>کنترل کنسول طولی پرلین‌ها</h3></div>
        <div class="notice">
          کنترل مقدماتی پیش‌آمدگی پرلین‌ها در ابتدا و انتهای طول سوله.
          مقدار پیش‌فرض ۸۰ سانتی‌متر است و قابل تغییر خواهد بود.
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="longCantileverLength">طول کنسول در هر انتها (متر)</label>
            <input id="longCantileverLength" type="number" min="0.1" max="3" step="0.05" value="0.80">
          </div>
        </div>
        <div class="button-grid">
          <button id="btnLongitudinalCantilever" class="btn primary" type="button">
            محاسبه کنسول ابتدا و انتهای سوله
          </button>
        </div>
        <div id="longitudinalCantileverResults" class="notice">
          ابتدا مقطع پرلین را در بخش طراحی پرلین سقف محاسبه کنید.
        </div>
      </section>`);

    $("btnLongitudinalCantilever").addEventListener("click", run);

    const shortcut = $("btnOpenLongitudinalCantilever");
    if (shortcut) {
      shortcut.addEventListener("click", () => {
        const panel = $("longitudinalCantileverPanel");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
