/* SAHROUD STEEL — simultaneous member action contract.
 * Demand trace only; does not calculate resistance or combine non-concurrent envelopes.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v),txt=v=>String(v??"").trim();
const KEYS=["Fx","Fy","Fz","Mx","My","Mz"];
function audit(input){
 const p=input||{},issues=[],rows=[],cases=Array.isArray(p.cases)?p.cases:[],members=new Set((p.memberIds||[]).map(txt));
 if(!cases.length)issues.push("هیچ حالت تحلیل عضو ارائه نشده است.");
 const caseIds=new Set();
 cases.forEach((c,ci)=>{const id=txt(c&&c.caseId);if(!id)issues.push("نتیجه تحلیل ردیف "+(ci+1)+" شناسه ترکیب/حالت بار ندارد.");else if(caseIds.has(id))issues.push("شناسه نتیجه تکراری: "+id);else caseIds.add(id);
  if(c&&c.equilibriumOk!==true)issues.push("تعادل سازه برای حالت "+(id||ci+1)+" تأیید نشده است.");
  const seen=new Set(),items=Array.isArray(c&&c.members)?c.members:[];
  items.forEach((m,mi)=>{const mid=txt(m&&m.memberId);if(!mid)issues.push("شناسه عضو در "+(id||ci+1)+" ردیف "+(mi+1)+" خالی است.");if(seen.has(mid))issues.push("عضو تکراری در حالت "+id+": "+mid);seen.add(mid);if(members.size&&!members.has(mid))issues.push("عضو "+mid+" خارج از مدل مرجع است.");["endI","endJ"].forEach(end=>{const v=m&&m[end];if(!v||KEYS.some(k=>!finite(v[k])))issues.push("شش مؤلفه همزمان "+end+" برای عضو "+mid+" در حالت "+id+" کامل نیست.");});});
  if(members.size)members.forEach(mid=>{if(!seen.has(mid))issues.push("عضو "+mid+" در نتیجه حالت "+id+" مفقود است.");});
  rows.push({caseId:id,memberCount:items.length,memberIds:items.map(m=>txt(m&&m.memberId))});
 });
 return {success:issues.length===0,status:issues.length?"incomplete":"simultaneous-demand-complete",issues,rows,actionComponents:KEYS,concurrencyPreserved:true,envelopeMixingPerformed:false,resistanceCalculated:false,designApproved:false,limitations:["هر شش مؤلفه نیرو و لنگر در دو انتهای هر عضو باید از یک حالت تحلیل واحد باشند.","حداکثر و حداقل مؤلفه‌های مستقل نباید برای ساخت یک بردار مصنوعی با هم ترکیب شوند.","این قرارداد تقاضا را ممیزی می‌کند و ظرفیت، کمانش یا انطباق آیین‌نامه‌ای را محاسبه نمی‌کند."]};
}
function selfTest(){const force={Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},base={memberIds:["M1"],cases:[{caseId:"ULS-01",equilibriumOk:true,members:[{memberId:"M1",endI:force,endJ:{...force,Fx:-1}}]},{caseId:"ULS-02",equilibriumOk:true,members:[{memberId:"M1",endI:{...force,My:99},endJ:{...force,My:-99}}]}]};const t=[["complete concurrent vectors accepted",()=>audit(base).success],["missing end component rejected",()=>{const x=JSON.parse(JSON.stringify(base));delete x.cases[0].members[0].endI.Mz;return !audit(x).success;}],["failed equilibrium rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[0].equilibriumOk=false;return !audit(x).success;}],["missing member in case rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[1].members=[];return !audit(x).success;}],["duplicate case ID rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[1].caseId="ULS-01";return !audit(x).success;}],["duplicate member within case rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[0].members.push({...x.cases[0].members[0]});return !audit(x).success;}],["nonfinite action rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.cases[0].members[0].endJ.Mx=NaN;return !audit(x).success;}],["independent envelopes never merged",()=>{const r=audit(base);return r.concurrencyPreserved&&r.envelopeMixingPerformed===false;}]];const results=t.map(([name,fn])=>({name,ok:!!fn()}));return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};}
root.SteelMemberSimultaneousActionContract={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
