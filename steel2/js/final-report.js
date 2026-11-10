
/* SAHROUD STEEL - Final Aggregated Design Report
   Preliminary report:
   LRFD combinations, displacements, reactions,
   member demand, interaction, shear and buckling
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function fmt(value, digits = 3) {
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";

        return n.toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function reactionValue(item, index, divisor) {
        const value = Number(item.reactions?.[index]);
        return Number.isFinite(value) ? value / divisor : NaN;
    }

    function buildResponseTable(combos) {
        return combos.map((item, i) => {
            const leftH = reactionValue(item, 0, 1000);
            const leftV = reactionValue(item, 1, 1000);
            const leftM = reactionValue(item, 2, 1000000);

            const rightH = reactionValue(item, 12, 1000);
            const rightV = reactionValue(item, 13, 1000);
            const rightM = reactionValue(item, 14, 1000000);

            const displacement =
                Number(item.maxDisplacement) * 1000;

            return `
                <tr>
                    <td>${i + 1}</td>
                    <td>${esc(item.name)}</td>
                    <td>${fmt(displacement)}</td>
                    <td>${fmt(leftH)}</td>
                    <td>${fmt(leftV)}</td>
                    <td>${fmt(leftM)}</td>
                    <td>${fmt(rightH)}</td>
                    <td>${fmt(rightV)}</td>
                    <td>${fmt(rightM)}</td>
                </tr>
            `;
        }).join("");
    }

    function init() {
        if ($("finalReportPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "finalReportPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>گزارش نهایی تجمیعی طراحی</h3>
            </div>

            <p>
                گزارش ترکیبات بار، جابه‌جایی‌ها، واکنش‌ها،
                تقاضای اعضا و کنترل‌های مقدماتی
            </p>

            <button class="btn primary" id="btnFinalReport">
                تهیه گزارش نهایی
            </button>

            <button class="btn" id="btnPrintReport">
                چاپ / ذخیره PDF
            </button>

            <div id="finalReportResults"></div>
        `;

        const shearPanel = $("shearPanel");

        if (shearPanel) {
            shearPanel.after(panel);
        } else {
            document.body.appendChild(panel);
        }

        $("btnFinalReport").addEventListener("click", build);
        $("btnPrintReport").addEventListener("click", printReport);
    }

    function build() {
        const out = $("finalReportResults");

        if (!out) return;

        try {
            const analysis = window.SteelAnalysis;

            if (
                !analysis ||
                !Array.isArray(analysis.combinationResults) ||
                !analysis.combinationResults.length
            ) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            const combos = analysis.combinationResults;
            const gov = analysis.governingCombinationResults;

            if (!gov || !gov.N || !gov.V || !gov.M) {
                throw new Error(
                    "اطلاعات ترکیبات بار حاکم موجود نیست."
                );
            }

            const tasks = [
                ["btnMemberDemand", "memberDemandResults"],
                ["btnInteraction", "interactionResults"],
                ["btnShear", "shearResults"],
                ["checkCombinationBuckling", "combinationBucklingResults"]
            ];

            tasks.forEach(([buttonId, resultId]) => {
                const button = $(buttonId);

                if (!button) {
                    throw new Error(
                        "دکمه محاسباتی پیدا نشد: " + buttonId
                    );
                }

                button.click();

                const result = $(resultId);

                if (!result || !result.innerHTML.trim()) {
                    throw new Error(
                        "نتیجه محاسبه تولید نشد: " + resultId
                    );
                }
            });

            const comboRows = combos.map((item, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${esc(item.name)}</td>
                    <td>${fmt(item.envelope?.N?.value)}</td>
                    <td>${fmt(item.envelope?.V?.value)}</td>
                    <td>${fmt(item.envelope?.M?.value)}</td>
                </tr>
            `).join("");

            const governingRows = [
                ["محوری N", gov.N, "kN"],
                ["برش V", gov.V, "kN"],
                ["لنگر M", gov.M, "kN.m"]
            ].map(([title, item, unit]) => `
                <tr>
                    <td>${title}</td>
                    <td>${fmt(item.value)} ${unit}</td>
                    <td>${esc(item.name)}</td>
                    <td>${esc(item.member)}</td>
                    <td>${esc(item.end)}</td>
                </tr>
            `).join("");

            const responseRows = buildResponseTable(combos);

            let html = `
                <div id="printableFinalReport">

                    <h2>گزارش تجمیعی طراحی سازه فولادی</h2>

                    <p>
                        تاریخ تهیه:
                        ${esc(new Date().toLocaleString("fa-IR"))}
                    </p>

                    <p>
                        تعداد ترکیبات بار تحلیل‌شده:
                        <b>${fmt(combos.length, 0)}</b>
                    </p>

                    <hr>

                    <section class="report-section">
                        <h3>۱. جدول ترکیبات بار LRFD</h3>

                        <table>
                            <thead>
                                <tr>
                                    <th>ردیف</th>
                                    <th>ترکیب بار</th>
                                    <th>بیشینه N (kN)</th>
                                    <th>بیشینه V (kN)</th>
                                    <th>بیشینه M (kN.m)</th>
                                </tr>
                            </thead>
                            <tbody>${comboRows}</tbody>
                        </table>
                    </section>

                    <section class="report-section">
                        <h3>۲. ترکیبات بار حاکم</h3>

                        <table>
                            <thead>
                                <tr>
                                    <th>کنترل</th>
                                    <th>مقدار</th>
                                    <th>ترکیب بار</th>
                                    <th>عضو</th>
                                    <th>محل</th>
                                </tr>
                            </thead>
                            <tbody>${governingRows}</tbody>
                        </table>
                    </section>

                    <section class="report-section">
                        <h3>۳. جدول جابه‌جایی و واکنش تکیه‌گاهی ترکیبات بار</h3>

                        <div style="overflow-x:auto">
                            <table style="width:100%;min-width:1050px;border-collapse:collapse">
                                <thead>
                                    <tr>
                                        <th rowspan="2">ردیف</th>
                                        <th rowspan="2">ترکیب بار</th>
                                        <th rowspan="2">بیشینه جابه‌جایی (mm)</th>
                                        <th colspan="3">تکیه‌گاه چپ</th>
                                        <th colspan="3">تکیه‌گاه راست</th>
                                    </tr>
                                    <tr>
                                        <th>H (kN)</th>
                                        <th>V (kN)</th>
                                        <th>M (kN.m)</th>
                                        <th>H (kN)</th>
                                        <th>V (kN)</th>
                                        <th>M (kN.m)</th>
                                    </tr>
                                </thead>
                                <tbody>${responseRows}</tbody>
                            </table>
                        </div>

                        <div class="notice">
                            <p>
                                جابه‌جایی گزارش‌شده، بیشینه اندازه بردار
                                جابه‌جایی انتقالی گره‌ها در قاب دوبعدی است.
                            </p>
                            <p>
                                واکنش‌های افقی و قائم از مؤلفه‌های
                                نیرو و واکنش لنگری از مؤلفه دوران
                                تکیه‌گاه‌ها استخراج شده‌اند.
                            </p>
                            <p>
                                علامت مثبت و منفی واکنش‌ها مطابق
                                قرارداد علامت موتور تحلیل است.
                            </p>
                        </div>
                    </section>
            `;

            const sections = [
                [
                    "۴. گزارش تقاضای طراحی اعضا",
                    $("memberDemandResults")
                ],
                [
                    "۵. کنترل اندرکنش محوری و خمشی",
                    $("interactionResults")
                ],
                [
                    "۶. کنترل مقدماتی برش",
                    $("shearResults")
                ],
                [
                    "۷. کنترل کمانش اعضا در ترکیبات بار",
                    $("combinationBucklingResults")
                ]
            ];

            sections.forEach(([title, element]) => {
                if (!element || !element.innerHTML.trim()) {
                    throw new Error(
                        "نتایج بخش «" + title + "» خالی است."
                    );
                }

                html += `
                    <section class="report-section">
                        <h3>${title}</h3>
                        ${element.innerHTML}
                    </section>
                `;
            });

            html += `
                    <section class="report-section">
                        <h3>۸. محدودیت‌ها و هشدارها</h3>

                        <div class="notice">
                            <p>
                                این گزارش تجمیع نتایج محاسبات موجود برنامه است.
                            </p>

                            <p>
                                تحلیل قاب فعلی خطی و مرتبه اول است.
                            </p>

                            <p>
                                بیشینه جابه‌جایی گزارش‌شده، مقدار
                                انتقالی گره‌هاست و کنترل تغییرمکان
                                مجاز آیین‌نامه‌ای به‌صورت مستقل
                                در این مرحله انجام نشده است.
                            </p>

                            <p>
                                کنترل‌های اندرکنش، برش و کمانش
                                مقدماتی هستند و تأیید طراحی اجرایی محسوب نمی‌شوند.
                            </p>

                            <p>
                                کنترل کامل کمانش موضعی، کمانش پیچشی،
                                اثرات مرتبه دوم، اندرکنش کامل نیروها،
                                اتصالات، ورق‌های تقویتی و فونداسیون
                                باید جداگانه انجام شود.
                            </p>

                            <p>
                                صحت طول‌های مهارنشده و ضرایب K
                                باید توسط مهندس مسئول بررسی شود.
                            </p>

                            <p>
                                ترکیبات بار و بارهای ورودی باید توسط
                                مهندس مسئول بررسی و تأیید شوند.
                            </p>

                            <p>
                                نتایج این گزارش به‌تنهایی مبنای اجرای سازه نیست.
                            </p>
                        </div>
                    </section>

                </div>
            `;

            out.innerHTML = html;

            out.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {
            out.innerHTML = `
                <div class="notice">
                    <b>خطا در تهیه گزارش:</b>
                    <p>${esc(error.message)}</p>
                </div>
            `;
        }
    }

    function printReport() {
        const report = $("printableFinalReport");

        if (!report) {
            alert("ابتدا گزارش نهایی را تهیه کنید.");
            return;
        }

        const win = window.open("", "_blank");

        if (!win) {
            alert(
                "مرورگر اجازه باز کردن پنجره چاپ را نداده است."
            );
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html lang="fa" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                    content="width=device-width, initial-scale=1">
                <title>گزارش نهایی سازه فولادی</title>

                <style>
                    body {
                        font-family: Tahoma, Arial, sans-serif;
                        direction: rtl;
                        padding: 20px;
                        color: #222;
                        font-size: 12px;
                    }

                    h2, h3, h4 {
                        text-align: center;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 12px 0;
                    }

                    th, td {
                        border: 1px solid #777;
                        padding: 6px;
                        text-align: center;
                        vertical-align: middle;
                    }

                    th {
                        background: #eee;
                    }

                    .report-section {
                        margin: 25px 0;
                        page-break-inside: auto;
                    }

                    .notice {
                        border: 1px solid #888;
                        padding: 10px;
                        margin-top: 15px;
                    }

                    button {
                        display: none;
                    }

                    @media print {
                        body {
                            padding: 0;
                        }

                        table {
                            page-break-inside: auto;
                        }

                        tr {
                            page-break-inside: avoid;
                        }

                        h2, h3, h4 {
                            page-break-after: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                ${report.innerHTML}
            </body>
            </html>
        `);

        win.document.close();
        win.focus();

        win.onload = function () {
            win.print();
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
