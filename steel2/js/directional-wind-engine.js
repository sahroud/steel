/* SAHROUD STEEL — Directional Wind Case Register 1.0
 * Manual Cp register by wind direction and building surface.
 * Coefficients are read from ClimateLoadEngine; no code values are invented.
 * Outputs remain preliminary and are NOT transferred to the 3D model.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const directions=[
  {id:"x-positive",label:"باد در راستای +X"},
  {id:"x-negative",label:"باد در راستای −X"},
  {id:"z-positive",label:"باد در راستای +Z"},
  {id:"z-negative",label:"باد در راستای −Z"}
 ];
 const surfaces=[
  {id:"roof-left",label:"شیب چپ بام"},
  {id:"roof-right",label:"شیب راست بام"},
  {id:"long-wall-left",label:"دیوار طولی چپ"},
  {id:"long-wall-right",label:"دیوار طولی راست"},
  {id:"end-wall-front",label:"دیوار انتهایی جلو"},
  {id:"end-wall-back",label:"دیوار انتهایی عقب"}
 ];
 let cpValues={};
 function finite(v){if(v===null||v===undefined||v==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;}
 function getBase(){
  const d=window.SteelClimateLoadEngine?.getData?.();
  if(!d)return {ready:false,reason:"دفتر ضرایب اقلیمی و باد در دسترس نیست."};
  const coeff=d.windCalculation?.coefficients||{};
  const loads=window.SteelLoads?.getData?.()||{};
  const speed=finite(loads.climate?.basicWind);
  const q=speed===null?null:0.000613*Math.pow(speed/3.6,2);
  const keys=["importance","exposure","topography","directionality","internalGust","internalPressure"];
  const v={};keys.forEach(k=>v[k]=finite(coeff[k]));
  const missing=keys.filter(k=>v[k]===null);
  if(q===null)return {ready:false,reason:"سرعت مبنای باد وارد نشده است.",q,coeff:v};
  if(missing.length)return {ready:false,reason:"ضرایب مشترک ناقص‌اند: "+missing.join("، "),q,coeff:v};
  const positive=["importance","exposure","topography","directionality","internalGust"];
  const invalid=positive.filter(k=>!(v[k]>0));
  if(invalid.length)return {ready:false,reason:"این ضرایب باید مثبت و بزرگ‌تر از صفر باشند: "+invalid.join("، "),q,coeff:v};
  const common=v.importance*q*v.exposure*v.topography*v.directionality;
  return {ready:true,q,coeff:v,common,internalFactor:common*v.internalGust};
 }
 function calculate(){
  const base=getBase(),records={},errors=[];
  const span=finite($("span")?.value),length=finite($("length")?.value);
  const eave=finite($("height")?.value),rise=finite($("rise")?.value);
  const totalHeight=eave!==null&&rise!==null?eave+rise:null;
  const geometryReady=[span,length,totalHeight].every(v=>v!==null&&v>0);
  const directionBreadth={"x-positive":span,"x-negative":span,"z-positive":length,"z-negative":length};
  const combinedBasis={};
  directions.forEach(dir=>{const b=directionBreadth[dir.id],ratio=geometryReady?totalHeight/b:null;combinedBasis[dir.id]={height:totalHeight,breadth:b,heightToBreadth:ratio,useCombinedCgCp:geometryReady&&totalHeight<20&&ratio<1};});
  directions.forEach(dir=>{
   records[dir.id]={label:dir.label,surfaces:{}};
   surfaces.forEach(face=>{
    const cp=finite(cpValues[dir.id]?.[face.id]);
    const basis=combinedBasis[dir.id];
    const externalFactor=basis.useCombinedCgCp?base.common:(base.coeff.gust!==null?base.common*base.coeff.gust:null);
    const ext=base.ready&&geometryReady&&externalFactor!==null&&cp!==null?externalFactor*cp:null;
    const im=base.ready?base.internalFactor*Math.abs(base.coeff.internalPressure):null;
    records[dir.id].surfaces[face.id]={
     cp,externalPressure:ext,
     externalCoefficientBasis:basis.useCombinedCgCp?"combined-CgCp":"separate-Cp",
     netWithPositiveInternal:ext===null||im===null?null:ext-im,
     netWithNegativeInternal:ext===null||im===null?null:ext+im,
     unit:"kN/m2",
     status:ext===null?"missing-input":"manual-coefficients-preliminary"
    };
    if(cp===null)errors.push(dir.label+" / "+face.label);
   });
  });
  const entered=Object.values(cpValues).reduce((n,x)=>n+Object.values(x||{}).filter(v=>finite(v)!==null).length,0);
  const requiresSeparateCg=Object.values(combinedBasis).some(x=>!x.useCombinedCgCp);
  const cgReady=!requiresSeparateCg||(base.coeff?.gust!==null&&base.coeff?.gust>0);
  return {schema:"sahroud-steel-directional-wind",version:1,
   formulaExternal:"P = Iw q Ce Ct Cd × CgCp (combined basis) OR × Cg × Cp (separate basis)",
   formulaInternal:"Pi = Iw q Ce Ct Cgi Cpi Cd",
   netConvention:"Pnet = Pexternal - Pinternal",
   directions:records,enteredCpCount:entered,requiredCpCount:24,
   geometry:{span,length,eaveHeight:eave,ridgeRise:rise,totalHeight},externalCoefficientBasis:combinedBasis,
   basicVelocityPressure:base.q??null,pressureUnit:"kN/m2",
   commonCoefficients:base.coeff||{},ready:base.ready&&geometryReady&&cgReady&&entered===24,
   codeDesignEligible:false,
   status:!base.ready?"common-coefficients-incomplete":!geometryReady?"geometry-incomplete":!cgReady?"separate-Cp-mode-requires-positive-Cg":entered===24?"all-directional-coefficients-entered-preliminary":"directional-Cp-incomplete",
   message:!base.ready?base.reason:!geometryReady?"ابعاد هندسی برای تعیین مبنای ضریب خارجی ناقص است.":!cgReady?"در حالت Cp جداگانه، Cg باید مثبت و معتبر وارد شود.":"برای h<20m و h/b<1، ورودی این جهت به‌صورت CgCp ترکیبی تفسیر می‌شود؛ در سایر حالات Cp جداگانه است. همه ضرایب دستی و نیازمند تطبیق آیین‌نامه‌ای‌اند.",
   missingCp:errors};
 }
 function render(){
  if($("directionalWindPanel"))return;
  const panel=document.createElement("section");
  panel.id="directionalWindPanel";panel.className="panel";
  let html='<div class="panel-title"><h3>۷ ـ دفتر باد جهت‌دار</h3><span class="status">چهار جهت مستقل</span></div>';
  html+='<div class="notice">برای هر جهت باد، Cp خارجی هر سطح را جداگانه و با علامت از مرجع معتبر وارد کنید. ضریب فشار داخلی Cpi از دفتر ضرایب قبلی خوانده می‌شود و دو حالت علامت مثبت و منفی جداگانه بررسی می‌شوند.</div>';
  html+='<div class="notice"><b>قرارداد محور مدل:</b> X عرض دهانه، Y قائم و Z امتداد طول سوله است؛ بنابراین جهت‌های افقی این دفتر +X، −X، +Z و −Z هستند.</div>';
  directions.forEach(dir=>{
   html+='<fieldset><legend>'+dir.label+'</legend><div class="table-wrap"><table class="data-table"><thead><tr><th>سطح</th><th>Cp یا CgCp خارجی (علامت‌دار)</th><th>خالص با Cpi مثبت (kN/m²)</th><th>خالص با Cpi منفی (kN/m²)</th></tr></thead><tbody>';
   surfaces.forEach(face=>{
    const id="dirCp_"+dir.id+"_"+face.id;
    html+='<tr><td>'+face.label+'</td><td><input id="'+id+'" type="number" step="0.01" placeholder="Cp / CgCp"></td><td id="'+id+'_plus">—</td><td id="'+id+'_minus">—</td></tr>';
   });
   html+='</tbody></table></div></fieldset>';
  });
  html+='<div class="notice" id="directionalWindStatus" aria-live="polite">در انتظار ورودی ضرایب مشترک و Cp جهت‌دار.</div>';
  html+='<div class="notice"><b>محدودیت:</b> این دفتر هنوز نواحی موضعی لبه و گوشه، ضرایب داخلی وابسته به طبقه‌بندی واقعی پوسته، همزمانی جهت‌ها، سطوح مؤثر، تبدیل فشار به بار خطی/گرهی یا انتقال به تحلیل سه‌بعدی را انجام نمی‌دهد. هیچ خروجی این بخش بار طراحی تأییدشده نیست.</div>';
  panel.innerHTML=html;
  const anchor=$("windBasisPanel")||$("climateLoadCasePanel")||document.querySelector("main");
  if(anchor)anchor.insertAdjacentElement("afterend",panel);
  directions.forEach(dir=>surfaces.forEach(face=>{
   const id="dirCp_"+dir.id+"_"+face.id;
   $(id)?.addEventListener("input",()=>{
    cpValues[dir.id]=cpValues[dir.id]||{};
    cpValues[dir.id][face.id]=$(id).value;
    update();
   });
  }));
  update();
 }
 function update(){
  const r=calculate();
  const basisText=directions.map(dir=>{const b=r.externalCoefficientBasis?.[dir.id];return dir.label+": "+(b?.useCombinedCgCp?"CgCp ترکیبی":"Cp جداگانه")+" (h/b="+(b?.heightToBreadth===null?"—":Number(b?.heightToBreadth).toFixed(3))+")";}).join("؛ ");
  if($("directionalWindStatus"))$("directionalWindStatus").textContent=basisText+" | Cpهای ثبت‌شده: "+r.enteredCpCount+" از ۲۴. "+r.message+" وضعیت: "+r.status+" | مجاز برای طراحی آیین‌نامه‌ای: خیر.";
  directions.forEach(dir=>surfaces.forEach(face=>{
   const cell=r.directions[dir.id].surfaces[face.id];
   const base="dirCp_"+dir.id+"_"+face.id;
   if($(base)&&$(base).value!==String(cpValues[dir.id]?.[face.id]??""))$(base).value=cpValues[dir.id]?.[face.id]??"";
   $(base+"_plus").textContent=cell.netWithPositiveInternal===null?"—":cell.netWithPositiveInternal.toFixed(3);
   $(base+"_minus").textContent=cell.netWithNegativeInternal===null?"—":cell.netWithNegativeInternal.toFixed(3);
  }));

 }
 function getData(){
  directions.forEach(dir=>surfaces.forEach(face=>{
   const id="dirCp_"+dir.id+"_"+face.id,el=$(id);
   if(el){cpValues[dir.id]=cpValues[dir.id]||{};cpValues[dir.id][face.id]=el.value;}
  }));
  return calculate();
 }
 function setData(data){
  if(!data||typeof data!=="object")return;
  cpValues={};
  const ds=data.directions||{};
  directions.forEach(dir=>{
   const saved=ds[dir.id]?.surfaces||{};
   cpValues[dir.id]={};
   surfaces.forEach(face=>{
    const v=saved[face.id]?.cp;
    cpValues[dir.id][face.id]=v===null||v===undefined?"":String(v);
   });
  });
  if(document.readyState!=="loading"&&$("directionalWindPanel")){
   directions.forEach(dir=>surfaces.forEach(face=>{
    const id="dirCp_"+dir.id+"_"+face.id;
    if($(id))$(id).value=cpValues[dir.id][face.id];
   }));
   update();
  }
 }
 document.addEventListener("DOMContentLoaded",()=>{
  render();
  document.addEventListener("input",e=>{
   if(e.target&&(
     e.target.closest("#climateLoadCasePanel")||
     ["span","length","height","rise"].includes(e.target.id)
   ))update();
  });
 });
 window.SteelDirectionalWind={getData,setData,calculate,update};
})();