(function(root){
 "use strict";
 const finite=(v,label)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(label+" باید عدد محدود باشد.");return n;};
 function values(min,max,step,label){
  min=finite(min,label+" حداقل");max=finite(max,label+" حداکثر");step=finite(step,label+" گام");
  if(!(min>0&&max>=min&&step>0))throw new RangeError("حدود و گام "+label+" معتبر نیستند.");
  const count=Math.floor((max-min)/step+1e-9)+1;
  return {min,max,step,count,at:i=>Number((min+i*step).toFixed(10))};
 }
 function searchFootingDimensions(input){
  const d=input||{},s=d.search||{},maxCandidates=Number(s.maxCandidates===undefined?2500:s.maxCandidates);
  if(!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>10000)
   throw new RangeError("حداکثر تعداد حالات جستجو باید عدد صحیح بین ۱ و ۱۰۰۰۰ باشد.");
  const b=values(s.minB,s.maxB,s.stepB,"عرض B"),l=values(s.minL,s.maxL,s.stepL,"طول L");
  const shape=s.shape||"rectangular";
  if(!["rectangular","square"].includes(shape))throw new Error("نوع پلان باید square یا rectangular باشد.");
  const pairs=[];
  for(let i=0;i<b.count;i++)for(let j=0;j<l.count;j++){
   const B=b.at(i),L=l.at(j);
   if(shape==="square"&&Math.abs(B-L)>1e-9)continue;
   pairs.push({B,L,area:B*L});
   if(pairs.length>maxCandidates)throw new RangeError("تعداد حالات ممکن از سقف "+maxCandidates+" بیشتر است؛ محدوده یا گام را اصلاح کنید.");
  }
  if(!pairs.length)throw new Error("در محدوده و گام تعیین‌شده هیچ جفت‌ابعاد مجازی برای این نوع پلان وجود ندارد.");
  const ranked=pairs.sort((a,c)=>a.area-c.area||
   Math.abs(a.B-a.L)-Math.abs(c.B-c.L)||a.B-c.B||a.L-c.L);
  const candidates=ranked.map(p=>{
   try{
    const result=root.SahroudFoundationSoilCheck.checkRectangularFooting({...d,Bm:p.B,Lm:p.L});
    const failed=result.results.filter(x=>!x.bearingPass);
    return Object.freeze({B_m:p.B,L_m:p.L,areaM2:p.area,success:result.success,
     status:result.success?"pass":"rejected",
     failedCases:failed.map(x=>({name:x.name,status:x.status,qMaxCheckedKPa:x.qMaxCheckedKPa,
      qMinGrossKPa:x.qMinGrossKPa,allowableBearingKPa:result.soil.allowableBearingKPa})),
     cases:result.results.map(x=>({name:x.name,status:x.status,qMaxGrossKPa:x.qMaxGrossKPa,
      qMinGrossKPa:x.qMinGrossKPa,qMaxNetKPa:x.qMaxNetKPa,qMinNetKPa:x.qMinNetKPa,
      qMaxCheckedKPa:x.qMaxCheckedKPa,qMinCheckedKPa:x.qMinCheckedKPa,
      fullContact:x.fullContact,bearingPass:x.bearingPass}))
    });
   }catch(error){return Object.freeze({B_m:p.B,L_m:p.L,areaM2:p.area,success:false,status:"invalid-input",error:error.message,failedCases:[]});}
  });
  const accepted=candidates.filter(x=>x.success);
  return Object.freeze({schema:"SAHROUD-PRELIMINARY-FOOTING-SIZING-1.0",success:accepted.length>0,
   classification:"preliminary-bearing-pressure-sizing-only",
   method:"Exhaustive bounded grid search; each candidate checked independently against every supplied SLS case; minimum plan area selected, then closest-to-square tie-break.",
   search:Object.freeze({shape,minB_m:b.min,maxB_m:b.max,stepB_m:b.step,minL_m:l.min,maxL_m:l.max,
    stepL_m:l.step,maxCandidates,candidatesEvaluated:candidates.length}),
   selected:accepted.length?accepted[0]:null,
   counts:Object.freeze({evaluated:candidates.length,accepted:accepted.length,rejected:candidates.length-accepted.length}),
   candidates:Object.freeze(candidates),
   limitations:Object.freeze([
    "این خروجی فقط ابعاد مقدماتی بر اساس فشار تماس قائم خطی و شرط تماس کامل است و نقشه یا طراحی نهایی پی محسوب نمی‌شود.",
    "تمام ترکیبات SLS جداگانه بررسی شده‌اند؛ هیچ envelope مؤلفه‌ای جایگزین بردارهای همزمان نیرو و لنگر نشده است.",
    "در این جستجو نشست، ظرفیت نهایی، لغزش، واژگونی، آب زیرزمینی، اثر لایه‌بندی، اندرکنش پی‌ها، وزن شناژ/پدستال/دیوار و بارهای خارج از مرکز منظور نشده‌اند.",
    "کنترل‌های بتن‌آرمه شامل خمش، برش یک‌طرفه، پانچ، مهار و طول گیرایی آرماتور انجام نشده‌اند.",
    "ابعاد منتخب باید با بارگذاری کامل، مدل خاک، گزارش ژئوتکنیک و کنترل‌های آیین‌نامه‌ای بعدی بازبینی شوند؛ تیپ خاک به‌تنهایی ظرفیت مجاز را تعیین نمی‌کند.",
    "وزن مخصوص بتن و خاک، ضخامت، پوشش خاک و ظرفیت مجاز فقط از ورودی‌های صریح پروژه/گزارش استفاده می‌شوند و مقدار پیش‌فرض مهندسی ساخته نشده است."
   ])});
 }
 const api=Object.freeze({searchFootingDimensions});
 root.SahroudFoundationSizing=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
