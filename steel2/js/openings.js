
/* SAHROUD STEEL - Opening Manager 1.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const defaults = {
        front: { enabled: true, width: 5, height: 5, position: 0 },
        rear:  { enabled: false, width: 3, height: 3, position: 0 },
        left:  { enabled: false, width: 3, height: 3, position: 5 },
        right: { enabled: false, width: 3, height: 3, position: 5 }
    };

    const DEFAULT_WIND_SCENARIO = "closed";

    function number(id) {
        const el = $(id);
        return el ? Number(el.value) : NaN;
    }

    function addPanel() {
        if ($("openingPanel")) return;

        const panel = document.createElement("section");
        panel.id = "openingPanel";
        panel.className = "panel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>۵ ـ تعریف بازشوهای سوله</h3>
                <span class="status">تنظیم بازشوها</span>
            </div>

            <div class="notice">
                نوع محصورشدگی و وضعیت بازشوها برای هر پروژه قابل انتخاب است. وجود در به معنی باز بودن آن هنگام باد نیست.
            </div>

            <fieldset>
                <legend>سناریوی بازشوها هنگام وزش باد</legend>
                <div class="field">
                    <label for="windOpeningScenario">وضعیت ساختمان در شرایط طراحی باد</label>
                    <select id="windOpeningScenario">
                        <option value="closed" selected>تمام درها و بازشوهای قابل‌بستن بسته (پیش‌فرض)</option>
                        <option value="front-open">درِ اصلی جلو باز</option>
                        <option value="custom">وضعیت سفارشی؛ تعیین بازشوهای باز</option>
                    </select>
                </div>
                <p class="hint">این انتخاب سناریوی بهره‌برداری را ثبت می‌کند؛ تعیین Cpi و تشخیص بازشوی غالب باید طبق ضوابط و مساحت واقعی بازشوها انجام شود. نرم‌افزار ضریب فشار داخلی را خودکار حدس نمی‌زند.</p>
            </fieldset>

            <fieldset>
                <legend>دیوار انتهایی جلو</legend>
                <label>
                    <input id="openingFrontEnabled" type="checkbox" checked>
                    وجود در/بازشوی اصلی جلویی
                </label>
                <div class="form-grid">
                    <div>
                        <label>عرض در (متر)</label>
                        <input id="openingFrontWidth" type="number"
                               min="0.1" step="0.1" value="5">
                    </div>
                    <div>
                        <label>ارتفاع در (متر)</label>
                        <input id="openingFrontHeight" type="number"
                               min="0.1" step="0.1" value="5">
                    </div>
                </div>
                <p class="hint">موقعیت در به‌صورت پیش‌فرض وسط دیوار است.</p>
            </fieldset>

            <fieldset>
                <legend>دیوار انتهایی عقب</legend>
                <label>
                    <input id="openingRearEnabled" type="checkbox">
                    تعریف بازشو در دیوار عقب
                </label>
                <div class="form-grid">
                    <div>
                        <label>عرض بازشو (متر)</label>
                        <input id="openingRearWidth" type="number"
                               min="0.1" step="0.1" value="3">
                    </div>
                    <div>
                        <label>ارتفاع بازشو (متر)</label>
                        <input id="openingRearHeight" type="number"
                               min="0.1" step="0.1" value="3">
                    </div>
                    <div>
                        <label>فاصله از گوشه چپ (متر)</label>
                        <input id="openingRearPosition" type="number"
                               min="0" step="0.1" value="0">
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>دیوار طولی سمت چپ</legend>
                <label>
                    <input id="openingLeftEnabled" type="checkbox">
                    تعریف بازشو در دیوار چپ
                </label>
                <div class="form-grid">
                    <div>
                        <label>عرض بازشو در امتداد طول (متر)</label>
                        <input id="openingLeftWidth" type="number"
                               min="0.1" step="0.1" value="3">
                    </div>
                    <div>
                        <label>ارتفاع بازشو (متر)</label>
                        <input id="openingLeftHeight" type="number"
                               min="0.1" step="0.1" value="3">
                    </div>
                    <div>
                        <label>فاصله از ابتدای سوله (متر)</label>
                        <input id="openingLeftPosition" type="number"
                               min="0" step="0.1" value="5">
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>دیوار طولی سمت راست</legend>
                <label>
                    <input id="openingRightEnabled" type="checkbox">
                    تعریف بازشو در دیوار راست
                </label>
                <div class="form-grid">
                    <div>
                        <label>عرض بازشو در امتداد طول (متر)</label>
                        <input id="openingRightWidth" type="number"
                               min="0.1" step="0.1" value="3">
                    </div>
                    <div>
                        <label>ارتفاع بازشو (متر)</label>
                        <input id="openingRightHeight" type="number"
                               min="0.1" step="0.1" value="3">
                    </div>
                    <div>
                        <label>فاصله از ابتدای سوله (متر)</label>
                        <input id="openingRightPosition" type="number"
                               min="0" step="0.1" value="5">
                    </div>
                </div>
            </fieldset>

            <div class="actions">
                <button type="button" id="btnCheckOpenings" class="success">
                    کنترل ابعاد بازشوها
                </button>
            </div>
            <div id="openingStatus" class="notice">
                بازشوی پیش‌فرض جلویی فعال است.
            </div>
        `;

        const drawingPanel = $("frameDrawing")?.closest("section");
        if (drawingPanel) {
            drawingPanel.parentNode.insertBefore(panel, drawingPanel);
        } else {
            document.querySelector("main")?.appendChild(panel);
        }
    }

    function getData() {
        const result = {};

        ["front", "rear", "left", "right"].forEach(side => {
            const prefix = "opening" +
                side.charAt(0).toUpperCase() + side.slice(1);

            result[side] = {
                enabled: !!$(prefix + "Enabled")?.checked,
                width: number(prefix + "Width"),
                height: number(prefix + "Height"),
                position: side === "front"
                    ? 0
                    : number(prefix + "Position")
            };
        });

        result.windScenario = $("windOpeningScenario")?.value || DEFAULT_WIND_SCENARIO;
        return result;
    }

    function setData(data) {
        if (!data) return;

        ["front", "rear", "left", "right"].forEach(side => {
            const item = data[side];
            if (!item) return;

            const prefix = "opening" +
                side.charAt(0).toUpperCase() + side.slice(1);

            if ($(prefix + "Enabled")) {
                $(prefix + "Enabled").checked = item.enabled === undefined ? !!defaults[side].enabled : !!item.enabled;
            }

            ["width", "height"].forEach(key => {
                const field = $(prefix +
                    key.charAt(0).toUpperCase() + key.slice(1));
                if (field && Number.isFinite(Number(item[key]))) {
                    field.value = item[key];
                }
            });

            if (side !== "front") {
                const position = $(prefix + "Position");
                if (position && Number.isFinite(Number(item.position))) {
                    position.value = item.position;
                }
            }
        });
        const scenario = $("windOpeningScenario");
        if (scenario) scenario.value = ["closed","front-open","custom"].includes(data.windScenario) ? data.windScenario : DEFAULT_WIND_SCENARIO;
    }

    function validate() {
        const data = getData();
        const span = number("span");
        const length = number("length");
        const height = number("height");

        for (const side of ["front", "rear", "left", "right"]) {
            const item = data[side];
            if (!item.enabled) continue;

            const wallWidth =
                side === "front" || side === "rear"
                    ? span : length;

            if (!(item.width > 0 && item.height > 0)) {
                return "ابعاد بازشوی " + side + " معتبر نیست.";
            }

            if (item.width > wallWidth) {
                return "عرض بازشوی " + side +
                    " از طول دیوار بیشتر است.";
            }

            if (item.height > height) {
                return "ارتفاع بازشوی " + side +
                    " از ارتفاع ستون بیشتر است.";
            }

            if (side === "front") {
                if (item.width > span) {
                    return "عرض در جلویی از دهانه سوله بیشتر است.";
                }
            } else {
                if (item.position < 0 ||
                    item.position + item.width > wallWidth) {
                    return "موقعیت بازشوی " + side +
                        " خارج از محدوده دیوار است.";
                }
            }
        }

        return "";
    }

    function check() {
        const error = validate();
        const status = $("openingStatus");

        if (error) {
            status.textContent = "خطا: " + error;
            status.style.color = "#c74747";
            return false;
        }

        const scenario = $("windOpeningScenario")?.value || DEFAULT_WIND_SCENARIO;
        const scenarioText = scenario === "closed" ? "سناریوی باد: تمام درها بسته" :
            scenario === "front-open" ? "سناریوی باد: درِ اصلی جلو باز" : "سناریوی باد: بازشوهای سفارشی";
        status.textContent = "ابعاد و موقعیت بازشوهای فعال معتبر است. " + scenarioText + "؛ ضریب فشار داخلی باید جداگانه طبق ضوابط تعیین شود.";
        status.style.color = "#16845b";

        return true;
    }

    function connect() {
        addPanel();

        const button = $("btnCheckOpenings");
        if (button) button.addEventListener("click", check);
        ["windOpeningScenario","openingFrontEnabled","openingRearEnabled","openingLeftEnabled","openingRightEnabled"].forEach(id => $(id)?.addEventListener("change", check));

        panelListeners();
        check();
    }

    function panelListeners() {
        ["span", "length", "height"].forEach(id => {
            const field = $(id);
            if (field) {
                field.addEventListener("change", check);
            }
        });
    }

    window.SteelOpenings = {
        getData,
        setData,
        validate,
        check,
        defaults: JSON.parse(JSON.stringify(defaults)),
        defaultWindScenario: DEFAULT_WIND_SCENARIO
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connect);
    } else {
        connect();
    }
})();
