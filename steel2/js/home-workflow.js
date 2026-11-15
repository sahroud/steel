/* SAHROUD STEEL — compact home workflow
   Core intake and preview stay visible; advanced panels are grouped without deleting their controls. */
(function () {
  "use strict";

  function compactPanels() {
    const main = document.querySelector("main");
    const setup = document.getElementById("projectSetupPanel");
    const drawing = document.getElementById("frameDrawing")?.closest(".panel");
    const gallery = document.getElementById("structureViewsPanel");
    if (!main || !setup || !drawing || !gallery) return;

    let shell = document.getElementById("homeAdvancedTools");
    if (!shell) {
      shell = document.createElement("section");
      shell.className = "panel home-advanced-tools";
      shell.id = "homeAdvancedTools";
      shell.innerHTML = '<details><summary>بخش‌های تخصصی و آزمایش‌ها — بارگذاری، تحلیل، طراحی اعضا، جرثقیل و گزارش‌ها</summary><div id="homeAdvancedContent"></div></details>';
      gallery.insertAdjacentElement("afterend", shell);
    }
    const content = document.getElementById("homeAdvancedContent");
    if (!content) return;

    Array.from(main.querySelectorAll(":scope > .panel")).forEach(panel => {
      if (panel === setup || panel === drawing || panel === gallery || panel === shell) return;
      content.appendChild(panel);
    });

    if (!shell.dataset.watchPanels) {
      shell.dataset.watchPanels = "1";
      const observer = new MutationObserver(() => {
        Array.from(main.querySelectorAll(".panel")).forEach(panel => {
          if (panel === setup || panel === drawing || panel === gallery || panel === shell) return;
          if (!content.contains(panel)) content.appendChild(panel);
        });
      });
      observer.observe(main, { childList: true, subtree: true });
    }
  }

  function init() {
    compactPanels();

    const start = document.getElementById("btnBuildModelFromHome");
    if (!start || start.dataset.bound === "1") return;
    start.dataset.bound = "1";
    let running = false;

    start.addEventListener("click", function () {
      if (running) return;
      const status = document.getElementById("homeWorkflowStatus");
      const setStatus = message => { if (status) status.textContent = message; };

      if (document.getElementById("structuralSystem")?.value === "portal-single-slope") {
        setStatus("مدل سه‌بعدی سقف تک‌شیب هنوز آماده نیست؛ فعلاً فقط پیش‌نمایش دوبعدی قابل مشاهده است.");
        return;
      }

      const project = window.SteelProject;
      if (!project || typeof project.validate !== "function") {
        setStatus("ماژول ثبت پروژه هنوز بارگذاری نشده است؛ چند لحظه صبر کنید و دوباره بزنید.");
        return;
      }
      const error = project.validate();
      if (error) {
        setStatus("ورودی ناقص یا نامعتبر: " + error);
        document.getElementById("projectSetupPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const apply = document.getElementById("btnApplyProjectSetup");
      const build = document.getElementById("btnBuildFullModel");
      if (!apply || !build) {
        setStatus("دکمه‌های ثبت پروژه یا ساخت مدل هنوز آماده نشده‌اند؛ صفحه را یک بار تازه‌سازی کنید.");
        return;
      }

      running = true;
      start.disabled = true;
      setStatus("در حال ثبت مشخصات و ذخیره پروژه…");
      apply.click();
      setStatus("مشخصات ثبت شد؛ ساخت گره‌ها، قاب‌ها، پرلین‌ها و مهاربندها آغاز می‌شود…");
      build.click();

      window.setTimeout(function () {
        const model = window.SteelStructuralModel?.model;
        const summary = document.getElementById("fullModelSummary");
        if (model && model.nodes?.length && model.members?.length) {
          window.SteelStructureViewGallery?.update?.();
          const galleryPanel = document.getElementById("structureViewsPanel");
          const galleryDetails = galleryPanel?.querySelector(":scope > details");
          if (galleryDetails) galleryDetails.open = true;
          setStatus("مدل هندسی ساخته شد: " + model.nodes.length + " گره و " + model.members.length + " عضو. نماها در بخش گالری باز شدند.");
          galleryPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          const message = summary?.textContent?.trim();
          setStatus(message || "مدل ساخته نشد؛ پیام خطا را در بخش تخصصی مدل هندسی بررسی کنید.");
        }
        running = false;
        start.disabled = false;
      }, 700);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
