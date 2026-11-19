/* SAHROUD STEEL - Full shed geometry model 1.0 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  let model = null, originalDrawFrame = null, progressRunning = false, combinationResults = [], combinationEnvelope = null;
  function runWithProgress(startLabel, task, onError) {
    if (progressRunning) return;
    progressRunning = true;
    const panel = $("modelProgress"), text = $("modelProgressText"), elapsed = $("modelProgressElapsed");
    const buttons = ["btnBuildFullModel", "btnCheck3DSections", "btnRunFull3D", "btnRunAll3DCombinations", "btnTestSpan10"];
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
      '<div class="form-grid">' +
      '<div class="field"><label for="modelPurlinSpacing">فاصله پرلین‌های سقف (m)</label><input id="modelPurlinSpacing" type="number" min="0.3" step="0.05" value="0.95"></div>' +
      '<div class="field"><label for="modelPurlinClipDeduction">کسر مجموع دو انتهای کلیپس از طول برش هر پرلین (m)</label><input id="modelPurlinClipDeduction" type="number" min="0" step="0.005" value="0"></div>' +
      '<div class="field"><label for="modelPurlinAssemblyGap">لقی مونتاژ کل هر قطعه پرلین (m)</label><input id="modelPurlinAssemblyGap" type="number" min="0" step="0.005" value="0"></div>' +
      '<div class="field"><label for="modelGirtSpacing">فاصله قیدهای افقی دیوار (m)</label><input id="modelGirtSpacing" type="number" min="0.3" step="0.05" value="3.00"></div>' +
      '<div class="field"><label for="modelEndPostSpacing">فاصله ستونک‌های دیوار انتهایی (m)</label><input id="modelEndPostSpacing" type="number" min="1" step="0.1" value="4.00"></div>' +
      '<div class="field"><label for="modelBraceBays">تعداد دهانه مهاربندی در ابتدا و انتها</label><input id="modelBraceBays" type="number" min="0" step="1" value="1"></div></div>' +
      '<div class="button-grid"><button type="button" id="btnBuildFullModel" class="btn primary">تولید و ترسیم تمام اجزای سوله</button><button type="button" id="btnCheck3DSections" class="btn secondary">بررسی آمادگی مقاطع تحلیل سه‌بعدی</button></div>' +
      '<div id="modelProgress" class="model-progress" hidden aria-live="polite"><div class="model-progress-head"><strong id="modelProgressText">در حال آماده‌سازی…</strong><span id="modelProgressElapsed">۰٫۰ ثانیه</span></div><div class="model-progress-track"><span></span></div><small>حل ماتریس در پردازشگر پس‌زمینه انجام می‌شود؛ نوار پیشرفت و زمان‌سنج باید در طول تحلیل فعال بمانند.</small></div>' +
      '<div id="fullModelSummary" class="notice">مدل کامل هنوز تولید نشده است.</div>' +
      '<div id="fullModel3DReadiness" class="notice">آمادگی تحلیل سه‌بعدی هنوز بررسی نشده است.</div>' +
      '<hr><h4>تحلیل واقعی سه‌بعدی مدل</h4>' +
      '<div class="form-grid"><div class="field"><label for="model3DLoadCase">حالت بار برای تحلیل آزمایشی</label><select id="model3DLoadCase"><option value="dead">بار مرده</option><option value="live">بار زنده</option><option value="snow">بار برف</option><option value="wind">باد ـ فشار خالص ورودی</option><option value="zoneWind_tp_ip">باد عرضی +X ـ فشار داخلی مثبت</option><option value="zoneWind_tp_in">باد عرضی +X ـ فشار داخلی منفی</option><option value="zoneWind_tn_ip">باد عرضی −X ـ فشار داخلی مثبت</option><option value="zoneWind_tn_in">باد عرضی −X ـ فشار داخلی منفی</option><option value="zoneWind_lp_ip">باد طولی +Z ـ فشار داخلی مثبت</option><option value="zoneWind_lp_in">باد طولی +Z ـ فشار داخلی منفی</option><option value="zoneWind_ln_ip">باد طولی −Z ـ فشار داخلی مثبت</option><option value="zoneWind_ln_in">باد طولی −Z ـ فشار داخلی منفی</option><optgroup label="باد سطح بهره‌برداری (تقریب ۰٫۸V)"><option value="serviceWind_tp_ip">باد بهره‌برداری عرضی +X ـ فشار داخلی مثبت</option><option value="serviceWind_tp_in">باد بهره‌برداری عرضی +X ـ فشار داخلی منفی</option><option value="serviceWind_tn_ip">باد بهره‌برداری عرضی −X ـ فشار داخلی مثبت</option><option value="serviceWind_tn_in">باد بهره‌برداری عرضی −X ـ فشار داخلی منفی</option><option value="serviceWind_lp_ip">باد بهره‌برداری طولی +Z ـ فشار داخلی مثبت</option><option value="serviceWind_lp_in">باد بهره‌برداری طولی +Z ـ فشار داخلی منفی</option><option value="serviceWind_ln_ip">باد بهره‌برداری طولی −Z ـ فشار داخلی مثبت</option><option value="serviceWind_ln_in">باد بهره‌برداری طولی −Z ـ فشار داخلی منفی</option></optgroup><option value="combo0">ترکیب ULS-1: 1.4D</option><option value="combo1">ترکیب ULS-2: 1.2D+1.6L+0.5S</option><option value="combo2">ترکیب ULS-3: 1.2D+1.6S+0.5L</option><option value="comboWind08P">آزمایشی باد: 0.8D+1.6W (جهت +)</option><option value="comboWind08N">آزمایشی باد: 0.8D+1.6W (جهت −)</option><option value="comboLiveWind08P">آزمایشی: 1.2D+1.6L+0.5S+0.8W (+)</option><option value="comboLiveWind08N">آزمایشی: 1.2D+1.6L+0.5S+0.8W (−)</option><option value="comboSnowWind08P">آزمایشی: 1.2D+1.6S+0.5L+0.8W (+)</option><option value="comboSnowWind08N">آزمایشی: 1.2D+1.6S+0.5L+0.8W (−)</option></select></div></div>' +
      '<div class="button-grid"><button type="button" id="btnRunFull3D" class="btn success">اجرای تحلیل سه‌بعدی کل سوله</button><button type="button" id="btnRunAll3DCombinations" class="btn primary">اجرای همه ترکیبات ثقلی سه‌بعدی</button><button type="button" id="btnTestSpan10" class="btn secondary">آزمایش مقایسه‌ای دهانه ۱۰ متر</button><button type="button" id="btnDownloadSpanTest" class="btn secondary" disabled>دانلود گزارش آزمایش دهانه</button></div>' +
      '<div id="fullModel3DResult" class="notice">تحلیل سه‌بعدی هنوز اجرا نشده است.</div>' +
      '<div id="fullModel3DDemand" class="notice">پس از تحلیل، جدول نیروهای داخلی تمام اعضا در این قسمت نمایش داده می‌شود.</div>' +
      '<div id="fullModel3DCombinationResult" class="notice">پس از اجرای همه ترکیبات، نتایج جداگانه و پوش تقاضا اینجا نمایش داده می‌شود.</div>' +
      '<div id="criticalRafterDiagram" class="notice" style="margin-top:12px;overflow:hidden">پس از اجرای تحلیل، محل قطعه رفتر متصل به گره بحرانی و مقطع شماتیک تیرورق در این قسمت نمایش داده می‌شود.</div>';
    drawingPanel.parentNode.insertBefore(panel, drawingPanel);
    $("btnBuildFullModel").addEventListener("click", function () {
      runWithProgress("در حال تولید گره‌ها، قاب‌ها، پرلین‌ها و مهاربندها…", stage => {
        build(); draw(); showSummary();
        stage("ترسیم مدل و تکمیل خلاصه هندسی انجام شد.");
      }, e => { $("fullModelSummary").textContent = "خطا در تولید مدل: " + e.message; });
    });
    $("btnRunAll3DCombinations").addEventListener("click", function () {
      const output=$("fullModel3DCombinationResult");
      runWithProgress("در حال آماده‌سازی ترکیبات بار سه‌بعدی…",async stage=>{
        try{
          build();draw();showSummary();
          stage("در حال اجرای تحلیل مستقل ترکیبات ثقلی؛ هر ترکیب با حل‌گر سه‌بعدی جداگانه حل می‌شود…");
          const result=await analyze3DCombinations();
          const lines=[
            "اجرای ترکیبات ثقلی سه‌بعدی کامل شد: "+result.caseCount+" ترکیب؛ "+result.envelope.memberCount+" عضو.",
            "هر ترکیب یک تحلیل مستقل است. پوش مؤلفه‌ای برای تعیین نقاط بحرانی است؛ برای اندرکنش باید بردارهای هم‌زمان هر ترکیب استفاده شوند.",
            "ضرایب ورودی کاربر هستند و هنوز تأیید نهایی آیین‌نامه‌ای ندارند.",""
          ];
          result.combinationResults.forEach(c=>{
            lines.push(c.label+" | D="+c.factors.dead+" L="+c.factors.live+" S="+c.factors.snow+
              " | گره="+c.analysis.nodeCount+" عضو="+c.members.length+
              " | بیشینه جابه‌جایی="+(c.maxTranslation===null?"—":(c.maxTranslation*1000).toFixed(2)+" mm"));
          });
          lines.push("","بردارهای هم‌زمان برای کنترل طراحی ـ هر ردیف از یک ترکیب و یک مقطع است؛ واحد نیرو kN و گشتاور kN.m:");
          result.designDemand.members.forEach(member=>{
            const byCombination=new Map();
            member.candidates.forEach(candidate=>{
              let row=byCombination.get(candidate.combinationId);
              if(!row){row={label:candidate.combination,actions:{}};byCombination.set(candidate.combinationId,row);}
              ["N","Vy","Vz","T","My","Mz"].forEach(k=>{
                const previous=row.actions[k];
                if(!previous||Math.abs(candidate.values[k])>Math.abs(previous.value))
                  row.actions[k]={value:candidate.values[k],x:candidate.x};
              });
            });
            byCombination.forEach(row=>{
              const parts=["N","Vy","Vz","T","My","Mz"].map(k=>{
                const a=row.actions[k],factor=["N","Vy","Vz"].includes(k)?1000:1000000;
                return k+"="+(a.value/factor).toFixed(2)+" @ "+a.x.toFixed(3)+"m";
              });
              lines.push(member.id+" | "+row.label+" | "+parts.join(" | "));
            });
          });
          lines.push("","پوش تقاضا ـ واحد نیرو kN، گشتاور kN.m، مختصات m:");
          const fmt=(v,f,d=2)=>Number.isFinite(Number(v))?(Number(v)*f).toFixed(d):"—";
          result.envelope.members.forEach(member=>{
            const parts=["N","Vy","Vz","T","My","Mz"].map(k=>{
              const e=member.components[k],f=["N","Vy","Vz"].includes(k)?0.001:0.000001;
              return k+"="+fmt(e?.value,f)+" ("+(e?.combination||"—")+") @ "+fmt(e?.x,1,3)+"m";
            });
            lines.push(member.id+" ["+member.sectionKey+"] "+parts.join(" | "));
          });
          output.textContent=lines.join("\n");
        }catch(error){
          combinationResults=[];combinationEnvelope=null;
          output.textContent="اجرای همه ترکیبات متوقف شد؛ هیچ پوش ناقصی برای طراحی پذیرفته نشد.\n"+error.message;
        }
      },error=>{if(output)output.textContent="خطا در اجرای ترکیبات سه‌بعدی: "+error.message;});
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
        const demandBox=$("fullModel3DDemand");
        if(demandBox&&result.memberDemand){
          const f3=(v,factor,d=2)=>Number.isFinite(Number(v))?(Number(v)*factor).toFixed(d):"—";
          const rows=result.memberDemand.members.map(m=>{
            const actions=["N","Vy","Vz","T","My","Mz"].map(k=>{
              const e=m.extrema[k],factor=["N","Vy","Vz"].includes(k)?0.001:0.000001;
              return k+"="+f3(e.value,factor)+" @ "+f3(e.x,1,3)+"m";
            });
            return m.id+" ["+m.sectionKey+"] | "+actions.join(" | ");
          });
          demandBox.textContent="تقاضای بازیابی‌شده اعضا — "+result.memberDemand.memberCount+
            " عضو | نیرو: kN | گشتاور: kN.m | محل: m\\n"+
            rows.join("\\n")+
            "\\nروش: تعادل قطعه چپ عضو با بار گسترده یکنواخت محلی؛ نقاط صفر برش نیز در نمونه‌برداری منظور شده‌اند. این جدول فقط تقاضای تحلیل خطی است، نه کنترل ظرفیت یا تأیید آیین‌نامه‌ای.";
        }else if(demandBox){
          demandBox.textContent="استخراج نیروهای داخلی اعضا در دسترس نیست؛ نتیجه طراحی نباید از نیروهای انتهایی تنها استنتاج شود.";
        }
        box.textContent="تحلیل سه‌بعدی با موفقیت حل شد. حالت بار: "+result.loadCaseLabel+
          " | گره‌ها: "+result.nodeCount+" | اعضا: "+result.memberCount+
          " | بیشینه جابه‌جایی انتقالی: "+(result.maxTranslation*1000).toFixed(3)+" میلی‌متر"+
          " | گره‌های دارای واکنش تکیه‌گاهی: "+result.reactions.length+
          (result.criticalDisplacement
            ? " | گره بحرانی: "+result.criticalDisplacement.nodeId+" ("+result.criticalDisplacement.kind+")"+
              " | مختصات X/Y/Z: "+[result.criticalDisplacement.coordinates.x,result.criticalDisplacement.coordinates.y,result.criticalDisplacement.coordinates.z].map(v=>v.toFixed(3)).join(" / ")+" متر"+
              " | جابه‌جایی ux/uy/uz: "+[result.criticalDisplacement.ux,result.criticalDisplacement.uy,result.criticalDisplacement.uz].map(v=>(v*1000).toFixed(3)).join(" / ")+" میلی‌متر"+
              " | اعضای متصل ("+result.criticalDisplacement.connectedMembers.length+"): "+result.criticalDisplacement.connectedMembers.map(m=>m.id+" ["+m.type+"]").join("، ")
            : " | اطلاعات گره بحرانی در دسترس نیست")+
          (result.selfWeight&&result.selfWeight.included?" | وزن خود فولاد افزوده‌شده: "+result.selfWeight.totalKN.toFixed(2)+" کیلونیوتن در "+result.selfWeight.memberCount+" عضو"+(result.selfWeight.bySectionGroup?" | تفکیک وزن گروه‌ها: "+Object.entries(result.selfWeight.bySectionGroup).map(([k,v])=>k+"="+v.totalKN.toFixed(2)+"kN، "+v.count+" عضو، "+v.lengthM.toFixed(1)+"m").join("؛ "):""):"")+
          (result.equilibrium?" | کنترل تعادل نیرو: "+(result.equilibrium.relativeForceResidual*100).toExponential(2)+"٪؛ تعادل لنگر: "+(result.equilibrium.relativeMomentResidual*100).toExponential(2)+"٪؛ "+(result.equilibrium.ok?"تعادل کلی برقرار":"هشدار: عدم تعادل کلی"):" | کنترل تعادل در دسترس نیست")+
          (result.loadPathAudit?" | ممیزی مستقل مسیر بار: "+(result.loadPathAudit.success?"اتصال گرافی به پایه‌ها و حسابداری خودوزن بدون خطای کشف‌شده":"مسدود: "+result.loadPathAudit.blockers.join("؛ "))+"؛ مسیر دیوار: "+result.loadPathAudit.wallDead.supportPath+"؛ زلزله: "+(result.loadPathAudit.seismic.caseApplied?"بار گره‌ای مستند وارد شد":"اعمال نشده")+"؛ جرثقیل: "+(result.loadPathAudit.crane.caseApplied?"بار گره‌ای وارد شد":"اعمال نشده"):" | ممیزی مسیر بار در دسترس نیست")+
          (result.orientationAudit?" | ممیزی جهت نصب: "+result.orientationAudit.verifiedCount+"/"+result.orientationAudit.memberCount+" عضو تأییدشده؛ "+(result.orientationAudit.readyForCodeDesign?"محورها مستندند":"جهت نصب/چرخش مقطع هنوز مستند نیست"):" | ممیزی جهت نصب در دسترس نیست")+
          (result.gableWindTransfer&&result.gableWindTransfer.length?" | باد مثلثی دیوار انتهایی: "+result.gableWindTransfer.map(x=>x.face+"="+x.resultantKN.toFixed(3)+"kN").join("، "):"")+
          (result.windZoneTransfer?" | نگاشت باد شش‌ناحیه‌ای: "+result.windZoneTransfer.windDirection+"؛ فشار داخلی "+result.windZoneTransfer.internalScenario+"؛ پرلین "+result.windZoneTransfer.counts.roofPurlins+"، دیوار طولی "+result.windZoneTransfer.counts.longitudinalWallGirts+"، دیوار انتهایی "+result.windZoneTransfer.counts.endWallGirts+"؛ روش باد: "+(result.windZoneTransfer.windProcedure?.method||"undetermined")+"؛ "+(result.windZoneTransfer.windProcedure?.warning||"هندسه برای انتخاب روش باد موجود نیست.")+"؛ هشدار طراحی: "+result.windZoneTransfer.designWarning:"")+
          (result.windServiceability?" | کنترل دریفت باد بهره‌برداری: "+(result.windServiceability.ready?(result.windServiceability.driftRatio*100).toFixed(3)+"٪ از ارتفاع؛ حد 0.25٪؛ "+(result.windServiceability.ok?"مجاز":"بیش از حد مجاز"):"قابل ارزیابی نیست: "+result.windServiceability.reason):"")+
          ". خودوزن با فرض وزن مخصوص 78.5 kN/m³ و مساحت مقطع ثبت‌شده محاسبه شده است؛ تحلیل خطی مرتبه اول است، P-Delta و کنترل کمانش در آن لحاظ نشده است. هر پرلین به‌صورت قطعه مستقل بین دو قاب مدل شده است؛ دوران‌های انتهایی هر قطعه از رفتر و از قطعه پرلین دهانه مجاور جدا هستند (فرض مفصل ایده‌آل). سختی واقعی کلیپس و پیچ‌ها، لغزش و خروج از صفحه هنوز مدل نشده و نتیجه تأیید طراحی یا کنترل آیین‌نامه‌ای نیست.";
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
        box.style.color="#15803d";
        window.SteelStructuralModel.last3DResult=result;
        renderCriticalRafterDiagram(result,"تحلیل مدل اصلی");
      } catch(e) {
        box.textContent="تحلیل سه‌بعدی انجام نشد: "+e.message+
          "؛ این پیام برای جلوگیری از ارائه نتیجه نادرست نمایش داده شده است.";
        box.style.color="#b45309";
        window.SteelStructuralModel.last3DResult=null;
      }
      }, e => {
        box.textContent = "تحلیل سه‌بعدی انجام نشد: " + e.message;
        box.style.color = "#b45309";
        window.SteelStructuralModel.last3DResult = null;
      });
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
    ["span","length","spacing","height","rise","modelPurlinSpacing","modelGirtSpacing","modelEndPostSpacing","modelBraceBays"].forEach(id => $(id)?.addEventListener("change", function () { try { build(); draw(); showSummary(); } catch (_) {} }));
  }
  function val(id, fallback) { const e=$(id), n=e?Number(e.value):fallback; return Number.isFinite(n)?n:fallback; }
  function addNode(nodes,x,y,z,kind) { const old=nodes.find(n=>Math.abs(n.x-x)<1e-7&&Math.abs(n.y-y)<1e-7&&Math.abs(n.z-z)<1e-7); if(old){if(kind==="roof-edge")old.kind="roof-edge";return old;} const n={id:"N"+(nodes.length+1),x,y,z,kind:kind||"joint"}; nodes.push(n); return n; }
  function addMember(members,a,b,type,sectionKey,extra) {
    members.push({id:type.toUpperCase().replace(/[^A-Z0-9]+/g,"_")+"_"+(members.length+1),start:a.id,end:b.id,type,sectionKey:sectionKey||"unassigned",length:Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),...(extra||{})});
  }
  function buildRoofPurlinWindFootprints(sourceModel) {
    if(!sourceModel||!sourceModel.geometry||!Array.isArray(sourceModel.members)||!Array.isArray(sourceModel.nodes))
      throw new TypeError("مدل هندسی کامل برای footprint پرلین سقف موجود نیست.");
    const g=sourceModel.geometry, rows=Number(g.roofRows), step=Number(g.roofStationSpacing), total=Number(g.totalRoofSlope);
    if(!Number.isInteger(rows)||rows<1||!(step>0)||!(total>0))
      throw new Error("اطلاعات واقعی ایستگاه‌بندی سقف برای ساخت footprint موجود نیست.");
    const nodeById=new Map(sourceModel.nodes.map(n=>[String(n.id),n]));
    const bounds=(row,fromRidge)=>{
      if(!Number.isInteger(row)||row<1||row>rows+1)throw new Error("شماره ردیف پرلین خارج از ایستگاه‌بندی سقف است.");
      const center=fromRidge?total-(row-1)*step:(row-1)*step;
      const lo=center-step/2;
      const hi=center+step/2;
      return [Math.max(0,lo),Math.min(total,hi)];
    };
    const footprints=[];
    sourceModel.members.filter(m=>m.sectionKey==="roofPurlin").forEach(member=>{
      const a=nodeById.get(String(member.start)),b=nodeById.get(String(member.end));
      if(!a||!b)throw new Error("گره عضو پرلین "+member.id+" پیدا نشد.");
      if(Math.abs(a.x-b.x)>1e-7||Math.abs(a.y-b.y)>1e-7||Math.abs(a.z-b.z)<=1e-9)
        throw new Error("هندسه عضو پرلین "+member.id+" با فرض قطعه طولی ثابت سازگار نیست.");
      const z0=Math.min(a.z,b.z),z1=Math.max(a.z,b.z);
      const faces=member.side==="ridge"?[
        {face:"left",row:member.rowLeft,width:member.tributaryWidthLeft,fromRidge:false},
        {face:"right",row:member.rowRight,width:member.tributaryWidthRight,fromRidge:true}
      ]:[{face:member.side,row:member.side==="left"?(member.rowLeft||member.row):(member.rowRight||member.row),
          width:member.tributaryWidth,fromRidge:member.side==="right"}];
      faces.forEach(item=>{
        if(!(Number(item.width)>0))return;
        const [u0,u1]=bounds(Number(item.row),item.fromRidge);
        if(!(u1-u0>1e-9)||!(z1-z0>1e-9))throw new Error("ابعاد footprint پرلین "+member.id+" صفر یا نامعتبر است.");
        const vertices=[{x:u0,y:z0},{x:u1,y:z0},{x:u1,y:z1},{x:u0,y:z1}];
        const halfSlope=Math.hypot(Number(g.span)/2,Number(g.rise));
        const cos=(Number(g.span)/2)/halfSlope,sin=Number(g.rise)/halfSlope;
        const overhang=Number(g.roofOverhang);
        if(!(halfSlope>0)||!(overhang>=0)||!Number.isFinite(overhang))
          throw new Error("هندسه شیب و پیش‌آمدگی سقف برای تبدیل مختصات معتبر نیست.");
        const globalVertices=vertices.map(p=>({
          x:item.face==="left"?-overhang*cos+p.x*cos:Number(g.span)+overhang*cos-p.x*cos,
          y:Number(g.height)-overhang*sin+p.x*sin,
          z:p.y
        }));
        footprints.push(Object.freeze({
          id:member.id+"_"+item.face,memberId:member.id,face:item.face,
          vertices:Object.freeze(vertices.map(p=>Object.freeze(p))),
          globalVertices:Object.freeze(globalVertices.map(p=>Object.freeze(p))),
          areaM2:(u1-u0)*(z1-z0),areaBasis:"sloped-surface",
          localCoordinateSystem:"roof-face-u-from-eave-edge-and-global-z",
          globalCoordinateSystem:"building-x-y-z",
          tributaryWidthM:u1-u0,longitudinalLengthM:z1-z0,
          geometrySource:"actual-model-member-endpoints-and-roof-station-grid",
          verificationStatus:"geometry-only-not-code-verified",pressureReady:false
        }));
      });
    });
    return Object.freeze(footprints);
  }
  function assignGeometricMemberLineLoads(members, geometry, frameTrib, loads) {
    if(!Array.isArray(members)||!geometry||!Array.isArray(frameTrib)||!loads||typeof loads!=="object")
      throw new Error("ورودی‌های تخصیص بار اعضای هندسی ناقص است.");
    const span=Number(geometry.span),rise=Number(geometry.rise);
    if(!(span>0)||!Number.isFinite(rise)||rise<0)throw new Error("هندسه سقف برای تخصیص بار معتبر نیست.");
    const half=span/2,roofAngle=Math.atan2(rise,half);
    const roofLoadAreaBasis={
      dead:loads.deadAreaBasis||"unspecified",
      live:loads.liveAreaBasis||"unspecified",
      snow:loads.snowAreaBasis||"unspecified"
    };
    const roofLoadBasisReady=Object.fromEntries(Object.entries(roofLoadAreaBasis)
      .map(([key,basis])=>[key,["horizontal-projection","sloped-surface"].includes(basis)]));
    const roofLineLoad=(pressure,width,basisKey)=>roofLoadBasisReady[basisKey]
      ?SteelLoadTransfer.roofSurfacePressureToLineLoad(pressure,width,roofAngle,roofLoadAreaBasis[basisKey]).lineLoadKNm
      :0;
    const roofPurlinsPresent=members.some(m=>m.sectionKey==="roofPurlin");
    const wallSupportPath=loads.wallDeadSupportPath||"foundation";
    if(!["foundation","girts"].includes(wallSupportPath))
      throw new Error("مسیر تحمل وزن دیوار باید به‌صورت صریح انتخاب شود.");
    if(wallSupportPath==="girts"){
      const requirements=[
        [Number(loads.wallDeadLeft||0)>0, m=>m.sectionKey==="wallGirt"&&m.side==="left", "قید طولی چپ"],
        [Number(loads.wallDeadRight||0)>0, m=>m.sectionKey==="wallGirt"&&m.side==="right", "قید طولی راست"],
        [Number(loads.endWallDeadFront||0)>0, m=>m.sectionKey==="endGirt"&&m.endFace==="front", "تیر دیوار انتهایی جلو"],
        [Number(loads.endWallDeadBack||0)>0, m=>m.sectionKey==="endGirt"&&m.endFace==="rear", "تیر دیوار انتهایی عقب"]
      ];
      requirements.forEach(([active,predicate,label])=>{
        if(active&&!members.some(predicate))throw new Error("وزن دیوار به مسیر قیدها سپرده شده اما "+label+" در مدل وجود ندارد.");
      });
    }
    members.forEach(m=>{
      if(m.axis==="transverse"){
        const fi=(m.frame||1)-1,tw=Number(frameTrib[fi]||0);
        if(!(tw>0))throw new Error("عرض بارگیر قاب برای عضو "+(m.id||"نامشخص")+" معتبر نیست.");
        const directRafterLoadFactor=roofPurlinsPresent?0:1;
        const legacyLeft=typeof m.type==="string"&&m.type.indexOf("رفتر چپ")>=0;
        const legacyRight=typeof m.type==="string"&&m.type.indexOf("رفتر راست")>=0;
        const isMainRafter=m.sectionKey==="rafter"||legacyLeft||legacyRight;
        if(isMainRafter){
          const side=m.side||(legacyLeft?"left":legacyRight?"right":null);
          if(side!=="left"&&side!=="right")throw new Error("وجه رفتر عرضی "+(m.id||"نامشخص")+" مشخص نیست.");
          const key=side==="left"?"Left":"Right";
          m.lineLoads={
            dead:roofLineLoad(loads["dead"+key]||0,tw,"dead")*directRafterLoadFactor,
            live:roofLineLoad(loads["live"+key]||0,tw,"live")*directRafterLoadFactor,
            snow:roofLineLoad(loads["snow"+key]||0,tw,"snow")*directRafterLoadFactor,
            wind:0,unit:"kN/m",tributaryWidth:tw,roofLoadAreaBasis,roofLoadBasisReady,
            roofLoadPath:roofPurlinsPresent?"roof-purlins":"direct-rafter"
          };
        }else m.lineLoads={wind:0,unit:"kN/m",tributaryWidth:tw};
      } else if(m.sectionKey==="roofPurlin"){
        const w=Number(m.tributaryWidth||0);
        if(!(w>0))throw new Error("عرض بارگیر پرلین "+(m.id||"نامشخص")+" معتبر نیست.");
        if(m.side==="ridge"){
          const wl=Number(m.tributaryWidthLeft||0),wr=Number(m.tributaryWidthRight||0);
          m.lineLoads={
            dead:roofLineLoad(loads.deadLeft||0,wl,"dead")+roofLineLoad(loads.deadRight||0,wr,"dead"),
            live:roofLineLoad(loads.liveLeft||0,wl,"live")+roofLineLoad(loads.liveRight||0,wr,"live"),
            snow:roofLineLoad(loads.snowLeft||0,wl,"snow")+roofLineLoad(loads.snowRight||0,wr,"snow"),
            wind:SteelLoadTransfer.surfacePressureToLineLoad(loads.windLeft||0,wl)+SteelLoadTransfer.surfacePressureToLineLoad(loads.windRight||0,wr),
            windLeft:SteelLoadTransfer.surfacePressureToLineLoad(loads.windLeft||0,wl),windRight:SteelLoadTransfer.surfacePressureToLineLoad(loads.windRight||0,wr),
            unit:"kN/m",tributaryWidth:w,tributaryWidthLeft:wl,tributaryWidthRight:wr,roofLoadAreaBasis,roofLoadBasisReady
          };
        }else{
          const side=m.side==="left"?"Left":"Right";
          m.lineLoads={dead:roofLineLoad(loads["dead"+side]||0,w,"dead"),live:roofLineLoad(loads["live"+side]||0,w,"live"),snow:roofLineLoad(loads["snow"+side]||0,w,"snow"),wind:SteelLoadTransfer.surfacePressureToLineLoad(loads["wind"+side]||0,w),windLeft:m.side==="left"?SteelLoadTransfer.surfacePressureToLineLoad(loads.windLeft||0,w):0,windRight:m.side==="right"?SteelLoadTransfer.surfacePressureToLineLoad(loads.windRight||0,w):0,unit:"kN/m",tributaryWidth:w,roofLoadAreaBasis,roofLoadBasisReady};
        }
      } else if(m.sectionKey==="wallGirt"){
        const h=Number(m.tributaryHeight||0);
        if(!(h>0))throw new Error("ارتفاع بارگیر دیوار طولی معتبر نیست.");
        const wallDead=loads.wallDeadSupportPath==="girts"?(m.side==="left"?Number(loads.wallDeadLeft||0):Number(loads.wallDeadRight||0)):0;
        if(!Number.isFinite(wallDead)||wallDead<0)throw new Error("وزن سطحی دیوار طولی معتبر نیست.");
        m.lineLoads={dead:wallDead*h,wind:(loads.windWall||0)*h,unit:"kN/m",tributaryHeight:h,wallDeadPressureKPa:wallDead};
      } else if(m.sectionKey==="endGirt"){
        const h=Number(m.tributaryHeight||0);
        if(!(h>0))throw new Error("ارتفاع بارگیر دیوار انتهایی معتبر نیست.");
        const pressure=m.endFace==="front"?(loads.windEndFront||0):(loads.windEndBack||0);
        const wallDead=loads.wallDeadSupportPath==="girts"?(m.endFace==="front"?Number(loads.endWallDeadFront||0):Number(loads.endWallDeadBack||0)):0;
        if(!Number.isFinite(wallDead)||wallDead<0)throw new Error("وزن سطحی دیوار انتهایی معتبر نیست.");
        m.lineLoads={dead:wallDead*h,windEnd:pressure*h,unit:"kN/m",tributaryHeight:h,pressureKPa:pressure,wallDeadPressureKPa:wallDead};
      }
    });
    return {roofPurlinsPresent,roofLoadAreaBasis,roofLoadBasisReady};
  }
  function windMemberLineLoadGlobal(member,geometry,windFactor,windSign) {
    if(!member||!geometry)throw new Error("عضو و هندسه برای تبدیل باد به محور جهانی الزامی است.");
    const factor=Number(windFactor),sign=Number(windSign);
    if(!Number.isFinite(factor)||factor<0||![1,-1].includes(sign))
      throw new Error("ضریب یا علامت باد برای تبدیل جهانی نامعتبر است.");
    const result=[0,0,0],lineLoads=member.lineLoads||{};
    const pressure=(key)=>{
      const value=Number(lineLoads[key]??0);
      if(!Number.isFinite(value))throw new Error("بار باد عضو "+(member.id||"نامشخص")+" در مؤلفه "+key+" معتبر نیست.");
      return value;
    };
    if(member.sectionKey==="roofPurlin"){
      const span=Number(geometry.span),rise=Number(geometry.rise);
      if(!(span>0)||!Number.isFinite(rise)||rise<0)throw new Error("هندسه سقف برای تبدیل بردار باد معتبر نیست.");
      const slope=rise/(span/2),norm=Math.hypot(slope,1);
      const left=pressure("windLeft"),right=pressure("windRight");
      result[0]=(left-right)*slope/norm*factor*sign;
      result[1]=-(left+right)/norm*factor*sign;
    }else if(member.sectionKey==="wallGirt"){
      if(member.side!=="left"&&member.side!=="right")throw new Error("سمت دیوارگیر برای تبدیل باد مشخص نیست.");
      result[0]=(member.side==="left"?1:-1)*pressure("wind")*factor*sign;
    }else if(member.sectionKey==="endGirt"){
      if(member.endFace!=="front"&&member.endFace!=="rear")throw new Error("وجه تیر انتهایی برای تبدیل باد مشخص نیست.");
      result[2]=(member.endFace==="front"?1:-1)*pressure("windEnd")*factor*sign;
    }
    return result;
  }
  function build() {
    const span=val("span",20), length=val("length",30), spacing=val("spacing",5), height=val("height",6), rise=val("rise",2);
    const psp=val("modelPurlinSpacing",1.2), gsp=val("modelGirtSpacing",1.5), endsp=val("modelEndPostSpacing",4);
    const braceBays=Math.max(0,Math.floor(val("modelBraceBays",1)));
    if ([span,length,spacing,height,psp,gsp,endsp].some(x=>!(x>0)) || rise<0) throw new Error("ابعاد اصلی و فاصله اعضای فرعی باید مثبت باشند.");
    const frames=[0]; for(let z=spacing;z<length-1e-8;z+=spacing) frames.push(z);
    if(length-frames[frames.length-1]>1e-8) frames.push(length);
    const nodes=[],members=[],frameNodes=[],half=span/2,slope=Math.hypot(half,rise),cs=half/slope,sn=rise/slope,over=0.8;
    const girtHeights=[],nGirt=Math.max(0,Math.floor(height/gsp));
    for(let i=1;i<=nGirt;i++) if(i*gsp<height-0.25) girtHeights.push(i*gsp);
    const roofY=x=>height+(x<=half?rise*x/half:rise*(span-x)/half);
    const totalRoofSlope=slope+over,roofRows=Math.max(1,Math.ceil(totalRoofSlope/psp)),roofStationWidths=SteelLoadTransfer.equalStationTributaryWidths(totalRoofSlope,roofRows);
    // Every purlin/rafter crossing is a shared structural node, not two coincident but disconnected nodes.
    // End-wall post heads must share the actual end-frame rafter nodes.
    // Otherwise a second coincident gable chord duplicates stiffness and steel self-weight.
    const endPostCount=Math.max(1,Math.ceil(span/endsp));
    const endPostXs=Array.from({length:endPostCount+1},(_,i)=>span*i/endPostCount);
    const roofXs=[0,span,...endPostXs];
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
      const leftColumnLevels=[bl,...girtHeights.map(y=>addNode(nodes,0,y,z,"column-girt-joint")),el];
      const rightColumnLevels=[br,...girtHeights.map(y=>addNode(nodes,span,y,z,"column-girt-joint")),er];
      for(let j=0;j<leftColumnLevels.length-1;j++)
        addMember(members,leftColumnLevels[j],leftColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      for(let j=0;j<rightColumnLevels.length-1;j++)
        addMember(members,rightColumnLevels[j],rightColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      const roofLine=frameRoofXs.map(x=>addNode(nodes,x,roofY(x),z,"rafter-purlin-joint"));
      for(let j=0;j<roofLine.length-1;j++){
        const a=roofLine[j],b=roofLine[j+1],mid=(a.x+b.x)/2;
        const isOverhang=mid<0||mid>span;
        addMember(members,a,b,isOverhang?"کنسول رفتر":"رفتر قاب","rafter",{frame:fi+1,axis:"transverse",side:mid<half?"left":"right",segment:j+1,connectedPurlinNodes:true});
      }
      frameNodes.push({z,bl,el,r,er,br,lt,rt});
    });
    // Build one physical purlin line at each roof station. The ridge is shared
    // by both slopes and must be represented once, with left/right tributary widths.
    const purlinStations=new Map();
    [-1,1].forEach(side=>{
      for(let ri=0;ri<=roofRows;ri++){
        const t=ri/roofRows;
        const x=side<0?(-over*cs+(half+over*cs)*t):(half+(half+over*cs)*t);
        const width=roofStationWidths[ri];
        const key=x.toFixed(7);
        const existing=purlinStations.get(key);
        if(existing){
          existing.side="ridge";
          existing.rowRight=ri+1;
          existing.tributaryWidthRight=width;
          existing.tributaryWidth+=width;
        }else{
          purlinStations.set(key,{x,side:side<0?"left":"right",row:ri+1,
            rowLeft:side<0?ri+1:null,rowRight:side>0?ri+1:null,
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
        const frontExtension=bay===0?over:0, rearExtension=bay===frames.length-2?over:0;
        const fabricationLength=axisLength+frontExtension+rearExtension-clipDeduction-assemblyGap;
        if(!(fabricationLength>0))throw new Error("طول برش پرلین در دهانه "+(bay+1)+" مثبت نیست؛ ابعاد کلیپس و لقی مونتاژ را بررسی کنید.");
        const pieceId="PURLIN_"+station.row+"_"+station.side+"_BAY_"+(bay+1);
        const path=[z1-frontExtension,z1,z2,z2+rearExtension].filter((z,i,arr)=>i===0||Math.abs(z-arr[i-1])>1e-8);
        for(let seg=0;seg<path.length-1;seg++){
          const za=path[seg],zb=path[seg+1];
          const na=addNode(nodes,station.x,roofY(station.x),za,"roof-secondary-support");
          const nb=addNode(nodes,station.x,roofY(station.x),zb,"roof-secondary-support");
          addMember(members,na,nb,"پرلین مستقل عبوری از قاب انتهایی","roofPurlin",{
            side:station.side,row:station.row,rowLeft:station.rowLeft,rowRight:station.rowRight,bay:bay+1,pieceId,
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
    [-over,length+over].forEach(z=>{
      const edgeStations=Array.from(purlinStations.values()).sort((a,b)=>a.x-b.x);
      const edge=edgeStations.map(station=>addNode(nodes,station.x,roofY(station.x),z,"roof-edge"));
      for(let i=0;i<edge.length-1;i++){
        addMember(members,edge[i],edge[i+1],"تیر لبه عرضی پیش‌آمدگی سقف","roofEdge",{
          endFace:z<0?"front":"rear",overhang:0.8,
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
      const count=endPostCount, xs=endPostXs;
      const face=endIndex===0?"front":"rear";
      // End-wall posts are split at every girt intersection so the secondary
      // members share actual nodes instead of crossing disconnected lines.
      for(let i=1;i<count;i++){
        const x=xs[i],top=roofY(x);
        const levels=[0,...girtHeights.filter(y=>y<top-1e-7),top]
          .filter((y,j,a)=>j===0||Math.abs(y-a[j-1])>1e-7);
        const vertical=levels.map(y=>addNode(nodes,x,y,z,y===0?"endwall-base":(Math.abs(y-top)<1e-7?"endwall-head":"endwall-post-joint")));
        for(let j=0;j<vertical.length-1;j++)
          addMember(members,vertical[j],vertical[j+1],"ستونک میانی دیوار انتهایی","endPost",{endFace:face,post:i,segment:j+1});
      }
      // Post heads reuse the split end-frame rafter nodes created above.
      // Do not add a second coincident gable chord: the portal rafter is the load path.
      girtHeights.forEach((y,gi)=>{
        const active=xs.map((x,i)=>({x,i})).filter(v=>roofY(v.x)>=y-1e-7);
        const lower=gi===0?0:(girtHeights[gi-1]+y)/2;
        const upper=gi===girtHeights.length-1?height:(y+girtHeights[gi+1])/2;
        for(let i=0;i<active.length-1;i++){
          const a=addNode(nodes,active[i].x,y,z,"endwall-girt"),b=addNode(nodes,active[i+1].x,y,z,"endwall-girt");
          addMember(members,a,b,"تیر افقی دیوار انتهایی","endGirt",{endFace:face,row:gi+1,tributaryHeight:upper-lower});
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
    const loads=window.SteelLoads?.getData?.()||{};
    const frameTrib=frames.map((z,i)=>i===0?(frames[1]-z)/2:i===frames.length-1?(z-frames[i-1])/2:(frames[i+1]-frames[i-1])/2);
    assignGeometricMemberLineLoads(members,{span,rise},frameTrib,loads);
    model={version:1,geometry:{span,length,spacing,height,rise,frames,frameTributaryWidths:frameTrib,roofPurlinSpacing:psp,wallGirtSpacing:gsp,endPostSpacing:endsp,braceBays,roofOverhang:0.8,endOverhang:0.8,
      roofRows,totalRoofSlope:totalRoofSlope,roofStationSpacing:totalRoofSlope/roofRows},nodes,members,generatedAt:new Date().toISOString()};
    model.orientationAudit=typeof window.SteelFrame3D?.auditMemberOrientation==="function"
      ?window.SteelFrame3D.auditMemberOrientation(model)
      :{memberCount:members.length,verifiedCount:0,unverifiedCount:members.length,readyForCodeDesign:false,unavailable:true,groups:{},note:"ممیزی جهت‌گیری در این محیط بارگذاری نشده است؛ محورهای نصب تأییدنشده تلقی می‌شوند."};
    model.windFootprints=buildRoofPurlinWindFootprints(model);
    return model;
  }
  function draw() {
    if(!model) build(); const svg=$("frameDrawing"); if(!svg)return false;
    const g=model.geometry,W=900,H=480,sx=Math.min(430/(g.span+0.8),300/(g.length+1.6)),sy=Math.min(190/(g.height+g.rise),sx),scale=Math.min(sx,sy);
    const ox=120,oy=330,dx=scale,dz=scale*0.55,dy=scale*0.92,P=n=>({x:ox+n.x*dx+n.z*dz,y:oy-n.y*dy-n.z*dz*0.52});
    svg.innerHTML="";svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("preserveAspectRatio","xMidYMid meet");
    const el=(tag,attrs)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e;};
    el("rect",{x:0,y:0,width:W,height:H,fill:"#f8fafc"});
    const colors={column:"#176b9b",rafter:"#d97706",roofPurlin:"#0f766e",wallGirt:"#64748b",wallBrace:"#dc2626",roofBrace:"#b91c1c",endPost:"#2563eb",endGirt:"#94a3b8",roofEdge:"#b45309"};
    const widths={column:5,rafter:4,roofPurlin:1.8,wallGirt:1.8,wallBrace:2.5,roofBrace:2.5,endPost:2.2,endGirt:1.5,roofEdge:3};
    ["roofPurlin","wallGirt","endGirt","endPost","roofBrace","wallBrace","roofEdge","column","rafter"].forEach(type=>model.members.filter(m=>m.sectionKey===type).forEach(m=>{
      const a=model.nodes.find(n=>n.id===m.start),b=model.nodes.find(n=>n.id===m.end);if(!a||!b)return;
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
    const title=el("text",{x:W/2,y:25,"text-anchor":"middle",fill:"#123b52","font-size":17,"font-family":"Tahoma,Arial"});title.textContent="مدل سه‌بعدی جانمایی اجزای سوله";
    const note=el("text",{x:W/2,y:455,"text-anchor":"middle",fill:"#64748b","font-size":11,"font-family":"Tahoma,Arial"});note.textContent="نمای شماتیک آکسونومتریک ـ مقیاس تصویری";
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
    const orientation=model.orientationAudit||{memberCount:model.members.length,verifiedCount:0,readyForCodeDesign:false,groups:{}};
    const orientationRows=Object.entries(orientation.groups||{}).map(([key,g])=>key+": "+g.count+" عضو، تأییدشده "+g.verified+"، بدون محور مستند "+g.missingReferenceAxis+"، چرخش مقطع تأییدنشده "+g.unverifiedSectionRoll).join("؛ ");
    const orientationSummary="ممیزی جهت‌گیری: "+orientation.verifiedCount+" از "+orientation.memberCount+" عضو دارای محور و چرخش مقطع مستند هستند. "+(orientation.readyForCodeDesign?"جهت‌گیری همه اعضا مستند است.":"آمادگی طراحی آیین‌نامه‌ای از نظر جهت نصب تأیید نشده است.")+" "+orientationRows;
    const target=$("fullModelSummary");if(target)target.innerHTML="<b>مدل هندسی تولید شد:</b> "+model.geometry.frames.length+" قاب اصلی، "+model.nodes.length+" گره و "+model.members.length+" عضو هندسی.<table><thead><tr><th>نوع عضو</th><th>تعداد</th></tr></thead><tbody>"+rows+"</tbody></table><p>بارهای ثقلی سطحی به بار خطی اعضا تبدیل می‌شوند؛ بارهای مرده، زنده و برف و سه ترکیب ثقلی ULS-1 تا ULS-3 در حل‌گر خطی قابل تحلیل‌اند. باد شش‌ناحیه‌ای برای چهار جهت و دو علامت فشار داخلی به اعضای سقف و دیوار منتقل می‌شود؛ ترکیبات باد موجود هنوز آزمایشی‌اند و جایگزین ترکیبات آیین‌نامه‌ای تأییدشده نیستند. زلزله هنوز در مدل اعمال نشده است. پرلین‌های سقف به‌صورت قطعات مجزا بین دو قاب ساخته شده‌اند؛ در تحلیل، انتقال جابه‌جایی در محل تکیه‌گاه برقرار است؛ دو دوران خمشی انتهای هر قطعه پرلین مستقل شده‌اند، اما دوران پیچشی حول محور طولی مشترک باقی می‌ماند. این تقریب مفصل خمشی است و سختی واقعی کلیپس/پیچ، لغزش و خروج از مرکزیت را مدل نمی‌کند. این مدل، مفصل ایده‌آل است و سختی واقعی کلیپس/پیچ، لغزش و اثر خروج از مرکزیت را شامل نمی‌شود؛ سایر گره‌های مشترک فعلاً صلب‌اند. مهاربندهای ترسیم‌شده نیز با مقطع تخصیص‌یافته فعال و در سختی سازه مؤثرند. اگر اتصال واقعی مفصلی، کشویی یا دارای آزادسازی باشد، نتایج فعلی می‌تواند تفاوت قابل‌توجهی داشته باشد.</p><p><b>"+orientationSummary+"</b></p><p><b>محدوده مدل:</b> تحلیل الاستیک خطی سه‌بعدی در حال توسعه است؛ خروجی آن تا تکمیل بارگذاری، شرایط تکیه‌گاهی، آزادسازی‌ها و کنترل‌های آیین‌نامه‌ای، صرفاً مقدماتی است.</p>";
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
        if(!window.SteelSections||typeof window.SteelSections.resolveAnalysis3DSection!=="function")
          throw new Error("اتصال تخصیص‌دهنده مقطع هنوز بارگذاری نشده است.");
        window.SteelSections.resolveAnalysis3DSection(g.member);
      }catch(e){
        const labels={column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید افقی دیوار",endPost:"ستونک دیوار انتهایی",endGirt:"تیر افقی دیوار انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
        missing.push({key:g.key,label:labels[g.key]||g.key,count:g.count,reason:e.message});
      }
    });
    return {ready:missing.length===0,groupCount:groups.size,memberCount:model.members.length,missing};
  }
  function run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports,nodalLoads){
    return new Promise((resolve,reject)=>{
      let worker;
      try{
        worker=new Worker(new URL("js/analysis-3d-worker.js",window.location.href));
      }catch(error){
        reject(new Error("امکان راه‌اندازی پردازشگر پس‌زمینه وجود ندارد: "+error.message));
        return;
      }
      let settled=false;
      const finish=(fn,value)=>{
        if(settled)return;
        settled=true;
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
          nodalLoads:nodalLoads||[],
          releasePurlinRafterRotation:true
        });
      }catch(error){
        finish(reject,new Error("ارسال مدل به پردازشگر پس‌زمینه ناموفق بود: "+error.message));
      }
    });
  }
  async function analyze3D(loadCase){
    build();
    const roofLoadInputs=window.SteelLoads?.getData?.()||{};
    const basisChecks=[
      {key:"deadAreaBasis",values:[roofLoadInputs.deadLeft,roofLoadInputs.deadRight],label:"بار مرده"},
      {key:"liveAreaBasis",values:[roofLoadInputs.liveLeft,roofLoadInputs.liveRight],label:"بار زنده"},
      {key:"snowAreaBasis",values:[roofLoadInputs.snowLeft,roofLoadInputs.snowRight],label:"بار برف"}
    ];
    const missingBasis=basisChecks.find(item=>item.values.some(v=>Number(v)>0)&&
      !["horizontal-projection","sloped-surface"].includes(roofLoadInputs[item.key]));
    if(missingBasis)
      throw new Error("مبنای سطح "+missingBasis.label+" سقف انتخاب نشده است. تصویر افقی یا سطح شیب‌دار را در بخش بارگذاری مشخص کنید؛ تحلیل برای جلوگیری از خطای بار متوقف شد.");
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
    const directionalWindCases={
      zoneWind_tp_ip:{direction:"transverse-positive",scenario:"positive",label:"باد عرضی +X ـ فشار داخلی مثبت"},
      zoneWind_tp_in:{direction:"transverse-positive",scenario:"negative",label:"باد عرضی +X ـ فشار داخلی منفی"},
      zoneWind_tn_ip:{direction:"transverse-negative",scenario:"positive",label:"باد عرضی −X ـ فشار داخلی مثبت"},
      zoneWind_tn_in:{direction:"transverse-negative",scenario:"negative",label:"باد عرضی −X ـ فشار داخلی منفی"},
      zoneWind_lp_ip:{direction:"longitudinal-positive",scenario:"positive",label:"باد طولی +Z ـ فشار داخلی مثبت"},
      zoneWind_lp_in:{direction:"longitudinal-positive",scenario:"negative",label:"باد طولی +Z ـ فشار داخلی منفی"},
      zoneWind_ln_ip:{direction:"longitudinal-negative",scenario:"positive",label:"باد طولی −Z ـ فشار داخلی مثبت"},
      zoneWind_ln_in:{direction:"longitudinal-negative",scenario:"negative",label:"باد طولی −Z ـ فشار داخلی منفی"}
    };
    const serviceWindCases={
      serviceWind_tp_ip:{direction:"transverse-positive",scenario:"positive",label:"باد بهره‌برداری عرضی +X ـ فشار داخلی مثبت"},
      serviceWind_tp_in:{direction:"transverse-positive",scenario:"negative",label:"باد بهره‌برداری عرضی +X ـ فشار داخلی منفی"},
      serviceWind_tn_ip:{direction:"transverse-negative",scenario:"positive",label:"باد بهره‌برداری عرضی −X ـ فشار داخلی مثبت"},
      serviceWind_tn_in:{direction:"transverse-negative",scenario:"negative",label:"باد بهره‌برداری عرضی −X ـ فشار داخلی منفی"},
      serviceWind_lp_ip:{direction:"longitudinal-positive",scenario:"positive",label:"باد بهره‌برداری طولی +Z ـ فشار داخلی مثبت"},
      serviceWind_lp_in:{direction:"longitudinal-positive",scenario:"negative",label:"باد بهره‌برداری طولی +Z ـ فشار داخلی منفی"},
      serviceWind_ln_ip:{direction:"longitudinal-negative",scenario:"positive",label:"باد بهره‌برداری طولی −Z ـ فشار داخلی مثبت"},
      serviceWind_ln_in:{direction:"longitudinal-negative",scenario:"negative",label:"باد بهره‌برداری طولی −Z ـ فشار داخلی منفی"}
    };
    const serviceWind=serviceWindCases[loadCase]||null;
    const directionalWind=directionalWindCases[loadCase]||
      (loadCase==="zoneWindPositive"?{direction:"transverse-positive",scenario:"positive",label:"باد عرضی +X ـ فشار داخلی مثبت"}:
       loadCase==="zoneWindNegative"?{direction:"transverse-positive",scenario:"negative",label:"باد عرضی +X ـ فشار داخلی منفی"}:null);
    const windCase=serviceWind||directionalWind;
    if(windCase){
      selected={key:"zoneWind",label:windCase.label,direction:null,deadFactor:0,
        windFactor:serviceWind?0.64:1,windSign:1,serviceability:!!serviceWind,
        windZoneDirection:windCase.direction,windZoneScenario:windCase.scenario};
    }
    let approvedExternalNodalLoads=[];
    if(loadCase&&typeof loadCase==="object"&&Array.isArray(loadCase.nodalLoads)){
      const type=loadCase.type;
      if(!["seismic","crane"].includes(type))throw new Error("نوع بار گره‌ای خارجی باید seismic یا crane باشد.");
      if(loadCase.sourceVerified!==true||typeof loadCase.sourceReference!=="string"||!loadCase.sourceReference.trim())
        throw new Error("بار زلزله/جرثقیل بدون منبع مستند و تأییدشده قابل تحلیل نیست.");
      approvedExternalNodalLoads=loadCase.nodalLoads;
      selected={key:type,label:String(loadCase.label||(type==="seismic"?"زلزله ـ بار گره‌ای مستند":"جرثقیل ـ بار گره‌ای مستند")),
        direction:[0,0,0],factors:{dead:Number(loadCase.factors?.dead)||0,live:Number(loadCase.factors?.live)||0,snow:Number(loadCase.factors?.snow)||0},
        deadFactor:Number(loadCase.factors?.dead)||0,externalSource:loadCase.sourceReference};
    }else if(loadCase&&typeof loadCase==="object"&&loadCase.factors){
      const f=loadCase.factors;
      selected={key:"combo",label:String(loadCase.label||"ترکیب بار سه‌بعدی"),
        direction:[0,-1,0],
        factors:{dead:Number(f.dead)||0,live:Number(f.live)||0,snow:Number(f.snow)||0},
        windFactor:Number(f.wind)||0,windSign:Number(loadCase.windSign)||1,
        deadFactor:Number(f.dead)||0};
    }else if(/^combo[0-2]$/.test(loadCase)){
      const comboIndex=Number(loadCase.slice(5));
      const combo=window.SteelLoads?.getData?.().combinations?.[comboIndex];
      if(!combo)throw new Error("ضرایب ترکیب بار انتخابی در دسترس نیستند.");
      selected={key:loadCase,label:combo.name,direction:[0,-1,0],
        factors:{dead:Number(combo.dead)||0,live:Number(combo.live)||0,snow:Number(combo.snow)||0},
        deadFactor:Number(combo.dead)||0};
    }else{
      const preliminaryWindCombos=Object.fromEntries(
        window.SteelLoadTransfer.preliminaryWindCombinations().map(combo=>[combo.key,combo])
      );
      const combo=preliminaryWindCombos[loadCase];
      if(combo)selected={key:"combo",label:combo.label,direction:[0,-1,0],
        factors:{dead:combo.dead,live:combo.live,snow:combo.snow,wind:combo.wind},
        windFactor:combo.wind,windSign:combo.sign,deadFactor:combo.dead};
    }
    if(!selected)throw new Error("حالت بار انتخابی پشتیبانی نمی‌شود.");
    let analysisModel={
      nodes:model.nodes.map(n=>({...n})),
      members:model.members.map(m=>({...m}))
    };
    let zoneWindMapping=null;
    if(selected.windZoneScenario){
      const pressureResult=window.SteelClimateLoadEngine?.calculateWindZones?.(selected.windZoneDirection);
      if(!pressureResult||pressureResult.ready!==true)
        throw new Error("دفتر فشار باد شش‌ناحیه‌ای کامل نیست؛ هر شش Cp و ضرایب مشترک را تکمیل کنید.");
      const applied=window.SteelLoadTransfer.applyWindZonePressureMapping(
        analysisModel,pressureResult,selected.windZoneScenario
      );
      analysisModel=applied.model;
      zoneWindMapping=applied.mapping;
    }
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
    // Self-weight is added to the DEAD case only. Steel unit weight = 78.5 kN/m³.
    // Area A comes from the same assigned section properties used by the 3D solver.
    const steelUnitWeightKNm3=78.5;
    let selfWeightKN=0, selfWeightMemberCount=0;
    const selfWeightByGroup=Object.create(null);
    const sectionsByMemberId=Object.create(null);
    analysisModel.members.forEach(m=>{
      const lineLoad=selected.factors
        ? (Number(m.lineLoads?.dead||0)*selected.factors.dead+
           Number(m.lineLoads?.live||0)*selected.factors.live+
           Number(m.lineLoads?.snow||0)*selected.factors.snow)
        : Number(m.lineLoads&&m.lineLoads[selected.key]||0);
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
      const section=window.SteelSections.resolveAnalysis3DSection(m);
      sectionsByMemberId[String(m.id)]={E:section.E,G:section.G,A:section.A,Iy:section.Iy,Iz:section.Iz,J:section.J,
        sectionKey:section.sectionKey,sectionLabel:section.sectionLabel,profile:section.profile,
        manufacturer:section.manufacturer,sourceDocumentId:section.sourceDocumentId,
        catalogReference:section.catalogReference,sourcePage:section.sourcePage,
        sectionDataVerified:section.sectionDataVerified===true};
      let selfWeightLineLoad=0;
      if(selected.deadFactor>0){
        const memberLength=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
        selfWeightLineLoad=section.A*steelUnitWeightKNm3*selected.deadFactor;
        const memberWeight=selfWeightLineLoad*memberLength;
        selfWeightKN+=memberWeight;
        selfWeightMemberCount++;
        const groupKey=String(m.sectionKey||"unknown");
        const group=selfWeightByGroup[groupKey]||(selfWeightByGroup[groupKey]={count:0,lengthM:0,areaM2:section.A,totalKN:0});
        group.count++;group.lengthM+=memberLength;group.totalKN+=memberWeight;
      }
      const totalLineLoad=lineLoad+selfWeightLineLoad;
      let global;
      if(selected.key==="wind"||selected.windFactor>0){
        // Wind inputs are signed NET pressures (kN/m²), not basic wind speed.
        const windFactor=selected.key==="wind"?1:selected.windFactor;
        const windSign=selected.key==="wind"?1:selected.windSign;
        // Positive = pressure toward the enclosed building; negative = suction.
        // Roof pressure is transferred to purlins normal to each roof slope.
        // Side-wall pressure is transferred to longitudinal wall girts, normal to the wall.
        global=windMemberLineLoadGlobal(m,model.geometry,windFactor,windSign).map(value=>value*1000);
        // A wind combination carries its factored gravity actions as well.
        if(selected.key!=="wind")global[1]-=totalLineLoad*1000;
      }else{
        global=selected.direction.map(v=>v*totalLineLoad*1000);
      }
      const local=window.SteelFrame3D.globalVectorToLocal(
        [a.x,a.y,a.z],[b.x,b.y,b.z],global,m.referenceAxis||undefined
      );
      m.analysisLoad={uniformLocal:local,globalUniform:global};
      m.analysisLoad.selfWeightKNm=selfWeightLineLoad;
    });
    const fixed= $("baseConnection")?.value==="fixed";
    const supports=analysisModel.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>({
      nodeId:n.id,
      fixedDofs:fixed?[0,1,2,3,4,5]:[0,1,2]
    }));
    if(!supports.length)throw new Error("هیچ گره پایه‌ای برای تعریف تکیه‌گاه پیدا نشد.");
    if(selected.key==="crane"&&!analysisModel.members.some(member=>
      ["craneRunway","craneRail","craneBracket"].includes(member.sectionKey)))
      throw new Error("تحلیل جرثقیل متوقف شد: تیر حمال، ریل و کنسول جرثقیل هنوز در هندسه سازه مدل نشده‌اند؛ اعمال مستقیم واکنش چرخ به ستون جایگزین مدل مسیر جرثقیل نیست.");
    const nodalLoads=[];
    if(approvedExternalNodalLoads.length){
      const validNodeIds=new Set(analysisModel.nodes.map(n=>n.id));
      approvedExternalNodalLoads.forEach((item,index)=>{
        if(!item||!validNodeIds.has(item.nodeId)||!Array.isArray(item.values)||item.values.length!==6||
          item.values.some(v=>!Number.isFinite(Number(v))))
          throw new Error("بار گره‌ای مستند شماره "+(index+1)+" باید گره موجود و شش مؤلفه محدود بر حسب N/Nm داشته باشد.");
        nodalLoads.push({nodeId:item.nodeId,values:item.values.map(Number)});
      });
    }
    const currentWindInputs=window.SteelLoads?.getData?.()||{};
    let wallFoundationTransfer=null;
    if(Number(selected.deadFactor)>0&&(currentWindInputs.wallDeadSupportPath||"foundation")==="foundation"&&
      ["wallDeadLeft","wallDeadRight","endWallDeadFront","endWallDeadBack"].some(k=>Number(currentWindInputs[k]||0)>0)){
      if(!window.SahroudWallFoundationTransfer)throw new Error("ماژول انتقال بار پوسته دیوار به پایه‌ها بارگذاری نشده است.");
      wallFoundationTransfer=window.SahroudWallFoundationTransfer.createWallFoundationLoadTransfer({
        model:analysisModel,loads:currentWindInputs,deadFactor:Number(selected.deadFactor)
      });
      nodalLoads.push(...wallFoundationTransfer.nodalLoads);
    }
    const gableWallDeadTransfer=[];
    if(Number(selected.deadFactor)>0&&currentWindInputs.wallDeadSupportPath==="girts"){
      const intervals=Math.max(1,Math.ceil(Number(model.geometry.span)/Number(model.geometry.endPostSpacing||4)));
      ["front","rear"].forEach(face=>{
        const pressure=Number(face==="front"?currentWindInputs.endWallDeadFront:currentWindInputs.endWallDeadBack)||0;
        if(!(pressure>0))return;
        const actions=window.SteelLoadTransfer.triangularGablePostEquivalentLoads(
          pressure*Number(selected.deadFactor),Number(model.geometry.span),Number(model.geometry.rise),
          Number(model.geometry.height),intervals
        );
        actions.forEach(action=>{
          const z=face==="front"?0:Number(model.geometry.length);
          const head=analysisModel.nodes.find(n=>Math.abs(n.x-action.xM)<1e-7&&
            Math.abs(n.y-action.supportHeightM)<1e-7&&Math.abs(n.z-z)<1e-7);
          if(!head)throw new Error("گره سر ستونک برای وزن دیوار مثلثی "+face+" پیدا نشد.");
          nodalLoads.push({nodeId:head.id,values:[0,-action.resultantKN*1000,0,0,0,0]});
        });
        gableWallDeadTransfer.push({face,pressureKPa:pressure*Number(selected.deadFactor),
          resultantKN:actions.reduce((sum,item)=>sum+item.resultantKN,0),postStations:actions.length});
      });
    }
    const gableWindTransfer=[];
    const windFactor=selected.key==="wind"?1:Number(selected.windFactor||0);
    const windSign=selected.key==="wind"?1:Number(selected.windSign||1);
    if(windFactor!==0&&Number(model.geometry.rise)>0){
      const intervals=Math.max(1,Math.ceil(Number(model.geometry.span)/Number(model.geometry.endPostSpacing||4)));
      const nodeAt=(x,y,z)=>{
        const found=analysisModel.nodes.find(n=>Math.abs(n.x-x)<1e-7&&Math.abs(n.y-y)<1e-7&&Math.abs(n.z-z)<1e-7);
        if(!found)throw new Error("گره معادل بار باد دیوار انتهایی پیدا نشد: x="+x+", y="+y+", z="+z);
        return found;
      };
      const loadByNode=new Map();
      const addNodal=(node,values)=>{
        const current=loadByNode.get(node.id)||[0,0,0,0,0,0];
        values.forEach((value,i)=>current[i]+=value);
        loadByNode.set(node.id,current);
      };
      ["front","rear"].forEach(face=>{
        const rawPressure=zoneWindMapping?Number(zoneWindMapping.endFacePressures[face]):Number(face==="front"?currentWindInputs.windEndFront:currentWindInputs.windEndBack)||0;
        if(rawPressure===0)return;
        const faceSign=face==="front"?1:-1;
        const pressureKPa=rawPressure*windFactor*windSign*faceSign;
        const actions=window.SteelLoadTransfer.triangularGablePostEquivalentLoads(
          pressureKPa,Number(model.geometry.span),Number(model.geometry.rise),
          Number(model.geometry.height),intervals
        );
        actions.forEach(action=>{
          const z=face==="front"?0:Number(model.geometry.length);
          const base=nodeAt(action.xM,0,z);
          const head=nodeAt(action.xM,action.supportHeightM,z);
          const baseConnected=analysisModel.members.some(member=>
            (member.start===base.id||member.end===base.id)&&
            (member.sectionKey==="column"||member.sectionKey==="endPost"));
          const headConnected=analysisModel.members.some(member=>
            (member.start===head.id||member.end===head.id)&&
            (member.sectionKey==="column"||member.sectionKey==="endPost"||member.sectionKey==="rafter"));
          if(!baseConnected||!headConnected)
            throw new Error("مسیر سازه‌ای ستونک باد مثلثی کامل نیست؛ گره پایه/سر ستونک: "+base.id+" / "+head.id);
          addNodal(base,[0,0,action.baseForceKN*1000,0,action.momentYAboutSupportKNm*1000,0]);
          addNodal(head,[0,0,action.topForceKN*1000,0,0,0]);
        });
        gableWindTransfer.push({
          face,pressureKPa,postStations:actions.length,
          resultantKN:actions.reduce((sum,item)=>sum+item.resultantKN,0),
          momentXAboutGlobalOriginKNm:actions.reduce((sum,item)=>sum+item.topForceKN*item.supportHeightM,0),
          momentYAboutGlobalOriginKNm:actions.reduce((sum,item)=>sum+item.momentYAboutSupportKNm-item.xM*item.resultantKN,0)
        });
      });
      nodalLoads.push(...Array.from(loadByNode,([nodeId,values])=>({nodeId,values})));
    }
    const result=await run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports,nodalLoads);
     if(!window.SahroudFoundationReactionExport)throw new Error("ماژول خروجی واکنش تکیه‌گاهی فونداسیون بارگذاری نشده است.");
     result.foundationReactionExport=window.SahroudFoundationReactionExport.exportSupportReactions({
       nodes:analysisModel.nodes,supports,reactions:result.reactions,loadCase:selected.key,
       loadCaseLabel:selected.label,equilibrium:result.equilibrium
     });
    if(!window.SahroudMemberDemand3D)throw new Error("موتور استخراج تقاضای اعضای سه‌بعدی بارگذاری نشده است.");
    result.memberDemand=window.SahroudMemberDemand3D.extractCase(result,analysisModel);
    result.orientationAudit=window.SteelFrame3D.auditMemberOrientation(analysisModel);
    result.sectionPropertyAudit=window.SteelFrame3D.auditMemberSectionProperties(analysisModel,sectionsByMemberId);
    result.codeDesignInputReadiness={ready:result.orientationAudit.readyForCodeDesign&&result.sectionPropertyAudit.readyForCodeDesign,
      orientationReady:result.orientationAudit.readyForCodeDesign,sectionPropertiesReady:result.sectionPropertyAudit.readyForCodeDesign,
      note:"آمادگی ورودی به معنی تأیید طراحی نیست؛ تحلیل مرتبه اول، مقاومت اعضا، پایداری، اتصالات، بارگذاری و فونداسیون همچنان باید جداگانه کنترل شوند."};
    result.gableWindTransfer=gableWindTransfer;
    if(zoneWindMapping)result.windZoneTransfer={windDirection:zoneWindMapping.windDirection,internalScenario:zoneWindMapping.internalScenario,pressureScale:selected.windFactor,serviceability:!!selected.serviceability,applicationScope:zoneWindMapping.applicationScope,windProcedure:zoneWindMapping.windProcedure,componentsCladdingStatus:zoneWindMapping.componentsCladdingStatus,codeComplianceStatus:zoneWindMapping.codeComplianceStatus,designWarning:zoneWindMapping.designWarning,counts:zoneWindMapping.counts,endFacePressures:zoneWindMapping.endFacePressures};
    if(selected.serviceability)result.windServiceability=window.SteelLoadTransfer.checkWindDrift(
      {...analysisModel,geometry:model.geometry},result.displacements,selected.windZoneDirection,0.0025
    );

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
    result.loadCase=selected.key;
    result.loadCaseLabel=selected.label;
    result.supportType=fixed?"گیردار":"مفصلی";
    result.selfWeight={included:selected.deadFactor>0,deadLoadFactor:selected.deadFactor,unitWeightKNm3:steelUnitWeightKNm3,totalKN:selfWeightKN,memberCount:selfWeightMemberCount,bySectionGroup:selfWeightByGroup};
    result.externalLoadSource=selected.externalSource||null;
    result.loadPathCoverage={
      wallDeadLongitudinalMembers:analysisModel.members.filter(m=>m.sectionKey==="wallGirt"&&Number(m.lineLoads?.dead)>0).length,
      wallDeadEndMembers:analysisModel.members.filter(m=>m.sectionKey==="endGirt"&&Number(m.lineLoads?.dead)>0).length,
      wallDeadSupportPath:currentWindInputs.wallDeadSupportPath||"foundation",
      wallDeadLongitudinalInput:Number(currentWindInputs.wallDeadLeft||0)+Number(currentWindInputs.wallDeadRight||0),
      wallDeadEndInput:Number(currentWindInputs.endWallDeadFront||0)+Number(currentWindInputs.endWallDeadBack||0),
      wallDeadGableTriangle:gableWallDeadTransfer.length?"applied":(currentWindInputs.wallDeadSupportPath==="girts"?"not-applied":"foundation-path-pending"),
      foundationWallLoadsPending:(currentWindInputs.wallDeadSupportPath||"foundation")==="foundation",
      wallFoundationTransfer:wallFoundationTransfer?{
        method:wallFoundationTransfer.method,isFiniteElementShell:wallFoundationTransfer.isFiniteElementShell,
        foundationElementModelled:wallFoundationTransfer.foundationElementModelled,
        foundationDesignPending:wallFoundationTransfer.foundationDesignPending,
        sourceAreaKN:wallFoundationTransfer.sourceAreaKN,resultantKN:wallFoundationTransfer.resultantKN,
        equilibriumResidualKN:wallFoundationTransfer.equilibriumResidualKN,
        supportReactionCount:wallFoundationTransfer.nodalLoads.length,ledger:wallFoundationTransfer.ledger,
        note:wallFoundationTransfer.note
      }:null,
      gableWallDeadTransfer,
      seismicApplied:selected.key==="seismic",
      craneApplied:selected.key==="crane",
      craneRunwayMembers:analysisModel.members.filter(m=>["craneRunway","craneRail","craneBracket"].includes(m.sectionKey)).length
    };
    if(window.SahroudLoadPathAudit){
      result.loadPathAudit=window.SahroudLoadPathAudit.audit({model:analysisModel,result,sectionsByMemberId,supports,loadCase:selected.key});
    }
    result.connectionModel="اتصال پرلین به رفتر: تقریب کلیپس/نبشی دوپیچه؛ انتقال جابه‌جایی مشترک است، دو دوران خمشی پرلین از رفتر جدا شده‌اند و دوران حول محور طولی پرلین مشترک باقی مانده است. این مدل سختی واقعی اتصال را محاسبه نمی‌کند.";
    result.warning="وزن خود فولاد در حالت بار مرده و ترکیبات ثقلی متناسب با ضریب D با وزن مخصوص فرضی 78.5 kN/m³ و مساحت A مقاطع تخصیص‌یافته محاسبه و اضافه شده است. حالت باد، فشار خالص دستی واردشده را به پرلین‌های سقف، قیدهای طولی دو دیوار جانبی و ناحیه مثلثی دیوارهای انتهایی منتقل می‌کند؛ ناحیه مثلثی با نیروها و لنگرهای گره‌ای معادل ایستایی مدل شده است. فشارهای بادگیر/بادپناه، ضرایب فشار خارجی و داخلی، بازشوهای غالب و پیچش کلی هنوز کامل مدل نشده‌اند. ترکیبات موجود D، Lr، S و W در حالت سه‌بعدی مقدماتی قابل تحلیل‌اند، اما ضرایب و پوشش آن‌ها باید با متن رسمی مبحث ششم تطبیق نهایی شوند. ورودی باد در این مرحله سرعت مبنای باد نیست و باید فشار خالص بر حسب kN/m² باشد؛ مثبت به سمت داخل ساختمان و منفی مکش به سمت بیرون است. ترکیبات ثقلی ULS-1 تا ULS-3 جداگانه باقی می‌مانند. اتصال پرلین به رفتر با جداسازی دو دوران خمشی و حفظ دوران پیچشی حول محور طولی پرلین تقریب شده، اما سختی واقعی کلیپس، لغزش پیچ، مقاومت اتصال و جزئیات اجرایی کنترل نشده‌اند. P-Delta و کنترل آیین‌نامه‌ای نیز وجود ندارد. مهاربندهای پیشنهادی با سختی کامل مقطع وارد تحلیل می‌شوند؛ صحت جزئیات اتصال باید جداگانه تأیید شود.";
    return result;
  }
  async function analyze3DCombinations(){
    if(!window.Sahroud3DCombinationRunner)throw new Error("ماژول اجرای ترکیبات سه‌بعدی بارگذاری نشده است.");
    if(!window.SahroudMemberDemand3D)throw new Error("موتور تقاضای اعضا بارگذاری نشده است.");
    build();
    const source=window.SteelLoads?.getData?.();
    if(!source||!Array.isArray(source.combinations))throw new Error("فهرست ترکیبات بار در بخش بارگذاری موجود نیست.");
    const result=await window.Sahroud3DCombinationRunner.run(
      source.combinations,spec=>analyze3D(spec),model,window.SahroudMemberDemand3D
    );
    combinationResults=result.combinationResults;
    combinationEnvelope=result.envelope;
    if(!window.SahroudMemberDesignDemand3D)
      throw new Error("ماژول آماده‌سازی تقاضای طراحی اعضای سه‌بعدی بارگذاری نشده است.");
    result.designDemand=window.SahroudMemberDesignDemand3D.build(result,model,window.SahroudMemberDemand3D);
    return result;
  }
  function getData(){return model?{geometry:model.geometry,nodes:model.nodes,members:model.members,windFootprints:model.windFootprints||[],orientationAudit:model.orientationAudit||null}:null;}
  function setData(data){
    if(data&&data.geometry){const g=data.geometry,map={roofPurlinSpacing:"modelPurlinSpacing",wallGirtSpacing:"modelGirtSpacing",endPostSpacing:"modelEndPostSpacing",braceBays:"modelBraceBays"};Object.entries(map).forEach(([k,id])=>{if($(id)&&g[k]!=null)$(id).value=g[k];});}
    build();draw();showSummary();
  }
  function validate(){try{build();return "";}catch(e){return e.message;}}
  function getProposedUnbracedLengths(){if(!model)build();const g=model.geometry;return{column:g.height,rafter:Math.hypot(g.span/2,g.rise),roofPurlin:g.spacing,wallGirt:g.spacing,status:"پیشنهاد هندسی؛ تا تأیید جزئیات مهار و اتصال، مقدار قطعی طراحی نیست"};}
  function init(){
    ensurePanel();
    if (!document.getElementById("modelProgressStyle")) {
      const style = document.createElement("style");
      style.id = "modelProgressStyle";
      style.textContent = ".model-progress{position:fixed;top:10px;left:10px;right:10px;z-index:2147483000;margin:0;padding:14px;border:3px solid #075985;border-radius:12px;background:#ffffff;color:#102a43;box-shadow:0 8px 28px rgba(0,0,0,.35)}.model-progress[hidden]{display:none!important}.model-progress-head{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:12px}.model-progress-track{height:9px;overflow:hidden;border-radius:99px;background:#d9e8ee;margin:10px 0}.model-progress-track span{display:block;width:38%;height:100%;border-radius:99px;background:linear-gradient(90deg,#176b87,#20a4b8);animation:sahroudProgress 1.15s ease-in-out infinite alternate}.model-progress small{display:block;color:#526b78;font-size:11px}@keyframes sahroudProgress{from{transform:translateX(165%)}to{transform:translateX(-265%)}}";
      document.head.appendChild(style);
    }
    if(window.SteelDrawing){originalDrawFrame=window.SteelDrawing.drawFrame;window.SteelDrawing.drawFrame=function(){try{build();draw();showSummary();return true;}catch(e){console.error(e);return originalDrawFrame?originalDrawFrame():false;}};window.SteelDrawing.drawFullModel=draw;}
    try{build();draw();showSummary();}catch(e){console.warn(e);}
  }
  window.SteelStructuralModel={build,draw,getData,setData,validate,validate3DSections,analyze3D,analyze3DCombinations,getProposedUnbracedLengths,buildRoofPurlinWindFootprints,assignGeometricMemberLineLoads,windMemberLineLoadGlobal,get combinationResults(){return combinationResults.slice();},get combinationEnvelope(){return combinationEnvelope;},get model(){return model;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();