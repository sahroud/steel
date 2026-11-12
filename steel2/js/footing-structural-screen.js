/* SAHROUD STEEL — preliminary isolated footing structural screen
 * Transparent mechanics-based screening only. Not a code-compliant footing design.
 * Reactions must be checked for sign convention; load combinations require code verification.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const KEY="sahroudSteel.footingStructuralScreen.v1";
 let state={fcMPa:"",fyMPa:"",reactionSignConfirmed:false},last=null;
 const fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:2});
 const positive=x=>{if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
 function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&typeof x==="object")state={...state,...x};}catch(e){}}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
 function panel(){
  if($("footingStructuralScreenPanel"))return;
  const root=$("anchorBaseplatePanel")||$("foundationTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="footingStructuralScreenPanel";
  p.innerHTML='<div class="panel-title"><h3>غربال سازه‌ای پی منفرد</h3><span class="status">کنترل مقدماتی؛ نه تأیید آیین‌نامه‌ای</span></div>'+
   '<div class="notice">این ابزار با واکنش‌های هم‌زمان هر ترکیب، فشار خطی خاک را برای برآورد مقدماتی خمش، برش یک‌طرفه و پانچ به‌کار می‌برد. مدل فشار برای کنترل‌های سازه‌ای ساده‌سازی شده و انتقال لنگر نامتعادل در پانچ، حداقل آرماتور آیین‌نامه‌ای، طول مهاری، وصله، ترک، دوام، نشست، اثر شناژ و اندرکنش گروه پی‌ها را کنترل نمی‌کند. ضرایب بار موجود نیز هنوز با ویرایش رسمی آیین‌نامه پروژه تطبیق نهایی نشده‌اند؛ بنابراین هیچ نتیجه‌ای گواهی طراحی نیست.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="fsFc">مقاومت مشخصه فشاری بتن f\'c (MPa)</label><input id="fsFc" type="number" min="1" step="1" placeholder="طبق مشخصات مصالح"></div>'+
   '<div class="field"><label for="fsFy">تنش تسلیم مشخصه میلگرد fy (MPa)</label><input id="fsFy" type="number" min="1" step="10" placeholder="طبق گواهی میلگرد"></div></div>'+
   '<label class="check-row" style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><input id="fsReactionSign" type="checkbox"><span>قرارداد علامت واکنش قائم و افقی حل‌گر با یک حالت بار معلوم کنترل شده است؛ فشار فشاری پایه مثبت در نظر گرفته می‌شود.</span></label>'+
   '<div class="button-grid"><button id="btnFootingStructuralScreen" class="btn primary" type="button">اجرای غربال خمش، برش و پانچ</button><button id="btnFootingStructuralCSV" class="btn secondary" type="button" disabled>دریافت CSV کنترل پی</button></div>'+
   '<div id="footingStructuralSummary" class="notice">برای شروع، پوش واکنش‌ها را استخراج کنید و ابعاد پی، پدستال، پوشش بتن و مشخصات مصالح را وارد کنید.</div>'+
   '<h4>نتایج هر پایه و هر حالت بار</h4><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:1000px"><thead><tr><th>پایه / حالت</th><th>جهت</th><th>لنگر تقاضا (kN.m/m)</th><th>As لازم (mm²/m)</th><th>As موجود (mm²/m)</th><th>فاصله متناظر با As خمشی (mm)</th><th>برش یک‌طرفه Vu / φVc (kN/m)</th><th>پانچ Vu / φVc (kN)</th><th>وضعیت</th></tr></thead><tbody id="footingStructuralRows"></tbody></table></div>'+
   '<div class="notice" id="footingStructuralLimits">این غربال از فشار بیشینه یکنواخت روی طره‌ها استفاده می‌کند؛ محافظه‌کارانه و ساده‌سازی‌شده است و جای تحلیل دقیق فشار متغیر، طراحی کامل پی و کنترل آیین‌نامه‌ای را نمی‌گیرد.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  $("fsFc").value=state.fcMPa;$("fsFy").value=state.fyMPa;$("fsReactionSign").checked=!!state.reactionSignConfirmed;
  $("fsFc").addEventListener("change",()=>{state.fcMPa=$("fsFc").value;save();});
  $("fsFy").addEventListener("change",()=>{state.fyMPa=$("fsFy").value;save();});
  $("fsReactionSign").addEventListener("change",()=>{state.reactionSignConfirmed=$("fsReactionSign").checked;save();});
  $("btnFootingStructuralScreen").addEventListener("click",run);
  $("btnFootingStructuralCSV").addEventListener("click",exportCSV);
 }
 function requiredAs(Mu,fc,fy,d,b=1000,phi=0.9){
  if(!(Mu>0&&fc>0&&fy>0&&d>0&&b>0))return null;
  const A=fy*fy/(2*0.85*fc*b),B=-fy*d,C=Mu*1e6/phi,disc=B*B-4*A*C;
  if(disc<0)return null;
  const As=(-B-Math.sqrt(disc))/(2*A);
  return Number.isFinite(As)&&As>0?As:null;
 }
 function run(){
  const summary=$("footingStructuralSummary"),body=$("footingStructuralRows");body.replaceChildren();last=null;
  const foundation=window.SteelFoundationTakeoff?.getLast?.(),inputs=window.SteelFoundationTakeoff?.getData?.();
  if(!foundation?.rows?.length){summary.textContent="ابتدا تحلیل سه‌بعدی و استخراج پوش واکنش فونداسیون را اجرا کنید.";return;}
  if(!state.reactionSignConfirmed){summary.textContent="ابتدا قرارداد علامت واکنش‌ها را با یک حالت بار معلوم کنترل کنید و سپس گزینه تأیید را فعال کنید. در غیر این صورت تشخیص فشار و کشش ممکن است وارونه شود.";return;}
  const fc=positive(state.fcMPa),fy=positive(state.fyMPa),B=positive(inputs?.footingWidthM),L=positive(inputs?.footingLengthM),t=positive(inputs?.footingThicknessM),cx=positive(inputs?.pedestalWidthM),cz=positive(inputs?.pedestalLengthM),cover=positive(inputs?.rebarCoverMm),gammaC=positive(inputs?.concreteUnitWeightKNm3);
  const dx=positive(inputs?.bottomBarDiaXmm),sx=positive(inputs?.bottomBarSpacingXmm),dz=positive(inputs?.bottomBarDiaZmm),sz=positive(inputs?.bottomBarSpacingZmm);
  const ox=inputs?.columnOffsetXM===""?null:Number(inputs?.columnOffsetXM),oz=inputs?.columnOffsetZM===""?null:Number(inputs?.columnOffsetZM);
  if(!fc||!fy||!B||!L||!t||!cx||!cz||!cover||!gammaC||!dx||!dz||!Number.isFinite(ox)||!Number.isFinite(oz)){
   summary.textContent="ورودی لازم: f'c، fy، ابعاد پی و پدستال، ضخامت پی، پوشش بتن، وزن مخصوص بتن و جابه‌جایی محور ستون در X و Z (برای ستون مرکزی صفر وارد کنید).";return;
  }
  if(cx>B||cz>L||Math.abs(ox)+cx/2>B/2+1e-9||Math.abs(oz)+cz/2>L/2+1e-9){summary.textContent="پدستال یا محور ستون در محدوده پی قرار نمی‌گیرد؛ ابعاد و خروج از مرکز را اصلاح کنید.";return;}
  const dX=t*1000-cover-dz/2,dZ=t*1000-cover-dx/2;
  if(dX<=0||dZ<=0){summary.textContent="عمق مؤثر پی نامعتبر است؛ ضخامت، پوشش و قطر میلگرد را بررسی کنید.";return;}
  const gammaS=positive(inputs?.soilUnitWeightKNm3),soilCover=inputs?.soilCoverDepthM===""?0:Number(inputs?.soilCoverDepthM);
  if(!Number.isFinite(soilCover)||soilCover<0||(soilCover>0&&!gammaS)){summary.textContent="ضخامت یا وزن مخصوص خاک پوششی نامعتبر است.";return;}
  const pedH=positive(inputs?.pedestalHeightM);
  if(!pedH){summary.textContent="ارتفاع پدستال را نیز از نقشه وارد کنید تا وزن بتن و هندسه انتقال بار ناقص نماند.";return;}
  const pedestalWeight=gammaC*cx*cz*pedH,concreteWeight=gammaC*B*L*t+pedestalWeight;
  const soilWeight=soilCover>0?gammaS*Math.max(0,B*L-cx*cz)*soilCover:0;
  const added=concreteWeight+soilWeight,area=B*L,records=[];
  const addRow=(rec)=>{records.push(rec);const tr=document.createElement("tr");[rec.nodeId+" / "+rec.caseLabel,rec.direction,fmt(rec.MuKNmPerM),rec.AsRequired===null?"—":fmt(rec.AsRequired),rec.AsProvided===null?"وارد نشده":fmt(rec.AsProvided),rec.spacingByStrengthMm===null?"—":fmt(rec.spacingByStrengthMm),rec.oneWayDemand===null?"—":fmt(rec.oneWayDemand)+" / "+fmt(rec.oneWayCapacity),rec.punchDemand===null?"—":fmt(rec.punchDemand)+" / "+fmt(rec.punchCapacity),rec.status].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);};
  foundation.rows.forEach(row=>{
   const cases=Array.isArray(row.caseReactions)?row.caseReactions:[];
   cases.forEach(item=>{
    const v=item.values||[],N=Number(v[1])/1000,fx=Number(v[0])/1000,fz=Number(v[2])/1000;
    const mx0=Number(v[3])/1e6,mz0=Number(v[5])/1e6;
    if(![N,fx,fz,mx0,mz0].every(Number.isFinite)||N<=0)return;
    const Mx=mx0-oz*(N+pedestalWeight),Mz=mz0+ox*(N+pedestalWeight),totalN=N+added;
    const q0=totalN/area,bend=6*Math.abs(Mx)/(B*L*L)+6*Math.abs(Mz)/(L*B*B),qmax=q0+bend,qmin=q0-bend;
    if(qmin<0)return;
    const specs=[
     {direction:"طره در X؛ میلگرد موازی Z",projection:Math.max(0,(B-cx)/2+Math.abs(ox)),d:dX,dia:dz,spacing:sz},
     {direction:"طره در Z؛ میلگرد موازی X",projection:Math.max(0,(L-cz)/2+Math.abs(oz)),d:dZ,dia:dx,spacing:sx}
    ];
    let statusParts=[];
    specs.forEach(s=>{
     const leff=Math.max(0,s.projection-s.d/1000);
     const Mu=qmax*s.projection*s.projection/2;
     const As=requiredAs(Mu,fc,fy,s.d);
     const AsProv=s.dia&&s.spacing?Math.PI*s.dia*s.dia/4*1000/s.spacing:null,spacingByStrength=As&&s.dia?Math.PI*s.dia*s.dia/4*1000/As:null;
     const vu=qmax*leff;
     const vc=0.75*0.17*Math.sqrt(fc)*1000*s.d/1000;
     const oneWay=leff<=0?"مقطع بحرانی در بیرون طره نیست":vu<=vc?"برش یک‌طرفه در غربال ساده کمتر از ظرفیت اسمی است":"برش یک‌طرفه از ظرفیت اسمی غربال بیشتر است";
     const flex=As===null?"As لازم قابل محاسبه نیست":AsProv===null?"آرماتور موجود وارد نشده":AsProv>=As?"As واردشده از As لازم محاسباتی کمتر نیست":"As واردشده از As لازم محاسباتی کمتر است";
     statusParts.push(s.direction+": "+flex+"؛ "+oneWay);
     addRow({nodeId:row.nodeId,caseLabel:item.label,direction:s.direction,MuKNmPerM:Mu,AsRequired:As,AsProvided:AsProv,spacingByStrengthMm:spacingByStrength,oneWayDemand:vu,oneWayCapacity:vc,punchDemand:null,punchCapacity:null,status:flex+"؛ "+oneWay});
    });
    const dPunch=Math.min(dX,dZ),perimeter=2*((cx*1000+dPunch)+(cz*1000+dPunch));
    const insideW=(cx+dPunch/1000),insideL=(cz+dPunch/1000),insideArea=insideW*insideL;
    const punchValid=Math.abs(ox)+cx/2+dPunch/2000<=B/2+1e-9&&Math.abs(oz)+cz/2+dPunch/2000<=L/2+1e-9;
    const qavg=totalN/area,Vu=punchValid?Math.max(0,(N+pedestalWeight)*(1-insideArea/area)):null;
    const Vc=punchValid?0.75*0.33*Math.sqrt(fc)*perimeter*dPunch/1000:null;
    const punchStatus=!punchValid?"محیط بحرانی پانچ در محدوده پی جا نمی‌شود":Vu<=Vc?"پانچ در غربال محوری ساده کمتر از ظرفیت اسمی است":"پانچ از ظرفیت اسمی غربال بیشتر است";
    statusParts.push(punchStatus);
    addRow({nodeId:row.nodeId,caseLabel:item.label,direction:"پانچ پیرامون پدستال",MuKNmPerM:0,AsRequired:null,AsProvided:null,oneWayDemand:null,oneWayCapacity:null,spacingByStrengthMm:null,punchDemand:Vu,punchCapacity:Vc,status:punchStatus});
   });
  });
  if(!records.length){summary.textContent="هیچ حالت فشاری با تماس کامل خاک برای غربال خمش و برش موجود نیست؛ پوش واکنش، علامت‌ها و کنترل فشار زیر پی را بررسی کنید.";return;}
  const warning=records.filter(r=>/کمتر است|بیشتر است|جا نمی‌شود|قابل محاسبه نیست/.test(r.status)).length;
  summary.textContent="غربال سازه‌ای برای "+records.length+" ردیف محاسباتی انجام شد؛ f'c="+fmt(fc)+" MPa، fy="+fmt(fy)+" MPa، وزن پی و خاک پوششی هر پایه="+fmt(added)+" kN. ردیف‌های دارای هشدار محاسباتی: "+warning+". برای خمش، فشار بیشینه روی کل طره یکنواخت فرض شده؛ برای برش و پانچ از روابط ساده‌شده بتن مسلح با ضرایب φ فرضی 0.75 و برای خمش 0.90 استفاده شده است. این ضرایب و روابط هنوز با ضوابط رسمی پروژه تطبیق نشده‌اند.";
  $("btnFootingStructuralCSV").disabled=false;
  last={generatedAt:new Date().toISOString(),basis:"preliminary_mechanics_screen_not_code_design",fcMPa:fc,fyMPa:fy,phiFlexure:0.9,phiShear:0.75,addedWeightPerFootingKN:added,records,limitations:["واکنش قائم مثبت به‌عنوان فشار فرض شده و نیازمند تطبیق مستقل با حالت بار معلوم است.","فشار بیشینه خطی خاک به‌صورت یکنواخت روی طره‌ها اعمال شده؛ توزیع واقعی فشار و لنگر دو محوره در عرض هر طره به‌صورت دقیق انتگرال‌گیری نشده است.","کنترل پانچ، انتقال لنگر نامتعادل، اثر برش یک‌طرفه دوطرفه دقیق، اثر ستون خارج از مرکز روی پیرامون بحرانی و ابعاد ستون/صفحه‌ستون واقعی را کامل مدل نمی‌کند.","روابط و ضرایب مقاومت 0.90 و 0.75 یک فرض غربال مقدماتی هستند و هنوز با ویرایش رسمی آیین‌نامه پروژه تطبیق نشده‌اند.","حداقل آرماتور، طول مهاری، وصله، قلاب، ترک، خیز، دوام، آرماتور بالایی/موضعی، پانچ اطراف صفحه‌ستون و جزئیات شناژ بررسی نشده‌اند.","ترکیبات بار و ضرایب تحلیل فعلی نهایی/تأییدشده نیستند؛ این گزارش تأیید طراحی یا مجوز اجرا نیست."]};
  save();
 }
 function exportCSV(){
  if(!last)run();if(!last)return;
  const rows=[["گزارش غربال سازه‌ای پی منفرد"],["مبنای گزارش",last.basis],["fc MPa",last.fcMPa],["fy MPa",last.fyMPa],["φ flexure",last.phiFlexure],["φ shear",last.phiShear],["پایه/حالت","جهت","Mu kN.m/m","As required mm2/m","As provided mm2/m","Vu one-way kN/m","φVc one-way kN/m","Vu punching kN","φVc punching kN","status"],...last.records.map(r=>[r.nodeId+" / "+r.caseLabel,r.direction,r.MuKNmPerM,r.AsRequired,r.AsProvided,r.oneWayDemand,r.oneWayCapacity,r.punchDemand,r.punchCapacity,r.status]),...last.limitations.map(x=>["محدودیت",x])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Footing-Structural-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;state={...state,...d};if($("fsFc")){$("fsFc").value=state.fcMPa;$("fsFy").value=state.fyMPa;$("fsReactionSign").checked=!!state.reactionSignConfirmed;}save();}
 document.addEventListener("DOMContentLoaded",()=>{load();panel();});
 window.SteelFootingStructuralScreen={getData,setData,run,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
})();