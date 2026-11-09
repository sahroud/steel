
/* SAHROUD STEEL - Compression Buckling Check */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const PHI_C = 0.90;

    function createPanel() {
        if ($("stabilityPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "stabilityPanel";
        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل کمانش و مقاومت فشاری اعضا</h3>
            </div>
            <div class="notice">
                کنترل مقدماتی کمانش خمشی حول دو محور با طول‌های مهارنشده و ضرایب K واردشده.
            </div>
            <div class="button-grid">
                <button id="checkColumnBuckling" class="btn primary" type="button">کنترل کمانش ستون</button>
                <button id="checkRafterBuckling" class="btn primary" type="button">کنترل کمانش رفتر</button>
                <button id="checkCombinationBuckling" class="btn primary" type="button">کنترل کمانش ترکیبات بار</button>
            </div>
            <div id="columnBucklingResults"></div>
            <div id="rafterBucklingResults"></div>
            <div id="combinationBucklingResults"></div>
            <div id="bucklingMessage" class="notice">
                برای شروع، اطلاعات مقاطع و ضرایب طول مؤثر را وارد کنید.
            </div>
            <div class="notice">
                هشدار: این کنترل فقط کمانش خمشی کلی و نیروی فشاری محوری را بررسی می‌کند.
                کمانش پیچشی و خمشی‌ـ‌پیچشی، لاغری موضعی اجزا، اثرات مرتبه دوم،
                اندرکنش نیروی محوری و لنگر، و طراحی اتصالات هنوز منظور نشده‌اند.
                نتیجه، تأیید نهایی ایمنی یا طراحی اجرایی نیست.
            </div>
        `;

        const main = document.querySelector("main");
        const girderPanel = $("girderPanel");
        if (girderPanel && girderPanel.parentNode) {
            girderPanel.parentNode.insertBefore(panel, girderPanel.nextSibling);
        } else if (main) {
            main.appendChild(panel);
        }

        $("checkColumnBuckling").addEventListener("click", () => checkMember("column"));
        $("checkRafterBuckling").addEventListener("click", () => checkMember("rafter"));
        $("checkCombinationBuckling").addEventListener("click", checkCombinationBuckling);
    }

    function calculateAxis(E, Fy, A, I, L, K) {
        const r = Math.sqrt(I / A);
        if (!(r > 0)) throw new Error("شعاع ژیراسیون معتبر نیست.");

        const slenderness = K * L / r;
        const Fe = Math.PI * Math.PI * E / (slenderness * slenderness);
        const limit = 4.71 * Math.sqrt(E / Fy);
        const Fcr = slenderness <= limit
            ? Math.pow(0.658, Fy / Fe) * Fy
            : 0.877 * Fe;
        const Pn = Fcr * A;

        return {
            r, slenderness, Fe, Fcr, Pn,
            designCapacity: PHI_C * Pn,
            branch: slenderness <= limit ? "کمانش غیرالاستیک" : "کمانش الاستیک"
        };
    }

    function fmt(value, digits = 2) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function getMemberCapacity(member) {
        if (!window.SteelSections || !window.SteelGirder) {
            throw new Error("ماژول مقاطع یا تیرورق بارگذاری نشده است.");
        }

        const stability = window.SteelGirder.readStability(member);
        for (const key of ["Lx", "Ly", "Kx", "Ky"]) {
            if (stability[key] === null || stability[key] <= 0) {
                throw new Error("چهار مقدار Lx، Ly، Kx و Ky مربوط به " +
                    (member === "column" ? "ستون" : "رفتر") + " را کامل کنید.");
            }
        }

        const section = window.SteelSections.getDataSI();
        const material = section.material;
        const profile = section[member];
        const E = material.E, Fy = material.Fy;
        const A = profile.A, Ix = profile.Ix, Iy = profile.Iy;

        if (!(E > 0 && Fy > 0 && A > 0 && Ix > 0 && Iy > 0)) {
            throw new Error("مشخصات فولاد یا مقطع معتبر نیست.");
        }

        const x = calculateAxis(E, Fy, A, Ix, stability.Lx, stability.Kx);
        const y = calculateAxis(E, Fy, A, Iy, stability.Ly, stability.Ky);
        const controlling = x.designCapacity <= y.designCapacity ? x : y;

        return {
            x, y,
            controlling,
            controllingAxis: controlling === x ? "محور قوی" : "محور ضعیف",
            capacityKN: controlling.designCapacity / 1000
        };
    }

    function checkMember(member) {
        const title = member === "column" ? "ستون" : "رفتر";
        const outputId = member === "column" ? "columnBucklingResults" : "rafterBucklingResults";

        try {
            const result = getMemberCapacity(member);
            const x = result.x, y = result.y, controlling = result.controlling;

            $(outputId).innerHTML = `
                <hr><h4>نتایج کنترل کمانش ${title}</h4>
                <div class="notice">
                    <b>محور قوی</b>
                    <p>شعاع ژیراسیون rx: ${fmt(x.r * 100)} cm</p>
                    <p>لاغری KxLx/rx: ${fmt(x.slenderness)}</p>
                    <p>تنش کمانش الاستیک Fe: ${fmt(x.Fe / 1e6)} MPa</p>
                    <p>تنش بحرانی Fcr: ${fmt(x.Fcr / 1e6)} MPa</p>
                    <p>نوع کمانش: ${x.branch}</p>
                    <p>مقاومت اسمی Pn: ${fmt(x.Pn / 1000)} kN</p>
                    <p><b>مقاومت طراحی φPn: ${fmt(x.designCapacity / 1000)} kN</b></p>
                </div>
                <div class="notice">
                    <b>محور ضعیف</b>
                    <p>شعاع ژیراسیون ry: ${fmt(y.r * 100)} cm</p>
                    <p>لاغری KyLy/ry: ${fmt(y.slenderness)}</p>
                    <p>تنش کمانش الاستیک Fe: ${fmt(y.Fe / 1e6)} MPa</p>
                    <p>تنش بحرانی Fcr: ${fmt(y.Fcr / 1e6)} MPa</p>
                    <p>نوع کمانش: ${y.branch}</p>
                    <p>مقاومت اسمی Pn: ${fmt(y.Pn / 1000)} kN</p>
                    <p><b>مقاومت طراحی φPn: ${fmt(y.designCapacity / 1000)} kN</b></p>
                </div>
                <div class="notice">
                    <b>محور حاکم: ${result.controllingAxis}</b>
                    <p>مقاومت فشاری طراحی حاکم: ${fmt(controlling.designCapacity / 1000)} kN</p>
                </div>
            `;

            $("bucklingMessage").textContent = "محاسبه کمانش خمشی " + title + " انجام شد.";
            $("bucklingMessage").style.color = "#15803d";
        } catch (error) {
            $(outputId).innerHTML = "";
            $("bucklingMessage").textContent = "خطا: " + error.message;
            $("bucklingMessage").style.color = "#b45309";
        }
    }

    function checkCombinationBuckling() {
        const output = $("combinationBucklingResults");
        try {
            const cases = window.SteelAnalysis &&
                window.SteelAnalysis.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error("ابتدا دکمه تحلیل ترکیبات بار LRFD را اجرا کنید.");
            }

            const capacities = {
                "ستون چپ": getMemberCapacity("column").capacityKN,
                "ستون راست": getMemberCapacity("column").capacityKN,
                "رفتر چپ": getMemberCapacity("rafter").capacityKN,
                "رفتر راست": getMemberCapacity("rafter").capacityKN
            };

            const demand = {};
            Object.keys(capacities).forEach(name => {
                demand[name] = { value: 0, combination: "—", end: "—" };
            });

            cases.forEach(item => {
                (item.members || []).forEach(member => {
                    if (!Object.prototype.hasOwnProperty.call(demand, member.name)) return;

                    // در تحلیل فعلی N مثبت = فشار و N منفی = کشش
                    [
                        { value: Number(member.axialStart), end: "ابتدا" },
                        { value: Number(member.axialEnd), end: "انتها" }
                    ].forEach(force => {
                        if (Number.isFinite(force.value) && force.value > demand[member.name].value) {
                            demand[member.name] = {
                                value: force.value,
                                combination: item.name,
                                end: force.end
                            };
                        }
                    });
                });
            });

            const rows = Object.keys(capacities).map(name => {
                const ratio = capacities[name] > 0
                    ? demand[name].value / capacities[name]
                    : Infinity;
                const status = ratio <= 1 ? "قبول مقدماتی" : "نیازمند تقویت";
                return `
                    <tr>
                        <td>${name}</td>
                        <td>${fmt(demand[name].value)}</td>
                        <td>${fmt(capacities[name])}</td>
                        <td>${fmt(ratio * 100, 1)}%</td>
                        <td>${status}</td>
                        <td>${demand[name].combination}</td>
                        <td>${demand[name].end}</td>
                    </tr>
                `;
            }).join("");

            output.innerHTML = `
                <hr><h4>کنترل مقدماتی فشار اعضا در ترکیبات بار LRFD</h4>
                <p>فقط نیروهای محوری فشاری مثبت در دو انتهای اعضا بررسی شده‌اند؛ کشش در این کنترل وارد نشده است.</p>
                <div style="overflow-x:auto">
                    <table style="width:100%;border-collapse:collapse;min-width:760px">
                        <thead><tr>
                            <th>عضو</th><th>بیشینه فشار N (kN)</th>
                            <th>ظرفیت φPn (kN)</th><th>نسبت تقاضا/ظرفیت</th>
                            <th>نتیجه</th><th>ترکیب حاکم</th><th>محل</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="notice">
                    این جدول فقط کنترل مقدماتی فشار محوری در برابر کمانش خمشی کلی است.
                    کنترل اندرکنش N-M، کمانش پیچشی، کمانش موضعی، اثرات مرتبه دوم و سایر الزامات طراحی هنوز انجام نشده است.
                </div>
            `;

            $("bucklingMessage").textContent = "کنترل فشار اعضا برای تمام ترکیبات بار انجام شد.";
            $("bucklingMessage").style.color = "#15803d";
        } catch (error) {
            if (output) output.innerHTML = "";
            $("bucklingMessage").textContent = "خطا: " + error.message;
            $("bucklingMessage").style.color = "#b45309";
        }
    }

    function init() {
        createPanel();
    }

    window.SteelStability = {
        calculateAxis,
        checkMember,
        checkCombinationBuckling
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
