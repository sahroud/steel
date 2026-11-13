/* SAHROUD STEEL — foundation reinforcement drawing sheets.
 * Geometry and bar counts are derived only from editable project inputs.
 * Straight bars only: no hooks, bends, laps, anchorage, or design verification.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
let last=null;
function getBaseData(){
 const api=window.SteelFoundationTakeoff,fd=api?.getData?.(),rep=api?.getLast?.();
 if(!fd||!Array.isArray(rep?.rows)||!rep.rows.length)throw Error('ابتدا تحلیل و استخراج واکنش فونداسیون را اجرا کنید.');
 const cover=fd.rebarCoverMm===''||fd.rebarCoverMm==null?null:Number(fd.rebarCoverMm);
 if(!Number.isFinite(cover)||cover<0)throw Error('پوشش بتن باید از نقشه یا مشخصات پروژه وارد شود؛ مقدار فرضی استفاده نمی‌شود.');
 const defs=[
  ['B-X','شبکه تحتانی، موازی X','bottomBarDiaXmm','bottomBarSpacingXmm','bottom','X'],
  ['B-Z','شبکه تحتانی، موازی Z','bottomBarDiaZmm','bottomBarSpacingZmm','bottom','Z'],
  ['T-X','شبکه فوقانی، موازی X','topBarDiaXmm','topBarSpacingXmm','top','X'],
  ['T-Z','شبکه فوقانی، موازی Z','topBarDiaZmm','topBarSpacingZmm','top','Z']
 ];
 const specs=defs.map(([mark,label,dk,sk,layer,direction])=>({mark,label,dia:Number(fd[dk]),spacing:Number(fd[sk]),layer,direction})).filter(s=>s.dia>0&&s.spacing>0);
 if(!specs.length)throw Error('قطر و فاصله شبکه‌های میلگرد را در بخش متره فونداسیون وارد کنید.');
 const bases=rep.rows.map(row=>{
  const fs=api.footingSpecFor(row),B=Number(fs.width),L=Number(fs.length),T=Number(fs.thickness);
  if(!(B>0&&L>0&&T>0))throw Error('ابعاد پی '+row.nodeId+' معتبر نیست.');
  return{...row,B,L,T,cover};
 });
 const bars=[];
 for(const base of bases)for(const s of specs){
  const cross=(s.direction==='X'?base.L:base.B)*1000-2*cover;
  const parallel=(s.direction==='X'?base.B:base.L)*1000-2*cover;
  if(cross<=0||parallel<=0||base.T*1000<=2*cover+s.dia)throw Error('پوشش یا قطر میلگرد با ابعاد پی '+base.nodeId+' سازگار نیست.');
  const count=Math.ceil(cross/s.spacing)+1,cutLengthM=parallel/1000,unitWeight=s.dia*s.dia/162;
  for(let j=0;j<count;j++)bars.push({mark:s.mark,baseNodeId:base.nodeId,layer:s.layer,direction:s.direction,diaMm:s.dia,spacingMm:s.spacing,position:j+1,count,cutLengthM,unitWeightKgM:unitWeight,weightKg:cutLengthM*unitWeight});
 }
 return{fd,rep,cover,specs,bases,bars};
}
function svgSheet(base,d){
 const W=1100,H=760,ox=540,oy=340,scale=Math.min(330/base.B,250/base.L),w=base.B*scale,h=base.L*scale,x=ox-w/2,y=oy-h/2;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:1100px;background:#fff"><rect width="100%" height="100%" fill="#fff"/><rect x="20" y="20" width="1060" height="720" fill="none" stroke="#203746" stroke-width="2"/>';
 s+='<text x="1040" y="58" text-anchor="end" font-size="24" font-family="Tahoma" fill="#203746">جزئیات شبکه آرماتور فونداسیون — '+esc(base.nodeId)+'</text>';
 s+='<text x="1040" y="88" text-anchor="end" font-size="14" font-family="Tahoma" fill="#526777">ابعاد پی '+fmt(base.B,2)+' × '+fmt(base.L,2)+' × '+fmt(base.T,2)+' m | پوشش واردشده '+fmt(d.cover,0)+' mm</text>';
 s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="3"/>';
 const colors={bottom:'#dc2626',top:'#2563eb'};
 for(const sp of d.specs){
  const cross=(sp.direction==='X'?base.L:base.B)*1000-2*d.cover,parallel=(sp.direction==='X'?base.B:base.L)*1000-2*d.cover,count=Math.ceil(cross/sp.spacing)+1;
  for(let j=0;j<count;j++){const p=count===1?.5:j/(count-1);if(sp.direction==='X'){const yy=y+d.cover/1000*scale+p*(h-2*d.cover/1000*scale);s+='<line x1="'+(x+d.cover/1000*scale)+'" y1="'+yy+'" x2="'+(x+w-d.cover/1000*scale)+'" y2="'+yy+'" stroke="'+colors[sp.layer]+'" stroke-width="2.4"/>';}else{const xx=x+d.cover/1000*scale+p*(w-2*d.cover/1000*scale);s+='<line x1="'+xx+'" y1="'+(y+d.cover/1000*scale)+'" x2="'+xx+'" y2="'+(y+h-d.cover/1000*scale)+'" stroke="'+colors[sp.layer]+'" stroke-width="2.4"/>';}}
 }
 s+='<text x="'+ox+'" y="'+(y+h+35)+'" text-anchor="middle" font-size="15" font-family="Tahoma" fill="#203746">پلان پی — شبکه‌های مستقیم؛ مقیاس شماتیک</text>';
 const sx=165,sy=565,sw=770,sh=95,topY=sy,bottomY=sy+sh;
 s+='<rect x="'+sx+'" y="'+sy+'" width="'+sw+'" height="'+sh+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>';
 if(d.specs.some(q=>q.layer==='top'))s+='<line x1="'+(sx+18)+'" y1="'+(topY+12)+'" x2="'+(sx+sw-18)+'" y2="'+(topY+12)+'" stroke="#2563eb" stroke-width="4"/>';
 if(d.specs.some(q=>q.layer==='bottom'))s+='<line x1="'+(sx+18)+'" y1="'+(bottomY-12)+'" x2="'+(sx+sw-18)+'" y2="'+(bottomY-12)+'" stroke="#dc2626" stroke-width="4"/>';
 s+='<text x="'+(sx+sw/2)+'" y="'+(sy-18)+'" text-anchor="middle" font-size="15" font-family="Tahoma" fill="#203746">مقطع شماتیک ضخامت پی</text>';
 s+='<text x="80" y="705" font-size="14" font-family="Tahoma" fill="#2563eb">آبی: شبکه فوقانی (در صورت ورود مشخصات)</text><text x="565" y="705" font-size="14" font-family="Tahoma" fill="#dc2626">قرمز: شبکه تحتانی</text>';
 s+='<text x="1040" y="725" text-anchor="end" font-size="12" font-family="Tahoma" fill="#92400e">بدون قلاب، خم، وصله، مهاری و تقویت موضعی — نقشه مقدماتی، نه نقشه مصوب اجرا</text></svg>';
 return s;
}
function build(){
 const d=getBaseData(),marks={};
 d.bars.forEach(b=>{const k=b.baseNodeId+'|'+b.mark;if(!marks[k])marks[k]={...b,totalCount:0,totalLengthM:0,totalWeightKg:0};marks[k].totalCount++;marks[k].totalLengthM+=b.cutLengthM;marks[k].totalWeightKg+=b.weightKg;});
 const rows=Object.values(marks).map(r=>({...r,barLengthM:r.cutLengthM}));
 last={generatedAt:new Date().toISOString(),coverMm:d.cover,baseCount:d.bases.length,barCount:d.bars.length,bars:d.bars,barSchedule:rows,sheets:d.bases.map(base=>({baseNodeId:base.nodeId,svg:svgSheet(base,d)})),limitations:['ابعاد هر پی از جدول مستقل فونداسیون خوانده شده است.','تعداد میلگردها با کف‌گیری عرض خالص/فاصله + ۱ محاسبه شده و در نقشه نشان داده می‌شود.','طول برش مستقیم برابر بعد موازی منهای دو برابر پوشش است؛ خم، قلاب، وصله، مهاری و پرت منظور نشده‌اند.','این خروجی متره/ترسیم هندسی است، نه طراحی مقاومت خمشی، برش یک‌طرفه یا پانچ و نه تأیید آیین‌نامه‌ای.','شبکه فوقانی فقط در صورت ورود قطر و فاصله مستقل ترسیم می‌شود.']};
 render();return last;
}
function render(){
 const host=$('foundationRebarDrawingPreview');if(!host||!last)return;
 host.innerHTML='<div class="notice">تعداد پی: '+fmt(last.baseCount,0)+' | تعداد شاخه‌های مستقیم شبکه: '+fmt(last.barCount,0)+' | پوشش واردشده: '+fmt(last.coverMm,0)+' mm</div>'+last.sheets.map(s=>'<details open style="margin:10px 0"><summary>نقشه شبکه آرماتور — '+esc(s.baseNodeId)+'</summary><div style="overflow:auto;border:1px solid #cbd5e1">'+s.svg+'</div></details>').join('')+'<div style="overflow:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>پایه</th><th>مارک</th><th>جهت</th><th>لایه</th><th>قطر</th><th>فاصله</th><th>تعداد</th><th>طول هر شاخه (m)</th><th>طول کل (m)</th><th>وزن (kg)</th></tr></thead><tbody>'+last.barSchedule.map(r=>'<tr>'+[r.baseNodeId,r.mark,r.direction,r.layer==='bottom'?'تحتانی':'فوقانی',r.diaMm,r.spacingMm,r.totalCount,fmt(r.barLengthM,3),fmt(r.totalLengthM,3),fmt(r.totalWeightKg,2)].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);}
function print(){if(!last)build();const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>Foundation rebar drawings</title><style>@page{size:A3 landscape;margin:8mm}body{font-family:Tahoma}section{page-break-after:always}svg{width:100%;height:auto;max-height:275mm}</style>'+last.sheets.map(s=>'<section>'+s.svg+'</section>').join('')+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function mount(){
 if($('foundationRebarDrawingsPanel'))return;const anchor=$('constructionDrawingsPanel')||$('foundationTakeoffPanel');if(!anchor)return;
 const p=document.createElement('section');p.className='panel';p.id='foundationRebarDrawingsPanel';
 p.innerHTML='<div class="panel-title"><h3>نقشه آرماتوربندی پی و جدول برش — مرحله دوم</h3><span class="status">مبتنی بر ورودی واقعی</span></div><div class="notice">برای هر پایه، ابعاد از جدول مستقل پی خوانده می‌شود. پوشش بتن اجباری است و مقدار پیش‌فرض ندارد. قطر و فاصله شبکه تحتانی/فوقانی از ورودی‌های متره فونداسیون خوانده می‌شود. فعلاً فقط میلگردهای مستقیم محاسبه می‌شوند.</div><div class="button-grid"><button id="btnBuildFoundationRebarSheets" class="btn primary" type="button">تولید نقشه و جدول میلگرد</button><button id="btnPrintFoundationRebarSheets" class="btn secondary" type="button">چاپ / ذخیره PDF</button><button id="btnExportFoundationRebarCSV" class="btn secondary" type="button">خروجی CSV لیستوفر مقدماتی</button></div><div id="foundationRebarDrawingPreview" class="notice">پس از تحلیل و ورود پوشش و شبکه‌ها، نقشه را تولید کنید.</div><div class="notice">مرحله بعدی: طراحی و ترسیم آرماتور شناژ با قلاب و مهاری مطابق ضوابط، سپس جزئیات پدستال و صفحه‌ستون/انکربولت. تا وقتی طول مهاری و خم‌ها کنترل نشده‌اند، نقشه ساخت میلگرد صادر نمی‌شود.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 $('btnBuildFoundationRebarSheets').addEventListener('click',()=>{try{build();}catch(e){alert(e.message);}});
 $('btnPrintFoundationRebarSheets').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportFoundationRebarCSV').addEventListener('click',()=>{try{if(!last)build();const head=['Base','Mark','Layer','Direction','Diameter_mm','Spacing_mm','Count','CutLength_m','TotalLength_m','Weight_kg'];const lines=[head.join(','),...last.barSchedule.map(r=>[r.baseNodeId,r.mark,r.layer,r.direction,r.diaMm,r.spacingMm,r.totalCount,r.barLengthM,r.totalLengthM,r.totalWeightKg].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','))];download('SAHROUD-STEEL-Foundation-Rebar-Schedule.csv','\ufeff'+lines.join('\n'),'text/csv;charset=utf-8');}catch(e){alert(e.message);}});
}
window.SteelFoundationRebarDrawings={build,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();