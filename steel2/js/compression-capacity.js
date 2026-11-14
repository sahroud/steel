/* SAHROUD STEEL — axial compression resistance engine (doubly-symmetric I only).
 * Formula basis: M10-1401 clause family 10-2-4; implementation scope is deliberately
 * restricted to global flexural/torsional buckling of compact, doubly-symmetric I sections.
 * Local slender-element reduction, built-up member effects, flexural-torsional coupling
 * for singly/asymmetric sections, imperfections, second-order analysis and seismic checks
 * are not included. Never treat this module alone as final member approval.
 */
(function(root){
"use strict";
const PI=Math.PI;
function finitePositive(v){return Number.isFinite(Number(v))&&Number(v)>0;}
function fcrFromFe(Fy,Fe){
 if(!finitePositive(Fy)||!finitePositive(Fe))throw Error("Fy و Fe باید مثبت باشند.");
 const ratio=Fy/Fe;
 return ratio<=2.25?{Fcr:Math.pow(0.658,ratio)*Fy,branch:"inelastic"}:{Fcr:0.877*Fe,branch:"elastic"};
}
function analyze(input){
 const d=input||{},issues=[],warnings=[];
 const required=["Ag_mm2","Ix_mm4","Iy_mm4","J_mm4","h0_mm","Lx_mm","Ly_mm","Lz_mm","Kx","Ky","Kz","Fy_MPa","E_MPa","G_MPa"];
 required.forEach(k=>{if(!finitePositive(d[k]))issues.push(k+" باید مقدار مثبت و معتبر داشته باشد.");});
 const E=Number(d.E_MPa),G=Number(d.G_MPa);
 if(!finitePositive(E)||!finitePositive(G))issues.push("E و G باید مثبت باشند.");
 if(d.sectionType!=="doubly-symmetric-I")issues.push("نسخه فعلی فقط برای مقطع I دارای دو محور تقارن معتبر است.");
 if(d.localSlendernessReviewed!==true)issues.push("کنترل لاغری موضعی بال و جان طبق جدول‌های مبحث دهم ثبت نشده است.");
 if(d.localSlendernessClass!=="non-slender")issues.push("این نسخه فقط مقاطع غیرلاغر را می‌پذیرد؛ برای اجزای لاغر باید سطح مقطع مؤثر و ضوابط بند ۱۰-۲-۴-۷ پیاده‌سازی شود.");
 if(issues.length)return {ok:false,issues,warnings,scope:"global-buckling-only",disclaimer:"ظرفیت ارائه نشد؛ داده‌ها یا دامنه کاربرد کامل نیست."};
 const A=Number(d.Ag_mm2),Ix=Number(d.Ix_mm4),Iy=Number(d.Iy_mm4),J=Number(d.J_mm4),h0=Number(d.h0_mm);
 const rx=Math.sqrt(Ix/A),ry=Math.sqrt(Iy/A);
 const lambdaX=Number(d.Kx)*Number(d.Lx_mm)/rx,lambdaY=Number(d.Ky)*Number(d.Ly_mm)/ry;
 const lambdaZ=Math.max(lambdaX,lambdaY);
 const Cw=Iy*h0*h0/4;
 const FeX=PI*PI*E/(lambdaX*lambdaX),FeY=PI*PI*E/(lambdaY*lambdaY);
 const kzLz=Number(d.Kz)*Number(d.Lz_mm);
 const FeT=(PI*PI*E*Cw/(kzLz*kzLz)+G*J)/(Ix+Iy);
 const modes=[{mode:"flexural-x",Fe:FeX},{mode:"flexural-y",Fe:FeY},{mode:"torsional",Fe:FeT}].sort((a,b)=>a.Fe-b.Fe);
 const governing=modes[0],curve=fcrFromFe(Number(d.Fy_MPa),governing.Fe);
 warnings.push("نسبت‌های لاغری حول دو محور گزارش شده‌اند؛ هیچ سقف عددی عمومی بدون ارجاع قطعی به بند قابل اعمال و شرایط پروژه به‌صورت خودکار تحمیل نشده است.");
 if(!finitePositive(FeT))issues.push("تنش بحرانی کمانش پیچشی معتبر نیست؛ J و Cw و طول مهارنشده پیچشی بازبینی شود.");
 if(issues.length)return {ok:false,issues,warnings,slenderness:{x:lambdaX,y:lambdaY},elasticCriticalStress_MPa:{x:FeX,y:FeY,torsional:FeT},scope:"global-buckling-only",disclaimer:"مقاومت طراحی ارائه نشد."};
 const Pn=curve.Fcr*A/1000,phiPn=0.9*Pn,allowable=Pn/1.67;
 warnings.push("فقط کمانش خمشی حول دو محور و کمانش پیچشی مقطع I دو‌محوره بررسی شده‌اند.");
 warnings.push("کمانش موضعی فقط با فرض صریح غیرلاغر بودن مقطع پذیرفته شده؛ بررسی مستقل جدول‌های مبحث دهم باید در پرونده طراحی ثبت شود.");
 warnings.push("این خروجی اندرکنش فشار و خمش، تحلیل مرتبه دوم، اثرات لرزه‌ای، اعضای متغیرمقطع و ضوابط اعضای مرکب را پوشش نمی‌دهد.");
 return {ok:true,issues,warnings,scope:"global-buckling-only",section:{Ag_mm2:A,rx_mm:rx,ry_mm:ry,Cw_mm6:Cw},slenderness:{x:lambdaX,y:lambdaY,max:Math.max(lambdaX,lambdaY)},elasticCriticalStress_MPa:{x:FeX,y:FeY,torsional:FeT},governingMode:governing.mode,Fe_MPa:governing.Fe,Fcr_MPa:curve.Fcr,curveBranch:curve.branch,Pn_kN:Pn,LRFD:{phi:0.9,designStrength_kN:phiPn},ASD:{Omega:1.67,allowableStrength_kN:allowable},disclaimer:"محاسبه محدود مقاومت کمانش کلی برای مقطع I دو‌محوره متقارن و غیرلاغر؛ این نتیجه به‌تنهایی تأیید نهایی طراحی یا مجوز اجرا نیست."};
}
function selfTest(){
 const base={sectionType:"doubly-symmetric-I",Ag_mm2:10000,Ix_mm4:8e8,Iy_mm4:1e8,J_mm4:2e6,h0_mm:500,Lx_mm:6000,Ly_mm:6000,Lz_mm:6000,Kx:1,Ky:1,Kz:1,Fy_MPa:235,E_MPa:200000,G_MPa:76923,localSlendernessReviewed:true,localSlendernessClass:"non-slender"};
 const tests=[];
 const t=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("valid doubly symmetric I section",()=>analyze(base).ok);
 t("flexural and torsional modes reported",()=>{const r=analyze(base);return !!r.elasticCriticalStress_MPa.x&&!!r.elasticCriticalStress_MPa.y&&!!r.elasticCriticalStress_MPa.torsional&&r.governingMode;});
 t("LRFD and ASD factors",()=>{const r=analyze(base);return Math.abs(r.LRFD.designStrength_kN/r.Pn_kN-.9)<1e-12&&Math.abs(r.Pn_kN/r.ASD.allowableStrength_kN-1.67)<1e-12;});
 t("invalid missing dimensions rejected",()=>!analyze({...base,Lx_mm:0}).ok);
 t("missing elastic properties rejected without defaults",()=>!analyze({...base,E_MPa:null}).ok&&!analyze({...base,G_MPa:null}).ok);
 t("asymmetric section rejected",()=>!analyze({...base,sectionType:"channel"}).ok);
 t("local slenderness not reviewed rejected",()=>!analyze({...base,localSlendernessReviewed:false}).ok);
 t("slender elements require effective-area implementation",()=>!analyze({...base,localSlendernessClass:"slender"}).ok);
 t("large slenderness is reported without unverified cutoff",()=>{const r=analyze({...base,Lx_mm:30000,Ly_mm:30000,Lz_mm:30000});return r.ok&&r.slenderness.max>200&&r.warnings.some(x=>x.includes("سقف عددی"));});
 t("inelastic column curve branch",()=>fcrFromFe(235,200).branch==="inelastic");
 t("elastic column curve branch",()=>fcrFromFe(235,80).branch==="elastic");
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests,scope:"deterministic formula/software tests only"};
}
root.SteelCompressionCapacity={analyze,selfTest};
})(typeof window!=="undefined"?window:globalThis);
