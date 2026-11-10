
/* SAHROUD STEEL - Axial and Biaxial Capacity Framework
   Version 3.0
   2D analysis: N-Mx check + My capacity reporting
   Units: kN, m, kN.m
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const PHI_B = 0.90;

    const MEMBER_NAMES = [
        "ستون چپ",
        "ستون راست",
        "رفتر چپ",
        "رفتر راست"
    ];

    function fmt(value, digits = 3) {
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";
        return n.toLocaleString("fa-IR", {
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

    function memberType(name) {
        return name.includes("ستون") ? "column" : "rafter";
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

        if (!(Number.isFinite(L) && L > 0)) {
            throw new Error("طول عضو " + member.name + " معتبر نیست.");
        }

        const points = [];

        for (let i = 0; i <= 40; i++) {
            points.push(L * i / 40);
        }

        const qy = Number(member.localLoadY) || 0;
        const shearStart = Number(member.shearStart) || 0;

        if (Math.abs(qy) > 1e-12) {
            const x = -shearStart / qy;
            if (x > 0 && x < L) points.push(x);
        }

        return [...new Set(points)].sort((a, b) => a - b);
    }

    function getCapacities(type) {
        if (
            !window.SteelStability ||
            !window.SteelFlexure ||
            !window.SteelSections
        ) {
            throw new Error(
                "ماژول‌های کمانش، خمش یا مشخصات مقاطع بارگذاری نشده‌اند."
            );
        }

        const compression =
            window.SteelStability.getMemberCapacity(type);

        const flexure =
            window.SteelFlexure.getFlexuralCapacity(type);

        const data = window.SteelSections.getDataSI();
        const section = data[type];
        const fy = Number(data.material.Fy);
        const sy = Number(section.Sy);

        const phiPn = Number(compression.capacityKN);
        const phiMnx = Number(flexure.designKNm);

        if (!(phiPn > 0 && phiMnx > 0 && fy > 0 && sy > 0)) {
            throw new Error(
                "ظرفیت فشاری یا مشخصات خمشی مقطع " +
                (type === "column" ? "ستون" : "رفتر") +
                " معتبر نیست."
            );
        }

        // برآورد اولیه ظرفیت خمشی محور ضعیف:
        // φMny = φb × Fy × Sy
        const phiMny = PHI_B * fy * sy / 1000;

        if (!(phiMny > 0 && Number.isFinite(phiMny))) {
            throw new Error("ظرفیت خمشی محور ضعیف معتبر نیست.");
        }

        return {
            phiPn,
            phiMnx,
            phiMny,
            syCm3: sy * 1e6,
            axis: compression.controllingAxis,
            slendernessX: compression.x.slenderness,
            slendernessY: compression.y.slenderness
        };
    }

    function interactionRatio(Pu, Mux, phiPn, phiMnx) {
        const axialRatio = Pu / phiPn;
        const momentRatio = Mux / phiMnx;

        if (axialRatio >= 0.20) {
            return axialRatio + (8 / 9) * momentRatio;
        }

        return axialRatio / 2 + momentRatio;
    }

    function calculate() {
        const output = $("interactionResults");

        if (!output) return;

        try {
            const analysis = window.SteelAnalysis;
            const cases = analysis && analysis.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            const capacities = {
                column: getCapacities("column"),
                rafter: getCapacities("rafter")
            };

            const results = {};

            MEMBER_NAMES.forEach(name => {
                results[name] = {
                    capacity: capacities[memberType(name)],
                    ratio: 0,
                    Pu: 0,
                    Mux: 0,
                    Muy: null,
                    axialRatio: 0,
                    momentRatio: 0,
                    combination: "—",
                    position: 0
                };
            });

            let processed = 0;

            cases.forEach(item => {
                (item.members || []).forEach(member => {
                    const name = member.name;
                    if (!results[name]) return;

                    if (
                        !(Number(member.length) > 0) ||
                        !Number.isFinite(Number(member.axialStart)) ||
                        !Number.isFinite(Number(member.shearStart)) ||
                        !Number.isFinite(Number(member.momentStart))
                    ) {
                        throw new Error(
                            "اطلاعات نیروهای عضو «" + name + "» ناقص است."
                        );
                    }

                    const target = results[name];
                    const cap = target.capacity;

                    getStations(member).forEach(x => {
                        const N = forceAt(member, "N", x);
                        const M = forceAt(member, "M", x);

                        // در قرارداد نمودارهای فعلی، N مثبت فشار است.
                        const Pu = Math.max(0, N);
                        const Mux = Math.abs(M);

                        const ratio = interactionRatio(
                            Pu,
                            Mux,
                            cap.phiPn,
                            cap.phiMnx
                        );

                        if (ratio > target.ratio) {
                            target.ratio = ratio;
                            target.Pu = Pu;
                            target.Mux = Mux;
                            target.axialRatio = Pu / cap.phiPn;
                            target.momentRatio = Mux / cap.phiMnx;
                            target.combination = item.name;
                            target.position = x;
                        }
                    });

                    processed++;
                });
            });

            if (!processed) {
                throw new Error(
                    "نتایج نیروهای اعضا در ترکیبات بار پیدا نشد."
                );
            }

            const rows = MEMBER_NAMES.map(name => {
                const r = results[name];
                const c = r.capacity;

                // نسبت فعلی فقط کنترل دوبعدی N-Mx است.
                const pass = r.ratio <= 1;

                return `
                    <tr>
                        <td><b>${esc(name)}</b></td>
                        <td>${fmt(c.phiPn)}</td>
                        <td>${fmt(c.phiMnx)}</td>
                        <td>${fmt(c.phiMny)}</td>
                        <td>${fmt(r.Pu)}</td>
                        <td>${fmt(r.Mux)}</td>
                        <td>محاسبه نشده</td>
                        <td>${fmt(r.axialRatio)}</td>
                        <td>${fmt(r.momentRatio)}</td>
                        <td><b>${fmt(r.ratio)}</b></td>
                        <td>${pass ? "قبول مقدماتی دوبعدی" : "نیاز به بررسی"}</td>
                        <td>${esc(r.combination)}</td>
                        <td>${fmt(r.position)} m</td>
                        <td>${esc(c.axis)}</td>
                    </tr>
                `;
            }).join("");

            output.innerHTML = `
                <hr>
                <h4>کنترل اندرکنش نیروی محوری و خمش اعضا ـ نسخه ۳</h4>

                <p>
                    تعداد ترکیبات بار:
                    <b>${fmt(cases.length, 0)}</b>
                    |
                    تعداد اعضای بررسی‌شده:
                    <b>${fmt(processed / cases.length, 0)}</b>
                </p>

                <div style="overflow-x:auto">
                    <table style="
                        width:100%;
                        min-width:1650px;
                        border-collapse:collapse;
                        font-size:12px
                    ">
                        <thead>
                            <tr>
                                <th>عضو</th>
                                <th>φPn (kN)</th>
                                <th>φMnx (kN.m)</th>
                                <th>φMny (kN.m)</th>
                                <th>Pu (kN)</th>
                                <th>Mux (kN.m)</th>
                                <th>Muy (kN.m)</th>
                                <th>Pu/φPn</th>
                                <th>Mux/φMnx</th>
                                <th>نسبت اندرکنش</th>
                                <th>نتیجه</th>
                                <th>ترکیب حاکم</th>
                                <th>موقعیت</th>
                                <th>محور کمانش حاکم</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="notice">
                    <b>ظرفیت‌های خمشی مقطع</b>
                    <p>
                        ظرفیت محور قوی از ماژول کنترل خمشی دریافت شده است.
                    </p>
                    <p>
                        ظرفیت محور ضعیف از رابطه مقدماتی
                        φMny = 0.90 × Fy × Sy محاسبه شده است.
                    </p>
                    <p>
                        Sy ستون و رفتر از مشخصات مقطع واردشده توسط کاربر
                        خوانده می‌شود.
                    </p>
                </div>

                <div class="notice">
                    <b>روش کنترل فعلی</b>
                    <p>
                        برای Pu/φPn ≥ 0.20:
                        نسبت اندرکنش =
                        Pu/φPn + (8/9)(Mux/φMnx)
                    </p>
                    <p>
                        برای Pu/φPn کمتر از 0.20:
                        نسبت اندرکنش =
                        Pu/(2φPn) + Mux/φMnx
                    </p>
                    <p>
                        تمام ترکیبات بار و نقاط نمونه‌برداری‌شده در طول
                        اعضا بررسی می‌شوند.
                    </p>
                </div>

                <div class="notice" style="border-right:4px solid #d97706">
                    <b>محدودیت مهم: کنترل دومحوره هنوز کامل نیست</b>
                    <p>
                        مدل تحلیل فعلی دوبعدی است و فقط لنگر خمشی درون
                        صفحه قاب را محاسبه می‌کند. بنابراین تقاضای Muy
                        در دسترس نیست و در جدول «محاسبه نشده» نمایش داده
                        می‌شود.
                    </p>
                    <p>
                        ظرفیت محور ضعیف محاسبه شده، اما تا زمان افزودن
                        تحلیل سه‌بعدی و محاسبه تقاضای Muy، اندرکنش
                        واقعی N-Mx-My قابل تأیید نیست.
                    </p>
                    <p>
                        نیروی کششی محوری، کمانش جانبی‌پیچشی، کمانش
                        موضعی، اثرات مرتبه دوم و الزامات کامل آیین‌نامه‌ای
                        نیز در این کنترل لحاظ نشده‌اند.
                    </p>
                    <p>
                        عبارت «قبول مقدماتی دوبعدی» به معنی تأیید
                        طراحی اجرایی یا ایمنی سازه نیست.
                    </p>
                </div>
            `;

            analysis.interactionResults = results;

            if ($("projectStatus")) {
                $("projectStatus").textContent =
                    "کنترل مقدماتی اندرکنش N-Mx و ظرفیت محور ضعیف انجام شد؛ " +
                    "تقاضای خمش دومحوره نیازمند تحلیل سه‌بعدی است.";
            }

        } catch (error) {
            output.innerHTML = `
                <div class="notice" style="color:#b45309">
                    <b>خطا در کنترل اندرکنش:</b>
                    <p>${esc(error.message)}</p>
                </div>
            `;
        }
    }

    function createPanel() {
        if ($("interactionPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "interactionPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل اندرکنش اعضا</h3>
            </div>

            <div class="notice">
                کنترل مقدماتی نیروی محوری و خمش درون صفحه قاب،
                همراه با محاسبه ظرفیت خمشی محور ضعیف.
            </div>

            <button id="btnInteraction"
                class="btn primary" type="button">
                محاسبه کنترل اندرکنش N-M
            </button>

            <div id="interactionResults"></div>
        `;

        const design = $("memberDesignPanel");

        if (design && design.parentNode) {
            design.parentNode.insertBefore(panel, design.nextSibling);
        } else {
            document.querySelector("main")?.appendChild(panel);
        }

        $("btnInteraction").addEventListener("click", calculate);
    }

    function init() {
        createPanel();
    }

    window.SteelInteraction = {
        calculate,
        interactionRatio,
        getCapacities
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
