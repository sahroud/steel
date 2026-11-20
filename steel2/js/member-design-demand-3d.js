/* SAHROUD STEEL — concurrent 3D design-demand candidates (identity-audited)
 * Keeps all six section actions from the SAME load combination and station.
 * This module prepares design inputs; it does not calculate code capacities.
 * Units: N, N.m, m.
 */
(function(root){
  "use strict";
  const COMPONENTS=["N","Vy","Vz","T","My","Mz"];
  const finiteInput=value=>(typeof value==="number"&&Number.isFinite(value))||
    (typeof value==="string"&&value.trim()!==""&&Number.isFinite(Number(value)));
  function build(combinationRun,model,demandApi){
    if(!combinationRun||combinationRun.success!==true||
       !Number.isInteger(combinationRun.caseCount)||combinationRun.caseCount<=0||
       !Array.isArray(combinationRun.combinationResults)||
       combinationRun.combinationResults.length!==combinationRun.caseCount)
      throw new Error("نتایج کامل همه ترکیبات بار برای آماده‌سازی تقاضای طراحی لازم است.");
    if(!model||!Array.isArray(model.members)||!model.members.length)
      throw new Error("مدل مرجع اعضا برای آماده‌سازی تقاضای طراحی موجود نیست.");
    if(!demandApi||typeof demandApi.extractCase!=="function")
      throw new Error("موتور بازیابی نیروهای داخلی سه‌بعدی در دسترس نیست.");
    const memberById=new Map();
    model.members.forEach(member=>{
      const id=String(member?.id??"").trim();
      if(!id||memberById.has(id))throw new Error("شناسه اعضای مدل مرجع خالی یا تکراری است.");
      const rawLength=Number(member.length);
      const length=Number.isFinite(rawLength)&&rawLength>0?rawLength:null;
      memberById.set(id,{member,length});
    });
    const expected=new Set(memberById.keys());
    const rows=new Map([...expected].map(id=>[id,{id,candidates:[],governing:{},sectionPropertyFingerprint:null,sectionOrientationVerified:false,sectionRollDeg:null,localAxes:null}]));
    const seenCases=new Set();
    combinationRun.combinationResults.forEach(item=>{
      const caseId=String(item?.id??"").trim();
      if(!item||!item.analysis||!item.analysis.success||!String(item.label??"").trim()||!caseId)
        throw new Error("نتیجه حل‌گر یا شناسه یکی از ترکیبات بار ناقص است.");
      if(seenCases.has(caseId))throw new Error("شناسه ترکیب بار تکراری است: "+caseId);
      seenCases.add(caseId);
      const recovered=demandApi.extractCase({...item.analysis,loadCase:caseId,loadCaseLabel:item.label},model);
      if(!Array.isArray(recovered.members))throw new Error("فهرست اعضای بازیابی‌شده در ترکیب "+item.id+" معتبر نیست.");
      if(recovered.memberCount!==recovered.members.length||recovered.members.length!==expected.size)
        throw new Error("تعداد واقعی اعضای بازیابی‌شده با مدل مرجع یکسان نیست.");
      const recoveredIds=new Set();
      recovered.members.forEach(member=>{
        const id=String(member?.id??"").trim();
        if(!id||recoveredIds.has(id))throw new Error("شناسه عضو در نتایج ترکیب "+item.id+" خالی یا تکراری است: "+id);
        recoveredIds.add(id);
        const row=rows.get(id);
        if(!row)throw new Error("عضو خارج از مدل مرجع در نتایج طراحی دیده شد: "+id);
        if(!Array.isArray(member.samples)||!member.samples.length)throw new Error("ایستگاه‌های تقاضای عضو "+id+" در ترکیب "+item.id+" موجود نیست.");
        const seenStations=new Set();
        member.samples.forEach(sample=>{
          const values={};
          COMPONENTS.forEach(k=>{
            if(!finiteInput(sample?.[k]))throw new Error("مؤلفه "+k+" برای عضو "+id+" تهی یا نامعتبر است.");
            values[k]=Number(sample[k]);
          });
          if(!finiteInput(sample?.x))throw new Error("مختصات ایستگاه برای عضو "+id+" تهی یا نامعتبر است.");
          const candidate={combinationId:caseId,combination:String(item.label).trim(),x:Number(sample.x),values};
          const sourceLength=memberById.get(id).length;
          const recoveredLength=Number(member.length);
          const length=sourceLength??(Number.isFinite(recoveredLength)&&recoveredLength>0?recoveredLength:null);
          if(!Number.isFinite(candidate.x)||candidate.x< -1e-9||(length!==null&&candidate.x>length+1e-9))
            throw new Error("مختصات ایستگاه تقاضا برای عضو "+id+" خارج از طول عضو یا نامعتبر است.");
          const stationKey=candidate.x.toPrecision(12);
          if(seenStations.has(stationKey))throw new Error("ایستگاه تقاضای تکراری برای عضو "+id+" در ترکیب "+item.id+" ثبت شده است.");
          seenStations.add(stationKey);
          row.candidates.push(candidate);
          COMPONENTS.forEach(k=>{
            const old=row.governing[k];
            if(!old||Math.abs(values[k])>Math.abs(old.values[k]))row.governing[k]=candidate;
          });
        });
        const fingerprint=String(member.sectionPropertyFingerprint??"").trim();
        if(!fingerprint)throw new Error("شناسنامه مقطع عضو "+id+" در نتیجه تحلیل موجود نیست؛ تقاضا قابل اتصال به مقطع نیست.");
        if(member.sectionOrientationVerified!==true||!member.localAxesVerified||!member.localAxes)
          throw new Error("جهت نصب یا محورهای محلی عضو "+id+" در نتیجه تحلیل تأیید نشده است.");
        const axesKey=JSON.stringify(member.localAxes);
        if(row.sectionPropertyFingerprint===null){
          row.sectionPropertyFingerprint=fingerprint;row.sectionOrientationVerified=true;
          row.sectionRollDeg=member.sectionRollDeg;row.localAxes=member.localAxes;
          row._axesKey=axesKey;
        }else if(row.sectionPropertyFingerprint!==fingerprint||row.sectionRollDeg!==member.sectionRollDeg||row._axesKey!==axesKey){
          throw new Error("شناسنامه مقطع، زاویه چرخش یا محورهای محلی عضو "+id+" بین ترکیبات بار یکسان نیست.");
        }
      });
      const missing=[...expected].filter(id=>!recoveredIds.has(id));
      if(missing.length)throw new Error("اعضای مدل در نتایج ترکیب "+item.id+" مفقودند: "+missing.join("، "));
    });
    if(seenCases.size!==combinationRun.caseCount)throw new Error("تعداد ترکیبات حل‌شده با تعداد مورد انتظار برابر نیست.");
    const members=[...rows.values()].map(row=>{
      if(!row.candidates.length)throw new Error("هیچ بردار تقاضایی برای عضو "+row.id+" بازیابی نشد.");
      const {_axesKey,...publicRow}=row;return {...publicRow,candidateCount:row.candidates.length};
    });
    return {success:true,method:"concurrent-six-component-per-combination-and-station",
      caseCount:seenCases.size,caseIds:[...seenCases],memberCount:members.length,members,
      units:{force:"N",moment:"N.m",length:"m"},
      interactionReady:false,capacityChecksReady:false,
      note:"هر candidate شش مؤلفه N,Vy,Vz,T,My,Mz را از یک ترکیب بار و یک مقطع نگه می‌دارد. حاکم‌های جداگانه مؤلفه‌ها الزاماً هم‌زمان نیستند. ظرفیت و کنترل آیین‌نامه‌ای در این ماژول محاسبه نمی‌شود."};
  }
  root.SahroudMemberDesignDemand3D={components:COMPONENTS.slice(),build};
  if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudMemberDesignDemand3D;
})(typeof window!=="undefined"?window:globalThis);
