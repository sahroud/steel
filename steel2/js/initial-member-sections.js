/* SAHROUD STEEL — initial member section resolution.
 * Resolves each model member's starting section from explicit user input,
 * an already assigned model section, or a group default. No capacity claim.
 */
(function(root){
"use strict";
const clone=v=>JSON.parse(JSON.stringify(v));
const nonblank=v=>typeof v==="string"&&v.trim().length>0;
function resolve(model,inputs){
 const members=model?.members, data=inputs||{};
 if(!Array.isArray(members)||!members.length)throw new Error("مدل اعضا برای تعیین مقاطع اولیه موجود نیست.");
 const defaults=data.defaults||{}, overrides=data.overrides||[];
 if(!Array.isArray(overrides))throw new Error("فهرست مقاطع ورودی کاربر باید آرایه باشد.");
 const byId=new Map();
 overrides.forEach(r=>{
  if(!r||!nonblank(r.memberId))throw new Error("هر مقطع ورودی کاربر باید شناسه عضو داشته باشد.");
  const id=r.memberId.trim();
  if(byId.has(id))throw new Error("برای عضو "+id+" بیش از یک مقطع اولیه کاربر ثبت شده است.");
  byId.set(id,r);
 });
 const ids=new Set();
 const resolved=members.map(m=>{
  if(!m||!nonblank(String(m.id??"")))throw new Error("یکی از اعضای مدل شناسه معتبر ندارد.");
  const id=String(m.id).trim();
  if(ids.has(id))throw new Error("شناسه عضو در مدل تکراری است: "+id);
  ids.add(id);
  const user=byId.get(id);
  const existing=m.initialSection||m.sectionData||m.section;
  const groupKey=String(m.group||m.sectionKey||m.type||"");
  const fallback=defaults[groupKey]||defaults[String(m.sectionKey||"")];
  const picked=user?.section?{section:user.section,source:"user-input"}:
    existing?{section:existing,source:"existing-model-section"}:
    fallback?{section:fallback,source:"group-default"}:null;
  if(!picked||!picked.section||!nonblank(picked.section.designation||picked.section.name||picked.section.profile))
   throw new Error("برای عضو "+id+" مقطع اولیه مشخص نیست؛ ورودی کاربر یا پیش‌فرض گروه لازم است.");
  return {memberId:id,group:String(m.group||m.sectionKey||m.type||"unspecified"),
   initialSection:clone(picked.section),source:picked.source,
   sourceReference:user?.sourceReference||m.sectionSourceReference||null,
   optimizationStatus:"not-yet-checked"};
 });
 const unknown=[...byId.keys()].filter(id=>!ids.has(id));
 if(unknown.length)throw new Error("شناسه‌های ورودی کاربر در مدل وجود ندارند: "+unknown.join("، "));
 return {success:true,schema:"SAHROUD-INITIAL-MEMBER-SECTIONS-1.0",
  memberCount:resolved.length,records:resolved,
  note:"این بسته فقط مقاطع شروع طراحی را ثبت می‌کند؛ هیچ ظرفیت، کفایت یا اقتصادی‌بودن را تأیید نمی‌کند."};
}
root.SahroudInitialMemberSections={resolve};
})(typeof window!=="undefined"?window:globalThis);
