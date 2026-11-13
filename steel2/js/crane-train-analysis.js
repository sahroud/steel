/* SAHROUD STEEL — documented wheel-train static placement on a simply supported runway beam.
 * Uses manufacturer-entered individual wheel loads; no load distribution or impact factors are invented.
 * This is a single-position beam analysis, not a moving-load envelope or design check.
 */
(function(root){
"use strict";
const $=id=>document.getElementById("craneTrain_"+id);
const defaults={span_m:"",positions_m:"0, 1.5",loads_t:"",firstWheelOffset_m:"0",loadSource:"",loadDocument:""};
let state={...defaults};
const parseList=s=>String(s??"").split(",").map(x=>x.trim()).map(x=>x===""?NaN:Number(x));
function readUI(){const d={};Object.keys(defaults).forEach(k=>d[k]=$(k)?.value??state[k]);return d;}
function setData(d){state={...defaults,...(d||{})};Object.keys(defaults).forEach(k=>{if($(k))$(k).value=state[k];});render();}
function analyze(input){
 const d={...defaults,...(input||{})},L=Number(d.span_m),offset=Number(d.firstWheelOffset_m);
 const positions=parseList(d.positions_m),loads=parseList(d.loads_t),issues=[];
 if(!(L>0)&&Number.isFinite(L))issues.push("دهانه تیر باید بزرگ‌تر از صفر باشد.");
 if(!Number.isFinite(L)||L<=0)issues.push("دهانه معتبر تیر حمال وارد نشده است.");
 if(!Number.isFinite(offset))issues.push("موقعیت چرخ اول معتبر نیست.");
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0))issues.push("فاصله‌های چرخ باید فهرست عددی نامنفی باشند.");
 if(positions.length&&positions[0]!==0)issues.push("فاصله چرخ اول باید صفر باشد؛ سایر فاصله‌ها نسبت به آن سنجیده می‌شوند.");
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("فاصله‌های تجمعی چرخ‌ها باید صعودی و بدون تکرار باشند.");
 if(loads.length!==positions.length||loads.some(x=>!Number.isFinite(x)||x<=0))issues.push("برای هر چرخ دقیقاً یک بار مثبت و مستقل بر حسب تن وارد کنید.");\n if(!String(d.loadSource||"").trim())issues.push("منبع مستند بارهای چرخ را وارد کنید.");\n if(!String(d.loadDocument||"").trim())issues.push("شماره صفحه کاتالوگ یا مرجع نقشه بار چرخ الزامی است.");
 if(issues.length)return {ok:false,issues};
 const wheels=positions.map((p,i)=>({id:i+1,x:offset+p,P:loads[i]*9.80665,load_t:loads[i]}));
 const active=wheels.filter(w=>w.x>=-1e-9&&w.x<=L+1e-9);
 if(!active.length)return {ok:false,issues:["در موقعیت فعلی هیچ چرخی روی دهانه تیر قرار ندارد."],wheels};
 const RA=active.reduce((v,w)=>v+w.P*(L-w.x)/L,0),RB=active.reduce((v,w)=>v+w.P*w.x/L,0);
 const xs=[0,...active.map(w=>Math.max(0,Math.min(L,w.x))),L].sort((a,b)=>a-b);
 const unique=xs.filter((x,i)=>i===0||Math.abs(x-xs[i-1])>1e-9);
 const at=x=>RA*x-active.reduce((v,w)=>v+w.P*Math.max(0,x-w.x),0);
 const samples=unique.map(x=>({x_m:x,M_kNm:at(x)}));
 const peak=samples.reduce((a,b)=>Math.abs(b.M_kNm)>Math.abs(a.M_kNm)?b:a,samples[0]);
 const positive=samples.reduce((a,b)=>b.M_kNm>a.M_kNm?b:a,samples[0]);
 const leftShear=RA,rightShear=RA-active.reduce((v,w)=>v+w.P,0);
 return {ok:true,span_m:L,offset_m:offset,wheels,activeWheelCount:active.length,reactions_kN:{left:RA,right:RB},maxAbsMoment_kNm:Math.abs(peak.M_kNm),peakMoment:{x_m:peak.x_m,M_kNm:peak.M_kNm},maxPositiveMoment_kNm:positive.M_kNm,positiveMomentLocation_m:positive.x_m,shear_kN:{justRightOfLeft:leftShear,justLeftOfRight:rightShear},equilibriumError_kN:Math.abs(RA+RB-active.reduce((v,w)=>v+w.P,0)),method:"تحلیل استاتیکی تیر دو سر مفصل؛ بارهای متمرکز ثابت در موقعیت اعلام‌شده؛ نمودار لنگر بین چرخ‌ها خطی است و نقاط چرخ/تکیه‌گاه ارزیابی شده‌اند."};
}
function render(){
 const host=$("results");if(!host)return;
 const r=analyze(readUI());host.textContent="";
 const p=document.createElement("p");p.className="notice";
 p.textContent=r.ok?"تحلیل موقعیت ثابت انجام شد؛ "+r.activeWheelCount+" چرخ روی دهانه قرار دارد.":"ورودی‌ها برای تحلیل کافی نیستند.";
 host.appendChild(p);
 (r.issues||[]).forEach(t=>{const x=document.createElement("p");x.className="notice";x.textContent="⚠ "+t;host.appendChild(x);});
 if(!r.ok)return;
 const rows=[
 ["واکنش تکیه‌گاه چپ",r.reactions_kN.left.toFixed(3)+" kN"],
 ["واکنش تکیه‌گاه راست",r.reactions_kN.right.toFixed(3)+" kN"],
 ["بیشینه قدرمطلق لنگر",r.maxAbsMoment_kNm.toFixed(3)+" kN·m"],
 ["محل لنگر بحرانی",r.peakMoment.x_m.toFixed(3)+" m"],
 ["لنگر مثبت بیشینه",r.maxPositiveMoment_kNm.toFixed(3)+" kN·m"],
 ["خطای تعادل قائم",r.equilibriumError_kN.toExponential(2)+" kN"]
 ];
 const table=document.createElement("table");table.className="data-table";
 rows.forEach(([a,b])=>{const tr=document.createElement("tr");const th=document.createElement("th");th.textContent=a;const td=document.createElement("td");td.textContent=b;tr.append(th,td);table.appendChild(tr);});
 host.appendChild(table);
 const note=document.createElement("p");note.className="notice";note.textContent=r.method+" بار هر چرخ به تن‌نیرو تبدیل شده است. اثر ضربه، نیروهای افقی، وزن تیر، پیوستگی چنددهانه، پیچش، کمانش، خستگی و طراحی مقطع در این خروجی منظور نشده‌اند.";host.appendChild(note);
}
function init(){Object.keys(defaults).forEach(k=>$(k)?.addEventListener("input",render));$("calculate")?.addEventListener("click",render);render();}
root.SteelCraneTrainAnalysis={getData:readUI,setData,analyze,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(window);
