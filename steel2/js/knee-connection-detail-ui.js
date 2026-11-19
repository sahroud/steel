/* SAHROUD STEEL — knee connection detail intake UI.
 * The editor starts with identifiers only; all fabrication geometry is user supplied.
 * It validates detail input but never calculates capacity or approves fabrication.
 */
(function(root){
 "use strict";
 const $=id=>root.document?.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 function selectedKnee(){
  const model=root.SteelStructuralModel?.model;
  if(!model||!root.SteelKneeConnectionGeometry?.extract)return null;
  const rows=root.SteelKneeConnectionGeometry.extract(model,root.SteelStructuralModel?.last3DResult||null);
  const id=$("kneeSelect")?.value;
  return rows.find(k=>k.id===id)||rows[0]||null;
 }
 function emptyRecord(k){
  const members=k?[{role:"column",member:k.column},{role:"rafter",member:k.rafter}]:[];
  return {
   schema:root.SahroudKneeConnectionDetail.SCHEMA,
   connectionId:"",
   jointId:k?.node?.id||"",
   drawingReference:"",
   units:"mm",
   connectionFrame:{originM:null,axes:{x:null,y:null,z:null},verifiedByDrawing:false},
   memberForceTransferPoints:members.map(item=>({role:item.role,memberId:item.member.id,pointMm:null})),
   plates:[],
   bolts:[],
   welds:[],
   fabricationStatus:""
  };
 }
 function emptyCapacityRecord(detail){
  return{
   schema:root.SahroudKneeConnectionCapacity.SCHEMA,
   method:"LRFD",connectionType:"bearing",
   drawingReference:detail?.drawingReference||"",
   boltDemandDistributionVerifiedByEngineer:false,
   boltDemandDistributionReference:"",
   axialEndConnection:false,boltGroupAxialSpanMm:null,
   boltProperties:(detail?.bolts||[]).map(b=>({boltId:b.id,boltClass:""})),
   loadCases:[]
  };
 }
 function statusMarkup(result){
  if(!result)return "<p class='notice'>ابتدا جزئیات را بررسی کنید.</p>";
  const errors=(result.errors||[]).map(x=>"<li>"+esc(x)+"</li>").join("");
  const warnings=(result.warnings||[]).map(x=>"<li>"+esc(x)+"</li>").join("");
  return "<div class='notice'><b>"+(result.valid?"ساختار ورودی و هندسه ثبت‌شده معتبر است":"ورودی اتصال ناقص یا نامعتبر است")+
   "</b><p>ورق: "+result.plateCount+"؛ پیچ: "+result.boltCount+"؛ خط جوش: "+result.weldCount+
   "</p><p>ظرفیت طراحی شده: خیر؛ آمادگی اجرا: خیر.</p>"+
   (errors?"<h5>خطاها</h5><ul>"+errors+"</ul>":"")+(warnings?"<h5>هشدارها</h5><ul>"+warnings+"</ul>":"")+"</div>";
 }
 function mount(){
  if(!$("kneeConnectionGeometryPanel")||$("kneeConnectionDetailIntake"))return;
  const panel=root.document.createElement("section");
  panel.className="panel";panel.id="kneeConnectionDetailIntake";
  panel.innerHTML="<div class='panel-title'><h3>ورود جزئیات واقعی اتصال زانویی</h3><span class='status'>ورودی نقشه ساخت</span></div>"+
   "<div class='notice'>این فرم هیچ اندازه، تعداد پیچ، ضخامت ورق یا جوش پیش‌فرض تولید نمی‌کند. ابتدا قالب شناسه‌ها را بسازید، سپس مختصات و مشخصات را دقیقاً از نقشه مصوب وارد کنید. مختصات چندضلعی و پیچ در دستگاه محلی هر ورق (mm) ثبت می‌شود؛ مبدأ و محورهای هر ورق در دستگاه اتصال سه‌بعدی و mm هستند؛ مرجع ضخامت هر ورق باید صریحاً mid-plane باشد تا دو سطح جامد به‌صورت متقارن ساخته شوند؛ مبدأ دستگاه اتصال m است.</div>"+
   "<div class='button-grid'><button id='btnKneeDetailTemplate' class='btn secondary' type='button'>ساخت قالب برای زانویی انتخاب‌شده</button>"+
   "<button id='btnKneeDetailValidate' class='btn primary' type='button'>اعتبارسنجی جزئیات واردشده</button>"+
   "<button id='btnKneeDetailExport' class='btn secondary' type='button'>دریافت JSON ورودی</button>"+
   "<button id='btnKneeDetailExportGlobal' class='btn secondary' type='button'>دریافت هندسه سه‌بعدی جهانی</button>"+
   "<button id='btnKneeDetailMapDemand' class='btn primary' type='button'>انتقال تقاضای ترکیبات بار به دستگاه اتصال</button>"+
   "<button id='btnKneeDetailCollision' class='btn secondary' type='button'>ممیزی برخورد سه‌بعدی ورق‌ها</button></div>"+
   "<div class='notice'>محاسبات زیر فقط حالت‌های حدی پیچی اتکایی و ورق را که داده‌های هندسی/تقاضای آن‌ها صریح وارد شده باشد بررسی می‌کند. توزیع نیرو بین پیچ‌ها، سطوح مقطع خالص، مسیر برش قالبی و اثر اهرمی باید مستند باشند. جوش، خمش ورق، لغزش بحرانی و تأیید نهایی اتصال هنوز پوشش داده نمی‌شوند.</div>"+
   "<div class='button-grid'><button id='btnKneeCapacityTemplate' class='btn secondary' type='button'>ساخت قالب داده‌های ظرفیت</button><button id='btnKneeCapacityRun' class='btn primary' type='button'>محاسبه ظرفیت‌های پیچی/ورق</button></div>"+
   "<div class='field'><label for='kneeCapacityJson'>تقاضاها، سطوح مقطع و مسیرهای گسیختگی (JSON)</label><textarea id='kneeCapacityJson' rows='16' spellcheck='false' dir='ltr' style='width:100%;font-family:monospace;white-space:pre;'></textarea></div>"+
   "<div id='kneeCapacityResult' aria-live='polite' class='notice'>محاسبه ظرفیت هنوز اجرا نشده است.</div>"+
   "<div class='field'><label for='kneeDetailJson'>جزئیات اتصال (JSON)</label><textarea id='kneeDetailJson' rows='18' spellcheck='false' dir='ltr' style='width:100%;font-family:monospace;white-space:pre;'></textarea></div>"+
   "<div id='kneeDetailValidationResult' aria-live='polite' class='notice'>قالب اولیه هنوز ساخته نشده است.</div>"+
   "<div id='kneeDetailMappedDemand' aria-live='polite' class='notice'>تقاضای منتقل‌شده هنوز محاسبه نشده است.</div>"+
   "<div class='field'><label for='kneeCollisionTolerance'>تلرانس طبقه‌بندی تماس هندسی (mm)</label><input id='kneeCollisionTolerance' type='number' min='0' step='0.01' value='0.1'></div>"+
   "<div id='kneeDetailCollisionResult' aria-live='polite' class='notice'>ممیزی برخورد هنوز اجرا نشده است.</div>";
  $("kneeConnectionGeometryPanel").appendChild(panel);
  $("btnKneeDetailTemplate").addEventListener("click",()=>{
   const k=selectedKnee();
   if(!k){$("kneeDetailValidationResult").textContent="مدل سه‌بعدی و گره زانویی در دسترس نیست.";return;}
   $("kneeDetailJson").value=JSON.stringify(emptyRecord(k),null,2);
   $("kneeDetailValidationResult").textContent="قالب شناسه‌ها ساخته شد؛ ابعاد و مشخصات ساخت باید از نقشه واقعی تکمیل شوند.";
  });
  $("btnKneeDetailValidate").addEventListener("click",()=>{
   try{
    const value=JSON.parse($("kneeDetailJson").value);
    const result=root.SahroudKneeConnectionDetail.validate(value);
    const selected=selectedKnee();
    if(!selected){
     result.valid=false;
     result.errors.push("گره زانویی انتخاب‌شده در مدل جاری در دسترس نیست؛ تطبیق شناسه‌ها انجام نشد.");
    }else{
     if(String(value.jointId)!==String(selected.node.id)){
      result.valid=false;result.errors.push("شناسه گره JSON با گره زانویی انتخاب‌شده در مدل جاری یکسان نیست.");
     }
     const expected=[{role:"column",id:selected.column.id},{role:"rafter",id:selected.rafter.id}];
     expected.forEach(item=>{
      if(!(value.memberForceTransferPoints||[]).some(point=>point.role===item.role&&String(point.memberId)===String(item.id))){
       result.valid=false;result.errors.push("عضو "+item.role+" در نقاط انتقال نیرو با عضو واقعی مدل ("+item.id+") تطبیق ندارد.");
      }
     });
    }
    $( "kneeDetailValidationResult" ).innerHTML=statusMarkup(result);
    $( "kneeDetailValidationResult" ).dataset.valid=result.valid?"true":"false";
   }catch(e){
    $("kneeDetailValidationResult").textContent="JSON قابل‌خواندن نیست: "+e.message;
    $("kneeDetailValidationResult").dataset.valid="false";
   }
  });

  $("btnKneeDetailCollision").addEventListener("click",()=>{
   try{
    const value=JSON.parse($("kneeDetailJson").value);
    const tolerance=Number($("kneeCollisionTolerance").value);
    const report=root.SahroudKneeConnectionCollision.audit(value,{toleranceMm:tolerance});
    const stateLabel=s=>s==="overlap"||s==="interference"?"تداخل حجمی":s==="contact"?"تماس هندسی":s==="contact-intent-unverified"?"تماس؛ قصد تماس تأیید نشده":s==="clear"?"بدون برخورد": "قابل ارزیابی نیست";
    const rows=report.platePairs.map(p=>"<tr><td>"+esc(p.plateA)+"</td><td>"+esc(p.plateB)+"</td><td>"+
     stateLabel(p.state)+"</td><td>"+Number(p.minimumPenetrationMm).toFixed(3)+"</td></tr>").join("");
    const hardwarePlateRows=report.hardwarePlatePairs.map(p=>"<tr><td>"+esc(p.hardwareId)+" ("+esc(p.hardwareKind)+")</td><td>"+esc(p.boltId)+
     "</td><td>"+esc(p.plateCompared)+"</td><td>"+stateLabel(p.state)+"</td><td>"+(Number.isFinite(p.minimumPenetrationMm)?p.minimumPenetrationMm.toFixed(3):"—")+"</td></tr>").join("");
    const hardwareRows=report.hardwarePairs.map(p=>"<tr><td>"+esc(p.hardwareA)+" / "+esc(p.boltA)+"</td><td>"+esc(p.hardwareB)+" / "+esc(p.boltB)+
     "</td><td>"+stateLabel(p.state)+"</td><td>"+(Number.isFinite(p.minimumPenetrationMm)?p.minimumPenetrationMm.toFixed(3):"—")+"</td></tr>").join("");
    const shankRows=report.shankStatus.map(p=>"<tr><td>"+esc(p.boltId)+"</td><td>"+esc(p.hostPlateId)+"</td><td>قابل ارزیابی نیست</td><td>"+esc(p.reason)+"</td></tr>").join("");
    $("kneeDetailCollisionResult").innerHTML="<p>روش: SAT روی منشورهای مثلثی؛ واشر با تقریب ۳۲ قطاع؛ تلرانس طبقه‌بندی: "+report.toleranceMm+
     " mm. ورق‌ها: هم‌پوشانی "+report.overlapCount+"؛ تماس "+report.contactCount+"؛ فاصله "+report.clearCount+
     ". ظرفیت یا مجازبودن تماس استنتاج نمی‌شود.</p>"+
     "<h4>برخورد ورق با ورق</h4><table><thead><tr><th>ورق اول</th><th>ورق دوم</th><th>نتیجه هندسی</th><th>نفوذ/فاصله (mm)</th></tr></thead><tbody>"+rows+"</tbody></table>"+
     "<h4>سرپیچ، مهره و واشر در برابر ورق‌ها</h4><table><thead><tr><th>قطعه</th><th>پیچ</th><th>ورق</th><th>نتیجه</th><th>نفوذ/فاصله (mm)</th></tr></thead><tbody>"+hardwarePlateRows+"</tbody></table>"+
     "<h4>برخورد قطعات سخت‌افزاری با یکدیگر</h4><table><thead><tr><th>قطعه اول / پیچ</th><th>قطعه دوم / پیچ</th><th>نتیجه</th><th>نفوذ/فاصله (mm)</th></tr></thead><tbody>"+hardwareRows+"</tbody></table>"+
     "<h4>بدنه پیچ و سوراخ میزبان</h4><table><thead><tr><th>پیچ</th><th>ورق میزبان</th><th>نتیجه</th><th>علت</th></tr></thead><tbody>"+shankRows+"</tbody></table>"+
     "<p>این گزارش فقط ممیزی هندسی است؛ تماس مجاز سازه‌ای، ظرفیت، فشار تماس، رزوه، پیش‌تنیدگی یا آمادگی اجرا را تأیید نمی‌کند.</p>"+
     "<ul>"+report.limitations.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>";
    $("kneeDetailCollisionResult").dataset.valid="true";
   }catch(e){
    $("kneeDetailCollisionResult").textContent="ممیزی برخورد اجرا نشد: "+e.message;
    $("kneeDetailCollisionResult").dataset.valid="false";
   }
  });
  $("btnKneeCapacityTemplate").addEventListener("click",()=>{
   try{
    const detail=JSON.parse($("kneeDetailJson").value);
    const valid=root.SahroudKneeConnectionDetail.validate(detail);
    if(!valid.valid)throw new Error("ابتدا هندسه اتصال را کامل و معتبر کنید: "+valid.errors.join(" | "));
    $("kneeCapacityJson").value=JSON.stringify(emptyCapacityRecord(detail),null,2);
    $("kneeCapacityResult").textContent="قالب ساخته شد. نوع پیچ، توزیع نیروی هر پیچ، اثر اهرمی، سطوح مقطع و مسیرهای برش قالبی را فقط از محاسبات و نقشه مستند تکمیل کنید؛ هیچ تقاضا یا ظرفیت فرضی وارد نشده است.";
   }catch(e){$("kneeCapacityResult").textContent="قالب ظرفیت ساخته نشد: "+e.message;}
  });
  $("btnKneeCapacityRun").addEventListener("click",()=>{
   try{
    const detail=JSON.parse($("kneeDetailJson").value),design=JSON.parse($("kneeCapacityJson").value);
    const selected=selectedKnee();
    if(!selected||String(detail.jointId)!==String(selected.node.id))throw new Error("جزئیات واردشده با گره زانویی انتخاب‌شده در مدل جاری تطبیق ندارد.");
    for(const item of [{role:"column",id:selected.column.id},{role:"rafter",id:selected.rafter.id}]){
     if(!(detail.memberForceTransferPoints||[]).some(p=>p.role===item.role&&String(p.memberId)===String(item.id)))
      throw new Error("شناسه عضو "+item.role+" با مدل جاری تطبیق ندارد.");
    }
    const report=root.SahroudKneeConnectionCapacity.calculate(detail,design);
    const status=s=>s==="PASS"?"قبول":s==="FAIL"?"رد":"ناقص";
    const rows=[];
    report.boltChecks.forEach(b=>{
     rows.push("<tr><td>"+esc(b.caseId)+"</td><td>پیچ "+esc(b.boltId)+"</td><td>کشش</td><td>"+b.tension.demandKN.toFixed(3)+"</td><td>"+b.tension.capacityKN.toFixed(3)+"</td><td>"+(b.tension.utilization*100).toFixed(1)+"%</td><td>"+status(b.tension.status)+"</td></tr>");
     rows.push("<tr><td>"+esc(b.caseId)+"</td><td>پیچ "+esc(b.boltId)+"</td><td>برش</td><td>"+b.shear.demandKN.toFixed(3)+"</td><td>"+b.shear.capacityKN.toFixed(3)+"</td><td>"+(b.shear.utilization*100).toFixed(1)+"%</td><td>"+status(b.shear.status)+"</td></tr>");
    });
    report.bearingChecks.forEach(b=>[b.bearing,b.tear].forEach(x=>rows.push("<tr><td>"+esc(b.caseId)+"</td><td>"+esc(b.boltId)+" / "+esc(b.plateId)+"</td><td>"+esc(x.limitState)+"</td><td>"+x.demandKN.toFixed(3)+"</td><td>"+x.capacityKN.toFixed(3)+"</td><td>"+(x.utilization*100).toFixed(1)+"%</td><td>"+status(x.status)+"</td></tr>")));
    report.plateChecks.forEach(p=>p.checks.forEach(x=>rows.push("<tr><td>"+esc(p.caseId)+"</td><td>"+esc(p.plateId)+"</td><td>"+esc(x.limitState)+"</td><td>"+x.demandKN.toFixed(3)+"</td><td>"+x.capacityKN.toFixed(3)+"</td><td>"+(x.utilization*100).toFixed(1)+"%</td><td>"+status(x.status)+"</td></tr>")));
    report.blockShearChecks.forEach(p=>{const x=p.check;rows.push("<tr><td>"+esc(p.caseId)+"</td><td>"+esc(p.plateId)+"</td><td>برش قالبی</td><td>"+x.demandKN.toFixed(3)+"</td><td>"+x.capacityKN.toFixed(3)+"</td><td>"+(x.utilization*100).toFixed(1)+"%</td><td>"+status(x.status)+"</td></tr>");});
    $("kneeCapacityResult").innerHTML="<p><b>نتیجه کنترل‌های جزئی: "+(report.overallStatus==="FAIL"?"حداقل یک کنترل رد شده است":"کنترل‌های اجراشده بدون رد ثبت شده‌اند، اما طراحی اتصال ناقص است")+"</b></p>"+
     "<p>روش: "+esc(report.method)+"؛ تعداد کنترل: "+report.summary.checks+"؛ قبول: "+report.summary.passed+"؛ رد: "+report.summary.failed+"؛ بیشینه نسبت تقاضا به ظرفیت: "+(report.summary.maximumUtilization*100).toFixed(1)+"%</p>"+
     "<table><thead><tr><th>ترکیب</th><th>جزء</th><th>حالت حدی</th><th>تقاضا (kN)</th><th>ظرفیت موجود (kN)</th><th>نسبت</th><th>نتیجه</th></tr></thead><tbody>"+rows.join("")+"</tbody></table>"+
     "<p><b>ظرفیت‌های محاسبه‌شده به معنی تأیید اتصال نیستند.</b> تأیید نهایی: خیر؛ آمادگی اجرا: خیر.</p>"+
     "<ul>"+report.notEvaluated.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>";
    $("kneeCapacityResult").dataset.valid="true";
   }catch(e){$("kneeCapacityResult").textContent="محاسبه ظرفیت متوقف شد: "+e.message;$("kneeCapacityResult").dataset.valid="false";}
  });
  $("btnKneeDetailMapDemand").addEventListener("click",()=>{
   try{
    const value=JSON.parse($("kneeDetailJson").value);
    const mapped=root.SahroudKneeConnectionDemandMapper.map(value,root.SteelStructuralModel?.lastConnectionDemand||null,selectedKnee());
    const rows=mapped.cases.map(c=>c.memberActions.map(a=>
     "<tr><td>"+esc(c.combination)+"</td><td>"+esc(a.role)+" / "+esc(a.memberId)+"</td>"+
     "<td>"+a.transferPoint.globalCoordinatesM.map(v=>Number(v).toFixed(4)).join(", ")+"</td>"+
     [a.connectionFrame.force.x,a.connectionFrame.force.y,a.connectionFrame.force.z].map(v=>"<td>"+(Number(v)/1000).toFixed(3)+"</td>").join("")+
     [a.connectionFrame.moment.x,a.connectionFrame.moment.y,a.connectionFrame.moment.z].map(v=>"<td>"+(Number(v)/1000).toFixed(3)+"</td>").join("")+"</tr>"
    ).join("")).join("");
    $("kneeDetailMappedDemand").innerHTML="<p>تقاضای هر عضو جداگانه به مبدأ و محورهای اتصال منتقل شد. نیرو kN و لنگر kN.m است.</p>"+
     "<table><thead><tr><th>ترکیب بار</th><th>عضو</th><th>نقطه انتقال جهانی (m)</th><th>Fx</th><th>Fy</th><th>Fz</th><th>Mx</th><th>My</th><th>Mz</th></tr></thead><tbody>"+rows+"</tbody></table>"+
     "<p>ظرفیت طراحی نشده؛ جمع نیروهای گره و کنترل تعادل کامل انجام نشده است.</p>";
    $("kneeDetailMappedDemand").dataset.valid="true";
   }catch(e){
    $("kneeDetailMappedDemand").textContent="انتقال تقاضا متوقف شد: "+e.message;
    $("kneeDetailMappedDemand").dataset.valid="false";
   }
  });
  $("btnKneeDetailExportGlobal").addEventListener("click",()=>{
   try{
    const value=JSON.parse($("kneeDetailJson").value);
    const geometry=root.SahroudKneeConnectionDetail.buildGlobalGeometry(value);
    const source=JSON.stringify(geometry,null,2);
    const url=root.URL.createObjectURL(new Blob([source],{type:"application/json;charset=utf-8"}));
    const a=root.document.createElement("a");a.href=url;a.download="sahroud-knee-connection-global-geometry.json";a.click();root.URL.revokeObjectURL(url);
    $("kneeDetailValidationResult").textContent="هندسه ورق‌ها، مراکز پیچ‌ها و خطوط جوش به مختصات جهانی تبدیل و صادر شد؛ ظرفیت طراحی نشده است.";
   }catch(e){$("kneeDetailValidationResult").textContent="خروجی هندسه جهانی صادر نشد: "+e.message;}
  });
  $("btnKneeDetailExport").addEventListener("click",()=>{
   const source=$("kneeDetailJson").value.trim();
   if(!source){$("kneeDetailValidationResult").textContent="ابتدا قالب را بسازید یا JSON وارد کنید.";return;}
   try{JSON.parse(source);}catch(e){$("kneeDetailValidationResult").textContent="JSON نامعتبر است: "+e.message;return;}
   const url=root.URL.createObjectURL(new Blob([source],{type:"application/json;charset=utf-8"}));
   const a=root.document.createElement("a");a.href=url;a.download="sahroud-knee-connection-detail.json";a.click();root.URL.revokeObjectURL(url);
  });
  root.addEventListener("sahroud:connection-demand-ready",()=>{if(!$("kneeDetailJson").value.trim())$("kneeDetailValidationResult").textContent="تحلیل جدید موجود است؛ قالب را برای گره انتخابی بسازید و جزئیات نقشه را وارد کنید.";});
 }
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
 root.SahroudKneeConnectionDetailUI={emptyRecord,statusMarkup};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudKneeConnectionDetailUI;
})(typeof window!=="undefined"?window:globalThis);
