/* SAHROUD STEEL — AISC 360-22 J3 restricted bolt resistance screen.
 * Per-fastener demands must be supplied explicitly for every load case. No assumed
 * group distribution. LRFD only. Standard round holes only. No approval is issued.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const parse=v=>{try{return typeof v==="string"?JSON.parse(v):v;}catch(e){return null;}};
function calculateBolt(c,d){
 const issues=[];
 const req=["boltAbMm2","boltFntMPa","boltFnvMPa","boltDiameterMm","holeDiameterMm","connectedThicknessMm","connectedFuMPa","shearPlaneCount"];
 req.forEach(k=>{if(!finite(c[k])||c[k]<=0)issues.push("پارامتر "+k+" ناموجود یا نامعتبر است.");});
 if(!finite(d?.tensionN)||d.tensionN<0||!finite(d?.shearPerPlaneN)||d.shearPerPlaneN<0)issues.push("تقاضای کشش/برش هر پیچ نامعتبر است.");
 if(!finite(d?.clearDistanceMm)||d.clearDistanceMm<=0)issues.push("فاصله آزاد lc در جهت نیرو برای هر پیچ لازم است.");
 if(c.boltHoleType!=="standard")issues.push("این نسخه فقط سوراخ گرد استاندارد را پوشش می‌دهد.");
 if(c.boltConnectionType!=="bearing-type")issues.push("این موتور فقط اتصال bearing-type را پوشش می‌دهد؛ اتصال slip-critical باید جداگانه کنترل شود.");
 if(c.eccentricityMm!==0)issues.push("خروج از مرکزیت غیرصفر است؛ تحلیل گروه پیچ خارج از مرکز در این نسخه وجود ندارد.");
 if(c.boltPryingIncluded!==true)issues.push("تقاضای کشش پیچ باید اثر prying را لحاظ کند یا عدم نیاز آن مستند شده باشد.");
 if(!String(c.boltGrade||"").trim())issues.push("گرید پیچ باید مستند باشد.");
 if(c.loadPathReviewed!==true||c.connectionDrawingReviewed!==true)issues.push("بازبینی مسیر انتقال نیرو و تطبیق نقشه اتصال الزامی است.");
 if(![true,false].includes(c.threadsInShearPlane))issues.push("وضعیت رزوه در صفحه برش باید مشخص باشد.");
 if(!["yes","no"].includes(c.deformationAtServiceLoad))issues.push("ملاک تغییرشکل سوراخ در بار سرویس باید مشخص شود.");
 if(c.shearPlaneCount!==1)issues.push("این نسخه فقط یک صفحه برش پیچ را محاسبه می‌کند؛ چندصفحه‌ای نیازمند توزیع صریح برش در هر صفحه است.");
 if(c.holeDiameterMm<c.boltDiameterMm)issues.push("قطر سوراخ از قطر پیچ کوچک‌تر است.");
 if(issues.length)return {ok:false,issues};
 const Ab=c.boltAbMm2, Fnt=c.boltFntMPa, Fnv=c.boltFnvMPa;
 const phi=0.75, t=c.connectedThicknessMm, d0=c.holeDiameterMm, db=c.boltDiameterMm, Fu=c.connectedFuMPa, lc=d.clearDistanceMm;
 const shearStress=d.shearPerPlaneN/Ab;
 const FntPrime=Math.min(Fnt,1.3*Fnt-(Fnt/(phi*Fnv))*shearStress);
 if(!(FntPrime>0))return {ok:false,issues:["تنش کششی اصلاح‌شده پیچ طبق J3-3 غیرمثبت است؛ تقاضای برشی/داده پیچ باید بازبینی شود."]};
 const shearAvailable=phi*Fnv*Ab;
 const tensionAvailable=phi*FntPrime*Ab;
 const coeff=c.deformationAtServiceLoad==="yes"?2.4:3.0;
 const tearCoeff=c.deformationAtServiceLoad==="yes"?1.2:1.5;
 const bearingAvailable=phi*coeff*db*t*Fu;
 const tearoutAvailable=phi*tearCoeff*lc*t*Fu;
 const uS=d.shearPerPlaneN/shearAvailable,uT=d.tensionN/tensionAvailable,uB=d.shearPerPlaneN/Math.min(bearingAvailable,tearoutAvailable);
 const combined=d.tensionN>0?d.tensionN/tensionAvailable:0;
 return {ok:true,method:"LRFD",shear:{demandN:d.shearPerPlaneN,availableN:shearAvailable,utilization:uS},tension:{demandN:d.tensionN,modifiedFntMPa:FntPrime,availableN:tensionAvailable,utilization:uT},bearing:{availableN:bearingAvailable,utilization:d.shearPerPlaneN/bearingAvailable},tearout:{availableN:tearoutAvailable,utilization:d.shearPerPlaneN/tearoutAvailable},combinedTensionShearUtilization:combined,governing:([{name:"bolt shear",u:uS},{name:"bolt tension with J3-3",u:uT},{name:"plate bearing",u:d.shearPerPlaneN/bearingAvailable},{name:"plate tearout",u:d.shearPerPlaneN/tearoutAvailable}].sort((a,b)=>b.u-a.u)[0]).name,maximumUtilization:Math.max(uS,uT,d.shearPerPlaneN/bearingAvailable,d.shearPerPlaneN/tearoutAvailable),designApproved:false,basis:"AISC 360-22 J3.7, J3.8, J3.11a; LRFD"};
}
function analyze(envelope,model,connectionData){
 const ma=root.SteelBraceForceDemandAudit?.audit?.(envelope,model),issues=[],rows=[];
 if(!ma)issues.push("ممیزی تقاضای مهاربند در دسترس نیست.");else if(!ma.success)issues.push(...ma.issues);
 const conns=connectionData?.connections||[],map=new Map(conns.map(c=>[c.memberId+"::"+c.end,c]));
 if(issues.length)return {success:false,issues,rows,analysisEnabled:false,designApproved:false};
 ma.rows.forEach(b=>["I","J"].forEach(end=>{
  const c=map.get(b.memberId+"::"+end);
  if(!c||c.connectionType!=="bolted"){issues.push("اتصال پیچی "+b.memberId+"/"+end+" ثبت نشده است.");return;}
  const cases=parse(c.boltCaseDemandsJson);
  b.simultaneousDemands.forEach(d=>{
   const tension=end==="I"?d.endI_tension_N:d.endJ_tension_N,compression=end==="I"?d.endI_compression_N:d.endJ_compression_N;
   if(compression>0){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": تقاضای فشاری وجود دارد؛ غربال کششی پیچ برای این حالت کافی نیست.");return;}
   const arr=cases?.[d.caseLabel];
   if(!Array.isArray(arr)||arr.length!==c.boltCount){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": توزیع صریح نیرو برای تک‌تک پیچ‌ها ثبت نشده است.");return;}
   const transferred=arr.reduce((s,x)=>s+(finite(x.transferN)?x.transferN:NaN),0);
   if(!finite(transferred)||Math.abs(transferred-tension)>Math.max(1,0.01*tension)){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": جمع نیروی انتقالی پیچ‌ها با نیروی محوری FEM در محدوده ۱٪ تطبیق ندارد.");return;}
   if(arr.some(x=>!finite(x.tensionN)||!finite(x.shearPerPlaneN)||Math.abs(Math.hypot(x.tensionN,x.shearPerPlaneN)-x.transferN)>Math.max(1,0.01*x.transferN))){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": برآیند کشش و برش محلی هر پیچ با مؤلفه انتقالی ثبت‌شده آن در محدوده ۱٪ برابر نیست.");return;}
   arr.forEach((x,i)=>rows.push({memberId:b.memberId,end,caseLabel:d.caseLabel,boltIndex:i+1,transferN:x.transferN,...calculateBolt(c,x)}));
  });
 }));
 const failed=rows.some(x=>!x.ok);
 if(failed)issues.push("حداقل یک پیچ به دلیل ورودی ناقص یا خارج از دامنه قابل محاسبه نیست.");
 return {success:issues.length===0&&rows.length>0,issues,rows,completedCount:rows.filter(x=>x.ok).length,analysisEnabled:false,designApproved:false,limitations:["تقسیم نیرو میان پیچ‌ها خودکار فرض نمی‌شود؛ آرایه نیروهای هر پیچ باید برای هر ترکیب از تحلیل معتبر اتصال ارائه شود.","فقط یک صفحه برش و سوراخ استاندارد گرد؛ چندصفحه‌ای، سوراخ لوبیایی/بزرگ، لغزش، پیش‌تنیدگی و prying پوشش داده نشده‌اند.","نیروی فشار مهاربند، خمش گروه پیچ و انعطاف‌پذیری ورق/گاست در این غربال کنترل نمی‌شود.","Fnt و Fnv و سطح Ab باید از گرید و وضعیت رزوه مستند به جدول معتبر پیچ انتخاب شوند؛ نرم‌افزار آن‌ها را حدس نمی‌زند."]};
}
function render(r){const host=document.getElementById("braceBoltStrengthResult");if(!host)return;host.innerHTML="<strong>"+(r.success?"غربال پیچ برای داده‌های ثبت‌شده انجام شد؛ این نتیجه تأیید طراحی نیست.":"غربال پیچ ناقص/مسدود است.")+"</strong><p>پیچ‌های محاسبه‌شده: "+(r.completedCount||0)+"</p>"+(r.rows?.length?'<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>عضو</th><th>انتها</th><th>ترکیب</th><th>شماره پیچ</th><th>کشش kN</th><th>برش kN</th><th>ظرفیت کشش kN</th><th>ظرفیت برش kN</th><th>ظرفیت bearing kN</th><th>tear-out kN</th><th>نسبت حاکم</th><th>حالت حاکم</th></tr></thead><tbody>'+r.rows.map(x=>'<tr><td>'+esc(x.memberId)+'</td><td>'+x.end+'</td><td>'+esc(x.caseLabel)+'</td><td>'+x.boltIndex+'</td><td>'+(x.ok?(x.tension.demandN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.shear.demandN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.tension.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.shear.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.bearing.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.tearout.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?x.maximumUtilization.toFixed(3):"—")+'</td><td>'+(x.ok?esc(x.governing):esc(x.issues.join("؛ ")))+'</td></tr>').join("")+'</tbody></table></div>':"")+(r.issues?.length?"<ul>"+r.issues.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")+"<p>لغزش اتصال، پیش‌تنیدگی، گروه چندصفحه‌ای و اثر prying هنوز خارج از دامنه‌اند.</p>";}
function run(){const r=analyze(root.SteelMemberForceEnvelope?.getLast?.(),root.SteelStructuralModel?.getData?.(),root.SteelBraceConnectionReadiness?.getData?.());render(r);return r;}
function init(){if(document.getElementById("braceBoltStrengthPanel"))return;const p=document.createElement("section");p.className="panel";p.id="braceBoltStrengthPanel";p.innerHTML="<div class='panel-title'><h3>غربال مقاومت اتصال پیچی مهاربند</h3><span class='status'>AISC 360-22 · LRFD مقدماتی</span></div><div class='notice'>مشخصات Ab، Fnt، Fnv و تقاضای تک‌تک پیچ‌ها برای هر ترکیب را از مدارک معتبر وارد کنید. توزیع نیرو بین پیچ‌ها خودکار فرض نمی‌شود؛ برآیند کشش و برش هر پیچ باید با transferN آن برابر باشد. فقط یک صفحه برش و سوراخ استاندارد بررسی می‌شود.</div><button type='button' class='btn primary' id='btnBraceBoltStrengthRun'>محاسبه مقاومت پیچ‌ها</button><div id='braceBoltStrengthResult' class='notice'>ابتدا اطلاعات اتصال و JSON نیروهای هر پیچ را تکمیل کنید.</div>";const a=document.getElementById("braceGussetStrengthPanel");if(a?.parentNode)a.insertAdjacentElement("afterend",p);else document.querySelector("main")?.appendChild(p);document.getElementById("btnBraceBoltStrengthRun").addEventListener("click",run);}

function selfTest(){
 const c={boltAbMm2:245,boltFntMPa:620,boltFnvMPa:372,boltDiameterMm:20,holeDiameterMm:22,connectedThicknessMm:10,connectedFuMPa:360,shearPlaneCount:1,boltHoleType:"standard",boltConnectionType:"bearing-type",deformationAtServiceLoad:"yes",eccentricityMm:0,boltPryingIncluded:true,threadsInShearPlane:false,boltGrade:"8.8",loadPathReviewed:true,connectionDrawingReviewed:true};
 const t=[],add=(n,f)=>{try{t.push({name:n,pass:f()===true});}catch(e){t.push({name:n,pass:false,error:e.message});}};
 const d={tensionN:10000,shearPerPlaneN:15000,clearDistanceMm:30};
 add("calculates bolt shear resistance with LRFD phi 0.75",()=>{const r=calculateBolt(c,d);return r.ok&&Math.abs(r.shear.availableN-0.75*372*245)<1e-6;});
 add("applies J3-3 modified tensile stress",()=>{const r=calculateBolt(c,d),expected=Math.min(620,1.3*620-(620/(0.75*372))*(15000/245));return r.ok&&Math.abs(r.tension.modifiedFntMPa-expected)<1e-9;});
 add("bearing uses J3-6a coefficient when service deformation matters",()=>{const r=calculateBolt(c,d);return r.ok&&r.bearing.availableN===0.75*2.4*20*10*360;});
 add("tearout uses J3-6c coefficient",()=>{const r=calculateBolt(c,d);return r.ok&&r.tearout.availableN===0.75*1.2*30*10*360;});
 add("rejects nonstandard holes",()=>!calculateBolt({...c,boltHoleType:"slot"},d).ok);
 add("rejects missing clear distance",()=>!calculateBolt(c,{...d,clearDistanceMm:null}).ok);
 add("rejects multiple shear planes in restricted engine",()=>!calculateBolt({...c,shearPlaneCount:2},d).ok);
 add("rejects missing bolt material strength",()=>!calculateBolt({...c,boltFnvMPa:null},d).ok);
 add("rejects unspecified service deformation criterion",()=>!calculateBolt({...c,deformationAtServiceLoad:""},d).ok);
 add("does not issue design approval",()=>calculateBolt(c,d).designApproved===false);
 add("rejects negative demand",()=>!calculateBolt(c,{...d,tensionN:-1}).ok);
 add("rejects slip-critical connection type",()=>!calculateBolt({...c,boltConnectionType:"slip-critical"},d).ok);
 add("requires prying assessment",()=>!calculateBolt({...c,boltPryingIncluded:false},d).ok);
 add("rejects eccentric bolt group",()=>!calculateBolt({...c,eccentricityMm:5},d).ok);
 add("requires thread-plane declaration",()=>!calculateBolt({...c,threadsInShearPlane:null},d).ok);
 return {passed:t.filter(x=>x.pass).length,failed:t.filter(x=>!x.pass).length,total:t.length,tests:t};
}
root.SteelBraceBoltStrengthScreen={calculateBolt,analyze,run,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
