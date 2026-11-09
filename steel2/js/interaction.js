/* SAHROUD STEEL - Preliminary N-M Interaction */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function fmt(v) {
        return Number(v || 0).toLocaleString("fa-IR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function capacity(member) {
        const sec = window.SteelSections.getDataSI();
        const mat = sec.material;
        const p = sec[member];
        const stab = window.SteelGirder.readStability(member);

        const cx = window.SteelStability.calculateAxis(
            mat.E, mat.Fy, p.A, p.Ix, stab.Lx, stab.Kx
        );

        const cy = window.SteelStability.calculateAxis(
            mat.E, mat.Fy, p.A, p.Iy, stab.Ly, stab.Ky
        );

        return {
            P: Math.min(cx.designCapacity, cy.designCapacity) / 1000,
            Mx: mat.Fy * p.SxTop / 1000,
            My: mat.Fy * p.Sy / 1000
        };
    }

    function run() {
        const out = $("interactionResults");

        try {
            const cases = window.SteelAnalysis.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error("ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید.");
            }

            if (!window.SteelStability ||
                !window.SteelSections ||
                !window.SteelGirder) {
                throw new Error("ماژول‌های مقاطع و پایداری بارگذاری نشده‌اند.");
            }

            const names = [
                "ستون چپ", "ستون راست",
                "رفتر چپ", "رفتر راست"
            ];

            const results = [];

            names.forEach(name => {
                const memberType = name.includes("ستون")
                    ? "column" : "rafter";

                const cap = capacity(memberType);

                let worst = {
                    ratio: 0,
                    N: 0,
                    M: 0,
                    combination: "—",
                    end: "—"
                };

                cases.forEach(item => {
                    (item.members || []).forEach(m => {
                        if (m.name !== name) return;

                        [
                            {
                                N: Number(m.axialStart),
                                M: Number(m.momentStart),
                                end: "ابتدا"
                            },
                            {
                                N: Number(m.axialEnd),
                                M: Number(m.momentEnd),
                                end: "انتها"
                            }
                        ].forEach(f => {
                            if (!Number.isFinite(f.N) ||
                                !Number.isFinite(f.M)) return;

                            const N = Math.max(0, f.N);
                            const M = Math.abs(f.M);

                            let ratio;

                            if (N / cap.P >= 0.2) {
                                ratio = N / cap.P +
                                    (8 / 9) * M / cap.Mx;
                            } else {
                                ratio = N / (2 * cap.P) +
                                    M / cap.Mx;
                            }

                            if (ratio > worst.ratio) {
                                worst = {
                                    ratio,
                                    N,
                                    M,
                                    combination: item.name,
                                    end: f.end
                                };
                            }
                        });
                    });
                });

                results.push({
                    name,
                    cap,
                    worst
                });
            });

            out.innerHTML = `
                <h4>کنترل مقدماتی اندرکنش N-M</h4>

                <div style="overflow-x:auto">
                <table style="width:100%;min-width:850px">
                    <thead>
                        <tr>
                            <th>عضو</th>
                            <th>φPn (kN)</th>
                            <th>φMnx تقریبی (kN.m)</th>
                            <th>N (kN)</th>
                            <th>M (kN.m)</th>
                            <th>نسبت N-M</th>
                            <th>نتیجه</th>
                            <th>ترکیب حاکم</th>
                            <th>محل</th>
                        </tr>
                    </thead>
                    <tbody>
                    ${results.map(r => `
                        <tr>
                            <td>${r.name}</td>
                            <td>${fmt(r.cap.P)}</td>
                            <td>${fmt(r.cap.Mx)}</td>
                            <td>${fmt(r.worst.N)}</td>
                            <td>${fmt(r.worst.M)}</td>
                            <td>${fmt(r.worst.ratio)}</td>
                            <td>
                                ${r.worst.ratio <= 1
                                    ? "قبول مقدماتی"
                                    : "نیاز به بررسی"}
                            </td>
                            <td>${r.worst.combination}</td>
                            <td>${r.worst.end}</td>
                        </tr>
                    `).join("")}
                    </tbody>
                </table>
                </div>

                <div class="notice">
                    <b>هشدار مهندسی</b>
                    <p>
                        این کنترل مقدماتی است. ظرفیت خمشی بر اساس
                        FySx تخمین زده شده و کمانش جانبی‌پیچشی،
                        کمانش موضعی، محور ضعیف در اندرکنش،
                        اثرات مرتبه دوم و الزامات کامل مبحث دهم
                        هنوز کنترل نشده‌اند.
                    </p>
                    <p>
                        برای تیرورق نامتقارن، ظرفیت خمشی بالا و پایین
                        ممکن است متفاوت باشد. این گزارش تأیید طراحی اجرایی نیست.
                    </p>
                </div>
            `;

        } catch (e) {
            out.innerHTML = `
                <div class="notice">خطا: ${e.message}</div>
            `;
        }
    }

    function init() {
        if ($("interactionPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "interactionPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل مقدماتی اندرکنش اعضا</h3>
            </div>

            <button id="btnInteraction"
                class="btn primary" type="button">
                محاسبه نسبت اندرکنش N-M
            </button>

            <div id="interactionResults"></div>
        `;

        const design = $("memberDesignPanel");

        if (design && design.parentNode) {
            design.parentNode.insertBefore(panel, design.nextSibling);
        } else {
            document.querySelector("main")?.appendChild(panel);
        }

        $("btnInteraction").addEventListener("click", run);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();