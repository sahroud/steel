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
        const normalizedGrade=/ST52/i.test(storedGrade)?"ST52-3":/ST37|S235/i.test(storedGrade)?"ST37-2":"CUSTOM";
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
        const t=Number(thick?.value||10),g=grade.value,defaults=getMaterialDefaults(g,t);
        if(defaults.Fy_MPa!==null)fy.value=String(defaults.Fy_MPa);else fy.value="";
        if(defaults.Fu_MPa!==null)fu.value=String(defaults.Fu_MPa);else fu.value="";
        if(note){
            if(g==="CUSTOM")note.textContent="گرید سفارشی انتخاب شده است؛ نام دقیق فولاد و مقادیر Fy و Fu را از استاندارد محصول یا گواهی کارخانه وارد کنید.";
            else note.textContent=defaults.source+"؛ ضخامت "+t+" mm، Fy="+(defaults.Fy_MPa??"نامشخص")+" MPa، Fu حداقل="+(defaults.Fu_MPa??"نامشخص")+" MPa (بازه کششی مرجع "+(defaults.FuRange_MPa?.join("–")||"نامشخص")+"). این اعداد جایگزین گواهی مصالح نیستند.";
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