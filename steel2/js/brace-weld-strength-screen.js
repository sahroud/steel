/* SAHROUD STEEL — AISC 360-22 J2 restricted fillet-weld screen.
 * Explicit per-segment force transfer is required for every FEM case. LRFD only.
 * No automatic weld-group force distribution, eccentric group analysis or approval.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const parse=v=>{try{return typeof v==="string"?JSON.parse(v):v;}catch(e){return null;}};
function effectiveLength(length,size){
 if(length<=0||size<=0)return null;
 if(length>300*size)return 180*size;
 if(length>100*size){const beta=Math.min(1,1.2-0.002*(length/size));return length*beta;}
 return length;
}
function calculateSegment(c,s){
 const issues=[];
 ["weldSizeMm","electrodeFexxMPa","baseMetalFyMPa","baseMetalFuMPa"].forEach(k=>{if(!finite(c[k])||c[k]<=0)issues.push(k+" ناموجود یا نامعتبر است.");});
 ["effectiveLengthMm","baseGrossShearAreaMm2","baseNetShearAreaMm2","shearN"].forEach(k=>{if(!finite(s?.[k])||s[k]<0)issues.push(k+" ناموجود یا نامعتبر است.");});
 if(!finite(s?.shearN)||s.shearN<0||s.effectiveLengthMm<=0||s.baseGrossShearAreaMm2<=0||s.baseNetShearAreaMm2<=0)issues.push("نیرو، طول مؤثر یا مساحت فلز پایه باید مثبت/غیرمنفی باشد.");
 if(c.baseMetalFuMPa<c.baseMetalFyMPa)issues.push("Fu فلز پایه از Fy کمتر است.");
 if(issues.length)return {ok:false,issues};
 const le=effectiveLength(s.effectiveLengthMm,c.weldSizeMm);
 const throat=0.707*c.weldSizeMm, weldArea=le*throat;
 const phiWeld=0.75, weldAvailable=phiWeld*0.60*c.electrodeFexxMPa*weldArea;
 const baseYield=1.00*0.60*c.baseMetalFyMPa*s.baseGrossShearAreaMm2;
 const baseRupture=0.75*0.60*c.baseMetalFuMPa*s.baseNetShearAreaMm2;
 const baseAvailable=Math.min(baseYield,baseRupture);
 const uW=s.shearN/weldAvailable,uB=s.shearN/baseAvailable;
 return {ok:true,demandN:s.shearN,weld:{effectiveLengthMm:le,effectiveThroatMm:throat,effectiveAreaMm2:weldArea,availableN:weldAvailable,utilization:uW},baseMetal:{shearYieldAvailableN:baseYield,shearRuptureAvailableN:baseRupture,availableN:baseAvailable,utilization:uB},governing:uW>=uB?"فلز جوش":"فلز پایه",maximumUtilization:Math.max(uW,uB),designApproved:false,basis:"AISC 360-22 J2.2, J2.4, J2-1, Table J2.5; J4.2; LRFD"};
}
function analyze(envelope,model,connectionData){
 const ma=root.SteelBraceForceDemandAudit?.audit?.(envelope,model),issues=[],rows=[];
 if(!ma)issues.push("ممیزی تقاضای مهاربند در دسترس نیست.");else if(!ma.success)issues.push(...ma.issues);
 const map=new Map((connectionData?.connections||[]).map(c=>[c.memberId+"::"+c.end,c]));
 if(issues.length)return {success:false,issues,rows,analysisEnabled:false,designApproved:false};
 ma.rows.forEach(b=>["I","J"].forEach(end=>{
  const c=map.get(b.memberId+"::"+end);
  if(!c||c.connectionType!=="welded"){issues.push("اتصال جوشی "+b.memberId+"/"+end+" ثبت نشده است.");return;}
  const cases=parse(c.weldCaseDemandsJson);
  b.simultaneousDemands.forEach(d=>{
   const tension=end==="I"?d.endI_tension_N:d.endJ_tension_N,compression=end==="I"?d.endI_compression_N:d.endJ_compression_N;
   if(compression>0){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": تقاضای فشاری وجود دارد؛ این غربال محدود جوش کافی نیست.");return;}
   const arr=cases?.[d.caseLabel];
   if(!Array.isArray(arr)||arr.length!==c.weldCount){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": تقاضای صریح هر قطعه جوش ثبت نشده است.");return;}
   const transferred=arr.reduce((s,x)=>s+(finite(x.transferN)?x.transferN:NaN),0);
   if(!finite(transferred)||Math.abs(transferred-tension)>Math.max(1,0.01*tension)){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": جمع انتقال نیرو در جوش‌ها با تقاضای FEM در محدوده ۱٪ تطبیق ندارد.");return;}
   if(arr.some(x=>!finite(x.shearN)||Math.abs(x.shearN-x.transferN)>Math.max(1,0.01*x.transferN))){issues.push(b.memberId+"/"+end+"/"+d.caseLabel+": در غربال برش‌محور، نیروی برشی هر قطعه باید با مؤلفه انتقالی همان قطعه در محدوده ۱٪ برابر باشد.");return;}
   arr.forEach((x,i)=>rows.push({memberId:b.memberId,end,caseLabel:d.caseLabel,weldIndex:i+1,transferN:x.transferN,...calculateSegment(c,x)}));
  });
 }));
 if(rows.some(x=>!x.ok))issues.push("حداقل یک قطعه جوش به علت داده ناقص یا خارج از دامنه محاسبه نشده است.");
 return {success:issues.length===0&&rows.length>0,issues,rows,completedCount:rows.filter(x=>x.ok).length,analysisEnabled:false,designApproved:false,limitations:["فقط جوش گوشه با بار برشی و LRFD؛ جوش شیاری CJP/PJP، plug/slot و بارگذاری پیچیده پوشش داده نشده‌اند.","نیروی هر قطعه جوش و توزیع آن باید صریحاً ارائه شود؛ گروه جوش خارج از مرکز یا ترکیب نیرو/لنگر به‌طور خودکار تحلیل نمی‌شود.","کنترل فلز پایه بر مبنای مساحت‌های خالص و ناخالص برشی ورودی کاربر است؛ استخراج مسیر شکست از نقشه انجام نمی‌شود.","ضریب افزایش جهت‌داری kds عمداً برابر 1.0 منظور شده؛ افزایش مقاومت به دلیل زاویه بار لحاظ نشده است."]};
}
function render(r){const host=document.getElementById("braceWeldStrengthResult");if(!host)return;host.innerHTML="<strong>"+(r.success?"غربال جوش برای داده‌های ثبت‌شده انجام شد؛ این نتیجه تأیید طراحی نیست.":"غربال جوش ناقص/مسدود است.")+"</strong><p>قطعات جوش محاسبه‌شده: "+(r.completedCount||0)+"</p>"+(r.rows?.length?'<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>عضو</th><th>انتها</th><th>ترکیب</th><th>قطعه</th><th>نیرو kN</th><th>ظرفیت فلز جوش kN</th><th>ظرفیت فلز پایه kN</th><th>نسبت حاکم</th><th>حاکم</th></tr></thead><tbody>'+r.rows.map(x=>'<tr><td>'+x.memberId+'</td><td>'+x.end+'</td><td>'+x.caseLabel+'</td><td>'+x.weldIndex+'</td><td>'+(x.ok?(x.demandN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.weld.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?(x.baseMetal.availableN/1000).toFixed(2):"—")+'</td><td>'+(x.ok?x.maximumUtilization.toFixed(3):"—")+'</td><td>'+(x.ok?x.governing:x.issues.join("؛ "))+'</td></tr>').join("")+'</tbody></table></div>':"")+(r.issues?.length?"<ul>"+r.issues.map(x=>"<li>"+x+"</li>").join("")+"</ul>":"")+"<p>گروه جوش خارج از مرکز، بارهای مختلط و جوش شیاری هنوز خارج از دامنه‌اند.</p>";}
function run(){const r=analyze(root.SteelMemberForceEnvelope?.getLast?.(),root.SteelStructuralModel?.getData?.(),root.SteelBraceConnectionReadiness?.getData?.());render(r);return r;}
function init(){if(document.getElementById("braceWeldStrengthPanel"))return;const p=document.createElement("section");p.className="panel";p.id="braceWeldStrengthPanel";p.innerHTML="<div class='panel-title'><h3>غربال مقاومت اتصال جوشی مهاربند</h3><span class='status'>AISC 360-22 · LRFD مقدماتی</span></div><div class='notice'>فقط جوش گوشه در برش بررسی می‌شود. نیروی هر قطعه جوش و مساحت ناخالص/خالص فلز پایه باید جداگانه و برای هر ترکیب وارد شود؛ kds برابر ۱ در نظر گرفته شده است.</div><button type='button' class='btn primary' id='btnBraceWeldStrengthRun'>محاسبه مقاومت جوش‌ها</button><div id='braceWeldStrengthResult' class='notice'>ابتدا اطلاعات جوش و JSON نیروهای قطعات جوش را تکمیل کنید.</div>";const a=document.getElementById("braceBoltStrengthPanel");if(a?.parentNode)a.insertAdjacentElement("afterend",p);else document.querySelector("main")?.appendChild(p);document.getElementById("btnBraceWeldStrengthRun").addEventListener("click",run);}

function selfTest(){
 const c={weldSizeMm:6,electrodeFexxMPa:490,baseMetalFyMPa:235,baseMetalFuMPa:360};
 const s={effectiveLengthMm:100,baseGrossShearAreaMm2:1000,baseNetShearAreaMm2:900,shearN:20000};
 const t=[],add=(n,f)=>{try{t.push({name:n,pass:f()===true});}catch(e){t.push({name:n,pass:false,error:e.message});}};
 add("fillet weld throat is 0.707 times leg size",()=>{const r=calculateSegment(c,s);return r.ok&&Math.abs(r.weld.effectiveThroatMm-4.242)<1e-9;});
 add("weld metal LRFD strength uses 0.75 times 0.60 Fexx Awe",()=>{const r=calculateSegment(c,s);return r.ok&&Math.abs(r.weld.availableN-0.75*0.6*490*100*0.707*6)<1e-6;});
 add("long end-loaded weld uses beta above 100w",()=>Math.abs(effectiveLength(800,6)-800*Math.min(1,1.2-0.002*(800/6)))<1e-9);
 add("very long end-loaded weld is capped at 180w",()=>effectiveLength(2000,6)===1080);
 add("base metal shear yielding uses phi 1.0 and 0.60FyAgv",()=>{const r=calculateSegment(c,s);return r.ok&&r.baseMetal.shearYieldAvailableN===0.6*235*1000;});
 add("base metal shear rupture uses phi 0.75 and 0.60FuAnv",()=>{const r=calculateSegment(c,s);return r.ok&&r.baseMetal.shearRuptureAvailableN===0.75*0.6*360*900;});
 add("governing base-metal strength is the lesser branch",()=>{const r=calculateSegment(c,s);return r.ok&&r.baseMetal.availableN===Math.min(0.6*235*1000,0.75*0.6*360*900);});
 add("rejects missing base-metal area",()=>!calculateSegment(c,{...s,baseNetShearAreaMm2:null}).ok);
 add("rejects Fu lower than Fy",()=>!calculateSegment({...c,baseMetalFuMPa:200},s).ok);
 add("rejects zero weld length",()=>!calculateSegment(c,{...s,effectiveLengthMm:0}).ok);
 add("does not issue design approval",()=>calculateSegment(c,s).designApproved===false);
 return {passed:t.filter(x=>x.pass).length,failed:t.filter(x=>!x.pass).length,total:t.length,tests:t};
}
root.SteelBraceWeldStrengthScreen={effectiveLength,calculateSegment,analyze,run,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
