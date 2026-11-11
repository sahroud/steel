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
    if(window.SteelSections?.validate?.()) {
      addLine(rows,"مشخصات مصالح و مقاطع موجود",true,"اطلاعات فعلی حفظ شد و بازنویسی نشد.");
      return true;
    }
    const emptyProfile = ["column","rafter"].every(p=>
      blankOrZero(p+"Profile") &&
      ["A","Ix","Iy","SxTop","SxBottom","Sy"].every(k=>blankOrZero(p+k))
    );
    if(!emptyProfile) {
      addLine(rows,"تکمیل مشخصات مقاطع",false,"اطلاعات مقطع ناقص یا ناسازگار است؛ برای جلوگیری از جایگزینی ناخواسته، مقادیر موجود را خودکار بازنویسی نکردم.");
      return false;
    }
    const girder=window.SteelGirder;
    if(!girder) {
      addLine(rows,"تولید مشخصات اولیه ستون و رفتر",false,"ماژول تیرورق در دسترس نیست.");
      return false;
    }
    ["column","rafter"].forEach(member=>{
      girder.calculate(member);
      if(girder.members?.[member]?.result) girder.transfer(member);
    });
    const valid=window.SteelSections.validate();
    addLine(rows,"محاسبه و انتقال خودکار خواص هندسی ستون و رفتر",valid,
      valid?"خواص A، Ix، Iy و مدول‌های مقطع از ابعاد تیرورق فعلی محاسبه و منتقل شد. ابعاد پیش‌فرض/انتخابی باید با طرح واقعی تطبیق داده شوند.":"محاسبه تیرورق انجام نشد یا ابعاد آن معتبر نیست.");
    return valid;
  }
  function prepareMaterial(rows) {
    const grade=$("steelGrade"), e=$("steelE"), fy=$("steelFy");
    if(!grade||!e||!fy) {
      addLine(rows,"تخصیص خودکار خواص اولیه فولاد",false,"فیلدهای مصالح در صفحه پیدا نشدند.");
      return false;
    }
    const assigned=[];
    if(!grade.value.trim()) {
      grade.value="ST37 (فرض اولیه؛ نیازمند تأیید)";
      assigned.push("گرید اولیه ST37");
    }
    if(e.value.trim()===""||!(Number(e.value)>0)) {
      e.value="200";
      assigned.push("E=200 GPa");
    }
    if(fy.value.trim()===""||!(Number(fy.value)>0)) {
      fy.value="235";
      assigned.push("Fy=235 MPa");
    }
    const valid=!!grade.value.trim()&&Number(e.value)>0&&Number(fy.value)>0;
    const detail=(assigned.length?"مقادیر خالی تکمیل شد: "+assigned.join("، ")+". ":"مقادیر موجود حفظ شدند. ")+
      "مقادیر فعلی: E="+e.value+" GPa و Fy="+fy.value+" MPa؛ گرید: "+grade.value+
      ". این تخصیص فقط فرض اولیه است؛ Fy باید با استاندارد محصول، ضخامت ورق و گواهی کارخانه تأیید شود.";
    addLine(rows,"تخصیص خودکار خواص اولیه فولاد (غیرقطعی)",false,valid?detail:"مقادیر مصالح معتبر نیستند. "+detail);
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
  function run() {
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

      runStep(rows,"بازترسیم مدل هندسی",()=>window.SteelDrawing?.drawFrame?.());
      const comboButton=$("btnCombinations");
      if(comboButton)comboButton.click();
      const comboOK=Array.isArray(window.SteelAnalysis?.combinationResults)&&window.SteelAnalysis.combinationResults.length>0;
      addLine(rows,"تحلیل قاب و همه ترکیبات بار موجود",comboOK,
        comboOK?"حالت‌های ترکیب بار تعریف‌شده در نرم‌افزار تحلیل شدند.":"تحلیل ترکیبات بار انجام نشد؛ پیام ماژول تحلیل را بررسی کنید.");

      if(comboOK) {
        const hasMemberDemand=window.SteelAnalysis.combinationResults.some(item=>
          item.memberEnvelopes&&Object.keys(item.memberEnvelopes).length>0);
        addLine(rows,"استخراج تقاضای طراحی اعضا از تحلیل ترکیبات",
          hasMemberDemand,
          hasMemberDemand?"تقاضا و پوش نیروهای اعضا در جدول تفکیکی تحلیل ترکیبات بار تولید شده است؛ دکمه مستقل دیگری برای این مرحله در صفحه وجود ندارد.":"در نتایج ترکیبات، جدول تقاضای تفکیکی اعضا تولید نشده است.");

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

      if(!climate.ok) addLine(rows,"تولید بار اقلیمی نهایی برای شهر",false,
        "بانک فعلی نام شهرها را دارد اما رکوردهای معتبر و قابل استناد هنوز تکمیل نشده‌اند. تا آن زمان بار باد و برف خودکار تولید نمی‌شود.");

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