(function(){
"use strict";
const form=document.getElementById("projectForm");
const pages=[...document.querySelectorAll(".page")];
const nav=[...document.querySelectorAll("[data-step]")];
let index=0,timer=null;
const key="sahroudSteel.v3.project";
const field=name=>form.elements.namedItem(name);
function data(){const out={schema:"sahroud-steel-project",version:3,updatedAt:new Date().toISOString(),inputs:{}};for(const el of form.elements){if(!el.name)continue;out.inputs[el.name]=el.value;}if(window.SahroudEngineAdapter)out.engineBridge=window.SahroudEngineAdapter.toLegacyPayload(out);return out;}
function setStatus(s){document.getElementById("saveState").textContent=s;}
function saveLocal(){try{localStorage.setItem(key,JSON.stringify(data()));setStatus("ذخیره خودکار انجام شد");}catch(e){setStatus("ذخیره خودکار در این مرورگر در دسترس نیست؛ فایل JSON بگیرید");}}
function schedule(){clearTimeout(timer);setStatus("در حال ذخیره…");timer=setTimeout(saveLocal,450);}
function load(d){const x=d?.inputs||d;for(const [k,v] of Object.entries(x||{})){const el=field(k);if(el&&v!==undefined)el.value=String(v);}updateGeometry();schedule();}
function go(n){index=Math.max(0,Math.min(pages.length-1,n));pages.forEach((p,i)=>p.classList.toggle("active",i===index));nav.forEach((b,i)=>b.classList.toggle("active",i===index));document.getElementById("prevBtn").disabled=index===0;document.getElementById("nextBtn").textContent=index===pages.length-1?"پایان مراحل":"مرحله بعد";document.getElementById("progressFill").style.width=((index+1)/pages.length*100)+"%";window.scrollTo({top:0,behavior:"smooth"});}
function updateGeometry(){const span=Number(field("span").value),length=Number(field("length").value),spacing=Number(field("frameSpacing").value),height=Number(field("columnHeight").value),slope=Number(field("roofSlope").value),type=field("roofType").value;if(!(span>0&&length>0&&spacing>0&&height>0&&slope>0))return;const bays=Math.ceil(length/spacing),rise=type==="mono"?span*slope/100:span/2*slope/100;field("frameCount").value=bays+1;field("ridgeHeight").value=(height+rise).toFixed(2);document.getElementById("geometrySummary").textContent=span+" × "+length+" متر | شیب "+slope+"٪ | "+(bays+1)+" قاب";drawFrame(span,height,rise,type);}
function drawFrame(span,height,rise,type){const svg=document.getElementById("framePreview");svg.innerHTML="";const ns="http://www.w3.org/2000/svg";const el=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e;};const left=130,right=510,base=218,top=base- Math.min(145,height*18),peak=base-Math.min(205,(height+rise)*18),mid=(left+right)/2;el("line",{x1:40,y1:base,x2:600,y2:base,stroke:"#8a9ca5","stroke-width":2});el("line",{x1:left,y1:base,x2:left,y2:top,stroke:"#176b9b","stroke-width":8,"stroke-linecap":"round"});el("line",{x1:right,y1:base,x2:right,y2:top,stroke:"#176b9b","stroke-width":8,"stroke-linecap":"round"});if(type==="mono"){el("line",{x1:left,y1:top,x2:right,y2:peak,stroke:"#d97706","stroke-width":8,"stroke-linecap":"round"});}else{el("line",{x1:left,y1:top,x2:mid,y2:peak,stroke:"#d97706","stroke-width":8,"stroke-linecap":"round"});el("line",{x1:mid,y1:peak,x2:right,y2:top,stroke:"#d97706","stroke-width":8,"stroke-linecap":"round"});}const t=el("text",{x:320,y:25,"text-anchor":"middle",fill:"#345766","font-size":14});t.textContent=type==="mono"?"قاب تک‌شیب":"قاب دوشیب";}
form.addEventListener("input",()=>{updateGeometry();schedule();});form.addEventListener("change",()=>{updateGeometry();schedule();});
field("city").addEventListener("change",()=>{
 const shahroud=field("city").value==="shahroud";
 const notice=document.getElementById("climateNotice");
 if(shahroud){
  field("snowLoad").value="1.00";field("snowRegion").value="3";
  field("windSpeed").value="90";field("windPressure").value="0.38";
  field("climateElevation").value="1349";field("climateLatitude").value="36.421";
  field("climateLongitude").value="54.957";
  field("climateSource").value="پیش‌فرض اولیه شاهرود؛ نیازمند تطبیق با نسخه نهایی رسمی مبحث ششم ۱۳۹۸ و محل دقیق پروژه";
  notice.textContent="پیش‌فرض شاهرود: منطقه برف ۳ و Ps=1.00 kN/m²، سرعت مبنای باد ۹۰ km/h و q=0.38 kN/m²؛ ارتفاع ایستگاه ۱۳۴۹ متر. مقادیر برای شروع‌اند و پیش از طراحی نهایی باید با نسخه رسمی لازم‌الاجرای مبحث ششم ۱۳۹۸ و محل دقیق پروژه تأیید شوند.";
 }else{
  ["snowLoad","snowRegion","windSpeed","windPressure","climateElevation","climateLatitude","climateLongitude"].forEach(k=>field(k).value="");
  field("climateSource").value="";
  notice.textContent="برای این شهر هنوز پروفایل اقلیمی تأییدشده در بانک نرم‌افزار ثبت نشده است؛ مقادیر را از مرجع رسمی محل پروژه وارد کنید. نرم‌افزار نباید مقادیر شاهرود را به شهر دیگر تعمیم دهد.";
 }
 schedule();
});
nav.forEach((b,i)=>b.addEventListener("click",()=>go(i)));
document.getElementById("prevBtn").addEventListener("click",()=>go(index-1));
document.getElementById("nextBtn").addEventListener("click",()=>{if(index<pages.length-1)go(index+1);else{saveLocal();setStatus("ورودی‌ها ذخیره شدند؛ موتور محاسباتی در مرحله اتصال قرار دارد.");}});
document.getElementById("buildGeometryBtn").addEventListener("click",()=>{
 const out=document.getElementById("geometryResult");
 try{
  const result=window.SahroudSteelGeometry.build(data());
  window.SahroudSteelV3Model=result.model;
  const g=result.model.geometry;
  const groups=Object.entries(result.groups).map(([k,v])=>k+": "+v).join("، ");
  out.textContent=(result.validation.valid?"مدل هندسی تولید شد. ":"مدل تولید شد اما خطای اعتبارسنجی دارد. ")+
   "تعداد قاب: "+g.frameCount+" | گره‌ها: "+result.validation.nodeCount+
   " | اعضا: "+result.validation.memberCount+" | تکیه‌گاه‌های هندسی: "+result.validation.supportCount+
   " | گروه اعضا: "+groups+" | نوع سقف: "+(g.roofType==="mono"?"تک‌شیب":"دوشیب")+
   " . "+result.model.scope+(result.validation.errors.length?" خطاها: "+result.validation.errors.join("؛ "):"");
 }catch(error){out.textContent="تولید مدل هندسی متوقف شد: "+error.message;}
});
function renderProfileAssignments(){
 const host=document.getElementById("sectionProfileAssignments");
 if(!host||!window.SahroudSteelSections)return;
 host.innerHTML="";
 Object.entries(window.SahroudSteelSections.groups).forEach(([key,label])=>{
  const wrap=document.createElement("label");
  if(!["column","rafter","endPost","endGirt"].includes(key)){
   wrap.textContent=label+" — ورود دستی مقطع واقعی Z/C/نبشی/میلگرد در JSON";
   const note=document.createElement("small");note.textContent="کتابخانه IPE برای این گروه به‌عنوان پیش‌فرض پیشنهاد نمی‌شود.";wrap.appendChild(note);host.appendChild(wrap);return;
  }
  wrap.textContent=label+" — انتخاب مقطع IPE";
  const select=document.createElement("select");select.dataset.sectionGroup=key;
  const empty=document.createElement("option");empty.value="";empty.textContent="انتخاب نشده";select.appendChild(empty);
  window.SahroudSteelSections.profiles.IPE.forEach(p=>{const o=document.createElement("option");o.value=p.name;o.textContent=p.name+" | A="+p.A_cm2+" cm²";select.appendChild(o);});
  select.addEventListener("change",()=>{
   if(!select.value)return;
   try{
    const c=JSON.parse(document.getElementById("sectionCatalogInput").value);
    window.SahroudSteelSections.assignProfile(c,key,select.value);
    document.getElementById("sectionCatalogInput").value=JSON.stringify(c,null,2);
    document.getElementById("sectionCatalogResult").textContent=label+": "+select.value+" از جدول مرجع به بانک اضافه شد؛ جهت‌گیری و تناسب کاربرد باید کنترل شود.";
   }catch(e){document.getElementById("sectionCatalogResult").textContent="ابتدا بانک پایه را بسازید: "+e.message;}
  });
  wrap.appendChild(select);host.appendChild(wrap);
 });
}
renderProfileAssignments();
document.getElementById("coldGenerateBtn").addEventListener("click",()=>{
 const out=document.getElementById("coldGenerateResult");
 try{
  const result=window.SahroudColdFormed.make({type:document.getElementById("coldType").value,h:document.getElementById("coldH").value,b1:document.getElementById("coldB1").value,b2:document.getElementById("coldB2").value,t:document.getElementById("coldT").value,lip:document.getElementById("coldLip").value});
  document.getElementById("customSectionName").value=result.name;
  document.getElementById("customSectionPolygon").value=JSON.stringify(result.points);
  document.getElementById("customSectionResult").textContent="مختصات تولید شد. اکنون «محاسبه خواص هندسی» را بزنید و سپس J معتبر را جداگانه وارد کنید.";
  out.textContent=result.note+" مختصات به محاسبه‌گر پایین منتقل شد.";
 }catch(e){out.textContent="ساخت مقطع انجام نشد: "+e.message;}
});
function readCustomSection(){
 const points=JSON.parse(document.getElementById("customSectionPolygon").value);
 return window.SahroudSectionGeometry.calculate(points);
}
document.getElementById("customSectionCalcBtn").addEventListener("click",()=>{
 const out=document.getElementById("customSectionResult");
 try{
  const p=readCustomSection();
  out.textContent="مساحت: "+p.A_cm2.toFixed(3)+" cm² | مرکز سطح: ("+p.cx_mm.toFixed(2)+", "+p.cy_mm.toFixed(2)+") mm | Ix: "+p.Iy_cm4.toFixed(2)+" cm⁴ | Iy: "+p.Iz_cm4.toFixed(2)+" cm⁴ | Ixy: "+p.Ixy_cm4.toFixed(2)+" cm⁴ | ممان‌های اصلی: "+p.principalI1_cm4.toFixed(2)+" و "+p.principalI2_cm4.toFixed(2)+" cm⁴ | زاویه محور اصلی: "+p.principalAngle_deg.toFixed(2)+" درجه. این محورها به نگاشت محلی حل‌گر اعمال نشده‌اند؛ J و مرکز برش/کمانش موضعی نیز محاسبه نشده‌اند.";
 }catch(e){out.textContent="محاسبه انجام نشد: "+e.message;}
});
document.getElementById("customSectionApplyBtn").addEventListener("click",()=>{
 const out=document.getElementById("customSectionResult");
 try{
  const p=readCustomSection(),J=Number(document.getElementById("customSectionJ").value);
  if(!(J>0&&Number.isFinite(J)))throw Error("برای ثبت مقطع در مدل، J معتبر باید جداگانه وارد شود؛ محاسبه‌گر آن را حدس نمی‌زند.");
  const area=document.getElementById("sectionCatalogInput"),c=JSON.parse(area.value);
  const group=document.getElementById("customSectionGroup").value;
  const isCold=/^[CZ]/i.test(document.getElementById("customSectionName").value.trim());
  c.groups[group]={profile:document.getElementById("customSectionName").value.trim()||"مقطع سفارشی",A_cm2:p.A_cm2,Iy_cm4:p.Iy_cm4,Iz_cm4:p.Iz_cm4,J_cm4:J,Ixy_cm4:p.Ixy_cm4,principalI1_cm4:p.principalI1_cm4,principalI2_cm4:p.principalI2_cm4,principalAngle_deg:p.principalAngle_deg,advancedColdFormed:isCold};
  area.value=JSON.stringify(c,null,2);
  out.textContent="مقطع در بانک ثبت شد. "+(isCold?"هشدار: Z/C سردنورد به علت مرکز برش خارج از مرکز، کمانش موضعی/اعوجاجی و اثر پیچش، فعلاً برای تحلیل سازه‌ای خودکار مسدود است؛ ثبت آن فقط برای بانک هندسی است. ":"")+"مقدار J و جهت‌گیری باید از مرجع معتبر کنترل شوند.";
 }catch(e){out.textContent="ثبت انجام نشد: "+e.message;}
});
document.getElementById("sectionTemplateBtn").addEventListener("click",()=>{
 const area=document.getElementById("sectionCatalogInput");
 const c=window.SahroudSteelSections.template();
 const grade=field("steelGrade").value;
 c.material.grade=grade==="ST52"?"ST52 / S355":(grade==="ST44"?"ST44 / S275":"ST37 / S235");
 c.material.Fy_MPa=grade==="ST52"?355:(grade==="ST44"?275:235);
 field("steelFy").value=String(c.material.Fy_MPa);
 c.material.E_GPa=200;c.material.G_GPa=77;
 area.value=JSON.stringify(c,null,2);
 document.querySelectorAll("[data-section-group]").forEach(s=>s.value="");
 document.getElementById("sectionCatalogResult").textContent="بانک پایه بارگذاری شد. E=200 و G=77 گیگاپاسکال؛ Fy اولیه برای ضخامت تا ۱۶ میلی‌متر درج شده است. مقطع هر گروه را جداگانه انتخاب کنید.";
});
document.getElementById("sectionValidateBtn").addEventListener("click",()=>{
 const out=document.getElementById("sectionCatalogResult");
 try{
  const catalog=JSON.parse(document.getElementById("sectionCatalogInput").value);
  const model=window.SahroudSteelGeometry.build(data()).model;
  const result=window.SahroudSteelSections.validate(model,catalog);
  out.textContent=(result.valid?"خواص تمام گروه‌های استفاده‌شده کامل است. ":"اعتبارسنجی متوقف شد. ")+result.errors.concat(result.warnings).join("؛ ");
  if(result.valid){
   window.SahroudSteelV3SectionResolver=window.SahroudSteelSections.resolve(model,catalog);
   window.SahroudSteelV3SectionCatalog=catalog;
   out.textContent+=" نگاشت خواص به واحد SI آماده است؛ تحلیل سوله هنوز اجرا نشده است.";
  }
 }catch(error){out.textContent="بانک مقاطع قابل اعتبارسنجی نیست: "+error.message;}
});
document.getElementById("stabilityScreenBtn").addEventListener("click",()=>{
 const out=document.getElementById("stabilityScreenResult");
 try{
  if(!window.SahroudSteel3D||!window.SahroudSteelSections)throw Error("موتور تحلیل یا بانک مقاطع بارگذاری نشده است.");
  const catalog=JSON.parse(document.getElementById("sectionCatalogInput").value);
  const built=window.SahroudSteelGeometry.build(data());
  if(!built.validation.valid)throw Error("هندسه معتبر نیست: "+built.validation.errors.join("؛ "));
  const model=built.model;
  const resolver=window.SahroudSteelSections.resolve(model,catalog);
  const supports=window.SahroudSteelSections.supports(model,field("baseCondition").value);
  if(supports.length!==model.supportNodes.length||!supports.length)throw Error("تعداد یا تعریف تکیه‌گاه‌ها معتبر نیست.");
  const result=window.SahroudSteel3D.analyze(model,{sectionResolver:resolver,supports,nodalLoads:[]});
  if(!result.success)throw Error("حل‌گر نتیجه موفق اعلام نکرد.");
  if(!result.equilibrium||!result.equilibrium.ok)throw Error("کنترل تعادل داخلی حل‌گر موفق نبود.");
  out.textContent="حل ماتریس سختی بدون بارگذاری موفق شد. "+result.nodeCount+" گره، "+result.memberCount+" عضو، "+supports.length+" تکیه‌گاه؛ درجات آزادی آزاد: "+result.equilibrium.freeDofCount+". با این حال این فقط غربال اولیه است و پایداری فیزیکی، مهاربندی واقعی، بارها، آزادسازی‌ها و ضوابط آیین‌نامه‌ای را تأیید نمی‌کند.";
 }catch(error){out.textContent="غربال اولیه متوقف شد: "+error.message+" هیچ نتیجه طراحی تولید نشد.";}
});
document.getElementById("geometryTestBtn").addEventListener("click",()=>{
 const out=document.getElementById("geometryTestResult");
 try{
  const r=window.SahroudSteelGeometryTests.run();
  out.textContent=(r.passed?"هر دو آزمون هندسه موفق بودند. ":"آزمون هندسه ناموفق بود. ")+
   r.tests.map(t=>(t.roofType==="gable"?"دوشیب":"تک‌شیب")+": "+t.frames+" قاب، "+t.nodes+" گره، "+t.members+" عضو، "+t.supports+" تکیه‌گاه، خیز "+t.riseM+" متر").join(" | ")+
   " . "+r.scope;
 }catch(error){out.textContent="آزمون هندسه ناموفق: "+error.message;}
});
document.getElementById("solverTestBtn").addEventListener("click",()=>{
 const out=document.getElementById("solverTestResult");
 try{
  const result=window.SahroudSteelEngineTests.run();
  const t=result.tests[0];
  out.innerHTML="<h3>"+(result.passed?"آزمون مرجع با موفقیت گذشت":"آزمون مرجع ناموفق بود")+"</h3><p>تغییرمکان نوک تیر: "+t.actualTipDeflectionM.toExponential(5)+" متر؛ مقدار نظری: "+t.expectedTipDeflectionM.toExponential(5)+" متر.</p><p>خطای نسبی تغییرمکان: "+(t.displacementRelativeError*100).toExponential(3)+"٪؛ واکنش تکیه‌گاهی: "+t.supportReactionYN.toFixed(3)+" نیوتن.</p><p>"+(t.equilibrium.ok?"تعادل نیرو و لنگر برقرار است.":"کنترل تعادل ناموفق است.")+"</p><p>این نتیجه فقط اعتبارسنجی اولیه حل‌گر با یک مثال مرجع است؛ مدل سوله هنوز به این موتور متصل نشده است.</p>";
 }catch(error){out.textContent="اجرای آزمون با خطا متوقف شد: "+error.message;}
});
document.getElementById("engineCheckBtn").addEventListener("click",()=>{const result=window.SahroudEngineAdapter?.validateForEngine?.(data());const out=document.getElementById("engineReadiness");if(!result){out.textContent="ماژول اتصال موتور بارگذاری نشده است.";return;}out.innerHTML="<h3>"+(result.ready?"ورودی‌های پایه از نظر ساختاری آماده‌اند":"ورودی‌های پایه ناقص‌اند")+"</h3>"+(result.errors.length?("<b>موارد مانع:</b><ul>"+result.errors.map(x=>"<li>"+x+"</li>").join("")+"</ul>"):"")+(result.warnings.length?("<b>هشدارها و محدودیت‌ها:</b><ul>"+result.warnings.map(x=>"<li>"+x+"</li>").join("")+"</ul>"):"")+"<p>این بررسی فقط آمادگی داده‌ها را می‌سنجد و به‌معنای اجرای تحلیل یا تأیید سازه نیست.</p>";});
document.getElementById("roofGravityLoadBtn").addEventListener("click",()=>{
 const out=document.getElementById("roofGravityLoadResult");
 try{
  if(!window.SahroudSteelLoads||!window.SahroudSteelGeometry||!window.SahroudSteel3D)throw Error("ماژول تولید بار، هندسه یا موتور تحلیل بارگذاری نشده است.");
  const built=window.SahroudSteelGeometry.build(data());
  if(!built.validation.valid)throw Error("هندسه معتبر نیست: "+built.validation.errors.join("؛ "));
  const r=window.SahroudSteelLoads.generate(built.model,{deadLoad:field("deadLoad").value,liveLoad:field("liveLoad").value,snowLoad:field("snowLoad").value,snowRegion:field("snowRegion").value,snowImportance:field("snowImportance").value,snowThermal:field("snowThermal").value,roofSurface:field("roofSurface").value,roofSlope:field("roofSlope").value},window.SahroudSteel3D);
  window.SahroudSteelV3LoadCases=r.cases;
  const d=r.cases.DEAD_ROOF.totalVertical_kN,l=r.cases.LIVE_ROOF.totalVertical_kN,sn=r.cases.BALANCED_SNOW_ROOF.totalVertical_kN;
  out.textContent="سه حالت بار مستقل تولید شد. مرده: "+d.toFixed(2)+" kN | زنده: "+l.toFixed(2)+" kN | برف متوازن: "+sn.toFixed(2)+" kN (Pr="+r.snow.balancedRoof_kN_m2.toFixed(3)+" kN/m²، Cs="+r.snow.slopeFactor.toFixed(3)+") | ردیف پرلین: "+r.rows.length+". "+r.scope;
 }catch(error){out.textContent="تولید بار سقف متوقف شد: "+error.message;}
});
document.getElementById("roofGravityAnalyzeBtn").addEventListener("click",()=>{
 const out=document.getElementById("roofGravityAnalysisResult");
 try{
  if(!window.SahroudSteel3D||!window.SahroudSteelSections||!window.SahroudSteelGeometry||!window.SahroudSteelLoads)throw Error("موتور تحلیل، بانک مقاطع، مولد هندسه یا مولد بارگذاری بارگذاری نشده است.");
  const built=window.SahroudSteelGeometry.build(data());
  if(!built.validation.valid)throw Error("هندسه معتبر نیست: "+built.validation.errors.join("؛ "));
  // Rebuild load cases from the current form values to prevent stale geometry or loads.
  const generated=window.SahroudSteelLoads.generate(built.model,{
   deadLoad:field("deadLoad").value,liveLoad:field("liveLoad").value,snowLoad:field("snowLoad").value,snowRegion:field("snowRegion").value,snowImportance:field("snowImportance").value,snowThermal:field("snowThermal").value,roofSurface:field("roofSurface").value,roofSlope:field("roofSlope").value
  },window.SahroudSteel3D);
  const cases=generated.cases;
  window.SahroudSteelV3LoadCases=cases;
  const catalog=JSON.parse(document.getElementById("sectionCatalogInput").value);
  const check=window.SahroudSteelSections.validate(built.model,catalog);
  if(!check.valid)throw Error("تحلیل به علت نقص مقاطع متوقف شد: "+check.errors.slice(0,8).join("؛ ")+(check.errors.length>8?" و "+(check.errors.length-8)+" مورد دیگر.":""));
  const resolver=window.SahroudSteelSections.resolve(built.model,catalog);
  const supports=window.SahroudSteelSections.supports(built.model,field("baseCondition").value);
  if(!supports.length||supports.length!==built.model.supportNodes.length)throw Error("تکیه‌گاه‌ها ناقص یا نامعتبرند.");
  const results={};
  for(const name of ["DEAD_ROOF","LIVE_ROOF","BALANCED_SNOW_ROOF"]){
   const r=window.SahroudSteel3D.analyze(cases[name].model,{
    sectionResolver:resolver,supports,nodalLoads:[],releasePurlinRafterRotation:true
   });
   if(!r.success)throw Error("حل‌گر برای "+name+" موفق نشد.");
   if(!r.equilibrium||!r.equilibrium.ok)throw Error("کنترل تعادل نیرو یا لنگر در "+name+" ناموفق است.");
   results[name]=r;
  }
  window.SahroudSteelV3AnalysisResults=results;
  const fmt=v=>Number(v).toExponential(3);
  const describe=(name,label)=>{
   const r=results[name],m=r.maxDisplacement;
   return label+": بیشینه انتقال "+fmt(r.maxTranslation*1000)+" mm در گره "+(m?m.nodeId:"—")+
    "؛ واکنش‌های غیرصفر "+r.reactions.length+
    "؛ باقیمانده نسبی تعادل نیرو "+fmt(r.equilibrium.relativeForceResidual)+
    " و لنگر "+fmt(r.equilibrium.relativeMomentResidual);
  };
  out.textContent="تحلیل خطی هر دو حالت بارگذاری با داده‌های فعلی فرم انجام شد. "+describe("DEAD_ROOF","بار مرده")+
   " | "+describe("LIVE_ROOF","بار زنده")+" | "+describe("BALANCED_SNOW_ROOF","برف متوازن")+
   ". بار برف متوازن محاسبه‌شده "+generated.snow.balancedRoof_kN_m2.toFixed(3)+" kN/m² (Cs="+generated.snow.slopeFactor.toFixed(3)+"). بار مرده کل برآوردشده "+generated.cases.DEAD_ROOF.totalVertical_kN.toFixed(2)+
   " kN، بار زنده "+generated.cases.LIVE_ROOF.totalVertical_kN.toFixed(2)+" kN و برف متوازن کل "+generated.cases.BALANCED_SNOW_ROOF.totalVertical_kN.toFixed(2)+
   " kN است. نتایج خام در window.SahroudSteelV3AnalysisResults نگهداری شد. این تحلیل بدون ترکیبات آیین‌نامه‌ای، برف نامتوازن/جزئی/انباشتگی/لغزش، باد، جرثقیل، P-Delta، کمانش و طراحی مقاومت/اتصالات است و تأیید نهایی سازه محسوب نمی‌شود.";
 }catch(error){out.textContent="تحلیل بار سقف متوقف شد: "+error.message+" هیچ نتیجه طراحی یا تأیید سازه‌ای صادر نشد.";}
});
document.getElementById("saveBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(data(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="sahroud-steel-project.json";a.click();URL.revokeObjectURL(url);setStatus("فایل پشتیبان پروژه آماده شد");});
document.getElementById("openBtn").addEventListener("click",()=>document.getElementById("fileInput").click());
document.getElementById("fileInput").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{load(JSON.parse(await f.text()));setStatus("پروژه بارگذاری شد");}catch(err){setStatus("فایل پروژه معتبر نیست");}e.target.value="";});
try{const saved=localStorage.getItem(key);if(saved)load(JSON.parse(saved));}catch(e){setStatus("پروژه ذخیره‌شده قابل بازیابی نبود");}
updateGeometry();go(0);
})();