/* ===== steel2/js/openings.js ===== */

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


/* ===== steel2/js/views.js ===== */

/* SAHROUD STEEL - Building Views 1.1 */
(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";
    const $ = id => document.getElementById(id);

    function number(id) {
        const field = $(id);
        return field ? Number(field.value) : NaN;
    }

    function svgElement(svg, tag, attrs) {
        const element = document.createElementNS(NS, tag);

        Object.entries(attrs).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        svg.appendChild(element);
        return element;
    }

    function line(svg, x1, y1, x2, y2, color, width, dash) {
        const attrs = {
            x1, y1, x2, y2,
            stroke: color || "#64748b",
            "stroke-width": width || 1.5
        };

        if (dash) attrs["stroke-dasharray"] = dash;

        svgElement(svg, "line", attrs);
    }

    function rect(svg, x, y, w, h, fill, stroke, width) {
        svgElement(svg, "rect", {
            x, y,
            width: w,
            height: h,
            fill: fill || "none",
            stroke: stroke || "#334155",
            "stroke-width": width === undefined ? 1.5 : width
        });
    }

    function label(svg, x, y, value, size) {
        const element = svgElement(svg, "text", {
            x, y,
            fill: "#263746",
            "font-size": size || 12,
            "font-family": "Tahoma, Arial",
            "text-anchor": "middle"
        });

        element.textContent = value;
    }

    function prepareSvg(id, title) {
        const svg = $(id);
        if (!svg) return null;

        svg.innerHTML = "";
        svg.setAttribute("viewBox", "0 0 640 300");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        rect(svg, 0, 0, 640, 300, "#f8fafc", "none", 0);
        label(svg, 320, 24, title, 15);

        return svg;
    }

    function getOpenings() {
        if (window.SteelOpenings &&
            typeof window.SteelOpenings.getData === "function") {
            return window.SteelOpenings.getData();
        }

        return {
            front: { enabled: true, width: 5, height: 5, position: 0 },
            rear: { enabled: false, width: 3, height: 3, position: 0 },
            left: { enabled: false, width: 3, height: 3, position: 5 },
            right: { enabled: false, width: 3, height: 3, position: 5 }
        };
    }

    function drawEnd(id, side, span, height, rise, opening) {
        const title = side === "front" ? "نمای جلو" : "نمای عقب";
        const svg = prepareSvg(id, title);
        if (!svg) return;

        const x0 = 105;
        const x1 = 535;
        const ground = 245;
        const mid = (x0 + x1) / 2;

        const sx = (x1 - x0) / span;
        const sy = 175 / (height + rise);

        const eave = ground - height * sy;
        const ridge = ground - (height + rise) * sy;

        line(svg, 55, ground, 585, ground, "#475569", 2);

        // ستون‌ها
        line(svg, x0, ground, x0, eave, "#176b9b", 6);
        line(svg, x1, ground, x1, eave, "#176b9b", 6);

        // رفترهای سقف
        line(svg, x0, eave, mid, ridge, "#d97706", 6);
        line(svg, mid, ridge, x1, eave, "#d97706", 6);

        // نمایش بازشو
        if (opening && opening.enabled) {
            const w = opening.width * sx;
            const h = opening.height * sy;

            const ox = side === "front"
                ? mid - w / 2
                : x0 + opening.position * sx;

            rect(
                svg,
                ox,
                ground - h,
                w,
                h,
                "#dbeafe",
                "#dc2626",
                2
            );

            label(svg, ox + w / 2, ground - h / 2, "بازشو", 12);
        }

        label(svg, 320, 280, "دهانه: " + span + " متر", 12);
    }

    function getFrameCount(length, spacing, frames) {
        if (Number.isFinite(frames) && frames >= 2) {
            return Math.floor(frames);
        }

        return Math.max(2, Math.ceil(length / spacing) + 1);
    }

    function drawSide(id, side, length, height, spacing, frames, opening) {
        const title = side === "left"
            ? "نمای طولی چپ"
            : "نمای طولی راست";

        const svg = prepareSvg(id, title);
        if (!svg) return;

        const x0 = 65;
        const x1 = 575;
        const ground = 245;

        const sx = (x1 - x0) / length;
        const sy = 175 / height;
        const top = ground - height * sy;

        line(svg, 40, ground, 600, ground, "#475569", 2);

        // ستون ابتدا و انتهای سوله
        line(svg, x0, ground, x0, top, "#176b9b", 5);
        line(svg, x1, ground, x1, top, "#176b9b", 5);

        // خط بالای دیوار
        line(svg, x0, top, x1, top, "#176b9b", 4);

        const count = getFrameCount(length, spacing, frames);

        // موقعیت قاب‌ها
        for (let i = 0; i < count; i++) {
            const x = x0 + (x1 - x0) * i / (count - 1);

            line(
                svg,
                x,
                ground,
                x,
                top,
                "#94a3b8",
                1,
                "3 4"
            );

            label(svg, x, ground + 14, String(i + 1), 9);
        }

        // بازشوی دیوار طولی
        if (opening && opening.enabled) {
            const ox = x0 + opening.position * sx;
            const w = opening.width * sx;
            const h = opening.height * sy;

            rect(
                svg,
                ox,
                ground - h,
                w,
                h,
                "#dbeafe",
                "#dc2626",
                2
            );

            label(svg, ox + w / 2, ground - h / 2, "بازشو", 12);
        }

        label(
            svg,
            320,
            280,
            "طول: " + length + " متر | تعداد قاب: " + count,
            12
        );
    }

    function drawRoof(span, length, spacing, frames) {
        const svg = prepareSvg("viewRoof", "پلان شماتیک سقف");
        if (!svg) return;

        const x0 = 100;
        const x1 = 540;
        const y0 = 48;
        const y1 = 250;

        rect(
            svg,
            x0,
            y0,
            x1 - x0,
            y1 - y0,
            "#fff7ed",
            "#334155",
            2
        );

        const count = getFrameCount(length, spacing, frames);

        // خطوط قاب‌ها در پلان
        for (let i = 0; i < count; i++) {
            const y = y0 + (y1 - y0) * i / (count - 1);

            line(
                svg,
                x0,
                y,
                x1,
                y,
                "#64748b",
                1.5
            );
        }

        // خط تاج
        line(
            svg,
            320,
            y0,
            320,
            y1,
            "#d97706",
            2,
            "6 4"
        );

        label(svg, 320, 42, "جلو", 10);
        label(svg, 320, 266, "عقب", 10);

        label(
            svg,
            320,
            290,
            "دهانه: " + span + " متر | طول: " + length + " متر",
            12
        );
    }

    function drawAll() {
        const span = number("span");
        const length = number("length");
        const height = number("height");
        const rise = number("rise");
        const spacing = number("spacing");
        const frames = number("frames");

        if (
            ![span, length, height, rise, spacing].every(Number.isFinite) ||
            span <= 0 ||
            length <= 0 ||
            height <= 0 ||
            rise < 0 ||
            spacing <= 0
        ) {
            return false;
        }

        const openings = getOpenings();

        drawEnd(
            "viewFront",
            "front",
            span,
            height,
            rise,
            openings.front
        );

        drawEnd(
            "viewRear",
            "rear",
            span,
            height,
            rise,
            openings.rear
        );

        drawSide(
            "viewLeft",
            "left",
            length,
            height,
            spacing,
            frames,
            openings.left
        );

        drawSide(
            "viewRight",
            "right",
            length,
            height,
            spacing,
            frames,
            openings.right
        );

        drawRoof(span, length, spacing, frames);

        return true;
    }

    function makeSvg(parent, id, title) {
        const area = document.createElement("div");
        area.className = "drawing-area";

        const heading = document.createElement("h4");
        heading.textContent = title;
        area.appendChild(heading);

        const svg = document.createElementNS(NS, "svg");
        svg.id = id;
        svg.setAttribute("viewBox", "0 0 640 300");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        svg.style.width = "100%";
        svg.style.height = "auto";
        svg.style.display = "block";

        area.appendChild(svg);
        parent.appendChild(area);
    }

    function addPanel() {
        if ($("buildingViewsPanel")) return;

        const panel = document.createElement("section");
        panel.id = "buildingViewsPanel";
        panel.className = "panel";

        const heading = document.createElement("div");
        heading.className = "panel-title";

        const h3 = document.createElement("h3");
        h3.textContent = "۹ ـ نماهای هندسی سوله";

        const status = document.createElement("span");
        status.className = "status";
        status.textContent = "نمایش شماتیک";

        heading.appendChild(h3);
        heading.appendChild(status);
        panel.appendChild(heading);

        const note = document.createElement("div");
        note.className = "notice";
        note.textContent =
            "این نقشه‌ها نمایش هندسی اولیه هستند و هنوز نقشه اجرایی یا مدل تحلیل سه‌بعدی نیستند. بازشوهای تعریف‌شده در نماها نمایش داده می‌شوند.";
        panel.appendChild(note);

        makeSvg(panel, "viewFront", "نمای جلو");
        makeSvg(panel, "viewRear", "نمای عقب");
        makeSvg(panel, "viewLeft", "نمای طولی چپ");
        makeSvg(panel, "viewRight", "نمای طولی راست");
        makeSvg(panel, "viewRoof", "پلان سقف");

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn primary";
        button.textContent = "به‌روزرسانی نقشه‌ها";
        button.addEventListener("click", drawAll);

        panel.appendChild(button);

        // قرار دادن پنل بعد از بخش نمایش قاب
        const frameDrawing = $("frameDrawing");
        const framePanel = frameDrawing
            ? frameDrawing.closest("section")
            : null;

        if (framePanel && framePanel.parentNode) {
            framePanel.parentNode.insertBefore(
                panel,
                framePanel.nextSibling
            );
        } else {
            const main = document.querySelector("main");

            if (main) {
                main.appendChild(panel);
            }
        }
    }

    function connect() {
        addPanel();

        drawAll();

        const fields = [
            "span",
            "length",
            "spacing",
            "height",
            "rise",
            "frames",
            "openingFrontWidth",
            "openingFrontHeight",
            "openingRearEnabled",
            "openingRearWidth",
            "openingRearHeight",
            "openingRearPosition",
            "openingLeftEnabled",
            "openingLeftWidth",
            "openingLeftHeight",
            "openingLeftPosition",
            "openingRightEnabled",
            "openingRightWidth",
            "openingRightHeight",
            "openingRightPosition"
        ];

        fields.forEach(id => {
            const field = $(id);

            if (field) {
                field.addEventListener("change", drawAll);
                field.addEventListener("input", drawAll);
            }
        });
    }

    window.SteelViews = {
        drawAll: drawAll
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connect);
    } else {
        connect();
    }
})();


/* ===== steel2/js/bracing.js ===== */

/* SAHROUD STEEL - Preliminary Bracing Layout 2.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const NS = "http://www.w3.org/2000/svg";

    const CONFIG = {
        color: "#dc2626",
        width: 3.5,
        minBayWidth: 8
    };

    function number(id) {
        const field = $(id);
        return field ? Number(field.value) : NaN;
    }

    function svgLine(svg, x1, y1, x2, y2, width) {
        const line = document.createElementNS(NS, "line");

        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", CONFIG.color);
        line.setAttribute("stroke-width", width || CONFIG.width);
        line.setAttribute("stroke-linecap", "round");

        svg.appendChild(line);
    }

    function svgText(svg, x, y, value) {
        const text = document.createElementNS(NS, "text");

        text.setAttribute("x", x);
        text.setAttribute("y", y);
        text.setAttribute("fill", CONFIG.color);
        text.setAttribute("font-size", "11");
        text.setAttribute("font-family", "Tahoma, Arial");
        text.setAttribute("text-anchor", "middle");

        text.textContent = value;
        svg.appendChild(text);
    }

    function getOpenings() {
        if (
            window.SteelOpenings &&
            typeof window.SteelOpenings.getData === "function"
        ) {
            return window.SteelOpenings.getData();
        }

        return {
            front: { enabled: true, width: 5, height: 5, position: 0 },
            rear: { enabled: false, width: 3, height: 3, position: 0 },
            left: { enabled: false, width: 3, height: 3, position: 5 },
            right: { enabled: false, width: 3, height: 3, position: 5 }
        };
    }

    function overlaps(a1, a2, b1, b2) {
        return Math.min(a2, b2) - Math.max(a1, b1) > 0.001;
    }

    function openingBlocksBay(opening, start, end) {
        if (!opening || !opening.enabled) return false;

        const openStart = Number(opening.position);
        const openEnd = openStart + Number(opening.width);

        return overlaps(start, end, openStart, openEnd);
    }

    function selectBracingBays(length, frameCount, openings) {
        const bayCount = frameCount - 1;
        const bayLength = length / bayCount;
        const available = [];

        for (let i = 0; i < bayCount; i++) {
            const start = i * bayLength;
            const end = (i + 1) * bayLength;

            const blockedLeft = openingBlocksBay(
                openings.left, start, end
            );

            const blockedRight = openingBlocksBay(
                openings.right, start, end
            );

            if (!blockedLeft && !blockedRight) {
                available.push(i);
            }
        }

        if (available.length === 0) {
            return { selected: [], available: [], bayLength };
        }

        const selected = [available[0]];

        if (available.length > 1) {
            const last = available[available.length - 1];

            if (last !== selected[0]) {
                selected.push(last);
            }
        }

        return { selected, available, bayLength };
    }

    // مهاربند ضربدری دیوارهای طولی
    function drawSideBraces(svgId, selected, length, frameCount) {
        const svg = $(svgId);
        if (!svg) return;

        const x0 = 65;
        const x1 = 575;
        const ground = 245;
        const top = 70;
        const bayCount = frameCount - 1;

        selected.forEach(index => {
            const xa = x0 + (x1 - x0) * index / bayCount;
            const xb = x0 + (x1 - x0) * (index + 1) / bayCount;

            svgLine(svg, xa, ground, xb, top);
            svgLine(svg, xa, top, xb, ground);

            svgText(svg, (xa + xb) / 2, 95, "X");
        });
    }

    // مهاربندهای صفحه سقف
    function drawRoofBraces(selected, frameCount) {
        const svg = $("viewRoof");
        if (!svg) return;

        const x0 = 100;
        const x1 = 540;
        const y0 = 48;
        const y1 = 250;
        const bayCount = frameCount - 1;

        selected.forEach(index => {
            const ya = y0 + (y1 - y0) * index / bayCount;
            const yb = y0 + (y1 - y0) * (index + 1) / bayCount;

            svgLine(svg, x0, ya, x1, yb);
            svgLine(svg, x1, ya, x0, yb);

            svgText(svg, 320, (ya + yb) / 2, "X");
        });
    }

    // محاسبه محدوده بازشو در دیوار جلو یا عقب
    function getEndOpeningInterval(opening, side, x0, x1, span) {
        if (!opening || !opening.enabled) return null;

        const width = Number(opening.width);

        if (!Number.isFinite(width) || width <= 0) {
            return null;
        }

        const sx = (x1 - x0) / span;

        let start;

        if (side === "front") {
            start = (x0 + x1) / 2 - width * sx / 2;
        } else {
            start = x0 + Number(opening.position) * sx;
        }

        const end = start + width * sx;

        return {
            start: Math.max(x0, Math.min(x1, start)),
            end: Math.max(x0, Math.min(x1, end))
        };
    }

    // رسم ضربدر در یک قسمت آزاد دیوار انتهایی
    function drawEndBraceSegment(svg, xa, xb, ground, top) {
        if (xb - xa < CONFIG.minBayWidth) return false;

        svgLine(svg, xa, ground, xb, top);
        svgLine(svg, xa, top, xb, ground);

        svgText(svg, (xa + xb) / 2, (ground + top) / 2, "X");

        return true;
    }

    // مهاربندی دیوار جلو و عقب با رعایت بازشو
    function drawEndBraces(svgId, side, opening, span, height, rise) {
        const svg = $(svgId);
        if (!svg) return { count: 0, blocked: false };

        const x0 = 105;
        const x1 = 535;
        const ground = 245;
        const sy = 175 / (height + rise);
        const top = ground - height * sy;

        const interval = getEndOpeningInterval(
            opening, side, x0, x1, span
        );

        let count = 0;

        if (!interval) {
            if (drawEndBraceSegment(svg, x0, x1, ground, top)) {
                count++;
            }

            return { count, blocked: false };
        }

        // قسمت آزاد سمت چپ بازشو
        if (
            drawEndBraceSegment(
                svg, x0, interval.start, ground, top
            )
        ) {
            count++;
        }

        // قسمت آزاد سمت راست بازشو
        if (
            drawEndBraceSegment(
                svg, interval.end, x1, ground, top
            )
        ) {
            count++;
        }

        return {
            count,
            blocked: true
        };
    }

    function addPanel() {
        if ($("bracingPanel")) return;

        const panel = document.createElement("section");
        panel.id = "bracingPanel";
        panel.className = "panel";

        const heading = document.createElement("div");
        heading.className = "panel-title";

        const title = document.createElement("h3");
        title.textContent = "۱۰ ـ جانمایی اولیه مهاربندها";

        const status = document.createElement("span");
        status.className = "status";
        status.textContent = "جانمایی خودکار";

        heading.appendChild(title);
        heading.appendChild(status);
        panel.appendChild(heading);

        const note = document.createElement("div");
        note.className = "notice";
        note.textContent =
            "مهاربندهای قرمز در دیوارهای طولی، جلو، عقب و صفحه سقف نمایش داده می‌شوند. " +
            "در دیوار جلو، محدوده در اصلی خالی می‌ماند و در دیوار عقب نیز بازشو رعایت می‌شود. " +
            "این ترسیم مقدماتی است و ظرفیت اعضا و اتصالات هنوز محاسبه نشده است.";

        panel.appendChild(note);

        const result = document.createElement("div");
        result.id = "bracingStatus";
        result.className = "notice";
        result.textContent = "در انتظار محاسبه جانمایی مهاربندها...";
        panel.appendChild(result);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn primary";
        button.textContent = "محاسبه مجدد جانمایی مهاربندها";
        button.addEventListener("click", drawAll);

        panel.appendChild(button);

        const viewsPanel = $("buildingViewsPanel");

        if (viewsPanel && viewsPanel.parentNode) {
            viewsPanel.parentNode.insertBefore(
                panel,
                viewsPanel.nextSibling
            );
        } else {
            document.querySelector("main")?.appendChild(panel);
        }
    }

    function drawAll() {
        const length = number("length");
        const span = number("span");
        const spacing = number("spacing");
        const height = number("height");
        const rise = number("rise");
        const frames = number("frames");

        const result = $("bracingStatus");

        if (
            !Number.isFinite(length) ||
            !Number.isFinite(span) ||
            !Number.isFinite(spacing) ||
            !Number.isFinite(height) ||
            !Number.isFinite(rise) ||
            length <= 0 ||
            span <= 0 ||
            spacing <= 0 ||
            height <= 0 ||
            rise < 0
        ) {
            if (result) {
                result.textContent =
                    "ابتدا ابعاد معتبر سوله را وارد کنید.";
            }

            return false;
        }

        const frameCount =
            Number.isFinite(frames) && frames >= 2
                ? Math.floor(frames)
                : Math.ceil(length / spacing) + 1;

        if (frameCount < 2) return false;

        // بازسازی نماهای پایه
        if (
            window.SteelViews &&
            typeof window.SteelViews.drawAll === "function"
        ) {
            window.SteelViews.drawAll();
        }

        const openings = getOpenings();

        const layout = selectBracingBays(
            length,
            frameCount,
            openings
        );

        if (layout.selected.length === 0) {
            if (result) {
                result.textContent =
                    "هشدار: دهانه آزادی برای مهاربندی طولی و سقف پیدا نشد. " +
                    "محل بازشوها باید بازنگری شود.";
            }

            return false;
        }

        // مهاربندهای دو دیوار طولی
        drawSideBraces(
            "viewLeft",
            layout.selected,
            length,
            frameCount
        );

        drawSideBraces(
            "viewRight",
            layout.selected,
            length,
            frameCount
        );

        // مهاربندهای سقف در دهانه‌های هماهنگ
        drawRoofBraces(
            layout.selected,
            frameCount
        );

        // مهاربندهای دیوار جلو و عقب
        const front = drawEndBraces(
            "viewFront",
            "front",
            openings.front,
            span,
            height,
            rise
        );

        const rear = drawEndBraces(
            "viewRear",
            "rear",
            openings.rear,
            span,
            height,
            rise
        );

        const bayNames = layout.selected.map(
            index => "دهانه " + (index + 1)
        );

        if (result) {
            let message =
                "مهاربندهای طولی و سقف در " +
                bayNames.join(" و ") +
                " نمایش داده شدند. ";

            message +=
                "دیوار جلو: " + front.count +
                " قسمت مهاربندی‌شده در دو طرف در. ";

            message +=
                "دیوار عقب: " + rear.count +
                " قسمت مهاربندی‌شده";

            if (rear.blocked) {
                message += " با رعایت بازشو.";
            } else {
                message += " در دیوار بدون بازشو.";
            }

            message +=
                " توجه: این جانمایی شماتیک است و باید در طراحی نهایی کنترل شود.";

            result.textContent = message;
        }

        return true;
    }

    function connect() {
        addPanel();
        drawAll();

        [
            "span",
            "length",
            "spacing",
            "height",
            "rise",
            "frames",

            "openingFrontWidth",
            "openingFrontHeight",

            "openingRearEnabled",
            "openingRearWidth",
            "openingRearHeight",
            "openingRearPosition",

            "openingLeftEnabled",
            "openingLeftWidth",
            "openingLeftPosition",

            "openingRightEnabled",
            "openingRightWidth",
            "openingRightPosition"
        ].forEach(id => {
            const field = $(id);

            if (field) {
                field.addEventListener("change", drawAll);
                field.addEventListener("input", drawAll);
            }
        });
    }

    window.SteelBracing = {
        drawAll: drawAll
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connect);
    } else {
        connect();
    }
})();


/* ===== steel2/js/ties.js ===== */

/* SAHROUD STEEL - Wall Ties Manager 2.1 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const NS = "http://www.w3.org/2000/svg";

    const COLORS = {
        upper: "#15803d",
        lower: "#7c3aed"
    };

    function number(id) {
        const el = $(id);
        return el ? Number(el.value) : NaN;
    }

    function getOpenings() {
        if (window.SteelOpenings &&
            typeof window.SteelOpenings.getData === "function") {
            return window.SteelOpenings.getData();
        }

        return {
            front: { enabled: true, width: 5, height: 5, position: 0 },
            rear: { enabled: false, width: 3, height: 3, position: 0 },
            left: { enabled: false, width: 3, height: 3, position: 5 },
            right: { enabled: false, width: 3, height: 3, position: 5 }
        };
    }

    function addLine(svg, x1, y1, x2, y2, color, width) {
        const line = document.createElementNS(NS, "line");

        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", width);
        line.setAttribute("stroke-linecap", "round");

        svg.appendChild(line);
    }

    function addText(svg, x, y, value, color) {
        const el = document.createElementNS(NS, "text");

        el.setAttribute("x", x);
        el.setAttribute("y", y);
        el.setAttribute("fill", color);
        el.setAttribute("font-size", "11");
        el.setAttribute("font-family", "Tahoma, Arial");
        el.setAttribute("text-anchor", "middle");

        el.textContent = value;
        svg.appendChild(el);
    }

    function overlaps(a1, a2, b1, b2) {
        return Math.min(a2, b2) - Math.max(a1, b1) > 0.001;
    }

    function getFrameCount(length, spacing, frames) {
        if (Number.isFinite(frames) && frames >= 2) {
            return Math.floor(frames);
        }

        return Math.max(2, Math.ceil(length / spacing) + 1);
    }

    function openingBlocksTie(opening, tieHeight) {
        if (!opening || !opening.enabled) return false;

        const openingHeight = Number(opening.height);

        if (!Number.isFinite(openingHeight)) return true;

        return openingHeight >= tieHeight - 0.001;
    }

    function drawHorizontalWithOpening(
        svg, x0, x1, y,
        openingStart, openingEnd,
        blocked, color, width
    ) {
        if (!blocked) {
            addLine(svg, x0, y, x1, y, color, width);
            return;
        }

        const start = Math.max(x0, Math.min(x1, openingStart));
        const end = Math.max(x0, Math.min(x1, openingEnd));

        if (start > x0) {
            addLine(svg, x0, y, start, y, color, width);
        }

        if (end < x1) {
            addLine(svg, end, y, x1, y, color, width);
        }
    }

    // قیدهای دیوارهای طولی چپ و راست
    function drawSideTies(
        svgId, opening, length,
        height, frameCount, lowerEnabled
    ) {
        const svg = $(svgId);
        if (!svg) return { skipped: 0 };

        const x0 = 65;
        const x1 = 575;
        const ground = 245;

        const sx = (x1 - x0) / length;
        const sy = 175 / height;
        const topY = ground - height * sy;

        const openingStart = opening && opening.enabled
            ? x0 + Number(opening.position) * sx
            : 0;

        const openingEnd = opening && opening.enabled
            ? openingStart + Number(opening.width) * sx
            : 0;

        drawHorizontalWithOpening(
            svg, x0, x1, topY,
            openingStart, openingEnd,
            openingBlocksTie(opening, height),
            COLORS.upper, 5
        );

        addText(svg, 320, topY - 9, "قید بالایی", COLORS.upper);

        if (!lowerEnabled) {
            return { skipped: 0 };
        }

        const lowerHeight = height - 1.5;

        if (lowerHeight <= 0) {
            return { skipped: 0, invalid: true };
        }

        const lowerY = ground - lowerHeight * sy;
        const bayCount = frameCount - 1;

        let skipped = 0;

        for (let i = 0; i < bayCount; i++) {
            const start = length * i / bayCount;
            const end = length * (i + 1) / bayCount;

            const blocked =
                openingBlocksTie(opening, lowerHeight) &&
                overlaps(
                    start,
                    end,
                    Number(opening.position),
                    Number(opening.position) + Number(opening.width)
                );

            if (blocked) {
                skipped++;
                continue;
            }

            const xa = x0 + start * sx;
            const xb = x0 + end * sx;

            addLine(svg, xa, lowerY, xb, lowerY, COLORS.lower, 4);
        }

        addText(
            svg, 320, lowerY - 9,
            "قید دوم: ۱٫۵ متر پایین‌تر",
            COLORS.lower
        );

        return { skipped };
    }

    // قیدهای دیوارهای انتهایی جلو و عقب
    function drawEndTies(
        svgId, opening, span,
        height, rise, lowerEnabled, side
    ) {
        const svg = $(svgId);
        if (!svg) return { skipped: 0 };

        const x0 = 105;
        const x1 = 535;
        const ground = 245;

        const sx = (x1 - x0) / span;
        const sy = 175 / (height + rise);

        const eaveY = ground - height * sy;

        let openingStart = 0;
        let openingEnd = 0;

        if (opening && opening.enabled) {
            const openingWidth = Number(opening.width);

            if (side === "front") {
                openingStart =
                    (x0 + x1) / 2 - openingWidth * sx / 2;
            } else {
                openingStart =
                    x0 + Number(opening.position) * sx;
            }

            openingEnd = openingStart + openingWidth * sx;
        }

        drawHorizontalWithOpening(
            svg, x0, x1, eaveY,
            openingStart, openingEnd,
            openingBlocksTie(opening, height),
            COLORS.upper, 5
        );

        addText(svg, 320, eaveY - 9, "قید بالایی", COLORS.upper);

        if (!lowerEnabled) {
            return { skipped: 0 };
        }

        const lowerHeight = height - 1.5;

        if (lowerHeight <= 0) {
            return { skipped: 0, invalid: true };
        }

        const lowerY = ground - lowerHeight * sy;

        const blocked = openingBlocksTie(opening, lowerHeight);

        if (blocked) {
            drawHorizontalWithOpening(
                svg, x0, x1, lowerY,
                openingStart, openingEnd,
                true, COLORS.lower, 4
            );
        } else {
            addLine(svg, x0, lowerY, x1, lowerY, COLORS.lower, 4);
        }

        addText(
            svg, 320, lowerY - 9,
            "قید دوم: ۱٫۵ متر پایین‌تر",
            COLORS.lower
        );

        return { skipped: blocked ? 1 : 0 };
    }

    function addPanel() {
        if ($("tiesPanel")) return;

        const panel = document.createElement("section");
        panel.id = "tiesPanel";
        panel.className = "panel";

        const heading = document.createElement("div");
        heading.className = "panel-title";

        const title = document.createElement("h3");
        title.textContent = "۱۱ ـ قیدهای افقی دیوارهای سوله";

        const status = document.createElement("span");
        status.className = "status";
        status.textContent = "تنظیم قیدها";

        heading.appendChild(title);
        heading.appendChild(status);
        panel.appendChild(heading);

        const note = document.createElement("div");
        note.className = "notice";
        note.textContent =
            "قید بالایی و قید دوم در چهار دیوار جلو، عقب، چپ و راست نمایش داده می‌شوند. " +
            "قید دوم در فاصله ۱٫۵ متر پایین‌تر از بالای ستون قرار می‌گیرد و در محدوده بازشوهای متداخل حذف می‌شود.";

        panel.appendChild(note);

        const option = document.createElement("label");
        option.style.display = "block";
        option.style.margin = "12px 0";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "enableLowerTie";
        checkbox.checked = false;

        option.appendChild(checkbox);

        option.appendChild(
            document.createTextNode(
                " فعال‌سازی قید دوم در فاصله ۱٫۵ متر پایین‌تر از بالای ستون"
            )
        );

        panel.appendChild(option);

        const legend = document.createElement("div");
        legend.className = "notice";

        legend.innerHTML =
            '<span style="color:#15803d;font-weight:bold">■ قید بالایی</span>' +
            '<br><span style="color:#7c3aed;font-weight:bold">■ قید دوم</span>';

        panel.appendChild(legend);

        const result = document.createElement("div");
        result.id = "tiesStatus";
        result.className = "notice";
        result.textContent = "در انتظار ترسیم قیدها...";

        panel.appendChild(result);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn primary";
        button.textContent = "به‌روزرسانی قیدها";
        button.addEventListener("click", drawAll);

        panel.appendChild(button);

        const bracingPanel = $("bracingPanel");

        if (bracingPanel && bracingPanel.parentNode) {
            bracingPanel.parentNode.insertBefore(
                panel, bracingPanel.nextSibling
            );
        } else {
            document.querySelector("main")?.appendChild(panel);
        }
    }

    function drawAll() {
        const length = number("length");
        const span = number("span");
        const height = number("height");
        const rise = number("rise");
        const spacing = number("spacing");
        const frames = number("frames");

        const result = $("tiesStatus");

        if (
            ![length, span, height, rise, spacing].every(Number.isFinite) ||
            length <= 0 ||
            span <= 0 ||
            height <= 0 ||
            rise < 0 ||
            spacing <= 0
        ) {
            if (result) {
                result.textContent = "ابتدا ابعاد معتبر سوله را وارد کنید.";
            }

            return false;
        }

        const lowerEnabled =
            !!($("enableLowerTie") && $("enableLowerTie").checked);

        const frameCount = getFrameCount(length, spacing, frames);

        // ابتدا مهاربندی و نماهای پایه بازسازی می‌شوند.
        // سپس قیدهای افقی رسم می‌شوند تا پاک نشوند.
        if (
            window.SteelBracing &&
            typeof window.SteelBracing.drawAll === "function"
        ) {
            window.SteelBracing.drawAll();
        } else if (
            window.SteelViews &&
            typeof window.SteelViews.drawAll === "function"
        ) {
            window.SteelViews.drawAll();
        }

        const openings = getOpenings();

        const left = drawSideTies(
            "viewLeft", openings.left,
            length, height, frameCount, lowerEnabled
        );

        const right = drawSideTies(
            "viewRight", openings.right,
            length, height, frameCount, lowerEnabled
        );

        const front = drawEndTies(
            "viewFront", openings.front,
            span, height, rise, lowerEnabled, "front"
        );

        const rear = drawEndTies(
            "viewRear", openings.rear,
            span, height, rise, lowerEnabled, "rear"
        );

        if (result) {
            let message =
                "قید بالایی در چهار دیوار جلو، عقب، چپ و راست نمایش داده شد.";

            if (lowerEnabled) {
                if (height <= 1.5) {
                    message +=
                        " ارتفاع ستون برای قرارگیری قید دوم کافی نیست.";
                } else {
                    message +=
                        " قید دوم در هر چهار نما بررسی و ترسیم شد.";

                    const skipped =
                        left.skipped +
                        right.skipped +
                        front.skipped +
                        rear.skipped;

                    if (skipped > 0) {
                        message +=
                            " در " + skipped +
                            " بخش به علت تداخل با بازشو، قید دوم حذف شد.";
                    } else {
                        message +=
                            " تداخلی با بازشوهای ثبت‌شده مشاهده نشد.";
                    }
                }
            } else {
                message += " قید دوم غیرفعال است.";
            }

            result.textContent = message;
        }

        return true;
    }

    // دریافت تنظیمات برای ذخیره در فایل پروژه
    function getData() {
        return {
            lowerEnabled: !!(
                $("enableLowerTie") &&
                $("enableLowerTie").checked
            ),
            lowerOffset: 1.5
        };
    }

    // بازیابی تنظیمات از فایل پروژه
    function setData(data) {
        data = data && typeof data === "object" ? data : {};

        const checkbox = $("enableLowerTie");

        if (checkbox) {
            checkbox.checked = data.lowerEnabled === true;
        }

        drawAll();
        return true;
    }

    function connect() {
        addPanel();

        const checkbox = $("enableLowerTie");

        if (checkbox) {
            checkbox.addEventListener("change", drawAll);
        }

        [
            "length",
            "span",
            "height",
            "rise",
            "spacing",
            "frames",

            "openingFrontWidth",
            "openingFrontHeight",

            "openingRearEnabled",
            "openingRearWidth",
            "openingRearHeight",
            "openingRearPosition",

            "openingLeftEnabled",
            "openingLeftWidth",
            "openingLeftHeight",
            "openingLeftPosition",

            "openingRightEnabled",
            "openingRightWidth",
            "openingRightHeight",
            "openingRightPosition"
        ].forEach(id => {
            const field = $(id);

            if (field) {
                field.addEventListener("change", drawAll);
                field.addEventListener("input", drawAll);
            }
        });

        drawAll();
    }

    window.SteelTies = {
        drawAll: drawAll,
        getData: getData,
        setData: setData
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connect);
    } else {
        connect();
    }
})();


/* ===== steel2/js/loads.js ===== */


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
        snowLeft: 1.0,
        snowRight: 1.0,
        windLeft: 0,
        windRight: 0,
        windWall: 0,
        windEndFront: 0,
        windEndBack: 0,
        windDirection: "left-to-right",
        note: "",
        climate: {
            city: "shahroud",
            customCity: "شاهرود",
            elevation: "1350",
            source: "مبحث ششم ۱۳۹۸؛ سرعت باد ۹۰ km/h مطابق جدول ۶-۱۰-۱ مبحث ششم ۱۳۹۸؛ ارتفاع ۱۳۵۰ متر برآورد تقریبی مرکز شهرک صنعتی شاهرود",
            groundSnow: "1.0",
            basicWind: "90",
            terrain: "suburban",
            topography: "normal",
            buildingUse: "industrial",
            openingState: "enclosed",
            openingArea: 25,
            envelopeArea: "",
            dominantOpening: "unknown"
        }
    };

    const combinations = [
        { name: "ULS-1 ـ 1.4D", dead: 1.4, live: 0, snow: 0 },
        { name: "ULS-2 ـ 1.2D + 1.6L + 0.5S", dead: 1.2, live: 1.6, snow: 0.5 },
        { name: "ULS-3 ـ 1.2D + 1.6S + 0.5L", dead: 1.2, live: 0.5, snow: 1.6 }
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
                بارها به صورت سطحی و بر حسب kN/m² وارد می‌شوند. پیش‌فرض شاهرود: Pg=1.0 kN/m² (منطقه برف ۳)، سرعت مبنای باد V=90 km/h مطابق جدول ۶-۱۰-۱ مبحث ششم ۱۳۹۸؛ فشار مبنا q به‌صورت خودکار از رابطه آیین‌نامه‌ای محاسبه می‌شود.
                بار برف حداقل بام برای شیب ۲۰٪ و فرض ضریب اهمیت ۱، برابر ۱٫۰ kN/m² منظور شده است. مقادیر سقف چپ و راست مستقل هستند.
                ورودی‌های باد در این مرحله فشار خالص دستی هستند؛ مثبت به معنی فشار به داخل و منفی به معنی مکش به بیرون است.
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
                    <label for="climateGroundSnow">بار برف مبنا Ps (kN/m²)</label>
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

            <h4>ج ـ اطلاعات بازشوها برای ارزیابی فشار داخلی باد</h4>
            <div class="notice">
                کاربری و طبقه‌بندی اولیه پوسته در بخش «مبانی طراحی و نیازهای بهره‌برداری» تعیین می‌شود.
                این بخش فقط داده‌های هندسی بازشوها را ثبت می‌کند؛ انتخاب باز بودن در به‌تنهایی طبقه‌بندی نیمه‌بسته یا بازشوی غالب را اثبات نمی‌کند.
            </div>
            <div class="form-grid">
                <div class="field">
                    <label for="buildingOpeningArea">مجموع مساحت بازشوهای مؤثر (m²)</label>
                    <input id="buildingOpeningArea" type="number" min="0" step="0.1" value="25">
                </div>
                <div class="field">
                    <label for="buildingEnvelopeArea">مساحت پوسته مبنای مقایسه (m²)</label>
                    <input id="buildingEnvelopeArea" type="number" min="0" step="0.1" placeholder="بر اساس تعریف آیین‌نامه">
                </div>
                <div class="field">
                    <label for="buildingDominantOpening">وضعیت بازشوی غالب (پس از بررسی نسبت مساحت‌ها)</label>
                    <select id="buildingDominantOpening">
                        <option value="unknown" selected>نامشخص / هنوز محاسبه نشده</option>
                        <option value="yes">وجود دارد و احراز شده</option>
                        <option value="no">وجود ندارد و احراز شده</option>
                    </select>
                </div>
            </div>
            <div class="notice" id="climateNotice">
                پیش‌فرض شاهرود: Pg=1.0 kN/m²، منطقه ۳؛ V=90 km/h مطابق جدول ۶-۱۰-۱ مبحث ششم ۱۳۹۸. ارتفاع محل ۱۳۵۰ متر و زبری زمین «حومه و موانع پراکنده» به‌صورت مقدماتی ثبت شده‌اند.
            </div>
            <div class="notice" id="windReferenceResult">
                فشار مبنای باد پس از بارگذاری اطلاعات محاسبه می‌شود.
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
                ${input("loadWindLeft", "فشار خالص باد سقف سمت چپ", state.windLeft, true)}
                ${input("loadWindRight", "فشار خالص باد سقف سمت راست", state.windRight, true)}
                ${input("loadWindWall", "فشار خالص باد دیوارهای طولی (دو طرف)", state.windWall, true)}
                ${input("loadWindEndFront", "فشار خالص دیوار انتهایی جلو (وجه z=0)", state.windEndFront, true)}
                ${input("loadWindEndBack", "فشار خالص دیوار انتهایی عقب (وجه z=L)", state.windEndBack, true)}
            </div>
            <div class="notice">
                برای تحلیل آزمایشی باد، این سه ورودی باید «فشار خالص وارد بر سطح» بر حسب kN/m² باشند، نه سرعت مبنای باد.
                مقدار مثبت یعنی فشار به سمت داخل سالن و مقدار منفی یعنی مکش به سمت بیرون.
                فشار سقف به‌صورت عمود بر هر شیب و فشار دیوار به‌صورت عمود بر دو دیوار طولی به مدل منتقل می‌شود.
                مقدار دیوار طولی برای دو طرف یکسان فرض می‌شود. دو ورودی جداگانه برای دیوارهای انتهایی جلو و عقب نیز اضافه شده‌اند و به تیرهای افقی endGirt منتقل می‌شوند.
                ناحیه مثلثی بالای دیوار انتهایی (زیر سقف شیبدار)، فشارهای موضعی لبه/گوشه و ضرایب بادگیر/بادپناه هنوز در این مرحله منظور نشده‌اند.
                این ورودی‌ها فشار خالص دستی هستند و باید توسط مهندس محاسب از محاسبه معتبر باد تعیین شوند.
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
            windWall: "loadWindWall",
            windEndFront: "loadWindEndFront",
            windEndBack: "loadWindEndBack"
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
            openingArea: "buildingOpeningArea",
            envelopeArea: "buildingEnvelopeArea",
            dominantOpening: "buildingDominantOpening"
        };
        Object.keys(climateFields).forEach(key => {
            const el = $(climateFields[key]);
            if (el) state.climate[key] = el.value;
        });
        if (window.SteelDesignCore && typeof window.SteelDesignCore.getData === "function") {
            const brief = window.SteelDesignCore.getData();
            state.climate.buildingUse = brief.occupancy || "industrial";
            state.climate.openingState = brief.enclosure || "enclosed";
        }
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
            data.windWall,
            data.windEndFront,
            data.windEndBack
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
            <p>فشار خالص باد دیوارهای طولی: ${data.windWall.toFixed(3)} kN/m²</p>
            <p>فشار خالص دیوار انتهایی جلو: ${data.windEndFront.toFixed(3)} kN/m²</p>
            <p>فشار خالص دیوار انتهایی عقب: ${data.windEndBack.toFixed(3)} kN/m²</p>
        `;
    }

    function updateWindReference() {
        const v = Number($("climateBasicWind")?.value);
        const altitude = $("climateElevation")?.value;
        const terrain = $("climateTerrain")?.value || "";
        const columnHeight = Number($("height")?.value);
        const ridgeRise = Number($("rise")?.value);
        const out = $("windReferenceResult");
        if (!out) return;
        if (!Number.isFinite(v) || v <= 0) {
            out.textContent = "برای محاسبه فشار مبنا، سرعت باد معتبر را از جدول ۶-۱۰-۱ وارد کنید.";
            return;
        }
        const vms = v / 3.6;
        const q = 0.000613 * vms * vms;
        const terrainText = terrain === "open" ? "باز و هموار" :
            terrain === "suburban" ? "حومه و موانع پراکنده" :
            terrain === "urban" ? "شهری و متراکم" : "انتخاب‌نشده";
        const geometryText = Number.isFinite(columnHeight) && columnHeight > 0 &&
            Number.isFinite(ridgeRise) && ridgeRise >= 0
            ? "ارتفاع ستون: " + columnHeight.toFixed(2) +
              " m؛ افزایش ارتفاع تا تاج: " + ridgeRise.toFixed(2) +
              " m؛ ارتفاع کل تا تاج: " + (columnHeight + ridgeRise).toFixed(2) + " m. "
            : "ارتفاع ستون یا افزایش ارتفاع تا تاج هنوز کامل نیست. ";
        out.textContent =
            "فشار مبنای محاسبه‌شده q = " + q.toFixed(3) + " kN/m² (رابطه q=0.000613V² با V بر حسب m/s؛ سرعت ورودی " + v.toFixed(1) + " km/h). " +
            "ارتفاع محل از سطح دریا: " + (altitude === "" ? "ثبت‌نشده" : altitude + " m") +
            "؛ رده زبری: " + terrainText + ". " + geometryText +
            "ارتفاع محل از سطح دریا با ارتفاع نقطه سازه از سطح زمین متفاوت است. ارتفاع‌های هندسی بالا صرفاً اطلاعات مدل‌اند و تا تطبیق دقیق بندهای مبحث ششم، ضریب Ce از آن‌ها محاسبه نمی‌شود. q نیز فقط فشار مبناست، نه فشار طراحی/خالص سقف و دیوار.";
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
        if (climate.openingState === "partially-enclosed" && climate.dominantOpening !== "yes") {
            if (result) result.textContent = "برای طبقه‌بندی نیمه‌بسته، وجود بازشوی غالب باید با مساحت‌های واقعی احراز و ثبت شود.";
            return false;
        }
        if (climate.openingState === "undetermined") {
            if (result) result.textContent = "طبقه‌بندی پوسته هنوز تعیین نشده است؛ تولید بار باد متوقف می‌ماند.";
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
            snowLeft: 1.0,
            snowRight: 1.0,
            windLeft: 0,
            windRight: 0,
            windWall: 0,
            windEndFront: 0,
            windEndBack: 0
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
            windWall: "loadWindWall",
            windEndFront: "loadWindEndFront",
            windEndBack: "loadWindEndBack"
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
            "windLeft", "windRight", "windWall", "windEndFront", "windEndBack"
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
            if (state.climate.buildingUse === "warehouse-industrial-enclosed") state.climate.buildingUse = "industrial";
            if (!["industrial","commercial","agricultural","workshop","storage","other"].includes(state.climate.buildingUse)) state.climate.buildingUse = "industrial";
            if (!["enclosed","partially-enclosed","open","undetermined"].includes(state.climate.openingState)) state.climate.openingState = "enclosed";
            if (!["yes","no","unknown"].includes(state.climate.dominantOpening)) state.climate.dominantOpening = "unknown";
        }
        // Migration for older Shahroud projects: preserve explicit values, fill only missing site defaults.
        if (state.climate.city === "shahroud") {
            if (state.climate.elevation === "" || state.climate.elevation === null) state.climate.elevation = "1350";
            if (state.climate.terrain === "") state.climate.terrain = "suburban";
            if (!state.climate.source || state.climate.source === "مبحث ششم ۱۳۹۸؛ رکورد اقلیمی PDF همراه پروژه، نیازمند تطبیق نهایی") {
                state.climate.source = "مبحث ششم ۱۳۹۸؛ سرعت باد ۹۰ km/h طبق رکورد PDF پروژه، نیازمند تطبیق نهایی؛ ارتفاع ۱۳۵۰ متر برآورد تقریبی مرکز شهرک صنعتی شاهرود";
            }
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
                    windWall: "loadWindWall",
                    windEndFront: "loadWindEndFront",
                    windEndBack: "loadWindEndBack"
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
                openingArea: "buildingOpeningArea",
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

        const climateInputIds = {
            city: "climateCity", customCity: "climateCustomCity",
            elevation: "climateElevation", source: "climateSource",
            groundSnow: "climateGroundSnow", basicWind: "climateBasicWind",
            terrain: "climateTerrain", topography: "climateTopography",
            openingArea: "buildingOpeningArea", envelopeArea: "buildingEnvelopeArea",
            dominantOpening: "buildingDominantOpening"
        };
        Object.keys(climateInputIds).forEach(key => {
            const el = $(climateInputIds[key]);
            if (el && state.climate[key] !== undefined && state.climate[key] !== null) {
                el.value = state.climate[key];
            }
        });

        const direction = $("loadWindDirection");
        if (direction) direction.value = state.windDirection;

        const note = $("loadNote");
        if (note) note.value = state.note;

        const climateCity = $("climateCity");
        const projectCity = $("city");
        const projectCityName = $("cityName");
        const climateCustomCity = $("climateCustomCity");
        if (climateCity && projectCity) {
            const cityNameFor = code => {
                const option = Array.from(climateCity.options || []).find(o => o.value === code);
                return option ? option.textContent.trim() : "";
            };
            const isKnownClimateCity = code =>
                !!code && !["other","custom",""].includes(code) &&
                (!!cityNameFor(code) || Array.from(projectCity.options || []).some(o => o.value === code));
            const syncClimateFromProject = () => {
                const selected = projectCity.value;
                if (isKnownClimateCity(selected)) {
                    climateCity.value = selected;
                    const label = cityNameFor(selected) ||
                        projectCity.selectedOptions?.[0]?.textContent?.trim() || "";
                    if (climateCustomCity && label) climateCustomCity.value = label;
                } else {
                    climateCity.value = "other";
                    const name = (projectCityName?.value || "").trim();
                    if (climateCustomCity) climateCustomCity.value = name;
                }
                if (projectCityName) projectCityName.style.display =
                    ["other", "custom"].includes(selected) ? "" : "none";
                // The city database fills climate fields and emits input/change so the load engine reads them.
                window.SteelClimateDB?.loadSelectedCity?.();
            };
            const syncProjectFromClimate = () => {
                const selected = climateCity.value;
                if (isKnownClimateCity(selected)) {
                    projectCity.value = selected;
                    if (projectCityName) {
                        projectCityName.value = cityNameFor(selected);
                        projectCityName.style.display = "none";
                    }
                } else {
                    projectCity.value = "other";
                    if (projectCityName) {
                        projectCityName.value = (climateCustomCity?.value || "").trim();
                        projectCityName.style.display = "";
                    }
                }
                projectCity.dispatchEvent(new Event("change", {bubbles:true}));
            };
            // Recover older projects whose top-level city value was not a valid option.
            const savedClimate = climateCity.value;
            if (["other","custom",""].includes(projectCity.value)) {
                syncClimateFromProject();
            } else if (isKnownClimateCity(projectCity.value)) {
                syncClimateFromProject();
            } else if (isKnownClimateCity(savedClimate)) {
                syncProjectFromClimate();
            } else {
                syncClimateFromProject();
            }
            projectCity.addEventListener("change", syncClimateFromProject);
            projectCityName?.addEventListener("input", () => {
                if (["other","custom"].includes(projectCity.value)) {
                    climateCity.value = "other";
                    if (climateCustomCity) climateCustomCity.value = projectCityName.value;
                    window.SteelClimateDB?.loadSelectedCity?.();
                }
            });
            climateCity.addEventListener("change", syncProjectFromClimate);
            climateCustomCity?.addEventListener("input", () => {
                if (climateCity.value === "other" && ["other","custom"].includes(projectCity.value) && projectCityName) {
                    projectCityName.value = climateCustomCity.value;
                    projectCityName.dispatchEvent(new Event("input", {bubbles:true}));
                }
            });
        }

        const panel = $("advancedLoadPanel");
        if (!panel) {
            console.error("SAHROUD STEEL: پنل مدیریت بارگذاری ساخته نشد.");
            return;
        }
        panel.addEventListener("input", function (event) {
            if (event.target && event.target.matches("input, textarea, select")) {
                summary();
                updateWindReference();
            }
        });

        const checkButton = $("btnLoadCheck");
        const resetButton = $("btnLoadReset");
        if (checkButton) checkButton.addEventListener("click", check);
        if (resetButton) resetButton.addEventListener("click", reset);

        if ($("buildingDominantOpening")) $("buildingDominantOpening").value = state.climate.dominantOpening || "unknown";
        summary();
        updateWindReference();
        const climateNotice = $("climateNotice");
        if (climateNotice) climateNotice.textContent =
            "داده‌های اقلیمی و بازشوها باید برای محل و هندسه واقعی پروژه مستند شوند. تا تکمیل ضرایب، نواحی فشار و کنترل‌های آیین‌نامه‌ای، این بخش بار باد طراحی تولید نمی‌کند.";
        updateWindReference();
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


/* ===== steel2/js/design-core.js ===== */
/* SAHROUD STEEL — Independent Engineering Design Core
 * Project brief, input normalization and readiness gates.
 * This module does not generate code loads or certify structural safety.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const SCHEMA_VERSION = 2;
  const OPTIONS = {
    occupancy:["industrial","commercial","agricultural","workshop","storage","other"],
    enclosure:["enclosed","partially-enclosed","open","undetermined"],
    doorState:["closed","normally-open","intermittent-open","permanently-open","unknown"],
    system:["auto-compare","rigid-portal","truss","braced-frame","hybrid","other"],
    tri:["no","yes","unknown"],
    exposure:["normal","corrosive","marine","chemical","high-humidity","unknown"],
    fire:["not-required","to-be-determined","required"]
  };
  const DEFAULTS = Object.freeze({
    schemaVersion:SCHEMA_VERSION, occupancy:"industrial", occupancyDescription:"",
    enclosure:"enclosed", doorState:"closed", structuralSystem:"auto-compare",
    crane:"no", craneCapacityKN:"", craneWheelLoadKN:"", mezzanine:"no",
    futureExpansion:"no", exposure:"normal", fireRequirement:"to-be-determined",
    codeEdition:"مقررات ملی ساختمان ایران؛ ویرایش و سال باید برای پروژه تثبیت شود",
    windDataVerified:false, snowDataVerified:false, geotechnicalReport:"unknown",
    allowableSoilPressureKPa:"", designNotes:"",
    wallEnvelope:{
      front:{material:"brick",orientation:"vertical",supportMode:"grade-beam",deadSurfaceLoadKNm2:""},
      rear:{material:"brick",orientation:"vertical",supportMode:"grade-beam",deadSurfaceLoadKNm2:""},
      left:{material:"brick",orientation:"vertical",supportMode:"grade-beam",deadSurfaceLoadKNm2:""},
      right:{material:"brick",orientation:"vertical",supportMode:"grade-beam",deadSurfaceLoadKNm2:""}
    },
    masonry:{
      thicknessMm:350,unitWeightKNm3:"",brickLengthMm:"",brickHeightMm:"",brickDepthMm:"",mortarJointMm:"",plasterThicknessMm:"",
      restraintSystem:"unknown",horizontalTieSpacingM:"",verticalTieSpacingM:""
    }
  });
  let data=Object.assign({},DEFAULTS);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const valid=(v,list,fallback)=>list.includes(v)?v:fallback;

  function panelHTML(){
    return [
      '<section class="panel" id="engineeringBriefPanel">',
      '<div class="panel-title"><h3>۳ ـ مبانی طراحی و نیازهای بهره‌برداری</h3><span class="status">هسته طراحی مهندسی</span></div>',
      '<div class="notice">این بخش مشخصات واقعی پروژه را از فرضیات تحلیل جدا می‌کند. سوله بسته حالت پیش‌فرض است؛ طبقه‌بندی باد و فشار داخلی باید با مساحت و آرایش واقعی بازشوها کنترل شود.</div>',
      '<h4>کاربری، پوسته و سیستم باربر</h4><div class="form-grid">',
      '<div class="field"><label for="designOccupancy">کاربری اصلی</label><select id="designOccupancy"><option value="industrial">صنعتی</option><option value="commercial">تجاری</option><option value="agricultural">کشاورزی</option><option value="workshop">کارگاهی</option><option value="storage">انبار</option><option value="other">سایر</option></select></div>',
      '<div class="field"><label for="designOccupancyDescription">شرح فعالیت و تجهیزات</label><input id="designOccupancyDescription" type="text" placeholder="مثلاً تولید، انبار، تعمیرگاه..." /></div>',
      '<div class="field"><label for="designEnclosure">طبقه‌بندی اولیه پوسته</label><select id="designEnclosure"><option value="enclosed">بسته</option><option value="partially-enclosed">نیمه‌بسته</option><option value="open">باز</option><option value="undetermined">هنوز تعیین نشده</option></select></div>',
      '<div class="field"><label for="designDoorState">وضعیت معمول درها هنگام باد طراحی</label><select id="designDoorState"><option value="closed">بسته (پیش‌فرض)</option><option value="normally-open">معمولاً باز</option><option value="intermittent-open">بازشدن متناوب</option><option value="permanently-open">دائماً باز</option><option value="unknown">نامشخص</option></select></div>',
      '<div class="field"><label for="designStructuralSystem">سیستم سازه‌ای مورد بررسی</label><select id="designStructuralSystem"><option value="auto-compare">مقایسه و انتخاب گزینه‌ها</option><option value="rigid-portal">قاب خمشی پرتال</option><option value="truss">خرپایی</option><option value="braced-frame">قاب مهاربندی‌شده</option><option value="hybrid">سیستم ترکیبی</option><option value="other">سایر</option></select></div>',
      '<div class="field"><label for="designExposure">شرایط محیطی و خوردگی</label><select id="designExposure"><option value="normal">عادی</option><option value="corrosive">خورنده صنعتی</option><option value="marine">ساحلی / نمکی</option><option value="chemical">مجاورت مواد شیمیایی</option><option value="high-humidity">رطوبت زیاد</option><option value="unknown">نامشخص</option></select></div></div>',
      '<h4>پوسته و دیوارهای چهار طرف سوله</h4>',
      '<div class="notice">پیش‌فرض پروژه شاهرود: دیوار آجری در هر چهار وجه. هر وجه را مستقل می‌توان به ورق فلزی یا ساندویچ‌پنل تغییر داد. برای پوشش‌های ورقی، امتداد قائم یا افقی قابل انتخاب است؛ انتخاب جهت به‌تنهایی ظرفیت پنل، فاصله تکیه‌گاه یا اتصال را تأیید نمی‌کند.</div>',
      '<div class="form-grid">',
      '<div class="field"><label for="wallFrontMaterial">دیوار انتهایی جلو</label><select id="wallFrontMaterial"><option value="brick">آجرچینی</option><option value="metal-sheet">ورق فلزی</option><option value="sandwich-panel">ساندویچ‌پنل</option><option value="other">سیستم دیگر</option></select><label for="wallFrontOrientation">امتداد پوشش</label><select id="wallFrontOrientation"><option value="vertical">قائم</option><option value="horizontal">افقی</option><option value="custom">اختصاصی / نامشخص</option></select><label for="wallFrontSupportMode">مسیر تحمل وزن مرده</label><select id="wallFrontSupportMode"><option value="unknown">نامشخص</option><option value="grade-beam">اتکای دیوار به شناژ/پی ممتد زیر دیوار</option><option value="foundation-bearing">اتکای مستقیم به گره‌های پایه قاب (بدون شناژ ممتد)</option><option value="steel-secondary">انتقال به زیرسازی فولادی</option><option value="independent">قاب مستقل</option></select><label for="wallFrontDeadSurfaceLoad">وزن سطحی دیوار (kN/m²؛ برای غیرآجری)</label><input id="wallFrontDeadSurfaceLoad" type="number" min="0" step="0.01" placeholder="از کاتالوگ/مشخصات مصالح"></div>',
      '<div class="field"><label for="wallRearMaterial">دیوار انتهایی عقب</label><select id="wallRearMaterial"><option value="brick">آجرچینی</option><option value="metal-sheet">ورق فلزی</option><option value="sandwich-panel">ساندویچ‌پنل</option><option value="other">سیستم دیگر</option></select><label for="wallRearOrientation">امتداد پوشش</label><select id="wallRearOrientation"><option value="vertical">قائم</option><option value="horizontal">افقی</option><option value="custom">اختصاصی / نامشخص</option></select><label for="wallRearSupportMode">مسیر تحمل وزن مرده</label><select id="wallRearSupportMode"><option value="unknown">نامشخص</option><option value="grade-beam">اتکای دیوار به شناژ/پی ممتد زیر دیوار</option><option value="foundation-bearing">اتکای مستقیم به گره‌های پایه قاب (بدون شناژ ممتد)</option><option value="steel-secondary">انتقال به زیرسازی فولادی</option><option value="independent">قاب مستقل</option></select><label for="wallRearDeadSurfaceLoad">وزن سطحی دیوار (kN/m²؛ برای غیرآجری)</label><input id="wallRearDeadSurfaceLoad" type="number" min="0" step="0.01" placeholder="از کاتالوگ/مشخصات مصالح"></div>',
      '<div class="field"><label for="wallLeftMaterial">دیوار طولی چپ</label><select id="wallLeftMaterial"><option value="brick">آجرچینی</option><option value="metal-sheet">ورق فلزی</option><option value="sandwich-panel">ساندویچ‌پنل</option><option value="other">سیستم دیگر</option></select><label for="wallLeftOrientation">امتداد پوشش</label><select id="wallLeftOrientation"><option value="vertical">قائم</option><option value="horizontal">افقی</option><option value="custom">اختصاصی / نامشخص</option></select><label for="wallLeftSupportMode">مسیر تحمل وزن مرده</label><select id="wallLeftSupportMode"><option value="unknown">نامشخص</option><option value="grade-beam">اتکای دیوار به شناژ/پی ممتد زیر دیوار</option><option value="foundation-bearing">اتکای مستقیم به گره‌های پایه قاب (بدون شناژ ممتد)</option><option value="steel-secondary">انتقال به زیرسازی فولادی</option><option value="independent">قاب مستقل</option></select><label for="wallLeftDeadSurfaceLoad">وزن سطحی دیوار (kN/m²؛ برای غیرآجری)</label><input id="wallLeftDeadSurfaceLoad" type="number" min="0" step="0.01" placeholder="از کاتالوگ/مشخصات مصالح"></div>',
      '<div class="field"><label for="wallRightMaterial">دیوار طولی راست</label><select id="wallRightMaterial"><option value="brick">آجرچینی</option><option value="metal-sheet">ورق فلزی</option><option value="sandwich-panel">ساندویچ‌پنل</option><option value="other">سیستم دیگر</option></select><label for="wallRightOrientation">امتداد پوشش</label><select id="wallRightOrientation"><option value="vertical">قائم</option><option value="horizontal">افقی</option><option value="custom">اختصاصی / نامشخص</option></select><label for="wallRightSupportMode">مسیر تحمل وزن مرده</label><select id="wallRightSupportMode"><option value="unknown">نامشخص</option><option value="grade-beam">اتکای دیوار به شناژ/پی ممتد زیر دیوار</option><option value="foundation-bearing">اتکای مستقیم به گره‌های پایه قاب (بدون شناژ ممتد)</option><option value="steel-secondary">انتقال به زیرسازی فولادی</option><option value="independent">قاب مستقل</option></select><label for="wallRightDeadSurfaceLoad">وزن سطحی دیوار (kN/m²؛ برای غیرآجری)</label><input id="wallRightDeadSurfaceLoad" type="number" min="0" step="0.01" placeholder="از کاتالوگ/مشخصات مصالح"></div>',
      '</div>',
      '<h4>مشخصات مصالح و مهار دیوار آجری</h4><div class="form-grid">',
      '<div class="field"><label for="masonryThicknessMm">ضخامت اسمی دیوار آجری (mm)</label><input id="masonryThicknessMm" type="number" min="0" step="5" placeholder="از نقشه یا وضع موجود" /></div>',
      '<div class="field"><label for="masonryUnitWeight">وزن مخصوص حجمی مصالح بنایی (kN/m³)</label><input id="masonryUnitWeight" type="number" min="0" step="0.1" placeholder="از مشخصات مصالح / آزمایش" /></div>',
      '<div class="field"><label for="masonryBrickLength">طول واحد آجر (mm)</label><input id="masonryBrickLength" type="number" min="1" step="1" placeholder="از نوع آجر واقعی" /></div>',
      '<div class="field"><label for="masonryBrickHeight">ارتفاع واحد آجر (mm)</label><input id="masonryBrickHeight" type="number" min="1" step="1" placeholder="از نوع آجر واقعی" /></div>',
      '<div class="field"><label for="masonryBrickDepth">عمق/ضخامت واحد آجر (mm)</label><input id="masonryBrickDepth" type="number" min="1" step="1" placeholder="از نوع آجر واقعی" /></div>',
      '<div class="field"><label for="masonryMortarJoint">ضخامت بند ملات (mm)</label><input id="masonryMortarJoint" type="number" min="0" step="1" placeholder="از جزئیات اجرا" /></div>',
      '<div class="field"><label for="masonryPlasterThickness">ضخامت اندود هر طرف (mm)</label><input id="masonryPlasterThickness" type="number" min="0" step="1" placeholder="در صورت اجرای اندود" /></div>',
      '<div class="field"><label for="masonryRestraintSystem">سیستم مهار دیوار به سازه</label><select id="masonryRestraintSystem"><option value="unknown">نامشخص / هنوز طراحی نشده</option><option value="columns-beams">مهار به ستون‌ها و کلاف‌های پیرامونی</option><option value="independent">قاب یا زیرسازی مستقل</option><option value="other">سیستم دیگر؛ نیازمند شرح</option></select></div>',
      '<div class="field"><label for="masonryHorizontalTieSpacing">فاصله قائم مهارهای افقی (m)</label><input id="masonryHorizontalTieSpacing" type="number" min="0" step="0.1" placeholder="در صورت وجود جزئیات" /></div>',
      '<div class="field"><label for="masonryVerticalTieSpacing">فاصله افقی مهارهای قائم (m)</label><input id="masonryVerticalTieSpacing" type="number" min="0" step="0.1" placeholder="در صورت وجود جزئیات" /></div>',
      '</div><div class="notice" id="wallEnvelopeNotice" aria-live="polite">چهار دیوار آجری؛ بارگذاری و انتقال بار پوشش هنوز غیرفعال است.</div>',
      '<h4>تجهیزات و توسعه آتی</h4><div class="form-grid">',
      '<div class="field"><label for="designCrane">جرثقیل سقفی</label><select id="designCrane"><option value="no">ندارد</option><option value="yes">دارد</option><option value="unknown">هنوز مشخص نیست</option></select></div>',
      '<div class="field"><label for="designCraneCapacity">ظرفیت نامی جرثقیل (kN)</label><input id="designCraneCapacity" type="number" min="0" step="1" placeholder="در صورت وجود" /></div>',
      '<div class="field"><label for="designCraneWheelLoad">بار چرخ بحرانی سازنده (kN)</label><input id="designCraneWheelLoad" type="number" min="0" step="0.1" placeholder="از کاتالوگ جرثقیل" /></div>',
      '<div class="field"><label for="designMezzanine">نیم‌طبقه / سکوی داخلی</label><select id="designMezzanine"><option value="no">ندارد</option><option value="yes">دارد</option><option value="unknown">نامشخص</option></select></div>',
      '<div class="field"><label for="designExpansion">امکان توسعه</label><select id="designExpansion"><option value="no">در نظر گرفته نشده</option><option value="yes">باید پیش‌بینی شود</option><option value="unknown">نامشخص</option></select></div>',
      '<div class="field"><label for="designFire">الزامات مقاومت حریق</label><select id="designFire"><option value="to-be-determined">نیازمند تعیین</option><option value="not-required">طبق ضوابط پروژه لازم نیست</option><option value="required">الزام دارد</option></select></div></div>',
      '<h4>مبنای طراحی و ژئوتکنیک</h4><div class="form-grid">',
      '<div class="field"><label for="designCodeEdition">مبنای آیین‌نامه‌ای و ویرایش</label><input id="designCodeEdition" type="text" /></div>',
      '<div class="field"><label for="designGeotech">وضعیت گزارش ژئوتکنیک</label><select id="designGeotech"><option value="unknown">گزارش موجود نیست / نامشخص</option><option value="available">گزارش معتبر موجود است</option><option value="pending">در دست تهیه</option></select></div>',
      '<div class="field"><label for="designSoilPressure">ظرفیت مجاز باربری خاک (kPa)</label><input id="designSoilPressure" type="number" min="0" step="1" placeholder="فقط از گزارش ژئوتکنیک" /></div></div>',
      '<div class="form-grid"><label><input id="designWindVerified" type="checkbox" /> داده باد محل از منبع معتبر تأیید شده است</label><label><input id="designSnowVerified" type="checkbox" /> داده برف محل از منبع معتبر تأیید شده است</label></div>',
      '<div class="field"><label for="designNotes">ملاحظات خاص پروژه</label><textarea id="designNotes" rows="3" placeholder="محدودیت ساخت، حمل، ارتفاع، پوشش، توسعه و ..."></textarea></div>',
      '<div class="notice" id="designReadiness" aria-live="polite">در حال ارزیابی مبانی طراحی...</div></section>'
    ].join("");
  }
  function readForm(){
    const map={occupancy:"designOccupancy",occupancyDescription:"designOccupancyDescription",enclosure:"designEnclosure",doorState:"designDoorState",structuralSystem:"designStructuralSystem",crane:"designCrane",craneCapacityKN:"designCraneCapacity",craneWheelLoadKN:"designCraneWheelLoad",mezzanine:"designMezzanine",futureExpansion:"designExpansion",exposure:"designExposure",fireRequirement:"designFire",codeEdition:"designCodeEdition",allowableSoilPressureKPa:"designSoilPressure",designNotes:"designNotes"};
    Object.keys(map).forEach(k=>{const el=$(map[k]);if(el)data[k]=el.value;});
    data.windDataVerified=!!$("designWindVerified")?.checked;
    data.snowDataVerified=!!$("designSnowVerified")?.checked;
    data.geotechnicalReport=$("designGeotech")?.value||"unknown";
    const faces={front:"Front",rear:"Rear",left:"Left",right:"Right"};
    data.wallEnvelope=data.wallEnvelope||clone(DEFAULTS.wallEnvelope);
    Object.entries(faces).forEach(([face,suffix])=>{
      const material=$("wall"+suffix+"Material"),orientation=$("wall"+suffix+"Orientation");
      data.wallEnvelope[face]={
        material:valid(material?.value,["brick","metal-sheet","sandwich-panel","other"],"brick"),
        orientation:valid(orientation?.value,["vertical","horizontal","custom"],"vertical"),
        supportMode:valid($("wall"+suffix+"SupportMode")?.value,["unknown","grade-beam","foundation-bearing","steel-secondary","independent"],"grade-beam"),
        deadSurfaceLoadKNm2:$("wall"+suffix+"DeadSurfaceLoad")?.value??""
      };
    });
    data.masonry=data.masonry||clone(DEFAULTS.masonry);
    const masonryFields={thicknessMm:"masonryThicknessMm",unitWeightKNm3:"masonryUnitWeight",brickLengthMm:"masonryBrickLength",brickHeightMm:"masonryBrickHeight",brickDepthMm:"masonryBrickDepth",mortarJointMm:"masonryMortarJoint",plasterThicknessMm:"masonryPlasterThickness",restraintSystem:"masonryRestraintSystem",horizontalTieSpacingM:"masonryHorizontalTieSpacing",verticalTieSpacingM:"masonryVerticalTieSpacing"};
    Object.entries(masonryFields).forEach(([key,id])=>{const el=$(id);if(el)data.masonry[key]=el.value;});
    return clone(data);
  }
  function getReadiness(){
    const d=readForm(), blockers=[];
    if(d.occupancy==="other"&&!d.occupancyDescription.trim())blockers.push("شرح کاربری سفارشی ثبت نشده است.");
    if(d.enclosure==="undetermined")blockers.push("طبقه‌بندی پوسته تعیین نشده است.");
    if(d.doorState==="unknown")blockers.push("سناریوی باز و بسته بودن درها تعیین نشده است.");
    if(d.crane==="yes"&&(!(Number(d.craneCapacityKN)>0)||!(Number(d.craneWheelLoadKN)>0)))blockers.push("ظرفیت و بار چرخ جرثقیل از سازنده دریافت نشده است.");
    if(d.crane==="unknown")blockers.push("وجود یا عدم وجود جرثقیل مشخص نیست.");
    if(d.mezzanine==="unknown")blockers.push("وضعیت نیم‌طبقه مشخص نیست.");
    if(d.exposure==="unknown")blockers.push("شرایط خوردگی محیط مشخص نیست.");
    if(!d.windDataVerified)blockers.push("داده باد محل تأیید نشده است.");
    if(!d.snowDataVerified)blockers.push("داده برف محل تأیید نشده است.");
    if(d.geotechnicalReport!=="available"||!(Number(d.allowableSoilPressureKPa)>0))blockers.push("گزارش ژئوتکنیک و ظرفیت باربری خاک لازم است.");
    if(d.fireRequirement==="to-be-determined")blockers.push("الزامات حریق باید تعیین شود.");
    return {ready:blockers.length===0,blockers,schemaVersion:SCHEMA_VERSION};
  }
  function update(){
    const out=$("designReadiness");if(!out)return;
    const d=readForm(),r=getReadiness();
    const warning=d.doorState==="closed"&&d.enclosure!=="enclosed"?"توجه: بسته بودن درها به‌تنهایی طبقه‌بندی پوسته بسته را اثبات نمی‌کند. ":"";
    out.textContent=warning+(r.ready?"مبانی ورودی ثبت شده‌اند؛ کنترل آیین‌نامه‌ای و تحلیل همچنان لازم است.":"موارد باز: "+r.blockers.join(" | "));
    out.dataset.ready=String(r.ready);
    const wallOut=$("wallEnvelopeNotice");
    if(wallOut){
      const names={front:"انتهایی جلو",rear:"انتهایی عقب",left:"طولی چپ",right:"طولی راست"};
      const materials={brick:"آجرچینی","metal-sheet":"ورق فلزی","sandwich-panel":"ساندویچ‌پنل",other:"سیستم دیگر"};
      const orientations={vertical:"قائم",horizontal:"افقی",custom:"اختصاصی/نامشخص"};
      const walls=Object.entries(d.wallEnvelope||DEFAULTS.wallEnvelope).map(([face,v])=>names[face]+": "+materials[v.material]+"؛ امتداد "+orientations[v.orientation]).join(" | ");
      wallOut.textContent=walls+" . وزن دیوار آجریِ متکی به شناژ ممتد، تا زمان ممیزی پیوستگی مسیر شناژ و انتقال بار خطی به اعضای شناژ وارد حل‌گر نمی‌شود. مسیر مستقیم به گره پایه قاب نیز یک حالت جداگانه است. انتقال به زیرسازی فولادی/قاب مستقل، دیوار دارای بازشو و وزن اندود بدون داده تکمیلی فعلاً متوقف می‌شود؛ کنترل خارج از صفحه و اتصالات دیوار نیز مستقل است.";
    }
  }
  function renderValues(){
    const d=data,map={designOccupancy:d.occupancy,designOccupancyDescription:d.occupancyDescription,designEnclosure:d.enclosure,designDoorState:d.doorState,designStructuralSystem:d.structuralSystem,designCrane:d.crane,designCraneCapacity:d.craneCapacityKN,designCraneWheelLoad:d.craneWheelLoadKN,designMezzanine:d.mezzanine,designExpansion:d.futureExpansion,designExposure:d.exposure,designFire:d.fireRequirement,designCodeEdition:d.codeEdition,designSoilPressure:d.allowableSoilPressureKPa,designNotes:d.designNotes};
    Object.entries(map).forEach(([id,v])=>{if($(id))$(id).value=v??"";});
    if($("designWindVerified"))$("designWindVerified").checked=!!d.windDataVerified;
    if($("designSnowVerified"))$("designSnowVerified").checked=!!d.snowDataVerified;
    if($("designGeotech"))$("designGeotech").value=d.geotechnicalReport||"unknown";
    const faces={front:"Front",rear:"Rear",left:"Left",right:"Right"};
    const wall=d.wallEnvelope||DEFAULTS.wallEnvelope;
    Object.entries(faces).forEach(([face,suffix])=>{
      const v=wall[face]||DEFAULTS.wallEnvelope[face];
      if($("wall"+suffix+"Material"))$("wall"+suffix+"Material").value=valid(v.material,["brick","metal-sheet","sandwich-panel","other"],"brick");
      if($("wall"+suffix+"Orientation"))$("wall"+suffix+"Orientation").value=valid(v.orientation,["vertical","horizontal","custom"],"vertical");
      if($("wall"+suffix+"SupportMode"))$("wall"+suffix+"SupportMode").value=valid(v.supportMode,["unknown","grade-beam","foundation-bearing","steel-secondary","independent"],"grade-beam");
      if($("wall"+suffix+"DeadSurfaceLoad"))$("wall"+suffix+"DeadSurfaceLoad").value=v.deadSurfaceLoadKNm2??"";
    });
    const masonry=d.masonry||DEFAULTS.masonry;
    const masonryMap={masonryThicknessMm:"thicknessMm",masonryUnitWeight:"unitWeightKNm3",masonryBrickLength:"brickLengthMm",masonryBrickHeight:"brickHeightMm",masonryBrickDepth:"brickDepthMm",masonryMortarJoint:"mortarJointMm",masonryPlasterThickness:"plasterThicknessMm",masonryRestraintSystem:"restraintSystem",masonryHorizontalTieSpacing:"horizontalTieSpacingM",masonryVerticalTieSpacing:"verticalTieSpacingM"};
    Object.entries(masonryMap).forEach(([id,key])=>{if($(id))$(id).value=masonry[key]??"";});
    update();
  }
  function render(){
    if($("engineeringBriefPanel"))return;
    const anchor=$("span")?.closest(".panel");
    if(anchor)anchor.insertAdjacentHTML("afterend",panelHTML());else document.querySelector("main")?.insertAdjacentHTML("beforeend",panelHTML());
    renderValues();
    $("engineeringBriefPanel")?.addEventListener("input",update);
    $("engineeringBriefPanel")?.addEventListener("change",update);
  }
  function setData(saved){
    if(!saved||typeof saved!=="object")return;
    const source=saved.designBrief&&typeof saved.designBrief==="object"?saved.designBrief:saved;
    data=Object.assign({},DEFAULTS,source,{schemaVersion:SCHEMA_VERSION});
    data.occupancy=valid(data.occupancy,OPTIONS.occupancy,DEFAULTS.occupancy);
    data.enclosure=valid(data.enclosure,OPTIONS.enclosure,DEFAULTS.enclosure);
    data.doorState=valid(data.doorState,OPTIONS.doorState,DEFAULTS.doorState);
    data.structuralSystem=valid(data.structuralSystem,OPTIONS.system,DEFAULTS.structuralSystem);
    data.crane=valid(data.crane,OPTIONS.tri,DEFAULTS.crane);
    data.mezzanine=valid(data.mezzanine,OPTIONS.tri,DEFAULTS.mezzanine);
    data.futureExpansion=valid(data.futureExpansion,OPTIONS.tri,DEFAULTS.futureExpansion);
    data.exposure=valid(data.exposure,OPTIONS.exposure,DEFAULTS.exposure);
    data.fireRequirement=valid(data.fireRequirement,OPTIONS.fire,DEFAULTS.fireRequirement);
    const savedWalls=data.wallEnvelope&&typeof data.wallEnvelope==="object"?data.wallEnvelope:{};
    data.wallEnvelope={};
    ["front","rear","left","right"].forEach(face=>{
      const v=savedWalls[face]||DEFAULTS.wallEnvelope[face];
      data.wallEnvelope[face]={
        material:valid(v.material,["brick","metal-sheet","sandwich-panel","other"],"brick"),
        orientation:valid(v.orientation,["vertical","horizontal","custom"],"vertical"),
        supportMode:valid(v.supportMode,["unknown","grade-beam","foundation-bearing","steel-secondary","independent"],"unknown"),
        deadSurfaceLoadKNm2:v.deadSurfaceLoadKNm2??""
      };
    });
    const m=data.masonry&&typeof data.masonry==="object"?data.masonry:{};
    data.masonry={
      thicknessMm:(m.thicknessMm===undefined||m.thicknessMm===null||m.thicknessMm==="")?350:m.thicknessMm,unitWeightKNm3:m.unitWeightKNm3??"",brickLengthMm:m.brickLengthMm??"",brickHeightMm:m.brickHeightMm??"",brickDepthMm:m.brickDepthMm??"",mortarJointMm:m.mortarJointMm??"",plasterThicknessMm:m.plasterThicknessMm??"",
      restraintSystem:valid(m.restraintSystem,["unknown","columns-beams","independent","other"],"unknown"),
      horizontalTieSpacingM:m.horizontalTieSpacingM??"",verticalTieSpacingM:m.verticalTieSpacingM??""
    };
    if($("engineeringBriefPanel"))renderValues();
  }
  function validate(){
    const d=readForm();
    if(d.crane==="yes"&&(!(Number(d.craneCapacityKN)>0)||!(Number(d.craneWheelLoadKN)>0)))return "برای جرثقیل، ظرفیت نامی و بار چرخ بحرانی لازم است.";
    if(d.allowableSoilPressureKPa!==""&&!(Number(d.allowableSoilPressureKPa)>0))return "ظرفیت باربری خاک نامعتبر است.";
    return "";
  }
  document.addEventListener("DOMContentLoaded",render);
  window.SteelDesignCore={getData:readForm,setData,getReadiness,validate,update,schemaVersion:SCHEMA_VERSION};
})();

/* ===== steel2/js/wall-dead-load-transfer.js ===== */
/* SAHROUD STEEL — Wall cladding dead-load transfer to foundation supports.
 * Only the explicitly selected foundation-bearing support mode is implemented.
 * Steel-secondary and independent wall support paths remain blocked.
 */
(function(root){
"use strict";
const FACES=["front","rear","left","right"];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const num=v=>v===undefined||v===null||v===""?null:Number(v);
const near=(a,b,t=1e-6)=>Math.abs(Number(a)-Number(b))<=t;
function roofY(x,g){const half=Number(g.span)/2;return Number(g.height)+Number(g.rise)*(1-Math.abs(Number(x)-half)/half);}
function integralRoofHeight(a,b,g){
 const half=Number(g.span)/2,pts=[a,...(a<half-1e-9&&b>half+1e-9?[half]:[]),b];let area=0;
 for(let i=0;i<pts.length-1;i++)area+=(pts[i+1]-pts[i])*(roofY(pts[i],g)+roofY(pts[i+1],g))/2;
 return area;
}
function tributaryStrips(coords,total){
 const x=[...new Set(coords.map(Number))].sort((a,b)=>a-b);
 if(x.length<2||!near(x[0],0)||!near(x[x.length-1],total))return null;
 return x.map((v,i)=>({coordinate:v,start:i===0?0:(x[i-1]+v)/2,end:i===x.length-1?total:(v+x[i+1])/2}));
}
function supportNodes(model,face){
 const g=model.geometry,nodes=model.nodes||[],tol=1e-5;
 if(face==="left"||face==="right"){
  const x=face==="left"?0:Number(g.span);
  return nodes.filter(n=>n.kind==="base"&&near(n.x,x,tol)).map(n=>({id:String(n.id),coordinate:Number(n.z)}));
 }
 const z=face==="front"?0:Number(g.length);
 return nodes.filter(n=>(n.kind==="base"||n.kind==="endwall-base")&&near(n.z,z,tol)).map(n=>({id:String(n.id),coordinate:Number(n.x)}));
}
function faceAreaWeights(model,face,nodes){
 const g=model.geometry,total=face==="left"||face==="right"?Number(g.length):Number(g.span);
 const strips=tributaryStrips(nodes.map(n=>n.coordinate),total);if(!strips)return null;
 return strips.map((s,i)=>({nodeId:nodes.find(n=>near(n.coordinate,s.coordinate))?.id,start:s.start,end:s.end,
  areaM2:face==="left"||face==="right"?(s.end-s.start)*Number(g.height):integralRoofHeight(s.start,s.end,g)}));
}
function inspectGradeBeamSupportPath(model,face,unitWeightKNm2){
 const g=model.geometry||{},routes=root.SteelTieBeamLayout?.getData?.()?.routes||[],nodes=new Map((model.nodes||[]).map(n=>[String(n.id),n]));
 const longitudinal=face==="left"||face==="right",axis=longitudinal?"z":"x",fixed=longitudinal?(face==="left"?0:Number(g.span)):(face==="front"?0:Number(g.length)),total=longitudinal?Number(g.length):Number(g.span),tol=1e-4;
 const segments=[],issues=[];
 routes.forEach(r=>{
  const a=nodes.get(String(r.start)),b=nodes.get(String(r.end));if(!a||!b)return;
  const onLine=longitudinal?near(a.x,fixed,tol)&&near(b.x,fixed,tol):near(a.z,fixed,tol)&&near(b.z,fixed,tol);
  if(!onLine||!near(a.y,0,tol)||!near(b.y,0,tol))return;
  const s=Math.min(Number(a[axis]),Number(b[axis])),e=Math.max(Number(a[axis]),Number(b[axis]));
  if(!(e-s>tol))return;
  const area=longitudinal?(e-s)*Number(g.height):integralRoofHeight(s,e,g);
  const crossesRidge=!longitudinal&&s<Number(g.span)/2-tol&&e>Number(g.span)/2+tol;
  const ridgeNode=[...nodes.values()].some(n=>(n.kind==="base"||n.kind==="endwall-base")&&near(n.x,Number(g.span)/2,tol)&&near(n.y,0,tol)&&near(n.z,fixed,tol));
  if(crossesRidge&&!ridgeNode)issues.push("مسیر "+String(r.id)+" از تاج بام عبور می‌کند اما گره پایه در محور تاج برای تقسیم واقعی شناژ وجود ندارد.");
  const startLoad=unitWeightKNm2*(longitudinal?Number(g.height):roofY(Number(a[axis]),g));
  const endLoad=unitWeightKNm2*(longitudinal?Number(g.height):roofY(Number(b[axis]),g));
  segments.push({routeId:String(r.id),start:s,end:e,startNodeId:String(r.start),endNodeId:String(r.end),lengthM:e-s,wallAreaM2:area,
   uniformEquivalentLineLoadKNm:unitWeightKNm2*area/(e-s),startLineLoadKNm:startLoad,endLineLoadKNm:endLoad,unitWeightKNm2,
   weightKN:unitWeightKNm2*area,startJoint:r.startJoint||"unknown",endJoint:r.endJoint||"unknown",crossesRidge,ridgeNodeRequired:crossesRidge});
 });
 segments.sort((a,b)=>a.start-b.start);let cursor=0;
 segments.forEach(s=>{if(s.start>cursor+tol)issues.push("فاصله بدون شناژ از "+cursor.toFixed(3)+" تا "+s.start.toFixed(3)+" متر وجود دارد.");if(s.start<cursor-tol)issues.push("مسیرهای شناژ هم‌پوشانی دارند و ممکن است وزن دیوار دوبار منظور شود.");if(s.startJoint!=="rigid"||s.endJoint!=="rigid")issues.push("اتصال ابتدا/انتهای مسیر "+s.routeId+" یکپارچه و مستند نشده است.");cursor=Math.max(cursor,s.end);});
 if(cursor<total-tol)issues.push("شناژ زیر دیوار تا انتهای وجه پیوسته نیست؛ پوشش مسیر "+cursor.toFixed(3)+" از "+total.toFixed(3)+" متر است.");
 if(!segments.length)issues.push("هیچ مسیر شناژ منطبق با خط زیر دیوار تعریف نشده است.");
 return{success:issues.length===0,face,axis,totalLengthM:total,coveredLengthM:segments.reduce((s,x)=>s+x.lengthM,0),unitWeightKNm2,weightKN:segments.reduce((s,x)=>s+x.weightKN,0),segments,issues,solverLoadsGenerated:false,limitation:"بار دیوار به‌صورت بار گسترده خطی محلی/جهانی با تغییر خطی بین دو انتهای هر قطعه شناژ اعمال می‌شود؛ مسیر واقعی، گره تاج و تعادل کلی باید جداگانه کنترل شوند."};
}
function inspectSecondarySupportPath(model,face){
 const nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const longitudinal=face==="left"||face==="right",sectionKey=longitudinal?"wallGirt":"endGirt";
 const candidates=members.filter(m=>m.sectionKey===sectionKey&&(longitudinal?m.side===face:m.endFace===face));
 const issues=[],rows=[];
 if(!candidates.length)return {success:false,face,sectionKey,candidateMemberCount:0,connectedMemberCount:0,issues:["عضو زیرسازی متناظر در مدل هندسی پیدا نشد."],rows};
 const byNode=new Map();
 members.forEach(m=>[m.start,m.end].forEach(id=>{const key=String(id);if(!byNode.has(key))byNode.set(key,[]);byNode.get(key).push(m);}));
 const allowed=longitudinal?new Set(["column"]):new Set(["column","endPost","rafter"]);
 candidates.forEach(m=>{
  const ends=[String(m.start),String(m.end)].map(nodeId=>{
   const node=nodeMap.get(nodeId),adjacent=(byNode.get(nodeId)||[]).filter(x=>x.id!==m.id),supports=adjacent.filter(x=>allowed.has(String(x.sectionKey||"")));
   const connected=!!node&&supports.length>0;
   if(!connected)issues.push("عضو "+m.id+" در گره "+nodeId+" به عضو قائم/اصلی مجاورِ قابل‌شناسایی متصل نیست.");
   return {nodeId,nodeKind:node?.kind||null,adjacentMemberIds:adjacent.map(x=>String(x.id)),supportMemberIds:supports.map(x=>String(x.id)),connected};
  });
  rows.push({memberId:String(m.id),start:ends[0],end:ends[1]});
 });
 return {success:issues.length===0,face,sectionKey,candidateMemberCount:candidates.length,connectedMemberCount:rows.filter(r=>r.start.connected&&r.end.connected).length,issues,rows,
 limitation:"فقط پیوستگی توپولوژیک بررسی می‌شود؛ اتصال اجرایی، سختی، ظرفیت و تبدیل بار سطحی به بارهای گره‌ای اثبات نمی‌شود."};
}
function audit(model){
 const issues=[],rows=[],nodalLoads=[];
 if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))return {success:false,loadTransferEnabled:false,issues:["مدل سه‌بعدی معتبر برای انتقال وزن دیوار موجود نیست."],rows,nodalLoads};
 const brief=root.SteelDesignCore?.getData?.(),walls=brief?.wallEnvelope;
 if(!walls)return {success:false,loadTransferEnabled:false,issues:["مشخصات چهار وجه دیوار در مبانی طراحی موجود نیست."],rows,nodalLoads};
 let masonry=null;
 try{masonry=root.SteelMasonryWallAudit?.audit?.(model)||null;}catch(e){issues.push("ممیزی وزن دیوار آجری اجرا نشد: "+String(e.message||e));}
 if(!masonry)issues.push("محاسبه مساحت/وزن دیوار برای کنترل بازشوها در دسترس نیست.");
 const g=model.geometry;
 if(!(Number(g.span)>0&&Number(g.length)>0&&Number(g.height)>0&&Number(g.rise)>=0))issues.push("ابعاد هندسی برای توزیع وزن دیوار معتبر نیست.");
 FACES.forEach(face=>{
  const cfg=walls[face];if(!cfg?.material)return;
  const mode=cfg.supportMode||"unknown";
  if(mode==="grade-beam"){
   const m=brief.masonry||{},thickness=num(m.thicknessMm),gamma=num(m.unitWeightKNm3),plaster=num(m.plasterThicknessMm)||0,extra=num(cfg.deadSurfaceLoadKNm2);
   if(cfg.material!=="brick"||!(thickness>0&&gamma>0)||(plaster>0&&!(extra!==null&&extra>0))){
    issues.push(face+": برای شناژ زیر دیوار، نوع مصالح آجری، ضخامت، وزن مخصوص و وزن اندود معتبر لازم است.");
    rows.push({face,status:"grade-beam-missing-wall-weight",weightKN:null,nodeCount:0});return;
   }
   const faceData=masonry?.faces?.find(x=>x.face===face),expectedArea=face==="front"||face==="rear"?Number(g.span)*Number(g.height)+Number(g.span)*Number(g.rise)/2:Number(g.length)*Number(g.height);
   if(!faceData||faceData.openingAreaM2>1e-8||Math.abs(Number(faceData.netAreaM2)-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){
    issues.push(face+": بازشو یا اختلاف مساحت دیوار وجود دارد؛ تا توزیع موضعی بار دیوار روی شناژ، انتقال متوقف است.");
    rows.push({face,status:"grade-beam-opening-or-area-unresolved",weightKN:null,nodeCount:0});return;
   }
   const q=thickness/1000*gamma+(extra||0),path=inspectGradeBeamSupportPath(model,face,q);
   if(!path.success)issues.push(face+": مسیر شناژ زیر دیوار کامل/بدون هم‌پوشانی نیست: "+path.issues.join("؛ "));
   else if(path.success){}
   rows.push({face,status:path.success?"grade-beam-line-load-ready":"grade-beam-path-incomplete",material:cfg.material,supportMode:mode,weightKN:path.weightKN,areaM2:path.segments.reduce((s,x)=>s+x.wallAreaM2,0),nodeCount:0,gradeBeamSupportAudit:path});return;
  }
  if(mode==="steel-secondary"){
   const topology=inspectSecondarySupportPath(model,face);
   issues.push(face+": "+(topology.success
    ?"اتصال توپولوژیک گرت به اعضای اصلی شناسایی شد؛ اما تبدیل وزن سطحی دیوار به بارهای گرت و واکنش‌های گره‌ای هنوز پیاده‌سازی و اعتبارسنجی نشده است."
    :"مسیر توپولوژیک زیرسازی فولادی ناقص است: "+topology.issues.join("؛ ")));
   rows.push({face,status:topology.success?"secondary-topology-only":"secondary-topology-incomplete",weightKN:null,nodeCount:0,secondarySupportAudit:topology});return;
  }
  if(mode!=="foundation-bearing"){
   issues.push(face+": مسیر تحمل وزن دیوار باید صریحاً «اتکای مستقیم به تکیه‌گاه‌های پایه مدل‌شده» باشد؛ قاب مستقل یا مسیر نامشخص هنوز مدل نشده است.");
   rows.push({face,status:"unsupported-support-mode",weightKN:null,nodeCount:0});return;
  }
  const faceData=masonry?.faces?.find(x=>x.face===face);
  if(!faceData){issues.push(face+": مساحت خالص و اطلاعات بازشو برای دیوار موجود نیست.");rows.push({face,status:"missing-area",weightKN:null,nodeCount:0});return;}
  if(faceData.openingAreaM2>1e-8){issues.push(face+": وجود بازشو ثبت شده است؛ توزیع موضعی وزن باقیمانده به تکیه‌گاه‌ها هنوز مدل نشده و انتقال متوقف شد.");rows.push({face,status:"opening-distribution-required",weightKN:null,nodeCount:0});return;}
  let q=null,source="";
  if(cfg.material==="brick"){
   const m=brief.masonry||{},thickness=num(m.thicknessMm),gamma=num(m.unitWeightKNm3),plaster=num(m.plasterThicknessMm)||0,extra=num(cfg.deadSurfaceLoadKNm2);
   if(!(thickness>0&&gamma>0)){issues.push(face+": ضخامت و وزن مخصوص دیوار آجری برای محاسبه وزن مرده لازم است.");rows.push({face,status:"missing-masonry-weight",weightKN:null,nodeCount:0});return;}
   if(plaster>0&&!(extra!==null&&extra>0)){issues.push(face+": اندود دیوار ثبت شده اما وزن سطحی افزوده آن وارد نشده است.");rows.push({face,status:"missing-plaster-weight",weightKN:null,nodeCount:0});return;}
   q=thickness/1000*gamma+(extra||0);source="masonry thickness × unit weight + declared additional surface weight";
   if(faceData.weightKN===null){issues.push(face+": وزن دیوار آجری از ممیزی مصالح قابل محاسبه نیست.");rows.push({face,status:"missing-masonry-weight",weightKN:null,nodeCount:0});return;}
  }else{
   const w=num(cfg.deadSurfaceLoadKNm2);
   if(!(w!==null&&w>0)){issues.push(face+": وزن سطحی مرده پوشش غیرآجری باید از کاتالوگ/مشخصات وارد شود.");rows.push({face,status:"missing-surface-weight",weightKN:null,nodeCount:0});return;}
   q=w;source="user-entered manufacturer/specification surface dead weight";
  }
  const area=Number(faceData.netAreaM2);
  if(!(area>0&&finite(area))){issues.push(face+": مساحت دیوار برای وزن مرده معتبر نیست.");rows.push({face,status:"invalid-area",weightKN:null,nodeCount:0});return;}
  const expectedArea=face==="front"||face==="rear"?Number(g.span)*Number(g.height)+Number(g.span)*Number(g.rise)/2:Number(g.length)*Number(g.height);
  if(Math.abs(area-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){issues.push(face+": مساحت خالص با مساحت کامل سطح تفاوت دارد؛ تا مدل‌سازی محل بازشوها، انتقال وزن متوقف شد.");rows.push({face,status:"area-mismatch",weightKN:null,nodeCount:0});return;}
  const supports=supportNodes(model,face);
  const weights=faceAreaWeights(model,face,supports);
  if(!weights||weights.some(x=>!x.nodeId||!(x.areaM2>0))){issues.push(face+": گره‌های پایه برای پوشش کامل طول/عرض دیوار کافی یا پیوسته نیستند.");rows.push({face,status:"missing-support-nodes",weightKN:null,nodeCount:supports.length});return;}
  const totalArea=weights.reduce((sum,x)=>sum+x.areaM2,0);
  if(Math.abs(totalArea-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){issues.push(face+": جمع مساحت‌های بارگیر تکیه‌گاه‌ها با سطح دیوار برابر نیست.");rows.push({face,status:"tributary-area-mismatch",weightKN:null,nodeCount:supports.length});return;}
  const weightKN=q*totalArea;
  weights.forEach(x=>nodalLoads.push({nodeId:x.nodeId,values:[0,-weightKN*1000*x.areaM2/totalArea,0,0,0,0],source:"wall-dead-load",face,tributaryAreaM2:x.areaM2,sourceWeightKN:weightKN* x.areaM2/totalArea}));
  rows.push({face,status:"assigned",material:cfg.material,supportMode:mode,source,unitWeightKNm2:q,areaM2:totalArea,weightKN,nodeCount:weights.length,tributaryAreas:weights.map(x=>({nodeId:x.nodeId,areaM2:x.areaM2}))});
 });
 const success=issues.length===0&&rows.length===FACES.filter(f=>walls[f]?.material).length&&rows.every(r=>r.status==="assigned"||r.status==="grade-beam-line-load-ready");
 return {success,loadTransferEnabled:success,issues,rows,nodalLoads,totalWeightKN:rows.filter(r=>["assigned","grade-beam-line-load-ready"].includes(r.status)).reduce((s,r)=>s+r.weightKN,0),method:"explicit base-bearing tributary nodal transfer plus grade-beam member distributed loads, including linear gable-height variation",limits:["Direct-bearing walls are transferred to explicit modeled base support nodes; grade-beam walls are loaded on the modeled concrete tie-beam members.","Grade beams are represented by frame members with gross uncracked stiffness; continuous soil contact, strip-footing bearing, settlement and footing design are not included.","Walls with openings are blocked until opening-localized tributary areas and load paths are modeled.","Steel-secondary and independent wall support systems are not transferred.","Gable wind is separate and remains blocked until its cladding-to-post/top-chord path is defined."],analysisEnabled:false,designApproved:false};
}
function prepareNodalLoads(model,deadFactor,precomputedAudit){
 const factor=num(deadFactor);if(factor===null||factor<0)throw Error("ضریب بار مرده دیوار نامعتبر است.");
 const a=precomputedAudit||audit(model);if(!a.success||a.loadTransferEnabled!==true)throw Error("انتقال وزن مرده دیوار ناقص است: "+(a.issues||[]).join("؛ "));
 if(factor===0)return [];
 const map=new Map();
 a.nodalLoads.forEach(n=>{const old=map.get(n.nodeId)||{nodeId:n.nodeId,values:[0,0,0,0,0,0],sources:[]};n.values.forEach((v,i)=>old.values[i]+=v*factor);old.sources.push({face:n.face,sourceWeightKN:n.sourceWeightKN*factor});map.set(n.nodeId,old);});
 return [...map.values()];
}
function prepareMemberLineLoads(model,deadFactor,precomputedAudit){
 const factor=num(deadFactor);if(factor===null||factor<0)throw Error("ضریب بار مرده دیوار نامعتبر است.");
 const a=precomputedAudit||audit(model);if(!a.success||a.loadTransferEnabled!==true)throw Error("انتقال بار دیوار به شناژ کامل نیست: "+(a.issues||[]).join("؛ "));
 if(factor===0)return[];
 const routes=new Map();
 (root.SteelTieBeamLayout?.getData?.()?.routes||[]).forEach(r=>routes.set(String(r.id),r));
 const out=[];
 a.rows.filter(r=>r.status==="grade-beam-line-load-ready").forEach(row=>{
  const routeIds=new Set((row.gradeBeamSupportAudit?.segments||[]).map(s=>s.routeId));
  routeIds.forEach(routeId=>{
   const route=routes.get(routeId);if(!route)throw Error("مسیر شناژ "+routeId+" در زمان اعمال بار پیدا نشد.");
   const segment=row.gradeBeamSupportAudit.segments.find(s=>s.routeId===routeId);
   const start=model.nodes.find(n=>String(n.id)===segment.startNodeId),end=model.nodes.find(n=>String(n.id)===segment.endNodeId);
   if(!start||!end)throw Error("گره ابتدا/انتهای شناژ "+routeId+" در مدل موجود نیست.");
   const axis=row.face==="left"||row.face==="right"?"z":"x",cross=axis==="z"?"x":"z";
   const direction=Math.sign(Number(end[axis])-Number(start[axis]));
   const intermediate=model.nodes.filter(n=>(n.kind==="base"||n.kind==="endwall-base")&&Math.abs(Number(n.y)-Number(start.y))<=0.01&&Math.abs(Number(n[cross])-Number(start[cross]))<=1e-4&&direction*(Number(n[axis])-Number(start[axis]))>0.01&&direction*(Number(end[axis])-Number(n[axis]))>0.01).sort((a,b)=>direction*(Number(a[axis])-Number(b[axis])));
   const routeNodes=[start,...intermediate,end];
   const beamPrefix="TIE_BEAM_"+routeId.replace(/[^A-Za-z0-9_-]/g,"_")+"_S";
   const coordinate=row.face==="left"||row.face==="right"?"z":"x";
   for(let i=0;i<routeNodes.length-1;i++){
    const ni=routeNodes[i],nj=routeNodes[i+1],memberId=beamPrefix+(i+1),length=Math.hypot(nj.x-ni.x,nj.y-ni.y,nj.z-ni.z);
    const intensity=node=>Number(segment.unitWeightKNm2)*
     (row.face==="left"||row.face==="right"?Number(model.geometry.height):roofY(Number(node[coordinate]),model.geometry));
    const q0=intensity(ni),q1=intensity(nj),average=(q0+q1)/2;
    out.push({memberId,routeId,face:row.face,uniformGlobalKNm:[0,-average,0],globalStartKNm:[0,-q0,0],globalEndKNm:[0,-q1,0],
     lineLoadKNm:average,sourceWeightKN:average*length,segmentLengthM:length,deadFactor:factor,loadFactorAppliedInSolver:true,distribution:"linear-global-vertical"});
   }
  });
 });
 return out;
}
function auditAppliedMemberLoadResultant(model,loads,expectedWeightKN,deadFactor){
 const issues=[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n])),members=new Map((model?.members||[]).map(m=>[String(m.id),m]));
 const factor=num(deadFactor),expected=num(expectedWeightKN);
 if(factor===null||factor<0||expected===null||expected<0)issues.push("ضریب یا وزن مورد انتظار برای ممیزی بار شناژ معتبر نیست.");
 const seen=new Set();let weight=0;const force=[0,0,0],moment=[0,0,0],rows=[];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 (loads||[]).forEach(load=>{
  const id=String(load.memberId),member=members.get(id),ni=member&&nodes.get(String(member.start)),nj=member&&nodes.get(String(member.end));
  if(seen.has(id)){issues.push("بار دیوار بیش از یک‌بار به عضو شناژ "+id+" تخصیص یافته است.");return;}seen.add(id);
  if(!member||!ni||!nj){issues.push("عضو یا گره‌های شناژ برای بار دیوار "+id+" موجود نیست.");return;}
  const q0=load.globalStartKNm,q1=load.globalEndKNm;
  if(!Array.isArray(q0)||!Array.isArray(q1)||q0.length!==3||q1.length!==3||[...q0,...q1].some(v=>!Number.isFinite(Number(v)))){
   issues.push("بردار ابتدا/انتهای بار دیوار روی "+id+" نامعتبر است.");return;
  }
  if(Math.abs(Number(q0[0]))>1e-8||Math.abs(Number(q0[2]))>1e-8||Math.abs(Number(q1[0]))>1e-8||Math.abs(Number(q1[2]))>1e-8||Number(q0[1])>1e-8||Number(q1[1])>1e-8){
   issues.push("بار دیوار روی "+id+" باید قائم و رو به پایین باشد.");return;
  }
  const r0=[Number(ni.x)||0,Number(ni.y)||0,Number(ni.z)||0],r1=[Number(nj.x)||0,Number(nj.y)||0,Number(nj.z)||0];
  const L=Math.hypot(r1[0]-r0[0],r1[1]-r0[1],r1[2]-r0[2]);
  if(!(L>1e-8)){issues.push("طول عضو شناژ "+id+" صفر یا نامعتبر است.");return;}
  const f0=q0.map(v=>Number(v)*L*factor),f1=q1.map(v=>Number(v)*L*factor);
  const resultant=f0.map((v,i)=>(v+f1[i])/2);
  const dr=r1.map((v,i)=>v-r0[i]),dq=q1.map((v,i)=>Number(v)-Number(q0[i]));
  const exactMoment=cross(r0,q0.map(Number)).map((v,i)=>L*factor*(v+0.5*(cross(r0,dq)[i]+cross(dr,q0.map(Number))[i])+(1/3)*cross(dr,dq)[i]));
  resultant.forEach((v,i)=>force[i]+=v);
  exactMoment.forEach((v,i)=>moment[i]+=v);
  const w=-resultant[1],source=Number(load.sourceWeightKN)*factor;
  if(!Number.isFinite(source)||Math.abs(source-w)>Math.max(1e-6,Math.abs(w)*1e-7))issues.push("وزن دفتر بار و برآیند بار خطی عضو "+id+" یکسان نیست.");
  const storedAverage=Number(member.lineLoads?.wallMasonryDead);
  if(!Number.isFinite(storedAverage)||Math.abs(storedAverage-Number(load.lineLoadKNm))>1e-7)issues.push("بار متوسط دیوار در دفتر عضو "+id+" ثبت نشده یا مقدار آن متفاوت است.");
  const stored=member.lineLoads?.wallMasonryLinearGlobalKNm;
  if(!stored||!Array.isArray(stored.start)||!Array.isArray(stored.end)||stored.start.length!==3||stored.end.length!==3||
    stored.start.some((v,i)=>Math.abs(Number(v)-Number(q0[i]))>1e-8)||stored.end.some((v,i)=>Math.abs(Number(v)-Number(q1[i]))>1e-8))
   issues.push("بردار خطی بار دیوار در عضو "+id+" با بار ممیزی‌شده تطابق ندارد.");
  weight+=w;rows.push({memberId:id,lengthM:L,weightKN:w,momentAboutOriginKNm:exactMoment});
 });
 const target=expected*factor,difference=weight-target;
 if(Math.abs(difference)>Math.max(1e-6,Math.abs(target)*1e-7))issues.push("جمع برآیند بار شناژها با وزن مورد انتظار دیوار برابر نیست.");
 return {success:issues.length===0,expectedWeightKN:target,integratedWeightKN:weight,weightDifferenceKN:difference,globalForceKN:force,globalMomentAboutOriginKNm:moment,memberCount:rows.length,rows,issues,note:"این ممیزی برآیند و لنگر بارهای گسترده دیوار روی اعضای شناژ را کنترل می‌کند؛ کنترل واکنش کلی مدل جداگانه از گزارش تعادل حل‌گر خوانده می‌شود."};
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:fn()!==false});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const oldBrief=root.SteelDesignCore,oldMasonry=root.SteelMasonryWallAudit,oldTransfer=root.SteelWallDeadLoadTransfer,oldTieBeam=root.SteelTieBeamLayout;
 const g={span:10,length:20,height:5,rise:2};
 const nodes=[
  {id:"L0",x:0,y:0,z:0,kind:"base"},{id:"L1",x:0,y:0,z:10,kind:"base"},{id:"L2",x:0,y:0,z:20,kind:"base"},
  {id:"R0",x:10,y:0,z:0,kind:"base"},{id:"R1",x:10,y:0,z:10,kind:"base"},{id:"R2",x:10,y:0,z:20,kind:"base"},
  {id:"F1",x:5,y:0,z:0,kind:"endwall-base"},{id:"B1",x:5,y:0,z:20,kind:"endwall-base"}
 ];
 const model={geometry:g,nodes,members:[]};
 const wallEnvelope={front:{material:"brick",supportMode:"foundation-bearing"},rear:{material:"brick",supportMode:"foundation-bearing"},left:{material:"brick",supportMode:"foundation-bearing"},right:{material:"brick",supportMode:"foundation-bearing"}};
 const brief={wallEnvelope,masonry:{thicknessMm:200,unitWeightKNm3:18,plasterThicknessMm:0}};
 root.SteelDesignCore={getData:()=>brief};
 root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:(face==="front"||face==="rear")?60:100,openingAreaM2:0,weightKN:(face==="front"||face==="rear")?216:360}))})};
 const a=audit(model);
 t("foundation-bearing brick walls produce four face transfers",()=>a.success&&a.rows.length===4&&a.nodalLoads.length===12);
 t("grade-beam support is never converted to frame-base nodal loads",()=>{brief.wallEnvelope.left.supportMode="grade-beam";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success&&x.nodalLoads.length===9&&x.rows.find(r=>r.face==="left").status==="grade-beam-path-incomplete";});
 t("four grade-beam wall faces audit with gable ridge splits and exact total weight",()=>{brief.wallEnvelope.front.supportMode="grade-beam";brief.wallEnvelope.rear.supportMode="grade-beam";brief.wallEnvelope.left.supportMode="grade-beam";brief.wallEnvelope.right.supportMode="grade-beam";root.SteelTieBeamLayout={getData:()=>({routes:[{id:"GF",start:"L0",end:"R0",startJoint:"rigid",endJoint:"rigid"},{id:"GR",start:"L2",end:"R2",startJoint:"rigid",endJoint:"rigid"},{id:"GL",start:"L0",end:"L2",startJoint:"rigid",endJoint:"rigid"},{id:"GT",start:"R0",end:"R2",startJoint:"rigid",endJoint:"rigid"}]})};const x=audit(model);FACES.forEach(face=>brief.wallEnvelope[face].supportMode="foundation-bearing");return x.success&&x.rows.length===4&&x.rows.every(r=>r.status==="grade-beam-line-load-ready")&&Math.abs(x.totalWeightKN-1152)<1e-8;});
 t("tributary nodal forces equal total wall dead weight",()=>Math.abs(a.nodalLoads.reduce((s,x)=>s-x.values[1]/1000,0)-a.totalWeightKN)<1e-8);
 t("front gable tributary areas integrate exact roof slope",()=>{const f=a.rows.find(x=>x.face==="front");return Math.abs(f.areaM2-(10*5+10*2/2))<1e-8;});
 t("dead factor scales only the wall dead nodal actions",()=>{const x=prepareNodalLoads(model,1.4);return Math.abs(x.reduce((s,n)=>s-n.values[1]/1000,0)-a.totalWeightKN*1.4)<1e-8;});
 t("unknown support mode is blocked",()=>{brief.wallEnvelope.left.supportMode="unknown";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success&&x.issues.some(v=>v.includes("اتکای مستقیم"));});
 t("steel-secondary support remains explicitly unsupported",()=>{brief.wallEnvelope.left.supportMode="steel-secondary";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success;});
 t("complete longitudinal girt-to-column topology is recognized",()=>{const x=inspectSecondarySupportPath({nodes:[{id:"A"},{id:"B"},{id:"C"},{id:"D"}],members:[{id:"G",sectionKey:"wallGirt",side:"left",start:"A",end:"B"},{id:"C1",sectionKey:"column",start:"A",end:"C"},{id:"C2",sectionKey:"column",start:"B",end:"D"}]},"left");return x.success&&x.candidateMemberCount===1&&x.connectedMemberCount===1;});
 t("missing longitudinal girt support at one end is blocked",()=>{const x=inspectSecondarySupportPath({nodes:[{id:"A"},{id:"B"},{id:"C"}],members:[{id:"G",sectionKey:"wallGirt",side:"left",start:"A",end:"B"},{id:"C1",sectionKey:"column",start:"A",end:"C"}]},"left");return !x.success&&x.issues.length===1;});
 t("complete end-wall girt-to-post topology is recognized",()=>{const x=inspectSecondarySupportPath({nodes:[{id:"A"},{id:"B"},{id:"C"},{id:"D"}],members:[{id:"G",sectionKey:"endGirt",endFace:"front",start:"A",end:"B"},{id:"P1",sectionKey:"endPost",start:"A",end:"C"},{id:"P2",sectionKey:"endPost",start:"B",end:"D"}]},"front");return x.success&&x.connectedMemberCount===1;});
 t("non-brick wall requires entered surface weight",()=>{brief.wallEnvelope.left.material="sandwich-panel";const x=audit(model);brief.wallEnvelope.left.material="brick";return !x.success&&x.issues.some(v=>v.includes("وزن سطحی"));});
 t("wall openings block uniform tributary distribution",()=>{root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:59,openingAreaM2:1,weightKN:2124}))})};const x=audit(model);root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:(face==="front"||face==="rear")?60:100,openingAreaM2:0,weightKN:(face==="front"||face==="rear")?216:360}))})};return !x.success&&x.issues.some(v=>v.includes("بازشو"));});
 t("missing base support coverage is blocked",()=>{const x=audit({...model,nodes:nodes.filter(n=>n.id!=="L0")});return !x.success;});
 t("zero dead factor produces no wall nodal actions",()=>prepareNodalLoads(model,0).length===0);
 t("precomputed audit is reused without recalculating wall weights",()=>{const old=root.SteelMasonryWallAudit;root.SteelMasonryWallAudit={audit(){throw new Error("should not recalculate");}};const x=prepareNodalLoads(model,1.2,a);root.SteelMasonryWallAudit=old;return x.length>0;});
 t("grade-beam route audit accepts a continuous wall-side route",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T1",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:0,z:20}]},"left",3.6);return x.success&&Math.abs(x.weightKN-360)<1e-8&&x.solverLoadsGenerated===false;});
 t("grade-beam route audit blocks incomplete coverage",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T1",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:0,z:10}]},"left",3.6);return !x.success&&x.issues.some(v=>v.includes("پیوسته"));});
  t("gable route crossing ridge requires an actual ridge base node",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T2",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:10,y:0,z:0}]}, "front",3.6);return !x.success&&x.segments[0].crossesRidge===true&&x.issues.some(v=>v.includes("گره پایه در محور تاج"));});
 t("gable variable wall load uses exact end intensities on both roof slopes",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T3L",start:"A",end:"C",startJoint:"rigid",endJoint:"rigid"},{id:"T3R",start:"C",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const x=inspectGradeBeamSupportPath({geometry:g,nodes:[{id:"A",x:0,y:0,z:0,kind:"endwall-base"},{id:"C",x:5,y:0,z:0,kind:"endwall-base"},{id:"B",x:10,y:0,z:0,kind:"endwall-base"}]},"front",3.6);return x.success&&Math.abs(x.segments[0].startLineLoadKNm-18)<1e-8&&Math.abs(x.segments[0].endLineLoadKNm-25.2)<1e-8&&Math.abs(x.segments[1].startLineLoadKNm-25.2)<1e-8&&Math.abs(x.segments[1].endLineLoadKNm-18)<1e-8&&Math.abs(x.weightKN-216)<1e-8;});
 t("grade-beam wall transfer creates line loads, not base-node loads",()=>{const old= root.SteelTieBeamLayout;root.SteelTieBeamLayout={getData:()=>({routes:[{id:"T1",start:"A",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const model={geometry:g,nodes:[{id:"A",x:0,y:0,z:0,kind:"base"},{id:"M1",x:0,y:0,z:5,kind:"base"},{id:"M2",x:0,y:0,z:15,kind:"base"},{id:"B",x:0,y:0,z:20,kind:"base"}]};const auditResult={success:true,loadTransferEnabled:true,rows:[{face:"left",status:"grade-beam-line-load-ready",gradeBeamSupportAudit:{segments:[{routeId:"T1",startNodeId:"A",endNodeId:"B",uniformEquivalentLineLoadKNm:3.6,startLineLoadKNm:3.6,endLineLoadKNm:3.6,unitWeightKNm2:0.72,weightKN:72}]}}]};const x=prepareMemberLineLoads(model,1.5,auditResult);root.SteelTieBeamLayout=old;return x.length===3&&x.every(v=>Math.abs(v.lineLoadKNm-3.6)<1e-8)&&Math.abs(x.reduce((s,v)=>s+v.sourceWeightKN,0)-72)<1e-8;});
 t("gable split شناژ segments carry peak ridge intensity and exact total weight",()=>{root.SteelTieBeamLayout={getData:()=>({routes:[{id:"GL",start:"A",end:"C",startJoint:"rigid",endJoint:"rigid"},{id:"GR",start:"C",end:"B",startJoint:"rigid",endJoint:"rigid"}]})};const gm={geometry:g,nodes:[{id:"A",x:0,y:0,z:0,kind:"endwall-base"},{id:"C",x:5,y:0,z:0,kind:"endwall-base"},{id:"B",x:10,y:0,z:0,kind:"endwall-base"}]};const ar={success:true,loadTransferEnabled:true,rows:[{face:"front",status:"grade-beam-line-load-ready",gradeBeamSupportAudit:{segments:[{routeId:"GL",startNodeId:"A",endNodeId:"C",unitWeightKNm2:3.6},{routeId:"GR",startNodeId:"C",endNodeId:"B",unitWeightKNm2:3.6}]}}]};const loads=prepareMemberLineLoads(gm,1,ar);return loads.length===2&&Math.abs(loads[0].globalStartKNm[1]+18)<1e-8&&Math.abs(loads[0].globalEndKNm[1]+25.2)<1e-8&&Math.abs(loads[1].globalStartKNm[1]+25.2)<1e-8&&Math.abs(loads[1].globalEndKNm[1]+18)<1e-8&&Math.abs(loads.reduce((sum,x)=>sum+x.sourceWeightKN,0)-216)<1e-8;});
 t("applied grade-beam wall loads preserve exact force and global moment resultants",()=>{const mm={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:5,y:0,z:0}],members:[{id:"TIE_BEAM_R_S1",start:"A",end:"B",lineLoads:{wallMasonryDead:21.6,wallMasonryLinearGlobalKNm:{start:[0,-18,0],end:[0,-25.2,0]}}}]};const ll=[{memberId:"TIE_BEAM_R_S1",globalStartKNm:[0,-18,0],globalEndKNm:[0,-25.2,0],lineLoadKNm:21.6,sourceWeightKN:108}];const x=auditAppliedMemberLoadResultant(mm,ll,108,1);return x.success&&Math.abs(x.integratedWeightKN-108)<1e-8&&Math.abs(x.globalForceKN[1]+108)<1e-8&&Math.abs(x.globalMomentAboutOriginKNm[2]+285)<1e-8;});
 t("applied grade-beam wall audit rejects missing linear vector endpoint",()=>{const mm={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:5,y:0,z:0}],members:[{id:"TIE_BEAM_R_S1",start:"A",end:"B",lineLoads:{wallMasonryDead:21.6,wallMasonryLinearGlobalKNm:{start:[0,-18,0]}}}]};const ll=[{memberId:"TIE_BEAM_R_S1",globalStartKNm:[0,-18,0],globalEndKNm:[0,-25.2,0],lineLoadKNm:21.6,sourceWeightKN:108}];return !auditAppliedMemberLoadResultant(mm,ll,108,1).success;});
 t("applied grade-beam wall load audit rejects missing member ledger entry",()=>{const mm={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:5,y:0,z:0}],members:[{id:"TIE_BEAM_R_S1",start:"A",end:"B",lineLoads:{}}]};const ll=[{memberId:"TIE_BEAM_R_S1",globalStartKNm:[0,-18,0],globalEndKNm:[0,-25.2,0],lineLoadKNm:21.6,sourceWeightKN:108}];return !auditAppliedMemberLoadResultant(mm,ll,108,1).success;});
 t("analysis approval remains disabled",()=>a.analysisEnabled===false&&a.designApproved===false);
 root.SteelDesignCore=oldBrief;root.SteelMasonryWallAudit=oldMasonry;root.SteelWallDeadLoadTransfer=oldTransfer;root.SteelTieBeamLayout=oldTieBeam;
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests};
}
root.SteelWallDeadLoadTransfer={audit,prepareNodalLoads,prepareMemberLineLoads,auditAppliedMemberLoadResultant,inspectSecondarySupportPath,inspectGradeBeamSupportPath,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/climate-database.js ===== */
/* SAHROUD STEEL - Climate City Database 1.0 */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const cities = [
["shahroud","شاهرود"],["semnan","سمنان"],["tehran","تهران"],["mashhad","مشهد"],["tabriz","تبریز"],["isfahan","اصفهان"],["yazd","یزد"],["rasht","رشت"],["sari","ساری"],["kerman","کرمان"],["arak","اراک"],["ardabil","اردبیل"],["urmia","ارومیه"],["ahvaz","اهواز"],["bandar-abbas","بندرعباس"],["bushehr","بوشهر"],["birjand","بیرجند"],["bojnord","بجنورد"],["hamedan","همدان"],["sanandaj","سنندج"],["kermanshah","کرمانشاه"],["ilam","ایلام"],["khorramabad","خرم‌آباد"],["qazvin","قزوین"],["zanjan","زنجان"],["gorgan","گرگان"],["yasuj","یاسوج"],["shiraz","شیراز"],["zahedan","زاهدان"],["zabol","زابل"],["qom","قم"],["kish","کیش"],["abadan","آبادان"],["dezful","دزفول"],["sabzevar","سبزوار"],["neyshabur","نیشابور"],["damghan","دامغان"],["garmsar","گرمسار"],["torbat-heydariyeh","تربت حیدریه"],["chabahar","چابهار"],["bandar-anzali","بندر انزلی"],["amol","آمل"],["babol","بابل"]
];
let records = {};
cities.forEach(([id,name]) => records[id] = {id,name,groundSnow:null,basicWind:null,basicWindPressure:null,snowRegion:null,elevation:null,seismicZone:null,meanAnnualTemperature:null,designTemperature:null,source:"",sourceTitle:"",sourceUrl:"",sourceDate:"",codeEdition:"",verified:false,status:"نیازمند ورود و تطبیق با منبع رسمی"});
function applyShahroudReference(){
 const r=records.shahroud;if(!r)return;
 r.name="شاهرود";r.basicWind=90;r.basicWindPressure=0.383;r.groundSnow=1.0;r.snowRegion=3;
 if(r.elevation===null||r.elevation===undefined)r.elevation=1350;
 r.siteCoordinates=r.siteCoordinates||{latitude:36.37478,longitude:54.88545};
 r.elevationSource=r.elevationSource||"برآورد تقریبی مرکز شهرک صنعتی؛ نیازمند کنترل با DEM یا برداشت نقشه‌برداری";
 r.source="مبحث ششم ۱۳۹۸؛ جدول ۶-۱۰-۱ و رکورد PDF پروژه برای سرعت باد؛ سرعت ۹۰ km/h مطابق جدول ۶-۱۰-۱ ویرایش ۱۳۹۸؛ q≈۰٫۳۸۳ kN/m². ارتفاع ۱۳۵۰ متر برآورد تقریبی مرکز شهرک صنعتی شاهرود.";
 r.sourceDate="1398";r.status="سرعت باد و برف استخراج‌شده از رکورد پروژه؛ ارتفاع محل تقریبی و نیازمند کنترل نقشه‌برداری";
}
function currentClimate(){return window.SteelLoads?.getData?.().climate || {};}
function refreshStatus(){
 const el=$("climateDatabaseStatus"); if(!el)return;
 const all=Object.values(records), filled=all.filter(r=>r.basicWind!==null||r.groundSnow!==null).length;
 el.textContent="تعداد شهرهای فهرست: "+all.length+" | شهرهای دارای داده عددی: "+filled+" | داده‌های ثبت‌شده نیازمند کنترل منبع هستند.";
}
function loadSelectedCity(){
 const id=$("climateCity")?.value, r=records[id]; if(!r)return;
 const assign=(field,value)=>{
  const el=$(field);if(!el)return;
  el.value=value===null||value===undefined?"":String(value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
 };
 assign("climateCustomCity",r.name);
 assign("climateGroundSnow",r.groundSnow);
 assign("climateBasicWind",r.basicWind);
 assign("climateElevation",r.elevation);
 assign("climateSource",r.source||"");
 const status=$("climateNotice");
 if(status){
  const available=[r.basicWind!==null&&r.basicWind!==undefined,r.groundSnow!==null&&r.groundSnow!==undefined,r.elevation!==null&&r.elevation!==undefined].filter(Boolean).length;
  status.textContent=available
   ?("اطلاعات ثبت‌شده "+r.name+": "+(r.basicWind!=null?"سرعت مبنای باد "+r.basicWind+" km/h؛ ":"")+(r.groundSnow!=null?"برف مبنا "+r.groundSnow+" kN/m²؛ ":"")+(r.elevation!=null?"ارتفاع "+r.elevation+" m؛ ":"")+"منبع: "+(r.source||"ثبت نشده")+" | وضعیت: "+(r.status||"نیازمند بررسی")+". مقادیر مبنا هستند و بارهای نهایی باید طبق ویرایش آیین‌نامه و شرایط دقیق محل محاسبه شوند.")
   :"برای "+r.name+" داده عددی معتبر در بانک فعلی ثبت نشده است؛ فیلدهای شهر قبلی پاک شدند و هیچ مقدار حدسی جایگزین نشد.";
 }
 refreshStatus();
 window.dispatchEvent(new CustomEvent("sahroud:climate-city-loaded",{detail:{city:id,record:JSON.parse(JSON.stringify(r))}}));
}
function addOptions(){
 const sel=$("climateCity"), legacy=$("city"); if(!sel)return;
 cities.forEach(([id,name])=>{
  if(![...sel.options].some(o=>o.value===id)){const o=document.createElement("option");o.value=id;o.textContent=name;const other=sel.querySelector('option[value="other"]');sel.insertBefore(o,other||null);}
  if(legacy&&![...legacy.options].some(o=>o.value===id)){const o=document.createElement("option");o.value=id;o.textContent=name;legacy.appendChild(o);}
 });
 sel.addEventListener("change",loadSelectedCity);
}
function saveCurrentCity(){
 const c=currentClimate(),id=c.city||"other",name=(c.customCity||"").trim()||"شهر بدون نام";
 const num=v=>v===""||v===undefined?null:Number(v);
 const wind=num(c.basicWind),snow=num(c.groundSnow),elev=num(c.elevation);
 if([wind,snow,elev].some(v=>v!==null&&!Number.isFinite(v))){alert("مقادیر اقلیمی باید عددی باشند.");return;}
 const source=(c.source||"").trim();
 if((wind!==null||snow!==null)&&!source){alert("برای ثبت مقدار باد یا برف، منبع داده را وارد کنید.");return;}
 const previous=records[id]||{};
 records[id]={...previous,id,name,basicWind:wind,groundSnow:snow,basicWindPressure:previous.basicWindPressure??null,snowRegion:previous.snowRegion??null,elevation:elev,source,sourceDate:new Date().toISOString().slice(0,10),verified:false,status:source?"ثبت کاربر؛ نیازمند کنترل منبع":"فاقد داده عددی"};
 refreshStatus(); alert("رکورد شهر در بانک جاری ثبت شد. برای انتقال آن، پروژه را ذخیره یا از بانک خروجی JSON بگیرید.");
}
function exportDatabase(){
 const data={schema:"sahroud-steel-climate-db",version:1,exportedAt:new Date().toISOString(),records};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="Sahroud_Steel_Climate_DB.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function importDatabase(event){
 const file=event.target.files?.[0];if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const data=JSON.parse(reader.result);if(data.schema!=="sahroud-steel-climate-db"||!data.records)throw new Error("ساختار فایل بانک اقلیمی معتبر نیست.");
   Object.keys(data.records).forEach(id=>{
    const r=data.records[id];if(!r||typeof r!=="object")return;
    const n=v=>v===null||v===""||v===undefined?null:Number(v),wind=n(r.basicWind),snow=n(r.groundSnow),elev=n(r.elevation);
    if([wind,snow,elev].some(v=>v!==null&&(!Number.isFinite(v)||v<0)))return;
    records[id]={id,name:String(r.name||id),basicWind:wind,groundSnow:snow,basicWindPressure:n(r.basicWindPressure),snowRegion:n(r.snowRegion),elevation:elev,siteCoordinates:r.siteCoordinates&&typeof r.siteCoordinates==="object"?{latitude:Number(r.siteCoordinates.latitude),longitude:Number(r.siteCoordinates.longitude)}:null,elevationSource:String(r.elevationSource||""),seismicZone:r.seismicZone??null,meanAnnualTemperature:n(r.meanAnnualTemperature),designTemperature:n(r.designTemperature),source:String(r.source||""),sourceTitle:String(r.sourceTitle||""),sourceUrl:String(r.sourceUrl||""),sourceDate:String(r.sourceDate||""),codeEdition:String(r.codeEdition||""),verified:r.verified===true,status:String(r.status||"واردشده؛ نیازمند کنترل")};
   });
   applyShahroudReference();refreshStatus();loadSelectedCity();alert("بانک اقلیمی وارد شد؛ داده مرجع شاهرود حفظ شد.");
  }catch(e){alert("خطا در وارد کردن بانک: "+e.message);}
  event.target.value="";
 };
 reader.readAsText(file,"UTF-8");
}
function ensureTools(){
 const anchor=$("climateNotice");if(!anchor||$("climateDatabaseTools"))return;
 const box=document.createElement("div");box.id="climateDatabaseTools";
 box.innerHTML='<div class="notice"><b>بانک شهرها و سوابق اقلیمی</b><p id="climateDatabaseStatus"></p><div class="button-grid"><button type="button" class="btn primary" id="btnClimateSaveCity">ثبت مقادیر فعلی برای این شهر</button><button type="button" class="btn secondary" id="btnClimateExport">خروجی بانک شهرها (JSON)</button><button type="button" class="btn secondary" id="btnClimateImport">وارد کردن بانک شهرها (JSON)</button><input type="file" id="climateDatabaseFile" accept=".json,application/json" hidden></div><p class="hint">فهرست شهرها داخلی است؛ اعداد تا زمان تأیید منبع رسمی خالی می‌مانند. بانک را می‌توان بین پروژه‌ها و دستگاه‌ها منتقل کرد.</p></div>';
 anchor.insertAdjacentElement("afterend",box);
 $("btnClimateSaveCity").addEventListener("click",saveCurrentCity);
 $("btnClimateExport").addEventListener("click",exportDatabase);
 $("btnClimateImport").addEventListener("click",()=>$("climateDatabaseFile").click());
 $("climateDatabaseFile").addEventListener("change",importDatabase);
 refreshStatus();
}
function getData(){return {schema:"sahroud-steel-climate-db",version:1,records:JSON.parse(JSON.stringify(records))};}
function setData(data){
 if(!data||data.schema!=="sahroud-steel-climate-db"||!data.records)return;
 const cleanNumber=v=>v===null||v===undefined||v===""?null:(Number.isFinite(Number(v))?Number(v):null);
 Object.keys(data.records).forEach(id=>{const r=data.records[id];if(!r||typeof r!=="object")return;records[id]={id,name:String(r.name||id),basicWind:cleanNumber(r.basicWind),groundSnow:cleanNumber(r.groundSnow),basicWindPressure:cleanNumber(r.basicWindPressure),snowRegion:cleanNumber(r.snowRegion),elevation:cleanNumber(r.elevation),siteCoordinates:r.siteCoordinates&&Number.isFinite(Number(r.siteCoordinates.latitude))&&Number.isFinite(Number(r.siteCoordinates.longitude))?{latitude:Number(r.siteCoordinates.latitude),longitude:Number(r.siteCoordinates.longitude)}:null,elevationSource:String(r.elevationSource||""),source:String(r.source||""),sourceTitle:String(r.sourceTitle||""),sourceUrl:String(r.sourceUrl||""),sourceDate:String(r.sourceDate||""),codeEdition:String(r.codeEdition||""),verified:r.verified===true,seismicZone:r.seismicZone??null,meanAnnualTemperature:cleanNumber(r.meanAnnualTemperature),designTemperature:cleanNumber(r.designTemperature),status:String(r.status||"")};});
 applyShahroudReference();
 refreshStatus();
}
applyShahroudReference();
records.shahroud.basicWind=90;
records.shahroud.basicWindPressure=0.383;
records.shahroud.groundSnow=1.0;
records.shahroud.snowRegion=3;
records.shahroud.source="مبحث ششم ویرایش چهارم ۱۳۹۸؛ جدول ۶-۱۰-۱ برای سرعت مبنای باد شاهرود: ۹۰ km/h؛ فشار مبنا از رابطه ۶-۱۰-۲: حدود ۰٫۳۸۳ kN/m². مقدار برف طبق رکورد قبلی پروژه و جداگانه نیازمند تطبیق نهایی است.";
records.shahroud.sourceDate="1398";
records.shahroud.status="سرعت باد با جدول ویرایش ۱۳۹۸ تطبیق داده شد؛ ارتفاع محل همچنان تقریبی است و بار برف نیازمند کنترل مستقل";
window.SteelClimateDB={getData,setData,saveCurrentCity,exportDatabase,loadSelectedCity,getCity:id=>records[id]?JSON.parse(JSON.stringify(records[id])):null};
document.addEventListener("DOMContentLoaded",()=>{ensureTools();addOptions();});
})();

/* ===== steel2/js/climate-load-engine.js ===== */
/* SAHROUD STEEL - Climate Load Case Registry 1.0
   Organizes entered load values without inventing code coefficients.
   Units: kN/m2. All generated records are preliminary/unverified.
*/
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let restoredMeta = null;
  const windCoefficientDefaults = {
    importance: "", exposure: "", topography: "", gust: "",
    externalPressure: "", directionality: "",
    internalGust: "", internalPressure: ""
  };
  function windCoefficientBasis(breadth) {
    const span=finite($("span")?.value),length=finite($("length")?.value);
    const eave=finite($("height")?.value),rise=finite($("rise")?.value);
    const h=eave!==null&&rise!==null?eave+rise:null;
    if(h===null||!(h>0)||breadth===null||!(breadth>0))return null;
    const ratio=h/breadth;
    return {height:h,breadth,heightToBreadth:ratio,combined:h<20&&ratio<1};
  }
  function readWindCoefficients() {
    const ids = {
      importance:"windCoeffIw", exposure:"windCoeffCe",
      topography:"windCoeffCt", gust:"windCoeffCg",
      externalPressure:"windCoeffCp", directionality:"windCoeffCd",
      internalGust:"windCoeffCgi", internalPressure:"windCoeffCpi"
    };
    const saved = restoredMeta && restoredMeta.windCalculation && restoredMeta.windCalculation.coefficients
      ? restoredMeta.windCalculation.coefficients : {};
    const result = {};
    Object.keys(ids).forEach(key => {
      const el = $(ids[key]);
      result[key] = el ? el.value : (saved[key] !== undefined ? saved[key] : windCoefficientDefaults[key]);
    });
    return result;
  }
  function calculateWindPressure() {
    const loads = window.SteelLoads && window.SteelLoads.getData ? window.SteelLoads.getData() : {};
    const climate = loads.climate || {};
    const speed = finite(climate.basicWind);
    const q = speed === null ? null : 0.000613 * Math.pow(speed / 3.6, 2);
    const c = readWindCoefficients();
    const required = Object.keys(windCoefficientDefaults).filter(key => key !== "gust");
    const values = {};
    required.forEach(key => values[key] = finite(c[key]));
    const complete = q !== null && required.every(key => values[key] !== null);
    if (!complete) return { q, coefficients:c, complete:false, external:null, internal:null, net:null };
    const common = values.importance * q * values.exposure * values.topography * values.directionality;
    const span=finite($("span")?.value),length=finite($("length")?.value);
    const bx=windCoefficientBasis(span),bz=windCoefficientBasis(length);
    if(!bx||!bz||bx.combined!==bz.combined)
      return {q,coefficients:c,complete:false,external:null,internal:null,net:null,reason:"برای این محاسبه عمومی، مبنای CgCp/Cp در دو راستای اصلی یکسان یا هندسه کامل نیست؛ از دفتر باد جهت‌دار استفاده کنید."};
    if(!bx.combined&&!(values.gust>0))
      return {q,coefficients:c,complete:false,external:null,internal:null,net:null,reason:"در حالت Cp جداگانه، Cg باید مثبت و معتبر باشد."};
    const external = common * (bx.combined ? values.externalPressure : values.gust * values.externalPressure);
    const internal = common * values.internalGust * values.internalPressure;
    return { q, coefficients:c, complete:true, external, internal, net:external-internal, externalCoefficientBasis:bx.combined?"combined-CgCp":"separate-Cp" };
  }
  function updateWindPressureResult() {
    const out = $("windPressureCalculationResult");
    if (!out) return;
    const r = calculateWindPressure();
    if (r.q === null) {
      out.textContent = "ابتدا سرعت مبنای باد را در اطلاعات اقلیمی وارد کنید.";
      return;
    }
    const qText = "فشار مبنا q = " + r.q.toFixed(3) + " kN/m². ";
    if (!r.complete) {
      out.textContent = qText + (r.reason || "برای محاسبه فشار خارجی و داخلی، ضرایب لازم باید از متن معتبر مبحث ششم ۱۳۹۸ وارد شوند. هیچ ضریب پیش‌فرض یا حدسی اعمال نمی‌شود.");
      return;
    }
    out.textContent = qText +
      "فشار خارجی = " + r.external.toFixed(3) + " kN/m²؛ فشار داخلی = " + r.internal.toFixed(3) +
      " kN/m²؛ فشار خالص این سطح = " + r.net.toFixed(3) +
      " kN/m² (فشار خالص = خارجی منهای داخلی؛ علامت ضرایب حفظ شده است). " +
      "این محاسبه برای یک سطح و یک مجموعه ضریب ورودی است و هنوز به اعضای مدل سه‌بعدی منتقل نمی‌شود.";
  }
  function finite(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  const windZoneIds = {
    "roof-left":"windZoneRoofLeft","roof-right":"windZoneRoofRight",
    "long-wall-left":"windZoneLongLeft","long-wall-right":"windZoneLongRight",
    "end-wall-front":"windZoneEndFront","end-wall-back":"windZoneEndBack"
  };
  function readWindZones() {
    const saved=restoredMeta&&restoredMeta.windZones?restoredMeta.windZones:{};
    const result={};
    Object.keys(windZoneIds).forEach(key=>{
      const el=document.querySelector('.wind-zone-cp[data-zone="'+key+'"]');
      result[key]=el?el.value:(saved[key]!==undefined?saved[key]:"");
    });
    return result;
  }
  function calculateWindZones() {
    const loads=window.SteelLoads&&window.SteelLoads.getData?window.SteelLoads.getData():{};
    const climate=loads.climate||{},speed=finite(climate.basicWind);
    const q=speed===null?null:0.000613*Math.pow(speed/3.6,2);
    const c=readWindCoefficients(),v={};
    Object.keys(windCoefficientDefaults).forEach(k=>v[k]=finite(c[k]));
    const zones=readWindZones();
    const required=["importance","exposure","topography","directionality","internalGust"];
    const commonReady=q!==null&&required.every(k=>v[k]!==null);
    const internalMagnitude=v.internalPressure===null?null:Math.abs(v.internalPressure);
    const rows={};
    Object.keys(zones).forEach(key=>{
      const cp=finite(zones[key]);
      if(!commonReady||cp===null||internalMagnitude===null){rows[key]=null;return;}
      const common=v.importance*q*v.exposure*v.topography*v.directionality;
      const breadth=key.startsWith("end-wall-")?finite($("length")?.value):finite($("span")?.value);
      const basis=windCoefficientBasis(breadth);
      if(!basis||(!basis.combined&&!(v.gust>0))){rows[key]=null;return;}
      const ext=common*(basis.combined?cp:v.gust*cp);
      const intMagnitude=common*v.internalGust*internalMagnitude;
      rows[key]={cp,external:ext,externalCoefficientBasis:basis.combined?"combined-CgCp":"separate-Cp",
        heightToBreadth:basis.heightToBreadth,internalPositive:intMagnitude,internalNegative:-intMagnitude,
        netInternalPositive:ext-intMagnitude,netInternalNegative:ext+intMagnitude};
    });
    return {q,rows,zones,ready:Object.values(rows).every(Boolean)};
  }
  function updateWindZones() {
    const r=calculateWindZones();
    const map={
      "roof-left":["windZoneRoofLeftPlus","windZoneRoofLeftMinus"],
      "roof-right":["windZoneRoofRightPlus","windZoneRoofRightMinus"],
      "long-wall-left":["windZoneLongLeftPlus","windZoneLongLeftMinus"],
      "long-wall-right":["windZoneLongRightPlus","windZoneLongRightMinus"],
      "end-wall-front":["windZoneEndFrontPlus","windZoneEndFrontMinus"],
      "end-wall-back":["windZoneEndBackPlus","windZoneEndBackMinus"]
    };
    Object.keys(map).forEach(k=>{
      const x=r.rows[k],ids=map[k];
      if($(ids[0]))$(ids[0]).textContent=x?x.netInternalPositive.toFixed(3)+" kN/m²":"—";
      if($(ids[1]))$(ids[1]).textContent=x?x.netInternalNegative.toFixed(3)+" kN/m²":"—";
    });
    const out=$("windZoneStatus");
    if(out)out.textContent=r.ready
      ?"فشار خالص هر شش سطح برای دو حالت علامت فشار داخلی محاسبه شد. مبنای CgCp/Cp طبق هندسه کنترل شد. q="+r.q.toFixed(3)+" kN/m². مقادیر هنوز دستی/تأییدنشده‌اند و به تحلیل سه‌بعدی منتقل نمی‌شوند."
      :"برای محاسبه همه سطوح، ضرایب مشترک Iw، Ce، Ct، Cd، Cgi، قدرمطلق Cpi و ضریب خارجی هر سطح را وارد کنید؛ Cg فقط در حالت Cp جداگانه لازم است.";
  }
  function getData() {
    const loads = window.SteelLoads && window.SteelLoads.getData ? window.SteelLoads.getData() : {};
    const climate = loads.climate || {};
    const cases = [];
    const add = (id, type, value, side, signMeaning) => {
      const n = finite(value);
      cases.push({
        id, type, side: side || "both", value: n, unit: "kN/m2",
        signMeaning: signMeaning || "مقدار ورودی؛ تفسیر علامت نیازمند قرارداد بارگذاری پروژه",
        source: climate.source || "ورود دستی", city: climate.customCity || climate.city || "",
        codeEdition: "مبحث ششم ۱۳۹۸",
        validationStatus: n === null ? "missing" : "user-input-unverified",
        eligibleForCodeDesign: false
      });
    };
    ["Left","Right"].forEach(s => {
      const side = s === "Left" ? "left" : "right";
      add(side+"-dead","dead",loads["dead"+s],side);
      add(side+"-live","live",loads["live"+s],side);
      add(side+"-snow","snow-roof-input",loads["snow"+s],side);
      add(side+"-wind","wind-roof-input",loads["wind"+s],side,
        "علامت حفظ می‌شود؛ فشار/مکش نهایی و ضرایب خارجی/داخلی هنوز تعیین نشده‌اند");
    });
    add("wall-wind","wind-wall-input",loads.windWall,"long-walls",
      "فشار خالص دستی؛ در مدل سه‌بعدی به قیدهای طولی منتقل می‌شود");
    add("front-end-wall-wind","wind-endwall-input",loads.windEndFront,"front",
      "فشار خالص دستی؛ در مدل سه‌بعدی به تیرهای افقی دیوار انتهایی جلو منتقل می‌شود؛ ناحیه مثلثی زیر تاج هنوز منظور نشده است");
    add("rear-end-wall-wind","wind-endwall-input",loads.windEndBack,"rear",
      "فشار خالص دستی؛ در مدل سه‌بعدی به تیرهای افقی دیوار انتهایی عقب منتقل می‌شود؛ ناحیه مثلثی زیر تاج هنوز منظور نشده است");
    return {
      schema:"sahroud-steel-load-cases", version:1,
      generatedAt:new Date().toISOString(), codeEdition:"مبحث ششم ۱۳۹۸",
      status:"preliminary-input-registry",
      note:"این فهرست فقط مقادیر واردشده را سازمان‌دهی می‌کند؛ بار آیین‌نامه‌ای یا ترکیب بار طراحی تولید نمی‌کند.",
      windCalculation:{
        coefficients:readWindCoefficients(),
        zones:readWindZones(),
        zoneResults:calculateWindZones(),
        status:"manual-code-coefficients-calculated-for-multiple-surfaces-not-applied-to-3d-model",
        formulaExternal:"P = Iw q Ce Ct Cd × CgCp (combined) OR × Cg × Cp (separate)",
        formulaInternal:"Pi = Iw q Ce Ct Cgi Cpi Cd",
        netConvention:"Pnet = Pexternal - Pinternal"
      },
      climate:{
        city:climate.city||"", customCity:climate.customCity||"",
        elevation:climate.elevation||"", groundSnow:climate.groundSnow||"",
        basicWind:climate.basicWind||"", basicWindUnit:"km/h",
        basicWindPressure:finite(climate.basicWind)===null?null:0.000613*Math.pow(Number(climate.basicWind)/3.6,2),
        basicWindPressureUnit:"kN/m2", groundSnowUnit:"kN/m2",
        siteElevationASL:finite(climate.elevation), terrain:climate.terrain||"",
        topography:climate.topography||"", openingState:climate.openingState||"",
        dominantOpening:climate.dominantOpening||"",
        windCalculationStatus:"basic-pressure-only; terrain and building coefficients not yet applied"
      },
      windDirection:loads.windDirection||"not-specified", cases, restoredMeta
    };
  }
  function getRoofSideCases(loads, side) {
    const suffix = side === "left" ? "Left" : "Right";
    const d = loads || (window.SteelLoads && window.SteelLoads.getData ? window.SteelLoads.getData() : {});
    const dead=finite(d["dead"+suffix]) ?? 0;
    const live=finite(d["live"+suffix]) ?? 0;
    const snow=finite(d["snow"+suffix]) ?? 0;
    const wind=finite(d["wind"+suffix]) ?? 0;
    return {
      side,
      gravity:{dead,live,snow,total:dead+live+snow,status:"unfactored-user-input"},
      wind:{signed:wind,magnitude:Math.abs(wind),direction:d.windDirection||"not-specified",status:"signed-user-input-unverified"}
    };
  }
  function render() {
    const anchor=$("climateDatabaseTools")||$("climateNotice");
    if(!anchor||$("climateLoadCasePanel"))return;
    const panel=document.createElement("div");
    panel.id="climateLoadCasePanel"; panel.className="notice";
    panel.innerHTML='<b>دفتر حالت‌های بار و وضعیت اعتبار</b><p id="climateLoadCaseSummary"></p><p>این بخش بارهای واردشده را با واحد، منبع، محل و وضعیت اعتبار ثبت می‌کند. تا زمان تکمیل ضرایب رسمی باد، فشار داخلی ناشی از بازشوها، برف نامتوازن و ترکیبات بار، این رکوردها برای طراحی نهایی تأیید نشده‌اند.</p>' +
      '<hr><b>محاسبه فشار باد ـ مرحله اول</b>' +
      '<p>رابطه فشار خارجی: P = Iw × q × Ce × Ct × Cd × (CgCp ترکیبی، یا Cg × Cp در حالت جداگانه)</p>' +
      '<p>رابطه فشار داخلی: Pi = Iw × q × Ce × Ct × Cgi × Cpi × Cd</p>' +
      '<p>ضرایب را از بندها و جداول مبحث ششم ۱۳۹۸ وارد کنید. برای جلوگیری از محاسبه نادرست، مقدارهای تأییدنشده خالی مانده‌اند.</p>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="windCoeffIw">ضریب اهمیت باد Iw</label><input id="windCoeffIw" type="number" step="0.01" placeholder="از جدول آیین‌نامه"></div>' +
      '<div class="field"><label for="windCoeffCe">ضریب تغییر سرعت Ce</label><input id="windCoeffCe" type="number" step="0.01" placeholder="از بند زبری و ارتفاع"></div>' +
      '<div class="field"><label for="windCoeffCt">ضریب پستی و بلندی Ct</label><input id="windCoeffCt" type="number" step="0.01" placeholder="از بررسی توپوگرافی"></div>' +
      '<div class="field"><label for="windCoeffCg">ضریب اثر تندباد خارجی Cg</label><input id="windCoeffCg" type="number" step="0.01" placeholder="از بند مربوط"></div>' +
      '<div class="field"><label for="windCoeffCp">ضریب فشار خارجی Cp</label><input id="windCoeffCp" type="number" step="0.01" placeholder="علامت‌دار؛ برای سطح موردنظر"></div>' +
      '<div class="field"><label for="windCoeffCd">ضریب هم‌راستایی باد Cd</label><input id="windCoeffCd" type="number" step="0.01" placeholder="از جدول آیین‌نامه"></div>' +
      '<div class="field"><label for="windCoeffCgi">ضریب اثر تندباد داخلی Cgi</label><input id="windCoeffCgi" type="number" step="0.01" placeholder="از بند مربوط"></div>' +
      '<div class="field"><label for="windCoeffCpi">ضریب فشار داخلی Cpi</label><input id="windCoeffCpi" type="number" step="0.01" placeholder="علامت‌دار؛ بر اساس بازشوها"></div>' +
      '</div><p id="windPressureCalculationResult" class="notice" aria-live="polite"></p>' +
      '<hr><b>دفتر فشار بادِ سطوح مختلف ـ ورود ضرایب خارجی به تفکیک سطح</b>' +
      '<p>برای هر سطح، ضریب خارجی را جداگانه و با علامت از متن معتبر وارد کنید؛ در حالت h<20m و h/b<1، مقدار جدول ممکن است CgCp ترکیبی باشد و نباید Cg دوباره ضرب شود. نرم‌افزار دو حالت فشار داخلی مثبت و منفی را جداگانه می‌سازد و فشار خالص هر سطح را گزارش می‌کند. این دفتر هنوز به تحلیل سه‌بعدی متصل نیست.</p>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>سطح</th><th>جهت باد</th><th>Cp یا CgCp خارجی</th><th>فشار خالص با Cpi مثبت</th><th>فشار خالص با Cpi منفی</th></tr></thead><tbody>' +
      '<tr><td>شیب چپ بام</td><td>عمود بر قاب</td><td><input class="wind-zone-cp" data-zone="roof-left" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneRoofLeftPlus">—</td><td id="windZoneRoofLeftMinus">—</td></tr>' +
      '<tr><td>شیب راست بام</td><td>عمود بر قاب</td><td><input class="wind-zone-cp" data-zone="roof-right" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneRoofRightPlus">—</td><td id="windZoneRoofRightMinus">—</td></tr>' +
      '<tr><td>دیوار طولی چپ</td><td>طولی ±Y</td><td><input class="wind-zone-cp" data-zone="long-wall-left" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneLongLeftPlus">—</td><td id="windZoneLongLeftMinus">—</td></tr>' +
      '<tr><td>دیوار طولی راست</td><td>طولی ±Y</td><td><input class="wind-zone-cp" data-zone="long-wall-right" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneLongRightPlus">—</td><td id="windZoneLongRightMinus">—</td></tr>' +
      '<tr><td>دیوار انتهایی جلو</td><td>عرضی ±X</td><td><input class="wind-zone-cp" data-zone="end-wall-front" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneEndFrontPlus">—</td><td id="windZoneEndFrontMinus">—</td></tr>' +
      '<tr><td>دیوار انتهایی عقب</td><td>عرضی ±X</td><td><input class="wind-zone-cp" data-zone="end-wall-back" type="number" step="0.01" placeholder="Cp"></td><td id="windZoneEndBackPlus">—</td><td id="windZoneEndBackMinus">—</td></tr>' +
      '</tbody></table></div>' +
      '<p id="windZoneStatus" class="notice" aria-live="polite">برای محاسبه، ضرایب مشترک و Cp هر سطح باید تکمیل شوند.</p>' +
      '<p><b>تذکر:</b> انتخاب Cp و علامت آن باید متناسب با جهت باد، نسبت ابعادی، شیب بام و ناحیه لبه/گوشه از جداول و شکل‌های مبحث ششم ۱۳۹۸ انجام شود. این جدول فقط سطوح کلی را تفکیک می‌کند و جایگزین تفکیک نواحی موضعی بام و نما نیست.</p>' +
      '<p><b>محدودیت این مرحله:</b> نتایج این دفتر فقط گزارش و ذخیره می‌شوند؛ هنوز به اعضای مدل سه‌بعدی منتقل نمی‌شوند و دیوارهای انتهایی نیز در بارگذاری مدل لحاظ نشده‌اند.</p>';
    anchor.insertAdjacentElement("afterend",panel);
    Object.keys({
      windCoeffIw:1,windCoeffCe:1,windCoeffCt:1,windCoeffCg:1,
      windCoeffCp:1,windCoeffCd:1,windCoeffCgi:1,windCoeffCpi:1
    }).forEach(id=>{
      const el=$(id);
      if(el) el.addEventListener("input",updateSummary);
    });
    panel.querySelectorAll(".wind-zone-cp").forEach(el=>el.addEventListener("input",updateSummary));
    const savedZones=restoredMeta&&restoredMeta.windZones;
    if(savedZones)Object.keys(savedZones).forEach(key=>{
      const el=panel.querySelector('.wind-zone-cp[data-zone="'+key+'"]');
      if(el)el.value=savedZones[key];
    });
    updateSummary();
  }
  function updateSummary() {
    const el=$("climateLoadCaseSummary"); 
    if(el) {
      const d=getData(), ready=d.cases.filter(x=>x.value!==null).length;
      el.textContent="حالت‌های دارای مقدار: "+ready+" از "+d.cases.length+" | موارد دارای تأیید آیین‌نامه‌ای: صفر | جهت باد: "+(d.windDirection==="left-to-right"?"چپ به راست":d.windDirection==="right-to-left"?"راست به چپ":"تعیین‌نشده");
    }
    updateWindPressureResult();
    updateWindZones();
  }
  function setData(data) {
    restoredMeta=data&&typeof data==="object"?{
      status:data.status||"",generatedAt:data.generatedAt||"",
      windCalculation:data.windCalculation||null,
      windZones:data.windCalculation&&data.windCalculation.zones?data.windCalculation.zones:null
    }:null;
    if (document.readyState !== "loading") {
      const coeff=restoredMeta&&restoredMeta.windCalculation&&restoredMeta.windCalculation.coefficients;
      if(coeff) Object.keys(coeff).forEach(key=>{
        const map={importance:"windCoeffIw",exposure:"windCoeffCe",topography:"windCoeffCt",gust:"windCoeffCg",externalPressure:"windCoeffCp",directionality:"windCoeffCd",internalGust:"windCoeffCgi",internalPressure:"windCoeffCpi"};
        if($(map[key])) $(map[key]).value=coeff[key];
      });
      const zones=restoredMeta&&restoredMeta.windZones;
      if(zones)Object.keys(zones).forEach(key=>{
        const el=document.querySelector('.wind-zone-cp[data-zone="'+key+'"]');
        if(el)el.value=zones[key];
      });
    }
    updateSummary();
  }
  window.SteelClimateLoadEngine={getData,setData,getRoofSideCases,calculateWindZones,updateSummary};
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    document.addEventListener("input",e=>{if(e.target&&e.target.closest("#advancedLoadPanel"))updateSummary();});
  });
})();

/* ===== steel2/js/wind-basis-engine.js ===== */
/* SAHROUD STEEL — Wind Basis Engine 1.0
 * Geometry-based opening inventory and scenario audit.
 * Computes geometric areas and basic velocity pressure only.
 * Does NOT classify enclosure, select Cpi/Cp, generate design wind loads,
 * or transfer pressures to the structural model.
 */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const SIDES=["front","rear","left","right"];
  const LABELS={front:"دیوار انتهایی جلو",rear:"دیوار انتهایی عقب",left:"دیوار طولی چپ",right:"دیوار طولی راست"};
  let restored={};

  function num(id){
    const el=$(id); if(!el||el.value==="")return null;
    const n=Number(el.value); return Number.isFinite(n)?n:null;
  }
  function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
  function getScenario(){
    const o=window.SteelOpenings?.getData?.()||{};
    return ["closed","front-open","custom"].includes(o.windScenario)?o.windScenario:"closed";
  }
  function geometry(){
    const span=num("span"),length=num("length"),eave=num("height"),rise=num("rise");
    const valid=[span,length,eave,rise].every(v=>v!==null&&v>0);
    const gross={front:null,rear:null,left:null,right:null};
    if(valid){
      gross.front=gross.rear=span*eave+0.5*span*rise;
      gross.left=gross.right=length*eave;
    }
    const openings=window.SteelOpenings?.getData?.()||{};
    const physical={};
    SIDES.forEach(side=>{
      const x=openings[side]||{};
      physical[side]=x.enabled&&n(x.width)>0&&n(x.height)>0?n(x.width)*n(x.height):0;
    });
    return {valid,span,length,eave,rise,gross,physical};
  }
  function readAreas(){
    const result={};
    SIDES.forEach(side=>result[side]=num("windOpenArea_"+side));
    return result;
  }
  function effectiveAreas(){
    const g=geometry(),scenario=getScenario(),manual=readAreas(),effective={};
    SIDES.forEach(side=>{
      if(scenario==="closed")effective[side]=0;
      else if(scenario==="front-open")effective[side]=side==="front"?g.physical.front:0;
      else effective[side]=manual[side];
    });
    return {scenario,manual,effective};
  }
  function audit(){
    const g=geometry(),a=effectiveAreas(),errors=[],rows={};
    if(!g.valid)errors.push("ابعاد دهانه، طول، ارتفاع ستون و خیز بام باید معتبر باشند.");
    if(a.scenario==="front-open"&&g.physical.front<=0)errors.push("سناریوی درِ جلو باز انتخاب شده، اما بازشوی جلویی فعال و دارای ابعاد معتبر نیست.");
    SIDES.forEach(side=>{
      const open=a.effective[side],gross=g.gross[side],physical=g.physical[side];
      if(a.scenario==="custom"&&open===null)errors.push("مساحت بازشوی باز در "+LABELS[side]+" مشخص نشده است.");
      if(open!==null&&open<0)errors.push("مساحت بازشوی "+LABELS[side]+" منفی است.");
      if(open!==null&&open>physical+1e-8)errors.push("مساحت بازشوی باز در "+LABELS[side]+" از مجموع مساحت بازشوهای تعریف‌شده بیشتر است.");
      if(open!==null&&gross!==null&&open>gross+1e-8)errors.push("مساحت بازشوی "+LABELS[side]+" از مساحت ناخالص دیوار بیشتر است.");
      rows[side]={grossWallArea:gross,physicalOpeningArea:physical,openArea:open,
        openToGrossRatio:open!==null&&gross>0?open/gross:null};
    });
    const loads=window.SteelLoads?.getData?.()||{},climate=loads.climate||{};
    const wind=n(climate.basicWind);
    const q=wind!==null&&wind>=0?0.000613*Math.pow(wind/3.6,2):null;
    const brief=window.SteelDesignCore?.getData?.()||{};
    const classification=brief.enclosure||climate.openingState||"undetermined";
    if(a.scenario==="closed"&&classification!=="enclosed")
      errors.push("سناریوی درهای بسته با طبقه‌بندی پوسته انتخاب‌شده یکسان نیست؛ این دو را آگاهانه بازبینی کنید.");
    if(a.scenario!=="closed"&&classification==="enclosed")
      errors.push("سناریوی بازشو باز است ولی پوسته «بسته» انتخاب شده؛ طبقه‌بندی باید توسط مهندس بازبینی شود.");
    return {schema:"sahroud-steel-wind-basis",version:1,scenario:a.scenario,
      geometry:{span:g.span,length:g.length,eaveHeight:g.eave,ridgeRise:g.rise},
      faces:rows,windSpeed:wind,windSpeedUnit:"km/h",basicVelocityPressure:q,
      pressureUnit:"kN/m2",enclosureClassification:classification,
      classificationStatus:"not-automatically-classified",
      codeDesignEligible:false,errors,geometryReady:g.valid,
      status:errors.length?"input-review-required":"geometry-inventory-ready-only",
      limitations:["مساحت دیوارها با تقریب مستطیل به‌علاوه مثلث زیر تاج محاسبه شده است؛ بازشوها و شکل واقعی نما باید کنترل شوند.",
       "نسبت بازشو فقط گزارش هندسی است و معیار طبقه‌بندی آیین‌نامه‌ای نیست.",
       "Cpi، Cp، ضرایب ارتفاع/زبری/توپوگرافی و ترکیبات باد هنوز محاسبه نشده‌اند.",
       "هیچ فشاری به مدل سه‌بعدی اعمال نمی‌شود."]};
  }
  function render(){
    if($("windBasisPanel"))return;
    const panel=document.createElement("section");
    panel.id="windBasisPanel";panel.className="panel";
    panel.innerHTML=[
      '<div class="panel-title"><h3>۶ ـ دفتر هندسی باد و بازشوها</h3><span class="status">مرحله مقدماتی</span></div>',
      '<div class="notice">این مرحله مساحت پوسته و بازشوهای باز در سناریوی باد را محاسبه و کنترل می‌کند. نسبت‌ها صرفاً هندسی‌اند؛ نرم‌افزار هنوز طبقه‌بندی آیین‌نامه‌ای پوسته یا ضریب فشار داخلی را حدس نمی‌زند.</div>',
      '<div class="form-grid">',
      '<div class="field"><label>سناریوی فعال بازشوها</label><output id="windBasisScenario">—</output></div>',
      '<div class="field"><label>فشار مبنای سرعت باد q (kN/m²)</label><output id="windBasisQ">—</output></div></div>',
      '<p class="hint">در سناریوی سفارشی، مساحت مؤثر بازشوهایی را وارد کنید که واقعاً در وضعیت باد طراحی باز خواهند بود. این مقدار نباید از مساحت فیزیکی بازشوهای تعریف‌شده بیشتر باشد.</p>',
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>نما</th><th>مساحت بازشوی باز در باد (m²)</th><th>مساحت ناخالص نما (m²)</th><th>نسبت بازشو به نما</th></tr></thead><tbody>',
      ...SIDES.map(side=>'<tr><td>'+LABELS[side]+'</td><td><input id="windOpenArea_'+side+'" type="number" min="0" step="0.1" placeholder="فقط سناریوی سفارشی"></td><td id="windGross_'+side+'">—</td><td id="windRatio_'+side+'">—</td></tr>'),
      '</tbody></table></div>',
      '<div class="notice" id="windBasisStatus" aria-live="polite">در حال بررسی هندسه...</div>',
      '<div class="notice"><b>مرز اعتبار:</b> حتی با تکمیل این جدول، فشار طراحی باد تولید نمی‌شود. برای آن باید ضوابط طبقه‌بندی پوسته، بازشوی غالب، ضرایب خارجی و داخلی، نواحی موضعی، جهت‌های باد و ترکیبات بار جداگانه پیاده‌سازی و آزمون شوند.</div>'
    ].join("");
    const anchor=$("openingPanel")||$("engineeringBriefPanel")||$("climateLoadCasePanel");
    if(anchor)anchor.insertAdjacentElement("afterend",panel);
    else document.querySelector("main")?.appendChild(panel);
    SIDES.forEach(side=>{
      $("windOpenArea_"+side)?.addEventListener("input",update);
    });
    update();
  }
  function update(){
    const beforeScenario=getScenario();
    if(beforeScenario==="custom")restored=readAreas();
    const result=audit(),g=geometry(),a=effectiveAreas();
    const scenarioNames={closed:"تمام بازشوهای قابل‌بستن بسته", "front-open":"درِ اصلی جلو باز",custom:"سناریوی سفارشی"};
    if($("windBasisScenario"))$("windBasisScenario").textContent=scenarioNames[a.scenario];
    if($("windBasisQ"))$("windBasisQ").textContent=result.basicVelocityPressure===null?"—":result.basicVelocityPressure.toFixed(3);
    SIDES.forEach(side=>{
      const open=result.faces[side].openArea,gross=result.faces[side].grossWallArea,ratio=result.faces[side].openToGrossRatio;
      if($("windGross_"+side))$("windGross_"+side).textContent=gross===null?"—":gross.toFixed(2);
      if($("windRatio_"+side))$("windRatio_"+side).textContent=ratio===null?"—":(100*ratio).toFixed(2)+"%";
      const el=$("windOpenArea_"+side);
      if(el){
        el.disabled=a.scenario!=="custom";
        if(a.scenario==="closed")el.value="0";
        else if(a.scenario==="front-open")el.value=side==="front"?String(g.physical.front):"0";
        else if(restored[side]!==undefined&&el.value==="")el.value=restored[side];
      }
    });
    const status=$("windBasisStatus");
    if(status){
      status.textContent=(result.errors.length?"نیازمند اصلاح: "+result.errors.join(" "):
       "کنترل هندسی اولیه انجام شد. نسبت‌ها فقط گزارش هندسی‌اند و طبقه‌بندی پوسته یا فشار طراحی باد محسوب نمی‌شوند.")
       +" وضعیت: "+result.status+" | واجد محاسبه طراحی آیین‌نامه‌ای: خیر";
    }
  }
  function getData(){
    if(getScenario()==="custom")restored=readAreas();
    const r=audit();r.customOpenAreas=Object.assign({},restored);return r;
  }
  function setData(saved){
    if(!saved||typeof saved!=="object")return;
    restored=saved.customOpenAreas&&typeof saved.customOpenAreas==="object"?saved.customOpenAreas:{};
    if(document.readyState!=="loading"&&$("windBasisPanel")){
      SIDES.forEach(side=>{const el=$("windOpenArea_"+side);if(el&&restored[side]!==undefined)el.value=restored[side];});
      update();
    }
  }
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    document.addEventListener("input",e=>{
      if(e.target&&["span","length","height","rise","openingFrontWidth","openingFrontHeight","openingFrontEnabled","openingRearWidth","openingRearHeight","openingRearEnabled","openingLeftWidth","openingLeftHeight","openingLeftEnabled","openingRightWidth","openingRightHeight","openingRightEnabled"].includes(e.target.id))update();
    });
    document.addEventListener("change",e=>{
      if(e.target&&e.target.id==="windOpeningScenario")update();
      if(e.target&&e.target.closest("#openingPanel"))update();
    });
  });
  window.SteelWindBasis={getData,setData,audit,update};
})();

/* ===== steel2/js/directional-wind-engine.js ===== */
/* SAHROUD STEEL — Directional Wind Case Register 1.0
 * Manual Cp register by wind direction and building surface.
 * Coefficients are read from ClimateLoadEngine; no code values are invented.
 * Outputs remain preliminary and are NOT transferred to the 3D model.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const directions=[
  {id:"x-positive",label:"باد در راستای +X"},
  {id:"x-negative",label:"باد در راستای −X"},
  {id:"z-positive",label:"باد در راستای +Z"},
  {id:"z-negative",label:"باد در راستای −Z"}
 ];
 const surfaces=[
  {id:"roof-left",label:"شیب چپ بام"},
  {id:"roof-right",label:"شیب راست بام"},
  {id:"long-wall-left",label:"دیوار طولی چپ"},
  {id:"long-wall-right",label:"دیوار طولی راست"},
  {id:"end-wall-front",label:"دیوار انتهایی جلو"},
  {id:"end-wall-back",label:"دیوار انتهایی عقب"}
 ];
 let cpValues={};
 function finite(v){if(v===null||v===undefined||v==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;}
 function getBase(){
  const d=window.SteelClimateLoadEngine?.getData?.();
  if(!d)return {ready:false,reason:"دفتر ضرایب اقلیمی و باد در دسترس نیست."};
  const coeff=d.windCalculation?.coefficients||{};
  const loads=window.SteelLoads?.getData?.()||{};
  const speed=finite(loads.climate?.basicWind);
  const q=speed===null?null:0.000613*Math.pow(speed/3.6,2);
  const keys=["importance","exposure","topography","directionality","internalGust","internalPressure"];
  const v={};keys.forEach(k=>v[k]=finite(coeff[k]));
  const missing=keys.filter(k=>v[k]===null);
  if(q===null)return {ready:false,reason:"سرعت مبنای باد وارد نشده است.",q,coeff:v};
  if(missing.length)return {ready:false,reason:"ضرایب مشترک ناقص‌اند: "+missing.join("، "),q,coeff:v};
  const positive=["importance","exposure","topography","directionality","internalGust"];
  const invalid=positive.filter(k=>!(v[k]>0));
  if(invalid.length)return {ready:false,reason:"این ضرایب باید مثبت و بزرگ‌تر از صفر باشند: "+invalid.join("، "),q,coeff:v};
  const common=v.importance*q*v.exposure*v.topography*v.directionality;
  return {ready:true,q,coeff:v,common,internalFactor:common*v.internalGust};
 }
 function calculate(){
  const base=getBase(),records={},errors=[];
  const span=finite($("span")?.value),length=finite($("length")?.value);
  const eave=finite($("height")?.value),rise=finite($("rise")?.value);
  const totalHeight=eave!==null&&rise!==null?eave+rise:null;
  const geometryReady=[span,length,totalHeight].every(v=>v!==null&&v>0);
  const directionBreadth={"x-positive":span,"x-negative":span,"z-positive":length,"z-negative":length};
  const combinedBasis={};
  directions.forEach(dir=>{const b=directionBreadth[dir.id],ratio=geometryReady?totalHeight/b:null;combinedBasis[dir.id]={height:totalHeight,breadth:b,heightToBreadth:ratio,useCombinedCgCp:geometryReady&&totalHeight<20&&ratio<1};});
  directions.forEach(dir=>{
   records[dir.id]={label:dir.label,surfaces:{}};
   surfaces.forEach(face=>{
    const cp=finite(cpValues[dir.id]?.[face.id]);
    const basis=combinedBasis[dir.id];
    const externalFactor=basis.useCombinedCgCp?base.common:(base.coeff.gust!==null?base.common*base.coeff.gust:null);
    const ext=base.ready&&geometryReady&&externalFactor!==null&&cp!==null?externalFactor*cp:null;
    const im=base.ready?base.internalFactor*Math.abs(base.coeff.internalPressure):null;
    records[dir.id].surfaces[face.id]={
     cp,externalPressure:ext,
     externalCoefficientBasis:basis.useCombinedCgCp?"combined-CgCp":"separate-Cp",
     netWithPositiveInternal:ext===null||im===null?null:ext-im,
     netWithNegativeInternal:ext===null||im===null?null:ext+im,
     unit:"kN/m2",
     status:ext===null?"missing-input":"manual-coefficients-preliminary"
    };
    if(cp===null)errors.push(dir.label+" / "+face.label);
   });
  });
  const entered=Object.values(cpValues).reduce((n,x)=>n+Object.values(x||{}).filter(v=>finite(v)!==null).length,0);
  const requiresSeparateCg=Object.values(combinedBasis).some(x=>!x.useCombinedCgCp);
  const cgReady=!requiresSeparateCg||(base.coeff?.gust!==null&&base.coeff?.gust>0);
  return {schema:"sahroud-steel-directional-wind",version:1,
   formulaExternal:"P = Iw q Ce Ct Cd × CgCp (combined basis) OR × Cg × Cp (separate basis)",
   formulaInternal:"Pi = Iw q Ce Ct Cgi Cpi Cd",
   netConvention:"Pnet = Pexternal - Pinternal",
   directions:records,enteredCpCount:entered,requiredCpCount:24,
   geometry:{span,length,eaveHeight:eave,ridgeRise:rise,totalHeight},externalCoefficientBasis:combinedBasis,
   basicVelocityPressure:base.q??null,pressureUnit:"kN/m2",
   commonCoefficients:base.coeff||{},ready:base.ready&&geometryReady&&cgReady&&entered===24,
   codeDesignEligible:false,
   status:!base.ready?"common-coefficients-incomplete":!geometryReady?"geometry-incomplete":!cgReady?"separate-Cp-mode-requires-positive-Cg":entered===24?"all-directional-coefficients-entered-preliminary":"directional-Cp-incomplete",
   message:!base.ready?base.reason:!geometryReady?"ابعاد هندسی برای تعیین مبنای ضریب خارجی ناقص است.":!cgReady?"در حالت Cp جداگانه، Cg باید مثبت و معتبر وارد شود.":"برای h<20m و h/b<1، ورودی این جهت به‌صورت CgCp ترکیبی تفسیر می‌شود؛ در سایر حالات Cp جداگانه است. همه ضرایب دستی و نیازمند تطبیق آیین‌نامه‌ای‌اند.",
   missingCp:errors};
 }
 function render(){
  if($("directionalWindPanel"))return;
  const panel=document.createElement("section");
  panel.id="directionalWindPanel";panel.className="panel";
  let html='<div class="panel-title"><h3>۷ ـ دفتر باد جهت‌دار</h3><span class="status">چهار جهت مستقل</span></div>';
  html+='<div class="notice">برای هر جهت باد، Cp خارجی هر سطح را جداگانه و با علامت از مرجع معتبر وارد کنید. ضریب فشار داخلی Cpi از دفتر ضرایب قبلی خوانده می‌شود و دو حالت علامت مثبت و منفی جداگانه بررسی می‌شوند.</div>';
  html+='<div class="notice"><b>قرارداد محور مدل:</b> X عرض دهانه، Y قائم و Z امتداد طول سوله است؛ بنابراین جهت‌های افقی این دفتر +X، −X، +Z و −Z هستند.</div>';
  directions.forEach(dir=>{
   html+='<fieldset><legend>'+dir.label+'</legend><div class="table-wrap"><table class="data-table"><thead><tr><th>سطح</th><th>Cp یا CgCp خارجی (علامت‌دار)</th><th>خالص با Cpi مثبت (kN/m²)</th><th>خالص با Cpi منفی (kN/m²)</th></tr></thead><tbody>';
   surfaces.forEach(face=>{
    const id="dirCp_"+dir.id+"_"+face.id;
    html+='<tr><td>'+face.label+'</td><td><input id="'+id+'" type="number" step="0.01" placeholder="Cp / CgCp"></td><td id="'+id+'_plus">—</td><td id="'+id+'_minus">—</td></tr>';
   });
   html+='</tbody></table></div></fieldset>';
  });
  html+='<div class="notice" id="directionalWindStatus" aria-live="polite">در انتظار ورودی ضرایب مشترک و Cp جهت‌دار.</div>';
  html+='<div class="notice"><b>محدودیت:</b> این دفتر هنوز نواحی موضعی لبه و گوشه، ضرایب داخلی وابسته به طبقه‌بندی واقعی پوسته، همزمانی جهت‌ها، سطوح مؤثر، تبدیل فشار به بار خطی/گرهی یا انتقال به تحلیل سه‌بعدی را انجام نمی‌دهد. هیچ خروجی این بخش بار طراحی تأییدشده نیست.</div>';
  panel.innerHTML=html;
  const anchor=$("windBasisPanel")||$("climateLoadCasePanel")||document.querySelector("main");
  if(anchor)anchor.insertAdjacentElement("afterend",panel);
  directions.forEach(dir=>surfaces.forEach(face=>{
   const id="dirCp_"+dir.id+"_"+face.id;
   $(id)?.addEventListener("input",()=>{
    cpValues[dir.id]=cpValues[dir.id]||{};
    cpValues[dir.id][face.id]=$(id).value;
    update();
   });
  }));
  update();
 }
 function update(){
  const r=calculate();
  const basisText=directions.map(dir=>{const b=r.externalCoefficientBasis?.[dir.id];return dir.label+": "+(b?.useCombinedCgCp?"CgCp ترکیبی":"Cp جداگانه")+" (h/b="+(b?.heightToBreadth===null?"—":Number(b?.heightToBreadth).toFixed(3))+")";}).join("؛ ");
  if($("directionalWindStatus"))$("directionalWindStatus").textContent=basisText+" | Cpهای ثبت‌شده: "+r.enteredCpCount+" از ۲۴. "+r.message+" وضعیت: "+r.status+" | مجاز برای طراحی آیین‌نامه‌ای: خیر.";
  directions.forEach(dir=>surfaces.forEach(face=>{
   const cell=r.directions[dir.id].surfaces[face.id];
   const base="dirCp_"+dir.id+"_"+face.id;
   if($(base)&&$(base).value!==String(cpValues[dir.id]?.[face.id]??""))$(base).value=cpValues[dir.id]?.[face.id]??"";
   $(base+"_plus").textContent=cell.netWithPositiveInternal===null?"—":cell.netWithPositiveInternal.toFixed(3);
   $(base+"_minus").textContent=cell.netWithNegativeInternal===null?"—":cell.netWithNegativeInternal.toFixed(3);
  }));

 }
 function getData(){
  directions.forEach(dir=>surfaces.forEach(face=>{
   const id="dirCp_"+dir.id+"_"+face.id,el=$(id);
   if(el){cpValues[dir.id]=cpValues[dir.id]||{};cpValues[dir.id][face.id]=el.value;}
  }));
  return calculate();
 }
 function setData(data){
  if(!data||typeof data!=="object")return;
  cpValues={};
  const ds=data.directions||{};
  directions.forEach(dir=>{
   const saved=ds[dir.id]?.surfaces||{};
   cpValues[dir.id]={};
   surfaces.forEach(face=>{
    const v=saved[face.id]?.cp;
    cpValues[dir.id][face.id]=v===null||v===undefined?"":String(v);
   });
  });
  if(document.readyState!=="loading"&&$("directionalWindPanel")){
   directions.forEach(dir=>surfaces.forEach(face=>{
    const id="dirCp_"+dir.id+"_"+face.id;
    if($(id))$(id).value=cpValues[dir.id][face.id];
   }));
   update();
  }
 }
 document.addEventListener("DOMContentLoaded",()=>{
  render();
  document.addEventListener("input",e=>{
   if(e.target&&(
     e.target.closest("#climateLoadCasePanel")||
     ["span","length","height","rise"].includes(e.target.id)
   ))update();
  });
 });
 window.SteelDirectionalWind={getData,setData,calculate,update};
})();

/* ===== steel2/js/wind-zone-engine.js ===== */
/* SAHROUD STEEL — Wind zone geometry engine
 * Geometry only. No code coefficients, pressure values, or load transfer are generated here.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const finite = v => Number.isFinite(Number(v)) ? Number(v) : null;

  function partitionRectangle(width, length, depth, prefix) {
    if (![width, length, depth].every(v => Number.isFinite(v) && v > 0))
      throw new Error("ابعاد سطح و عمق ناحیه باید مثبت و معتبر باشند.");
    if (2 * depth >= Math.min(width, length))
      throw new Error("عمق ناحیه لبه باید کمتر از نصف بعد کوچک‌تر سطح باشد؛ مقدار را بررسی کنید.");
    const xs = [0, depth, width - depth, width];
    const ys = [0, depth, length - depth, length];
    const cells = [];
    for (let ix = 0; ix < 3; ix++) for (let iy = 0; iy < 3; iy++) {
      const w = xs[ix + 1] - xs[ix], l = ys[iy + 1] - ys[iy];
      const xEdge = ix !== 1, yEdge = iy !== 1;
      const zone = "unclassified";
      cells.push({
        id: prefix + "-cell-" + (ix + 1) + "-" + (iy + 1),
        zone, gridPosition: { x: ix + 1, y: iy + 1 }, boundaryFlags: { xEdge, yEdge }, x0: xs[ix], x1: xs[ix + 1], y0: ys[iy], y1: ys[iy + 1],
        widthM: w, lengthM: l, areaM2: w * l,
        coefficient: null, coefficientSource: null,
        status: "generic-geometric-cell-not-code-zone"
      });
    }
    const area = cells.reduce((s, c) => s + c.areaM2, 0);
    if (Math.abs(area - width * length) > 1e-8 * Math.max(1, width * length))
      throw new Error("کنترل مساحت نواحی سطح " + prefix + " ناموفق است.");
    return { prefix, widthM: width, lengthM: length, edgeDepthM: depth, totalAreaM2: area, cells };
  }

  function build(input) {
    const g = input || {};
    const span = finite(g.span), length = finite(g.length), height = finite(g.height);
    const rise = finite(g.rise), overhang = finite(g.roofOverhang);
    const roofDepth = finite(g.roofEdgeDepth), wallDepth = finite(g.wallEdgeDepth);
    const endDepth = finite(g.endWallEdgeDepth);
    if (![span, length, height, rise, overhang].every(v => v !== null && v > 0) || rise < 0 || overhang < 0)
      throw new Error("هندسه پروژه معتبر نیست.");
    if ([roofDepth, wallDepth, endDepth].some(v => v === null || v <= 0))
      throw new Error("عمق ناحیه لبه برای سقف، دیوار طولی و دیوار انتهایی باید جداگانه و با استناد آیین‌نامه وارد شود.");

    const half = span / 2;
    const slopeLength = Math.hypot(half, rise);
    const roofPanelLength = slopeLength + overhang / (half / slopeLength);
    const roofPlanLength = length + 2 * overhang;
    const roofLeft = partitionRectangle(roofPanelLength, roofPlanLength, roofDepth, "roof-left");
    const roofRight = partitionRectangle(roofPanelLength, roofPlanLength, roofDepth, "roof-right");
    const longWallLeft = partitionRectangle(height, length, wallDepth, "long-wall-left");
    const longWallRight = partitionRectangle(height, length, wallDepth, "long-wall-right");
    const endWallGrossArea = span * height + span * rise / 2;
    const endWallRect = partitionRectangle(span, height, endDepth, "end-wall-rectangular-reference");
    return {
      schema: "sahroud-steel-wind-zone-geometry", version: 1,
      generatedAt: new Date().toISOString(),
      coordinateConvention: { X: "transverse span", Y: "vertical", Z: "building length", positiveZ: "rear", negativeZ: "front" },
      geometry: { spanM: span, lengthM: length, eavesHeightM: height, riseM: rise, roofOverhangHorizontalM: overhang, roofOverhangAlongSlopeM: overhang / (half / slopeLength), roofSlopeLengthWithoutOverhangM: slopeLength, roofPanelLengthWithEaveOverhangM: roofPanelLength, roofPlanLengthWithEndOverhangM: roofPlanLength },
      surfaces: [
        roofLeft, roofRight, longWallLeft, longWallRight,
        { prefix: "end-wall-front", grossAreaM2: endWallGrossArea, shape: "gable-polygon", partitionStatus: "not-partitioned-triangle-needs-code-verified-method", coefficient: null },
        { prefix: "end-wall-rear", grossAreaM2: endWallGrossArea, shape: "gable-polygon", partitionStatus: "not-partitioned-triangle-needs-code-verified-method", coefficient: null }
      ],
      endWallRectangularReference: { grossAreaM2: span * height, zoning: endWallRect, note: "فقط مستطیل زیر خط لبه بام؛ مثلث بالای دیوار جداست و در این نسخه به‌عنوان ناحیه فشار تقسیم نشده است." },
      checks: {
        roofPairAreaM2: 2 * roofPanelLength * roofPlanLength,
        longWallPairAreaM2: 2 * height * length,
        endWallPairGrossAreaM2: 2 * endWallGrossArea,
        coefficientRegistryComplete: false,
        loadTransferEnabled: false,
        codeDesignEligible: false
      },
      warnings: [
        "این شبکه ۳×۳ صرفاً شبکه‌بندی هندسی عمومی است و به هیچ‌وجه نواحی آیین‌نامه‌ای مبحث ششم محسوب نمی‌شود.",
        "عمق شبکه‌های نمایشی صرفاً برای کنترل هندسه است؛ تا زمان ثبت ضابطه معتبر، هیچ انتساب آیین‌نامه‌ای ندارد.",
        "ضرایب فشار خارجی و داخلی هنوز ثبت نشده‌اند؛ هیچ فشار یا بار خطی تولید نمی‌شود.",
        "دیوارهای انتهایی گابل و مثلثی هنوز طبق شکل رسمی تقسیم نشده‌اند."
      ]
    };
  }

  function render() {
    if ($("windZoneGeometryPanel")) return;
    const anchor = $("shedLayoutPanel") || $("directionalWindPanel") || $("climateLoadCasePanel");
    if (!anchor || !anchor.parentNode) return;
    const panel = document.createElement("section");
    panel.className = "panel"; panel.id = "windZoneGeometryPanel";
    panel.innerHTML =
      '<div class="panel-title"><h3>شبکه‌بندی هندسی عمومی سطوح باد</h3><span class="status">هندسه مقدماتی</span></div>' +
      '<div class="notice">این شبکه فقط برای کنترل هندسه است؛ نواحی 1/1E/2/2E و ضرایب مبحث ششم را نمایش نمی‌دهد. تا تأیید شکل و بند رسمی، خروجی بار طراحی نیست.</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="windZoneRoofDepth">عمق شبکه نمایشی سقف (m)</label><input id="windZoneRoofDepth" type="number" min="0.01" step="0.01" placeholder="طبق مبحث ششم"></div>' +
      '<div class="field"><label for="windZoneWallDepth">عمق شبکه نمایشی دیوار طولی (m)</label><input id="windZoneWallDepth" type="number" min="0.01" step="0.01" placeholder="طبق مبحث ششم"></div>' +
      '<div class="field"><label for="windZoneEndDepth">عمق شبکه مرجع مستطیل انتهایی (m)</label><input id="windZoneEndDepth" type="number" min="0.01" step="0.01" placeholder="طبق مبحث ششم"></div></div>' +
      '<button type="button" class="btn primary" id="btnBuildWindZones">محاسبه هندسه نواحی</button>' +
      '<div id="windZoneGeometryResult" class="notice" aria-live="polite">برای محاسبه، عمق‌های شبکه هندسی عمومی را وارد کنید.</div>';
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    $("btnBuildWindZones").addEventListener("click", () => {
      const box = $("windZoneGeometryResult");
      try {
        const model = window.SteelStructuralModel?.build?.();
        if (!model || !model.geometry) throw new Error("ابتدا مدل هندسی سوله را تولید کنید.");
        const g = model.geometry;
        const result = build({
          span: g.span, length: g.length, height: g.height, rise: g.rise, roofOverhang: g.roofOverhang,
          roofEdgeDepth: $("windZoneRoofDepth").value,
          wallEdgeDepth: $("windZoneWallDepth").value,
          endWallEdgeDepth: $("windZoneEndDepth").value
        });
        window.SteelWindZoneEngine.lastResult = result;
        const lines = result.surfaces.map(s => s.prefix + ": " +
          (s.cells ? s.cells.length + " قطعه، مساحت " + s.totalAreaM2.toFixed(3) + " m²" :
            "مساحت ناخالص " + s.grossAreaM2.toFixed(3) + " m²؛ تقسیم‌بندی غیرفعال"));
        box.textContent = "شبکه هندسی عمومی محاسبه شد؛ این قطعات نواحی آیین‌نامه‌ای نیستند و هیچ ضریب/باری ندارند.\n" +
          lines.join("\n") + "\nکنترل مساحت سقف: " + result.checks.roofPairAreaM2.toFixed(3) +
          " m² | دیوارهای طولی: " + result.checks.longWallPairAreaM2.toFixed(3) +
          " m² | دیوارهای انتهایی: " + result.checks.endWallPairGrossAreaM2.toFixed(3) +
          " m²\n" + result.warnings.join("\n");
        box.style.color = "#92400e";
      } catch (e) { box.textContent = "محاسبه انجام نشد: " + e.message; box.style.color = "#b45309"; }
    });
  }

  window.SteelWindZoneEngine = {
    build, partitionRectangle,
    getLastResult: () => window.SteelWindZoneEngine.lastResult || null,
    lastResult: null,
    codeDesignEligible: false,
    loadTransferEnabled: false
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();

/* ===== steel2/js/wind-code-registry.js ===== */
/* SAHROUD STEEL — traceable wind coefficient registry
 * Intentionally ships with no coefficient values. Entries require a verified code citation.
 */
(function () {
  "use strict";
  const EDITION = "Iran National Building Regulations, Part 6, 4th edition (1398)";
  const entries = new Map();
  const requiredText = ["id","surface","windDirection","zone","coefficientBasis","valueSource","clause","page"];
  const allowedBasis = new Set(["Cp","CgCp","Cpi","CgCpi","net-external-internal"]);

  function validateEntry(e) {
    const errors = [];
    if (!e || typeof e !== "object") return ["ورودی ضریب معتبر نیست."];
    requiredText.forEach(k => { if (e[k] == null || String(e[k]).trim() === "") errors.push("فیلد اجباری خالی است: " + k); });
    if (!allowedBasis.has(e.coefficientBasis)) errors.push("مبنای ضریب ناشناخته است.");
    if (e.value === null || e.value === undefined || e.value === "" || !Number.isFinite(Number(e.value))) errors.push("مقدار ضریب باید عددی و محدود باشد.");
    if (!Number.isInteger(Number(e.page)) || Number(e.page) < 1) errors.push("شماره صفحه باید عدد صحیح مثبت باشد.");
    if (!e.table && !e.figure) errors.push("حداقل یکی از شماره جدول یا شکل باید ثبت شود.");
    if (e.edition !== EDITION) errors.push("ویرایش مرجع باید دقیقاً ویرایش چهارم ۱۳۹۸ باشد.");
    if (e.verified !== true) errors.push("ضریب تا زمان تطبیق با نسخه رسمی تأیید نشده است.");
    if (e.scope && typeof e.scope === "object") {
      ["minRoofPitchDeg","maxRoofPitchDeg","maxHeightM","maxHB"].forEach(k => {
        if (e.scope[k] != null && (!Number.isFinite(Number(e.scope[k])) || Number(e.scope[k]) < 0))
          errors.push("دامنه کاربرد نامعتبر است: " + k);
      });
    }
    return errors;
  }

  function add(entry) {
    const errors = validateEntry(entry);
    if (errors.length) return { ok: false, errors };
    if (entries.has(entry.id)) return { ok: false, errors: ["شناسه ضریب تکراری است: " + entry.id] };
    const copy = JSON.parse(JSON.stringify(entry));
    copy.sourceEdition = EDITION;
    entries.set(copy.id, copy);
    return { ok: true, entry: JSON.parse(JSON.stringify(copy)) };
  }
  function get(id) { const e=entries.get(id); return e ? JSON.parse(JSON.stringify(e)) : null; }
  function list(filter) {
    const f=filter||{};
    return Array.from(entries.values()).filter(e=>
      (!f.surface || e.surface===f.surface) &&
      (!f.windDirection || e.windDirection===f.windDirection) &&
      (!f.zone || e.zone===f.zone)
    ).map(e=>JSON.parse(JSON.stringify(e)));
  }
  function audit() {
    return {
      sourceEdition: EDITION, entryCount: entries.size,
      verifiedEntryCount: Array.from(entries.values()).filter(e=>e.verified===true).length,
      missingValues: entries.size===0,
      codeDesignEligible: false,
      note: "تا زمانی که تمام نواحی، دامنه کاربرد، فشار داخلی/خارجی و منابع رسمی تأیید نشده‌اند، این دفتر برای طراحی آیین‌نامه‌ای مجاز نیست."
    };
  }
  window.SteelWindCodeRegistry = { add, get, list, audit, validateEntry, edition: EDITION };
})();

/* ===== steel2/js/force-diagrams.js ===== */
/* SAHROUD STEEL - Internal Force Diagrams 3.0
Uniform local member loads included
Units: kN, m, kN.m
*/
(function () {
"use strict";

const $ = id => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const MEMBER_NAMES = ["ستون چپ", "رفتر چپ", "رفتر راست", "ستون راست"];

function fmt(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("fa-IR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) : "—";
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
    })[ch]);
}

// نیروهای داخلی در فاصله x از ابتدای عضو
// بارهای محلی و نیروها بر حسب kN و kN/m هستند.
function forceAt(member, type, x) {
    const qx = Number(member.localLoadX) || 0;
    const qy = Number(member.localLoadY) || 0;

    if (type === "N") {
        return -(Number(member.axialStart) || 0) - qx * x;
    }

    if (type === "V") {
        return -(Number(member.shearStart) || 0) - qy * x;
    }

    return -(Number(member.momentStart) || 0) +
        (Number(member.shearStart) || 0) * x +
        0.5 * qy * x * x;
}

function buildValues(member, type) {
    const L = Number(member.length);

    if (!Number.isFinite(L) || L <= 0) return [];

    const stations = [];
    for (let i = 0; i <= 40; i++) {
        stations.push(L * i / 40);
    }

    // محل احتمالی بیشینه/کمینه لنگر، جایی است که V صفر می‌شود.
    if (type === "M") {
        const qy = Number(member.localLoadY) || 0;
        const shearStart = Number(member.shearStart) || 0;

        if (Math.abs(qy) > 1e-12) {
            const xZeroShear = -shearStart / qy;
            if (xZeroShear > 0 && xZeroShear < L) {
                stations.push(xZeroShear);
            }
        }
    }

    stations.sort((a, b) => a - b);

    return stations.map(x => ({
        x,
        ratio: x / L,
        value: forceAt(member, type, x)
    }));
}

function findPeak(values) {
    if (!values.length) return { value: 0, x: 0 };

    return values.reduce((best, item) =>
        Math.abs(item.value) > Math.abs(best.value) ? item : best
    , values[0]);
}

function makeSvg(title, unit, values, peak) {
    const W = 640;
    const H = 220;
    const left = 52;
    const right = 20;
    const top = 42;
    const bottom = 34;
    const middle = 112;

    if (!values.length) {
        return '<div class="notice">داده کافی برای رسم نمودار وجود ندارد.</div>';
    }

    const maximum = Math.max(
        0.001,
        ...values.map(p => Math.abs(p.value))
    );

    const scale = 62 / maximum;

    const points = values.map(p => ({
        x: left + (W - left - right) * p.ratio,
        y: middle - p.value * scale
    }));

    const path = points.map((p, i) =>
        (i ? "L" : "M") +
        p.x.toFixed(1) + "," +
        p.y.toFixed(1)
    ).join(" ");

    const peakX = left + (W - left - right) * peak.x /
        (values[values.length - 1].x || 1);

    const peakY = middle - peak.value * scale;

    return `
    <svg xmlns="${NS}" viewBox="0 0 ${W} ${H}"
         style="width:100%;max-width:700px;height:auto"
         role="img">
        <rect width="${W}" height="${H}" fill="#fff"/>
        <text x="320" y="20" text-anchor="middle"
              font-size="14" font-family="Tahoma,Arial">
            ${esc(title)} (${unit})
        </text>
        <line x1="${left}" y1="${middle}"
              x2="${W-right}" y2="${middle}"
              stroke="#64748b" stroke-width="1.2"/>
        <line x1="${left}" y1="${top}"
              x2="${left}" y2="${H-bottom}"
              stroke="#94a3b8"/>
        <path d="${path}" fill="none"
              stroke="#087eaa" stroke-width="2.5"/>
        <circle cx="${points[0].x}" cy="${points[0].y}"
                r="4" fill="#15803d"/>
        <circle cx="${points[points.length-1].x}"
                cy="${points[points.length-1].y}"
                r="4" fill="#b45309"/>
        <circle cx="${peakX}" cy="${peakY}"
                r="4.5" fill="#dc2626"/>
        <text x="${left}" y="204" text-anchor="middle"
              font-size="11" font-family="Tahoma,Arial">ابتدا</text>
        <text x="${W-right}" y="204" text-anchor="middle"
              font-size="11" font-family="Tahoma,Arial">انتها</text>
        <text x="620" y="36" text-anchor="end"
              font-size="11" font-family="Tahoma,Arial">
            بیشینه قدرمطلق: ${fmt(peak.value)} ${unit}
        </text>
        <text x="620" y="51" text-anchor="end"
              font-size="10" font-family="Tahoma,Arial">
            فاصله از ابتدا: ${fmt(peak.x)} m
        </text>
    </svg>`;
}

function renderMember(member) {
    const length = Number(member.length);
    const required = [
        member.axialStart, member.shearStart, member.momentStart,
        member.localLoadX, member.localLoadY
    ];

    if (!Number.isFinite(length) || length <= 0 ||
        required.some(v => !Number.isFinite(Number(v)))) {
        return `
            <div class="notice">
                اطلاعات بار گسترده یا طول عضو برای ${esc(member.name)} موجود نیست.
                تحلیل را دوباره اجرا کنید.
            </div>
        `;
    }

    const N = buildValues(member, "N");
    const V = buildValues(member, "V");
    const M = buildValues(member, "M");

    const peakN = findPeak(N);
    const peakV = findPeak(V);
    const peakM = findPeak(M);

    return `
        <div style="border:1px solid #cbd5e1;border-radius:10px;
            padding:10px;margin:14px 0;break-inside:avoid">
            <h4 style="text-align:center">${esc(member.name)}</h4>
            <p>طول عضو: <b>${fmt(length)} متر</b></p>
            <p>بار محوری محلی: ${fmt(member.localLoadX)} kN/m</p>
            <p>بار عرضی محلی: ${fmt(member.localLoadY)} kN/m</p>

            ${makeSvg("نیروی محوری N", "kN", N, peakN)}
            ${makeSvg("نیروی برشی V", "kN", V, peakV)}
            ${makeSvg("لنگر خمشی M", "kN.m", M, peakM)}

            <div class="notice">
                <b>مقادیر بیشینه در طول عضو</b>
                <p>بیشینه |N|: ${fmt(peakN.value)} kN
                ـ در فاصله ${fmt(peakN.x)} m</p>
                <p>بیشینه |V|: ${fmt(peakV.value)} kN
                ـ در فاصله ${fmt(peakV.x)} m</p>
                <p>بیشینه |M|: ${fmt(peakM.value)} kN.m
                ـ در فاصله ${fmt(peakM.x)} m</p>
            </div>
        </div>
    `;
}

function render(target, combo) {
    if (!target || !combo) return;

    const members = MEMBER_NAMES.map(name =>
        (combo.members || []).find(m => m.name === name)
    );

    if (members.some(m => !m)) {
        target.innerHTML =
            '<div class="notice">اطلاعات چهار عضو کامل نیست.</div>';
        return;
    }

    target.innerHTML = `
        <div class="notice">
            <b>ترکیب بار:</b> ${esc(combo.name)}
            <p>نمودارها با بار گسترده یکنواخت محلی و معادلات تعادل عضو
            محاسبه شده‌اند. نمودار لنگر، نقطه صفرشدن برش را نیز بررسی می‌کند.</p>
        </div>
        ${members.map(renderMember).join("")}
        <div class="notice">
            <b>محدودیت‌ها و قرارداد علامت:</b>
            <p>۱. نیروها در دستگاه مختصات محلی هر عضو گزارش می‌شوند؛
            بنابراین علامت ابتدا و انتهای نمودار ممکن است با علامت
            نیروهای انتهایی در جدول قبلی متفاوت باشد.</p>
            <p>۲. بارهای گسترده یکنواختی که در تحلیل قاب اعمال شده‌اند
            در نمودارها لحاظ شده‌اند. بار متمرکز، بار گسترده متغیر،
            بارگذاری موضعی و بارهای خارج از مدل فعلی لحاظ نشده‌اند.</p>
            <p>۳. این نمودارها خروجی تحلیل خطی مرتبه اول هستند و
            جایگزین کنترل کامل آیین‌نامه‌ای یا طراحی اجرایی نیستند.</p>
        </div>
    `;
}

function renderSelected() {
    const select = $("forceCombinationSelect");
    const target = $("forceDiagramResults");
    const combos = window.SteelAnalysis &&
        window.SteelAnalysis.combinationResults;

    if (!select || !target) return;

    if (!Array.isArray(combos) || !combos.length) {
        select.innerHTML =
            '<option value="">ابتدا تحلیل ترکیبات بار را اجرا کنید</option>';
        target.innerHTML = "هنوز نتیجه‌ای برای نمایش وجود ندارد.";
        return;
    }

    const combo = combos[Number(select.value)] || combos[0];
    render(target, combo);
}

function refresh() {
    const select = $("forceCombinationSelect");
    const combos = window.SteelAnalysis &&
        window.SteelAnalysis.combinationResults;

    if (!select) return;

    if (!Array.isArray(combos) || !combos.length) {
        renderSelected();
        return;
    }

    const previous = select.value;

    select.innerHTML = combos.map((combo, i) =>
        `<option value="${i}">${esc(combo.name)}</option>`
    ).join("");

    select.value =
        previous !== "" && Number(previous) < combos.length
            ? previous
            : "0";

    renderSelected();
}

function addReport() {
    const report = $("printableFinalReport");
    const combos = window.SteelAnalysis &&
        window.SteelAnalysis.combinationResults;
    const select = $("forceCombinationSelect");

    if (!report || !Array.isArray(combos) ||
        !combos.length || !select) return;

    const combo = combos[Number(select.value)] || combos[0];

    const old = $("forceDiagramsReportSection");
    if (old) old.remove();

    const section = document.createElement("section");
    section.id = "forceDiagramsReportSection";
    section.className = "report-section";

    section.innerHTML = `
        <h3>۹. نمودارهای نیروهای داخلی اعضا با اثر بار گسترده</h3>
        <div id="forceDiagramsReportContent"></div>
    `;

    report.appendChild(section);
    render($("forceDiagramsReportContent"), combo);
}

function init() {
    let panel = $("forceDiagramPanel");

    if (!panel) {
        panel = document.createElement("section");
        panel.id = "forceDiagramPanel";
        panel.className = "panel";
        panel.style.marginTop = "20px";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>۹ ـ نمودار نیروهای داخلی اعضا</h3>
            </div>
            <div class="field">
                <label for="forceCombinationSelect">انتخاب ترکیب بار</label>
                <select id="forceCombinationSelect">
                    <option value="">ابتدا تحلیل ترکیبات بار را اجرا کنید</option>
                </select>
            </div>
            <div id="forceDiagramResults" class="notice">
                ابتدا تحلیل ترکیبات بار را اجرا کنید.
            </div>
        `;

        const main = document.querySelector("main.container") ||
            document.querySelector("main") ||
            document.body;

        const footer = main.querySelector("footer");

        if (footer) main.insertBefore(panel, footer);
        else main.appendChild(panel);
    }

    const select = $("forceCombinationSelect");
    if (select && !select.dataset.forceDiagramBound) {
        select.dataset.forceDiagramBound = "1";
        select.addEventListener("change", renderSelected);
    }

    const comboButton = $("btnCombinations");
    if (comboButton && !comboButton.dataset.forceDiagramBound) {
        comboButton.dataset.forceDiagramBound = "1";
        comboButton.addEventListener("click", function () {
            setTimeout(refresh, 300);
            setTimeout(refresh, 1000);
        });
    }

    const calcButton = $("btnCalculate");
    if (calcButton && !calcButton.dataset.forceDiagramBound) {
        calcButton.dataset.forceDiagramBound = "1";
        calcButton.addEventListener("click", function () {
            setTimeout(refresh, 300);
        });
    }

    const reportButton = $("btnFinalReport");
    if (reportButton && !reportButton.dataset.forceDiagramBound) {
        reportButton.dataset.forceDiagramBound = "1";
        reportButton.addEventListener("click", function () {
            setTimeout(addReport, 300);
        });
    }

    refresh();
}

window.SteelForceDiagrams = {
    refresh,
    render: renderSelected
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();

/* ===== steel2/js/roof-ties.js ===== */

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

