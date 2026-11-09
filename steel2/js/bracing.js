
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
