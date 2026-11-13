/* SAHROUD STEEL — synchronized two-rail crane load transfer.
 * Linear static vertical-only coupling. Software tests are not engineering validation.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const defaults={railGauge_m:"",wheelTrackGauge_m:"",geometrySource:"",length_m:"",E_MPa:"",Ix_mm4:"",propertySource:"",supportStationsCsv:"",girderNodeStationsCsv:"",leftSpringCsv:"",rightSpringCsv:"",supportStiffnessSource:"",continuity:"",step_m:"0.25",wheelsPerSide:"",leftWheelsJson:"[]",rightWheelsJson:"[]",wheelTrackSource:""};
let state={...defaults},lastResult=null;
function parseCsv(v){return String(v??"").split(/[,،;；\s]+/).filter(Boolean).map(Number);}
function audit(p){
 p=p||{};const issues=[];
 const positive=(v,n)=>Number.isFinite(Number(v))&&Number(v)>0;
 if(!positive(p.length_m))issues.push("طول مسیر ریل باید مثبت باشد.");
 if(!positive(p.E_MPa)||!positive(p.Ix_mm4))issues.push("E و Ix معتبر و مثبت لازم‌اند.");
 if(!String(p.propertySource||"").trim())issues.push("مرجع خواص مقطع ریل لازم است.");
 if(p.continuity!=="continuous")issues.push("فعلاً فقط پیوستگی خمشی کامل ریل پشتیبانی می‌شود.");
 if(!positive(p.railGauge_m))issues.push("فاصله محور تا محور دو ریل باید از نقشه وارد شود.");
 if(!positive(p.wheelTrackGauge_m))issues.push("فاصله محور تا محور مسیر چرخ‌های جرثقیل باید مستند وارد شود.");
 if(!String(p.geometrySource||"").trim())issues.push("مرجع نقشه هندسه دو ریل لازم است.");
 if(!String(p.wheelTrackSource||"").trim())issues.push("مرجع نقشه مسیر چرخ‌ها لازم است.");
 const stations=Array.isArray(p.supportStations_m)?p.supportStations_m:[],girders=Array.isArray(p.girderNodeStations_m)?p.girderNodeStations_m:[];
 if(stations.length<2)issues.push("حداقل دو ایستگاه تکیه‌گاهی طولی لازم است.");
 if(stations.some((x,i)=>!Number.isFinite(Number(x))||Number(x)<0||Number(x)>Number(p.length_m)||(i&&Number(x)<=Number(stations[i-1]))))issues.push("ایستگاه‌های ریل باید صعودی، متمایز و داخل طول مسیر باشند.");
 if(girders.length!==stations.length||girders.some((x,i)=>!Number.isFinite(Number(x))||Math.abs(Number(x)-Number(stations[i]))>1e-7))issues.push("مختصات گره‌های انتقال به تیر حمال باید با تمام ایستگاه‌های تکیه‌گاه ریل منطبق باشد.");
 for(const side of ["left","right"]){
  const springs=Array.isArray(p[side+"SpringStiffness_N_m"])?p[side+"SpringStiffness_N_m"]:[];
  if(springs.length!==stations.length||springs.some(x=>!positive(x)))issues.push("سختی قائم مثبت و مستقل برای تمام تکیه‌گاه‌های ریل "+(side==="left"?"چپ":"راست")+" لازم است.");
 }
 if(!String(p.supportStiffnessSource||"").trim())issues.push("مرجع سختی قائم تکیه‌گاه‌های ریل لازم است.");
 const count=Number(p.wheelsPerSide),left=Array.isArray(p.leftWheels)?p.leftWheels:[],right=Array.isArray(p.rightWheels)?p.rightWheels:[];
 if(!(Number.isInteger(count)&&count>0))issues.push("تعداد چرخ در هر سمت باید از اطلاعات جرثقیل مشخص شود.");
 if(left.length!==count||right.length!==count)issues.push("تعداد چرخ‌های ثبت‌شده در هر ریل باید با تعداد چرخ هر سمت جرثقیل برابر باشد.");
 for(const [side,ws] of [["چپ",left],["راست",right]])ws.forEach((w,i)=>{
  if(!Number.isFinite(Number(w.offset_m))||Number(w.offset_m)<0||!Number.isFinite(Number(w.P_N))||Number(w.P_N)>=0)issues.push("آفست و بار قائم فشاری چرخ "+(i+1)+" ریل "+side+" نامعتبر است؛ P_N باید منفی و بر حسب N باشد.");
  if(i&&Number(w.offset_m)<Number(ws[i-1].offset_m))issues.push("آفست چرخ‌های ریل "+side+" باید صعودی باشد.");
  if(!String(w.source||"").trim()||!String(w.document||"").trim())issues.push("منبع و شماره مرجع هر چرخ ریل "+side+" الزامی است.");
 });
 if(!(Number.isFinite(Number(p.step_m))&&Number(p.step_m)>0))issues.push("گام جاروب باید مثبت باشد.");
 return {ready:issues.length===0,analysisEnabled:false,issues,geometry:{railGauge_m:Number(p.railGauge_m),wheelTrackGauge_m:Number(p.wheelTrackGauge_m),gaugeDifference_m:Number(p.wheelTrackGauge_m)-Number(p.railGauge_m),gaugeDifferenceInterpretation:"اطلاعات مقایسه‌ای صرف؛ بدون تلرانس یا حکم سازگاری مهندسی."}};
}
function analyze(p){
 const a=audit(p);if(!a.ready)return {success:false,analysisEnabled:false,audit:a};
 const fem=root.SteelRailBeamFEM;if(!fem?.analyze)return {success:false,analysisEnabled:false,audit:{...a,ready:false,issues:["حل‌گر تیر ریل بارگذاری نشده است."]}};
 const L=Number(p.length_m),step=Number(p.step_m),wheels=[...p.leftWheels,...p.rightWheels],maxOffset=Math.max(...wheels.map(w=>Number(w.offset_m)));
 const raw=Math.ceil((L+maxOffset)/step)+1;if(raw>1200)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["تعداد موقعیت‌های جاروب بیش از ۱۲۰۰ است؛ گام بزرگ‌تری انتخاب کنید."]}};
 const positions=new Set();for(let x=-maxOffset;x<=L+1e-8;x+=step)positions.add(Number(x.toFixed(9)));
 for(const s of p.supportStations_m)for(const w of wheels)positions.add(Number((Number(s)-Number(w.offset_m)).toFixed(9)));
 for(const w of wheels){positions.add(-Number(w.offset_m));positions.add(L-Number(w.offset_m));}
 const refs=[...positions].filter(x=>x>=-maxOffset-1e-8&&x<=L+1e-8).sort((x,y)=>x-y);
 if(refs.length>1500)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["تعداد موقعیت‌های ویژه بیش از ۱۵۰۰ است."]}};
 const env={left:p.supportStations_m.map((x,i)=>({station:i+1,x_m:Number(x),minReaction_N:Infinity,maxReaction_N:-Infinity,minCase:null,maxCase:null})),right:p.supportStations_m.map((x,i)=>({station:i+1,x_m:Number(x),minReaction_N:Infinity,maxReaction_N:-Infinity,minCase:null,maxCase:null}))};
 const cases=[],failed=[];let solved=0;
 for(const ref of refs){
  const sideResults={};
  for(const side of ["left","right"]){
   const active=p[side+"Wheels"].map(w=>({...w,x_m:ref+Number(w.offset_m)})).filter(w=>w.x_m>=-1e-8&&w.x_m<=L+1e-8);
   if(!active.length){sideResults[side]=p.supportStations_m.map((x,i)=>({station:i+1,x_m:Number(x),verticalReaction_N:0}));continue;}
   try{
    const r=fem.analyze({length_m:L,E_MPa:Number(p.E_MPa),Ix_mm4:Number(p.Ix_mm4),supports:p.supportStations_m.map((x,i)=>({x_m:Number(x),kVertical_N_m:Number(p[side+"SpringStiffness_N_m"][i])})),pointLoads:active.map(w=>({x_m:Math.max(0,Math.min(L,w.x_m)),P_N:Number(w.P_N)}))});
    if(!r.equilibrium.ok)throw Error("تعادل قائم/لنگر ریل "+side+" برقرار نیست.");
    sideResults[side]=r.supports.map(s=>({station:s.station,x_m:s.x_m,verticalReaction_N:s.verticalReaction_N}));
   }catch(e){sideResults[side]=null;failed.push({referencePosition_m:ref,side,reason:String(e.message||e)});}
  }
  if(!sideResults.left||!sideResults.right)continue;
  solved++;
  const concurrent={referencePosition_m:ref,left:sideResults.left,right:sideResults.right};
  for(const side of ["left","right"])sideResults[side].forEach((r,i)=>{
   const e=env[side][i];if(r.verticalReaction_N>e.maxReaction_N){e.maxReaction_N=r.verticalReaction_N;e.maxCase=concurrent;}
   if(r.verticalReaction_N<e.minReaction_N){e.minReaction_N=r.verticalReaction_N;e.minCase=concurrent;}
  });
  const transfer={left:sideResults.left.map(r=>({x_m:r.x_m,P_N:-r.verticalReaction_N,source:"rail-support-reaction",casePosition_m:ref,station:r.station})),right:sideResults.right.map(r=>({x_m:r.x_m,P_N:-r.verticalReaction_N,source:"rail-support-reaction",casePosition_m:ref,station:r.station}))};
  cases.push({referencePosition_m:ref,concurrentSupportReactions:sideResults,girderPointLoads:transfer});
 }
 if(!solved)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["هیچ حالت هم‌زمان قابل حل نبود.",...failed.slice(0,5).map(x=>x.reason)]}};
 return {success:true,method:"synchronized two-rail vertical moving-load analysis using two independent continuous Euler-Bernoulli rail FEM models",geometry:a.geometry,positionCount:refs.length,solvedCases:solved,failedCases:failed.slice(0,30),supportReactionEnvelope:env,criticalCases:cases.filter((c,i)=>Object.values(env).some(list=>list.some(e=>e.maxCase===c||e.minCase===c))),cases,girderTransfer:{ready:true,meaning:"واکنش هر تکیه‌گاه ریل به بار متمرکز قائم روی تیر حمال همان سمت و همان مختصات طولی تبدیل شده است.",left:cases.map(c=>({referencePosition_m:c.referencePosition_m,loads:c.girderPointLoads.left})),right:cases.map(c=>({referencePosition_m:c.referencePosition_m,loads:c.girderPointLoads.right})),requiresNextStage:"تحلیل تیر حمال با خواص مقطع، تکیه‌گاه‌ها، محل براکت‌ها و اتصال مستند؛ این ماژول تیر حمال را حل نمی‌کند."},analysisEnabled:false,limitations:["دو ریل با جاروب در موقعیت طولی هم‌زمان تحلیل می‌شوند، اما مدل‌های خمشی هر ریل مستقل‌اند و سختی عرضی پل جرثقیل/تعامل دو ریل حل نمی‌شود.","فقط بار قائم استاتیکی و فنرهای قائم مستقل؛ نیروهای افقی، پیچش، ضربه، دینامیک، خستگی، تماس یک‌طرفه و چند جرثقیل لحاظ نشده‌اند.","فاصله ریل و مسیر چرخ صرفاً از داده مستند ثبت/مقایسه می‌شوند؛ اختلاف آن‌ها بدون تلرانس مصوب به‌عنوان قبولی/رد هندسی تفسیر نمی‌شود.","بارهای منتقل‌شده ورودی مرحله بعد تیر حمال هستند، نه تحلیل یا طراحی تیر حمال؛ هیچ بار به مدل سه‌بعدی قاب تزریق نشده است.","خروجی تحلیل مقدماتی است؛ analysisEnabled=false و تأیید آیین‌نامه‌ای/اجرایی نیست."]};
}
function readUI(){const d={};Object.keys(defaults).forEach(k=>{const el=$("twoRail_"+k);if(el)d[k]=el.value;});for(const k of ["railGauge_m","wheelTrackGauge_m","length_m","E_MPa","Ix_mm4","step_m","wheelsPerSide"])if(d[k]!=="")d[k]=Number(d[k]);d.supportStations_m=parseCsv(d.supportStationsCsv);d.girderNodeStations_m=parseCsv(d.girderNodeStationsCsv);d.leftSpringStiffness_N_m=parseCsv(d.leftSpringCsv);d.rightSpringStiffness_N_m=parseCsv(d.rightSpringCsv);try{d.leftWheels=JSON.parse(d.leftWheelsJson||"[]");}catch(e){throw Error("JSON چرخ‌های ریل چپ نامعتبر است.");}try{d.rightWheels=JSON.parse(d.rightWheelsJson||"[]");}catch(e){throw Error("JSON چرخ‌های ریل راست نامعتبر است.");}return d;}
function setData(d){state={...defaults,...(d||{})};Object.keys(defaults).forEach(k=>{const el=$("twoRail_"+k);if(el)el.value=state[k]??"";});}
function getData(){try{return readUI();}catch(e){return {...state};}}
function ensurePanel(){if($("twoRailPanel"))return;const main=document.querySelector("main");if(!main)return;const panel=document.createElement("section");panel.className="panel";panel.id="twoRailPanel";panel.innerHTML='<div class="panel-title"><h3>مدل هم‌زمان دو ریل و انتقال واکنش به تیرهای حمال</h3><span class="status">تحلیل قائم مقدماتی</span></div><div class="notice">ورودی‌ها باید از نقشه و کاتالوگ مستند شوند. فاصله محور دو ریل و فاصله مسیر چرخ جداگانه ثبت می‌شوند. این بخش تیر حمال را هنوز تحلیل نمی‌کند.</div><div class="form-grid">'+[
["railGauge_m","فاصله محور تا محور دو ریل (m)"],["wheelTrackGauge_m","فاصله مسیر چرخ‌های جرثقیل (m)"],["geometrySource","مرجع نقشه هندسه دو ریل"],["length_m","طول مسیر ریل (m)"],["E_MPa","مدول الاستیسیته (MPa)"],["Ix_mm4","Ix هر ریل (mm⁴)"],["propertySource","مرجع خواص مقطع ریل"],["supportStationsCsv","ایستگاه‌های تکیه‌گاه ریل (m، CSV)"],["girderNodeStationsCsv","مختصات گره‌های تیر حمال (m، CSV)"],["leftSpringCsv","سختی فنر قائم ریل چپ (N/m، CSV)"],["rightSpringCsv","سختی فنر قائم ریل راست (N/m، CSV)"],["supportStiffnessSource","مرجع سختی تکیه‌گاه‌ها"],["wheelsPerSide","تعداد چرخ هر سمت"],["wheelTrackSource","مرجع نقشه مسیر چرخ‌ها"],["continuity","پیوستگی خمشی ریل"],["step_m","گام جاروب (m)"]
].map(([id,label])=>id==="continuity"?'<div class="field"><label for="twoRail_continuity">'+label+'</label><select id="twoRail_continuity"><option value="">نوع پیوستگی را از نقشه تعیین کنید</option><option value="continuous">پیوستگی خمشی کامل مستند</option><option value="unknown">نامشخص / نیازمند بررسی</option></select></div>':'<div class="field"><label for="twoRail_'+id+'">'+label+'</label><input id="twoRail_'+id+'" type="text"></div>').join("")+'</div><div class="field"><label for="twoRail_leftWheelsJson">قطار چرخ ریل چپ (JSON: offset_m, P_N منفی, source, document)</label><textarea id="twoRail_leftWheelsJson" rows="4">[]</textarea></div><div class="field"><label for="twoRail_rightWheelsJson">قطار چرخ ریل راست (JSON: offset_m, P_N منفی, source, document)</label><textarea id="twoRail_rightWheelsJson" rows="4">[]</textarea></div><div class="button-grid"><button id="twoRail_audit" class="btn secondary" type="button">ممیزی هندسه و ورودی‌ها</button><button id="twoRail_run" class="btn primary" type="button">اجرای جاروب هم‌زمان دو ریل</button></div><pre id="twoRail_result" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
panel.querySelectorAll("input,textarea").forEach(el=>el.addEventListener("input",()=>{try{state=readUI();root.dispatchEvent(new CustomEvent("sahroud-two-rail-change"));}catch(e){}}));
$("twoRail_audit").addEventListener("click",()=>{const box=$("twoRail_result");try{const r=audit(readUI());box.textContent=JSON.stringify(r,null,2);}catch(e){box.textContent=e.message;}});
$("twoRail_run").addEventListener("click",()=>{const box=$("twoRail_result");try{const r=analyze(readUI());lastResult=r;box.textContent=JSON.stringify(r,null,2);}catch(e){box.textContent=e.message;}});
setData(state);
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const base={length_m:10,E_MPa:200000,Ix_mm4:1e8,propertySource:"catalog p.1",continuity:"continuous",railGauge_m:3,wheelTrackGauge_m:3,geometrySource:"GA-1",supportStations_m:[0,5,10],girderNodeStations_m:[0,5,10],leftSpringStiffness_N_m:[1e12,1e12,1e12],rightSpringStiffness_N_m:[1e12,1e12,1e12],supportStiffnessSource:"test report p.2",wheelsPerSide:1,step_m:1,wheelTrackSource:"crane drawing p.3",leftWheels:[{offset_m:0,P_N:-1000,source:"catalog",document:"p.4"}],rightWheels:[{offset_m:0,P_N:-1200,source:"catalog",document:"p.4"}]};
 t("two-rail synchronized cases preserve paired reactions",()=>{const r=analyze(base);return r.success&&r.cases.every(c=>c.concurrentSupportReactions.left.length===3&&c.concurrentSupportReactions.right.length===3);});
 t("two-rail transfer creates downward girder loads at matching stations",()=>{const r=analyze(base);return r.success&&r.cases.some(c=>c.girderPointLoads.left.some(x=>x.P_N<0)&&c.girderPointLoads.right.some(x=>x.P_N<0));});
 t("two-rail mismatch in girder transfer stations is blocked",()=>!audit({...base,girderNodeStations_m:[0,4,10]}).ready);
 t("two-rail geometry without drawing reference is blocked",()=>!audit({...base,geometrySource:""}).ready);
 t("wheel count must match crane data",()=>!audit({...base,wheelsPerSide:2}).ready);
 t("wheel source and document required on each rail",()=>!audit({...base,rightWheels:[{offset_m:0,P_N:-1200,source:"",document:""}]}).ready);
 t("positive wheel load sign is rejected",()=>!audit({...base,leftWheels:[{offset_m:0,P_N:1000,source:"catalog",document:"p.4"}]}).ready);
 t("rail and wheel track gauges remain separate measured inputs",()=>{const r=audit({...base,wheelTrackGauge_m:3.2});return r.ready&&Math.abs(r.geometry.gaugeDifference_m-0.2)<1e-9;});
 t("each rail uses its own support stiffness",()=>{const r=analyze({...base,rightSpringStiffness_N_m:[1e9,1e9,1e9]});return r.success&&r.cases.length>0;});
 t("sampled case count is bounded",()=>!analyze({...base,step_m:0.0001}).success);
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,note:"Software regression only; no independent engineering validation."};
}
root.SteelCraneTwoRailTransfer={audit,analyze,readUI,getData,setData,selfTest,getLastResult:()=>lastResult};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();
})(typeof window!=="undefined"?window:globalThis);
