/* SAHROUD STEEL — explicit end-connection assumptions for generated bracing members.
 * Default remains continuous rotational compatibility. A pinned choice releases rx/ry/rz
 * at the selected local member end in the 3D solver. Physical detailing remains unverified.
 */
(function(root){
 "use strict";
 const records=new Map();
 let currentModel=null, selectedId="";
 const labels={wallBrace:"مهاربند ضربدری دیوار",roofBrace:"مهاربند ضربدری سقف"};
 const ends=["i","j"];
 const validMode=v=>v==="continuous"||v==="pinned";
 const $=id=>root.document?.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function normalizeRecord(raw){
  if(!raw||typeof raw!=="object"||!String(raw.memberId||"").trim())throw new Error("شناسه مهاربند برای ذخیره تنظیم اتصال الزامی است.");
  const result={memberId:String(raw.memberId)};
  for(const end of ends){
   const mode=raw[end]===undefined?"continuous":raw[end];
   if(!validMode(mode))throw new Error("نوع اتصال انتهای "+end+" برای مهاربند معتبر نیست.");
   result[end]=mode;
  }
  return result;
 }
 function applyToModel(model){
  if(!model||!Array.isArray(model.members))throw new TypeError("مدل اعضا برای اعمال تنظیم اتصال معتبر نیست.");
  const byId=new Map(model.members.map(m=>[String(m.id),m]));
  for(const member of model.members){
   if(!["wallBrace","roofBrace"].includes(member.sectionKey))continue;
   const prior=records.get(String(member.id));
   if(!prior){delete member.endReleases;member.analysisJointAssumption="shared-node-rotational-continuity";continue;}
   const releases={};
   for(const end of ends)if(prior[end]==="pinned")releases[end]=["rx","ry","rz"];
   if(Object.keys(releases).length)member.endReleases=releases;
   else delete member.endReleases;
   member.analysisJointAssumption=Object.keys(releases).length
    ?"user-selected-released-rotations":"shared-node-rotational-continuity";
   // This is a modelling assumption only, never evidence of a built connection.
   member.physicalConnectionStatus="unverified";
  }
  const orphaned=[...records.keys()].filter(id=>!byId.has(id));
  return {appliedCount:[...records.keys()].filter(id=>byId.has(id)).length,orphanedMemberIds:orphaned};
 }
 function invalidate(memberId){
  if(root.SteelStructuralModel){
   root.SteelStructuralModel.last3DResult=null;
   root.SteelStructuralModel.lastConnectionDemand=null;
  }
  ["fullModel3DResult","fullModel3DDemand","fullModel3DCombinationResult","criticalRafterDiagram","finalReportResults"].forEach(id=>{
   const el=$(id);if(el)el.textContent="فرض اتصال انتهای مهاربند "+memberId+" تغییر کرده است؛ نتایج و گزارش قبلی نامعتبرند. مدل و ترکیبات بار را دوباره تحلیل کنید.";
  });
  if(root.SteelProject?.setStatus)root.SteelProject.setStatus("فرض اتصال مهاربند تغییر کرد؛ تحلیل مجدد الزامی است.");
 }
 function ensurePanel(){
  let panel=$("memberEndConnectionPanel");if(panel)return panel;
  if(!root.document)return null;
  panel=root.document.createElement("section");panel.id="memberEndConnectionPanel";panel.className="panel";
  panel.innerHTML='<div class="panel-title"><h3>فرض اتصال انتهایی مهاربندها در تحلیل سه‌بعدی</h3><span class="status">انتخاب مستقل دو انتها</span></div>'+
   '<div class="notice">این انتخاب فقط فرض تحلیلی را تعیین می‌کند. «پیوسته» یعنی دوران‌های گره مشترک آزاد نشده‌اند؛ «مفصلی» یعنی سه دوران محلی rx، ry و rz در همان انتها آزاد می‌شوند. پیش‌فرض همه مهاربندها پیوسته و بدون آزادسازی است. وضعیت اتصال فیزیکی، ورق گاست، پیچ و جوش همچنان تأییدنشده می‌ماند و باید با نقشه واقعی کنترل شود.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="braceConnectionMember">مهاربند</label><select id="braceConnectionMember"><option value="">ابتدا مدل را بسازید</option></select></div>'+
   '<div class="field"><label for="braceConnectionI">اتصال انتهای I (ابتدا)</label><select id="braceConnectionI"><option value="continuous">پیوسته ـ بدون آزادسازی</option><option value="pinned">مفصلی ـ آزادسازی rx, ry, rz</option></select></div>'+
   '<div class="field"><label for="braceConnectionJ">اتصال انتهای J (انتها)</label><select id="braceConnectionJ"><option value="continuous">پیوسته ـ بدون آزادسازی</option><option value="pinned">مفصلی ـ آزادسازی rx, ry, rz</option></select></div></div>'+
   '<div id="braceConnectionStatus" class="notice" aria-live="polite">هیچ تغییری ثبت نشده است؛ مدل قبلی بدون آزادسازی حفظ می‌شود.</div>';
  const host=$("shedLayoutPanel")||$("model3DPanel")||root.document.querySelector("main");
  if(host?.parentNode)host.parentNode.insertBefore(panel,host.nextSibling);else root.document.body.appendChild(panel);
  $("braceConnectionMember").addEventListener("change",e=>{selectedId=e.target.value;loadSelected();});
  ["braceConnectionI","braceConnectionJ"].forEach((id,index)=>$(id).addEventListener("change",e=>{
   if(!selectedId)return;
   const item=normalizeRecord({...records.get(selectedId),memberId:selectedId,[ends[index]]:e.target.value});
   records.set(selectedId,item);
   if(currentModel)applyToModel(currentModel);
   invalidate(selectedId);
   updateStatus("تنظیم اتصال مهاربند "+selectedId+" ثبت شد. تحلیل مجدد لازم است.");
  }));
  return panel;
 }
 function updateStatus(message){
  const el=$("braceConnectionStatus");if(!el)return;
  const report=currentModel?applyToModel(currentModel):{orphanedMemberIds:[]};
  const selected=records.get(selectedId);
  const detail=selected?("انتهای I: "+(selected.i==="pinned"?"مفصلی":"پیوسته")+"؛ انتهای J: "+(selected.j==="pinned"?"مفصلی":"پیوسته")):"هر دو انتها پیوسته‌اند (پیش‌فرض).";
  el.textContent=message+" "+detail+
   (report.orphanedMemberIds.length?" هشدار: شناسه‌های خارج از مدل جاری: "+report.orphanedMemberIds.join("، "):"")+
   "؛ جزئیات اتصال فیزیکی: تأییدنشده.";
 }
 function loadSelected(){
  if(!selectedId)return;
  const item=records.get(selectedId)||{memberId:selectedId,i:"continuous",j:"continuous"};
  if($("braceConnectionI"))$("braceConnectionI").value=item.i;
  if($("braceConnectionJ"))$("braceConnectionJ").value=item.j;
  updateStatus("فرض تحلیلی عضو انتخاب‌شده.");
 }
 function setModel(model){
  currentModel=model||null;
  ensurePanel();
  if(!currentModel)return;
  applyToModel(currentModel);
  const select=$("braceConnectionMember");if(!select)return;
  const members=currentModel.members.filter(m=>["wallBrace","roofBrace"].includes(m.sectionKey));
  const previous=selectedId;
  select.innerHTML='<option value="">انتخاب مهاربند</option>'+members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.id)+" — "+esc(labels[m.sectionKey]||m.sectionKey)+" — دهانه "+esc(m.bay??"؟")+'</option>').join("");
  selectedId=members.some(m=>String(m.id)===previous)?previous:(members.length?String(members[0].id):"");
  select.value=selectedId;
  loadSelected();
  if(!members.length)updateStatus("در مدل جاری مهاربند دیوار/سقف تولید نشده است.");
 }
 function setData(items){
  if(items==null)items=[];
  if(!Array.isArray(items))throw new Error("تنظیمات اتصال مهاربندها باید آرایه باشد.");
  const next=new Map();
  items.forEach(raw=>{const item=normalizeRecord(raw);if(next.has(item.memberId))throw new Error("تنظیم تکراری برای مهاربند "+item.memberId+" وجود دارد.");next.set(item.memberId,item);});
  records.clear();next.forEach((v,k)=>records.set(k,v));
  if(currentModel)setModel(currentModel);
 }
 function getData(){return [...records.values()].sort((a,b)=>a.memberId.localeCompare(b.memberId)).map(x=>({...x}));}
 function getState(){const applied=currentModel?applyToModel(currentModel):{appliedCount:0,orphanedMemberIds:[...records.keys()]};return {recordCount:records.size,...applied};}
 if(root.document){
  if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",ensurePanel,{once:true});
  else ensurePanel();
 }
 root.SahroudMemberEndConnectionUI={setModel,applyToModel,setData,getData,getState,normalizeRecord};
})(typeof window!=="undefined"?window:globalThis);
