
/* SAHROUD STEEL - Project Manager */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function getNumber(id) {
        const el = $(id);
        return el ? Number(el.value) : NaN;
    }

    function getData() {
        const data = {
            projectName: $("projectName").value.trim(),
            owner: $("owner").value.trim(),
            designer: $("designer").value.trim(),
            city: $("city").value,
            span: getNumber("span"),
            length: getNumber("length"),
            spacing: getNumber("spacing"),
            height: getNumber("height"),
            rise: getNumber("rise"),
            frames: getNumber("frames"),
            dead: getNumber("dead"),
            live: getNumber("live"),
            wind: getNumber("wind"),
            snow: getNumber("snow"),
            savedAt: new Date().toISOString(),
            software: "SAHROUD STEEL",
            version: "2.1"
        };

        // ذخیره مشخصات مصالح و مقاطع
        if (window.SteelSections) {
            data.sections = window.SteelSections.read();
        }

        return data;
    }

    function setStatus(message) {
        const el = $("projectStatus");
        if (el) el.textContent = message;
    }

    function updateFrameCount() {
        const length = getNumber("length");
        const spacing = getNumber("spacing");

        if (!Number.isFinite(length) ||
            !Number.isFinite(spacing) ||
            length <= 0 || spacing <= 0) {
            if ($("frames")) $("frames").value = "";
            return;
        }

        $("frames").value = Math.ceil(length / spacing) + 1;
    }

    function validate() {
        const d = getData();

        if (!d.projectName) {
            return "نام پروژه را وارد کنید.";
        }

        const positive = [
            ["دهانه", d.span],
            ["طول", d.length],
            ["فاصله قاب‌ها", d.spacing],
            ["ارتفاع ستون", d.height]
        ];

        for (const item of positive) {
            if (!Number.isFinite(item[1]) || item[1] <= 0) {
                return item[0] + " باید بزرگ‌تر از صفر باشد.";
            }
        }

        if (!Number.isFinite(d.rise) || d.rise < 0) {
            return "ارتفاع تاج نمی‌تواند منفی باشد.";
        }

        const loads = [
            ["بار مرده", d.dead],
            ["بار زنده", d.live],
            ["بار باد", d.wind],
            ["بار برف", d.snow]
        ];

        for (const item of loads) {
            if (!Number.isFinite(item[1]) || item[1] < 0) {
                return item[0] + " نامعتبر است.";
            }
        }

        return "";
    }

    function save() {
        const error = validate();

        if (error) {
            alert(error);
            return;
        }

        const data = getData();

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "Sahroud_Steel_Project.json";

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setStatus("پروژه و مشخصات مقاطع ذخیره شدند.");
    }

    function loadData(data) {
        if (!data || typeof data !== "object") {
            throw new Error("ساختار اطلاعات پروژه معتبر نیست.");
        }

        const fields = [
            "projectName", "owner", "designer", "city",
            "span", "length", "spacing", "height", "rise",
            "dead", "live", "wind", "snow"
        ];

        fields.forEach(id => {
            if (data[id] !== undefined && $(id)) {
                $(id).value = data[id];
            }
        });

        updateFrameCount();

        // بازیابی مصالح و مقاطع
        if (data.sections && window.SteelSections) {
            window.SteelSections.setData(data.sections);
        }

        setStatus("اطلاعات پروژه و مقاطع بارگذاری شدند.");
    }

    function loadFile(file) {
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function () {
            try {
                const data = JSON.parse(reader.result);
                loadData(data);
            } catch (error) {
                alert(
                    "خطا در بازکردن فایل پروژه: " +
                    error.message
                );
            }
        };

        reader.onerror = function () {
            alert("خواندن فایل با خطا مواجه شد.");
        };

        reader.readAsText(file, "UTF-8");
    }

    window.SteelProject = {
        getData,
        validate,
        save,
        loadFile,
        loadData,
        updateFrameCount,
        setStatus
    };

    document.addEventListener("DOMContentLoaded", function () {
        updateFrameCount();

        ["length", "spacing"].forEach(id => {
            const el = $(id);
            if (el) {
                el.addEventListener("input", updateFrameCount);
            }
        });
    });

    updateFrameCount();

})();
