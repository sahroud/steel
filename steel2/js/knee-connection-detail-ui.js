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
   "<div class='notice'>این فرم هیچ اندازه، تعداد پیچ، ضخامت ورق یا جوش پیش‌فرض تولید نمی‌کند. ابتدا قالب شناسه‌ها را بسازید، سپس مختصات و مشخصات را دقیقاً از نقشه مصوب وارد کنید. مختصات چندضلعی و پیچ در دستگاه محلی هر ورق (mm) ثبت می‌شود؛ مبدأ و محورهای هر ورق در دستگاه اتصال سه‌بعدی و mm هستند؛ مبدأ دستگاه اتصال m است.</div>"+
   "<div class='button-grid'><button id='btnKneeDetailTemplate' class='btn secondary' type='button'>ساخت قالب برای زانویی انتخاب‌شده</button>"+
   "<button id='btnKneeDetailValidate' class='btn primary' type='button'>اعتبارسنجی جزئیات واردشده</button>"+
   "<button id='btnKneeDetailExport' class='btn secondary' type='button'>دریافت JSON ورودی</button></div>"+
   "<div class='field'><label for='kneeDetailJson'>جزئیات اتصال (JSON)</label><textarea id='kneeDetailJson' rows='18' spellcheck='false' dir='ltr' style='width:100%;font-family:monospace;white-space:pre;'></textarea></div>"+
   "<div id='kneeDetailValidationResult' aria-live='polite' class='notice'>قالب اولیه هنوز ساخته نشده است.</div>";
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
