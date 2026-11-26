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
document.getElementById("saveBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(data(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="sahroud-steel-project.json";a.click();URL.revokeObjectURL(url);setStatus("فایل پشتیبان پروژه آماده شد");});
document.getElementById("openBtn").addEventListener("click",()=>document.getElementById("fileInput").click());
document.getElementById("fileInput").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{load(JSON.parse(await f.text()));setStatus("پروژه بارگذاری شد");}catch(err){setStatus("فایل پروژه معتبر نیست");}e.target.value="";});
try{const saved=localStorage.getItem(key);if(saved)load(JSON.parse(saved));}catch(e){setStatus("پروژه ذخیره‌شده قابل بازیابی نبود");}
updateGeometry();go(0);
})();