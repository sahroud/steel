/* SAHROUD STEEL — unified per-member section property registry.
 * SI properties are the single source of truth shared by analysis, reporting and takeoff.
 * This registry derives geometric summaries only; it does not perform code resistance checks.
 */
(function(root){
 "use strict";
 const clone=v=>JSON.parse(JSON.stringify(v));
 const positive=(v,label)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0)throw new Error(label+" باید مثبت و محدود باشد.");return n;};
 function fingerprint(section){
  const keys=["profile","A","Iy","Iz","J","E","G","SxTop","SxBottom","Sy","massPerMeterKg","geometryType","sectionRollDeg","sectionOrientationConfirmed","sectionReferenceAxis"];
  const raw=keys.map(k=>{
   const value=section[k];
   return k+":"+(typeof value==="number"?value.toPrecision(12):String(value??""));
  }).join("|")+"|geometry:"+JSON.stringify(section.geometryDimensionsMm||{})+
   "|geometricProperties:"+JSON.stringify(section.geometricProperties||{});
  let h=2166136261;
  for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,"0");
 }
 function normalize(section,memberId){
  if(!section||typeof section!=="object")throw new Error("مقطع عضو "+memberId+" موجود نیست.");
  const A=positive(section.A,"A"),Iy=positive(section.Iy,"Iy"),Iz=positive(section.Iz,"Iz"),J=positive(section.J,"J");
  const E=positive(section.E,"E"),G=positive(section.G,"G");
  if(section.sectionRollDeg!==undefined&&section.sectionRollDeg!==null&&!Number.isFinite(Number(section.sectionRollDeg)))throw new Error("زاویه چرخش مقطع عضو "+memberId+" باید متناهی باشد.");
  if(section.sectionOrientationConfirmed===true&&(section.sectionRollDeg===undefined||section.sectionRollDeg===null))throw new Error("تأیید جهت نصب عضو "+memberId+" بدون زاویه صریح مجاز نیست.");
  let sectionReferenceAxis=null;
  if(section.sectionReferenceAxis!==undefined&&section.sectionReferenceAxis!==null){
   if(!Array.isArray(section.sectionReferenceAxis)||section.sectionReferenceAxis.length!==3||section.sectionReferenceAxis.some(v=>!Number.isFinite(Number(v))))throw new Error("محور مرجع عضو "+memberId+" باید سه مؤلفه عددی متناهی داشته باشد.");
   const axis=section.sectionReferenceAxis.map(Number),length=Math.hypot(...axis);
   if(!(length>1e-10))throw new Error("محور مرجع عضو "+memberId+" نباید بردار صفر باشد.");
   sectionReferenceAxis=axis.map(v=>v/length);
  }
  const rho=Number.isFinite(Number(section.densityKgM3))&&Number(section.densityKgM3)>0?Number(section.densityKgM3):7850;
  const normalized={...clone(section),A,Iy,Iz,J,E,G};
  if(sectionReferenceAxis)normalized.sectionReferenceAxis=sectionReferenceAxis;
  normalized.massPerMeterKg=A*rho;
  normalized.radiusY=Math.sqrt(Iy/A);
  normalized.radiusZ=Math.sqrt(Iz/A);
  normalized.sectionPropertyFingerprint=fingerprint(normalized);
  normalized.propertyUnits={A:"m2",inertia:"m4",torsion:"m4",sectionModulus:"m3",massPerMeter:"kg/m",radius:"m",E:"Pa",G:"Pa"};
  return normalized;
 }
 function auditGeometry(model){
  const errors=[],nodes=model&&Array.isArray(model.nodes)?model.nodes:[],members=model&&Array.isArray(model.members)?model.members:[];
  const units=model&&model.units||{};
  if(units.length!=="m"||units.coordinates!=="m"||units.memberLength!=="m")
   errors.push("واحد مختصات و طول اعضا باید صریحاً متر (m) ثبت شده باشد.");
  if(!nodes.length)errors.push("گره‌های هندسی مدل موجود نیستند.");
  if(!members.length)errors.push("اعضای هندسی مدل موجود نیستند.");
  const nodeMap=new Map();
  for(const node of nodes){
   const id=String(node&&node.id||"");
   if(!id||nodeMap.has(id)){errors.push("شناسه گره خالی یا تکراری است: "+id);continue;}
   const xyz=[node.x,node.y,node.z].map(Number);
   if(xyz.some(v=>!Number.isFinite(v))){errors.push("مختصات گره "+id+" نامعتبر است.");continue;}
   nodeMap.set(id,{x:xyz[0],y:xyz[1],z:xyz[2]});
  }
  const seen=new Set(),items=[];
  let maxAbsErrorM=0,totalLengthM=0;
  for(const member of members){
   const id=String(member&&member.id||"");
   if(!id||seen.has(id)){errors.push("شناسه عضو خالی یا تکراری است: "+id);continue;}
   seen.add(id);
   const a=nodeMap.get(String(member.start??"")),b=nodeMap.get(String(member.end??""));
   if(!a||!b){errors.push("گره ابتدا/انتها برای عضو "+id+" موجود نیست.");continue;}
   const geometricLengthM=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
   const storedLengthM=Number(member.length);
   if(!(geometricLengthM>0)||!Number.isFinite(geometricLengthM)){errors.push("طول هندسی عضو "+id+" صفر یا نامعتبر است.");continue;}
   if(!Number.isFinite(storedLengthM)||storedLengthM<=0){errors.push("طول ذخیره‌شده عضو "+id+" معتبر نیست.");continue;}
   const errorM=Math.abs(storedLengthM-geometricLengthM);
   const toleranceM=1e-6+1e-8*Math.max(1,geometricLengthM);
   maxAbsErrorM=Math.max(maxAbsErrorM,errorM);
   if(errorM>toleranceM)errors.push("طول ذخیره‌شده عضو "+id+" با فاصله مختصاتی اختلاف دارد: "+errorM.toExponential(3)+" m.");
   items.push({memberId:id,storedLengthM,geometricLengthM,absoluteErrorM:errorM,toleranceM});
   totalLengthM+=geometricLengthM;
  }
  const result={complete:errors.length===0,unit:"m",memberCount:members.length,checkedCount:items.length,totalGeometricLengthM:totalLengthM,maxAbsoluteLengthErrorM:maxAbsErrorM,items,errors,
   method:"3D Euclidean distance between referenced start/end node coordinates; compared against member.length"};
  if(model&&typeof model==="object")model.geometryAudit=result;
  return result;
 }
 function requireGeometryAudit(model,operation){
  const audit=auditGeometry(model);
  if(!audit.complete)throw new Error((operation||"عملیات")+" متوقف شد؛ ممیزی هندسه اعضا کامل نیست: "+audit.errors.slice(0,8).join("؛ "));
  return audit;
 }
 function apply(model,records){
  if(!model||!Array.isArray(model.members)||!model.members.length)throw new Error("مدل اعضا برای تخصیص خواص مقطع موجود نیست.");
  if(!Array.isArray(records))throw new Error("رکوردهای مقاطع باید آرایه باشند.");
  const byId=new Map();
  records.forEach(record=>{
   const id=String(record?.memberId??"");
   if(!id||byId.has(id))throw new Error("شناسه مقطع خالی یا تکراری است: "+id);
   byId.set(id,record.section||record.initialSection);
  });
  const seen=new Set(),summary={memberCount:model.members.length,assignedCount:0,missing:[],groups:{}};
  model.members.forEach(member=>{
   const id=String(member.id);
   if(seen.has(id))throw new Error("شناسه عضو تکراری در مدل: "+id);
   seen.add(id);
   const raw=byId.get(id)||member.initialSection||member.sectionData||member.sectionProperties;
   if(!raw){summary.missing.push(id);return;}
   const section=normalize(raw,id);
   member.sectionProperties=section;
   member.sectionRollDeg=section.sectionRollDeg;
   if(section.sectionReferenceAxis){member.referenceAxis=section.sectionReferenceAxis.slice();member.sectionReferenceAxisSource="section-property-registry";}
   else if(member.sectionReferenceAxisSource==="section-property-registry"){delete member.referenceAxis;delete member.sectionReferenceAxisSource;}
   const referenceAxis=member.referenceAxis;
   const referenceAxisValid=Array.isArray(referenceAxis)&&referenceAxis.length===3&&referenceAxis.every(v=>Number.isFinite(Number(v)))&&Math.hypot(...referenceAxis.map(Number))>1e-10;
   member.sectionOrientationVerified=section.sectionOrientationConfirmed===true&&Number.isFinite(Number(section.sectionRollDeg))&&referenceAxisValid;
   member.sectionPropertyFingerprint=section.sectionPropertyFingerprint;
   member.sectionPropertySource=byId.has(id)?"resolved-member-section":"member-existing-section";
   summary.assignedCount++;
   const key=String(member.sectionKey||member.type||"unspecified");
   summary.groups[key]=(summary.groups[key]||0)+1;
  });
  const extra=[...byId.keys()].filter(id=>!seen.has(id));
  if(extra.length)throw new Error("مقاطع برای اعضای خارج از مدل ثبت شده‌اند: "+extra.join("، "));
  summary.complete=summary.assignedCount===summary.memberCount;
  model.sectionPropertyAudit=summary;
  return summary;
 }
 function applyOne(member,section){
  if(!member)throw new Error("عضو برای به‌روزرسانی مشخصات مقطع وجود ندارد.");
  const normalized=normalize(section,String(member.id));
  member.sectionProperties=normalized;
  member.sectionRollDeg=normalized.sectionRollDeg;
  if(normalized.sectionReferenceAxis){member.referenceAxis=normalized.sectionReferenceAxis.slice();member.sectionReferenceAxisSource="section-property-registry";}
  else if(member.sectionReferenceAxisSource==="section-property-registry"){delete member.referenceAxis;delete member.sectionReferenceAxisSource;}
  const referenceAxis=member.referenceAxis;
  const referenceAxisValid=Array.isArray(referenceAxis)&&referenceAxis.length===3&&referenceAxis.every(v=>Number.isFinite(Number(v)))&&Math.hypot(...referenceAxis.map(Number))>1e-10;
  member.sectionOrientationVerified=normalized.sectionOrientationConfirmed===true&&Number.isFinite(Number(normalized.sectionRollDeg))&&referenceAxisValid;
  member.sectionPropertyFingerprint=normalized.sectionPropertyFingerprint;
  member.sectionPropertySource="live-member-edit";
  return normalized;
 }
 function get(model,memberId){
  const member=model?.members?.find(item=>String(item.id)===String(memberId));
  if(!member||!member.sectionProperties)return null;
  return clone(member.sectionProperties);
 }
 function schedule(model){
  if(!model||!Array.isArray(model.members))throw new Error("مدل اعضا برای تهیه جدول مقاطع موجود نیست.");
  requireGeometryAudit(model,"تهیه جدول مقاطع");
  return model.members.map(member=>{
   const p=member.sectionProperties;
   if(!p)throw new Error("خواص مقطع عضو "+member.id+" هنوز تخصیص نیافته است.");
   return {memberId:String(member.id),sectionKey:String(member.sectionKey||member.type||""),profile:p.profile||p.designation||p.name||"بدون نام",lengthM:Number(member.length),
    A_m2:p.A,Iy_m4:p.Iy,Iz_m4:p.Iz,J_m4:p.J,E_Pa:p.E,G_Pa:p.G,
    massPerMeterKg:p.massPerMeterKg,radiusY_m:p.radiusY,radiusZ_m:p.radiusZ,
    SxTop_m3:p.SxTop||null,SxBottom_m3:p.SxBottom||null,Sy_m3:p.Sy||null,
    geometryDimensionsMm:clone(p.geometryDimensionsMm||{}),fingerprint:p.sectionPropertyFingerprint};
  });
 }
 function takeoff(model){
  if(!model||!Array.isArray(model.members)||!model.members.length)throw new Error("مدل اعضا برای متره فولاد موجود نیست.");
  if(model.sectionPropertiesDirty===true)throw new Error("متره متوقف شد؛ مقاطع پس از آخرین تغییر هنوز در مدل بازسازی نشده‌اند.");
  requireGeometryAudit(model,"متره فولاد");
  const audit=model.sectionPropertyAudit;
  if(!audit||audit.complete!==true||audit.memberCount!==model.members.length)throw new Error("متره متوقف شد؛ ممیزی خواص مقاطع کامل نیست.");
  const seen=new Set(),groups=new Map(),items=[];
  let totalLengthM=0,totalMassKg=0;
  for(const member of model.members){
   const id=String(member.id);
   if(!id||seen.has(id))throw new Error("شناسه عضو در متره خالی یا تکراری است: "+id);
   seen.add(id);
   const section=member.sectionProperties;
   if(!section)throw new Error("مقطع عضو "+id+" موجود نیست.");
   const lengthM=Number(member.length),massPerMeterKg=Number(section.massPerMeterKg);
   if(!Number.isFinite(lengthM)||lengthM<=0)throw new Error("طول واقعی عضو "+id+" معتبر نیست.");
   if(!Number.isFinite(massPerMeterKg)||massPerMeterKg<=0)throw new Error("وزن واحد طول مقطع عضو "+id+" معتبر نیست.");
   const massKg=lengthM*massPerMeterKg;
   const item={memberId:id,sectionKey:String(member.sectionKey||member.type||""),profile:section.profile||section.designation||section.name||"بدون نام",lengthM,massPerMeterKg,massKg,fingerprint:section.sectionPropertyFingerprint};
   items.push(item);totalLengthM+=lengthM;totalMassKg+=massKg;
   const key=[item.sectionKey,item.profile,item.fingerprint].join("|");
   const group=groups.get(key)||{sectionKey:item.sectionKey,profile:item.profile,fingerprint:item.fingerprint,memberCount:0,totalLengthM:0,massPerMeterKg,totalMassKg:0};
   group.memberCount++;group.totalLengthM+=lengthM;group.totalMassKg+=massKg;groups.set(key,group);
  }
  return {method:"sum(member.lengthM * member.section.massPerMeterKg)",memberCount:items.length,totalLengthM,totalMassKg,totalMassTon:totalMassKg/1000,items,groups:[...groups.values()]};
 }
 root.SahroudSectionPropertyRegistry={normalize,apply,applyOne,get,schedule,takeoff,fingerprint,auditGeometry};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudSectionPropertyRegistry;
})(typeof globalThis!=="undefined"?globalThis:this);
