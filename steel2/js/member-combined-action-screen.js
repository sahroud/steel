/* SAHROUD STEEL — biaxial axial/flexural interaction screen.
 * H1-style interaction pattern only; exact M10-1401 clause/equation mapping has NOT been verified.
 * Uses externally verified LRFD design strengths; it does not calculate member capacities.
 * Demand convention: N_kN > 0 tension, N_kN < 0 compression; moments are absolute magnitudes.
 * Shear, torsion resistance, connection resistance and seismic detailing are separate checks.
 */
(function(root){"use strict";
const finitePositive=v=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function evaluate(d){
 d=d||{};const issues=[],warnings=[];
 if(d.codeBasis!=="H1-pattern-unverified-M10")issues.push("مبنای مبحث دهم ۱۴۰۱ به‌صورت صریح انتخاب نشده است.");
 if(d.officialTextVerified!==true)warnings.push("متن رسمی/اصلاحیه‌ها در این موتور مستقلاً تطبیق نشده‌اند؛ فرمول فقط غربال مقدماتی است.");
 if(d.capacityBasisVerified!==true)issues.push("مبنای ظرفیت‌های طراحی LRFD باید توسط مهندس و با ارجاع مستند تأیید شود.");
 if(d.secondOrderVerified!==true)issues.push("تأیید تحلیل مرتبه دوم/اثرات پایداری برای تقاضاهای مورد استفاده لازم است.");
 if(d.localSlendernessVerified!==true)issues.push("طبقه‌بندی لاغری موضعی مقطع طبق مبحث دهم تأیید نشده است.");
 if(!finite(d.N_kN))issues.push("نیروی محوری هم‌زمان N_kN باید عددی و با قرارداد علامت مشخص باشد.");
 ["Mx_kNm","My_kNm"].forEach(k=>{if(!finite(d[k])||d[k]<0)issues.push(k+" باید قدرمطلق لنگر هم‌زمان و نامنفی باشد.");});
 const tension=finite(d.N_kN)&&d.N_kN>=0;
 const axial=tension?d.tensionDesignStrengthKN:d.compressionDesignStrengthKN;
 const axialLabel=tension?"مقاومت طراحی کششی":"مقاومت طراحی فشاری";
 if(!finitePositive(axial))issues.push(axialLabel+" مستند و مثبت لازم است.");
 if(!finitePositive(d.momentDesignStrengthXKNm))issues.push("مقاومت طراحی خمشی محور X لازم است.");
 if(!finitePositive(d.momentDesignStrengthYKNm))issues.push("مقاومت طراحی خمشی محور Y لازم است.");
 if(d.torsionChecked!==true&&(!finite(d.torsionDemandKNm)||Math.abs(d.torsionDemandKNm)>1e-9))issues.push("پیچش عضو صفر/کنترل‌شده نیست؛ این موتور اندرکنش پیچش را پوشش نمی‌دهد.");
 if(issues.length)return{ok:false,issues,warnings,screeningOnly:true,designApproved:false,codeBasis:"H1-pattern-unverified-M10"};
 const Pr=Math.abs(d.N_kN),Mrx=d.Mx_kNm,Mry=d.My_kNm;
 const axialRatio=Pr/axial,momentRatioX=Mrx/d.momentDesignStrengthXKNm,momentRatioY=Mry/d.momentDesignStrengthYKNm;
 const branch=axialRatio>=0.20?"axial-dominant":"flexure-dominant";
 const interactionRatio=branch==="axial-dominant"?axialRatio+(8/9)*(momentRatioX+momentRatioY):axialRatio/2+momentRatioX+momentRatioY;
 warnings.push("برش، پیچش، کمانش موضعی محاسباتی، اندرکنش با اثرات موضعی جان/بال، اتصالات و الزامات لرزه‌ای باید جداگانه کنترل شوند.");
 warnings.push("مقاومت‌های طراحی ورودی از این موتور تولید نمی‌شوند؛ صحت مقطع، مهاربندی و ظرفیت‌های φRn باید مستقل مستند شود.");
 return{ok:true,branch,axialMode:tension?"tension":"compression",axialDesignStrengthKN:axial,axialRatio,momentRatioX,momentRatioY,interactionRatio,limit:1,pass:interactionRatio<=1+1e-12,LRFD:{interactionRatio,pass:interactionRatio<=1+1e-12},codeBasis:"H1-pattern-unverified-M10",clause:null,referenceStatus:"M10-1401 exact clause/equation not verified",screeningOnly:true,designApproved:false,warnings};
}
function selfTest(){
 const base={codeBasis:"H1-pattern-unverified-M10",officialTextVerified:false,capacityBasisVerified:true,secondOrderVerified:true,localSlendernessVerified:true,N_kN:-100,Mx_kNm:20,My_kNm:10,compressionDesignStrengthKN:400,tensionDesignStrengthKN:300,momentDesignStrengthXKNm:100,momentDesignStrengthYKNm:80,torsionDemandKNm:0,torsionChecked:false};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("compression axial-dominant branch",()=>{const r=evaluate({...base,N_kN:-160,Mx_kNm:10,My_kNm:8});return r.ok&&r.branch==="axial-dominant"&&Math.abs(r.interactionRatio-(0.4+(8/9)*(0.1+0.1)))<1e-12;});
 t("flexure-dominant branch",()=>{const r=evaluate({...base,N_kN:-40,Mx_kNm:20,My_kNm:16});return r.ok&&r.branch==="flexure-dominant"&&Math.abs(r.interactionRatio-(0.05+0.2+0.2))<1e-12;});
 t("exact 0.20 threshold uses axial-dominant branch",()=>evaluate({...base,N_kN:-80,Mx_kNm:0,My_kNm:0}).branch==="axial-dominant");
 t("tension uses tensile design strength",()=>{const r=evaluate({...base,N_kN:150,tensionDesignStrengthKN:300,compressionDesignStrengthKN:900,Mx_kNm:0,My_kNm:0});return r.ok&&r.axialMode==="tension"&&r.axialDesignStrengthKN===300&&r.axialRatio===0.5;});
 t("compression uses compressive design strength",()=>{const r=evaluate({...base,N_kN:-200,tensionDesignStrengthKN:900,compressionDesignStrengthKN:400,Mx_kNm:0,My_kNm:0});return r.ok&&r.axialMode==="compression"&&r.axialDesignStrengthKN===400&&r.axialRatio===0.5;});
 t("rejects missing axial or biaxial capacities",()=>!evaluate({...base,momentDesignStrengthYKNm:null}).ok&&!evaluate({...base,compressionDesignStrengthKN:null}).ok);
 t("rejects unverified second-order effects",()=>!evaluate({...base,secondOrderVerified:false}).ok);
 t("rejects unverified local slenderness",()=>!evaluate({...base,localSlendernessVerified:false}).ok);
 t("rejects nonzero torsion without separate verification",()=>!evaluate({...base,torsionDemandKNm:5,torsionChecked:false}).ok);
 t("allows separately verified torsion but keeps separate warning",()=>evaluate({...base,torsionDemandKNm:5,torsionChecked:true}).ok);
 t("over-utilized member is not passed",()=>evaluate({...base,N_kN:-400,Mx_kNm:50,My_kNm:40}).pass===false);
 t("never grants design approval",()=>evaluate(base).designApproved===false&&evaluate(base).screeningOnly===true);
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"H1-style interaction pattern regression only; exact M10-1401 mapping unverified; externally verified capacities required; no approval"};
}
root.SteelMemberCombinedActionScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);
