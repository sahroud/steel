/* SAHROUD STEEL — provisional tensile resistance screen.
 * Formula transcription is provisional for M10-1401 clauses 10-2-3-3/4.
 * The official issued PDF, amendments and exact tables have NOT been independently
 * verified in this repository. This module is therefore screening-only and must
 * never be treated as an approved design engine.
 */
(function(root){
"use strict";
const finitePositive=v=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const close=(a,b,tol=0.01)=>Math.abs(a-b)<=Math.max(1e-9,Math.abs(b)*tol);
function analyze(input){
 const d=input||{},issues=[],warnings=[];
 if(d.codeBasis!=="M10-1401-provisional")issues.push("مبنای مبحث دهم ۱۴۰۱ به‌صورت صریح انتخاب نشده است.");
 if(d.officialTextVerified===true)warnings.push("پرچم تأیید متن رسمی توسط فراخواننده ثبت شده؛ این ماژول همچنان تأیید مستقل سند/اصلاحیه را انجام نمی‌دهد.");
 else warnings.push("متن رسمی و اصلاحیه‌های مبحث دهم ۱۴۰۱ در این نسخه نرم‌افزار مستقلاً اعتبارسنجی نشده‌اند.");
 if(d.axialOnlyVerified!==true)issues.push("تقاضای عضو صرفاً محوری نیست یا نبود خمش/برش/پیچش در همه ترکیبات اثبات نشده است.");
 ["Ag_cm2","An_cm2","Ae_cm2","U","Fy_MPa","Fu_MPa","demand_kN"].forEach(k=>{if(!finitePositive(d[k]))issues.push(k+" باید مثبت و معتبر باشد.");});
 if(issues.length)return {ok:false,issues,warnings,scope:"provisional-tension-screen-only",designApproved:false};
 const {Ag_cm2:Ag,An_cm2:An,Ae_cm2:Ae,U,Fy_MPa:Fy,Fu_MPa:Fu,demand_kN:demand}=d;
 if(An>Ag)issues.push("سطح خالص An از سطح ناخالص Ag بزرگ‌تر است.");
 if(Ae>An)issues.push("سطح خالص مؤثر Ae از سطح خالص An بزرگ‌تر است.");
 if(U>1)issues.push("ضریب U نباید از ۱ بیشتر باشد.");
 if(Fu<Fy)issues.push("Fu از Fy کمتر است؛ گواهی مصالح بازبینی شود.");
 if(!close(Ae,An*U,0.01))issues.push("Ae با حاصل‌ضرب An×U در تلرانس ۱٪ تطبیق ندارد؛ سطح خالص/ضریب تأخیر برشی بازبینی شود.");
 if(issues.length)return {ok:false,issues,warnings,scope:"provisional-tension-screen-only",designApproved:false};
 // MPa × cm² × 0.1 = kN.
 const nominal={
  grossYield_kN:Fy*Ag*0.1,
  netSectionRupture_kN:Fu*An*0.1,
  effectiveNetRupture_kN:Fu*Ae*0.1
 };
 const states=[
  {key:"grossYield",label:"تسلیم کششی سطح ناخالص",nominal_kN:nominal.grossYield_kN,phi:0.90,Omega:1.67,clause:"10-2-3-4(a)"},
  {key:"netRupture",label:"گسیختگی سطح خالص خارج از ناحیه اتصال",nominal_kN:nominal.netSectionRupture_kN,phi:0.75,Omega:2.00,clause:"10-2-3-4(b)"},
  {key:"effectiveNetRupture",label:"گسیختگی سطح خالص مؤثر در ناحیه اتصال",nominal_kN:nominal.effectiveNetRupture_kN,phi:0.75,Omega:2.00,clause:"10-2-3-4(c)"}
 ].map(x=>({...x,LRFD_kN:x.phi*x.nominal_kN,ASD_kN:x.nominal_kN/x.Omega}));
 const lrfd=states.reduce((a,b)=>a.LRFD_kN<=b.LRFD_kN?a:b),asd=states.reduce((a,b)=>a.ASD_kN<=b.ASD_kN?a:b);
 warnings.push("گسیختگی بلوکی، مقاومت پیچ/جوش و قطعات اتصال‌دهنده، خستگی، تمرکز تنش و اثرات برون‌محوری در این غربال محاسبه نشده‌اند.");
 warnings.push("این غربال فقط برای عضو با رفتار محوری خالص و مقادیر Ag/An/Ae/U مستند است؛ خروجی جایگزین کنترل کامل بند ۱۰-۲-۹ و بررسی مدارک رسمی نیست.");
 return {ok:true,codeBasis:"M10-1401-provisional",nominal,states,LRFD:{governing:lrfd.key,designStrength_kN:lrfd.LRFD_kN,utilization:demand/lrfd.LRFD_kN},ASD:{governing:asd.key,allowableStrength_kN:asd.ASD_kN,utilization:demand/asd.ASD_kN},demand_kN:demand,governingMember:d.governingMember||null,governingCase:d.governingCase||null,governingEnd:d.governingEnd||null,scope:"provisional-tension-screen-only",screeningOnly:true,designApproved:false,warnings,disclaimer:"نتیجه غربال مقدماتی است؛ تا تأیید متن رسمی/اصلاحیه‌ها، کنترل اتصال و بازبینی مهندس مسئول، برای طراحی اجرایی یا صدور نقشه قابل استفاده نیست."};
}
function selfTest(){
 const base={codeBasis:"M10-1401-provisional",axialOnlyVerified:true,Ag_cm2:10,An_cm2:9,Ae_cm2:8.1,U:0.9,Fy_MPa:240,Fu_MPa:360,demand_kN:100};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("calculates all three nominal limit states",()=>{const r=analyze(base);return r.ok&&r.nominal.grossYield_kN===240&&r.nominal.netSectionRupture_kN===324&&r.nominal.effectiveNetRupture_kN===291.6;});
 t("selects the lower LRFD and ASD limit state",()=>{const r=analyze(base);return r.LRFD.governing==="grossYield"&&r.ASD.governing==="grossYield";});
 t("retains exact demand provenance",()=>{const r=analyze({...base,governingMember:"B-1",governingCase:"W+X",governingEnd:"J"});return r.governingMember==="B-1"&&r.governingCase==="W+X"&&r.governingEnd==="J";});
 t("rejects unselected code basis",()=>!analyze({...base,codeBasis:"AISC-360-22"}).ok);
 t("rejects unverified non-axial action",()=>!analyze({...base,axialOnlyVerified:false}).ok);
 t("rejects missing effective area",()=>!analyze({...base,Ae_cm2:null}).ok);
 t("rejects net area greater than gross area",()=>!analyze({...base,An_cm2:11}).ok);
 t("rejects effective area greater than net area",()=>!analyze({...base,Ae_cm2:9.1}).ok);
 t("rejects U greater than one",()=>!analyze({...base,U:1.1}).ok);
 t("rejects inconsistent Ae and An times U",()=>!analyze({...base,Ae_cm2:8.5}).ok);
 t("rejects Fu lower than Fy",()=>!analyze({...base,Fu_MPa:200}).ok);
 t("never grants design approval",()=>{const r=analyze(base);return r.ok&&r.screeningOnly===true&&r.designApproved===false;});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"provisional formula-screen regression only; no official code validation or engineering approval"};
}
root.SteelTensionCapacityScreen={analyze,selfTest};
})(typeof window!=="undefined"?window:globalThis);
