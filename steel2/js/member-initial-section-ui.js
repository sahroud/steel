/* SAHROUD STEEL — per-member initial section input.
 * Blank/untouched entries retain the group section. User overrides are SI snapshots.
 * This module collects starting data only; it does not perform code checks.
 */
(function(root){
 "use strict";
 let currentModel=null, selectedId="", dirty=new Map(), panel=null;
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const labels={column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید افقی دیوار",endPost:"ستونک انتهایی",endGirt:"تیر انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
 function positive(v,label){const n=Number(v);if(!Number.isFinite(n)||n<=0)throw new Error(label+" باید عددی مثبت باشد.");return n;}
 function createOverride(memberId,base,input){
  if(!memberId||!base||!input)throw new Error("عضو، مقطع پایه و ورودی مستقل لازم است.");
  const profile=String(input.profile||"").trim();
  if(!profile)throw new Error("نام مقطع مستقل را وارد کنید.");
  const A=positive(input.A_cm2,"مساحت A")*1e-4;
  const Iy=positive(input.Iy_cm4,"ممان اینرسی Iy")*1e-8;
  const Iz=positive(input.Iz_cm4,"ممان اینرسی Iz")*1e-8;
  const J=positive(input.J_cm4,"ثابت پیچشی J")*1e-8;
  return {memberId:String(memberId),section:{...base,profile,A,Iy,Iz,J},
   sourceReference:"ورودی مستقل کاربر برای عضو "+String(memberId)};
 }
 function ensurePanel(){
  if(panel&&panel.isConnected)return panel;
  panel=$("memberInitialSectionPanel");
  if(panel)return panel;
  panel=document.createElement("section");panel.className="panel";panel.id="memberInitialSectionPanel";
  panel.innerHTML='<div class="panel-title"><h3>مقاطع اولیه مستقل اعضا</h3><span class="status">ورودی اختیاری هر عضو</span></div>'+
   '<div class="notice">مقطع پیش‌فرض گروه برای همه اعضا حفظ می‌شود. از فهرست، عضو موردنظر را انتخاب کنید و فقط در صورت نیاز مقطع اولیه متفاوت آن را ثبت کنید. مقادیر هندسی با واحد cm² و cm⁴ وارد می‌شوند؛ این مرحله به معنی کنترل مقاومت یا تأیید آیین‌نامه‌ای نیست.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="initialSectionMember">عضو سازه‌ای</label><select id="initialSectionMember"><option value="">ابتدا مدل هندسی را بسازید</option></select></div>'+
   '<div class="field"><label for="initialSectionProfile">نام مقطع اولیه</label><input id="initialSectionProfile" type="text" placeholder="نام دقیق مقطع"></div>'+
   '<div class="field"><label for="initialSectionA">مساحت A (cm²)</label><input id="initialSectionA" type="number" min="0" step="0.01"></div>'+
   '<div class="field"><label for="initialSectionIy">ممان اینرسی Iy (cm⁴)</label><input id="initialSectionIy" type="number" min="0" step="0.01"></div>'+
   '<div class="field"><label for="initialSectionIz">ممان اینرسی Iz (cm⁴)</label><input id="initialSectionIz" type="number" min="0" step="0.01"></div>'+
   '<div class="field"><label for="initialSectionJ">ثابت پیچشی J (cm⁴)</label><input id="initialSectionJ" type="number" min="0" step="0.01"></div>'+
   '<div class="field"><label for="initialSectionMode">روش تعریف مقطع</label><select id="initialSectionMode"><option value="properties">ورود مستقیم خواص مقطع</option><option value="builtUpI">تیرورق I ـ محاسبه خودکار از ابعاد</option></select></div>'+
   '<div class="field"><label for="initialSectionRollDeg">چرخش حول محور محلی +X عضو (درجه)</label><input id="initialSectionRollDeg" type="number" step="0.1" placeholder="زاویه صریح؛ صفر نیز باید ثبت شود"></div>'+
   '<div class="field"><label><input id="initialSectionOrientationConfirmed" type="checkbox"> جهت جان و بال با نقشه ساخت/نصب تطبیق داده شده است</label></div></div>'+
   '<div id="initialSectionGeometry" hidden><h4>ابعاد هندسی تیرورق (mm)</h4><div class="form-grid">'+
   '<div class="field"><label for="sectionTopB">عرض بال بالا</label><input id="sectionTopB" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="sectionTopT">ضخامت بال بالا</label><input id="sectionTopT" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="sectionBottomB">عرض بال پایین</label><input id="sectionBottomB" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="sectionBottomT">ضخامت بال پایین</label><input id="sectionBottomT" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="sectionWebH">ارتفاع خالص جان</label><input id="sectionWebH" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="sectionWebT">ضخامت جان</label><input id="sectionWebT" type="number" min="1" step="1"></div></div>'+
   '<div id="initialSectionGeometrySummary" class="notice">با تغییر هر بعد، خواص هندسی به‌صورت خودکار محاسبه و در ورودی همین عضو به‌روزرسانی می‌شود.</div></div>'+
   '<div class="button-grid"><button type="button" class="btn primary" id="btnSaveInitialMemberSection">ثبت مقطع برای همین عضو</button><button type="button" class="btn secondary" id="btnClearInitialMemberSection">بازگشت به پیش‌فرض گروه</button><button type="button" class="btn secondary" id="btnSaveSectionOrientation">ثبت چرخش و جهت نصب مقطع</button></div>'+
   '<div id="initialMemberSectionMessage" class="notice" aria-live="polite">مقطع‌های مستقل هنوز وارد نشده‌اند.</div>';
  const host=$("shedLayoutPanel")||document.querySelector("main");
  if(host&&host.parentNode)host.parentNode.insertBefore(panel,host.nextSibling);
  $("initialSectionMember").addEventListener("change",e=>{selectedId=e.target.value;loadSelected();});
  $("initialSectionMode").addEventListener("change",e=>{ $("initialSectionGeometry").hidden=e.target.value!=="builtUpI"; if(e.target.value==="builtUpI") updateBuiltUpFromDimensions(); });
  ["sectionTopB","sectionTopT","sectionBottomB","sectionBottomT","sectionWebH","sectionWebT"].forEach(id=>$(id).addEventListener("input",updateBuiltUpFromDimensions));
  $("btnSaveInitialMemberSection").addEventListener("click",()=>{
   try{
    if($("initialSectionMode")?.value==="builtUpI"){
     updateBuiltUpFromDimensions();
     if(!dirty.has(selectedId))throw new Error("ابعاد کامل تیرورق را وارد کنید.");
     message("ابعاد و تمام خواص هندسی مقطع همین عضو به‌روزرسانی و ثبت شد. تحلیل مجدد لازم است.");
     return;
    }
    const member=currentModel?.members?.find(m=>String(m.id)===selectedId);
    if(!member)throw new Error("ابتدا یک عضو معتبر انتخاب کنید.");
    const base=baseFor(member);
    const item=createOverride(selectedId,base,{
     profile:$("initialSectionProfile").value,A_cm2:$("initialSectionA").value,
     Iy_cm4:$("initialSectionIy").value,Iz_cm4:$("initialSectionIz").value,J_cm4:$("initialSectionJ").value
    });
    applyOrientationInput(item.section);
    dirty.set(selectedId,item);
    if(root.SahroudSectionPropertyRegistry?.applyOne)root.SahroudSectionPropertyRegistry.applyOne(member,item.section);
    invalidateAnalysis(selectedId);
    message("مقطع اولیه مستقل عضو "+selectedId+" ثبت و در مشخصات یکپارچه عضو به‌روزرسانی شد. تحلیل مجدد لازم است.");
   }catch(e){message(e.message,true);}
  });
  $("btnSaveSectionOrientation").addEventListener("click",saveOrientation);
  $("btnClearInitialMemberSection").addEventListener("click",()=>{
   if(!selectedId)return;
   dirty.delete(selectedId);
   const member=currentModel?.members?.find(m=>String(m.id)===selectedId);
   if(member){delete member.sectionProperties;delete member.sectionPropertyFingerprint;delete member.sectionPropertySource;delete member.sectionRollDeg;delete member.sectionOrientationVerified;}
   invalidateAnalysis(selectedId);loadSelected();message("ورودی مستقل حذف شد؛ مقطع پیش‌فرض گروه برای این عضو استفاده می‌شود و تحلیل مجدد لازم است.");
  });
  return panel;
 }
 function updateBuiltUpFromDimensions(){
  if($("initialSectionMode")?.value!=="builtUpI")return;
  const member=currentModel?.members?.find(m=>String(m.id)===selectedId);
  if(!member){message("ابتدا عضو معتبر را انتخاب کنید.",true);return;}
  try{
   const calculator=root.SahroudBuiltUpSection?.calculateBuiltUpISection;
   if(typeof calculator!=="function")throw new Error("محاسبه‌گر هندسه تیرورق بارگذاری نشده است.");
   const geometry={
    topFlangeWidthMm:Number($("sectionTopB").value),topFlangeThicknessMm:Number($("sectionTopT").value),
    bottomFlangeWidthMm:Number($("sectionBottomB").value),bottomFlangeThicknessMm:Number($("sectionBottomT").value),
    webClearHeightMm:Number($("sectionWebH").value),webThicknessMm:Number($("sectionWebT").value)
   };
   if(Object.values(geometry).some(v=>!Number.isFinite(v)||v<=0))return;
   const result=calculator({...geometry,profile:$("initialSectionProfile").value||"تیرورق I"});
   const A=result.areaCm2, Iy=result.weakAxis.inertiaCm4, Iz=result.strongAxis.inertiaCm4, J=result.torsion.JApproxCm4;
   $("initialSectionA").value=A.toFixed(3);$("initialSectionIy").value=Iy.toFixed(3);
   $("initialSectionIz").value=Iz.toFixed(3);$("initialSectionJ").value=J.toFixed(3);
   const base=baseFor(member);if(!base)throw new Error("مقطع پایه و خواص ماده عضو موجود نیست.");
   const item=createOverride(selectedId,base,{profile:$("initialSectionProfile").value||result.profile,A_cm2:A,Iy_cm4:Iy,Iz_cm4:Iz,J_cm4:J});
   applyOrientationInput(item.section);
   item.section.geometryType="built-up-I";
   item.section.geometryDimensionsMm={...geometry};
   item.section.geometricProperties=result;
   item.section.SxTop=result.strongAxis.sectionModulusTopCm3*1e-6;
   item.section.SxBottom=result.strongAxis.sectionModulusBottomCm3*1e-6;
   item.section.Sy=result.weakAxis.sectionModulusCm3*1e-6;
   item.section.rx=Math.sqrt(Iz/A)*0.01;
   item.section.ry=Math.sqrt(Iy/A)*0.01;
   item.section.massPerMeterKg=A*0.785;
   dirty.set(selectedId,item);
   if(root.SahroudSectionPropertyRegistry?.applyOne)root.SahroudSectionPropertyRegistry.applyOne(member,item.section);
   invalidateAnalysis(selectedId);
   $("initialSectionGeometrySummary").textContent="به‌روزرسانی زنده انجام شد: A="+A.toFixed(2)+" cm²، Iy="+Iy.toFixed(2)+" cm⁴، Iz="+Iz.toFixed(2)+" cm⁴، J≈"+J.toFixed(2)+" cm⁴، Sx بالا/پایین="+result.strongAxis.sectionModulusTopCm3.toFixed(2)+"/"+result.strongAxis.sectionModulusBottomCm3.toFixed(2)+" cm³، Sy="+result.weakAxis.sectionModulusCm3.toFixed(2)+" cm³، وزن="+(A*0.785).toFixed(2)+" kg/m. خواص در مدل تحلیلی بعدی جایگزین می‌شوند؛ تحلیل قبلی تا اجرای مجدد معتبر نیست.";
   message("خواص کامل هندسی و وزن مقطع از ابعاد جدید محاسبه و برای همین عضو ثبت شد؛ تحلیل باید دوباره اجرا شود.");
  }catch(e){$("initialSectionGeometrySummary").textContent="خطا در هندسه مقطع: "+e.message;message(e.message,true);}
 }
 function applyOrientationInput(section){
  const raw=$("initialSectionRollDeg")?.value;
  if(raw===""||raw===undefined){delete section.sectionRollDeg;section.sectionOrientationConfirmed=false;return;}
  const angle=Number(raw);
  if(!Number.isFinite(angle))throw new Error("زاویه چرخش مقطع باید عددی متناهی بر حسب درجه باشد.");
  section.sectionRollDeg=angle;
  section.sectionOrientationConfirmed=$("initialSectionOrientationConfirmed")?.checked===true;
 }
 function saveOrientation(){
  try{
   const member=currentModel?.members?.find(m=>String(m.id)===selectedId);
   if(!member)throw new Error("ابتدا یک عضو معتبر انتخاب کنید.");
   const raw=$("initialSectionRollDeg")?.value;
   if(raw===""||raw===undefined)throw new Error("زاویه صریح بر حسب درجه وارد کنید؛ صفر نیز باید صریح ثبت شود.");
   const angle=Number(raw);
   if(!Number.isFinite(angle))throw new Error("زاویه چرخش مقطع باید عددی متناهی باشد.");
   const existing=dirty.get(selectedId),base=existing?.section||baseFor(member);
   if(!base)throw new Error("مقطع پایه عضو در دسترس نیست؛ ابتدا مقطع اولیه را تخصیص دهید.");
   const section={...base,sectionRollDeg:angle,sectionOrientationConfirmed:$("initialSectionOrientationConfirmed")?.checked===true};
   const item={memberId:selectedId,section,sourceReference:"جهت نصب و چرخش صریح کاربر برای عضو "+selectedId};
   dirty.set(selectedId,item);
   if(root.SahroudSectionPropertyRegistry?.applyOne)root.SahroudSectionPropertyRegistry.applyOne(member,section);
   invalidateAnalysis(selectedId);
   message("چرخش "+angle+" درجه حول محور محلی +X ثبت شد. "+(section.sectionOrientationConfirmed?"تطبیق جهت نصب با نقشه تأیید شد.":"زاویه ثبت شد، اما جهت نصب با نقشه تأیید نشده و هندسه اتصال قابل تأیید نیست.")+" تحلیل مجدد لازم است.");
  }catch(e){message(e.message,true);}
 }
 function invalidateAnalysis(memberId){
  // A section edit invalidates every cached result based on the previous stiffness matrix.
  if(root.SteelStructuralModel){root.SteelStructuralModel.last3DResult=null;root.SteelStructuralModel.lastConnectionDemand=null;}
  ["fullModel3DResult","fullModel3DDemand","fullModel3DCombinationResult","criticalRafterDiagram"].forEach(id=>{
   const el=$(id);if(el)el.textContent="مقطع عضو "+memberId+" تغییر کرده است؛ نتایج قبلی نامعتبرند. مدل و تمام ترکیبات بار را دوباره تحلیل کنید.";
  });
  const report=$("finalReportResults");if(report)report.textContent="مقطع اعضا تغییر کرده است؛ گزارش قبلی را معتبر تلقی نکنید و پس از تحلیل مجدد گزارش تازه بسازید.";
  if(currentModel){currentModel.sectionPropertyAudit=null;currentModel.sectionPropertiesDirty=true;}
 }
 function message(text,error){const el=$("initialMemberSectionMessage");if(el){el.textContent=text;el.style.color=error?"#b45309":"";}}
 function baseFor(member){
  try{return root.SteelSections?.resolveAnalysis3DSection(member)||null;}catch(_){return null;}
 }
 function toDisplay(si,factor){return Number.isFinite(Number(si))&&Number(si)>0?(Number(si)/factor).toString():"";}
 function loadSelected(){
  const member=currentModel?.members?.find(m=>String(m.id)===selectedId);if(!member)return;
  const saved=dirty.get(selectedId),base=saved?.section||baseFor(member)||{};
  $("initialSectionProfile").value=base.profile||"";
  $("initialSectionRollDeg").value=base.sectionRollDeg??"";
  $("initialSectionOrientationConfirmed").checked=base.sectionOrientationConfirmed===true;
  $("initialSectionA").value=toDisplay(base.A,1e-4);
  $("initialSectionIy").value=toDisplay(base.Iy,1e-8);
  $("initialSectionIz").value=toDisplay(base.Iz,1e-8);
  $("initialSectionJ").value=toDisplay(base.J,1e-8);
  const gd=base.geometryDimensionsMm||{};
  [["sectionTopB","topFlangeWidthMm"],["sectionTopT","topFlangeThicknessMm"],["sectionBottomB","bottomFlangeWidthMm"],["sectionBottomT","bottomFlangeThicknessMm"],["sectionWebH","webClearHeightMm"],["sectionWebT","webThicknessMm"]].forEach(([id,key])=>{if($(id))$(id).value=gd[key]??"";});
  if($("initialSectionMode")){$("initialSectionMode").value=base.geometryType==="built-up-I"?"builtUpI":"properties";$("initialSectionGeometry").hidden=$("initialSectionMode").value!=="builtUpI";}
  if(base.geometricProperties&&$("initialSectionGeometrySummary"))$("initialSectionGeometrySummary").textContent="خواص هندسی ذخیره‌شده از ابعاد مقطع بازیابی شد؛ با تغییر هر بعد دوباره محاسبه می‌شود.";
  if(!saved)message("مقادیر نمایش‌داده‌شده از مقطع پیش‌فرض گروه «"+(labels[member.sectionKey]||member.sectionKey)+"» آمده‌اند. برای تغییر مستقل، مقادیر را اصلاح و ثبت کنید.");
  else message("این عضو دارای مقطع اولیه مستقل ثبت‌شده است.");
 }
 function setModel(model){
  currentModel=model||null;ensurePanel();
  const select=$("initialSectionMember");if(!select)return;
  const previous=selectedId;
  const members=currentModel?.members||[];
  select.innerHTML='<option value="">انتخاب عضو</option>'+members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.id)+' — '+esc(labels[m.sectionKey]||m.type||m.sectionKey)+'</option>').join("");
  if(members.some(m=>String(m.id)===previous))selectedId=previous;
  else selectedId=members.length?String(members[0].id):"";
  select.value=selectedId;
  loadSelected();
 }
 function readOverrides(model,baseOverrides){
  const members=model?.members||[],baseMap=new Map((baseOverrides||[]).map(x=>[String(x.memberId),x.section]));
  const ids=new Set(members.map(m=>String(m.id)));
  const unknown=[...dirty.keys()].filter(id=>!ids.has(id));
  if(unknown.length)throw new Error("ورودی مستقل برای اعضای خارج از مدل جاری وجود دارد: "+unknown.join("، "));
  return [...dirty.values()].map(item=>{
   const base=baseMap.get(item.memberId)||baseFor(members.find(m=>String(m.id)===item.memberId));
   if(!base)throw new Error("مقطع پایه عضو "+item.memberId+" برای تکمیل خواص ماده موجود نیست.");
   return {memberId:item.memberId,section:{...base,...item.section},sourceReference:item.sourceReference};
  });
 }
 function getData(){return [...dirty.values()].map(item=>({memberId:item.memberId,section:{...item.section},sourceReference:item.sourceReference}));}
 function setData(records){
  dirty.clear();
  if(records==null)return;
  if(!Array.isArray(records))throw new Error("داده مقاطع مستقل ذخیره‌شده باید آرایه باشد.");
  records.forEach(item=>{
   if(!item||!item.memberId||!item.section||typeof item.section!=="object")throw new Error("رکورد مقطع مستقل ذخیره‌شده معتبر نیست.");
   dirty.set(String(item.memberId),{memberId:String(item.memberId),section:{...item.section},sourceReference:String(item.sourceReference||"ورودی مستقل ذخیره‌شده پروژه")});
  });
  if(currentModel)setModel(currentModel);
 }
 function getState(){return {memberCount:currentModel?.members?.length||0,overrideCount:dirty.size,memberIds:[...dirty.keys()]};}
 root.SahroudMemberInitialSectionUI={setModel,readOverrides,createOverride,getData,setData,getState};
})(typeof window!=="undefined"?window:globalThis);
