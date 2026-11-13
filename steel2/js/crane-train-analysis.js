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
 if(!Number.isFinite(L)||L<=0)issues.push("دهانه معتبر تیر حمال وارد نشده است.");
 if(!Number.isFinite(offset))issues.push("موقعیت چرخ اول معتبر نیست.");
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0))issues.push("فاصله‌های چرخ باید فهرست عددی نامنفی باشند.");
 if(positions.length&&positions[0]!==0)issues.push("فاصله چرخ اول باید صفر باشد؛ سایر فاصله‌ها نسبت به آن سنجیده می‌شوند.");
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("فاصله‌های تجمعی چرخ‌ها باید صعودی و بدون تکرار باشند.");
 if(loads.length!==positions.length||loads.some(x=>!Number.isFinite(x)||x<=0))issues.push("برای هر چرخ دقیقاً یک بار مثبت و مستقل بر حسب تن وارد کنید.");
 if(!String(d.loadSource||"").trim())issues.push("منبع مستند بارهای چرخ را وارد کنید.");
 if(!String(d.loadDocument||"").trim())issues.push("شماره صفحه کاتالوگ یا مرجع نقشه بار چرخ الزامی است.");
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
function movingEnvelope(input){
 const d={...defaults,...(input||{})},L=Number(d.span_m),positions=parseList(d.positions_m),loads=parseList(d.loads_t),issues=[];
 if(!Number.isFinite(L)||L<=0)issues.push("دهانه معتبر تیر حمال وارد نشده است.");
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0))issues.push("فاصله‌های تجمعی چرخ‌ها معتبر نیستند.");
 if(positions.length&&positions[0]!==0)issues.push("فاصله چرخ اول باید صفر باشد.");
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("فاصله‌های چرخ باید صعودی و بدون تکرار باشند.");
 if(loads.length!==positions.length||loads.some(x=>!Number.isFinite(x)||x<=0))issues.push("برای هر چرخ یک بار مثبت مستقل لازم است.");
 if(!String(d.loadSource||"").trim()||!String(d.loadDocument||"").trim())issues.push("منبع و مرجع مستند بارهای چرخ الزامی است.");
 if(issues.length)return {ok:false,issues};
 const P=loads.map(x=>x*9.80665);let best={M_kNm:-Infinity,x_m:null,offset_m:null,event:""};
 const evaluate=(x,a,event)=>{
  if(x< -1e-8||x>L+1e-8)return;
  const z=positions.map(p=>a+p),active=z.map((v,i)=>({x:v,P:P[i]})).filter(w=>w.x>=-1e-9&&w.x<=L+1e-9);
  const RA=active.reduce((v,w)=>v+w.P*(L-w.x)/L,0);
  const M=RA*x-active.reduce((v,w)=>v+w.P*Math.max(0,x-w.x),0);
  if(M>best.M_kNm)best={M_kNm:M,x_m:x,offset_m:a,event};
 };
 // Translation breakpoints where any wheel enters/leaves a support.
 positions.forEach((pj,j)=>{
  [-pj,L-pj].forEach(a=>{
   const z=positions.map(p=>a+p).filter(v=>v>=-1e-9&&v<=L+1e-9);
   [0,L,...z].forEach(x=>evaluate(x,a,"wheel enters/exits support"));
  });
 });
 // For a wheel located exactly at the section x, optimize the resulting quadratic
 // on every interval where the set of wheels on the beam is unchanged.
 positions.forEach((pj,j)=>{
  const ds=positions.map(p=>p-pj),cuts=[0,L];
  ds.forEach(d=>{const a=-d,b=L-d;if(a>0&&a<L)cuts.push(a);if(b>0&&b<L)cuts.push(b);});
  cuts.sort((a,b)=>a-b);
  const unique=cuts.filter((x,i)=>i===0||Math.abs(x-cuts[i-1])>1e-9);
  for(let k=0;k<unique.length-1;k++){
   const lo=unique[k],hi=unique[k+1],mid=(lo+hi)/2;
   let A=0,B=0,C=0;
   ds.forEach((d,i)=>{const z=mid+d;if(z<0||z>L)return;A-=P[i]/L;B+=P[i]*(L-d)/L;if(d<=0)C+=P[i]*d;});
   const candidates=[lo,hi];if(A<0){const v=-B/(2*A);if(v>lo&&v<hi)candidates.push(v);}
   candidates.forEach(x=>evaluate(x,x-pj,"wheel at critical section"));
  }
 });
 return {ok:true,span_m:L,maxPositiveMoment_kNm:Math.max(0,best.M_kNm),criticalSection_m:best.x_m,criticalFirstWheelOffset_m:best.offset_m,governingEvent:best.event,method:"پوش دقیق لنگر مثبت برای قطار بار متمرکز روی تیر ساده دو سر مفصل؛ نقاط ورود/خروج چرخ و نقاط عبور چرخ از مقطع، با بهینه‌سازی تحلیلی سهم درجه‌دوم بین مرزهای فعال‌بودن چرخ‌ها بررسی شده‌اند.",limitations:["فقط بارهای قائم متمرکز و یک قطار جرثقیل","تیر ساده دو سر مفصل و یک دهانه","بدون اثر ضربه، نیروهای افقی، وزن تیر/ریل، پیچش، خستگی یا طراحی مقطع"]};
}
function movingShearEnvelope(input){
 const d={...defaults,...(input||{})},L=Number(d.span_m),positions=parseList(d.positions_m),loads=parseList(d.loads_t),issues=[];
 if(!Number.isFinite(L)||L<=0)issues.push("دهانه معتبر تیر حمال وارد نشده است.");
 if(!positions.length||positions.some(x=>!Number.isFinite(x)||x<0))issues.push("فاصله‌های تجمعی چرخ‌ها معتبر نیستند.");
 if(positions.length&&positions[0]!==0)issues.push("فاصله چرخ اول باید صفر باشد.");
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))issues.push("فاصله‌های چرخ باید صعودی و بدون تکرار باشند.");
 if(loads.length!==positions.length||loads.some(x=>!Number.isFinite(x)||x<=0))issues.push("برای هر چرخ یک بار مثبت مستقل لازم است.");
 if(!String(d.loadSource||"").trim()||!String(d.loadDocument||"").trim())issues.push("منبع و مرجع مستند بارهای چرخ الزامی است.");
 if(issues.length)return {ok:false,issues};
 const P=loads.map(x=>x*9.80665),events=new Set();
 positions.forEach(p=>{events.add(-p);events.add(L-p);});
 const offsets=[...events].sort((a,b)=>a-b);
 let maxRA={value:-Infinity,offset:null},minRA={value:-Infinity,offset:null};
 let maxRB={value:-Infinity,offset:null},minRB={value:-Infinity,offset:null};
 let maxV={value:-Infinity,offset:null,x:null,side:""},minV={value:-Infinity,offset:null,x:null,side:""};
 const take=(target,value,offset,x,side)=>{if(value>target.value){target.value=value;target.offset=offset;target.x=x;target.side=side;}};
 offsets.forEach(a=>{
  const wheels=positions.map((p,i)=>({x:a+p,P:P[i],id:i+1})).filter(w=>w.x>=-1e-9&&w.x<=L+1e-9).sort((u,v)=>u.x-v.x);
  const RA=wheels.reduce((v,w)=>v+w.P*(L-w.x)/L,0),RB=wheels.reduce((v,w)=>v+w.P*w.x/L,0);
  take(maxRA,RA,a);take(minRA,-RA,a);take(maxRB,RB,a);take(minRB,-RB,a);
  let V=RA;
  const atLeft=wheels.filter(w=>Math.abs(w.x)<=1e-9);
  if(atLeft.length){take(maxV,V,a,0,"حد چپِ چرخِ واقع بر تکیه‌گاه چپ");take(minV,-V,a,0,"حد چپِ چرخِ واقع بر تکیه‌گاه چپ");}
  atLeft.forEach(w=>V-=w.P);
  take(maxV,V,a,0,"بلافاصله راست تکیه‌گاه چپ");
  take(minV,-V,a,0,"بلافاصله راست تکیه‌گاه چپ");
  wheels.filter(w=>w.x>1e-9&&w.x<L-1e-9).forEach(w=>{
   take(maxV,V,a,w.x,"بلافاصله چپ چرخ "+w.id);
   take(minV,-V,a,w.x,"بلافاصله چپ چرخ "+w.id);
   V-=w.P;
   take(maxV,V,a,w.x,"بلافاصله راست چرخ "+w.id);
   take(minV,-V,a,w.x,"بلافاصله راست چرخ "+w.id);
  });
  take(maxV,V,a,L,"بلافاصله چپ تکیه‌گاه راست");
  take(minV,-V,a,L,"بلافاصله چپ تکیه‌گاه راست");
  wheels.filter(w=>Math.abs(w.x-L)<=1e-9).forEach(w=>{take(maxV,V-w.P,a,L,"حد راستِ چرخِ واقع بر تکیه‌گاه راست");take(minV,-(V-w.P),a,L,"حد راستِ چرخِ واقع بر تکیه‌گاه راست");});
 });
 return {ok:true,span_m:L,maxReactionLeft_kN:maxRA.value,minReactionLeft_kN:-minRA.value,maxReactionRight_kN:maxRB.value,minReactionRight_kN:-minRB.value,maxPositiveShear_kN:maxV.value,minNegativeShear_kN:-minV.value,maxAbsShear_kN:Math.max(maxV.value,-minV.value),governingShear:{value_kN:Math.max(maxV.value,-minV.value),offset_m:maxV.value>=-minV.value?maxV.offset:minV.offset,section_m:maxV.value>=-minV.value?maxV.x:minV.x,side:maxV.value>=-minV.value?maxV.side:minV.side},reactionPositions:{leftMax_m:maxRA.offset,rightMax_m:maxRB.offset},method:"پوش سراسری برش و واکنش برای یک قطار بار قائم روی تیر ساده: انتقال قطار در تمام بازه‌های تغییر عضویت چرخ‌ها به‌صورت قطعه‌ای خطی است؛ نقاط ورود و خروج چرخ از دو تکیه‌گاه ارزیابی شده‌اند. برش در دو سوی هر چرخ و دو انتهای دهانه کنترل شده است.",limitations:["یک قطار جرثقیل و یک تیر ساده تک‌دهانه","بارهای قائم متمرکز؛ بدون ضربه، بار افقی، وزن تیر/ریل، پیچش یا خستگی","این خروجی طراحی تیر یا تکیه‌گاه نیست"]};
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
function showShearEnvelope(){
 const host=$("results");if(!host)return;
 const r=movingShearEnvelope(readUI()),box=document.createElement("div");box.className="notice";
 if(!r.ok){box.textContent="پوش برش/واکنش محاسبه نشد: "+r.issues.join(" | ");host.appendChild(box);return;}
 box.textContent="پوش قدرمطلق برش: "+r.maxAbsShear_kN.toFixed(3)+" kN؛ محل بحرانی: x="+r.governingShear.section_m.toFixed(3)+" m؛ موقعیت چرخ اول: "+r.governingShear.offset_m.toFixed(3)+" m؛ "+r.governingShear.side+". بیشینه واکنش چپ: "+r.maxReactionLeft_kN.toFixed(3)+" kN؛ بیشینه واکنش راست: "+r.maxReactionRight_kN.toFixed(3)+" kN. "+r.method+" محدودیت: "+r.limitations.join("؛ ");
 host.appendChild(box);
}
function showEnvelope(){
 const host=$("results");if(!host)return;
 const r=movingEnvelope(readUI()),box=document.createElement("div");box.className="notice";
 if(!r.ok){box.textContent="پوش متحرک محاسبه نشد: "+r.issues.join(" | ");host.appendChild(box);return;}
 box.textContent="پوش دقیق لنگر مثبت: "+r.maxPositiveMoment_kNm.toFixed(3)+" kN·m؛ مقطع بحرانی: "+r.criticalSection_m.toFixed(3)+" m؛ موقعیت چرخ اول: "+r.criticalFirstWheelOffset_m.toFixed(3)+" m. "+r.method+" محدودیت: "+r.limitations.join("؛ ");
 host.appendChild(box);
}
function init(){Object.keys(defaults).forEach(k=>$(k)?.addEventListener("input",render));$("calculate")?.addEventListener("click",render);$("envelope")?.addEventListener("click",showEnvelope);$("shearEnvelope")?.addEventListener("click",showShearEnvelope);render();}
root.SteelCraneTrainAnalysis={getData:readUI,setData,analyze,movingEnvelope,movingShearEnvelope,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(window);
