/* SAHROUD STEEL — evidence-backed section-property intake.
 * Maps one physical cold-formed member record to a unit-explicit design-input packet.
 * No inferred values, unit conversion, resistance calculation, or approval.
 */
(function(root){
"use strict";
const SOURCE=["document","revision","locator","authority"];
const PROPS=["Ag_mm2","Ix_mm4","Iy_mm4","Ixy_mm4","J_mm4","Cw_mm6","SxTop_mm3","SxBottom_mm3","SyTop_mm3","SyBottom_mm3","shearCenterX_mm","shearCenterY_mm"];
const POSITIVE=PROPS.filter(k=>!["Ixy_mm4","shearCenterX_mm","shearCenterY_mm"].includes(k));
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const positive=v=>finite(v)&&v>0;
const nonblank=v=>typeof v==="string"&&v.trim().length>0;
const clone=v=>JSON.parse(JSON.stringify(v));
function evidenceIssues(label,e){
 const missing=SOURCE.filter(k=>!nonblank(e?.[k]));
 return missing.length?[label+" فاقد مدرک/ردگیری: "+missing.join("، ")]:[];
}
function build(record){
 const r=record||{},issues=[],p=r.profile||{},m=r.material||{},s=r.sectionProperties||{};
 if(!nonblank(r.memberId))issues.push("شناسه عضو فیزیکی خالی است.");
 if(!["roofPurlin","wallGirt","endGirt","roofEdge"].includes(r.group))issues.push("گروه عضو سردنورد معتبر نیست.");
 if(!["C","Z","RHS","hat","custom"].includes(p.family))issues.push("خانواده مقطع مشخص یا معتبر نیست.");
 if(!nonblank(p.designation)||!nonblank(p.manufacturer)||!nonblank(p.catalogRevision))issues.push("شناسه سازنده/مقطع/نسخه کاتالوگ ناقص است.");
 issues.push(...evidenceIssues("کاتالوگ هندسه",p.catalogEvidence));
 const geometryFields=p.family==="RHS"?["width_mm","height_mm","thickness_mm","insideRadius_mm"]:p.family==="custom"?["thickness_mm","insideRadius_mm"]:["webHeight_mm","flange1_mm","flange2_mm","thickness_mm","insideRadius_mm","lip1_mm","lip2_mm"];
 if(p.family==="custom"&&(!nonblank(p.geometryDescription)||!nonblank(p.geometryReference)))issues.push("مقطع سفارشی به توصیف هندسه و مرجع نقشه/مدل نیاز دارد.");
 geometryFields.forEach(k=>{const v=p[k];if(["lip1_mm","lip2_mm"].includes(k)?(!finite(v)||v<0):!positive(v))issues.push("بعد "+k+" با واحد mm معتبر نیست.");});
 if(!nonblank(r.units?.geometry)||r.units.geometry!=="mm")issues.push("واحد هندسه باید صریحاً units.geometry='mm' باشد.");
 if(!positive(m.Fy_MPa)||!positive(m.Fu_MPa)||!positive(m.E_MPa))issues.push("Fy/Fu/E باید با واحد MPa و مقادیر مثبت ثبت شوند.");
 if(!nonblank(m.standard)||!nonblank(m.certificateReference))issues.push("استاندارد و مرجع گواهی مصالح ناقص است.");
 issues.push(...evidenceIssues("گواهی مصالح",m.certificateEvidence));
 if(!nonblank(r.units?.materialStress)||r.units.materialStress!=="MPa")issues.push("واحد تنش مصالح باید صریحاً MPa باشد.");
 PROPS.forEach(k=>{if(!finite(s[k])||(POSITIVE.includes(k)&&s[k]<=0))issues.push("خاصیت "+k+" با واحد مندرج در نام فیلد معتبر نیست.");});
 if(!nonblank(s.source)||!nonblank(s.method)||!nonblank(s.revision))issues.push("منبع/روش/نسخه استخراج خواص مقطع ناقص است.");
 issues.push(...evidenceIssues("مدرک خواص مقطع",s.evidence));
 const unitMap=r.units?.sectionProperties||{};
 PROPS.forEach(k=>{const expected=k.endsWith("_mm2")?"mm2":k.endsWith("_mm3")?"mm3":k.endsWith("_mm4")?"mm4":k.endsWith("_mm6")?"mm6":"mm";if(unitMap[k]!==expected)issues.push("واحد "+k+" باید صریحاً "+expected+" ثبت شود.");});
 const geometry={};geometryFields.forEach(k=>{if(finite(p[k]))geometry[k]=p[k];});
 if(p.family==="custom"){geometry.description=p.geometryDescription||null;geometry.reference=p.geometryReference||null;}
 const properties={};PROPS.forEach(k=>{if(finite(s[k]))properties[k]=s[k];});
 return {success:issues.length===0,status:issues.length?"blocked-incomplete-evidence-or-units":"evidence-backed-input-ready",memberId:r.memberId||null,group:r.group||null,profile:{family:p.family||null,designation:p.designation||null,manufacturer:p.manufacturer||null,catalogRevision:p.catalogRevision||null,geometry,units:"mm",catalogEvidence:clone(p.catalogEvidence||{})},material:{Fy_MPa:m.Fy_MPa??null,Fu_MPa:m.Fu_MPa??null,E_MPa:m.E_MPa??null,standard:m.standard||null,certificateReference:m.certificateReference||null,certificateEvidence:clone(m.certificateEvidence||{}),units:"MPa"},sectionProperties:{values:properties,units:clone(unitMap),source:s.source||null,method:s.method||null,revision:s.revision||null,evidence:clone(s.evidence||{})},issues:[...new Set(issues)],designApproved:false,capacityCalculated:false,scope:"evidence and unit validation only; no property derivation, resistance, buckling, serviceability, or code approval"};
}
function fromRegistry(memberId){
 const registry=root.SteelColdFormedMemberRegistry;
 if(!registry?.getData)return {success:false,status:"registry-unavailable",memberId,issues:["رجیستر اعضای سردنورد بارگذاری نشده است."],designApproved:false,capacityCalculated:false};
 const matches=(registry.getData().records||[]).filter(r=>String(r.memberId||"")===String(memberId||""));
 if(matches.length!==1)return {success:false,status:"member-not-unique",memberId,issues:["برای شناسه درخواستی باید دقیقاً یک پرونده فیزیکی وجود داشته باشد؛ تعداد یافت‌شده: "+matches.length],designApproved:false,capacityCalculated:false};
 return build(matches[0]);
}
function drawingTrace(memberId,drawing){
 const d=drawing||root.SteelMemberDetailDrawings?.getLast?.(),same=!!d&&String(d.member?.id||"")===String(memberId||"");
 return {memberId,analysisElementMatch:same,physicalFabricationIdentityVerified:false,status:same?"analysis-element-geometry-only":"no-matching-current-analysis-drawing",note:"تطبیق شناسه برگه فعلی فقط تطبیق عضو/المان مدل تحلیل است؛ قطعه فیزیکی ساخت، برش، سوراخ، جوش و اتصال را اثبات نمی‌کند.",designApproved:false};
}
function selfTest(){
 const ev={document:"catalog.pdf",revision:"R2",locator:"p.8",authority:"manufacturer"};
 const good={memberId:"P-01",group:"roofPurlin",profile:{family:"Z",designation:"Z200",manufacturer:"M",catalogRevision:"R2",webHeight_mm:200,flange1_mm:60,flange2_mm:60,thickness_mm:2,insideRadius_mm:4,lip1_mm:15,lip2_mm:15,catalogEvidence:ev},material:{Fy_MPa:350,Fu_MPa:420,E_MPa:200000,standard:"EN 10346",certificateReference:"CERT-1",certificateEvidence:ev},sectionProperties:{Ag_mm2:500,Ix_mm4:1e6,Iy_mm4:2e5,Ixy_mm4:0,J_mm4:1000,Cw_mm6:1e9,SxTop_mm3:10000,SxBottom_mm3:10000,SyTop_mm3:4000,SyBottom_mm3:4000,shearCenterX_mm:0,shearCenterY_mm:0,source:"catalogue",method:"manufacturer table",revision:"R2",evidence:ev},units:{geometry:"mm",materialStress:"MPa",sectionProperties:{Ag_mm2:"mm2",Ix_mm4:"mm4",Iy_mm4:"mm4",Ixy_mm4:"mm4",J_mm4:"mm4",Cw_mm6:"mm6",SxTop_mm3:"mm3",SxBottom_mm3:"mm3",SyTop_mm3:"mm3",SyBottom_mm3:"mm3",shearCenterX_mm:"mm",shearCenterY_mm:"mm"}}};
 const tests=[];
 tests.push({name:"complete sourced record passes unit-explicit intake",pass:build(good).success});
 const noSource=clone(good);delete noSource.profile.catalogEvidence;tests.push({name:"missing catalogue provenance blocks intake",pass:!build(noSource).success});
 const noUnits=clone(good);delete noUnits.units.sectionProperties.Ix_mm4;tests.push({name:"missing property unit blocks intake",pass:!build(noUnits).success});
 const wrongUnit=clone(good);wrongUnit.units.geometry="cm";tests.push({name:"geometry unit mismatch blocks intake without conversion",pass:!build(wrongUnit).success});
 const missingProp=clone(good);delete missingProp.sectionProperties.Ix_mm4;tests.push({name:"missing section property is not inferred",pass:!build(missingProp).success});
 const missingCert=clone(good);delete missingCert.material.certificateEvidence;tests.push({name:"missing material certificate evidence blocks intake",pass:!build(missingCert).success});
 const custom=clone(good);custom.profile.family="custom";delete custom.profile.webHeight_mm;delete custom.profile.flange1_mm;delete custom.profile.flange2_mm;delete custom.profile.lip1_mm;delete custom.profile.lip2_mm;tests.push({name:"custom geometry requires an explicit drawing/model reference",pass:!build(custom).success});
 const rhs=clone(good);rhs.profile.family="RHS";rhs.profile.width_mm=100;rhs.profile.height_mm=50;delete rhs.profile.webHeight_mm;delete rhs.profile.flange1_mm;delete rhs.profile.flange2_mm;delete rhs.profile.lip1_mm;delete rhs.profile.lip2_mm;tests.push({name:"RHS geometry uses RHS dimensions and does not require channel lips",pass:build(rhs).success});
 const priorRegistry=root.SteelColdFormedMemberRegistry;root.SteelColdFormedMemberRegistry={getData:()=>({records:[good,{...good}]})};tests.push({name:"duplicate physical member IDs block registry intake",pass:fromRegistry("P-01").status==="member-not-unique"});root.SteelColdFormedMemberRegistry=priorRegistry;
 const duplicate={...good,memberId:"P-01"};tests.push({name:"intake output never approves or calculates capacity",pass:build(duplicate).designApproved===false&&build(duplicate).capacityCalculated===false});
 tests.push({name:"drawing trace is explicitly not fabrication identity",pass:drawingTrace("P-01",{member:{id:"P-01"}}).physicalFabricationIdentityVerified===false});
 return {passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,total:tests.length,tests,scope:"unit-explicit evidence intake only; no structural design approval"};
}
root.SteelMemberSectionEvidenceIntake={build,fromRegistry,drawingTrace,selfTest};
})(typeof window!=="undefined"?window:globalThis);
