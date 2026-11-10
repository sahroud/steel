
/* SAHROUD STEEL - Roof Longitudinal Ties Module 1.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const defaults = {
        rows: 2,
        area: 500,
        imin: 100000,
        fy: 240,
        e: 200000,
        k: 1
    };

    function getNumber(id) {
        const el = $(id);
        return el ? Number(el.value) : NaN;
    }

    function fmt(value, digits = 2) {
        if (!Number.isFinite(value)) return "نامشخص";

        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function createPanel() {
        if ($("roofTiesPanel")) return;

        const panel = document.createElement("section");
        panel.id = "roofTiesPanel";
        panel.className = "panel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>۱۲ ـ طراحی مقدماتی قیدهای طولی سقف</h3>
                <span class="status">محاسبه مستقل</span>
            </div>

            <div class="notice">
                این بخش برای قیدهایی است که در امتداد طول سوله
                و بین قاب‌های اصلی قرار می‌گیرند.
                مشخصات هر ردیف قید به‌صورت معادل و مقدماتی محاسبه می‌شود.
            </div>

            <h4>مشخصات هندسی و تعداد قیدها</h4>

            <div class="form-grid">
                <div class="field">
                    <label>تعداد ردیف قید طولی سقف</label>
                    <input id="roofTieRows" type="number"
                        min="1" max="20" step="1" value="2">
                </div>

                <div class="field">
                    <label>فاصله قاب‌ها (متر)</label>
                    <input id="roofTieLength" type="number"
                        min="0.1" step="0.1" value="5">
                </div>

                <div class="field">
                    <label>مساحت مقطع قید A (mm²)</label>
                    <input id="roofTieArea" type="number"
                        min="1" step="1" value="500">
                </div>

                <div class="field">
                    <label>ممان اینرسی ضعیف Imin (mm⁴)</label>
                    <input id="roofTieImin" type="number"
                        min="1" step="100" value="100000">
                </div>
            </div>

            <h4>مشخصات مصالح</h4>

            <div class="form-grid">
                <div class="field">
                    <label>تنش تسلیم Fy (MPa)</label>
                    <input id="roofTieFy" type="number"
                        min="1" step="1" value="240">
                </div>

                <div class="field">
                    <label>مدول الاستیسیته E (MPa)</label>
                    <input id="roofTieE" type="number"
                        min="1" step="1000" value="200000">
                </div>

                <div class="field">
                    <label>ضریب طول مؤثر K</label>
                    <input id="roofTieK" type="number"
                        min="0.1" step="0.1" value="1">
                </div>
            </div>

            <div class="notice">
                سطح مقطع، ممان اینرسی و مشخصات مصالح باید از مقطع واقعی
                قید استخراج شوند. مقدار K=1 صرفاً فرض اولیه محاسبه است
                و باید با شرایط اتصال و مهاربندی واقعی کنترل شود.
            </div>

            <div class="button-grid">
                <button id="btnCalculateRoofTies"
                    class="btn primary" type="button">
                    محاسبه سختی و ظرفیت قیدهای سقف
                </button>
            </div>

            <div id="roofTiesResults" class="notice">
                اطلاعات قیدها را وارد و محاسبه کنید.
            </div>

            <div id="roofTiesWarning" class="notice">
                هنوز محاسبه‌ای انجام نشده است.
            </div>
        `;

        const main = document.querySelector("main");

        if (main) {
            main.appendChild(panel);
        }

        $("btnCalculateRoofTies").addEventListener(
            "click",
            calculate
        );

        const spacing = $("spacing");

        if (spacing) {
            spacing.addEventListener("input", syncLength);
            spacing.addEventListener("change", syncLength);
        }

        syncLength();
    }

    function syncLength() {
        const spacing = getNumber("spacing");
        const field = $("roofTieLength");

        if (field && Number.isFinite(spacing) && spacing > 0) {
            field.value = spacing;
        }
    }

    function readData() {
        return {
            rows: getNumber("roofTieRows"),
            length: getNumber("roofTieLength"),
            area: getNumber("roofTieArea"),
            imin: getNumber("roofTieImin"),
            fy: getNumber("roofTieFy"),
            e: getNumber("roofTieE"),
            k: getNumber("roofTieK")
        };
    }

    function validate(d) {
        const fields = [
            ["تعداد ردیف‌ها", d.rows],
            ["طول قید", d.length],
            ["مساحت مقطع", d.area],
            ["ممان اینرسی", d.imin],
            ["تنش تسلیم", d.fy],
            ["مدول الاستیسیته", d.e],
            ["ضریب K", d.k]
        ];

        for (const item of fields) {
            if (!Number.isFinite(item[1]) || item[1] <= 0) {
                return item[0] + " باید بزرگ‌تر از صفر باشد.";
            }
        }

        if (!Number.isInteger(d.rows) || d.rows > 20) {
            return "تعداد ردیف‌ها باید عدد صحیح بین ۱ و ۲۰ باشد.";
        }

        if (d.imin / d.area <= 0) {
            return "مشخصات مقطع معتبر نیست.";
        }

        return "";
    }

    function calculate() {
        const d = readData();
        const error = validate(d);

        if (error) {
            $("roofTiesResults").textContent = error;
            $("roofTiesWarning").textContent =
                "محاسبه انجام نشد.";
            return;
        }

        // تبدیل واحدها:
        // E: N/mm²
        // A: mm²
        // L: mm
        // I: mm⁴

        const L = d.length * 1000;
        const r = Math.sqrt(d.imin / d.area);
        const slenderness = d.k * L / r;

        // سختی محوری هر قطعه قید:
        // N/mm از نظر عددی برابر kN/m است.
        const axialStiffness = d.e * d.area / L;

        // ظرفیت تسلیم کششی اسمی، بدون ضریب کاهش
        const tensionCapacity = d.fy * d.area / 1000;

        // ظرفیت بحرانی اویلر برای کمانش خمشی حول محور ضعیف
        const eulerCapacity =
            Math.PI * Math.PI * d.e * d.imin /
            Math.pow(d.k * L, 2) / 1000;

        // کران ساده ظرفیت فشاری:
        // این مقدار ظرفیت طراحی نهایی آیین‌نامه‌ای نیست.
        const compressionUpperBound = Math.min(
            tensionCapacity,
            eulerCapacity
        );

        // مجموع سختی ردیف‌ها فقط در حالت اتصال موازی و
        // تغییرمکان یکسان، به‌صورت نظری قابل جمع است.
        const totalStiffness =
            axialStiffness * d.rows;

        const result = {
            data: d,
            radius: r,
            slenderness,
            axialStiffness,
            totalStiffness,
            tensionCapacity,
            eulerCapacity,
            compressionUpperBound
        };

        window.SteelRoofTies.lastResult = result;

        $("roofTiesResults").innerHTML = `
            <h4>نتایج محاسبات مقدماتی</h4>

            <div class="result-card">
                <span>شعاع ژیراسیون ضعیف r</span>
                <strong>${fmt(r, 2)} mm</strong>
            </div>

            <div class="result-card">
                <span>نسبت لاغری KL/r</span>
                <strong>${fmt(slenderness, 2)}</strong>
            </div>

            <div class="result-card">
                <span>سختی محوری هر قطعه EA/L</span>
                <strong>${fmt(axialStiffness, 2)} kN/m</strong>
            </div>

            <div class="result-card">
                <span>مجموع نظری سختی ردیف‌ها</span>
                <strong>${fmt(totalStiffness, 2)} kN/m</strong>
            </div>

            <div class="result-card">
                <span>ظرفیت کششی اسمی FyA</span>
                <strong>${fmt(tensionCapacity, 2)} kN</strong>
            </div>

            <div class="result-card">
                <span>بار بحرانی اویلر</span>
                <strong>${fmt(eulerCapacity, 2)} kN</strong>
            </div>

            <div class="result-card">
                <span>کران ساده ظرفیت فشاری</span>
                <strong>${fmt(compressionUpperBound, 2)} kN</strong>
            </div>
        `;

        $("roofTiesWarning").innerHTML = `
            <b>محدودیت‌های محاسبه:</b>
            <ul>
                <li>
                    ظرفیت کششی، مقدار اسمی FyA است و ضریب کاهش مقاومت
                    در آن اعمال نشده است.
                </li>
                <li>
                    بار بحرانی اویلر به‌تنهایی ظرفیت طراحی فشاری
                    آیین‌نامه‌ای محسوب نمی‌شود.
                </li>
                <li>
                    کمانش موضعی، پیچشی، رفتار مقطع سردنوردشده،
                    اتصالات و سختی واقعی گره‌ها هنوز کنترل نشده‌اند.
                </li>
                <li>
                    مجموع سختی ردیف‌ها فقط در صورت سازگاری تغییرمکان
                    و آرایش اتصال قابل استفاده است.
                </li>
                <li>
                    این نتایج هنوز برای کاهش طول مهارنشده رفتر
                    یا تغییر ضریب K استفاده نمی‌شوند.
                </li>
            </ul>
            <b>وضعیت:</b>
            محاسبات مقدماتی انجام شد؛ تأیید کفایت مهار نیازمند
            تعیین نیروی طراحی و بررسی اتصال و سیستم سه‌بعدی است.
        `;

        return result;
    }

    function getData() {
        return readData();
    }

    function setData(data) {
        if (!data || typeof data !== "object") return;

        const map = {
            rows: "roofTieRows",
            length: "roofTieLength",
            area: "roofTieArea",
            imin: "roofTieImin",
            fy: "roofTieFy",
            e: "roofTieE",
            k: "roofTieK"
        };

        Object.entries(map).forEach(([key, id]) => {
            const el = $(id);

            if (
                el &&
                data[key] !== undefined &&
                Number.isFinite(Number(data[key]))
            ) {
                el.value = data[key];
            }
        });
    }

    window.SteelRoofTies = {
        calculate,
        getData,
        setData,
        readData,
        lastResult: null
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
