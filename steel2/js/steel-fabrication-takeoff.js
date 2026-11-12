/* SAHROUD STEEL — Steel fabrication and connection takeoff extension
 * Uses entered section areas and member lengths. Connection items are manually inventoried.
 * Bolt mass is shank-only; weld metal is theoretical triangular fillet volume.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),n=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN;};
 const fmt=x=>Number(x).toFixed(3);
 const densityDefault=7850;
 let settings={densityKgM3:densityDefault,cutWastePct:""},items=[];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const names={column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید دیوار",endPost:"ستونک انتهایی",endGirt:"تیر افقی انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
 function addItem(type,data){
  const count=n(data.count),density=n(settings.densityKgM3);
  let volume=null,mass=null,unit="",note="";
  if(type==="plate"){
   const w=n(data.widthMm),h=n(data.heightMm),t=n(data.thicknessMm);
   if(!(count>0&&w>0&&h>0&&t>0))throw Error("تعداد و ابعاد ورق باید مثبت باشند.");
   volume=count*w*h*t*1e-9;mass=volume*density;unit="عدد";
  }else if(type==="bolt"){
   const d=n(data.diameterMm),l=n(data.lengthMm);
   if(!(count>0&&d>0&&l>0))throw Error("تعداد، قطر و طول پیچ باید مثبت باشند.");
   volume=count*Math.PI*d*d/4*l*1e-9;mass=volume*density;unit="عدد";
   note="وزن فقط ساق است؛ سر پیچ، مهره و واشر در این محاسبه نیست.";
  }else if(type==="weld"){
   const l=n(data.lengthM),a=n(data.legMm);
   if(!(l>0&&a>0))throw Error("طول جوش و اندازه ساق باید مثبت باشند.");
   volume=l*(a*a/2)*1e-6;mass=volume*density;unit="m";
   note="حجم نظری جوش گوشه با مقطع مثلثی؛ اضافه‌مصرف، نفوذ و پرت الکترود لحاظ نشده است.";
  }else throw Error("نوع قلم متره ناشناخته است.");
  items.push({id:"FAB-"+Date.now()+"-"+(items.length+1),type,description:String(data.description||"").trim()||({plate:"ورق اتصال",bolt:"پیچ اتصال",weld:"جوش گوشه"}[type]),count:type==="weld"?1:count,unit,dimensions:type==="plate"?{widthMm:n(data.widthMm),heightMm:n(data.heightMm),thicknessMm:n(data.thicknessMm)}:type==="bolt"?{diameterMm:n(data.diameterMm),lengthMm:n(data.lengthMm)}:{lengthM:n(data.lengthM),legMm:n(data.legMm)},volumeM3:volume,massKg:mass,note});
  renderItems();
 }
 function steelMass(model){
  const sectionData=window.SteelSections?.read?.(),groups=sectionData?.analysis3d?.groups||{},density=n(settings.densityKgM3);
  const by={};let total=0,complete=true;
  for(const mem of model.members||[]){
   const key=String(mem.sectionKey||"unassigned"),g=groups[key]||{},area=n(g.A_cm2),len=n(mem.length);
   if(!by[key])by[key]={group:key,label:names[key]||key,count:0,totalLengthM:0,areaCm2:area,massKg:null,missingMembers:0};
   const row=by[key];row.count++;
   if(len>0)row.totalLengthM+=len;else{row.missingMembers++;complete=false;}
  }
  Object.values(by).forEach(row=>{
   if(!(row.areaCm2>0)||!(density>0)||row.missingMembers){row.massKg=null;complete=false;}
   else{row.massKg=row.totalLengthM*row.areaCm2*1e-4*density;total+=row.massKg;}
  });
  const plate=items.filter(x=>x.type==="plate").reduce((s,x)=>s+x.massKg,0);
  const bolts=items.filter(x=>x.type==="bolt").reduce((s,x)=>s+x.massKg,0);
  const weld=items.filter(x=>x.type==="weld").reduce((s,x)=>s+x.massKg,0);
  const waste=n(settings.cutWastePct),wastePct=Number.isFinite(waste)&&waste>=0?waste:0;
  const frameAndPlate=total+plate,procurement=(frameAndPlate*(1+wastePct/100));
  return {densityKgM3:density,cutWastePct:Number.isFinite(waste)&&waste>=0?waste:null,groups:Object.values(by),structuralSteelMassKg:total,connectionPlateMassKg:plate,boltShankMassKg:bolts,theoreticalWeldMetalMassKg:weld,frameAndPlateMassKg:frameAndPlate,cutWasteAllowanceKg:procurement-frameAndPlate,procurementMassExcludingBoltsAndWeldKg:procurement,totalKnownSteelMassIncludingBoltsAndWeldKg:procurement+bolts+weld,complete,items:clone(items),notes:[
  "وزن اعضای اسکلت از سطح مقطع A ثبت‌شده برای هر گروه و طول اعضای مدل هندسی محاسبه شده است؛ در صورت اشتباه یا ناقص بودن مقاطع ورودی، وزن نیز معتبر نخواهد بود.",
  "پرت برش فقط به اسکلت و ورق‌های اتصال اعمال شده است؛ پیچ و فلز جوش جدا گزارش شده‌اند.",
  "وزن پیچ فقط وزن ساق است و وزن سر، مهره و واشر را شامل نمی‌شود.",
  "وزن فلز جوش برآورد نظری مقطع مثلثی جوش گوشه است؛ مصرف واقعی الکترود/سیم جوش و پرت کارگاهی نیست."
 ]};
 }
 function renderItems(){
  const out=$("fabricationItemsList");if(!out)return;
  if(!items.length){out.textContent="هنوز قلم اتصال یا ساخت دستی ثبت نشده است.";return;}
  out.innerHTML=items.map((x,i)=>'<div class="notice" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span>'+String(i+1)+'. '+x.description+' — '+x.count+' '+x.unit+' — '+fmt(x.massKg)+' kg</span><button type="button" class="btn secondary" data-remove-fab="'+i+'">حذف</button></div>').join("");
  out.querySelectorAll("[data-remove-fab]").forEach(b=>b.addEventListener("click",()=>{items.splice(Number(b.dataset.removeFab),1);renderItems();}));
 }
 function render(){
  const panel=$("quantityTakeoffPanel");if(!panel||$("fabricationTakeoffSubpanel"))return;
  const box=document.createElement("div");box.id="fabricationTakeoffSubpanel";
  box.innerHTML='<hr><h4>متره اسکلت فولادی و اتصالات</h4>'+
   '<div class="notice">وزن اعضای مدل از سطح مقطع واقعی ثبت‌شده در گروه‌های مقاطع محاسبه می‌شود. ورق، پیچ و جوش را مطابق نقشه اتصال در فرم‌های زیر ثبت کنید؛ هیچ اتصال فرضی به پروژه اضافه نمی‌شود.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="fabSteelDensity">چگالی فولاد (kg/m³)</label><input id="fabSteelDensity" type="number" min="1" step="1" value="'+settings.densityKgM3+'"></div>'+
   '<div class="field"><label for="fabCutWaste">پرت برش اسکلت و ورق (%) ـ اختیاری</label><input id="fabCutWaste" type="number" min="0" step="0.5" placeholder="خالی = بدون پرت"></div></div>'+
   '<h4>ثبت ورق‌های اتصال</h4><div class="form-grid">'+
   '<div class="field"><label for="fabPlateName">شرح ورق</label><input id="fabPlateName" placeholder="مثلاً ورق گاست"></div>'+
   '<div class="field"><label for="fabPlateCount">تعداد</label><input id="fabPlateCount" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabPlateWidth">عرض (mm)</label><input id="fabPlateWidth" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabPlateHeight">طول (mm)</label><input id="fabPlateHeight" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabPlateThickness">ضخامت (mm)</label><input id="fabPlateThickness" type="number" min="1" step="0.5"></div></div><button type="button" class="btn secondary" id="btnAddFabPlate">افزودن ورق</button>'+
   '<h4>ثبت پیچ‌ها</h4><div class="form-grid">'+
   '<div class="field"><label for="fabBoltName">شرح / رده پیچ</label><input id="fabBoltName" placeholder="مثلاً M20 - 8.8"></div>'+
   '<div class="field"><label for="fabBoltCount">تعداد</label><input id="fabBoltCount" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabBoltDiameter">قطر ساق (mm)</label><input id="fabBoltDiameter" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabBoltLength">طول ساق (mm)</label><input id="fabBoltLength" type="number" min="1" step="1"></div></div><button type="button" class="btn secondary" id="btnAddFabBolt">افزودن پیچ</button>'+
   '<h4>ثبت جوش گوشه</h4><div class="form-grid">'+
   '<div class="field"><label for="fabWeldName">شرح جوش</label><input id="fabWeldName" placeholder="مثلاً جوش ورق گاست به جان"></div>'+
   '<div class="field"><label for="fabWeldLength">طول کل جوش (m)</label><input id="fabWeldLength" type="number" min="0.001" step="0.01"></div>'+
   '<div class="field"><label for="fabWeldLeg">اندازه ساق جوش (mm)</label><input id="fabWeldLeg" type="number" min="1" step="0.5"></div></div><button type="button" class="btn secondary" id="btnAddFabWeld">افزودن جوش</button>'+
   '<div id="fabricationItemsList" class="notice">هنوز قلمی ثبت نشده است.</div>'+
   '<div class="notice" id="fabricationTakeoffResult">پس از ثبت مقاطع و اقلام اتصال، دکمه محاسبه متره اصلی را بزنید تا وزن‌ها در گزارش بیاید.</div>';
  panel.appendChild(box);
  const read=id=>$(id)?.value??"";
  $("fabSteelDensity").addEventListener("change",()=>{settings.densityKgM3=n(read("fabSteelDensity"));});
  $("fabCutWaste").addEventListener("change",()=>{settings.cutWastePct=read("fabCutWaste");});
  $("btnAddFabPlate").addEventListener("click",()=>{try{settings.densityKgM3=n(read("fabSteelDensity"));addItem("plate",{description:read("fabPlateName"),count:read("fabPlateCount"),widthMm:read("fabPlateWidth"),heightMm:read("fabPlateHeight"),thicknessMm:read("fabPlateThickness")});}catch(e){alert(e.message);}});
  $("btnAddFabBolt").addEventListener("click",()=>{try{settings.densityKgM3=n(read("fabSteelDensity"));addItem("bolt",{description:read("fabBoltName"),count:read("fabBoltCount"),diameterMm:read("fabBoltDiameter"),lengthMm:read("fabBoltLength")});}catch(e){alert(e.message);}});
  $("btnAddFabWeld").addEventListener("click",()=>{try{settings.densityKgM3=n(read("fabSteelDensity"));addItem("weld",{description:read("fabWeldName"),lengthM:read("fabWeldLength"),legMm:read("fabWeldLeg")});}catch(e){alert(e.message);}});
  renderItems();
 }
 function getData(){return {settings:clone(settings),items:clone(items)};}
 function setData(data){if(!data||typeof data!=="object")return;if(data.settings)settings={densityKgM3:data.settings.densityKgM3??densityDefault,cutWastePct:data.settings.cutWastePct??""};if(Array.isArray(data.items))items=clone(data.items);if($("fabSteelDensity"))$("fabSteelDensity").value=settings.densityKgM3;if($("fabCutWaste"))$("fabCutWaste").value=settings.cutWastePct;renderItems();}
 const baseCalc=window.SteelQuantityTakeoff?.calculate,baseCsv=window.SteelQuantityTakeoff?.csv;
 if(typeof baseCalc==="function"){
  window.SteelQuantityTakeoff.calculate=function(model){const report=baseCalc(model),mass=steelMass(model);report.steelMassTakeoff=mass;report.steelMemberSchedule=report.steelMemberSchedule.map(row=>{const m=mass.groups.find(x=>x.group===row.group);return {...row,label:m?.label||row.group,areaCm2:m?.areaCm2??null,massKg:m?.massKg??null};});report.connectionFabricationItems=clone(items);report.warnings.push(...mass.notes);if(!mass.complete)report.warnings.push("وزن یک یا چند گروه فولادی محاسبه نشد؛ سطح مقطع A و طول اعضای آن گروه را تکمیل کنید.");return report;};
  if(typeof baseCsv==="function")window.SteelQuantityTakeoff.csv=function(report){let out=baseCsv(report);const rows=[];const q=(a,b,u,v,note="")=>{if(v!==null&&v!==undefined)rows.push([a,b,u,v,note]);};
   (report.steelMassTakeoff?.groups||[]).forEach(g=>{q("فولاد",g.label+" تعداد اعضا","عدد",g.count);q("فولاد",g.label+" طول کل","m",g.totalLengthM);q("فولاد",g.label+" سطح مقطع","cm²",g.areaCm2);q("فولاد",g.label+" وزن","kg",g.massKg,"بر پایه سطح مقطع ورودی");});
   const s=report.steelMassTakeoff||{};q("جمع فولاد","وزن اسکلت فولادی","kg",s.structuralSteelMassKg);q("اتصالات","وزن ورق‌های اتصال","kg",s.connectionPlateMassKg);q("اتصالات","وزن ساق پیچ‌ها","kg",s.boltShankMassKg);q("اتصالات","وزن نظری فلز جوش","kg",s.theoreticalWeldMetalMassKg);q("خرید","پرت برش مجازشده","kg",s.cutWasteAllowanceKg);q("خرید","وزن خرید بدون پیچ و جوش","kg",s.procurementMassExcludingBoltsAndWeldKg);
   (s.items||[]).forEach(x=>q("اقلام اتصال",x.description,x.unit,x.count,"وزن="+fmt(x.massKg)+" kg؛ "+x.note));
   const esc=v=>'"'+String(v??"").replace(/"/g,'""')+'"';return out+"\r\n"+rows.map(r=>r.map(esc).join(",")).join("\r\n");};
  const oldRender=window.SteelQuantityTakeoff;
  window.SteelQuantityTakeoff.getData=getData;window.SteelQuantityTakeoff.setData=setData;
  window.SteelQuantityTakeoff.addItem=addItem;window.SteelQuantityTakeoff.removeAll=()=>{items=[];renderItems();};
 }
 document.addEventListener("DOMContentLoaded",render);
 window.SteelFabricationTakeoff={getData,setData,steelMass,addItem};
})();