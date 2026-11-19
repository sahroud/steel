/* SAHROUD STEEL — connection joint-demand registry
 * Collects concurrent six-component member-end actions at real model joints.
 * It is a demand-transfer layer only; it never reports connection capacity/pass.
 * Units: N, N.m, m.
 */
(function(root){
  "use strict";
  const COMPONENTS=["N","Vy","Vz","T","My","Mz"];
  const FAMILIES=[
    {id:"basePlate",label:"صفحه‌ستون و انکربولت"},
    {id:"knee",label:"اتصال زانویی ستون به رفتر"},
    {id:"ridge",label:"اتصال تاج رفترها"},
    {id:"splice",label:"وصله ستون و رفتر"},
    {id:"braceGusset",label:"ورق گاست و اتصال مهاربند"},
    {id:"purlinCleat",label:"اتصال پرلین به رفتر"},
    {id:"wallGirt",label:"اتصال قیدهای دیوار"},
    {id:"craneRail",label:"اتصال ریل جرثقیل"},
    {id:"endWall",label:"اتصالات دیوار انتهایی"}
  ];
  function fail(message){throw new Error(message);}
  function classify(node,connected){
    const keys=new Set(connected.map(m=>String(m.sectionKey||"")));
    const kind=String(node.kind||"").toLowerCase();
    const types=[];
    const add=id=>{if(!types.includes(id))types.push(id);};
    if(/base|support|foundation/.test(kind))add("basePlate");
    if(/eave/.test(kind)&&keys.has("column")&&keys.has("rafter"))add("knee");
    if(/ridge|crown|peak/.test(kind)&&keys.has("rafter"))add("ridge");
    if(/splice/.test(kind))add("splice");
    if([...keys].some(k=>/brace|bracing|tie/.test(k)))add("braceGusset");
    if(keys.has("purlin")&&keys.has("rafter"))add("purlinCleat");
    if([...keys].some(k=>/girt|wall/.test(k)))add("wallGirt");
    if([...keys].some(k=>/crane|runway|rail/.test(k)))add("craneRail");
    if(/end.?wall|endwall/.test(kind)||connected.some(m=>m.endFace===true))add("endWall");
    return types;
  }
  function toGlobalJointActions(sectionActions,localAxes,end){
    if(!sectionActions||!localAxes||!["i","j"].includes(end))fail("داده نیرو یا دستگاه محلی عضو برای تبدیل گره‌ای ناقص است.");
    const axes=["x","y","z"].map(name=>{
      const v=localAxes[name];
      if(!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(Number(n))))fail("دستگاه مختصات محلی عضو ناقص است: "+name);
      return v.map(Number);
    });
    const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const norm=v=>Math.hypot(...v);
    if(axes.some(a=>Math.abs(norm(a)-1)>1e-6)||
       Math.abs(dot(axes[0],axes[1]))>1e-6||
       Math.abs(dot(axes[0],axes[2]))>1e-6||
       Math.abs(dot(axes[1],axes[2]))>1e-6||
       cross(axes[0],axes[1]).some((v,i)=>Math.abs(v-axes[2][i])>1e-6))
      fail("محورهای محلی عضو متعامد، یکه و راست‌گرد نیستند؛ تبدیل نیرو متوقف شد.");
    const sign=end==="i"?-1:1;
    const local=COMPONENTS.map(k=>sign*finiteAction(sectionActions[k],k));
    const toGlobal=(v)=>[0,1,2].map(i=>axes[0][i]*v[0]+axes[1][i]*v[1]+axes[2][i]*v[2]);
    const force=toGlobal(local.slice(0,3)),moment=toGlobal(local.slice(3,6));
    return {local:{N:local[0],Vy:local[1],Vz:local[2],T:local[3],My:local[4],Mz:local[5]},
      global:{Fx:force[0],Fy:force[1],Fz:force[2],Mx:moment[0],My:moment[1],Mz:moment[2]},
      convention:"member-on-joint nodal action; i-end sign reversed from left-segment section action, j-end sign retained"};
  }
  function finiteAction(value,label){
    const n=Number(value);
    if(!Number.isFinite(n))fail("مؤلفه "+label+" برای تبدیل دستگاه مختصات متناهی نیست.");
    return n;
  }
  function build(combinationRun,model,demandApi){
    if(!combinationRun||combinationRun.success!==true||
       !Array.isArray(combinationRun.combinationResults)||
       combinationRun.combinationResults.length!==combinationRun.caseCount||
       !combinationRun.caseCount)fail("نتایج کامل همه ترکیبات بار برای انتقال تقاضای اتصال لازم است.");
    if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members)||!model.nodes.length||!model.members.length)
      fail("مدل هندسی سه‌بعدی برای تشکیل گره‌های اتصال موجود نیست.");
    if(!demandApi||typeof demandApi.extractCase!=="function")
      fail("موتور بازیابی نیروهای داخلی اعضا بارگذاری نشده است.");
    if(model.geometryAudit&&model.geometryAudit.complete!==true)
      fail("ممیزی هندسه مدل کامل نیست؛ انتقال نیرو به اتصال متوقف شد.");
    const nodes=new Map(model.nodes.map(n=>[String(n.id),n]));
    if(nodes.size!==model.nodes.length)fail("شناسه گره در مدل تکراری است.");
    const members=new Map(model.members.map(m=>[String(m.id),m]));
    if(members.size!==model.members.length)fail("شناسه عضو در مدل تکراری است.");
    const adjacency=new Map([...nodes.keys()].map(id=>[id,[]]));
    for(const member of members.values()){
      const a=String(member.start),b=String(member.end);
      if(!adjacency.has(a)||!adjacency.has(b))fail("عضو "+member.id+" به گره معتبر متصل نیست.");
      adjacency.get(a).push({member,end:"i"});
      adjacency.get(b).push({member,end:"j"});
    }
    const caseIds=new Set(),caseData=[];
    for(const item of combinationRun.combinationResults){
      if(!item||!item.analysis||item.analysis.success!==true||!item.id||!item.label)
        fail("یکی از تحلیل‌های ترکیب بار ناقص است.");
      if(caseIds.has(String(item.id)))fail("شناسه ترکیب بار تکراری است: "+item.id);
      caseIds.add(String(item.id));
      const recovered=demandApi.extractCase({...item.analysis,loadCase:item.id,loadCaseLabel:item.label},model);
      if(recovered.memberCount!==members.size)fail("تعداد اعضای بازیابی‌شده در ترکیب "+item.label+" با مدل برابر نیست.");
      const raw=new Map(item.analysis.members.map(m=>[String(m.id),m]));
      const actionMap=new Map();
      for(const result of recovered.members){
        const original=members.get(String(result.id)),solver=raw.get(String(result.id));
        if(!original||!solver)fail("نتیجه عضو "+result.id+" با مدل مرجع تطبیق ندارد.");
        const endSample=result.samples.find(s=>Math.abs(s.x-(original.length||result.length))<=1e-8);
        const startSample=result.samples.find(s=>Math.abs(s.x)<=1e-8);
        if(!startSample||!endSample)fail("نیروهای انتهایی عضو "+result.id+" بازیابی نشد.");
        actionMap.set(String(result.id),{
          memberId:String(result.id),sectionKey:String(original.sectionKey||"unassigned"),
          localAxes:solver.localAxes||null,
          start:{...startSample},end:{...endSample},
          units:{force:"N",moment:"N.m",length:"m"}
        });
      }
      caseData.push({id:String(item.id),label:String(item.label),actions:actionMap});
    }
    if(caseIds.size!==combinationRun.caseCount)fail("همه ترکیبات بار در انتقال نیرو حضور ندارند.");
    const joints=[];
    for(const [nodeId,connections] of adjacency){
      if(!connections.length)continue;
      const node=nodes.get(nodeId);
      const connected=connections.map(x=>x.member);
      const families=classify(node,connected);
      if(!families.length)continue;
      const cases=caseData.map(c=>({
        combinationId:c.id,combination:c.label,
        memberActions:connections.map(({member,end})=>{
          const action=c.actions.get(String(member.id));
          const sectionActions=end==="i"?action.start:action.end;
          const transformed=toGlobalJointActions(sectionActions,action.localAxes,end);
          return {memberId:String(member.id),sectionKey:action.sectionKey,end,
            sectionActions,localActions:sectionActions,localAxes:action.localAxes,...transformed};
        })
      }));
      joints.push({nodeId,kind:node.kind||null,coordinatesM:{x:Number(node.x),y:Number(node.y),z:Number(node.z)},
        connectedMemberIds:connected.map(m=>String(m.id)),families,cases,
        caseCount:cases.length,completeConcurrentActions:cases.every(c=>c.memberActions.length===connected.length),
        capacityDesigned:false,executionReady:false});
    }
    const counts={};FAMILIES.forEach(f=>counts[f.id]=joints.filter(j=>j.families.includes(f.id)).length);
    return {success:true,schema:"SAHROUD-CONNECTION-JOINT-DEMAND-1.0",
      source:{method:"3D solver end actions recovered by member equilibrium",combinationCount:caseData.length,
        modelNodeCount:model.nodes.length,modelMemberCount:model.members.length},
      units:{force:"N",moment:"N.m",length:"m"},components:COMPONENTS.slice(),
      families:FAMILIES.map(f=>({...f,jointCount:counts[f.id],capacityDesigned:false,executionReady:false})),
      joints,capacityDesigned:false,executionReady:false,
      limitations:[
        "این رجیستری فقط تقاضای هم‌زمان انتهای اعضا را از نتایج حل‌گر منتقل می‌کند؛ ظرفیت اتصال را محاسبه نمی‌کند.",
        "کنش گره‌ای هر عضو با قرارداد عضو-بر-گره و تبدیل دستگاه محلی به جهانی گزارش می‌شود؛ جمع نهایی گره بدون افزودن بار گره‌ای، واکنش تکیه‌گاهی و کنترل تعادل انجام نمی‌شود.",
        "اتصالاتی که عضو یا گره آن‌ها در مدل سه‌بعدی وجود ندارد، از جمله ریل جرثقیل مدل‌نشده، تقاضای قابل طراحی تولید نمی‌کنند.",
        "تا تکمیل بارگذاری زلزله، جرثقیل، خستگی و تحلیل‌های لازم، این بسته برای تأیید اجرایی کافی نیست."
      ]};
  }
  root.SahroudConnectionDemandRegistry={components:COMPONENTS.slice(),families:FAMILIES.map(x=>({...x})),classify,toGlobalJointActions,build};
  if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudConnectionDemandRegistry;
})(typeof window!=="undefined"?window:globalThis);
