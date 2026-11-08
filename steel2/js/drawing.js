
/* SAHROUD STEEL - Frame Drawing */
(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";

    function drawFrame() {
        const svg = document.getElementById("frameDrawing");

        if (!svg) {
            console.error("SVG frameDrawing پیدا نشد.");
            return false;
        }

        const get = id => Number(document.getElementById(id).value);

        const span = get("span");
        const height = get("height");
        const rise = get("rise");

        if (
            !Number.isFinite(span) ||
            !Number.isFinite(height) ||
            !Number.isFinite(rise) ||
            span <= 0 || height <= 0 || rise < 0
        ) {
            alert("لطفاً ابعاد هندسی معتبر وارد کنید.");
            return false;
        }

        // محدوده ترسیم
        const W = 600;
        const H = 300;
        const marginX = 75;
        const groundY = 235;
        const availableH = 175;

        const scale = Math.min(
            (W - 2 * marginX) / span,
            availableH / (height + rise)
        );

        const leftX = marginX;
        const rightX = W - marginX;
        const baseY = groundY;
        const eaveY = groundY - height * scale;
        const ridgeY = groundY - (height + rise) * scale;
        const midX = (leftX + rightX) / 2;

        const leftEave = { x: leftX, y: eaveY };
        const rightEave = { x: rightX, y: eaveY };
        const ridge = { x: midX, y: ridgeY };

        function el(name, attrs, parent = svg) {
            const node = document.createElementNS(NS, name);

            Object.entries(attrs).forEach(([key, value]) => {
                node.setAttribute(key, value);
            });

            parent.appendChild(node);
            return node;
        }

        function line(x1, y1, x2, y2, color, width, dash) {
            const attrs = {
                x1, y1, x2, y2,
                stroke: color,
                "stroke-width": width,
                "stroke-linecap": "round"
            };

            if (dash) attrs["stroke-dasharray"] = dash;
            return el("line", attrs);
        }

        function label(x, y, text, size = 12, color = "#263746") {
            const t = el("text", {
                x, y,
                fill: color,
                "font-size": size,
                "font-family": "Tahoma, Arial",
                "text-anchor": "middle",
                direction: "rtl"
            });

            t.textContent = text;
            return t;
        }

        // پاک کردن ترسیم قبلی
        svg.innerHTML = "";
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // زمینه
        el("rect", {
            x: 0, y: 0, width: W, height: H,
            fill: "#f8fafc"
        });

        // خطوط شبکه
        for (let x = 50; x <= W - 50; x += 25) {
            line(x, 20, x, 250, "#e8edf2", 0.7);
        }

        for (let y = 25; y <= 250; y += 25) {
            line(30, y, W - 30, y, "#e8edf2", 0.7);
        }

        // خط زمین
        line(35, baseY, W - 35, baseY, "#64748b", 2);

        // ستون چپ و راست
        line(leftX, baseY, leftEave.x, leftEave.y, "#176b9b", 7);
        line(rightX, baseY, rightEave.x, rightEave.y, "#176b9b", 7);

        // تیرهای شیب‌دار سقف
        line(leftEave.x, leftEave.y, ridge.x, ridge.y, "#d97706", 7);
        line(ridge.x, ridge.y, rightEave.x, rightEave.y, "#d97706", 7);

        // گره‌ها
        [
            [leftX, baseY],
            [leftEave.x, leftEave.y],
            [ridge.x, ridge.y],
            [rightEave.x, rightEave.y],
            [rightX, baseY]
        ].forEach(([x, y]) => {
            el("circle", {
                cx: x, cy: y, r: 5,
                fill: "#ffffff",
                stroke: "#123b52",
                "stroke-width": 2
            });
        });

        // تکیه‌گاه‌های پای ستون
        [leftX, rightX].forEach(x => {
            el("path", {
                d: `M ${x - 12} ${baseY + 3} L ${x + 12} ${baseY + 3} L ${x} ${baseY + 17} Z`,
                fill: "#dbeafe",
                stroke: "#334155",
                "stroke-width": 1.5
            });
        });

        // نام گره‌ها
        label(leftX - 17, baseY + 29, "A");
        label(leftX - 17, eaveY - 10, "B");
        label(midX, ridgeY - 12, "C");
        label(rightX + 17, eaveY - 10, "D");
        label(rightX + 17, baseY + 29, "E");

        // اندازه دهانه
        const dimY = Math.min(baseY + 45, 285);

        line(leftX, baseY + 18, leftX, dimY, "#64748b", 1);
        line(rightX, baseY + 18, rightX, dimY, "#64748b", 1);
        line(leftX, dimY, rightX, dimY, "#64748b", 1);

        line(leftX - 4, dimY - 4, leftX + 4, dimY + 4, "#64748b", 1);
        line(rightX - 4, dimY - 4, rightX + 4, dimY + 4, "#64748b", 1);

        label(midX, dimY - 6, `دهانه: ${span} متر`, 12);

        // ارتفاع ستون
        const dimX = Math.max(20, leftX - 35);

        line(dimX, baseY, dimX, eaveY, "#64748b", 1);
        line(dimX - 4, baseY, dimX + 4, baseY, "#64748b", 1);
        line(dimX - 4, eaveY, dimX + 4, eaveY, "#64748b", 1);

        const hLabel = label(dimX - 5, (baseY + eaveY) / 2, `${height} m`, 11);
        hLabel.setAttribute("transform",
            `rotate(-90 ${dimX - 5} ${(baseY + eaveY) / 2})`);

        // اطلاعات تاج
        label(midX + 45, ridgeY + 18, `ارتفاع تاج: ${rise} m`, 11, "#9a3412");

        // عنوان
        label(W / 2, 18, "نمای دوبعدی قاب سوله", 13, "#123b52");

        const status = document.getElementById("projectStatus");
        if (status) {
            status.textContent = "قاب هندسی با موفقیت ترسیم شد.";
        }

        return true;
    }

    window.SteelDrawing = {
        drawFrame
    };

})();

