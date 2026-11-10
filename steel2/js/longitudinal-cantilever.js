/* SAHROUD STEEL - Longitudinal Purlin End Cantilever Check
   Preliminary elastic check only. Units: kN, m, mm, MPa.
*/
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const fmt = (v, d=2) => Number.isFinite(v)
    ? v.toLocaleString("fa-IR",{minimumFractionDigits:d,maximumFractionDigits:d}) : "—";

  function run() {
    const out = $("longitudinalCantileverResults");
    const project = window.SteelRoofPurlins?.lastResult;
    const loads = window.SteelLoads?.getData?.();
    if (!out) return;
    if (!project?.best || !loads) {
      out.innerHTML = '<p>ابتدا در بخش پرلین سقف، دکمه «پیشنهاد خودکار فاصله و مقطع» یا «محاسبه مقطع انتخابی من» را اجرا کنید.</p>';
      return;
    }

    const g = project.geometry;
    const best = project.best;
    const sec = best.section;
    const a = Number(g.endOverhang || 0.8);
    const tributary = Number(best.pitch);
    const E = Number(project.settings.e || 200000);
    const Fy = Number(project.settings.fy || 240);
    const I = Number(sec.ix);
    const W = Number(sec.wx);
    if (!(a > 0 && tributary > 0 && E > 0 && I > 0 && W > 0)) {
      out.textContent = "اطلاعات هندسی یا خواص مقطع برای کنترل معتبر نیست.";
      return;
    }

    const rows = [
      {side:"چپ", dead:Number(loads.deadLeft)||0, live:Number(loads.liveLeft)||0,
       snow:Number(loads.snowLeft)||0, wind:Number(loads.windLeft)||0},
      {side:"راست", dead:Number(loads.deadRight)||0, live:Number(loads.liveRight)||0,
       snow:Number(loads.snowRight)||0, wind:Number(loads.windRight)||0}
    ];

    const results = rows.map(r => {
      // بار خطی تقریبی روی پرلین؛ فاصله پرلین‌ها روی شیب به عرض افقی تبدیل شده است.
      const width = tributary * Math.cos(g.angle || 0);
      const gravity = Math.max(0, r.dead + r.live + r.snow) * width;
      const uplift = Math.abs(r.wind) * width;
      const q = Math.max(gravity, uplift); // kN/m؛ پوش ساده و غیرآیین‌نامه‌ای
      const qNmm = q; // 1 kN/m = 1 N/mm
      const Lmm = a * 1000;
      const M = qNmm * Lmm * Lmm / 2; // N.mm
      const V = q * a; // kN
      const stress = M / W; // MPa
      const deflection = qNmm * Math.pow(Lmm,4) / (8 * E * I); // mm
      const limit = Lmm / 180;
      return {side:r.side, gravity, uplift, q, M:M/1e6, V, stress, deflection, limit,
        bendingOK:stress <= Fy, deflectionOK:deflection <= limit};
    });

    const ok = results.every(r => r.bendingOK && r.deflectionOK);
    out.innerHTML = `
      <h4>نتیجه کنترل مقدماتی کنسول طولی</h4>
      <p><b>مقطع مبنا:</b> ${sec.name}</p>
      <p><b>فاصله پرلین‌ها:</b> ${fmt(tributary,2)} متر</p>
      <p><b>طول کنسول در هر انتها:</b> ${fmt(a,2)} متر</p>
      ${results.map(r => `
        <div class="result-card">
          <strong>شیب ${r.side}</strong>
          <span>بار خطی پوش: ${fmt(r.q,3)} kN/m</span>
          <span>لنگر تکیه‌گاهی: ${fmt(r.M,3)} kN.m</span>
          <span>برش تکیه‌گاهی: ${fmt(r.V,3)} kN</span>
          <span>تنش خمشی تقریبی: ${fmt(r.stress,1)} MPa — ${r.bendingOK ? "قبول مقدماتی" : "نیازمند اصلاح"}</span>
          <span>خیز نوک: ${fmt(r.deflection,3)} mm (حد فرضی ${fmt(r.limit,2)} mm) — ${r.deflectionOK ? "قبول مقدماتی" : "نیازمند اصلاح"}</span>
        </div>
      `).join("")}
      <div class="notice">
        <b>${ok ? "از دو کنترل ساده‌شده عبور کرد" : "حداقل یکی از کنترل‌های ساده‌شده مردود است"}</b>
        <p>این بررسی فقط خمش الاستیک و خیز یک طره ساده با بار یکنواخت را می‌سنجد. پیوستگی پرلین، مهار پیچشی، کمانش موضعی/اعوجاجی، وصله، پیچ‌ها، ورق اتصال، مکش موضعی باد و ترکیبات کامل آیین‌نامه‌ای هنوز کنترل نشده‌اند.</p>
        <p>بارهای ورودی شهرمحور و تأییدشده نیستند؛ انتخاب شهر شاهرود به‌تنهایی بار برف و باد معتبر تولید نمی‌کند. خروجی برای آزمایش نرم‌افزار است و تأیید طراحی اجرایی نیست.</p>
      </div>
    `;
    window.SteelLongitudinalCantilever = {lastResult:{results,section:sec.name,overhang:a}};
  }

  function init() {
    if ($("longitudinalCantileverPanel")) return;
    const footer = document.querySelector("main footer");
    if (!footer) return;
    footer.insertAdjacentHTML("beforebegin", `
      <section class="panel" id="longitudinalCantileverPanel">
        <div class="panel-title"><h3>کنترل کنسول طولی پرلین‌ها</h3></div>
        <div class="notice">کنترل مقدماتی پیش‌آمدگی ۸۰ سانتی‌متری پرلین‌ها در ابتدا و انتهای طول سوله، با استفاده از مقطع پیشنهادی و بارهای واردشده.</div>
        <div class="button-grid">
          <button id="btnLongitudinalCantilever" class="btn primary" type="button">محاسبه کنسول ابتدا و انتهای سوله</button>
        </div>
        <div id="longitudinalCantileverResults" class="notice">ابتدا مقطع پرلین را در بخش پرلین سقف محاسبه کنید.</div>
      </section>`);
    $("btnLongitudinalCantilever").addEventListener("click", run);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
