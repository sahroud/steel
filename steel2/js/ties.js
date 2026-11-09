
/* SAHROUD STEEL - Wall Ties Manager 2.0 */
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
        svg,
        x0,
        x1,
        y,
        openingStart,
        openingEnd,
        blocked,
        color,
        width
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
        svgId,
        opening,
        length,
        height,
        frameCount,
        lowerEnabled
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

        // قید بالایی
        drawHorizontalWithOpening(
            svg,
            x0,
            x1,
            topY,
            openingStart,
            openingEnd,
            openingBlocksTie(opening, height),
            COLORS.upper,
            5
        );

        addText(
            svg,
            320,
            topY - 9,
            "قید بالایی",
            COLORS.upper
        );

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

        // قید دوم در هر دهانه بین دو قاب
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

            addLine(
                svg,
                xa,
                lowerY,
                xb,
                lowerY,
                COLORS.lower,
                4
            );
        }

        addText(
            svg,
            320,
            lowerY - 9,
            "قید دوم: ۱٫۵ متر پایین‌تر",
            COLORS.lower
        );

        return { skipped };
    }

    // قیدهای دیوارهای انتهایی جلو و عقب
    function drawEndTies(
        svgId,
        opening,
        span,
        height,
        rise,
        lowerEnabled,
        side
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

        // قید بالایی دیوار انتهایی
        drawHorizontalWithOpening(
            svg,
            x0,
            x1,
            eaveY,
            openingStart,
            openingEnd,
            openingBlocksTie(opening, height),
            COLORS.upper,
            5
        );

        addText(
            svg,
            320,
            eaveY - 9,
            "قید بالایی",
            COLORS.upper
        );

        if (!lowerEnabled) {
            return { skipped: 0 };
        }

        const lowerHeight = height - 1.5;

        if (lowerHeight <= 0) {
            return { skipped: 0, invalid: true };
        }

        const lowerY = ground - lowerHeight * sy;

        const blocked = openingBlocksTie(
            opening,
            lowerHeight
        );

        if (blocked) {
            drawHorizontalWithOpening(
                svg,
                x0,
                x1,
                lowerY,
                openingStart,
                openingEnd,
                true,
                COLORS.lower,
                4
            );
        } else {
            addLine(
                svg,
                x0,
                lowerY,
                x1,
                lowerY,
                COLORS.lower,
                4
            );
        }

        addText(
            svg,
            320,
            lowerY - 9,
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
            "قید بالایی و قید دوم در چهار دیوار جلو، عقب، چپ و راست نمایش داده می‌شوند. قید دوم در فاصله ۱٫۵ متر پایین‌تر از بالای ستون قرار می‌گیرد و در محدوده بازشوهای متداخل حذف می‌شود.";

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
            '<br>' +
            '<span style="color:#7c3aed;font-weight:bold">■ قید دوم</span>';

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
                panel,
                bracingPanel.nextSibling
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
                result.textContent =
                    "ابتدا ابعاد معتبر سوله را وارد کنید.";
            }

            return false;
        }

        const lowerEnabled = $("enableLowerTie")
            ? $("enableLowerTie").checked
            : false;

        const frameCount = getFrameCount(
            length,
            spacing,
            frames
        );

        // ابتدا بازسازی نماها و مهاربندها
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
            "viewLeft",
            openings.left,
            length,
            height,
            frameCount,
            lowerEnabled
        );

        const right = drawSideTies(
            "viewRight",
            openings.right,
            length,
            height,
            frameCount,
            lowerEnabled
        );

        const front = drawEndTies(
            "viewFront",
            openings.front,
            span,
            height,
            rise,
            lowerEnabled,
            "front"
        );

        const rear = drawEndTies(
            "viewRear",
            openings.rear,
            span,
            height,
            rise,
            lowerEnabled,
            "rear"
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
        drawAll: drawAll
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connect);
    } else {
        connect();
    }
})();
