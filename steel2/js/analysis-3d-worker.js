/* SAHROUD STEEL - background worker for 3D frame analysis */
"use strict";
importScripts("./analysis-3d.js");
self.onmessage=function(event){
  const data=event.data||{};
  try{
    if(!self.SteelFrame3D||typeof self.SteelFrame3D.analyze!=="function")
      throw new Error("هسته حل‌گر سه‌بعدی در پردازشگر بارگذاری نشد.");
    const sections=data.sectionsByMemberId||{};
    const result=self.SteelFrame3D.analyze(data.model,{
      sectionResolver:function(member){
        const section=sections[String(member.id)];
        if(!section)throw new Error("خواص مقطع عضو "+member.id+" به پردازشگر نرسیده است.");
        return section;
      },
      supports:data.supports||[],
      releasePurlinRafterRotation:data.releasePurlinRafterRotation===true,
      nodalLoads:Array.isArray(data.nodalLoads)?data.nodalLoads:[]
    });
    self.postMessage({ok:true,result});
  }catch(error){
    self.postMessage({ok:false,error:{message:error&&error.message?error.message:String(error)}});
  }
};
