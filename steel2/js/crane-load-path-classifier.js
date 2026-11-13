/* SAHROUD STEEL — crane load-path classifier
 * Classifies where crane wheel actions belong. It does not calculate wheel loads,
 * analyze the supporting system, or approve a floor slab/runway/foundation design.
 */
(function(root){
"use strict";
const TYPES=["overhead","gantry","floor_rail"];
const SUPPORTS=["runway_girder","slab","grade_beam","independent_foundation"];
const LABELS={overhead:"جرثقیل سقفی",gantry:"جرثقیل دروازه‌ای زمینی",floor_rail:"جرثقیل روی ریل زمینی"};
function classify(input){
 const p=input||{},issues=[],type=String(p.craneType||""),support=String(p.supportSystem||"");
 if(!TYPES.includes(type))issues.push("نوع جرثقیل باید مشخص و معتبر باشد.");
 if(!SUPPORTS.includes(support))issues.push("سیستم تکیه‌گاهی مسیر چرخ باید مشخص شود.");
 if(type==="overhead"&&support!=="runway_girder")issues.push("برای جرثقیل سقفی، بار چرخ باید به ریل و تیر حمال جرثقیل منتقل شود؛ اعمال مستقیم به کف سوله مجاز نیست.");
 if(type==="gantry"&&!["slab","grade_beam","independent_foundation"].includes(support))issues.push("جرثقیل دروازه‌ای زمینی باید روی کف طراحی‌شده، تیر/نوار بتنی یا فونداسیون مستقل تکیه کند.");
 if(type==="floor_rail"&&!["slab","grade_beam","independent_foundation"].includes(support))issues.push("ریل زمینی باید به کف، تیر/نوار بتنی یا فونداسیون مستقل متصل شود.");
 const path=type==="overhead"
  ?["wheel","rail","runway_girder","bracket_or_corbel","column","base_plate_and_anchors","footing","soil"]
  :["wheel","rail",support,"subgrade_or_foundation","soil"];
 const target=type==="overhead"?"crane_runway_and_frame":support==="slab"?"floor_slab":support==="grade_beam"?"ground_beam":"independent_rail_foundation";
 return {valid:issues.length===0,craneType:type,craneLabel:LABELS[type]||"نامشخص",supportSystem:support,loadTarget:issues.length?null:target,loadPath:issues.length?[]:path,excludeFromFloorSlab:type==="overhead",issues,analysisEnabled:false,designApproved:false};
}
function auditCases(cases){
 const rows=Array.isArray(cases)?cases:[],issues=[];
 if(!rows.length)issues.push("حداقل یک تعریف جرثقیل لازم است.");
 const ids=new Set();
 rows.forEach((x,i)=>{const id=String(x?.id||"").trim();if(!id)issues.push("شناسه جرثقیل ردیف "+(i+1)+" خالی است.");else if(ids.has(id))issues.push("شناسه تکراری جرثقیل: "+id);else ids.add(id);
 const r=classify(x);r.issues.forEach(v=>issues.push((id||("ردیف "+(i+1)))+": "+v));});
 return {ready:issues.length===0,items:rows.map(x=>({id:x.id,...classify(x)})),issues,analysisEnabled:false,designApproved:false};
}
function routeWheelActions(crane,inputActions){
 const c=classify(crane),actions=Array.isArray(inputActions)?inputActions:[];
 if(!c.valid)return {success:false,issues:c.issues,actions:[],analysisEnabled:false};
 const invalid=actions.filter(a=>!a||!String(a.id||"").trim()||![a.verticalKN,a.longitudinalKN??0,a.transverseKN??0].every(v=>Number.isFinite(Number(v))));
 if(invalid.length)return {success:false,issues:["هر واکنش چرخ باید شناسه و مؤلفه‌های نیروی عددی معتبر داشته باشد."],actions:[],analysisEnabled:false};
 return {success:true,loadTarget:c.loadTarget,loadPath:c.loadPath,actions:actions.map(a=>({id:String(a.id),target:c.loadTarget,verticalKN:Number(a.verticalKN),longitudinalKN:Number(a.longitudinalKN||0),transverseKN:Number(a.transverseKN||0)})),note:"این فقط برچسب‌گذاری مسیر بار است؛ نیروها به مدل FEM تزریق نشده‌اند.",analysisEnabled:false,designApproved:false};
}
const defaults={id:"CRANE-1",craneType:"overhead",supportSystem:"runway_girder"};
let uiState={...defaults};
function readUI(){return {id:document.getElementById("cranePath_id")?.value||uiState.id,craneType:document.getElementById("cranePath_type")?.value||uiState.craneType,supportSystem:document.getElementById("cranePath_support")?.value||uiState.supportSystem};}
function setData(data){uiState={...defaults,...(data||{})};if(typeof document==="undefined")return;const a=document.getElementById("cranePath_id"),b=document.getElementById("cranePath_type"),c=document.getElementById("cranePath_support");if(a)a.value=uiState.id;if(b)b.value=uiState.craneType;if(c)c.value=uiState.supportSystem;}
function ensurePanel(){
 if(document.getElementById("craneLoadPathPanel"))return;
 const host=document.getElementById("craneReadinessPanel");if(!host)return;
 const p=document.createElement("section");p.className="panel";p.id="craneLoadPathPanel";
 p.innerHTML='<div class="panel-title"><h3>تعیین مسیر انتقال بار چرخ جرثقیل</h3><span class="status">ممیزی مسیر بار</span></div><div class="notice">نوع جرثقیل و تکیه‌گاه مسیر چرخ را انتخاب کنید. این کنترل از اعمال اشتباه بار چرخ جرثقیل سقفی به بتن کف جلوگیری می‌کند؛ به‌تنهایی تحلیل یا تأیید ظرفیت نیست.</div><div class="form-grid"><div class="field"><label for="cranePath_id">شناسه جرثقیل</label><input id="cranePath_id" value="CRANE-1"></div><div class="field"><label for="cranePath_type">نوع جرثقیل</label><select id="cranePath_type"><option value="overhead">سقفی</option><option value="gantry">دروازه‌ای زمینی</option><option value="floor_rail">تجهیز روی ریل زمینی</option></select></div><div class="field"><label for="cranePath_support">سیستم تکیه‌گاهی مسیر چرخ</label><select id="cranePath_support"><option value="runway_girder">ریل و تیر حمال جرثقیل</option><option value="slab">دال کف سوله</option><option value="grade_beam">تیر/نوار بتنی زمینی</option><option value="independent_foundation">فونداسیون مستقل ریل</option></select></div></div><div class="button-grid"><button id="cranePath_audit" class="btn secondary" type="button">ممیزی مسیر انتقال بار</button></div><div id="cranePath_result" class="notice">پیش‌فرض: جرثقیل سقفی؛ بار چرخ به تیر حمال و قاب منتقل می‌شود.</div>';
 host.insertAdjacentElement("afterend",p);setData(uiState);
 p.querySelectorAll("input,select").forEach(e=>e.addEventListener("change",()=>{uiState=readUI();root.dispatchEvent(new CustomEvent("sahroud-crane-load-path-change",{detail:uiState}));}));
 document.getElementById("cranePath_audit").addEventListener("click",()=>{const r=classify(readUI());document.getElementById("cranePath_result").textContent=(r.valid?"مسیر معتبر برای بررسی بعدی: ":"مسیر نامعتبر: ")+ (r.valid?r.loadPath.join(" ← "):r.issues.join(" | "));});
}
function selfTest(){
 const tests=[],test=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 test("overhead crane routes to runway girder",()=>classify({craneType:"overhead",supportSystem:"runway_girder"}).loadTarget==="crane_runway_and_frame");
 test("overhead crane rejected on floor slab",()=>!classify({craneType:"overhead",supportSystem:"slab"}).valid);
 test("overhead load path includes columns and footing",()=>{const r=classify({craneType:"overhead",supportSystem:"runway_girder"});return r.loadPath.includes("column")&&r.loadPath.includes("footing");});
 test("gantry crane may use designed slab",()=>classify({craneType:"gantry",supportSystem:"slab"}).valid);
 test("gantry crane may use independent foundation",()=>classify({craneType:"gantry",supportSystem:"independent_foundation"}).valid);
 test("floor rail may use ground beam",()=>classify({craneType:"floor_rail",supportSystem:"grade_beam"}).valid);
 test("unsupported type rejected",()=>!classify({craneType:"unknown",supportSystem:"slab"}).valid);
 test("missing support rejected",()=>!classify({craneType:"floor_rail"}).valid);
 test("duplicate crane identifiers rejected",()=>!auditCases([{id:"C1",craneType:"overhead",supportSystem:"runway_girder"},{id:"C1",craneType:"gantry",supportSystem:"slab"}]).ready);
 test("wheel actions routed without changing force values",()=>{const r=routeWheelActions({craneType:"gantry",supportSystem:"slab"},[{id:"W1",verticalKN:42,longitudinalKN:3,transverseKN:2}]);return r.success&&r.actions[0].verticalKN===42&&r.actions[0].target==="floor_slab";});
 test("invalid wheel action blocked",()=>!routeWheelActions({craneType:"overhead",supportSystem:"runway_girder"},[{id:"W1",verticalKN:"bad"}]).success);
 test("classification never enables analysis or approval",()=>{const r=classify({craneType:"overhead",supportSystem:"runway_girder"});return !r.analysisEnabled&&!r.designApproved;});
 test("crane selector state round-trips",()=>{setData({id:"CR-02",craneType:"gantry",supportSystem:"independent_foundation"});const x=getData();return x.id==="CR-02"&&x.craneType==="gantry"&&x.supportSystem==="independent_foundation";});
 test("missing saved crane settings restore safe overhead defaults",()=>{setData({});const x=getData();return x.craneType==="overhead"&&x.supportSystem==="runway_girder";});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,designApproved:false,note:"Classification and routing software tests only; no wheel-load calculation, FEM transfer, or engineering approval."};
}
root.SteelCraneLoadPath={classify,auditCases,routeWheelActions,readUI,getData:()=>({...uiState}),setData,ensurePanel,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
})(typeof window!=="undefined"?window:globalThis);
