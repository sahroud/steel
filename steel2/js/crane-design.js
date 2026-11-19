(function(root){
  "use strict";
  const CAPACITIES_TONNES = Object.freeze([5,10,20]);
  const ARCHITECTURE = "top_running_double_girder_eot";
  function createConfiguration(input){
    const data=input||{};
    const capacity=Number(data.capacityTonnes);
    if(!CAPACITIES_TONNES.includes(capacity)) throw new RangeError("ظرفیت جرثقیل باید یکی از ۵، ۱۰ یا ۲۰ تن باشد.");
    return Object.freeze({
      schemaVersion:"1.0.0",
      enabled:data.enabled===true,
      architecture:ARCHITECTURE,
      capacity:{value:capacity,unit:"t"},
      geometry:Object.freeze({
        craneSpanM:positiveOrNull(data.craneSpanM),
        runwayLengthM:positiveOrNull(data.runwayLengthM),
        hookLiftM:positiveOrNull(data.hookLiftM)
      }),
      duty:Object.freeze({
        classification:nonEmptyOrNull(data.dutyClass),
        cyclesPerHour:positiveOrNull(data.cyclesPerHour),
        operatingHoursPerDay:positiveOrNull(data.operatingHoursPerDay)
      }),
      provenance:Object.freeze({
        mode:data.provenanceMode||"missing",
        verified:data.verified===true,
        manufacturer:data.manufacturer||null,
        model:data.model||null,
        sourceReference:data.sourceReference||null
      })
    });
  }
  function positiveOrNull(value){
    if(value===null||value===undefined||value==="") return null;
    const n=Number(value);
    if(!Number.isFinite(n)||n<=0) throw new RangeError("ابعاد و مقادیر کاری واردشده باید عدد مثبت و محدود باشند.");
    return n;
  }
  function nonEmptyOrNull(value){
    return typeof value==="string"&&value.trim()?value.trim():null;
  }
  function assessReadiness(config){
    if(!config||!CAPACITIES_TONNES.includes(config.capacity&&config.capacity.value)) return Object.freeze({ready:false,missing:["ظرفیت نامعتبر"]});
    const missing=[];
    ["craneSpanM","runwayLengthM","hookLiftM"].forEach(key=>{if(!(config.geometry&&config.geometry[key]>0))missing.push(key);});
    if(!(config.duty&&config.duty.classification)) missing.push("duty.classification");
    if(!(config.duty&&config.duty.cyclesPerHour>0)) missing.push("duty.cyclesPerHour");
    if(!(config.provenance&&config.provenance.verified===true&&config.provenance.sourceReference)) missing.push("verified manufacturer/design source");
    return Object.freeze({ready:missing.length===0,missing:Object.freeze(missing)});
  }
  function createVerifiedWheelLoadCase(input){
    const d=input||{},config=d.configuration,readiness=assessReadiness(config);
    if(!config||config.enabled!==true)throw new Error("برای انتقال بار چرخ، گزینه جرثقیل باید در پروژه فعال باشد.");
    if(!readiness.ready)throw new Error("اطلاعات هندسی/کاری/سازنده جرثقیل کامل نیست: "+readiness.missing.join("، "));
    if(d.sourceVerified!==true||typeof d.sourceReference!=="string"||!d.sourceReference.trim())
      throw new Error("منبع معتبر سازنده برای واکنش چرخ‌ها الزامی است.");
    if(!Array.isArray(d.wheelReactions)||!d.wheelReactions.length)
      throw new Error("واکنش‌های واقعی چرخ جرثقیل وارد نشده‌اند.");
    const seen=new Set(),nodalLoads=d.wheelReactions.map((w,i)=>{
      if(!w||typeof w.nodeId!=="string"||!w.nodeId.trim())throw new Error("گره واکنش چرخ "+(i+1)+" مشخص نیست.");
      if(seen.has(w.nodeId))throw new Error("برای هر گره واکنش چرخ فقط یک رکورد تجمیع‌شده وارد کنید.");
      seen.add(w.nodeId);
      const vertical=Number(w.verticalKN),longitudinal=Number(w.longitudinalKN||0),transverse=Number(w.transverseKN||0);
      if(!Number.isFinite(vertical)||vertical<0||!Number.isFinite(longitudinal)||!Number.isFinite(transverse))
        throw new Error("مؤلفه‌های واکنش چرخ باید محدود باشند و نیروی قائم نامنفی باشد.");
      return {nodeId:w.nodeId,values:[longitudinal*1000,-vertical*1000,transverse*1000,0,0,0]};
    });
    return Object.freeze({success:true,type:"crane",sourceVerified:true,
      label:"واکنش چرخ جرثقیل از سند سازنده",sourceReference:d.sourceReference,
      factors:d.factors||{dead:0,live:0,snow:0},nodalLoads:Object.freeze(nodalLoads.map(x=>Object.freeze({nodeId:x.nodeId,values:Object.freeze(x.values)}))),
      note:"واکنش‌ها از منبع سازنده/محاسبه تأییدشده دریافت شده‌اند؛ این تابع آن‌ها را محاسبه نمی‌کند. تا مدل‌سازی ریل، تیر حمال، کنسول، مهاربندی و اتصالات، مسیر جرثقیل کامل نیست."});
  }
  const api=Object.freeze({CAPACITIES_TONNES,ARCHITECTURE,createConfiguration,assessReadiness,createVerifiedWheelLoadCase});
  root.SahroudCraneDesign=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
