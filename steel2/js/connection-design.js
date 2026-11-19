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
            <div class="panel-title"><h3>تحلیل تقاضای مقدماتی گروه جوش کنسول</h3></div>
            <div class="notice">
                این مرحله فقط توزیع تقاضای الاستیک را برای یک گروه جوش مستطیلی ایده‌آل نشان می‌دهد. نیروها از کنترل دوبعدی کنسول دریافت می‌شوند؛ تبدیل دستگاه مختصات به صفحه واقعی اتصال هنوز انجام نشده است.
                آرایش جوش این محاسبه، جوش پیوسته در چهار ضلع ورق است و باید با جزئیات واقعی منطبق باشد.
            </div>
            <h4>۱ ـ نیروهای محل اتصال</h4>
            <div id="connectionActions" class="notice">ابتدا تحلیل ترکیبات بار و کنترل کنسول‌ها را اجرا کنید.</div>
            <h4>۲ ـ هندسه ورق و گروه جوش مستطیلی</h4>
            <div class="form-grid">
                ${field("connPlateThickness", "ضخامت ورق اتصال ـ مقدار آزمایشی", "mm", 10)}
                ${field("connPlateWidth", "عرض ورق / فاصله خطوط جوش ـ آزمایشی", "mm", 200)}
                ${field("connPlateHeight", "ارتفاع گروه جوش ـ آزمایشی", "mm", 300)}
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
    function calculate() {
        const out = $("connectionCheckResults");
        try {
            refreshActions();
            const sides = getSides();
            if (!sides || sides.some(x => !x[1])) throw new Error("ابتدا تحلیل ترکیبات بار و کنترل کنسول‌ها را اجرا کنید.");
            const t=Number($("connPlateThickness").value);
            const b=Number($("connPlateWidth").value);
            const h=Number($("connPlateHeight").value);
            if (!(t>0 && b>0 && h>0)) {
                throw new Error("ضخامت، عرض و ارتفاع هندسه را با مقادیر مثبت وارد کنید.");
            }
            if (b<=0 || h<=0) throw new Error("عرض و ارتفاع گروه جوش باید مثبت باشند.");
            const outputs = sides.map(([name,r]) => {
                const cases = r.connectionCases || [];
                if (!cases.length) throw new Error("نیروهای هم‌زمان ترکیبات بار ثبت نشده‌اند؛ تحلیل و کنترل کنسول را دوباره اجرا کنید.");
                let worst=null;
                cases.forEach(c => {
                    // Convert M from kN.m to kN.mm; N and V remain kN.
                    const g=window.SahroudWeldGroupDemand.analyze({width:b,height:h,N:c.N,V:c.V,M:c.M*1000});
                    if (!worst || g.maxLineDemand>worst.g.maxLineDemand) worst={c,g};
                });
                return {name,worst};
            });
            const rows=outputs.map(o=>{
                const {c,g}=o.worst;
                return `<tr><td>${o.name}</td><td>${c.combination}</td>
                    <td>${fmt(c.M)} / ${fmt(c.V)} / ${fmt(c.N)}</td>
                    <td>${fmt(g.maxLineDemand,4)}</td><td>${g.criticalPoint}</td></tr>`;
            }).join("");
            const first=outputs[0].worst.g;
            out.innerHTML=`
                <h4>نتیجه تحلیل الاستیک گروه جوش مستطیلی</h4>
                <p>محیط مؤثر جوش: ${fmt(first.perimeter,1)} mm؛ ممان قطبی خطی J′: ${fmt(first.linePolarMoment,0)} mm³</p>
                <p>ممان قطبی خطی گروه جوش J′: ${fmt(first.J,0)} mm³</p>
                <p>این خروجی فقط تقاضای خطی الاستیک را گزارش می‌کند؛ ظرفیت طراحی جوش محاسبه نشده و انتقال نیرو به دستگاه واقعی اتصال هنوز تأیید نشده است.</p>
                <div style="overflow-x:auto"><table style="width:100%;min-width:760px;border-collapse:collapse">
                    <thead><tr><th>عضو</th><th>ترکیب حاکم گروه جوش</th><th>M (kN.m) / V (kN) / N (kN)</th>
                    <th>تقاضای خطی بیشینه (kN/mm)</th><th>نقطه بحرانی</th></tr></thead>
                    <tbody>${rows}</tbody></table></div>
                <p>ابعاد ورق واردشده: ضخامت ${fmt(t,1)}، عرض ${fmt(b,1)}، ارتفاع ${fmt(h,1)} میلی‌متر.</p>
                <div class="notice" style="color:#a65d16">
                    علامت N، V و M در ورودی حفظ شده و هر ترکیب بار جداگانه ارزیابی شده است؛ اما این سه مؤلفه هنوز به دستگاه مختصات واقعی اتصال تبدیل نشده‌اند. خروجی صرفاً تقاضای مقدماتی است، نه قبولی اتصال.
                </div>`;
        } catch(e) {
            out.innerHTML='<div class="notice" style="color:#a65d16">'+String(e.message)+'</div>';
        }
    }
    window.SteelConnectionDesign={refreshActions,calculate};
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",createPanel);
    else createPanel();
})();