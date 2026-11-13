/* SAHROUD STEEL — source-controlled load combination registry.
 * User-supplied/code-reviewed coefficients only; no implicit code defaults.
 * Computes linear effect combinations from supplied case result vectors.
 * It is not a load generator, solver, or code-compliance approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const txt=v=>String(v??"").trim();
function audit(input){
 const p=input||{},issues=[],rows=[],ids=new Set();
 const cases=Array.isArray(p.loadCases)?p.loadCases:[];
 const combos=Array.isArray(p.combinations)?p.combinations:[];
 const caseMap=new Map();
 cases.forEach((c,i)=>{
  const id=txt(c?.id),cat=txt(c?.category);
  if(!id)issues.push("حالت بار شماره "+(i+1)+" شناسه ندارد.");
  else if(caseMap.has(id))issues.push("شناسه حالت بار تکراری است: "+id);
  else caseMap.set(id,c);
  if(!cat)issues.push("دسته بار برای "+(id||i+1)+" ثبت نشده است.");
  if(!c?.effects||typeof c.effects!=="object"||Array.isArray(c.effects))issues.push("بردار اثرات برای "+(id||i+1)+" معتبر نیست.");
  else Object.entries(c.effects).forEach(([k,v])=>{if(!txt(k)||!finite(v))issues.push("اثر غیرعددی/نامعتبر در حالت "+(id||i+1)+": "+k);});
 });
 combos.forEach((c,i)=>{
  const id=txt(c?.id);
  if(!id)issues.push("ترکیب شماره "+(i+1)+" شناسه ندارد.");
  else if(ids.has(id))issues.push("شناسه ترکیب تکراری است: "+id);
  else ids.add(id);
  const src=c?.source||{};
  if(!txt(src.code)||!txt(src.edition)||!txt(src.clause)||!txt(src.document))issues.push("مرجع آیین‌نامه‌ای کامل برای ترکیب "+(id||i+1)+" ثبت نشده است.");
  const factors=c?.factors;
  if(!factors||typeof factors!=="object"||Array.isArray(factors)||!Object.keys(factors).length){issues.push("ضرایب ترکیب "+(id||i+1)+" خالی است.");return;}
  Object.entries(factors).forEach(([caseId,factor])=>{
   if(!caseMap.has(caseId))issues.push("حالت بار مرجع "+caseId+" در ترکیب "+(id||i+1)+" وجود ندارد.");
   if(!finite(factor))issues.push("ضریب ترکیب برای "+caseId+" عدد متناهی نیست.");
  });
  if(Object.keys(factors).some(k=>!caseMap.has(k)))return;
  const keys=new Set();
  Object.values(factors).forEach(()=>{});
  Object.entries(factors).forEach(([caseId,factor])=>Object.keys(caseMap.get(caseId).effects||{}).forEach(k=>keys.add(k)));
  const effects={};
  keys.forEach(k=>{effects[k]=Object.entries(factors).reduce((sum,[caseId,factor])=>sum+factor*(caseMap.get(caseId).effects[k]??0),0);});
  rows.push({id,source:{code:txt(src.code),edition:txt(src.edition),clause:txt(src.clause),document:txt(src.document)},effects});
 });
 const keys=new Set(rows.flatMap(r=>Object.keys(r.effects)));
 const envelope={};
 keys.forEach(k=>{const vals=rows.filter(r=>finite(r.effects[k])).map(r=>({combinationId:r.id,value:r.effects[k]}));if(vals.length)envelope[k]={maximum:vals.reduce((a,b)=>b.value>a.value?b:a),minimum:vals.reduce((a,b)=>b.value<a.value?b:a)};});
 return {success:issues.length===0&&rows.length===combos.length&&combos.length>0,issues,combinations:rows,envelope,analysisEnabled:false,designApproved:false,limitations:["ضرایب از هیچ آیین‌نامه‌ای به‌طور خودکار انتخاب نمی‌شوند.","اثرهای ورودی باید خروجی معتبر تحلیل برای همان مدل و حالت بار باشند.","ترکیب خطی اثرها جایگزین تحلیل غیرخطی، اندرکنش مرتبه دوم، یا کنترل ضوابط نیست.","نتیجه این ممیزی به‌تنهایی تأیید طراحی محسوب نمی‌شود."]};
}
function selfTest(){
 const t=[],test=(name,fn)=>{try{t.push({name,ok:fn()!==false});}catch(e){t.push({name,ok:false,detail:e.message});}};
 const base={loadCases:[{id:"D",category:"dead",effects:{M:10,V:4}},{id:"W+",category:"wind",effects:{M:5,V:-2}},{id:"W-",category:"wind",effects:{M:-7,V:3}}],combinations:[{id:"C1",factors:{D:1.2,"W+":1.0},source:{code:"مبحث ششم",edition:"۱۳۹۸",clause:"بند نمونه",document:"مصوبه کنترل‌شده پروژه"}},{id:"C2",factors:{D:1.2,"W-":1.0},source:{code:"مبحث ششم",edition:"۱۳۹۸",clause:"بند نمونه",document:"مصوبه کنترل‌شده پروژه"}}]};
 test("combination effects calculated with entered factors",()=>{const r=audit(base);return r.success&&r.combinations[0].effects.M===17&&r.combinations[1].effects.M===5;});
 test("positive and negative wind cases remain separate",()=>audit(base).combinations.length===2);
 test("maximum and minimum envelopes identified",()=>{const e=audit(base).envelope.M;return e.maximum.value===17&&e.minimum.value===5;});
 test("missing code source rejected",()=>{const p=JSON.parse(JSON.stringify(base));delete p.combinations[0].source.document;return !audit(p).success;});
 test("unknown load case rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.combinations[0].factors.X=1;return !audit(p).success;});
 test("duplicate combination ID rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.combinations[1].id="C1";return !audit(p).success;});
 test("duplicate load case ID rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.loadCases[1].id="D";return !audit(p).success;});
 test("non-finite coefficient rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.combinations[0].factors.D="1.2";return !audit(p).success;});
 test("non-numeric effect rejected",()=>{const p=JSON.parse(JSON.stringify(base));p.loadCases[0].effects.M="10";return !audit(p).success;});
 test("empty combination list rejected",()=>!audit({loadCases:base.loadCases,combinations:[]}).success);
 test("no implicit factors or code presets",()=>Object.keys(audit({}).combinations).length===0);
 test("never enables analysis or approves design",()=>{const r=audit(base);return r.analysisEnabled===false&&r.designApproved===false;});
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t};
}
root.SteelLoadCombinationRegistry={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
