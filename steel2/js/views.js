
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
