/* SAHROUD STEEL V3 - preliminary isolated footing service bearing screen.
 * Not a footing design: no settlement, punching, one-way shear, flexure,
 * reinforcement, sliding, overturning, groundwater or seismic checks.
 */
(function () {
 "use strict";
 const form=document.getElementById("projectForm");
 const button=document.getElementById("foundationScreenBtn");
 const output=document.getElementById("foundationScreenResult");
 if(!form||!button||!output)return;
 const value=n=>{const e=form.elements.namedItem(n);if(!e||String(e.value).trim()==="")return NaN;return Number(e.value);};
 const fmt=n=>Number(n).toFixed(2);
 const caseSelect=document.getElementById("foundationReactionCase");
 const nodeSelect=document.getElementById("foundationReactionNode");
 const reactionOutput=document.getElementById("foundationReactionResult");
 const readReactions=()=>{
  if(!caseSelect||!nodeSelect||!reactionOutput)return;
  const all=window.SahroudSteelV3AnalysisResults;
  const result=all&&all[caseSelect.value];
  nodeSelect.innerHTML="";
  if(!result||!Array.isArray(result.supportReactionsAll)||!result.supportReactionsAll.length){
   nodeSelect.add(new Option("تحلیلی برای این حالت موجود نیست",""));
   reactionOutput.textContent="ابتدا تحلیل بار سقف را اجرا کنید. فقط واکنش‌های تکیه‌گاهی واقعیِ ذخیره‌شده در همین نشست قابل خواندن‌اند.";
   return;
  }
  result.supportReactionsAll.forEach(r=>nodeSelect.add(new Option("گره "+r.nodeId,""+r.nodeId)));
  reactionOutput.textContent="واکنش‌های حالت انتخاب‌شده آماده‌اند. گره موردنظر را انتخاب کنید.";
 };
 document.getElementById("foundationReactionRefresh")?.addEventListener("click",readReactions);
 caseSelect?.addEventListener("change",readReactions);
 nodeSelect?.addEventListener("change",()=>{
  const r=window.SahroudSteelV3AnalysisResults?.[caseSelect.value]?.supportReactionsAll?.find(x=>String(x.nodeId)===nodeSelect.value);
  if(!r){reactionOutput.textContent="واکنش گره انتخاب‌شده پیدا نشد.";return;}
  const v=r.values;
  reactionOutput.textContent="گره "+r.nodeId+" | نیروها (kN): Fx="+fmt(v[0]/1000)+" ، Fy="+fmt(v[1]/1000)+" ، Fz="+fmt(v[2]/1000)+
   "\\nلنگرها (kN.m): Mx="+fmt(v[3]/1000)+" ، My="+fmt(v[4]/1000)+" ، Mz="+fmt(v[5]/1000)+
   "\\nمحور قائم مدل Y است. اینها واکنش یک حالت بار منفردند، نه ترکیب بار خدمت.";
 });
 document.getElementById("foundationReactionImport")?.addEventListener("click",()=>{
  const r=window.SahroudSteelV3AnalysisResults?.[caseSelect?.value]?.supportReactionsAll?.find(x=>String(x.nodeId)===nodeSelect?.value);
  if(!r){reactionOutput.textContent="ابتدا تحلیل بار را اجرا و گره تکیه‌گاهی را انتخاب کنید.";return;}
  const vertical=Number(r.values[1])/1000;
  if(!Number.isFinite(vertical)||Math.abs(vertical)<1e-9){reactionOutput.textContent="واکنش قائم این گره در حالت انتخاب‌شده تقریباً صفر است؛ انتقال انجام نشد.";return;}
  form.elements.namedItem("footingN").value=String(Math.abs(vertical));
  form.elements.namedItem("footingMx").value="";
  form.elements.namedItem("footingMy").value="";
  reactionOutput.textContent="قدر مطلق واکنش قائم "+fmt(Math.abs(vertical))+" kN در N قرار گرفت. لنگرهای پی عمداً منتقل نشدند؛ محورهای محلی پی و ترکیب بار خدمت هنوز تعیین نشده‌اند. از یک حالت بار منفرد برای طراحی نهایی استفاده نکنید.";
 });
 button.addEventListener("click",()=>{
  try{
   const B=value("footingWidth"),L=value("footingLength"),qa=value("soilQa");
   const N=value("footingN"),Mx=value("footingMx"),My=value("footingMy");
   const missing=[];
   if(!(B>0))missing.push("عرض پی");
   if(!(L>0))missing.push("طول پی");
   if(!(qa>0))missing.push("ظرفیت مجاز خاک");
   if(!(N>0))missing.push("نیروی محوری فشاری خدمت N");
   if(!Number.isFinite(Mx))missing.push("لنگر حول محور x");
   if(!Number.isFinite(My))missing.push("لنگر حول محور y");
   if(missing.length)throw Error("ورودی‌های لازم کامل نیست: "+missing.join("، "));
   if(!form.elements.namedItem("soilQaBasis")?.value)throw Error("مبنای ظرفیت مجاز خاک (خالص/ناخالص) را انتخاب کنید.");
   const A=B*L;
   const q0=N/A;
   const dx=6*Math.abs(Mx)/(B*L*L);
   const dy=6*Math.abs(My)/(L*B*B);
   const qmax=q0+dx+dy,qmin=q0-dx-dy;
   const ex=Math.abs(My)/N,ey=Math.abs(Mx)/N;
   const kernX=B/6,kernY=L/6;
   const bearing=qmax<=qa;
   const fullContact=qmin>=0;
   const kern=ex<=kernX&&ey<=kernY;
   const lines=[
    "غربال مقدماتی فشار زیر پی — نه طراحی فونداسیون",
    "ابعاد پی: "+fmt(B)+" × "+fmt(L)+" متر | مساحت: "+fmt(A)+" مترمربع",
    "N خدمت: "+fmt(N)+" kN | Mx: "+fmt(Mx)+" kN.m | My: "+fmt(My)+" kN.m",
    "q میانگین: "+fmt(q0)+" kPa | q حداقل تقریبی: "+fmt(qmin)+" kPa | q حداکثر تقریبی: "+fmt(qmax)+" kPa",
    "ظرفیت مجاز واردشده: "+fmt(qa)+" kPa ("+form.elements.namedItem("soilQaBasis").value+")",
    "خروج از مرکزیت: ex="+fmt(ex)+" m ، ey="+fmt(ey)+" m",
    "کنترل مقدماتی qmax ≤ qa: "+(bearing?"قبول در این غربال":"رد؛ ابعاد/بار/ظرفیت خاک باید بازبینی شود"),
    "تماس فشاری کامل (qmin ≥ 0): "+(fullContact?"برقرار":"برقرار نیست؛ تحلیل تماس جزئی و طراحی ویژه لازم است"),
    "قرارگیری برآیند در هسته مرکزی: "+(kern?"برقرار":"برقرار نیست"),
    "",
    "محدودیت: این محاسبه با توزیع خطی فشار برای پی صلب و بدون وزن پی/خاک روی آن انجام شده است. خالص/ناخالص بودن qa باید با تعریف بارها سازگار شود.",
    "نشست، لغزش، واژگونی کلی، پانچ، برش یک‌طرفه، خمش، آرماتور، طول مهاری، برش پانچ ستون، اثر زلزله و اندرکنش گروه پی کنترل نشده‌اند. نتیجه مجوز اجرا یا تأیید پی نیست."
   ];
   output.textContent=lines.join("\n");
  }catch(e){output.textContent="کنترل انجام نشد: "+e.message;}
 });
})();