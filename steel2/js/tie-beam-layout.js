/* SAHROUD STEEL - Explicit concrete tie-beam layout and end-joint registry.
 * Geometry and joint assumptions are stored; no solver activation until releases/details are verified.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id),num=v=>Number.isFinite(Number(v))?Number(v):NaN;
let state={schemaVersion:3,material:{},reinforcement:{stirrupDiaMm:10,passThroughFootings:true,extendToLastFootingOuterFace:true,standardEndHook:true},routes:[]};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
function bases(){return(window.SteelStructuralModel?.getData?.()?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");}
function label(n){return n.id+" — X:"+fmt(n.x)+"، Z:"+fmt(n.z)+" متر";}
function sync(){
 const a=$("tieRouteStart"),b=$("tieRouteEnd");if(!a||!b)return;const ns=bases(),oa=a.value,ob=b.value;
 const opts='<option value="">انتخاب گره پایه</option>'+ns.map(n=>'<option value="'+n.id+'">'+label(n)+'</option>').join("");
 a.innerHTML=opts;b.innerHTML=opts;if(ns.some(n=>n.id===oa))a.value=oa;if(ns.some(n=>n.id===ob))b.value=ob;
 a.disabled=b.disabled=ns.length<2;$("tieNodeCount").textContent="گره‌های پایه قابل انتخاب: "+ns.length;
}
function material(){return{widthM:num($("tieWidthM")?.value),heightM:num($("tieHeightM")?.value),fcMPa:num($("tieFcMPa")?.value),E_GPa:num($("tieEGPa")?.value),G_GPa:num($("tieGGPa")?.value),densityKNm3:num($("tieDensity")?.value)};}
function reinforcement(){const opt=id=>{const v=$(id)?.value;if(v==null||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};return{longitudinalBarCount:opt("tieLongBarCount"),longitudinalBarDiaMm:opt("tieLongBarDiaMm"),stirrupDiaMm:opt("tieStirrupDiaMm")||10,stirrupSpacingMm:opt("tieStirrupSpacingMm"),passThroughFootings:true,extendToLastFootingOuterFace:true,standardEndHook:true,anchorageNote:"آرماتورهای طولی و خاموت‌ها از داخل فونداسیون عبور کنند؛ آرماتورهای طولی تا وجه بیرونی آخرین فونداسیون ادامه یافته و با قلاب استاندارد مهار شوند. طول مهاری، شکل و زاویه قلاب باید طبق ضوابط و نقشه اجرایی کنترل شود."};}
function check(m){for(const[k,n]of Object.entries({widthM:"عرض شناژ",heightM:"ارتفاع شناژ",fcMPa:"مقاومت بتن",E_GPa:"مدول E بتن",G_GPa:"مدول G بتن",densityKNm3:"وزن مخصوص بتن"}))if(!(m[k]>0&&Number.isFinite(m[k])))throw Error("مقدار واقعی "+n+" را وارد کنید.");}
function rectangleProperties(m,axis){
 check(m);
 const b=m.widthM,h=m.heightM;
 // Rectangular Saint-Venant torsion constant; b is the shorter side.
 const short=Math.min(b,h),long=Math.max(b,h),r=short/long;
 const J=long*Math.pow(short,3)*(1/3-0.21*r*(1-Math.pow(r,4)/12));
 // The solver local axes put global vertical in local y for X beams and local z for Z beams.
 const Iy=axis==="X"?h*Math.pow(b,3)/12:b*Math.pow(h,3)/12;
 const Iz=axis==="X"?b*Math.pow(h,3)/12:h*Math.pow(b,3)/12;
 return{E:m.E_GPa*1e9,G:m.G_GPa*1e9,A:b*h,Iy,Iz,J,axis,assumption:"مقطع مستطیلی؛ محور عمق قائم؛ J تقریبی سنت‌ونان"};
}
function audit(){
 const ns=new Map(bases().map(n=>[n.id,n]));
 let valid=0,invalid=0,totalLength=0,totalVolume=0,totalWeight=0;
 const rows=state.routes.map(r=>{
  const a=ns.get(r.start),b=ns.get(r.end);let reasons=[];
  if(!a||!b)reasons.push("گره در مدل فعلی پیدا نشد");
  if(r.startJoint==="unknown"||r.endJoint==="unknown")reasons.push("نوع اتصال دو سر کامل تعیین نشده");
  let axis=null,L=0;
  if(a&&b){
   L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
   if(Math.abs(b.y-a.y)>0.01)reasons.push("تراز دو گره بیش از 10 میلی‌متر اختلاف دارد");
   const dx=Math.abs(b.x-a.x),dz=Math.abs(b.z-a.z);
   if(dx<0.001&&dz<0.001)reasons.push("فاصله افقی مسیر تقریباً صفر است");
   else if(dx>0.001&&dz>0.001)reasons.push("مسیر مورب در پلان است؛ فعلاً فقط مسیر موازی محور X یا Z پذیرفته می‌شود");
   else axis=dx>dz?"X":"Z";
  }
  let p=null,V=0,W=0;
  try{p=rectangleProperties(r,axis||"X");if(a&&b){V=L*r.widthM*r.heightM;W=V*r.densityKNm3;}}catch(e){reasons.push(e.message);}
  const ok=reasons.length===0;
  if(ok){valid++;totalLength+=L;totalVolume+=V;totalWeight+=W;}else invalid++;
  return{id:r.id,start:r.start,end:r.end,axis,lengthM:L,volumeM3:V,selfWeightKN:W,section:p,valid:ok,reasons};
 });
 return{schemaVersion:1,validCount:valid,invalidCount:invalid,totalLengthM:totalLength,totalConcreteM3:totalVolume,totalSelfWeightKN:totalWeight,rows,solverActive:false,note:"این ممیزی هندسی/مقطعی است؛ وزن و سختی هنوز به مدل تحلیل اضافه نشده‌اند."};
}
function jointLabel(v){return v==="rigid"?"گیردار/یکپارچه":v==="pinned"?"مفصلی": "نامشخص";}
function render(){
 const host=$("tieRoutesTable");if(!host)return;const ns=new Map(bases().map(n=>[n.id,n]));
 if(!state.routes.length){host.innerHTML='<p class="geometry-hint">هنوز مسیری تعریف نشده است.</p>';$("tieRouteSummary").textContent="";return;}
 host.innerHTML='<div class="table-wrap"><table><thead><tr><th>شناژ</th><th>مسیر</th><th>طول (m)</th><th>مقطع (m)</th><th>حجم (m³)</th><th>اتصال ابتدا/انتها</th><th></th></tr></thead><tbody>'+
 state.routes.map((r,i)=>{const a=ns.get(r.start),b=ns.get(r.end),L=a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z):0,V=L*r.widthM*r.heightM;return'<tr><td>'+(i+1)+'</td><td>'+r.start+' ← '+r.end+'</td><td>'+fmt(L)+'</td><td>'+fmt(r.widthM)+' × '+fmt(r.heightM)+'</td><td>'+fmt(V)+'</td><td>'+jointLabel(r.startJoint)+' / '+jointLabel(r.endJoint)+'</td><td><button type="button" class="btn secondary" data-rm="'+i+'">حذف</button></td></tr>';}).join("")+'</tbody></table></div>';
 host.querySelectorAll("[data-rm]").forEach(x=>x.addEventListener("click",()=>{state.routes.splice(+x.dataset.rm,1);render();save();}));
 const volume=state.routes.reduce((s,r)=>{const a=ns.get(r.start),b=ns.get(r.end);return s+(a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*r.widthM*r.heightM:0);},0);
 const unresolved=state.routes.filter(r=>r.startJoint==="unknown"||r.endJoint==="unknown").length;
 $("tieRouteSummary").textContent="مسیرها: "+state.routes.length+" | حجم هندسی بتن: "+fmt(volume)+" مترمکعب | مسیر دارای اتصال نامشخص: "+unresolved+".";
}
function save(){try{localStorage.setItem("sahroudSteelTieBeamLayout",JSON.stringify(state));}catch(e){}window.SteelProject?.scheduleAutoSave?.();}
function add(){
 try{const start=$("tieRouteStart").value,end=$("tieRouteEnd").value,ns=bases(),a=ns.find(n=>n.id===start),b=ns.find(n=>n.id===end);if(!a||!b||start===end)throw Error("دو گره پایه متفاوت انتخاب کنید.");
 const m=material();check(m);if(state.routes.some(r=>(r.start===start&&r.end===end)||(r.start===end&&r.end===start)))throw Error("این مسیر قبلاً ثبت شده است.");
 const startJoint=$("tieStartJoint").value,endJoint=$("tieEndJoint").value;
 state.material=m;state.reinforcement=reinforcement();state.routes.push({id:"TB"+(state.routes.length+1),start,end,startJoint,endJoint,reinforcement:{...state.reinforcement},...m});render();save();
 $("tieRouteMessage").textContent="مسیر ثبت شد؛ طول "+fmt(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z))+" متر. نوع اتصال‌ها فقط به‌عنوان داده ورودی ذخیره شده‌اند و هنوز در تحلیل اعمال نمی‌شوند.";
 }catch(e){$("tieRouteMessage").textContent=e.message;}
}
function mount(){
 if($("tieBeamLayoutPanel"))return;const anchor=$("foundationTakeoffPanel")||$("shedLayoutPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="tieBeamLayoutPanel";
 p.innerHTML='<div class="panel-title"><h3>تعریف مسیر و مشخصات شناژهای بتنی</h3><span class="status">ورودی هندسی مستقل</span></div><div class="notice">مسیر هر شناژ را بین دو گره پایه واقعی انتخاب کنید. نوع اتصال هر انتها را از روی نقشه/جزئیات اجرایی تعیین کنید؛ گزینه نامشخص مانع فعال‌شدن تحلیل شناژ خواهد بود.</div><div class="form-grid">'+
 [['tieWidthM','عرض مقطع شناژ (m)',0.60],['tieHeightM','ارتفاع مقطع شناژ (m)',0.50],['tieFcMPa',"مقاومت مشخصه بتن f\\'c (MPa)",25],['tieEGPa','مدول الاستیسیته E بتن (GPa)',23.5],['tieGGPa','مدول برشی G بتن (GPa)',9.8],['tieDensity','وزن مخصوص بتن (kN/m³)',25]].map(([id,l,v])=>'<div class="field"><label for="'+id+'">'+l+'</label><input id="'+id+'" type="number" min="0.01" step="0.1" value="'+v+'" placeholder="مقدار مستند از نقشه/مشخصات"></div>').join("")+
 '</div><div class="form-grid"><div class="field"><label for="tieLongBarCount">تعداد میلگرد طولی (عدد؛ از نقشه تعیین شود)</label><input id="tieLongBarCount" type="number" min="1" step="1" placeholder="طبق طراحی"></div><div class="field"><label for="tieLongBarDiaMm">قطر میلگرد طولی (mm؛ از نقشه تعیین شود)</label><input id="tieLongBarDiaMm" type="number" min="8" step="2" placeholder="طبق طراحی"></div><div class="field"><label for="tieStirrupDiaMm">قطر خاموت (mm)</label><input id="tieStirrupDiaMm" type="number" min="6" step="1" value="10"></div><div class="field"><label for="tieStirrupSpacingMm">فاصله خاموت‌ها (mm؛ محاسباتی)</label><input id="tieStirrupSpacingMm" type="number" min="50" step="10" placeholder="پس از کنترل برش و ضوابط"></div></div><div class="notice">پیش‌فرض پیشنهادی: مقطع 60×50 سانتی‌متر، بتن 25 مگاپاسکال، E=23.5 و G=9.8 گیگاپاسکال، وزن مخصوص 25 کیلونیوتن بر مترمکعب و خاموت قطر 10 میلی‌متر. تعداد و قطر میلگردهای طولی و فاصله خاموت‌ها عمداً بدون محاسبه/نقشه تعیین نشده‌اند.</div><div class="notice">جزئیات آرماتورگذاری: میلگردهای طولی شناژ و خاموت‌ها از داخل فونداسیون عبور داده شوند؛ میلگردهای طولی تا وجه بیرونی آخرین فونداسیون ادامه یابند و انتهای آن‌ها با قلاب استاندارد مهار شود. طول مهاری، پوشش بتن، شکل/زاویه قلاب، تداخل میلگردها و امکان بتن‌ریزی باید جداگانه کنترل شوند.</div><div class="button-grid"><button type="button" class="btn secondary" id="btnApplyTieDefaults">بازگردانی پیش‌فرض‌های پیشنهادی</button><button type="button" class="btn secondary" id="btnRefreshTieNodes">به‌روزرسانی گره‌های پایه</button></div><div id="tieNodeCount" class="geometry-hint"></div><div class="form-grid"><div class="field"><label for="tieRouteStart">گره شروع شناژ</label><select id="tieRouteStart"></select></div><div class="field"><label for="tieRouteEnd">گره پایان شناژ</label><select id="tieRouteEnd"></select></div><div class="field"><label for="tieStartJoint">نوع اتصال ابتدای شناژ</label><select id="tieStartJoint"><option value="rigid" selected>گیردار/یکپارچه (پیش‌فرض پیشنهادی؛ نیازمند تأیید جزئیات)</option><option value="unknown">نامشخص ـ نیازمند نقشه</option><option value="pinned">مفصلی ـ فقط با جزئیات انتقال برش/نیرو</option></select></div><div class="field"><label for="tieEndJoint">نوع اتصال انتهای شناژ</label><select id="tieEndJoint"><option value="rigid" selected>گیردار/یکپارچه (پیش‌فرض پیشنهادی؛ نیازمند تأیید جزئیات)</option><option value="unknown">نامشخص ـ نیازمند نقشه</option><option value="pinned">مفصلی ـ فقط با جزئیات انتقال برش/نیرو</option></select></div></div><div class="button-grid"><button type="button" class="btn primary" id="btnAddTieRoute">ثبت مسیر شناژ</button></div><div id="tieRouteMessage" class="notice">مشخصات واقعی مقطع و اتصال‌ها را وارد کنید.</div><div id="tieRoutesTable"></div><div id="tieRouteSummary" class="notice"></div><div class="button-grid"><button type="button" class="btn secondary" id="btnAuditTieRoutes">ممیزی هندسه و محاسبه مشخصات مقطع</button></div><pre id="tieAuditOutput" class="result-box">ممیزی هنوز اجرا نشده است.</pre><div class="notice">حل‌گر اکنون آزادسازی دوران‌های انتهایی اعضا را با چگالش استاتیکی پشتیبانی می‌کند؛ بااین‌حال شناژ بتنی هنوز به مدل سوله متصل نشده است. تا زمان کنترل جزئیات اتصال، سازگاری هندسی/محوری و انتقال بار، هیچ شناژی در تحلیل اصلی فعال نیست و وزن بتن نیز به بار مرده اضافه نشده است.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);$("btnApplyTieDefaults").addEventListener("click",()=>{const d={tieWidthM:0.60,tieHeightM:0.50,tieFcMPa:25,tieEGPa:23.5,tieGGPa:9.8,tieDensity:25,tieStirrupDiaMm:10};Object.entries(d).forEach(([id,v])=>$(id).value=v);$("tieStartJoint").value="rigid";$("tieEndJoint").value="rigid";$("tieRouteMessage").textContent="پیش‌فرض‌های پیشنهادی اولیه اعمال شد؛ پیش از تحلیل باید با نقشه و مشخصات واقعی تطبیق داده شوند.";});$("btnRefreshTieNodes").addEventListener("click",sync);$("btnAddTieRoute").addEventListener("click",add);$("btnAuditTieRoutes").addEventListener("click",()=>{const r=audit();$("tieAuditOutput").textContent=JSON.stringify(r,null,2);});sync();render();
}
function getData(){return JSON.parse(JSON.stringify(state));}
function setData(d){if(!d||typeof d!=="object")return;state={schemaVersion:3,material:{...(d.material||{})},reinforcement:{stirrupDiaMm:10,passThroughFootings:true,extendToLastFootingOuterFace:true,standardEndHook:true,...(d.reinforcement||{})},routes:Array.isArray(d.routes)?d.routes.filter(r=>r&&r.start&&r.end).map(r=>({...r,startJoint:r.startJoint||"unknown",endJoint:r.endJoint||"unknown"})):[]};const m=state.material,f={tieWidthM:m.widthM,tieHeightM:m.heightM,tieFcMPa:m.fcMPa,tieEGPa:m.E_GPa,tieGGPa:m.G_GPa,tieDensity:m.densityKNm3,tieLongBarCount:state.reinforcement.longitudinalBarCount,tieLongBarDiaMm:state.reinforcement.longitudinalBarDiaMm,tieStirrupDiaMm:state.reinforcement.stirrupDiaMm,tieStirrupSpacingMm:state.reinforcement.stirrupSpacingMm};Object.entries(f).forEach(([id,v])=>{if($(id)&&v!=null)$(id).value=v;});sync();render();}
window.SteelTieBeamLayout={getData,setData,refresh:sync,audit,rectangleProperties};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();