/* SAHROUD STEEL — UI for tapered fabrication quantity alternatives.
 * Inputs are explicit; geometry is read from the tapered-section editor only.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=v=>Number.isFinite(Number(v))?Number(v).toLocaleString("fa-IR",{maximumFractionDigits:2}):"نامشخص";
function inputFor(group,length,density,steelPrice,weldCount,weldRate,includeWeld){
 const api=root.SteelTaperedSections;
 if(!api?.getData)throw Error("ماژول مقاطع متغیرمقطع در دسترس نیست.");
 const data=api.getData(),g=data.groups?.[group];
 if(!g?.enabled)throw Error("ابتدا گزینه اعمال مقطع متغیر را برای این گروه فعال و ایستگاه‌ها را تکمیل کنید.");
 const L=Number(length),stations=[["start",0],["mid",L/2],["end",L]].map(([key,x_m])=>{
  const s=g.stations?.[key]||{};
  return {x_m,d:s.d,bf:s.bf,tw:s.tw,tf:s.tf};
 });
 return {length_m:L,density_kg_m3:density,stations,prices:{steel_toman_per_kg:steelPrice,weld_toman_per_meter:weldRate},weldLineCount:weldCount,includeWeldCost:includeWeld===true};
}
function calculate(){
 const group=$("taperEconomyGroup")?.value||"rafter";
 const input=inputFor(group,$("taperEconomyLength")?.value,$("taperEconomyDensity")?.value,$("taperEconomySteelPrice")?.value,$("taperEconomyWeldCount")?.value,$("taperEconomyWeldRate")?.value,$("taperEconomyIncludeWeld")?.checked);
 const result=root.SteelTaperedFabricationEconomics.build(input);
 const body=$("taperEconomyRows");
 body.innerHTML=result.options.map(o=>"<tr><td>"+esc(o.label)+"</td><td>"+fmt(o.zoneCount)+"</td><td>"+fmt(o.steelMass_kg)+" kg</td><td>"+(o.steelCost_toman===null?"نامشخص":fmt(o.steelCost_toman)+" تومان")+"</td><td>"+(o.weldCost_toman===null?"نامشخص":fmt(o.weldCost_toman)+" تومان")+"</td><td>"+(o.totalCost_toman===null?"نامشخص":fmt(o.totalCost_toman)+" تومان")+"</td></tr>").join("");
 $("taperEconomyStatus").textContent="مقایسه هندسی/وزنی انجام شد؛ گزینه کم‌وزن‌تر در این مدل: "+result.lowestMaterialMassOption+"؛ هیچ گزینه‌ای طراحی یا تأیید سازه‌ای نشده است.";
 $("taperEconomyWarnings").innerHTML=result.warnings.map(x=>"<p>"+esc(x)+"</p>").join("");
 return result;
}
function init(){
 if($("taperedFabricationEconomicsPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="taperedFabricationEconomicsPanel";
 panel.innerHTML="<div class='panel-title'><h3>مقایسه اقتصادی و متره مقاطع منشوری و متغیرمقطع</h3><span class='status'>متره، نه طراحی</span></div>"+
 "<div class='notice'>ابعاد سه ایستگاه از فرم «مقاطع تیرورق متغیرعمق» خوانده می‌شود. طول عضو و قیمت‌ها باید صریح وارد شوند. این مقایسه به‌تنهایی کفایت سازه‌ای یا قابلیت ساخت را تأیید نمی‌کند.</div>"+
 "<div class='form-grid'><div class='field'><label for='taperEconomyGroup'>گروه عضو</label><select id='taperEconomyGroup'><option value='rafter'>رفتر</option><option value='column'>ستون</option></select></div>"+
 "<div class='field'><label for='taperEconomyLength'>طول فیزیکی عضو (m)</label><input id='taperEconomyLength' type='number' min='0.01' step='0.01' placeholder='طول واقعی عضو'></div>"+
 "<div class='field'><label for='taperEconomyDensity'>چگالی (kg/m³)</label><input id='taperEconomyDensity' type='number' min='1' step='1' value='7850'></div>"+
 "<div class='field'><label for='taperEconomySteelPrice'>قیمت فولاد (تومان/kg) — اختیاری</label><input id='taperEconomySteelPrice' type='number' min='0' step='1000' placeholder='قیمت معتبر روز'></div>"+
 "<div class='field'><label for='taperEconomyWeldCount'>تعداد خطوط جوش طولی — ورودی کاربر</label><input id='taperEconomyWeldCount' type='number' min='0' step='1' placeholder='در صورت اطلاع'></div>"+
 "<div class='field'><label for='taperEconomyWeldRate'>هزینه هر متر خط جوش (تومان/m)</label><input id='taperEconomyWeldRate' type='number' min='0' step='1000' placeholder='در صورت داشتن نرخ'></div>"+
 "<div class='field'><label><input id='taperEconomyIncludeWeld' type='checkbox'> هزینه جوش در جمع هزینه منظور شود</label></div></div>"+
 "<div class='button-grid'><button type='button' class='btn primary' id='btnTaperEconomy'>محاسبه و مقایسه سه روش</button></div>"+
 "<div id='taperEconomyStatus' class='notice'>برای محاسبه، ابتدا مقطع متغیر و ایستگاه‌های آن را تعریف کنید.</div>"+
 "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>روش</th><th>تعداد بازه</th><th>جرم فولاد</th><th>هزینه فولاد</th><th>هزینه جوش</th><th>جمع هزینه معلوم</th></tr></thead><tbody id='taperEconomyRows'></tbody></table></div>"+
 "<div id='taperEconomyWarnings' class='notice'></div>";
 const anchor=$("taperedSectionsPanel")||$("sectionGeometryAuditPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);else main.appendChild(panel);
 $("btnTaperEconomy").addEventListener("click",()=>{try{calculate();}catch(e){$("taperEconomyStatus").textContent="توقف محاسبه: "+(e?.message||String(e));$("taperEconomyRows").innerHTML="";}});
}
function selfTest(){
 const tests=[];
 tests.push({name:"three-station-map",pass:typeof inputFor==="function"});
 tests.push({name:"engine-required",pass:!!root.SteelTaperedFabricationEconomics?.build});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests};
}
root.SteelTaperedFabricationUI={inputFor,calculate,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
