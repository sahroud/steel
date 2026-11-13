/* SAHROUD STEEL — user-dimensioned base plate and anchor layout drawings.
 * This is a geometric detail sheet, not a capacity/design check.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
let last=null;
const ids=['bpCount','bpCols','bpRows','bpPlateX','bpPlateZ','bpPlateT','bpBoltD','bpHoleD','bpPitchX','bpPitchZ','bpEdgeX','bpEdgeZ','bpColumnX','bpColumnZ','bpProjection','bpEmbedment','bpGrout'];
function syncFromTakeoff(){
 const pairs=[['bpCount','abBoltsPerBase'],['bpPlateX','abPlateWidth'],['bpPlateZ','abPlateLength'],['bpPlateT','abPlateThickness'],['bpBoltD','abBoltDia']];
 pairs.forEach(([a,b])=>{const x=$(a),y=$(b);if(x&&y&&x.value.trim()===''&&y.value.trim()!=='')x.value=y.value;});
}
function val(id){const x=$(id)?.value;if(x===undefined||String(x).trim()==='')return null;const n=Number(x);return Number.isFinite(n)?n:null;}
function build(){
 syncFromTakeoff();
 const d={};ids.forEach(id=>d[id]=val(id));
 const positive=['bpCount','bpCols','bpRows','bpPlateX','bpPlateZ','bpPlateT','bpBoltD','bpHoleD','bpEdgeX','bpEdgeZ','bpColumnX','bpColumnZ','bpProjection','bpEmbedment'];
 for(const k of positive)if(!(d[k]>0))throw Error('ورودی '+k+' باید عددی مثبت و مستند به طراحی/نقشه باشد.');
 if(d.bpCols>1&&!(d.bpPitchX>0))throw Error('فاصله بولت‌ها در راستای X باید مثبت باشد.');
 if(d.bpRows>1&&!(d.bpPitchZ>0))throw Error('فاصله بولت‌ها در راستای Z باید مثبت باشد.');
 if(d.bpCols===1&&!(d.bpPitchX>=0))throw Error('فاصله X نامعتبر است؛ برای یک ستون بولت صفر وارد کنید.');
 if(d.bpRows===1&&!(d.bpPitchZ>=0))throw Error('فاصله Z نامعتبر است؛ برای یک ردیف بولت صفر وارد کنید.');
 if(d.bpGrout===null||d.bpGrout<0)throw Error('ضخامت گروت باید وارد شود؛ اگر گروت وجود ندارد صفر وارد کنید.');
 if(!Number.isInteger(d.bpCount)||!Number.isInteger(d.bpCols)||!Number.isInteger(d.bpRows))throw Error('تعداد بولت و آرایش ردیف/ستون باید عدد صحیح باشد.');
 if(d.bpCols*d.bpRows!==d.bpCount)throw Error('تعداد بولت در هر پایه با حاصل‌ضرب تعداد ستون‌ها و ردیف‌ها برابر نیست.');
 if(d.bpHoleD<=d.bpBoltD)throw Error('قطر سوراخ باید از قطر بولت بزرگ‌تر باشد.');
 if(d.bpEdgeX<d.bpHoleD/2||d.bpEdgeZ<d.bpHoleD/2)throw Error('فاصله مرکز سوراخ تا لبه باید حداقل نصف قطر سوراخ باشد تا سوراخ از صفحه خارج نشود.');
 if(d.bpColumnX>=d.bpPlateX||d.bpColumnZ>=d.bpPlateZ)throw Error('ابعاد footprint ستون باید از ابعاد صفحه‌ستون کوچک‌تر باشد.');
 const fitX=2*d.bpEdgeX+(d.bpCols-1)*d.bpPitchX,fitZ=2*d.bpEdgeZ+(d.bpRows-1)*d.bpPitchZ;
 if(Math.abs(fitX-d.bpPlateX)>1||Math.abs(fitZ-d.bpPlateZ)>1)throw Error('ابعاد صفحه با فاصله محورها و فاصله مرکز بولت تا لبه تطابق ندارد (تلرانس ۱ میلی‌متر).');
 const bolts=[];for(let rz=0;rz<d.bpRows;rz++)for(let cx=0;cx<d.bpCols;cx++)bolts.push({mark:'AB-'+String(bolts.length+1).padStart(2,'0'),x:-d.bpPlateX/2+d.bpEdgeX+cx*d.bpPitchX,z:-d.bpPlateZ/2+d.bpEdgeZ+rz*d.bpPitchZ});
 const bases=window.SteelFoundationTakeoff?.getLast?.()?.rows||[];
 last={generatedAt:new Date().toISOString(),input:d,boltCoordinates:bolts,baseCount:bases.length,boltsPerBase:bolts.length,boltCountAllBases:bases.length?bases.length*bolts.length:null,plateMassPerBaseKg:d.bpPlateX/1000*d.bpPlateZ/1000*d.bpPlateT/1000*7850,limitations:['مختصات بولت‌ها با آرایش مستطیلی متقارن و فاصله‌های ورودی کاربر ساخته شده‌اند.','نقشه فقط هندسه را نشان می‌دهد؛ ظرفیت بولت، کشش/برش، خستگی، طول مهاری، مخروط بتن، pry-out، فاصله لبه آیین‌نامه‌ای و اندرکنش گروه بولت کنترل نشده است.','ابعاد و ضخامت صفحه‌ستون، footprint ستون، سوراخ، بیرون‌زدگی، مهاری و گروت باید از طراحی مصوب/محاسبات اتصال وارد شوند.','شکل انتهای بولت (قلاب، صفحه مهاری، مهره انتهایی یا نوع دیگر) ترسیم نشده و نباید از این شیت برای ساخت بولت استفاده شود.','جوش ستون به صفحه، سخت‌کننده‌ها، سوراخ‌های جوش و تلرانس نصب هنوز طراحی نشده‌اند.']};
 last.plan=planSvg(last);last.section=sectionSvg(last);render();return last;
}
function text(x,y,s,size=14,anchor='middle',color='#203746'){return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+color+'" font-family="Tahoma,Arial">'+esc(s)+'</text>';}
function planSvg(r){
 const d=r.input,scale=Math.min(500/d.bpPlateX,380/d.bpPlateZ),w=d.bpPlateX*scale,h=d.bpPlateZ*scale,x=550-w/2,y=330-h/2;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" width="100%" style="max-width:1100px;background:white"><rect width="1100" height="760" fill="white"/><rect x="20" y="20" width="1060" height="720" fill="none" stroke="#203746" stroke-width="2"/>'+text(1040,58,'صفحه‌ستون و آرایش بولت مهاری — پلان',24,'end')+text(1040,88,'ابعاد از ورودی صریح کاربر | ترسیم هندسی، بدون کنترل ظرفیت',13,'end','#64748b');
 s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#cbd5e1" stroke="#334155" stroke-width="3"/>';
 const cw=d.bpColumnX*scale,ch=d.bpColumnZ*scale;s+='<rect x="'+(550-cw/2)+'" y="'+(330-ch/2)+'" width="'+cw+'" height="'+ch+'" fill="#64748b" stroke="#0f172a" stroke-width="2"/>';
 r.boltCoordinates.forEach(b=>{const cx=550+b.x*scale,cy=330+b.z*scale;s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+Math.max(5,d.bpHoleD/2*scale)+'" fill="#fff" stroke="#b91c1c" stroke-width="3"/>'+text(cx,cy+4,b.mark,9);});
 s+=text(550,y+h+34,'صفحه '+fmt(d.bpPlateX,0)+' × '+fmt(d.bpPlateZ,0)+' mm | ضخامت '+fmt(d.bpPlateT,1)+' mm',15)+text(550,y+h+58,'ستون '+fmt(d.bpColumnX,0)+' × '+fmt(d.bpColumnZ,0)+' mm | '+r.boltsPerBase+' بولت در هر پایه',13);
 s+=text(80,680,'دایره قرمز: محور سوراخ/بولت | مستطیل خاکستری تیره: footprint ستون',12,'start','#b91c1c')+'</svg>';return s;
}
function sectionSvg(r){
 const d=r.input;let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 650" width="100%" style="max-width:1100px;background:white"><rect width="1100" height="650" fill="white"/><rect x="20" y="20" width="1060" height="610" fill="none" stroke="#203746" stroke-width="2"/>'+text(1040,58,'مقطع شماتیک صفحه‌ستون و بولت مهاری',24,'end');
 const vScale=Math.min(0.35,210/d.bpEmbedment),plateY=245,plateX=280,plateW=540,plateH=Math.max(6,d.bpPlateT*vScale),groutH=d.bpGrout*vScale,projectionH=d.bpProjection*vScale,embedmentH=d.bpEmbedment*vScale,concreteY=plateY+plateH+groutH;
 s+='<rect x="200" y="'+concreteY+'" width="700" height="'+Math.max(220,embedmentH+24)+'" fill="#d1d5db" stroke="#475569" stroke-width="2"/>';
 s+='<rect x="'+plateX+'" y="'+plateY+'" width="'+plateW+'" height="'+plateH+'" fill="#64748b" stroke="#1e293b" stroke-width="2"/>';
 s+='<rect x="470" y="'+(plateY-150)+'" width="160" height="150" fill="#94a3b8" stroke="#334155" stroke-width="2"/>';
 s+='<rect x="'+plateX+'" y="'+(plateY+plateH)+'" width="'+plateW+'" height="'+Math.max(2,groutH)+'" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>';
 const bx=[350,750];bx.forEach(x=>{s+='<line x1="'+x+'" y1="'+(plateY-projectionH)+'" x2="'+x+'" y2="'+(concreteY+embedmentH)+'" stroke="#b91c1c" stroke-width="7"/>';s+='<circle cx="'+x+'" cy="'+(plateY-12)+'" r="12" fill="#fff" stroke="#b91c1c" stroke-width="3"/>';});
 s+=text(550,plateY-165,'مقطع ستون (ابعاد footprint ورودی)',13)+text(550,plateY+plateH+groutH+18,'گروت '+fmt(d.bpGrout,0)+' mm',11)+text(550,concreteY+120,'بتن فونداسیون — شماتیک',16)+text(550,concreteY+165,'طول مهاری واردشده: '+fmt(d.bpEmbedment,0)+' mm | بیرون‌زدگی: '+fmt(d.bpProjection,0)+' mm',13)+text(550,590,'قلاب/صفحه انتهایی و جزئیات مهار بولت ترسیم نشده‌اند؛ این شکل برای ساخت بولت کافی نیست.',12,'middle','#b91c1c')+'</svg>';return s;
}
function render(){
 const host=$('baseplateAnchorDrawingPreview');if(!host||!last)return;
 host.innerHTML='<div class="notice">تعداد بولت در هر پایه: '+fmt(last.boltsPerBase,0)+' | تعداد پایه در آخرین استخراج: '+(last.baseCount||'نامشخص')+' | تعداد کل بولت: '+(last.boltCountAllBases??'نامشخص')+'</div><details open><summary>پلان صفحه‌ستون و بولت</summary>'+last.plan+'</details><details open><summary>مقطع شماتیک</summary>'+last.section+'</details><div style="overflow:auto"><table class="data-table"><thead><tr><th>مارک</th><th>مختصات X (mm)</th><th>مختصات Z (mm)</th><th>قطر بولت (mm)</th><th>قطر سوراخ (mm)</th></tr></thead><tbody>'+last.boltCoordinates.map(b=>'<tr><td>'+b.mark+'</td><td>'+fmt(b.x,1)+'</td><td>'+fmt(b.z,1)+'</td><td>'+fmt(last.input.bpBoltD,1)+'</td><td>'+fmt(last.input.bpHoleD,1)+'</td></tr>').join('')+'</tbody></table></div>';
}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);}
function print(){if(!last)build();const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>@page{size:A3 landscape;margin:8mm}body{font-family:Tahoma}svg{width:100%;height:auto;max-height:270mm;page-break-after:always}</style>'+last.plan+last.section+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function mount(){
 if($('baseplateAnchorDrawingsPanel'))return;const anchor=$('anchorBaseplatePanel')||$('foundationRebarDrawingsPanel')||$('constructionDrawingsPanel');if(!anchor)return;
 const p=document.createElement('section');p.className='panel';p.id='baseplateAnchorDrawingsPanel';
 p.innerHTML='<div class="panel-title"><h3>نقشه هندسی صفحه‌ستون و بولت مهاری — مرحله سوم</h3><span class="status">نیازمند ورودی اتصال</span></div><div class="notice">تمام ابعاد باید از طراحی اتصال یا نقشه مصوب وارد شوند. آرایش بولت مستطیلی و متقارن فرض می‌شود و با تعداد، فاصله محورها و فاصله مرکز بولت تا لبه کنترل هندسی می‌شود. هیچ ظرفیت یا مهار آیین‌نامه‌ای تأیید نمی‌شود.</div><div class="form-grid">'+
 [['bpCount','تعداد بولت در هر پایه'],['bpCols','تعداد ستون بولت در راستای X'],['bpRows','تعداد ردیف بولت در راستای Z'],['bpPlateX','عرض صفحه‌ستون X (mm)'],['bpPlateZ','طول صفحه‌ستون Z (mm)'],['bpPlateT','ضخامت صفحه‌ستون (mm)'],['bpBoltD','قطر بولت (mm)'],['bpHoleD','قطر سوراخ (mm)'],['bpPitchX','فاصله محور بولت‌ها در X (mm)'],['bpPitchZ','فاصله محور بولت‌ها در Z (mm)'],['bpEdgeX','فاصله مرکز بولت تا لبه صفحه در X (mm)'],['bpEdgeZ','فاصله مرکز بولت تا لبه صفحه در Z (mm)'],['bpColumnX','عرض footprint ستون در X (mm)'],['bpColumnZ','طول footprint ستون در Z (mm)'],['bpProjection','بیرون‌زدگی بولت از روی صفحه (mm)'],['bpEmbedment','طول مهاری واردشده زیر سطح بتن (mm)'],['bpGrout','ضخامت گروت زیر صفحه (mm)']].map(([id,label])=>'<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="number" min="0" step="1" placeholder="از نقشه/محاسبات اتصال"></div>').join('')+
 '</div><div class="button-grid"><button id="btnBuildBaseplateAnchorDrawings" class="btn primary" type="button">تولید نقشه صفحه‌ستون و بولت</button><button id="btnPrintBaseplateAnchorDrawings" class="btn secondary" type="button">چاپ / ذخیره PDF</button><button id="btnExportBaseplateAnchorCSV" class="btn secondary" type="button">خروجی مختصات بولت CSV</button></div><div id="baseplateAnchorDrawingPreview" class="notice">ابعاد و آرایش بولت را از طراحی اتصال وارد کنید.</div><div class="notice">توجه: شکل قلاب یا صفحه انتهایی، جوش، سخت‌کننده، کنترل ضخامت صفحه، کشش و برش بولت، شکست بتن و فاصله لبه آیین‌نامه‌ای در این مرحله طراحی نشده است. خروجی صرفاً نقشه هندسی مقدماتی است.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 $('btnBuildBaseplateAnchorDrawings').addEventListener('click',()=>{try{build();}catch(e){alert(e.message);}});
 $('btnPrintBaseplateAnchorDrawings').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportBaseplateAnchorCSV').addEventListener('click',()=>{try{if(!last)build();const lines=[['Mark','X_mm','Z_mm','Bolt_dia_mm','Hole_dia_mm'].join(','),...last.boltCoordinates.map(b=>[b.mark,b.x,b.z,last.input.bpBoltD,last.input.bpHoleD].join(','))];download('SAHROUD-STEEL-Anchor-Coordinates.csv',lines.join('\n'),'text/csv;charset=utf-8');}catch(e){alert(e.message);}});
}
window.SteelBaseplateAnchorDrawings={build,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();