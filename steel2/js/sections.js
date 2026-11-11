/* SAHROUD STEEL - Material and Section Properties 3.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function createPanel() {
        if ($("steelSectionsPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "steelSectionsPanel";

        function memberFields(prefix, title) {
            return `
                <hr>
                <h4>${title}</h4>
                <div class="form-grid">
                    <div class="field">
                        <label for="${prefix}Profile">نام مقطع</label>
                        <input id="${prefix}Profile" type="text"
                            placeholder="تیرورق یا IPE">
                    </div>
                    <div class="field">
                        <label for="${prefix}A">مساحت A (cm²)</label>
                        <input id="${prefix}A" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}Ix">ممان اینرسی Ix (cm⁴)</label>
                        <input id="${prefix}Ix" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}Iy">ممان اینرسی Iy (cm⁴)</label>
                        <input id="${prefix}Iy" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}SxTop">مدول مقطع بالا Sx (cm³)</label>
                        <input id="${prefix}SxTop" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}SxBottom">مدول مقطع پایین Sx (cm³)</label>
                        <input id="${prefix}SxBottom" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}Sy">مدول مقطع محور ضعیف Sy (cm³)</label>
                        <input id="${prefix}Sy" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                </div>
            `;
        }

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

            ${memberFields("column", "ب ـ مشخصات مقطع ستون‌ها")}
            ${memberFields("rafter", "ج ـ مشخصات مقطع رفترها")}

            <div class="notice">
                برای تیرورق جوشی، مدول‌های مقطع به‌صورت خودکار
                از ابعاد ورق‌ها محاسبه و منتقل می‌شوند.
                برای مقاطع آماده باید مشخصات معتبر آن‌ها وارد شود.
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

    function readMember(prefix) {
        return {
            profile: $(prefix + "Profile").value.trim(),
            A_cm2: Number($(prefix + "A").value),
            Ix_cm4: Number($(prefix + "Ix").value),
            Iy_cm4: Number($(prefix + "Iy").value),
            SxTop_cm3: Number($(prefix + "SxTop").value),
            SxBottom_cm3: Number($(prefix + "SxBottom").value),
            Sy_cm3: Number($(prefix + "Sy").value)
        };
    }

    function read() {
        return {
            material: {
                grade: $("steelGrade").value.trim(),
                E_GPa: Number($("steelE").value),
                Fy_MPa: Number($("steelFy").value)
            },
            column: readMember("column"),
            rafter: readMember("rafter")
        };
    }

    function convertMemberToSI(member) {
        return {
            profile: member.profile,
            A: member.A_cm2 * 1e-4,
            Ix: member.Ix_cm4 * 1e-8,
            Iy: member.Iy_cm4 * 1e-8,
            SxTop: member.SxTop_cm3 * 1e-6,
            SxBottom: member.SxBottom_cm3 * 1e-6,
            Sy: member.Sy_cm3 * 1e-6
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
            column: convertMemberToSI(d.column),
            rafter: convertMemberToSI(d.rafter)
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
            columnSxTop: data.column?.SxTop_cm3,
            columnSxBottom: data.column?.SxBottom_cm3,
            columnSy: data.column?.Sy_cm3,

            rafterProfile: data.rafter?.profile,
            rafterA: data.rafter?.A_cm2,
            rafterIx: data.rafter?.Ix_cm4,
            rafterIy: data.rafter?.Iy_cm4,
            rafterSxTop: data.rafter?.SxTop_cm3,
            rafterSxBottom: data.rafter?.SxBottom_cm3,
            rafterSy: data.rafter?.Sy_cm3
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
            if (!firstInvalid) firstInvalid = $(id);
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

        function validateMember(prefix, member, title) {
            check(prefix + "Profile", !!member.profile,
                "نام مقطع " + title + " را وارد کنید.");

            const properties = [
                ["A_cm2", "A", "مساحت"],
                ["Ix_cm4", "Ix", "ممان اینرسی Ix"],
                ["Iy_cm4", "Iy", "ممان اینرسی Iy"],
                ["SxTop_cm3", "SxTop", "مدول مقطع بالایی Sx"],
                ["SxBottom_cm3", "SxBottom", "مدول مقطع پایینی Sx"],
                ["Sy_cm3", "Sy", "مدول مقطع محور ضعیف Sy"]
            ];

            properties.forEach(([key, suffix, label]) => {
                check(
                    prefix + suffix,
                    Number.isFinite(member[key]) && member[key] > 0,
                    label + " " + title + " معتبر نیست."
                );
            });
        }

        validateMember("column", d.column, "ستون");
        validateMember("rafter", d.rafter, "رفتر");

        const message = $("sectionMessage");

        if (message) {
            if (errors.length) {
                message.textContent =
                    "اطلاعات ناقص یا نامعتبر است: " + errors.join(" ");
                message.style.color = "#b45309";
            } else {
                message.textContent =
                    "اطلاعات مصالح و مشخصات هندسی مقاطع کامل است. " +
                    "صحت مقادیر باید با مدارک واقعی مقطع تطبیق داده شود.";
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

    function validateForFrameAnalysis() {
        // تحلیل خطی قاب فقط به E، سطح مقطع A و ممان اینرسی خمشی Ix نیاز دارد.
        // نام مقطع، Fy، Iy و مدول‌های مقطع برای این مرحله ورودی اجباری نیستند.
        const d = read();
        const required = [
            ["steelE", d.material.E_GPa, "مدول الاستیسیته فولاد"],
            ["columnA", d.column.A_cm2, "مساحت مقطع ستون"],
            ["columnIx", d.column.Ix_cm4, "ممان اینرسی Ix ستون"],
            ["rafterA", d.rafter.A_cm2, "مساحت مقطع رفتر"],
            ["rafterIx", d.rafter.Ix_cm4, "ممان اینرسی Ix رفتر"]
        ];

        const missing = required.find(item =>
            !Number.isFinite(item[1]) || item[1] <= 0
        );

        const message = $("sectionMessage");
        if (missing) {
            if (message) {
                message.textContent = "برای تحلیل قاب، " + missing[2] +
                    " باید با مقدار معتبر و واحد درست وارد شود.";
                message.style.color = "#b45309";
            }
            const field = $(missing[0]);
            if (field) {
                field.focus();
                field.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return false;
        }

        if (message) {
            message.textContent = "ورودی‌های لازم برای تحلیل اولیه قاب کامل است؛ نام مقطع و سایر مشخصات برای کنترل‌های بعدی قابل تکمیل‌اند.";
            message.style.color = "#15803d";
        }
        return true;
    }

    function installAnalysisChecks() {
        const buttonIds = ["btnCalculate", "btnCombinations"];

        buttonIds.forEach(id => {
            const button = $(id);
            if (!button || button.dataset.sectionCheckInstalled) return;

            button.dataset.sectionCheckInstalled = "true";
            button.addEventListener("click", function (event) {
                if (!validateForFrameAnalysis()) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    const message = $("analysisMessage");
                    const sectionMessage = $("sectionMessage");
                    const explanation = sectionMessage ? sectionMessage.textContent : "ورودی‌های لازم برای تحلیل قاب ناقص است.";
                    if (message) {
                        message.textContent = "⛔ تحلیل شروع نشد: " + explanation;
                        message.style.color = "#b45309";
                        message.scrollIntoView({ behavior: "smooth", block: "center" });
                    }

                    const panel = $("steelSectionsPanel");
                    const details = panel && panel.querySelector("details");
                    if (details) details.open = true;
                    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
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
        validateForFrameAnalysis,
        init
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();