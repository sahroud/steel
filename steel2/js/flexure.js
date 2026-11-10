
/* SAHROUD STEEL - Preliminary Flexural Capacity Check
   Version 1.0
   Units: kN, m, kN.m
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const PHI_B = 0.90;

    const MEMBERS = [
        "ستون چپ",
        "ستون راست",
        "رفتر چپ",
        "رفتر راست"
    ];

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
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[ch]);
    }

    function memberType(name) {
        return name.includes("ستون") ? "column" : "rafter";
    }

    // نیروی برشی و لنگر در طول عضو، با بار گسترده یکنواخت
    function forceAt(member, type, x) {
        const qx = Number(member.localLoadX) || 0;
        const qy = Number(member.localLoadY) || 0;

        if (type === "V") {
            return -(Number(member.shearStart) || 0) - qy * x;
        }

        if (type === "N") {
            return -(Number(member.axialStart) || 0) - qx * x;
        }

        return -(Number(member.momentStart) || 0) +
            (Number(member.shearStart) || 0) * x +
            0.5 * qy * x * x;
    }

    function stations(member) {
        const L = Number(member.length);
        const points = [0, L];
        const qy = Number(member.localLoadY) || 0;
        const shearStart = Number(member.shearStart) || 0;

        if (Math.abs(qy) > 1e-12) {
            const x = -shearStart / qy;
            if (x > 0 && x < L) points.push(x);
        }

        return [...new Set(points)].sort((a, b) => a - b);
    }

    function getFlexuralCapacity(type) {
        if (!window.SteelSections) {
            throw new Error("ماژول مشخصات مقاطع بارگذاری نشده است.");
        }

        const data = window.SteelSections.getDataSI();
        const material = data.material;
        const section = data[type];

        const sxTop = Number(section.SxTop);
        const sxBottom = Number(section.SxBottom);
        const fy = Number(material.Fy);

        if (!(fy > 0 && sxTop > 0 && sxBottom > 0)) {
            throw new Error(
                "Fy و مدول مقطع بالا و پایین باید برای ستون و رفتر معتبر باشند."
            );
        }

        // استفاده از مدول کوچک‌تر برای برآورد محافظه‌کارانه
        const sxMin = Math.min(sxTop, sxBottom);
        const nominalNm = fy * sxMin;
        const designNm = PHI_B * nominalNm;

        return {
            fyMPa: fy / 1e6,
            sxTopCm3: sxTop * 1e6,
            sxBottomCm3: sxBottom * 1e6,
            sxMinCm3: sxMin * 1e6,
            nominalKNm: nominalNm / 1000,
            designKNm: designNm / 1000
        };
    }

    function calculate() {
        const output = $("flexureResults");

        try {
            const cases =
                window.SteelAnalysis &&
                window.SteelAnalysis.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            const capacities = {
                column: getFlexuralCapacity("column"),
                rafter: getFlexuralCapacity("rafter")
            };

            const results = {};

            MEMBERS.forEach(name => {
                results[name] = {
                    capacity: capacities[memberType(name)],
                    demand: 0,
                    ratio: 0,
                    combination: "—",
                    position: "—",
                    momentSign: "—"
                };
            });

            let processed = 0;

            cases.forEach(item => {
                (item.members || []).forEach(member => {
                    const name = member.name;
                    if (!results[name]) return;

                    const L = Number(member.length);

                    if (!(Number.isFinite(L) && L > 0)) {
                        throw new Error(
                            "طول عضو «" + name + "» معتبر نیست."
                        );
                    }

                    if (
                        !Number.isFinite(Number(member.localLoadY)) ||
                        !Number.isFinite(Number(member.shearStart)) ||
                        !Number.isFinite(Number(member.momentStart))
                    ) {
                        throw new Error(
                            "اطلاعات نیروهای عضو «" + name +
                            "» ناقص است. تحلیل را دوباره اجرا کنید."
                        );
                    }

                    stations(member).forEach(x => {
                        const M = forceAt(member, "M", x);
                        const demand = Math.abs(M);
                        const capacity = results[name].capacity.designKNm;
                        const ratio = capacity > 0
                            ? demand / capacity
                            : Infinity;

                        if (ratio > results[name].ratio) {
                            results[name].demand = demand;
                            results[name].ratio = ratio;
                            results[name].combination = item.name;
                            results[name].position = x;
                            results[name].momentSign =
                                M >= 0 ? "مثبت" : "منفی";
                        }
                    });

                    processed++;
                });
            });

            if (!processed) {
                throw new Error(
                    "نتایج نیروهای اعضا در ترکیبات بار پیدا نشد."
                );
            }

            const rows = MEMBERS.map(name => {
                const r = results[name];
                const c = r.capacity;
                const pass = r.ratio <= 1;

                return `
                    <tr>
                        <td><b>${esc(name)}</b></td>
                        <td>${fmt(c.sxTopCm3)}</td>
                        <td>${fmt(c.sxBottomCm3)}</td>
                        <td>${fmt(c.sxMinCm3)}</td>
                        <td>${fmt(c.nominalKNm)}</td>
                        <td>${fmt(c.designKNm)}</td>
                        <td>${fmt(r.demand)}</td>
                        <td>${fmt(r.ratio)}</td>
                        <td>${pass ? "قبول مقدماتی" : "نیاز به بررسی"}</td>
                        <td>${esc(r.combination)}</td>
                        <td>${fmt(r.position)} m</td>
                        <td>${r.momentSign}</td>
                    </tr>
                `;
            }).join("");

            output.innerHTML = `
                <hr>
                <h4>جدول کنترل مقدماتی ظرفیت خمشی اعضا</h4>

                <p>
                    ضریب مقاومت خمشی استفاده‌شده:
                    <b>φb = ${fmt(PHI_B, 2)}</b>
                </p>

                <div style="overflow-x:auto">
                    <table style="
                        width:100%;
                        min-width:1250px;
                        border-collapse:collapse;
                        font-size:12px
                    ">
                        <thead>
                            <tr>
                                <th>عضو</th>
                                <th>Sx بالا (cm³)</th>
                                <th>Sx پایین (cm³)</th>
                                <th>Sx مبنا (cm³)</th>
                                <th>Mn (kN.m)</th>
                                <th>φMn (kN.m)</th>
                                <th>Mu (kN.m)</th>
                                <th>Mu/φMn</th>
                                <th>نتیجه</th>
                                <th>ترکیب حاکم</th>
                                <th>موقعیت در عضو</th>
                                <th>علامت لنگر</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="notice">
                    <b>روش محاسبه</b>
                    <p>
                        ظرفیت اسمی خمشی مقدماتی از رابطه
                        Mn = Fy × Sx,min و ظرفیت طراحی از رابطه
                        φMn = 0.90 × Mn به دست آمده است.
                    </p>
                    <p>
                        Sx,min کوچک‌ترِ مدول مقطع بالا و پایین است.
                        تقاضای لنگر در ابتدا، انتها و نقطه صفرشدن برش
                        برای تمام ترکیبات بار بررسی شده است.
                    </p>
                </div>

                <div class="notice">
                    <b>محدودیت مهم مهندسی</b>
                    <p>
                        این محاسبه فقط برآورد اولیه تسلیم خمشی الاستیک است
                        و کنترل کامل ظرفیت خمشی آیین‌نامه‌ای محسوب نمی‌شود.
                    </p>
                    <p>
                        کمانش جانبی‌پیچشی، کمانش موضعی بال و جان،
                        طول مهارنشده، ضریب Cb، ظرفیت پلاستیک،
                        سوراخ‌ها و بازشوها و اثر اندرکنش نیروی محوری
                        و لنگر در این مرحله لحاظ نشده‌اند.
                    </p>
                    <p>
                        نتیجه «قبول مقدماتی» تأیید طراحی اجرایی یا
                        ایمنی سازه نیست.
                    </p>
                </div>
            `;

            window.SteelAnalysis.flexureResults = results;

            const status = $("projectStatus");
            if (status) {
                status.textContent =
                    "کنترل مقدماتی ظرفیت خمشی چهار عضو در تمام ترکیبات بار انجام شد.";
            }

        } catch (error) {
            output.innerHTML = `
                <div class="notice" style="color:#b45309">
                    <b>خطا در کنترل ظرفیت خمشی:</b>
                    <p>${esc(error.message)}</p>
                </div>
            `;
        }
    }

    function createPanel() {
        if ($("flexurePanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "flexurePanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل مقدماتی ظرفیت خمشی اعضا</h3>
            </div>

            <div class="notice">
                محاسبه نسبت تقاضای لنگر خمشی به ظرفیت خمشی
                برآوردی برای ستون‌ها و رفترها.
            </div>

            <div class="button-grid">
                <button id="btnFlexure"
                    class="btn primary" type="button">
                    محاسبه کنترل ظرفیت خمشی
                </button>
            </div>

            <div id="flexureResults"></div>
        `;

        const shear = $("shearPanel");
        const interaction = $("interactionPanel");
        const design = $("memberDesignPanel");

        const anchor = shear || interaction || design;

        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(panel, anchor.nextSibling);
        } else {
            document.querySelector("main")?.appendChild(panel);
        }

        $("btnFlexure").addEventListener("click", calculate);
    }

    function init() {
        createPanel();
    }

    window.SteelFlexure = {
        calculate,
        getFlexuralCapacity
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
