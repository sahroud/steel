/* SAHROUD STEEL — M6:1398 LRFD load-combination template generator.
 * Source: Iranian National Building Regulations, Topic 6, 4th ed. (1398),
 * clause 6-2-3-2. Templates only: no load generation, analysis, or approval.
 */
(function(root){
"use strict";
const txt=v=>String(v??"").trim();
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clone=v=>JSON.parse(JSON.stringify(v));
function fail(issues){return {success:false,status:"insufficient_data",issues,combinations:[],analysisEnabled:false,designApproved:false};}
function generate(input){
 const p=input||{},issues=[];
 if(p.code!=="m6-1398")issues.push("مبنای ترکیبات باید صریحاً مبحث ششم ویرایش ۱۳۹۸ باشد.");
 if(p.method!=="LRFD")issues.push("این مولد فقط ترکیبات حالت حدی مقاومت (LRFD) را تولید می‌کند.");
 if(p.approvedByEngineer!==true)issues.push("تأیید مهندس مسئول برای فعال‌سازی مجموعه ترکیبات ثبت نشده است.");
 const c=p.cases||{};
 const ids=["D","L","Lr","S","R","W+","W-","E+","E-"];
 ids.forEach(k=>{if(!Array.isArray(c[k])||!c[k].length||c[k].some(x=>!txt(x)))issues.push("شناسه حالت بار "+k+" باید صریحاً معرفی شود؛ حتی برای اثر صفر.");});
 if(p.temperatureApplicable===true&&(!Array.isArray(c.T)||!c.T.length||c.T.some(x=>!txt(x))))issues.push("برای اثر دما/خودکرنشی، حالت‌های T باید معرفی شوند.");
 if(p.temperatureApplicable!==true&&p.temperatureApplicable!==false)issues.push("قابل‌اعمال بودن اثر دما/خودکرنشی باید صریحاً تعیین شود.");
 if(p.otherActions&&p.otherActions.length)issues.push("بارهای اضافی خارج از این قالب وجود دارند و باید ترکیبات اختصاصی آن‌ها بررسی و اضافه شود: "+p.otherActions.join("، "));
 if(issues.length)return fail(issues);
 const combos=[];
 const add=(id,label,terms,sourceClause)=>{
  const factors={};terms.forEach(([caseId,factor])=>{factors[caseId]=(factors[caseId]||0)+factor;});
  combos.push({id,label,factors,source:{code:"مبحث ششم مقررات ملی ساختمان",edition:"ویرایش چهارم ۱۳۹۸",clause:sourceClause,document:"بند ۶-۲-۳-۲؛ قالب تولید ترکیب، نیازمند تطبیق مهندس مسئول با متن رسمی پروژه"}});
 };
 const expand=(base,choices)=>{let rows=[base];for(const group of choices){const next=[];for(const row of rows)for(const choice of group)next.push([...row,...choice]);rows=next;}return rows;};
 const one=(key)=>c[key].map(id=>[[id,1]]);
 const roof=["Lr","S","R"];
 // 1) 1.4D
 c.D.forEach(d=>add("M6-ULS-01-"+d,"1.4D",[[d,1.4]],"۶-۲-۳-۲، ترکیب ۱"));
 // 2) 1.2D + 1.6L + 0.5(Lr or S or R)
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),one("L").map(x=>x.map(([id])=>[id,1.6])),roof.flatMap(k=>one(k).map(x=>x.map(([id])=>[id,0.5])))]))
 add("M6-ULS-02-"+combos.length,"1.2D + 1.6L + 0.5(Lr/S/R)",terms,"۶-۲-۳-۲، ترکیب ۲");
 // 3) 1.2D + 1.6(Lr or S or R) + [L or 0.5(1.4W)]
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),roof.flatMap(k=>one(k).map(x=>x.map(([id])=>[id,1.6]))),[...one("L").map(x=>x.map(([id])=>[id,1])),...c["W+"].concat(c["W-"]).map(id=>[[id,0.7]])]]))
 add("M6-ULS-03-"+combos.length,"1.2D + 1.6(Lr/S/R) + [L or 0.5(1.4W)]",terms,"۶-۲-۳-۲، ترکیب ۳");
 // 4) 1.2D + 1.0(1.4W) + L + 0.5(Lr or S or R)
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),c["W+"].concat(c["W-"]).map(id=>[[id,1.4]]),one("L"),roof.flatMap(k=>one(k).map(x=>x.map(([id])=>[id,0.5])))]))
 add("M6-ULS-04-"+combos.length,"1.2D + 1.4W + L + 0.5(Lr/S/R)",terms,"۶-۲-۳-۲، ترکیب ۴");
 // 5) 1.2D + E + L + 0.2S
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),c["E+"].concat(c["E-"]).map(id=>[[id,1]]),one("L"),one("S").map(x=>x.map(([id])=>[id,0.2]))]))
 add("M6-ULS-05-"+combos.length,"1.2D + E + L + 0.2S",terms,"۶-۲-۳-۲، ترکیب ۵");
 // 6) 0.9D + 1.4W
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,0.9])),c["W+"].concat(c["W-"]).map(id=>[[id,1.4]])]))
 add("M6-ULS-06-"+combos.length,"0.9D + 1.4W",terms,"۶-۲-۳-۲، ترکیب ۶");
 // 7) 0.9D + E
 for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,0.9])),c["E+"].concat(c["E-"]).map(id=>[[id,1]])]))
 add("M6-ULS-07-"+combos.length,"0.9D + E",terms,"۶-۲-۳-۲، ترکیب ۷");
 if(p.temperatureApplicable===true){
  // 8) 1.2D + 0.5L + 0.5(Lr or S) + 1.2T
  for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),one("L").map(x=>x.map(([id])=>[id,0.5])),["Lr","S"].flatMap(k=>one(k).map(x=>x.map(([id])=>[id,0.5]))),one("T").map(x=>x.map(([id])=>[id,1.2]))]))
  add("M6-ULS-08-"+combos.length,"1.2D + 0.5L + 0.5(Lr/S) + 1.2T",terms,"۶-۲-۳-۲، ترکیب ۸");
  // 9) 1.2D + 1.6L + 1.6(Lr or S) + T
  for(const terms of expand([], [one("D").map(x=>x.map(([id])=>[id,1.2])),one("L").map(x=>x.map(([id])=>[id,1.6])),["Lr","S"].flatMap(k=>one(k).map(x=>x.map(([id])=>[id,1.6]))),one("T")]))
  add("M6-ULS-09-"+combos.length,"1.2D + 1.6L + 1.6(Lr/S) + T",terms,"۶-۲-۳-۲، ترکیب ۹");
 }
 const unique=new Set();combos.forEach(x=>{if(unique.has(x.id))issues.push("شناسه ترکیب تکراری: "+x.id);unique.add(x.id);});
 return {success:issues.length===0,status:issues.length?"blocked":"templates-generated-review-required",method:"LRFD",code:"مبحث ششم ۱۳۹۸",clause:"۶-۲-۳-۲",combinations:combos,analysisEnabled:false,designApproved:false,limitations:["این ماژول فقط قالب ضرایب را تولید می‌کند؛ بارها را محاسبه یا به مدل سازه تزریق نمی‌کند.","حالات بار باید مستقل و دارای علامت/جهت صحیح باشند؛ اثرهای مثبت و منفی با هم جمع نمی‌شوند مگر ترکیب مشخص کند.","شرط کاهش ضریب L، آثار نامطلوب/کاهنده، بارهای اضافی، حوادث غیرعادی، جرثقیل و الزامات خاص باید جداگانه بررسی شوند.","برای طراحی اجرایی، نسخه رسمی مبحث، بندها و انتخاب حالت‌های قابل‌اعمال باید توسط مهندس مسئول بازبینی شود."]};
}
function selfTest(){
 const c={D:["D"],L:["L"],Lr:["Lr"],S:["S"],R:["R"],"W+":["W+"],"W-":["W-"],"E+":["E+"],"E-":["E-"],T:["T"]};
 const base={code:"m6-1398",method:"LRFD",approvedByEngineer:true,temperatureApplicable:true,cases:c};
 const a=generate(base),b=generate({...base,approvedByEngineer:false}),d=generate({...base,cases:{...c,S:[]}}),e=generate({...base,temperatureApplicable:"yes"}),f=generate({...base,otherActions:["crane"]});
 const tests=[
 ["all nine clause families expanded with directional alternatives",a.success&&a.combinations.some(x=>x.id.startsWith("M6-ULS-09"))&&a.combinations.some(x=>x.id.startsWith("M6-ULS-04"))],
 ["positive and negative wind are separate alternatives",a.combinations.some(x=>Object.hasOwn(x.factors,"W+"))&&a.combinations.some(x=>Object.hasOwn(x.factors,"W-"))],
 ["positive and negative seismic are separate alternatives",a.combinations.some(x=>Object.hasOwn(x.factors,"E+"))&&a.combinations.some(x=>Object.hasOwn(x.factors,"E-"))],
 ["missing snow case is blocked",!d.success&&d.status==="insufficient_data"],
 ["missing engineer review is blocked",!b.success],
 ["temperature applicability must be explicit",!e.success],
 ["extra unmodeled actions are blocked",!f.success],
 ["combination sources are attached to each row",a.combinations.every(x=>x.source.clause&&x.source.edition==="ویرایش چهارم ۱۳۹۸")],
 ["no solver or design approval is claimed",!a.analysisEnabled&&!a.designApproved]
 ];
 return {passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,tests:tests.map(x=>({name:x[0],ok:x[1]})),combinationCount:a.combinations.length};
}
function initPanel(){
 if(typeof document==="undefined"||document.getElementById("m6CombinationTemplatesPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="m6CombinationTemplatesPanel";
 const fields=[["D","بار مرده D"],["L","بار زنده L"],["Lr","بار زنده بام Lr"],["S","برف S"],["R","باران R"],["W+","باد جهت مثبت W+"],["W-","باد جهت منفی W-"],["E+","زلزله جهت مثبت E+"],["E-","زلزله جهت منفی E-"],["T","دما/خودکرنشی T"]];
 p.innerHTML="<div class='panel-title'><h3>مولد ترکیبات بار مبحث ششم ۱۳۹۸ (LRFD)</h3><span class='status'>قالب ضابطه‌ای؛ نیازمند بازبینی</span></div><p>شناسه حالت‌های بار را معرفی کنید. شناسه‌ها صرفاً ارجاع‌اند و به معنی وجود بار یا اثر محاسبه‌شده نیستند. برای حالت‌های صفر نیز حالت بار صریح با اثر صفر تعریف کنید.</p><div class='form-grid'>"+fields.map(([id,label])=>"<div class='field'><label>"+label+"</label><input data-m6-case='"+id+"' value='"+id+"' type='text'></div>").join("")+"</div><div class='form-grid'><div class='field'><label>قابل‌اعمال بودن اثر دما/خودکرنشی</label><select id='m6TemperatureApplicable'><option value=''>تعیین نشده</option><option value='false'>خیر، پس از بررسی مهندس</option><option value='true'>بله</option></select></div><label class='field'><input id='m6EngineerApproved' type='checkbox'> بازبینی و تأیید این مجموعه توسط مهندس مسئول</label></div><div class='button-grid'><button type='button' class='btn primary' id='btnGenerateM6Combinations'>تولید ترکیبات بار</button></div><div id='m6CombinationTemplateResults' class='notice'>هنوز ترکیبات تولید نشده‌اند.</div><div class='notice'>این ابزار ضرایب و شاخه‌های ترکیب را تولید می‌کند؛ بارهای اقلیمی، تحلیل سازه، حالات خاص، ضوابط بهره‌برداری و طراحی اعضا را انجام نمی‌دهد و تأیید طراحی صادر نمی‌کند.</div>";
 const anchor=document.getElementById("climateDesignReadinessPanel")||main.querySelector("footer");if(anchor)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 document.getElementById("btnGenerateM6Combinations").addEventListener("click",()=>{
  const cases={};p.querySelectorAll("[data-m6-case]").forEach(el=>{cases[el.getAttribute("data-m6-case")]=el.value.split(",").map(x=>x.trim()).filter(Boolean);});
  const t=document.getElementById("m6TemperatureApplicable").value;
  const r=generate({code:"m6-1398",method:"LRFD",approvedByEngineer:document.getElementById("m6EngineerApproved").checked,temperatureApplicable:t===""?null:t==="true",cases});
  const out=document.getElementById("m6CombinationTemplateResults");
  if(!r.success){out.textContent="تولید متوقف شد: "+r.issues.join(" | ");return;}
  out.innerHTML="<b>"+r.combinations.length+" شاخه ترکیب تولید شد؛ نیازمند تطبیق مهندسی.</b><ol>"+r.combinations.map(x=>"<li><b>"+x.id+"</b> — "+x.label+"<br><small>"+Object.entries(x.factors).map(([k,v])=>v+"×"+k).join(" + ")+"</small></li>").join("")+"</ol>";
 });
}
root.SteelM6LoadCombinationTemplates={generate,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initPanel);else initPanel();}
})(typeof window!=="undefined"?window:globalThis);
