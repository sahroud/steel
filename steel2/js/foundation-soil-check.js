(function(root){
 "use strict";
 let lastResult=null;
 const finite=(v,label)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;};
 function validateSoil(input){
  const d=input||{},qa=finite(d.allowableBearingKPa,"ظرفیت مجاز باربری خاک");
  const soilType=String(d.soilType||"").trim().toUpperCase();
  if(!["I","II","III"].includes(soilType))throw new Error("تیپ خاک باید طبق گزارش ژئوتکنیک یکی از I، II یا III انتخاب شود.");
  if(!(qa>0))throw new RangeError("ظرفیت مجاز باربری خاک باید مثبت باشد.");
  if(!["gross","net"].includes(d.allowableBearingBasis))
   throw new Error("مبنای ظرفیت مجاز باید از گزارش ژئوتکنیک به‌صورت gross (ناخالص) یا net (خالص) مشخص شود.");
  if(typeof d.sourceReference!=="string"||!d.sourceReference.trim())throw new Error("مرجع گزارش ژئوتکنیک و شماره صفحه/بند الزامی است.");
  return Object.freeze({soilType,allowableBearingKPa:qa,allowableBearingBasis:d.allowableBearingBasis,sourceReference:d.sourceReference.trim()});
 }
 function mapSupportReactionToSlsCase(input){
  const d=input||{};
  if(d.solverSuccess!==true||d.equilibriumOK!==true)
   throw new Error("تبدیل واکنش فقط برای حل موفق با تعادل تأییدشده مجاز است.");
  if(String(d.loadCaseType||"").toUpperCase()!=="SLS")
   throw new Error("تبدیل واکنش به پی فقط برای حالت بار صریحاً تأییدشده SLS مجاز است؛ ULS پذیرفته نیست.");
  if(typeof d.sourceReference!=="string"||!d.sourceReference.trim())
   throw new Error("مرجع مستند تحلیل SLS برای تبدیل واکنش الزامی است.");
  if(d.serviceabilityCheck!=="foundation-bearing")
   throw new Error("نوع کنترل بهره‌برداری باید صریحاً foundation-bearing باشد.");
  if(typeof d.combinationDefinition!=="string"||!d.combinationDefinition.trim())
   throw new Error("تعریف دقیق ترکیب بار SLS برای تبدیل واکنش الزامی است.");
  if(d.footingWidthAxis!=="X"||d.footingLengthAxis!=="Z"||d.verticalAxis!=="Y")
   throw new Error("جهت محورهای پی باید صریح و عمود بر هم باشد: عرض/طول در X و Z و قائم در Y.");
  const ledger=d.ledgerEntry;
  if(!ledger||!ledger.nodeId||!ledger.coordinatesM||!ledger.reactionN||!ledger.reactionNm)
   throw new Error("رکورد واکنش تکیه‌گاهی کامل نیست.");
  if(!Array.isArray(ledger.fixedDofs)||![0,1,2].every(x=>ledger.fixedDofs.includes(x)))
   throw new Error("هر سه انتقال گره پایه باید مقید و واکنش‌های انتقالی ثبت شده باشند.");
  if(ledger.units?.force!=="N"||ledger.units?.moment!=="N.m")
   throw new Error("واحدهای رکورد واکنش باید N و N.m باشند.");
  const nodeId=String(ledger.nodeId||"").trim();
  if(!nodeId)throw new Error("شناسه گره پایه الزامی است.");
  const coordinates={
   x:finite(ledger.coordinatesM.x,"مختصات X"),
   y:finite(ledger.coordinatesM.y,"مختصات Y"),
   z:finite(ledger.coordinatesM.z,"مختصات Z")
  };
  const fy=finite(ledger.reactionN.Fy,"واکنش قائم Fy");
  const mx=finite(ledger.reactionNm.Mx,"واکنش Mx");
  const my=finite(ledger.reactionNm.My,"واکنش My");
  const mz=finite(ledger.reactionNm.Mz,"واکنش Mz");
  const fx=finite(ledger.reactionN.Fx,"واکنش Fx");
  const fz=finite(ledger.reactionN.Fz,"واکنش Fz");
  if(fy < -1e-6)
   throw new Error("واکنش قائم کششی/بلندکننده است؛ کنترل فشار باربری پی بدون مدل مهار کششی و کنترل بلندشدگی مجاز نیست.");
  return Object.freeze({
   name:String(d.loadCaseName||"SLS reaction "+nodeId),
   NkN:fy/1000,
   MxkNm:-mx/1000000,
   MzkNm:-mz/1000000,
   sourceReference:d.sourceReference.trim(),
   serviceabilityCheck:d.serviceabilityCheck,
   combinationDefinition:d.combinationDefinition.trim(),
   supportNodeId:nodeId,
   supportCoordinatesM:coordinates,
   horizontalReactionsKN:{Fx:-fx/1000,Fz:-fz/1000},
   torsionalReactionKNm:-my/1000000,
   conversion:{vertical:"Fy solver reaction on structure is converted to positive downward compression on footing",moments:"Mx, My and Mz are reversed from support-on-structure to structure-on-footing",widthAxis:d.footingWidthAxis,lengthAxis:d.footingLengthAxis,verticalAxis:"Y"},
   limitations:["این تبدیل فقط واکنش گره پایه را به کنش قائم و لنگرهای سازگار با محورهای جهانی X/Z تبدیل می‌کند.","نیروهای افقی و گشتاور پیچشی با علامت کنش سازه بر پی (مخالف واکنش تکیه‌گاه بر سازه) گزارش می‌شوند و در کنترل فشار قائم فعلی منظور نشده‌اند؛ کنترل لغزش و برش لازم است.","مرکزیت ستون نسبت به مرکز پی، ابعاد واقعی پی، شناژها، پدستال و خروج از مرکزیت هندسی هنوز باید جداگانه تعیین شوند."]
  });
 }
 function mapSupportReactionToAnchorDemand(input){
  const d=input||{};
  if(d.solverSuccess!==true||d.equilibriumOK!==true)
   throw new Error("استخراج تقاضای انکر فقط برای حل موفق با تعادل تأییدشده مجاز است.");
  if(String(d.loadCaseType||"").toUpperCase()!=="ULS")
   throw new Error("استخراج تقاضای کششی انکر باید از ترکیب حدی ULS صریح و مستند انجام شود؛ SLS جایگزین آن نیست.");
  if(typeof d.sourceReference!=="string"||!d.sourceReference.trim())
   throw new Error("مرجع مستند تحلیل ULS برای استخراج تقاضای انکر الزامی است.");
  if(typeof d.combinationDefinition!=="string"||!d.combinationDefinition.trim())
   throw new Error("تعریف دقیق ترکیب بار ULS برای استخراج تقاضای انکر الزامی است.");
  if(d.footingWidthAxis!=="X"||d.footingLengthAxis!=="Z"||d.verticalAxis!=="Y")
   throw new Error("محورهای پایه باید صریح باشند: عرض X، طول Z و قائم Y.");
  const ledger=d.ledgerEntry;
  if(!ledger||!ledger.nodeId||!ledger.coordinatesM||!ledger.reactionN||!ledger.reactionNm)
   throw new Error("رکورد واکنش پایه برای استخراج تقاضای انکر کامل نیست.");
  if(!Array.isArray(ledger.fixedDofs)||![0,1,2].every(x=>ledger.fixedDofs.includes(x)))
   throw new Error("سه درجه آزادی انتقالی پایه باید مقید باشند.");
  if(ledger.units?.force!=="N"||ledger.units?.moment!=="N.m")
   throw new Error("واحدهای واکنش پایه باید N و N.m باشند.");
  const nodeId=String(ledger.nodeId).trim();
  if(!nodeId)throw new Error("شناسه گره پایه الزامی است.");
  const coordinates={x:finite(ledger.coordinatesM.x,"مختصات X"),y:finite(ledger.coordinatesM.y,"مختصات Y"),z:finite(ledger.coordinatesM.z,"مختصات Z")};
  const fy=finite(ledger.reactionN.Fy,"واکنش قائم Fy");
  const fx=finite(ledger.reactionN.Fx,"واکنش Fx"),fz=finite(ledger.reactionN.Fz,"واکنش Fz");
  const mx=finite(ledger.reactionNm.Mx,"واکنش Mx"),my=finite(ledger.reactionNm.My,"واکنش My"),mz=finite(ledger.reactionNm.Mz,"واکنش Mz");
  const upliftKN=Math.max(0,-fy/1000);
  return Object.freeze({
   supportNodeId:nodeId,supportCoordinatesM:Object.freeze(coordinates),
   upliftDemandKN:upliftKN,
   horizontalActionsKN:Object.freeze({Fx:-fx/1000,Fz:-fz/1000}),
   momentDemandsKNm:Object.freeze({Mx:-mx/1000000,My:-my/1000000,Mz:-mz/1000000}),
   sourceReference:d.sourceReference.trim(),combinationDefinition:d.combinationDefinition.trim(),
   loadCaseType:"ULS",
   limitations:Object.freeze([
    "این خروجی فقط تقاضای کلی گره پایه را از واکنش حل‌گر استخراج می‌کند؛ نیروی کششی بین انکرها توزیع نشده است.",
    "برای محاسبه کشش هر انکر، آرایش و مختصات انکرها، ابعاد و سختی صفحه‌ستون، تماس فشاری صفحه و بتن، اثر اهرمی/پریینگ و سختی اتصال لازم است.",
    "ظرفیت فولاد انکر، بیرون‌کشیدگی، مخروط شکست بتن، pryout، فاصله لبه، عمق مهاری، گروه انکر و اندرکنش کشش-برش هنوز کنترل نشده‌اند؛ این خروجی کنترل ظرفیت یا تأیید اتصال نیست.",
    "گشتاورها در مرکز گره پایه گزارش می‌شوند؛ انتقال به صفحه‌ستون با خروج از مرکزیت هندسی یا توزیع بین انکرها انجام نشده است."
   ])
  });
 }
 function solveThreeByThree(A,b){
  const m=A.map((row,i)=>[...row,b[i]]);
  for(let c=0;c<3;c++){
   let pivot=c;
   for(let r=c+1;r<3;r++)if(Math.abs(m[r][c])>Math.abs(m[pivot][c]))pivot=r;
   if(Math.abs(m[pivot][c])<1e-10)throw new Error("آرایش انکرها برای تعیین توزیع دوبعدی کشش پایدار و غیرمنفرد نیست.");
   [m[c],m[pivot]]=[m[pivot],m[c]];
   const div=m[c][c];for(let j=c;j<4;j++)m[c][j]/=div;
   for(let r=0;r<3;r++)if(r!==c){const k=m[r][c];for(let j=c;j<4;j++)m[r][j]-=k*m[c][j];}
  }
  return [m[0][3],m[1][3],m[2][3]];
 }
 function distributeAnchorTension(input){
  const d=input||{};
  const U=finite(d.upliftDemandKN,"نیروی بلندکننده کل U");
  const Mx=finite(d.MxKNm,"لنگر Mx");
  const Mz=finite(d.MzKNm,"لنگر Mz");
  if(U<0)throw new Error("نیروی بلندکننده کل نباید منفی باشد؛ علامت را طبق قرارداد کنش وارد بر صفحه‌ستون بررسی کنید.");
  if(!Array.isArray(d.anchors)||d.anchors.length<3)throw new Error("حداقل سه مختصات انکر برای توزیع دوبعدی لازم است.");
  if(typeof d.geometrySourceReference!=="string"||!d.geometrySourceReference.trim())throw new Error("مرجع نقشه/هندسه آرایش انکرها الزامی است.");
  const anchors=d.anchors.map((p,i)=>({
   id:String(p?.id??"").trim(),
   x:finite(p?.xMM,"مختصات X انکر "+(i+1)),
   z:finite(p?.zMM,"مختصات Z انکر "+(i+1))
  }));
  if(anchors.some(p=>!p.id))throw new Error("شناسه هر انکر الزامی است.");
  if(new Set(anchors.map(p=>p.id)).size!==anchors.length)throw new Error("شناسه انکرها نباید تکراری باشد.");
  if(new Set(anchors.map(p=>p.x+","+p.z)).size!==anchors.length)throw new Error("مختصات انکرها نباید تکراری باشد.");
  const cx=anchors.reduce((s,p)=>s+p.x,0)/anchors.length;
  const cz=anchors.reduce((s,p)=>s+p.z,0)/anchors.length;
  const pts=anchors.map(p=>({...p,x:p.x-cx,z:p.z-cz}));
  const sx=pts.reduce((s,p)=>s+p.x,0),sz=pts.reduce((s,p)=>s+p.z,0);
  const sxx=pts.reduce((s,p)=>s+p.x*p.x,0),szz=pts.reduce((s,p)=>s+p.z*p.z,0);
  const sxz=pts.reduce((s,p)=>s+p.x*p.z,0);
  // T_i = c + a*x_i + b*z_i. Moments: Mx=sum(z_i*T_i), Mz=-sum(x_i*T_i).
  const [c,a,b]=solveThreeByThree(
   [[anchors.length,sx,sz],[sx,sxx,sxz],[sz,sxz,szz]],
   [U*1000,-Mz*1e6,Mx*1e6]
  );
  const raw=pts.map(p=>({id:p.id,xMM:p.x+cx,zMM:p.z+cz,tensionKN:(c+a*p.x+b*p.z)/1000}));
  const tolerance=1e-8;
  const compressionSide=raw.filter(p=>p.tensionKN < -tolerance);
  const results=raw.map(p=>({...p,tensionDemandKN:Math.max(0,p.tensionKN),assumedTensionOnly:p.tensionKN>=-tolerance}));
  return Object.freeze({
   success:compressionSide.length===0,
   status:compressionSide.length===0?"elastic-all-anchors-in-tension":"invalid-unilateral-contact-assumption",
   anchorCount:anchors.length,centroidMM:{x:cx,z:cz},
   upliftDemandKN:U,MxKNm:Mx,MzKNm:Mz,
   anchors:Object.freeze(results.map(Object.freeze)),
   maximumAnchorTensionKN:Math.max(0,...results.map(p=>p.tensionDemandKN)),
   compressionSideAnchorIds:Object.freeze(compressionSide.map(p=>p.id)),
   geometrySourceReference:d.geometrySourceReference.trim(),
   limitations:Object.freeze([
    "توزیع بر پایه صفحه صلب و رفتار الاستیک خطی گروه انکر با سختی محوری یکسان و فرض فعال بودن کشش همه انکرها است.",
    "اگر هر انکری وارد فشار شود، فرض کشش همه انکرها معتبر نیست؛ تماس فشاری بتن/صفحه‌ستون و حل یک‌طرفه غیرخطی هنوز مدل نشده و نتیجه باید متوقف تلقی شود.",
    "ضخامت و خمش صفحه‌ستون، پریینگ، سختی و انعطاف صفحه، جوش، ظرفیت کششی فولاد انکر، بیرون‌کشیدگی، مخروط شکست بتن، pryout، فاصله لبه، عمق مهاری، اثر گروه و اندرکنش کشش-برش کنترل نشده‌اند.",
    "این خروجی فقط تقاضای الاستیک مقدماتی را تخمین می‌زند و کنترل ظرفیت یا تأیید طراحی اتصال نیست."
   ])
  });
 }
 function checkFootingSliding(input){
  const d=input||{};
  if(typeof d.sourceReference!=="string"||!d.sourceReference.trim())throw new Error("مرجع گزارش ژئوتکنیک/طراحی برای کنترل لغزش الزامی است.");
  if(typeof d.combinationDefinition!=="string"||!d.combinationDefinition.trim())throw new Error("تعریف ترکیب بار کنترل لغزش الزامی است.");
  const requiredFinite=(v,label)=>{if(v===undefined||v===null||String(v).trim()==="")throw new Error(label+" باید صریحاً وارد شود؛ برای مقدار واقعی صفر، صفر را وارد کنید.");return finite(v,label);};
  const N=requiredFinite(d.normalCompressionKN,"نیروی قائم فشاری مؤثر");
  const Fx=requiredFinite(d.horizontalActionsKN?.Fx,"نیروی افقی Fx");
  const Fz=requiredFinite(d.horizontalActionsKN?.Fz,"نیروی افقی Fz");
  const mu=requiredFinite(d.interfaceFrictionCoefficient,"ضریب اصطکاک سطح تماس");
  const requiredFS=requiredFinite(d.requiredFactorOfSafety,"ضریب اطمینان لازم در برابر لغزش");
  const additionalResistance=d.additionalResistanceKN===undefined?0:finite(d.additionalResistanceKN,"مقاومت اضافی مستند");
  if(!(N>0)||mu<0||!(requiredFS>0)||additionalResistance<0)
   throw new RangeError("نیروی قائم باید مثبت و ضریب اصطکاک/مقاومت اضافی نامنفی و ضریب اطمینان لازم مثبت باشد.");
  const H=Math.hypot(Fx,Fz),friction=mu*N,resistance=friction+additionalResistance;
  const factorOfSafety=H<=1e-12?Infinity:resistance/H;
  const pass=factorOfSafety>=requiredFS;
  return Object.freeze({success:pass,status:pass?"pass-sliding":"fail-sliding",normalCompressionKN:N,
   horizontalActionsKN:Object.freeze({Fx,Fz}),horizontalResultantKN:H,interfaceFrictionCoefficient:mu,
   frictionResistanceKN:friction,additionalResistanceKN:additionalResistance,totalResistanceKN:resistance,
   factorOfSafety,requiredFactorOfSafety:requiredFS,sourceReference:d.sourceReference.trim(),
   combinationDefinition:d.combinationDefinition.trim(),
   limitations:Object.freeze(["این کنترل، مدل ساده اصطکاک پایه به‌علاوه مقاومت اضافی مستند است؛ مقاومت اضافی نباید بدون مستندات ژئوتکنیک/سازه‌ای منظور شود.",
   "اثر فشار جانبی غیرفعال خاک، چسبندگی، آب زیرزمینی، کاهش نیروی قائم مؤثر، اندرکنش پی و کنترل ظرفیت اجزای انتقال برش به‌صورت خودکار محاسبه نمی‌شود.",
   "ترکیب بار و ضریب اطمینان باید مطابق مبنای طراحی و آیین‌نامه پروژه تعیین و مستند شوند."])});
 }
 function checkRectangularFooting(input){
  const d=input||{},soil=validateSoil(d.soil);
  const B=finite(d.Bm,"عرض پی"),L=finite(d.Lm,"طول پی");
  if(!(B>0&&L>0))throw new RangeError("ابعاد پی باید مثبت باشند.");
  const loads=d.footingLoads||{};
  const thickness=finite(loads.thicknessM,"ضخامت پی");
  const cover=finite(loads.soilCoverAboveFootingM,"ارتفاع خاک روی پی");
  const gammaConcrete=finite(loads.concreteUnitWeightKNm3,"وزن مخصوص بتن");
  const gammaSoil=finite(loads.soilUnitWeightKNm3,"وزن مخصوص خاک");
  if(!(thickness>0)||cover<0||!(gammaConcrete>0)||!(gammaSoil>0))
   throw new RangeError("ضخامت پی و وزن مخصوص مصالح باید مثبت و ارتفاع خاک روی پی نامنفی باشد.");
  if(!Array.isArray(d.cases)||!d.cases.length)throw new Error("حداقل یک حالت بار بهره‌برداری تأییدشده لازم است.");
  const A=B*L,footingWeight=A*thickness*gammaConcrete,soilCoverWeight=A*cover*gammaSoil;
  const overburden=gammaSoil*(cover+thickness);
  const results=d.cases.map((c,index)=>{
   const name=String(c.name||"").trim();
   const normalizedName=name.toUpperCase();
   if(!/^SLS(?:[-_ ]|$)/i.test(normalizedName)&&!name.includes("بهره‌برداری"))
    throw new Error("نام حالت "+(name||"(بدون نام)")+" باید صریحاً SLS یا بهره‌برداری باشد؛ بارهای ULS یا بار منفرد پذیرفته نمی‌شوند.");
   if(typeof c.sourceReference!=="string"||!c.sourceReference.trim())
    throw new Error("مرجع گزارش تحلیل/جدول واکنش برای حالت "+name+" الزامی است.");
   if(c.serviceabilityCheck!=="foundation-bearing")
    throw new Error("نوع کنترل حالت "+name+" باید صریحاً foundation-bearing باشد.");
   if(typeof c.combinationDefinition!=="string"||!c.combinationDefinition.trim())
    throw new Error("تعریف دقیق ترکیب بار بهره‌برداری برای حالت "+name+" الزامی است.");
   const reactionN=finite(c.NkN,"نیروی قائم واکنش "+name);
   const momentValue=(value,label)=>value===undefined||value===null||value===""?0:finite(value,label);
   const Mx=momentValue(c.MxkNm,"لنگر Mx "+name),Mz=momentValue(c.MzkNm,"لنگر Mz "+name);
   if(c.columnOffsetXM===undefined||c.columnOffsetZM===undefined)
    throw new Error("فاصله محور ستون تا مرکز پی در دو راستای X و Z برای حالت "+name+" باید صریحاً وارد شود؛ مقدار صفر نیز باید آگاهانه ثبت شود.");
   const columnOffsetX=finite(c.columnOffsetXM,"خروج از مرکزیت ستون در X "+name);
   const columnOffsetZ=finite(c.columnOffsetZM,"خروج از مرکزیت ستون در Z "+name);
   const N=reactionN+footingWeight+soilCoverWeight;
   if(!(N>0))throw new Error("مجموع نیروی قائم شامل واکنش، وزن پی و خاک روی پی در "+name+" باید فشاری و مثبت باشد.");
   const MxTotal=Mx+reactionN*columnOffsetZ;
   const MzTotal=Mz-reactionN*columnOffsetX;
   const ex=MzTotal/N,ez=MxTotal/N,qAvg=N/A;
   const qMaxGross=qAvg*(1+6*Math.abs(ex)/B+6*Math.abs(ez)/L);
   const qMinGross=qAvg*(1-6*Math.abs(ex)/B-6*Math.abs(ez)/L);
   const qMaxNet=qMaxGross-overburden,qMinNet=qMinGross-overburden;
   const fullContact=qMinGross>=-1e-9;
   const qMaxChecked=soil.allowableBearingBasis==="gross"?qMaxGross:qMaxNet;
   const qMinChecked=soil.allowableBearingBasis==="gross"?qMinGross:qMinNet;
   const bearingPass=fullContact&&qMaxChecked<=soil.allowableBearingKPa+1e-9;
   return Object.freeze({name,sourceReference:c.sourceReference.trim(),serviceabilityCheck:c.serviceabilityCheck,combinationDefinition:c.combinationDefinition.trim(),reactionNkN:reactionN,NkN:N,MxkNm:Mx,MzkNm:Mz,columnOffsetXM:columnOffsetX,columnOffsetZM:columnOffsetZ,resultantMxkNm:MxTotal,resultantMzkNm:MzTotal,
    footingWeightKN:footingWeight,soilCoverWeightKN:soilCoverWeight,totalAddedWeightKN:footingWeight+soilCoverWeight,
    overburdenAtBaseKPa:overburden,areaM2:A,eccentricityX_m:ex,eccentricityZ_m:ez,
    qAverageGrossKPa:qAvg,qMaxGrossKPa:qMaxGross,qMinGrossKPa:qMinGross,
    qMaxNetKPa:qMaxNet,qMinNetKPa:qMinNet,qMaxCheckedKPa:qMaxChecked,qMinCheckedKPa:qMinChecked,
    fullContact,bearingPass,
    status:!fullContact?"blocked-no-tension-contact":qMaxChecked>soil.allowableBearingKPa?"fail-bearing-pressure":"pass-bearing-pressure"});
  });
  return Object.freeze({success:results.every(x=>x.bearingPass),
   method:"linear-elastic rectangular footing pressure; full-contact only; column-axis offsets included; footing and soil-cover weights centered",
   soil,footing:Object.freeze({B_m:B,L_m:L,areaM2:A,thicknessM:thickness,soilCoverAboveFootingM:cover,
    concreteUnitWeightKNm3:gammaConcrete,soilUnitWeightKNm3:gammaSoil,footingWeightKN:footingWeight,
    soilCoverWeightKN:soilCoverWeight,overburdenAtBaseKPa:overburden}),
   results:Object.freeze(results),
   limitations:Object.freeze([
    "وزن پی و خاک پوششی در مرکز هندسی پی منظور شده‌اند؛ خروج از مرکزیت ستون فقط از فاصله محور ستون تا مرکز پی در هر حالت بار محاسبه می‌شود.",
    "مبنای gross/net باید دقیقاً با تعریف ظرفیت مجاز در گزارش ژئوتکنیک یکسان باشد؛ برای net، سربار اولیه خاک تا زیر پی از فشار ناخالص کسر شده است.",
    "این کنترل فقط فشار تماس قائم پی مستطیلی با توزیع خطی و فرض تماس کامل را بررسی می‌کند؛ qmin ناخالص معیار تشخیص جداشدگی است.",
    "اگر qmin ناخالص منفی شود، تحلیل تماس جزئی/بلندشدگی لازم است؛ فشار کششی به خاک مجاز فرض نشده است.",
    "کنترل نشست، ظرفیت نهایی، لغزش، واژگونی، آب زیرزمینی، اثر لایه‌بندی، اندرکنش پی‌ها و طراحی آرماتور/برش پانچ در این ماژول انجام نمی‌شود.",
    "وزن شناژ، پدستال، دیوار، خاک جانبی، بارهای افقی و لنگر ناشی از اجزای خارج از مرکز در این محاسبه منظور نشده‌اند.",
    "وزن مخصوص بتن و خاک و ارتفاع پوشش باید از مشخصات واقعی پروژه/گزارش ژئوتکنیک وارد شوند؛ مقادیر پیش‌فرض ساخته نشده‌اند.",
    "بارهای ورودی باید ترکیب SLS مستند و متناسب با کنترل foundation-bearing باشند؛ صرف درج برچسب SLS یا نام‌گذاری دلخواه، اعتبار ترکیب را اثبات نمی‌کند.",
    "تیپ I/II/III جایگزین ظرفیت باربری، پارامترهای مقاومت یا کنترل نشست گزارش ژئوتکنیک نیست."
   ])});
 }
 function render(){
  if(!root.document)return;
  const panel=root.document.getElementById("foundationSoilPanel");
  if(!panel||panel.dataset.soilCheckInitialized==="true")return;
  panel.dataset.soilCheckInitialized="true";
  const $=id=>root.document.getElementById(id);
  const enabled=$("soilControlEnabled"),fields=["soilType","soilQa","soilQaBasis","soilSource","soilFootingB","soilFootingL","sizingMinB","sizingMaxB","sizingStepB","sizingMinL","sizingMaxL","sizingStepL","sizingShape","btnSearchFootingDimensions","soilFootingThickness","soilCoverAboveFooting","concreteUnitWeight","soilUnitWeight","soilReactionCases","btnRunSoilCheck","foundationSlsBatchInput","btnValidateFoundationSlsBatch","foundationUlsBatchInput","btnMapFoundationUlsActions","foundationReactionSense","selectedFoundationNodeId","foundationLocalGeometryInput","btnMapFoundationActions","footingDesignInputJson","btnValidateFootingDesignInput","slidingNormalKN","slidingFxKN","slidingFzKN","slidingMu","slidingRequiredFS","slidingAdditionalResistanceKN","slidingSource","slidingCombination","btnRunSlidingCheck"];
  const update=()=>{fields.forEach(id=>{const e=$(id);if(e)e.disabled=!enabled.checked;});};
  enabled.addEventListener("change",update);update();
  $("btnRunSoilCheck").addEventListener("click",()=>{
   const out=$("soilCheckResult");
   try{
    const cases=JSON.parse($("soilReactionCases").value||"[]");
    const result=checkRectangularFooting({soil:{soilType:$("soilType").value,allowableBearingKPa:$("soilQa").value,
     allowableBearingBasis:$("soilQaBasis").value,sourceReference:$("soilSource").value},
     Bm:$("soilFootingB").value,Lm:$("soilFootingL").value,
     footingLoads:{thicknessM:$("soilFootingThickness").value,soilCoverAboveFootingM:$("soilCoverAboveFooting").value,
      concreteUnitWeightKNm3:$("concreteUnitWeight").value,soilUnitWeightKNm3:$("soilUnitWeight").value},cases});
    const fmt=n=>Number(n).toFixed(2);
    out.textContent=[
     result.success?"کنترل فشار باربری در همه حالت‌های واردشده قبول شد.":"کنترل فشار باربری مردود یا مسدود است.",
     "تیپ خاک: "+result.soil.soilType+" | مبنای qa: "+result.soil.allowableBearingBasis+" | مرجع: "+result.soil.sourceReference+" | qa="+fmt(result.soil.allowableBearingKPa)+" kPa",
     "ابعاد پی: "+fmt(result.footing.B_m)+" × "+fmt(result.footing.L_m)+" m | وزن پی="+fmt(result.footing.footingWeightKN)+" kN | وزن خاک روی پی="+fmt(result.footing.soilCoverWeightKN)+" kN",
     ...result.results.map(x=>x.name+" | کنترل="+x.serviceabilityCheck+" | ترکیب="+x.combinationDefinition+" | مرجع="+x.sourceReference+" | N کل="+fmt(x.NkN)+" kN | آفست ستون X/Z="+fmt(x.columnOffsetXM)+"/"+fmt(x.columnOffsetZM)+" m | eX/eZ="+fmt(x.eccentricityX_m)+"/"+fmt(x.eccentricityZ_m)+" m | qmax/qmin ناخالص="+fmt(x.qMaxGrossKPa)+"/"+fmt(x.qMinGrossKPa)+" | qmax خالص="+fmt(x.qMaxNetKPa)+" kPa | "+x.status),
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x)
    ].join("\n");
    out.style.color=result.success?"#15803d":"#b45309";lastResult=result;
   }catch(error){out.textContent="کنترل خاک انجام نشد: "+error.message;out.style.color="#b45309";lastResult=null;}
  });
  const slidingButton=$("btnRunSlidingCheck");
  if(slidingButton)slidingButton.addEventListener("click",()=>{
   const out=$("slidingCheckResult");
   try{
    const result=checkFootingSliding({
     normalCompressionKN:$("slidingNormalKN").value,
     horizontalActionsKN:{Fx:$("slidingFxKN").value,Fz:$("slidingFzKN").value},
     interfaceFrictionCoefficient:$("slidingMu").value,
     requiredFactorOfSafety:$("slidingRequiredFS").value,
     additionalResistanceKN:$("slidingAdditionalResistanceKN").value===""?0:$("slidingAdditionalResistanceKN").value,
     sourceReference:$("slidingSource").value,
     combinationDefinition:$("slidingCombination").value
    });
    const f=n=>Number.isFinite(n)?Number(n).toFixed(3):"بی‌نهایت";
    out.textContent=[
     result.success?"نتیجه: کنترل لغزش قبول است.":"نتیجه: کنترل لغزش مردود است.",
     "برآیند نیروی افقی H = "+f(result.horizontalResultantKN)+" kN",
     "مقاومت اصطکاکی μN = "+f(result.frictionResistanceKN)+" kN",
     "مقاومت اضافی مستند = "+f(result.additionalResistanceKN)+" kN",
     "مجموع مقاومت = "+f(result.totalResistanceKN)+" kN",
     "ضریب اطمینان محاسبه‌شده = "+f(result.factorOfSafety)+" | ضریب اطمینان لازم = "+f(result.requiredFactorOfSafety),
     "مرجع: "+result.sourceReference,
     "ترکیب بار: "+result.combinationDefinition,
     "محدودیت‌ها:",...result.limitations.map(x=>"• "+x)
    ].join("\n");
    out.style.color=result.success?"#15803d":"#b45309";lastResult=result;
   }catch(error){out.textContent="کنترل لغزش انجام نشد: "+error.message;out.style.color="#b45309";lastResult=null;}
  });
 }
 const api=Object.freeze({validateSoil,checkRectangularFooting,checkFootingSliding,mapSupportReactionToSlsCase,mapSupportReactionToAnchorDemand,distributeAnchorTension,render,get lastResult(){return lastResult;}});
 root.SahroudFoundationSoilCheck=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",render);else render();}
})(typeof window!=="undefined"?window:globalThis);
