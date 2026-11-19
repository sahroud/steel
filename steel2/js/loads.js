

/* SAHROUD STEEL - Load Management 1.0
   Load input and preliminary load combinations
   Units: kN/m2
   This module manages input only.
   It does NOT apply code combinations to structural analysis.
*/
(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const state = {
        deadLeft: 0.50,
        deadRight: 0.50,
        deadRoofOtherLeft: 0.50,
        deadRoofOtherRight: 0.50,
        deadRoofComponents: {
            covering:{left:0,right:0}, insulation:{left:0,right:0},
            liner:{left:0,right:0}, ceiling:{left:0,right:0},
            equipment:{left:0,right:0}, other:{left:0,right:0}
        },
        wallDeadLeft: 0,
        wallDeadRight: 0,
        wallDeadSupportPath: "foundation",
        endWallDeadFront: 0,
        endWallDeadBack: 0,
        liveLeft: 0.75,
        liveRight: 0.75,
        snowLeft: 1.0,
        snowRight: 1.0,
        deadAreaBasis: "unspecified",
        liveAreaBasis: "unspecified",
        snowAreaBasis: "unspecified",
        windLeft: 0,
        windRight: 0,
        windWall: 0,
        windEndFront: 0,
        windEndBack: 0,
        windDirection: "left-to-right",
        note: "",
        climate: {
            city: "shahroud",
            customCity: "شاهرود",
            elevation: "1350",
            source: "مبحث ششم ۱۳۹۸؛ سرعت باد ۹۰ km/h مطابق جدول ۶-۱۰-۱ مبحث ششم ۱۳۹۸؛ ارتفاع ۱۳۵۰ متر برآورد تقریبی مرکز شهرک صنعتی شاهرود",
            groundSnow: "1.0",
            basicWind: "90",
            terrain: "suburban",
            topography: "normal",
            buildingUse: "warehouse-industrial",
            openingState: "enclosed",
            openingArea: 25,
            envelopeArea: "",
            dominantOpening: "no"
        }
    };

    const combinations = [
        { name: "ULS-1 ـ 1.4D", dead: 1.4, live: 0, snow: 0 },
        { name: "ULS-2 ـ 1.2D + 1.6L + 0.5S", dead: 1.2, live: 1.6, snow: 0.5 },
        { name: "ULS-3 ـ 1.2D + 1.6S + 0.5L", dead: 1.2, live: 0.5, snow: 1.6 }
    ];

    let initialized = false;

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function input(id, label, value, allowNegative) {
        return `
            <div class="field">
                <label for="${id}">${label} (kN/m²)</label>
                <input
                    id="${id}"
                    type="number"
                    step="0.01"
                    ${allowNegative ? "" : 'min="0"'}
                    value="${value}"
                >
            </div>
        `;
    }

    function panelHTML() {
        return `
        <section class="panel" id="advancedLoadPanel">

            <div class="panel-title">
                <h3>۹ ـ مدیریت تفکیکی بارگذاری</h3>
                <span class="status">ورود اطلاعات</span>
            </div>

            <div class="notice">
                بارها به صورت سطحی و بر حسب kN/m² وارد می‌شوند. پیش‌فرض شاهرود: Pg=1.0 kN/m² (منطقه برف ۳)، سرعت مبنای باد V=90 km/h مطابق جدول ۶-۱۰-۱ مبحث ششم ۱۳۹۸؛ فشار مبنا q به‌صورت خودکار از رابطه آیین‌نامه‌ای محاسبه می‌شود.
                بار برف حداقل بام برای شیب ۲۰٪ و فرض ضریب اهمیت ۱، برابر ۱٫۰ kN/m² منظور شده است. مقادیر سقف چپ و راست مستقل هستند.
                ورودی‌های باد در این مرحله فشار خالص دستی هستند؛ مثبت به معنی فشار به داخل و منفی به معنی مکش به بیرون است.
            </div>


            <h4>الف ـ محل پروژه و اطلاعات اقلیمی</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="climateCity">شهر پروژه</label>
                    <select id="climateCity">
                        <option value="shahroud">شاهرود (پیش‌فرض)</option>
                        <option value="semnan">سمنان</option>
                        <option value="tehran">تهران</option>
                        <option value="mashhad">مشهد</option>
                        <option value="tabriz">تبریز</option>
                        <option value="isfahan">اصفهان</option>
                        <option value="yazd">یزد</option>
                        <option value="rasht">رشت</option>
                        <option value="sari">ساری</option>
                        <option value="kerman">کرمان</option>
                        <option value="other">سایر شهرها / ورود دستی</option>
                    </select>
                </div>
                <div class="field">
                    <label for="climateCustomCity">نام شهر یا محل دقیق پروژه</label>
                    <input id="climateCustomCity" type="text" value="شاهرود" placeholder="نام شهر، روستا یا محدوده">
                </div>
                <div class="field">
                    <label for="climateElevation">ارتفاع محل از سطح دریا (متر)</label>
                    <input id="climateElevation" type="number" min="-500" max="6000" step="1" value="">
                </div>
                <div class="field">
                    <label for="climateSource">منبع داده اقلیمی</label>
                    <input id="climateSource" type="text" value="ورود دستی مهندس / نیازمند تطبیق با مبحث ششم ۱۳۹۸">
                </div>
            </div>

            <h4>ب ـ پارامترهای اقلیمی ورودی (مقادیر تأییدنشده را خالی بگذارید)</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="climateGroundSnow">بار برف مبنا Ps (kN/m²)</label>
                    <input id="climateGroundSnow" type="number" min="0" step="0.01" placeholder="از جدول/نقشه معتبر">
                </div>
                <div class="field">
                    <label for="climateBasicWind">سرعت مبنای باد (km/h)</label>
                    <input id="climateBasicWind" type="number" min="0" step="0.1" placeholder="از جدول ۶-۱۰-۱؛ km/h">
                </div>
                <div class="field">
                    <label for="climateTerrain">رده زبری / مواجهه زمین</label>
                    <select id="climateTerrain">
                        <option value="">انتخاب نشده</option>
                        <option value="open">باز و هموار</option>
                        <option value="suburban">حومه و موانع پراکنده</option>
                        <option value="urban">شهری و متراکم</option>
                    </select>
                </div>
                <div class="field">
                    <label for="climateTopography">شرایط توپوگرافی</label>
                    <select id="climateTopography">
                        <option value="normal">عادی / بدون اثر ویژه ثبت‌شده</option>
                        <option value="hill">تپه یا یال مرتفع</option>
                        <option value="valley">دره یا گذرگاه باد</option>
                        <option value="manual">نیازمند بررسی دستی</option>
                    </select>
                </div>
            </div>

            <h4>ج ـ کاربری و وضعیت پوسته ساختمان</h4>
            <div class="notice">
                نوع ساختمان و وضعیت بازشوها برای هر پروژه قابل انتخاب است. حالت پیش‌فرض، سالن صنعتی با درهای قابل‌بستن و بسته در شرایط طراحی باد است. طبقه‌بندی نهایی بازشوها باید با مساحت واقعی و ضوابط مبحث ششم کنترل شود.
            </div>
            <div class="form-grid">
                <div class="field">
                    <label for="buildingUse">نوع کاربری ساختمان</label>
                    <select id="buildingUse">
                        <option value="warehouse-industrial">سالن صنعتی / انبار</option>
                        <option value="commercial">تجاری</option>
                        <option value="agricultural">کشاورزی</option>
                        <option value="workshop">کارگاه</option>
                        <option value="other">سایر / سفارشی</option>
                    </select>
                </div>
                <div class="field">
                    <label for="buildingOpeningState">وضعیت پوسته در شرایط طراحی باد</label>
                    <select id="buildingOpeningState">
                        <option value="enclosed" selected>بسته؛ درهای قابل‌بستن بسته‌اند (پیش‌فرض)</option>
                        <option value="partially-enclosed">نیمه‌بسته / دارای بازشوی غالب</option>
                        <option value="open">باز / فاقد پوسته مؤثر در یک یا چند وجه</option>
                    </select>
                </div>
                <div class="field">
                    <label for="buildingDominantOpening">وجود بازشوی غالب طبق تعریف آیین‌نامه</label>
                    <select id="buildingDominantOpening">
                        <option value="unknown" selected>نامشخص؛ نیازمند بررسی</option>
                        <option value="yes">بله</option>
                        <option value="no">خیر</option>
                    </select>
                </div>
                <div class="field">
                    <label for="buildingOpeningArea">مساحت تقریبی درها و بازشوهای معمولی (m²) ـ اطلاعات ثبت‌شده</label>
                    <input id="buildingOpeningArea" type="number" min="0" step="0.1" value="25">
                </div>
                <div class="field">
                    <label for="buildingEnvelopeArea">مساحت تقریبی پوسته مورد بررسی (m²)</label>
                    <input id="buildingEnvelopeArea" type="number" min="0" step="0.1" placeholder="مساحت دیوارها و پوسته">
                </div>
            </div>
            <div class="notice" id="climateNotice">
                پیش‌فرض شاهرود: Pg=1.0 kN/m²، منطقه ۳؛ V=90 km/h مطابق جدول ۶-۱۰-۱ مبحث ششم ۱۳۹۸. ارتفاع محل ۱۳۵۰ متر و زبری زمین «حومه و موانع پراکنده» به‌صورت مقدماتی ثبت شده‌اند.
            </div>
            <div class="notice" id="windReferenceResult">
                فشار مبنای باد پس از بارگذاری اطلاعات محاسبه می‌شود.
            </div>

            <h4>مبنای سطح هر بار ثقلی سقف</h4>
            <div class="form-grid">
                <div class="field">
                    <label for="deadAreaBasis">مبنای بار مرده سقف</label>
                    <select id="deadAreaBasis">
                        <option value="unspecified">انتخاب نشده</option>
                        <option value="horizontal-projection">تصویر افقی سقف</option>
                        <option value="sloped-surface">سطح واقعی شیب‌دار سقف</option>
                    </select>
                </div>
                <div class="field">
                    <label for="liveAreaBasis">مبنای بار زنده سقف</label>
                    <select id="liveAreaBasis">
                        <option value="unspecified">انتخاب نشده</option>
                        <option value="horizontal-projection">تصویر افقی سقف</option>
                        <option value="sloped-surface">سطح واقعی شیب‌دار سقف</option>
                    </select>
                </div>
                <div class="field">
                    <label for="snowAreaBasis">مبنای بار برف سقف</label>
                    <select id="snowAreaBasis">
                        <option value="unspecified">انتخاب نشده</option>
                        <option value="horizontal-projection">تصویر افقی سقف</option>
                        <option value="sloped-surface">سطح واقعی شیب‌دار سقف</option>
                    </select>
                </div>
            </div>
            <div class="notice">
                مبنای هر بار باید با منبع محاسبه همان بار یکسان باشد؛ این سه بار لزوماً مبنای یکسان ندارند. در حالت تصویر افقی، عرض بارگیر روی شیب در cos(زاویه سقف) ضرب می‌شود؛ در حالت سطح شیب‌دار این تبدیل انجام نمی‌شود. پروژه‌های قدیمی فاقد مبنای صریح با وضعیت «انتخاب نشده» باز می‌شوند و تا تعیین مبنا تحلیل آن بار متوقف می‌ماند.
            </div>

            <h4>د ـ اجزای بار مرده سقف (تفکیک‌شده)</h4>
            <div class="notice">وزن هر جزء را از کاتالوگ سازنده، نقشه یا صورت‌مشخصات وارد کنید. واحد همه ورودی‌ها kN/m² است و برای شیب چپ و راست جداگانه ثبت می‌شود. بار تجهیزات فقط وقتی به‌صورت بار سطحی معادل‌سازی شده وارد شود؛ بار متمرکز تجهیزات باید جداگانه مدل شود. وزن اعضای فولادی مدل‌شده از خودوزن مقاطع محاسبه می‌شود و نباید دوباره در این جدول وارد شود.</div>
            <div class="form-grid">
                ${input("loadDeadLeft", "سایر بار مرده سقف ـ چپ (خارج از اقلام زیر)", state.deadRoofOtherLeft, false)}
                ${input("loadDeadRight", "سایر بار مرده سقف ـ راست (خارج از اقلام زیر)", state.deadRoofOtherRight, false)}
            </div>
            <div class="form-grid">
                ${input("deadCompCoveringLeft", "پوشش سقف ـ چپ", state.deadRoofComponents.covering.left, false)}
                ${input("deadCompCoveringRight", "پوشش سقف ـ راست", state.deadRoofComponents.covering.right, false)}
                ${input("deadCompInsulationLeft", "عایق حرارتی/رطوبتی ـ چپ", state.deadRoofComponents.insulation.left, false)}
                ${input("deadCompInsulationRight", "عایق حرارتی/رطوبتی ـ راست", state.deadRoofComponents.insulation.right, false)}
                ${input("deadCompLinerLeft", "لایه زیرین/ورق داخلی ـ چپ", state.deadRoofComponents.liner.left, false)}
                ${input("deadCompLinerRight", "لایه زیرین/ورق داخلی ـ راست", state.deadRoofComponents.liner.right, false)}
                ${input("deadCompCeilingLeft", "سقف کاذب و آویزها ـ چپ", state.deadRoofComponents.ceiling.left, false)}
                ${input("deadCompCeilingRight", "سقف کاذب و آویزها ـ راست", state.deadRoofComponents.ceiling.right, false)}
                ${input("deadCompEquipmentLeft", "تجهیزات و تأسیسات معادل سطحی ـ چپ", state.deadRoofComponents.equipment.left, false)}
                ${input("deadCompEquipmentRight", "تجهیزات و تأسیسات معادل سطحی ـ راست", state.deadRoofComponents.equipment.right, false)}
                ${input("deadCompOtherLeft", "سایر اجزای دائمی مستند ـ چپ", state.deadRoofComponents.other.left, false)}
                ${input("deadCompOtherRight", "سایر اجزای دائمی مستند ـ راست", state.deadRoofComponents.other.right, false)}
            </div>
            <div class="notice" id="deadRoofComponentSummary">جمع بار مرده تفکیکی پس از ورود مقادیر محاسبه می‌شود.</div>

            <h4>هـ ـ وزن سطحی دیوارها و پوسته (بار مرده)</h4>
            <div class="notice">وزن سطحی دیوارهای طولی و انتهایی را از مشخصات واقعی آجر، ساندویچ‌پنل، زیرسازی و پوشش وارد کنید. مقدار صفر یعنی این بار در این ورودی تعریف نشده است؛ ناحیه مثلثی بالای دیوار انتهایی هنوز به مسیر مستقل نیاز دارد. واحد kN/m² است.</div>
            <div class="field">
                <label for="wallDeadSupportPath">مسیر تحمل وزن دیوار</label>
                <select id="wallDeadSupportPath">
                    <option value="foundation">دیوار باربر روی شناژ/فونداسیون (پیش‌فرض دیوار آجری)</option>
                    <option value="girts">دیوار/پنل آویخته و متکی به قیدهای فلزی</option>
                </select>
            </div>
            <div class="form-grid">
                ${input("loadWallDeadLeft", "وزن سطحی دیوار طولی چپ", state.wallDeadLeft, false)}
                ${input("loadWallDeadRight", "وزن سطحی دیوار طولی راست", state.wallDeadRight, false)}
                ${input("loadEndWallDeadFront", "وزن سطحی دیوار انتهایی جلو", state.endWallDeadFront, false)}
                ${input("loadEndWallDeadBack", "وزن سطحی دیوار انتهایی عقب", state.endWallDeadBack, false)}
            </div>

            <h4>ب ـ بار زنده سقف</h4>
            <div class="form-grid">
                ${input("loadLiveLeft", "بار زنده سمت چپ", state.liveLeft, false)}
                ${input("loadLiveRight", "بار زنده سمت راست", state.liveRight, false)}
            </div>

            <h4>ج ـ بار برف سقف</h4>
            <div class="form-grid">
                ${input("loadSnowLeft", "بار برف سمت چپ", state.snowLeft, false)}
                ${input("loadSnowRight", "بار برف سمت راست", state.snowRight, false)}
            </div>

            <h4>د ـ بار باد</h4>
            <div class="form-grid">
                ${input("loadWindLeft", "فشار خالص باد سقف سمت چپ", state.windLeft, true)}
                ${input("loadWindRight", "فشار خالص باد سقف سمت راست", state.windRight, true)}
                ${input("loadWindWall", "فشار خالص باد دیوارهای طولی (دو طرف)", state.windWall, true)}
                ${input("loadWindEndFront", "فشار خالص دیوار انتهایی جلو (وجه z=0)", state.windEndFront, true)}
                ${input("loadWindEndBack", "فشار خالص دیوار انتهایی عقب (وجه z=L)", state.windEndBack, true)}
            </div>
            <div class="notice">
                همه ورودی‌های فشار باد در این بخش باید «فشار خالص وارد بر سطح» بر حسب kN/m² باشند، نه سرعت مبنای باد.
                مقدار مثبت یعنی فشار به سمت داخل سالن و مقدار منفی یعنی مکش به سمت بیرون.
                فشار سقف به‌صورت عمود بر هر شیب، فشار دیوار طولی با فرض مقدار یکسان برای دو طرف، و فشار دیوارهای انتهایی جلو و عقب به‌صورت جداگانه به اعضای متناظر منتقل می‌شود.
                مقدار دیوار طولی برای دو طرف یکسان فرض می‌شود؛ در صورت نامتقارن بودن فشار دو طرف، این محدودیت باید پیش از تحلیل برطرف شود.
                ناحیه مثلثی بالای دیوار انتهایی (زیر سقف شیبدار)، فشارهای موضعی لبه/گوشه و ضرایب بادگیر/بادپناه هنوز در این مرحله منظور نشده‌اند.
                این ورودی‌ها فشار خالص دستی هستند و باید توسط مهندس محاسب از محاسبه معتبر باد تعیین شوند.
            </div>

            <h4>هـ ـ توضیحات بارگذاری</h4>
            <div class="field">
                <label for="loadNote">یادداشت مهندس محاسب</label>
                <textarea
                    id="loadNote"
                    rows="3"
                    placeholder="منبع بارگذاری، فرضیات و توضیحات..."
                ></textarea>
            </div>

            <div class="notice" id="loadSummary">
                اطلاعات بارگذاری آماده ورود است.
            </div>

            <h4>و ـ ضرایب ترکیبات بار (پیش‌نویس)</h4>

            <div class="notice">
                ضرایب زیر صرفاً برای آماده‌سازی ساختار نرم‌افزار هستند.
                تا زمان تعیین و تأیید ضوابط آیین‌نامه‌ای پروژه،
                نباید مبنای طراحی یا کنترل اعضا قرار گیرند.
            </div>

            <div id="loadCombinations"></div>

            <div class="button-grid">
                <button id="btnLoadCheck" class="btn primary" type="button">
                    کنترل اطلاعات بار
                </button>
                <button id="btnLoadReset" class="btn secondary" type="button">
                    بازنشانی بارها
                </button>
            </div>

            <div id="loadValidation" class="notice">
                هنوز کنترل انجام نشده است.
            </div>

        </section>
        `;
    }

    function renderCombinations() {
        const container = $("loadCombinations");
        if (!container) return;

        container.innerHTML = combinations.map((item, index) => `
            <div class="notice">
                <b>${item.name}</b>
                <div class="form-grid">
                    <div class="field">
                        <label>ضریب بار مرده</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="comboDead${index}"
                            value="${item.dead}"
                        >
                    </div>
                    <div class="field">
                        <label>ضریب بار زنده</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="comboLive${index}"
                            value="${item.live}"
                        >
                    </div>
                    <div class="field">
                        <label>ضریب بار برف</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="comboSnow${index}"
                            value="${item.snow}"
                        >
                    </div>
                </div>
            </div>
        `).join("");
    }

    function readInputs() {
        const ids = {
            deadRoofOtherLeft: "loadDeadLeft",
            deadRoofOtherRight: "loadDeadRight",
            liveLeft: "loadLiveLeft",
            liveRight: "loadLiveRight",
            snowLeft: "loadSnowLeft",
            snowRight: "loadSnowRight",
            windLeft: "loadWindLeft",
            windRight: "loadWindRight",
            windWall: "loadWindWall",
            windEndFront: "loadWindEndFront",
            windEndBack: "loadWindEndBack",
            wallDeadLeft: "loadWallDeadLeft",
            wallDeadRight: "loadWallDeadRight",
            endWallDeadFront: "loadEndWallDeadFront",
            endWallDeadBack: "loadEndWallDeadBack"
        };

        Object.keys(ids).forEach(key => {
            const el = $(ids[key]);
            if (el) state[key] = number(el.value);
        });

        const componentInputIds = {
            covering:["deadCompCoveringLeft","deadCompCoveringRight"],
            insulation:["deadCompInsulationLeft","deadCompInsulationRight"],
            liner:["deadCompLinerLeft","deadCompLinerRight"],
            ceiling:["deadCompCeilingLeft","deadCompCeilingRight"],
            equipment:["deadCompEquipmentLeft","deadCompEquipmentRight"],
            other:["deadCompOtherLeft","deadCompOtherRight"]
        };
        Object.entries(componentInputIds).forEach(([key,ids])=>{
            state.deadRoofComponents[key]={left:number($(ids[0])?.value),right:number($(ids[1])?.value)};
        });
        const componentTotal=side=>Object.values(state.deadRoofComponents).reduce((sum,item)=>sum+number(item[side]),0);
        state.deadLeft=number(state.deadRoofOtherLeft)+componentTotal("left");
        state.deadRight=number(state.deadRoofOtherRight)+componentTotal("right");
        const componentSummary=$("deadRoofComponentSummary");
        if(componentSummary)componentSummary.textContent="جمع بار مرده سقف با احتساب اجزای تفکیکی: چپ "+state.deadLeft.toFixed(3)+" و راست "+state.deadRight.toFixed(3)+" kN/m².";
        ["deadAreaBasis", "liveAreaBasis", "snowAreaBasis"].forEach(key => {
            const el = $(key);
            if (el) state[key] = el.value;
        });
        if ($("wallDeadSupportPath")) state.wallDeadSupportPath = $("wallDeadSupportPath").value;

        if ($("loadWindDirection")) {
            state.windDirection = $("loadWindDirection").value;
        }

        if ($("loadNote")) {
            state.note = $("loadNote").value;
        }

        const climateFields = {
            city: "climateCity",
            customCity: "climateCustomCity",
            elevation: "climateElevation",
            source: "climateSource",
            groundSnow: "climateGroundSnow",
            basicWind: "climateBasicWind",
            terrain: "climateTerrain",
            topography: "climateTopography",
            openingArea: "buildingOpeningArea",
            envelopeArea: "buildingEnvelopeArea",
            dominantOpening: "buildingDominantOpening"
        };
        Object.keys(climateFields).forEach(key => {
            const el = $(climateFields[key]);
            if (el) state.climate[key] = el.value;
        });
        state.climate.buildingUse = $("buildingUse")?.value || "warehouse-industrial";
        state.climate.openingState = $("buildingOpeningState")?.value || "enclosed";
        ["elevation", "groundSnow", "basicWind", "openingArea", "envelopeArea"].forEach(key => {
            const value = state.climate[key];
            if (value !== "" && !Number.isFinite(Number(value))) state.climate[key] = "";
        });

        state.combinations = combinations.map((item, index) => ({
            name: item.name,
            dead: number($("comboDead" + index)?.value),
            live: number($("comboLive" + index)?.value),
            snow: number($("comboSnow" + index)?.value)
        }));

        return JSON.parse(JSON.stringify(state));
    }

    function syncLegacyInputs() {
        const data = readInputs();

        // فیلدهای قدیمی برای سازگاری با نسخه فعلی تحلیل
        // میانگین بار دو نیمه سقف در آن‌ها قرار می‌گیرد.
        const average = (a, b) => (a + b) / 2;

        if ($("dead")) {
            $("dead").value = average(data.deadLeft, data.deadRight);
        }

        if ($("live")) {
            $("live").value = average(data.liveLeft, data.liveRight);
        }

        if ($("snow")) {
            $("snow").value = average(data.snowLeft, data.snowRight);
        }

        // موتور تحلیل فعلی هنوز بار باد را اعمال نمی‌کند.
        // قدرمطلق فقط برای عبور از اعتبارسنجی قدیمی ذخیره می‌شود.
        if ($("wind")) {
            $("wind").value = Math.max(
                Math.abs(data.windLeft),
                Math.abs(data.windRight),
                Math.abs(data.windWall)
            );
        }
    }

    function validate() {
        const data = readInputs();
        if (!["foundation","girts"].includes(data.wallDeadSupportPath)) {
            return "مسیر تحمل وزن دیوار باید شناژ/فونداسیون یا قیدهای فلزی باشد.";
        }

        const nonNegative = [
            ["بار مرده چپ", data.deadLeft],
            ["بار مرده راست", data.deadRight],
            ["بار زنده چپ", data.liveLeft],
            ["بار زنده راست", data.liveRight],
            ["بار برف چپ", data.snowLeft],
            ["بار برف راست", data.snowRight],
            ["وزن دیوار طولی چپ", data.wallDeadLeft],
            ["وزن دیوار طولی راست", data.wallDeadRight],
            ["وزن دیوار انتهایی جلو", data.endWallDeadFront],
            ["وزن دیوار انتهایی عقب", data.endWallDeadBack]
        ];

        for (const item of nonNegative) {
            if (!Number.isFinite(item[1]) || item[1] < 0) {
                return item[0] + " نمی‌تواند منفی باشد.";
            }
        }

        const componentValues=Object.entries(data.deadRoofComponents||{}).flatMap(([name,item])=>[
            ["جزء بار مرده "+name+" چپ",Number(item?.left)],["جزء بار مرده "+name+" راست",Number(item?.right)]
        ]);
        for(const item of componentValues)if(!Number.isFinite(item[1])||item[1]<0)return item[0]+" باید عددی و غیرمنفی باشد.";

        const basisChecks = [
            ["deadAreaBasis", [data.deadLeft, data.deadRight], "بار مرده"],
            ["liveAreaBasis", [data.liveLeft, data.liveRight], "بار زنده"],
            ["snowAreaBasis", [data.snowLeft, data.snowRight], "بار برف"]
        ];
        for (const [key, values, label] of basisChecks) {
            if (values.some(v => Number(v) > 0) &&
                !["horizontal-projection", "sloped-surface"].includes(data[key])) {
                return "مبنای سطح " + label + " سقف انتخاب نشده است؛ تحلیل این بار متوقف شد.";
            }
        }

        const signed = [
            data.windLeft,
            data.windRight,
            data.windWall,
            data.windEndFront,
            data.windEndBack
        ];

        if (signed.some(v => !Number.isFinite(v))) {
            return "مقدار بار باد معتبر نیست.";
        }

        for (const item of data.combinations || []) {
            if ([item.dead, item.live, item.snow].some(
                v => !Number.isFinite(v) || v < 0
            )) {
                return "ضرایب ترکیب بار باید عددی و غیرمنفی باشند.";
            }
        }

        return "";
    }

    function summary() {
        const data = readInputs();

        const averageDead =
            (data.deadLeft + data.deadRight) / 2;

        const averageLive =
            (data.liveLeft + data.liveRight) / 2;

        const averageSnow =
            (data.snowLeft + data.snowRight) / 2;

        const el = $("loadSummary");
        if (!el) return;

        el.innerHTML = `
            <b>خلاصه بارگذاری ورودی</b>
            <p>میانگین بار مرده سقف: ${averageDead.toFixed(3)} kN/m²</p>
            <p>میانگین بار زنده سقف: ${averageLive.toFixed(3)} kN/m²</p>
            <p>میانگین بار برف سقف: ${averageSnow.toFixed(3)} kN/m²</p>
            <p>باد سمت چپ: ${data.windLeft.toFixed(3)} kN/m²</p>
            <p>باد سمت راست: ${data.windRight.toFixed(3)} kN/m²</p>
            <p>فشار خالص باد دیوارهای طولی: ${data.windWall.toFixed(3)} kN/m²</p>
            <p>فشار خالص دیوار انتهایی جلو: ${data.windEndFront.toFixed(3)} kN/m²</p>
            <p>فشار خالص دیوار انتهایی عقب: ${data.windEndBack.toFixed(3)} kN/m²</p>
        `;
    }

    function updateWindReference() {
        const v = Number($("climateBasicWind")?.value);
        const altitude = $("climateElevation")?.value;
        const terrain = $("climateTerrain")?.value || "";
        const columnHeight = Number($("height")?.value);
        const ridgeRise = Number($("rise")?.value);
        const out = $("windReferenceResult");
        if (!out) return;
        if (!Number.isFinite(v) || v <= 0) {
            out.textContent = "برای محاسبه فشار مبنا، سرعت باد معتبر را از جدول ۶-۱۰-۱ وارد کنید.";
            return;
        }
        const vms = v / 3.6;
        const q = 0.000613 * vms * vms;
        const terrainText = terrain === "open" ? "باز و هموار" :
            terrain === "suburban" ? "حومه و موانع پراکنده" :
            terrain === "urban" ? "شهری و متراکم" : "انتخاب‌نشده";
        const geometryText = Number.isFinite(columnHeight) && columnHeight > 0 &&
            Number.isFinite(ridgeRise) && ridgeRise >= 0
            ? "ارتفاع ستون: " + columnHeight.toFixed(2) +
              " m؛ افزایش ارتفاع تا تاج: " + ridgeRise.toFixed(2) +
              " m؛ ارتفاع کل تا تاج: " + (columnHeight + ridgeRise).toFixed(2) + " m. "
            : "ارتفاع ستون یا افزایش ارتفاع تا تاج هنوز کامل نیست. ";
        out.textContent =
            "فشار مبنای محاسبه‌شده q = " + q.toFixed(3) + " kN/m² (رابطه q=0.000613V² با V بر حسب m/s؛ سرعت ورودی " + v.toFixed(1) + " km/h). " +
            "ارتفاع محل از سطح دریا: " + (altitude === "" ? "ثبت‌نشده" : altitude + " m") +
            "؛ رده زبری: " + terrainText + ". " + geometryText +
            "ارتفاع محل از سطح دریا با ارتفاع نقطه سازه از سطح زمین متفاوت است. ارتفاع‌های هندسی بالا صرفاً اطلاعات مدل‌اند و تا تطبیق دقیق بندهای مبحث ششم، ضریب Ce از آن‌ها محاسبه نمی‌شود. q نیز فقط فشار مبناست، نه فشار طراحی/خالص سقف و دیوار.";
    }

    function check() {
        const error = validate();
        const result = $("loadValidation");

        if (error) {
            if (result) result.textContent = "خطا: " + error;
            return false;
        }
        const climate = readInputs().climate || {};
        const numericClimate = [
            ["ارتفاع محل", climate.elevation, -500, 6000],
            ["بار برف زمین", climate.groundSnow, 0, 100],
            ["سرعت مبنای باد", climate.basicWind, 0, 150],
            ["مساحت بازشوها", climate.openingArea, 0, 1000000],
            ["مساحت پوسته", climate.envelopeArea, 0, 10000000]
        ];
        for (const [label, raw, min, max] of numericClimate) {
            if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < min || Number(raw) > max)) {
                if (result) result.textContent = "خطا: مقدار " + label + " خارج از محدوده مجاز فرم است.";
                return false;
            }
        }
        if (climate.openingState === "partially-enclosed" && climate.dominantOpening !== "yes") {
            if (result) result.textContent = "هشدار: وضعیت نیمه‌باز انتخاب شده، اما بازشوی غالب مشخص نشده است.";
            return false;
        }
        syncLegacyInputs();
        summary();

        if (result) {
            result.textContent =
                "اطلاعات بارگذاری از نظر عددی کنترل شد. " +
                "این کنترل به معنی تأیید آیین‌نامه‌ای بارها نیست.";
        }

        return true;
    }

    function reset() {
        const defaults = {
            deadLeft: 0.50,
            deadRight: 0.50,
            deadRoofOtherLeft: 0.50,
            deadRoofOtherRight: 0.50,
            deadRoofComponents: {
                covering:{left:0,right:0}, insulation:{left:0,right:0},
                liner:{left:0,right:0}, ceiling:{left:0,right:0},
                equipment:{left:0,right:0}, other:{left:0,right:0}
            },
            liveLeft: 0.75,
            liveRight: 0.75,
            snowLeft: 1.0,
            snowRight: 1.0,
            deadAreaBasis: "unspecified",
            liveAreaBasis: "unspecified",
            snowAreaBasis: "unspecified",
            windLeft: 0,
            windRight: 0,
            windWall: 0,
            windEndFront: 0,
            windEndBack: 0,
            wallDeadLeft: 0,
            wallDeadRight: 0,
            wallDeadSupportPath: "foundation",
            endWallDeadFront: 0,
            endWallDeadBack: 0
        };

        Object.assign(state, defaults);

        const ids = {
            deadLeft: "loadDeadLeft",
            deadRight: "loadDeadRight",
            liveLeft: "loadLiveLeft",
            liveRight: "loadLiveRight",
            snowLeft: "loadSnowLeft",
            snowRight: "loadSnowRight",
            windLeft: "loadWindLeft",
            windRight: "loadWindRight",
            windWall: "loadWindWall",
            windEndFront: "loadWindEndFront",
            windEndBack: "loadWindEndBack",
            wallDeadLeft: "loadWallDeadLeft",
            wallDeadRight: "loadWallDeadRight",
            endWallDeadFront: "loadEndWallDeadFront",
            endWallDeadBack: "loadEndWallDeadBack"
        };

        Object.keys(ids).forEach(key => {
            if ($(ids[key])) {
                $(ids[key]).value = defaults[key];
            }
        });

        const resetComponentIds={covering:["deadCompCoveringLeft","deadCompCoveringRight"],insulation:["deadCompInsulationLeft","deadCompInsulationRight"],liner:["deadCompLinerLeft","deadCompLinerRight"],ceiling:["deadCompCeilingLeft","deadCompCeilingRight"],equipment:["deadCompEquipmentLeft","deadCompEquipmentRight"],other:["deadCompOtherLeft","deadCompOtherRight"]};
        Object.entries(resetComponentIds).forEach(([k,ids])=>{if($(ids[0]))$(ids[0]).value=0;if($(ids[1]))$(ids[1]).value=0;});
        ["deadAreaBasis", "liveAreaBasis", "snowAreaBasis"].forEach(key => {
            if ($(key)) $(key).value = state[key];
        });
        if ($("wallDeadSupportPath")) $("wallDeadSupportPath").value = state.wallDeadSupportPath;

        if ($("loadWindDirection")) {
            $("loadWindDirection").value = "left-to-right";
        }

        if ($("loadNote")) {
            $("loadNote").value = "";
        }

        combinations.forEach((item, index) => {
            $("comboDead" + index).value = item.dead;
            $("comboLive" + index).value = item.live;
            $("comboSnow" + index).value = item.snow;
        });

        check();
    }

    function setData(data) {
        if (!data || typeof data !== "object") return;

        const keys = [
            "deadLeft", "deadRight",
            "liveLeft", "liveRight",
            "snowLeft", "snowRight",
            "windLeft", "windRight", "windWall", "windEndFront", "windEndBack",
            "wallDeadLeft", "wallDeadRight", "endWallDeadFront", "endWallDeadBack"
        ];

        state.deadRoofOtherLeft=Number.isFinite(Number(data.deadRoofOtherLeft))?Number(data.deadRoofOtherLeft):number(data.deadLeft);
        state.deadRoofOtherRight=Number.isFinite(Number(data.deadRoofOtherRight))?Number(data.deadRoofOtherRight):number(data.deadRight);
        const componentDefaults={covering:{left:0,right:0},insulation:{left:0,right:0},liner:{left:0,right:0},ceiling:{left:0,right:0},equipment:{left:0,right:0},other:{left:0,right:0}};
        state.deadRoofComponents=JSON.parse(JSON.stringify(componentDefaults));
        if(data.deadRoofComponents&&typeof data.deadRoofComponents==="object")
            Object.keys(componentDefaults).forEach(k=>{const v=data.deadRoofComponents[k];if(v)state.deadRoofComponents[k]={left:number(v.left),right:number(v.right)};});
        const componentTotal=side=>Object.values(state.deadRoofComponents).reduce((sum,item)=>sum+number(item[side]),0);
        state.deadLeft=state.deadRoofOtherLeft+componentTotal("left");
        state.deadRight=state.deadRoofOtherRight+componentTotal("right");
        state.wallDeadSupportPath = ["foundation","girts"].includes(data.wallDeadSupportPath) ? data.wallDeadSupportPath : "foundation";
        const legacyBasis = ["horizontal-projection", "sloped-surface"].includes(data.roofLoadAreaBasis)
            ? data.roofLoadAreaBasis : "unspecified";
        ["deadAreaBasis", "liveAreaBasis", "snowAreaBasis"].forEach(key => {
            state[key] = ["horizontal-projection", "sloped-surface"].includes(data[key])
                ? data[key] : legacyBasis;
        });

        keys.forEach(key => {
            if (Number.isFinite(Number(data[key]))) {
                state[key] = Number(data[key]);
            }
        });

        if (typeof data.windDirection === "string") {
            state.windDirection = data.windDirection;
        }

        if (typeof data.note === "string") {
            state.note = data.note;
        }

        if (data.climate && typeof data.climate === "object") {
            Object.keys(state.climate).forEach(key => {
                if (data.climate[key] !== undefined) state.climate[key] = data.climate[key];
            });
        }
        // Migration for older Shahroud projects: preserve explicit values, fill only missing site defaults.
        if (state.climate.city === "shahroud") {
            if (state.climate.elevation === "" || state.climate.elevation === null) state.climate.elevation = "1350";
            if (state.climate.terrain === "") state.climate.terrain = "suburban";
            if (!state.climate.source || state.climate.source === "مبحث ششم ۱۳۹۸؛ رکورد اقلیمی PDF همراه پروژه، نیازمند تطبیق نهایی") {
                state.climate.source = "مبحث ششم ۱۳۹۸؛ سرعت باد ۹۰ km/h طبق رکورد PDF پروژه، نیازمند تطبیق نهایی؛ ارتفاع ۱۳۵۰ متر برآورد تقریبی مرکز شهرک صنعتی شاهرود";
            }
        }
        state.climate.buildingUse = state.climate.buildingUse || "warehouse-industrial";
        state.climate.openingState = state.climate.openingState || "enclosed";

        if (Array.isArray(data.combinations)) {
            data.combinations.forEach((item, index) => {
                if (!combinations[index] || !item) return;

                combinations[index].dead = number(item.dead);
                combinations[index].live = number(item.live);
                combinations[index].snow = number(item.snow);
            });
        }

        if (initialized) {
            keys.forEach(key => {
                const map = {
                    deadLeft: "loadDeadLeft",
                    deadRight: "loadDeadRight",
                    liveLeft: "loadLiveLeft",
                    liveRight: "loadLiveRight",
                    snowLeft: "loadSnowLeft",
                    snowRight: "loadSnowRight",
                    windLeft: "loadWindLeft",
                    windRight: "loadWindRight",
                    windWall: "loadWindWall",
                    windEndFront: "loadWindEndFront",
                    windEndBack: "loadWindEndBack",
                    wallDeadLeft: "loadWallDeadLeft",
                    wallDeadRight: "loadWallDeadRight",
                    endWallDeadFront: "loadEndWallDeadFront",
                    endWallDeadBack: "loadEndWallDeadBack"
                };

                if ($(map[key])) $(map[key]).value = state[key];
            });
            if($("loadDeadLeft"))$("loadDeadLeft").value=state.deadRoofOtherLeft;
            if($("loadDeadRight"))$("loadDeadRight").value=state.deadRoofOtherRight;
            const componentUiIds={covering:["deadCompCoveringLeft","deadCompCoveringRight"],insulation:["deadCompInsulationLeft","deadCompInsulationRight"],liner:["deadCompLinerLeft","deadCompLinerRight"],ceiling:["deadCompCeilingLeft","deadCompCeilingRight"],equipment:["deadCompEquipmentLeft","deadCompEquipmentRight"],other:["deadCompOtherLeft","deadCompOtherRight"]};
            Object.entries(componentUiIds).forEach(([k,ids])=>{if($(ids[0]))$(ids[0]).value=state.deadRoofComponents[k].left;if($(ids[1]))$(ids[1]).value=state.deadRoofComponents[k].right;});

            if ($("loadWindDirection")) {
                $("loadWindDirection").value = state.windDirection;
            }

            if ($("loadNote")) {
                $("loadNote").value = state.note;
            }

            const climateIds = {
                city: "climateCity", customCity: "climateCustomCity",
                elevation: "climateElevation", source: "climateSource",
                groundSnow: "climateGroundSnow", basicWind: "climateBasicWind",
                terrain: "climateTerrain", topography: "climateTopography",
                openingArea: "buildingOpeningArea",
                envelopeArea: "buildingEnvelopeArea", dominantOpening: "buildingDominantOpening",
                buildingUse: "buildingUse", openingState: "buildingOpeningState"
            };
            Object.keys(climateIds).forEach(key => {
                if ($(climateIds[key])) $(climateIds[key]).value = state.climate[key];
            });

            ["deadAreaBasis", "liveAreaBasis", "snowAreaBasis"].forEach(key => {
                if ($(key)) $(key).value = state[key];
            });
            if ($("wallDeadSupportPath")) $("wallDeadSupportPath").value = state.wallDeadSupportPath;
            renderCombinations();

            if (data.combinations) {
                data.combinations.forEach((item, index) => {
                    if (!item) return;
                    if ($("comboDead" + index)) $("comboDead" + index).value = item.dead;
                    if ($("comboLive" + index)) $("comboLive" + index).value = item.live;
                    if ($("comboSnow" + index)) $("comboSnow" + index).value = item.snow;
                });
            }

            summary();
            syncLegacyInputs();
        }
    }

    function init() {
        if (initialized) return;

        const oldPanel = $("dead")?.closest(".panel");
        if (!oldPanel) return;

        oldPanel.insertAdjacentHTML("afterend", panelHTML());

        initialized = true;

        renderCombinations();

        const direction = $("loadWindDirection");
        if (direction) direction.value = state.windDirection;

        const note = $("loadNote");
        if (note) note.value = state.note;

        const climateCity = $("climateCity");
        const projectCity = $("city");
        if (climateCity && projectCity) {
            const initialCity = projectCity.value === "custom" || projectCity.value === "other"
                ? "shahroud" : projectCity.value;
            climateCity.value = initialCity;
            const cityNames = {
                shahroud: "شاهرود", semnan: "سمنان", tehran: "تهران",
                mashhad: "مشهد", tabriz: "تبریز", isfahan: "اصفهان",
                yazd: "یزد", rasht: "رشت", sari: "ساری", kerman: "کرمان"
            };
            if (cityNames[initialCity] && $("climateCustomCity")) {
                $("climateCustomCity").value = cityNames[initialCity];
            }
            climateCity.addEventListener("change", function () {
                if (cityNames[this.value] && $("climateCustomCity")) {
                    $("climateCustomCity").value = cityNames[this.value];
                }
                if (projectCity) projectCity.value = this.value;
            });
            if (projectCity) projectCity.addEventListener("change", function () {
                if (cityNames[this.value]) {
                    climateCity.value = this.value;
                    $("climateCustomCity").value = cityNames[this.value];
                }
            });
        }

        ["deadAreaBasis", "liveAreaBasis", "snowAreaBasis"].forEach(key => {
            if ($(key)) $(key).value = state[key];
        });

        const panel = $("advancedLoadPanel");

        panel.addEventListener("input", function (event) {
            if (
                event.target &&
                event.target.matches("input, textarea, select")
            ) {
                summary();
                updateWindReference();
            }
        });

        $("btnLoadCheck").addEventListener("click", check);
        $("btnLoadReset").addEventListener("click", reset);

        summary();
        updateWindReference();
        const climateNotice = $("climateNotice");
        if (climateNotice) climateNotice.textContent =
            "وضعیت بسته، نیمه‌بسته یا باز مطابق انتخاب پروژه ثبت می‌شود. تعیین ضرایب فشار داخلی و خارجی و تأیید سناریوی باد همچنان نیازمند تکمیل داده‌های آیین‌نامه‌ای است.";
        updateWindReference();
    }

    window.SteelLoads = {
        getData: readInputs,
        setData,
        validate,
        check,
        syncLegacyInputs
    };

    document.addEventListener("DOMContentLoaded", init);

})();
