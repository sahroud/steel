/* SAHROUD STEEL — lightweight project intake and complete schematic geometry
   Geometry visualization only; no structural analysis or member design. */
(function(){
"use strict";
const $=id=>document.getElementById(id),KEY="sahroudSteel.fastProject.v1";
const defaults={projectName:"سوله ۱۲×۳۶ متر ـ شهرک صنعتی شاهرود",city:"شاهرود ـ سمنان",owner:"شرکت شهرک‌های صنعتی",designer:"مهندس احمد نوری",span:12,length:36,spacing:6,height:6,slopePercent:20,rise:1.2,roof:"gable",steel:"ST37",crane:"no",craneCapacity:0};
function read(){return {projectName:$("projectName").value.trim(),city:$("city").value.trim(),owner:$("owner").value.trim(),designer:$("designer").value.trim(),span:Number($("span").value),length:Number($("length").value),spacing:Number($("spacing").value),height:Number($("height").value),slopePercent:Number($("slopePercent").value),rise:Number($("rise").value),roof:$("roof").value,steel:$("steel").value,crane:$("crane").value,craneCapacity:Number($("craneCapacity").value)||0};}
function calculatedRise(span,slopePercent,roof){const run=roof==="gable"?span/2:span;return run*slopePercent/100;}
function updateRise(){const span=Number($("span").value),slope=Number($("slopePercent").value),roof=$("roof").value;if(Number.isFinite(span)&&span>0&&Number.isFinite(slope)&&slope>0){$("rise").value=calculatedRise(span,slope,roof).toFixed(3);}}
function write(d){Object.keys(defaults).forEach(k=>{const el=$(k);if(el&&d[k]!==undefined)el.value=d[k];});if(!$("slopePercent").value)$("slopePercent").value=20;updateRise();$("craneCapacity").disabled=$("crane").value==="no";}
function status(msg,error){const el=$("status");el.textContent=msg;el.classList.toggle("error",!!error);}
function valid(d){if(!d.projectName||!d.city)return "نام پروژه و شهر را وارد کنید.";for(const [k,n] of [["span","دهانه"],["length","طول"],["spacing","فاصله قاب‌ها"],["height","ارتفاع ستون"],["rise","ارتفاع تاج / اختلاف ارتفاع سقف"]])if(!Number.isFinite(d[k])||d[k]<=0)return "مقدار "+n+" باید بزرگ‌تر از صفر باشد.";if(!Number.isFinite(d.slopePercent)||d.slopePercent<=0||d.slopePercent>100)return "شیب سقف باید بین صفر و ۱۰۰ درصد باشد.";if(d.spacing>d.length)return "فاصله قاب‌ها نمی‌تواند از طول سوله بیشتر باشد.";if(d.rise>=d.height*2)return "ارتفاع تاج یا اختلاف ارتفاع سقف را بررسی کنید.";if(d.crane==="yes"&&d.craneCapacity<=0)return "ظرفیت جرثقیل را وارد کنید.";return "";}
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
let out="",xs=[];for(let x=0;x<d.length;x+=d.spacing)xs.push(Number(x.toFixed(4)));if(!xs.length||Math.abs(xs[xs.length-1]-d.length)>.001)xs.push(d.length);
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
function draw(d){$("frameDrawing").innerHTML=frameSVG(d);$("modelDrawing").innerHTML=modelSVG(d);const frames=Math.ceil(d.length/d.spacing)+1;$("metrics").innerHTML=[["دهانه",d.span+" m"],["طول",d.length+" m"],["تعداد قاب تقریبی",frames],["فولاد",d.steel],["جرثقیل",d.crane==="yes"?d.craneCapacity+" تن":"ندارد"],["نوع سقف",d.roof==="gable"?"دو شیب":"تک‌شیب"],["شیب سقف",d.slopePercent+"٪"],["خیز / اختلاف ارتفاع",d.rise.toFixed(3)+" m"]].map(x=>'<span class="metric">'+x[0]+': <b>'+x[1]+'</b></span>').join("");$("preview").classList.remove("hidden");}
function save(){const d=read(),e=valid(d);if(e){status(e,true);return false;}try{localStorage.setItem(KEY,JSON.stringify(d));status("مشخصات پروژه در همین مرورگر ذخیره شد.");return true;}catch(err){status("ذخیره خودکار مرورگر ممکن نشد؛ از خروجی JSON استفاده کنید.",true);return false;}}
function build(){const d=read(),e=valid(d);if(e){status(e,true);return;}draw(d);save();status("شیب "+d.slopePercent+"٪ اعمال شد؛ "+(d.roof==="gable"?"خیز تاج":"اختلاف ارتفاع دو لبه")+" برابر "+d.rise.toFixed(3)+" متر است. هندسه شماتیک ساخته شد؛ تحلیل بار یا طراحی مقاطع انجام نشده است.");$("preview").scrollIntoView({behavior:"smooth",block:"start"});}
function exportJSON(){const d=read(),e=valid(d);if(e){status(e,true);return;}const blob=new Blob([JSON.stringify({format:"SAHROUD-STEEL-FAST-1",project:d},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-project.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status("فایل JSON پروژه آماده شد.");}
function importJSON(file){const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result),d=x.project||x;write(Object.assign({},defaults,d));save();status("پروژه بارگذاری شد؛ برای دیدن نماها دکمه ساخت پیش‌نمایش را بزنید.");}catch(e){status("فایل انتخاب‌شده معتبر نیست.",true);}};reader.readAsText(file,"UTF-8");}
function init(){write(defaults);try{const d=JSON.parse(localStorage.getItem(KEY)||"null");if(d)write(Object.assign({},defaults,d));}catch(e){}$("span").addEventListener("input",updateRise);$("slopePercent").addEventListener("input",updateRise);$("roof").addEventListener("change",updateRise);$("crane").addEventListener("change",()=>$("craneCapacity").disabled=$("crane").value==="no");$("btnBuild").addEventListener("click",build);$("btnSave").addEventListener("click",()=>{if(save())exportJSON();});$("btnExport").addEventListener("click",exportJSON);$("btnImport").addEventListener("click",()=>$("fileImport").click());$("fileImport").addEventListener("change",e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value="";});document.querySelectorAll("input,select").forEach(el=>el.addEventListener("change",()=>{try{localStorage.setItem(KEY,JSON.stringify(read()));}catch(e){}}));const d=read();if(!valid(d))draw(d);}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();