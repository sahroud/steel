(function(root){
"use strict";
function num(x){const n=Number(x);return Number.isFinite(n)?n:null;}
function toLegacyPayload(project){
 const x=project?.inputs||{};
 const span=num(x.span),length=num(x.length),spacing=num(x.frameSpacing),height=num(x.columnHeight),slope=num(x.roofSlope);
 const rise=span&&slope?(x.roofType==="mono"?span*slope/100:span/2*slope/100):null;
 const avg=(a,b)=>{const aa=num(a),bb=num(b);return aa===null||bb===null?null:(aa+bb)/2;};
 return {
  schema:"sahroud-steel-legacy-engine-bridge",version:1,
  project:{projectName:x.projectName||"",owner:x.owner||"",designer:x.designer||"",city:x.city||""},
  geometry:{span,length,spacing,height,rise,roofType:x.roofType||"gable",roofSlope:slope,frameCount:span&&length&&spacing?Math.ceil(length/spacing)+1:null},
  supports:{baseConnection:x.baseCondition==="fixed"?"fixed":"pinned"},
  material:{steelGrade:x.steelGrade||"ST37",Fy_MPa:num(x.steelFy),E_GPa:num(x.steelE),concreteGrade:x.concreteGrade||"C25"},
  loads:{
   deadLeft:num(x.deadLoad),deadRight:num(x.deadLoad),liveLeft:num(x.liveLoad),liveRight:num(x.liveLoad),
   snowLeft:num(x.snowLoad),snowRight:num(x.snowLoad),
   windLeft:null,windRight:null,windWall:null,windEndFront:null,windEndBack:null,
   climate:{city:x.city||"",groundSnow:num(x.snowLoad),basicWind:null,terrain:x.terrain||"",openingState:x.enclosure||"enclosed",source:x.climateSource||""},
   legacyAverages:{dead:avg(x.deadLoad,x.deadLoad),live:avg(x.liveLoad,x.liveLoad),snow:avg(x.snowLoad,x.snowLoad)}
  },
  foundation:{soilType:x.soilType||"",soilQa:num(x.soilQa),soilQaBasis:x.soilQaBasis||"",soilSource:x.soilSource||""},
  compatibility:{legacy3DModelSupportsGableOnly:true,monoSlopeReady:false,windLoadsRequireVerifiedSurfacePressures:true,sectionDatabaseMustBePopulated:true,codeLoadCombinationsRequireVerification:true}
 };
}
function validateForEngine(project){
 const p=toLegacyPayload(project),errors=[],warnings=[];
 if(!p.geometry.span||!p.geometry.length||!p.geometry.spacing||!p.geometry.height)errors.push("ابعاد اصلی هندسه کامل نیست.");
 if(!p.material.Fy_MPa||!p.material.E_GPa)errors.push("خواص فولاد کامل نیست.");
 if(p.geometry.roofType==="mono")warnings.push("موتور مدل سه‌بعدی قدیمی فقط هندسه دوشیب را پشتیبانی می‌کند؛ تحلیل تک‌شیب تا توسعه هندسه مستقل مسدود است.");
 if(p.loads.climate.basicWind===null)warnings.push("سرعت مبنای باد و منبع معتبر وارد نشده؛ بار باد قابل تولید نیست.");
 if(p.loads.climate.groundSnow===null)warnings.push("بار برف معتبر وارد نشده؛ ترکیبات برف قابل تأیید نیستند.");
 if(!p.foundation.soilType||!p.foundation.soilQa)warnings.push("داده ژئوتکنیک ناقص است؛ کنترل نهایی فونداسیون قابل انجام نیست.");
 return {payload:p,errors,warnings,ready:errors.length===0};
}
root.SahroudEngineAdapter={toLegacyPayload,validateForEngine};
})(window);