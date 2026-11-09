/* SAHROUD STEEL - Member Design Demand Report */
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
                استخراج بیشینه نیروهای محوری فشاری، لنگر خمشی
                و برش از تمام ترکیبات بار برای هر چهار عضو.
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

    function calculateDemand() {
        const output = $("memberDemandResults");

        try {
            const cases = window.SteelAnalysis?.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار را اجرا کنید."
                );
            }

            const result = {};

            MEMBER_NAMES.forEach(name => {
                result[name] = {
                    N: { value: 0, combination: "—", end: "—" },
                    M: { value: 0, combination: "—", end: "—" },
                    V: { value: 0, combination: "—", end: "—" }
                };
            });

            cases.forEach(item => {
                (item.members || []).forEach(member => {
                    const name = member.name;

                    if (!result[name]) return;

                    const forces = [
                        {
                            key: "N",
                            value: Number(member.axialStart),
                            end: "ابتدا",
                            compressionOnly: true
                        },
                        {
                            key: "N",
                            value: Number(member.axialEnd),
                            end: "انتها",
                            compressionOnly: true
                        },
                        {
                            key: "M",
                            value: Number(member.momentStart),
                            end: "ابتدا"
                        },
                        {
                            key: "M",
                            value: Number(member.momentEnd),
                            end: "انتها"
                        },
                        {
                            key: "V",
                            value: Number(member.shearStart),
                            end: "ابتدا"
                        },
                        {
                            key: "V",
                            value: Number(member.shearEnd),
                            end: "انتها"
                        }
                    ];

                    forces.forEach(force => {
                        if (!Number.isFinite(force.value)) return;

                        if (force.compressionOnly && force.value <= 0) {
                            return;
                        }

                        const demand = force.compressionOnly
                            ? force.value
                            : Math.abs(force.value);

                        if (demand > result[name][force.key].value) {
                            result[name][force.key] = {
                                value: demand,
                                signedValue: force.value,
                                combination: item.name,
                                end: force.end
                            };
                        }
                    });
                });
            });

            const rows = MEMBER_NAMES.map(name => {
                const r = result[name];

                return `
                    <tr>
                        <td>${name}</td>
                        <td>${fmt(r.N.value)}</td>
                        <td>${r.N.combination}</td>
                        <td>${r.N.end}</td>
                        <td>${fmt(r.M.value)}</td>
                        <td>${r.M.combination}</td>
                        <td>${r.M.end}</td>
                        <td>${fmt(r.V.value)}</td>
                        <td>${r.V.combination}</td>
                        <td>${r.V.end}</td>
                    </tr>
                `;
            }).join("");

            output.innerHTML = `
                <hr>
                <h4>جدول تقاضای طراحی چهار عضو</h4>

                <div style="overflow-x:auto">
                    <table style="
                        width:100%;
                        min-width:1050px;
                        border-collapse:collapse
                    ">
                        <thead>
                            <tr>
                                <th rowspan="2">عضو</th>
                                <th colspan="3">فشار محوری N (kN)</th>
                                <th colspan="3">لنگر خمشی |M| (kN.m)</th>
                                <th colspan="3">برش |V| (kN)</th>
                            </tr>
                            <tr>
                                <th>بیشینه</th>
                                <th>ترکیب حاکم</th>
                                <th>محل</th>
                                <th>بیشینه</th>
                                <th>ترکیب حاکم</th>
                                <th>محل</th>
                                <th>بیشینه</th>
                                <th>ترکیب حاکم</th>
                                <th>محل</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="notice">
                    <b>وضعیت این مرحله</b>
                    <p>
                        تقاضاهای نیرو استخراج شده‌اند؛
                        هنوز نسبت اندرکنش N-M و نسبت مقاومت برشی
                        محاسبه نشده است.
                    </p>
                    <p>
                        نیروهای گزارش‌شده، نیروهای انتهایی اعضا هستند.
                        بارگذاری گسترده و بیشینه نیروی داخلی در طول عضو
                        هنوز در این جدول منظور نشده است.
                    </p>
                </div>
            `;

            const status = $("projectStatus");
            if (status) {
                status.textContent =
                    "استخراج تقاضای طراحی چهار عضو انجام شد.";
            }

        } catch (error) {
            output.innerHTML = `
                <div class="notice" style="color:#b45309">
                    خطا: ${error.message}
                </div>
            `;
        }
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