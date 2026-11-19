/* SAHROUD STEEL — unified per-member section property registry.
 * SI properties are the single source of truth shared by analysis, reporting and takeoff.
 * This registry derives geometric summaries only; it does not perform code resistance checks.
 */
(function(root){
 "use strict";
 const clone=v=>JSON.parse(JSON.stringify(v));
 const positive=(v,label)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0)throw new Error(label+" باید مثبت و محدود باشد.");return n;};
 function fingerprint(section){
  const keys=["profile","A","Iy","Iz","J","E","G","SxTop","SxBottom","Sy","massPerMeterKg","geometryType"];
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
  const rho=Number.isFinite(Number(section.densityKgM3))&&Number(section.densityKgM3)>0?Number(section.densityKgM3):7850;
  const normalized={...clone(section),A,Iy,Iz,J,E,G};
  normalized.massPerMeterKg=A*rho;
  normalized.radiusY=Math.sqrt(Iy/A);
  normalized.radiusZ=Math.sqrt(Iz/A);
  normalized.sectionPropertyFingerprint=fingerprint(normalized);
  normalized.propertyUnits={A:"m2",inertia:"m4",torsion:"m4",sectionModulus:"m3",massPerMeter:"kg/m",radius:"m",E:"Pa",G:"Pa"};
  return normalized;
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
  return model.members.map(member=>{
   const p=member.sectionProperties;
   if(!p)throw new Error("خواص مقطع عضو "+member.id+" هنوز تخصیص نیافته است.");
   return {memberId:String(member.id),sectionKey:String(member.sectionKey||member.type||""),profile:p.profile||p.designation||p.name||"بدون نام",
    A_m2:p.A,Iy_m4:p.Iy,Iz_m4:p.Iz,J_m4:p.J,E_Pa:p.E,G_Pa:p.G,
    massPerMeterKg:p.massPerMeterKg,radiusY_m:p.radiusY,radiusZ_m:p.radiusZ,
    SxTop_m3:p.SxTop||null,SxBottom_m3:p.SxBottom||null,Sy_m3:p.Sy||null,
    geometryDimensionsMm:clone(p.geometryDimensionsMm||{}),fingerprint:p.sectionPropertyFingerprint};
  });
 }
 root.SahroudSectionPropertyRegistry={normalize,apply,applyOne,get,schedule,fingerprint};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudSectionPropertyRegistry;
})(typeof globalThis!=="undefined"?globalThis:this);
