
/* SAHROUD STEEL - 2D Portal Frame Matrix Analysis
   Linear elastic first-order frame analysis
   Units: N, m, Pa
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function number(id) {
        const el = $(id);
        if (!el) throw new Error("فیلد " + id + " پیدا نشد.");
        return Number(el.value);
    }

    function fmt(value, digits = 3) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function matrix(rows, cols) {
        return Array.from({ length: rows }, () =>
            Array(cols).fill(0)
        );
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
                    "ماتریس سختی ناپایدار یا تکین است. هندسه، تکیه‌گاه‌ها و مقاطع را بررسی کنید."
                );
            }

            [M[k], M[pivot]] = [M[pivot], M[k]];

            const divisor = M[k][k];

            for (let j = k; j <= n; j++) {
                M[k][j] /= divisor;
            }

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
            [ EA, 0, 0, -EA, 0, 0 ],
            [ 0, a, b, 0, -a, b ],
            [ 0, b, c, 0, -b, d ],
            [ -EA, 0, 0, EA, 0, 0 ],
            [ 0, -a, -b, 0, a, -b ],
            [ 0, b, d, 0, -b, c ]
        ];
    }

    function transformation(c, s) {
        return [
            [ c, s, 0, 0, 0, 0 ],
            [ -s, c, 0, 0, 0, 0 ],
            [ 0, 0, 1, 0, 0, 0 ],
            [ 0, 0, 0, c, s, 0 ],
            [ 0, 0, 0, -s, c, 0 ],
            [ 0, 0, 0, 0, 0, 1 ]
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
                throw new Error("ماژول پروژه یا مشخصات مقاطع بارگذاری نشده است.");
            }

            const projectError = window.SteelProject.validate();

            if (projectError) {
                throw new Error(projectError);
            }

            if (!window.SteelSections.validate()) {
                throw new Error(
                    "ابتدا مشخصات مصالح و مقاطع را کامل و کنترل کنید."
                );
            }

            const span = number("span");
            const height = number("height");
            const rise = number("rise");
            const spacing = number("spacing");

            const dead = number("dead");
            const live = number("live");
            const snow = number("snow");

            const connection =
                window.SteelProject.getBaseConnection();

            const section = window.SteelSections.getDataSI();

            const E = section.material.E;

            const column = section.column;
            const rafter = section.rafter;

            if (!(E > 0 && column.A > 0 &&
                column.Ix > 0 && rafter.A > 0 &&
                rafter.Ix > 0)) {
                throw new Error("مشخصات مقاطع معتبر نیستند.");
            }

            // پنج گره: دو پای ستون، دو زانو و تاج
            const nodes = [
                [0, 0],
                [0, height],
                [span / 2, height + rise],
                [span, height],
                [span, 0]
            ];

            // چهار عضو قاب
            const definitions = [
                { start: 0, end: 1, section: column, type: "ستون چپ" },
                { start: 1, end: 2, section: rafter, type: "رفتر چپ" },
                { start: 2, end: 3, section: rafter, type: "رفتر راست" },
                { start: 3, end: 4, section: column, type: "ستون راست" }
            ];

            const dofCount = nodes.length * 3;
            const K = matrix(dofCount, dofCount);
            const F = Array(dofCount).fill(0);

            const elements = [];

            // بار قائم سقف بر اساس تصویر افقی
            const roofPressure = dead + live + snow;

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

                for (const node of [
                    definition.start,
                    definition.end
                ]) {
                    indices.push(
                        node * 3,
                        node * 3 + 1,
                        node * 3 + 2
                    );
                }

                addMatrix(K, indices, kg);

                let qLocal = [0, 0];

                // بار سقف فقط روی دو رفتر
                if (definition.type.startsWith("رفتر")) {
                    const w = roofPressure * spacing * c * 1000;

                    // بار قائم جهانی، تبدیل به محورهای محلی
                    const qGlobalX = 0;
                    const qGlobalY = -w;

                    qLocal = [
                        qGlobalX * c + qGlobalY * s,
                        -qGlobalX * s + qGlobalY * c
                    ];
                }

                const fl = elementLoad(
                    qLocal[0],
                    qLocal[1],
                    L
                );

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

            // قیود تکیه‌گاهی
            const restrained = new Set([
                0, 1,       // انتقال‌های پای چپ
                12, 13      // انتقال‌های پای راست
            ]);

            if (connection === "fixed") {
                restrained.add(2);
                restrained.add(14);
            }

            const free = [];

            for (let i = 0; i < dofCount; i++) {
                if (!restrained.has(i)) free.push(i);
            }

            const Kff = free.map(i =>
                free.map(j => K[i][j])
            );

            const Ff = free.map(i => F[i]);

            const displacementFree =
                solveLinearSystem(Kff, Ff);

            const D = Array(dofCount).fill(0);

            free.forEach((index, i) => {
                D[index] = displacementFree[i];
            });

            // محاسبه واکنش‌ها
            const KD = K.map(row =>
                row.reduce((sum, value, j) =>
                    sum + value * D[j], 0
                )
            );

            const R = KD.map((value, i) => value - F[i]);

            // بیشینه جابه‌جایی گره‌ها
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

            // نیروهای انتهایی اعضا
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

                memberResults.push({
                    name: element.definition.type,
                    axialStart: endForces[0] / 1000,
                    shearStart: endForces[1] / 1000,
                    momentStart: endForces[2] / 1e6,
                    axialEnd: -endForces[3] / 1000,
                    shearEnd: endForces[4] / 1000,
                    momentEnd: endForces[5] / 1e6,
                    maxMoment: maxMoment / 1e6
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

            $("memberCount").textContent = "4";

            const connectionText =
                connection === "fixed" ? "گیردار" : "مفصلی";

            if (message) {
                message.innerHTML = `
                    <h4>نتایج تحلیل خطی قاب دوبعدی</h4>

                    <p><b>نوع تکیه‌گاه:</b> ${connectionText}</p>
                    <p><b>روش تحلیل:</b> روش سختی مستقیم</p>
                    <p><b>تعداد گره‌ها:</b> 5</p>
                    <p><b>تعداد اعضا:</b> 4</p>

                    <hr>

                    <p><b>بیشینه جابه‌جایی گره‌ای:</b>
                    ${fmt(maxDisplacement * 1000)} میلی‌متر</p>

                    <p><b>شماره گره دارای بیشینه جابه‌جایی:</b>
                    ${maxNode + 1}</p>

                    <p><b>بیشینه نیروی محوری انتهایی:</b>
                    ${fmt(maxAxial)} kN</p>

                    <p><b>بیشینه لنگر انتهایی اعضا:</b>
                    ${fmt(maxMoment)} kN.m</p>

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

                    <p style="color:#b45309">
                    هشدار: این نتایج تحلیل خطی اولیه تحت بارهای قائم
                    بدون ضرایب ترکیب هستند. بار باد، اثر مرتبه دوم،
                    کمانش، کنترل مقاومت اعضا، تغییرشکل مجاز،
                    اتصالات و الزامات کامل آیین‌نامه‌ای هنوز بررسی نشده‌اند.
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
                maxAxial
            };

            window.SteelProject.setStatus(
                "تحلیل خطی اولیه قاب با موفقیت انجام شد."
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

    window.SteelAnalysis = {
        calculate
    };

})();
