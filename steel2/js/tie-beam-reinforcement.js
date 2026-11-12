/* SAHROUD STEEL — preliminary tie-beam reinforcement screening.
 * Uses actions from the latest 3D analysis. Not code-certified design.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const defaults={fyMPa:400,coverMm:40,barDiaMm:16,stirrupDiaMm:10,stirrupLegs:2,phiFlexure:0.90};
 let settings={...defaults},latest=null,lastReport=null;
 const fmt=(v,d=2)=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:d});
 function mount(){
  if($("tieBeamRebarPanel"))return;
  const anchor=$("tieBeamLayoutPanel");if(!anchor)return;
  const p=document.createElement("section");p.className="panel";p.id="tieBeamRebarPanel";
  p.innerHTML='<div class="panel-title"><h3>کنترل مقدماتی آرماتور شناژ بر اساس نیروهای تحلیل</h3><span class="status">غربال اولیه؛ نه طراحی نهایی</span></div>'+
  '<div class="notice">پس از اجرای تحلیل سه‌بعدی، نیروهای انتهایی هر شناژ از نتیجه حل‌گر خوانده می‌شوند. برای برآورد اولیه خمشی از رابطه تعادل مقطع مستطیلی استفاده می‌شود؛ مشارکت بتن در برش منظور نمی‌شود. ضرایب و حداقل‌های آیین‌نامه‌ای، ضوابط لرزه‌ای و طول مهاری باید پس از تعیین آیین‌نامه معتبر کنترل شوند.</div>'+
  '<div class="form-grid">'+
  '<div class="field"><label for="tbrFy">تنش تسلیم میلگرد fy (MPa)</label><input id="tbrFy" type="number" min="200" max="700" step="5" value="400"></div>'+
  '<div class="field"><label for="tbrCover">پوشش بتن (mm)</label><input id="tbrCover" type="number" min="20" max="100" step="5" value="40"></div>'+
  '<div class="field"><label for="tbrBarDia">قطر پیشنهادی میلگرد طولی (mm)</label><select id="tbrBarDia"><option>12</option><option>14</option><option selected>16</option><option>18</option><option>20</option><option>22</option><option>25</option><option>28</option><option>32</option></select></div>'+
  '<div class="field"><label for="tbrStirrupDia">قطر خاموت (mm)</label><input id="tbrStirrupDia" type="number" min="6" max="16" step="1" value="10"></div>'+
  '<div class="field"><label for="tbrLegs">تعداد شاخه مؤثر خاموت</label><select id="tbrLegs"><option value="2" selected>۲ شاخه</option><option value="4">۴ شاخه</option></select></div>'+
  '<div class="field"><label for="tbrPhi">ضریب مقاومت خمشی فرضی φ</label><input id="tbrPhi" type="number" min="0.5" max="1" step="0.01" value="0.90"></div>'+
  '</div><div class="notice">مقادیر fy=400، پوشش ۴۰، قطر طولی ۱۶ و φ=۰٫۹ صرفاً پیش‌فرض غربال اولیه‌اند؛ باید با مشخصات واقعی میلگرد، شرایط محیطی، حریق، قطر سنگدانه و آیین‌نامه پروژه تطبیق داده شوند.</div>'+
  '<div class="button-grid"><button type="button" class="btn secondary" id="btnRunTieRebarScreen">محاسبه مقدماتی آرماتور از آخرین تحلیل</button><button type="button" class="btn secondary" id="btnResetTieRebarDefaults">بازگردانی پیش‌فرض‌ها</button></div>'+
  '<div id="tieRebarStatus" class="notice">ابتدا تحلیل سه‌بعدی را اجرا کنید؛ سپس کنترل مقدماتی در این قسمت قابل انجام است.</div>'+
  '<div id="tieRebarOutput" class="result-box">هنوز نتیجه‌ای محاسبه نشده است.</div>'+
  '<div class="notice">این محاسبه حداقل آرماتور آیین‌نامه‌ای، کنترل ترک، خیز، دوام، حداکثر فاصله میلگرد، محدودیت فاصله خاموت، برش بتن، پیچش، اثر زلزله، مهاری و وصله را تعیین نمی‌کند. مقدار فاصله خاموت صرفاً از تقاضای فولادی برشی و بدون مشارکت بتن استخراج می‌شود و حد نهایی اجرایی نیست.</div>';
  anchor.parentNode.insertBefore(p,anchor.nextSibling);
  ["tbrFy","tbrCover","tbrBarDia","tbrStirrupDia","tbrLegs","tbrPhi"].forEach(id=>$(id).addEventListener("change",read));
  $("btnRunTieRebarScreen").addEventListener("click",()=>render(true));
  $("btnResetTieRebarDefaults").addEventListener("click",()=>{settings={...defaults};write();render(false);});
  write();
 }
 function read(){
  if(!$("tbrFy"))return;
  settings={fyMPa:Number($("tbrFy").value),coverMm:Number($("tbrCover").value),barDiaMm:Number($("tbrBarDia").value),stirrupDiaMm:Number($("tbrStirrupDia").value),stirrupLegs:Number($("tbrLegs").value),phiFlexure:Number($("tbrPhi").value)};
  try{localStorage.setItem("sahroudSteel.tieBeamRebarSettings.v1",JSON.stringify(settings));}catch(e){}
 }
 function write(){
  if(!$("tbrFy"))return;
  Object.entries({tbrFy:settings.fyMPa,tbrCover:settings.coverMm,tbrBarDia:settings.barDiaMm,tbrStirrupDia:settings.stirrupDiaMm,tbrLegs:settings.stirrupLegs,tbrPhi:settings.phiFlexure}).forEach(([id,v])=>{if($(id))$(id).value=v;});
 }
 function areaBar(d){return Math.PI*d*d/4;}
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
 function memberEnvelope(member){
  const f=member.localEndForces||[],q=member.analysisLoad?.uniformLocal||[0,0,0],L=Number(member.length)||0;
  if(f.length<12||!(L>0))return null;
  const candidates=[Math.abs(Number(f[4])||0),Math.abs(Number(f[5])||0),Math.abs(Number(f[10])||0),Math.abs(Number(f[11])||0)];
  const shears=[Math.abs(Number(f[1])||0),Math.abs(Number(f[2])||0),Math.abs(Number(f[7])||0),Math.abs(Number(f[8])||0)];
  const addPlane=(m0,v0,load,sign)=>{
   const m=Number(m0)||0,v=Number(v0)||0,w=Number(load)||0;
   const value=x=>m+sign*v*x+sign*w*x*x/2;
   candidates.push(Math.abs(value(0)),Math.abs(value(L)));
   if(Math.abs(w)>1e-12){const x=-v/w;if(x>0&&x<L)candidates.push(Math.abs(value(x)));}
   shears.push(Math.abs(v),Math.abs(v+w*L));
  };
  // Local equilibrium: q_y produces M_z; q_z produces M_y.
  addPlane(f[5],f[1],q[1],-1);
  addPlane(f[4],f[2],q[2],1);
  return{MmaxNm:Math.max(...candidates),VmaxN:Math.max(...shears),
   NmaxN:Math.max(Math.abs(Number(f[0])||0),Math.abs(Number(f[6])||0))};
 }
 function routeResult(route,members,material){
  members=Array.isArray(members)?members.filter(Boolean):[members].filter(Boolean);
  if(!members.length)return{id:route.id,ok:false,reason:"نیروهای انتهایی اعضای شناژ در نتیجه تحلیل موجود نیستند"};
  const forceRows=members.map(member=>({id:member.id,f:member.localEndForces||[]}));
  if(forceRows.some(x=>x.f.length<12))return{id:route.id,ok:false,reason:"نیروهای انتهایی یکی از قطعات شناژ موجود نیست"};
  const envelopes=members.map(memberEnvelope);
  if(envelopes.some(x=>!x))return{id:route.id,ok:false,reason:"برای محاسبه نمودار داخلی، طول/نیروهای یکی از قطعات شناژ معتبر نیست"};
  const M=Math.max(...envelopes.map(x=>x.MmaxNm))/1000;
  const V=Math.max(...envelopes.map(x=>x.VmaxN))/1000;
  const N=Math.max(...envelopes.map(x=>x.NmaxN))/1000;
  const h=Number(route.heightM)*1000,b=Number(route.widthM)*1000,fc=Number(route.fcMPa)||25;
  const d=h-settings.coverMm-settings.stirrupDiaMm-settings.barDiaMm/2;
  const As=flexuralAs(M,b,d,fc,settings.fyMPa,settings.phiFlexure);
  const barA=areaBar(settings.barDiaMm);
  const count=As.ok?Math.max(2,Math.ceil(As.AsRequiredMm2/barA)):null;
  const AsProvided=count?count*barA:null;
  const stirrupArea=settings.stirrupLegs*areaBar(settings.stirrupDiaMm);
  const spacing=V>0?stirrupArea*settings.fyMPa*d/(V*1000):null;
  const foundation=window.SteelFoundationTakeoff?.getData?.()||{};
  const footingDimension=material?.axis==="X"?Number(foundation.footingWidthM):Number(foundation.footingLengthM);
  const footingExtension=Number.isFinite(footingDimension)&&footingDimension>0;
  const straightBarLength=footingExtension?Number(material?.lengthM)+footingDimension:null;
  const barsBothFaces=count?2*count:null;
  const totalStraightBarLengthM=barsBothFaces?barsBothFaces*straightBarLength:null;
  const unitMassKgM=Math.pow(settings.barDiaMm,2)/162;
  return{id:route.id,memberIds:forceRows.map(x=>x.id),segmentCount:members.length,ok:As.ok,MmaxKNm:M,VmaxKN:V,NmaxKN:N,
   effectiveDepthMm:d,AsRequiredMm2:As.ok?As.AsRequiredMm2:null,barDiaMm:settings.barDiaMm,
   barCountEachFace:count,AsProvidedMm2:AsProvided,
   longitudinalBars:{countEachFace:count,totalCount:barsBothFaces,straightLengthPerBarM:straightBarLength,
    totalStraightLengthM:totalStraightBarLengthM,approximateMassKg:totalStraightBarLengthM==null?null:totalStraightBarLengthM*unitMassKgM,
    hookAllowanceIncluded:false,footingExtensionIncluded:footingExtension},
   stirrup:{diaMm:settings.stirrupDiaMm,legs:settings.stirrupLegs,areaMm2:stirrupArea,steelOnlySpacingMm:spacing},
   note:"نیروهای تمام قطعات مسیر پیوسته بررسی شده‌اند. برای پوشش لنگرهای مثبت و منفی، آرماتور کششی به‌صورت متقارن در دو وجه برآورد شده است. طول مستقیم میلگرد تا وجه بیرونی دو فونداسیون انتهایی برآورد شده؛ طول قلاب و خم به علت نیاز به ضابطه/جزئیات معتبر به مقدار طول اضافه نشده است."};
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
   limitations:["این خروجی غربال اولیه است و طراحی اجرایی یا تأیید آیین‌نامه‌ای نیست.","مقادیر نیرو از تحلیل خطی عضو با مقطع ناخالص و ترک‌نخورده گرفته شده‌اند.","برای خمش، رابطه تعادل مقطع مستطیلی با φ و fy ورودی استفاده شده؛ حداقل/حداکثر آرماتور و کرنش نهایی کنترل نشده است.","برای برش، فقط سهم فولاد خاموت بدون مشارکت بتن محاسبه شده؛ فاصله مجاز آیین‌نامه‌ای و ضوابط لرزه‌ای کنترل نشده است.","نیروی محوری N گزارش می‌شود اما هنوز با خمش در طراحی اندرکنش ندارد.","پیچش، خستگی، ترک، خیز، مهاری، وصله، طول قلاب، تداخل میلگردها و جزئیات عبور از فونداسیون کنترل نشده‌اند."]};
  status.textContent="نتیجه بر اساس آخرین تحلیل: "+lastReport.loadCase+"؛ مسیرها: "+rows.length+"؛ قابل محاسبه خمشی: "+rows.filter(x=>x.ok).length+".";
  box.textContent=rows.map(r=>{
   if(!r.ok)return"شناژ "+r.id+": "+r.reason;
   return"شناژ "+r.id+" — Mmax="+fmt(r.MmaxKNm)+" kN·m؛ Vmax="+fmt(r.VmaxKN)+" kN؛ Nmax="+fmt(r.NmaxKN)+" kN"+
    "\nعمق مؤثر تقریبی d="+fmt(r.effectiveDepthMm)+" mm؛ As لازم="+fmt(r.AsRequiredMm2)+" mm²؛ پیشنهاد محاسباتی: "+r.barCountEachFace+" میلگرد قطر "+r.barDiaMm+" در هر وجه کششی (As فراهم="+fmt(r.AsProvidedMm2)+" mm²)"+
    "\nخاموت: "+r.stirrup.legs+" شاخه قطر "+r.stirrup.diaMm+"؛ فاصله نظری از سهم فولاد برشی تنها="+(r.stirrup.steelOnlySpacingMm==null?"—":fmt(r.stirrup.steelOnlySpacingMm)+" mm")+
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
  const r=flexuralAs(100,600,442,25,400,0.90);
  if(!r.ok)return{passed:false,reason:r.reason};
  const a=r.AsRequiredMm2,depth=a*400/(0.85*25*600);
  const capacity=0.90*a*400*(442-depth/2)/1e6;
  const barCount=Math.max(2,Math.ceil(a/areaBar(16)));
  const provided=barCount*areaBar(16);
  const spacing=2*areaBar(10)*400*442/(100000);
  const checks={flexuralEquilibrium:Math.abs(capacity-100)<1e-6,barAreaSufficient:provided+1e-9>=a,positiveShearSpacing:spacing>0&&Number.isFinite(spacing),
   pinnedMidspanMoment:Math.abs(ep.MmaxNm-5400)<1e-6,pinnedMaxShear:Math.abs(ep.VmaxN-3600)<1e-6,
   cantileverXMoment:Math.abs(ex.MmaxNm-21600)<1e-6,cantileverZMoment:Math.abs(ez.MmaxNm-21600)<1e-6};
  return{passed:Object.values(checks).every(Boolean),checks,AsRequiredMm2:a,phiMnKNm:capacity,bars16PerFace:barCount,AsProvidedMm2:provided,twoLeg10SteelOnlySpacingAt100kNmm:spacing,
   pinnedUniformLoadMomentNm:ep.MmaxNm,cantileverMomentNm:ex.MmaxNm};
 }
 function captureAnalysis(result){if(result&&Array.isArray(result.members)){latest=JSON.parse(JSON.stringify(result));render(false);}}
 function getData(){read();return{schemaVersion:1,settings:{...settings}};}
 function setData(d){if(d&&d.settings)settings={...defaults,...d.settings};try{const s=JSON.parse(localStorage.getItem("sahroudSteel.tieBeamRebarSettings.v1")||"null");if(s&&!d?.settings)settings={...defaults,...s};}catch(e){}write();}
 window.SteelTieBeamReinforcement={captureAnalysis,getData,setData,run:()=>render(true),selfTest,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
 document.addEventListener("DOMContentLoaded",()=>{try{const s=JSON.parse(localStorage.getItem("sahroudSteel.tieBeamRebarSettings.v1")||"null");if(s)settings={...defaults,...s};}catch(e){}mount();});
})();
