/* SAHROUD STEEL — 3D member internal-force recovery
 * Recovers elastic section actions from solver end actions and uniform local loads.
 * Units: N, N.m, m. This is demand extraction, not a code-capacity check.
 */
(function(root){
  "use strict";
  const COMPONENTS=["N","Vy","Vz","T","My","Mz"];
  function finite(value,label){
    const n=Number(value);
    if(!Number.isFinite(n))throw new Error(label+" باید عدد متناهی باشد.");
    return n;
  }
  function validateMember(member){
    if(!member||!(Number(member.length)>0))throw new Error("طول عضو برای بازیابی نیروهای داخلی معتبر نیست.");
    const f=member.localEndForces;
    if(!Array.isArray(f)||f.length!==12||f.some(v=>!Number.isFinite(Number(v))))
      throw new Error("بردار ۱۲ مؤلفه‌ای نیروهای انتهایی عضو ناقص یا نامعتبر است.");
    const q=member.analysisLoad?.uniformLocal??[0,0,0];
    if(!Array.isArray(q)||q.length!==3||q.some(v=>!Number.isFinite(Number(v))))
      throw new Error("بار گسترده یکنواخت محلی باید سه مؤلفه معتبر داشته باشد.");
    return {L:Number(member.length),f:f.map(Number),q:q.map(Number)};
  }
  function sectionForcesAt(member,x){
    const {L,f,q}=validateMember(member);
    const s=finite(x,"مختصات مقطع");
    if(s< -1e-9||s>L+1e-9)throw new Error("مختصات مقطع خارج از طول عضو است.");
    const a=Math.max(0,Math.min(L,s));
    const [qx,qy,qz]=q;
    // Sign convention is aligned with the 2D member-force recovery:
    // section actions are obtained from equilibrium of the left segment.
    return {
      x:a,
      N:-f[0]-qx*a,
      Vy:-f[1]-qy*a,
      Vz:-f[2]-qz*a,
      T:-f[3],
      My:-f[4]+f[2]*a+0.5*qz*a*a,
      Mz:-f[5]+f[1]*a+0.5*qy*a*a
    };
  }
  function stations(member,subdivisions=20){
    const {L,f,q}=validateMember(member);
    const count=Math.max(2,Math.min(200,Math.floor(Number(subdivisions)||20)));
    const xs=Array.from({length:count+1},(_,i)=>L*i/count);
    // Include the zero-shear station, where the corresponding bending moment is extremal.
    if(Math.abs(q[1])>1e-12){const x=-f[1]/q[1];if(x>0&&x<L)xs.push(x);}
    if(Math.abs(q[2])>1e-12){const x=-f[2]/q[2];if(x>0&&x<L)xs.push(x);}
    return [...new Set(xs.map(x=>Number(x.toFixed(12))))].sort((a,b)=>a-b);
  }
  function recoverMember(member,subdivisions){
    const xs=stations(member,subdivisions);
    const samples=xs.map(x=>sectionForcesAt(member,x));
    const extrema={};
    COMPONENTS.forEach(component=>{
      let maxAbs=-1,governing=null;
      samples.forEach(sample=>{
        const demand=Math.abs(sample[component]);
        if(demand>maxAbs){maxAbs=demand;governing=sample;}
      });
      extrema[component]={value:governing[component],absolute:maxAbs,x:governing.x};
    });
    return {id:member.id,sectionKey:member.sectionKey||"unassigned",length:Number(member.length),
      sampleCount:samples.length,samples,extrema,units:{force:"N",moment:"N.m",length:"m"}};
  }
  function extractCase(solverResult,sourceModel,options){
    if(!solverResult||solverResult.success!==true||!Array.isArray(solverResult.members))
      throw new Error("نتیجه موفق حل‌گر سه‌بعدی برای استخراج تقاضا لازم است.");
    if(!sourceModel||!Array.isArray(sourceModel.members))
      throw new Error("مدل مرجع اعضا برای اتصال بارهای گسترده در دسترس نیست.");
    const source=new Map(sourceModel.members.map(m=>[String(m.id),m]));
    const seen=new Set(),members=solverResult.members.map(result=>{
      const id=String(result.id);
      if(seen.has(id))throw new Error("شناسه عضو تکراری در نتیجه حل‌گر: "+id);
      seen.add(id);
      const original=source.get(id);
      if(!original)throw new Error("عضو حل‌گر در مدل مرجع یافت نشد: "+id);
      return recoverMember({...result,sectionKey:original.sectionKey,
        analysisLoad:original.analysisLoad},options?.subdivisions);
    });
    const missing=sourceModel.members.filter(m=>!seen.has(String(m.id))).map(m=>String(m.id));
    if(missing.length)throw new Error("نتیجه حل‌گر برای "+missing.length+" عضو مدل وجود ندارد: "+missing.slice(0,8).join("، "));
    return {success:true,caseId:String(solverResult.loadCase||"single-case"),
      caseLabel:String(solverResult.loadCaseLabel||solverResult.loadCase||"حالت بار"),
      memberCount:members.length,members,units:{force:"N",moment:"N.m",length:"m"},
      note:"نیروهای داخلی با تعادل قطعه چپ عضو و بار گسترده یکنواخت محلی بازیابی شده‌اند. نمونه‌برداری و نقاط صفر برش برای تقاضای خمشی درج شده‌اند؛ این خروجی به‌تنهایی ظرفیت یا قبولی آیین‌نامه‌ای نیست."};
  }
  function envelope(cases,model,options){
    if(!Array.isArray(cases)||!cases.length)throw new Error("حداقل یک نتیجه تحلیل ترکیبات بار لازم است.");
    const recovered=cases.map(item=>extractCase(item,model,options));
    const map=new Map();
    recovered.forEach(result=>result.members.forEach(member=>{
      let row=map.get(member.id);
      if(!row){row={id:member.id,sectionKey:member.sectionKey,components:{}};COMPONENTS.forEach(k=>row.components[k]=null);map.set(member.id,row);}
      COMPONENTS.forEach(k=>{
        const candidate=member.extrema[k],old=row.components[k];
        if(!old||candidate.absolute>old.absolute)row.components[k]={...candidate,combination:result.caseLabel,caseId:result.caseId};
      });
    }));
    return {success:true,caseCount:recovered.length,memberCount:map.size,members:[...map.values()],
      cases:recovered,units:{force:"N",moment:"N.m",length:"m"},
      note:"پوش تقاضا مؤلفه‌به‌مؤلفه و بین ترکیبات بار است؛ مؤلفه‌های حاکم ممکن است از ترکیبات متفاوت باشند و نباید به‌عنوان یک حالت هم‌زمان ترکیب شوند."};
  }
  root.SahroudMemberDemand3D={components:COMPONENTS.slice(),sectionForcesAt,stations,recoverMember,extractCase,envelope};
})(typeof window!=="undefined"?window:globalThis);
