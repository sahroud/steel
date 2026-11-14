/* SAHROUD STEEL — final member load-vector preflight.
 * Verifies explicit member load declarations immediately before FEM solve.
 * It is a data-integrity gate, not a structural design check.
 */
(function(root){
"use strict";
const finite=Number.isFinite;
const REQUIRED_LINE_LOADS=["dead","live","snow","wind","windLeft","windRight","windEnd"];
const validVector=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
function audit(members){
 const issues=[],rows=[];
 if(!Array.isArray(members)||!members.length)return {success:false,issues:["فهرست اعضای تحلیل خالی یا نامعتبر است."],rows,analysisEnabled:false,designApproved:false};
 const seen=new Set();
 members.forEach(m=>{
  const id=String(m?.id??"");
  const memberIssues=[];
  if(!id)memberIssues.push("missing-member-id");
  else if(seen.has(id))memberIssues.push("duplicate-member-id");
  else seen.add(id);
  const a=m?.analysisLoad;
  if(!a||!validVector(a.uniformLocal))memberIssues.push("local-load-vector");
  if(!a||!validVector(a.globalUniform))memberIssues.push("global-load-vector");
  if(!a||!finite(a.selfWeightKNm))memberIssues.push("self-weight-line-load");
  if(!m?.lineLoads||REQUIRED_LINE_LOADS.some(k=>!finite(m.lineLoads[k])))memberIssues.push("explicit-line-load-ledger");
  const row={memberId:id,sectionKey:String(m?.sectionKey||""),type:String(m?.type||""),loadRole:m?.lineLoads?.loadRole||null,
   localVectorValid:!!a&&validVector(a.uniformLocal),globalVectorValid:!!a&&validVector(a.globalUniform),
   selfWeightKNm:a?.selfWeightKNm??null,issues:memberIssues};
  rows.push(row);
  if(memberIssues.length)issues.push("عضو "+(id||"(بدون شناسه)")+": "+memberIssues.join("، "));
 });
 const groups=Object.fromEntries([...new Set(rows.map(x=>x.sectionKey||"unclassified"))].map(k=>[k,rows.filter(x=>(x.sectionKey||"unclassified")===k).length]));
 return {success:issues.length===0,memberCount:rows.length,groups,rows,issues,
  explicitZeroLineLoadCount:rows.filter(x=>x.selfWeightKNm===0&&x.localVectorValid&&x.globalVectorValid).length,
  scope:"pre-solver load-vector and member-ledger completeness only; no member capacity or code approval",
  analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const tests=[],test=(name,fn)=>{try{tests.push({name,ok:fn()===true});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const good={id:"M1",sectionKey:"rafter",lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0},analysisLoad:{uniformLocal:[0,0,0],globalUniform:[0,0,0],selfWeightKNm:0}};
 test("complete explicit member load record passes",()=>audit([good]).success);
 test("missing local vector blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,uniformLocal:null}}]).success);
 test("missing global vector blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,globalUniform:undefined}}]).success);
 test("wrong vector dimension blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,uniformLocal:[0,0]}}]).success);
 test("nonfinite vector component blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,globalUniform:[0,NaN,0]}}]).success);
 test("missing explicit line load declaration blocks",()=>!audit([{...good,lineLoads:{dead:0}}]).success);
 test("missing self weight declaration blocks",()=>!audit([{...good,analysisLoad:{...good.analysisLoad,selfWeightKNm:undefined}}]).success);
 test("duplicate member IDs block",()=>!audit([good,{...good}]).success);
 test("explicit zero actions are accepted and counted",()=>{const r=audit([good]);return r.success&&r.explicitZeroLineLoadCount===1;});
 test("never enables analysis or approves design",()=>{const r=audit([good]);return r.analysisEnabled===false&&r.designApproved===false;});
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests};
}
root.SteelMemberLoadPreflight={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
