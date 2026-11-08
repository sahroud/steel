
/* SAHROUD STEEL - Welded Plate Girder Calculator 1.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const DENSITY = 7850; // kg/m3

    function createPanel() {
        if ($("girderPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "girderPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>محاسبه‌گر هندسی تیرورق</h3>
            </div>

            <div class="notice">
                ابعاد ورق‌ها را بر حسب میلی‌متر وارد کنید.
                این ابزار مشخصات هندسی یک مقطع I شکل جوشی
                با جان و بال‌های ثابت را محاسبه می‌کند.
            </div>

            <h4>۱ ـ مشخصات جان تیرورق</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="girderWebH">ارتفاع خالص جان (mm)</label>
                    <input id="girderWebH" type="number"
                        min="1" step="1" value="500">
                </div>

                <div class="field">
                    <label for="girderWebT">ضخامت جان (mm)</label>
                    <input id="girderWebT" type="number"
                        min="1" step="0.5" value="8">
                </div>
            </div>

            <hr>

            <h4>۲ ـ بال پایینی</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="girderBottomB">عرض بال پایینی (mm)</label>
                    <input id="girderBottomB" type="number"
                        min="1" step="1" value="200">
                </div>

                <div class="field">
                    <label for="girderBottomT">ضخامت بال پایینی (mm)</label>
                    <input id="girderBottomT" type="number"
                        min="1" step="0.5" value="12">
                </div>
            </div>

            <hr>

            <h4>۳ ـ بال بالایی</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="girderTopB">عرض بال بالایی (mm)</label>
                    <input id="girderTopB" type="number"
                        min="1" step="1" value="200">
                </div>

                <div class="field">
                    <label for="girderTopT">ضخامت بال بالایی (mm)</label>
                    <input id="girderTopT" type="number"
                        min="1" step="0.5" value="12">
                </div>
            </div>

            <div class="button-grid">
                <button id="btnCalculateGirder"
                    class="btn primary" type="button">
                    محاسبه مشخصات تیرورق
                </button>
            </div>

            <div id="girderMessage" class="notice">
                ابعاد اولیه نمونه هستند. برای محاسبه،
                دکمه بالا را انتخاب کنید.
            </div>

            <div id="girderResults"></div>

            <div class="notice">
                توجه: جوش، شعاع گوشه، سخت‌کننده‌ها، کمانش موضعی،
                تنش‌های پسماند و اثرات ساخت در این محاسبه منظور نشده‌اند.
            </div>
        `;

        const main = document.querySelector("main");
        const drawingPanel = Array.from(
            main.querySelectorAll(".panel")
        ).find(item => {
            const h = item.querySelector("h3");
            return h && h.textContent.includes("۵");
        });

        if (drawingPanel) {
            main.insertBefore(panel, drawingPanel);
        } else {
            main.appendChild(panel);
        }

        $("btnCalculateGirder").addEventListener(
            "click",
            calculate
        );
    }

    function readDimensions() {
        return {
            hw: Number($("girderWebH").value),
            tw: Number($("girderWebT").value),
            bb: Number($("girderBottomB").value),
            tb: Number($("girderBottomT").value),
            bt: Number($("girderTopB").value),
            tt: Number($("girderTopT").value)
        };
    }

    function calculateProperties(d) {
        const values = Object.values(d);

        if (values.some(v => !Number.isFinite(v) || v <= 0)) {
            throw new Error("تمام ابعاد باید بزرگ‌تر از صفر باشند.");
        }

        if (d.tw > d.bb || d.tw > d.bt) {
            throw new Error("ضخامت جان نباید از عرض بال‌ها بیشتر باشد.");
        }

        // ابعاد از میلی‌متر به متر
        const hw = d.hw / 1000;
        const tw = d.tw / 1000;
        const bb = d.bb / 1000;
        const tb = d.tb / 1000;
        const bt = d.bt / 1000;
        const tt = d.tt / 1000;

        // مساحت اجزای مقطع
        const Ab = bb * tb;
        const Aw = tw * hw;
        const At = bt * tt;

        const A = Ab + Aw + At;

        // مختصات مرکز هر جزء از پایین مقطع
        const yb = tb / 2;
        const yw = tb + hw / 2;
        const yt = tb + hw + tt / 2;

        const yBar = (
            Ab * yb +
            Aw * yw +
            At * yt
        ) / A;

        // ممان اینرسی حول محور افقی گذرنده از مرکز سطح
        const IxBottom = bb * Math.pow(tb, 3) / 12;
        const IxWeb = tw * Math.pow(hw, 3) / 12;
        const IxTop = bt * Math.pow(tt, 3) / 12;

        const Ix =
            IxBottom + Ab * Math.pow(yb - yBar, 2) +
            IxWeb + Aw * Math.pow(yw - yBar, 2) +
            IxTop + At * Math.pow(yt - yBar, 2);

        // ممان اینرسی حول محور قائم
        const Iy =
            tb * Math.pow(bb, 3) / 12 +
            hw * Math.pow(tw, 3) / 12 +
            tt * Math.pow(bt, 3) / 12;

        const totalHeight = hw + tb + tt;
        const massPerMeter = A * DENSITY;

        return {
            A,
            Ix,
            Iy,
            yBar,
            totalHeight,
            massPerMeter
        };
    }

    function format(value, digits = 3) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function calculate() {
        try {
            const d = readDimensions();
            const p = calculateProperties(d);

            $("girderMessage").textContent =
                "محاسبه هندسی با موفقیت انجام شد.";

            $("girderMessage").style.color = "#15803d";

            $("girderResults").innerHTML = `
                <h4>نتایج مشخصات مقطع</h4>

                <div class="result-card">
                    <span>مساحت مقطع A</span>
                    <strong>${format(p.A * 1e4, 2)} cm²</strong>
                </div>

                <div class="result-card">
                    <span>ممان اینرسی Ix</span>
                    <strong>${format(p.Ix * 1e8, 2)} cm⁴</strong>
                </div>

                <div class="result-card">
                    <span>ممان اینرسی Iy</span>
                    <strong>${format(p.Iy * 1e8, 2)} cm⁴</strong>
                </div>

                <div class="result-card">
                    <span>ارتفاع کل مقطع</span>
                    <strong>${format(p.totalHeight * 1000, 1)} mm</strong>
                </div>

                <div class="result-card">
                    <span>مرکز سطح از زیر بال پایینی</span>
                    <strong>${format(p.yBar * 1000, 2)} mm</strong>
                </div>

                <div class="result-card">
                    <span>وزن تقریبی هر متر</span>
                    <strong>${format(p.massPerMeter, 2)} kg/m</strong>
                </div>
            `;

            window.SteelGirder.lastResult = {
                dimensions: d,
                properties: p
            };

        } catch (error) {
            $("girderMessage").textContent =
                "خطا: " + error.message;

            $("girderMessage").style.color = "#b45309";
            $("girderResults").innerHTML = "";
        }
    }

    window.SteelGirder = {
        readDimensions,
        calculateProperties,
        calculate
    };

    function init() {
        createPanel();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
