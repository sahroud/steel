/* SAHROUD STEEL — reference import evidence validator.
 * Validates provenance shape only; never interprets values or unlocks engineering.
 */
(function(root){"use strict";
function audit(record){
 const issues=[],warnings=[];
 if(!record||typeof record!=="object"||Array.isArray(record))return {valid:false,issues:["record must be an object"],warnings,solverEligible:false,designApproved:false};
 const s=record.source||{},l=s.locator||{},f=s.format;
 const has=(k)=>typeof l[k]==="string"&&l[k].trim().length>0;
 const positive=(k)=>Number.isInteger(l[k])&&l[k]>0;
 if(!s.sourceId||!s.path)issues.push("sourceId and source path are required");
 if(!f)issues.push("source format is required");
 if(f==="SPS"&&!(positive("line")&&has("section")&&has("key")))issues.push("SPS locator requires line, section and key");
 if(f==="XLSX"&&!(has("sheet")&&has("cell")))issues.push("XLSX locator requires sheet and cell address");
 if((f==="DOC"||f==="PDF")&&!positive("page"))issues.push("DOC/PDF locator requires a positive page number");
 if(["M3","IFC","SDNF","CIS2"].includes(f)&&!has("objectId"))issues.push(f+" locator requires a native object/member/node identifier");
 if(f==="CSV"&&!positive("line")&&!has("objectId"))issues.push("CSV locator requires a line number or stable objectId");
 if(f==="OTHER"&&!has("note"))issues.push("OTHER locator requires a descriptive note");
 if(s.sourceChecksum!==undefined&&!/^sha256:[a-f0-9]{64}$/i.test(s.sourceChecksum))issues.push("sourceChecksum must use sha256:<64 hex characters>");
 if(!s.sourceChecksum)warnings.push("source checksum absent; source immutability is not independently established");
 if(!record.raw||typeof record.raw!=="object"||!("key" in record.raw)||!("value" in record.raw))issues.push("raw key and raw value are required");
 if(!record.gate||record.gate.solverEligible!==false||record.gate.designApproved!==false)issues.push("import record must remain fail-closed");
 if(record.interpretation&&record.interpretation.semanticStatus==="reviewed")warnings.push("reviewed mapping is still not an engineering approval");
 return {valid:issues.length===0,issues,warnings,solverEligible:false,designApproved:false};
}
function selfTest(){
 const base={source:{sourceId:"src-1",path:"/legacy/a.sps",format:"SPS",locator:{line:4,section:"FRAME",key:"hfeach100"},sourceChecksum:"sha256:"+"a".repeat(64)},raw:{key:"hfeach100",value:"50"},interpretation:{semanticStatus:"unmapped"},gate:{solverEligible:false,designApproved:false}};
 const cases=[
 ["SPS exact locator accepted",audit(base).valid],
 ["missing SPS line rejected",!audit({...base,source:{...base.source,locator:{section:"FRAME",key:"hfeach100"}}}).valid],
 ["XLSX sheet and cell accepted",audit({...base,source:{...base.source,format:"XLSX",locator:{sheet:"Loads",cell:"B12"}}}).valid],
 ["native object identifier accepted",audit({...base,source:{...base.source,format:"IFC",locator:{objectId:"IfcBeam-17"}}}).valid],
 ["negative coordinate remains permitted",audit({...base,interpretation:{coordinate:-12.5}}).valid],
 ["invalid checksum rejected",!audit({...base,source:{...base.source,sourceChecksum:"sha256:xyz"}}).valid],
 ["reviewed mapping does not unlock solver",audit({...base,interpretation:{semanticStatus:"reviewed"}}).solverEligible===false&&audit({...base,interpretation:{semanticStatus:"reviewed"}}).designApproved===false],
 ["solver unlock attempt rejected",!audit({...base,gate:{solverEligible:true,designApproved:false}}).valid]
 ];
 return {passed:cases.filter(x=>x[1]).length,total:cases.length,failed:cases.filter(x=>!x[1]).map(x=>x[0]),tests:cases.map(x=>({name:x[0],pass:x[1]}))};
}
root.SteelReferenceImportEvidenceValidator=Object.freeze({audit,selfTest});
})(typeof window!=="undefined"?window:globalThis);
