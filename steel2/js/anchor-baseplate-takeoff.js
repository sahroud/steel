/* SAHROUD STEEL — anchor bolt and base plate quantity schedule
 * Manual schedule inputs only. This module performs quantity/mass takeoff, not connection or anchor design.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const fields=["boltsPerBase","boltDiameterMm","boltShankLengthMm","basePlatesPerBase","plateWidthMm","plateLengthMm","plateThicknessMm","nutsPerBolt","nutUnitMassKg","washersPerBolt","washerUnitMassKg","steelDensityKgM3"];
 const defaults={boltsPerBase:"",boltDiameterMm:"",boltShankLengthMm:"",basePlatesPerBase:"",plateWidthMm:"",plateLengthMm:"",plateThicknessMm:"",nutsPerBolt:"",nutUnitMassKg:"",washersPerBolt:"",washerUnitMassKg:"",steelDensityKgM3:"7850"};
 let state={...defaults},last=null;
 const ids={boltsPerBase:"abBoltsPerBase",boltDiameterMm:"abBoltDia",boltShankLengthMm:"abBoltLength",basePlatesPerBase:"abPlatesPerBase",plateWidthMm:"abPlateWidth",plateLengthMm:"abPlateLength",plateThicknessMm:"abPlateThickness",nutsPerBolt:"abNutsPerBolt",nutUnitMassKg:"abNutMass",washersPerBolt:"abWashersPerBolt",washerUnitMassKg:"abWasherMass",steelDensityKgM3:"abDensity"};
 const n=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)&&x>=0?x:null;};
 const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
 function baseCount(){const r=window.SteelFoundationTakeoff?.getLast?.();return Array.isArray(r?.rows)?r.rows.length:null;}
 function panel(){
  if($("anchorBaseplatePanel"))return;
  const root=$("foundationTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="anchorBaseplatePanel";
  p.innerHTML='<div class="panel-title"><h3>متره بولت‌های مهاری و صفحه‌ستون</h3><span class="status">متره؛ نه طراحی اتصال</span></div>'+
   '<div class="notice">تعداد پایه‌ها از آخرین استخراج واکنش فونداسیون گرفته می‌شود. تمام مشخصات بولت و صفحه‌ستون باید از نقشه یا جدول اتصال وارد شوند. این بخش فقط تعداد و وزن هندسی را برآورد می‌کند؛ ظرفیت کششی/برشی بولت، طول مهاری، بیرون‌زدگی، فاصله از لبه، شکست مخروطی بتن، جوش صفحه‌ستون، سخت‌کننده‌ها و کنترل صفحه‌ستون را طراحی یا تأیید نمی‌کند.</div>'+
   '<h4>بولت‌های مهاری</h4><div class="form-grid">'+
   '<div class="field"><label for="abBoltsPerBase">تعداد بولت در هر پایه</label><input id="abBoltsPerBase" type="number" min="0" step="1" placeholder="طبق نقشه اتصال"></div>'+
   '<div class="field"><label for="abBoltDia">قطر اسمی ساق بولت (mm)</label><input id="abBoltDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abBoltLength">طول محاسباتی ساق بولت (mm)</label><input id="abBoltLength" type="number" min="0" step="1" placeholder="طول واقعی از جدول بولت"></div>'+
   '<div class="field"><label for="abNutsPerBolt">تعداد مهره برای هر بولت</label><input id="abNutsPerBolt" type="number" min="0" step="1" placeholder="طبق جزئیات"></div>'+
   '<div class="field"><label for="abNutMass">وزن هر مهره (kg)</label><input id="abNutMass" type="number" min="0" step="0.001" placeholder="از کاتالوگ/توزین"></div>'+
   '<div class="field"><label for="abWashersPerBolt">تعداد واشر برای هر بولت</label><input id="abWashersPerBolt" type="number" min="0" step="1" placeholder="طبق جزئیات"></div>'+
   '<div class="field"><label for="abWasherMass">وزن هر واشر (kg)</label><input id="abWasherMass" type="number" min="0" step="0.001" placeholder="از کاتالوگ/توزین"></div></div>'+
   '<h4>صفحه‌ستون‌ها</h4><div class="form-grid">'+
   '<div class="field"><label for="abPlatesPerBase">تعداد صفحه‌ستون در هر پایه</label><input id="abPlatesPerBase" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abPlateWidth">عرض صفحه‌ستون (mm)</label><input id="abPlateWidth" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abPlateLength">طول صفحه‌ستون (mm)</label><input id="abPlateLength" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abPlateThickness">ضخامت صفحه‌ستون (mm)</label><input id="abPlateThickness" type="number" min="0" step="0.5" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="abDensity">چگالی فولاد (kg/m³)</label><input id="abDensity" type="number" min="1" step="1"></div></div>'+
   '<div class="button-grid"><button id="btnAnchorBaseplateCalc" class="btn primary" type="button">محاسبه متره بولت و صفحه‌ستون</button><button id="btnAnchorBaseplateCSV" class="btn secondary" type="button" disabled>دریافت CSV</button></div>'+
   '<div id="anchorBaseplateSummary" class="notice">ابتدا تحلیل سه‌بعدی و استخراج واکنش پایه‌ها را اجرا کنید؛ سپس مشخصات واقعی اتصال را وارد کنید.</div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:700px"><thead><tr><th>قلم</th><th>تعداد کل</th><th>ابعاد/مبنای محاسبه</th><th>وزن کل (kg)</th></tr></thead><tbody id="anchorBaseplateRows"></tbody></table></div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  fields.forEach(k=>{const el=$(ids[k]);el.value=state[k]??"";el.addEventListener("change",()=>{state[k]=el.value;});});
  $("btnAnchorBaseplateCalc").addEventListener("click",calculate);
  $("btnAnchorBaseplateCSV").addEventListener("click",exportCSV);
 }
 function read(){fields.forEach(k=>{const el=$(ids[k]);if(el)state[k]=el.value;});}
 function calculate(){
  read();const bases=baseCount();
  if(!Number.isInteger(bases)||bases<1){$("anchorBaseplateSummary").textContent="تعداد پایه از آخرین استخراج واکنش قابل دریافت نیست؛ ابتدا تحلیل سه‌بعدی و استخراج واکنش فونداسیون را اجرا کنید.";return;}
  const rows=[],warnings=[];
  const b=n(state.boltsPerBase),d=n(state.boltDiameterMm),bl=n(state.boltShankLengthMm),density=n(state.steelDensityKgM3);
  let boltCount=null,boltMass=null,nutCount=null,nutMass=null,washerCount=null,washerMass=null;
  if(b!==null&&Number.isInteger(b)){
   boltCount=bases*b;
   if(boltCount>0&&d>0&&bl>0&&density>0){boltMass=boltCount*Math.PI*Math.pow(d/1000,2)/4*(bl/1000)*density;rows.push({label:"ساق بولت مهاری",count:boltCount,basis:"قطر "+d+" mm × طول "+bl+" mm؛ استوانه توپر نظری",massKg:boltMass});}
   else if(boltCount>0)warnings.push("برای وزن ساق بولت، تعداد، قطر، طول ساق و چگالی معتبر لازم است.");
   const np=n(state.nutsPerBolt),nm=n(state.nutUnitMassKg);
   if(np!==null&&Number.isInteger(np)){nutCount=boltCount*np;if(nutCount>0&&nm>0){nutMass=nutCount*nm;rows.push({label:"مهره‌ها",count:nutCount,basis:"وزن واحد واردشده: "+nm+" kg",massKg:nutMass});}else if(nutCount>0)warnings.push("وزن واحد مهره وارد نشده؛ وزن مهره‌ها محاسبه نشد.");}
   const wp=n(state.washersPerBolt),wm=n(state.washerUnitMassKg);
   if(wp!==null&&Number.isInteger(wp)){washerCount=boltCount*wp;if(washerCount>0&&wm>0){washerMass=washerCount*wm;rows.push({label:"واشرها",count:washerCount,basis:"وزن واحد واردشده: "+wm+" kg",massKg:washerMass});}else if(washerCount>0)warnings.push("وزن واحد واشر وارد نشده؛ وزن واشرها محاسبه نشد.");}
  }else warnings.push("تعداد صحیح بولت در هر پایه وارد نشده است.");
  const pp=n(state.basePlatesPerBase),pw=n(state.plateWidthMm),pl=n(state.plateLengthMm),pt=n(state.plateThicknessMm);
  let plateCount=null,plateMass=null;
  if(pp!==null&&Number.isInteger(pp)){
   plateCount=bases*pp;
   if(plateCount>0&&pw>0&&pl>0&&pt>0&&density>0){plateMass=plateCount*(pw/1000)*(pl/1000)*(pt/1000)*density;rows.push({label:"صفحه‌ستون مستطیلی ساده",count:plateCount,basis:pw+" × "+pl+" × "+pt+" mm؛ بدون سوراخ و کسر حجم",massKg:plateMass});}
   else if(plateCount>0)warnings.push("برای وزن صفحه‌ستون، ابعاد کامل و چگالی معتبر لازم است.");
  }else warnings.push("تعداد صفحه‌ستون در هر پایه وارد نشده است.");
  const total=rows.reduce((s,x)=>s+x.massKg,0),summary=["تعداد پایه‌های مبنا: "+bases,boltCount!==null?"تعداد بولت: "+boltCount:"تعداد بولت نامشخص",plateCount!==null?"تعداد صفحه‌ستون: "+plateCount:"تعداد صفحه‌ستون نامشخص","وزن اقلام محاسبه‌شده: "+fmt(total)+" kg","این وزن فقط شامل ردیف‌های قابل محاسبه در جدول است."];
  if(warnings.length)summary.push("هشدارها: "+warnings.join(" "));
  $("anchorBaseplateSummary").textContent=summary.join(" | ");
  const body=$("anchorBaseplateRows");body.replaceChildren();
  rows.forEach(x=>{const tr=document.createElement("tr");[x.label,fmt(x.count),x.basis,fmt(x.massKg)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  last={baseCount:bases,boltCount,boltShankMassKg:boltMass,nutCount,nutMassKg:nutMass,washerCount,washerMassKg:washerMass,basePlateCount:plateCount,basePlateMassKg:plateMass,totalCalculatedMassKg:total,rows,warnings,limitations:["وزن ساق بولت از استوانه توپر محاسبه شده و رزوه، سر، قلاب، مهره و واشر را شامل نمی‌شود مگر جداگانه ثبت شوند.","صفحه‌ستون به‌صورت ورق مستطیلی بدون سوراخ، پخ، سخت‌کننده، جوش یا کسر حجم محاسبه شده است.","این گزارش متره است و طراحی یا کنترل ظرفیت بولت، صفحه‌ستون، جوش و مهار بتن نیست.","وزن مهره و واشر فقط از وزن واحد واردشده محاسبه می‌شود؛ وزن فرضی استفاده نشده است."]};
  window.SteelCostEstimate?.refreshFromAnchorTakeoff?.(last);
  $("btnAnchorBaseplateCSV").disabled=false;
  return last;
 }
 function exportCSV(){
  if(!last)calculate();if(!last)return;
  const lines=[["گزارش متره بولت و صفحه‌ستون"],["تعداد پایه‌ها",last.baseCount],["قلم","تعداد کل","مبنای هندسی","وزن کل (kg)"],...last.rows.map(x=>[x.label,x.count,x.basis,x.massKg]),["جمع وزن اقلام محاسبه‌شده (kg)",last.totalCalculatedMassKg],...last.warnings.map(x=>["هشدار",x]),...last.limitations.map(x=>["محدودیت",x])];
  const csv="\uFEFF"+lines.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Baseplate-Takeoff.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){read();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;fields.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];const el=$(ids[k]);if(el)el.value=state[k]??"";});}
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelAnchorBaseplateTakeoff={getData,setData,calculate,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
})();