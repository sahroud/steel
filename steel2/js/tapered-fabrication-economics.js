/* SAHROUD STEEL — fabrication geometry and material-cost alternatives.
 * Quantity comparison only: it does not select or approve a structurally adequate section.
 */
(function(root){
"use strict";
const D=["d","bf","tw","tf"];
const num=v=>(v===null||v===undefined||String(v).trim()==="")?null:(Number.isFinite(Number(v))?Number(v):null);
function area(s){
 const d=num(s?.d),bf=num(s?.bf),tw=num(s?.tw),tf=num(s?.tf);
 if([d,bf,tw,tf].some(v=>v===null||v<=0)||d<=2*tf||bf<=tw)throw Error("ابعاد I نامعتبر است؛ d>2tf و bf>tw باید برقرار باشد.");
 return 2*bf*tf+(d-2*tf)*tw;
}
function normalize(input){
 const x=input||{},L=num(x.length_m),rho=num(x.density_kg_m3??7850),raw=Array.isArray(x.stations)?x.stations:[];
 if(!(L>0))throw Error("طول عضو باید مثبت و بر حسب متر باشد.");
 if(!(rho>0))throw Error("چگالی فولاد باید مثبت باشد.");
 if(raw.length<2)throw Error("حداقل دو ایستگاه مقطع لازم است.");
 const stations=raw.map((s,i)=>({x_m:num(s.x_m),section:Object.fromEntries(D.map(k=>[k,num(s[k])])),sourceIndex:i})).sort((a,b)=>a.x_m-b.x_m);
 if(stations.some(s=>s.x_m===null||D.some(k=>s.section[k]===null)||s.x_m<0||s.x_m>L))throw Error("مختصات یا ابعاد ایستگاه‌ها ناقص/نامعتبر است.");
 if(Math.abs(stations[0].x_m)>1e-8||Math.abs(stations.at(-1).x_m-L)>1e-6)throw Error("ایستگاه نخست باید صفر و ایستگاه آخر برابر طول عضو باشد.");
 for(let i=0;i<stations.length;i++){area(stations[i].section);if(i&&stations[i].x_m-stations[i-1].x_m<=1e-8)throw Error("مختصات ایستگاه‌ها باید یکتا و افزایشی باشند.");}
 return {length_m:L,density_kg_m3:rho,stations,prices:x.prices||{},weldLineCount:num(x.weldLineCount),includeWeldCost:x.includeWeldCost===true};
}
function interp(a,b,t){const o={};D.forEach(k=>o[k]=a[k]+(b[k]-a[k])*t);return o;}
function sectionMass(section,lengthM,rho){const A=area(section),volume=A*lengthM*1e-3;return {area_mm2:A,volume_m3:volume,mass_kg:volume*rho};}
function build(input){
 const x=normalize(input),s=x.stations,L=x.length_m,rho=x.density_kg_m3;
 let continuousVolumeMm2m=0,stepVolumeMm2m=0,stepZones=[];
 for(let i=0;i<s.length-1;i++){
  const a=s[i],b=s[i+1],dx=b.x_m-a.x_m,mid=interp(a.section,b.section,.5);
  // Simpson integration is exact for the cubic area function of linearly varying dimensions.
  const A0=area(a.section),Am=area(mid),A1=area(b.section);
  continuousVolumeMm2m+=dx*(A0+4*Am+A1)/6;
  stepVolumeMm2m+=dx*Am;
  stepZones.push({from_m:a.x_m,to_m:b.x_m,section:mid,area_mm2:Am});
 }
 const maxStation=s.reduce((best,v)=>area(v.section)>area(best.section)?v:best,s[0]);
 const options=[
  {id:"uniform-max-area",label:"منشوری با سطح مقطع برابر بزرگ‌ترین سطح ایستگاه‌ها",method:"بزرگ‌ترین A ایستگاه در تمام طول عضو",volumeMm2m:area(maxStation.section)*L,constantSection:maxStation.section,zoneCount:1},
  {id:"continuous-taper",label:"متغیرمقطع پیوسته با درون‌یابی خطی ابعاد",method:"انتگرال‌گیری سیمپسون روی سطح مقطع حاصل از درون‌یابی خطی ابعاد",volumeMm2m:continuousVolumeMm2m,zoneCount:s.length-1},
  {id:"stepped-midpoint",label:"چندپله‌ای با مقطع ثابت در هر بازه",method:"مقطع هر بازه از ابعاد میان‌یابی‌شده در وسط همان بازه",volumeMm2m:stepVolumeMm2m,zones:stepZones,zoneCount:stepZones.length}
 ];
 const p=x.prices,steelRate=num(p.steel_toman_per_kg),weldRate=num(p.weld_toman_per_meter);
 const weldLength=x.weldLineCount!==null&&x.weldLineCount>=0?x.weldLineCount*L:null;
 const rows=options.map(o=>{
  const volume=o.volumeMm2m*1e-3,mass=volume*rho;
  const steelCost=steelRate!==null&&steelRate>=0?mass*steelRate:null;
  const weldCost=x.includeWeldCost&&weldLength!==null&&weldRate!==null&&weldRate>=0?weldLength*weldRate:null;
  return {...o,steelVolume_m3:volume,steelMass_kg:mass,steelCost_toman:steelCost,weldLineLength_m:weldLength,weldCost_toman:weldCost,totalCost_toman:steelCost!==null&&(x.includeWeldCost?weldCost!==null:true)?steelCost+(weldCost||0):null};
 });
 const base=rows[0],bestMass=rows.reduce((a,b)=>b.steelMass_kg<a.steelMass_kg?b:a,rows[0]);
 return {success:true,length_m:L,density_kg_m3:rho,stationCount:s.length,maximumAreaStation:{x_m:maxStation.x_m,area_mm2:area(maxStation.section)},options:rows,lowestMaterialMassOption:bestMass.id,priceInputs:{steel_toman_per_kg:steelRate,weld_toman_per_meter:weldRate,weldLineCount:x.weldLineCount,weldLineLength_m:weldLength},warnings:["این مقایسه فقط متره هندسی/وزنی و برآورد هزینه بر پایه قیمت‌های ورودی است؛ هیچ گزینه‌ای از نظر مقاومت، پایداری، خیز، خستگی، اتصال یا آیین‌نامه تأیید نشده است.","گزینه منشوریِ مبنا با بزرگ‌ترین سطح مقطع ایستگاه‌ها فقط یک خط مبنای وزنی است و لزوماً مقطع طراحی ایمن نیست.","گزینه چندپله‌ای از مقطع ثابت در وسط هر بازه استفاده می‌کند؛ جزئیات برش، پرت ورق، وصله، جوش، تلرانس و محدودیت حمل در این نسخه محاسبه نشده‌اند.","قیمت خالی به معنی هزینه نامشخص است و صفر تلقی نمی‌شود."] ,analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const input={length_m:10,density_kg_m3:7850,stations:[{x_m:0,d:600,bf:250,tw:8,tf:14},{x_m:5,d:450,bf:220,tw:8,tf:12},{x_m:10,d:600,bf:250,tw:8,tf:14}],prices:{}};
 const r=build(input),bad=(()=>{try{build({...input,stations:[input.stations[0],{...input.stations[1],d:0},input.stations[2]]});return false;}catch(e){return true;}})();
 const blankPrice=build({...input,prices:{steel_toman_per_kg:"",weld_toman_per_meter:""},weldLineCount:""});
 const checks=[r.options.length===3,r.options[0].steelMass_kg>0,r.options.every(o=>o.steelCost_toman===null&&o.totalCost_toman===null),r.options[1].steelMass_kg>r.options[2].steelMass_kg,bad&&!r.designApproved&&!r.analysisEnabled,blankPrice.priceInputs.steel_toman_per_kg===null&&blankPrice.priceInputs.weldLineCount===null];
 return {passed:checks.filter(Boolean).length,failed:checks.filter(v=>!v).length,checks};
}
root.SteelTaperedFabricationEconomics={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
