/* =========================================
   SAHROUD STEEL
   Project data manager - Stage 2
========================================= */

(function () {
    "use strict";

    const VERSION = "2.0";

    const fields = [
        "projectName",
        "owner",
        "designer",
        "city",
        "span",
        "length",
        "spacing",
        "height",
        "rise",
        "frames",
        "dead",
        "live",
        "wind",
        "snow"
    ];

    function getElement(id) {
        return document.getElementById(id);
    }

    function getValue(id) {
        const el = getElement(id);
        if (!el) return "";

        return el.value;
    }

    function setValue(id, value) {
        const el = getElement(id);
        if (!el || value === undefined || value === null) return;

        el.value = value;
    }

    function numberValue(id) {
        const value = Number(getValue(id));

        return Number.isFinite(value) ? value : 0;
    }

    // محاسبه تعداد قاب‌ها
    function updateFrameCount() {

        const length = numberValue("length");
        const spacing = numberValue("spacing");

        if (length <= 0 || spacing <= 0) {
            setValue("frames", 0);
            return 0;
        }

        const count = Math.ceil(length / spacing) + 1;

        setValue("frames", count);

        return count;
    }

    // جمع‌آوری اطلاعات پروژه
    function getData() {

        updateFrameCount();

        const data = {
            application: "SAHROUD STEEL",
            version: VERSION,
            savedAt: new Date().toISOString(),
            project: {}
        };

        fields.forEach(function (id) {

            const element = getElement(id);

            if (!element) return;

            if (element.type === "number") {
                data.project[id] = numberValue(id);
            } else {
                data.project[id] = element.value;
            }

        });

        return data;
    }

    // کنترل ورودی‌های ضروری
    function validate() {

        const errors = [];

        const projectName = getValue("projectName").trim();

        if (!projectName) {
            errors.push("نام پروژه وارد نشده است.");
        }

        const span = numberValue("span");
        const length = numberValue("length");
        const spacing = numberValue("spacing");
        const height = numberValue("height");
        const rise = numberValue("rise");

        if (span <= 0) {
            errors.push("دهانه باید بیشتر از صفر باشد.");
        }

        if (length <= 0) {
            errors.push("طول سوله باید بیشتر از صفر باشد.");
        }

        if (spacing <= 0) {
            errors.push("فاصله قاب‌ها باید بیشتر از صفر باشد.");
        }

        if (height <= 0) {
            errors.push("ارتفاع ستون باید بیشتر از صفر باشد.");
        }

        if (rise < 0) {
            errors.push("ارتفاع تاج نمی‌تواند منفی باشد.");
        }

        if (rise >= height * 2) {
            errors.push("ارتفاع تاج واردشده غیرعادی است؛ مقدار را بررسی کنید.");
        }

        ["dead", "live", "wind", "snow"].forEach(function (id) {
            if (numberValue(id) < 0) {
                errors.push("مقادیر بارگذاری نباید منفی باشند.");
            }
        });

        if (errors.length > 0) {
            return {
                valid: false,
                errors: errors
            };
        }

        return {
            valid: true,
            errors: []
        };
    }

    // نمایش وضعیت پروژه
    function setStatus(message) {

        const status = getElement("projectStatus");

        if (status) {
            status.textContent = message;
        }
    }

    // ذخیره فایل JSON
    function save() {

        const check = validate();

        if (!check.valid) {
            alert(check.errors.join("\n"));
            return false;
        }

        const data = getData();

        const json = JSON.stringify(data, null, 2);

        const blob = new Blob(
            [json],
            { type: "application/json;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        const safeName = String(
            data.project.projectName || "project"
        ).replace(/[\\/:*?"<>|]/g, "_");

        link.href = url;
        link.download = safeName + ".json";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);

        setStatus("پروژه ذخیره شد: " + safeName);

        return true;
    }

    // بازیابی اطلاعات فایل JSON
    function loadFile(file) {

        if (!file) return false;

        const reader = new FileReader();

        reader.onload = function (event) {

            try {

                const data = JSON.parse(event.target.result);

                if (
                    !data ||
                    !data.project ||
                    typeof data.project !== "object"
                ) {
                    throw new Error("ساختار فایل پروژه معتبر نیست.");
                }

                fields.forEach(function (id) {

                    if (
                        Object.prototype.hasOwnProperty.call(
                            data.project,
                            id
                        )
                    ) {
                        setValue(id, data.project[id]);
                    }

                });

                updateFrameCount();

                setStatus(
                    "پروژه بازیابی شد: " +
                    (data.project.projectName || "بدون نام")
                );

                alert("اطلاعات پروژه با موفقیت بازیابی شد.");

                document.dispatchEvent(
                    new CustomEvent("steel:projectLoaded", {
                        detail: data
                    })
                );

            } catch (error) {

                alert(
                    "خطا در بازکردن فایل:\n" +
                    error.message
                );

            }

        };

        reader.onerror = function () {
            alert("خواندن فایل با خطا مواجه شد.");
        };

        reader.readAsText(file, "UTF-8");

        return true;
    }

    // دسترسی سایر فایل‌های برنامه به توابع پروژه
    window.SteelProject = {

        version: VERSION,

        getData: getData,

        validate: validate,

        save: save,

        loadFile: loadFile,

        updateFrameCount: updateFrameCount,

        setStatus: setStatus

    };

    // به‌روزرسانی تعداد قاب‌ها هنگام تغییر طول یا فاصله
    document.addEventListener("DOMContentLoaded", function () {

        ["length", "spacing"].forEach(function (id) {

            const el = getElement(id);

            if (el) {
                el.addEventListener("input", updateFrameCount);
            }

        });

        updateFrameCount();

    });

})();