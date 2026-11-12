
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
        const n = el ? Number(el.value) : NaN;
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
        const span = num("span", 20);
        const rise = num("rise", 2);
        const spacing = num("spacing", 5);
        const length = num("length", 30);

        const half = span / 2;
        const baseSlopeLength = Math.sqrt(
            half * half + rise * rise
        );

        // پیش‌آمدگی‌های مصوب پروژه: ۸۰ سانتی‌متر در امتداد شیب
        // در هر لبه جانبی و ۸۰ سانتی‌متر در هر انتهای طولی
        const sideOverhang = 0.80;
        const endOverhang = 0.80;
        const slopeLength = baseSlopeLength + sideOverhang;
        const roofLength = length + 2 * endOverhang;
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
        const tributary = pitch * g.cos * g.cos;
        function evaluateCase(type, pressure) {
            const qLine = pressure * pitch * g.cos;
            const qNormal = pressure * tributary;
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
        if (g.spacing <= 0 || g.length <= 0 ||
            g.slopeLength <= 0) {
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

        return "";
    }

    function optimize() {
        const g = getGeometry();
        const loads = getLoads();
        const s = readSettings();

        const error = validate(s, g);

        if (error) {
            $("purlinResults").textContent = error;
            return null;
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
            $("purlinResults").textContent = error;
            return;
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

            <h4>۵ ـ مشخصات مصالح</h4>

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
        return Object.assign({}, readSettings());
    }

    function setData(data) {
        if (!data || typeof data !== "object") return;

        const map = {
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

    window.SteelRoofPurlins = {
        optimize,
        applyManual,
        getData,
        setData,
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
