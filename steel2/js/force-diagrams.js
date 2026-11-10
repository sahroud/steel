/* SAHROUD STEEL - Internal Force Diagrams 2.0 */
(function () {
"use strict";

const $ = id => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const MEMBER_NAMES = ["ستون چپ", "رفتر چپ", "رفتر راست", "ستون راست"];

function fmt(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("fa-IR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) : "—";
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
    })[ch]);
}

function sample(a, b) {
    a = Number(a) || 0;
    b = Number(b) || 0;
    return Array.from({length: 21}, (_, i) => ({
        x: i / 20,
        value: a + (b - a) * i / 20
    }));
}

function makeSvg(title, unit, values) {
    const W = 640, H = 205, left = 48, right = 18, middle = 105;
    const maximum = Math.max(0.001, ...values.map(p => Math.abs(p.value)));
    const scale = 65 / maximum;

    const points = values.map((p, i) => [
        left + (W - left - right) * i / 20,
        middle - p.value * scale
    ]);

    const path = points.map((p, i) =>
        (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)
    ).join(" ");

    const peak = values.reduce((a, b) =>
        Math.abs(b.value) > Math.abs(a.value) ? b : a
    );

    return `
    <svg xmlns="${NS}" viewBox="0 0 ${W} ${H}"
         style="width:100%;max-width:700px;height:auto" role="img">
        <rect width="${W}" height="${H}" fill="#fff"/>
        <text x="320" y="20" text-anchor="middle"
              font-size="14" font-family="Tahoma,Arial">
            ${esc(title)} (${unit})
        </text>
        <line x1="${left}" y1="${middle}" x2="${W-right}" y2="${middle}"
              stroke="#64748b" stroke-width="1.2"/>
        <line x1="${left}" y1="35" x2="${left}" y2="173"
              stroke="#94a3b8"/>
        <path d="${path}" fill="none" stroke="#087eaa" stroke-width="2.5"/>
        <circle cx="${points[0][0]}" cy="${points[0][1]}" r="4" fill="#15803d"/>
        <circle cx="${points[20][0]}" cy="${points[20][1]}" r="4" fill="#b45309"/>
        <text x="${left}" y="193" text-anchor="middle"
              font-size="11" font-family="Tahoma,Arial">ابتدا</text>
        <text x="${W-right}" y="193" text-anchor="middle"
              font-size="11" font-family="Tahoma,Arial">انتها</text>
        <text x="620" y="34" text-anchor="end"
              font-size="11" font-family="Tahoma,Arial">
            بیشینه قدرمطلق: ${fmt(peak.value)}
        </text>
    </svg>`;
}

function getValues(member, type) {
    if (type === "N") return sample(member.axialStart, member.axialEnd);
    if (type === "V") return sample(member.shearStart, member.shearEnd);
    return sample(member.momentStart, member.momentEnd);
}

function render(target, combo) {
    if (!target || !combo) return;

    const members = MEMBER_NAMES.map(name =>
        (combo.members || []).find(m => m.name === name)
    );

    if (members.some(m => !m)) {
        target.innerHTML = '<div class="notice">اطلاعات چهار عضو کامل نیست.</div>';
        return;
    }

    target.innerHTML = `
        <div class="notice">
            <b>ترکیب بار:</b> ${esc(combo.name)}
            <p>هر نمودار دارای ۲۱ نقطه درون‌یابی است.</p>
        </div>
        ${members.map(member => `
            <div style="border:1px solid #cbd5e1;border-radius:10px;
                padding:10px;margin:14px 0;break-inside:avoid">
                <h4 style="text-align:center">${esc(member.name)}</h4>
                ${makeSvg("نیروی محوری N", "kN", getValues(member, "N"))}
                ${makeSvg("نیروی برشی V", "kN", getValues(member, "V"))}
                ${makeSvg("لنگر خمشی M", "kN.m", getValues(member, "M"))}
            </div>
        `).join("")}
        <div class="notice">
            <b>محدودیت مهم:</b>
            نمودارهای این نسخه درون‌یابی تقریبی بین نیروهای ابتدا و انتهای
            اعضا هستند. اثر بار گسترده در طول عضو هنوز مستقیماً بازیابی نشده
            است؛ بنابراین برای تعیین بیشینه واقعی نیرو یا طراحی اجرایی معتبر نیستند.
        </div>
    `;
}

function renderSelected() {
    const select = $("forceCombinationSelect");
    const target = $("forceDiagramResults");
    const combos = window.SteelAnalysis &&
        window.SteelAnalysis.combinationResults;

    if (!select || !target) return;

    if (!Array.isArray(combos) || !combos.length) {
        select.innerHTML =
            '<option value="">ابتدا تحلیل ترکیبات بار را اجرا کنید</option>';
        target.innerHTML = "هنوز نتیجه‌ای برای نمایش وجود ندارد.";
        return;
    }

    render(target, combos[Number(select.value)] || combos[0]);
}

function refresh() {
    const select = $("forceCombinationSelect");
    const combos = window.SteelAnalysis &&
        window.SteelAnalysis.combinationResults;

    if (!select) return;

    if (!Array.isArray(combos) || !combos.length) {
        renderSelected();
        return;
    }

    const previous = select.value;
    select.innerHTML = combos.map((combo, i) =>
        `<option value="${i}">${esc(combo.name)}</option>`
    ).join("");

    select.value = previous !== "" && Number(previous) < combos.length
        ? previous : "0";

    renderSelected();
}

function addReport() {
    const report = $("printableFinalReport");
    const combos = window.SteelAnalysis &&
        window.SteelAnalysis.combinationResults;
    const select = $("forceCombinationSelect");

    if (!report || !Array.isArray(combos) || !combos.length || !select) return;

    const combo = combos[Number(select.value)] || combos[0];
    let section = $("forceDiagramsReportSection");

    if (section) section.remove();

    section = document.createElement("section");
    section.id = "forceDiagramsReportSection";
    section.className = "report-section";
    section.innerHTML = `
        <h3>۹. نمودارهای مقدماتی نیروهای داخلی</h3>
        <div id="forceDiagramsReportContent"></div>
    `;
    report.appendChild(section);
    render($("forceDiagramsReportContent"), combo);
}

function init() {
    if ($("forceDiagramPanel")) {
        refresh();
        return;
    }

    const panel = document.createElement("section");
    panel.id = "forceDiagramPanel";
    panel.className = "panel";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
        <div class="panel-title">
            <h3>۹ ـ نمودار نیروهای داخلی اعضا</h3>
        </div>
        <div class="field">
            <label for="forceCombinationSelect">انتخاب ترکیب بار</label>
            <select id="forceCombinationSelect">
                <option value="">ابتدا تحلیل ترکیبات بار را اجرا کنید</option>
            </select>
        </div>
        <div id="forceDiagramResults" class="notice">
            ابتدا تحلیل ترکیبات بار را اجرا کنید.
        </div>
    `;

    const main = document.querySelector("main.container") ||
                 document.querySelector("main") ||
                 document.body;
    const footer = main.querySelector("footer");

    if (footer) main.insertBefore(panel, footer);
    else main.appendChild(panel);

    $("forceCombinationSelect").addEventListener("change", renderSelected);

    const comboButton = $("btnCombinations");
    if (comboButton) {
        comboButton.addEventListener("click", function () {
            setTimeout(refresh, 300);
            setTimeout(refresh, 1000);
        });
    }

    const calcButton = $("btnCalculate");
    if (calcButton) {
        calcButton.addEventListener("click", function () {
            setTimeout(refresh, 300);
        });
    }

    const reportButton = $("btnFinalReport");
    if (reportButton) {
        reportButton.addEventListener("click", function () {
            setTimeout(addReport, 300);
        });
    }

    refresh();
}

window.SteelForceDiagrams = {
    refresh: refresh,
    render: renderSelected
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();