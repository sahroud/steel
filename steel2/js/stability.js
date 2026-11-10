
/* SAHROUD STEEL - Compression Buckling Check
   Version 2.1
   Consistent axial compression sign with interaction module
   Units: N, m, Pa; displayed kN
*/
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
                کنترل مقدماتی کمانش خمشی حول دو محور،
                لاغری اعضا و ظرفیت فشاری طراحی.
            </div>

            <div class="button-grid">
                <button id="checkColumnBuckling" class="btn primary" type="button">
                    کنترل کمانش ستون
                </button>

                <button id="checkRafterBuckling" class="btn primary" type="button">
                    کنترل کمانش رفتر
                </button>

                <button id="checkCombinationBuckling" class="btn primary" type="button">
                    کنترل کمانش ترکیبات بار
                </button>
            </div>

            <div id="columnBucklingResults"></div>
            <div id="rafterBucklingResults"></div>
            <div id="combinationBucklingResults"></div>

            <div id="bucklingMessage" class="notice">
                برای شروع، اطلاعات مقاطع و ضرایب طول مؤثر را وارد کنید.
            </div>

            <div class="notice">
                هشدار: این کنترل فقط کمانش خمشی کلی و نیروی فشاری محوری
                را بررسی می‌کند. کمانش پیچشی و خمشی‌ـ‌پیچشی،
                لاغری موضعی اجزا، اثرات مرتبه دوم، اندرکنش کامل نیروها
                و طراحی اتصالات هنوز منظور نشده‌اند.
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

        $("checkColumnBuckling").addEventListener(
            "click",
            () => checkMember("column")
        );

        $("checkRafterBuckling").addEventListener(
            "click",
            () => checkMember("rafter")
        );

        $("checkCombinationBuckling").addEventListener(
            "click",
            checkCombinationBuckling
        );
    }

    function calculateAxis(E, Fy, A, I, L, K) {
        const r = Math.sqrt(I / A);

        if (!(r > 0)) {
            throw new Error("شعاع ژیراسیون معتبر نیست.");
        }

        const slenderness = K * L / r;

        const Fe =
            Math.PI * Math.PI * E /
            (slenderness * slenderness);

        const limit = 4.71 * Math.sqrt(E / Fy);

        const Fcr = slenderness <= limit
            ? Math.pow(0.658, Fy / Fe) * Fy
            : 0.877 * Fe;

        const Pn = Fcr * A;

        return {
            r,
            slenderness,
            Fe,
            Fcr,
            Pn,
            designCapacity: PHI_C * Pn,
            branch: slenderness <= limit
                ? "کمانش غیرالاستیک"
                : "کمانش الاستیک"
        };
    }

    function fmt(value, digits = 2) {
        const n = Number(value);

        if (!Number.isFinite(n)) return "—";

        return n.toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function getMemberCapacity(member) {
        if (!window.SteelSections || !window.SteelGirder) {
            throw new Error(
                "ماژول مقاطع یا تیرورق بارگذاری نشده است."
            );
        }

        const stability =
            window.SteelGirder.readStability(member);

        for (const key of ["Lx", "Ly", "Kx", "Ky"]) {
            if (
                stability[key] === null ||
                stability[key] === undefined ||
                !Number.isFinite(Number(stability[key])) ||
                Number(stability[key]) <= 0
            ) {
                throw new Error(
                    "چهار مقدار Lx، Ly، Kx و Ky مربوط به " +
                    (member === "column" ? "ستون" : "رفتر") +
                    " را کامل و معتبر وارد کنید."
                );
            }
        }

        const section = window.SteelSections.getDataSI();

        const material = section.material;
        const profile = section[member];

        const E = material.E;
        const Fy = material.Fy;

        const A = profile.A;
        const Ix = profile.Ix;
        const Iy = profile.Iy;

        if (!(E > 0 && Fy > 0 && A > 0 && Ix > 0 && Iy > 0)) {
            throw new Error(
                "مشخصات فولاد یا مقطع معتبر نیست."
            );
        }

        const x = calculateAxis(
            E, Fy, A, Ix,
            Number(stability.Lx),
            Number(stability.Kx)
        );

        const y = calculateAxis(
            E, Fy, A, Iy,
            Number(stability.Ly),
            Number(stability.Ky)
        );

        const controlling =
            x.designCapacity <= y.designCapacity ? x : y;

        return {
            x,
            y,
            controlling,
            controllingAxis:
                controlling === x ? "محور قوی" : "محور ضعیف",
            capacityKN: controlling.designCapacity / 1000
        };
    }

    function renderMemberResult(title, result) {
        const x = result.x;
        const y = result.y;
        const controlling = result.controlling;

        return `
            <hr>
            <h4>نتایج کنترل کمانش ${title}</h4>

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
                <p>
                    مقاومت فشاری طراحی حاکم:
                    ${fmt(controlling.designCapacity / 1000)} kN
                </p>
            </div>
        `;
    }

    function checkMember(member) {
        const title = member === "column" ? "ستون" : "رفتر";

        const outputId = member === "column"
            ? "columnBucklingResults"
            : "rafterBucklingResults";

        try {
            const result = getMemberCapacity(member);

            $(outputId).innerHTML =
                renderMemberResult(title, result);

            $("bucklingMessage").textContent =
                "محاسبه کمانش " + title + " انجام شد.";

            $("bucklingMessage").style.color = "#15803d";

        } catch (error) {
            $(outputId).innerHTML = "";
            $("bucklingMessage").textContent =
                "خطا: " + error.message;
            $("bucklingMessage").style.color = "#b45309";
        }
    }

    // قرارداد مشترک با ماژول اندرکنش:
    // N مثبت = فشار
    // N = -axialStart - localLoadX*x
    function axialForceAt(member, x) {
        const axialStart = Number(member.axialStart) || 0;
        const qx = Number(member.localLoadX) || 0;

        return -axialStart - qx * x;
    }

    function checkCombinationBuckling() {
        const output = $("combinationBucklingResults");

        try {
            const cases =
                window.SteelAnalysis &&
                window.SteelAnalysis.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error(
                    "ابتدا دکمه تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            const columnResult = getMemberCapacity("column");
            const rafterResult = getMemberCapacity("rafter");

            const members = {
                "ستون چپ": columnResult,
                "ستون راست": columnResult,
                "رفتر چپ": rafterResult,
                "رفتر راست": rafterResult
            };

            const demand = {};

            Object.keys(members).forEach(name => {
                demand[name] = {
                    value: 0,
                    combination: "—",
                    position: "—"
                };
            });

            cases.forEach(item => {
                (item.members || []).forEach(member => {
                    if (
                        !Object.prototype.hasOwnProperty.call(
                            demand,
                            member.name
                        )
                    ) return;

                    const L = Number(member.length);

                    if (!(Number.isFinite(L) && L > 0)) return;

                    // چون نیروی محوری تحت بار گسترده یکنواخت خطی است،
                    // بیشینه فشار در یکی از دو انتهای عضو رخ می‌دهد.
                    const stations = [
                        { x: 0, label: "ابتدا" },
                        { x: L, label: "انتها" }
                    ];

                    stations.forEach(station => {
                        const N = axialForceAt(member, station.x);
                        const compression = Math.max(0, N);

                        if (compression > demand[member.name].value) {
                            demand[member.name] = {
                                value: compression,
                                combination: item.name,
                                position: station.label
                            };
                        }
                    });
                });
            });

            const rows = Object.keys(members).map(name => {
                const result = members[name];
                const d = demand[name];

                const ratio = result.capacityKN > 0
                    ? d.value / result.capacityKN
                    : Infinity;

                const status = ratio <= 1
                    ? "قبول مقدماتی"
                    : "عدم کفایت مقدماتی";

                return `
                    <tr>
                        <td>${name}</td>
                        <td>${fmt(d.value)}</td>
                        <td>${fmt(result.x.slenderness, 1)}</td>
                        <td>${fmt(result.y.slenderness, 1)}</td>
                        <td>${result.controllingAxis}</td>
                        <td>${fmt(result.capacityKN)}</td>
                        <td>${fmt(ratio * 100, 1)}%</td>
                        <td>${status}</td>
                        <td>${d.combination}</td>
                        <td>${d.position}</td>
                    </tr>
                `;
            }).join("");

            output.innerHTML = `
                <hr>
                <h4>کنترل مقدماتی کمانش اعضا در ترکیبات بار LRFD ـ نسخه ۲.۱</h4>

                <p>
                    قرارداد علامت نیرو با ماژول اندرکنش یکسان شده است:
                    نیروی محوری مثبت به معنی فشار است.
                </p>

                <div style="overflow-x:auto">
                    <table style="
                        width:100%;
                        border-collapse:collapse;
                        min-width:1050px
                    ">
                        <thead>
                            <tr>
                                <th>عضو</th>
                                <th>بیشینه فشار N (kN)</th>
                                <th>لاغری محور قوی</th>
                                <th>لاغری محور ضعیف</th>
                                <th>محور حاکم</th>
                                <th>ظرفیت φPn (kN)</th>
                                <th>نسبت تقاضا/ظرفیت</th>
                                <th>نتیجه</th>
                                <th>ترکیب حاکم</th>
                                <th>محل</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="notice">
                    این جدول کنترل مقدماتی فشار محوری در برابر کمانش خمشی کلی است.
                    <p>لاغری‌ها بر اساس طول‌های مهارنشده و ضرایب K واردشده توسط کاربر محاسبه شده‌اند.</p>
                    <p>ظرفیت ستون‌های چپ و راست یکسان و ظرفیت رفترهای چپ و راست یکسان فرض شده است.</p>
                    <p>کنترل اندرکنش N-M، کمانش پیچشی، کمانش موضعی و اثرات مرتبه دوم در این جدول انجام نشده است.</p>
                    <p>نتیجه قبول مقدماتی، تأیید طراحی اجرایی یا ایمنی سازه نیست.</p>
                </div>
            `;

            $("bucklingMessage").textContent =
                "کنترل فشار محوری با قرارداد علامت یکسان برای تمام ترکیبات انجام شد.";

            $("bucklingMessage").style.color = "#15803d";

        } catch (error) {
            if (output) output.innerHTML = "";

            $("bucklingMessage").textContent =
                "خطا: " + error.message;

            $("bucklingMessage").style.color = "#b45309";
        }
    }

    function init() {
        createPanel();
    }

    window.SteelStability = {
        calculateAxis,
        getMemberCapacity,
        checkMember,
        checkCombinationBuckling
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
