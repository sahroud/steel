/* SAHROUD STEEL — validated anchor input contract.
 * Input-readiness audit only. No resistance equations or code approval are produced here.
 */
(function(root){"use strict";
const finitePositive=v=>Number.isFinite(Number(v))&&Number(v)>0;
function validate(i){
 const d=i||{},issues=[],warnings=[];
 const type=String(d.anchorType||"");
 const rows=Number(d.rows),cols=Number(d.cols),dia=Number(d.diameterMm),futa=Number(d.futaMPa),hef=Number(d.hefMm),fc=Number(d.fcMPa),edgeX=Number(d.edgeXmm),edgeZ=Number(d.edgeZmm),pitchX=Number(d.pitchXmm),pitchZ=Number(d.pitchZmm),thickness=Number(d.memberThicknessMm);
 if(!["cast_in_headed","cast_in_hooked","adhesive","expansion","undercut"].includes(type))issues.push("نوع مهار باید مشخص و از فهرست پشتیبانی‌شده انتخاب شود.");
 if(type!=="cast_in_headed")issues.push("در این مرحله فقط مهار ریختگی سر‌دار قابل آماده‌سازی برای محاسبه است؛ نوع انتخابی هنوز الگوریتم تأییدشده ندارد.");
 if(!Number.isInteger(rows)||rows<1||rows>12||!Number.isInteger(cols)||cols<1||cols>12||rows*cols>64)issues.push("تعداد ردیف و ستون باید صحیح، مثبت و حداکثر ۶۴ انکر باشد.");
 [["قطر اسمی انکر",dia],["مقاومت کششی نهایی فولاد Futa",futa],["عمق مؤثر کاشت hef",hef],["مقاومت فشاری بتن f'c",fc],["فاصله لبه X",edgeX],["فاصله لبه Z",edgeZ],["ضخامت عضو بتنی",thickness]].forEach(([label,v])=>{if(!finitePositive(v))issues.push(label+" باید عددی و مثبت باشد.");});
 if(Number.isInteger(cols)&&cols>1&&!finitePositive(pitchX))issues.push("گام محور انکرها در راستای X باید مثبت باشد.");
 if(Number.isInteger(rows)&&rows>1&&!finitePositive(pitchZ))issues.push("گام محور انکرها در راستای Z باید مثبت باشد.");
 if(finitePositive(hef)&&finitePositive(thickness)&&hef>=thickness)issues.push("عمق مؤثر کاشت باید از ضخامت عضو بتنی کمتر باشد؛ پوشش و شرایط واقعی نیز باید جداگانه بررسی شوند.");
 if(!["cracked","uncracked"].includes(String(d.concreteCondition||"")))issues.push("وضعیت ترک‌خوردگی بتن باید مشخص شود.");
 if(!["normal","lightweight"].includes(String(d.concreteType||"")))issues.push("نوع بتن باید مشخص شود.");
 if(!["cast_before_concrete","cast_with_template"].includes(String(d.installation||"")))issues.push("روش نصب مهار ریختگی باید مشخص شود.");
 if(d.edgeReinforcement!==true&&d.edgeReinforcement!==false)issues.push("وجود یا عدم وجود آرماتور لبه باید مشخص شود.");
 if(d.seismicDemand!==true&&d.seismicDemand!==false)issues.push("وضعیت کاربرد لرزه‌ای باید مشخص شود.");
 if(dia>0&&hef>0&&hef/dia<4)warnings.push("نسبت hef به قطر کم است؛ محدودیت‌ها و جزئیات مهار باید از متن حاکم کنترل شوند.");
 if(type==="cast_in_headed"&&issues.length===0)warnings.push("ورودی‌ها از نظر ساختار کامل‌اند؛ این وضعیت به معنی ظرفیت محاسبه‌شده یا تأیید آیین‌نامه‌ای نیست.");
 return{ok:issues.length===0,readyForFutureCalculation:issues.length===0&&type==="cast_in_headed",anchorType:type,issues,warnings,analysisEnabled:false,designApproved:false,capacityCalculated:false};
}
function mount(){
 if(!root.document||document.getElementById("anchorDesignInputContract"))return;
 const host=document.getElementById("concreteAnchorCapacityPanel")||document.getElementById("anchorDemandScreenPanel");if(!host)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorDesignInputContract";p.setAttribute("data-focus-group","foundation");
 p.innerHTML='<div class="panel-title"><h3>شناسنامه مهندسی انکر و کنترل کامل‌بودن ورودی‌ها</h3><span class="status">مرحله آماده‌سازی محاسبه</span></div>'+
 '<div class="notice">این فرم فقط قرارداد داده و کامل‌بودن اطلاعات را کنترل می‌کند؛ هیچ ظرفیت فولاد یا بتن تولید نمی‌کند. در این نسخه فقط مهار ریختگی سر‌دار برای توسعه محاسباتی بعدی هدف‌گذاری شده است. برای انواع دیگر، محاسبه مسدود می‌ماند.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label>نوع مهار</label><select id="adiType"><option value="">انتخاب کنید</option><option value="cast_in_headed">ریختگی سر‌دار</option><option value="cast_in_hooked">ریختگی قلاب‌دار</option><option value="adhesive">چسبی</option><option value="expansion">انبساطی</option><option value="undercut">زیر‌بُر (Undercut)</option></select></div>'+
 '<div class="field"><label>تعداد ردیف</label><input id="adiRows" type="number" min="1" max="12" value="2"></div><div class="field"><label>تعداد ستون</label><input id="adiCols" type="number" min="1" max="12" value="2"></div>'+
 '<div class="field"><label>قطر اسمی انکر (mm)</label><input id="adiDia" type="number" min="1" step="1"></div><div class="field"><label>مقاومت کششی نهایی فولاد Futa (MPa)</label><input id="adiFuta" type="number" min="1" step="1"></div><div class="field"><label>عمق مؤثر کاشت hef (mm)</label><input id="adiHef" type="number" min="1" step="1"></div>'+
 '<div class="field"><label>مقاومت فشاری بتن f\'c (MPa)</label><input id="adiFc" type="number" min="1" step="0.1"></div><div class="field"><label>ضخامت عضو بتنی (mm)</label><input id="adiThickness" type="number" min="1" step="1"></div>'+
 '<div class="field"><label>فاصله تا لبه X (mm)</label><input id="adiEdgeX" type="number" min="1" step="1"></div><div class="field"><label>فاصله تا لبه Z (mm)</label><input id="adiEdgeZ" type="number" min="1" step="1"></div>'+
 '<div class="field"><label>گام انکر X (mm)</label><input id="adiPitchX" type="number" min="0" step="1"></div><div class="field"><label>گام انکر Z (mm)</label><input id="adiPitchZ" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>وضعیت بتن</label><select id="adiCrack"><option value="">انتخاب کنید</option><option value="cracked">ترک‌خورده</option><option value="uncracked">ترک‌نخورده</option></select></div>'+
 '<div class="field"><label>رده وزنی بتن</label><select id="adiConcrete"><option value="">انتخاب کنید</option><option value="normal">وزن معمولی</option><option value="lightweight">سبک‌دانه</option></select></div>'+
 '<div class="field"><label>روش نصب</label><select id="adiInstall"><option value="">انتخاب کنید</option><option value="cast_before_concrete">جایگذاری پیش از بتن‌ریزی</option><option value="cast_with_template">جایگذاری با شابلون هنگام بتن‌ریزی</option></select></div>'+
 '<div class="field"><label>آرماتور لبه</label><select id="adiEdgeRebar"><option value="">انتخاب کنید</option><option value="yes">دارد</option><option value="no">ندارد</option></select></div>'+
 '<div class="field"><label>کاربرد لرزه‌ای</label><select id="adiSeismic"><option value="">انتخاب کنید</option><option value="yes">بله</option><option value="no">خیر</option></select></div></div>'+
 '<div class="button-grid"><button id="adiValidate" class="btn primary" type="button">ممیزی ورودی‌های انکر</button></div><div id="adiResult" class="notice">اطلاعات واقعی انکر و بتن را وارد کنید؛ تا پیش از تکمیل، محاسبه خودکار فعال نمی‌شود.</div>';
 host.insertAdjacentElement("afterend",p);
 const val=id=>{const e=document.getElementById(id);return e&&e.value!==""?Number(e.value):null;};
 const choice=id=>document.getElementById(id)?.value||"";
 document.getElementById("adiValidate").addEventListener("click",()=>{
  const r=validate({anchorType:choice("adiType"),rows:val("adiRows"),cols:val("adiCols"),diameterMm:val("adiDia"),futaMPa:val("adiFuta"),hefMm:val("adiHef"),fcMPa:val("adiFc"),memberThicknessMm:val("adiThickness"),edgeXmm:val("adiEdgeX"),edgeZmm:val("adiEdgeZ"),pitchXmm:val("adiPitchX"),pitchZmm:val("adiPitchZ"),concreteCondition:choice("adiCrack"),concreteType:choice("adiConcrete"),installation:choice("adiInstall"),edgeReinforcement:choice("adiEdgeRebar")==="yes"?true:choice("adiEdgeRebar")==="no"?false:null,seismicDemand:choice("adiSeismic")==="yes"?true:choice("adiSeismic")==="no"?false:null});
  const out=document.getElementById("adiResult");out.textContent=(r.ok?"ورودی‌ها از نظر ساختاری کامل‌اند؛ هنوز ظرفیت یا تأیید طراحی نداریم.":"ورودی ناقص/غیرقابل محاسبه است.")+"\n"+[...r.issues,...r.warnings].map((x,n)=>((n+1)+". "+x)).join("\n");out.dataset.ready=r.readyForFutureCalculation?"true":"false";
 });
}
function selfTest(){
 const base={anchorType:"cast_in_headed",rows:2,cols:2,diameterMm:20,futaMPa:800,hefMm:160,fcMPa:30,memberThicknessMm:300,edgeXmm:150,edgeZmm:150,pitchXmm:160,pitchZmm:160,concreteCondition:"cracked",concreteType:"normal",installation:"cast_before_concrete",edgeReinforcement:true,seismicDemand:true};
 const a=validate(base),b=validate({...base,anchorType:"adhesive"}),c=validate({...base,hefMm:350}),d=validate({...base,pitchXmm:null}),e=validate({...base,concreteCondition:""});
 const checks=[a.ok&&a.readyForFutureCalculation&&!a.capacityCalculated&&!a.designApproved,!b.ok&&b.issues.some(x=>x.includes("فقط مهار ریختگی سر‌دار")),!c.ok&&!d.ok&&!e.ok];
 return{passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,total:checks.length,checks};
}
root.SteelAnchorDesignInputContract={validate,selfTest};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
