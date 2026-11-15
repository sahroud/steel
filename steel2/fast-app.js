/* SAHROUD STEEL — lightweight project intake and complete schematic geometry
   Geometry visualization only; no structural analysis or member design. */
(function(){
"use strict";
const $=id=>document.getElementById(id),KEY="sahroudSteel.fastProject.v1";
const defaults={projectName:"سوله ۱۲×۳۶ متر ـ شهرک صنعتی شاهرود",city:"شاهرود ـ سمنان",owner:"شرکت شهرک‌های صنعتی",designer:"مهندس احمد نوری",span:12,length:36,spacing:6,height:6,girtSpacing:1.5,endPostSpacing:4,slopePercent:20,rise:1.2,roof:"gable",steel:"ST37",crane:"no",craneCapacity:0};
function read(){return {projectName:$("projectName").value.trim(),city:$("city").value.trim(),owner:$("owner").value.trim(),designer:$("designer").value.trim(),span:Number($("span").value),length:Number($("length").value),spacing:Number($("spacing").value),height:Number($("height").value),girtSpacing:Number($("girtSpacing").value),endPostSpacing:Number($("endPostSpacing").value),slopePercent:Number($("slopePercent").value),rise:Number($("rise").value),roof:$("roof").value,steel:$("steel").value,crane:$("crane").value,craneCapacity:Number($("craneCapacity").value)||0};}
function calculatedRise(span,slopePercent,roof){const run=roof==="gable"?span/2:span;return run*slopePercent/100;}
function updateRise(){const span=Number($("span").value),slope=Number($("slopePercent").value),roof=$("roof").value;if(Number.isFinite(span)&&span>0&&Number.isFinite(slope)&&slope>0){$("rise").value=calculatedRise(span,slope,roof).toFixed(3);}}
function write(d){Object.keys(defaults).forEach(k=>{const el=$(k);if(el&&d[k]!==undefined)el.value=d[k];});if(!$("slopePercent").value)$("slopePercent").value=20;updateRise();$("craneCapacity").disabled=$("crane").value==="no";}
function status(msg,error){const el=$("status");el.textContent=msg;el.classList.toggle("error",!!error);}
function valid(d){if(!d.projectName||!d.city)return "نام پروژه و شهر را وارد کنید.";for(const [k,n] of [["span","دهانه"],["length","طول"],["spacing","فاصله قاب‌ها"],["height","ارتفاع ستون"],["girtSpacing","فاصله قیدهای افقی"],["endPostSpacing","فاصله ستونک‌های انتهایی"],["rise","ارتفاع تاج / اختلاف ارتفاع سقف"]])if(!Number.isFinite(d[k])||d[k]<=0)return "مقدار "+n+" باید بزرگ‌تر از صفر باشد.";if(!Number.isFinite(d.slopePercent)||d.slopePercent<=0||d.slopePercent>100)return "شیب سقف باید بین صفر و ۱۰۰ درصد باشد.";if(d.spacing>d.length)return "فاصله قاب‌ها نمی‌تواند از طول سوله بیشتر باشد.";if(d.girtSpacing>4||d.endPostSpacing>d.span)return "فاصله قیدها یا ستونک‌های انتهایی را بررسی کنید.";if(d.rise>=d.height*2)return "ارتفاع تاج یا اختلاف ارتفاع سقف را بررسی کنید.";if(d.crane==="yes"&&d.craneCapacity<=0)return "ظرفیت جرثقیل را وارد کنید.";return "";}
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
if(d.roof==="gable")out+=line([0,d.span/2,d.height+d.rise],[d.length,d.span/2,d.height+d.rise],"#16845b",2.5);
// Roof purlins, shown as longitudinal lines at regular transverse positions
const purlinCount=Math.max(2,Math.ceil(d.span/1.5));
for(let i=1;i<purlinCount;i++){const y=d.span*i/purlinCount;out+=line([0,y,roofZ(d,y)],[d.length,y,roofZ(d,y)],"#b07825",1.35);}
// Side-wall girts at nominal 1.5 m vertical spacing, following the wall top
const girtCount=Math.max(1,Math.floor(d.height/1.5));
for(let j=1;j<=girtCount;j++){const z=d.height*j/(girtCount+1);out+=line([0,0,z],[d.length,0,z],"#6c8491",1.25);const z2=Math.min(z,zSide1-.25);out+=line([0,d.span,z2],[d.length,d.span,z2],"#6c8491",1.25);}
// Schematic X bracing in the first and last longitudinal bays on both side walls
if(xs.length>1){const bays=[0,xs.length-2];for(const bi of bays){const xa=xs[bi],xb=xs[bi+1];for(const y of [0,d.span]){const top=roofZ(d,y)*.82;out+=line([xa,y,.35],[xb,y,top],"#b34c42",1.7)+line([xa,y,top],[xb,y,.35],"#b34c42",1.7);}}}
// Roof-plane diagonal bracing in the first and last bays
if(xs.length>1){for(const bi of [0,xs.length-2]){const xa=xs[bi],xb=xs[bi+1];if(d.roof==="gable"){out+=line([xa,0,roofZ(d,0)],[xb,d.span/2,d.height+d.rise],"#b34c42",1.5)+line([xa,d.span/2,d.height+d.rise],[xb,d.span,roofZ(d,d.span)],"#b34c42",1.5);}else{out+=line([xa,0,roofZ(d,0)],[xb,d.span,roofZ(d,d.span)],"#b34c42",1.5)+line([xa,d.span,roofZ(d,d.span)],[xb,0,roofZ(d,0)],"#b34c42",1.5);}}}
// Base perimeter
const p1=iso(0,0,0),p2=iso(d.length,0,0),p3=iso(d.length,d.span,0),p4=iso(0,d.span,0);
out+='<path d="M'+p1[0]+' '+p1[1]+' L'+p2[0]+' '+p2[1]+' L'+p3[0]+' '+p3[1]+' L'+p4[0]+' '+p4[1]+' Z" fill="none" stroke="#8a9ba4" stroke-dasharray="4 4"/><text x="755" y="24" text-anchor="end" fill="#657984" font-size="12">شماتیک هندسه؛ اعضای فرعی و مهاربندها نمایشی‌اند</text>';
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای سه‌بعدی هندسه سوله با تیرهای متصل به ستون‌ها">'+out+'</svg>';
}

function frameStations(d){const bays=Math.max(1,Math.ceil(d.length/d.spacing));const actual=d.length/bays;return Array.from({length:bays+1},(_,i)=>Number((i*actual).toFixed(3)));}
function longitudinalSVG(d){
 const xs=frameStations(d),W=760,H=300,L=65,R=25,base=220,scale=Math.min((W-L-R)/d.length,145/Math.max(d.height+d.rise,1)),y0=base-d.height*scale;
 let s='<path d="M'+L+' '+base+' H'+(W-R)+'" stroke="#8799a2" stroke-width="2"/>';
 xs.forEach((x,i)=>{const px=L+x*scale;s+='<path d="M'+px+' '+base+' V'+y0+'" stroke="#176b87" stroke-width="2.5"/><text x="'+px+'" y="'+(base+27)+'" text-anchor="middle" font-size="10" fill="#20313d">'+(i+1)+'</text>';});
 s+='<path d="M'+L+' '+y0+' H'+(W-R)+'" stroke="#16845b" stroke-width="3"/><path d="M'+L+' '+(base+48)+' H'+(W-R)+' M'+L+' '+(base+42)+' v12 M'+(W-R)+' '+(base+42)+' v12" stroke="#526b78" fill="none"/><text x="'+(W/2)+'" y="'+(base+68)+'" text-anchor="middle" font-size="12" fill="#20313d">طول کل '+d.length+' متر · '+(xs.length-1)+' دهانه مساوی</text><text x="'+L+'" y="'+(y0-10)+'" font-size="11" fill="#176b87">ارتفاع لبه '+d.height+' m</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای طولی با موقعیت قاب‌ها">'+s+'</svg>';
}
function planSVG(d){
 const xs=frameStations(d),W=760,H=320,L=65,T=45,R=25,B=245,sc=Math.min((W-L-R)/d.length,(B-T)/d.span),x1=L+d.length*sc,y1=T+d.span*sc;
 let s='<rect x="'+L+'" y="'+T+'" width="'+(x1-L)+'" height="'+(y1-T)+'" fill="#f8fbfc" stroke="#526b78" stroke-width="2"/>';
 xs.forEach((x,i)=>{const px=L+x*sc;s+='<line x1="'+px+'" y1="'+T+'" x2="'+px+'" y2="'+y1+'" stroke="#176b87" stroke-width="2"/><text x="'+px+'" y="'+(T-12)+'" text-anchor="middle" font-size="10" fill="#176b87">'+(i+1)+'</text>';});
 const pc=Math.max(2,Math.ceil(d.span/1.5));for(let i=1;i<pc;i++){const py=T+d.span*i/pc*sc;s+='<line x1="'+L+'" y1="'+py+'" x2="'+x1+'" y2="'+py+'" stroke="#b07825" stroke-width="1"/>';}
 if(xs.length>1){for(const bi of [0,xs.length-2]){const xa=L+xs[bi]*sc,xb=L+xs[bi+1]*sc;s+='<path d="M'+xa+' '+T+' L'+xb+' '+y1+' M'+xa+' '+y1+' L'+xb+' '+T+'" stroke="#b34c42" stroke-width="2" fill="none"/>';}}
 s+='<text x="'+((L+x1)/2)+'" y="'+(y1+27)+'" text-anchor="middle" font-size="12" fill="#20313d">طول '+d.length+' m</text><text x="'+(x1+8)+'" y="'+((T+y1)/2)+'" font-size="11" fill="#20313d">'+d.span+' m</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="پلان سقف و محل قاب‌ها">'+s+'</svg>';
}
function endSVG(d){
 const W=640,H=340,m=62,base=276,scale=Math.min((W-2*m)/d.span,(base-52)/(d.height+d.rise)),x0=(W-d.span*scale)/2,x1=x0+d.span*scale,z0=base-d.height*scale,z1=base-(d.height+d.rise)*scale;
 let p;if(d.roof==="gable"){const xm=(x0+x1)/2;p='M'+x0+' '+z0+' L'+xm+' '+z1+' L'+x1+' '+z0;}else p='M'+x0+' '+z0+' L'+x1+' '+z1;
 const s='<path d="M35 '+base+' H605" stroke="#8799a2" stroke-width="2"/><path d="M'+x0+' '+base+' V'+z0+' '+p.slice(p.indexOf('L'))+' V'+base+'" fill="none" stroke="#176b87" stroke-width="4"/><text x="'+(W/2)+'" y="'+(base+34)+'" text-anchor="middle" font-size="12" fill="#20313d">دهانه '+d.span+' متر</text><text x="'+x0+'" y="'+(z0-10)+'" text-anchor="middle" font-size="11" fill="#20313d">'+d.height+' m</text><text x="'+x1+'" y="'+(z1-10)+'" text-anchor="middle" font-size="11" fill="#20313d">'+(d.height+(d.roof==="single"?d.rise:0)).toFixed(2)+' m</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای انتهایی سوله">'+s+'</svg>';
}


function girtElevationSVG(d){
 const W=760,H=300,L=65,R=25,base=220,sc=Math.min((W-L-R)/d.length,145/d.height),top=base-d.height*sc;
 const bays=Math.max(1,Math.ceil(d.height/d.girtSpacing)),actual=d.height/bays;
 let s='<path d="M'+L+' '+base+' H'+(W-R)+'" stroke="#8799a2" stroke-width="2"/>';
 frameStations(d).forEach((x,i)=>{const px=L+x*sc;s+='<path d="M'+px+' '+base+' V'+top+'" stroke="#176b87" stroke-width="2.5"/><text x="'+px+'" y="'+(base+17)+'" text-anchor="middle" font-size="9" fill="#20313d">'+(i+1)+'</text>';});
 for(let i=1;i<bays;i++){const yy=base-i*actual*sc;s+='<path d="M'+L+' '+yy+' H'+(W-R)+'" stroke="#6c8491" stroke-width="2"/>';}
 s+='<text x="'+(W/2)+'" y="18" text-anchor="middle" font-size="12" fill="#20313d">'+(bays-1)+' ردیف قید افقی در هر دیوار طولی · فاصله قائم واقعی '+actual.toFixed(3)+' متر</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمای طولی با قیدهای افقی">'+s+'</svg>';
}
function endPostsSVG(d){
 const W=640,H=340,m=62,base=276,sc=Math.min((W-2*m)/d.span,(base-52)/(d.height+d.rise)),x0=(W-d.span*sc)/2;
 const bays=Math.max(1,Math.ceil(d.span/d.endPostSpacing)),actual=d.span/bays;
 let s='';
 for(let i=1;i<bays;i++){const y=i*actual,x=x0+y*sc,z=roofZ(d,y);s+='<path d="M'+x+' '+base+' V'+(base-z*sc)+'" stroke="#7b5b9a" stroke-width="3"/>';}
 s+='<text x="'+(W/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="#7b5b9a">'+(bays-1)+' ستونک میانی در هر قاب انتهایی · فاصله واقعی '+actual.toFixed(3)+' متر</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="ستونک‌های میانی قاب‌های انتهایی">'+s+'</svg>';
}

function draw(d){
 const xs=frameStations(d),bays=xs.length-1,actual=d.length/bays;
 $("frameDrawing").innerHTML=frameSVG(d);$("longDrawing").innerHTML=girtElevationSVG(d);$("planDrawing").innerHTML=planSVG(d);$("endDrawing").innerHTML=endSVG(d)+endPostsSVG(d);$("modelDrawing").innerHTML=modelSVG(d);
 $("frameTable").innerHTML='<table><thead><tr><th>شماره قاب</th><th>مختصات از مبدأ (متر)</th><th>فاصله تا قاب بعدی (متر)</th></tr></thead><tbody>'+xs.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+x.toFixed(3)+'</td><td>'+(i<bays?actual.toFixed(3):'—')+'</td></tr>').join('')+'</tbody></table>';
 $("metrics").innerHTML=[["دهانه",d.span+" m"],["طول",d.length+" m"],["تعداد قاب",xs.length],["تعداد دهانه طولی",bays],["فاصله واقعی قاب‌ها",actual.toFixed(3)+" m"],["ردیف قید افقی هر دیوار طولی",Math.max(0,Math.ceil(d.height/d.girtSpacing)-1)],["فاصله قائم واقعی قیدها",(d.height/Math.ceil(d.height/d.girtSpacing)).toFixed(3)+" m"],["ستونک میانی هر قاب انتهایی",Math.max(0,Math.ceil(d.span/d.endPostSpacing)-1)],["فاصله واقعی ستونک‌های انتهایی",(d.span/Math.ceil(d.span/d.endPostSpacing)).toFixed(3)+" m"],["فولاد",d.steel],["جرثقیل",d.crane==="yes"?d.craneCapacity+" تن":"ندارد"],["نوع سقف",d.roof==="gable"?"دو شیب":"تک‌شیب"],["شیب سقف",d.slopePercent+"٪"],["خیز / اختلاف ارتفاع",d.rise.toFixed(3)+" m"]].map(x=>'<span class="metric">'+x[0]+': <b>'+x[1]+'</b></span>').join("");
 $("preview").classList.remove("hidden");
}
function save(){const d=read(),e=valid(d);if(e){status(e,true);return false;}try{localStorage.setItem(KEY,JSON.stringify(d));status("مشخصات پروژه در همین مرورگر ذخیره شد.");return true;}catch(err){status("ذخیره خودکار مرورگر ممکن نشد؛ از خروجی JSON استفاده کنید.",true);return false;}}
function build(){const d=read(),e=valid(d);if(e){status(e,true);return;}draw(d);save();status("شیب "+d.slopePercent+"٪ اعمال شد؛ "+(d.roof==="gable"?"خیز تاج":"اختلاف ارتفاع دو لبه")+" برابر "+d.rise.toFixed(3)+" متر است. هندسه شماتیک ساخته شد؛ تحلیل بار یا طراحی مقاطع انجام نشده است.");$("preview").scrollIntoView({behavior:"smooth",block:"start"});}
function exportJSON(){const d=read(),e=valid(d);if(e){status(e,true);return;}const blob=new Blob([JSON.stringify({format:"SAHROUD-STEEL-FAST-1",project:d},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-project.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status("فایل JSON پروژه آماده شد.");}
function importJSON(file){const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result),d=x.project||x;write(Object.assign({},defaults,d));save();status("پروژه بارگذاری شد؛ برای دیدن نماها دکمه ساخت پیش‌نمایش را بزنید.");}catch(e){status("فایل انتخاب‌شده معتبر نیست.",true);}};reader.readAsText(file,"UTF-8");}
function init(){write(defaults);try{const d=JSON.parse(localStorage.getItem(KEY)||"null");if(d)write(Object.assign({},defaults,d));}catch(e){}$("span").addEventListener("input",updateRise);$("slopePercent").addEventListener("input",updateRise);$("roof").addEventListener("change",updateRise);$("crane").addEventListener("change",()=>$("craneCapacity").disabled=$("crane").value==="no");$("btnBuild").addEventListener("click",build);$("btnSave").addEventListener("click",()=>{if(save())exportJSON();});$("btnExport").addEventListener("click",exportJSON);$("btnImport").addEventListener("click",()=>$("fileImport").click());$("fileImport").addEventListener("change",e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value="";});document.querySelectorAll("input,select").forEach(el=>el.addEventListener("change",()=>{try{localStorage.setItem(KEY,JSON.stringify(read()));}catch(e){}}));const d=read();if(!valid(d))draw(d);}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();