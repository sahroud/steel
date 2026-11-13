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
function plateStabilityAudit(sectionsByMemberId){
 const issues=[],rows=[],map=sectionsByMemberId||{},ids=Object.keys(map);
 if(!ids.length)issues.push("اطلاعات هندسی تیر حمال وارد نشده است.");
 ids.forEach(id=>{
  const s=map[id]||{},n=k=>Number(s[k]);
  const numeric=["d_m","bf_m","tw_m","tf_m","E_MPa","Fy_MPa","Lb_m","Cb","loadHeightFromShearCenter_m","Cw_m6","Iy_minor_m4","J_m4","bearingLength_m","rootRadius_m","webPanelLength_m"];
  numeric.forEach(k=>{if(s[k]===undefined||s[k]===null||s[k]===""||!Number.isFinite(n(k)))issues.push("عضو "+id+": ورودی عددی "+k+" ناقص یا نامعتبر است.");});
  ["compressionFlangeRestraint","restraintSource","bearingDetailSource","webBearingCondition","stiffenerType","stiffenerSource","webPanelSource"].forEach(k=>{if(!String(s[k]||"").trim())issues.push("عضو "+id+": ورودی "+k+" الزامی است.");});
  if(numeric.some(k=>s[k]===undefined||s[k]===null||s[k]===""||!Number.isFinite(n(k))))return;
  ["d_m","bf_m","tw_m","tf_m","E_MPa","Fy_MPa","Lb_m","Cb","Cw_m6","Iy_minor_m4","J_m4","bearingLength_m","webPanelLength_m"].forEach(k=>{if(!(n(k)>0))issues.push("عضو "+id+": "+k+" باید مثبت باشد.");});
  if(n("rootRadius_m")<0)issues.push("عضو "+id+": شعاع گوشه/ریشه نمی‌تواند منفی باشد.");
  if(n("d_m")<=2*n("tf_m"))issues.push("عضو "+id+": عمق آزاد جان باید مثبت باشد.");
  if(n("bf_m")<=n("tw_m"))issues.push("عضو "+id+": عرض آزاد پیش‌آمدگی بال باید مثبت باشد.");
  if(!["continuous","discrete"].includes(s.compressionFlangeRestraint))issues.push("عضو "+id+": مهار بال فشاری باید پیوسته یا گسسته و مستند باشد؛ none/unknown برای کنترل پایداری پذیرفته نیست.");
  if(n("d_m")<=2*n("tf_m")||n("bf_m")<=n("tw_m")||n("E_MPa")<=0||n("Fy_MPa")<=0||n("tw_m")<=0||n("tf_m")<=0||n("Lb_m")<=0||n("Cb")<=0||n("Cw_m6")<=0||n("Iy_minor_m4")<=0||n("J_m4")<=0||n("bearingLength_m")<=0||n("webPanelLength_m")<=0||n("rootRadius_m")<0)return;
  const clearWeb=n("d_m")-2*n("tf_m"),outstand=(n("bf_m")-n("tw_m"))/2,root=Math.sqrt(n("Fy_MPa")/n("E_MPa"));
  rows.push({memberId:id,geometry_m:{depth:n("d_m"),flangeWidth:n("bf_m"),webThickness:n("tw_m"),flangeThickness:n("tf_m"),clearWebDepth:clearWeb,flangeOutstand:outstand,rootRadius:n("rootRadius_m"),unbracedLength:n("Lb_m"),bearingLength:n("bearingLength_m"),webPanelLength:n("webPanelLength_m")},dimensionlessRatios:{flangeOutstandOverThickness:outstand/n("tf_m"),clearWebDepthOverThickness:clearWeb/n("tw_m"),flangePlateNormalized:outstand/n("tf_m")*root,webPlateNormalized:clearWeb/n("tw_m")*root},stabilityInputs:{Cb:n("Cb"),compressionFlangeRestraint:s.compressionFlangeRestraint,restraintSource:s.restraintSource,loadHeightFromShearCenter_m:n("loadHeightFromShearCenter_m"),Cw_m6:n("Cw_m6"),Iy_minor_m4:n("Iy_minor_m4"),J_m4:n("J_m4")},bearingInputs:{webBearingCondition:s.webBearingCondition,bearingDetailSource:s.bearingDetailSource,stiffenerType:s.stiffenerType,stiffenerSource:s.stiffenerSource,webPanelSource:s.webPanelSource},codeClassification:null,LTBResistance:null,webCripplingResistance:null});
 });
 return {success:issues.length===0&&rows.length===ids.length,analysisEnabled:false,memberCount:ids.length,checkedCount:rows.length,issues,results:rows,limitations:["این خروجی فقط نسبت‌های هندسی صفحه‌ای و کامل‌بودن ورودی‌های لازم برای بررسی پایداری را گزارش می‌کند؛ هیچ طبقه‌بندی مقطع یا مقاومت کمانش محاسبه نمی‌شود.","کنترل کمانش پیچشی‌ـ‌جانبی نیازمند روش آیین‌نامه‌ای منتخب، شرایط مهار واقعی، بارگذاری و محل اعمال بار، Cb معتبر، خواص مقطع و تحلیل پایداری است؛ این موارد در این مرحله به مقاومت تبدیل نمی‌شوند.","لهیدگی/کمانش موضعی جان و بارگذاری موضعی بال به طول بارگذاری، شعاع گوشه، نوع بار/تکیه‌گاه، سخت‌کننده، طول پنل جان و جزئیات ساخت نیاز دارد؛ هنوز مقاومت محاسبه نمی‌شود.","نسبت‌های نرمال‌شده b/t و h/tw فقط شاخص هندسی هستند و بدون حدود آیین‌نامه‌ای و شرایط تکیه‌گاهی طبقه‌بندی نمی‌شوند."]};
}
function templateFor(result){
 const members=(result?.members||[]).filter(m=>m.sectionKey==="craneRunwayGirder"||m.type==="craneRunwayGirder");
 if(!members.length)return {success:false,issues:["عضو تیر حمالی در نتیجه تحلیل برای ساخت الگو پیدا نشد."]};
 const blank={A_m2:"",Sy_m3:"",Sz_m3:"",Avy_m2:"",Avz_m2:"",J_m4:"",torsionRadius_m:"",Fy_MPa:"",source:"",geometrySource:"",shearAreaMethod:"",torsionMethod:"",d_m:"",bf_m:"",tw_m:"",tf_m:"",E_MPa:"",Lb_m:"",Cb:"",compressionFlangeRestraint:"",restraintSource:"",loadHeightFromShearCenter_m:"",Cw_m6:"",Iy_minor_m4:"",bearingLength_m:"",rootRadius_m:"",webPanelLength_m:"",bearingDetailSource:"",webBearingCondition:"",stiffenerType:"",stiffenerSource:"",webPanelSource:""};
 const data={};members.forEach(m=>{data[String(m.id)]={...blank};});
 return {success:true,memberCount:members.length,data};
}
function makeTemplate(){
 const latest=root.SteelCrane3DLoadTransfer?.getLastAnalysis?.();
 const r=templateFor(latest?.result),el=root.document?.getElementById?.("craneGirderLocalScreenJson");
 if(r.success&&el)el.value=JSON.stringify(r.data,null,2);
 const host=root.document?.getElementById?.("craneGirderLocalScreenResult");
 if(host)host.textContent=r.success?"الگوی "+r.memberCount+" عضو ساخته شد؛ مقادیر مقطع، فولاد و مراجع مستند را تکمیل کنید.":r.issues.join(" | ");
 return r;
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
function runPlateStability(){
 const host=root.document?.getElementById?.("craneGirderLocalScreenResult"),input=readUI();
 if(input.parseError){if(host)host.textContent="JSON ورودی نامعتبر است: "+input.parseError;return {success:false,issues:[input.parseError]};}
 const r=plateStabilityAudit(input);if(host)host.textContent=JSON.stringify(r,null,2);return r;
}
function ensurePanel(){
 if(!root.document||root.document.getElementById("craneGirderLocalScreenPanel"))return;
 const main=root.document.querySelector("main");if(!main)return;
 const panel=root.document.createElement("section");panel.className="panel";panel.id="craneGirderLocalScreenPanel";
 panel.innerHTML='<div class="panel-title"><h3>غربال تنش اسمی موضعی تیر حمال</h3><span class="status">پس از تحلیل سه‌بعدی</span></div>'+
 '<div class="notice">پس از اجرای تحلیل یک حالت جرثقیل در قاب سه‌بعدی، مشخصات واقعی هر عضو تیر حمال را با کلید شناسه عضو وارد کنید. واحدها SI هستند. این ابزار فقط غربال تنش اسمی الاستیک است و کنترل کمانش، تنش موضعی جان/بال، خستگی و اتصالات نیست.</div>'+
 '<div class="field"><label for="craneGirderLocalScreenJson">مشخصات مقطع اعضا (JSON بر اساس شناسه عضو)</label><textarea id="craneGirderLocalScreenJson" rows="10" placeholder="{ &quot;شناسه-عضو&quot;: { &quot;A_m2&quot;: 0.01, &quot;Sy_m3&quot;: 0.0001, &quot;Sz_m3&quot;: 0.0002, &quot;Avy_m2&quot;: 0.005, &quot;Avz_m2&quot;: 0.005, &quot;J_m4&quot;: 1e-6, &quot;torsionRadius_m&quot;: 0.1, &quot;Fy_MPa&quot;: 240, &quot;source&quot;: &quot;...&quot;, &quot;geometrySource&quot;: &quot;...&quot;, &quot;shearAreaMethod&quot;: &quot;...&quot;, &quot;torsionMethod&quot;: &quot;...&quot; } }"></textarea></div>'+
 '<div class="button-grid"><button type="button" class="btn secondary" id="craneGirderLocalScreenTemplate">ساخت الگوی شناسه اعضا از تحلیل اخیر</button><button type="button" class="btn primary" id="craneGirderLocalScreenRun">اجرای غربال تنش اسمی</button><button type="button" class="btn secondary" id="craneGirderPlateStabilityRun">ممیزی هندسه صفحات، مهار جانبی و نشیمن</button></div><pre id="craneGirderLocalScreenResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const anchor=root.document.getElementById("crane3DLoadTransferPanel");if(anchor)anchor.insertAdjacentElement("afterend",panel);else main.appendChild(panel);
 root.document.getElementById("craneGirderLocalScreenTemplate").addEventListener("click",makeTemplate);
 root.document.getElementById("craneGirderLocalScreenRun").addEventListener("click",run);
 root.document.getElementById("craneGirderPlateStabilityRun").addEventListener("click",runPlateStability);
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const member={id:"G1",type:"craneRunwayGirder",sectionKey:"craneRunwayGirder",length:6,localEndForces:[10000,20000,30000,4000,5000,6000,-10000,-20000,-30000,-4000,-5000,-6000]};
 const section={A_m2:.01,Sy_m3:.0001,Sz_m3:.0002,Avy_m2:.005,Avz_m2:.005,J_m4:1e-6,torsionRadius_m:.1,Fy_MPa:240,source:"SEC-1",geometrySource:"DWG-1",shearAreaMethod:"section properties",torsionMethod:"Saint-Venant constant"};
 const r=audit({success:true,members:[member]},{G1:section});
 t("calculates both member-end demands",()=>r.success&&r.results[0].ends.length===2);
 t("creates a per-member data-entry template",()=>{const q=templateFor({members:[member,{...member,id:"G2"}]});return q.success&&q.memberCount===2&&!!q.data.G1&&!!q.data.G2&&q.data.G1.A_m2==="";});
 t("computes transparent SI normal and shear stress equations",()=>{const e=r.results[0].ends[0],sigma=10000/.01+5000/.0001+6000/.0002,tau=20000/.005+30000/.005+4000*.1/1e-6;return Math.abs(e.nominalUpperBound_Pa.normal-sigma)<1e-6&&Math.abs(e.nominalUpperBound_Pa.shear-tau)<1e-6;});
 t("absolute-force bound is independent of sign reversal",()=>{const b={...member,localEndForces:member.localEndForces.map(v=>-v)};return audit({success:true,members:[b]},{G1:section}).results[0].governingYieldScreenRatio===r.results[0].governingYieldScreenRatio;});
 t("rejects missing section modulus",()=>!audit({success:true,members:[member]},{G1:{...section,Sy_m3:0}}).success);
 t("rejects missing source traceability",()=>!audit({success:true,members:[member]},{G1:{...section,source:""}}).success);
 t("ignores non-runway members",()=>audit({success:true,members:[{...member,sectionKey:"column",type:"column"}]},{G1:section}).issues.some(x=>x.includes("پیدا نشد")));
 t("reports stress screen above yield",()=>audit({success:true,members:[{...member,localEndForces:member.localEndForces.map(v=>v*1e5)}]},{G1:section}).results[0].screenStatus==="nominal-elastic-screen-exceeds-Fy");
 t("plate and stability audit reports normalized ratios without code classification",()=>{const q=plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4"}});return q.success&&q.results[0].dimensionlessRatios.flangeOutstandOverThickness>0&&q.results[0].codeClassification===null&&q.results[0].LTBResistance===null;});
 t("plate and stability audit blocks missing restraint evidence",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",restraintSource:""}}).success);
 t("plate and stability audit blocks invalid plate geometry",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",d_m:.02,bf_m:.005}}).success);
 t("plate audit rejects unknown compression-flange restraint",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",compressionFlangeRestraint:"unknown"}}).success);
 t("plate audit requires root radius, stiffener and web-panel evidence",()=>{const q={d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4"};delete q.rootRadius_m;delete q.stiffenerSource;return !plateStabilityAudit({G1:q}).success;});
 t("plate audit rejects nonpositive Cb and unbraced length",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",Cb:0,Lb_m:0}}).success);
 t("keeps code approval disabled",()=>r.analysisEnabled===false);
 t("documents unmodeled local buckling and web crippling",()=>r.limitations.some(x=>x.includes("web crippling"))&&r.limitations.some(x=>x.includes("کمانش موضعی")));
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,note:"Software regression only; not a code resistance verification."};
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
root.SteelCraneGirderLocalScreen={audit,plateStabilityAudit,templateFor,makeTemplate,readUI,setData,run,runPlateStability,selfTest};
})(typeof window!=="undefined"?window:globalThis);
