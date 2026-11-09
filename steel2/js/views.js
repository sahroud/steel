
/* SAHROUD STEEL - Building Views 1.0 */
(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";
    const $ = id => document.getElementById(id);
    const num = id => $(id) ? Number($(id).value) : NaN;

    function el(svg, tag, attrs) {
        const n = document.createElementNS(NS, tag);
        Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
        svg.appendChild(n);
        return n;
    }

    function line(svg, x1, y1, x2, y2, color, width, dash) {
        const a = {x1, y1, x2, y2, stroke: color || "#64748b",
            "stroke-width": width || 1.5};
        if (dash) a["stroke-dasharray"] = dash;
        el(svg, "line", a);
    }

    function rect(svg, x, y, w, h, fill, stroke, sw) {
        el(svg, "rect", {
            x, y, width: w, height: h,
            fill: fill || "none",
            stroke: stroke || "#334155",
            "stroke-width": sw || 1.5
        });
    }

    function label(svg, x, y, value, size) {
        const t = el(svg, "text", {
            x, y, fill: "#263746",
            "font-size": size || 12,
            "font-family": "Tahoma, Arial",
            "text-anchor": "middle"
        });
        t.textContent = value;
    }

    function prepareSvg(id, title) {
        const svg = $(id);
        svg.innerHTML = "";
        svg.setAttribute("viewBox", "0 0 640 300");
        rect(svg, 0, 0, 640, 300, "#f8fafc", "none", 0);
        label(svg, 320, 24, title, 15);
        return svg;
    }

    function openings() {
        if (window.SteelOpenings) {
            return window.SteelOpenings.getData();
        }

        return {
            front: {enabled:true,width:5,height:5,position:0},
            rear: {enabled:false,width:3,height:3,position:0},
            left: {enabled:false,width:3,height:3,position:5},
            right: {enabled:false,width:3,height:3,position:5}
        };
    }

    // نمای جلو و عقب
    function drawEnd(id, side, span, height, rise, opening) {
        const svg = prepareSvg(id, side === "front" ? "نمای جلو" : "نمای عقب");

        const x0 = 105, x1 = 535, ground = 245;
        const sx = (x1 - x0) / span;
        const sy = 175 / (height + rise || height);
        const eave = ground - height * sy;
        const ridge = ground - (height + rise) * sy;
        const mid = (x0 + x1) / 2;

        line(svg, 55, ground, 585, ground, "#475569", 2);
        line(svg, x0, ground, x0, eave, "#176b9b", 6);
        line(svg, x1, ground, x1, eave, "#176b9b", 6);
        line(svg, x0, eave, mid, ridge, "#d97706", 6);
        line(svg, mid, ridge, x1, eave, "#d97706", 6);

        if (opening && opening.enabled) {
            const w = opening.width * sx;
            const h = opening.height * sy;
            const ox = side === "front"
                ? mid - w / 2
                : x0 + opening.position * sx;

            rect(svg, ox, ground - h, w, h, "#dbeafe", "#dc2626", 2);
            label(svg, ox + w / 2, ground - h / 2, "بازشو", 12);
        }

        label(svg, 320, 280, "دهانه: " + span + " متر", 12);
    }

    // نماهای طولی
    function drawSide(id, side, length, height, spacing, frames, opening) {
        const svg = prepareSvg(
            id,
            side === "left" ? "نمای طولی چپ" : "نمای طولی راست"
        );

        const x0 = 65, x1 = 575, ground = 245;
        const sx = (x1 - x0) / length;
        const sy = 175 / height;
        const top = ground - height * sy;

        line(svg, 40, ground, 600, ground, "#475569", 2);
        line(svg, x0, ground, x0, top, "#176b9b", 5);
        line(svg, x1, ground, x1, top, "#176b9b", 5);
        line(svg, x0, top, x1, top, "#176b9b", 4);

        const count = Math.max(2, Math.min(100,
            Number.isFinite(frames) ? frames : Math.ceil(length / spacing) + 1
        ));

        for (let i = 0; i < count; i++) {
            const x = x0 + (x1 - x0) * i / (count - 1);
            line(svg, x, ground, x, top, "#94a3b8", 1, "3 4");
        }

        if (opening && opening.enabled) {
            const ox = x0 + opening.position * sx;
            const w = opening.width * sx;
            const h = opening.height * sy;

            rect(svg, ox, ground - h, w, h, "#dbeafe", "#dc2626", 2);
            label(svg, ox + w / 2, ground - h / 2, "بازشو", 12);
        }

        label(svg, 320, 280, "طول: " + length + " متر | تعداد قاب: " + count, 12);
    }

    // پلان سقف
    function drawRoof(span, length, spacing, frames) {
        const svg = prepareSvg("viewRoof", "پلان شماتیک سقف");

        const x0 = 100, x1 = 540, y0 = 45, y1 = 255;
        rect(svg, x0, y0, x1 - x0, y1 - y0, "#fff7ed", "#334155", 2);

        const count = Math.max(2, Math.min(100,
            Number.isFinite(frames) ? frames : Math.ceil(length / spacing) + 1
        ));

        for (let i = 0; i < count; i++) {
            const y = y0 + (y1 - y0) * i / (count - 1);
            line(svg, x0, y, x1, y, "#94a3b8", 1, "4 4");
        }

        line(svg, 320, y0, 320, y1, "#d97706", 1.5, "6 4");

        label(svg, 320, 42, "جلو", 10);
        label(svg, 320, 270, "عقب", 10);
        label(svg, 320, 290,
            "دهانه: " + span + " متر | طول: " + length + " متر", 12);
    }

    function drawAll() {
        const span = num("span");
        const length = num("length");
        const height = num("height");
        const rise = num("rise");
        const spacing = num("spacing");
        const frames = num("frames");

        if (![span,length,height,rise,spacing].every(Number.isFinite) ||
            span <= 0 || length <= 0 || height <= 0 ||
            rise < 0 || spacing <= 0) {
            return false;
        }

        const o = openings();

        drawEnd("viewFront", "front", span, height, rise, o.front);
        drawEnd("viewRear", "rear", span, height, rise, o.rear);

        drawSide("viewLeft", "left", length, height,
            spacing, frames, o.left);

        drawSide("viewRight", "right", length, height,
            spacing, frames, o.right);

        drawRoof(span, length, spacing, frames);

        return true;
    }

    function makeSvg(parent, id, title) {
        const section = document.createElement("div");
        section.className = "drawing-area";

        const h = document.createElement("h4");
        h.textContent = title;
        section.appendChild(h);

        const svg = document.createElementNS(NS, "svg");
        svg.id = id;
        svg.setAttribute("viewBox", "0 0 640 300");
        svg.style.width = "100%";
        svg.style.height = "auto";
        svg.style.display = "block";

        section.appendChild(svg);
        parent.appendChild(section);
    }

    function addPanel() {
        if ($("buildingViewsPanel")) return;

        const panel = document.createElement("section");
        panel.id = "buildingViewsPanel";
        panel.className = "panel";

        const heading = document.createElement("div");
        heading.className = "panel-title";
        heading.innerHTML =
            "<h3>۶ ـ نماهای هندسی سوله</h3>" +
            "<span class='status'>نمایش شماتیک</span>";

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

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn primary";
        btn.textContent = "به‌روزرسانی نقشه‌ها";
        btn.addEventListener("click", drawAll);
        panel.appendChild(btn);

        const openingPanel = $("openingPanel");

        if (openingPanel && openingPanel.parentNode) {
            openingPanel.parentNode.insertBefore(
                panel, openingPanel.nextSibling
            );
        } else {
            document.querySelector("main").appendChild(panel);
        }
    }

    function connect() {
        addPanel();
        drawAll();

        [
            "span", "length", "spacing", "height",
            "rise", "frames",
            "openingFrontWidth", "openingFrontHeight",
            "openingRearEnabled", "openingRearWidth",
            "openingRearHeight", "openingRearPosition",
            "openingLeftEnabled", "openingLeftWidth",
            "openingLeftHeight", "openingLeftPosition",
            "openingRightEnabled", "openingRightWidth",
            "openingRightHeight", "openingRightPosition"
        ].forEach(id => {
            const field = $(id);
            if (field) {
                field.addEventListener("change", drawAll);
                field.addEventListener("input", drawAll);
            }
        });
    }

    window.SteelViews = { drawAll };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connect);
    } else {
        connect();
    }
})();
