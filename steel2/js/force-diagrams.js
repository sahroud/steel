/* SAHROUD STEEL - Internal Force Diagrams 3.0
Uniform local member loads included
Units: kN, m, kN.m
*/
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

// نیروهای داخلی در فاصله x از ابتدای عضو
// بارهای محلی و نیروها بر حسب kN و kN/m هستند.
function forceAt(member, type, x) {
    const qx = Number(member.localLoadX) || 0;
    const qy = Number(member.localLoadY) || 0;

    if (type === "N") {
        return -(Number(member.axialStart) || 0) - qx * x;
    }

    if (type === "V") {
        return -(Number(member.shearStart) || 0) - qy * x;
    }

    return -(Number(member.momentStart) || 0) +
        (Number(member.shearStart) || 0) * x +
        0.5 * qy * x * x;
}

function buildValues(member, type) {
    const L = Number(member.length);

    if (!Number.isFinite(L) || L <= 0) return [];

    const stations = [];
    for (let i = 0; i <= 40; i++) {
        stations.push(L * i / 40);
    }

    // محل احتمالی بیشینه/کمینه لنگر، جایی است که V صفر می‌شود.
    if (type === "M") {
        const qy = Number(member.localLoadY) || 0;
        const shearStart = Number(member.shearStart) || 0;

        if (Math.abs(qy) > 1e-12) {
            const xZeroShear = -shearStart / qy;
            if (xZeroShear > 0 && xZeroShear < L) {
                stations.push(xZeroShear);
            }
        }
    }

    stations.sort((a, b) => a - b);

    return stations.map(x => ({
        x,
        ratio: x / L,
        value: forceAt(member, type, x)
    }));
}

function findPeak(values) {
    if (!values.length) return { value: 0, x: 0 };

    return values.reduce((best, item) =>
        Math.abs(item.value) > Math.abs(best.value) ? item : best
    , values[0]);
}

function makeSvg(title, unit, values, peak) {
    const W = 640;
    const H = 220;
    const left = 52;
    const right = 20;
    const top = 42;
    const bottom = 34;
    const middle = 112;

    if (!values.length) {
        return '<div class="notice">داده کافی برای رسم نمودار وجود ندارد.</div>';
    }

    const maximum = Math.max(
        0.001,
        ...values.map(p => Math.abs(p.value))
    );

    const scale = 62 / maximum;

    const points = values.map(p => ({
        x: left + (W - left - right) * p.ratio,
        y: middle - p.value * scale
    }));

    const path = points.map((p, i) =>
        (i ? "L" : "M") +
        p.x.toFixed(1) + "," +
        p.y.toFixed(1)
    ).join(" ");

    const peakX = left + (W - left - right) * peak.x /
        (values[values.length - 1].x || 1);

    const peakY = middle - peak.value * scale;

    return `
    <svg xmlns="${NS}" viewBox="0 0 ${W} ${H}"
         style="width:100%;max-width:700px;height:auto"
         role="img">
        <rect width="${W}" height="${H}" fill="#fff"/>
        <text x="320" y="20" text-anchor="middle"
              font-size="14" font-family="Tahoma,Arial">
            ${esc(title)} (${unit})
        </text>
        <line x1="${left}" y1="${middle}"
              x2="${W-right}" y2="${middle}"
              stroke="#64748b" stroke-width="1.2"/>
        <line x1="${left}" y1="${top}"
              x2="${left}" y2="${H-bottom}"
              stroke="#94a3b8"/>
        <path d="${path}" fill="none"
              stroke="#087eaa" stroke-width="2.5"/>
        <circle cx="${points[0].x}" cy="${points[0].y}"
                r="4" fill="#15803d"/>
        <circle cx="${points[points.length-1].x}"
                cy="${points[points.length-1].y}"
                r="4" fill="#b45309"/>
        <circle cx="${peakX}" cy="${peakY}"
                r="4.5" fill="#dc2626"/>
        <text x="${left}" y="204" text-anchor="middle"
              font-size="11" font-family="Tahoma,Arial">ابتدا</text>
        <text x="${W-right}" y="204" text-anchor="middle"
              font-size="11" font-family="Tahoma,Arial">انتها</text>
        <text x="620" y="36" text-anchor="end"
              font-size="11" font-family="Tahoma,Arial">
            بیشینه قدرمطلق: ${fmt(peak.value)} ${unit}
        </text>
        <text x="620" y="51" text-anchor="end"
              font-size="10" font-family="Tahoma,Arial">
            فاصله از ابتدا: ${fmt(peak.x)} m
        </text>
    </svg>`;
}

function renderMember(member) {
    const length = Number(member.length);
    const required = [
        member.axialStart, member.shearStart, member.momentStart,
        member.localLoadX, member.localLoadY
    ];

    if (!Number.isFinite(length) || length <= 0 ||
        required.some(v => !Number.isFinite(Number(v)))) {
        return `
            <div class="notice">
                اطلاعات بار گسترده یا طول عضو برای ${esc(member.name)} موجود نیست.
                تحلیل را دوباره اجرا کنید.
            </div>
        `;
    }

    const N = buildValues(member, "N");
    const V = buildValues(member, "V");
    const M = buildValues(member, "M");

    const peakN = findPeak(N);
    const peakV = findPeak(V);
    const peakM = findPeak(M);

    return `
        <div style="border:1px solid #cbd5e1;border-radius:10px;
            padding:10px;margin:14px 0;break-inside:avoid">
            <h4 style="text-align:center">${esc(member.name)}</h4>
            <p>طول عضو: <b>${fmt(length)} متر</b></p>
            <p>بار محوری محلی: ${fmt(member.localLoadX)} kN/m</p>
            <p>بار عرضی محلی: ${fmt(member.localLoadY)} kN/m</p>

            ${makeSvg("نیروی محوری N", "kN", N, peakN)}
            ${makeSvg("نیروی برشی V", "kN", V, peakV)}
            ${makeSvg("لنگر خمشی M", "kN.m", M, peakM)}

            <div class="notice">
                <b>مقادیر بیشینه در طول عضو</b>
                <p>بیشینه |N|: ${fmt(peakN.value)} kN
                ـ در فاصله ${fmt(peakN.x)} m</p>
                <p>بیشینه |V|: ${fmt(peakV.value)} kN
                ـ در فاصله ${fmt(peakV.x)} m</p>
                <p>بیشینه |M|: ${fmt(peakM.value)} kN.m
                ـ در فاصله ${fmt(peakM.x)} m</p>
            </div>
        </div>
    `;
}

function render(target, combo) {
    if (!target || !combo) return;

    const members = MEMBER_NAMES.map(name =>
        (combo.members || []).find(m => m.name === name)
    );

    if (members.some(m => !m)) {
        target.innerHTML =
            '<div class="notice">اطلاعات چهار عضو کامل نیست.</div>';
        return;
    }

    target.innerHTML = `
        <div class="notice">
            <b>ترکیب بار:</b> ${esc(combo.name)}
            <p>نمودارها با بار گسترده یکنواخت محلی و معادلات تعادل عضو
            محاسبه شده‌اند. نمودار لنگر، نقطه صفرشدن برش را نیز بررسی می‌کند.</p>
        </div>
        ${members.map(renderMember).join("")}
        <div class="notice">
            <b>محدودیت‌ها و قرارداد علامت:</b>
            <p>۱. نیروها در دستگاه مختصات محلی هر عضو گزارش می‌شوند؛
            بنابراین علامت ابتدا و انتهای نمودار ممکن است با علامت
            نیروهای انتهایی در جدول قبلی متفاوت باشد.</p>
            <p>۲. بارهای گسترده یکنواختی که در تحلیل قاب اعمال شده‌اند
            در نمودارها لحاظ شده‌اند. بار متمرکز، بار گسترده متغیر،
            بارگذاری موضعی و بارهای خارج از مدل فعلی لحاظ نشده‌اند.</p>
            <p>۳. این نمودارها خروجی تحلیل خطی مرتبه اول هستند و
            جایگزین کنترل کامل آیین‌نامه‌ای یا طراحی اجرایی نیستند.</p>
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

    const combo = combos[Number(select.value)] || combos[0];
    render(target, combo);
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

    select.value =
        previous !== "" && Number(previous) < combos.length
            ? previous
            : "0";

    renderSelected();
}

function addReport() {
    const report = $("printableFinalReport");
    const combos = window.SteelAnalysis &&
        window.SteelAnalysis.combinationResults;
    const select = $("forceCombinationSelect");

    if (!report || !Array.isArray(combos) ||
        !combos.length || !select) return;

    const combo = combos[Number(select.value)] || combos[0];

    const old = $("forceDiagramsReportSection");
    if (old) old.remove();

    const section = document.createElement("section");
    section.id = "forceDiagramsReportSection";
    section.className = "report-section";

    section.innerHTML = `
        <h3>۹. نمودارهای نیروهای داخلی اعضا با اثر بار گسترده</h3>
        <div id="forceDiagramsReportContent"></div>
    `;

    report.appendChild(section);
    render($("forceDiagramsReportContent"), combo);
}

function init() {
    let panel = $("forceDiagramPanel");

    if (!panel) {
        panel = document.createElement("section");
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
    }

    const select = $("forceCombinationSelect");
    if (select && !select.dataset.forceDiagramBound) {
        select.dataset.forceDiagramBound = "1";
        select.addEventListener("change", renderSelected);
    }

    const comboButton = $("btnCombinations");
    if (comboButton && !comboButton.dataset.forceDiagramBound) {
        comboButton.dataset.forceDiagramBound = "1";
        comboButton.addEventListener("click", function () {
            setTimeout(refresh, 300);
            setTimeout(refresh, 1000);
        });
    }

    const calcButton = $("btnCalculate");
    if (calcButton && !calcButton.dataset.forceDiagramBound) {
        calcButton.dataset.forceDiagramBound = "1";
        calcButton.addEventListener("click", function () {
            setTimeout(refresh, 300);
        });
    }

    const reportButton = $("btnFinalReport");
    if (reportButton && !reportButton.dataset.forceDiagramBound) {
        reportButton.dataset.forceDiagramBound = "1";
        reportButton.addEventListener("click", function () {
            setTimeout(addReport, 300);
        });
    }

    refresh();
}

window.SteelForceDiagrams = {
    refresh,
    render: renderSelected
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();