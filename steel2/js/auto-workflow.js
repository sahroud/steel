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
  function updateProgress(label, percent, detail) {
    const out=$("steelAutoWorkflowResults");
    if(!out)return;
    const safe=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    const p=Number.isFinite(percent)?Math.max(0,Math.min(100,Math.round(percent))):null;
    out.innerHTML='<div class="workflow-live-status" role="status" aria-live="polite">'+
      '<div class="workflow-live-heading"><span>اجرای پروژه در حال انجام</span><span class="workflow-live-percent">'+(p===null?"در حال پردازش":p+"٪")+'</span></div>'+
      '<div class="workflow-live-step">'+safe(label)+'</div>'+
      '<progress class="workflow-live-progress"'+(p===null?"":" max=\"100\" value=\""+p+"\"")+'></progress>'+
      '<div class="workflow-live-step">'+safe(detail||"لطفاً صفحه را نبندید؛ پس از پایان، گزارش مراحل نمایش داده می‌شود.")+'</div></div>';
  }
  function paintNow() {
    return new Promise(resolve=>requestAnimationFrame(()=>resolve()));
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
  function render3DMemberDemandEnvelope() {
    const data=window.SteelStructuralModel?.last3DMemberDemandEnvelope;
    const out=$("steelAutoWorkflowResults");
    if(!out||!data||!Array.isArray(data.members)||!data.members.length)return;
    const safe=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    const fmt=(value,scale)=>Number.isFinite(value)?(value/scale).toFixed(2):"—";
    const labels={N:"N (kN)",Vy:"Vy (kN)",Vz:"Vz (kN)",T:"T (kN·m)",My:"My (kN·m)",Mz:"Mz (kN·m)"};
    const columns=Object.keys(labels);
    const cellRange=(v,key)=>v&&Number.isFinite(v.min)&&Number.isFinite(v.max)
      ?fmt(v.min,key==="N"||key.startsWith("V")?1000:1000)+" … "+fmt(v.max,1000):"—";
    const html=data.members.map(member=>{
      const values=member.values||{};
      return "<tr><td>"+safe(member.memberId)+"</td><td>"+safe(member.section||"—")+"</td>"+
        columns.map(key=>"<td dir=\\"ltr\\">"+cellRange(values[key],key)+"</td>").join("")+"</tr>";
    }).join("");
    const section=document.createElement("section");
    section.className="notice";
    section.innerHTML="<h4>پوش نیروهای استخراج‌شده از تحلیل سه‌بعدی</h4>"+
      "<p>ترکیب‌های پذیرفته‌شده: "+data.acceptedCases+" | نتایج ترکیب‌های ردشده: "+data.rejectedCases+
      " | تعداد اعضا: "+data.members.length+"</p>"+
      "<div style=\\"overflow-x:auto;max-width:100%\\"><table style=\\"min-width:900px;width:100%;border-collapse:collapse\\"><thead><tr><th>عضو</th><th>مقطع</th>"+
      columns.map(key=>"<th>"+labels[key]+"</th>").join("")+"</tr></thead><tbody>"+html+"</tbody></table></div>"+
      "<p><b>محدودیت:</b> این جدول فقط پوش نیروهای انتهایی محلی در واحد kN و kN·m است؛ کنترل مقاومت، کمانش، LTB، خیز، ترکیبات کامل آیین‌نامه‌ای و تأیید مقطع هنوز انجام نشده است.</p>";
    out.appendChild(section);
  }

  function hasUsableClimate() {
    const db=window.SteelClimateDB?.getData?.();
    const id=$("climateCity")?.value;
    const record=db?.records?.[id];
    const numeric=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
    if(!record) return {ok:false,detail:"برای شهر انتخابی رکوردی در بانک اقلیم وجود ندارد؛ مقدار شهر دیگری جایگزین نمی‌شود."};
    // Null and empty strings must never pass as numeric zero.
    const hasWind=numeric(record.basicWind), hasSnow=numeric(record.groundSnow);
    const approved=!!record.status&&/تأیید رسمی|verified|معتبر و تأیید/i.test(record.status);
    window.SteelClimateDB.loadSelectedCity?.();
    const values=[];
    if(hasWind) values.push("سرعت باد "+Number(record.basicWind).toFixed(1)+" km/h");
    if(hasSnow) values.push("برف زمین "+Number(record.groundSnow).toFixed(2)+" kN/m²");
    if(numeric(record.basicWindPressure)) values.push("فشار مرجع "+Number(record.basicWindPressure).toFixed(3)+" kN/m²");
    if(numeric(record.snowRegion)) values.push("منطقه برف "+Number(record.snowRegion));
    const valueText=values.length?" مقادیر ثبت‌شده: "+values.join("؛ ")+".":" هنوز مقدار عددی باد یا برف ثبت نشده است.";
    if(approved&&hasWind&&hasSnow) {
      return {ok:true,detail:"رکورد شهر دارای وضعیت تأییدشده است و به ورودی‌های پروژه منتقل شد."+valueText+" ضرایب نهایی باد و برف بام همچنان باید جداگانه کنترل شوند."};
    }
    return {ok:false,detail:"رکورد این شهر هنوز برای طراحی نهایی تأیید نشده است؛ این وضعیت مانع اعلام طراحی آیین‌نامه‌ای معتبر می‌شود، اما اجرای محاسبات مقدماتی موجود را متوقف نمی‌کند."+valueText+" وضعیت منبع: "+(record.status||"ثبت‌نشده")+". هیچ مقدار حدسی جایگزین نمی‌شود."};
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
    addLine(rows,"تخصیص خودکار خواص اولیه فولاد",valid,detail+(valid?" تخصیص ورودی انجام شد؛ تأیید مهندسی خواص مصالح همچنان الزامی است.":" مقادیر مصالح معتبر نیستند."));
    return valid;
  }
  // Build member-force envelopes only from successful, equilibrated 3D cases.
  // Local end-force order follows the 12-DOF frame element: [N,Vy,Vz,T,My,Mz] at i and j.
  // Units are N and N.m. This is demand extraction, not an AISC/مبحث 10 capacity check.
  function build3DMemberDemandEnvelope(caseResults) {
    const components=["N","Vy","Vz","T","My","Mz"];
    const envelope=new Map();
    let acceptedCases=0, rejectedCases=0, acceptedMembers=0;
    (Array.isArray(caseResults)?caseResults:[]).forEach(item=>{
      const result=item?.result;
      if(!item?.success||!item?.equilibriumOK||!Array.isArray(result?.members)||!result.members.length) { rejectedCases++; return; }
      // A case is accepted atomically: one malformed member invalidates the whole case,
      // otherwise the envelope could silently omit a critical member demand.
      const validMembers=result.members.filter(member=>Array.isArray(member?.localEndForces)&&
        member.localEndForces.length===12&&member.localEndForces.every(Number.isFinite)&&
        member.id!==undefined&&member.id!==null);
      if(validMembers.length!==result.members.length) { rejectedCases++; return; }
      acceptedCases++;
      validMembers.forEach(member=>{
        const forces=member.localEndForces;
        acceptedMembers++;
        const key=String(member.id);
        if(!envelope.has(key)) {
          const values={};
          components.forEach((name,index)=>values[name]={min:Infinity,max:-Infinity,maxAbs:0});
          envelope.set(key,{memberId:member.id,type:member.type||"",length:Number(member.length)||null,section:member.section?.profile||"",cases:[],values});
        }
        const entry=envelope.get(key);
        entry.cases.push(item.label||("ترکیب "+(item.index+1)));
        components.forEach((name,index)=>{
          const pair=entry.values[name];
          [forces[index],forces[index+6]].forEach(value=>{
            pair.min=Math.min(pair.min,value);
            pair.max=Math.max(pair.max,value);
            pair.maxAbs=Math.max(pair.maxAbs,Math.abs(value));
          });
        });
      });
    });
    const members=Array.from(envelope.values()).map(entry=>{
      Object.keys(entry.values).forEach(name=>{
        const v=entry.values[name];
        if(!Number.isFinite(v.min)||!Number.isFinite(v.max)) { v.min=null;v.max=null;v.maxAbs=null; }
      });
      entry.cases=[...new Set(entry.cases)];
      return entry;
    });
    return {schema:"sahroud-3d-member-demand-envelope",version:1,units:{force:"N",moment:"N.m"},source:"equilibrated 3D linear-elastic analysis only",acceptedCases,rejectedCases,acceptedMemberResults:acceptedMembers,members,designStatus:"demand-only-not-capacity-checked",limitations:["تحلیل خطی مرتبه اول؛ بدون P-Delta","این پوش نیرو به‌تنهایی کنترل مقاومت، کمانش، LTB، لاغری موضعی یا تغییرمکان آیین‌نامه‌ای نیست.","ترکیبات بار باید کامل و از نظر آیین‌نامه‌ای تأیید شوند."]};
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
    const button=$("btnSteelAutoWorkflow");
    const originalButtonText=button?button.textContent:"▶ اجرای خودکار پروژه";
    if(button){button.disabled=true;button.textContent="در حال اجرای پروژه…";}
    updateProgress("آماده‌سازی و بررسی داده‌های اقلیمی و بارگذاری",5);
    try {
      await paintNow();
      const climate=hasUsableClimate();
      addLine(rows,"تخصیص خودکار بار باد و برف شهر",climate.ok,climate.detail);
      const windRegistry=window.SteelClimateLoadEngine?.getData?.();
      const windCodeReady=!!windRegistry&&windRegistry.cases?.filter(x=>String(x.type).includes("wind")).every(x=>x.eligibleForCodeDesign===true)&&windRegistry.windCalculation?.status==="code-verified-and-applied";
      addLine(rows,"اعتبار آیین‌نامه‌ای و انتقال بار باد",windCodeReady,windCodeReady?"ضرایب باد تأیید و به مدل منتقل شده‌اند.":"بارهای باد فعلی ورودی مقدماتی/دستی هستند؛ ضرایب فشار خارجی و داخلی و نواحی موضعی هنوز تأیید و به مدل سه‌بعدی اعمال نشده‌اند. ترکیب بار باد برای جلوگیری از نتیجه گمراه‌کننده ساخته نشد.");
      addLine(rows,"دفتر ثبت واکنش‌های تکیه‌گاهی سه‌بعدی",false,"حل‌گر برای هر تحلیل سه‌بعدی دفتر واکنش امضادار، مختصات گره، درجات آزادی مقید و واحدهای N و N.m تولید می‌کند. این دفتر به‌تنهایی مجوز انتقال بار به کنترل پی نیست؛ فقط ترکیبات SLS معتبر با مرجع بارگذاری و ژئوتکنیک قابل استفاده‌اند.");

      if(window.SteelLoads?.syncLegacyInputs)window.SteelLoads.syncLegacyInputs();
      const loadOK=window.SteelLoads?.check?.()===true;
      addLine(rows,"همگام‌سازی و کنترل ورودی‌های بار",loadOK,
        loadOK?"بارهای موجود و علامت باد حفظ شدند.":"ورودی‌های بار یا پارامترهای اقلیمی نیازمند اصلاح‌اند.");

      updateProgress("تکمیل خواص مصالح و آماده‌سازی مقاطع",18);
      await paintNow();
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

      updateProgress("اعتبارسنجی هندسه و مشخصات پروژه",30);
      await paintNow();
      const projectError=window.SteelProject?.validate?.()||"";
      if(projectError) {
        addLine(rows,"اعتبارسنجی هندسه و مشخصات پروژه",false,projectError);
        setReport(rows,"گزارش اجرای خودکار — اطلاعات پایه ناقص است");
        return;
      }
      addLine(rows,"اعتبارسنجی هندسه و مشخصات پروژه",true,"ابعاد اصلی و ورودی‌های اجباری معتبرند.");

      updateProgress("ساخت و ترسیم مدل هندسی سوله",42);
      await paintNow();
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
      updateProgress("تحلیل سه‌بعدی ترکیبات بار؛ ممکن است چند لحظه طول بکشد",55);
      await paintNow();
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
      const comboOK=!!comboRun?.success&&Array.isArray(comboRun.cases)&&comboRun.cases.length>0;
      addLine(rows,"تحلیل سه‌بعدی ترکیبات بار موجود",comboOK,
        comboOK?"تمام "+comboRun.cases.length+" حالت ترکیب بار سه‌بعدی موجود حل شدند.":(comboRun?.error||"تحلیل سه‌بعدی ترکیبات بار خروجی معتبر تولید نکرد؛ پیام تحلیل را بررسی کنید."));

      // کنترل‌های اعضا و گزارش فعلی بر ساختار نتایج قاب دوبعدی متکی‌اند.
      // این تحلیل مستقل، پس از حل سه‌بعدی اجرا می‌شود تا نتایج دو مدل با هم مخلوط نشوند.
      updateProgress("محاسبه مرجع دوبعدی برای کنترل اعضا و گزارش",68);
      await paintNow();
      // The legacy 2D combination solver is synchronous and can block the
      // mobile UI thread. Do not invoke it from the one-click workflow.
      // Keep the workflow responsive and clearly mark dependent checks as pending.
      const legacyComboRun={success:false,error:"تحلیل مرجع دوبعدیِ هم‌زمان از اجرای خودکار کنار گذاشته شد تا صفحه روی گوشی قفل نکند؛ اجرای جداگانه/غیرهم‌زمان لازم است."};
      const legacyComboOK=!!legacyComboRun?.success&&Array.isArray(window.SteelAnalysis?.combinationResults)&&window.SteelAnalysis.combinationResults.length>0;
      addLine(rows,"تحلیل دوبعدی مرجع برای کنترل اعضا و گزارش",legacyComboOK,
        legacyComboOK?"نتایج مرجع دوبعدی و ترکیب حاکم برای کنترل‌های فعلی و گزارش آماده شد.":(legacyComboRun?.error||"نتایج مرجع دوبعدی برای کنترل اعضا تولید نشد."));

      if(comboOK) {
        const hasMemberDemand=legacyComboOK&&window.SteelAnalysis.combinationResults.some(item=>
          item.memberEnvelopes&&Object.keys(item.memberEnvelopes).length>0);
        addLine(rows,"استخراج تقاضای طراحی اعضا از تحلیل ترکیبات",
          hasMemberDemand,
          hasMemberDemand?"تقاضا و پوش نیروهای اعضا از تحلیل مرجع دوبعدی تولید شده است؛ نتایج سه‌بعدی جداگانه نگهداری می‌شوند.":"در نتایج مرجع دوبعدی، جدول تقاضای تفکیکی اعضا تولید نشده است.");

        const model3D=window.SteelStructuralModel;
        const threeDResults=[];
        if(typeof model3D?.analyze3D==="function") {
          const combos=window.SteelLoads?.getData?.().combinations||[];
          if(!combos.length) addLine(rows,"تحلیل سه‌بعدی سناریوهای بار",false,"هیچ سناریوی باری در بانک بارگذاری ثبت نشده است؛ تحلیل ترکیبی اجرا نشد.");
          const __draftGravityOnly=combos.some(x=>x.classification==="preliminary-gravity-only"||x.status==="not-code-verified");
          if(__draftGravityOnly) addLine(rows,"وضعیت مجموعه ترکیبات بار",false,"سناریوهای فعلی فقط D، Lr و S را پوشش می‌دهند و فاقد باد، زلزله و سایر ترکیبات لازم‌اند؛ نتیجه آن‌ها تحلیل مقدماتی ثقلی است، نه طراحی نهایی یا کنترل کامل ULS.");
          for(let i=0;i<Math.min(combos.length,3);i++) {
            updateProgress("تحلیل سه‌بعدی سناریو "+(i+1)+" از "+Math.min(combos.length,3),75+Math.round(15*i/Math.max(1,Math.min(combos.length,3))),"حل‌گر در حال محاسبه این سناریو است؛ این مرحله ممکن است زمان‌بر باشد.");
            await paintNow();
            try {
              const result=await model3D.analyze3D("combo"+i);
              const equilibriumOK=!!result?.equilibrium?.ok;
              threeDResults.push({index:i,label:combos[i]?.name||("ترکیب "+(i+1)),success:!!result?.success,equilibriumOK,result});
              addLine(rows,"تحلیل سه‌بعدی مقدماتی "+(combos[i]?.name||("سناریو "+(i+1))),
                !!result?.success&&equilibriumOK,
                result?.success
                  ? "مدل سه‌بعدی در سناریوی ثقلی مقدماتی حل شد؛ "+result.nodeCount+" گره و "+result.memberCount+" عضو. کنترل تعادل "+(equilibriumOK?"قبول شد.":"نیازمند بررسی است.")+" بیشینه جابه‌جایی: "+(Number.isFinite(Number(result.maxTranslation))?(Number(result.maxTranslation)*1000).toFixed(3):"نامشخص")+" میلی‌متر. "+(result.warning||"")
                  : "حل‌گر سه‌بعدی نتیجه معتبر تولید نکرد.");
            } catch(e) {
              threeDResults.push({index:i,label:combos[i]?.name||("ترکیب "+(i+1)),success:false,error:e?.message||String(e)});
              addLine(rows,"تحلیل سه‌بعدی "+(combos[i]?.name||("ترکیب "+(i+1))),false,e?.message||String(e));
            }
          }
          model3D.last3DCombinationResults=threeDResults;
          const memberDemand=build3DMemberDemandEnvelope(threeDResults);
          model3D.last3DMemberDemandEnvelope=memberDemand;
          addLine(rows,"استخراج پوش نیروهای اعضا از تحلیل سه‌بعدی",memberDemand.members.length>0,
            memberDemand.members.length>0
              ? memberDemand.members.length+" عضو از "+memberDemand.acceptedCases+" ترکیب متعادل دارای پوش نیرو شدند؛ نیروها در دستگاه محلی عضو و با واحد N و N.m ثبت شدند. این مرحله فقط استخراج تقاضاست و هنوز کنترل ظرفیت آیین‌نامه‌ای مقطع نیست."
              : "از نتایج سه‌بعدیِ موفق و متعادل، پوش نیروی قابل استفاده استخراج نشد؛ کنترل ظرفیت و انتخاب خودکار مقطع مسدود می‌ماند.");
          const __sahroudReactionLedgerCount=threeDResults.filter(item=>item.success&&item.equilibriumOK&&Array.isArray(item.result?.supportReactionLedger)).length;
          const __sahroudSlsLedgerCount=threeDResults.filter(item=>item.success&&item.equilibriumOK&&Array.isArray(item.result?.supportReactionLedger)&&item.result?.serviceabilityCheck==="foundation-bearing"&&typeof item.result?.combinationDefinition==="string"&&item.result.combinationDefinition.trim().length>0).length;
          addLine(rows,"آمادگی واکنش‌ها برای کنترل پی",false,
            "دفتر واکنش معتبر از نظر حل و تعادل برای "+__sahroudReactionLedgerCount+" ترکیب سه‌بعدی تولید شد؛ از این تعداد "+__sahroudSlsLedgerCount+" ترکیب با برچسب SLS/بهره‌برداری شناسایی شد. انتقال خودکار به پی هنوز مسدود است تا ترکیب بهره‌برداری، علامت محورها و مرجع ژئوتکنیک تأیید شوند؛ ULS جایگزین SLS نیست.");
        } else {
          addLine(rows,"تحلیل سه‌بعدی قاب‌های طولی و اعضای فرعی",false,
            "تابع تحلیل سه‌بعدی در نسخه بارگذاری‌شده در دسترس نیست.");
        }

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

      updateProgress("تجمیع کنترل‌ها و ساخت گزارش نهایی",92);
      await paintNow();
      // Build the consolidated report only after all preceding calculations.
      // The report module performs its own input/result checks and displays
      // an explicit error instead of creating a misleading partial report.
      const reportButton = $("btnFinalReport");
      const reportOutput = $("finalReportResults");
      if (reportButton && reportOutput) {
        reportOutput.innerHTML = "";
        reportButton.click();
        const reportReady = !!reportOutput.querySelector("#printableFinalReport");
        const reportMessage = reportOutput.innerText || reportOutput.textContent || "";
        addLine(rows,"ساخت خودکار گزارش تجمیعی طراحی",reportReady,
          reportReady
            ? "گزارش ترکیبات بار، تقاضای اعضا و کنترل‌های موجود ساخته شد؛ چاپ یا ذخیره PDF با دکمه گزارش انجام می‌شود."
            : (reportMessage.trim() || "ماژول گزارش خروجی قابل چاپ تولید نکرد؛ ورودی‌ها یا کنترل‌های گزارش ناقص‌اند."));
      } else {
        addLine(rows,"ساخت خودکار گزارش تجمیعی طراحی",false,
          "پنل گزارش نهایی یا دکمه تهیه گزارش در صفحه ایجاد نشده است.");
      }

      updateProgress("مراحل اجرا پایان یافت؛ آماده‌سازی گزارش",99);
      await paintNow();
      setReport(rows,"گزارش اجرای خودکار پروژه — نتایج مقدماتی");
      render3DMemberDemandEnvelope();
      if(window.SteelProject?.setStatus)window.SteelProject.setStatus("اجرای خودکار مراحل وابسته انجام شد؛ موارد ناقص در گزارش اجرای خودکار مشخص شده‌اند.");
    } catch (error) {
      addLine(rows,"خطای پیش‌بینی‌نشده در اجرای خودکار",false,error?.message||String(error));
      updateProgress("اجرای خودکار با خطا متوقف شد",null,"خطا: "+(error?.message||String(error)));
      try { setReport(rows,"گزارش اجرای خودکار — خطای اجرایی"); }
      catch (reportError) { console.error("SAHROUD STEEL report rendering failed:",reportError); }
      console.error("SAHROUD STEEL auto workflow failed:",error);
      if(window.SteelProject?.setStatus) window.SteelProject.setStatus("اجرای خودکار با خطا متوقف شد؛ جزئیات در گزارش و کنسول ثبت شد.");
    } finally {
      busy=false;
      if(button){button.disabled=false;button.textContent=originalButtonText;}
    }
  }
  function init() {
    const main=document.querySelector("main");if(!main)return;
    let panel=$("steelAutoWorkflowPanel");
    if(!panel) {
      panel=document.createElement("section");
      panel.className="panel";panel.id="steelAutoWorkflowPanel";
      panel.innerHTML='<div class="panel-title"><h3>اجرای خودکار کل پروژه</h3><span class="status">شروع سریع</span></div>'+
        '<div class="notice">مراحل قابل انجام پروژه را به ترتیب اجرا می‌کند؛ داده‌های نامعلوم را حدس نمی‌زند.</div>'+
        '<div class="button-grid"><button type="button" id="btnSteelAutoWorkflow" class="btn primary">اجرای خودکار پروژه</button></div>'+
        '<div id="steelAutoWorkflowResults" class="notice">برای آغاز، دکمه بالا را بزنید.</div>';
      main.insertBefore(panel,main.firstChild);
    }
    const button=$("btnSteelAutoWorkflow");
    if(button && button.dataset.workflowBound!=="1") {
      button.addEventListener("click",run);
      button.dataset.workflowBound="1";
    }
  }
  window.SteelAutoWorkflow={run,build3DMemberDemandEnvelope};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();