
/* SAHROUD STEEL - Preliminary N-M Interaction
   Version 2.0
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
            throw new Error(
                "طول عضو " + member.name + " معتبر نیست."
            );
        }

        const points = [];

        // نمونه‌برداری در طول عضو
        for (let i = 0; i <= 40; i++) {
            points.push(L * i / 40);
        }

        // نقطه صفرشدن برش
        const qy = Number(member.localLoadY) || 0;
        const shearStart = Number(member.shearStart) || 0;

        if (Math.abs(qy) > 1e-12) {
            const x = -shearStart / qy;

            if (x > 0 && x < L) {
                points.push(x);
            }
        }

        return [...new Set(points)].sort((a, b) => a - b);
    }

    function getCapacities(type) {
        if (
            !window.SteelStability ||
            !window.SteelFlexure
        ) {
            throw new Error(
                "ماژول‌های کنترل کمانش یا ظرفیت خمشی بارگذاری نشده‌اند."
            );
        }

        const compression =
            window.SteelStability.getMemberCapacity(type);

        const flexure =
            window.SteelFlexure.getFlexuralCapacity(type);

        const phiPn = Number(compression.capacityKN);
        const phiMn = Number(flexure.designKNm);

        if (!(phiPn > 0 && phiMn > 0)) {
            throw new Error(
                "ظرفیت فشاری یا خمشی " +
                (type === "column" ? "ستون" : "رفتر") +
                " معتبر نیست."
            );
        }

        return {
            phiPn,
            phiMn,
            axis: compression.controllingAxis,
            slendernessX: compression.x.slenderness,
            slendernessY: compression.y.slenderness
        };
    }

    function interactionRatio(Pu, Mu, phiPn, phiMn) {
        const axialRatio = Pu / phiPn;
        const momentRatio = Mu / phiMn;

        // رابطه مقدماتی اندرکنش یک‌محوره
        if (axialRatio >= 0.20) {
            return axialRatio + (8 / 9) * momentRatio;
        }

        return axialRatio / 2 + momentRatio;
    }

    function calculate() {
        const output = $("interactionResults");

        try {
            const analysis = window.SteelAnalysis;
            const cases = analysis &&
                analysis.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            if (
                !window.SteelSections ||
                !window.SteelStability ||
                !window.SteelFlexure
            ) {
                throw new Error(
                    "ابتدا ماژول‌های مصالح، کمانش و خمش را بارگذاری کنید."
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
                    Mu: 0,
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

                    const L = Number(member.length);

                    if (
                        !(Number.isFinite(L) && L > 0) ||
                        !Number.isFinite(Number(member.axialStart)) ||
                        !Number.isFinite(Number(member.shearStart)) ||
                        !Number.isFinite(Number(member.momentStart))
                    ) {
                        throw new Error(
                            "اطلاعات نیروهای عضو «" +
                            name +
                            "» ناقص است. تحلیل را دوباره اجرا کنید."
                        );
                    }

                    const target = results[name];
                    const cap = target.capacity;

                    getStations(member).forEach(x => {
                        const N = forceAt(member, "N", x);
                        const M = forceAt(member, "M", x);

                        // نیروی محوری فشاری مثبت در کنترل
                        const Pu = Math.max(0, -N);
                        const Mu = Math.abs(M);

                        const ratio = interactionRatio(
                            Pu,
                            Mu,
                            cap.phiPn,
                            cap.phiMn
                        );

                        if (ratio > target.ratio) {
                            target.ratio = ratio;
                            target.Pu = Pu;
                            target.Mu = Mu;
                            target.axialRatio = Pu / cap.phiPn;
                            target.momentRatio = Mu / cap.phiMn;
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
                const pass = r.ratio <= 1;

                return `
                    <tr>
                        <td><b>${esc(name)}</b></td>
                        <td>${fmt(c.phiPn)}</td>
                        <td>${fmt(c.phiMn)}</td>
                        <td>${fmt(r.Pu)}</td>
                        <td>${fmt(r.Mu)}</td>
                        <td>${fmt(r.axialRatio)}</td>
                        <td>${fmt(r.momentRatio)}</td>
                        <td><b>${fmt(r.ratio)}</b></td>
                        <td>
                            ${pass
                                ? "قبول مقدماتی"
                                : "نیاز به بررسی"}
                        </td>
                        <td>${esc(r.combination)}</td>
                        <td>${fmt(r.position)} m</td>
                        <td>${esc(c.axis)}</td>
                    </tr>
                `;
            }).join("");

            output.innerHTML = `
                <hr>

                <h4>
                    کنترل اندرکنش نیروی محوری و خمش اعضا
                </h4>

                <p>
                    تعداد ترکیبات بررسی‌شده:
                    <b>${fmt(cases.length, 0)}</b>
                </p>

                <p>
                    تعداد اعضای بررسی‌شده:
                    <b>${fmt(processed / cases.length, 0)}</b>
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
                                <th>عضو</th>
                                <th>φPn (kN)</th>
                                <th>φMn (kN.m)</th>
                                <th>Pu (kN)</th>
                                <th>Mu (kN.m)</th>
                                <th>Pu/φPn</th>
                                <th>Mu/φMn</th>
                                <th>نسبت اندرکنش</th>
                                <th>نتیجه</th>
                                <th>ترکیب حاکم</th>
                                <th>موقعیت</th>
                                <th>محور حاکم کمانش</th>
                            </tr>
                        </thead>

                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="notice">
                    <b>روش محاسبه</b>

                    <p>
                        ظرفیت فشاری طراحی φPn از کنترل کمانش
                        حول محور قوی و ضعیف و انتخاب ظرفیت حاکم
                        استخراج شده است.
                    </p>

                    <p>
                        ظرفیت خمشی طراحی φMn از ماژول کنترل خمشی
                        و بر اساس مدول مقطع کوچک‌تر بالا و پایین
                        به دست آمده است.
                    </p>

                    <p>
                        نیروهای محوری و لنگر در طول عضو و در تمام
                        ترکیبات بار بررسی شده‌اند.
                    </p>

                    <p>
                        برای Pu/φPn ≥ 0.20:
                        نسبت اندرکنش =
                        Pu/φPn + (8/9)(Mu/φMn)
                    </p>

                    <p>
                        برای Pu/φPn کمتر از 0.20:
                        نسبت اندرکنش =
                        Pu/(2φPn) + Mu/φMn
                    </p>
                </div>

                <div class="notice">
                    <b>محدودیت‌های مهم مهندسی</b>

                    <p>
                        این کنترل یک برآورد مقدماتی اندرکنش
                        فشار و خمش یک‌محوره است.
                    </p>

                    <p>
                        کشش محوری، خمش حول محور ضعیف،
                        اندرکنش دومحوره، کمانش جانبی‌پیچشی،
                        کمانش موضعی و اثرات مرتبه دوم
                        هنوز در این کنترل کامل نشده‌اند.
                    </p>

                    <p>
                        ظرفیت خمشی استفاده‌شده برآورد اولیه
                        تسلیم الاستیک است و ظرفیت نهایی آیین‌نامه‌ای نیست.
                    </p>

                    <p>
                        نتیجه قبول مقدماتی به معنی تأیید طراحی اجرایی
                        یا ایمنی سازه نیست.
                    </p>
                </div>
            `;

            analysis.interactionResults = results;

            const status = $("projectStatus");

            if (status) {
                status.textContent =
                    "کنترل مقدماتی اندرکنش فشار و خمش چهار عضو انجام شد.";
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
                محاسبه نسبت اندرکنش نیروی فشاری و لنگر خمشی
                با استفاده از ظرفیت‌های کمانش و خمش.
            </div>

            <button id="btnInteraction"
                class="btn primary" type="button">
                محاسبه کنترل اندرکنش N-M
            </button>

            <div id="interactionResults"></div>
        `;

        const design = $("memberDesignPanel");

        if (design && design.parentNode) {
            design.parentNode.insertBefore(
                panel,
                design.nextSibling
            );
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
