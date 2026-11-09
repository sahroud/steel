/* SAHROUD STEEL - Independent Girders and Stability Inputs */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const DENSITY = 7850;

    const members = {
        column: { title: "ستون", result: null },
        rafter: { title: "رفتر", result: null }
    };

    function stabilityFields(prefix, title) {
        return `
            <h4>مشخصات پایداری ${title}</h4>
            <div class="form-grid">
                <div class="field">
                    <label>طول مهارنشده محور قوی Lx (m)</label>
                    <input id="${prefix}Lx" type="number"
                        min="0.01" step="0.01" placeholder="مثلاً 3">
                </div>
                <div class="field">
                    <label>طول مهارنشده محور ضعیف Ly (m)</label>
                    <input id="${prefix}Ly" type="number"
                        min="0.01" step="0.01" placeholder="مثلاً 3">
                </div>
                <div class="field">
                    <label>ضریب طول مؤثر Kx</label>
                    <input id="${prefix}Kx" type="number"
                        min="0.01" step="0.01" placeholder="ورود ضریب">
                </div>
                <div class="field">
                    <label>ضریب طول مؤثر Ky</label>
                    <input id="${prefix}Ky" type="number"
                        min="0.01" step="0.01" placeholder="ورود ضریب">
                </div>
            </div>
        `;
    }

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

            ${stabilityFields(prefix, title)}

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
                تمام ابعاد تیرورق بر حسب میلی‌متر و طول‌های مهارنشده بر حسب متر هستند.
            </div>

            ${fields("colGirder", "۱ ـ تیرورق ستون", [500, 8, 200, 12, 200, 12])}

            <hr>

            ${fields("rafGirder", "۲ ـ تیرورق رفتر", [400, 8, 180, 10, 180, 10])}

            <div class="notice">
                طول مهارنشده و ضرایب K باید بر اساس وضعیت واقعی مهاربندی،
                شرایط اتصال و رفتار قاب تعیین شوند.
                وارد کردن این اطلاعات به‌تنهایی به معنی تأیید پایداری عضو نیست.
            </div>
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

    function readStability(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        function readOptional(id) {
            const el = $(id);
            if (!el || el.value.trim() === "") return null;

            const value = Number(el.value);
            return Number.isFinite(value) ? value : null;
        }

        return {
            Lx: readOptional(prefix + "Lx"),
            Ly: readOptional(prefix + "Ly"),
            Kx: readOptional(prefix + "Kx"),
            Ky: readOptional(prefix + "Ky")
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
                Profile: "تیرورق " + title,
                A: p.A * 1e4,
                Ix: p.Ix * 1e8,
                Iy: p.Iy * 1e8,
                SxTop: p.SxTop * 1e6,
                SxBottom: p.SxBottom * 1e6,
                Sy: p.Sy * 1e6
            };

            for (const [suffix, value] of Object.entries(values)) {
                const element = $(member + suffix);

                if (!element) {
                    throw new Error("فیلد " + suffix + " برای " + title + " پیدا نشد.");
                }

                element.value =
                    typeof value === "number" ? value.toFixed(2) : value;
            }

            members[member].transferred = true;

            $(prefix + "Message").textContent =
                "انتقال مشخصات تیرورق " + title + " با موفقیت انجام شد.";
            $(prefix + "Message").style.color = "#15803d";

        } catch (error) {
            $(prefix + "Message").textContent =
                "خطا در انتقال: " + error.message;
            $(prefix + "Message").style.color = "#b45309";
        }
    }

    // ذخیره ابعاد و اطلاعات پایداری
    function getData() {
        return {
            column: readDimensions("column"),
            rafter: readDimensions("rafter"),
            stability: {
                column: readStability("column"),
                rafter: readStability("rafter")
            }
        };
    }

    // بازیابی ابعاد و اطلاعات پایداری
    function setData(data) {
        if (!data || typeof data !== "object") return;

        ["column", "rafter"].forEach(member => {
            const dimensions = data[member];

            if (dimensions && typeof dimensions === "object") {
                const prefix = member === "column" ? "colGirder" : "rafGirder";

                const mapping = {
                    hw: "WebH",
                    tw: "WebT",
                    bb: "BottomB",
                    tb: "BottomT",
                    bt: "TopB",
                    tt: "TopT"
                };

                Object.entries(mapping).forEach(([key, suffix]) => {
                    const el = $(prefix + suffix);

                    if (el && dimensions[key] !== undefined) {
                        el.value = dimensions[key];
                    }
                });

                calculate(member);
            }

            const stability = data.stability?.[member];

            if (stability && typeof stability === "object") {
                const prefix = member === "column" ? "colGirder" : "rafGirder";

                ["Lx", "Ly", "Kx", "Ky"].forEach(key => {
                    const el = $(prefix + key);

                    if (el && stability[key] !== undefined &&
                        stability[key] !== null) {
                        el.value = stability[key];
                    }
                });
            }
        });
    }

    function validateStability(member) {
        const values = readStability(member);

        const labels = {
            Lx: "طول مهارنشده محور قوی",
            Ly: "طول مهارنشده محور ضعیف",
            Kx: "ضریب طول مؤثر محور قوی",
            Ky: "ضریب طول مؤثر محور ضعیف"
        };

        for (const key of Object.keys(labels)) {
            if (values[key] === null || values[key] <= 0) {
                return labels[key] + " " + members[member].title +
                    " وارد نشده یا نامعتبر است.";
            }
        }

        return "";
    }

    function init() {
        createPanel();
    }

    window.SteelGirder = {
        readDimensions,
        readStability,
        calculateProperties,
        calculate,
        transfer,
        getData,
        setData,
        validateStability,
        members
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();