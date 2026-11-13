/* SAHROUD STEEL — anchor-group demand distribution screen.
 * Elastic rigid-plate distribution only. No code resistance design, prying, concrete breakout,
 * pullout, side-face blowout, edge effects, group effects, weld or base-plate bending design.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const ids=["rows","cols","pitchX","pitchZ","tension","momentX","momentZ","shearX","shearZ","torsionY","tensionCapacity","shearCapacity"];
const defaults={rows:"2",cols:"2",pitchX:"160",pitchZ:"160",tension:"",momentX:"",momentZ:"",shearX:"",shearZ:"",torsionY:"",tensionCapacity:"",shearCapacity:"",signConfirmed:false};
let state={...defaults},last=null;
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
const num=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function coordinates(rows,cols,px,pz){const a=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)a.push({mark:"AB-"+String(a.length+1).padStart(2,"0"),x:(c-(cols-1)/2)*px/1000,z:(r-(rows-1)/2)*pz/1000});return a;}
function distribute(input){
 const {rows,cols,pitchX,pitchZ,tension,momentX,momentZ,shearX,shearZ,torsionY}=input;
 if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows*cols>64)throw Error("تعداد ردیف و ستون بولت باید عدد صحیح و حداکثر ۶۴ بولت باشد.");
 if((cols>1&&!(pitchX>0))||(rows>1&&!(pitchZ>0)))throw Error("فاصله محور بولت‌ها باید در هر آرایش چندردیفه/چندستونه مثبت باشد.");
 if([tension,momentX,momentZ,shearX,shearZ,torsionY].some(v=>v===null))throw Error("تمام پنج مؤلفه نیروی هم‌زمان را وارد کنید؛ برای مؤلفه صفر عدد صفر بنویسید.");
 const bolts=coordinates(rows,cols,pitchX,pitchZ),n=bolts.length;
 const sx2=bolts.reduce((s,b)=>s+b.x*b.x,0),sz2=bolts.reduce((s,b)=>s+b.z*b.z,0);
 const results=bolts.map(b=>{
  const fromMx=sz2>0?momentX*b.z/sz2:0;
  const fromMz=sx2>0?momentZ*b.x/sx2:0;
  const axial=tension/n+fromMx+fromMz;
  return {...b,tensionKN:Math.max(0,axial),signedAxialKN:axial,shearXKN:shearX/n,shearZKN:shearZ/n,shearResultKN:Math.hypot(shearX,shearZ)/n};
 });
 return {bolts:results,maxTensionKN:Math.max(...results.map(x=>x.tensionKN)),maxShearKN:Math.max(...results.map(x=>x.shearResultKN)),torsionYKNm:torsionY,torsionDistributionStatus:"not_distributed_requires_separate_3D_anchor_group_check",sumTensionOnlyKN:results.reduce((s,x)=>s+x.tensionKN,0),sumShearXKN:shearX,sumShearZKN:shearZ,geometry:{rows,cols,pitchX,pitchZ},method:"linear_elastic_rigid_plate_no_prying"};
}
function panel(){
 if($("anchorDemandScreenPanel"))return;
 const rootPanel=$("anchorBaseplatePanel")||$("foundationTakeoffPanel");if(!rootPanel)return;
 const p=document.createElement("section");p.className="panel";p.id="anchorDemandScreenPanel";
 p.innerHTML='<div class="panel-title"><h3>غربال توزیع نیرو در گروه بولت مهاری</h3><span class="status">تقاضای نیرو؛ نه طراحی ظرفیت</span></div>'+
 '<div class="notice">نیروها و لنگرهای هم‌زمان یک ترکیب بار را وارد کنید. توزیع کشش با فرض صفحه صلب و رفتار الاستیک گروه بولت انجام می‌شود؛ برش به‌طور مساوی تقسیم می‌شود. این روش اثر اهرمی صفحه (prying)، انعطاف صفحه‌ستون، تماس فشاری زیر صفحه، کشش/فشار بتن، اندرکنش دقیق گروه، شکست بتن و ضوابط لرزه‌ای را مدل نمی‌کند. نیروها را با قرارداد علامت مدل کنترل کنید.</div>'+
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
 '<div class="button-grid"><button id="btnAnchorDemandRun" class="btn primary" type="button">محاسبه نیروی هر بولت</button><button id="btnAnchorDemandCSV" class="btn secondary" type="button" disabled>دریافت CSV</button></div>'+
 '<div id="anchorDemandSummary" class="notice">ابتدا آرایش بولت و شش مؤلفه هم‌زمان یک ترکیب بار را وارد کنید.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>بولت</th><th>X (m)</th><th>Z (m)</th><th>کشش محاسباتی (kN)</th><th>برش X (kN)</th><th>برش Z (kN)</th><th>برش برآیند (kN)</th><th>وضعیت ظرفیت واردشده</th></tr></thead><tbody id="anchorDemandRows"></tbody></table></div>'+
 '<div class="notice">اگر ظرفیت‌های طراحی وارد شوند، نسبت تقاضا به ظرفیت هر مؤلفه فقط به‌صورت مقایسه جداگانه نشان داده می‌شود؛ این مقایسه جای کنترل اندرکنش کشش و برش، شکست بتن، فاصله لبه، گروه بولت و طراحی صفحه‌ستون را نمی‌گیرد.</div>';
 rootPanel.parentNode.insertBefore(p,rootPanel.nextSibling);
 const map={rows:"adRows",cols:"adCols",pitchX:"adPitchX",pitchZ:"adPitchZ",tension:"adTension",momentX:"adMx",momentZ:"adMz",shearX:"adVx",shearZ:"adVz",torsionY:"adTy",tensionCapacity:"adTcap",shearCapacity:"adVcap"};
 ids.forEach(k=>{$(map[k]).value=state[k]??"";$(map[k]).addEventListener("change",()=>state[k]=$(map[k]).value);});
 $("adSign").checked=!!state.signConfirmed;$("adSign").addEventListener("change",()=>state.signConfirmed=$("adSign").checked);
 $("btnAnchorDemandRun").addEventListener("click",run);$("btnAnchorDemandCSV").addEventListener("click",exportCSV);
}
function run(){
 const map={rows:"adRows",cols:"adCols",pitchX:"adPitchX",pitchZ:"adPitchZ",tension:"adTension",momentX:"adMx",momentZ:"adMz",shearX:"adVx",shearZ:"adVz",tensionCapacity:"adTcap",shearCapacity:"adVcap"};
 ids.forEach(k=>state[k]=$(map[k])?.value??state[k]);state.signConfirmed=!!$("adSign")?.checked;
 const vals={};["rows","cols","pitchX","pitchZ","tension","momentX","momentZ","shearX","shearZ","torsionY"].forEach(k=>vals[k]=num(state[k]));
 try{
  if(!state.signConfirmed)throw Error("ابتدا قرارداد علامت نیروها را تأیید کنید.");
  const r=distribute(vals),tc=num(state.tensionCapacity),vc=num(state.shearCapacity);
  r.bolts.forEach(b=>{b.tensionRatio=tc>0?b.tensionKN/tc:null;b.shearRatio=vc>0?b.shearResultKN/vc:null;b.capacityStatus=tc>0&&vc>0?(b.tensionRatio<=1&&b.shearRatio<=1?"هر دو نسبت جداگانه ≤ ۱":"حداقل یک نسبت جداگانه > ۱"):"ظرفیت کامل وارد نشده؛ کنترل ظرفیت باز است";});
  r.input={...vals,tensionCapacity:tc,shearCapacity:vc,signConfirmed:true};r.limitations=["توزیع کشش الاستیک با صفحه صلب و بدون prying است؛ توزیع واقعی ممکن است متفاوت باشد.","برش بین بولت‌ها مساوی فرض شده و اثر اصطکاک تماس، کلید برشی و لغزش لحاظ نشده است.","ظرفیت فولادی، شکست مخروطی بتن، pullout، pry-out، side-face blowout، فاصله لبه، فاصله محوری، اثر گروه، لرزه‌ای، خستگی و اندرکنش آیین‌نامه‌ای کنترل نشده‌اند.","ظرفیت‌های اختیاری صرفاً از ورودی کاربر خوانده می‌شوند و نرم‌افزار صحت آن‌ها را تأیید نمی‌کند."];
  last=r;const body=$("anchorDemandRows");body.replaceChildren();
  r.bolts.forEach(b=>{const tr=document.createElement("tr");[b.mark,fmt(b.x),fmt(b.z),fmt(b.tensionKN),fmt(b.shearXKN),fmt(b.shearZKN),fmt(b.shearResultKN),b.capacityStatus].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  const torsionText=" | پیچش Y: "+fmt(r.torsionYKNm)+" kN.m (در این غربال توزیع/طراحی نشده؛ کنترل مستقل لازم است)";\n  const tText=tc>0?"نسبت بیشینه کشش/ظرفیت: "+fmt(r.maxTensionKN/tc):"ظرفیت کششی وارد نشده";
  const vText=vc>0?"نسبت بیشینه برش/ظرفیت: "+fmt(r.maxShearKN/vc):"ظرفیت برشی وارد نشده";
  $("anchorDemandSummary").textContent="تعداد بولت: "+r.bolts.length+" | بیشینه کشش یک بولت: "+fmt(r.maxTensionKN)+" kN | بیشینه برش یک بولت: "+fmt(r.maxShearKN)+" kN | "+tText+" | "+vText+torsionText+" | فقط غربال تقاضا؛ نه تأیید طراحی.";
  $("btnAnchorDemandCSV").disabled=false;return r;
 }catch(e){$("anchorDemandSummary").textContent=e.message;return null;}
}
function exportCSV(){
 if(!last)return;
 const rows=[["گزارش توزیع تقاضای گروه بولت"],["روش",last.method],["پیچش حول Y (kN.m) — توزیع نشده",last.torsionYKNm],["بیشینه کشش بولت (kN)",last.maxTensionKN],["بیشینه برش بولت (kN)",last.maxShearKN],["بولت","X m","Z m","کشش kN","برش X kN","برش Z kN","برش برآیند kN","نسبت کشش","نسبت برش","وضعیت"],...last.bolts.map(b=>[b.mark,b.x,b.z,b.tensionKN,b.shearXKN,b.shearZKN,b.shearResultKN,b.tensionRatio,b.shearRatio,b.capacityStatus]),...last.limitations.map(x=>["محدودیت",x])];
 const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Demand-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function getData(){return {...state};}
function setData(d){if(d&&typeof d==="object"){state={...state,...d};}}
function selfTest(){
 const r=distribute({rows:2,cols:2,pitchX:200,pitchZ:200,tension:40,momentX:0,momentZ:0,shearX:20,shearZ:0,torsionY:0});
 const checks=[["توزیع نیروی محوری برابر",r.bolts.every(b=>Math.abs(b.tensionKN-10)<1e-9)],["جمع برش X برابر ورودی",Math.abs(r.bolts.reduce((s,b)=>s+b.shearXKN,0)-20)<1e-9],["تقارن بدون لنگر",Math.abs(r.maxTensionKN-10)<1e-9]];
 const m=distribute({rows:2,cols:2,pitchX:200,pitchZ:200,tension:0,momentX:20,momentZ:0,shearX:0,shearZ:0});
 checks.push(["لنگر حول X کشش ردیف‌ها را تفکیک می‌کند",m.bolts.some(b=>b.tensionKN>0)&&m.bolts.some(b=>b.tensionKN===0)]);\n const t=distribute({rows:2,cols:2,pitchX:200,pitchZ:200,tension:0,momentX:0,momentZ:0,shearX:0,shearZ:0,torsionY:12});\n checks.push(["پیچش حفظ می‌شود ولی بدون محاسبه صریح توزیع، طراحی‌نشده می‌ماند",t.torsionYKNm===12&&t.torsionDistributionStatus==="not_distributed_requires_separate_3D_anchor_group_check"]);
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelAnchorDemandScreen={distribute,run,getData,setData,getLast:()=>last?JSON.parse(JSON.stringify(last)):null,selfTest};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",panel);else panel();}
})(typeof window!=="undefined"?window:globalThis);
