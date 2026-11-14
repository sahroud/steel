/* SAHROUD STEEL — load case and combination evidence workbench.
 * UI + project persistence. This records engineer-supplied data only.
 */
(function(root){"use strict";
const txt=v=>String(v??"").trim();
const clone=v=>JSON.parse(JSON.stringify(v));
let state={loadCases:[],combinations:[],status:"evidence_collection_only",designApproved:false,solverEnabled:false};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function audit(data){
 const p=data||{},caseAudit=root.SteelLoadCaseEvidenceContract?.audit?.({loadCases:p.loadCases||[]})||{success:false,issues:["قرارداد ممیزی حالت بار بارگذاری نشده است."]};
 const registry=root.SteelLoadCombinationRegistry?.audit?.({loadCases:(p.loadCases||[]).map(c=>({id:c.id,category:c.category,effects:c.values})),combinations:p.combinations||[]})||{success:false,issues:["رجیستری ترکیب بار بارگذاری نشده است."]};
 return {success:caseAudit.success&&registry.success,caseAudit,registry,issues:[...caseAudit.issues,...registry.issues],designApproved:false,solverEnabled:false};
}
function panelHTML(){return `
<section class="panel" id="loadCaseWorkbench">
 <div class="panel-title"><h3>۱۰ ـ دفتر ثبت حالت‌ها و ترکیب‌های بار مستند</h3><span class="status">ثبت شواهد؛ بدون اجرای تحلیل</span></div>
 <div class="notice">این دفترچه، حالت‌های بار و ضرایب ترکیب را فقط با اطلاعاتی که مهندس وارد می‌کند ثبت می‌کند. هیچ بار یا ضریب آیین‌نامه‌ای به‌طور خودکار تولید نمی‌شود. واحدها باید با یکدیگر سازگار باشند. ثبت اطلاعات به معنی تأیید مهندسی یا ارسال بار به حل‌گر نیست.</div>
 <h4>الف ـ ثبت حالت بار</h4>
 <div class="form-grid">
  <div class="field"><label for="lcw_id">شناسه یکتا</label><input id="lcw_id" placeholder="مثلاً D-01"></div>
  <div class="field"><label for="lcw_type">نوع بار</label><select id="lcw_type"><option value="nodal">گرهی</option><option value="member_point">متمرکز روی عضو</option><option value="member_uniform">گسترده روی عضو</option><option value="surface">سطحی</option><option value="crane_wheel">چرخ جرثقیل</option><option value="support_settlement">نشست تکیه‌گاه</option><option value="temperature">دما</option><option value="other">سایر</option></select></div>
  <div class="field"><label for="lcw_category">دسته بار</label><input id="lcw_category" placeholder="dead / live / snow / wind / crane"></div>
  <div class="field"><label for="lcw_unit">واحد</label><select id="lcw_unit"><option>kN</option><option>N</option><option>kN/m</option><option>N/m</option><option>kN/m2</option><option>N/m2</option><option>kN.m</option><option>N.m</option><option>mm</option><option>m</option><option>C</option></select></div>
  <div class="field"><label for="lcw_coordinates">دستگاه مختصات</label><input id="lcw_coordinates" placeholder="global / member-local"></div>
  <div class="field"><label for="lcw_sign">قرارداد علامت</label><input id="lcw_sign" placeholder="مثلاً +Z رو به بالا"></div>
  <div class="field"><label for="lcw_target">مقصد بار</label><input id="lcw_target" placeholder="node:N1 / member:M1 / surface:..."></div>
 </div>
 <div class="field"><label for="lcw_values">مقادیر عددی (JSON)</label><textarea id="lcw_values" rows="2" placeholder='{"Fz":-12.5}'></textarea></div>
 <h4>منبع و ردیابی</h4>
 <div class="form-grid">
  <div class="field"><label for="lcw_doc">نام سند</label><input id="lcw_doc"></div>
  <div class="field"><label for="lcw_revision">ویرایش / تاریخ</label><input id="lcw_revision"></div>
  <div class="field"><label for="lcw_locator">صفحه / شیت / بند دقیق</label><input id="lcw_locator"></div>
  <div class="field"><label for="lcw_authority">تهیه‌کننده / مرجع</label><input id="lcw_authority"></div>
 </div>
 <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" id="lcw_add">ثبت حالت بار</button><button type="button" id="lcw_clear" class="secondary">پاک‌کردن فرم</button></div>
 <div id="lcw_cases" class="notice">هنوز حالتی ثبت نشده است.</div>
 <h4>ب ـ ثبت ترکیب بار</h4>
 <div class="notice">ضرایب باید صریحاً توسط طراح وارد شوند. قالب ضرایب JSON است؛ کلیدها شناسه حالت بار و مقدارها ضریب عددی هستند.</div>
 <div class="form-grid">
  <div class="field"><label for="lcw_combo_id">شناسه ترکیب</label><input id="lcw_combo_id" placeholder="مثلاً ULS-01"></div>
  <div class="field"><label for="lcw_factors">ضرایب (JSON)</label><input id="lcw_factors" placeholder='{"D-01":1.2,"W-01":1.0}'></div>
  <div class="field"><label for="lcw_code">مرجع آیین‌نامه</label><input id="lcw_code" placeholder="مبحث ششم"></div>
  <div class="field"><label for="lcw_edition">ویرایش</label><input id="lcw_edition"></div>
  <div class="field"><label for="lcw_clause">بند / جدول</label><input id="lcw_clause"></div>
  <div class="field"><label for="lcw_combo_doc">سند مبنای مصوب پروژه</label><input id="lcw_combo_doc"></div>
 </div>
 <button type="button" id="lcw_add_combo">ثبت ترکیب بار</button>
 <div id="lcw_combinations" class="notice">هنوز ترکیبی ثبت نشده است.</div>
 <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" id="lcw_audit">ممیزی شواهد و ترکیب‌ها</button><button type="button" id="lcw_export" class="secondary">دریافت JSON دفترچه</button></div>
 <div id="lcw_result" class="notice">وضعیت ممیزی هنوز مشخص نشده است.</div>
</section>`;}
function render(){
 const a=$("lcw_cases"),b=$("lcw_combinations");if(!a||!b)return;
 a.innerHTML=state.loadCases.length?state.loadCases.map((x,i)=>`<div class="notice"><b>${esc(x.id)}</b> — ${esc(x.category)} / ${esc(x.type)} / ${esc(x.unit)}<br>مقصد: ${esc(x.target)} | منبع: ${esc(x.source.document)} — ${esc(x.source.locator)} <button type="button" data-lcw-remove="${i}">حذف</button></div>`).join(""):"هنوز حالتی ثبت نشده است.";
 b.innerHTML=state.combinations.length?state.combinations.map((x,i)=>`<div class="notice"><b>${esc(x.id)}</b> — ضرایب: ${esc(JSON.stringify(x.factors))}<br>${esc(x.source.code)}، ویرایش ${esc(x.source.edition)}، ${esc(x.source.clause)} <button type="button" data-lcw-combo-remove="${i}">حذف</button></div>`).join(""):"هنوز ترکیبی ثبت نشده است.";
 a.querySelectorAll("[data-lcw-remove]").forEach(el=>el.addEventListener("click",()=>{state.loadCases.splice(Number(el.dataset.lcwRemove),1);render();persist();}));
 b.querySelectorAll("[data-lcw-combo-remove]").forEach(el=>el.addEventListener("click",()=>{state.combinations.splice(Number(el.dataset.lcwComboRemove),1);render();persist();}));
}
function persist(){state.status="evidence_collection_only";state.designApproved=false;state.solverEnabled=false;return clone(state);}
function setData(data){const d=data||{};state={loadCases:Array.isArray(d.loadCases)?clone(d.loadCases):[],combinations:Array.isArray(d.combinations)?clone(d.combinations):[],status:"evidence_collection_only",designApproved:false,solverEnabled:false};render();return true;}
function read(){return persist();}
function parseJSON(id,label){try{return JSON.parse($(id).value||"{}");}catch(e){throw new Error(label+" باید JSON معتبر باشد.");}}
function addCase(){
 const c={id:txt($("lcw_id").value),type:$("lcw_type").value,category:txt($("lcw_category").value),unit:$("lcw_unit").value,coordinateSystem:txt($("lcw_coordinates").value),signConvention:txt($("lcw_sign").value),target:txt($("lcw_target").value),values:parseJSON("lcw_values","مقادیر"),source:{document:txt($("lcw_doc").value),revision:txt($("lcw_revision").value),locator:txt($("lcw_locator").value),authority:txt($("lcw_authority").value)}};
 if(!c.id||!c.category||!c.coordinateSystem||!c.signConvention||!c.target||!Object.keys(c.values).length||!c.source.document||!c.source.revision||!c.source.locator||!c.source.authority)throw new Error("همه مشخصات، مقادیر و چهار جزء منبع باید تکمیل شوند.");
 if(state.loadCases.some(x=>x.id===c.id))throw new Error("شناسه حالت بار تکراری است.");
 if(!c.values||typeof c.values!=="object"||Array.isArray(c.values)||Object.values(c.values).some(v=>typeof v!=="number"||!Number.isFinite(v)))throw new Error("مقادیر باید یک شیء شامل اعداد متناهی باشند.");
 state.loadCases.push(c);render();persist();$("lcw_id").value="";$("lcw_values").value="";
}
function addCombo(){
 const c={id:txt($("lcw_combo_id").value),factors:parseJSON("lcw_factors","ضرایب"),source:{code:txt($("lcw_code").value),edition:txt($("lcw_edition").value),clause:txt($("lcw_clause").value),document:txt($("lcw_combo_doc").value)}};
 if(!c.id||!Object.keys(c.factors).length||!c.source.code||!c.source.edition||!c.source.clause||!c.source.document)throw new Error("شناسه، ضرایب و تمام مشخصات منبع ترکیب لازم است.");
 if(state.combinations.some(x=>x.id===c.id))throw new Error("شناسه ترکیب تکراری است.");
 if(Object.values(c.factors).some(v=>typeof v!=="number"||!Number.isFinite(v)))throw new Error("ضرایب باید اعداد متناهی باشند.");
 state.combinations.push(c);render();persist();$("lcw_combo_id").value="";
}
function report(result){const el=$("lcw_result");if(!el)return;el.textContent=result.success?"ممیزی شواهد و ساختار ترکیب‌ها موفق شد؛ این نتیجه تأیید طراحی نیست.":("اطلاعات ناقص یا ناسازگار است: "+result.issues.join(" | "));}
function init(){
 if(!$("advancedLoadPanel")||$("loadCaseWorkbench"))return;
 $("advancedLoadPanel").insertAdjacentHTML("afterend",panelHTML());
 $("lcw_add").addEventListener("click",()=>{try{addCase();}catch(e){report({success:false,issues:[e.message]});}});
 $("lcw_clear").addEventListener("click",()=>["lcw_id","lcw_category","lcw_coordinates","lcw_sign","lcw_target","lcw_values","lcw_doc","lcw_revision","lcw_locator","lcw_authority"].forEach(id=>$(id).value=""));
 $("lcw_add_combo").addEventListener("click",()=>{try{addCombo();}catch(e){report({success:false,issues:[e.message]});}});
 $("lcw_audit").addEventListener("click",()=>report(audit(state)));
 $("lcw_export").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(read(),null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-load-evidence.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 render();
}
function selfTest(){
 const src={document:"Calc.pdf",revision:"R1",locator:"Sheet L-2",authority:"Designer"};
 const lc={id:"D1",type:"nodal",category:"dead",unit:"kN",coordinateSystem:"global",signConvention:"+Z upward",target:"node:N1",source:src,values:{Fz:-10}};
 const combo={id:"C1",factors:{D1:1.2},source:{code:"مبحث ششم",edition:"۱۳۹۸",clause:"6-2",document:"Project design basis"}};
 const tests=[["round-trip state retains evidence",()=>{setData({loadCases:[lc],combinations:[combo]});return read().loadCases[0].source.locator==="Sheet L-2"&&read().combinations[0].factors.D1===1.2;}],["evidence and combination audits pass",()=>audit({loadCases:[lc],combinations:[combo]}).success],["missing combination source rejected",()=>{const x=clone(combo);delete x.source.clause;return !audit({loadCases:[lc],combinations:[x]}).success;}],["unknown combination case rejected",()=>{const x=clone(combo);x.factors.MISSING=1;return !audit({loadCases:[lc],combinations:[x]}).success;}],["no implicit design approval",()=>{const r=read();return r.designApproved===false&&r.solverEnabled===false;}]];
 const results=tests.map(([name,fn])=>({name,ok:!!fn()}));return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelLoadCaseWorkbench={read,setData,audit,selfTest,init};
document.addEventListener("DOMContentLoaded",init);
})(typeof window!=="undefined"?window:globalThis);
