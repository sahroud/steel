/* SAHROUD STEEL — runway girder elastic local-stress screening.
 * Reads end actions from the 3D frame FEM. This is a transparent nominal-stress
 * screen only; it is not a code resistance, buckling, fatigue, or connection check.
 */
(function(root){
"use strict";
const REQUIRED=["A_m2","Sy_m3","Sz_m3","Avy_m2","Avz_m2","J_m4","torsionRadius_m","Fy_MPa"];
function audit(result,sectionsByMemberId){
 const issues=[],rows=[],map=sectionsByMemberId||{};
 if(!result||result.success!==true||!Array.isArray(result.members))issues.push("نتیجه معتبر تحلیل سه‌بعدی با فهرست اعضا لازم است.");
 const members=(result?.members||[]).filter(m=>m.sectionKey==="craneRunwayGirder"||m.type==="craneRunwayGirder");
 if(!members.length)issues.push("عضو تیر حمال یکپارچه‌شده در نتیجه تحلیل سه‌بعدی پیدا نشد.");
 members.forEach(m=>{
  const s=map[String(m.id)];
  if(!s||typeof s!=="object"){issues.push("مشخصات مقطع عضو "+m.id+" ثبت نشده است.");return;}
  REQUIRED.forEach(k=>{if(!(Number.isFinite(Number(s[k]))&&Number(s[k])>0))issues.push("عضو "+m.id+": مقدار "+k+" باید مثبت و بر حسب SI باشد.");});
  if(!String(s.source||"").trim())issues.push("مرجع خواص مقطع عضو "+m.id+" الزامی است.");
  if(!String(s.geometrySource||"").trim())issues.push("مرجع هندسه مقطع عضو "+m.id+" الزامی است.");
  if(!String(s.shearAreaMethod||"").trim())issues.push("روش تعیین سطح مؤثر برش عضو "+m.id+" باید مستند شود.");
  if(!String(s.torsionMethod||"").trim())issues.push("روش تعیین پارامترهای پیچش عضو "+m.id+" باید مستند شود.");
  if(!Array.isArray(m.localEndForces)||m.localEndForces.length!==12){issues.push("نیروهای انتهایی محلی عضو "+m.id+" ناقص است.");return;}
  if(m.localEndForces.some(v=>!Number.isFinite(Number(v)))){issues.push("نیروهای انتهایی محلی عضو "+m.id+" نامعتبر است.");return;}
  if(REQUIRED.some(k=>!(Number.isFinite(Number(s[k]))&&Number(s[k])>0)))return;
  const ends=[{name:"i",o:0},{name:"j",o:6}].map(e=>{
   const f=m.localEndForces,o=e.o;
   const N=Math.abs(f[o]),Vy=Math.abs(f[o+1]),Vz=Math.abs(f[o+2]),T=Math.abs(f[o+3]),My=Math.abs(f[o+4]),Mz=Math.abs(f[o+5]);
   const sigma=N/Number(s.A_m2)+My/Number(s.Sy_m3)+Mz/Number(s.Sz_m3);
   const tau=Vy/Number(s.Avy_m2)+Vz/Number(s.Avz_m2)+T*Number(s.torsionRadius_m)/Number(s.J_m4);
   const vm=Math.sqrt(sigma*sigma+3*tau*tau),fy=Number(s.Fy_MPa)*1e6;
   return {end:e.name,actions_N_Nm:{N,Vy,Vz,T,My,Mz},nominalUpperBound_Pa:{normal:sigma,shear:tau,vonMises:vm},yieldScreenRatio:vm/fy};
  });
  const governing=ends.reduce((a,b)=>a.yieldScreenRatio>=b.yieldScreenRatio?a:b);
  rows.push({memberId:m.id,length_m:m.length,sectionKey:m.sectionKey,source:s.source,geometrySource:s.geometrySource,ends,governingEnd:governing.end,governingYieldScreenRatio:governing.yieldScreenRatio,screenStatus:governing.yieldScreenRatio<=1?"nominal-elastic-screen-below-Fy":"nominal-elastic-screen-exceeds-Fy"});
 });
 const ready=issues.length===0&&rows.length===members.length;
 return {success:ready,ready,analysisEnabled:false,method:"absolute-value elastic nominal-stress upper-bound screen at each member end; von Mises combination",memberCount:members.length,checkedCount:rows.length,issues,results:rows,limitations:[
 "این کنترل صرفاً غربال تنش اسمی الاستیک در دو انتهای اعضا است و جایگزین طراحی مقاومت آیین‌نامه‌ای نیست.",
 "مقادیر Sy و Sz باید مدول مقطع واقعی حول محورهای محلی y و z و با تعریف منطبق با حل‌گر باشند.",
 "فرمول تنش برشی جمع قدرمطلق مؤلفه‌ها یک کران محافظه‌کارانه ساده‌شده است؛ توزیع واقعی برش و پیچش در مقطع I شکل محاسبه نمی‌شود.",
 "پیچش سن‌ونان برای مقاطع باز نازک‌جداره ممکن است ناکافی باشد؛ warping و تنش‌های ناشی از آن مدل نشده‌اند.",
 "کمانش پیچشی-جانبی، کمانش موضعی بال و جان، web crippling، patch loading، خمش موضعی بال، سخت‌کننده‌ها، جوش، پیچ، خستگی، ضربه و اثرات دینامیکی بررسی نشده‌اند.",
 "نسبت با Fy فقط شاخص غربال تنش است؛ ضرایب مقاومت، ترکیبات بار آیین‌نامه‌ای، طبقه‌بندی مقطع و ضرایب کاهش اعمال نشده‌اند.",
 "نتیجه تحلیل خطی مرتبه اول است و اثرات مرتبه دوم، imperfection و تحلیل پایداری در آن نیست."
 ]};
}
function readUI(){
 const el=root.document?.getElementById?.("craneGirderLocalScreenJson");
 if(!el||!String(el.value||"").trim())return {};
 try{return JSON.parse(el.value);}catch(e){return {parseError:String(e.message||e)};}
}
function setData(d){const el=root.document?.getElementById?.("craneGirderLocalScreenJson");if(el)el.value=JSON.stringify(d||{},null,2);}
function run(){
 const host=root.document?.getElementById?.("craneGirderLocalScreenResult"),input=readUI();
 if(input.parseError){if(host)host.textContent="JSON ورودی نامعتبر است: "+input.parseError;return {success:false,issues:[input.parseError]};}
 const latest=root.SteelCrane3DLoadTransfer?.getLastAnalysis?.();
 if(!latest?.success){const r={success:false,analysisEnabled:false,issues:["ابتدا یک حالت بار جرثقیل را در قاب سه‌بعدی تحلیل کنید."]};if(host)host.textContent=JSON.stringify(r,null,2);return r;}
 const r=audit(latest.result,input);if(host)host.textContent=JSON.stringify(r,null,2);return r;
}
function ensurePanel(){
 if(!root.document||root.document.getElementById("craneGirderLocalScreenPanel"))return;
 const main=root.document.querySelector("main");if(!main)return;
 const panel=root.document.createElement("section");panel.className="panel";panel.id="craneGirderLocalScreenPanel";
 panel.innerHTML='<div class="panel-title"><h3>غربال تنش اسمی موضعی تیر حمال</h3><span class="status">پس از تحلیل سه‌بعدی</span></div>'+
 '<div class="notice">پس از اجرای تحلیل یک حالت جرثقیل در قاب سه‌بعدی، مشخصات واقعی هر عضو تیر حمال را با کلید شناسه عضو وارد کنید. واحدها SI هستند. این ابزار فقط غربال تنش اسمی الاستیک است و کنترل کمانش، تنش موضعی جان/بال، خستگی و اتصالات نیست.</div>'+
 '<div class="field"><label for="craneGirderLocalScreenJson">مشخصات مقطع اعضا (JSON بر اساس شناسه عضو)</label><textarea id="craneGirderLocalScreenJson" rows="10" placeholder="{ &quot;شناسه-عضو&quot;: { &quot;A_m2&quot;: 0.01, &quot;Sy_m3&quot;: 0.0001, &quot;Sz_m3&quot;: 0.0002, &quot;Avy_m2&quot;: 0.005, &quot;Avz_m2&quot;: 0.005, &quot;J_m4&quot;: 1e-6, &quot;torsionRadius_m&quot;: 0.1, &quot;Fy_MPa&quot;: 240, &quot;source&quot;: &quot;...&quot;, &quot;geometrySource&quot;: &quot;...&quot;, &quot;shearAreaMethod&quot;: &quot;...&quot;, &quot;torsionMethod&quot;: &quot;...&quot; } }"></textarea></div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="craneGirderLocalScreenRun">اجرای غربال تنش اعضای تیر حمال</button></div><pre id="craneGirderLocalScreenResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const anchor=root.document.getElementById("crane3DLoadTransferPanel");if(anchor)anchor.insertAdjacentElement("afterend",panel);else main.appendChild(panel);
 root.document.getElementById("craneGirderLocalScreenRun").addEventListener("click",run);
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const member={id:"G1",type:"craneRunwayGirder",sectionKey:"craneRunwayGirder",length:6,localEndForces:[10000,20000,30000,4000,5000,6000,-10000,-20000,-30000,-4000,-5000,-6000]};
 const section={A_m2:.01,Sy_m3:.0001,Sz_m3:.0002,Avy_m2:.005,Avz_m2:.005,J_m4:1e-6,torsionRadius_m:.1,Fy_MPa:240,source:"SEC-1",geometrySource:"DWG-1",shearAreaMethod:"section properties",torsionMethod:"Saint-Venant constant"};
 const r=audit({success:true,members:[member]},{G1:section});
 t("calculates both member-end demands",()=>r.success&&r.results[0].ends.length===2);
 t("absolute-force bound is independent of sign reversal",()=>{const b={...member,localEndForces:member.localEndForces.map(v=>-v)};return audit({success:true,members:[b]},{G1:section}).results[0].governingYieldScreenRatio===r.results[0].governingYieldScreenRatio;});
 t("rejects missing section modulus",()=>!audit({success:true,members:[member]},{G1:{...section,Sy_m3:0}}).success);
 t("rejects missing source traceability",()=>!audit({success:true,members:[member]},{G1:{...section,source:""}}).success);
 t("ignores non-runway members",()=>audit({success:true,members:[{...member,sectionKey:"column"}]},{G1:section}).issues.some(x=>x.includes("پیدا نشد")));
 t("reports stress screen above yield",()=>audit({success:true,members:[{...member,localEndForces:member.localEndForces.map(v=>v*1e5)}]},{G1:section}).results[0].screenStatus==="nominal-elastic-screen-exceeds-Fy");
 t("keeps code approval disabled",()=>r.analysisEnabled===false);
 t("documents unmodeled local buckling and web crippling",()=>r.limitations.some(x=>x.includes("web crippling"))&&r.limitations.some(x=>x.includes("کمانش موضعی")));
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,note:"Software regression only; not a code resistance verification."};
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
root.SteelCraneGirderLocalScreen={audit,readUI,setData,run,selfTest};
})(typeof window!=="undefined"?window:globalThis);
