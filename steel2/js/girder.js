/* SAHROUD STEEL - Welded Plate Girder Calculator 3.2 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const DENSITY = 7850;

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
                محاسبات مربوط به مقطع I شکل جوشی است.
            </div>

            <h4>۱ ـ مشخصات جان تیرورق</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="girderWebH">ارتفاع خالص جان (mm)</label>
                    <input id="girderWebH" type="number" min="1" step="1" value="500">
                </div>
                <div class="field">
                    <label for="girderWebT">ضخامت جان (mm)</label>
                    <input id="girderWebT" type="number" min="1" step="0.5" value="8">
                </div>
            </div>

            <hr>
            <h4>۲ ـ بال پایینی</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="girderBottomB">عرض بال پایینی (mm)</label>
                    <input id="girderBottomB" type="number" min="1" step="1" value="200">
                </div>
                <div class="field">
                    <label for="girderBottomT">ضخامت بال پایینی (mm)</label>
                    <input id="girderBottomT" type="number" min="1" step="0.5" value="12">
                </div>
            </div>

            <hr>
            <h4>۳ ـ بال بالایی</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="girderTopB">عرض بال بالایی (mm)</label>
                    <input id="girderTopB" type="number" min="1" step="1" value="200">
                </div>
                <div class="field">
                    <label for="girderTopT">ضخامت بال بالایی (mm)</label>
                    <input id="girderTopT" type="number" min="1" step="0.5" value="12">
                </div>
            </div>

            <div class="button-grid">
                <button id="btnCalculateGirder" class="btn primary" type="button">
                    محاسبه مشخصات تیرورق
                </button>
                <button id="btnTransferGirder" class="btn success" type="button">
                    انتقال به رفتر و ستون‌ها
                </button>
            </div>

            <div id="girderMessage" class="notice">
                برای شروع، محاسبه مشخصات تیرورق را انتخاب کنید.
            </div>
            <div id="girderResults"></div>

            <div class="notice">
                این ابزار مشخصات هندسی اولیه را محاسبه می‌کند.
                کنترل جوش، سخت‌کننده، کمانش موضعی و مقاومت اعضا
                در مراحل بعدی انجام خواهد شد.
            </div>
        `;

        const main = document.querySelector("main");
        if (!main) throw new Error("بخش اصلی صفحه پیدا نشد.");

        const panels = Array.from(main.querySelectorAll(".panel"));
        const drawingPanel = panels.find(item => {
            const h = item.querySelector("h3");
            return h && h.textContent.includes("۵");
        });

        if (drawingPanel) main.insertBefore(panel, drawingPanel);
        else main.appendChild(panel);

        $("btnCalculateGirder").addEventListener("click", calculate);
        $("btnTransferGirder").addEventListener("click", transferToMembers);
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

        if (d.tw >= Math.min(d.bb, d.bt)) {
            throw new Error("ضخامت جان باید از عرض هر دو بال کمتر باشد.");
        }

        const hw = d.hw / 1000;
        const tw = d.tw / 1000;
        const bb = d.bb / 1000;
        const tb = d.tb / 1000;
        const bt = d.bt / 1000;
        const tt = d.tt / 1000;

        const Ab = bb * tb;
        const Aw = tw * hw;
        const At = bt * tt;
        const A = Ab + Aw + At;

        const yb = tb / 2;
        const yw = tb + hw / 2;
        const yt = tb + hw + tt / 2;

        const yBar = (
            Ab * yb + Aw * yw + At * yt
        ) / A;

        const Ix =
            bb * Math.pow(tb, 3) / 12 +
            Ab * Math.pow(yb - yBar, 2) +
            tw * Math.pow(hw, 3) / 12 +
            Aw * Math.pow(yw - yBar, 2) +
            bt * Math.pow(tt, 3) / 12 +
            At * Math.pow(yt - yBar, 2);

        const Iy =
            tb * Math.pow(bb, 3) / 12 +
            hw * Math.pow(tw, 3) / 12 +
            tt * Math.pow(bt, 3) / 12;

        const totalHeight = hw + tb + tt;

        // مدول‌های مقطع الاستیک
        const SxTop = Ix / (totalHeight - yBar);
        const SxBottom = Ix / yBar;
        const Sy = Iy / (Math.max(bb, bt) / 2);

        const rx = Math.sqrt(Ix / A);
        const ry = Math.sqrt(Iy / A);
        const massPerMeter = A * DENSITY;

        return {
            A,
            Ix,
            Iy,
            SxTop,
            SxBottom,
            Sy,
            rx,
            ry,
            yBar,
            totalHeight,
            massPerMeter
        };
    }

    function format(value, digits = 2) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function calculate() {
        try {
            const dimensions = readDimensions();
            const p = calculateProperties(dimensions);

            window.SteelGirder.lastResult = {
                dimensions,
                properties: p
            };

            $("girderMessage").textContent =
                "محاسبه مشخصات هندسی با موفقیت انجام شد.";
            $("girderMessage").style.color = "#15803d";

            $("girderResults").innerHTML = `
                <h4>نتایج محاسبه مقطع</h4>
                <div class="result-card">
                    <span>مساحت مقطع A</span>
                    <strong>${format(p.A * 1e4)} cm²</strong>
                </div>
                <div class="result-card">
                    <span>ممان اینرسی محور قوی Ix</span>
                    <strong>${format(p.Ix * 1e8)} cm⁴</strong>
                </div>
                <div class="result-card">
                    <span>ممان اینرسی محور ضعیف Iy</span>
                    <strong>${format(p.Iy * 1e8)} cm⁴</strong>
                </div>
                <div class="result-card">
                    <span>مدول مقطع بالا Sx بالا</span>
                    <strong>${format(p.SxTop * 1e6)} cm³</strong>
                </div>
                <div class="result-card">
                    <span>مدول مقطع پایین Sx پایین</span>
                    <strong>${format(p.SxBottom * 1e6)} cm³</strong>
                </div>
                <div class="result-card">
                    <span>مدول مقطع محور ضعیف Sy</span>
                    <strong>${format(p.Sy * 1e6)} cm³</strong>
                </div>
                <div class="result-card">
                    <span>شعاع ژیراسیون محور قوی rx</span>
                    <strong>${format(p.rx * 100)} cm</strong>
                </div>
                <div class="result-card">
                    <span>شعاع ژیراسیون محور ضعیف ry</span>
                    <strong>${format(p.ry * 100)} cm</strong>
                </div>
                <div class="result-card">
                    <span>ارتفاع کل مقطع</span>
                    <strong>${format(p.totalHeight * 1000, 1)} mm</strong>
                </div>
                <div class="result-card">
                    <span>مرکز سطح از زیر بال پایینی</span>
                    <strong>${format(p.yBar * 1000)} mm</strong>
                </div>
                <div class="result-card">
                    <span>وزن تقریبی هر متر</span>
                    <strong>${format(p.massPerMeter)} kg/m</strong>
                </div>
            `;
        } catch (error) {
            $("girderMessage").textContent = "خطا: " + error.message;
            $("girderMessage").style.color = "#b45309";
            $("girderResults").innerHTML = "";
            window.SteelGirder.lastResult = null;
        }
    }

    function transferToMembers() {
        try {
            const result = window.SteelGirder.lastResult;
            if (!result || !result.properties) {
                throw new Error("ابتدا محاسبه مشخصات تیرورق را انجام دهید.");
            }

            if (!window.SteelSections) {
                throw new Error("ماژول مشخصات مقاطع بارگذاری نشده است.");
            }

            const p = result.properties;

            const values = {
                A: p.A * 1e4,
                Ix: p.Ix * 1e8,
                Iy: p.Iy * 1e8,
                SxTop: p.SxTop * 1e6,
                SxBottom: p.SxBottom * 1e6,
                Sy: p.Sy * 1e6
            };

            const targets = [
                { name: "رفتر", prefix: "rafter" },
                { name: "ستون", prefix: "column" }
            ];

            for (const item of targets) {
                const ids = [
                    item.prefix + "Profile",
                    item.prefix + "A",
                    item.prefix + "Ix",
                    item.prefix + "Iy",
                    item.prefix + "SxTop",
                    item.prefix + "SxBottom",
                    item.prefix + "Sy"
                ];

                if (ids.some(id => !$(id))) {
                    throw new Error(
                        "فیلدهای مشخصات مقطع " + item.name +
                        " پیدا نشدند. فایل sections.js را به‌روزرسانی کنید."
                    );
                }
            }

            for (const item of targets) {
                const pre = item.prefix;
                $(pre + "Profile").value = "تیرورق محاسبه‌شده";
                $(pre + "A").value = values.A.toFixed(2);
                $(pre + "Ix").value = values.Ix.toFixed(2);
                $(pre + "Iy").value = values.Iy.toFixed(2);
                $(pre + "SxTop").value = values.SxTop.toFixed(2);
                $(pre + "SxBottom").value = values.SxBottom.toFixed(2);
                $(pre + "Sy").value = values.Sy.toFixed(2);
            }

            window.SteelSections.validate();

            window.SteelGirder.transferred = {
                profile: "تیرورق محاسبه‌شده",
                ...values,
                appliedTo: ["rafter", "column"]
            };

            $("girderMessage").textContent =
                "انتقال موفق: مشخصات هندسی و مدول‌های مقطع به ستون و رفتر منتقل شد.";
            $("girderMessage").style.color = "#15803d";

        } catch (error) {
            $("girderMessage").textContent =
                "خطا در انتقال: " + error.message;
            $("girderMessage").style.color = "#b45309";
        }
    }

    function init() {
        createPanel();
    }

    window.SteelGirder = {
        readDimensions,
        calculateProperties,
        calculate,
        transferToMembers,
        lastResult: null,
        transferred: null
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();