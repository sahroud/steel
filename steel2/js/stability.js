/* SAHROUD STEEL - Compression Buckling Check */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const PHI_C = 0.90;

    function createPanel() {
        if ($("stabilityPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "stabilityPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل کمانش و مقاومت فشاری اعضا</h3>
            </div>

            <div class="notice">
                محاسبه مقاومت فشاری بر اساس کمانش خمشی حول دو محور
                و با استفاده از طول‌های مهارنشده و ضرایب K واردشده انجام می‌شود.
            </div>

            <div class="button-grid">
                <button id="checkColumnBuckling" class="btn primary" type="button">
                    کنترل کمانش ستون
                </button>
                <button id="checkRafterBuckling" class="btn primary" type="button">
                    کنترل کمانش رفتر
                </button>
            </div>

            <div id="columnBucklingResults"></div>
            <div id="rafterBucklingResults"></div>

            <div id="bucklingMessage" class="notice">
                برای شروع، اطلاعات مقاطع و ضرایب طول مؤثر را وارد کنید.
            </div>

            <div class="notice">
                هشدار: این کنترل، کمانش خمشی کلی را بررسی می‌کند.
                کمانش پیچشی و خمشی‌ـ‌پیچشی، لاغری موضعی اجزا،
                اثرات مرتبه دوم و اندرکنش نیروها هنوز در این خروجی منظور نشده‌اند.
            </div>
        `;

        const main = document.querySelector("main");
        const girderPanel = $("girderPanel");

        if (girderPanel && girderPanel.parentNode) {
            girderPanel.parentNode.insertBefore(panel, girderPanel.nextSibling);
        } else if (main) {
            main.appendChild(panel);
        }

        $("checkColumnBuckling").addEventListener(
            "click", () => checkMember("column")
        );

        $("checkRafterBuckling").addEventListener(
            "click", () => checkMember("rafter")
        );
    }

    function calculateAxis(E, Fy, A, I, L, K) {
        const r = Math.sqrt(I / A);

        if (!(r > 0)) {
            throw new Error("شعاع ژیراسیون معتبر نیست.");
        }

        const slenderness = K * L / r;
        const Fe = Math.PI * Math.PI * E /
            (slenderness * slenderness);

        const limit = 4.71 * Math.sqrt(E / Fy);

        let Fcr;

        if (slenderness <= limit) {
            Fcr = Math.pow(0.658, Fy / Fe) * Fy;
        } else {
            Fcr = 0.877 * Fe;
        }

        const Pn = Fcr * A;
        const designCapacity = PHI_C * Pn;

        return {
            r,
            slenderness,
            Fe,
            Fcr,
            Pn,
            designCapacity,
            branch: slenderness <= limit
                ? "کمانش غیرالاستیک"
                : "کمانش الاستیک"
        };
    }

    function fmt(value, digits = 2) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function checkMember(member) {
        const title = member === "column" ? "ستون" : "رفتر";
        const outputId = member === "column"
            ? "columnBucklingResults"
            : "rafterBucklingResults";

        try {
            if (!window.SteelSections ||
                !window.SteelGirder) {
                throw new Error("ماژول مقاطع یا تیرورق در دسترس نیست.");
            }

            const stability =
                window.SteelGirder.readStability(member);

            const missing = [];

            ["Lx", "Ly", "Kx", "Ky"].forEach(key => {
                if (
                    stability[key] === null ||
                    stability[key] <= 0
                ) {
                    missing.push(key);
                }
            });

            if (missing.length) {
                throw new Error(
                    "ابتدا چهار مقدار Lx، Ly، Kx و Ky مربوط به " +
                    title + " را وارد کنید."
                );
            }

            const section = window.SteelSections.getDataSI();
            const material = section.material;
            const profile = section[member];

            const E = material.E;
            const Fy = material.Fy;
            const A = profile.A;
            const Ix = profile.Ix;
            const Iy = profile.Iy;

            if (
                !(E > 0 && Fy > 0 && A > 0 &&
                  Ix > 0 && Iy > 0)
            ) {
                throw new Error(
                    "مشخصات فولاد یا مقطع " + title + " معتبر نیست."
                );
            }

            const x = calculateAxis(
                E, Fy, A, Ix,
                stability.Lx, stability.Kx
            );

            const y = calculateAxis(
                E, Fy, A, Iy,
                stability.Ly, stability.Ky
            );

            const controlling =
                x.designCapacity <= y.designCapacity ? x : y;

            const controllingAxis =
                controlling === x ? "محور قوی" : "محور ضعیف";

            $(outputId).innerHTML = `
                <hr>
                <h4>نتایج کنترل کمانش ${title}</h4>

                <div class="notice">
                    <b>محور قوی</b>
                    <p>شعاع ژیراسیون rx:
                    ${fmt(x.r * 100)} cm</p>
                    <p>لاغری KxLx/rx:
                    ${fmt(x.slenderness)}</p>
                    <p>تنش کمانش الاستیک Fe:
                    ${fmt(x.Fe / 1e6)} MPa</p>
                    <p>تنش بحرانی Fcr:
                    ${fmt(x.Fcr / 1e6)} MPa</p>
                    <p>نوع کمانش:
                    ${x.branch}</p>
                    <p>مقاومت اسمی Pn:
                    ${fmt(x.Pn / 1000)} kN</p>
                    <p><b>مقاومت طراحی φPn:
                    ${fmt(x.designCapacity / 1000)} kN</b></p>
                </div>

                <div class="notice">
                    <b>محور ضعیف</b>
                    <p>شعاع ژیراسیون ry:
                    ${fmt(y.r * 100)} cm</p>
                    <p>لاغری KyLy/ry:
                    ${fmt(y.slenderness)}</p>
                    <p>تنش کمانش الاستیک Fe:
                    ${fmt(y.Fe / 1e6)} MPa</p>
                    <p>تنش بحرانی Fcr:
                    ${fmt(y.Fcr / 1e6)} MPa</p>
                    <p>نوع کمانش:
                    ${y.branch}</p>
                    <p>مقاومت اسمی Pn:
                    ${fmt(y.Pn / 1000)} kN</p>
                    <p><b>مقاومت طراحی φPn:
                    ${fmt(y.designCapacity / 1000)} kN</b></p>
                </div>

                <div class="notice">
                    <b>محور حاکم: ${controllingAxis}</b>
                    <p>مقاومت فشاری طراحی حاکم:
                    ${fmt(controlling.designCapacity / 1000)} kN</p>
                </div>
            `;

            $("bucklingMessage").textContent =
                "محاسبه کمانش خمشی " + title + " انجام شد.";

            $("bucklingMessage").style.color = "#15803d";

        } catch (error) {
            $(outputId).innerHTML = "";

            $("bucklingMessage").textContent =
                "خطا: " + error.message;

            $("bucklingMessage").style.color = "#b45309";
        }
    }

    function init() {
        createPanel();
    }

    window.SteelStability = {
        calculateAxis,
        checkMember
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();