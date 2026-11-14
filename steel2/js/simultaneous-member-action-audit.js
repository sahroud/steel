/* SAHROUD STEEL — simultaneous member action audit.
 * Demand provenance only: preserves each exact load case and both member ends.
 * No resistance equations or code approval are produced by this module.
 */
(function(root){
"use strict";
const COMPONENTS=["N","Vy","Vz","T","My","Mz"];
const EPS=1e-9;
function finiteVector(values){
 return Array.isArray(values)&&values.length===12&&values.every(v=>Number.isFinite(Number(v)));
}
function endRecord(v,offset){
 return {N:Number(v[offset]),Vy:Number(v[offset+1]),Vz:Number(v[offset+2]),T:Number(v[offset+3]),My:Number(v[offset+4]),Mz:Number(v[offset+5])};
}
function nonzeroActions(e){return COMPONENTS.filter(k=>Math.abs(e[k])>EPS);}
function audit(forceResult){
 const issues=[],warnings=[],rows=[];
 const members=Array.isArray(forceResult?.members)?forceResult.members:[];
 const cases=Array.isArray(forceResult?.cases)?forceResult.cases:[];
 if(!members.length)issues.push("گزارش عضو/نیرو خالی است.");
 if(!cases.length)warnings.push("فهرست مرجع ترکیبات بار در گزارش موجود نیست؛ پوشش ترکیبات مستقل قابل اثبات نیست.");
 const ids=new Set();
 members.forEach(m=>{
  const id=String(m?.id||"");
  if(!id)issues.push("عضوی بدون شناسه یکتا در گزارش وجود دارد.");
  if(ids.has(id))issues.push("شناسه عضو تکراری است: "+id);
  ids.add(id);
  const entries=Array.isArray(m?.ends)?m.ends:[];
  if(!entries.length){issues.push("برای عضو "+(id||"بدون شناسه")+" هیچ بردار نیروی انتهایی ثبت نشده است.");return;}
  const labels=new Set();
  entries.forEach(entry=>{
   const label=String(entry?.label||"");
   if(!label)issues.push("برچسب ترکیب بار برای عضو "+id+" خالی است.");
   if(labels.has(label))issues.push("ترکیب بار "+label+" برای عضو "+id+" تکراری است.");
   labels.add(label);
   if(!finiteVector(entry?.values)){
    issues.push("بردار ۱۲ مؤلفه‌ای عضو "+id+" در حالت "+(label||"نامشخص")+" ناقص یا نامعتبر است.");
    return;
   }
   const v=entry.values.map(Number),I=endRecord(v,0),J=endRecord(v,6);
   const activeI=nonzeroActions(I),activeJ=nonzeroActions(J);
   const maxAbs=Math.max(...v.map(Math.abs));
   rows.push({memberId:id,parentMemberId:m.parentMemberId||null,sectionKey:String(m.sectionKey||""),caseLabel:label,
    I,J,activeI,activeJ,maxAbs,axialOnly:activeI.every(k=>k==="N")&&activeJ.every(k=>k==="N"),
    combinedAction:activeI.some(k=>k!=="N")||activeJ.some(k=>k!=="N"),
    source:"member-force-envelope.ends.values[12]"});
  });
  if(cases.length){
   const expected=cases.map(c=>String(c?.label||"")).filter(Boolean);
   expected.forEach(label=>{if(!labels.has(label))issues.push("حالت "+label+" در گزارش عضو "+id+" وجود ندارد.");});
   labels.forEach(label=>{if(!expected.includes(label))warnings.push("حالت "+label+" برای عضو "+id+" خارج از فهرست مرجع ترکیبات گزارش شده است.");});
  }
 });
 const combined=rows.filter(r=>r.combinedAction);
 const axial=rows.filter(r=>r.axialOnly);
 const noDemand=rows.filter(r=>!r.maxAbs);
 return {ok:issues.length===0,designApproved:false,issues:[...new Set(issues)],warnings:[...new Set(warnings)],rows,
  summary:{members:members.length,caseEndRows:rows.length,combinedActionRows:combined.length,axialOnlyRows:axial.length,zeroDemandRows:noDemand.length},
  combinedActionRows:combined.map(r=>({memberId:r.memberId,caseLabel:r.caseLabel,I:r.I,J:r.J,activeI:r.activeI,activeJ:r.activeJ})),
  rules:["هر ردیف فقط متعلق به یک عضو و یک ترکیب بار است؛ مؤلفه‌های ترکیبات متفاوت ادغام نمی‌شوند.",
   "نیروهای I و J از همان بردار ۱۲ مؤلفه‌ای استخراج شده‌اند و جداگانه نگهداری می‌شوند.",
   "این ممیزی فقط منشأ و هم‌زمانی تقاضا را کنترل می‌کند؛ ظرفیت، نسبت بهره‌برداری یا قبولی آیین‌نامه‌ای محاسبه نمی‌کند.",
   "برای اعضای متغیرمقطع، شناسه والد باید به مسیر طراحی اختصاصی taper متصل شود." ]};
}
function selfTest(){
 const good={cases:[{label:"ULS-A"},{label:"ULS-B"}],members:[{id:"C1",sectionKey:"column",ends:[
  {label:"ULS-A",values:[100,0,0,0,0,0,90,0,0,0,0,0]},
  {label:"ULS-B",values:[80,5,0,2,0,30,70,4,0,1,0,25]}]}]};
 const r=audit(good);
 const broken=audit({cases:[{label:"ULS-A"}],members:[{id:"X",ends:[{label:"ULS-A",values:[1,2]}]}]});
 const dup=audit({cases:[{label:"A"}],members:[{id:"X",ends:[{label:"A",values:Array(12).fill(0)},{label:"A",values:Array(12).fill(0)}]}]});
 const missing=audit({cases:[{label:"A"},{label:"B"}],members:[{id:"X",ends:[{label:"A",values:Array(12).fill(0)}]}]});
 const tests=[
  {name:"keeps each combination as a separate row",pass:r.rows.length===2&&r.rows[0].caseLabel==="ULS-A"&&r.rows[1].caseLabel==="ULS-B"},
  {name:"retains simultaneous six-component actions at both ends",pass:r.rows[1].I.Vy===5&&r.rows[1].I.T===2&&r.rows[1].J.Vy===4&&r.rows[1].J.My===0&&r.rows[1].J.Mz===25},
  {name:"classifies combined action without generating utilization",pass:r.summary.combinedActionRows===1&&r.rows[1].combinedAction&&r.designApproved===false},
  {name:"identifies pure axial cases only when both ends have no other action",pass:r.rows[0].axialOnly===true},
  {name:"rejects malformed 12-component vectors",pass:!broken.ok&&broken.issues.some(x=>x.includes("۱۲ مؤلفه‌ای"))},
  {name:"rejects duplicate member combination labels",pass:!dup.ok&&dup.issues.some(x=>x.includes("تکراری"))},
  {name:"detects missing reference combinations per member",pass:!missing.ok&&missing.issues.some(x=>x.includes("وجود ندارد"))},
  {name:"never grants design approval",pass:r.designApproved===false}
 ];
 return {passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests};
}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function render(){
 const host=document.getElementById("simultaneousMemberActionAuditResults");if(!host)return;
 const r=audit(root.SteelMemberForceEnvelope?.getLast?.());
 const fmt=o=>COMPONENTS.map(k=>k+":"+Number(o[k]).toPrecision(4)).join(" | ");
 host.innerHTML="<p><b>اعضا:</b> "+r.summary.members+" | <b>ردیف‌های عضو/حالت:</b> "+r.summary.caseEndRows+" | <b>بارگذاری مرکب:</b> "+r.summary.combinedActionRows+" | <b>محوری خالص:</b> "+r.summary.axialOnlyRows+"</p>"+
 (r.issues.length?"<h4>خطاهای پوشش داده</h4><ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>خطای ساختاری در بردارهای گزارش‌شده پیدا نشد.</p>")+
 "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>عضو</th><th>گروه</th><th>ترکیب بار</th><th>انتهای I: N,Vy,Vz,T,My,Mz</th><th>انتهای J: N,Vy,Vz,T,My,Mz</th><th>طبقه‌بندی تقاضا</th></tr></thead><tbody>"+
 r.rows.map(x=>"<tr><td>"+esc(x.memberId)+"</td><td>"+esc(x.sectionKey)+"</td><td>"+esc(x.caseLabel)+"</td><td>"+esc(fmt(x.I))+"</td><td>"+esc(fmt(x.J))+"</td><td>"+(x.combinedAction?"نیازمند اندرکنش":"محوری خالص/بدون مؤلفه جانبی")+"</td></tr>").join("")+"</tbody></table></div>"+
 "<div class='notice'>"+r.rules.map(esc).join("<br>")+"</div>";
}
function init(){
 if(document.getElementById("simultaneousMemberActionAuditPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="simultaneousMemberActionAuditPanel";
 p.innerHTML="<div class='panel-title'><h3>ممیزی نیروهای هم‌زمان اعضا برای طراحی اندرکنش</h3><span class='status'>ردیابی عضو / ترکیب / دو انتها</span></div><div class='notice'>پس از تحلیل سه‌بعدی و استخراج پوش نیروها اجرا شود. این بخش نیروهای هم‌زمان را ممیزی می‌کند و موتور مقاومت یا تأیید آیین‌نامه‌ای نیست.</div><div class='button-grid'><button type='button' class='btn secondary' id='btnSimultaneousMemberActionAudit'>ممیزی بردارهای هم‌زمان</button></div><div id='simultaneousMemberActionAuditResults'></div>";
 const anchor=document.getElementById("compressionCapacityIntegrationPanel")||document.getElementById("flexureShearReadinessPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 document.getElementById("btnSimultaneousMemberActionAudit").addEventListener("click",render);
}
root.SteelSimultaneousMemberActionAudit={audit,selfTest,render};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
