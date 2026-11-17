/* SAHROUD STEEL — per-physical-member cold-formed profile/evidence register.
 * Stores exact member records in project JSON; audits evidence only, never resistance.
 */
(function(root){
"use strict";
let records=[];
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
function getData(){return {schemaVersion:1,records:clone(records)};}
function setData(value){records=(Array.isArray(value?.records)?value.records:[]).filter(x=>x&&typeof x==="object").map(clone);render();}
function auditRecord(record){return root.SteelColdFormedMemberContract?.audit?root.SteelColdFormedMemberContract.audit(record):{success:false,issues:["قرارداد کنترل مقطع سردنورد بارگذاری نشده است."]};}
function readEditor(){try{return {value:JSON.parse($("cfmMemberJson")?.value||""),error:null};}catch(e){return {value:null,error:"JSON نامعتبر است: "+e.message};}}
function status(message){const el=$("cfmRegistryStatus");if(el)el.textContent=message;}
function render(){
 const host=$("coldFormedMemberRegistryContent");if(!host)return;
 const rows=records.map((r,i)=>{const a=auditRecord(r);return '<tr><td>'+String(r.memberId||"—")+'</td><td>'+String(r.group||"—")+'</td><td>'+(a.success?"آماده بازبینی مقاومت":"ناقص: "+a.issues.length+" مورد")+'</td><td><button type="button" class="btn secondary" data-cfm-edit="'+i+'">ویرایش JSON</button> <button type="button" class="btn secondary" data-cfm-delete="'+i+'">حذف</button></td></tr>';}).join("");
 host.innerHTML='<div class="notice">هر لاپه یا قید باید با شناسه فیزیکی مستقل و هندسه/خواص واقعی خودش ثبت شود. قالب JSON شامل هندسه، گواهی مصالح، خواص مقطع، خروجی کمانش مستند، مهار، شش مؤلفه هم‌زمان در ایستگاه‌ها، اتصال و بهره‌برداری است. این رجیستر فقط شواهد را ممیزی می‌کند و مقاومت یا تأیید طراحی محاسبه نمی‌کند.</div>'+
 '<div class="field"><label for="cfmMemberJson">رکورد کامل یک عضو (JSON)</label><textarea id="cfmMemberJson" rows="18" spellcheck="false" style="width:100%;font-family:monospace;direction:ltr;text-align:left" placeholder="JSON record"></textarea></div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="cfmSaveMember">ثبت / به‌روزرسانی عضو</button><button type="button" class="btn secondary" id="cfmAuditAll">ممیزی همه اعضا</button><button type="button" class="btn secondary" id="cfmExport">خروجی JSON اعضا</button><button type="button" class="btn secondary" id="cfmImport">ورود JSON اعضا</button></div>'+
 '<div class="notice" id="cfmRegistryStatus">تعداد رکوردها: '+records.length+' | ذخیره در ساختار فایل پروژه فعال است.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="width:100%"><thead><tr><th>شناسه عضو</th><th>گروه</th><th>وضعیت شواهد</th><th>عملیات</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
 '<div class="notice">گروه‌های مجاز: roofPurlin، wallGirt، endGirt، roofEdge. شناسه تکراری پذیرفته نمی‌شود. داده ناقص برای ظرفیت به صفر یا مقدار پیش‌فرض تبدیل نمی‌شود.</div>';
 $("cfmSaveMember").addEventListener("click",()=>{const q=readEditor();if(q.error){status(q.error);return;}const r=q.value;if(!r||typeof r!=="object"||Array.isArray(r)||!String(r.memberId||"").trim()){status("رکورد باید شیء JSON و دارای memberId یکتا باشد.");return;}const id=String(r.memberId).trim(),i=records.findIndex(x=>String(x.memberId)===id);if(i>=0)records[i]=clone(r);else records.push(clone(r));render();const a=auditRecord(r);status("رکورد "+id+" ثبت شد. "+(a.success?"شواهد کامل است؛ فقط آماده بازبینی مقاومت.":"شواهد ناقص است؛ "+a.issues.length+" مانع ثبت شد."));});
 $("cfmAuditAll").addEventListener("click",()=>{const ready=records.filter(r=>auditRecord(r).success).length;status("ممیزی "+records.length+" عضو: "+ready+" آماده بازبینی مقاومت، "+(records.length-ready)+" ناقص. ظرفیت محاسبه نشده و طراحی تأیید نشده است.");});
 $("cfmExport").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(getData(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-cold-formed-member-records.json";a.click();URL.revokeObjectURL(url);});
 $("cfmImport").addEventListener("click",()=>{const q=readEditor();if(q.error){status(q.error);return;}const incoming=Array.isArray(q.value)?q.value:q.value?.records;if(!Array.isArray(incoming)){status("برای ورود، آرایه رکوردها یا شیء دارای records لازم است.");return;}const ids=incoming.map(x=>String(x?.memberId||"").trim());if(ids.some(x=>!x)||new Set(ids).size!==ids.length){status("ورود رد شد: شناسه خالی یا تکراری وجود دارد.");return;}records=incoming.map(clone);render();status("تعداد "+records.length+" رکورد وارد شد؛ ممیزی و ذخیره پروژه انجام‌پذیر است.");});
 host.querySelectorAll("[data-cfm-edit]").forEach(btn=>btn.addEventListener("click",()=>{$("cfmMemberJson").value=JSON.stringify(records[Number(btn.getAttribute("data-cfm-edit"))],null,2);status("رکورد در ویرایشگر بارگذاری شد.");}));
 host.querySelectorAll("[data-cfm-delete]").forEach(btn=>btn.addEventListener("click",()=>{const i=Number(btn.getAttribute("data-cfm-delete")),id=records[i]?.memberId;records.splice(i,1);render();status("رکورد "+id+" حذف شد.");}));
}
function init(){if($("coldFormedMemberRegistryPanel"))return;const anchor=$("memberDesignInputsPanel");if(!anchor)return;const panel=document.createElement("section");panel.className="panel";panel.id="coldFormedMemberRegistryPanel";panel.setAttribute("data-focus-group","member-design");panel.innerHTML='<div class="panel-title"><h3>پرونده اختصاصی هر لاپه و قید — مقاطع سردنورد</h3><span class="status">شناسه‌محور</span></div><div id="coldFormedMemberRegistryContent"></div>';anchor.insertAdjacentElement("afterend",panel);render();}
function selfTest(){const prior=clone(records),tests=[];records=[{memberId:"P-01",group:"roofPurlin"},{memberId:"G-01",group:"wallGirt"}];tests.push({name:"distinct physical member IDs are retained",pass:getData().records.length===2&&getData().records[0].memberId!==getData().records[1].memberId});setData({schemaVersion:1,records:[{memberId:"P-02",group:"roofPurlin"}]});tests.push({name:"project save/load round trip retains member record",pass:getData().records.length===1&&getData().records[0].memberId==="P-02"});tests.push({name:"incomplete evidence remains blocked without approval",pass:auditRecord(records[0]).success===false});records=prior;render();return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"member-specific persistence and evidence gate only; no resistance design"};}
root.SteelColdFormedMemberRegistry={getData,setData,auditRecord,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
