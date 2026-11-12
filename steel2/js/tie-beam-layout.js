/* SAHROUD STEEL - Explicit concrete tie-beam layout and end-joint registry.
 * Geometry and joint assumptions are stored; no solver activation until releases/details are verified.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id),num=v=>Number.isFinite(Number(v))?Number(v):NaN;
let state={schemaVersion:2,material:{},routes:[]};
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
function check(m){for(const[k,n]of Object.entries({widthM:"عرض شناژ",heightM:"ارتفاع شناژ",fcMPa:"مقاومت بتن",E_GPa:"مدول E بتن",G_GPa:"مدول G بتن",densityKNm3:"وزن مخصوص بتن"}))if(!(m[k]>0&&Number.isFinite(m[k])))throw Error("مقدار واقعی "+n+" را وارد کنید.");}
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
 state.material=m;state.routes.push({id:"TB"+(state.routes.length+1),start,end,startJoint,endJoint,...m});render();save();
 $("tieRouteMessage").textContent="مسیر ثبت شد؛ طول "+fmt(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z))+" متر. نوع اتصال‌ها فقط به‌عنوان داده ورودی ذخیره شده‌اند و هنوز در تحلیل اعمال نمی‌شوند.";
 }catch(e){$("tieRouteMessage").textContent=e.message;}
}
function mount(){
 if($("tieBeamLayoutPanel"))return;const anchor=$("foundationTakeoffPanel")||$("shedLayoutPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="tieBeamLayoutPanel";
 p.innerHTML='<div class="panel-title"><h3>تعریف مسیر و مشخصات شناژهای بتنی</h3><span class="status">ورودی هندسی مستقل</span></div><div class="notice">مسیر هر شناژ را بین دو گره پایه واقعی انتخاب کنید. نوع اتصال هر انتها را از روی نقشه/جزئیات اجرایی تعیین کنید؛ گزینه نامشخص مانع فعال‌شدن تحلیل شناژ خواهد بود.</div><div class="form-grid">'+
 [['tieWidthM','عرض مقطع شناژ (m)'],['tieHeightM','ارتفاع مقطع شناژ (m)'],['tieFcMPa',"مقاومت مشخصه بتن f\'c (MPa)"],['tieEGPa','مدول الاستیسیته E بتن (GPa)'],['tieGGPa','مدول برشی G بتن (GPa)'],['tieDensity','وزن مخصوص بتن (kN/m³)']].map(([id,l])=>'<div class="field"><label for="'+id+'">'+l+'</label><input id="'+id+'" type="number" min="0.01" step="0.1" placeholder="مقدار مستند از نقشه/مشخصات"></div>').join("")+
 '</div><div class="button-grid"><button type="button" class="btn secondary" id="btnRefreshTieNodes">به‌روزرسانی گره‌های پایه</button></div><div id="tieNodeCount" class="geometry-hint"></div><div class="form-grid"><div class="field"><label for="tieRouteStart">گره شروع شناژ</label><select id="tieRouteStart"></select></div><div class="field"><label for="tieRouteEnd">گره پایان شناژ</label><select id="tieRouteEnd"></select></div><div class="field"><label for="tieStartJoint">نوع اتصال ابتدای شناژ</label><select id="tieStartJoint"><option value="unknown">نامشخص ـ نیازمند نقشه</option><option value="rigid">یکپارچه/گیردار</option><option value="pinned">مفصلی</option></select></div><div class="field"><label for="tieEndJoint">نوع اتصال انتهای شناژ</label><select id="tieEndJoint"><option value="unknown">نامشخص ـ نیازمند نقشه</option><option value="rigid">یکپارچه/گیردار</option><option value="pinned">مفصلی</option></select></div></div><div class="button-grid"><button type="button" class="btn primary" id="btnAddTieRoute">ثبت مسیر شناژ</button></div><div id="tieRouteMessage" class="notice">مشخصات واقعی مقطع و اتصال‌ها را وارد کنید.</div><div id="tieRoutesTable"></div><div id="tieRouteSummary" class="notice"></div><div class="notice">این مرحله هنوز عضو بتنی را به ماتریس سختی اضافه نمی‌کند. حتی انتخاب «گیردار» یا «مفصلی» صرفاً ثبت داده است؛ تا زمانی که آزادسازی انتهایی و انتقال نیرو در حل‌گر به‌درستی پیاده‌سازی و آزمایش نشده باشد، تحلیل شناژ فعال نمی‌شود. وزن بتن نیز هنوز به بار مرده افزوده نشده است.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);$("btnRefreshTieNodes").addEventListener("click",sync);$("btnAddTieRoute").addEventListener("click",add);sync();render();
}
function getData(){return JSON.parse(JSON.stringify(state));}
function setData(d){if(!d||typeof d!=="object")return;state={schemaVersion:2,material:{...(d.material||{})},routes:Array.isArray(d.routes)?d.routes.filter(r=>r&&r.start&&r.end).map(r=>({...r,startJoint:r.startJoint||"unknown",endJoint:r.endJoint||"unknown"})):[]};const m=state.material,f={tieWidthM:m.widthM,tieHeightM:m.heightM,tieFcMPa:m.fcMPa,tieEGPa:m.E_GPa,tieGGPa:m.G_GPa,tieDensity:m.densityKNm3};Object.entries(f).forEach(([id,v])=>{if($(id)&&v!=null)$(id).value=v;});sync();render();}
window.SteelTieBeamLayout={getData,setData,refresh:sync};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();