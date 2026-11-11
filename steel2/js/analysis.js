
/* SAHROUD STEEL - 2D Portal Frame Matrix Analysis
Version 2.3 - Corrected axial force sign convention
Linear elastic first-order analysis
Units: N, m, Pa
Axial convention in exported member data:
Tension positive, compression negative.
*/
(function () {
"use strict";

const $ = id => document.getElementById(id);

function number(id) {
    const el = $(id);
    if (!el) throw new Error("فیلد " + id + " پیدا نشد.");
    const n = Number(el.value);
    if (!Number.isFinite(n)) {
        throw new Error("مقدار فیلد " + id + " معتبر نیست.");
    }
    return n;
}

function fmt(value, digits = 3) {
    return Number(value).toLocaleString("fa-IR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

function matrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function transpose(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
}

function multiply(A, B) {
    const C = matrix(A.length, B[0].length);
    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < B[0].length; j++) {
            for (let k = 0; k < B.length; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

function solveLinearSystem(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let k = 0; k < n; k++) {
        let pivot = k;
        for (let i = k + 1; i < n; i++) {
            if (Math.abs(M[i][k]) > Math.abs(M[pivot][k])) {
                pivot = i;
            }
        }

        if (Math.abs(M[pivot][k]) < 1e-12) {
            throw new Error(
                "ماتریس سختی ناپایدار یا تکین است. " +
                "هندسه، تکیه‌گاه‌ها و مقاطع را بررسی کنید."
            );
        }

        [M[k], M[pivot]] = [M[pivot], M[k]];
        const divisor = M[k][k];

        for (let j = k; j <= n; j++) M[k][j] /= divisor;

        for (let i = 0; i < n; i++) {
            if (i === k) continue;
            const factor = M[i][k];
            for (let j = k; j <= n; j++) {
                M[i][j] -= factor * M[k][j];
            }
        }
    }

    return M.map(row => row[n]);
}

function elementStiffness(E, A, I, L) {
    const EA = E * A / L;
    const EI = E * I;
    const a = 12 * EI / Math.pow(L, 3);
    const b = 6 * EI / Math.pow(L, 2);
    const c = 4 * EI / L;
    const d = 2 * EI / L;

    return [
        [EA, 0, 0, -EA, 0, 0],
        [0, a, b, 0, -a, b],
        [0, b, c, 0, -b, d],
        [-EA, 0, 0, EA, 0, 0],
        [0, -a, -b, 0, a, -b],
        [0, -b, d, 0, b, c]
    ];
}

function transformation(c, s) {
    return [
        [c, s, 0, 0, 0, 0],
        [-s, c, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, c, s, 0],
        [0, 0, 0, -s, c, 0],
        [0, 0, 0, 0, 0, 1]
    ];
}

function elementLoad(qx, qy, L) {
    return [
        qx * L / 2,
        qy * L / 2,
        qy * L * L / 12,
        qx * L / 2,
        qy * L / 2,
        -qy * L * L / 12
    ];
}

function addVector(target, indices, values) {
    indices.forEach((index, i) => {
        target[index] += values[i];
    });
}

function addMatrix(target, indices, values) {
    for (let i = 0; i < indices.length; i++) {
        for (let j = 0; j < indices.length; j++) {
            target[indices[i]][indices[j]] += values[i][j];
        }
    }
}

function calculate() {
    const message = $("analysisMessage");

    try {
        if (!window.SteelProject || !window.SteelSections) {
            throw new Error(
                "ماژول پروژه یا مشخصات مقاطع بارگذاری نشده است."
            );
        }

        const projectError = window.SteelProject.validate();
        if (projectError) throw new Error(projectError);

        if (!window.SteelSections.validateForFrameAnalysis()) {
            throw new Error(
                "ابتدا مشخصات مصالح و مقاطع را کامل و کنترل کنید."
            );
        }

        if (window.SteelLoads) {
            const loadError = window.SteelLoads.validate();
            if (loadError) throw new Error(loadError);
        }

        const span = number("span");
        const height = number("height");
        const rise = number("rise");
        const spacing = number("spacing");

        if (span <= 0 || height <= 0 || spacing <= 0 || rise < 0) {
            throw new Error("ابعاد هندسی قاب معتبر نیستند.");
        }

        const loads = window.SteelLoads
            ? window.SteelLoads.getData()
            : {
                deadLeft: number("dead"),
                deadRight: number("dead"),
                liveLeft: number("live"),
                liveRight: number("live"),
                snowLeft: number("snow"),
                snowRight: number("snow"),
                windWall: 0,
                windDirection: "left-to-right",
                windLeft: 0,
                windRight: 0
            };

        const leftRoofPressure =
            loads.deadLeft + loads.liveLeft + loads.snowLeft;

        const rightRoofPressure =
            loads.deadRight + loads.liveRight + loads.snowRight;

        const windRoofLeft = Number(loads.windLeft) || 0;
        const windRoofRight = Number(loads.windRight) || 0;

        const connection = window.SteelProject.getBaseConnection();
        const section = window.SteelSections.getDataSI();

        const E = section.material.E;
        const column = section.column;
        const rafter = section.rafter;

        if (!(E > 0 && column.A > 0 && column.Ix > 0 &&
            rafter.A > 0 && rafter.Ix > 0)) {
            throw new Error("مشخصات مقاطع معتبر نیستند.");
        }

        // پیش‌آمدگی جانبی سقف: ۸۰ سانتی‌متر در امتداد شیب در هر طرف
        const sideOverhang = 0.80;
        const halfSpan = span / 2;
        const baseSlopeLength = Math.hypot(halfSpan, rise);
        const slopeCos = halfSpan / baseSlopeLength;
        const slopeSin = rise / baseSlopeLength;

        const nodes = [
            [0, 0],
            [0, height],
            [span / 2, height + rise],
            [span, height],
            [span, 0],
            [-sideOverhang * slopeCos, height - sideOverhang * slopeSin],
            [span + sideOverhang * slopeCos, height - sideOverhang * slopeSin]
        ];

        const definitions = [
            { start: 0, end: 1, section: column, type: "ستون چپ" },
            { start: 5, end: 1, section: rafter, type: "کنسول رفتر چپ", isRafter: true },
            { start: 1, end: 2, section: rafter, type: "رفتر چپ", isRafter: true },
            { start: 2, end: 3, section: rafter, type: "رفتر راست", isRafter: true },
            { start: 3, end: 6, section: rafter, type: "کنسول رفتر راست", isRafter: true },
            { start: 3, end: 4, section: column, type: "ستون راست" }
        ];

        const dofCount = nodes.length * 3;
        const K = matrix(dofCount, dofCount);
        const F = Array(dofCount).fill(0);
        const elements = [];

        const windSign =
            loads.windDirection === "right-to-left" ? -1 : 1;

        const wallWindLineLoad =
            (Number(loads.windWall) || 0) *
            spacing * 1000 * windSign;

        const roofWindLeftLine = windRoofLeft * spacing * 1000;
        const roofWindRightLine = windRoofRight * spacing * 1000;

        for (const definition of definitions) {
            const p1 = nodes[definition.start];
            const p2 = nodes[definition.end];

            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];

            const L = Math.hypot(dx, dy);
            const c = dx / L;
            const s = dy / L;

            const A = definition.section.A;
            const I = definition.section.Ix;

            const kl = elementStiffness(E, A, I, L);
            const T = transformation(c, s);

            const kg = multiply(
                transpose(T),
                multiply(kl, T)
            );

            const indices = [];
            for (const node of [definition.start, definition.end]) {
                indices.push(node * 3, node * 3 + 1, node * 3 + 2);
            }

            addMatrix(K, indices, kg);

            let qGlobalX = 0;
            let qGlobalY = 0;

            if (definition.isRafter && definition.type.includes("چپ")) {
                qGlobalY = -leftRoofPressure * spacing * c * 1000;
            }

            if (definition.isRafter && definition.type.includes("راست")) {
                qGlobalY = -rightRoofPressure * spacing * c * 1000;
            }

            if (
                definition.type === "ستون چپ" ||
                definition.type === "ستون راست"
            ) {
                qGlobalX = wallWindLineLoad;
            }

            const qLocalX = qGlobalX * c + qGlobalY * s;

            let qLocalY = -qGlobalX * s + qGlobalY * c;

            if (definition.isRafter && definition.type.includes("چپ")) {
                qLocalY -= roofWindLeftLine;
            }

            if (definition.isRafter && definition.type.includes("راست")) {
                qLocalY -= roofWindRightLine;
            }

            const fl = elementLoad(qLocalX, qLocalY, L);

            const fg = multiply(
                transpose(T),
                fl.map(value => [value])
            ).map(row => row[0]);

            addVector(F, indices, fg);

            elements.push({
                definition,
                indices,
                kl,
                T,
                L,
                c,
                s,
                fl
            });
        }

        const restrained = new Set([0, 1, 12, 13]);

        if (connection === "fixed") {
            restrained.add(2);
            restrained.add(14);
        }

        const free = [];
        for (let i = 0; i < dofCount; i++) {
            if (!restrained.has(i)) free.push(i);
        }

        const Kff = free.map(i => free.map(j => K[i][j]));
        const Ff = free.map(i => F[i]);
        const displacementFree = solveLinearSystem(Kff, Ff);

        const D = Array(dofCount).fill(0);
        free.forEach((index, i) => {
            D[index] = displacementFree[i];
        });

        const KD = K.map(row =>
            row.reduce((sum, value, j) => sum + value * D[j], 0)
        );

        const R = KD.map((value, i) => value - F[i]);

        let maxDisplacement = 0;
        let maxNode = 0;

        nodes.forEach((_, i) => {
            const ux = D[i * 3];
            const uy = D[i * 3 + 1];
            const value = Math.hypot(ux, uy);

            if (value > maxDisplacement) {
                maxDisplacement = value;
                maxNode = i;
            }
        });

        const memberResults = [];

        for (const element of elements) {
            const dg = element.indices.map(i => D[i]);

            const dl = multiply(
                element.T,
                dg.map(value => [value])
            ).map(row => row[0]);

            const internal = multiply(
                element.kl,
                dl.map(value => [value])
            ).map(row => row[0]);

            const endForces = internal.map(
                (value, i) => value - element.fl[i]
            );

            const maxMoment = Math.max(
                Math.abs(endForces[2]),
                Math.abs(endForces[5])
            );

            // بارهای محلی عضو بر حسب kN/m
            // قرارداد علامت: کشش مثبت و فشار منفی
            const localLoadX =
                -(2 * element.fl[0] / element.L) / 1000;

            const localLoadY =
                (2 * element.fl[1] / element.L) / 1000;

            const isLeftCantilever = element.definition.type === "کنسول رفتر چپ";
            const isRightCantilever = element.definition.type === "کنسول رفتر راست";
            let tipRelativeDeflection = null;

            // خیز نسبی نوک کنسول نسبت به مماسِ دوران‌یافته در تکیه‌گاه
            // خروجی در راستای محلی عمود بر محور رفتر و بر حسب متر است.
            if (isLeftCantilever) {
                tipRelativeDeflection =
                    dl[1] - dl[4] + dl[5] * element.L;
            } else if (isRightCantilever) {
                tipRelativeDeflection =
                    dl[4] - dl[1] - dl[2] * element.L;
            }

            memberResults.push({
                name: element.definition.type,
                length: element.L,
                localLoadX,
                localLoadY,

                // فشار منفی و کشش مثبت
                axialStart: -endForces[0] / 1000,
                axialEnd: endForces[3] / 1000,

                shearStart: endForces[1] / 1000,
                momentStart: endForces[2] / 1e6,

                shearEnd: endForces[4] / 1000,
                momentEnd: endForces[5] / 1e6,

                maxMoment: maxMoment / 1e6,
                tipRelativeDeflection
            });
        }

        const leftReaction = {
            H: R[0] / 1000,
            V: R[1] / 1000,
            M: R[2] / 1e6
        };

        const rightReaction = {
            H: R[12] / 1000,
            V: R[13] / 1000,
            M: R[14] / 1e6
        };

        const maxMoment = Math.max(
            ...memberResults.map(item => item.maxMoment)
        );

        const maxAxial = Math.max(
            ...memberResults.flatMap(item => [
                Math.abs(item.axialStart),
                Math.abs(item.axialEnd)
            ])
        );

        $("displacement").textContent =
            fmt(maxDisplacement * 1000) + " mm";

        $("reaction").textContent =
            fmt(leftReaction.V) + " / " +
            fmt(rightReaction.V) + " kN";

        $("memberCount").textContent = String(definitions.length);

        const connectionText =
            connection === "fixed" ? "گیردار" : "مفصلی";

        const windDirectionText =
            windSign > 0 ? "از چپ به راست" : "از راست به چپ";

        if (message) {
            message.innerHTML = `
                <h4>نتایج تحلیل خطی قاب دوبعدی</h4>
                <p><b>نوع تکیه‌گاه:</b> ${connectionText}</p>
                <p><b>روش تحلیل:</b> روش سختی مستقیم</p>
                <p><b>تعداد گره‌ها:</b> ${nodes.length}</p>
                <p><b>تعداد اعضا:</b> ${definitions.length}</p>
                <p><b>پیش‌آمدگی جانبی رفتر:</b> ${fmt(sideOverhang)} متر در هر طرف، در امتداد شیب</p>
                <hr>
                <h4>بارهای اعمال‌شده</h4>
                <p>بار ثقلی سقف چپ: ${fmt(leftRoofPressure)} kN/m²</p>
                <p>بار ثقلی سقف راست: ${fmt(rightRoofPressure)} kN/m²</p>
                <p>باد سقف چپ: ${fmt(windRoofLeft)} kN/m²</p>
                <p>باد سقف راست: ${fmt(windRoofRight)} kN/m²</p>
                <p>نوع اثر باد سقف: مثبت = فشار به داخل، منفی = مکش به خارج</p>
                <p>بار باد دیوار: ${fmt(Math.abs(Number(loads.windWall) || 0))} kN/m²</p>
                <p>جهت باد دیوار: ${windDirectionText}</p>
                <p>بار خطی افقی وارد بر هر ستون: ${fmt(wallWindLineLoad / 1000)} kN/m</p>
                <hr>
                <p><b>بیشینه جابه‌جایی گره‌ای:</b> ${fmt(maxDisplacement * 1000)} میلی‌متر</p>
                <p><b>شماره گره دارای بیشینه جابه‌جایی:</b> ${maxNode + 1}</p>
                <p><b>بیشینه نیروی محوری انتهایی:</b> ${fmt(maxAxial)} kN</p>
                <p><b>بیشینه لنگر انتهایی اعضا:</b> ${fmt(maxMoment)} kN.m</p>
                <hr>
                <h4>واکنش تکیه‌گاه چپ</h4>
                <p>افقی: ${fmt(leftReaction.H)} kN</p>
                <p>قائم: ${fmt(leftReaction.V)} kN</p>
                <p>لنگر: ${fmt(leftReaction.M)} kN.m</p>
                <h4>واکنش تکیه‌گاه راست</h4>
                <p>افقی: ${fmt(rightReaction.H)} kN</p>
                <p>قائم: ${fmt(rightReaction.V)} kN</p>
                <p>لنگر: ${fmt(rightReaction.M)} kN.m</p>
                <hr>
                <h4>نیروهای انتهایی اعضا</h4>
                ${memberResults.map(item => `
                    <div class="notice">
                        <b>${item.name}</b>
                        <p>محوری ابتدا: ${fmt(item.axialStart)} kN</p>
                        <p>محوری انتها: ${fmt(item.axialEnd)} kN</p>
                        <p>لنگر ابتدا: ${fmt(item.momentStart)} kN.m</p>
                        <p>لنگر انتها: ${fmt(item.momentEnd)} kN.m</p>
                    </div>
                `).join("")}
                <hr>
                <div class="notice">
                    <b>مواردی که هنوز در این تحلیل وارد نشده‌اند:</b>
                    <p>۱. پیش‌آمدگی طولی ابتدا و انتهای سوله در این قاب دوبعدی مدل نشده است</p>
                    <p>۲. باد دیوارهای جلو و عقب و تحلیل طولی سوله</p>
                    <p>۳. ترکیبات بار آیین‌نامه‌ای و ضرایب بار</p>
                    <p>۴. تحلیل مرتبه دوم، اثر P-Delta و کمانش</p>
                    <p>۵. کنترل مقاومت اعضا، تغییرشکل مجاز و اتصالات کنسول</p>
                </div>
                <p style="color:#b45309">
                    هشدار: این خروجی تحلیل خطی اولیه است و به‌تنهایی
                    برای طراحی اجرایی یا تأیید ایمنی سازه کافی نیست.
                </p>
            `;
        }

        window.SteelAnalysis.lastResult = {
            nodes,
            displacements: D,
            reactions: R,
            members: memberResults,
            connection,
            maxDisplacement,
            maxMoment,
            maxAxial,
            appliedLoads: {
                leftRoofPressure,
                rightRoofPressure,
                windRoofLeft,
                windRoofRight,
                roofWindLeftLine,
                roofWindRightLine,
                wallWindLineLoad,
                windDirection: loads.windDirection
            }
        };

        window.SteelProject.setStatus(
            "تحلیل خطی قاب با بار ثقلی، باد سقف و باد دیوار انجام شد."
        );

        return {
            success: true,
            maxDisplacement,
            reactions: R,
            members: memberResults
        };

    } catch (error) {
        if (message) {
            message.textContent = "خطا در تحلیل: " + error.message;
        }

        if (window.SteelProject) {
            window.SteelProject.setStatus(
                "خطا در تحلیل: " + error.message
            );
        }

        return {
            success: false,
            error: error.message
        };
    }
}

window.SteelAnalysis = { calculate };

})();
