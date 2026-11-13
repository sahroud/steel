/* SAHROUD STEEL — transfer simultaneous support reactions to base-plate screening.
 * Reuses the exact per-node/per-load-case reactions from analyzeFoundationEnvelope().
 * Global vertical axis is Y; plate plane is X-Z. Reactions are converted to column-on-base actions
 * by reversing the support-on-structure reaction vector.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id),fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:4});
let last=null;
function mapReaction(values){
 if(!Array.isArray(values)||values.length<6||values.slice(0,6).some(v=>!Number.isFinite(Number(v))))throw Error("بردار واکنش شش‌مؤلفه‌ای معتبر نیست.");
 return {
  N_tensionPositive_kN:-Number(values[1])/1000,
  Mx_kNm:-Number(values[3])/1000,
  Mz_kNm:-Number(values[5])/1000,
  supportReaction:{Fx_kN:Number(values[0])/1000,Fy_kN:Number(values[1])/1000,Fz_kN:Number(values[2])/1000,Mx_kNm:Number(values[3])/1000,My_kNm:Number(values[4])/1000,Mz_kNm:Number(values[5])/1000}
 };
}
async function extract(){
 if(!root.SteelStructuralModel||typeof root.SteelStructuralModel.analyzeFoundationEnvelope!=="function")throw Error("استخراج واکنش‌های فونداسیون در موتور سه‌بعدی موجود نیست.");
 const r=await root.SteelStructuralModel.analyzeFoundationEnvelope();
 if(!r||!Array.isArray(r.rows)||!r.rows.length)throw Error("واکنش گره‌های پایه استخراج نشد.");
 last=r;
 return r;
}
function mount(){
 if($("baseReactionTransferPanel"))return;
 const a=$("baseplatePartialContactPanel")||$("anchorDemandScreenPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="baseReactionTransferPanel";
 p.innerHTML='<div class="panel-title"><h3>انتقال واکنش واقعی قاب به صفحه‌ستون</h3><span class="status">بر اساس تحلیل ترکیبات بار</span></div>'+
 '<div class="notice">این ابزار واکنش شش‌مؤلفه‌ای هر گره پایه را از تحلیل سه‌بعدی استخراج می‌کند. پس از انتخاب گره و ترکیب بار، مؤلفه‌های هم‌زمان به ورودی تحلیل تماس جزئی منتقل می‌شوند؛ بیشینه‌های مستقل با هم ترکیب نمی‌شوند.</div>'+
 '<div class="button-grid"><button id="brtExtract" class="btn primary" type="button">استخراج واکنش‌های تمام ترکیبات</button></div>'+
 '<div class="form-grid"><div class="field"><label for="brtNode">گره پایه</label><select id="brtNode" disabled><option value="">ابتدا استخراج کنید</option></select></div><div class="field"><label for="brtCase">ترکیب بار</label><select id="brtCase" disabled><option value="">ابتدا استخراج کنید</option></select></div></div>'+
 '<div id="brtResult" class="notice">پس از اجرای تحلیل ترکیبات بار، واکنش‌ها را استخراج کنید.</div>'+
 '<div class="button-grid"><button id="brtApply" class="btn secondary" type="button" disabled>انتقال به تحلیل تماس صفحه‌ستون</button><button id="brtJson" class="btn secondary" type="button" disabled>گزارش واکنش‌ها JSON</button></div>'+
 '<div class="notice">قرارداد انتقال: محور قائم سازه Y است؛ N کششی مثبت = منفی واکنش Fy؛ Mx و Mz نیز با علامت معکوس واکنش تکیه‌گاهی به‌عنوان کنش ستون روی صفحه‌ستون منتقل می‌شوند. این قرارداد باید با جهت محورهای مدل و جزئیات اتصال پروژه تطبیق داده شود. واحدهای اصلی حلگر N و N.m هستند.</div>'+
 '<div class="notice">ترکیبات موجود در موتور فونداسیون استفاده می‌شوند؛ پوش بار فعلی هنوز شامل همه حالات زلزله، uplift و همه ترکیبات لازم آیین‌نامه‌ای نیست. واکنش‌ها در این مرحله برای غربال مقدماتی‌اند.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("brtExtract").addEventListener("click",async()=>{
  const btn=$("brtExtract");btn.disabled=true;$("brtResult").textContent="در حال حل مجدد ترکیبات بار و استخراج واکنش‌ها…";
  try{
   const r=await extract(),node=$("brtNode"),cas=$("brtCase");
   node.innerHTML=r.rows.map((x,i)=>'<option value="'+i+'">'+String(x.nodeId).replace(/[&<>"']/g,"")+' — '+String(x.kind||"پایه")+' (X='+fmt(x.x)+', Z='+fmt(x.z)+')</option>').join("");
   const names=r.cases.map((x,i)=>'<option value="'+i+'">'+String(x.label).replace(/[&<>"']/g,"")+'</option>').join("");
   cas.innerHTML=names;node.disabled=false;cas.disabled=false;$("brtApply").disabled=false;$("brtJson").disabled=false;render();
  }catch(e){$("brtResult").textContent=e.message;}
  finally{btn.disabled=false;}
 });
 $("brtNode").addEventListener("change",render);$("brtCase").addEventListener("change",render);
 $("brtApply").addEventListener("click",apply);
 $("brtJson").addEventListener("click",()=>{
  if(!last)return;const data=JSON.stringify(last,null,2),u=URL.createObjectURL(new Blob([data],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Foundation-Reactions.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 });
}
function selected(){
 if(!last)throw Error("ابتدا واکنش‌ها را استخراج کنید.");
 const row=last.rows[Number($("brtNode").value)],ci=Number($("brtCase").value);
 if(!row||!Number.isInteger(ci)||!last.cases[ci])throw Error("گره یا ترکیب بار انتخابی معتبر نیست.");
 const entry=row.caseReactions.find(x=>x.label===last.cases[ci].label);
 if(!entry)throw Error("واکنش این گره در ترکیب انتخابی موجود نیست.");
 return {row,case:last.cases[ci],mapped:mapReaction(entry.values),raw:entry.values};
}
function render(){
 try{const s=selected(),m=s.mapped;
 $("brtResult").textContent="گره "+s.row.nodeId+" | "+s.case.label+" | N کششی مثبت: "+fmt(m.N_tensionPositive_kN)+" kN | Mx: "+fmt(m.Mx_kNm)+" kN.m | Mz: "+fmt(m.Mz_kNm)+" kN.m | واکنش قائم تکیه‌گاه Fy: "+fmt(m.supportReaction.Fy_kN)+" kN. تعادل ترکیب: "+(s.case.equilibrium?.ok?"معتبر در کنترل تعادل حلگر":"نیازمند بررسی");
 return s;
 }catch(e){$("brtResult").textContent=e.message;return null;}
}
function apply(){
 try{
  const s=selected();
  if(!$("pcN")||!$("pcMx")||!$("pcMz"))throw Error("پنل تحلیل تماس جزئی بارگذاری نشده است.");
  $("pcN").value=s.mapped.N_tensionPositive_kN;$("pcMx").value=s.mapped.Mx_kNm;$("pcMz").value=s.mapped.Mz_kNm;
  $("pcResult").textContent="بارهای هم‌زمان از گره "+s.row.nodeId+" و ترکیب «"+s.case.label+"» منتقل شدند. اکنون حل تماس جزئی را اجرا کنید.";
  $("baseplatePartialContactPanel").scrollIntoView?.({behavior:"smooth",block:"center"});
 }catch(e){$("brtResult").textContent=e.message;}
}
function selfTest(){
 const m=mapReaction([1000,200000,-3000,400000,5000,-600000]);
 const checks=[
 ["تبدیل واکنش قائم به N کششی مثبت",m.N_tensionPositive_kN===-200],
 ["تبدیل علامت لنگر Mx",m.Mx_kNm===-400],
 ["تبدیل علامت لنگر Mz",m.Mz_kNm===600],
 ["حفظ واکنش‌های افقی و My",m.supportReaction.Fx_kN===1&&m.supportReaction.Fz_kN===-3&&m.supportReaction.My_kNm===5],
 ["رد بردار واکنش ناقص",(()=>{try{mapReaction([1,2]);return false;}catch(e){return true;}})()]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelBaseReactionTransfer={extract,mapReaction,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null,selected};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
