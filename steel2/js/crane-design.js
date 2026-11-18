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
  const api=Object.freeze({CAPACITIES_TONNES,ARCHITECTURE,createConfiguration,assessReadiness});
  root.SahroudCraneDesign=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
