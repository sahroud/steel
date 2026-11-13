/* SAHROUD STEEL: signed simultaneous connection actions per load combination.
   Units: kN, kN.m. Data adapter only; no resistance/code check. */
(function(root){
"use strict";
const num=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))?Number(v):null;
function endActions(m,e){
 const s=e==="i"?"Start":"End";
 return {
  N:num(m["axial"+s]??m["N"+s]),
  Vy:num(m["shear"+s]??m["Vy"+s]),
  Mz:num(m["moment"+s]??m["Mz"+s]),
  Vz:num(m["shearZ"+s]??m["Vz"+s]),
  T:num(m["torsion"+s]??m["T"+s]),
  My:num(m["momentY"+s]??m["My"+s])
 };
}
function collect(combos){
 if(!Array.isArray(combos)||!combos.length)throw Error("نتایج تحلیل ترکیبات بار موجود نیست.");
 const out=[];
 combos.forEach((c,ci)=>{
  if(!Array.isArray(c.members))throw Error("ساختار اعضای ترکیب بار معتبر نیست.");
  c.members.forEach((m,mi)=>["i","j"].forEach(end=>{
   const actions=endActions(m,end);
   if(Object.values(actions).every(v=>v===null))return;
   out.push({combination:String(c.name||c.id||("ترکیب "+(ci+1))),memberName:String(m.name||m.id||("عضو "+(mi+1))),memberId:m.id??"",sectionKey:m.sectionKey??"",end,length:num(m.length),actions});
  }));
 });
 if(!out.length)throw Error("نیروی انتهایی قابل خواندن در نتایج تحلیل پیدا نشد.");
 return out;
}
const csvCell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
function toCsv(rows){
 const h=["ترکیب بار","عضو","شناسه","مقطع","انتها","طول m","N kN","Vy kN","Vz kN","T kN.m","My kN.m","Mz kN.m"];
 return "\uFEFF"+[h,...rows.map(r=>[r.combination,r.memberName,r.memberId,r.sectionKey,r.end,r.length,...["N","Vy","Vz","T","My","Mz"].map(k=>r.actions[k])])].map(a=>a.map(csvCell).join(",")).join("\r\n");
}
function test(){
 const f=[{name:"C1",members:[{id:1,name:"رفتر",length:5,axialStart:-100,shearStart:20,momentStart:30,axialEnd:-90,shearEnd:-10,momentEnd:0}]},{name:"C2",members:[{id:1,name:"رفتر",length:5,axialStart:80,shearStart:-35,momentStart:-45,axialEnd:70,shearEnd:15,momentEnd:0}]}];
 const r=collect(f),checks=[
 ["هر دو ترکیب حفظ می‌شوند",r.length===4],
 ["علامت نیرو حفظ می‌شود",r[0].actions.N===-100&&r[2].actions.N===80],
 ["نیروهای هم‌زمان حفظ می‌شوند",r[0].actions.Vy===20&&r[2].actions.Vy===-35],
 ["جهت ابتدا و انتها حفظ می‌شود",r[0].end==="i"&&r[1].end==="j"],
 ["مؤلفه ناموجود جعل نمی‌شود",r[0].actions.Vz===null&&r[0].actions.T===null],
 ["CSV شامل همه رکوردهاست",toCsv(r).split("\r\n").length===5]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
function mount(){
 if(!root.document||document.getElementById("connectionDemandRegistryPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="connectionDemandRegistryPanel";
 p.innerHTML=`<div class="panel-title"><h3>بانک نیروهای انتهایی اتصالات</h3></div>
 <div class="notice">نیروهای هم‌زمان هر ترکیب بار با علامت اصلی و برای دو انتهای هر عضو ثبت می‌شوند. بیشینه‌های مستقل با یکدیگر ترکیب نمی‌شوند؛ مؤلفه‌های ناموجود خالی می‌مانند.</div>
 <div class="form-grid"><div class="field"><label for="connDemandMember">عضو</label><select id="connDemandMember"><option value="">همه اعضا</option></select></div><div class="field"><label for="connDemandEnd">انتها</label><select id="connDemandEnd"><option value="">هر دو انتها</option><option value="i">ابتدا (i)</option><option value="j">انتها (j)</option></select></div></div>
 <div class="button-grid"><button id="btnBuildConnectionDemand" class="btn primary">استخراج از تحلیل</button><button id="btnExportConnectionDemand" class="btn secondary" disabled>خروجی CSV</button></div>
 <div class="drawing-area"><svg viewBox="0 0 600 130" style="width:100%;height:auto"><rect x="55" y="25" width="12" height="75" fill="#64748b"/><rect x="533" y="25" width="12" height="75" fill="#64748b"/><line x1="67" y1="62" x2="533" y2="62" stroke="#31566a" stroke-width="10"/><path d="M95 15 L75 15 L84 8 M75 15 L84 22 M505 15 L525 15 L516 8 M525 15 L516 22" fill="none" stroke="#0b7285" stroke-width="2.5"/><text x="60" y="120" text-anchor="middle" fill="currentColor">i</text><text x="539" y="120" text-anchor="middle" fill="currentColor">j</text></svg></div>
 <div id="connectionDemandSummary" class="notice">پس از اجرای تحلیل ترکیبات بار، استخراج را اجرا کنید.</div><div id="connectionDemandTable" style="overflow-x:auto"></div>
 <div class="notice" style="color:#a65d16">خروجی فعلی، N، برش محلی و لنگر محلی را از ساختار موجود می‌خواند. برش خارج از صفحه، پیچش و لنگر دوم فقط در صورت وجود صریح در خروجی حلگر ثبت می‌شوند. این بانک داده، ظرفیت یا تأیید آیین‌نامه‌ای اتصال صادر نمی‌کند.</div>`;
 const anchor=document.getElementById("connectionDesignPanel")||document.getElementById("cantileverCheckPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 let records=[];const $=id=>document.getElementById(id),fmt=v=>v===null?"—":Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
 function render(){
  const m=$("connDemandMember").value,e=$("connDemandEnd").value;
  const rows=records.filter(r=>(!m||r.memberName===m)&&(!e||r.end===e));
  $("connectionDemandSummary").textContent="رکوردهای قابل نمایش: "+rows.length+"؛ هر ردیف = یک عضو، یک انتها و یک ترکیب بار.";
  $("connectionDemandTable").innerHTML=rows.length?`<table style="width:100%;min-width:850px;border-collapse:collapse"><thead><tr><th>ترکیب</th><th>عضو</th><th>انتها</th><th>N</th><th>Vy</th><th>Vz</th><th>T</th><th>My</th><th>Mz</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.combination}</td><td>${r.memberName}</td><td>${r.end}</td>${["N","Vy","Vz","T","My","Mz"].map(k=>"<td>"+fmt(r.actions[k])+"</td>").join("")}</tr>`).join("")}</tbody></table>`:"<p>رکوردی یافت نشد.</p>";
 }
 $("btnBuildConnectionDemand").addEventListener("click",()=>{
  try{records=collect(root.SteelAnalysis?.combinationResults);const s=$("connDemandMember"),old=s.value,names=[...new Set(records.map(r=>r.memberName))];s.innerHTML='<option value="">همه اعضا</option>'+names.map(n=>'<option>'+n.replace(/[&<>]/g,"")+'</option>').join("");s.value=old;$("btnExportConnectionDemand").disabled=false;render();}
  catch(e){$("connectionDemandSummary").textContent=e.message;$("connectionDemandTable").innerHTML="";}
 });
 $("connDemandMember").addEventListener("change",render);$("connDemandEnd").addEventListener("change",render);
 $("btnExportConnectionDemand").addEventListener("click",()=>{if(!records.length)return;const u=URL.createObjectURL(new Blob([toCsv(records)],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download="sahroud-steel-connection-demands.csv";a.click();URL.revokeObjectURL(u);});
}
root.SteelConnectionDemandRegistry={collect,toCsv,test,endActions};
if(typeof module!=="undefined"&&module.exports)module.exports=root.SteelConnectionDemandRegistry;
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
