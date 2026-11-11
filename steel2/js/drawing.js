
/* SAHROUD STEEL - Frame Drawing 2.1 */
(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";

    function drawFrame() {
        const svg = document.getElementById("frameDrawing");
        if (!svg) {
            console.error("SVG frameDrawing پیدا نشد.");
            return false;
        }

        const get = id => {
            const field = document.getElementById(id);
            return field ? Number(field.value) : NaN;
        };

        const span = get("span");
        const height = get("height");
        const rise = get("rise");

        if (!Number.isFinite(span) || !Number.isFinite(height) ||
            !Number.isFinite(rise) || span <= 0 || height <= 0 || rise < 0) {
            return false;
        }

        const connectionField = document.getElementById("baseConnection");
        const connection = connectionField && connectionField.value === "fixed"
            ? "fixed" : "pinned";

        const W = 600, H = 300, marginX = 75, groundY = 235, availableH = 175;
        const overhang = 0.80;
        const scale = Math.min(
            (W - 2 * marginX) / (span + 2 * overhang),
            availableH / (height + rise || height)
        );

        const leftX = marginX + overhang * scale;
        const rightX = leftX + span * scale;
        const baseY = groundY;
        const eaveY = groundY - height * scale;
        const ridgeY = groundY - (height + rise) * scale;
        const midX = (leftX + rightX) / 2;

        function el(name, attrs, parent = svg) {
            const node = document.createElementNS(NS, name);
            Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
            parent.appendChild(node);
            return node;
        }

        function line(x1, y1, x2, y2, color, width, dash) {
            const attrs = {
                x1, y1, x2, y2, stroke: color,
                "stroke-width": width, "stroke-linecap": "round"
            };
            if (dash) attrs["stroke-dasharray"] = dash;
            return el("line", attrs);
        }

        function label(x, y, text, size = 12, color = "#263746") {
            const t = el("text", {
                x, y, fill: color, "font-size": size,
                "font-family": "Tahoma, Arial",
                "text-anchor": "middle", direction: "rtl"
            });
            t.textContent = text;
            return t;
        }

        function drawPinnedSupport(x) {
            el("path", {
                d: `M ${x - 13} ${baseY + 4} L ${x + 13} ${baseY + 4} L ${x} ${baseY + 19} Z`,
                fill: "#dbeafe", stroke: "#1d4ed8", "stroke-width": 1.8
            });
            line(x - 19, baseY + 21, x + 19, baseY + 21, "#334155", 1.6);
            for (let i = -15; i <= 15; i += 7) {
                line(x + i, baseY + 21, x + i - 5, baseY + 27, "#64748b", 1);
            }
            label(x, baseY + 43, "مفصلی", 10, "#1d4ed8");
        }

        function drawFixedSupport(x) {
            el("rect", {
                x: x - 15, y: baseY + 3, width: 30, height: 6,
                rx: 1, fill: "#f59e0b", stroke: "#92400e", "stroke-width": 1.5
            });
            line(x - 22, baseY + 12, x + 22, baseY + 12, "#334155", 2);
            for (let i = -20; i <= 20; i += 7) {
                line(x + i, baseY + 12, x + i - 7, baseY + 20, "#64748b", 1.2);
            }
            [-10, 10].forEach(offset => {
                line(x + offset, baseY - 1, x + offset, baseY + 13, "#92400e", 1.5);
                el("circle", {
                    cx: x + offset, cy: baseY + 1, r: 2.2,
                    fill: "#fff7ed", stroke: "#92400e", "stroke-width": 1
                });
            });
            label(x, baseY + 36, "گیردار", 10, "#b45309");
        }

        svg.innerHTML = "";
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        el("rect", { x: 0, y: 0, width: W, height: H, fill: "#f8fafc" });

        for (let x = 50; x <= W - 50; x += 25) {
            line(x, 20, x, 250, "#e8edf2", 0.7);
        }
        for (let y = 25; y <= 250; y += 25) {
            line(30, y, W - 30, y, "#e8edf2", 0.7);
        }

        line(35, baseY, W - 35, baseY, "#64748b", 2);
        line(leftX, baseY, leftX, eaveY, "#176b9b", 7);
        line(rightX, baseY, rightX, eaveY, "#176b9b", 7);
        const roofAngle = Math.atan2(rise, span / 2);
        const tipOffsetX = overhang * scale * Math.cos(roofAngle);
        const tipOffsetY = overhang * scale * Math.sin(roofAngle);
        const leftTipX = leftX - tipOffsetX;
        const leftTipY = eaveY + tipOffsetY;
        const rightTipX = rightX + tipOffsetX;
        const rightTipY = eaveY + tipOffsetY;

        line(leftTipX, leftTipY, leftX, eaveY, "#b45309", 5);
        line(leftX, eaveY, midX, ridgeY, "#d97706", 7);
        line(midX, ridgeY, rightX, eaveY, "#d97706", 7);
        line(rightX, eaveY, rightTipX, rightTipY, "#b45309", 5);
        label(leftTipX, leftTipY - 9, "کنسول ۰٫۸ m", 9, "#92400e");
        label(rightTipX, rightTipY - 9, "کنسول ۰٫۸ m", 9, "#92400e");

        [
            [leftX, baseY], [leftX, eaveY], [midX, ridgeY],
            [rightX, eaveY], [rightX, baseY]
        ].forEach(([x, y]) => {
            el("circle", {
                cx: x, cy: y, r: 5, fill: "#ffffff",
                stroke: "#123b52", "stroke-width": 2
            });
        });

        if (connection === "fixed") {
            drawFixedSupport(leftX);
            drawFixedSupport(rightX);
        } else {
            drawPinnedSupport(leftX);
            drawPinnedSupport(rightX);
        }

        label(leftX - 17, baseY + 29, "A");
        label(leftX - 17, eaveY - 10, "B");
        label(midX, ridgeY - 12, "C");
        label(rightX + 17, eaveY - 10, "D");
        label(rightX + 17, baseY + 29, "E");

        const dimY = Math.min(baseY + 55, 292);
        line(leftX, baseY + 18, leftX, dimY, "#64748b", 1);
        line(rightX, baseY + 18, rightX, dimY, "#64748b", 1);
        line(leftX, dimY, rightX, dimY, "#64748b", 1);
        line(leftX - 4, dimY - 4, leftX + 4, dimY + 4, "#64748b", 1);
        line(rightX - 4, dimY - 4, rightX + 4, dimY + 4, "#64748b", 1);
        label(midX, dimY - 6, `دهانه: ${span} متر`, 12);

        const dimX = Math.max(20, leftX - 35);
        line(dimX, baseY, dimX, eaveY, "#64748b", 1);
        line(dimX - 4, baseY, dimX + 4, baseY, "#64748b", 1);
        line(dimX - 4, eaveY, dimX + 4, eaveY, "#64748b", 1);
        const hLabel = label(dimX - 5, (baseY + eaveY) / 2, `${height} m`, 11);
        hLabel.setAttribute("transform",
            `rotate(-90 ${dimX - 5} ${(baseY + eaveY) / 2})`);

        label(midX + 45, ridgeY + 18, `ارتفاع تاج: ${rise} m`, 11, "#9a3412");
        label(W / 2, 18, "نمای دوبعدی قاب سوله", 13, "#123b52");

        const status = document.getElementById("projectStatus");
        if (status) {
            status.textContent = connection === "fixed"
                ? "قاب با تکیه‌گاه گیردار ترسیم شد."
                : "قاب با تکیه‌گاه مفصلی ترسیم شد.";
        }
        return true;
    }

    window.SteelDrawing = { drawFrame };

    function connectDrawingControls() {
        const field = document.getElementById("baseConnection");
        if (field && !field.dataset.drawingListener) {
            field.addEventListener("change", drawFrame);
            field.dataset.drawingListener = "1";
        }
        ["span", "height"].forEach(id => {
            const input = document.getElementById(id);
            if (input && !input.dataset.frameDrawingListener) {
                input.addEventListener("input", drawFrame);
                input.dataset.frameDrawingListener = "1";
            }
        });
        drawFrame();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connectDrawingControls);
    } else {
        connectDrawingControls();
    }
})();
