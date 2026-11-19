/* SAHROUD STEEL — engineer-approved lateral action distribution.
 * This module distributes a supplied, documented base shear; it does not calculate
 * seismic parameters, response factors, torsion, drift, or code load combinations.
 */
(function(root){
  "use strict";
  function distributeApprovedBaseShear(input){
    const d=input||{},V=Number(d.baseShearKN),axis=Number(d.axisIndex);
    if(d.sourceVerified!==true||typeof d.sourceReference!=="string"||!d.sourceReference.trim())
      throw new Error("منبع مستند و تأییدشده نیروی برش پایه الزامی است.");
    if(!Number.isFinite(V)||V<=0)throw new RangeError("برش پایه باید مثبت و بر حسب kN باشد.");
    if(![0,2].includes(axis))throw new RangeError("نیروی جانبی زلزله باید در محور افقی X یا Z توزیع شود.");
    if(!Array.isArray(d.points)||!d.points.length)throw new Error("نقاط توزیع نیروی جانبی تعریف نشده‌اند.");
    const seen=new Set(),points=d.points.map(p=>{
      if(!p||typeof p.nodeId!=="string"||!p.nodeId.trim()||seen.has(p.nodeId))
        throw new Error("شناسه گره بار جانبی خالی یا تکراری است.");
      seen.add(p.nodeId);
      const weight=Number(p.weight);
      if(!Number.isFinite(weight)||weight<=0)throw new RangeError("وزن توزیع هر گره باید مثبت و محدود باشد.");
      return {nodeId:p.nodeId,weight};
    });
    const total=points.reduce((s,p)=>s+p.weight,0);
    const nodalLoads=points.map(p=>{
      const values=[0,0,0,0,0,0];
      values[axis]=V*1000*p.weight/total;
      return {nodeId:p.nodeId,values};
    });
    const sum=nodalLoads.reduce((s,p)=>s+p.values[axis],0);
    if(Math.abs(sum-V*1000)>Math.max(1e-6,V*1e-9))
      throw new Error("کنترل جمع نیروهای جانبی توزیع‌شده ناموفق است.");
    return Object.freeze({success:true,type:"seismic",sourceVerified:true,
      method:"user-approved-base-shear-weighted-distribution",
      baseShearKN:V,axisIndex:axis,sourceReference:d.sourceReference,factors:d.factors||{dead:1,live:0,snow:0},
      nodalLoads:Object.freeze(nodalLoads.map(x=>Object.freeze({nodeId:x.nodeId,values:Object.freeze(x.values)}))),
      resultantKN:sum/1000,codeDesignApproved:false,
      limitations:["پارامترهای لرزه‌ای محل و خاک محاسبه نمی‌شوند","ضریب رفتار، نامنظمی، پیچش و اثرات طیفی محاسبه نمی‌شوند","ضرایب توزیع باید از محاسبه مستند مهندس محاسب تأمین شوند","کنترل دریفت، P-Delta، اتصالات و فونداسیون خارج از این ماژول است"]});
  }
  root.SahroudSeismicLoadPath=Object.freeze({distributeApprovedBaseShear});
  if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudSeismicLoadPath;
})(typeof globalThis!=="undefined"?globalThis:this);
