/* SAHROUD STEEL — Stepwise project navigator
   UI orchestration only: does not perform engineering calculations.
*/
(function () {
  "use strict";
  const STEPS = [
    { title: "تعریف پروژه", hint: "مشخصات کارفرما، طراح و محل احداث" },
    { title: "هندسه و سیستم سازه‌ای", hint: "ابعاد، نوع سقف، تکیه‌گاه و آرایش سازه" },
    { title: "مصالح و بارگذاری", hint: "مصالح، داده اقلیمی و بارهای طراحی" },
    { title: "مدل‌سازی و تحلیل", hint: "مدل سازه‌ای، انتقال بار و تحلیل" },
    { title: "طراحی اعضا و اتصالات", hint: "کنترل اعضا، پایداری و اتصالات" },
    { title: "فونداسیون", hint: "واکنش‌ها، خاک، پی و شناژ" },
    { title: "نقشه‌ها و گزارش نهایی", hint: "نقشه‌های اجرایی، دفترچه محاسبات و متره" }
  ];
  let active = 0, observer = null;
  const $ = id => document.getElementById(id);
  const clean = value => String(value || "").replace(/^\s*[0-9۰-۹٠-٩]+\s*[ـ–.)-]\s*/u, "").replace(/\s+/g, " ").trim();
  function panelTitle(panel) {
    return clean(panel.dataset.smartTitle || panel.querySelector(".smart-panel-title")?.textContent ||
      panel.querySelector(".panel-title h3")?.textContent || panel.querySelector(":scope > h3")?.textContent || "");
  }
  function stageFor(title, panel) {
    const t = title.toLowerCase();
    if (/مشخصات پروژه|اطلاعات پروژه|کارفرما|طراح|محل احداث/.test(t)) return 0;
    if (/هندسه|مشخصات هندسی|تکیه.?گاه|بازشو|دهانه|سیستم سازه/.test(t) && !/پرلین|قید|اتصال|کنترل|طراحی/.test(t)) return 1;
    if (/بارگذار|اقلیم|باد|برف|مصالح|مقطع|فولاد|جرثقیل|بار مرده|بار زنده/.test(t)) return 2;
    if (/مدل هندسی|نمایش قاب|تحلیل|نتایج تحلیل|نمودار نیرو|مدل سه.?بعدی/.test(t)) return 3;
    if (/فونداسیون|پی منفرد|شناژ|خاک زیر|آرماتوربندی پی/.test(t)) return 5;
    if (/گزارش|نقشه|متره|خروجی نهایی|دفترچه محاسبات|pdf/.test(t)) return 6;
    if (/اتصال|پرلین|مهاربند|مهاربندی|قید|پایداری|کمانش|کنسول|طراحی|برش|خمش|تعامل|ستون|رفتر/.test(t)) return 4;
    if (panel.id === "steelAutoWorkflowPanel") return 3;
    return 4;
  }
  function ensureShell() {
    if ($("shedWorkflowNav")) return;
    const main = document.querySelector("main"); if (!main) return;
    const nav = document.createElement("section");
    nav.id = "shedWorkflowNav"; nav.className = "shed-workflow";
    nav.innerHTML = '<div class="shed-workflow-head"><div><strong>مسیر طراحی سوله</strong><p id="shedWorkflowHint">پروژه را مرحله‌به‌مرحله تکمیل کنید.</p></div><span id="shedWorkflowCount">مرحله ۱ از ۷</span></div><div class="shed-workflow-track" id="shedWorkflowTrack" role="group" aria-label="مراحل طراحی"></div><div class="shed-workflow-actions"><button type="button" id="shedWorkflowPrev" class="btn secondary">مرحله قبل</button><span id="shedWorkflowStatus" aria-live="polite">اطلاعات مراحل در همین صفحه نگهداری می‌شود.</span><button type="button" id="shedWorkflowNext" class="btn primary">مرحله بعد</button></div>';
    const welcome = main.querySelector(".welcome");
    if (welcome) welcome.after(nav); else main.insertBefore(nav, main.firstChild);
    $("shedWorkflowPrev").addEventListener("click", () => go(active - 1));
    $("shedWorkflowNext").addEventListener("click", () => go(active + 1));
    renderTrack();
  }
  function renderTrack() {
    const track = $("shedWorkflowTrack"); if (!track) return;
    track.innerHTML = "";
    STEPS.forEach((step, index) => {
      const button = document.createElement("button"); button.type = "button";
      button.className = "shed-step" + (index === active ? " is-active" : "");
      button.setAttribute("aria-current", index === active ? "step" : "false");
      button.innerHTML = '<span class="shed-step-number">' + (index + 1).toLocaleString("fa-IR") + '</span><span class="shed-step-title"></span>';
      button.querySelector(".shed-step-title").textContent = step.title;
      button.addEventListener("click", () => go(index)); track.appendChild(button);
    });
    $("shedWorkflowHint").textContent = STEPS[active].hint;
    $("shedWorkflowCount").textContent = "مرحله " + (active + 1).toLocaleString("fa-IR") + " از ۷";
    $("shedWorkflowPrev").disabled = active === 0;
    $("shedWorkflowNext").textContent = active === STEPS.length - 1 ? "پایان مسیر" : "مرحله بعد";
  }
  function assignPanels() {
    document.querySelectorAll("main .panel").forEach(panel => {
      if (panel.id === "shedWorkflowNav") return;
      const title = panelTitle(panel); if (!title) return;
      panel.dataset.workflowStage = String(stageFor(title, panel));
      panel.classList.add("workflow-managed");
    });
  }
  function updateVisibility() {
    assignPanels();
    document.querySelectorAll("main .panel.workflow-managed").forEach(panel => {
      panel.hidden = Number(panel.dataset.workflowStage) !== active;
    });
    renderTrack();
    if (active === 5) $("shedWorkflowStatus").textContent = "بخش فونداسیون هنوز به ماژول محاسباتی متصل نشده است؛ این مرحله قابل تأیید نهایی نیست.";
    else if (active === 3) $("shedWorkflowStatus").textContent = "تحلیل دوبعدی قاب به‌تنهایی تأیید تحلیل کامل سه‌بعدی سالن محسوب نمی‌شود.";
    else $("shedWorkflowStatus").textContent = "مرحله جاری را تکمیل کنید؛ داده‌های ناقص یا تأییدنشده باید مشخص بمانند.";
  }
  function validateCurrent() {
    if (active === 0 && !$("projectName")?.value.trim()) return "نام پروژه را وارد کنید.";
    if (active === 1) {
      for (const [id, label] of [["span","دهانه"],["length","طول"],["spacing","فاصله قاب‌ها"],["height","ارتفاع ستون"]]) {
        const value = Number($(id)?.value);
        if (!(Number.isFinite(value) && value > 0)) return label + " باید عددی بزرگ‌تر از صفر باشد.";
      }
      if (Number($("rise")?.value) < 0) return "افزایش ارتفاع تاج نمی‌تواند منفی باشد.";
    }
    return "";
  }
  function go(next) {
    if (next > active) {
      const error = validateCurrent();
      if (error) { $("shedWorkflowStatus").textContent = error; $(active === 0 ? "projectName" : "span")?.focus(); return; }
    }
    active = Math.max(0, Math.min(STEPS.length - 1, next)); updateVisibility();
    $("shedWorkflowNav")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function init() {
    ensureShell(); assignPanels(); updateVisibility();
    const main = document.querySelector("main");
    if (main && !observer) {
      observer = new MutationObserver(records => {
        let changed = false;
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node.nodeType === 1) changed = true;
        }));
        if (changed) updateVisibility();
      });
      observer.observe(main, { childList: true, subtree: true });
    }
  }
  window.SahroudWorkflow = { getCurrentStep: () => active + 1, goToStep: step => go(Number(step) - 1) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();