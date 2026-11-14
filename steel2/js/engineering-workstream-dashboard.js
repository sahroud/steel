/* SAHROUD STEEL — engineering workstream dashboard; status is explicit, not inferred as approval. */
(function(root){
"use strict";
const phases=[
{id:"P0",name:"پایه نرم‌افزار، پروژه و مجوز",status:"active",gate:"پایداری ذخیره‌سازی، نسخه‌بندی و مجوز"},
{id:"P1",name:"ورودی‌ها و هندسه سه‌بعدی",status:"in_progress",gate:"هندسه، واحدها، محورهای محلی و قیود تأییدشده"},
{id:"P2",name:"مبنای آیین‌نامه و بارگذاری",status:"in_progress",gate:"ویرایش آیین‌نامه، اقلیم، بارها و ترکیبات مستند"},
{id:"P3",name:"تحلیل سه‌بعدی و کنترل تعادل",status:"in_progress",gate:"بنچمارک مستقل، تعادل و پوش نیروهای همزمان"},
{id:"P4",name:"طراحی اعضای فولادی",status:"partial",gate:"کشش، فشار، خمش، برش، پیچش و اندرکنش"},
{id:"P5",name:"جرثقیل سقفی ۳۰ تن",status:"partial",gate:"واکنش چرخ، ضربه، نیروهای جانبی، خستگی و مسیر بار"},
{id:"P6",name:"اتصالات و صفحه‌ستون",status:"partial",gate:"پیچ، جوش، ورق گاست، سخت‌کننده و انتقال نیرو"},
{id:"P7",name:"فونداسیون و شناژ",status:"partial",gate:"واکنش معتبر، خاک، پایداری، بتن و آرماتور"},
{id:"P8",name:"نقشه‌ها و متره",status:"planned",gate:"نقشه قابل ساخت، جزئیات و تطبیق مقادیر"},
{id:"P9",name:"گزارش و کنترل کیفیت",status:"in_progress",gate:"ردیابی ورودی تا خروجی و گزارش خطا/هشدار"},
{id:"P10",name:"انتشار و پذیرش",status:"planned",gate:"تست مرورگر، امنیت، مستندات و پذیرش کاربر"}
];
const labels={active:"در حال انجام",in_progress:"توسعه جاری",partial:"ناقص / محدود",planned:"برنامه‌ریزی‌شده"};
function render(){
 if(document.getElementById("engineeringRoadmapPanel"))return;const anchor=document.querySelector("main .welcome");if(!anchor)return;
 const panel=document.createElement("section");panel.className="panel";panel.id="engineeringRoadmapPanel";
 const rows=phases.map(p=>'<div class="roadmap-row"><div class="roadmap-id">'+p.id+'</div><div class="roadmap-main"><strong>'+p.name+'</strong><small>دروازه پذیرش: '+p.gate+'</small></div><span class="roadmap-state state-'+p.status+'">'+labels[p.status]+'</span></div>').join("");
 panel.innerHTML='<div class="panel-title"><h3>نقشه راه و وضعیت گام‌های توسعه SAHROUD STEEL</h3><span class="status">نمای برنامه‌ریزی</span></div><p class="notice">وضعیت‌ها نشان‌دهنده پیشرفت نرم‌افزار هستند، نه تأیید مهندسی یا صلاحیت طراحی. هر فاز تا عبور از دروازه پذیرش خودش قابل انتشار نهایی نیست.</p><div class="roadmap-list">'+rows+'</div><div class="notice roadmap-foot"><strong>مسیر بحرانی بعدی:</strong> دریافت خروجی هندسی معتبر از مدل مبدأ ← تطبیق گره‌ها و اعضا ← تکمیل مقاطع و قیود ← اتصال کنترل‌شده به مدل تحلیل ← آزمون تعادل و بنچمارک مستقل.</div>';
 anchor.parentNode.insertBefore(panel,anchor.nextSibling);
 const style=document.createElement("style");style.textContent='#engineeringRoadmapPanel .roadmap-list{display:grid;gap:7px}.roadmap-row{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--card,#fff)}.roadmap-id{font-weight:800;color:var(--navy);min-width:34px}.roadmap-main{flex:1;display:grid;gap:3px}.roadmap-main small{color:var(--muted,#647783);font-size:12px}.roadmap-state{font-size:11px;padding:4px 8px;border-radius:20px;background:#edf1f4;color:#445}.state-active,.state-in_progress{background:#e8f2f8;color:#14536b}.state-partial{background:#fff4df;color:#815400}.state-planned{background:#f0f0f0;color:#555}.roadmap-foot{margin-top:12px}';document.head.appendChild(style);
}
root.SteelEngineeringRoadmap={phases:phases.map(x=>({...x})),getSummary(){return phases.reduce((a,p)=>(a[p.status]=(a[p.status]||0)+1,a),{});}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})(window);