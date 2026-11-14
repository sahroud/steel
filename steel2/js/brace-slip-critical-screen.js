(function(root){
"use strict";
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function evaluate(input){
 const x=input||{},issues=[];
 const req=["boltCount","boltPretension_kN","slipCoefficient","slipPlanes","holeClass","fillersCount","slipDemand_kN","tensionDemand_kN","tensionBolts"];
 const v={};req.forEach(k=>{v[k]=num(x[k]);if(v[k]===null)issues.push("ورودی عددی معتبر برای "+k+" لازم است.");});
 if(!["standard","short-perpendicular","oversized","short-parallel","long-slot"].includes(x.holeClass))issues.push("نوع سوراخ باید صریح و در دامنه پشتیبانی باشد.");
 if(x.surfaceClass!=="A"&&x.surfaceClass!=="B"&&x.surfaceClass!=="tested")issues.push("کلاس سطح اصطکاک باید A/B یا نتیجه آزمون مستند باشد.");
 if(x.surfaceClass==="tested"&&(!x.slipTestReference||!String(x.slipTestReference).trim()))issues.push("مرجع آزمون ضریب لغزش لازم است.");
 if(x.pretensionVerified!==true)issues.push("پیش‌تنیدگی نصب‌شده باید مستند و تأیید شود.");
 if(x.bearingTypeChecksComplete!==true)issues.push("کنترل‌های حدحالت bearing-type برای اتصال لغزش‌بحرانی هنوز تأیید نشده‌اند.");
 if(x.loadCaseReference==null||!String(x.loadCaseReference).trim())issues.push("شناسه ترکیب بار/حالت بار لازم است.");
 if(x.connectionDrawingReference==null||!String(x.connectionDrawingReference).trim())issues.push("مرجع نقشه اتصال لازم است.");
 if(Object.values(v).some(z=>z===null))return result();
 if(v.boltCount<1||v.boltCount%1||v.slipPlanes<1||v.slipPlanes%1||v.fillersCount<0||v.fillersCount%1||v.tensionBolts<1||v.tensionBolts>v.boltCount||v.tensionBolts%1)issues.push("تعداد پیچ، صفحات لغزش، فیلر و پیچ‌های حامل کشش نامعتبر است.");
 if(v.boltPretension_kN<=0||v.slipCoefficient<=0||v.slipCoefficient>1||v.slipDemand_kN<0||v.tensionDemand_kN<0)issues.push("مقادیر مقاومت/تقاضا خارج از دامنه مجاز هستند.");
 if(issues.length)return result();
 const phi=({"standard":1,"short-perpendicular":1,"oversized":0.85,"short-parallel":0.85,"long-slot":0.70})[x.holeClass];
 const Du=num(x.Du)===null?1.13:num(x.Du),hf=v.fillersCount>=2?0.85:1.0;
 if(Du<=0||Du>2){issues.push("Du باید مستند و در بازه قابل قبول باشد.");return result();}
 const RnPerBolt=v.slipCoefficient*Du*hf*v.boltPretension_kN*v.slipPlanes;
 const ksc=Math.max(0,1-v.tensionDemand_kN/(Du*v.boltPretension_kN*v.tensionBolts));
 const available=phi*RnPerBolt*ksc*v.boltCount;
 const utilization=available>0?v.slipDemand_kN/available:(v.slipDemand_kN===0?0:Infinity);
 const pass=issues.length===0&&utilization<=1;
 return {ok:issues.length===0,pass,issues,method:"AISC 360-22 J3.9/J3.10 LRFD slip-resistance screen",nominalSlipResistancePerBolt_kN:RnPerBolt,phi,Du,hf,slipPlanes:v.slipPlanes,k_sc:ksc,availableSlipResistance_kN:available,slipDemand_kN:v.slipDemand_kN,utilization,governingCase:String(x.loadCaseReference),analysisEnabled:false,designApproved:false,scope:"Slip limit state only; bearing-type bolt/plate limit states, fatigue, eccentric bolt-group distribution and code adoption for Iranian projects require separate verification."};
 function result(){return {ok:false,pass:false,issues,analysisEnabled:false,designApproved:false,method:"AISC 360-22 J3.9/J3.10 LRFD slip-resistance screen"};}
}
function selfTest(){
 const base={boltCount:4,boltPretension_kN:100,slipCoefficient:.3,slipPlanes:1,holeClass:"standard",fillersCount:0,slipDemand_kN:80,tensionDemand_kN:20,tensionBolts:4,surfaceClass:"A",pretensionVerified:true,bearingTypeChecksComplete:true,loadCaseReference:"ULS-1",connectionDrawingReference:"D-01"};
 const a=evaluate(base),b=evaluate({...base,pretensionVerified:false}),c=evaluate({...base,holeClass:"unsupported"}),d=evaluate({...base,tensionDemand_kN:500});
 const checks=[a.ok&&a.availableSlipResistance_kN>0&&!a.designApproved,!b.ok,b.issues.length>0,!c.ok,!d.pass&&d.k_sc===0];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,checks};
}
root.SteelBraceSlipCriticalScreen={evaluate,selfTest};
})(typeof window!=="undefined"?window:globalThis);
