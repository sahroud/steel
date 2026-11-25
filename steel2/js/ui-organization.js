/* SAHROUD STEEL - Mobile-first page organizer
   Keeps engineering modules intact; prioritizes the one-click workflow.
*/
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const STYLE_ID = "sahroudCompactUiStyle";

  function addStyles() {
    if ($(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .panel.smart-organized { padding:0 !important; overflow:hidden; }
      .panel.smart-organized > details { width:100%; }
      .panel.smart-organized summary {
        list-style:none; cursor:pointer; display:flex; align-items:center;
        justify-content:space-between; gap:10px; padding:12px 15px;
        min-height:48px; color:#123047; font-weight:700;
        background:#f5f9fb; user-select:none;
      }
      .panel.smart-organized summary::-webkit-details-marker { display:none; }
      .panel.smart-organized summary::after { content:"＋"; color:#176b87; font-size:19px; }
      .panel.smart-organized details[open] > summary::after { content:"−"; }
      .panel.smart-organized details[open] > summary { border-bottom:1px solid #d7e1e7; background:#edf5f8; }
      .panel.smart-organized .smart-panel-title { flex:1; min-width:0; }
      .panel.smart-organized .smart-panel-status { color:#647783; font-size:11px; font-weight:400; white-space:nowrap; }
      .panel.smart-organized .smart-panel-content { padding:12px 14px; }
      .panel.smart-organized h3 { margin:0; font-size:14px; }
      .primary-inputs-grid { display:grid; gap:12px; }
      .primary-inputs-grid .input-subsection { margin:0; padding:0 0 12px; border:0; border-bottom:1px solid #e4ebef; border-radius:0; box-shadow:none; }
      .primary-inputs-grid .input-subsection:last-child { border-bottom:0; padding-bottom:0; }
      .primary-inputs-grid .panel-title { margin:0 0 9px; }
      .primary-inputs-grid .panel-title h3 { font-size:13px; color:#24546b; }
      .primary-inputs-grid .status { display:none; }
      #steelAutoWorkflowPanel {
        order:-10; border:2px solid #176b87; padding:14px; margin:8px 0 12px;
        box-shadow:0 5px 18px rgba(23,107,135,.12);
      }
      #steelAutoWorkflowPanel .panel-title { margin:0 0 8px; }
      #steelAutoWorkflowPanel .panel-title h3 { color:#123047; font-size:17px; }
      #steelAutoWorkflowPanel #btnSteelAutoWorkflow {
        width:100%; min-height:56px; margin:8px 0; font-size:16px;
        background:linear-gradient(135deg,#176b87,#16845b);
        white-space:normal; line-height:1.5;
      }
      #steelAutoWorkflowPanel #steelAutoWorkflowResults { margin-top:8px; }
      #primaryInputsPanel { margin-top:10px; }
      .panel.smart-organized[ data-smart-title="عملیات پروژه" ] { margin-top:8px; }
      @media(max-width:650px) {
        .panel.smart-organized summary { padding:11px 12px; }
        .panel.smart-organized .smart-panel-content { padding:10px; }
        #steelAutoWorkflowPanel { padding:10px; }
        #steelAutoWorkflowPanel .panel-title h3 { font-size:15px; }
        #steelAutoWorkflowPanel #btnSteelAutoWorkflow { min-height:58px; font-size:15px; }
      }
    `;
    document.head.appendChild(style);
  }

  function placeWorkflowFirst() {
    const main = document.querySelector("main.container") || document.querySelector("main");
    const panel = $("steelAutoWorkflowPanel");
    if (!main || !panel) return;
    const welcome = main.querySelector(":scope > .welcome");
    if (welcome && panel.nextElementSibling !== welcome) main.insertBefore(panel, welcome);
    else if (!welcome && main.firstElementChild !== panel) main.insertBefore(panel, main.firstElementChild);
  }

  function groupPrimaryInputs() {
    if ($("primaryInputsPanel")) return;
    const main = document.querySelector("main.container") || document.querySelector("main");
    if (!main) return;
    const candidates = Array.from(main.querySelectorAll(":scope > .panel"));
    const wanted = [
      p => /مشخصات پروژه/.test(p.querySelector(".panel-title h3")?.textContent || ""),
      p => /مشخصات هندسی/.test(p.querySelector(".panel-title h3")?.textContent || ""),
      p => /شرایط تکیه.گاهی قاب/.test(p.querySelector(".panel-title h3")?.textContent || ""),
      p => /بارگذاری مقدماتی/.test(p.querySelector(".panel-title h3")?.textContent || "")
    ];
    const selected = wanted.map(match => candidates.find(match)).filter(Boolean);
    if (selected.length !== 4) return;
    const group = document.createElement("section");
    group.className = "panel";
    group.id = "primaryInputsPanel";
    group.innerHTML = '<div class="panel-title"><h3>ورودی‌های اصلی پروژه</h3><span class="status">مشخصات، هندسه و بارها</span></div><div class="primary-inputs-grid"></div>';
    const target = group.querySelector(".primary-inputs-grid");
    selected.forEach((panel, index) => {
      panel.classList.remove("panel");
      panel.classList.add("input-subsection");
      const heading = panel.querySelector(".panel-title h3");
      if (heading) heading.textContent = ["مشخصات پروژه","مشخصات هندسی","شرایط تکیه‌گاهی قاب","بارگذاری مقدماتی"][index];
      target.appendChild(panel);
    });
    const workflow = $("steelAutoWorkflowPanel");
    if (workflow && workflow.parentNode === main) main.insertBefore(group, workflow.nextSibling);
    else main.insertBefore(group, main.firstChild);
  }

  function shouldOpen(title) {
    return /ورودی‌های اصلی پروژه|نتایج تحلیل|مدل هندسی کامل سوله|اجرای هوشمند و یکپارچه پروژه/.test(title);
  }

  function organize(panel) {
    if (!panel || panel.dataset.smartOrganized === "1") return;
    const heading = panel.querySelector(":scope > .panel-title h3") ||
      panel.querySelector(".panel-title h3") || panel.querySelector(":scope > h3");
    if (!heading) return;
    const titleText = heading.textContent.trim();
    if (!titleText) return;
    const titleContainer = heading.closest(".panel-title") || heading;
    const status = titleContainer.querySelector(".status");
    const details = document.createElement("details");
    details.open = shouldOpen(titleText);
    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.className = "smart-panel-title";
    title.textContent = titleText;
    summary.appendChild(title);
    if (status) {
      const statusText = document.createElement("span");
      statusText.className = "smart-panel-status";
      statusText.textContent = status.textContent.trim();
      summary.appendChild(statusText);
    }
    const content = document.createElement("div");
    content.className = "smart-panel-content";
    Array.from(panel.childNodes).forEach(node => {
      if (node !== titleContainer) content.appendChild(node);
    });
    details.appendChild(summary);
    details.appendChild(content);
    panel.replaceChildren(details);
    panel.classList.add("smart-organized");
    panel.dataset.smartOrganized = "1";
    panel.dataset.smartTitle = titleText;
  }

  function renumberPanels() {
    let number = 0;
    document.querySelectorAll("main .panel.smart-organized").forEach(panel => {
      const title = panel.querySelector(":scope > details > summary .smart-panel-title");
      if (!title) return;
      number += 1;
      const original = panel.dataset.smartTitle || title.textContent;
      title.textContent = number.toLocaleString("fa-IR") + " ـ " + original;
    });
  }

  function cleanLegacyControls() {
    const legacyButton = $("btnCalculate");
    if (legacyButton) legacyButton.hidden = true;
    const legacyResults = $("results");
    if (legacyResults) legacyResults.hidden = true;
    const comboButton = $("btnCombinations");
    if (comboButton) comboButton.textContent = "تحلیل ترکیبات بار سه‌بعدی (دستی)";
    const integratedWorkflow = $("steelAutoWorkflowPanel");
    if (integratedWorkflow) integratedWorkflow.hidden = false;
    const drawButton = $("btnDraw");
    if (drawButton) drawButton.textContent = "بازترسیم قاب";
  }

  function scan(root) {
    if (!root) return;
    if (root.matches?.(".panel")) organize(root);
    root.querySelectorAll?.(".panel").forEach(organize);
    renumberPanels();
  }

  function init() {
    addStyles();
    placeWorkflowFirst();
    groupPrimaryInputs();
    cleanLegacyControls();
    scan(document);
    placeWorkflowFirst();
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          cleanLegacyControls();
          scan(node);
        }
      }));
      placeWorkflowFirst();
      renumberPanels();
    });
    observer.observe(document.querySelector("main") || document.body, {childList:true,subtree:true});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();