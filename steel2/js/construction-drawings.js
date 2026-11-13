/* SAHROUD STEEL — parametric construction drawing sheets, phase 1.
 * Plan/section/member schedule are generated from the current model and footing schedule.
 * No unverified reinforcement, connection, anchor, bolt or weld details are invented.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,d=2)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last=null;
function collect(){
 const m=window.SteelStructuralModel?.model;
 if(!m?.nodes?.length||!m?.members?.length)throw Error('ابتدا مدل سه‌بعدی سازه را بسازید.');
 const fd=window.SteelFoundationTakeoff?.getData?.()||{},td=window.SteelTieBeamLayout?.getData?.()||{};
 const bases=m.nodes.filter(x=>x.kind==='base'||x.kind==='endwall-base').sort((a,b)=>a.z-b.z||a.x-b.x);
 if(!bases.length)throw Error('گره پایه‌ای در مدل پیدا نشد.');
 const footings=bases.map(v=>{const d=(fd.footingSchedule||{})[String(v.id)]||window.SteelFoundationTakeoff?.defaultFootingSpec?.(v)||{width:1.8,length:1.8,thickness:.8};const width=n(d.width),length=n(d.length),thickness=n(d.thickness);if(!(width>0&&length>0&&thickness>0))throw Error('ابعاد پی '+v.id+' نامعتبر است.');return{id:v.id,x:n(v.x)||0,z:n(v.z)||0,kind:v.kind,width,length,thickness};});
 return{m,fd,td,footings,routes:(td.routes||[]).filter(r=>r?.start&&r?.end),tieRebar:window.SteelTieBeamReinforcement?.getLast?.()||null,members:m.members.map(v=>({id:v.id,section:v.sectionKey||'unassigned',start:v.start,end:v.end,length:n(v.length),cut:n(v.fabricationLengthM)}))};
}
function t(x,y,s,size=13,anchor='middle',color='#203746'){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" text-anchor="'+anchor+'" fill="'+color+'" font-family="Tahoma,Arial" direction="rtl">'+esc(s)+'</text>';}
function ln(x1,y1,x2,y2,color='#334155',w=2,dash=''){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';}
function frame(title,body,subtitle){return '<svg xmlns="'+NS+'" width="1189mm" height="841mm" viewBox="0 0 1600 1131"><rect width="1600" height="1131" fill="white"/><rect x="24" y="24" width="1552" height="1083" fill="none" stroke="#203746" stroke-width="2"/>'+t(1540,65,title,25,'end')+t(1540,92,subtitle||'SAHROUD STEEL | نقشه تولیدشده از مدل پروژه',13,'end','#526777')+body+'<rect x="1050" y="1035" width="500" height="48" fill="none" stroke="#203746"/>'+ln(1300,1035,1300,1083)+ln(1400,1035,1400,1083)+t(1525,1065,'SAHROUD STEEL',15,'end')+t(1380,1065,'مقیاس: شماتیک',11)+t(1275,1065,'بازبینی مهندس محاسب الزامی است',10)+'</svg>';}
function plan(d){
 const f=d.footings,minX=Math.min(...f.map(v=>v.x-v.width/2)),maxX=Math.max(...f.map(v=>v.x+v.width/2)),minZ=Math.min(...f.map(v=>v.z-v.length/2)),maxZ=Math.max(...f.map(v=>v.z+v.length/2));
 const s=Math.min(1050/Math.max(maxX-minX,1),650/Math.max(maxZ-minZ,1)),X=x=>250-minX*s+x*s,Z=z=>170-minZ*s+z*s;let b='<rect x="80" y="120" width="1440" height="780" fill="white" stroke="#cbd5e1"/>';
 [...new Set(f.map(v=>v.x))].sort((a,b)=>a-b).forEach(x=>b+=ln(X(x),125,X(x),885,'#e2e8f0',1,'5 5')+t(X(x),910,'X='+fmt(x),10));
 [...new Set(f.map(v=>v.z))].sort((a,b)=>a-b).forEach(z=>b+=ln(85,Z(z),1510,Z(z),'#e2e8f0',1,'5 5')+t(95,Z(z)-8,'Z='+fmt(z),10,'start'));
 d.routes.forEach(r=>{const a=f.find(v=>v.id===r.start),c=f.find(v=>v.id===r.end);if(a&&c)b+=ln(X(a.x),Z(a.z),X(c.x),Z(c.z),'#0f766e',8,'14 8');});
 f.forEach(v=>{const w=v.width*s,h=v.length*s,x=X(v.x)-w/2,y=Z(v.z)-h/2;b+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2.5"/>'+ln(X(v.x),y,X(v.x),y+h,'#60a5fa',1)+ln(x,Z(v.z),x+w,Z(v.z),'#60a5fa',1)+t(X(v.x),Z(v.z)-7,v.id,12)+t(X(v.x),Z(v.z)+17,fmt(v.width)+' × '+fmt(v.length)+' m',11,'middle','#1e3a8a');});
 return b+t(800,970,'مستطیل آبی: محدوده پی | خط سبز: مسیر شناژ ثبت‌شده در ورودی‌ها',14)+t(800,995,'مختصات از گره‌های مدل و ابعاد از جدول مستقل فونداسیون خوانده شده‌اند.',12);
}
function tieRebarDrawing(d){
 let b='<rect x="80" y="120" width="1440" height="780" fill="white" stroke="#cbd5e1"/>';
 const reportRows=d.tieRebar?.rows||[],nodes=new Map(d.m.nodes.map(v=>[String(v.id),v]));
 if(!d.routes.length)return frame('جزئیات آرماتور شناژ — مسیر تعریف نشده',b+t(800,480,'هیچ مسیر شناژی در مدل تعریف نشده است.',20),'نقشه آرماتور پیوسته از مسیرهای واقعی مدل استخراج می‌شود');
 let y=185,drawn=0;
 d.routes.forEach(route=>{
  const row=reportRows.find(x=>String(x.id)===String(route.id));
  if(!row?.ok||!row.longitudinalBars?.footingPath?.ok||row.longitudinalBars.hookAllowanceIncluded!==true){
   b+=t(120,y,'شناژ '+route.id+': جزئیات میلگرد ممتد هنوز آماده ترسیم نیست؛ تحلیل، مسیر، قلاب و خاموت باید تکمیل شوند.',13,'start','#b45309');y+=45;return;
  }
  const path=window.SteelFoundationTakeoff?.footingsAlongStraightRoute?.(d.m.nodes,route);
  if(!path?.ok){b+=t(120,y,'شناژ '+route.id+': مسیر مستقیم پی‌ها قابل استخراج نیست؛ نقشه صادر نشد.',13,'start','#b91c1c');y+=45;return;}
  const first=nodes.get(String(route.start)),last=nodes.get(String(route.end)),axis=Math.abs(Number(last.x)-Number(first.x))>=Math.abs(Number(last.z)-Number(first.z))?'X':'Z';
  const p=row.longitudinalBars.footingPath,total=p.startExtensionM+p.routeLengthM+p.endExtensionM,scale=Math.min(760/Math.max(total,.1),190),origin=190,barStart=origin,barEnd=origin+total*scale,beamStart=origin+p.startExtensionM*scale,beamEnd=beamStart+p.routeLengthM*scale,baseY=y+48;
  b+=t(1480,y,'شناژ '+route.id+' | '+route.start+' تا '+route.end,15,'end','#1e3a8a');
  b+='<rect x="'+beamStart+'" y="'+(baseY+12)+'" width="'+(beamEnd-beamStart)+'" height="62" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>';
  path.footings.forEach(point=>{
   const spec=d.fd.footingSchedule?.[String(point.node.id)]||window.SteelFoundationTakeoff?.defaultFootingSpec?.(point.node)||{width:1.8,length:1.8,thickness:.8};
   const along=axis==='X'?Number(spec.width):Number(spec.length),center=beamStart+Number(point.stationM)*scale,w=along*scale;
   b+='<rect x="'+(center-w/2)+'" y="'+(baseY-8)+'" width="'+w+'" height="102" fill="#dbeafe" fill-opacity=".65" stroke="#1d4ed8" stroke-width="2"/>'+t(center,baseY-15,String(point.node.id),10);
  });
  b+=ln(barStart,baseY+29,barEnd,baseY+29,'#dc2626',4)+ln(barStart,baseY+57,barEnd,baseY+57,'#dc2626',4);
  b+=ln(barStart,baseY+29,barStart,baseY+8,'#dc2626',3)+ln(barEnd,baseY+57,barEnd,baseY+78,'#dc2626',3);
  b+=t(1480,y+120,'میلگرد طولی: '+row.longitudinalBars.countEachFace+' شاخه در هر وجه | قطر '+row.barDiaMm+' mm | طول برش کل '+fmt(row.longitudinalBars.totalCutLengthM)+' m',12,'end');
  b+=t(1480,y+145,'عبور پیوسته از '+path.footings.length+' فونداسیون | افزوده قلاب هر انتها: '+fmt(row.longitudinalBars.hookCutAllowancePerEndMm)+' mm؛ شکل قلاب باید در نقشه جزئیات نهایی شود.',11,'end','#475569');
  y+=210;drawn++;
 });
 if(!drawn)b+=t(800,940,'تا تکمیل داده‌های معتبر، هیچ جزئیات آرماتور اجرایی صادر نشده است.',14,'middle','#b45309');
 else b+=t(800,965,'خط قرمز: میلگرد طولی پیوسته؛ مستطیل آبی: فونداسیون؛ مقطع شناژ خاکستری. نمایش شماتیک و بدون مقیاس اجرایی.',12);
 return frame('نقشه آرماتور طولی ممتد شناژ از داخل فونداسیون‌ها',b,'بر اساس آخرین غربال آرماتور، ابعاد پی‌ها و مسیرهای ثبت‌شده');
}
function section(d,top){
 const f=d.footings[0],bw=n(d.fd.tieWidthM)||.6,bh=n(d.fd.tieHeightM)||.5,bottom=top-f.thickness,tieBottom=top-bh,delta=f.thickness-bh;
 const sx=260,sy=300,ox=800,oy=440,pw=f.width*sx,ph=f.thickness*sy,tw=bw*sx,th=bh*sy;
 let b='<rect x="100" y="120" width="1400" height="780" fill="white" stroke="#cbd5e1"/>';
 b+='<rect x="'+(ox-pw/2)+'" y="'+oy+'" width="'+pw+'" height="'+ph+'" fill="#cbd5e1" stroke="#334155" stroke-width="3"/>';
 b+='<rect x="'+(ox-pw/2-tw/2)+'" y="'+oy+'" width="'+(pw+tw)+'" height="'+th+'" fill="#94a3b8" fill-opacity=".75" stroke="#334155" stroke-width="3"/>';
 b+=ln(150,oy,1450,oy,'#d97706',2,'10 6')+t(1450,oy-12,'تراز مشترک بالای پی و شناژ',15,'end','#b45309');
 b+=ln(ox+pw/2+60,oy,ox+pw/2+60,oy+ph)+t(ox+pw/2+75,oy+ph/2,'ضخامت پی '+fmt(f.thickness)+' m',13,'start');
 b+=ln(ox+pw/2+115,oy,ox+pw/2+115,oy+th,'#0f766e')+t(ox+pw/2+130,oy+th/2,'ارتفاع شناژ '+fmt(bh)+' m',13,'start','#0f766e');
 b+=ln(ox-pw/2,oy+ph+25,ox+pw/2,oy+ph+25)+t(ox,oy+ph+48,'عرض پی '+fmt(f.width)+' m',13);
 return b+t(800,180,'مقطع شماتیک پی و شناژ — پایه نمونه '+f.id,19)+t(800,220,'کف پی: '+fmt(bottom)+' m | کف شناژ: '+fmt(tieBottom)+' m نسبت به مبنای انتخابی',14)+t(800,820,'اختلاف عمق خاکبرداری زیر پی نسبت به زیر شناژ: '+fmt(delta)+' m',15,'middle',delta>=0?'#166534':'#b91c1c')+t(800,855,'تراز مبنا قراردادی است؛ بدون تراز زمین، عمق خاکبرداری واقعی صادر نمی‌شود.',12);
}
function memberSchedule(d){
 const cols=[90,280,480,720,960,1190,1450],heads=['ردیف','شناسه عضو','گروه مقطع','گره ابتدا','گره انتها','طول مدل (m)','طول ساخت (m)'];let b='<rect x="70" y="120" width="1460" height="820" fill="white" stroke="#cbd5e1"/>'+t(800,160,'جدول اعضای مدل فولادی',20);
 heads.forEach((h,i)=>b+=t((cols[i]+cols[i+1])/2,205,h,12));b+=ln(90,220,1510,220,'#334155',2);
 d.members.slice(0,27).forEach((v,i)=>{const y=250+i*24,a=[i+1,v.id,v.section,v.start,v.end,v.length==null?'—':fmt(v.length,3),v.cut==null?'نیازمند جزئیات ساخت':fmt(v.cut,3)];a.forEach((q,j)=>b+=t((cols[j]+cols[j+1])/2,y,String(q),10));b+=ln(90,y+8,1510,y+8,'#e2e8f0',1);});
 return b+t(800,945,'این جدول نقشه قطعه/مونتاژ نیست؛ طول برش فقط با رکورد ساخت معتبر درج می‌شود.',12);
}
function build(){
 const d=collect(),datum=n($('cdTopDatum')?.value);if(datum===null)throw Error('تراز قراردادی بالای پی و شناژ را وارد کنید.');
 last={generatedAt:new Date().toISOString(),datumTopM:datum,footings:d.footings,routes:d.routes,members:d.members,sheets:{
 foundationPlan:frame('نقشه فونداسیون — پلان جانمایی',plan(d),'مختصات از مدل سه‌بعدی | ابعاد از جدول مستقل پی‌ها'),
 foundationSection:frame('نقشه فونداسیون — مقطع و ترازها',section(d,datum),'تراز مشترک بالای پی و شناژ | مقطع شماتیک'),
 steelMemberSchedule:frame('جدول اعضای سازه فولادی',memberSchedule(d),'اعضای استخراج‌شده از مدل هندسی فعلی'),
 tieRebarDetail:tieRebarDrawing(d)
 },limitations:['این‌ها نقشه‌های پارامتریک اولیه‌اند و برای اجرا یا مهر مهندس آماده نیستند.','تراز مبنا قراردادی است؛ تراز زمین، کف تمام‌شده و عمق خاکبرداری واقعی هنوز وارد نشده‌اند.','آرماتور، قلاب، طول مهاری، وصله، کاور و لیستوفر هنوز طراحی/کنترل نهایی نشده‌اند.','اتصالات فولادی، ورق‌ها، سوراخ‌کاری، پیچ و جوش از طراحی اتصال تأییدشده استخراج نشده‌اند.','جدول اعضا طول هندسی را نشان می‌دهد؛ طول ساخت فقط در صورت وجود داده معتبر درج می‌شود.']};
 render();return last;
}
function render(){const host=$('constructionDrawingPreview');if(!host||!last)return;host.innerHTML='<div class="notice">چهار شیت آماده شد: پلان فونداسیون، مقطع، جدول اعضای فولادی و جزئیات شماتیک آرماتور ممتد شناژ (در صورت تکمیل ورودی‌ها).</div>'+Object.entries(last.sheets).map(([k,v])=>'<details open style="margin:10px 0"><summary>'+({foundationPlan:'پلان فونداسیون',foundationSection:'مقطع فونداسیون و شناژ',steelMemberSchedule:'جدول اعضای فولادی',tieRebarDetail:'آرماتور طولی ممتد شناژ'}[k])+'</summary><div style="overflow:auto;border:1px solid #cbd5e1;background:white">'+v+'</div></details>').join('');}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function print(){if(!last)build();const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>SAHROUD STEEL drawings</title><style>@page{size:A3 landscape;margin:8mm}body{margin:0;font-family:Tahoma}section{page-break-after:always}svg{width:100%;height:auto;max-height:275mm}</style>'+Object.values(last.sheets).map(s=>'<section>'+s+'</section>').join('')+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function mount(){
 if($('constructionDrawingsPanel'))return;const a=$('foundationTakeoffPanel')||$('quantityTakeoffPanel')||document.querySelector('main');if(!a)return;
 const p=document.createElement('section');p.className='panel';p.id='constructionDrawingsPanel';
 p.innerHTML='<div class="panel-title"><h3>نقشه‌های اجرایی و مدارک ساخت — مرحله اول</h3><span class="status">تولید پارامتریک از مدل</span></div><div class="notice">پلان پی از مختصات پایه‌ها و جدول ابعاد مستقل تولید می‌شود؛ مسیر شناژ فقط از مسیرهای ثبت‌شده رسم می‌شود. مقطع، تراز مشترک بالای پی و شناژ را رعایت می‌کند. جدول اعضا از مدل هندسی استخراج می‌شود.</div><div class="field"><label for="cdTopDatum">تراز قراردادی بالای پی و شناژ (m)</label><input id="cdTopDatum" type="number" step="0.01" value="0"></div><div class="button-grid"><button class="btn primary" id="btnBuildConstructionDrawings" type="button">تولید / به‌روزرسانی نقشه‌ها</button><button class="btn secondary" id="btnPrintConstructionDrawings" type="button">چاپ / ذخیره PDF سه شیت</button><button class="btn secondary" id="btnExportDrawingData" type="button">دریافت داده نقشه JSON</button></div><div id="constructionDrawingPreview" class="notice">پس از ساخت مدل سه‌بعدی و ثبت جدول فونداسیون، نقشه‌ها را تولید کنید.</div><div class="notice">مرحله بعد: نقشه آرماتوربندی و لیستوفر، صفحه‌ستون و انکربولت، دیتیل ورق/پیچ/جوش، نقشه تک‌قطعه با سوراخ‌کاری و نقشه مونتاژ. این موارد تا تکمیل طراحی مستقل اتصال و آرماتور، عمداً صادر نمی‌شوند.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $('btnBuildConstructionDrawings').addEventListener('click',()=>{try{build();}catch(e){alert(e.message);}});
 $('btnPrintConstructionDrawings').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportDrawingData').addEventListener('click',()=>{try{if(!last)build();download('SAHROUD-STEEL-Construction-Drawings.json',JSON.stringify(last,null,2),'application/json;charset=utf-8');}catch(e){alert(e.message);}});
}
window.SteelConstructionDrawings={build,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();