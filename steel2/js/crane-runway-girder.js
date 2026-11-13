/* SAHROUD STEEL — preliminary crane runway girder FEM.
 * Synchronized rail reaction cases are solved separately for left/right girders.
 * Linear vertical Euler-Bernoulli model only; not design approval.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const defaults={length_m:"",leftE_MPa:"200000",leftIx_mm4:"",leftPropertySource:"",rightE_MPa:"200000",rightIx_mm4:"",rightPropertySource:"",supportStationsCsv:"",leftSpringCsv:"",rightSpringCsv:"",supportStiffnessSource:"",detailSource:""};
let state={...defaults},lastResult=null;
const nums=v=>String(v??"").split(/[,،;；\s]+/).filter(Boolean).map(Number);
function audit(p){
 p=p||{};const issues=[],s=Array.isArray(p.supportStations_m)?p.supportStations_m:[];
 if(!(Number.isFinite(+p.length_m)&&+p.length_m>0))issues.push("طول تیر حمال باید مثبت باشد.");
 if(s.length<2)issues.push("حداقل دو تکیه‌گاه/براکت لازم است.");
 if(s.length>=2&&Number.isFinite(+p.length_m)&&+p.length_m>0&&(Math.abs(+s[0])>1e-8||Math.abs(+s[s.length-1]- +p.length_m)>1e-8))issues.push("برای این مدل تیر، تکیه‌گاه ابتدا و انتهای طول تیر باید صریحاً تعریف شوند؛ کنسول فقط با مدل هندسی جداگانه مجاز است.");
 if(s.some((x,i)=>!Number.isFinite(+x)||+x<0||+x>+p.length_m||(i&&+x<=+s[i-1])))issues.push("مختصات تکیه‌گاه‌ها باید صعودی، متمایز و داخل طول تیر باشند.");
 if(!String(p.supportStiffnessSource||"").trim())issues.push("مرجع سختی تکیه‌گاه/براکت لازم است.");
 if(!String(p.detailSource||"").trim())issues.push("مرجع نقشه جزئیات تیر حمال و براکت‌ها لازم است.");
 for(const side of ["left","right"]){
  if(!(Number.isFinite(+p[side+"E_MPa"])&&+p[side+"E_MPa"]>0))issues.push("E تیر حمال "+side+" نامعتبر است.");
  if(!(Number.isFinite(+p[side+"Ix_mm4"])&&+p[side+"Ix_mm4"]>0))issues.push("Ix تیر حمال "+side+" نامعتبر است.");
  if(!String(p[side+"PropertySource"]||"").trim())issues.push("مرجع خواص مقطع تیر حمال "+side+" لازم است.");
  const k=Array.isArray(p[side+"SpringStiffness_N_m"])?p[side+"SpringStiffness_N_m"]:[];
  if(k.length!==s.length||k.some(x=>!(Number.isFinite(+x)&&+x>0)))issues.push("سختی قائم مثبت و مستقل همه براکت‌های تیر حمال "+side+" لازم است.");
 }
 return {ready:issues.length===0,analysisEnabled:false,issues};
}
function analyze(p,transfer){
 const a=audit(p);if(!a.ready)return {success:false,analysisEnabled:false,audit:a};
 if(!transfer?.success||!Array.isArray(transfer.cases)||!transfer.cases.length)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["ابتدا جاروب هم‌زمان دو ریل را اجرا کنید."]}};
 const caseKeys=transfer.cases.map((c,i)=>String(c.caseId??c.id??i));
 if(new Set(caseKeys).size!==caseKeys.length)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["شناسه حالت‌های بار دو ریل تکراری است؛ هم‌زمانی حالات قابل اثبات نیست."]}};
 for(const [i,c] of transfer.cases.entries()){
  for(const side of ["left","right"]){const loads=c.girderPointLoads?.[side];if(!Array.isArray(loads)||!loads.length)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["حالت "+caseKeys[i]+" برای تیر "+side+" فاقد بار چرخ است؛ تحلیل ناقص دو ریل متوقف شد."]}};
   if(loads.some(x=>!Number.isFinite(Number(x.x_m))||Number(x.x_m)<0||Number(x.x_m)>Number(p.length_m)||!Number.isFinite(Number(x.P_N))||Number(x.P_N)===0))return {success:false,analysisEnabled:false,audit:{ready:false,issues:["مختصات یا مقدار بار چرخ در حالت "+caseKeys[i]+" و تیر "+side+" نامعتبر است."]}};
  }
 }
 const fem=root.SteelRailBeamFEM;if(!fem?.analyze)return {success:false,analysisEnabled:false,audit:{ready:false,issues:["حل‌گر تیر FEM بارگذاری نشده است."]}};
 const results={left:[],right:[]},failures=[];
 for(const [caseIndex,c] of transfer.cases.entries())for(const side of ["left","right"]){
  const loads=c.girderPointLoads[side];
  try{
   const r=fem.analyze({length_m:+p.length_m,E_MPa:+p[side+"E_MPa"],Ix_mm4:+p[side+"Ix_mm4"],supports:p.supportStations_m.map((x,i)=>({x_m:+x,kVertical_N_m:+p[side+"SpringStiffness_N_m"][i]})),pointLoads:loads.map(x=>({x_m:+x.x_m,P_N:+x.P_N}))});
   if(!r.equilibrium?.ok)throw Error("تعادل تیر حمال برقرار نیست.");
   results[side].push({caseIndex,caseId:caseKeys[caseIndex],referencePosition_m:c.referencePosition_m,loadCount:loads.length,result:r});
  }catch(e){failures.push({caseIndex,side,reason:String(e.message||e)});}
 }
 const envelopes={};
 for(const side of ["left","right"]){
  const rows=results[side];envelopes[side]={solvedCases:rows.length,maxAbsNodalDeflection_m:0,governingDeflectionCase:null,maxAbsElementEndShear_N:0,governingShearCase:null,maxAbsElementEndMoment_Nm:0,governingMomentCase:null};
  rows.forEach(x=>{const d=Math.abs(x.result.maxNodalDeflection?.value||0);if(d>envelopes[side].maxAbsNodalDeflection_m){envelopes[side].maxAbsNodalDeflection_m=d;envelopes[side].governingDeflectionCase=x.caseIndex;}const shear=Math.max(0,...x.result.elements.flatMap(e=>[Math.abs(e.endActions[0]),Math.abs(e.endActions[2])])),moment=Math.max(0,...x.result.elements.flatMap(e=>[Math.abs(e.endActions[1]),Math.abs(e.endActions[3])]));if(shear>envelopes[side].maxAbsElementEndShear_N){envelopes[side].maxAbsElementEndShear_N=shear;envelopes[side].governingShearCase=x.caseIndex;}if(moment>envelopes[side].maxAbsElementEndMoment_Nm){envelopes[side].maxAbsElementEndMoment_Nm=moment;envelopes[side].governingMomentCase=x.caseIndex;}});
 }
 return {success:failures.length===0&&results.left.length===transfer.cases.length&&results.right.length===transfer.cases.length,analysisEnabled:false,method:"separate linear Euler-Bernoulli vertical FEM for two runway girders using synchronized rail reactions",length_m:+p.length_m,caseCount:transfer.cases.length,solvedCases:{left:results.left.length,right:results.right.length},failedCases:failures,envelopes,cases:results,units:{force:"N",length:"m",moment:"N.m",spring:"N/m"},limitations:["مدل تیر حمال یک‌بعدی، خطی، قائم و با EI ثابت است.","سختی براکت/اتصال فقط به شکل فنر قائم معادل وارد می‌شود.","بارهای افقی، پیچش، warping، خمش حول محور ضعیف و کمانش پیچشی-جانبی مدل نشده‌اند.","web crippling، خمش موضعی بال، سخت‌کننده، جوش، پیچ، خستگی و اثر ضربه کنترل نشده‌اند.","سختی عرضی پل جرثقیل بین دو ریل مدل نشده است.","خروجی مقدماتی است و تأیید آیین‌نامه‌ای یا طراحی اجرایی نیست."]};
}
function readUI(){const p={};Object.keys(defaults).forEach(k=>{const e=$("runwayGirder_"+k);if(e)p[k]=e.value;});for(const k of ["length_m","leftE_MPa","leftIx_mm4","rightE_MPa","rightIx_mm4"])p[k]=Number(p[k]);p.supportStations_m=nums(p.supportStationsCsv);p.leftSpringStiffness_N_m=nums(p.leftSpringCsv);p.rightSpringStiffness_N_m=nums(p.rightSpringCsv);return p;}
function setData(d){state={...defaults,...(d||{})};Object.keys(defaults).forEach(k=>{const e=$("runwayGirder_"+k);if(e)e.value=state[k]??"";});}
function getData(){try{return readUI();}catch(e){return {...state};}}
function ensurePanel(){
 if($("runwayGirderPanel"))return;const main=document.querySelector("main");if(!main)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="runwayGirderPanel";
 const fields=[["length_m","طول تیر حمال (m)"],["leftE_MPa","E تیر چپ (MPa)"],["leftIx_mm4","Ix تیر چپ (mm⁴)"],["leftPropertySource","مرجع مقطع چپ"],["rightE_MPa","E تیر راست (MPa)"],["rightIx_mm4","Ix تیر راست (mm⁴)"],["rightPropertySource","مرجع مقطع راست"],["supportStationsCsv","ایستگاه براکت‌ها (m، CSV)"],["leftSpringCsv","سختی براکت چپ (N/m، CSV)"],["rightSpringCsv","سختی براکت راست (N/m، CSV)"],["supportStiffnessSource","مرجع سختی براکت‌ها"],["detailSource","مرجع نقشه تیر حمال و براکت‌ها"]];
 panel.innerHTML='<div class="panel-title"><h3>تحلیل مقدماتی تیرهای حمال جرثقیل</h3><span class="status">FEM قائم</span></div><div class="notice">ابتدا جاروب هم‌زمان دو ریل را اجرا کنید. هر حالت مشترک جداگانه به دو تیر حمال منتقل می‌شود؛ بیشینه‌های غیرهم‌زمان جمع نمی‌شوند. تمام خواص و سختی‌ها باید مستند باشند.</div><div class="form-grid">'+fields.map(([k,l])=>'<div class="field"><label for="runwayGirder_'+k+'">'+l+'</label><input id="runwayGirder_'+k+'" type="text"></div>').join("")+'</div><div class="button-grid"><button id="runwayGirder_audit" class="btn secondary" type="button">ممیزی ورودی</button><button id="runwayGirder_run" class="btn primary" type="button">تحلیل دو تیر حمال</button></div><pre id="runwayGirder_result" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
 panel.querySelectorAll("input").forEach(e=>e.addEventListener("input",()=>{try{state=readUI();root.dispatchEvent(new CustomEvent("sahroud-runway-girder-change"));}catch(x){}}));
 $("runwayGirder_audit").addEventListener("click",()=>{$("runwayGirder_result").textContent=JSON.stringify(audit(readUI()),null,2);});
 $("runwayGirder_run").addEventListener("click",()=>{try{lastResult=analyze(readUI(),root.SteelCraneTwoRailTransfer?.getLastResult?.());$("runwayGirder_result").textContent=JSON.stringify(lastResult,null,2);}catch(e){$("runwayGirder_result").textContent=e.message;}});
 setData(state);
}
function selfTest(){
 const t=[],test=(name,fn)=>{try{t.push({name,ok:!!fn()});}catch(e){t.push({name,ok:false,error:String(e.message||e)});}};
 const p={length_m:10,leftE_MPa:200000,leftIx_mm4:1e8,leftPropertySource:"catalog L",rightE_MPa:200000,rightIx_mm4:1.2e8,rightPropertySource:"catalog R",supportStations_m:[0,5,10],leftSpringStiffness_N_m:[1e12,1e12,1e12],rightSpringStiffness_N_m:[1e12,1e12,1e12],supportStiffnessSource:"test report",detailSource:"GA-2"};
 const tr={success:true,cases:[{referencePosition_m:0,girderPointLoads:{left:[{x_m:5,P_N:-1000}],right:[{x_m:5,P_N:-1200}]}}]};
 test("left/right sections audited independently",()=>audit(p).ready);
 test("missing section source rejected",()=>!audit({...p,leftPropertySource:""}).ready);
 test("missing bracket stiffness rejected",()=>!audit({...p,rightSpringStiffness_N_m:[]}).ready);
 test("unsorted supports rejected",()=>!audit({...p,supportStations_m:[0,5,4]}).ready);
 test("both girders solved from same transfer case",()=>{const r=analyze(p,tr);return r.success&&r.solvedCases.left===1&&r.solvedCases.right===1;});
 test("same synchronized case index preserved",()=>{const r=analyze(p,tr);return r.cases.left[0].caseIndex===r.cases.right[0].caseIndex;});
 test("missing two-rail result blocked",()=>!analyze(p,null).success);
 test("missing right-rail load in any synchronized case blocks whole run",()=>!analyze(p,{success:true,cases:[{girderPointLoads:{left:[{x_m:5,P_N:-1000}],right:[]}}]}).success);
 test("support stations must include both girder ends",()=>!audit({...p,supportStations_m:[1,5,10]}).ready);
 test("duplicate synchronized case identifiers rejected",()=>!analyze(p,{success:true,cases:[{caseId:"C1",girderPointLoads:{left:[{x_m:5,P_N:-1}],right:[{x_m:5,P_N:-1}]}},{caseId:"C1",girderPointLoads:{left:[{x_m:5,P_N:-1}],right:[{x_m:5,P_N:-1}]}}]}).success);
 test("design approval remains disabled",()=>analyze(p,tr).analysisEnabled===false);
 test("unresolved local limit states disclosed",()=>analyze(p,tr).limitations.some(x=>x.includes("web crippling")));
 test("equilibrium checked for both girder solutions",()=>{const r=analyze(p,tr);return r.cases.left[0].result.equilibrium.ok&&r.cases.right[0].result.equilibrium.ok;});
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t,analysisEnabled:false,note:"Software regression only; no independent engineering validation."};
}
root.SteelRunwayGirderFEM={audit,analyze,readUI,getData,setData,selfTest,getLastResult:()=>lastResult};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();
})(typeof window!=="undefined"?window:globalThis);
