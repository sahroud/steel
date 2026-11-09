
/* SAHROUD STEEL - Preliminary Bracing Layout 1.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const NS = "http://www.w3.org/2000/svg";

    const CONFIG = {
        color: "#dc2626",
        width: 3.5
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
            left: { enabled: false, width: 0, position: 0 },
            right: { enabled: false, width: 0, position: 0 },
            rear: { enabled: false, width: 0, position: 0 }
        };
    }

    // بررسی تداخل یک بازشو با یک دهانه مهاربندی
    function overlaps(a1, a2, b1, b2) {
        return Math.min(a2, b2) - Math.max(a1, b1) > 0.001;
    }

    function openingBlocksBay(opening, start, end) {
        if (!opening || !opening.enabled) return false;

        const openStart = Number(opening.position);
        const openEnd = openStart + Number(opening.width);

        return overlaps(start, end, openStart, openEnd);
    }

    // انتخاب دهانه‌های مشترک و آزاد در دو دیوار طولی
    function selectBracingBays(length, frameCount, openings) {
        const bayCount = frameCount - 1;
        const bayLength = length / bayCount;

        const available = [];

        for (let i = 0; i < bayCount; i++) {
            const start = i * bayLength;
            const end = (i + 1) * bayLength;

            const blockedLeft = openingBlocksBay(
                openings.left,
                start,
                end
            );

            const blockedRight = openingBlocksBay(
                openings.right,
                start,
                end
            );

            if (!blockedLeft && !blockedRight) {
                available.push(i);
            }
        }

        if (available.length === 0) {
            return {
                selected: [],
                available: [],
                bayLength
            };
        }

        // انتخاب اولین و آخرین دهانه آزاد
        const selected = [available[0]];

        if (available.length > 1) {
            const last = available[available.length - 1];

            if (last !== selected[0]) {
                selected.push(last);
            }
        }

        return {
            selected,
            available,
            bayLength
        };
    }

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

            // مهاربند ضربدری دیوار طولی
            svgLine(svg, xa, ground, xb, top);
            svgLine(svg, xa, top, xb, ground);

            svgText(svg, (xa + xb) / 2, 95, "X");
        });
    }

    function drawRoofBraces(selected, span, length, frameCount) {
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

            // مهاربند ضربدری در صفحه سقف
            svgLine(svg, x0, ya, x1, yb);
            svgLine(svg, x1, ya, x0, yb);

            svgText(svg, 320, (ya + yb) / 2, "X");
        });
    }

    // مهاربندی شماتیک دیوار انتهایی عقب
    function drawRearBraces(openings) {
        const svg = $("viewRear");
        if (!svg) return;

        // در صورت وجود بازشو، مهاربند انتهایی ترسیم نمی‌شود
        if (openings.rear && openings.rear.enabled) {
            return;
        }

        const x0 = 105;
        const x1 = 535;
        const ground = 245;
        const height = number("height");
        const rise = number("rise");

        const sy = 175 / (height + rise);
        const top = ground - height * sy;

        // ضربدر در محدوده مستطیلی دیوار عقب
        svgLine(svg, x0, ground, x1, top);
        svgLine(svg, x0, top, x1, ground);

        svgText(svg, 320, (ground + top) / 2, "X");
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
            "خطوط قرمز محل پیشنهادی مهاربندها را نشان می‌دهند. این جانمایی مفهومی است و هنوز ظرفیت اعضا، اتصالات، پایداری کلی و مسیر انتقال نیرو محاسبه نشده است.";
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
        const frames = number("frames");

        const result = $("bracingStatus");

        if (
            !Number.isFinite(length) ||
            !Number.isFinite(span) ||
            !Number.isFinite(spacing) ||
            length <= 0 ||
            span <= 0 ||
            spacing <= 0
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

        // ابتدا نماهای پایه پاک و دوباره رسم می‌شوند
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
                    "هشدار: با توجه به بازشوهای دو دیوار طولی، دهانه مشترک آزادی برای آرایش پیشنهادی پیدا نشد. باید آرایش مهاربندی و محل بازشوها بازنگری شود.";
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

        // مهاربندهای صفحه سقف در همان دهانه‌ها
        drawRoofBraces(
            layout.selected,
            span,
            length,
            frameCount
        );

        // مهاربند دیوار انتهایی عقب
        drawRearBraces(openings);

        const bayNames = layout.selected.map(
            index => "دهانه " + (index + 1)
        );

        if (result) {
            result.textContent =
                "دهانه‌های مشترک انتخاب‌شده: " +
                bayNames.join(" و ") +
                ". مهاربندهای دو دیوار طولی و سقف در این دهانه‌ها نمایش داده شدند." +
                (
                    openings.rear && openings.rear.enabled
                        ? " به علت بازشوی دیوار عقب، مهاربند انتهایی عقب ترسیم نشد."
                        : " مهاربندی شماتیک دیوار عقب نیز نمایش داده شد."
                );
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
            "frames",
            "openingLeftEnabled",
            "openingLeftWidth",
            "openingLeftPosition",
            "openingRightEnabled",
            "openingRightWidth",
            "openingRightPosition",
            "openingRearEnabled"
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
