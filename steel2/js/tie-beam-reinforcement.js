/* SAHROUD STEEL — preliminary tie-beam reinforcement screening.
 * Uses actions from the latest 3D analysis. Not code-certified design.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const defaults={fyMPa:400,coverMm:40,barDiaMm:16,stirrupDiaMm:10,stirrupLegs:2,clearSpacingMm:25,phiFlexure:0.90,phiShear:0.75,lambdaConcrete:1.0,EsMPa:200000,alpha1:0.85,beta1:0.85,epsilonCu:0.003};
 let settings={...defaults},latest=null,lastReport=null;
 const fmt=(v,d=2)=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:d});
 function mount(){
  if($("tieBeamRebarPanel"))return;
  const anchor=$("tieBeamLayoutPanel");if(!anchor)return;
  const p=document.createElement("section");p.className="panel";p.id="tieBeamRebarPanel";
  p.innerHTML='<div class="panel-title"><h3>کنترل مقدماتی آرماتور شناژ بر اساس نیروهای تحلیل</h3><span class="status">غربال اولیه؛ نه طراحی نهایی</span></div>'+
  '<div class="notice">پس از اجرای تحلیل سه‌بعدی، نیروهای انتهایی هر شناژ از نتیجه حل‌گر خوانده می‌شوند. برای برآورد خمشی از رابطه تعادل مقطع مستطیلی و منحنی سازگاری کرنش استفاده می‌شود. کنترل مقدماتی برش با مشارکت بتن و خاموت بر اساس روابط مبحث ۹ ویرایش ۱۳۹۹ انجام می‌شود؛ ویرایش معتبر، اصلاحیه‌ها، ضوابط لرزه‌ای و جزئیات مهاری باید برای پروژه تأیید شوند.</div>'+
  '<div class="form-grid">'+
  '<div class="field"><label for="tbrFy">تنش تسلیم میلگرد fy (MPa)</label><input id="tbrFy" type="number" min="200" max="700" step="5" value="400"></div>'+
  '<div class="field"><label for="tbrCover">پوشش بتن (mm)</label><input id="tbrCover" type="number" min="20" max="100" step="5" value="40"></div>'+
  '<div class="field"><label for="tbrBarDia">قطر پیشنهادی میلگرد طولی (mm)</label><select id="tbrBarDia"><option>12</option><option>14</option><option selected>16</option><option>18</option><option>20</option><option>22</option><option>25</option><option>28</option><option>32</option></select></div>'+
  '<div class="field"><label for="tbrStirrupDia">قطر خاموت (mm)</label><input id="tbrStirrupDia" type="number" min="6" max="16" step="1" value="10"></div>'+
  '<div class="field"><label for="tbrLegs">تعداد شاخه مؤثر خاموت</label><select id="tbrLegs"><option value="2" selected>۲ شاخه</option><option value="4">۴ شاخه</option></select></div>'+
  '<div class="field"><label for="tbrClearSpacing">فاصله آزاد هندسی پیشنهادی میلگردها (mm)</label><input id="tbrClearSpacing" type="number" min="10" max="100" step="1" value="25"></div>'+
  '<div class="field"><label for="tbrPhi">ضریب مقاومت خمشی فرضی φ (غربال مقدماتی)</label><input id="tbrPhi" type="number" min="0.5" max="1" step="0.01" value="0.90"></div>'+
  '<div class="field"><label for="tbrPhiShear">ضریب مقاومت برشی φ</label><input id="tbrPhiShear" type="number" min="0.5" max="0.9" step="0.01" value="0.75"></div><div class="field"><label for="tbrLambda">ضریب بتن معمولی/سبک λ</label><input id="tbrLambda" type="number" min="0.75" max="1" step="0.01" value="1.0"></div><div class="field"><label for="tbrEs">مدول فولاد Es (MPa)</label><input id="tbrEs" type="number" min="150000" max="220000" step="1000" value="200000"></div>'+
  '<div class="field"><label for="tbrAlpha">ضریب بلوک تنش α1</label><input id="tbrAlpha" type="number" min="0.5" max="1" step="0.01" value="0.85"></div>'+
  '<div class="field"><label for="tbrBeta">ضریب عمق بلوک β1</label><input id="tbrBeta" type="number" min="0.5" max="1" step="0.01" value="0.85"></div>'+
  '<div class="field"><label for="tbrEpsCu">کرنش حدی بتن εcu</label><input id="tbrEpsCu" type="number" min="0.002" max="0.004" step="0.0001" value="0.003"></div>'+
  '</div><div class="notice">مقادیر fy=400، پوشش ۴۰، قطر طولی ۱۶، φ خمشی=۰٫۹ و φ برشی=۰٫۷۵ صرفاً پیش‌فرض غربال اولیه‌اند؛ باید با مشخصات واقعی میلگرد، شرایط محیطی، حریق، قطر سنگدانه و آیین‌نامه پروژه تطبیق داده شوند.</div>'+
  '<div class="button-grid"><button type="button" class="btn secondary" id="btnRunTieRebarScreen">محاسبه مقدماتی آرماتور از آخرین تحلیل</button><button type="button" class="btn secondary" id="btnResetTieRebarDefaults">بازگردانی پیش‌فرض‌ها</button></div>'+
  '<div id="tieRebarStatus" class="notice">ابتدا تحلیل سه‌بعدی را اجرا کنید؛ سپس کنترل مقدماتی در این قسمت قابل انجام است.</div>'+
  '<div id="tieRebarOutput" class="result-box">هنوز نتیجه‌ای محاسبه نشده است.</div>'+
  '<div class="notice">این محاسبه حداقل آرماتور آیین‌نامه‌ای، کنترل ترک، خیز، دوام، حداکثر فاصله میلگرد، محدودیت فاصله خاموت، برش بتن، پیچش، اثر زلزله، مهاری و وصله را تعیین نمی‌کند. فاصله خاموت از برش بتن و فولاد، حداقل فولاد برشی و محدودیت فاصله فصل ۱۱ محاسبه می‌شود؛ با این حال کنترل پیچش، زلزله، آرایش واقعی خاموت و جزئیات اجرایی هنوز کامل نیست.</div>';
  anchor.parentNode.insertBefore(p,anchor.nextSibling);
  ["tbrFy","tbrCover","tbrBarDia","tbrStirrupDia","tbrLegs","tbrClearSpacing","tbrPhi","tbrPhiShear","tbrLambda","tbrEs","tbrAlpha","tbrBeta","tbrEpsCu"].forEach(id=>$(id).addEventListener("change",read));
  $("btnRunTieRebarScreen").addEventListener("click",()=>render(true));
  $("btnResetTieRebarDefaults").addEventListener("click",()=>{settings={...defaults};write();render(false);});
  write();
 }
 function read(){
  if(!$("tbrFy"))return;
  settings={fyMPa:Number($("tbrFy").value),coverMm:Number($("tbrCover").value),barDiaMm:Number($("tbrBarDia").value),stirrupDiaMm:Number($("tbrStirrupDia").value),stirrupLegs:Number($("tbrLegs").value),clearSpacingMm:Number($("tbrClearSpacing").value),phiFlexure:Number($("tbrPhi").value),phiShear:Number($("tbrPhiShear").value),lambdaConcrete:Number($("tbrLambda").value),EsMPa:Number($("tbrEs").value),alpha1:Number($("tbrAlpha").value),beta1:Number($("tbrBeta").value),epsilonCu:Number($("tbrEpsCu").value)};
  try{localStorage.setItem("sahroudSteel.tieBeamRebarSettings.v1",JSON.stringify(settings));}catch(e){}
 }
 function write(){
  if(!$("tbrFy"))return;
  Object.entries({tbrFy:settings.fyMPa,tbrCover:settings.coverMm,tbrBarDia:settings.barDiaMm,tbrStirrupDia:settings.stirrupDiaMm,tbrLegs:settings.stirrupLegs,tbrClearSpacing:settings.clearSpacingMm,tbrPhi:settings.phiFlexure,tbrPhiShear:settings.phiShear,tbrLambda:settings.lambdaConcrete,tbrEs:settings.EsMPa,tbrAlpha:settings.alpha1,tbrBeta:settings.beta1,tbrEpsCu:settings.epsilonCu}).forEach(([id,v])=>{if($(id))$(id).value=v;});
 }
 function areaBar(d){return Math.PI*d*d/4;}
 function barLayerCapacity(bMm,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm){
  const centerSpan=bMm-2*(coverMm+stirrupDiaMm+barDiaMm/2);
  const pitch=barDiaMm+clearSpacingMm;
  if(!(centerSpan>=0&&pitch>0))return{ok:false,maxBars:0,centerSpanMm:centerSpan};
  return{ok:true,maxBars:Math.floor(centerSpan/pitch+1e-9)+1,centerSpanMm:centerSpan};
 }
 function flexuralAs(MNm,bMm,dMm,fc,fy,phi){
  if(!(MNm>0&&bMm>0&&dMm>0&&fc>0&&fy>0&&phi>0&&phi<=1))return{ok:false,reason:"ورودی خمشی نامعتبر است"};
  const demand=MNm*1e6/phi;
  const c=fy/(2*0.85*fc*bMm);
  const disc=dMm*dMm-4*c*demand/fy;
  if(disc<0)return{ok:false,reason:"ظرفیت هندسی مقطع برای این لنگر با فرض میلگرد کششی تنها کافی نیست"};
  const As=(dMm-Math.sqrt(disc))/(2*c);
  if(!(As>0&&Number.isFinite(As)))return{ok:false,reason:"حل مساحت میلگرد معتبر نیست"};
  return{ok:true,AsRequiredMm2:As,nominalDepthFactor:0.85,assumption:"مقطع مستطیلی، میلگرد کششی تنها، بدون کنترل حداقل/حداکثر آرماتور آیین‌نامه‌ای"};
 }
 function buildSymmetricBarLayers(bMm,hMm,countEachFace,coverMm,stirrupDiaMm,barDiaMm,clearSpacingMm){
  const pitch=barDiaMm+clearSpacingMm,first=coverMm+stirrupDiaMm+barDiaMm/2;
  const span=bMm-2*first;
  if(!(span>=0&&pitch>0&&countEachFace>=2))return{ok:false,reason:"ابعاد یا تعداد میلگرد برای آرایش چندلایه معتبر نیست"};
  const perRow=Math.floor(span/pitch+1e-9)+1;
  if(perRow<2)return{ok:false,reason:"عرض مقطع برای جای‌گیری حداقل دو میلگرد در هر ردیف کافی نیست"};
  let remaining=countEachFace;const face=[];
  while(remaining>0){
   const n=Math.min(perRow,remaining),row=face.length,y=first+row*pitch;
   if(y>=hMm/2)return{ok:false,reason:"ارتفاع مقطع برای تعداد ردیف‌های موردنیاز کافی نیست"};
   face.push({y,area:n*areaBar(barDiaMm),count:n,row});
   remaining-=n;
  }
  const layers=[...face,...face.map(x=>({y:hMm-x.y,area:x.area,count:x.count,row:x.row}))];
  const bottomArea=face.reduce((s,x)=>s+x.area,0);
  const bottomCentroid=face.reduce((s,x)=>s+x.area*x.y,0)/bottomArea;
  return{ok:true,layers,rowsPerFace:face.length,barsPerRow:face.map(x=>x.count),bottomCentroidMm:bottomCentroid,topCentroidMm:hMm-bottomCentroid,maxBarsPerRow:perRow,totalAsMm2:2*bottomArea};
 }
 function sectionInteractionCurve(bMm,hMm,fc,fy,Es,alpha1,beta1,epsilonCu,barAreaPerFace,coverMm,stirrupDiaMm,barDiaMm){
  const vals=[bMm,hMm,fc,fy,Es,alpha1,beta1,epsilonCu,coverMm,stirrupDiaMm,barDiaMm];
  if(vals.some(v=>!Number.isFinite(v)||v<=0)||alpha1>1||beta1>1||epsilonCu>0.01)return{ok:false,reason:"پارامترهای منحنی اندرکنش نامعتبرند"};
  const layers=Array.isArray(barAreaPerFace)?barAreaPerFace:null;
  if(!layers||!layers.length||layers.some(x=>!Number.isFinite(x.y)||!Number.isFinite(x.area)||x.y<=0||x.y>=hMm||x.area<=0))return{ok:false,reason:"مختصات یا سطح مقطع لایه‌های میلگرد نامعتبر است"};
  const totalAs=layers.reduce((s,x)=>s+x.area,0),points=[];
  for(let i=0;i<=100;i++){
   const c=hMm*0.01*Math.pow(10000,i/100),a=Math.min(beta1*c,hMm),Cc=alpha1*fc*bMm*a;
   let P=-Cc,M=-Cc*(hMm/2-a/2),epsT=0;
   for(const layer of layers){
    const eps=epsilonCu*(layer.y/c-1),fs=Math.max(-fy,Math.min(fy,Es*eps));
    const force=layer.area*(fs-(layer.y<=a?alpha1*fc:0));
    P+=force;M+=force*(hMm/2-layer.y);if(eps>epsT)epsT=eps;
   }
   points.push({cMm:c,aMm:a,PnN:P,MnNmm:Math.abs(M),epsilonT:epsT});
  }
  points.unshift({cMm:0,aMm:0,PnN:totalAs*fy,MnNmm:0,epsilonT:fy/Es});
  return{ok:true,points,steelAreaMm2:totalAs,assumptions:"مختصات گسسته چندردیفه میلگرد؛ بلوک مستطیلی با α1 و β1 ورودی؛ بدون ضریب φ و فقط خمش یک‌محوره"};
 }
 function shearDesignDirection(VuN,NuTensionN,bwMm,dMm,AgMm2,fcMPa,fyMPa,phi,lambda,AvMm2,AsLongMm2){
  const vals=[VuN,NuTensionN,bwMm,dMm,AgMm2,fcMPa,fyMPa,phi,lambda,AvMm2,AsLongMm2];
  if(vals.some(v=>!Number.isFinite(v))||VuN<0||bwMm<=0||dMm<=0||AgMm2<=0||fcMPa<=0||fyMPa<=0||phi<=0||phi>1||lambda<=0||lambda>1||AvMm2<=0)
   return{ok:false,reason:"ورودی‌های کنترل برش نامعتبر است"};
  const NuCompression=Math.max(0,-NuTensionN);
  const axialStress=Math.min(0.05*fcMPa,Math.max(0,NuCompression/(6*AgMm2)));
  const rho=Math.max(0.0001,Math.min(0.08,AsLongMm2/(bwMm*dMm)));
  const lambdaS=Math.min(1,Math.sqrt(2/(1+dMm/250)));
  const vcNoMin=Math.max(0,(0.66*lambdaS*Math.cbrt(rho)*Math.sqrt(fcMPa)+axialStress)*bwMm*dMm);
  const vcNoMinCap=0.66*lambda*Math.sqrt(fcMPa)*bwMm*dMm;
  const Vc0=Math.min(vcNoMin,vcNoMinCap);
  const minAvPerS=Math.max(0.062*Math.sqrt(fcMPa)*bwMm/fyMPa,0.35*bwMm/fyMPa);
  const minAv= minAvPerS; // mm²/mm
  const trigger=VuN>0.5*phi*Vc0;
  let Vc=Vc0,AvsRequired=0,VsRequired=0,spacing=null,providedAvPerS=0;
  if(trigger){
   Vc=Math.max(0,(0.17*lambda*Math.sqrt(fcMPa)+axialStress)*bwMm*dMm);
   const VcCap=0.66*lambda*Math.sqrt(fcMPa)*bwMm*dMm;
   Vc=Math.min(Vc,VcCap);
   VsRequired=Math.max(0,VuN/phi-Vc);
   AvsRequired=Math.max(minAv,VsRequired>0?VsRequired/(fyMPa*dMm):0);
   spacing=AvsRequired>0?AvMm2/AvsRequired:null;
  }
  const VsLimit=0.33*Math.sqrt(fcMPa)*bwMm*dMm;
  const spacingLimit=VsRequired>VsLimit?Math.min(dMm/4,300):Math.min(dMm/2,600);
  const maxNominal=Vc+VcCapValue(lambda,fcMPa,bwMm,dMm);
  const maxShearOK=VuN<=phi*maxNominal;
  const requiredSpacing=spacing==null?null:Math.min(spacing,spacingLimit);
  providedAvPerS=requiredSpacing&&requiredSpacing>0?AvMm2/requiredSpacing:0;
  const providedVs=requiredSpacing&&requiredSpacing>0?AvMm2*fyMPa*dMm/requiredSpacing:0;
  const phiCapacity=phi*(Vc+providedVs);
  return{ok:true,VuKN:VuN/1000,NuCompressionKN:NuCompression/1000,VcKN:Vc/1000,VcInitialKN:Vc0/1000,VsRequiredKN:VsRequired/1000,
   minAvPerSmm2PerMm:minAv,requiredAvPerSmm2PerMm:AvsRequired,providedAvPerSmm2PerMm:providedAvPerS,spacingFromSteelMm:spacing,
   maxSpacingByChapter11Mm:spacingLimit,recommendedSpacingMm:requiredSpacing,providedVsKN:providedVs/1000,phiCapacityKN:phiCapacity/1000,
   maxNominalShearKN:maxNominal/1000,maxShearOK,minimumStirrupsTriggered:trigger,minimumStirrupsSatisfied:!trigger||providedAvPerS>=minAv-1e-9,
   spacingOK:!trigger||(requiredSpacing!=null&&requiredSpacing>0&&requiredSpacing<=spacingLimit+1e-9),
   shearOK:maxShearOK&&(!trigger||(phiCapacity>=VuN-1e-6&&providedAvPerS>=minAv-1e-9&&spacingOKValue(requiredSpacing,spacingLimit))),
   lambdaS,axialStressMPa:axialStress,formula:trigger?"Vc=0.17λ√fc bw d + Nu/(6Ag)؛ Vs=Av fy d/s":"Vc=0.66λs ρ^(1/3)√fc bw d + Nu/(6Ag)؛ در صورت عبور از آستانه، حداقل خاموت فعال می‌شود"};
 }
 function VcCapValue(lambda,fc,bw,d){return 0.66*lambda*Math.sqrt(fc)*bw*d;}
 function spacingOKValue(s,lim){return Number.isFinite(s)&&s>0&&s<=lim+1e-9;}
 function shearEnvelopeForRoute(envelopes,axis){
  const key=axis==="local-y"?"VyN":"VzN";
  let critical=null;
  for(let i=0;i<envelopes.length;i++){
   const e=envelopes[i],sample=e.samples.reduce((a,b)=>Math.abs(b[key])>Math.abs(a[key])?b:a,e.samples[0]);
   if(!critical||Math.abs(sample[key])>Math.abs(critical.sample[key]))critical={sample,memberIndex:i};
  }
  return critical;
 }
 function interactionMomentAtAxial(curve,axialN){
  if(!curve?.ok||!Number.isFinite(axialN))return null;
  let best=null;
  for(let i=1;i<curve.points.length;i++){
   const a=curve.points[i-1],b=curve.points[i],lo=Math.min(a.PnN,b.PnN),hi=Math.max(a.PnN,b.PnN);
   if(axialN<lo-1e-6||axialN>hi+1e-6||Math.abs(b.PnN-a.PnN)<1e-9)continue;
   const t=(axialN-a.PnN)/(b.PnN-a.PnN),m=a.MnNmm+t*(b.MnNmm-a.MnNmm);
   if(Number.isFinite(m)&&m>=0&&(!best||m>best.MnNmm))best={MnNmm:m,cMm:a.cMm+t*(b.cMm-a.cMm)};
  }
  return best?{...best,MnKNm:best.MnNmm/1e6}:null;
 }
 function sectionForceSamples(member,stations=40){
  const f=member.localEndForces||[],q=member.analysisLoad?.uniformLocal,L=Number(member.length)||0;
  if(f.length<12||!(L>0)||!Array.isArray(q)||q.length!==3)return null;
  const qx=Number(q[0])||0,qy=Number(q[1])||0,qz=Number(q[2])||0;
  const xs=new Set(Array.from({length:stations+1},(_,i)=>L*i/stations));
  if(Math.abs(qz)>1e-12){const x=-(Number(f[2])||0)/qz;if(x>0&&x<L)xs.add(x);}
  if(Math.abs(qy)>1e-12){const x=-(Number(f[1])||0)/qy;if(x>0&&x<L)xs.add(x);}
  return Array.from(xs).sort((a,b)=>a-b).map(x=>{
   const N=-(Number(f[0]||0)+qx*x);
   const Vy=-(Number(f[1]||0)+qy*x),Vz=-(Number(f[2]||0)+qz*x);
   const My=-(Number(f[4]||0)+Number(f[2]||0)*x+qz*x*x/2);
   const Mz=-(Number(f[5]||0)-Number(f[1]||0)*x-qy*x*x/2);
   return{xM:x,Nn:N,VyN:Vy,VzN:Vz,VresultantN:Math.hypot(Vy,Vz),MyNm:My,MzNm:Mz,MresultantNm:Math.hypot(My,Mz)};
  });
 }
 function memberEnvelope(member){
  const samples=sectionForceSamples(member);if(!samples)return null;
  const byMoment=samples.reduce((a,b)=>b.MresultantNm>a.MresultantNm?b:a,samples[0]);
  const byAxial=samples.reduce((a,b)=>Math.abs(b.Nn)>Math.abs(a.Nn)?b:a,samples[0]);
  const byShear=samples.reduce((a,b)=>b.VresultantN>a.VresultantN?b:a,samples[0]);
  return{MmaxNm:byMoment.MresultantNm,VmaxN:byShear.VresultantN,NmaxN:Math.abs(byAxial.Nn),criticalMoment:byMoment,criticalAxial:byAxial,samples};
 }
 function routeResult(route,members,material){
  members=Array.isArray(members)?members.filter(Boolean):[members].filter(Boolean);
  if(!members.length)return{id:route.id,ok:false,reason:"نیروهای انتهایی اعضای شناژ در نتیجه تحلیل موجود نیستند"};
  const forceRows=members.map(member=>({id:member.id,f:member.localEndForces||[]}));
  if(forceRows.some(x=>x.f.length<12))return{id:route.id,ok:false,reason:"نیروهای انتهایی یکی از قطعات شناژ موجود نیست"};
  const envelopes=members.map(memberEnvelope);
  if(envelopes.some(x=>!x))return{id:route.id,ok:false,reason:"برای محاسبه نمودار داخلی، طول/نیروهای یکی از قطعات شناژ معتبر نیست"};
  const criticalMoment=envelopes.map((x,i)=>({...x.criticalMoment,memberId:members[i].id})).reduce((a,b)=>b.MresultantNm>a.MresultantNm?b:a);
  const criticalAxial=envelopes.map((x,i)=>({...x.criticalAxial,memberId:members[i].id})).reduce((a,b)=>Math.abs(b.Nn)>Math.abs(a.Nn)?b:a);
  const M=criticalMoment.MresultantNm/1000;
  const V=Math.max(...envelopes.map(x=>x.VmaxN))/1000;
  const N=Math.max(...envelopes.map(x=>x.NmaxN))/1000;
  const h=Number(route.heightM)*1000,b=Number(route.widthM)*1000,fc=Number(route.fcMPa)||25;
  let d=h-settings.coverMm-settings.stirrupDiaMm-settings.barDiaMm/2;
  let As=flexuralAs(M,b,d,fc,settings.fyMPa,settings.phiFlexure);
  const barA=areaBar(settings.barDiaMm);
  let count=As.ok?Math.max(2,Math.ceil(As.AsRequiredMm2/barA)):null;
  let layout=count?buildSymmetricBarLayers(b,h,count,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm,settings.clearSpacingMm):{ok:false,reason:"تعداد میلگرد برای آرایش موجود نیست"};
  if(layout.ok){
   d=h-layout.bottomCentroidMm;
   As=flexuralAs(M,b,d,fc,settings.fyMPa,settings.phiFlexure);
   count=As.ok?Math.max(2,Math.ceil(As.AsRequiredMm2/barA)):null;
   layout=count?buildSymmetricBarLayers(b,h,count,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm,settings.clearSpacingMm):{ok:false,reason:"محاسبه مجدد آرماتور نامعتبر است"};
   if(layout.ok)d=h-layout.bottomCentroidMm;
  }
  const AsProvided=layout.ok?layout.totalAsMm2:null;
  const interaction=layout.ok?sectionInteractionCurve(b,h,fc,settings.fyMPa,settings.EsMPa,settings.alpha1,settings.beta1,settings.epsilonCu,layout.layers,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm):{ok:false,reason:layout.reason||"آرایش میلگرد معتبر نیست"};
  const interactionAtCritical=interaction.ok?interactionMomentAtAxial(interaction,criticalMoment.Nn):null;
  const nominalUtilization=interactionAtCritical?.MnKNm>0?M/interactionAtCritical.MnKNm:null;
  const fit=barLayerCapacity(b,settings.coverMm,settings.stirrupDiaMm,settings.barDiaMm,settings.clearSpacingMm);
  const singleLayerFits=!!(fit.ok&&count!==null&&count<=fit.maxBars);
  const multiLayerFits=!!layout.ok;
  const stirrupArea=settings.stirrupLegs*areaBar(settings.stirrupDiaMm);
  const shearY=shearEnvelopeForRoute(envelopes,"local-y"),shearZ=shearEnvelopeForRoute(envelopes,"local-z");
  const Ag=b*h;
  const shearYResult=shearY?shearDesignDirection(Math.abs(shearY.sample.VyN),shearY.sample.Nn,b,d,Ag,fc,settings.fyMPa,settings.phiShear,settings.lambdaConcrete,stirrupArea,(AsProvided||0)/2):{ok:false,reason:"نیروی برش محلی y موجود نیست"};
  const dZ=b-settings.coverMm-settings.stirrupDiaMm-settings.barDiaMm/2;
  const shearZResult=shearZ?shearDesignDirection(Math.abs(shearZ.sample.VzN),shearZ.sample.Nn,h,dZ,Ag,fc,settings.fyMPa,settings.phiShear,settings.lambdaConcrete,stirrupArea,(AsProvided||0)/2):{ok:false,reason:"نیروی برش محلی z موجود نیست"};
  const spacing=V>0?stirrupArea*settings.fyMPa*d/(V*1000):null;
  const foundation=window.SteelFoundationTakeoff?.getData?.()||{};
  const footingDimension=material?.axis==="X"?Number(foundation.footingWidthM):Number(foundation.footingLengthM);
  const footingExtension=Number.isFinite(footingDimension)&&footingDimension>0;
  const straightBarLength=footingExtension?Number(material?.lengthM)+footingDimension:null;
  const barsBothFaces=count?2*count:null;
  const totalStraightBarLengthM=barsBothFaces?barsBothFaces*straightBarLength:null;
  const unitMassKgM=Math.pow(settings.barDiaMm,2)/162;
  return{id:route.id,memberIds:forceRows.map(x=>x.id),segmentCount:members.length,ok:As.ok,MmaxKNm:M,VmaxKN:V,NmaxKN:N,
   criticalMoment:{...criticalMoment,NkN:criticalMoment.Nn/1000,MyKNm:criticalMoment.MyNm/1000,MzKNm:criticalMoment.MzNm/1000,MresultantKNm:criticalMoment.MresultantNm/1000},
   criticalAxial:{...criticalAxial,NkN:criticalAxial.Nn/1000,MyKNm:criticalAxial.MyNm/1000,MzKNm:criticalAxial.MzNm/1000,MresultantKNm:criticalAxial.MresultantNm/1000},
   interaction:{ok:interaction.ok,assumption:interaction.assumptions,pointCount:interaction.points?.length||0,atCriticalAxial:interactionAtCritical,nominalMomentUtilization:nominalUtilization,curve:interaction.points||[]},
   effectiveDepthMm:d,AsRequiredMm2:As.ok?As.AsRequiredMm2:null,barDiaMm:settings.barDiaMm,
   barCountEachFace:count,AsProvidedMm2:AsProvided,barLayer:{maxBars:fit.maxBars,centerSpanMm:fit.centerSpanMm,clearSpacingMm:settings.clearSpacingMm,singleLayerFits,multiLayerFits,rowsPerFace:layout.rowsPerFace||null,barsPerRow:layout.barsPerRow||[],bottomCentroidMm:layout.bottomCentroidMm||null,topCentroidMm:layout.topCentroidMm||null,layers:layout.layers||[]},
   longitudinalBars:{countEachFace:count,totalCount:barsBothFaces,straightLengthPerBarM:straightBarLength,
    totalStraightLengthM:totalStraightBarLengthM,approximateMassKg:totalStraightBarLengthM==null?null:totalStraightBarLengthM*unitMassKgM,
    hookAllowanceIncluded:false,footingExtensionIncluded:footingExtension},
   stirrup:{diaMm:settings.stirrupDiaMm,legs:settings.stirrupLegs,areaMm2:stirrupArea,steelOnlySpacingMm:spacing,shearY:shearYResult,shearZ:shearZResult,phi:settings.phiShear},
   note:"نیروهای تمام قطعات مسیر پیوسته بررسی شده‌اند. برای پوشش لنگرهای مثبت و منفی، آرماتور به‌صورت متقارن در دو وجه و در چند ردیف با مختصات واقعی ارتفاعی توزیع شده است. آرایش هندسی بر اساس فاصله آزاد ورودی است و جایگزین کنترل حداقل فاصله آیین‌نامه‌ای، تراکم بتن‌ریزی و تداخل خاموت نیست. طول مستقیم میلگرد تا وجه بیرونی دو فونداسیون انتهایی برآورد شده؛ طول قلاب و خم به علت نیاز به ضابطه/جزئیات معتبر به مقدار طول اضافه نشده است."};
 }
 function render(requireLatest){
  read();
  const box=$("tieRebarOutput"),status=$("tieRebarStatus");if(!box||!status)return;
  const tieData=window.SteelTieBeamLayout?.getData?.();
  if(!tieData?.routes?.length){status.textContent="هیچ مسیر شناژی تعریف نشده است.";return;}
  if(requireLatest&&!latest){status.textContent="نتیجه تحلیل سه‌بعدی در دسترس نیست؛ ابتدا تحلیل را اجرا کنید.";return;}
  if(!latest){status.textContent="تنظیمات ذخیره شد. برای محاسبه باید تحلیل سه‌بعدی اجرا شود.";return;}
  const included=new Map((latest.tieBeamIntegration?.included||[]).map(x=>[x.id,x]));
  const memberMap=new Map((latest.members||[]).map(x=>[String(x.id),x]));
  const rows=tieData.routes.map(route=>{
   const info=included.get(route.id);
   if(!info)return{id:route.id,ok:false,reason:"این مسیر در آخرین تحلیل وارد نشده است: "+((latest.tieBeamIntegration?.skipped||[]).find(x=>x.id===route.id)?.reasons||["ممیزی/اتصال/گره نامعتبر"]).join("؛ ")};
   const ids=info.memberIds||[info.memberId];
   return routeResult(route,ids.map(id=>memberMap.get(id)),info);
  });
  lastReport={generatedAt:new Date().toISOString(),loadCase:latest.loadCaseLabel||latest.loadCase,settings:{...settings},rows,
   limitations:["این خروجی غربال اولیه است و طراحی اجرایی یا تأیید آیین‌نامه‌ای نیست.","مقادیر نیرو از تحلیل خطی عضو با مقطع ناخالص و ترک‌نخورده گرفته شده‌اند.","برای خمش، رابطه تعادل مستطیلی قبلی صرفاً برآورد اولیه As است. منحنی N-M جدید با سازگاری کرنش خطی و بلوک مستطیلی α1/β1 ورودی، از مختصات گسسته ردیف‌های متقارن میلگرد بالا و پایین ساخته می‌شود؛ ضریب φ و اندرکنش دومحوره هنوز در آن اعمال نشده‌اند.","کنترل برش مقدماتی بر اساس روابط فصل ۸ و ۱۱ مبحث ۹ ویرایش ۱۳۹۹ پیاده شده است؛ اعتبار ویرایش و اصلاحیه‌ها باید برای پروژه تأیید شود. کنترل در دو راستای برش محلی جداگانه انجام می‌شود، اما جهت‌گیری مقطع/خاموت و آرایش جانبی میلگرد برای برش راستای دوم ساده‌سازی شده است؛ پیچش و اثرات لرزه‌ای ویژه هنوز وارد نشده‌اند.","نیروی محوری N با قرارداد علامت محلی (مثبت کششی) و لنگرهای هم‌زمان گزارش می‌شوند اما هنوز کنترل اندرکنش ظرفیت N-M انجام نمی‌شود.","برای گزارش M برآیند، مقاطع در ۴۰ گام طولی به‌علاوه نقاط ایستای مؤلفه‌های لنگر نمونه‌برداری می‌شوند؛ بیشینه برآیند ممکن است بین ایستگاه‌ها اندکی بزرگ‌تر باشد.","استفاده از لنگر برآیند به‌عنوان لنگر یک‌محوره صرفاً غربال اولیه است؛ طراحی خمش دومحوره و اندرکنش محوری تا پیاده‌سازی سازگاری کرنش معتبر نیست.","پیچش، خستگی، ترک، خیز، مهاری، وصله، طول قلاب، تداخل میلگردها و جزئیات عبور از فونداسیون کنترل نشده‌اند."]};
  status.textContent="نتیجه بر اساس آخرین تحلیل: "+lastReport.loadCase+"؛ مسیرها: "+rows.length+"؛ قابل محاسبه خمشی: "+rows.filter(x=>x.ok).length+".";
  box.textContent=rows.map(r=>{
   if(!r.ok)return"شناژ "+r.id+": "+r.reason;
   return"شناژ "+r.id+" — Mmax="+fmt(r.MmaxKNm)+" kN·m؛ Vmax="+fmt(r.VmaxKN)+" kN؛ Nmax="+fmt(r.NmaxKN)+" kN"+
     "\nمقطع بحرانی M برآیند در عضو "+r.criticalMoment.memberId+" و x="+fmt(r.criticalMoment.xM)+" m: N هم‌زمان="+fmt(r.criticalMoment.NkN)+" kN؛ My="+fmt(r.criticalMoment.MyKNm)+" kN·m؛ Mz="+fmt(r.criticalMoment.MzKNm)+" kN·m."+
     "\nبیشینه N در عضو "+r.criticalAxial.memberId+" و x="+fmt(r.criticalAxial.xM)+" m: N="+fmt(r.criticalAxial.NkN)+" kN؛ M برآیند هم‌زمان="+fmt(r.criticalAxial.MresultantKNm)+" kN·m. این گزارش تقاضای هم‌زمان است، نه کنترل اندرکنش ظرفیت."+
    "\nمنحنی اسمی N-M در نیروی محوری نقطه بحرانی: "+(r.interaction.atCriticalAxial?("Mn اسمی≈"+fmt(r.interaction.atCriticalAxial.MnKNm)+" kN·m؛ نسبت تقاضای M به Mn اسمی≈"+fmt(r.interaction.nominalMomentUtilization,3)):"نیروی محوری خارج از بازه منحنی یا منحنی نامعتبر است")+"؛ این نسبت فاقد ضریب φ و صرفاً غربال تک‌محوره است."+
    "\nعمق مؤثر تقریبی d="+fmt(r.effectiveDepthMm)+" mm؛ As لازم="+fmt(r.AsRequiredMm2)+" mm²؛ برآورد صرفاً از خمش نظری (پیش از حداقل آرماتور آیین‌نامه‌ای): "+r.barCountEachFace+" میلگرد قطر "+r.barDiaMm+" در هر وجه کششی (As فراهم="+fmt(r.AsProvidedMm2)+" mm²)"+
    "\nچیدمان طولی: "+(r.barLayer.singleLayerFits?"از نظر هندسی در یک ردیف جا می‌شود":"در یک ردیف جا نمی‌شود؛ آرایش چندلایه و بازنگری عمق مؤثر لازم است")+"؛ حداکثر تعداد در یک ردیف="+r.barLayer.maxBars+"؛ فاصله آزاد مفروض="+fmt(r.barLayer.clearSpacingMm)+" mm (غیرآیین‌نامه‌ای)"+
    "\nکنترل برش محلی y: "+(r.stirrup.shearY.ok?("Vu="+fmt(r.stirrup.shearY.VuKN)+" kN؛ φVn,max="+fmt(r.stirrup.shearY.maxNominalShearKN*r.stirrup.phi)+" kN؛ خاموت حداقل لازم="+(r.stirrup.shearY.minimumStirrupsTriggered?"بله":"خیر")+(r.stirrup.shearY.recommendedSpacingMm==null?"":"؛ فاصله پیشنهادی="+fmt(r.stirrup.shearY.recommendedSpacingMm)+" mm؛ φ(Vc+Vs)="+fmt(r.stirrup.shearY.phiCapacityKN)+" kN؛ حد فصل ۱۱="+fmt(r.stirrup.shearY.maxSpacingByChapter11Mm)+" mm")+(r.stirrup.shearY.shearOK?"؛ کنترل مقدماتی برقرار":"؛ کنترل برش/خاموت برقرار نیست")):r.stirrup.shearY.reason)+
    "\nکنترل برش محلی z: "+(r.stirrup.shearZ.ok?("Vu="+fmt(r.stirrup.shearZ.VuKN)+" kN؛ φVn,max="+fmt(r.stirrup.shearZ.maxNominalShearKN*r.stirrup.phi)+" kN؛ خاموت حداقل لازم="+(r.stirrup.shearZ.minimumStirrupsTriggered?"بله":"خیر")+(r.stirrup.shearZ.recommendedSpacingMm==null?"":"؛ فاصله پیشنهادی="+fmt(r.stirrup.shearZ.recommendedSpacingMm)+" mm؛ φ(Vc+Vs)="+fmt(r.stirrup.shearZ.phiCapacityKN)+" kN؛ حد فصل ۱۱="+fmt(r.stirrup.shearZ.maxSpacingByChapter11Mm)+" mm")+(r.stirrup.shearZ.shearOK?"؛ کنترل مقدماتی برقرار":"؛ کنترل برش/خاموت برقرار نیست")):r.stirrup.shearZ.reason)+
    "\nمیلگرد طولی دو وجه: "+r.longitudinalBars.totalCount+" عدد؛ طول مستقیم هر میلگرد تا وجه بیرونی پی‌های انتهایی: "+(r.longitudinalBars.footingExtensionIncluded?fmt(r.longitudinalBars.straightLengthPerBarM)+" m":"ابعاد پی وارد نشده")+"؛ مجموع طول مستقیم: "+(r.longitudinalBars.totalStraightLengthM==null?"—":fmt(r.longitudinalBars.totalStraightLengthM)+" m")+"؛ وزن تقریبی بدون قلاب: "+(r.longitudinalBars.approximateMassKg==null?"—":fmt(r.longitudinalBars.approximateMassKg)+" kg")+
    "\n"+r.note;
  }).join("\n\n")+
  "\n\nمحدودیت‌ها:\n- "+lastReport.limitations.join("\n- ");
  return lastReport;
 }
 function selfTest(){
  const pinned={length:6,localEndForces:[0,3600,0,0,0,0,0,3600,0,0,0,0],analysisLoad:{uniformLocal:[0,-1200,0]}};
  const cantileverX={length:6,localEndForces:[0,7200,0,0,0,21600,0,0,0,0,0,0],analysisLoad:{uniformLocal:[0,-1200,0]}};
  const cantileverZ={length:6,localEndForces:[0,0,7200,0,-21600,0,0,0,0,0,0,0],analysisLoad:{uniformLocal:[0,0,-1200]}};
  const ep=memberEnvelope(pinned),ex=memberEnvelope(cantileverX),ez=memberEnvelope(cantileverZ);
  const axialSample=sectionForceSamples({length:6,localEndForces:[10000,0,0,0,0,0,0,0,0,0,0,0],analysisLoad:{uniformLocal:[-1000,0,0]}});
  const axialMid=axialSample?.find(x=>Math.abs(x.xM-3)<1e-9);
  const biaxialSample=sectionForceSamples({length:6,localEndForces:[10000,3600,4800,0,0,0,0,0,0,0,0,0],analysisLoad:{uniformLocal:[-1000,-1200,-1600]}});
  const biaxialMid=biaxialSample?.find(x=>Math.abs(x.xM-3)<1e-9);
  const r=flexuralAs(100,600,442,25,400,0.90);
  if(!r.ok)return{passed:false,reason:r.reason};
  const testLayout=buildSymmetricBarLayers(600,500,4,40,10,16,25);
  const ic=testLayout.ok?sectionInteractionCurve(600,500,25,400,200000,0.85,0.85,0.003,testLayout.layers,40,10,16):{ok:false,points:[]};
  const midCapacity=ic.ok?interactionMomentAtAxial(ic,0):null;
  const tensileEnd=ic.points?.[1]?.PnN,compressionEnd=ic.points?.[ic.points.length-1]?.PnN;
  const a=r.AsRequiredMm2,depth=a*400/(0.85*25*600);
  const capacity=0.90*a*400*(442-depth/2)/1e6;
  const barCount=Math.max(2,Math.ceil(a/areaBar(16)));
  const provided=barCount*areaBar(16);
  const spacing=2*areaBar(10)*400*442/(100000);
  const layer=barLayerCapacity(600,40,10,16,25);
  const shearTest=shearDesignDirection(80000,0,600,442,300000,25,400,0.75,1,2*areaBar(10),8*areaBar(16));
  const shearHigh=shearDesignDirection(3000000,0,600,442,300000,25,400,0.75,1,2*areaBar(10),8*areaBar(16));
  const shearLow=shearDesignDirection(10000,0,600,442,300000,25,400,0.75,1,2*areaBar(10),8*areaBar(16));
  const checks={shearScreenValid:shearTest.ok&&shearTest.maxNominalShearKN>0&&shearTest.minAvPerSmm2PerMm>0,
   shearSpacingUsesCodeLimit:shearTest.recommendedSpacingMm===shearTest.maxSpacingByChapter11Mm&&shearTest.providedAvPerSmm2PerMm>=shearTest.minAvPerSmm2PerMm,
   shearMaximumCapacityRejectsExcess:shearHigh.ok&&!shearHigh.maxShearOK&&!shearHigh.shearOK,
   shearLowDemandNoMinimumStirrups:shearLow.ok&&!shearLow.minimumStirrupsTriggered,barLayerCapacity:layer.ok&&layer.maxBars===12,interactionCurveGenerated:ic.ok&&ic.points.length===102,multiLayerLayout:!!testLayout.ok&&testLayout.rowsPerFace===1&&Math.abs(testLayout.totalAsMm2-8*areaBar(16))<1e-8,zeroAxialInteractionCapacity:!!midCapacity&&midCapacity.MnKNm>100&&midCapacity.MnKNm<180&&Number.isFinite(midCapacity.MnKNm),interactionSignConvention:Number.isFinite(tensileEnd)&&tensileEnd>0&&Number.isFinite(compressionEnd)&&compressionEnd<0,concurrentAxialForceDiagram:!!axialMid&&Math.abs(axialMid.Nn+7000)<1e-6,biaxialMomentResultant:!!biaxialMid&&Math.abs(biaxialMid.MyNm+7200)<1e-6&&Math.abs(biaxialMid.MzNm-5400)<1e-6&&Math.abs(biaxialMid.MresultantNm-9000)<1e-6&&Math.abs(biaxialMid.Nn+7000)<1e-6,flexuralEquilibrium:Math.abs(capacity-100)<1e-6,barAreaSufficient:provided+1e-9>=a,positiveShearSpacing:spacing>0&&Number.isFinite(spacing),
   pinnedMidspanMoment:Math.abs(ep.MmaxNm-5400)<1e-6,pinnedMaxShear:Math.abs(ep.VmaxN-3600)<1e-6,
   cantileverXMoment:Math.abs(ex.MmaxNm-21600)<1e-6,cantileverZMoment:Math.abs(ez.MmaxNm-21600)<1e-6};
  return{passed:Object.values(checks).every(Boolean),checks,barLayerCapacity600mm:layer,interactionCurvePoints:ic.points?.length,multiLayerTestLayout:testLayout,shearScreenTest:shearTest,shearHighDemandTest:shearHigh,shearLowDemandTest:shearLow,zeroAxialInteractionCapacity:midCapacity,axialMidSample:axialMid,biaxialMidSample:biaxialMid,AsRequiredMm2:a,phiMnKNm:capacity,bars16PerFace:barCount,AsProvidedMm2:provided,twoLeg10SteelOnlySpacingAt100kNmm:spacing,
   pinnedUniformLoadMomentNm:ep.MmaxNm,cantileverMomentNm:ex.MmaxNm};
 }
 function captureAnalysis(result){if(result&&Array.isArray(result.members)){latest=JSON.parse(JSON.stringify(result));render(false);}}
 function getData(){read();return{schemaVersion:2,settings:{...settings}};}
 function setData(d){if(d&&d.settings)settings={...defaults,...d.settings};try{const s=JSON.parse(localStorage.getItem("sahroudSteel.tieBeamRebarSettings.v1")||"null");if(s&&!d?.settings)settings={...defaults,...s};}catch(e){}write();}
 window.SteelTieBeamReinforcement={captureAnalysis,getData,setData,run:()=>render(true),selfTest,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
 document.addEventListener("DOMContentLoaded",()=>{try{const s=JSON.parse(localStorage.getItem("sahroudSteel.tieBeamRebarSettings.v1")||"null");if(s)settings={...defaults,...s};}catch(e){}mount();});
})();
