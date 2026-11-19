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
   '<div class="field"><label for="initialSectionJ">ثابت پیچشی J (cm⁴)</label><input id="initialSectionJ" type="number" min="0" step="0.01"></div></div>'+
   '<div class="button-grid"><button type="button" class="btn primary" id="btnSaveInitialMemberSection">ثبت مقطع برای همین عضو</button><button type="button" class="btn secondary" id="btnClearInitialMemberSection">بازگشت به پیش‌فرض گروه</button></div>'+
   '<div id="initialMemberSectionMessage" class="notice" aria-live="polite">مقطع‌های مستقل هنوز وارد نشده‌اند.</div>';
  const host=$("shedLayoutPanel")||document.querySelector("main");
  if(host&&host.parentNode)host.parentNode.insertBefore(panel,host.nextSibling);
  $("initialSectionMember").addEventListener("change",e=>{selectedId=e.target.value;loadSelected();});
  $("btnSaveInitialMemberSection").addEventListener("click",()=>{
   try{
    const member=currentModel?.members?.find(m=>String(m.id)===selectedId);
    if(!member)throw new Error("ابتدا یک عضو معتبر انتخاب کنید.");
    const base=baseFor(member);
    const item=createOverride(selectedId,base,{
     profile:$("initialSectionProfile").value,A_cm2:$("initialSectionA").value,
     Iy_cm4:$("initialSectionIy").value,Iz_cm4:$("initialSectionIz").value,J_cm4:$("initialSectionJ").value
    });
    dirty.set(selectedId,item);
    message("مقطع اولیه مستقل عضو "+selectedId+" ثبت شد. هنوز کنترل ظرفیت انجام نشده است.");
   }catch(e){message(e.message,true);}
  });
  $("btnClearInitialMemberSection").addEventListener("click",()=>{
   if(!selectedId)return;
   dirty.delete(selectedId);loadSelected();message("ورودی مستقل حذف شد؛ مقطع پیش‌فرض گروه برای این عضو استفاده می‌شود.");
  });
  return panel;
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
  $("initialSectionA").value=toDisplay(base.A,1e-4);
  $("initialSectionIy").value=toDisplay(base.Iy,1e-8);
  $("initialSectionIz").value=toDisplay(base.Iz,1e-8);
  $("initialSectionJ").value=toDisplay(base.J,1e-8);
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
 function getState(){return {memberCount:currentModel?.members?.length||0,overrideCount:dirty.size,memberIds:[...dirty.keys()]};}
 root.SahroudMemberInitialSectionUI={setModel,readOverrides,createOverride,getState};
})(typeof window!=="undefined"?window:globalThis);
