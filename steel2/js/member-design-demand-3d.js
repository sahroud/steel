/* SAHROUD STEEL — concurrent 3D design-demand candidates (identity-audited)
 * Keeps all six section actions from the SAME load combination and station.
 * This module prepares design inputs; it does not calculate code capacities.
 * Units: N, N.m, m.
 */
(function(root){
  "use strict";
  const COMPONENTS=["N","Vy","Vz","T","My","Mz"];
  function build(combinationRun,model,demandApi){
    if(!combinationRun||combinationRun.success!==true||
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
      const length=Number(member.length);
      if(!Number.isFinite(length)||length<=0)throw new Error("طول عضو "+id+" برای کنترل ایستگاه‌های تقاضا معتبر نیست.");
      memberById.set(id,{member,length});
    });
    const expected=new Set(memberById.keys());
    const rows=new Map([...expected].map(id=>[id,{id,candidates:[],governing:{}}]));
    const seenCases=new Set();
    combinationRun.combinationResults.forEach(item=>{
      if(!item||!item.analysis||!item.analysis.success||!item.label||item.id===null||item.id===undefined||String(item.id).trim()==="")
        throw new Error("نتیجه حل‌گر یا شناسه یکی از ترکیبات بار ناقص است.");
      if(seenCases.has(String(item.id)))throw new Error("شناسه ترکیب بار تکراری است: "+item.id);
      seenCases.add(String(item.id));
      const recovered=demandApi.extractCase({...item.analysis,loadCase:item.id,loadCaseLabel:item.label},model);
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
            const n=Number(sample[k]);
            if(!Number.isFinite(n))throw new Error("مؤلفه "+k+" برای عضو "+member.id+" نامعتبر است.");
            values[k]=n;
          });
          const candidate={combinationId:item.id,combination:item.label,x:Number(sample.x),values};
          const length=memberById.get(id).length;
          if(!Number.isFinite(candidate.x)||candidate.x< -1e-9||candidate.x>length+1e-9)
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
      });
      const missing=[...expected].filter(id=>!recoveredIds.has(id));
      if(missing.length)throw new Error("اعضای مدل در نتایج ترکیب "+item.id+" مفقودند: "+missing.join("، "));
    });
    if(seenCases.size!==combinationRun.caseCount)throw new Error("تعداد ترکیبات حل‌شده با تعداد مورد انتظار برابر نیست.");
    const members=[...rows.values()].map(row=>{
      if(!row.candidates.length)throw new Error("هیچ بردار تقاضایی برای عضو "+row.id+" بازیابی نشد.");
      return {...row,candidateCount:row.candidates.length};
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
