/* ===== steel2/js/roof-purlins.js ===== */

/* SAHROUD STEEL - Roof Purlins Module 1.2
   Preliminary Z and RHS purlin selection
   Units: kN, m, mm, MPa
   Not a final code design.
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const defaults = {
        family: "auto",
        pitchMin: 0.60,
        pitchMax: 1.50,
        pitchStep: 0.10,
        pitch: 0.95,
        sectionHeight: 180,
        flange: 60,
        lip: 20,
        thickness: 2.5,
        rhsWidth: 80,
        rhsHeight: 160,
        rhsThickness: 3,
        fy: 240,
        e: 200000,
        deflectionLimit: 180
    };

    let lastResult = null;

    function num(id, fallback) {
        const el = $(id);
        if (!el || el.value === "" || el.value === null || el.value === undefined) return fallback;
        const n = Number(el.value);
        return Number.isFinite(n) ? n : fallback;
    }

    function fmt(v, digits = 2) {
        if (!Number.isFinite(v)) return "—";
        return v.toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function getGeometry() {
        const span = num("span", null);
        const rise = num("rise", null);
        const spacing = num("spacing", null);
        const length = num("length", null);

        const half = span / 2;
        const baseSlopeLength = Math.sqrt(
            half * half + rise * rise
        );

        // پیش‌آمدگی‌ها باید برای همین پروژه صریحاً ثبت شوند.
        const sideOverhang = num("purlinSideOverhang", null);
        const endOverhang = num("purlinEndOverhang", null);
        const slopeLength = sideOverhang === null ? null : baseSlopeLength + sideOverhang;
        const roofLength = endOverhang === null ? null : length + 2 * endOverhang;
        const angle = Math.atan2(rise, half);

        return {
            span,
            rise,
            spacing,
            length,
            baseSlopeLength,
            slopeLength,
            roofLength,
            sideOverhang,
            endOverhang,
            angle,
            cos: Math.cos(angle),
            frames: Math.ceil(length / spacing) + 1
        };
    }

    function getLoads() {
        let d = {
            deadLeft: num("dead", 0.5),
            deadRight: num("dead", 0.5),
            liveLeft: num("live", 0.75),
            liveRight: num("live", 0.75),
            snowLeft: num("snow", 0),
            snowRight: num("snow", 0),
            windLeft: num("wind", 0),
            windRight: num("wind", 0)
        };

        if (window.SteelLoads &&
            typeof window.SteelLoads.getData === "function") {
            const x = window.SteelLoads.getData();
            d = Object.assign(d, x || {});
        }

        return d;
    }

    function rectangle(b, h, x, y) {
        return {
            b: b,
            h: h,
            x: x,
            y: y,
            area: b * h
        };
    }

    function propertiesFromRectangles(parts) {
        let area = 0;
        let sx = 0;
        let sy = 0;

        parts.forEach(p => {
            area += p.area;
            sx += p.area * p.x;
            sy += p.area * p.y;
        });

        const cx = sx / area;
        const cy = sy / area;

        let ix = 0;
        let iy = 0;

        parts.forEach(p => {
            ix += p.b * Math.pow(p.h, 3) / 12 +
                p.area * Math.pow(p.y - cy, 2);

            iy += p.h * Math.pow(p.b, 3) / 12 +
                p.area * Math.pow(p.x - cx, 2);
        });

        const maxY = Math.max(
            ...parts.map(p => Math.abs(p.y - cy) + p.h / 2)
        );

        return {
            area,
            cx,
            cy,
            ix,
            iy,
            wx: ix / Math.max(1, maxY),
            weight: area * 0.00785
        };
    }

    function zProperties(h, b, lip, t) {
        const parts = [
            rectangle(t, h, 0, 0),

            rectangle(
                b, t,
                t / 2 + b / 2,
                h / 2 - t / 2
            ),

            rectangle(
                b, t,
                -t / 2 - b / 2,
                -h / 2 + t / 2
            ),

            rectangle(
                t, lip,
                b + t / 2,
                h / 2 - t - lip / 2
            ),

            rectangle(
                t, lip,
                -b - t / 2,
                -h / 2 + t + lip / 2
            )
        ];

        return propertiesFromRectangles(parts);
    }

    function rhsProperties(b, h, t) {
        const parts = [
            rectangle(b, t, 0, h / 2 - t / 2),
            rectangle(b, t, 0, -h / 2 + t / 2),
            rectangle(t, h - 2 * t, -b / 2 + t / 2, 0),
            rectangle(t, h - 2 * t, b / 2 - t / 2, 0)
        ];

        return propertiesFromRectangles(parts);
    }

    function makeSections(family) {
        const result = [];

        const zHeights = [160, 180, 200, 220, 240];
        const zFlanges = [50, 60, 65, 70];
        const zThickness = [2, 2.5, 3, 3.5];

        const rhsSizes = [
            [60, 120],
            [80, 120],
            [80, 140],
            [80, 160],
            [100, 150],
            [100, 200],
            [120, 200],
            [100, 250]
        ];

        if (family === "auto" || family === "z") {
            zHeights.forEach(h => {
                zFlanges.forEach(b => {
                    zThickness.forEach(t => {
                        const lip = Math.min(25, b * 0.35);
                        const p = zProperties(h, b, lip, t);

                        result.push({
                            family: "Z",
                            name: `Z ${h}×${b}×${lip}×${t}`,
                            h, b, lip, t,
                            ...p
                        });
                    });
                });
            });
        }

        if (family === "auto" || family === "rhs") {
            rhsSizes.forEach(([b, h]) => {
                [2, 2.5, 3, 3.5, 4].forEach(t => {
                    if (2 * t >= Math.min(b, h)) return;

                    const p = rhsProperties(b, h, t);

                    result.push({
                        family: "RHS",
                        name: `قوطی ${b}×${h}×${t}`,
                        b, h, t,
                        ...p
                    });
                });
            });
        }

        return result;
    }

    function calculateOne(section, pitch, side, g, loads, settings) {
        const suffix = side === "left" ? "Left" : "Right";
        const dead = Number(loads["dead" + suffix]) || 0;
        const live = Number(loads["live" + suffix]) || 0;
        const snow = Number(loads["snow" + suffix]) || 0;
        const windSigned = Number(loads["wind" + suffix]) || 0;
        const windDirection = loads.windDirection || "not-specified";
        const gravity = dead + live + snow;

        const L = g.spacing * 1000;
        // Gravity loads are vertical pressure per horizontal projected area.
        // Wind inputs are net pressure normal to the roof surface (loads.js:
        // inward positive, suction negative), so wind uses full roof tributary width.
        function evaluateCase(type, pressure) {
            const isWind = type === "wind" || type === "wind-reverse";
            const tributaryFactor = isWind ? 1 : g.cos * g.cos;
            const qLine = pressure * pitch * (isWind ? 1 : g.cos);
            const qNormal = pressure * pitch * tributaryFactor;
            const M = qNormal * L * L / 8;
            const V = qNormal * L / 2;
            const stress = Math.abs(M) / Math.max(section.wx, 0.001);
            const shearStress = 1.5 * Math.abs(V) / Math.max(section.area, 0.001);
            const deflection = 5 * qNormal * Math.pow(L, 4) /
                (384 * settings.e * Math.max(section.ix, 1));
            const allowableDeflection = L / settings.deflectionLimit;
            const bendingOK = stress <= settings.fy;
            const shearOK = shearStress <= settings.fy / 2;
            const deflectionOK = Math.abs(deflection) <= allowableDeflection;
            return {
                id: side + "-" + type, type, pressure, qLine, qNormal,
                M, V, stress, shearStress, deflection, allowableDeflection,
                bendingOK, shearOK, deflectionOK,
                ok: bendingOK && shearOK && deflectionOK
            };
        }

        const gravityCase = evaluateCase("gravity", gravity);
        const windCase = evaluateCase("wind", windSigned);
        const reverseWindCase = evaluateCase("wind-reverse", -windSigned);
        const cases = [gravityCase, windCase, reverseWindCase];
        const governing = cases.reduce((a, b) =>
            Math.max(a.stress, a.shearStress, Math.abs(a.deflection)) >=
            Math.max(b.stress, b.shearStress, Math.abs(b.deflection)) ? a : b
        );
        const purlinCountPerSlope = Math.ceil(g.slopeLength / pitch) + 1;
        const weightPerSlope = section.weight * g.roofLength * purlinCountPerSlope;

        return {
            side, gravity, wind: Math.abs(windSigned), windSigned, windDirection,
            loadCases: cases,
            gravityCase, windCase, reverseWindCase, governingCase: governing.type,
            surfaceEnvelope: Math.max(Math.abs(gravity), Math.abs(windSigned)),
            qLine: governing.qLine, qNormal: governing.qNormal,
            M: governing.M, V: governing.V,
            stress: Math.max(...cases.map(x => x.stress)),
            shearStress: Math.max(...cases.map(x => x.shearStress)),
            deflection: cases.reduce((a,b)=>Math.abs(a.deflection)>=Math.abs(b.deflection)?a:b).deflection,
            allowableDeflection: governing.allowableDeflection,
            bendingOK: cases.every(x=>x.bendingOK),
            shearOK: cases.every(x=>x.shearOK),
            deflectionOK: cases.every(x=>x.deflectionOK),
            ok: cases.every(x=>x.ok),
            weightPerSlope
        };
    }

    function readSettings() {
        return {
            family: $("purlinFamily")?.value || defaults.family,

            pitchMin: num(
                "purlinPitchMin", defaults.pitchMin
            ),

            pitchMax: num(
                "purlinPitchMax", defaults.pitchMax
            ),

            pitchStep: num(
                "purlinPitchStep", defaults.pitchStep
            ),

            pitch: num(
                "purlinPitch", defaults.pitch
            ),

            fy: num("purlinFy", defaults.fy),
            e: num("purlinE", defaults.e),

            deflectionLimit: num(
                "purlinDeflectionLimit",
                defaults.deflectionLimit
            ),

            sectionHeight: num(
                "purlinZHeight",
                defaults.sectionHeight
            ),

            flange: num(
                "purlinZFlange",
                defaults.flange
            ),

            lip: num("purlinZLip", defaults.lip),

            thickness: num(
                "purlinZThickness",
                defaults.thickness
            ),

            rhsWidth: num(
                "purlinRhsWidth",
                defaults.rhsWidth
            ),

            rhsHeight: num(
                "purlinRhsHeight",
                defaults.rhsHeight
            ),

            rhsThickness: num(
                "purlinRhsThickness",
                defaults.rhsThickness
            )
        };
    }

    function validate(s, g) {
        if (![g.span, g.rise, g.spacing, g.length, g.sideOverhang, g.endOverhang].every(Number.isFinite) ||
            g.span <= 0 || g.rise < 0 || g.spacing <= 0 || g.length <= 0 ||
            g.sideOverhang < 0 || g.endOverhang < 0 || !Number.isFinite(g.slopeLength) || g.slopeLength <= 0) {
            return "مشخصات هندسی سقف معتبر نیست.";
        }

        if (
            s.pitchMin <= 0 ||
            s.pitchMax < s.pitchMin ||
            s.pitchStep <= 0
        ) {
            return "بازه فاصله پرلین‌ها معتبر نیست.";
        }

        if (
            s.fy <= 0 ||
            s.e <= 0 ||
            s.deflectionLimit < 100
        ) {
            return "مشخصات مصالح یا حد خیز معتبر نیست.";
        }

        if (s.pitch <= 0) {
            return "فاصله انتخابی پرلین باید مثبت باشد.";
        }
        const loads = getLoads();
        const loadKeys = ["deadLeft","deadRight","liveLeft","liveRight","snowLeft","snowRight","windLeft","windRight"];
        if (!loadKeys.every(k => loads[k] !== null && loads[k] !== undefined && Number.isFinite(Number(loads[k])))) {
            return "اطلاعات بارگذاری کامل نیست؛ بار هر دو شیب را صریحاً مشخص کنید.";
        }
        if (!Number.isFinite(g.roofLength) || !Number.isFinite(g.frames)) {
            return "هندسه کامل سقف و پیش‌آمدگی‌ها در دسترس نیست.";
        }
        return "";
    }

    function optimize() {
        const g = getGeometry();
        const loads = getLoads();
        const s = readSettings();

        const error = validate(s, g);

        if (error) {
            lastResult = null;
            window.SteelRoofPurlins.lastResult = null;
            const out = $("purlinResults");
            if (out) out.textContent = "اطلاعات ناکافی — " + error + " نتیجه قبلی معتبر نیست.";
            return { status: "insufficient_data", reason: error };
        }

        const sections = makeSections(s.family);
        const candidates = [];

        for (
            let pitch = s.pitchMin;
            pitch <= s.pitchMax + 0.0001;
            pitch += s.pitchStep
        ) {
            for (const section of sections) {
                const left = calculateOne(
                    section, pitch, "left", g, loads, s
                );

                const right = calculateOne(
                    section, pitch, "right", g, loads, s
                );

                const ok = left.ok && right.ok;

                candidates.push({
                    section,
                    pitch,
                    left,
                    right,
                    ok,
                    weight:
                        left.weightPerSlope +
                        right.weightPerSlope
                });
            }
        }

        const valid = candidates
            .filter(x => x.ok)
            .sort((a, b) => a.weight - b.weight);

        const best = valid[0] || null;

        const result = {
            geometry: g,
            loads,
            settings: s,
            best,
            candidates,
            validCount: valid.length
        };

        lastResult = result;
        window.SteelRoofPurlins.lastResult = result;

        showResults(result);
        return result;
    }

    function showResults(r) {
        const el = $("purlinResults");
        if (!el) return;

        const b = r.best;

        if (!b) {
            el.innerHTML = `
                <h4>نتیجه جست‌وجو</h4>
                <p>
                    در بازه فعلی هیچ ترکیب مقطع و فاصله‌ای
                    از کنترل‌های مقدماتی عبور نکرد.
                </p>
                <p>
                    بازه فاصله یا مشخصات مقاطع را بررسی کنید.
                </p>
            `;
            return;
        }

        const s = b.section;
        const left = b.left;
        const right = b.right;

        const maxStress = Math.max(
            Math.abs(left.stress), Math.abs(right.stress)
        );

        const maxShear = Math.max(
            left.shearStress, right.shearStress
        );

        const maxDef = Math.max(
            Math.abs(left.deflection), Math.abs(right.deflection)
        );

        const maxM = Math.max(
            Math.abs(left.M), Math.abs(right.M)
        );

        const maxV = Math.max(
            Math.abs(left.V), Math.abs(right.V)
        );

        const countPerSlope =
            Math.ceil(r.geometry.slopeLength / b.pitch) + 1;

        const totalCount = countPerSlope * 2;

        const totalWeight = b.weight;

        el.innerHTML = `
            <h4>نتایج پیشنهاد مقدماتی</h4>

            <div class="result-card">
                <span>مقطع پیشنهادی</span>
                <strong>${s.name}</strong>
            </div>

            <div class="result-card">
                <span>پیش‌آمدگی جانبی سقف در امتداد شیب (هر طرف)</span>
                <strong>${fmt(r.geometry.sideOverhang, 2)} متر</strong>
            </div>

            <div class="result-card">
                <span>پیش‌آمدگی طولی سقف (ابتدا و انتها)</span>
                <strong>${fmt(r.geometry.endOverhang, 2)} متر در هر انتها</strong>
            </div>

            <div class="result-card">
                <span>طول کل سقف در امتداد سوله با پیش‌آمدگی‌ها</span>
                <strong>${fmt(r.geometry.roofLength, 2)} متر</strong>
            </div>

            <div class="result-card">
                <span>فاصله پیشنهادی روی شیب</span>
                <strong>${fmt(b.pitch, 2)} متر</strong>
            </div>

            <div class="result-card">
                <span>وزن تقریبی هر متر مقطع</span>
                <strong>${fmt(s.weight, 2)} kg/m</strong>
            </div>

            <div class="result-card">
                <span>مساحت مقطع هندسی تقریبی</span>
                <strong>${fmt(s.area, 1)} mm²</strong>
            </div>

            <div class="result-card">
                <span>بیشینه لنگر خمشی</span>
                <strong>${fmt(maxM / 1000000, 3)} kN.m</strong>
            </div>

            <div class="result-card">
                <span>بیشینه نیروی برشی</span>
                <strong>${fmt(maxV / 1000, 2)} kN</strong>
            </div>

            <div class="result-card">
                <span>تنش خمشی تقریبی</span>
                <strong>${fmt(maxStress, 1)} MPa</strong>
            </div>

            <div class="result-card">
                <span>تنش برشی تقریبی</span>
                <strong>${fmt(maxShear, 1)} MPa</strong>
            </div>

            <div class="result-card">
                <span>بیشینه خیز</span>
                <strong>${fmt(maxDef, 2)} mm</strong>
            </div>

            <div class="result-card">
                <span>حد خیز فرض‌شده</span>
                <strong>${fmt(
                    left.allowableDeflection, 2
                )} mm</strong>
            </div>

            <div class="result-card">
                <span>تعداد تقریبی پرلین در هر شیب</span>
                <strong>${countPerSlope}</strong>
            </div>

            <div class="result-card">
                <span>تعداد تقریبی کل دو شیب</span>
                <strong>${totalCount}</strong>
            </div>

            <div class="result-card">
                <span>وزن تقریبی کل دو شیب</span>
                <strong>${fmt(totalWeight, 1)} kg</strong>
            </div>

            <div class="notice">
                <b>تعداد گزینه‌های عبورکرده از کنترل‌های مقدماتی:</b>
                ${r.validCount}
                <br>
                <b>مبنای انتخاب:</b>
                کمترین وزن تقریبی در بین گزینه‌های عبورکرده.
                <br>
                باد با علامت و جدا از ثقلی ـ شیب چپ: ${fmt(left.windSigned, 3)} kN/m²
                | شیب راست: ${fmt(right.windSigned, 3)} kN/m²
                <br>حالت حاکم چپ/راست: ${left.governingCase} / ${right.governingCase}
                <br>
                جهت ثبت‌شده: ${left.windDirection === "left-to-right" ? "چپ به راست" : left.windDirection === "right-to-left" ? "راست به چپ" : "تعیین‌نشده"}.
                تفسیر فیزیکی علامت و ترکیب آیین‌نامه‌ای هنوز انجام نشده است.
            </div>
        `;

        $("purlinWarning").innerHTML = `
            <b>محدودیت‌های مهندسی این نسخه</b>
            <ul>
                <li>
                    خواص Z از مدل هندسی ساده صفحات محاسبه شده‌اند؛
                    کاتالوگ واقعی سازنده نیستند.
                </li>
                <li>
                    خواص قوطی هندسی و تقریبی هستند و گوشه‌های گرد
                    و تلرانس ساخت در آن‌ها لحاظ نشده است.
                </li>
                <li>
                    بار مرده/زنده/برف با فرض فشار قائم بر مبنای سطح افقی و بار باد با فرض فشار خالص عمود بر سطح شیب‌دار تبدیل شده‌اند؛ اگر مبنای سطح ورودی متفاوت باشد، این تبدیل معتبر نیست.
                </li>
                <li>
                    بار باد و بار ثقلی به‌صورت پوش ساده بررسی شده‌اند؛
                    ترکیبات بار آیین‌نامه‌ای کامل نیستند.
                </li>
                <li>
                    کمانش موضعی، کمانش پیچشی، اعوجاج مقطع،
                    پیچش خارج از مرکز و اتصالات کنترل نشده‌اند.
                </li>
                <li>
                    مهار جانبی بال فشاری و عملکرد دیافراگمی سقف
                    در محاسبات منظور نشده‌اند.
                </li>
                <li>
                    پیش‌آمدگی‌های ۸۰ سانتی‌متری در هندسه و برآورد تعداد و وزن
                    پرلین‌ها منظور شده‌اند؛ اما کنترل سازه‌ای طره‌ها، تیرهای
                    کنسولی، اتصالات و مکش باد هنوز به‌صورت مستقل انجام نشده است.
                </li>
                <li>
                    مدل ساده فعلی، پرلین را در دهانه بین قاب‌ها بررسی می‌کند؛
                    اثر کنسول ۸۰ سانتی‌متری ابتدا و انتهای طولی و نیز تکیه‌گاه
                    واقعی پیش‌آمدگی جانبی باید در مرحله تحلیل سازه‌ای کنترل شود.
                </li>
                <li>
                    مکش باد، بار برف نامتقارن و جهت واقعی بارها
                    نیازمند بررسی مستقل هستند.
                </li>
            </ul>
            <b>
                این خروجی پیشنهاد مقدماتی است و تأیید طراحی اجرایی نیست.
            </b>
        `;
    }

    function applyManual() {
        const s = readSettings();
        const g = getGeometry();

        const error = validate(s, g);

        if (error) {
            lastResult = null;
            window.SteelRoofPurlins.lastResult = null;
            const out = $("purlinResults");
            if (out) out.textContent = "اطلاعات ناکافی — " + error + " نتیجه قبلی معتبر نیست.";
            return { status: "insufficient_data", reason: error };
        }

        let section;

        if (s.family === "rhs") {
            section = {
                family: "RHS",
                name:
                    `قوطی ${s.rhsWidth}×${s.rhsHeight}×${s.rhsThickness}`,
                ...rhsProperties(
                    s.rhsWidth,
                    s.rhsHeight,
                    s.rhsThickness
                )
            };
        } else {
            section = {
                family: "Z",
                name:
                    `Z ${s.sectionHeight}×${s.flange}×${s.lip}×${s.thickness}`,
                ...zProperties(
                    s.sectionHeight,
                    s.flange,
                    s.lip,
                    s.thickness
                )
            };
        }

        const loads = getLoads();

        const left = calculateOne(
            section, s.pitch, "left", g, loads, s
        );

        const right = calculateOne(
            section, s.pitch, "right", g, loads, s
        );

        const item = {
            section,
            pitch: s.pitch,
            left,
            right,
            ok: left.ok && right.ok,
            weight:
                left.weightPerSlope +
                right.weightPerSlope
        };

        const result = {
            geometry: g,
            loads,
            settings: s,
            best: item,
            validCount: item.ok ? 1 : 0
        };

        lastResult = result;
        window.SteelRoofPurlins.lastResult = result;

        showResults(result);
    }

    function panelHTML() {
        return `
        <section class="panel" id="roofPurlinsPanel">

            <div class="panel-title">
                <h3>۱۳ ـ طراحی مقدماتی پرلین‌های سقف</h3>
                <span class="status">پیشنهاد خودکار Z و قوطی</span>
            </div>

            <div class="notice">
                نرم‌افزار فاصله پرلین‌ها و مقطع مناسب را
                بر اساس هندسه سقف و بارهای واردشده پیشنهاد می‌کند.
                انتخاب دستی نیز امکان‌پذیر است.
            </div>

            <h4>۱ ـ روش انتخاب مقطع</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="purlinFamily">خانواده مقطع</label>
                    <select id="purlinFamily">
                        <option value="auto">مقایسه Z و قوطی</option>
                        <option value="z">فقط پرلین Z</option>
                        <option value="rhs">فقط قوطی مستطیلی</option>
                    </select>
                </div>

                <div class="field">
                    <label for="purlinDeflectionLimit">
                        حد خیز L تقسیم بر
                    </label>
                    <select id="purlinDeflectionLimit">
                        <option value="180">۱۸۰</option>
                        <option value="200">۲۰۰</option>
                        <option value="240">۲۴۰</option>
                        <option value="300">۳۰۰</option>
                    </select>
                </div>
            </div>

            <h4>۲ ـ بازه جست‌وجوی فاصله پرلین‌ها</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="purlinPitchMin">
                        حداقل فاصله (متر)
                    </label>
                    <input id="purlinPitchMin"
                        type="number" min="0.3"
                        step="0.05" value="0.60">
                </div>

                <div class="field">
                    <label for="purlinPitchMax">
                        حداکثر فاصله (متر)
                    </label>
                    <input id="purlinPitchMax"
                        type="number" min="0.4"
                        step="0.05" value="1.50">
                </div>

                <div class="field">
                    <label for="purlinPitchStep">
                        گام جست‌وجو (متر)
                    </label>
                    <input id="purlinPitchStep"
                        type="number" min="0.05"
                        step="0.05" value="0.10">
                </div>

                <div class="field">
                    <label for="purlinPitch">
                        فاصله انتخاب دستی (متر)
                    </label>
                    <input id="purlinPitch"
                        type="number" min="0.3"
                        step="0.05" value="1.00">
                </div>
            </div>

            <h4>۳ ـ مشخصات مقطع Z</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="purlinZHeight">
                        ارتفاع جان Z (mm)
                    </label>
                    <input id="purlinZHeight"
                        type="number" min="80" value="180">
                </div>

                <div class="field">
                    <label for="purlinZFlange">
                        عرض بال Z (mm)
                    </label>
                    <input id="purlinZFlange"
                        type="number" min="20" value="60">
                </div>

                <div class="field">
                    <label for="purlinZLip">
                        لبه برگشتی (mm)
                    </label>
                    <input id="purlinZLip"
                        type="number" min="5" value="20">
                </div>

                <div class="field">
                    <label for="purlinZThickness">
                        ضخامت Z (mm)
                    </label>
                    <input id="purlinZThickness"
                        type="number" min="1"
                        step="0.1" value="2.5">
                </div>
            </div>

            <h4>۴ ـ مشخصات قوطی مستطیلی</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="purlinRhsWidth">
                        عرض قوطی (mm)
                    </label>
                    <input id="purlinRhsWidth"
                        type="number" min="20" value="80">
                </div>

                <div class="field">
                    <label for="purlinRhsHeight">
                        ارتفاع قوطی (mm)
                    </label>
                    <input id="purlinRhsHeight"
                        type="number" min="20" value="160">
                </div>

                <div class="field">
                    <label for="purlinRhsThickness">
                        ضخامت قوطی (mm)
                    </label>
                    <input id="purlinRhsThickness"
                        type="number" min="1"
                        step="0.1" value="3">
                </div>
            </div>

            <h4>۵ ـ پیش‌آمدگی‌های سقف (ورودی اجباری پروژه)</h4>
            <div class="form-grid">
                <div class="field"><label for="purlinSideOverhang">پیش‌آمدگی جانبی در امتداد شیب، هر طرف (m)</label><input id="purlinSideOverhang" type="number" min="0" step="0.01" placeholder="مقدار واقعی پروژه"></div>
                <div class="field"><label for="purlinEndOverhang">پیش‌آمدگی طولی ابتدا و انتها، هر طرف (m)</label><input id="purlinEndOverhang" type="number" min="0" step="0.01" placeholder="مقدار واقعی پروژه"></div>
            </div>
            <h4>۶ ـ مشخصات مصالح</h4>

            <div class="form-grid">
                <div class="field">
                    <label for="purlinFy">
                        تنش تسلیم Fy (MPa)
                    </label>
                    <input id="purlinFy"
                        type="number" min="100" value="240">
                </div>

                <div class="field">
                    <label for="purlinE">
                        مدول الاستیسیته E (MPa)
                    </label>
                    <input id="purlinE"
                        type="number" min="100000"
                        value="200000">
                </div>
            </div>

            <div class="button-grid">
                <button id="btnOptimizePurlins"
                    class="btn primary" type="button">
                    پیشنهاد خودکار فاصله و مقطع
                </button>

                <button id="btnManualPurlins"
                    class="btn secondary" type="button">
                    محاسبه مقطع انتخابی من
                </button>
            </div>

            <div id="purlinResults" class="notice">
                ابتدا هندسه و بارگذاری پروژه را تکمیل کنید؛
                سپس پیشنهاد خودکار را اجرا کنید.
            </div>

            <div id="purlinWarning" class="notice">
                نتایج این بخش مقدماتی هستند.
            </div>

        </section>
        `;
    }

    function createPanel() {
        if ($("roofPurlinsPanel")) return;

        const main = document.querySelector("main");
        if (!main) return;

        // Keep this generated panel inside the main content, before the footer.
        const footer = main.querySelector("footer");
        if (footer) footer.insertAdjacentHTML("beforebegin", panelHTML());
        else main.insertAdjacentHTML("beforeend", panelHTML());

        $("btnOptimizePurlins").addEventListener(
            "click", optimize
        );

        $("btnManualPurlins").addEventListener(
            "click", applyManual
        );

        const shortcut = $("btnOpenRoofPurlins");
        if (shortcut) shortcut.addEventListener("click", () => {
            const panel = $("roofPurlinsPanel");
            if (panel) panel.scrollIntoView({behavior:"smooth", block:"start"});
        });
    }

    function getData() {
        return Object.assign({}, readSettings(), {
            sideOverhang: num("purlinSideOverhang", null),
            endOverhang: num("purlinEndOverhang", null)
        });
    }

    function setData(data) {
        if (!data || typeof data !== "object") return;

        const map = {
            sideOverhang: "purlinSideOverhang",
            endOverhang: "purlinEndOverhang",
            family: "purlinFamily",
            pitchMin: "purlinPitchMin",
            pitchMax: "purlinPitchMax",
            pitchStep: "purlinPitchStep",
            pitch: "purlinPitch",
            fy: "purlinFy",
            e: "purlinE",
            deflectionLimit: "purlinDeflectionLimit",
            sectionHeight: "purlinZHeight",
            flange: "purlinZFlange",
            lip: "purlinZLip",
            thickness: "purlinZThickness",
            rhsWidth: "purlinRhsWidth",
            rhsHeight: "purlinRhsHeight",
            rhsThickness: "purlinRhsThickness"
        };

        Object.entries(map).forEach(([key, id]) => {
            const el = $(id);

            if (el && data[key] !== undefined) {
                el.value = data[key];
            }
        });
    }

    function selfTest() {
        const checks = [];
        const check = (name, pass) => checks.push({ name, pass: !!pass });
        check("missing numeric input remains missing", num("__missing_purlin_input__", null) === null);
        check("blank numeric input remains missing", (() => { const el = document.createElement("input"); el.id = "__blank_purlin_input__"; el.value = ""; document.body.appendChild(el); try { return num(el.id, null) === null; } finally { el.remove(); } })());
        check("project overhangs are not hard-coded", !/const\\s+(?:sideOverhang|endOverhang)\\s*=\\s*0\\.8/.test(getGeometry.toString()));
        const sampleSection={area:1200,wx:50000,ix:8e6,weight:9};
        const sampleGeometry={spacing:6,roofLength:36,slopeLength:12,cos:0.5};
        const sampleSettings={e:200000,deflectionLimit:180,fy:240};
        const sampleLoads={deadLeft:1,liveLeft:0,snowLeft:0,windLeft:1,deadRight:1,liveRight:0,snowRight:0,windRight:1,windDirection:"left-to-right"};
        const projected=calculateOne(sampleSection,1.2,"left",sampleGeometry,sampleLoads,sampleSettings);
        check("vertical gravity load uses plan-area and member-normal projections",Math.abs(projected.gravityCase.qNormal-0.3)<1e-12);
        check("roof-normal wind pressure uses full roof-surface tributary width",Math.abs(projected.windCase.qNormal-1.2)<1e-12);
        check("reverse wind preserves equal absolute demand and opposite sign",Math.abs(projected.windCase.M+projected.reverseWindCase.M)<1e-9&&Math.abs(projected.windCase.V+projected.reverseWindCase.V)<1e-9);
        return { passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length, checks, scope:"load projection regression only; purlin resistance remains preliminary and not code-complete" };
    }

    window.SteelRoofPurlins = {
        optimize,
        applyManual,
        getData,
        setData,
        selfTest,
        calculateOne,
        lastResult: null
    };

    function init() {
        createPanel();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded", init
        );
    } else {
        init();
    }

})();


/* ===== steel2/js/longitudinal-cantilever.js ===== */
/* SAHROUD STEEL - Longitudinal Purlin End Cantilever Check 2.0
   Preliminary elastic screening only. Units: kN, m, mm, MPa.
   Does not replace code design, connection design, or manufacturer section properties.
*/
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const fmt = (v, d = 2) => Number.isFinite(v)
    ? v.toLocaleString("fa-IR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d
      }) : "—";

  function readSide(loads, side) {
    const suffix = side === "left" ? "Left" : "Right";
    return {
      dead: Math.max(0, Number(loads["dead" + suffix]) || 0),
      live: Math.max(0, Number(loads["live" + suffix]) || 0),
      snow: Math.max(0, Number(loads["snow" + suffix]) || 0),
      wind: Number(loads["wind" + suffix]) || 0,
      windDirection: loads.windDirection || "not-specified"
    };
  }

  function caseResult(qLine, a, E, I, W, Fy, limitRatio) {
    // qLine is kN/m; numerically 1 kN/m = 1 N/mm.
    const L = a * 1000;
    const q = qLine;
    const M = q * L * L / 2;       // N.mm; sign follows load direction
    const V = q * L / 1000;        // kN; signed
    const stress = Math.abs(M / W); // MPa, gross elastic estimate
    const deflection = q * Math.pow(L, 4) / (8 * E * I); // mm; signed
    const limit = L / limitRatio;

    return {
      qLine: q,
      M: M / 1e6,
      V,
      stress,
      deflection,
      limit,
      bendingRatio: stress / Fy,
      deflectionRatio: Math.abs(deflection) / Math.max(limit, 0.001),
      bendingBelowFy: stress <= Fy,
      deflectionBelowLimit: deflection <= limit
    };
  }

  function renderCase(title, result) {
    return `
      <div class="result-card">
        <strong>${title}</strong>
        <span>بار خطی تقریبی: ${fmt(result.qLine, 3)} kN/m</span>
        <span>لنگر در ریشه کنسول: ${fmt(result.M, 3)} kN.m</span>
        <span>برش در تکیه‌گاه: ${fmt(result.V, 3)} kN</span>
        <span>تنش خمشی الاستیک تخمینی: ${fmt(result.stress, 1)} MPa</span>
        <span>خیز نوک کنسول: ${fmt(result.deflection, 3)} mm</span>
        <span>حد خیز فرضی L/n: ${fmt(result.limit, 2)} mm</span>
        <span>نسبت تنش به Fy: ${fmt(result.bendingRatio * 100, 1)}٪</span>
        <span>نسبت خیز به حد فرضی: ${fmt(result.deflectionRatio * 100, 1)}٪</span>
      </div>`;
  }

  function run() {
    const out = $("longitudinalCantileverResults");
    if (!out) return;

    const purlin = window.SteelRoofPurlins;
    const loadsApi = window.SteelLoads;
    const project = purlin && purlin.lastResult;
    const loads = loadsApi && typeof loadsApi.getData === "function"
      ? loadsApi.getData() : null;

    if (!project || !project.best || !loads) {
      out.textContent =
        "ابتدا در بخش طراحی پرلین سقف، پیشنهاد خودکار یا محاسبه مقطع انتخابی را اجرا کنید.";
      return;
    }

    const geometry = project.geometry || {};
    const settings = project.settings || {};
    const section = project.best.section || {};
    const pitch = Number(project.best.pitch);
    const a = Number($("longCantileverLength")?.value || geometry.endOverhang || 0.8);
    const E = Number(settings.e || 200000);
    const Fy = Number(settings.fy || 240);
    const I = Number(section.ix);
    const W = Number(section.wx);
    const angle = Number(geometry.angle || 0);
    const widthFactor = Math.cos(angle);

    if (!(a > 0 && pitch > 0 && E > 0 && Fy > 0 && I > 0 && W > 0)) {
      out.textContent = "طول کنسول، فاصله پرلین یا خواص مقطع معتبر نیست. ابتدا مقطع پرلین را دوباره محاسبه کنید.";
      return;
    }

    const limitRatio = Number(settings.deflectionLimit || 180);
    const sides = [
      { name: "شیب چپ سقف", key: "left" },
      { name: "شیب راست سقف", key: "right" }
    ];

    const results = sides.map(side => {
      const data = readSide(loads, side.key);
      const gravityPressure = data.dead + data.live + data.snow;
      // تبدیل سطح بار به بار خطی با عرض بارگیر تقریبی؛
      // فرض شده بارهای سطحی بر مبنای تصویر افقی وارد شده‌اند.
      const tributaryWidth = pitch * widthFactor;
      const gravityLine = gravityPressure * tributaryWidth;
      const windLine = data.wind * tributaryWidth;

      const gravity = caseResult(gravityLine, a, E, I, W, Fy, limitRatio);
      const wind = caseResult(windLine, a, E, I, W, Fy, limitRatio);
      const reverseWind = caseResult(-windLine, a, E, I, W, Fy, limitRatio);

      return {
        name: side.name,
        gravityPressure,
        windPressure: Math.abs(data.wind),
        windSignedPressure: data.wind,
        windDirection: data.windDirection,
        tributaryWidth,
        gravity,
        wind,
        reverseWind,
        worst: [gravity, wind, reverseWind].reduce((a,b)=>a.stress>=b.stress?a:b)
      };
    });

    const html = results.map(r => `
      <h4>${r.name}</h4>
      <p>عرض بارگیر تقریبی: ${fmt(r.tributaryWidth, 3)} متر</p>
      <p>بار سطحی ثقلی (مرده + زنده + برف): ${fmt(r.gravityPressure, 3)} kN/m²</p>
      <p>بار باد با علامت ورودی: ${fmt(r.windSignedPressure, 3)} kN/m² | قدر مطلق برای کنترل تنش: ${fmt(r.windPressure, 3)} kN/m²</p>
      <p>جهت کلی ثبت‌شده باد: ${r.windDirection === "left-to-right" ? "چپ به راست" : r.windDirection === "right-to-left" ? "راست به چپ" : "تعیین‌نشده"}</p>
      ${renderCase("حالت بار ثقلی", r.gravity)}
      ${renderCase("حالت باد با علامت ورودی (جدا از بار ثقلی)", r.wind)}
      ${renderCase("حالت باد با جهت معکوس", r.reverseWind)}
    `).join("");

    const allBelow = results.every(r =>
      r.gravity.bendingBelowFy && r.gravity.deflectionBelowLimit &&
      r.wind.bendingBelowFy && r.wind.deflectionBelowLimit &&
      r.reverseWind.bendingBelowFy && r.reverseWind.deflectionBelowLimit
    );

    out.innerHTML = `
      <h4>گزارش کنترل مقدماتی کنسول طولی پرلین</h4>
      <p><b>مقطع انتخاب‌شده:</b> ${section.name || "نامشخص"}</p>
      <p><b>فاصله پرلین‌ها:</b> ${fmt(pitch, 2)} متر</p>
      <p><b>طول کنسول:</b> ${fmt(a, 2)} متر در هر انتهای سوله</p>
      <p><b>مدول مقطع مبنا Wx:</b> ${fmt(W, 1)} mm³</p>
      <p><b>ممان اینرسی مبنا Ix:</b> ${fmt(I, 1)} mm⁴</p>
      ${html}
      <div class="notice">
        <b>${allBelow ? "کنترل غربالگری اولیه از حدود ساده‌شده عبور کرده است" : "حداقل یک حالت از حدود ساده‌شده عبور نکرده است"}</b>
        <p>این عبارت تأیید طراحی نیست. کنترل فقط یک طره منفرد با بار گسترده یکنواخت را بررسی می‌کند. بار ثقلی و باد جداگانه گزارش شده‌اند و ترکیب بار آیین‌نامه‌ای در این ماژول انجام نمی‌شود.</p>
        <p>خواص Z و RHS در نسخه فعلی تقریبی‌اند. پیچش مقطع Z، کمانش موضعی و اعوجاجی، کمانش جانبی-پیچشی، مهارها، پیوستگی پرلین روی قاب، وصله، پیچ و ورق اتصال، اثر مکش موضعی باد و ظرفیت واقعی تکیه‌گاه کنترل نشده‌اند.</p>
        <p>بارهای ورودی باید توسط مهندس محاسب و بر اساس محل و ضوابط پروژه تعیین شوند. انتخاب شهر شاهرود به‌تنهایی بار برف و باد معتبر ایجاد نمی‌کند.</p>
      </div>
    `;

    window.SteelLongitudinalCantilever = {
      run,
      lastResult: {
        results,
        section: section.name,
        overhang: a,
        assumptions: {
          model: "single uniformly loaded cantilever",
          loadCases: "gravity and wind checked separately",
          deflectionLimitRatio: limitRatio
        }
      }
    };
  }

  function init() {
    if ($("longitudinalCantileverPanel")) return;

    const main = document.querySelector("main");
    if (!main) return;

    const statusPanel = Array.from(main.querySelectorAll(".panel"))
      .find(panel => panel.textContent.includes("وضعیت پروژه"));
    const insertionPoint = statusPanel || main.querySelector("footer");
    if (!insertionPoint) return;

    insertionPoint.insertAdjacentHTML("beforebegin", `
      <section class="panel" id="longitudinalCantileverPanel">
        <div class="panel-title"><h3>کنترل کنسول طولی پرلین‌ها</h3></div>
        <div class="notice">
          کنترل مقدماتی پیش‌آمدگی پرلین‌ها در ابتدا و انتهای طول سوله.
          مقدار پیش‌فرض ۸۰ سانتی‌متر است و قابل تغییر خواهد بود.
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="longCantileverLength">طول کنسول در هر انتها (متر)</label>
            <input id="longCantileverLength" type="number" min="0.1" max="3" step="0.05" value="0.80">
          </div>
        </div>
        <div class="button-grid">
          <button id="btnLongitudinalCantilever" class="btn primary" type="button">
            محاسبه کنسول ابتدا و انتهای سوله
          </button>
        </div>
        <div id="longitudinalCantileverResults" class="notice">
          ابتدا مقطع پرلین را در بخش طراحی پرلین سقف محاسبه کنید.
        </div>
      </section>`);

    $("btnLongitudinalCantilever").addEventListener("click", run);

    const shortcut = $("btnOpenLongitudinalCantilever");
    if (shortcut) {
      shortcut.addEventListener("click", () => {
        const panel = $("longitudinalCantileverPanel");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* ===== steel2/js/app.js ===== */

/* SAHROUD STEEL - Application Controller
   Preliminary LRFD combinations aligned to Mabhas 6 (1398)
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function setStatus(message) {
        if (window.SteelProject &&
            typeof window.SteelProject.setStatus === "function") {
            window.SteelProject.setStatus(message);
        } else {
            const status = $("projectStatus");
            if (status) status.textContent = message;
        }
    }

    function validateProject() {
        if (document.getElementById("structuralSystem")?.value === "portal-single-slope") {
            const message = "قاب تک‌شیب در پیش‌نمایش هندسی پشتیبانی می‌شود، اما مدل سه‌بعدی و انتقال بار این نوع سقف هنوز تکمیل نشده است؛ تحلیل متوقف شد تا نتیجه نادرست تولید نشود.";
            setStatus(message);
            alert(message);
            return false;
        }
        if (!window.SteelProject) {
            alert("مدیریت پروژه بارگذاری نشده است.");
            return false;
        }

        const error = window.SteelProject.validate();

        if (error) {
            alert(error);
            setStatus("خطا: " + error);
            return false;
        }

        return true;
    }

    function validateSections() {
        if (!window.SteelSections ||
            typeof window.SteelSections.validate !== "function") {
            alert("ماژول کنترل مصالح و مقاطع بارگذاری نشده است.");
            setStatus("خطا: ماژول کنترل مقاطع در دسترس نیست.");
            return false;
        }

        const valid = window.SteelSections.validate();

        if (!valid) {
            setStatus("تحلیل متوقف شد: اطلاعات مصالح یا مقاطع ناقص است.");
            return false;
        }

        return true;
    }

    function draw() {
        if (!validateProject()) return;

        if (!window.SteelDrawing ||
            typeof window.SteelDrawing.drawFrame !== "function") {
            alert("ماژول ترسیم قاب بارگذاری نشده است.");
            return;
        }

        const result = window.SteelDrawing.drawFrame();

        if (result) {
            setStatus("ترسیم قاب با موفقیت انجام شد.");
        }
    }

    function fmt(value, digits = 3) {
        return Number(value || 0).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function oppositeDirection(direction) {
        return direction === "right-to-left"
            ? "left-to-right"
            : "right-to-left";
    }

    function hasWind(data) {
        return Math.abs(Number(data.windLeft) || 0) > 1e-12 ||
            Math.abs(Number(data.windRight) || 0) > 1e-12 ||
            Math.abs(Number(data.windWall) || 0) > 1e-12;
    }

    function makeCombinationData(original, options) {
        const data = JSON.parse(JSON.stringify(original));
        const deadFactor = options.deadFactor;
        const liveFactor = options.liveFactor || 0;
        const snowFactor = options.snowFactor || 0;
        const windFactor = options.windFactor || 0;
        const windSign = options.windSign || 1;

        data.deadLeft = original.deadLeft * deadFactor;
        data.deadRight = original.deadRight * deadFactor;

        data.liveLeft = original.liveLeft * liveFactor;
        data.liveRight = original.liveRight * liveFactor;
        data.snowLeft = original.snowLeft * snowFactor;
        data.snowRight = original.snowRight * snowFactor;

        data.windLeft = original.windLeft * windFactor * windSign;
        data.windRight = original.windRight * windFactor * windSign;
        data.windWall = (Number(original.windWall) || 0) * windFactor * windSign;

        data.windDirection = windSign < 0
            ? oppositeDirection(original.windDirection)
            : original.windDirection;

        return data;
    }

    function buildCombinationCases(original) {
        const cases = [];
        const signs = hasWind(original) ? [1, -1] : [1];

        cases.push({
            name: "ترکیب ۱ ـ 1.4D",
            data: makeCombinationData(original, {
                deadFactor: 1.4
            })
        });

        const roofActions = [
            { key: "live", title: "بار زنده بام Lr" },
            { key: "snow", title: "بار برف S" }
        ];

        roofActions.forEach(action => {
            signs.forEach(sign => {
                cases.push({
                    name: "ترکیب ۳ ـ 1.2D + 1.6(" +
                        action.title + ") + 0.7W، " +
                        (sign > 0 ? "جهت اول باد" : "جهت معکوس باد"),
                    data: makeCombinationData(original, {
                        deadFactor: 1.2,
                        liveFactor: action.key === "live" ? 1.6 : 0,
                        snowFactor: action.key === "snow" ? 1.6 : 0,
                        windFactor: 0.7,
                        windSign: sign
                    })
                });
            });
        });

        signs.forEach(sign => {
            cases.push({
                name: "ترکیب ۶ ـ 0.9D + 1.4W، " +
                    (sign > 0 ? "جهت اول باد" : "جهت معکوس باد"),
                data: makeCombinationData(original, {
                    deadFactor: 0.9,
                    windFactor: 1.4,
                    windSign: sign
                })
            });
        });

        const unique = [];
        const signatures = new Set();

        cases.forEach(item => {
            const d = item.data;
            const signature = JSON.stringify([
                d.deadLeft, d.deadRight,
                d.liveLeft, d.liveRight,
                d.snowLeft, d.snowRight,
                d.windLeft, d.windRight,
                d.windWall, d.windDirection
            ]);

            if (!signatures.has(signature)) {
                signatures.add(signature);
                unique.push(item);
            }
        });

        return unique;
    }

    // بیشینه نیروها در کل قاب
    function getEndForceEnvelope(result) {
        const envelope = {
            N: { value: 0, member: "", end: "" },
            V: { value: 0, member: "", end: "" },
            M: { value: 0, member: "", end: "" }
        };

        (result.members || []).forEach(member => {
            const values = [
                { key: "N", value: member.axialStart, end: "ابتدا" },
                { key: "N", value: member.axialEnd, end: "انتها" },
                { key: "V", value: member.shearStart, end: "ابتدا" },
                { key: "V", value: member.shearEnd, end: "انتها" },
                { key: "M", value: member.momentStart, end: "ابتدا" },
                { key: "M", value: member.momentEnd, end: "انتها" }
            ];

            values.forEach(item => {
                const magnitude = Math.abs(Number(item.value) || 0);

                if (magnitude > envelope[item.key].value) {
                    envelope[item.key] = {
                        value: magnitude,
                        signedValue: Number(item.value) || 0,
                        member: member.name,
                        end: item.end
                    };
                }
            });
        });

        return envelope;
    }

    // بیشینه نیروها برای هر عضو به صورت مستقل
    function getMemberEnvelopes(result) {
        const output = {};

        (result.members || []).forEach(member => {
            const name = member.name;

            if (!output[name]) {
                output[name] = {
                    N: { value: 0, signedValue: 0, end: "" },
                    V: { value: 0, signedValue: 0, end: "" },
                    M: { value: 0, signedValue: 0, end: "" }
                };
            }

            const values = [
                { key: "N", value: member.axialStart, end: "ابتدا" },
                { key: "N", value: member.axialEnd, end: "انتها" },
                { key: "V", value: member.shearStart, end: "ابتدا" },
                { key: "V", value: member.shearEnd, end: "انتها" },
                { key: "M", value: member.momentStart, end: "ابتدا" },
                { key: "M", value: member.momentEnd, end: "انتها" }
            ];

            values.forEach(item => {
                const signed = Number(item.value) || 0;
                const magnitude = Math.abs(signed);

                if (magnitude > output[name][item.key].value) {
                    output[name][item.key] = {
                        value: magnitude,
                        signedValue: signed,
                        end: item.end
                    };
                }
            });
        });

        return output;
    }

    function calculateLegacy2DCombinations() {
        if (!window.SteelLoads ||
            typeof window.SteelLoads.getData !== "function" ||
            typeof window.SteelLoads.setData !== "function") {
            alert("ماژول بارگذاری برای تحلیل ترکیبات در دسترس نیست.");
            return { success: false };
        }

        const original = JSON.parse(
            JSON.stringify(window.SteelLoads.getData())
        );
        const windKeys = ["windLeft","windRight","windWall","windEndFront","windEndBack"];
        const windValues = windKeys.map(k => original[k]);
        if (windValues.some(v => v === "" || v === null || v === undefined || !Number.isFinite(Number(v))) ||
            !windValues.some(v => Math.abs(Number(v)) > 1e-12)) {
            const message = $("analysisMessage");
            if (message) message.textContent = "تحلیل ترکیبات دوبعدی متوقف شد: فشار باد باید صریح، عددی و محاسبه‌شده باشد؛ صفرهای پیش‌فرض جایگزین بار باد نامشخص نیستند.";
            return {success:false,status:"insufficient_data"};
        }
        const cases = buildCombinationCases(original);
        const results = [];
        let failure = null;
        let baselineResult = null;

        try {
            for (const item of cases) {
                window.SteelLoads.setData(item.data);

                const run = window.SteelAnalysis.calculate();

                if (!run || !run.success ||
                    !window.SteelAnalysis.lastResult) {
                    throw new Error(
                        "تحلیل این حالت انجام نشد: " + item.name +
                        (run && run.error ? " ـ " + run.error : "")
                    );
                }

                const raw = window.SteelAnalysis.lastResult;

                results.push({
                    name: item.name,
                    envelope: getEndForceEnvelope(raw),
                    memberEnvelopes: getMemberEnvelopes(raw),
                    maxDisplacement: raw.maxDisplacement || 0,
                    reactions: raw.reactions || [],
                    members: raw.members || []
                });
            }
        } catch (error) {
            failure = error;
        }

        window.SteelLoads.setData(original);
        const restored = window.SteelAnalysis.calculate();

        if (restored && restored.success) {
            baselineResult = window.SteelAnalysis.lastResult;
        }

        if (failure) {
            const message = $("analysisMessage");

            if (message) {
                message.innerHTML =
                    "<b>خطا در تحلیل ترکیبات بار:</b><p>" +
                    failure.message +
                    "</p><p>بارهای ورودی اولیه بازگردانده شدند.</p>";
            }

            setStatus("خطا در تحلیل ترکیبات بار: " + failure.message);
            return { success: false, error: failure.message };
        }

        if (!results.length) {
            setStatus("هیچ ترکیب باری برای تحلیل ایجاد نشد.");
            return { success: false, error: "ترکیبی ایجاد نشد." };
        }

        const governing = {
            N: { value: 0, name: "", member: "", end: "" },
            V: { value: 0, name: "", member: "", end: "" },
            M: { value: 0, name: "", member: "", end: "" }
        };

        results.forEach(item => {
            ["N", "V", "M"].forEach(key => {
                const current = item.envelope[key];

                if (current.value > governing[key].value) {
                    governing[key] = {
                        value: current.value,
                        name: item.name,
                        member: current.member,
                        end: current.end,
                        signedValue: current.signedValue
                    };
                }
            });
        });

        window.SteelAnalysis.combinationResults = results;
        window.SteelAnalysis.governingCombinationResults = governing;

        if (baselineResult) {
            window.SteelAnalysis.lastResult = baselineResult;
        }

        const rows = results.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${fmt(item.envelope.N.value)}</td>
                <td>${fmt(item.envelope.V.value)}</td>
                <td>${fmt(item.envelope.M.value)}</td>
            </tr>
        `).join("");

        // ساخت ردیف‌های جدول تفکیکی اعضا
        const memberRows = results.flatMap(item =>
            Object.entries(item.memberEnvelopes || {}).map(([member, forces]) => `
                <tr>
                    <td>${item.name}</td>
                    <td>${member}</td>
                    <td>${fmt(forces.N.value)}</td>
                    <td>${fmt(forces.N.signedValue)}</td>
                    <td>${forces.N.end}</td>
                    <td>${fmt(forces.V.value)}</td>
                    <td>${fmt(forces.M.value)}</td>
                    <td>${forces.M.end}</td>
                </tr>
            `)
        ).join("");

        const message = $("analysisMessage");

        if (message) {
            message.innerHTML = `
                <h4>گزارش تحلیل ترکیبات بار مقدماتی LRFD</h4>

                <p>تعداد حالت‌های تحلیل‌شده:
                <b>${fmt(results.length, 0)}</b></p>

                <p>مبنای ترکیبات: مبحث ششم، ویرایش ۱۳۹۸،
                بند ۶-۲-۳-۲؛ بار زنده ورودی به‌عنوان
                بار زنده بام Lr در نظر گرفته شده است.</p>

                <div class="notice">
                    <b>نتایج بحرانی نیروهای انتهایی اعضا</b>

                    <p><b>بیشینه قدرمطلق N:</b>
                    ${fmt(governing.N.value)} kN</p>
                    <p>حالت: ${governing.N.name}</p>
                    <p>عضو و محل: ${governing.N.member}
                    ـ ${governing.N.end}</p>

                    <hr>

                    <p><b>بیشینه قدرمطلق V:</b>
                    ${fmt(governing.V.value)} kN</p>
                    <p>حالت: ${governing.V.name}</p>
                    <p>عضو و محل: ${governing.V.member}
                    ـ ${governing.V.end}</p>

                    <hr>

                    <p><b>بیشینه قدرمطلق M:</b>
                    ${fmt(governing.M.value)} kN.m</p>
                    <p>حالت: ${governing.M.name}</p>
                    <p>عضو و محل: ${governing.M.member}
                    ـ ${governing.M.end}</p>
                </div>

                <h4>جدول خلاصه همه حالت‌ها</h4>

                <div style="overflow-x:auto">
                    <table style="width:100%;
                    border-collapse:collapse;min-width:560px">
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>ترکیب بار</th>
                                <th>بیشینه N (kN)</th>
                                <th>بیشینه V (kN)</th>
                                <th>بیشینه M (kN.m)</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <h4>جدول تفکیکی نیروهای چهار عضو در ترکیبات بار</h4>

                <div style="overflow-x:auto">
                    <table style="width:100%;
                    border-collapse:collapse;min-width:850px">
                        <thead>
                            <tr>
                                <th>ترکیب بار</th>
                                <th>عضو</th>
                                <th>بیشینه |N| (kN)</th>
                                <th>N با علامت (kN)</th>
                                <th>محل N</th>
                                <th>بیشینه |V| (kN)</th>
                                <th>بیشینه |M| (kN.m)</th>
                                <th>محل M</th>
                            </tr>
                        </thead>
                        <tbody>${memberRows}</tbody>
                    </table>
                </div>

                <div class="notice">
                    <b>محدودیت‌ها و هشدارهای این مرحله</b>

                    <p>۱. مقادیر N، V و M در این گزارش،
                    نیروهای انتهایی اعضا هستند؛ بیشینه نیروی داخلی
                    در طول عضو و نمودارهای نیرو هنوز محاسبه نشده‌اند.</p>

                    <p>۲. بار باران، زلزله و حرارت به دلیل نبود
                    ورودی مربوط، در این مرحله وارد نشده‌اند.</p>

                    <p>۳. این نسخه برای قاب سوله فقط Lr یا S را
                    در حالت‌های جایگزین وارد می‌کند. چون ورودی مستقل
                    بار زنده طبقات L، بار باران R و زلزله E هنوز وجود ندارد،
                    ترکیب‌های وابسته به این بارها (ترکیب‌های ۲، ۴، ۵ و ۷)
                    عمداً تولید نمی‌شوند؛ نباید Lr به‌جای L یا بار صفرِ فرضی
                    به‌جای E و R استفاده شود. خودکرنشی T نیز وارد نشده است.</p>

                    <p>۴. باد دیوار در این مدل فقط به‌صورت بار افقی
                    روی ستون‌های قاب دوبعدی اعمال می‌شود؛ تحلیل طولی
                    و باد دیوارهای جلو و عقب انجام نمی‌شود.</p>

                    <p>۵. این گزارش تحلیل مقدماتی است و جایگزین
                    کنترل طراحی اعضا، پایداری، کمانش، اثرات مرتبه دوم،
                    اتصالات، صفحه‌ستون و فونداسیون نیست.
                    در ترکیب ۶ مبحث ششم ۱۳۹۸، ضرایب این زیرمجموعه باید ۰٫۹D و ۱٫۴W باشند؛ این نسخه صرفاً همین زیرمجموعه محدود را تحلیل می‌کند.</p>
                </div>
            `;
        }

        setStatus("تحلیل مقدماتی همه ترکیبات بار موجود انجام شد.");

        return {
            success: true,
            cases: results,
            governing
        };
    }

    // تحلیل تک‌حالته بارهای فعلی
    function calculate() {
        if (!validateProject()) return;
        if (!validateSections()) return;

        if (!window.SteelStructuralModel ||
            typeof window.SteelStructuralModel.analyze3D !== "function") {
            alert("موتور تحلیل سه‌بعدی بارگذاری نشده است.");
            return;
        }

        if (window.SteelDrawing) {
            window.SteelDrawing.drawFrame();
        }

        const result = window.SteelAnalysis.calculate();

        if (result && result.success) {
            setStatus("تحلیل مقدماتی بارهای فعلی انجام شد.");
        } else {
            setStatus("تحلیل مقدماتی انجام نشد.");
        }
    }

    function build3DCombinationCases(windBuild) {
        if(!windBuild||!Array.isArray(windBuild.cases)||windBuild.cases.length!==24)
            throw new Error("مجموعه ۲۴ حالت باد جهت‌دار کامل نیست.");
        const expected=[
            {dead:1.2,live:1.6,snow:0,wind:0.7},
            {dead:1.2,live:0,snow:1.6,wind:0.7},
            {dead:0.9,live:0,snow:0,wind:1.4}
        ];
        const ids=new Set(),patterns=expected.map(()=>0);
        windBuild.cases.forEach(item=>{
            if(!item||!item.id||ids.has(String(item.id)))throw new Error("شناسه حالت باد خالی یا تکراری است.");
            ids.add(String(item.id));
            if(!item.directionalWindPressures||!item.directionalWindPressures.surfaces||
               !["x-positive","x-negative","z-positive","z-negative"].includes(item.directionalWindPressures.direction)||
               !["positive","negative"].includes(item.directionalWindPressures.internalPressureSign))
                throw new Error("حالت باد فاقد جهت، فشار داخلی یا فشارهای سطحی مستقل است: "+item.id);
            const match=expected.findIndex(f=>Object.keys(f).every(k=>Number(item.factors?.[k])===f[k]));
            if(match<0)throw new Error("ضرایب بار حالت باد با الگوهای مجاز ۳ و ۶ منطبق نیست: "+item.id);
            patterns[match]++;
        });
        if(patterns.some(n=>n!==8))throw new Error("هر یک از سه الگوی بار باید در ۸ حالت جهت/فشار داخلی تکرار شود.");
        return [{
            id:"ULS-01-1.4D",m6FamilyId:"M6-ULS-01",m6VariantId:"D",label:"ترکیب ۱ ـ 1.4D (بدون باد)",
            factors:{dead:1.4,live:0,snow:0,wind:0},windSign:1,
            directionalWindPressures:null,directionalWindCaseId:null,
            source:{code:"مبحث ششم ۱۳۹۸",clause:"۶-۲-۳-۲، ترکیب ۱"}
        },...windBuild.cases];
    }
    function selfTestCombinationBuilder() {
        const pressures={};["roof-left","roof-right","long-wall-left","long-wall-right","end-wall-front","end-wall-back"].forEach(k=>pressures[k]=0);
        const cases=[];
        ["x-positive","x-negative","z-positive","z-negative"].forEach(direction=>
            ["positive","negative"].forEach(internalPressureSign=>{
                [
                    {dead:1.2,live:1.6,snow:0,wind:0.7},
                    {dead:1.2,live:0,snow:1.6,wind:0.7},
                    {dead:0.9,live:0,snow:0,wind:1.4}
                ].forEach((f,i)=>cases.push({id:direction+"-"+internalPressureSign+"-"+i,factors:f,
                    directionalWindPressures:{direction,internalPressureSign,surfaces:pressures}}));
            }));
        const built=build3DCombinationCases({cases});
        const tests=[
            ["one 1.4D case without wind",built.length===25&&built[0].factors.dead===1.4&&built[0].factors.wind===0&&!built[0].directionalWindPressures],
            ["24 directional cases retained",built.slice(1).length===24],
            ["wind factors are applied as 0.7 and 1.4",built.slice(1).every(x=>x.factors.wind===0.7||x.factors.wind===1.4)],
            ["all direction and internal-pressure alternatives retained",new Set(built.slice(1).map(x=>x.directionalWindPressures.direction+"|"+x.directionalWindPressures.internalPressureSign)).size===8],
            ["incomplete case set is blocked",(()=>{try{build3DCombinationCases({cases:cases.slice(1)});return false;}catch(e){return true;}})()]
        ];
        return {passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,total:tests.length,tests:tests.map(x=>({name:x[0],ok:x[1]})),scope:"combination assembly and factor routing only"};
    }

    // تحلیل مستقل ترکیبات بار
    async function calculateCombinations(onProgress) {
        const model = window.SteelStructuralModel;
        const loadsApi = window.SteelLoads;
        if (!model || typeof model.analyze3D !== "function" || !loadsApi) {
            const msg = $("analysisMessage");
            if (msg) msg.textContent = "موتور تحلیل سه‌بعدی یا ورودی بارگذاری در دسترس نیست.";
            return { success: false };
        }
        const original = loadsApi.getData();
        if (!original) throw new Error("اطلاعات بارگذاری پروژه خوانده نشد.");
        if(typeof model.build!=="function")throw new Error("سازنده مدل سه‌بعدی در دسترس نیست.");
        model.build();
        const windApi=window.SteelDirectionalWind3D;
        if(!windApi||typeof windApi.createCases!=="function"){
            const msg=$("analysisMessage");
            if(msg)msg.textContent="تحلیل ترکیبات متوقف شد: مبدل باد جهت‌دار و حالات مستقل فشار داخلی بارگذاری نشده‌اند.";
            return {success:false,status:"missing_directional_wind_adapter"};
        }
        let windBuild;
        try{windBuild=windApi.createCases();}
        catch(error){
            const msg=$("analysisMessage");
            if(msg)msg.textContent="تحلیل ترکیبات متوقف شد: "+String(error.message||error);
            return {success:false,status:"directional_wind_inputs_incomplete",error:String(error.message||error)};
        }
        if(!windBuild||!Array.isArray(windBuild.cases)||windBuild.cases.length!==24){
            const msg=$("analysisMessage");
            if(msg)msg.textContent="تحلیل ترکیبات متوقف شد: انتظار ۲۴ حالت باد جهت‌دار (۴ جهت × ۲ فشار داخلی × ۳ ترکیب) می‌رفت؛ مجموعه تولیدشده ناقص است.";
            return {success:false,status:"incomplete_directional_wind_cases"};
        }
        const cases=build3DCombinationCases(windBuild);
        const rows=[];
        const summaries=[];
        for(let caseIndex=0;caseIndex<cases.length;caseIndex++){
            const item=cases[caseIndex];
            if(typeof onProgress==="function")onProgress({index:caseIndex+1,total:cases.length,label:item.label});
            const progressMessage=$("analysisMessage");
            if(progressMessage)progressMessage.textContent="تحلیل حالت "+(caseIndex+1)+" از "+cases.length+": "+item.label+" — حل در پردازشگر پس‌زمینه…";
            // Paint progress before starting the next worker; do not monopolize the page event loop.
            await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
            const result=await model.analyze3D(item);
            if(!result||!result.success)throw new Error("حل سه‌بعدی ترکیب انجام نشد: "+item.label);
            if(!result.equilibrium||result.equilibrium.ok!==true)throw new Error("تعادل عددی ترکیب "+item.label+" برقرار/تأیید نشده است؛ حالت برای پوش طراحی پذیرفته نشد.");
            let peakN=0,peakV=0,peakM=0,criticalMember="";
            (result.members||[]).forEach(member=>{
                const f=member.localEndForces||[];
                const n=Math.max(Math.abs(Number(f[0])||0),Math.abs(Number(f[6])||0));
                const v=Math.max(Math.hypot(Number(f[1])||0,Number(f[2])||0),
                    Math.hypot(Number(f[7])||0,Number(f[8])||0));
                const mm=Math.max(Math.hypot(Number(f[4])||0,Number(f[5])||0),
                    Math.hypot(Number(f[10])||0,Number(f[11])||0));
                if(n>peakN||v>peakV||mm>peakM)criticalMember=member.id;
                peakN=Math.max(peakN,n);peakV=Math.max(peakV,v);peakM=Math.max(peakM,mm);
            });
            const itemResult={id:item.id||item.directionalWindCaseId||"ULS-01-1.4D",m6FamilyId:item.m6FamilyId||null,m6VariantId:item.m6VariantId||null,name:item.label,label:item.label,factors:{...item.factors},windSign:item.windSign,directionalWindCaseId:item.directionalWindCaseId||null,source:item.source||null,envelope:{
                N:{value:peakN/1000,member:criticalMember,end:"بیشینه دو انتها"},
                V:{value:peakV/1000,member:criticalMember,end:"برآیند برش دو انتها"},
                M:{value:peakM/1000,member:criticalMember,end:"برآیند لنگر دو انتها"}},
                members:(result.members||[]).map(member=>({id:String(member.id),parentMemberId:member.parentMemberId||null,taperApplied:member.taperApplied===true,taperSegmentIndex:member.taperSegmentIndex??null,taperSegmentCount:member.taperSegmentCount??null,taperCoordinate:member.taperCoordinate??null,taperDimensions:member.taperDimensions||null,analysisLoad:member.analysisLoad||null,localEndForces:Array.isArray(member.localEndForces)?member.localEndForces.slice(0,12):[]})),
                maxDisplacement:result.maxTranslation||0,
                criticalNode:result.maxDisplacement?.nodeId||"—",
                displacementComponents:(result.maxDisplacement?.components||[0,0,0]).map(v=>Number(v)||0),
                reactions:(result.reactions||[]).length,
                equilibrium:result.equilibrium||null};
            summaries.push(itemResult);
            rows.push("<tr><td>"+(rows.length+1)+"</td><td>"+item.label+
                "</td><td>"+fmt(peakN/1000)+"</td><td>"+fmt(peakV/1000)+
                "</td><td>"+fmt(peakM/1000)+"</td><td>"+fmt((result.maxTranslation||0)*1000)+
                "</td><td>"+(result.maxDisplacement?.nodeId||"—")+"</td><td>"+
                (result.maxDisplacement?.components||[0,0,0]).map(v=>fmt(Number(v||0)*1000)).join(" / ")+
                "</td><td>"+(result.equilibrium?.ok?"متعادل":"نیازمند بررسی")+"</td></tr>");
        }
        model.combinationResults=summaries;
        if(window.SteelAnalysis)window.SteelAnalysis.combinationResults=summaries;
        const message=$("analysisMessage");
        if(message) message.innerHTML=
            "<h4>تحلیل ترکیبات بار سه‌بعدی ـ مقدماتی</h4>"+
            "<p>تعداد حالت‌های حل‌شده: <b>"+summaries.length+"</b>؛ شامل ۱ حالت 1.4D بدون باد و ۲۴ حالت باد جهت‌دار (۴ جهت × ۲ فشار داخلی × ۳ ترکیب).</p>"+
            "<div style='overflow-x:auto'><table style='width:100%;min-width:760px;border-collapse:collapse'><thead><tr>"+
            "<th>ردیف</th><th>ترکیب</th><th>بیشینه |N| (kN)</th><th>بیشینه |V| (kN)</th>"+
            "<th>بیشینه |M| (kN.m)</th><th>جابجایی کل (mm)</th><th>گره بحرانی</th><th>ux / uy / uz (mm)</th><th>تعادل</th></tr></thead><tbody>"+
            rows.join("")+"</tbody></table></div>"+
            "<div class='notice'><b>دامنه و محدودیت‌ها</b>"+
            "<p>باد از دفتر جهت‌دار و به‌صورت فشار خالص مستقل شش سطح، در چهار جهت اصلی و دو حالت فشار داخلی مثبت/منفی به مدل سه‌بعدی منتقل شده است. ضرایب باد ۰٫۷ در ترکیبات ۳ و ۱٫۴ در ترکیب ۶ اعمال می‌شوند؛ این ضرایب فقط یک‌بار در انتقال بار اعمال می‌شوند.</p>"+
            "<p>این مسیر شامل 1.4D بدون باد، دو شاخه 1.2D+1.6Lr+0.7W و 1.2D+1.6S+0.7W و شاخه 0.9D+1.4W است. ترکیب ۴ به‌دلیل نبود ورودی مستقل بار زنده عمومی L، و نیز R، E و T در این گردش‌کار ساخته نمی‌شوند. ضرایب و فشارهای سطحی باید با متن رسمی مبحث ششم ۱۳۹۸، اصلاحیه‌ها و شرایط پروژه تطبیق داده شوند.</p>"+
            "<p>برای هر حالت، شناسه گره دارای بیشینه جابه‌جایی و مؤلفه‌های انتقالی ux/uy/uz نیز گزارش شده‌اند تا راستای حرکت و مسیر احتمالی ناپایداری قابل تشخیص باشد.</p>"+
            "<p>نیروها از برآیند نیروهای انتهایی اعضا استخراج شده‌اند؛ کنترل مقاومت، کمانش، P-Delta، تغییرمکان مجاز و اتصالات همچنان مستقل و ضروری است. تعادل عددی به‌تنهایی اثبات‌کننده پایداری یا کفایت طراحی نیست.</p></div>";
        setStatus("تحلیل سه‌بعدی ترکیبات بار موجود انجام شد.");
        return {success:true,cases:summaries,windCaseCount:windBuild.caseCount,limitations:windBuild.limitations||[]};
    }

    function calculateCombinationsButton() {
        if (!validateProject()) return;
        if (!validateSections()) return;

        if (!window.SteelStructuralModel ||
            typeof window.SteelStructuralModel.analyze3D !== "function") {
            alert("موتور تحلیل سه‌بعدی بارگذاری نشده است.");
            return;
        }

        if (window.SteelDrawing) {
            window.SteelDrawing.drawFrame();
        }

        const button = $("btnCombinations");
        const message = $("analysisMessage");
        if (button && button.disabled) return;
        const originalLabel = button ? button.textContent : "";
        if (button) {
            button.disabled = true;
            button.textContent = "در حال تحلیل...";
        }
        if (message) {
            message.textContent = "⏳ تحلیل ترکیبات بار آغاز شد؛ لطفاً تا نمایش گزارش صبر کنید...";
            message.style.color = "#176b87";
            message.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setStatus("در حال تحلیل ترکیبات بار؛ اجرای حالت‌های بارگذاری...");
        // اجازه می‌دهیم پیام شروع قبل از محاسبات سنگین روی صفحه دیده شود.
        setTimeout(async function () {
            try {
                const result = await calculateCombinations(progress => {
                    if (button) button.textContent = "تحلیل " + progress.index + "/" + progress.total;
                    if (message) message.textContent = "حالت " + progress.index + " از " + progress.total + ": " + progress.label + " — در حال حل سه‌بعدی…";
                });
                if (result && result.success) {
                    setStatus("تحلیل ترکیبات بار با موفقیت انجام شد.");
                } else if (message && (!message.textContent || !message.textContent.trim())) {
                    message.textContent = "تحلیل انجام نشد؛ اطلاعات ورودی و وضعیت پروژه را بررسی کنید.";
                }
            } catch (error) {
                if (message) message.textContent = "خطا در تحلیل ترکیبات بار: " + error.message;
                setStatus("خطا در تحلیل ترکیبات بار: " + error.message);
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = originalLabel;
                }
            }
        }, 60);
    }

    // API هم‌زمان برای اجرای زنجیره‌ای، بدون تأخیر دکمه
    if (window.SteelAnalysis) {
        window.SteelAnalysis.calculateCombinations = calculateCombinations;
        window.SteelAnalysis.build3DCombinationCases=build3DCombinationCases;
        window.SteelAnalysis.selfTestCombinationBuilder=selfTestCombinationBuilder;
    }

    function save() {
        if (!validateProject()) return;
        window.SteelProject.save();
    }

    function openFile() {
        const input = $("projectFile");

        if (input) {
            input.value = "";
            input.click();
        }
    }

    function loadSelectedFile(event) {
        const file = event.target.files &&
                     event.target.files[0];

        if (!file) return;

        if (!window.SteelProject) {
            alert("ماژول مدیریت پروژه بارگذاری نشده است.");
            return;
        }

        window.SteelProject.loadFile(file);

        setTimeout(function () {
            if (window.SteelProject.validate() === "") {
                if (window.SteelDrawing) {
                    window.SteelDrawing.drawFrame();
                }
            }
        }, 300);
    }

    function connectButtons() {
        const drawButton = $("btnDraw");
        const calculateButton = $("btnCalculate");
        const combinationsButton = $("btnCombinations");
        const saveButton = $("btnSave");
        const loadButton = $("btnLoad");
        const fileInput = $("projectFile");

        if (drawButton) {
            drawButton.addEventListener("click", draw);
        }

        if (calculateButton) {
            calculateButton.addEventListener("click", calculate);
        }

        if (combinationsButton) {
            combinationsButton.addEventListener(
                "click",
                calculateCombinationsButton
            );
        }

        if (saveButton) {
            saveButton.addEventListener("click", save);
        }

        if (loadButton) {
            loadButton.addEventListener("click", openFile);
        }

        if (fileInput) {
            fileInput.addEventListener("change", loadSelectedFile);
        }

        ["length", "spacing"].forEach(id => {
            const field = $(id);

            if (field && window.SteelProject) {
                field.addEventListener("change", function () {
                    window.SteelProject.updateFrameCount();
                });
            }
        });

        if (window.SteelDrawing) {
            window.SteelDrawing.drawFrame();
        }

        setStatus("نرم‌افزار آماده ورود اطلاعات است.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connectButtons);
    } else {
        connectButtons();
    }

})();


/* ===== steel2/js/cantilever-check.js ===== */
/* SAHROUD STEEL - Roof Cantilever Preliminary Check
   Version 1.0
   Checks LRFD-analysis demand against a simplified elastic-yield reference.
   Does NOT replace full AISC/Mabhas 10 member or connection design.
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const names = ["کنسول رفتر چپ", "کنسول رفتر راست"];
    const PHI = 0.90;

    function fmt(value, digits = 2) {
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";
        return n.toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function esc(value) {
        return String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#039;"
        })[ch]);
    }

    function forceAt(member, x) {
        const q = Number(member.localLoadY) || 0;
        return -(Number(member.momentStart) || 0) +
            (Number(member.shearStart) || 0) * x +
            0.5 * q * x * x;
    }

    function stations(member) {
        const L = Number(member.length);
        const q = Number(member.localLoadY) || 0;
        const v0 = Number(member.shearStart) || 0;
        const points = [0, L];
        if (Math.abs(q) > 1e-12) {
            const x = -v0 / q;
            if (x > 0 && x < L) points.push(x);
        }
        return points;
    }

    function getCapacity() {
        const data = window.SteelSections.getDataSI();
        const fy = Number(data.material.Fy);
        const sxTop = Number(data.rafter.SxTop);
        const sxBottom = Number(data.rafter.SxBottom);
        if (!(fy > 0 && sxTop > 0 && sxBottom > 0)) {
            throw new Error("Fy و مدول‌های مقطع رفتر باید معتبر باشند.");
        }
        const sx = Math.min(sxTop, sxBottom);
        return {
            fyMPa: fy / 1e6,
            sxCm3: sx * 1e6,
            my: fy * sx / 1000,
            phiMy: PHI * fy * sx / 1000
        };
    }

    function calculate() {
        const out = $("cantileverCheckResults");
        try {
            const cases = window.SteelAnalysis &&
                window.SteelAnalysis.combinationResults;
            if (!Array.isArray(cases) || !cases.length) {
                throw new Error("ابتدا «تحلیل ترکیبات بار» را اجرا کنید.");
            }

            const capacity = getCapacity();
            const worst = {};
            names.forEach(name => {
                worst[name] = {
                    moment: 0, shear: 0, axial: 0,
                    combination: "—", position: 0,
                    supportMoment: 0, supportShear: 0,
                    supportAxial: 0, deflection: 0,
                    deflectionCombination: "—",
                    connectionCases: []
                };
            });

            let found = 0;
            cases.forEach(item => {
                (item.members || []).forEach(member => {
                    const name = member.name;
                    if (!worst[name]) return;
                    const L = Number(member.length);
                    if (!(L > 0) ||
                        !Number.isFinite(Number(member.localLoadY)) ||
                        !Number.isFinite(Number(member.momentStart)) ||
                        !Number.isFinite(Number(member.shearStart))) {
                        throw new Error("اطلاعات تحلیل " + name + " ناقص است؛ تحلیل را تکرار کنید.");
                    }

                    let localMax = { value: 0, x: 0 };
                    stations(member).forEach(x => {
                        const M = forceAt(member, x);
                        if (Math.abs(M) > localMax.value) {
                            localMax = { value: Math.abs(M), x };
                        }
                    });

                    const w = worst[name];
                    if (localMax.value > w.moment) {
                        w.moment = localMax.value;
                        w.combination = item.name;
                        w.position = localMax.x;
                    }

                    const left = name.includes("چپ");
                    const supportM = Math.abs(Number(left ? member.momentEnd : member.momentStart) || 0);
                    const supportV = Math.abs(Number(left ? member.shearEnd : member.shearStart) || 0);
                    const supportN = Math.abs(Number(left ? member.axialEnd : member.axialStart) || 0);
                    // Keep simultaneous connection actions from each individual load combination.
                    w.connectionCases.push({
                        combination: item.name,
                        M: supportM,
                        V: supportV,
                        N: supportN
                    });
                    if (supportM > w.supportMoment) {
                        w.supportMoment = supportM;
                        w.supportMomentCombination = item.name;
                    }
                    if (supportV > w.supportShear) {
                        w.supportShear = supportV;
                        w.supportShearCombination = item.name;
                    }
                    if (supportN > w.supportAxial) {
                        w.supportAxial = supportN;
                        w.supportAxialCombination = item.name;
                    }

                    const deflection = Math.abs(Number(member.tipRelativeDeflection));
                    if (Number.isFinite(deflection) && deflection > w.deflection) {
                        w.deflection = deflection;
                        w.deflectionCombination = item.name;
                    }
                    found++;
                });
            });

            if (!found) {
                throw new Error("اعضای کنسولی در نتایج ترکیبات بار پیدا نشدند. تحلیل را دوباره اجرا کنید.");
            }

            const rows = names.map(name => {
                const r = worst[name];
                const ratio = capacity.phiMy > 0 ? r.moment / capacity.phiMy : Infinity;
                const status = ratio <= 1 ? "قبول در مقایسه خمشی مقدماتی" : "نیازمند تقویت/بررسی";
                return `
                    <tr class="cantilever-main-row">
                        <td data-label="عضو"><b>${esc(name)}</b></td>
                        <td data-label="بیشینه لنگر (kN.m)">${fmt(r.moment)}</td>
                        <td data-label="مرجع خمشی φFySx (kN.m)">${fmt(capacity.phiMy)}</td>
                        <td data-label="نسبت تقاضا به مرجع">${fmt(ratio)}</td>
                        <td data-label="نتیجه">${status}</td>
                        <td data-label="ترکیب حاکم">${esc(r.combination)}</td>
                        <td data-label="محل لنگر (m)">${fmt(r.position)}</td>
                    </tr>
                    <tr class="cantilever-detail-row">
                        <td colspan="7">
                            <b>نیروهای محل اتصال به قاب:</b>
                            لنگر ${fmt(r.supportMoment)} kN.m،
                            برش ${fmt(r.supportShear)} kN،
                            نیروی محوری ${fmt(r.supportAxial)} kN
                            <br>
                            <b>خیز نسبی نوک کنسول:</b>
                            ${fmt(r.deflection * 1000)} mm
                            (ترکیب: ${esc(r.deflectionCombination)})
                        </td>
                    </tr>
                `;
            }).join("");

            out.innerHTML = `
                <h4>نتایج کنترل مقدماتی کنسول‌های رفتر</h4>
                <p>Fy = ${fmt(capacity.fyMPa)} MPa؛ Sx حداقل = ${fmt(capacity.sxCm3)} cm³</p>
                <p>مرجع خمشی ساده‌شده φFySx = ${fmt(capacity.phiMy)} kN.m (φ = 0.90)</p>
                <style>
                    .cantilever-table-wrap{width:100%;overflow-x:auto}
                    .cantilever-results-table{width:100%;min-width:850px;border-collapse:collapse}
                    .cantilever-results-table th,.cantilever-results-table td{padding:10px 8px;text-align:center;vertical-align:middle}
                    @media(max-width:650px){
                        .cantilever-table-wrap{overflow:visible}
                        .cantilever-results-table{min-width:0!important;width:100%;display:block}
                        .cantilever-results-table thead{display:none}
                        .cantilever-results-table tbody{display:block;width:100%}
                        .cantilever-results-table tr.cantilever-main-row{display:block;border:1px solid #ccd8de;border-radius:9px;margin:12px 0;overflow:hidden}
                        .cantilever-results-table tr.cantilever-main-row td{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;text-align:left;padding:9px 10px;border-bottom:1px solid #e1e8ec;white-space:normal;overflow-wrap:anywhere}
                        .cantilever-results-table tr.cantilever-main-row td:last-child{border-bottom:0}
                        .cantilever-results-table tr.cantilever-main-row td:before{content:attr(data-label);font-weight:700;color:#385568;flex:0 0 48%;text-align:right}
                        .cantilever-results-table tr.cantilever-detail-row{display:block;margin:0 0 18px}
                        .cantilever-results-table tr.cantilever-detail-row td{display:block;width:100%;padding:12px 9px;white-space:normal;overflow-wrap:anywhere;line-height:1.9}
                    }
                </style>
                <div class="cantilever-table-wrap">
                    <table class="cantilever-results-table">
                        <thead><tr>
                            <th>عضو</th><th>بیشینه |M| (kN.m)</th>
                            <th>φFySx (kN.m)</th><th>نسبت تقاضا/مرجع</th>
                            <th>نتیجه</th><th>ترکیب حاکم</th><th>محل لنگر (m)</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="notice">
                    <b>توضیح خیز:</b>
                    خیز گزارش‌شده جابه‌جایی نسبی نوک کنسول نسبت به مماسِ تکیه‌گاه در راستای عمود بر رفتر است.
                    حد مجاز خیز هنوز با توجه به نوع پوشش، آب‌بندی و ضابطه پروژه تعیین نشده؛ بنابراین نرم‌افزار فعلاً درباره مجاز بودن خیز حکم قبول/رد صادر نمی‌کند.
                </div>
                <div class="notice">
                    <b>نیروهای اتصال:</b>
                    لنگر، برش و نیروی محوری بالا، تقاضای منتقل‌شده به محل اتصال کنسول و رفتر اصلی هستند؛ ظرفیت جوش، ورق اتصال، پیچ‌ها و سخت‌کننده‌ها هنوز کنترل نشده است.
                </div>
                <div class="notice" style="color:#b45309">
                    <b>محدودیت مهم:</b>
                    φFySx فقط مرجع ساده‌شده تسلیم خمشی است. کمانش جانبی-پیچشی، فشردگی اجزا، اندرکنش نیروی محوری و خمش، کمانش موضعی، ضرایب طول مهارنشده و ضوابط کامل مبحث دهم در این کنترل لحاظ نشده‌اند. نتیجه «قبول» تأیید طراحی اجرایی نیست.
                </div>
            `;

            window.SteelCantileverCheck.lastResult = { capacity, worst };
            if (window.SteelProject) {
                window.SteelProject.setStatus("کنترل مقدماتی تقاضای کنسول‌های رفتر انجام شد؛ کنترل کامل آیین‌نامه‌ای و اتصالات باقی است.");
            }
        } catch (error) {
            out.innerHTML = '<div class="notice" style="color:#b45309">خطا: ' + esc(error.message) + '</div>';
        }
    }

    function createPanel() {
        let panel = $("cantileverCheckPanel");
        if (!panel) {
            const main = document.querySelector("main");
            if (!main) return;
            panel = document.createElement("section");
            panel.className = "panel";
            panel.id = "cantileverCheckPanel";
            panel.innerHTML = `
                <div class="panel-title"><h3>کنترل کنسول‌های رفتر</h3></div>
                <div class="notice">
                    استخراج تقاضای خمشی، نیروهای محل اتصال و خیز نسبی نوک کنسول از ترکیبات بار.
                </div>
                <div class="button-grid">
                    <button id="btnCantileverCheck" class="btn primary" type="button">محاسبه کنترل کنسول‌ها</button>
                </div>
                <div id="cantileverCheckResults"></div>
            `;
            const statusPanel = Array.from(main.querySelectorAll(".panel"))
                .find(p => p.querySelector("h3")?.textContent.includes("وضعیت پروژه"));
            if (statusPanel) main.insertBefore(panel, statusPanel);
            else main.appendChild(panel);
        }
        const button = $("btnCantileverCheck");
        if (button && button.dataset.bound !== "1") {
            button.addEventListener("click", calculate);
            button.dataset.bound = "1";
        }
    }

    window.SteelCantileverCheck = { calculate };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createPanel);
    } else {
        createPanel();
    }
})();


/* ===== steel2/js/connection-design.js ===== */
/* SAHROUD STEEL - Preliminary Connection Stage 2
   Elastic analysis of a continuous rectangular fillet-weld group.
   Concurrent in-plane N, V and M are taken from each load combination.
   Not a complete connection design or code certification.
*/
(function () {
    "use strict";
    const $ = id => document.getElementById(id);
    const fmt = (v, d = 2) => Number.isFinite(Number(v))
        ? Number(v).toLocaleString("fa-IR", {minimumFractionDigits:d, maximumFractionDigits:d}) : "—";
    function field(id, label, unit, value) {
        return `<div class="field"><label for="${id}">${label} (${unit})</label>
        <input id="${id}" type="number" min="0" step="0.1" value="${value}" placeholder="وارد کنید"></div>`;
    }
    function bindConnectionShortcut() {
        const button = $("btnOpenConnection");
        if (!button || button.dataset.bound === "1") return;
        button.dataset.bound = "1";
        button.addEventListener("click", function () {
            const panel = $("connectionDesignPanel");
            if (!panel) {
                alert("بخش طراحی اتصال هنوز بارگذاری نشده است.");
                return;
            }
            const details = panel.querySelector("details");
            if (details) details.open = true;
            panel.scrollIntoView({behavior:"smooth", block:"start"});
        });
    }
    function createPanel() {
        if ($("connectionDesignPanel")) return;
        const main = document.querySelector("main");
        if (!main) return;
        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "connectionDesignPanel";
        panel.innerHTML = `
            <div class="panel-title"><h3>طراحی مقدماتی اتصال کنسول به رفتر</h3></div>
            <div class="notice">
                مرحله دوم: تحلیل الاستیک گروه جوش پیوسته مستطیلی تحت اثر هم‌زمان لنگر، برش و نیروی محوری در صفحه اتصال.
                آرایش جوش این محاسبه، جوش پیوسته در چهار ضلع ورق است و باید با جزئیات واقعی منطبق باشد.
            </div>
            <h4>۱ ـ نیروهای محل اتصال</h4>
            <div id="connectionActions" class="notice">ابتدا تحلیل ترکیبات بار و کنترل کنسول‌ها را اجرا کنید.</div>
            <h4>۲ ـ هندسه ورق و گروه جوش مستطیلی</h4>
            <div class="form-grid">
                ${field("connPlateThickness", "ضخامت ورق اتصال ـ مقدار آزمایشی", "mm", 10)}
                ${field("connPlateWidth", "عرض ورق / فاصله خطوط جوش ـ آزمایشی", "mm", 200)}
                ${field("connPlateHeight", "ارتفاع گروه جوش ـ آزمایشی", "mm", 300)}
                ${field("connWeldSize", "اندازه ساق جوش گوشه ـ آزمایشی", "mm", 6)}
                ${field("connFexx", "مقاومت کششی الکترود FEXX ـ آزمایشی", "MPa", 490)}
            </div>
            <div class="notice">
                مدل محاسباتی: چهار خط جوش پیوسته روی محیط مستطیل، با مرکز هندسی در مرکز ورق.
                ابعاد و اندازه جوش باید از نقشه یا طرح واقعی وارد شود؛ مقدار پیش‌فرضی فرض نشده است.
            </div>
            <div class="button-grid">
                <button id="btnConnectionCheck" class="btn primary" type="button">تحلیل گروه جوش تحت نیروهای ترکیبی</button>
            </div>
            <div id="connectionCheckResults"></div>
            <div class="notice" style="color:#a65d16">
                محدودیت‌ها: این مدل فقط بارهای درون‌صفحه‌ای N، V و لنگر حول محور عمود بر صفحه گروه جوش را بررسی می‌کند.
                خمش خارج از صفحه، اهرم‌وارگی، تنش‌های ثانویه، شکست فلز پایه، حداقل/حداکثر اندازه جوش، طراحی ورق، پیچ‌ها، بلوک برشی و سخت‌کننده‌ها هنوز کنترل نشده‌اند.
                نتیجه این محاسبه تأیید اجرایی اتصال نیست.
            </div>`;
        const status = Array.from(main.querySelectorAll(".panel"))
            .find(p => p.querySelector("h3")?.textContent.includes("وضعیت پروژه"));
        if (status) main.insertBefore(panel, status); else main.appendChild(panel);
        $("btnConnectionCheck").addEventListener("click", calculate);
        refreshActions();
        bindConnectionShortcut();
    }
    function getSides() {
        const w = window.SteelCantileverCheck?.lastResult?.worst;
        if (!w) return null;
        return [
            ["کنسول چپ", w["کنسول رفتر چپ"]],
            ["کنسول راست", w["کنسول رفتر راست"]]
        ];
    }
    function refreshActions() {
        const box = $("connectionActions");
        if (!box) return;
        const sides = getSides();
        if (!sides || sides.some(x => !x[1])) {
            box.textContent = "ابتدا تحلیل ترکیبات بار و سپس محاسبه کنترل کنسول‌ها را اجرا کنید.";
            return;
        }
        box.innerHTML = sides.map(([name,r]) => {
            const cases = r.connectionCases || [];
            return `<div style="border:1px solid #d7e1e7;border-radius:8px;padding:10px;margin:8px 0">
                <b>${name}</b><br>تعداد ترکیبات بار ثبت‌شده: ${fmt(cases.length,0)}
                <br>بیشینه مستقل لنگر: ${fmt(r.supportMoment)} kN.m
                <br>بیشینه مستقل برش: ${fmt(r.supportShear)} kN
                <br>بیشینه مستقل محوری: ${fmt(r.supportAxial)} kN
            </div>`;
        }).join("") + "<small>برای کنترل گروه جوش، نیروهای هم‌زمان هر ترکیب بار جداگانه بررسی می‌شوند؛ بیشینه‌های مستقل با هم جمع نشده‌اند.</small>";
    }
    function weldGroup(width, height, leg, fexx, N, V, M) {
        const perimeter = 2 * (width + height);
        const throat = 0.707 * leg;
        // Polar line moment J' = integral(r^2 ds) for a closed rectangle.
        const J = 2 * (height * width * width / 4 + height * height * height / 12)
                + 2 * (width * height * height / 4 + width * width * width / 12);
        const phi = 0.75;
        const capacityPerLength = phi * 0.60 * fexx * throat / 1000; // kN/mm
        const corners = [
            [-width/2,-height/2],[-width/2,height/2],
            [width/2,-height/2],[width/2,height/2]
        ];
        let maxQ = 0, critical = "";
        corners.forEach(([x,y],i) => {
            const qx = N/perimeter - M*y/J;
            const qy = V/perimeter + M*x/J;
            const q = Math.hypot(qx,qy);
            if (q > maxQ) { maxQ=q; critical="گوشه "+(i+1); }
        });
        return {perimeter,throat,J,phiRn:capacityPerLength,maxQ,
            ratio:capacityPerLength>0?maxQ/capacityPerLength:Infinity,critical};
    }
    function calculate() {
        const out = $("connectionCheckResults");
        try {
            refreshActions();
            const sides = getSides();
            if (!sides || sides.some(x => !x[1])) throw new Error("ابتدا تحلیل ترکیبات بار و کنترل کنسول‌ها را اجرا کنید.");
            const t=Number($("connPlateThickness").value);
            const b=Number($("connPlateWidth").value);
            const h=Number($("connPlateHeight").value);
            const leg=Number($("connWeldSize").value);
            const fexx=Number($("connFexx").value);
            if (!(t>0 && b>0 && h>0 && leg>0 && fexx>0)) {
                throw new Error("تمام ابعاد ورق، اندازه جوش و FEXX را با مقادیر مثبت وارد کنید.");
            }
            if (b<=0 || h<=0) throw new Error("عرض و ارتفاع گروه جوش باید مثبت باشند.");
            const outputs = sides.map(([name,r]) => {
                const cases = r.connectionCases || [];
                if (!cases.length) throw new Error("نیروهای هم‌زمان ترکیبات بار ثبت نشده‌اند؛ تحلیل و کنترل کنسول را دوباره اجرا کنید.");
                let worst=null;
                cases.forEach(c => {
                    // Convert M from kN.m to kN.mm; N and V remain kN.
                    const g=weldGroup(b,h,leg,fexx,Math.abs(c.N),Math.abs(c.V),Math.abs(c.M)*1000);
                    if (!worst || g.ratio>worst.g.ratio) worst={c,g};
                });
                return {name,worst};
            });
            const rows=outputs.map(o=>{
                const {c,g}=o.worst;
                return `<tr><td>${o.name}</td><td>${c.combination}</td>
                    <td>${fmt(c.M)} / ${fmt(c.V)} / ${fmt(c.N)}</td>
                    <td>${fmt(g.maxQ,4)}</td><td>${fmt(g.phiRn,4)}</td>
                    <td>${fmt(g.ratio,3)}</td><td>${g.ratio<=1?"قبول در مدل محدود گروه جوش":"نیازمند بازطراحی"}</td></tr>`;
            }).join("");
            const first=outputs[0].worst.g;
            out.innerHTML=`
                <h4>نتیجه تحلیل الاستیک گروه جوش مستطیلی</h4>
                <p>محیط مؤثر جوش: ${fmt(first.perimeter,1)} mm؛ گلویی مؤثر: ${fmt(first.throat,2)} mm</p>
                <p>ممان قطبی خطی گروه جوش J′: ${fmt(first.J,0)} mm³</p>
                <p>ظرفیت طراحی بر واحد طول جوش φ·0.60·FEXX·0.707w: ${fmt(first.phiRn,4)} kN/mm</p>
                <div style="overflow-x:auto"><table style="width:100%;min-width:760px;border-collapse:collapse">
                    <thead><tr><th>عضو</th><th>ترکیب حاکم گروه جوش</th><th>M (kN.m) / V (kN) / N (kN)</th>
                    <th>تقاضای خطی بیشینه (kN/mm)</th><th>ظرفیت خطی (kN/mm)</th><th>نسبت</th><th>نتیجه</th></tr></thead>
                    <tbody>${rows}</tbody></table></div>
                <p>ابعاد ورق واردشده: ضخامت ${fmt(t,1)}، عرض ${fmt(b,1)}، ارتفاع ${fmt(h,1)} میلی‌متر.</p>
                <div class="notice" style="color:#a65d16">
                    بارها با قدرمطلق و به‌صورت هم‌زمان از هر ترکیب بار بررسی شده‌اند؛ اثر علامت و جهت ممکن است در هندسه‌های نامتقارن مهم باشد.
                    این محاسبه فقط مدل الاستیک گروه جوش درون‌صفحه‌ای مستطیلی است و ظرفیت کامل اتصال را نشان نمی‌دهد.
                </div>`;
        } catch(e) {
            out.innerHTML='<div class="notice" style="color:#a65d16">'+String(e.message)+'</div>';
        }
    }
    window.SteelConnectionDesign={refreshActions,calculate};
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",createPanel);
    else createPanel();
})();

/* ===== steel2/js/connection-demand-registry.js ===== */
/* SAHROUD STEEL: signed simultaneous connection actions per load combination.
   Units: kN, kN.m. Data adapter only; no resistance/code check. */
(function(root){
"use strict";
const num=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))?Number(v):null;
function endActions(m,e){
 const s=e==="i"?"Start":"End";
 return {
  N:num(m["axial"+s]??m["N"+s]),
  Vy:num(m["shear"+s]??m["Vy"+s]),
  Mz:num(m["moment"+s]??m["Mz"+s]),
  Vz:num(m["shearZ"+s]??m["Vz"+s]),
  T:num(m["torsion"+s]??m["T"+s]),
  My:num(m["momentY"+s]??m["My"+s])
 };
}
function collect(combos){
 if(!Array.isArray(combos)||!combos.length)throw Error("نتایج تحلیل ترکیبات بار موجود نیست.");
 const out=[];
 combos.forEach((c,ci)=>{
  if(!Array.isArray(c.members))throw Error("ساختار اعضای ترکیب بار معتبر نیست.");
  c.members.forEach((m,mi)=>["i","j"].forEach(end=>{
   const actions=endActions(m,end);
   if(Object.values(actions).every(v=>v===null))return;
   out.push({combination:String(c.name||c.id||("ترکیب "+(ci+1))),memberName:String(m.name||m.id||("عضو "+(mi+1))),memberId:m.id??"",sectionKey:m.sectionKey??"",end,length:num(m.length),actions});
  }));
 });
 if(!out.length)throw Error("نیروی انتهایی قابل خواندن در نتایج تحلیل پیدا نشد.");
 return out;
}
function collectFromEnvelope(envelope,model){
 if(!envelope||!Array.isArray(envelope.members)||!Array.isArray(envelope.cases)||!envelope.cases.length)throw Error("پوش نیروی تحلیل همه ترکیبات در دسترس نیست؛ ابتدا «تحلیل همه ترکیبات و استخراج نیروها» را اجرا کنید.");
 if(envelope.allCasesEquilibriumOK!==true)throw Error("تعادل یک یا چند ترکیب بار تأیید نشده است؛ استخراج تقاضای اتصال متوقف شد.");
 if(envelope.caseLabelCoverageOK!==true||(envelope.unreportedMemberIds||[]).length||(envelope.extraMemberIds||[]).length||(envelope.invalidForceVectors||[]).length||(envelope.analysisMemberSetMismatchCases||[]).length||(envelope.duplicateMemberIdsByCase||[]).length)throw Error("پوش نیرو از نظر پوشش اعضا/ترکیبات کامل نیست؛ تقاضای اتصال قابل استخراج نیست.");
 const convention=envelope.localEndForceConvention;
 if(convention?.version!==1||convention?.basis!=="member-local")throw Error("قرارداد محور/علامت نیروهای محلی حل‌گر نامشخص است.");
 const modelMembers=Array.isArray(model?.members)?model.members:[];
 const byId=new Map(modelMembers.map(m=>[String(m.id),m]));
 if(byId.size!==modelMembers.length)throw Error("شناسه عضو مدل تکراری است؛ تطبیق نیروی اتصال ممکن نیست.");
 const physicalById=new Map(modelMembers.map(m=>[String(m.id),m]));
 const joints=collectJoints(model);
 if(!joints.success)throw Error("ممیزی توپولوژی مدل برای اتصال ناموفق است: "+joints.issues.slice(0,5).join("؛ "));
 const jointByNode=new Map(joints.joints.map(j=>[String(j.nodeId),j]));
 const expected=envelope.cases.map(x=>String(x.label||"").trim());
 if(expected.some(x=>!x)||new Set(expected).size!==expected.length)throw Error("نام ترکیبات بار خالی یا تکراری است.");
 const rows=[],seen=new Set();
 envelope.members.forEach(m=>{
  const id=String(m.id),parentId=String(m.parentMemberId||id),source=physicalById.get(id)||physicalById.get(parentId);
  if(!source)throw Error("عضو تحلیل‌شده "+id+" (عضو مادر "+parentId+") در مدل جاری پیدا نشد.");
  if(seen.has(id))throw Error("عضو تکراری در پوش نیرو: "+id);seen.add(id);
  const startNode=m.start??source.start,endNode=m.end??source.end;
  if(startNode==null||endNode==null)throw Error("گره ابتدا/انتهای عضو "+id+" در خروجی تحلیل موجود نیست.");
  const cases=Array.isArray(m.simultaneousCases)?m.simultaneousCases:[];
  const labels=cases.map(x=>String(x.label||""));
  if(cases.length!==expected.length||expected.some(x=>!labels.includes(x))||new Set(labels).size!==labels.length)throw Error("پوش ترکیبات عضو "+id+" ناقص یا تکراری است.");
  cases.forEach(c=>{
   const v=c.sourceVector;
   if(!Array.isArray(v)||v.length!==12||!v.every(Number.isFinite))throw Error("بردار ۱۲ مؤلفه‌ای نیرو برای عضو "+id+" / "+c.label+" معتبر نیست.");
   [["i",startNode,v.slice(0,6)],["j",endNode,v.slice(6,12)]].forEach(([end,nodeId,a])=>{
    const joint=jointByNode.get(String(nodeId));
    if(!joint)return;
    const values={N:a[0]/1000,Vy:a[1]/1000,Vz:a[2]/1000,T:a[3]/1000,My:a[4]/1000,Mz:a[5]/1000};
    rows.push({combination:String(c.label),memberName:String(source.name||source.label||m.name||id),memberId:id,parentMemberId:parentId,sectionKey:String(source.sectionKey||m.sectionKey||""),end,nodeId:String(nodeId),jointType:joint.type,jointLabel:joint.label,length:num(m.length??source.length),actions:values,rawActionsSI:{N:a[0],Vy:a[1],Vz:a[2],T:a[3],My:a[4],Mz:a[5]},forceConventionVersion:convention.version,actionBasis:"member-local solver element end action; sign retained; not joint resultant"});
   });
  });
 });
 if(!rows.length)throw Error("هیچ انتهای عضوی در گره‌های اتصال مشترک، نیروی معتبر ندارد.");
 return rows;
}
function collectFromCraneDemandTrace(trace,model){
 if(!trace||trace.success!==true||trace.simultaneousCasesPreserved!==true)throw Error("بسته ردیابی تقاضای جرثقیل معتبر یا کامل نیست.");
 if(!Array.isArray(trace.members)||!Array.isArray(trace.cases)||!trace.cases.length)throw Error("فهرست اعضا/حالات جرثقیل در بسته تقاضا ناقص است.");
 const joints=collectJoints(model);if(!joints.success)throw Error("ممیزی توپولوژی برای اتصال جرثقیل ناموفق است: "+joints.issues.slice(0,5).join("؛ "));
 const jointByNode=new Map(joints.joints.map(j=>[String(j.nodeId),j]));
 const memberById=new Map((model?.members||[]).map(m=>[String(m.id),m]));
 if(memberById.size!==(model?.members||[]).length)throw Error("شناسه اعضای مدل تکراری است.");
 const expected=trace.cases.map(x=>({caseIndex:x.caseIndex,referencePosition_m:Number(x.referencePosition_m),label:String(x.label||"")}));
 if(expected.some(x=>!Number.isInteger(x.caseIndex)||!Number.isFinite(x.referencePosition_m)||!x.label)||new Set(expected.map(x=>x.caseIndex)).size!==expected.length)throw Error("شناسه/موقعیت حالات جرثقیل نامعتبر یا تکراری است.");
 const rows=[],seen=new Set();
 trace.members.forEach(member=>{
  const id=String(member.memberId),physical=memberById.get(id);
  if(!physical)throw Error("عضو "+id+" در مدل فیزیکی فعلی وجود ندارد.");
  if(!member.startNodeId||!member.endNodeId||String(physical.start)!==String(member.startNodeId)||String(physical.end)!==String(member.endNodeId))throw Error("نگاشت ابتدا/انتهای عضو "+id+" با توپولوژی مدل یکسان نیست.");
  if(member.caseCount!==expected.length||!Array.isArray(member.cases)||member.cases.length!==expected.length)throw Error("پوش حالات عضو "+id+" کامل نیست.");
  member.cases.forEach(c=>{
   const exp=expected.find(x=>x.caseIndex===c.caseIndex);
   if(!exp||exp.referencePosition_m!==Number(c.referencePosition_m)||exp.label!==String(c.label))throw Error("شناسه/موقعیت حالت عضو "+id+" با فهرست حالات تحلیل تطبیق ندارد.");
   [["i",member.startNodeId,c.endI],["j",member.endNodeId,c.endJ]].forEach(([end,nodeId,action])=>{
    const joint=jointByNode.get(String(nodeId));if(!joint)return;
    if(!action||["N","Vy","Vz","T","My","Mz"].some(k=>!Number.isFinite(action[k])))throw Error("بردار نیرو/لنگر انتهای "+end+" عضو "+id+" ناقص است.");
    const key=[c.caseIndex,id,end].join("|");if(seen.has(key))throw Error("رکورد تکراری تقاضای جرثقیل: "+key);seen.add(key);
    const actions={N:action.N/1000,Vy:action.Vy/1000,Vz:action.Vz/1000,T:action.T/1000,My:action.My/1000,Mz:action.Mz/1000};
    rows.push({combination:exp.label,caseId:exp.caseIndex,referencePosition_m:exp.referencePosition_m,memberName:String(physical.name||physical.label||id),memberId:id,parentMemberId:id,sectionKey:String(physical.sectionKey||member.sectionKey||""),end,nodeId:String(nodeId),jointType:joint.type,jointLabel:joint.label,length:null,actions,rawActionsSI:{...action},localAxes:member.localAxes||null,actionBasis:"member-local crane position case; signed end action; not joint resultant"});
   });
  });
 });
 if(!rows.length)throw Error("هیچ انتهای عضو جرثقیل در گره اتصال مشترک مدل یافت نشد.");
 return rows;
}
function toCraneCsv(rows){
 const h=["حالت مستقل جرثقیل","شماره حالت","موقعیت جرثقیل m","عضو","شناسه","مقطع","انتها","گره اتصال","نوع اتصال","N kN","Vy kN","Vz kN","T kN.m","My kN.m","Mz kN.m"];
 return "\uFEFF"+[h,...rows.map(r=>[r.combination,r.caseId,r.referencePosition_m,r.memberName,r.memberId,r.sectionKey,r.end,r.nodeId,r.jointLabel,...["N","Vy","Vz","T","My","Mz"].map(k=>r.actions[k])])].map(a=>a.map(csvCell).join(",")).join("\r\n");
}
function memberLabel(key){
 const labels={column:"ستون",rafter:"رفتر",roofPurlin:"لاپه سقف",purlin:"لاپه",wallGirt:"وال‌پست/گیرت دیوار",roofBrace:"مهاربند سقف",wallBrace:"مهاربند دیوار",endPost:"ستونک انتهایی",endGirt:"تیر انتهایی",roofEdge:"عضو لبه سقف",craneRunwayGirder:"تیر حمال جرثقیل",tieBeam:"تیر رابط/شناژ",craneBracket:"کنسول جرثقیل"};
 return labels[key]||String(key||"عضو نامشخص");
}
function classifyJoint(node,members){
 const keys=new Set(members.map(x=>String(x.sectionKey||"")));
 if(["base","endwall-base"].includes(String(node.kind||"")))return {type:"base",label:"پای ستون / صفحه‌ستون"};
 if(keys.has("column")&&keys.has("rafter"))return {type:"knee",label:"اتصال زانویی ستون به رفتر"};
 if(keys.has("rafter")&&members.filter(x=>x.sectionKey==="rafter").length>=2)return {type:"ridge",label:"تاج / وصله رفتر"};
 if(keys.has("craneRunwayGirder")&&keys.has("column"))return {type:"crane",label:"تیر حمال / کنسول جرثقیل به ستون"};
 if((keys.has("roofBrace")||keys.has("wallBrace")))return {type:"brace",label:"اتصال مهاربند به عضو اصلی"};
 if((keys.has("roofPurlin")||keys.has("purlin"))&&keys.has("rafter"))return {type:"purlin",label:"اتصال لاپه به رفتر"};
 if(keys.has("wallGirt")&&keys.has("column"))return {type:"girt",label:"اتصال گیرت به ستون"};
 if(keys.has("tieBeam")&&keys.has("column"))return {type:"tie",label:"اتصال تیر رابط به ستون"};
 if(keys.has("endPost")||keys.has("endGirt"))return {type:"endwall",label:"اتصال اعضای قاب انتهایی"};
 return {type:"other",label:"گره اتصال چندعضوی"};
}
function collectJoints(model){
 const issues=[],nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!nodes.length||!members.length)return {success:false,issues:["مدل سه‌بعدی تولید نشده یا فاقد گره/عضو است."],joints:[],summary:{jointCount:0,unclassified:0}};
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n])),byNode=new Map();
 const memberIds=new Set();
 members.forEach(m=>{
  const id=String(m?.id??"");
  if(!id||memberIds.has(id)){issues.push("شناسه عضو خالی یا تکراری است: "+id);return;}
  memberIds.add(id);
  [["I",m.start],["J",m.end]].forEach(([end,nodeId])=>{
   const key=String(nodeId??"");
   if(!nodeMap.has(key)){issues.push("عضو "+id+" به گره "+key+" متصل نیست.");return;}
   const list=byNode.get(key)||[];
   list.push({memberId:id,sectionKey:String(m.sectionKey||""),name:String(m.name||m.label||id),end});
   byNode.set(key,list);
  });
 });
 const joints=[];
 byNode.forEach((connected,nodeId)=>{
  const node=nodeMap.get(nodeId);
  const distinct=[...new Map(connected.map(x=>[x.memberId,x])).values()];
  const isBase=["base","endwall-base"].includes(String(node.kind||""));
  if(distinct.length<2&&!isBase)return;
  const cls=classifyJoint(node,distinct);
  joints.push({nodeId,kind:String(node.kind||""),coordinates:{x:Number(node.x)||0,y:Number(node.y)||0,z:Number(node.z)||0},members:distinct,type:cls.type,label:cls.label,memberCount:distinct.length});
 });
 joints.sort((a,b)=>a.type.localeCompare(b.type)||a.nodeId.localeCompare(b.nodeId,undefined,{numeric:true}));
 return {success:issues.length===0,joints,issues,summary:{jointCount:joints.length,base:joints.filter(x=>x.type==="base").length,knee:joints.filter(x=>x.type==="knee").length,brace:joints.filter(x=>x.type==="brace").length,crane:joints.filter(x=>x.type==="crane").length,other:joints.filter(x=>!["base","knee","brace","crane"].includes(x.type)).length},scope:"گره‌های واقعی مشترک در توپولوژی مدل؛ فهرست‌برداری و تشخیص نوع اتصال است و به معنی طراحی مقاومت یا تأیید جزئیات نیست."};
}
const csvCell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
function toCsv(rows){
 const h=["ترکیب بار","عضو","شناسه","مقطع","انتها","گره اتصال","نوع اتصال","طول m","N kN","Vy kN","Vz kN","T kN.m","My kN.m","Mz kN.m"];
 return "\uFEFF"+[h,...rows.map(r=>[r.combination,r.memberName,r.memberId,r.sectionKey,r.end,r.nodeId||"",r.jointLabel||"",r.length,...["N","Vy","Vz","T","My","Mz"].map(k=>r.actions[k])])].map(a=>a.map(csvCell).join(",")).join("\r\n");
}
function test(){
 const f=[{name:"C1",members:[{id:1,name:"رفتر",length:5,axialStart:-100,shearStart:20,momentStart:30,axialEnd:-90,shearEnd:-10,momentEnd:0}]},{name:"C2",members:[{id:1,name:"رفتر",length:5,axialStart:80,shearStart:-35,momentStart:-45,axialEnd:70,shearEnd:15,momentEnd:0}]}];
 const r=collect(f),joint=collectJoints({nodes:[{id:"E",x:0,y:6,z:0,kind:"eave"},{id:"C",x:0,y:0,z:0,kind:"base"}],members:[{id:"COL",start:"C",end:"E",sectionKey:"column"},{id:"RAF",start:"E",end:"E",sectionKey:"rafter"}]});
 const checks=[
 ["هر دو ترکیب حفظ می‌شوند",r.length===4],
 ["علامت نیرو حفظ می‌شود",r[0].actions.N===-100&&r[2].actions.N===80],
 ["نیروهای هم‌زمان حفظ می‌شوند",r[0].actions.Vy===20&&r[2].actions.Vy===-35],
 ["جهت ابتدا و انتها حفظ می‌شود",r[0].end==="i"&&r[1].end==="j"],
 ["مؤلفه ناموجود جعل نمی‌شود",r[0].actions.Vz===null&&r[0].actions.T===null],
 ["CSV شامل همه رکوردهاست",toCsv(r).split("\r\n").length===5],
 ["فهرست اتصال، زانویی و پای ستون را از توپولوژی می‌سازد",joint.success&&joint.joints.some(x=>x.type==="knee")&&joint.joints.some(x=>x.type==="base")],
 ["تقاضای اتصال از بردار هم‌زمان حل‌گر و گره صحیح استخراج می‌شود",(()=>{const model={nodes:[{id:"A",x:0,y:0,z:0,kind:"base"},{id:"B",x:0,y:5,z:0,kind:"eave"},{id:"C",x:5,y:6,z:0}],members:[{id:"COL",start:"A",end:"B",sectionKey:"column"},{id:"RAF",start:"B",end:"C",sectionKey:"rafter"}]};const v=[1000,2000,3000,4000,5000,6000,-1000,-2000,-3000,-4000,-5000,-6000];const env={allCasesEquilibriumOK:true,caseLabelCoverageOK:true,unreportedMemberIds:[],invalidForceVectors:[],analysisMemberSetMismatchCases:[],localEndForceConvention:{version:1,basis:"member-local"},cases:[{label:"U1"}],members:[{id:"COL",simultaneousCases:[{label:"U1",sourceVector:v}]},{id:"RAF",simultaneousCases:[{label:"U1",sourceVector:v}]}]};const x=collectFromEnvelope(env,model);const row=x.find(z=>z.memberId==="COL"&&z.end==="j");return row?.nodeId==="B"&&row.jointType==="knee"&&row.actions.N===-1&&row.rawActionsSI.Mz===-6000; })()],
 ["قطعات تحلیل‌شده تیرورق به عضو مادر و گره‌های فیزیکی وصل می‌شوند",(()=>{const model={nodes:[{id:"A",x:0,y:0,z:0,kind:"base"},{id:"B",x:0,y:5,z:0,kind:"eave"},{id:"C",x:2.5,y:5.5,z:0},{id:"D",x:5,y:6,z:0}],members:[{id:"COL",start:"A",end:"B",sectionKey:"column"},{id:"RAF",start:"B",end:"D",sectionKey:"rafter"}]};const v=[1,2,3,4,5,6,-1,-2,-3,-4,-5,-6];const env={allCasesEquilibriumOK:true,caseLabelCoverageOK:true,unreportedMemberIds:[],extraMemberIds:[],invalidForceVectors:[],analysisMemberSetMismatchCases:[],duplicateMemberIdsByCase:[],localEndForceConvention:{version:1,basis:"member-local"},cases:[{label:"U1"}],members:[{id:"COL",start:"A",end:"B",simultaneousCases:[{label:"U1",sourceVector:v}]},{id:"RAF-S1",parentMemberId:"RAF",start:"B",end:"C",simultaneousCases:[{label:"U1",sourceVector:v}]},{id:"RAF-S2",parentMemberId:"RAF",start:"C",end:"D",simultaneousCases:[{label:"U1",sourceVector:v}]}]};const x=collectFromEnvelope(env,model);return x.some(z=>z.memberId==="RAF-S1"&&z.nodeId==="B"&&z.jointType==="knee"&&z.parentMemberId==="RAF")&&!x.some(z=>z.memberId==="RAF-S2"&&z.nodeId==="C");})()],
 ["ردیابی جرثقیل در محل اتصال واقعی با حفظ حالت و موقعیت نگاشت می‌شود",(()=>{const model={nodes:[{id:"B",x:0,y:0,z:0,kind:"base"},{id:"T",x:0,y:5,z:0,kind:"eave"},{id:"R",x:2,y:5,z:0}],members:[{id:"C",start:"B",end:"T",sectionKey:"column"},{id:"G",start:"T",end:"R",sectionKey:"craneRunwayGirder"}]};const action={N:1000,Vy:2000,Vz:3000,T:4000,My:5000,Mz:6000};const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:3,label:"CRANE-1 @ 3.0000 m"}],members:[{memberId:"C",sectionKey:"column",startNodeId:"B",endNodeId:"T",caseCount:1,cases:[{caseIndex:0,referencePosition_m:3,label:"CRANE-1 @ 3.0000 m",endI:action,endJ:action}]},{memberId:"G",sectionKey:"craneRunwayGirder",startNodeId:"T",endNodeId:"R",caseCount:1,cases:[{caseIndex:0,referencePosition_m:3,label:"CRANE-1 @ 3.0000 m",endI:action,endJ:action}]}]};const x=collectFromCraneDemandTrace(trace,model);const row=x.find(r=>r.memberId==="C"&&r.end==="j");return row?.nodeId==="T"&&row.jointType==="crane"&&row.actions.N===1&&row.rawActionsSI.Mz===6000&&row.referencePosition_m===3;})()],
 ["ردیابی جرثقیل با توپولوژی یا موقعیت نامنطبق رد می‌شود",(()=>{const model={nodes:[{id:"B",x:0,y:0,z:0,kind:"base"},{id:"T",x:0,y:5,z:0}],members:[{id:"C",start:"B",end:"T",sectionKey:"column"}]};const action={N:0,Vy:0,Vz:0,T:0,My:0,Mz:0};const trace={success:true,simultaneousCasesPreserved:true,cases:[{caseIndex:0,referencePosition_m:3,label:"CASE-1"}],members:[{memberId:"C",startNodeId:"B",endNodeId:"WRONG",caseCount:1,cases:[{caseIndex:0,referencePosition_m:3,label:"CASE-1",endI:action,endJ:action}]}]};try{collectFromCraneDemandTrace(trace,model);return false;}catch(e){return true;}})()],
 ["تقاضای اتصال با پوش ترکیبات ناقص مسدود می‌شود",(()=>{const env={allCasesEquilibriumOK:true,caseLabelCoverageOK:true,unreportedMemberIds:[],invalidForceVectors:[],analysisMemberSetMismatchCases:[],localEndForceConvention:{version:1,basis:"member-local"},cases:[{label:"U1"},{label:"U2"}],members:[]};try{collectFromEnvelope(env,{nodes:[],members:[]});return false;}catch(e){return true;}})()]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
function mount(){
 if(!root.document||document.getElementById("connectionDemandRegistryPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="connectionDemandRegistryPanel";p.setAttribute("data-focus-group","connections");
 p.innerHTML=`<div class="panel-title"><h3>بانک نیروهای انتهایی اتصالات</h3></div>
 <div class="notice">نیروهای انتهایی مستقیماً از پوش تحلیل سه‌بعدی همه ترکیبات استخراج می‌شوند. هر ردیف به گره واقعی اتصال و انتهای عضو وصل است؛ مؤلفه‌ها در محور محلی عضو و با علامت حل‌گر حفظ می‌شوند و برآیند گره فرض نمی‌شود.</div>
 <div class="form-grid"><div class="field"><label for="connDemandMember">عضو</label><select id="connDemandMember"><option value="">همه اعضا</option></select></div><div class="field"><label for="connDemandEnd">انتها</label><select id="connDemandEnd"><option value="">هر دو انتها</option><option value="i">ابتدا (i)</option><option value="j">انتها (j)</option></select></div></div>
 <div class="button-grid"><button id="btnBuildConnectionDemand" class="btn primary">استخراج نیروهای اتصال از تحلیل</button><button id="btnAuditConnectionJoints" class="btn secondary">ممیزی محل اتصال همه اجزا</button><button id="btnRunAllConnectionScreens" class="btn primary">اجرای کنترل‌های اتصال موجود</button><button id="btnExportConnectionDemand" class="btn secondary" disabled>خروجی CSV</button></div><div id="connectionScreenRunSummary" class="notice">این دکمه فقط کنترل‌های موجود و محدود را اجرا می‌کند؛ اتصال فاقد موتور طراحی همچنان طراحی‌نشده می‌ماند.</div>
 <div id="connectionJointSummary" class="notice">برای فهرست‌برداری محل اتصال اعضا، ابتدا مدل سه‌بعدی را تولید کنید.</div><div id="connectionJointTable" style="overflow-x:auto"></div>
 <div class="drawing-area"><svg viewBox="0 0 600 130" style="width:100%;height:auto"><rect x="55" y="25" width="12" height="75" fill="#64748b"/><rect x="533" y="25" width="12" height="75" fill="#64748b"/><line x1="67" y1="62" x2="533" y2="62" stroke="#31566a" stroke-width="10"/><path d="M95 15 L75 15 L84 8 M75 15 L84 22 M505 15 L525 15 L516 8 M525 15 L516 22" fill="none" stroke="#0b7285" stroke-width="2.5"/><text x="60" y="120" text-anchor="middle" fill="currentColor">i</text><text x="539" y="120" text-anchor="middle" fill="currentColor">j</text></svg></div>
 <div id="connectionDemandSummary" class="notice">پس از اجرای تحلیل ترکیبات بار، استخراج را اجرا کنید.</div><div id="connectionDemandTable" style="overflow-x:auto"></div>
 <div class="notice" style="color:#a65d16">خروجی فعلی، N، برش محلی و لنگر محلی را از ساختار موجود می‌خواند. برش خارج از صفحه، پیچش و لنگر دوم فقط در صورت وجود صریح در خروجی حلگر ثبت می‌شوند. این بانک داده، ظرفیت یا تأیید آیین‌نامه‌ای اتصال صادر نمی‌کند.</div>`;
 const anchor=document.getElementById("connectionDesignPanel")||document.getElementById("cantileverCheckPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 const params=new URLSearchParams(root.location?.search||"");
 if(params.get("focus")==="connections"){
  document.body.classList.add("focus-mode");
  document.querySelectorAll("[data-focus-group]").forEach(function(panel){panel.classList.remove("focus-visible");});
  p.classList.add("focus-visible");
  const nav=document.getElementById("focusWorkspaceNav");
  if(nav){nav.querySelectorAll("[data-focus-link]").forEach(function(link){link.removeAttribute("aria-current");});const active=nav.querySelector('[data-focus-link="connections"]');if(active)active.setAttribute("aria-current","page");}
  const caption=document.getElementById("focusWorkspaceCaption");if(caption)caption.textContent="حالت نمایش متمرکز: اتصالات و محل اتصال اجزا؛ برای بازگشت، «نمایش همه بخش‌ها» را انتخاب کنید.";
  window.setTimeout(function(){p.scrollIntoView({behavior:"auto",block:"start"});},100);
 }
 let records=[];const $=id=>document.getElementById(id),fmt=v=>v===null?"—":Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3}),esc=v=>String(v??"").replace(/[&<>"\']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#39;"}[ch]));
 function render(){
  const m=$("connDemandMember").value,e=$("connDemandEnd").value;
  const rows=records.filter(r=>(!m||r.memberName===m)&&(!e||r.end===e));
  $("connectionDemandSummary").textContent="رکوردهای قابل نمایش: "+rows.length+"؛ هر ردیف = یک عضو، یک انتها و یک ترکیب بار.";
  $("connectionDemandTable").innerHTML=rows.length?`<table style="width:100%;min-width:850px;border-collapse:collapse"><thead><tr><th>ترکیب</th><th>عضو</th><th>انتها</th><th>گره</th><th>نوع اتصال</th><th>N</th><th>Vy</th><th>Vz</th><th>T</th><th>My</th><th>Mz</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.combination)}</td><td>${esc(r.memberName)}</td><td>${esc(r.end)}</td><td>${esc(r.nodeId||"—")}</td><td>${esc(r.jointLabel||"—")}</td>${["N","Vy","Vz","T","My","Mz"].map(k=>"<td>"+fmt(r.actions[k])+"</td>").join("")}</tr>`).join("")}</tbody></table>`:"<p>رکوردی یافت نشد.</p>";
 }
 $("btnRunAllConnectionScreens").addEventListener("click",()=>{
  const tasks=[
   ["btnKneeExtract","استخراج هندسه اتصال زانویی"],
   ["btnBraceConnectionRefresh","به‌روزرسانی داده اتصالات مهاربند"],
   ["btnBraceGussetStrengthRun","غربال گاست‌پلیت مهاربند"],
   ["btnBraceBoltStrengthRun","غربال پیچ مهاربند"],
   ["btnBraceWeldStrengthRun","غربال جوش مهاربند"],
   ["btnConnectionCheck","غربال محدود گروه جوش کنسول"]
  ];
  const done=[],missing=[];
  tasks.forEach(([id,label])=>{const button=$(id);if(button&&!button.disabled){button.click();done.push(label);}else missing.push(label);});
  $("connectionScreenRunSummary").textContent="کنترل‌های موجود اجرا/درخواست شدند: "+done.join("؛ ")+"."+(missing.length?" کنترل/بخش در دسترس نیست یا هنوز بارگذاری نشده: "+missing.join("؛ "):"")+" توجه: اجرای غربال محدود به معنی طراحی کامل یا تأیید اتصال نیست.";
 });
 $("btnAuditConnectionJoints").addEventListener("click",()=>{
  const host=$("connectionJointSummary"),table=$("connectionJointTable");
  try{
   const result=collectJoints(root.SteelStructuralModel?.getData?.());
   host.textContent="گره‌های اتصال شناسایی‌شده: "+result.summary.jointCount+"؛ زانویی: "+result.summary.knee+"؛ پای ستون: "+result.summary.base+"؛ مهاربند: "+result.summary.brace+"؛ جرثقیل: "+result.summary.crane+"؛ سایر: "+result.summary.other+".";
   const status=x=>x.type==="knee"?"هندسه مفهومی موجود؛ مقاومت و جزئیات ساخت ناقص":x.type==="brace"?"رجیستر اتصال مهاربند؛ نیازمند تکمیل و کنترل":x.type==="base"?"طراحی صفحه‌ستون/انکر نیازمند کنترل مستقل":x.type==="crane"?"اتصال تیر حمال/کنسول نیازمند طراحی": "طراحی مقاومت و جزئیات اجرایی در این مرحله تأیید نشده";
   table.innerHTML=(result.joints.length?'<table class="data-table" style="min-width:900px;width:100%"><thead><tr><th>گره</th><th>نوع اتصال</th><th>مختصات (m)</th><th>اعضای متصل</th><th>وضعیت طراحی اتصال</th></tr></thead><tbody>'+result.joints.map(j=>'<tr><td>'+esc(j.nodeId)+'</td><td>'+esc(j.label)+'</td><td>'+fmt(j.coordinates.x)+'، '+fmt(j.coordinates.y)+'، '+fmt(j.coordinates.z)+'</td><td>'+j.members.map(m=>esc(memberLabel(m.sectionKey))+" ["+esc(m.memberId)+"/"+m.end+"]").join("؛ ")+'</td><td>'+esc(status(j))+'</td></tr>').join("")+'</tbody></table>':"گره اتصال مشترک/پایه‌ای در مدل پیدا نشد.")+(result.issues.length?'<ul>'+result.issues.map(esc).map(x=>"<li>"+x+"</li>").join("")+"</ul>":"");
  }catch(e){host.textContent="ممیزی اتصال انجام نشد: "+String(e.message||e);table.innerHTML="";}
 });
 $("btnBuildConnectionDemand").addEventListener("click",()=>{
  try{
   records=collectFromEnvelope(root.SteelMemberForceEnvelope?.getLast?.(),root.SteelStructuralModel?.getData?.());
   const s=$("connDemandMember"),old=s.value,names=[...new Set(records.map(r=>r.memberName))];
   s.innerHTML='<option value="">همه اعضا</option>'+names.map(n=>'<option>'+n.replace(/[&<>]/g,"")+'</option>').join("");
   s.value=names.includes(old)?old:"";$("btnExportConnectionDemand").disabled=false;render();
   $("connectionDemandSummary").textContent="تقاضا از تحلیل سه‌بعدی همه ترکیبات استخراج شد: "+records.length+" انتهای عضو در گره‌های اتصال؛ نیرو kN و لنگر kN.m. علامت و محور محلی حفظ شده است؛ این داده‌ها برآیند گره نیستند.";
  }catch(e){records=[];$("btnExportConnectionDemand").disabled=true;$("connectionDemandSummary").textContent=e.message;$("connectionDemandTable").innerHTML="";}
 });
$("connDemandMember").addEventListener("change",render);$("connDemandEnd").addEventListener("change",render);
 $("btnExportConnectionDemand").addEventListener("click",()=>{if(!records.length)return;const u=URL.createObjectURL(new Blob([toCsv(records)],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download="sahroud-steel-connection-demands.csv";a.click();URL.revokeObjectURL(u);});
}
root.SteelConnectionDemandRegistry={collect,collectFromEnvelope,collectFromCraneDemandTrace,toCsv,toCraneCsv,test,endActions,collectJoints};
if(typeof module!=="undefined"&&module.exports)module.exports=root.SteelConnectionDemandRegistry;
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/knee-connection-geometry.js ===== */
/* SAHROUD STEEL - knee connection geometry stage; not a resistance design. */
(function(w){
"use strict";
const $=id=>document.getElementById(id),N=v=>Number.isFinite(Number(v))?Number(v):null;
function node(m,id){return m.nodes.find(n=>String(n.id)===String(id));}
function unit(v){const l=Math.hypot(v.x,v.y,v.z);if(!(l>0))throw Error("بردار عضو نامعتبر است.");return{x:v.x/l,y:v.y/l,z:v.z/l};}
function extract(m){
 if(!m||!Array.isArray(m.nodes)||!Array.isArray(m.members))throw Error("ابتدا مدل سه‌بعدی را تولید کنید.");
 const out=[];
 m.nodes.filter(n=>n.kind==="eave").forEach(n=>{
  const col=m.members.find(x=>x.sectionKey==="column"&&(x.start===n.id||x.end===n.id));
  const raf=m.members.filter(x=>x.sectionKey==="rafter"&&x.axis==="transverse"&&!x.endFace&&(x.start===n.id||x.end===n.id));
  if(!col)return;
  raf.forEach(r=>{
   const cn=node(m,col.start===n.id?col.end:col.start),rn=node(m,r.start===n.id?r.end:r.start);if(!cn||!rn)return;
   const vc=unit({x:cn.x-n.x,y:cn.y-n.y,z:cn.z-n.z}),vr=unit({x:rn.x-n.x,y:rn.y-n.y,z:rn.z-n.z});
   out.push({id:"F"+r.frame+"-"+(n.x<=m.geometry.span/2?"left":"right"),frame:r.frame,side:n.x<=m.geometry.span/2?"left":"right",node:n,column:{id:col.id,length:Math.hypot(cn.x-n.x,cn.y-n.y,cn.z-n.z),vector:vc},rafter:{id:r.id,length:Math.hypot(rn.x-n.x,rn.y-n.y,rn.z-n.z),vector:vr},angle:Math.acos(Math.max(-1,Math.min(1,vc.x*vr.x+vc.y*vr.y+vc.z*vr.z)))*180/Math.PI});
  });
 });
 return out.sort((a,b)=>a.frame-b.frame||a.side.localeCompare(b.side));
}
function check(k,p){
 const errors=[],warnings=["این آرایش فقط کنترل جاگیری هندسی است؛ مقاومت پیچ، ورق، جوش، بلوک برشی، لهیدگی، اثر اهرمی و الزامات آیین‌نامه‌ای بررسی نشده‌اند.","ورق در نمای قاب یک پوش مفهومی است، نه جزئیات واقعی ساخت یا اتصال مصوب."];
 ["w","h","t","d","dh","edge","pitch","gauge","rows","cols"].forEach(x=>{if(!(p[x]>0))errors.push(x+" باید مثبت باشد.");});
 if(p.dh<=p.d)errors.push("قطر سوراخ باید از قطر پیچ بزرگ‌تر باشد.");
 if(!Number.isInteger(p.rows)||p.rows<2||!Number.isInteger(p.cols)||p.cols<2)errors.push("حداقل دو ردیف و دو ستون پیچ لازم است.");
 const rw=2*p.edge+(p.cols-1)*p.gauge+p.dh,rh=2*p.edge+(p.rows-1)*p.pitch+p.dh;
 if(p.w<rw)errors.push("عرض ورق ناکافی؛ حداقل هندسی "+rw.toFixed(1)+" mm.");
 if(p.h<rh)errors.push("طول ورق ناکافی؛ حداقل هندسی "+rh.toFixed(1)+" mm.");
 return{valid:!errors.length,errors,warnings,rw,rh};
}
function drawing(k,p){
 const x=350,y=285,s=210,cv=k.column.vector,rv=k.rafter.vector;
 const cp={x:x+cv.x*Math.min(1.3,k.column.length)*s,y:y-cv.y*Math.min(1.3,k.column.length)*s},rp={x:x+rv.x*Math.min(1.7,k.rafter.length)*s,y:y-rv.y*Math.min(1.7,k.rafter.length)*s};
 const a=Math.atan2(-(cv.y+rv.y),cv.x+rv.x),u={x:Math.cos(a),y:Math.sin(a)},v={x:-Math.sin(a),y:Math.cos(a)};
 const W=Math.min(230,Math.max(100,p.w*.28)),H=Math.min(300,Math.max(120,p.h*.28));
 const poly=[[-W/2,-H/2],[W/2,-H/2],[W/2,H/2],[-W/2,H/2]].map(([i,j])=>(x+i*u.x+j*v.x)+","+(y+i*u.y+j*v.y)).join(" ");
 const bolts=[];for(let i=0;i<Math.min(5,p.rows);i++)for(let j=0;j<Math.min(5,p.cols);j++){const a1=(j/(p.cols-1)-.5)*W*.72,b1=(i/(p.rows-1)-.5)*H*.72;bolts.push([x+a1*u.x+b1*v.x,y+a1*u.y+b1*v.y]);}
 return '<svg viewBox="0 0 700 410" style="width:100%;height:auto;background:#f8fafc"><line x1="'+x+'" y1="'+y+'" x2="'+cp.x+'" y2="'+cp.y+'" stroke="#176b9b" stroke-width="24"/><line x1="'+x+'" y1="'+y+'" x2="'+rp.x+'" y2="'+rp.y+'" stroke="#d97706" stroke-width="20"/><polygon points="'+poly+'" fill="#0f766e" fill-opacity=".2" stroke="#0f766e" stroke-width="3"/>'+bolts.map(b=>'<circle cx="'+b[0]+'" cy="'+b[1]+'" r="5" fill="white" stroke="#111827" stroke-width="2"/>').join("")+'<circle cx="'+x+'" cy="'+y+'" r="6" fill="#b91c1c"/><text x="20" y="25" fill="#176b9b">ستون '+k.column.id+'</text><text x="520" y="25" fill="#b45309">رفتر '+k.rafter.id+'</text><text x="20" y="390" fill="#334155">نمای قاب؛ ورق و پیچ‌ها صرفاً مفهومی و غیر اجرایی</text></svg>';
}
function drawing3D(k,p){
 const sc=95,ox=340,oy=270,P=(x,y,z)=>({x:ox+(x*.82+z*.48)*sc,y:oy-(y*.82-z*.30)*sc});
 const cl=Math.min(1.25,k.column.length),rl=Math.min(1.55,k.rafter.length);
 const a=P(0,0,0),b=P(k.column.vector.x*cl,k.column.vector.y*cl,k.column.vector.z*cl),d=P(k.rafter.vector.x*rl,k.rafter.vector.y*rl,k.rafter.vector.z*rl);
 const w=Math.min(.85,Math.max(.35,(p.w||500)/1000)),h=Math.min(1,Math.max(.4,(p.h||650)/1000));
 const pts=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>P(x,y,0)).map(q=>q.x+","+q.y).join(" ");
 const rows=Math.max(2,Math.min(5,Number(p.rows)||4)),cols=Math.max(2,Math.min(5,Number(p.cols)||3)),bolts=[];
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const x=(j/(cols-1)-.5)*w*.65,y=(i/(rows-1)-.5)*h*.65;bolts.push(P(x,y,.025));}
 return '<svg viewBox="0 0 700 410" role="img" aria-label="شماتیک سه بعدی اتصال زانویی" style="width:100%;height:auto;background:#f8fafc"><line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#176b9b" stroke-width="32"/><line x1="'+a.x+'" y1="'+a.y+'" x2="'+d.x+'" y2="'+d.y+'" stroke="#d97706" stroke-width="27"/><polygon points="'+pts+'" fill="#0f766e" fill-opacity=".22" stroke="#0f766e" stroke-width="3"/>'+bolts.map(q=>'<circle cx="'+q.x+'" cy="'+q.y+'" r="5" fill="#fff" stroke="#111827" stroke-width="2"/>').join("")+'<circle cx="'+a.x+'" cy="'+a.y+'" r="6" fill="#b91c1c"/><text x="18" y="26" fill="#176b9b">ستون '+k.column.id+'</text><text x="510" y="26" fill="#b45309">رفتر '+k.rafter.id+'</text><text x="18" y="390" fill="#334155">ایزومتریک مفهومی؛ نه نقشه ساخت</text></svg>';
}
function test(){
 const m={geometry:{span:12},nodes:[{id:"E",x:0,y:6,z:0,kind:"eave"},{id:"C",x:0,y:0,z:0},{id:"R",x:6,y:7.2,z:0}],members:[{id:"COL",start:"C",end:"E",sectionKey:"column"},{id:"RAF",start:"E",end:"R",sectionKey:"rafter",axis:"transverse",frame:1}]};
 const k=extract(m)[0],p={w:500,h:650,t:16,d:20,dh:22,edge:50,pitch:120,gauge:100,rows:4,cols:3},v=check(k,p),bad=check(k,{...p,w:100});
 const c=[!!k&&k.node.id==="E",k.column.id==="COL"&&k.rafter.id==="RAF",Math.abs(k.angle-101.31)<.02,v.valid,!bad.valid,v.warnings.length===2];
 return{passed:c.filter(Boolean).length,total:c.length,checks:c};
}
function mount(){
 if(!$("kneeConnectionGeometryPanel")){
 const p=document.createElement("section");p.className="panel";p.id="kneeConnectionGeometryPanel";
 p.innerHTML='<div class="panel-title"><h3>اتصال زانویی ستون به رفتر ـ هندسه اولیه</h3><span class="status">مرحله هندسی</span></div><div class="notice">گره مشترک از مدل سه‌بعدی استخراج می‌شود. این مرحله هندسه و جاگیری اولیه را بررسی می‌کند؛ ظرفیت اتصال و نقشه ساخت هنوز طراحی نشده‌اند.</div><div class="form-grid"><div class="field"><label for="kneeSelect">قاب و سمت</label><select id="kneeSelect"></select></div><div class="field"><label for="kneeW">عرض پوش ورق (mm)</label><input id="kneeW" type="number" value="500"></div><div class="field"><label for="kneeH">طول پوش ورق (mm)</label><input id="kneeH" type="number" value="650"></div><div class="field"><label for="kneeT">ضخامت ورق (mm)</label><input id="kneeT" type="number" value="16"></div><div class="field"><label for="kneeD">قطر پیچ (mm)</label><input id="kneeD" type="number" value="20"></div><div class="field"><label for="kneeDh">قطر سوراخ (mm)</label><input id="kneeDh" type="number" value="22"></div><div class="field"><label for="kneeRows">ردیف پیچ</label><input id="kneeRows" type="number" value="4"></div><div class="field"><label for="kneeCols">ستون پیچ</label><input id="kneeCols" type="number" value="3"></div><div class="field"><label for="kneePitch">گام ردیف (mm)</label><input id="kneePitch" type="number" value="120"></div><div class="field"><label for="kneeGauge">فاصله ستون‌ها (mm)</label><input id="kneeGauge" type="number" value="100"></div><div class="field"><label for="kneeEdge">فاصله لبه (mm)</label><input id="kneeEdge" type="number" value="50"></div></div><div class="button-grid"><button id="btnKneeExtract" class="btn primary">استخراج زانویی‌ها</button><button id="btnKneeImportDemands" class="btn primary">دریافت نیروهای واقعی زانویی از تحلیل</button><button id="btnKneeCsv" class="btn secondary" disabled>خروجی CSV</button></div><div id="kneeSummary" class="notice">مدل سه‌بعدی را تولید کنید.</div><div id="kneeDemandSummary" class="notice">برای دریافت تقاضای اتصال، ابتدا تحلیل همه ترکیبات بار را اجرا کنید.</div><div id="kneeDemandTable" style="overflow-x:auto"></div><h4>نمای دوبعدی در صفحه قاب</h4><div id="kneeDrawing" class="drawing-area"></div><h4>نمای سه‌بعدی ایزومتریک مفهومی</h4><div id="kneeDrawing3D" class="drawing-area"></div><div id="kneeChecks" class="notice"></div>';
 const anchor=$("connectionDemandRegistryPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else document.querySelector("main")?.appendChild(p);
 }
 let knees=[],selected=null;const ids=["kneeW","kneeH","kneeT","kneeD","kneeDh","kneeRows","kneeCols","kneePitch","kneeGauge","kneeEdge"];
 const read=()=>({w:N($("kneeW").value),h:N($("kneeH").value),t:N($("kneeT").value),d:N($("kneeD").value),dh:N($("kneeDh").value),rows:N($("kneeRows").value),cols:N($("kneeCols").value),pitch:N($("kneePitch").value),gauge:N($("kneeGauge").value),edge:N($("kneeEdge").value)});
 function render(){selected=knees.find(k=>k.id===$("kneeSelect").value);if(!selected)return;const p=read(),v=check(selected,p),fmt=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:3});$("kneeSummary").innerHTML='<b>قاب '+selected.frame+' ـ '+(selected.side==="left"?"چپ":"راست")+'</b><br>گره: '+selected.node.id+'؛ مختصات X/Y/Z: '+[selected.node.x,selected.node.y,selected.node.z].map(fmt).join(" / ")+' m<br>ستون: '+selected.column.id+'، قطعه مجاور '+fmt(selected.column.length)+' m؛ رفتر: '+selected.rafter.id+'، قطعه مجاور '+fmt(selected.rafter.length)+' m<br>زاویه بین امتداد دو عضو از گره: '+fmt(selected.angle)+'°';$("kneeDrawing").innerHTML=drawing(selected,p);$("kneeDrawing3D").innerHTML=drawing3D(selected,p);$("kneeChecks").innerHTML=(v.valid?"جاگیری هندسی اولیه مناسب است.":"جاگیری هندسی نیازمند اصلاح است.")+(v.errors.length?"<ul>"+v.errors.map(e=>"<li>"+e+"</li>").join("")+"</ul>":"")+"<ul>"+v.warnings.map(w=>"<li>"+w+"</li>").join("")+"</ul>";}
 function importKneeDemands(){
  const host=$("kneeDemandSummary"),table=$("kneeDemandTable");
  try{
   if(!selected)throw Error("ابتدا زانویی موردنظر را انتخاب کنید.");
   if(!w.SteelConnectionDemandRegistry?.collectFromEnvelope)throw Error("ماژول بانک تقاضای اتصال بارگذاری نشده است.");
   const model=w.SteelStructuralModel?.getData?.();
   const rows=w.SteelConnectionDemandRegistry.collectFromEnvelope(w.SteelMemberForceEnvelope?.getLast?.(),model);
   const craneEnvelope=w.SteelCrane3DLoadTransfer?.getLastAutomaticEnvelope?.();
   let craneRows=[];
   if(craneEnvelope?.success===true){
    if(!craneEnvelope.demandTraceAudit?.success)throw Error("جاروب جرثقیل موجود است اما بسته ردیابی تقاضای آن کامل نیست؛ داده ناقص به زانویی افزوده نشد.");
    craneRows=w.SteelConnectionDemandRegistry.collectFromCraneDemandTrace(craneEnvelope.demandTraceAudit,model);
   }
   const combined=[...rows,...craneRows];
   const relevant=combined.filter(r=>String(r.nodeId)===String(selected.node.id)&&
    ((String(r.memberId)===String(selected.column.id)||String(r.parentMemberId)===String(selected.column.id))||
     (String(r.memberId)===String(selected.rafter.id)||String(r.parentMemberId)===String(selected.rafter.id))));
   if(!relevant.length)throw Error("برای دو عضو زانویی انتخاب‌شده در گره "+selected.node.id+" تقاضای قابل تطبیق پیدا نشد.");
   const fmt=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:3});
   const keys=["N","Vy","Vz","T","My","Mz"];
   const craneCount=relevant.filter(r=>r.referencePosition_m!==undefined).length;
   host.textContent="تقاضای انتهای اعضای زانویی: "+relevant.length+" رکورد؛ از این تعداد "+craneCount+" رکورد مربوط به موقعیت‌های مستقل جرثقیل است. "+(craneEnvelope?.success===true?"ردیابی جرثقیل به‌صورت جداگانه و با موقعیت واقعی حفظ شد.":"برای افزودن اثر جرثقیل، جاروب کامل موقعیت‌های جرثقیل را اجرا کنید.")+" واحد نیرو kN و لنگر kN.m؛ محورهای محلی هر عضو حفظ شده‌اند و این داده‌ها برآیند مشترک گره یا طراحی ظرفیت نیستند.";
   table.innerHTML='<table class="data-table" style="min-width:1050px;width:100%"><thead><tr><th>ترکیب</th><th>عضو</th><th>قطعه تحلیل</th><th>انتها</th><th>گره</th>'+keys.map(k=>'<th>'+k+'</th>').join("")+'</tr></thead><tbody>'+relevant.map(r=>'<tr><td>'+r.combination+'</td><td>'+r.parentMemberId+'</td><td>'+r.memberId+'</td><td>'+r.end+'</td><td>'+r.nodeId+'</td>'+keys.map(k=>'<td>'+fmt(r.actions[k])+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
  }catch(e){host.textContent="دریافت تقاضای زانویی انجام نشد: "+String(e.message||e);table.innerHTML="";}
 }
 function refresh(){try{knees=extract(w.SteelStructuralModel?.model||w.SteelStructuralModel?.build?.());const s=$("kneeSelect"),old=s.value;s.innerHTML=knees.map(k=>'<option value="'+k.id+'">قاب '+k.frame+' ـ '+(k.side==="left"?"چپ":"راست")+'</option>').join("");if(!knees.length)throw Error("زانویی مشترک ستون و رفتر در مدل پیدا نشد.");s.value=knees.some(k=>k.id===old)?old:knees[0].id;render();$("btnKneeCsv").disabled=false;}catch(e){$("kneeSummary").textContent=e.message;$("btnKneeCsv").disabled=true;}}
 $("btnKneeExtract").addEventListener("click",refresh);$("btnKneeImportDemands").addEventListener("click",importKneeDemands);$("kneeSelect").addEventListener("change",render);ids.forEach(id=>$(id).addEventListener("input",render));
 $("btnKneeCsv").addEventListener("click",()=>{if(!knees.length)return;const rows=[["Frame","Side","Node","X_m","Y_m","Z_m","Column","Rafter","Angle_deg","PlateW_mm","PlateH_mm","PlateT_mm","BoltD_mm","HoleD_mm","Rows","Cols","Pitch_mm","Gauge_mm","Edge_mm"]];knees.forEach(k=>{const p=read();rows.push([k.frame,k.side,k.node.id,k.node.x,k.node.y,k.node.z,k.column.id,k.rafter.id,k.angle,p.w,p.h,p.t,p.d,p.dh,p.rows,p.cols,p.pitch,p.gauge,p.edge]);});const csv="\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),u=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="sahroud-knee-geometry.csv";a.click();URL.revokeObjectURL(u);});
 refresh();
}
w.SteelKneeConnectionGeometry={extract,check,drawing,drawing3D,test};
if(typeof module!=="undefined"&&module.exports)module.exports=w.SteelKneeConnectionGeometry;
if(w.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/purlin-cantilever-connection.js ===== */
/* SAHROUD STEEL - Preliminary purlin cantilever connection screen 1.1 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const fmt=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toLocaleString("fa-IR",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
const defaults={type:"clip",rows:2,cols:2,diameter:16,hole:18,fub:800,plateThickness:10,plateFy:240,plateFu:360,edge:40,sideEdge:35,plateWidth:130,pitch:60,gage:60};
let pendingData=Object.assign({},defaults);
const ids={type:"pcConnType",rows:"pcConnRows",cols:"pcConnCols",diameter:"pcConnDiameter",hole:"pcConnHole",fub:"pcConnFub",plateThickness:"pcConnPlateT",plateFy:"pcConnPlateFy",plateFu:"pcConnPlateFu",edge:"pcConnEdge",sideEdge:"pcConnSideEdge",plateWidth:"pcConnPlateWidth",pitch:"pcConnPitch",gage:"pcConnGage"};
function getData(){const d=Object.assign({},pendingData);Object.entries(ids).forEach(([k,id])=>{if($(id))d[k]=$(id).value;});pendingData=Object.assign({},d);return d;}
function setData(data){pendingData=Object.assign({},defaults,data||{});Object.entries(ids).forEach(([k,id])=>{if($(id)&&pendingData[k]!==undefined)$(id).value=pendingData[k];});}
function bindButton(){
 const button=$("btnPurlinConnCalc");
 if(button&&button.dataset.connectionBound!=="1"){
  button.addEventListener("click",calculate);
  button.dataset.connectionBound="1";
 }
}
function ensurePanel(){
 if($("purlinCantileverConnectionPanel")){bindButton();return;}
 const main=document.querySelector("main");if(!main)return;
 const anchor=$("roofTiesPanel")||$("longitudinalCantileverPanel")||$("connectionDesignPanel");
 const panel=document.createElement("section");panel.className="panel";panel.id="purlinCantileverConnectionPanel";
 panel.innerHTML=`
 <div class="panel-title"><h3>کنترل مقدماتی اتصال پرلین کنسول طولی</h3></div>
 <div class="notice">این بخش مستقل از طراحی گروه جوش رفتر است. مدل فعلی، اتصال پیچی ساده با انتقال برش توسط پیچ‌ها و انتقال لنگر را با توزیع الاستیک نیرو در گروه پیچ و بر اساس ردیف/ستون فرضی به‌صورت غربالگری بررسی می‌کند. نوع اتصال و آرایش واقعی باید با نقشه اجرایی تطبیق داده شود.</div>
 <h4>۱ ـ مدل و مشخصات اتصال</h4><div class="form-grid">
 <div class="field"><label for="pcConnType">مدل اتصال</label><select id="pcConnType"><option value="clip">نبشی/ورق اتصال پیچی ساده</option><option value="endplate">ورق انتهایی پیچی</option><option value="seat">نشیمن با پیچ مهاری</option></select></div>
 <div class="field"><label for="pcConnRows">تعداد ردیف پیچ در جهت انتقال لنگر</label><input id="pcConnRows" type="number" min="2" step="1" value="2"></div><div class="field"><label for="pcConnCols">تعداد پیچ در هر ردیف</label><input id="pcConnCols" type="number" min="1" step="1" value="2"></div>
 <div class="field"><label for="pcConnDiameter">قطر اسمی پیچ (mm)</label><input id="pcConnDiameter" type="number" min="8" step="1" value="16"></div><div class="field"><label for="pcConnHole">قطر سوراخ پیچ (mm)</label><input id="pcConnHole" type="number" min="8" step="1" value="18"></div>
 <div class="field"><label for="pcConnFub">مقاومت نهایی پیچ Fub (MPa)</label><input id="pcConnFub" type="number" min="300" step="10" value="800"></div>
 <div class="field"><label for="pcConnPlateT">ضخامت ورق اتصال (mm)</label><input id="pcConnPlateT" type="number" min="3" step="0.5" value="10"></div>
 <div class="field"><label for="pcConnPlateFy">تنش تسلیم ورق Fy (MPa)</label><input id="pcConnPlateFy" type="number" min="150" step="10" value="240"></div><div class="field"><label for="pcConnPlateFu">مقاومت نهایی ورق Fu (MPa)</label><input id="pcConnPlateFu" type="number" min="200" step="10" value="360"></div>
 <div class="field"><label for="pcConnEdge">فاصله انتهایی در راستای نیرو تا مرکز پیچ (mm)</label><input id="pcConnEdge" type="number" min="1" step="1" value="40"></div><div class="field"><label for="pcConnSideEdge">فاصله کناری تا مرکز سوراخ (mm)</label><input id="pcConnSideEdge" type="number" min="1" step="1" value="35"></div><div class="field"><label for="pcConnPlateWidth">عرض کل ورق اتصال (mm)</label><input id="pcConnPlateWidth" type="number" min="1" step="1" value="130"></div>
 <div class="field"><label for="pcConnPitch">فاصله ردیف‌های پیچ در جهت لنگر (mm)</label><input id="pcConnPitch" type="number" min="1" step="1" value="50"></div><div class="field"><label for="pcConnGage">فاصله پیچ‌ها در عرض اتصال (mm)</label><input id="pcConnGage" type="number" min="1" step="1" value="60"></div>
 </div>
 <div class="notice">در این مدل، ردیف‌ها در راستای انتقال لنگر و ستون‌ها در عرض اتصال فرض شده‌اند. مقادیر اولیه فقط برای آزمایش رابط هستند و مشخصات طراحی محسوب نمی‌شوند. اگر اتصال واقعی با این مدل متفاوت است، به نتیجه عددی اتکا نکنید.</div>
 <div class="button-grid"><button id="btnPurlinConnCalc" class="btn primary" type="button">محاسبه کنترل مقدماتی اتصال</button></div>
 <div id="purlinConnResults" class="notice">ابتدا طراحی پرلین و کنترل کنسول طولی را اجرا کنید.</div>
 <div class="notice" style="color:#a65d16">کنترل‌های این نسخه محدود به برش تقریبی پیچ، کشش تقریبی پیچ ناشی از لنگر، اندرکنش ساده برش/کشش و لهیدگی موضعی ورق در سوراخ است. لغزش، اثر اهرمی، خمش ورق، جوش، مقاومت عضو تکیه‌گاهی، فاصله‌های آیین‌نامه‌ای و الزامات لرزه‌ای کامل کنترل نشده‌اند. کنترل پارگی بلوکی و سطح خالص در ادامه صرفاً برای هندسه ساده‌شده ورق و بدون سوراخ لوبیایی یا آرایش stagger انجام می‌شود. خروجی تأیید اجرایی نیست.</div>`;
 const statusPanel=Array.from(main.querySelectorAll(".panel")).find(p=>p.textContent.includes("وضعیت پروژه"));
 if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);
 else if(statusPanel&&statusPanel.parentNode)statusPanel.parentNode.insertBefore(panel,statusPanel);
 else main.appendChild(panel);
 bindButton();setData(pendingData);
}
function calculate(){
 const out=$("purlinConnResults");
 try{
  const purlin=window.SteelRoofPurlins?.lastResult;
  if(!purlin||!purlin.best)throw new Error("ابتدا در بخش طراحی پرلین سقف، پیشنهاد خودکار یا محاسبه مقطع انتخابی را اجرا کنید.");
  const cantileverButton=$("btnLongitudinalCantilever");
  if(!cantileverButton)throw new Error("دکمه کنترل کنسول طولی پیدا نشد؛ صفحه را یک‌بار تازه‌سازی کنید.");
  // Re-run the cantilever calculation from the latest purlin and load inputs,
  // so a page refresh or changed purlin settings cannot leave stale/missing data.
  cantileverButton.click();
  const cant=window.SteelLongitudinalCantilever?.lastResult;
  if(!cant||!Array.isArray(cant.results)||!cant.results.length)throw new Error("کنترل کنسول طولی انجام نشد. پیام بخش کنترل کنسول طولی را بررسی کنید.");
  const d=getData(),nr=Number(d.rows),nc=Number(d.cols),n=nr*nc,db=Number(d.diameter),dh=Number(d.hole),fub=Number(d.fub),t=Number(d.plateThickness),fy=Number(d.plateFy),fu=Number(d.plateFu),e=Number(d.edge),se=Number(d.sideEdge),width=Number(d.plateWidth),p=Number(d.pitch),g=Number(d.gage);
  if(!(Number.isInteger(nr)&&nr>=2&&Number.isInteger(nc)&&nc>=1&&db>0&&dh>=db&&fub>0&&t>0&&fy>0&&fu>=fy&&e>dh/2&&se>dh/2&&width>=(nc-1)*g+2*se&&p>=dh&&g>=dh))throw new Error("هندسه گروه پیچ را بررسی کنید: حداقل ۲ ردیف، حداقل ۱ پیچ در هر ردیف، سوراخ بزرگ‌تر یا مساوی قطر پیچ و فاصله‌های معتبر لازم است.");
  const grossArea=Math.PI*db*db/4,area=.78*grossArea;const yPositions=Array.from({length:nr},(_,i)=>(i-(nr-1)/2)*p);const sumY2=yPositions.reduce((sum,y)=>sum+nc*y*y,0);const yMax=Math.max(...yPositions);
  const phiV=.75*.48*fub*area/1000,phiT=.75*.75*fub*area/1000;
  // Simplified straight-path block shear: two longitudinal shear planes and one transverse tension plane.
  const shearPath=e+(nr-1)*p,Anv=2*Math.max(0,shearPath-(nr-.5)*dh)*t,Agv=2*shearPath*t;
  const Ant=Math.max(0,width-(nc-.5)*dh)*t,An=Ant;
  const phiBlock=.75*Math.min((.6*fu*Anv+fu*Ant)/1000,(.6*fy*Agv+fu*Ant)/1000);
  const phiNet=.75*.75*fu*An/1000;
  const bearing=.75*Math.min(1.2*(e-dh/2)*t*fu,2.4*db*t*fu)/1000;
  const rows=[];
  cant.results.forEach(side=>["gravity","wind"].forEach(k=>{const c=side[k];if(!c)return;
   const V=Math.abs(Number(c.V)||0),M=Math.abs(Number(c.M)||0),v=V/n,ten=sumY2>0?M*1000*yMax/sumY2:0;
   const tensionResultant=sumY2>0?yPositions.reduce((sum,y)=>sum+(y>0?(M*1000*y/sumY2)*nc:0),0):0;
   const sr=v/phiV,tr=ten/phiT,ir=Math.sqrt(sr*sr+tr*tr),br=v/bearing;
   const blockRatio=tensionResultant/Math.max(phiBlock,1e-9),netRatio=tensionResultant/Math.max(phiNet,1e-9);
   rows.push({side:side.name,k,V,M,v,ten,tensionResultant,ir,br,blockRatio,netRatio});
  }));
  if(!rows.length)throw new Error("نیروهای کنسول در دسترس نیستند؛ کنترل کنسول را دوباره اجرا کنید.");
  const worst=rows.reduce((a,b)=>Math.max(a.ir,a.br,a.blockRatio,a.netRatio)>=Math.max(b.ir,b.br,b.blockRatio,b.netRatio)?a:b);
  const ratioCell=(x,label)=>`<td data-check="${label}"><b>${fmt(x,3)}</b><br><small style="color:${x<=1?"#18794e":"#b42318"}">${x<=1?"قبول در غربالگری":"نیازمند بازنگری"}</small></td>`;
  const body=rows.map(r=>`<tr><td>${r.side}</td><td>${r.k==="gravity"?"ثقلی":"باد"}</td><td>${fmt(r.V)}</td><td>${fmt(r.M)}</td><td>${fmt(r.v,3)}</td><td>${fmt(r.ten,3)}</td>${ratioCell(r.ir,"interaction")}${ratioCell(r.br,"bearing")}${ratioCell(r.blockRatio,"block-shear")}${ratioCell(r.netRatio,"net-section")}</tr>`).join("");
  out.innerHTML=`<h4>نتایج غربالگری اتصال پیچی</h4>
  <p>مدل: ${d.type==="clip"?"نبشی/ورق اتصال":d.type==="endplate"?"ورق انتهایی":"نشیمن"}؛ آرایش فرضی: ${fmt(nr,0)} ردیف × ${fmt(nc,0)} ستون؛ تعداد کل پیچ: ${fmt(n,0)}؛ سطح مقطع مؤثر تقریبی رزوه پیچ: ${fmt(area,1)} mm²</p><p>عرض ورق: ${fmt(width,1)} mm؛ فاصله انتهایی: ${fmt(e,1)} mm؛ فاصله کناری: ${fmt(se,1)} mm؛ قطر سوراخ: ${fmt(dh,1)} mm؛ گام ردیف‌ها: ${fmt(p,1)} mm؛ فاصله عرضی: ${fmt(g,1)} mm؛ توزیع کشش با فرض رفتار الاستیک گروه پیچ حول مرکز گروه محاسبه شده است.</p>
  <p>مساحت خالص کششی ورق An: ${fmt(An,1)} mm²؛ ظرفیت طراحی تقریبی سطح خالص: ${fmt(phiNet,2)} kN؛ ظرفیت طراحی تقریبی پارگی بلوکی: ${fmt(phiBlock,2)} kN (با فرض دو مسیر برشی طولی و یک مسیر کششی عرضی؛ نیروهای این دو کنترل از برآیند کشش ردیف‌های کششی گروه پیچ گرفته شده‌اند).</p><p>ظرفیت تقریبی برش هر پیچ: ${fmt(phiV,2)} kN؛ ظرفیت تقریبی کشش هر پیچ: ${fmt(phiT,2)} kN؛ ظرفیت لهیدگی تقریبی ورق برای هر پیچ: ${fmt(bearing,2)} kN</p>
  <div style="overflow-x:auto"><table style="width:100%;min-width:720px;border-collapse:collapse"><thead><tr><th>سمت</th><th>حالت بار</th><th>V (kN)</th><th>M (kN.m)</th><th>برش هر پیچ</th><th>کشش هر پیچ</th><th>نسبت اندرکنش</th><th>نسبت لهیدگی</th><th>نسبت پارگی بلوکی</th><th>نسبت سطح خالص</th></tr></thead><tbody>${body}</tbody></table></div>
  <p><b>حالت حاکم:</b> ${worst.side} ـ ${worst.k==="gravity"?"ثقلی":"باد"}؛ نسبت اندرکنش ${fmt(worst.ir,3)}، لهیدگی ${fmt(worst.br,3)}، پارگی بلوکی ${fmt(worst.blockRatio,3)} و سطح خالص ${fmt(worst.netRatio,3)}.</p>
  <div class="notice" style="color:#a65d16"><b>${worst.ir<=1&&worst.br<=1&&worst.blockRatio<=1&&worst.netRatio<=1?"همه نسبت‌های محاسبه‌شده حداکثر ۱ هستند.":"حداقل یک نسبت بیشتر از ۱ است و باید بازنگری شود."}</b><br>این فقط وضعیت غربالگری محاسبات ساده‌شده است؛ فاصله‌ها و ظرفیت‌ها هنوز باید با نقشه اتصال و ضوابط آیین‌نامه‌ای تطبیق داده شوند.</div>
  <p>ظرفیت‌ها تقریبی و غربالگری‌اند؛ طراحی نهایی باید با آیین‌نامه و هندسه واقعی اتصال کنترل شود.</p>`;
  window.SteelPurlinCantileverConnection.lastResult={inputs:d,boltCount:n,boltGroup:{rows:nr,columns:nc,sumY2,yMax},plateChecks:{Anv,Agv,Ant,An,phiBlock,phiNet},results:rows,worst};
 }catch(err){out.innerHTML='<div class="notice" style="color:#a65d16">'+err.message+'</div>';}
}
window.SteelPurlinCantileverConnection={getData,setData,calculate,lastResult:null};
function boot(){
 ensurePanel();
 const main=document.querySelector("main");
 if(main){
  const observer=new MutationObserver(()=>ensurePanel());
  observer.observe(main,{childList:true,subtree:true});
 }
 window.addEventListener("load",ensurePanel,{once:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();

/* ===== steel2/js/ui-organization.js ===== */

/* SAHROUD STEEL - Smart Panel Organizer 1.0 */
(function () {
    "use strict";

    const STYLE_ID = "smartPanelOrganizerStyle";

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;

        style.textContent = `
            .panel.smart-organized {
                padding: 0 !important;
                overflow: hidden;
            }

            .panel.smart-organized > details {
                width: 100%;
            }

            .panel.smart-organized summary {
                list-style: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 13px 16px;
                min-height: 52px;
                color: #123047;
                font-weight: bold;
                background: #f5f9fb;
                user-select: none;
            }

            .panel.smart-organized summary::-webkit-details-marker {
                display: none;
            }

            .panel.smart-organized summary::after {
                content: "＋";
                color: #176b87;
                font-size: 19px;
                font-weight: bold;
            }

            .panel.smart-organized details[open] > summary::after {
                content: "−";
            }

            .panel.smart-organized details[open] > summary {
                border-bottom: 1px solid #d7e1e7;
                background: #edf5f8;
            }

            .panel.smart-organized .smart-panel-title {
                flex: 1;
                min-width: 0;
            }

            .panel.smart-organized .smart-panel-status {
                color: #647783;
                font-size: 11px;
                font-weight: normal;
                white-space: nowrap;
            }

            .panel.smart-organized .smart-panel-content {
                padding: 14px;
            }

            .panel.smart-organized h3 {
                margin: 0;
                font-size: 14px;
            }

            @media (max-width: 650px) {
                .panel.smart-organized summary {
                    padding: 12px;
                }

                .panel.smart-organized .smart-panel-content {
                    padding: 10px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function shouldOpen(title) {
        // صفحه شروع فقط فرم مشخصات و پیش‌نمایش سبک قاب را باز نگه می‌دارد.
        // گالری، مدل کامل، بارگذاری، تحلیل و ابزارهای تخصصی با درخواست کاربر باز می‌شوند.
        return /تعریف پروژه و مشخصات پایه سازه|نمایش قاب/.test(title);
    }

    function organize(panel) {
        if (!panel || panel.dataset.smartOrganized === "1") {
            return;
        }

        const heading =
            panel.querySelector(".panel-title h3") ||
            panel.querySelector(":scope > h3");

        if (!heading) return;

        const titleText = heading.textContent.trim();
        if (!titleText) return;

        const titleContainer = heading.closest(".panel-title") ||
            heading;

        const status = titleContainer.querySelector(".status");

        const details = document.createElement("details");
        details.open = shouldOpen(titleText);

        const summary = document.createElement("summary");

        const title = document.createElement("span");
        title.className = "smart-panel-title";
        title.textContent = titleText;

        summary.appendChild(title);

        if (status) {
            const statusText = document.createElement("span");
            statusText.className = "smart-panel-status";
            statusText.textContent = status.textContent.trim();
            summary.appendChild(statusText);
        }

        const content = document.createElement("div");
        content.className = "smart-panel-content";

        const children = Array.from(panel.childNodes);

        children.forEach(node => {
            if (node === titleContainer) return;
            content.appendChild(node);
        });

        details.appendChild(summary);
        details.appendChild(content);

        panel.innerHTML = "";
        panel.appendChild(details);

        panel.classList.add("smart-organized");
        panel.dataset.smartOrganized = "1";
    }

    function renumberPanels() {
        const panels = Array.from(document.querySelectorAll("main .panel"));
        let number = 0;
        panels.forEach(panel => {
            const title = panel.querySelector(".smart-panel-title");
            if (!title) return;
            number += 1;
            const original = panel.dataset.smartTitle ||
                title.textContent.replace(/^(?:\s*[0-9۰-۹٠-٩]+\s*[ـ–.)-]\s*)+/u, "").trim();
            panel.dataset.smartTitle = original;
            const numberedTitle = number.toLocaleString("fa-IR") + " ـ " + original;
            if (title.textContent !== numberedTitle) {
                title.textContent = numberedTitle;
            }
            panel.dataset.sectionNumber = String(number);
        });
    }
    function scan(root) {
        if (!root) return;

        if (root.matches && root.matches(".panel")) {
            organize(root);
        }

        if (root.querySelectorAll) {
            root.querySelectorAll(".panel").forEach(organize);
        }
        renumberPanels();
    }

    function cleanLegacyControls() {
        // The old 2D single-frame action/results are superseded by the full 3D model.
        const legacyButton=document.getElementById("btnCalculate");
        if(legacyButton)legacyButton.hidden=true;
        const legacyResults=document.getElementById("results");
        if(legacyResults)legacyResults.hidden=true;
        const comboButton=document.getElementById("btnCombinations");
        if(comboButton)comboButton.textContent="تحلیل ترکیبات بار سه‌بعدی";
        // The previous one-click workflow still calls the retired 2D combination API.
        const staleWorkflow=document.getElementById("steelAutoWorkflowPanel");
        if(staleWorkflow)staleWorkflow.hidden=true;
        const oldCount=document.querySelector("#results #memberCount");
        if(oldCount)oldCount.closest(".result-card")?.setAttribute("hidden","");
    }

    function init() {
        addStyles();
        cleanLegacyControls();

        scan(document);

        // مدیریت پنل‌هایی که ماژول‌های دیگر بعداً می‌سازند
        const observer = new MutationObserver(records => {
            records.forEach(record => {
                record.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        scan(node);
                    }
                });
                renumberPanels();
            });
        });

        observer.observe(document.querySelector("main") || document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();


/* ===== steel2/js/m6-analysis-coverage-audit.js ===== */
/* SAHROUD STEEL — M6:1398 solved-combination family coverage gate.
 * Tracks which Iranian M6 LRFD combination families actually reached the 3D
 * solver. It never invents load effects, expands missing cases, or approves design.
 */
(function(root){
"use strict";
const known=new Set(["M6-ULS-01","M6-ULS-02","M6-ULS-03","M6-ULS-04","M6-ULS-05","M6-ULS-06","M6-ULS-07","M6-ULS-08","M6-ULS-09"]);
const labels={
 "M6-ULS-01":"۱ ـ 1.4D",
 "M6-ULS-02":"۲ ـ 1.2D + 1.6L + 0.5(Lr/S/R)",
 "M6-ULS-03":"۳ ـ 1.2D + 1.6(Lr/S/R) + [L یا 0.7W]",
 "M6-ULS-04":"۴ ـ 1.2D + 1.4W + L + 0.5(Lr/S/R)",
 "M6-ULS-05":"۵ ـ 1.2D + E + L + 0.2S",
 "M6-ULS-06":"۶ ـ 0.9D + 1.4W",
 "M6-ULS-07":"۷ ـ 0.9D + E",
 "M6-ULS-08":"۸ ـ ترکیب دارای T (مشروط)",
 "M6-ULS-09":"۹ ـ ترکیب دارای T (مشروط)"
};
function audit(input){
 const p=input||{},cases=Array.isArray(p.analyzedCases)?p.analyzedCases:[],issues=[],ids=new Set(),counts={};
 cases.forEach((c,i)=>{
  const id=String(c?.id??"").trim(),family=String(c?.m6FamilyId??"").trim();
  if(!id)issues.push("شناسه حالت تحلیل شماره "+(i+1)+" خالی است.");
  else if(ids.has(id))issues.push("شناسه حالت تحلیل تکراری است: "+id);
  else ids.add(id);
  if(!known.has(family))issues.push("شناسه خانواده مبحث ششم برای حالت "+(id||i+1)+" معتبر/ثبت‌شده نیست.");
  else counts[family]=(counts[family]||0)+1;
  if(c?.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای حالت "+(id||i+1)+" تأیید نشده است.");
  if(!Array.isArray(c?.members)||!c.members.length)issues.push("نتایج اعضا برای حالت "+(id||i+1)+" موجود نیست.");
 });
 const required=["M6-ULS-01","M6-ULS-02","M6-ULS-03","M6-ULS-04","M6-ULS-05","M6-ULS-06","M6-ULS-07"];
 const conditional=p.temperatureApplicable===true?["M6-ULS-08","M6-ULS-09"]:[];
 const unresolvedTemperature=p.temperatureApplicable!==true&&p.temperatureApplicable!==false;
 const missing=required.filter(x=>!counts[x]);
 const missingConditional=conditional.filter(x=>!counts[x]);
 const variantCases=cases.filter(x=>x.m6FamilyId==="M6-ULS-03");
 const variantIds=new Set(variantCases.map(x=>x.m6VariantId).filter(Boolean));
 const missingVariants=["Lr","S"].filter(x=>!variantIds.has(x));
 if(p.temperatureApplicable!==true&&p.temperatureApplicable!==false)issues.push("قابل‌اعمال بودن اثر دما/خودکرنشی برای تعیین خانواده‌های ۸ و ۹ مشخص نشده است.");
 const rows=[...required,...(p.temperatureApplicable===true?conditional:[])].map(id=>({id,label:labels[id],solvedCases:counts[id]||0,covered:(counts[id]||0)>0,required:true}));
 const conditionalRows=["M6-ULS-08","M6-ULS-09"].map(id=>({id,label:labels[id],solvedCases:counts[id]||0,covered:(counts[id]||0)>0,required:p.temperatureApplicable===true,applicability:p.temperatureApplicable===true?"applicable":p.temperatureApplicable===false?"not-applicable":"unresolved"}));
 const familyCoverageComplete=missing.length===0&&missingConditional.length===0&&!unresolvedTemperature&&missingVariants.length===0;
 return {
  success:issues.length===0,
  familyCoverageComplete,
  status:familyCoverageComplete&&issues.length===0?"complete":"incomplete",
  analyzedCaseCount:cases.length,
  coveredFamilies:Object.keys(counts).sort(),
  missingRequiredFamilies:missing,
  missingConditionalFamilies:missingConditional,
  missingM6Combination3Variants:missingVariants,
  temperatureApplicability:p.temperatureApplicable===true?"applicable":p.temperatureApplicable===false?"not-applicable":"unresolved",
  familyRows:rows,
  conditionalFamilyRows:conditionalRows,
  familyCounts:counts,
  issues,
  analysisEnabled:false,
  designApproved:false,
  limitations:[
   "این ممیزی فقط ردیابی خانواده ترکیبات و حضور نتایج تحلیل/تعادل را کنترل می‌کند؛ صحت ضرایب و بارهای ورودی را اثبات نمی‌کند.",
   "حالات فاقد شناسه خانواده صریح، به خانواده‌ای حدس زده‌شده منتسب نمی‌شوند.",
   "خانواده‌های غایب باید پس از تعیین قابل‌اعمال بودن بارها و تولید اثرهای واقعی، به حل‌گر متصل شوند؛ این ماژول بار یا نتیجه تحلیل تولید نمی‌کند.",
   "تکمیل پوشش ترکیبات به معنی کنترل مقاومت، پایداری، تغییرمکان یا تأیید طراحی نیست."
  ]
 };
}
function selfTest(){
 const mk=(id,family,variant)=>({id,m6FamilyId:family,m6VariantId:variant,equilibrium:{ok:true},members:[{id:"M1",localEndForces:Array(12).fill(0)}]});
 const all=[
  mk("C1","M6-ULS-01"),
  mk("C2","M6-ULS-02"),
  mk("C3-LR","M6-ULS-03","Lr"),
  mk("C3-S","M6-ULS-03","S"),
  mk("C4","M6-ULS-04"),
  mk("C5","M6-ULS-05"),
  mk("C6","M6-ULS-06"),
  mk("C7","M6-ULS-07")
 ];
 const tests=[],check=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 check("all seven non-temperature families and both combination-3 branches are covered",()=>audit({analyzedCases:all,temperatureApplicable:false}).familyCoverageComplete);
 check("missing family is reported, not inferred",()=>audit({analyzedCases:all.filter(x=>x.m6FamilyId!=="M6-ULS-04"),temperatureApplicable:false}).missingRequiredFamilies.includes("M6-ULS-04"));
 check("temperature applicability unresolved blocks completeness",()=>!audit({analyzedCases:all}).familyCoverageComplete);
 check("temperature families required when applicable",()=>{const r=audit({analyzedCases:all,temperatureApplicable:true});return r.missingConditionalFamilies.length===2&&!r.familyCoverageComplete;});
 check("temperature families excluded only after explicit not-applicable declaration",()=>audit({analyzedCases:all,temperatureApplicable:false}).familyCoverageComplete);
 check("missing Lr or S variant of family 3 is reported",()=>audit({analyzedCases:all.filter(x=>x.m6VariantId!=="S"),temperatureApplicable:false}).missingM6Combination3Variants.includes("S"));
 check("duplicate solved case IDs rejected",()=>audit({analyzedCases:[...all,all[0]],temperatureApplicable:false}).success===false);
 check("failed equilibrium rejected",()=>audit({analyzedCases:[{...all[0],equilibrium:{ok:false}},...all.slice(1)],temperatureApplicable:false}).success===false);
 check("missing member results rejected",()=>audit({analyzedCases:[{...all[0],members:[]},...all.slice(1)],temperatureApplicable:false}).success===false);
 check("unknown family is not silently classified",()=>audit({analyzedCases:[{...all[0],m6FamilyId:"M6-ULS-99"},...all.slice(1)],temperatureApplicable:false}).success===false);
 check("never enables analysis or approves design",()=>{const r=audit({analyzedCases:all,temperatureApplicable:false});return r.analysisEnabled===false&&r.designApproved===false;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,scope:"family traceability only"};
}
root.SteelM6AnalysisCoverageAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/auto-workflow.js ===== */
/* SAHROUD STEEL - One-click preliminary project workflow
   Runs only existing project calculations in dependency order.
   It never invents missing structural restraint or code climate data.
*/
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let busy = false;

  function addLine(rows, label, ok, detail) {
    rows.push({label,ok:!!ok,detail:detail||""});
  }
  function summarizeSourceAudit(audit) {
    const rows=Array.isArray(audit?.rows)?audit.rows:[];
    const incomplete=rows.filter(row=>row?.complete!==true);
    const fieldCounts={};
    incomplete.forEach(row=>(Array.isArray(row?.missing)?row.missing:[]).forEach(field=>{
      fieldCounts[field]=(fieldCounts[field]||0)+1;
    }));
    return {
      caseCount:rows.length,
      completeCaseCount:rows.length-incomplete.length,
      incompleteCaseCount:incomplete.length,
      fieldCounts,
      incompleteCaseIds:incomplete.map(row=>String(row.caseId||"نامشخص")),
      success:rows.length>0&&incomplete.length===0
    };
  }
  function sourceAuditDetail(audit) {
    const summary=summarizeSourceAudit(audit);
    if(!summary.caseCount)return "ممیزی منبع برای هیچ حالت باری دریافت نشد.";
    const fields=Object.entries(summary.fieldCounts).map(([key,count])=>key+" ("+count+" حالت)").join("، ")||"—";
    const ids=summary.incompleteCaseIds.slice(0,12).join("، ")+(summary.incompleteCaseIds.length>12?" و "+(summary.incompleteCaseIds.length-12)+" حالت دیگر":"");
    return "ردیابی منبع: "+summary.completeCaseCount+" از "+summary.caseCount+" حالت کامل؛ "+summary.incompleteCaseCount+" حالت ناقص. فیلدهای مفقود: "+fields+". شناسه حالت‌های ناقص: "+ids+". تا تکمیل مدرک، بازسازی نمودار نیروهای داخلی برای این بسته عمداً اجرا نشده است.";
  }
  function setReport(rows, heading) {
    const out=$("steelAutoWorkflowResults"); if(!out)return;
    const pass=rows.filter(x=>x.ok).length;
    const missing=rows.filter(x=>!x.ok).length;
    out.innerHTML="<h4>"+heading+"</h4>"+
      "<p>مراحل انجام‌شده: "+pass+" | نیازمند تکمیل یا بررسی: "+missing+"</p>"+
      rows.map(x=>'<div class="notice"><b>'+(x.ok?"✓ ":"⚠ ")+x.label+
        "</b>"+(x.detail?"<p>"+String(x.detail).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+"</p>":"")+"</div>").join("");
  }
  function hasUsableClimate() {
    const db=window.SteelClimateDB?.getData?.();
    const id=$("climateCity")?.value;
    const record=db?.records?.[id];
    if(record && record.status && /تأیید رسمی|verified|معتبر و تأیید/i.test(record.status) &&
       Number.isFinite(Number(record.basicWind)) &&
       Number.isFinite(Number(record.groundSnow))) {
      window.SteelClimateDB.loadSelectedCity?.();
      return {ok:true,detail:"داده شهر از بانک با وضعیت تأییدشده به ورودی‌ها منتقل شد."};
    }
    return {ok:false,detail:"برای شهر انتخابی هنوز رکورد باد و برفِ تأییدشده در بانک وجود ندارد؛ نرم‌افزار نباید مقدار حدسی جایگزین کند."};
  }
  function blankOrZero(id) {
    const el=$(id); return !el || el.value.trim()==="" || Number(el.value)===0;
  }
  function autoPrepareSections(rows) {
    const valid=window.SteelSections?.validate?.()===true;
    addLine(rows,"اعتبارسنجی مقاطع اعضای اصلی",valid,
      valid?"مقاطع و خواص هندسی واردشده حفظ شدند.":
      "مقاطع ستون و رفتر باید از طراحی معتبر یا ابعاد/مشخصات صریح تعیین شوند. تولید مقطع از مقادیر پیش‌فرض رابط کاربری در اجرای خودکار متوقف شد.");
    return valid;
  }
  function prepareMaterial(rows) {
    const grade=$("steelGrade"), e=$("steelE"), fy=$("steelFy");
    if(!grade||!e||!fy) {
      addLine(rows,"اعتبارسنجی خواص فولاد",false,"فیلدهای گرید، مدول الاستیسیته و تنش تسلیم در دسترس نیستند.");
      return false;
    }
    const valid=!!grade.value.trim()&&Number(e.value)>0&&Number(fy.value)>0;
    addLine(rows,"اعتبارسنجی خواص فولاد",valid,
      valid?"خواص واردشده حفظ شدند؛ گواهی مصالح و انطباق Fy با ضخامت باید کنترل شود.":
      "گرید، E و Fy باید صریحاً از مشخصات مصالح یا گواهی کارخانه وارد شوند. هیچ گرید یا مقاومت پیش‌فرضی به‌صورت خودکار تخصیص داده نشد.");
    return valid;
  }
  function stabilityGaps() {
    const labels={Lx:"طول مهارنشده محور قوی",Ly:"طول مهارنشده محور ضعیف",Kx:"ضریب طول مؤثر محور قوی",Ky:"ضریب طول مؤثر محور ضعیف"};
    const gaps=[];
    ["column","rafter"].forEach(member=>{
      const values=window.SteelGirder?.readStability?.(member)||{};
      Object.keys(labels).forEach(key=>{
        if(!(Number(values[key])>0)) gaps.push((member==="column"?"ستون":"رفتر")+": "+labels[key]);
      });
    });
    return gaps;
  }
  function runStep(rows,label,fn,verify) {
    try {
      const result=fn();
      const ok=verify?verify(result):result!==false;
      addLine(rows,label,ok,ok?"اجرا شد.":"خروجی معتبر یا پیش‌نیاز کافی دریافت نشد.");
      return ok;
    } catch(e) {
      addLine(rows,label,false,e?.message||String(e));
      return false;
    }
  }
  function audit3DCombinationCoverage(model, combinations) {
    const issues=[], expected=Array.isArray(model?.members)?model.members:[];
    if(!expected.length)issues.push("مدل سه‌بعدی یا مجموعه اعضای مرجع خالی است.");
    const expectedIds=expected.map(m=>String(m?.id??""));
    if(expectedIds.some(x=>!x))issues.push("شناسه عضو در مدل مرجع خالی است.");
    if(new Set(expectedIds).size!==expectedIds.length)issues.push("شناسه عضو در مدل سه‌بعدی تکراری است.");
    const cases=Array.isArray(combinations)?combinations:[];
    if(!cases.length)issues.push("هیچ ترکیب بار تحلیل‌شده‌ای برای ممیزی پوشش وجود ندارد.");
    const labels=cases.map(x=>String(x?.label||x?.name||"").trim());
    if(labels.some(x=>!x))issues.push("برچسب یکی از ترکیبات بار خالی است.");
    if(new Set(labels).size!==labels.length)issues.push("برچسب ترکیبات بار تکراری است.");
    const expectedSet=new Set(expectedIds),rows=[];
    cases.forEach((item,index)=>{
      const caseIssues=[],members=Array.isArray(item?.members)?item.members:[];
      if(item?.equilibrium?.ok!==true)caseIssues.push("تعادل عددی این ترکیب تأیید نشده است.");
      const ids=members.map(m=>String(m?.id??""));
      if(ids.some(x=>!x))caseIssues.push("شناسه عضو خروجی خالی است.");
      if(new Set(ids).size!==ids.length)caseIssues.push("شناسه عضو خروجی تکراری است.");
      const physicalIds=members.map(m=>String(m?.parentMemberId||m?.id||""));
      const physicalSet=new Set(physicalIds);
      const missing=expectedIds.filter(id=>!physicalSet.has(id));
      const extra=members.filter(m=>!expectedSet.has(String(m?.parentMemberId||m?.id||""))).map(m=>String(m.id));
      if(missing.length)caseIssues.push("اعضای فاقد نتیجه: "+missing.slice(0,10).join("، "));
      if(extra.length)caseIssues.push("شناسه‌های خارج از مدل مرجع: "+extra.slice(0,10).join("، "));
      const invalid=members.filter(m=>!Array.isArray(m?.localEndForces)||m.localEndForces.length!==12||m.localEndForces.some(v=>!Number.isFinite(Number(v))));
      if(invalid.length)caseIssues.push("بردار نیروی انتهایی ۱۲ مؤلفه‌ای ناقص/نامعتبر برای: "+invalid.slice(0,10).map(m=>String(m.id)).join("، "));
      rows.push({label:labels[index]||("case-"+(index+1)),memberCount:members.length,missingMemberIds:missing,extraMemberIds:extra,invalidForceMemberIds:invalid.map(m=>String(m.id)),equilibriumOK:item?.equilibrium?.ok===true,success:caseIssues.length===0,issues:caseIssues});
      issues.push(...caseIssues.map(x=>(labels[index]||("ترکیب "+(index+1)))+": "+x));
    });
    return {success:issues.length===0&&rows.length===cases.length&&rows.every(x=>x.success),expectedMemberCount:expected.length,caseCount:cases.length,rows,issues,scope:"3D model-member result coverage, simultaneous 12-component end-force vector presence, unique IDs and per-case solver equilibrium; not member capacity or code approval."};
  }
  function auditCraneReadiness(model) {
    const runway=model?.geometry?.craneRunway;
    if(!runway?.enabled)return {enabled:false,ready:true,issues:[],detail:"جرثقیل در این پروژه فعال نیست."};
    const audit=window.SteelCraneLoadPathAudit?.auditGeometry?.(model);
    if(!audit)return {enabled:true,ready:false,issues:["ماژول ممیزی مسیر هندسی جرثقیل بارگذاری نشده است."],detail:"آمادگی مسیر انتقال بار جرثقیل قابل بررسی نیست."};
    const issues=[...(audit.issues||[])];
    const integration=runway.integrationAudit,mesh=runway.meshProposal;
    if(integration&&integration.ready!==true)issues.push(...(integration.issues||["ممیزی اتصال هندسی جرثقیل به شبکه مدل کامل نیست."]));
    if(mesh&&mesh.ready!==true)issues.push(...(mesh.issues||["پیشنهاد شبکه‌سازی تیر حمال هنوز آماده نیست."]));
    return {enabled:true,ready:issues.length===0,issues,geometry:audit,integration,mesh,
      detail:issues.length?issues.join("؛ "):"گره‌ها و اعضای هندسی مسیر تیر حمال ممیزی شدند؛ این نتیجه به‌تنهایی مجوز تزریق بار چرخ یا تأیید طراحی نیست."};
  }
  function selfTest() {
    const model={members:[{id:"M1"},{id:"M2"}]};
    const solved=(id)=>({id,localEndForces:Array(12).fill(1)});
    const good=[{label:"ULS-A",equilibrium:{ok:true},members:[solved("M1"),solved("M2")]}];
    const tests=[];
    const check=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
    check("complete 3D member coverage accepted",()=>audit3DCombinationCoverage(model,good).success);
    check("missing model member rejected",()=>!audit3DCombinationCoverage(model,[{...good[0],members:[solved("M1")]}]).success);
    check("extra result member rejected",()=>!audit3DCombinationCoverage(model,[{...good[0],members:[solved("M1"),solved("M2"),solved("M3")]}]).success);
    check("duplicate result member rejected",()=>!audit3DCombinationCoverage(model,[{...good[0],members:[solved("M1"),solved("M1"),solved("M2")]}]).success);
    check("invalid 12-component force vector rejected",()=>!audit3DCombinationCoverage(model,[{...good[0],members:[solved("M1"),{id:"M2",localEndForces:[1,2]}]}]).success);
    check("failed solver equilibrium rejected",()=>!audit3DCombinationCoverage(model,[{...good[0],equilibrium:{ok:false}}]).success);
    check("duplicate case labels rejected",()=>!audit3DCombinationCoverage(model,[good[0],{...good[0]}]).success);
    check("tapered analysis segments cover their physical parent member",()=>audit3DCombinationCoverage({members:[{id:"PARENT"}]},[{label:"TAPER",equilibrium:{ok:true},members:[{...solved("PARENT-S1"),parentMemberId:"PARENT"},{...solved("PARENT-S2"),parentMemberId:"PARENT"}]}]).success);
    check("orphan tapered segment parent is rejected",()=>!audit3DCombinationCoverage({members:[{id:"PARENT"}]},[{label:"TAPER",equilibrium:{ok:true},members:[{...solved("SEG-1"),parentMemberId:"UNKNOWN"}]}]).success);
    check("empty reference model rejected",()=>!audit3DCombinationCoverage({members:[]},good).success);
    check("disabled crane does not block automatic workflow",()=>{const r=auditCraneReadiness({geometry:{craneRunway:{enabled:false}}});return r.ready&&!r.enabled;});
    check("enabled crane blocks if geometry audit module is unavailable",()=>!auditCraneReadiness({geometry:{craneRunway:{enabled:true}}}).ready);
    check("source audit summary counts incomplete cases and required fields",()=>{const r=summarizeSourceAudit({rows:[{caseId:"C1",complete:false,missing:["document","revision"]},{caseId:"C2",complete:false,missing:["document"]},{caseId:"C3",complete:true,missing:[]}]});return r.caseCount===3&&r.completeCaseCount===1&&r.incompleteCaseCount===2&&r.fieldCounts.document===2&&r.fieldCounts.revision===1&&r.incompleteCaseIds.join(",")==="C1,C2";});
    check("source audit detail states that force diagrams were skipped",()=>sourceAuditDetail({rows:[{caseId:"C1",complete:false,missing:["locator"]}]}).includes("عمداً اجرا نشده است"));
    return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"software result-coverage and source-provenance reporting only"};
  }
  async function run() {
    if(busy)return;
    busy=true;
    const rows=[];
    try {
      const climate=hasUsableClimate();
      addLine(rows,"تخصیص خودکار بار باد و برف شهر",climate.ok,climate.detail);

      if(window.SteelLoads?.syncLegacyInputs)window.SteelLoads.syncLegacyInputs();
      const loadOK=window.SteelLoads?.check?.()===true;
      addLine(rows,"همگام‌سازی و کنترل ورودی‌های بار",loadOK,
        loadOK?"بارهای موجود و علامت باد حفظ شدند.":"ورودی‌های بار یا پارامترهای اقلیمی نیازمند اصلاح‌اند.");
      if(!loadOK) {
        setReport(rows,"گزارش اجرای خودکار — توقف به علت ورودی بار نامعتبر");
        return;
      }

      // خواص مصالح باید پیش از ساخت/اعتبارسنجی مقاطع اولیه آماده شوند.
      const materialOK=prepareMaterial(rows);
      if(!materialOK) {
        setReport(rows,"گزارش اجرای خودکار — خواص مصالح ناقص است");
        return;
      }

      const sectionOK=autoPrepareSections(rows);
      if(!sectionOK) {
        setReport(rows,"گزارش اجرای خودکار — متوقف‌شدن بخش تحلیل اصلی");
        return;
      }

      const projectError=window.SteelProject?.validate?.()||"";
      if(projectError) {
        addLine(rows,"اعتبارسنجی هندسه و مشخصات پروژه",false,projectError);
        setReport(rows,"گزارش اجرای خودکار — اطلاعات پایه ناقص است");
        return;
      }
      addLine(rows,"اعتبارسنجی هندسه و مشخصات پروژه",true,"ابعاد اصلی و ورودی‌های اجباری معتبرند.");

      let fullModelOK=false;
      let fullModelForAnalysis=null;
      try {
        const fullModel=window.SteelStructuralModel?.build?.();
        fullModelForAnalysis=fullModel||null;
        fullModelOK=!!fullModel&&Array.isArray(fullModel.members)&&fullModel.members.length>0;
        if(fullModelOK) {
          addLine(rows,"ساخت و اعتبارسنجی مدل هندسی",true,
            fullModel.geometry.frames.length+" قاب، "+fullModel.nodes.length+" گره و "+fullModel.members.length+" عضو هندسی؛ مدل بدون اجرای ترسیم غیرضروری برای تحلیل آماده شد.");
        } else addLine(rows,"ساخت و اعتبارسنجی مدل هندسی",false,"مدل هندسی کامل تولید نشد.");
      } catch(e) { addLine(rows,"ساخت و اعتبارسنجی مدل هندسی",false,e?.message||String(e)); }
      if(fullModelOK) {
        const crane=auditCraneReadiness(window.SteelStructuralModel?.getData?.()||window.SteelStructuralModel?.model||null);
        if(crane.enabled)addLine(rows,"ممیزی مسیر هندسی جرثقیل تا شبکه حل‌گر",crane.ready,
          crane.detail+" اعمال بار چرخ به حل‌گر تا تکمیل مسیر واقعی تیر حمال، براکت و ستون مسدود می‌ماند.");
        else addLine(rows,"وضعیت جرثقیل پروژه",true,crane.detail);
      }
      // اجرای مستقیم و هم‌زمان محاسبه؛ کلیک دکمه با setTimeout اجرا می‌شود
      // و بررسی فوری نتیجه پس از click باعث گزارش کاذب شکست می‌شد.
      let comboRun=null;
      try {
        window.SteelAnalysis.combinationResults=[];
        if(typeof window.SteelAnalysis?.calculateCombinations!=="function") {
          throw new Error("تابع محاسبه هم‌زمان ترکیبات بار در دسترس نیست؛ فایل app.js را به‌روزرسانی کنید.");
        }
        comboRun=await window.SteelAnalysis.calculateCombinations();
      } catch(e) {
        comboRun={success:false,error:e?.message||String(e)};
      }
      const comboOK=!!comboRun?.success&&Array.isArray(window.SteelAnalysis?.combinationResults)&&window.SteelAnalysis.combinationResults.length>0;
      addLine(rows,"تحلیل قاب و ترکیبات بار موجود",comboOK,
        comboOK?"تمام "+window.SteelAnalysis.combinationResults.length+" حالت ترکیب بار موجود تحلیل شدند.":(comboRun?.error||"تحلیل ترکیبات بار خروجی معتبر تولید نکرد؛ پیام تحلیل را بررسی کنید."));
      const m6Coverage=window.SteelM6AnalysisCoverageAudit?.audit?.({analyzedCases:comboOK?window.SteelAnalysis.combinationResults:[],temperatureApplicable:null});
      if(m6Coverage) {
        const covered=m6Coverage.coveredFamilies.map(id=>id.replace("M6-ULS-","")).join("، ")||"هیچ‌کدام";
        const missing=m6Coverage.missingRequiredFamilies.map(id=>id.replace("M6-ULS-","")).join("، ")||"—";
        addLine(rows,"پوشش خانواده‌های ترکیبات بار مبحث ششم",m6Coverage.familyCoverageComplete,
          "خانواده‌های تحلیل‌شده: "+covered+". خانواده‌های پایه متصل‌نشده: "+missing+". وضعیت دما: "+m6Coverage.temperatureApplicability+". "+(m6Coverage.familyCoverageComplete?"پوشش خانواده‌ها کامل است.":"پوشش فعلی ناقص است؛ این گزارش مانع اعلام تکمیل کاذب می‌شود."));
      } else addLine(rows,"پوشش خانواده‌های ترکیبات بار مبحث ششم",false,"دروازه ممیزی پوشش ترکیبات بار بارگذاری نشده است.");

      if(comboOK) {
        const taperBridge=window.SteelTaperedCaseForceBridge?.build?.(window.SteelStructuralModel?.getData?.(),window.SteelAnalysis.combinationResults);
        if(taperBridge)window.SteelTaperedCaseForceBridge.lastResult=taperBridge;
        addLine(rows,"انتقال نیروهای هم‌زمان هر ترکیب به قطعات منشوری/متغیرمقطع",!!taperBridge?.success,
          taperBridge?.status==="no-tapered-members"?"در مدل فعلی عضو متغیرمقطع فعال وجود ندارد.":taperBridge?.success?(taperBridge.analysisSegmentCount+" قطعه در "+taperBridge.caseCount+" ترکیب، با حفظ بردارهای ۱۲ مؤلفه‌ای و تعادل هر حالت ثبت شد."):(taperBridge?.issues||["پل انتقال نیرو بارگذاری نشده یا داده کافی نیست."]).join("؛ "));
        if(taperBridge?.analysisSegmentCount>0){
          const firstCase=window.SteelAnalysis.combinationResults[0];
          const readiness=window.SteelTaperedMemberDesignReadiness?.audit?.({members:firstCase?.members||[],loadCases:window.SteelAnalysis.combinationResults,memberInputs:{}});
          if(readiness)window.SteelTaperedMemberDesignReadiness.lastResult=readiness;
          addLine(rows,"آمادگی طراحی مقاومتی اعضای متغیرمقطع",!!readiness?.success,
            readiness?.success?"ورودی‌های دروازه طراحی کامل‌اند؛ این وضعیت هنوز به معنی تأیید مقاومت نیست.":(readiness?.memberRows||[]).map(x=>x.parentMemberId+": "+x.missingInputs.join("، ")).join("؛ ")||"ورودی‌های لازم برای ممیزی آماده‌سازی در دسترس نیست.");
        }
        const hasMemberDemand=window.SteelAnalysis.combinationResults.every(item=>
          Array.isArray(item.members)&&item.members.length>0&&item.members.every(m=>
            Array.isArray(m.localEndForces)&&m.localEndForces.length===12&&m.localEndForces.every(v=>Number.isFinite(Number(v)))));
        addLine(rows,"استخراج بردارهای هم‌زمان تقاضای اعضا در هر ترکیب",
          hasMemberDemand,
          hasMemberDemand?"بردار ۱۲ مؤلفه‌ای نیرو برای تک‌تک اعضا و هر ترکیب حفظ شده است؛ پوش‌های مستقل N/V/M صرفاً خلاصه‌اند و جایگزین نیروهای هم‌زمان برای طراحی نیستند.":"در یک یا چند ترکیب، بردار نیروهای هم‌زمان تمام اعضا موجود یا کامل نیست.");

        const coverage=audit3DCombinationCoverage(window.SteelStructuralModel?.getData?.(),window.SteelAnalysis.combinationResults);
        addLine(rows,"ممیزی پوشش تحلیل سه‌بعدی تمام اعضا",coverage.success,
          coverage.success
            ? coverage.expectedMemberCount+" عضو مدل در هر "+coverage.caseCount+" ترکیب، با شناسه یکتا، بردار کامل ۱۲ مؤلفه‌ای نیرو و تعادل عددی ثبت شده‌اند. این ممیزی پوشش نتایج است؛ نه تأیید مقاومت یا طراحی آیین‌نامه‌ای."
            : coverage.issues.slice(0,12).join("؛ "));

        // Reuse the actual 3D combination solver vectors to build per-case
        // section-demand evidence. No factors or code combinations are inferred.
        let memberDemandPackage=null;
        try {
          const demandApi=window.SteelMemberDesignDemandPackage;
          const modelMembers=Array.isArray(fullModelForAnalysis?.members)?fullModelForAnalysis.members:[];
          const sourceCases=window.SteelAnalysis.combinationResults;
          if(!demandApi?.buildFromSolverCases) throw new Error("بسته تقاضای ایستگاهی یا پل نمودار نیرو بارگذاری نشده است.");
          if(!modelMembers.length) throw new Error("مدل فیزیکی اعضا برای استخراج تقاضای ایستگاهی موجود نیست.");
          const runnerCases=sourceCases.map(item=>({
            success:true,status:"isolated_analysis_proposal",
            solverResult:{
              success:true,equilibrium:item.equilibrium||null,
              members:Array.isArray(item.members)?item.members.map(member=>({
                id:String(member.id),
                localEndForces:Array.isArray(member.localEndForces)?member.localEndForces.slice():[]
              })):[],
            },
            simultaneousActionCase:{
              caseId:String(item.id||""),source:item.source||null,
              equilibriumOk:item.equilibrium?.ok===true,
            },
          }));
          memberDemandPackage=demandApi.buildFromSolverCases(
            fullModelForAnalysis,runnerCases,
            {expectedMemberIds:modelMembers.map(member=>String(member.id))}
          );
        } catch(error) {
          memberDemandPackage={success:false,status:"insufficient_data",issues:[String(error?.message||error)],designApproved:false};
        }
        const sourceDetail=memberDemandPackage?.sourceAudit
          ? sourceAuditDetail(memberDemandPackage.sourceAudit)
          : "";
        addLine(rows,"استخراج تقاضای ایستگاهی از خروجی واقعی حل‌گر",memberDemandPackage?.success===true,
          memberDemandPackage?.success===true
            ? "تقاضای شش‌مؤلفه‌ای در ایستگاه‌های اعضا برای "+memberDemandPackage.caseIds.length+" حالت تحلیل مستقل ثبت شد؛ هنوز ترکیب آیین‌نامه‌ای یا ظرفیت عضو محاسبه نشده است."
            : [sourceDetail,(memberDemandPackage?.issues||["بسته تقاضای ایستگاهی ساخته نشد."]).slice(0,10).join("؛ ")].filter(Boolean).join(" "));

        const bucklingMessage=$("bucklingMessage");
        if($("combinationBucklingResults"))$("combinationBucklingResults").innerHTML="";
        if(bucklingMessage)bucklingMessage.textContent="کنترل کمانش در حال اجراست...";
        window.SteelStability?.checkCombinationBuckling?.();
        const bucklingText=bucklingMessage?.textContent||"";
        const bucklingOK=/انجام شد|موفق/i.test(bucklingText)&&!/خطا/.test(bucklingText);
        const gaps=stabilityGaps();
        const gapText=gaps.length?"موارد واردنشده: "+gaps.join("؛ ")+". ":"";
        addLine(rows,"کنترل مقدماتی کمانش در ترکیبات بار",bucklingOK,
          bucklingOK?bucklingText:gapText+"طول مهارنشده و K از ترسیم شماتیک مهاربند یا قید به‌تنهایی قابل تأیید نیستند؛ فقط مهارهایی باید منظور شوند که پیوستگی، سختی و اتصال آن‌ها طراحی و تأیید شده باشد. "+bucklingText);

        runStep(rows,"کنترل مقدماتی کنسول رفتر",()=>window.SteelCantileverCheck?.calculate?.(),
          ()=>!!window.SteelCantileverCheck?.lastResult);
      }

      // بهینه‌سازی اقتصادی پرلین عمداً از زنجیره کنترل آیین‌نامه‌ای جداست؛ انتخاب مقطع کاربر را تغییر نمی‌دهیم.

      const cant=window.SteelLongitudinalCantilever;
      if(cant?.run) {
        cant.run();
        addLine(rows,"کنترل کنسول طولی پرلین",!!cant.lastResult?.results,
          cant.lastResult?.results?"بار ثقلی و باد با علامت در دو حالت مستقل کنترل شدند.":"ابتدا باید پرلین معتبر انتخاب شود.");
      }

      const roofTie=window.SteelRoofTies;
      if(roofTie?.calculate) {
        roofTie.lastResult=null;
        roofTie.calculate();
        addLine(rows,"محاسبه سختی و ظرفیت مقدماتی قیدهای سقف",!!roofTie.lastResult,
          roofTie.lastResult?"محاسبه مقدماتی انجام شد؛ مشخصات و اتصال قید باید با اجرا تطبیق داده شوند.":"ورودی‌های قید سقف کامل نیستند.");
      }

      const purlinConn=window.SteelPurlinCantileverConnection;
      if(purlinConn?.calculate) {
        purlinConn.lastResult=null;
        purlinConn.calculate();
        addLine(rows,"کنترل مقدماتی اتصال کنسول پرلین",!!purlinConn.lastResult,
          purlinConn.lastResult?"خروجی اتصال محاسبه شد؛ فرضیات پیچ و ورق باید بازبینی شوند.":"مشخصات اتصال یا نتایج پرلین/کنسول ناقص است.");
      }

      // ترسیم و بازآرایی نماها از زنجیره تحلیل جداست و فقط هنگام درخواست نمایش اجرا می‌شود.

      addLine(rows,"تعیین خودکار خواص هندسی مقاطع",true,
        "خواص هندسی ستون و رفتر در صورت وجود ابعاد معتبر از تیرورق محاسبه می‌شود؛ این کار جایگزین تأیید گرید و خواص مکانیکی فولاد نیست.");

      setReport(rows,"گزارش اجرای خودکار پروژه — نتایج مقدماتی");
      if(window.SteelProject?.setStatus)window.SteelProject.setStatus("اجرای خودکار مراحل وابسته انجام شد؛ موارد ناقص در گزارش اجرای خودکار مشخص شده‌اند.");
    } finally {
      busy=false;
    }
  }
  function init() {
    if($("steelAutoWorkflowPanel"))return;
    const main=document.querySelector("main");if(!main)return;
    const panel=document.createElement("section");
    panel.className="panel";panel.id="steelAutoWorkflowPanel";
    panel.innerHTML='<div class="panel-title"><h3>اجرای هوشمند و یکپارچه پروژه</h3><span class="status">اجرای خودکار مراحل وابسته</span></div>'+
      '<div class="notice">با یک فرمان، نرم‌افزار مراحل قابل انجام را به ترتیب اجرا می‌کند: تکمیل مقاطع از ابعاد تیرورق موجود، تحلیل قاب و ترکیبات بار، استخراج تقاضا، کنترل‌های مقدماتی، بهینه‌سازی پرلین و کنترل کنسول و اتصالات. اطلاعات واقعیِ نامعلوم مانند طول مهارنشده، گواهی فولاد و داده اقلیمیِ تأییدنشده حدس زده نمی‌شوند.</div>'+
      '<div class="button-grid"><button type="button" id="btnSteelAutoWorkflow" class="btn primary">آماده‌سازی و تحلیل خودکار کل پروژه</button></div>'+
      '<div id="steelAutoWorkflowResults" class="notice">برای اجرای زنجیره محاسبات، دکمه بالا را بزنید.</div>';
    const first=main.querySelector(".panel");
    if(first)main.insertBefore(panel,first);else main.appendChild(panel);
    $("btnSteelAutoWorkflow").addEventListener("click",run);
  }
  window.SteelAutoWorkflow={run,audit3DCombinationCoverage,auditCraneReadiness,summarizeSourceAudit,sourceAuditDetail,selfTest};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

/* ===== steel2/js/project-diagnostics.js ===== */
/* SAHROUD STEEL - Read-only Project Diagnostics 1.0
 * Does not write to localStorage, alter form values, build the model, or change sections.
 */
(function () {
  "use strict";
  const STORAGE_KEY = "sahroudSteelProject.autosave.v3";
  const GROUPS = ["column","rafter","roofPurlin","wallGirt","endPost","endGirt","wallBrace","roofBrace","roofEdge"];
  const FIELDS = ["A_cm2","Iy_cm4","Iz_cm4","J_cm4"];
  const LABELS = {
    column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید دیوار",
    endPost:"ستونک انتهایی",endGirt:"تیر افقی انتهایی",wallBrace:"مهاربند دیوار",
    roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"
  };
  const $ = id => document.getElementById(id);
  const stable = value => {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(k => JSON.stringify(k)+":"+stable(value[k])).join(",") + "}";
    return JSON.stringify(value);
  };
  function fingerprint(value) {
    const s = stable(value);
    let h = 2166136261;
    for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
    return ("00000000" + (h>>>0).toString(16)).slice(-8);
  }
  function sameNumber(a,b) {
    const x=Number(a), y=Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return Object.is(a,b);
    return Math.abs(x-y) <= Math.max(1e-10,Math.max(Math.abs(x),Math.abs(y))*1e-9);
  }
  function sectionGroups(data) {
    return data && data.analysis3d && data.analysis3d.groups ? data.analysis3d.groups : {};
  }
  function compareGroups(saved, live) {
    const issues=[];
    GROUPS.forEach(key=>{
      const a=saved[key], b=live[key];
      if (!a && !b) return;
      if (!a || !b) { issues.push(LABELS[key]+": گروه در "+(!a?"فایل ذخیره‌شده":"ورودی فعلی")+" وجود ندارد."); return; }
      FIELDS.forEach(field=>{
        if (!sameNumber(a[field],b[field])) issues.push(LABELS[key]+" / "+field+": ذخیره="+a[field]+"؛ فعلی="+b[field]);
      });
    });
    return issues;
  }
  function addStyles() {
    if ($("projectDiagnosticsStyle")) return;
    const style=document.createElement("style");
    style.id="projectDiagnosticsStyle";
    style.textContent=".diagnostics-panel{border:1px solid #9bb5c3;background:#f8fbfc;border-radius:12px;padding:14px;margin:16px 0;color:#183746}.diagnostics-panel h3{margin:0 0 8px}.diagnostics-panel .diag-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.diagnostics-panel button{border:0;border-radius:8px;padding:10px 14px;background:#155e75;color:#fff;font-weight:700}.diagnostics-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;direction:rtl;text-align:right;background:#fff;border:1px solid #d5e1e7;border-radius:8px;padding:12px;font:12px/1.8 Tahoma,Arial;max-height:65vh;overflow:auto}.diagnostics-panel .diag-note{font-size:12px;color:#526b78;line-height:1.8}";
    document.head.appendChild(style);
  }
  function ensurePanel() {
    if ($("projectDiagnosticsPanel")) return;
    const panel=document.createElement("section");
    panel.id="projectDiagnosticsPanel";
    panel.className="diagnostics-panel";
    panel.innerHTML='<h3>عیب‌یابی و تطبیق داده‌های پروژه</h3><p class="diag-note">این ابزار فقط اطلاعات را می‌خواند؛ هیچ مقدار، فایل، ذخیره خودکار یا مقطعی را تغییر نمی‌دهد.</p><div class="diag-actions"><button id="btnRunProjectDiagnostics" type="button">اجرای عیب‌یابی فقط‌خواندنی</button></div><pre id="projectDiagnosticsOutput">برای شروع، دکمه اجرای عیب‌یابی را بزنید.</pre>';
    const footer=document.querySelector("footer");
    if (footer && footer.parentNode) footer.parentNode.insertBefore(panel,footer);
    else document.querySelector("main")?.appendChild(panel);
    $("btnRunProjectDiagnostics").addEventListener("click",run);
  }
  function run() {
    const out=$("projectDiagnosticsOutput");
    const lines=[];
    const add=(title,value)=>lines.push(title+" : "+value);
    try {
      let saved=null, storageStatus="نامشخص";
      try {
        const raw=localStorage.getItem(STORAGE_KEY);
        if (raw) { saved=JSON.parse(raw); storageStatus="autosave موجود"; }
        else storageStatus="autosave موجود نیست؛ در بارگذاری اولیه فایل default-project.json استفاده می‌شود.";
      } catch(e) { storageStatus="خطا در خواندن/تجزیه localStorage: "+e.message; }
      const sections=window.SteelSections && window.SteelSections.read ? window.SteelSections.read() : null;
      const liveGroups=sectionGroups(sections);
      const savedGroups=sectionGroups(saved && saved.sections);
      const model=window.SteelStructuralModel && window.SteelStructuralModel.model;
      const members=model && Array.isArray(model.members)?model.members:[];
      const groupCounts={};
      const resolverErrors=[];
      members.forEach(member=>{
        const key=member.sectionKey||"unassigned";
        groupCounts[key]=(groupCounts[key]||0)+1;
        if (window.SteelSections && window.SteelSections.resolveAnalysis3DSection) {
          try { window.SteelSections.resolveAnalysis3DSection(member); }
          catch(e) { resolverErrors.push((member.id||"عضو بدون شناسه")+" ["+key+"]: "+e.message); }
        }
      });
      const liveFingerprint=fingerprint(liveGroups);
      const savedFingerprint=saved?fingerprint(savedGroups):"—";
      add("وضعیت منبع ذخیره",storageStatus);
      add("کلید ذخیره مرورگر",STORAGE_KEY);
      add("زمان ثبت‌شده autosave",saved&&saved.savedAt?saved.savedAt:"ثبت نشده/در دسترس نیست");
      add("نسخه نرم‌افزار در snapshot",saved&&saved.version?saved.version:"نامشخص");
      add("schemaVersion",saved&&saved.schemaVersion!==undefined?saved.schemaVersion:"تعریف نشده (نسخه‌بندی schema هنوز پیاده‌سازی نشده)");
      add("اثر انگشت گروه مقاطع فعلی",liveFingerprint);
      add("اثر انگشت گروه مقاطع ذخیره‌شده",savedFingerprint);
      add("تعداد گروه‌های دارای داده فعلی",Object.keys(liveGroups).filter(k=>liveGroups[k]&&FIELDS.some(f=>Number(liveGroups[k][f])>0)).length+" از "+GROUPS.length);
      if (saved) {
        const diffs=compareGroups(savedGroups,liveGroups);
        add("تطبیق مقاطع ذخیره‌شده با فرم فعلی",diffs.length?"اختلاف یافت شد ("+diffs.length+")":"مطابق در چهار خاصیت اصلی گروه‌ها");
        diffs.slice(0,30).forEach(x=>lines.push("  • "+x));
        if (diffs.length>30) lines.push("  • ... "+(diffs.length-30)+" اختلاف دیگر");
      } else {
        add("تطبیق snapshot","قابل انجام نیست؛ هنوز autosave در این مرورگر وجود ندارد.");
      }
      add("تعداد اعضای مدل حاضر در حافظه",model?members.length:"مدل هنوز ساخته/بارگذاری نشده");
      add("توزیع اعضا بر اساس sectionKey",Object.keys(groupCounts).length?JSON.stringify(groupCounts):"در دسترس نیست");
      add("خطاهای تخصیص مقطع به اعضا",resolverErrors.length);
      resolverErrors.slice(0,20).forEach(x=>lines.push("  • "+x));
      if(resolverErrors.length>20) lines.push("  • ... "+(resolverErrors.length-20)+" خطای دیگر");
      if (model && Array.isArray(model.members)) {
        const modelKeys=[...new Set(members.map(m=>m.sectionKey||"unassigned"))].sort();
        const unknown=modelKeys.filter(k=>!GROUPS.includes(k));
        add("کلیدهای مقطع ناشناخته در مدل",unknown.length?unknown.join(", "):"ندارد");
      }
      const loads=window.SteelLoads&&window.SteelLoads.getData?window.SteelLoads.getData():null;
      if(loads){
        add("بار باد سقف چپ/راست (kN/m²)",String(loads.windLeft)+" / "+String(loads.windRight));
        add("بار باد دیوار طولی (kN/m²)",String(loads.windWall));
        add("بار باد دیوار انتهایی جلو/عقب (kN/m²)",String(loads.windEndFront)+" / "+String(loads.windEndBack));
        add("سرعت مبنای باد (km/h)",loads.climate&&loads.climate.basicWind!==undefined?loads.climate.basicWind:"ثبت نشده");
        add("وضعیت بازشو غالب",loads.climate&&loads.climate.dominantOpening!==undefined?loads.climate.dominantOpening:"نامشخص");
      }
      const wind=window.SteelClimateLoadEngine&&window.SteelClimateLoadEngine.getData?window.SteelClimateLoadEngine.getData():null;
      if(wind){
        add("رکوردهای بار اقلیمی",Array.isArray(wind.cases)?wind.cases.length:"نامشخص");
        add("موارد واجد تأیید طراحی آیین‌نامه‌ای",Array.isArray(wind.cases)?wind.cases.filter(x=>x.eligibleForCodeDesign===true).length:"نامشخص");
        add("وضعیت محاسبه باد",wind.status||"ضرایب/وضعیت کامل باید جداگانه کنترل شود");
      }
      const openings=window.SteelOpenings&&window.SteelOpenings.getData?window.SteelOpenings.getData():null;
      if(openings) add("بازشوهای فعال",Object.keys(openings).filter(k=>openings[k]&&openings[k].enabled).join(", ")||"هیچ‌کدام");
      const purlins=window.SteelRoofPurlins&&window.SteelRoofPurlins.getData?window.SteelRoofPurlins.getData():null;
      if(purlins) add("تنظیمات پرلین سقف", "خانواده="+purlins.family+"؛ فاصله="+purlins.pitch+"m؛ Z="+purlins.sectionHeight+"×"+purlins.flange+"×"+purlins.lip+"×"+purlins.thickness+"mm");
      const structural=saved&&saved.structuralModel;
      if(structural&&Array.isArray(structural.members)) add("اعضای مدل ذخیره‌شده",structural.members.length);
      if(saved&&saved.sections&&saved.sections.rafter) add("رفتر ذخیره‌شده A / Ix / Iy",saved.sections.rafter.A_cm2+" / "+saved.sections.rafter.Ix_cm4+" / "+saved.sections.rafter.Iy_cm4);
      if(sections&&sections.rafter) add("رفتر فعلی A / Ix / Iy",sections.rafter.A_cm2+" / "+sections.rafter.Ix_cm4+" / "+sections.rafter.Iy_cm4);
      lines.push("");
      lines.push("تفسیر: تطابق داده‌ها فقط یکپارچگی ورودی را نشان می‌دهد؛ به معنی صحت آیین‌نامه‌ای، پایداری یا ایمنی سازه نیست.");
      lines.push("توجه: ورودی‌های باد در نسخه فعلی عمدتاً دستی‌اند و فشارهای نواحی/بازشوها و ترکیبات باید جداگانه تکمیل و اعتبارسنجی شوند.");
      out.textContent=lines.join("\n");
    } catch(error) {
      out.textContent="عیب‌یابی با خطا متوقف شد: "+(error&&error.stack?error.stack:error);
    }
  }
  function init(){addStyles();ensurePanel();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
  window.SahroudProjectDiagnostics={run};
})();

/* ===== steel2/js/construction-drawings.js ===== */
/* SAHROUD STEEL — parametric construction drawing sheets, phase 1.
 * Plan/section/member schedule are generated from the current model and footing schedule.
 * No unverified reinforcement, connection, anchor, bolt or weld details are invented.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,d=2)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last=null;
function collect(){
 const m=window.SteelStructuralModel?.model;
 if(!m?.nodes?.length||!m?.members?.length)throw Error('ابتدا مدل سه‌بعدی سازه را بسازید.');
 const fd=window.SteelFoundationTakeoff?.getData?.()||{},td=window.SteelTieBeamLayout?.getData?.()||{};
 const bases=m.nodes.filter(x=>x.kind==='base'||x.kind==='endwall-base').sort((a,b)=>a.z-b.z||a.x-b.x);
 if(!bases.length)throw Error('گره پایه‌ای در مدل پیدا نشد.');
 const footings=bases.map(v=>{const d=(fd.footingSchedule||{})[String(v.id)]||window.SteelFoundationTakeoff?.defaultFootingSpec?.(v)||{width:1.8,length:1.8,thickness:.8};const width=n(d.width),length=n(d.length),thickness=n(d.thickness);if(!(width>0&&length>0&&thickness>0))throw Error('ابعاد پی '+v.id+' نامعتبر است.');return{id:v.id,x:n(v.x)||0,z:n(v.z)||0,kind:v.kind,width,length,thickness};});
 return{m,fd,td,footings,routes:(td.routes||[]).filter(r=>r?.start&&r?.end),tieRebar:window.SteelTieBeamReinforcement?.getLast?.()||null,members:m.members.map(v=>({id:v.id,section:v.sectionKey||'unassigned',start:v.start,end:v.end,length:n(v.length),cut:n(v.fabricationLengthM)}))};
}
function t(x,y,s,size=13,anchor='middle',color='#203746'){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" text-anchor="'+anchor+'" fill="'+color+'" font-family="Tahoma,Arial" direction="rtl">'+esc(s)+'</text>';}
function ln(x1,y1,x2,y2,color='#334155',w=2,dash=''){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';}
function frame(title,body,subtitle){return '<svg xmlns="'+NS+'" width="1189mm" height="841mm" viewBox="0 0 1600 1131"><rect width="1600" height="1131" fill="white"/><rect x="24" y="24" width="1552" height="1083" fill="none" stroke="#203746" stroke-width="2"/>'+t(1540,65,title,25,'end')+t(1540,92,subtitle||'SAHROUD STEEL | نقشه تولیدشده از مدل پروژه',13,'end','#526777')+body+'<rect x="1050" y="1035" width="500" height="48" fill="none" stroke="#203746"/>'+ln(1300,1035,1300,1083)+ln(1400,1035,1400,1083)+t(1525,1065,'SAHROUD STEEL',15,'end')+t(1380,1065,'مقیاس: شماتیک',11)+t(1275,1065,'بازبینی مهندس محاسب الزامی است',10)+'</svg>';}
function plan(d){
 const f=d.footings,minX=Math.min(...f.map(v=>v.x-v.width/2)),maxX=Math.max(...f.map(v=>v.x+v.width/2)),minZ=Math.min(...f.map(v=>v.z-v.length/2)),maxZ=Math.max(...f.map(v=>v.z+v.length/2));
 const s=Math.min(1050/Math.max(maxX-minX,1),650/Math.max(maxZ-minZ,1)),X=x=>250-minX*s+x*s,Z=z=>170-minZ*s+z*s;let b='<rect x="80" y="120" width="1440" height="780" fill="white" stroke="#cbd5e1"/>';
 [...new Set(f.map(v=>v.x))].sort((a,b)=>a-b).forEach(x=>b+=ln(X(x),125,X(x),885,'#e2e8f0',1,'5 5')+t(X(x),910,'X='+fmt(x),10));
 [...new Set(f.map(v=>v.z))].sort((a,b)=>a-b).forEach(z=>b+=ln(85,Z(z),1510,Z(z),'#e2e8f0',1,'5 5')+t(95,Z(z)-8,'Z='+fmt(z),10,'start'));
 d.routes.forEach(r=>{const a=f.find(v=>v.id===r.start),c=f.find(v=>v.id===r.end);if(a&&c)b+=ln(X(a.x),Z(a.z),X(c.x),Z(c.z),'#0f766e',8,'14 8');});
 f.forEach(v=>{const w=v.width*s,h=v.length*s,x=X(v.x)-w/2,y=Z(v.z)-h/2;b+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2.5"/>'+ln(X(v.x),y,X(v.x),y+h,'#60a5fa',1)+ln(x,Z(v.z),x+w,Z(v.z),'#60a5fa',1)+t(X(v.x),Z(v.z)-7,v.id,12)+t(X(v.x),Z(v.z)+17,fmt(v.width)+' × '+fmt(v.length)+' m',11,'middle','#1e3a8a');});
 return b+t(800,970,'مستطیل آبی: محدوده پی | خط سبز: مسیر شناژ ثبت‌شده در ورودی‌ها',14)+t(800,995,'مختصات از گره‌های مدل و ابعاد از جدول مستقل فونداسیون خوانده شده‌اند.',12);
}
function tieRebarDrawing(d){
 let b='<rect x="80" y="120" width="1440" height="780" fill="white" stroke="#cbd5e1"/>';
 const reportRows=d.tieRebar?.rows||[],nodes=new Map(d.m.nodes.map(v=>[String(v.id),v]));
 if(!d.routes.length)return frame('جزئیات آرماتور شناژ — مسیر تعریف نشده',b+t(800,480,'هیچ مسیر شناژی در مدل تعریف نشده است.',20),'نقشه آرماتور پیوسته از مسیرهای واقعی مدل استخراج می‌شود');
 let y=185,drawn=0;
 d.routes.forEach(route=>{
  const row=reportRows.find(x=>String(x.id)===String(route.id));
  if(!row?.ok||!row.longitudinalBars?.footingPath?.ok||row.longitudinalBars.hookAllowanceIncluded!==true){
   b+=t(120,y,'شناژ '+route.id+': جزئیات میلگرد ممتد هنوز آماده ترسیم نیست؛ تحلیل، مسیر، قلاب و خاموت باید تکمیل شوند.',13,'start','#b45309');y+=45;return;
  }
  const path=window.SteelFoundationTakeoff?.footingsAlongStraightRoute?.(d.m.nodes,route);
  if(!path?.ok){b+=t(120,y,'شناژ '+route.id+': مسیر مستقیم پی‌ها قابل استخراج نیست؛ نقشه صادر نشد.',13,'start','#b91c1c');y+=45;return;}
  const first=nodes.get(String(route.start)),last=nodes.get(String(route.end)),axis=Math.abs(Number(last.x)-Number(first.x))>=Math.abs(Number(last.z)-Number(first.z))?'X':'Z';
  const p=row.longitudinalBars.footingPath,total=p.startExtensionM+p.routeLengthM+p.endExtensionM,scale=Math.min(760/Math.max(total,.1),190),origin=190,barStart=origin,barEnd=origin+total*scale,beamStart=origin+p.startExtensionM*scale,beamEnd=beamStart+p.routeLengthM*scale,baseY=y+48;
  b+=t(1480,y,'شناژ '+route.id+' | '+route.start+' تا '+route.end,15,'end','#1e3a8a');
  b+='<rect x="'+beamStart+'" y="'+(baseY+12)+'" width="'+(beamEnd-beamStart)+'" height="62" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>';
  path.footings.forEach(point=>{
   const spec=d.fd.footingSchedule?.[String(point.node.id)]||window.SteelFoundationTakeoff?.defaultFootingSpec?.(point.node)||{width:1.8,length:1.8,thickness:.8};
   const along=axis==='X'?Number(spec.width):Number(spec.length),center=beamStart+Number(point.stationM)*scale,w=along*scale;
   b+='<rect x="'+(center-w/2)+'" y="'+(baseY-8)+'" width="'+w+'" height="102" fill="#dbeafe" fill-opacity=".65" stroke="#1d4ed8" stroke-width="2"/>'+t(center,baseY-15,String(point.node.id),10);
  });
  b+=ln(barStart,baseY+29,barEnd,baseY+29,'#dc2626',4)+ln(barStart,baseY+57,barEnd,baseY+57,'#dc2626',4);
  b+=ln(barStart,baseY+29,barStart,baseY+8,'#dc2626',3)+ln(barEnd,baseY+57,barEnd,baseY+78,'#dc2626',3);
  b+=t(1480,y+120,'میلگرد طولی: '+row.longitudinalBars.countEachFace+' شاخه در هر وجه | قطر '+row.barDiaMm+' mm | طول برش کل '+fmt(row.longitudinalBars.totalCutLengthM)+' m',12,'end');
  b+=t(1480,y+145,'عبور پیوسته از '+path.footings.length+' فونداسیون | افزوده قلاب هر انتها: '+fmt(row.longitudinalBars.hookCutAllowancePerEndMm)+' mm؛ شکل قلاب باید در نقشه جزئیات نهایی شود.',11,'end','#475569');
  y+=210;drawn++;
 });
 if(!drawn)b+=t(800,940,'تا تکمیل داده‌های معتبر، هیچ جزئیات آرماتور اجرایی صادر نشده است.',14,'middle','#b45309');
 else b+=t(800,965,'خط قرمز: میلگرد طولی پیوسته؛ مستطیل آبی: فونداسیون؛ مقطع شناژ خاکستری. نمایش شماتیک و بدون مقیاس اجرایی.',12);
 return frame('نقشه آرماتور طولی ممتد شناژ از داخل فونداسیون‌ها',b,'بر اساس آخرین غربال آرماتور، ابعاد پی‌ها و مسیرهای ثبت‌شده');
}
function section(d,top){
 const f=d.footings[0],bw=n(d.fd.tieWidthM)||.6,bh=n(d.fd.tieHeightM)||.5,bottom=top-f.thickness,tieBottom=top-bh,delta=f.thickness-bh;
 const sx=260,sy=300,ox=800,oy=440,pw=f.width*sx,ph=f.thickness*sy,tw=bw*sx,th=bh*sy;
 let b='<rect x="100" y="120" width="1400" height="780" fill="white" stroke="#cbd5e1"/>';
 b+='<rect x="'+(ox-pw/2)+'" y="'+oy+'" width="'+pw+'" height="'+ph+'" fill="#cbd5e1" stroke="#334155" stroke-width="3"/>';
 b+='<rect x="'+(ox-pw/2-tw/2)+'" y="'+oy+'" width="'+(pw+tw)+'" height="'+th+'" fill="#94a3b8" fill-opacity=".75" stroke="#334155" stroke-width="3"/>';
 b+=ln(150,oy,1450,oy,'#d97706',2,'10 6')+t(1450,oy-12,'تراز مشترک بالای پی و شناژ',15,'end','#b45309');
 b+=ln(ox+pw/2+60,oy,ox+pw/2+60,oy+ph)+t(ox+pw/2+75,oy+ph/2,'ضخامت پی '+fmt(f.thickness)+' m',13,'start');
 b+=ln(ox+pw/2+115,oy,ox+pw/2+115,oy+th,'#0f766e')+t(ox+pw/2+130,oy+th/2,'ارتفاع شناژ '+fmt(bh)+' m',13,'start','#0f766e');
 b+=ln(ox-pw/2,oy+ph+25,ox+pw/2,oy+ph+25)+t(ox,oy+ph+48,'عرض پی '+fmt(f.width)+' m',13);
 return b+t(800,180,'مقطع شماتیک پی و شناژ — پایه نمونه '+f.id,19)+t(800,220,'کف پی: '+fmt(bottom)+' m | کف شناژ: '+fmt(tieBottom)+' m نسبت به مبنای انتخابی',14)+t(800,820,'اختلاف عمق خاکبرداری زیر پی نسبت به زیر شناژ: '+fmt(delta)+' m',15,'middle',delta>=0?'#166534':'#b91c1c')+t(800,855,'تراز مبنا قراردادی است؛ بدون تراز زمین، عمق خاکبرداری واقعی صادر نمی‌شود.',12);
}
function memberSchedule(d){
 const cols=[90,280,480,720,960,1190,1450],heads=['ردیف','شناسه عضو','گروه مقطع','گره ابتدا','گره انتها','طول مدل (m)','طول ساخت (m)'];let b='<rect x="70" y="120" width="1460" height="820" fill="white" stroke="#cbd5e1"/>'+t(800,160,'جدول اعضای مدل فولادی',20);
 heads.forEach((h,i)=>b+=t((cols[i]+cols[i+1])/2,205,h,12));b+=ln(90,220,1510,220,'#334155',2);
 d.members.slice(0,27).forEach((v,i)=>{const y=250+i*24,a=[i+1,v.id,v.section,v.start,v.end,v.length==null?'—':fmt(v.length,3),v.cut==null?'نیازمند جزئیات ساخت':fmt(v.cut,3)];a.forEach((q,j)=>b+=t((cols[j]+cols[j+1])/2,y,String(q),10));b+=ln(90,y+8,1510,y+8,'#e2e8f0',1);});
 return b+t(800,945,'این جدول نقشه قطعه/مونتاژ نیست؛ طول برش فقط با رکورد ساخت معتبر درج می‌شود.',12);
}
function build(){
 const d=collect(),datum=n($('cdTopDatum')?.value);if(datum===null)throw Error('تراز قراردادی بالای پی و شناژ را وارد کنید.');
 last={generatedAt:new Date().toISOString(),datumTopM:datum,footings:d.footings,routes:d.routes,members:d.members,sheets:{
 foundationPlan:frame('نقشه فونداسیون — پلان جانمایی',plan(d),'مختصات از مدل سه‌بعدی | ابعاد از جدول مستقل پی‌ها'),
 foundationSection:frame('نقشه فونداسیون — مقطع و ترازها',section(d,datum),'تراز مشترک بالای پی و شناژ | مقطع شماتیک'),
 steelMemberSchedule:frame('جدول اعضای سازه فولادی',memberSchedule(d),'اعضای استخراج‌شده از مدل هندسی فعلی'),
 tieRebarDetail:tieRebarDrawing(d)
 },limitations:['این‌ها نقشه‌های پارامتریک اولیه‌اند و برای اجرا یا مهر مهندس آماده نیستند.','تراز مبنا قراردادی است؛ تراز زمین، کف تمام‌شده و عمق خاکبرداری واقعی هنوز وارد نشده‌اند.','آرماتور، قلاب، طول مهاری، وصله، کاور و لیستوفر هنوز طراحی/کنترل نهایی نشده‌اند.','اتصالات فولادی، ورق‌ها، سوراخ‌کاری، پیچ و جوش از طراحی اتصال تأییدشده استخراج نشده‌اند.','جدول اعضا طول هندسی را نشان می‌دهد؛ طول ساخت فقط در صورت وجود داده معتبر درج می‌شود.']};
 render();return last;
}
function render(){const host=$('constructionDrawingPreview');if(!host||!last)return;host.innerHTML='<div class="notice">چهار شیت آماده شد: پلان فونداسیون، مقطع، جدول اعضای فولادی و جزئیات شماتیک آرماتور ممتد شناژ (در صورت تکمیل ورودی‌ها).</div>'+Object.entries(last.sheets).map(([k,v])=>'<details open style="margin:10px 0"><summary>'+({foundationPlan:'پلان فونداسیون',foundationSection:'مقطع فونداسیون و شناژ',steelMemberSchedule:'جدول اعضای فولادی',tieRebarDetail:'آرماتور طولی ممتد شناژ'}[k])+'</summary><div style="overflow:auto;border:1px solid #cbd5e1;background:white">'+v+'</div></details>').join('');}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function print(){if(!last)build();const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>SAHROUD STEEL drawings</title><style>@page{size:A3 landscape;margin:8mm}body{margin:0;font-family:Tahoma}section{page-break-after:always}svg{width:100%;height:auto;max-height:275mm}</style>'+Object.values(last.sheets).map(s=>'<section>'+s+'</section>').join('')+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function printFoundationPlan(){if(!last)build();const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>SAHROUD STEEL — Foundation Plan</title><style>@page{size:A3 landscape;margin:8mm}body{margin:0;font-family:Tahoma}svg{width:100%;height:auto;max-height:275mm}</style>'+last.sheets.foundationPlan+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function mount(){
 if($('constructionDrawingsPanel'))return;const a=$('foundationTakeoffPanel')||$('quantityTakeoffPanel')||document.querySelector('main');if(!a)return;
 const p=document.createElement('section');p.className='panel';p.id='constructionDrawingsPanel';p.setAttribute('data-focus-group','foundation foundation-plan');
 p.innerHTML='<div class="panel-title"><h3>نقشه‌های اجرایی و مدارک ساخت — مرحله اول</h3><span class="status">تولید پارامتریک از مدل</span></div><div class="notice">پلان پی از مختصات پایه‌ها و جدول ابعاد مستقل تولید می‌شود؛ مسیر شناژ فقط از مسیرهای ثبت‌شده رسم می‌شود. مقطع، تراز مشترک بالای پی و شناژ را رعایت می‌کند. جدول اعضا از مدل هندسی استخراج می‌شود.</div><div class="field"><label for="cdTopDatum">تراز قراردادی بالای پی و شناژ (m)</label><input id="cdTopDatum" type="number" step="0.01" value="0"></div><div class="button-grid"><button class="btn primary" id="btnBuildFoundationPlanOnly" type="button">تولید پلان فونداسیون</button><button class="btn secondary" id="btnPrintFoundationPlanOnly" type="button">چاپ / ذخیره PDF پلان</button><button class="btn secondary" id="btnBuildConstructionDrawings" type="button">تولید همه نقشه‌ها</button><button class="btn secondary" id="btnPrintConstructionDrawings" type="button">چاپ PDF همه شیت‌ها</button><button class="btn secondary" id="btnExportDrawingData" type="button">خروجی داده نقشه JSON</button></div><div id="constructionDrawingPreview" class="notice">پس از ساخت مدل سه‌بعدی و ثبت جدول فونداسیون، نقشه‌ها را تولید کنید.</div><div class="notice">مرحله بعد: نقشه آرماتوربندی و لیستوفر، صفحه‌ستون و انکربولت، دیتیل ورق/پیچ/جوش، نقشه تک‌قطعه با سوراخ‌کاری و نقشه مونتاژ. این موارد تا تکمیل طراحی مستقل اتصال و آرماتور، عمداً صادر نمی‌شوند.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $('btnBuildFoundationPlanOnly').addEventListener('click',()=>{try{build();const host=$('constructionDrawingPreview');const sheets=host?.querySelectorAll('details')||[];sheets.forEach((item,index)=>{item.open=index===0;});host?.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){alert(e.message);}});
 $('btnPrintFoundationPlanOnly').addEventListener('click',()=>{try{printFoundationPlan();}catch(e){alert(e.message);}});
 $('btnBuildConstructionDrawings').addEventListener('click',()=>{try{build();}catch(e){alert(e.message);}});
 $('btnPrintConstructionDrawings').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportDrawingData').addEventListener('click',()=>{try{if(!last)build();download('SAHROUD-STEEL-Construction-Drawings.json',JSON.stringify(last,null,2),'application/json;charset=utf-8');}catch(e){alert(e.message);}});
}
window.SteelConstructionDrawings={build,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

/* ===== steel2/js/foundation-rebar-drawings.js ===== */
/* SAHROUD STEEL — foundation reinforcement drawing sheets.
 * Geometry and bar counts are derived only from editable project inputs.
 * Straight bars only: no hooks, bends, laps, anchorage, or design verification.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
let last=null;
function getBaseData(){
 const api=window.SteelFoundationTakeoff,fd=api?.getData?.(),rep=api?.getLast?.();
 if(!fd||!Array.isArray(rep?.rows)||!rep.rows.length)throw Error('ابتدا تحلیل و استخراج واکنش فونداسیون را اجرا کنید.');
 const cover=fd.rebarCoverMm===''||fd.rebarCoverMm==null?null:Number(fd.rebarCoverMm);
 if(!Number.isFinite(cover)||cover<0)throw Error('پوشش بتن باید از نقشه یا مشخصات پروژه وارد شود؛ مقدار فرضی استفاده نمی‌شود.');
 const defs=[
  ['B-X','شبکه تحتانی، موازی X','bottomBarDiaXmm','bottomBarSpacingXmm','bottom','X'],
  ['B-Z','شبکه تحتانی، موازی Z','bottomBarDiaZmm','bottomBarSpacingZmm','bottom','Z'],
  ['T-X','شبکه فوقانی، موازی X','topBarDiaXmm','topBarSpacingXmm','top','X'],
  ['T-Z','شبکه فوقانی، موازی Z','topBarDiaZmm','topBarSpacingZmm','top','Z']
 ];
 const specs=defs.map(([mark,label,dk,sk,layer,direction])=>({mark,label,dia:Number(fd[dk]),spacing:Number(fd[sk]),layer,direction})).filter(s=>s.dia>0&&s.spacing>0);
 if(!specs.length)throw Error('قطر و فاصله شبکه‌های میلگرد را در بخش متره فونداسیون وارد کنید.');
 const bases=rep.rows.map(row=>{
  const fs=api.footingSpecFor(row),B=Number(fs.width),L=Number(fs.length),T=Number(fs.thickness);
  if(!(B>0&&L>0&&T>0))throw Error('ابعاد پی '+row.nodeId+' معتبر نیست.');
  return{...row,B,L,T,cover};
 });
 const bars=[];
 for(const base of bases)for(const s of specs){
  const cross=(s.direction==='X'?base.L:base.B)*1000-2*cover;
  const parallel=(s.direction==='X'?base.B:base.L)*1000-2*cover;
  if(cross<=0||parallel<=0||base.T*1000<=2*cover+s.dia)throw Error('پوشش یا قطر میلگرد با ابعاد پی '+base.nodeId+' سازگار نیست.');
  const count=Math.ceil(cross/s.spacing)+1,cutLengthM=parallel/1000,unitWeight=s.dia*s.dia/162;
  for(let j=0;j<count;j++)bars.push({mark:s.mark,baseNodeId:base.nodeId,layer:s.layer,direction:s.direction,diaMm:s.dia,spacingMm:s.spacing,position:j+1,count,cutLengthM,unitWeightKgM:unitWeight,weightKg:cutLengthM*unitWeight});
 }
 return{fd,rep,cover,specs,bases,bars};
}
function svgSheet(base,d){
 const W=1100,H=760,ox=540,oy=340,scale=Math.min(330/base.B,250/base.L),w=base.B*scale,h=base.L*scale,x=ox-w/2,y=oy-h/2;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:1100px;background:#fff"><rect width="100%" height="100%" fill="#fff"/><rect x="20" y="20" width="1060" height="720" fill="none" stroke="#203746" stroke-width="2"/>';
 s+='<text x="1040" y="58" text-anchor="end" font-size="24" font-family="Tahoma" fill="#203746">جزئیات شبکه آرماتور فونداسیون — '+esc(base.nodeId)+'</text>';
 s+='<text x="1040" y="88" text-anchor="end" font-size="14" font-family="Tahoma" fill="#526777">ابعاد پی '+fmt(base.B,2)+' × '+fmt(base.L,2)+' × '+fmt(base.T,2)+' m | پوشش واردشده '+fmt(d.cover,0)+' mm</text>';
 s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="3"/>';
 const colors={bottom:'#dc2626',top:'#2563eb'};
 for(const sp of d.specs){
  const cross=(sp.direction==='X'?base.L:base.B)*1000-2*d.cover,parallel=(sp.direction==='X'?base.B:base.L)*1000-2*d.cover,count=Math.ceil(cross/sp.spacing)+1;
  for(let j=0;j<count;j++){const p=count===1?.5:j/(count-1);if(sp.direction==='X'){const yy=y+d.cover/1000*scale+p*(h-2*d.cover/1000*scale);s+='<line x1="'+(x+d.cover/1000*scale)+'" y1="'+yy+'" x2="'+(x+w-d.cover/1000*scale)+'" y2="'+yy+'" stroke="'+colors[sp.layer]+'" stroke-width="2.4"/>';}else{const xx=x+d.cover/1000*scale+p*(w-2*d.cover/1000*scale);s+='<line x1="'+xx+'" y1="'+(y+d.cover/1000*scale)+'" x2="'+xx+'" y2="'+(y+h-d.cover/1000*scale)+'" stroke="'+colors[sp.layer]+'" stroke-width="2.4"/>';}}
 }
 s+='<text x="'+ox+'" y="'+(y+h+35)+'" text-anchor="middle" font-size="15" font-family="Tahoma" fill="#203746">پلان پی — شبکه‌های مستقیم؛ مقیاس شماتیک</text>';
 const sx=165,sy=565,sw=770,sh=95,topY=sy,bottomY=sy+sh;
 s+='<rect x="'+sx+'" y="'+sy+'" width="'+sw+'" height="'+sh+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>';
 if(d.specs.some(q=>q.layer==='top'))s+='<line x1="'+(sx+18)+'" y1="'+(topY+12)+'" x2="'+(sx+sw-18)+'" y2="'+(topY+12)+'" stroke="#2563eb" stroke-width="4"/>';
 if(d.specs.some(q=>q.layer==='bottom'))s+='<line x1="'+(sx+18)+'" y1="'+(bottomY-12)+'" x2="'+(sx+sw-18)+'" y2="'+(bottomY-12)+'" stroke="#dc2626" stroke-width="4"/>';
 s+='<text x="'+(sx+sw/2)+'" y="'+(sy-18)+'" text-anchor="middle" font-size="15" font-family="Tahoma" fill="#203746">مقطع شماتیک ضخامت پی</text>';
 s+='<text x="80" y="705" font-size="14" font-family="Tahoma" fill="#2563eb">آبی: شبکه فوقانی (در صورت ورود مشخصات)</text><text x="565" y="705" font-size="14" font-family="Tahoma" fill="#dc2626">قرمز: شبکه تحتانی</text>';
 s+='<text x="1040" y="725" text-anchor="end" font-size="12" font-family="Tahoma" fill="#92400e">بدون قلاب، خم، وصله، مهاری و تقویت موضعی — نقشه مقدماتی، نه نقشه مصوب اجرا</text></svg>';
 return s;
}
function build(){
 const d=getBaseData(),marks={};
 d.bars.forEach(b=>{const k=b.baseNodeId+'|'+b.mark;if(!marks[k])marks[k]={...b,totalCount:0,totalLengthM:0,totalWeightKg:0};marks[k].totalCount++;marks[k].totalLengthM+=b.cutLengthM;marks[k].totalWeightKg+=b.weightKg;});
 const rows=Object.values(marks).map(r=>({...r,barLengthM:r.cutLengthM}));
 last={generatedAt:new Date().toISOString(),coverMm:d.cover,baseCount:d.bases.length,barCount:d.bars.length,bars:d.bars,barSchedule:rows,sheets:d.bases.map(base=>({baseNodeId:base.nodeId,svg:svgSheet(base,d)})),limitations:['ابعاد هر پی از جدول مستقل فونداسیون خوانده شده است.','تعداد میلگردها با کف‌گیری عرض خالص/فاصله + ۱ محاسبه شده و در نقشه نشان داده می‌شود.','طول برش مستقیم برابر بعد موازی منهای دو برابر پوشش است؛ خم، قلاب، وصله، مهاری و پرت منظور نشده‌اند.','این خروجی متره/ترسیم هندسی است، نه طراحی مقاومت خمشی، برش یک‌طرفه یا پانچ و نه تأیید آیین‌نامه‌ای.','شبکه فوقانی فقط در صورت ورود قطر و فاصله مستقل ترسیم می‌شود.']};
 render();return last;
}
function render(){
 const host=$('foundationRebarDrawingPreview');if(!host||!last)return;
 host.innerHTML='<div class="notice">تعداد پی: '+fmt(last.baseCount,0)+' | تعداد شاخه‌های مستقیم شبکه: '+fmt(last.barCount,0)+' | پوشش واردشده: '+fmt(last.coverMm,0)+' mm</div>'+last.sheets.map(s=>'<details open style="margin:10px 0"><summary>نقشه شبکه آرماتور — '+esc(s.baseNodeId)+'</summary><div style="overflow:auto;border:1px solid #cbd5e1">'+s.svg+'</div></details>').join('')+'<div style="overflow:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>پایه</th><th>مارک</th><th>جهت</th><th>لایه</th><th>قطر</th><th>فاصله</th><th>تعداد</th><th>طول هر شاخه (m)</th><th>طول کل (m)</th><th>وزن (kg)</th></tr></thead><tbody>'+last.barSchedule.map(r=>'<tr>'+[r.baseNodeId,r.mark,r.direction,r.layer==='bottom'?'تحتانی':'فوقانی',r.diaMm,r.spacingMm,r.totalCount,fmt(r.barLengthM,3),fmt(r.totalLengthM,3),fmt(r.totalWeightKg,2)].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);}
function print(){if(!last)build();const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>Foundation rebar drawings</title><style>@page{size:A3 landscape;margin:8mm}body{font-family:Tahoma}section{page-break-after:always}svg{width:100%;height:auto;max-height:275mm}</style>'+last.sheets.map(s=>'<section>'+s.svg+'</section>').join('')+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function mount(){
 if($('foundationRebarDrawingsPanel'))return;const anchor=$('constructionDrawingsPanel')||$('foundationTakeoffPanel');if(!anchor)return;
 const p=document.createElement('section');p.className='panel';p.id='foundationRebarDrawingsPanel';
 p.innerHTML='<div class="panel-title"><h3>نقشه آرماتوربندی پی و جدول برش — مرحله دوم</h3><span class="status">مبتنی بر ورودی واقعی</span></div><div class="notice">برای هر پایه، ابعاد از جدول مستقل پی خوانده می‌شود. پوشش بتن اجباری است و مقدار پیش‌فرض ندارد. قطر و فاصله شبکه تحتانی/فوقانی از ورودی‌های متره فونداسیون خوانده می‌شود. فعلاً فقط میلگردهای مستقیم محاسبه می‌شوند.</div><div class="button-grid"><button id="btnBuildFoundationRebarSheets" class="btn primary" type="button">تولید نقشه و جدول میلگرد</button><button id="btnPrintFoundationRebarSheets" class="btn secondary" type="button">چاپ / ذخیره PDF</button><button id="btnExportFoundationRebarCSV" class="btn secondary" type="button">خروجی CSV لیستوفر مقدماتی</button></div><div id="foundationRebarDrawingPreview" class="notice">پس از تحلیل و ورود پوشش و شبکه‌ها، نقشه را تولید کنید.</div><div class="notice">مرحله بعدی: طراحی و ترسیم آرماتور شناژ با قلاب و مهاری مطابق ضوابط، سپس جزئیات پدستال و صفحه‌ستون/انکربولت. تا وقتی طول مهاری و خم‌ها کنترل نشده‌اند، نقشه ساخت میلگرد صادر نمی‌شود.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 $('btnBuildFoundationRebarSheets').addEventListener('click',()=>{try{build();}catch(e){alert(e.message);}});
 $('btnPrintFoundationRebarSheets').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportFoundationRebarCSV').addEventListener('click',()=>{try{if(!last)build();const head=['Base','Mark','Layer','Direction','Diameter_mm','Spacing_mm','Count','CutLength_m','TotalLength_m','Weight_kg'];const lines=[head.join(','),...last.barSchedule.map(r=>[r.baseNodeId,r.mark,r.layer,r.direction,r.diaMm,r.spacingMm,r.totalCount,r.barLengthM,r.totalLengthM,r.totalWeightKg].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','))];download('SAHROUD-STEEL-Foundation-Rebar-Schedule.csv','\ufeff'+lines.join('\n'),'text/csv;charset=utf-8');}catch(e){alert(e.message);}});
}
window.SteelFoundationRebarDrawings={build,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

/* ===== steel2/js/baseplate-anchor-drawings.js ===== */
/* SAHROUD STEEL — user-dimensioned base plate and anchor layout drawings.
 * This is a geometric detail sheet, not a capacity/design check.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
let last=null;
const ids=['bpCount','bpCols','bpRows','bpPlateX','bpPlateZ','bpPlateT','bpBoltD','bpHoleD','bpPitchX','bpPitchZ','bpEdgeX','bpEdgeZ','bpColumnX','bpColumnZ','bpProjection','bpEmbedment','bpGrout'];
function syncFromTakeoff(){
 const pairs=[['bpCount','abBoltsPerBase'],['bpPlateX','abPlateWidth'],['bpPlateZ','abPlateLength'],['bpPlateT','abPlateThickness'],['bpBoltD','abBoltDia']];
 pairs.forEach(([a,b])=>{const x=$(a),y=$(b);if(x&&y&&x.value.trim()===''&&y.value.trim()!=='')x.value=y.value;});
}
function val(id){const x=$(id)?.value;if(x===undefined||String(x).trim()==='')return null;const n=Number(x);return Number.isFinite(n)?n:null;}
function build(){
 syncFromTakeoff();
 const d={};ids.forEach(id=>d[id]=val(id));
 const positive=['bpCount','bpCols','bpRows','bpPlateX','bpPlateZ','bpPlateT','bpBoltD','bpHoleD','bpEdgeX','bpEdgeZ','bpColumnX','bpColumnZ','bpProjection','bpEmbedment'];
 for(const k of positive)if(!(d[k]>0))throw Error('ورودی '+k+' باید عددی مثبت و مستند به طراحی/نقشه باشد.');
 if(d.bpCols>1&&!(d.bpPitchX>0))throw Error('فاصله بولت‌ها در راستای X باید مثبت باشد.');
 if(d.bpRows>1&&!(d.bpPitchZ>0))throw Error('فاصله بولت‌ها در راستای Z باید مثبت باشد.');
 if(d.bpCols===1&&!(d.bpPitchX>=0))throw Error('فاصله X نامعتبر است؛ برای یک ستون بولت صفر وارد کنید.');
 if(d.bpRows===1&&!(d.bpPitchZ>=0))throw Error('فاصله Z نامعتبر است؛ برای یک ردیف بولت صفر وارد کنید.');
 if(d.bpGrout===null||d.bpGrout<0)throw Error('ضخامت گروت باید وارد شود؛ اگر گروت وجود ندارد صفر وارد کنید.');
 if(!Number.isInteger(d.bpCount)||!Number.isInteger(d.bpCols)||!Number.isInteger(d.bpRows))throw Error('تعداد بولت و آرایش ردیف/ستون باید عدد صحیح باشد.');
 if(d.bpCols*d.bpRows!==d.bpCount)throw Error('تعداد بولت در هر پایه با حاصل‌ضرب تعداد ستون‌ها و ردیف‌ها برابر نیست.');
 if(d.bpHoleD<=d.bpBoltD)throw Error('قطر سوراخ باید از قطر بولت بزرگ‌تر باشد.');
 if(d.bpEdgeX<d.bpHoleD/2||d.bpEdgeZ<d.bpHoleD/2)throw Error('فاصله مرکز سوراخ تا لبه باید حداقل نصف قطر سوراخ باشد تا سوراخ از صفحه خارج نشود.');
 if(d.bpColumnX>=d.bpPlateX||d.bpColumnZ>=d.bpPlateZ)throw Error('ابعاد footprint ستون باید از ابعاد صفحه‌ستون کوچک‌تر باشد.');
 const fitX=2*d.bpEdgeX+(d.bpCols-1)*d.bpPitchX,fitZ=2*d.bpEdgeZ+(d.bpRows-1)*d.bpPitchZ;
 if(Math.abs(fitX-d.bpPlateX)>1||Math.abs(fitZ-d.bpPlateZ)>1)throw Error('ابعاد صفحه با فاصله محورها و فاصله مرکز بولت تا لبه تطابق ندارد (تلرانس ۱ میلی‌متر).');
 const bolts=[];for(let rz=0;rz<d.bpRows;rz++)for(let cx=0;cx<d.bpCols;cx++)bolts.push({mark:'AB-'+String(bolts.length+1).padStart(2,'0'),x:-d.bpPlateX/2+d.bpEdgeX+cx*d.bpPitchX,z:-d.bpPlateZ/2+d.bpEdgeZ+rz*d.bpPitchZ});
 const bases=window.SteelFoundationTakeoff?.getLast?.()?.rows||[];
 last={generatedAt:new Date().toISOString(),input:d,boltCoordinates:bolts,baseCount:bases.length,boltsPerBase:bolts.length,boltCountAllBases:bases.length?bases.length*bolts.length:null,plateMassPerBaseKg:d.bpPlateX/1000*d.bpPlateZ/1000*d.bpPlateT/1000*7850,limitations:['مختصات بولت‌ها با آرایش مستطیلی متقارن و فاصله‌های ورودی کاربر ساخته شده‌اند.','نقشه فقط هندسه را نشان می‌دهد؛ ظرفیت بولت، کشش/برش، خستگی، طول مهاری، مخروط بتن، pry-out، فاصله لبه آیین‌نامه‌ای و اندرکنش گروه بولت کنترل نشده است.','ابعاد و ضخامت صفحه‌ستون، footprint ستون، سوراخ، بیرون‌زدگی، مهاری و گروت باید از طراحی مصوب/محاسبات اتصال وارد شوند.','شکل انتهای بولت (قلاب، صفحه مهاری، مهره انتهایی یا نوع دیگر) ترسیم نشده و نباید از این شیت برای ساخت بولت استفاده شود.','جوش ستون به صفحه، سخت‌کننده‌ها، سوراخ‌های جوش و تلرانس نصب هنوز طراحی نشده‌اند.']};
 last.plan=planSvg(last);last.section=sectionSvg(last);render();return last;
}
function text(x,y,s,size=14,anchor='middle',color='#203746'){return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+color+'" font-family="Tahoma,Arial">'+esc(s)+'</text>';}
function planSvg(r){
 const d=r.input,scale=Math.min(500/d.bpPlateX,380/d.bpPlateZ),w=d.bpPlateX*scale,h=d.bpPlateZ*scale,x=550-w/2,y=330-h/2;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" width="100%" style="max-width:1100px;background:white"><rect width="1100" height="760" fill="white"/><rect x="20" y="20" width="1060" height="720" fill="none" stroke="#203746" stroke-width="2"/>'+text(1040,58,'صفحه‌ستون و آرایش بولت مهاری — پلان',24,'end')+text(1040,88,'ابعاد از ورودی صریح کاربر | ترسیم هندسی، بدون کنترل ظرفیت',13,'end','#64748b');
 s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#cbd5e1" stroke="#334155" stroke-width="3"/>';
 const cw=d.bpColumnX*scale,ch=d.bpColumnZ*scale;s+='<rect x="'+(550-cw/2)+'" y="'+(330-ch/2)+'" width="'+cw+'" height="'+ch+'" fill="#64748b" stroke="#0f172a" stroke-width="2"/>';
 r.boltCoordinates.forEach(b=>{const cx=550+b.x*scale,cy=330+b.z*scale;s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+Math.max(5,d.bpHoleD/2*scale)+'" fill="#fff" stroke="#b91c1c" stroke-width="3"/>'+text(cx,cy+4,b.mark,9);});
 s+=text(550,y+h+34,'صفحه '+fmt(d.bpPlateX,0)+' × '+fmt(d.bpPlateZ,0)+' mm | ضخامت '+fmt(d.bpPlateT,1)+' mm',15)+text(550,y+h+58,'ستون '+fmt(d.bpColumnX,0)+' × '+fmt(d.bpColumnZ,0)+' mm | '+r.boltsPerBase+' بولت در هر پایه',13);
 s+=text(80,680,'دایره قرمز: محور سوراخ/بولت | مستطیل خاکستری تیره: footprint ستون',12,'start','#b91c1c')+'</svg>';return s;
}
function sectionSvg(r){
 const d=r.input;let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 650" width="100%" style="max-width:1100px;background:white"><rect width="1100" height="650" fill="white"/><rect x="20" y="20" width="1060" height="610" fill="none" stroke="#203746" stroke-width="2"/>'+text(1040,58,'مقطع شماتیک صفحه‌ستون و بولت مهاری',24,'end');
 const vScale=Math.min(0.35,210/d.bpEmbedment),plateY=245,plateX=280,plateW=540,plateH=Math.max(6,d.bpPlateT*vScale),groutH=d.bpGrout*vScale,projectionH=d.bpProjection*vScale,embedmentH=d.bpEmbedment*vScale,concreteY=plateY+plateH+groutH;
 s+='<rect x="200" y="'+concreteY+'" width="700" height="'+Math.max(220,embedmentH+24)+'" fill="#d1d5db" stroke="#475569" stroke-width="2"/>';
 s+='<rect x="'+plateX+'" y="'+plateY+'" width="'+plateW+'" height="'+plateH+'" fill="#64748b" stroke="#1e293b" stroke-width="2"/>';
 s+='<rect x="470" y="'+(plateY-150)+'" width="160" height="150" fill="#94a3b8" stroke="#334155" stroke-width="2"/>';
 s+='<rect x="'+plateX+'" y="'+(plateY+plateH)+'" width="'+plateW+'" height="'+Math.max(2,groutH)+'" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>';
 const bx=[350,750];bx.forEach(x=>{s+='<line x1="'+x+'" y1="'+(plateY-projectionH)+'" x2="'+x+'" y2="'+(concreteY+embedmentH)+'" stroke="#b91c1c" stroke-width="7"/>';s+='<circle cx="'+x+'" cy="'+(plateY-12)+'" r="12" fill="#fff" stroke="#b91c1c" stroke-width="3"/>';});
 s+=text(550,plateY-165,'مقطع ستون (ابعاد footprint ورودی)',13)+text(550,plateY+plateH+groutH+18,'گروت '+fmt(d.bpGrout,0)+' mm',11)+text(550,concreteY+120,'بتن فونداسیون — شماتیک',16)+text(550,concreteY+165,'طول مهاری واردشده: '+fmt(d.bpEmbedment,0)+' mm | بیرون‌زدگی: '+fmt(d.bpProjection,0)+' mm',13)+text(550,590,'قلاب/صفحه انتهایی و جزئیات مهار بولت ترسیم نشده‌اند؛ این شکل برای ساخت بولت کافی نیست.',12,'middle','#b91c1c')+'</svg>';return s;
}
function render(){
 const host=$('baseplateAnchorDrawingPreview');if(!host||!last)return;
 host.innerHTML='<div class="notice">تعداد بولت در هر پایه: '+fmt(last.boltsPerBase,0)+' | تعداد پایه در آخرین استخراج: '+(last.baseCount||'نامشخص')+' | تعداد کل بولت: '+(last.boltCountAllBases??'نامشخص')+'</div><details open><summary>پلان صفحه‌ستون و بولت</summary>'+last.plan+'</details><details open><summary>مقطع شماتیک</summary>'+last.section+'</details><div style="overflow:auto"><table class="data-table"><thead><tr><th>مارک</th><th>مختصات X (mm)</th><th>مختصات Z (mm)</th><th>قطر بولت (mm)</th><th>قطر سوراخ (mm)</th></tr></thead><tbody>'+last.boltCoordinates.map(b=>'<tr><td>'+b.mark+'</td><td>'+fmt(b.x,1)+'</td><td>'+fmt(b.z,1)+'</td><td>'+fmt(last.input.bpBoltD,1)+'</td><td>'+fmt(last.input.bpHoleD,1)+'</td></tr>').join('')+'</tbody></table></div>';
}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);}
function print(){if(!last)build();const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>@page{size:A3 landscape;margin:8mm}body{font-family:Tahoma}svg{width:100%;height:auto;max-height:270mm;page-break-after:always}</style>'+last.plan+last.section+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function mount(){
 if($('baseplateAnchorDrawingsPanel'))return;const anchor=$('anchorBaseplatePanel')||$('foundationRebarDrawingsPanel')||$('constructionDrawingsPanel');if(!anchor)return;
 const p=document.createElement('section');p.className='panel';p.id='baseplateAnchorDrawingsPanel';
 p.innerHTML='<div class="panel-title"><h3>نقشه هندسی صفحه‌ستون و بولت مهاری — مرحله سوم</h3><span class="status">نیازمند ورودی اتصال</span></div><div class="notice">تمام ابعاد باید از طراحی اتصال یا نقشه مصوب وارد شوند. آرایش بولت مستطیلی و متقارن فرض می‌شود و با تعداد، فاصله محورها و فاصله مرکز بولت تا لبه کنترل هندسی می‌شود. هیچ ظرفیت یا مهار آیین‌نامه‌ای تأیید نمی‌شود.</div><div class="form-grid">'+
 [['bpCount','تعداد بولت در هر پایه'],['bpCols','تعداد ستون بولت در راستای X'],['bpRows','تعداد ردیف بولت در راستای Z'],['bpPlateX','عرض صفحه‌ستون X (mm)'],['bpPlateZ','طول صفحه‌ستون Z (mm)'],['bpPlateT','ضخامت صفحه‌ستون (mm)'],['bpBoltD','قطر بولت (mm)'],['bpHoleD','قطر سوراخ (mm)'],['bpPitchX','فاصله محور بولت‌ها در X (mm)'],['bpPitchZ','فاصله محور بولت‌ها در Z (mm)'],['bpEdgeX','فاصله مرکز بولت تا لبه صفحه در X (mm)'],['bpEdgeZ','فاصله مرکز بولت تا لبه صفحه در Z (mm)'],['bpColumnX','عرض footprint ستون در X (mm)'],['bpColumnZ','طول footprint ستون در Z (mm)'],['bpProjection','بیرون‌زدگی بولت از روی صفحه (mm)'],['bpEmbedment','طول مهاری واردشده زیر سطح بتن (mm)'],['bpGrout','ضخامت گروت زیر صفحه (mm)']].map(([id,label])=>'<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="number" min="0" step="1" placeholder="از نقشه/محاسبات اتصال"></div>').join('')+
 '</div><div class="button-grid"><button id="btnBuildBaseplateAnchorDrawings" class="btn primary" type="button">تولید نقشه صفحه‌ستون و بولت</button><button id="btnPrintBaseplateAnchorDrawings" class="btn secondary" type="button">چاپ / ذخیره PDF</button><button id="btnExportBaseplateAnchorCSV" class="btn secondary" type="button">خروجی مختصات بولت CSV</button></div><div id="baseplateAnchorDrawingPreview" class="notice">ابعاد و آرایش بولت را از طراحی اتصال وارد کنید.</div><div class="notice">توجه: شکل قلاب یا صفحه انتهایی، جوش، سخت‌کننده، کنترل ضخامت صفحه، کشش و برش بولت، شکست بتن و فاصله لبه آیین‌نامه‌ای در این مرحله طراحی نشده است. خروجی صرفاً نقشه هندسی مقدماتی است.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 $('btnBuildBaseplateAnchorDrawings').addEventListener('click',()=>{try{build();}catch(e){alert(e.message);}});
 $('btnPrintBaseplateAnchorDrawings').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportBaseplateAnchorCSV').addEventListener('click',()=>{try{if(!last)build();const lines=[['Mark','X_mm','Z_mm','Bolt_dia_mm','Hole_dia_mm'].join(','),...last.boltCoordinates.map(b=>[b.mark,b.x,b.z,last.input.bpBoltD,last.input.bpHoleD].join(','))];download('SAHROUD-STEEL-Anchor-Coordinates.csv',lines.join('\n'),'text/csv;charset=utf-8');}catch(e){alert(e.message);}});
}
window.SteelBaseplateAnchorDrawings={build,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
