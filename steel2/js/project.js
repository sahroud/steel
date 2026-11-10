
/* SAHROUD STEEL - Project Manager 2.9 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function getNumber(id) {
        const el = $(id);
        return el ? Number(el.value) : NaN;
    }

    function getBaseConnection() {
        const el = $("baseConnection");
        if (!el) return "pinned";
        return el.value === "fixed" ? "fixed" : "pinned";
    }

    function getData() {
        const data = {
            projectName: $("projectName") ? $("projectName").value.trim() : "",
            owner: $("owner") ? $("owner").value.trim() : "",
            designer: $("designer") ? $("designer").value.trim() : "",
            city: $("city") ? $("city").value : "",
            baseConnection: getBaseConnection(),

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
            version: "2.9"
        };

        if (window.SteelLoads &&
            typeof window.SteelLoads.getData === "function") {
            data.loads = window.SteelLoads.getData();
        }

        if (window.SteelSections &&
            typeof window.SteelSections.read === "function") {
            data.sections = window.SteelSections.read();
        }

        if (window.SteelOpenings &&
            typeof window.SteelOpenings.getData === "function") {
            data.openings = window.SteelOpenings.getData();
        }

        if (window.SteelGirder &&
            typeof window.SteelGirder.getData === "function") {
            data.girders = window.SteelGirder.getData();
        }

        if (window.SteelTies &&
            typeof window.SteelTies.getData === "function") {
            data.wallTies = window.SteelTies.getData();
        }

        if (window.SteelRoofTies &&
            typeof window.SteelRoofTies.getData === "function") {
            data.roofTies = window.SteelRoofTies.getData();
        }

        // ذخیره تنظیمات پرلین‌های سقف
        if (window.SteelRoofPurlins &&
            typeof window.SteelRoofPurlins.getData === "function") {
            data.roofPurlins =
                window.SteelRoofPurlins.getData();
        }

        if (window.SteelPurlinCantileverConnection &&
            typeof window.SteelPurlinCantileverConnection.getData === "function") {
            data.purlinCantileverConnection =
                window.SteelPurlinCantileverConnection.getData();
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
        if (window.SteelLoads) {
            if (typeof window.SteelLoads.syncLegacyInputs === "function") {
                window.SteelLoads.syncLegacyInputs();
            }

            if (typeof window.SteelLoads.validate === "function") {
                const loadError = window.SteelLoads.validate();
                if (loadError) return loadError;
            }
        }

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

        if (d.baseConnection !== "pinned" &&
            d.baseConnection !== "fixed") {
            return "نوع اتصال پای ستون معتبر نیست.";
        }

        if (window.SteelOpenings &&
            typeof window.SteelOpenings.validate === "function") {
            const openingError = window.SteelOpenings.validate();
            if (openingError) return openingError;
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

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);

        setStatus(
            "پروژه همراه با بارگذاری، مقاطع، تیرورق‌ها، بازشوها، قیدهای دیوار، قیدهای سقف و پرلین‌ها ذخیره شد."
        );
    }

    function loadData(data) {
        if (!data || typeof data !== "object") {
            throw new Error("ساختار اطلاعات پروژه معتبر نیست.");
        }

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
            "dead",
            "live",
            "wind",
            "snow"
        ];

        fields.forEach(function (id) {
            if (data[id] !== undefined && $(id)) {
                $(id).value = data[id];
            }
        });

        if ($("baseConnection")) {
            $("baseConnection").value =
                data.baseConnection === "fixed" ? "fixed" : "pinned";
        }

        updateFrameCount();

        if (data.loads && window.SteelLoads &&
            typeof window.SteelLoads.setData === "function") {
            window.SteelLoads.setData(data.loads);
        }

        if (window.SteelLoads &&
            typeof window.SteelLoads.syncLegacyInputs === "function") {
            window.SteelLoads.syncLegacyInputs();
        }

        if (data.sections && window.SteelSections &&
            typeof window.SteelSections.setData === "function") {
            window.SteelSections.setData(data.sections);
        }

        if (data.openings && window.SteelOpenings &&
            typeof window.SteelOpenings.setData === "function") {
            window.SteelOpenings.setData(data.openings);

            if (typeof window.SteelOpenings.check === "function") {
                window.SteelOpenings.check();
            }
        }

        if (data.girders && window.SteelGirder &&
            typeof window.SteelGirder.setData === "function") {
            window.SteelGirder.setData(data.girders);
        }

        if (window.SteelTies &&
            typeof window.SteelTies.setData === "function") {
            window.SteelTies.setData(data.wallTies || {});
        }

        if (window.SteelRoofTies &&
            typeof window.SteelRoofTies.setData === "function") {
            window.SteelRoofTies.setData(data.roofTies || {});
        }

        // بازیابی تنظیمات پرلین‌های سقف
        if (window.SteelRoofPurlins &&
            typeof window.SteelRoofPurlins.setData === "function") {
            window.SteelRoofPurlins.setData(
                data.roofPurlins || {}
            );
        }

        if (window.SteelPurlinCantileverConnection &&
            typeof window.SteelPurlinCantileverConnection.setData === "function") {
            window.SteelPurlinCantileverConnection.setData(
                data.purlinCantileverConnection || {}
            );
        }

        if (window.SteelBracing &&
            typeof window.SteelBracing.drawAll === "function") {
            window.SteelBracing.drawAll();
        }

        if (window.SteelTies &&
            typeof window.SteelTies.drawAll === "function") {
            window.SteelTies.drawAll();
        }

        setStatus(
            "پروژه بازیابی شد؛ تنظیمات قیدهای دیوار، قیدهای سقف، پرلین‌ها و اتصال کنسول نیز بازیابی شدند."
        );
    }

    function loadFile(file) {
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function () {
            try {
                const data = JSON.parse(reader.result);
                loadData(data);
            } catch (error) {
                alert("خطا در بازکردن فایل پروژه: " + error.message);
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
        setStatus,
        getBaseConnection
    };

    document.addEventListener("DOMContentLoaded", function () {
        updateFrameCount();

        ["length", "spacing"].forEach(function (id) {
            const el = $(id);

            if (el) {
                el.addEventListener("input", updateFrameCount);
            }
        });

        if ($("baseConnection")) {
            $("baseConnection").value =
                $("baseConnection").value === "fixed" ? "fixed" : "pinned";
        }
    });

    updateFrameCount();
})();
