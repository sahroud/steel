/* ===== steel2/js/m6-load-combination-templates.js ===== */
/* SAHROUD STEEL — M6:1398 LRFD load-combination template generator.
 * Source: Iranian National Building Regulations, Topic 6, 4th ed. (1398),
 * clause 6-2-3-2. Templates only: no load generation, analysis, or approval.
 */
(function(root){
"use strict";
const txt=v=>String(v??"").trim();
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clone=v=>JSON.parse(JSON.stringify(v));
function fail(issues){return {success:false,status:"insufficient_data",issues,combinations:[],analysisEnabled:false,designApproved:false};}
function generate(input){
 const p=input||{},issues=[];
 if(p.code!=="m6-1398")issues.push("مبنای ترکیبات باید صریحاً مبحث ششم ویرایش ۱۳۹۸ باشد.");
 if(p.method!=="LRFD")issues.push("این مولد فقط ترکیبات حالت حدی مقاومت (LRFD) را تولید می‌کند.");
 if(p.approvedByEngineer!==true)issues.push("تأیید مهندس مسئول برای فعال‌سازی مجموعه ترکیبات ثبت نشده است.");
 const c=p.cases||{};
 const ids=["D","L","Lr","S","R","W+","W-","E+","E-"];
 ids.forEach(k=>{if(!Array.isArray(c[k])||!c[k].length||c[k].some(x=>!txt(x)))issues.push("شناسه حالت بار "+k+" باید صریحاً معرفی شود؛ حتی برای اثر صفر.");});
 if(p.temperatureApplicable===true&&(!Array.isArray(c.T)||!c.T.length||c.T.some(x=>!txt(x))))issues.push("برای اثر دما/خودکرنشی، حالت‌های T باید معرفی شوند.");
 if(p.temperatureApplicable!==true&&p.temperatureApplicable!==false)issues.push("قابل‌اعمال بودن اثر دما/خودکرنشی باید صریحاً تعیین شود.");
 if(p.otherActions&&p.otherActions.length)issues.push("بارهای اضافی خارج از این قالب وجود دارند و باید ترکیبات اختصاصی آن‌ها بررسی و اضافه شود: "+p.otherActions.join("، "));
 if(issues.length)return fail(issues);
 const combos=[];
 const add=(id,label,terms,sourceClause)=>{
  const factors={};terms.forEach(([caseId,factor])=>{factors[caseId]=(factors[caseId]||0)+factor;});
  combos.push({id,label,factors,source:{code:"مبحث ششم مقررات ملی ساختمان",edition:"ویرایش چهارم ۱۳۹۸",clause:sourceClause,document:"بند ۶-۲-۳-۲؛ قالب تولید ترکیب، نیازمند تطبیق مهندس مسئول با متن رسمی پروژه"}});
 };
 const expand=(base,choices)=>{let rows=[base];for(const group of choices){const next=[];for(const row of rows)for(const choice of group)next.push([...row,...choice]);rows=next;}return rows;};
 const one=(key)=>c[key].map(id=>[[id,1]]);
 const roof=["Lr","S","R"];
 // 1) 1.4D
 c.D.forEach(d=>add("M6-ULS-01-"+d,"1.4D",[[d,1.4]],"۶-۲-۳-۲، ترکیب ۱"));
 // 2) 1.2D + 1.6L + 0.5(Lr or S or R)
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),one("L").map(x=>x.map(([id])=>[id,1.6])),roof.flatMap(k=>one(k).map(x=>x.map(([id])=>[id,0.5])))]))
 add("M6-ULS-02-"+combos.length,"1.2D + 1.6L + 0.5(Lr/S/R)",terms,"۶-۲-۳-۲، ترکیب ۲");
 // 3) 1.2D + 1.6(Lr or S or R) + [L or 0.5(1.4W)]
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),roof.flatMap(k=>one(k).map(x=>x.map(([id])=>[id,1.6]))),[...one("L").map(x=>x.map(([id])=>[id,1])),...c["W+"].concat(c["W-"]).map(id=>[[id,0.7]])]]))
 add("M6-ULS-03-"+combos.length,"1.2D + 1.6(Lr/S/R) + [L or 0.5(1.4W)]",terms,"۶-۲-۳-۲، ترکیب ۳");
 // 4) 1.2D + 1.0(1.4W) + L + 0.5(Lr or S or R)
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),c["W+"].concat(c["W-"]).map(id=>[[id,1.4]]),one("L"),roof.flatMap(k=>one(k).map(x=>x.map(([id])=>[id,0.5])))]))
 add("M6-ULS-04-"+combos.length,"1.2D + 1.4W + L + 0.5(Lr/S/R)",terms,"۶-۲-۳-۲، ترکیب ۴");
 // 5) 1.2D + E + L + 0.2S
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),c["E+"].concat(c["E-"]).map(id=>[[id,1]]),one("L"),one("S").map(x=>x.map(([id])=>[id,0.2]))]))
 add("M6-ULS-05-"+combos.length,"1.2D + E + L + 0.2S",terms,"۶-۲-۳-۲، ترکیب ۵");
 // 6) 0.9D + 1.4W
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,0.9])),c["W+"].concat(c["W-"]).map(id=>[[id,1.4]])]))
 add("M6-ULS-06-"+combos.length,"0.9D + 1.4W",terms,"۶-۲-۳-۲، ترکیب ۶");
 // 7) 0.9D + E
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,0.9])),c["E+"].concat(c["E-"]).map(id=>[[id,1]])]))
 add("M6-ULS-07-"+combos.length,"0.9D + E",terms,"۶-۲-۳-۲، ترکیب ۷");
 if(p.temperatureApplicable===true){
  // 8) 1.2D + 0.5L + 0.5(Lr or S) + 1.2T
  for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),one("L").map(x=>x.map(([id])=>[id,0.5])),["Lr","S"].flatMap(k=>one(k).map(x=>x.map(([id])=>[id,0.5]))),one("T").map(x=>x.map(([id])=>[id,1.2]))]))
  add("M6-ULS-08-"+combos.length,"1.2D + 0.5L + 0.5(Lr/S) + 1.2T",terms,"۶-۲-۳-۲، ترکیب ۸");
  // 9) 1.2D + 1.6L + 1.6(Lr or S) + T
  for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),one("L").map(x=>x.map(([id])=>[id,1.6])),["Lr","S"].flatMap(k=>one(k).map(x=>x.map(([id])=>[id,1.6]))),one("T")]))
  add("M6-ULS-09-"+combos.length,"1.2D + 1.6L + 1.6(Lr/S) + T",terms,"۶-۲-۳-۲، ترکیب ۹");
 }
 const unique=new Set();combos.forEach(x=>{if(unique.has(x.id))issues.push("شناسه ترکیب تکراری: "+x.id);unique.add(x.id);});
 return {success:issues.length===0,status:issues.length?"blocked":"templates-generated-review-required",method:"LRFD",code:"مبحث ششم ۱۳۹۸",clause:"۶-۲-۳-۲",combinations:combos,analysisEnabled:false,designApproved:false,limitations:["این ماژول فقط قالب ضرایب را تولید می‌کند؛ بارها را محاسبه یا به مدل سازه تزریق نمی‌کند.","حالات بار باید مستقل و دارای علامت/جهت صحیح باشند؛ اثرهای مثبت و منفی با هم جمع نمی‌شوند مگر ترکیب مشخص کند.","شرط کاهش ضریب L، آثار نامطلوب/کاهنده، بارهای اضافی، حوادث غیرعادی، جرثقیل و الزامات خاص باید جداگانه بررسی شوند.","برای طراحی اجرایی، نسخه رسمی مبحث، بندها و انتخاب حالت‌های قابل‌اعمال باید توسط مهندس مسئول بازبینی شود."]};
}
function selfTest(){
 const c={D:["D"],L:["L"],Lr:["Lr"],S:["S"],R:["R"],"W+":["W+"],"W-":["W-"],"E+":["E+"],"E-":["E-"],T:["T"]};
 const base={code:"m6-1398",method:"LRFD",approvedByEngineer:true,temperatureApplicable:true,cases:c};
 const a=generate(base),b=generate({...base,approvedByEngineer:false}),d=generate({...base,cases:{...c,S:[]}}),e=generate({...base,temperatureApplicable:"yes"}),f=generate({...base,otherActions:["crane"]});
 const tests=[
 ["all nine clause families expanded with directional alternatives",a.success&&a.combinations.some(x=>x.id.startsWith("M6-ULS-09"))&&a.combinations.some(x=>x.id.startsWith("M6-ULS-04"))],
 ["positive and negative wind are separate alternatives",a.combinations.some(x=>Object.hasOwn(x.factors,"W+"))&&a.combinations.some(x=>Object.hasOwn(x.factors,"W-"))],
 ["positive and negative seismic are separate alternatives",a.combinations.some(x=>Object.hasOwn(x.factors,"E+"))&&a.combinations.some(x=>Object.hasOwn(x.factors,"E-"))],
 ["missing snow case is blocked",!d.success&&d.status==="insufficient_data"],
 ["missing engineer review is blocked",!b.success],
 ["temperature applicability must be explicit",!e.success],
 ["extra unmodeled actions are blocked",!f.success],
 ["combination sources are attached to each row",a.combinations.every(x=>x.source.clause&&x.source.edition==="ویرایش چهارم ۱۳۹۸")],
 ["no solver or design approval is claimed",!a.analysisEnabled&&!a.designApproved]
 ];
 return {passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,tests:tests.map(x=>({name:x[0],ok:x[1]})),combinationCount:a.combinations.length};
}
function initPanel(){
 if(typeof document==="undefined"||document.getElementById("m6CombinationTemplatesPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="m6CombinationTemplatesPanel";
 const fields=[["D","بار مرده D"],["L","بار زنده L"],["Lr","بار زنده بام Lr"],["S","برف S"],["R","باران R"],["W+","باد جهت مثبت W+"],["W-","باد جهت منفی W-"],["E+","زلزله جهت مثبت E+"],["E-","زلزله جهت منفی E-"],["T","دما/خودکرنشی T"]];
 p.innerHTML="<div class='panel-title'><h3>مولد ترکیبات بار مبحث ششم ۱۳۹۸ (LRFD)</h3><span class='status'>قالب ضابطه‌ای؛ نیازمند بازبینی</span></div><p>شناسه حالت‌های بار را معرفی کنید. شناسه‌ها صرفاً ارجاع‌اند و به معنی وجود بار یا اثر محاسبه‌شده نیستند. برای حالت‌های صفر نیز حالت بار صریح با اثر صفر تعریف کنید.</p><div class='form-grid'>"+fields.map(([id,label])=>"<div class='field'><label>"+label+"</label><input data-m6-case='"+id+"' value='"+id+"' type='text'></div>").join("")+"</div><div class='form-grid'><div class='field'><label>قابل‌اعمال بودن اثر دما/خودکرنشی</label><select id='m6TemperatureApplicable'><option value=''>تعیین نشده</option><option value='false'>خیر، پس از بررسی مهندس</option><option value='true'>بله</option></select></div><label class='field'><input id='m6EngineerApproved' type='checkbox'> بازبینی و تأیید این مجموعه توسط مهندس مسئول</label></div><div class='button-grid'><button type='button' class='btn primary' id='btnGenerateM6Combinations'>تولید ترکیبات بار</button></div><div id='m6CombinationTemplateResults' class='notice'>هنوز ترکیبات تولید نشده‌اند.</div><div class='notice'>این ابزار ضرایب و شاخه‌های ترکیب را تولید می‌کند؛ بارهای اقلیمی، تحلیل سازه، حالات خاص، ضوابط بهره‌برداری و طراحی اعضا را انجام نمی‌دهد و تأیید طراحی صادر نمی‌کند.</div>";
 const anchor=document.getElementById("climateDesignReadinessPanel")||main.querySelector("footer");if(anchor)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 document.getElementById("btnGenerateM6Combinations").addEventListener("click",()=>{
  const cases={};p.querySelectorAll("[data-m6-case]").forEach(el=>{cases[el.getAttribute("data-m6-case")]=el.value.split(",").map(x=>x.trim()).filter(Boolean);});
  const t=document.getElementById("m6TemperatureApplicable").value;
  const r=generate({code:"m6-1398",method:"LRFD",approvedByEngineer:document.getElementById("m6EngineerApproved").checked,temperatureApplicable:t===""?null:t==="true",cases});
  const out=document.getElementById("m6CombinationTemplateResults");
  if(!r.success){out.textContent="تولید متوقف شد: "+r.issues.join(" | ");return;}
  out.innerHTML="<b>"+r.combinations.length+" شاخه ترکیب تولید شد؛ نیازمند تطبیق مهندسی.</b><ol>"+r.combinations.map(x=>"<li><b>"+x.id+"</b> — "+x.label+"<br><small>"+Object.entries(x.factors).map(([k,v])=>v+"×"+k).join(" + ")+"</small></li>").join("")+"</ol>";
 });
}
root.SteelM6LoadCombinationTemplates={generate,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initPanel);else initPanel();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/project.js ===== */

/* SAHROUD STEEL - Project Manager 2.9 */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const STORAGE_KEY = "sahroudSteelProject.autosave.v3";
    let persistTimer = null;

    function persistSnapshot(data) {
        try {
            const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            const snapshot = Object.assign({}, data);
            if (!snapshot.structuralModel && previous && previous.structuralModel) {
                snapshot.structuralModel = previous.structuralModel;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            return true;
        } catch (error) {
            console.warn("ذخیره خودکار پروژه در این مرورگر ممکن نشد:", error);
            return false;
        }
    }

    function flushAutoSave() {
        if (persistTimer) {
            clearTimeout(persistTimer);
            persistTimer = null;
        }
        try {
            const ok = persistSnapshot(getData());
            if (ok) {
                setStatus("ذخیره خودکار انجام شد؛ آخرین تغییرات در حافظه همین مرورگر ثبت شد.");
            } else {
                setStatus("هشدار: ذخیره در حافظه مرورگر ناموفق بود؛ از دکمه «ذخیره پروژه» فایل JSON بگیرید.");
            }
            return ok;
        } catch (error) {
            console.warn("ذخیره خودکار انجام نشد:", error);
            setStatus("هشدار: ذخیره خودکار انجام نشد؛ از دکمه «ذخیره پروژه» فایل JSON بگیرید.");
            return false;
        }
    }

    function scheduleAutoSave() {
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(flushAutoSave, 500);
    }

    async function restoreLastProject() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const response = await fetch("default-project.json", { cache: "no-store" });
                if (!response.ok) throw new Error("فایل پیش‌فرض پروژه در دسترس نیست.");
                const initialProject = await response.json();
                loadData(initialProject);
                setStatus("پروژه پایه مهندسی از فایل ارسالی شما بارگذاری شد؛ تغییرات بعدی در همین مرورگر ذخیره خودکار می‌شود.");
                return true;
            }
            const data = JSON.parse(raw);
            loadData(data);
            if (window.SteelDrawing && typeof window.SteelDrawing.drawFrame === "function") {
                window.SteelDrawing.drawFrame();
            }
            setStatus("آخرین پروژه به‌طور خودکار از حافظه همین مرورگر بازیابی شد.");
            return true;
        } catch (error) {
            console.warn("بازیابی خودکار پروژه انجام نشد:", error);
            setStatus("بازیابی خودکار ممکن نشد؛ فایل پروژه را یک‌بار باز کنید.");
            return false;
        }
    }

    function updateRoofGeometry() {
        const span = Number($("span")?.value);
        const rise = Number($("rise")?.value);
        const height = Number($("height")?.value);
        if (!(span > 0) || !(rise >= 0) || !(height > 0)) return;
        const roofSystem = $("structuralSystem")?.value || "portal-gable";
        const isSingleSlope = roofSystem === "portal-single-slope";
        const slope = rise / (isSingleSlope ? span : span / 2) * 100;
        if ($("roofSlopeDisplay")) $("roofSlopeDisplay").textContent = slope.toFixed(1).replace(".", "٫") + "٪";
        if ($("roofRiseDisplay")) $("roofRiseDisplay").textContent = rise.toFixed(2).replace(".", "٫") + " متر";
        if ($("roofTotalHeightDisplay")) $("roofTotalHeightDisplay").textContent = (height + rise).toFixed(2).replace(".", "٫") + " متر";
    }

    function getNumber(id) {
        const el = $(id);
        return el ? Number(el.value) : NaN;
    }

    function normalizeProjectSteelGrade(value) {
        const grade = String(value || "").trim().toUpperCase();
        if (/^ST\s*37(?:[- ]?2)?$/.test(grade)) return "ST37-2";
        if (/^ST\s*52(?:[- ]?3)?$/.test(grade)) return "ST52-3";
        // EN grades such as S235/S275/S355 are not silently aliased to historical ST grades.
        return "CUSTOM";
    }

    function syncProjectSteelGradeToSection(applyDefaults) {
        const source = $("projectSteelGrade");
        const target = $("steelGrade");
        if (!source || !target) return;
        const normalized = normalizeProjectSteelGrade(source.value);
        target.value = normalized;
        const custom = $("steelGradeCustom");
        if (custom) {
            custom.value = normalized === "CUSTOM" ? source.value.trim() : "";
            custom.style.display = normalized === "CUSTOM" ? "block" : "none";
        }
        if (applyDefaults) target.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function syncProjectDesignBrief() {
        if (!window.SteelDesignCore || typeof window.SteelDesignCore.getData !== "function" ||
            typeof window.SteelDesignCore.setData !== "function") return;
        const categoryMap = {
            "industrial-workshop": "workshop",
            warehouse: "storage",
            production: "industrial",
            agricultural: "agricultural",
            commercial: "commercial",
            other: "other"
        };
        const systemMap = { "portal-gable": "rigid-portal", "portal-single-slope": "rigid-portal" };
        const current = window.SteelDesignCore.getData();
        window.SteelDesignCore.setData(Object.assign({}, current, {
            occupancy: categoryMap[$("projectCategory")?.value] || "other",
            structuralSystem: systemMap[$("structuralSystem")?.value] || current.structuralSystem,
            crane: $("crane_enabled")?.checked ? "yes" : "no"
        }));
    }

    function getBaseConnection() {
        const el = $("baseConnection");
        if (!el) return "pinned";
        return el.value === "fixed" ? "fixed" : "pinned";
    }

    function getData() {
        const data = {
            projectName: $("projectName") ? $("projectName").value.trim() : "",
            owner: $("owner") ? $("owner").value.trim() : "",
            designer: $("designer") ? $("designer").value.trim() : "",
            projectSteelGrade: $("projectSteelGrade") ? $("projectSteelGrade").value.trim() : "ST37",
            city: $("city") ? $("city").value : "",
            cityName: $("cityName") ? $("cityName").value.trim() : "",
            projectCategory: $("projectCategory") ? $("projectCategory").value : "industrial-workshop",
            structuralSystem: $("structuralSystem") ? $("structuralSystem").value : "portal-gable",
            projectNotes: $("projectNotes") ? $("projectNotes").value.trim() : "",
            baseConnection: getBaseConnection(),

            span: getNumber("span"),
            length: getNumber("length"),
            spacing: getNumber("spacing"),
            height: getNumber("height"),
            rise: getNumber("rise"),
            frames: getNumber("frames"),

            dead: getNumber("dead"),
            live: getNumber("live"),
            wind: getNumber("wind"),
            snow: getNumber("snow"),

            structuralModel: window.SteelStructuralModel?.getData?.() || null,
            savedAt: new Date().toISOString(),
            software: "SAHROUD STEEL",
            version: "2.9"
        };

        if (window.SteelLoads &&
            typeof window.SteelLoads.getData === "function") {
            data.loads = window.SteelLoads.getData();
        }

        if (window.SteelLoadCaseWorkbench) data.loadCaseWorkbench = window.SteelLoadCaseWorkbench.read();

        if (window.SteelSections &&
            typeof window.SteelSections.read === "function") {
            data.sections = window.SteelSections.read();
        }

        if (window.SteelMemberDesignInputs &&
            typeof window.SteelMemberDesignInputs.readUI === "function") {
            data.memberDesignInputs = window.SteelMemberDesignInputs.readUI();
        }

        if (window.SteelColdFormedMemberRegistry) {
            data.coldFormedMemberRegistry = window.SteelColdFormedMemberRegistry.getData();
        }

        if (window.SteelTensionDesignReadiness && typeof window.SteelTensionDesignReadiness.readUI === "function") {
            data.tensionDesignReadiness = window.SteelTensionDesignReadiness.readUI();
        }

        if (window.SteelBraceConnectionReadiness && typeof window.SteelBraceConnectionReadiness.readUI === "function") {
            data.braceConnectionReadiness = window.SteelBraceConnectionReadiness.readUI();
        }

        if (window.SteelCompressionDesignReadiness && typeof window.SteelCompressionDesignReadiness.readUI === "function") {
            data.compressionDesignReadiness = window.SteelCompressionDesignReadiness.readUI();
        }

        if (window.SteelCompressionCapacityIntegration && typeof window.SteelCompressionCapacityIntegration.readUI === "function") {
            data.compressionCapacityInputs = window.SteelCompressionCapacityIntegration.readUI();
        }

        if (window.SteelSectionGeometry &&
            typeof window.SteelSectionGeometry.read === "function") {
            data.sectionGeometryAudit = window.SteelSectionGeometry.read();
        }

        if (window.SteelTaperedSections && typeof window.SteelTaperedSections.read === "function") {
            data.taperedMemberSections = window.SteelTaperedSections.read();
        }

        if (window.SteelOpenings &&
            typeof window.SteelOpenings.getData === "function") {
            data.openings = window.SteelOpenings.getData();
        }

        if (window.SteelClimateDB &&
            typeof window.SteelClimateDB.getData === "function") {
            data.climateDatabase = window.SteelClimateDB.getData();
        }

        if (window.SteelClimateLoadEngine &&
            typeof window.SteelClimateLoadEngine.getData === "function") {
            data.climateLoadEngine = window.SteelClimateLoadEngine.getData();
        }

        if (window.SteelWindBasis && typeof window.SteelWindBasis.getData === "function") {
            data.windBasis = window.SteelWindBasis.getData();
        }

        if (window.SteelDirectionalWind && typeof window.SteelDirectionalWind.getData === "function") {
            data.directionalWind = window.SteelDirectionalWind.getData();
        }

        if (window.SteelGirder &&
            typeof window.SteelGirder.getData === "function") {
            data.girders = window.SteelGirder.getData();
        }

        if (window.SteelTies &&
            typeof window.SteelTies.getData === "function") {
            data.wallTies = window.SteelTies.getData();
        }

        if (window.SteelRoofTies &&
            typeof window.SteelRoofTies.getData === "function") {
            data.roofTies = window.SteelRoofTies.getData();
        }

        // ذخیره تنظیمات پرلین‌های سقف
        if (window.SteelRoofPurlins &&
            typeof window.SteelRoofPurlins.getData === "function") {
            data.roofPurlins =
                window.SteelRoofPurlins.getData();
        }

        if (window.SteelPurlinCantileverConnection &&
            typeof window.SteelPurlinCantileverConnection.getData === "function") {
            data.purlinCantileverConnection =
                window.SteelPurlinCantileverConnection.getData();
        }

        if (window.SteelFabricationTakeoff && typeof window.SteelFabricationTakeoff.getData === "function") {
            data.fabricationTakeoff = window.SteelFabricationTakeoff.getData();
        }

        if (window.SteelDesignCore && typeof window.SteelDesignCore.getData === "function") {
            data.designBrief = window.SteelDesignCore.getData();
        }

        if (window.SteelMarketPrices && typeof window.SteelMarketPrices.getData === "function") {
            data.marketPrices = window.SteelMarketPrices.getData();
        }

        if (window.SteelCodeReferences && typeof window.SteelCodeReferences.getData === "function") {
            data.codeReferences = window.SteelCodeReferences.getData();
        }

        if (window.SteelCostEstimate && typeof window.SteelCostEstimate.getData === "function") {
            data.costEstimate = window.SteelCostEstimate.getData();
        }

        if (window.SteelFoundationTakeoff && typeof window.SteelFoundationTakeoff.getData === "function") {
            data.foundationTakeoff = window.SteelFoundationTakeoff.getData();
        }

        if (window.SteelAnchorBaseplateTakeoff && typeof window.SteelAnchorBaseplateTakeoff.getData === "function") {
            data.anchorBaseplateTakeoff = window.SteelAnchorBaseplateTakeoff.getData();
        }
        if (window.SteelAnchorDemandScreen && typeof window.SteelAnchorDemandScreen.getData === "function") {
            data.anchorDemandScreen = window.SteelAnchorDemandScreen.getData();
        }
        if (window.SteelAnchorCaseDemandUI && typeof window.SteelAnchorCaseDemandUI.getData === "function") {
            data.craneAnchorGroups = window.SteelAnchorCaseDemandUI.getData();
        }

        if (window.SteelFootingStructuralScreen && typeof window.SteelFootingStructuralScreen.getData === "function") {
            data.footingStructuralScreen = window.SteelFootingStructuralScreen.getData();
        }

        if (window.SteelFootingSizingAssistant && typeof window.SteelFootingSizingAssistant.getData === "function") {
            data.footingSizingAssistant = window.SteelFootingSizingAssistant.getData();
        }

        if (window.SteelTieBeamLayout) data.tieBeamLayout = window.SteelTieBeamLayout.getData();
        if (window.SteelTieBeamReinforcement) data.tieBeamReinforcement = window.SteelTieBeamReinforcement.getData();
        if (window.SteelSiteWorkTakeoff && typeof window.SteelSiteWorkTakeoff.getData === "function") data.siteWorkTakeoff = window.SteelSiteWorkTakeoff.getData();

        if (window.SteelCraneReadiness && typeof window.SteelCraneReadiness.getData === "function") {
            data.craneReadiness = window.SteelCraneReadiness.getData();
        }
        if (window.SteelCraneLoadPath && typeof window.SteelCraneLoadPath.getData === "function") {
            data.craneLoadPath = window.SteelCraneLoadPath.getData();
        }

        if (window.SteelCraneTrainAnalysis) data.craneTrainAnalysis = window.SteelCraneTrainAnalysis.getData();
        if (window.SteelCraneHorizontalLoads) data.craneHorizontalLoads = window.SteelCraneHorizontalLoads.getData();
        if (window.SteelCraneTwoRailTransfer) data.craneTwoRailTransfer = window.SteelCraneTwoRailTransfer.getData();
        if (window.SteelRunwayGirderFEM) data.runwayGirderFEM = window.SteelRunwayGirderFEM.getData();
        if (window.SteelCrane3DIntegration) data.crane3DIntegration = window.SteelCrane3DIntegration.readUI();

        if (window.SteelGeotechnicalData && typeof window.SteelGeotechnicalData.getData === "function") {
            data.geotechnicalData = window.SteelGeotechnicalData.getData();
        }

        return data;
    }

    function setStatus(message) {
        const el = $("projectStatus");
        if (el) el.textContent = message;
    }

    function updateFrameCount() {
        const length = getNumber("length");
        const spacing = getNumber("spacing");

        if (!Number.isFinite(length) ||
            !Number.isFinite(spacing) ||
            length <= 0 || spacing <= 0) {
            if ($("frames")) $("frames").value = "";
            return;
        }

        $("frames").value = Math.ceil(length / spacing) + 1;
    }

    function updateProjectSetupSummary() {
        const span=getNumber("span"),length=getNumber("length"),rise=getNumber("rise"),height=getNumber("height"),frames=getNumber("frames");
        const city=$( "city" )?.selectedOptions?.[0]?.textContent||"—";
        const crane=!!$("crane_enabled")?.checked;
        const count=$("setupFrameCount"),area=$("setupRoofArea"),status=$("projectSetupStatus");
        if(count)count.textContent=Number.isFinite(frames)?String(frames):"—";
        if(area)area.textContent=Number.isFinite(span)&&Number.isFinite(length)?(span*length).toFixed(1)+" m²":"—";
        const singleSlope=$("structuralSystem")?.value==="portal-single-slope";
        if(status)status.textContent="محل: "+city+" | "+(singleSlope?"ارتفاع لبه بلند: ":"ارتفاع تاج: ")+(height+rise).toFixed(2)+" m | "+(singleSlope?"سقف تک‌شیب":"سقف دوشیب")+" | جرثقیل: "+(crane?"فعال":"ندارد");
    }

    function validate() {
        if (window.SteelLoads) {
            if (typeof window.SteelLoads.syncLegacyInputs === "function") {
                window.SteelLoads.syncLegacyInputs();
            }

            if (typeof window.SteelLoads.validate === "function") {
                const loadError = window.SteelLoads.validate();
                if (loadError) return loadError;
            }
        }

        const d = getData();

        if (!d.projectName) {
            return "نام پروژه را وارد کنید.";
        }

        const positive = [
            ["دهانه", d.span],
            ["طول", d.length],
            ["فاصله قاب‌ها", d.spacing],
            ["ارتفاع ستون", d.height]
        ];

        for (const item of positive) {
            if (!Number.isFinite(item[1]) || item[1] <= 0) {
                return item[0] + " باید بزرگ‌تر از صفر باشد.";
            }
        }

        if (!Number.isFinite(d.rise) || d.rise < 0) {
            return "ارتفاع تاج نمی‌تواند منفی باشد.";
        }

        const loads = [
            ["بار مرده", d.dead],
            ["بار زنده", d.live],
            ["بار باد", d.wind],
            ["بار برف", d.snow]
        ];

        for (const item of loads) {
            if (!Number.isFinite(item[1]) || item[1] < 0) {
                return item[0] + " نامعتبر است.";
            }
        }

        if (d.baseConnection !== "pinned" &&
            d.baseConnection !== "fixed") {
            return "نوع اتصال پای ستون معتبر نیست.";
        }

        if (window.SteelOpenings &&
            typeof window.SteelOpenings.validate === "function") {
            const openingError = window.SteelOpenings.validate();
            if (openingError) return openingError;
        }

        return "";
    }

    function save() {
        const error = validate();

        if (error) {
            alert(error);
            return;
        }

        const data = getData();
        if (!persistSnapshot(data)) {
            setStatus("ذخیره در حافظه مرورگر ناموفق بود؛ فایل JSON همچنان برای ذخیره دستی آماده می‌شود.");
        }

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "Sahroud_Steel_Project.json";

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);

        setStatus(
            "فایل پروژه برای ذخیره در گوشی/رایانه آماده شد؛ نسخه‌ای نیز در حافظه مرورگر ثبت شد، در صورت موفقیت."
        );
    }

    function loadData(data) {
        if (!data || typeof data !== "object") {
            throw new Error("ساختار اطلاعات پروژه معتبر نیست.");
        }

        // مهاجرت کنترل‌شده مشخصات پیش‌فرض قدیمی پرلین Z180:
        // فقط اگر هر چهار مقدار دقیقاً همان مقادیر نمونه ناسازگار قبلی باشند،
        // آن‌ها را به خواص هندسی به‌روزشده منتقل می‌کنیم؛ مقاطع سفارشی کاربر دست‌نخورده می‌مانند.
        const legacyPurlin = data.sections?.analysis3d?.groups?.roofPurlin;
        if (legacyPurlin &&
            Number(legacyPurlin.A_cm2) === 30 &&
            Number(legacyPurlin.Iy_cm4) === 1000 &&
            Number(legacyPurlin.Iz_cm4) === 300 &&
            Number(legacyPurlin.J_cm4) === 20) {
            Object.assign(legacyPurlin, {
                A_cm2: 8.5,
                Iy_cm4: 75.84114583333333,
                Iz_cm4: 418.2083333333333,
                J_cm4: 0.17708333333333334
            });
        }

        // مقدار پیش‌فرض قدیمی فاصله محاسباتی پرلین را فقط در صورت برابر بودن با 1m اصلاح کن.
        if (data.roofPurlins && Number(data.roofPurlins.pitch) === 1) {
            data.roofPurlins.pitch = 0.95;
        }

        const fields = [
            "projectName",
            "owner",
            "designer",
            "projectSteelGrade",
            "city",
            "cityName",
            "projectCategory",
            "structuralSystem",
            "projectNotes",
            "span",
            "length",
            "spacing",
            "height",
            "rise",
            "dead",
            "live",
            "wind",
            "snow"
        ];

        if (data.projectSteelGrade === undefined && data.steelGrade !== undefined) {
            data.projectSteelGrade = data.steelGrade;
        }
        fields.forEach(function (id) {
            if (data[id] !== undefined && $(id)) {
                $(id).value = data[id];
            }
        });
        if ($("cityName")) {
            $("cityName").style.display = ["other", "custom"].includes($("city")?.value) ? "" : "none";
            if (data.cityName !== undefined) $("cityName").value = data.cityName;
        }

        // ارتفاع تاج از فایل پروژه بازیابی می‌شود؛ شیب از rise و نصف دهانه محاسبه می‌شود.
        updateRoofGeometry();

        if ($("baseConnection")) {
            $("baseConnection").value =
                data.baseConnection === "fixed" ? "fixed" : "pinned";
        }

        updateFrameCount();

        if (data.loads && window.SteelLoads &&
            typeof window.SteelLoads.setData === "function") {
            window.SteelLoads.setData(data.loads);
        }

        if (window.SteelLoadCaseWorkbench && typeof window.SteelLoadCaseWorkbench.setData === "function") {
            window.SteelLoadCaseWorkbench.setData(data.loadCaseWorkbench || {});
        }

        if (window.SteelLoads &&
            typeof window.SteelLoads.syncLegacyInputs === "function") {
            window.SteelLoads.syncLegacyInputs();
        }

        if (data.sections && window.SteelSections &&
            typeof window.SteelSections.setData === "function") {
            window.SteelSections.setData(data.sections);
        }

        if (data.sectionGeometryAudit && window.SteelSectionGeometry &&
            typeof window.SteelSectionGeometry.setData === "function") {
            window.SteelSectionGeometry.setData(data.sectionGeometryAudit);
        }

        if (window.SteelTaperedSections && typeof window.SteelTaperedSections.setData === "function") {
            window.SteelTaperedSections.setData(data.taperedMemberSections || {});
        }

        if (data.openings && window.SteelOpenings &&
            typeof window.SteelOpenings.setData === "function") {
            window.SteelOpenings.setData(data.openings);

            if (typeof window.SteelOpenings.check === "function") {
                window.SteelOpenings.check();
            }
        }

        if (window.SteelFabricationTakeoff && typeof window.SteelFabricationTakeoff.setData === "function") {
            window.SteelFabricationTakeoff.setData(data.fabricationTakeoff || {});
        }

        if (window.SteelMarketPrices && typeof window.SteelMarketPrices.setData === "function") {
            window.SteelMarketPrices.setData(data.marketPrices || {});
        }

        if (window.SteelCodeReferences && typeof window.SteelCodeReferences.setData === "function") {
            window.SteelCodeReferences.setData(data.codeReferences || {});
        }

        if (window.SteelCostEstimate && typeof window.SteelCostEstimate.setData === "function") {
            window.SteelCostEstimate.setData(data.costEstimate || {});
        }

        if (window.SteelFoundationTakeoff && typeof window.SteelFoundationTakeoff.setData === "function") {
            window.SteelFoundationTakeoff.setData(data.foundationTakeoff || {});
        }

        if (window.SteelAnchorBaseplateTakeoff && typeof window.SteelAnchorBaseplateTakeoff.setData === "function") {
            window.SteelAnchorBaseplateTakeoff.setData(data.anchorBaseplateTakeoff || {});
        }
        if (window.SteelAnchorDemandScreen && typeof window.SteelAnchorDemandScreen.setData === "function") {
            window.SteelAnchorDemandScreen.setData(data.anchorDemandScreen || {});
        }
        if (window.SteelAnchorCaseDemandUI && typeof window.SteelAnchorCaseDemandUI.setData === "function") {
            window.SteelAnchorCaseDemandUI.setData(data.craneAnchorGroups || {});
        }

        if (window.SteelFootingStructuralScreen && typeof window.SteelFootingStructuralScreen.setData === "function") {
            window.SteelFootingStructuralScreen.setData(data.footingStructuralScreen || {});
        }

        if (window.SteelFootingSizingAssistant && typeof window.SteelFootingSizingAssistant.setData === "function") {
            window.SteelFootingSizingAssistant.setData(data.footingSizingAssistant || {});
        }

        if (window.SteelTieBeamLayout) window.SteelTieBeamLayout.setData(data.tieBeamLayout || {});
        if (window.SteelTieBeamReinforcement) window.SteelTieBeamReinforcement.setData(data.tieBeamReinforcement || {});
        if (window.SteelSiteWorkTakeoff && typeof window.SteelSiteWorkTakeoff.setData === "function") window.SteelSiteWorkTakeoff.setData(data.siteWorkTakeoff || {});

        if (window.SteelCraneReadiness && typeof window.SteelCraneReadiness.setData === "function") {
            window.SteelCraneReadiness.setData(data.craneReadiness || {});
        }
        if (window.SteelCraneLoadPath && typeof window.SteelCraneLoadPath.setData === "function") {
            window.SteelCraneLoadPath.setData(data.craneLoadPath || {});
        }

        if (window.SteelCraneTrainAnalysis) window.SteelCraneTrainAnalysis.setData(data.craneTrainAnalysis || {});
        if (window.SteelCraneHorizontalLoads) window.SteelCraneHorizontalLoads.setData(data.craneHorizontalLoads || {});
        if (window.SteelCraneTwoRailTransfer) window.SteelCraneTwoRailTransfer.setData(data.craneTwoRailTransfer || {});
        if (window.SteelRunwayGirderFEM) window.SteelRunwayGirderFEM.setData(data.runwayGirderFEM || {});
        if (window.SteelCrane3DIntegration) window.SteelCrane3DIntegration.setData(data.crane3DIntegration || {});

        if (window.SteelGeotechnicalData && typeof window.SteelGeotechnicalData.setData === "function") {
            window.SteelGeotechnicalData.setData(data.geotechnicalData || {});
        }

        if (window.SteelMemberDesignInputs &&
            typeof window.SteelMemberDesignInputs.setData === "function") {
            window.SteelMemberDesignInputs.setData(data.memberDesignInputs || {});
        }

        if (window.SteelColdFormedMemberRegistry) {
            window.SteelColdFormedMemberRegistry.setData(data.coldFormedMemberRegistry || {});
        }

        if (window.SteelTensionDesignReadiness && typeof window.SteelTensionDesignReadiness.setData === "function") {
            window.SteelTensionDesignReadiness.setData(data.tensionDesignReadiness || {});
        }

        if (window.SteelBraceConnectionReadiness && typeof window.SteelBraceConnectionReadiness.setData === "function") {
            window.SteelBraceConnectionReadiness.setData(data.braceConnectionReadiness || {});
        }

        if (window.SteelCompressionDesignReadiness && typeof window.SteelCompressionDesignReadiness.setData === "function") {
            window.SteelCompressionDesignReadiness.setData(data.compressionDesignReadiness || {});
        }

        if (window.SteelCompressionCapacityIntegration && typeof window.SteelCompressionCapacityIntegration.setData === "function") {
            window.SteelCompressionCapacityIntegration.setData(data.compressionCapacityInputs || {});
        }

        if (window.SteelDesignCore && typeof window.SteelDesignCore.setData === "function") {
            const legacyClimate = data.loads && data.loads.climate ? data.loads.climate : {};
            window.SteelDesignCore.setData(data.designBrief || {
                occupancy: legacyClimate.buildingUse === "warehouse-industrial-enclosed" ? "industrial" : legacyClimate.buildingUse,
                enclosure: legacyClimate.openingState
            });
        }
        syncProjectDesignBrief();

        if (data.climateDatabase && window.SteelClimateDB &&
            typeof window.SteelClimateDB.setData === "function") {
            window.SteelClimateDB.setData(data.climateDatabase);
        }

        if (data.climateLoadEngine && window.SteelClimateLoadEngine &&
            typeof window.SteelClimateLoadEngine.setData === "function") {
            window.SteelClimateLoadEngine.setData(data.climateLoadEngine);
        }

        if (window.SteelWindBasis && typeof window.SteelWindBasis.setData === "function") {
            window.SteelWindBasis.setData(data.windBasis || {});
        }

        if (window.SteelDirectionalWind && typeof window.SteelDirectionalWind.setData === "function") {
            window.SteelDirectionalWind.setData(data.directionalWind || {});
        }

        if (window.SteelStructuralModel && typeof window.SteelStructuralModel.setData === "function") {
            window.SteelStructuralModel.setData(data.structuralModel || {});
        }

        if (data.girders && window.SteelGirder &&
            typeof window.SteelGirder.setData === "function") {
            window.SteelGirder.setData(data.girders);
        }

        if (window.SteelTies &&
            typeof window.SteelTies.setData === "function") {
            window.SteelTies.setData(data.wallTies || {});
        }

        if (window.SteelRoofTies &&
            typeof window.SteelRoofTies.setData === "function") {
            window.SteelRoofTies.setData(data.roofTies || {});
        }

        // بازیابی تنظیمات پرلین‌های سقف
        if (window.SteelRoofPurlins &&
            typeof window.SteelRoofPurlins.setData === "function") {
            window.SteelRoofPurlins.setData(
                data.roofPurlins || {}
            );
        }

        if (window.SteelPurlinCantileverConnection &&
            typeof window.SteelPurlinCantileverConnection.setData === "function") {
            window.SteelPurlinCantileverConnection.setData(
                data.purlinCantileverConnection || {}
            );
        }

        if (window.SteelBracing &&
            typeof window.SteelBracing.drawAll === "function") {
            window.SteelBracing.drawAll();
        }

        if (window.SteelTies &&
            typeof window.SteelTies.drawAll === "function") {
            window.SteelTies.drawAll();
        }

        window.SteelMarketPrices?.syncProjectCity?.();
        const craneDetails=$("craneAdvancedDetails"); if(craneDetails)craneDetails.open=!!$("crane_enabled")?.checked;
        updateProjectSetupSummary();
        persistSnapshot(getData());
        setStatus(
            "پروژه بازیابی شد؛ تنظیمات قیدهای دیوار، قیدهای سقف، پرلین‌ها و اتصال کنسول نیز بازیابی شدند."
        );
    }

    function loadFile(file) {
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function () {
            try {
                const data = JSON.parse(reader.result);
                loadData(data);
            } catch (error) {
                alert("خطا در بازکردن فایل پروژه: " + error.message);
            }
        };

        reader.onerror = function () {
            alert("خواندن فایل با خطا مواجه شد.");
        };

        reader.readAsText(file, "UTF-8");
    }

    window.updateRoofGeometry = updateRoofGeometry;

    window.SteelProject = {
        getData,
        saveSnapshot: () => persistSnapshot(getData()),
        validate,
        save,
        loadFile,
        loadData,
        updateFrameCount,
        setStatus,
        getBaseConnection
    };

    // Surface uncaught script/worker failures in the existing project status area
    // so a failed button action does not appear to do nothing.
    if (!window.__sahroudRuntimeDiagnosticsInstalled) {
        window.__sahroudRuntimeDiagnosticsInstalled = true;
        window.addEventListener("error", function (event) {
            const detail = event && (event.message || event.error?.message);
            if (detail) setStatus("خطای اجرای برنامه: " + String(detail).slice(0, 240));
        });
        window.addEventListener("unhandledrejection", function (event) {
            const reason = event?.reason;
            const detail = reason?.message || String(reason || "وعده ناموفق");
            setStatus("خطای عملیات: " + detail.slice(0, 240));
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        updateFrameCount();
        updateProjectSetupSummary();

        ["length", "spacing"].forEach(function (id) {
            const el = $(id);

            if (el) {
                el.addEventListener("input", updateFrameCount);
            }
        });

        ["span", "rise", "height", "structuralSystem"].forEach(function (id) {
            const el = $(id);
            if (el) {
                // ورودی لحظه‌ای فقط اعداد/برچسب‌های هندسی را به‌روز می‌کند؛ ترسیم سنگین فقط پس از تثبیت مقدار اجرا می‌شود.
                el.addEventListener("input", updateRoofGeometry);
                el.addEventListener("change", function () {
                    updateRoofGeometry();
                    if (window.SteelDrawing && typeof window.SteelDrawing.drawFrame === "function") window.SteelDrawing.drawFrame();
                });
            }
        });
        ["span","length","spacing","height","rise","city","cityName","projectCategory","structuralSystem","crane_enabled"].forEach(function(id){
            const el=$(id); if(el){el.addEventListener("input",updateProjectSetupSummary);el.addEventListener("change",function(){
                if(id==="crane_enabled"){const details=$("craneAdvancedDetails");if(details)details.open=!!el.checked;}
                updateProjectSetupSummary();
                if (["projectCategory","structuralSystem","crane_enabled"].includes(id)) syncProjectDesignBrief();
            });}
        });
        const projectGrade = $("projectSteelGrade");
        if (projectGrade) {
            projectGrade.addEventListener("change", function(){ syncProjectSteelGradeToSection(true); });
        }
        const applySetup=$("btnApplyProjectSetup");
        if(applySetup)applySetup.addEventListener("click",function(){
            const error=validate();
            if(error){setStatus(error);if($("projectSetupStatus"))$("projectSetupStatus").textContent=error;return;}
            const saved=persistSnapshot(getData());
            if(window.SteelDrawing&&typeof window.SteelDrawing.drawFrame==="function")window.SteelDrawing.drawFrame();
            // ثبت مشخصات فقط ذخیره و پیش‌نمایش دوبعدی را به‌روز می‌کند.
            // تولید مدل سه‌بعدی سنگین فقط با دکمه مستقل «ساخت مدل هندسی» انجام می‌شود.
            const singleSlope=$("structuralSystem")?.value==="portal-single-slope";
            const saveMessage=saved?"مشخصات پروژه ثبت و در حافظه مرورگر ذخیره شد.":"مشخصات بررسی شد، اما ذخیره خودکار مرورگر ناموفق بود؛ از ذخیره پروژه فایل JSON بگیرید.";
            setStatus(singleSlope?saveMessage+" مدل سه‌بعدی تک‌شیب هنوز آماده تحلیل نیست.":saveMessage);
            if($("projectSetupStatus"))$("projectSetupStatus").textContent=singleSlope?"مشخصات و پیش‌نمایش دوبعدی تک‌شیب ثبت شد؛ مدل سه‌بعدی و تحلیل این سیستم هنوز آماده نیست.":"مشخصات ذخیره شد و پیش‌نمایش قاب به‌روزرسانی شد؛ بارگذاری و کنترل‌های طراحی هنوز باید تکمیل شوند.";
            $("drawingArea")?.scrollIntoView?.({behavior:"smooth",block:"start"});
        });

        if ($("baseConnection")) {
            $("baseConnection").value =
                $("baseConnection").value === "fixed" ? "fixed" : "pinned";
        }

        document.addEventListener("input", function (event) {
            if (event.target && event.target.closest && event.target.closest("main")) {
                scheduleAutoSave();
            }
        });
        document.addEventListener("change", function (event) {
            if (event.target && event.target.closest && event.target.closest("main")) {
                scheduleAutoSave();
            }
        });
    });

    // هنگام رفتن برنامه به پس‌زمینه یا بستن صفحه، تغییرات معوق فوراً ثبت شوند.
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden" && persistTimer) flushAutoSave();
    });
    window.addEventListener("pagehide", function () {
        if (persistTimer) flushAutoSave();
    });

    window.addEventListener("load", function () {
        restoreLastProject();
    }, { once: true });

    updateFrameCount();
})();


/* ===== steel2/js/crane-readiness.js ===== */
/* SAHROUD STEEL - Crane and runway input readiness
 * Captures crane data and blocks unsupported design claims.
 * This module does NOT calculate wheel reactions, runway girder capacity,
 * fatigue resistance, crane brackets, or crane load combinations.
 */
(function(root){
"use strict";
const IDS=["enabled","ratedCapacity_t","trolleyMass_t","bridgeMass_t","runwaySpan_m","wheelsPerSide","wheelSpacing_m","verticalImpact","transverseCoeff","longitudinalCoeff","cranesCount","runwayElevation_m","maxWheelLoad_t","minWheelLoad_t","wheelLoadSource","wheelLoadDocument","dailyCycles","serviceYears","manufacturer","standard","notes"];
const $=id=>document.getElementById("crane_"+id);
const num=id=>{const el=$(id);if(!el||el.value==="")return null;const n=Number(el.value);return Number.isFinite(n)?n:null;};
const defaults={enabled:false,ratedCapacity_t:"",trolleyMass_t:"",bridgeMass_t:"",runwaySpan_m:"",wheelsPerSide:"",wheelSpacing_m:"",verticalImpact:"",transverseCoeff:"",longitudinalCoeff:"",cranesCount:"",runwayElevation_m:"",maxWheelLoad_t:"",minWheelLoad_t:"",wheelLoadSource:"",wheelLoadDocument:"",dailyCycles:"",serviceYears:"",manufacturer:"",standard:"",notes:""};
let state={...defaults};
function readUI(){
 const d={enabled:!!$("enabled")?.checked};
 IDS.filter(x=>x!=="enabled").forEach(id=>{const el=$(id);d[id]=el?el.value:"";});
 return d;
}
function setData(data){
 state={...defaults,...(data&&typeof data==="object"?data:{})};
 if($("enabled"))$("enabled").checked=!!state.enabled;
 IDS.filter(x=>x!=="enabled").forEach(id=>{if($(id))$(id).value=state[id]??"";});
 render();
}
function audit(data){
 const d={...defaults,...(data||{})},issues=[],missing=[];
 if(!d.enabled)return {status:"not_applicable",ready:false,issues:["جرثقیل در پروژه فعال نشده است."],missing:[]};
 const required=["ratedCapacity_t","trolleyMass_t","bridgeMass_t","runwaySpan_m","wheelsPerSide","wheelSpacing_m","verticalImpact","transverseCoeff","longitudinalCoeff","cranesCount","runwayElevation_m","maxWheelLoad_t","minWheelLoad_t","dailyCycles","serviceYears"];
 required.forEach(k=>{if(d[k]===""||d[k]===null||!Number.isFinite(Number(d[k])))missing.push(k);});
 const positive=["ratedCapacity_t","runwaySpan_m","wheelsPerSide","wheelSpacing_m","cranesCount","serviceYears"];
 positive.forEach(k=>{if(d[k]!==""&&Number(d[k])<=0)issues.push(k+" باید بزرگ‌تر از صفر باشد.");});
 ["trolleyMass_t","bridgeMass_t","minWheelLoad_t","dailyCycles"].forEach(k=>{if(d[k]!==""&&Number(d[k])<0)issues.push(k+" نمی‌تواند منفی باشد.");});
 if(d.verticalImpact!==""&&Number(d.verticalImpact)<=0)issues.push("ضریب اثر دینامیکی قائم باید مثبت باشد؛ مقدار آن مستقیماً در بارهای قائم استاتیکی چرخ ضرب می‌شود.");
 ["transverseCoeff","longitudinalCoeff"].forEach(k=>{if(d[k]!==""&&Number(d[k])<0)issues.push(k+" نمی‌تواند منفی باشد.");});
 if(d.wheelsPerSide!==""&&!Number.isInteger(Number(d.wheelsPerSide)))issues.push("تعداد چرخ در هر سمت باید عدد صحیح باشد.");
 if(d.cranesCount!==""&&!Number.isInteger(Number(d.cranesCount)))issues.push("تعداد جرثقیل‌ها باید عدد صحیح باشد.");
 if(d.maxWheelLoad_t!==""&&Number(d.maxWheelLoad_t)<=0)issues.push("حداکثر بار چرخ باید بزرگ‌تر از صفر باشد.");
 if(d.minWheelLoad_t!==""&&d.maxWheelLoad_t!==""&&Number(d.minWheelLoad_t)>Number(d.maxWheelLoad_t))issues.push("حداقل بار چرخ نمی‌تواند از حداکثر بار چرخ بیشتر باشد.");
 if(!String(d.wheelLoadSource||"").trim())missing.push("wheelLoadSource");
 if(!String(d.wheelLoadDocument||"").trim())missing.push("wheelLoadDocument");
 if(!String(d.manufacturer||"").trim())missing.push("manufacturer");
 if(!String(d.standard||"").trim())missing.push("standard");
 issues.push("ضرایب ضربه و نیروهای افقی باید از مشخصات سازنده و ضوابط معتبر پروژه تعیین شوند؛ مقادیر نمونه گزارش قدیمی سوله‌پرداز به‌صورت پیش‌فرض اعمال نشده‌اند.");
 issues.push("بارهای حداکثر و حداقل چرخ باید از کاتالوگ یا نقشه سازنده ثبت شوند؛ تا قبل از دریافت این داده‌ها واکنش چرخ‌ها و طراحی تیر حمال انجام نمی‌شود. توزیع بار بین پل‌ها، خطوط تأثیر، خستگی و براکت نیز هنوز محاسبه نشده‌اند.");
 issues.push("بارهای جرثقیل باید به‌صورت حالت‌های بار مجزا وارد تحلیل سه‌بعدی شوند و ترکیبات آیین‌نامه‌ای با علائم و ضرایب مصوب ساخته شوند.");
 return {status:missing.length?"incomplete":"review_required",ready:false,missing,issues,entered:{ratedCapacity_t:d.ratedCapacity_t,trolleyMass_t:d.trolleyMass_t,bridgeMass_t:d.bridgeMass_t,runwaySpan_m:d.runwaySpan_m,wheelsPerSide:d.wheelsPerSide,wheelSpacing_m:d.wheelSpacing_m,maxWheelLoad_t:d.maxWheelLoad_t,minWheelLoad_t:d.minWheelLoad_t,wheelLoadSource:d.wheelLoadSource,wheelLoadDocument:d.wheelLoadDocument,cranesCount:d.cranesCount,dailyCycles:d.dailyCycles,serviceYears:d.serviceYears}};
}
function render(){
 const box=$("results");if(!box)return;
 const d=readUI(),a=audit(d);
 box.innerHTML="";
 const title=document.createElement("p");title.className="notice";
 title.textContent=!d.enabled?"جرثقیل برای این پروژه فعال نشده است.":a.missing.length?"اطلاعات جرثقیل ناقص است؛ "+a.missing.length+" ورودی اصلی باقی مانده.":"اطلاعات اولیه ثبت شده، اما طراحی جرثقیل و تیر حمال هنوز تأیید نشده است.";
 box.appendChild(title);
 a.issues.forEach(msg=>{const p=document.createElement("p");p.className="notice";p.textContent="⚠ "+msg;box.appendChild(p);});
}
function getData(){return readUI();}
function init(){
 IDS.forEach(id=>{const el=$(id);if(el){el.addEventListener("input",render);el.addEventListener("change",render);}});
 $("enabled")?.addEventListener("change",render);
 $("audit")?.addEventListener("click",render);
 render();
}
root.SteelCraneReadiness={getData,setData,readUI,audit,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(window);


/* ===== steel2/js/crane-load-path-classifier.js ===== */
/* SAHROUD STEEL — crane load-path classifier
 * Classifies where crane wheel actions belong. It does not calculate wheel loads,
 * analyze the supporting system, or approve a floor slab/runway/foundation design.
 */
(function(root){
"use strict";
const TYPES=["overhead","gantry","floor_rail"];
const SUPPORTS=["runway_girder","slab","grade_beam","independent_foundation"];
const LABELS={overhead:"جرثقیل سقفی",gantry:"جرثقیل دروازه‌ای زمینی",floor_rail:"جرثقیل روی ریل زمینی"};
function classify(input){
 const p=input||{},issues=[],type=String(p.craneType||""),support=String(p.supportSystem||"");
 if(!TYPES.includes(type))issues.push("نوع جرثقیل باید مشخص و معتبر باشد.");
 if(!SUPPORTS.includes(support))issues.push("سیستم تکیه‌گاهی مسیر چرخ باید مشخص شود.");
 if(type==="overhead"&&support!=="runway_girder")issues.push("برای جرثقیل سقفی، بار چرخ باید به ریل و تیر حمال جرثقیل منتقل شود؛ اعمال مستقیم به کف سوله مجاز نیست.");
 if(type==="gantry"&&!["slab","grade_beam","independent_foundation"].includes(support))issues.push("جرثقیل دروازه‌ای زمینی باید روی کف طراحی‌شده، تیر/نوار بتنی یا فونداسیون مستقل تکیه کند.");
 if(type==="floor_rail"&&!["slab","grade_beam","independent_foundation"].includes(support))issues.push("ریل زمینی باید به کف، تیر/نوار بتنی یا فونداسیون مستقل متصل شود.");
 const path=type==="overhead"
  ?["wheel","rail","runway_girder","bracket_or_corbel","column","base_plate_and_anchors","footing","soil"]
  :["wheel","rail",support,"subgrade_or_foundation","soil"];
 const target=type==="overhead"?"crane_runway_and_frame":support==="slab"?"floor_slab":support==="grade_beam"?"ground_beam":"independent_rail_foundation";
 return {valid:issues.length===0,craneType:type,craneLabel:LABELS[type]||"نامشخص",supportSystem:support,loadTarget:issues.length?null:target,loadPath:issues.length?[]:path,excludeFromFloorSlab:type==="overhead",issues,analysisEnabled:false,designApproved:false};
}
function auditCases(cases){
 const rows=Array.isArray(cases)?cases:[],issues=[];
 if(!rows.length)issues.push("حداقل یک تعریف جرثقیل لازم است.");
 const ids=new Set();
 rows.forEach((x,i)=>{const id=String(x?.id||"").trim();if(!id)issues.push("شناسه جرثقیل ردیف "+(i+1)+" خالی است.");else if(ids.has(id))issues.push("شناسه تکراری جرثقیل: "+id);else ids.add(id);
 const r=classify(x);r.issues.forEach(v=>issues.push((id||("ردیف "+(i+1)))+": "+v));});
 return {ready:issues.length===0,items:rows.map(x=>({id:x.id,...classify(x)})),issues,analysisEnabled:false,designApproved:false};
}
function routeWheelActions(crane,inputActions){
 const c=classify(crane),actions=Array.isArray(inputActions)?inputActions:[];
 if(!c.valid)return {success:false,issues:c.issues,actions:[],analysisEnabled:false};
 const invalid=actions.filter(a=>!a||!String(a.id||"").trim()||![a.verticalKN,a.longitudinalKN??0,a.transverseKN??0].every(v=>Number.isFinite(Number(v))));
 if(invalid.length)return {success:false,issues:["هر واکنش چرخ باید شناسه و مؤلفه‌های نیروی عددی معتبر داشته باشد."],actions:[],analysisEnabled:false};
 return {success:true,loadTarget:c.loadTarget,loadPath:c.loadPath,actions:actions.map(a=>({id:String(a.id),target:c.loadTarget,verticalKN:Number(a.verticalKN),longitudinalKN:Number(a.longitudinalKN||0),transverseKN:Number(a.transverseKN||0)})),note:"این فقط برچسب‌گذاری مسیر بار است؛ نیروها به مدل FEM تزریق نشده‌اند.",analysisEnabled:false,designApproved:false};
}
const defaults={id:"CRANE-1",craneType:"overhead",supportSystem:"runway_girder"};
let uiState={...defaults};
function readUI(){return {id:document.getElementById("cranePath_id")?.value||uiState.id,craneType:document.getElementById("cranePath_type")?.value||uiState.craneType,supportSystem:document.getElementById("cranePath_support")?.value||uiState.supportSystem};}
function setData(data){uiState={...defaults,...(data||{})};if(typeof document==="undefined")return;const a=document.getElementById("cranePath_id"),b=document.getElementById("cranePath_type"),c=document.getElementById("cranePath_support");if(a)a.value=uiState.id;if(b)b.value=uiState.craneType;if(c)c.value=uiState.supportSystem;}
function ensurePanel(){
 if(document.getElementById("craneLoadPathPanel"))return;
 const host=document.getElementById("craneReadinessPanel");if(!host)return;
 const p=document.createElement("section");p.className="panel";p.id="craneLoadPathPanel";
 p.innerHTML='<div class="panel-title"><h3>تعیین مسیر انتقال بار چرخ جرثقیل</h3><span class="status">ممیزی مسیر بار</span></div><div class="notice">نوع جرثقیل و تکیه‌گاه مسیر چرخ را انتخاب کنید. این کنترل از اعمال اشتباه بار چرخ جرثقیل سقفی به بتن کف جلوگیری می‌کند؛ به‌تنهایی تحلیل یا تأیید ظرفیت نیست.</div><div class="form-grid"><div class="field"><label for="cranePath_id">شناسه جرثقیل</label><input id="cranePath_id" value="CRANE-1"></div><div class="field"><label for="cranePath_type">نوع جرثقیل</label><select id="cranePath_type"><option value="overhead">سقفی</option><option value="gantry">دروازه‌ای زمینی</option><option value="floor_rail">تجهیز روی ریل زمینی</option></select></div><div class="field"><label for="cranePath_support">سیستم تکیه‌گاهی مسیر چرخ</label><select id="cranePath_support"><option value="runway_girder">ریل و تیر حمال جرثقیل</option><option value="slab">دال کف سوله</option><option value="grade_beam">تیر/نوار بتنی زمینی</option><option value="independent_foundation">فونداسیون مستقل ریل</option></select></div></div><div class="button-grid"><button id="cranePath_audit" class="btn secondary" type="button">ممیزی مسیر انتقال بار</button></div><div id="cranePath_result" class="notice">پیش‌فرض: جرثقیل سقفی؛ بار چرخ به تیر حمال و قاب منتقل می‌شود.</div>';
 host.insertAdjacentElement("afterend",p);setData(uiState);
 p.querySelectorAll("input,select").forEach(e=>e.addEventListener("change",()=>{uiState=readUI();root.dispatchEvent(new CustomEvent("sahroud-crane-load-path-change",{detail:uiState}));}));
 document.getElementById("cranePath_audit").addEventListener("click",()=>{const r=classify(readUI());document.getElementById("cranePath_result").textContent=(r.valid?"مسیر معتبر برای بررسی بعدی: ":"مسیر نامعتبر: ")+ (r.valid?r.loadPath.join(" ← "):r.issues.join(" | "));});
}
function selfTest(){
 const tests=[],test=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 test("overhead crane routes to runway girder",()=>classify({craneType:"overhead",supportSystem:"runway_girder"}).loadTarget==="crane_runway_and_frame");
 test("overhead crane rejected on floor slab",()=>!classify({craneType:"overhead",supportSystem:"slab"}).valid);
 test("overhead load path includes columns and footing",()=>{const r=classify({craneType:"overhead",supportSystem:"runway_girder"});return r.loadPath.includes("column")&&r.loadPath.includes("footing");});
 test("gantry crane may use designed slab",()=>classify({craneType:"gantry",supportSystem:"slab"}).valid);
 test("gantry crane may use independent foundation",()=>classify({craneType:"gantry",supportSystem:"independent_foundation"}).valid);
 test("floor rail may use ground beam",()=>classify({craneType:"floor_rail",supportSystem:"grade_beam"}).valid);
 test("unsupported type rejected",()=>!classify({craneType:"unknown",supportSystem:"slab"}).valid);
 test("missing support rejected",()=>!classify({craneType:"floor_rail"}).valid);
 test("duplicate crane identifiers rejected",()=>!auditCases([{id:"C1",craneType:"overhead",supportSystem:"runway_girder"},{id:"C1",craneType:"gantry",supportSystem:"slab"}]).ready);
 test("wheel actions routed without changing force values",()=>{const r=routeWheelActions({craneType:"gantry",supportSystem:"slab"},[{id:"W1",verticalKN:42,longitudinalKN:3,transverseKN:2}]);return r.success&&r.actions[0].verticalKN===42&&r.actions[0].target==="floor_slab";});
 test("invalid wheel action blocked",()=>!routeWheelActions({craneType:"overhead",supportSystem:"runway_girder"},[{id:"W1",verticalKN:"bad"}]).success);
 test("classification never enables analysis or approval",()=>{const r=classify({craneType:"overhead",supportSystem:"runway_girder"});return !r.analysisEnabled&&!r.designApproved;});
 test("crane selector state round-trips",()=>{root.SteelCraneLoadPath.setData({id:"CR-02",craneType:"gantry",supportSystem:"independent_foundation"});const x=root.SteelCraneLoadPath.getData();return x.id==="CR-02"&&x.craneType==="gantry"&&x.supportSystem==="independent_foundation";});
 test("missing saved crane settings restore safe overhead defaults",()=>{root.SteelCraneLoadPath.setData({});const x=root.SteelCraneLoadPath.getData();return x.craneType==="overhead"&&x.supportSystem==="runway_girder";});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,designApproved:false,note:"Classification and routing software tests only; no wheel-load calculation, FEM transfer, or engineering approval."};
}
root.SteelCraneLoadPath={classify,auditCases,routeWheelActions,readUI,getData:()=>({...uiState}),setData,ensurePanel,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-train-analysis.js ===== */
/* SAHROUD STEEL — documented wheel-train static placement on a simply supported runway beam.
 * Uses manufacturer-entered individual wheel loads; no load distribution or impact factors are invented.
 * This is a single-position beam analysis, not a moving-load envelope or design check.
 */
(function(root){
"use strict";
const $=id=>document.getElementById("craneTrain_"+id);
const defaults={span_m:"",positions_m:"0, 1.5",loads_t:"",firstWheelOffset_m:"0",loadSource:"",loadDocument:""};
let state={...defaults};
const parseList=s=>String(s??"").split(",").map(x=>x.trim()).map(x=>x===""?NaN:Number(x));
function readUI(){const d={};Object.keys(defaults).forEach(k=>d[k]=$(k)?.value??state[k]);return d;}
function setData(d){state={...defaults,...(d||{})};Object.keys(defaults).forEach(k=>{if($(k))$(k).value=state[k];});render();}
function analyze(input){
 const d={...defaults,...(input||{})},L=Number(d.span_m),offset=Number(d.firstWheelOffset_m);
 const positions=parseList(d.positions_m),loads=parseList(d.loads_t),issues=[];
 if(!Number.isFinite(L)||L<=0)issues.push("دهانه معتبر تیر حمال وارد نشده است.");
 if(!Number.isFinite(offset))issues.push("موقعیت چرخ اول معتبر نیست.");
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0))issues.push("فاصله‌های چرخ باید فهرست عددی نامنفی باشند.");
 if(positions.length&&positions[0]!==0)issues.push("فاصله چرخ اول باید صفر باشد؛ سایر فاصله‌ها نسبت به آن سنجیده می‌شوند.");
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("فاصله‌های تجمعی چرخ‌ها باید صعودی و بدون تکرار باشند.");
 if(loads.length!==positions.length||loads.some(x=>!Number.isFinite(x)||x<=0))issues.push("برای هر چرخ دقیقاً یک بار مثبت و مستقل بر حسب تن وارد کنید.");
 if(!String(d.loadSource||"").trim())issues.push("منبع مستند بارهای چرخ را وارد کنید.");
 if(!String(d.loadDocument||"").trim())issues.push("شماره صفحه کاتالوگ یا مرجع نقشه بار چرخ الزامی است.");
 if(issues.length)return {ok:false,issues};
 const wheels=positions.map((p,i)=>({id:i+1,x:offset+p,P:loads[i]*9.80665,load_t:loads[i]}));
 const active=wheels.filter(w=>w.x>=-1e-9&&w.x<=L+1e-9);
 if(!active.length)return {ok:false,issues:["در موقعیت فعلی هیچ چرخی روی دهانه تیر قرار ندارد."],wheels};
 const RA=active.reduce((v,w)=>v+w.P*(L-w.x)/L,0),RB=active.reduce((v,w)=>v+w.P*w.x/L,0);
 const xs=[0,...active.map(w=>Math.max(0,Math.min(L,w.x))),L].sort((a,b)=>a-b);
 const unique=xs.filter((x,i)=>i===0||Math.abs(x-xs[i-1])>1e-9);
 const at=x=>RA*x-active.reduce((v,w)=>v+w.P*Math.max(0,x-w.x),0);
 const samples=unique.map(x=>({x_m:x,M_kNm:at(x)}));
 const peak=samples.reduce((a,b)=>Math.abs(b.M_kNm)>Math.abs(a.M_kNm)?b:a,samples[0]);
 const positive=samples.reduce((a,b)=>b.M_kNm>a.M_kNm?b:a,samples[0]);
 const leftShear=RA,rightShear=RA-active.reduce((v,w)=>v+w.P,0);
 return {ok:true,span_m:L,offset_m:offset,wheels,activeWheelCount:active.length,reactions_kN:{left:RA,right:RB},maxAbsMoment_kNm:Math.abs(peak.M_kNm),peakMoment:{x_m:peak.x_m,M_kNm:peak.M_kNm},maxPositiveMoment_kNm:positive.M_kNm,positiveMomentLocation_m:positive.x_m,shear_kN:{justRightOfLeft:leftShear,justLeftOfRight:rightShear},equilibriumError_kN:Math.abs(RA+RB-active.reduce((v,w)=>v+w.P,0)),method:"تحلیل استاتیکی تیر دو سر مفصل؛ بارهای متمرکز ثابت در موقعیت اعلام‌شده؛ نمودار لنگر بین چرخ‌ها خطی است و نقاط چرخ/تکیه‌گاه ارزیابی شده‌اند."};
}
function movingEnvelope(input){
 const d={...defaults,...(input||{})},L=Number(d.span_m),positions=parseList(d.positions_m),loads=parseList(d.loads_t),issues=[];
 if(!Number.isFinite(L)||L<=0)issues.push("دهانه معتبر تیر حمال وارد نشده است.");
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0))issues.push("فاصله‌های تجمعی چرخ‌ها معتبر نیستند.");
 if(positions.length&&positions[0]!==0)issues.push("فاصله چرخ اول باید صفر باشد.");
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("فاصله‌های چرخ باید صعودی و بدون تکرار باشند.");
 if(loads.length!==positions.length||loads.some(x=>!Number.isFinite(x)||x<=0))issues.push("برای هر چرخ یک بار مثبت مستقل لازم است.");
 if(!String(d.loadSource||"").trim()||!String(d.loadDocument||"").trim())issues.push("منبع و مرجع مستند بارهای چرخ الزامی است.");
 if(issues.length)return {ok:false,issues};
 const P=loads.map(x=>x*9.80665);let best={M_kNm:-Infinity,x_m:null,offset_m:null,event:""};
 const evaluate=(x,a,event)=>{
  if(x< -1e-8||x>L+1e-8)return;
  const z=positions.map(p=>a+p),active=z.map((v,i)=>({x:v,P:P[i]})).filter(w=>w.x>=-1e-9&&w.x<=L+1e-9);
  const RA=active.reduce((v,w)=>v+w.P*(L-w.x)/L,0);
  const M=RA*x-active.reduce((v,w)=>v+w.P*Math.max(0,x-w.x),0);
  if(M>best.M_kNm)best={M_kNm:M,x_m:x,offset_m:a,event};
 };
 // Translation breakpoints where any wheel enters/leaves a support.
 positions.forEach((pj,j)=>{
  [-pj,L-pj].forEach(a=>{
   const z=positions.map(p=>a+p).filter(v=>v>=-1e-9&&v<=L+1e-9);
   [0,L,...z].forEach(x=>evaluate(x,a,"wheel enters/exits support"));
  });
 });
 // For a wheel located exactly at the section x, optimize the resulting quadratic
 // on every interval where the set of wheels on the beam is unchanged.
 positions.forEach((pj,j)=>{
  const ds=positions.map(p=>p-pj),cuts=[0,L];
  ds.forEach(d=>{const a=-d,b=L-d;if(a>0&&a<L)cuts.push(a);if(b>0&&b<L)cuts.push(b);});
  cuts.sort((a,b)=>a-b);
  const unique=cuts.filter((x,i)=>i===0||Math.abs(x-cuts[i-1])>1e-9);
  for(let k=0;k<unique.length-1;k++){
   const lo=unique[k],hi=unique[k+1],mid=(lo+hi)/2;
   let A=0,B=0,C=0;
   ds.forEach((d,i)=>{const z=mid+d;if(z<0||z>L)return;A-=P[i]/L;B+=P[i]*(L-d)/L;if(d<=0)C+=P[i]*d;});
   const candidates=[lo,hi];if(A<0){const v=-B/(2*A);if(v>lo&&v<hi)candidates.push(v);}
   candidates.forEach(x=>evaluate(x,x-pj,"wheel at critical section"));
  }
 });
 return {ok:true,span_m:L,maxPositiveMoment_kNm:Math.max(0,best.M_kNm),criticalSection_m:best.x_m,criticalFirstWheelOffset_m:best.offset_m,governingEvent:best.event,method:"پوش دقیق لنگر مثبت برای قطار بار متمرکز روی تیر ساده دو سر مفصل؛ نقاط ورود/خروج چرخ و نقاط عبور چرخ از مقطع، با بهینه‌سازی تحلیلی سهم درجه‌دوم بین مرزهای فعال‌بودن چرخ‌ها بررسی شده‌اند.",limitations:["فقط بارهای قائم متمرکز و یک قطار جرثقیل","تیر ساده دو سر مفصل و یک دهانه","بدون اثر ضربه، نیروهای افقی، وزن تیر/ریل، پیچش، خستگی یا طراحی مقطع"]};
}
function movingShearEnvelope(input){
 const d={...defaults,...(input||{})},L=Number(d.span_m),positions=parseList(d.positions_m),loads=parseList(d.loads_t),issues=[];
 if(!Number.isFinite(L)||L<=0)issues.push("دهانه معتبر تیر حمال وارد نشده است.");
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0))issues.push("فاصله‌های تجمعی چرخ‌ها معتبر نیستند.");
 if(positions.length&&positions[0]!==0)issues.push("فاصله چرخ اول باید صفر باشد.");
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("فاصله‌های چرخ باید صعودی و بدون تکرار باشند.");
 if(loads.length!==positions.length||loads.some(x=>!Number.isFinite(x)||x<=0))issues.push("برای هر چرخ یک بار مثبت مستقل لازم است.");
 if(!String(d.loadSource||"").trim()||!String(d.loadDocument||"").trim())issues.push("منبع و مرجع مستند بارهای چرخ الزامی است.");
 if(issues.length)return {ok:false,issues};
 const P=loads.map(x=>x*9.80665),events=new Set();
 positions.forEach(p=>{events.add(-p);events.add(L-p);});
 const offsets=[...events].sort((a,b)=>a-b);
 let maxRA={value:0,offset:null},minRA={value:0,offset:null};
 let maxRB={value:0,offset:null},minRB={value:0,offset:null};
 let leftMaxCase={value:0,offset:null,RA_kN:0,RB_kN:0},rightMaxCase={value:0,offset:null,RA_kN:0,RB_kN:0};
 let maxV={value:0,offset:null,x:null,side:""},minV={value:0,offset:null,x:null,side:""};
 const take=(target,value,offset,x,side)=>{if(value>target.value){target.value=value;target.offset=offset;target.x=x;target.side=side;}};
 // Between consecutive support-entry/exit events, the active wheel set and order are fixed.
 // Reactions and each inter-wheel shear plateau are affine in train translation;
 // their extrema on that interval therefore occur at its two endpoints.
 for(let k=0;k<offsets.length-1;k++){
  const lo=offsets[k],hi=offsets[k+1],mid=(lo+hi)/2;
  const active=positions.map((p,i)=>({id:i+1,p,P:P[i]})).filter(w=>mid+w.p>0&&mid+w.p<L);
  [lo,hi].forEach(a=>{
   const wheels=active.map(w=>({id:w.id,x:a+w.p,P:w.P}));
   const RA=wheels.reduce((v,w)=>v+w.P*(L-w.x)/L,0),RB=wheels.reduce((v,w)=>v+w.P*w.x/L,0);
   take(maxRA,RA,a);take(minRA,-RA,a);take(maxRB,RB,a);take(minRB,-RB,a);
   if(RA>leftMaxCase.value)leftMaxCase={value:RA,offset:a,RA_kN:RA,RB_kN:RB};
   if(RB>rightMaxCase.value)rightMaxCase={value:RB,offset:a,RA_kN:RA,RB_kN:RB};
   let V=RA;
   take(maxV,V,a,0,"بلافاصله راست تکیه‌گاه چپ / حد یک‌طرفه");
   take(minV,-V,a,0,"بلافاصله راست تکیه‌گاه چپ / حد یک‌طرفه");
   wheels.forEach(w=>{
    take(maxV,V,a,w.x,"بلافاصله چپ چرخ "+w.id);
    take(minV,-V,a,w.x,"بلافاصله چپ چرخ "+w.id);
    V-=w.P;
    take(maxV,V,a,w.x,"بلافاصله راست چرخ "+w.id);
    take(minV,-V,a,w.x,"بلافاصله راست چرخ "+w.id);
   });
   take(maxV,V,a,L,"بلافاصله چپ تکیه‌گاه راست / حد یک‌طرفه");
   take(minV,-V,a,L,"بلافاصله چپ تکیه‌گاه راست / حد یک‌طرفه");
  });
 }
 return {ok:true,span_m:L,maxReactionLeft_kN:maxRA.value,minReactionLeft_kN:-minRA.value,maxReactionRight_kN:maxRB.value,minReactionRight_kN:-minRB.value,maxPositiveShear_kN:maxV.value,minNegativeShear_kN:-minV.value,maxAbsShear_kN:Math.max(maxV.value,minV.value),governingShear:{value_kN:maxV.value>=minV.value?maxV.value:-minV.value,offset_m:maxV.value>=minV.value?maxV.offset:minV.offset,section_m:maxV.value>=minV.value?maxV.x:minV.x,side:maxV.value>=minV.value?maxV.side:minV.side},reactionPositions:{leftMax_m:maxRA.offset,rightMax_m:maxRB.offset},leftMaxReactionCase:leftMaxCase,rightMaxReactionCase:rightMaxCase,method:"پوش دقیق سراسری برش و واکنش برای یک قطار بار قائم روی تیر ساده؛ بازه انتقال به نواحی با مجموعه چرخ‌های فعال ثابت تقسیم شده است. در هر بازه، واکنش‌ها و سطوح برش نسبت به انتقال خطی‌اند و دو انتهای بازه، با حدود یک‌طرفه در ورود/خروج چرخ‌ها، ارزیابی می‌شوند.",limitations:["یک قطار جرثقیل و یک تیر ساده تک‌دهانه","بارهای قائم متمرکز؛ بدون ضربه، بار افقی، وزن تیر/ریل، پیچش یا خستگی","این خروجی طراحی تیر یا تکیه‌گاه نیست"]};
}
function render(){
 const host=$("results");if(!host)return;
 const r=analyze(readUI());host.textContent="";
 const p=document.createElement("p");p.className="notice";
 p.textContent=r.ok?"تحلیل موقعیت ثابت انجام شد؛ "+r.activeWheelCount+" چرخ روی دهانه قرار دارد.":"ورودی‌ها برای تحلیل کافی نیستند.";
 host.appendChild(p);
 (r.issues||[]).forEach(t=>{const x=document.createElement("p");x.className="notice";x.textContent="⚠ "+t;host.appendChild(x);});
 if(!r.ok)return;
 const rows=[
 ["واکنش تکیه‌گاه چپ",r.reactions_kN.left.toFixed(3)+" kN"],
 ["واکنش تکیه‌گاه راست",r.reactions_kN.right.toFixed(3)+" kN"],
 ["بیشینه قدرمطلق لنگر",r.maxAbsMoment_kNm.toFixed(3)+" kN·m"],
 ["محل لنگر بحرانی",r.peakMoment.x_m.toFixed(3)+" m"],
 ["لنگر مثبت بیشینه",r.maxPositiveMoment_kNm.toFixed(3)+" kN·m"],
 ["خطای تعادل قائم",r.equilibriumError_kN.toExponential(2)+" kN"]
 ];
 const table=document.createElement("table");table.className="data-table";
 rows.forEach(([a,b])=>{const tr=document.createElement("tr");const th=document.createElement("th");th.textContent=a;const td=document.createElement("td");td.textContent=b;tr.append(th,td);table.appendChild(tr);});
 host.appendChild(table);
 const note=document.createElement("p");note.className="notice";note.textContent=r.method+" بار هر چرخ به تن‌نیرو تبدیل شده است. اثر ضربه، نیروهای افقی، وزن تیر، پیوستگی چنددهانه، پیچش، کمانش، خستگی و طراحی مقطع در این خروجی منظور نشده‌اند.";host.appendChild(note);
}
function showShearEnvelope(){
 const host=$("results");if(!host)return;
 const r=movingShearEnvelope(readUI()),box=document.createElement("div");box.className="notice";
 if(!r.ok){box.textContent="پوش برش/واکنش محاسبه نشد: "+r.issues.join(" | ");host.appendChild(box);return;}
 box.textContent="پوش قدرمطلق برش: "+r.maxAbsShear_kN.toFixed(3)+" kN؛ محل بحرانی: x="+r.governingShear.section_m.toFixed(3)+" m؛ موقعیت چرخ اول: "+r.governingShear.offset_m.toFixed(3)+" m؛ "+r.governingShear.side+". بیشینه واکنش چپ: "+r.maxReactionLeft_kN.toFixed(3)+" kN (در همان حالت، واکنش راست "+r.leftMaxReactionCase.RB_kN.toFixed(3)+" kN)؛ بیشینه واکنش راست: "+r.maxReactionRight_kN.toFixed(3)+" kN (در همان حالت، واکنش چپ "+r.rightMaxReactionCase.RA_kN.toFixed(3)+" kN). این دو بیشینه ممکن است هم‌زمان رخ ندهند. "+r.method+" محدودیت: "+r.limitations.join("؛ ");
 host.appendChild(box);
}
function showEnvelope(){
 const host=$("results");if(!host)return;
 const r=movingEnvelope(readUI()),box=document.createElement("div");box.className="notice";
 if(!r.ok){box.textContent="پوش متحرک محاسبه نشد: "+r.issues.join(" | ");host.appendChild(box);return;}
 box.textContent="پوش دقیق لنگر مثبت: "+r.maxPositiveMoment_kNm.toFixed(3)+" kN·m؛ مقطع بحرانی: "+r.criticalSection_m.toFixed(3)+" m؛ موقعیت چرخ اول: "+r.criticalFirstWheelOffset_m.toFixed(3)+" m. "+r.method+" محدودیت: "+r.limitations.join("؛ ");
 host.appendChild(box);
}
function init(){Object.keys(defaults).forEach(k=>$(k)?.addEventListener("input",render));$("calculate")?.addEventListener("click",render);$("envelope")?.addEventListener("click",showEnvelope);$("shearEnvelope")?.addEventListener("click",showShearEnvelope);render();}
root.SteelCraneTrainAnalysis={getData:readUI,setData,analyze,movingEnvelope,movingShearEnvelope,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(window);


/* ===== steel2/js/crane-horizontal-loads.js ===== */
/* SAHROUD STEEL — documented horizontal crane wheel actions.
 * Inputs are independent manufacturer/code-sourced wheel forces in global X/Z.
 * This module validates and stores data only; it does NOT inject loads into 3D
 * until runway-level nodes and the rail/bracket load path are explicitly modeled.
 */
(function(root){
"use strict";
const defaults={enabled:false,transverseLoads_kN:"",longitudinalLoads_kN:"",transverseSign:"+X",longitudinalSign:"+Z",source:"",document:"",notes:""};
let state={...defaults};
const $=id=>root.document?.getElementById("craneHorizontal_"+id);
const parse=s=>String(s??"").split(",").map(x=>x.trim()).map(x=>x===""?NaN:Number(x));
function readUI(){
 const d={enabled:$("enabled")?!!$("enabled").checked:!!state.enabled};
 Object.keys(defaults).filter(k=>k!=="enabled").forEach(k=>{d[k]=$(k)?.value??state[k];});
 return d;
}
function setData(data){
 state={...defaults,...(data&&typeof data==="object"?data:{})};
 if($("enabled"))$("enabled").checked=!!state.enabled;
 Object.keys(defaults).filter(k=>k!=="enabled").forEach(k=>{if($(k))$(k).value=state[k]??"";});
 render();
}
function audit(input){
 const d={...defaults,...(input||{})};
 if(!d.enabled)return {status:"not_applicable",ready:false,readyFor3D:false,issues:["بار افقی جرثقیل در این پروژه فعال نشده است."]};
 const issues=[],train=root.SteelCraneTrainAnalysis?.getData?.()||{};
 const positions=parse(train.positions_m);
 const runway=Number(d.runwayElevation_m??root.SteelCraneReadiness?.getData?.().runwayElevation_m);
 if(!positions.length||positions.some(v=>!Number.isFinite(v))||positions[0]!==0||positions.some((v,i)=>i>0&&v<=positions[i-1]))
  issues.push("ابتدا هندسه قطار چرخ معتبر و صعودی را در بخش تحلیل قطار چرخ ثبت کنید.");
 if(!Number.isFinite(runway)||runway<=0)issues.push("تراز واقعی ریل باید در ورودی‌های جرثقیل ثبت شود.");
 const t=parse(d.transverseLoads_kN),l=parse(d.longitudinalLoads_kN);
 [ ["نیروهای عرضی",t],["نیروهای طولی",l] ].forEach(([name,values])=>{
  if(values.length!==positions.length)issues.push(name+": برای هر چرخ دقیقاً یک مقدار مستقل وارد کنید؛ ترتیب باید با قطار چرخ یکسان باشد.");
  if(values.some(v=>!Number.isFinite(v)||v<0))issues.push(name+": مقادیر باید عددی و نامنفی باشند.");
 });
 if(!t.some(v=>v>0)&&!l.some(v=>v>0))issues.push("حداقل یکی از مؤلفه‌های افقی باید بزرگ‌تر از صفر باشد.");
 if(!["+X","-X"].includes(d.transverseSign))issues.push("جهت نیروی عرضی باید +X یا -X باشد.");
 if(!["+Z","-Z"].includes(d.longitudinalSign))issues.push("جهت نیروی طولی باید +Z یا -Z باشد.");
 if(!String(d.source||"").trim())issues.push("منبع مستند نیروهای افقی الزامی است.");
 if(!String(d.document||"").trim())issues.push("شماره صفحه کاتالوگ یا شماره نقشه نیروهای افقی الزامی است.");
 issues.push("قرارداد محور: X عرض سوله و عمود بر ریل؛ Z طول سوله و موازی ریل؛ Y قائم است. مقادیر هر فهرست، نیروی هر چرخ روی یک ریل بر حسب kN هستند.");
 issues.push("این داده‌ها هنوز به مدل سه‌بعدی اعمال نمی‌شوند. ابتدا باید گره واقعی در تراز ریل، سختی و اتصال تیر حمال/براکت و مسیر انتقال نیرو به ستون مدل شود؛ اعمال نیرو به گره نزدیک یا پایه ستون مجاز نیست.");
 return {status:issues.length>2?"incomplete":"awaiting_runway_nodes",ready:false,readyFor3D:false,issues,entered:{transverseLoads_kN:d.transverseLoads_kN,longitudinalLoads_kN:d.longitudinalLoads_kN,transverseSign:d.transverseSign,longitudinalSign:d.longitudinalSign,runwayElevation_m:Number.isFinite(runway)?runway:null,source:d.source,document:d.document}};
}
function mount(){
 if(!$("panel")){
  const anchor=root.document.getElementById("craneTrainAnalysisPanel");
  if(!anchor)return;
  const panel=root.document.createElement("section");
  panel.className="panel";panel.id="craneHorizontal_panel";
  panel.innerHTML='<div class="panel-title"><h3>نیروهای افقی جرثقیل و ترمز</h3><span class="status">ورودی مستند؛ بدون اعمال خودکار</span></div>'+
   '<div class="notice">نیروهای هر چرخ را جداگانه و بر حسب kN وارد کنید. ترتیب مقادیر باید دقیقاً با ترتیب چرخ‌های بخش «تحلیل قطار چرخ» یکسان باشد. این ورودی‌ها جایگزین ضرایب حدسی نیستند.</div>'+
   '<label><input id="craneHorizontal_enabled" type="checkbox"> فعال‌سازی ثبت نیروهای افقی</label>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="craneHorizontal_transverseLoads_kN">نیروی عرضی هر چرخ روی یک ریل (kN؛ فهرست جداشده با ویرگول)</label><input id="craneHorizontal_transverseLoads_kN" type="text" placeholder="مثلاً 12, 12, 10, 10"></div>'+
   '<div class="field"><label for="craneHorizontal_transverseSign">جهت نیروی عرضی در محور X</label><select id="craneHorizontal_transverseSign"><option value="+X">+X</option><option value="-X">−X</option></select></div>'+
   '<div class="field"><label for="craneHorizontal_longitudinalLoads_kN">نیروی طولی/ترمز هر چرخ روی یک ریل (kN؛ فهرست جداشده با ویرگول)</label><input id="craneHorizontal_longitudinalLoads_kN" type="text" placeholder="مثلاً 4, 4, 3, 3"></div>'+
   '<div class="field"><label for="craneHorizontal_longitudinalSign">جهت نیروی طولی در محور Z</label><select id="craneHorizontal_longitudinalSign"><option value="+Z">+Z</option><option value="-Z">−Z</option></select></div>'+
   '<div class="field"><label for="craneHorizontal_source">منبع نیروها</label><input id="craneHorizontal_source" type="text" placeholder="کاتالوگ سازنده / محاسبات مصوب"></div>'+
   '<div class="field"><label for="craneHorizontal_document">شماره صفحه / نقشه / بند ضابطه</label><input id="craneHorizontal_document" type="text"></div>'+
   '<div class="field"><label for="craneHorizontal_notes">توضیحات، شرایط عملکرد و هم‌زمانی</label><input id="craneHorizontal_notes" type="text"></div></div>'+
   '<div id="craneHorizontal_results" class="notice">نیروهای افقی هنوز ثبت نشده‌اند.</div>';
  anchor.insertAdjacentElement("afterend",panel);
 }
 Object.keys(defaults).forEach(k=>{const el=$(k);if(el){el.addEventListener("input",()=>{state=readUI();render();});el.addEventListener("change",()=>{state=readUI();render();});}});
 $("enabled")?.addEventListener("change",()=>{state=readUI();render();});
 setData(state);
}
function render(){
 const box=$("results");if(!box)return;
 const r=audit(readUI());box.textContent="";
 const p=root.document.createElement("p");p.className="notice";
 p.textContent=r.status==="not_applicable"?"ثبت نیروهای افقی غیرفعال است.":r.status==="awaiting_runway_nodes"?"اطلاعات اولیه ثبت شده؛ اتصال به مدل سه‌بعدی تا مدل‌سازی گره و مسیر انتقال تراز ریل مسدود است.":"ورودی نیروهای افقی ناقص یا نیازمند اصلاح است.";
 box.appendChild(p);
 r.issues.forEach(msg=>{const x=root.document.createElement("p");x.className="notice";x.textContent="⚠ "+msg;box.appendChild(x);});
}
function selfTest(){
 const train=root.SteelCraneTrainAnalysis;
 const crane=root.SteelCraneReadiness;
 const oldTrain=train?.getData?.(),oldCrane=crane?.getData?.();
 try{
  train?.setData?.({positions_m:"0, 1.5, 3",loads_t:"1,1,1",span_m:"6"});
  crane?.setData?.({enabled:true,runwayElevation_m:"8"});
  const good=audit({enabled:true,transverseLoads_kN:"10, 10, 8",longitudinalLoads_kN:"2, 2, 2",source:"manufacturer drawing",document:"DWG-01",runwayElevation_m:"8",transverseSign:"+X",longitudinalSign:"-Z"});
  const mismatch=audit({enabled:true,transverseLoads_kN:"10,10",longitudinalLoads_kN:"2,2,2",source:"catalog",document:"p.4"});
  const undocumented=audit({enabled:true,transverseLoads_kN:"10,10,8",longitudinalLoads_kN:"2,2,2"});
  const checks=[
   ["ورودی مستند و هم‌تعداد چرخ‌ها پذیرفته اما برای 3D مسدود می‌ماند",good.status==="awaiting_runway_nodes"&&!good.readyFor3D],
   ["تعداد نیروها باید با تعداد چرخ‌ها برابر باشد",mismatch.issues.some(x=>x.includes("دقیقاً یک مقدار"))],
   ["منبع و شماره مرجع الزامی است",undocumented.issues.some(x=>x.includes("منبع مستند"))&&undocumented.issues.some(x=>x.includes("شماره صفحه"))]
  ];
  return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
 }finally{
  if(oldTrain)train.setData(oldTrain);
  if(oldCrane)crane.setData(oldCrane);
 }
}
root.SteelCraneHorizontalLoads={getData:readUI,setData,audit,render,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/drawing.js ===== */

/* SAHROUD STEEL - Frame Drawing 2.1 */
(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";

    function drawFrame() {
        const svg = document.getElementById("frameDrawing");
        if (!svg) {
            console.error("SVG frameDrawing پیدا نشد.");
            return false;
        }

        const get = id => {
            const field = document.getElementById(id);
            return field ? Number(field.value) : NaN;
        };

        const span = get("span");
        const height = get("height");
        const rise = get("rise");

        if (!Number.isFinite(span) || !Number.isFinite(height) ||
            !Number.isFinite(rise) || span <= 0 || height <= 0 || rise < 0) {
            return false;
        }

        const connectionField = document.getElementById("baseConnection");
        const connection = connectionField && connectionField.value === "fixed"
            ? "fixed" : "pinned";

        const W = 600, H = 300, marginX = 75, groundY = 235, availableH = 175;
        const overhang = 0.80;
        const scale = Math.min(
            (W - 2 * marginX) / (span + 2 * overhang),
            availableH / (height + rise || height)
        );

        const leftX = marginX + overhang * scale;
        const rightX = leftX + span * scale;
        const baseY = groundY;
        const eaveY = groundY - height * scale;
        const ridgeY = groundY - (height + rise) * scale;
        const midX = (leftX + rightX) / 2;
        const roofSystem = document.getElementById("structuralSystem")?.value || "portal-gable";
        const isSingleSlope = roofSystem === "portal-single-slope";
        const rightEaveY = isSingleSlope ? groundY - (height + rise) * scale : eaveY;

        function el(name, attrs, parent = svg) {
            const node = document.createElementNS(NS, name);
            Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
            parent.appendChild(node);
            return node;
        }

        function line(x1, y1, x2, y2, color, width, dash) {
            const attrs = {
                x1, y1, x2, y2, stroke: color,
                "stroke-width": width, "stroke-linecap": "round"
            };
            if (dash) attrs["stroke-dasharray"] = dash;
            return el("line", attrs);
        }

        function label(x, y, text, size = 12, color = "#263746") {
            const t = el("text", {
                x, y, fill: color, "font-size": size,
                "font-family": "Tahoma, Arial",
                "text-anchor": "middle", direction: "rtl"
            });
            t.textContent = text;
            return t;
        }

        function drawPinnedSupport(x) {
            el("path", {
                d: `M ${x - 13} ${baseY + 4} L ${x + 13} ${baseY + 4} L ${x} ${baseY + 19} Z`,
                fill: "#dbeafe", stroke: "#1d4ed8", "stroke-width": 1.8
            });
            line(x - 19, baseY + 21, x + 19, baseY + 21, "#334155", 1.6);
            for (let i = -15; i <= 15; i += 7) {
                line(x + i, baseY + 21, x + i - 5, baseY + 27, "#64748b", 1);
            }
            label(x, baseY + 43, "مفصلی", 10, "#1d4ed8");
        }

        function drawFixedSupport(x) {
            el("rect", {
                x: x - 15, y: baseY + 3, width: 30, height: 6,
                rx: 1, fill: "#f59e0b", stroke: "#92400e", "stroke-width": 1.5
            });
            line(x - 22, baseY + 12, x + 22, baseY + 12, "#334155", 2);
            for (let i = -20; i <= 20; i += 7) {
                line(x + i, baseY + 12, x + i - 7, baseY + 20, "#64748b", 1.2);
            }
            [-10, 10].forEach(offset => {
                line(x + offset, baseY - 1, x + offset, baseY + 13, "#92400e", 1.5);
                el("circle", {
                    cx: x + offset, cy: baseY + 1, r: 2.2,
                    fill: "#fff7ed", stroke: "#92400e", "stroke-width": 1
                });
            });
            label(x, baseY + 36, "گیردار", 10, "#b45309");
        }

        svg.innerHTML = "";
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        el("rect", { x: 0, y: 0, width: W, height: H, fill: "#f8fafc" });

        for (let x = 50; x <= W - 50; x += 25) {
            line(x, 20, x, 250, "#e8edf2", 0.7);
        }
        for (let y = 25; y <= 250; y += 25) {
            line(30, y, W - 30, y, "#e8edf2", 0.7);
        }

        line(35, baseY, W - 35, baseY, "#64748b", 2);
        line(leftX, baseY, leftX, eaveY, "#176b9b", 7);
        line(rightX, baseY, rightX, rightEaveY, "#176b9b", 7);
        let leftTipX, leftTipY, rightTipX, rightTipY;
        if (isSingleSlope) {
            const angle = Math.atan2(rise, span);
            const dx = overhang * scale * Math.cos(angle);
            const dy = overhang * scale * Math.sin(angle);
            leftTipX = leftX - dx; leftTipY = eaveY + dy;
            rightTipX = rightX + dx; rightTipY = rightEaveY + dy;
            line(leftTipX, leftTipY, leftX, eaveY, "#b45309", 5);
            line(leftX, eaveY, rightX, rightEaveY, "#d97706", 7);
            line(rightX, rightEaveY, rightTipX, rightTipY, "#b45309", 5);
            label(midX, (eaveY + rightEaveY) / 2 - 12, "سقف تک‌شیب", 11, "#9a3412");
        } else {
            const roofAngle = Math.atan2(rise, span / 2);
            const tipOffsetX = overhang * scale * Math.cos(roofAngle);
            const tipOffsetY = overhang * scale * Math.sin(roofAngle);
            leftTipX = leftX - tipOffsetX; leftTipY = eaveY + tipOffsetY;
            rightTipX = rightX + tipOffsetX; rightTipY = eaveY + tipOffsetY;
            line(leftTipX, leftTipY, leftX, eaveY, "#b45309", 5);
            line(leftX, eaveY, midX, ridgeY, "#d97706", 7);
            line(midX, ridgeY, rightX, eaveY, "#d97706", 7);
            line(rightX, eaveY, rightTipX, rightTipY, "#b45309", 5);
            label(midX, ridgeY - 12, "C");
        }
        label(leftTipX, leftTipY - 9, "کنسول ۰٫۸ m", 9, "#92400e");
        label(rightTipX, rightTipY - 9, "کنسول ۰٫۸ m", 9, "#92400e");

        [
            [leftX, baseY], [leftX, eaveY],
            ...(isSingleSlope ? [] : [[midX, ridgeY]]),
            [rightX, rightEaveY], [rightX, baseY]
        ].forEach(([x, y]) => {
            el("circle", {
                cx: x, cy: y, r: 5, fill: "#ffffff",
                stroke: "#123b52", "stroke-width": 2
            });
        });

        if (connection === "fixed") {
            drawFixedSupport(leftX);
            drawFixedSupport(rightX);
        } else {
            drawPinnedSupport(leftX);
            drawPinnedSupport(rightX);
        }

        label(leftX - 17, baseY + 29, "A");
        label(leftX - 17, eaveY - 10, "B");
        if (!isSingleSlope) label(midX, ridgeY - 12, "C");
        label(rightX + 17, rightEaveY - 10, "D");
        label(rightX + 17, baseY + 29, "E");

        const dimY = Math.min(baseY + 55, 292);
        line(leftX, baseY + 18, leftX, dimY, "#64748b", 1);
        line(rightX, baseY + 18, rightX, dimY, "#64748b", 1);
        line(leftX, dimY, rightX, dimY, "#64748b", 1);
        line(leftX - 4, dimY - 4, leftX + 4, dimY + 4, "#64748b", 1);
        line(rightX - 4, dimY - 4, rightX + 4, dimY + 4, "#64748b", 1);
        label(midX, dimY - 6, `دهانه: ${span} متر`, 12);

        const dimX = Math.max(20, leftX - 35);
        line(dimX, baseY, dimX, eaveY, "#64748b", 1);
        line(dimX - 4, baseY, dimX + 4, baseY, "#64748b", 1);
        line(dimX - 4, eaveY, dimX + 4, eaveY, "#64748b", 1);
        const hLabel = label(dimX - 5, (baseY + eaveY) / 2, `${height} m`, 11);
        hLabel.setAttribute("transform",
            `rotate(-90 ${dimX - 5} ${(baseY + eaveY) / 2})`);

        label(midX + 45, isSingleSlope ? (eaveY + rightEaveY) / 2 + 22 : ridgeY + 18,
            isSingleSlope ? `اختلاف ارتفاع دو لبه سقف: ${rise} m` : `اختلاف ارتفاع تاج و ستون: ${rise} m`, 11, "#9a3412");
        label(W / 2, 18, isSingleSlope ? "نمای دوبعدی قاب تک‌شیب سوله" : "نمای دوبعدی قاب سوله", 13, "#123b52");

        const status = document.getElementById("projectStatus");
        if (status) {
            status.textContent = connection === "fixed"
                ? "قاب با تکیه‌گاه گیردار ترسیم شد."
                : "قاب با تکیه‌گاه مفصلی ترسیم شد.";
        }
        return true;
    }

    window.SteelDrawing = { drawFrame };

    function connectDrawingControls() {
        const field = document.getElementById("baseConnection");
        if (field && !field.dataset.drawingListener) {
            field.addEventListener("change", drawFrame);
            field.dataset.drawingListener = "1";
        }
        ["span", "height", "rise", "structuralSystem"].forEach(id => {
            const input = document.getElementById(id);
            if (input && !input.dataset.frameDrawingListener) {
                input.addEventListener("input", drawFrame);
                input.dataset.frameDrawingListener = "1";
            }
        });
        drawFrame();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connectDrawingControls);
    } else {
        connectDrawingControls();
    }
})();


/* ===== steel2/js/purlin-spacing-layout.js ===== */
/* SAHROUD STEEL - Purlin spacing layout
   Selects the fewest equal bays whose actual spacing does not exceed
   the user-requested maximum. The ridge is one shared station.
*/
(function(root){
  "use strict";
  function calculate(slopeLengthM, requestedMaxSpacingM){
    if(!Number.isFinite(slopeLengthM)||slopeLengthM<=0||
       !Number.isFinite(requestedMaxSpacingM)||requestedMaxSpacingM<=0)
      return {ok:false,status:"insufficient_data",reason:"طول شیب و حداکثر فاصله مجاز پرلین باید مثبت و معتبر باشند."};
    const intervals=Math.max(1,Math.ceil(slopeLengthM/requestedMaxSpacingM-1e-10));
    const actualSpacingM=slopeLengthM/intervals;
    const stations=Array.from({length:intervals+1},(_,i)=>slopeLengthM*i/intervals);
    return {ok:true,status:"ok",intervals,actualSpacingM,requestedMaxSpacingM,
      maxSpacingM:actualSpacingM,stationCount:stations.length,stations,
      satisfiesMaximum:actualSpacingM<=requestedMaxSpacingM+1e-9,
      note:"کمترین تعداد فاصله مساوی انتخاب شده که از فاصله درخواستی بیشتر نشود؛ خط‌الرأس فقط یک ایستگاه مشترک دارد."};
  }
  function selfTest(){
    const tests=[];
    const add=(name,pass)=>tests.push({name,pass:!!pass});
    const a=calculate(10,1);
    add("1 m request produces exact 1 m spacing",a.ok&&a.intervals===10&&Math.abs(a.actualSpacingM-1)<1e-9);
    const b=calculate(10.4,1);
    add("spacing is nearest valid value below requested maximum",b.ok&&b.intervals===11&&b.actualSpacingM<=1&&b.actualSpacingM>0.94);
    add("minimum interval count is selected",b.ok&&b.intervals===Math.ceil(10.4));
    add("ridge is represented once",b.ok&&b.stations.filter(x=>Math.abs(x-10.4)<1e-9).length===1);
    add("invalid dimensions are rejected",!calculate(0,1).ok&&!calculate(10,0).ok);
    add("no station gap exceeds requested value",b.ok&&b.stations.slice(1).every((x,i)=>x-b.stations[i]<=1+1e-9));
    return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests};
  }
  root.SteelPurlinSpacingLayout={calculate,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-load-preflight-audit.js ===== */
/* SAHROUD STEEL — final member load-vector preflight.
 * Verifies explicit member load declarations immediately before FEM solve.
 * It is a data-integrity gate, not a structural design check.
 */
(function(root){
"use strict";
const finite=Number.isFinite;
const REQUIRED_LINE_LOADS=["dead","live","snow","wind","windLeft","windRight","windEnd"];
const validVector=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
function audit(members){
 const issues=[],rows=[];
 if(!Array.isArray(members)||!members.length)return {success:false,issues:["فهرست اعضای تحلیل خالی یا نامعتبر است."],rows,analysisEnabled:false,designApproved:false};
 const seen=new Set();
 members.forEach(m=>{
  const id=String(m?.id??"");
  const memberIssues=[];
  if(!id)memberIssues.push("missing-member-id");
  else if(seen.has(id))memberIssues.push("duplicate-member-id");
  else seen.add(id);
  const a=m?.analysisLoad;
  if(!a||!validVector(a.uniformLocal))memberIssues.push("local-load-vector");
  if(!a||!validVector(a.globalUniform))memberIssues.push("global-load-vector");
  const linear=a?.linearLocal;
  if(linear!==undefined&&linear!==null&&(!linear||!validVector(linear.start)||!validVector(linear.end)))memberIssues.push("linear-local-load-vectors");
  if(!a||!finite(a.selfWeightKNm))memberIssues.push("self-weight-line-load");
  if(!m?.lineLoads||REQUIRED_LINE_LOADS.some(k=>!finite(m.lineLoads[k])))memberIssues.push("explicit-line-load-ledger");
  const row={memberId:id,sectionKey:String(m?.sectionKey||""),type:String(m?.type||""),loadRole:m?.lineLoads?.loadRole||null,
   localVectorValid:!!a&&validVector(a.uniformLocal),globalVectorValid:!!a&&validVector(a.globalUniform),
   selfWeightKNm:a?.selfWeightKNm??null,issues:memberIssues};
  rows.push(row);
  if(memberIssues.length)issues.push("عضو "+(id||"(بدون شناسه)")+": "+memberIssues.join("، "));
 });
 const groups=Object.fromEntries([...new Set(rows.map(x=>x.sectionKey||"unclassified"))].map(k=>[k,rows.filter(x=>(x.sectionKey||"unclassified")===k).length]));
 return {success:issues.length===0,memberCount:rows.length,groups,rows,issues,
  explicitZeroLineLoadCount:rows.filter(x=>x.selfWeightKNm===0&&x.localVectorValid&&x.globalVectorValid).length,
  scope:"pre-solver load-vector and member-ledger completeness only; no member capacity or code approval",
  analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const tests=[],test=(name,fn)=>{try{tests.push({name,ok:fn()===true});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const good={id:"M1",sectionKey:"rafter",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0},analysisLoad:{uniformLocal:[0,0,0],globalUniform:[0,0,0],selfWeightKNm:0}};
 test("complete explicit member load record passes",()=>audit([good]).success);
 test("missing local vector blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,uniformLocal:null}}]).success);
 test("missing global vector blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,globalUniform:undefined}}]).success);
 test("wrong vector dimension blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,uniformLocal:[0,0]}}]).success);
 test("nonfinite vector component blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,globalUniform:[0,NaN,0]}}]).success);
 test("valid linear local load endpoints are accepted",()=>audit([{...good,analysisLoad:{...good.analysisLoad,linearLocal:{start:[0,-1,0],end:[0,-2,0]}}}]).success);
 test("malformed linear local load endpoints block",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,linearLocal:{start:[0,-1],end:[0,-2,0]}}}]).success);
 test("missing explicit line load declaration blocks",()=>!audit([{...good,lineLoads:{dead:0}}]).success);
 test("missing self weight declaration blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,selfWeightKNm:undefined}}]).success);
 test("duplicate member IDs block",()=>!audit([good,{...good}]).success);
 test("explicit zero actions are accepted and counted",()=>{const r=audit([good]);return r.success&&r.explicitZeroLineLoadCount===1;});
 test("never enables analysis or approves design",()=>{const r=audit([good]);return r.analysisEnabled===false&&r.designApproved===false;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests};
}
root.SteelMemberLoadPreflight={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/gable-eccentric-load-transfer.js ===== */
/* SAHROUD STEEL — exact gable strip integration and consistent residual/eccentric nodal loads.
 * Baseline uniform member load remains in analysisLoad.uniformLocal.
 * This module adds only the consistent nodal load vector for the difference between
 * the true linearly clipped tributary strip and its mean uniform load, plus the
 * eccentric distributed torsional couple. No load is silently omitted.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const gauss=[{t:0.1127016653792583,w:5/18},{t:0.5,w:8/18},{t:0.8872983346207417,w:5/18}];
function roofY(x,g){const span=Number(g.span),height=Number(g.height),rise=Number(g.rise),half=span/2;return height+rise*(x<=half?x/half:(span-x)/half);}
function stripGeometry(member,a,b,g){
 const issues=[],x0=Number(a?.x),x1=Number(b?.x),y=Number(a?.y),z=Number(a?.z),span=Number(g?.span);
 if(!a||!b||![x0,x1,y,z,b.x,b.y,b.z,span,g.height,g.rise].every(Number.isFinite)||!(x1>x0)||Math.abs(y-b.y)>1e-8||Math.abs(z-b.z)>1e-8||!(span>0))return{success:false,issues:["هندسه گرت انتهایی باید افقی، با طول مثبت و مختصات معتبر باشد."]};
 if(x0<-1e-8||x1>span+1e-8)return{success:false,issues:["قطعه گرت خارج از عرض واقعی دیوار انتهایی است."]};
 if(x0<span/2-1e-8&&x1>span/2+1e-8)return{success:false,issues:["قطعه گرت از شکست شیب در تاج عبور می‌کند؛ باید در تاج به دو قطعه تقسیم شود."]};
 const lower=Number(member.tributaryHeightLowerM),upperMid=Number(member.tributaryHeightUpperM),h=Number(member.tributaryHeight);
 if(![lower,upperMid,h].every(Number.isFinite)||lower<0||!(upperMid>lower)||!(h>0))return{success:false,issues:["حد پایین، بالای نوار بارگیر و ارتفاع بارگیر گرت باید صریح و معتبر باشند."]};
 const mid=(x0+x1)/2,roofMid=roofY(mid,g),roofClipped=Math.abs(upperMid-roofMid)<=Math.max(1e-7,Math.abs(roofMid)*1e-8);
 const u0=roofClipped?roofY(x0,g):upperMid,u1=roofClipped?roofY(x1,g):upperMid;
 const h0=u0-lower,h1=u1-lower,L=x1-x0,avgH=(h0+h1)/2;
 if(!(h0>0&&h1>0&&avgH>0))return{success:false,issues:["ارتفاع نوار بارگیر در یکی از دو انتهای گرت نامعتبر است."]};
 if(Math.abs(avgH-h)>Math.max(1e-6,Math.abs(h)*1e-5))return{success:false,issues:["ارتفاع بارگیر ذخیره‌شده با انتگرال دقیق نوار بارگیر منطبق نیست."]};
 const avgU2=(u0*u0+u0*u1+u1*u1)/3;
 const area=L*avgH;
 const intYdA=L*(avgU2-lower*lower)/2;
 const intXdA=L*(x0*avgH+L*(h0/2+(h1-h0)/3));
 return{success:true,x0,x1,y,z,L,lower,u0,u1,h0,h1,avgH,area,intYdA,intXdA,roofClipped};
}
function axesFor(a,b){
 const d=[b.x-a.x,b.y-a.y,b.z-a.z],L=norm(d);if(!(L>1e-9))throw Error("طول گرت صفر است.");
 const ex=d.map(v=>v/L);let ref=[0,0,1];if(Math.abs(dot(ex,ref))>0.95)ref=[0,1,0];
 const c=cross(ref,ex),cn=norm(c);if(!(cn>1e-10))throw Error("محورهای محلی گرت قابل ساخت نیستند.");
 const ey=c.map(v=>v/cn),ez=cross(ex,ey);return{x:ex,y:ey,z:ez,L};
}
function localResidualVector(qAverage,member,strip,pressure,faceSign,axis){
 const L=strip.L,local=Array(12).fill(0),y=strip.y,lower=strip.lower,du=strip.u1-strip.u0;
 for(const g of gauss){
  const t=g.t,u=strip.u0+du*t,h=u-lower,x=strip.x0+L*t;
  const qz=faceSign*pressure*h*1000;
  const qGlobal=[0,0,qz],qLocal=[dot(qGlobal,axis.x),dot(qGlobal,axis.y),dot(qGlobal,axis.z)];
  const qResidual=qLocal.map((v,i)=>v-qAverage[i]);
  const e=(lower+u)/2-y,mGlobalX=e*qz,mLocalX=mGlobalX*axis.x[0];
  const H1=1-3*t*t+2*t*t*t,H3=3*t*t-2*t*t*t;
  const H2=L*(t-2*t*t+t*t*t),H4=L*(-t*t+t*t*t);
  const w=L*g.w;
  local[0]+=w*(1-t)*qResidual[0];local[6]+=w*t*qResidual[0];
  local[1]+=w*H1*qResidual[1];local[5]+=w*H2*qResidual[1];local[7]+=w*H3*qResidual[1];local[11]+=w*H4*qResidual[1];
  local[2]+=w*H1*qResidual[2];local[4]-=w*H2*qResidual[2];local[8]+=w*H3*qResidual[2];local[10]-=w*H4*qResidual[2];
  local[3]+=w*(1-t)*mLocalX;local[9]+=w*t*mLocalX;
 }
 return local;
}
function localToGlobalLoads(member,axis,local){
 const out=[];
 for(let end=0;end<2;end++){
  const i=end*6,force=[local[i],local[i+1],local[i+2]],moment=[local[i+3],local[i+4],local[i+5]];
  const transform=v=>axis.x.map((_,j)=>axis.x[j]*v[0]+axis.y[j]*v[1]+axis.z[j]*v[2]);
  const F=transform(force),M=transform(moment);
  out.push({nodeId:String(end===0?member.start:member.end),values:[...F,...M]});
 }
 return out;
}
function prepareNodalLoads(model,pressures,windFactor=1,windSign=1){
 const issues=[],rows=[],loads=[],members=Array.isArray(model?.members)?model.members:[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n])),g=model?.geometry||{};
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))return{success:false,issues:["مدل واقعی گابل برای انتقال بار موجود نیست."],loads,rows};
 if(!finite(windFactor)||windFactor<0||![-1,1].includes(Number(windSign)))return{success:false,issues:["ضریب یا علامت باد نامعتبر است."],loads,rows};
 for(const face of ["front","rear"]){
  const key=face==="front"?"end-wall-front":"end-wall-back",p=pressures?.[key];
  if(!finite(p)){issues.push("فشار سطح "+key+" مفقود یا نامعتبر است.");continue;}
  if(Math.abs(p*windFactor)<1e-12)continue;
  const faceMembers=members.filter(m=>m.sectionKey==="endGirt"&&m.endFace===face);
  if(!faceMembers.length){issues.push("برای سطح فعال "+key+" هیچ گرتی وجود ندارد.");continue;}
  for(const m of faceMembers){
   const a=nodes.get(String(m.start)),b=nodes.get(String(m.end)),strip=stripGeometry(m,a,b,g);
   if(!strip.success){issues.push("گرت "+m.id+": "+strip.issues.join("؛ "));continue;}
   const axis=axesFor(a,b),faceSign=(face==="front"?1:-1)*windSign;
   const qAverage=[0,0,faceSign*p*windFactor*strip.avgH*1000];
   const local=localResidualVector(qAverage,m,strip,p*windFactor,faceSign,axis);
   const global=localToGlobalLoads(m,axis,local);
   const combined=new Map();
   global.forEach(x=>{const old=combined.get(x.nodeId)||[0,0,0,0,0,0];x.values.forEach((v,i)=>old[i]+=v);combined.set(x.nodeId,old);});
   const segmentLoads=[...combined].map(([nodeId,values])=>({nodeId,values}));
   segmentLoads.forEach(x=>loads.push(x));
   const force=[0,0,0],moment=[0,0,0];
   segmentLoads.forEach(x=>{const n=nodes.get(x.nodeId),F=x.values.slice(0,3),M=x.values.slice(3,6),r=[n.x,n.y,n.z],rm=cross(r,F);for(let i=0;i<3;i++){force[i]+=F[i];moment[i]+=rm[i]+M[i];}});
   const expectedTorque=faceSign*p*windFactor*1000*(strip.intYdA-strip.y*strip.area);
   const expectedMy=-faceSign*p*windFactor*1000*(strip.intXdA-strip.x0*strip.area-strip.L*strip.area/2);
   const residuals={force:Math.hypot(...force),momentX:Math.abs(moment[0]-expectedTorque),momentY:Math.abs(moment[1]-expectedMy),momentZ:Math.abs(moment[2])};
   const scale=Math.max(1,Math.abs(expectedTorque),Math.abs(expectedMy));
   if(residuals.force>scale*1e-8||residuals.momentX>scale*1e-8||residuals.momentY>scale*1e-8||residuals.momentZ>scale*1e-8)issues.push("تعادل شش‌مؤلفه‌ای بار معادل گرت "+m.id+" برقرار نیست.");
   rows.push({memberId:m.id,face,lengthM:strip.L,averageTributaryHeightM:strip.avgH,upperBoundaryMode:strip.roofClipped?"sloping-roof":"horizontal-girt-band",uniformBaselineKNm:qAverage[2]/1000,consistentResidualAndEccentricNodalLoads:segmentLoads,expectedEccentricTorque_Nm:expectedTorque,actualNodalMoment_Nm:moment,residuals,success:residuals.force<=scale*1e-8&&residuals.momentX<=scale*1e-8&&residuals.momentY<=scale*1e-8&&residuals.momentZ<=scale*1e-8});
  }
 }
 const merged=new Map();
 loads.forEach(x=>{const v=merged.get(x.nodeId)||[0,0,0,0,0,0];x.values.forEach((q,i)=>v[i]+=q);merged.set(x.nodeId,v);});
 const nodalLoads=[...merged].filter(([,values])=>values.some(v=>Math.abs(v)>1e-10)).map(([nodeId,values])=>({nodeId,values}));
 return{success:issues.length===0,loadTransferEnabled:issues.length===0,loads:nodalLoads,rows,issues,windFactor,windSign,analysisEnabled:false,designApproved:false,method:"consistent beam nodal residual loads from exact linear tributary-height variation plus distributed eccentric torsion; mean uniform force remains on each end-girt",limitations:["این ماژول فقط برای گرت‌های افقی انتهایی و فشار باد یکنواخت هر وجه است.","بار میانگین یکنواخت در analysisLoad عضو باقی می‌ماند؛ این ماژول فقط اختلاف خطی و گشتاور ناشی از خروج از مرکزیت را به‌صورت بار سازگار گره‌ای می‌افزاید.","مقطع، اتصالات، ورق پوسته، پیچ و ظرفیت گرت/ستونک در این ماژول طراحی نمی‌شوند.","بار باد و ضرایب اقلیمی باید جداگانه از مرجع معتبر تأیید شوند."]};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const g={span:10,height:4,rise:2},nodes=[{id:"A",x:0,y:2,z:0},{id:"B",x:5,y:2,z:0}],member={id:"G1",start:"A",end:"B",sectionKey:"endGirt",endFace:"front",tributaryHeight:1.5,tributaryHeightLowerM:1.25,tributaryHeightUpperM:2.75};
 const strip=stripGeometry(member,nodes[0],nodes[1],g);
 t("exact strip area and first moments for constant band",()=>strip.success&&Math.abs(strip.area-7.5)<1e-9&&Math.abs(strip.intYdA-15)<1e-9&&Math.abs(strip.intXdA-18.75)<1e-9);
 const model={geometry:g,nodes,members:[member]};
 const r=prepareNodalLoads(model,{"end-wall-front":0.3,"end-wall-back":0},1,1);
 t("constant band produces zero residual/eccentric nodal loads",()=>r.success&&r.loads.length===0&&r.rows.length===1&&r.rows[0].success);
 const sloped={...member,start:"C",end:"D",tributaryHeight:4,tributaryHeightLowerM:1,tributaryHeightUpperM:5};
 const slopeModel={geometry:{span:10,height:4,rise:2},nodes:[{id:"C",x:0,y:2,z:0},{id:"D",x:5,y:2,z:0}],members:[sloped]};
 const sr=prepareNodalLoads(slopeModel,{"end-wall-front":0.3,"end-wall-back":0},1,1);
 t("sloping roof strip produces consistent residual and eccentric nodal loads",()=>sr.success&&sr.loads.length===2&&sr.rows[0].success&&Math.abs(sr.rows[0].expectedEccentricTorque_Nm)>1);
 t("rear face reverses global pressure sign",()=>{const rr=prepareNodalLoads({...model,nodes:[{id:"A",x:0,y:2,z:10},{id:"B",x:5,y:2,z:10}],members:[{...member,endFace:"rear"}]}, {"end-wall-front":0,"end-wall-back":0.3},1,1);return rr.success&&rr.rows[0].uniformBaselineKNm<0;});
 t("wind factor scales eccentric actions linearly",()=>{const x=prepareNodalLoads(slopeModel,{"end-wall-front":0.3,"end-wall-back":0},0.5,1);return x.success&&Math.abs(x.rows[0].expectedEccentricTorque_Nm-sr.rows[0].expectedEccentricTorque_Nm/2)<1e-8;});
 t("wind sign reverses eccentric actions",()=>{const x=prepareNodalLoads(slopeModel,{"end-wall-front":0.3,"end-wall-back":0},1,-1);return x.success&&Math.abs(x.rows[0].expectedEccentricTorque_Nm+sr.rows[0].expectedEccentricTorque_Nm)<1e-8;});
 t("non-horizontal girt is rejected",()=>{const x=prepareNodalLoads({...model,nodes:[nodes[0],{...nodes[1],y:2.1}]},{"end-wall-front":0.3,"end-wall-back":0});return !x.success;});
 t("girt crossing ridge is rejected",()=>{const x=stripGeometry({...member,tributaryHeight:2,tributaryHeightLowerM:1,tributaryHeightUpperM:3},{id:"E",x:4,y:2,z:0},{id:"F",x:6,y:2,z:0},g);return !x.success;});
 t("missing strip bounds fail closed",()=>{const x=prepareNodalLoads({...model,members:[{...member,tributaryHeightLowerM:undefined}]},{"end-wall-front":0.3,"end-wall-back":0});return !x.success;});
 t("zero wind creates no eccentric loads",()=>{const x=prepareNodalLoads(model,{"end-wall-front":0,"end-wall-back":0},1,1);return x.success&&x.loads.length===0;});
 t("generated gable loads are accepted by the 3D solver with equilibrium",()=>{if(!root.SteelFrame3D?.analyze)return false;const m={geometry:{span:10,height:4,rise:2},nodes:[{id:"A",x:0,y:2,z:0},{id:"B",x:5,y:2,z:0}],members:[{id:"G1",start:"A",end:"B",sectionKey:"endGirt",endFace:"front",tributaryHeight:4,tributaryHeightLowerM:1,tributaryHeightUpperM:5}]};const transfer=prepareNodalLoads(m,{"end-wall-front":0.3,"end-wall-back":0},1,1);m.members[0].analysisLoad={uniformLocal:[0,0,1200]};const r=root.SteelFrame3D.analyze(m,{sectionResolver:()=>({E:200e9,G:77e9,A:0.01,Iy:8e-5,Iz:2e-5,J:1e-5}),supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}],nodalLoads:transfer.loads});return transfer.success&&r.success&&r.equilibrium?.ok===true;});
 t("invalid wind factor is rejected",()=>!prepareNodalLoads(model,{"end-wall-front":0.3,"end-wall-back":0},-1,1).success);
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelGableEccentricLoadTransfer={stripGeometry,prepareNodalLoads,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tapered-section-property-audit.js ===== */
/* SAHROUD STEEL — independent tapered I-section property consistency audit.
 * Recomputes geometric A, Iy, Iz and thin-wall J from each segment's recorded
 * dimensions and compares them with the exact properties passed to the 3D solver.
 * Units: dimensions mm; solver section properties m² and m⁴.
 * This is a data-integrity check, not a resistance or stability design.
 */
(function(root){
"use strict";
const positive=v=>Number.isFinite(Number(v))&&Number(v)>0;
function expected(d){
 const depth=Number(d.d),bf=Number(d.bf),tw=Number(d.tw),tf=Number(d.tf);
 if(![depth,bf,tw,tf].every(positive)||depth<=2*tf||bf<=tw)throw Error("ابعاد مقطع I نامعتبر است.");
 const hw=depth-2*tf,A=2*bf*tf+tw*hw;
 const Ix=(bf*depth**3-(bf-tw)*hw**3)/12;
 const Iy=(2*tf*bf**3+hw*tw**3)/12;
 const J=(2*bf*tf**3+hw*tw**3)/3;
 return {A_m2:A*1e-6,Iy_m4:Iy*1e-12,Iz_m4:Ix*1e-12,J_m4:J*1e-12};
}
function rel(a,b){return Math.abs(Number(a)-b)/Math.max(Math.abs(b),1e-30);}
function audit(input,options){
 const src=input||{},tol=Number(options?.relativeTolerance??1e-8),members=Array.isArray(src.members)?src.members:[],issues=[],rows=[];
 if(!(Number.isFinite(tol)&&tol>0&&tol<0.01))issues.push("تلرانس مقایسه خواص باید مثبت و کمتر از ۱٪ باشد.");
 const tapered=members.filter(m=>m&&(m.taperApplied===true||m.taperSegmentCount!=null));
 const groups=new Map();
 tapered.forEach(m=>{
  const id=String(m.id||""),parent=String(m.parentMemberId||"");
  if(!id||!parent)issues.push("شناسه قطعه یا عضو فیزیکی والد خالی است.");
  const d=m.taperDimensions||m.taperProperties?.dimensions,s=m.section||{};
  let e=null;try{e=expected(d);}catch(err){issues.push("قطعه "+id+": "+err.message);}
  if(e){
   const actual={A_m2:s.A,Iy_m4:s.Iy,Iz_m4:s.Iz,J_m4:s.J},errors={};
   Object.keys(e).forEach(k=>{const v=actual[k];if(!positive(v))issues.push("خاصیت حل‌گر "+k+" در قطعه "+id+" نامعتبر است.");else{errors[k]=rel(v,e[k]);if(errors[k]>tol)issues.push("عدم تطابق "+k+" در قطعه "+id+"؛ اختلاف نسبی "+errors[k]);}});
   rows.push({id,parentMemberId:parent,expected:e,actual,relativeErrors:errors,passed:Object.values(errors).length===4&&Object.values(errors).every(v=>v<=tol)});
  }
  const g=groups.get(parent)||[];g.push(m);groups.set(parent,g);
 });
 groups.forEach((g,parent)=>{
  const ordered=g.slice().sort((a,b)=>Number(a.taperSegmentIndex)-Number(b.taperSegmentIndex));
  const count=Number(ordered[0]?.taperSegmentCount);
  if(!Number.isInteger(count)||count<2||ordered.length!==count)issues.push("تعداد قطعات عضو "+parent+" با تعداد اعلام‌شده برابر نیست.");
  const indices=ordered.map(m=>Number(m.taperSegmentIndex));
  if(new Set(indices).size!==indices.length||indices.some((v,i)=>v!==i+1))issues.push("شماره قطعات عضو "+parent+" تکراری، ناقص یا نامرتب است.");
  const coords=ordered.map(m=>Number(m.taperCoordinate));
  if(coords.some(v=>!Number.isFinite(v)||v<0||v>1)||coords.some((v,i)=>i&&v<=coords[i-1]))issues.push("مختصات نسبی مقطع عضو "+parent+" باید یکتا و افزایشی در بازه صفر تا یک باشد.");
 });
 return {success:issues.length===0&&rows.length===tapered.length,status:issues.length?"property-mismatch-or-incomplete":"section-properties-consistent",checkedSegments:rows.length,rows,issues,relativeTolerance:tol,scope:"Independent geometry-to-solver-property consistency only; no plate slenderness, member resistance, buckling, LTB, interaction, deflection or code approval.",analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const dims={d:500,bf:200,tw:8,tf:12},e=expected(dims);
 const base={id:"R1_TAPER_01",parentMemberId:"R1",taperApplied:true,taperSegmentIndex:1,taperSegmentCount:2,taperCoordinate:.25,taperDimensions:dims,section:{A:e.A_m2,Iy:e.Iy_m4,Iz:e.Iz_m4,J:e.J_m4}};
 const second={...base,id:"R1_TAPER_02",taperSegmentIndex:2,taperCoordinate:.75};
 const good=audit({members:[base,second]});
 const bad=audit({members:[base,{...second,section:{...second.section,Iy:second.section.Iy*1.1}}]});
 const missing=audit({members:[base]});
 const invalid=audit({members:[{...base,taperDimensions:{...dims,tf:300}}]});
 const checks=[good.success&&good.checkedSegments===2,!bad.success,!missing.success,!invalid.success,!good.designApproved&&!good.analysisEnabled];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelTaperedSectionPropertyAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tie-beam-solver-audit.js ===== */
/* SAHROUD STEEL — post-solver verification of concrete tie-beam assembly.
 * Confirms that declared tie-beam segments are present exactly once in the actual solver
 * result, with matching connectivity, section properties, offsets, releases and the actually applied uniform load vector.
 * This is an integration audit, not a concrete/member/foundation code design approval.
 */
(function(root){
 "use strict";
 const close=(a,b,tol=1e-9)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
 const vec=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>close(v,b[i]));
 const sameRelease=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Number.isInteger(v)&&v===b[i]);
 function audit(model,result,integration,loadCase){
  const selected=loadCase&&typeof loadCase==="object"?loadCase:{key:"dead",deadFactor:loadCase,direction:[0,-1,0]};
  const factors=selected.factors&&typeof selected.factors==="object"?selected.factors:null;
  const deadFactor=Number(selected.deadFactor??(factors?factors.dead:(selected.key==="dead"?1:0)));
  const issues=[],rows=[],included=Array.isArray(integration?.included)?integration.included:[];
  if(!model||!Array.isArray(model.members)||!result||!Array.isArray(result.members))return{success:false,issues:["مدل مونتاژ یا نتیجه واقعی حل‌گر در دسترس نیست."],rows,expectedSegments:0,verifiedSegments:0};
  if(!Number.isFinite(deadFactor)||deadFactor<0)issues.push("ضریب بار مرده برای ممیزی وزن خود معتبر نیست.");
  if(!Number.isInteger(result.memberCount)||result.memberCount!==model.members.length)issues.push("تعداد اعضای اعلام‌شده حل‌گر با مدل مونتاژشده برابر نیست.");
  if(result.members.length!==model.members.length)issues.push("تعداد اعضای بازگشتی حل‌گر با تعداد اعضای مدل برابر نیست.");
  const sourceCounts=new Map(),solvedCounts=new Map();
  model.members.forEach(m=>sourceCounts.set(String(m.id),(sourceCounts.get(String(m.id))||0)+1));
  result.members.forEach(m=>solvedCounts.set(String(m.id),(solvedCounts.get(String(m.id))||0)+1));
  const sourceById=new Map(model.members.map(m=>[String(m.id),m]));
  const solvedById=new Map(result.members.map(m=>[String(m.id),m]));
  const expectedIds=[];
  included.forEach(route=>{
   const ids=Array.isArray(route.memberIds)?route.memberIds:[];
   if(!ids.length)issues.push("مسیر "+String(route.id)+" هیچ شناسه قطعه حل‌گری ندارد.");
   ids.forEach(id=>{
    const key=String(id);expectedIds.push(key);
    const src=sourceById.get(key),sol=solvedById.get(key),local=[];
    if(sourceCounts.get(key)!==1)local.push("عضو متناظر در مدل مونتاژشده دقیقاً یک‌بار وجود ندارد");
    if(solvedCounts.get(key)!==1||!sol)local.push("عضو متناظر در خروجی حل‌گر دقیقاً یک‌بار وجود ندارد");
    if(!src)local.push("تعریف عضو منبع پیدا نشد");
    if(src&&sol){
     if(String(src.start)!==String(sol.start)||String(src.end)!==String(sol.end))local.push("اتصال گره‌های ابتدا و انتها با مدل منبع یکسان نیست");
     if(src.sectionKey!=="tieBeam"||sol.sectionKey!=="tieBeam")local.push("کلید مقطع بتنی شناژ در حل‌گر حفظ نشده است");
     const p=src.analysisSection||{},q=sol.section||{};
     for(const k of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(p[k])&&p[k]>0&&Number.isFinite(q[k])&&close(p[k],q[k])))local.push("خاصیت مقطع "+k+" با مقدار مصوب ورودی حل‌گر تطبیق ندارد");
     const oi=src.endOffsets||{},so=sol.endOffsets||{};
     if(!vec(oi.i,so.i)||!vec(oi.j,so.j))local.push("بازوی صلب دو انتهای عضو در خروجی حل‌گر حفظ نشده است");
     if(!sameRelease(src.endReleases?.i,sol.endReleases?.i)||!sameRelease(src.endReleases?.j,sol.endReleases?.j))local.push("آزادسازی دوران ابتدا/انتها با مدل منبع یکسان نیست");
     if(!Array.isArray(sol.localEndForces)||sol.localEndForces.length!==12||sol.localEndForces.some(v=>!Number.isFinite(v)))local.push("نیروهای انتهایی محلی ۱۲ مؤلفه عددی معتبر ندارند");
     const expected=Number(p.A)*Number(src.tieBeamDensityKNm3)*deadFactor;
     const sourceSW=src.analysisLoad?.selfWeightKNm,solvedSW=sol.analysisLoad?.selfWeightKNm;
     if(!Number.isFinite(sourceSW)||!close(sourceSW,expected))local.push("بار خطی وزن خود منبع با A×وزن مخصوص×ضریب مرده تطبیق ندارد");
     if(!Number.isFinite(solvedSW)||!close(solvedSW,expected))local.push("ردیابی وزن خود در عضو بازگشتی حل‌گر ناقص یا متفاوت است");
     const lineLoads=src.lineLoads||{};
     let factoredLineLoad=0;
     if(factors){
      for(const k of ["dead","live","snow"]){
       if(!Number.isFinite(lineLoads[k])||!Number.isFinite(factors[k]))local.push("بار/ضریب "+k+" برای بازسازی بار گسترده شناژ معتبر نیست");
       else factoredLineLoad+=lineLoads[k]*factors[k];
      }
     }else if(typeof selected.key==="string"&&Number.isFinite(lineLoads[selected.key]))factoredLineLoad=lineLoads[selected.key];
     else local.push("حالت بار برای بازسازی مستقل بار گسترده شناژ مشخص نیست");
     const windActive=selected.key==="wind"||Number(selected.windFactor)>0;
     if(windActive&&["wind","windLeft","windRight","windEnd"].some(k=>Number(lineLoads[k]||0)!==0))
      local.push("بار باد خطی مستقیم روی شناژ در قرارداد فعلی انتقال بار پشتیبانی نمی‌شود");
     const windOnly=selected.key==="wind"&&!factors;
     const expectedGlobal=windOnly?[0,0,0]:[0,-(factoredLineLoad+expected)*1000,0];
     const sourceGlobal=src.analysisLoad?.globalUniform,solvedGlobal=sol.analysisLoad?.globalUniform;
     const sourceLocal=src.analysisLoad?.uniformLocal,solvedLocal=sol.analysisLoad?.uniformLocal;
     if(!vec(sourceGlobal,expectedGlobal))local.push("بردار بار گسترده جهانی منبع، وزن خود را دقیقاً یک‌بار به بارهای خطی اضافه‌شده نمی‌کند");
     if(!vec(solvedGlobal,expectedGlobal))local.push("بردار بار گسترده جهانی عضو حل‌شده با بار مورد انتظار تطبیق ندارد");
     if(!sol.localAxes||!Array.isArray(sol.localAxes.x)||!Array.isArray(sol.localAxes.y)||!Array.isArray(sol.localAxes.z))local.push("محورهای محلی عضو در نتیجه حل‌گر ثبت نشده‌اند");
     else{
      const expectedLocal=[sol.localAxes.x,sol.localAxes.y,sol.localAxes.z].map(axis=>axis.reduce((sum,v,i)=>sum+v*expectedGlobal[i],0));
      if(!vec(sourceLocal,expectedLocal))local.push("تبدیل بار گسترده جهانی به محورهای محلی در مدل منبع سازگار نیست");
      if(!vec(solvedLocal,expectedLocal))local.push("بردار بار گسترده محلی در عضو بازگشتی حل‌گر با بار مورد انتظار سازگار نیست");
     }
    }
    rows.push({routeId:String(route.id),memberId:key,verified:local.length===0,issues:local});
    local.forEach(x=>issues.push(key+": "+x));
   });
  });
  if(new Set(expectedIds).size!==expectedIds.length)issues.push("یک شناسه قطعه در بیش از یک مسیر شناژ ثبت شده است.");
  const actualTieIds=model.members.filter(m=>m.sectionKey==="tieBeam").map(m=>String(m.id));
  if(actualTieIds.length!==expectedIds.length||actualTieIds.some(id=>!expectedIds.includes(id)))issues.push("اعضای شناژ مدل مونتاژشده با فهرست مسیرهای تأییدشده تطابق کامل ندارند.");
  return{schemaVersion:1,success:issues.length===0,issues,expectedSegments:expectedIds.length,verifiedSegments:rows.filter(r=>r.verified).length,rows,solverMemberCount:result.members.length,modelMemberCount:model.members.length,deadFactor,selfWeightAudit:"برای هر قطعه، وزن خطی ثبت‌شده باید دقیقاً برابر A×γc×ضریب D باشد و همان مقدار در نتیجه عضو حل‌گر بازتاب یابد؛ این ممیزی بازسازی کامل بارهای متغیر و بردار بار FEM نیست.",designApproved:false};
 }
 function selfTest(){
  const lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0};
  const appliedLoad={uniformLocal:[0,-7500,0],globalUniform:[0,-7500,0],selfWeightKNm:7.5};
  const src={id:"T1",start:"A",end:"B",sectionKey:"tieBeam",lineLoads,analysisSection:{E:2e10,G:8e9,A:.3,Iy:.006,Iz:.004,J:.003},endOffsets:{i:[0,-.25,0],j:[0,-.25,0]},endReleases:{i:[],j:[4,5]},tieBeamDensityKNm3:25,analysisLoad:appliedLoad};
  const sol={id:"T1",start:"A",end:"B",sectionKey:"tieBeam",section:{...src.analysisSection},endOffsets:{i:[0,-.25,0],j:[0,-.25,0]},endReleases:{i:[],j:[4,5]},localEndForces:Array(12).fill(0),localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},analysisLoad:{...appliedLoad,uniformLocal:appliedLoad.uniformLocal.slice(),globalUniform:appliedLoad.globalUniform.slice()}};
  const model={members:[src]},result={memberCount:1,members:[sol]},integration={included:[{id:"R1",memberIds:["T1"]}]};
  const deadCase={key:"dead",deadFactor:1,direction:[0,-1,0]};
  const ok=audit(model,result,integration,deadCase),missing=audit(model,{memberCount:0,members:[]},integration,deadCase);
  const dup=audit({members:[src,src]},{memberCount:2,members:[sol,sol]},integration,deadCase);
  const badOffset=audit(model,{memberCount:1,members:[{...sol,endOffsets:{i:[0,0,0],j:[0,-.25,0]}}]},integration,deadCase);
  const badWeight=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,selfWeightKNm:15}}]},integration,deadCase);
  const omittedWeight=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,globalUniform:[0,0,0],uniformLocal:[0,0,0]}}]},integration,deadCase);
  const doubledWeight=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,globalUniform:[0,-15000,0],uniformLocal:[0,-15000,0]}}]},integration,deadCase);
  const badLocal=audit(model,{memberCount:1,members:[{...sol,analysisLoad:{...sol.analysisLoad,uniformLocal:[0,-7000,0]}}]},integration,deadCase);
  const badSection=audit(model,{memberCount:1,members:[{...sol,section:{...sol.section,A:.4}}]},integration,deadCase);
  const comboLineLoads={...lineLoads,dead:2,live:1,snow:.5};
  const comboApplied={selfWeightKNm:9,globalUniform:[0,-13250,0],uniformLocal:[0,-13250,0]};
  const comboSource={...src,lineLoads:comboLineLoads,analysisLoad:comboApplied};
  const comboSolved={...sol,analysisLoad:{...comboApplied,globalUniform:comboApplied.globalUniform.slice(),uniformLocal:comboApplied.uniformLocal.slice()}};
  const combo=audit({members:[comboSource]},{memberCount:1,members:[comboSolved]},integration,{key:"combo",deadFactor:1.2,windFactor:0,factors:{dead:1.2,live:1.6,snow:.5}});
  const checks={acceptsCompleteSolverMember:ok.success&&ok.verifiedSegments===1,rejectsMissingSolverMember:!missing.success,rejectsDuplicateMember:!dup.success,rejectsWrongRigidOffset:!badOffset.success,rejectsWrongSelfWeightMetadata:!badWeight.success,rejectsOmittedSelfWeightFromAppliedLoad:!omittedWeight.success,rejectsDoubleSelfWeightInAppliedLoad:!doubledWeight.success,rejectsWrongLocalLoadProjection:!badLocal.success,rejectsWrongSolverSection:!badSection.success,acceptsFactoredGravityCombination:combo.success};
  return{passed:Object.values(checks).every(Boolean),checks,complete:ok,missing,duplicate:dup,badOffset,badWeight,omittedWeight,doubledWeight,badLocal,badSection,combo};
 }
 root.SteelTieBeamSolverAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/foundation-model-fingerprint.js ===== */
/* SAHROUD STEEL — canonical source-model fingerprint shared by analysis and foundation takeoff. */
(function(root){
 "use strict";
 function build(model,context){
  if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw new Error("مدل پایه برای ساخت اثرانگشت فونداسیون معتبر نیست.");
  const c=context||{};
  return JSON.stringify({
   geometry:model.geometry||null,
   nodes:model.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),
   members:model.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),
   tieBeamLayout:c.tieBeamLayout??null,
   loadSettings:c.loadSettings??null,
   sections:c.sections??null,
   support:c.support||"pinned"
  });
 }
 function selfTest(){
  const model={geometry:{span:12},nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"}],members:[{id:"C1",start:"B1",end:"T1",sectionKey:"column",lineLoads:{dead:1}}]};
  const ctx={tieBeamLayout:{routes:[{id:"TB1",start:"B1",end:"B2",widthM:.6,heightM:.5}]},loadSettings:{combinations:[{dead:1}]},sections:{ST37:{E:2e11}},support:"fixed"};
  const base=build(model,ctx),same=build(JSON.parse(JSON.stringify(model)),JSON.parse(JSON.stringify(ctx)));
  const tie=build(model,{...ctx,tieBeamLayout:{routes:[{id:"TB1",start:"B1",end:"B2",widthM:.7,heightM:.5}]}});
  const loads=build(model,{...ctx,loadSettings:{combinations:[{dead:1.2}]}});
  const sections=build(model,{...ctx,sections:{ST37:{E:1.9e11}}});
  const support=build(model,{...ctx,support:"pinned"});
  const geometry=build({...model,geometry:{span:18}},ctx);
  const members=build({...model,members:[{...model.members[0],lineLoads:{dead:2}}]},ctx);
  const checks={sameInputsMatch:base===same,tieBeamChangeInvalidates:base!==tie,loadCombinationChangeInvalidates:base!==loads,sectionChangeInvalidates:base!==sections,supportChangeInvalidates:base!==support,geometryChangeInvalidates:base!==geometry,memberLoadChangeInvalidates:base!==members};
  return{passed:Object.values(checks).every(Boolean),checks};
 }
 root.SteelFoundationModelFingerprint={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/model-3d.js ===== */
/* SAHROUD STEEL - Full shed geometry model 1.0 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  let model = null, originalDrawFrame = null, progressRunning = false;
  const cameraView = { azimuth: 0, zoom: 1 };
  function setCameraView(next) {
    if (Number.isFinite(Number(next?.azimuth))) cameraView.azimuth = Number(next.azimuth);
    if (Number.isFinite(Number(next?.zoom))) cameraView.zoom = Math.max(0.65, Math.min(2.5, Number(next.zoom)));
    if (model) draw();
    return { ...cameraView };
  }
  function runWithProgress(startLabel, task, onError) {
    if (progressRunning) return;
    progressRunning = true;
    const panel = $("modelProgress"), text = $("modelProgressText"), elapsed = $("modelProgressElapsed");
    const buttons = ["btnBuildFullModel", "btnCheck3DSections", "btnRunFull3D", "btnTestSpan10"];
    const started = performance.now();
    buttons.forEach(id => { if ($(id)) $(id).disabled = true; });
    if (panel) panel.hidden = false;
    if (text) text.textContent = startLabel;
    if (elapsed) elapsed.textContent = "۰٫۰ ثانیه";
    const timer = setInterval(() => {
      if (elapsed) elapsed.textContent = ((performance.now() - started) / 1000).toFixed(1).replace(".", "٫") + " ثانیه";
    }, 250);
    const stage = message => { if (text) text.textContent = message; };
    // دو فریم به مرورگر فرصت می‌دهیم نوار را واقعاً رسم کند؛ سپس محاسبات سنگین آغاز می‌شود.
    (async () => {
      // ابتدا دو فریم و سپس یک مکث کوتاه؛ تا مرورگر فرصت قطعی برای paint نوار داشته باشد.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 180))));
      try { await task(stage); }
      catch (error) { if (typeof onError === "function") onError(error); }
      finally {
        clearInterval(timer);
        const duration = (performance.now() - started) / 1000;
        if (text) text.textContent = "عملیات پایان یافت";
        if (elapsed) elapsed.textContent = duration.toFixed(2).replace(".", "٫") + " ثانیه";
        buttons.forEach(id => { if ($(id)) $(id).disabled = false; });
        progressRunning = false;
        // نتیجه برای لحظه‌ای خوانا می‌ماند و سپس نوار از صفحه جمع می‌شود.
        setTimeout(() => { if (panel) panel.hidden = true; }, 650);
      }
    })();
  }
  function ensurePanel() {
    if ($("shedLayoutPanel")) return;
    const drawingPanel = Array.from(document.querySelectorAll("main .panel")).find(p => p.querySelector("#frameDrawing"));
    if (!drawingPanel) return;
    const panel = document.createElement("section");
    panel.className = "panel"; panel.id = "shedLayoutPanel";
    panel.innerHTML = '<div class="panel-title"><h3>مدل هندسی کامل سوله</h3><span class="status">جانمایی اجزا</span></div>' +
      '<div class="notice">فاصله‌ها و تعداد اعضای فرعی برای تولید مدل هندسی استفاده می‌شوند. مقادیر پیش‌فرض صرفاً برای شروع مدل هستند و باید با نقشه اجرایی تطبیق داده شوند.</div>' +
      '<h4>هندسه مقدماتی تیر حمال جرثقیل</h4><div class="notice">فاصله محور تیر حمال از محور ستون و نوع اتصال باید از نقشه/جزئیات پروژه تعیین شود. این ورودی‌ها فقط هندسه و مشخصات را ثبت می‌کنند و هنوز وارد حل‌گر نمی‌شوند.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayAxisOffset">فاصله افقی محور تیر حمال از محور ستون (m)</label><input id="craneRunwayAxisOffset" type="number" min="0.05" step="0.01" placeholder="از نقشه وارد شود"></div>' +
      '<div class="field"><label for="craneRunwaySupportType">نوع اتصال تیر حمال به قاب</label><select id="craneRunwaySupportType"><option value="">انتخاب نشده</option><option value="simple">ساده / مفصلی</option><option value="moment">گیردار / انتقال لنگر</option><option value="spring">نیمه‌گیردار / فنری</option></select></div></div>' +
      '<h4>ورودی مقطع و اتصال برای شبکه واقعی سه‌بعدی</h4><div class="notice">برای افزودن واقعی تیر حمال و براکت به مدل FEM، خواص مقطع و آزادسازی انتهایی را با واحد SI و مرجع نقشه وارد کنید. تا تکمیل این ورودی‌ها اعضا به حل‌گر افزوده نمی‌شوند.</div><div class="field"><label for="crane3DIntegrationJson">تعریف JSON مقطع تیر حمال، براکت و اتصالات</label><textarea id="crane3DIntegrationJson" rows="9" placeholder=&quot;JSON شامل خواص دو مقطع، آزادسازی‌ها، مراجع نقشه، verticalReactionOffset_m، horizontalWheelOffset_m و horizontalApplicationSides&quot;></textarea></div><div id="crane3DIntegrationAudit" class="notice">ورودی یکپارچه‌سازی سه‌بعدی هنوز ثبت نشده است.</div>' +
      '<h4>مشخصات مقدماتی مقطع تیر حمال و ریل</h4><div class="notice">ابعاد باید از نقشه سازنده یا طراحی اولیه وارد شوند. فیلدهای خالی عمداً پیش‌فرض ندارند. این داده‌ها برای ممیزی مقدماتی‌اند و تا تکمیل کنترل‌ها برای تحلیل فعال نمی‌شوند.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayGirderType">نوع تیر حمال</label><select id="craneRunwayGirderType"><option value="">انتخاب نشده</option><option value="builtup-i">تیرورق I ساخته‌شده</option><option value="rolled-i">مقطع I نوردشده</option><option value="box">مقطع جعبه‌ای</option></select></div>' +
      '<div class="field"><label for="craneRunwaySteelGrade">گرید فولاد تیر حمال</label><select id="craneRunwaySteelGrade"><option value="ST37" selected>ST37 (پیش‌فرض)</option><option value="ST52">ST52</option><option value="other">سایر / نیازمند تعریف</option></select></div>' +
      '<div class="field"><label for="craneRunwayOverallDepth">ارتفاع کل تیر حمال (mm)</label><input id="craneRunwayOverallDepth" type="number" min="1" step="1" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayFlangeWidth">عرض بال (mm)</label><input id="craneRunwayFlangeWidth" type="number" min="1" step="1" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayFlangeThickness">ضخامت بال (mm)</label><input id="craneRunwayFlangeThickness" type="number" min="1" step="0.5" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayWebThickness">ضخامت جان (mm)</label><input id="craneRunwayWebThickness" type="number" min="1" step="0.5" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayRailDesignation">مشخصه/مدل ریل</label><input id="craneRunwayRailDesignation" type="text" placeholder="طبق کاتالوگ سازنده"></div>' +
      '<div class="field"><label for="craneRunwayRailMass">جرم ریل (kg/m)</label><input id="craneRunwayRailMass" type="number" min="0.1" step="0.1" placeholder="از کاتالوگ"></div>' +
      '<div class="field"><label for="craneRunwayRailFastening">روش اتصال ریل</label><select id="craneRunwayRailFastening"><option value="">انتخاب نشده</option><option value="clip">کلیپس/بست ریل</option><option value="welded">جوشی</option><option value="bolted">پیچی</option><option value="other">سایر</option></select></div>' +
      '<div class="field"><label for="craneRunwayStiffenerSpacing">فاصله سخت‌کننده‌های جان (m)</label><input id="craneRunwayStiffenerSpacing" type="number" min="0.05" step="0.05" placeholder="از طراحی"></div>' +
      '<div class="field"><label for="craneRunwayLateralRestraint">وضعیت مهار جانبی بال فشاری</label><select id="craneRunwayLateralRestraint"><option value="">نامشخص</option><option value="rail-only">فقط ریل (بدون تأیید مهار)</option><option value="dedicated">مهار جانبی مستقل مستند</option><option value="none">بدون مهار جانبی</option></select></div>' +
      '<div class="field"><label for="craneRunwayDetailSource">مرجع نقشه/کاتالوگ مقطع و ریل</label><input id="craneRunwayDetailSource" type="text" placeholder="شماره نقشه، صفحه یا کاتالوگ"></div></div>' +
      '<div id="craneRunwaySectionAudit" class="notice">ممیزی مشخصات تیر حمال هنوز انجام نشده است.</div>' +
      '<h4>سخت‌کننده‌ها و ناحیه بار چرخ</h4><div class="notice">ابعاد و جزئیات باید از نقشه ساخت یا طراحی محاسباتی وارد شوند. این بخش فعلاً ممیزی هندسی/اطلاعاتی است، نه کنترل ظرفیت جان.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayEndStiffenerType">نوع سخت‌کننده انتهایی</label><select id="craneRunwayEndStiffenerType"><option value="">انتخاب نشده</option><option value="pair">جفت ورق دو طرف جان</option><option value="single">تک ورق</option><option value="other">سایر</option></select></div>' +
      '<div class="field"><label for="craneRunwayIntermediateStiffenerType">نوع سخت‌کننده میانی</label><select id="craneRunwayIntermediateStiffenerType"><option value="">انتخاب نشده</option><option value="pair">جفت ورق دو طرف جان</option><option value="single">تک ورق</option><option value="none">بدون سخت‌کننده میانی</option></select></div>' +
      '<div class="field"><label for="craneRunwayStiffenerWidth">عرض ورق سخت‌کننده (mm)</label><input id="craneRunwayStiffenerWidth" type="number" min="1" step="1" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayStiffenerThickness">ضخامت ورق سخت‌کننده (mm)</label><input id="craneRunwayStiffenerThickness" type="number" min="1" step="0.5" placeholder="از نقشه"></div>' +
      '<div class="field"><label for="craneRunwayStiffenerWeldSize">اندازه گلوی جوش (mm)</label><input id="craneRunwayStiffenerWeldSize" type="number" min="1" step="0.5" placeholder="طبق جزئیات جوش"></div>' +
      '<div class="field"><label for="craneRunwayBearingLength">طول نشیمن/پخش بار چرخ (mm)</label><input id="craneRunwayBearingLength" type="number" min="1" step="1" placeholder="طبق ریل و جزئیات"></div>' +
      '<div class="field"><label for="craneRunwayWheelLoadOffset">فاصله محور بار چرخ از محور جان (mm)</label><input id="craneRunwayWheelLoadOffset" type="number" step="1" placeholder="علامت‌دار طبق نقشه"></div>' +
      '<div class="field"><label for="craneRunwayStiffenerSource">مرجع نقشه سخت‌کننده/جوش/نشیمن</label><input id="craneRunwayStiffenerSource" type="text" placeholder="شماره نقشه و جزئیات"></div></div>' +
      '<div id="craneRunwayWebAudit" class="notice">ممیزی سخت‌کننده و جان هنوز انجام نشده است.</div>' +
      '<h4>هندسه ریل و سطح تماس بار چرخ</h4><div class="notice">ابعاد از کاتالوگ ریل و سازنده جرثقیل وارد شود؛ این اطلاعات برای تعریف مسیر بار لازم است و به‌تنهایی ظرفیت یا توزیع تنش را تعیین نمی‌کند.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailHeight">ارتفاع کل ریل (mm)</label><input id="craneRunwayRailHeight" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayRailBaseWidth">عرض کف ریل (mm)</label><input id="craneRunwayRailBaseWidth" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayRailFootThickness">ضخامت کف ریل (mm)</label><input id="craneRunwayRailFootThickness" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayRailPadThickness">ضخامت پد زیر ریل (mm)</label><input id="craneRunwayRailPadThickness" type="number" min="0" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayFasteningSpacing">فاصله بست‌های ریل (mm)</label><input id="craneRunwayFasteningSpacing" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayWheelContactWidth">عرض تماس چرخ (mm)</label><input id="craneRunwayWheelContactWidth" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayWheelContactLength">طول تماس مؤثر چرخ (mm)</label><input id="craneRunwayWheelContactLength" type="number" min="1" step="0.1"></div>' +
      '<div class="field"><label for="craneRunwayLoadPathSource">مرجع مقطع ریل/تماس چرخ</label><input id="craneRunwayLoadPathSource" type="text" placeholder="کاتالوگ ریل و سازنده جرثقیل"></div></div>' +
      '<div id="craneRunwayLoadPathAudit" class="notice">ممیزی هندسه ریل و تماس چرخ هنوز انجام نشده است.</div>' +
      '<h4>جزئیات اتصال ریل، بست‌ها و پد زیر ریل</h4><div class="notice">مشخصات واقعی اتصال باید از نقشه اجرایی و کاتالوگ سازنده وارد شود. این بخش فقط کامل‌بودن و سازگاری اولیه داده‌ها را ممیزی می‌کند؛ نیروی هر بست، فشار پد، ظرفیت پیچ/گیره یا جوش و توزیع بار محاسبه نمی‌شود.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayFasteningType">نوع اتصال ریل</label><select id="craneRunwayFasteningType"><option value="">انتخاب نشده</option><option value="clip">کلیپس/گیره مکانیکی</option><option value="bolted">اتصال پیچی مستقیم</option><option value="welded">اتصال جوشی</option><option value="other">سایر / جزئیات خاص</option></select></div>' +
      '<div class="field"><label for="craneRunwayFasteningModel">مدل/سازنده بست یا گیره</label><input id="craneRunwayFasteningModel" type="text" placeholder="شماره قطعه و سازنده"></div>' +
      '<div class="field"><label for="craneRunwayClampsPerStation">تعداد بست در هر ایستگاه</label><input id="craneRunwayClampsPerStation" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayBoltsPerClamp">تعداد پیچ هر بست</label><input id="craneRunwayBoltsPerClamp" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayBoltGrade">رده مقاومتی پیچ</label><input id="craneRunwayBoltGrade" type="text" placeholder="مثلاً 8.8 طبق نقشه"></div>' +
      '<div class="field"><label for="craneRunwayBoltDiameter">قطر اسمی پیچ (mm)</label><input id="craneRunwayBoltDiameter" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayRailSeatPlateWidth">عرض ورق زیرسری (mm)</label><input id="craneRunwayRailSeatPlateWidth" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayRailSeatPlateLength">طول ورق زیرسری (mm)</label><input id="craneRunwayRailSeatPlateLength" type="number" min="1" step="1"></div>' +
      '<div class="field"><label for="craneRunwayRailSeatPlateThickness">ضخامت ورق زیرسری (mm)</label><input id="craneRunwayRailSeatPlateThickness" type="number" min="1" step="0.5"></div>' +
      '<div class="field"><label for="craneRunwayPadMaterial">جنس/مدل پد زیر ریل</label><input id="craneRunwayPadMaterial" type="text" placeholder="الاستومر و مشخصه سازنده"></div>' +
      '<div class="field"><label for="craneRunwayPadHardness">سختی پد (Shore A)</label><input id="craneRunwayPadHardness" type="number" min="1" max="100" step="1"></div>' +
      '<div class="field"><label for="craneRunwayPadModulus">مدول فشاری پد (MPa، در صورت وجود)</label><input id="craneRunwayPadModulus" type="number" min="0.01" step="0.01"></div>' +
      '<div class="field"><label for="craneRunwayRailWeldSize">اندازه جوش اتصال ریل (mm، در صورت جوشی)</label><input id="craneRunwayRailWeldSize" type="number" min="1" step="0.5"></div>' +
      '<div class="field"><label for="craneRunwayFasteningDetailSource">مرجع نقشه/کاتالوگ بست، پیچ، ورق و پد</label><input id="craneRunwayFasteningDetailSource" type="text" placeholder="شماره نقشه، صفحه کاتالوگ و ویرایش"></div></div>' +
      '<div id="craneRunwayFasteningAudit" class="notice">ممیزی جزئیات بست و پد هنوز انجام نشده است.</div>' +
      '<h4>مدل طولی ریل و ایستگاه‌های تکیه‌گاهی</h4><div class="notice">فاصله ایستگاه‌ها و رفتار پیوستگی باید از نقشه نصب و مشخصات سازنده وارد شود. ایستگاه‌های منظم فقط برای نمایش هندسی ساخته می‌شوند؛ هیچ توزیع بار یا تحلیل تیر ریل در این مرحله انجام نمی‌شود.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailSupportPitch">فاصله ایستگاه‌های تکیه‌گاهی ریل (m)</label><input id="craneRunwayRailSupportPitch" type="number" min="0.01" step="0.01"></div>' +
      '<div class="field"><label for="craneRunwayRailFirstSupportOffset">فاصله اولین ایستگاه از ابتدای سوله (m)</label><input id="craneRunwayRailFirstSupportOffset" type="number" min="0" step="0.01" value="0"></div>' +
      '<div class="field"><label for="craneRunwayRailContinuity">رفتار پیوستگی ریل طبق جزئیات نصب</label><select id="craneRunwayRailContinuity"><option value="">انتخاب نشده</option><option value="continuous">ریل پیوسته / اتصال پیوسته</option><option value="simple-spans">قطعات مستقل بین ایستگاه‌ها</option><option value="unknown">نامشخص / نیازمند بررسی</option></select></div>' +
      '<div class="field"><label for="craneRunwayRailJointPositions">موقعیت وصله‌های ریل از ابتدای سوله (m، با ویرگول)</label><input id="craneRunwayRailJointPositions" type="text" placeholder="مثلاً 12, 24, 36"></div>' +
      '<div class="field"><label for="craneRunwayRailIx">ممان اینرسی قوی ریل Ix (mm⁴)</label><input id="craneRunwayRailIx" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailIy">ممان اینرسی ضعیف ریل Iy (mm⁴)</label><input id="craneRunwayRailIy" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailJ">ثابت پیچشی ریل J (mm⁴، طبق منبع)</label><input id="craneRunwayRailJ" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailE">مدول الاستیسیته ریل E (MPa)</label><input id="craneRunwayRailE" type="number" min="0.01" step="any"></div>' +
      '<div class="field"><label for="craneRunwayRailPropertySource">منبع خواص مقطع ریل و جزئیات وصله</label><input id="craneRunwayRailPropertySource" type="text" placeholder="کاتالوگ سازنده، استاندارد، صفحه/ویرایش"></div></div>' +
      '<div id="craneRunwayRailLayoutAudit" class="notice">ممیزی مدل طولی ریل هنوز انجام نشده است.</div>' +
      '<h4>تحلیل مقدماتی تیر پیوسته ریل (FEM)</h4><div class="notice">برای هر ایستگاه، سختی قائم مؤثر بست/پد را به ترتیب ایستگاه‌های نمایش‌داده‌شده وارد کنید. بارها به‌صورت آرایه JSON و با مختصات از ابتدای مسیر ثبت می‌شوند. علامت بار قائم رو به پایین منفی است. منبع و صفحه مرجع برای سختی و تک‌تک بارها اجباری است.</div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailSupportStiffness">سختی قائم ایستگاه‌ها (N/m، جداشده با ویرگول)</label><input id="craneRunwayRailSupportStiffness" type="text" placeholder="مثلاً 1.2e8, 1.2e8, 1.2e8"></div>' +
      '<div class="field"><label for="craneRunwayRailSupportStiffnessSource">مرجع سختی قائم بست/پد</label><input id="craneRunwayRailSupportStiffnessSource" type="text" placeholder="گزارش آزمایش/کاتالوگ، صفحه و شرایط آزمون"></div></div>' +
      '<div class="field"><label for="craneRunwayRailWheelLoads">بارهای قائم چرخ در موقعیت مشخص (JSON)</label><textarea id="craneRunwayRailWheelLoads" rows="5" placeholder="[{&quot;x_m&quot;:6,&quot;P_N&quot;:-98066.5,&quot;source&quot;:&quot;نقشه جرثقیل&quot;,&quot;document&quot;:&quot;صفحه 4&quot;}]" style="direction:ltr;text-align:left"></textarea><small>هر عضو: x_m، P_N (نیوتن؛ رو به پایین منفی)، source و document. مختصات نسبت به ابتدای مسیر همان ریل است.</small></div>' +
      '<div class="button-grid"><button type="button" id="btnAnalyzeCraneRailFEM" class="btn secondary">ممیزی و اجرای تحلیل مقدماتی ریل</button><button type="button" id="btnRailFEMSelfTest" class="btn secondary">آزمون نرم‌افزاری حل‌گر ریل</button></div>' +
      '<div id="craneRunwayRailFEMResult" class="notice">تحلیل تیر ریل هنوز اجرا نشده است.</div>' +
      '<h4>جاروب قطار چرخ متحرک روی ریل</h4><div class="notice">بار هر چرخ و فاصله آن از چرخ مبنا را وارد کنید. آفست‌ها باید صعودی و بارها دارای مرجع باشند. گام مکانی کوچک‌تر دقت نمونه‌برداری را افزایش می‌دهد اما زمان محاسبه را بیشتر می‌کند.</div>' +
      '<div class="field"><label for="craneRunwayRailMovingTrain">قطار چرخ (JSON: offset_m، P_N، source، document)</label><textarea id="craneRunwayRailMovingTrain" rows="5" placeholder="[{&quot;offset_m&quot;:0,&quot;P_N&quot;:-98066.5,&quot;source&quot;:&quot;نقشه سازنده&quot;,&quot;document&quot;:&quot;صفحه 4&quot;},{&quot;offset_m&quot;:2,&quot;P_N&quot;:-85000,&quot;source&quot;:&quot;نقشه سازنده&quot;,&quot;document&quot;:&quot;صفحه 4&quot;}]" style="direction:ltr;text-align:left"></textarea></div>' +
      '<div class="form-grid"><div class="field"><label for="craneRunwayRailMovingStep">گام جاروب مکانی (m)</label><input id="craneRunwayRailMovingStep" type="number" min="0.01" step="0.01" value="0.25"></div></div>' +
      '<div class="button-grid"><button type="button" id="btnMovingCraneRailFEM" class="btn secondary">اجرای جاروب قطار چرخ متحرک</button></div>' +
      '<div id="craneRunwayRailMovingResult" class="notice">پوش بار متحرک هنوز محاسبه نشده است.</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="modelPurlinSpacing">فاصله پرلین‌های سقف (m)</label><input id="modelPurlinSpacing" type="number" min="0.3" step="0.05" value="0.95"></div>' +
      '<div class="field"><label for="modelRoofOverhang">پیش‌آمدگی عرضی سقف از لبه رفتر (m)</label><input id="modelRoofOverhang" type="number" min="0" step="0.05" value="0"></div>' +
      '<div class="field"><label for="modelEndOverhang">پیش‌آمدگی طولی سقف در دو انتهای سوله (m)</label><input id="modelEndOverhang" type="number" min="0" step="0.05" value="0"></div>' +
      '<div class="field"><label for="modelPurlinClipDeduction">کسر مجموع دو انتهای کلیپس از طول برش هر پرلین (m)</label><input id="modelPurlinClipDeduction" type="number" min="0" step="0.005" value="0"></div>' +
      '<div class="field"><label for="modelPurlinAssemblyGap">لقی مونتاژ کل هر قطعه پرلین (m)</label><input id="modelPurlinAssemblyGap" type="number" min="0" step="0.005" value="0"></div>' +
      '<div class="field"><label for="modelGirtSpacing">فاصله قیدهای افقی دیوار (m)</label><input id="modelGirtSpacing" type="number" min="0.3" step="0.05" value="3.00"></div>' +
      '<div class="field"><label for="modelEndPostSpacing">فاصله ستونک‌های دیوار انتهایی (m)</label><input id="modelEndPostSpacing" type="number" min="1" step="0.1" value="4.00"></div>' +
      '<div class="field"><label for="modelBraceBays">تعداد دهانه مهاربندی در ابتدا و انتها</label><input id="modelBraceBays" type="number" min="0" step="1" value="1"></div></div>' +
      '<div class="button-grid"><button type="button" id="btnBuildFullModel" class="btn primary">تولید و ترسیم تمام اجزای سوله</button><button type="button" id="btnCheck3DSections" class="btn secondary">بررسی آمادگی مقاطع تحلیل سه‌بعدی</button><button type="button" id="btnAuditFreshModel" class="btn secondary">ممیزی هندسه تازه‌ساخته و مسیر بار</button></div>' +
      '<div id="freshModelAuditResult" class="notice">پس از تولید مدل، پیوستگی گابل، گرت‌های انتهایی، مسیر باد طولی و سلامت اتصال گره‌ها روی همین مدل ممیزی می‌شود.</div>' +
      '<div id="modelProgress" class="model-progress" hidden aria-live="polite"><div class="model-progress-head"><strong id="modelProgressText">در حال آماده‌سازی…</strong><span id="modelProgressElapsed">۰٫۰ ثانیه</span></div><div class="model-progress-track"><span></span></div><small>حل ماتریس در پردازشگر پس‌زمینه انجام می‌شود؛ نوار پیشرفت و زمان‌سنج باید در طول تحلیل فعال بمانند.</small></div>' +
      '<div id="fullModelSummary" class="notice">مدل کامل هنوز تولید نشده است.</div>' +
      '<div id="fullModel3DReadiness" class="notice">آمادگی تحلیل سه‌بعدی هنوز بررسی نشده است.</div>' +
      '<hr><h4>تحلیل واقعی سه‌بعدی مدل</h4>' +
      '<div class="form-grid"><div class="field"><label for="model3DLoadCase">حالت بار برای تحلیل آزمایشی</label><select id="model3DLoadCase"><option value="dead">بار مرده</option><option value="live">بار زنده</option><option value="snow">بار برف</option><option value="wind">باد ـ فشار خالص ورودی</option><option value="combo0">ترکیب ULS-1: 1.4D</option><option value="combo1">ترکیب ULS-2: 1.2D+1.6L+0.5S</option><option value="combo2">ترکیب ULS-3: 1.2D+1.6S+0.5L</option></select></div></div>' +
      '<div class="button-grid"><button type="button" id="btnRunFull3D" class="btn success">اجرای تحلیل سه‌بعدی کل سوله</button><button type="button" id="btnRunAll3DCombinations" class="btn primary">تحلیل سه‌بعدی همه ترکیبات بار</button><button type="button" id="btnDownload3DCombinationBatch" class="btn secondary" disabled>دانلود گزارش همه ترکیبات</button><button type="button" id="btnSolverSelfTest" class="btn secondary">آزمون صحت هسته تحلیل</button><button type="button" id="btnTieBeamIntegrationTest" class="btn secondary">آزمون یکپارچگی شناژ</button><button type="button" id="btnTestSpan10" class="btn secondary">آزمایش مقایسه‌ای دهانه ۱۰ متر</button><button type="button" id="btnDownloadSpanTest" class="btn secondary" disabled>دانلود گزارش آزمایش دهانه</button><button type="button" id="btnDownloadTaperedForceDiagrams" class="btn secondary" disabled>دانلود نمودار نیروهای قطعات متغیرمقطع</button></div>' +
      '<div id="fullModel3DResult" class="notice">تحلیل سه‌بعدی هنوز اجرا نشده است.</div>' +
      '<div id="criticalRafterDiagram" class="notice" style="margin-top:12px;overflow:hidden">پس از اجرای تحلیل، محل قطعه رفتر متصل به گره بحرانی و مقطع شماتیک تیرورق در این قسمت نمایش داده می‌شود.</div>';
    drawingPanel.parentNode.insertBefore(panel, drawingPanel);
    $("btnAuditFreshModel").addEventListener("click", function () {
      const box=$("freshModelAuditResult");
      try {
        const fresh=build();draw();showSummary();
        if(!window.SteelFreshModelStructuralAudit?.audit)throw new Error("ماژول ممیزی مدل تازه‌ساخته‌شده بارگذاری نشده است.");
        const report=window.SteelFreshModelStructuralAudit.audit(fresh,window.SteelLoads?.getData?.()||{});
        window.SteelStructuralModel.lastFreshModelAudit=report;
        box.textContent="ممیزی مدل بازسازی‌شده در "+(report.generatedAt||"زمان نامشخص")+"\n"+
          "گره‌ها: "+report.inventory.nodeCount+" | اعضا: "+report.inventory.memberCount+" | گرت انتهایی: "+report.inventory.endGirtCount+" | مهاربند سقف/دیوار: "+report.inventory.roofBraceCount+"/"+report.inventory.wallBraceCount+"\n"+
          "سلامت هندسه: "+(report.geometryIntegrity.success?"موفق":"ناقص")+" | گابل: "+(report.gableTopology?.success?"موفق":"ناقص")+" | ممیزی کل مسیر بار: "+(report.wholeBuilding?.success?"موفق":"ناقص")+" | باد طولی: "+(report.longitudinalBracing?.applicable?(report.longitudinalBracing.success?"مسیر توپولوژیک برقرار":"مسیر ناقص"):"غیرفعال")+"\n"+
          "موارد مسدودکننده: "+report.issues.length+"\n"+report.issues.map((x,i)=>(i+1)+". "+x).join("\n")+"\n"+
          "این گزارش فقط ممیزی هندسه/مسیر بار است؛ سختی دیافراگم، ظرفیت اعضا و اتصالات یا تأیید طراحی را اثبات نمی‌کند.";
        box.style.color=report.success?"#166534":"#b45309";
      } catch(error) {box.textContent="ممیزی مدل تازه‌ساخته‌شده انجام نشد: "+error.message;box.style.color="#b45309";}
    });
    $("btnBuildFullModel").addEventListener("click", function () {
      runWithProgress("در حال تولید گره‌ها، قاب‌ها، پرلین‌ها و مهاربندها…", stage => {
        build(); draw(); showSummary();
        stage("ترسیم مدل و تکمیل خلاصه هندسی انجام شد.");
      }, e => { $("fullModelSummary").textContent = "خطا در تولید مدل سه‌بعدی: " + e.message + "؛ نمای دوبعدی قاب حفظ شد."; if(typeof originalDrawFrame==="function")originalDrawFrame(); });
    });
    $("btnSolverSelfTest").addEventListener("click", function () {
      const box=$("fullModel3DResult");
      try {
        const result=window.SteelFrame3D.selfTest();
        box.textContent="آزمون مستقل هسته تحلیل: "+result.passed+"/"+result.total+" موفق؛ ناموفق: "+result.failed+
          "\\n"+result.tests.map(t=>(t.ok?"✓ ":"✗ ")+t.name+(t.error?" — "+t.error:"")+
            (Number.isFinite(t.maxReleasedEndMomentNm)?" — بیشینه لنگر انتهای آزادشده: "+t.maxReleasedEndMomentNm.toFixed(6)+" N·m":"")).join("\\n")+
          "\\nاین آزمون‌ها کنترل پایه‌ای حل‌گرند و جایگزین اعتبارسنجی مستقل/آیین‌نامه‌ای نیستند.";
        box.style.color=result.failed===0?"#15803d":"#b45309";
      } catch(error) {
        box.textContent="اجرای آزمون هسته تحلیل ناموفق بود: "+error.message;
        box.style.color="#b45309";
      }
    });
    $("btnTieBeamIntegrationTest").addEventListener("click", function () {
      const box=$("fullModel3DResult");
      try {
        if(!window.SteelTieBeamIntegrationTest)throw new Error("آزمون یکپارچگی شناژ بارگذاری نشده است.");
        const r=window.SteelTieBeamIntegrationTest.run();
        box.textContent="آزمون مستقل اتصال شناژ: "+r.passed+"/"+r.total+" موفق؛ ناموفق: "+r.failed+
          "\\n"+r.cases.map(x=>(x.passed?"✓ ":"✗ ")+x.axis+" / "+x.joint+
            (x.error?" — "+x.error:" — واکنش قائم: "+x.verticalSupportReactionN.toFixed(2)+
            " N؛ وزن مورد انتظار: "+x.expectedSelfWeightN.toFixed(2)+" N؛ بیشینه لنگر انتهایی: "+
            x.maxTieEndBendingMomentNm.toFixed(5)+" N·m")).join("\\n")+
          "\\n"+r.note;
        box.style.color=r.failed===0?"#15803d":"#b45309";
      } catch(error) {
        box.textContent="آزمون شناژ ناموفق بود: "+error.message;
        box.style.color="#b45309";
      }
    });
    $("btnRunFull3D").addEventListener("click", function () {
      const box=$("fullModel3DResult");
      runWithProgress("مرحله ۱ از ۳: آماده‌سازی مدل هندسی…", async stage => {
      try {
        stage("مرحله ۱ از ۳: تولید و ترسیم مدل هندسی…");
        build(); draw(); showSummary();
        const lc=$("model3DLoadCase")?.value||"dead";
        stage("مرحله ۲ از ۳: مونتاژ ماتریس سختی و بارگذاری اعضا…");
        stage("مرحله ۳ از ۳: حل دستگاه معادلات سه‌بعدی؛ لطفاً صفحه را نبندید…");
        const result=await analyze3D(lc);
        let craneEnvelope=null;
        if(window.SteelCraneReadiness?.getData?.().enabled){
          if(!window.SteelCrane3DLoadTransfer?.analyzeAllFromUI)
            throw new Error("جرثقیل در پروژه فعال است اما هماهنگ‌کننده تحلیل خودکار جرثقیل بارگذاری نشده است.");
          stage("جرثقیل فعال است: آماده‌سازی و تحلیل موقعیت‌های متحرک قطار چرخ…");
          craneEnvelope=await window.SteelCrane3DLoadTransfer.analyzeAllFromUI({maxCases:300,onProgress:stage});
          if(!craneEnvelope?.success)
            throw new Error("تحلیل کامل جرثقیل انجام نشد؛ نتیجه تحلیل سوله به‌تنهایی کافی نیست: "+(craneEnvelope?.issues||["خطای نامشخص"]).join(" | "));
        }
        box.textContent="تحلیل سه‌بعدی با موفقیت حل شد. حالت بار: "+result.loadCaseLabel+
          " | گره‌ها: "+result.nodeCount+" | اعضا: "+result.memberCount+
          " | بیشینه جابه‌جایی انتقالی: "+(result.maxTranslation*1000).toFixed(3)+" میلی‌متر"+
          (result.taperedSegmentation&&result.taperedSegmentation.splitMemberCount?" | اعضای متغیرمقطع تقسیم‌شده: "+result.taperedSegmentation.splitMemberCount+"؛ قطعات تحلیل افزوده: "+result.taperedSegmentation.generatedSegmentCount+"؛ گره‌های میانی: "+result.taperedSegmentation.addedNodeCount:"")+
          (result.taperedMemberForceAudit?" | ممیزی نیروهای اعضای غیرمنشوری: "+result.taperedMemberForceAudit.physicalMemberCount+" عضو فیزیکی و "+result.taperedMemberForceAudit.analysisElementCount+" قطعه؛ وضعیت: "+result.taperedMemberForceAudit.status:"")+
          " | گره‌های دارای واکنش تکیه‌گاهی: "+result.reactions.length+
          (result.criticalDisplacement
            ? " | گره بحرانی: "+result.criticalDisplacement.nodeId+" ("+result.criticalDisplacement.kind+")"+
              " | مختصات X/Y/Z: "+[result.criticalDisplacement.coordinates.x,result.criticalDisplacement.coordinates.y,result.criticalDisplacement.coordinates.z].map(v=>v.toFixed(3)).join(" / ")+" متر"+
              " | جابه‌جایی ux/uy/uz: "+[result.criticalDisplacement.ux,result.criticalDisplacement.uy,result.criticalDisplacement.uz].map(v=>(v*1000).toFixed(3)).join(" / ")+" میلی‌متر"+
              " | اعضای متصل ("+result.criticalDisplacement.connectedMembers.length+"): "+result.criticalDisplacement.connectedMembers.map(m=>m.id+" ["+m.type+"]").join("، ")
            : " | اطلاعات گره بحرانی در دسترس نیست")+
          (result.selfWeight&&result.selfWeight.included?" | وزن خود اعضا (فولاد و بتن شناژ) افزوده‌شده: "+result.selfWeight.totalKN.toFixed(2)+" کیلونیوتن در "+result.selfWeight.memberCount+" عضو"+(result.selfWeight.bySectionGroup?" | تفکیک وزن گروه‌ها: "+Object.entries(result.selfWeight.bySectionGroup).map(([k,v])=>k+"="+v.totalKN.toFixed(2)+"kN، "+v.count+" عضو، "+v.lengthM.toFixed(1)+"m").join("؛ "):""):"")+
          (result.wallDeadLoadTransfer?" | وزن مرده پوسته دیوارها: "+Number(result.wallDeadLoadTransfer.totalWeightKN).toFixed(2)+" kN؛ ضریب D="+Number(result.wallDeadLoadTransfer.deadFactor).toFixed(3)+"؛ وزن اعمال‌شده در این حالت="+Number(result.wallDeadLoadTransfer.appliedWeightKN).toFixed(2)+" kN":"")+
          (result.wallDeadLoadTransfer?.memberLoadAudit?" | کنترل بار شناژ: "+(result.wallDeadLoadTransfer.memberLoadAudit.success?"موفق":"ناموفق")+"؛ اختلاف برآیند="+Number(result.wallDeadLoadTransfer.memberLoadAudit.weightDifferenceKN).toExponential(2)+" kN؛ لنگر بار دیوار حول مبدأ="+result.wallDeadLoadTransfer.memberLoadAudit.globalMomentAboutOriginKNm.map(v=>Number(v).toFixed(2)).join(" / ")+" kN·m":"")+
          (result.wallDeadLoadTransfer?.globalReactionEquilibrium?" | کنترل واکنش کلی: "+(result.wallDeadLoadTransfer.globalReactionEquilibrium.success?"موفق":"نیازمند بررسی")+"؛ این کنترل شامل تمام بارهای مدل است":"")+
          (result.gableWindEccentricTransfer?" | انتقال باد گابل با خروج از مرکزیت: "+result.gableWindEccentricTransfer.memberCount+" قطعه گرت و "+result.gableWindEccentricTransfer.nodalLoadCount+" گره بارگذاری‌شده؛ فقط در حالت‌های باد جهت‌دار":"")+
          (result.preparedMemberLoadAudit?" | ممیزی نهایی بار اعضا: "+result.preparedMemberLoadAudit.memberCount+" از "+result.memberCount+" عضو؛ بردار محلی/جهانی و دفتر بار صریح معتبر":" | ممیزی نهایی بار اعضا گزارش نشده")+
          (result.tieBeamIntegration?" | شناژهای واردشده به تحلیل: "+result.tieBeamIntegration.included.length+
            (result.tieBeamIntegration.included.length?" (وزن بتن فقط در حالت مرده/ترکیبات دارای D افزوده می‌شود)":"")+
            (result.tieBeamIntegration.skipped.length?" | مسیرهای شناژ ردشده: "+result.tieBeamIntegration.skipped.length:"")+
            (result.tieBeamIntegration.reinforcementWarnings.length?" | هشدار تکمیل‌نبودن جزئیات آرماتور: "+result.tieBeamIntegration.reinforcementWarnings.length:""):"")+
          (result.equilibrium?" | کنترل تعادل نیرو: "+(result.equilibrium.relativeForceResidual*100).toExponential(2)+"٪؛ تعادل لنگر: "+(result.equilibrium.relativeMomentResidual*100).toExponential(2)+"٪؛ "+(result.equilibrium.ok?"تعادل کلی برقرار":"هشدار: عدم تعادل کلی"):" | کنترل تعادل در دسترس نیست")+
          ". خودوزن فولاد با 78.5 و خودوزن شناژ با وزن مخصوص بتن ثبت‌شده محاسبه شده است؛ تحلیل خطی مرتبه اول است، P-Delta و کنترل کمانش در آن لحاظ نشده است. هر پرلین به‌صورت قطعه مستقل بین دو قاب مدل شده است؛ دوران‌های انتهایی هر قطعه از رفتر و از قطعه پرلین دهانه مجاور جدا هستند (فرض مفصل ایده‌آل). سختی واقعی کلیپس و پیچ‌ها، لغزش و خروج از صفحه هنوز مدل نشده و نتیجه تأیید طراحی یا کنترل آیین‌نامه‌ای نیست.";
        if(Array.isArray(result.criticalMemberReport)&&result.criticalMemberReport.length){
          const fmt=(v,factor=1,d=3)=>Number.isFinite(Number(v))?(Number(v)*factor).toFixed(d):"—";
          const lines=["","گزارش تشخیصی اعضای متصل به گره بحرانی:",
            "واحد نیرو: kN | واحد گشتاور: kN·m | مشخصات مقطع: A بر حسب cm² و ممان‌ها بر حسب cm⁴",
            "ترتیب نیروها در هر انتها: N، Vy، Vz، T، My، Mz"];
          result.criticalMemberReport.forEach((m,i)=>{
            const s=m.section||{},a=m.endI||{},b=m.endJ||{};
            lines.push((i+1)+") "+m.id+" — "+m.type+(m.profile?" — مقطع "+m.profile:"")+
              " — طول "+fmt(m.length,1,3)+" m");
            lines.push("   انتهای I: "+[a.N,a.Vy,a.Vz].map(v=>fmt(v,0.001)).join(" / ")+" kN؛ "+
              [a.T,a.My,a.Mz].map(v=>fmt(v,0.001)).join(" / ")+" kN·m");
            lines.push("   انتهای J: "+[b.N,b.Vy,b.Vz].map(v=>fmt(v,0.001)).join(" / ")+" kN؛ "+
              [b.T,b.My,b.Mz].map(v=>fmt(v,0.001)).join(" / ")+" kN·m");
            lines.push("   مقطع: A="+fmt(s.A,1e4,2)+" cm²؛ Iy="+fmt(s.Iy,1e8,2)+
              "؛ Iz="+fmt(s.Iz,1e8,2)+"؛ J="+fmt(s.J,1e8,2)+" cm⁴؛ E="+
              fmt(s.E,1e-9,2)+"؛ G="+fmt(s.G,1e-9,2)+" GPa");
          });
          lines.push("تذکر: این‌ها نیروهای انتهایی محلی عضو در تحلیل خطی فعلی‌اند؛ علامت‌ها مطابق قرارداد محلی حل‌گر است و به‌تنهایی کنترل مقاومت یا خیز آیین‌نامه‌ای محسوب نمی‌شوند.");
          box.textContent+="\n"+lines.join("\n");
        }else{
          box.textContent+="\nگزارش نیروهای اعضای بحرانی در دسترس نیست.";
        }
        if(result.taperedSectionForceDiagrams){
          const td=result.taperedSectionForceDiagrams;
          if(td.success){
            const summary=["","نمودار نیروهای قطعات متغیرمقطع: بازسازی مستقل هر قطعه و هر ترکیب بار با موفقیت انجام شد."];
            td.loadCases.forEach(c=>{
              summary.push("ترکیب "+c.label+":");
              c.members.forEach(m=>{
                summary.push("  عضو "+m.parentMemberId+" — طول "+Number(m.totalLength_m).toFixed(3)+" m — "+m.segmentCount+" قطعه");
                m.segments.forEach(s=>summary.push("    قطعه "+s.segmentIndex+" ("+s.segmentId+"): "+s.length_m.toFixed(3)+" m، "+s.stations.length+" ایستگاه؛ از "+s.startStation_m.toFixed(3)+" تا "+s.endStation_m.toFixed(3)+" m"));
              });
            });
            summary.push("فایل JSON شامل مقادیر کامل N، Vy، Vz، T، My و Mz در تمام ایستگاه‌ها با دکمه دانلود قابل دریافت است؛ این گزارش کنترل مقاومت یا تأیید طراحی نیست.");
            box.textContent+="\n"+summary.join("\n");
          }else{
            box.textContent+="\nنمودار نیروهای قطعات متغیرمقطع تولید نشد؛ اطلاعات بارگذاری/هندسه/تعادل کافی نیست: "+(td.issues||[]).slice(0,6).join("؛ ");
          }
        }
        if(craneEnvelope){
          box.textContent+="\n\nتحلیل خودکار جرثقیل سقفی: "+craneEnvelope.total+" موقعیت قطار چرخ جداگانه حل شد؛ موقعیت بحرانی نمونه‌برداری‌شده: "+craneEnvelope.results[craneEnvelope.criticalCase].referencePosition_m.toFixed(3)+" m؛ بیشینه تغییرمکان انتقالی در این مجموعه: "+(craneEnvelope.maxTranslation_m*1000).toFixed(3)+" mm؛ پوش نیروهای انتهایی اعضا برای "+(craneEnvelope.memberForceEnvelope?.cases?.length||0)+" موقعیت و "+(craneEnvelope.memberForceEnvelope?.rows?.length||0)+" عضو استخراج شد. بار مرده و وزن خود اعضا، بار چرخ با ضریب دینامیکی قائم "+Number(window.SteelCraneReadiness.getData().verticalImpact)+" و نیروهای افقی مستند (در صورت فعال بودن) منظور شده‌اند. این پوش، جایگزین ترکیبات کامل آیین‌نامه‌ای جرثقیل، خستگی یا طراحی نهایی تیر حمال و اتصالات نیست.";
        }
        box.style.color="#15803d";
        window.SteelStructuralModel.last3DResult=result;
        window.SteelStructuralModel.lastCraneEnvelope=craneEnvelope;
        const taperedDiagramButton=$("btnDownloadTaperedForceDiagrams");
        if(taperedDiagramButton)taperedDiagramButton.disabled=!result.taperedSectionForceDiagrams?.success;
        renderCriticalRafterDiagram(result,"تحلیل مدل اصلی");
      } catch(e) {
        box.textContent="تحلیل سه‌بعدی انجام نشد: "+e.message+
          "؛ این پیام برای جلوگیری از ارائه نتیجه نادرست نمایش داده شده است.";
        box.style.color="#b45309";
        window.SteelStructuralModel.last3DResult=null;
        const taperedDiagramButton=$("btnDownloadTaperedForceDiagrams");if(taperedDiagramButton)taperedDiagramButton.disabled=true;
      }
      }, e => {
        box.textContent = "تحلیل سه‌بعدی انجام نشد: " + e.message;
        box.style.color = "#b45309";
        window.SteelStructuralModel.last3DResult = null;
      });
    });
    $("btnRunAll3DCombinations")?.addEventListener("click",function(){
      const box=$("fullModel3DResult");
      runWithProgress("آماده‌سازی تحلیل مستقل همه ترکیبات بار…",async stage=>{
        try{
          build();draw();showSummary();
          const report=await analyzeAll3DCombinations({onProgress:stage});
          const lines=report.results.map(x=>(x.success?"✓ ":"✕ ")+x.label+
            " | تعادل: "+(x.equilibrium?.ok?"تأیید":"تأیید نشد")+
            (x.taperedDiagramSuccess?" | نمودار متغیرمقطع آماده":x.failure?" | "+x.failure:" | نمودار متغیرمقطع در دسترس نیست"));
          if(box){box.textContent="گزارش تحلیل مستقل ترکیبات بار: "+report.passed+" موفق از "+report.combinationCount+"؛ "+report.failed+" ناموفق.\\n"+lines.join("\\n");box.style.color=report.failed===0?"#15803d":"#b45309";}
          const download=$("btnDownload3DCombinationBatch");if(download)download.disabled=report.passed===0;
        }catch(error){
          if(box){box.textContent="تحلیل همه ترکیبات انجام نشد: "+String(error?.message||error);box.style.color="#b45309";}
          const download=$("btnDownload3DCombinationBatch");if(download)download.disabled=true;
        }
      });
    });
    $("btnDownload3DCombinationBatch")?.addEventListener("click",function(){
      const report=window.SteelStructuralModel?.last3DCombinationBatch;
      if(!report)return;
      const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="sahroud-steel-3d-all-load-combinations.json";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    $("btnDownloadTaperedForceDiagrams")?.addEventListener("click",function(){
      const report=window.SteelStructuralModel?.last3DResult?.taperedSectionForceDiagrams;
      if(!report?.success)return;
      const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="sahroud-steel-tapered-member-force-diagrams.json";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    $("btnTestSpan10").addEventListener("click", function () {
      runWithProgress("در حال آماده‌سازی آزمایش مقایسه‌ای دهانه ۱۰ متر…", async stage => {
      const box=$("fullModel3DResult"), spanField=$("span"), riseField=$("rise");
      stage("تغییر موقت هندسه و تولید مدل آزمایشی…");
      const originalSpan=Number(spanField?.value), originalRise=Number(riseField?.value);
      try {
        const analysisModelMemberById=id=>(window.SteelStructuralModel?.model?.members||[]).find(x=>x.id===id)||null;
        if(!spanField||!Number.isFinite(originalSpan)||originalSpan<=0) throw new Error("دهانه فعلی معتبر نیست.");
        spanField.value="10";
        if(typeof window.updateRoofGeometry==="function") window.updateRoofGeometry();
        build(); draw(); showSummary();
        stage("حل مدل سه‌بعدی دهانه ۱۰ متر و استخراج نتایج…");
        const result=await analyze3D("dead");
        const critical=result.criticalDisplacement||null;
        const report={
          test:"مقایسه دهانه ۱۰ متر با بار مرده",
          originalSpanM:originalSpan,
          testedSpanM:10,
          lengthM:Number($("length")?.value),
          frameSpacingM:Number($("spacing")?.value),
          columnHeightM:Number($("height")?.value),
          roofSlopePercent:20,
          loadCase:"dead",
          geometry:{
            spanM:Number($("span")?.value),
            lengthM:Number($("length")?.value),
            frameSpacingM:Number($("spacing")?.value),
            columnHeightM:Number($("height")?.value),
            riseM:Number($("rise")?.value),
            roofSlopePercent:(Number($("rise")?.value)/(Number($("span")?.value)/2))*100,
            roofPurlinSpacingM:Number($("modelPurlinSpacing")?.value),
            wallGirtSpacingM:Number($("modelGirtSpacing")?.value),
            braceBays:Number($("modelBraceBays")?.value)
          },
          loadInputs:window.SteelLoads?.getData?.()||null,
          purlinFabricationSchedule:(()=>{
            const pieces=(window.SteelStructuralModel?.model?.members||[]).filter(x=>x.sectionKey==="roofPurlin"&&x.fabricationRecord);
            return {pieceCount:pieces.length,clipDeductionM:pieces[0]?.clipDeductionM??0,assemblyGapM:pieces[0]?.assemblyGapM??0,
              pieces:pieces.map(x=>({id:x.id,side:x.side,row:x.row,bay:x.bay,supportAxisLengthM:x.supportAxisLengthM,frontOverhangM:x.frontOverhangM||0,rearOverhangM:x.rearOverhangM||0,fabricationLengthM:x.fabricationLengthM}))};
          })(),
          supportType:result.supportType||null,
          nodeCount:result.nodeCount,
          memberCount:result.memberCount,
          maxTranslationMm:result.maxTranslation*1000,
          criticalNode:critical?{
            id:critical.nodeId,kind:critical.kind,
            coordinatesM:critical.coordinates,
            displacementMm:{ux:critical.ux*1000,uy:critical.uy*1000,uz:critical.uz*1000},
            connectedMembers:critical.connectedMembers
          }:null,
          selfWeight:result.selfWeight||null,
          equilibrium:result.equilibrium||null,
          criticalMemberDiagnostics:result.criticalMemberDiagnostics||null,
          criticalJointEquilibrium:result.criticalJointEquilibrium||null,
          criticalRafterContinuity:(critical?(()=>{
            const linked=(critical.connectedMembers||[]).filter(m=>m.sectionKey==="rafter");
            return {nodeId:critical.nodeId,memberCount:linked.length,allShareCriticalNode:linked.every(m=>m.start===critical.nodeId||m.end===critical.nodeId),
              members:linked.map(m=>{const source=analysisModelMemberById(m.id);return {id:m.id,start:source?.start||null,end:source?.end||null,lengthM:source?.length||null,sectionKey:source?.sectionKey||null};}),
              note:"کنترل اشتراک شناسه گره در مدل هندسی است؛ به‌تنهایی جایگزین کنترل سختی اتصال یا صحت مدل نیست."};
          })():null),
          criticalMemberReport:(result.criticalMemberReport||[]).map(m=>{
            const source=analysisModelMemberById(m.id);
            return {...m,
              start:source?.start||null,end:source?.end||null,
              lineLoads:source?.lineLoads||null,
              analysisLoad:m.analysisLoad||source?.analysisLoad||null,
              localAxes:m.localAxes||null
            };
          }),
          generatedAt:new Date().toISOString(),
          note:"تحلیل خطی مقدماتی است؛ نتیجه جایگزین کنترل آیین‌نامه‌ای، بررسی اتصالات و پایداری نیست."
        };
        window.SteelStructuralModel.lastSpanComparison=report;
        renderCriticalRafterDiagram(result,"آزمایش دهانه ۱۰ متر");
        window.dispatchEvent(new CustomEvent("sahroud:span-report-ready",{detail:report}));
        $("btnDownloadSpanTest").disabled=false;
        const eq=result.equilibrium||{};
        box.textContent="آزمایش دهانه ۱۰ متری با موفقیت حل شد؛ دهانه اصلی "+originalSpan.toFixed(2)+
          " متر و دهانه آزمایشی ۱۰٫۰۰ متر است. گره‌ها: "+result.nodeCount+
          " | اعضا: "+result.memberCount+
          " | بیشینه جابه‌جایی: "+(result.maxTranslation*1000).toFixed(3)+" میلی‌متر"+
          (critical?" | گره بحرانی: "+critical.nodeId+" | مختصات: "+
            [critical.coordinates.x,critical.coordinates.y,critical.coordinates.z].map(v=>v.toFixed(3)).join(" / ")+" متر":"")+
          (eq.relativeForceResidual!==undefined?" | خطای تعادل نیرو: "+(eq.relativeForceResidual*100).toExponential(2)+"٪":"")+
          (eq.relativeMomentResidual!==undefined?" | خطای تعادل لنگر: "+(eq.relativeMomentResidual*100).toExponential(2)+"٪":"")+
          " | گزارش کامل JSON آماده دانلود است. پس از آزمایش، هندسه اصلی به دهانه قبلی بازگردانده شد.";
        box.style.color="#15803d";
      } catch(e) {
        box.textContent="آزمایش دهانه ۱۰ متری انجام نشد: "+e.message;
        box.style.color="#b45309";
        window.SteelStructuralModel.lastSpanComparison=null;
        $("btnDownloadSpanTest").disabled=true;
      } finally {
        if(spanField) spanField.value=String(originalSpan);
        if(riseField) riseField.value=String(originalRise);
        if(typeof window.updateRoofGeometry==="function") window.updateRoofGeometry();
        try { build(); draw(); showSummary(); } catch(_) {}
      }
      stage("آزمایش پایان یافت و هندسه اصلی بازگردانده شد.");
      }, e => {
        const box=$("fullModel3DResult");
        if (box) { box.textContent="آزمایش دهانه ۱۰ متری انجام نشد: "+e.message; box.style.color="#b45309"; }
      });
    });
    $("btnDownloadSpanTest").addEventListener("click", function () {
      const report=window.SteelStructuralModel?.lastSpanComparison;
      if(!report) return;
      const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="sahroud-steel-span-10m-test.json";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    });



    $("btnMovingCraneRailFEM")?.addEventListener("click", function () {
      const box=$("craneRunwayRailMovingResult");if(!box)return;
      try {
        build();const g=model.geometry,runway=g.craneRunway||{},layout=runway.railLayoutInputs||{},layoutAudit=runway.railLayoutAudit||{};
        if(!runway.enabled)throw Error("ابتدا وجود جرثقیل سقفی را فعال کنید.");
        if(!layoutAudit.ready)throw Error("ابتدا ممیزی مدل طولی ریل را کامل کنید.");
        const common=parseRunwayRailSupportInputs(readRunwayRailFEMInputs(),layoutAudit.supportStations||[]),moving=parseRunwayRailMovingInputs(readRunwayRailFEMInputs());
        const input={length_m:g.length,E_MPa:layout.E_MPa,Ix_mm4:layout.Ix_mm4,propertySource:layout.propertySource,continuity:layout.continuity,jointPositions_m:layoutAudit.jointPositions_m||[],supportStations_m:layoutAudit.supportStations||[],verticalSpringStiffness_N_m:common.verticalSpringStiffness_N_m,supportStiffnessSource:common.supportStiffnessSource,step_m:moving.step_m,wheels:moving.wheels};
        const result=window.SteelRailBeamFEM?.movingLoadEnvelope?.(input);if(!result)throw Error("تابع جاروب بار متحرک در حل‌گر موجود نیست.");box.textContent=JSON.stringify(result,null,2);box.style.color=result.success?"#166534":"#b45309";
      } catch(e) {box.textContent="جاروب بار متحرک اجرا نشد: "+e.message;box.style.color="#b45309";}
    });
    $("btnRailFEMSelfTest")?.addEventListener("click", function () {
      const box=$("craneRunwayRailFEMResult");if(!box)return;
      try {const result=window.SteelRailBeamFEM?.selfTest?.();if(!result)throw Error("ماژول آزمون حل‌گر ریل بارگذاری نشده است.");box.textContent="آزمون نرم‌افزاری حل‌گر ریل: "+result.passed+"/"+result.total+" موفق؛ ناموفق: "+result.failed+"\\n"+result.tests.map(t=>(t.ok?"✓ ":"✗ ")+t.name+(t.error?" — "+t.error:"")).join("\\n")+"\\nاین آزمون‌ها جایگزین اعتبارسنجی مستقل مهندسی نیستند.";box.style.color=result.failed===0?"#166534":"#b45309";}
      catch(e){box.textContent="اجرای آزمون حل‌گر ریل ناموفق بود: "+e.message;box.style.color="#b45309";}
    });
    $("btnAnalyzeCraneRailFEM")?.addEventListener("click", function () {
      const box=$("craneRunwayRailFEMResult");if(!box)return;
      try {
        build();const g=model.geometry,runway=g.craneRunway||{},layout=runway.railLayoutInputs||{},layoutAudit=runway.railLayoutAudit||{};
        if(!runway.enabled)throw Error("ابتدا وجود جرثقیل سقفی را در بخش اطلاعات جرثقیل فعال کنید.");
        if(!layoutAudit.ready)throw Error("ابتدا ممیزی مدل طولی ریل را کامل کنید: "+[...(layoutAudit.missing||[]),...(layoutAudit.invalid||[]),...(layoutAudit.dimensional||[])].join("؛ "));
        const parsed=parseRunwayRailFEMInputs(readRunwayRailFEMInputs(),layoutAudit.supportStations||[]);
        const input={length_m:g.length,E_MPa:layout.E_MPa,Ix_mm4:layout.Ix_mm4,propertySource:layout.propertySource,continuity:layout.continuity,jointPositions_m:layoutAudit.jointPositions_m||[],supportStations_m:layoutAudit.supportStations||[],verticalSpringStiffness_N_m:parsed.verticalSpringStiffness_N_m,supportStiffnessSource:parsed.supportStiffnessSource,pointLoads:parsed.pointLoads};
        const result=analyzeCraneRail(input);box.textContent=JSON.stringify(result,null,2);box.style.color=result.success&&result.equilibrium?.ok?"#166534":"#b45309";
      } catch(e) {box.textContent="تحلیل اجرا نشد: "+e.message;box.style.color="#b45309";}
    });
    $("btnCheck3DSections").addEventListener("click", function () {
      runWithProgress("در حال ساخت مدل و کنترل مشخصات مقاطع…", stage => {
      try {
        build();
        stage("در حال بررسی سطح مقطع، ممان‌های اینرسی، پیچش و مدول‌های مصالح…");
        const result=validate3DSections();
        const box=$("fullModel3DReadiness");
        box.textContent=result.ready
          ? "مقاطع همه گروه‌ها از نظر کامل بودن A، Iy، Iz، J، E و G دارای ورودی معتبرند. این فقط کنترل تکمیل ورودی است؛ هنوز تحلیل بارگذاری‌شده و کنترل آیین‌نامه‌ای انجام نشده است."
          : "تحلیل سه‌بعدی فعلاً مجاز نیست. گروه‌های ناقص: " + result.missing.map(x=>x.label+" ("+x.count+" عضو): "+x.reason).join(" | ");
        box.style.color=result.ready?"#15803d":"#b45309";
      } catch(e) { $("fullModel3DReadiness").textContent="خطا در بررسی: "+e.message; }
      }, e => { $("fullModel3DReadiness").textContent = "خطا در بررسی: " + e.message; });
    });
      let modelRefreshTimer=null;
  function refreshModelAfterInput(){
    if(modelRefreshTimer)clearTimeout(modelRefreshTimer);
    modelRefreshTimer=setTimeout(()=>{
      modelRefreshTimer=null;
      try{
        build();draw();showSummary();
        const crane=model?.geometry?.craneRunway;
        if(!crane)return;
        const renderAudit=(id,title,a,readyText)=>{const box=$(id);if(!box)return;box.textContent=title+": "+(a?.ready?readyText:"ناقص/نیازمند اصلاح — "+[...(a?.missing||[]),...(a?.invalid||[]),...(a?.dimensional||[])].join("؛ "));};
        renderAudit("craneRunwaySectionAudit","ممیزی مشخصات",crane.sectionAudit,"اطلاعات اولیه کامل است؛ طراحی هنوز انجام نشده");
        renderAudit("craneRunwayWebAudit","ممیزی جان و سخت‌کننده",crane.webAudit,"اطلاعات کامل؛ کنترل ظرفیت انجام نشده");
        renderAudit("craneRunwayLoadPathAudit","ممیزی مسیر بار ریل و چرخ",crane.loadPathAudit,"ابعاد اولیه کامل؛ ظرفیت/توزیع بار محاسبه نشده");
        renderAudit("craneRunwayFasteningAudit","ممیزی بست و پد",crane.fasteningAudit,"اطلاعات اولیه کامل؛ ظرفیت و توزیع نیرو محاسبه نشده");
        renderAudit("craneRunwayRailLayoutAudit","ممیزی مدل طولی ریل",crane.railLayoutAudit,"ورودی‌های اولیه کامل؛ تحلیل تیر ریل هنوز غیرفعال");
      }catch(error){console.error("به‌روزرسانی مدل هندسی:",error);}
    },180);
  }
  ["span","length","spacing","height","rise","modelPurlinSpacing","modelGirtSpacing","modelEndPostSpacing","modelBraceBays","craneRunwayAxisOffset","craneRunwaySupportType",...Object.values(RUNWAY_SECTION_FIELD_IDS),...Object.values(RUNWAY_STIFFENER_FIELD_IDS),...Object.values(RUNWAY_LOAD_PATH_FIELD_IDS),...Object.values(RUNWAY_FASTENING_FIELD_IDS),...Object.values(RUNWAY_RAIL_LAYOUT_FIELD_IDS),"craneRunwayRailSupportStiffness","craneRunwayRailSupportStiffnessSource","craneRunwayRailWheelLoads","craneRunwayRailMovingTrain","craneRunwayRailMovingStep"].forEach(id=>$(id)?.addEventListener("change",refreshModelAfterInput));
  }
  function val(id, fallback) { const e=$(id), n=e?Number(e.value):fallback; return Number.isFinite(n)?n:fallback; }
  // مختصات گره‌ها با هش فضایی جست‌وجو می‌شوند؛ جست‌وجوی خطی قبلی در کل آرایه
  // هنگام ساخت مدل‌های بزرگ، زمان ساخت را به‌صورت درجه‌دو افزایش می‌داد.
  const nodeSpatialIndexes = new WeakMap();
  function addNode(nodes,x,y,z,kind) {
    let index=nodeSpatialIndexes.get(nodes);
    if(!index){index=new Map();nodeSpatialIndexes.set(nodes,index);}
    const q=1e-7,ix=Math.round(x/q),iy=Math.round(y/q),iz=Math.round(z/q);
    let old=null;
    for(let dx=-1;dx<=1&&!old;dx++)for(let dy=-1;dy<=1&&!old;dy++)for(let dz=-1;dz<=1&&!old;dz++){
      const bucket=index.get((ix+dx)+","+(iy+dy)+","+(iz+dz));
      if(!bucket)continue;
      old=bucket.find(n=>Math.abs(n.x-x)<q&&Math.abs(n.y-y)<q&&Math.abs(n.z-z)<q)||null;
    }
    if(old){if(kind==="roof-edge")old.kind="roof-edge";return old;}
    const n={id:"N"+(nodes.length+1),x,y,z,kind:kind||"joint"};nodes.push(n);
    const key=ix+","+iy+","+iz, bucket=index.get(key)||[];
    bucket.push(n);index.set(key,bucket);return n;
  }
  function addMember(members,a,b,type,sectionKey,extra) {
    members.push({id:type.toUpperCase().replace(/[^A-Z0-9]+/g,"_")+"_"+(members.length+1),start:a.id,end:b.id,type,sectionKey:sectionKey||"unassigned",length:Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),...(extra||{})});
  }
  function exactMemberSegmentCount(members,sectionKey,axis,frame,a,b){
    return (members||[]).filter(m=>m.sectionKey===sectionKey&&m.axis===axis&&m.frame===frame&&
      ((m.start===a.id&&m.end===b.id)||(m.start===b.id&&m.end===a.id))).length;
  }
  function countRafterPaths(members,frame,startId,endId){
    const graph=new Map();
    (members||[]).filter(m=>m.sectionKey==="rafter"&&m.axis==="transverse"&&m.frame===frame).forEach(m=>{
      if(!graph.has(m.start))graph.set(m.start,[]);if(!graph.has(m.end))graph.set(m.end,[]);
      graph.get(m.start).push(m.end);graph.get(m.end).push(m.start);
    });
    let count=0;
    const visit=(node,seen)=>{
      if(count>=2)return;
      if(node===endId){count++;return;}
      (graph.get(node)||[]).forEach(next=>{if(!seen.has(next)){const n=new Set(seen);n.add(next);visit(next,n);}});
    };
    visit(startId,new Set([startId]));
    return count;
  }
  function auditPurlinRafterConnectivity(nodes,members,frameStations){
    const nodeById=new Map((nodes||[]).map(n=>[n.id,n]));
    const rafters=(members||[]).filter(m=>m.sectionKey==="rafter");
    const edgeMembers=(members||[]).filter(m=>m.sectionKey==="roofEdge");
    const purlins=(members||[]).filter(m=>m.sectionKey==="roofPurlin");
    const issues=[],checked=[];
    const tol=1e-6;
    purlins.forEach(p=>{
      [p.start,p.end].forEach(nodeId=>{
        const n=nodeById.get(nodeId);
        if(!n){issues.push({memberId:p.id,nodeId,reason:"missing-purlin-end-node"});return;}
        const frameIndex=(frameStations||[]).findIndex(z=>Math.abs(z-n.z)<=tol);
        if(frameIndex>=0){
          const supportCount=rafters.filter(r=>r.start===nodeId||r.end===nodeId).length;
          if(supportCount<1)issues.push({memberId:p.id,nodeId,frameIndex,reason:"purlin-support-not-shared-with-rafter"});
          checked.push({memberId:p.id,nodeId,kind:"frame",frameIndex,rafterIncidence:supportCount});
        }else{
          const edgeCount=edgeMembers.filter(r=>r.start===nodeId||r.end===nodeId).length;
          if(edgeCount<1)issues.push({memberId:p.id,nodeId,reason:"purlin-overhang-tail-not-connected-to-roof-edge"});
          checked.push({memberId:p.id,nodeId,kind:"overhang",roofEdgeIncidence:edgeCount});
        }
      });
    });
    return {ok:issues.length===0,checkedEndCount:checked.length,purlinCount:purlins.length,issues,checked};
  }
  function runwayColumnLevels(baseY,girtHeights,eaveY,runwayY,enabled){
    const values=[baseY,...girtHeights,eaveY];
    if(enabled){
      if(!(Number.isFinite(runwayY)&&runwayY>baseY+1e-7&&runwayY<eaveY-1e-7))
        throw new Error("تراز ریل جرثقیل باید بالاتر از کف ستون و پایین‌تر از تراز کنج باشد؛ گره تراز ریل ساخته نشد.");
      values.push(runwayY);
    }
    const sorted=values.sort((a,b)=>a-b).filter((y,i,a)=>i===0||Math.abs(y-a[i-1])>1e-7);
    return sorted.map(y=>({y,kind:enabled&&Math.abs(y-runwayY)<=1e-7?"runway-support":(Math.abs(y-baseY)<=1e-7?"base":(Math.abs(y-eaveY)<=1e-7?"eave":"column-girt-joint"))}));
  }
  const RUNWAY_SECTION_FIELD_IDS={girderType:"craneRunwayGirderType",steelGrade:"craneRunwaySteelGrade",overallDepth_mm:"craneRunwayOverallDepth",flangeWidth_mm:"craneRunwayFlangeWidth",flangeThickness_mm:"craneRunwayFlangeThickness",webThickness_mm:"craneRunwayWebThickness",railDesignation:"craneRunwayRailDesignation",railMass_kg_m:"craneRunwayRailMass",railFastening:"craneRunwayRailFastening",stiffenerSpacing_m:"craneRunwayStiffenerSpacing",lateralRestraint:"craneRunwayLateralRestraint",detailSource:"craneRunwayDetailSource"};
  function readRunwaySectionInputs(){const out={};Object.entries(RUNWAY_SECTION_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["overallDepth_mm","flangeWidth_mm","flangeThickness_mm","webThickness_mm","railMass_kg_m","stiffenerSpacing_m"].includes(key)?Number(raw):raw;});return out;}
  const RUNWAY_STIFFENER_FIELD_IDS={endStiffenerType:"craneRunwayEndStiffenerType",intermediateStiffenerType:"craneRunwayIntermediateStiffenerType",stiffenerWidth_mm:"craneRunwayStiffenerWidth",stiffenerThickness_mm:"craneRunwayStiffenerThickness",stiffenerWeldSize_mm:"craneRunwayStiffenerWeldSize",bearingLength_mm:"craneRunwayBearingLength",wheelLoadOffset_mm:"craneRunwayWheelLoadOffset",stiffenerSource:"craneRunwayStiffenerSource"};
  function readRunwayStiffenerInputs(){const out={};Object.entries(RUNWAY_STIFFENER_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["stiffenerWidth_mm","stiffenerThickness_mm","stiffenerWeldSize_mm","bearingLength_mm","wheelLoadOffset_mm"].includes(key)?Number(raw):raw;});return out;}
  const RUNWAY_LOAD_PATH_FIELD_IDS={railHeight_mm:"craneRunwayRailHeight",railBaseWidth_mm:"craneRunwayRailBaseWidth",railFootThickness_mm:"craneRunwayRailFootThickness",railPadThickness_mm:"craneRunwayRailPadThickness",fasteningSpacing_mm:"craneRunwayFasteningSpacing",wheelContactWidth_mm:"craneRunwayWheelContactWidth",wheelContactLength_mm:"craneRunwayWheelContactLength",loadPathSource:"craneRunwayLoadPathSource"};
  function readRunwayLoadPathInputs(){const out={};Object.entries(RUNWAY_LOAD_PATH_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["railHeight_mm","railBaseWidth_mm","railFootThickness_mm","railPadThickness_mm","fasteningSpacing_mm","wheelContactWidth_mm","wheelContactLength_mm"].includes(key)?Number(raw):raw;});return out;}
  const RUNWAY_FASTENING_FIELD_IDS={fasteningType:"craneRunwayFasteningType",fasteningModel:"craneRunwayFasteningModel",clampsPerStation:"craneRunwayClampsPerStation",boltsPerClamp:"craneRunwayBoltsPerClamp",boltGrade:"craneRunwayBoltGrade",boltDiameter_mm:"craneRunwayBoltDiameter",seatPlateWidth_mm:"craneRunwayRailSeatPlateWidth",seatPlateLength_mm:"craneRunwayRailSeatPlateLength",seatPlateThickness_mm:"craneRunwayRailSeatPlateThickness",padMaterial:"craneRunwayPadMaterial",padHardness_ShoreA:"craneRunwayPadHardness",padCompressionModulus_MPa:"craneRunwayPadModulus",railWeldSize_mm:"craneRunwayRailWeldSize",detailSource:"craneRunwayFasteningDetailSource"};
  function readRunwayFasteningInputs(){const out={};Object.entries(RUNWAY_FASTENING_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["clampsPerStation","boltsPerClamp","boltDiameter_mm","seatPlateWidth_mm","seatPlateLength_mm","seatPlateThickness_mm","padHardness_ShoreA","padCompressionModulus_MPa","railWeldSize_mm"].includes(key)?Number(raw):raw;});return out;}
  function auditRunwayFasteningDetail(loadPath,detail){
    loadPath=loadPath||{};detail=detail||{};
    const required=["fasteningType","seatPlateWidth_mm","seatPlateLength_mm","seatPlateThickness_mm","padMaterial","padHardness_ShoreA","detailSource"];
    const missing=required.filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    if(["clip","bolted"].includes(detail.fasteningType))["fasteningModel","clampsPerStation","boltsPerClamp","boltGrade","boltDiameter_mm"].forEach(k=>{if(detail[k]===undefined||detail[k]===null||detail[k]==="")missing.push(k);});
    if(detail.fasteningType==="welded"&&(detail.railWeldSize_mm===undefined||detail.railWeldSize_mm===""))missing.push("railWeldSize_mm");
    const numeric=["seatPlateWidth_mm","seatPlateLength_mm","seatPlateThickness_mm","padHardness_ShoreA","padCompressionModulus_MPa","clampsPerStation","boltsPerClamp","boltDiameter_mm","railWeldSize_mm"];
    const invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||detail[k]<=0));
    if(detail.padHardness_ShoreA!==undefined&&Number.isFinite(detail.padHardness_ShoreA)&&detail.padHardness_ShoreA>100)invalid.push("padHardness_ShoreA_out_of_range");
    const dimensional=[];
    if(Number.isFinite(loadPath.railBaseWidth_mm)&&Number.isFinite(detail.seatPlateWidth_mm)&&detail.seatPlateWidth_mm<loadPath.railBaseWidth_mm)dimensional.push("عرض ورق زیرسری از عرض کف ریل کمتر است؛ آرایش نشیمن باید بازبینی شود.");
    if(Number.isFinite(loadPath.railPadThickness_mm)&&loadPath.railPadThickness_mm<=0)dimensional.push("ضخامت پد زیر ریل باید مثبت باشد.");
    if(detail.fasteningType==="other")dimensional.push("نوع اتصال «سایر» است؛ جزئیات اختصاصی باید توسط طراح بررسی و تعریف شود.");
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,analysisEnabled:false,note:"این ممیزی ظرفیت پیچ/گیره/جوش، لغزش و بلندشدگی ریل، فشار و سختی پد، خمش ورق زیرسری یا سهم نیروی هر بست را محاسبه نمی‌کند. فاصله بست‌ها به‌تنهایی مجوز تقسیم یکنواخت بار چرخ نیست."};
  }
  const RUNWAY_RAIL_LAYOUT_FIELD_IDS={supportPitch_m:"craneRunwayRailSupportPitch",firstSupportOffset_m:"craneRunwayRailFirstSupportOffset",continuity:"craneRunwayRailContinuity",jointPositions_m:"craneRunwayRailJointPositions",Ix_mm4:"craneRunwayRailIx",Iy_mm4:"craneRunwayRailIy",J_mm4:"craneRunwayRailJ",E_MPa:"craneRunwayRailE",propertySource:"craneRunwayRailPropertySource"};
  function readRunwayRailLayoutInputs(){const out={};Object.entries(RUNWAY_RAIL_LAYOUT_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(!el)return;const raw=String(el.value??"").trim();if(raw!=="")out[key]=["supportPitch_m","firstSupportOffset_m","Ix_mm4","Iy_mm4","J_mm4","E_MPa"].includes(key)?Number(raw):raw;});return out;}
  function parseRunwayJointPositions(raw){if(!String(raw||"").trim())return [];return String(raw).split(/[,،;；\s]+/).map(x=>Number(x.trim()));}
  function readRunwayRailFEMInputs(){return {supportStiffnessCsv:String($("craneRunwayRailSupportStiffness")?.value||""),supportStiffnessSource:String($("craneRunwayRailSupportStiffnessSource")?.value||""),pointLoadsJson:String($("craneRunwayRailWheelLoads")?.value||"")};}
  function parseRunwayRailMovingInputs(raw){raw=raw||{};let wheels=[];try{wheels=JSON.parse(String(raw.movingTrainJson||"[]"));}catch(e){throw Error("JSON قطار چرخ قابل خواندن نیست: "+e.message);}if(!Array.isArray(wheels))throw Error("قطار چرخ باید آرایه JSON باشد.");const step=Number(raw.movingStepM);if(!(Number.isFinite(step)&&step>0))throw Error("گام جاروب مکانی باید مثبت باشد.");if(!wheels.length)throw Error("قطار چرخ خالی است.");return {wheels,step_m:step};}
  function parseRunwayRailSupportInputs(raw,stations){raw=raw||{};const values=String(raw.supportStiffnessCsv||"").split(/[,،;；]+/).filter(Boolean).map(Number);if(values.length!==stations.length)throw Error("تعداد سختی‌های قائم باید دقیقاً برابر تعداد ایستگاه‌ها باشد ("+stations.length+" مقدار لازم است).");if(values.some(v=>!Number.isFinite(v)||v<=0))throw Error("تمام سختی‌های قائم باید عددی، مثبت و بر حسب N/m باشند.");const source=String(raw.supportStiffnessSource||"");if(!source.trim())throw Error("مرجع سختی قائم بست/پد ثبت نشده است.");return {verticalSpringStiffness_N_m:values,supportStiffnessSource:source};}
  function parseRunwayRailFEMInputs(raw,stations){const support=parseRunwayRailSupportInputs(raw,stations);let loads=[];try{loads=JSON.parse(String(raw?.pointLoadsJson||"[]"));}catch(e){throw Error("JSON بارهای چرخ قابل خواندن نیست: "+e.message);}if(!Array.isArray(loads))throw Error("ورودی بارهای چرخ باید آرایه JSON باشد.");return {...support,pointLoads:loads};}
  function auditRunwayRailLayout(detail,length,fastening){
    detail=detail||{};fastening=fastening||{};const missing=["supportPitch_m","firstSupportOffset_m","continuity","Ix_mm4","Iy_mm4","J_mm4","E_MPa","propertySource"].filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    const numeric=["supportPitch_m","firstSupportOffset_m","Ix_mm4","Iy_mm4","J_mm4","E_MPa"],invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||(k==="firstSupportOffset_m"?detail[k]<0:detail[k]<=0)));
    const joints=parseRunwayJointPositions(detail.jointPositions_m),dimensional=[];
    if(Number.isFinite(detail.supportPitch_m)&&Number.isFinite(length)&&detail.supportPitch_m>length)dimensional.push("فاصله ایستگاه‌ها از طول مسیر ریل بیشتر است.");
    if(Number.isFinite(detail.firstSupportOffset_m)&&Number.isFinite(detail.supportPitch_m)&&detail.firstSupportOffset_m>=detail.supportPitch_m)dimensional.push("فاصله اولین ایستگاه باید از فاصله تکرار ایستگاه‌ها کمتر باشد.");
    if(Number.isFinite(detail.firstSupportOffset_m)&&Number.isFinite(length)&&detail.firstSupportOffset_m>length)dimensional.push("اولین ایستگاه خارج از طول سوله قرار گرفته است.");
    if(joints.some((x,i)=>!Number.isFinite(x)||x<=0||x>=length||(i>0&&x<=joints[i-1])))dimensional.push("موقعیت وصله‌ها باید عددی، صعودی و داخل طول مسیر ریل باشند.");
    if(detail.continuity==="unknown")dimensional.push("رفتار پیوستگی ریل نامشخص است؛ برای تحلیل باید از نقشه نصب تعیین شود.");
    if(Number.isFinite(fastening.fasteningSpacing_mm)&&Number.isFinite(detail.supportPitch_m)&&Math.abs(fastening.fasteningSpacing_mm/1000-detail.supportPitch_m)>0.005)dimensional.push("فاصله ایستگاه تکیه‌گاهی با فاصله بست ثبت‌شده یکسان نیست؛ تفاوت آرایش باید مستند شود.");
    if(detail.continuity==="simple-spans"&&joints.length&&joints.some(x=>!(Number.isFinite(detail.supportPitch_m)&&detail.supportPitch_m>0&&Number.isFinite(detail.firstSupportOffset_m)&&Math.abs((x-detail.firstSupportOffset_m)/detail.supportPitch_m-Math.round((x-detail.firstSupportOffset_m)/detail.supportPitch_m))<0.01)))dimensional.push("در مدل قطعات مستقل، وصله ثبت‌شده روی ایستگاه تکیه‌گاهی قرار ندارد؛ جزئیات وصله/تکیه‌گاه باید بازبینی شود.");
    const supportStations=[];if(Number.isFinite(detail.supportPitch_m)&&detail.supportPitch_m>0&&Number.isFinite(detail.firstSupportOffset_m)&&detail.firstSupportOffset_m>=0&&detail.firstSupportOffset_m<detail.supportPitch_m&&Number.isFinite(length)&&length>0){for(let z=detail.firstSupportOffset_m;z<=length+1e-8;z+=detail.supportPitch_m)supportStations.push(Number(z.toFixed(6)));}
    if(supportStations.length<2)dimensional.push("برای تشکیل مسیر طولی ریل، دست‌کم دو ایستگاه تکیه‌گاهی در طول مسیر لازم است.");
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,supportStations,jointPositions_m:joints,analysisEnabled:false,note:"ایستگاه‌ها فقط آرایش هندسی منظم واردشده را نمایش می‌دهند. سختی بست و پد، شرایط دورانی/انتقالی تکیه‌گاه، وصله‌های واقعی و رفتار تماس مدل نشده‌اند؛ خواص مقطع واردشده نیز تا کنترل منبع و محورهای اصلی تأیید نشده‌اند."};
  }
  function calculateNominalWheelContactScreen(detail,crane){
    detail=detail||{};crane=crane||{};
    const missing=[];
    if(!(Number.isFinite(detail.wheelContactWidth_mm)&&detail.wheelContactWidth_mm>0))missing.push("عرض تماس چرخ");
    if(!(Number.isFinite(detail.wheelContactLength_mm)&&detail.wheelContactLength_mm>0))missing.push("طول تماس مؤثر چرخ");
    const wheelLoad=Number(crane.maxWheelLoad_t);
    if(!crane.enabled||!Number.isFinite(wheelLoad)||wheelLoad<=0)missing.push("حداکثر بار مستند چرخ جرثقیل");
    if(!String(crane.wheelLoadSource||"").trim()||!String(crane.wheelLoadDocument||"").trim())missing.push("منبع و مرجع بار چرخ");
    if(missing.length)return {available:false,missing,analysisEnabled:false,note:"برای غربالگری فشار متوسط اسمی، ابعاد تماس و حداکثر بار چرخ مستند لازم است."};
    const area=detail.wheelContactWidth_mm*detail.wheelContactLength_mm;
    const forceN=wheelLoad*9.80665*1000;
    const averageMPa=forceN/area;
    return {available:true,wheelLoad_t:wheelLoad,force_kN:wheelLoad*9.80665,contactArea_mm2:area,nominalAveragePressure_MPa:averageMPa,loadBasis:"حداکثر بار چرخ واردشده توسط کاربر؛ بدون اعمال ضریب ضربه یا ترکیب بار",analysisEnabled:false,limitations:"فقط تقسیم نیروی قائم بر سطح مستطیلی اسمی واردشده است؛ فشار واقعی تماس چرخ و ریل عموماً یکنواخت و مستطیلی نیست. این مقدار تحلیل هرتز، خمش کف ریل، توزیع بار به بست‌ها، فشار پد، تنش بال/جان، اثر ضربه یا کنترل مقاومت نیست و معیار پذیرش محسوب نمی‌شود."};
  }
  function auditRunwayLoadPath(section,detail){
    section=section||{};detail=detail||{};
    const required=["railHeight_mm","railBaseWidth_mm","railFootThickness_mm","railPadThickness_mm","fasteningSpacing_mm","wheelContactWidth_mm","wheelContactLength_mm","loadPathSource"];
    const missing=required.filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    const numeric=required.filter(k=>k!=="loadPathSource"),invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||detail[k]<0||(k!=="railPadThickness_mm"&&detail[k]===0)));
    const dimensional=[];
    if(Number.isFinite(detail.railFootThickness_mm)&&Number.isFinite(detail.railHeight_mm)&&detail.railFootThickness_mm>=detail.railHeight_mm)dimensional.push("ضخامت کف ریل باید از ارتفاع کل ریل کمتر باشد.");
    if(Number.isFinite(detail.wheelContactWidth_mm)&&Number.isFinite(detail.railBaseWidth_mm)&&detail.wheelContactWidth_mm>detail.railBaseWidth_mm)dimensional.push("عرض تماس چرخ از عرض کف ریل بیشتر است؛ هندسه تماس بازبینی شود.");
    if(Number.isFinite(detail.railBaseWidth_mm)&&Number.isFinite(section.flangeWidth_mm)&&detail.railBaseWidth_mm>section.flangeWidth_mm)dimensional.push("عرض کف ریل از عرض بال تیر حمال بیشتر است؛ آرایش نشیمن/اتصال نیازمند بررسی است.");
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,analysisEnabled:false,note:"ممیزی فقط هندسه ورودی را بررسی می‌کند؛ توزیع بار، فشار تماس، خمش کف ریل، ظرفیت بست و پد، تنش بال و جان یا بارهای دینامیکی محاسبه نشده‌اند."};
  }
  function auditRunwayWebDetail(section,detail){
    section=section||{};detail=detail||{};
    const required=["endStiffenerType","intermediateStiffenerType","stiffenerWidth_mm","stiffenerThickness_mm","stiffenerWeldSize_mm","bearingLength_mm","wheelLoadOffset_mm","stiffenerSource"];
    const missing=required.filter(k=>detail[k]===undefined||detail[k]===null||detail[k]==="");
    const numeric=["stiffenerWidth_mm","stiffenerThickness_mm","stiffenerWeldSize_mm","bearingLength_mm"],invalid=numeric.filter(k=>detail[k]!==undefined&&(!Number.isFinite(detail[k])||detail[k]<=0));
    const dimensional=[];
    if(Number.isFinite(section.webThickness_mm)&&Number.isFinite(detail.stiffenerThickness_mm)&&detail.stiffenerThickness_mm<section.webThickness_mm)dimensional.push("ضخامت سخت‌کننده از ضخامت جان کمتر است؛ نیازمند بازبینی جزئیات.");
    if(Number.isFinite(section.overallDepth_mm)&&Number.isFinite(section.flangeThickness_mm)&&Number.isFinite(detail.stiffenerWidth_mm)&&detail.stiffenerWidth_mm>section.overallDepth_mm-2*section.flangeThickness_mm)dimensional.push("عرض ورق سخت‌کننده از ارتفاع آزاد جان بیشتر است.");
    if(detail.intermediateStiffenerType==="none"&&Number.isFinite(section.stiffenerSpacing_m)&&section.stiffenerSpacing_m>0)dimensional.push("فاصله سخت‌کننده ثبت شده ولی نوع سخت‌کننده میانی «بدون سخت‌کننده» انتخاب شده است.");
    const webSlenderness=Number.isFinite(section.overallDepth_mm)&&Number.isFinite(section.flangeThickness_mm)&&Number.isFinite(section.webThickness_mm)&&section.webThickness_mm>0?(section.overallDepth_mm-2*section.flangeThickness_mm)/section.webThickness_mm:null;
    const ready=missing.length===0&&invalid.length===0&&dimensional.length===0;
    return {ready,missing,invalid,dimensional,webSlenderness,analysisEnabled:false,note:"این ممیزی ظرفیت برشی/فشاری جان، تنش موضعی زیر چرخ، کمانش پانل، طراحی جوش یا لهیدگی جان را کنترل نمی‌کند."};
  }
  function calculateRunwayBuiltupIProperties(d){
    if(!d||d.girderType!=="builtup-i")return {available:false,reason:"محاسبه خواص هندسی خودکار در این نسخه فقط برای تیرورق I متقارن با ورق‌های مستطیلی فعال است."};
    const D=d.overallDepth_mm,b=d.flangeWidth_mm,tf=d.flangeThickness_mm,tw=d.webThickness_mm;
    if(![D,b,tf,tw].every(v=>Number.isFinite(v)&&v>0)||2*tf>=D||b<=tw)return {available:false,reason:"ابعاد معتبر و سازگار برای محاسبه خواص هندسی موجود نیست."};
    const hw=D-2*tf,A=2*b*tf+tw*hw;
    const Ix=2*(b*Math.pow(tf,3)/12+b*tf*Math.pow(D/2-tf/2,2))+tw*Math.pow(hw,3)/12;
    const Iy=2*(tf*Math.pow(b,3)/12)+hw*Math.pow(tw,3)/12;
    const Sx=Ix/(D/2),Sy=Iy/(b/2),Japprox=(2*b*Math.pow(tf,3)+hw*Math.pow(tw,3))/3;
    return {available:true,model:"symmetric_welded_I_rectangular_plates",webClearHeight_mm:hw,area_mm2:A,Ix_mm4:Ix,Iy_mm4:Iy,Sx_mm3:Sx,Sy_mm3:Sy,J_approx_mm4:Japprox,steelMass_kg_m:A*0.00785,excludesRailMass:true,limitations:"خواص هندسی ایده‌آل ورق‌های مستطیلی؛ بدون شعاع گوشه، جوش، اعوجاج، تنش پسماند، warping constant و اثر اتصال ریل. برای طراحی ظرفیت کافی نیست."};
  }
  function auditRunwaySectionInputs(d){d=d||{};const required=Object.keys(RUNWAY_SECTION_FIELD_IDS),missing=required.filter(k=>d[k]===undefined||d[k]===null||d[k]===""),numeric=["overallDepth_mm","flangeWidth_mm","flangeThickness_mm","webThickness_mm","railMass_kg_m","stiffenerSpacing_m"],invalid=numeric.filter(k=>d[k]!==undefined&&(!Number.isFinite(d[k])||d[k]<=0)),dimensional=[];if(Number.isFinite(d.overallDepth_mm)&&Number.isFinite(d.flangeThickness_mm)&&2*d.flangeThickness_mm>=d.overallDepth_mm)dimensional.push("مجموع ضخامت دو بال باید از ارتفاع کل تیر کمتر باشد.");if(Number.isFinite(d.flangeWidth_mm)&&Number.isFinite(d.webThickness_mm)&&d.flangeWidth_mm<=d.webThickness_mm)dimensional.push("عرض بال نسبت به ضخامت جان نامعتبر است.");const ready=missing.length===0&&invalid.length===0&&dimensional.length===0&&d.steelGrade!=="other";return {ready,missing,invalid,dimensional,analysisEnabled:false,note:ready?"اطلاعات اولیه ثبت شده؛ طراحی مقاومت، خیز، خستگی، کمانش و اتصال هنوز انجام نشده است.":"اطلاعات مقطع/ریل ناقص یا نیازمند اصلاح است."};}
  function buildRunwayRailLongitudinalGeometry(length,layoutAudit,layoutInputs){
    const audit=layoutAudit||{},inputs=layoutInputs||{};
    if(!Number.isFinite(length)||length<=0||!Array.isArray(audit.supportStations)||!audit.supportStations.length)return [];
    const breaks=[0,length,...audit.supportStations,...(audit.jointPositions_m||[])].filter(x=>Number.isFinite(x)&&x>=0&&x<=length).sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-7);
    const joints=audit.jointPositions_m||[],supports=audit.supportStations,segments=[];
    ["left","right"].forEach(side=>{for(let i=0;i<breaks.length-1;i++){const z1=breaks[i],z2=breaks[i+1];if(z2-z1<=1e-8)continue;segments.push({id:"CRANE_RAIL_"+side.toUpperCase()+"_SEG_"+(i+1),side,startM:z1,endM:z2,lengthM:z2-z1,supportAtStart:supports.some(x=>Math.abs(x-z1)<1e-7),supportAtEnd:supports.some(x=>Math.abs(x-z2)<1e-7),jointAtStart:joints.some(x=>Math.abs(x-z1)<1e-7),jointAtEnd:joints.some(x=>Math.abs(x-z2)<1e-7),continuity:inputs.continuity||"unselected",analysisEnabled:false});}});
    return segments;
  }
  function buildCraneRunwayGeometry(config){
    if(!config.enabled)return {geometryStatus:"disabled",axisOffsetM:null,supportType:"",beamSegments:[],brackets:[],supportNodes:[]};
    const {span,length,frames,runwayElevation,offsetM,supportType,sectionInputs={},sectionAudit={}}=config;
    if(!(Number.isFinite(offsetM)&&offsetM>=0.05))return {geometryStatus:"awaiting_axis_offset",axisOffsetM:null,supportType,beamSegments:[],brackets:[],supportNodes:[],sectionInputs,sectionAudit,sectionProperties:calculateRunwayBuiltupIProperties(sectionInputs),stiffenerInputs:config.stiffenerInputs||{},webAudit:config.webAudit||{},loadPathInputs:config.loadPathInputs||{},loadPathAudit:config.loadPathAudit||{},contactScreen:config.contactScreen||{available:false,analysisEnabled:false},fasteningInputs:config.fasteningInputs||{},fasteningAudit:config.fasteningAudit||{ready:false,analysisEnabled:false},analysisEnabled:false,railLayoutInputs:config.railLayoutInputs||{},railLayoutAudit:config.railLayoutAudit||{ready:false,analysisEnabled:false,supportStations:[]},railSegments:buildRunwayRailLongitudinalGeometry(length,config.railLayoutAudit,config.railLayoutInputs),railLayoutInputs:config.railLayoutInputs||{},railLayoutAudit:config.railLayoutAudit||{ready:false,analysisEnabled:false,supportStations:[]},railSegments:buildRunwayRailLongitudinalGeometry(length,config.railLayoutAudit,config.railLayoutInputs),geometryNote:"فاصله محور تیر حمال از محور ستون باید از نقشه یا جزئیات سازنده وارد شود؛ مشخصات مقطع و مدل طولی ریل ثبت‌شده حفظ شده‌اند."};
    const sides=[{key:"left",columnX:0,beamX:-offsetM},{key:"right",columnX:span,beamX:span+offsetM}];
    const supportNodes=[],brackets=[],beamSegments=[];
    sides.forEach(side=>{
      const line=frames.map((z,i)=>{
        const node={id:"CRANE_"+side.key.toUpperCase()+"_SUPPORT_"+(i+1),x:side.beamX,y:runwayElevation,z,kind:"crane-runway-beam-support",frameIndex:i+1,side:side.key};
        supportNodes.push(node);
        brackets.push({id:"CRANE_"+side.key.toUpperCase()+"_BRACKET_"+(i+1),side:side.key,frameIndex:i+1,from:{x:side.columnX,y:runwayElevation,z},to:{x:side.beamX,y:runwayElevation,z},lengthM:offsetM,analysisEnabled:false,connectionType:supportType||"unselected"});
        return node;
      });
      for(let i=0;i<line.length-1;i++)beamSegments.push({id:"CRANE_"+side.key.toUpperCase()+"_BEAM_BAY_"+(i+1),side:side.key,bayIndex:i+1,start:line[i],end:line[i+1],lengthM:Math.abs(line[i+1].z-line[i].z),continuity:"separate_span_segment_between_adjacent_frames",analysisEnabled:false,connectionType:supportType||"unselected"});
    });
    const sectionProperties=calculateRunwayBuiltupIProperties(sectionInputs);
    return {geometryStatus:supportType?"geometry_only_review_required":"geometry_only_connection_unselected",axisOffsetM:offsetM,supportType,beamSegments,brackets,supportNodes,sectionInputs,sectionAudit,sectionProperties,stiffenerInputs:config.stiffenerInputs||{},webAudit:config.webAudit||{},loadPathInputs:config.loadPathInputs||{},loadPathAudit:config.loadPathAudit||{},fasteningInputs:config.fasteningInputs||{},fasteningAudit:config.fasteningAudit||{ready:false,analysisEnabled:false},railLayoutInputs:config.railLayoutInputs||{},railLayoutAudit:config.railLayoutAudit||{ready:false,analysisEnabled:false,supportStations:[]},railSegments:buildRunwayRailLongitudinalGeometry(length,config.railLayoutAudit,config.railLayoutInputs),analysisEnabled:false,geometryNote:"تیر حمال به قطعات مستقل بین قاب‌های مجاور تقسیم شده است؛ پیوستگی چنددهانه، سختی اتصال و انتقال نیرو هنوز مدل نشده‌اند."};
  }
  function runwayGeometrySelfTest(){
    const normal=runwayColumnLevels(0,[2,4,6],10,5,true);
    const duplicate=runwayColumnLevels(0,[2,5,6],10,5,true);
    let rejected=false;try{runwayColumnLevels(0,[2,4],10,10,true);}catch(_){rejected=true;}
    const geometry=buildCraneRunwayGeometry({enabled:true,span:20,length:24,frames:[0,5,10],runwayElevation:5,offsetM:0.6,supportType:"simple",railLayoutInputs:{continuity:"continuous"},railLayoutAudit:auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0,continuity:"continuous",jointPositions_m:"12",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600})});
    const noOffset=buildCraneRunwayGeometry({enabled:true,span:20,length:24,frames:[0,5],runwayElevation:5,offsetM:NaN,supportType:"",sectionInputs:{girderType:"builtup-i",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12},railLayoutInputs:{continuity:"continuous"},railLayoutAudit:auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0,continuity:"continuous",jointPositions_m:"12",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600})});
    const sectionGood=auditRunwaySectionInputs({girderType:"builtup-i",steelGrade:"ST37",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12,railDesignation:"test rail",railMass_kg_m:50,railFastening:"clip",stiffenerSpacing_m:1.5,lateralRestraint:"dedicated",detailSource:"test drawing"});
    const sectionBad=auditRunwaySectionInputs({girderType:"builtup-i",steelGrade:"ST37",overallDepth_mm:30,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12,railDesignation:"test rail",railMass_kg_m:50,railFastening:"clip",stiffenerSpacing_m:1.5,lateralRestraint:"dedicated",detailSource:"test drawing"});
    const properties=calculateRunwayBuiltupIProperties({girderType:"builtup-i",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12});
    const boxProperties=calculateRunwayBuiltupIProperties({girderType:"box",overallDepth_mm:800,flangeWidth_mm:300,flangeThickness_mm:20,webThickness_mm:12});
    const webAuditGood=auditRunwayWebDetail({overallDepth_mm:800,flangeThickness_mm:20,webThickness_mm:12,stiffenerSpacing_m:1.5},{endStiffenerType:"pair",intermediateStiffenerType:"pair",stiffenerWidth_mm:100,stiffenerThickness_mm:12,stiffenerWeldSize_mm:6,bearingLength_mm:120,wheelLoadOffset_mm:0,stiffenerSource:"detail A"});
    const webAuditBad=auditRunwayWebDetail({overallDepth_mm:800,flangeThickness_mm:20,webThickness_mm:12,stiffenerSpacing_m:1.5},{endStiffenerType:"pair",intermediateStiffenerType:"none",stiffenerWidth_mm:900,stiffenerThickness_mm:6,stiffenerWeldSize_mm:6,bearingLength_mm:0,wheelLoadOffset_mm:0,stiffenerSource:""});
    const loadPathGood=auditRunwayLoadPath({flangeWidth_mm:300},{railHeight_mm:120,railBaseWidth_mm:140,railFootThickness_mm:20,railPadThickness_mm:8,fasteningSpacing_mm:600,wheelContactWidth_mm:80,wheelContactLength_mm:40,loadPathSource:"rail and wheel catalog"});
    const loadPathBad=auditRunwayLoadPath({flangeWidth_mm:100},{railHeight_mm:100,railBaseWidth_mm:140,railFootThickness_mm:120,railPadThickness_mm:-1,fasteningSpacing_mm:0,wheelContactWidth_mm:160,wheelContactLength_mm:40,loadPathSource:""});
    const contactGood=calculateNominalWheelContactScreen({wheelContactWidth_mm:80,wheelContactLength_mm:40},{enabled:true,maxWheelLoad_t:10,wheelLoadSource:"catalog",wheelLoadDocument:"page 4"});
    const contactMissing=calculateNominalWheelContactScreen({wheelContactWidth_mm:80,wheelContactLength_mm:40},{enabled:true,maxWheelLoad_t:10,wheelLoadSource:"",wheelLoadDocument:""});
    const fasteningGood=auditRunwayFasteningDetail({railBaseWidth_mm:140,railPadThickness_mm:8},{fasteningType:"clip",fasteningModel:"clip-X",clampsPerStation:2,boltsPerClamp:2,boltGrade:"8.8",boltDiameter_mm:16,seatPlateWidth_mm:180,seatPlateLength_mm:200,seatPlateThickness_mm:16,padMaterial:"elastomer",padHardness_ShoreA:70,detailSource:"detail F-01"});
    const fasteningBad=auditRunwayFasteningDetail({railBaseWidth_mm:200,railPadThickness_mm:0},{fasteningType:"clip",seatPlateWidth_mm:100,seatPlateLength_mm:-1,seatPlateThickness_mm:0,padMaterial:"",padHardness_ShoreA:120,detailSource:""});
    const railLayoutGood=auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0,continuity:"continuous",jointPositions_m:"12",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600});
    const railOffsetAligned=auditRunwayRailLayout({supportPitch_m:0.6,firstSupportOffset_m:0.3,continuity:"simple-spans",jointPositions_m:"0.9, 1.5",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600});
    const railTooSparse=auditRunwayRailLayout({supportPitch_m:30,firstSupportOffset_m:0,continuity:"continuous",Ix_mm4:1.2e7,Iy_mm4:4.5e6,J_mm4:3.1e5,E_MPa:210000,propertySource:"rail catalog page 8"},24,{fasteningSpacing_mm:600});
    const railLayoutBad=auditRunwayRailLayout({supportPitch_m:0,firstSupportOffset_m:2,continuity:"unknown",jointPositions_m:"24, 12, 25",Ix_mm4:-1,Iy_mm4:0,J_mm4:1,E_MPa:0,propertySource:""},24,{fasteningSpacing_mm:600});
    const checks=[
      normal.length===6&&normal.filter(x=>x.kind==="runway-support").length===1,
      duplicate.filter(x=>x.y===5).length===1&&duplicate.filter(x=>x.kind==="runway-support").length===1,
      rejected,
      geometry.beamSegments.length===4&&geometry.brackets.length===6&&geometry.supportNodes.length===6&&geometry.beamSegments.every(x=>x.analysisEnabled===false)&&geometry.brackets.every(x=>x.analysisEnabled===false),
      geometry.railSegments.length===80&&geometry.railSegments.some(x=>x.jointAtStart)&&geometry.railSegments.every(x=>x.analysisEnabled===false),
      noOffset.geometryStatus==="awaiting_axis_offset"&&noOffset.beamSegments.length===0&&noOffset.sectionInputs.girderType==="builtup-i"&&noOffset.sectionProperties.available&&noOffset.railSegments.length===80,
      sectionGood.ready===true&&sectionGood.analysisEnabled===false,
      sectionBad.ready===false&&sectionBad.dimensional.length>0,
      properties.available&&properties.area_mm2>0&&properties.Ix_mm4>properties.Iy_mm4&&properties.steelMass_kg_m>0&&!boxProperties.available,
      webAuditGood.ready&&webAuditGood.webSlenderness>0&&webAuditGood.analysisEnabled===false,
      !webAuditBad.ready&&webAuditBad.dimensional.length>=2&&webAuditBad.missing.includes("stiffenerSource"),
      loadPathGood.ready&&loadPathGood.analysisEnabled===false,
      !loadPathBad.ready&&loadPathBad.dimensional.length>=2&&loadPathBad.invalid.length>=2,
      contactGood.available&&Math.abs(contactGood.nominalAveragePressure_MPa-(10*9.80665*1000/(80*40)))<1e-9&&contactGood.analysisEnabled===false,
      !contactMissing.available&&contactMissing.missing.length>=1,
      fasteningGood.ready&&fasteningGood.analysisEnabled===false,
      !fasteningBad.ready&&fasteningBad.missing.length>=1&&fasteningBad.invalid.length>=2&&fasteningBad.dimensional.length>=1,
      railLayoutGood.ready&&railLayoutGood.supportStations.length===41&&railLayoutGood.analysisEnabled===false,
      !railLayoutBad.ready&&railLayoutBad.invalid.length>=3&&railLayoutBad.dimensional.length>=2,
      railOffsetAligned.ready&&railOffsetAligned.supportStations[0]===0.3,
      !railTooSparse.ready&&railTooSparse.supportStations.length===1&&railTooSparse.dimensional.length>=1,
      exactMemberSegmentCount([{sectionKey:"rafter",axis:"transverse",frame:1,start:"A",end:"B"}],"rafter","transverse",1,{id:"A"},{id:"B"})===1,
      exactMemberSegmentCount([{sectionKey:"rafter",axis:"transverse",frame:1,start:"A",end:"B"},{sectionKey:"rafter",axis:"transverse",frame:1,start:"A",end:"B"}],"rafter","transverse",1,{id:"A"},{id:"B"})===2,
      countRafterPaths([{sectionKey:"rafter",axis:"transverse",frame:1,start:"A",end:"M"},{sectionKey:"rafter",axis:"transverse",frame:1,start:"M",end:"B"}],1,"A","B")===1,
      countRafterPaths([{sectionKey:"rafter",axis:"transverse",frame:1,start:"A",end:"M"}],1,"A","B")===0,
      auditPurlinRafterConnectivity([{id:"A",z:0},{id:"B",z:5},{id:"C",z:0},{id:"D",z:5}],[{id:"P",sectionKey:"roofPurlin",start:"A",end:"B"},{id:"R1",sectionKey:"rafter",start:"A",end:"C"},{id:"R2",sectionKey:"rafter",start:"B",end:"D"}],[0,5]).ok,
      auditPurlinRafterConnectivity([{id:"A",z:0},{id:"B",z:5}],[{id:"P",sectionKey:"roofPurlin",start:"A",end:"B"}],[0,5]).issues.length===2,
      auditPurlinRafterConnectivity([{id:"A",z:-1},{id:"B",z:0}],[{id:"P",sectionKey:"roofPurlin",start:"A",end:"B"},{id:"E",sectionKey:"roofEdge",start:"A",end:"B"},{id:"R",sectionKey:"rafter",start:"B",end:"B2"}],[0,5]).ok
    ];
    return {passed:checks.filter(Boolean).length,total:checks.length,checks};
  }
  function build() {
    if($("structuralSystem")?.value==="portal-single-slope")
      throw new Error("مدل سه‌بعدی تک‌شیب هنوز تکمیل نشده است؛ فقط پیش‌نمایش دوبعدی نمایش داده می‌شود.");
    const span=val("span",20), length=val("length",30), spacing=val("spacing",5), height=val("height",6), rise=val("rise",2);
    const craneData=window.SteelCraneReadiness?.getData?.()||{};
    const craneEnabled=!!craneData.enabled;
    const runwayElevation=Number(craneData.runwayElevation_m);
    const psp=val("modelPurlinSpacing",1.2), gsp=val("modelGirtSpacing",1.5), endsp=val("modelEndPostSpacing",4);
    const roofOverhang=val("modelRoofOverhang",0), endOverhang=val("modelEndOverhang",0);
    const braceBays=Math.max(0,Math.floor(val("modelBraceBays",1)));
    if ([span,length,spacing,height,psp,gsp,endsp].some(x=>!(x>0)) || rise<0 || !Number.isFinite(roofOverhang) || roofOverhang<0 || !Number.isFinite(endOverhang) || endOverhang<0)
      throw new Error("ابعاد اصلی، فاصله اعضای فرعی و پیش‌آمدگی‌های سقف باید معتبر و نامنفی باشند.");
    const frames=[0]; for(let z=spacing;z<length-1e-8;z+=spacing) frames.push(z);
    if(length-frames[frames.length-1]>1e-8) frames.push(length);
    const nodes=[],members=[],frameNodes=[],half=span/2,slope=Math.hypot(half,rise),cs=half/slope,sn=rise/slope,over=roofOverhang;
    const girtHeights=[],nGirt=Math.max(0,Math.floor(height/gsp));
    for(let i=1;i<=nGirt;i++) if(i*gsp<height-0.25) girtHeights.push(i*gsp);
    const roofY=x=>height+(x<=half?rise*x/half:rise*(span-x)/half);
    const totalRoofSlope=slope+over;
    const purlinLayout=window.SteelPurlinSpacingLayout?.calculate(totalRoofSlope,psp);
    if(!purlinLayout?.ok)throw new Error(purlinLayout?.reason||"ماژول تعیین فاصله پرلین‌ها بارگذاری نشده است.");
    const roofRows=purlinLayout.intervals;
    // Every purlin/rafter crossing is a shared structural node, not two coincident but disconnected nodes.
    const endWallCount=Math.max(1,Math.ceil(span/endsp));
    const endWallXs=Array.from(new Set([...Array.from({length:endWallCount+1},(_,i)=>span*i/endWallCount),half])).sort((a,b)=>a-b);
    const roofXs=[0,span,...endWallXs];
    [-1,1].forEach(side=>{for(let ri=0;ri<=roofRows;ri++){
      const t=ri/roofRows;
      roofXs.push(side<0?(-over*cs+(half+over*cs)*t):(half+(half+over*cs)*t));
    }});
    // Force exact column/rafter intersections at both eaves and reuse their node IDs.
    const frameRoofXs=roofXs.sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-8);
    frames.forEach((z,fi)=>{
      const bl=addNode(nodes,0,0,z,"base"),el=addNode(nodes,0,height,z,"eave"),r=addNode(nodes,half,height+rise,z,"ridge");
      const er=addNode(nodes,span,height,z,"eave"),br=addNode(nodes,span,0,z,"base");
      const lt=addNode(nodes,-over*cs,height-over*sn,z,"cantilever"),rt=addNode(nodes,span+over*cs,height-over*sn,z,"cantilever");
      // Split each main column at every wall-girt elevation. The girt and
      // column must reuse the exact same node IDs to transfer forces.
      const leftLevels=runwayColumnLevels(0,girtHeights,height,runwayElevation,craneEnabled);
      const rightLevels=leftLevels;
      const leftColumnLevels=leftLevels.map(v=>addNode(nodes,0,v.y,z,v.kind));
      const rightColumnLevels=rightLevels.map(v=>addNode(nodes,span,v.y,z,v.kind));
      for(let j=0;j<leftColumnLevels.length-1;j++)
        addMember(members,leftColumnLevels[j],leftColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      for(let j=0;j<rightColumnLevels.length-1;j++)
        addMember(members,rightColumnLevels[j],rightColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      const roofLine=frameRoofXs.map(x=>addNode(nodes,x,roofY(x),z,"rafter-purlin-joint"));
      for(let j=0;j<roofLine.length-1;j++){
        const a=roofLine[j],b=roofLine[j+1],mid=(a.x+b.x)/2;
        const isOverhang=mid<0||mid>span;
        const isGableChord=(fi===0||fi===frames.length-1)&&a.x>=-1e-7&&b.x<=span+1e-7;
        addMember(members,a,b,isOverhang?"کنسول رفتر":"رفتر قاب","rafter",{frame:fi+1,axis:"transverse",segment:j+1,connectedPurlinNodes:true,gableChordFace:isGableChord?(fi===0?"front":"rear"):null});
      }
      const runwayLeft=craneEnabled?addNode(nodes,0,runwayElevation,z,"runway-support"):null;
      const runwayRight=craneEnabled?addNode(nodes,span,runwayElevation,z,"runway-support"):null;
      frameNodes.push({z,bl,el,r,er,br,lt,rt,runwayLeft,runwayRight});
    });
    // Build one physical purlin line at each roof station. The ridge is shared
    // by both slopes and must be represented once, with left/right tributary widths.
    const purlinStations=new Map();
    [-1,1].forEach(side=>{
      for(let ri=0;ri<=roofRows;ri++){
        const t=ri/roofRows;
        const x=side<0?(-over*cs+(half+over*cs)*t):(half+(half+over*cs)*t);
        const width=(totalRoofSlope/roofRows)*(ri===0||ri===roofRows?0.5:1);
        const key=x.toFixed(7);
        const existing=purlinStations.get(key);
        if(existing){
          existing.side="ridge";
          existing.tributaryWidthRight=width;
          existing.tributaryWidth+=width;
        }else{
          purlinStations.set(key,{x,side:side<0?"left":"right",row:ri+1,
            tributaryWidth:width,
            tributaryWidthLeft:side<0?width:0,
            tributaryWidthRight:side>0?width:0});
        }
      }
    });
    const clipDeduction=val("modelPurlinClipDeduction",0);
    const assemblyGap=val("modelPurlinAssemblyGap",0);
    if(clipDeduction<0||assemblyGap<0)throw new Error("کسر کلیپس و لقی مونتاژ پرلین نمی‌تواند منفی باشد.");
    purlinStations.forEach(station=>{
      // Each bay is one fabricated piece. End-bay pieces pass over the end frame.
      for(let bay=0;bay<frames.length-1;bay++){
        const z1=frames[bay],z2=frames[bay+1],axisLength=z2-z1;
        const frontExtension=bay===0?endOverhang:0, rearExtension=bay===frames.length-2?endOverhang:0;
        const fabricationLength=axisLength+frontExtension+rearExtension-clipDeduction-assemblyGap;
        if(!(fabricationLength>0))throw new Error("طول برش پرلین در دهانه "+(bay+1)+" مثبت نیست؛ ابعاد کلیپس و لقی مونتاژ را بررسی کنید.");
        const pieceId="PURLIN_"+station.row+"_"+station.side+"_BAY_"+(bay+1);
        const path=[z1-frontExtension,z1,z2,z2+rearExtension].filter((z,i,arr)=>i===0||Math.abs(z-arr[i-1])>1e-8);
        for(let seg=0;seg<path.length-1;seg++){
          const za=path[seg],zb=path[seg+1];
          const na=addNode(nodes,station.x,roofY(station.x),za,"roof-secondary-support");
          const nb=addNode(nodes,station.x,roofY(station.x),zb,"roof-secondary-support");
          addMember(members,na,nb,"پرلین مستقل عبوری از قاب انتهایی","roofPurlin",{
            side:station.side,row:station.row,bay:bay+1,pieceId,
            tributaryWidth:station.tributaryWidth,tributaryWidthLeft:station.tributaryWidthLeft,
            tributaryWidthRight:station.tributaryWidthRight,supportAxisLengthM:axisLength,
            clipDeductionM:clipDeduction,assemblyGapM:assemblyGap,
            fabricationLengthM:fabricationLength,fabricationRecord:seg===0,
            physicalPiece:true,separatePiece:true,continuousPieceSegment:true,
            cutInsetStartM:seg===0?clipDeduction/2+assemblyGap/2:0,
            cutInsetEndM:seg===path.length-2?clipDeduction/2+assemblyGap/2:0,
            endOverhang:frontExtension+rearExtension,
            frontOverhangM:frontExtension,rearOverhangM:rearExtension
          });
        }
      }
    });
    // Connect the transverse roof-edge member to every purlin tail.
    [-endOverhang,length+endOverhang].forEach(z=>{
      const edgeStations=Array.from(purlinStations.values()).sort((a,b)=>a.x-b.x);
      const edge=edgeStations.map(station=>addNode(nodes,station.x,roofY(station.x),z,"roof-edge"));
      for(let i=0;i<edge.length-1;i++){
        addMember(members,edge[i],edge[i+1],"تیر لبه عرضی پیش‌آمدگی سقف","roofEdge",{
          endFace:z<0?"front":"rear",overhang:endOverhang,
          stationStart:edgeStations[i].row,stationEnd:edgeStations[i+1].row,
          connectsPurlinTail:true
        });
      }
    });
    girtHeights.forEach((y,gi)=>[0,span].forEach((x,si)=>{
      const lower=gi===0?0:(girtHeights[gi-1]+y)/2;
      const upper=gi===girtHeights.length-1?height:(y+girtHeights[gi+1])/2;
      const row=frames.map(z=>addNode(nodes,x,y,z,"wall-secondary"));
      for(let i=0;i<row.length-1;i++) addMember(members,row[i],row[i+1],"قید افقی طولی دیوار","wallGirt",{side:si===0?"left":"right",row:gi+1,tributaryHeight:upper-lower});
    }));
    [0,length].forEach((z,endIndex)=>{
      const xs=endWallXs;
      const face=endIndex===0?"front":"rear";
      // End-wall posts are split at every girt intersection so the secondary
      // members share actual nodes instead of crossing disconnected lines.
      for(let i=1;i<xs.length-1;i++){
        const x=xs[i],top=roofY(x);
        const levels=[0,...girtHeights.filter(y=>y<top-1e-7),top]
          .filter((y,j,a)=>j===0||Math.abs(y-a[j-1])>1e-7);
        const vertical=levels.map(y=>addNode(nodes,x,y,z,y===0?"endwall-base":(Math.abs(y-top)<1e-7?"endwall-head":"endwall-post-joint")));
        for(let j=0;j<vertical.length-1;j++)
          addMember(members,vertical[j],vertical[j+1],"ستونک میانی دیوار انتهایی","endPost",{endFace:face,post:i,segment:j+1});
      }
      // The gable top chord is the end-frame rafter itself. Reuse its exact
      // segmented FEM members; a second coincident chord would double stiffness.
      const topChord=xs.map(x=>addNode(nodes,x,roofY(x),z,"endwall-head"));
      const endFrameNumber=endIndex===0?1:frames.length;
      for(let i=0;i<topChord.length-1;i++){
        const a=topChord[i],b=topChord[i+1];
        const pathCount=countRafterPaths(members,endFrameNumber,a.id,b.id);
        if(pathCount!==1)throw new Error("قطعه "+(i+1)+" وتر گابل باید دقیقاً یک مسیر پیوسته و یکتا از قطعات رفتر قاب انتهایی داشته باشد؛ تعداد مسیر: "+pathCount+"؛ مدل FEM متوقف شد.");
      }
      girtHeights.forEach((y,gi)=>{
        const active=xs.map((x,i)=>({x,i})).filter(v=>roofY(v.x)>=y-1e-7);
        const lower=gi===0?0:(girtHeights[gi-1]+y)/2;
        const nextBoundary=gi===girtHeights.length-1?Infinity:(y+girtHeights[gi+1])/2;
        for(let i=0;i<active.length-1;i++){
          const x1=active[i].x,x2=active[i+1].x,xMid=(x1+x2)/2;
          // End-wall tributary height is local to this girt segment. The upper
          // strip is clipped by the actual sloping roof profile, not the eave
          // height; xs includes the ridge, so roofY is linear on each segment.
          const upper=Math.min(nextBoundary,roofY(xMid));
          const tributaryHeight=upper-lower;
          if(!(tributaryHeight>0&&Number.isFinite(tributaryHeight)))
            throw new Error("ارتفاع بارگیر موضعی گرت انتهایی نامعتبر است؛ مدل FEM متوقف شد.");
          const a=addNode(nodes,x1,y,z,"endwall-girt"),b=addNode(nodes,x2,y,z,"endwall-girt");
          addMember(members,a,b,"تیر افقی دیوار انتهایی","endGirt",{endFace:face,row:gi+1,tributaryHeight,tributaryHeightLowerM:lower,tributaryHeightUpperM:upper});
        }
      });
    });
    const bayCount=frames.length-1,braceSet=new Set();
    for(let i=0;i<Math.min(braceBays,bayCount);i++){braceSet.add(i);braceSet.add(bayCount-1-i);}
    braceSet.forEach(bi=>{
      const f1=frameNodes[bi],f2=frameNodes[bi+1];
      [-1,1].forEach(side=>{
        const x=side<0?0:span,a=addNode(nodes,x,0,f1.z,"brace"),b=addNode(nodes,x,height,f2.z,"brace");
        const c=addNode(nodes,x,height,f1.z,"brace"),d=addNode(nodes,x,0,f2.z,"brace");
        addMember(members,a,b,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
        addMember(members,c,d,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
      });
      [-1,1].forEach(side=>{
        const x1=side<0?0:half,x2=side<0?half:span,y1=roofY(x1),y2=roofY(x2);
        const a=addNode(nodes,x1,y1,f1.z,"brace"),b=addNode(nodes,x2,y2,f2.z,"brace");
        const c=addNode(nodes,x2,y2,f1.z,"brace"),d=addNode(nodes,x1,y1,f2.z,"brace");
        addMember(members,a,b,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
        addMember(members,c,d,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
      });
    });
    // Assign tributary line loads to the geometric members from current area-load inputs.
    const loads=window.SteelLoads?.getData?.()||{};
    const frameTrib=frames.map((z,i)=>i===0?(frames[1]-z)/2:i===frames.length-1?(z-frames[i-1])/2:(frames[i+1]-frames[i-1])/2);
    members.forEach(m=>{
      m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"self-weight-only-or-connected-reactions"};
      if(m.axis==="transverse"){
        const fi=(m.frame||1)-1,tw=frameTrib[fi]||spacing;
        if(m.type.indexOf("رفتر چپ")>=0) m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"purlin-support-reactions-and-member-self-weight",tributaryWidth:tw};
        else if(m.type.indexOf("رفتر راست")>=0) m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"purlin-support-reactions-and-member-self-weight",tributaryWidth:tw};
        else m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"self-weight-only-or-connected-reactions",tributaryWidth:tw};
      } else if(m.sectionKey==="roofPurlin"){
        const w=m.tributaryWidth||0;
        if(m.side==="ridge"){
          const wl=m.tributaryWidthLeft||0,wr=m.tributaryWidthRight||0;
          m.lineLoads={
            dead:(loads.deadLeft||0)*wl+(loads.deadRight||0)*wr,
            live:(loads.liveLeft||0)*wl+(loads.liveRight||0)*wr,
            snow:(loads.snowLeft||0)*wl+(loads.snowRight||0)*wr,
            wind:(loads.windLeft||0)*wl+(loads.windRight||0)*wr,
            windLeft:(loads.windLeft||0)*wl,windRight:(loads.windRight||0)*wr,
            windEnd:0,loadRole:"roof-surface-tributary-load",unit:"kN/m",tributaryWidth:w,tributaryWidthLeft:wl,tributaryWidthRight:wr
          };
        }else{
          const side=m.side==="left"?"Left":"Right";
          m.lineLoads={dead:(loads["dead"+side]||0)*w,live:(loads["live"+side]||0)*w,snow:(loads["snow"+side]||0)*w,wind:(loads["wind"+side]||0)*w,windLeft:m.side==="left"?(loads.windLeft||0)*w:0,windRight:m.side==="right"?(loads.windRight||0)*w:0,windEnd:0,loadRole:"roof-surface-tributary-load",unit:"kN/m",tributaryWidth:w};
        }
      } else if(m.sectionKey==="wallGirt"){
        const h=m.tributaryHeight||0;
        m.lineLoads={dead:0,live:0,snow:0,wind:(loads.windWall||0)*h,windLeft:0,windRight:0,windEnd:0,loadRole:"longitudinal-wall-pressure",unit:"kN/m",tributaryHeight:h};
      } else if(m.sectionKey==="endGirt"){
        const h=m.tributaryHeight||0;
        const pressure=m.endFace==="front"?(loads.windEndFront||0):(loads.windEndBack||0);
        m.lineLoads={dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:pressure*h,loadRole:"end-wall-pressure-below-gable",unit:"kN/m",tributaryHeight:h,pressureKPa:pressure};
      }
    });
    const runwayOffsetInput=$("craneRunwayAxisOffset"),runwaySupportInput=$("craneRunwaySupportType");
    const runwayOffset=runwayOffsetInput&&String(runwayOffsetInput.value).trim()!==""?Number(runwayOffsetInput.value):NaN;
    const runwaySupportType=runwaySupportInput?.value||"";
    const runwaySectionInputs=readRunwaySectionInputs();
    const runwaySectionAudit=auditRunwaySectionInputs(runwaySectionInputs);
    const runwayStiffenerInputs=readRunwayStiffenerInputs();
    const runwayWebAudit=auditRunwayWebDetail(runwaySectionInputs,runwayStiffenerInputs);
    const runwayLoadPathInputs=readRunwayLoadPathInputs();
    const runwayLoadPathAudit=auditRunwayLoadPath(runwaySectionInputs,runwayLoadPathInputs);
    const runwayContactScreen=calculateNominalWheelContactScreen(runwayLoadPathInputs,window.SteelCraneReadiness?.getData?.()||{});
    const runwayFasteningInputs=readRunwayFasteningInputs();
    const runwayFasteningAudit=auditRunwayFasteningDetail(runwayLoadPathInputs,runwayFasteningInputs);
    const runwayRailLayoutInputs=readRunwayRailLayoutInputs();
    const runwayRailLayoutAudit=auditRunwayRailLayout(runwayRailLayoutInputs,length,runwayLoadPathInputs);
    const runwayGeometry=buildCraneRunwayGeometry({enabled:craneEnabled,span,length,frames,runwayElevation,offsetM:runwayOffset,supportType:runwaySupportType,sectionInputs:runwaySectionInputs,sectionAudit:runwaySectionAudit,stiffenerInputs:runwayStiffenerInputs,webAudit:runwayWebAudit,loadPathInputs:runwayLoadPathInputs,loadPathAudit:runwayLoadPathAudit,contactScreen:runwayContactScreen,fasteningInputs:runwayFasteningInputs,fasteningAudit:runwayFasteningAudit,railLayoutInputs:runwayRailLayoutInputs,railLayoutAudit:runwayRailLayoutAudit});
    const purlinSupportAudit=auditPurlinRafterConnectivity(nodes,members,frames);
    // شکست ممیزی توپولوژی نباید نمایش هندسه را متوقف کند؛ نتیجه ممیزی جداگانه گزارش می‌شود.
    model={version:1,geometry:{span,length,spacing,height,rise,frames:frames.slice(),bayCount:frames.length-1,frameTributaryWidths:frameTrib,roofPurlinSpacing:psp,roofPurlinActualSpacing:purlinLayout.actualSpacingM,roofPurlinIntervalsPerSlope:purlinLayout.intervals,roofPurlinStationCountPerSlope:purlinLayout.stationCount,wallGirtSpacing:gsp,endPostSpacing:endsp,braceBays,craneRunway:{enabled:craneEnabled,elevationM:craneEnabled?runwayElevation:null,supportNodeCount:craneEnabled?frameNodes.length*2:0,...runwayGeometry,railFemInputs:{...readRunwayRailFEMInputs(),movingTrainJson:String($("craneRunwayRailMovingTrain")?.value||""),movingStepM:String($("craneRunwayRailMovingStep")?.value||"0.25")}},roofOverhang,endOverhang},nodes,members,generatedAt:new Date().toISOString(),purlinSupportAudit};
    if(window.SteelCrane3DMeshProposal&&model.geometry.craneRunway.enabled){
      model.geometry.craneRunway.meshProposal=window.SteelCrane3DMeshProposal.audit(model);
    }
    if(window.SteelCrane3DIntegration&&model.geometry.craneRunway.enabled){
      const integration=window.SteelCrane3DIntegration.integrate(model);
      const integrationAudit={success:integration.success,ready:integration.ready,analysisEnabled:false,issues:integration.issues||[],counts:integration.counts||null};
      if(integration.success){
        model=integration.model;
        model.geometry.craneRunway.integrationAudit=integrationAudit;
      }else{
        model.geometry.craneRunway.integrationAudit=integrationAudit;
      }
    }
    return model;
  }
  function draw() {
    if(!model) build(); const svg=$("frameDrawing"); if(!svg)return false;
    const g=model.geometry,W=900,H=480,sx=Math.min(430/(g.span+0.8),300/(g.length+1.6)),sy=Math.min(190/(g.height+g.rise),sx),scale=Math.min(sx,sy);
    const ox=120,oy=330,dx=scale,dz=scale*0.55,dy=scale*0.92,az=cameraView.azimuth*Math.PI/180,ca=Math.cos(az),sa=Math.sin(az),zoom=cameraView.zoom;
    const P=n=>{const cx=n.x-g.span/2,cz=n.z-g.length/2,rx=cx*ca-cz*sa,rz=cx*sa+cz*ca,bx=ox+g.span/2*dx+g.length/2*dz+rx*dx+rz*dz,by=oy-n.y*dy-(rz+g.length/2)*dz*0.52;return{x:W/2+(bx-W/2)*zoom,y:H/2+(by-H/2)*zoom};};
    svg.innerHTML="";svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("preserveAspectRatio","xMidYMid meet");
    const el=(tag,attrs)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e;};
    el("rect",{x:0,y:0,width:W,height:H,fill:"#f8fafc"});
    const colors={column:"#176b9b",rafter:"#d97706",roofPurlin:"#0f766e",wallGirt:"#64748b",wallBrace:"#dc2626",roofBrace:"#b91c1c",endPost:"#2563eb",endGirt:"#94a3b8",roofEdge:"#b45309"};
    const widths={column:5,rafter:4,roofPurlin:1.8,wallGirt:1.8,wallBrace:2.5,roofBrace:2.5,endPost:2.2,endGirt:1.5,roofEdge:3};
    const nodeById=new Map(model.nodes.map(n=>[n.id,n]));
    const membersByType=new Map();
    model.members.forEach(member=>{const key=member.sectionKey;if(!membersByType.has(key))membersByType.set(key,[]);membersByType.get(key).push(member);});
    ["roofPurlin","wallGirt","endGirt","endPost","roofBrace","wallBrace","roofEdge","column","rafter"].forEach(type=>(membersByType.get(type)||[]).forEach(m=>{
      const a=nodeById.get(m.start),b=nodeById.get(m.end);if(!a||!b)return;
      let aa=a,bb=b;
      if(type==="roofPurlin"&&m.separatePiece){
        const dir=Math.sign(b.z-a.z)||1;
        aa={...a,z:a.z+dir*Number(m.cutInsetStartM||0)};
        bb={...b,z:b.z-dir*Number(m.cutInsetEndM||0)};
      }
      const p=P(aa),q=P(bb);
      el("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:colors[type],"stroke-width":widths[type],"stroke-linecap":"round",opacity:type==="roofPurlin"||type==="wallGirt"?"0.88":"1"});
      if(type==="roofPurlin"&&m.separatePiece){
        const sa=P(a),sb=P(b);
        [sa,sb].forEach(c=>el("circle",{cx:c.x,cy:c.y,r:2.6,fill:"#f59e0b",stroke:"#78350f","stroke-width":0.8}));
      }
    }));
    const runway=g.craneRunway;
    if(runway?.enabled&&Array.isArray(runway.beamSegments)){
      runway.beamSegments.forEach(segment=>{
        const a=P(segment.start),b=P(segment.end);
        el("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:"#7c3aed","stroke-width":4,"stroke-linecap":"round","stroke-dasharray":"7 3"});
      });
      (runway.brackets||[]).forEach(bracket=>{
        const a=P(bracket.from),b=P(bracket.to);
        el("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:"#a855f7","stroke-width":3,"stroke-dasharray":"3 3"});
      });
      (runway.supportNodes||[]).forEach(node=>{
        const p=P(node);el("circle",{cx:p.x,cy:p.y,r:3.5,fill:"#7c3aed",stroke:"#ffffff","stroke-width":1});
      });
      (runway.railSegments||[]).forEach(segment=>{const x=segment.side==="left"?-runway.axisOffsetM:g.span+runway.axisOffsetM,y=g.craneRunway.elevationM+Number(runway.loadPathInputs?.railHeight_mm||0)/1000;const p=P({x,y,z:segment.startM}),q=P({x,y,z:segment.endM});el("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:"#f59e0b","stroke-width":2.2,"stroke-linecap":"round"});if(segment.jointAtStart){el("circle",{cx:p.x,cy:p.y,r:3.2,fill:"#dc2626",stroke:"#ffffff","stroke-width":0.8});}});
    }
    const title=el("text",{x:W/2,y:25,"text-anchor":"middle",fill:"#123b52","font-size":17,"font-family":"Tahoma,Arial"});title.textContent="مدل سه‌بعدی جانمایی اجزای سوله";
    const note=el("text",{x:W/2,y:455,"text-anchor":"middle",fill:"#64748b","font-size":11,"font-family":"Tahoma,Arial"});note.textContent="نمای آکسونومتریک مدل هندسی جاری | چرخش افقی: "+Math.round(cameraView.azimuth)+"° | بزرگنمایی: "+cameraView.zoom.toFixed(2)+"×";
    return true;
  }
  function renderCriticalRafterDiagram(result, contextLabel) {
    const box=$("criticalRafterDiagram");
    if(!box||!model||!result||!result.criticalDisplacement){return;}
    const critical=result.criticalDisplacement;
    const z=Number(critical.coordinates.z);
    const nodeById=new Map(model.nodes.map(n=>[n.id,n]));
    const frameMembers=model.members.filter(m=>{
      if(m.axis!=="transverse"||m.sectionKey!=="rafter")return false;
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return a&&b&&Math.abs(a.z-z)<1e-6&&Math.abs(b.z-z)<1e-6;
    });
    const selectedIds=new Set((critical.connectedMembers||[])
      .filter(m=>m.sectionKey==="rafter").map(m=>String(m.id)));
    const selected=frameMembers.filter(m=>selectedIds.has(String(m.id)));
    if(!selected.length){
      box.textContent="قطعه رفتر متصل به گره بحرانی در قاب انتخاب‌شده پیدا نشد.";
      return;
    }
    const frameNodes=frameMembers.flatMap(m=>[nodeById.get(m.start),nodeById.get(m.end)]).filter(Boolean);
    const xs=frameNodes.map(n=>n.x),ys=frameNodes.map(n=>n.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),maxY=Math.max(...ys);
    const W=980,H=370,x0=38,baseY=300,xScale=610/Math.max(maxX-minX,1),yScale=220/Math.max(maxY,1);
    const P=n=>({x:x0+(n.x-minX)*xScale,y:baseY-n.y*yScale});
    const esc=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای قاب عرضی و محل قطعه رفتر بحرانی" style="width:100%;height:auto;display:block;background:#f8fafc;border-radius:8px">';
    svg+='<text x="340" y="25" text-anchor="middle" fill="#123b52" font-size="17" font-family="Tahoma,Arial">نمای عرضی قاب سوله — '+esc(contextLabel||"مدل فعلی")+'</text>';
    svg+='<line x1="25" y1="'+baseY+'" x2="675" y2="'+baseY+'" stroke="#94a3b8" stroke-width="2"/>';
    const columns=model.members.filter(m=>m.sectionKey==="column").filter(m=>{
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return a&&b&&Math.abs(a.z-z)<1e-6&&Math.abs(b.z-z)<1e-6;
    });
    columns.forEach(m=>{const a=P(nodeById.get(m.start)),b=P(nodeById.get(m.end));svg+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#256b91" stroke-width="10" stroke-linecap="square"/>';});
    frameMembers.slice().sort((a,b)=>Math.min(nodeById.get(a.start).x,nodeById.get(a.end).x)-Math.min(nodeById.get(b.start).x,nodeById.get(b.end).x)).forEach(m=>{
      const na=nodeById.get(m.start),nb=nodeById.get(m.end),a=P(na),b=P(nb),over=m.type==="کنسول رفتر";
      const hi=selectedIds.has(String(m.id));
      svg+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+(hi?"#dc2626":over?"#8b5cf6":"#334155")+'" stroke-width="'+(hi?13:over?7:9)+'" stroke-linecap="square"'+(over?' stroke-dasharray="7 4"':"")+'/>';
      if(hi){
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        svg+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#fff" stroke-width="2"/>';
        svg+='<text x="'+mid.x+'" y="'+(mid.y-15)+'" text-anchor="middle" fill="#991b1b" font-size="12" font-weight="bold" font-family="Tahoma,Arial">'+esc(m.id)+' — '+Number(m.length).toFixed(3)+' m</text>';
      }
    });
    frameMembers.forEach(m=>[m.start,m.end].forEach(id=>{
      const n=nodeById.get(id);if(!n)return;const p=P(n);
      svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="3.2" fill="#64748b"/>';
    }));
    const cp=nodeById.get(critical.nodeId);
    if(cp){
      const p=P(cp);
      svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="8" fill="#facc15" stroke="#991b1b" stroke-width="2"/>';
      svg+='<text x="'+(p.x+10)+'" y="'+(p.y-13)+'" fill="#7f1d1d" font-size="13" font-weight="bold" font-family="Tahoma,Arial">'+esc(critical.nodeId)+' — تاج سقف</text>';
    }
    const leftCan=frameMembers.find(m=>m.type==="کنسول رفتر"&&Math.min(nodeById.get(m.start).x,nodeById.get(m.end).x)<0);
    if(leftCan){
      const a=P(nodeById.get(leftCan.start)),b=P(nodeById.get(leftCan.end)),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      svg+='<text x="'+mid.x+'" y="'+(mid.y+25)+'" text-anchor="middle" fill="#6d28d9" font-size="11" font-family="Tahoma,Arial">کنسول سایه‌بان</text>';
    }
    svg+='<text x="340" y="328" text-anchor="middle" fill="#475569" font-size="11" font-family="Tahoma,Arial">قطعات قرمز، اعضای مدل متصل به گره بحرانی‌اند؛ خط‌چین بنفش کنسول رفتر را نشان می‌دهد.</text>';
    // Schematic built-up I-girder cross-section; dimensions are intentionally not implied.
    svg+='<rect x="700" y="48" width="255" height="258" rx="8" fill="#fff" stroke="#cbd5e1"/>';
    svg+='<text x="827" y="72" text-anchor="middle" fill="#123b52" font-size="14" font-weight="bold" font-family="Tahoma,Arial">مقطع شماتیک تیرورق</text>';
    svg+='<rect x="765" y="95" width="125" height="18" fill="#64748b" stroke="#334155"/>';
    svg+='<rect x="817" y="113" width="21" height="105" fill="#94a3b8" stroke="#334155"/>';
    svg+='<rect x="765" y="218" width="125" height="18" fill="#64748b" stroke="#334155"/>';
    svg+='<text x="900" y="108" fill="#334155" font-size="11" font-family="Tahoma,Arial">بال بالا</text>';
    svg+='<text x="850" y="170" fill="#334155" font-size="11" font-family="Tahoma,Arial">جان</text>';
    svg+='<text x="900" y="232" fill="#334155" font-size="11" font-family="Tahoma,Arial">بال پایین</text>';
    svg+='<text x="827" y="265" text-anchor="middle" fill="#64748b" font-size="10" font-family="Tahoma,Arial">صرفاً شماتیک؛ نه به مقیاس</text>';
    svg+='<text x="827" y="282" text-anchor="middle" fill="#64748b" font-size="10" font-family="Tahoma,Arial">ابعاد واقعی مقطع هنوز درج نشده</text>';
    svg+='</svg>';
    const sameNode=selected.every(m=>m.start===critical.nodeId||m.end===critical.nodeId);
    box.innerHTML=svg+'<p style="margin:8px 0 0"><b>نتیجه اتصال:</b> '+(sameNode?'قطعات قرمز در گره مشترک '+esc(critical.nodeId)+' به هم می‌رسند؛ در مدل، این گره مشترک است و قطعه کوتاه به‌عنوان تیر مستقل و جدا از رفتر تعریف نشده.':'اتصال قطعات به گره بحرانی نیازمند بازبینی است.')+'</p><p style="margin:4px 0 0">نمای بالا مربوط به '+esc(contextLabel||"مدل تحلیل‌شده")+' است. شکل I فقط نوع مقطع را نشان می‌دهد؛ چون ابعاد جان و بال در گزارش موجود نیست، اندازه واقعی مقطع نمایش داده نشده است.</p>';
  }
  function showSummary(){
    if(!model)return;const counts={};model.members.forEach(m=>counts[m.type]=(counts[m.type]||0)+1);
    const rows=Object.entries(counts).map(x=>"<tr><td>"+x[0]+"</td><td>"+x[1]+"</td></tr>").join("");
    const runway=model.geometry.craneRunway;
    const runwayAudit=runway?.sectionAudit||null;
    const runwayProps=runway?.sectionProperties;
    const runwayPropsText=runwayProps?.available?" <p><b>خواص هندسی مقدماتی تیرورق I:</b> A="+(runwayProps.area_mm2/100).toFixed(2)+" cm²؛ Ix="+(runwayProps.Ix_mm4/1e4).toFixed(2)+" cm⁴؛ Iy="+(runwayProps.Iy_mm4/1e4).toFixed(2)+" cm⁴؛ Sx="+(runwayProps.Sx_mm3/1e3).toFixed(2)+" cm³؛ Sy="+(runwayProps.Sy_mm3/1e3).toFixed(2)+" cm³؛ جرم فولاد="+runwayProps.steelMass_kg_m.toFixed(2)+" kg/m (بدون ریل). J تقریبی="+(runwayProps.J_approx_mm4/1e4).toFixed(2)+" cm⁴.</p>":"";
    const runwayWeb=runway?.webAudit||{};
    const runwayWebText=runway?.enabled?" <p><b>ممیزی مقدماتی جان و سخت‌کننده:</b> "+(runwayWeb.ready?"اطلاعات هندسی کامل است؛ ظرفیت جان، لهیدگی و جوش هنوز کنترل نشده‌اند.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayWeb.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayWeb.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayWeb.dimensional||[]).join("، "))+(Number.isFinite(runwayWeb.webSlenderness)?"؛ نسبت ارتفاع آزاد جان به ضخامت: "+runwayWeb.webSlenderness.toFixed(1):"")+"</p>":"";
    const runwayLoad=runway?.loadPathAudit||{};
    const runwayContact=runway?.contactScreen||{};
    const runwayFastening=runway?.fasteningAudit||{};
    const runwayRailLayout=runway?.railLayoutAudit||{};
    const runwayRailLayoutText=runway?.enabled?" <p><b>مدل طولی ریل:</b> "+(runwayRailLayout.ready?"ایستگاه‌های هندسی: "+(runwayRailLayout.supportStations||[]).length+"؛ وصله‌های ثبت‌شده: "+(runwayRailLayout.jointPositions_m||[]).length+"؛ رفتار پیوستگی: "+(runway.railLayoutInputs?.continuity||"نامشخص")+"؛ تحلیل تیر ریل هنوز غیرفعال است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayRailLayout.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayRailLayout.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayRailLayout.dimensional||[]).join("، "))+" "+(runwayRailLayout.note||"")+"</p>":"";
    const runwayFasteningText=runway?.enabled?" <p><b>ممیزی بست‌ها، پیچ‌ها، ورق زیرسری و پد:</b> "+(runwayFastening.ready?"فیلدهای اطلاعاتی اولیه کامل‌اند؛ ظرفیت اتصالات و رفتار پد محاسبه نشده است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayFastening.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayFastening.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayFastening.dimensional||[]).join("، "))+" "+(runwayFastening.note||"")+"</p>":"";
    const runwayContactText=runway?.enabled?" <p><b>غربالگری فشار متوسط اسمی تماس چرخ:</b> "+(runwayContact.available?"بار چرخ "+runwayContact.wheelLoad_t+" تن؛ سطح مستطیلی اسمی "+runwayContact.contactArea_mm2.toFixed(0)+" mm²؛ فشار متوسط اسمی "+runwayContact.nominalAveragePressure_MPa.toFixed(3)+" MPa.":"قابل محاسبه نیست؛ اطلاعات لازم: "+(runwayContact.missing||[]).join("، "))+" <br>این مقدار فشار واقعی تماس هرتز یا کنترل مقاومت ریل/تیر نیست و معیار پذیرش طراحی محسوب نمی‌شود.</p>":"";
    const runwayLoadText=runway?.enabled?" <p><b>ممیزی هندسه مسیر بار ریل و چرخ:</b> "+(runwayLoad.ready?"ابعاد اولیه کامل‌اند؛ تحلیل توزیع بار و ظرفیت انجام نشده است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayLoad.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayLoad.invalid||[]).join("، ")+"؛ کنترل هندسی: "+(runwayLoad.dimensional||[]).join("، "))+"</p>"+runwayContactText+runwayFasteningText+runwayRailLayoutText:"";
    const runwayAuditText=runway?.enabled?" <p><b>ممیزی مقدماتی تیر حمال و ریل:</b> "+(runwayAudit?.ready?"فیلدهای ورودی کامل‌اند؛ طراحی و تأیید مهندسی هنوز انجام نشده است.":"ناقص/نیازمند اصلاح؛ موارد ناقص: "+(runwayAudit?.missing||[]).join("، ")+"؛ مقادیر نامعتبر: "+(runwayAudit?.invalid||[]).join("، ")+"؛ کنترل ابعادی: "+(runwayAudit?.dimensional||[]).join("، "))+"</p>"+runwayPropsText+runwayWebText+runwayLoadText:"";
    const target=$("fullModelSummary");if(target)target.innerHTML="<b>مدل هندسی تولید شد:</b> "+model.geometry.frames.length+" قاب اصلی، "+model.nodes.length+" گره و "+model.members.length+" عضو هندسی."+(runway?.enabled?" گره‌های آماده اتصال تیر حمال: "+runway.supportNodeCount+" در تراز "+runway.elevationM+" متر؛ وضعیت هندسه تیر حمال: "+(runway.geometryStatus||"ثبت نشده")+"؛ قطعات تیر حمال: "+(runway.beamSegments?.length||0)+"؛ براکت‌های هندسی: "+(runway.brackets?.length||0)+"؛ این اجزا فقط داده هندسی جدا از حل‌گر هستند.":"")+runwayAuditText + "<table><thead><tr><th>نوع عضو</th><th>تعداد</th></tr></thead><tbody>"+rows+"</tbody></table><p>بارهای ثقلی سطحی به بار خطی اعضا تبدیل می‌شوند؛ بارهای مرده، زنده و برف و سه ترکیب ثقلی ULS-1 تا ULS-3 در حل‌گر خطی قابل تحلیل‌اند. بار باد و ترکیبات دارای باد/زلزله هنوز در حل‌گر اعمال نمی‌شوند. پرلین‌های سقف به‌صورت قطعات مجزا بین دو قاب ساخته شده‌اند؛ در تحلیل، انتقال جابه‌جایی در محل تکیه‌گاه برقرار و هر سه دوران انتهای هر قطعه آزاد شده است تا پرلین دهانه مجاور پیوسته فرض نشود. این مدل، مفصل ایده‌آل است و سختی واقعی کلیپس/پیچ، لغزش و اثر خروج از مرکزیت را شامل نمی‌شود؛ سایر گره‌های مشترک فعلاً صلب‌اند. مهاربندهای ترسیم‌شده نیز با مقطع تخصیص‌یافته فعال و در سختی سازه مؤثرند. اگر اتصال واقعی مفصلی، کشویی یا دارای آزادسازی باشد، نتایج فعلی می‌تواند تفاوت قابل‌توجهی داشته باشد.</p><p><b>محدوده مدل:</b> تحلیل الاستیک خطی سه‌بعدی در حال توسعه است؛ خروجی آن تا تکمیل بارگذاری، شرایط تکیه‌گاهی، آزادسازی‌ها و کنترل‌های آیین‌نامه‌ای، صرفاً مقدماتی است.</p>";
  }
  function validate3DSections(){
    if(!model)build();
    const groups=new Map();
    model.members.forEach(m=>{
      const key=m.sectionKey||"unassigned";
      if(!groups.has(key))groups.set(key,{key,count:0,member:m});
      groups.get(key).count++;
    });
    const missing=[];
    groups.forEach(g=>{
      try{
        if(g.member.craneIntegration===true){
          const s=g.member.analysisSection;
          const keys=["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"];
          if(!s||keys.some(k=>!(Number.isFinite(Number(s[k]))&&Number(s[k])>0)))
            throw new Error("خواص مستند SI تیر حمال/براکت جرثقیل ناقص است.");
          if(!String(g.member.reference||"").trim())
            throw new Error("مرجع نقشه عضو جرثقیل ثبت نشده است.");
        }else{
          if(!window.SteelSections||typeof window.SteelSections.resolveAnalysis3DSection!=="function")
            throw new Error("اتصال تخصیص‌دهنده مقطع هنوز بارگذاری نشده است.");
          window.SteelSections.resolveAnalysis3DSection(g.member);
        }
      }catch(e){
        const labels={column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید افقی دیوار",endPost:"ستونک دیوار انتهایی",endGirt:"تیر افقی دیوار انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
        missing.push({key:g.key,label:labels[g.key]||g.key,count:g.count,reason:e.message});
      }
    });
    return {ready:missing.length===0,groupCount:groups.size,memberCount:model.members.length,missing};
  }
  function run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports,extraOptions){
    return new Promise((resolve,reject)=>{
      let worker;
      try{
        worker=new Worker(new URL("js/analysis-3d-worker.js?v=20261114-crane-section-loads1",window.location.href));
      }catch(error){
        reject(new Error("امکان راه‌اندازی پردازشگر پس‌زمینه وجود ندارد: "+error.message));
        return;
      }
      let settled=false;
      const watchdog=setTimeout(()=>{
        finish(reject,new Error("پردازشگر تحلیل سه‌بعدی پس از ۱۲۰ ثانیه پاسخ نداد؛ اجرای این حالت متوقف شد تا دکمه قفل نماند."));
      },120000);
      const finish=(fn,value)=>{
        if(settled)return;
        settled=true;
        clearTimeout(watchdog);
        worker.terminate();
        fn(value);
      };
      worker.onmessage=event=>{
        const data=event.data||{};
        if(data.ok)finish(resolve,data.result);
        else finish(reject,new Error(data.error?.message||"حل‌گر پس‌زمینه پاسخ نامعتبر برگرداند."));
      };
      worker.onerror=event=>{
        event.preventDefault?.();
        finish(reject,new Error("خطای پردازشگر تحلیل سه‌بعدی: "+(event.message||"خطای ناشناخته")));
      };
      try{
        worker.postMessage({
          model:analysisModel,
          sectionsByMemberId,
          supports,
          releasePurlinRafterRotation:true,
          nodalLoads:Array.isArray(extraOptions?.nodalLoads)?extraOptions.nodalLoads:[],
          requireExplicitMemberLoads:true
        });
      }catch(error){
        finish(reject,new Error("ارسال مدل به پردازشگر پس‌زمینه ناموفق بود: "+error.message));
      }
    });
  }
  async function analyze3D(loadCase){
    if(!model)build();
    if(!window.SteelFrame3D||typeof window.SteelFrame3D.makeTransform!=="function")
      throw new Error("هسته هندسی حل‌گر سه‌بعدی بارگذاری نشده است.");
    const readiness=validate3DSections();
    if(!readiness.ready){
      const first=readiness.missing[0];
      throw new Error("مشخصات مقطع "+first.label+" ناقص است: "+first.reason+
        "؛ تعداد اعضای این گروه: "+first.count);
    }
    const cases={
      dead:{key:"dead",label:"مرده",direction:[0,-1,0],deadFactor:1},
      live:{key:"live",label:"زنده",direction:[0,-1,0],deadFactor:0},
      snow:{key:"snow",label:"برف",direction:[0,-1,0],deadFactor:0},
      wind:{key:"wind",label:"باد ـ فشار خالص ورودی",direction:null,deadFactor:0}
    };
    let selected=cases[loadCase];
    if(loadCase&&typeof loadCase==="object"&&loadCase.factors){
      const f=loadCase.factors;
      const factorKeys=["dead","live","snow","wind"];
      const badFactors=factorKeys.filter(k=>f[k]===undefined||f[k]===null||f[k]===""||!Number.isFinite(Number(f[k]))||Number(f[k])<0);
      if(badFactors.length)throw new Error("ضرایب ترکیب بار باید برای D/L/S/W صریح، عددی و نامنفی باشند: "+badFactors.join("، "));
      const windSign=loadCase.windSign===undefined?1:Number(loadCase.windSign);
      if(![1,-1].includes(windSign))throw new Error("علامت باد باید صریحاً +1 یا -1 باشد.");
      selected={...loadCase,key:"combo",label:String(loadCase.label||"ترکیب بار سه‌بعدی"),
        direction:[0,-1,0],
        factors:{dead:Number(f.dead),live:Number(f.live),snow:Number(f.snow),wind:Number(f.wind)},
        windFactor:Number(f.wind),windSign,
        directionalWindPressures:loadCase.directionalWindPressures||null,
        directionalWindCaseId:loadCase.directionalWindCaseId||null,
        deadFactor:Number(f.dead)};
    }else if(/^combo[0-2]$/.test(loadCase)){
      const comboIndex=Number(loadCase.slice(5));
      const combo=window.SteelLoads?.getData?.().combinations?.[comboIndex];
      if(!combo)throw new Error("ضرایب ترکیب بار انتخابی در دسترس نیستند.");
      const raw={dead:combo.dead,live:combo.live,snow:combo.snow};
      if(Object.values(raw).some(v=>v===undefined||v===null||v===""))throw new Error("ضرایب ترکیب انتخابی ناقص است.");
      const f={dead:Number(raw.dead),live:Number(raw.live),snow:Number(raw.snow)};
      if(Object.values(f).some(v=>!Number.isFinite(v)||v<0))throw new Error("ضرایب ترکیب انتخابی ناقص یا نامعتبر است.");
      selected={key:loadCase,label:combo.name,direction:[0,-1,0],
        factors:{...f,wind:0},windFactor:0,windSign:1,
        deadFactor:f.dead};
    }
    if(!selected)throw new Error("حالت بار انتخابی پشتیبانی نمی‌شود." );
    const craneSeparation=auditCraneLoadCaseSeparation(selected);
    if(!craneSeparation.valid)throw new Error("ممیزی جداسازی بار جرثقیل ناموفق است: "+craneSeparation.issues.join("؛ "));
     if(!window.SteelWholeBuildingLoadPathAudit?.audit)throw new Error("ماژول ممیزی مسیر بار کل ساختمان بارگذاری نشده است؛ تحلیل متوقف شد." );
     const loadPathAudit=window.SteelWholeBuildingLoadPathAudit.audit(model,window.SteelLoads?.getData?.()||{});
     window.SteelStructuralModel.lastLoadPathAudit=loadPathAudit;
     if(!loadPathAudit.success)throw new Error("تحلیل سه‌بعدی به‌دلیل نقص ممیزی مسیر بار متوقف شد: "+loadPathAudit.issues.slice(0,8).join("؛ "));
    const analysisModel={
      nodes:model.nodes.map(n=>({...n})),
      members:model.members.map(m=>({...m}))
    };
    // Explicit concrete tie-beam routes are admitted only after geometry audit
    // and explicit joint selection. Unknown/invalid routes never enter the solver.
    const tieBeamIntegration={included:[],skipped:[],reinforcementWarnings:[]};
    const tieData=window.SteelTieBeamLayout?.getData?.();
    const tieAudit=window.SteelTieBeamLayout?.audit?.();
    if(tieData&&Array.isArray(tieData.routes)&&tieData.routes.length){
      const auditById=new Map((tieAudit?.rows||[]).map(r=>[String(r.id),r]));
      const nodeIds=new Set(analysisModel.nodes.map(n=>String(n.id)));
      tieData.routes.forEach(route=>{
        const id=String(route.id||"");
        const audited=auditById.get(id);
        const reasons=[];
        if(!audited||!audited.valid)reasons.push(...(audited?.reasons||["ممیزی هندسی مسیر در دسترس نیست"]));
         if(!(Number(route.heightM)>0))reasons.push("ارتفاع شناژ برای تعیین محور هندسی و بازوی صلب معتبر نیست.");
        if(!nodeIds.has(String(route.start))||!nodeIds.has(String(route.end)))reasons.push("گره ابتدا/انتها در مدل تحلیل فعلی وجود ندارد");
        if(!["rigid","pinned"].includes(route.startJoint)||!["rigid","pinned"].includes(route.endJoint))reasons.push("نوع اتصال هر دو انتها باید صریحاً گیردار یا مفصلی باشد");
        if(reasons.length){tieBeamIntegration.skipped.push({id,reasons});return;}
        const p=window.SteelTieBeamLayout.rectangleProperties(route,audited.axis);
        const startNode=analysisModel.nodes.find(n=>String(n.id)===String(route.start));
        const endNode=analysisModel.nodes.find(n=>String(n.id)===String(route.end));
        const coordinate=audited.axis==="X"?"x":"z";
        const cross=audited.axis==="X"?"z":"x";
        const direction=Math.sign(Number(endNode[coordinate])-Number(startNode[coordinate]));
        const span=Math.abs(Number(endNode[coordinate])-Number(startNode[coordinate]));
        const intermediate=analysisModel.nodes.filter(n=>
          (n.kind==="base"||n.kind==="endwall-base")&&
          Math.abs(Number(n.y)-Number(startNode.y))<=0.01&&
          Math.abs(Number(n[cross])-Number(startNode[cross]))<=0.01&&
          direction*(Number(n[coordinate])-Number(startNode[coordinate]))>0.01&&
          direction*(Number(endNode[coordinate])-Number(n[coordinate]))>0.01
        ).sort((a,b)=>direction*(Number(a[coordinate])-Number(b[coordinate])));
        const routeNodes=[startNode,...intermediate,endNode];
        const segmentIds=[];
        const warnings=audited.detailingWarnings||[];
        let segmentLength=0,duplicate=false;
        for(let si=0;si<routeNodes.length-1;si++){
          const ni=routeNodes[si],nj=routeNodes[si+1];
          const length=Math.hypot(nj.x-ni.x,nj.y-ni.y,nj.z-ni.z);
          if(!(length>0.001)){duplicate=true;break;}
          const memberId="TIE_BEAM_"+id.replace(/[^A-Za-z0-9_-]/g,"_")+"_S"+(si+1);
          if(analysisModel.members.some(m=>String(m.id)===memberId)){duplicate=true;break;}
          const releases={
            i:si===0&&route.startJoint==="pinned"?[4,5]:[],
            j:si===routeNodes.length-2&&route.endJoint==="pinned"?[4,5]:[]
          };
          analysisModel.members.push({
            id:memberId,start:ni.id,end:nj.id,type:"شناژ بتنی",
            sectionKey:"tieBeam",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"concrete-member-self-weight"},endReleases:releases,
            // Base-node joint is located at the common footing/tie top datum.
            // The beam physical centroidal axis is h/2 below that joint.
            endOffsets:{i:[0,-Number(route.heightM)/2,0],j:[0,-Number(route.heightM)/2,0]},
            tieBeamDensityKNm3:Number(route.densityKNm3),
            analysisSection:{E:p.E,G:p.G,A:p.A,Iy:p.Iy,Iz:p.Iz,J:p.J,sectionKey:"tieBeam",sectionLabel:"مقطع مستطیلی شناژ "+route.widthM+"×"+route.heightM+" m"}
          });
          segmentIds.push(memberId);segmentLength+=length;
        }
        if(duplicate){
          analysisModel.members=analysisModel.members.filter(m=>!segmentIds.includes(String(m.id)));
          tieBeamIntegration.skipped.push({id,reasons:["تقسیم مسیر در گره‌های پایه میانی با شناسه تکراری یا قطعه با طول صفر روبه‌رو شد"]});return;
        }
        tieBeamIntegration.included.push({id,memberId:segmentIds[0],memberIds:segmentIds,
          intermediateBaseNodes:intermediate.map(n=>n.id),start:route.start,end:route.end,
          startJoint:route.startJoint,endJoint:route.endJoint,axis:audited.axis,
          lengthM:segmentLength,segmentCount:segmentIds.length,
          volumeM3:segmentLength*route.widthM*route.heightM,
          selfWeightKN:segmentLength*route.widthM*route.heightM*route.densityKNm3,
          reinforcement:route.reinforcement||tieData.reinforcement,detailingWarnings:warnings,
          stiffnessBasis:"gross_uncracked_rectangular_concrete_section_with_rigid_end_offsets",
          topAlignment:"رویه بالای شناژ و رویه بالای پی هم‌تراز؛ محور هندسی عضو به‌اندازه نصف ارتفاع شناژ پایین‌تر است",
          centroidOffsetDownM:Number(route.heightM)/2,
          continuity:"مسیر در گره‌های پایه میانی به قطعات متصل با پیوستگی دوران تقسیم شده است"});
        if(warnings.length)tieBeamIntegration.reinforcementWarnings.push({id,warnings});
      });
    }
    const wallDeadLoadAudit=loadPathAudit.wallDeadLoadTransfer;
    if(!wallDeadLoadAudit?.success||wallDeadLoadAudit.loadTransferEnabled!==true)throw new Error("انتقال وزن مرده دیوار به شناژ/تکیه‌گاه‌های فونداسیون کامل نیست: "+(wallDeadLoadAudit?.issues||["ممیزی مسیر بار، انتقال معتبر وزن دیوار را تأیید نکرد."]).join("؛ "));
    const wallDeadMemberLoads=window.SteelWallDeadLoadTransfer.prepareMemberLineLoads(model,selected.deadFactor,wallDeadLoadAudit);
    wallDeadMemberLoads.forEach(load=>{
      const member=analysisModel.members.find(x=>String(x.id)===load.memberId);
      if(!member)throw new Error("عضو شناژ متناظر با بار دیوار پیدا نشد: "+load.memberId);
      member.lineLoads.dead=Number(member.lineLoads.dead||0)+load.lineLoadKNm;
      member.lineLoads.wallMasonryDead=load.lineLoadKNm;
      if(load.globalStartKNm&&load.globalEndKNm){
        member.lineLoads.wallMasonryLinearGlobalKNm={start:load.globalStartKNm.slice(),end:load.globalEndKNm.slice(),average:load.lineLoadKNm,distribution:load.distribution||"linear-global-vertical"};
      }
    });
    const gradeBeamWallWeightKN=wallDeadLoadAudit.rows.filter(r=>r.status==="grade-beam-line-load-ready").reduce((sum,r)=>sum+Number(r.weightKN||0),0);
    const wallDeadMemberLoadAudit=window.SteelWallDeadLoadTransfer.auditAppliedMemberLoadResultant(analysisModel,wallDeadMemberLoads,gradeBeamWallWeightKN,selected.deadFactor);
    if(!wallDeadMemberLoadAudit.success)throw new Error("ممیزی برآیند بار دیوار روی شناژ ناموفق است: "+wallDeadMemberLoadAudit.issues.join("؛ "));
    // Build an indexed node registry and validate connectivity before creating element loads.
    const nodeById=new Map();
    const duplicateNodeIds=[];
    analysisModel.nodes.forEach(n=>{
      if(nodeById.has(n.id)) duplicateNodeIds.push(n.id);
      else nodeById.set(n.id,n);
    });
    if(duplicateNodeIds.length){
      throw new Error("شناسه گره تکراری در مدل: "+duplicateNodeIds.slice(0,8).join("، ")+
        "؛ تعداد گره‌ها: "+analysisModel.nodes.length);
    }
    // Tapered columns/rafters are split into analysis elements before section assignment.
    // Each segment receives its own midpoint section properties and self-weight.
    let taperedSegmentationAudit=null;
    if(window.SteelTaperedSections&&typeof window.SteelTaperedSections.segmentModel==="function"){
      const segmented=window.SteelTaperedSections.segmentModel(analysisModel,
        {span:Number(model.geometry?.span||$("span")?.value),height:Number($("height")?.value)},window.SteelTaperedSections.getData?.().segmentsPerMember||8);
      analysisModel.nodes=segmented.model.nodes;
      analysisModel.members=segmented.model.members;
      taperedSegmentationAudit=segmented.audit;
      analysisModel.nodes.slice(model.nodes.length).forEach(n=>nodeById.set(n.id,n));
    }
    // Self-weight is added to the DEAD case only. Steel unit weight = 78.5 kN/m³.
    // Area A comes from the same assigned section properties used by the 3D solver.
    const steelUnitWeightKNm3=78.5;
    let selfWeightKN=0, selfWeightMemberCount=0;
    const selfWeightByGroup=Object.create(null);
    const sectionsByMemberId=Object.create(null);
    analysisModel.members.forEach(m=>{
      if(!m.lineLoads||!["dead","live","snow","wind","windLeft","windRight","windEnd"].every(k=>Number.isFinite(m.lineLoads[k])))
        throw new Error("دفتر بار عضو "+m.id+" ناقص است؛ مقادیر صفر نیز باید صریح ثبت شوند.");
      const lineLoad=selected.factors
        ? (m.lineLoads.dead*selected.factors.dead+
           m.lineLoads.live*selected.factors.live+
           m.lineLoads.snow*selected.factors.snow)
        : m.lineLoads[selected.key];
      if(!Number.isFinite(lineLoad))throw new Error("بار عضو "+m.id+" عدد معتبر نیست.");
      const a=nodeById.get(m.start);
      const b=nodeById.get(m.end);
      if(!a||!b){
        const missing=[!a?"ابتدا "+String(m.start):"",!b?"انتها "+String(m.end):""].filter(Boolean).join(" و ");
        const sample=analysisModel.nodes.slice(-8).map(n=>n.id).join("، ");
        throw new Error("اتصال هندسی عضو "+m.id+" ("+m.type+") ناقص است؛ گره ناموجود: "+
          missing+"؛ تعداد گره‌های مدل: "+analysisModel.nodes.length+
          "؛ شناسه‌های پایانی گره‌ها: "+sample+
          "؛ لطفاً این پیام کامل را برای بررسی بفرستید.");
      }
      let section;
      if(m.sectionKey==="tieBeam")section=m.analysisSection;
      else if(m.craneIntegration===true){
        const cs=m.analysisSection||{};
        const keys=["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"];
        if(keys.some(k=>!(Number.isFinite(Number(cs[k]))&&Number(cs[k])>0)))
          throw new Error("خواص SI عضو جرثقیل "+m.id+" ناقص است.");
        section={E:Number(cs.E_Pa),G:Number(cs.G_Pa),A:Number(cs.A_m2),Iy:Number(cs.Iy_m4),Iz:Number(cs.Iz_m4),J:Number(cs.J_m4),sectionKey:m.sectionKey,sectionLabel:m.sectionKey+" ـ مقطع مستند جرثقیل"};
      }else section=window.SteelSections.resolveAnalysis3DSection(m);
      if(m.sectionKey!=="tieBeam"&&window.SteelTaperedSections&&typeof window.SteelTaperedSections.resolveForMember==="function"){
        const taper=window.SteelTaperedSections.resolveForMember(m,analysisModel.nodes,{span:Number($("span")?.value),height:Number($("height")?.value)},section);
        section=taper.section;
        if(taper.applied){
          m.taperApplied=true;m.taperCoordinate=taper.coordinate;m.taperProperties=taper.properties;
        }
      }
      sectionsByMemberId[String(m.id)]={E:section.E,G:section.G,A:section.A,Iy:section.Iy,Iz:section.Iz,J:section.J,sectionKey:section.sectionKey,sectionLabel:section.sectionLabel,profile:section.profile};
      let selfWeightLineLoad=0;
      if(selected.deadFactor>0){
        const memberLength=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
        const memberUnitWeight=m.sectionKey==="tieBeam"?Number(m.tieBeamDensityKNm3):steelUnitWeightKNm3;
        if(!(memberUnitWeight>0&&Number.isFinite(memberUnitWeight)))throw new Error("وزن مخصوص عضو "+m.id+" معتبر نیست.");
        selfWeightLineLoad=section.A*memberUnitWeight*selected.deadFactor;
        const memberWeight=selfWeightLineLoad*memberLength;
        selfWeightKN+=memberWeight;
        selfWeightMemberCount++;
        const groupKey=String(m.sectionKey||"unknown");
        const group=selfWeightByGroup[groupKey]||(selfWeightByGroup[groupKey]={count:0,lengthM:0,areaM2:section.A,unitWeightKNm3:memberUnitWeight,totalKN:0});
        group.count++;group.lengthM+=memberLength;group.totalKN+=memberWeight;
      }
      const totalLineLoad=lineLoad+selfWeightLineLoad;
      const tr=window.SteelFrame3D.makeTransform([a.x,a.y,a.z],[b.x,b.y,b.z]);
      let global;
      if(selected.key==="wind"||selected.windFactor>0){
        // Wind inputs are signed NET pressures (kN/m²), not basic wind speed.
        const windFactor=selected.key==="wind"?1:selected.windFactor;
        const windSign=selected.key==="wind"?1:selected.windSign;
        // Positive = pressure toward the enclosed building; negative = suction.
        // Roof pressure is transferred to purlins normal to each roof slope.
        // Side-wall pressure is transferred to longitudinal wall girts, normal to the wall.
        global=[0,0,0];
        // A wind combination carries its factored gravity actions as well.
        if(selected.key!=="wind")global[1]-=totalLineLoad*1000;
        const directional=selected.directionalWindPressures
          ?window.SteelDirectionalWind3D?.mapMemberLoad?.(m,selected.directionalWindPressures,model.geometry)
          :null;
        if(selected.directionalWindPressures&&!directional)
          throw new Error("مبدل بار باد جهت‌دار بارگذاری نشده یا عضو پشتیبانی نمی‌شود: "+m.id);
        if(directional){
          const windGlobal=directional.globalKNm.map(v=>v*1000);
          global=window.SteelDirectionalWind3D.combineGlobalLoads(global,windGlobal,windFactor);
        }else if(m.sectionKey==="roofPurlin"){
          const half=Number(model.geometry.span)/2,rise=Number(model.geometry.rise),slope=rise/half,norm=Math.hypot(slope,1);
          const leftWidth=m.side==="ridge"?Number(m.lineLoads?.tributaryWidthLeft||0):(m.side==="left"?Number(m.lineLoads?.tributaryWidth||0):0);
          const rightWidth=m.side==="ridge"?Number(m.lineLoads?.tributaryWidthRight||0):(m.side==="right"?Number(m.lineLoads?.tributaryWidth||0):0);
          const left=Number(m.lineLoads?.windLeft||0)*windSign*1000*windFactor,right=Number(m.lineLoads?.windRight||0)*windSign*1000*windFactor;
          global[0]+=left*slope/norm-right*slope/norm;
          global[1]-=(left+right)/norm;
        }else if(m.sectionKey==="wallGirt"){
          const wall=Number(m.lineLoads?.wind||0)*windSign*1000*windFactor;
          global[0]+=m.side==="left"?wall:-wall;
        }else if(m.sectionKey==="endGirt"){
          const endWall=Number(m.lineLoads?.windEnd||0)*windSign*1000*windFactor;
          global[2]+=m.endFace==="front"?endWall:-endWall;
        }
      }else{
        global=selected.direction.map(v=>v*totalLineLoad*1000);
      }
      const axes=[tr.axes.x,tr.axes.y,tr.axes.z];
      const local=axes.map(axis=>axis.reduce((sum,v,i)=>sum+v*global[i],0));
      m.analysisLoad={uniformLocal:local,globalUniform:global};
      const wallLinear=m.lineLoads?.wallMasonryLinearGlobalKNm;
      if(wallLinear&&selected.deadFactor>0){
        const averageGlobal=[0,-Number(wallLinear.average)*1000,0];
        const startGlobal=wallLinear.start.map((v,i)=>(Number(v)*1000-averageGlobal[i])*selected.deadFactor);
        const endGlobal=wallLinear.end.map((v,i)=>(Number(v)*1000-averageGlobal[i])*selected.deadFactor);
        m.analysisLoad.linearLocal={
          start:axes.map(axis=>axis.reduce((sum,v,i)=>sum+v*startGlobal[i],0)),
          end:axes.map(axis=>axis.reduce((sum,v,i)=>sum+v*endGlobal[i],0))
        };
      }
      m.analysisLoad.selfWeightKNm=selfWeightLineLoad;
    });
    if(!window.SteelMemberLoadPreflight?.audit)throw new Error("ماژول ممیزی نهایی بار تک‌تک اعضا بارگذاری نشده است.");
    const preparedMemberLoadAudit=window.SteelMemberLoadPreflight.audit(analysisModel.members);
    if(!preparedMemberLoadAudit.success)throw new Error("ممیزی نهایی بار اعضا پیش از حل‌گر ناموفق است: "+preparedMemberLoadAudit.issues.slice(0,10).join("؛ "));
    // A complete member load ledger plus explicit local/global uniform and optional linear-local vectors certifies
    // the supported uniform member-load model for section-force reconstruction.
    // This is load-data completeness only; it is not a resistance/design approval.
    analysisModel.members.forEach(m=>{if(m.analysisLoad)m.analysisLoad.loadDataComplete=preparedMemberLoadAudit.success;});
    const fixed= $("baseConnection")?.value==="fixed";
    const supports=analysisModel.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>({
      nodeId:n.id,
      fixedDofs:fixed?[0,1,2,3,4,5]:[0,1,2]
    }));
    if(!supports.length)throw new Error("هیچ گره پایه‌ای برای تعریف تکیه‌گاه پیدا نشد.");
    const wallDeadNodalLoads=window.SteelWallDeadLoadTransfer.prepareNodalLoads(model,selected.deadFactor,wallDeadLoadAudit);
    let gableWindEccentricTransfer={success:true,loads:[],rows:[],issues:[],analysisEnabled:false,designApproved:false};
    if(selected.directionalWindPressures){
      if(!window.SteelGableEccentricLoadTransfer?.prepareNodalLoads)throw new Error("ماژول انتقال خروج از مرکزیت باد گابل بارگذاری نشده است.");
      const gableWindFactor=selected.key==="wind"?1:Number(selected.windFactor??0);
      const gableWindSign=selected.windSign===undefined?1:Number(selected.windSign);
      gableWindEccentricTransfer=window.SteelGableEccentricLoadTransfer.prepareNodalLoads(model,selected.directionalWindPressures.surfaces,gableWindFactor,gableWindSign);
      if(!gableWindEccentricTransfer.success)throw new Error("انتقال بار متغیر و خروج از مرکزیت گابل ناموفق است: "+gableWindEccentricTransfer.issues.slice(0,8).join("؛ "));
    }
    const allNodalLoads=[...(Array.isArray(selected.nodalLoads)?selected.nodalLoads:[]),...wallDeadNodalLoads,...gableWindEccentricTransfer.loads];
    const nodalMap=new Map();
    allNodalLoads.forEach(load=>{
      if(!load||load.nodeId==null||!Array.isArray(load.values)||load.values.length!==6||load.values.some(v=>!Number.isFinite(v)))throw new Error("بار گره‌ای افزوده دارای شناسه یا بردار شش‌مؤلفه‌ای نامعتبر است.");
      const id=String(load.nodeId),entry=nodalMap.get(id)||{nodeId:id,values:[0,0,0,0,0,0]};
      load.values.forEach((v,i)=>entry.values[i]+=v);nodalMap.set(id,entry);
    });
    const customNodalLoads=[...nodalMap.values()];
    const result=await run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports,{nodalLoads:customNodalLoads});
    if(tieBeamIntegration.included.length){
      if(!window.SteelTieBeamSolverAudit?.audit)throw new Error("ممیزی پس از حل‌گر شناژ بارگذاری نشده است؛ نتیجه تحلیل شناژ قابل تأیید نیست.");
      tieBeamIntegration.solverAudit=window.SteelTieBeamSolverAudit.audit(analysisModel,result,tieBeamIntegration,selected);
      if(!tieBeamIntegration.solverAudit.success)throw new Error("ممیزی ورود واقعی شناژ به حل‌گر ناموفق است: "+tieBeamIntegration.solverAudit.issues.slice(0,12).join("؛ "));
    }else{
      tieBeamIntegration.solverAudit={schemaVersion:1,success:true,expectedSegments:0,verifiedSegments:0,rows:[],issues:[],designApproved:false,note:"در این حالت بارگذاری هیچ مسیر شناژ معتبری برای ورود به حل‌گر ثبت نشده است."};
    }
    result.additionalNodalLoadCount=customNodalLoads.length;
    if(!window.SteelStructuralLoadChain?.auditSolverLoadTransfer)throw new Error("ممیزی مستقل دفتر بار و تعادل واکنش‌ها بارگذاری نشده است؛ نتیجه برای طراحی قابل استفاده نیست.");
    result.solverLoadTransferAudit=window.SteelStructuralLoadChain.auditSolverLoadTransfer(
      analysisModel,result,customNodalLoads);
    result.solverLoadTransferAudit.generatedAt=new Date().toISOString();
    result.solverLoadTransferAudit.memberCount=analysisModel.members.length;
    result.solverLoadTransferAudit.nodalLoadCount=customNodalLoads.length;
    result.solverLoadTransferAudit.designDemandEligible=result.solverLoadTransferAudit.success===true;
    result.designDemandEligible=result.solverLoadTransferAudit.success===true;
    if(!result.solverLoadTransferAudit.success){
      result.designGate={...(result.designGate||{}),capacityCalculated:false,codeInteractionCalculated:false,
        designApproved:false,readyForCodeDesign:false,blockedByLoadTransferAudit:true};
    }
    result.wallDeadLoadTransfer={totalWeightKN:wallDeadLoadAudit.totalWeightKN,deadFactor:selected.deadFactor,appliedWeightKN:wallDeadLoadAudit.totalWeightKN*selected.deadFactor,faces:wallDeadLoadAudit.rows,nodalLoads:wallDeadNodalLoads,memberLineLoads:wallDeadMemberLoads,appliedToTieBeamMembers:wallDeadMemberLoads.length>0,memberLoadAudit:wallDeadMemberLoadAudit};
    result.wallDeadLoadTransfer.globalReactionEquilibrium=result.equilibrium?{
      success:result.equilibrium.ok===true,
      relativeForceResidual:result.equilibrium.relativeForceResidual,
      relativeMomentResidual:result.equilibrium.relativeMomentResidual,
      appliedForceN:result.equilibrium.appliedForceN,
      supportReactionN:result.equilibrium.supportReactionN,
      forceResidualN:result.equilibrium.forceResidualN,
      appliedMomentNm:result.equilibrium.appliedMomentNm,
      supportMomentNm:result.equilibrium.supportMomentNm,
      momentResidualNm:result.equilibrium.momentResidualNm,
      scope:"تعادل کلی همه بارهای مدل؛ واکنش مستقل سهم دیوار در این مرحله تفکیک نشده است."
    }:{success:false,scope:"گزارش تعادل حل‌گر در دسترس نیست."};
    result.gableWindEccentricTransfer={success:gableWindEccentricTransfer.success,windFactor:gableWindEccentricTransfer.windFactor??0,windSign:gableWindEccentricTransfer.windSign??1,memberCount:gableWindEccentricTransfer.rows.length,nodalLoadCount:gableWindEccentricTransfer.loads.length,rows:gableWindEccentricTransfer.rows,method:gableWindEccentricTransfer.method,analysisEnabled:!!selected.directionalWindPressures,designApproved:false};
    result.loadPathAudit=loadPathAudit;
     result.preparedMemberLoadAudit=preparedMemberLoadAudit;
     result.memberLoadLedger=analysisModel.members.map(m=>({
       memberId:String(m.id),type:String(m.type||""),sectionKey:String(m.sectionKey||""),
       start:String(m.start),end:String(m.end),
       lineLoads:m.lineLoads?JSON.parse(JSON.stringify(m.lineLoads)):null,
       appliedAnalysisLoad:m.analysisLoad?JSON.parse(JSON.stringify(m.analysisLoad)):null,
       loadRole:m.lineLoads?.loadRole||(
         m.sectionKey==="roofPurlin"?"roof-surface-tributary-load":
         m.sectionKey==="wallGirt"?"longitudinal-wall-pressure":
         m.sectionKey==="endGirt"?"end-wall-pressure":
         /رفتر/.test(String(m.type||""))?"purlin-reactions-and-self-weight":
         ["wallBrace","roofBrace"].includes(m.sectionKey)?"nodal-bracing-force-path":"member-self-weight-or-connected-reactions")
     }));
    result.craneLoadCaseId=selected.craneLoadCaseId||null;
    result.craneLoadTransfer=selected.craneLoadTransfer||null;
    if(taperedSegmentationAudit)result.taperedSegmentation=taperedSegmentationAudit;
    const sourceMembersById=new Map(analysisModel.members.map(m=>[String(m.id),m]));
    result.members.forEach(member=>{
      const source=sourceMembersById.get(String(member.id));
      if(source?.analysisLoad)member.analysisLoad=JSON.parse(JSON.stringify(source.analysisLoad));
      if(source?.taperApplied===true){
        member.parentMemberId=String(source.parentMemberId||"");
        member.taperSegmentIndex=Number(source.taperSegmentIndex);
        member.taperSegmentCount=Number(source.taperSegmentCount);
        member.taperApplied=true;
        member.taperCoordinate=Number(source.taperCoordinate);
        member.taperDimensions=source.taperProperties?.dimensions?JSON.parse(JSON.stringify(source.taperProperties.dimensions)):null;
        member.taperProperties=source.taperProperties?JSON.parse(JSON.stringify(source.taperProperties)):null;
      }
    });
    if(taperedSegmentationAudit?.splitMemberCount>0){
      if(!window.SteelTaperedSectionPropertyAudit?.audit)throw new Error("ممیزی مستقل خواص هندسی مقاطع متغیرمقطع بارگذاری نشده است.");
      result.taperedSectionPropertyAudit=window.SteelTaperedSectionPropertyAudit.audit(result);
      if(!result.taperedSectionPropertyAudit.success)throw new Error("خواص مقطع ثبت‌شده با ابعاد واقعی قطعات سازگار نیست: "+result.taperedSectionPropertyAudit.issues.slice(0,10).join("؛ "));
      if(!window.SteelTaperedMemberForceAudit?.audit)
        throw new Error("ممیزی ردیابی نیرو برای قطعات متغیرمقطع بارگذاری نشده است؛ نتیجه برای طراحی قابل استفاده نیست.");
      result.taperedMemberForceAudit=window.SteelTaperedMemberForceAudit.audit(result);
      if(!result.taperedMemberForceAudit.success)
        throw new Error("ردیابی نیروهای قطعات متغیرمقطع ناقص است: "+result.taperedMemberForceAudit.issues.slice(0,10).join("؛ "));
    }

    if(taperedSegmentationAudit?.splitMemberCount>0){
      if(window.SteelTaperedSectionForceDiagram?.build){
        result.taperedSectionForceDiagrams=window.SteelTaperedSectionForceDiagram.build(
          analysisModel,
          [{label:String(result.loadCaseLabel||selected.label||selected.key||""),equilibrium:result.equilibrium,members:result.members}],
          {diagramOptions:{stationCount:21}}
        );
      }else{
        result.taperedSectionForceDiagrams={success:false,status:"missing-module",issues:["ماژول نمودار نیرو برای قطعات متغیرمقطع بارگذاری نشده است."],analysisEnabled:false,designApproved:false};
      }
    }

    if(result.maxDisplacement){
      const criticalNode=analysisModel.nodes.find(n=>n.id===result.maxDisplacement.nodeId);
      if(criticalNode){
        result.criticalDisplacement={
          nodeId:criticalNode.id,
          kind:criticalNode.kind||"",
          coordinates:{x:criticalNode.x,y:criticalNode.y,z:criticalNode.z},
          ux:result.maxDisplacement.components[0],
          uy:result.maxDisplacement.components[1],
          uz:result.maxDisplacement.components[2],
          magnitude:result.maxDisplacement.magnitude,
          connectedMembers:analysisModel.members
            .filter(m=>m.start===criticalNode.id||m.end===criticalNode.id)
            .map(m=>({id:m.id,type:m.type,sectionKey:m.sectionKey,start:m.start,end:m.end}))
        };
      }
    }
    // Create a diagnostic report for members connected to the maximum-displacement node.
    // The force signs follow the solver's local member-end convention.
    if(result.criticalDisplacement&&Array.isArray(result.members)){
      const connectedIds=new Set(result.criticalDisplacement.connectedMembers.map(m=>String(m.id)));
      const analysisMemberById=new Map(analysisModel.members.map(x=>[String(x.id),x]));
      result.criticalMemberReport=result.members
        .filter(m=>connectedIds.has(String(m.id)))
        .map(m=>{
          const source=analysisMemberById.get(String(m.id))||{};
          const f=Array.isArray(m.localEndForces)?m.localEndForces:[];
          const section=m.section||{};
          return {
            id:m.id,type:m.type,length:m.length,start:source.start||null,end:source.end||null,
            profile:source.profile||source.sectionLabel||"",
            sectionKey:source.sectionKey||"",
            endI:{N:f[0],Vy:f[1],Vz:f[2],T:f[3],My:f[4],Mz:f[5]},
            endJ:{N:f[6],Vy:f[7],Vz:f[8],T:f[9],My:f[10],Mz:f[11]},
            section:{A:section.A,Iy:section.Iy,Iz:section.Iz,J:section.J,E:section.E,G:section.G},
            analysisLoad:source.analysisLoad?JSON.parse(JSON.stringify(source.analysisLoad)):null,
            localAxes:m.localAxes?JSON.parse(JSON.stringify(m.localAxes)):null
          };
        });
      result.criticalMemberDiagnostics={
        connectedCount:result.criticalMemberReport.length,
        withAnalysisLoad:result.criticalMemberReport.filter(m=>m.analysisLoad!==null).length,
        withLocalAxes:result.criticalMemberReport.filter(m=>m.localAxes!==null).length,
        sourceMemberCount:analysisModel.members.length,
        solverMemberCount:result.members.length
      };
      // Independently transform connected member-end actions into global axes
      // and check force/moment closure at the critical joint.
      const nodeId=result.criticalDisplacement.nodeId;
      const forceSum=[0,0,0],momentSum=[0,0,0];
      const forceScale=[0,0,0],momentScale=[0,0,0],contributions=[];
      const addVector=(target,absolute,axes,values)=>{
        const v=[0,1,2].map(i=>axes.x[i]*values[0]+axes.y[i]*values[1]+axes.z[i]*values[2]);
        v.forEach((x,i)=>{target[i]+=x;absolute[i]+=Math.abs(x);});
        return v;
      };
      let complete=true;
      result.criticalMemberReport.forEach(m=>{
        const atStart=m.start===nodeId,atEnd=m.end===nodeId;
        if(!atStart&&!atEnd)return;
        if(!m.localAxes||!m.start||!m.end){complete=false;return;}
        const e=atStart?m.endI:m.endJ,a=m.localAxes;
        const fg=addVector(forceSum,forceScale,a,[e.N,e.Vy,e.Vz]);
        const mg=addVector(momentSum,momentScale,a,[e.T,e.My,e.Mz]);
        contributions.push({memberId:m.id,end:atStart?"I":"J",forceGlobalN:fg,momentGlobalNm:mg});
      });
      const vnorm=v=>Math.hypot(v[0],v[1],v[2]);
      result.criticalJointEquilibrium={
        nodeId,complete,memberCount:contributions.length,contributions,
        forceResidualN:forceSum,momentResidualNm:momentSum,
        relativeForceResidual:vnorm(forceSum)/Math.max(vnorm(forceScale),1),
        relativeMomentResidual:vnorm(momentSum)/Math.max(vnorm(momentScale),1),
        note:"کنترل جمع کنش‌های انتهایی اعضای متصل در محورهای جهانی؛ این کنترل تعادل موضعی است و تأیید مقاومت یا اتصال نیست."
      };
    }
    if(!window.SteelFoundationModelFingerprint?.build)throw new Error("ماژول مشترک اثرانگشت مدل فونداسیون بارگذاری نشده است.");
    result.foundationSourceModelFingerprint=window.SteelFoundationModelFingerprint.build(model,{
      tieBeamLayout:window.SteelTieBeamLayout?.getData?.()||null,
      loadSettings:window.SteelLoads?.getData?.()||null,
      sections:window.SteelSections?.read?.()||null,
      support:$("baseConnection")?.value||"pinned"
    });
    result.foundationModelFingerprint=JSON.stringify({
      nodes:analysisModel.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),
      members:analysisModel.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),
      nodalLoads:customNodalLoads.map(x=>[x.nodeId,x.values]),
      sections:window.SteelSections?.read?.()||null,
      support:$("baseConnection")?.value||"pinned"
    });
    result.tieBeamIntegration={...tieBeamIntegration,activeInAnalysis:tieBeamIntegration.included.length>0,
      concreteSelfWeightIncluded:selected.deadFactor>0&&tieBeamIntegration.included.length>0,
      note:"فقط مسیرهای معتبر با اتصال صریح وارد تحلیل شده‌اند. سختی مقطع ناخالص و ترک‌نخورده فرض شده؛ اثر آرماتور، ترک‌خوردگی، اندرکنش پی/خاک و ظرفیت مهاری در این مرحله طراحی نشده‌اند."};
    result.loadCase=selected.key;
    result.loadCaseLabel=selected.label;
    result.supportType=fixed?"گیردار":"مفصلی";
    result.selfWeight={included:selected.deadFactor>0,deadLoadFactor:selected.deadFactor,steelUnitWeightKNm3,unitWeightBySectionGroup:Object.fromEntries(Object.entries(selfWeightByGroup).map(([k,v])=>[k,v.unitWeightKNm3])),totalKN:selfWeightKN,memberCount:selfWeightMemberCount,bySectionGroup:selfWeightByGroup};
    result.connectionModel="اتصال پرلین به رفتر: تقریب کلیپس/نبشی دوپیچه؛ انتقال جابه‌جایی مشترک است، دو دوران خمشی پرلین از رفتر جدا شده‌اند و دوران حول محور طولی پرلین مشترک باقی مانده است. این مدل سختی واقعی اتصال را محاسبه نمی‌کند.";
    window.SteelTieBeamReinforcement?.captureAnalysis?.(result);
    result.warning="وزن خود فولاد با وزن مخصوص 78.5 kN/m³ و وزن خود شناژ بتنی با وزن مخصوص تعریف‌شده برای هر مسیر، در حالت مرده و ترکیبات دارای ضریب D محاسبه می‌شود؛ وزن شناژ فقط یک‌بار و با سطح مقطع ناخالص اضافه می‌شود. حالت باد فقط فشار خالص دستی واردشده را به‌صورت برداری به پرلین‌های سقف و قیدهای طولی دو دیوار جانبی منتقل می‌کند؛ فشارهای بادگیر/بادپناه، ضرایب فشار خارجی و داخلی، ناحیه مثلثی دیوار انتهایی بالای آخرین قید، بازشوهای غالب و پیچش کلی هنوز منظور نشده‌اند. ترکیبات موجود D، Lr، S و W در حالت سه‌بعدی مقدماتی قابل تحلیل‌اند، اما ضرایب و پوشش آن‌ها باید با متن رسمی مبحث ششم تطبیق نهایی شوند. ورودی باد در این مرحله سرعت مبنای باد نیست و باید فشار خالص بر حسب kN/m² باشد؛ مثبت به سمت داخل ساختمان و منفی مکش به سمت بیرون است. ترکیبات ثقلی ULS-1 تا ULS-3 جداگانه باقی می‌مانند. اتصال پرلین به رفتر با جداسازی دو دوران خمشی و حفظ دوران پیچشی حول محور طولی پرلین تقریب شده، اما سختی واقعی کلیپس، لغزش پیچ، مقاومت اتصال و جزئیات اجرایی کنترل نشده‌اند. P-Delta و کنترل آیین‌نامه‌ای نیز وجود ندارد. مهاربندهای پیشنهادی با سختی کامل مقطع وارد تحلیل می‌شوند؛ صحت جزئیات اتصال باید جداگانه تأیید شود.";
    return result;
  }
  function auditCraneLoadCaseSeparation(loadCase){
    const x=loadCase||{};
    if(x.craneLoadCaseId===undefined||x.craneLoadCaseId===null)
      return {valid:true,isCraneCase:false,issues:[]};
    const issues=[];
    const id=Number(x.craneLoadCaseId);
    if(!Number.isInteger(id)||id<0)issues.push("شناسه موقعیت جرثقیل نامعتبر است.");
    const f=x.factors||{};
    if(Number(f.dead)!==1||Number(f.live)!==0||Number(f.snow)!==0||Number(f.wind)!==0)
      issues.push("حالت جرثقیل فعلاً فقط با وزن مرده ضریب ۱ و بدون اختلاط زنده/برف/باد قابل تحلیل جداگانه است؛ ترکیب کامل آیین‌نامه‌ای هنوز پیاده‌سازی نشده است.");
    if(!Array.isArray(x.nodalLoads)||!x.nodalLoads.length)
      issues.push("بارهای گره‌ای قطار چرخ برای حالت جرثقیل موجود نیست.");
    else{
      const seen=new Set();
      x.nodalLoads.forEach((load,index)=>{
        const node=String(load?.nodeId??"");
        if(!node||seen.has(node))issues.push("شناسه گره بار جرثقیل در ردیف "+(index+1)+" خالی یا تکراری است.");
        seen.add(node);
        if(!Array.isArray(load?.values)||load.values.length!==6||load.values.some(v=>!Number.isFinite(v)))
          issues.push("بردار شش‌مؤلفه‌ای بار جرثقیل در ردیف "+(index+1)+" نامعتبر است.");
      });
    }
    const transfer=x.craneLoadTransfer;
    if(!transfer||!Number.isFinite(Number(transfer.referencePosition_m))||!transfer.sourceDocuments||typeof transfer.sourceDocuments!=="object")
      issues.push("موقعیت مرجع یا مدارک منبع انتقال بار جرثقیل ثبت نشده است.");
    return {valid:issues.length===0,isCraneCase:true,caseId:id,issues,
      scope:"حالت مستقل بار مرده + موقعیت مشخص جرثقیل؛ بدون ترکیب برف/باد/زنده و بدون تأیید ترکیبات آیین‌نامه‌ای یا طراحی نهایی."};
  }
  function craneLoadSeparationSelfTest(){
    const docs={geometrySource:"GA-1"};
    const base={craneLoadCaseId:0,factors:{dead:1,live:0,snow:0,wind:0},
      nodalLoads:[{nodeId:"N1",values:[0,-1000,0,0,0,0]}],
      craneLoadTransfer:{referencePosition_m:2,sourceDocuments:docs}};
    const checks=[];
    const test=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
    test("valid isolated crane position is accepted",()=>auditCraneLoadCaseSeparation(base).valid);
    test("crane case mixed with wind or snow is blocked",()=>!auditCraneLoadCaseSeparation({...base,factors:{...base.factors,wind:1}}).valid&&!auditCraneLoadCaseSeparation({...base,factors:{...base.factors,snow:1}}).valid);
    test("crane case without wheel nodal loads is blocked",()=>!auditCraneLoadCaseSeparation({...base,nodalLoads:[]}).valid);
    test("crane case without traceable source metadata is blocked",()=>!auditCraneLoadCaseSeparation({...base,craneLoadTransfer:null}).valid);
    test("ordinary non-crane combination is unaffected",()=>auditCraneLoadCaseSeparation({factors:{dead:1,live:0,snow:0,wind:0}}).valid&&!auditCraneLoadCaseSeparation({}).isCraneCase);
    return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,tests:checks};
  }
  function build3DCombinationCases(source,modelForLoads){
    if(!Array.isArray(source)||!source.length)throw new Error("فهرست ترکیبات بار در دسترس نیست.");
    const members=Array.isArray(modelForLoads?.members)?modelForLoads.members:[];
    const hasWind=members.some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
    const seen=new Set();
    const gravityCases=source.map((combo,index)=>{
      if(!combo||typeof combo!=="object")throw new Error("تعریف ترکیب بار شماره "+(index+1)+" معتبر نیست.");
      const factors={};
      ["dead","live","snow"].forEach(key=>{
        const value=Number(combo[key]);
        if(combo[key]===undefined||combo[key]===null||combo[key]===""||!Number.isFinite(value)||value<0)
          throw new Error("ضریب "+key+" در ترکیب "+(combo.name||index+1)+" ناقص یا نامعتبر است.");
        factors[key]=value;
      });
      const hasExplicitWind=Object.prototype.hasOwnProperty.call(combo,"wind")&&combo.wind!==undefined&&combo.wind!==null&&combo.wind!=="";
      if(hasWind&&!hasExplicitWind)
        throw new Error("بار باد در مدل وجود دارد، اما ضریب باد در ترکیب "+(combo.name||index+1)+" صریح نیست؛ تحلیل بدون ضریب مستند باد متوقف شد.");
      const wind=hasExplicitWind?Number(combo.wind):0;
      if(!Number.isFinite(wind)||wind<0)throw new Error("ضریب باد در ترکیب "+(combo.name||index+1)+" ناقص یا نامعتبر است.");
      if(wind>0&&!hasWind)throw new Error("ترکیب "+(combo.name||index+1)+" ضریب باد غیرصفر دارد، اما بار باد معتبر در مدل پیدا نشد.");
      const rawLabel=String(combo.name||("ترکیب "+(index+1)));
      const label=seen.has(rawLabel)?rawLabel+" ["+(index+1)+"]":rawLabel;
      seen.add(rawLabel);
      return {index,id:String(combo.id||combo.key||("combo-"+(index+1))),label,factors:{...factors,wind},windSign:1};
    });
    return gravityCases.flatMap(item=>item.factors.wind>0?[
      {...item,label:item.label+" + باد مثبت",windSign:1},
      {...item,label:item.label+" + باد منفی",windSign:-1}
    ]:[item]);
  }
  function combinationCasesSelfTest(){
    const base=[{name:"C1",dead:1.2,live:0,snow:1.6,wind:1.4}];
    const windModel={members:[{lineLoads:{windLeft:2,windRight:0,wind:0,windEnd:0}}]};
    const noWindModel={members:[{lineLoads:{windLeft:0,windRight:0,wind:0,windEnd:0}}]};
    const checks=[];
    const test=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
    test("explicit wind factor creates signed alternatives with exact coefficient",()=>{const r=build3DCombinationCases(base,windModel);return r.length===2&&r[0].factors.wind===1.4&&r[1].factors.wind===1.4&&r[0].windSign===1&&r[1].windSign===-1;});
    test("missing wind factor is blocked when wind load exists",()=>{try{build3DCombinationCases([{name:"C1",dead:1,live:0,snow:0}],windModel);return false;}catch(e){return true;}});
    test("zero wind factor does not silently add wind",()=>{const r=build3DCombinationCases([{...base[0],wind:0}],windModel);return r.length===1&&r[0].factors.wind===0;});
    test("nonzero wind factor without wind actions is blocked",()=>{try{build3DCombinationCases(base,noWindModel);return false;}catch(e){return true;}});
    test("invalid negative wind factor is blocked",()=>{try{build3DCombinationCases([{...base[0],wind:-1}],windModel);return false;}catch(e){return true;}});
    return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,tests:checks};
  }
  async function analyzeAll3DCombinations(options){
    options=options||{};
    if(!model)build();
    const source=window.SteelLoads?.getData?.().combinations;
    const cases=build3DCombinationCases(source,model);
    const results=[];
    for(let i=0;i<cases.length;i++){
      const item=cases[i];
      if(typeof options.onProgress==="function")options.onProgress("تحلیل مستقل "+(i+1)+" از "+cases.length+": "+item.label);
      try{
        // analyze3D creates a fresh deep-enough geometry copy and remakes every member load
        // from this combination's factors; no factored load vector is reused between cases.
        const result=await analyze3D({...item,label:item.label});
        const equilibriumOK=result?.success===true&&result?.equilibrium?.ok===true;
        const diagram=result?.taperedSectionForceDiagrams||null;
        results.push({
          id:item.id,index:item.index,label:item.label,factors:item.factors,
          success:equilibriumOK,equilibrium:result?.equilibrium||null,
          nodeCount:result?.nodeCount||0,memberCount:Array.isArray(result?.members)?result.members.length:0,
          members:Array.isArray(result?.members)?result.members.map(m=>({id:m.id,localEndForces:Array.isArray(m.localEndForces)?m.localEndForces.slice():null,section:m.section||null,localAxes:m.localAxes||null})):[],
          taperedDiagramSuccess:diagram?.success===true,
          taperedDiagram:diagram,
          failure:equilibriumOK?null:"تعادل حل‌گر برای این ترکیب تأیید نشد."
        });
      }catch(error){
        results.push({id:item.id,index:item.index,label:item.label,factors:item.factors,
          success:false,equilibrium:null,memberCount:0,members:[],taperedDiagramSuccess:false,taperedDiagram:null,
          failure:String(error?.message||error)});
      }
    }
    const report={
      schemaVersion:1,generatedAt:new Date().toISOString(),
      combinationCount:cases.length,passed:results.filter(x=>x.success).length,
      failed:results.filter(x=>!x.success).length,results,
      designApproved:false,
      note:"هر ترکیب با فراخوانی مستقل حل‌گر و بازسازی بارها از ضرایب همان ترکیب تحلیل شده است. این گزارش فقط تحلیل و نمودار نیرو است و تأیید مقاومت، پایداری یا انطباق آیین‌نامه‌ای نیست."
    };
    window.SteelStructuralModel.last3DCombinationBatch=report;
    return report;
  }
  async function analyzeFoundationEnvelope(){
    if(!model)build();
    const combos=window.SteelLoads?.getData?.().combinations;
    if(!Array.isArray(combos)||!combos.length)throw new Error("ترکیبات بار در دسترس نیستند.");
    const invalidCombo=combos.find(c=>!c||["dead","live","snow"].some(k=>c[k]===undefined||c[k]===null||c[k]==="")||["dead","live","snow"].some(k=>!Number.isFinite(Number(c[k]))||Number(c[k])<0));
    if(invalidCombo)throw new Error("ضرایب یکی از ترکیبات بار ناقص یا نامعتبر است؛ مقدار تهی/نامشخص به صفر تبدیل نمی‌شود.");
    const gravity=combos.map((c,i)=>({label:String(c.name||("ترکیب ثقلی "+(i+1))),factors:{dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow)}}));
    if(gravity.some(c=>!c.label.trim()||Object.values(c.factors).some(v=>!Number.isFinite(v))))throw new Error("نام یا ضرایب یکی از ترکیبات بار نامعتبر/ناقص است.");
    const windPresent=model.members.some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
    const cases=gravity.map(c=>({label:c.label,factors:c.factors}));
    if(windPresent)gravity.forEach(c=>[1,-1].forEach(sign=>cases.push({label:c.label+" + باد "+(sign>0?"مثبت":"منفی")+" (ضریب ۱٫۰)",factors:c.factors,wind:1,windSign:sign})));
    const nodes=model.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base");
    if(!nodes.length)throw new Error("گره پایه‌ای برای استخراج واکنش وجود ندارد.");
    const samples=[];
    for(let i=0;i<cases.length;i++){
      const spec=cases[i];
      const result=await analyze3D({label:spec.label,factors:{...spec.factors,wind:spec.wind||0},windSign:spec.windSign||1});
      if(!result||!Array.isArray(result.reactions)||!result.foundationModelFingerprint||!result.foundationSourceModelFingerprint)throw new Error("نتیجه واکنش یا اثرانگشت منبع مدل برای "+spec.label+" موجود نیست.");
       if(!result.tieBeamIntegration||!Array.isArray(result.tieBeamIntegration.included)||!Array.isArray(result.tieBeamIntegration.skipped))throw new Error("گزارش ورود/حذف شناژها در تحلیل "+spec.label+" موجود نیست؛ زنجیره انتقال به فونداسیون قابل تأیید نیست.");
       if(result.tieBeamIntegration.included.length){
         const audit=result.tieBeamIntegration.solverAudit;
         if(!audit||audit.success!==true||audit.verifiedSegments!==audit.expectedSegments)throw new Error("ممیزی پس از حل‌گر شناژ در حالت "+spec.label+" کامل نیست؛ تحویل واکنش به فونداسیون متوقف شد.");
       }
       if(samples.length&&JSON.stringify(samples[0].tieBeamIntegration)!==JSON.stringify(result.tieBeamIntegration))throw new Error("آرایش شناژهای واردشده بین ترکیبات بار یکسان نیست؛ پوش واکنش فونداسیون متوقف شد.");
       if(samples.length&&samples[0].foundationSourceModelFingerprint!==result.foundationSourceModelFingerprint)throw new Error("اثر انگشت مدل منبع بین ترکیبات بار تغییر کرده است؛ پوش واکنش فونداسیون متوقف شد.");
      if(!result.equilibrium||result.equilibrium.ok!==true)throw new Error("کنترل تعادل حل‌گر برای ترکیب «"+spec.label+"» موفق نیست؛ پوش فونداسیون متوقف شد.");
      const map=new Map();
      for(const reaction of result.reactions){
        if(!reaction||reaction.nodeId==null||map.has(reaction.nodeId))throw new Error("شناسه واکنش تهی یا تکراری در ترکیب «"+spec.label+"»؛ پوش فونداسیون متوقف شد.");
        if(!Array.isArray(reaction.values)||reaction.values.length<6||reaction.values.slice(0,6).some(v=>!Number.isFinite(Number(v))))throw new Error("بردار واکنش شش‌مؤلفه‌ای نامعتبر برای گره "+reaction.nodeId+" در ترکیب «"+spec.label+"».");
        map.set(reaction.nodeId,reaction.values.slice(0,6).map(Number));
      }
      const missing=nodes.filter(n=>!map.has(n.id)).map(n=>n.id);
      if(missing.length)throw new Error("حل‌گر واکنش این گره‌های پایه را برنگردانده است: "+missing.join(", ")+"؛ مقدار صفر جایگزین نشد.");
      samples.push({label:spec.label,factors:{...spec.factors,wind:Number(spec.wind)||0},windSign:spec.windSign||1,equilibrium:result.equilibrium,tieBeamIntegration:result.tieBeamIntegration||null,foundationSourceModelFingerprint:result.foundationSourceModelFingerprint,reactions:nodes.map(n=>({nodeId:n.id,values:map.get(n.id).slice()}))});
    }
    const rows=nodes.map(n=>{
      const values=samples.map(s=>({label:s.label,values:s.reactions.find(r=>r.nodeId===n.id)?.values||[0,0,0,0,0,0]}));
      const envelopes=[0,1,2,3,4,5].map(k=>{
        let min=Infinity,max=-Infinity,minCase="",maxCase="";
        values.forEach(s=>{const v=Number(s.values[k])||0;if(v<min){min=v;minCase=s.label;}if(v>max){max=v;maxCase=s.label;}});
        return {min,max,minCase,maxCase};
      });
      return {nodeId:n.id,x:Number(n.x)||0,y:Number(n.y)||0,z:Number(n.z)||0,kind:n.kind,envelopes,caseReactions:values.map(s=>({label:s.label,values:s.values.slice()}))};
    }).sort((a,b)=>a.z-b.z||a.x-b.x);
    return {generatedAt:new Date().toISOString(),supportType:$("baseConnection")?.value==="fixed"?"گیردار":"مفصلی",units:"N,N.m",rows,cases:samples.map(s=>({label:s.label,factors:s.factors,windSign:s.windSign,equilibrium:s.equilibrium})),tieBeamIntegration:samples[0]?.tieBeamIntegration||null,foundationSourceModelFingerprint:samples[0]?.foundationSourceModelFingerprint||null,windCasesIncluded:windPresent,windFactor:windPresent?1:null,foundationModelFingerprint:samples[0]?.reactions?JSON.stringify({nodes:model.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),members:model.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),tieBeamIntegration:samples[0]?.tieBeamIntegration||null,sections:window.SteelSections?.read?.()||null,support:$("baseConnection")?.value||"pinned"}):null,limitations:["پوش فقط بر اساس ترکیبات موجود در نرم‌افزار ساخته شده و ضرایب آن هنوز با نسخه رسمی آیین‌نامه تطبیق نهایی نشده‌اند.","باد مثبت و منفی با ضریب ۱٫۰ فقط غربال مقدماتی است؛ ترکیبات کامل باد، زلزله، uplift و ضرایب بار آیین‌نامه‌ای تضمین نشده‌اند.","تحلیل خطی مرتبه اول است؛ P-Delta، کمانش، اندرکنش خاک و سازه و طراحی پی انجام نشده است."]};
  }
  function getData(){return model?{geometry:model.geometry,nodes:model.nodes,members:model.members}:null;}
  function setData(data){
    if($("structuralSystem")?.value==="portal-single-slope"){
      model=null;
      if(window.SteelDrawing?.drawFrame)window.SteelDrawing.drawFrame();
      return;
    }
    if(data&&data.geometry){const g=data.geometry,map={roofPurlinSpacing:"modelPurlinSpacing",wallGirtSpacing:"modelGirtSpacing",endPostSpacing:"modelEndPostSpacing",braceBays:"modelBraceBays"};Object.entries(map).forEach(([k,id])=>{if($(id)&&g[k]!=null)$(id).value=g[k];});if($("craneRunwayAxisOffset")&&g.craneRunway?.axisOffsetM!=null)$("craneRunwayAxisOffset").value=g.craneRunway.axisOffsetM;if($("craneRunwaySupportType"))$("craneRunwaySupportType").value=g.craneRunway?.supportType||"";Object.entries(RUNWAY_SECTION_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.sectionInputs?.[key]??(key==="steelGrade"?"ST37":"");});Object.entries(RUNWAY_STIFFENER_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.stiffenerInputs?.[key]??"";});Object.entries(RUNWAY_LOAD_PATH_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.loadPathInputs?.[key]??"";});Object.entries(RUNWAY_FASTENING_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.fasteningInputs?.[key]??"";});Object.entries(RUNWAY_RAIL_LAYOUT_FIELD_IDS).forEach(([key,id])=>{const el=$(id);if(el)el.value=g.craneRunway?.railLayoutInputs?.[key]??(key==="firstSupportOffset_m"?"0":"");});const rf=g.craneRunway?.railFemInputs||{};if($("craneRunwayRailSupportStiffness"))$("craneRunwayRailSupportStiffness").value=rf.supportStiffnessCsv||"";if($("craneRunwayRailSupportStiffnessSource"))$("craneRunwayRailSupportStiffnessSource").value=rf.supportStiffnessSource||"";if($("craneRunwayRailWheelLoads"))$("craneRunwayRailWheelLoads").value=rf.pointLoadsJson||"";if($("craneRunwayRailMovingTrain"))$("craneRunwayRailMovingTrain").value=rf.movingTrainJson||"";if($("craneRunwayRailMovingStep"))$("craneRunwayRailMovingStep").value=rf.movingStepM||"0.25";}
    build();draw();showSummary();
  }
  function validate(){try{build();return "";}catch(e){return e.message;}}
  function analyzeCraneRail(input){if(!window.SteelRailBeamFEM)return {success:false,analysisEnabled:false,issues:["ماژول تحلیل تیر ریل بارگذاری نشده است."]};return window.SteelRailBeamFEM.analyzeIfReady(input||{});}
  function analyzeCraneRailMovingEnvelope(input){if(!window.SteelRailBeamFEM?.movingLoadEnvelope)return {success:false,analysisEnabled:false,issues:["تابع جاروب بار متحرک بارگذاری نشده است."]};return window.SteelRailBeamFEM.movingLoadEnvelope(input||{});}
  function getProposedUnbracedLengths(){if(!model)build();const g=model.geometry;return{column:g.height,rafter:Math.hypot(g.span/2,g.rise),roofPurlin:g.spacing,wallGirt:g.spacing,status:"پیشنهاد هندسی؛ تا تأیید جزئیات مهار و اتصال، مقدار قطعی طراحی نیست"};}
  function init(){
    ensurePanel();
    if (!document.getElementById("modelProgressStyle")) {
      const style = document.createElement("style");
      style.id = "modelProgressStyle";
      style.textContent = ".model-progress{position:fixed;top:10px;left:10px;right:10px;z-index:2147483000;margin:0;padding:14px;border:3px solid #075985;border-radius:12px;background:#ffffff;color:#102a43;box-shadow:0 8px 28px rgba(0,0,0,.35)}.model-progress[hidden]{display:none!important}.model-progress-head{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:12px}.model-progress-track{height:9px;overflow:hidden;border-radius:99px;background:#d9e8ee;margin:10px 0}.model-progress-track span{display:block;width:38%;height:100%;border-radius:99px;background:linear-gradient(90deg,#176b87,#20a4b8);animation:sahroudProgress 1.15s ease-in-out infinite alternate}.model-progress small{display:block;color:#526b78;font-size:11px}@keyframes sahroudProgress{from{transform:translateX(165%)}to{transform:translateX(-265%)}}";
      document.head.appendChild(style);
    }
    if(window.SteelDrawing){originalDrawFrame=window.SteelDrawing.drawFrame;window.SteelDrawing.drawFullModel=draw;}
    /* Do not generate the full 3D mesh during page startup. On phones this can block the UI before the user can enter project data. Keep the lightweight 2D frame visible; build the full model only after an explicit user action. */
    if(typeof originalDrawFrame==="function")originalDrawFrame();
    const summary=$("fullModelSummary");
    if(summary)summary.textContent="مدل سه‌بعدی هنوز ساخته نشده است. پس از تکمیل ورودی‌ها، «ساخت مدل هندسی کامل» را بزنید.";
  }
  window.SteelStructuralModel={build,draw,setCameraView,getCameraView:()=>({...cameraView}),getData,setData,validate,validate3DSections,analyze3D,analyzeAll3DCombinations,build3DCombinationCases,combinationCasesSelfTest,auditCraneLoadCaseSeparation,craneLoadSeparationSelfTest,analyzeFoundationEnvelope,analyzeCraneRail,analyzeCraneRailMovingEnvelope,parseRunwayRailSupportInputs,parseRunwayRailFEMInputs,getProposedUnbracedLengths,runwayGeometrySelfTest,auditPurlinRafterConnectivity,countRafterPaths,get model(){return model;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

/* ===== steel2/js/crane-3d-mesh-proposal.js ===== */
/* SAHROUD STEEL — explicit 3D crane runway mesh proposal.
 * Maps only exact existing column support nodes; never injects elements or loads.
 */
(function(root){
"use strict";
const TOL=1e-7;
const near=(a,b)=>Number.isFinite(Number(a))&&Math.abs(Number(a)-Number(b))<=TOL;
function audit(model){
 const issues=[],g=model?.geometry?.craneRunway,frames=model?.geometry?.frames,nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!g?.enabled)issues.push("جرثقیل در مدل هندسی فعال نیست.");
 if(!Array.isArray(frames)||frames.length<2)issues.push("حداقل دو قاب طولی لازم است.");
 if(!nodes.length||!members.length)issues.push("شبکه واقعی گره‌ها و اعضای سازه‌ای موجود نیست.");
 const span=Number(model?.geometry?.span),y=Number(g?.elevationM),offset=Number(g?.axisOffsetM);
 if(!(Number.isFinite(span)&&span>0))issues.push("دهانه مدل معتبر نیست.");
 if(!(Number.isFinite(y)&&y>0))issues.push("تراز ریل معتبر نیست.");
 if(!(Number.isFinite(offset)&&offset>=0.05))issues.push("فاصله محور تیر حمال از ستون معتبر نیست.");
 const proposals={left:[],right:[]},beamNodes=[],beamMembers=[],brackets=[],columnNodeIds=[];
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const findExact=(x,z,side)=>{
  const matches=nodes.filter(n=>near(n.x,x)&&near(n.y,y)&&near(n.z,z));
  if(matches.length!==1){issues.push("تطبیق گره ستون "+side+" در قاب z="+z+" یکتا نیست؛ تعداد تطبیق: "+matches.length);return null;}
  const node=matches[0],attached=members.filter(m=>(m.sectionKey||"")==="column"&&(m.start===node.id||m.end===node.id));
  if(!attached.length){issues.push("گره "+node.id+" در تراز ریل به عضو ستون واقعی متصل نیست.");return null;}
  return node;
 };
 if(Array.isArray(frames)&&frames.length>=2&&Number.isFinite(span)&&Number.isFinite(y)&&Number.isFinite(offset)){
  for(const side of ["left","right"]){
   const colX=side==="left"?0:span,beamX=side==="left"?-offset:span+offset;
   const geomSupports=Array.isArray(g?.supportNodes)?g.supportNodes.filter(n=>n.side===side):[];
   frames.forEach((z,i)=>{
    const column=findExact(colX,z,side);
    const geometric=geomSupports.filter(n=>near(n.z,z)&&near(n.x,beamX)&&near(n.y,y));
    if(geomSupports.length&&geometric.length!==1)issues.push("گره کمکی تیر حمال "+side+" در قاب "+(i+1)+" با مختصات مورد انتظار تطبیق یکتا ندارد.");
    if(!column)return;
    const beamId="CRANE_MESH_"+side.toUpperCase()+"_NODE_"+(i+1);
    const beamNode={id:beamId,x:beamX,y,z,kind:"crane-runway-beam-proposal",proposalOnly:true,sourceColumnNodeId:column.id,frameIndex:i+1,side};
    beamNodes.push(beamNode);columnNodeIds.push(column.id);proposals[side].push({frameIndex:i+1,z,columnNodeId:column.id,beamNodeId:beamId});
    brackets.push({id:"CRANE_MESH_"+side.toUpperCase()+"_BRACKET_"+(i+1),side,frameIndex:i+1,columnNodeId:column.id,beamNodeId:beamId,from:{x:colX,y,z},to:{x:beamX,y,z},lengthM:offset,connectionType:g.supportType||"unselected",sectionDefined:false,stiffnessDefined:false,proposalOnly:true});
   });
   for(let i=0;i<frames.length-1;i++){
    const a=proposals[side][i],b=proposals[side][i+1];
    if(!a||!b)continue;
    beamMembers.push({id:"CRANE_MESH_"+side.toUpperCase()+"_BAY_"+(i+1),side,start:a.beamNodeId,end:b.beamNodeId,lengthM:Number(b.z)-Number(a.z),continuity:"separate_span_segment_between_adjacent_frames",endReleases:"not_defined",sectionDefined:false,proposalOnly:true});
   }
  }
 }
 const expected=Array.isArray(frames)?frames.length*2:0;
 const mapped=columnNodeIds.length===expected&&beamNodes.length===expected&&brackets.length===expected&&beamMembers.length===Math.max(0,expected-2);
 const geometryReady=issues.length===0&&mapped;
 if(!mapped&&issues.length===0)issues.push("تعداد گره‌ها، براکت‌ها یا قطعات پیشنهادی با تعداد قاب‌ها سازگار نیست.");
 return {success:true,geometryReady,ready:false,analysisEnabled:false,proposalOnly:true,counts:{frames:frames?.length||0,columnNodesMapped:columnNodeIds.length,beamNodes:beamNodes.length,brackets:brackets.length,beamMembers:beamMembers.length},columnNodeIds:[...new Set(columnNodeIds)],beamNodes,beamMembers,brackets,issues,blockers:["مقطع و خواص سازه‌ای تیر حمال تعریف نشده یا به حل‌گر تخصیص نیافته است.","مقطع و سختی واقعی براکت/اتصال و خروج از مرکزیت اجرایی باید تعیین شود.","نوع اتصال و رهاسازی درجات آزادی در دو انتهای اعضا باید از نقشه/محاسبات مشخص شود.","تیر حمال فعلاً قطعات مستقل بین قاب‌هاست؛ پیوستگی چنددهانه فرض نمی‌شود.","این پیشنهاد به model.nodes/model.members افزوده نمی‌شود و هیچ نیرویی اعمال نمی‌کند."]};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const model={geometry:{span:12,frames:[0,6,12],craneRunway:{enabled:true,elevationM:5,axisOffsetM:.5,supportType:"simple",supportNodes:["left","right"].flatMap(side=>[0,6,12].map((z,i)=>({id:"G"+side+i,x:side==="left"?-.5:12.5,y:5,z,side}))),beamSegments:[]}},nodes:[],members:[]};
 ["left","right"].forEach(side=>[0,6,12].forEach((z,i)=>{const id="C"+side+i;model.nodes.push({id,x:side==="left"?0:12,y:5,z});model.members.push({id:"M"+id,start:id,end:"TOP"+id,sectionKey:"column"});model.nodes.push({id:"TOP"+id,x:side==="left"?0:12,y:6,z});}));
 const good=audit(model);
 t("maps exact existing left/right column nodes",()=>good.geometryReady&&good.counts.columnNodesMapped===6);
 t("creates separate proposal-only beam nodes",()=>good.beamNodes.length===6&&good.beamNodes.every(n=>n.proposalOnly));
 t("creates one bracket proposal per frame and side",()=>good.brackets.length===6);
 t("creates separate beam bays without assuming continuity",()=>good.beamMembers.length===4&&good.beamMembers.every(m=>m.continuity==="separate_span_segment_between_adjacent_frames"));
 t("keeps solver and analysis disabled",()=>!good.ready&&!good.analysisEnabled);
 t("does not mutate source model arrays",()=>model.nodes.length===12&&model.members.length===6);
 const bad=JSON.parse(JSON.stringify(model));bad.nodes=bad.nodes.filter(n=>n.id!=="Cleft1");
 const missing=audit(bad);
 t("rejects missing exact column node instead of nearest-node matching",()=>!missing.geometryReady&&missing.issues.some(x=>x.includes("تطبیق گره ستون")));
 const ambiguous=JSON.parse(JSON.stringify(model));ambiguous.nodes.push({...ambiguous.nodes.find(n=>n.id==="Cleft1"),id:"DUP"});
 const dup=audit(ambiguous);
 t("rejects ambiguous coincident column nodes",()=>!dup.geometryReady&&dup.issues.some(x=>x.includes("تطبیق گره ستون")));
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelCrane3DMeshProposal={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);

