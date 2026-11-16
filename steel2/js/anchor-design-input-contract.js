/* SAHROUD STEEL — anchor input and geometry readiness audit.
 * This module validates input completeness and basic geometric consistency only.
 * It does not calculate anchor resistance or certify code compliance.
 */
(function(root){"use strict";
const pos=v=>Number.isFinite(Number(v))&&Number(v)>0;
const bool=v=>v===true||v===false;
function validate(d){
 d=d||{};const issues=[],warnings=[];
 const type=String(d.anchorType||""),rows=Number(d.rows),cols=Number(d.cols);
 const nums=["diameterMm","fyaMPa","futaMPa","hefMm","fcMPa","memberThicknessMm","memberWidthMm","memberLengthMm","headDiameterMm","headThicknessMm","threadPitchMm","edgeXmm","edgeZmm","edgeXFarMm","edgeZFarMm","pitchXmm","pitchZmm"];
 const n={};nums.forEach(k=>n[k]=Number(d[k]));
 if(type!=="cast_in_headed")issues.push("در این مرحله فقط مهار ریختگی سر‌دار در دامنه توسعه قرار دارد؛ برای انواع دیگر محاسبه مسدود است.");
 if(!Number.isInteger(rows)||rows<1||rows>12||!Number.isInteger(cols)||cols<1||cols>12||rows*cols>64)issues.push("تعداد ردیف و ستون باید صحیح، مثبت و حداکثر ۶۴ انکر باشد.");
 ["diameterMm","fyaMPa","futaMPa","hefMm","fcMPa","memberThicknessMm","memberWidthMm","memberLengthMm","headDiameterMm","headThicknessMm","threadPitchMm","edgeXmm","edgeZmm","edgeXFarMm","edgeZFarMm"].forEach(k=>{if(!pos(n[k]))issues.push(k+" باید با مقدار واقعی و مثبت وارد شود.");});
 if(cols>1&&!pos(n.pitchXmm))issues.push("گام انکرها در راستای X باید مثبت باشد.");
 if(rows>1&&!pos(n.pitchZmm))issues.push("گام انکرها در راستای Z باید مثبت باشد.");
 if(cols===1&&n.pitchXmm!==0)warnings.push("برای یک ستون، گام X باید صفر یا بدون کاربرد باشد.");
 if(rows===1&&n.pitchZmm!==0)warnings.push("برای یک ردیف، گام Z باید صفر یا بدون کاربرد باشد.");
 if(pos(n.hefMm)&&pos(n.memberThicknessMm)&&n.hefMm>=n.memberThicknessMm)issues.push("عمق مؤثر کاشت از ضخامت عضو کمتر نیست؛ هندسه و تعریف hef را اصلاح کنید.");
 if(pos(n.headDiameterMm)&&pos(n.diameterMm)&&n.headDiameterMm<=n.diameterMm)issues.push("قطر سر انکر باید از قطر ساق بیشتر باشد.");
 if(pos(n.headThicknessMm)&&pos(n.headDiameterMm)&&n.headThicknessMm>=n.headDiameterMm)warnings.push("ضخامت سر انکر نسبت به قطر سر غیرمتعارف است؛ جزئیات سازنده کنترل شود.");
 if(pos(n.memberWidthMm)&&pos(n.edgeXmm)&&pos(n.edgeXFarMm)&&Number.isInteger(cols)&&cols>0&&n.pitchXmm>=0&&(n.edgeXmm+(cols-1)*n.pitchXmm+n.edgeXFarMm>n.memberWidthMm))issues.push("آرایش انکرها با عرض عضو و فاصله‌های لبه نزدیک و دور X سازگار نیست.");
 if(pos(n.memberLengthMm)&&pos(n.edgeZmm)&&pos(n.edgeZFarMm)&&Number.isInteger(rows)&&rows>0&&n.pitchZmm>=0&&(n.edgeZmm+(rows-1)*n.pitchZmm+n.edgeZFarMm>n.memberLengthMm))issues.push("آرایش انکرها با طول عضو و فاصله‌های لبه نزدیک و دور Z سازگار نیست.");
 if(!["cracked","uncracked"].includes(d.concreteCondition))issues.push("وضعیت ترک‌خوردگی بتن باید مشخص شود.");
 if(!["normal","lightweight"].includes(d.concreteType))issues.push("نوع بتن باید مشخص شود.");
 if(!["cast_before_concrete","cast_with_template"].includes(d.installation))issues.push("روش و جزئیات جایگذاری مهار ریختگی باید مشخص شود.");
 if(!bool(d.edgeReinforcement))issues.push("وضعیت آرماتور لبه باید مشخص شود.");
 if(!bool(d.seismicDemand))issues.push("وضعیت کاربرد لرزه‌ای باید مشخص شود.");
 ["manufacturerDataVerified","anchorDetailVerified","reinforcementLayoutVerified","edgeDistanceVerified","inspectionPlan","installationRecord"].forEach(k=>{if(d[k]!==true)issues.push(k+" باید با مدرک/نقشه/برنامه بازرسی تأیید شود.");});
 warnings.push("حداقل فاصله مجاز انکرها، حداقل فاصله از لبه و حداقل ضخامت باید با جدول/بند متن نهایی مبحث نهم و نوع مهار کنترل شود؛ این ممیزی صرفاً سازگاری هندسی اولیه را می‌سنجد.");
 warnings.push("مقاومت فولاد، گسیختگی مخروطی بتن، بیرون‌کشیدگی، بیرون‌زدگی جانبی، شکست لبه در برش، pryout و الزامات لرزه‌ای هنوز محاسبه نشده‌اند.");
 warnings.push("مقادیر fya، Futa، سطح مؤثر رزوه و ابعاد سر باید از گواهی مصالح و نقشه/کاتالوگ معتبر برداشت شوند؛ مقدار پیش‌فرض یا حدس مجاز نیست.");
 const ok=issues.length===0&&type==="cast_in_headed";
 return{ok,inputStructurallyComplete:ok,readyForFutureCalculation:false,minimumGeometryStatus:"blocked_source_verification",minimumGeometryClause:"9-18-7",anchorType:type,issues,warnings,capacityCalculated:false,analysisEnabled:false,designApproved:false,codeComplianceStatus:"not_evaluated"};
}
function mount(){
 if(!root.document||document.getElementById("anchorDesignInputContract"))return;
 const host=document.getElementById("concreteAnchorCapacityPanel")||document.getElementById("anchorDemandScreenPanel");if(!host)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorDesignInputContract";p.setAttribute("data-focus-group","foundation");
 const fields=[
 ["adiType","نوع مهار",'<option value="">انتخاب کنید</option><option value="cast_in_headed">ریختگی سر‌دار</option><option value="cast_in_hooked">ریختگی قلاب‌دار</option><option value="adhesive">چسبی</option><option value="expansion">انبساطی</option><option value="undercut">زیر‌بُر</option>'],
 ["adiRows","تعداد ردیف",null,"2"],["adiCols","تعداد ستون",null,"2"],
 ...[["adiDia","قطر ساق انکر (mm)"],["adiFya","تنش تسلیم فولاد fya (MPa)"],["adiFuta","مقاومت کششی نهایی Futa (MPa)"],["adiHef","عمق مؤثر کاشت hef (mm)"],["adiFc","مقاومت فشاری بتن f'c (MPa)"],["adiThickness","ضخامت عضو (mm)"],["adiWidth","عرض عضو (mm)"],["adiLength","طول عضو (mm)"],["adiHeadDia","قطر سر انکر (mm)"],["adiHeadThk","ضخامت سر انکر (mm)"],["adiThread","گام رزوه (mm)"],["adiEdgeX","فاصله لبه نزدیک X (mm)"],["adiEdgeZ","فاصله لبه نزدیک Z (mm)"],["adiEdgeXFar","فاصله لبه دور X (mm)"],["adiEdgeZFar","فاصله لبه دور Z (mm)"],["adiPitchX","گام انکر X (mm)"],["adiPitchZ","گام انکر Z (mm)"]],
 ["adiCrack","وضعیت بتن",'<option value="">انتخاب کنید</option><option value="cracked">ترک‌خورده</option><option value="uncracked">ترک‌نخورده</option>'],
 ["adiConcrete","نوع بتن",'<option value="">انتخاب کنید</option><option value="normal">وزن معمولی</option><option value="lightweight">سبک‌دانه</option>'],
 ["adiInstall","روش جایگذاری",'<option value="">انتخاب کنید</option><option value="cast_before_concrete">پیش از بتن‌ریزی</option><option value="cast_with_template">با شابلون هنگام بتن‌ریزی</option>'],
 ["adiEdgeRebar","آرماتور لبه",'<option value="">انتخاب کنید</option><option value="yes">دارد</option><option value="no">ندارد</option>'],
 ["adiSeismic","کاربرد لرزه‌ای",'<option value="">انتخاب کنید</option><option value="yes">بله</option><option value="no">خیر</option>']
 ];
 const attest=[["manufacturerDataVerified","مدرک فنی/گواهی مهار بررسی شده"],["anchorDetailVerified","جزئیات نصب با نقشه و دستورالعمل تطبیق دارد"],["reinforcementLayoutVerified","نقشه آرماتور و عدم تداخل کنترل شده"],["edgeDistanceVerified","فواصل لبه و ضخامت در نقشه اجرا ثبت شده"],["inspectionPlan","برنامه بازرسی نصب موجود است"],["installationRecord","سوابق نصب و کنترل اجرا ثبت شده"]];
 const html=fields.map(x=>'<div class="field"><label>'+x[1]+'</label>'+(x[2]?'<select id="'+x[0]+'">'+x[2]+'</select>':'<input id="'+x[0]+'" type="number" min="0" step="any" '+(x[3]?'value="'+x[3]+'"':'')+'></div>')).join("")+attest.map(x=>'<div class="field"><label>'+x[1]+'</label><select id="adi_'+x[0]+'"><option value="">انتخاب کنید</option><option value="yes">تأیید / موجود</option><option value="no">خیر</option></select></div>').join("");
 p.innerHTML='<div class="panel-title"><h3>ممیزی هندسه و مدارک مهار به بتن</h3><span class="status">بدون محاسبه ظرفیت</span></div><div class="notice">این فرم، ورودی‌ها، سازگاری ابعاد و مدارک اجرایی را ممیزی می‌کند. حداقل‌های عددی آیین‌نامه و ظرفیت‌ها تا تطبیق با متن معتبر و داده واقعی مهار محاسبه نمی‌شوند.</div><div class="form-grid">'+html+'</div><div class="button-grid"><button id="adiValidate" class="btn primary" type="button">ممیزی ورودی و هندسه</button></div><div id="adiResult" class="notice">اطلاعات پروژه و مدارک واقعی را وارد کنید.</div>';
 host.insertAdjacentElement("afterend",p);
 const val=id=>{const e=document.getElementById(id);return e&&e.value!==""?Number(e.value):null;},choice=id=>document.getElementById(id)?.value||"";
 document.getElementById("adiValidate").addEventListener("click",()=>{
 const d={anchorType:choice("adiType"),rows:val("adiRows"),cols:val("adiCols"),diameterMm:val("adiDia"),fyaMPa:val("adiFya"),futaMPa:val("adiFuta"),hefMm:val("adiHef"),fcMPa:val("adiFc"),memberThicknessMm:val("adiThickness"),memberWidthMm:val("adiWidth"),memberLengthMm:val("adiLength"),headDiameterMm:val("adiHeadDia"),headThicknessMm:val("adiHeadThk"),threadPitchMm:val("adiThread"),edgeXmm:val("adiEdgeX"),edgeZmm:val("adiEdgeZ"),edgeXFarMm:val("adiEdgeXFar"),edgeZFarMm:val("adiEdgeZFar"),pitchXmm:val("adiPitchX"),pitchZmm:val("adiPitchZ"),concreteCondition:choice("adiCrack"),concreteType:choice("adiConcrete"),installation:choice("adiInstall"),edgeReinforcement:choice("adiEdgeRebar")==="yes"?true:choice("adiEdgeRebar")==="no"?false:null,seismicDemand:choice("adiSeismic")==="yes"?true:choice("adiSeismic")==="no"?false:null};
 attest.forEach(x=>d[x[0]]=choice("adi_"+x[0])==="yes");
 const r=validate(d),out=document.getElementById("adiResult");out.textContent=(r.ok?"ورودی‌ها از نظر ساختار اولیه کامل‌اند؛ کنترل حداقل‌های بند ۹-۱۸-۷ هنوز مسدود است و ظرفیت/انطباق آیین‌نامه‌ای ارزیابی نشده است.":"ورودی ناقص یا خارج از دامنه محاسبه است.")+"\n"+[...r.issues,...r.warnings].map((x,i)=>(i+1)+". "+x).join("\n");out.dataset.ready=r.readyForFutureCalculation?"true":"false";
 });
}
function selfTest(){
 const base={anchorType:"cast_in_headed",rows:2,cols:2,diameterMm:20,fyaMPa:400,futaMPa:700,hefMm:160,fcMPa:30,memberThicknessMm:300,memberWidthMm:500,memberLengthMm:500,headDiameterMm:40,headThicknessMm:12,threadPitchMm:2.5,edgeXmm:150,edgeZmm:150,edgeXFarMm:150,edgeZFarMm:150,pitchXmm:160,pitchZmm:160,concreteCondition:"cracked",concreteType:"normal",installation:"cast_before_concrete",edgeReinforcement:true,seismicDemand:true,manufacturerDataVerified:true,anchorDetailVerified:true,reinforcementLayoutVerified:true,edgeDistanceVerified:true,inspectionPlan:true,installationRecord:true};
 const a=validate(base),b=validate({...base,anchorType:"adhesive"}),c=validate({...base,hefMm:350}),d=validate({...base,pitchXmm:null}),e=validate({...base,concreteCondition:""}),g=validate({...base,memberWidthMm:400}),h=validate({...base,inspectionPlan:false}),j=validate({...base,headDiameterMm:15});
 const checks=[a.ok&&!a.readyForFutureCalculation&&a.minimumGeometryStatus==="blocked_source_verification"&&!a.capacityCalculated&&!a.designApproved,!b.ok,!c.ok,!d.ok,!e.ok,!g.ok,!h.ok,!j.ok];
 return{passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,total:checks.length,checks};
}
root.SteelAnchorDesignInputContract={validate,selfTest};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
