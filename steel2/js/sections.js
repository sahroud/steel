
/* SAHROUD STEEL - Material and Section Properties 2.2 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function createPanel() {
        if ($("steelSectionsPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "steelSectionsPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>۴ ـ مشخصات مصالح و مقاطع فولادی</h3>
            </div>

            <div class="notice">
                مشخصات را از نقشه اجرایی یا مدارک معتبر کارخانه وارد کنید.
                مقادیر اولیه نمونه هستند و تأیید طراحی محسوب نمی‌شوند.
            </div>

            <h4>الف ـ مشخصات فولاد</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="steelGrade">نوع فولاد</label>
                    <input id="steelGrade" type="text"
                        value="ST37 / مقدار نیازمند تأیید">
                </div>

                <div class="field">
                    <label for="steelE">مدول الاستیسیته E (GPa)</label>
                    <input id="steelE" type="number"
                        min="1" step="1" value="200">
                </div>

                <div class="field">
                    <label for="steelFy">تنش تسلیم Fy (MPa)</label>
                    <input id="steelFy" type="number"
                        min="1" step="1" value="235">
                </div>
            </div>

            <div class="notice">
                مقدار ۲۳۵ مگاپاسکال نمونه اولیه است.
                مقدار واقعی باید با توجه به استاندارد محصول،
                ضخامت ورق و گواهی مصالح تعیین شود.
            </div>

            <hr>

            <h4>ب ـ مقطع ستون‌ها</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="columnProfile">نام مقطع ستون</label>
                    <input id="columnProfile" type="text"
                        placeholder="تیرورق یا IPE">
                </div>

                <div class="field">
                    <label for="columnA">مساحت A (cm²)</label>
                    <input id="columnA" type="number"
                        min="0" step="0.01" value="0">
                </div>

                <div class="field">
                    <label for="columnIx">ممان اینرسی Ix (cm⁴)</label>
                    <input id="columnIx" type="number"
                        min="0" step="0.01" value="0">
                </div>

                <div class="field">
                    <label for="columnIy">ممان اینرسی Iy (cm⁴)</label>
                    <input id="columnIy" type="number"
                        min="0" step="0.01" value="0">
                </div>
            </div>

            <hr>

            <h4>ج ـ مقطع تیرهای سقف (رفتر)</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="rafterProfile">نام مقطع رفتر</label>
                    <input id="rafterProfile" type="text"
                        placeholder="تیرورق یا IPE">
                </div>

                <div class="field">
                    <label for="rafterA">مساحت A (cm²)</label>
                    <input id="rafterA" type="number"
                        min="0" step="0.01" value="0">
                </div>

                <div class="field">
                    <label for="rafterIx">ممان اینرسی Ix (cm⁴)</label>
                    <input id="rafterIx" type="number"
                        min="0" step="0.01" value="0">
                </div>

                <div class="field">
                    <label for="rafterIy">ممان اینرسی Iy (cm⁴)</label>
                    <input id="rafterIy" type="number"
                        min="0" step="0.01" value="0">
                </div>
            </div>

            <div class="notice">
                مشخصات هندسی حول هر دو محور برای کنترل‌های بعدی لازم است.
            </div>

            <div class="button-grid">
                <button id="btnCheckSections"
                    class="btn primary" type="button">
                    کنترل اطلاعات مقاطع
                </button>
            </div>

            <div id="sectionMessage" class="notice">
                هنوز مشخصات مقاطع تکمیل نشده است.
            </div>
        `;

        const panels = document.querySelectorAll("main .panel");
        let inserted = false;

        panels.forEach(item => {
            const heading = item.querySelector("h3");

            if (!inserted && heading &&
                heading.textContent.includes("۵")) {
                item.parentNode.insertBefore(panel, item);
                inserted = true;
            }
        });

        if (!inserted) {
            const main = document.querySelector("main");
            if (main) main.appendChild(panel);
        }

        $("btnCheckSections").addEventListener("click", validate);
    }

    function read() {
        return {
            material: {
                grade: $("steelGrade").value.trim(),
                E_GPa: Number($("steelE").value),
                Fy_MPa: Number($("steelFy").value)
            },

            column: {
                profile: $("columnProfile").value.trim(),
                A_cm2: Number($("columnA").value),
                Ix_cm4: Number($("columnIx").value),
                Iy_cm4: Number($("columnIy").value)
            },

            rafter: {
                profile: $("rafterProfile").value.trim(),
                A_cm2: Number($("rafterA").value),
                Ix_cm4: Number($("rafterIx").value),
                Iy_cm4: Number($("rafterIy").value)
            }
        };
    }

    function getDataSI() {
        const d = read();

        return {
            material: {
                grade: d.material.grade,
                E: d.material.E_GPa * 1e9,
                Fy: d.material.Fy_MPa * 1e6
            },

            column: {
                profile: d.column.profile,
                A: d.column.A_cm2 * 1e-4,
                Ix: d.column.Ix_cm4 * 1e-8,
                Iy: d.column.Iy_cm4 * 1e-8
            },

            rafter: {
                profile: d.rafter.profile,
                A: d.rafter.A_cm2 * 1e-4,
                Ix: d.rafter.Ix_cm4 * 1e-8,
                Iy: d.rafter.Iy_cm4 * 1e-8
            }
        };
    }

    function setData(data) {
        if (!data || typeof data !== "object") return;

        const fields = {
            steelGrade: data.material?.grade,
            steelE: data.material?.E_GPa,
            steelFy: data.material?.Fy_MPa,

            columnProfile: data.column?.profile,
            columnA: data.column?.A_cm2,
            columnIx: data.column?.Ix_cm4,
            columnIy: data.column?.Iy_cm4,

            rafterProfile: data.rafter?.profile,
            rafterA: data.rafter?.A_cm2,
            rafterIx: data.rafter?.Ix_cm4,
            rafterIy: data.rafter?.Iy_cm4
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = $(id);

            if (element && value !== undefined && value !== null) {
                element.value = value;
            }
        });
    }

    function validate() {
        const d = read();
        const errors = [];
        let firstInvalid = null;

        function check(id, condition, message) {
            if (condition) return;

            errors.push(message);

            if (!firstInvalid) {
                firstInvalid = $(id);
            }
        }

        check("steelGrade", !!d.material.grade,
            "نوع فولاد را وارد کنید.");

        check("steelE",
            Number.isFinite(d.material.E_GPa) &&
            d.material.E_GPa > 0,
            "مدول الاستیسیته معتبر نیست.");

        check("steelFy",
            Number.isFinite(d.material.Fy_MPa) &&
            d.material.Fy_MPa > 0,
            "تنش تسلیم معتبر نیست.");

        check("columnProfile", !!d.column.profile,
            "نام مقطع ستون را وارد کنید.");

        check("columnA",
            Number.isFinite(d.column.A_cm2) &&
            d.column.A_cm2 > 0,
            "مساحت مقطع ستون معتبر نیست.");

        check("columnIx",
            Number.isFinite(d.column.Ix_cm4) &&
            d.column.Ix_cm4 > 0,
            "ممان اینرسی Ix ستون معتبر نیست.");

        check("columnIy",
            Number.isFinite(d.column.Iy_cm4) &&
            d.column.Iy_cm4 > 0,
            "ممان اینرسی Iy ستون معتبر نیست.");

        check("rafterProfile", !!d.rafter.profile,
            "نام مقطع رفتر را وارد کنید.");

        check("rafterA",
            Number.isFinite(d.rafter.A_cm2) &&
            d.rafter.A_cm2 > 0,
            "مساحت مقطع رفتر معتبر نیست.");

        check("rafterIx",
            Number.isFinite(d.rafter.Ix_cm4) &&
            d.rafter.Ix_cm4 > 0,
            "ممان اینرسی Ix رفتر معتبر نیست.");

        check("rafterIy",
            Number.isFinite(d.rafter.Iy_cm4) &&
            d.rafter.Iy_cm4 > 0,
            "ممان اینرسی Iy رفتر معتبر نیست.");

        const message = $("sectionMessage");

        if (message) {
            if (errors.length) {
                message.textContent =
                    "اطلاعات ناقص یا نامعتبر است: " +
                    errors.join(" ");

                message.style.color = "#b45309";
            } else {
                message.textContent =
                    "اطلاعات مصالح و مقاطع از نظر عددی کامل است. " +
                    "صحت مشخصات باید با مدارک واقعی مقطع تطبیق داده شود.";

                message.style.color = "#15803d";
            }
        }

        if (firstInvalid) {
            firstInvalid.focus();
            firstInvalid.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        return errors.length === 0;
    }

    // جلوگیری از اجرای تحلیل در صورت ناقص بودن مقاطع
    function installAnalysisChecks() {
        const buttonIds = [
            "btnCalculate",
            "btnCombinations"
        ];

        buttonIds.forEach(id => {
            const button = $(id);
            if (!button || button.dataset.sectionCheckInstalled) return;

            button.dataset.sectionCheckInstalled = "true";

            button.addEventListener("click", function (event) {
                if (!validate()) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }, true);
        });
    }

    function init() {
        createPanel();
        installAnalysisChecks();
    }

    window.SteelSections = {
        read,
        getDataSI,
        setData,
        validate,
        init
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
