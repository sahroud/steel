/* SAHROUD STEEL - Built-up I-section geometry calculator
 * Dimensions are entered in mm. This calculates gross geometric properties only.
 * It does not verify plate slenderness, welds, local buckling, resistance or code compliance.
 */
(function(root){
  "use strict";
  function calculateBuiltUpISection(input){
    if(!input || typeof input!=="object") throw new Error("ورودی هندسه تیرورق معتبر نیست.");
    const names=["topFlangeWidthMm","topFlangeThicknessMm","bottomFlangeWidthMm","bottomFlangeThicknessMm","webClearHeightMm","webThicknessMm"];
    const v={};
    for(const key of names){
      const n=Number(input[key]);
      if(!Number.isFinite(n)||n<=0) throw new Error("بعد "+key+" باید عددی مثبت و محدود بر حسب میلی‌متر باشد.");
      v[key]=n;
    }
    const {topFlangeWidthMm:bt,topFlangeThicknessMm:tt,bottomFlangeWidthMm:bb,bottomFlangeThicknessMm:tb,webClearHeightMm:hw,webThicknessMm:tw}=v;
    if(tw>=Math.min(bt,bb)) throw new Error("ضخامت جان باید از عرض هر دو بال کمتر باشد.");
    if(tw>=hw) throw new Error("ضخامت جان باید از ارتفاع خالص جان کمتر باشد.");
    const depth=tb+hw+tt;
    const parts=[
      {A:bb*tb,y:tb/2,width:bb,height:tb},
      {A:tw*hw,y:tb+hw/2,width:tw,height:hw},
      {A:bt*tt,y:tb+hw+tt/2,width:bt,height:tt}
    ];
    const area=parts.reduce((s,p)=>s+p.A,0);
    const cy=parts.reduce((s,p)=>s+p.A*p.y,0)/area;
    // Strong-axis inertia: horizontal centroidal axis, parallel-axis theorem.
    const Ix=parts.reduce((s,p)=>s+p.width*p.height**3/12+p.A*(p.y-cy)**2,0);
    // Weak-axis inertia: vertical centroidal axis; centered flanges and web.
    const Iy=(bb**3*tb+tw**3*hw+bt**3*tt)/12;
    const top=depth-cy,bottom=cy;
    const STop=Ix/top, SBottom=Ix/bottom;
    const Sy=Iy/Math.max(bt,bb)/2;
    // Thin-walled open-section Saint-Venant approximation; warping restraint ignored.
    const J=(bb*tb**3+hw*tw**3+bt*tt**3)/3;
    const mm2ToCm2=x=>x/100, mm3ToCm3=x=>x/1000, mm4ToCm4=x=>x/10000;
    return {
      profile:String(input.profile||"تیرورق I ساخته‌شده"),
      dimensionsMm:{...v,totalDepthMm:depth},
      units:{input:"mm",area:"cm2",inertia:"cm4",sectionModulus:"cm3"},
      areaCm2:mm2ToCm2(area),
      centroidYFromBottomMm:cy,
      centroidYFromBottomCm:cy/10,
      strongAxis:{label:"horizontal-centroidal",inertiaCm4:mm4ToCm4(Ix),sectionModulusTopCm3:mm3ToCm3(STop),sectionModulusBottomCm3:mm3ToCm3(SBottom)},
      weakAxis:{label:"vertical-centroidal",inertiaCm4:mm4ToCm4(Iy),sectionModulusCm3:mm3ToCm3(Sy)},
      torsion:{JApproxCm4:mm4ToCm4(J),method:"thin-walled-open-section-sum-bt3-over-3",warpingIncluded:false},
      geometryMethod:"three-non-overlapping-rectangles-parallel-axis-theorem",
      assumptions:["بال بالا و پایین نسبت به محور جان مرکزی و هم‌راستا فرض شده‌اند.","ارتفاع ورودی جان، ارتفاع خالص بین دو بال است؛ هم‌پوشانی جان و بال در مساحت شمرده نمی‌شود."],
      weldsIncludedInGrossArea:false,
      designStatus:"geometry-only-not-code-verified",
      warnings:[
        "محاسبه فقط خواص هندسی مقطع ناخالص سه مستطیلِ بدون هم‌پوشانی است؛ بال‌ها باید نسبت به جان مرکزی و هم‌راستا باشند.",
        "ثابت پیچشی J تقریبیِ مقطع نازک‌جداره باز است؛ اثر تابیدگی، قیود انتهایی، جوش و اعوجاج لحاظ نشده است.",
        "کنترل لاغری موضعی جان و بال، کمانش، مقاومت، جوش‌ها، خستگی و انطباق آیین‌نامه‌ای انجام نشده است.",
        "پیش از استفاده تحلیلی، محور قوی/ضعیف این خروجی باید با دستگاه محلی عضو در مدل تطبیق داده شود."
      ]
    };
  }
  const api={calculateBuiltUpISection};
  root.SahroudBuiltUpSection=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
