/* SAHROUD STEEL — longitudinal brace force-demand extraction gate.
 * Extracts simultaneous axial end-force demands from a completed member envelope.
 * It does not infer tension/compression resistance, connection capacity, or code adequacy.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function audit(envelope,model){
 const issues=[],rows=[],members=Array.isArray(model?.members)?model.members:[];
 const braces=members.filter(m=>m.sectionKey==="wallBrace"||m.sectionKey==="roofBrace");
 if(!envelope||!Array.isArray(envelope.members))issues.push("پوش نیروهای FEM در دسترس نیست؛ ابتدا تحلیل تمام ترکیبات را اجرا کنید.");
 if(!braces.length)issues.push("هیچ مهاربند طولی دیوار یا سقف در مدل پیدا نشد.");
 if(envelope?.allCasesEquilibriumOK!==true)issues.push("تعادل تمام حالت‌های تحلیل در پوش نیرو تأیید نشده است.");
 if((envelope?.invalidForceVectors||[]).length)issues.push("پوش نیرو دارای بردار نیروی نامعتبر است.");
 if((envelope?.analysisMemberSetMismatchCases||[]).length)issues.push("مجموعه اعضای تحلیل در ترکیبات یکسان نیست.");
 if((envelope?.unreportedMemberIds||[]).length)issues.push("برخی اعضای مدل در نتایج تحلیل گزارش نشده‌اند.");
 const envById=new Map((envelope?.members||[]).map(m=>[String(m.id),m]));
 braces.forEach(brace=>{
  const row=envById.get(String(brace.id)),cases=Array.isArray(row?.simultaneousCases)?row.simultaneousCases:[];
  const seen=new Set(),demands=[];
  if(!row)issues.push("نیروی مهاربند "+brace.id+" در پوش نیرو موجود نیست.");
  if(!cases.length)issues.push("هیچ حالت بار هم‌زمان برای مهاربند "+brace.id+" ثبت نشده است.");
  cases.forEach(c=>{
   const label=String(c.label||""),i=c.endI?.N,j=c.endJ?.N;
   if(!label||seen.has(label)||!finite(i)||!finite(j)){issues.push("حالت بار یا مؤلفه محوری دو سر مهاربند "+brace.id+" ناقص/تکراری است.");return;}
   seen.add(label);demands.push({caseLabel:label,endI_N:i,endJ_N:j,maxAbsAxial_N:Math.max(Math.abs(i),Math.abs(j))});
  });
  rows.push({memberId:String(brace.id),sectionKey:brace.sectionKey,memberLength_m:finite(Number(brace.length))?Number(brace.length):null,caseCount:demands.length,simultaneousDemands:demands,forceConvention:envelope?.localEndForceConvention||null,status:demands.length===cases.length&&cases.length>0?"demand-extracted":"incomplete"});
 });
 const expectedLabels=Array.isArray(envelope?.cases)?envelope.cases.map(c=>String(c.label||"")).filter(Boolean):[];
 const expectedCases=expectedLabels.length;
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
 if(!envelope?.localEndForceConvention&&rows.length)issues.push("قرارداد علامت/محور نیروهای محلی مستند نیست؛ تشخیص کشش و فشار مجاز نیست.");
 return {success:issues.length===0,issues,rows,braceCount:braces.length,expectedCaseCount:expectedCases,demandOnly:true,analysisEnabled:false,designApproved:false,
 limitations:["این ماژول فقط نیروی محوری انتهایی هم‌زمان هر ترکیب را استخراج می‌کند؛ تبدیل آن به نیروی کششی/فشاری طراحی تا اعتبارسنجی قرارداد علامت انجام نشده است.","ظرفیت کششی، کمانش مهاربند، طول مهارنشده، K، مقطع مؤثر، خروج از مرکزیت، گاست‌پلیت، پیچ/جوش و مسیر collector/دیافراگم کنترل نمی‌شوند.","وجود مسیر توپولوژیک تا پایه به‌تنهایی انتقال واقعی نیروی باد طولی یا سختی دیافراگم را اثبات نمی‌کند."]};
}
function selfTest(){
 const model={members:[{id:"WB1",sectionKey:"wallBrace",length:5},{id:"RB1",sectionKey:"roofBrace",length:7}]};
 const envelope={allCasesEquilibriumOK:true,localEndForceConvention:{version:"test"},cases:[{label:"C1"},{label:"C2"}],members:[
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
 t("never reports capacity or design approval",()=>{const r=audit(envelope,model);return r.demandOnly&&r.analysisEnabled===false&&r.designApproved===false&&!r.rows.some(x=>"capacity_kN" in x);});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"software regression only; no member capacity verification"};
}
root.SteelBraceForceDemandAudit={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
