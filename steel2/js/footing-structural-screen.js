/* SAHROUD STEEL — preliminary isolated footing structural screen
 * Transparent mechanics-based screening only. Not a code-compliant footing design.
 * Reactions must be checked for sign convention; load combinations require code verification.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const KEY="sahroudSteel.footingStructuralScreen.v1";
 let state={fcMPa:"",fyMPa:"",minimumSteelRatioPct:"",reactionSignConfirmed:false},last=null;
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
   '<div class="field"><label for="fsFy">تنش تسلیم مشخصه میلگرد fy (MPa)</label><input id="fsFy" type="number" min="1" step="10" placeholder="طبق گواهی میلگرد"></div><div class="field"><label for="fsMinRatio">حداقل نسبت آرماتور خمشی طبق آیین‌نامه پروژه (%)</label><input id="fsMinRatio" type="number" min="0" step="0.01" placeholder="بدون مقدار پیش‌فرض"></div></div><div class="notice">مقدار حداقل آرماتور باید از ویرایش معتبر آیین‌نامه پروژه تعیین شود؛ مقدار پیش‌فرضی اعمال نشده است.</div>'+
   '<label class="check-row" style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><input id="fsReactionSign" type="checkbox"><span>قرارداد علامت واکنش قائم و افقی حل‌گر با یک حالت بار معلوم کنترل شده است؛ فشار فشاری پایه مثبت در نظر گرفته می‌شود.</span></label>'+
   '<div class="button-grid"><button id="btnFootingStructuralScreen" class="btn primary" type="button">اجرای غربال خمش، برش و پانچ</button><button id="btnFootingStructuralCSV" class="btn secondary" type="button" disabled>دریافت CSV کنترل پی</button></div>'+
   '<div id="footingStructuralSummary" class="notice">برای شروع، پوش واکنش‌ها را استخراج کنید و ابعاد پی، پدستال، پوشش بتن و مشخصات مصالح را وارد کنید.</div>'+
   '<h4>نتایج هر پایه و هر حالت بار</h4><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:1000px"><thead><tr><th>پایه / حالت</th><th>ابعاد پی B×L×t (m)</th><th>جهت</th><th>لنگر تقاضا (kN.m/m)</th><th>As لازم (mm²/m)</th><th>As موجود (mm²/m)</th><th>تعداد میلگرد در عرض پی</th><th>فاصله واقعی میلگرد (mm)</th><th>فاصله متناظر با As لازم (mm)</th><th>برش یک‌طرفه Vu / φVc (kN/m)</th><th>پانچ Vu / φVc (kN)</th><th>وضعیت</th></tr></thead><tbody id="footingStructuralRows"></tbody></table></div>'+
   '<div class="notice" id="footingStructuralLimits">این غربال از فشار بیشینه یکنواخت روی طره‌ها استفاده می‌کند؛ محافظه‌کارانه و ساده‌سازی‌شده است و جای تحلیل دقیق فشار متغیر، طراحی کامل پی و کنترل آیین‌نامه‌ای را نمی‌گیرد.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  $("fsFc").value=state.fcMPa;$("fsFy").value=state.fyMPa;$("fsMinRatio").value=state.minimumSteelRatioPct??"";$("fsReactionSign").checked=!!state.reactionSignConfirmed;
  $("fsFc").addEventListener("change",()=>{state.fcMPa=$("fsFc").value;save();});
  $("fsFy").addEventListener("change",()=>{state.fyMPa=$("fsFy").value;save();});$("fsMinRatio").addEventListener("change",()=>{state.minimumSteelRatioPct=$("fsMinRatio").value;save();});
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
 function clipPolygon(poly,axis,bound,greater){
  const out=[];if(!poly.length)return out;
  const inside=p=>greater?p[axis]>=bound-1e-10:p[axis]<=bound+1e-10;
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],ia=inside(a),ib=inside(b);
   if(ia&&ib)out.push(b);
   else if(ia&&!ib||!ia&&ib){
    const den=b[axis]-a[axis];
    if(Math.abs(den)>1e-12){const t=(bound-a[axis])/den,q=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];out.push(q);}
    if(!ia&&ib)out.push(b);
   }
  }
  return out;
 }
 function polygonArea(poly){
  if(poly.length<3)return 0;let a=0;
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}
  return Math.abs(a)/2;
 }
 function clipSegmentLength(a,b,xmin,xmax,zmin,zmax){
  const dx=b[0]-a[0],dz=b[1]-a[1],p=[-dx,dx,-dz,dz],q=[a[0]-xmin,xmax-a[0],a[1]-zmin,zmax-a[1]];
  let lo=0,hi=1;
  for(let i=0;i<4;i++){
   if(Math.abs(p[i])<1e-12){if(q[i]<0)return 0;continue;}
   const r=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);
   if(lo>hi)return 0;
  }
  return Math.hypot(dx,dz)*Math.max(0,hi-lo);
 }
 function clippedPunchGeometry(B,L,cx,cz,ox,oz,d){
  const hw=(cx+d)/2,hl=(cz+d)/2;
  const poly=[[ox-hw,oz-hl],[ox+hw,oz-hl],[ox+hw,oz+hl],[ox-hw,oz+hl]];
  const xmin=-B/2,xmax=B/2,zmin=-L/2,zmax=L/2;
  let clipped=poly;
  clipped=clipPolygon(clipped,0,xmin,true);clipped=clipPolygon(clipped,0,xmax,false);
  clipped=clipPolygon(clipped,1,zmin,true);clipped=clipPolygon(clipped,1,zmax,false);
  let b0=0;
  for(let i=0;i<poly.length;i++)b0+=clipSegmentLength(poly[i],poly[(i+1)%poly.length],xmin,xmax,zmin,zmax);
  return{area:polygonArea(clipped),b0,fullPerimeter:2*((cx+d)+(cz+d)),clipped: b0<2*((cx+d)+(cz+d))-1e-8};
 }
 function run(){
  const summary=$("footingStructuralSummary"),body=$("footingStructuralRows");body.replaceChildren();last=null;
  const foundation=window.SteelFoundationTakeoff?.getLast?.(),inputs=window.SteelFoundationTakeoff?.getData?.();
  if(!foundation?.rows?.length){summary.textContent="ابتدا تحلیل سه‌بعدی و استخراج پوش واکنش فونداسیون را اجرا کنید.";return;}
  if(!state.reactionSignConfirmed){summary.textContent="ابتدا قرارداد علامت واکنش‌ها را با یک حالت بار معلوم کنترل کنید و سپس گزینه تأیید را فعال کنید. در غیر این صورت تشخیص فشار و کشش ممکن است وارونه شود.";return;}
  const fc=positive(state.fcMPa),fy=positive(state.fyMPa),minRatioRaw=String(state.minimumSteelRatioPct??"").trim(),minRatio=minRatioRaw===""?null:Number(minRatioRaw),cover=positive(inputs?.rebarCoverMm),gammaC=positive(inputs?.concreteUnitWeightKNm3);
  const cx=positive(inputs?.pedestalWidthM),cz=positive(inputs?.pedestalLengthM),pedH=positive(inputs?.pedestalHeightM);
  const dx=positive(inputs?.bottomBarDiaXmm),sx=positive(inputs?.bottomBarSpacingXmm),dz=positive(inputs?.bottomBarDiaZmm),sz=positive(inputs?.bottomBarSpacingZmm);
  const ox=inputs?.columnOffsetXM===""?null:Number(inputs?.columnOffsetXM),oz=inputs?.columnOffsetZM===""?null:Number(inputs?.columnOffsetZM);
  if(!fc||!fy||!cover||!gammaC||!cx||!cz||!pedH||!dx||!sx||!dz||!sz||!Number.isFinite(ox)||!Number.isFinite(oz)||!(minRatio===null||(Number.isFinite(minRatio)&&minRatio>=0))){
   summary.textContent="ورودی لازم: f'c، fy، ابعاد و ارتفاع پدستال، پوشش بتن، وزن مخصوص بتن، شبکه میلگرد تحتانی در دو راستا و خروج از مرکز ستون (برای ستون مرکزی صفر وارد کنید).";return;
  }
  const gammaS=positive(inputs?.soilUnitWeightKNm3),soilCover=inputs?.soilCoverDepthM===""?0:Number(inputs?.soilCoverDepthM);
  if(!Number.isFinite(soilCover)||soilCover<0||(soilCover>0&&!gammaS)){summary.textContent="ضخامت یا وزن مخصوص خاک پوششی نامعتبر است.";return;}
  const records=[],footingSummary=[];
  const addRow=rec=>{
   records.push(rec);const tr=document.createElement("tr");
   [rec.nodeId+" / "+rec.caseLabel,rec.footingDimensions||"—",rec.direction,rec.MuKNmPerM===null?"—":fmt(rec.MuKNmPerM),rec.AsRequired===null?"—":fmt(rec.AsRequired),rec.AsProvided===null?"وارد نشده":fmt(rec.AsProvided),rec.barCount===undefined?"—":fmt(rec.barCount),rec.actualSpacingMm===undefined?"—":fmt(rec.actualSpacingMm),rec.spacingByStrengthMm===null?"—":fmt(rec.spacingByStrengthMm),rec.oneWayDemand===null?"—":fmt(rec.oneWayDemand)+" / "+fmt(rec.oneWayCapacity),rec.punchDemand===null?"—":fmt(rec.punchDemand)+" / "+fmt(rec.punchCapacity),rec.status].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);
  };
  foundation.rows.forEach(row=>{
   const spec=window.SteelFoundationTakeoff?.footingSpecFor?.(row);
   if(!spec||![spec.width,spec.length,spec.thickness].every(v=>Number.isFinite(v)&&v>0)){
    addRow({nodeId:row.nodeId,caseLabel:"—",footingDimensions:"نامعتبر",direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"ابعاد مستقل این پی معتبر نیست؛ کنترل انجام نشد"});return;
   }
   const B=spec.width,L=spec.length,t=spec.thickness;
   const pedestalFits=cx<=B&&cz<=L&&Math.abs(ox)+cx/2<=B/2+1e-9&&Math.abs(oz)+cz/2<=L/2+1e-9;
   if(!pedestalFits){addRow({nodeId:row.nodeId,caseLabel:"—",footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"پدستال/خروج از مرکز در محدوده این پی قرار ندارد"});return;}
   const dX=t*1000-cover-dz/2,dZ=t*1000-cover-dx/2;
   if(dX<=0||dZ<=0){addRow({nodeId:row.nodeId,caseLabel:"—",footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"عمق مؤثر نامعتبر است"});return;}
   const pedestalWeight=gammaC*cx*cz*pedH,concreteWeight=gammaC*B*L*t+pedestalWeight;
   const soilWeight=soilCover>0?gammaS*Math.max(0,B*L-cx*cz)*soilCover:0;
   const added=concreteWeight+soilWeight,area=B*L;
   const cases=Array.isArray(row.caseReactions)&&row.caseReactions.length?row.caseReactions:[{label:foundation.loadCase||"حالت موجود",values:row.values||[]}];
   cases.forEach(item=>{
    const v=item.values||[],N=Number(v[1])/1000,mx0=Number(v[3])/1e6,mz0=Number(v[5])/1e6;
    if(![N,mx0,mz0].every(Number.isFinite)){addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"واکنش ناقص یا نامعتبر"});return;}
    if(N<=0){addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"واکنش قائم فشاری مثبت نیست؛ کنترل تماس/بالاکشیدگی جداگانه لازم است"});return;}
    const Mx=mx0-oz*(N+pedestalWeight),Mz=mz0+ox*(N+pedestalWeight),totalN=N+added;
    const q0=totalN/area,bend=6*Math.abs(Mx)/(B*L*L)+6*Math.abs(Mz)/(L*B*B),qmax=q0+bend,qmin=q0-bend;
    if(qmin<0){addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"—",MuKNmPerM:null,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:null,punchCapacity:null,status:"تماس کامل برقرار نیست؛ کنترل خمش/برش با این مدل فشار متوقف شد"});return;}
    const specs=[
     {direction:"طره X؛ میلگرد موازی Z",projection:(B-cx)/2+Math.abs(ox),d:dX,dia:dz,spacing:sz},
     {direction:"طره Z؛ میلگرد موازی X",projection:(L-cz)/2+Math.abs(oz),d:dZ,dia:dx,spacing:sx}
    ];
    specs.forEach(s=>{
     const leff=Math.max(0,s.projection-s.d/1000),Mu=qmax*s.projection*s.projection/2;
     const AsFlex=requiredAs(Mu,fc,fy,s.d),AsMin=minRatio===null?null:minRatio/100*1000*t*1000,AsDesign=AsFlex===null?null:Math.max(AsFlex,AsMin??0),barArea=Math.PI*s.dia*s.dia/4,cross=(s.direction.startsWith("طره X")?B:L)*1000-2*cover,barCount=Math.ceil(cross/s.spacing)+1,actualSpacing=barCount>1?cross/(barCount-1):0,AsProv=barArea*1000/actualSpacing;
     const spacingByStrength=AsDesign&&AsDesign>0?barArea*1000/AsDesign:null;
     const vu=qmax*leff,vc=0.75*0.17*Math.sqrt(fc)*s.d;
     const flex=AsFlex===null?"As لازم قابل محاسبه نیست":AsProv>=AsDesign?"فولاد موجود از نیاز طراحی خمشی کمتر نیست":"فولاد موجود از نیاز طراحی خمشی کمتر است";
     const oneWay=leff<=0?"مقطع بحرانی برش یک‌طرفه خارج از طره قرار می‌گیرد":vu<=vc?"تقاضای برش یک‌طرفه کمتر از ظرفیت فرضی است":"تقاضای برش یک‌طرفه از ظرفیت فرضی بیشتر است";
     addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:s.direction,MuKNmPerM:Mu,AsRequired:AsDesign,AsFlexural:AsFlex,AsMinimum:AsMin,AsProvided:AsProv,barCount,actualSpacingMm:actualSpacing,spacingByStrengthMm:spacingByStrength,oneWayDemand:vu,oneWayCapacity:vc,punchDemand:null,punchCapacity:null,qmaxKPa:qmax,status:flex+"؛ "+oneWay});
    });
    const dPunch=Math.min(dX,dZ),pg=clippedPunchGeometry(B,L,cx,cz,ox,oz,dPunch/1000);
    const Vu=Math.max(0,N+pedestalWeight-qmax*pg.area),Vc=0.75*0.33*Math.sqrt(fc)*pg.b0*1000*dPunch/1000;
    const punchStatus=pg.b0<=1e-8?"محیط بحرانی پانچ در داخل پی طول مؤثر ندارد":Vu<=Vc?"تقاضای پانچ کمتر از ظرفیت فرضی است":"تقاضای پانچ از ظرفیت فرضی بیشتر است";
    addRow({nodeId:row.nodeId,caseLabel:item.label,footingDimensions:B+"×"+L+"×"+t,direction:"پانچ پیرامون پدستال"+(pg.clipped?"؛ محیط بریده‌شده در لبه پی":""),MuKNmPerM:0,AsRequired:null,AsProvided:null,spacingByStrengthMm:null,oneWayDemand:null,oneWayCapacity:null,punchDemand:Vu,punchCapacity:Vc,punchPerimeterMm:pg.b0*1000,punchAreaM2:pg.area,qmaxKPa:qmax,status:punchStatus});
   });
   footingSummary.push({nodeId:row.nodeId,widthM:B,lengthM:L,thicknessM:t,concreteWeightKN:concreteWeight,soilCoverWeightKN:soilWeight});
  });
  if(!records.length){summary.textContent="هیچ ردیف محاسباتی تولید نشد؛ داده واکنش‌ها و ابعاد پایه‌ها را بررسی کنید.";return;}
  const warning=records.filter(r=>/کمتر است|بیشتر است|نامعتبر|برقرار نیست|متوقف شد|نیست؛|ناقص/.test(r.status)).length;
  summary.textContent="غربال مقدماتی مستقل برای "+footingSummary.length+" پی با ابعاد اختصاصی اجرا شد؛ "+records.length+" ردیف کنترل و "+warning+" ردیف هشدار. بتن "+fmt(fc)+" MPa، میلگرد "+fmt(fy)+" MPa. حداقل نسبت آرماتور: "+(minRatio===null?"وارد نشده؛ کنترل حداقل آیین‌نامه‌ای باز است":fmt(minRatio)+"٪")+"؛ تعداد میلگرد و فاصله واقعی شبکه موجود نیز برای هر راستا محاسبه شده است. اثر لنگر نامتعادل پانچ هنوز منظور نشده است. نتایج تأیید آیین‌نامه‌ای یا مجوز اجرا نیست.";
  $("btnFootingStructuralCSV").disabled=false;
  last={generatedAt:new Date().toISOString(),basis:"preliminary_per_base_mechanics_screen_not_code_design",fcMPa:fc,fyMPa:fy,minimumSteelRatioPct:minRatio,phiFlexure:0.9,phiShear:0.75,footings:footingSummary,records,limitations:["ابعاد B×L×t و وزن بتن هر پی از جدول مستقل همان پایه خوانده شده است.","فشار خطی با فرض پی صلب و تماس کامل؛ در خروج از هسته مرکزی کنترل خمش/برش متوقف می‌شود.","فشار بیشینه یکنواخت روی طره‌ها اعمال شده؛ انتگرال‌گیری دقیق فشار متغیر و سهم وزن پی در خمش موضعی انجام نشده است.","پانچ با محیط مستطیلی در d/2 و طول مؤثر بریده‌شده در لبه پی غربال شده؛ اثر لنگر نامتعادل، انتقال برش نامتقارن، گوشه‌ها و ضوابط دقیق محیط بحرانی آیین‌نامه‌ای کامل نیست.","روابط و ضرایب φ فرضی 0.90 و 0.75 هستند و هنوز با ویرایش رسمی آیین‌نامه پروژه تطبیق نشده‌اند.","حداقل نسبت آرماتور فقط در صورت ورود مقدار مصوب آیین‌نامه پروژه اعمال می‌شود؛ در غیر این صورت کنترل حداقل باز است. طول مهاری، وصله، قلاب، ترک، دوام، آرماتور بالایی/موضعی، پانچ اطراف صفحه‌ستون و جزئیات شناژ بررسی نشده‌اند.","ترکیبات بار موجود در نرم‌افزار هنوز ترکیبات نهایی/تأییدشده آیین‌نامه‌ای نیستند؛ این گزارش تأیید طراحی یا مجوز اجرا نیست."]};
  save();
 }
 function exportCSV(){
  if(!last)run();if(!last)return;
  const rows=[["گزارش غربال سازه‌ای پی منفرد"],["مبنای گزارش",last.basis],["fc MPa",last.fcMPa],["fy MPa",last.fyMPa],["φ flexure",last.phiFlexure],["φ shear",last.phiShear],["پایه/حالت","ابعاد پی B×L×t (m)","جهت","Mu kN.m/m","As design mm2/m","As flexural mm2/m","As minimum mm2/m","As provided mm2/m","bar count","actual spacing mm","spacing from As mm","Vu one-way kN/m","φVc one-way kN/m","Vu punching kN","φVc punching kN","punch perimeter mm","punch area m2","status"],...last.records.map(r=>[r.nodeId+" / "+r.caseLabel,r.footingDimensions,r.direction,r.MuKNmPerM,r.AsRequired,r.AsFlexural,r.AsMinimum,r.AsProvided,r.barCount,r.actualSpacingMm,r.spacingByStrengthMm,r.oneWayDemand,r.oneWayCapacity,r.punchDemand,r.punchCapacity,r.punchPerimeterMm,r.punchAreaM2,r.status]),...last.limitations.map(x=>["محدودیت",x])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Footing-Structural-Screen.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;state={...state,...d};if($("fsFc")){$("fsFc").value=state.fcMPa;$("fsFy").value=state.fyMPa;$("fsMinRatio").value=state.minimumSteelRatioPct??"";$("fsReactionSign").checked=!!state.reactionSignConfirmed;}save();}
 document.addEventListener("DOMContentLoaded",()=>{load();panel();});
 window.SteelFootingStructuralScreen={getData,setData,run,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
})();