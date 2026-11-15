/* SAHROUD STEEL — evidence intake for individual crane runway wheel loads.
 * Keeps legacy workbook cases separate; no legacy scalar is converted into a wheel load.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const CASES=[
 {id:"CRANE-TYPE1-LEFT-LEGACY",label:"پرونده قدیمی TYPE 1 ـ بخش چپ"},
 {id:"CRANE-TYPE1-RIGHT-LEGACY",label:"پرونده قدیمی TYPE 1 ـ تحلیل سمت راست"},
 {id:"CRANE-TYPE1-OTHER-WORKBOOK-SUMMARY",label:"خلاصه وزن پل ـ تخصیص نامشخص"}
];
let last=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function read(){
 return {
  sourceCaseId:$("cwei_case")?.value||"",
  craneId:$("cwei_crane")?.value.trim()||"",
  bridgeId:$("cwei_bridge")?.value.trim()||"",
  mappingStatement:$("cwei_mapping")?.value.trim()||"",
  manufacturer:$("cwei_manufacturer")?.value.trim()||"",
  sourceDocument:$("cwei_document")?.value.trim()||"",
  sourceRevision:$("cwei_revision")?.value.trim()||"",
  sourceLocator:$("cwei_locator")?.value.trim()||"",
  loadBasis:$("cwei_basis")?.value||"",
  engineerVerified:!!$("cwei_verified")?.checked,
  leftWheelsText:$("cwei_left")?.value||"[]",
  rightWheelsText:$("cwei_right")?.value||"[]"
 };
}
function parseList(text,label,issues){
 let rows;try{rows=JSON.parse(text||"[]");}catch(e){issues.push("JSON قطار چرخ "+label+" معتبر نیست.");return [];}
 if(!Array.isArray(rows)){issues.push("قطار چرخ "+label+" باید آرایه JSON باشد.");return [];}
 rows.forEach((w,i)=>{
  if(!w||typeof w!=="object"||Array.isArray(w)){issues.push("ردیف "+(i+1)+" قطار "+label+" باید شیء باشد.");return;}
  if(!Number.isFinite(w.offset_m)||w.offset_m<0)issues.push("آفست چرخ "+(i+1)+" ریل "+label+" باید عدد متناهی نامنفی بر حسب متر باشد.");
  if(!Number.isFinite(w.P_N)||w.P_N>=0)issues.push("بار قائم چرخ "+(i+1)+" ریل "+label+" باید منفی و بر حسب N باشد؛ بار مثبت یا مقدار نامعلوم پذیرفته نیست.");
  if(i&&Number.isFinite(w.offset_m)&&Number.isFinite(rows[i-1]?.offset_m)&&w.offset_m<rows[i-1].offset_m)issues.push("آفست‌های قطار "+label+" باید صعودی باشند.");
  if(typeof w.source!=="string"||!w.source.trim()||typeof w.document!=="string"||!w.document.trim())issues.push("برای هر چرخ "+(i+1)+" ریل "+label+" منبع و صفحه/شماره نقشه مستقل لازم است.");
 });
 return rows;
}
function audit(input){
 const d=input||read(),issues=[];
 if(!CASES.some(x=>x.id===d.sourceCaseId))issues.push("پرونده مرجع باید از فهرست پرونده‌های قدیمی مشخص شود.");
 ["craneId","bridgeId","mappingStatement","manufacturer","sourceDocument","sourceRevision","sourceLocator"].forEach(k=>{if(!String(d[k]||"").trim())issues.push("مشخصات تطبیق و منبع ناقص است: "+k);});
 if(d.loadBasis!=="static_without_impact")issues.push("فقط بار قائم استاتیکی هر چرخ، بدون ضریب ضربه، قابل ورود به این مرحله است.");
 if(d.engineerVerified!==true)issues.push("مهندس مسئول باید تطبیق پرونده، پل، خطوط ریل و جدول بار چرخ را بررسی و صریحاً تأیید کند.");
 const left=parseList(d.leftWheelsText,"چپ",issues),right=parseList(d.rightWheelsText,"راست",issues);
 if(!left.length||!right.length)issues.push("جدول مستقل بار چرخ برای هر دو خط ریل الزامی است.");
 if(left.length!==right.length)issues.push("تعداد چرخ‌های دو خط ریل یکسان نیست؛ تا تعیین هندسه واقعی، انتقال دو ریل متوقف است.");
 const readiness=root.SteelCraneReadiness?.getData?.();
 if(!readiness?.enabled)issues.push("ابتدا جرثقیل را در پنل اطلاعات جرثقیل فعال کنید؛ این ابزار آن را خودکار فعال نمی‌کند.");
 if(readiness?.wheelsPerSide!==""&&Number(readiness?.wheelsPerSide)!==left.length)issues.push("تعداد چرخ هر سمت در پنل اطلاعات جرثقیل با جدول چرخ این پرونده یکسان نیست.");
 const success=issues.length===0;
 return {success,status:success?"verified-wheel-load-evidence":"blocked_incomplete_or_unverified",sourceCaseId:d.sourceCaseId,craneId:d.craneId,bridgeId:d.bridgeId,manufacturer:d.manufacturer,source:{document:d.sourceDocument,revision:d.sourceRevision,locator:d.sourceLocator},mappingStatement:d.mappingStatement,loadBasis:d.loadBasis,leftWheels:left,rightWheels:right,wheelsPerSide:left.length,engineerVerified:d.engineerVerified,issues,solverEnabled:false,analysisEnabled:false,designApproved:false,legacyScalarValuesUsed:false,limitations:["مقادیر قدیمی واکنش چرخ و جرم پل در پرونده مرجع صرفاً برای تطبیق هستند؛ هیچ‌یک به بار چرخ منفرد تبدیل یا بین چرخ‌ها توزیع نمی‌شوند.","پرونده‌های TYPE 1 چپ و راست و خلاصه جرم پل مستقل باقی می‌مانند؛ میانگین‌گیری یا انتخاب خودکار انجام نمی‌شود.","تأیید مهندس در این فرم یک اظهار مستند است و صحت نقشه/کاتالوگ را نرم‌افزار مستقلاً احراز نمی‌کند.","این ورودی فقط بار قائم استاتیکی بدون ضربه را آماده می‌کند؛ بارهای افقی، دینامیک، خستگی، چند جرثقیل و طراحی تیر حمال خارج از دامنه‌اند."]};
}
function render(result){
 const host=$("cwei_result");if(!host)return;
 host.innerHTML="<b>"+(result.success?"شواهد بار چرخ کامل است":"انتقال بار چرخ مسدود است")+"</b><br>"+esc(result.issues.join(" | ")||"جدول بار چرخ فقط پس از تأیید مستقل مهندس قابل انتقال به پنل دو ریل است.")+
 "<br><pre style='white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto'>"+esc(JSON.stringify({sourceCaseId:result.sourceCaseId,wheelsPerSide:result.wheelsPerSide,leftWheels:result.leftWheels,rightWheels:result.rightWheels,solverEnabled:false,designApproved:false},null,2))+"</pre>";
}
function collect(){last=audit(read());render(last);return last;}
function apply(){
 const r=collect();if(!r.success)return r;
 const two=root.SteelCraneTwoRailTransfer;
 if(!two?.getData||!two?.setData){r.success=false;r.issues.push("پنل انتقال دو ریل بارگذاری نشده است.");render(r);return r;}
 const readiness=root.SteelCraneReadiness?.getData?.();
 if(!readiness||!readiness.enabled||Number(readiness.wheelsPerSide)!==r.wheelsPerSide){r.success=false;r.issues.push("ابتدا جرثقیل را فعال و تعداد چرخ هر سمت را دقیقاً با این جدول منطبق کنید؛ هیچ داده‌ای منتقل نشد.");render(r);return r;}
 const current=two.getData();
 two.setData({...current,leftWheelsJson:JSON.stringify(r.leftWheels),rightWheelsJson:JSON.stringify(r.rightWheels)});
 const host=$("cwei_result");
 if(host)host.insertAdjacentHTML("beforeend","<p>جدول چرخ به ورودی‌های دو ریل منتقل شد؛ تحلیل اجرا نشده است. اکنون ورودی‌های هندسه/سختی ریل را بازبینی و سپس جداگانه ممیزی و اجرا کنید.</p>");
 return r;
}
function exportJSON(){
 const r=collect();const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="SAHROUD-STEEL-crane-wheel-load-evidence.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return r;
}
function init(){
 if($("craneWheelEvidenceIntakePanel"))return;
 const anchor=$("twoRailPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="craneWheelEvidenceIntakePanel";
 p.innerHTML='<div class="panel-title"><h3>تطبیق پرونده جرثقیل و ثبت بار تک‌تک چرخ‌ها</h3><span class="status">دروازه شواهد؛ بدون محاسبه خودکار</span></div>'+
 '<div class="notice">مقادیر قدیمی ۸٫۶۳، ۷٫۸، ۱۰٫۷۸، ۹٫۸ و واکنش‌های ۲۸٫۷۹ و ۲۱٫۴۹ تن، بار چرخ منفرد قابل استفاده نیستند. این فرم هیچ‌کدام را به بار چرخ تبدیل نمی‌کند. فقط جدول بار هر چرخ از نقشه/کاتالوگ واقعی و با تطبیق دقیق جرثقیل و پل پذیرفته می‌شود. پرونده‌های قدیمی مستقل‌اند.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label for="cwei_case">پرونده قدیمی برای ردیابی</label><select id="cwei_case">'+CASES.map(x=>'<option value="'+x.id+'">'+x.label+'</option>').join("")+'</select></div>'+
 '<div class="field"><label for="cwei_crane">شناسه دقیق جرثقیل</label><input id="cwei_crane"></div>'+
 '<div class="field"><label for="cwei_bridge">شناسه پل / شاهین</label><input id="cwei_bridge"></div>'+
 '<div class="field"><label for="cwei_manufacturer">سازنده / مرجع</label><input id="cwei_manufacturer"></div>'+
 '<div class="field"><label for="cwei_document">نام سند بار چرخ</label><input id="cwei_document"></div>'+
 '<div class="field"><label for="cwei_revision">ویرایش / تاریخ سند</label><input id="cwei_revision"></div>'+
 '<div class="field"><label for="cwei_locator">صفحه / شیت / جدول دقیق</label><input id="cwei_locator"></div>'+
 '<div class="field"><label for="cwei_basis">مبنای بار</label><select id="cwei_basis"><option value="">انتخاب کنید</option><option value="static_without_impact">بار قائم استاتیکی، بدون ضریب ضربه</option></select></div>'+
 '</div><div class="field"><label for="cwei_mapping">شرح تطبیق نقشه: این جدول دقیقاً متعلق به کدام پل و کدام خطوط ریل است؟</label><textarea id="cwei_mapping" rows="2"></textarea></div>'+
 '<div class="field"><label for="cwei_left">بارهای چرخ ریل چپ (JSON؛ offset_m، P_N منفی، source، document)</label><textarea id="cwei_left" rows="5" placeholder='[{"offset_m":0,"P_N":-10000,"source":"Vendor table","document":"DWG-01 / Row 2"}]'></textarea></div>'+
 '<div class="field"><label for="cwei_right">بارهای چرخ ریل راست (JSON؛ هر چرخ مستقل)</label><textarea id="cwei_right" rows="5" placeholder='[{"offset_m":0,"P_N":-10000,"source":"Vendor table","document":"DWG-01 / Row 3"}]'></textarea></div>'+
 '<label class="field"><input type="checkbox" id="cwei_verified"> تطبیق پرونده، هویت پل، خطوط ریل، تعداد و بار تک‌تک چرخ‌ها را با مدارک سازنده بررسی کرده‌ام.</label>'+
 '<div class="button-grid"><button class="btn secondary" type="button" id="cwei_audit">ممیزی شواهد بار چرخ</button><button class="btn primary" type="button" id="cwei_apply">انتقال جدول معتبر به پنل دو ریل</button><button class="btn secondary" type="button" id="cwei_export">دریافت JSON شواهد</button></div><div id="cwei_result" class="notice">اطلاعات بار چرخ هنوز وارد نشده است.</div>';
 anchor.insertAdjacentElement("beforebegin",p);
 $("cwei_audit").addEventListener("click",collect);$("cwei_apply").addEventListener("click",apply);$("cwei_export").addEventListener("click",exportJSON);
}
function selfTest(){
 const src={sourceCaseId:CASES[0].id,craneId:"CR-01",bridgeId:"BR-01",mappingStatement:"Vendor schedule maps bridge BR-01 to both runway rails.",manufacturer:"Vendor",sourceDocument:"DWG-01",sourceRevision:"R1",sourceLocator:"Table 2",loadBasis:"static_without_impact",engineerVerified:true,leftWheelsText:JSON.stringify([{offset_m:0,P_N:-10000,source:"Vendor",document:"DWG-01/T2"}]),rightWheelsText:JSON.stringify([{offset_m:0,P_N:-11000,source:"Vendor",document:"DWG-01/T3"}])};
 const old=root.SteelCraneReadiness;root.SteelCraneReadiness={getData:()=>({enabled:true,wheelsPerSide:"1"})};
 const good=audit(src),noImpact=audit({...src,loadBasis:"with_impact"}),noVerify=audit({...src,engineerVerified:false}),badSign=audit({...src,leftWheelsText:JSON.stringify([{offset_m:0,P_N:10000,source:"Vendor",document:"DWG-01"}])}),caseIsolation=audit({...src,sourceCaseId:"UNKNOWN"});
 root.SteelCraneReadiness=old;
 const tests=[good.success&&!good.legacyScalarValuesUsed&&!good.designApproved,!noImpact.success,!noVerify.success,!badSign.success,!caseIsolation.success];
 return {passed:tests.filter(Boolean).length,failed:tests.filter(x=>!x).length,total:tests.length,tests,analysisEnabled:false};
}
root.SteelCraneWheelEvidenceIntake={read,audit,collect,apply,exportJSON,selfTest,init,getLast:()=>last};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
