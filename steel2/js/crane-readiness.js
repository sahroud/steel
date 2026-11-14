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
