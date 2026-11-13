
/* SAHROUD STEEL - Project Manager 2.9 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const STORAGE_KEY = "sahroudSteelProject.autosave.v3";
    let persistTimer = null;

    function persistSnapshot(data) {
        try {
            const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            const snapshot = Object.assign({}, data);
            if (!snapshot.structuralModel && previous && previous.structuralModel) {
                snapshot.structuralModel = previous.structuralModel;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            return true;
        } catch (error) {
            console.warn("ذخیره خودکار پروژه در این مرورگر ممکن نشد:", error);
            return false;
        }
    }

    function flushAutoSave() {
        if (persistTimer) {
            clearTimeout(persistTimer);
            persistTimer = null;
        }
        try {
            const ok = persistSnapshot(getData());
            if (ok) {
                setStatus("ذخیره خودکار انجام شد؛ آخرین تغییرات در حافظه همین مرورگر ثبت شد.");
            } else {
                setStatus("هشدار: ذخیره در حافظه مرورگر ناموفق بود؛ از دکمه «ذخیره پروژه» فایل JSON بگیرید.");
            }
            return ok;
        } catch (error) {
            console.warn("ذخیره خودکار انجام نشد:", error);
            setStatus("هشدار: ذخیره خودکار انجام نشد؛ از دکمه «ذخیره پروژه» فایل JSON بگیرید.");
            return false;
        }
    }

    function scheduleAutoSave() {
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(flushAutoSave, 500);
    }

    async function restoreLastProject() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const response = await fetch("default-project.json", { cache: "no-store" });
                if (!response.ok) throw new Error("فایل پیش‌فرض پروژه در دسترس نیست.");
                const initialProject = await response.json();
                loadData(initialProject);
                setStatus("پروژه پایه مهندسی از فایل ارسالی شما بارگذاری شد؛ تغییرات بعدی در همین مرورگر ذخیره خودکار می‌شود.");
                return true;
            }
            const data = JSON.parse(raw);
            loadData(data);
            if (window.SteelDrawing && typeof window.SteelDrawing.drawFrame === "function") {
                window.SteelDrawing.drawFrame();
            }
            setStatus("آخرین پروژه به‌طور خودکار از حافظه همین مرورگر بازیابی شد.");
            return true;
        } catch (error) {
            console.warn("بازیابی خودکار پروژه انجام نشد:", error);
            setStatus("بازیابی خودکار ممکن نشد؛ فایل پروژه را یک‌بار باز کنید.");
            return false;
        }
    }

    function updateRoofGeometry() {
        const span = Number($("span")?.value);
        const rise = Number($("rise")?.value);
        const height = Number($("height")?.value);
        if (!(span > 0) || !(rise >= 0) || !(height > 0)) return;
        const slope = rise / (span / 2) * 100;
        if ($("roofSlopeDisplay")) $("roofSlopeDisplay").textContent = slope.toFixed(1).replace(".", "٫") + "٪";
        if ($("roofRiseDisplay")) $("roofRiseDisplay").textContent = rise.toFixed(2).replace(".", "٫") + " متر";
        if ($("roofTotalHeightDisplay")) $("roofTotalHeightDisplay").textContent = (height + rise).toFixed(2).replace(".", "٫") + " متر";
        if (window.SteelDrawing && typeof window.SteelDrawing.drawFrame === "function") window.SteelDrawing.drawFrame();
    }

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
            cityName: $("cityName") ? $("cityName").value.trim() : "",
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

            structuralModel: window.SteelStructuralModel?.getData?.() || null,
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

        if (window.SteelMemberDesignInputs &&
            typeof window.SteelMemberDesignInputs.readUI === "function") {
            data.memberDesignInputs = window.SteelMemberDesignInputs.readUI();
        }

        if (window.SteelTensionDesignReadiness && typeof window.SteelTensionDesignReadiness.readUI === "function") {
            data.tensionDesignReadiness = window.SteelTensionDesignReadiness.readUI();
        }

        if (window.SteelCompressionDesignReadiness && typeof window.SteelCompressionDesignReadiness.readUI === "function") {
            data.compressionDesignReadiness = window.SteelCompressionDesignReadiness.readUI();
        }

        if (window.SteelSectionGeometry &&
            typeof window.SteelSectionGeometry.read === "function") {
            data.sectionGeometryAudit = window.SteelSectionGeometry.read();
        }

        if (window.SteelTaperedSections && typeof window.SteelTaperedSections.read === "function") {
            data.taperedMemberSections = window.SteelTaperedSections.read();
        }

        if (window.SteelOpenings &&
            typeof window.SteelOpenings.getData === "function") {
            data.openings = window.SteelOpenings.getData();
        }

        if (window.SteelClimateDB &&
            typeof window.SteelClimateDB.getData === "function") {
            data.climateDatabase = window.SteelClimateDB.getData();
        }

        if (window.SteelClimateLoadEngine &&
            typeof window.SteelClimateLoadEngine.getData === "function") {
            data.climateLoadEngine = window.SteelClimateLoadEngine.getData();
        }

        if (window.SteelWindBasis && typeof window.SteelWindBasis.getData === "function") {
            data.windBasis = window.SteelWindBasis.getData();
        }

        if (window.SteelDirectionalWind && typeof window.SteelDirectionalWind.getData === "function") {
            data.directionalWind = window.SteelDirectionalWind.getData();
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

        if (window.SteelFabricationTakeoff && typeof window.SteelFabricationTakeoff.getData === "function") {
            data.fabricationTakeoff = window.SteelFabricationTakeoff.getData();
        }

        if (window.SteelDesignCore && typeof window.SteelDesignCore.getData === "function") {
            data.designBrief = window.SteelDesignCore.getData();
        }

        if (window.SteelMarketPrices && typeof window.SteelMarketPrices.getData === "function") {
            data.marketPrices = window.SteelMarketPrices.getData();
        }

        if (window.SteelCodeReferences && typeof window.SteelCodeReferences.getData === "function") {
            data.codeReferences = window.SteelCodeReferences.getData();
        }

        if (window.SteelCostEstimate && typeof window.SteelCostEstimate.getData === "function") {
            data.costEstimate = window.SteelCostEstimate.getData();
        }

        if (window.SteelFoundationTakeoff && typeof window.SteelFoundationTakeoff.getData === "function") {
            data.foundationTakeoff = window.SteelFoundationTakeoff.getData();
        }

        if (window.SteelAnchorBaseplateTakeoff && typeof window.SteelAnchorBaseplateTakeoff.getData === "function") {
            data.anchorBaseplateTakeoff = window.SteelAnchorBaseplateTakeoff.getData();
        }

        if (window.SteelFootingStructuralScreen && typeof window.SteelFootingStructuralScreen.getData === "function") {
            data.footingStructuralScreen = window.SteelFootingStructuralScreen.getData();
        }

        if (window.SteelFootingSizingAssistant && typeof window.SteelFootingSizingAssistant.getData === "function") {
            data.footingSizingAssistant = window.SteelFootingSizingAssistant.getData();
        }

        if (window.SteelTieBeamLayout) data.tieBeamLayout = window.SteelTieBeamLayout.getData();
        if (window.SteelTieBeamReinforcement) data.tieBeamReinforcement = window.SteelTieBeamReinforcement.getData();

        if (window.SteelCraneReadiness && typeof window.SteelCraneReadiness.getData === "function") {
            data.craneReadiness = window.SteelCraneReadiness.getData();
        }

        if (window.SteelCraneTrainAnalysis) data.craneTrainAnalysis = window.SteelCraneTrainAnalysis.getData();
        if (window.SteelCraneHorizontalLoads) data.craneHorizontalLoads = window.SteelCraneHorizontalLoads.getData();

        if (window.SteelGeotechnicalData && typeof window.SteelGeotechnicalData.getData === "function") {
            data.geotechnicalData = window.SteelGeotechnicalData.getData();
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
        if (!persistSnapshot(data)) {
            setStatus("ذخیره در حافظه مرورگر ناموفق بود؛ فایل JSON همچنان برای ذخیره دستی آماده می‌شود.");
        }

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
            "فایل پروژه برای ذخیره در گوشی/رایانه آماده شد؛ نسخه‌ای نیز در حافظه مرورگر ثبت شد، در صورت موفقیت."
        );
    }

    function loadData(data) {
        if (!data || typeof data !== "object") {
            throw new Error("ساختار اطلاعات پروژه معتبر نیست.");
        }

        // مهاجرت کنترل‌شده مشخصات پیش‌فرض قدیمی پرلین Z180:
        // فقط اگر هر چهار مقدار دقیقاً همان مقادیر نمونه ناسازگار قبلی باشند،
        // آن‌ها را به خواص هندسی به‌روزشده منتقل می‌کنیم؛ مقاطع سفارشی کاربر دست‌نخورده می‌مانند.
        const legacyPurlin = data.sections?.analysis3d?.groups?.roofPurlin;
        if (legacyPurlin &&
            Number(legacyPurlin.A_cm2) === 30 &&
            Number(legacyPurlin.Iy_cm4) === 1000 &&
            Number(legacyPurlin.Iz_cm4) === 300 &&
            Number(legacyPurlin.J_cm4) === 20) {
            Object.assign(legacyPurlin, {
                A_cm2: 8.5,
                Iy_cm4: 75.84114583333333,
                Iz_cm4: 418.2083333333333,
                J_cm4: 0.17708333333333334
            });
        }

        // مقدار پیش‌فرض قدیمی فاصله محاسباتی پرلین را فقط در صورت برابر بودن با 1m اصلاح کن.
        if (data.roofPurlins && Number(data.roofPurlins.pitch) === 1) {
            data.roofPurlins.pitch = 0.95;
        }

        const fields = [
            "projectName",
            "owner",
            "designer",
            "city",
            "cityName",
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
        if ($("cityName")) {
            $("cityName").style.display = ["other", "custom"].includes($("city")?.value) ? "" : "none";
            if (data.cityName !== undefined) $("cityName").value = data.cityName;
        }

        // ارتفاع تاج از فایل پروژه بازیابی می‌شود؛ شیب از rise و نصف دهانه محاسبه می‌شود.
        updateRoofGeometry();

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

        if (data.sectionGeometryAudit && window.SteelSectionGeometry &&
            typeof window.SteelSectionGeometry.setData === "function") {
            window.SteelSectionGeometry.setData(data.sectionGeometryAudit);
        }

        if (window.SteelTaperedSections && typeof window.SteelTaperedSections.setData === "function") {
            window.SteelTaperedSections.setData(data.taperedMemberSections || {});
        }

        if (data.openings && window.SteelOpenings &&
            typeof window.SteelOpenings.setData === "function") {
            window.SteelOpenings.setData(data.openings);

            if (typeof window.SteelOpenings.check === "function") {
                window.SteelOpenings.check();
            }
        }

        if (window.SteelFabricationTakeoff && typeof window.SteelFabricationTakeoff.setData === "function") {
            window.SteelFabricationTakeoff.setData(data.fabricationTakeoff || {});
        }

        if (window.SteelMarketPrices && typeof window.SteelMarketPrices.setData === "function") {
            window.SteelMarketPrices.setData(data.marketPrices || {});
        }

        if (window.SteelCodeReferences && typeof window.SteelCodeReferences.setData === "function") {
            window.SteelCodeReferences.setData(data.codeReferences || {});
        }

        if (window.SteelCostEstimate && typeof window.SteelCostEstimate.setData === "function") {
            window.SteelCostEstimate.setData(data.costEstimate || {});
        }

        if (window.SteelFoundationTakeoff && typeof window.SteelFoundationTakeoff.setData === "function") {
            window.SteelFoundationTakeoff.setData(data.foundationTakeoff || {});
        }

        if (window.SteelAnchorBaseplateTakeoff && typeof window.SteelAnchorBaseplateTakeoff.setData === "function") {
            window.SteelAnchorBaseplateTakeoff.setData(data.anchorBaseplateTakeoff || {});
        }

        if (window.SteelFootingStructuralScreen && typeof window.SteelFootingStructuralScreen.setData === "function") {
            window.SteelFootingStructuralScreen.setData(data.footingStructuralScreen || {});
        }

        if (window.SteelFootingSizingAssistant && typeof window.SteelFootingSizingAssistant.setData === "function") {
            window.SteelFootingSizingAssistant.setData(data.footingSizingAssistant || {});
        }

        if (window.SteelTieBeamLayout) window.SteelTieBeamLayout.setData(data.tieBeamLayout || {});
        if (window.SteelTieBeamReinforcement) window.SteelTieBeamReinforcement.setData(data.tieBeamReinforcement || {});

        if (window.SteelCraneReadiness && typeof window.SteelCraneReadiness.setData === "function") {
            window.SteelCraneReadiness.setData(data.craneReadiness || {});
        }

        if (window.SteelCraneTrainAnalysis) window.SteelCraneTrainAnalysis.setData(data.craneTrainAnalysis || {});
        if (window.SteelCraneHorizontalLoads) window.SteelCraneHorizontalLoads.setData(data.craneHorizontalLoads || {});

        if (window.SteelGeotechnicalData && typeof window.SteelGeotechnicalData.setData === "function") {
            window.SteelGeotechnicalData.setData(data.geotechnicalData || {});
        }

        if (window.SteelMemberDesignInputs &&
            typeof window.SteelMemberDesignInputs.setData === "function") {
            window.SteelMemberDesignInputs.setData(data.memberDesignInputs || {});
        }

        if (window.SteelTensionDesignReadiness && typeof window.SteelTensionDesignReadiness.setData === "function") {
            window.SteelTensionDesignReadiness.setData(data.tensionDesignReadiness || {});
        }

        if (window.SteelCompressionDesignReadiness && typeof window.SteelCompressionDesignReadiness.setData === "function") {
            window.SteelCompressionDesignReadiness.setData(data.compressionDesignReadiness || {});
        }

        if (window.SteelDesignCore && typeof window.SteelDesignCore.setData === "function") {
            const legacyClimate = data.loads && data.loads.climate ? data.loads.climate : {};
            window.SteelDesignCore.setData(data.designBrief || {
                occupancy: legacyClimate.buildingUse === "warehouse-industrial-enclosed" ? "industrial" : legacyClimate.buildingUse,
                enclosure: legacyClimate.openingState
            });
        }

        if (data.climateDatabase && window.SteelClimateDB &&
            typeof window.SteelClimateDB.setData === "function") {
            window.SteelClimateDB.setData(data.climateDatabase);
        }

        if (data.climateLoadEngine && window.SteelClimateLoadEngine &&
            typeof window.SteelClimateLoadEngine.setData === "function") {
            window.SteelClimateLoadEngine.setData(data.climateLoadEngine);
        }

        if (window.SteelWindBasis && typeof window.SteelWindBasis.setData === "function") {
            window.SteelWindBasis.setData(data.windBasis || {});
        }

        if (window.SteelDirectionalWind && typeof window.SteelDirectionalWind.setData === "function") {
            window.SteelDirectionalWind.setData(data.directionalWind || {});
        }

        if (window.SteelStructuralModel && typeof window.SteelStructuralModel.setData === "function") {
            window.SteelStructuralModel.setData(data.structuralModel || {});
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

        window.SteelMarketPrices?.syncProjectCity?.();
        persistSnapshot(getData());
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

    window.updateRoofGeometry = updateRoofGeometry;

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

        ["span", "rise", "height"].forEach(function (id) {
            const el = $(id);
            if (el) el.addEventListener("input", updateRoofGeometry);
        });

        if ($("baseConnection")) {
            $("baseConnection").value =
                $("baseConnection").value === "fixed" ? "fixed" : "pinned";
        }

        document.addEventListener("input", function (event) {
            if (event.target && event.target.closest && event.target.closest("main")) {
                scheduleAutoSave();
            }
        });
        document.addEventListener("change", function (event) {
            if (event.target && event.target.closest && event.target.closest("main")) {
                scheduleAutoSave();
            }
        });
    });

    // هنگام رفتن برنامه به پس‌زمینه یا بستن صفحه، تغییرات معوق فوراً ثبت شوند.
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden" && persistTimer) flushAutoSave();
    });
    window.addEventListener("pagehide", function () {
        if (persistTimer) flushAutoSave();
    });

    window.addEventListener("load", function () {
        restoreLastProject();
    }, { once: true });

    updateFrameCount();
})();
