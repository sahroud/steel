/* ===== steel2/js/sections.js ===== */
/* SAHROUD STEEL - Material and Section Properties 3.0 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function createPanel() {
        if ($("steelSectionsPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "steelSectionsPanel";

        function memberFields(prefix, title) {
            return `
                <hr>
                <h4>${title}</h4>
                <div class="form-grid">
                    <div class="field">
                        <label for="${prefix}Profile">نام مقطع</label>
                        <input id="${prefix}Profile" type="text"
                            placeholder="تیرورق یا IPE">
                    </div>
                    <div class="field">
                        <label for="${prefix}A">مساحت A (cm²)</label>
                        <input id="${prefix}A" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}Ix">ممان اینرسی Ix (cm⁴)</label>
                        <input id="${prefix}Ix" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}Iy">ممان اینرسی Iy (cm⁴)</label>
                        <input id="${prefix}Iy" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}SxTop">مدول مقطع بالا Sx (cm³)</label>
                        <input id="${prefix}SxTop" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}SxBottom">مدول مقطع پایین Sx (cm³)</label>
                        <input id="${prefix}SxBottom" type="number"
                            min="0" step="0.01" value="0">
                    </div>
                    <div class="field">
                        <label for="${prefix}Sy">مدول مقطع محور ضعیف Sy (cm³)</label>
                        <input id="${prefix}Sy" type="number"
                            min="0" step="0.01" value="0">
                    </div>
<div class="field">
                        <label for="${prefix}J3D">ثابت پیچشی J برای تحلیل سه‌بعدی (cm⁴)</label>
                        <input id="${prefix}J3D" type="number" min="0" step="0.01" placeholder="مقدار واقعی">
                    </div>
                </div>
            `;
        }

        panel.innerHTML = `
            <div class="panel-title">
                <h3>۴ ـ مشخصات مصالح و مقاطع فولادی</h3>
            </div>

            <div class="notice">
                مشخصات را از نقشه اجرایی یا مدارک معتبر کارخانه وارد کنید.
                مقادیر اولیه نمونه هستند و تأیید طراحی محسوب نمی‌شوند.
            </div>

            <h4>الف ـ مشخصات فولاد</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="steelGrade">گرید فولاد ساختمانی</label>
                    <select id="steelGrade">
                        <option value="" selected>انتخاب گرید از گواهی مصالح</option>
                        <option value="ST37-2">ST37-2</option>
                        <option value="ST52-3">ST52-3</option>
                        <option value="CUSTOM">سایر / مشخصات سفارشی</option>
                    </select>
                    <input id="steelGradeCustom" type="text" placeholder="نام دقیق گرید / استاندارد" style="display:none;margin-top:6px">
                    <small class="geometry-hint">گرید انتخابی برای فولاد نوردشده؛ برای ورق و مقاطع سردنورد، گواهی محصول ملاک است.</small>
                </div>
                <div class="field">
                    <label for="steelThickness">ضخامت مبنای کنترل خواص (mm)</label>
                    <input id="steelThickness" type="number" min="0.1" step="0.1" value="" placeholder="ضخامت واقعی ورق / مقطع">
                </div>
                <div class="field">
                    <label for="steelG">مدول برشی G (GPa)</label>
                    <input id="steelG" type="number" min="1" step="0.1" value="" placeholder="از مبنای مصالح">
                </div>
                <div class="field">
                    <label for="steelE">مدول الاستیسیته E (GPa)</label>
                    <input id="steelE" type="number"
                        min="1" step="1" value="" placeholder="از مشخصات مصالح">
                </div>
                <div class="field">
                    <label for="steelFy">تنش تسلیم Fy (MPa)</label>
                    <input id="steelFy" type="number" min="1" step="1" value="" placeholder="از استاندارد/گواهی">
                </div>
                <div class="field">
                    <label for="steelFu">مقاومت کششی نهایی Fu (MPa)</label>
                    <input id="steelFu" type="number" min="1" step="1" value="" placeholder="از استاندارد/گواهی">
                </div>
            </div>

            <div class="notice" id="steelGradeNotice">
                گرید و ضخامت واقعی محصول را انتخاب کنید. مقادیر مرجع استاندارد فقط پس از انتخاب صریح گرید/ضخامت نمایش داده می‌شوند و گواهی کارخانه بر آن‌ها مقدم است.
            </div>

            ${memberFields("column", "ب ـ مشخصات مقطع ستون‌ها")}
            ${memberFields("rafter", "ج ـ مشخصات مقطع رفترها")}

            <div class="notice">
                مشخصات ستون و رفتر در همین قسمت ثبت می‌شود. A و Iy در بخش اصلی هر عضو فقط یک‌بار وارد می‌شوند؛
                برای تحلیل سه‌بعدی، ممان قوی Ix به‌صورت خودکار به محور محلی z نگاشت می‌شود؛ فقط J را در همین‌جا تکمیل کنید.
                G نیز یک مقدار مشترک برای تمام گروه‌هاست.
            </div>

            <div class="button-grid">
                <button id="btnCheckSections"
                    class="btn primary" type="button">
                    کنترل اطلاعات مقاطع
                </button>
            </div>

            <div id="sectionMessage" class="notice">
                هنوز مشخصات مقاطع تکمیل نشده است.
            </div>
        `;

        const panels = document.querySelectorAll("main .panel");
        let inserted = false;

        panels.forEach(item => {
            const heading = item.querySelector("h3");

            if (!inserted && heading &&
                heading.textContent.includes("۵")) {
                item.parentNode.insertBefore(panel, item);
                inserted = true;
            }
        });

        if (!inserted) {
            const main = document.querySelector("main");
            if (main) main.appendChild(panel);
        }


        // مشخصات گروه‌های فرعی در همان پنل اصلی و در یک محل نگهداری می‌شوند.
        const extraGroups = [
            ["roofPurlin","پرلین سقف"],["wallGirt","قید افقی دیوار"],
            ["endPost","ستونک دیوار انتهایی"],["endGirt","تیر افقی دیوار انتهایی"],
            ["wallBrace","مهاربند دیوار"],["roofBrace","مهاربند سقف"],["roofEdge","تیر لبه سقف"]
        ];
        const extraHost=document.createElement("div");
        extraHost.id="extraSectionGroups";
        extraHost.innerHTML='<hr><h4>د ـ مشخصات مقاطع سایر اعضا</h4>'+
          '<div class="notice">هر گروه را باز کنید و مشخصات واقعی همان مقطع را فقط در همین قسمت وارد کنید.</div>'+
          extraGroups.map(([key,label])=>'<details class="sub-panel"><summary>'+label+'</summary><div class="form-grid">'+
            '<div class="field"><label for="p3_'+key+'_A">مساحت A (cm²)</label><input id="p3_'+key+'_A" type="number" min="0" step="0.01" placeholder="مقدار واقعی"></div>'+
            '<div class="field"><label for="p3_'+key+'_Iy">ممان اینرسی Iy (cm⁴)</label><input id="p3_'+key+'_Iy" type="number" min="0" step="0.01" placeholder="محور محلی y"></div>'+
            '<div class="field"><label for="p3_'+key+'_Iz">ممان اینرسی Iz (cm⁴)</label><input id="p3_'+key+'_Iz" type="number" min="0" step="0.01" placeholder="محور محلی z"></div>'+
            '<div class="field"><label for="p3_'+key+'_J">ثابت پیچشی J (cm⁴)</label><input id="p3_'+key+'_J" type="number" min="0" step="0.01" placeholder="مقدار واقعی"></div>'+
            '</div></details>').join('');
        const validationButtons=panel.querySelector(".button-grid");
        if(validationButtons) panel.insertBefore(extraHost,validationButtons);
        else panel.appendChild(extraHost);
        $("btnCheckSections").addEventListener("click", validate);
    }

    function readMember(prefix) {
        return {
            profile: $(prefix + "Profile").value.trim(),
            A_cm2: Number($(prefix + "A").value),
            Ix_cm4: Number($(prefix + "Ix").value),
            Iy_cm4: Number($(prefix + "Iy").value),
            SxTop_cm3: Number($(prefix + "SxTop").value),
            SxBottom_cm3: Number($(prefix + "SxBottom").value),
            Sy_cm3: Number($(prefix + "Sy").value)
        };
    }

    function read() {
        return {
            material: {
                grade: $("steelGrade").value==="CUSTOM" ? ($("steelGradeCustom")?.value.trim()||"CUSTOM") : $("steelGrade").value,
                thickness_mm: Number($("steelThickness")?.value),
                E_GPa: Number($("steelE").value),
                Fy_MPa: Number($("steelFy").value),
                Fu_MPa: Number($("steelFu")?.value)
            },
            column: readMember("column"),
            rafter: readMember("rafter"),
            analysis3d: {
                G_GPa: Number($("steelG")?.value),
                groups: Object.fromEntries(["column","rafter","roofPurlin","wallGirt","endPost","endGirt","wallBrace","roofBrace","roofEdge"].map(key=>{
                    if(key==="column"||key==="rafter"){
                        const m=key==="column"?readMember("column"):readMember("rafter");
                        return [key,{
                            A_cm2:m.A_cm2,
                            Iy_cm4:m.Iy_cm4,
                            Iz_cm4:m.Ix_cm4,
                            J_cm4:Number($(key+"J3D")?.value)
                        }];
                    }
                    return [key,{
                        A_cm2:Number($("p3_"+key+"_A")?.value),
                        Iy_cm4:Number($("p3_"+key+"_Iy")?.value),
                        Iz_cm4:Number($("p3_"+key+"_Iz")?.value),
                        J_cm4:Number($("p3_"+key+"_J")?.value)
                    }];
                }))
            }
        };
    }

    function convertMemberToSI(member) {
        return {
            profile: member.profile,
            A: member.A_cm2 * 1e-4,
            Ix: member.Ix_cm4 * 1e-8,
            Iy: member.Iy_cm4 * 1e-8,
            SxTop: member.SxTop_cm3 * 1e-6,
            SxBottom: member.SxBottom_cm3 * 1e-6,
            Sy: member.Sy_cm3 * 1e-6
        };
    }

    function getDataSI() {
        const d = read();

        return {
            material: {
                grade: d.material.grade,
                E: d.material.E_GPa * 1e9,
                Fy: d.material.Fy_MPa * 1e6,
                Fu: d.material.Fu_MPa * 1e6
            },
            column: convertMemberToSI(d.column),
            rafter: convertMemberToSI(d.rafter)
        };
    }

    function resolveAnalysis3DSection(member) {
        if (!member || typeof member !== "object") throw new Error("مشخصات عضو برای تخصیص مقطع سه‌بعدی معتبر نیست.");
        const key = String(member.sectionKey || "");
        if(member.craneIntegration===true){
            const s=member.analysisSection||{};
            const req=["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"];
            const missing=req.find(k=>!(Number.isFinite(Number(s[k]))&&Number(s[k])>0));
            if(missing)throw new Error("خاصیت "+missing+" برای عضو جرثقیل "+(member.id||"")+" ناقص است.");
            if(!String(s.source||"").trim())throw new Error("مرجع خواص مقطع عضو جرثقیل "+(member.id||"")+" ثبت نشده است.");
            return {E:Number(s.E_Pa),G:Number(s.G_Pa),A:Number(s.A_m2),Iy:Number(s.Iy_m4),Iz:Number(s.Iz_m4),J:Number(s.J_m4),sectionKey:key,sectionLabel:key==="craneRunwayGirder"?"تیر حمال جرثقیل":"براکت جرثقیل",profile:String(s.profile||"")};
        }
        const labels = {column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید افقی دیوار",endPost:"ستونک دیوار انتهایی",endGirt:"تیر افقی دیوار انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
        if (!Object.prototype.hasOwnProperty.call(labels,key)) throw new Error("گروه مقطع عضو " + (member.id || "") + " مشخص نیست؛ sectionKey=" + key);
        const d=read(), p=d.analysis3d?.groups?.[key], E=Number(d.material?.E_GPa), G=Number(d.analysis3d?.G_GPa);
        if (!(Number.isFinite(E)&&E>0)) throw new Error("مدول الاستیسیته E فولاد برای تحلیل سه‌بعدی معتبر نیست.");
        if (!(Number.isFinite(G)&&G>0)) throw new Error("مدول برشی G را در پنل مشخصات تکمیلی مقاطع وارد کنید.");
        if (!p) throw new Error("اطلاعات مقطع گروه " + labels[key] + " یافت نشد.");
        const required=[["A_cm2","مساحت A (cm²)"],["Iy_cm4","ممان اینرسی Iy (cm⁴)"],["Iz_cm4","ممان اینرسی Iz (cm⁴)"],["J_cm4","ثابت پیچشی J (cm⁴)"]];
        const missing=required.find(([field])=>!(Number.isFinite(Number(p[field]))&&Number(p[field])>0));
        if(missing) throw new Error("برای گروه " + labels[key] + "، مقدار " + missing[1] + " خالی یا نامعتبر است. مقدار واقعی مقطع را وارد کنید.");
        return {E:E*1e9,G:G*1e9,A:Number(p.A_cm2)*1e-4,Iy:Number(p.Iy_cm4)*1e-8,Iz:Number(p.Iz_cm4)*1e-8,J:Number(p.J_cm4)*1e-8,sectionKey:key,sectionLabel:labels[key],profile:key==="column"?d.column.profile:key==="rafter"?d.rafter.profile:""};
    }
    function setData(data) {
        if (!data || typeof data !== "object") return;

        const storedGrade=String(data.material?.grade||"ST37-2");
        // Keep EN S235/S275/S355 distinct from historical DIN ST37/ST52 grades.
        const normalizedGrade=/^ST\s*52(?:[- ]?3)?$/i.test(storedGrade)?"ST52-3":/^ST\s*37(?:[- ]?2)?$/i.test(storedGrade)?"ST37-2":"CUSTOM";
        const fields = {
            steelGrade: normalizedGrade,
            steelGradeCustom: normalizedGrade==="CUSTOM"?storedGrade:"",
            steelE: data.material?.E_GPa,
            steelFy: data.material?.Fy_MPa,
            steelFu: data.material?.Fu_MPa,
            steelThickness: data.material?.thickness_mm,

            columnProfile: data.column?.profile,
            columnA: data.column?.A_cm2,
            columnIx: data.column?.Ix_cm4,
            columnIy: data.column?.Iy_cm4,
            columnSxTop: data.column?.SxTop_cm3,
            columnSxBottom: data.column?.SxBottom_cm3,
            columnSy: data.column?.Sy_cm3,

            rafterProfile: data.rafter?.profile,
            rafterA: data.rafter?.A_cm2,
            rafterIx: data.rafter?.Ix_cm4,
            rafterIy: data.rafter?.Iy_cm4,
            rafterSxTop: data.rafter?.SxTop_cm3,
            rafterSxBottom: data.rafter?.SxBottom_cm3,
            rafterSy: data.rafter?.Sy_cm3
        };


        Object.entries(fields).forEach(([id, value]) => {
            const element = $(id);
            if (element && value !== undefined && value !== null) element.value = value;
        });
        if($("steelGradeCustom"))$("steelGradeCustom").style.display=normalizedGrade==="CUSTOM"?"block":"none";

        // داده‌های قدیمی سه‌بعدی پس از بازیابی فیلدهای اصلی، فقط خانه‌های خالی را تکمیل می‌کنند.
        if(data.analysis3d){
            const g=$("steelG");if(g&&data.analysis3d.G_GPa!==undefined)g.value=data.analysis3d.G_GPa;
            Object.entries(data.analysis3d.groups||{}).forEach(([key,p])=>{
                if(key==="column"||key==="rafter"){
                    const prefix=key;
                    // در پروژه‌های قدیمی، داده سه‌بعدی را فقط برای خانه‌های خالی منتقل کن.
                    const a=$(prefix+"A"),iy=$(prefix+"Iy");
                    if(a&&(!(Number(a.value)>0))&&p.A_cm2!==undefined)a.value=p.A_cm2;
                    if(iy&&(!(Number(iy.value)>0))&&p.Iy_cm4!==undefined)iy.value=p.Iy_cm4;
                    const j=$(prefix+"J3D");
                    if(j&&p.J_cm4!==undefined)j.value=p.J_cm4;
                }else{
                    for(const [prop,suffix] of [["A","A_cm2"],["Iy","Iy_cm4"],["Iz","Iz_cm4"],["J","J_cm4"]]){
                        const el=$("p3_"+key+"_"+prop);if(el&&p[suffix]!==undefined)el.value=p[suffix];
                    }
                }
            });
        }
    }

    function validate() {
        const d = read();
        const errors = [];
        let firstInvalid = null;

        function check(id, condition, message) {
            if (condition) return;

            errors.push(message);
            if (!firstInvalid) firstInvalid = $(id);
        }

        check("steelGrade", !!d.material.grade,
            "نوع فولاد را از گواهی یا استاندارد محصول انتخاب کنید.");
        if($("steelGrade")?.value==="CUSTOM")check("steelGradeCustom",!!$("steelGradeCustom")?.value.trim(),"نام دقیق گرید سفارشی را وارد کنید.");
        check("steelThickness",Number.isFinite(d.material.thickness_mm)&&d.material.thickness_mm>0,
            "ضخامت واقعی محصول فولادی برای تعیین خواص لازم است.");

        check("steelE",
            Number.isFinite(d.material.E_GPa) &&
            d.material.E_GPa > 0,
            "مدول الاستیسیته معتبر نیست.");

        check("steelFy",
            Number.isFinite(d.material.Fy_MPa) &&
            d.material.Fy_MPa > 0,
            "تنش تسلیم معتبر نیست.");
        check("steelFu",
            Number.isFinite(d.material.Fu_MPa) &&
            d.material.Fu_MPa >= d.material.Fy_MPa,
            "مقاومت کششی Fu باید معتبر و بزرگ‌تر یا مساوی Fy باشد.");

        function validateMember(prefix, member, title) {
            check(prefix + "Profile", !!member.profile,
                "نام مقطع " + title + " را وارد کنید.");

            const properties = [
                ["A_cm2", "A", "مساحت"],
                ["Ix_cm4", "Ix", "ممان اینرسی Ix"],
                ["Iy_cm4", "Iy", "ممان اینرسی Iy"],
                ["SxTop_cm3", "SxTop", "مدول مقطع بالایی Sx"],
                ["SxBottom_cm3", "SxBottom", "مدول مقطع پایینی Sx"],
                ["Sy_cm3", "Sy", "مدول مقطع محور ضعیف Sy"]
            ];

            properties.forEach(([key, suffix, label]) => {
                check(
                    prefix + suffix,
                    Number.isFinite(member[key]) && member[key] > 0,
                    label + " " + title + " معتبر نیست."
                );
            });
        }

        validateMember("column", d.column, "ستون");
        validateMember("rafter", d.rafter, "رفتر");

        const message = $("sectionMessage");

        if (message) {
            if (errors.length) {
                message.textContent =
                    "اطلاعات ناقص یا نامعتبر است: " + errors.join(" ");
                message.style.color = "#b45309";
            } else {
                message.textContent =
                    "اطلاعات مصالح و مشخصات هندسی مقاطع کامل است. " +
                    "صحت مقادیر باید با مدارک واقعی مقطع تطبیق داده شود.";
                message.style.color = "#15803d";
            }
        }

        if (firstInvalid) {
            firstInvalid.focus();
            firstInvalid.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        return errors.length === 0;
    }

    function validateForFrameAnalysis() {
        // تحلیل خطی قاب فقط به E، سطح مقطع A و ممان اینرسی خمشی Ix نیاز دارد.
        // نام مقطع، Fy، Iy و مدول‌های مقطع برای این مرحله ورودی اجباری نیستند.
        const d = read();
        const required = [
            ["steelE", d.material.E_GPa, "مدول الاستیسیته فولاد"],
            ["columnA", d.column.A_cm2, "مساحت مقطع ستون"],
            ["columnIx", d.column.Ix_cm4, "ممان اینرسی Ix ستون"],
            ["rafterA", d.rafter.A_cm2, "مساحت مقطع رفتر"],
            ["rafterIx", d.rafter.Ix_cm4, "ممان اینرسی Ix رفتر"]
        ];

        const missing = required.find(item =>
            !Number.isFinite(item[1]) || item[1] <= 0
        );

        const message = $("sectionMessage");
        if (missing) {
            if (message) {
                message.textContent = "برای تحلیل قاب، " + missing[2] +
                    " باید با مقدار معتبر و واحد درست وارد شود.";
                message.style.color = "#b45309";
            }
            const field = $(missing[0]);
            if (field) {
                field.focus();
                field.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return false;
        }

        if (message) {
            message.textContent = "ورودی‌های لازم برای تحلیل اولیه قاب کامل است؛ نام مقطع و سایر مشخصات برای کنترل‌های بعدی قابل تکمیل‌اند.";
            message.style.color = "#15803d";
        }
        return true;
    }

    function installAnalysisChecks() {
        const buttonIds = ["btnCalculate", "btnCombinations"];

        buttonIds.forEach(id => {
            const button = $(id);
            if (!button || button.dataset.sectionCheckInstalled) return;

            button.dataset.sectionCheckInstalled = "true";
            button.addEventListener("click", function (event) {
                if (!validateForFrameAnalysis()) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    const message = $("analysisMessage");
                    const sectionMessage = $("sectionMessage");
                    const explanation = sectionMessage ? sectionMessage.textContent : "ورودی‌های لازم برای تحلیل قاب ناقص است.";
                    if (message) {
                        message.textContent = "⛔ تحلیل شروع نشد: " + explanation;
                        message.style.color = "#b45309";
                        message.scrollIntoView({ behavior: "smooth", block: "center" });
                    }

                    const panel = $("steelSectionsPanel");
                    const details = panel && panel.querySelector("details");
                    if (details) details.open = true;
                    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, true);
        });
    }

    function getMaterialDefaults(grade,thicknessMm){
        const t=Number(thicknessMm);
        if(!(Number.isFinite(t)&&t>0))return {Fy_MPa:null,Fu_MPa:null,source:"ضخامت نامعتبر"};
        const bands=[
            {max:16,st37:235,st52:355},
            {max:40,st37:225,st52:345},
            {max:63,st37:215,st52:335},
            {max:80,st37:205,st52:325},
            {max:100,st37:195,st52:315}
        ];
        const b=bands.find(x=>t<=x.max);
        if(!b)return {Fy_MPa:null,Fu_MPa:null,source:"خارج از بازه مرجع؛ گواهی مصالح لازم است"};
        if(grade==="ST37-2")return {Fy_MPa:b.st37,Fu_MPa:340,FuRange_MPa:[340,470],source:"DIN 17100، St37-2 تاریخی؛ حداقل مقاومت تسلیم و حد پایین مقاومت کششی؛ پذیرش طبق پیوست ۱ مبحث ۱۰ و گواهی محصول باید کنترل شود"};
        if(grade==="ST52-3")return {Fy_MPa:b.st52,Fu_MPa:490,FuRange_MPa:[490,630],source:"DIN 17100، St52-3؛ حداقل مقاومت تسلیم و حد پایین مقاومت کششی؛ پذیرش طبق پیوست ۱ مبحث ۱۰ و گواهی محصول باید کنترل شود"};
        return {Fy_MPa:null,Fu_MPa:null,source:"گرید سفارشی؛ گواهی/استاندارد محصول لازم است"};
    }
    function applySteelGradeDefaults(){
        const grade=$("steelGrade"),thick=$("steelThickness"),fy=$("steelFy"),fu=$("steelFu"),note=$("steelGradeNotice"),custom=$("steelGradeCustom");
        if(!grade||!fy||!fu)return;
        if(custom)custom.style.display=grade.value==="CUSTOM"?"block":"none";
        const t=Number(thick?.value),g=grade.value,defaults=getMaterialDefaults(g,t);
        if(defaults.Fy_MPa!==null)fy.value=String(defaults.Fy_MPa);else fy.value="";
        if(defaults.Fu_MPa!==null)fu.value=String(defaults.Fu_MPa);else fu.value="";
        if(note){
            if(g==="CUSTOM")note.textContent="گرید سفارشی انتخاب شده است؛ نام دقیق فولاد و مقادیر Fy و Fu را از استاندارد محصول یا گواهی کارخانه وارد کنید.";
            else if(["ST37-2","ST52-3"].includes(g)&&!(Number.isFinite(t)&&t>0))note.textContent="برای تعیین Fy و Fu، ضخامت واقعی ورق/محصول را وارد کنید؛ تا آن زمان مقادیر مقاومت خالی می‌مانند و هیچ ضخامت پیش‌فرضی فرض نمی‌شود.";
            else note.textContent=defaults.source+(Number.isFinite(t)&&t>0?"؛ ضخامت "+t+" mm":"")+"، Fy="+(defaults.Fy_MPa??"نامشخص")+" MPa، Fu حداقل="+(defaults.Fu_MPa??"نامشخص")+" MPa (بازه کششی مرجع "+(defaults.FuRange_MPa?.join("–")||"نامشخص")+"). این اعداد جایگزین گواهی مصالح نیستند.";
        }
    }
    function installMaterialGradeControls(){
        $("steelGrade")?.addEventListener("change",applySteelGradeDefaults);
        $("steelThickness")?.addEventListener("change",()=>{if(["ST37-2","ST52-3"].includes($("steelGrade")?.value))applySteelGradeDefaults();});
        applySteelGradeDefaults();
    }
    function init() {
        createPanel();
        installMaterialGradeControls();
        installAnalysisChecks();
    }

    window.SteelSections = {
        read,
        getDataSI,
        getMaterialDefaults,
        getAnalysis3DProperties: function(){
            const d=read(),a=d.analysis3d||{};
            const toSI=(v,factor)=>Number.isFinite(v)&&v>0?v*factor:null;
            const groups={};
            Object.entries(a.groups||{}).forEach(([key,p])=>groups[key]={
                A:toSI(p.A_cm2,1e-4),
                Iy:toSI(p.Iy_cm4,1e-8),
                Iz:toSI(p.Iz_cm4,1e-8),
                J:toSI(p.J_cm4,1e-8)
            });
            return {G:Number.isFinite(a.G_GPa)&&a.G_GPa>0?a.G_GPa*1e9:null,groups};
        },
        resolveAnalysis3DSection,
        setData,
        validate,
        validateForFrameAnalysis,
        init
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

/* ===== steel2/js/section-geometry-audit.js ===== */
/* SAHROUD STEEL — geometric cross-check for prismatic symmetric welded I-sections.
 * Dimensions in mm; outputs in cm²/cm³/cm⁴. Sharp-corner idealization only.
 * Does not overwrite user section properties or certify tapered members.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const keys=[["column","ستون"],["rafter","رفتر"]];
let data={schemaVersion:1,groups:{}},last={};
const fields=[["d","ارتفاع کل d (mm)"],["bf","عرض بال bf (mm)"],["tw","ضخامت جان tw (mm)"],["tf","ضخامت بال tf (mm)"]];
function calculateISection(v){
 const d=Number(v.d),bf=Number(v.bf),tw=Number(v.tw),tf=Number(v.tf);
 if(![d,bf,tw,tf].every(x=>Number.isFinite(x)&&x>0))throw Error("همه ابعاد باید عدد مثبت باشند.");
 if(d<=2*tf||bf<=tw)throw Error("ابعاد نامعتبر است: باید d>2tf و bf>tw باشد.");
 const hw=d-2*tf;
 const A=2*bf*tf+hw*tw;
 const Ix=(bf*Math.pow(d,3)-(bf-tw)*Math.pow(hw,3))/12;
 const Iy=(2*tf*Math.pow(bf,3)+hw*Math.pow(tw,3))/12;
 const Sx=Ix/(d/2),Sy=Iy/(bf/2);
 const Zx=bf*tf*(d-tf)+tw*Math.pow(hw,2)/4;
 const Zy=bf*bf*tf/2+tw*tw*hw/4;
 const Aw=tw*hw;
 const flangeOutstandRatio=(bf-tw)/(2*tf),webDepthThicknessRatio=hw/tw;
 const J=(2*bf*Math.pow(tf,3)+hw*Math.pow(tw,3))/3;
 return {A_cm2:A/100,Ix_cm4:Ix/1e4,Iy_cm4:Iy/1e4,SxTop_cm3:Sx/1e3,SxBottom_cm3:Sx/1e3,Sy_cm3:Sy/1e3,Zx_cm3:Zx/1e3,Zy_cm3:Zy/1e3,Aw_cm2:Aw/100,flangeOutstandRatio,webDepthThicknessRatio,J_cm4:J/1e4,webHeight_mm:hw,assumptions:["مقطع I متقارن و منشوری","گوشه‌های تیز؛ بدون لحاظ شعاع نورد، پخ یا جوش","J برآورد نوارهای نازک باز؛ بدون ثابت تابیدگی Cw","برای رفتر متغیرالعمق/تیرورق شیبدار، این مدل به‌تنهایی کافی نیست"]};
}
function read(){
 keys.forEach(([k])=>{const row={};fields.forEach(([f])=>row[f]=$( "sga_"+k+"_"+f)?.value===""?null:Number($("sga_"+k+"_"+f)?.value));data.groups[k]=row;});
 return getData();
}
function getData(){return JSON.parse(JSON.stringify(data));}
function setData(v){if(!v||typeof v!=="object")return;data={schemaVersion:1,groups:{}};keys.forEach(([k])=>{const x=v.groups?.[k]||{};data.groups[k]={};fields.forEach(([f])=>data.groups[k][f]=x[f]===undefined||x[f]===null||x[f]===""?null:Number(x[f]));});render();}
function fmt(n,d=2){return Number(n).toLocaleString("fa-IR",{maximumFractionDigits:d});}
function compare(group,calc){
 const sec=window.SteelSections?.read?.(),ref=sec?.[group];if(!ref)return [];
 const pairs=[["A_cm2","A"],["Ix_cm4","Ix"],["Iy_cm4","Iy"],["SxTop_cm3","SxTop"],["SxBottom_cm3","SxBottom"],["Sy_cm3","Sy"]];
 return pairs.filter(([a])=>Number(ref[a])>0).map(([a,b])=>{const x=Number(ref[a]),y=calc[a];return {name:a,entered:x,calculated:y,deltaPct:(y-x)/x*100};});
}
function run(){
 read();const out=[];
 keys.forEach(([k,label])=>{try{const c=calculateISection(data.groups[k]);last[k]=c;const cmp=compare(k,c);out.push("<h4>"+label+"</h4><p>A="+fmt(c.A_cm2)+" cm² | Ix="+fmt(c.Ix_cm4)+" cm⁴ | Iy="+fmt(c.Iy_cm4)+" cm⁴</p><p>Sx="+fmt(c.SxTop_cm3)+" cm³ | Sy="+fmt(c.Sy_cm3)+" cm³ | Zx="+fmt(c.Zx_cm3)+" cm³ | Zy="+fmt(c.Zy_cm3)+" cm³</p><p>مساحت جان Aw="+fmt(c.Aw_cm2)+" cm² | نسبت پیشانی بال="+fmt(c.flangeOutstandRatio)+" | نسبت لاغری هندسی جان="+fmt(c.webDepthThicknessRatio)+" | J≈"+fmt(c.J_cm4)+" cm⁴</p>");if(cmp.length)out.push("<table class='data-table'><thead><tr><th>خاصیت</th><th>ثبت‌شده</th><th>محاسبه هندسی</th><th>اختلاف %</th></tr></thead><tbody>"+cmp.map(x=>"<tr><td>"+x.name+"</td><td>"+fmt(x.entered,3)+"</td><td>"+fmt(x.calculated,3)+"</td><td>"+fmt(x.deltaPct,2)+"</td></tr>").join("")+"</tbody></table>");else out.push("<p>خواص ثبت‌شده برای مقایسه موجود نیست.</p>");}catch(e){out.push("<h4>"+label+"</h4><p style='color:#b45309'>"+e.message+"</p>");}});
 const host=$("sectionGeometryAuditResults");if(host)host.innerHTML=out.join("")+"<div class='notice'>این محاسبه فقط خواص هندسی مقطع I متقارن منشوری شامل مدول پلاستیک هندسی، مساحت جان و نسبت‌های ابعادی را گزارش می‌کند. اختلاف خواص باید بررسی شود؛ هیچ مقداری خودکار جایگزین داده اصلی نمی‌شود. Zx و Zy به‌تنهایی ظرفیت خمشی نیستند و نسبت‌های هندسی نیز بدون ضوابط لاغری موضعی مبحث دهم، طبقه‌بندی مقطع محسوب نمی‌شوند. برای رفترهای متغیرعمق، مقاطع نامتقارن، ورق تقویتی و مقاطع سردنورد از این مدل استفاده نکنید.</div>";
 return {results:last};
}
function render(){
 const host=$("sectionGeometryAuditContent");if(!host)return;
 host.innerHTML="<div class='notice'>ابعاد مقطع I متقارن منشوری را بر حسب میلی‌متر وارد کنید. خروجی با خواص ثبت‌شده در پنل مقاطع مقایسه می‌شود؛ داده اصلی تغییر نمی‌کند.</div>"+
 keys.map(([k,label])=>"<details class='sub-panel' open><summary>"+label+" — هندسه مقطع I</summary><div class='form-grid'>"+fields.map(([f,l])=>"<div class='field'><label for='sga_"+k+"_"+f+"'>"+l+"</label><input id='sga_"+k+"_"+f+"' type='number' min='0' step='0.1' value='"+(data.groups[k]?.[f]??"")+"'></div>").join("")+"</div></details>").join("")+
 "<div class='button-grid'><button class='btn primary' type='button' id='btnSectionGeometryAudit'>محاسبه و مقایسه خواص</button></div><div id='sectionGeometryAuditResults'></div>";
 $("btnSectionGeometryAudit").addEventListener("click",run);
}
function init(){if($("sectionGeometryAuditPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="sectionGeometryAuditPanel";p.innerHTML="<div class='panel-title'><h3>کنترل مستقل هندسه مقاطع I</h3><span class='status'>ابزار تطبیق خواص</span></div><div id='sectionGeometryAuditContent'></div>";const anchor=$("steelSectionsPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);render();}
root.SteelSectionGeometry={calculateISection,getData,read,setData,run,getLast:()=>JSON.parse(JSON.stringify(last))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tapered-member-sections.js ===== */
/* SAHROUD STEEL — three-station tapered welded I-section model.
 * Station dimensions are linearly interpolated; the 3D solver receives a
 * piecewise-prismatic property set at each existing member-segment midpoint.
 * This is not an exact tapered-beam stiffness formulation or code check.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const GROUPS=[["column","ستون"],["rafter","رفتر"]];
const STATIONS=[["start","ابتدا"],["mid","میانه"],["end","انتها"]];
const DIMS=[["d","عمق d (mm)"],["bf","عرض بال bf (mm)"],["tw","ضخامت جان tw (mm)"],["tf","ضخامت بال tf (mm)"]];
let data={schemaVersion:1,segmentsPerMember:8,groups:{column:{enabled:false,stations:{}},rafter:{enabled:false,stations:{}}}};
let audit=[];
function clone(v){return JSON.parse(JSON.stringify(v));}
function normalize(v){
 const out={schemaVersion:1,segmentsPerMember:Math.max(2,Math.min(24,Math.floor(Number(v?.segmentsPerMember)||8))),groups:{}};
 GROUPS.forEach(([g])=>{
  const src=v?.groups?.[g]||{},stations={};
  STATIONS.forEach(([s])=>{stations[s]={};DIMS.forEach(([d])=>{const n=Number(src.stations?.[s]?.[d]);stations[s][d]=Number.isFinite(n)&&n>0?n:null;});});
  out.groups[g]={enabled:src.enabled===true,stations};
 });
 return out;
}
function calculate(v){
 const d=Number(v.d),bf=Number(v.bf),tw=Number(v.tw),tf=Number(v.tf);
 if(![d,bf,tw,tf].every(x=>Number.isFinite(x)&&x>0)||d<=2*tf||bf<=tw)throw Error("ابعاد مقطع I نامعتبر است؛ باید d>2tf و bf>tw باشد.");
 const hw=d-2*tf,A=2*bf*tf+hw*tw;
 const Ix=(bf*d**3-(bf-tw)*hw**3)/12;
 const Iy=(2*tf*bf**3+hw*tw**3)/12;
 const J=(2*bf*tf**3+hw*tw**3)/3;
 const Sx=Ix/(d/2),Sy=Iy/(bf/2),Aw=hw*tw;
 const h0=d-tf,Cw=Iy*h0*h0/4,Zpx=bf*tf*(d-tf)+tw*hw*hw/4,Zpy=tf*bf*bf/2+hw*tw*tw/4;
 return {A_cm2:A/100,Ix_cm4:Ix/1e4,Iy_cm4:Iy/1e4,J_cm4:J/1e4,Cw_cm6:Cw/1e6,
  SxTop_cm3:Sx/1000,SxBottom_cm3:Sx/1000,Sy_cm3:Sy/1000,Zpx_cm3:Zpx/1000,Zpy_cm3:Zpy/1000,Aw_cm2:Aw/100,
  flangeOutstand_mm:(bf-tw)/2,flangeOutstandRatio:(bf-tw)/(2*tf),webDepthThicknessRatio:hw/tw};
}
function interpolate(a,b,t){return a+(b-a)*t;}
function at(group,t){
 const g=data.groups[group];if(!g?.enabled)return null;
 const s=g.stations;
 const vals=STATIONS.map(([key])=>s[key]);
 vals.forEach((v,i)=>DIMS.forEach(([d])=>{if(!(Number(v[d])>0))throw Error("ابعاد "+(GROUPS.find(x=>x[0]===group)?.[1]||group)+" در ایستگاه "+STATIONS[i][1]+" ناقص است.");}));
 const x=Math.max(0,Math.min(1,t)),left=x<=0.5?vals[0]:vals[1],right=x<=0.5?vals[1]:vals[2],f=x<=0.5?x*2:(x-0.5)*2;
 const dims={};DIMS.forEach(([d])=>dims[d]=interpolate(Number(left[d]),Number(right[d]),f));
 return {...calculate(dims),dimensions:dims,stationCoordinate:x};
}
function coordinate(group,member,nodes,project){
 const byId=new Map((nodes||[]).map(n=>[String(n.id),n]));
 const a=byId.get(String(member.start)),b=byId.get(String(member.end));
 if(!a||!b)throw Error("مختصات عضو برای تعیین ایستگاه مقطع پیدا نشد.");
 const x=(a.x+b.x)/2,y=(a.y+b.y)/2,span=Number(project?.span),height=Number(project?.height);
 if(group==="column"){
  if(!(height>0))throw Error("ارتفاع ستون پروژه معتبر نیست.");
  return Math.max(0,Math.min(1,y/height));
 }
 if(!(span>0))throw Error("دهانه پروژه معتبر نیست.");
 const half=span/2;
 return Math.max(0,Math.min(1,x<=half?x/half:(span-x)/half));
}
function segmentModel(model,project,segmentsPerMember){
 const count=Math.max(2,Math.min(24,Math.floor(Number(segmentsPerMember)||data.segmentsPerMember||8)));
 const original=Array.isArray(model?.members)?model.members:[];
 const nodes=Array.isArray(model?.nodes)?model.nodes:[];
 const byId=new Map(nodes.map(n=>[String(n.id),n]));
 const output=[],addedNodes=[];
 const usedMemberIds=new Set(original.map(m=>String(m.id)));
 let splitMembers=0,generatedSegments=0;
 original.forEach(member=>{
  const group=member?.sectionKey;
  if(!GROUPS.some(([g])=>g===group)||!data.groups[group]?.enabled){output.push(member);return;}
  const a=byId.get(String(member.start)),b=byId.get(String(member.end));
  if(!a||!b)throw Error("عضو متغیرمقطع "+member.id+" به گره ابتدا/انتها متصل نیست؛ تحلیل با هندسه ناقص متوقف شد.");
  if(![a.x,a.y,a.z,b.x,b.y,b.z].every(v=>Number.isFinite(Number(v))))throw Error("مختصات عضو متغیرمقطع "+member.id+" نامعتبر است.");
  at(group,0);at(group,0.5);at(group,1);
  // Divide each physical member into equal-length analysis elements. A segment's
  // section is evaluated at its own midpoint by resolveForMember().
  const localNodes=[a];
  for(let i=1;i<count;i++){
   const t=i/count,id=String(member.id)+"_TAPER_N"+i;
   if(byId.has(id))throw Error("شناسه گره تقسیم مقطع متغیر تکراری است: "+id);
   const n={id,x:interpolate(Number(a.x),Number(b.x),t),y:interpolate(Number(a.y),Number(b.y),t),z:interpolate(Number(a.z),Number(b.z),t),kind:"taper-analysis"};
   localNodes.push(n);addedNodes.push(n);byId.set(id,n);
  }
  localNodes.push(b);
  for(let i=0;i<count;i++){
   const first=i===0,last=i===count-1;
   const pieceId=String(member.id)+"_TAPER_"+String(i+1).padStart(2,"0");
   if(usedMemberIds.has(pieceId))throw Error("شناسه عضو تقسیم‌شده تکراری است: "+pieceId);
   usedMemberIds.add(pieceId);
   const piece={
    ...member,id:pieceId,
    start:localNodes[i].id,end:localNodes[i+1].id,
    length:Math.hypot(localNodes[i+1].x-localNodes[i].x,localNodes[i+1].y-localNodes[i].y,localNodes[i+1].z-localNodes[i].z),
    parentMemberId:String(member.id),taperSegmentIndex:i+1,taperSegmentCount:count
   };
   if(member.endReleases)piece.endReleases={i:first?(member.endReleases.i||[]):[],j:last?(member.endReleases.j||[]):[]};
   if(member.endOffsets)piece.endOffsets={i:first?(member.endOffsets.i||[0,0,0]):[0,0,0],j:last?(member.endOffsets.j||[0,0,0]):[0,0,0]};
   delete piece.analysisLoad;delete piece.taperApplied;delete piece.taperCoordinate;delete piece.taperProperties;
   output.push(piece);generatedSegments++;
  }
  splitMembers++;
 });
 return {model:{...model,nodes:nodes.concat(addedNodes),members:output},audit:{enabledGroups:GROUPS.filter(([g])=>data.groups[g].enabled).map(([g])=>g),originalMemberCount:original.length,splitMemberCount:splitMembers,generatedSegmentCount:generatedSegments,addedNodeCount:addedNodes.length,segmentsPerMember:count,note:"تقسیم‌بندی خطی برای تقریب سختی متغیرمقطع؛ نیازمند آزمون همگرایی و اعتبارسنجی با مدل مرجع است."}};
}
function resolveForMember(member,nodes,project,base){
 const group=member?.sectionKey;
 if(!GROUPS.some(([g])=>g===group)||!data.groups[group]?.enabled)return {section:base,applied:false};
 const t=coordinate(group,member,nodes,project),p=at(group,t);
 // Solver local bending convention: Iz is the major-axis inertia for the
 // current frame-section orientation; Iy is the weak-axis inertia.
 const section={...base,A:p.A_cm2*1e-4,Iy:p.Iy_cm4*1e-8,Iz:p.Ix_cm4*1e-8,J:p.J_cm4*1e-8,
  profile:(base.profile||group)+" / tapered@"+t.toFixed(3),tapered:true,taperCoordinate:t,taperDimensions:p.dimensions};
 return {section,applied:true,coordinate:t,properties:p};
}
function read(){
 const countEl=$("taper_segmentsPerMember");if(countEl)data.segmentsPerMember=Math.max(2,Math.min(24,Math.floor(Number(countEl.value)||8)));
 GROUPS.forEach(([g])=>{
  const enabled=$("taper_"+g+"_enabled");data.groups[g].enabled=!!enabled?.checked;
  STATIONS.forEach(([s])=>DIMS.forEach(([d])=>{
   const el=$("taper_"+g+"_"+s+"_"+d),n=el?Number(el.value):NaN;
   data.groups[g].stations[s][d]=Number.isFinite(n)&&n>0?n:null;
  }));
 });
 return getData();
}
function getData(){return clone(data);}
function setData(v){data=normalize(v);render();}
function render(){
 const host=$("taperedSectionsContent");if(!host)return;
 host.innerHTML="<div class='field'><label for='taper_segmentsPerMember'>تعداد قطعات تحلیل برای هر عضو متغیرمقطع</label><select id='taper_segmentsPerMember'>"+[4,6,8,12,16,20,24].map(n=>"<option value='"+n+"' "+(data.segmentsPerMember===n?"selected":"")+">"+n+" قطعه</option>").join("")+"</select></div>"+GROUPS.map(([g,label])=>{
  const q=data.groups[g];
  return '<details class="sub-panel" open><summary>'+label+' — تیرورق متغیرعمق</summary><label><input type="checkbox" id="taper_'+g+'_enabled" '+(q.enabled?'checked':'')+'> اعمال مقطع متغیر در تحلیل سه‌بعدی</label><div class="notice">سه ایستگاه هندسی با درون‌یابی خطی: ستون از پای ستون به بالا و رفتر از لبه بام به تاج؛ این جهت‌گذاری مستقل از ترتیب گره‌های ابتدا/انتهای عضو است. نسبت‌های خروج بال و لاغری جان صرفاً هندسی‌اند و به‌تنهایی تأیید لاغری موضعی آیین‌نامه‌ای نیستند.</div><div class="form-grid">'+STATIONS.map(([s,sl])=>DIMS.map(([d,dl])=>'<div class="field"><label for="taper_'+g+'_'+s+'_'+d+'">'+sl+' — '+dl+'</label><input type="number" min="0" step="0.1" id="taper_'+g+'_'+s+'_'+d+'" value="'+(q.stations[s][d]??'')+'"></div>').join('')).join('')+'</div></details>';
 }).join('')+'<div class="button-grid"><button class="btn secondary" type="button" id="btnTaperAudit">کنترل هندسه و ایستگاه‌های مقطع</button></div><div id="taperedSectionsResults"></div>';
 $("btnTaperAudit").addEventListener("click",runAudit);
 const candidate=document.createElement("div");candidate.className="sub-panel";candidate.innerHTML="<h4>غربال اولیه ضخامت جان و بال</h4><div class='form-grid'><div class='field'><label for='taperCandidateGroup'>عضو</label><select id='taperCandidateGroup'><option value='rafter'>رفتر</option><option value='column'>ستون</option></select></div></div><button class='btn secondary' type='button' id='btnTaperCandidates'>بررسی ۱۶ ترکیب ضخامت ۶، ۸، ۱۰ و ۱۲ میلی‌متر</button><div id='taperThicknessCandidates'></div>";
 host.appendChild(candidate);
 $("btnTaperCandidates").addEventListener("click",()=>{try{runThicknessCandidates();}catch(e){$("taperThicknessCandidates").textContent="توقف بررسی: "+(e?.message||String(e));}});
}
function buildThicknessCandidates(group){
 read();
 if(!GROUPS.some(([g])=>g===group)||!data.groups[group]?.enabled)throw Error("ابتدا مقطع متغیر گروه موردنظر را فعال کنید.");
 const source=STATIONS.map(([key])=>data.groups[group].stations[key]);
 source.forEach((s,i)=>{if(["d","bf"].some(k=>!(Number(s[k])>0)))throw Error("عمق و عرض بال در هر سه ایستگاه باید وارد شود؛ ایستگاه "+(i+1));});
 const sizes=[6,8,10,12],rows=[],rejected=[];
 sizes.forEach(tw=>sizes.forEach(tf=>{
  try{
   const stations=source.map((s,i)=>({label:STATIONS[i][1],dimensions:{d:Number(s.d),bf:Number(s.bf),tw,tf},...calculate({d:s.d,bf:s.bf,tw,tf})}));
   const areas=stations.map(x=>x.A_cm2*100),meanArea=(areas[0]+4*areas[1]+areas[2])/6;
   rows.push({tw,tf,stations,meanArea_mm2:meanArea,mass_kg_per_m:meanArea*0.00785});
  }catch(error){rejected.push({tw,tf,reason:error?.message||String(error)});}
 }));
 rows.sort((a,b)=>a.mass_kg_per_m-b.mass_kg_per_m);
 if(!rows.length)throw Error("هیچ ترکیب ضخامت معتبری با ابعاد واردشده سازگار نیست.");
 return {group,rows,rejected,scope:"هندسه و جرم تقریبی بر متر؛ بدون کنترل مقاومت، کمانش، خیز، جوش، سخت‌کننده یا تأیید آیین‌نامه‌ای."};
}
function runThicknessCandidates(){
 const group=$("taperCandidateGroup")?.value||"rafter",result=buildThicknessCandidates(group),host=$("taperThicknessCandidates");
 host.innerHTML="<div class='notice'>"+result.rows.length+" ترکیب معتبر از ۱۶ حالت بررسی شد؛ "+result.rejected.length+" ترکیب به علت ناسازگاری ابعادی کنار گذاشته شد. این جدول فقط غربال اولیه هندسی/وزنی است و هیچ ترکیبی را از نظر فنی قبول یا پیشنهاد طراحی نمی‌کند.</div><div style='overflow-x:auto'><table class='data-table'><thead><tr><th>رتبه وزنی</th><th>جان (mm)</th><th>بال (mm)</th><th>جرم تقریبی (kg/m)</th><th>عمق ابتدا/میانه/انتها (mm)</th></tr></thead><tbody>"+result.rows.map((x,i)=>"<tr><td>"+(i+1)+"</td><td>"+x.tw+"</td><td>"+x.tf+"</td><td>"+x.mass_kg_per_m.toFixed(2)+"</td><td>"+x.stations.map(s=>Number(s.dimensions.d).toFixed(0)).join(" / ")+"</td></tr>").join("")+"</tbody></table></div><p class='notice'>کمترین جرم به معنی گزینه مناسب طراحی نیست. مرحله بعدی باید همین گزینه‌ها را با نیروهای واقعی هر ترکیب بار و کنترل‌های آیین‌نامه‌ای بررسی کند.</p>";
 return result;
}
function runAudit(){
 read();const rows=[];
 GROUPS.forEach(([g,label])=>{
  if(!data.groups[g].enabled){rows.push("<p>"+label+": غیرفعال</p>");return;}
  try{
   const items=STATIONS.map(([s,sl])=>({label:sl,...calculate(data.groups[g].stations[s])}));
   rows.push("<h4>"+label+"</h4><table class='data-table'><thead><tr><th>ایستگاه</th><th>A (cm²)</th><th>Ix (cm⁴)</th><th>Iy (cm⁴)</th><th>J تقریبی (cm⁴)</th><th>Sx (cm³)</th><th>Sy (cm³)</th><th>Aw (cm²)</th><th>خروج بال</th><th>لاغری جان</th></tr></thead><tbody>"+items.map(x=>"<tr><td>"+x.label+"</td><td>"+x.A_cm2.toFixed(2)+"</td><td>"+x.Ix_cm4.toFixed(2)+"</td><td>"+x.Iy_cm4.toFixed(2)+"</td><td>"+x.J_cm4.toFixed(2)+"</td><td>"+x.SxTop_cm3.toFixed(2)+"</td><td>"+x.Sy_cm3.toFixed(2)+"</td><td>"+x.Aw_cm2.toFixed(2)+"</td><td>"+x.flangeOutstandRatio.toFixed(2)+"</td><td>"+x.webDepthThicknessRatio.toFixed(2)+"</td></tr>").join("")+"</tbody></table>");
  }catch(e){rows.push("<p style='color:#b45309'>"+label+": "+e.message+"</p>");}
 });
 $("taperedSectionsResults").innerHTML=rows.join("")+"<div class='notice'>تحلیل فعلی برای هر قطعه هندسی موجود، خواص مقطع متناظر با نقطه میانی را ثابت فرض می‌کند. بنابراین تقریب قطعه‌ای است، نه ماتریس سختی دقیق عضو با تغییر پیوسته مقطع. برای دقت بیشتر باید تقسیم‌بندی عضو در محل تغییرات عمق ریزتر شود و فرمول سختی تیرورق متغیرمقطع اعتبارسنجی شود.</div>";
 return {rows};
}
function selfTest(){
 const tests=[];
 const c=calculate({d:300,bf:150,tw:8,tf:12});
 tests.push({name:"positive-properties",pass:c.A_cm2>0&&c.Ix_cm4>c.Iy_cm4&&c.J_cm4>0});
 tests.push({name:"warping-plastic-and-shear-properties",pass:c.Cw_cm6>0&&c.Zpx_cm3>c.SxTop_cm3&&c.Aw_cm2>0&&c.flangeOutstand_mm>0});
 const q=normalize({groups:{rafter:{enabled:true,stations:{start:{d:500,bf:200,tw:8,tf:12},mid:{d:400,bf:200,tw:8,tf:12},end:{d:300,bf:200,tw:8,tf:12}}}}});
 const old=data;data=q;const mid=at("rafter",0.5);data=old;
 tests.push({name:"mid-station-interpolation",pass:Math.abs(mid.dimensions.d-400)<1e-9});
 tests.push({name:"disabled-by-default",pass:normalize({}).groups.column.enabled===false});
 tests.push({name:"analysis-segment-count-default",pass:normalize({}).segmentsPerMember===8});
 const oldData=data;data=normalize({groups:{column:{enabled:true,stations:{start:{d:500,bf:200,tw:10,tf:16},mid:{d:400,bf:200,tw:10,tf:16},end:{d:300,bf:200,tw:10,tf:16}}}}});
 const sourceModel={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:6,z:0}],members:[{id:"C1",start:"A",end:"B",sectionKey:"column",lineLoads:{dead:2},endReleases:{i:[4],j:[5]}}]};
 const segmented=segmentModel(sourceModel,{height:6,span:12},8);
 tests.push({name:"piecewise-member-segmentation",pass:segmented.audit.generatedSegmentCount===8&&segmented.audit.addedNodeCount===7&&segmented.model.members[0].endReleases.i[0]===4&&segmented.model.members[7].endReleases.j[0]===5&&segmented.model.members.every(m=>m.lineLoads.dead===2)});
 let missingNodeRejected=false;try{segmentModel({nodes:[{id:"A",x:0,y:0,z:0}],members:[{id:"BAD",start:"A",end:"MISSING",sectionKey:"column"}]},{height:6,span:12},8);}catch(e){missingNodeRejected=e.message.includes("گره ابتدا/انتها");}
 tests.push({name:"missing-taper-endpoint-rejected",pass:missingNodeRejected});
 let duplicateMemberRejected=false;try{segmentModel({nodes:sourceModel.nodes,members:[...sourceModel.members,{id:"C1_TAPER_01",start:"A",end:"B",sectionKey:"other"}]},{height:6,span:12},8);}catch(e){duplicateMemberRejected=e.message.includes("شناسه عضو تقسیم‌شده تکراری");}
 tests.push({name:"generated-member-id-collision-rejected",pass:duplicateMemberRejected});
 const first=segmented.model.members[0],last=segmented.model.members[7],base={E:200e9,G:77e9,A:0.01,Iy:1e-5,Iz:1e-4,J:1e-6};
 const pFirst=resolveForMember(first,segmented.model.nodes,{height:6,span:12},base),pLast=resolveForMember(last,segmented.model.nodes,{height:6,span:12},base);
 tests.push({name:"section-properties-vary-along-member",pass:pFirst.applied&&pLast.applied&&pFirst.coordinate<pLast.coordinate&&pFirst.section.A!==pLast.section.A});
 data=oldData;
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests};
}
function init(){
 if($("taperedSectionsPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="taperedSectionsPanel";p.setAttribute("data-focus-group","tapered");
 p.innerHTML="<div class='panel-title'><h3>مقاطع تیرورق متغیرعمق ستون و رفتر</h3><span class='status'>سه ایستگاه هندسی</span></div><div class='notice'>این ابزار برای مقاطع جوشی I با جان و بال‌های مستطیلی است. شعاع گوشه، جوش، سخت‌کننده، ورق مضاعف، تغییر ناگهانی مقطع و اثرات موضعی در خواص هندسی منظور نشده‌اند. تا زمان ورود داده، حالت متغیر غیرفعال است و مقاطع فعلی پروژه تغییر نمی‌کنند.</div><div id='taperedSectionsContent'></div>";
 const anchor=$("sectionGeometryAuditPanel")||$("steelSectionsPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 render();
 const params=new URLSearchParams(window.location.search);
 if(params.get("focus")==="tapered"){
  document.body.classList.add("focus-mode");
  document.querySelectorAll("[data-focus-group]").forEach(function(panel){panel.classList.remove("focus-visible");});
  p.classList.add("focus-visible");
  const nav=document.getElementById("focusWorkspaceNav");
  if(nav){nav.querySelectorAll("[data-focus-link]").forEach(function(link){link.removeAttribute("aria-current");});const active=nav.querySelector('[data-focus-link="tapered"]');if(active)active.setAttribute("aria-current","page");}
  const caption=document.getElementById("focusWorkspaceCaption");if(caption)caption.textContent="حالت نمایش متمرکز: مقاطع متغیر و غربال ضخامت؛ برای بازگشت، «نمایش همه بخش‌ها» را انتخاب کنید.";
  window.setTimeout(function(){p.scrollIntoView({behavior:"auto",block:"start"});},100);
 }
}
root.SteelTaperedSections={calculate,at,segmentModel,resolveForMember,getData,read,setData,runAudit,buildThicknessCandidates,runThicknessCandidates,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tapered-member-force-audit.js ===== */
(function(root){
"use strict";
const forceKeys=["Fx_i","Fy_i","Fz_i","Mx_i","My_i","Mz_i","Fx_j","Fy_j","Fz_j","Mx_j","My_j","Mz_j"];
function audit(result){
 const issues=[],members=Array.isArray(result?.members)?result.members:[];
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 if(!tapered.length)return {success:true,status:"no-tapered-members",physicalMemberCount:0,analysisElementCount:0,issues,rows:[],analysisEnabled:false,designApproved:false};
 const groups=new Map();
 for(const m of tapered){
  const parent=String(m.parentMemberId||"");
  if(!parent){issues.push("قطعه "+String(m.id)+" شناسه عضو فیزیکی والد ندارد.");continue;}
  const g=groups.get(parent)||{parentMemberId:parent,declaredCount:Number(m.taperSegmentCount),segments:[]};
  if(!Number.isInteger(g.declaredCount)||g.declaredCount<2)issues.push("تعداد قطعات اعلام‌شده برای "+parent+" نامعتبر است.");
  if(Number(m.taperSegmentCount)!==g.declaredCount)issues.push("تعداد قطعات در عضو "+parent+" یکسان نیست.");
  g.segments.push(m);groups.set(parent,g);
 }
 const rows=[];
 for(const g of groups.values()){
  const seen=new Set();
  for(const m of g.segments){
   const index=Number(m.taperSegmentIndex);
   if(!Number.isInteger(index)||index<1||index>g.declaredCount)issues.push("شماره قطعه "+String(m.id)+" خارج از بازه است.");
   if(seen.has(index))issues.push("شماره قطعه تکراری در عضو "+g.parentMemberId+": "+index);
   seen.add(index);
   if(!Number.isFinite(Number(m.taperCoordinate))||m.taperCoordinate<0||m.taperCoordinate>1)issues.push("مختصات نسبی مقطع در "+String(m.id)+" نامعتبر است.");
   const d=m.taperDimensions||m.taperProperties?.dimensions;
   if(!d||["d","bf","tw","tf"].some(k=>!(Number.isFinite(Number(d[k]))&&Number(d[k])>0)))issues.push("ابعاد مقطع ایستگاه برای "+String(m.id)+" ناقص است.");
   const s=m.section||{};
   for(const k of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(Number(s[k]))&&Number(s[k])>0))issues.push("خاصیت "+k+" در قطعه "+String(m.id)+" معتبر نیست.");
   const f=Array.isArray(m.localEndForces)?m.localEndForces:[];
   if(f.length!==12||f.some(v=>!Number.isFinite(Number(v))))issues.push("بردار نیروهای دو انتهای قطعه "+String(m.id)+" کامل نیست.");
   if(!Array.isArray(m.analysisLoad?.uniformLocal)||m.analysisLoad.uniformLocal.length!==3||m.analysisLoad.uniformLocal.some(v=>!Number.isFinite(Number(v))))issues.push("بار محلی عضو "+String(m.id)+" ثبت نشده است.");
  }
  for(let i=1;i<=g.declaredCount;i++)if(!seen.has(i))issues.push("قطعه "+i+" از عضو "+g.parentMemberId+" در نتیجه تحلیل وجود ندارد.");
  const ordered=g.segments.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex));
  rows.push({parentMemberId:g.parentMemberId,declaredSegmentCount:g.declaredCount,reportedSegmentCount:g.segments.length,segmentIndices:ordered.map(m=>Number(m.taperSegmentIndex)),stationCoordinates:ordered.map(m=>Number(m.taperCoordinate)),complete:seen.size===g.declaredCount&&g.segments.length===g.declaredCount});
 }
 return {success:issues.length===0,status:issues.length?"incomplete":"demand-trace-complete",physicalMemberCount:groups.size,analysisElementCount:tapered.length,issues,rows,forceComponents:forceKeys,scope:"Per-analysis-case traceability of tapered member segments and simultaneous 12-component end forces. No resistance, stability, convergence or code approval is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const seg=(id,i)=>({id,parentMemberId:"R1",taperSegmentIndex:i,taperSegmentCount:2,taperApplied:true,taperCoordinate:(i-.5)/2,taperDimensions:{d:500-i*50,bf:200,tw:8,tf:12},section:{E:2e11,G:7.7e10,A:.01,Iy:1e-5,Iz:1e-4,J:1e-6},localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0]}});
 const good=audit({members:[seg("R1_TAPER_01",1),seg("R1_TAPER_02",2)]});
 const missing=audit({members:[seg("R1_TAPER_01",1)]});
 const duplicate=audit({members:[seg("R1_TAPER_01",1),seg("R1_TAPER_02",1)]});
 const bad=seg("R1_TAPER_02",2);bad.localEndForces=[0];
 const malformed=audit({members:[seg("R1_TAPER_01",1),bad]});
 const checks=[good.success&&good.physicalMemberCount===1&&good.analysisElementCount===2,!missing.success,!duplicate.success,!malformed.success,!good.designApproved&&!good.analysisEnabled];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelTaperedMemberForceAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tapered-member-design-readiness.js ===== */
/* SAHROUD STEEL — tapered-member design readiness gate.
 * Verifies segment geometry, simultaneous load-case forces and required inputs.
 * No strength, buckling, interaction, deflection or code approval is calculated.
 */
(function(root){
"use strict";
const POSITIVE=["Fy_MPa","Fu_MPa","E_MPa","G_MPa","Kx","Ky","Kz","Lx_mm","Ly_mm","Lz_mm","Lb_mm"];
const BOOLEAN=["localSlendernessReviewed","restraintLayoutVerified","connectionDesignInputsVerified","serviceabilityCasesProvided"];
function positive(v){return Number.isFinite(Number(v))&&Number(v)>0;}
function audit(input){
 const src=input||{},issues=[],warnings=[],members=Array.isArray(src.members)?src.members:[],cases=Array.isArray(src.loadCases)?src.loadCases:[];
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null)),groups=new Map();
 if(!tapered.length)issues.push("هیچ قطعه متغیرمقطع معتبری برای ممیزی دریافت نشد.");
 tapered.forEach(m=>{
  const parent=String(m.parentMemberId||"");
  if(!parent){issues.push("قطعه "+String(m.id)+" شناسه عضو فیزیکی والد ندارد.");return;}
  const count=Number(m.taperSegmentCount),idx=Number(m.taperSegmentIndex);
  if(!Number.isInteger(count)||count<2||!Number.isInteger(idx)||idx<1||idx>count)issues.push("شماره/تعداد قطعات عضو "+parent+" نامعتبر است.");
  const g=groups.get(parent)||{parentMemberId:parent,count,segments:[]};
  if(g.count!==count)issues.push("تعداد قطعات عضو "+parent+" بین قطعات یکسان نیست.");
  if(g.segments.some(x=>Number(x.taperSegmentIndex)===idx))issues.push("شماره قطعه تکراری در عضو "+parent+": "+idx);
  g.segments.push(m);groups.set(parent,g);
 });
 const memberInputs=src.memberInputs||{},memberRows=[],caseLabels=new Set();
 cases.forEach(c=>{const label=String(c?.label||"");if(!label||caseLabels.has(label))issues.push("شناسه ترکیب بار خالی یا تکراری است: "+label);caseLabels.add(label);if(c?.equilibrium?.ok!==true)issues.push("تعادل ترکیب "+(label||"(بدون شناسه)")+" صریحاً موفق اعلام نشده است.");});
 for(const g of groups.values()){
  const ordered=g.segments.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex)),seen=new Set(ordered.map(m=>Number(m.taperSegmentIndex)));
  for(let i=1;i<=g.count;i++)if(!seen.has(i))issues.push("قطعه "+i+" از عضو "+g.parentMemberId+" مفقود است.");
  ordered.forEach(m=>{
   const d=m.taperDimensions||m.taperProperties?.dimensions;
   if(!d||["d","bf","tw","tf"].some(k=>!positive(d[k])))issues.push("ابعاد مقطع در قطعه "+String(m.id)+" ناقص است.");
   else if(Number(d.d)<=2*Number(d.tf)||Number(d.bf)<=Number(d.tw))issues.push("هندسه I در قطعه "+String(m.id)+" نامعتبر است.");
   const s=m.section||{};["E","G","A","Iy","Iz","J"].forEach(k=>{if(!positive(s[k]))issues.push("خاصیت "+k+" در قطعه "+String(m.id)+" ناقص است.");});
  });
  const mi=memberInputs[g.parentMemberId]||{},missing=[];
  if(mi.sectionType!=="welded-I")missing.push("نوع مقطع جوشی I و دامنه معتبر موتور طراحی");
  POSITIVE.forEach(k=>{if(!positive(mi[k]))missing.push(k);});
  BOOLEAN.forEach(k=>{if(mi[k]!==true)missing.push(k);});
  if(!["verified-nonslender","verified-slender-with-effective-section"].includes(mi.localSlendernessClass))missing.push("طبقه‌بندی لاغری موضعی و مسیر سطح مؤثر");
  if(!Array.isArray(mi.restraintStations)||mi.restraintStations.length<2)missing.push("مختصات و نوع مهارهای جانبی/پیچشی واقعی");
  else {const stations=mi.restraintStations.slice().sort((a,b)=>Number(a.coordinate)-Number(b.coordinate));if(stations.some(x=>!Number.isFinite(Number(x.coordinate))||Number(x.coordinate)<0||Number(x.coordinate)>1||!x.lateral||!x.torsional)||Math.abs(Number(stations[0].coordinate))>1e-8||Math.abs(Number(stations[stations.length-1].coordinate)-1)>1e-8||stations.some((x,i)=>i&&Number(x.coordinate)<=Number(stations[i-1].coordinate)))missing.push("مهار جانبی و پیچشی معتبر، مرتب و پوشش‌دهنده دو انتهای عضو");}
  if(!Array.isArray(mi.connectionIds)||!mi.connectionIds.length||mi.connectionIds.some(x=>!String(x).trim()))missing.push("شناسه و داده اتصالات ابتدا/انتها و وصله‌ها");
  const caseRows=[];
  if(!cases.length)missing.push("ترکیبات بار طراحی به‌صورت مجموعه هم‌زمان");
  cases.forEach(c=>{
   const label=String(c?.label||"");if(!label){issues.push("ترکیب بار بدون شناسه/عنوان وجود دارد.");return;}
   const cm=Array.isArray(c.members)?c.members:[],byId=new Map();
   cm.forEach(x=>{const id=String(x.id||"");if(!id||byId.has(id))issues.push("شناسه عضو در ترکیب "+label+" خالی یا تکراری است.");else byId.set(id,x);});
   const missingSegments=ordered.filter(m=>!byId.has(String(m.id))).map(m=>String(m.id));
   const invalid=ordered.filter(m=>{const f=byId.get(String(m.id))?.localEndForces;return !Array.isArray(f)||f.length!==12||f.some(v=>!Number.isFinite(Number(v)));}).map(m=>String(m.id));
   if(missingSegments.length||invalid.length)issues.push("ترکیب "+label+" برای عضو "+g.parentMemberId+" ناقص است؛ قطعات مفقود: "+missingSegments.join(", ")+"؛ بردارهای ۱۲ مؤلفه‌ای نامعتبر: "+invalid.join(", "));
   caseRows.push({label,segmentCount:ordered.length,complete:!missingSegments.length&&!invalid.length,simultaneousForcesPreserved:true});
  });
  if(mi.restraintLayoutVerified!==true)warnings.push("مهارهای عضو "+g.parentMemberId+" هنوز به‌صورت مستقل مستند نشده‌اند.");
  memberRows.push({parentMemberId:g.parentMemberId,segmentCount:ordered.length,requiredInputsComplete:missing.length===0,missingInputs:missing,loadCases:caseRows});
 }
 const complete=issues.length===0&&memberRows.length>0&&memberRows.every(x=>x.requiredInputsComplete&&x.loadCases.every(c=>c.complete));
 return {success:issues.length===0&&complete,status:complete?"inputs-ready-for-resistance-engines":"blocked-incomplete",physicalMemberCount:groups.size,analysisSegmentCount:tapered.length,memberRows,issues,warnings,scope:"Input and simultaneous-demand readiness only. No member strength, local/global buckling, LTB, interaction, deflection, fabrication or code compliance is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const seg=i=>({id:"R1_"+i,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:i,taperSegmentCount:2,taperDimensions:{d:500-i*30,bf:200,tw:8,tf:12},section:{E:2e11,G:7.7e10,A:.01,Iy:1e-5,Iz:1e-4,J:1e-6}});
 const input={members:[seg(1),seg(2)],loadCases:[{label:"ULS-1",equilibrium:{ok:true},members:[{id:"R1_1",localEndForces:Array(12).fill(0)},{id:"R1_2",localEndForces:Array(12).fill(0)}]}],memberInputs:{R1:{sectionType:"welded-I",Fy_MPa:345,Fu_MPa:450,E_MPa:200000,G_MPa:76923,Kx:1,Ky:1,Kz:1,Lx_mm:6000,Ly_mm:6000,Lz_mm:6000,Lb_mm:1500,localSlendernessReviewed:true,localSlendernessClass:"verified-nonslender",restraintLayoutVerified:true,restraintStations:[{coordinate:0,lateral:true,torsional:true},{coordinate:1,lateral:true,torsional:true}],connectionDesignInputsVerified:true,connectionIds:["C1","C2"],serviceabilityCasesProvided:true}}};
 const good=audit(input),missing=audit({...input,loadCases:[{label:"ULS-1",members:[{id:"R1_1",localEndForces:[0]}]}]}),noMaterial=audit({...input,memberInputs:{R1:{}}}),duplicate=audit({...input,members:[...input.members,seg(2)]});
 const failedEquilibrium=audit({...input,loadCases:[{...input.loadCases[0],equilibrium:{ok:false}}]});
 const duplicateCase=audit({...input,loadCases:[...input.loadCases,{...input.loadCases[0]}]});
 const incompleteRestraint=audit({...input,memberInputs:{R1:{...input.memberInputs.R1,restraintStations:[{coordinate:.2,lateral:true,torsional:true},{coordinate:.8,lateral:true,torsional:true}]}}});
 const checks=[good.success&&good.status==="inputs-ready-for-resistance-engines",!missing.success,!noMaterial.success,!duplicate.success,!good.designApproved&&!good.analysisEnabled,!failedEquilibrium.success,!duplicateCase.success,!incompleteRestraint.success];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedMemberDesignReadiness={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tapered-fabrication-economics.js ===== */
/* SAHROUD STEEL — fabrication geometry and material-cost alternatives.
 * Quantity comparison only: it does not select or approve a structurally adequate section.
 */
(function(root){
"use strict";
const D=["d","bf","tw","tf"];
const num=v=>(v===null||v===undefined||String(v).trim()==="")?null:(Number.isFinite(Number(v))?Number(v):null);
function area(s){
 const d=num(s?.d),bf=num(s?.bf),tw=num(s?.tw),tf=num(s?.tf);
 if([d,bf,tw,tf].some(v=>v===null||v<=0)||d<=2*tf||bf<=tw)throw Error("ابعاد I نامعتبر است؛ d>2tf و bf>tw باید برقرار باشد.");
 return 2*bf*tf+(d-2*tf)*tw;
}
function normalize(input){
 const x=input||{},L=num(x.length_m),rho=num(x.density_kg_m3??7850),raw=Array.isArray(x.stations)?x.stations:[];
 if(!(L>0))throw Error("طول عضو باید مثبت و بر حسب متر باشد.");
 if(!(rho>0))throw Error("چگالی فولاد باید مثبت باشد.");
 if(raw.length<2)throw Error("حداقل دو ایستگاه مقطع لازم است.");
 const stations=raw.map((s,i)=>({x_m:num(s.x_m),section:Object.fromEntries(D.map(k=>[k,num(s[k])])),sourceIndex:i})).sort((a,b)=>a.x_m-b.x_m);
 if(stations.some(s=>s.x_m===null||D.some(k=>s.section[k]===null)||s.x_m<0||s.x_m>L))throw Error("مختصات یا ابعاد ایستگاه‌ها ناقص/نامعتبر است.");
 if(Math.abs(stations[0].x_m)>1e-8||Math.abs(stations.at(-1).x_m-L)>1e-6)throw Error("ایستگاه نخست باید صفر و ایستگاه آخر برابر طول عضو باشد.");
 for(let i=0;i<stations.length;i++){area(stations[i].section);if(i&&stations[i].x_m-stations[i-1].x_m<=1e-8)throw Error("مختصات ایستگاه‌ها باید یکتا و افزایشی باشند.");}
 return {length_m:L,density_kg_m3:rho,stations,prices:x.prices||{},weldLineCount:num(x.weldLineCount),includeWeldCost:x.includeWeldCost===true};
}
function interp(a,b,t){const o={};D.forEach(k=>o[k]=a[k]+(b[k]-a[k])*t);return o;}
function sectionMass(section,lengthM,rho){const A=area(section),volume=A*lengthM*1e-3;return {area_mm2:A,volume_m3:volume,mass_kg:volume*rho};}
function build(input){
 const x=normalize(input),s=x.stations,L=x.length_m,rho=x.density_kg_m3;
 let continuousVolumeMm2m=0,stepVolumeMm2m=0,stepZones=[];
 for(let i=0;i<s.length-1;i++){
  const a=s[i],b=s[i+1],dx=b.x_m-a.x_m,mid=interp(a.section,b.section,.5);
  // Simpson integration is exact for the cubic area function of linearly varying dimensions.
  const A0=area(a.section),Am=area(mid),A1=area(b.section);
  continuousVolumeMm2m+=dx*(A0+4*Am+A1)/6;
  stepVolumeMm2m+=dx*Am;
  stepZones.push({from_m:a.x_m,to_m:b.x_m,section:mid,area_mm2:Am});
 }
 const maxStation=s.reduce((best,v)=>area(v.section)>area(best.section)?v:best,s[0]);
 const options=[
  {id:"uniform-max-area",label:"منشوری با سطح مقطع برابر بزرگ‌ترین سطح ایستگاه‌ها",method:"بزرگ‌ترین A ایستگاه در تمام طول عضو",volumeMm2m:area(maxStation.section)*L,constantSection:maxStation.section,zoneCount:1},
  {id:"continuous-taper",label:"متغیرمقطع پیوسته با درون‌یابی خطی ابعاد",method:"انتگرال‌گیری سیمپسون روی سطح مقطع حاصل از درون‌یابی خطی ابعاد",volumeMm2m:continuousVolumeMm2m,zoneCount:s.length-1},
  {id:"stepped-midpoint",label:"چندپله‌ای با مقطع ثابت در هر بازه",method:"مقطع هر بازه از ابعاد میان‌یابی‌شده در وسط همان بازه",volumeMm2m:stepVolumeMm2m,zones:stepZones,zoneCount:stepZones.length}
 ];
 const p=x.prices,steelRate=num(p.steel_toman_per_kg),weldRate=num(p.weld_toman_per_meter);
 const weldLength=x.weldLineCount!==null&&x.weldLineCount>=0?x.weldLineCount*L:null;
 const rows=options.map(o=>{
  const volume=o.volumeMm2m*1e-3,mass=volume*rho;
  const steelCost=steelRate!==null&&steelRate>=0?mass*steelRate:null;
  const weldCost=x.includeWeldCost&&weldLength!==null&&weldRate!==null&&weldRate>=0?weldLength*weldRate:null;
  return {...o,steelVolume_m3:volume,steelMass_kg:mass,steelCost_toman:steelCost,weldLineLength_m:weldLength,weldCost_toman:weldCost,totalCost_toman:steelCost!==null&&(x.includeWeldCost?weldCost!==null:true)?steelCost+(weldCost||0):null};
 });
 const base=rows[0],bestMass=rows.reduce((a,b)=>b.steelMass_kg<a.steelMass_kg?b:a,rows[0]);
 return {success:true,length_m:L,density_kg_m3:rho,stationCount:s.length,maximumAreaStation:{x_m:maxStation.x_m,area_mm2:area(maxStation.section)},options:rows,lowestMaterialMassOption:bestMass.id,priceInputs:{steel_toman_per_kg:steelRate,weld_toman_per_meter:weldRate,weldLineCount:x.weldLineCount,weldLineLength_m:weldLength},warnings:["این مقایسه فقط متره هندسی/وزنی و برآورد هزینه بر پایه قیمت‌های ورودی است؛ هیچ گزینه‌ای از نظر مقاومت، پایداری، خیز، خستگی، اتصال یا آیین‌نامه تأیید نشده است.","گزینه منشوریِ مبنا با بزرگ‌ترین سطح مقطع ایستگاه‌ها فقط یک خط مبنای وزنی است و لزوماً مقطع طراحی ایمن نیست.","گزینه چندپله‌ای از مقطع ثابت در وسط هر بازه استفاده می‌کند؛ جزئیات برش، پرت ورق، وصله، جوش، تلرانس و محدودیت حمل در این نسخه محاسبه نشده‌اند.","قیمت خالی به معنی هزینه نامشخص است و صفر تلقی نمی‌شود."] ,analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const input={length_m:10,density_kg_m3:7850,stations:[{x_m:0,d:600,bf:250,tw:8,tf:14},{x_m:5,d:450,bf:220,tw:8,tf:12},{x_m:10,d:600,bf:250,tw:8,tf:14}],prices:{}};
 const r=build(input),bad=(()=>{try{build({...input,stations:[input.stations[0],{...input.stations[1],d:0},input.stations[2]]});return false;}catch(e){return true;}})();
 const blankPrice=build({...input,prices:{steel_toman_per_kg:"",weld_toman_per_meter:""},weldLineCount:""});
 const checks=[r.options.length===3,r.options[0].steelMass_kg>0,r.options.every(o=>o.steelCost_toman===null&&o.totalCost_toman===null),r.options[1].steelMass_kg>r.options[2].steelMass_kg,bad&&!r.designApproved&&!r.analysisEnabled,blankPrice.priceInputs.steel_toman_per_kg===null&&blankPrice.priceInputs.weldLineCount===null];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelTaperedFabricationEconomics={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tapered-fabrication-ui.js ===== */
/* SAHROUD STEEL — UI for tapered fabrication quantity alternatives.
 * Inputs are explicit; geometry is read from the tapered-section editor only.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=v=>Number.isFinite(Number(v))?Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2}):"نامشخص";
function inputFor(group,length,density,steelPrice,weldCount,weldRate,includeWeld){
 const api=root.SteelTaperedSections;
 if(!api?.getData)throw Error("ماژول مقاطع متغیرمقطع در دسترس نیست.");
 const data=api.getData(),g=data.groups?.[group];
 if(!g?.enabled)throw Error("ابتدا گزینه اعمال مقطع متغیر را برای این گروه فعال و ایستگاه‌ها را تکمیل کنید.");
 const L=Number(length),stations=[["start",0],["mid",L/2],["end",L]].map(([key,x_m])=>{
  const s=g.stations?.[key]||{};
  return {x_m,d:s.d,bf:s.bf,tw:s.tw,tf:s.tf};
 });
 return {length_m:L,density_kg_m3:density,stations,prices:{steel_toman_per_kg:steelPrice,weld_toman_per_meter:weldRate},weldLineCount:weldCount,includeWeldCost:includeWeld===true};
}
function calculate(){
 const group=$("taperEconomyGroup")?.value||"rafter";
 const input=inputFor(group,$("taperEconomyLength")?.value,$("taperEconomyDensity")?.value,$("taperEconomySteelPrice")?.value,$("taperEconomyWeldCount")?.value,$("taperEconomyWeldRate")?.value,$("taperEconomyIncludeWeld")?.checked);
 const result=root.SteelTaperedFabricationEconomics.build(input);
 const body=$("taperEconomyRows");
 body.innerHTML=result.options.map(o=>"<tr><td>"+esc(o.label)+"</td><td>"+fmt(o.zoneCount)+"</td><td>"+fmt(o.steelMass_kg)+" kg</td><td>"+(o.steelCost_toman===null?"نامشخص":fmt(o.steelCost_toman)+" تومان")+"</td><td>"+(o.weldCost_toman===null?"نامشخص":fmt(o.weldCost_toman)+" تومان")+"</td><td>"+(o.totalCost_toman===null?"نامشخص":fmt(o.totalCost_toman)+" تومان")+"</td></tr>").join("");
 $("taperEconomyStatus").textContent="مقایسه هندسی/وزنی انجام شد؛ گزینه کم‌وزن‌تر در این مدل: "+result.lowestMaterialMassOption+"؛ هیچ گزینه‌ای طراحی یا تأیید سازه‌ای نشده است.";
 $("taperEconomyWarnings").innerHTML=result.warnings.map(x=>"<p>"+esc(x)+"</p>").join("");
 return result;
}
function init(){
 if($("taperedFabricationEconomicsPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="taperedFabricationEconomicsPanel";
 panel.innerHTML="<div class='panel-title'><h3>مقایسه اقتصادی و متره مقاطع منشوری و متغیرمقطع</h3><span class='status'>متره، نه طراحی</span></div>"+
 "<div class='notice'>ابعاد سه ایستگاه از فرم «مقاطع تیرورق متغیرعمق» خوانده می‌شود. طول عضو و قیمت‌ها باید صریح وارد شوند. این مقایسه به‌تنهایی کفایت سازه‌ای یا قابلیت ساخت را تأیید نمی‌کند.</div>"+
 "<div class='form-grid'><div class='field'><label for='taperEconomyGroup'>گروه عضو</label><select id='taperEconomyGroup'><option value='rafter'>رفتر</option><option value='column'>ستون</option></select></div>"+
 "<div class='field'><label for='taperEconomyLength'>طول فیزیکی عضو (m)</label><input id='taperEconomyLength' type='number' min='0.01' step='0.01' placeholder='طول واقعی عضو'></div>"+
 "<div class='field'><label for='taperEconomyDensity'>چگالی (kg/m³)</label><input id='taperEconomyDensity' type='number' min='1' step='1' value='7850'></div>"+
 "<div class='field'><label for='taperEconomySteelPrice'>قیمت فولاد (تومان/kg) — اختیاری</label><input id='taperEconomySteelPrice' type='number' min='0' step='1000' placeholder='قیمت معتبر روز'></div>"+
 "<div class='field'><label for='taperEconomyWeldCount'>تعداد خطوط جوش طولی — ورودی کاربر</label><input id='taperEconomyWeldCount' type='number' min='0' step='1' placeholder='در صورت اطلاع'></div>"+
 "<div class='field'><label for='taperEconomyWeldRate'>هزینه هر متر خط جوش (تومان/m)</label><input id='taperEconomyWeldRate' type='number' min='0' step='1000' placeholder='در صورت داشتن نرخ'></div>"+
 "<div class='field'><label><input id='taperEconomyIncludeWeld' type='checkbox'> هزینه جوش در جمع هزینه منظور شود</label></div></div>"+
 "<div class='button-grid'><button type='button' class='btn primary' id='btnTaperEconomy'>محاسبه و مقایسه سه روش</button></div>"+
 "<div id='taperEconomyStatus' class='notice'>برای محاسبه، ابتدا مقطع متغیر و ایستگاه‌های آن را تعریف کنید.</div>"+
 "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>روش</th><th>تعداد بازه</th><th>جرم فولاد</th><th>هزینه فولاد</th><th>هزینه جوش</th><th>جمع هزینه معلوم</th></tr></thead><tbody id='taperEconomyRows'></tbody></table></div>"+
 "<div id='taperEconomyWarnings' class='notice'></div>";
 const anchor=$("taperedSectionsPanel")||$("sectionGeometryAuditPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);else main.appendChild(panel);
 $("btnTaperEconomy").addEventListener("click",()=>{try{calculate();}catch(e){$("taperEconomyStatus").textContent="توقف محاسبه: "+(e?.message||String(e));$("taperEconomyRows").innerHTML="";}});
}
function selfTest(){
 const tests=[];
 tests.push({name:"three-station-map",pass:typeof inputFor==="function"});
 tests.push({name:"engine-required",pass:!!root.SteelTaperedFabricationEconomics?.build});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests};
}
root.SteelTaperedFabricationUI={inputFor,calculate,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tapered-case-force-bridge.js ===== */
/* SAHROUD STEEL — synchronized tapered-member case-force bridge.
 * Rebuilds per-combination, per-segment 12-DOF force records from retained FEM results.
 * Demand traceability only; no resistance or stability design is performed.
 */
(function(root){
"use strict";
function build(model,combinationResults){
 const issues=[],modelMembers=Array.isArray(model?.members)?model.members:[],cases=Array.isArray(combinationResults)?combinationResults:[];
 const firstCaseMembers=Array.isArray(cases[0]?.members)?cases[0].members:[];
 const modelHasTaper=modelMembers.some(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 const members=modelHasTaper?modelMembers:firstCaseMembers;
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 if(!tapered.length)return {success:true,status:"no-tapered-members",physicalMemberCount:0,analysisSegmentCount:0,loadCases:[],issues,analysisEnabled:false,designApproved:false};
 if(!cases.length)issues.push("هیچ نتیجه ترکیب بار ذخیره‌شده‌ای دریافت نشد.");
 const byId=new Map();
 members.forEach(m=>{const id=String(m?.id??"");if(!id||byId.has(id))issues.push("شناسه عضو مدل خالی یا تکراری است: "+id);else byId.set(id,m);});
 const groups=new Map();
 tapered.forEach(m=>{
  const parent=String(m.parentMemberId||"");
  if(!parent){issues.push("قطعه "+m.id+" شناسه عضو فیزیکی والد ندارد.");return;}
  const count=Number(m.taperSegmentCount),index=Number(m.taperSegmentIndex);
  if(!Number.isInteger(count)||count<2||!Number.isInteger(index)||index<1||index>count)issues.push("شماره/تعداد قطعات برای "+m.id+" نامعتبر است.");
  const g=groups.get(parent)||{parentMemberId:parent,count,segments:[]};
  if(g.count!==count)issues.push("تعداد قطعات عضو "+parent+" یکسان نیست.");
  if(g.segments.some(x=>Number(x.taperSegmentIndex)===index))issues.push("شماره قطعه تکراری در عضو "+parent+": "+index);
  g.segments.push(m);groups.set(parent,g);
 });
 groups.forEach(g=>{const seen=new Set(g.segments.map(m=>Number(m.taperSegmentIndex)));for(let i=1;i<=g.count;i++)if(!seen.has(i))issues.push("قطعه "+i+" از عضو "+g.parentMemberId+" در مدل مفقود است.");});
 const loadCases=[];
 cases.forEach((c,ci)=>{
  const label=String(c?.label||c?.name||"");
  if(!label){issues.push("نتیجه ترکیب شماره "+(ci+1)+" شناسه ندارد.");return;}
  if(c.equilibrium?.ok!==true)issues.push("تعادل حل‌گر برای ترکیب "+label+" تأیید نشده است.");
  const resultMembers=Array.isArray(c.members)?c.members:[];
  const resultById=new Map();
  resultMembers.forEach(m=>{const id=String(m?.id??"");if(!id||resultById.has(id))issues.push("شناسه عضو در ترکیب "+label+" خالی یا تکراری است: "+id);else resultById.set(id,m);});
  const caseMembers=[];
  tapered.forEach(m=>{
   const id=String(m.id),rm=resultById.get(id),f=rm?.localEndForces;
   if(!rm){issues.push("عضو متغیرمقطع "+id+" در ترکیب "+label+" مفقود است.");return;}
   if(!Array.isArray(f)||f.length!==12||f.some(v=>!Number.isFinite(Number(v)))){issues.push("بردار ۱۲ مؤلفه‌ای عضو "+id+" در ترکیب "+label+" ناقص است.");return;}
   caseMembers.push({id,parentMemberId:String(m.parentMemberId),taperSegmentIndex:Number(m.taperSegmentIndex),taperSegmentCount:Number(m.taperSegmentCount),taperCoordinate:Number(m.taperCoordinate),localEndForces:f.map(Number)});
  });
  loadCases.push({label,factors:c.factors||null,windSign:c.windSign??null,equilibrium:c.equilibrium||null,members:caseMembers,complete:caseMembers.length===tapered.length});
 });
 const complete=issues.length===0&&loadCases.length===cases.length&&loadCases.every(c=>c.complete);
 return {success:complete,status:complete?"synchronized-case-forces-complete":"incomplete",physicalMemberCount:groups.size,analysisSegmentCount:tapered.length,caseCount:loadCases.length,loadCases,issues,forceComponents:["Fx_i","Fy_i","Fz_i","Mx_i","My_i","Mz_i","Fx_j","Fy_j","Fz_j","Mx_j","My_j","Mz_j"],scope:"Per-combination simultaneous end-force transfer and segment traceability only. No resistance, stability, serviceability, convergence or code approval is calculated.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const m=[1,2].map(i=>({id:"R1_TAPER_0"+i,parentMemberId:"R1",taperApplied:true,taperSegmentIndex:i,taperSegmentCount:2}));
 const f1=[1,2,3,4,5,6,-1,-2,-3,-4,-5,-6],f2=[10,20,30,40,50,60,-10,-20,-30,-40,-50,-60];
 const good=build({members:m},[{label:"ULS-A",equilibrium:{ok:true},members:m.map((x,i)=>({id:x.id,localEndForces:i?f2:f1}))},{label:"ULS-B",equilibrium:{ok:true},members:m.map((x,i)=>({id:x.id,localEndForces:i?f1:f2}))}]);
 const missing=build({members:m},[{label:"ULS-A",equilibrium:{ok:true},members:[{id:m[0].id,localEndForces:f1}]}]);
 const bad=build({members:m},[{label:"ULS-A",equilibrium:{ok:false},members:m.map(x=>({id:x.id,localEndForces:[1,2]}))}]);
 const fallback=build({members:[{id:"R1",sectionKey:"rafter"}]},[{label:"ULS",equilibrium:{ok:true},members:m.map((x,i)=>({...x,localEndForces:i?f2:f1}))}]);
 const checks=[good.success&&good.loadCases[1].members[1].localEndForces[4]===5,good.loadCases[0].members[0].localEndForces[4]===5&&!good.designApproved,!missing.success,!bad.success,build({members:[]},[]).status==="no-tapered-members",fallback.success&&fallback.analysisSegmentCount===2];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedCaseForceBridge={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/girder.js ===== */
/* SAHROUD STEEL - Independent Girders and Stability Inputs */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const DENSITY = 7850;

    const members = {
        column: { title: "ستون", result: null },
        rafter: { title: "رفتر", result: null }
    };

    function stabilityFields(prefix, title) {
        return `
            <h4>مشخصات پایداری ${title}</h4>
            <div class="form-grid">
                <div class="field">
                    <label>طول مهارنشده محور قوی Lx (m)</label>
                    <input id="${prefix}Lx" type="number"
                        min="0.01" step="0.01" placeholder="مثلاً 3">
                </div>
                <div class="field">
                    <label>طول مهارنشده محور ضعیف Ly (m)</label>
                    <input id="${prefix}Ly" type="number"
                        min="0.01" step="0.01" placeholder="مثلاً 3">
                </div>
                <div class="field">
                    <label>ضریب طول مؤثر Kx</label>
                    <input id="${prefix}Kx" type="number"
                        min="0.01" step="0.01" placeholder="ورود ضریب">
                </div>
                <div class="field">
                    <label>ضریب طول مؤثر Ky</label>
                    <input id="${prefix}Ky" type="number"
                        min="0.01" step="0.01" placeholder="ورود ضریب">
                </div>
            </div>
        `;
    }

    function fields(prefix, title, defaults) {
        return `
            <h4>${title}</h4>
            <div class="form-grid">
                <div class="field">
                    <label>ارتفاع خالص جان (mm)</label>
                    <input id="${prefix}WebH" type="number" min="1" value="${defaults[0]}">
                </div>
                <div class="field">
                    <label>ضخامت جان (mm)</label>
                    <input id="${prefix}WebT" type="number" min="1" value="${defaults[1]}">
                </div>
                <div class="field">
                    <label>عرض بال پایینی (mm)</label>
                    <input id="${prefix}BottomB" type="number" min="1" value="${defaults[2]}">
                </div>
                <div class="field">
                    <label>ضخامت بال پایینی (mm)</label>
                    <input id="${prefix}BottomT" type="number" min="1" value="${defaults[3]}">
                </div>
                <div class="field">
                    <label>عرض بال بالایی (mm)</label>
                    <input id="${prefix}TopB" type="number" min="1" value="${defaults[4]}">
                </div>
                <div class="field">
                    <label>ضخامت بال بالایی (mm)</label>
                    <input id="${prefix}TopT" type="number" min="1" value="${defaults[5]}">
                </div>
            </div>

            ${stabilityFields(prefix, title)}

            <div class="button-grid">
                <button id="${prefix}Calculate" class="btn primary" type="button">
                    محاسبه تیرورق ${title}
                </button>
                <button id="${prefix}Transfer" class="btn success" type="button">
                    انتقال به ${title}
                </button>
            </div>
            <div id="${prefix}Message" class="notice">
                ابعاد ${title} را وارد و محاسبه کنید.
            </div>
            <div id="${prefix}Results"></div>
        `;
    }

    function createPanel() {
        if ($("girderPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "girderPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>محاسبه مستقل تیرورق ستون و رفتر</h3>
            </div>

            <div class="notice">
                مشخصات ستون و رفتر کاملاً مستقل است.
                تمام ابعاد تیرورق بر حسب میلی‌متر و طول‌های مهارنشده بر حسب متر هستند.
            </div>

            ${fields("colGirder", "۱ ـ تیرورق ستون", [500, 8, 200, 12, 200, 12])}

            <hr>

            ${fields("rafGirder", "۲ ـ تیرورق رفتر", [400, 8, 180, 10, 180, 10])}

            <div class="notice">
                طول مهارنشده و ضرایب K باید بر اساس وضعیت واقعی مهاربندی،
                شرایط اتصال و رفتار قاب تعیین شوند.
                وارد کردن این اطلاعات به‌تنهایی به معنی تأیید پایداری عضو نیست.
            </div>
        `;

        const main = document.querySelector("main");
        if (!main) throw new Error("بخش اصلی صفحه پیدا نشد.");

        const drawing = Array.from(main.querySelectorAll(".panel"))
            .find(p => p.querySelector("h3")?.textContent.includes("۵"));

        if (drawing) main.insertBefore(panel, drawing);
        else main.appendChild(panel);

        $("colGirderCalculate").addEventListener("click", () => calculate("column"));
        $("colGirderTransfer").addEventListener("click", () => transfer("column"));
        $("rafGirderCalculate").addEventListener("click", () => calculate("rafter"));
        $("rafGirderTransfer").addEventListener("click", () => transfer("rafter"));
    }

    function readDimensions(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        return {
            hw: Number($(prefix + "WebH").value),
            tw: Number($(prefix + "WebT").value),
            bb: Number($(prefix + "BottomB").value),
            tb: Number($(prefix + "BottomT").value),
            bt: Number($(prefix + "TopB").value),
            tt: Number($(prefix + "TopT").value)
        };
    }

    function readStability(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        function readOptional(id) {
            const el = $(id);
            if (!el || el.value.trim() === "") return null;

            const value = Number(el.value);
            return Number.isFinite(value) ? value : null;
        }

        return {
            Lx: readOptional(prefix + "Lx"),
            Ly: readOptional(prefix + "Ly"),
            Kx: readOptional(prefix + "Kx"),
            Ky: readOptional(prefix + "Ky")
        };
    }

    function calculateProperties(d) {
        if (Object.values(d).some(v => !Number.isFinite(v) || v <= 0)) {
            throw new Error("تمام ابعاد باید بزرگ‌تر از صفر باشند.");
        }

        if (d.tw >= Math.min(d.bb, d.bt)) {
            throw new Error("ضخامت جان باید از عرض هر دو بال کمتر باشد.");
        }

        const hw = d.hw / 1000;
        const tw = d.tw / 1000;
        const bb = d.bb / 1000;
        const tb = d.tb / 1000;
        const bt = d.bt / 1000;
        const tt = d.tt / 1000;

        const Ab = bb * tb;
        const Aw = tw * hw;
        const At = bt * tt;
        const A = Ab + Aw + At;

        const yb = tb / 2;
        const yw = tb + hw / 2;
        const yt = tb + hw + tt / 2;

        const yBar = (Ab * yb + Aw * yw + At * yt) / A;

        const Ix =
            bb * Math.pow(tb, 3) / 12 + Ab * Math.pow(yb - yBar, 2) +
            tw * Math.pow(hw, 3) / 12 + Aw * Math.pow(yw - yBar, 2) +
            bt * Math.pow(tt, 3) / 12 + At * Math.pow(yt - yBar, 2);

        const Iy =
            tb * Math.pow(bb, 3) / 12 +
            hw * Math.pow(tw, 3) / 12 +
            tt * Math.pow(bt, 3) / 12;

        const totalHeight = hw + tb + tt;
        const SxTop = Ix / (totalHeight - yBar);
        const SxBottom = Ix / yBar;
        const Sy = Iy / (Math.max(bb, bt) / 2);

        return {
            A, Ix, Iy, SxTop, SxBottom, Sy,
            rx: Math.sqrt(Ix / A),
            ry: Math.sqrt(Iy / A),
            yBar, totalHeight,
            massPerMeter: A * DENSITY
        };
    }

    function fmt(value, digits = 2) {
        return Number(value).toLocaleString("fa-IR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function showResults(member, p) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        $(prefix + "Results").innerHTML = `
            <h4>نتایج ${members[member].title}</h4>
            <div class="result-card"><span>مساحت A</span><strong>${fmt(p.A * 1e4)} cm²</strong></div>
            <div class="result-card"><span>ممان اینرسی Ix</span><strong>${fmt(p.Ix * 1e8)} cm⁴</strong></div>
            <div class="result-card"><span>ممان اینرسی Iy</span><strong>${fmt(p.Iy * 1e8)} cm⁴</strong></div>
            <div class="result-card"><span>مدول مقطع بالا Sx</span><strong>${fmt(p.SxTop * 1e6)} cm³</strong></div>
            <div class="result-card"><span>مدول مقطع پایین Sx</span><strong>${fmt(p.SxBottom * 1e6)} cm³</strong></div>
            <div class="result-card"><span>مدول مقطع ضعیف Sy</span><strong>${fmt(p.Sy * 1e6)} cm³</strong></div>
            <div class="result-card"><span>شعاع ژیراسیون rx</span><strong>${fmt(p.rx * 100)} cm</strong></div>
            <div class="result-card"><span>شعاع ژیراسیون ry</span><strong>${fmt(p.ry * 100)} cm</strong></div>
            <div class="result-card"><span>ارتفاع کل</span><strong>${fmt(p.totalHeight * 1000, 1)} mm</strong></div>
            <div class="result-card"><span>وزن هر متر</span><strong>${fmt(p.massPerMeter)} kg/m</strong></div>
        `;
    }

    function calculate(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";

        try {
            const dimensions = readDimensions(member);
            const properties = calculateProperties(dimensions);

            members[member].result = { dimensions, properties };
            showResults(member, properties);

            $(prefix + "Message").textContent =
                "محاسبه تیرورق " + members[member].title + " موفق بود.";
            $(prefix + "Message").style.color = "#15803d";
        } catch (error) {
            members[member].result = null;
            $(prefix + "Results").innerHTML = "";
            $(prefix + "Message").textContent = "خطا: " + error.message;
            $(prefix + "Message").style.color = "#b45309";
        }
    }

    function transfer(member) {
        const prefix = member === "column" ? "colGirder" : "rafGirder";
        const title = members[member].title;

        try {
            const result = members[member].result;

            if (!result) {
                throw new Error("ابتدا تیرورق " + title + " را محاسبه کنید.");
            }

            if (!window.SteelSections) {
                throw new Error("ماژول مشخصات مقاطع در دسترس نیست.");
            }

            const p = result.properties;

            const values = {
                Profile: "تیرورق " + title,
                A: p.A * 1e4,
                Ix: p.Ix * 1e8,
                Iy: p.Iy * 1e8,
                SxTop: p.SxTop * 1e6,
                SxBottom: p.SxBottom * 1e6,
                Sy: p.Sy * 1e6
            };

            for (const [suffix, value] of Object.entries(values)) {
                const element = $(member + suffix);

                if (!element) {
                    throw new Error("فیلد " + suffix + " برای " + title + " پیدا نشد.");
                }

                element.value =
                    typeof value === "number" ? value.toFixed(2) : value;
            }

            members[member].transferred = true;

            $(prefix + "Message").textContent =
                "انتقال مشخصات تیرورق " + title + " با موفقیت انجام شد.";
            $(prefix + "Message").style.color = "#15803d";

        } catch (error) {
            $(prefix + "Message").textContent =
                "خطا در انتقال: " + error.message;
            $(prefix + "Message").style.color = "#b45309";
        }
    }

    // ذخیره ابعاد و اطلاعات پایداری
    function getData() {
        return {
            column: readDimensions("column"),
            rafter: readDimensions("rafter"),
            stability: {
                column: readStability("column"),
                rafter: readStability("rafter")
            }
        };
    }

    // بازیابی ابعاد و اطلاعات پایداری
    function setData(data) {
        if (!data || typeof data !== "object") return;

        ["column", "rafter"].forEach(member => {
            const dimensions = data[member];

            if (dimensions && typeof dimensions === "object") {
                const prefix = member === "column" ? "colGirder" : "rafGirder";

                const mapping = {
                    hw: "WebH",
                    tw: "WebT",
                    bb: "BottomB",
                    tb: "BottomT",
                    bt: "TopB",
                    tt: "TopT"
                };

                Object.entries(mapping).forEach(([key, suffix]) => {
                    const el = $(prefix + suffix);

                    if (el && dimensions[key] !== undefined) {
                        el.value = dimensions[key];
                    }
                });

                calculate(member);
            }

            const stability = data.stability?.[member];

            if (stability && typeof stability === "object") {
                const prefix = member === "column" ? "colGirder" : "rafGirder";

                ["Lx", "Ly", "Kx", "Ky"].forEach(key => {
                    const el = $(prefix + key);

                    if (el && stability[key] !== undefined &&
                        stability[key] !== null) {
                        el.value = stability[key];
                    }
                });
            }
        });
    }

    function validateStability(member) {
        const values = readStability(member);

        const labels = {
            Lx: "طول مهارنشده محور قوی",
            Ly: "طول مهارنشده محور ضعیف",
            Kx: "ضریب طول مؤثر محور قوی",
            Ky: "ضریب طول مؤثر محور ضعیف"
        };

        for (const key of Object.keys(labels)) {
            if (values[key] === null || values[key] <= 0) {
                return labels[key] + " " + members[member].title +
                    " وارد نشده یا نامعتبر است.";
            }
        }

        return "";
    }

    function init() {
        createPanel();
    }

    window.SteelGirder = {
        readDimensions,
        readStability,
        calculateProperties,
        calculate,
        transfer,
        getData,
        setData,
        validateStability,
        members
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

/* ===== steel2/js/stability.js ===== */

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
                    position: "—",
                    samples: 0
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
                    if (!(Number.isFinite(L) && L > 0) ||
                        !Number.isFinite(Number(member.axialStart)) ||
                        !Number.isFinite(Number(member.localLoadX))) {
                        throw new Error("طول یا داده نیروی محوری عضو «"+member.name+"» ناقص است؛ کنترل متوقف شد.");
                    }
                    demand[member.name].samples++;

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

                const hasDemand = d.samples > 0;
                const ratio = hasDemand && result.capacityKN > 0
                    ? d.value / result.capacityKN
                    : null;

                const status = !hasDemand
                    ? "فاقد داده ـ کنترل نشد"
                    : ratio <= 1 ? "قبول مقدماتی" : "عدم کفایت مقدماتی";

                return `
                    <tr>
                        <td>${name}</td>
                        <td>${hasDemand?fmt(d.value):"—"}</td>
                        <td>${fmt(result.x.slenderness, 1)}</td>
                        <td>${fmt(result.y.slenderness, 1)}</td>
                        <td>${result.controllingAxis}</td>
                        <td>${fmt(result.capacityKN)}</td>
                        <td>${ratio===null?"—":fmt(ratio * 100, 1)+"%"}</td>
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


/* ===== steel2/js/desing.js ===== */
/* SAHROUD STEEL - Member Design Demand Report
Version 2.0
Member force envelopes include uniform local distributed loads.
Units: kN, m, kN.m
*/
(function () {
"use strict";

const $ = id => document.getElementById(id);

const MEMBER_NAMES = [
    "ستون چپ",
    "ستون راست",
    "رفتر چپ",
    "رفتر راست"
];

function fmt(value, digits = 2) {
    return Number(value || 0).toLocaleString("fa-IR", {
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

function forceAt(member, type, x) {
    const qx = Number(member.localLoadX) || 0;
    const qy = Number(member.localLoadY) || 0;

    if (type === "N") {
        return -(Number(member.axialStart) || 0) - qx * x;
    }

    if (type === "V") {
        return -(Number(member.shearStart) || 0) - qy * x;
    }

    return -(Number(member.momentStart) || 0) +
        (Number(member.shearStart) || 0) * x +
        0.5 * qy * x * x;
}

function getStations(member) {
    const L = Number(member.length);
    const stations = [0, L];

    const qy = Number(member.localLoadY) || 0;
    const shearStart = Number(member.shearStart) || 0;

    if (Math.abs(qy) > 1e-12) {
        const x = -shearStart / qy;

        if (x > 0 && x < L) {
            stations.push(x);
        }
    }

    return [...new Set(stations)].sort((a, b) => a - b);
}

function newDemand() {
    return {
        compression: {
            value: 0,
            combination: "—",
            position: "—"
        },
        tension: {
            value: 0,
            combination: "—",
            position: "—"
        },
        moment: {
            value: 0,
            combination: "—",
            position: "—"
        },
        shear: {
            value: 0,
            combination: "—",
            position: "—"
        }
    };
}

function updateDemand(target, value, combination, position) {
    if (value > target.value) {
        target.value = value;
        target.combination = combination;
        target.position = fmt(position) + " m";
    }
}

function calculateDemand() {
    const output = $("memberDemandResults");

    try {
        const cases =
            window.SteelAnalysis &&
            window.SteelAnalysis.combinationResults;

        if (!Array.isArray(cases) || !cases.length) {
            throw new Error(
                "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
            );
        }

        const result = {};

        MEMBER_NAMES.forEach(name => {
            result[name] = newDemand();
        });

        let processed = 0;

        cases.forEach(item => {
            (item.members || []).forEach(member => {
                const name = member.name;

                if (!result[name]) return;

                const L = Number(member.length);

                if (!Number.isFinite(L) || L <= 0 ||
                    !Number.isFinite(Number(member.localLoadX)) ||
                    !Number.isFinite(Number(member.localLoadY))) {
                    throw new Error(
                        "اطلاعات طول یا بار محلی عضو «" +
                        name +
                        "» ناقص است. تحلیل را دوباره اجرا کنید."
                    );
                }

                const stations = getStations(member);

                stations.forEach(x => {
                    const N = forceAt(member, "N", x);
                    const V = forceAt(member, "V", x);
                    const M = forceAt(member, "M", x);

                    // قرارداد این گزارش:
                    // N منفی = فشار و N مثبت = کشش
                    const compression = Math.max(0, -N);
                    const tension = Math.max(0, N);

                    updateDemand(
                        result[name].compression,
                        compression,
                        item.name,
                        x
                    );

                    updateDemand(
                        result[name].tension,
                        tension,
                        item.name,
                        x
                    );

                    updateDemand(
                        result[name].moment,
                        Math.abs(M),
                        item.name,
                        x
                    );

                    updateDemand(
                        result[name].shear,
                        Math.abs(V),
                        item.name,
                        x
                    );
                });

                processed++;
            });
        });

        if (!processed) {
            throw new Error(
                "اطلاعات اعضا در نتایج ترکیبات بار پیدا نشد."
            );
        }

        const rows = MEMBER_NAMES.map(name => {
            const r = result[name];

            return `
                <tr>
                    <td><b>${esc(name)}</b></td>

                    <td>${fmt(r.compression.value)}</td>
                    <td>${esc(r.compression.combination)}</td>
                    <td>${esc(r.compression.position)}</td>

                    <td>${fmt(r.tension.value)}</td>
                    <td>${esc(r.tension.combination)}</td>
                    <td>${esc(r.tension.position)}</td>

                    <td>${fmt(r.moment.value)}</td>
                    <td>${esc(r.moment.combination)}</td>
                    <td>${esc(r.moment.position)}</td>

                    <td>${fmt(r.shear.value)}</td>
                    <td>${esc(r.shear.combination)}</td>
                    <td>${esc(r.shear.position)}</td>
                </tr>
            `;
        }).join("");

        output.innerHTML = `
            <hr>
            <h4>جدول تقاضای طراحی در طول اعضا</h4>

            <p>
                تعداد ترکیبات بررسی‌شده:
                <b>${fmt(cases.length, 0)}</b>
            </p>

            <div style="overflow-x:auto">
                <table style="
                    width:100%;
                    min-width:1450px;
                    border-collapse:collapse;
                    font-size:12px
                ">
                    <thead>
                        <tr>
                            <th rowspan="2">عضو</th>
                            <th colspan="3">فشار محوری (kN)</th>
                            <th colspan="3">کشش محوری (kN)</th>
                            <th colspan="3">لنگر |M| (kN.m)</th>
                            <th colspan="3">برش |V| (kN)</th>
                        </tr>
                        <tr>
                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>

                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>

                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>

                            <th>بیشینه</th>
                            <th>ترکیب حاکم</th>
                            <th>موقعیت</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>

            <div class="notice">
                <b>روش استخراج تقاضا</b>
                <p>
                    نیروهای داخلی با استفاده از نیروهای انتهایی،
                    بارهای گسترده یکنواخت محلی و معادلات تعادل عضو
                    در ابتدا، انتها و نقاط بحرانی محاسبه شده‌اند.
                </p>
                <p>
                    برای لنگر خمشی، نقطه صفرشدن نیروی برشی نیز
                    بررسی شده است.
                </p>
            </div>

            <div class="notice">
                <b>محدودیت مهم</b>
                <p>
                    این جدول تقاضای تحلیل را گزارش می‌کند و به‌تنهایی
                    کنترل مقاومت یا تأیید طراحی نیست.
                </p>
                <p>
                    بار متمرکز، بار گسترده متغیر، اثرات مرتبه دوم،
                    کمانش موضعی و جانبی‌پیچشی و کنترل کامل آیین‌نامه‌ای
                    هنوز باید جداگانه بررسی شوند.
                </p>
            </div>
        `;

        window.SteelAnalysis.memberDemandResults = result;

        const status = $("projectStatus");
        if (status) {
            status.textContent =
                "تقاضای نیروهای داخلی در طول چهار عضو و تمام ترکیبات بار استخراج شد.";
        }

    } catch (error) {
        output.innerHTML = `
            <div class="notice" style="color:#b45309">
                <b>خطا در محاسبه تقاضای اعضا:</b>
                <p>${esc(error.message)}</p>
            </div>
        `;
    }
}

function createPanel() {
    if ($("memberDesignPanel")) return;

    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "memberDesignPanel";

    panel.innerHTML = `
        <div class="panel-title">
            <h3>گزارش تقاضای طراحی اعضا</h3>
        </div>

        <div class="notice">
            استخراج بیشینه فشار، کشش، لنگر و برش
            در طول هر عضو از تمام ترکیبات بار.
        </div>

        <div class="button-grid">
            <button id="btnMemberDemand"
                class="btn primary" type="button">
                محاسبه تقاضای طراحی اعضا
            </button>
        </div>

        <div id="memberDemandResults"></div>
    `;

    const stabilityPanel = $("stabilityPanel");

    if (stabilityPanel && stabilityPanel.parentNode) {
        stabilityPanel.parentNode.insertBefore(
            panel,
            stabilityPanel.nextSibling
        );
    } else {
        document.querySelector("main")?.appendChild(panel);
    }

    $("btnMemberDemand").addEventListener(
        "click",
        calculateDemand
    );
}

function init() {
    createPanel();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();

/* ===== steel2/js/interaction.js ===== */

/* SAHROUD STEEL - Axial and Biaxial Capacity Framework
   Version 3.0
   2D analysis: N-Mx check + My capacity reporting
   Units: kN, m, kN.m
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const PHI_B = 0.90;

    const MEMBER_NAMES = [
        "ستون چپ",
        "ستون راست",
        "رفتر چپ",
        "رفتر راست"
    ];

    function fmt(value, digits = 3) {
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

    function forceAt(member, type, x) {
        const qx = Number(member.localLoadX) || 0;
        const qy = Number(member.localLoadY) || 0;

        if (type === "N") {
            return -(Number(member.axialStart) || 0) - qx * x;
        }

        if (type === "V") {
            return -(Number(member.shearStart) || 0) - qy * x;
        }

        return -(Number(member.momentStart) || 0) +
            (Number(member.shearStart) || 0) * x +
            0.5 * qy * x * x;
    }

    function getStations(member) {
        const L = Number(member.length);

        if (!(Number.isFinite(L) && L > 0)) {
            throw new Error("طول عضو " + member.name + " معتبر نیست.");
        }

        const points = [];

        for (let i = 0; i <= 40; i++) {
            points.push(L * i / 40);
        }

        const qy = Number(member.localLoadY) || 0;
        const shearStart = Number(member.shearStart) || 0;

        if (Math.abs(qy) > 1e-12) {
            const x = -shearStart / qy;
            if (x > 0 && x < L) points.push(x);
        }

        return [...new Set(points)].sort((a, b) => a - b);
    }

    function getCapacities(type) {
        if (
            !window.SteelStability ||
            !window.SteelFlexure ||
            !window.SteelSections
        ) {
            throw new Error(
                "ماژول‌های کمانش، خمش یا مشخصات مقاطع بارگذاری نشده‌اند."
            );
        }

        const compression =
            window.SteelStability.getMemberCapacity(type);

        const flexure =
            window.SteelFlexure.getFlexuralCapacity(type);

        const data = window.SteelSections.getDataSI();
        const section = data[type];
        const fy = Number(data.material.Fy);
        const sy = Number(section.Sy);

        const phiPn = Number(compression.capacityKN);
        const phiMnx = Number(flexure.designKNm);

        if (!(phiPn > 0 && phiMnx > 0 && fy > 0 && sy > 0)) {
            throw new Error(
                "ظرفیت فشاری یا مشخصات خمشی مقطع " +
                (type === "column" ? "ستون" : "رفتر") +
                " معتبر نیست."
            );
        }

        // برآورد اولیه ظرفیت خمشی محور ضعیف:
        // φMny = φb × Fy × Sy
        const phiMny = PHI_B * fy * sy / 1000;

        if (!(phiMny > 0 && Number.isFinite(phiMny))) {
            throw new Error("ظرفیت خمشی محور ضعیف معتبر نیست.");
        }

        return {
            phiPn,
            phiMnx,
            phiMny,
            syCm3: sy * 1e6,
            axis: compression.controllingAxis,
            slendernessX: compression.x.slenderness,
            slendernessY: compression.y.slenderness
        };
    }

    function interactionRatio(Pu, Mux, phiPn, phiMnx) {
        const axialRatio = Pu / phiPn;
        const momentRatio = Mux / phiMnx;

        if (axialRatio >= 0.20) {
            return axialRatio + (8 / 9) * momentRatio;
        }

        return axialRatio / 2 + momentRatio;
    }

    function calculate() {
        const output = $("interactionResults");

        if (!output) return;

        try {
            const analysis = window.SteelAnalysis;
            const cases = analysis && analysis.combinationResults;

            if (!Array.isArray(cases) || !cases.length) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            const capacities = {
                column: getCapacities("column"),
                rafter: getCapacities("rafter")
            };

            const results = {};

            MEMBER_NAMES.forEach(name => {
                results[name] = {
                    capacity: capacities[memberType(name)],
                    ratio: 0,
                    Pu: 0,
                    Mux: 0,
                    Muy: null,
                    axialRatio: 0,
                    momentRatio: 0,
                    combination: "—",
                    position: 0,
                    samples: 0
                };
            });

            let processed = 0;

            cases.forEach(item => {
                (item.members || []).forEach(member => {
                    const name = member.name;
                    if (!results[name]) return;

                    if (
                        !(Number(member.length) > 0) ||
                        !Number.isFinite(Number(member.axialStart)) ||
                        !Number.isFinite(Number(member.shearStart)) ||
                        !Number.isFinite(Number(member.momentStart)) ||
                        !Number.isFinite(Number(member.localLoadX)) ||
                        !Number.isFinite(Number(member.localLoadY))
                    ) {
                        throw new Error(
                            "اطلاعات نیروهای عضو «" + name + "» ناقص است."
                        );
                    }

                    const target = results[name];
                    target.samples++;
                    const cap = target.capacity;

                    getStations(member).forEach(x => {
                        const N = forceAt(member, "N", x);
                        const M = forceAt(member, "M", x);

                        // در قرارداد نمودارهای فعلی، N مثبت فشار است.
                        const Pu = Math.max(0, N);
                        const Mux = Math.abs(M);

                        const ratio = interactionRatio(
                            Pu,
                            Mux,
                            cap.phiPn,
                            cap.phiMnx
                        );

                        if (ratio > target.ratio) {
                            target.ratio = ratio;
                            target.Pu = Pu;
                            target.Mux = Mux;
                            target.axialRatio = Pu / cap.phiPn;
                            target.momentRatio = Mux / cap.phiMnx;
                            target.combination = item.name;
                            target.position = x;
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

            const rows = MEMBER_NAMES.map(name => {
                const r = results[name];
                const c = r.capacity;

                // نسبت فعلی فقط کنترل دوبعدی N-Mx است.
                const hasDemand = r.samples > 0;
                const pass = hasDemand && r.ratio <= 1;

                return `
                    <tr>
                        <td><b>${esc(name)}</b></td>
                        <td>${fmt(c.phiPn)}</td>
                        <td>${fmt(c.phiMnx)}</td>
                        <td>${fmt(c.phiMny)}</td>
                        <td>${hasDemand?fmt(r.Pu):"—"}</td>
                        <td>${hasDemand?fmt(r.Mux):"—"}</td>
                        <td>محاسبه نشده</td>
                        <td>${hasDemand?fmt(r.axialRatio):"—"}</td>
                        <td>${hasDemand?fmt(r.momentRatio):"—"}</td>
                        <td><b>${hasDemand?fmt(r.ratio):"—"}</b></td>
                        <td>${!hasDemand?"فاقد داده ـ کنترل نشد":pass ? "قبول مقدماتی دوبعدی" : "نیاز به بررسی"}</td>
                        <td>${esc(r.combination)}</td>
                        <td>${fmt(r.position)} m</td>
                        <td>${esc(c.axis)}</td>
                    </tr>
                `;
            }).join("");

            output.innerHTML = `
                <hr>
                <h4>کنترل اندرکنش نیروی محوری و خمش اعضا ـ نسخه ۳</h4>

                <p>
                    تعداد ترکیبات بار:
                    <b>${fmt(cases.length, 0)}</b>
                    |
                    تعداد اعضای بررسی‌شده:
                    <b>${fmt(processed / cases.length, 0)}</b>
                </p>

                <div style="overflow-x:auto">
                    <table style="
                        width:100%;
                        min-width:1650px;
                        border-collapse:collapse;
                        font-size:12px
                    ">
                        <thead>
                            <tr>
                                <th>عضو</th>
                                <th>φPn (kN)</th>
                                <th>φMnx (kN.m)</th>
                                <th>φMny (kN.m)</th>
                                <th>Pu (kN)</th>
                                <th>Mux (kN.m)</th>
                                <th>Muy (kN.m)</th>
                                <th>Pu/φPn</th>
                                <th>Mux/φMnx</th>
                                <th>نسبت اندرکنش</th>
                                <th>نتیجه</th>
                                <th>ترکیب حاکم</th>
                                <th>موقعیت</th>
                                <th>محور کمانش حاکم</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="notice">
                    <b>ظرفیت‌های خمشی مقطع</b>
                    <p>
                        ظرفیت محور قوی از ماژول کنترل خمشی دریافت شده است.
                    </p>
                    <p>
                        ظرفیت محور ضعیف از رابطه مقدماتی
                        φMny = 0.90 × Fy × Sy محاسبه شده است.
                    </p>
                    <p>
                        Sy ستون و رفتر از مشخصات مقطع واردشده توسط کاربر
                        خوانده می‌شود.
                    </p>
                </div>

                <div class="notice">
                    <b>روش کنترل فعلی</b>
                    <p>
                        برای Pu/φPn ≥ 0.20:
                        نسبت اندرکنش =
                        Pu/φPn + (8/9)(Mux/φMnx)
                    </p>
                    <p>
                        برای Pu/φPn کمتر از 0.20:
                        نسبت اندرکنش =
                        Pu/(2φPn) + Mux/φMnx
                    </p>
                    <p>
                        تمام ترکیبات بار و نقاط نمونه‌برداری‌شده در طول
                        اعضا بررسی می‌شوند.
                    </p>
                </div>

                <div class="notice" style="border-right:4px solid #d97706">
                    <b>محدودیت مهم: کنترل دومحوره هنوز کامل نیست</b>
                    <p>
                        مدل تحلیل فعلی دوبعدی است و فقط لنگر خمشی درون
                        صفحه قاب را محاسبه می‌کند. بنابراین تقاضای Muy
                        در دسترس نیست و در جدول «محاسبه نشده» نمایش داده
                        می‌شود.
                    </p>
                    <p>
                        ظرفیت محور ضعیف محاسبه شده، اما تا زمان افزودن
                        تحلیل سه‌بعدی و محاسبه تقاضای Muy، اندرکنش
                        واقعی N-Mx-My قابل تأیید نیست.
                    </p>
                    <p>
                        نیروی کششی محوری، کمانش جانبی‌پیچشی، کمانش
                        موضعی، اثرات مرتبه دوم و الزامات کامل آیین‌نامه‌ای
                        نیز در این کنترل لحاظ نشده‌اند.
                    </p>
                    <p>
                        عبارت «قبول مقدماتی دوبعدی» به معنی تأیید
                        طراحی اجرایی یا ایمنی سازه نیست.
                    </p>
                </div>
            `;

            analysis.interactionResults = results;

            if ($("projectStatus")) {
                $("projectStatus").textContent =
                    "کنترل مقدماتی اندرکنش N-Mx و ظرفیت محور ضعیف انجام شد؛ " +
                    "تقاضای خمش دومحوره نیازمند تحلیل سه‌بعدی است.";
            }

        } catch (error) {
            output.innerHTML = `
                <div class="notice" style="color:#b45309">
                    <b>خطا در کنترل اندرکنش:</b>
                    <p>${esc(error.message)}</p>
                </div>
            `;
        }
    }

    function createPanel() {
        if ($("interactionPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "interactionPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل اندرکنش اعضا</h3>
            </div>

            <div class="notice">
                کنترل مقدماتی نیروی محوری و خمش درون صفحه قاب،
                همراه با محاسبه ظرفیت خمشی محور ضعیف.
            </div>

            <button id="btnInteraction"
                class="btn primary" type="button">
                محاسبه کنترل اندرکنش N-M
            </button>

            <div id="interactionResults"></div>
        `;

        const design = $("memberDesignPanel");

        if (design && design.parentNode) {
            design.parentNode.insertBefore(panel, design.nextSibling);
        } else {
            document.querySelector("main")?.appendChild(panel);
        }

        $("btnInteraction").addEventListener("click", calculate);
    }

    function init() {
        createPanel();
    }

    window.SteelInteraction = {
        calculate,
        interactionRatio,
        getCapacities
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();


/* ===== steel2/js/shear.js ===== */

/* SAHROUD STEEL - Preliminary Shear Check */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function fmt(v) {
        return Number(v || 0).toLocaleString("fa-IR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getShearCapacity(member) {
        const sec = window.SteelSections.getDataSI();
        const mat = sec.material;

        const prefix = member === "column"
            ? "colGirder"
            : "rafGirder";

        const hw = Number($(prefix + "WebH")?.value);
        const tw = Number($(prefix + "WebT")?.value);

        if (!(hw > 0 && tw > 0 &&
              mat.Fy > 0 && mat.E > 0)) {
            throw new Error(
                "ابعاد جان و مشخصات فولاد معتبر نیست."
            );
        }

        // تبدیل میلی‌متر به متر
        const h = hw / 1000;
        const t = tw / 1000;

        const Aw = h * t;
        const ratio = h / t;

        const limit = 2.24 * Math.sqrt(mat.E / mat.Fy);

        let Cv;

        if (ratio <= limit) {
            Cv = 1;
        } else {
            const kv = 5.34;

            Cv =
                1.10 *
                Math.sqrt(kv * mat.E / mat.Fy) /
                ratio;
        }

        Cv = Math.min(1, Cv);

        // ظرفیت اسمی برشی تقریبی
        const Vn = 0.6 * mat.Fy * Aw * Cv;

        // ضریب مقاومت مقدماتی
        const phiVn = Vn;

        return {
            Aw,
            ratio,
            Cv,
            Vn: Vn / 1000,
            phiVn: phiVn / 1000
        };
    }

    function run() {
        const out = $("shearResults");

        try {
            if (!window.SteelAnalysis ||
                !Array.isArray(
                    window.SteelAnalysis.combinationResults
                ) ||
                !window.SteelAnalysis.combinationResults.length) {
                throw new Error(
                    "ابتدا تحلیل ترکیبات بار LRFD را اجرا کنید."
                );
            }

            if (!window.SteelSections ||
                !window.SteelGirder) {
                throw new Error(
                    "ماژول مقاطع یا تیرورق بارگذاری نشده است."
                );
            }

            const cases =
                window.SteelAnalysis.combinationResults;

            const names = [
                "ستون چپ",
                "ستون راست",
                "رفتر چپ",
                "رفتر راست"
            ];

            const results = [];

            names.forEach(name => {
                const type = name.includes("ستون")
                    ? "column"
                    : "rafter";

                const capacity = getShearCapacity(type);

                let worst = {
                    V: 0,
                    ratio: 0,
                    combination: "—",
                    end: "—"
                };

                cases.forEach(item => {
                    (item.members || []).forEach(member => {
                        if (member.name !== name) return;

                        const ends = [
                            {
                                V: Number(member.shearStart),
                                end: "ابتدا"
                            },
                            {
                                V: Number(member.shearEnd),
                                end: "انتها"
                            }
                        ];

                        ends.forEach(f => {
                            if (!Number.isFinite(f.V)) return;

                            const V = Math.abs(f.V);

                            const ratio =
                                capacity.phiVn > 0
                                    ? V / capacity.phiVn
                                    : Infinity;

                            if (ratio > worst.ratio) {
                                worst = {
                                    V,
                                    ratio,
                                    combination: item.name,
                                    end: f.end
                                };
                            }
                        });
                    });
                });

                results.push({
                    name,
                    capacity,
                    worst
                });
            });

            out.innerHTML = `
                <h4>نتایج کنترل مقدماتی برش</h4>

                <div style="overflow-x:auto">
                    <table style="width:100%;min-width:750px">
                        <thead>
                            <tr>
                                <th>عضو</th>
                                <th>Aw (m²)</th>
                                <th>Cv</th>
                                <th>φVn تقریبی (kN)</th>
                                <th>Vu (kN)</th>
                                <th>Vu/φVn</th>
                                <th>نتیجه</th>
                                <th>ترکیب حاکم</th>
                                <th>محل</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${results.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td>${fmt(r.capacity.Aw)}</td>
                                    <td>${fmt(r.capacity.Cv)}</td>
                                    <td>${fmt(r.capacity.phiVn)}</td>
                                    <td>${fmt(r.worst.V)}</td>
                                    <td>${fmt(r.worst.ratio)}</td>
                                    <td>
                                        ${
                                            r.worst.ratio <= 1
                                                ? "قبول مقدماتی"
                                                : "نیاز به بررسی"
                                        }
                                    </td>
                                    <td>${r.worst.combination}</td>
                                    <td>${r.worst.end}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <div class="notice">
                    <b>هشدار مهندسی</b>
                    <p>
                        این کنترل فقط تخمین مقدماتی مقاومت برشی جان
                        بر اساس ابعاد واردشده است.
                    </p>
                    <p>
                        اثر سوراخ‌ها، بازشوها، سخت‌کننده‌ها،
                        کمانش موضعی کامل، شرایط واقعی تیرورق،
                        ضوابط مبحث دهم و سایر الزامات طراحی
                        هنوز کنترل نشده‌اند.
                    </p>
                    <p>
                        نتیجه قبول مقدماتی به معنی تأیید طراحی
                        اجرایی یا ایمنی سازه نیست.
                    </p>
        `;
        } catch (error) {
            out.innerHTML = `
                <div class="notice">
                    خطا: ${error.message}
                </div>
            `;
        }
    }

    function init() {
        if ($("shearPanel")) return;

        const panel = document.createElement("section");
        panel.className = "panel";
        panel.id = "shearPanel";

        panel.innerHTML = `
            <div class="panel-title">
                <h3>کنترل مقدماتی مقاومت برشی اعضا</h3>
            </div>

            <button id="btnShear"
                class="btn primary" type="button">
                محاسبه کنترل برش
            </button>

            <div id="shearResults"></div>
        `;

        const interaction = $("interactionPanel");

        if (interaction && interaction.parentNode) {
            interaction.parentNode.insertBefore(
                panel,
                interaction.nextSibling
            );
        } else {
            document.querySelector("main")?.appendChild(panel);
        }

        $("btnShear").addEventListener("click", run);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();


/* ===== steel2/js/flexure.js ===== */

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
                    momentSign: "—",
                    samples: 0
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

                    results[name].samples++;
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
                const hasDemand = r.samples > 0;
                const pass = hasDemand && r.ratio <= 1;

                return `
                    <tr>
                        <td><b>${esc(name)}</b></td>
                        <td>${fmt(c.sxTopCm3)}</td>
                        <td>${fmt(c.sxBottomCm3)}</td>
                        <td>${fmt(c.sxMinCm3)}</td>
                        <td>${fmt(c.nominalKNm)}</td>
                        <td>${fmt(c.designKNm)}</td>
                        <td>${hasDemand?fmt(r.demand):"—"}</td>
                        <td>${hasDemand?fmt(r.ratio):"—"}</td>
                        <td>${!hasDemand?"فاقد داده ـ کنترل نشد":pass ? "قبول مقدماتی" : "نیاز به بررسی"}</td>
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


/* ===== steel2/js/final-report.js ===== */

/* SAHROUD STEEL - Final Aggregated Design Report
   Version 2.0
   Includes preliminary flexural capacity check
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
            const displacement = Number(item.maxDisplacement) * 1000;

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
                تقاضای اعضا و کنترل‌های طراحی
            </p>

            <button class="btn primary" id="btnFinalReport">
                تهیه گزارش نهایی
            </button>

            <button class="btn" id="btnPrintReport">
                چاپ / ذخیره PDF
            </button>

            <div id="finalReportResults"></div>
        `;

        const flexurePanel = $("flexurePanel");
        const shearPanel = $("shearPanel");

        if (flexurePanel) {
            flexurePanel.after(panel);
        } else if (shearPanel) {
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
                ["checkCombinationBuckling", "combinationBucklingResults"],
                ["btnFlexure", "flexureResults"]
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
            const scopeAudit = window.SteelMemberDesignScopeGate?.audit?.() || null;
            const scopeRows = scopeAudit?.rows?.map(row => `
                <tr>
                    <td>${esc(row.label)}</td>
                    <td>${fmt(row.memberCount, 0)}</td>
                    <td>${esc(row.status === "blocked" ? "مسدود" : "محدود و غیرنهایی")}</td>
                    <td>${esc((row.missing || []).join("؛ "))}</td>
                </tr>
            `).join("") || "";
            const scopeSummary = scopeAudit
                ? `گروه‌های عضو بررسی‌شده: ${scopeAudit.summary.groups}؛ گروه‌های مسدود: ${scopeAudit.summary.blocked}؛ گروه‌های دارای موتور محدود: ${scopeAudit.summary.limitedOnly}.`
                : "ممیزی دامنه طراحی اعضا در دسترس نیست؛ وضعیت طراحی تأییدنشده باقی می‌ماند.";

            const actionDemandRows = combos.flatMap(combo => (combo.members || []).map(member => {
                const f = Array.isArray(member.localEndForces) ? member.localEndForces : [];
                const valid = f.length >= 12 && f.slice(0, 12).every(value => Number.isFinite(Number(value)));
                const cell = (value, scale) => valid ? fmt(Number(value) / scale) : "—";
                const memberLabel = member.parentMemberId
                    ? String(member.parentMemberId) + " / " + String(member.id)
                    : String(member.id || "—");
                const taperLabel = member.taperApplied
                    ? "متغیرمقطع ـ قطعه " + String(member.taperSegmentIndex || "—") + " از " + String(member.taperSegmentCount || "—")
                    : "منشوری";
                return `
                    <tr>
                        <td>${esc(combo.id || combo.label || combo.name || "—")}</td>
                        <td>${esc(memberLabel)}</td>
                        <td>${esc(taperLabel)}</td>
                        <td>${cell(f[0],1000)}</td><td>${cell(f[1],1000)}</td><td>${cell(f[2],1000)}</td>
                        <td>${cell(f[3],1000)}</td><td>${cell(f[4],1000)}</td><td>${cell(f[5],1000)}</td>
                        <td>${cell(f[6],1000)}</td><td>${cell(f[7],1000)}</td><td>${cell(f[8],1000)}</td>
                        <td>${cell(f[9],1000)}</td><td>${cell(f[10],1000)}</td><td>${cell(f[11],1000)}</td>
                        <td>${valid ? "کامل" : "ناقص ـ غیرقابل استفاده برای طراحی"}</td>
                    </tr>`;
            })).join("");
            const actionDemandCount = combos.reduce((sum, combo) => sum + (Array.isArray(combo.members) ? combo.members.length : 0), 0);

            let html = `
                <div id="printableFinalReport">

                    <h2>گزارش محاسبات مقدماتی سازه فولادی — غیرقابل استفاده برای اجرا</h2>
                    <div class="notice" style="border:2px solid #b91c1c;padding:12px">
                        <b>وضعیت قطعی این گزارش: طراحی تأیید نشده است.</b>
                        <p>این خروجی صرفاً تجمیع نتایج موجود نرم‌افزار است؛ نقشه ساخت، دفترچه محاسبات نهایی یا مجوز اجرا نیست.</p>
                        <p>${esc(scopeSummary)}</p>
                    </div>

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
                        <h3>۳. جابه‌جایی و واکنش تکیه‌گاهی</h3>

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
                                واکنش‌های افقی و قائم از مؤلفه‌های نیرو
                                و واکنش لنگری از مؤلفه دوران تکیه‌گاه‌ها
                                استخراج شده‌اند.
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
                ],
                [
                    "۸. کنترل مقدماتی ظرفیت خمشی اعضا",
                    $("flexureResults")
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
                        <h3>۹. ممیزی دامنه طراحی اعضا و موارد مسدودکننده</h3>
                        <div class="notice">
                            <b>نتیجه ممیزی:</b> هیچ گروه عضوی از این مسیر مجوز طراحی اجرایی دریافت نمی‌کند.
                            <p>${esc(scopeSummary)}</p>
                        </div>
                        <div style="overflow-x:auto">
                            <table>
                                <thead><tr><th>گروه عضو</th><th>تعداد</th><th>وضعیت</th><th>موارد تکمیل‌نشده</th></tr></thead>
                                <tbody>${scopeRows || '<tr><td colspan="4">ممیزی دامنه طراحی در دسترس نیست.</td></tr>'}</tbody>
                            </table>
                        </div>
                    </section>

                    <section class="report-section">
                        <h3>۱۰. دفتر نیروهای هم‌زمان اعضا در تحلیل سه‌بعدی</h3>
                        <div class="notice">
                            این جدول، بردار شش‌مؤلفه‌ای هم‌زمان هر عضو را در هر حالت تحلیل و در دو انتهای I و J نگه می‌دارد؛ مؤلفه‌های حاکم از ترکیب‌های متفاوت با یکدیگر مخلوط نشده‌اند.
                            نیروها بر حسب kN و لنگرها/پیچش بر حسب kN.m هستند. اعضای متغیرمقطع به تفکیک قطعه تحلیل نمایش داده می‌شوند.
                            این دفتر فقط تقاضای تحلیل است و به‌تنهایی کنترل ظرفیت، پایداری یا تأیید آیین‌نامه‌ای نیست.
                            تعداد رکوردهای عضو/حالت: ${fmt(actionDemandCount,0)}.
                        </div>
                        <div style="overflow-x:auto">
                            <table>
                                <thead>
                                    <tr>
                                        <th rowspan="2">حالت بار</th><th rowspan="2">شناسه عضو / قطعه</th><th rowspan="2">نوع مقطع</th>
                                        <th colspan="6">انتهای I</th><th colspan="6">انتهای J</th><th rowspan="2">کامل بودن</th>
                                    </tr>
                                    <tr>
                                        <th>N</th><th>Vy</th><th>Vz</th><th>T</th><th>My</th><th>Mz</th>
                                        <th>N</th><th>Vy</th><th>Vz</th><th>T</th><th>My</th><th>Mz</th>
                                    </tr>
                                </thead>
                                <tbody>${actionDemandRows || '<tr><td colspan="16">نیروهای انتهایی سه‌بعدی در خروجی موجود نیستند.</td></tr>'}</tbody>
                            </table>
                        </div>
                    </section>

                    <section class="report-section">
                        <h3>۱۱. محدودیت‌ها و هشدارهای مهندسی</h3>

                        <div class="notice">
                            <p>
                                این گزارش تجمیع نتایج محاسبات موجود برنامه است.
                            </p>

                            <p>
                                تحلیل قاب فعلی خطی و مرتبه اول است.
                            </p>

                            <p>
                                بیشینه جابه‌جایی گزارش‌شده، مقدار انتقالی
                                گره‌هاست و کنترل تغییرمکان مجاز آیین‌نامه‌ای
                                به‌صورت مستقل در این مرحله انجام نشده است.
                            </p>

                            <p>
                                کنترل‌های اندرکنش، برش و کمانش مقدماتی هستند
                                و تأیید طراحی اجرایی محسوب نمی‌شوند.
                            </p>

                            <p>
                                کنترل ظرفیت خمشی فعلی فقط برآورد اولیه
                                تسلیم خمشی الاستیک است؛ کمانش جانبی‌پیچشی،
                                کمانش موضعی، ضریب Cb، ظرفیت پلاستیک و
                                اندرکنش کامل نیروها در آن لحاظ نشده‌اند.
                            </p>

                            <p>
                                کنترل کامل کمانش موضعی، کمانش پیچشی،
                                اثرات مرتبه دوم، اتصالات، ورق‌های تقویتی
                                و فونداسیون باید جداگانه انجام شود.
                            </p>

                            <p>
                                صحت طول‌های مهارنشده و ضرایب K باید
                                توسط مهندس مسئول بررسی شود.
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

