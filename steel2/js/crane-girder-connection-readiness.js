/* SAHROUD STEEL — runway-girder connection evidence/readiness audit.
 * Captures connection geometry and fabrication records; does not calculate capacity.
 */
(function(root){
"use strict";
function audit(data){
 const rows=[],issues=[],items=Array.isArray(data)?data:(Array.isArray(data?.connections)?data.connections:[]);
 if(!items.length)issues.push("حداقل یک اتصال تیر حمال باید تعریف شود.");
 items.forEach((c,i)=>{
  const id=String(c.id||("connection-"+(i+1))),before=issues.length;
  ["connectionType","detailSource","forceSource","connectedPartGrade","connectedPartThickness_mm","plateThickness_mm","loadPathDescription"].forEach(k=>{if(c[k]===undefined||c[k]===null||String(c[k]).trim()==="")issues.push(id+": "+k+" الزامی است.");});
  if(!["welded","bolted","mixed"].includes(c.connectionType))issues.push(id+": نوع اتصال نامعتبر است.");
  ["connectedPartThickness_mm","plateThickness_mm"].forEach(k=>{if(!(Number.isFinite(Number(c[k]))&&Number(c[k])>0))issues.push(id+": "+k+" باید مثبت باشد.");});
  if(["welded","mixed"].includes(c.connectionType)){
   ["weldType","weldSize_mm","electrodeGrade","weldingProcedure","inspectionRecord"].forEach(k=>{if(c[k]===undefined||c[k]===null||String(c[k]).trim()==="")issues.push(id+": "+k+" برای اتصال جوشی الزامی است.");});
   if(!(Number(c.weldSize_mm)>0))issues.push(id+": اندازه جوش باید مثبت باشد.");
  }
  if(["bolted","mixed"].includes(c.connectionType)){
   ["boltDiameter_mm","boltGrade","holeType","edgeDistance_mm","pitch_mm","boltCount","boltArrangementSource"].forEach(k=>{if(c[k]===undefined||c[k]===null||String(c[k]).trim()==="")issues.push(id+": "+k+" برای اتصال پیچی الزامی است.");});
   ["boltDiameter_mm","edgeDistance_mm","pitch_mm","boltCount"].forEach(k=>{if(!(Number.isFinite(Number(c[k]))&&Number(c[k])>0))issues.push(id+": "+k+" باید مثبت باشد.");});
   if(!["standard","oversized","short-slot","long-slot"].includes(c.holeType))issues.push(id+": نوع سوراخ پیچ نامعتبر است.");
   if(c.slipCritical===true&&!String(c.fayingSurfaceClass||"").trim())issues.push(id+": کلاس سطح تماس اتصال لغزش‌بحرانی باید مستند شود.");
  }
  rows.push({id,connectionType:c.connectionType||null,evidenceComplete:issues.length===before,detailSource:c.detailSource||null,forceSource:c.forceSource||null,capacity:null,utilization:null});
 });
 const ready=issues.length===0&&rows.length===items.length;
 return {success:ready,readiness:ready?"evidence-complete":"incomplete",analysisEnabled:false,designApproved:false,connectionCount:items.length,checkedCount:rows.length,issues,results:rows,limitations:["این ممیزی فقط هندسه، مسیر بار و مدارک ساخت/بازرسی اتصال را کنترل می‌کند؛ مقاومت جوش، پیچ، لهیدگی، پارگی بلوکی، لغزش، خستگی یا ظرفیت صفحه محاسبه نمی‌شود.","بارهای طراحی باید از تحلیل قاب و حالات بار هم‌زمان معتبر استخراج و به هر اتصال تخصیص داده شوند.","طراحی اتصال باید با نسخه رسمی آیین‌نامه، خواص مصالح/الکترود/پیچ، جزئیات اجرایی و الزامات بازرسی توسط مهندس مسئول انجام شود."]};
}
function auditConnectionDemand(data){
 const rows=Array.isArray(data)?data:(Array.isArray(data?.demands)?data.demands:[]),issues=[],out=[],seen=new Set();
 if(!rows.length)issues.push("حداقل یک رکورد تقاضای اتصال لازم است.");
 rows.forEach((d,i)=>{
  const id=String(d.connectionId||("demand-"+(i+1))),key=id+"|"+String(d.caseId||"");
  const before=issues.length;
  if(!String(d.connectionId||"").trim())issues.push(id+": شناسه اتصال الزامی است.");
  if(!String(d.caseId||"").trim())issues.push(id+": شناسه حالت بار الزامی است.");
  if(seen.has(key))issues.push(id+": رکورد تقاضای تکراری برای همین حالت بار وجود دارد.");seen.add(key);
  if(!String(d.source||"").trim()||!String(d.document||"").trim())issues.push(id+": منبع و سند تقاضای اتصال الزامی است.");
  const F=d.force_N,M=d.moment_Nm,r=d.eccentricity_m;
  if(!Array.isArray(F)||F.length!==3||F.some(x=>!Number.isFinite(Number(x))))issues.push(id+": بردار نیرو باید سه مؤلفه محدود بر حسب N داشته باشد.");
  if(!Array.isArray(M)||M.length!==3||M.some(x=>!Number.isFinite(Number(x))))issues.push(id+": بردار لنگر باید سه مؤلفه محدود بر حسب N.m داشته باشد.");
  if(!Array.isArray(r)||r.length!==3||r.some(x=>!Number.isFinite(Number(x))))issues.push(id+": خروج از مرکزیت باید سه مؤلفه محدود بر حسب متر داشته باشد.");
  let transferred=null;
  if(Array.isArray(F)&&F.length===3&&F.every(x=>Number.isFinite(Number(x)))&&Array.isArray(M)&&M.length===3&&M.every(x=>Number.isFinite(Number(x)))&&Array.isArray(r)&&r.length===3&&r.every(x=>Number.isFinite(Number(x)))){
   const f=F.map(Number),m=M.map(Number),e=r.map(Number);
   const cross=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]];
   transferred=m.map((x,j)=>x+cross[j]);
  }
  out.push({connectionId:id,caseId:String(d.caseId||""),force_N:Array.isArray(F)?F:null,appliedMomentAtReference_Nm:transferred,complete:issues.length===before});
 });
 return {success:issues.length===0&&out.every(x=>x.complete),analysisEnabled:false,designApproved:false,demands:out,issues,limitations:["این پل فقط نیروی اتصال و لنگر انتقال‌یافته به نقطه مرجع را با رابطه M_ref=M_connection+r×F ثبت می‌کند.","هیچ ظرفیت جوش، پیچ، صفحه، براکت، ستون یا مقاومت موضعی محاسبه نمی‌شود.","قرارداد محور، علامت، واحد و نقطه مرجع باید از مدل سه‌بعدی و نقشه اتصال تأیید شود."]};
}
function readUI(){const e=root.document?.getElementById?.("craneConnectionJson");if(!e||!String(e.value||"").trim())return [];try{return JSON.parse(e.value);}catch(x){return {parseError:String(x.message||x)};}}
function run(){const p=readUI(),r=p.parseError?{success:false,issues:[p.parseError]}:audit(p),h=root.document?.getElementById?.("craneConnectionResult");if(h)h.textContent=JSON.stringify(r,null,2);return r;}
function mount(){const d=root.document;if(!d||d.getElementById("craneConnectionPanel"))return;const main=d.querySelector("main");if(!main)return;const p=d.createElement("section");p.className="panel";p.id="craneConnectionPanel";p.innerHTML='<div class="panel-title"><h3>ممیزی مدارک اتصالات تیر حمال و براکت</h3><span class="status">جوش و پیچ</span></div><div class="notice">برای هر اتصال، مسیر بار، نقشه، نیروهای طراحی و جزئیات جوش/پیچ را وارد کنید. این بخش فقط شواهد را کنترل می‌کند و ظرفیت اتصال را محاسبه نمی‌کند.</div><div class="field"><label for="craneConnectionJson">فهرست اتصالات (JSON array)</label><textarea id="craneConnectionJson" rows="10" placeholder="[{ &quot;id&quot;:&quot;BR-1&quot;, &quot;connectionType&quot;:&quot;welded&quot;, &quot;detailSource&quot;:&quot;DWG-1&quot;, &quot;forceSource&quot;:&quot;LC-1&quot;, &quot;connectedPartGrade&quot;:&quot;ST37&quot;, &quot;connectedPartThickness_mm&quot;:12, &quot;plateThickness_mm&quot;:16, &quot;loadPathDescription&quot;:&quot;...&quot;, &quot;weldType&quot;:&quot;fillet&quot;, &quot;weldSize_mm&quot;:8, &quot;electrodeGrade&quot;:&quot;...&quot;, &quot;weldingProcedure&quot;:&quot;WPS-1&quot;, &quot;inspectionRecord&quot;:&quot;ITP-1&quot; }]"></textarea></div><button class="btn primary" id="craneConnectionRun" type="button">ممیزی مدارک اتصالات</button><pre id="craneConnectionResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';const a=d.getElementById("craneFatiguePanel");if(a)a.insertAdjacentElement("afterend",p);else main.appendChild(p);d.getElementById("craneConnectionRun").addEventListener("click",run);}
function selfTest(){const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e)});}};const welded={id:"W1",connectionType:"welded",detailSource:"DWG-1",forceSource:"LC-1",connectedPartGrade:"ST37",connectedPartThickness_mm:12,plateThickness_mm:16,loadPathDescription:"bracket to girder",weldType:"fillet",weldSize_mm:8,electrodeGrade:"E70",weldingProcedure:"WPS-1",inspectionRecord:"ITP-1"};const bolted={id:"B1",connectionType:"bolted",detailSource:"DWG-2",forceSource:"LC-2",connectedPartGrade:"ST37",connectedPartThickness_mm:12,plateThickness_mm:16,loadPathDescription:"end plate",boltDiameter_mm:20,boltGrade:"8.8",holeType:"standard",edgeDistance_mm:40,pitch_mm:60,boltCount:4,boltArrangementSource:"DWG-2",slipCritical:true,fayingSurfaceClass:"Class A"};t("accepts complete welded evidence",()=>audit([welded]).success);t("accepts complete bolted evidence",()=>audit([bolted]).success);t("accepts mixed connection with both detail sets",()=>audit([{...welded,...bolted,id:"M1",connectionType:"mixed"}]).success);t("rejects missing load path",()=>!audit([{...welded,loadPathDescription:""}]).success);t("rejects missing weld procedure",()=>!audit([{...welded,weldingProcedure:""}]).success);t("rejects nonpositive weld size",()=>!audit([{...welded,weldSize_mm:0}]).success);t("rejects missing bolt grade",()=>!audit([{...bolted,boltGrade:""}]).success);t("rejects invalid hole type",()=>!audit([{...bolted,holeType:"oval"}]).success);t("requires faying surface for slip-critical bolts",()=>!audit([{...bolted,fayingSurfaceClass:""}]).success);t("does not produce capacity or design approval",()=>{const r=audit([welded]);return r.analysisEnabled===false&&!r.designApproved&&r.results[0].capacity===null&&r.results[0].utilization===null;});t("connection demand preserves six-component force path and eccentricity moment",()=>{const r=auditConnectionDemand([{connectionId:"BR1",caseId:"LC1",force_N:[0,1000,0],moment_Nm:[10,0,0],eccentricity_m:[0,0.2,0],source:"frame model",document:"RPT-1"}]);return r.success&&r.demands[0].appliedMomentAtReference_Nm[2]===-200;});t("connection demand rejects missing source or eccentricity",()=>!auditConnectionDemand([{connectionId:"BR1",caseId:"LC1",force_N:[0,1,0],moment_Nm:[0,0,0],eccentricity_m:[0,0,0]}]).success);t("connection demand rejects duplicate case records",()=>!auditConnectionDemand([{connectionId:"BR1",caseId:"LC1",force_N:[0,1,0],moment_Nm:[0,0,0],eccentricity_m:[0,0,0],source:"s",document:"d"},{connectionId:"BR1",caseId:"LC1",force_N:[0,1,0],moment_Nm:[0,0,0],eccentricity_m:[0,0,0],source:"s",document:"d"}]).success);return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false};}
root.SteelCraneConnectionReadiness={audit,auditConnectionDemand,readUI,run,selfTest};if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
