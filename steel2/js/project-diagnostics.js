/* SAHROUD STEEL - Read-only Project Diagnostics 1.0
 * Does not write to localStorage, alter form values, build the model, or change sections.
 */
(function () {
  "use strict";
  const STORAGE_KEY = "sahroudSteelProject.autosave.v3";
  const GROUPS = ["column","rafter","roofPurlin","wallGirt","endPost","endGirt","wallBrace","roofBrace","roofEdge"];
  const FIELDS = ["A_cm2","Iy_cm4","Iz_cm4","J_cm4"];
  const LABELS = {
    column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید دیوار",
    endPost:"ستونک انتهایی",endGirt:"تیر افقی انتهایی",wallBrace:"مهاربند دیوار",
    roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"
  };
  const $ = id => document.getElementById(id);
  const stable = value => {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(k => JSON.stringify(k)+":"+stable(value[k])).join(",") + "}";
    return JSON.stringify(value);
  };
  function fingerprint(value) {
    const s = stable(value);
    let h = 2166136261;
    for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
    return ("00000000" + (h>>>0).toString(16)).slice(-8);
  }
  function sameNumber(a,b) {
    const x=Number(a), y=Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return Object.is(a,b);
    return Math.abs(x-y) <= Math.max(1e-10,Math.max(Math.abs(x),Math.abs(y))*1e-9);
  }
  function sectionGroups(data) {
    return data && data.analysis3d && data.analysis3d.groups ? data.analysis3d.groups : {};
  }
  function compareGroups(saved, live) {
    const issues=[];
    GROUPS.forEach(key=>{
      const a=saved[key], b=live[key];
      if (!a && !b) return;
      if (!a || !b) { issues.push(LABELS[key]+": گروه در "+(!a?"فایل ذخیره‌شده":"ورودی فعلی")+" وجود ندارد."); return; }
      FIELDS.forEach(field=>{
        if (!sameNumber(a[field],b[field])) issues.push(LABELS[key]+" / "+field+": ذخیره="+a[field]+"؛ فعلی="+b[field]);
      });
    });
    return issues;
  }
  function addStyles() {
    if ($("projectDiagnosticsStyle")) return;
    const style=document.createElement("style");
    style.id="projectDiagnosticsStyle";
    style.textContent=".diagnostics-panel{border:1px solid #9bb5c3;background:#f8fbfc;border-radius:12px;padding:14px;margin:16px 0;color:#183746}.diagnostics-panel h3{margin:0 0 8px}.diagnostics-panel .diag-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.diagnostics-panel button{border:0;border-radius:8px;padding:10px 14px;background:#155e75;color:#fff;font-weight:700}.diagnostics-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;direction:rtl;text-align:right;background:#fff;border:1px solid #d5e1e7;border-radius:8px;padding:12px;font:12px/1.8 Tahoma,Arial;max-height:65vh;overflow:auto}.diagnostics-panel .diag-note{font-size:12px;color:#526b78;line-height:1.8}";
    document.head.appendChild(style);
  }
  function ensurePanel() {
    if ($("projectDiagnosticsPanel")) return;
    const panel=document.createElement("section");
    panel.id="projectDiagnosticsPanel";
    panel.className="diagnostics-panel";
    panel.innerHTML='<h3>عیب‌یابی و تطبیق داده‌های پروژه</h3><p class="diag-note">این ابزار فقط اطلاعات را می‌خواند؛ هیچ مقدار، فایل، ذخیره خودکار یا مقطعی را تغییر نمی‌دهد.</p><div class="diag-actions"><button id="btnRunProjectDiagnostics" type="button">اجرای عیب‌یابی فقط‌خواندنی</button></div><pre id="projectDiagnosticsOutput">برای شروع، دکمه اجرای عیب‌یابی را بزنید.</pre>';
    const footer=document.querySelector("footer");
    if (footer && footer.parentNode) footer.parentNode.insertBefore(panel,footer);
    else document.querySelector("main")?.appendChild(panel);
    $("btnRunProjectDiagnostics").addEventListener("click",run);
  }
  function run() {
    const out=$("projectDiagnosticsOutput");
    const lines=[];
    const add=(title,value)=>lines.push(title+" : "+value);
    try {
      let saved=null, storageStatus="نامشخص";
      try {
        const raw=localStorage.getItem(STORAGE_KEY);
        if (raw) { saved=JSON.parse(raw); storageStatus="autosave موجود"; }
        else storageStatus="autosave موجود نیست؛ در بارگذاری اولیه فایل default-project.json استفاده می‌شود.";
      } catch(e) { storageStatus="خطا در خواندن/تجزیه localStorage: "+e.message; }
      const sections=window.SteelSections && window.SteelSections.read ? window.SteelSections.read() : null;
      const liveGroups=sectionGroups(sections);
      const savedGroups=sectionGroups(saved && saved.sections);
      const model=window.SteelStructuralModel && window.SteelStructuralModel.model;
      const members=model && Array.isArray(model.members)?model.members:[];
      const groupCounts={};
      const resolverErrors=[];
      members.forEach(member=>{
        const key=member.sectionKey||"unassigned";
        groupCounts[key]=(groupCounts[key]||0)+1;
        if (window.SteelSections && window.SteelSections.resolveAnalysis3DSection) {
          try { window.SteelSections.resolveAnalysis3DSection(member); }
          catch(e) { resolverErrors.push((member.id||"عضو بدون شناسه")+" ["+key+"]: "+e.message); }
        }
      });
      const liveFingerprint=fingerprint(liveGroups);
      const savedFingerprint=saved?fingerprint(savedGroups):"—";
      add("وضعیت منبع ذخیره",storageStatus);
      add("کلید ذخیره مرورگر",STORAGE_KEY);
      add("زمان ثبت‌شده autosave",saved&&saved.savedAt?saved.savedAt:"ثبت نشده/در دسترس نیست");
      add("نسخه نرم‌افزار در snapshot",saved&&saved.version?saved.version:"نامشخص");
      add("schemaVersion",saved&&saved.schemaVersion!==undefined?saved.schemaVersion:"تعریف نشده (نسخه‌بندی schema هنوز پیاده‌سازی نشده)");
      add("اثر انگشت گروه مقاطع فعلی",liveFingerprint);
      add("اثر انگشت گروه مقاطع ذخیره‌شده",savedFingerprint);
      add("تعداد گروه‌های دارای داده فعلی",Object.keys(liveGroups).filter(k=>liveGroups[k]&&FIELDS.some(f=>Number(liveGroups[k][f])>0)).length+" از "+GROUPS.length);
      if (saved) {
        const diffs=compareGroups(savedGroups,liveGroups);
        add("تطبیق مقاطع ذخیره‌شده با فرم فعلی",diffs.length?"اختلاف یافت شد ("+diffs.length+")":"مطابق در چهار خاصیت اصلی گروه‌ها");
        diffs.slice(0,30).forEach(x=>lines.push("  • "+x));
        if (diffs.length>30) lines.push("  • ... "+(diffs.length-30)+" اختلاف دیگر");
      } else {
        add("تطبیق snapshot","قابل انجام نیست؛ هنوز autosave در این مرورگر وجود ندارد.");
      }
      add("تعداد اعضای مدل حاضر در حافظه",model?members.length:"مدل هنوز ساخته/بارگذاری نشده");
      add("توزیع اعضا بر اساس sectionKey",Object.keys(groupCounts).length?JSON.stringify(groupCounts):"در دسترس نیست");
      add("خطاهای تخصیص مقطع به اعضا",resolverErrors.length);
      resolverErrors.slice(0,20).forEach(x=>lines.push("  • "+x));
      if(resolverErrors.length>20) lines.push("  • ... "+(resolverErrors.length-20)+" خطای دیگر");
      if (model && Array.isArray(model.members)) {
        const modelKeys=[...new Set(members.map(m=>m.sectionKey||"unassigned"))].sort();
        const unknown=modelKeys.filter(k=>!GROUPS.includes(k));
        add("کلیدهای مقطع ناشناخته در مدل",unknown.length?unknown.join(", "):"ندارد");
      }
      const loads=window.SteelLoads&&window.SteelLoads.getData?window.SteelLoads.getData():null;
      if(loads){
        add("بار باد سقف چپ/راست (kN/m²)",String(loads.windLeft)+" / "+String(loads.windRight));
        add("بار باد دیوار طولی (kN/m²)",String(loads.windWall));
        add("بار باد دیوار انتهایی جلو/عقب (kN/m²)",String(loads.windEndFront)+" / "+String(loads.windEndBack));
        add("سرعت مبنای باد (km/h)",loads.climate&&loads.climate.basicWind!==undefined?loads.climate.basicWind:"ثبت نشده");
        add("وضعیت بازشو غالب",loads.climate&&loads.climate.dominantOpening!==undefined?loads.climate.dominantOpening:"نامشخص");
      }
      const wind=window.SteelClimateLoadEngine&&window.SteelClimateLoadEngine.getData?window.SteelClimateLoadEngine.getData():null;
      if(wind){
        add("رکوردهای بار اقلیمی",Array.isArray(wind.cases)?wind.cases.length:"نامشخص");
        add("موارد واجد تأیید طراحی آیین‌نامه‌ای",Array.isArray(wind.cases)?wind.cases.filter(x=>x.eligibleForCodeDesign===true).length:"نامشخص");
        add("وضعیت محاسبه باد",wind.status||"ضرایب/وضعیت کامل باید جداگانه کنترل شود");
      }
      const openings=window.SteelOpenings&&window.SteelOpenings.getData?window.SteelOpenings.getData():null;
      if(openings) add("بازشوهای فعال",Object.keys(openings).filter(k=>openings[k]&&openings[k].enabled).join(", ")||"هیچ‌کدام");
      const purlins=window.SteelRoofPurlins&&window.SteelRoofPurlins.getData?window.SteelRoofPurlins.getData():null;
      if(purlins) add("تنظیمات پرلین سقف", "خانواده="+purlins.family+"؛ فاصله="+purlins.pitch+"m؛ Z="+purlins.sectionHeight+"×"+purlins.flange+"×"+purlins.lip+"×"+purlins.thickness+"mm");
      const structural=saved&&saved.structuralModel;
      if(structural&&Array.isArray(structural.members)) add("اعضای مدل ذخیره‌شده",structural.members.length);
      if(saved&&saved.sections&&saved.sections.rafter) add("رفتر ذخیره‌شده A / Ix / Iy",saved.sections.rafter.A_cm2+" / "+saved.sections.rafter.Ix_cm4+" / "+saved.sections.rafter.Iy_cm4);
      if(sections&&sections.rafter) add("رفتر فعلی A / Ix / Iy",sections.rafter.A_cm2+" / "+sections.rafter.Ix_cm4+" / "+sections.rafter.Iy_cm4);
      lines.push("");
      lines.push("تفسیر: تطابق داده‌ها فقط یکپارچگی ورودی را نشان می‌دهد؛ به معنی صحت آیین‌نامه‌ای، پایداری یا ایمنی سازه نیست.");
      lines.push("توجه: ورودی‌های باد در نسخه فعلی عمدتاً دستی‌اند و فشارهای نواحی/بازشوها و ترکیبات باید جداگانه تکمیل و اعتبارسنجی شوند.");
      out.textContent=lines.join("\n");
    } catch(error) {
      out.textContent="عیب‌یابی با خطا متوقف شد: "+(error&&error.stack?error.stack:error);
    }
  }
  function init(){addStyles();ensurePanel();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
  window.SahroudProjectDiagnostics={run};
})();