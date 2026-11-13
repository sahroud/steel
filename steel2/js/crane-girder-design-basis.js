/* SAHROUD STEEL — runway-girder design-basis and evidence gate.
 * This module selects and records a code basis; it does not calculate resistance.
 */
(function(root){
"use strict";
const api=()=>root.SteelDesignCodes?.getData?.();
function audit(p){
 p=p||{};const issues=[],registry=api(),codes=registry?.codes||[];
 const primary=codes.find(c=>c.id===p.primaryCodeId);
 if(!primary)issues.push("مرجع اصلی انتخاب‌شده در رجیستر آیین‌نامه‌ها وجود ندارد.");
 else if(primary.status!=="primary")issues.push("مرجع اصلی باید از گروه مقررات/استاندارد اصلی پروژه انتخاب شود.");
 if(primary&&String(p.primaryEdition||"").trim()!==String(primary.edition||"").trim())issues.push("ویرایش مرجع اصلی باید دقیقاً با رجیستر آیین‌نامه‌ها منطبق شود.");
 if(!String(p.primaryClause||"").trim())issues.push("بند/جدول/شکل دقیق مرجع اصلی ثبت نشده است.");
 if(!String(p.primaryPage||"").trim())issues.push("شماره صفحه یا شناسه محل متن کنترل‌شده ثبت نشده است.");
 if(p.officialTextVerified!==true)issues.push("تأیید مشاهده متن رسمی و اصلاحیه‌های معتبر الزامی است.");
 if(!["LRFD","ASD","not-selected"].includes(p.designMethod)||p.designMethod==="not-selected")issues.push("روش طراحی LRFD یا ASD باید صریحاً انتخاب شود.");
 if(!["weldedI","rolledI","box","channel","other"].includes(p.sectionForm))issues.push("نوع ساخت/شکل مقطع تیر حمال باید تعیین شود.");
 if(!String(p.sectionSource||"").trim())issues.push("مرجع نقشه/کاتالوگ مقطع و خواص آن الزامی است.");
 if(!String(p.geometrySource||"").trim())issues.push("مرجع ابعاد واقعی و تلرانس‌های هندسی مقطع الزامی است.");
 if(!String(p.materialStandard||"").trim()||!String(p.materialGrade||"").trim())issues.push("استاندارد محصول و گرید فولاد باید جداگانه ثبت شوند.");
 if(!String(p.materialCertificate||"").trim())issues.push("مرجع گواهی کارخانه/مدرک مصالح الزامی است.");
 if(!String(p.loadCombinationSource||"").trim())issues.push("مرجع ترکیب بار و حالت بار حاکم ثبت نشده است.");
 if(!String(p.restraintDrawing||"").trim())issues.push("نقشه/مدرک مهاربندی بال فشاری و نقاط مهار الزامی است.");
 if(!String(p.supportDetailSource||"").trim())issues.push("جزئیات تکیه‌گاه، براکت و انتقال بار باید مستند شود.");
 let supplementary=null;
 if(String(p.supplementaryCodeId||"").trim()){
  supplementary=codes.find(c=>c.id===p.supplementaryCodeId);
  if(!supplementary)issues.push("مرجع تکمیلی انتخاب‌شده در رجیستر یافت نشد.");
  else if(supplementary.status!=="supplementary")issues.push("مرجع دوم باید در رجیستر به‌عنوان تکمیلی مشخص شده باشد.");
  if(!String(p.supplementaryClause||"").trim())issues.push("بند مرجع تکمیلی برای تطبیق مستقل ثبت نشده است.");
  if(!String(p.supplementaryPurpose||"").trim())issues.push("هدف و حدود استفاده از مرجع تکمیلی روشن نشده است.");
 }
 const ready=issues.length===0;
 return {success:ready,sourceBasisComplete:ready,analysisEnabled:false,designApproved:false,primaryCode:primary?{id:primary.id,name:primary.name,edition:primary.edition,scope:primary.scope}:null,supplementaryCode:supplementary?{id:supplementary.id,name:supplementary.name,edition:supplementary.edition}:null,designMethod:p.designMethod||null,sectionForm:p.sectionForm||null,issues,limitations:[
 "این ممیزی فقط کامل‌بودن مبنای طراحی و مدارک ورودی را بررسی می‌کند؛ هیچ ظرفیت، مقاومت یا نسبت بهره‌برداری محاسبه نمی‌شود.",
 "تطبیق نام ویرایش با رجیستر به معنی کنترل حقوقی آخرین اصلاحیه، تاریخ لازم‌الاجرا یا صحت بند نیست؛ متن رسمی باید توسط مهندس مسئول بررسی شود.",
 "مرجع تکمیلی خارجی جایگزین مقررات ملی ایران نیست و فقط در محدوده و هدف ثبت‌شده قابل استفاده است.",
 "تأیید این ممیزی به معنی تأیید طراحی، ساخت یا ایمنی تیر حمال جرثقیل نیست."
 ]};
}
function readUI(){
 const ids=["primaryCodeId","primaryEdition","primaryClause","primaryPage","officialTextVerified","designMethod","sectionForm","sectionSource","geometrySource","materialStandard","materialGrade","materialCertificate","loadCombinationSource","restraintDrawing","supportDetailSource","supplementaryCodeId","supplementaryClause","supplementaryPurpose"],p={};
 ids.forEach(k=>{const e=root.document?.getElementById?.("craneBasis_"+k);if(e)p[k]=k==="officialTextVerified"?e.checked:e.value;});
 return p;
}
function setData(p){
 p=p||{};Object.keys(p).forEach(k=>{const e=root.document?.getElementById?.("craneBasis_"+k);if(e){if(k==="officialTextVerified")e.checked=p[k]===true;else e.value=p[k]??"";}});
}
function renderResult(r){
 const host=root.document?.getElementById?.("craneGirderBasisResult");if(host)host.textContent=JSON.stringify(r,null,2);return r;
}
function run(){return renderResult(audit(readUI()));}
function mount(){
 const doc=root.document;if(!doc||doc.getElementById("craneGirderBasisPanel"))return;
 const main=doc.querySelector("main");if(!main)return;
 const codes=api()?.codes||[],primary=codes.filter(c=>c.status==="primary"),supp=codes.filter(c=>c.status==="supplementary");
 const opts=a=>'<option value="">— انتخاب نشده —</option>'+a.map(c=>'<option value="'+c.id+'">'+c.name+' | '+c.edition+'</option>').join("");
 const p=doc.createElement("section");p.className="panel";p.id="craneGirderBasisPanel";
 p.innerHTML='<div class="panel-title"><h3>مبنای آیین‌نامه‌ای تیر حمال جرثقیل</h3><span class="status">ثبت شواهد، بدون محاسبه مقاومت</span></div>'+
 '<div class="notice">برای جلوگیری از استفاده خاموش از ویرایش یا بند اشتباه، مرجع اصلی، روش طراحی، شکل مقطع، مدارک مصالح، ترکیب بار و جزئیات مهار/تکیه‌گاه را ثبت کنید. این بخش هیچ ظرفیت طراحی تولید نمی‌کند.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label>مرجع اصلی</label><select id="craneBasis_primaryCodeId">'+opts(primary)+'</select></div>'+
 '<div class="field"><label>ویرایش دقیق مطابق رجیستر</label><input id="craneBasis_primaryEdition"></div>'+
 '<div class="field"><label>بند / جدول / شکل دقیق</label><input id="craneBasis_primaryClause"></div>'+
 '<div class="field"><label>صفحه یا شناسه محل متن</label><input id="craneBasis_primaryPage"></div>'+
 '<div class="field"><label>روش طراحی</label><select id="craneBasis_designMethod"><option value="not-selected">انتخاب نشده</option><option value="LRFD">LRFD</option><option value="ASD">ASD</option></select></div>'+
 '<div class="field"><label>شکل/نوع مقطع</label><select id="craneBasis_sectionForm"><option value="">انتخاب نشده</option><option value="weldedI">I ساخته‌شده جوشی</option><option value="rolledI">I نوردشده</option><option value="box">جعبه‌ای</option><option value="channel">ناودانی</option><option value="other">سایر</option></select></div>'+
 '<div class="field"><label>مرجع نقشه/کاتالوگ مقطع</label><input id="craneBasis_sectionSource"></div>'+
 '<div class="field"><label>مرجع هندسه و تلرانس</label><input id="craneBasis_geometrySource"></div>'+
 '<div class="field"><label>استاندارد محصول فولاد</label><input id="craneBasis_materialStandard" placeholder="استاندارد محصول، نه فقط نام تجاری"></div>'+
 '<div class="field"><label>گرید فولاد</label><input id="craneBasis_materialGrade" placeholder="مثلاً ST37 / S235 با مدرک انطباق"></div>'+
 '<div class="field"><label>گواهی کارخانه/مصالح</label><input id="craneBasis_materialCertificate"></div>'+
 '<div class="field"><label>مرجع ترکیبات بار و حالت بار</label><input id="craneBasis_loadCombinationSource"></div>'+
 '<div class="field"><label>نقشه مهاربندی بال فشاری</label><input id="craneBasis_restraintDrawing"></div>'+
 '<div class="field"><label>جزئیات تکیه‌گاه و براکت</label><input id="craneBasis_supportDetailSource"></div>'+
 '<div class="field"><label>مرجع تکمیلی اختیاری</label><select id="craneBasis_supplementaryCodeId">'+opts(supp)+'</select></div>'+
 '<div class="field"><label>بند مرجع تکمیلی</label><input id="craneBasis_supplementaryClause"></div>'+
 '<div class="field"><label>هدف و حدود تطبیق تکمیلی</label><input id="craneBasis_supplementaryPurpose"></div>'+
 '<div class="field"><label><input type="checkbox" id="craneBasis_officialTextVerified"> متن رسمی و اصلاحیه‌های لازم‌الاجرا را شخصاً کنترل کرده‌ام</label></div>'+
 '</div><div class="button-grid"><button id="craneBasisRun" class="btn primary" type="button">ممیزی مبنای طراحی</button></div><pre id="craneGirderBasisResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const anchor=doc.getElementById("craneGirderLocalScreenPanel");if(anchor)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 doc.getElementById("craneBasisRun").addEventListener("click",run);
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const valid={primaryCodeId:"m10",primaryEdition:"ویرایش پنجم، ۱۴۰۱",primaryClause:"بند آزمایشی ثبت‌شده توسط بازبین",primaryPage:"صفحه کنترل‌شده",officialTextVerified:true,designMethod:"LRFD",sectionForm:"weldedI",sectionSource:"DWG-1",geometrySource:"QA-2",materialStandard:"product standard",materialGrade:"ST37",materialCertificate:"MTC-1",loadCombinationSource:"LC-1",restraintDrawing:"BR-1",supportDetailSource:"SUP-1"};
 t("accepts complete primary evidence without claiming design approval",()=>{const r=audit(valid);return r.success&&r.sourceBasisComplete&&!r.designApproved&&!r.analysisEnabled;});
 t("rejects missing official-text verification",()=>!audit({...valid,officialTextVerified:false}).success);
 t("rejects unregistered code",()=>!audit({...valid,primaryCodeId:"made-up"}).success);
 t("rejects edition mismatch",()=>!audit({...valid,primaryEdition:"نسخه نامعلوم"}).success);
 t("rejects missing clause and page",()=>!audit({...valid,primaryClause:"",primaryPage:""}).success);
 t("rejects unselected design method",()=>!audit({...valid,designMethod:"not-selected"}).success);
 t("rejects missing material certificate",()=>!audit({...valid,materialCertificate:""}).success);
 t("rejects missing restraint evidence",()=>!audit({...valid,restraintDrawing:""}).success);
 t("rejects foreign code as primary when supplementary",()=>!audit({...valid,primaryCodeId:"aisc360"}).success);
 t("requires purpose and clause for supplementary code",()=>!audit({...valid,supplementaryCodeId:"aisc360"}).success);
 t("accepts explicitly scoped supplementary reference",()=>audit({...valid,supplementaryCodeId:"aisc360",supplementaryClause:"F section",supplementaryPurpose:"independent comparison only"}).success);
 t("does not infer resistance from complete evidence",()=>{const r=audit(valid);return !("resistance" in r)&&!r.designApproved;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,note:"Evidence-gate software tests only; no code or design approval."};
}
root.SteelCraneGirderDesignBasis={audit,readUI,setData,run,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
