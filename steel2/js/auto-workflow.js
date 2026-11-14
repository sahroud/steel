/* SAHROUD STEEL - One-click preliminary project workflow
   Runs only existing project calculations in dependency order.
   It never invents missing structural restraint or code climate data.
*/
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let busy = false;

  function addLine(rows, label, ok, detail) {
    rows.push({label,ok:!!ok,detail:detail||""});
  }
  function setReport(rows, heading) {
    const out=$("steelAutoWorkflowResults"); if(!out)return;
    const pass=rows.filter(x=>x.ok).length;
    const missing=rows.filter(x=>!x.ok).length;
    out.innerHTML="<h4>"+heading+"</h4>"+
      "<p>مراحل انجام‌شده: "+pass+" | نیازمند تکمیل یا بررسی: "+missing+"</p>"+
      rows.map(x=>'<div class="notice"><b>'+(x.ok?"✓ ":"⚠ ")+x.label+
        "</b>"+(x.detail?"<p>"+String(x.detail).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+"</p>":"")+"</div>").join("");
  }
  function hasUsableClimate() {
    const db=window.SteelClimateDB?.getData?.();
    const id=$("climateCity")?.value;
    const record=db?.records?.[id];
    if(record && record.status && /تأیید رسمی|verified|معتبر و تأیید/i.test(record.status) &&
       Number.isFinite(Number(record.basicWind)) &&
       Number.isFinite(Number(record.groundSnow))) {
      window.SteelClimateDB.loadSelectedCity?.();
      return {ok:true,detail:"داده شهر از بانک با وضعیت تأییدشده به ورودی‌ها منتقل شد."};
    }
    return {ok:false,detail:"برای شهر انتخابی هنوز رکورد باد و برفِ تأییدشده در بانک وجود ندارد؛ نرم‌افزار نباید مقدار حدسی جایگزین کند."};
  }
  function blankOrZero(id) {
    const el=$(id); return !el || el.value.trim()==="" || Number(el.value)===0;
  }
  function autoPrepareSections(rows) {
    const valid=window.SteelSections?.validate?.()===true;
    addLine(rows,"اعتبارسنجی مقاطع اعضای اصلی",valid,
      valid?"مقاطع و خواص هندسی واردشده حفظ شدند.":
      "مقاطع ستون و رفتر باید از طراحی معتبر یا ابعاد/مشخصات صریح تعیین شوند. تولید مقطع از مقادیر پیش‌فرض رابط کاربری در اجرای خودکار متوقف شد.");
    return valid;
  }
  function prepareMaterial(rows) {
    const grade=$("steelGrade"), e=$("steelE"), fy=$("steelFy");
    if(!grade||!e||!fy) {
      addLine(rows,"اعتبارسنجی خواص فولاد",false,"فیلدهای گرید، مدول الاستیسیته و تنش تسلیم در دسترس نیستند.");
      return false;
    }
    const valid=!!grade.value.trim()&&Number(e.value)>0&&Number(fy.value)>0;
    addLine(rows,"اعتبارسنجی خواص فولاد",valid,
      valid?"خواص واردشده حفظ شدند؛ گواهی مصالح و انطباق Fy با ضخامت باید کنترل شود.":
      "گرید، E و Fy باید صریحاً از مشخصات مصالح یا گواهی کارخانه وارد شوند. هیچ گرید یا مقاومت پیش‌فرضی به‌صورت خودکار تخصیص داده نشد.");
    return valid;
  }
  function stabilityGaps() {
    const labels={Lx:"طول مهارنشده محور قوی",Ly:"طول مهارنشده محور ضعیف",Kx:"ضریب طول مؤثر محور قوی",Ky:"ضریب طول مؤثر محور ضعیف"};
    const gaps=[];
    ["column","rafter"].forEach(member=>{
      const values=window.SteelGirder?.readStability?.(member)||{};
      Object.keys(labels).forEach(key=>{
        if(!(Number(values[key])>0)) gaps.push((member==="column"?"ستون":"رفتر")+": "+labels[key]);
      });
    });
    return gaps;
  }
  function runStep(rows,label,fn,verify) {
    try {
      const result=fn();
      const ok=verify?verify(result):result!==false;
      addLine(rows,label,ok,ok?"اجرا شد.":"خروجی معتبر یا پیش‌نیاز کافی دریافت نشد.");
      return ok;
    } catch(e) {
      addLine(rows,label,false,e?.message||String(e));
      return false;
    }
  }
  async function run() {
    if(busy)return;
    busy=true;
    const rows=[];
    try {
      const climate=hasUsableClimate();
      addLine(rows,"تخصیص خودکار بار باد و برف شهر",climate.ok,climate.detail);

      if(window.SteelLoads?.syncLegacyInputs)window.SteelLoads.syncLegacyInputs();
      const loadOK=window.SteelLoads?.check?.()===true;
      addLine(rows,"همگام‌سازی و کنترل ورودی‌های بار",loadOK,
        loadOK?"بارهای موجود و علامت باد حفظ شدند.":"ورودی‌های بار یا پارامترهای اقلیمی نیازمند اصلاح‌اند.");
      if(!loadOK) {
        setReport(rows,"گزارش اجرای خودکار — توقف به علت ورودی بار نامعتبر");
        return;
      }

      // خواص مصالح باید پیش از ساخت/اعتبارسنجی مقاطع اولیه آماده شوند.
      const materialOK=prepareMaterial(rows);
      if(!materialOK) {
        setReport(rows,"گزارش اجرای خودکار — خواص مصالح ناقص است");
        return;
      }

      const sectionOK=autoPrepareSections(rows);
      if(!sectionOK) {
        setReport(rows,"گزارش اجرای خودکار — متوقف‌شدن بخش تحلیل اصلی");
        return;
      }

      const projectError=window.SteelProject?.validate?.()||"";
      if(projectError) {
        addLine(rows,"اعتبارسنجی هندسه و مشخصات پروژه",false,projectError);
        setReport(rows,"گزارش اجرای خودکار — اطلاعات پایه ناقص است");
        return;
      }
      addLine(rows,"اعتبارسنجی هندسه و مشخصات پروژه",true,"ابعاد اصلی و ورودی‌های اجباری معتبرند.");

      let fullModelOK=false;
      try {
        const fullModel=window.SteelStructuralModel?.build?.();
        fullModelOK=!!fullModel&&Array.isArray(fullModel.members)&&fullModel.members.length>0&&window.SteelStructuralModel.draw()===true;
        if(fullModelOK) {
          const types={};
          fullModel.members.forEach(m=>types[m.type]=(types[m.type]||0)+1);
          addLine(rows,"تولید و ترسیم مدل هندسی کامل سوله",true,
            fullModel.geometry.frames.length+" قاب، "+fullModel.nodes.length+" گره و "+fullModel.members.length+" عضو هندسی؛ شامل پرلین، قید دیوار، ستونک انتهایی و مهاربندهای پیشنهادی.");
        } else addLine(rows,"تولید و ترسیم مدل هندسی کامل سوله",false,"مدل هندسی کامل تولید نشد.");
      } catch(e) { addLine(rows,"تولید و ترسیم مدل هندسی کامل سوله",false,e?.message||String(e)); }
      if(!fullModelOK) window.SteelDrawing?.drawFrame?.();
      // اجرای مستقیم و هم‌زمان محاسبه؛ کلیک دکمه با setTimeout اجرا می‌شود
      // و بررسی فوری نتیجه پس از click باعث گزارش کاذب شکست می‌شد.
      let comboRun=null;
      try {
        window.SteelAnalysis.combinationResults=[];
        if(typeof window.SteelAnalysis?.calculateCombinations!=="function") {
          throw new Error("تابع محاسبه هم‌زمان ترکیبات بار در دسترس نیست؛ فایل app.js را به‌روزرسانی کنید.");
        }
        comboRun=await window.SteelAnalysis.calculateCombinations();
      } catch(e) {
        comboRun={success:false,error:e?.message||String(e)};
      }
      const comboOK=!!comboRun?.success&&Array.isArray(window.SteelAnalysis?.combinationResults)&&window.SteelAnalysis.combinationResults.length>0;
      addLine(rows,"تحلیل قاب و همه ترکیبات بار موجود",comboOK,
        comboOK?"تمام "+window.SteelAnalysis.combinationResults.length+" حالت ترکیب بار موجود تحلیل شدند.":(comboRun?.error||"تحلیل ترکیبات بار خروجی معتبر تولید نکرد؛ پیام تحلیل را بررسی کنید."));

      if(comboOK) {
        const taperBridge=window.SteelTaperedCaseForceBridge?.build?.(window.SteelStructuralModel?.getData?.(),window.SteelAnalysis.combinationResults);
        if(taperBridge)window.SteelTaperedCaseForceBridge.lastResult=taperBridge;
        addLine(rows,"انتقال نیروهای هم‌زمان هر ترکیب به قطعات منشوری/متغیرمقطع",!!taperBridge?.success,
          taperBridge?.status==="no-tapered-members"?"در مدل فعلی عضو متغیرمقطع فعال وجود ندارد.":taperBridge?.success?(taperBridge.analysisSegmentCount+" قطعه در "+taperBridge.caseCount+" ترکیب، با حفظ بردارهای ۱۲ مؤلفه‌ای و تعادل هر حالت ثبت شد."):(taperBridge?.issues||["پل انتقال نیرو بارگذاری نشده یا داده کافی نیست."]).join("؛ "));
        const hasMemberDemand=window.SteelAnalysis.combinationResults.some(item=>
          item.memberEnvelopes&&Object.keys(item.memberEnvelopes).length>0);
        addLine(rows,"استخراج تقاضای طراحی اعضا از تحلیل ترکیبات",
          hasMemberDemand,
          hasMemberDemand?"تقاضا و پوش نیروهای اعضا در جدول تفکیکی تحلیل ترکیبات بار تولید شده است؛ دکمه مستقل دیگری برای این مرحله در صفحه وجود ندارد.":"در نتایج ترکیبات، جدول تقاضای تفکیکی اعضا تولید نشده است.");

        addLine(rows,"تحلیل سه‌بعدی قاب‌های طولی و اعضای فرعی",false,
          "حل‌گر فعلی فقط قاب عرضی دوبعدی نمونه را حل می‌کند. نیروهای طولی پرلین‌ها، قیدهای دیوار، ستونک‌های انتهایی و مهاربندها هنوز در ماتریس سختی سه‌بعدی تحلیل نشده‌اند؛ بنابراین طراحی نهایی این اعضا از این مدل هندسی قابل استخراج نیست.");

        const bucklingMessage=$("bucklingMessage");
        if($("combinationBucklingResults"))$("combinationBucklingResults").innerHTML="";
        if(bucklingMessage)bucklingMessage.textContent="کنترل کمانش در حال اجراست...";
        window.SteelStability?.checkCombinationBuckling?.();
        const bucklingText=bucklingMessage?.textContent||"";
        const bucklingOK=/انجام شد|موفق/i.test(bucklingText)&&!/خطا/.test(bucklingText);
        const gaps=stabilityGaps();
        const gapText=gaps.length?"موارد واردنشده: "+gaps.join("؛ ")+". ":"";
        addLine(rows,"کنترل مقدماتی کمانش در ترکیبات بار",bucklingOK,
          bucklingOK?bucklingText:gapText+"طول مهارنشده و K از ترسیم شماتیک مهاربند یا قید به‌تنهایی قابل تأیید نیستند؛ فقط مهارهایی باید منظور شوند که پیوستگی، سختی و اتصال آن‌ها طراحی و تأیید شده باشد. "+bucklingText);

        runStep(rows,"کنترل مقدماتی کنسول رفتر",()=>window.SteelCantileverCheck?.calculate?.(),
          ()=>!!window.SteelCantileverCheck?.lastResult);
      }

      const purlin=window.SteelRoofPurlins;
      if(purlin?.optimize) {
        purlin.optimize();
        const pr=purlin.lastResult;
        addLine(rows,"بهینه‌سازی پرلین‌های سقف",!!pr?.best,
          pr?.best?"مقطع و فاصله پیشنهادی از بارهای فعلی استخراج شد؛ این کنترل مقدماتی است.":"هیچ گزینه‌ای از کنترل‌های مقدماتی عبور نکرد یا ورودی بار/هندسه ناقص است.");
      } else addLine(rows,"بهینه‌سازی پرلین‌های سقف",false,"ماژول پرلین در دسترس نیست.");

      const cant=window.SteelLongitudinalCantilever;
      if(cant?.run) {
        cant.run();
        addLine(rows,"کنترل کنسول طولی پرلین",!!cant.lastResult?.results,
          cant.lastResult?.results?"بار ثقلی و باد با علامت در دو حالت مستقل کنترل شدند.":"ابتدا باید پرلین معتبر انتخاب شود.");
      }

      const roofTie=window.SteelRoofTies;
      if(roofTie?.calculate) {
        roofTie.lastResult=null;
        roofTie.calculate();
        addLine(rows,"محاسبه سختی و ظرفیت مقدماتی قیدهای سقف",!!roofTie.lastResult,
          roofTie.lastResult?"محاسبه مقدماتی انجام شد؛ مشخصات و اتصال قید باید با اجرا تطبیق داده شوند.":"ورودی‌های قید سقف کامل نیستند.");
      }

      const purlinConn=window.SteelPurlinCantileverConnection;
      if(purlinConn?.calculate) {
        purlinConn.lastResult=null;
        purlinConn.calculate();
        addLine(rows,"کنترل مقدماتی اتصال کنسول پرلین",!!purlinConn.lastResult,
          purlinConn.lastResult?"خروجی اتصال محاسبه شد؛ فرضیات پیچ و ورق باید بازبینی شوند.":"مشخصات اتصال یا نتایج پرلین/کنسول ناقص است.");
      }

      const connection=window.SteelConnectionDesign;
      if(connection?.calculate && window.SteelCantileverCheck?.lastResult) {
        const connectionOut=$("connectionCheckResults");
        if(connectionOut)connectionOut.innerHTML="";
        connection.calculate();
        const connectionText=connectionOut?.innerText||connectionOut?.textContent||"";
        const connectionOK=!!connectionText.trim()&&!/ابتدا|خطا|نیاز دارد/.test(connectionText);
        addLine(rows,"تحلیل مقدماتی گروه جوش",connectionOK,connectionOK?"خروجی تحلیل گروه جوش تولید شد؛ فرضیات اتصال باید بازبینی شوند.":connectionText||"ورودی‌های جوش یا نیروهای اتصال کامل نیستند.");
      } else addLine(rows,"تحلیل گروه جوش",false,"به نتیجه کنترل کنسول و مشخصات هندسی/جوش معتبر نیاز دارد.");

      window.SteelBracing?.drawAll?.();
      window.SteelTies?.drawAll?.();
      addLine(rows,"بازسازی ترسیم قیدها و مهاربندها",true,"ترسیم اجزای تعریف‌شده به‌روزرسانی شد.");

      addLine(rows,"تعیین خودکار خواص هندسی مقاطع",true,
        "خواص هندسی ستون و رفتر در صورت وجود ابعاد معتبر از تیرورق محاسبه می‌شود؛ این کار جایگزین تأیید گرید و خواص مکانیکی فولاد نیست.");

      setReport(rows,"گزارش اجرای خودکار پروژه — نتایج مقدماتی");
      if(window.SteelProject?.setStatus)window.SteelProject.setStatus("اجرای خودکار مراحل وابسته انجام شد؛ موارد ناقص در گزارش اجرای خودکار مشخص شده‌اند.");
    } finally {
      busy=false;
    }
  }
  function init() {
    if($("steelAutoWorkflowPanel"))return;
    const main=document.querySelector("main");if(!main)return;
    const panel=document.createElement("section");
    panel.className="panel";panel.id="steelAutoWorkflowPanel";
    panel.innerHTML='<div class="panel-title"><h3>اجرای هوشمند و یکپارچه پروژه</h3><span class="status">اجرای خودکار مراحل وابسته</span></div>'+
      '<div class="notice">با یک فرمان، نرم‌افزار مراحل قابل انجام را به ترتیب اجرا می‌کند: تکمیل مقاطع از ابعاد تیرورق موجود، تحلیل قاب و ترکیبات بار، استخراج تقاضا، کنترل‌های مقدماتی، بهینه‌سازی پرلین و کنترل کنسول و اتصالات. اطلاعات واقعیِ نامعلوم مانند طول مهارنشده، گواهی فولاد و داده اقلیمیِ تأییدنشده حدس زده نمی‌شوند.</div>'+
      '<div class="button-grid"><button type="button" id="btnSteelAutoWorkflow" class="btn primary">آماده‌سازی و تحلیل خودکار کل پروژه</button></div>'+
      '<div id="steelAutoWorkflowResults" class="notice">برای اجرای زنجیره محاسبات، دکمه بالا را بزنید.</div>';
    const first=main.querySelector(".panel");
    if(first)main.insertBefore(panel,first);else main.appendChild(panel);
    $("btnSteelAutoWorkflow").addEventListener("click",run);
  }
  window.SteelAutoWorkflow={run};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();