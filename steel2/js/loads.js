

/* SAHROUD STEEL - Load Management 1.0
   Load input and preliminary load combinations
   Units: kN/m2
   This module manages input only.
   It does NOT apply code combinations to structural analysis.
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const state = {
        deadLeft: 0.50,
        deadRight: 0.50,
        liveLeft: 0.75,
        liveRight: 0.75,
        snowLeft: 0,
        snowRight: 0,
        windLeft: 0,
        windRight: 0,
        windWall: 0,
        windDirection: "left-to-right",
        note: "",
        climate: {
            city: "shahroud",
            customCity: "شاهرود",
            elevation: "",
            source: "ورود دستی مهندس / نیازمند تطبیق با مبحث ششم ۱۳۹۸",
            groundSnow: "",
            basicWind: "",
            terrain: "",
            topography: "normal",
            openingState: "enclosed",
            openingArea: 25,
            envelopeArea: "",
            dominantOpening: "no"
        }
    };

    const combinations = [
        { name: "ترکیب ۱ ـ بارهای ثقلی", dead: 1.2, live: 1.6, snow: 0 },
        { name: "ترکیب ۲ ـ بار مرده و برف", dead: 1.2, live: 0, snow: 1.6 },
        { name: "ترکیب ۳ ـ بار مرده", dead: 1.4, live: 0, snow: 0 },
        { name: "ترکیب ۴ ـ بار باد", dead: 0.8, live: 0, snow: 0 }
    ];

    let initialized = false;

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function input(id, label, value, allowNegative) {
        return `
            <div class="field">
                <label for="${id}">${label} (kN/m²)</label>
                <input
                    id="${id}"
                    type="number"
                    step="0.01"
                    ${allowNegative ? "" : 'min="0"'}
                    value="${value}"
                >
            </div>
        `;
    }

    function panelHTML() {
        return `
        <section class="panel" id="advancedLoadPanel">

            <div class="panel-title">
                <h3>۹ ـ مدیریت تفکیکی بارگذاری</h3>
                <span class="status">ورود اطلاعات</span>
            </div>

            <div class="notice">
                بارها به صورت سطحی و بر حسب kN/m² وارد می‌شوند.
                مقادیر سقف چپ و راست مستقل هستند.
                مقادیر باد مثبت و منفی قابل ورود هستند.
                علامت مثبت یا منفی به تنهایی جهت واقعی بار را تعیین نمی‌کند؛
                جهت اثر باید در مدل بارگذاری مشخص شود.
            </div>


            <h4>الف ـ محل پروژه و اطلاعات اقلیمی</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="climateCity">شهر پروژه</label>
                    <select id="climateCity">
                        <option value="shahroud">شاهرود (پیش‌فرض)</option>
                        <option value="semnan">سمنان</option>
                        <option value="tehran">تهران</option>
                        <option value="mashhad">مشهد</option>
                        <option value="tabriz">تبریز</option>
                        <option value="isfahan">اصفهان</option>
                        <option value="yazd">یزد</option>
                        <option value="rasht">رشت</option>
                        <option value="sari">ساری</option>
                        <option value="kerman">کرمان</option>
                        <option value="other">سایر شهرها / ورود دستی</option>
                    </select>
                </div>
                <div class="field">
                    <label for="climateCustomCity">نام شهر یا محل دقیق پروژه</label>
                    <input id="climateCustomCity" type="text" value="شاهرود" placeholder="نام شهر، روستا یا محدوده">
                </div>
                <div class="field">
                    <label for="climateElevation">ارتفاع محل از سطح دریا (متر)</label>
                    <input id="climateElevation" type="number" min="-500" max="6000" step="1" value="">
                </div>
                <div class="field">
                    <label for="climateSource">منبع داده اقلیمی</label>
                    <input id="climateSource" type="text" value="ورود دستی مهندس / نیازمند تطبیق با مبحث ششم ۱۳۹۸">
                </div>
            </div>

            <h4>ب ـ پارامترهای اقلیمی ورودی (مقادیر تأییدنشده را خالی بگذارید)</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="climateGroundSnow">بار برف زمین Pg (kN/m²)</label>
                    <input id="climateGroundSnow" type="number" min="0" step="0.01" placeholder="از جدول/نقشه معتبر">
                </div>
                <div class="field">
                    <label for="climateBasicWind">سرعت مبنای باد (km/h)</label>
                    <input id="climateBasicWind" type="number" min="0" step="0.1" placeholder="از جدول ۶-۱۰-۱؛ km/h">
                </div>
                <div class="field">
                    <label for="climateTerrain">رده زبری / مواجهه زمین</label>
                    <select id="climateTerrain">
                        <option value="">انتخاب نشده</option>
                        <option value="open">باز و هموار</option>
                        <option value="suburban">حومه و موانع پراکنده</option>
                        <option value="urban">شهری و متراکم</option>
                    </select>
                </div>
                <div class="field">
                    <label for="climateTopography">شرایط توپوگرافی</label>
                    <select id="climateTopography">
                        <option value="normal">عادی / بدون اثر ویژه ثبت‌شده</option>
                        <option value="hill">تپه یا یال مرتفع</option>
                        <option value="valley">دره یا گذرگاه باد</option>
                        <option value="manual">نیازمند بررسی دستی</option>
                    </select>
                </div>
            </div>

            <h4>ج ـ وضعیت بازشوهای پوسته ساختمان</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="buildingOpeningState">طبقه‌بندی وضعیت بازشوها</label>
                    <select id="buildingOpeningState">
                        <option value="enclosed">بسته (بازشوها در حالت بهره‌برداری بسته‌اند)</option>
                        <option value="partially-enclosed">نیمه‌باز / دارای بازشوی غالب</option>
                        <option value="open">باز (دیوارها عمدتاً باز یا فاقد پوشش‌اند)</option>
                        <option value="manual">نیازمند ارزیابی مهندس</option>
                    </select>
                </div>
                <div class="field">
                    <label for="buildingOpeningArea">مساحت کل بازشوهای مؤثر (m²)</label>
                    <input id="buildingOpeningArea" type="number" min="0" step="0.1" value="25">
                </div>
                <div class="field">
                    <label for="buildingEnvelopeArea">مساحت تقریبی پوسته مورد بررسی (m²)</label>
                    <input id="buildingEnvelopeArea" type="number" min="0" step="0.1" placeholder="مساحت دیوارها و پوسته">
                </div>
                <div class="field">
                    <label for="buildingDominantOpening">وضعیت بازشوی غالب</label>
                    <select id="buildingDominantOpening">
                        <option value="no">ندارد / مشخص نیست</option>
                        <option value="front">جبهه جلو</option>
                        <option value="rear">جبهه عقب</option>
                        <option value="left">دیوار طولی چپ</option>
                        <option value="right">دیوار طولی راست</option>
                        <option value="multiple">چند جبهه</option>
                    </select>
                </div>
            </div>
            <div class="notice" id="climateNotice">
                بانک نام شهرها آماده است؛ تا زمان تکمیل و کنترل جدول‌های رسمی، هیچ مقدار خودکاری برای باد و برف به پروژه تحمیل نمی‌شود.
            </div>

            <h4>د ـ بار مرده سقف</h4>
            <div class="form-grid">
                ${input("loadDeadLeft", "بار مرده سمت چپ", state.deadLeft, false)}
                ${input("loadDeadRight", "بار مرده سمت راست", state.deadRight, false)}
            </div>

            <h4>ب ـ بار زنده سقف</h4>
            <div class="form-grid">
                ${input("loadLiveLeft", "بار زنده سمت چپ", state.liveLeft, false)}
                ${input("loadLiveRight", "بار زنده سمت راست", state.liveRight, false)}
            </div>

            <h4>ج ـ بار برف سقف</h4>
            <div class="form-grid">
                ${input("loadSnowLeft", "بار برف سمت چپ", state.snowLeft, false)}
                ${input("loadSnowRight", "بار برف سمت راست", state.snowRight, false)}
            </div>

            <h4>د ـ بار باد</h4>
            <div class="form-grid">
                ${input("loadWindLeft", "بار باد سمت چپ سقف", state.windLeft, true)}
                ${input("loadWindRight", "بار باد سمت راست سقف", state.windRight, true)}
                ${input("loadWindWall", "بار باد دیوار", state.windWall, true)}
            </div>

            <div class="field">
                <label for="loadWindDirection">جهت باد</label>
                <select id="loadWindDirection">
                    <option value="left-to-right">از چپ به راست</option>
                    <option value="right-to-left">از راست به چپ</option>
                </select>
            </div>

            <h4>هـ ـ توضیحات بارگذاری</h4>
            <div class="field">
                <label for="loadNote">یادداشت مهندس محاسب</label>
                <textarea
                    id="loadNote"
                    rows="3"
                    placeholder="منبع بارگذاری، فرضیات و توضیحات..."
                ></textarea>
            </div>

            <div class="notice" id="loadSummary">
                اطلاعات بارگذاری آماده ورود است.
            </div>

            <h4>و ـ ضرایب ترکیبات بار (پیش‌نویس)</h4>

            <div class="notice">
                ضرایب زیر صرفاً برای آماده‌سازی ساختار نرم‌افزار هستند.
                تا زمان تعیین و تأیید ضوابط آیین‌نامه‌ای پروژه،
                نباید مبنای طراحی یا کنترل اعضا قرار گیرند.
            </div>

            <div id="loadCombinations"></div>

            <div class="button-grid">
                <button id="btnLoadCheck" class="btn primary" type="button">
                    کنترل اطلاعات بار
                </button>
                <button id="btnLoadReset" class="btn secondary" type="button">
                    بازنشانی بارها
                </button>
            </div>

            <div id="loadValidation" class="notice">
                هنوز کنترل انجام نشده است.
            </div>

        </section>
        `;
    }

    function renderCombinations() {
        const container = $("loadCombinations");
        if (!container) return;

        container.innerHTML = combinations.map((item, index) => `
            <div class="notice">
                <b>${item.name}</b>
                <div class="form-grid">
                    <div class="field">
                        <label>ضریب بار مرده</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="comboDead${index}"
                            value="${item.dead}"
                        >
                    </div>
                    <div class="field">
                        <label>ضریب بار زنده</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="comboLive${index}"
                            value="${item.live}"
                        >
                    </div>
                    <div class="field">
                        <label>ضریب بار برف</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="comboSnow${index}"
                            value="${item.snow}"
                        >
                    </div>
                </div>
            </div>
        `).join("");
    }

    function readInputs() {
        const ids = {
            deadLeft: "loadDeadLeft",
            deadRight: "loadDeadRight",
            liveLeft: "loadLiveLeft",
            liveRight: "loadLiveRight",
            snowLeft: "loadSnowLeft",
            snowRight: "loadSnowRight",
            windLeft: "loadWindLeft",
            windRight: "loadWindRight",
            windWall: "loadWindWall"
        };

        Object.keys(ids).forEach(key => {
            const el = $(ids[key]);
            if (el) state[key] = number(el.value);
        });

        if ($("loadWindDirection")) {
            state.windDirection = $("loadWindDirection").value;
        }

        if ($("loadNote")) {
            state.note = $("loadNote").value;
        }

        const climateFields = {
            city: "climateCity",
            customCity: "climateCustomCity",
            elevation: "climateElevation",
            source: "climateSource",
            groundSnow: "climateGroundSnow",
            basicWind: "climateBasicWind",
            terrain: "climateTerrain",
            topography: "climateTopography",
            openingState: "buildingOpeningState",
            openingArea: "buildingOpeningArea",
            envelopeArea: "buildingEnvelopeArea",
            dominantOpening: "buildingDominantOpening"
        };
        Object.keys(climateFields).forEach(key => {
            const el = $(climateFields[key]);
            if (el) state.climate[key] = el.value;
        });
        ["elevation", "groundSnow", "basicWind", "openingArea", "envelopeArea"].forEach(key => {
            const value = state.climate[key];
            if (value !== "" && !Number.isFinite(Number(value))) state.climate[key] = "";
        });

        state.combinations = combinations.map((item, index) => ({
            name: item.name,
            dead: number($("comboDead" + index)?.value),
            live: number($("comboLive" + index)?.value),
            snow: number($("comboSnow" + index)?.value)
        }));

        return JSON.parse(JSON.stringify(state));
    }

    function syncLegacyInputs() {
        const data = readInputs();

        // فیلدهای قدیمی برای سازگاری با نسخه فعلی تحلیل
        // میانگین بار دو نیمه سقف در آن‌ها قرار می‌گیرد.
        const average = (a, b) => (a + b) / 2;

        if ($("dead")) {
            $("dead").value = average(data.deadLeft, data.deadRight);
        }

        if ($("live")) {
            $("live").value = average(data.liveLeft, data.liveRight);
        }

        if ($("snow")) {
            $("snow").value = average(data.snowLeft, data.snowRight);
        }

        // موتور تحلیل فعلی هنوز بار باد را اعمال نمی‌کند.
        // قدرمطلق فقط برای عبور از اعتبارسنجی قدیمی ذخیره می‌شود.
        if ($("wind")) {
            $("wind").value = Math.max(
                Math.abs(data.windLeft),
                Math.abs(data.windRight),
                Math.abs(data.windWall)
            );
        }
    }

    function validate() {
        const data = readInputs();

        const nonNegative = [
            ["بار مرده چپ", data.deadLeft],
            ["بار مرده راست", data.deadRight],
            ["بار زنده چپ", data.liveLeft],
            ["بار زنده راست", data.liveRight],
            ["بار برف چپ", data.snowLeft],
            ["بار برف راست", data.snowRight]
        ];

        for (const item of nonNegative) {
            if (!Number.isFinite(item[1]) || item[1] < 0) {
                return item[0] + " نمی‌تواند منفی باشد.";
            }
        }

        const signed = [
            data.windLeft,
            data.windRight,
            data.windWall
        ];

        if (signed.some(v => !Number.isFinite(v))) {
            return "مقدار بار باد معتبر نیست.";
        }

        for (const item of data.combinations || []) {
            if ([item.dead, item.live, item.snow].some(
                v => !Number.isFinite(v) || v < 0
            )) {
                return "ضرایب ترکیب بار باید عددی و غیرمنفی باشند.";
            }
        }

        return "";
    }

    function summary() {
        const data = readInputs();

        const averageDead =
            (data.deadLeft + data.deadRight) / 2;

        const averageLive =
            (data.liveLeft + data.liveRight) / 2;

        const averageSnow =
            (data.snowLeft + data.snowRight) / 2;

        const el = $("loadSummary");
        if (!el) return;

        el.innerHTML = `
            <b>خلاصه بارگذاری ورودی</b>
            <p>میانگین بار مرده سقف: ${averageDead.toFixed(3)} kN/m²</p>
            <p>میانگین بار زنده سقف: ${averageLive.toFixed(3)} kN/m²</p>
            <p>میانگین بار برف سقف: ${averageSnow.toFixed(3)} kN/m²</p>
            <p>باد سمت چپ: ${data.windLeft.toFixed(3)} kN/m²</p>
            <p>باد سمت راست: ${data.windRight.toFixed(3)} kN/m²</p>
            <p>باد دیوار: ${data.windWall.toFixed(3)} kN/m²</p>
            <p>جهت باد: ${
                data.windDirection === "left-to-right"
                    ? "از چپ به راست"
                    : "از راست به چپ"
            }</p>
        `;
    }

    function check() {
        const error = validate();
        const result = $("loadValidation");

        if (error) {
            if (result) result.textContent = "خطا: " + error;
            return false;
        }
        const climate = readInputs().climate || {};
        const numericClimate = [
            ["ارتفاع محل", climate.elevation, -500, 6000],
            ["بار برف زمین", climate.groundSnow, 0, 100],
            ["سرعت مبنای باد", climate.basicWind, 0, 150],
            ["مساحت بازشوها", climate.openingArea, 0, 1000000],
            ["مساحت پوسته", climate.envelopeArea, 0, 10000000]
        ];
        for (const [label, raw, min, max] of numericClimate) {
            if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < min || Number(raw) > max)) {
                if (result) result.textContent = "خطا: مقدار " + label + " خارج از محدوده مجاز فرم است.";
                return false;
            }
        }
        if (climate.openingState === "partially-enclosed" && climate.dominantOpening === "no") {
            if (result) result.textContent = "هشدار: وضعیت نیمه‌باز انتخاب شده، اما بازشوی غالب مشخص نشده است.";
            return false;
        }
        syncLegacyInputs();
        summary();

        if (result) {
            result.textContent =
                "اطلاعات بارگذاری از نظر عددی کنترل شد. " +
                "این کنترل به معنی تأیید آیین‌نامه‌ای بارها نیست.";
        }

        return true;
    }

    function reset() {
        const defaults = {
            deadLeft: 0.50,
            deadRight: 0.50,
            liveLeft: 0.75,
            liveRight: 0.75,
            snowLeft: 0,
            snowRight: 0,
            windLeft: 0,
            windRight: 0,
            windWall: 0
        };

        Object.assign(state, defaults);

        const ids = {
            deadLeft: "loadDeadLeft",
            deadRight: "loadDeadRight",
            liveLeft: "loadLiveLeft",
            liveRight: "loadLiveRight",
            snowLeft: "loadSnowLeft",
            snowRight: "loadSnowRight",
            windLeft: "loadWindLeft",
            windRight: "loadWindRight",
            windWall: "loadWindWall"
        };

        Object.keys(ids).forEach(key => {
            if ($(ids[key])) {
                $(ids[key]).value = defaults[key];
            }
        });

        if ($("loadWindDirection")) {
            $("loadWindDirection").value = "left-to-right";
        }

        if ($("loadNote")) {
            $("loadNote").value = "";
        }

        combinations.forEach((item, index) => {
            $("comboDead" + index).value = item.dead;
            $("comboLive" + index).value = item.live;
            $("comboSnow" + index).value = item.snow;
        });

        check();
    }

    function setData(data) {
        if (!data || typeof data !== "object") return;

        const keys = [
            "deadLeft", "deadRight",
            "liveLeft", "liveRight",
            "snowLeft", "snowRight",
            "windLeft", "windRight", "windWall"
        ];

        keys.forEach(key => {
            if (Number.isFinite(Number(data[key]))) {
                state[key] = Number(data[key]);
            }
        });

        if (typeof data.windDirection === "string") {
            state.windDirection = data.windDirection;
        }

        if (typeof data.note === "string") {
            state.note = data.note;
        }

        if (data.climate && typeof data.climate === "object") {
            Object.keys(state.climate).forEach(key => {
                if (data.climate[key] !== undefined) state.climate[key] = data.climate[key];
            });
        }

        if (Array.isArray(data.combinations)) {
            data.combinations.forEach((item, index) => {
                if (!combinations[index] || !item) return;

                combinations[index].dead = number(item.dead);
                combinations[index].live = number(item.live);
                combinations[index].snow = number(item.snow);
            });
        }

        if (initialized) {
            keys.forEach(key => {
                const map = {
                    deadLeft: "loadDeadLeft",
                    deadRight: "loadDeadRight",
                    liveLeft: "loadLiveLeft",
                    liveRight: "loadLiveRight",
                    snowLeft: "loadSnowLeft",
                    snowRight: "loadSnowRight",
                    windLeft: "loadWindLeft",
                    windRight: "loadWindRight",
                    windWall: "loadWindWall"
                };

                if ($(map[key])) $(map[key]).value = state[key];
            });

            if ($("loadWindDirection")) {
                $("loadWindDirection").value = state.windDirection;
            }

            if ($("loadNote")) {
                $("loadNote").value = state.note;
            }

            const climateIds = {
                city: "climateCity", customCity: "climateCustomCity",
                elevation: "climateElevation", source: "climateSource",
                groundSnow: "climateGroundSnow", basicWind: "climateBasicWind",
                terrain: "climateTerrain", topography: "climateTopography",
                openingState: "buildingOpeningState", openingArea: "buildingOpeningArea",
                envelopeArea: "buildingEnvelopeArea", dominantOpening: "buildingDominantOpening"
            };
            Object.keys(climateIds).forEach(key => {
                if ($(climateIds[key])) $(climateIds[key]).value = state.climate[key];
            });

            renderCombinations();

            if (data.combinations) {
                data.combinations.forEach((item, index) => {
                    if (!item) return;
                    if ($("comboDead" + index)) $("comboDead" + index).value = item.dead;
                    if ($("comboLive" + index)) $("comboLive" + index).value = item.live;
                    if ($("comboSnow" + index)) $("comboSnow" + index).value = item.snow;
                });
            }

            summary();
            syncLegacyInputs();
        }
    }

    function init() {
        if (initialized) return;

        const oldPanel = $("dead")?.closest(".panel");
        if (!oldPanel) return;

        oldPanel.insertAdjacentHTML("afterend", panelHTML());

        initialized = true;

        renderCombinations();

        const direction = $("loadWindDirection");
        if (direction) direction.value = state.windDirection;

        const note = $("loadNote");
        if (note) note.value = state.note;

        const climateCity = $("climateCity");
        const projectCity = $("city");
        if (climateCity && projectCity) {
            const initialCity = projectCity.value === "custom" || projectCity.value === "other"
                ? "shahroud" : projectCity.value;
            climateCity.value = initialCity;
            const cityNames = {
                shahroud: "شاهرود", semnan: "سمنان", tehran: "تهران",
                mashhad: "مشهد", tabriz: "تبریز", isfahan: "اصفهان",
                yazd: "یزد", rasht: "رشت", sari: "ساری", kerman: "کرمان"
            };
            if (cityNames[initialCity] && $("climateCustomCity")) {
                $("climateCustomCity").value = cityNames[initialCity];
            }
            climateCity.addEventListener("change", function () {
                if (cityNames[this.value] && $("climateCustomCity")) {
                    $("climateCustomCity").value = cityNames[this.value];
                }
                if (projectCity) projectCity.value = this.value;
            });
            if (projectCity) projectCity.addEventListener("change", function () {
                if (cityNames[this.value]) {
                    climateCity.value = this.value;
                    $("climateCustomCity").value = cityNames[this.value];
                }
            });
        }

        const panel = $("advancedLoadPanel");

        panel.addEventListener("input", function (event) {
            if (
                event.target &&
                event.target.matches("input, textarea, select")
            ) {
                summary();
            }
        });

        $("btnLoadCheck").addEventListener("click", check);
        $("btnLoadReset").addEventListener("click", reset);

        summary();
        const climateNotice = $("climateNotice");
        if (climateNotice) climateNotice.textContent =
            "شهر انتخابی فقط برای شناسایی محل پروژه است. داده‌های باد و برف تا زمان ورود از منبع رسمی، خودکار فرض یا تولید نمی‌شوند.";
    }

    window.SteelLoads = {
        getData: readInputs,
        setData,
        validate,
        check,
        syncLegacyInputs
    };

    document.addEventListener("DOMContentLoaded", init);

})();
