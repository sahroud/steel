/* SAHROUD STEEL - Final Report */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

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
                نتایج تقاضای طراحی، اندرکنش و کنترل مقدماتی برش
                در یک گزارش قابل چاپ گردآوری می‌شوند.
            </p>

            <button class="btn primary" id="btnFinalReport">
                تهیه گزارش نهایی
            </button>

            <button class="btn" id="btnPrintReport">
                چاپ / ذخیره PDF
            </button>

            <div id="finalReportResults"></div>
        `;

        $("shearPanel")?.after(panel);

        $("btnFinalReport").addEventListener("click", build);
        $("btnPrintReport").addEventListener("click", printReport);
    }

    function build() {
        const out = $("finalReportResults");

        const tasks = [
            ["btnMemberDemand", "memberDemandResults"],
            ["btnInteraction", "interactionResults"],
            ["btnShear", "shearResults"]
        ];

        try {
            if (!window.SteelAnalysis ||
                !Array.isArray(window.SteelAnalysis.combinationResults) ||
                !window.SteelAnalysis.combinationResults.length) {
                throw new Error("ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید.");
            }

            tasks.forEach(([buttonId]) => {
                const button = $(buttonId);
                if (!button) {
                    throw new Error("یکی از بخش‌های محاسباتی در دسترس نیست: " + buttonId);
                }
                button.click();
            });

            const sections = [
                ["گزارش تقاضای طراحی اعضا", $("memberDemandResults")],
                ["کنترل اندرکنش محوری و خمشی", $("interactionResults")],
                ["کنترل مقدماتی برش", $("shearResults")]
            ];

            let html = `
                <div id="printableFinalReport">
                    <h2>گزارش تجمیعی طراحی سازه فولادی</h2>
                    <p>تاریخ تهیه: ${new Date().toLocaleString("fa-IR")}</p>
            `;

            sections.forEach(([title, element]) => {
                if (!element || !element.innerHTML.trim()) {
                    throw new Error("نتایج بخش «" + title + "» خالی است.");
                }

                html += `
                    <section class="report-section">
                        <h3>${title}</h3>
                        ${element.innerHTML}
                    </section>
                `;
            });

            html += `
                    <div class="notice">
                        <b>محدودیت اعتبار گزارش</b>
                        <p>
                            این گزارش تجمیع نتایج محاسبات موجود برنامه است.
                            کنترل‌ها مقدماتی هستند و تأیید طراحی اجرایی محسوب نمی‌شوند.
                        </p>
                        <p>
                            کنترل کامل ضوابط مبحث دهم، کمانش موضعی،
                            کمانش پیچشی، اثرات مرتبه دوم، اتصالات،
                            ورق‌های تقویتی و سایر الزامات باید جداگانه انجام شود.
                        </p>
                    </div>
                </div>
            `;

            out.innerHTML = html;

            out.scrollIntoView({ behavior: "smooth", block: "start" });

        } catch (error) {
            out.innerHTML = `
                <div class="notice">خطا: ${error.message}</div>
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
            alert("مرورگر اجازه باز کردن پنجره چاپ را نداده است.");
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html lang="fa" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>گزارش نهایی سازه فولادی</title>
                <style>
                    body {
                        font-family: Tahoma, Arial, sans-serif;
                        direction: rtl;
                        padding: 20px;
                        color: #222;
                    }
                    h2, h3, h4 { text-align: center; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 12px 0;
                    }
                    th, td {
                        border: 1px solid #777;
                        padding: 6px;
                        text-align: center;
                    }
                    .report-section {
                        margin: 25px 0;
                        page-break-inside: avoid;
                    }
                    .notice {
                        border: 1px solid #888;
                        padding: 10px;
                        margin-top: 15px;
                    }
                    button { display: none; }
                </style>
            </head>
            <body>
                ${report.innerHTML}
            </body>
            </html>
        `);

        win.document.close();
        win.focus();
        win.print();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();