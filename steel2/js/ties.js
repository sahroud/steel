
/* SAHROUD STEEL - Column Longitudinal Ties 1.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const NS = "http://www.w3.org/2000/svg";

    const COLORS = {
        upper: "#15803d",
        lower: "#7c3aed",
        warning: "#b45309"
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
            left: { enabled: false, width: 0, position: 0 },
            right: { enabled: false, width: 0, position: 0 }
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
        const text = document.createElementNS(NS, "text");

        text.setAttribute("x", x);
        text.setAttribute("y", y);
        text.setAttribute("fill", color);
        text.setAttribute("font-size", "11");
        text.setAttribute("font-family", "Tahoma, Arial");
        text.setAttribute("text-anchor", "middle");

        text.textContent = value;
        svg.appendChild(text);
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

    function lowerTieBlocked(opening, start, end, lowerHeight) {
        if (!opening || !opening.enabled) return false;

        const position = Number(opening.position);
        const width = Number(opening.width);
        const openingHeight = Number(opening.height);

        if (
            !Number.isFinite(position) ||
            !Number.isFinite(width) ||
            !Number.isFinite(openingHeight)
        ) {
            return true;
        }

        // اگر بازشو به ارتفاع قید دوم برسد، قید در آن دهانه حذف می‌شود.
        const verticalConflict = openingHeight >= lowerHeight - 0.001;

        if (!verticalConflict) return false;

        return overlaps(
            start,
            end,
            position,
            position + width
        );
    }

    function drawWallTies(svgId, opening, length, height, frameCount, lowerEnabled) {
        const svg = $(svgId);
        if (!svg) return { skipped: 0 };

        const x0 = 65;
        const x1 = 575;
        const ground = 245;

        const sx = (x1 - x0) / length;
        const sy = 175 / height;

        const topY = ground - height * sy;

        // قید بالایی در تراز انتهای ستون
        addLine(
            svg,
            x0,
            topY,
            x1,
            topY,
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

        // قید دوم به صورت قطعه‌ای بین قاب‌ها ترسیم می‌شود.
        for (let i = 0; i < bayCount; i++) {
            const start = length * i / bayCount;
            const end = length * (i + 1) / bayCount;

            const blocked = lowerTieBlocked(
                opening,
                start,
                end,
                lowerHeight
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

    function addPanel() {
        if ($("tiesPanel")) return;

        const panel = document.createElement("section");
        panel.id = "tiesPanel";
        panel.className = "panel";

        const heading = document.createElement("div");
        heading.className = "panel-title";

        const title = document.createElement("h3");
        title.textContent = "۱۱ ـ قیدهای طولی ستون‌ها";

        const status = document.createElement("span");
        status.className = "status";
        status.textContent = "تنظیم قیدها";

        heading.appendChild(title);
        heading.appendChild(status);
        panel.appendChild(heading);

        const note = document.createElement("div");
        note.className = "notice";
        note.textContent =
            "قید بالایی به صورت پیش‌فرض نمایش داده می‌شود. قید دوم در فاصله ۱٫۵ متر پایین‌تر از انتهای ستون، با توجه به بازشوهای دیوار طولی بررسی می‌شود.";

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
        const height = number("height");
        const spacing = number("spacing");
        const frames = number("frames");

        const result = $("tiesStatus");

        if (
            !Number.isFinite(length) ||
            !Number.isFinite(height) ||
            !Number.isFinite(spacing) ||
            length <= 0 ||
            height <= 0 ||
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

        // بازسازی نماها و مهاربندها پیش از رسم قیدها
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

        const left = drawWallTies(
            "viewLeft",
            openings.left,
            length,
            height,
            frameCount,
            lowerEnabled
        );

        const right = drawWallTies(
            "viewRight",
            openings.right,
            length,
            height,
            frameCount,
            lowerEnabled
        );

        if (result) {
            let message = "قید بالایی در دو دیوار طولی نمایش داده شد.";

            if (lowerEnabled) {
                if (height <= 1.5) {
                    message +=
                        " ارتفاع ستون برای قرارگیری قید دوم کافی نیست.";
                } else {
                    message +=
                        " قید دوم در فاصله ۱٫۵ متر پایین‌تر بررسی و ترسیم شد.";

                    const skipped = left.skipped + right.skipped;

                    if (skipped > 0) {
                        message +=
                            " در " + skipped +
                            " دهانه به علت تداخل با بازشو، قید دوم حذف شد.";
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
            "height",
            "spacing",
            "frames",
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
