
/* SAHROUD STEEL - Preliminary Shear Check */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function fmt(v) {
        return Number(v || 0).toLocaleString("fa-IR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getShearCapacity(member) {
        const sec = window.SteelSections.getDataSI();
        const mat = sec.material;

        const prefix = member === "column"
            ? "colGirder"
            : "rafGirder";

        const hw = Number($(prefix + "WebH")?.value);
        const tw = Number($(prefix + "WebT")?.value);

        if (!(hw > 0 && tw > 0 &&
              mat.Fy > 0 && mat.E > 0)) {
            throw new Error(
                "ابعاد جان و مشخصات فولاد معتبر نیست."
            );
        }

        // تبدیل میلی‌متر به متر
        const h = hw / 1000;
        const t = tw / 1000;

        const Aw = h * t;
        const ratio = h / t;

        const limit = 2.24 * Math.sqrt(mat.E / mat.Fy);

        let Cv;

        if (ratio <= limit) {
            Cv = 1;
        } else {
            const kv = 5.34;

            Cv =
                1.10 *
                Math.sqrt(kv * mat.E / mat.Fy) /
                ratio;
        }

        Cv = Math.min(1, Cv);

        // ظرفیت اسمی برشی تقریبی
        const Vn = 0.6 * mat.Fy * Aw * Cv;

        // ضریب مقاومت مقدماتی
        const phiVn = Vn;

        return {
            Aw,
            ratio,
            Cv,
            Vn: Vn / 1000,
            phiVn: phiVn / 1000
        };
    }

    function run() {
        const out = $("shearResults");

        try {
            if (!window.SteelAnalysis ||
                !Array.isArray(
                    window.SteelAnalysis.combinationResults
                ) ||
                !window.SteelAnalysis.combinationResults.length) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            if (!window.SteelSections ||
                !window.SteelGirder) {
                throw new Error(
                    "ماژول مقاطع یا تیرورق بارگذاری نشده است."
                );
            }

            const cases =
                window.SteelAnalysis.combinationResults;

            const names = [
                "ستون چپ",
                "ستون راست",
                "رفتر چپ",
                "رفتر راست"
            ];

            const results = [];

            names.forEach(name => {
                const type = name.includes("ستون")
                    ? "column"
                    : "rafter";

                const capacity = getShearCapacity(type);

                let worst = {
                    V: 0,
                    ratio: 0,
                    combination: "—",
                    end: "—"
                };

                cases.forEach(item => {
                    (item.members || []).forEach(member => {
                        if (member.name !== name) return;

                        const ends = [
                            {
                                V: Number(member.shearStart),
                                end: "ابتدا"
                            },
                            {
                                V: Number(member.shearEnd),
                                end: "انتها"
                            }
                        ];

                        ends.forEach(f => {
                            if (!Number.isFinite(f.V)) return;

                            const V = Math.abs(f.V);

                            const ratio =
                                capacity.phiVn > 0
                                    ? V / capacity.phiVn
                                    : Infinity;

                            if (ratio > worst.ratio) {
                                worst = {
                                    V,
                                    ratio,
                                    combination: item.name,
                                    end: f.end
                                };
                            }
                        });
                    });
                });

                results.push({
                    name,
                    capacity,
                    worst
                });
            });

            out.innerHTML = `
                <h4>نتایج کنترل مقدماتی برش</h4>

                <div style="overflow-x:auto">
                    <table style="width:100%;min-width:750px">
                        <thead>
                            <tr>
                                <th>عضو</th>
                                <th>Aw (m²)</th>
                                <th>Cv</th>
                                <th>φVn تقریبی (kN)</th>
                                <th>Vu (kN)</th>
                                <th>Vu/φVn</th>
                                <th>نتیجه</th>
                                <th>ترکیب حاکم</th>
                                <th>محل</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${results.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td>${fmt(r.capacity.Aw)}</td>
                                    <td>${fmt(r.capacity.Cv)}</td>
                                    <td>${fmt(r.capacity.phiVn)}</td>
                                    <td>${fmt(r.worst.V)}</td>
                                    <td>${fmt(r.worst.ratio)}</td>
                                    <td>
                                        ${
                                            r.worst.ratio <= 1
                                                ? "قبول مقدماتی"
                                                : "نیاز به بررسی"
                                        }
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
                        این کنترل فقط تخمین مقدماتی مقاومت برشی جان
                        بر اساس ابعاد واردشده است.
                    </p>
                    <p>
                        اثر سوراخ‌ها، بازشوها، سخت‌کننده‌ها،
                        کمانش موضعی کامل، شرایط واقعی تیرورق،
                        ضوابط مبحث دهم و سایر الزامات طراحی
                        هنوز کنترل نشده‌اند.
                    </p>
                    <p>
                        نتیجه قبول مقدماتی به معنی تأیید طراحی
                        اجرایی یا ایمنی سازه نیست.
                    </p>
        `;
        } catch (error) {
            out.innerHTML = `
                <div class="notice">
                    خطا: ${error.message}
                </div>
            `;
        }
    }

    function init() {
        if ($("shearPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "shearPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل مقدماتی مقاومت برشی اعضا</h3>
            </div>

            <button id="btnShear"
                class="btn primary" type="button">
                محاسبه کنترل برش
            </button>

            <div id="shearResults"></div>
        `;

        const interaction = $("interactionPanel");

        if (interaction && interaction.parentNode) {
            interaction.parentNode.insertBefore(
                panel,
                interaction.nextSibling
            );
        } else {
            document.querySelector("main")?.appendChild(panel);
        }

        $("btnShear").addEventListener("click", run);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
