/* SAHROUD STEEL - Member Design Demand Report
Version 2.0
Member force envelopes include uniform local distributed loads.
Units: kN, m, kN.m
*/
(function () {
"use strict";

const $ = id => document.getElementById(id);

const MEMBER_NAMES = [
    "ستون چپ",
    "ستون راست",
    "رفتر چپ",
    "رفتر راست"
];

function fmt(value, digits = 2) {
    return Number(value || 0).toLocaleString("fa-IR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[ch]);
}

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

function getStations(member) {
    const L = Number(member.length);
    const stations = [0, L];

    const qy = Number(member.localLoadY) || 0;
    const shearStart = Number(member.shearStart) || 0;

    if (Math.abs(qy) > 1e-12) {
        const x = -shearStart / qy;

        if (x > 0 && x < L) {
            stations.push(x);
        }
    }

    return [...new Set(stations)].sort((a, b) => a - b);
}

function newDemand() {
    return {
        compression: {
            value: 0,
            combination: "—",
            position: "—"
        },
        tension: {
            value: 0,
            combination: "—",
            position: "—"
        },
        moment: {
            value: 0,
            combination: "—",
            position: "—"
        },
        shear: {
            value: 0,
            combination: "—",
            position: "—"
        }
    };
}

function updateDemand(target, value, combination, position) {
    if (value > target.value) {
        target.value = value;
        target.combination = combination;
        target.position = fmt(position) + " m";
    }
}

function calculateDemand() {
    const output = $("memberDemandResults");

    try {
        const cases =
            window.SteelAnalysis &&
            window.SteelAnalysis.combinationResults;

        if (!Array.isArray(cases) || !cases.length) {
            throw new Error(
                "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
            );
        }

        const result = {};

        MEMBER_NAMES.forEach(name => {
            result[name] = newDemand();
        });

        let processed = 0;

        cases.forEach(item => {
            (item.members || []).forEach(member => {
                const name = member.name;

                if (!result[name]) return;

                const L = Number(member.length);

                if (!Number.isFinite(L) || L <= 0 ||
                    !Number.isFinite(Number(member.localLoadX)) ||
                    !Number.isFinite(Number(member.localLoadY))) {
                    throw new Error(
                        "اطلاعات طول یا بار محلی عضو «" +
                        name +
                        "» ناقص است. تحلیل را دوباره اجرا کنید."
                    );
                }

                const stations = getStations(member);

                stations.forEach(x => {
                    const N = forceAt(member, "N", x);
                    const V = forceAt(member, "V", x);
                    const M = forceAt(member, "M", x);

                    // قرارداد این گزارش:
                    // N منفی = فشار و N مثبت = کشش
                    const compression = Math.max(0, -N);
                    const tension = Math.max(0, N);

                    updateDemand(
                        result[name].compression,
                        compression,
                        item.name,
                        x
                    );

                    updateDemand(
                        result[name].tension,
                        tension,
                        item.name,
                        x
                    );

                    updateDemand(
                        result[name].moment,
                        Math.abs(M),
                        item.name,
                        x
                    );

                    updateDemand(
                        result[name].shear,
                        Math.abs(V),
                        item.name,
                        x
                    );
                });

                processed++;
            });
        });

        if (!processed) {
            throw new Error(
                "اطلاعات اعضا در نتایج ترکیبات بار پیدا نشد."
            );
        }

        const rows = MEMBER_NAMES.map(name => {
            const r = result[name];

            return `
                <tr>
                    <td><b>${esc(name)}</b></td>

                    <td>${fmt(r.compression.value)}</td>
                    <td>${esc(r.compression.combination)}</td>
                    <td>${esc(r.compression.position)}</td>

                    <td>${fmt(r.tension.value)}</td>
                    <td>${esc(r.tension.combination)}</td>
                    <td>${esc(r.tension.position)}</td>

                    <td>${fmt(r.moment.value)}</td>
                    <td>${esc(r.moment.combination)}</td>
                    <td>${esc(r.moment.position)}</td>

                    <td>${fmt(r.shear.value)}</td>
                    <td>${esc(r.shear.combination)}</td>
                    <td>${esc(r.shear.position)}</td>
                </tr>
            `;
        }).join("");

        output.innerHTML = `
            <hr>
            <h4>جدول تقاضای طراحی در طول اعضا</h4>

            <p>
                تعداد ترکیبات بررسی‌شده:
                <b>${fmt(cases.length, 0)}</b>
            </p>

            <div style="overflow-x:auto">
                <table style="
                    width:100%;
                    min-width:1450px;
                    border-collapse:collapse;
                    font-size:12px
                ">
                    <thead>
                        <tr>
                            <th rowspan="2">عضو</th>
                            <th colspan="3">فشار محوری (kN)</th>
                            <th colspan="3">کشش محوری (kN)</th>
                            <th colspan="3">لنگر |M| (kN.m)</th>
                            <th colspan="3">برش |V| (kN)</th>
                        </tr>
                        <tr>
                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>

                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>

                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>

                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>

            <div class="notice">
                <b>روش استخراج تقاضا</b>
                <p>
                    نیروهای داخلی با استفاده از نیروهای انتهایی،
                    بارهای گسترده یکنواخت محلی و معادلات تعادل عضو
                    در ابتدا، انتها و نقاط بحرانی محاسبه شده‌اند.
                </p>
                <p>
                    برای لنگر خمشی، نقطه صفرشدن نیروی برشی نیز
                    بررسی شده است.
                </p>
            </div>

            <div class="notice">
                <b>محدودیت مهم</b>
                <p>
                    این جدول تقاضای تحلیل را گزارش می‌کند و به‌تنهایی
                    کنترل مقاومت یا تأیید طراحی نیست.
                </p>
                <p>
                    بار متمرکز، بار گسترده متغیر، اثرات مرتبه دوم،
                    کمانش موضعی و جانبی‌پیچشی و کنترل کامل آیین‌نامه‌ای
                    هنوز باید جداگانه بررسی شوند.
                </p>
            </div>
        `;

        window.SteelAnalysis.memberDemandResults = result;

        const status = $("projectStatus");
        if (status) {
            status.textContent =
                "تقاضای نیروهای داخلی در طول چهار عضو و تمام ترکیبات بار استخراج شد.";
        }

    } catch (error) {
        output.innerHTML = `
            <div class="notice" style="color:#b45309">
                <b>خطا در محاسبه تقاضای اعضا:</b>
                <p>${esc(error.message)}</p>
            </div>
        `;
    }
}

function createPanel() {
    if ($("memberDesignPanel")) return;

    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "memberDesignPanel";

    panel.innerHTML = `
        <div class="panel-title">
            <h3>گزارش تقاضای طراحی اعضا</h3>
        </div>

        <div class="notice">
            استخراج بیشینه فشار، کشش، لنگر و برش
            در طول هر عضو از تمام ترکیبات بار.
        </div>

        <div class="button-grid">
            <button id="btnMemberDemand"
                class="btn primary" type="button">
                محاسبه تقاضای طراحی اعضا
            </button>
        </div>

        <div id="memberDemandResults"></div>
    `;

    const stabilityPanel = $("stabilityPanel");

    if (stabilityPanel && stabilityPanel.parentNode) {
        stabilityPanel.parentNode.insertBefore(
            panel,
            stabilityPanel.nextSibling
        );
    } else {
        document.querySelector("main")?.appendChild(panel);
    }

    $("btnMemberDemand").addEventListener(
        "click",
        calculateDemand
    );
}

function init() {
    createPanel();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();