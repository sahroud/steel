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
  const previousNode=nodeSelect.value;
  const all=window.SahroudSteelV3AnalysisResults;
  const result=all&&all[caseSelect.value];
  nodeSelect.innerHTML="";
  if(!result||!Array.isArray(result.supportReactionsAll)||!result.supportReactionsAll.length){
   nodeSelect.add(new Option("تحلیلی برای این حالت موجود نیست",""));
   reactionOutput.textContent="ابتدا تحلیل بار سقف را اجرا کنید. فقط واکنش‌های تکیه‌گاهی واقعیِ ذخیره‌شده در همین نشست قابل خواندن‌اند.";
   return;
  }
  result.supportReactionsAll.forEach(r=>nodeSelect.add(new Option("گره "+r.nodeId,""+r.nodeId)));
  if([...nodeSelect.options].some(o=>o.value===previousNode))nodeSelect.value=previousNode;
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
  form.elements.namedItem("footingMz").value="";
  reactionOutput.textContent="قدر مطلق واکنش قائم "+fmt(Math.abs(vertical))+" kN در N قرار گرفت. لنگرهای پی عمداً منتقل نشدند؛ محورهای محلی پی و ترکیب بار خدمت هنوز تعیین نشده‌اند. از یک حالت بار منفرد برای طراحی نهایی استفاده نکنید.";
 });

 /* User-entered factors only; this module does not prescribe code combinations. */
 const comboButton=document.getElementById("reactionComboCalculate");
 const comboOut=document.getElementById("reactionComboResult");
 const comboCases=["DEAD_ROOF","LIVE_ROOF","BALANCED_SNOW_ROOF","WIND_FROM_LEFT","WIND_FROM_RIGHT"];
 const comboLabels={DEAD_ROOF:"G",LIVE_ROOF:"Q",BALANCED_SNOW_ROOF:"S",WIND_FROM_LEFT:"W+",WIND_FROM_RIGHT:"W−"};
 const getCombo=()=>{
  const selectedNode=nodeSelect?.value;
  if(!selectedNode)throw Error("ابتدا تحلیل بار را اجرا و گره تکیه‌گاهی را انتخاب کنید.");
  const factors={};
  for(const name of comboCases){
   const el=document.getElementById("factor"+name);
   if(!el||String(el.value).trim()===""||!Number.isFinite(Number(el.value)))throw Error("ضریب "+comboLabels[name]+" را صریحاً وارد کنید؛ برای ضریب صفر عدد 0 بنویسید.");
   factors[name]=Number(el.value);
  }
  const all=window.SahroudSteelV3AnalysisResults;
  const total=[0,0,0,0,0,0];
  const detail=[];
  for(const name of comboCases){
   const result=all?.[name];
   const reaction=result?.supportReactionsAll?.find(x=>String(x.nodeId)===selectedNode);
   if(!reaction)throw Error("واکنش حالت "+comboLabels[name]+" برای این گره موجود نیست؛ همه پنج حالت باید تحلیل شده باشند.");
   for(let i=0;i<6;i++)total[i]+=factors[name]*Number(reaction.values[i]||0);
   detail.push(comboLabels[name]+"="+factors[name]);
  }
  return {nodeId:selectedNode,factors,total,name:document.getElementById("reactionComboName")?.value||"ترکیب کاربر",detail};
 };

 const comboStore=document.getElementById("reactionComboStore");
 const comboEnvelope=document.getElementById("reactionComboEnvelope");
 const comboList=document.getElementById("reactionComboList");
 const envelopeOut=document.getElementById("reactionComboEnvelopeResult");
 const storedCombos=[];
 comboStore?.addEventListener("click",()=>{
  try{
   const r=getCombo();
   if(storedCombos.some(x=>x.nodeId===r.nodeId&&x.name===r.name))throw Error("ترکیبی با همین نام برای این گره قبلاً ثبت شده است.");
   storedCombos.push({...r,total:[...r.total],createdAt:new Date().toISOString()});
   window.SahroudSteelV3ReactionCombos=storedCombos;
   comboList.textContent=storedCombos.map((x,i)=>(i+1)+") "+x.name+" | گره "+x.nodeId+" | "+x.detail.join("، ")).join("\\n");
   envelopeOut.textContent="ترکیب ثبت شد. برای پوش، حداقل دو ترکیب برای یک گره ثبت کنید.";
  }catch(e){envelopeOut.textContent="ثبت ترکیب ناموفق: "+e.message;}
 });
 comboEnvelope?.addEventListener("click",()=>{
  try{
   const node=nodeSelect?.value;
   const items=storedCombos.filter(x=>x.nodeId===node);
   if(items.length<2)throw Error("برای محاسبه پوش، حداقل دو ترکیب ثبت‌شده برای گره انتخاب‌شده لازم است.");
   const labels=["Fx (kN)","Fy (kN)","Fz (kN)","Mx (kN.m)","My (kN.m)","Mz (kN.m)"];
   const lines=["پوش جبری ترکیبات ثبت‌شده — گره "+node];
   for(let j=0;j<6;j++){
    const vals=items.map(x=>({name:x.name,v:x.total[j]/1000}));
    const min=vals.reduce((a,b)=>b.v<a.v?b:a),max=vals.reduce((a,b)=>b.v>a.v?b:a);
    lines.push(labels[j]+": حداقل "+fmt(min.v)+" ("+min.name+") | حداکثر "+fmt(max.v)+" ("+max.name+")");
   }
   lines.push("تعداد ترکیبات: "+items.length);
   lines.push("این پوش فقط بین ترکیبات دستیِ ثبت‌شده محاسبه شده و پوش آیین‌نامه‌ای کامل نیست. ترکیبات باید از نظر مبنا، ضرایب، جهت باد، نوع خدمت/مقاومت و همزمانی توسط مهندس کنترل شوند.");
   envelopeOut.textContent=lines.join("\\n");
  }catch(e){envelopeOut.textContent="پوش محاسبه نشد: "+e.message;}
 });

 comboButton?.addEventListener("click",()=>{
  try{
   const r=getCombo();
   window.SahroudSteelV3CombinedReaction=r;
   comboOut.textContent="ترکیب خطی واکنش‌ها برای گره "+r.nodeId+" ("+r.name+")\\n"+
    r.detail.join(" ، ")+"\\n"+
    "Fx="+fmt(r.total[0]/1000)+" kN | Fy="+fmt(r.total[1]/1000)+" kN | Fz="+fmt(r.total[2]/1000)+" kN\\n"+
    "Mx="+fmt(r.total[3]/1000)+" kN.m | My="+fmt(r.total[4]/1000)+" kN.m | Mz="+fmt(r.total[5]/1000)+" kN.m\\n"+
    "این فقط جمع جبری حالت‌های خطی با ضرایب دستی است؛ اعتبار آیین‌نامه‌ای، همزمانی حالت‌ها، علامت‌گذاری و ترکیب بار خدمت/مقاومت را کاربر باید از مرجع رسمی کنترل کند.";
  }catch(e){comboOut.textContent="ترکیب محاسبه نشد: "+e.message;}
 });
 document.getElementById("reactionComboTransferN")?.addEventListener("click",()=>{
  try{
   const r=getCombo();
   window.SahroudSteelV3CombinedReaction=r;
   const n=Math.abs(r.total[1])/1000;
   if(!(n>0))throw Error("نیروی قائم ترکیبی تقریباً صفر است.");
   form.elements.namedItem("footingN").value=String(n);
   comboOut.textContent="قدر مطلق Fy ترکیبی، "+fmt(n)+" kN، به N منتقل شد. لنگرها به دلیل نیاز به تعیین دقیق محورهای پی به‌صورت خودکار منتقل نشدند. ترکیب باید از نظر آیین‌نامه و نوع خدمت/مقاومت جداگانه تأیید شود.";
  }catch(e){comboOut.textContent="انتقال انجام نشد: "+e.message;}
 });


 const shearBtn=document.getElementById("foundationShearDemandBtn");
 const shearOut=document.getElementById("foundationShearDemandResult");
 shearBtn?.addEventListener("click",()=>{
  try{
   const B=value("footingWidth"),L=value("footingLength"),h=value("footingThickness"),d=value("footingEffectiveDepth");
   const cx=value("columnWidthX"),cz=value("columnWidthZ"),Pu=value("footingPu");
   const Mx=value("footingMx"),Mz=value("footingMz");
   const missing=[];
   if(!(B>0))missing.push("عرض پی B");
   if(!(L>0))missing.push("طول پی L");
   if(!(h>0))missing.push("ضخامت کل پی h");
   if(!(d>0))missing.push("عمق مؤثر d");
   if(!(cx>0))missing.push("عرض ستون در X");
   if(!(cz>0))missing.push("بعد ستون در Z");
   if(!(Pu>0))missing.push("نیروی محوری ضریب‌دار Pu");
   if(missing.length)throw Error("ورودی‌های لازم کامل نیست: "+missing.join("، "));
   if(!Number.isFinite(Mx)||!Number.isFinite(Mz))throw Error("مقادیر لنگرهای Mx و Mz را وارد کنید؛ برای لنگر صفر، عدد 0 بنویسید.");
   if(Math.abs(Mx)>1e-8||Math.abs(Mz)>1e-8)throw Error("این غربال فقط برای بار محوری مرکزی و فشار یکنواخت است. با وجود لنگر، توزیع فشار و برش باید با تحلیل دومحوره محاسبه شود.");
   if(d>=h)throw Error("عمق مؤثر d باید از ضخامت کل پی h کمتر باشد.");
   if(cx>=B||cz>=L)throw Error("ابعاد ستون/پدستال باید از ابعاد پی کوچک‌تر باشد.");
   const edgeX=(B-cx)/2,edgeZ=(L-cz)/2;
   if(edgeX<=0||edgeZ<=0)throw Error("ستون/پدستال باید کاملاً داخل محدوده پی باشد.");
   /* A complete d/2 punching perimeter is assumed; edge/corner columns need clipped geometry. */
   if(edgeX<d/2||edgeZ<d/2)throw Error("ستون به لبه پی نزدیک است؛ محیط بحرانی پانچ ناقص می‌شود. محاسبه پانچ مستطیلی کامل متوقف شد.");
   const A=B*L,q=Pu/A;
   const aX=edgeX-d,aZ=edgeZ-d;
   const VuX=aX>0?q*aX*L:null,VuZ=aZ>0?q*aZ*B:null;
   const inside=(cx+d)*(cz+d);
   const b0=2*(cx+cz+2*d);
   const VuPunch=Pu-q*inside;
   if(!(VuPunch>=0))throw Error("تقاضای پانچ نامعتبر به دست آمد؛ ورودی‌ها را بررسی کنید.");
   shearOut.textContent=[
    "غربال تقاضای برش — بدون کنترل ظرفیت بتن",
    "فرض: بار محوری ضریب‌دار مرکزی، فشار یکنواخت و پی مستطیلی؛ Pu="+fmt(Pu)+" kN",
    "فشار یکنواخت فرضی: qu=Pu/(B×L)="+fmt(q)+" kPa",
    "برش یک‌طرفه X، مقطع در فاصله d از وجه ستون: "+(aX>0?"Vu="+fmt(VuX)+" kN":"مقطع بحرانی خارج از پی/در لبه است؛ این رابطه برای این هندسه قابل اعمال نیست."),
    "برش یک‌طرفه Z، مقطع در فاصله d از وجه ستون: "+(aZ>0?"Vu="+fmt(VuZ)+" kN":"مقطع بحرانی خارج از پی/در لبه است؛ این رابطه برای این هندسه قابل اعمال نیست."),
    "پانچ با محیط بحرانی کامل در فاصله d/2 از وجه ستون: b0="+fmt(b0)+" m | مساحت داخل محیط="+fmt(inside)+" m² | Vu,punch="+fmt(VuPunch)+" kN",
    "عمق مؤثر d="+fmt(d)+" m | ضخامت کل h="+fmt(h)+" m",
    "این اعداد فقط تقاضای برش تحت فرض‌های فوق‌اند؛ هیچ نتیجه قبول/رد ارائه نمی‌شود.",
    "ظرفیت برشی بتن، اثر اندازه، نسبت ابعاد ستون، آرماتور، ضریب مقاومت، انتقال لنگر، بارهای خارج از مرکز، وزن پی/خاک و ضوابط مبحث نهم هنوز کنترل نشده‌اند. برای طراحی نهایی باید روابط و ضرایب نسخه معتبر آیین‌نامه اعمال شوند."
   ].join("\\n");
  }catch(e){if(shearOut)shearOut.textContent="محاسبه انجام نشد: "+e.message;}
 });

 const flexBtn=document.getElementById("foundationFlexureDemandBtn");
 const flexOut=document.getElementById("foundationFlexureDemandResult");
 flexBtn?.addEventListener("click",()=>{
  try{
   const B=value("footingWidth"),L=value("footingLength"),cx=value("columnWidthX"),cz=value("columnWidthZ"),Pu=value("footingPu");
   const Mx=value("footingMx"),Mz=value("footingMz");
   const missing=[];
   if(!(B>0))missing.push("عرض پی B");
   if(!(L>0))missing.push("طول پی L");
   if(!(cx>0))missing.push("عرض ستون در X");
   if(!(cz>0))missing.push("بعد ستون در Z");
   if(!(Pu>0))missing.push("نیروی محوری ضریب‌دار Pu");
   if(missing.length)throw Error("ورودی‌های لازم کامل نیست: "+missing.join("، "));
   if(!Number.isFinite(Mx)||!Number.isFinite(Mz))throw Error("مقادیر Mx و Mz را وارد کنید؛ برای لنگر صفر، عدد 0 بنویسید.");
   if(Math.abs(Mx)>1e-8||Math.abs(Mz)>1e-8)throw Error("این غربال فقط برای بار محوری مرکزی و فشار یکنواخت است؛ برای بار دومحوره باید توزیع فشار و لنگر پی محاسبه شود.");
   if(cx>=B||cz>=L)throw Error("ابعاد ستون/پدستال باید از ابعاد پی کوچک‌تر باشد.");
   const q=Pu/(B*L),aX=(B-cx)/2,aZ=(L-cz)/2;
   const MuX=q*aX*aX/2,MuZ=q*aZ*aZ/2;
   flexOut.textContent=[
    "تقاضای خمشی مقدماتی در وجه ستون — بدون کنترل ظرفیت",
    "فرض: Pu مرکزی، فشار یکنواخت qu="+fmt(q)+" kPa و رفتار طره‌ای پی از وجه ستون",
    "پیش‌آمدگی طره در راستای X: "+fmt(aX)+" m | Mu,X="+fmt(MuX)+" kN.m به ازای هر متر عرض نوار",
    "پیش‌آمدگی طره در راستای Z: "+fmt(aZ)+" m | Mu,Z="+fmt(MuZ)+" kN.m به ازای هر متر عرض نوار",
    "مقادیر، تقاضای لنگر خمشی در وجه ستون‌اند؛ وزن پی و خاک روی آن و اثر لنگرهای ستون منظور نشده است.",
    "ظرفیت خمشی، As لازم، حداقل/حداکثر آرماتور، فاصله میلگرد، ترک‌خوردگی، طول مهاری و ضوابط لرزه‌ای هنوز محاسبه نشده‌اند. این خروجی برای نقشه اجرایی یا تأیید پی کافی نیست."
   ].join("\\n");
  }catch(e){if(flexOut)flexOut.textContent="محاسبه انجام نشد: "+e.message;}
 });
 button.addEventListener("click",()=>{
  try{
   const B=value("footingWidth"),L=value("footingLength"),qa=value("soilQa");
   const N=value("footingN"),Mx=value("footingMx"),Mz=value("footingMz");
   const missing=[];
   if(!(B>0))missing.push("عرض پی");
   if(!(L>0))missing.push("طول پی");
   if(!(qa>0))missing.push("ظرفیت مجاز خاک");
   if(!(N>0))missing.push("نیروی محوری فشاری خدمت N");
   if(!Number.isFinite(Mx))missing.push("لنگر حول محور x");
   if(!Number.isFinite(Mz))missing.push("لنگر حول محور z");
   if(missing.length)throw Error("ورودی‌های لازم کامل نیست: "+missing.join("، "));
   if(!form.elements.namedItem("soilQaBasis")?.value)throw Error("مبنای ظرفیت مجاز خاک (خالص/ناخالص) را انتخاب کنید.");
   const A=B*L;
   const q0=N/A;
   const dx=6*Math.abs(Mz)/(L*B*B);
   const dz=6*Math.abs(Mx)/(B*L*L);
   const qmax=q0+dx+dz,qmin=q0-dx-dz;
   const ex=Math.abs(Mz)/N,ez=Math.abs(Mx)/N;
   const kernX=B/6,kernZ=L/6;
   const bearing=qmax<=qa;
   const fullContact=qmin>=0;
   /* Rectangular kern under biaxial bending: 6|ex|/B + 6|ez|/L <= 1. */
   const kernRatio=6*ex/B+6*ez/L;
   const kern=kernRatio<=1+1e-10;
   const lines=[
    "غربال مقدماتی فشار زیر پی — نه طراحی فونداسیون",
    "ابعاد پی: "+fmt(B)+" × "+fmt(L)+" متر | مساحت: "+fmt(A)+" مترمربع",
    "محورها: X عرض پی B، Z طول پی L، Y قائم؛ Mz توزیع فشار در عرض و Mx در طول را ایجاد می‌کند.",
    "N خدمت: "+fmt(N)+" kN | Mx: "+fmt(Mx)+" kN.m | Mz: "+fmt(Mz)+" kN.m",
    "q میانگین: "+fmt(q0)+" kPa | q حداقل تقریبی: "+fmt(qmin)+" kPa | q حداکثر تقریبی: "+fmt(qmax)+" kPa",
    "ظرفیت مجاز واردشده: "+fmt(qa)+" kPa ("+form.elements.namedItem("soilQaBasis").value+")",
    "خروج از مرکزیت: ex=|Mz|/N="+fmt(ex)+" m ، ez=|Mx|/N="+fmt(ez)+" m",
    "کنترل مقدماتی qmax ≤ qa: "+(bearing?"قبول در این غربال":"رد؛ ابعاد/بار/ظرفیت خاک باید بازبینی شود"),
    "تماس فشاری کامل (qmin ≥ 0): "+(fullContact?"برقرار":"برقرار نیست؛ تحلیل تماس جزئی و طراحی ویژه لازم است"),
    "کنترل هسته مرکزی مستطیل با اثر همزمان دو خروج از مرکزیت: 6ex/B + 6ez/L = "+fmt(kernRatio)+" (حداکثر 1)؛ "+(kern?"برقرار":"برقرار نیست"),
    "حدود یک‌سوم ابعاد به‌تنهایی معیار کافی برای خمش دومحوره نیستند؛ معیار بالا باید همزمان در هر دو جهت برقرار باشد.",
    "",
    "محدودیت: این محاسبه با توزیع خطی فشار برای پی صلب و بدون وزن پی/خاک روی آن انجام شده است. خالص/ناخالص بودن qa باید با تعریف بارها سازگار شود.",
    "نشست، لغزش، واژگونی کلی، پانچ، برش یک‌طرفه، خمش، آرماتور، طول مهاری، برش پانچ ستون، اثر زلزله و اندرکنش گروه پی کنترل نشده‌اند. نتیجه مجوز اجرا یا تأیید پی نیست."
   ];
   output.textContent=lines.join("\n");
  }catch(e){output.textContent="کنترل انجام نشد: "+e.message;}
 });
})();