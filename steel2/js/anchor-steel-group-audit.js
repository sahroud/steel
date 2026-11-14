/* SAHROUD STEEL — per-anchor steel-only capacity comparison. */
(function(root){"use strict";
function compare(demandResults,input){
 const d=input||{},cases=Array.isArray(demandResults)?demandResults:[demandResults];
 if(!cases.length||cases.some(x=>x?.ok!==true||!Array.isArray(x.anchors)||!x.anchors.length))throw Error("خروجی معتبر و کامل توزیع تقاضای انکر برای هر حالت بار لازم است.");
 const required=["Ase_mm2","Fnt_MPa","Fnv_MPa","phiT","phiV"],missing=required.filter(k=>!Number.isFinite(Number(d[k])));
 if(missing.length)throw Error("پارامترهای عددی صریح لازم است: "+missing.join("، "));
 if(!(d.Ase_mm2>0&&d.Fnt_MPa>0&&d.Fnv_MPa>0&&d.phiT>0&&d.phiT<=1&&d.phiV>0&&d.phiV<=1))throw Error("Ase، Fnt، Fnv و ضرایب φ باید مثبت و در محدوده معتبر باشند.");
 const rows=[];
 cases.forEach(c=>c.anchors.forEach(a=>{
  const T=Number(a.tensionDemand_N),V=Number(a.resultantShear_N);
  if(!Number.isFinite(T)||T<0||!Number.isFinite(V)||V<0)throw Error("تقاضای کشش/برش انکر "+String(a.anchorId)+" نامعتبر است.");
  const tCap=Number(d.phiT)*Number(d.Fnt_MPa)*Number(d.Ase_mm2)/1000,vCap=Number(d.phiV)*Number(d.Fnv_MPa)*Number(d.Ase_mm2)/1000;
  rows.push({nodeId:String(c.nodeId??""),caseId:String(c.caseId??""),anchorId:String(a.anchorId??""),tensionDemand_kN:T/1000,shearDemand_kN:V/1000,tensionDesignCapacity_kN:tCap,shearDesignCapacity_kN:vCap,tensionRatio:T/1000/tCap,shearRatio:V/1000/vCap,tensionPass:T/1000<=tCap,shearPass:V/1000<=vCap});
 }));
 return{ok:true,rows,caseCount:cases.length,anchorDemandCount:rows.length,allSeparateChecksPass:rows.every(r=>r.tensionPass&&r.shearPass),governingTensionRatio:Math.max(...rows.map(r=>r.tensionRatio)),governingShearRatio:Math.max(...rows.map(r=>r.shearRatio)),method:"independent per-anchor steel tension and resultant-shear comparison using user-verified Fnt/Fnv/Ase/phi",limitations:["این مقایسه فقط مقاومت فولادی کشش و برش هر انکر را جداگانه غربال می‌کند.","هیچ رابطه اندرکنش کشش-برش اعمال نشده است؛ نسبت‌ها جدا هستند و قبولی جداگانه به معنی قبولی اندرکنش نیست.","شکست بتن، pullout، pry-out، side-face blowout، اثر گروه، فاصله لبه، خمش بولت، رزوه در صفحه برش، خمش صفحه‌ستون، prying، جوش و فونداسیون کنترل نشده‌اند.","پارامترهای Fnt/Fnv/φ/Ase باید برای نوع واقعی انکر، رزوه، مصالح و آیین‌نامه حاکم توسط مهندس تأیید شوند."],analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const input={Ase_mm2:100,Fnt_MPa:400,Fnv_MPa:240,phiT:.75,phiV:.75},demand={ok:true,nodeId:"B1",caseId:"ULS-1",anchors:[{anchorId:"A1",tensionDemand_N:10000,resultantShear_N:5000},{anchorId:"A2",tensionDemand_N:20000,resultantShear_N:10000}]};
 t("calculates tension design capacity",()=>compare(demand,input).rows[0].tensionDesignCapacity_kN===30);
 t("calculates shear design capacity",()=>compare(demand,input).rows[0].shearDesignCapacity_kN===18);
 t("preserves per-anchor demand and case identity",()=>{const r=compare(demand,input);return r.rows[1].anchorId==="A2"&&r.rows[1].caseId==="ULS-1"&&r.rows[1].tensionDemand_kN===20;});
 t("preserves separate cases without envelope mixing",()=>{const r=compare([demand,{...demand,caseId:"ULS-2",anchors:[{...demand.anchors[0],tensionDemand_N:30000}]}],input);return r.caseCount===2&&r.rows[2].caseId==="ULS-2"&&r.rows[2].tensionDemand_kN===30;});
 t("reports separate tension and shear ratios",()=>{const r=compare(demand,input);return Math.abs(r.rows[0].tensionRatio-1/3)<1e-12&&Math.abs(r.rows[0].shearRatio-5/18)<1e-12;});
 t("rejects missing code parameters",()=>{try{compare(demand,{...input,Fnt_MPa:null});return false;}catch(e){return true;}});
 t("rejects invalid anchor demand",()=>{try{compare({...demand,anchors:[{anchorId:"A1",tensionDemand_N:NaN,resultantShear_N:1}]},input);return false;}catch(e){return true;}});
 t("never claims interaction or design approval",()=>{const r=compare(demand,input);return r.analysisEnabled===false&&r.designApproved===false&&r.limitations.some(x=>x.includes("اندرکنش"));});
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelAnchorSteelGroupAudit={compare,selfTest};
})(typeof window!=="undefined"?window:globalThis);
