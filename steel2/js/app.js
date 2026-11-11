
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
            cases.push({
                name: "ترکیب ۲ ـ 1.2D + 0.5(" + action.title + ")",
                data: makeCombinationData(original, {
                    deadFactor: 1.2,
                    liveFactor: action.key === "live" ? 0.5 : 0,
                    snowFactor: action.key === "snow" ? 0.5 : 0
                })
            });
        });

        roofActions.forEach(action => {
            signs.forEach(sign => {
                cases.push({
                    name: "ترکیب ۳ ـ 1.2D + 1.6(" +
                        action.title + ") + 0.8W، " +
                        (sign > 0 ? "جهت اول باد" : "جهت معکوس باد"),
                    data: makeCombinationData(original, {
                        deadFactor: 1.2,
                        liveFactor: action.key === "live" ? 1.6 : 0,
                        snowFactor: action.key === "snow" ? 1.6 : 0,
                        windFactor: 0.8,
                        windSign: sign
                    })
                });
            });
        });

        roofActions.forEach(action => {
            signs.forEach(sign => {
                cases.push({
                    name: "ترکیب ۴ ـ 1.2D + 1.6W + 0.5(" +
                        action.title + ")، " +
                        (sign > 0 ? "جهت اول باد" : "جهت معکوس باد"),
                    data: makeCombinationData(original, {
                        deadFactor: 1.2,
                        liveFactor: action.key === "live" ? 0.5 : 0,
                        snowFactor: action.key === "snow" ? 0.5 : 0,
                        windFactor: 1.6,
                        windSign: sign
                    })
                });
            });
        });

        signs.forEach(sign => {
            cases.push({
                name: "ترکیب ۶ ـ 0.8D + 1.6W، " +
                    (sign > 0 ? "جهت اول باد" : "جهت معکوس باد"),
                data: makeCombinationData(original, {
                    deadFactor: 0.8,
                    windFactor: 1.6,
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

    function calculateCombinations() {
        if (!window.SteelLoads ||
            typeof window.SteelLoads.getData !== "function" ||
            typeof window.SteelLoads.setData !== "function") {
            alert("ماژول بارگذاری برای تحلیل ترکیبات در دسترس نیست.");
            return { success: false };
        }

        const original = JSON.parse(
            JSON.stringify(window.SteelLoads.getData())
        );

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
                    در حالت‌های جایگزین وارد می‌کند؛ بار زنده طبقات L،
                    بار باران R، زلزله E و خودکرنشی T ورودی مستقل
                    ندارند و در این تحلیل نیستند.</p>

                    <p>۴. باد دیوار در این مدل فقط به‌صورت بار افقی
                    روی ستون‌های قاب دوبعدی اعمال می‌شود؛ تحلیل طولی
                    و باد دیوارهای جلو و عقب انجام نمی‌شود.</p>

                    <p>۵. این گزارش تحلیل مقدماتی است و جایگزین
                    کنترل طراحی اعضا، پایداری، کمانش، اثرات مرتبه دوم،
                    اتصالات، صفحه‌ستون و فونداسیون نیست.
                    در ترکیب ۶، ضریب بار مرده مطابق رابطه مبحث ششم ۰٫۸D است؛ ضریب باد ۱٫۶W در نظر گرفته شده است.</p>
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

        if (!window.SteelAnalysis ||
            typeof window.SteelAnalysis.calculate !== "function") {
            alert("ماژول تحلیل سازه بارگذاری نشده است.");
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

    // تحلیل مستقل ترکیبات بار
    function calculateCombinationsButton() {
        if (!validateProject()) return;
        if (!validateSections()) return;

        if (!window.SteelAnalysis ||
            typeof window.SteelAnalysis.calculate !== "function") {
            alert("ماژول تحلیل سازه بارگذاری نشده است.");
            return;
        }

        if (window.SteelDrawing) {
            window.SteelDrawing.drawFrame();
        }

        const result = calculateCombinations();

        if (result && result.success) {
            setStatus("تحلیل ترکیبات بار با موفقیت انجام شد.");
        }
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
