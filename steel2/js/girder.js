
/* SAHROUD STEEL - Independent Column and Rafter Girders */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const DENSITY = 7850;

    const members = {
        column: { title: "ستون", result: null },
        rafter: { title: "رفتر", result: null }
    };

    function fields(prefix, title, defaults) {
        return `
            <h4>${title}</h4>
            <div class="form-grid">
                <div class="field">
                    <label>ارتفاع خالص جان (mm)</label>
                    <input id="${prefix}WebH" type="number" min="1" value="${defaults[0]}">
                </div>
                <div class="field">
                    <label>ضخامت جان (mm)</label>
                    <input id="${prefix}WebT" type="number" min="1" value="${defaults[1]}">
                </div>
                <div class="field">
                    <label>عرض بال پایینی (mm)</label>
                    <input id="${prefix}BottomB" type="number" min="1" value="${defaults[2]}">
                </div>
                <div class="field">
                    <label>ضخامت بال پایینی (mm)</label>
                    <input id="${prefix}BottomT" type="number" min="1" value="${defaults[3]}">
                </div>
                <div class="field">
                    <label>عرض بال بالایی (mm)</label>
                    <input id="${prefix}TopB" type="number" min="1" value="${defaults[4]}">
                </div>
                <div class="field">
                    <label>ضخامت بال بالایی (mm)</label>
                    <input id="${prefix}TopT" type="number" min="1" value="${defaults[5]}">
                </div>
            </div>
            <div class="button-grid">
                <button id="${prefix}Calculate" class="btn primary" type="button">
                    محاسبه تیرورق ${title}
                </button>
                <button id="${prefix}Transfer" class="btn success" type="button">
                    انتقال به ${title}
                </button>
            </div>
            <div id="${prefix}Message" class="notice">
                ابعاد ${title} را وارد و محاسبه کنید.
            </div>
            <div id="${prefix}Results"></div>
        `;
    }

    function createPanel() {
        if ($("girderPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "girderPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>محاسبه مستقل تیرورق ستون و رفتر</h3>
            </div>
            <div class="notice">
                مشخصات ستون و رفتر کاملاً مستقل است.
                محاسبه یا انتقال هرکدام، اطلاعات دیگری را تغییر نمی‌دهد.
                تمام ابعاد بر حسب میلی‌متر هستند.
            </div>
            ${fields("colGirder", "۱ ـ تیرورق ستون", [500, 8, 200, 12, 200, 12])}
            <hr>
            ${fields("rafGirder", "۲ ـ تیرورق رفتر", [400, 8, 180, 10, 180, 10])}
        `;

        const main = document.querySelector("main");
        if (!main) throw new Error("بخش اصلی صفحه پیدا نشد.");

        const drawing = Array.from(main.querySelectorAll(".panel"))
            .find(p => p.querySelector("h3")?.textContent.includes("۵"));

        if (drawing) main.insertBefore(panel, drawing);
        else main.appendChild(panel);

        $("colGirderCalculate").addEventListener("click", () => calculate("column"));
        $("colGirderTransfer").addEventListener("click", () => transfer("column"));
        $("rafGirderCalculate").addEventListener("click", () => calculate("rafter"));
        $("rafGirderTransfer").addEventListener("click", () => transfer("rafter"));
    }

    function readDimensions(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        return {
            hw: Number($(prefix + "WebH").value),
            tw: Number($(prefix + "WebT").value),
            bb: Number($(prefix + "BottomB").value),
            tb: Number($(prefix + "BottomT").value),
            bt: Number($(prefix + "TopB").value),
            tt: Number($(prefix + "TopT").value)
        };
    }

    function calculateProperties(d) {
        if (Object.values(d).some(v => !Number.isFinite(v) || v <= 0)) {
            throw new Error("تمام ابعاد باید بزرگ‌تر از صفر باشند.");
        }

        if (d.tw >= Math.min(d.bb, d.bt)) {
            throw new Error("ضخامت جان باید از عرض هر دو بال کمتر باشد.");
        }

        const hw = d.hw / 1000;
        const tw = d.tw / 1000;
        const bb = d.bb / 1000;
        const tb = d.tb / 1000;
        const bt = d.bt / 1000;
        const tt = d.tt / 1000;

        const Ab = bb * tb;
        const Aw = tw * hw;
        const At = bt * tt;
        const A = Ab + Aw + At;

        const yb = tb / 2;
        const yw = tb + hw / 2;
        const yt = tb + hw + tt / 2;

        const yBar = (Ab * yb + Aw * yw + At * yt) / A;

        const Ix =
            bb * Math.pow(tb, 3) / 12 + Ab * Math.pow(yb - yBar, 2) +
            tw * Math.pow(hw, 3) / 12 + Aw * Math.pow(yw - yBar, 2) +
            bt * Math.pow(tt, 3) / 12 + At * Math.pow(yt - yBar, 2);

        const Iy =
            tb * Math.pow(bb, 3) / 12 +
            hw * Math.pow(tw, 3) / 12 +
            tt * Math.pow(bt, 3) / 12;

        const totalHeight = hw + tb + tt;
        const SxTop = Ix / (totalHeight - yBar);
        const SxBottom = Ix / yBar;
        const Sy = Iy / (Math.max(bb, bt) / 2);

        return {
            A, Ix, Iy, SxTop, SxBottom, Sy,
            rx: Math.sqrt(Ix / A),
            ry: Math.sqrt(Iy / A),
            yBar, totalHeight,
            massPerMeter: A * DENSITY
        };
    }

    function fmt(value, digits = 2) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function showResults(member, p) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        $(prefix + "Results").innerHTML = `
            <h4>نتایج ${members[member].title}</h4>
            <div class="result-card"><span>مساحت A</span><strong>${fmt(p.A * 1e4)} cm²</strong></div>
            <div class="result-card"><span>ممان اینرسی Ix</span><strong>${fmt(p.Ix * 1e8)} cm⁴</strong></div>
            <div class="result-card"><span>ممان اینرسی Iy</span><strong>${fmt(p.Iy * 1e8)} cm⁴</strong></div>
            <div class="result-card"><span>مدول مقطع بالا Sx</span><strong>${fmt(p.SxTop * 1e6)} cm³</strong></div>
            <div class="result-card"><span>مدول مقطع پایین Sx</span><strong>${fmt(p.SxBottom * 1e6)} cm³</strong></div>
            <div class="result-card"><span>مدول مقطع ضعیف Sy</span><strong>${fmt(p.Sy * 1e6)} cm³</strong></div>
            <div class="result-card"><span>شعاع ژیراسیون rx</span><strong>${fmt(p.rx * 100)} cm</strong></div>
            <div class="result-card"><span>شعاع ژیراسیون ry</span><strong>${fmt(p.ry * 100)} cm</strong></div>
            <div class="result-card"><span>ارتفاع کل</span><strong>${fmt(p.totalHeight * 1000, 1)} mm</strong></div>
            <div class="result-card"><span>وزن هر متر</span><strong>${fmt(p.massPerMeter)} kg/m</strong></div>
        `;
    }

    function calculate(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        try {
            const dimensions = readDimensions(member);
            const properties = calculateProperties(dimensions);

            members[member].result = { dimensions, properties };
            showResults(member, properties);

            $(prefix + "Message").textContent =
                "محاسبه تیرورق " + members[member].title + " موفق بود.";
            $(prefix + "Message").style.color = "#15803d";
        } catch (error) {
            members[member].result = null;
            $(prefix + "Results").innerHTML = "";
            $(prefix + "Message").textContent = "خطا: " + error.message;
            $(prefix + "Message").style.color = "#b45309";
        }
    }

    function transfer(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";
        const target = member;
        const title = members[member].title;

        try {
            const result = members[member].result;
            if (!result) {
                throw new Error("ابتدا تیرورق " + title + " را محاسبه کنید.");
            }

            if (!window.SteelSections) {
                throw new Error("ماژول مشخصات مقاطع در دسترس نیست.");
            }

            const p = result.properties;
            const values = {
                A: p.A * 1e4,
                Ix: p.Ix * 1e8,
                Iy: p.Iy * 1e8,
                SxTop: p.SxTop * 1e6,
                SxBottom: p.SxBottom * 1e6,
                Sy: p.Sy * 1e6
            };

            const fields = {
                Profile: "تیرورق " + title,
                A: values.A,
                Ix: values.Ix,
                Iy: values.Iy,
                SxTop: values.SxTop,
                SxBottom: values.SxBottom,
                Sy: values.Sy
            };

            for (const [suffix, value] of Object.entries(fields)) {
                const element = $(target + suffix);
                if (!element) {
                    throw new Error("فیلد " + suffix + " برای " + title + " پیدا نشد.");
                }
                element.value = typeof value === "number" ? value.toFixed(2) : value;
            }

            members[member].transferred = true;

            $(prefix + "Message").textContent =
                "انتقال مشخصات تیرورق " + title + " با موفقیت انجام شد.";
            $(prefix + "Message").style.color = "#15803d";

        } catch (error) {
            $(prefix + "Message").textContent = "خطا در انتقال: " + error.message;
            $(prefix + "Message").style.color = "#b45309";
        }
    }

    function init() {
        createPanel();
    }

    window.SteelGirder = {
        readDimensions,
        calculateProperties,
        calculate,
        transfer,
        members
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
