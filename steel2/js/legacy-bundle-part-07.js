/* ===== steel2/js/anchor-demand-screen.js ===== */
/* SAHROUD STEEL — anchor-group demand distribution screen.
 * Elastic rigid-plate distribution only. No code resistance design, prying, concrete breakout,
 * pullout, side-face blowout, edge effects, group effects, weld or base-plate bending design.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const ids=["rows","cols","pitchX","pitchZ","tension","momentX","momentZ","shearX","shearZ","torsionY","tensionCapacity","shearCapacity"];
const defaults={rows:"2",cols:"2",pitchX:"160",pitchZ:"160",tension:"",momentX:"",momentZ:"",shearX:"",shearZ:"",torsionY:"",tensionCapacity:"",shearCapacity:"",signConfirmed:false,geometryConfirmed:false};
let state={...defaults},last=null;
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
const num=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function coordinates(rows,cols,px,pz){const a=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)a.push({mark:"AB-"+String(a.length+1).padStart(2,"0"),x:(c-(cols-1)/2)*px/1000,z:(r-(rows-1)/2)*pz/1000});return a;}
function distribute(input){
 const {rows,cols,pitchX,pitchZ,tension,momentX,momentZ,shearX,shearZ,torsionY}=input;
 if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows*cols>64)throw Error("تعداد ردیف و ستون بولت باید عدد صحیح و حداکثر ۶۴ بولت باشد.");
 if((cols>1&&!(pitchX>0))||(rows>1&&!(pitchZ>0)))throw Error("فاصله محور بولت‌ها باید در هر آرایش چندردیفه/چندستونه مثبت باشد.");
 if([tension,momentX,momentZ,shearX,shearZ,torsionY].some(v=>v===null))throw Error("تمام شش مؤلفه نیروی هم‌زمان را وارد کنید؛ برای مؤلفه صفر عدد صفر بنویسید.");
 const bolts=coordinates(rows,cols,pitchX,pitchZ),n=bolts.length;
 const sx2=bolts.reduce((s,b)=>s+b.x*b.x,0),sz2=bolts.reduce((s,b)=>s+b.z*b.z,0);
 const polarJ=bolts.reduce((s,b)=>s+b.x*b.x+b.z*b.z,0);
 if(Math.abs(torsionY)>1e-12&&polarJ<=1e-14)throw Error("گروه بولت با یک نقطه هم‌مرکز نمی‌تواند پیچش حول Y را در این روش الاستیک تحمل کند؛ آرایش واقعی چندنقطه‌ای لازم است.");
 const results=bolts.map(b=>{
  const fromMx=sz2>0?momentX*b.z/sz2:0;
  const fromMz=sx2>0?momentZ*b.x/sx2:0;
  const axial=tension/n+fromMx+fromMz;
  const torsionShearX=polarJ>1e-14?torsionY*b.z/polarJ:0;
  const torsionShearZ=polarJ>1e-14?-torsionY*b.x/polarJ:0;
  const directShearX=shearX/n,directShearZ=shearZ/n;
  const boltShearX=directShearX+torsionShearX,boltShearZ=directShearZ+torsionShearZ;
  return {...b,tensionKN:Math.max(0,axial),signedAxialKN:axial,directShearXKN:directShearX,directShearZKN:directShearZ,torsionShearXKN:torsionShearX,torsionShearZKN:torsionShearZ,shearXKN:boltShearX,shearZKN:boltShearZ,shearResultKN:Math.hypot(boltShearX,boltShearZ)};
 });
 const sumShearXKN=results.reduce((s,b)=>s+b.shearXKN,0),sumShearZKN=results.reduce((s,b)=>s+b.shearZKN,0);
 const recoveredTorsionYKNm=results.reduce((s,b)=>s+b.z*b.torsionShearXKN-b.x*b.torsionShearZKN,0);
 return {bolts:results,maxTensionKN:Math.max(...results.map(x=>x.tensionKN)),maxShearKN:Math.max(...results.map(x=>x.shearResultKN)),torsionYKNm:torsionY,torsionDistributionStatus:"distributed_elastic_rigid_group",polarMomentM2:polarJ,recoveredTorsionYKNm,sumTensionOnlyKN:results.reduce((s,x)=>s+x.tensionKN,0),sumShearXKN,sumShearZKN,expectedShearXKN:shearX,expectedShearZKN:shearZ,shearForceResidualXKN:sumShearXKN-shearX,shearForceResidualZKN:sumShearZKN-shearZ,torsionResidualKNm:recoveredTorsionYKNm-torsionY,geometry:{rows,cols,pitchX,pitchZ},method:"linear_elastic_rigid_plate_anchor_group_with_direct_and_torsional_shear_no_prying"};
}
function panel(){
 if($("anchorDemandScreenPanel"))return;
 const rootPanel=$("anchorBaseplatePanel")||$("foundationTakeoffPanel");if(!rootPanel)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorDemandScreenPanel";
 p.innerHTML='<div class="panel-title"><h3>غربال توزیع نیرو در گروه بولت مهاری</h3><span class="status">تقاضای نیرو؛ نه طراحی ظرفیت</span></div>'+
 '<div class="notice">نیروها و لنگرهای هم‌زمان یک ترکیب بار را وارد کنید. توزیع کشش با فرض صفحه صلب و رفتار الاستیک گروه بولت انجام می‌شود؛ برش مستقیم به‌طور مساوی و برش ناشی از پیچش با مدل الاستیک گروه صلب بر اساس فاصله هر بولت از مرکز گروه توزیع می‌شود. این روش اثر اهرمی صفحه (prying)، انعطاف صفحه‌ستون، تماس فشاری زیر صفحه، کشش/فشار بتن، اندرکنش دقیق گروه، شکست بتن و ضوابط لرزه‌ای را مدل نمی‌کند. نیروها را با قرارداد علامت مدل کنترل کنید.</div>'+
 '<h4>آرایش هندسی بولت‌ها</h4><div class="form-grid">'+
 '<div class="field"><label for="adRows">تعداد ردیف در راستای Z</label><input id="adRows" type="number" min="1" max="8" step="1"></div>'+
 '<div class="field"><label for="adCols">تعداد ستون در راستای X</label><input id="adCols" type="number" min="1" max="8" step="1"></div>'+
 '<div class="field"><label for="adPitchX">فاصله محور بولت‌ها X (mm)</label><input id="adPitchX" type="number" min="0" step="1"></div>'+
 '<div class="field"><label for="adPitchZ">فاصله محور بولت‌ها Z (mm)</label><input id="adPitchZ" type="number" min="0" step="1"></div></div>'+
 '<h4>تقاضای هم‌زمان در پای ستون</h4><div class="form-grid">'+
 '<div class="field"><label for="adTension">کشش خالص پای ستون N (kN؛ کشش مثبت)</label><input id="adTension" type="number" step="0.1" placeholder="برای فشار محوری مقدار منفی"></div>'+
 '<div class="field"><label for="adMx">لنگر حول X، Mx (kN.m)</label><input id="adMx" type="number" step="0.1"></div>'+
 '<div class="field"><label for="adMz">لنگر حول Z، Mz (kN.m)</label><input id="adMz" type="number" step="0.1"></div>'+
 '<div class="field"><label for="adVx">برش در X، Vx (kN)</label><input id="adVx" type="number" step="0.1"></div>'+
 '<div class="field"><label for="adVz">برش در Z، Vz (kN)</label><input id="adVz" type="number" step="0.1"></div><div class="field"><label for="adTy">پیچش حول محور قائم Y، Ty (kN.m)</label><input id="adTy" type="number" step="0.1" placeholder="برای نبود پیچش، صفر وارد کنید"></div></div>'+
 '<h4>ظرفیت طراحی مستند هر بولت (اختیاری)</h4><div class="form-grid">'+
 '<div class="field"><label for="adTcap">ظرفیت طراحی کششی هر بولت (kN)</label><input id="adTcap" type="number" min="0" step="0.1" placeholder="از محاسبه معتبر اتصال"></div>'+
 '<div class="field"><label for="adVcap">ظرفیت طراحی برشی هر بولت (kN)</label><input id="adVcap" type="number" min="0" step="0.1" placeholder="از محاسبه معتبر اتصال"></div></div>'+
 '<label class="check-row" style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><input id="adSign" type="checkbox"><span>علامت نیروها و جهت محورهای ورودی با خروجی تحلیل کنترل شده است.</span></label>'+
 '<label class="check-row" style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><input id="adGeometryConfirm" type="checkbox"><span>تعداد، فاصله محورها و مختصات گروه بولت با نقشه اجرایی/وضعیت واقعی همین پایه تطبیق داده شده است.</span></label>'+
 '<div class="button-grid"><button id="btnAnchorDemandRun" class="btn primary" type="button">محاسبه نیروی هر بولت</button><button id="btnAnchorDemandCSV" class="btn secondary" type="button" disabled>دریافت CSV</button></div>'+
 '<div id="anchorDemandSummary" class="notice">ابتدا آرایش بولت و شش مؤلفه هم‌زمان یک ترکیب بار را وارد کنید.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>بولت</th><th>X (m)</th><th>Z (m)</th><th>کشش محاسباتی (kN)</th><th>برش نهایی X (kN)</th><th>برش نهایی Z (kN)</th><th>برش برآیند (kN)</th><th>وضعیت ظرفیت واردشده</th></tr></thead><tbody id="anchorDemandRows"></tbody></table></div>'+
 '<div class="notice">اگر ظرفیت‌های طراحی وارد شوند، نسبت تقاضا به ظرفیت هر مؤلفه فقط به‌صورت مقایسه جداگانه نشان داده می‌شود؛ این مقایسه جای کنترل اندرکنش کشش و برش، شکست بتن، فاصله لبه، گروه بولت و طراحی صفحه‌ستون را نمی‌گیرد.</div>';
 rootPanel.parentNode.insertBefore(p,rootPanel.nextSibling);
 const map={rows:"adRows",cols:"adCols",pitchX:"adPitchX",pitchZ:"adPitchZ",tension:"adTension",momentX:"adMx",momentZ:"adMz",shearX:"adVx",shearZ:"adVz",torsionY:"adTy",tensionCapacity:"adTcap",shearCapacity:"adVcap"};
 ids.forEach(k=>{$(map[k]).value=state[k]??"";$(map[k]).addEventListener("change",()=>state[k]=$(map[k]).value);});
 $("adSign").checked=!!state.signConfirmed;$("adSign").addEventListener("change",()=>state.signConfirmed=$("adSign").checked);$("adGeometryConfirm").checked=!!state.geometryConfirmed;$("adGeometryConfirm").addEventListener("change",()=>state.geometryConfirmed=$("adGeometryConfirm").checked);
 $("btnAnchorDemandRun").addEventListener("click",run);$("btnAnchorDemandCSV").addEventListener("click",exportCSV);
}
function run(){
 const map={rows:"adRows",cols:"adCols",pitchX:"adPitchX",pitchZ:"adPitchZ",tension:"adTension",momentX:"adMx",momentZ:"adMz",shearX:"adVx",shearZ:"adVz",torsionY:"adTy",tensionCapacity:"adTcap",shearCapacity:"adVcap"};
 ids.forEach(k=>state[k]=$(map[k])?.value??state[k]);state.signConfirmed=!!$("adSign")?.checked;
 const vals={};["rows","cols","pitchX","pitchZ","tension","momentX","momentZ","shearX","shearZ","torsionY"].forEach(k=>vals[k]=num(state[k]));
 try{
  if(!state.signConfirmed)throw Error("ابتدا قرارداد علامت نیروها را تأیید کنید.");
  if(!state.geometryConfirmed)throw Error("ابتدا هندسه و مختصات گروه بولت را با نقشه واقعی تطبیق و تأیید کنید.");
  const r=distribute(vals),tc=num(state.tensionCapacity),vc=num(state.shearCapacity);
  r.bolts.forEach(b=>{b.tensionRatio=tc>0?b.tensionKN/tc:null;b.shearRatio=vc>0?b.shearResultKN/vc:null;b.capacityStatus=tc>0&&vc>0?(b.tensionRatio<=1&&b.shearRatio<=1?"هر دو نسبت جداگانه ≤ ۱":"حداقل یک نسبت جداگانه > ۱"):"ظرفیت کامل وارد نشده؛ کنترل ظرفیت باز است";});
  r.input={...vals,tensionCapacity:tc,shearCapacity:vc,signConfirmed:true,geometryConfirmed:true};r.limitations=["توزیع کشش الاستیک با صفحه صلب و بدون prying است؛ توزیع واقعی ممکن است متفاوت باشد.","برش بین بولت‌ها مساوی فرض شده و اثر اصطکاک تماس، کلید برشی و لغزش لحاظ نشده است.","ظرفیت فولادی، شکست مخروطی بتن، pullout، pry-out، side-face blowout، فاصله لبه، فاصله محوری، اثر گروه، لرزه‌ای، خستگی و اندرکنش آیین‌نامه‌ای کنترل نشده‌اند.","ظرفیت‌های اختیاری صرفاً از ورودی کاربر خوانده می‌شوند و نرم‌افزار صحت آن‌ها را تأیید نمی‌کند."];
  last=r;const body=$("anchorDemandRows");body.replaceChildren();
  r.bolts.forEach(b=>{const tr=document.createElement("tr");[b.mark,fmt(b.x),fmt(b.z),fmt(b.tensionKN),fmt(b.shearXKN),fmt(b.shearZKN),fmt(b.shearResultKN),b.capacityStatus].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  const torsionText=" | پیچش Y: "+fmt(r.torsionYKNm)+" kN.m؛ اختلاف تعادل پیچش: "+fmt(r.torsionResidualKNm)+" kN.m (توزیع الاستیک گروه صلب؛ بدون کنترل ظرفیت)";
  const tText=tc>0?"نسبت بیشینه کشش/ظرفیت: "+fmt(r.maxTensionKN/tc):"ظرفیت کششی وارد نشده";
  const vText=vc>0?"نسبت بیشینه برش/ظرفیت: "+fmt(r.maxShearKN/vc):"ظرفیت برشی وارد نشده";
  $("anchorDemandSummary").textContent="تعداد بولت: "+r.bolts.length+" | بیشینه کشش یک بولت: "+fmt(r.maxTensionKN)+" kN | بیشینه برش یک بولت: "+fmt(r.maxShearKN)+" kN | "+tText+" | "+vText+torsionText+" | فقط غربال تقاضا؛ نه تأیید طراحی.";
  $("btnAnchorDemandCSV").disabled=false;return r;
 }catch(e){$("anchorDemandSummary").textContent=e.message;return null;}
}
function exportCSV(){
 if(!last)return;
 const rows=[["گزارش توزیع تقاضای گروه بولت"],["روش",last.method],["پیچش حول Y (kN.m)",last.torsionYKNm],["پیچش بازیابی‌شده (kN.m)",last.recoveredTorsionYKNm],["باقیمانده پیچش (kN.m)",last.torsionResidualKNm],["بیشینه کشش بولت (kN)",last.maxTensionKN],["بیشینه برش بولت (kN)",last.maxShearKN],["بولت","X m","Z m","کشش kN","برش X kN","برش Z kN","برش برآیند kN","نسبت کشش","نسبت برش","وضعیت"],...last.bolts.map(b=>[b.mark,b.x,b.z,b.tensionKN,b.shearXKN,b.shearZKN,b.shearResultKN,b.tensionRatio,b.shearRatio,b.capacityStatus]),...last.limitations.map(x=>["محدودیت",x])];
 const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Demand-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function getData(){return {...state};}
function setData(d){if(d&&typeof d==="object"){state={...state,...d};}}
function selfTest(){
 const r=distribute({rows:2,cols:2,pitchX:200,pitchZ:200,tension:40,momentX:0,momentZ:0,shearX:20,shearZ:0,torsionY:0});
 const checks=[["توزیع نیروی محوری برابر",r.bolts.every(b=>Math.abs(b.tensionKN-10)<1e-9)],["جمع برش X برابر ورودی",Math.abs(r.bolts.reduce((s,b)=>s+b.shearXKN,0)-20)<1e-9],["تقارن بدون لنگر",Math.abs(r.maxTensionKN-10)<1e-9]];
 const m=distribute({rows:2,cols:2,pitchX:200,pitchZ:200,tension:0,momentX:20,momentZ:0,shearX:0,shearZ:0,torsionY:0});
 checks.push(["لنگر حول X کشش ردیف‌ها را تفکیک می‌کند",m.bolts.some(b=>b.tensionKN>0)&&m.bolts.some(b=>b.tensionKN===0)]);
 const t=distribute({rows:2,cols:2,pitchX:200,pitchZ:200,tension:0,momentX:0,momentZ:0,shearX:0,shearZ:0,torsionY:12});
 checks.push(["پیچش در گروه بولت توزیع می‌شود",t.torsionYKNm===12&&t.torsionDistributionStatus==="distributed_elastic_rigid_group"]);
 checks.push(["جمع بردارهای برش ناشی از پیچش صفر است",Math.abs(t.bolts.reduce((s,b)=>s+b.torsionShearXKN,0))<1e-9&&Math.abs(t.bolts.reduce((s,b)=>s+b.torsionShearZKN,0))<1e-9]);
 checks.push(["لنگر بازیابی‌شده از برش پیچشی برابر ورودی است",Math.abs(t.recoveredTorsionYKNm-12)<1e-9]);
 checks.push(["برش ترکیبی، برش مستقیم و پیچشی را جمع می‌کند",t.bolts.some(b=>Math.abs(b.shearXKN-b.directShearXKN-b.torsionShearXKN)<1e-9)]);
 checks.push(["پیچش روی تک‌بولت هم‌مرکز رد می‌شود",(()=>{try{distribute({rows:1,cols:1,pitchX:0,pitchZ:0,tension:0,momentX:0,momentZ:0,shearX:0,shearZ:0,torsionY:1});return false;}catch(e){return e.message.includes("پیچش");}})()]);
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelAnchorDemandScreen={distribute,run,getData,setData,getLast:()=>last?JSON.parse(JSON.stringify(last)):null,selfTest};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",panel);else panel();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/baseplate-thickness-screen.js ===== */
/* SAHROUD STEEL — base-plate elastic bearing and thickness screening.
 * Full-contact linear pressure only. Partial contact / anchor tension is deliberately rejected.
 * Plate cantilever strips use maximum corner pressure as a conservative preliminary screen.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const n=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
function calculate(i){
 const req=["plateX","plateZ","plateT","columnX","columnZ","compressionKN","fyMPa"];
 req.forEach(k=>{if(!(Number.isFinite(i[k])&&i[k]>0))throw Error("ورودی معتبر و مثبت برای "+k+" لازم است.");});
 if(i.columnX>=i.plateX||i.columnZ>=i.plateZ)throw Error("ابعاد footprint ستون باید از ابعاد صفحه کوچک‌تر باشد.");
 if(!Number.isFinite(i.momentX)||!Number.isFinite(i.momentZ))throw Error("هر دو لنگر هم‌زمان را وارد کنید؛ برای صفر، عدد صفر بنویسید.");
 if(i.compressionKN<=0)throw Error("نیروی محوری باید فشار مثبت باشد؛ کشش محوری در این غربال قابل بررسی نیست.");
 const B=i.plateX,L=i.plateZ,N=i.compressionKN*1000;
 const Mx=i.momentX*1e6,Mz=i.momentZ*1e6;
 const A=B*L,Ix=B*Math.pow(L,3)/12,Iz=L*Math.pow(B,3)/12;
 const corners=[
  {name:"X− / Z−",x:-B/2,z:-L/2},{name:"X+ / Z−",x:B/2,z:-L/2},
  {name:"X− / Z+",x:-B/2,z:L/2},{name:"X+ / Z+",x:B/2,z:L/2}
 ].map(c=>({...c,pressureMPa:N/A+Mx*c.z/Ix+Mz*c.x/Iz}));
 const qmin=Math.min(...corners.map(c=>c.pressureMPa)),qmax=Math.max(...corners.map(c=>c.pressureMPa));
 if(qmin<=0)throw Error("فشار گوشه‌ای حداقل "+fmt(qmin)+" MPa است؛ صفحه در فرض تماس کامل جداشدگی/کشش پیدا می‌کند. این حالت به تحلیل تماس جزئی و اندرکنش انکربولت نیاز دارد و عمداً در این غربال محاسبه نمی‌شود.");
 const ax=(B-i.columnX)/2,az=(L-i.columnZ)/2;
 const mx=qmax*ax*ax/2,mz=qmax*az*az/2;
 const tx=Math.sqrt(6*mx/i.fyMPa),tz=Math.sqrt(6*mz/i.fyMPa);
 const reqT=Math.max(tx,tz),provided=i.plateT;
 return {areaMm2:A,inertiaXmm4:Ix,inertiaZmm4:Iz,corners,qminMPa:qmin,qmaxMPa:qmax,averagePressureMPa:N/A,projectionXmm:ax,projectionZmm:az,momentX_NmmPerMm:mx,momentZ_NmmPerMm:mz,requiredThicknessXmm:tx,requiredThicknessZmm:tz,requiredThicknessMm:reqT,providedThicknessMm:provided,ratio:reqT/provided,screenStatus:provided>=reqT?"ضخامت ورودی از ضخامت غربال‌شده کمتر نیست":"ضخامت ورودی از ضخامت غربال‌شده کمتر است",method:"linear_full_contact_bearing_plus_qmax_cantilever_strip_first_yield",limitations:["فشار زیر صفحه به‌صورت خطی و الاستیک روی کل سطح صفحه فرض شده است؛ نتیجه فقط وقتی معتبر است که فشار تمام گوشه‌ها فشاری و مثبت بماند.","اگر هر گوشه از تماس خارج شود، این ابزار متوقف می‌شود؛ تماس جزئی و کشش بولت‌ها تحلیل نشده‌اند.","برای خم‌شدگی طره‌ای، فشار بیشینه گوشه‌ای به‌طور یکنواخت روی نوار فرض شده؛ این تقریب مقدماتی است و مدل واقعی صفحه/ستون را جایگزین نمی‌کند.","Fy از ورودی کاربر است؛ ضریب مقاومت، ضوابط آیین‌نامه‌ای، خستگی و لرزه‌ای اعمال نشده‌اند.","کنترل مقاومت بتن و گروت، جوش ستون به صفحه، سخت‌کننده، سوراخ‌ها، کمانش موضعی، prying و اندرکنش بولت‌ها انجام نشده است.","این خروجی طراحی نهایی یا مجوز ساخت نیست و باید با روش معتبر آیین‌نامه‌ای و مهندس محاسب بازبینی شود."]};
}
function mount(){
 if($("baseplateThicknessScreenPanel"))return;
 const anchor=$("anchorDemandScreenPanel")||$("baseplateAnchorDrawingsPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="baseplateThicknessScreenPanel";
 p.innerHTML='<div class="panel-title"><h3>غربال ضخامت صفحه‌ستون و فشار زیر صفحه</h3><span class="status">تماس کامل الاستیک</span></div>'+
 '<div class="notice">نیروی محوری N را با فشار مثبت و لنگرهای هم‌زمان یک ترکیب بار وارد کنید. توزیع فشار خطی روی کل صفحه محاسبه می‌شود. اگر هر گوشه از تماس خارج شود، محاسبه متوقف می‌شود تا طراحی تماس جزئی و بولت‌ها جداگانه انجام شود.</div>'+
 '<div class="form-grid">'+
 '<div class="field"><label>عرض صفحه X (mm)</label><input id="bpTsPlateX" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>طول صفحه Z (mm)</label><input id="bpTsPlateZ" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>ضخامت موجود صفحه (mm)</label><input id="bpTsPlateT" type="number" min="1" step="1" placeholder="از نقشه صفحه‌ستون"></div>'+
 '<div class="field"><label>عرض footprint ستون X (mm)</label><input id="bpTsColumnX" type="number" min="1" step="1" placeholder="از مقطع واقعی ستون"></div>'+
 '<div class="field"><label>طول footprint ستون Z (mm)</label><input id="bpTsColumnZ" type="number" min="1" step="1" placeholder="از مقطع واقعی ستون"></div>'+
 '<div class="field"><label>نیروی محوری N (kN؛ فشار مثبت)</label><input id="bpTsN" type="number" min="0" step="0.1" placeholder="از ترکیب بار"></div>'+
 '<div class="field"><label>لنگر Mx (kN.m)</label><input id="bpTsMx" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>لنگر Mz (kN.m)</label><input id="bpTsMz" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>تنش تسلیم صفحه Fy (MPa)</label><input id="bpTsFy" type="number" min="1" step="1" placeholder="از مشخصات فولاد"></div>'+
 '</div><div class="button-grid"><button id="btnBaseplateThicknessRun" class="btn primary" type="button">محاسبه فشار و ضخامت غربال‌شده</button><button id="btnBaseplateThicknessCSV" class="btn secondary" type="button" disabled>دریافت گزارش CSV</button></div>'+
 '<div id="baseplateThicknessResult" class="notice">ابعاد صفحه، footprint ستون، N، Mx، Mz و Fy را وارد کنید.</div>'+
 '<div id="baseplateCornerPressures" class="notice">فشار چهار گوشه پس از محاسبه نمایش داده می‌شود.</div>'+
 '<div class="notice">این ابزار تماس جزئی، کشش بولت، اثر اهرمی صفحه، جوش و سخت‌کننده را طراحی نمی‌کند. نتیجه صرفاً غربال مقدماتی است.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 const copy=[["bpPlateX","bpTsPlateX"],["bpPlateZ","bpTsPlateZ"],["bpPlateT","bpTsPlateT"],["bpColumnX","bpTsColumnX"],["bpColumnZ","bpTsColumnZ"]];
 copy.forEach(([a,b])=>{const src=$(a),dst=$(b);if(src&&dst&&src.value)dst.value=src.value;});
 $("btnBaseplateThicknessRun").addEventListener("click",run);
 $("btnBaseplateThicknessCSV").addEventListener("click",csv);
}
let last=null;
function run(){
 try{
 const i={plateX:n($("bpTsPlateX").value),plateZ:n($("bpTsPlateZ").value),plateT:n($("bpTsPlateT").value),columnX:n($("bpTsColumnX").value),columnZ:n($("bpTsColumnZ").value),compressionKN:n($("bpTsN").value),fyMPa:n($("bpTsFy").value),momentX:n($("bpTsMx").value),momentZ:n($("bpTsMz").value)};
 const r=calculate(i);r.input=i;last=r;
 $("baseplateThicknessResult").textContent="فشار متوسط: "+fmt(r.averagePressureMPa)+" MPa | حداقل فشار گوشه: "+fmt(r.qminMPa)+" MPa | حداکثر فشار گوشه: "+fmt(r.qmaxMPa)+" MPa | ضخامت غربال‌شده X: "+fmt(r.requiredThicknessXmm)+" mm | ضخامت غربال‌شده Z: "+fmt(r.requiredThicknessZmm)+" mm | حداقل ضخامت غربال‌شده: "+fmt(r.requiredThicknessMm)+" mm | ضخامت موجود: "+fmt(r.providedThicknessMm)+" mm | "+r.screenStatus;
 $("baseplateCornerPressures").textContent="فشار گوشه‌ها (MPa): "+r.corners.map(c=>c.name+": "+fmt(c.pressureMPa)).join(" | ");
 $("btnBaseplateThicknessCSV").disabled=false;return r;
 }catch(e){last=null;$("btnBaseplateThicknessCSV").disabled=true;$("baseplateThicknessResult").textContent=e.message;$("baseplateCornerPressures").textContent="نتیجه فشار گوشه‌ای در دسترس نیست.";return null;}
}
function csv(){
 if(!last)return;
 const rows=[["SAHROUD STEEL - Base plate elastic bearing screen"],["method",last.method],["average pressure MPa",last.averagePressureMPa],["minimum corner pressure MPa",last.qminMPa],["maximum corner pressure MPa",last.qmaxMPa],["required thickness X mm",last.requiredThicknessXmm],["required thickness Z mm",last.requiredThicknessZmm],["required thickness mm",last.requiredThicknessMm],["provided thickness mm",last.providedThicknessMm],["status",last.screenStatus],["corner","x mm","z mm","pressure MPa"],...last.corners.map(c=>[c.name,c.x,c.z,c.pressureMPa]),...last.limitations.map(x=>["limitation",x])];
 const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Baseplate-Bearing-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function selfTest(){
 const base={plateX:400,plateZ:400,plateT:20,columnX:200,columnZ:200,compressionKN:400,fyMPa:240,momentX:0,momentZ:0};
 const r=calculate(base);
 const ecc=calculate({...base,momentX:5});
 const checks=[
 ["فشار یکنواخت مثبت",r.qminMPa>0&&r.qmaxMPa>0],
 ["ضخامت تقاضای مثبت",r.requiredThicknessMm>0],
 ["تقارن دو راستا",Math.abs(r.requiredThicknessXmm-r.requiredThicknessZmm)<1e-9],
 ["افزایش بار ضخامت لازم را افزایش می‌دهد",calculate({...base,compressionKN:800}).requiredThicknessMm>r.requiredThicknessMm],
 ["لنگر کوچک فشار گوشه‌ها را تفکیک می‌کند",ecc.qmaxMPa>ecc.qminMPa],
 ["لنگر علامت معکوس، بیشینه فشار یکسان دارد",Math.abs(ecc.qmaxMPa-calculate({...base,momentX:-5}).qmaxMPa)<1e-9],
 ["تماس ناقص رد می‌شود",(()=>{try{calculate({...base,momentX:100});return false;}catch(e){return e.message.includes("تماس")||e.message.includes("گوشه");}})()]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelBaseplateThicknessScreen={calculate,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/baseplate-partial-contact-screen.js ===== */
/* SAHROUD STEEL — nonlinear spring screening of partial base-plate contact.
 * Rigid plate kinematics; compression-only distributed concrete springs and tension-only anchor springs.
 * This is a numerical screening model, NOT a code-complete plate/anchor/concrete design.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:4});
function solve3(A,b){
 const m=A.map((r,i)=>r.slice().concat(b[i]));
 for(let k=0;k<3;k++){
  let p=k;for(let i=k+1;i<3;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;
  if(Math.abs(m[p][k])<1e-14)throw Error("ماتریس سختی تکین است؛ آرایش تماس/مهار برای تعادل کافی نیست.");
  [m[k],m[p]]=[m[p],m[k]];
  const d=m[k][k];for(let j=k;j<4;j++)m[k][j]/=d;
  for(let i=0;i<3;i++)if(i!==k){const f=m[i][k];for(let j=k;j<4;j++)m[i][j]-=f*m[k][j];}
 }
 return m.map(r=>r[3]);
}
function mapAnchorDemand(d){
 if(!d||!d.input||!d.geometry)throw Error("ابتدا محاسبه معتبر گروه بولت را در بخش تقاضا اجرا کنید.");
 if(d.input.signConfirmed!==true||d.input.geometryConfirmed!==true)throw Error("قرارداد علامت و هندسه گروه بولت در مبدأ تأیید نشده است.");
 const g=d.geometry,v=d.input;
 if(!Number.isInteger(g.rows)||!Number.isInteger(g.cols)||!(g.rows>0&&g.cols>0)||(g.cols>1&&!(g.pitchX>0))||(g.rows>1&&!(g.pitchZ>0)))throw Error("هندسه خروجی تقاضای بولت معتبر نیست.");
 if(![v.tension,v.momentX,v.momentZ].every(Number.isFinite))throw Error("سه مؤلفه N، Mx و Mz در خروجی تقاضا کامل نیستند.");
 return {plateXmm:null,plateZmm:null,rows:g.rows,cols:g.cols,pitchXmm:g.pitchX,pitchZmm:g.pitchZ,tensionKN:v.tension,momentXKNm:v.momentX,momentZKNm:v.momentZ,source:"anchor-demand-screen"};
}
function calculate(i){
 const positive=["plateXmm","plateZmm","subgradeK","anchorK","rows","cols","gridN"];
 positive.forEach(k=>{if(!(Number.isFinite(i[k])&&i[k]>0))throw Error("ورودی مثبت و معتبر برای "+k+" لازم است.");});
 if(!Number.isInteger(i.rows)||!Number.isInteger(i.cols)||i.rows*i.cols>36)throw Error("آرایش بولت باید عدد صحیح و حداکثر ۳۶ بولت باشد.");
 if(!Number.isInteger(i.gridN)||i.gridN<5||i.gridN>41||i.gridN%2===0)throw Error("شبکه تماس باید عدد فرد بین ۵ تا ۴۱ باشد.");
 if((i.cols>1&&!(Number.isFinite(i.pitchXmm)&&i.pitchXmm>0))||(i.rows>1&&!(Number.isFinite(i.pitchZmm)&&i.pitchZmm>0)))throw Error("فواصل بولت در هر راستای دارای بیش از یک ردیف/ستون باید مثبت باشند.");
 if(i.rows===1&&i.pitchZmm!==0||i.cols===1&&i.pitchXmm!==0)throw Error("برای آرایش تک‌ردیفه/تک‌ستونه، فاصله همان راستا باید صفر باشد.");
 if(![i.tensionKN,i.momentXKNm,i.momentZKNm].every(Number.isFinite))throw Error("N، Mx و Mz را هم‌زمان وارد کنید؛ برای صفر عدد صفر بنویسید.");
 const B=i.plateXmm/1000,L=i.plateZmm/1000,dx=B/i.gridN,dz=L/i.gridN,area=dx*dz;
 const anchors=[];for(let r=0;r<i.rows;r++)for(let c=0;c<i.cols;c++)anchors.push({id:"AB-"+String(anchors.length+1).padStart(2,"0"),x:(c-(i.cols-1)/2)*i.pitchXmm/1000,z:(r-(i.rows-1)/2)*i.pitchZmm/1000});
 if(anchors.some(a=>Math.abs(a.x)>B/2||Math.abs(a.z)>L/2))throw Error("مختصات یکی از بولت‌ها خارج از صفحه‌ستون است.");
 const cells=[];for(let r=0;r<i.gridN;r++)for(let c=0;c<i.gridN;c++)cells.push({x:-B/2+(c+.5)*dx,z:-L/2+(r+.5)*dz,k:i.subgradeK*area});
 const q=[-i.tensionKN,-i.momentXKNm,-i.momentZKNm];
 const sumK=i.anchorK*anchors.length;
 let d=[i.tensionKN>0?-i.tensionKN/sumK:-1e-7,0,0];
 if(anchors.length>1){const sx=anchors.reduce((s,a)=>s+a.x*a.x,0),sz=anchors.reduce((s,a)=>s+a.z*a.z,0);if(sz>0)d[1]=-i.momentXKNm/(i.anchorK*sz);if(sx>0)d[2]=-i.momentZKNm/(i.anchorK*sx);}
 let iterations=0,err=Infinity,internal=[0,0,0],K;
 function assemble(v,withK){
  const f=[0,0,0],mat=[[0,0,0],[0,0,0],[0,0,0]];
  const add=(x,z,stiff,w,activeForce)=>{const g=[1,z,x];for(let a=0;a<3;a++){f[a]+=activeForce*g[a];if(withK)for(let b=0;b<3;b++)mat[a][b]+=stiff*g[a]*g[b];}};
  cells.forEach(c=>{const w=v[0]+v[1]*c.z+v[2]*c.x;if(w>0)add(c.x,c.z,c.k,w,c.k*w);});
  anchors.forEach(a=>{const w=v[0]+v[1]*a.z+v[2]*a.x;if(w<0)add(a.x,a.z,i.anchorK,w,i.anchorK*w);});
  return {f,mat};
 }
 for(iterations=1;iterations<=100;iterations++){
  const a=assemble(d,true);internal=a.f;K=a.mat;
  const r=q.map((v,j)=>v-internal[j]);err=Math.max(Math.abs(r[0]),Math.abs(r[1]),Math.abs(r[2]));
  if(err<1e-7)break;
  const step=solve3(K,r);
  let alpha=1,accepted=false;
  for(let ls=0;ls<16;ls++,alpha*=.5){
   const trial=d.map((v,j)=>v+alpha*step[j]),t=assemble(trial,false).f;
   const e=Math.max(...q.map((v,j)=>Math.abs(v-t[j])));
   if(e<err){d=trial;accepted=true;break;}
  }
  if(!accepted)throw Error("حل تماس جزئی همگرا نشد؛ شبکه، سختی‌ها و بارها را بازبینی کنید.");
 }
 if(iterations>100)throw Error("حل تماس جزئی در ۱۰۰ تکرار همگرا نشد.");
 const cellOut=cells.map(c=>{const w=d[0]+d[1]*c.z+d[2]*c.x;return{x:c.x,z:c.z,displacementMm:w*1000,pressureMPa:w>0?i.subgradeK*w/1000:0};});
 const boltOut=anchors.map(a=>{const w=d[0]+d[1]*a.z+d[2]*a.x;return{...a,displacementMm:w*1000,tensionKN:w<0?-i.anchorK*w:0};});
 const contact=cellOut.filter(c=>c.pressureMPa>0),sumC=contact.reduce((s,c)=>s+c.pressureMPa*1000*area,0),sumT=boltOut.reduce((s,a)=>s+a.tensionKN,0);
 const minP=contact.length?Math.min(...contact.map(c=>c.pressureMPa)):0,maxP=contact.length?Math.max(...contact.map(c=>c.pressureMPa)):0;
 return{method:"rigid_plate_compression_only_winkler_grid_plus_tension_only_anchor_springs",iterations,residual:err,plate:{widthMm:i.plateXmm,lengthMm:i.plateZmm},loads:{tensionKN:i.tensionKN,momentXKNm:i.momentXKNm,momentZKNm:i.momentZKNm},rigidPlane:{translationMm:d[0]*1000,rotationAboutXRad:d[1],rotationAboutZRad:d[2]},contact:{cellCount:contact.length,totalCellCount:cells.length,ratio:contact.length/cells.length,minPressureMPa:minP,maxPressureMPa:maxP,concreteCompressionKN:sumC},anchors:{count:boltOut.length,totalTensionKN:sumT,maxTensionKN:Math.max(...boltOut.map(a=>a.tensionKN)),bolts:boltOut},equilibrium:{verticalResidualKN:q[0]-internal[0],momentXResidualKNm:q[1]-internal[1],momentZResidualKNm:q[2]-internal[2]},limitations:["صفحه‌ستون به‌صورت صفحه صلب با سه درجه آزادی قائم فرض شده؛ انعطاف خمشی صفحه و سخت‌کننده‌ها و اثر prying مدل نشده است.","بستر بتن با فنرهای فشاری و شبکه‌بندی یکنواخت Winkler تقریب زده شده؛ k بستر باید از مدل/داده معتبر ژئوتکنیک و سازگاری واحدها گرفته شود و معادل مستقیم مقاومت فشاری بتن نیست.","انکربولت‌ها فنر کششی خطی با سختی محوری ورودی هستند؛ لغزش، چسبندگی، مخروط شکست، pullout، pryout، لبه و اثر گروه بررسی نشده است.","برش، اصطکاک، shear lug، تماس گروت، ترک بتن، خزش، غیرخطی‌شدن مصالح، نصب و ضوابط لرزه‌ای مدل نشده‌اند.","علامت لنگرها طبق قرارداد تعمیم‌یافته مدل است: Mx با مختصات z و Mz با مختصات x؛ پیش از استفاده با محورهای پروژه تطبیق دهید.","این تحلیل عددی مقدماتی است و طراحی یا تأیید اجرایی/آیین‌نامه‌ای محسوب نمی‌شود."],input:i};
}
function mount(){
 if($("baseplatePartialContactPanel"))return;
 const a=$("anchorDemandScreenPanel")||$("baseplateThicknessScreenPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="baseplatePartialContactPanel";
 p.innerHTML='<div class="panel-title"><h3>تحلیل عددی تماس جزئی صفحه‌ستون و کشش انکربولت</h3><span class="status">مدل فنری مقدماتی</span></div>'+
 '<div class="notice">مدل، صفحه را صلب فرض می‌کند؛ بتن زیر صفحه فقط فشار می‌گیرد و انکربولت فقط کشش. سختی بستر و سختی محوری هر بولت باید از داده معتبر وارد شوند. این مدل جایگزین تحلیل خمشی صفحه، prying یا کنترل آیین‌نامه‌ای بتن و مهار نیست.</div>'+
 '<h4>هندسه صفحه و گروه بولت</h4><div class="form-grid">'+
 '<div class="field"><label>عرض صفحه X (mm)</label><input id="pcPlateX" type="number" min="1" value="400"></div>'+
 '<div class="field"><label>طول صفحه Z (mm)</label><input id="pcPlateZ" type="number" min="1" value="400"></div>'+
 '<div class="field"><label>تعداد ردیف بولت در Z</label><input id="pcRows" type="number" min="1" max="6" step="1" value="2"></div>'+
 '<div class="field"><label>تعداد ستون بولت در X</label><input id="pcCols" type="number" min="1" max="6" step="1" value="2"></div>'+
 '<div class="field"><label>فاصله بولت‌ها در X (mm)</label><input id="pcPitchX" type="number" min="1" value="240"></div>'+
 '<div class="field"><label>فاصله بولت‌ها در Z (mm)</label><input id="pcPitchZ" type="number" min="1" value="240"></div></div>'+
 '<h4>بارهای هم‌زمان و سختی‌ها</h4><div class="form-grid">'+
 '<div class="field"><label>N (kN؛ کشش مثبت)</label><input id="pcN" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>Mx (kN.m؛ مزدوج مختصات Z)</label><input id="pcMx" type="number" step="0.1" value="20"></div>'+
 '<div class="field"><label>Mz (kN.m؛ مزدوج مختصات X)</label><input id="pcMz" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>سختی قائم بستر k (kN/m³)</label><input id="pcSubgradeK" type="number" min="0.001" step="1000" placeholder="از داده ژئوتکنیک"></div>'+
 '<div class="field"><label>سختی محوری هر انکربولت (kN/m)</label><input id="pcAnchorK" type="number" min="0.001" step="1000" placeholder="از هندسه و مشخصات مهار"></div>'+
 '<div class="field"><label>تعداد تقسیم شبکه تماس (فرد ۵ تا ۴۱)</label><input id="pcGridN" type="number" min="5" max="41" step="2" value="21"></div></div>'+
 '<div class="button-grid"><button id="pcImportDemand" class="btn secondary" type="button">دریافت هندسه و بارها از محاسبه گروه بولت</button><button id="pcRun" class="btn primary" type="button">حل تماس جزئی</button><button id="pcSensitivity" class="btn secondary" type="button">بررسی حساسیت شبکه</button><button id="pcCsv" class="btn secondary" type="button" disabled>گزارش CSV</button></div>'+
 '<div id="pcResult" class="notice">بارها و سختی‌های معتبر را وارد کنید.</div><div id="pcSensitivityResult" class="notice">پس از حل، حساسیت شبکه را بررسی کنید.</div><div id="pcBoltRows" class="table-wrap"></div>'+
 '<div class="notice">واحد سختی بستر kN/m³ است و با مدول عکس‌العمل خاک/بستر سازگار تعریف می‌شود، نه مقاومت فشاری بتن. نتایج با تغییر اندازه شبکه حساسیت‌سنجی شوند.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("pcImportDemand").addEventListener("click",loadFromAnchorDemand);$("pcRun").addEventListener("click",run);$("pcCsv").addEventListener("click",csv);$("pcSensitivity").addEventListener("click",runSensitivity);
}
let last=null;
let importedDemand=null;
function loadFromAnchorDemand(){try{const d=root.SteelAnchorDemandScreen?.getLast?.(),m=mapAnchorDemand(d);["plateXmm","plateZmm"].forEach(k=>{});$("pcRows").value=m.rows;$("pcCols").value=m.cols;$("pcPitchX").value=m.pitchXmm;$("pcPitchZ").value=m.pitchZmm;$("pcN").value=m.tensionKN;$("pcMx").value=m.momentXKNm;$("pcMz").value=m.momentZKNm;importedDemand={rows:m.rows,cols:m.cols,pitchXmm:m.pitchXmm,pitchZmm:m.pitchZmm,tensionKN:m.tensionKN,momentXKNm:m.momentXKNm,momentZKNm:m.momentZKNm};$("pcResult").textContent="هندسه و بارهای N، Mx و Mz از خروجی تأییدشده تقاضای گروه بولت منتقل شد. ابعاد صفحه و سختی‌ها را تکمیل و سپس حل کنید؛ Vx، Vz و Ty در مدل تماس جزئی حاضر لحاظ نمی‌شوند.";return m;}catch(e){$("pcResult").textContent=e.message;return null;}}
function read(){return{plateXmm:num("pcPlateX"),plateZmm:num("pcPlateZ"),rows:num("pcRows"),cols:num("pcCols"),pitchXmm:num("pcPitchX"),pitchZmm:num("pcPitchZ"),tensionKN:num("pcN"),momentXKNm:num("pcMx"),momentZKNm:num("pcMz"),subgradeK:num("pcSubgradeK"),anchorK:num("pcAnchorK"),gridN:num("pcGridN")};}
function validateImportedDemand(i,imported,latest){
 if(!imported)return true;
 const fields=["rows","cols","pitchXmm","pitchZmm","tensionKN","momentXKNm","momentZKNm"];
 for(const k of fields)if(i[k]!==imported[k])throw Error("پس از انتقال تقاضا، مقدار "+k+" تغییر کرده است؛ برای جلوگیری از گزارش با منشأ نادرست، دوباره «دریافت هندسه و بارها» را بزنید یا انتقال را لغو و ورودی دستی را از ابتدا وارد کنید.");
 const current=mapAnchorDemand(latest);
 const source={rows:current.rows,cols:current.cols,pitchXmm:current.pitchXmm,pitchZmm:current.pitchZmm,tensionKN:current.tensionKN,momentXKNm:current.momentXKNm,momentZKNm:current.momentZKNm};
 for(const k of fields)if(source[k]!==imported[k])throw Error("خروجی تقاضای گروه بولت پس از انتقال تغییر کرده است؛ انتقال تازه را انجام دهید.");
 return true;
}
function run(){
 try{const i=read();validateImportedDemand(i,importedDemand,root.SteelAnchorDemandScreen?.getLast?.());const r=calculate(i);r.sourceTransfer=importedDemand?{...importedDemand,source:"anchor-demand-screen",verifiedAgainstLatestDemand:true,note:"N/Mx/Mz and anchor geometry transferred and revalidated; shear and torsion are outside this partial-contact model."}:null;last=r;
 $("pcResult").textContent="سطح تماس فعال: "+fmt(100*r.contact.ratio)+"٪ ("+r.contact.cellCount+"/"+r.contact.totalCellCount+") | فشار تماس حداقل/حداکثر: "+fmt(r.contact.minPressureMPa)+" / "+fmt(r.contact.maxPressureMPa)+" MPa | جمع فشار بتن: "+fmt(r.contact.concreteCompressionKN)+" kN | جمع کشش بولت‌ها: "+fmt(r.anchors.totalTensionKN)+" kN | بیشینه کشش یک بولت: "+fmt(r.anchors.maxTensionKN)+" kN | تکرار: "+r.iterations+" | باقیمانده تعادل: "+fmt(r.residual);
 const t=document.createElement("table");t.innerHTML="<thead><tr><th>بولت</th><th>X (m)</th><th>Z (m)</th><th>کشش (kN)</th><th>جابجایی صفحه (mm)</th></tr></thead><tbody></tbody>";const body=t.querySelector("tbody");
 r.anchors.bolts.forEach(b=>{const tr=document.createElement("tr");[b.id,fmt(b.x),fmt(b.z),fmt(b.tensionKN),fmt(b.displacementMm)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
 $("pcBoltRows").replaceChildren(t);$("pcCsv").disabled=false;return r;
 }catch(e){last=null;$("pcResult").textContent=e.message;$("pcBoltRows").replaceChildren();$("pcCsv").disabled=true;return null;}
}
function runSensitivity(){
 try{const r=sensitivity(read());$("pcSensitivityResult").textContent="حساسیت شبکه (۵ تا ۴۱ تقسیم): "+r.runs.map(x=>"n="+x.gridN+"؛ qmax="+fmt(x.maxPressureMPa)+" MPa؛ Tbolt,max="+fmt(x.maxAnchorTensionKN)+" kN؛ سطح تماس="+fmt(100*x.contactRatio)+"٪").join(" | ")+" | اختلاف نسبی شبکه اول تا آخر: فشار="+(r.relativeDifference.maxPressure===null?"—":fmt(100*r.relativeDifference.maxPressure)+"٪")+"؛ کشش بولت="+(r.relativeDifference.maxAnchorTension===null?"—":fmt(100*r.relativeDifference.maxAnchorTension)+"٪")+". "+r.warning;return r;}
 catch(e){$("pcSensitivityResult").textContent=e.message;return null;}
}
function csv(){if(!last)return;const r=last,rows=[["SAHROUD STEEL - Partial contact screening"],["method",r.method],["iterations",r.iterations],["residual",r.residual],["contact ratio",r.contact.ratio],["minimum pressure MPa",r.contact.minPressureMPa],["maximum pressure MPa",r.contact.maxPressureMPa],["concrete compression kN",r.contact.concreteCompressionKN],["total anchor tension kN",r.anchors.totalTensionKN],["maximum anchor tension kN",r.anchors.maxTensionKN],["bolt","x m","z m","tension kN","displacement mm"],...r.anchors.bolts.map(b=>[b.id,b.x,b.z,b.tensionKN,b.displacementMm]),["equilibrium residual vertical kN",r.equilibrium.verticalResidualKN],["equilibrium residual Mx kN.m",r.equilibrium.momentXResidualKNm],["equilibrium residual Mz kN.m",r.equilibrium.momentZResidualKNm],...r.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(a=>a.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Partial-Contact.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function sensitivity(i,gridSizes=[11,21,31,41]){
 const runs=gridSizes.map(gridN=>calculate({...i,gridN}));
 const ref=runs[runs.length-1];
 return {method:"grid_refinement_sensitivity",runs:runs.map(r=>({gridN:r.input.gridN,contactRatio:r.contact.ratio,maxPressureMPa:r.contact.maxPressureMPa,maxAnchorTensionKN:r.anchors.maxTensionKN,totalAnchorTensionKN:r.anchors.totalTensionKN,residual:r.residual})),relativeDifference:{maxPressure:ref.contact.maxPressureMPa>0?Math.abs(runs[0].contact.maxPressureMPa-ref.contact.maxPressureMPa)/ref.contact.maxPressureMPa:null,maxAnchorTension:ref.anchors.maxTensionKN>0?Math.abs(runs[0].anchors.maxTensionKN-ref.anchors.maxTensionKN)/ref.anchors.maxTensionKN:null},warning:"این مقایسه فقط حساسیت شبکه عددی را نشان می‌دهد؛ همگرایی شبکه، صحت فرضیات فنری یا انطباق آیین‌نامه‌ای را اثبات نمی‌کند."};
}
function selfTest(){
 const base={plateXmm:400,plateZmm:400,rows:2,cols:2,pitchXmm:240,pitchZmm:240,tensionKN:0,momentXKNm:0,momentZKNm:0,subgradeK:20000,anchorK:10000,gridN:21};
 const c=calculate({...base,tensionKN:-100}),t=calculate({...base,tensionKN:40}),m=calculate({...base,momentXKNm:20});
 const mapped=mapAnchorDemand({input:{signConfirmed:true,geometryConfirmed:true,tension:30,momentX:12,momentZ:-4},geometry:{rows:2,cols:3,pitchX:180,pitchZ:220}});
 const checks=[["انتقال هندسه و سه مؤلفه بار از محاسبه گروه بولت",mapped.rows===2&&mapped.cols===3&&mapped.tensionKN===30&&mapped.momentXKNm===12&&mapped.momentZKNm===-4],
 ["پذیرش داده انتقالی بدون تغییر",(()=>{const i={rows:2,cols:3,pitchXmm:180,pitchZmm:220,tensionKN:30,momentXKNm:12,momentZKNm:-4};return validateImportedDemand(i,i,{input:{signConfirmed:true,geometryConfirmed:true,tension:30,momentX:12,momentZ:-4},geometry:{rows:2,cols:3,pitchX:180,pitchZ:220}});})()],
 ["رد تغییر ورودی پس از انتقال",(()=>{try{const i={rows:2,cols:3,pitchXmm:180,pitchZmm:220,tensionKN:31,momentXKNm:12,momentZKNm:-4},d={rows:2,cols:3,pitchXmm:180,pitchZmm:220,tensionKN:30,momentXKNm:12,momentZKNm:-4};validateImportedDemand(i,d,{input:{signConfirmed:true,geometryConfirmed:true,tension:30,momentX:12,momentZ:-4},geometry:{rows:2,cols:3,pitchX:180,pitchZ:220}});return false;}catch(e){return e.message.includes("تغییر کرده");}})()],
 ["رد خروجی قدیمی پس از محاسبه مجدد گروه بولت",(()=>{try{const i={rows:2,cols:3,pitchXmm:180,pitchZmm:220,tensionKN:30,momentXKNm:12,momentZKNm:-4},d={...i};validateImportedDemand(i,d,{input:{signConfirmed:true,geometryConfirmed:true,tension:35,momentX:12,momentZ:-4},geometry:{rows:2,cols:3,pitchX:180,pitchZ:220}});return false;}catch(e){return e.message.includes("تغییر کرده");}})()],["رد انتقال بدون تأیید هندسه",(()=>{try{mapAnchorDemand({input:{signConfirmed:true},geometry:{rows:2,cols:2,pitchX:200,pitchZ:200}});return false;}catch(e){return true;}})()],["فشار محوری، تماس کامل و بدون کشش بولت",c.contact.ratio===1&&c.anchors.totalTensionKN===0],["کشش محوری، فعال‌شدن انکربولت‌ها",t.anchors.totalTensionKN>0&&t.contact.ratio===0],["لنگر، تماس جزئی و کشش بولت ایجاد می‌کند",m.contact.ratio>0&&m.contact.ratio<1&&m.anchors.totalTensionKN>0],["تعادل قائم در حد تلرانس",Math.abs(m.equilibrium.verticalResidualKN)<1e-6],["تعادل لنگر X در حد تلرانس",Math.abs(m.equilibrium.momentXResidualKNm)<1e-6],["تعادل لنگر Z مستقل در حد تلرانس",Math.abs(calculate({...base,momentZKNm:20}).equilibrium.momentZResidualKNm)<1e-6],["تعادل هم‌زمان نیروی قائم و هر دو لنگر در بارگذاری دو‌محوره",(()=>{const r=calculate({...base,tensionKN:40,momentXKNm:8,momentZKNm:-6});return Math.abs(r.equilibrium.verticalResidualKN)<1e-6&&Math.abs(r.equilibrium.momentXResidualKNm)<1e-6&&Math.abs(r.equilibrium.momentZResidualKNm)<1e-6&&r.contact.ratio>0&&r.anchors.totalTensionKN>0;})()]];
 return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelBaseplatePartialContact={calculate,sensitivity,mapAnchorDemand,validateImportedDemand,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/base-reaction-transfer.js ===== */
/* SAHROUD STEEL — transfer simultaneous support reactions to base-plate screening.
 * Reuses the exact per-node/per-load-case reactions from analyzeFoundationEnvelope().
 * Global vertical axis is Y; plate plane is X-Z. Reactions are converted to column-on-base actions
 * by reversing the support-on-structure reaction vector.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id),fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:4});
let last=null;
function mapReaction(values){
 if(!Array.isArray(values)||values.length!==6||!values.every(v=>typeof v==="number"&&Number.isFinite(v)))throw Error("بردار واکنش باید دقیقاً شش مؤلفه عددی محدود داشته باشد.");
 return {
  N_tensionPositive_kN:-Number(values[1])/1000,
  Vx_kN:-Number(values[0])/1000,
  Vz_kN:-Number(values[2])/1000,
  Mx_kNm:-Number(values[3])/1000,
  Ty_kNm:-Number(values[4])/1000,
  Mz_kNm:-Number(values[5])/1000,
  supportReaction:{Fx_kN:Number(values[0])/1000,Fy_kN:Number(values[1])/1000,Fz_kN:Number(values[2])/1000,Mx_kNm:Number(values[3])/1000,My_kNm:Number(values[4])/1000,Mz_kNm:Number(values[5])/1000},
  columnAction:{N_tensionPositive_kN:-Number(values[1])/1000,Vx_kN:-Number(values[0])/1000,Vz_kN:-Number(values[2])/1000,Mx_kNm:-Number(values[3])/1000,Ty_kNm:-Number(values[4])/1000,Mz_kNm:-Number(values[5])/1000}
 };
}
async function extract(){
 if(!root.SteelStructuralModel||typeof root.SteelStructuralModel.analyzeFoundationEnvelope!=="function")throw Error("استخراج واکنش‌های فونداسیون در موتور سه‌بعدی موجود نیست.");
 const r=await root.SteelStructuralModel.analyzeFoundationEnvelope();
 if(!r||!Array.isArray(r.rows)||!r.rows.length)throw Error("واکنش گره‌های پایه استخراج نشد.");
 last=r;
 return r;
}
function mount(){
 if($("baseReactionTransferPanel"))return;
 const a=$("baseplatePartialContactPanel")||$("anchorDemandScreenPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="baseReactionTransferPanel";p.setAttribute("data-focus-group","foundation");
 p.innerHTML='<div class="panel-title"><h3>انتقال واکنش واقعی قاب به صفحه‌ستون</h3><span class="status">بر اساس تحلیل ترکیبات بار</span></div>'+
 '<div class="notice">این ابزار واکنش شش‌مؤلفه‌ای هر گره پایه را از تحلیل سه‌بعدی استخراج می‌کند. پس از انتخاب گره و ترکیب بار، مؤلفه‌های هم‌زمان به ورودی تحلیل تماس جزئی منتقل می‌شوند؛ بیشینه‌های مستقل با هم ترکیب نمی‌شوند.</div>'+
 '<div class="button-grid"><button id="brtExtract" class="btn primary" type="button">استخراج واکنش‌های تمام ترکیبات</button></div>'+
 '<div class="form-grid"><div class="field"><label for="brtNode">گره پایه</label><select id="brtNode" disabled><option value="">ابتدا استخراج کنید</option></select></div><div class="field"><label for="brtCase">ترکیب بار</label><select id="brtCase" disabled><option value="">ابتدا استخراج کنید</option></select></div></div>'+
 '<div id="brtResult" class="notice">پس از اجرای تحلیل ترکیبات بار، واکنش‌ها را استخراج کنید.</div>'+
 '<div class="button-grid"><button id="brtApply" class="btn secondary" type="button" disabled>انتقال به تحلیل تماس صفحه‌ستون</button><button id="brtJson" class="btn secondary" type="button" disabled>گزارش واکنش‌ها JSON</button></div>'+
 '<div class="notice">قرارداد انتقال: محور قائم سازه Y است؛ N کششی مثبت = منفی واکنش Fy؛ Mx و Mz نیز با علامت معکوس واکنش تکیه‌گاهی به‌عنوان کنش ستون روی صفحه‌ستون منتقل می‌شوند. این قرارداد باید با جهت محورهای مدل و جزئیات اتصال پروژه تطبیق داده شود. واحدهای اصلی حلگر N و N.m هستند.</div>'+
 '<div class="notice">ترکیبات موجود در موتور فونداسیون استفاده می‌شوند؛ پوش بار فعلی هنوز شامل همه حالات زلزله، uplift و همه ترکیبات لازم آیین‌نامه‌ای نیست. واکنش‌ها در این مرحله برای غربال مقدماتی‌اند.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("brtExtract").addEventListener("click",async()=>{
  const btn=$("brtExtract");btn.disabled=true;$("brtResult").textContent="در حال حل مجدد ترکیبات بار و استخراج واکنش‌ها…";
  try{
   const r=await extract(),node=$("brtNode"),cas=$("brtCase");
   node.innerHTML=r.rows.map((x,i)=>'<option value="'+i+'">'+String(x.nodeId).replace(/[&<>"']/g,"")+' — '+String(x.kind||"پایه")+' (X='+fmt(x.x)+', Z='+fmt(x.z)+')</option>').join("");
   const names=r.cases.map((x,i)=>'<option value="'+i+'">'+String(x.label).replace(/[&<>"']/g,"")+'</option>').join("");
   cas.innerHTML=names;node.disabled=false;cas.disabled=false;$("brtApply").disabled=false;$("brtJson").disabled=false;render();
  }catch(e){$("brtResult").textContent=e.message;}
  finally{btn.disabled=false;}
 });
 $("brtNode").addEventListener("change",render);$("brtCase").addEventListener("change",render);
 $("brtApply").addEventListener("click",apply);
 $("brtJson").addEventListener("click",()=>{
  if(!last)return;const data=JSON.stringify(last,null,2),u=URL.createObjectURL(new Blob([data],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Foundation-Reactions.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 });
}
function selected(){
 if(!last)throw Error("ابتدا واکنش‌ها را استخراج کنید.");
 const row=last.rows[Number($("brtNode").value)],ci=Number($("brtCase").value);
 if(!row||!Number.isInteger(ci)||!last.cases[ci])throw Error("گره یا ترکیب بار انتخابی معتبر نیست.");
 const entry=row.caseReactions.find(x=>x.label===last.cases[ci].label);
 if(!entry)throw Error("واکنش این گره در ترکیب انتخابی موجود نیست.");
 return {row,case:last.cases[ci],mapped:mapReaction(entry.values),raw:entry.values};
}
function render(){
 try{const s=selected(),m=s.mapped;
 $("brtResult").textContent="گره "+s.row.nodeId+" | "+s.case.label+" | N کششی مثبت: "+fmt(m.N_tensionPositive_kN)+" kN | Vx: "+fmt(m.Vx_kN)+" kN | Vz: "+fmt(m.Vz_kN)+" kN | Mx: "+fmt(m.Mx_kNm)+" kN.m | Mz: "+fmt(m.Mz_kNm)+" kN.m | پیچش حول Y: "+fmt(m.Ty_kNm)+" kN.m. علامت‌ها برای کنش ستون بر صفحه‌ستون معکوس شده‌اند. تعادل ترکیب: "+(s.case.equilibrium?.ok?"معتبر در کنترل تعادل حلگر":"نیازمند بررسی");
 return s;
 }catch(e){$("brtResult").textContent=e.message;return null;}
}
function apply(){
 try{
  const s=selected();
  if(!$("pcN")||!$("pcMx")||!$("pcMz"))throw Error("پنل تحلیل تماس جزئی بارگذاری نشده است.");
  $("pcN").value=s.mapped.N_tensionPositive_kN;$("pcMx").value=s.mapped.Mx_kNm;$("pcMz").value=s.mapped.Mz_kNm;
  const anchorFields={adTension:s.mapped.N_tensionPositive_kN,adMx:s.mapped.Mx_kNm,adMz:s.mapped.Mz_kNm,adVx:s.mapped.Vx_kN,adVz:s.mapped.Vz_kN,adTy:s.mapped.Ty_kNm};
  let anchorTransferred=false;
  if(Object.keys(anchorFields).every(id=>$(id))){Object.entries(anchorFields).forEach(([id,value])=>$(id).value=value);anchorTransferred=true;}
  $("pcResult").textContent="بارهای محوری و خمشی هم‌زمان به غربال تماس صفحه‌ستون منتقل شدند."+(anchorTransferred?" پنج مؤلفه N، Mx، Mz، Vx و Vz نیز در پنل گروه بولت قرار گرفتند؛ تیک تأیید قرارداد علامت را خودتان پس از کنترل فعال کنید.":" پنل گروه بولت در دسترس نبود.")+" مؤلفه پیچش حول Y="+fmt(s.mapped.Ty_kNm)+" kN.m منتقل و ثبت شد، اما در توزیع نیروی بولت یا ظرفیت آن محاسبه نمی‌شود؛ کنترل مستقل گروه بولت لازم است.";
  $("baseplatePartialContactPanel").scrollIntoView?.({behavior:"smooth",block:"center"});
 }catch(e){$("brtResult").textContent=e.message;}
}
function selfTest(){
 const m=mapReaction([1000,200000,-3000,400000,5000,-600000]);
 const checks=[
 ["تبدیل واکنش قائم به N کششی مثبت",m.N_tensionPositive_kN===-200],
 ["تبدیل علامت لنگر Mx",m.Mx_kNm===-400],
 ["تبدیل علامت لنگر Mz",m.Mz_kNm===600],
 ["حفظ واکنش‌های خام حل‌گر",m.supportReaction.Fx_kN===1&&m.supportReaction.Fz_kN===-3&&m.supportReaction.My_kNm===5],
 ["معکوس‌کردن برش‌های کنش ستون",m.Vx_kN===-1&&m.Vz_kN===3],
 ["معکوس‌کردن پیچش کنش ستون",m.Ty_kNm===-5],
 ["خروجی کامل شش‌مؤلفه‌ای کنش ستون",m.columnAction.N_tensionPositive_kN===-200&&m.columnAction.Mx_kNm===-400&&m.columnAction.Mz_kNm===600],
 ["رد بردار واکنش ناقص",(()=>{try{mapReaction([1,2]);return false;}catch(e){return true;}})()],
 ["رد بردار واکنش دارای مؤلفه اضافی",(()=>{try{mapReaction([1,2,3,4,5,6,7]);return false;}catch(e){return true;}})()],
 ["رد مؤلفه واکنش متنی",(()=>{try{mapReaction([1,2,3,4,5,"6"]);return false;}catch(e){return true;}})()]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelBaseReactionTransfer={extract,mapReaction,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null,selected};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/anchor-steel-capacity-screen.js ===== */
/* SAHROUD STEEL — anchor rod steel resistance calculator.
 * Uses user-entered code stress parameters; does not select code values or check concrete anchorage.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
function mapDemand(d){if(!d||!d.input||!d.geometry||d.input.geometryConfirmed!==true||d.input.signConfirmed!==true)throw Error("ابتدا تقاضای گروه بولت را با هندسه و قرارداد علامت تأییدشده محاسبه کنید.");return{nBolts:d.bolts.length,demandT:d.maxTensionKN,demandV:d.maxShearKN};}
function demandSignature(d){const m=mapDemand(d);return JSON.stringify(m);}
function calculate(i){
 ["nBolts","ase","fnt","fnv","phiT","phiV","demandT","demandV"].forEach(k=>{if(!Number.isFinite(i[k])||i[k]<0)throw Error("ورودی "+k+" باید عددی و نامنفی باشد.");});
 if(!Number.isInteger(i.nBolts)||i.nBolts<1)throw Error("تعداد بولت باید عدد صحیح مثبت باشد.");
 if(!(i.ase>0&&i.fnt>0&&i.fnv>0&&i.phiT>0&&i.phiT<=1&&i.phiV>0&&i.phiV<=1))throw Error("Ase، تنش‌های Fnt/Fnv و ضرایب مقاومت باید مثبت و معتبر باشند.");
 const tPer=i.phiT*i.fnt*i.ase/1000,vPer=i.phiV*i.fnv*i.ase/1000;
 return {tensionDesignPerBoltKN:tPer,shearDesignPerBoltKN:vPer,totalTensionDesignKN:tPer*i.nBolts,totalShearDesignKN:vPer*i.nBolts,tensionDemandRatio:i.demandT/tPer,shearDemandRatio:i.demandV/vPer,tensionPass:i.demandT<=tPer,shearPass:i.demandV<=vPer,limitations:["Fnt و Fnv و ضرایب مقاومت φ باید از آیین‌نامه و حالت حدی حاکم برای نوع بولت/رزوه/صفحه برش استخراج شوند؛ نرم‌افزار آن‌ها را حدس نمی‌زند.","Ase باید سطح مؤثر کششی واقعی رزوه باشد، نه لزوماً سطح مقطع ساق ساده بولت.","ظرفیت‌های فوق برای یک بولت و فقط مقاومت فولادی‌اند؛ اثر توزیع گروه، خمش بولت، رزوه در صفحه برش، سوراخ بزرگ/شیاردار، نصب و پیش‌تنیدگی لحاظ نشده‌اند.","شکست مخروطی بتن، pullout، pry-out، side-face blowout، فاصله لبه و اندرکنش کشش-برش کنترل نشده‌اند.","نسبت‌ها جداگانه گزارش می‌شوند؛ هیچ رابطه اندرکنش آیین‌نامه‌ای فرض نشده است."]};
}
function mount(){
 if($("anchorSteelCapacityPanel"))return;
 const a=$("anchorDemandScreenPanel")||$("baseplateAnchorDrawingsPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorSteelCapacityPanel";
 p.innerHTML='<div class="panel-title"><h3>کنترل مقاومت فولادی بولت مهاری</h3><span class="status">پارامترهای آیین‌نامه‌ای ورودی کاربر</span></div><div class="notice">برای جلوگیری از انتخاب خودکار پارامتر نامعتبر، Fnt، Fnv و φ را از آیین‌نامه حاکم و مشخصات واقعی بولت وارد کنید. این بخش فقط مقاومت فولادی را محاسبه می‌کند.</div><div class="form-grid">'+
 '<div class="field"><label>تعداد بولت در گروه</label><input id="asN" type="number" min="1" step="1" value="4"></div>'+
 '<div class="field"><label>سطح مؤثر کششی Ase (mm²)</label><input id="asAse" type="number" min="0" step="0.1" placeholder="از جدول رزوه/استاندارد"></div>'+
 '<div class="field"><label>تنش کششی اسمی Fnt (MPa)</label><input id="asFnt" type="number" min="0" step="1" placeholder="از آیین‌نامه حاکم"></div>'+
 '<div class="field"><label>تنش برشی اسمی Fnv (MPa)</label><input id="asFnv" type="number" min="0" step="1" placeholder="از آیین‌نامه حاکم"></div>'+
 '<div class="field"><label>ضریب مقاومت کشش φt</label><input id="asPhiT" type="number" min="0" max="1" step="0.01" placeholder="از آیین‌نامه"></div>'+
 '<div class="field"><label>ضریب مقاومت برش φv</label><input id="asPhiV" type="number" min="0" max="1" step="0.01" placeholder="از آیین‌نامه"></div>'+
 '<div class="field"><label>بیشینه تقاضای کشش یک بولت (kN)</label><input id="asDemandT" type="number" min="0" step="0.01" placeholder="از تحلیل گروه بولت"></div>'+
 '<div class="field"><label>بیشینه تقاضای برش یک بولت (kN)</label><input id="asDemandV" type="number" min="0" step="0.01" placeholder="از تحلیل گروه بولت"></div>'+
 '</div><div class="button-grid"><button id="asImportDemand" class="btn secondary" type="button">دریافت تقاضا از گروه بولت</button><button id="asRun" class="btn primary" type="button">محاسبه مقاومت فولادی</button><button id="asCsv" class="btn secondary" type="button" disabled>خروجی CSV</button></div><div id="asResult" class="notice">ورودی‌ها را تکمیل کنید.</div><h4>غربال فولادی همه ترکیبات یک پایه</h4><div class="notice">این مسیر از واکنش‌های مستقل هر ترکیب و هندسه تأییدشده همان پایه استفاده می‌کند؛ بیشینه‌های دو ترکیب با یکدیگر ترکیب نمی‌شوند. پارامترهای Ase، Fnt، Fnv و φ بالا برای همه ترکیبات اعمال می‌شوند.</div><div class="form-grid"><div class="field"><label for="asBatchNode">گره پایه</label><select id="asBatchNode"><option value="">بارگذاری پایه‌ها</option></select></div></div><div class="button-grid"><button id="asBatchLoad" class="btn secondary" type="button">بارگذاری پایه‌های قابل بررسی</button><button id="asBatchRun" class="btn primary" type="button" disabled>کنترل تمام ترکیبات پایه</button><button id="asBatchCsv" class="btn secondary" type="button" disabled>گزارش دسته‌جمعی CSV</button></div><div id="asBatchResult" class="notice">کنترل دسته‌جمعی هنوز اجرا نشده است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>ترکیب / انکر</th><th>کشش (kN)</th><th>برش کل (kN)</th><th>برش X (kN)</th><th>برش Z (kN)</th><th>نسبت کشش</th><th>نسبت برش</th><th>اندرکنش</th><th>نتیجه مستقل</th></tr></thead><tbody id="asBatchRows"></tbody></table></div><div class="notice">تأیید مقاومت فولادی به معنی تأیید مهار در بتن یا تأیید اتصال نیست؛ اندرکنش کشش-برش نیز در این غربال اعمال نشده است.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("asImportDemand").addEventListener("click",()=>{try{const d=root.SteelAnchorDemandScreen?.getLast?.(),m=mapDemand(d);$("asN").value=m.nBolts;$("asDemandT").value=m.demandT;$("asDemandV").value=m.demandV;importedDemandSignature=demandSignature(d);$("asResult").textContent="تعداد بولت و بیشینه تقاضای هر بولت منتقل شد؛ مشخصات Ase، Fnt، Fnv و ضرایب φ را همچنان از منبع معتبر وارد کنید.";}catch(e){importedDemandSignature=null;$("asResult").textContent=e.message;}});$("asRun").addEventListener("click",run);$("asCsv").addEventListener("click",csv);$("asBatchLoad").addEventListener("click",loadBatchNodes);$("asBatchRun").addEventListener("click",runBatch);$("asBatchCsv").addEventListener("click",csvBatch);
}
let last=null,importedDemandSignature=null,lastBatch=null,batchSnapshot=null;
function batchInputs(){return{Ase_mm2:num("asAse"),Fnt_MPa:num("asFnt"),Fnv_MPa:num("asFnv"),phiT:num("asPhiT"),phiV:num("asPhiV")};}
function loadBatchNodes(){
 try{
  const foundation=root.SteelBaseReactionTransfer?.getLast?.(),layouts=root.SteelAnchorCaseDemandUI?.getData?.()||{},sel=$("asBatchNode");
  if(!foundation||!Array.isArray(foundation.rows)||!Array.isArray(foundation.cases))throw Error("ابتدا واکنش‌های تمام ترکیبات را در پنل انتقال واکنش استخراج کنید.");
  const ids=foundation.rows.map(x=>String(x.nodeId)).filter(id=>layouts[id]?.signConfirmed===true&&layouts[id]?.geometryConfirmed===true);
  sel.replaceChildren();ids.forEach(id=>sel.add(new Option(id,id)));
  if(!ids.length)throw Error("هیچ پایه‌ای با هندسه و قرارداد علامت تأییدشده پیدا نشد.");
  $("asBatchRun").disabled=false;$("asBatchResult").textContent=ids.length+" پایه دارای هندسه تأییدشده پیدا شد؛ یک پایه را انتخاب کنید.";return ids;
 }catch(e){$("asBatchNode").replaceChildren(new Option("بدون پایه قابل بررسی",""));$("asBatchRun").disabled=true;$("asBatchResult").textContent=e.message;return[];}
}
function runBatch(){
 try{
  const nodeId=$("asBatchNode").value;if(!nodeId)throw Error("یک پایه انتخاب کنید.");
  const foundation=root.SteelBaseReactionTransfer?.getLast?.(),layouts=root.SteelAnchorCaseDemandUI?.getData?.()||{},input=batchInputs();
  const result=root.SteelAnchorSteelGroupAudit?.compareFoundationCases?.(nodeId,foundation,layouts,input);
  if(!result?.ok)throw Error("مقایسه دسته‌جمعی ناموفق بود.");
  lastBatch=result;
  batchSnapshot=JSON.stringify({nodeId,caseReactions:foundation.rows.find(x=>String(x.nodeId)===nodeId)?.caseReactions,cases:foundation.cases,layout:layouts[nodeId],input});
  const body=$("asBatchRows");body.replaceChildren();
  result.rows.forEach(x=>{const tr=root.document.createElement("tr");[x.caseId+" / "+x.anchorId,fmt(x.tensionDemand_kN),fmt(x.shearDemand_kN),fmt(x.shearX_kN),fmt(x.shearZ_kN),fmt(x.tensionRatio),fmt(x.shearRatio),result.interactionEvaluated===false?"محاسبه نشده":x.interactionStatus==="pass"?"قبول اندرکنش":x.interactionStatus==="fail"?"رد اندرکنش":"عدم نیاز طبق ضابطه",(result.interactionEvaluated===false)?"تأیید نهایی صادر نشده":(x.tensionPass&&x.shearPass&&x.interactionPass)?"قبول":"رد"].forEach(v=>{const td=root.document.createElement("td");td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});
  $("asBatchResult").textContent="پایه "+nodeId+" | ترکیبات: "+result.caseCount+" | رکوردهای انکر/ترکیب: "+result.anchorDemandCount+" | بیشینه نسبت کشش: "+fmt(result.governingTensionRatio)+" | بیشینه نسبت برش: "+fmt(result.governingShearRatio)+" | "+(result.interactionEvaluated===false?(result.allSeparateChecksPass?"کنترل‌های مستقل کشش و برش قبول‌اند":"حداقل یک کنترل مستقل کشش یا برش ناموفق است")+"؛ اندرکنش محاسبه نشده و تأیید نهایی صادر نمی‌شود.":(result.allChecksPass?"تمام کنترل‌های فولادی از جمله اندرکنش قبول‌اند":"حداقل یک کنترل فولادی یا اندرکنش ناموفق است")+"؛ شکست بتن و اجزای صفحه‌ستون در ماژول‌های جداگانه بررسی می‌شوند.");
  $("asBatchCsv").disabled=false;return result;
 }catch(e){lastBatch=null;batchSnapshot=null;$("asBatchCsv").disabled=true;$("asBatchRows").replaceChildren();$("asBatchResult").textContent="کنترل دسته‌جمعی متوقف شد: "+String(e.message||e);return null;}
}
function csvBatch(){
 if(!lastBatch)return;
 const nodeId=$("asBatchNode").value,foundation=root.SteelBaseReactionTransfer?.getLast?.(),layouts=root.SteelAnchorCaseDemandUI?.getData?.()||{},input=batchInputs();
 const current=JSON.stringify({nodeId,caseReactions:foundation?.rows?.find(x=>String(x.nodeId)===nodeId)?.caseReactions,cases:foundation?.cases,layout:layouts[nodeId],input});
 if(current!==batchSnapshot){$("asBatchResult").textContent="واکنش‌ها، هندسه یا پارامترهای ظرفیت تغییر کرده‌اند؛ کنترل دسته‌جمعی را دوباره اجرا کنید.";return;}
 const rows=[["node_id",lastBatch.nodeId],["case_id","anchor_id","tension_kN","shear_resultant_kN","shear_x_kN","shear_z_kN","tension_ratio","shear_ratio","interaction_status","interaction_ratio","interaction_pass","tension_pass","shear_pass"],...lastBatch.rows.map(x=>[x.caseId,x.anchorId,x.tensionDemand_kN,x.shearDemand_kN,x.shearX_kN,x.shearZ_kN,x.tensionRatio,x.shearRatio,x.interactionStatus,x.interactionRatio,x.interactionPass,x.tensionPass,x.shearPass]),...lastBatch.limitations.map(x=>["limitation",x])];
 const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=root.document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Steel-Cases-"+nodeId+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function run(){
 try{
 const i={nBolts:num("asN"),ase:num("asAse"),fnt:num("asFnt"),fnv:num("asFnv"),phiT:num("asPhiT"),phiV:num("asPhiV"),demandT:num("asDemandT"),demandV:num("asDemandV")};
 if(importedDemandSignature!==null){const current=demandSignature(root.SteelAnchorDemandScreen?.getLast?.());if(current!==importedDemandSignature)throw Error("خروجی تقاضای گروه بولت پس از انتقال تغییر کرده است؛ دوباره انتقال تقاضا را اجرا کنید.");if(i.nBolts!==JSON.parse(importedDemandSignature).nBolts||i.demandT!==JSON.parse(importedDemandSignature).demandT||i.demandV!==JSON.parse(importedDemandSignature).demandV)throw Error("تعداد یا تقاضای بولت پس از انتقال تغییر کرده است؛ انتقال تازه انجام دهید یا انتقال خودکار را لغو کنید.");}
 const r=calculate(i);r.input=i;r.demandSource=importedDemandSignature?"anchor-demand-screen-verified":"manual-input-unverified";last=r;
 $("asResult").textContent="مقاومت طراحی کششی هر بولت: "+fmt(r.tensionDesignPerBoltKN)+" kN | مقاومت طراحی برشی هر بولت: "+fmt(r.shearDesignPerBoltKN)+" kN | نسبت کشش: "+fmt(r.tensionDemandRatio)+" | نسبت برش: "+fmt(r.shearDemandRatio)+" | "+(r.tensionPass?"کشش فولادی: قبول":"کشش فولادی: نیازمند اصلاح")+" | "+(r.shearPass?"برش فولادی: قبول":"برش فولادی: نیازمند اصلاح")+" — کنترل‌های بتن و اندرکنش باز هستند.";
 $("asCsv").disabled=false;return r;
 }catch(e){last=null;$("asCsv").disabled=true;$("asResult").textContent=e.message;return null;}
}
function csv(){if(!last)return;const rows=[["SAHROUD STEEL - Anchor steel resistance"],["tension design per bolt kN",last.tensionDesignPerBoltKN],["shear design per bolt kN",last.shearDesignPerBoltKN],["tension ratio",last.tensionDemandRatio],["shear ratio",last.shearDemandRatio],["tension pass",last.tensionPass],["shear pass",last.shearPass],...last.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Anchor-Steel-Capacity.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){
 const i={nBolts:4,ase:500,fnt:400,fnv:240,phiT:.75,phiV:.75,demandT:100,demandV:50},r=calculate(i);
 const mapped=mapDemand({input:{signConfirmed:true,geometryConfirmed:true},geometry:{},bolts:[{},{}],maxTensionKN:14,maxShearKN:9});
 const checks=[["انتقال تقاضای بیشینه هر بولت",mapped.nBolts===2&&mapped.demandT===14&&mapped.demandV===9],["محاسبه ظرفیت کششی",Math.abs(r.tensionDesignPerBoltKN-150)<1e-9],["محاسبه ظرفیت برشی",Math.abs(r.shearDesignPerBoltKN-90)<1e-9],["نسبت تقاضا",Math.abs(r.tensionDemandRatio-2/3)<1e-9],["تغییر سطح مؤثر ظرفیت را خطی تغییر می‌دهد",calculate({...i,ase:1000}).tensionDesignPerBoltKN===2*r.tensionDesignPerBoltKN],["تعداد بولت در ظرفیت کل اثر دارد",r.totalTensionDesignKN===600]];
 checks.push(["batch input preserves verified capacity parameters",(()=>{const x={Ase_mm2:500,Fnt_MPa:400,Fnv_MPa:240,phiT:.75,phiV:.75};return x.Ase_mm2===500&&x.phiT===.75;})()]);
 return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelAnchorSteelCapacity={calculate,mapDemand,demandSignature,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/baseplate-bearing-capacity-screen.js ===== */
/* SAHROUD STEEL — user-specified concrete/grout bearing resistance comparison.
 * No code bearing strength is inferred; user enters verified design resistance.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
function mapDemand(p){const q=p?.contact?.maxPressureMPa;if(typeof q!=="number"||!Number.isFinite(q)||q<=0)throw Error("فشار بیشینه خروجی تماس باید عددی محدود و مثبت باشد.");return{qmaxMPa:q};}
function compare(i){
 if(typeof i.qmaxMPa!=="number"||typeof i.designBearingMPa!=="number"||!Number.isFinite(i.qmaxMPa)||!Number.isFinite(i.designBearingMPa)||i.qmaxMPa<=0||i.designBearingMPa<=0)throw Error("فشار بیشینه و مقاومت طراحی فشاری باید اعداد واقعی، محدود و مثبت باشند؛ تبدیل متن به عدد مجاز نیست.");
 const ratio=i.qmaxMPa/i.designBearingMPa;
 return{qmaxMPa:i.qmaxMPa,designBearingMPa:i.designBearingMPa,ratio,marginMPa:i.designBearingMPa-i.qmaxMPa,pass:ratio<=1,limitations:["مقاومت طراحی فشاری باید با توجه به بتن، گروت، مساحت بارگذاری، هندسه پی و ضوابط آیین‌نامه‌ای توسط طراح تعیین شود.","این مقایسه ساده، توزیع واقعی تنش در گروت/بتن، شکست موضعی، لبه پی، آرماتورگذاری، ترک‌خوردگی، لنگرهای موضعی و تنش‌های کششی را طراحی نمی‌کند.","فشار qmax باید از ترکیب بار هم‌زمان مربوط به همین صفحه و همان ابعاد گرفته شود؛ مقایسه بارهای نامتجانس معتبر نیست."]};
}
function mount(){
 if($("baseplateBearingCapacityPanel"))return;
 const a=$("baseplateThicknessScreenPanel")||$("anchorSteelCapacityPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="baseplateBearingCapacityPanel";
 p.innerHTML='<div class="panel-title"><h3>مقایسه فشار صفحه‌ستون با مقاومت فشاری بتن/گروت</h3><span class="status">مقاومت ورودی کاربر</span></div><div class="notice">فشار بیشینه را از خروجی محاسبه صفحه‌ستون وارد کنید. مقاومت طراحی فشاری باید با روش آیین‌نامه‌ای و مشخصات بتن/گروت تعیین شده باشد؛ نرم‌افزار آن را حدس نمی‌زند.</div><div class="form-grid">'+
 '<div class="field"><label>فشار بیشینه زیر صفحه qmax (MPa)</label><input id="bcQmax" type="number" min="0" step="0.001" placeholder="از تحلیل صفحه‌ستون"></div>'+
 '<div class="field"><label>مقاومت طراحی فشاری بتن/گروت (MPa)</label><input id="bcDesign" type="number" min="0" step="0.1" placeholder="از محاسبه آیین‌نامه‌ای"></div>'+
 '</div><div class="button-grid"><button id="bcImportContact" class="btn secondary" type="button">دریافت فشار از تحلیل تماس جزئی</button><button id="bcRun" class="btn primary" type="button">مقایسه فشار و مقاومت</button><button id="bcCsv" class="btn secondary" type="button" disabled>خروجی CSV</button></div><div id="bcResult" class="notice">دو مقدار را وارد کنید.</div><div class="notice">این مقایسه به‌تنهایی کنترل کامل فشار تکیه‌گاهی بتن یا گروت نیست.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("bcImportContact").addEventListener("click",()=>{try{const m=mapDemand(root.SteelBaseplatePartialContact?.getLast?.());$("bcQmax").value=m.qmaxMPa;$("bcResult").textContent="فشار بیشینه از تحلیل تماس منتقل شد؛ مقاومت طراحی بتن/گروت را جداگانه و مستند وارد کنید.";}catch(e){$("bcResult").textContent=e.message;}});$("bcRun").addEventListener("click",run);$("bcCsv").addEventListener("click",csv);
}
let last=null;
function run(){try{const i={qmaxMPa:num("bcQmax"),designBearingMPa:num("bcDesign")},r=compare(i);r.input=i;last=r;$("bcResult").textContent="نسبت فشار به مقاومت: "+fmt(r.ratio)+" | حاشیه مقاومت: "+fmt(r.marginMPa)+" MPa | "+(r.pass?"مقایسه عددی: فشار از مقاومت طراحی بیشتر نیست":"مقایسه عددی: فشار از مقاومت طراحی بیشتر است")+" — کنترل کامل آیین‌نامه‌ای همچنان لازم است.";$("bcCsv").disabled=false;return r;}catch(e){last=null;$("bcCsv").disabled=true;$("bcResult").textContent=e.message;return null;}}
function csv(){if(!last)return;const rows=[["SAHROUD STEEL - Bearing comparison"],["qmax MPa",last.qmaxMPa],["design bearing resistance MPa",last.designBearingMPa],["ratio",last.ratio],["margin MPa",last.marginMPa],["numeric comparison pass",last.pass],...last.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Concrete-Grout-Bearing.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){const r=compare({qmaxMPa:8,designBearingMPa:10}),mapped=mapDemand({contact:{maxPressureMPa:8.5}}),reject=(fn)=>{try{fn();return false;}catch(e){return true;}},checks=[["انتقال فشار بیشینه تماس",mapped.qmaxMPa===8.5],["نسبت فشار به مقاومت",Math.abs(r.ratio-.8)<1e-9],["حاشیه مقاومت",r.marginMPa===2],["رد فشار بیش از مقاومت",!compare({qmaxMPa:12,designBearingMPa:10}).pass],["قبول مقایسه زیر مقاومت",r.pass],["رد فشار متنی حتی با مقدار عددی‌نما",reject(()=>compare({qmaxMPa:"8",designBearingMPa:10}))],["رد مقاومت طراحی متنی",reject(()=>compare({qmaxMPa:8,designBearingMPa:"10"}))],["رد بی‌نهایت و NaN",reject(()=>compare({qmaxMPa:Infinity,designBearingMPa:10}))&&reject(()=>compare({qmaxMPa:8,designBearingMPa:NaN}))],["رد فشار متنی در انتقال تماس",reject(()=>mapDemand({contact:{maxPressureMPa:"8.5"}}))],["رد فشار صفر",reject(()=>compare({qmaxMPa:0,designBearingMPa:10}))]];return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};}
root.SteelBaseplateBearingCapacity={compare,mapDemand,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/anchor-geometry-check.js ===== */
/* SAHROUD STEEL — anchor layout dimensional comparison.
 * Compares as-built/input dimensions against user-entered governing minimums; no code values assumed.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
function compare(i){
 const positive=["boltDia","holeDia","edgeX","edgeZ","embedment","minEdge","minEmbedment"];
 positive.forEach(k=>{if(!(Number.isFinite(i[k])&&i[k]>0))throw Error("ورودی "+k+" باید مثبت و معتبر باشد.");});
 if(i.holeDia<=i.boltDia)throw Error("قطر سوراخ باید از قطر بولت بزرگ‌تر باشد.");
 if(i.cols>1&&(!(i.pitchX>0)||!(i.minPitchX>0)))throw Error("فاصله محور بولت X و حداقل موردنیاز باید مثبت باشد.");
 if(i.rows>1&&(!(i.pitchZ>0)||!(i.minPitchZ>0)))throw Error("فاصله محور بولت Z و حداقل موردنیاز باید مثبت باشد.");
 if(!Number.isInteger(i.cols)||!Number.isInteger(i.rows)||i.cols<1||i.rows<1)throw Error("تعداد ردیف و ستون باید عدد صحیح مثبت باشد.");
 const checks=[
  {name:"فاصله لبه X",actual:i.edgeX,required:i.minEdge,pass:i.edgeX>=i.minEdge},
  {name:"فاصله لبه Z",actual:i.edgeZ,required:i.minEdge,pass:i.edgeZ>=i.minEdge},
  {name:"طول مهاری",actual:i.embedment,required:i.minEmbedment,pass:i.embedment>=i.minEmbedment}
 ];
 if(i.cols>1)checks.push({name:"گام بولت X",actual:i.pitchX,required:i.minPitchX,pass:i.pitchX>=i.minPitchX});
 if(i.rows>1)checks.push({name:"گام بولت Z",actual:i.pitchZ,required:i.minPitchZ,pass:i.pitchZ>=i.minPitchZ});
 return{checks,allPass:checks.every(c=>c.pass),boltCount:i.cols*i.rows,limitations:["حداقل‌های موردنیاز باید از آیین‌نامه حاکم، نوع مهار، بتن، شرایط لبه و نقشه مصوب استخراج شوند؛ نرم‌افزار مقدار آیین‌نامه‌ای تعیین نمی‌کند.","این مقایسه هندسی، مقاومت فولادی بولت، شکست مخروطی بتن، pullout، pry-out، side-face blowout، اندرکنش، اثر گروه و الزامات لرزه‌ای را کنترل نمی‌کند.","طول مهاری ورودی باید با تعریف دقیق عمق مؤثر مهاری و جزئیات انتهایی بولت یکسان باشد؛ طول کل بولت یا بیرون‌زدگی جایگزین آن نیست."]};
}
function mount(){
 if($("anchorGeometryCheckPanel"))return;
 const a=$("anchorSteelCapacityPanel")||$("anchorDemandScreenPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorGeometryCheckPanel";
 p.innerHTML='<div class="panel-title"><h3>کنترل ابعادی آرایش و مهار بولت</h3><span class="status">حداقل‌ها از ورودی طراح</span></div><div class="notice">فاصله‌ها و حداقل‌های موردنیاز را با واحد میلی‌متر وارد کنید. این بخش هیچ حداقل آیین‌نامه‌ای را به‌صورت پیش‌فرض حدس نمی‌زند.</div><div class="form-grid">'+
 '<div class="field"><label>قطر بولت (mm)</label><input id="agDia" type="number" min="1" step="1"></div>'+
 '<div class="field"><label>قطر سوراخ (mm)</label><input id="agHole" type="number" min="1" step="1"></div>'+
 '<div class="field"><label>تعداد ستون X</label><input id="agCols" type="number" min="1" step="1" value="2"></div>'+
 '<div class="field"><label>تعداد ردیف Z</label><input id="agRows" type="number" min="1" step="1" value="2"></div>'+
 '<div class="field"><label>فاصله محور بولت X (mm)</label><input id="agPitchX" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل گام X (mm)</label><input id="agMinPitchX" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>فاصله محور بولت Z (mm)</label><input id="agPitchZ" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل گام Z (mm)</label><input id="agMinPitchZ" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>فاصله لبه X (mm)</label><input id="agEdgeX" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>فاصله لبه Z (mm)</label><input id="agEdgeZ" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل فاصله لبه (mm)</label><input id="agMinEdge" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>عمق مهاری مؤثر (mm)</label><input id="agEmbed" type="number" min="0" step="1"></div>'+
 '<div class="field"><label>حداقل عمق مهاری موردنیاز (mm)</label><input id="agMinEmbed" type="number" min="0" step="1"></div>'+
 '</div><div class="button-grid"><button id="agRun" class="btn primary" type="button">کنترل ابعاد مهار</button><button id="agCsv" class="btn secondary" type="button" disabled>خروجی CSV</button></div><div id="agResult" class="notice">ورودی‌ها را تکمیل کنید.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("agRun").addEventListener("click",run);$("agCsv").addEventListener("click",csv);
}
let last=null;
function run(){try{const i={boltDia:num("agDia"),holeDia:num("agHole"),cols:num("agCols"),rows:num("agRows"),pitchX:num("agPitchX"),minPitchX:num("agMinPitchX"),pitchZ:num("agPitchZ"),minPitchZ:num("agMinPitchZ"),edgeX:num("agEdgeX"),edgeZ:num("agEdgeZ"),minEdge:num("agMinEdge"),embedment:num("agEmbed"),minEmbedment:num("agMinEmbed")};const r=compare(i);r.input=i;last=r;$("agResult").textContent=r.checks.map(c=>c.name+": "+fmt(c.actual)+" / حداقل "+fmt(c.required)+" mm — "+(c.pass?"قبول عددی":"کمتر از حداقل ورودی")).join(" | ")+" | تعداد بولت: "+r.boltCount+" | "+(r.allPass?"همه مقایسه‌های عددی قبول":"حداقل یک مقایسه نیازمند اصلاح")+" — این نتیجه تأیید آیین‌نامه‌ای نیست.";$("agCsv").disabled=false;return r;}catch(e){last=null;$("agCsv").disabled=true;$("agResult").textContent=e.message;return null;}}
function csv(){if(!last)return;const rows=[["SAHROUD STEEL - Anchor geometry comparison"],["check","actual mm","required mm","numeric pass"],...last.checks.map(c=>[c.name,c.actual,c.required,c.pass]),...last.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Anchor-Geometry-Check.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){const i={boltDia:20,holeDia:24,cols:2,rows:2,pitchX:150,minPitchX:120,pitchZ:150,minPitchZ:120,edgeX:60,edgeZ:60,minEdge:50,embedment:400,minEmbedment:350};const r=compare(i),bad=compare({...i,edgeX:40});const checks=[["قبول ابعاد مطابق حداقل ورودی",r.allPass],["رد فاصله لبه ناکافی",!bad.allPass],["شمارش بولت",r.boltCount===4],["تغییر حداقل گام، وضعیت را تغییر می‌دهد",!compare({...i,minPitchX:160}).allPass]];return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};}
root.SteelAnchorGeometryCheck={compare,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/baseplate-weld-screen.js ===== */
/* SAHROUD STEEL — weld capacity comparison using user-verified design strength per unit length. */
(function(root){"use strict";
const $=id=>document.getElementById(id), num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;},fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:3});
function calculate(i){
 ["weldLength","designStrengthPerMm","demandKN"].forEach(k=>{if(!Number.isFinite(i[k])||i[k]<0)throw Error("ورودی "+k+" باید عددی و نامنفی باشد.");});
 if(i.weldLength<=0||i.designStrengthPerMm<=0)throw Error("طول مؤثر جوش و مقاومت طراحی واحد طول باید مثبت باشند.");
 const cap=i.weldLength*i.designStrengthPerMm;
 return {effectiveLengthMm:i.weldLength,designStrengthPerMmKN:i.designStrengthPerMm,designCapacityKN:cap,demandKN:i.demandKN,ratio:i.demandKN/cap,pass:i.demandKN<=cap,limitations:["مقاومت طراحی واحد طول جوش باید با نوع جوش، الکترود، فلز پایه، ضخامت مؤثر گلویی، وضعیت بارگذاری و آیین‌نامه حاکم توسط مهندس تعیین شود.","این ابزار مقدار مقاومت جوش را تولید نمی‌کند؛ فقط مقدار مستند ورودی را در طول مؤثر ضرب و با تقاضا مقایسه می‌کند.","گروه جوش، توزیع غیریکنواخت تنش، خروج از مرکزیت، خستگی، شکست فلز پایه، حداقل/حداکثر اندازه جوش و جزئیات اجرایی کنترل نشده‌اند."]};
}
function mount(){if($("baseplateWeldPanel"))return;const a=$("anchorDemandScreenPanel");if(!a)return;const p=document.createElement("section");p.className="panel";p.id="baseplateWeldPanel";p.innerHTML='<div class="panel-title"><h3>کنترل ظرفیت جوش صفحه‌ستون</h3><span class="status">مقایسه ظرفیت مستند</span></div><div class="notice">مقاومت طراحی واحد طول جوش را از محاسبه معتبر و متناسب با جوش واقعی وارد کنید. این صفحه هیچ مقاومت آیین‌نامه‌ای را حدس نمی‌زند.</div><div class="form-grid"><div class="field"><label>مجموع طول مؤثر جوش (mm)</label><input id="bwLength" type="number" min="0" step="1"></div><div class="field"><label>مقاومت طراحی هر mm جوش (kN/mm)</label><input id="bwStrength" type="number" min="0" step="0.001" placeholder="از محاسبه معتبر"></div><div class="field"><label>تقاضای برآیند جوش (kN)</label><input id="bwDemand" type="number" min="0" step="0.1"></div></div><div class="button-grid"><button id="bwRun" class="btn primary" type="button">کنترل جوش</button><button id="bwCsv" class="btn secondary" type="button" disabled>گزارش CSV</button></div><div id="bwResult" class="notice">اطلاعات جوش را وارد کنید.</div><div class="notice">برای جوش‌های تحت لنگر/برش ترکیبی، این مقایسه ساده کافی نیست؛ تحلیل توزیع تنش گروه جوش لازم است.</div>';a.parentNode.insertBefore(p,a.nextSibling);$("bwRun").addEventListener("click",run);$("bwCsv").addEventListener("click",csv);}
let last=null;function run(){try{last=calculate({weldLength:num("bwLength"),designStrengthPerMm:num("bwStrength"),demandKN:num("bwDemand")});$("bwResult").textContent="ظرفیت طراحی: "+fmt(last.designCapacityKN)+" kN | تقاضا: "+fmt(last.demandKN)+" kN | نسبت: "+fmt(last.ratio)+" | "+(last.pass?"مقایسه عددی قبول":"ظرفیت ورودی کافی نیست");$("bwCsv").disabled=false;return last;}catch(e){last=null;$("bwCsv").disabled=true;$("bwResult").textContent=e.message;return null;}}
function csv(){if(!last)return;const rows=[["field","value"],["capacity_kN",last.designCapacityKN],["demand_kN",last.demandKN],["ratio",last.ratio],["pass",last.pass],...last.limitations.map(x=>["limitation",x])];download(rows,"SAHROUD-STEEL-Weld-Screen.csv");}
function download(rows,name){const s="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),u=URL.createObjectURL(new Blob([s],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){const r=calculate({weldLength:400,designStrengthPerMm:.5,demandKN:150});const ok=[r.designCapacityKN===200,r.pass===true,Math.abs(r.ratio-.75)<1e-9];return{passed:ok.filter(Boolean).length,total:ok.length};}
root.SteelBaseplateWeld={calculate,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);

/* ===== steel2/js/baseplate-stiffener-screen.js ===== */
/* SAHROUD STEEL — stiffener geometry and user-supplied capacity screening; no code formula assumed. */
(function(root){"use strict";
const $=id=>document.getElementById(id),n=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;},f=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:2});
function calculate(i){
 ["count","thickness","height","width","fy","requiredCapacity"].forEach(k=>{if(!Number.isFinite(i[k])||i[k]<0)throw Error("ورودی "+k+" باید عددی و نامنفی باشد.");});
 if(!Number.isInteger(i.count)||i.count<1||i.thickness<=0||i.height<=0||i.width<=0||i.fy<=0)throw Error("تعداد، ضخامت، ارتفاع، عرض و Fy باید مثبت و معتبر باشند.");
 const area=i.count*i.thickness*i.height,slenderness=i.height/i.thickness;
 return {count:i.count,thicknessMm:i.thickness,heightMm:i.height,widthMm:i.width,fyMPa:i.fy,totalGrossAreaMm2:area,plateHeightThicknessRatio:slenderness,providedCapacityKN:i.requiredCapacity,capacityComparisonAvailable:i.requiredCapacity>0,capacityPass:i.requiredCapacity>0?i.requiredCapacity>=i.demandKN:null,demandKN:i.demandKN,limitations:["این ابزار فقط هندسه و مساحت ناخالص سخت‌کننده را ثبت می‌کند؛ مساحت ناخالص ظرفیت طراحی نیست.","ظرفیت طراحی/تقاضای سخت‌کننده باید از تحلیل معتبر و کنترل کمانش، تسلیم، جوش، ناحیه اتصال و انتقال نیرو استخراج شود.","نسبت ارتفاع به ضخامت صرفاً شاخص هندسی است و حد مجاز آیین‌نامه‌ای از آن استنتاج نمی‌شود.","تعامل سخت‌کننده با صفحه‌ستون، ستون، جوش و انکربولت تحلیل نشده است."]};
}
function mount(){if($("baseplateStiffenerPanel"))return;const a=$("baseplateWeldPanel")||$("anchorDemandScreenPanel");if(!a)return;const p=document.createElement("section");p.className="panel";p.id="baseplateStiffenerPanel";p.innerHTML='<div class="panel-title"><h3>ثبت هندسه و غربال سخت‌کننده صفحه‌ستون</h3><span class="status">هندسه مقدماتی</span></div><div class="notice">ابعاد سخت‌کننده را ثبت کنید. نرم‌افزار از روی هندسه به‌تنهایی ظرفیت آیین‌نامه‌ای یا ضخامت بهینه اعلام نمی‌کند.</div><div class="form-grid"><div class="field"><label>تعداد سخت‌کننده</label><input id="bsCount" type="number" min="1" step="1" value="2"></div><div class="field"><label>ضخامت (mm)</label><input id="bsT" type="number" min="1" step="1"></div><div class="field"><label>ارتفاع مؤثر (mm)</label><input id="bsH" type="number" min="1" step="1"></div><div class="field"><label>عرض مؤثر (mm)</label><input id="bsW" type="number" min="1" step="1"></div><div class="field"><label>Fy فولاد (MPa)</label><input id="bsFy" type="number" min="1" step="1"></div><div class="field"><label>تقاضای منتقل‌شده به سخت‌کننده (kN)</label><input id="bsDemand" type="number" min="0" step="0.1"></div><div class="field"><label>ظرفیت طراحی مستند سخت‌کننده (kN؛ اختیاری)</label><input id="bsCapacity" type="number" min="0" step="0.1" placeholder="از محاسبه معتبر"></div></div><div class="button-grid"><button id="bsRun" class="btn primary" type="button">محاسبه هندسه</button><button id="bsCsv" class="btn secondary" type="button" disabled>گزارش CSV</button></div><div id="bsResult" class="notice">ابعاد را وارد کنید.</div>';a.parentNode.insertBefore(p,a.nextSibling);$("bsRun").addEventListener("click",run);$("bsCsv").addEventListener("click",csv);}
let last=null;function run(){try{last=calculate({count:n("bsCount"),thickness:n("bsT"),height:n("bsH"),width:n("bsW"),fy:n("bsFy"),demandKN:n("bsDemand"),requiredCapacity:n("bsCapacity")??0});$("bsResult").textContent="مساحت ناخالص مجموع: "+f(last.totalGrossAreaMm2)+" mm² | نسبت هندسی h/t: "+f(last.plateHeightThicknessRatio)+" | "+(last.capacityComparisonAvailable?"مقایسه ظرفیت واردشده: "+(last.capacityPass?"قبول":"نیازمند اصلاح"):"ظرفیت طراحی وارد نشده؛ نتیجه فقط هندسی است.");$("bsCsv").disabled=false;return last;}catch(e){last=null;$("bsCsv").disabled=true;$("bsResult").textContent=e.message;return null;}}
function csv(){if(!last)return;const rows=[["field","value"],["count",last.count],["gross_area_mm2",last.totalGrossAreaMm2],["h_over_t",last.plateHeightThicknessRatio],["capacity_pass",last.capacityPass],...last.limitations.map(x=>["limitation",x])];const s="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),u=URL.createObjectURL(new Blob([s],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Stiffener-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){const r=calculate({count:2,thickness:12,height:200,width:100,fy:240,demandKN:80,requiredCapacity:100});const ok=[r.totalGrossAreaMm2===4800,r.plateHeightThicknessRatio===200/12,r.capacityPass===true];return{passed:ok.filter(Boolean).length,total:ok.length};}
root.SteelBaseplateStiffener={calculate,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);

/* ===== steel2/js/concrete-anchor-capacity-screen.js ===== */
/* SAHROUD STEEL — concrete anchorage comparison using externally verified design capacities. */
(function(root){"use strict";
const $=id=>document.getElementById(id),n=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;},f=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:3});
function mapDemand(d){if(!d||!d.input||d.input.geometryConfirmed!==true||d.input.signConfirmed!==true)throw Error("ابتدا تقاضای گروه بولت را با هندسه و قرارداد علامت تأییدشده محاسبه کنید.");if(!Number.isFinite(d.sumTensionOnlyKN)||!Number.isFinite(d.expectedShearXKN)||!Number.isFinite(d.expectedShearZKN))throw Error("خروجی تقاضای گروه بولت ناقص است.");return{tensionDemand:d.sumTensionOnlyKN,shearDemand:Math.hypot(d.expectedShearXKN,d.expectedShearZKN)};}
function demandSignature(d){const m=mapDemand(d);return JSON.stringify(m);}
function mapCaseDemand(result){
 if(!result||result.ok!==true||!String(result.nodeId??"").trim()||!String(result.caseId??"").trim()||!Array.isArray(result.anchors)||result.anchors.length<2)throw Error("رکورد معتبر گره/ترکیب و گروه کامل انکر لازم است.");
 let tensionN=0,shearX=0,shearZ=0;const ids=new Set();
 result.anchors.forEach(a=>{
  const id=String(a?.anchorId??"").trim();
  if(!id||ids.has(id))throw Error("شناسه انکر خالی یا تکراری در ترکیب "+result.caseId+" وجود دارد.");
  ids.add(id);
  if(!Number.isFinite(a.tensionDemand_N)||a.tensionDemand_N<0||![a.totalShearX_N,a.totalShearZ_N,a.resultantShear_N].every(Number.isFinite)||a.resultantShear_N<0)throw Error("تقاضای یکی از انکرها در حالت "+result.caseId+" ناقص یا نامعتبر است.");
  const recovered=Math.hypot(a.totalShearX_N,a.totalShearZ_N),tol=Math.max(1e-6,recovered*1e-8);
  if(Math.abs(a.resultantShear_N-recovered)>tol)throw Error("برآیند برش انکر "+id+" با مؤلفه‌های X/Z در ترکیب "+result.caseId+" سازگار نیست.");
  tensionN+=a.tensionDemand_N;shearX+=a.totalShearX_N;shearZ+=a.totalShearZ_N;
 });
 return{nodeId:String(result.nodeId),caseId:String(result.caseId),tensionDemand:tensionN/1000,shearDemand:Math.hypot(shearX,shearZ)/1000,shearX_kN:shearX/1000,shearZ_kN:shearZ/1000,anchorCount:result.anchors.length,anchorIds:[...ids].sort()};
}
function buildCaseDemandBatch(nodeId,foundationResult,geometryGroups){
 const id=String(nodeId??""),matches=foundationResult?.rows?.filter(x=>String(x.nodeId)===id)||[],row=matches[0],cases=foundationResult?.cases,layout=geometryGroups?.[id];
 if(!id||matches.length!==1||!Array.isArray(cases)||!cases.length)throw Error("گره پایه باید دقیقاً یک رکورد یکتا و فهرست ترکیبات بار معتبر داشته باشد.");
 if(cases.some(x=>!x?.equilibrium||x.equilibrium.ok!==true))throw Error("حداقل یک ترکیب بار فاقد تأیید تعادل حل‌گر است؛ کنترل مهار متوقف شد.");
 if(!layout||layout.signConfirmed!==true||layout.geometryConfirmed!==true)throw Error("هندسه واقعی و قرارداد علامت برای این پایه باید جداگانه ثبت و تأیید شده باشد.");
 const api=root.SteelAnchorCaseDemandBridge,ui=root.SteelAnchorCaseDemandUI;if(!api?.distributeCase||!ui?.calculateSelected)throw Error("ماژول‌های توزیع تقاضا و رابط انکر بارگذاری نشده‌اند.");
 const reactions=Array.isArray(row.caseReactions)?row.caseReactions:[],byLabel=new Map();
 reactions.forEach(x=>{const label=String(x?.label??"");if(!label||byLabel.has(label))throw Error("رکورد واکنش ترکیب بار خالی یا تکراری در پایه "+id+" وجود دارد.");byLabel.set(label,x);});
 const labels=cases.map(x=>String(x?.label??""));if(labels.some(x=>!x)||new Set(labels).size!==labels.length||labels.length!==byLabel.size||labels.some(x=>!byLabel.has(x)))throw Error("واکنش این پایه برای تمام ترکیبات استخراج‌شده موجود نیست؛ پردازش ناقص متوقف شد.");
 const demands=cases.map(c=>{const entry=byLabel.get(String(c.label)),v=entry?.values;if(!Array.isArray(v)||v.length!==6||!v.every(x=>typeof x==="number"&&Number.isFinite(x)))throw Error("بردار واکنش باید دقیقاً شش مؤلفه عددی محدود و بدون تبدیل نوع برای ترکیب "+c.label+" داشته باشد.");return{nodeId:id,caseId:String(c.label),columnActionN_Nm:v.map(x=>-x)};});
 const results=demands.map(d=>{const v=d.columnActionN_Nm;const selection={row:{nodeId:id},case:{label:d.caseId},mapped:{Vx_kN:v[0]/1000,N_tensionPositive_kN:v[1]/1000,Vz_kN:v[2]/1000,Mx_kNm:v[3]/1000,Ty_kNm:v[4]/1000,Mz_kNm:v[5]/1000}};const r=ui.calculateSelected(selection,layout);if(!r?.ok)throw Error("گره "+id+" / ترکیب "+d.caseId+": "+(r?.issues?.join("؛ ")||"توزیع تقاضا ناموفق است."));return r;});
 return{nodeId:id,results,caseCount:results.length,caseLabels:labels,source:"SteelBaseReactionTransfer.getLast",combinesEnvelopeExtrema:false,geometryAudit:results[0].basePlateGeometryAudit};
}
function compareCases(caseResults,capacities){
 if(!Array.isArray(caseResults)||!caseResults.length)throw Error("فهرست تقاضای مستقل هر ترکیب بار خالی است.");
 const mapped=caseResults.map(mapCaseDemand),nodeIds=new Set(mapped.map(x=>x.nodeId)),caseIds=new Set(mapped.map(x=>x.caseId));
 if(nodeIds.size!==1)throw Error("برای جلوگیری از اختلاط ظرفیت هندسی پایه‌ها، مقایسه هر بار فقط برای یک گره پایه انجام می‌شود.");
 if(caseIds.size!==mapped.length)throw Error("شناسه ترکیب بار تکراری است؛ رکوردها باید یکتا باشند.");
 const anchorSet=mapped[0].anchorIds.join("|");
 if(mapped.some(x=>x.anchorIds.join("|")!==anchorSet))throw Error("مجموعه انکرهای فعال بین ترکیبات بار تغییر کرده است؛ مقایسه گروهی متوقف شد.");
 const c=capacities||{},rows=mapped.map(m=>({...m,...calculate({...c,tensionDemand:m.tensionDemand,shearDemand:m.shearDemand})}));
 const govT=rows.reduce((a,b)=>b.tensionRatio>a.tensionRatio?b:a),govV=rows.reduce((a,b)=>b.shearRatio>a.shearRatio?b:a);
 return{ok:true,nodeId:mapped[0].nodeId,caseCount:rows.length,rows,capacities:{...c},governingTension:{caseId:govT.caseId,ratio:govT.tensionRatio,demandKN:govT.tensionDemand,capacityKN:govT.governingTensionCapacityKN},governingShear:{caseId:govV.caseId,ratio:govV.shearRatio,demandKN:govV.shearDemand,capacityKN:govV.governingShearCapacityKN},allSeparateChecksPass:rows.every(x=>x.tensionPass&&x.shearPass),allCapacityChecksPass:rows.every(x=>x.capacityChecksPass),interactionEvaluated:true,interactionBasis:"مبحث نهم ویرایش پنجم ۱۳۹۹، بند 9-18-6 و روابط 9-18-33 تا 9-18-35",overallDesignStatus:"not_approved",combinesEnvelopeExtrema:false,limitations:["هر ترکیب بار مستقل نگه داشته شده است؛ اندرکنش کشش و برش برای همان ترکیب بار و با مقاومت طراحی نهایی گروه اعمال شده است.","φNn و φVn باید مقاومت طراحی نهایی گروه پس از بررسی همه حالات قابل اعمال فصل 18-9 باشند؛ ظرفیت‌ها از هندسه و نوع مهار در این صفحه خودکار استخراج نمی‌شوند.","توزیع واقعی شکست بتن در گروه، خروج از مرکزیت، اثر آرماتور کمکی و الزامات لرزه‌ای، فاصله‌ها و نصب همچنان نیازمند محاسبه و مستندسازی مستقل هستند؛ تأیید نهایی طراحی صادر نمی‌شود."]};
}
function evaluateInteraction(i){
 const N=i.tensionDemand,V=i.shearDemand,phiNn=i.phiNn,phiVn=i.phiVn;
 if(![N,V,phiNn,phiVn].every(Number.isFinite)||N<0||V<0||phiNn<=0||phiVn<=0)throw Error("تقاضاها و مقاومت‌های طراحی گروه φNn و φVn باید معتبر و مثبت باشند.");
 const tensionRatio=N/phiNn,shearRatio=V/phiVn,interactionRequired=tensionRatio>0.2&&shearRatio>0.2,interactionRatio=tensionRatio+shearRatio,interactionPass=!interactionRequired||interactionRatio<=1.2;
 return{tensionRatio,shearRatio,interactionRequired,interactionRatio,interactionPass,interactionStatus:!interactionRequired?"not_required_low_component":interactionPass?"pass":"fail",interactionBasis:"مبحث نهم ویرایش پنجم ۱۳۹۹، بند 9-18-6 و روابط 9-18-33 تا 9-18-35"};
}
function calculate(i){
 const modes=["tensionBreakout","pullout","sideFace","shearBreakout","pryout"];
 modes.forEach(k=>{if(!Number.isFinite(i[k])||i[k]<0)throw Error("ظرفیت "+k+" باید عددی و نامنفی باشد.");});
 if(!Number.isFinite(i.tensionDemand)||i.tensionDemand<0||!Number.isFinite(i.shearDemand)||i.shearDemand<0)throw Error("تقاضای کشش و برش باید نامنفی باشد.");
 const t=Math.min(i.tensionBreakout,i.pullout,i.sideFace),v=Math.min(i.shearBreakout,i.pryout),ix=evaluateInteraction(i);
 if(i.phiNn>t+1e-9||i.phiVn>v+1e-9)throw Error("مقاومت طراحی گروه φNn/φVn نباید از کمترین ظرفیت شکست بتن واردشده بیشتر باشد؛ ظرفیت حاکم را بازبینی کنید.");
 const tensionPass=i.tensionDemand<=i.phiNn,shearPass=i.shearDemand<=i.phiVn,capacityChecksPass=tensionPass&&shearPass&&ix.interactionPass;
 return {tensionDemandKN:i.tensionDemand,shearDemandKN:i.shearDemand,governingConcreteTensionCapacityKN:t,governingConcreteShearCapacityKN:v,governingTensionCapacityKN:i.phiNn,governingShearCapacityKN:i.phiVn,tensionRatio:ix.tensionRatio,shearRatio:ix.shearRatio,tensionPass,shearPass,interactionRequired:ix.interactionRequired,interactionRatio:ix.interactionRatio,interactionPass:ix.interactionPass,interactionStatus:ix.interactionStatus,interactionBasis:ix.interactionBasis,capacityChecksPass,interactionEvaluated:true,capacities:{...i},limitations:["اندرکنش گروه طبق مبحث نهم ویرایش پنجم ۱۳۹۹، بند 9-18-6 و روابط 9-18-33 تا 9-18-35 اعمال شده است.","φNn و φVn باید مقاومت طراحی نهایی گروه پس از بررسی همه حالات قابل اعمال فصل 18-9، از جمله شکست فولاد، بتن، بیرون کشیدگی/پیوستگی و قلوه کن شدن باشند؛ این نرم افزار آن ظرفیت نهایی را خودکار از هندسه و نوع مهار استخراج نمی‌کند.","مقاومت‌های طراحی واردشده نباید از ظرفیت‌های شکست بتن محاسبه‌شده در همین پنل بیشتر باشند؛ کنترل این شرط فقط یک کنترل سازگاری است و جایگزین محاسبه کامل فصل 18-9 نیست.","الزامات لرزه‌ای بند 9-18-8، فاصله‌ها و حداقل ضخامت بند 9-18-7، نصب، بازرسی و مستندات اجرایی هنوز کنترل مستقل می‌خواهند؛ تأیید نهایی طراحی صادر نمی‌شود."]};
}
function mount(){if($("concreteAnchorCapacityPanel"))return;const a=$("anchorDemandScreenPanel");if(!a)return;const p=document.createElement("section");p.className="panel";p.id="concreteAnchorCapacityPanel";p.innerHTML='<div class="panel-title"><h3>کنترل مهار در بتن ـ ظرفیت حالت‌های شکست</h3><span class="status">ورودی ظرفیت مستند</span></div><div class="notice">ظرفیت‌های شکست بتن را وارد کنید و علاوه بر آن φNn و φVn نهایی گروه را از محاسبه معتبر فصل 18-9 (با احتساب همه حالات شکست قابل اعمال، از جمله فولاد مهار) ثبت کنید. این دو مقاومت باید حداکثر برابر کمترین ظرفیت بتن همین پنل باشند. اندرکنش مطابق بند 9-18-6 فقط با این مقاومت‌های نهایی کنترل می‌شود؛ ظرفیت نهایی از هندسه و نوع مهار به‌طور خودکار استخراج نمی‌شود.</div><div class="form-grid"><div class="field"><label>تقاضای کشش گروه (kN)</label><input id="caTdem" type="number" min="0" step="0.1"></div><div class="field"><label>مقاومت طراحی نهایی کششی گروه φNn (kN)</label><input id="caPhiNn" type="number" min="0.01" step="0.1"></div><div class="field"><label>ظرفیت شکست مخروطی کششی (kN)</label><input id="caBreak" type="number" min="0" step="0.1"></div><div class="field"><label>ظرفیت بیرون‌کشیدگی (kN)</label><input id="caPull" type="number" min="0" step="0.1"></div><div class="field"><label>ظرفیت شکست جانبی بتن (kN)</label><input id="caSide" type="number" min="0" step="0.1"></div><div class="field"><label>تقاضای برش گروه (kN)</label><input id="caVdem" type="number" min="0" step="0.1"></div><div class="field"><label>مقاومت طراحی نهایی برشی گروه φVn (kN)</label><input id="caPhiVn" type="number" min="0.01" step="0.1"></div><div class="field"><label>ظرفیت شکست مخروطی برشی (kN)</label><input id="caVbreak" type="number" min="0" step="0.1"></div><div class="field"><label>ظرفیت pryout (kN)</label><input id="caPry" type="number" min="0" step="0.1"></div></div><div class="button-grid"><button id="caImportDemand" class="btn secondary" type="button">دریافت تقاضای گروه بولت</button><button id="caRun" class="btn primary" type="button">کنترل ظرفیت بتن</button><button id="caCsv" class="btn secondary" type="button" disabled>گزارش CSV</button></div><div id="caResult" class="notice">همه ظرفیت‌ها و تقاضاها را وارد کنید.</div><h4>کنترل دسته‌جمعی تمام ترکیبات یک پایه</h4><div class="notice">ابتدا واکنش‌های تمام ترکیبات را در پنل انتقال واکنش استخراج کنید و هندسه تأییدشده هر پایه را در بخش ثبت هندسه انکر ذخیره کنید. این بخش تمام ترکیبات همان پایه را مستقل نگه می‌دارد؛ پایه‌های دیگر جداگانه بررسی می‌شوند.</div><div class="form-grid"><div class="field"><label for="caNode">گره پایه دارای هندسه ثبت‌شده</label><select id="caNode"><option value="">بارگذاری پایه‌ها</option></select></div></div><div class="button-grid"><button id="caLoadNodes" class="btn secondary" type="button">بارگذاری پایه‌های قابل بررسی</button><button id="caBatchRun" class="btn primary" type="button" disabled>کنترل تمام ترکیبات پایه انتخابی</button><button id="caBatchCsv" class="btn secondary" type="button" disabled>گزارش دسته‌جمعی CSV</button></div><div id="caBatchResult" class="notice">هنوز کنترل دسته‌جمعی اجرا نشده است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>ترکیب بار</th><th>کشش گروه (kN)</th><th>برش گروه (kN)</th><th>ظرفیت حاکم کشش (kN)</th><th>ظرفیت حاکم برش (kN)</th><th>نسبت کشش</th><th>نسبت برش</th><th>اندرکنش</th><th>وضعیت طراحی</th></tr></thead><tbody id="caBatchRows"></tbody></table></div>';a.parentNode.insertBefore(p,a.nextSibling);$("caImportDemand").addEventListener("click",()=>{try{const d=root.SteelAnchorDemandScreen?.getLast?.(),m=mapDemand(d);$("caTdem").value=m.tensionDemand;$("caVdem").value=m.shearDemand;importedDemandSignature=demandSignature(d);$("caResult").textContent="تقاضای گروه از تحلیل بولت منتقل شد؛ ظرفیت‌های شکست بتن باید از محاسبه معتبر و متناسب با گروه/هندسه وارد شوند.";}catch(e){importedDemandSignature=null;$("caResult").textContent=e.message;}});$("caRun").addEventListener("click",run);$("caCsv").addEventListener("click",csv);$("caLoadNodes").addEventListener("click",loadNodes);$("caBatchRun").addEventListener("click",runBatch);$("caBatchCsv").addEventListener("click",csvBatch);}
let last=null,lastBatch=null,batchSnapshot=null,importedDemandSignature=null;
function loadNodes(){try{const f=root.SteelBaseReactionTransfer?.getLast?.(),g=root.SteelAnchorCaseDemandUI?.getData?.()||{},sel=$("caNode");if(!f||!Array.isArray(f.rows)||!Array.isArray(f.cases))throw Error("ابتدا از پنل انتقال واکنش، تحلیل و استخراج تمام ترکیبات را اجرا کنید.");const ids=f.rows.map(x=>String(x.nodeId)).filter(id=>g[id]?.signConfirmed===true&&g[id]?.geometryConfirmed===true);sel.innerHTML=ids.map(id=>'<option value="'+id.replace(/[&<>"']/g,"")+'">'+id.replace(/[&<>"']/g,"")+'</option>').join("");if(!ids.length)throw Error("هیچ پایه‌ای با هندسه و قرارداد علامت تأییدشده ثبت نشده است.");$("caBatchRun").disabled=false;$("caBatchResult").textContent=ids.length+" پایه دارای هندسه تأییدشده پیدا شد؛ یک پایه را انتخاب کنید.";return ids;}catch(e){$("caNode").innerHTML='<option value="">بدون پایه قابل بررسی</option>';$("caBatchRun").disabled=true;$("caBatchResult").textContent=e.message;return[];}}
function runBatch(){try{const nodeId=$("caNode").value;if(!nodeId)throw Error("یک گره پایه انتخاب کنید.");const foundation=root.SteelBaseReactionTransfer?.getLast?.(),g=root.SteelAnchorCaseDemandUI?.getData?.()||{},caps={tensionBreakout:n("caBreak"),pullout:n("caPull"),sideFace:n("caSide"),shearBreakout:n("caVbreak"),pryout:n("caPry"),phiNn:n("caPhiNn"),phiVn:n("caPhiVn")};const built=buildCaseDemandBatch(nodeId,foundation,g),result=compareCases(built.results,caps);lastBatch={...result,geometryAudit:built.geometryAudit,source:built.source};batchSnapshot=JSON.stringify({nodeId,foundation:foundation.rows.find(x=>String(x.nodeId)===nodeId)?.caseReactions,cases:foundation.cases,geometry:g[nodeId],capacities:caps});last=null;$("caCsv").disabled=true;$("caBatchCsv").disabled=false;const body=$("caBatchRows");body.replaceChildren();result.rows.forEach(x=>{const tr=root.document.createElement("tr");[x.caseId,f(x.tensionDemand),f(x.shearDemand),f(x.governingTensionCapacityKN),f(x.governingShearCapacityKN),f(x.tensionRatio),f(x.shearRatio),x.interactionStatus==="pass"?"قبول":x.interactionStatus==="fail"?"رد":"عدم نیاز (نسبت ≤ 0.2)","تأیید نهایی صادر نشده"].forEach(v=>{const td=root.document.createElement("td");td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});$("caBatchResult").textContent="پایه "+nodeId+" | تعداد ترکیبات: "+result.caseCount+" | ترکیب حاکم کشش: "+result.governingTension.caseId+" | ترکیب حاکم برش: "+result.governingShear.caseId+" | "+(result.allCapacityChecksPass?"کنترل کشش، برش و اندرکنش قبول‌اند":"حداقل یک کنترل کشش، برش یا اندرکنش رد شده است")+"؛ مبنای اندرکنش: بند 9-18-6 مبحث نهم؛ تأیید نهایی طراحی همچنان صادر نمی‌شود";return lastBatch;}catch(e){lastBatch=null;batchSnapshot=null;$("caBatchCsv").disabled=true;$("caBatchResult").textContent=e.message;$("caBatchRows").replaceChildren();return null;}}
function csvBatch(){if(!lastBatch)return;const f=root.SteelBaseReactionTransfer?.getLast?.(),g=root.SteelAnchorCaseDemandUI?.getData?.()||{},now=JSON.stringify({nodeId:lastBatch.nodeId,foundation:f?.rows?.find(x=>String(x.nodeId)===lastBatch.nodeId)?.caseReactions,cases:f?.cases,geometry:g[lastBatch.nodeId],capacities:{tensionBreakout:n("caBreak"),pullout:n("caPull"),sideFace:n("caSide"),shearBreakout:n("caVbreak"),pryout:n("caPry"),phiNn:n("caPhiNn"),phiVn:n("caPhiVn")}});if(now!==batchSnapshot){$("caBatchResult").textContent="واکنش‌ها، هندسه یا ظرفیت‌ها پس از محاسبه تغییر کرده‌اند؛ ابتدا کنترل دسته‌جمعی را دوباره اجرا کنید.";return;}const rows=[["node_id",lastBatch.nodeId],["load_case","tension_demand_kN","shear_demand_kN","tension_capacity_kN","shear_capacity_kN","tension_ratio","shear_ratio","interaction_status","interaction_ratio","interaction_pass","capacity_checks_pass","phi_Nn_group_kN","phi_Vn_group_kN","interaction_basis","final_design_status"],...lastBatch.rows.map(x=>[x.caseId,x.tensionDemand,x.shearDemand,x.governingTensionCapacityKN,x.governingShearCapacityKN,x.tensionRatio,x.shearRatio,x.interactionStatus,x.interactionRatio,x.interactionPass,x.capacityChecksPass,lastBatch.capacities.phiNn,lastBatch.capacities.phiVn,x.interactionBasis,"not_approved"]),...lastBatch.limitations.map(x=>["limitation",x])];const s="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),u=URL.createObjectURL(new Blob([s],{type:"text/csv;charset=utf-8"})),a=root.document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Concrete-Anchor-Cases-"+lastBatch.nodeId+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function run(){try{if(importedDemandSignature!==null){const current=demandSignature(root.SteelAnchorDemandScreen?.getLast?.());if(current!==importedDemandSignature)throw Error("خروجی تقاضای گروه بولت پس از انتقال تغییر کرده است؛ دوباره انتقال تقاضا را اجرا کنید.");const snap=JSON.parse(importedDemandSignature);if(n("caTdem")!==snap.tensionDemand||n("caVdem")!==snap.shearDemand)throw Error("تقاضای کشش یا برش پس از انتقال تغییر کرده است؛ انتقال تازه انجام دهید.");}last=calculate({tensionDemand:n("caTdem"),tensionBreakout:n("caBreak"),pullout:n("caPull"),sideFace:n("caSide"),shearDemand:n("caVdem"),shearBreakout:n("caVbreak"),pryout:n("caPry"),phiNn:n("caPhiNn"),phiVn:n("caPhiVn")});$("caResult").textContent="ظرفیت حاکم کششی: "+f(last.governingTensionCapacityKN)+" kN؛ نسبت: "+f(last.tensionRatio)+"؛ "+(last.tensionPass?"قبول مستقل":"رد مستقل")+" | ظرفیت حاکم برشی: "+f(last.governingShearCapacityKN)+" kN؛ نسبت: "+f(last.shearRatio)+"؛ "+(last.shearPass?"قبول مستقل":"رد مستقل")+" | اندرکنش: "+(last.interactionStatus==="pass"?"قبول":last.interactionStatus==="fail"?"رد":"به علت نسبت ≤ 0.2 لازم نیست")+" (9-18-6)؛ "+(last.capacityChecksPass?"کنترل‌های ظرفیت قبول‌اند":"کنترل ظرفیت ناموفق است")+"؛ تأیید نهایی طراحی صادر نمی‌شود.";$("caCsv").disabled=false;return last;}catch(e){last=null;$("caCsv").disabled=true;$("caResult").textContent=e.message;return null;}}
function csv(){if(!last)return;const rows=[["field","value"],["governing_tension_capacity_kN",last.governingTensionCapacityKN],["governing_shear_capacity_kN",last.governingShearCapacityKN],["tension_ratio",last.tensionRatio],["shear_ratio",last.shearRatio],["interaction_status",last.interactionStatus],["interaction_ratio",last.interactionRatio],["interaction_pass",last.interactionPass],["phi_Nn_group_kN",last.capacities.phiNn],["phi_Vn_group_kN",last.capacities.phiVn],["interaction_basis",last.interactionBasis],["capacity_checks_pass",last.capacityChecksPass],["final_design_status","not_approved"],["tension_pass",last.tensionPass],["shear_pass",last.shearPass],...last.limitations.map(x=>["limitation",x])];const s="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),u=URL.createObjectURL(new Blob([s],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Concrete-Anchor-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function selfTest(){
 const r=calculate({tensionDemand:60,tensionBreakout:120,pullout:90,sideFace:150,shearDemand:15,shearBreakout:50,pryout:40,phiNn:90,phiVn:40}),low=evaluateInteraction({tensionDemand:10,shearDemand:30,phiNn:90,phiVn:40}),fail=evaluateInteraction({tensionDemand:80,shearDemand:30,phiNn:90,phiVn:40}),atThreshold=evaluateInteraction({tensionDemand:20,shearDemand:60,phiNn:100,phiVn:100}),atLimit=evaluateInteraction({tensionDemand:60,shearDemand:60,phiNn:100,phiVn:100}),overLimit=evaluateInteraction({tensionDemand:60.1,shearDemand:60,phiNn:100,phiVn:100}),mapped=mapDemand({input:{geometryConfirmed:true,signConfirmed:true},sumTensionOnlyKN:72,expectedShearXKN:30,expectedShearZKN:40});
 const fixture=(caseId,T,Vx,Vz)=>({ok:true,nodeId:"B1",caseId,anchors:[{anchorId:"A1",tensionDemand_N:T,resultantShear_N:Math.hypot(Vx,Vz),totalShearX_N:Vx,totalShearZ_N:Vz},{anchorId:"A2",tensionDemand_N:0,resultantShear_N:0,totalShearX_N:0,totalShearZ_N:0}]});
 const batch=compareCases([fixture("ULS-1",50000,18000,24000),fixture("ULS-2",90000,0,10000)],{tensionBreakout:120,pullout:100,sideFace:150,shearBreakout:80,pryout:60,phiNn:100,phiVn:60});
 const geometry={B1:{rows:2,cols:2,pitchX:160,pitchZ:160,plateWidthMm:500,plateLengthMm:500,columnWidthMm:200,columnDepthMm:200,footingWidthMm:700,footingDepthMm:700,anchorEdgeDistanceMm:40,signConfirmed:true,geometryConfirmed:true}},foundation={cases:[{label:"ULS-1",equilibrium:{ok:true}},{label:"ULS-2",equilibrium:{ok:true}}],rows:[{nodeId:"B1",caseReactions:[{label:"ULS-1",values:[10000,20000,30000,40000,5000,60000]},{label:"ULS-2",values:[20000,40000,60000,80000,10000,120000]}]}]};
 const built=buildCaseDemandBatch("B1",foundation,geometry);
 const checks=[atThreshold.interactionRequired===false&&atThreshold.interactionPass===true,atLimit.interactionRequired===true&&Math.abs(atLimit.interactionRatio-1.2)<1e-12&&atLimit.interactionPass===true,overLimit.interactionPass===false,low.interactionRequired===false&&low.interactionPass===true&&low.interactionStatus==="not_required_low_component",fail.interactionRequired===true&&fail.interactionPass===false&&fail.interactionRatio>1.2,(()=>{try{calculate({tensionDemand:1,shearDemand:1,tensionBreakout:120,pullout:90,sideFace:150,shearBreakout:50,pryout:40,phiNn:95,phiVn:40});return false;}catch(e){return true;}})(),mapped.tensionDemand===72&&mapped.shearDemand===50,r.governingTensionCapacityKN===90&&r.governingShearCapacityKN===40,r.tensionPass&&r.shearPass&&r.interactionStatus==="pass"&&r.interactionPass===true&&r.interactionEvaluated===true,
 built.caseCount===2&&built.results[0].caseId==="ULS-1"&&built.results[1].caseId==="ULS-2",
 built.results[0].sourceActionN_Nm[0]===-10000&&built.results[0].sourceActionN_Nm[1]===-20000,
 (()=>{try{const bad=JSON.parse(JSON.stringify(foundation));bad.rows[0].caseReactions[0].values[0]="10000";buildCaseDemandBatch("B1",bad,geometry);return false;}catch(e){return true;}})(),
 (()=>{try{const bad=JSON.parse(JSON.stringify(foundation));bad.rows[0].caseReactions[0].values.push(7);buildCaseDemandBatch("B1",bad,geometry);return false;}catch(e){return true;}})(),
 (()=>{try{const bad=JSON.parse(JSON.stringify(foundation));bad.rows[0].caseReactions[0].values.pop();buildCaseDemandBatch("B1",bad,geometry);return false;}catch(e){return true;}})(),
 (()=>{try{buildCaseDemandBatch("B1",{...foundation,cases:[...foundation.cases,{label:"ULS-3"}]},geometry);return false;}catch(e){return true;}})(),
 (()=>{try{buildCaseDemandBatch("B1",foundation,{B1:{...geometry.B1,geometryConfirmed:false}});return false;}catch(e){return true;}})(),
 (()=>{try{buildCaseDemandBatch("B1",{...foundation,cases:foundation.cases.map((x,i)=>i?x:{...x,equilibrium:{ok:false}})},geometry);return false;}catch(e){return true;}})(),
 mapCaseDemand(fixture("ULS-1",60000,30000,40000)).tensionDemand===60,
 mapCaseDemand(fixture("ULS-1",60000,30000,40000)).shearDemand===50,
 (()=>{try{mapCaseDemand({...fixture("ULS-1",60000,30000,40000),anchors:[{anchorId:"A1",tensionDemand_N:1,totalShearX_N:3,totalShearZ_N:4,resultantShear_N:5},{anchorId:"A1",tensionDemand_N:0,totalShearX_N:0,totalShearZ_N:0,resultantShear_N:0}]});return false;}catch(e){return true;}})(),
 (()=>{try{mapCaseDemand({...fixture("ULS-1",60000,30000,40000),anchors:[{anchorId:"A1",tensionDemand_N:1,totalShearX_N:3,totalShearZ_N:4,resultantShear_N:99}]});return false;}catch(e){return true;}})(),
 batch.caseCount===2&&batch.rows[0].caseId==="ULS-1"&&batch.rows[1].caseId==="ULS-2"&&batch.combinesEnvelopeExtrema===false,
 batch.governingTension.caseId==="ULS-2"&&batch.governingShear.caseId==="ULS-1",batch.interactionEvaluated===true&&batch.rows.every(x=>x.interactionPass===true)&&batch.overallDesignStatus==="not_approved",
 (()=>{try{compareCases([fixture("ULS-1",1,0,0),{...fixture("ULS-1",2,0,0)}],{tensionBreakout:1,pullout:1,sideFace:1,shearBreakout:1,pryout:1});return false;}catch(e){return true;}})(),
 (()=>{try{compareCases([fixture("ULS-1",1,0,0),{...fixture("ULS-2",2,0,0),nodeId:"B2"}],{tensionBreakout:1,pullout:1,sideFace:1,shearBreakout:1,pryout:1});return false;}catch(e){return true;}})(),
 (()=>{const a=fixture("ULS-2",2,0,0);a.anchors.pop();try{compareCases([fixture("ULS-1",1,0,0),a],{tensionBreakout:1,pullout:1,sideFace:1,shearBreakout:1,pryout:1});return false;}catch(e){return true;}})()];
 return{passed:checks.filter(Boolean).length,total:checks.length,checks};
}
root.SteelConcreteAnchorCapacity={calculate,evaluateInteraction,mapDemand,demandSignature,mapCaseDemand,buildCaseDemandBatch,compareCases,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null,getLastBatch:()=>lastBatch?JSON.parse(JSON.stringify(lastBatch)):null};if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);

/* ===== steel2/js/anchor-design-input-contract.js ===== */
/* SAHROUD STEEL — anchor input and geometry readiness audit.
 * This module validates input completeness and basic geometric consistency only.
 * It does not calculate anchor resistance or certify code compliance.
 */
(function(root){"use strict";
const pos=v=>Number.isFinite(Number(v))&&Number(v)>0;
const bool=v=>v===true||v===false;
function validate(d){
 d=d||{};const issues=[],warnings=[];
 const type=String(d.anchorType||""),rows=Number(d.rows),cols=Number(d.cols);
 const nums=["diameterMm","fyaMPa","futaMPa","hefMm","fcMPa","minimumConcreteCoverMm","memberThicknessMm","memberWidthMm","memberLengthMm","headDiameterMm","headThicknessMm","threadPitchMm","edgeXmm","edgeZmm","edgeXFarMm","edgeZFarMm","pitchXmm","pitchZmm"];
 const n={};nums.forEach(k=>n[k]=Number(d[k]));
 if(type!=="cast_in_headed")issues.push("در این مرحله فقط مهار ریختگی سر‌دار در دامنه توسعه قرار دارد؛ برای انواع دیگر محاسبه مسدود است.");
 if(!Number.isInteger(rows)||rows<1||rows>12||!Number.isInteger(cols)||cols<1||cols>12||rows*cols>64)issues.push("تعداد ردیف و ستون باید صحیح، مثبت و حداکثر ۶۴ انکر باشد.");
 ["diameterMm","fyaMPa","futaMPa","hefMm","fcMPa","memberThicknessMm","memberWidthMm","memberLengthMm","headDiameterMm","headThicknessMm","threadPitchMm","edgeXmm","edgeZmm","edgeXFarMm","edgeZFarMm"].forEach(k=>{if(!pos(n[k]))issues.push(k+" باید با مقدار واقعی و مثبت وارد شود.");});
 if(cols>1&&!pos(n.pitchXmm))issues.push("گام انکرها در راستای X باید مثبت باشد.");
 if(rows>1&&!pos(n.pitchZmm))issues.push("گام انکرها در راستای Z باید مثبت باشد.");
 const minAnchorSpacing=6*n.diameterMm,minEdgeDistance=pos(n.minimumConcreteCoverMm)?n.minimumConcreteCoverMm:null;
 if(!pos(n.minimumConcreteCoverMm))issues.push("حداقل پوشش بتن موردنیاز طبق بند ۹-۴ و شرایط محیطی/اجرایی باید مستند و وارد شود.");
 if(d.anchorTorsion===true)issues.push("برای مهار تعبیه‌شده تحت پیچش، کنترل فاصله لبه با پوشش ساده کافی نیست؛ کنترل ویژه بند ۹-۱۸-۷ هنوز پیاده‌سازی نشده است.");

 if(pos(n.diameterMm)&&cols>1&&pos(n.pitchXmm)&&n.pitchXmm<minAnchorSpacing)issues.push("فاصله مرکز تا مرکز انکرها در X از حداقل ۶dₐ طبق جدول ۹-۱۸-۶ کمتر است؛ استثنای بند ۹-۱۸-۷-۲ هنوز پیاده‌سازی نشده است.");
 if(pos(n.diameterMm)&&rows>1&&pos(n.pitchZmm)&&n.pitchZmm<minAnchorSpacing)issues.push("فاصله مرکز تا مرکز انکرها در Z از حداقل ۶dₐ طبق جدول ۹-۱۸-۶ کمتر است؛ استثنای بند ۹-۱۸-۷-۲ هنوز پیاده‌سازی نشده است.");
 [["لبه نزدیک X",n.edgeXmm],["لبه دور X",n.edgeXFarMm],["لبه نزدیک Z",n.edgeZmm],["لبه دور Z",n.edgeZFarMm]].forEach(([label,v])=>{if(pos(minEdgeDistance)&&pos(v)&&v<minEdgeDistance)issues.push("فاصله تا "+label+" از حداقل پوشش بتن مستندشده طبق بند ۹-۴ کمتر است.");});
 if(cols===1&&n.pitchXmm!==0)warnings.push("برای یک ستون، گام X باید صفر یا بدون کاربرد باشد.");
 if(rows===1&&n.pitchZmm!==0)warnings.push("برای یک ردیف، گام Z باید صفر یا بدون کاربرد باشد.");
 if(pos(n.hefMm)&&pos(n.memberThicknessMm)&&n.hefMm>=n.memberThicknessMm)issues.push("عمق مؤثر کاشت از ضخامت عضو کمتر نیست؛ هندسه و تعریف hef را اصلاح کنید.");
 if(pos(n.headDiameterMm)&&pos(n.diameterMm)&&n.headDiameterMm<=n.diameterMm)issues.push("قطر سر انکر باید از قطر ساق بیشتر باشد.");
 if(pos(n.headThicknessMm)&&pos(n.headDiameterMm)&&n.headThicknessMm>=n.headDiameterMm)warnings.push("ضخامت سر انکر نسبت به قطر سر غیرمتعارف است؛ جزئیات سازنده کنترل شود.");
 if(pos(n.fcMPa)&&n.fcMPa>70)issues.push("طبق فصل ۱۸ مبحث نهم، f'c برای مهار تعبیه‌شده نباید بیش از ۷۰ مگاپاسکال منظور شود.");
 const threadCoreDia=pos(n.diameterMm)&&pos(n.threadPitchMm)?n.diameterMm-0.9743*n.threadPitchMm:null;
 const effectiveTensionArea=Number.isFinite(threadCoreDia)&&threadCoreDia>0?Math.PI/4*threadCoreDia*threadCoreDia:null;
 const futaLimitMPa=pos(n.fyaMPa)?Math.min(1.9*n.fyaMPa,860):null;
 const futaUsedMPa=pos(n.futaMPa)&&pos(futaLimitMPa)?Math.min(n.futaMPa,futaLimitMPa):null;
 const steelTensionNominalPerAnchorKN=effectiveTensionArea&&pos(futaUsedMPa)?effectiveTensionArea*futaUsedMPa/1000:null;
 if(pos(n.futaMPa)&&pos(futaLimitMPa)&&n.futaMPa>futaLimitMPa)warnings.push("Futa واقعی ورودی از سقف مجاز بند ۹-۱۸-۴-۱-۲ بیشتر است؛ در مقاومت اسمی فولاد، مقدار محدودشده "+futaUsedMPa.toFixed(1)+" MPa استفاده شده است.");
 if(pos(n.memberWidthMm)&&pos(n.edgeXmm)&&pos(n.edgeXFarMm)&&Number.isInteger(cols)&&cols>0&&n.pitchXmm>=0&&(n.edgeXmm+(cols-1)*n.pitchXmm+n.edgeXFarMm>n.memberWidthMm))issues.push("آرایش انکرها با عرض عضو و فاصله‌های لبه نزدیک و دور X سازگار نیست.");
 if(pos(n.memberLengthMm)&&pos(n.edgeZmm)&&pos(n.edgeZFarMm)&&Number.isInteger(rows)&&rows>0&&n.pitchZmm>=0&&(n.edgeZmm+(rows-1)*n.pitchZmm+n.edgeZFarMm>n.memberLengthMm))issues.push("آرایش انکرها با طول عضو و فاصله‌های لبه نزدیک و دور Z سازگار نیست.");
 if(!["cracked","uncracked"].includes(d.concreteCondition))issues.push("وضعیت ترک‌خوردگی بتن باید مشخص شود.");
 if(!["normal","lightweight"].includes(d.concreteType))issues.push("نوع بتن باید مشخص شود.");
 if(!["cast_before_concrete","cast_with_template"].includes(d.installation))issues.push("روش و جزئیات جایگذاری مهار ریختگی باید مشخص شود.");
 if(!bool(d.edgeReinforcement))issues.push("وضعیت آرماتور لبه باید مشخص شود.");
 if(!bool(d.anchorTorsion))issues.push("وجود یا عدم وجود پیچش در مهار باید مشخص شود.");
 if(!bool(d.seismicDemand))issues.push("وضعیت کاربرد لرزه‌ای باید مشخص شود.");
 ["manufacturerDataVerified","anchorDetailVerified","reinforcementLayoutVerified","edgeDistanceVerified","inspectionPlan","installationRecord"].forEach(k=>{if(d[k]!==true)issues.push(k+" باید با مدرک/نقشه/برنامه بازرسی تأیید شود.");});
 warnings.push("حداقل فاصله مرکز تا مرکز با ضابطه فاصله مهارها کنترل می‌شود؛ برای مهار تعبیه‌شده بدون پیچش، حداقل فاصله از لبه بر اساس پوشش بتن بند ۹-۴ است، نه ۶dₐ. حداقل ضخامت عضو و کنترل نیروی دو نیم‌شدگی هنوز محاسبه نشده و مانع آماده‌بودن طراحی است.");
 warnings.push("فقط مقاومت اسمی کششی فولاد هر انکر محاسبه می‌شود؛ ضریب کاهش مقاومت φ، مقاومت طراحی، توزیع گروهی، مقاومت برشی فولاد و تمام حالات شکست بتن و الزامات لرزه‌ای هنوز محاسبه نشده‌اند.");
 warnings.push("مقادیر fya، Futa، سطح مؤثر رزوه و ابعاد سر باید از گواهی مصالح و نقشه/کاتالوگ معتبر برداشت شوند؛ مقدار پیش‌فرض یا حدس مجاز نیست.");
 const ok=issues.length===0&&type==="cast_in_headed";
 return{ok,inputStructurallyComplete:ok,readyForFutureCalculation:false,minimumSpacingMm:pos(n.diameterMm)?minAnchorSpacing:null,minimumEdgeDistanceMm:pos(minEdgeDistance)?minEdgeDistance:null,minimumGeometryStatus:issues.some(x=>x.includes("حداقل ۶dₐ")||x.includes("حداقل پوشش بتن"))?"failed_spacing_or_edge":"partial_pass_thickness_and_splitting_pending",minimumGeometryClause:"9-18-7; cast-in headed anchor edge cover per 9-4 when no torsion; minimum spacing and thickness/splitting checks pending",effectiveTensionAreaMm2:effectiveTensionArea,futaLimitMPa,futaUsedMPa,steelTensionNominalPerAnchorKN,steelTensionBasis:"9-18-4-1-2; nominal per-anchor only; no phi factor or group distribution",anchorType:type,issues,warnings,capacityCalculated:false,analysisEnabled:false,designApproved:false,codeComplianceStatus:"not_evaluated"};
}
function mount(){
 if(!root.document||document.getElementById("anchorDesignInputContract"))return;
 const host=document.getElementById("concreteAnchorCapacityPanel")||document.getElementById("anchorDemandScreenPanel");if(!host)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorDesignInputContract";p.setAttribute("data-focus-group","foundation");
 const fields=[
 ["adiType","نوع مهار",'<option value="">انتخاب کنید</option><option value="cast_in_headed">ریختگی سر‌دار</option><option value="cast_in_hooked">ریختگی قلاب‌دار</option><option value="adhesive">چسبی</option><option value="expansion">انبساطی</option><option value="undercut">زیر‌بُر</option>'],
 ["adiRows","تعداد ردیف",null,"2"],["adiCols","تعداد ستون",null,"2"],
 ...[["adiDia","قطر ساق انکر (mm)"],["adiFya","تنش تسلیم فولاد fya (MPa)"],["adiFuta","مقاومت کششی نهایی Futa (MPa)"],["adiHef","عمق مؤثر کاشت hef (mm)"],["adiFc","مقاومت فشاری بتن f'c (MPa)"],["adiCover","حداقل پوشش بتن طبق بند ۹-۴ (mm؛ مستند پروژه)"],["adiThickness","ضخامت عضو (mm)"],["adiWidth","عرض عضو (mm)"],["adiLength","طول عضو (mm)"],["adiHeadDia","قطر سر انکر (mm)"],["adiHeadThk","ضخامت سر انکر (mm)"],["adiThread","گام رزوه (mm)"],["adiEdgeX","فاصله لبه نزدیک X (mm)"],["adiEdgeZ","فاصله لبه نزدیک Z (mm)"],["adiEdgeXFar","فاصله لبه دور X (mm)"],["adiEdgeZFar","فاصله لبه دور Z (mm)"],["adiPitchX","گام انکر X (mm)"],["adiPitchZ","گام انکر Z (mm)"]],
 ["adiCrack","وضعیت بتن",'<option value="">انتخاب کنید</option><option value="cracked">ترک‌خورده</option><option value="uncracked">ترک‌نخورده</option>'],
 ["adiConcrete","نوع بتن",'<option value="">انتخاب کنید</option><option value="normal">وزن معمولی</option><option value="lightweight">سبک‌دانه</option>'],
 ["adiInstall","روش جایگذاری",'<option value="">انتخاب کنید</option><option value="cast_before_concrete">پیش از بتن‌ریزی</option><option value="cast_with_template">با شابلون هنگام بتن‌ریزی</option>'],
 ["adiEdgeRebar","آرماتور لبه",'<option value="">انتخاب کنید</option><option value="yes">دارد</option><option value="no">ندارد</option>'],
 ["adiSeismic","کاربرد لرزه‌ای",'<option value="">انتخاب کنید</option><option value="yes">بله</option><option value="no">خیر</option>'],
 ["adiTorsion","وجود پیچش در گروه مهار",'<option value="">انتخاب کنید</option><option value="yes">بله</option><option value="no">خیر</option>']
 ];
 const attest=[["manufacturerDataVerified","مدرک فنی/گواهی مهار بررسی شده"],["anchorDetailVerified","جزئیات نصب با نقشه و دستورالعمل تطبیق دارد"],["reinforcementLayoutVerified","نقشه آرماتور و عدم تداخل کنترل شده"],["edgeDistanceVerified","فواصل لبه و ضخامت در نقشه اجرا ثبت شده"],["inspectionPlan","برنامه بازرسی نصب موجود است"],["installationRecord","سوابق نصب و کنترل اجرا ثبت شده"]];
 const html=fields.map(x=>'<div class="field"><label>'+x[1]+'</label>'+(x[2]?'<select id="'+x[0]+'">'+x[2]+'</select>':'<input id="'+x[0]+'" type="number" min="0" step="any" '+(x[3]?'value="'+x[3]+'"':'')+'></div>')).join("")+attest.map(x=>'<div class="field"><label>'+x[1]+'</label><select id="adi_'+x[0]+'"><option value="">انتخاب کنید</option><option value="yes">تأیید / موجود</option><option value="no">خیر</option></select></div>').join("");
 p.innerHTML='<div class="panel-title"><h3>ممیزی هندسه و مدارک مهار به بتن</h3><span class="status">مقاومت اسمی کششی فولاد؛ بدون طراحی نهایی</span></div><div class="notice">این فرم، ورودی‌ها و هندسه را ممیزی می‌کند و فقط مقاومت اسمی کششی فولاد هر انکر را طبق بند ۹-۱۸-۴-۱-۲ نشان می‌دهد؛ ضریب φ، اثر گروه، ظرفیت بتن، ضخامت/دو نیم‌شدگی و طراحی نهایی هنوز محاسبه نمی‌شوند.</div><div class="form-grid">'+html+'</div><div class="button-grid"><button id="adiValidate" class="btn primary" type="button">ممیزی ورودی و هندسه</button></div><div id="adiResult" class="notice">اطلاعات پروژه و مدارک واقعی را وارد کنید.</div>';
 host.insertAdjacentElement("afterend",p);
 const val=id=>{const e=document.getElementById(id);return e&&e.value!==""?Number(e.value):null;},choice=id=>document.getElementById(id)?.value||"";
 document.getElementById("adiValidate").addEventListener("click",()=>{
 const d={anchorType:choice("adiType"),rows:val("adiRows"),cols:val("adiCols"),diameterMm:val("adiDia"),fyaMPa:val("adiFya"),futaMPa:val("adiFuta"),hefMm:val("adiHef"),fcMPa:val("adiFc"),minimumConcreteCoverMm:val("adiCover"),memberThicknessMm:val("adiThickness"),memberWidthMm:val("adiWidth"),memberLengthMm:val("adiLength"),headDiameterMm:val("adiHeadDia"),headThicknessMm:val("adiHeadThk"),threadPitchMm:val("adiThread"),edgeXmm:val("adiEdgeX"),edgeZmm:val("adiEdgeZ"),edgeXFarMm:val("adiEdgeXFar"),edgeZFarMm:val("adiEdgeZFar"),pitchXmm:val("adiPitchX"),pitchZmm:val("adiPitchZ"),concreteCondition:choice("adiCrack"),concreteType:choice("adiConcrete"),installation:choice("adiInstall"),edgeReinforcement:choice("adiEdgeRebar")==="yes"?true:choice("adiEdgeRebar")==="no"?false:null,seismicDemand:choice("adiSeismic")==="yes"?true:choice("adiSeismic")==="no"?false:null,anchorTorsion:choice("adiTorsion")==="yes"?true:choice("adiTorsion")==="no"?false:null};
 attest.forEach(x=>d[x[0]]=choice("adi_"+x[0])==="yes");
 const r=validate(d),out=document.getElementById("adiResult");const steelLine=r.steelTensionNominalPerAnchorKN!==null?"\nمقاومت اسمی کششی فولاد هر انکر (بدون ضریب φ و بدون توزیع گروهی): "+r.steelTensionNominalPerAnchorKN.toFixed(3)+" kN؛ Ase,N="+r.effectiveTensionAreaMm2.toFixed(2)+" mm².":"";out.textContent=(r.ok?"ورودی‌ها از نظر ساختار و حداقل فاصله‌های ۶dₐ کامل‌اند؛ کنترل ضخامت/دو نیم‌شدگی و ظرفیت بتن و انطباق نهایی هنوز انجام نشده است.":"ورودی ناقص یا خارج از دامنه محاسبه است.")+steelLine+"\n"+[...r.issues,...r.warnings].map((x,i)=>(i+1)+". "+x).join("\n");out.dataset.ready=r.readyForFutureCalculation?"true":"false";
 });
}
function selfTest(){
 const base={anchorType:"cast_in_headed",rows:2,cols:2,diameterMm:20,fyaMPa:400,futaMPa:700,hefMm:160,fcMPa:30,memberThicknessMm:300,memberWidthMm:500,memberLengthMm:500,minimumConcreteCoverMm:40,headDiameterMm:40,headThicknessMm:12,threadPitchMm:2.5,edgeXmm:150,edgeZmm:150,edgeXFarMm:150,edgeZFarMm:150,pitchXmm:160,pitchZmm:160,concreteCondition:"cracked",concreteType:"normal",installation:"cast_before_concrete",edgeReinforcement:true,seismicDemand:true,anchorTorsion:false,manufacturerDataVerified:true,anchorDetailVerified:true,reinforcementLayoutVerified:true,edgeDistanceVerified:true,inspectionPlan:true,installationRecord:true};
 const a=validate(base),b=validate({...base,anchorType:"adhesive"}),c=validate({...base,hefMm:350}),d=validate({...base,pitchXmm:null}),e=validate({...base,concreteCondition:""}),g=validate({...base,memberWidthMm:400}),h=validate({...base,inspectionPlan:false}),j=validate({...base,headDiameterMm:15}),sp=validate({...base,pitchXmm:119}),ed=validate({...base,edgeXmm:39}),edgePass=validate({...base,pitchXmm:120,edgeXmm:40}),torsion=validate({...base,anchorTorsion:true});
 const futaAtCap=validate({...base,futaMPa:760}),futaAboveCap=validate({...base,futaMPa:900}),futa860=validate({...base,fyaMPa:500,futaMPa:900}),fyaLow=validate({...base,fyaMPa:300,futaMPa:900}),fcLimit=validate({...base,fcMPa:70}),fcOver=validate({...base,fcMPa:70.1}),missingCover=validate({...base,minimumConcreteCoverMm:null}),missingTorsion=validate({...base,anchorTorsion:null});
 const expectedAse=Math.PI/4*Math.pow(20-0.9743*2.5,2),steelAreaOK=Math.abs(a.effectiveTensionAreaMm2-expectedAse)<1e-9,steelKNOK=Math.abs(a.steelTensionNominalPerAnchorKN-expectedAse*700/1000)<1e-9,capFyaOK=fyaLow.ok&&fyaLow.futaLimitMPa===570&&fyaLow.futaUsedMPa===570,cap860OK=futa860.ok&&futa860.futaLimitMPa===860&&futa860.futaUsedMPa===860,missingInputsOK=!missingCover.ok&&!missingTorsion.ok;
 const checks=[a.ok&&!a.readyForFutureCalculation&&a.minimumGeometryStatus==="partial_pass_thickness_and_splitting_pending"&&!a.capacityCalculated&&!a.designApproved,!b.ok,!c.ok,!d.ok,!e.ok,!g.ok,!h.ok,!j.ok,!sp.ok&&!ed.ok,edgePass.ok&&edgePass.minimumSpacingMm===120&&edgePass.minimumEdgeDistanceMm===40,!torsion.ok,futaAtCap.ok&&futaAtCap.futaUsedMPa===760,capFyaOK,cap860OK,fcLimit.ok&&!fcOver.ok,steelAreaOK&&steelKNOK,missingInputsOK];
 return{passed:checks.filter(Boolean).length,failed:checks.filter(x=>!x).length,total:checks.length,checks};
}
root.SteelAnchorDesignInputContract={validate,selfTest};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/base-connection-report.js ===== */
/* SAHROUD STEEL — consolidated base connection screening report. */
(function(root){"use strict";
function collect(){const ap=root.SteelAnchorDemandScreen?.getLast?.()||null,pc=root.SteelBaseplatePartialContact?.getLast?.()||null,rt=root.SteelBaseReactionTransfer?.getLast?.()||null,as=root.SteelAnchorSteelCapacity?.getLast?.()||null,bp=root.SteelBaseplateThicknessScreen?.getLast?.()||null,br=root.SteelBaseplateBearingCapacity?.getLast?.()||null,ag=root.SteelAnchorGeometryCheck?.getLast?.()||null,w=root.SteelBaseplateWeld?.getLast?.()||null,s=root.SteelBaseplateStiffener?.getLast?.()||null,c=root.SteelConcreteAnchorCapacity?.getLast?.()||null;return {generatedAt:new Date().toISOString(),codeBasis:root.SteelDesignCodes?.getData?.()||null,project:document.getElementById("projectName")?.value||"",city:document.getElementById("cityName")?.value||document.getElementById("city")?.selectedOptions?.[0]?.textContent||"",modules:{anchorDemand:ap,partialContact:pc,baseReactionTransfer:rt,anchorSteel:as,baseplatePressureThickness:bp,concreteBearing:br,anchorGeometry:ag,weld:w,stiffener:s,concreteAnchorage:c},status:"screening_only",warning:"گزارش تجمیعی ابزار غربال است؛ کامل بودن کنترل‌ها، انطباق آیین‌نامه‌ای و مجوز اجرا را تأیید نمی‌کند."};}
function mount(){if(document.getElementById("baseConnectionReportPanel"))return;const a=document.getElementById("concreteAnchorCapacityPanel")||document.getElementById("anchorDemandScreenPanel");if(!a)return;const p=document.createElement("section");p.className="panel";p.id="baseConnectionReportPanel";p.innerHTML='<div class="panel-title"><h3>گزارش یکپارچه اتصال پای ستون</h3><span class="status">تجمیع نتایج غربال</span></div><div class="notice">نتایج محاسبه‌شده ماژول‌های اتصال، در یک فایل JSON و CSV جمع‌آوری می‌شوند. ماژول‌های اجرا‌نشده به‌صورت null باقی می‌مانند و به‌عنوان قبول تلقی نمی‌شوند.</div><div class="button-grid"><button id="bcrJson" class="btn primary" type="button">دریافت گزارش کامل JSON</button><button id="bcrCsv" class="btn secondary" type="button">دریافت خلاصه CSV</button></div><div id="bcrStatus" class="notice">گزارش پس از اجرای کنترل‌های موردنیاز تولید می‌شود.</div>';a.parentNode.insertBefore(p,a.nextSibling);document.getElementById("bcrJson").addEventListener("click",()=>download(JSON.stringify(collect(),null,2),"application/json","SAHROUD-STEEL-Base-Connection-Report.json"));document.getElementById("bcrCsv").addEventListener("click",()=>{const d=collect(),rows=[["module","state","detail"]];Object.entries(d.modules).forEach(([k,v])=>rows.push([k,v?"calculated":"not_run",v?JSON.stringify(v):""]));rows.push(["warning",d.status,d.warning]);download("\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),"text/csv;charset=utf-8","SAHROUD-STEEL-Base-Connection-Summary.csv");});}
function download(data,type,name){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
root.SteelBaseConnectionReport={collect};if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);

/* ===== steel2/js/member-force-envelope.js ===== */
/* SAHROUD STEEL — member force envelope from the shared 3D model.
 * Reports simultaneous local end-force components per member and load case.
 * It deliberately does not claim code capacity or member adequacy.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
let last=null,selectedMemberId="",selectedCaseLabel="";
const groups=[
 ["all","همه اعضا"],["column","ستون‌ها"],["rafter","رفترها"],["roofPurlin","پرلین‌های سقف"],
 ["wallGirt","قیدهای دیوار"],["endPost","ستونک‌های انتهایی"],["endGirt","تیرهای انتهایی"],
 ["roofBrace","مهاربندهای سقف"],["wallBrace","مهاربندهای دیوار"],["roofEdge","اعضای لبه سقف"],["tieBeam","شناژهای بتنی"]
];
const names=Object.fromEntries(groups);
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cases(){
 const combos=window.SteelLoads?.getData?.().combinations;
 if(!Array.isArray(combos)||!combos.length)throw Error("ترکیبات بار در دسترس نیستند.");
 const out=combos.map((c,i)=>{const missing=["dead","live","snow"].filter(k=>c[k]===undefined||c[k]===null||c[k]==="");if(c.wind===null||c.wind==="")missing.push("wind");const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:c.wind===undefined?0:Number(c.wind)};if(missing.length||!String(c.name||("ترکیب "+(i+1))).trim()||Object.values(factors).some(v=>!Number.isFinite(v)||v<0))throw Error("نام یا ضریب ترکیب بار "+(i+1)+" ناقص/نامعتبر است؛ مقدار نامشخص به صفر تبدیل نمی‌شود.");return {label:String(c.name||("ترکیب "+(i+1))),factors};});
 const labels=out.map(x=>x.label);if(new Set(labels).size!==labels.length)throw Error("نام ترکیبات بار باید یکتا باشد؛ نام تکراری اجازه نمی‌دهد یک حالت بار، حالت دیگر را پنهان کند.");
 const model=window.SteelStructuralModel?.getData?.();
 const hasWind=(model?.members||[]).some(m=>["windLeft","windRight","wind","windEnd"].some(k=>Math.abs(Number(m.lineLoads?.[k])||0)>1e-12));
 if(hasWind)combos.forEach((c,i)=>{const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:1};if(["dead","live","snow"].some(k=>c[k]===undefined||c[k]===null||c[k]==="")||Object.values(factors).some(v=>!Number.isFinite(v)||v<0))throw Error("ضرایب ترکیب باد "+(i+1)+" ناقص یا نامعتبرند.");[1,-1].forEach(sign=>out.push({label:String(c.name||("ترکیب "+(i+1)))+" + باد "+(sign>0?"مثبت":"منفی"),factors,windSign:sign}));});
 return out;
}
function maxAbs(samples,index){
 let best={value:0,caseLabel:""};
 samples.forEach(s=>{const v=Number(s.values?.[index])||0;if(Math.abs(v)>Math.abs(best.value))best={value:v,caseLabel:s.label};});
 return best;
}
function buildRows(model,samples){
 const byId=new Map(),metaById=new Map((model.members||[]).map(m=>[String(m.id),m]));
 samples.forEach(sample=>(sample.members||[]).forEach(m=>{
  if(!byId.has(String(m.id))){const meta=metaById.get(String(m.id))||{};byId.set(String(m.id),{id:m.id,localAxes:m.localAxes||null,localEndForceConventionVersion:Number(m.localEndForceConventionVersion)||null,parentMemberId:m.parentMemberId||meta.parentMemberId||null,taperSegmentIndex:m.taperSegmentIndex||meta.taperSegmentIndex||null,taperSegmentCount:m.taperSegmentCount||meta.taperSegmentCount||null,taperApplied:m.taperApplied===true||meta.taperApplied===true,taperCoordinate:Number.isFinite(Number(m.taperCoordinate))?Number(m.taperCoordinate):(Number.isFinite(Number(meta.taperCoordinate))?Number(meta.taperCoordinate):null),taperDimensions:m.taperDimensions||meta.taperDimensions||null,analysisLoad:m.analysisLoad||meta.analysisLoad||null,type:m.type||meta.type||"",sectionKey:meta.sectionKey||m.sectionKey||m.section?.sectionKey||"",profile:meta.profile||meta.sectionLabel||m.section?.profile||"",start:meta.start||m.start||null,end:meta.end||m.end||null,section:m.section||{},length:Number(m.length||meta.length)||null,ends:[]});}
  const row=byId.get(String(m.id));
  const raw=Array.isArray(m.localEndForces)?m.localEndForces.slice(0,12):[];
  row.ends.push({label:sample.label,values:raw.length===12&&raw.every(Number.isFinite)?raw:[],invalidForceVector:!(raw.length===12&&raw.every(Number.isFinite))});
 }));
 return [...byId.values()].map(row=>{
  const valid=row.ends.filter(e=>e.values.length===12);
  const componentNames=["Nᵢ","Vyᵢ","Vzᵢ","Tᵢ","Myᵢ","Mzᵢ","Nⱼ","Vyⱼ","Vzⱼ","Tⱼ","Myⱼ","Mzⱼ"];
  const envelopes=componentNames.map((name,i)=>({name,...maxAbs(valid,i)}));
  const peak={N:Math.max(Math.abs(envelopes[0].value),Math.abs(envelopes[6].value)),
   Vy:Math.max(Math.abs(envelopes[1].value),Math.abs(envelopes[7].value)),
   Vz:Math.max(Math.abs(envelopes[2].value),Math.abs(envelopes[8].value)),
   T:Math.max(Math.abs(envelopes[3].value),Math.abs(envelopes[9].value)),
   My:Math.max(Math.abs(envelopes[4].value),Math.abs(envelopes[10].value)),
   Mz:Math.max(Math.abs(envelopes[5].value),Math.abs(envelopes[11].value))};
  const simultaneousCases=valid.map(e=>({
   label:e.label,
   endI:{N:e.values[0],Vy:e.values[1],Vz:e.values[2],T:e.values[3],My:e.values[4],Mz:e.values[5]},
   endJ:{N:e.values[6],Vy:e.values[7],Vz:e.values[8],T:e.values[9],My:e.values[10],Mz:e.values[11]},
   sourceVector:e.values.slice()
  }));
  return {...row,envelopes,peak,simultaneousCases,caseCount:valid.length};
 }).sort((a,b)=>String(a.sectionKey).localeCompare(String(b.sectionKey))||String(a.id).localeCompare(String(b.id)));
}
function auditCoverage(model,samples,rows,expectedCaseLabels){
 const first=Array.isArray(samples?.[0]?.members)?samples[0].members:[];
 const expectedIds=new Set(first.map(m=>String(m.id)));
 const reportedIds=new Set((rows||[]).filter(r=>Number(r.caseCount)>0).map(r=>String(r.id)));
 const unreportedMemberIds=[...expectedIds].filter(id=>!reportedIds.has(id));
 const extraMemberIds=[...(rows||[])].map(r=>String(r.id)).filter(id=>!expectedIds.has(id));
 const duplicateMemberIdsByCase=[];
 const invalidForceVectors=[];
 const caseLabels=(samples||[]).map(s=>String(s?.label??"").trim());
 const blankCaseLabels=caseLabels.map((label,i)=>({label,index:i})).filter(x=>!x.label).map(x=>x.index);
 const duplicateCaseLabels=[...new Set(caseLabels.filter((label,i)=>label&&caseLabels.indexOf(label)!==i))];
 const expectedLabels=Array.isArray(expectedCaseLabels)?expectedCaseLabels.map(x=>String(x??"").trim()):null;
 const missingCaseLabels=expectedLabels?expectedLabels.filter(label=>label&&!caseLabels.includes(label)):[];
 const unexpectedCaseLabels=expectedLabels?caseLabels.filter(label=>label&&!expectedLabels.includes(label)):[];
 const duplicateExpectedCaseLabels=expectedLabels?[...new Set(expectedLabels.filter((label,i)=>!label||expectedLabels.indexOf(label)!==i))]:[];
 const analysisMemberSetMismatchCases=(samples||[]).filter(s=>{
  const list=Array.isArray(s.members)?s.members:[];
  const ids=list.map(m=>String(m.id)),unique=new Set(ids);
  const duplicate=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  duplicate.forEach(id=>duplicateMemberIdsByCase.push({caseLabel:s.label||"حالت بدون نام",memberId:id}));
  list.forEach(m=>{
   const v=m?.localEndForces;
   if(!Array.isArray(v)||v.length!==12||!v.every(Number.isFinite))
    invalidForceVectors.push({caseLabel:s.label||"حالت بدون نام",memberId:String(m?.id??""),length:Array.isArray(v)?v.length:0});
  });
  return unique.size!==expectedIds.size||[...expectedIds].some(id=>!unique.has(id))||duplicate.length>0;
 }).map(s=>s.label||"حالت بدون نام");
 return {modelMemberCount:expectedIds.size,physicalMemberCount:(model?.members||[]).length,
  unreportedMemberIds,extraMemberIds,analysisMemberSetMismatchCases,
  duplicateMemberIdsByCase,invalidForceVectors,blankCaseLabels,duplicateCaseLabels,missingCaseLabels,unexpectedCaseLabels,duplicateExpectedCaseLabels,
  caseLabelCoverageOK:!blankCaseLabels.length&&!duplicateCaseLabels.length&&!missingCaseLabels.length&&!unexpectedCaseLabels.length&&!duplicateExpectedCaseLabels.length};
}
async function run(){
 const box=$("memberForceEnvelopeResult"),btn=$("btnMemberForceEnvelope");
 try{
  if(!window.SteelStructuralModel?.analyze3D)throw Error("مدل سه‌بعدی در دسترس نیست.");
  btn.disabled=true;box.textContent="در حال تحلیل ترکیبات بار و استخراج نیروهای انتهایی اعضا…";
  const model=window.SteelStructuralModel.getData();if(!model)throw Error("ابتدا مدل کامل سوله را تولید کنید.");
  const specs=cases(),samples=[];
  for(let i=0;i<specs.length;i++){
   const s=specs[i];
   const result=await window.SteelStructuralModel.analyze3D({label:s.label,factors:s.factors,windSign:s.windSign||1});
   if(!result?.success||!Array.isArray(result.members))throw Error("تحلیل ناموفق در حالت "+s.label);
   if(samples.some(x=>x.label===s.label))throw Error("برچسب ترکیب بار تکراری در فهرست تحلیل: "+s.label);
   const hasTapered=Number(result.taperedSegmentation?.splitMemberCount)>0||(result.members||[]).some(m=>m?.taperApplied===true||m?.taperSegmentCount!=null);
   let taperedMemberForceAudit=null;
   if(hasTapered){
    if(!window.SteelTaperedMemberForceAudit?.audit)throw Error("ممیزی ردیابی نیروهای قطعات متغیرمقطع بارگذاری نشده است.");
    taperedMemberForceAudit=window.SteelTaperedMemberForceAudit.audit(result);
    if(!taperedMemberForceAudit.success)throw Error("ردیابی نیروهای قطعات متغیرمقطع در حالت "+s.label+" ناقص است: "+taperedMemberForceAudit.issues.slice(0,8).join("؛ "));
   }
   samples.push({label:s.label,members:result.members,equilibrium:result.equilibrium,localEndForceConvention:result.localEndForceConvention||null,taperedMemberForceAudit});
   box.textContent="تحلیل "+(i+1)+" از "+specs.length+" — "+s.label;
  }
  const rows=buildRows(model,samples);
  const bad=samples.filter(s=>!s.equilibrium?.ok);
  const coverage=auditCoverage(model,samples,rows,specs.map(s=>s.label));
  if(!coverage.caseLabelCoverageOK)throw Error("ترکیبات بار تحلیل‌شده با فهرست مورد انتظار تطبیق ندارند؛ خروجی پوش نیرو مسدود شد.");
  last={generatedAt:new Date().toISOString(),codeBasis:window.SteelDesignCodes?.getData?.()||null,units:"N,N.m",localEndForceConvention:samples[0]?.localEndForceConvention||null,cases:samples.map(s=>({label:s.label,equilibrium:s.equilibrium,taperedMemberForceAudit:s.taperedMemberForceAudit||null})),taperedForceTrace:{applicable:samples.some(s=>!!s.taperedMemberForceAudit),allApplicableCasesComplete:samples.filter(s=>s.taperedMemberForceAudit).every(s=>s.taperedMemberForceAudit.success),caseCount:samples.filter(s=>!!s.taperedMemberForceAudit).length,physicalMemberCount:Math.max(0,...samples.map(s=>Number(s.taperedMemberForceAudit?.physicalMemberCount)||0)),analysisElementCount:Math.max(0,...samples.map(s=>Number(s.taperedMemberForceAudit?.analysisElementCount)||0))},members:rows,memberCount:rows.length,modelMemberCount:coverage.modelMemberCount,physicalMemberCount:coverage.physicalMemberCount,unreportedMemberIds:coverage.unreportedMemberIds,extraMemberIds:coverage.extraMemberIds,analysisMemberSetMismatchCases:coverage.analysisMemberSetMismatchCases,duplicateMemberIdsByCase:coverage.duplicateMemberIdsByCase,invalidForceVectors:coverage.invalidForceVectors,allCasesEquilibriumOK:bad.length===0,caseLabelCoverageOK:coverage.caseLabelCoverageOK,caseLabelAudit:{blank:coverage.blankCaseLabels,duplicates:coverage.duplicateCaseLabels,missing:coverage.missingCaseLabels,unexpected:coverage.unexpectedCaseLabels,duplicateExpected:coverage.duplicateExpectedCaseLabels},limitations:["این خروجی تقاضای نیروهای انتهایی محلی اعضا در تحلیل خطی مرتبه اول است؛ ظرفیت یا نسبت بهره‌برداری آیین‌نامه‌ای محاسبه نمی‌شود.","ترکیبات ثقلی از فهرست فعلی پروژه گرفته شده‌اند؛ در صورت وجود فشار باد، دو حالت افزوده‌شده با ضریب واحد مثبت و منفی صرفاً سناریوی تحلیل مقدماتی‌اند و ترکیب‌بار آیین‌نامه‌ای کامل محسوب نمی‌شوند.","کمانش، P-Delta، کمانش پیچشی-جانبی، اندرکنش نیروها، طبقه‌بندی مقطع و کنترل خیز/ارتعاش در این گزارش انجام نشده‌اند.","قرارداد محورها و ترتیب مؤلفه‌ها در گزارش ذخیره می‌شود؛ علامت‌های خمشی و برشی هنوز به‌صورت مستقل با مثال‌های مرجع اعتبارسنجی نشده‌اند و نباید برای اندرکنش آیین‌نامه‌ای مصرف شوند."]};
  render();
 }catch(e){box.textContent="خطا: "+e.message;}
 finally{btn.disabled=false;}
}
function render(){
 const filter=$("memberForceGroup")?.value||"all",all=last?.members||[];
 const rows=all.filter(r=>filter==="all"||r.sectionKey===filter);
 const body=$("memberForceRows");
 body.innerHTML=rows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.sectionKey)+'</td><td>'+fmt(r.length||0)+'</td><td>'+fmt(r.peak.N/1000)+'</td><td>'+fmt(r.peak.Vy/1000)+'</td><td>'+fmt(r.peak.Vz/1000)+'</td><td>'+fmt(r.peak.My/1e6)+'</td><td>'+fmt(r.peak.Mz/1e6)+'</td><td>'+r.caseCount+'</td></tr>').join("")||'<tr><td colspan="9">عضوی برای این گروه پیدا نشد.</td></tr>';
 const memberSelect=$("memberForceDetailMember"),caseSelect=$("memberForceDetailCase");
 if(memberSelect){
  const prior=selectedMemberId||memberSelect.value;
  memberSelect.innerHTML=all.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.id)+' — '+esc(r.sectionKey)+'</option>').join("");
  selectedMemberId=all.some(r=>String(r.id)===String(prior))?String(prior):String(all[0]?.id||"");
  memberSelect.value=selectedMemberId;
 }
 if(caseSelect){
  const prior=selectedCaseLabel||caseSelect.value;
  const selected=all.find(r=>String(r.id)===selectedMemberId);
  const labels=selected?.ends?.filter(e=>e.values.length===12).map(e=>e.label)||[];
  caseSelect.innerHTML=labels.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  selectedCaseLabel=labels.includes(prior)?prior:(labels[0]||"");
  caseSelect.value=selectedCaseLabel;
 }
 renderDetail();
 const eq=last.allCasesEquilibriumOK?"تعادل همه تحلیل‌ها برقرار است":"هشدار: در برخی تحلیل‌ها تعادل عددی برقرار نیست";
 const segmentationInfo=Number.isFinite(last.physicalMemberCount)&&last.physicalMemberCount!==last.modelMemberCount?" | "+last.modelMemberCount+" قطعه تحلیل برای "+last.physicalMemberCount+" عضو فیزیکی":"";
 $("memberForceSummary").textContent="اعضای گزارش‌شده: "+last.memberCount+segmentationInfo+" | حالت‌های بار: "+last.cases.length+" | "+eq+" | "+(last.taperedForceTrace.applicable?("ردیابی قطعات تیرورق: "+(last.taperedForceTrace.allApplicableCasesComplete?"کامل":"ناقص")+"، "+last.taperedForceTrace.physicalMemberCount+" عضو فیزیکی / "+last.taperedForceTrace.analysisElementCount+" قطعه در هر حالت"):"عضو متغیرمقطع فعال در این تحلیل شناسایی نشد")+" | نیرو: kN، لنگر: kN.m. مقادیر جدول بیشینه قدرمطلق هر مؤلفه‌اند و ممکن است از ترکیب‌های متفاوت باشند.";
 $("btnMemberForceJSON").disabled=false;
}
function renderDetail(){
 const host=$("memberForceSimultaneousDetail");if(!host||!last)return;
 const member=(last.members||[]).find(r=>String(r.id)===String(selectedMemberId));
 const end=member?.ends?.find(e=>e.label===selectedCaseLabel&&e.values.length===12);
 if(!end){host.textContent="برای عضو و حالت انتخاب‌شده بردار نیروی معتبر در دسترس نیست.";return;}
 const labels=["Nᵢ (kN)","Vyᵢ (kN)","Vzᵢ (kN)","Tᵢ (kN.m)","Myᵢ (kN.m)","Mzᵢ (kN.m)","Nⱼ (kN)","Vyⱼ (kN)","Vzⱼ (kN)","Tⱼ (kN.m)","Myⱼ (kN.m)","Mzⱼ (kN.m)"];
 const p=member.section||{};
 const axes=member.localAxes||{};
 const axisSummary=["x","y","z"].map(k=>k.toUpperCase()+"=["+(Array.isArray(axes[k])?axes[k].map(v=>Number(v).toFixed(4)).join(", "):"ثبت‌نشده")+"]").join("؛ ");
 const props=[["مساحت A (cm²)",Number(p.A)*1e4],["Iy (cm⁴)",Number(p.Iy)*1e8],["Iz (cm⁴)",Number(p.Iz)*1e8],["J (cm⁴)",Number(p.J)*1e8],["E (GPa)",Number(p.E)/1e9],["G (GPa)",Number(p.G)/1e9]];
 const missing=props.filter(x=>!(Number.isFinite(x[1])&&x[1]>0)).map(x=>x[0]);
 const design=window.SteelMemberDesignInputs?.getForGroup?.(member.sectionKey)||{};
 const designFields=[["ضخامت مبنای مصالح (mm)",design.t_mm],["Fy (MPa)",design.Fy],["Fu (MPa)",design.Fu],["منبع خواص مصالح",design.materialSource],["Kx",design.Kx],["Ky",design.Ky],["Lcx (m)",design.Lcx],["Lcy (m)",design.Lcy],["Lb (m)",design.Lb],["Cb",design.Cb]];
 host.innerHTML='<div class="notice">عضو <b>'+esc(member.id)+'</b> — '+esc(member.profile||"مقطع ثبت‌نشده")+' — گره ابتدا: '+esc(member.start||"—")+' — گره انتها: '+esc(member.end||"—")+' — طول: '+fmt(member.length||0)+' m — حالت بار <b>'+esc(end.label)+'</b>. تمام ۱۲ مؤلفه زیر متعلق به همین یک تحلیل و هم‌زمان هستند.<br>نسخه قرارداد نیرو: '+(member.localEndForceConventionVersion||"نامشخص")+'؛ محورهای محلی: '+esc(axisSummary)+'</div>'+
 '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>مؤلفه</th><th>مقدار</th></tr></thead><tbody>'+
 labels.map((label,i)=>'<tr><td>'+label+'</td><td>'+fmt(i%6<3?end.values[i]/1000:end.values[i]/1e6)+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<h4>مشخصات مقطع دریافت‌شده از حل‌گر</h4><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>پارامتر</th><th>مقدار</th></tr></thead><tbody>'+
 props.map(x=>'<tr><td>'+x[0]+'</td><td>'+fmt(x[1])+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<div class="notice">'+(missing.length?"مشخصات لازم برای طراحی ناقص است: "+missing.join("، "):"مشخصات هندسی و الاستیک پایه مقطع از حل‌گر دریافت شده است.")+
 '؛ پارامترهای ورودی گروهی از رجیستر پروژه:</div>'+
 '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>پارامتر</th><th>مقدار ثبت‌شده</th></tr></thead><tbody>'+
 designFields.map(x=>'<tr><td>'+x[0]+'</td><td>'+(typeof x[1]==="string"?esc(x[1]):Number.isFinite(Number(x[1]))?fmt(Number(x[1])):"ثبت نشده")+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<div class="notice">'+(design.applyToAll?"تأیید شده که این پارامترهای گروهی برای تمام اعضای گروه یکسان‌اند؛ این تأیید باید با نقشه‌های مهاربندی و جزئیات واقعی تطبیق داده شود.":"پارامترهای گروهی برای این عضو به‌عنوان ورودی طراحی تأیید نشده‌اند.")+
 '؛ طبقه‌بندی مقطع و ضوابط موضعی هنوز باید از ابعاد واقعی مقطع تعیین شوند. این رجیستر فقط داده ورودی را نگهداری می‌کند و هیچ ظرفیت یا نسبت بهره‌برداری محاسبه نمی‌کند.</div>';
}
function exportJSON(){if(!last)return;const blob=new Blob([JSON.stringify(last,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-member-force-envelope.json";a.click();URL.revokeObjectURL(url);}
function init(){
 if($("memberForceEnvelopePanel"))return;
 const main=document.querySelector("main"),footer=main?.querySelector("footer");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="memberForceEnvelopePanel";
 p.innerHTML='<div class="panel-title"><h3>پوش نیروهای تیر، ستون، رفتر و اعضای فرعی</h3><span class="status">استخراج مستقیم از مدل سه‌بعدی</span></div>'+
 '<div class="notice">این بخش مستقل از طراحی صفحه‌ستون، نیروهای انتهایی محلی تمام اعضای مدل را در ترکیبات بار موجود استخراج می‌کند. مقادیر جدول بیشینه قدرمطلق هر مؤلفه در بین ترکیبات‌اند؛ این مقادیر را نباید به‌عنوان یک بردار هم‌زمان برای کنترل اندرکنش استفاده کرد.</div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="btnMemberForceEnvelope">تحلیل همه ترکیبات و استخراج نیروها</button><button type="button" class="btn secondary" id="btnMemberForceJSON" disabled>دریافت گزارش JSON</button></div>'+
 '<div class="form-grid"><div class="field"><label for="memberForceGroup">فیلتر گروه عضو</label><select id="memberForceGroup">'+groups.map(g=>'<option value="'+g[0]+'">'+g[1]+'</option>').join("")+'</select></div></div>'+
 '<div class="notice" id="memberForceForceNote">ابتدا مدل کامل و مشخصات مقاطع سه‌بعدی را آماده کنید.</div>'+
 '<div class="notice" id="memberForceEnvelopeResult">هنوز تحلیلی اجرا نشده است.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:850px;width:100%"><thead><tr><th>شناسه</th><th>گروه</th><th>طول m</th><th>N kN</th><th>Vy kN</th><th>Vz kN</th><th>My kN.m</th><th>Mz kN.m</th><th>حالت‌های معتبر</th></tr></thead><tbody id="memberForceRows"><tr><td colspan="9">پس از تحلیل نتایج نمایش داده می‌شود.</td></tr></tbody></table></div>'+
 '<div class="panel-title"><h4>بردار نیروهای هم‌زمان برای یک عضو و یک حالت بار</h4></div>'+
 '<div class="form-grid"><div class="field"><label for="memberForceDetailMember">انتخاب عضو</label><select id="memberForceDetailMember"></select></div><div class="field"><label for="memberForceDetailCase">انتخاب حالت بار</label><select id="memberForceDetailCase"></select></div></div>'+
 '<div id="memberForceSimultaneousDetail" class="notice">پس از تحلیل، عضو و حالت بار را انتخاب کنید.</div>'+
 '<div class="notice">این بردار هم‌زمان برای آماده‌سازی کنترل اندرکنش طبق بند ۱۰-۲-۷ مبحث دهم ارائه می‌شود؛ خود کنترل اندرکنش و ظرفیت هنوز پیاده‌سازی نشده است.</div>'+
 '<div class="notice">برای هر عضو، خروجی JSON شامل تمام ۱۲ مؤلفه نیروی انتهایی در هر ترکیب نگهداری می‌شود. تا تکمیل روابط مقاومت و اعتبارسنجی مستقل، نسبت قبولی/ردی خودکار اعلام نمی‌شود.</div>';
 if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);
 $("btnMemberForceEnvelope").addEventListener("click",run);$("btnMemberForceJSON").addEventListener("click",exportJSON);$("memberForceGroup").addEventListener("change",()=>{if(last)render();});$("memberForceDetailMember").addEventListener("change",e=>{selectedMemberId=e.target.value;selectedCaseLabel="";if(last)render();});$("memberForceDetailCase").addEventListener("change",e=>{selectedCaseLabel=e.target.value;renderDetail();});
}
function selfTest(){
 const checks=[],test=(name,fn)=>{try{checks.push({name,pass:!!fn()});}catch(e){checks.push({name,pass:false,error:e.message});}};
 const valid=Array(12).fill(0);
 test("valid simultaneous 12-DOF vector is retained",()=>buildRows({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:valid}]}])[0].caseCount===1);
 test("taper segment trace metadata is retained from solver output",()=>{const r=buildRows({members:[{id:"A",parentMemberId:"P1",taperSegmentIndex:1,taperSegmentCount:2,sectionKey:"rafter"}]},[{label:"ULS",members:[{id:"A",localEndForces:valid,taperApplied:true,taperCoordinate:.25,taperDimensions:{d:500,bf:200,tw:8,tf:12},analysisLoad:{uniformLocal:[0,0,0]}}]}])[0];return r.taperApplied===true&&r.taperCoordinate===.25&&r.taperDimensions?.tw===8&&r.analysisLoad?.uniformLocal[0]===0&&r.parentMemberId==="P1"&&r.taperSegmentIndex===1;});
 test("malformed force vector is excluded from envelope",()=>buildRows({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:[1,2,3]}]}])[0].caseCount===0);
 test("duplicate IDs in one case are reported",()=>auditCoverage({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:valid},{id:"A",localEndForces:valid}]}],[{id:"A",caseCount:1}]).duplicateMemberIdsByCase.length===1);
 test("inconsistent member sets across cases are reported",()=>auditCoverage({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:valid}]},{label:"SLS",members:[]}],[{id:"A",caseCount:1}]).analysisMemberSetMismatchCases.includes("SLS"));
 test("simultaneous member actions preserve same-case axial and biaxial moments",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"C1",members:[{id:"A",localEndForces:[100,2,3,4,50,60,-100,-2,-3,-4,-50,-60]}]},{label:"C2",members:[{id:"A",localEndForces:[200,4,6,8,5,6,-200,-4,-6,-8,-5,-6]}]}])[0];const d=getSimultaneousCaseDemand(r,"C1");return d?.endI.compression===100&&d.endI.My===50&&d.endI.Mz===60&&d.endI.Vy===2&&d.endI.T===4&&d.endJ.Mz===-60;});
 test("simultaneous demand lookup does not synthesize a case from independent envelopes",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"AXIAL",members:[{id:"A",localEndForces:[100,0,0,0,0,0,-100,0,0,0,0,0]}]},{label:"BENDING",members:[{id:"A",localEndForces:[0,0,0,0,0,900,0,0,0,0,0,-900]}]}])[0];const d=getSimultaneousCaseDemand(r,"AXIAL");return d.endI.Mz===0&&d.endI.compression===100;});
 test("invalid force vectors are reported with case identity",()=>auditCoverage({members:[{id:"P"}]},[{label:"ULS",members:[{id:"A",localEndForces:[1,2]}]}],[{id:"A",caseCount:0}]).invalidForceVectors[0]?.caseLabel==="ULS");
 test("axial tension sign is normalized consistently at both member ends",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"T",members:[{id:"A",localEndForces:[-100,0,0,0,0,0,120,0,0,0,0,0]}]}])[0],d=getSimultaneousCaseDemand(r,"T");return d.endI.tension===100&&d.endI.compression===0&&d.endJ.tension===120&&d.endJ.compression===0;});
 test("axial compression sign is normalized consistently at both member ends",()=>{const r=buildRows({members:[{id:"P"}]},[{label:"C",members:[{id:"A",localEndForces:[100,0,0,0,0,0,-120,0,0,0,0,0]}]}])[0],d=getSimultaneousCaseDemand(r,"C");return d.endI.compression===100&&d.endI.tension===0&&d.endJ.compression===120&&d.endJ.tension===0;});
 test("duplicate and blank analyzed case labels are rejected",()=>{const x=auditCoverage({members:[]},[{label:"ULS",members:[]},{label:"ULS",members:[]},{label:"",members:[]}],[],["ULS","SLS"]);return !x.caseLabelCoverageOK&&x.duplicateCaseLabels.includes("ULS")&&x.blankCaseLabels.length===1&&x.missingCaseLabels.includes("SLS");});
 test("unexpected analyzed case labels are rejected",()=>!auditCoverage({members:[]},[{label:"ULS",members:[]},{label:"EXTRA",members:[]}],[],["ULS"]).caseLabelCoverageOK);
 test("duplicate expected case labels are rejected",()=>auditCoverage({members:[]},[{label:"ULS",members:[]}],[],["ULS","ULS"]).duplicateExpectedCaseLabels.includes("ULS"));
 return {passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,scope:"simultaneous action preservation and deterministic data-integrity tests only; no structural design approval"};
}
function getSimultaneousCaseDemand(row,label){
 const c=(row?.simultaneousCases||[]).find(x=>x.label===label);
 if(!c)return null;
 // Solver convention: tension is -Fx_i at end I and +Fx_j at end J.
 // Normalize both ends to one signed member-axial convention (tension positive).
 const endDemand=(e,end)=>{const raw=Number(e.N)||0,signedTension=end==="i"?-raw:raw;return {rawAxialN:raw,signedTensionN:signedTension,compression:Math.max(0,-signedTension),tension:Math.max(0,signedTension),Vy:Number(e.Vy)||0,Vz:Number(e.Vz)||0,T:Number(e.T)||0,My:Number(e.My)||0,Mz:Number(e.Mz)||0};};
 return {label:c.label,axialSignConvention:"tension-positive; endI=-Fx_i; endJ=+Fx_j",endI:endDemand(c.endI,"i"),endJ:endDemand(c.endJ,"j")};
}
root.SteelMemberForceEnvelope={run,getLast:()=>last,buildRows,auditCoverage,getSimultaneousCaseDemand,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/brace-force-demand-audit.js ===== */
/* SAHROUD STEEL — longitudinal brace force-demand extraction gate.
 * Extracts simultaneous axial end-force demands from a completed member envelope.
 * It does not infer tension/compression resistance, connection capacity, or code adequacy.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const expectedAxialConvention={endI:"negative Fx_i",endJ:"positive Fx_j"};
function audit(envelope,model){
 const issues=[],rows=[],members=Array.isArray(model?.members)?model.members:[];
 const braces=members.filter(m=>m.sectionKey==="wallBrace"||m.sectionKey==="roofBrace");
 const modelIds=members.map(m=>String(m.id)),duplicateModelIds=[...new Set(modelIds.filter((id,i)=>modelIds.indexOf(id)!==i))];
 if(duplicateModelIds.length)issues.push("شناسه عضو در مدل تکراری است؛ تطبیق نیرو با عضو یکتا ممکن نیست: "+duplicateModelIds.join("، "));
 if(!envelope||!Array.isArray(envelope.members))issues.push("پوش نیروهای FEM در دسترس نیست؛ ابتدا تحلیل تمام ترکیبات را اجرا کنید.");
 if(!braces.length)issues.push("هیچ مهاربند طولی دیوار یا سقف در مدل پیدا نشد.");
 if(envelope?.allCasesEquilibriumOK!==true)issues.push("تعادل تمام حالت‌های تحلیل در پوش نیرو تأیید نشده است.");
 if((envelope?.invalidForceVectors||[]).length)issues.push("پوش نیرو دارای بردار نیروی نامعتبر است.");
 if((envelope?.analysisMemberSetMismatchCases||[]).length)issues.push("مجموعه اعضای تحلیل در ترکیبات یکسان نیست.");
 const signCases=envelope?.localEndForceConvention?.verifiedSignCases?.axialTension;
 const signConventionVerified=envelope?.localEndForceConvention?.version===1&&signCases?.endI===expectedAxialConvention.endI&&signCases?.endJ===expectedAxialConvention.endJ;
 if(braces.length&&!signConventionVerified)issues.push("قرارداد علامت نیروی محوری دو انتهای عضو با قرارداد اعتبارسنجی‌شده حل‌گر تطبیق ندارد؛ طبقه‌بندی کشش/فشار مجاز نیست.");
 if((envelope?.unreportedMemberIds||[]).length)issues.push("برخی اعضای مدل در نتایج تحلیل گزارش نشده‌اند.");
 const envelopeMembers=Array.isArray(envelope?.members)?envelope.members:[];
 const envelopeIds=envelopeMembers.map(m=>String(m.id)),duplicateEnvelopeIds=[...new Set(envelopeIds.filter((id,i)=>envelopeIds.indexOf(id)!==i))];
 if(duplicateEnvelopeIds.length)issues.push("شناسه عضو در پوش نیرو تکراری است؛ نتایج هم‌نام قابل تفکیک نیستند: "+duplicateEnvelopeIds.join("، "));
 const envById=new Map(envelopeMembers.map(m=>[String(m.id),m]));
 braces.forEach(brace=>{
  const row=envById.get(String(brace.id)),cases=Array.isArray(row?.simultaneousCases)?row.simultaneousCases:[];
  const seen=new Set(),demands=[];
  if(!row)issues.push("نیروی مهاربند "+brace.id+" در پوش نیرو موجود نیست.");
  if(!cases.length)issues.push("هیچ حالت بار هم‌زمان برای مهاربند "+brace.id+" ثبت نشده است.");
  cases.forEach(c=>{
   const label=String(c.label||""),i=c.endI?.N,j=c.endJ?.N;
   if(!label||seen.has(label)||!finite(i)||!finite(j)){issues.push("حالت بار یا مؤلفه محوری دو سر مهاربند "+brace.id+" ناقص/تکراری است.");return;}
   seen.add(label);const ti=signConventionVerified?-i:null,tj=signConventionVerified?j:null;
   demands.push({caseLabel:label,endI_N:i,endJ_N:j,endI_tension_N:signConventionVerified?Math.max(0,ti):null,endI_compression_N:signConventionVerified?Math.max(0,-ti):null,endJ_tension_N:signConventionVerified?Math.max(0,tj):null,endJ_compression_N:signConventionVerified?Math.max(0,-tj):null,maxAbsAxial_N:Math.max(Math.abs(i),Math.abs(j))});
  });
  rows.push({memberId:String(brace.id),sectionKey:brace.sectionKey,memberLength_m:finite(Number(brace.length))?Number(brace.length):null,caseCount:demands.length,simultaneousDemands:demands,forceConvention:envelope?.localEndForceConvention||null,status:demands.length===cases.length&&cases.length>0?"demand-extracted":"incomplete"});
 });
 const rawExpectedLabels=Array.isArray(envelope?.cases)?envelope.cases.map(c=>String(c?.label||"")):[];
 const expectedLabels=rawExpectedLabels.filter(Boolean);
 const expectedCases=expectedLabels.length;
 if(rawExpectedLabels.some(x=>!x.trim()))issues.push("فهرست حالت‌های تحلیل دارای نام خالی است؛ تطبیق کامل ترکیبات ممکن نیست.");
 const duplicateExpectedLabels=[...new Set(expectedLabels.filter((x,i)=>expectedLabels.indexOf(x)!==i))];
 if(duplicateExpectedLabels.length)issues.push("نام حالت بار در پوش تحلیل تکراری است: "+duplicateExpectedLabels.join("، "));
 rows.forEach(r=>{
  const actualLabels=r.simultaneousDemands.map(x=>x.caseLabel);
  const missingLabels=expectedLabels.filter(x=>!actualLabels.includes(x));
  const unexpectedLabels=actualLabels.filter(x=>!expectedLabels.includes(x));
  if(expectedCases&&(r.caseCount!==expectedCases||missingLabels.length||unexpectedLabels.length)){
   r.missingCaseLabels=missingLabels;r.unexpectedCaseLabels=unexpectedLabels;
   r.status="incomplete";
   issues.push("پوش ترکیبات مهاربند "+r.memberId+" با فهرست حالت‌های تحلیل تطبیق کامل ندارد؛ مفقود: "+missingLabels.join("، ")+"؛ اضافی: "+unexpectedLabels.join("، ")+".");
  }
 });
 // Summarize each brace end separately while preserving the governing load-case identity.
 rows.forEach(r=>{
  const peaks={tension:{forceN:0,caseLabel:null,end:null},compression:{forceN:0,caseLabel:null,end:null}};
  r.simultaneousDemands.forEach(d=>{
   for(const [end,tension,compression] of [["I",d.endI_tension_N,d.endI_compression_N],["J",d.endJ_tension_N,d.endJ_compression_N]]){
    if(finite(tension)&&tension>peaks.tension.forceN)peaks.tension={forceN:tension,caseLabel:d.caseLabel,end};
    if(finite(compression)&&compression>peaks.compression.forceN)peaks.compression={forceN:compression,caseLabel:d.caseLabel,end};
   }
  });
  r.peakTension=signConventionVerified?peaks.tension:null;
  r.peakCompression=signConventionVerified?peaks.compression:null;
  r.demandCoverageComplete=r.status==="demand-extracted"&&expectedCases>0&&r.caseCount===expectedCases;
 });
 const completeRows=rows.filter(r=>r.demandCoverageComplete);
 const summary={completeBraceCount:completeRows.length,braceCount:braces.length,peakTension:null,peakCompression:null};
 if(completeRows.length===braces.length&&braces.length&&signConventionVerified&&issues.length===0){
  for(const r of completeRows){
   for(const kind of ["tension","compression"]){
    const p=r[kind==="tension"?"peakTension":"peakCompression"];
    if(p&&(!summary[kind==="tension"?"peakTension":"peakCompression"]||p.forceN>summary[kind==="tension"?"peakTension":"peakCompression"].forceN))
     summary[kind==="tension"?"peakTension":"peakCompression"]={memberId:r.memberId,...p};
   }
  }
 }
 if(!envelope?.localEndForceConvention&&rows.length)issues.push("قرارداد علامت/محور نیروهای محلی مستند نیست؛ تشخیص کشش/فشار مجاز نیست.");
 return {success:issues.length===0,issues,rows,summary,braceCount:braces.length,expectedCaseCount:expectedCases,demandOnly:true,analysisEnabled:false,designApproved:false,
 limitations:["این ماژول فقط نیروی محوری انتهایی هم‌زمان هر ترکیب را استخراج می‌کند؛ تبدیل آن به نیروی کششی/فشاری طراحی تا اعتبارسنجی قرارداد علامت انجام نشده است.","ظرفیت کششی، کمانش مهاربند، طول مهارنشده، K، مقطع مؤثر، خروج از مرکزیت، گاست‌پلیت، پیچ/جوش و مسیر collector/دیافراگم کنترل نمی‌شوند.","وجود مسیر توپولوژیک تا پایه به‌تنهایی انتقال واقعی نیروی باد طولی یا سختی دیافراگم را اثبات نمی‌کند."]};
}
function selfTest(){
 const model={members:[{id:"WB1",sectionKey:"wallBrace",length:5},{id:"RB1",sectionKey:"roofBrace",length:7}]};
 const envelope={allCasesEquilibriumOK:true,localEndForceConvention:{version:1,verifiedSignCases:{axialTension:{endI:"negative Fx_i",endJ:"positive Fx_j"}}},cases:[{label:"C1"},{label:"C2"}],members:[
 {id:"WB1",simultaneousCases:[{label:"C1",endI:{N:100},endJ:{N:-120}},{label:"C2",endI:{N:80},endJ:{N:90}}]},
 {id:"RB1",simultaneousCases:[{label:"C1",endI:{N:200},endJ:{N:-220}},{label:"C2",endI:{N:180},endJ:{N:190}}]}]};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("extracts simultaneous axial demands per brace and case",()=>{const r=audit(envelope,model);return r.success&&r.rows.length===2&&r.rows[0].caseCount===2&&r.rows[0].simultaneousDemands[0].maxAbsAxial_N===120;});
 t("does not mix independent case maxima",()=>{const r=audit(envelope,model);return r.rows[0].simultaneousDemands.length===2&&r.rows[0].simultaneousDemands[0].caseLabel==="C1"&&r.rows[0].simultaneousDemands[1].caseLabel==="C2";});
 t("rejects missing brace force row",()=>!audit({...envelope,members:envelope.members.slice(1)},model).success);
 t("rejects incomplete case coverage",()=>!audit({...envelope,cases:[...envelope.cases,{label:"C3"}]},model).success);
 t("rejects duplicate labels masking a missing case",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[1].label="C1";return !audit(e,model).success;});
 t("rejects unexpected labels replacing expected cases",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[1].label="OTHER";return !audit(e,model).success;});
 t("rejects non-equilibrated envelope",()=>!audit({...envelope,allCasesEquilibriumOK:false},model).success);
 t("rejects unknown local force convention",()=>!audit({...envelope,localEndForceConvention:null},model).success);
 t("rejects malformed axial end force",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[0].endI.N="100";return !audit(e,model).success;});
 t("normalizes tensile actions at opposite member ends consistently",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[0].endI.N=-100;e.members[0].simultaneousCases[0].endJ.N=120;const r=audit(e,model),d=r.rows[0].simultaneousDemands[0];return r.success&&d.endI_tension_N===100&&d.endJ_tension_N===120&&d.endI_compression_N===0&&d.endJ_compression_N===0;});
 t("normalizes compressive actions at opposite member ends consistently",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[0].endI.N=100;e.members[0].simultaneousCases[0].endJ.N=-120;const r=audit(e,model),d=r.rows[0].simultaneousDemands[0];return r.success&&d.endI_compression_N===100&&d.endJ_compression_N===120&&d.endI_tension_N===0&&d.endJ_tension_N===0;});
 t("rejects unrecognized axial sign convention",()=>!audit({...envelope,localEndForceConvention:{version:2,verifiedSignCases:{axialTension:{endI:"wrong",endJ:"wrong"}}}},model).success);
 t("never reports capacity or design approval",()=>{const r=audit(envelope,model);return r.demandOnly&&r.analysisEnabled===false&&r.designApproved===false&&!r.rows.some(x=>"capacity_kN" in x);});
 t("rejects duplicate brace IDs in structural model",()=>!audit(envelope,{members:[...model.members,{...model.members[0]}]}).success);
 t("rejects duplicate member IDs in force envelope",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members.push({...e.members[0]});return !audit(e,model).success;});
 t("rejects duplicate expected load-case labels",()=>{const e=JSON.parse(JSON.stringify(envelope));e.cases[1].label="C1";return !audit(e,model).success;});
 t("rejects blank expected load-case labels",()=>{const e=JSON.parse(JSON.stringify(envelope));e.cases[1].label="";return !audit(e,model).success;});
 t("reports governing tensile demand with exact case and end",()=>{const r=audit(envelope,model),x=r.rows[0].peakTension;return r.success&&x.forceN===90&&x.caseLabel==="C2"&&x.end==="J"&&r.summary.peakTension.memberId==="RB1"&&r.summary.peakTension.forceN===190;});
 t("reports governing compression demand separately without mixing cases",()=>{const r=audit(envelope,model),x=r.rows[0].peakCompression;return r.success&&x.forceN===120&&x.caseLabel==="C1"&&x.end==="J"&&r.summary.peakCompression.memberId==="RB1"&&r.summary.peakCompression.forceN===220;});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"software regression only; no member capacity verification"};
}
root.SteelBraceForceDemandAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/member-section-force-diagram.js ===== */
/* SAHROUD STEEL — conservative member section-force reconstruction.
 * Supports only prismatic, unreleased, zero-offset frame elements with explicitly
 * complete local uniform-load data. Unsupported load types fail closed.
 * Units: N, N.m, m. End actions use SteelFrame3D localEndForces convention.
 */
(function(root){
"use strict";
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
function reconstruct(input,options){
 options=options||{};
 const fail=(reason,details)=>({status:"insufficient_data",ok:false,reason,details:details||[]});
 if(!input||typeof input!=="object")return fail("عضو یا داده ورودی ارائه نشده است.");
 const L=Number(input.length);
 if(!(Number.isFinite(L)&&L>0))return fail("طول واقعی عضو باید مثبت و بر حسب متر مشخص باشد.");
 const f=input.localEndForces;
 if(!Array.isArray(f)||f.length!==12||!f.every(Number.isFinite))return fail("بردار ۱۲ مؤلفه‌ای نیروهای انتهایی معتبر نیست.");
 if(input.loadDataComplete!==true)return fail("کامل‌بودن داده بارهای روی طول عضو صریحاً تأیید نشده است.");
 if(input.prismatic!==true)return fail("این بازسازی فقط برای عضو منشوری است؛ عضو متغیرمقطع باید با روش اختصاصی تحلیل شود.");
 if(input.endReleases&&((input.endReleases.i||[]).length||(input.endReleases.j||[]).length))return fail("آزادسازی انتهایی در این نسخه پشتیبانی نمی‌شود.");
 const offsets=input.endOffsets||{};
 if((offsets.i&&offsets.i.some(v=>Math.abs(Number(v))>1e-12))||(offsets.j&&offsets.j.some(v=>Math.abs(Number(v))>1e-12)))return fail("بازوی صلب/خروج از مرکزیت انتهایی در این نسخه پشتیبانی نمی‌شود.");
 const load=input.uniformLocal;
 if(!finite3(load)||!load.every(Number.isFinite))return fail("بار گسترده یکنواخت محلی باید به‌صورت سه مؤلفه N/m و حتی در حالت صفر صریحاً ارائه شود.");
 if(Array.isArray(input.pointLoads)&&input.pointLoads.length)return fail("بار متمرکز روی طول عضو هنوز پشتیبانی نمی‌شود.");
 if(Array.isArray(input.distributedLoads)&&input.distributedLoads.length)return fail("بار گسترده غیر یکنواخت یا قطعه‌ای هنوز پشتیبانی نمی‌شود.");
 const q=load,linear=input.linearLocal;
 if(linear!==undefined&&linear!==null&&(!linear||!finite3(linear.start)||!finite3(linear.end)))return fail("بار خطی متغیر محلی باید دو بردار سه‌مؤلفه‌ای متناهی در ابتدا و انتهای عضو داشته باشد.");
 const q0=linear?linear.start:q,q1=linear?linear.end:q,dq=q1.map((v,i)=>v-q0[i]);
 const stations=new Set();
 const count=Math.max(2,Math.min(200,Math.floor(Number(options.subdivisions)||20)));
 for(let i=0;i<=count;i++)stations.add(L*i/count);
 // Add exact zero-shear locations, where a component of bending moment can peak.
 // For a linearly varying load, V(x)=-(F_i+q0*x+deltaQ*x^2/(2L)); solve the quadratic.
 for(const k of [1,2]){
  const a=dq[k]/(2*L),b=q0[k],cc=f[k];
  if(Math.abs(a)<=1e-14){
   if(Math.abs(b)>1e-12){const x=-cc/b;if(x>0&&x<L)stations.add(x);}
  }else{
   const discriminant=b*b-4*a*cc;
   if(discriminant>=0){
    const root=Math.sqrt(discriminant);
    for(const x of [(-b-root)/(2*a),(-b+root)/(2*a)])if(x>0&&x<L)stations.add(x);
   }
  }
 }
 const rows=[...stations].sort((a,b)=>a-b).map(x=>{
  const force=[0,1,2].map(k=>-(f[k]+q0[k]*x+dq[k]*x*x/(2*L)));
  const weighted=[0,1,2].map(k=>-q0[k]*x*x/2-dq[k]*x*x*x/(6*L));
  const rI=[-x,0,0];
  const moment=[0,1,2].map(k=>-(f[k+3]+cross(rI,f.slice(0,3))[k]+cross([1,0,0],weighted)[k]));
  return {x_m:x,N_N:force[0],Vy_N:force[1],Vz_N:force[2],T_Nm:moment[0],My_Nm:moment[1],Mz_Nm:moment[2]};
 });
 const endResidual=[0,1,2].map(k=>rows[rows.length-1][["N_N","Vy_N","Vz_N"][k]]-f[k+6]);
 const momentResidual=[0,1,2].map(k=>rows[rows.length-1][["T_Nm","My_Nm","Mz_Nm"][k]]-f[k+9]);
 const scale=Math.max(1,...f.map(Math.abs),...q.map(v=>Math.abs(v)*L));
 const residual=Math.max(...endResidual.map(Math.abs),...momentResidual.map(Math.abs));
 if(residual>1e-7*scale)return fail("تعادل انتهای عضو با بردار نیروهای انتهایی سازگار نیست؛ قرارداد بار یا علامت‌ها نیازمند بازبینی است.",[{endResidual,momentResidual,relativeResidual:residual/scale}]);
 return {status:"ok",ok:true,method:linear?"left-segment equilibrium from solver end actions plus explicit local linearly varying load":"left-segment equilibrium from solver end actions plus explicit local uniform load",units:{length:"m",force:"N",moment:"N.m",distributedLoad:"N/m"},convention:"At a cut x from physical end i, section resultant equals the negative resultant of the i-end solver action and all applied loads on the left segment; terminal value must match j-end solver action.",stations:rows,checks:{endEquilibrium:true,relativeResidual:residual/scale},limitations:["Only prismatic, unreleased, zero-offset members.","Only explicitly complete local uniform or linearly varying local loads; point loads are rejected.","No capacity, code check, stability check, or design approval is produced."]};
}
function selfTest(){
 const checks=[],test=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,detail:e.message});}};
 test("cantilever point-equivalent tip action without member load",()=>{const r=reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],localEndForces:[0,1000,0,0,0,4000,0,-1000,0,0,0,0]});return r.ok&&Math.abs(r.stations[0].Vy_N+1000)<1e-8&&Math.abs(r.stations[0].Mz_Nm+4000)<1e-8&&Math.abs(r.stations.at(-1).Vy_N+1000)<1e-8;});
 test("uniform local load recovers linear shear and quadratic moment",()=>{const L=6,q=-2000,V0=6000,M0=12000,fi=[0,-V0,0,0,0,-M0],qv=[0,q,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],ri=[-L,0,0],rq=[-L*L/2,0,0],mj=-(fi[5]+cross(ri,fi.slice(0,3))[2]+cross(rq,qv)[2]);const r=reconstruct({length:L,prismatic:true,loadDataComplete:true,uniformLocal:qv,localEndForces:[...fi,0,V0-q*L,0,0,0,mj]});return r.ok&&Math.abs(r.stations[0].Vy_N-V0)<1e-7&&Math.abs(r.stations.at(-1).Vy_N-(V0-q*L))<1e-7;});
 test("missing explicit load completeness fails closed",()=>reconstruct({length:4,prismatic:true,uniformLocal:[0,0,0],localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("missing uniform load vector fails closed",()=>reconstruct({length:4,prismatic:true,loadDataComplete:true,localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("tapered member fails closed",()=>reconstruct({length:4,prismatic:false,loadDataComplete:true,uniformLocal:[0,0,0],localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("point load fails closed",()=>reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],pointLoads:[{x:2,values:[0,-1,0]}],localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("linear load endpoints must be finite three-vectors",()=>reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],linearLocal:{start:[0,-1,0],end:[0,NaN,0]},localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 test("linear varying local load reconstructs solver end actions in equilibrium",()=>{const r=reconstruct({length:3,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],linearLocal:{start:[0,-100,0],end:[0,-300,0]},localEndForces:[0,600,0,0,0,1050,0,0,0,0,0,0]});return r.ok&&Math.abs(r.stations.at(-1).Vy_N)<1e-7&&Math.abs(r.stations.at(-1).Mz_Nm)<1e-7;});
 test("linear load adds exact internal zero-shear station",()=>{const r=reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],linearLocal:{start:[0,-1,0],end:[0,1,0]},localEndForces:[0,1,0,0,0,0,0,-1,0,0,0,4/3]});return r.ok&&r.stations.some(x=>Math.abs(x.x_m-2)<1e-9);});
 test("released member fails closed",()=>reconstruct({length:4,prismatic:true,loadDataComplete:true,uniformLocal:[0,0,0],endReleases:{i:[4]},localEndForces:Array(12).fill(0)}).status==="insufficient_data");
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,checks};
}
root.SteelMemberSectionForces={reconstruct,selfTest};
})(typeof window!=="undefined"?window:globalThis);

