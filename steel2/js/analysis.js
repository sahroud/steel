

/* SAHROUD STEEL - Preliminary Load Analysis */
(function () {
    "use strict";

    function getValue(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error("فیلد " + id + " پیدا نشد.");
        }
        return Number(element.value);
    }

    function format(value) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function show(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function calculate() {
        const message = document.getElementById("analysisMessage");

        try {
            const span = getValue("span");
            const length = getValue("length");
            const spacing = getValue("spacing");
            const height = getValue("height");
            const rise = getValue("rise");

            const dead = getValue("dead");
            const live = getValue("live");
            const wind = getValue("wind");
            const snow = getValue("snow");

            const dimensions = [
                span, length, spacing, height
            ];

            if (dimensions.some(v => !Number.isFinite(v) || v <= 0)) {
                throw new Error("ابعاد هندسی باید بزرگ‌تر از صفر باشند.");
            }

            if (!Number.isFinite(rise) || rise < 0) {
                throw new Error("ارتفاع تاج نامعتبر است.");
            }

            const loads = [dead, live, wind, snow];

            if (loads.some(v => !Number.isFinite(v) || v < 0)) {
                throw new Error("بارها باید عدد معتبر و غیرمنفی باشند.");
            }

            /*
             * بارهای ورودی بر حسب kN/m² هستند.
             * فاصله قاب‌ها بر حسب متر است.
             * حاصل ضرب، بار خطی تقریبی هر قاب بر حسب kN/m است.
             *
             * این تبدیل برای بارگذاری مقدماتی است.
             * جهت باد، شیب سقف، ضرایب آیین‌نامه‌ای
             * و ترکیبات بار در این مرحله تحلیل نشده‌اند.
             */

            const deadLine = dead * spacing;
            const liveLine = live * spacing;
            const snowLine = snow * spacing;
            const windLine = wind * spacing;

            const gravityLine = deadLine + liveLine + snowLine;

            const deadTotal = deadLine * span;
            const liveTotal = liveLine * span;
            const snowTotal = snowLine * span;
            const windTotal = windLine * span;

            const gravityTotal = gravityLine * span;

            const frameCount =
                Math.ceil(length / spacing) + 1;

            const memberCount = 4;

            show("displacement", "نیازمند تحلیل سازه‌ای");
            show("reaction", "نیازمند تحلیل سازه‌ای");
            show("memberCount", String(memberCount));

            if (message) {
                message.innerHTML = `
                    <h4>نتایج بارگذاری مقدماتی</h4>

                    <p><b>فاصله قاب‌ها:</b>
                    ${format(spacing)} متر</p>

                    <p><b>تعداد قاب‌ها:</b>
                    ${format(frameCount)}</p>

                    <hr>

                    <p><b>بار خطی مرده:</b>
                    ${format(deadLine)} kN/m</p>

                    <p><b>بار خطی زنده:</b>
                    ${format(liveLine)} kN/m</p>

                    <p><b>بار خطی برف:</b>
                    ${format(snowLine)} kN/m</p>

                    <p><b>مقدار خطی باد:</b>
                    ${format(windLine)} kN/m</p>

                    <hr>

                    <p><b>بار قائم تقریبی کل هر قاب:</b>
                    ${format(gravityTotal)} kN</p>

                    <p><b>سهم بار مرده هر قاب:</b>
                    ${format(deadTotal)} kN</p>

                    <p><b>سهم بار زنده هر قاب:</b>
                    ${format(liveTotal)} kN</p>

                    <p><b>سهم بار برف هر قاب:</b>
                    ${format(snowTotal)} kN</p>

                    <p><b>مقدار باد در سطح بارگیری قاب:</b>
                    ${format(windTotal)} kN</p>

                    <hr>

                    <p style="color:#b45309">
                    ⚠️ این اعداد صرفاً تبدیل اولیه بار سطحی
                    به بار خطی و برآورد بار هستند.
                    </p>

                    <p>
                    هنوز تحلیل ماتریسی قاب، اثر شیب سقف،
                    جهت و توزیع باد، ضرایب آیین‌نامه‌ای،
                    ترکیبات بار و کنترل اعضا انجام نشده است.
                    </p>

                    <p>
                    جابه‌جایی و واکنش تکیه‌گاهی در این مرحله
                    محاسبه نشده‌اند.
                    </p>
                `;
            }

            if (window.SteelProject &&
                typeof window.SteelProject.setStatus === "function") {
                window.SteelProject.setStatus(
                    "بارگذاری مقدماتی با موفقیت محاسبه شد."
                );
            }

            return {
                success: true,
                span,
                length,
                spacing,
                frameCount,
                memberCount,
                deadLine,
                liveLine,
                snowLine,
                windLine,
                gravityLine,
                deadTotal,
                liveTotal,
                snowTotal,
                windTotal,
                gravityTotal
            };

        } catch (error) {
            if (message) {
                message.textContent = "خطا: " + error.message;
            }

            if (window.SteelProject &&
                typeof window.SteelProject.setStatus === "function") {
                window.SteelProject.setStatus(
                    "خطا در محاسبات: " + error.message
                );
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    window.SteelAnalysis = {
        calculate: calculate
    };

})();
