/* SAHROUD STEEL — compact home workflow
   Project intake is lightweight; full geometry is built only on explicit request. */
(function () {
  "use strict";
  function init() {
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
          const gallery = document.getElementById("structureViewsPanel");
          const details = gallery?.querySelector(":scope > details");
          if (details) details.open = true;
          setStatus("مدل هندسی ساخته شد: " + model.nodes.length + " گره و " + model.members.length + " عضو. نماها پایین همین صفحه باز شدند.");
          gallery?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          const message = summary?.textContent?.trim();
          setStatus(message || "مدل ساخته نشد؛ پیام خطا را در بخش مدل هندسی بررسی کنید.");
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
