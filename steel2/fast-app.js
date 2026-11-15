/* SAHROUD STEEL — lightweight project intake and complete schematic geometry
   Geometry visualization only; no structural analysis or member design. */
(function(){
"use strict";
const $=id=>document.getElementById(id),KEY="sahroudSteel.fastProject.v1";
const defaults={projectName:"سوله ۱۲×۳۶ متر ـ شهرک صنعتی شاهرود",city:"shahroud",cityName:"شاهرود ـ سمنان",owner:"شرکت شهرک‌های صنعتی",designer:"مهندس احمد نوری",span:12,length:36,spacing:6,height:6,girtCount:4,endPostSpacing:4,purlinSpacing:1.5,mainFrameSection:"تعیین نشده",eaveBeamSection:"تعیین نشده",ridgeBeamSection:"تعیین نشده",purlinSection:"تعیین نشده",girtSection:"تعیین نشده",endPostSection:"تعیین نشده",bracingSection:"تعیین نشده",slopePercent:20,rise:1.2,roof:"gable",steel:"ST37",crane:"no",craneCapacity:0,longitudinalBracingBays:[],climate:{groundSnow:null,basicWind:null,elevation:null,snowRegion:null,source:"هنوز داده عددی مستند و کنترل‌شده برای این محل در بانک ثبت نشده است.",verified:false,status:"داده‌های اقلیمی شاهرود در انتظار استخراج و تطبیق با جداول رسمی"}};
let selectedBraceBays=[];
function read(){return {projectName:$("projectName").value.trim(),city:$("city").value,cityName:$("city").selectedOptions[0]?.textContent||$("city").value,owner:$("owner").value.trim(),designer:$("designer").value.trim(),climate:{groundSnow:readClimateNumber("climateGroundSnow"),basicWind:readClimateNumber("climateBasicWind"),elevation:readClimateNumber("climateElevation"),snowRegion:readClimateNumber("climateSnowRegion"),source:$("climateSource").value.trim(),verified:false,status:$("climateStatus").textContent},span:Number($("span").value),length:Number($("length").value),spacing:Number($("spacing").value),height:Number($("height").value),girtCount:Number($("girtCount").value),endPostSpacing:Number($("endPostSpacing").value),purlinSpacing:Number($("purlinSpacing").value),mainFrameSection:$("mainFrameSection").value.trim(),eaveBeamSection:$("eaveBeamSection").value.trim(),ridgeBeamSection:$("ridgeBeamSection").value.trim(),purlinSection:$("purlinSection").value.trim(),girtSection:$("girtSection").value.trim(),endPostSection:$("endPostSection").value.trim(),bracingSection:$("bracingSection").value.trim(),slopePercent:Number($("slopePercent").value),rise:Number($("rise").value),roof:$("roof").value,steel:$("steel").value,crane:$("crane").value,craneCapacity:Number($("craneCapacity").value)||0,longitudinalBracingBays:selectedBraceBays.slice()};}
const cityNames=[["shahroud","شاهرود"],["semnan","سمنان"],["tehran","تهران"],["mashhad","مشهد"],["tabriz","تبریز"],["isfahan","اصفهان"],["yazd","یزد"],["rasht","رشت"],["sari","ساری"],["kerman","کرمان"],["arak","اراک"],["ardabil","اردبیل"],["urmia","ارومیه"],["ahvaz","اهواز"],["bandar-abbas","بندرعباس"],["bushehr","بوشهر"],["birjand","بیرجند"],["bojnord","بجنورد"],["hamedan","همدان"],["sanandaj","سنندج"],["kermanshah","کرمانشاه"],["ilam","ایلام"],["khorramabad","خرم‌آباد"],["qazvin","قزوین"],["zanjan","زنجان"],["gorgan","گرگان"],["yasuj","یاسوج"],["shiraz","شیراز"],["zahedan","زاهدان"],["zabol","زابل"],["qom","قم"],["kish","کیش"],["abadan","آبادان"],["dezful","دزفول"],["sabzevar","سبزوار"],["neyshabur","نیشابور"],["damghan","دامغان"],["garmsar","گرمسار"],["torbat-heydariyeh","تربت حیدریه"],["chabahar","چابهار"],["bandar-anzali","بندر انزلی"],["amol","آمل"],["babol","بابل"]];
const cityClimate={};
function readClimateNumber(id){const v=$(id).value.trim();if(v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function updateClimateStatus(){const c=cityClimate[$("city").value];const vals=[["برف مبنا",$("climateGroundSnow").value,"kN/m²"],["سرعت باد",$("climateBasicWind").value,"km/h"],["ارتفاع",$("climateElevation").value,"m"],["منطقه برف",$("climateSnowRegion").value,""]];const filled=vals.filter(x=>x[1]!=="");const missing=vals.filter(x=>x[1]==="");$("climateStatus").textContent=filled.length?("اطلاعات واردشده: "+filled.map(x=>x[0]+" "+x[1]+" "+x[2]).join("؛ ")+". "+(missing.length?"موارد خالی: "+missing.map(x=>x[0]).join("، ")+". ":"")+(c?.status||"داده‌ها نیازمند کنترل منبع رسمی هستند.")+" این مقادیر هنوز به بارهای تحلیل سازه‌ای تبدیل یا اعمال نشده‌اند."):"برای این شهر داده عددی در بانک داخلی موجود نیست؛ فیلدهای شهر قبلی پاک شده‌اند و هیچ مقدار حدسی اعمال نمی‌شود. بارگذاری دستی فقط با ثبت منبع معتبر مجاز است.";}
function selectClimateCity(){const c=cityClimate[$("city").value]||{};$("climateGroundSnow").value=c.groundSnow??"";$("climateBasicWind").value=c.basicWind??"";$("climateElevation").value=c.elevation??"";$("climateSnowRegion").value=c.snowRegion??"";$("climateSource").value=c.source||"";updateClimateStatus();persistClimate();}
function persistClimate(){try{const d=read();localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
function calculatedRise(span,slopePercent,roof){const run=roof==="gable"?span/2:span;return run*slopePercent/100;}
function updateRise(){const span=Number($("span").value),slope=Number($("slopePercent").value),roof=$("roof").value;if(Number.isFinite(span)&&span>0&&Number.isFinite(slope)&&slope>0){$("rise").value=calculatedRise(span,slope,roof).toFixed(3);}}
function write(d){selectedBraceBays=Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays.map(Number).filter(i=>Number.isInteger(i)&&i>=0):[];Object.keys(defaults).forEach(k=>{const el=$(k);if(el&&d[k]!==undefined)el.value=d[k];});const climate=Object.assign({},defaults.climate,d.climate||{});$("climateGroundSnow").value=climate.groundSnow??"";$("climateBasicWind").value=climate.basicWind??"";$("climateElevation").value=climate.elevation??"";$("climateSnowRegion").value=climate.snowRegion??"";$("climateSource").value=climate.source||"";updateClimateStatus();if(!$("slopePercent").value)$("slopePercent").value=20;updateRise();$("craneCapacity").disabled=$("crane").value==="no";}
function status(msg,error){const el=$("status");el.textContent=msg;el.classList.toggle("error",!!error);}
function valid(d){if(!d.projectName||!d.city)return "نام پروژه و شهر را وارد کنید.";for(const [k,n] of [["span","دهانه"],["length","طول"],["spacing","فاصله قاب‌ها"],["height","ارتفاع ستون"],["girtCount","تعداد قیدهای افقی"],["endPostSpacing","فاصله ستونک‌های انتهایی"],["purlinSpacing","حداکثر فاصله پرلین‌ها"],["rise","ارتفاع تاج / اختلاف ارتفاع سقف"]])if(!Number.isFinite(d[k])||d[k]<=0)return "مقدار "+n+" باید بزرگ‌تر از صفر باشد.";if(!Number.isFinite(d.slopePercent)||d.slopePercent<=0||d.slopePercent>100)return "شیب سقف باید بین صفر و ۱۰۰ درصد باشد.";if(d.spacing>d.length)return "فاصله قاب‌ها نمی‌تواند از طول سوله بیشتر باشد.";if(!Number.isInteger(d.girtCount)||d.girtCount<0||d.girtCount>20||d.endPostSpacing>d.span||d.purlinSpacing<=0||d.purlinSpacing>4)return "فاصله قیدها یا ستونک‌های انتهایی را بررسی کنید.";if(d.rise>=d.height*2)return "ارتفاع تاج یا اختلاف ارتفاع سقف را بررسی کنید.";if(d.crane==="yes"&&d.craneCapacity<=0)return "ظرفیت جرثقیل را وارد کنید.";return "";}
function roofZ(d,y){return d.roof==="gable"?d.height+d.rise*(1-Math.abs(y-d.span/2)/(d.span/2)):d.height+d.rise*y/d.span;}
function frameSVG(d){const W=640,H=340,m=62,base=276,scale=Math.min((W-2*m)/d.span,(base-52)/(d.height+d.rise)),x0=(W-d.span*scale)/2,x1=x0+d.span*scale,z0=base-d.height*scale,z1=base-(d.height+d.rise)*scale;let roof;
if(d.roof==="gable"){const xm=(x0+x1)/2;roof="M "+x0+" "+z0+" L "+xm+" "+z1+" L "+x1+" "+z0;}
else roof="M "+x0+" "+z0+" L "+x1+" "+z1;
const leftLabel=d.roof==="single"?d.height+" m":d.height+" m",rightLabel=d.roof==="single"?(d.height+d.rise).toFixed(2)+" m":d.height+" m";
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای دوبعدی قاب عرضی سوله"><path d="M35 '+base+' H605" stroke="#8799a2" stroke-width="2"/><path d="M '+x0+' '+base+' V '+z0+' '+roof.slice(roof.indexOf("L"))+' V '+base+'" fill="none" stroke="#176b87" stroke-width="5" stroke-linejoin="round"/><path d="M '+(x0-12)+' '+(base+1)+' h24 M '+(x1-12)+' '+(base+1)+' h24" stroke="#20313d" stroke-width="4"/><path d="M '+x0+' '+(base+22)+' H '+x1+'" stroke="#738b98" stroke-width="1"/><text x="'+((x0+x1)/2)+'" y="'+(base+43)+'" text-anchor="middle" font-size="14" fill="#20313d">'+d.span+' m</text><text x="'+(x0-15)+'" y="'+((base+z0)/2)+'" text-anchor="end" font-size="12" fill="#20313d">'+leftLabel+'</text><text x="'+(x1+15)+'" y="'+((base+z1)/2)+'" text-anchor="start" font-size="12" fill="#20313d">'+rightLabel+'</text><text x="'+((x0+x1)/2)+'" y="'+(Math.min(z0,z1)-13)+'" text-anchor="middle" font-size="12" fill="#176b87">'+(d.roof==="gable"?"تاج "+(d.height+d.rise).toFixed(2)+" m":"اختلاف ارتفاع "+d.rise+" m")+'</text></svg>';}
function modelSVG(d){
const W=780,H=440,base=345,sc=Math.min(22,Math.min(420/d.length,300/d.span));
const iso=(x,y,z)=>[118+(x-y)*sc*.72,base-(x+y)*sc*.30-z*sc*.78];
const line=(a,b,color,w,dash)=>{const p=iso(a[0],a[1],a[2]),q=iso(b[0],b[1],b[2]);return '<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(color||"#176b87")+'" stroke-width="'+(w||2)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linecap="round"/>';};
let out="",xs=frameStations(d);
const zSide0=roofZ(d,0),zSide1=roofZ(d,d.span);
for(const x of xs){
out+=line([x,0,0],[x,0,zSide0],"#176b87",3)+line([x,d.span,0],[x,d.span,zSide1],"#176b87",3);
if(d.roof==="gable"){out+=line([x,0,zSide0],[x,d.span/2,d.height+d.rise],"#176b87",3)+line([x,d.span/2,d.height+d.rise],[x,d.span,zSide1],"#176b87",3);}
else out+=line([x,0,zSide0],[x,d.span,zSide1],"#176b87",3);
}
// Longitudinal eave and ridge beams
for(const y of [0,d.span])out+=line([0,y,roofZ(d,y)],[d.length,y,roofZ(d,y)],"#16845b",2.5);
if(d.roof==="gable")for(const off of [-0.4,0.4]){const y=d.span/2+off;out+=line([0,y,roofZ(d,y)],[d.length,y,roofZ(d,y)],"#16845b",2.5);}
// Roof purlins, shown as longitudinal lines at regular transverse positions
const purlinCount=Math.max(2,Math.ceil(d.span/d.purlinSpacing));
for(let i=1;i<purlinCount;i++){const y=d.span*i/purlinCount;out+=line([0,y,roofZ(d,y)],[d.length,y,roofZ(d,y)],"#b07825",1.35);}
// Side-wall girts at nominal 1.5 m vertical spacing, following the wall top
for(let j=0;j<d.girtCount;j++){const z=d.height*(d.girtCount-j)/(d.girtCount+1);out+=line([0,0,z],[d.length,0,z],"#6c8491",1.25)+line([0,d.span,z],[d.length,d.span,z],"#6c8491",1.25); }
const postBays3d=Math.max(1,Math.ceil(d.span/d.endPostSpacing)),postActual3d=d.span/postBays3d;
for(const x of [0,d.length])for(let k=1;k<postBays3d;k++){const y=k*postActual3d;out+=line([x,y,0],[x,y,roofZ(d,y)],"#7b5b9a",1.8);}
// بادبند ضربدری فقط در دو قاب انتهایی، در دو فاصله کناری بین ستون اصلی و اولین ستونک.
const endPostBays3d=Math.max(1,Math.ceil(d.span/d.endPostSpacing)),endPostGap3d=d.span/endPostBays3d;
for(const x of [0,d.length])for(const side of [{a:0,b:endPostGap3d},{a:d.span-endPostGap3d,b:d.span}]){const color="#c52f27",za=roofZ(d,side.a),zb=roofZ(d,side.b);out+=line([x,side.a,0],[x,side.b,zb],color,3.2)+line([x,side.a,za],[x,side.b,0],color,3.2);}
// Roof-plane bracing in default end bays plus selected longitudinal bays.
const roofBraceBays=[...new Set([0,xs.length-2,...(Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays:[])])].filter(i=>i>=0&&i<xs.length-1);
if(xs.length>1){for(const bi of roofBraceBays){const xa=xs[bi],xb=xs[bi+1];if(d.roof==="gable"){out+=line([xa,0,roofZ(d,0)],[xb,d.span/2,d.height+d.rise],"#b34c42",1.5)+line([xa,d.span/2,d.height+d.rise],[xb,d.span,roofZ(d,d.span)],"#b34c42",1.5);}else{out+=line([xa,0,roofZ(d,0)],[xb,d.span,roofZ(d,d.span)],"#b34c42",1.5)+line([xa,d.span,roofZ(d,d.span)],[xb,0,roofZ(d,0)],"#b34c42",1.5);}}}
// Selected vertical X bracing on both longitudinal side walls.
for(const bi of (Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays:[])){if(bi<0||bi>=xs.length-1)continue;const xa=xs[bi],xb=xs[bi+1];for(const y of [0,d.span]){const z=roofZ(d,y);out+=line([xa,y,0],[xb,y,z],"#c52f27",2.8)+line([xa,y,z],[xb,y,0],"#c52f27",2.8);}}
 // Base perimeter
const p1=iso(0,0,0),p2=iso(d.length,0,0),p3=iso(d.length,d.span,0),p4=iso(0,d.span,0);
out+='<path d="M'+p1[0]+' '+p1[1]+' L'+p2[0]+' '+p2[1]+' L'+p3[0]+' '+p3[1]+' L'+p4[0]+' '+p4[1]+' Z" fill="none" stroke="#8a9ba4" stroke-dasharray="4 4"/><text x="755" y="24" text-anchor="end" fill="#657984" font-size="12">شماتیک هندسه؛ بادبند ضربدری فقط در دو دهانه کناری قاب ابتدایی و انتهایی است؛ اعضا هنوز طراحی نشده‌اند</text>';
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای سه‌بعدی هندسه سوله با بادبند قاب‌های انتهایی">'+out+'</svg>';
}

function frameStations(d){const bays=Math.max(1,Math.ceil(d.length/d.spacing));const actual=d.length/bays;return Array.from({length:bays+1},(_,i)=>Number((i*actual).toFixed(3)));}
function renderBracingMenu(d){
 const host=$("longitudinalBracingMenu");if(!host)return;const bays=frameStations(d).length-1;const selected=Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays.map(Number):[];
 host.innerHTML=Array.from({length:bays},(_,i)=>'<label class="brace-choice"><input class="brace-bay" type="checkbox" value="'+i+'" '+(selected.includes(i)?"checked":"")+'><span>دهانه '+(i+1)+'</span></label>').join("");
 host.querySelectorAll(".brace-bay").forEach(el=>el.addEventListener("change",()=>{const current=read();current.longitudinalBracingBays=Array.from(host.querySelectorAll(".brace-bay:checked")).map(x=>Number(x.value));selectedBraceBays=current.longitudinalBracingBays.slice();try{localStorage.setItem(KEY,JSON.stringify(current));}catch(e){}draw(current);status("بادبند دیواری و سقفی دهانه‌های انتخابی به‌روزرسانی شد؛ تحلیل سازه‌ای هنوز فعال نیست.");}));
}
function longitudinalSVG(d){
 const xs=frameStations(d),W=760,H=300,L=65,R=25,base=220,scale=Math.min((W-L-R)/d.length,145/Math.max(d.height+d.rise,1)),y0=base-d.height*scale;
 let s='<path d="M'+L+' '+base+' H'+(W-R)+'" stroke="#8799a2" stroke-width="2"/>';
 xs.forEach((x,i)=>{const px=L+x*scale;s+='<path d="M'+px+' '+base+' V'+y0+'" stroke="#176b87" stroke-width="2.5"/><text x="'+px+'" y="'+(base+27)+'" text-anchor="middle" font-size="10" fill="#20313d">'+(i+1)+'</text>';});
 const selected=Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays:[];
 for(const bi of selected){if(bi<0||bi>=xs.length-1)continue;const xa=L+xs[bi]*scale,xb=L+xs[bi+1]*scale;s+='<path d="M'+xa+' '+base+' L'+xb+' '+y0+' M'+xa+' '+y0+' L'+xb+' '+base+'" stroke="#c52f27" stroke-width="3" fill="none"/>';}
 s+='<path d="M'+L+' '+y0+' H'+(W-R)+'" stroke="#16845b" stroke-width="3"/><path d="M'+L+' '+(base+48)+' H'+(W-R)+' M'+L+' '+(base+42)+' v12 M'+(W-R)+' '+(base+42)+' v12" stroke="#526b78" fill="none"/><text x="'+(W/2)+'" y="'+(base+68)+'" text-anchor="middle" font-size="12" fill="#20313d">طول کل '+d.length+' متر · '+(xs.length-1)+' دهانه مساوی</text><text x="'+L+'" y="'+(y0-10)+'" font-size="11" fill="#176b87">ارتفاع لبه '+d.height+' m</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای طولی با موقعیت قاب‌ها">'+s+'</svg>';
}
function planSVG(d){
 const xs=frameStations(d),W=760,H=320,L=65,T=45,R=25,B=245,sc=Math.min((W-L-R)/d.length,(B-T)/d.span),x1=L+d.length*sc,y1=T+d.span*sc;
 let s='<rect x="'+L+'" y="'+T+'" width="'+(x1-L)+'" height="'+(y1-T)+'" fill="#f8fbfc" stroke="#526b78" stroke-width="2"/>';
 xs.forEach((x,i)=>{const px=L+x*sc;s+='<line x1="'+px+'" y1="'+T+'" x2="'+px+'" y2="'+y1+'" stroke="#176b87" stroke-width="2"/><text x="'+px+'" y="'+(T-12)+'" text-anchor="middle" font-size="10" fill="#176b87">'+(i+1)+'</text>';});
 const pc=Math.max(2,Math.ceil(d.span/d.purlinSpacing));for(let i=1;i<pc;i++){const py=T+d.span*i/pc*sc;s+='<line x1="'+L+'" y1="'+py+'" x2="'+x1+'" y2="'+py+'" stroke="#b07825" stroke-width="1"/>';}
 const roofBays=[...new Set([0,xs.length-2,...(Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays:[])])].filter(i=>i>=0&&i<xs.length-1);if(xs.length>1){for(const bi of roofBays){const xa=L+xs[bi]*sc,xb=L+xs[bi+1]*sc;s+='<path d="M'+xa+' '+T+' L'+xb+' '+y1+' M'+xa+' '+y1+' L'+xb+' '+T+'" stroke="#b34c42" stroke-width="2" fill="none"/>';}}
 s+='<text x="'+((L+x1)/2)+'" y="'+(y1+27)+'" text-anchor="middle" font-size="12" fill="#20313d">طول '+d.length+' m</text><text x="'+(x1+8)+'" y="'+((T+y1)/2)+'" font-size="11" fill="#20313d">'+d.span+' m</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="پلان سقف و محل قاب‌ها">'+s+'</svg>';
}
function endSVG(d){
 const W=640,H=340,m=62,base=276,sc=Math.min((W-2*m)/d.span,(base-52)/(d.height+d.rise)),x0=(W-d.span*sc)/2;
 const bays=Math.max(1,Math.ceil(d.span/d.endPostSpacing)),actual=d.span/bays;
 const xs=Array.from({length:bays+1},(_,i)=>x0+i*actual*sc);
 const zAt=y=>base-roofZ(d,y)*sc;
 let s='<path d="M35 '+base+' H605" stroke="#8799a2" stroke-width="2"/>';
 // ستون‌های اصلی و ستونک‌های باربر همگی از کف تا گره واقعی قاب رسم می‌شوند.
 for(let i=0;i<=bays;i++){
   const y=i*actual,x=xs[i],zt=zAt(y);
   s+='<path d="M'+x+' '+base+' L'+x+' '+zt+'" stroke="'+(i===0||i===bays?'#176b87':'#7b5b9a')+'" stroke-width="'+(i===0||i===bays?4:3)+'" fill="none"/>';
 }
 // تیر سقف قاب، پیوسته و متصل به سر تمام ستون‌ها
 if(d.roof==="gable"){
   const xm=(x0+x0+d.span*sc)/2,zm=zAt(d.span/2);
   s+='<path d="M'+x0+' '+zAt(0)+' L'+xm+' '+zm+' L'+(x0+d.span*sc)+' '+zAt(d.span)+'" stroke="#176b87" stroke-width="4" fill="none"/>';
 }else{
   s+='<path d="M'+x0+' '+zAt(0)+' L'+(x0+d.span*sc)+' '+zAt(d.span)+'" stroke="#176b87" stroke-width="4" fill="none"/>';
 }
 // بادبند ضربدری در دهانه کناری چپ و راست قاب انتهایی؛ از ستون اصلی تا اولین ستونک.
 const bracePairs=[[0,1],[bays-1,bays]];
 for(const pair of bracePairs){
   const i=pair[0],j=pair[1],xa=xs[i],xb=xs[j],za=zAt(i*actual),zb=zAt(j*actual);
   s+='<path d="M'+xa+' '+base+' L'+xb+' '+zb+' M'+xa+' '+za+' L'+xb+' '+base+'" stroke="#c52f27" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
   for(const p of [[xa,base],[xb,zb],[xa,za],[xb,base]])s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#c52f27" stroke="#fff" stroke-width="1"/>';
 }
 s+='<text x="'+(W/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="#20313d">'+(bays-1)+' ستونک میانی · بادبند ضربدری فقط در دهانه اول و آخر قاب انتهایی</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای انتهایی قاب با ستونک‌های باربر و مهاربندهای متصل به گره‌ها">'+s+'</svg>';
}


function girtElevationSVG(d){
 const W=760,H=300,L=65,R=25,base=220,sc=Math.min((W-L-R)/d.length,145/d.height),top=base-d.height*sc;
 const count=d.girtCount,actual=d.height/(count+1);
 let s='<path d="M'+L+' '+base+' H'+(W-R)+'" stroke="#8799a2" stroke-width="2"/>';
 frameStations(d).forEach((x,i)=>{const px=L+x*sc;s+='<path d="M'+px+' '+base+' V'+top+'" stroke="#176b87" stroke-width="2.5"/><text x="'+px+'" y="'+(base+17)+'" text-anchor="middle" font-size="9" fill="#20313d">'+(i+1)+'</text>';});
 for(let i=0;i<count;i++){const yy=top+(i+1)*actual*sc;s+='<path d="M'+L+' '+yy+' H'+(W-R)+'" stroke="#6c8491" stroke-width="2"/>';}
 // در دیوارهای طولی بادبند نداریم؛ بادبندها فقط در قاب‌های ابتدایی و انتهایی هستند.
 s+='<text x="'+(W/2)+'" y="18" text-anchor="middle" font-size="12" fill="#20313d">'+count+' ردیف قید افقی در هر دیوار طولی · فاصله مساوی قائم '+actual.toFixed(3)+' متر · ردیف اول در بالای ستون</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای طولی با قیدهای افقی">'+s+'</svg>';
}
function endPostsSVG(d){
 const W=640,H=340,m=62,base=276,sc=Math.min((W-2*m)/d.span,(base-52)/(d.height+d.rise)),x0=(W-d.span*sc)/2;
 const bays=Math.max(1,Math.ceil(d.span/d.endPostSpacing)),actual=d.span/bays;
 let s='';
 for(let i=1;i<bays;i++){const y=i*actual,x=x0+y*sc,z=roofZ(d,y);s+='<path d="M'+x+' '+base+' V'+(base-z*sc)+'" stroke="#7b5b9a" stroke-width="3"/>';}
 // بادبند ضربدری فقط در دو دهانه کناری هر قاب انتهایی: ستون اصلی تا ستونک اول.
 const yLeft=x0,yLeftPost=x0+actual*sc,yRightPost=x0+(d.span-actual)*sc,yRight=x0+d.span*sc;
 const roofScreen=y=>base-roofZ(d,(y-x0)/sc)*sc;
 for(const pair of [[yLeft,yLeftPost],[yRightPost,yRight]]){const xa=pair[0],xb=pair[1],za=roofScreen(xa),zb=roofScreen(xb);s+='<path d="M'+xa+' '+base+' L'+xb+' '+zb+' M'+xa+' '+za+' L'+xb+' '+base+'" stroke="#c52f27" stroke-width="3.2" fill="none"/>';}
 s+='<text x="'+(W/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="#7b5b9a">بادبند ضربدری فقط در دو دهانه کناری قاب انتهایی · ستون اصلی تا ستونک اول</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="ستونک‌های میانی قاب‌های انتهایی">'+s+'</svg>';
}


function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function coord(x,y,z){return "("+x.toFixed(3)+", "+y.toFixed(3)+", "+z.toFixed(3)+")";}
function memberSchedule(d){
 const rows=[],xs=frameStations(d),bays=xs.length-1;
 const add=(group,mark,a,b,section)=>{const len=Math.sqrt((b[0]-a[0])**2+(b[1]-a[1])**2+(b[2]-a[2])**2);rows.push({group,mark,a:coord(...a),b:coord(...b),len:len.toFixed(3),section});};
 for(const side of [{y:0,n:"لبه چپ"},{y:d.span,n:"لبه راست"}])for(let i=0;i<bays;i++)add("تیر لبه طولی",side.n+"-"+(i+1),[xs[i],side.y,d.height],[xs[i+1],side.y,d.height],d.eaveBeamSection);
 if(d.roof==="gable")for(const side of [{off:-0.4,n:"چپ"},{off:0.4,n:"راست"}]){const y=d.span/2+side.off,z=roofZ(d,y);for(let i=0;i<bays;i++)add("تیر طولی تاج","RIDGE-"+side.n+"-"+(i+1),[xs[i],y,z],[xs[i+1],y,z],d.ridgeBeamSection);}
 const pCount=Math.max(2,Math.ceil(d.span/d.purlinSpacing));
 for(let j=1;j<pCount;j++){const y=d.span*j/pCount,z=roofZ(d,y);for(let i=0;i<bays;i++)add("پرلین طولی","P"+j+"-"+(i+1),[xs[i],y,z],[xs[i+1],y,z],d.purlinSection);}
 for(let j=0;j<d.girtCount;j++){const z=d.height*(d.girtCount-j)/(d.girtCount+1);for(const side of [{y:0,n:"دیوار چپ"},{y:d.span,n:"دیوار راست"}])for(let i=0;i<bays;i++)add("قید افقی طولی","G"+(j+1)+"-"+side.n+"-"+(i+1),[xs[i],side.y,z],[xs[i+1],side.y,z],d.girtSection);}
 const postBays=Math.max(1,Math.ceil(d.span/d.endPostSpacing)),postGap=d.span/postBays;
 for(const end of [{x:0,n:"ابتدا"},{x:d.length,n:"انتها"}])for(let j=1;j<postBays;j++){const y=j*postGap;add("ستونک باربر انتهایی","EP-"+end.n+"-"+j,[end.x,y,0],[end.x,y,roofZ(d,y)],d.endPostSection);}
 // بادبند ضربدری فقط در قاب‌های ابتدایی و انتهایی، بین ستون اصلی و ستونک اول در دو طرف قاب.
 const bracePostBays=Math.max(1,Math.ceil(d.span/d.endPostSpacing)),bracePostGap=d.span/bracePostBays;
 for(const end of [{x:0,n:"ابتدایی"},{x:d.length,n:"انتهایی"}])for(const side of [{a:0,b:bracePostGap,n:"چپ"},{a:d.span-bracePostGap,b:d.span,n:"راست"}]){const za=roofZ(d,side.a),zb=roofZ(d,side.b),mark="EB-"+end.n+"-"+side.n;add("بادبند ضربدری قاب انتهایی",mark+"-A",[end.x,side.a,0],[end.x,side.b,zb],d.bracingSection);add("بادبند ضربدری قاب انتهایی",mark+"-B",[end.x,side.a,za],[end.x,side.b,0],d.bracingSection);}
 // بادبندهای قائم دیوار طولی در دهانه‌های انتخابی، در هر دو دیوار.
 for(const bi of (Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays:[])){if(bi<0||bi>=bays)continue;const xa=xs[bi],xb=xs[bi+1];for(const side of [{y:0,n:"چپ"},{y:d.span,n:"راست"}]){const z=roofZ(d,side.y),mark="LB-"+(bi+1)+"-"+side.n;add("بادبند ضربدری دیوار طولی",mark+"-A",[xa,side.y,0],[xb,side.y,z],d.bracingSection);add("بادبند ضربدری دیوار طولی",mark+"-B",[xa,side.y,z],[xb,side.y,0],d.bracingSection);}}
 // مهاربندهای صفحه سقف: ابتدا و انتها به‌صورت پیش‌فرض و تمام دهانه‌های انتخابی.
 const braceBays=[...new Set([0,Math.max(0,bays-1),...(Array.isArray(d.longitudinalBracingBays)?d.longitudinalBracingBays:[])])].filter(i=>i>=0&&i<bays);
 for(const bi of braceBays){const xa=xs[bi],xb=xs[bi+1];if(d.roof==="gable"){add("مهاربند صفحه سقف","RB-"+(bi+1)+"A",[xa,0,roofZ(d,0)],[xb,d.span/2,d.height+d.rise],d.bracingSection);add("مهاربند صفحه سقف","RB-"+(bi+1)+"B",[xa,d.span/2,d.height+d.rise],[xb,d.span,roofZ(d,d.span)],d.bracingSection);}else{add("مهاربند صفحه سقف","RB-"+(bi+1)+"A",[xa,0,roofZ(d,0)],[xb,d.span,roofZ(d,d.span)],d.bracingSection);add("مهاربند صفحه سقف","RB-"+(bi+1)+"B",[xa,d.span,roofZ(d,d.span)],[xb,0,roofZ(d,0)],d.bracingSection);}}
 xs.forEach((x,i)=>rows.push({group:"قاب اصلی (مجموعه)",mark:"F"+(i+1),a:coord(x,0,0),b:coord(x,d.span,roofZ(d,d.span)),len:"—",section:d.mainFrameSection}));
 return '<table><thead><tr><th>گروه عضو</th><th>شناسه</th><th>مختصات ابتدا X,Y,Z (m)</th><th>مختصات انتها X,Y,Z (m)</th><th>طول (m)</th><th>مقطع ثبت‌شده</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.group)+'</td><td>'+esc(r.mark)+'</td><td dir="ltr">'+r.a+'</td><td dir="ltr">'+r.b+'</td><td>'+r.len+'</td><td>'+esc(r.section||"تعیین نشده")+'</td></tr>').join('')+'</tbody></table>';
}


function connectionSchedule(d){
 const xs=frameStations(d), rows=[];
 const addLine=(group,mark,y,z)=>xs.forEach((x,i)=>rows.push({frame:i+1,x,y,z,group,mark,splice:(i>0&&i<xs.length-1)?"مرز قطعات مجاور؛ وصله فقط پس از طراحی":"—"}));
 [0,d.span].forEach((y,i)=>addLine("تیر لبه طولی",i?"EB-R":"EB-L",y,d.height));
 if(d.roof==="gable")for(const side of [{off:-.4,n:"RL"},{off:.4,n:"RR"}]){const y=d.span/2+side.off;addLine("تیر تاج طولی",side.n,y,roofZ(d,y));}
 const pc=Math.max(2,Math.ceil(d.span/d.purlinSpacing));
 for(let j=1;j<pc;j++){const y=d.span*j/pc;addLine("پرلین", "P"+j,y,roofZ(d,y));}
 for(let j=0;j<d.girtCount;j++){const z=d.height*(d.girtCount-j)/(d.girtCount+1);addLine("قید افقی", "G"+(j+1)+"-L",0,z);addLine("قید افقی","G"+(j+1)+"-R",d.span,z);}
 return '<table><thead><tr><th>قاب</th><th>X (m)</th><th>گروه عضو</th><th>شناسه خط</th><th>گره (X,Y,Z) m</th><th>وضعیت اتصال / وصله</th></tr></thead><tbody>'+
 rows.map(r=>'<tr><td>'+r.frame+'</td><td>'+r.x.toFixed(3)+'</td><td>'+r.group+'</td><td>'+r.mark+'</td><td dir="ltr">'+coord(r.x,r.y,r.z)+'</td><td>'+(r.splice==="—"?"گره اتصال هندسی به قاب؛ جزئیات اتصال تعیین نشده":r.splice+"؛ ابعاد و نوع اتصال تعیین نشده")+'</td></tr>').join('')+
 '</tbody></table>';
}
function cutList(d){
 const box=document.createElement("div");box.innerHTML=memberSchedule(d);
 const rows=Array.from(box.querySelectorAll("tbody tr")).map(tr=>Array.from(tr.children).map(td=>td.textContent.trim())).filter(c=>c.length>=6&&c[4]!=="—");
 const groups=new Map();
 rows.forEach(c=>{const key=[c[0],c[5],c[4]].join("|");groups.set(key,(groups.get(key)||0)+1);});
 return '<table><thead><tr><th>گروه عضو</th><th>مقطع ثبت‌شده</th><th>طول هندسی هر قطعه (m)</th><th>تعداد قطعه</th><th>طول هندسی کل (m)</th></tr></thead><tbody>'+
 Array.from(groups.entries()).map(([k,n])=>{const [g,sec,len]=k.split("|"),v=Number(len);return '<tr><td>'+esc(g)+'</td><td>'+esc(sec)+'</td><td>'+v.toFixed(3)+'</td><td>'+n+'</td><td>'+(v*n).toFixed(3)+'</td></tr>';}).join('')+
 '</tbody></table>';
}

function dimensionSchedule(d){
 const xs=frameStations(d),rows=[
 ["دهانه عرضی",d.span.toFixed(3)+" m"],
 ["طول کل",d.length.toFixed(3)+" m"],
 ["ارتفاع ستون تا لبه",d.height.toFixed(3)+" m"],
 ["ارتفاع تاج قاب",d.roof==="gable"?(d.height+d.rise).toFixed(3)+" m":"—"],
 ["خیز سقف دوشیب / اختلاف ارتفاع تک‌شیب",d.rise.toFixed(3)+" m"],
 ["شیب سقف",d.slopePercent+"٪"],
 ["تعداد قاب / دهانه طولی",xs.length+" / "+(xs.length-1)],
 ["محورهای قاب از مبدأ X",xs.map(x=>x.toFixed(3)).join(" ؛ ")+" m"],
 ["تعداد قید افقی در هر دیوار",String(d.girtCount)],
 ["تراز قیدهای افقی از کف",Array.from({length:d.girtCount},(_,i)=>(d.height*(i+1)/(d.girtCount+1)).toFixed(3)).join(" ؛ ")+" m"],
 ["فاصله تیر تاج اول از محور تاج","0.400 m"],
 ["فاصله تیر تاج دوم از محور تاج","0.400 m"],
 ["فاصله بین دو تیر تاج","0.800 m"],
 ["تراز هر تیر تاج از کف",d.roof==="gable"?[roofZ(d,d.span/2-.4),roofZ(d,d.span/2+.4)].map(z=>z.toFixed(3)).join(" ؛ ")+" m":"برای سقف تک‌شیب تعریف نشده"],
 ["فاصله واقعی پرلین‌ها",(d.span/Math.max(2,Math.ceil(d.span/d.purlinSpacing))).toFixed(3)+" m"]
 ];
 return '<table><thead><tr><th>پارامتر اندازه‌گذاری</th><th>مقدار / مختصات</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</tbody></table>';
}

function draw(d){
 const xs=frameStations(d),bays=xs.length-1,actual=d.length/bays;
 $("frameDrawing").innerHTML=frameSVG(d);$("longDrawing").innerHTML=longitudinalSVG(d);renderBracingMenu(d);$("planDrawing").innerHTML=planSVG(d);$("endDrawing").innerHTML=endSVG(d);$("modelDrawing").innerHTML=modelSVG(d);
 $("frameTable").innerHTML='<table><thead><tr><th>شماره قاب</th><th>مختصات از مبدأ (متر)</th><th>فاصله تا قاب بعدی (متر)</th></tr></thead><tbody>'+xs.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+x.toFixed(3)+'</td><td>'+(i<bays?actual.toFixed(3):'—')+'</td></tr>').join('')+'</tbody></table>';
 $("memberTable").innerHTML=memberSchedule(d);$("dimensionTable").innerHTML=dimensionSchedule(d);$("connectionTable").innerHTML=connectionSchedule(d);$("cutTable").innerHTML=cutList(d);
 $("metrics").innerHTML=[["دهانه",d.span+" m"],["طول",d.length+" m"],["تعداد قاب",xs.length],["تعداد دهانه طولی",bays],["دهانه‌های انتخاب‌شده برای بادبند",((d.longitudinalBracingBays||[]).map(i=>i+1).join("، ")||"هیچ‌کدام")],["فاصله واقعی قاب‌ها",actual.toFixed(3)+" m"],["فاصله واقعی پرلین‌ها",(d.span/Math.max(2,Math.ceil(d.span/d.purlinSpacing))).toFixed(3)+" m"],["تعداد قید افقی هر دیوار طولی",d.girtCount],["فاصله قائم قیدها",(d.height/(d.girtCount+1)).toFixed(3)+" m"],["ستونک میانی هر قاب انتهایی",Math.max(0,Math.ceil(d.span/d.endPostSpacing)-1)],["فاصله واقعی ستونک‌های انتهایی",(d.span/Math.ceil(d.span/d.endPostSpacing)).toFixed(3)+" m"],["فولاد",d.steel],["جرثقیل",d.crane==="yes"?d.craneCapacity+" تن":"ندارد"],["نوع سقف",d.roof==="gable"?"دو شیب":"تک‌شیب"],["شیب سقف",d.slopePercent+"٪"],["خیز / اختلاف ارتفاع",d.rise.toFixed(3)+" m"]].map(x=>'<span class="metric">'+x[0]+': <b>'+x[1]+'</b></span>').join("");
 $("preview").classList.remove("hidden");
}
function save(){const d=read(),e=valid(d);if(e){status(e,true);return false;}try{localStorage.setItem(KEY,JSON.stringify(d));status("مشخصات پروژه در همین مرورگر ذخیره شد.");return true;}catch(err){status("ذخیره خودکار مرورگر ممکن نشد؛ از خروجی JSON استفاده کنید.",true);return false;}}
function build(){const d=read(),e=valid(d);if(e){status(e,true);return;}draw(d);save();status("شیب "+d.slopePercent+"٪ اعمال شد؛ "+(d.roof==="gable"?"خیز تاج":"اختلاف ارتفاع دو لبه")+" برابر "+d.rise.toFixed(3)+" متر است. هندسه شماتیک ساخته شد؛ تحلیل بار یا طراحی مقاطع انجام نشده است.");$("preview").scrollIntoView({behavior:"smooth",block:"start"});}
function exportJSON(){const d=read(),e=valid(d);if(e){status(e,true);return;}const blob=new Blob([JSON.stringify({format:"SAHROUD-STEEL-FAST-1",project:d},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-project.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status("فایل JSON پروژه آماده شد.");}
function importJSON(file){const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result),d=x.project||x;write(Object.assign({},defaults,d));save();status("پروژه بارگذاری شد؛ برای دیدن نماها دکمه ساخت پیش‌نمایش را بزنید.");}catch(e){status("فایل انتخاب‌شده معتبر نیست.",true);}};reader.readAsText(file,"UTF-8");}
function init(){cityNames.forEach(([id,name])=>{const o=document.createElement("option");o.value=id;o.textContent=name;$("city").appendChild(o);});write(defaults);try{const d=JSON.parse(localStorage.getItem(KEY)||"null");if(d){if(!cityNames.some(x=>x[0]===d.city))d.city="shahroud";if(d.climate?.source?.includes("رونوشت ثانویه")||d.climate?.source?.includes("جدول ۶-۱۰-۲")||d.climate?.source?.includes("سرعت باد ۹۰ km/h"))d.climate={groundSnow:null,basicWind:null,elevation:null,snowRegion:null,source:"مقادیر مقدماتی قبلی به علت نبود تطبیق مستقیم با جدول رسمی از بانک حذف شدند.",verified:false,status:"نیازمند استخراج و کنترل منبع رسمی"};write(Object.assign({},defaults,d));}}catch(e){}$("city").addEventListener("change",selectClimateCity);["climateGroundSnow","climateBasicWind","climateElevation","climateSnowRegion","climateSource"].forEach(id=>$(id).addEventListener("input",()=>{updateClimateStatus();persistClimate();}));$("span").addEventListener("input",updateRise);$("slopePercent").addEventListener("input",updateRise);$("roof").addEventListener("change",updateRise);$("crane").addEventListener("change",()=>$("craneCapacity").disabled=$("crane").value==="no");$("btnBuild").addEventListener("click",build);$("btnSave").addEventListener("click",()=>{if(save())exportJSON();});$("btnExport").addEventListener("click",exportJSON);$("btnImport").addEventListener("click",()=>$("fileImport").click());$("fileImport").addEventListener("change",e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value="";});document.querySelectorAll("input,select").forEach(el=>el.addEventListener("change",()=>{try{localStorage.setItem(KEY,JSON.stringify(read()));}catch(e){}}));const d=read();if(!valid(d))draw(d);}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();