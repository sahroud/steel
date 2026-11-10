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
                    deflectionCombination: "—"
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
                    if (supportM > w.supportMoment) {
                        w.supportMoment = supportM;
                        w.supportShear = supportV;
                        w.supportAxial = supportN;
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
