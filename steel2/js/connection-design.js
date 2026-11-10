/* SAHROUD STEEL - Preliminary Cantilever Connection Stage 1
   Reports governing actions and checks fillet-weld direct shear only.
   Plate, bolt, weld-group moment, axial force and stiffener design remain pending.
*/
(function () {
    "use strict";
    const $ = id => document.getElementById(id);

    function fmt(v, d = 2) {
        const n = Number(v);
        return Number.isFinite(n) ? n.toLocaleString("fa-IR", {
            minimumFractionDigits: d, maximumFractionDigits: d
        }) : "—";
    }

    function field(id, label, unit, step = "0.1") {
        return `<div class="field">
            <label for="${id}">${label} (${unit})</label>
            <input id="${id}" type="number" min="0" step="${step}" placeholder="وارد کنید">
        </div>`;
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
                مرحله اول: دریافت نیروهای حاکم اتصال و کنترل مقدماتی مقاومت جوش گوشه تحت برش مستقیم.
                برای طراحی نهایی، هندسه واقعی اتصال و جزئیات ورق، پیچ و سخت‌کننده باید مشخص شود.
            </div>
            <h4>۱ ـ نیروهای حاکم محل اتصال</h4>
            <div id="connectionActions" class="notice">ابتدا تحلیل ترکیبات بار و کنترل کنسول‌ها را اجرا کنید.</div>

            <h4>۲ ـ مشخصات ورق و جوش (از نقشه یا طرح پیشنهادی وارد شود)</h4>
            <div class="form-grid">
                ${field("connPlateThickness", "ضخامت ورق اتصال", "mm")}
                ${field("connPlateWidth", "عرض ورق اتصال", "mm")}
                ${field("connPlateHeight", "ارتفاع ورق اتصال", "mm")}
                ${field("connWeldSize", "اندازه ساق جوش گوشه", "mm")}
                ${field("connWeldLength", "مجموع طول مؤثر جوش", "mm")}
                ${field("connFexx", "مقاومت کششی الکترود FEXX", "MPa")}
            </div>
            <div class="notice">
                اندازه و طول جوش را از جزئیات واقعی یا طرح پیشنهادی وارد کنید؛ نرم‌افزار برای این مقادیر عدد پیش‌فرض فرض نمی‌کند.
            </div>
            <div class="button-grid">
                <button id="btnConnectionCheck" class="btn primary" type="button">کنترل مقدماتی برش جوش</button>
            </div>
            <div id="connectionCheckResults"></div>
            <div class="notice" style="color:#a65d16">
                این مرحله هنوز ظرفیت گروه جوش تحت لنگر، نیروی محوری، شکست ورق، بلوک برشی، پیچ‌ها، لهیدگی، گسیختگی مقطع خالص و سخت‌کننده‌ها را کنترل نمی‌کند.
                نتیجه این کنترل محدود، تأیید اتصال یا مجوز اجرا نیست.
            </div>
        `;

        const status = Array.from(main.querySelectorAll(".panel"))
            .find(p => p.querySelector("h3")?.textContent.includes("وضعیت پروژه"));
        if (status) main.insertBefore(panel, status);
        else main.appendChild(panel);

        $("btnConnectionCheck").addEventListener("click", calculate);
        refreshActions();
    }

    function refreshActions() {
        const box = $("connectionActions");
        if (!box) return;
        const result = window.SteelCantileverCheck?.lastResult;
        if (!result?.worst) {
            box.textContent = "ابتدا تحلیل ترکیبات بار و سپس محاسبه کنترل کنسول‌ها را اجرا کنید.";
            return;
        }
        const left = result.worst["کنسول رفتر چپ"];
        const right = result.worst["کنسول رفتر راست"];
        if (!left || !right) {
            box.textContent = "نیروهای اتصال کنسول‌ها در نتایج موجود نیست؛ تحلیل را دوباره اجرا کنید.";
            return;
        }
        const card = (title, r) => `
            <div style="border:1px solid #d7e1e7;border-radius:8px;padding:10px;margin:8px 0">
                <b>${title}</b><br>
                لنگر حاکم: ${fmt(r.supportMoment)} kN.m
                <small>(${r.supportMomentCombination || "ترکیب ثبت‌نشده"})</small><br>
                برش حاکم: ${fmt(r.supportShear)} kN
                <small>(${r.supportShearCombination || "ترکیب ثبت‌نشده"})</small><br>
                نیروی محوری حاکم: ${fmt(r.supportAxial)} kN
                <small>(${r.supportAxialCombination || "ترکیب ثبت‌نشده"})</small>
            </div>`;
        box.innerHTML = card("کنسول چپ", left) + card("کنسول راست", right) +
            "<small>هر مؤلفه به‌طور مستقل از ترکیب بار حاکم خودش استخراج شده است.</small>";
    }

    function calculate() {
        const out = $("connectionCheckResults");
        try {
            refreshActions();
            const result = window.SteelCantileverCheck?.lastResult;
            if (!result?.worst) throw new Error("ابتدا تحلیل و کنترل کنسول‌ها را اجرا کنید.");

            const w = Number($("connWeldSize").value);
            const length = Number($("connWeldLength").value);
            const fexx = Number($("connFexx").value);
            const thickness = Number($("connPlateThickness").value);
            const width = Number($("connPlateWidth").value);
            const height = Number($("connPlateHeight").value);
            if (!(w > 0 && length > 0 && fexx > 0)) {
                throw new Error("اندازه جوش، مجموع طول مؤثر جوش و FEXX را وارد کنید.");
            }
            if (!(thickness > 0 && width > 0 && height > 0)) {
                throw new Error("ضخامت، عرض و ارتفاع ورق اتصال را نیز وارد کنید.");
            }

            // AISC-style preliminary nominal fillet-weld shear strength:
            // phi * 0.60 * FEXX * 0.707*w*L. Only direct shear is checked.
            const phi = 0.75;
            const throatArea = 0.707 * w * length;
            const phiRn_kN = phi * 0.60 * fexx * throatArea / 1000;

            const sides = [
                ["کنسول چپ", result.worst["کنسول رفتر چپ"]],
                ["کنسول راست", result.worst["کنسول رفتر راست"]]
            ];
            const rows = sides.map(([name, r]) => {
                const demand = Number(r?.supportShear) || 0;
                const ratio = demand / phiRn_kN;
                return `<tr>
                    <td>${name}</td><td>${fmt(demand)}</td>
                    <td>${fmt(phiRn_kN)}</td><td>${fmt(ratio, 3)}</td>
                    <td>${ratio <= 1 ? "قبول فقط در برش مستقیم جوش" : "نیازمند افزایش ظرفیت/بازطراحی"}</td>
                </tr>`;
            }).join("");

            out.innerHTML = `
                <h4>نتیجه کنترل محدود جوش تحت برش مستقیم</h4>
                <p>سطح مؤثر گلویی جوش: ${fmt(throatArea, 1)} mm²</p>
                <p>ظرفیت طراحی برش مستقیم جوش φRn: ${fmt(phiRn_kN)} kN (φ=0.75)</p>
                <div style="overflow-x:auto">
                    <table style="width:100%;min-width:560px;border-collapse:collapse">
                        <thead><tr><th>طرف</th><th>برش تقاضا (kN)</th><th>ظرفیت جوش (kN)</th><th>نسبت</th><th>نتیجه محدود</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <p>ابعاد ثبت‌شده ورق: ضخامت ${fmt(thickness,1)}، عرض ${fmt(width,1)}، ارتفاع ${fmt(height,1)} میلی‌متر.</p>
                <div class="notice" style="color:#a65d16">
                    این مقایسه فقط برش مستقیم جوش را می‌سنجد. چون اثر لنگر، نیروی محوری، خروج از مرکزیت و توزیع نیرو در گروه جوش وارد نشده‌اند، «قبول» در این جدول به معنی کفایت جوش یا اتصال نیست.
                    ورق نیز هنوز از نظر خمش، تسلیم، گسیختگی و بلوک برشی طراحی نشده است.
                </div>`;
        } catch (e) {
            out.innerHTML = '<div class="notice" style="color:#a65d16">' + e.message + '</div>';
        }
    }

    window.SteelConnectionDesign = { refreshActions, calculate };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createPanel);
    } else {
        createPanel();
    }
})();