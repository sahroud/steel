/* SAHROUD STEEL — explicit load-scope selection and engineer approval gate.
 * UI approval records the engineer's declared basis; it is NOT code certification.
 */
(function(root){
 "use strict";
 const $=id=>document.getElementById(id);
 let approved=false, approvedSelection=null;
 const labels={dead:"بار مرده و وزن خود فولاد",live:"بار زنده سقف",snow:"بار برف",wind:"باد",seismic:"زلزله",crane:"جرثقیل"};
 function panel(){
  if($("designLoadScope"))return;
  const welcome=document.querySelector("main .welcome");if(!welcome)return;
  const el=document.createElement("section");el.className="panel";el.id="designLoadScope";
  el.innerHTML=`
   <div class="panel-title"><h3>انتخاب دامنه بارهای طراحی</h3><span class="status">نیازمند تأیید مهندس</span></div>
   <div class="notice">بار مرده و خودوزن فولاد همواره در تحلیل باقی می‌ماند. بارهای متغیر را انتخاب کنید؛ برای هر مورد، مرجع محاسبه/مدرک را ثبت و سپس تأیید کنید. تأیید این فرم صرفاً ثبت مسئولیت و مبنای ورودی است و جایگزین کنترل آیین‌نامه‌ای نیست.</div>
   <div class="form-grid">
    <div class="field"><label><input type="checkbox" checked disabled> بار مرده و وزن خود فولاد (اجباری)</label><input id="scopeDeadRef" type="text" placeholder="مرجع وزن پوشش، عایق، تجهیزات و اجزای دائمی"></div>
    <div class="field"><label><input id="scopeLive" type="checkbox"> بار زنده سقف</label><input id="scopeLiveRef" type="text" placeholder="مرجع/مبنای تعیین بار زنده" disabled></div>
    <div class="field"><label><input id="scopeSnow" type="checkbox"> بار برف</label><input id="scopeSnowRef" type="text" placeholder="مرجع جدول/نقشه و محاسبه برف" disabled></div>
    <div class="field"><label><input id="scopeWind" type="checkbox"> باد</label><input id="scopeWindRef" type="text" placeholder="مرجع ضرایب و فشارهای خالص باد" disabled></div>
    <div class="field"><label><input id="scopeSeismic" type="checkbox"> زلزله</label><input id="scopeSeismicRef" type="text" placeholder="مرجع محاسبه برش پایه و توزیع نیرو" disabled></div>
    <div class="field"><label><input id="scopeCrane" type="checkbox"> جرثقیل سقفی</label><input id="scopeCraneRef" type="text" placeholder="مدارک سازنده، واکنش چرخ و نیروهای افقی" disabled></div>
   </div>
   <div class="notice" id="scopeGateStatus">بارهای متغیر انتخاب نشده‌اند. پس از تکمیل منابع و کنترل ورودی‌ها، دامنه بار را تأیید کنید.</div>
   <div class="button-grid"><button type="button" class="btn primary" id="btnApproveLoadScope">تأیید دامنه بارهای انتخاب‌شده</button><button type="button" class="btn secondary" id="btnResetLoadScope">لغو تأیید</button></div>
   <small>زلزله و جرثقیل در این نسخه هنوز به مسیر کامل تحلیل سه‌بعدی و ترکیبات طراحی متصل نیستند؛ انتخاب آن‌ها تحلیل را متوقف می‌کند تا نتیجه ناقص به‌عنوان طراحی ارائه نشود.</small>`;
  welcome.after(el);
  ["live","snow","wind","seismic","crane"].forEach(k=>{
   const cb=$("scope"+k[0].toUpperCase()+k.slice(1)),ref=$("scope"+k[0].toUpperCase()+k.slice(1)+"Ref");
   cb.addEventListener("change",()=>{ref.disabled=!cb.checked;invalidate("با تغییر انتخاب بار، تأیید قبلی لغو شد.");});
   ref.addEventListener("input",()=>invalidate("با تغییر مرجع بار، تأیید قبلی لغو شد."));
  });
  $("scopeDeadRef").addEventListener("input",()=>invalidate("با تغییر مرجع بار مرده، تأیید قبلی لغو شد."));
  $("btnApproveLoadScope").addEventListener("click",approve);
  $("btnResetLoadScope").addEventListener("click",()=>invalidate("دامنه بار تأیید نشده است."));
 }
 function invalidate(msg){approved=false;approvedSelection=null;const s=$("scopeGateStatus");if(s)s.textContent=msg;}
 function approve(){
  const loads=root.SteelLoads?.getData?.();if(!loads){invalidate("ماژول ورودی بارگذاری در دسترس نیست.");return;}
  const selected=["dead"];
  ["live","snow","wind","seismic","crane"].forEach(k=>{if($("scope"+k[0].toUpperCase()+k.slice(1)).checked)selected.push(k);});
  const refs={dead:$("scopeDeadRef").value.trim()};
  selected.slice(1).forEach(k=>refs[k]=$("scope"+k[0].toUpperCase()+k.slice(1)+"Ref").value.trim());
  const errors=[];
  if(!refs.dead)errors.push("مرجع وزن پوشش و اجزای دائمی را وارد کنید.");
  if(selected.includes("live")){
   if(!(Number(loads.liveLeft)>0||Number(loads.liveRight)>0))errors.push("بار زنده سقف باید مقدار مثبت داشته باشد.");
   if(!["horizontal-projection","sloped-surface"].includes(loads.liveAreaBasis))errors.push("مبنای سطح بار زنده سقف تعیین نشده است.");
   if(!refs.live)errors.push("مرجع بار زنده ثبت نشده است.");
  }
  if(selected.includes("snow")){
   if(!(Number(loads.snowLeft)>0||Number(loads.snowRight)>0))errors.push("بار برف باید مقدار مثبت داشته باشد.");
   if(!["horizontal-projection","sloped-surface"].includes(loads.snowAreaBasis))errors.push("مبنای سطح بار برف تعیین نشده است.");
   if(!refs.snow)errors.push("مرجع بار برف ثبت نشده است.");
  }
  if(selected.includes("wind")){
   if(!["windLeft","windRight","windWall","windEndFront","windEndBack"].some(k=>Math.abs(Number(loads[k])||0)>1e-9))errors.push("حداقل یک فشار خالص باد باید وارد شود.");
   if(!refs.wind)errors.push("مرجع محاسبه فشارهای باد ثبت نشده است.");
  }
  if(selected.includes("seismic"))errors.push("مسیر کامل تحلیل و ترکیبات زلزله هنوز در حل‌گر سه‌بعدی فعال نیست؛ فعلاً این گزینه قابل اجرا نیست.");
  if(selected.includes("crane"))errors.push("مدل تیر حمال، ریل، کنسول و ترکیبات جرثقیل هنوز کامل نیست؛ فعلاً این گزینه قابل اجرا نیست.");
  if(errors.length){invalidate(errors.join(" "));return;}
  approved=true;approvedSelection=Object.freeze({selected:Object.freeze(selected),references:Object.freeze(refs),approvedAt:new Date().toISOString()});
  $("scopeGateStatus").textContent="دامنه بار ثبت و تأیید شد: "+selected.map(k=>labels[k]).join("، ")+". اکنون فقط همین بارهای متغیر وارد تحلیل ترکیبات می‌شوند.";
 }
 function getApprovedSelection(){
  if(!approved||!approvedSelection)throw new Error("ابتدا دامنه بارهای طراحی را در صفحه اصلی انتخاب و تأیید کنید.");
  return approvedSelection;
 }
 const api=Object.freeze({getApprovedSelection,invalidate});
 root.SahroudDesignScope=api;
 document.addEventListener("DOMContentLoaded",panel,{once:true});
})(typeof window!=="undefined"?window:globalThis);
