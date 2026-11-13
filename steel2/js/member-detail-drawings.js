/* SAHROUD STEEL — geometric individual member sheets from the analytical model.
 * These are axis/geometry sheets, not fabrication drawings; connection details are not inferred.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=3)=>Number(v).toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
let last=null,selectedId='';
function collect(){
 const model=window.SteelStructuralModel?.getData?.()||window.SteelStructuralModel?.model;
 if(!model?.nodes?.length||!model?.members?.length)throw Error('ابتدا مدل سه‌بعدی سازه را بسازید.');
 const map=new Map(model.nodes.map(n=>[String(n.id),n]));
 const members=model.members.map(m=>{
  const a=map.get(String(m.start)),b=map.get(String(m.end));
  if(!a||!b) return {...m,valid:false,reason:'گره ابتدا یا انتها پیدا نشد.'};
  const dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y),dz=Number(b.z)-Number(a.z),length=Math.hypot(dx,dy,dz);
  return {...m,valid:Number.isFinite(length)&&length>0,from:{x:Number(a.x),y:Number(a.y),z:Number(a.z)},to:{x:Number(b.x),y:Number(b.y),z:Number(b.z)},computedLengthM:length,storedLengthM:Number.isFinite(Number(m.length))?Number(m.length):null,lengthDifferenceM:Number.isFinite(Number(m.length))?Number(m.length)-length:null};
 });
 return{model,members};
}
function svgFor(m){
 const a=m.from,b=m.to,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=m.computedLengthM;
 const W=1200,H=760,scale=Math.min(760/Math.max(Math.abs(dx)+Math.abs(dz)*.55,1),420/Math.max(Math.abs(dy)+Math.abs(dz)*.25,1),130/Math.max(len,1)*Math.max(len,1));
 const proj=p=>({x:590+(p.x-a.x)*scale+(p.z-a.z)*scale*.55,y:380-(p.y-a.y)*scale+(p.z-a.z)*scale*.28});
 const p1=proj(a),p2=proj(b),mid={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2};
 const profile=String(m.sectionKey||'نامشخص'),cut=Number.isFinite(Number(m.fabricationLengthM))?Number(m.fabricationLengthM):null;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:1200px;background:white"><rect width="1200" height="760" fill="white"/><rect x="20" y="20" width="1160" height="720" fill="none" stroke="#203746" stroke-width="2"/>';
 const tx=(x,y,t,z=15,c='#203746',anchor='middle')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+z+'" fill="'+c+'" font-family="Tahoma,Arial">'+esc(t)+'</text>';
 s+=tx(1130,58,'برگه هندسی عضو سازه — '+m.id,24,'#203746','end')+tx(1130,88,'گروه مقطع: '+profile+' | طول محور محاسبه‌شده: '+fmt(len)+' m',14,'#64748b','end');
 s+='<line x1="'+p1.x+'" y1="'+p1.y+'" x2="'+p2.x+'" y2="'+p2.y+'" stroke="#0f766e" stroke-width="16" stroke-linecap="round"/><circle cx="'+p1.x+'" cy="'+p1.y+'" r="10" fill="#1d4ed8"/><circle cx="'+p2.x+'" cy="'+p2.y+'" r="10" fill="#b91c1c"/>';
 s+=tx(p1.x,p1.y-20,'ابتدا '+m.start,12,'#1d4ed8')+tx(p2.x,p2.y-20,'انتها '+m.end,12,'#b91c1c')+tx(mid.x,mid.y-26,'L = '+fmt(len)+' m',18,'#0f766e');
 const rows=[['مختصات ابتدا',fmt(a.x)+', '+fmt(a.y)+', '+fmt(a.z)+' m'],['مختصات انتها',fmt(b.x)+', '+fmt(b.y)+', '+fmt(b.z)+' m'],['ΔX / ΔY / ΔZ',fmt(dx)+' / '+fmt(dy)+' / '+fmt(dz)+' m'],['طول ذخیره‌شده در مدل',m.storedLengthM===null?'ثبت نشده':fmt(m.storedLengthM)+' m'],['اختلاف طول مدل و مختصات',m.lengthDifferenceM===null?'قابل مقایسه نیست':fmt(m.lengthDifferenceM)+' m'],['طول ساخت ثبت‌شده',cut===null?'ثبت نشده':fmt(cut)+' m'],['قطعه فیزیکی',m.physicalPiece===true?'بله':m.physicalPiece===false?'خیر/نامشخص':'ثبت نشده'],['رکورد ساخت',m.fabricationRecord===true?'دارد':m.fabricationRecord===false?'ندارد':'ثبت نشده']];
 rows.forEach((r,i)=>{const y=520+i*25;s+='<line x1="140" y1="'+(y+8)+'" x2="1060" y2="'+(y+8)+'" stroke="#e2e8f0"/>'+tx(1020,y,r[0],12,'#475569','end')+tx(500,y,r[1],12,'#203746');});
 s+=tx(600,725,'این برگه فقط هندسه محور عضو را نشان می‌دهد؛ مقطع واقعی، برش، سوراخ‌کاری، ورق اتصال، جوش و پیچ در آن طراحی نشده‌اند.',12,'#b91c1c');
 return s+'</svg>';
}
function build(id){
 const d=collect(),m=d.members.find(x=>String(x.id)===String(id||selectedId)||x.valid);
 if(!m||!m.valid)throw Error(m?.reason||'عضو معتبری برای ترسیم وجود ندارد.');
 selectedId=String(m.id);
 const section=svgFor(m);
 last={generatedAt:new Date().toISOString(),member:{id:m.id,sectionKey:m.sectionKey||null,start:m.start,end:m.end,from:m.from,to:m.to,computedLengthM:m.computedLengthM,storedLengthM:m.storedLengthM,lengthDifferenceM:m.lengthDifferenceM,fabricationLengthM:Number.isFinite(Number(m.fabricationLengthM))?Number(m.fabricationLengthM):null,physicalPiece:m.physicalPiece??null,fabricationRecord:m.fabricationRecord??null},svg:section,limitations:['برگه فقط مختصات و طول هندسی محور عضو را نشان می‌دهد.','سطح مقطع، ابعاد بال و جان، ضخامت ورق، سوراخ‌کاری، پیچ، جوش، پخ و طول برش قطعی از این داده‌ها استخراج نشده‌اند.','عضوهای تحلیلی ممکن است به چند قطعه ساخت تقسیم شوند یا چند قطعه ساخت به چند المان تحلیلی شکسته شده باشند؛ شناسه المان به‌تنهایی شناسه قطعه کارگاهی نیست.','تا تکمیل طراحی اتصال و تفکیک قطعات فیزیکی، این برگه نقشه ساخت یا مونتاژ محسوب نمی‌شود.']};
 render(d.members);return last;
}
function render(members){
 const host=$('memberDetailDrawingPreview'),sel=$('memberDetailSelect');if(!host||!sel||!last)return;
 host.innerHTML='<div class="notice">عضو انتخاب‌شده: '+esc(last.member.id)+' | طول هندسی: '+fmt(last.member.computedLengthM)+' m | طول ساخت: '+(last.member.fabricationLengthM===null?'ثبت نشده':fmt(last.member.fabricationLengthM)+' m')+'</div>'+last.svg;
}
function refreshSelect(){
 const sel=$('memberDetailSelect');if(!sel)return;const d=collect(),old=sel.value||selectedId;
 sel.innerHTML=d.members.map(m=>'<option value="'+esc(m.id)+'" '+(String(m.id)===String(old)?'selected':'')+'>'+esc(m.id)+' — '+esc(m.sectionKey||'بدون مقطع')+'</option>').join('');
 if(!d.members.length)sel.innerHTML='<option value="">عضوی وجود ندارد</option>';
}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);}
function print(){if(!last)build($('memberDetailSelect')?.value);const w=window.open('','_blank');if(!w)throw Error('پنجره چاپ مسدود شده است.');w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>@page{size:A3 landscape;margin:8mm}body{font-family:Tahoma}svg{width:100%;height:auto}</style>'+last.svg+'</html>');w.document.close();w.focus();setTimeout(()=>w.print(),500);}
function exportCSV(){
 const d=collect(),rows=[['MemberId','SectionKey','StartNode','EndNode','StartX_m','StartY_m','StartZ_m','EndX_m','EndY_m','EndZ_m','AxisLength_m','StoredLength_m','FabricationLength_m','PhysicalPiece','FabricationRecord']];
 d.members.forEach(m=>rows.push([m.id,m.sectionKey||'',m.start,m.end,m.from?.x??'',m.from?.y??'',m.from?.z??'',m.to?.x??'',m.to?.y??'',m.to?.z??'',m.computedLengthM??'',m.storedLengthM??'',m.fabricationLengthM??'',m.physicalPiece??'',m.fabricationRecord??'']));
 download('SAHROUD-STEEL-Member-Geometry-Schedule.csv','\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv;charset=utf-8');
}
function mount(){
 if($('memberDetailDrawingsPanel'))return;const anchor=$('baseplateAnchorDrawingsPanel')||$('constructionDrawingsPanel');if(!anchor)return;
 const p=document.createElement('section');p.className='panel';p.id='memberDetailDrawingsPanel';
 p.innerHTML='<div class="panel-title"><h3>برگه هندسی تک‌عضو و جدول اعضای مدل — مرحله چهارم</h3><span class="status">استخراج از مدل سه‌بعدی</span></div><div class="notice">یک عضو را انتخاب کنید تا برگه هندسی محور آن ساخته شود. طول از مختصات واقعی دو گره دوباره محاسبه می‌شود و با طول ذخیره‌شده مقایسه خواهد شد. این برگه نقشه ساخت کارگاهی نیست.</div><div class="form-grid"><div class="field"><label for="memberDetailSelect">انتخاب عضو</label><select id="memberDetailSelect"></select></div></div><div class="button-grid"><button id="btnRefreshMemberDetails" class="btn secondary" type="button">به‌روزرسانی فهرست اعضا</button><button id="btnBuildMemberDetail" class="btn primary" type="button">تولید برگه عضو</button><button id="btnPrintMemberDetail" class="btn secondary" type="button">چاپ / ذخیره PDF</button><button id="btnExportMemberGeometry" class="btn secondary" type="button">خروجی CSV تمام اعضا</button></div><div id="memberDetailDrawingPreview" class="notice">ابتدا مدل سه‌بعدی را بسازید.</div><div class="notice">مرحله بعد: تفکیک قطعات فیزیکی از المان‌های تحلیل و طراحی واقعی اتصالات، سپس تولید نقشه تک‌قطعه و مونتاژ شامل ورق، سوراخ، پیچ، جوش و لیست برش.</div>';
 anchor.parentNode.insertBefore(p,anchor.nextSibling);
 $('btnRefreshMemberDetails').addEventListener('click',()=>{try{refreshSelect();}catch(e){alert(e.message);}});
 $('btnBuildMemberDetail').addEventListener('click',()=>{try{build($('memberDetailSelect').value);}catch(e){alert(e.message);}});
 $('btnPrintMemberDetail').addEventListener('click',()=>{try{print();}catch(e){alert(e.message);}});
 $('btnExportMemberGeometry').addEventListener('click',()=>{try{exportCSV();}catch(e){alert(e.message);}});
 try{refreshSelect();}catch(_){}
}
window.SteelMemberDetailDrawings={build,refreshSelect,getLast:()=>last?JSON.parse(JSON.stringify(last)):null,exportCSV};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();