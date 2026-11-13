/* SAHROUD STEEL - Full shed geometry model 1.0 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  let model = null, originalDrawFrame = null, progressRunning = false;
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
      '<div class="form-grid"><div class="field"><label for="model3DLoadCase">حالت بار برای تحلیل آزمایشی</label><select id="model3DLoadCase"><option value="dead">بار مرده</option><option value="live">بار زنده</option><option value="snow">بار برف</option><option value="wind">باد ـ فشار خالص ورودی</option><option value="combo0">ترکیب ULS-1: 1.4D</option><option value="combo1">ترکیب ULS-2: 1.2D+1.6L+0.5S</option><option value="combo2">ترکیب ULS-3: 1.2D+1.6S+0.5L</option></select></div></div>' +
      '<div class="button-grid"><button type="button" id="btnRunFull3D" class="btn success">اجرای تحلیل سه‌بعدی کل سوله</button><button type="button" id="btnSolverSelfTest" class="btn secondary">آزمون صحت هسته تحلیل</button><button type="button" id="btnTieBeamIntegrationTest" class="btn secondary">آزمون یکپارچگی شناژ</button><button type="button" id="btnTestSpan10" class="btn secondary">آزمایش مقایسه‌ای دهانه ۱۰ متر</button><button type="button" id="btnDownloadSpanTest" class="btn secondary" disabled>دانلود گزارش آزمایش دهانه</button></div>' +
      '<div id="fullModel3DResult" class="notice">تحلیل سه‌بعدی هنوز اجرا نشده است.</div>' +
      '<div id="criticalRafterDiagram" class="notice" style="margin-top:12px;overflow:hidden">پس از اجرای تحلیل، محل قطعه رفتر متصل به گره بحرانی و مقطع شماتیک تیرورق در این قسمت نمایش داده می‌شود.</div>';
    drawingPanel.parentNode.insertBefore(panel, drawingPanel);
    $("btnBuildFullModel").addEventListener("click", function () {
      runWithProgress("در حال تولید گره‌ها، قاب‌ها، پرلین‌ها و مهاربندها…", stage => {
        build(); draw(); showSummary();
        stage("ترسیم مدل و تکمیل خلاصه هندسی انجام شد.");
      }, e => { $("fullModelSummary").textContent = "خطا در تولید مدل: " + e.message; });
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
          (result.selfWeight&&result.selfWeight.included?" | وزن خود اعضا (فولاد و بتن شناژ) افزوده‌شده: "+result.selfWeight.totalKN.toFixed(2)+" کیلونیوتن در "+result.selfWeight.memberCount+" عضو"+(result.selfWeight.bySectionGroup?" | تفکیک وزن گروه‌ها: "+Object.entries(result.selfWeight.bySectionGroup).map(([k,v])=>k+"="+v.totalKN.toFixed(2)+"kN، "+v.count+" عضو، "+v.lengthM.toFixed(1)+"m").join("؛ "):""):"")+
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
    const totalRoofSlope=slope+over,roofRows=Math.max(1,Math.ceil(totalRoofSlope/psp));
    // Every purlin/rafter crossing is a shared structural node, not two coincident but disconnected nodes.
    const roofXs=[0,span];
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
        addMember(members,a,b,isOverhang?"کنسول رفتر":"رفتر قاب","rafter",{frame:fi+1,axis:"transverse",segment:j+1,connectedPurlinNodes:true});
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
      const count=Math.max(1,Math.ceil(span/endsp)), xs=Array.from(new Set([...Array.from({length:count+1},(_,i)=>span*i/count),half])).sort((a,b)=>a-b);
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
      // Gable top chord connects the heads of the end posts to the main eaves/ridge.
      const topChord=xs.map(x=>addNode(nodes,x,roofY(x),z,"endwall-head"));
      for(let i=0;i<topChord.length-1;i++)
        addMember(members,topChord[i],topChord[i+1],"رفتر قاب دیوار انتهایی","rafter",{endFace:face,axis:"endwall"});
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
    // Assign tributary line loads to the geometric members from current area-load inputs.
    const loads=window.SteelLoads?.getData?.()||{};
    const frameTrib=frames.map((z,i)=>i===0?(frames[1]-z)/2:i===frames.length-1?(z-frames[i-1])/2:(frames[i+1]-frames[i-1])/2);
    members.forEach(m=>{
      if(m.axis==="transverse"){
        const fi=(m.frame||1)-1,tw=frameTrib[fi]||spacing;
        if(m.type.indexOf("رفتر چپ")>=0) m.lineLoads={dead:(loads.deadLeft||0)*tw,live:(loads.liveLeft||0)*tw,snow:(loads.snowLeft||0)*tw,wind:0,unit:"kN/m",tributaryWidth:tw};
        else if(m.type.indexOf("رفتر راست")>=0) m.lineLoads={dead:(loads.deadRight||0)*tw,live:(loads.liveRight||0)*tw,snow:(loads.snowRight||0)*tw,wind:0,unit:"kN/m",tributaryWidth:tw};
        else m.lineLoads={wind:0,unit:"kN/m",tributaryWidth:tw};
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
            unit:"kN/m",tributaryWidth:w,tributaryWidthLeft:wl,tributaryWidthRight:wr
          };
        }else{
          const side=m.side==="left"?"Left":"Right";
          m.lineLoads={dead:(loads["dead"+side]||0)*w,live:(loads["live"+side]||0)*w,snow:(loads["snow"+side]||0)*w,wind:(loads["wind"+side]||0)*w,windLeft:m.side==="left"?(loads.windLeft||0)*w:0,windRight:m.side==="right"?(loads.windRight||0)*w:0,unit:"kN/m",tributaryWidth:w};
        }
      } else if(m.sectionKey==="wallGirt"){
        const h=m.tributaryHeight||0;
        m.lineLoads={wind:(loads.windWall||0)*h,unit:"kN/m",tributaryHeight:h};
      } else if(m.sectionKey==="endGirt"){
        const h=m.tributaryHeight||0;
        const pressure=m.endFace==="front"?(loads.windEndFront||0):(loads.windEndBack||0);
        m.lineLoads={windEnd:pressure*h,unit:"kN/m",tributaryHeight:h,pressureKPa:pressure};
      }
    });
    model={version:1,geometry:{span,length,spacing,height,rise,frames,frameTributaryWidths:frameTrib,roofPurlinSpacing:psp,wallGirtSpacing:gsp,endPostSpacing:endsp,braceBays,roofOverhang:0.8,endOverhang:0.8},nodes,members,generatedAt:new Date().toISOString()};
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
    const target=$("fullModelSummary");if(target)target.innerHTML="<b>مدل هندسی تولید شد:</b> "+model.geometry.frames.length+" قاب اصلی، "+model.nodes.length+" گره و "+model.members.length+" عضو هندسی.<table><thead><tr><th>نوع عضو</th><th>تعداد</th></tr></thead><tbody>"+rows+"</tbody></table><p>بارهای ثقلی سطحی به بار خطی اعضا تبدیل می‌شوند؛ بارهای مرده، زنده و برف و سه ترکیب ثقلی ULS-1 تا ULS-3 در حل‌گر خطی قابل تحلیل‌اند. بار باد و ترکیبات دارای باد/زلزله هنوز در حل‌گر اعمال نمی‌شوند. پرلین‌های سقف به‌صورت قطعات مجزا بین دو قاب ساخته شده‌اند؛ در تحلیل، انتقال جابه‌جایی در محل تکیه‌گاه برقرار و هر سه دوران انتهای هر قطعه آزاد شده است تا پرلین دهانه مجاور پیوسته فرض نشود. این مدل، مفصل ایده‌آل است و سختی واقعی کلیپس/پیچ، لغزش و اثر خروج از مرکزیت را شامل نمی‌شود؛ سایر گره‌های مشترک فعلاً صلب‌اند. مهاربندهای ترسیم‌شده نیز با مقطع تخصیص‌یافته فعال و در سختی سازه مؤثرند. اگر اتصال واقعی مفصلی، کشویی یا دارای آزادسازی باشد، نتایج فعلی می‌تواند تفاوت قابل‌توجهی داشته باشد.</p><p><b>محدوده مدل:</b> تحلیل الاستیک خطی سه‌بعدی در حال توسعه است؛ خروجی آن تا تکمیل بارگذاری، شرایط تکیه‌گاهی، آزادسازی‌ها و کنترل‌های آیین‌نامه‌ای، صرفاً مقدماتی است.</p>";
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
  function run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports){
    return new Promise((resolve,reject)=>{
      let worker;
      try{
        worker=new Worker(new URL("js/analysis-3d-worker.js?v=20261112end-releases1",window.location.href));
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
          releasePurlinRafterRotation:true
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
      selected={key:"combo",label:String(loadCase.label||"ترکیب بار سه‌بعدی"),
        direction:[0,-1,0],
        factors:{dead:Number(f.dead)||0,live:Number(f.live)||0,snow:Number(f.snow)||0,wind:Number(f.wind)||0},
        windFactor:Number(f.wind)||0,windSign:Number(loadCase.windSign)||1,
        deadFactor:Number(f.dead)||0};
    }else if(/^combo[0-2]$/.test(loadCase)){
      const comboIndex=Number(loadCase.slice(5));
      const combo=window.SteelLoads?.getData?.().combinations?.[comboIndex];
      if(!combo)throw new Error("ضرایب ترکیب بار انتخابی در دسترس نیستند.");
      selected={key:loadCase,label:combo.name,direction:[0,-1,0],
        factors:{dead:Number(combo.dead)||0,live:Number(combo.live)||0,snow:Number(combo.snow)||0},
        deadFactor:Number(combo.dead)||0};
    }
    if(!selected)throw new Error("حالت بار انتخابی پشتیبانی نمی‌شود.");
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
            sectionKey:"tieBeam",endReleases:releases,
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
      let section=m.sectionKey==="tieBeam"?m.analysisSection:window.SteelSections.resolveAnalysis3DSection(m);
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
        if(m.sectionKey==="roofPurlin"){
          const half=Number(model.geometry.span)/2;
          const rise=Number(model.geometry.rise);
          const slope=rise/half;
          const norm=Math.hypot(slope,1);
          const left=Number(m.lineLoads?.windLeft||0)*1000*windFactor*windSign;
          const right=Number(m.lineLoads?.windRight||0)*1000*windFactor*windSign;
          global[0]+=left*slope/norm-right*slope/norm;
          global[1]-=(left+right)/norm;
        }else if(m.sectionKey==="wallGirt"){
          const wall=Number(m.lineLoads?.wind||0)*1000*windFactor*windSign;
          global[0]+=m.side==="left"?wall:-wall;
        }else if(m.sectionKey==="endGirt"){
          // Positive pressure acts inward: +Z on the front face and -Z on the rear face.
          const endWall=Number(m.lineLoads?.windEnd||0)*1000*windFactor*windSign;
          global[2]+=m.endFace==="front"?endWall:-endWall;
        }
      }else{
        global=selected.direction.map(v=>v*totalLineLoad*1000);
      }
      const axes=[tr.axes.x,tr.axes.y,tr.axes.z];
      const local=axes.map(axis=>axis.reduce((sum,v,i)=>sum+v*global[i],0));
      m.analysisLoad={uniformLocal:local,globalUniform:global};
      m.analysisLoad.selfWeightKNm=selfWeightLineLoad;
    });
    const fixed= $("baseConnection")?.value==="fixed";
    const supports=analysisModel.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>({
      nodeId:n.id,
      fixedDofs:fixed?[0,1,2,3,4,5]:[0,1,2]
    }));
    if(!supports.length)throw new Error("هیچ گره پایه‌ای برای تعریف تکیه‌گاه پیدا نشد.");
    const result=await run3DAnalysisInWorker(analysisModel,sectionsByMemberId,supports);
    const sourceMembersById=new Map(analysisModel.members.map(m=>[String(m.id),m]));
    result.members.forEach(member=>{
      const source=sourceMembersById.get(String(member.id));
      if(source?.analysisLoad)member.analysisLoad=JSON.parse(JSON.stringify(source.analysisLoad));
    });

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
    result.foundationModelFingerprint=JSON.stringify({
      nodes:analysisModel.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),
      members:analysisModel.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),
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
  async function analyzeFoundationEnvelope(){
    if(!model)build();
    const combos=window.SteelLoads?.getData?.().combinations;
    if(!Array.isArray(combos)||!combos.length)throw new Error("ترکیبات بار در دسترس نیستند.");
    const gravity=combos.map((c,i)=>({label:String(c.name||("ترکیب ثقلی "+(i+1))),factors:{dead:Number(c.dead)||0,live:Number(c.live)||0,snow:Number(c.snow)||0}}));
    if(gravity.some(c=>Object.values(c.factors).some(v=>!Number.isFinite(v))))throw new Error("ضرایب ترکیب بار معتبر نیستند.");
    const windPresent=model.members.some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
    const cases=gravity.map(c=>({label:c.label,factors:c.factors}));
    if(windPresent)gravity.forEach(c=>[1,-1].forEach(sign=>cases.push({label:c.label+" + باد "+(sign>0?"مثبت":"منفی")+" (ضریب ۱٫۰)",factors:c.factors,wind:1,windSign:sign})));
    const nodes=model.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base");
    if(!nodes.length)throw new Error("گره پایه‌ای برای استخراج واکنش وجود ندارد.");
    const samples=[];
    for(let i=0;i<cases.length;i++){
      const spec=cases[i];
      const result=await analyze3D({label:spec.label,factors:{...spec.factors,wind:spec.wind||0},windSign:spec.windSign||1});
      if(!result||!Array.isArray(result.reactions)||!result.foundationModelFingerprint)throw new Error("نتیجه واکنش معتبر برای "+spec.label+" دریافت نشد.");
      const map=new Map(result.reactions.map(r=>[r.nodeId,r.values||[]]));
      samples.push({label:spec.label,factors:{...spec.factors,wind:Number(spec.wind)||0},windSign:spec.windSign||1,equilibrium:result.equilibrium,reactions:nodes.map(n=>({nodeId:n.id,values:(map.get(n.id)||[0,0,0,0,0,0]).slice(0,6)}))});
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
    return {generatedAt:new Date().toISOString(),supportType:$("baseConnection")?.value==="fixed"?"گیردار":"مفصلی",units:"N,N.m",rows,cases:samples.map(s=>({label:s.label,factors:s.factors,windSign:s.windSign,equilibrium:s.equilibrium})),windCasesIncluded:windPresent,windFactor:windPresent?1:null,foundationModelFingerprint:samples[0]?.reactions?JSON.stringify({nodes:model.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),members:model.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),sections:window.SteelSections?.read?.()||null,support:$("baseConnection")?.value||"pinned"}):null,limitations:["پوش فقط بر اساس ترکیبات موجود در نرم‌افزار ساخته شده و ضرایب آن هنوز با نسخه رسمی آیین‌نامه تطبیق نهایی نشده‌اند.","باد مثبت و منفی با ضریب ۱٫۰ فقط غربال مقدماتی است؛ ترکیبات کامل باد، زلزله، uplift و ضرایب بار آیین‌نامه‌ای تضمین نشده‌اند.","تحلیل خطی مرتبه اول است؛ P-Delta، کمانش، اندرکنش خاک و سازه و طراحی پی انجام نشده است."]};
  }
  function getData(){return model?{geometry:model.geometry,nodes:model.nodes,members:model.members}:null;}
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
  window.SteelStructuralModel={build,draw,getData,setData,validate,validate3DSections,analyze3D,analyzeFoundationEnvelope,getProposedUnbracedLengths,get model(){return model;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();