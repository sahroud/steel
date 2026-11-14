/* SAHROUD STEEL — brace-end connection geometry and documentation readiness.
 * Captures connection-specific geometry only. No Whitmore, bolt, weld, block-shear,
 * bearing, tear-out, gusset buckling, or connection resistance is calculated here.
 */
(function(root){
"use strict";
const GROUPS=new Set(["roofBrace","wallBrace"]);
const COMMON=[
 ["plateThicknessMm","ضخامت گاست‌پلیت (mm)"],["connectedThicknessMm","ضخامت عضو متصل (mm)"],
 ["whitmoreWidthMm","عرض Whitmore مستند از نقشه (mm)"],
 ["grossShearAreaMm2","سطح ناخالص مسیر برشی Agv (mm²)"],
 ["netShearAreaMm2","سطح خالص مسیر برشی Anv (mm²)"],
 ["netTensionAreaMm2","سطح خالص مسیر کششی Ant (mm²)"],
 ["eccentricityMm","خروج از مرکزیت اتصال (mm)"],
 ["plateFyMPa","تنش تسلیم ورق گاست Fy (MPa)"],["plateFuMPa","تنش نهایی ورق گاست Fu (MPa)"],["blockShearUbs","ضریب Ubs بلوکی (فقط 0.5 یا 1)"]
];
const BOLTED=[
 ["boltCount","تعداد پیچ"],["boltDiameterMm","قطر اسمی پیچ (mm)"],["holeDiameterMm","قطر سوراخ (mm)"],["boltAbMm2","سطح اسمی بدنه پیچ Ab (mm²)"],["boltFntMPa","Fnt پیچ (MPa)"],["boltFnvMPa","Fnv پیچ (MPa)"],["connectedFuMPa","Fu ورق متصل (MPa)"],["boltHoleType","نوع سوراخ (فعلاً standard)"],["deformationAtServiceLoad","تغییرشکل سوراخ در سرویس: yes/no"],["boltCaseDemandsJson","توزیع نیروهای هر پیچ در هر ترکیب (JSON)"],
 ["edgeDistanceMm","فاصله لبه (mm)"],["pitchMm","گام پیچ (mm)"],["gageMm","فاصله ردیف‌ها (mm)"],
 ["shearPlaneCount","تعداد صفحات برش"],["boltGrade","گرید/رده پیچ"]
];
const WELDED=[
 ["weldCount","تعداد خطوط/قطعات جوش"],["weldSizeMm","اندازه جوش (mm)"],
 ["weldEffectiveLengthMm","طول مؤثر جوش (mm)"],["electrodeFexxMPa","مقاومت Fexx الکترود (MPa)"],["baseMetalFyMPa","Fy فلز پایه جوش (MPa)"],["baseMetalFuMPa","Fu فلز پایه جوش (MPa)"],["weldCaseDemandsJson","نیروی هر قطعه جوش و مساحت‌های فلز پایه (JSON)"]
];
const BOOLS=["loadPathReviewed","blockShearGeometryReviewed","whitmoreGeometryReviewed","connectionDrawingReviewed"];
const TEXT_FIELDS=new Set(["boltGrade","boltHoleType","deformationAtServiceLoad","boltCaseDemandsJson","weldLayoutReference","weldCaseDemandsJson"]);
let data={schemaVersion:1,connections:[]};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=(id,end)=>String(id)+"::"+end;
function numberOrNull(v){if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function normalize(value){
 const rows=Array.isArray(value?.connections)?value.connections:[];
 return {schemaVersion:1,connections:rows.map(r=>{
  const x={memberId:String(r?.memberId??""),end:r?.end==="J"?"J":"I",connectionType:["bolted","welded"].includes(r?.connectionType)?r.connectionType:"",drawingReference:String(r?.drawingReference??"")};
  [...COMMON.map(a=>a[0]),...BOLTED.map(a=>a[0]),...WELDED.map(a=>a[0])].filter(k=>!TEXT_FIELDS.has(k)).forEach(k=>x[k]=numberOrNull(r?.[k]));
  TEXT_FIELDS.forEach(k=>x[k]=String(r?.[k]??""));
  x.boltGrade=String(r?.boltGrade??"");x.weldLayoutReference=String(r?.weldLayoutReference??"");
  BOOLS.forEach(k=>x[k]=r?.[k]===true);
  x.threadsInShearPlane=[true,false].includes(r?.threadsInShearPlane)?r.threadsInShearPlane:null;
  return x;
 })};
}
function getData(){return JSON.parse(JSON.stringify(data));}
function setData(v){data=normalize(v);render();}
function currentBraceMembers(model){
 const m=model||root.SteelStructuralModel?.getData?.();
 return Array.isArray(m?.members)?m.members.filter(x=>GROUPS.has(x.sectionKey)&&String(x.id??"").trim()):[];
}
function blank(memberId,end){return {memberId:String(memberId),end,connectionType:"",drawingReference:"",plateThicknessMm:null,connectedThicknessMm:null,whitmoreWidthMm:null,grossShearAreaMm2:null,netShearAreaMm2:null,netTensionAreaMm2:null,eccentricityMm:null,plateFyMPa:null,plateFuMPa:null,blockShearUbs:null,boltCount:null,boltDiameterMm:null,holeDiameterMm:null,boltAbMm2:null,boltFntMPa:null,boltFnvMPa:null,connectedFuMPa:null,boltHoleType:"",deformationAtServiceLoad:"",boltCaseDemandsJson:"",edgeDistanceMm:null,pitchMm:null,gageMm:null,shearPlaneCount:null,boltGrade:"",threadsInShearPlane:null,weldCount:null,weldSizeMm:null,weldEffectiveLengthMm:null,electrodeFexxMPa:null,baseMetalFyMPa:null,baseMetalFuMPa:null,weldCaseDemandsJson:"",weldLayoutReference:"",loadPathReviewed:false,blockShearGeometryReviewed:false,whitmoreGeometryReviewed:false,connectionDrawingReviewed:false};}
function rowsForModel(model){
 const rows=new Map(data.connections.map(r=>[key(r.memberId,r.end),r]));
 return currentBraceMembers(model).flatMap(m=>["I","J"].map(end=>rows.get(key(m.id,end))||blank(m.id,end)));
}
function audit(input,model){
 const src=normalize(input||data),members=currentBraceMembers(model),issues=[],warnings=[],rows=[],expected=new Set();
 const memberIds=new Set();
 members.forEach(m=>{const id=String(m.id);if(memberIds.has(id))issues.push("شناسه عضو مهاربند تکراری است: "+id);memberIds.add(id);["I","J"].forEach(end=>expected.add(key(id,end)));});
 const seen=new Set();
 src.connections.forEach((c,i)=>{
  const k=key(c.memberId,c.end),local=[];
  if(!c.memberId.trim())local.push("شناسه عضو خالی است.");
  if(!["I","J"].includes(c.end))local.push("انتهای اتصال باید I یا J باشد.");
  if(seen.has(k))local.push("برای این عضو و انتها بیش از یک رکورد اتصال ثبت شده است.");
  seen.add(k);
  if(!expected.has(k))local.push("این اتصال به مهاربند فعال مدل جاری تعلق ندارد یا شناسه آن تغییر کرده است.");
  if(!["bolted","welded"].includes(c.connectionType))local.push("نوع اتصال پیچی یا جوشی مشخص نشده است.");
  if(!c.drawingReference.trim())local.push("شماره نقشه/جزئیات اجرایی اتصال ثبت نشده است.");
  for(const [field,label] of COMMON){if(field==="eccentricityMm"){if(!Number.isFinite(c[field])||c[field]<0)local.push(label+" باید از نقشه وارد شود و غیرمنفی باشد.");}else if(!Number.isFinite(c[field])||c[field]<=0)local.push(label+" باید از نقشه وارد شود.");}
  if(c.netShearAreaMm2>0&&c.grossShearAreaMm2>0&&c.netShearAreaMm2>c.grossShearAreaMm2)local.push("سطح خالص برشی از سطح ناخالص برشی بزرگ‌تر است.");
  if(![0.5,1].includes(c.blockShearUbs))local.push("Ubs باید با توزیع تنش مستند و فقط برابر 0.5 یا 1 باشد.");
  if(!c.loadPathReviewed)local.push("مسیر انتقال نیرو از عضو به گاست‌پلیت و تکیه‌گاه بازبینی نشده است.");
  if(!c.whitmoreGeometryReviewed)local.push("هندسه و عرض Whitmore از نقشه/محاسبه مستند بازبینی نشده است.");
  if(!c.blockShearGeometryReviewed)local.push("مسیرهای سطح گسیختگی بلوکی و مساحت‌های مربوط بازبینی نشده‌اند.");
  if(!c.connectionDrawingReviewed)local.push("نقشه جزئیات اتصال و تطبیق با مدل تأیید نشده است.");
  if(c.connectionType==="bolted"){
   for(const [field,label] of BOLTED){if(TEXT_FIELDS.has(field)?!String(c[field]||"").trim():!(Number.isFinite(c[field])&&c[field]>0))local.push(label+" برای اتصال پیچی لازم است.");}
   ["boltCount","shearPlaneCount"].forEach(k=>{if(Number.isFinite(c[k])&&!Number.isInteger(c[k]))local.push(k+" باید عدد صحیح باشد.");});
   if(c.boltDiameterMm>0&&c.holeDiameterMm>0&&c.holeDiameterMm<c.boltDiameterMm)local.push("قطر سوراخ از قطر پیچ کوچک‌تر ثبت شده است؛ ورودی بازبینی شود.");
   if(c.threadsInShearPlane===null)local.push("وضعیت قرارگیری رزوه در صفحه برش مشخص نشده است.");
  }
  if(c.connectionType==="welded"){
   for(const [field,label] of WELDED)if(TEXT_FIELDS.has(field)?!String(c[field]||"").trim():!(Number.isFinite(c[field])&&c[field]>0))local.push(label+" برای اتصال جوشی لازم است.");
   if(Number.isFinite(c.weldCount)&&!Number.isInteger(c.weldCount))local.push("تعداد خطوط/قطعات جوش باید عدد صحیح باشد.");
   if(!String(c.weldLayoutReference||"").trim())local.push("آرایش و طول‌بندی جوش باید با شماره نقشه/مدرک مشخص شود.");
  }
  const row={memberId:c.memberId,end:c.end,connectionType:c.connectionType,complete:local.length===0,issues:local};
  rows.push(row);local.forEach(x=>issues.push(c.memberId+" / "+c.end+": "+x));
 });
 expected.forEach(k=>{if(!seen.has(k))issues.push("اتصال انتهای "+k.replace("::"," / ")+" در ورودی‌ها ثبت نشده است.");});
 if(!members.length)warnings.push("در مدل جاری مهاربند سقف/دیوار شناسایی نشد؛ ابتدا مدل سه‌بعدی را بسازید.");
 return {schemaVersion:1,ready:issues.length===0&&members.length>0,braceMemberCount:members.length,expectedConnectionCount:expected.size,recordCount:src.connections.length,rows,issues,warnings,scope:"connection geometry/documentation readiness only",analysisEnabled:false,designApproved:false,limitations:["ظرفیت پیچ، برش/کشش پیچ، bearing، tear-out، لغزش و اثر رزوه محاسبه نشده است.","ظرفیت جوش، فلز جوش و فلز پایه محاسبه نشده است.","گاست‌پلیت: تسلیم، گسیختگی، کمانش، Whitmore yielding/rupture و block shear محاسبه نشده‌اند.","هیچ ضریب یا حداقل فاصله آیین‌نامه‌ای در این ممیزی فرض نشده؛ مقادیر باید از نقشه و متن معتبر ضابطه استخراج شوند."]};
}
function render(){
 const host=$("braceConnectionReadinessContent");if(!host)return;
 const rows=rowsForModel(),fields=[...COMMON,...BOLTED,...WELDED];
 host.innerHTML='<div class="notice">برای هر مهاربند، اتصال انتهای I و J جداگانه ثبت شود. همه مقادیر از نقشه مصوب/جزئیات واقعی برداشت شوند؛ این صفحه ظرفیت یا قبولی اتصال را محاسبه نمی‌کند.</div><div style="overflow-x:auto"><table class="data-table" style="min-width:1700px;width:100%"><thead><tr><th>عضو</th><th>انتها</th><th>نوع اتصال</th>'+fields.map(x=>'<th>'+x[1]+'</th>').join("")+'<th>رزوه در صفحه برش</th><th>مرجع آرایش جوش</th><th>مرجع نقشه</th>'+BOOLS.map(k=>'<th>'+({loadPathReviewed:"مسیر نیرو",blockShearGeometryReviewed:"مسیر بلوکی",whitmoreGeometryReviewed:"Whitmore",connectionDrawingReviewed:"تطبیق نقشه"}[k])+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.memberId)+'</td><td>'+r.end+'</td><td><select data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="connectionType"><option value="">انتخاب</option><option value="bolted" '+(r.connectionType==="bolted"?"selected":"")+'>پیچی</option><option value="welded" '+(r.connectionType==="welded"?"selected":"")+'>جوشی</option></select></td>'+fields.map(([k])=>'<td><input data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="'+k+'" '+(TEXT_FIELDS.has(k)?"type=text":"type=number step=any")+' value="'+esc(r[k]??"")+'" style="width:'+(k.includes('Json')?260:TEXT_FIELDS.has(k)?130:100)+'px"></td>').join("")+'<td><select data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="threadsInShearPlane"><option value="">نامشخص</option><option value="true" '+(r.threadsInShearPlane===true?"selected":"")+'>بله</option><option value="false" '+(r.threadsInShearPlane===false?"selected":"")+'>خیر</option></select></td><td><input data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="weldLayoutReference" value="'+esc(r.weldLayoutReference)+'"></td><td><input data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="drawingReference" value="'+esc(r.drawingReference)+'"></td>'+BOOLS.map(k=>'<td><input type="checkbox" data-id="'+esc(r.memberId)+'" data-end="'+r.end+'" data-field="'+k+'" '+(r[k]?"checked":"")+'></td>').join("")+'</tr>').join("")+'</tbody></table></div><div class="button-grid"><button type="button" class="btn secondary" id="btnBraceConnectionRefresh">به‌روزرسانی اعضا از مدل</button><button type="button" class="btn secondary" id="btnBraceConnectionAudit">ممیزی اتصالات دو انتهای مهاربندها</button></div><div id="braceConnectionResult" class="notice">برای هر ترکیب، JSON توزیع نیروی هر پیچ/قطعه جوش را وارد کنید. مثال پیچ: {"ULS-1":[{"transferN":10000,"tensionN":2000,"shearPerPlaneN":8000,"clearDistanceMm":30}]}. مثال جوش: {"ULS-1":[{"transferN":10000,"shearN":10000,"effectiveLengthMm":100,"baseGrossShearAreaMm2":500,"baseNetShearAreaMm2":450}]}. مجموع transferN باید با تقاضای FEM همان انتها برابر باشد. ابتدا مدل سه‌بعدی را بسازید.</div>';
 host.querySelectorAll("[data-field]").forEach(el=>el.addEventListener("change",()=>{const id=el.dataset.id,end=el.dataset.end,field=el.dataset.field;let r=data.connections.find(x=>x.memberId===id&&x.end===end);if(!r){r=blank(id,end);data.connections.push(r);}if(el.type==="checkbox")r[field]=el.checked;else if(field==="threadsInShearPlane")r[field]=el.value===""?null:el.value==="true";else if(["boltGrade","weldLayoutReference","drawingReference","connectionType"].includes(field))r[field]=el.value;else r[field]=numberOrNull(el.value);}));
 $("btnBraceConnectionRefresh").addEventListener("click",()=>render());
 $("btnBraceConnectionAudit").addEventListener("click",()=>{const r=audit(data);const out=$("braceConnectionResult");out.innerHTML='<strong>'+(r.ready?"تمام اتصال‌های دو انتهای مهاربندها دارای داده‌های موردنیاز این ممیزی هستند.":"ممیزی اتصال ناقص است.")+'</strong><p>اعضای مهاربند: '+r.braceMemberCount+' | اتصالات مورد انتظار: '+r.expectedConnectionCount+' | رکوردهای ثبت‌شده: '+r.recordCount+'</p>'+(r.issues.length?'<ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+'<p>هیچ ظرفیت یا تأیید طراحی صادر نشده است.</p>';});
}
function init(){if($("braceConnectionReadinessPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="braceConnectionReadinessPanel";p.innerHTML="<div class='panel-title'><h3>جزئیات اتصالات مهاربندها — گاست‌پلیت، پیچ و جوش</h3><span class='status'>ممیزی هندسه و مدارک</span></div><div id='braceConnectionReadinessContent'></div>";const anchor=$("tensionDesignReadinessPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);render();}
function selfTest(){
 const base={memberId:"B1",end:"I",connectionType:"bolted",drawingReference:"D-01",plateThicknessMm:10,connectedThicknessMm:8,whitmoreWidthMm:150,grossShearAreaMm2:1500,netShearAreaMm2:1200,netTensionAreaMm2:600,eccentricityMm:0,plateFyMPa:235,plateFuMPa:360,blockShearUbs:1,boltCount:4,boltDiameterMm:20,holeDiameterMm:22,edgeDistanceMm:35,pitchMm:60,gageMm:50,shearPlaneCount:1,boltGrade:"8.8",threadsInShearPlane:false,loadPathReviewed:true,blockShearGeometryReviewed:true,whitmoreGeometryReviewed:true,connectionDrawingReviewed:true};
 const model={members:[{id:"B1",sectionKey:"roofBrace"}]},both=[{...base,end:"I"},{...base,end:"J"}],tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("accepts complete two-end bolted connection records as data-ready only",()=>{const r=audit({connections:both},model);return r.ready&&r.expectedConnectionCount===2&&r.designApproved===false&&r.analysisEnabled===false;});
 t("requires both brace ends",()=>!audit({connections:[both[0]]},model).ready);
 t("rejects duplicate member-end records",()=>!audit({connections:[...both,{...base,end:"I"}]},model).ready);
 t("rejects connection record for non-model member",()=>!audit({connections:[...both,{...base,memberId:"OLD",end:"I"}]},model).ready);
 t("requires drawing reference",()=>!audit({connections:both.map(x=>({...x,drawingReference:""}))},model).ready);
 t("requires Whitmore width and documented review",()=>!audit({connections:both.map(x=>({...x,whitmoreWidthMm:null,whitmoreGeometryReviewed:false}))},model).ready);
 t("rejects net shear area above gross shear area",()=>!audit({connections:both.map(x=>({...x,netShearAreaMm2:1600}))},model).ready);
 t("requires block shear geometry review",()=>!audit({connections:both.map(x=>({...x,blockShearGeometryReviewed:false}))},model).ready);
 t("requires explicit load path review",()=>!audit({connections:both.map(x=>({...x,loadPathReviewed:false}))},model).ready);
 t("requires bolted geometry and bolt grade",()=>!audit({connections:both.map(x=>({...x,boltGrade:"",holeDiameterMm:null}))},model).ready);
 t("rejects hole smaller than bolt diameter",()=>!audit({connections:both.map(x=>({...x,holeDiameterMm:18}))},model).ready);
 t("requires threads-in-shear-plane declaration",()=>!audit({connections:both.map(x=>({...x,threadsInShearPlane:null}))},model).ready);
 t("requires welded size length and electrode strength",()=>{const r=audit({connections:both.map(x=>({...x,connectionType:"welded",weldCount:2,weldSizeMm:6,weldEffectiveLengthMm:120,electrodeFexxMPa:490,weldLayoutReference:"W-02"}))},model);return r.ready;});
 t("requires welded layout reference",()=>!audit({connections:both.map(x=>({...x,connectionType:"welded",weldCount:2,weldSizeMm:6,weldEffectiveLengthMm:120,electrodeFexxMPa:490,weldLayoutReference:""}))},model).ready);
 t("rejects missing eccentricity",()=>!audit({connections:both.map(x=>({...x,eccentricityMm:null}))},model).ready);
 t("requires explicit plate material strengths and block-shear Ubs",()=>!audit({connections:both.map(x=>({...x,plateFyMPa:null,plateFuMPa:null,blockShearUbs:null}))},model).ready);
 t("rejects unsupported block-shear Ubs",()=>!audit({connections:both.map(x=>({...x,plateFyMPa:235,plateFuMPa:360,blockShearUbs:0.75}))},model).ready);
 t("never issues capacity or approval",()=>{const r=audit({connections:both},model);return r.analysisEnabled===false&&r.designApproved===false&&!r.capacity;});
 t("connection records survive project data round-trip",()=>{const old=getData();setData({connections:both});const x=getData(),ok=x.connections.length===2&&x.connections[0].memberId==="B1"&&x.connections[1].end==="J";setData(old);return ok;});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"brace-end connection geometry and document completeness only; no code resistance calculation"};
}
root.SteelBraceConnectionReadiness={getData,setData,readUI:getData,audit,render,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
