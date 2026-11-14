/* SAHROUD STEEL — longitudinal brace force-demand extraction gate.
 * Extracts simultaneous axial end-force demands from a completed member envelope.
 * It does not infer tension/compression resistance, connection capacity, or code adequacy.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const expectedAxialConvention={endI:"negative Fx_i",endJ:"positive Fx_j"};
function audit(envelope,model){
 const issues=[],rows=[],members=Array.isArray(model?.members)?model.members:[];
 const braces=members.filter(m=>m.sectionKey==="wallBrace"||m.sectionKey==="roofBrace");
 const modelIds=members.map(m=>String(m.id)),duplicateModelIds=[...new Set(modelIds.filter((id,i)=>modelIds.indexOf(id)!==i))];
 if(duplicateModelIds.length)issues.push("شناسه عضو در مدل تکراری است؛ تطبیق نیرو با عضو یکتا ممکن نیست: "+duplicateModelIds.join("، "));
 if(!envelope||!Array.isArray(envelope.members))issues.push("پوش نیروهای FEM در دسترس نیست؛ ابتدا تحلیل تمام ترکیبات را اجرا کنید.");
 if(!braces.length)issues.push("هیچ مهاربند طولی دیوار یا سقف در مدل پیدا نشد.");
 if(envelope?.allCasesEquilibriumOK!==true)issues.push("تعادل تمام حالت‌های تحلیل در پوش نیرو تأیید نشده است.");
 if((envelope?.invalidForceVectors||[]).length)issues.push("پوش نیرو دارای بردار نیروی نامعتبر است.");
 if((envelope?.analysisMemberSetMismatchCases||[]).length)issues.push("مجموعه اعضای تحلیل در ترکیبات یکسان نیست.");
 const signCases=envelope?.localEndForceConvention?.verifiedSignCases?.axialTension;
 const signConventionVerified=envelope?.localEndForceConvention?.version===1&&signCases?.endI===expectedAxialConvention.endI&&signCases?.endJ===expectedAxialConvention.endJ;
 if(braces.length&&!signConventionVerified)issues.push("قرارداد علامت نیروی محوری دو انتهای عضو با قرارداد اعتبارسنجی‌شده حل‌گر تطبیق ندارد؛ طبقه‌بندی کشش/فشار مجاز نیست.");
 if((envelope?.unreportedMemberIds||[]).length)issues.push("برخی اعضای مدل در نتایج تحلیل گزارش نشده‌اند.");
 const envelopeMembers=Array.isArray(envelope?.members)?envelope.members:[];
 const envelopeIds=envelopeMembers.map(m=>String(m.id)),duplicateEnvelopeIds=[...new Set(envelopeIds.filter((id,i)=>envelopeIds.indexOf(id)!==i))];
 if(duplicateEnvelopeIds.length)issues.push("شناسه عضو در پوش نیرو تکراری است؛ نتایج هم‌نام قابل تفکیک نیستند: "+duplicateEnvelopeIds.join("، "));
 const envById=new Map(envelopeMembers.map(m=>[String(m.id),m]));
 braces.forEach(brace=>{
  const row=envById.get(String(brace.id)),cases=Array.isArray(row?.simultaneousCases)?row.simultaneousCases:[];
  const seen=new Set(),demands=[];
  if(!row)issues.push("نیروی مهاربند "+brace.id+" در پوش نیرو موجود نیست.");
  if(!cases.length)issues.push("هیچ حالت بار هم‌زمان برای مهاربند "+brace.id+" ثبت نشده است.");
  cases.forEach(c=>{
   const label=String(c.label||""),i=c.endI?.N,j=c.endJ?.N;
   if(!label||seen.has(label)||!finite(i)||!finite(j)){issues.push("حالت بار یا مؤلفه محوری دو سر مهاربند "+brace.id+" ناقص/تکراری است.");return;}
   seen.add(label);const ti=signConventionVerified?-i:null,tj=signConventionVerified?j:null;
   demands.push({caseLabel:label,endI_N:i,endJ_N:j,endI_tension_N:signConventionVerified?Math.max(0,ti):null,endI_compression_N:signConventionVerified?Math.max(0,-ti):null,endJ_tension_N:signConventionVerified?Math.max(0,tj):null,endJ_compression_N:signConventionVerified?Math.max(0,-tj):null,maxAbsAxial_N:Math.max(Math.abs(i),Math.abs(j))});
  });
  rows.push({memberId:String(brace.id),sectionKey:brace.sectionKey,memberLength_m:finite(Number(brace.length))?Number(brace.length):null,caseCount:demands.length,simultaneousDemands:demands,forceConvention:envelope?.localEndForceConvention||null,status:demands.length===cases.length&&cases.length>0?"demand-extracted":"incomplete"});
 });
 const rawExpectedLabels=Array.isArray(envelope?.cases)?envelope.cases.map(c=>String(c?.label||"")):[];
 const expectedLabels=rawExpectedLabels.filter(Boolean);
 const expectedCases=expectedLabels.length;
 if(rawExpectedLabels.some(x=>!x.trim()))issues.push("فهرست حالت‌های تحلیل دارای نام خالی است؛ تطبیق کامل ترکیبات ممکن نیست.");
 const duplicateExpectedLabels=[...new Set(expectedLabels.filter((x,i)=>expectedLabels.indexOf(x)!==i))];
 if(duplicateExpectedLabels.length)issues.push("نام حالت بار در پوش تحلیل تکراری است: "+duplicateExpectedLabels.join("، "));
 rows.forEach(r=>{
  const actualLabels=r.simultaneousDemands.map(x=>x.caseLabel);
  const missingLabels=expectedLabels.filter(x=>!actualLabels.includes(x));
  const unexpectedLabels=actualLabels.filter(x=>!expectedLabels.includes(x));
  if(expectedCases&&(r.caseCount!==expectedCases||missingLabels.length||unexpectedLabels.length)){
   r.missingCaseLabels=missingLabels;r.unexpectedCaseLabels=unexpectedLabels;
   r.status="incomplete";
   issues.push("پوش ترکیبات مهاربند "+r.memberId+" با فهرست حالت‌های تحلیل تطبیق کامل ندارد؛ مفقود: "+missingLabels.join("، ")+"؛ اضافی: "+unexpectedLabels.join("، ")+".");
  }
 });
 // Summarize each brace end separately while preserving the governing load-case identity.
 rows.forEach(r=>{
  const peaks={tension:{forceN:0,caseLabel:null,end:null},compression:{forceN:0,caseLabel:null,end:null}};
  r.simultaneousDemands.forEach(d=>{
   for(const [end,tension,compression] of [["I",d.endI_tension_N,d.endI_compression_N],["J",d.endJ_tension_N,d.endJ_compression_N]]){
    if(finite(tension)&&tension>peaks.tension.forceN)peaks.tension={forceN:tension,caseLabel:d.caseLabel,end};
    if(finite(compression)&&compression>peaks.compression.forceN)peaks.compression={forceN:compression,caseLabel:d.caseLabel,end};
   }
  });
  r.peakTension=signConventionVerified?peaks.tension:null;
  r.peakCompression=signConventionVerified?peaks.compression:null;
  r.demandCoverageComplete=r.status==="demand-extracted"&&expectedCases>0&&r.caseCount===expectedCases;
 });
 const completeRows=rows.filter(r=>r.demandCoverageComplete);
 const summary={completeBraceCount:completeRows.length,braceCount:braces.length,peakTension:null,peakCompression:null};
 if(completeRows.length===braces.length&&braces.length&&signConventionVerified&&issues.length===0){
  for(const r of completeRows){
   for(const kind of ["tension","compression"]){
    const p=r[kind==="tension"?"peakTension":"peakCompression"];
    if(p&&(!summary[kind==="tension"?"peakTension":"peakCompression"]||p.forceN>summary[kind==="tension"?"peakTension":"peakCompression"].forceN))
     summary[kind==="tension"?"peakTension":"peakCompression"]={memberId:r.memberId,...p};
   }
  }
 }
 if(!envelope?.localEndForceConvention&&rows.length)issues.push("قرارداد علامت/محور نیروهای محلی مستند نیست؛ تشخیص کشش/فشار مجاز نیست.");
 return {success:issues.length===0,issues,rows,summary,braceCount:braces.length,expectedCaseCount:expectedCases,demandOnly:true,analysisEnabled:false,designApproved:false,
 limitations:["این ماژول فقط نیروی محوری انتهایی هم‌زمان هر ترکیب را استخراج می‌کند؛ تبدیل آن به نیروی کششی/فشاری طراحی تا اعتبارسنجی قرارداد علامت انجام نشده است.","ظرفیت کششی، کمانش مهاربند، طول مهارنشده، K، مقطع مؤثر، خروج از مرکزیت، گاست‌پلیت، پیچ/جوش و مسیر collector/دیافراگم کنترل نمی‌شوند.","وجود مسیر توپولوژیک تا پایه به‌تنهایی انتقال واقعی نیروی باد طولی یا سختی دیافراگم را اثبات نمی‌کند."]};
}
function selfTest(){
 const model={members:[{id:"WB1",sectionKey:"wallBrace",length:5},{id:"RB1",sectionKey:"roofBrace",length:7}]};
 const envelope={allCasesEquilibriumOK:true,localEndForceConvention:{version:1,verifiedSignCases:{axialTension:{endI:"negative Fx_i",endJ:"positive Fx_j"}}},cases:[{label:"C1"},{label:"C2"}],members:[
 {id:"WB1",simultaneousCases:[{label:"C1",endI:{N:100},endJ:{N:-120}},{label:"C2",endI:{N:80},endJ:{N:90}}]},
 {id:"RB1",simultaneousCases:[{label:"C1",endI:{N:200},endJ:{N:-220}},{label:"C2",endI:{N:180},endJ:{N:190}}]}]};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("extracts simultaneous axial demands per brace and case",()=>{const r=audit(envelope,model);return r.success&&r.rows.length===2&&r.rows[0].caseCount===2&&r.rows[0].simultaneousDemands[0].maxAbsAxial_N===120;});
 t("does not mix independent case maxima",()=>{const r=audit(envelope,model);return r.rows[0].simultaneousDemands.length===2&&r.rows[0].simultaneousDemands[0].caseLabel==="C1"&&r.rows[0].simultaneousDemands[1].caseLabel==="C2";});
 t("rejects missing brace force row",()=>!audit({...envelope,members:envelope.members.slice(1)},model).success);
 t("rejects incomplete case coverage",()=>!audit({...envelope,cases:[...envelope.cases,{label:"C3"}]},model).success);
 t("rejects duplicate labels masking a missing case",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[1].label="C1";return !audit(e,model).success;});
 t("rejects unexpected labels replacing expected cases",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[1].label="OTHER";return !audit(e,model).success;});
 t("rejects non-equilibrated envelope",()=>!audit({...envelope,allCasesEquilibriumOK:false},model).success);
 t("rejects unknown local force convention",()=>!audit({...envelope,localEndForceConvention:null},model).success);
 t("rejects malformed axial end force",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[0].endI.N="100";return !audit(e,model).success;});
 t("normalizes tensile actions at opposite member ends consistently",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[0].endI.N=-100;e.members[0].simultaneousCases[0].endJ.N=120;const r=audit(e,model),d=r.rows[0].simultaneousDemands[0];return r.success&&d.endI_tension_N===100&&d.endJ_tension_N===120&&d.endI_compression_N===0&&d.endJ_compression_N===0;});
 t("normalizes compressive actions at opposite member ends consistently",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members[0].simultaneousCases[0].endI.N=100;e.members[0].simultaneousCases[0].endJ.N=-120;const r=audit(e,model),d=r.rows[0].simultaneousDemands[0];return r.success&&d.endI_compression_N===100&&d.endJ_compression_N===120&&d.endI_tension_N===0&&d.endJ_tension_N===0;});
 t("rejects unrecognized axial sign convention",()=>!audit({...envelope,localEndForceConvention:{version:2,verifiedSignCases:{axialTension:{endI:"wrong",endJ:"wrong"}}}},model).success);
 t("never reports capacity or design approval",()=>{const r=audit(envelope,model);return r.demandOnly&&r.analysisEnabled===false&&r.designApproved===false&&!r.rows.some(x=>"capacity_kN" in x);});
 t("rejects duplicate brace IDs in structural model",()=>!audit(envelope,{members:[...model.members,{...model.members[0]}]}).success);
 t("rejects duplicate member IDs in force envelope",()=>{const e=JSON.parse(JSON.stringify(envelope));e.members.push({...e.members[0]});return !audit(e,model).success;});
 t("rejects duplicate expected load-case labels",()=>{const e=JSON.parse(JSON.stringify(envelope));e.cases[1].label="C1";return !audit(e,model).success;});
 t("rejects blank expected load-case labels",()=>{const e=JSON.parse(JSON.stringify(envelope));e.cases[1].label="";return !audit(e,model).success;});
 t("reports governing tensile demand with exact case and end",()=>{const r=audit(envelope,model),x=r.rows[0].peakTension;return r.success&&x.forceN===120&&x.caseLabel==="C1"&&x.end==="J"&&r.summary.peakTension.memberId==="WB1";});
 t("reports governing compression demand separately without mixing cases",()=>{const r=audit(envelope,model),x=r.rows[0].peakCompression;return r.success&&x.forceN===120&&x.caseLabel==="C1"&&x.end==="J"&&r.summary.peakCompression.memberId==="WB1";});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"software regression only; no member capacity verification"};
}
root.SteelBraceForceDemandAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
