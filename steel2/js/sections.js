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
                    <label for="steelGrade">نوع فولاد</label>
                    <input id="steelGrade" type="text"
                        value="ST37 / مقدار نیازمند تأیید">
                    <div class="field">
                    <label for="steelG">مدول برشی G (GPa)</label>
                    <input id="steelG" type="number" min="1" step="0.1"
                        value="80" placeholder="مقدار معتبر مصالح">
                </div>
            </div>
                <div class="field">
                    <label for="steelE">مدول الاستیسیته E (GPa)</label>
                    <input id="steelE" type="number"
                        min="1" step="1" value="200">
                </div>
                <div class="field">
                    <label for="steelFy">تنش تسلیم Fy (MPa)</label>
                    <input id="steelFy" type="number"
                        min="1" step="1" value="235">
                </div>
            </div>

            <div class="notice">
                مقدار ۲۳۵ مگاپاسکال نمونه اولیه است.
                مقدار واقعی باید با توجه به استاندارد محصول،
                ضخامت ورق و گواهی مصالح تعیین شود.
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

        const provenanceGroups=[
          ["column","ستون"],["rafter","رفتر"],["roofPurlin","پرلین سقف"],
          ["wallGirt","قید دیوار"],["endPost","ستونک انتهایی"],["endGirt","تیر انتهایی"],
          ["wallBrace","مهاربند دیوار"],["roofBrace","مهاربند سقف"],["roofEdge","تیر لبه سقف"]
        ];
        const provenance=document.createElement("details");
        provenance.className="sub-panel";
        provenance.id="sectionProvenancePanel";
        provenance.innerHTML='<summary>هـ ـ شناسنامه و مستندات هر مقطع</summary>'+
          '<div class="notice">برای هر گروه، نام سازنده/کاتالوگ و شماره سند یا نقشه و صفحه را وارد کنید. تیک تأیید فقط پس از تطبیق مستقل با مدرک واقعی زده شود؛ ورود اطلاعات به‌تنهایی تأیید فنی نیست.</div>'+
          provenanceGroups.map(([key,label])=>'<div class="sub-panel"><h4>'+label+'</h4><div class="form-grid">'+
            '<div class="field"><label for="sp_'+key+'_profile">نام دقیق مقطع/مدل</label><input id="sp_'+key+'_profile" type="text"></div>'+
            '<div class="field"><label for="sp_'+key+'_manufacturer">سازنده/تولیدکننده</label><input id="sp_'+key+'_manufacturer" type="text"></div>'+
            '<div class="field"><label for="sp_'+key+'_document">شناسه سند/نقشه یا لینک مرجع</label><input id="sp_'+key+'_document" type="text"></div>'+
            '<div class="field"><label for="sp_'+key+'_catalog">شماره کاتالوگ/استاندارد</label><input id="sp_'+key+'_catalog" type="text"></div>'+
            '<div class="field"><label for="sp_'+key+'_page">شماره صفحه/جزئیات</label><input id="sp_'+key+'_page" type="text"></div>'+
            '<div class="field"><label><input id="sp_'+key+'_verified" type="checkbox"> مشخصات با مدرک واقعی تطبیق و تأیید شد</label></div>'+
            '</div></div>').join("");
        if(validationButtons) panel.insertBefore(provenance,validationButtons);
        else panel.appendChild(provenance);

        const girderBuilder=document.createElement("details");
        girderBuilder.className="sub-panel";
        girderBuilder.id="builtUpGirderBuilder";
        girderBuilder.innerHTML=`
          <summary>محاسبه هندسی تیرورق ستون و رفتر از روی ابعاد ورق‌ها</summary>
          <div class="notice">ابعاد واقعی را بر حسب میلی‌متر وارد کنید. ابزار، مساحت، مرکز سطح، ممان‌های اینرسی و مدول‌های مقطع ناخالص را محاسبه و در فیلدهای ستون/رفتر درج می‌کند. برای ستون و رفتر در صفحه قاب X-Y، محور قوی به Iz و محور ضعیف به Iy نگاشت می‌شود. این نگاشت برای اعضای طولی مانند پرلین معتبر فرض نمی‌شود. مقدار J فقط تقریب مقطع نازک‌جداره باز است و خودکار وارد تحلیل نمی‌شود.</div>
          ${["column","rafter"].map((key)=>`
            <h4>${key==="column"?"تیرورق ستون":"تیرورق رفتر"}</h4>
            <div class="form-grid">
              <div class="field"><label for="bg_${key}_bt">عرض بال بالا (mm)</label><input id="bg_${key}_bt" type="number" min="1" step="0.1"></div>
              <div class="field"><label for="bg_${key}_tt">ضخامت بال بالا (mm)</label><input id="bg_${key}_tt" type="number" min="1" step="0.1"></div>
              <div class="field"><label for="bg_${key}_bb">عرض بال پایین (mm)</label><input id="bg_${key}_bb" type="number" min="1" step="0.1"></div>
              <div class="field"><label for="bg_${key}_tb">ضخامت بال پایین (mm)</label><input id="bg_${key}_tb" type="number" min="1" step="0.1"></div>
              <div class="field"><label for="bg_${key}_hw">ارتفاع خالص جان (mm)</label><input id="bg_${key}_hw" type="number" min="1" step="0.1"></div>
              <div class="field"><label for="bg_${key}_tw">ضخامت جان (mm)</label><input id="bg_${key}_tw" type="number" min="1" step="0.1"></div>
            </div>
            <button type="button" class="btn secondary" id="bg_${key}_calculate">محاسبه و درج خواص هندسی ${key==="column"?"ستون":"رفتر"}</button>
            <div class="notice" id="bg_${key}_result">هنوز محاسبه نشده است.</div>
          `).join("")}
        `;
        if(validationButtons) panel.insertBefore(girderBuilder,validationButtons);
        else panel.appendChild(girderBuilder);

        function calculateBuiltUpFor(prefix){
          const readDim=suffix=>Number($("bg_"+prefix+"_"+suffix).value);
          const input={
            profile:"تیرورق I ساخته‌شده",
            topFlangeWidthMm:readDim("bt"),topFlangeThicknessMm:readDim("tt"),
            bottomFlangeWidthMm:readDim("bb"),bottomFlangeThicknessMm:readDim("tb"),
            webClearHeightMm:readDim("hw"),webThicknessMm:readDim("tw")
          };
          const resultBox=$("bg_"+prefix+"_result");
          try{
            if(!window.SahroudBuiltUpSection?.calculateBuiltUpISection)
              throw new Error("ماژول محاسبه هندسی تیرورق بارگذاری نشده است.");
            const r=window.SahroudBuiltUpSection.calculateBuiltUpISection(input);
            $(prefix+"Profile").value=input.profile;
            $(prefix+"A").value=r.areaCm2.toFixed(4);
            $(prefix+"Ix").value=r.strongAxis.inertiaCm4.toFixed(4);
            $(prefix+"Iy").value=r.weakAxis.inertiaCm4.toFixed(4);
            $(prefix+"SxTop").value=r.strongAxis.sectionModulusTopCm3.toFixed(4);
            $(prefix+"SxBottom").value=r.strongAxis.sectionModulusBottomCm3.toFixed(4);
            $(prefix+"Sy").value=r.weakAxis.sectionModulusCm3.toFixed(4);
            resultBox.textContent="محاسبه هندسی انجام شد: A="+r.areaCm2.toFixed(3)+" cm²؛ مرکز سطح از پایین="+r.centroidYFromBottomMm.toFixed(2)+" mm؛ Ix قوی="+r.strongAxis.inertiaCm4.toFixed(3)+" cm⁴؛ Iy ضعیف="+r.weakAxis.inertiaCm4.toFixed(3)+" cm⁴؛ J تقریبی="+r.torsion.JApproxCm4.toFixed(3)+" cm⁴. J به فیلد تحلیل منتقل نشده است؛ مقدار معتبر آن باید جداگانه تعیین شود. این نتیجه کنترل مقاومت یا انطباق آیین‌نامه‌ای نیست.";
            resultBox.style.color="#92400e";
          }catch(error){
            resultBox.textContent="محاسبه انجام نشد: "+error.message;
            resultBox.style.color="#b45309";
          }
        }
        ["column","rafter"].forEach(key=>$("bg_"+key+"_calculate").addEventListener("click",()=>calculateBuiltUpFor(key)));
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

    function readSectionProvenance(key) {
        const value=suffix=>String($("sp_"+key+"_"+suffix)?.value||"").trim();
        return {
            profile:value("profile"),
            manufacturer:value("manufacturer"),
            sourceDocumentId:value("document"),
            catalogReference:[value("manufacturer"),value("catalog"),value("page")].filter(Boolean).join(" | "),
            sourcePage:value("page"),
            sectionDataVerified:!!$("sp_"+key+"_verified")?.checked
        };
    }

    function read() {
        return {
            material: {
                grade: $("steelGrade").value.trim(),
                E_GPa: Number($("steelE").value),
                Fy_MPa: Number($("steelFy").value)
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
                            J_cm4:Number($(key+"J3D")?.value),
                            ...readSectionProvenance(key)
                        }];
                    }
                    return [key,{
                        A_cm2:Number($("p3_"+key+"_A")?.value),
                        Iy_cm4:Number($("p3_"+key+"_Iy")?.value),
                        Iz_cm4:Number($("p3_"+key+"_Iz")?.value),
                        J_cm4:Number($("p3_"+key+"_J")?.value),
                        ...readSectionProvenance(key)
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
                Fy: d.material.Fy_MPa * 1e6
            },
            column: convertMemberToSI(d.column),
            rafter: convertMemberToSI(d.rafter)
        };
    }

    function resolveAnalysis3DSection(member) {
        if (!member || typeof member !== "object") throw new Error("مشخصات عضو برای تخصیص مقطع سه‌بعدی معتبر نیست.");
        const key = String(member.sectionKey || "");
        const labels = {column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید افقی دیوار",endPost:"ستونک دیوار انتهایی",endGirt:"تیر افقی دیوار انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
        if (!Object.prototype.hasOwnProperty.call(labels,key)) throw new Error("گروه مقطع عضو " + (member.id || "") + " مشخص نیست؛ sectionKey=" + key);
        const d=read(), p=d.analysis3d?.groups?.[key], E=Number(d.material?.E_GPa), G=Number(d.analysis3d?.G_GPa);
        if (!(Number.isFinite(E)&&E>0)) throw new Error("مدول الاستیسیته E فولاد برای تحلیل سه‌بعدی معتبر نیست.");
        if (!(Number.isFinite(G)&&G>0)) throw new Error("مدول برشی G را در پنل مشخصات تکمیلی مقاطع وارد کنید.");
        if (!p) throw new Error("اطلاعات مقطع گروه " + labels[key] + " یافت نشد.");
        const required=[["A_cm2","مساحت A (cm²)"],["Iy_cm4","ممان اینرسی Iy (cm⁴)"],["Iz_cm4","ممان اینرسی Iz (cm⁴)"],["J_cm4","ثابت پیچشی J (cm⁴)"]];
        const missing=required.find(([field])=>!(Number.isFinite(Number(p[field]))&&Number(p[field])>0));
        if(missing) throw new Error("برای گروه " + labels[key] + "، مقدار " + missing[1] + " خالی یا نامعتبر است. مقدار واقعی مقطع را وارد کنید.");
        const profile=p.profile||(key==="column"||key==="rafter"?d[key].profile:"");
        return {E:E*1e9,G:G*1e9,A:Number(p.A_cm2)*1e-4,Iy:Number(p.Iy_cm4)*1e-8,Iz:Number(p.Iz_cm4)*1e-8,J:Number(p.J_cm4)*1e-8,sectionKey:key,sectionLabel:labels[key],profile,manufacturer:p.manufacturer||"",sourceDocumentId:p.sourceDocumentId||"",catalogReference:p.catalogReference||"",sourcePage:p.sourcePage||"",sectionDataVerified:p.sectionDataVerified===true};
    }
    function setData(data) {
        if (!data || typeof data !== "object") return;

        const fields = {
            steelGrade: data.material?.grade,
            steelE: data.material?.E_GPa,
            steelFy: data.material?.Fy_MPa,

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

            if (element && value !== undefined && value !== null) {
                element.value = value;
            }
        });

        Object.entries(data.analysis3d?.groups||{}).forEach(([key,p])=>{
            const values={profile:p.profile,manufacturer:p.manufacturer,document:p.sourceDocumentId,
                catalog:p.catalogReference,page:p.sourcePage};
            Object.entries(values).forEach(([suffix,value])=>{
                const el=$("sp_"+key+"_"+suffix);
                if(el&&value!==undefined&&value!==null)el.value=value;
            });
            const verified=$("sp_"+key+"_verified");
            if(verified)verified.checked=p.sectionDataVerified===true;
        });

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
            "نوع فولاد را وارد کنید.");

        check("steelE",
            Number.isFinite(d.material.E_GPa) &&
            d.material.E_GPa > 0,
            "مدول الاستیسیته معتبر نیست.");

        check("steelFy",
            Number.isFinite(d.material.Fy_MPa) &&
            d.material.Fy_MPa > 0,
            "تنش تسلیم معتبر نیست.");

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

        // A green result must cover every 3D section group and its source evidence.
        const groups = [
            ["column","ستون"],["rafter","رفتر"],["roofPurlin","پرلین سقف"],
            ["wallGirt","قید دیوار"],["endPost","ستونک انتهایی"],["endGirt","تیر انتهایی"],
            ["wallBrace","مهاربند دیوار"],["roofBrace","مهاربند سقف"],["roofEdge","تیر لبه سقف"]
        ];
        groups.forEach(([key,title]) => {
            const provenance = readSectionProvenance(key);
            const isMain = key === "column" || key === "rafter";
            const props = isMain ? {
                A: d[key].A_cm2, Iy: d[key].Iy_cm4, Iz: d[key].Ix_cm4,
                J: Number($(key + "J3D")?.value)
            } : {
                A: Number($("p3_" + key + "_A")?.value),
                Iy: Number($("p3_" + key + "_Iy")?.value),
                Iz: Number($("p3_" + key + "_Iz")?.value),
                J: Number($("p3_" + key + "_J")?.value)
            };
            const profile = provenance.profile || (isMain ? d[key].profile : "");
            check(isMain ? key + "Profile" : "sp_" + key + "_profile",
                !!profile, "نام دقیق مقطع " + title + " ثبت نشده است.");
            Object.entries(props).forEach(([name,value]) => {
                const id = isMain
                    ? key + (name === "A" ? "A" : name === "Iy" ? "Iy" : name === "Iz" ? "Ix" : "J3D")
                    : "p3_" + key + "_" + name;
                check(id, Number.isFinite(value) && value > 0,
                    name + " مقطع " + title + " ناقص یا نامعتبر است.");
            });
            check("sp_" + key + "_manufacturer", !!provenance.manufacturer,
                "سازنده مقطع " + title + " مشخص نشده است.");
            check("sp_" + key + "_document", !!provenance.sourceDocumentId,
                "سند/نقشه مرجع مقطع " + title + " مشخص نشده است.");
            check("sp_" + key + "_catalog", !!provenance.catalogReference,
                "شماره کاتالوگ/استاندارد مقطع " + title + " مشخص نشده است.");
            check("sp_" + key + "_page", !!provenance.sourcePage,
                "صفحه/جزئیات مرجع مقطع " + title + " مشخص نشده است.");
            check("sp_" + key + "_verified", provenance.sectionDataVerified === true,
                "تطبیق مقطع " + title + " با مدرک واقعی تأیید نشده است.");
        });

        const message = $("sectionMessage");

        if (message) {
            if (errors.length) {
                message.textContent =
                    "اطلاعات ناقص یا نامعتبر است: " + errors.join(" ");
                message.style.color = "#b45309";
            } else {
                message.textContent =
                    "ورودی هندسی، خواص و شناسنامه همه ۹ گروه مقطع تکمیل و تیک تطبیق ثبت شده است. " +
                    "این کنترل، محاسبه ظرفیت یا تأیید آیین‌نامه‌ای نیست.";
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

    function init() {
        createPanel();
        installAnalysisChecks();
    }

    window.SteelSections = {
        read,
        getDataSI,
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