/* ===== steel2/js/crane-3d-integration.js ===== */
/* SAHROUD STEEL — actual 3D crane runway girder and bracket member integration.
 * Only explicit, documented section properties and end releases are accepted.
 */
(function(root){
"use strict";
const required=["E_Pa","G_Pa","A_m2","Iy_m4","Iz_m4","J_m4"];
function validSection(s,label,issues){
 if(!s||typeof s!=="object"){issues.push("خواص مقطع "+label+" ثبت نشده است.");return false;}
 let ok=true;required.forEach(k=>{if(!(Number.isFinite(Number(s[k]))&&Number(s[k])>0)){issues.push(label+": "+k+" باید مثبت و بر حسب SI باشد.");ok=false;}});
 if(!String(s.source||"").trim()){issues.push("مرجع مقطع "+label+" الزامی است.");ok=false;}
 return ok;
}
function releases(v,label,issues){
 if(!v||typeof v!=="object"){issues.push("آزادسازی انتهایی "+label+" باید صریحاً تعیین شود (آرایه i و j).");return null;}
 const out={i:Array.isArray(v.i)?v.i.map(Number):null,j:Array.isArray(v.j)?v.j.map(Number):null};
 if(!out.i||!out.j){issues.push("آزادسازی "+label+" باید شامل i و j باشد.");return null;}
 for(const end of ["i","j"])if(out[end].some(d=>![4,5].includes(d))||new Set(out[end]).size!==out[end].length){issues.push("آزادسازی "+label+" فقط درجات آزادی خمشی محلی 4 و 5 را می‌پذیرد.");return null;}
 return out;
}
function prepare(model,input){
 const p=model?.geometry?.craneRunway?.meshProposal||root.SteelCrane3DMeshProposal?.audit(model);
 const issues=[],d=input||{};
 if(!p?.geometryReady)issues.push("ممیزی هندسه دقیق گره‌های ستون و قاب‌ها موفق نیست.");
 const girderOk=validSection(d.girderSection,"تیر حمال",issues),bracketOk=validSection(d.bracketSection,"براکت",issues);
 const girderRelease=releases(d.girderEndReleases,"تیر حمال",issues),bracketRelease=releases(d.bracketEndReleases,"براکت",issues);
 if(!["simple","moment"].includes(d.connectionType))issues.push("نوع اتصال باید ساده یا گیردار و مطابق جزئیات نقشه انتخاب شود؛ اتصال فنری هنوز پیاده‌سازی نشده است.");
 if(!String(d.connectionSource||"").trim())issues.push("مرجع نقشه اتصال براکت به ستون و تیر حمال الزامی است.");
 if(!String(d.geometrySource||"").trim())issues.push("مرجع هندسه تیر حمال و محل براکت الزامی است.");
 if(!p||!Array.isArray(p.beamNodes)||!Array.isArray(p.beamMembers)||!Array.isArray(p.brackets))issues.push("توپولوژی پیشنهادی سه‌بعدی در دسترس نیست.");
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,issues,model:null};
 const nodes=model.nodes.map(n=>({...n})),members=model.members.map(m=>({...m}));
 const nodeIds=new Set(nodes.map(n=>String(n.id))),memberIds=new Set(members.map(m=>String(m.id)));
 if(nodeIds.size!==nodes.length)issues.push("شناسه گره تکراری در مدل پایه وجود دارد.");
 if(memberIds.size!==members.length)issues.push("شناسه عضو تکراری در مدل پایه وجود دارد.");
 const proposalNodeIds=new Set(),proposalMemberIds=new Set();
 p.beamNodes.forEach(n=>{
  const id=String(n?.id||"");
  if(!id||nodeIds.has(id)||proposalNodeIds.has(id))issues.push("شناسه گره پیشنهادی تیر حمال خالی یا تکراری است: "+id);
  proposalNodeIds.add(id);
  if(![n.x,n.y,n.z].every(v=>Number.isFinite(Number(v))))issues.push("مختصات گره پیشنهادی "+id+" معتبر نیست.");
 });
 p.beamMembers.forEach(m=>{
  const id=String(m?.id||"");
  if(!id||memberIds.has(id)||proposalMemberIds.has(id))issues.push("شناسه عضو پیشنهادی تیر حمال خالی یا تکراری است: "+id);
  proposalMemberIds.add(id);
  if(!proposalNodeIds.has(String(m.start))||!proposalNodeIds.has(String(m.end))||String(m.start)===String(m.end))issues.push("دو سر عضو تیر حمال "+id+" به گره‌های پیشنهادی معتبر ارجاع نمی‌دهد.");
  if(m.continuity!=="separate_span_segment_between_adjacent_frames")issues.push("قطعه "+id+" باید دهانه مستقل بین دو قاب مجاور باشد.");
 });
 p.brackets.forEach(b=>{
  const id=String(b?.id||"");
  if(!id||memberIds.has(id)||proposalMemberIds.has(id))issues.push("شناسه براکت خالی یا تکراری است: "+id);
  proposalMemberIds.add(id);
  if(!nodeIds.has(String(b.columnNodeId))||!proposalNodeIds.has(String(b.beamNodeId)))issues.push("براکت "+id+" باید گره واقعی ستون را به گره پیشنهادی تیر حمال متصل کند.");
 });
 if(issues.length)return {success:false,ready:false,analysisEnabled:false,issues,model:null};
 p.beamNodes.forEach(n=>nodes.push({...n,kind:"crane-runway-girder",proposalOnly:false}));
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 const add=(id,start,end,type,section,rel,extra)=>{
  const a=nodeMap.get(String(start)),b=nodeMap.get(String(end));
  if(!a||!b)throw Error("گره ابتدا یا انتهای عضو جرثقیل یافت نشد: "+id);
  members.push({id,start,end,type,sectionKey:type,analysisSection:{...section},lineLoads:{dead:0,live:0,snow:0,wind:0,windLeft:0,windRight:0,windEnd:0,unit:"kN/m",loadRole:"crane-nodal-actions-and-member-self-weight"},endReleases:{i:rel.i.slice(),j:rel.j.slice()},analysisLoad:{uniformLocal:[0,0,0],source:"explicit-zero-until-crane-load-path-approved"},craneIntegration:true,reference:extra.reference,connectionType:extra.connectionType,frameIndex:extra.frameIndex,side:extra.side,continuity:extra.continuity||null,length:Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)});
 };
 p.beamMembers.forEach(m=>add(m.id,m.start,m.end,"craneRunwayGirder",d.girderSection,girderRelease,{reference:d.geometrySource,connectionType:"girder-segment",frameIndex:null,side:m.side,continuity:m.continuity}));
 p.brackets.forEach(b=>add(b.id,b.columnNodeId,b.beamNodeId,"craneRunwayBracket",d.bracketSection,bracketRelease,{reference:d.connectionSource,connectionType:d.connectionType,frameIndex:b.frameIndex,side:b.side}));
 const integrationCounts={addedNodeCount:p.beamNodes.length,addedGirderMemberCount:p.beamMembers.length,addedBracketMemberCount:p.brackets.length};
 const out={...model,nodes,members,geometry:{...model.geometry,craneRunway:{...model.geometry.craneRunway,meshProposal:p,integrated3D:{ready:true,analysisEnabled:false,proposalOnly:false,...integrationCounts,connectionType:d.connectionType,geometrySource:d.geometrySource,connectionSource:d.connectionSource},integrationAudit:{success:true,ready:true,analysisEnabled:false,issues:[],counts:{addedNodes:p.beamNodes.length,addedGirderMembers:p.beamMembers.length,addedBracketMembers:p.brackets.length}}}}};
 return {success:true,ready:true,analysisEnabled:false,issues:[],model:out,counts:{addedNodes:p.beamNodes.length,addedGirderMembers:p.beamMembers.length,addedBracketMembers:p.brackets.length}};
}
function readUI(){
 const el=root.document?.getElementById?.("crane3DIntegrationJson");
 if(!el||!String(el.value||"").trim())return {};
 try{return JSON.parse(el.value);}catch(e){return {parseError:String(e.message||e)};}
}
function setData(data){const el=root.document?.getElementById?.("crane3DIntegrationJson");if(el&&data&&typeof data==="object")el.value=JSON.stringify(data,null,2);}

function audit(model,input){const d=input||readUI();if(d.parseError)return {success:false,ready:false,analysisEnabled:false,issues:["JSON مشخصات تحلیل سه‌بعدی جرثقیل قابل خواندن نیست: "+d.parseError]};const r=prepare(model,d);return {...r,model:undefined};}
function integrate(model,input){const r=prepare(model,input||readUI());const host=root.document?.getElementById?.("crane3DIntegrationAudit");if(host){host.textContent=r.success?"اعضای واقعی تیر حمال و براکت به کپی مدل سه‌بعدی افزوده شدند؛ تعداد گره: "+r.counts.addedNodes+"، تیر حمال: "+r.counts.addedGirderMembers+"، براکت: "+r.counts.addedBracketMembers+". تحلیل/تأیید طراحی همچنان غیرفعال است.":("یکپارچه‌سازی انجام نشد: "+(r.issues||[]).join(" | "));}return r;}
function selfTest(){
 const checks=[],t=(n,f)=>{try{checks.push({name:n,ok:!!f()});}catch(e){checks.push({name:n,ok:false,error:String(e.message||e)});}};
 const base={geometry:{span:12,frames:[0,6,12],craneRunway:{enabled:true,elevationM:5,axisOffsetM:.5}},nodes:[{id:"C1",x:0,y:5,z:0},{id:"C2",x:0,y:5,z:6},{id:"C3",x:0,y:5,z:12},{id:"R1",x:12,y:5,z:0},{id:"R2",x:12,y:5,z:6},{id:"R3",x:12,y:5,z:12}],members:[]};
 const p={geometryReady:true,beamNodes:[{id:"B1",x:-.5,y:5,z:0},{id:"B2",x:-.5,y:5,z:6},{id:"B3",x:-.5,y:5,z:12},{id:"B4",x:12.5,y:5,z:0},{id:"B5",x:12.5,y:5,z:6},{id:"B6",x:12.5,y:5,z:12}],beamMembers:[{id:"G1",start:"B1",end:"B2",side:"left",continuity:"separate_span_segment_between_adjacent_frames"},{id:"G2",start:"B2",end:"B3",side:"left",continuity:"separate_span_segment_between_adjacent_frames"},{id:"G3",start:"B4",end:"B5",side:"right",continuity:"separate_span_segment_between_adjacent_frames"},{id:"G4",start:"B5",end:"B6",side:"right",continuity:"separate_span_segment_between_adjacent_frames"}],brackets:[{id:"K1",columnNodeId:"C1",beamNodeId:"B1",frameIndex:1,side:"left"},{id:"K2",columnNodeId:"C2",beamNodeId:"B2",frameIndex:2,side:"left"},{id:"K3",columnNodeId:"C3",beamNodeId:"B3",frameIndex:3,side:"left"},{id:"K4",columnNodeId:"R1",beamNodeId:"B4",frameIndex:1,side:"right"},{id:"K5",columnNodeId:"R2",beamNodeId:"B5",frameIndex:2,side:"right"},{id:"K6",columnNodeId:"R3",beamNodeId:"B6",frameIndex:3,side:"right"}]};
 base.geometry.craneRunway.meshProposal=p;
 const sec={E_Pa:2e11,G_Pa:7.7e10,A_m2:.01,Iy_m4:1e-4,Iz_m4:2e-4,J_m4:1e-5,source:"drawing-01"};
 const input={girderSection:sec,bracketSection:sec,girderEndReleases:{i:[],j:[]},bracketEndReleases:{i:[],j:[]},connectionType:"moment",connectionSource:"D-02",geometrySource:"D-01"};
 const beforeN=base.nodes.length,beforeM=base.members.length,r=prepare(base,input);
 t("builds actual 3D beam and bracket elements",()=>r.success&&r.model.nodes.length===beforeN+6&&r.model.members.length===10);
 t("beam members and brackets have direct SI section data",()=>r.model.members.filter(m=>m.craneIntegration).length===10&&r.model.members.filter(m=>m.craneIntegration).every(m=>m.analysisSection.E_Pa===2e11));
 t("keeps original source model immutable",()=>base.nodes.length===beforeN&&base.members.length===beforeM);
 t("retains per-end release configuration",()=>r.model.members.filter(m=>m.craneIntegration).every(m=>Array.isArray(m.endReleases.i)&&Array.isArray(m.endReleases.j)));
 t("declares explicit zero local loads until crane actions are approved",()=>r.model.members.filter(m=>m.craneIntegration).every(m=>Array.isArray(m.analysisLoad?.uniformLocal)&&m.analysisLoad.uniformLocal.length===3&&m.analysisLoad.uniformLocal.every(v=>v===0)));
 t("stores successful integration audit in returned model",()=>r.model.geometry.craneRunway.integrationAudit?.success===true&&r.model.geometry.craneRunway.integrationAudit.analysisEnabled===false);
 t("rejects beam member with missing or nonadjacent span continuity",()=>{const bad=JSON.parse(JSON.stringify(base));bad.geometry.craneRunway.meshProposal.beamMembers[0].continuity="continuous";return !prepare(bad,input).success;});
 t("rejects bracket connected to a nonexistent column node",()=>{const bad=JSON.parse(JSON.stringify(base));bad.geometry.craneRunway.meshProposal.brackets[0].columnNodeId="MISSING";return !prepare(bad,input).success;});
 t("rejects duplicate proposed member IDs",()=>{const bad=JSON.parse(JSON.stringify(base));bad.geometry.craneRunway.meshProposal.beamMembers[1].id="G1";return !prepare(bad,input).success;});
 t("rejects missing bracket section properties",()=>!prepare(base,{...input,bracketSection:{}}).success);
 t("rejects missing connection drawing reference",()=>!prepare(base,{...input,connectionSource:""}).success);
 t("rejects unselected connection type",()=>!prepare(base,{...input,connectionType:"spring"}).success);
 t("does not approve design or analysis",()=>r.analysisEnabled===false&&r.model.geometry.craneRunway.integrated3D.analysisEnabled===false);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelCrane3DIntegration={prepare,integrate,audit,readUI,setData,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/crane-3d-load-transfer.js ===== */
/* SAHROUD STEEL — synchronized crane load transfer to the actual 3D frame FEM.
 * Builds per-case global nodal loads; never combines non-concurrent envelope maxima.
 */
(function(root){
"use strict";
const EPS=1e-7;
const vec=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const add=(map,id,values,meta)=>{
 let r=map.get(String(id));if(!r){r={nodeId:String(id),values:[0,0,0,0,0,0],sources:[]};map.set(String(id),r);}
 values.forEach((v,i)=>r.values[i]+=Number(v)||0);if(meta)r.sources.push(meta);
};
function offset(value,label,issues){
 if(!Array.isArray(value)||value.length!==3||value.some(v=>!Number.isFinite(Number(v)))){issues.push("بردار خروج از مرکزیت "+label+" باید سه مؤلفه عددی بر حسب متر داشته باشد؛ بدون آن انتقال لنگر بار تأیید نمی‌شود.");return null;}
 return value.map(Number);
}
function nodeFor(model,side,z){
 const members=model.members.filter(m=>m.craneIntegration===true&&m.sectionKey==="craneRunwayGirder"&&m.side===side);
 const ids=[...new Set(members.flatMap(m=>[m.start,m.end]))];
 const matches=model.nodes.filter(n=>ids.includes(n.id)&&Math.abs(Number(n.z)-z)<=EPS);
 return matches.length===1?matches[0]:null;
}
function memberAt(model,side,z){
 const rows=model.members.filter(m=>m.craneIntegration===true&&m.sectionKey==="craneRunwayGirder"&&m.side===side).map(m=>({m,a:model.nodes.find(n=>n.id===m.start),b:model.nodes.find(n=>n.id===m.end)})).filter(x=>x.a&&x.b&&z>=Math.min(x.a.z,x.b.z)-EPS&&z<=Math.max(x.a.z,x.b.z)+EPS);
 return rows.length===1?rows[0]:null;
}
function matVec(A,v){return A.map(row=>row.reduce((s,x,i)=>s+x*v[i],0));}
function transpose(A){return A[0].map((_,j)=>A.map(r=>r[j]));}
function mul(A,B){return A.map(row=>B[0].map((_,j)=>row.reduce((s,x,k)=>s+x*B[k][j],0)));}
function pointEquivalentLocal(F,M,L,x){
 const r=x/L,t=r*r,u=t*r;
 const n1=1-3*t+2*u,n2=L*(r-2*t+u),n3=3*t-2*u,n4=L*(-t+u);
 const d1=(-6*r+6*t)/L,d2=1-4*r+3*t,d3=(6*r-6*t)/L,d4=-2*r+3*t;
 const f=Array(12).fill(0);
 // Local axial force: linear interpolation.
 f[0]+=(1-r)*F[0];f[6]+=r*F[0];
 // Local y bending: v and rotation about local z.
 f[1]+=n1*F[1]+d1*M[2];f[5]+=n2*F[1]+d2*M[2];
 f[7]+=n3*F[1]+d3*M[2];f[11]+=n4*F[1]+d4*M[2];
 // Local z bending uses theta_y = -dw/dx convention of the 3D stiffness matrix.
 f[2]+=n1*F[2]-d1*M[1];f[4]+=-n2*F[2]+d2*M[1];
 f[8]+=n3*F[2]-d3*M[1];f[10]+=-n4*F[2]+d4*M[1];
 // Saint-Venant torsion.
 f[3]+=(1-r)*M[0];f[9]+=r*M[0];
 return f;
}
function addPointOnGirder(model,memberRow,z,forceGlobal,offsetGlobal,nodal,source,issues){
 const {m,a,b}=memberRow,L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
 if(!(L>0)){issues.push("طول عضو تیر حمال "+m.id+" نامعتبر است.");return false;}
 const tr=root.SteelFrame3D?.makeTransform?.([a.x,a.y,a.z],[b.x,b.y,b.z]);
 if(!tr){issues.push("تبدیل محور محلی عضو تیر حمال در دسترس نیست.");return false;}
 const r=Math.max(0,Math.min(1,(z-a.z)/(b.z-a.z)));
 const applicationMoment=cross(offsetGlobal,forceGlobal);
 const axes=[tr.axes.x,tr.axes.y,tr.axes.z];
 const Fl=axes.map(axis=>dot(axis,forceGlobal)),Ml=axes.map(axis=>dot(axis,applicationMoment));
 const local=pointEquivalentLocal(Fl,Ml,L,r*L);
 const global=matVec(transpose(tr.T),local);
 add(nodal,m.start,global.slice(0,6),{...source,memberId:m.id,position_m:z,shape:"consistent-point-load"});
 add(nodal,m.end,global.slice(6,12),{...source,memberId:m.id,position_m:z,shape:"consistent-point-load"});
 return true;
}
let lastAnalysis=null;
function auditSourceProvenance(sourceDocuments,horizontalInput){
 const required=["document","revision","locator","authority"],rows=[],issues=[];
 const addRow=(name,value)=>{
  const record=value&&typeof value==="object"&&!Array.isArray(value)?value:{document:value};
  const missing=required.filter(k=>!String(record?.[k]??"").trim());
  rows.push({name,missing,complete:missing.length===0});
  if(missing.length)issues.push(name+" فاقد "+missing.join("، "));
 };
 const d=sourceDocuments||{};
 addRow("منبع هندسه ریل",d.geometrySource);
 addRow("منبع سختی تکیه‌گاه",d.supportStiffnessSource);
 addRow("منبع مسیر/فاصله چرخ",d.wheelTrackSource);
 if(!Array.isArray(d.wheelSources)||!d.wheelSources.length)issues.push("منابع اختصاصی چرخ‌ها ثبت نشده‌اند.");
 (Array.isArray(d.wheelSources)?d.wheelSources:[]).forEach((w,i)=>addRow("منبع چرخ "+(i+1)+" ("+(w?.side||"بدون سمت")+")",w));
 if(horizontalInput?.enabled)addRow("منبع بار افقی جرثقیل",horizontalInput);
 return {complete:issues.length===0,requiredFields:required,sourceCount:rows.length,completeCount:rows.filter(x=>x.complete).length,incompleteCount:rows.filter(x=>!x.complete).length,rows,issues,designApproved:false,scope:"فقط کامل‌بودن شناسنامه منبع را بررسی می‌کند؛ صحت مقدار بار، تفسیر بند آیین‌نامه یا تأیید طراحی را اثبات نمی‌کند."};
}
function prepareCase(model,transferResult,caseIndex,horizontalInput,trainInput,config){
 const issues=[],d=config||{},c=transferResult?.cases?.[caseIndex];
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))issues.push("مدل سه‌بعدی معتبر نیست.");
 if(!transferResult?.success||!c)issues.push("حالت هم‌زمان معتبر از تحلیل دو ریل انتخاب نشده است.");
 if(!root.SteelFrame3D?.makeTransform)issues.push("تبدیل مختصات حل‌گر سه‌بعدی بارگذاری نشده است.");
 const verticalOffset=offset(d.verticalReactionOffset_m,"واکنش قائم ریل",issues);
 const nodal=new Map();
 if(c&&model){
  for(const side of ["left","right"]){
   const loads=c.girderPointLoads?.[side]||[];
   for(const load of loads){
    const P=Number(load.P_N),z=Number(load.x_m);
    if(!Number.isFinite(P)||!Number.isFinite(z)){issues.push("بار واکنش قائم ریل "+side+" مقدار یا مختصات نامعتبر دارد.");continue;}
    if(Math.abs(P)<=1e-9)continue;
    const n=nodeFor(model,side,z);
    if(!n){issues.push("واکنش قائم ریل "+side+" در z="+z+" با گره تیر حمال تطبیق یکتا ندارد؛ گره نزدیک جایگزین نمی‌شود.");continue;}
    if(verticalOffset){
     const F=[0,P,0],M=cross(verticalOffset,F);
     add(nodal,n.id,[...F,...M],{kind:"rail-support-vertical-reaction",side,station:load.station,source:load.source,casePosition_m:c.referencePosition_m,sourceDocuments:c.sourceDocuments||null});
    }
   }
  }
 }
 let horizontalAudit=null;
 if(horizontalInput?.enabled){
  horizontalAudit=root.SteelCraneLoadPathAudit?.horizontalLedger?.(horizontalInput,trainInput||root.SteelCraneTrainAnalysis?.getData?.());
  if(!horizontalAudit?.ready)issues.push(...(horizontalAudit?.issues||["ممیزی بارهای افقی جرثقیل ناموفق است."]));
  const sideMode=d.horizontalApplicationSides;
  if(!["left","right","both"].includes(sideMode))issues.push("محل اعمال بار افقی باید صریحاً left، right یا both انتخاب شود.");
  const hOffset=offset(d.horizontalWheelOffset_m,"بار افقی چرخ",issues);
  if(horizontalAudit?.ready&&hOffset&&["left","right","both"].includes(sideMode)){
   const length=Number(model.geometry?.length);
   if(!(Number.isFinite(length)&&length>0))issues.push("طول مؤثر مسیر ریل در مدل سه‌بعدی معتبر نیست؛ مختصات چرخ قابل ممیزی نیست.");
   horizontalAudit.loads.forEach(w=>{
    const z=Number(c.referencePosition_m)+Number(w.x_m);
    if(!(Number.isFinite(z)&&Number.isFinite(length)&&length>0)){issues.push("مختصات طولی چرخ "+w.wheelIndex+" یا طول مسیر ریل نامعتبر است.");return;}
    if(z< -EPS||z>length+EPS){issues.push("چرخ "+w.wheelIndex+" در موقعیت z="+z.toFixed(4)+" m خارج از طول واقعی تیر حمال [0، "+length+" m] قرار گرفته است؛ حذف خاموش این بار مجاز نیست و حالت تحلیل متوقف شد.");return;}
    const sides=sideMode==="both"?["left","right"]:[sideMode];
    sides.forEach(side=>{
     const pointSource={kind:"crane-wheel-horizontal",side,wheelIndex:w.wheelIndex,casePosition_m:c.referencePosition_m,source:w.source,document:w.document};
     const exactNode=nodeFor(model,side,z);
     if(exactNode){const M=cross(hOffset,w.globalForce_N);add(nodal,exactNode.id,[...w.globalForce_N,...M],pointSource);return;}
     const row=memberAt(model,side,z);
     if(!row){issues.push("بار افقی چرخ "+w.wheelIndex+" در موقعیت z="+z+" روی عضو تیر حمال "+side+" قرار نگرفت.");return;}
     addPointOnGirder(model,row,z,w.globalForce_N,hOffset,nodal,pointSource,issues);
    });
   });
  }
 }
 const sourceDocs=c?.sourceDocuments;
 const sourceProvenanceAudit=auditSourceProvenance(sourceDocs,horizontalInput);
 if(c&&(!sourceDocs?.geometrySource||!sourceDocs?.supportStiffnessSource||!sourceDocs?.wheelTrackSource||!Array.isArray(sourceDocs?.wheelSources)||sourceDocs.wheelSources.some(w=>!w.source||!w.document)))issues.push("زنجیره اسناد پایه هندسه، سختی تکیه‌گاه و بار چرخ برای این حالت کامل نیست.");
 const loads=[...nodal.values()].map(x=>({nodeId:x.nodeId,values:x.values,sources:x.sources}));
 const ok=issues.length===0&&loads.length>0;
 return {success:ok,ready:ok,solverInputReady:ok,analysisEnabled:false,caseIndex,referencePosition_m:c?.referencePosition_m??null,nodalLoads:loads,loadCount:loads.length,sourceDocuments:sourceDocs||null,sourceProvenanceAudit,readyForCodeDesign:sourceProvenanceAudit.complete===true,horizontalAudit,issues,modelFingerprint:model?{nodeCount:model.nodes.length,memberCount:model.members.length}:null,note:"بارهای قائم واکنش ریل روی گره‌های دقیق تیر حمال اعمال می‌شوند؛ نیروهای افقی در محل واقعی چرخ با بارهای گره‌ای معادل سازگار تیر توزیع می‌شوند. خروج از مرکزیت باید از نقشه وارد شود. هنوز کنترل مقاومت/اتصال و تأیید طراحی انجام نشده است."};
}
function prepareAll(model,transferResult,horizontalInput,trainInput,config){
 if(!transferResult?.success)return {success:false,analysisEnabled:false,issues:["نتیجه تحلیل هم‌زمان دو ریل در دسترس نیست."]};
 const cases=transferResult.cases.map((_,i)=>prepareCase(model,transferResult,i,horizontalInput,trainInput,config));
 return {success:cases.every(x=>x.success),analysisEnabled:false,readyForCodeDesign:false,sourceProvenanceComplete:cases.every(x=>x.sourceProvenanceAudit?.complete===true),sourceProvenanceIncompleteCount:cases.filter(x=>x.sourceProvenanceAudit?.complete!==true).length,total:cases.length,readyCount:cases.filter(x=>x.success).length,blockedCount:cases.filter(x=>!x.success).length,cases,issues:cases.flatMap(x=>x.issues).slice(0,50)};
}
function auditCraneType(config){
 const d=config||{};
 if(!d.craneType)return {valid:true,legacyUnspecified:true,issues:[]};
 if(!root.SteelCraneLoadPath?.classify)return {valid:false,issues:["ماژول تشخیص مسیر جرثقیل بارگذاری نشده است."]};
 const r=root.SteelCraneLoadPath.classify({craneType:d.craneType,supportSystem:d.supportSystem||"runway_girder"});
 if(!r.valid)return {valid:false,issues:r.issues};
 if(r.craneType!=="overhead")return {valid:false,issues:["این انتقال FEM فقط برای جرثقیل سقفی و تیر حمال طراحی شده است؛ بار جرثقیل زمینی نباید به مدل تیر حمال سقفی تزریق شود."]};
 return {valid:true,loadTarget:r.loadTarget,loadPath:r.loadPath,issues:[]};
}
async function analyzeCase(caseIndex,transferResult,horizontalInput,trainInput,config){
 const routeAudit=auditCraneType(config);
 if(!routeAudit.valid)return {success:false,analysisEnabled:false,issues:routeAudit.issues,routeAudit};
 const model=root.SteelStructuralModel?.model;
 const p=prepareCase(model,transferResult,caseIndex,horizontalInput,trainInput,config);
 if(!p.success)return {success:false,analysisEnabled:false,transfer:p};
 const chain=root.SteelStructuralLoadChain;
 if(!chain||typeof chain.auditEquilibrium!=="function"||typeof chain.buildExternalLoadLedger!=="function"||typeof chain.compareExternalLedger!=="function")
  return {success:false,analysisEnabled:false,transfer:p,issues:["ممیزی مستقل دفتر بار خارجی و تعادل حل‌گر بارگذاری نشده است؛ تحلیل جرثقیل تا دسترسی به این کنترل‌ها متوقف شد."]};
 const result=await root.SteelStructuralModel.analyze3D({label:"بار مرده + جرثقیل ـ حالت هم‌زمان "+(caseIndex+1),factors:{dead:1,live:0,snow:0,wind:0},nodalLoads:p.nodalLoads,craneLoadCaseId:caseIndex,craneLoadTransfer:{referencePosition_m:p.referencePosition_m,sourceDocuments:p.sourceDocuments}});
 const equilibriumAudit=chain.auditEquilibrium(result?.equilibrium);
 if(!equilibriumAudit?.ok)return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,issues:["ممیزی مستقل تعادل حالت جرثقیل ناموفق است: "+(equilibriumAudit?.issues||[]).join("؛ ")]};
 const externalLoadLedger=chain.buildExternalLoadLedger(model,result?.members,p.nodalLoads,result?.equivalentReleasedRotationLoads||[]);
 const externalLoadLedgerComparison=chain.compareExternalLedger(externalLoadLedger,result?.equilibrium);
 if(!externalLoadLedgerComparison?.ok)return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,issues:["دفتر مستقل بار خارجی با برآیند بار اعمال‌شده حل‌گر تطبیق ندارد: "+(externalLoadLedgerComparison?.issues||[]).join("؛ ")]};
 if(typeof chain.extractSupportReactions!=="function")return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,issues:["استخراج مستقل واکنش گره‌های پایه در دفتر زنجیره بار موجود نیست؛ خروجی فونداسیون ساخته نمی‌شود."]};
 let supportReactionActions;
 try{supportReactionActions=chain.extractSupportReactions(result,model);}catch(e){return {success:false,analysisEnabled:false,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,issues:["استخراج واکنش پایه/نیروی ستون ناموفق است: "+String(e.message||e)]};}
 lastAnalysis={success:true,analysisEnabled:false,caseIndex,transfer:p,result,equilibriumAudit,externalLoadLedger,externalLoadLedgerComparison,supportReactionActions,loadPathAudit:{ok:true,method:"independent external-load resultant, solver equilibrium recheck and explicit base support reaction extraction",designApproved:false}};
 return lastAnalysis;
}
let lastAutomaticEnvelope=null;
function applyVerticalImpact(input,factor){
 const f=Number(factor);
 if(!(Number.isFinite(f)&&f>0))throw Error("ضریب اثر دینامیکی قائم جرثقیل باید مثبت و مستند باشد.");
 const out={...input};
 for(const side of ["left","right"]){
  if(!Array.isArray(out[side+"Wheels"]))throw Error("قطار چرخ "+side+" تعریف نشده است.");
  out[side+"Wheels"]=out[side+"Wheels"].map((w)=>({...w,P_N:Number(w.P_N)*f,
   source:String(w.source||"")+"؛ ضریب دینامیکی قائم ×"+f,
   dynamicFactorApplied:f,staticInputP_N:Number(w.P_N)}));
 }
 return out;
}
function buildCraneSupportReactionEnvelope(model,results){
 const issues=[],supports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
 if(!supports.length)issues.push("گره پایه برای استخراج واکنش‌های فونداسیون جرثقیل وجود ندارد.");
 if(!Array.isArray(results)||!results.length)issues.push("نتایج موقعیت‌های جرثقیل برای استخراج واکنش پایه موجود نیست.");
 const expected=new Set(supports.map(n=>String(n.id))),byNode=new Map();
 (results||[]).forEach((sample,index)=>{
  const rows=sample?.analysis?.supportReactionActions?.rows;
  if(!Array.isArray(rows)){issues.push("واکنش‌های پایه در موقعیت "+(index+1)+" موجود نیست.");return;}
  const seen=new Set();
  rows.forEach(row=>{
   const id=String(row?.nodeId??"");
   if(!expected.has(id)){issues.push("واکنش گره غیرپایه یا ناشناخته در موقعیت "+(index+1)+": "+id);return;}
   if(seen.has(id)){issues.push("واکنش تکراری گره پایه "+id+" در موقعیت "+(index+1));return;}
   seen.add(id);
   const action=row.columnAction,solver=row.solverReaction;
   const keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!action||!solver||keys.some(k=>!Number.isFinite(action[k])||!Number.isFinite(solver[k]))){issues.push("شش مؤلفه واکنش/نیروی ستون در گره "+id+" و موقعیت "+(index+1)+" معتبر نیست.");return;}
   if(!byNode.has(id))byNode.set(id,[]);
   byNode.get(id).push({caseIndex:sample.caseIndex??index,referencePosition_m:sample.referencePosition_m,solverReaction:{...solver},columnAction:{...action}});
  });
  const missing=[...expected].filter(id=>!seen.has(id));
  if(missing.length)issues.push("واکنش گره‌های پایه در موقعیت "+(index+1)+" ناقص است: "+missing.join("، "));
 });
 const rows=[...byNode.entries()].map(([nodeId,cases])=>({nodeId,caseCount:cases.length,cases,components:Object.fromEntries(["Fx","Fy","Fz","Mx","My","Mz"].map(k=>[k,{min:cases.reduce((a,b)=>b.columnAction[k]<a.columnAction[k]?b:a,cases[0])?.columnAction[k]??null,max:cases.reduce((a,b)=>b.columnAction[k]>a.columnAction[k]?b:a,cases[0])?.columnAction[k]??null}]))}));
 return{success:issues.length===0,rows,caseCount:results?.length||0,supportNodeCount:supports.length,issues,units:{force:"N",moment:"N.m"},scope:"واکنش کل پایه و نیروی متناظر ستون برای هر موقعیت جرثقیل شامل وزن مرده و بارهای فعال همان حالت؛ فقط تقاضا، نه طراحی صفحه‌ستون/مهار/پی."};
}
function auditMainFrameMemberCoverage(model,samples,rows){
 const issues=[],members=Array.isArray(model?.members)?model.members:[];
 const byId=new Map((rows||[]).map(r=>[String(r.id),r]));
 const families=[{key:"column",label:"ستون قاب اصلی"},{key:"rafter",label:"رفتر قاب اصلی"}];
 const summary={};
 families.forEach(f=>{
  const expected=members.filter(m=>m.sectionKey===f.key);
  const missing=expected.filter(m=>{
   const row=byId.get(String(m.id));
   return !row||Number(row.caseCount)!==samples.length||!Array.isArray(row.simultaneousCases)||row.simultaneousCases.length!==samples.length;
  });
  const valid=expected.length-missing.length;
  summary[f.key]={label:f.label,memberCount:expected.length,coveredCount:valid,missingMemberIds:missing.map(m=>String(m.id))};
  if(!expected.length)issues.push("هیچ عضو "+f.label+" در مدل اصلی برای ردیابی اثر جرثقیل وجود ندارد.");
  if(missing.length)issues.push("پوش نیروی "+f.label+" در همه موقعیت‌های جرثقیل کامل نیست: "+missing.slice(0,10).map(m=>String(m.id)).join("، "));
 });
 return {success:issues.length===0,caseCount:samples.length,families:summary,issues,scope:"پوش نیروهای انتهایی اعضای ستون و رفتر قاب اصلی در هر موقعیت جرثقیل؛ مقادیر محلی اعضا هستند و برآیند گره‌ای/طراحی اتصال محسوب نمی‌شوند."};
}
function buildMovingForceEnvelope(model,results){
 const api=root.SteelMemberForceEnvelope;
 if(!api?.buildRows||!api?.auditCoverage)throw Error("ماژول پوش نیروهای اعضا در دسترس نیست.");
 if(!Array.isArray(results)||!results.length)throw Error("حالات جرثقیل برای استخراج پوش نیرو موجود نیستند.");
 const samples=results.map(x=>{
  const solved=x.analysis?.result;
  if(!Array.isArray(solved?.members))throw Error("نیروهای اعضا در موقعیت جرثقیل "+(x.caseIndex+1)+" در خروجی حل‌گر موجود نیست.");
  if(!solved.equilibrium?.ok)throw Error("تعادل موقعیت جرثقیل "+(x.caseIndex+1)+" برقرار نیست.");
  return {label:"CRANE-"+(x.caseIndex+1)+" @ "+Number(x.referencePosition_m).toFixed(4)+" m",members:solved.members,equilibrium:solved.equilibrium,referencePosition_m:x.referencePosition_m,caseIndex:x.caseIndex};
 });
 const rows=api.buildRows(model,samples),coverage=api.auditCoverage(model,samples,rows);
 if(coverage.invalidForceVectors.length||coverage.analysisMemberSetMismatchCases.length||coverage.duplicateMemberIdsByCase.length||coverage.unreportedMemberIds.length)throw Error("پوش نیروهای جرثقیل ناقص است: بردار نامعتبر "+coverage.invalidForceVectors.length+"، اختلاف اعضا "+coverage.analysisMemberSetMismatchCases.length+"، عضو گزارش‌نشده "+coverage.unreportedMemberIds.length);
 if(rows.some(r=>r.caseCount!==samples.length))throw Error("برای بعضی اعضا نیروی هر موقعیت جرثقیل ثبت نشده است.");
 const mainFrameCoverage=auditMainFrameMemberCoverage(model,samples,rows);
 if(!mainFrameCoverage.success)throw Error("ردیابی اثر جرثقیل تا اعضای اصلی ستون و رفتر کامل نیست: "+mainFrameCoverage.issues.join("؛ "));
 return {rows,coverage,mainFrameCoverage,cases:samples.map(x=>({label:x.label,caseIndex:x.caseIndex,referencePosition_m:x.referencePosition_m,equilibrium:x.equilibrium})),units:"N,N.m",simultaneousEndForcesPreserved:true,scope:"پوش مؤلفه‌ای نیروهای انتهایی؛ کنترل ظرفیت و اندرکنش آیین‌نامه‌ای نیست."};
}
function buildCraneBaseReactionCsv(envelope){
 if(!envelope||envelope.success!==true||!Array.isArray(envelope.rows)||!envelope.rows.length)throw Error("پوش واکنش پایه جرثقیل معتبر یا کامل نیست.");
 const headers=["گره پایه","حالت جرثقیل","موقعیت جرثقیل m","Fx واکنش kN","Fy واکنش kN","Fz واکنش kN","Mx واکنش kN.m","My واکنش kN.m","Mz واکنش kN.m","Fx کنش ستون kN","Fy کنش ستون kN","Fz کنش ستون kN","Mx کنش ستون kN.m","My کنش ستون kN.m","Mz کنش ستون kN.m"];
 const rows=[];
 envelope.rows.forEach(support=>{
  if(!Array.isArray(support.cases)||!support.cases.length)throw Error("گره پایه "+support.nodeId+" فاقد حالت‌های واکنش است.");
  support.cases.forEach(c=>{
   const r=c.solverReaction,a=c.columnAction,keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!r||!a||keys.some(k=>!Number.isFinite(r[k])||!Number.isFinite(a[k])))throw Error("بردار شش‌مؤلفه‌ای واکنش/کنش ستون "+support.nodeId+" ناقص است.");
   rows.push([support.nodeId,"CRANE-"+(Number(c.caseIndex)+1),c.referencePosition_m,...keys.map(k=>r[k]/1000),...keys.map(k=>a[k]/1000)]);
  });
 });
 const cell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
 return "\uFEFF"+[headers,...rows].map(r=>r.map(cell).join(",")).join("\r\n");
}
function buildCraneDemandTraceAudit(model,results,memberForceEnvelope,supportReactionEnvelope){
 const issues=[],nodeMap=new Map((model?.nodes||[]).map(n=>[String(n.id),n]));
 const memberMap=new Map((model?.members||[]).map(m=>[String(m.id),m]));
 const expectedCases=(results||[]).map((sample,index)=>({caseIndex:Number.isInteger(sample.caseIndex)?sample.caseIndex:index,referencePosition_m:Number(sample.referencePosition_m),label:"CRANE-"+(index+1)+" @ "+Number(sample.referencePosition_m).toFixed(4)+" m"}));
 const caseIds=expectedCases.map(x=>x.caseIndex);
 if(!results?.length)issues.push("حالات واقعی تحلیل جرثقیل برای بسته ردیابی موجود نیست.");
 if(expectedCases.some(x=>!Number.isFinite(x.referencePosition_m)))issues.push("موقعیت طولی یکی از حالات جرثقیل معتبر نیست.");
 if(new Set(caseIds).size!==caseIds.length)issues.push("شناسه حالت جرثقیل تکراری است.");
 const memberRows=[];
 (memberForceEnvelope?.rows||[]).forEach(row=>{
  const meta=memberMap.get(String(row.id));
  const start=String(row.start??meta?.start??""),end=String(row.end??meta?.end??"");
  if(!meta)issues.push("عضو نیروگزارش‌شده در مدل فیزیکی وجود ندارد: "+row.id);
  if(!start||!end||!nodeMap.has(start)||!nodeMap.has(end))issues.push("نگاشت دو انتهای عضو "+row.id+" به گره‌های واقعی مدل ناقص است.");
  if(start&&end&&start===end)issues.push("دو انتهای عضو "+row.id+" به یک گره اشاره می‌کنند.");
  const cases=(row.simultaneousCases||[]).map((item,index)=>{
   const expected=expectedCases[index];
   if(!expected||String(item.label)!==expected.label)issues.push("برچسب/ترتیب حالت نیروی عضو "+row.id+" با موقعیت جرثقیل تطبیق ندارد.");
   const finiteEnd=endObj=>endObj&&["N","Vy","Vz","T","My","Mz"].every(k=>Number.isFinite(endObj[k]));
   if(!finiteEnd(item.endI)||!finiteEnd(item.endJ))issues.push("بردار هم‌زمان دو انتهای عضو "+row.id+" ناقص است.");
   return {caseIndex:expected?.caseIndex??index,referencePosition_m:expected?.referencePosition_m??null,label:item.label,endI:item.endI?{...item.endI}:null,endJ:item.endJ?{...item.endJ}:null,sourceVector:Array.isArray(item.sourceVector)?item.sourceVector.slice():null};
  });
  if(cases.length!==expectedCases.length)issues.push("تعداد حالات هم‌زمان عضو "+row.id+" با تعداد موقعیت‌های جرثقیل برابر نیست.");
  memberRows.push({memberId:String(row.id),sectionKey:row.sectionKey||meta?.sectionKey||"",startNodeId:start,endNodeId:end,localAxes:row.localAxes||null,localEndForceConventionVersion:row.localEndForceConventionVersion??null,caseCount:cases.length,cases});
 });
 const supportRows=[];
 (supportReactionEnvelope?.rows||[]).forEach(row=>{
  const node=nodeMap.get(String(row.nodeId));
  if(!node||!(node.kind==="base"||node.kind==="endwall-base"))issues.push("گره واکنش پایه "+row.nodeId+" در مدل پایه معتبر نیست.");
  const cases=(row.cases||[]).map((item,index)=>{
   const expected=expectedCases.find(x=>x.caseIndex===item.caseIndex);
   if(!expected||expected.referencePosition_m!==Number(item.referencePosition_m))issues.push("شناسه/موقعیت واکنش پایه "+row.nodeId+" با حالت تحلیل تطبیق ندارد.");
   const keys=["Fx","Fy","Fz","Mx","My","Mz"];
   if(!item.solverReaction||!item.columnAction||keys.some(k=>!Number.isFinite(item.solverReaction[k])||!Number.isFinite(item.columnAction[k])))issues.push("بردار شش‌مؤلفه‌ای واکنش پایه "+row.nodeId+" ناقص است.");
   return {caseIndex:item.caseIndex,referencePosition_m:item.referencePosition_m,solverReaction:item.solverReaction?{...item.solverReaction}:null,columnAction:item.columnAction?{...item.columnAction}:null};
  });
  if(cases.length!==expectedCases.length)issues.push("تعداد حالات واکنش پایه "+row.nodeId+" کامل نیست.");
  supportRows.push({nodeId:String(row.nodeId),coordinatesM:node?{x:node.x,y:node.y,z:node.z}:null,kind:node?.kind||"",caseCount:cases.length,cases});
 });
 const expectedSupports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
 const returnedSupportIds=new Set(supportRows.map(x=>x.nodeId));
 expectedSupports.forEach(n=>{if(!returnedSupportIds.has(String(n.id)))issues.push("بسته تقاضای جرثقیل واکنش پایه "+n.id+" را ندارد.");});
 return {success:issues.length===0,issues,caseCount:expectedCases.length,memberCount:memberRows.length,supportCount:supportRows.length,cases:expectedCases,members:memberRows,supports:supportRows,units:{memberForce:"N",memberMoment:"N.m",supportForce:"N",supportMoment:"N.m"},memberForceBasis:"member-local end actions; axes are preserved and no cross-member vector summation is performed",supportForceBasis:"global support reaction and opposite column action; signs are preserved",simultaneousCasesPreserved:true,nonConcurrentEnvelopeComponentsNotSummed:true,designApproved:false,scope:"بسته تقاضای ردیابی جرثقیل از نیروهای انتهایی ستون/رفتر تا واکنش پایه؛ فاقد تبدیل محورها، طراحی اتصال، بولت، صفحه‌ستون و پی."};
}
async function analyzeAllFromUI(options){
 const opt=options||{},progress=typeof opt.onProgress==="function"?opt.onProgress:()=>{},maxCases=Number.isInteger(opt.maxCases)&&opt.maxCases>0?opt.maxCases:300;
 lastAutomaticEnvelope=null;
 const crane=root.SteelCraneReadiness?.getData?.()||{};
 if(!crane.enabled)return {success:true,notApplicable:true,analysisEnabled:false,total:0,results:[]};
 const route=root.SteelCraneLoadPath?.readUI?.()||{craneType:"overhead",supportSystem:"runway_girder"};
 const routeAudit=auditCraneType(route);
 if(!routeAudit.valid)return {success:false,analysisEnabled:false,issues:routeAudit.issues,results:[]};
 const readiness=root.SteelCraneReadiness?.audit?.(crane);
 if(readiness?.missing?.length)return {success:false,analysisEnabled:false,issues:["اطلاعات اصلی جرثقیل ناقص است: "+readiness.missing.join("، ")],results:[]};
 const advisoryPrefixes=["ضرایب ضربه و نیروهای افقی باید","بارهای حداکثر و حداقل چرخ باید","بارهای جرثقیل باید"];
 const fatalReadinessIssues=(readiness?.issues||[]).filter(x=>!advisoryPrefixes.some(prefix=>String(x).startsWith(prefix)));
 if(fatalReadinessIssues.length)return {success:false,analysisEnabled:false,issues:fatalReadinessIssues,results:[]};
 const impact=Number(crane.verticalImpact);
 if(!(Number.isFinite(impact)&&impact>0))return {success:false,analysisEnabled:false,issues:["ضریب اثر دینامیکی قائم باید مثبت و مستند باشد."],results:[]};
 const structural=root.SteelStructuralModel;
 if(!structural?.build||!structural?.analyze3D)return {success:false,analysisEnabled:false,issues:["مدل یا حل‌گر سه‌بعدی بارگذاری نشده است."],results:[]};
 let model;
 try{model=structural.build();}catch(e){return {success:false,analysisEnabled:false,issues:["تولید مدل سوله/جرثقیل ناموفق: "+String(e.message||e)],results:[]};}
 if(!model?.geometry?.craneRunway?.enabled)return {success:false,analysisEnabled:false,issues:["جرثقیل فعال است اما هندسه تیر حمال در مدل سه‌بعدی فعال نشده است."],results:[]};
 const bayAllocation=root.SteelCraneBayConfiguration?.readAndAudit?.(Number(model.geometry.bayCount));
 if(!bayAllocation)return {success:false,analysisEnabled:false,issues:["ماژول ممیزی جانمایی جرثقیل در دسترس نیست؛ تحلیل جرثقیل متوقف شد."],results:[]};
 if(!bayAllocation.valid||!bayAllocation.solverCompatible)return {success:false,analysisEnabled:false,issues:[...(bayAllocation.issues||[]),...(bayAllocation.warnings||[]),"حل‌گر فعلی فقط یک جرثقیل با مسیر سراسری تمام دهانه‌ها را پشتیبانی می‌کند؛ تحلیل جزئی/چندجرثقیل تا تکمیل مسیرهای مستقل بار اجرا نمی‌شود."],bayAllocation,results:[]};
 const craneMembers=model.members.filter(x=>x.craneIntegration===true);
 if(!model.geometry.craneRunway.integrationAudit?.success||!craneMembers.some(x=>x.sectionKey==="craneRunwayGirder")||!craneMembers.some(x=>x.sectionKey==="craneRunwayBracket"))
  return {success:false,analysisEnabled:false,issues:["تیر حمال و براکت با مقاطع SI و مراجع نقشه به مدل FEM متصل نشده‌اند؛ JSON یکپارچه‌سازی را تکمیل کنید."],results:[]};
 const twoRail=root.SteelCraneTwoRailTransfer;
 if(!twoRail?.readUI||!twoRail?.analyze)return {success:false,analysisEnabled:false,issues:["ماژول تحلیل هم‌زمان دو ریل در دسترس نیست."],results:[]};
 let railInput;
 try{railInput=applyVerticalImpact(twoRail.readUI(),impact);}catch(e){return {success:false,analysisEnabled:false,issues:[String(e.message||e)],results:[]};}
 const transfer=twoRail.analyze(railInput);
 if(!transfer?.success)return {success:false,analysisEnabled:false,issues:transfer?.audit?.issues||transfer?.issues||["تحلیل قطار چرخ روی دو ریل ناموفق است."],results:[]};
 const horizontal=root.SteelCraneHorizontalLoads?.getData?.()||{enabled:false};
 const train=root.SteelCraneTrainAnalysis?.getData?.()||{};
 const integration=root.SteelCrane3DIntegration?.readUI?.()||{};
 const prepared=prepareAll(model,transfer,horizontal,train,integration);
 if(!prepared.success)return {success:false,analysisEnabled:false,total:prepared.total,readyCount:prepared.readyCount,issues:prepared.issues,results:[]};
 if(prepared.total>maxCases)return {success:false,analysisEnabled:false,total:prepared.total,issues:["تعداد حالات جاروب جرثقیل "+prepared.total+" است و از سقف اجرای خودکار "+maxCases+" بیشتر است؛ گام مکانی را بزرگ‌تر کنید."],results:[]};
 const results=[];
 for(let i=0;i<prepared.cases.length;i++){
  progress("تحلیل موقعیت جرثقیل "+(i+1)+" از "+prepared.total+" ...");
  const one=await analyzeCase(i,transfer,horizontal,train,{...integration,...route});
  if(!one?.success)return {success:false,analysisEnabled:false,total:prepared.total,completed:results.length,failedCase:i+1,issues:one?.transfer?.issues||one?.issues||["حل سه‌بعدی یکی از موقعیت‌های جرثقیل ناموفق بود."],results};
  if(!one.result?.equilibrium?.ok)return {success:false,analysisEnabled:false,total:prepared.total,completed:results.length,failedCase:i+1,issues:["تعادل حل‌گر در موقعیت جرثقیل "+(i+1)+" برقرار نیست."],results};
  results.push({caseIndex:i,referencePosition_m:one.transfer.referencePosition_m,maxTranslation_m:Number(one.result.maxTranslation),equilibrium:one.result.equilibrium,analysis:one});
 }
 const critical=results.reduce((best,x)=>!best||x.maxTranslation_m>best.maxTranslation_m?x:best,null);
 const supportReactionEnvelope=buildCraneSupportReactionEnvelope(model,results);
 if(!supportReactionEnvelope.success)return {success:false,analysisEnabled:false,total:results.length,completed:results.length,issues:["پوش واکنش‌های پایه جرثقیل ناقص است: "+supportReactionEnvelope.issues.join("؛ ")],results};
 let memberForceEnvelope;
 try{memberForceEnvelope=buildMovingForceEnvelope(model,results);}catch(e){return {success:false,analysisEnabled:false,total:results.length,completed:results.length,issues:["استخراج پوش نیروهای اعضای جرثقیل ناموفق است: "+String(e.message||e)],results};}
 const demandTraceAudit=buildCraneDemandTraceAudit(model,results,memberForceEnvelope,supportReactionEnvelope);
 if(!demandTraceAudit.success)return {success:false,analysisEnabled:false,total:results.length,completed:results.length,issues:["ممیزی ردیابی هم‌زمان نیرو از ستون/رفتر تا پایه ناموفق است: "+demandTraceAudit.issues.join("؛ ")],results,memberForceEnvelope,supportReactionEnvelope};
 lastAutomaticEnvelope={success:true,analysisEnabled:false,readyForCodeDesign:false,sourceProvenanceComplete:prepared.sourceProvenanceComplete===true,sourceProvenanceIncompleteCount:prepared.sourceProvenanceIncompleteCount||0,sourceProvenanceCases:prepared.cases.map(x=>({caseIndex:x.caseIndex,complete:x.sourceProvenanceAudit?.complete===true,issues:x.sourceProvenanceAudit?.issues||[]})),total:results.length,results,memberForceEnvelope,mainFrameCoverage:memberForceEnvelope.mainFrameCoverage,supportReactionEnvelope,demandTraceAudit,criticalCase:critical?.caseIndex??null,maxTranslation_m:critical?.maxTranslation_m??null,
  loadBasis:"بار مرده و وزن خود اعضا + بار چرخ‌های قائم با ضریب دینامیکی قائم اعمال‌شده + نیروهای افقی مستند در صورت فعال‌بودن؛ هر موقعیت قطار جداگانه حل شده است.",
  note:"پوش تغییرمکان از نتایج حالات جداگانه؛ بیشینه‌های غیرهم‌زمان نیرو/لنگر با هم جمع نشده‌اند. این مرحله هنوز ترکیبات کامل آیین‌نامه‌ای جرثقیل، خستگی و طراحی نهایی تیر حمال/اتصالات را تأیید نمی‌کند."};
 return lastAutomaticEnvelope;
}
function selfTestSourceProvenance(){
 const legacy={geometrySource:"GA-1",wheelTrackSource:"GA-2",supportStiffnessSource:"TEST-1",wheelSources:[{side:"left",offset_m:0,source:"CR-1",document:"p.2"}]};
 const full={geometrySource:{document:"نقشه مصوب",revision:"A",locator:"GA-1",authority:"کارفرما"},wheelTrackSource:{document:"نقشه مصوب",revision:"A",locator:"GA-2",authority:"کارفرما"},supportStiffnessSource:{document:"گزارش آزمایش",revision:"1",locator:"بخش ۲",authority:"آزمایشگاه"},wheelSources:[{side:"left",document:"کاتالوگ سازنده",revision:"2026",locator:"صفحه ۲",authority:"سازنده"}]};
 const a=auditSourceProvenance(legacy,null),b=auditSourceProvenance(full,null),h=auditSourceProvenance(full,{enabled:true,source:"CR-1",document:"p.3"});
 return {checks:[{name:"rejects shorthand source identifiers as full provenance",ok:!a.complete&&a.incompleteCount===4},{name:"accepts explicit document, revision, locator and authority",ok:b.complete&&b.incompleteCount===0},{name:"requires horizontal-load provenance when enabled",ok:!h.complete}],analysisEnabled:false,designApproved:false};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 t("vertical dynamic factor scales both rail wheel trains without changing source sign",()=>{const x=applyVerticalImpact({leftWheels:[{P_N:-1000,source:"S",document:"p1"}],rightWheels:[{P_N:-1200,source:"S",document:"p1"}]},1.25);return x.leftWheels[0].P_N===-1250&&x.rightWheels[0].P_N===-1500&&x.leftWheels[0].staticInputP_N===-1000;});
 t("explicit overhead crane path is accepted for runway FEM",()=>{const old=root.SteelCraneLoadPath;root.SteelCraneLoadPath={classify:()=>({valid:true,craneType:"overhead",loadTarget:"crane_runway_and_frame",loadPath:["wheel","rail","runway_girder"]})};const r=auditCraneType({craneType:"overhead",supportSystem:"runway_girder"});root.SteelCraneLoadPath=old;return r.valid&&r.loadTarget==="crane_runway_and_frame";});
 t("ground gantry crane is blocked from overhead runway FEM",()=>{const old=root.SteelCraneLoadPath;root.SteelCraneLoadPath={classify:()=>({valid:true,craneType:"gantry"})};const r=auditCraneType({craneType:"gantry",supportSystem:"slab"});root.SteelCraneLoadPath=old;return !r.valid;});
 t("overhead crane on slab support is rejected",()=>{const old=root.SteelCraneLoadPath;root.SteelCraneLoadPath={classify:()=>({valid:false,issues:["invalid support"]})};const r=auditCraneType({craneType:"overhead",supportSystem:"slab"});root.SteelCraneLoadPath=old;return !r.valid;});
 t("legacy crane configuration remains explicitly unspecified",()=>auditCraneType({}).valid&&auditCraneType({}).legacyUnspecified===true);
 const model={geometry:{length:10},nodes:[{id:"L0",x:-.5,y:5,z:0},{id:"L1",x:-.5,y:5,z:5},{id:"L2",x:-.5,y:5,z:10},{id:"R0",x:10.5,y:5,z:0},{id:"R1",x:10.5,y:5,z:5},{id:"R2",x:10.5,y:5,z:10}],members:[
  {id:"GL1",start:"L0",end:"L1",side:"left",sectionKey:"craneRunwayGirder",craneIntegration:true},{id:"GL2",start:"L1",end:"L2",side:"left",sectionKey:"craneRunwayGirder",craneIntegration:true},
  {id:"GR1",start:"R0",end:"R1",side:"right",sectionKey:"craneRunwayGirder",craneIntegration:true},{id:"GR2",start:"R1",end:"R2",side:"right",sectionKey:"craneRunwayGirder",craneIntegration:true}]};
 const sourceDocuments={geometrySource:"GA-1",wheelTrackSource:"GA-2",supportStiffnessSource:"TEST-1",wheelSources:[{side:"left",offset_m:0,source:"CR-1",document:"p.2"},{side:"right",offset_m:0,source:"CR-1",document:"p.2"}]};
 const transfer={success:true,cases:[{referencePosition_m:1,girderPointLoads:{left:[{x_m:5,P_N:-5000,station:2,source:"rail-support-reaction"}],right:[{x_m:5,P_N:-6000,station:2,source:"rail-support-reaction"}]},sourceDocuments}]};
 const h={enabled:true,transverseLoads_kN:"10",longitudinalLoads_kN:"2",transverseSign:"+X",longitudinalSign:"+Z",source:"CR-1",document:"p.3"};
 const train={positions_m:"0"};
 const cfg={verticalReactionOffset_m:[0,.2,0],horizontalWheelOffset_m:[0,.3,0],horizontalApplicationSides:"both"};
 const r=prepareCase(model,transfer,0,h,train,cfg),sum=[0,0,0];
 r.nodalLoads.forEach(n=>n.values.slice(0,3).forEach((v,i)=>sum[i]+=v));
 t("maps concurrent left/right vertical reactions to exact support nodes",()=>r.success&&Math.abs(sum[1]+11000)<1e-8);
 t("horizontal point forces are distributed on both girder lines",()=>r.success&&Math.abs(sum[0]-20000)<1e-7&&Math.abs(sum[2]-4000)<1e-7);
 t("creates global eccentric moments for vertical and horizontal forces",()=>r.success&&r.nodalLoads.some(n=>Math.abs(n.values[3])+Math.abs(n.values[5])>0));
 t("does not mutate source 3D model",()=>model.nodes.length===6&&model.members.length===4);
 t("rejects missing load eccentricity",()=>!prepareCase(model,transfer,0,h,train,{...cfg,verticalReactionOffset_m:null}).success);
 t("rejects unspecified horizontal rail side",()=>!prepareCase(model,transfer,0,h,train,{...cfg,horizontalApplicationSides:""}).success);
 t("rejects unmatched vertical support station",()=>{const bad=JSON.parse(JSON.stringify(transfer));bad.cases[0].girderPointLoads.left[0].x_m=4.8;return !prepareCase(model,bad,0,h,train,cfg).success;});
 t("rejects incomplete load source chain",()=>{const bad=JSON.parse(JSON.stringify(transfer));bad.cases[0].sourceDocuments.wheelSources[0].document="";return !prepareCase(model,bad,0,h,train,cfg).success;});
 t("maps horizontal force at an exact support node without duplicate member mapping",()=>{const exact=prepareCase(model,transfer,0,{...h,enabled:true}, {positions_m:"4"},cfg);return exact.success&&exact.nodalLoads.some(n=>n.nodeId==="L1"&&Math.abs(n.values[0])>0);});
 t("rejects a moving wheel outside the physical runway instead of silently dropping its force",()=>{const outside=prepareCase(model,transfer,0,{...h,enabled:true},{positions_m:"20"},{...cfg,horizontalApplicationSides:"left"});return !outside.success&&outside.issues.some(x=>x.includes("خارج از طول واقعی تیر حمال"));});
 t("rejects missing runway length when horizontal wheel positions are evaluated",()=>{const noLength={...model,geometry:{}};const bad=prepareCase(noLength,transfer,0,{...h,enabled:true},{positions_m:"4"},{...cfg,horizontalApplicationSides:"left"});return !bad.success&&bad.issues.some(x=>x.includes("طول مؤثر مسیر ریل"));});
 const beam={geometry:{length:10},nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:0,z:10}],members:[{id:"M",start:"A",end:"B",side:"left",sectionKey:"craneRunwayGirder",craneIntegration:true}]};
 const oneRail={success:true,cases:[{referencePosition_m:0,girderPointLoads:{left:[],right:[]},sourceDocuments}]};
 const point=prepareCase(beam,oneRail,0,{...h,transverseLoads_kN:"1",longitudinalLoads_kN:"0"}, {positions_m:"5"}, {...cfg,horizontalApplicationSides:"left",horizontalWheelOffset_m:[0,0,0]});
 const solver=point.success?root.SteelFrame3D.analyze(beam,{sectionResolver:()=>({E:2e11,G:7.7e10,A:.01,Iy:2e-4,Iz:1e-4,J:1e-5}),supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}],nodalLoads:point.nodalLoads}):null;
 const expected=1000*25*25/(6*2e11*1e-4);
 const actual=solver?.displacements.find(n=>n.nodeId==="B")?.values[0];
 t("consistent horizontal point load matches cantilever closed-form deflection",()=>!!solver?.success&&solver.equilibrium.ok&&Math.abs(actual-expected)<expected*1e-7);
 t("crane base reaction envelope rejects a missing support reaction",()=>{const m={nodes:[{id:"B1",kind:"base"},{id:"B2",kind:"base"}]},r=[{caseIndex:0,referencePosition_m:1,analysis:{supportReactionActions:{rows:[{nodeId:"B1",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}}}],a=buildCraneSupportReactionEnvelope(m,r);return !a.success&&a.issues.some(x=>x.includes("B2"));});
 t("crane base reaction envelope preserves column action signs per position",()=>{const m={nodes:[{id:"B1",kind:"base"}]},r=[{caseIndex:0,referencePosition_m:1,analysis:{supportReactionActions:{rows:[{nodeId:"B1",solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}}}],a=buildCraneSupportReactionEnvelope(m,r);return a.success&&a.rows[0].cases[0].columnAction.Fy===-2&&a.rows[0].cases[0].solverReaction.Fy===2;});
 t("main-frame coverage rejects a missing column action row",()=>{const m={members:[{id:"C1",sectionKey:"column"},{id:"R1",sectionKey:"rafter"}]},samples=[{label:"A"},{label:"B"}],rows=[{id:"C1",caseCount:2,simultaneousCases:[{},{}]},{id:"R1",caseCount:1,simultaneousCases:[{}]}],a=auditMainFrameMemberCoverage(m,samples,rows);return !a.success&&a.issues.some(x=>x.includes("رفتر قاب اصلی"));});
 t("main-frame coverage accepts complete column and rafter force traces",()=>{const m={members:[{id:"C1",sectionKey:"column"},{id:"R1",sectionKey:"rafter"}]},samples=[{label:"A"},{label:"B"}],rows=[{id:"C1",caseCount:2,simultaneousCases:[{},{}]},{id:"R1",caseCount:2,simultaneousCases:[{},{}]}],a=auditMainFrameMemberCoverage(m,samples,rows);return a.success&&a.families.column.coveredCount===1&&a.families.rafter.coveredCount===1;}); 
 t("crane base reaction CSV preserves signed six-component reactions and column actions per position",()=>{const csv=buildCraneBaseReactionCsv({success:true,rows:[{nodeId:"B1",cases:[{caseIndex:1,referencePosition_m:4.5,solverReaction:{Fx:1000,Fy:-2000,Fz:3000,Mx:-4000,My:5000,Mz:-6000},columnAction:{Fx:-1000,Fy:2000,Fz:-3000,Mx:4000,My:-5000,Mz:6000}}]}]});return csv.includes("B1")&&csv.includes("CRANE-2")&&csv.includes("-2")&&csv.includes("6");});
 t("crane demand trace preserves simultaneous member end forces and support actions",()=>{const m={nodes:[{id:"B",kind:"base",x:0,y:0,z:0},{id:"T",kind:"joint",x:0,y:5,z:0}],members:[{id:"C",start:"B",end:"T",sectionKey:"column"}]},r=[{caseIndex:0,referencePosition_m:2}],mf={rows:[{id:"C",sectionKey:"column",start:"B",end:"T",localAxes:{x:[1,0,0]},localEndForceConventionVersion:1,simultaneousCases:[{label:"CRANE-1 @ 2.0000 m",endI:{N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},endJ:{N:7,Vy:8,Vz:9,T:10,My:11,Mz:12},sourceVector:Array(12).fill(1)}]}]},sr={rows:[{nodeId:"B",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:1,Fy:2,Fz:3,Mx:4,My:5,Mz:6},columnAction:{Fx:-1,Fy:-2,Fz:-3,Mx:-4,My:-5,Mz:-6}}]}]},a=buildCraneDemandTraceAudit(m,r,mf,sr);return a.success&&a.members[0].cases[0].endJ.Mz===12&&a.supports[0].cases[0].columnAction.Fy===-2;});
 t("crane demand trace blocks unmapped physical member ends",()=>{const m={nodes:[{id:"B",kind:"base",x:0,y:0,z:0}],members:[{id:"C",start:"B",end:"MISSING",sectionKey:"column"}]},r=[{caseIndex:0,referencePosition_m:2}],mf={rows:[{id:"C",start:"B",end:"MISSING",sectionKey:"column",simultaneousCases:[{label:"CRANE-1 @ 2.0000 m",endI:{N:0,Vy:0,Vz:0,T:0,My:0,Mz:0},endJ:{N:0,Vy:0,Vz:0,T:0,My:0,Mz:0}}]}]},sr={rows:[{nodeId:"B",cases:[{caseIndex:0,referencePosition_m:2,solverReaction:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0},columnAction:{Fx:0,Fy:0,Fz:0,Mx:0,My:0,Mz:0}}]}]},a=buildCraneDemandTraceAudit(m,r,mf,sr);return !a.success&&a.issues.some(x=>x.includes("گره‌های واقعی"));});

 t("keeps analysis approval disabled",()=>r.analysisEnabled===false&&r.solverInputReady===true);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
function ensurePanel(){
 if(!root.document||root.document.getElementById("crane3DLoadTransferPanel"))return;
 const main=root.document.querySelector("main");if(!main)return;
 const panel=root.document.createElement("section");panel.className="panel";panel.id="crane3DLoadTransferPanel";
 panel.innerHTML='<div class="panel-title"><h3>انتقال بار جرثقیل به قاب سه‌بعدی</h3><span class="status">حالت‌های هم‌زمان</span></div>'+
 '<div class="notice">ابتدا تحلیل دو ریل و مشخصات اتصال/مقاطع را تکمیل کنید. در JSON یکپارچه‌سازی، خروج از مرکزیت واکنش قائم و بار افقی را از نقشه وارد کنید. این بخش هر حالت را جداگانه آماده می‌کند؛ بیشینه‌های غیرهم‌زمان با هم جمع نمی‌شوند.</div>'+
 '<div class="form-grid"><div class="field"><label for="crane3DLoadCaseSelect">حالت بار هم‌زمان</label><select id="crane3DLoadCaseSelect"><option value="">ابتدا آماده‌سازی حالات</option></select></div></div>'+
 '<div class="button-grid"><button type="button" class="btn secondary" id="crane3DPrepareCases">آماده‌سازی حالات بار</button><button type="button" class="btn" id="crane3DAnalyzeCase">تحلیل حالت انتخابی در قاب سه‌بعدی</button><button type="button" class="btn primary" id="crane3DAutomaticSweep">جاروب کامل موقعیت‌های جرثقیل و استخراج تقاضا</button><button type="button" class="btn secondary" id="crane3DDemandExport" disabled>دریافت بسته مهندسی تقاضا (JSON)</button><button type="button" class="btn secondary" id="crane3DConnectionExport" disabled>خروجی تقاضای اتصالات جرثقیل (CSV)</button><button type="button" class="btn secondary" id="crane3DBaseReactionExport" disabled>خروجی واکنش پایه و کنش ستون (CSV)</button></div>'+
 '<div id="crane3DLoadTransferResult" class="notice">هنوز حالتی آماده نشده است.</div>';
 const anchor=root.document.getElementById("shedLayoutPanel");
 if(anchor)anchor.insertAdjacentElement("afterend",panel);else main.appendChild(panel);
 let prepared=null;
 const status=()=>root.document.getElementById("crane3DLoadTransferResult");
 root.document.getElementById("crane3DPrepareCases").addEventListener("click",()=>{
  try{
   const model=root.SteelStructuralModel?.build?.()||root.SteelStructuralModel?.model;
   const transfer=root.SteelCraneTwoRailTransfer?.getLastResult?.();
   const horizontal=root.SteelCraneHorizontalLoads?.getData?.()||{enabled:false};
   const train=root.SteelCraneTrainAnalysis?.getData?.()||{};
   const config=root.SteelCrane3DIntegration?.readUI?.()||{};
   prepared=prepareAll(model,transfer,horizontal,train,config);
   const select=root.document.getElementById("crane3DLoadCaseSelect");select.innerHTML="";
   if(transfer?.cases)transfer.cases.forEach((c,i)=>{const option=root.document.createElement("option");option.value=String(i);option.textContent="حالت "+(i+1)+" ـ موقعیت قطار "+Number(c.referencePosition_m).toFixed(3)+" m";select.appendChild(option);});
   status().textContent=prepared.success?"آماده‌سازی موفق: "+prepared.readyCount+" از "+prepared.total+" حالت دارای بار گره‌ای معتبر هستند. شناسنامه منبع کامل: "+prepared.cases.filter(x=>x.sourceProvenanceAudit?.complete).length+"/"+prepared.total+"؛ موارد فاقد ویرایش/محل دقیق/مرجع در ممیزی طراحی مسدود می‌مانند. تحلیل هر حالت جداگانه انجام می‌شود.":("آماده‌سازی کامل نشد. حالات آماده: "+prepared.readyCount+"/"+prepared.total+"؛ موارد مسدود: "+prepared.issues.slice(0,8).join(" | "));
  }catch(e){prepared=null;status().textContent="خطا: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DAutomaticSweep").addEventListener("click",async()=>{
  const sweepButton=root.document.getElementById("crane3DAutomaticSweep"),exportButton=root.document.getElementById("crane3DDemandExport");
  try{
   sweepButton.disabled=true;exportButton.disabled=true;
   const result=await analyzeAllFromUI({onProgress:message=>{status().textContent=message;}});
   if(!result?.success)throw Error((result?.issues||["جاروب خودکار جرثقیل کامل نشد."]).join("؛ "));
   exportButton.disabled=false;root.document.getElementById("crane3DConnectionExport").disabled=false;root.document.getElementById("crane3DBaseReactionExport").disabled=false;
   status().textContent="جاروب کامل شد: "+result.total+" موقعیت؛ "+result.demandTraceAudit.memberCount+" عضو و "+result.demandTraceAudit.supportCount+" پایه ثبت شد. شناسنامه منبع کامل: "+(result.sourceProvenanceComplete?"بله":"خیر")+"؛ حالات ناقص: "+result.sourceProvenanceIncompleteCount+". کنترل ظرفیت و طراحی اتصال/پی هنوز انجام نشده است.";
  }catch(e){status().textContent="جاروب متوقف شد: "+String(e.message||e);}
  finally{sweepButton.disabled=false;}
 });
 root.document.getElementById("crane3DAutomaticSweep").addEventListener("click",()=>{root.document.getElementById("crane3DConnectionExport").disabled=true;});
 root.document.getElementById("crane3DBaseReactionExport").addEventListener("click",()=>{
  try{
   if(!lastAutomaticEnvelope?.success||!lastAutomaticEnvelope.supportReactionEnvelope?.success)throw Error("ابتدا جاروب کامل و موفق موقعیت‌های جرثقیل را اجرا کنید.");
   const csv=buildCraneBaseReactionCsv(lastAutomaticEnvelope.supportReactionEnvelope),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");
   a.href=url;a.download="SAHROUD-STEEL-crane-base-reactions.csv";root.document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
   status().textContent="خروجی واکنش پایه و کنش ستون ساخته شد؛ هر پایه و هر موقعیت جرثقیل یک ردیف مستقل دارد. علامت‌ها حفظ شده‌اند؛ این خروجی طراحی صفحه‌ستون/بولت/پی نیست.";
  }catch(e){status().textContent="خروجی واکنش پایه ساخته نشد: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DConnectionExport").addEventListener("click",()=>{
  try{
   const registry=root.SteelConnectionDemandRegistry;
   if(!registry?.collectFromCraneDemandTrace||!registry?.toCraneCsv)throw Error("مبدل تقاضای جرثقیل به بانک اتصالات بارگذاری نشده است.");
   if(!lastAutomaticEnvelope?.success||!lastAutomaticEnvelope.demandTraceAudit?.success)throw Error("ابتدا جاروب کامل و موفق موقعیت‌های جرثقیل را اجرا کنید.");
   const rows=registry.collectFromCraneDemandTrace(lastAutomaticEnvelope.demandTraceAudit,root.SteelStructuralModel?.getData?.());
   const csv=registry.toCraneCsv(rows),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");
   a.href=url;a.download="SAHROUD-STEEL-crane-connection-demands.csv";root.document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
   status().textContent="خروجی CSV تقاضای اتصال ساخته شد: "+rows.length+" رکورد در گره‌های مشترک واقعی؛ مقادیر محلی با علامت و موقعیت مستقل حفظ شده‌اند.";
  }catch(e){status().textContent="خروجی تقاضای اتصالات ساخته نشد: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DDemandExport").addEventListener("click",()=>{
  try{
   if(!lastAutomaticEnvelope?.success||!lastAutomaticEnvelope.demandTraceAudit?.success)throw Error("ابتدا جاروب کامل موقعیت‌های جرثقیل را با موفقیت اجرا کنید.");
   const data={schema:"SAHROUD-STEEL-CRANE-DEMAND-TRACE-1.0",generatedAt:new Date().toISOString(),analysisEnabled:false,caseCount:lastAutomaticEnvelope.total,loadBasis:lastAutomaticEnvelope.loadBasis,sourceProvenanceComplete:lastAutomaticEnvelope.sourceProvenanceComplete,sourceProvenanceIncompleteCount:lastAutomaticEnvelope.sourceProvenanceIncompleteCount,sourceProvenanceCases:lastAutomaticEnvelope.sourceProvenanceCases,notes:lastAutomaticEnvelope.note,demandTraceAudit:lastAutomaticEnvelope.demandTraceAudit,memberForceEnvelope:lastAutomaticEnvelope.memberForceEnvelope,supportReactionEnvelope:lastAutomaticEnvelope.supportReactionEnvelope,criticalCase:lastAutomaticEnvelope.criticalCase,maxTranslation_m:lastAutomaticEnvelope.maxTranslation_m};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");
   a.href=url;a.download="SAHROUD-STEEL-crane-demand-trace.json";root.document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }catch(e){status().textContent="ساخت بسته خروجی ناموفق بود: "+String(e.message||e);}
 });
 root.document.getElementById("crane3DAnalyzeCase").addEventListener("click",async()=>{
  try{
   const select=root.document.getElementById("crane3DLoadCaseSelect"),i=Number(select.value);
   if(!prepared||!Number.isInteger(i)||!prepared.cases[i])throw Error("ابتدا حالات بار را آماده و یک حالت معتبر انتخاب کنید.");
   if(!prepared.cases[i].success)throw Error("این حالت آماده نیست: "+prepared.cases[i].issues.join(" | "));
   status().textContent="حل حالت انتخابی در پردازشگر سه‌بعدی در حال انجام است...";
   const transfer=root.SteelCraneTwoRailTransfer.getLastResult();
   const horizontal=root.SteelCraneHorizontalLoads?.getData?.()||{enabled:false};
   const train=root.SteelCraneTrainAnalysis?.getData?.()||{};
   const config=root.SteelCrane3DIntegration?.readUI?.()||{};
   const r=await analyzeCase(i,transfer,horizontal,train,config);
   if(!r.success)throw Error(r.transfer?.issues?.join(" | ")||"تحلیل حالت ناموفق بود.");
   const q=r.result;
   status().textContent="حل نرم‌افزاری انجام شد؛ گره بارگذاری: "+r.transfer.loadCount+"؛ بیشینه جابه‌جایی انتقالی: "+(q.maxTranslation??0).toExponential(4)+" m؛ واکنش‌های پایه/نیروی متناظر ستون: "+(r.supportReactionActions?.rows?.length??0)+" گره؛ تعادل نیرو: "+(q.equilibrium?.ok?"برقرار":"نیازمند بررسی")+"؛ تعادل لنگر: "+(q.equilibrium?.momentResidualNm||[]).map(v=>Number(v).toExponential(2)).join(", ")+" N.m. نیروهای پایه فقط تقاضا هستند؛ طراحی صفحه‌ستون، مهار و فونداسیون انجام نشده است.";
  }catch(e){status().textContent="تحلیل متوقف شد: "+String(e.message||e);}
 });
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
root.SteelCrane3DLoadTransfer={prepareCase,prepareAll,analyzeCase,analyzeAllFromUI,auditCraneType,auditSourceProvenance,selfTestSourceProvenance,selfTest,buildMovingForceEnvelope,buildCraneSupportReactionEnvelope,buildCraneDemandTraceAudit,buildCraneBaseReactionCsv,getLastAnalysis:()=>lastAnalysis,getLastAutomaticEnvelope:()=>lastAutomaticEnvelope};
})(typeof window!=="undefined"?window:globalThis);



/* ===== steel2/js/crane-girder-local-screen.js ===== */
/* SAHROUD STEEL — runway girder elastic local-stress screening.
 * Reads end actions from the 3D frame FEM. This is a transparent nominal-stress
 * screen only; it is not a code resistance, buckling, fatigue, or connection check.
 */
(function(root){
"use strict";
const REQUIRED=["A_m2","Sy_m3","Sz_m3","Avy_m2","Avz_m2","J_m4","torsionRadius_m","Fy_MPa"];
function audit(result,sectionsByMemberId){
 const issues=[],rows=[],map=sectionsByMemberId||{};
 if(!result||result.success!==true||!Array.isArray(result.members))issues.push("نتیجه معتبر تحلیل سه‌بعدی با فهرست اعضا لازم است.");
 const members=(result?.members||[]).filter(m=>m.sectionKey==="craneRunwayGirder"||m.type==="craneRunwayGirder");
 if(!members.length)issues.push("عضو تیر حمال یکپارچه‌شده در نتیجه تحلیل سه‌بعدی پیدا نشد.");
 members.forEach(m=>{
  const s=map[String(m.id)];
  if(!s||typeof s!=="object"){issues.push("مشخصات مقطع عضو "+m.id+" ثبت نشده است.");return;}
  REQUIRED.forEach(k=>{if(!(Number.isFinite(Number(s[k]))&&Number(s[k])>0))issues.push("عضو "+m.id+": مقدار "+k+" باید مثبت و بر حسب SI باشد.");});
  if(!String(s.source||"").trim())issues.push("مرجع خواص مقطع عضو "+m.id+" الزامی است.");
  if(!String(s.geometrySource||"").trim())issues.push("مرجع هندسه مقطع عضو "+m.id+" الزامی است.");
  if(!String(s.shearAreaMethod||"").trim())issues.push("روش تعیین سطح مؤثر برش عضو "+m.id+" باید مستند شود.");
  if(!String(s.torsionMethod||"").trim())issues.push("روش تعیین پارامترهای پیچش عضو "+m.id+" باید مستند شود.");
  if(!Array.isArray(m.localEndForces)||m.localEndForces.length!==12){issues.push("نیروهای انتهایی محلی عضو "+m.id+" ناقص است.");return;}
  if(m.localEndForces.some(v=>!Number.isFinite(Number(v)))){issues.push("نیروهای انتهایی محلی عضو "+m.id+" نامعتبر است.");return;}
  if(REQUIRED.some(k=>!(Number.isFinite(Number(s[k]))&&Number(s[k])>0)))return;
  const ends=[{name:"i",o:0},{name:"j",o:6}].map(e=>{
   const f=m.localEndForces,o=e.o;
   const N=Math.abs(f[o]),Vy=Math.abs(f[o+1]),Vz=Math.abs(f[o+2]),T=Math.abs(f[o+3]),My=Math.abs(f[o+4]),Mz=Math.abs(f[o+5]);
   const sigma=N/Number(s.A_m2)+My/Number(s.Sy_m3)+Mz/Number(s.Sz_m3);
   const tau=Vy/Number(s.Avy_m2)+Vz/Number(s.Avz_m2)+T*Number(s.torsionRadius_m)/Number(s.J_m4);
   const vm=Math.sqrt(sigma*sigma+3*tau*tau),fy=Number(s.Fy_MPa)*1e6;
   return {end:e.name,actions_N_Nm:{N,Vy,Vz,T,My,Mz},nominalUpperBound_Pa:{normal:sigma,shear:tau,vonMises:vm},yieldScreenRatio:vm/fy};
  });
  const governing=ends.reduce((a,b)=>a.yieldScreenRatio>=b.yieldScreenRatio?a:b);
  rows.push({memberId:m.id,length_m:m.length,sectionKey:m.sectionKey,source:s.source,geometrySource:s.geometrySource,ends,governingEnd:governing.end,governingYieldScreenRatio:governing.yieldScreenRatio,screenStatus:governing.yieldScreenRatio<=1?"nominal-elastic-screen-below-Fy":"nominal-elastic-screen-exceeds-Fy"});
 });
 const ready=issues.length===0&&rows.length===members.length;
 return {success:ready,ready,analysisEnabled:false,method:"absolute-value elastic nominal-stress upper-bound screen at each member end; von Mises combination",memberCount:members.length,checkedCount:rows.length,issues,results:rows,limitations:[
 "این کنترل صرفاً غربال تنش اسمی الاستیک در دو انتهای اعضا است و جایگزین طراحی مقاومت آیین‌نامه‌ای نیست.",
 "مقادیر Sy و Sz باید مدول مقطع واقعی حول محورهای محلی y و z و با تعریف منطبق با حل‌گر باشند.",
 "فرمول تنش برشی جمع قدرمطلق مؤلفه‌ها یک کران محافظه‌کارانه ساده‌شده است؛ توزیع واقعی برش و پیچش در مقطع I شکل محاسبه نمی‌شود.",
 "پیچش سن‌ونان برای مقاطع باز نازک‌جداره ممکن است ناکافی باشد؛ warping و تنش‌های ناشی از آن مدل نشده‌اند.",
 "کمانش پیچشی-جانبی، کمانش موضعی بال و جان، web crippling، patch loading، خمش موضعی بال، سخت‌کننده‌ها، جوش، پیچ، خستگی، ضربه و اثرات دینامیکی بررسی نشده‌اند.",
 "نسبت با Fy فقط شاخص غربال تنش است؛ ضرایب مقاومت، ترکیبات بار آیین‌نامه‌ای، طبقه‌بندی مقطع و ضرایب کاهش اعمال نشده‌اند.",
 "نتیجه تحلیل خطی مرتبه اول است و اثرات مرتبه دوم، imperfection و تحلیل پایداری در آن نیست."
 ]};
}
function plateStabilityAudit(sectionsByMemberId){
 const issues=[],rows=[],map=sectionsByMemberId||{},ids=Object.keys(map);
 if(!ids.length)issues.push("اطلاعات هندسی تیر حمال وارد نشده است.");
 ids.forEach(id=>{
  const s=map[id]||{},n=k=>Number(s[k]);
  const numeric=["d_m","bf_m","tw_m","tf_m","E_MPa","Fy_MPa","Lb_m","Cb","loadHeightFromShearCenter_m","Cw_m6","Iy_minor_m4","J_m4","bearingLength_m","rootRadius_m","webPanelLength_m"];
  numeric.forEach(k=>{if(s[k]===undefined||s[k]===null||s[k]===""||!Number.isFinite(n(k)))issues.push("عضو "+id+": ورودی عددی "+k+" ناقص یا نامعتبر است.");});
  ["compressionFlangeRestraint","restraintSource","bearingDetailSource","webBearingCondition","stiffenerType","stiffenerSource","webPanelSource"].forEach(k=>{if(!String(s[k]||"").trim())issues.push("عضو "+id+": ورودی "+k+" الزامی است.");});
  if(numeric.some(k=>s[k]===undefined||s[k]===null||s[k]===""||!Number.isFinite(n(k))))return;
  ["d_m","bf_m","tw_m","tf_m","E_MPa","Fy_MPa","Lb_m","Cb","Cw_m6","Iy_minor_m4","J_m4","bearingLength_m","webPanelLength_m"].forEach(k=>{if(!(n(k)>0))issues.push("عضو "+id+": "+k+" باید مثبت باشد.");});
  if(n("rootRadius_m")<0)issues.push("عضو "+id+": شعاع گوشه/ریشه نمی‌تواند منفی باشد.");
  if(n("d_m")<=2*n("tf_m"))issues.push("عضو "+id+": عمق آزاد جان باید مثبت باشد.");
  if(n("bf_m")<=n("tw_m"))issues.push("عضو "+id+": عرض آزاد پیش‌آمدگی بال باید مثبت باشد.");
  if(!["continuous","discrete"].includes(s.compressionFlangeRestraint))issues.push("عضو "+id+": مهار بال فشاری باید پیوسته یا گسسته و مستند باشد؛ none/unknown برای کنترل پایداری پذیرفته نیست.");
  if(n("d_m")<=2*n("tf_m")||n("bf_m")<=n("tw_m")||n("E_MPa")<=0||n("Fy_MPa")<=0||n("tw_m")<=0||n("tf_m")<=0||n("Lb_m")<=0||n("Cb")<=0||n("Cw_m6")<=0||n("Iy_minor_m4")<=0||n("J_m4")<=0||n("bearingLength_m")<=0||n("webPanelLength_m")<=0||n("rootRadius_m")<0)return;
  const clearWeb=n("d_m")-2*n("tf_m"),outstand=(n("bf_m")-n("tw_m"))/2,root=Math.sqrt(n("Fy_MPa")/n("E_MPa"));
  rows.push({memberId:id,geometry_m:{depth:n("d_m"),flangeWidth:n("bf_m"),webThickness:n("tw_m"),flangeThickness:n("tf_m"),clearWebDepth:clearWeb,flangeOutstand:outstand,rootRadius:n("rootRadius_m"),unbracedLength:n("Lb_m"),bearingLength:n("bearingLength_m"),webPanelLength:n("webPanelLength_m")},dimensionlessRatios:{flangeOutstandOverThickness:outstand/n("tf_m"),clearWebDepthOverThickness:clearWeb/n("tw_m"),flangePlateNormalized:outstand/n("tf_m")*root,webPlateNormalized:clearWeb/n("tw_m")*root},stabilityInputs:{Cb:n("Cb"),compressionFlangeRestraint:s.compressionFlangeRestraint,restraintSource:s.restraintSource,loadHeightFromShearCenter_m:n("loadHeightFromShearCenter_m"),Cw_m6:n("Cw_m6"),Iy_minor_m4:n("Iy_minor_m4"),J_m4:n("J_m4")},bearingInputs:{webBearingCondition:s.webBearingCondition,bearingDetailSource:s.bearingDetailSource,stiffenerType:s.stiffenerType,stiffenerSource:s.stiffenerSource,webPanelSource:s.webPanelSource},codeClassification:null,LTBResistance:null,webCripplingResistance:null});
 });
 return {success:issues.length===0&&rows.length===ids.length,analysisEnabled:false,memberCount:ids.length,checkedCount:rows.length,issues,results:rows,limitations:["این خروجی فقط نسبت‌های هندسی صفحه‌ای و کامل‌بودن ورودی‌های لازم برای بررسی پایداری را گزارش می‌کند؛ هیچ طبقه‌بندی مقطع یا مقاومت کمانش محاسبه نمی‌شود.","کنترل کمانش پیچشی‌ـ‌جانبی نیازمند روش آیین‌نامه‌ای منتخب، شرایط مهار واقعی، بارگذاری و محل اعمال بار، Cb معتبر، خواص مقطع و تحلیل پایداری است؛ این موارد در این مرحله به مقاومت تبدیل نمی‌شوند.","لهیدگی/کمانش موضعی جان و بارگذاری موضعی بال به طول بارگذاری، شعاع گوشه، نوع بار/تکیه‌گاه، سخت‌کننده، طول پنل جان و جزئیات ساخت نیاز دارد؛ هنوز مقاومت محاسبه نمی‌شود.","نسبت‌های نرمال‌شده b/t و h/tw فقط شاخص هندسی هستند و بدون حدود آیین‌نامه‌ای و شرایط تکیه‌گاهی طبقه‌بندی نمی‌شوند."]};
}
function templateFor(result){
 const members=(result?.members||[]).filter(m=>m.sectionKey==="craneRunwayGirder"||m.type==="craneRunwayGirder");
 if(!members.length)return {success:false,issues:["عضو تیر حمالی در نتیجه تحلیل برای ساخت الگو پیدا نشد."]};
 const blank={A_m2:"",Sy_m3:"",Sz_m3:"",Avy_m2:"",Avz_m2:"",J_m4:"",torsionRadius_m:"",Fy_MPa:"",source:"",geometrySource:"",shearAreaMethod:"",torsionMethod:"",d_m:"",bf_m:"",tw_m:"",tf_m:"",E_MPa:"",Lb_m:"",Cb:"",compressionFlangeRestraint:"",restraintSource:"",loadHeightFromShearCenter_m:"",Cw_m6:"",Iy_minor_m4:"",bearingLength_m:"",rootRadius_m:"",webPanelLength_m:"",bearingDetailSource:"",webBearingCondition:"",stiffenerType:"",stiffenerSource:"",webPanelSource:""};
 const data={};members.forEach(m=>{data[String(m.id)]={...blank};});
 return {success:true,memberCount:members.length,data};
}
function makeTemplate(){
 const latest=root.SteelCrane3DLoadTransfer?.getLastAnalysis?.();
 const r=templateFor(latest?.result),el=root.document?.getElementById?.("craneGirderLocalScreenJson");
 if(r.success&&el)el.value=JSON.stringify(r.data,null,2);
 const host=root.document?.getElementById?.("craneGirderLocalScreenResult");
 if(host)host.textContent=r.success?"الگوی "+r.memberCount+" عضو ساخته شد؛ مقادیر مقطع، فولاد و مراجع مستند را تکمیل کنید.":r.issues.join(" | ");
 return r;
}
function readUI(){
 const el=root.document?.getElementById?.("craneGirderLocalScreenJson");
 if(!el||!String(el.value||"").trim())return {};
 try{return JSON.parse(el.value);}catch(e){return {parseError:String(e.message||e)};}
}
function setData(d){const el=root.document?.getElementById?.("craneGirderLocalScreenJson");if(el)el.value=JSON.stringify(d||{},null,2);}
function run(){
 const host=root.document?.getElementById?.("craneGirderLocalScreenResult"),input=readUI();
 if(input.parseError){if(host)host.textContent="JSON ورودی نامعتبر است: "+input.parseError;return {success:false,issues:[input.parseError]};}
 const latest=root.SteelCrane3DLoadTransfer?.getLastAnalysis?.();
 if(!latest?.success){const r={success:false,analysisEnabled:false,issues:["ابتدا یک حالت بار جرثقیل را در قاب سه‌بعدی تحلیل کنید."]};if(host)host.textContent=JSON.stringify(r,null,2);return r;}
 const r=audit(latest.result,input);if(host)host.textContent=JSON.stringify(r,null,2);return r;
}
function runPlateStability(){
 const host=root.document?.getElementById?.("craneGirderLocalScreenResult"),input=readUI();
 if(input.parseError){if(host)host.textContent="JSON ورودی نامعتبر است: "+input.parseError;return {success:false,issues:[input.parseError]};}
 const r=plateStabilityAudit(input);if(host)host.textContent=JSON.stringify(r,null,2);return r;
}
function ensurePanel(){
 if(!root.document||root.document.getElementById("craneGirderLocalScreenPanel"))return;
 const main=root.document.querySelector("main");if(!main)return;
 const panel=root.document.createElement("section");panel.className="panel";panel.id="craneGirderLocalScreenPanel";
 panel.innerHTML='<div class="panel-title"><h3>غربال تنش اسمی موضعی تیر حمال</h3><span class="status">پس از تحلیل سه‌بعدی</span></div>'+
 '<div class="notice">پس از اجرای تحلیل یک حالت جرثقیل در قاب سه‌بعدی، مشخصات واقعی هر عضو تیر حمال را با کلید شناسه عضو وارد کنید. واحدها SI هستند. این ابزار فقط غربال تنش اسمی الاستیک است و کنترل کمانش، تنش موضعی جان/بال، خستگی و اتصالات نیست.</div>'+
 '<div class="field"><label for="craneGirderLocalScreenJson">مشخصات مقطع اعضا (JSON بر اساس شناسه عضو)</label><textarea id="craneGirderLocalScreenJson" rows="10" placeholder="{ &quot;شناسه-عضو&quot;: { &quot;A_m2&quot;: 0.01, &quot;Sy_m3&quot;: 0.0001, &quot;Sz_m3&quot;: 0.0002, &quot;Avy_m2&quot;: 0.005, &quot;Avz_m2&quot;: 0.005, &quot;J_m4&quot;: 1e-6, &quot;torsionRadius_m&quot;: 0.1, &quot;Fy_MPa&quot;: 240, &quot;source&quot;: &quot;...&quot;, &quot;geometrySource&quot;: &quot;...&quot;, &quot;shearAreaMethod&quot;: &quot;...&quot;, &quot;torsionMethod&quot;: &quot;...&quot; } }"></textarea></div>'+
 '<div class="button-grid"><button type="button" class="btn secondary" id="craneGirderLocalScreenTemplate">ساخت الگوی شناسه اعضا از تحلیل اخیر</button><button type="button" class="btn primary" id="craneGirderLocalScreenRun">اجرای غربال تنش اسمی</button><button type="button" class="btn secondary" id="craneGirderPlateStabilityRun">ممیزی هندسه صفحات، مهار جانبی و نشیمن</button></div><pre id="craneGirderLocalScreenResult" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
 const anchor=root.document.getElementById("crane3DLoadTransferPanel");if(anchor)anchor.insertAdjacentElement("afterend",panel);else main.appendChild(panel);
 root.document.getElementById("craneGirderLocalScreenTemplate").addEventListener("click",makeTemplate);
 root.document.getElementById("craneGirderLocalScreenRun").addEventListener("click",run);
 root.document.getElementById("craneGirderPlateStabilityRun").addEventListener("click",runPlateStability);
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:!!fn()});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const member={id:"G1",type:"craneRunwayGirder",sectionKey:"craneRunwayGirder",length:6,localEndForces:[10000,20000,30000,4000,5000,6000,-10000,-20000,-30000,-4000,-5000,-6000]};
 const section={A_m2:.01,Sy_m3:.0001,Sz_m3:.0002,Avy_m2:.005,Avz_m2:.005,J_m4:1e-6,torsionRadius_m:.1,Fy_MPa:240,source:"SEC-1",geometrySource:"DWG-1",shearAreaMethod:"section properties",torsionMethod:"Saint-Venant constant"};
 const r=audit({success:true,members:[member]},{G1:section});
 t("calculates both member-end demands",()=>r.success&&r.results[0].ends.length===2);
 t("creates a per-member data-entry template",()=>{const q=templateFor({members:[member,{...member,id:"G2"}]});return q.success&&q.memberCount===2&&!!q.data.G1&&!!q.data.G2&&q.data.G1.A_m2==="";});
 t("computes transparent SI normal and shear stress equations",()=>{const e=r.results[0].ends[0],sigma=10000/.01+5000/.0001+6000/.0002,tau=20000/.005+30000/.005+4000*.1/1e-6;return Math.abs(e.nominalUpperBound_Pa.normal-sigma)<1e-6&&Math.abs(e.nominalUpperBound_Pa.shear-tau)<1e-6;});
 t("absolute-force bound is independent of sign reversal",()=>{const b={...member,localEndForces:member.localEndForces.map(v=>-v)};return audit({success:true,members:[b]},{G1:section}).results[0].governingYieldScreenRatio===r.results[0].governingYieldScreenRatio;});
 t("rejects missing section modulus",()=>!audit({success:true,members:[member]},{G1:{...section,Sy_m3:0}}).success);
 t("rejects missing source traceability",()=>!audit({success:true,members:[member]},{G1:{...section,source:""}}).success);
 t("ignores non-runway members",()=>audit({success:true,members:[{...member,sectionKey:"column",type:"column"}]},{G1:section}).issues.some(x=>x.includes("پیدا نشد")));
 t("reports stress screen above yield",()=>audit({success:true,members:[{...member,localEndForces:member.localEndForces.map(v=>v*1e5)}]},{G1:section}).results[0].screenStatus==="nominal-elastic-screen-exceeds-Fy");
 t("plate and stability audit reports normalized ratios without code classification",()=>{const q=plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4"}});return q.success&&q.results[0].dimensionlessRatios.flangeOutstandOverThickness>0&&q.results[0].codeClassification===null&&q.results[0].LTBResistance===null;});
 t("plate and stability audit blocks missing restraint evidence",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",restraintSource:""}}).success);
 t("plate and stability audit blocks invalid plate geometry",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",d_m:.02,bf_m:.005}}).success);
 t("plate audit rejects unknown compression-flange restraint",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",compressionFlangeRestraint:"unknown"}}).success);
 t("plate audit requires root radius, stiffener and web-panel evidence",()=>{const q={d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4"};delete q.rootRadius_m;delete q.stiffenerSource;return !plateStabilityAudit({G1:q}).success;});
 t("plate audit rejects nonpositive Cb and unbraced length",()=>!plateStabilityAudit({G1:{d_m:.6,bf_m:.25,tw_m:.01,tf_m:.02,E_MPa:200000,Fy_MPa:235,Lb_m:3,Cb:1,compressionFlangeRestraint:"discrete",restraintSource:"DWG-1",loadHeightFromShearCenter_m:.1,Cw_m6:1e-7,Iy_minor_m4:1e-5,J_m4:1e-6,bearingLength_m:.12,rootRadius_m:.008,webPanelLength_m:1.5,bearingDetailSource:"DWG-2",webBearingCondition:"end reaction",stiffenerType:"pair",stiffenerSource:"DWG-3",webPanelSource:"DWG-4",Cb:0,Lb_m:0}}).success);
 t("keeps code approval disabled",()=>r.analysisEnabled===false);
 t("documents unmodeled local buckling and web crippling",()=>r.limitations.some(x=>x.includes("web crippling"))&&r.limitations.some(x=>x.includes("کمانش موضعی")));
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests,analysisEnabled:false,note:"Software regression only; not a code resistance verification."};
}
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",ensurePanel);else ensurePanel();}
root.SteelCraneGirderLocalScreen={audit,plateStabilityAudit,templateFor,makeTemplate,readUI,setData,run,runPlateStability,selfTest};
})(typeof window!=="undefined"?window:globalThis);


/* ===== steel2/js/tributary-audit.js ===== */
/* SAHROUD STEEL — Tributary geometry audit
 * Independent geometry audit only. Does not create loads or enable design eligibility.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const finite = v => Number.isFinite(Number(v));
  const close = (a,b,tol=1e-6) => Math.abs(a-b) <= tol*Math.max(1,Math.abs(a),Math.abs(b));

  function audit(model) {
    if (!model || !model.geometry || !Array.isArray(model.nodes) || !Array.isArray(model.members))
      throw new Error("مدل هندسی معتبر برای ممیزی سطح بارگیر دریافت نشد.");
    const g=model.geometry, members=model.members, nodes=model.nodes;
    const nodeById=new Map(nodes.map(n=>[n.id,n]));
    const frames=Array.isArray(g.frames)?g.frames:[];
    const length=Number(g.length), span=Number(g.span), rise=Number(g.rise), over=Number(g.roofOverhang||0);
    if (![length,span,rise,over].every(finite) || length<=0 || span<=0 || over<0)
      throw new Error("ابعاد هندسی مدل برای کنترل سطح بارگیر نامعتبر است.");

    const purlins=members.filter(m=>m.sectionKey==="roofPurlin");
    const girts=members.filter(m=>m.sectionKey==="wallGirt");
    const endGirts=members.filter(m=>m.sectionKey==="endGirt");
    const rafters=members.filter(m=>m.sectionKey==="rafter");
    const slope=Math.hypot(span/2,rise);
    const slopeOverhang=over/(span/2/slope);
    const expectedRoofArea=2*(slope+slopeOverhang)*(length+2*over);
    const purlinArea=purlins.reduce((sum,m)=>{
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return sum+(a&&b&&finite(m.tributaryWidth)?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*Number(m.tributaryWidth):0);
    },0);
    const purlinMissing=purlins.filter(m=>!(Number(m.tributaryWidth)>0) ||
      !m.lineLoads || !["dead","live","snow","wind"].every(k=>finite(m.lineLoads[k])));
    const ridgeMissing=purlins.filter(m=>m.side==="ridge" &&
      (!(Number(m.tributaryWidthLeft)>0)||!(Number(m.tributaryWidthRight)>0)||
       !finite(m.lineLoads?.windLeft)||!finite(m.lineLoads?.windRight)));
    const frameStations=new Set(frames.map(z=>Number(z).toFixed(7)));
    const rafterNodeIds=new Set();
    rafters.forEach(m=>{rafterNodeIds.add(m.start);rafterNodeIds.add(m.end);});
    const unsupportedPurlinEnds=[];
    purlins.forEach(m=>{
      [m.start,m.end].forEach(id=>{
        const n=nodeById.get(id);
        if(n && frameStations.has(Number(n.z).toFixed(7)) && !rafterNodeIds.has(id))
          unsupportedPurlinEnds.push({member:m.id,node:id,z:n.z});
      });
    });

    const girtArea=girts.reduce((sum,m)=>{
      const a=nodeById.get(m.start),b=nodeById.get(m.end);
      return sum+(a&&b&&finite(m.tributaryHeight)?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*Number(m.tributaryHeight):0);
    },0);
    const expectedWallArea=2*Number(g.height)*length;
    const girtRows=[...new Set(girts.map(m=>m.row))].length;
    const maxGirtTributaryHeight=Math.max(0,...girts.map(m=>Number(m.tributaryHeight)||0));
    const girtSpacing=Number(g.wallGirtSpacing||0);

    const endGirtInvalid=endGirts.filter(m=>!(Number(m.tributaryHeight)>0)||
      !finite(m.lineLoads?.windEnd)||!finite(m.lineLoads?.pressureKPa));
    const purlinClosureRatio=expectedRoofArea>0?purlinArea/expectedRoofArea:null;
    const wallClosureRatio=expectedWallArea>0?girtArea/expectedWallArea:null;
    const checks=[
      {id:"roof-area-closure",label:"بسته‌شدن سطح بارگیر سقف",ok:close(purlinArea,expectedRoofArea,1e-5),actualM2:purlinArea,expectedM2:expectedRoofArea},
      {id:"purlin-load-data",label:"کامل بودن مشخصات بار خطی پرلین‌ها",ok:purlins.length>0&&purlinMissing.length===0,affected:purlinMissing.length},
      {id:"ridge-two-sides",label:"وجود عرض بارگیر مستقل دو طرف در پرلین تاج",ok:ridgeMissing.length===0,affected:ridgeMissing.length},
      {id:"purlin-frame-support",label:"اشتراک گره پرلین با رفتر در محل قاب‌ها",ok:unsupportedPurlinEnds.length===0,affected:unsupportedPurlinEnds.length},
      {id:"wall-area-closure",label:"بسته‌شدن سطح بارگیر قیدهای طولی دیوار",ok:close(girtArea,expectedWallArea,1e-5),actualM2:girtArea,expectedM2:expectedWallArea},
      {id:"end-girt-inputs",label:"کامل بودن داده هندسی و بار قیدهای دیوار انتهایی",ok:endGirts.length>0&&endGirtInvalid.length===0,affected:endGirtInvalid.length}
    ];
    const warnings=[];
    if(girtRows && girtSpacing>0 && maxGirtTributaryHeight>1.5*girtSpacing)
      warnings.push("بیشینه ارتفاع بارگیر یک قید طولی ("+maxGirtTributaryHeight.toFixed(3)+" m) بیش از ۱٫۵ برابر فاصله اسمی قیدهاست؛ سهم انتقال بار به ستون‌ها، تیر لبه و تراز پایه باید با جزئیات واقعی پوشش و تکیه‌گاه‌ها بازبینی شود.");
    if(!close(purlinArea,expectedRoofArea,1e-5))
      warnings.push("سطح بارگیر تجمعی پرلین‌ها با سطح هندسی دو شیب سقف و پیش‌آمدگی‌ها برابر نیست.");
    if(!close(girtArea,expectedWallArea,1e-5))
      warnings.push("سطح بارگیر تجمعی قیدهای طولی با سطح ناخالص دو دیوار طولی برابر نیست؛ سهم ستون‌ها/تیرهای مرزی یا هندسه گریت‌ها باید بررسی شود.");
    return {
      schema:"sahroud-steel-tributary-geometry-audit",version:1,
      generatedAt:new Date().toISOString(),
      geometry:{spanM:span,lengthM:length,eavesHeightM:Number(g.height),riseM:rise,roofOverhangHorizontalM:over,slopeOverhangM:slopeOverhang,frameCount:frames.length},
      roof:{purlinMemberSegments:purlins.length,expectedAreaM2:expectedRoofArea,tributaryAreaM2:purlinArea,closureRatio:purlinClosureRatio,missingLoadRecords:purlinMissing.length,ridgeSegmentsMissingSideData:ridgeMissing.length,unsupportedFrameEnds:unsupportedPurlinEnds.length},
      longitudinalWalls:{girtSegments:girts.length,rows:girtRows,expectedGrossAreaM2:expectedWallArea,tributaryAreaM2:girtArea,closureRatio:wallClosureRatio,maxTributaryHeightM:maxGirtTributaryHeight},
      endWalls:{endGirtSegments:endGirts.length,invalidSegments:endGirtInvalid.length,rafterEndWallMembers:rafters.filter(m=>m.axis==="endwall").length},
      checks,warnings,
      designEligible:false,loadTransferEnabled:false,
      note:"این ممیزی فقط سازگاری هندسی و بسته‌شدن مساحت را می‌سنجد؛ تأیید مسیر بار، تکیه‌گاه واقعی پوشش، فشار باد، مقاومت یا ایمنی سازه نیست."
    };
  }

  function render() {
    if($("tributaryAuditPanel"))return;
    const anchor=$("shedLayoutPanel")||$("windZoneGeometryPanel");
    if(!anchor||!anchor.parentNode)return;
    const panel=document.createElement("section");
    panel.className="panel";panel.id="tributaryAuditPanel";
    panel.innerHTML='<div class="panel-title"><h3>ممیزی مستقل سطوح بارگیر اعضا</h3><span class="status">کنترل هندسی</span></div>'+
      '<div class="notice">این ابزار سطح بارگیر تجمعی پرلین‌ها و قیدهای دیوار را با مساحت هندسی پوسته مقایسه می‌کند و اشتراک گره‌های پرلین و رفتر را می‌سنجد. هیچ بار جدیدی تولید یا به حل‌گر منتقل نمی‌شود.</div>'+
      '<button type="button" class="btn secondary" id="btnRunTributaryAudit">اجرای ممیزی سطوح بارگیر</button>'+
      '<div id="tributaryAuditResult" class="notice" aria-live="polite">پس از تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
    anchor.parentNode.insertBefore(panel,anchor.nextSibling);
    $("btnRunTributaryAudit").addEventListener("click",()=>{
      const box=$("tributaryAuditResult");
      try{
        const model=window.SteelStructuralModel?.build?.();
        const result=audit(model);
        window.SteelTributaryAudit.lastResult=result;
        const lines=result.checks.map(c=>(c.ok?"✓ ":"⚠ ")+c.label+
          (c.actualM2!==undefined?" — محاسبه: "+c.actualM2.toFixed(3)+" m²؛ مرجع هندسی: "+c.expectedM2.toFixed(3)+" m²":"")+
          (c.affected?" — موارد نیازمند بررسی: "+c.affected:""));
        box.textContent="ممیزی هندسی انجام شد؛ "+result.checks.filter(c=>c.ok).length+" از "+result.checks.length+" کنترل برقرار است.\n"+
          lines.join("\n")+
          "\n\nسطح سقف: "+result.roof.tributaryAreaM2.toFixed(3)+" / "+result.roof.expectedAreaM2.toFixed(3)+" m²"+
          "\nسطح دیوارهای طولی: "+result.longitudinalWalls.tributaryAreaM2.toFixed(3)+" / "+result.longitudinalWalls.expectedGrossAreaM2.toFixed(3)+" m²"+
          "\nقیدهای طولی: "+result.longitudinalWalls.girtSegments+" قطعه در "+result.longitudinalWalls.rows+" ردیف"+
          (result.warnings.length?"\n\nهشدارها:\n"+result.warnings.join("\n"):"\n\nهشدار هندسی اضافه‌ای ثبت نشد.")+
          "\n\nاین نتیجه صرفاً ممیزی هندسی است و تأیید طراحی یا ایمنی نیست.";
        box.style.color=result.checks.every(c=>c.ok)&&!result.warnings.length?"#166534":"#92400e";
      }catch(e){box.textContent="ممیزی انجام نشد: "+e.message;box.style.color="#b45309";}
    });
  }
  window.SteelTributaryAudit={audit,getLastResult:()=>window.SteelTributaryAudit.lastResult||null,lastResult:null,designEligible:false,loadTransferEnabled:false};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();


/* ===== steel2/js/load-path-audit.js ===== */
/* SAHROUD STEEL — Load-path coverage audit
 * Read-only topology and line-load audit. Never mutates loads or solver state.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const n=v=>Number.isFinite(Number(v))?Number(v):0;
 const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b));
 function audit(model){
  if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر در دسترس نیست.");
  const g=model.geometry, nodes=new Map(model.nodes.map(x=>[x.id,x])), members=model.members;
  const groups={roofPurlin:members.filter(m=>m.sectionKey==="roofPurlin"),rafter:members.filter(m=>m.sectionKey==="rafter"),wallGirt:members.filter(m=>m.sectionKey==="wallGirt"),column:members.filter(m=>m.sectionKey==="column"),endGirt:members.filter(m=>m.sectionKey==="endGirt"),endPost:members.filter(m=>m.sectionKey==="endPost"),roofEdge:members.filter(m=>m.sectionKey==="roofEdge")};
  const memberLength=m=>{const a=nodes.get(m.start),b=nodes.get(m.end);return a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z):0;};
  const endpoints=(m)=>[nodes.get(m.start),nodes.get(m.end)];
  const hasSharedAtNode=(m,p,keys)=>!!p&&members.some(q=>q.id!==m.id&&keys.includes(q.sectionKey)&&(q.start===p.id||q.end===p.id));
  const lineCoverage=(arr,keys)=>arr.filter(m=>keys.every(k=>Number.isFinite(Number(m.lineLoads?.[k]))));
  const integrate=(arr,key)=>arr.reduce((s,m)=>s+n(m.lineLoads?.[key])*memberLength(m),0);
  const purlins=groups.roofPurlin, girts=groups.wallGirt, endGirts=groups.endGirt;
  const purlinSupported=purlins.filter(m=>endpoints(m).every(p=>hasSharedAtNode(m,p,["rafter","roofEdge"])));
  const girtSupported=girts.filter(m=>endpoints(m).every(p=>hasSharedAtNode(m,p,["column"])));
  const endGirtSupported=endGirts.filter(m=>endpoints(m).every(p=>hasSharedAtNode(m,p,["endPost","rafter"])));
  const endWallTriangleArea=Number(g.span)*Number(g.rise)/2;
  const topGirtHeight=Math.max(0,...endGirts.map(m=>n(m.row)));
  const purlinLoads=lineCoverage(purlins,["dead","live","snow","wind","windLeft","windRight"]);
  const girtLoads=lineCoverage(girts,["wind"]);
  const endLoads=lineCoverage(endGirts,["windEnd","pressureKPa"]);
  const raftersWithDirectGravity=groups.rafter.filter(m=>n(m.lineLoads?.dead)!==0||n(m.lineLoads?.live)!==0||n(m.lineLoads?.snow)!==0);
  const results=[
   {id:"roof-load-carriers",label:"بارهای سطحی سقف به پرلین‌ها اختصاص یافته‌اند",ok:purlins.length>0&&purlinLoads.length===purlins.length,detail:purlinLoads.length+" از "+purlins.length+" قطعه پرلین دارای رکورد کامل بار هستند"},
   {id:"purlin-to-rafter",label:"انتهای پرلین‌ها به گره مشترک رفتر می‌رسند",ok:purlinSupported.length===purlins.length,detail:purlinSupported.length+" از "+purlins.length+" قطعه پرلین؛ کنترل بر اساس شناسه گره مشترک"},
   {id:"wall-load-carriers",label:"بار باد دیوار طولی به قیدهای دیوار اختصاص یافته است",ok:girts.length>0&&girtLoads.length===girts.length,detail:girtLoads.length+" از "+girts.length+" قطعه قید دارای رکورد باد هستند"},
   {id:"girt-to-column",label:"دو انتهای قیدهای طولی با ستون قاب گره مشترک دارند",ok:girtSupported.length===girts.length,detail:girtSupported.length+" از "+girts.length+" قطعه قید"},
   {id:"endwall-load-carriers",label:"بار باد دیوار انتهایی به قیدهای انتهایی اختصاص یافته است",ok:endGirts.length>0&&endLoads.length===endGirts.length,detail:endLoads.length+" از "+endGirts.length+" قطعه قید انتهایی"},
   {id:"endgirt-supports",label:"انتهای قیدهای دیوار انتهایی به ستونک/رفتر متصل است",ok:endGirtSupported.length===endGirts.length,detail:endGirtSupported.length+" از "+endGirts.length+" قطعه قید انتهایی"}
  ];
  const warnings=[];
  if(raftersWithDirectGravity.length===0)warnings.push("رفترها بار ثقلی سطحی مستقیم ندارند؛ انتقال بار سقف باید از مسیر پرلین‌ها و گره‌های مشترک پرلین–رفتر انجام شود. این ممیزی فقط اشتراک هندسی گره را کنترل می‌کند، نه صحت جزئیات اتصال.");
  if(endGirts.length===0||!groups.endPost.length)warnings.push("مسیر انتقال بار دیوار انتهایی به ستونک‌ها/قاب انتهایی کامل قابل ارزیابی نیست.");
  warnings.push("سطح مثلثی بالای دیوار انتهایی در مدل بارگذاری فعلی پوشش داده نشده است؛ مساحت هندسی این قسمت برای هر انتها "+endWallTriangleArea.toFixed(3)+" m² است (مجموع دو انتها "+(2*endWallTriangleArea).toFixed(3)+" m²).");
  warnings.push("تیر لبه پیش‌آمدگی، پوشش سقف، اتصالات واقعی ورق به پرلین، کلیپس‌ها، پیچ‌ها، کشش/فشار مهاربندها و انتقال نیرو به فونداسیون در این ممیزی به‌صورت کامل مدل نشده‌اند.");
  const integrated={
   roofDeadKN:integrate(purlins,"dead"),roofLiveKN:integrate(purlins,"live"),roofSnowKN:integrate(purlins,"snow"),
   roofWindLeftKN:integrate(purlins,"windLeft"),roofWindRightKN:integrate(purlins,"windRight"),
   sideWallWindKN:integrate(girts,"wind"),endWallFrontWindKN:integrate(endGirts.filter(m=>m.endFace==="front"),"windEnd"),
   endWallRearWindKN:integrate(endGirts.filter(m=>m.endFace==="rear"),"windEnd")
  };
  return {schema:"sahroud-steel-load-path-audit",version:1,generatedAt:new Date().toISOString(),
   counts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),
   supportConnectivity:{purlinToRafter:purlinSupported.length+"/"+purlins.length,wallGirtToColumn:girtSupported.length+"/"+girts.length,endGirtToEndPostOrRafter:endGirtSupported.length+"/"+endGirts.length},
   loadRecordCoverage:{purlin:purlinLoads.length+"/"+purlins.length,wallGirt:girtLoads.length+"/"+girts.length,endGirt:endLoads.length+"/"+endGirts.length},
   integratedLineLoadTotalsKN:integrated,
   knownUncoveredEndWallGable:{areaEachEndM2:endWallTriangleArea,totalAreaM2:2*endWallTriangleArea,status:"not-loaded"},
   checks:results,warnings,designEligible:false,loadTransferEnabled:false,
   note:"برآورد انتگرال بار خطی روی اعضای بارگیر و توپولوژی گره‌هاست؛ جایگزین تحلیل مسیر بار کامل، کنترل اتصال، پوشش سطحی یا کنترل آیین‌نامه‌ای نیست."};
 }
 function render(){
  if($("loadPathAuditPanel"))return;
  const anchor=$("tributaryAuditPanel")||$("windZoneGeometryPanel");
  if(!anchor?.parentNode)return;
  const panel=document.createElement("section");panel.className="panel";panel.id="loadPathAuditPanel";
  panel.innerHTML='<div class="panel-title"><h3>ممیزی مسیر انتقال بار</h3><span class="status">فقط‌خواندنی</span></div><div class="notice">بررسی می‌کند بارهای ورودی در کدام گروه اعضا ثبت شده‌اند و آیا گره‌های انتهایی اعضای بارگیر به اعضای تکیه‌گاهی مشترک متصل هستند. هیچ ورودی یا نتیجه تحلیلی را تغییر نمی‌دهد.</div><button type="button" class="btn secondary" id="btnRunLoadPathAudit">اجرای ممیزی مسیر بار</button><div id="loadPathAuditResult" class="notice" aria-live="polite">پس از تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
  anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  $("btnRunLoadPathAudit").addEventListener("click",()=>{
   const box=$("loadPathAuditResult");
   try{
    const result=audit(window.SteelStructuralModel?.build?.());window.SteelLoadPathAudit.lastResult=result;
    const lines=result.checks.map(c=>(c.ok?"✓ ":"⚠ ")+c.label+" — "+c.detail);
    const totals=Object.entries(result.integratedLineLoadTotalsKN).map(([k,v])=>k+": "+v.toFixed(3)+" kN").join("\n");
    box.textContent="ممیزی مسیر بار: "+result.checks.filter(c=>c.ok).length+" از "+result.checks.length+" کنترل برقرار است.\n"+lines.join("\n")+
     "\n\nبرآورد انتگرال بارهای خطی ثبت‌شده (kN):\n"+totals+
     "\n\nناحیه مثلثی دیوار انتهاییِ بدون بارگذاری: "+result.knownUncoveredEndWallGable.areaEachEndM2.toFixed(3)+" m² در هر انتها؛ مجموع "+result.knownUncoveredEndWallGable.totalAreaM2.toFixed(3)+" m²"+
     "\n\nمحدودیت‌ها:\n"+result.warnings.join("\n")+
     "\n\nاین گزارش ممیزی توپولوژی و داده‌های بار است؛ تأیید طراحی یا ایمنی نیست.";
    box.style.color=result.checks.every(c=>c.ok)?"#92400e":"#92400e";
   }catch(e){box.textContent="ممیزی مسیر بار انجام نشد: "+e.message;box.style.color="#b45309";}
  });
 }
 window.SteelLoadPathAudit={audit,getLastResult:()=>window.SteelLoadPathAudit.lastResult||null,lastResult:null,designEligible:false,loadTransferEnabled:false};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();


/* ===== steel2/js/end-wall-audit.js ===== */
/* SAHROUD STEEL — End-wall / gable geometry audit
 * Read-only geometry and topology audit. No load generation or solver changes.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b));
 function audit(model){
  if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر در دسترس نیست.");
  const g=model.geometry,span=num(g.span),height=num(g.height),rise=num(g.rise);
  if(!(span>0&&height>0&&rise>=0))throw Error("ابعاد دهانه، ارتفاع و خیز بام معتبر نیست.");
  const nodes=new Map(model.nodes.map(n=>[n.id,n])),members=model.members;
  const endPosts=members.filter(m=>m.sectionKey==="endPost");
  const endGirts=members.filter(m=>m.sectionKey==="endGirt");
  const topChords=members.filter(m=>m.sectionKey==="rafter"&&["front","rear"].includes(m.gableChordFace));
  const faces=["front","rear"];
  const roofY=x=>height+rise*(x<=span/2?x/(span/2):(span-x)/(span/2));
  const topGirtY=endGirts.reduce((v,m)=>Math.max(v,num(nodes.get(m.start)?.y),num(nodes.get(m.end)?.y)),0);
  // Exact integral of max(roofY(x)-topGirtY,0) over the two roof slopes.
  const upperBandArea=(()=>{
   if(topGirtY<=height)return span*(height-topGirtY)+span*rise/2;
   if(topGirtY>=height+rise)return 0;
   const d=height+rise-topGirtY;
   return span*d*d/(2*rise);
  })();
  const fullGableTriangleArea=span*rise/2;
  const faceResults=faces.map(face=>{
   const posts=endPosts.filter(m=>m.endFace===face);
   const chords=topChords.filter(m=>m.gableChordFace===face);
   const girts=endGirts.filter(m=>m.endFace===face);
   const postGroups=new Map();
   posts.forEach(m=>{const key=String(m.post);if(!postGroups.has(key))postGroups.set(key,[]);postGroups.get(key).push(m);});
   const postTopNodeIds=[];
   const postsReachingRoof=Array.from(postGroups.values()).filter(chain=>{
    const top=chain.flatMap(m=>[nodes.get(m.start),nodes.get(m.end)]).filter(n=>
     n&&near(n.y,roofY(n.x))&&near(n.z,face==="front"?0:num(g.length)));
    if(top.length)postTopNodeIds.push(top[0].id);
    return top.length>0;
   });
   const chordLength=chords.reduce((s,m)=>{
    const a=nodes.get(m.start),b=nodes.get(m.end);
    return s+(a&&b?Math.hypot(b.x-a.x,b.y-a.y):0);
   },0);
   const expectedChordLength=2*Math.hypot(span/2,rise);
   const chordClosure=expectedChordLength>0?chordLength/expectedChordLength:0;
   const chordAdj=new Map(),chordNodeIds=new Set();
   chords.forEach(m=>{chordNodeIds.add(m.start);chordNodeIds.add(m.end);
    if(!chordAdj.has(m.start))chordAdj.set(m.start,new Set());if(!chordAdj.has(m.end))chordAdj.set(m.end,new Set());
    chordAdj.get(m.start).add(m.end);chordAdj.get(m.end).add(m.start);
   });
   const visited=new Set(),stack=chordNodeIds.size?[chordNodeIds.values().next().value]:[];
   while(stack.length){const id=stack.pop();if(visited.has(id))continue;visited.add(id);(chordAdj.get(id)||[]).forEach(next=>{if(!visited.has(next))stack.push(next);});}
   const chordConnected=chordNodeIds.size>0&&visited.size===chordNodeIds.size&&Array.from(chordAdj.values()).filter(v=>v.size===1).length===2;
   const postTopOnChord=postTopNodeIds.every(id=>chordNodeIds.has(id));
   const missingPostTops=postGroups.size-postsReachingRoof.length;
   return {face,endPostSegments:posts.length,endGirtSegments:girts.length,gableTopChordSegments:chords.length,
    postsReachingRoofline:postsReachingRoof.length,postCount:postGroups.size,missingPostTops,
    topChordLengthM:chordLength,expectedTopChordLengthM:expectedChordLength,
    topChordLengthRatio:chordClosure,chordConnected,postTopOnChord,
    topologyOk:posts.length>0&&chords.length>0&&missingPostTops===0&&near(chordClosure,1,1e-5)&&chordConnected&&postTopOnChord};
  });
  const areaChecks=[
   {id:"gable-triangle",areaM2:fullGableTriangleArea,formula:"span × rise / 2",status:"geometry-only"},
   {id:"above-highest-end-girt",areaM2:upperBandArea,formula:"integral(max(roofY(x) − highest end-girt elevation, 0))",status:"not-loaded"}
  ];
  const warnings=[
   "مدل هندسی، وجود ستونک‌های قائم و وتر بالایی را نشان می‌دهد؛ اما وجود ورق پوشش، زیرسازی واقعی، نوع دهانه‌گیری ورق و اتصال ورق به ستونک/قید/وتر را اثبات نمی‌کند.",
   "مساحت بالای آخرین قید افقی فقط بخش مثلثی نیست؛ نوار مستطیلی بین آخرین قید و خط لبه بام نیز در مساحت محاسبه شده است.",
   "هیچ فشار باد یا بار سطحی به endPost، endGirt یا رفتر انتهایی منتقل نشده است. بارگذاری ناحیه فوقانی تا تکمیل مدل پوشش و مسیر اتصال غیرفعال می‌ماند."
  ];
  if(faceResults.some(x=>!x.topologyOk))warnings.push("پیوستگی هندسی وتر بالایی یا رسیدن ستونک‌ها به خط بام در یک یا هر دو انتها کامل نیست؛ جزئیات توپولوژی باید اصلاح شود.");
  return {schema:"sahroud-steel-end-wall-audit",version:1,geometry:{spanM:span,eavesHeightM:height,riseM:rise,highestEndGirtElevationM:topGirtY},
   areasPerEndM2:areaChecks,faces:faceResults,
   totalUpperBandAreaBothEndsM2:2*upperBandArea,
   checks:[{id:"front-gable-topology",ok:faceResults[0].topologyOk,detail:"کنترل اعضای انتهایی جلو بر اساس شناسه گره و طول وتر"},
    {id:"rear-gable-topology",ok:faceResults[1].topologyOk,detail:"کنترل اعضای انتهایی عقب بر اساس شناسه گره و طول وتر"}],
   warnings,designEligible:false,loadTransferEnabled:false,
   note:"این ممیزی هندسه و توپولوژی است؛ کنترل بارگیر پوشش، سختی/مقاومت اتصالات، پایداری، مقاومت اعضا و ضوابط باد را انجام نمی‌دهد."};
 }
 function render(){
  if($("endWallAuditPanel"))return;
  const anchor=$("loadPathAuditPanel")||$("tributaryAuditPanel")||$("windZoneGeometryPanel");
  if(!anchor?.parentNode)return;
  const panel=document.createElement("section");panel.className="panel";panel.id="endWallAuditPanel";
  panel.innerHTML='<div class="panel-title"><h3>ممیزی هندسه دیوار انتهایی و گابل</h3><span class="status">فقط‌خواندنی</span></div>'+
   '<div class="notice">مساحت واقعی ناحیه بالای آخرین قید افقی را با احتساب نوار مستطیلی زیر خط بام و مثلث زیر شیب محاسبه می‌کند؛ همچنین پیوستگی ستونک‌ها و وتر بالایی را کنترل می‌کند. هیچ باری به حل‌گر اضافه نمی‌شود.</div>'+
   '<button type="button" class="btn secondary" id="btnRunEndWallAudit">اجرای ممیزی دیوار انتهایی</button>'+
   '<div id="endWallAuditResult" class="notice" aria-live="polite">پس از تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
  anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  $("btnRunEndWallAudit").addEventListener("click",()=>{
   const box=$("endWallAuditResult");
   try{
    const result=audit(window.SteelStructuralModel?.build?.());
    window.SteelEndWallAudit.lastResult=result;
    const areas=result.areasPerEndM2.map(a=>a.id+": "+a.areaM2.toFixed(3)+" m² در هر انتها").join("\n");
    const faces=result.faces.map(f=>f.face+": ستونک‌ها "+f.postsReachingRoofline+"/"+f.postCount+
     " به خط بام می‌رسند؛ وتر بالایی "+f.topChordLengthM.toFixed(3)+"/"+f.expectedTopChordLengthM.toFixed(3)+" m؛ پیوستگی وتر: "+
     (f.chordConnected?"برقرار":"ناقص")+"؛ اتصال گره رأس ستونک‌ها به وتر: "+(f.postTopOnChord?"برقرار":"ناقص")+"؛ "+
     (f.topologyOk?"توپولوژی هندسی برقرار":"نیازمند اصلاح")).join("\n");
    box.textContent="ممیزی گابل — "+result.geometry.spanM.toFixed(2)+" m دهانه، "+
     result.geometry.eavesHeightM.toFixed(2)+" m ارتفاع لبه و "+
     result.geometry.riseM.toFixed(2)+" m خیز بام.\n"+
     "ارتفاع آخرین قید: "+result.geometry.highestEndGirtElevationM.toFixed(3)+" m\n"+
     areas+"\nمساحت ناحیه بالای آخرین قید در دو انتها: "+
     result.totalUpperBandAreaBothEndsM2.toFixed(3)+" m²\n\n"+faces+
     "\n\nمحدودیت‌ها:\n"+result.warnings.join("\n")+
     "\n\nبارگذاری ناحیه فوقانی و انتقال آن به حل‌گر: غیرفعال.";
    box.style.color=result.checks.every(c=>c.ok)?"#92400e":"#b45309";
   }catch(e){box.textContent="ممیزی دیوار انتهایی انجام نشد: "+e.message;box.style.color="#b45309";}
  });
 }
  function selfTest(){
  const nodes=[],members=[];
  ["front","rear"].forEach((face,fi)=>{
   const z=fi===0?0:20, ids=[0,5,10].map((x,i)=>"G_"+face+"_"+i);
   [0,5,10].forEach((x,i)=>nodes.push({id:ids[i],x,y:i===1?7:5,z,kind:"endwall-head"}));
   members.push({id:"C1_"+face,start:ids[0],end:ids[1],sectionKey:"rafter",gableChordFace:face});
   members.push({id:"C2_"+face,start:ids[1],end:ids[2],sectionKey:"rafter",gableChordFace:face});
   const base="B_"+face;nodes.push({id:base,x:5,y:0,z,kind:"endwall-base"});
   members.push({id:"P_"+face,post:1,endFace:face,start:base,end:ids[1],sectionKey:"endPost"});
  });
  const result=audit({geometry:{span:10,length:20,height:5,rise:2},nodes,members});
  return {passed:result.faces.filter(x=>x.topologyOk).length,total:2,failed:result.faces.filter(x=>!x.topologyOk).length,faces:result.faces};
 }
window.SteelEndWallAudit={audit,getLastResult:()=>window.SteelEndWallAudit.lastResult||null,lastResult:null,designEligible:false,loadTransferEnabled:false,selfTest};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();

/* ===== steel2/js/masonry-wall-audit.js ===== */
/* SAHROUD STEEL — Masonry wall quantity and restraint-data audit
 * Read-only estimate. No gravity, wind, restraint, or solver loads are generated.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const n=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN;};
 const fmt=v=>Number(v).toFixed(3);
 const names={front:"انتهایی جلو",rear:"انتهایی عقب",left:"طولی چپ",right:"طولی راست"};
 const materialNames={brick:"آجرچینی","metal-sheet":"ورق فلزی","sandwich-panel":"ساندویچ‌پنل",other:"سیستم دیگر"};
 function audit(model){
  if(!model||!model.geometry||!Array.isArray(model.members))throw Error("ابتدا مدل هندسی معتبر سوله را بسازید.");
  const g=model.geometry,span=n(g.span),length=n(g.length),height=n(g.height),rise=n(g.rise);
  if(!(span>0&&length>0&&height>0&&rise>=0))throw Error("ابعاد هندسی سوله معتبر نیست.");
  const brief=window.SteelDesignCore?.getData?.();
  if(!brief)throw Error("مبانی طراحی و نوع دیوارها در دسترس نیست.");
  const walls=brief.wallEnvelope||{},m=brief.masonry||{};
  const openings=window.SteelOpenings?.getData?.()||{};
  const tmm=n(m.thicknessMm),gamma=n(m.unitWeightKNm3);
  const thicknessM=tmm>0?tmm/1000:NaN;
  const weightInputsValid=Number.isFinite(thicknessM)&&thicknessM>0&&Number.isFinite(gamma)&&gamma>0;
  const rows=[];
  const warnings=[];
  let totalGross=0,totalOpenings=0,totalNet=0,totalWeight=0,brickFaceCount=0;
  ["front","rear","left","right"].forEach(face=>{
   const w=walls[face]||{material:"brick",orientation:"vertical"};
   const brick=w.material==="brick";
   const gross=face==="front"||face==="rear"?(span*height+span*rise/2):(length*height);
   const op=openings[face]||{enabled:false};
   let openingArea=0,openingValid=true,openingNote="بدون بازشوی ثبت‌شده";
   if(op.enabled){
    const ow=n(op.width),oh=n(op.height),pos=face==="front"||face==="rear"?0:n(op.position);
    const run=face==="front"||face==="rear"?span:length;
    if(!(ow>0&&oh>0&&Number.isFinite(pos)&&pos>=0&&pos+ow<=run+1e-6&&oh<=height+1e-6)){
     openingValid=false;
     openingNote="ابعاد/موقعیت بازشو خارج از محدوده مستطیلی قابل کسر است؛ مساحت آن کسر نشد";
     warnings.push(names[face]+": بازشو برای محاسبه مساحت خالص نیازمند اصلاح است.");
    }else{
     openingArea=ow*oh;
     openingNote="بازشوی ثبت‌شده "+fmt(openingArea)+" m² از مساحت کسر شد";
    }
   }
   const net=Math.max(0,gross-openingArea);
   const weight=brick&&weightInputsValid?net*thicknessM*gamma:null;
   const candidateCount=face==="left"||face==="right"
    ?model.members.filter(x=>x.sectionKey==="wallGirt"&&x.side===face).length
    :model.members.filter(x=>x.sectionKey==="endGirt"&&x.endFace===face).length;
   rows.push({face,material:w.material,orientation:w.orientation,grossAreaM2:gross,openingAreaM2:openingArea,netAreaM2:net,weightKN:weight,candidateSteelSecondaryMembers:candidateCount,openingValid,openingNote});
   if(brick){
    brickFaceCount++;totalGross+=gross;totalOpenings+=openingArea;totalNet+=net;
    if(weight!==null)totalWeight+=weight;
   }
  });
  if(brickFaceCount===0)warnings.push("در هیچ‌یک از چهار وجه دیوار آجری انتخاب نشده است؛ ممیزی وزن بنایی کاربردی ندارد.");
  if(!Number.isFinite(tmm)||tmm<=0)warnings.push("ضخامت دیوار آجری وارد نشده است؛ وزن دیوار محاسبه نشد.");
  if(!Number.isFinite(gamma)||gamma<=0)warnings.push("وزن مخصوص حجمی مصالح بنایی وارد نشده است؛ وزن دیوار محاسبه نشد.");
  if(m.restraintSystem==="unknown")warnings.push("روش مهار دیوار به قاب یا زیرسازی مشخص نشده است.");
  const hs=n(m.horizontalTieSpacingM),vs=n(m.verticalTieSpacingM);
  if(!(hs>0))warnings.push("فاصله قائم مهارهای افقی ثبت نشده است.");
  if(!(vs>0))warnings.push("فاصله افقی مهارهای قائم ثبت نشده است.");
  warnings.push("تعداد قیدهای فولادی فقط شمارش هندسی اعضای بالقوه است؛ اتصال دیوار آجری به آن‌ها و ظرفیت مهار اثبات نشده است.");
  warnings.push("کنترل برون‌صفحه، ترک‌خوردگی، لغزش، واژگونی، لاغری، کلاف‌بندی، جزئیات وال‌پست/اتصال و ضوابط لرزه‌ای انجام نشده است.");
  warnings.push("مساحت بازشوها فقط در صورت ثبت ابعاد معتبر و قرارگیری کامل در محدوده مستطیلی دیوار کسر شده است؛ بازشوهای نامعتبر کسر نشده‌اند.");
  const allMasonryInputs=weightInputsValid&&m.restraintSystem!=="unknown"&&hs>0&&vs>0;
  return {
   geometry:{spanM:span,lengthM:length,eavesHeightM:height,riseM:rise},
   masonryInputs:{thicknessMm:Number.isFinite(tmm)?tmm:null,unitWeightKNm3:Number.isFinite(gamma)?gamma:null,restraintSystem:m.restraintSystem||"unknown",horizontalTieSpacingM:Number.isFinite(hs)?hs:null,verticalTieSpacingM:Number.isFinite(vs)?vs:null},
   faces:rows,
   totals:{brickFaceCount,grossAreaM2:totalGross,openingAreaM2:totalOpenings,netAreaM2:totalNet,estimatedSelfWeightKN:weightInputsValid?totalWeight:null},
   candidateSteelSecondaryMembers:rows.reduce((s,r)=>s+(r.material==="brick"?r.candidateSteelSecondaryMembers:0),0),
   inputCompleteness:allMasonryInputs,
   designEligible:false,loadTransferEnabled:false,
   warnings
  };
 }
 function render(){
  if($("masonryWallAuditPanel"))return;
  const anchor=$("endWallAuditPanel")||$("loadPathAuditPanel")||$("engineeringBriefPanel");
  const panel=document.createElement("section");
  panel.id="masonryWallAuditPanel";panel.className="panel";
  panel.innerHTML='<div class="panel-title"><h3>ممیزی مستقل دیوار آجری و مهار آن</h3><span class="status">فقط محاسبه و کنترل داده‌ها</span></div>'+
   '<div class="notice">این ممیزی مساحت دیوارهای آجری و در صورت ورود ضخامت و وزن مخصوص، وزن تقریبی آن‌ها را محاسبه می‌کند. هنوز هیچ بار مرده یا باد به مدل سازه منتقل نمی‌شود.</div>'+
   '<button type="button" class="btn primary" id="btnRunMasonryWallAudit">اجرای ممیزی دیوار آجری</button>'+
   '<div class="notice" id="masonryWallAuditResult" aria-live="polite">پس از تکمیل مشخصات دیوار و تولید مدل هندسی، ممیزی را اجرا کنید.</div>';
  if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  else document.querySelector("main")?.appendChild(panel);
  $("btnRunMasonryWallAudit").addEventListener("click",()=>{
   const out=$("masonryWallAuditResult");
   try{
    const r=audit(window.SteelStructuralModel?.build?.());
    window.SteelMasonryWallAudit.lastResult=r;
    const lines=r.faces.filter(x=>x.material==="brick").map(x=>{
     const wt=x.weightKN===null?"وزن: نامشخص":("وزن تقریبی: "+fmt(x.weightKN)+" kN");
     return names[x.face]+": مساحت ناخالص "+fmt(x.grossAreaM2)+"؛ بازشو "+fmt(x.openingAreaM2)+"؛ خالص "+fmt(x.netAreaM2)+" m²؛ "+wt+"؛ اعضای فولادی بالقوه مجاور: "+x.candidateSteelSecondaryMembers+"؛ "+x.openingNote;
    });
    out.textContent="نتیجه ممیزی دیوار آجری\n"+lines.join("\n")+
     "\n\nجمع مساحت ناخالص: "+fmt(r.totals.grossAreaM2)+" m²"+
     "\nجمع بازشوهای معتبر: "+fmt(r.totals.openingAreaM2)+" m²"+
     "\nجمع مساحت خالص: "+fmt(r.totals.netAreaM2)+" m²"+
     "\nوزن تقریبی کل دیوارهای آجری: "+(r.totals.estimatedSelfWeightKN===null?"قابل محاسبه نیست":fmt(r.totals.estimatedSelfWeightKN)+" kN")+
     "\n\nکامل‌بودن داده‌های اولیه مهار: "+(r.inputCompleteness?"ورودی‌های اولیه ثبت شده؛ کنترل مهندسی همچنان لازم است":"ناقص")+
     "\n\nمحدودیت‌ها:\n"+r.warnings.join("\n")+
     "\n\nانتقال بار به حل‌گر: غیرفعال؛ designEligible=false.";
    out.style.color="#92400e";
   }catch(e){out.textContent="ممیزی اجرا نشد: "+e.message;out.style.color="#b45309";}
  });
 }
 document.addEventListener("DOMContentLoaded",render);
 window.SteelMasonryWallAudit={audit,lastResult:null};
})();


/* ===== steel2/js/quantity-takeoff.js ===== */
/* SAHROUD STEEL — Bill of quantities and material takeoff
 * Quantities are estimates from current model geometry and user-entered material data.
 * Does not infer steel mass, reinforcement, mortar mix components, or connection quantities.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id), num=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN;};
 const fmt=x=>Number(x).toFixed(3);
 const labels={front:"دیوار انتهایی جلو",rear:"دیوار انتهایی عقب",left:"دیوار طولی چپ",right:"دیوار طولی راست"};
 const materials={brick:"آجرچینی","metal-sheet":"ورق فلزی","sandwich-panel":"ساندویچ‌پنل",other:"سیستم دیگر"};
 function calculate(model){
  if(!model?.geometry||!Array.isArray(model.members))throw Error("ابتدا مدل هندسی سوله را تولید کنید.");
  const g=model.geometry,span=num(g.span),length=num(g.length),height=num(g.height),rise=num(g.rise);
  if(!(span>0&&length>0&&height>0&&rise>=0))throw Error("ابعاد هندسی مدل معتبر نیست.");
  const brief=window.SteelDesignCore?.getData?.();if(!brief)throw Error("مبانی پروژه در دسترس نیست.");
  const m=brief.masonry||{},walls=brief.wallEnvelope||{},opens=window.SteelOpenings?.getData?.()||{};
  const t=num(m.thicknessMm)/1000,gamma=num(m.unitWeightKNm3);
  const brickL=num(m.brickLengthMm)/1000,brickH=num(m.brickHeightMm)/1000,brickD=num(m.brickDepthMm)/1000,joint=num(m.mortarJointMm)/1000;
  const plasterT=num(m.plasterThicknessMm)/1000;
  const brickValid=brickL>0&&brickH>0&&brickD>0&&joint>=0&&t>0;
  const rows=[];let totalMasonryArea=0,totalMasonryVol=0,totalMasonryWeight=0,totalBrickCount=0,totalMortar=0,totalPlasterArea=0,totalPlasterVol=0;
  for(const face of ["front","rear","left","right"]){
   const w=walls[face]||{material:"brick",orientation:"vertical"},end=face==="front"||face==="rear";
   const gross=end?span*height+span*rise/2:length*height,op=opens[face]||{};
   let opArea=0,openingStatus="بدون بازشو معتبر";
   if(op.enabled){
    const ow=num(op.width),oh=num(op.height),pos=end?0:num(op.position),run=end?span:length;
    if(ow>0&&oh>0&&pos>=0&&pos+ow<=run+1e-8&&oh<=height+1e-8){opArea=ow*oh;openingStatus="بازشوی معتبر کسر شد";}
    else openingStatus="بازشو نامعتبر؛ کسر نشده";
   }
   const net=Math.max(0,gross-opArea),isBrick=w.material==="brick",vol=isBrick?net*t:null;
   const weight=isBrick&&vol!==null&&gamma>0?vol*gamma:null;
   let brickCount=null,mortarVol=null;
   if(isBrick&&brickValid){
    const countBase=vol/((brickL+joint)*(brickH+joint)*brickD);
    brickCount=Math.ceil(countBase*1.05);
    mortarVol=Math.max(0,vol-countBase*brickL*brickH*brickD);
    totalBrickCount+=brickCount;totalMortar+=mortarVol;
   }
   const plasterArea=isBrick&&plasterT>0?net*2:null,plasterVol=plasterArea!==null?plasterArea*plasterT:null;
   if(isBrick){totalMasonryArea+=net;totalMasonryVol+=vol;if(weight!==null)totalMasonryWeight+=weight;if(plasterArea!==null){totalPlasterArea+=plasterArea;totalPlasterVol+=plasterVol;}}
   rows.push({face,material:w.material,orientation:w.orientation,grossAreaM2:gross,openingAreaM2:opArea,netAreaM2:net,masonryVolumeM3:vol,masonryWeightKN:weight,estimatedBrickCount:brickCount,estimatedMortarVolumeM3:mortarVol,plasterAreaM2:plasterArea,plasterVolumeM3:plasterVol,openingStatus});
  }
  const grouped={};
  model.members.forEach(mem=>{const key=mem.sectionKey||mem.type||"unassigned";if(!grouped[key])grouped[key]={group:key,count:0,totalLengthM:0};grouped[key].count++;grouped[key].totalLengthM+=num(mem.length)||0;});
  const half=span/2,roofSlope=Math.hypot(half,rise),overhang=num(g.roofOverhang)>0?num(g.roofOverhang):0;
  const overhangSlope=overhang>0?overhang*Math.hypot(half,rise)/half:0;
  const endOverhang=num(g.endOverhang)>0?num(g.endOverhang):0;
  const roofArea=2*(roofSlope+overhangSlope)*(length+2*endOverhang);
  const warnings=[
   "تعداد آجر برآورد حجمی با ۵٪ پرت فرضی است؛ ابعاد واقعی آجر، الگوی چیدمان، شکست و پرت کارگاهی باید تأیید شود.",
   "حجم ملات، حجم نظری بندها بر پایه ابعاد آجر و بند واردشده است؛ نسبت اختلاط و مقدار سیمان/ماسه جداگانه محاسبه نشده است.",
   "وزن دیوار فقط در صورت ورود وزن مخصوص حجمی مصالح محاسبه می‌شود؛ وزن ۳۵۰ میلی‌متر به‌تنهایی برای تعیین وزن کافی نیست.",
   "طول فولاد از اعضای مدل هندسی جمع شده است؛ وزن فولاد، ورق اتصال، پیچ، جوش و پرت برش بدون فهرست مقاطع و جرم واحد معتبر محاسبه نشده است.",
   "مساحت پوشش سقف تقریبی و بر پایه هندسه مدل و پیش‌آمدگی‌های ثبت‌شده است؛ بازشوها و جزئیات لبه/فلاشینگ جداگانه لحاظ نشده‌اند."
  ];
  return {title:"SAHROUD STEEL — متره و برآورد مصالح",generatedAt:new Date().toISOString(),geometry:{spanM:span,lengthM:length,eavesHeightM:height,riseM:rise,frameCount:g.frames?.length??null},masonryInputs:{thicknessMm:Number.isFinite(num(m.thicknessMm))?num(m.thicknessMm):350,unitWeightKNm3:Number.isFinite(gamma)?gamma:null,brickDimensionsMm:{length:Number.isFinite(num(m.brickLengthMm))?num(m.brickLengthMm):null,height:Number.isFinite(num(m.brickHeightMm))?num(m.brickHeightMm):null,depth:Number.isFinite(num(m.brickDepthMm))?num(m.brickDepthMm):null},mortarJointMm:Number.isFinite(num(m.mortarJointMm))?num(m.mortarJointMm):null,plasterThicknessMm:Number.isFinite(num(m.plasterThicknessMm))?num(m.plasterThicknessMm):null},facades:rows,totals:{masonryNetAreaM2:totalMasonryArea,masonryVolumeM3:totalMasonryVol,masonryWeightKN:gamma>0?totalMasonryWeight:null,estimatedBrickCount:brickValid?totalBrickCount:null,estimatedMortarVolumeM3:brickValid?totalMortar:null,plasterAreaBothFacesM2:plasterT>0?totalPlasterArea:null,plasterVolumeM3:plasterT>0?totalPlasterVol:null,roofCoverAreaApproxM2:roofArea},steelMemberSchedule:Object.values(grouped),warnings,designStatus:"متره مقدماتی؛ فاقد تأیید اجرایی/آیین‌نامه‌ای"};
 }
 function csv(report){
  const lines=[["بخش","شرح","واحد","مقدار","توضیحات"]];
  const add=(a,b,u,v,note="")=>{if(v!==null&&v!==undefined)lines.push([a,b,u,typeof v==="number"?fmt(v):v,note]);};
  add("هندسه","دهانه","m",report.geometry.spanM);add("هندسه","طول سوله","m",report.geometry.lengthM);add("هندسه","ارتفاع کناره","m",report.geometry.eavesHeightM);add("هندسه","خیز سقف","m",report.geometry.riseM);
  report.facades.forEach(f=>{const title=labels[f.face]+" — "+(materials[f.material]||f.material);add("دیوار",title+" مساحت ناخالص","m²",f.grossAreaM2);add("دیوار",title+" بازشو کسرشده","m²",f.openingAreaM2,f.openingStatus);add("دیوار",title+" مساحت خالص","m²",f.netAreaM2);add("دیوار",title+" حجم بنایی","m³",f.masonryVolumeM3);add("دیوار",title+" وزن تقریبی","kN",f.masonryWeightKN);add("مصالح",title+" تعداد آجر تخمینی","عدد",f.estimatedBrickCount);add("مصالح",title+" حجم ملات نظری","m³",f.estimatedMortarVolumeM3);add("نازک‌کاری",title+" سطح اندود دو طرف","m²",f.plasterAreaM2);add("نازک‌کاری",title+" حجم اندود","m³",f.plasterVolumeM3);});
  const t=report.totals;add("جمع","مساحت خالص دیوار آجری","m²",t.masonryNetAreaM2);add("جمع","حجم بنایی","m³",t.masonryVolumeM3);add("جمع","وزن تقریبی بنایی","kN",t.masonryWeightKN);add("جمع","تعداد آجر تخمینی","عدد",t.estimatedBrickCount);add("جمع","حجم ملات نظری","m³",t.estimatedMortarVolumeM3);add("جمع","سطح اندود دو طرف","m²",t.plasterAreaBothFacesM2);add("پوشش","مساحت تقریبی سقف","m²",t.roofCoverAreaApproxM2);
  report.steelMemberSchedule.forEach(s=>{add("فولاد","تعداد عضو "+s.group,"عدد",s.count);add("فولاد","طول کل عضو "+s.group,"m",s.totalLengthM,"وزن واحد مقطع ثبت نشده؛ وزن محاسبه نشده");});
  report.warnings.forEach((w,i)=>lines.push(["ملاحظات","هشدار "+(i+1),"","",w]));
  return "\uFEFF"+lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 }
 function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function render(){
  if($("quantityTakeoffPanel"))return;
  const anchor=$("masonryWallAuditPanel")||$("engineeringBriefPanel"),panel=document.createElement("section");
  panel.id="quantityTakeoffPanel";panel.className="panel";
  panel.innerHTML='<div class="panel-title"><h3>متره و برآورد مصالح و اجزای سوله</h3><span class="status">گزارش قابل خروجی</span></div>'+
   '<div class="notice">ضخامت دیوار آجری پروژه روی ۳۵۰ میلی‌متر تنظیم شده است. ابعاد آجر، بند ملات، وزن مخصوص و اندود را فقط مطابق مصالح و نقشه واقعی وارد کنید؛ خانه‌های خالی به‌عنوان داده نامعلوم باقی می‌مانند.</div>'+
   '<div class="button-grid"><button type="button" class="btn primary" id="btnRunQuantityTakeoff">محاسبه متره و برآورد</button><button type="button" class="btn secondary" id="btnExportQuantityCsv" disabled>دریافت فایل Excel-compatible (CSV)</button><button type="button" class="btn secondary" id="btnExportQuantityJson" disabled>دریافت فایل JSON پروژه</button></div>'+
   '<div class="notice" id="quantityTakeoffResult" aria-live="polite">پس از تولید مدل هندسی، محاسبه متره را اجرا کنید. فایل CSV در Excel باز می‌شود.</div>';
  if(anchor?.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);else document.querySelector("main")?.appendChild(panel);
  let last=null;
  $("btnRunQuantityTakeoff").addEventListener("click",()=>{try{const model=window.SteelStructuralModel?.build?.();last=calculate(model);if(window.SteelFabricationTakeoff?.enrich)last=window.SteelFabricationTakeoff.enrich(last,model);window.SteelQuantityTakeoff.lastResult=last;window.SteelCostEstimate?.refreshFromBOQ?.(last);window.SteelProjectBOQ?.refresh?.();const t=last.totals;const out=$("quantityTakeoffResult");out.textContent="متره با موفقیت محاسبه شد.\nمساحت خالص دیوار آجری: "+fmt(t.masonryNetAreaM2)+" m²\nحجم بنایی با ضخامت "+last.masonryInputs.thicknessMm+" mm: "+fmt(t.masonryVolumeM3)+" m³\nوزن دیوار: "+(t.masonryWeightKN===null?"نیازمند ورود وزن مخصوص":fmt(t.masonryWeightKN)+" kN")+"\nتعداد آجر: "+(t.estimatedBrickCount===null?"نیازمند ابعاد واقعی آجر و بند ملات":t.estimatedBrickCount+" عدد (با ۵٪ پرت)")+"\nحجم ملات نظری: "+(t.estimatedMortarVolumeM3===null?"نامشخص":fmt(t.estimatedMortarVolumeM3)+" m³")+"\nسطح اندود دو طرف: "+(t.plasterAreaBothFacesM2===null?"ضخامت اندود وارد نشده":fmt(t.plasterAreaBothFacesM2)+" m²")+"\nمساحت تقریبی پوشش سقف: "+fmt(t.roofCoverAreaApproxM2)+" m²\nتعداد گروه‌های مقاطع فولادی: "+last.steelMemberSchedule.length+"\n\n"+last.warnings.join("\n");if(last.steelMassTakeoff){const sm=last.steelMassTakeoff;out.textContent+="\n\nوزن اسکلت فولادی: "+(sm.structuralSteelMassKg===null?"ناقص":fmt(sm.structuralSteelMassKg)+" kg")+"\nوزن ورق‌های اتصال ثبت‌شده: "+fmt(sm.connectionPlateMassKg)+" kg\nوزن ساق پیچ‌ها: "+fmt(sm.boltShankMassKg)+" kg\nوزن نظری فلز جوش: "+fmt(sm.theoreticalWeldMetalMassKg)+" kg\nپرت برش: "+(sm.cutWastePct===null?"وارد نشده":sm.cutWastePct+"٪")+"\nوزن خرید اسکلت و ورق با پرت: "+fmt(sm.procurementMassExcludingBoltsAndWeldKg)+" kg";sm.groups.forEach(g=>{out.textContent+="\n"+g.label+": "+(g.massKg===null?"سطح مقطع ناقص":fmt(g.massKg)+" kg")+" | "+fmt(g.totalLengthM)+" m | "+g.count+" عضو";});}$("btnExportQuantityCsv").disabled=false;$("btnExportQuantityJson").disabled=false;}catch(e){$("quantityTakeoffResult").textContent="خطا در متره: "+e.message;$("btnExportQuantityCsv").disabled=true;$("btnExportQuantityJson").disabled=true;last=null;}});
  $("btnExportQuantityCsv").addEventListener("click",()=>{if(last)download("SAHROUD-STEEL-BOQ.csv",window.SteelQuantityTakeoff?.csv?.(last)||csv(last),"text/csv;charset=utf-8");});
  $("btnExportQuantityJson").addEventListener("click",()=>{if(last)download("SAHROUD-STEEL-BOQ.json",JSON.stringify(last,null,2),"application/json;charset=utf-8");});
 }
 document.addEventListener("DOMContentLoaded",render);
 window.SteelQuantityTakeoff={calculate,csv,lastResult:null};
})();

/* ===== steel2/js/steel-fabrication-takeoff.js ===== */
/* SAHROUD STEEL — Steel fabrication and connection takeoff extension
 * Uses entered section areas and member lengths. Connection items are manually inventoried.
 * Bolt mass is shank-only; weld metal is theoretical triangular fillet volume.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),n=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN;};
 const fmt=x=>Number(x).toFixed(3);
 const densityDefault=7850;
 let settings={densityKgM3:densityDefault,cutWastePct:""},items=[];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const names={column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید دیوار",endPost:"ستونک انتهایی",endGirt:"تیر افقی انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
 function addItem(type,data){
  const count=n(data.count),density=n(settings.densityKgM3);
  let volume=null,mass=null,unit="",note="";
  if(type==="plate"){
   const w=n(data.widthMm),h=n(data.heightMm),t=n(data.thicknessMm);
   if(!(count>0&&w>0&&h>0&&t>0))throw Error("تعداد و ابعاد ورق باید مثبت باشند.");
   volume=count*w*h*t*1e-9;mass=volume*density;unit="عدد";
  }else if(type==="bolt"){
   const d=n(data.diameterMm),l=n(data.lengthMm);
   if(!(count>0&&d>0&&l>0))throw Error("تعداد، قطر و طول پیچ باید مثبت باشند.");
   volume=count*Math.PI*d*d/4*l*1e-9;mass=volume*density;unit="عدد";
   note="وزن فقط ساق است؛ سر پیچ، مهره و واشر در این محاسبه نیست.";
  }else if(type==="weld"){
   const l=n(data.lengthM),a=n(data.legMm);
   if(!(l>0&&a>0))throw Error("طول جوش و اندازه ساق باید مثبت باشند.");
   volume=l*(a*a/2)*1e-6;mass=volume*density;unit="m";
   note="حجم نظری جوش گوشه با مقطع مثلثی؛ اضافه‌مصرف، نفوذ و پرت الکترود لحاظ نشده است.";
  }else throw Error("نوع قلم متره ناشناخته است.");
  items.push({id:"FAB-"+Date.now()+"-"+(items.length+1),type,description:String(data.description||"").trim()||({plate:"ورق اتصال",bolt:"پیچ اتصال",weld:"جوش گوشه"}[type]),count:type==="weld"?1:count,unit,dimensions:type==="plate"?{widthMm:n(data.widthMm),heightMm:n(data.heightMm),thicknessMm:n(data.thicknessMm)}:type==="bolt"?{diameterMm:n(data.diameterMm),lengthMm:n(data.lengthMm)}:{lengthM:n(data.lengthM),legMm:n(data.legMm)},volumeM3:volume,massKg:mass,note});
  renderItems();window.SteelProjectBOQ?.refresh?.();
 }
 function steelMass(model){
  const sectionData=window.SteelSections?.read?.(),groups=sectionData?.analysis3d?.groups||{},density=n(settings.densityKgM3);
  const by={};let total=0,complete=true;
  for(const mem of model.members||[]){
   const key=String(mem.sectionKey||"unassigned"),g=groups[key]||{},area=n(g.A_cm2),len=n(mem.length);
   if(!by[key])by[key]={group:key,label:names[key]||key,count:0,totalLengthM:0,areaCm2:area,massKg:null,missingMembers:0};
   const row=by[key];row.count++;
   if(len>0)row.totalLengthM+=len;else{row.missingMembers++;complete=false;}
  }
  Object.values(by).forEach(row=>{
   if(!(row.areaCm2>0)||!(density>0)||row.missingMembers){row.massKg=null;complete=false;}
   else{row.massKg=row.totalLengthM*row.areaCm2*1e-4*density;total+=row.massKg;}
  });
  const plate=items.filter(x=>x.type==="plate").reduce((s,x)=>s+x.massKg,0);
  const bolts=items.filter(x=>x.type==="bolt").reduce((s,x)=>s+x.massKg,0);
  const weld=items.filter(x=>x.type==="weld").reduce((s,x)=>s+x.massKg,0);
  const wasteRaw=String(settings.cutWastePct??"").trim(),waste=wasteRaw===""?NaN:n(wasteRaw),wastePct=Number.isFinite(waste)&&waste>=0?waste:0;
  const frameAndPlate=total+plate,procurement=(frameAndPlate*(1+wastePct/100));
  return {densityKgM3:density,cutWastePct:Number.isFinite(waste)&&waste>=0?waste:null,groups:Object.values(by),structuralSteelMassKg:total,connectionPlateMassKg:plate,boltShankMassKg:bolts,theoreticalWeldMetalMassKg:weld,frameAndPlateMassKg:frameAndPlate,cutWasteAllowanceKg:procurement-frameAndPlate,procurementMassExcludingBoltsAndWeldKg:procurement,totalKnownSteelMassIncludingBoltsAndWeldKg:procurement+bolts+weld,complete,items:clone(items),notes:[
  "وزن اعضای اسکلت از سطح مقطع A ثبت‌شده برای هر گروه و طول اعضای مدل هندسی محاسبه شده است؛ در صورت اشتباه یا ناقص بودن مقاطع ورودی، وزن نیز معتبر نخواهد بود.",
  "پرت برش فقط به اسکلت و ورق‌های اتصال اعمال شده است؛ پیچ و فلز جوش جدا گزارش شده‌اند.",
  "وزن پیچ فقط وزن ساق است و وزن سر، مهره و واشر را شامل نمی‌شود.",
  "وزن فلز جوش برآورد نظری مقطع مثلثی جوش گوشه است؛ مصرف واقعی الکترود/سیم جوش و پرت کارگاهی نیست."
 ]};
 }
 function renderItems(){
  const out=$("fabricationItemsList");if(!out)return;
  if(!items.length){out.textContent="هنوز قلم اتصال یا ساخت دستی ثبت نشده است.";return;}
  out.innerHTML=items.map((x,i)=>'<div class="notice" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span>'+String(i+1)+'. '+x.description+' — '+x.count+' '+x.unit+' — '+fmt(x.massKg)+' kg</span><button type="button" class="btn secondary" data-remove-fab="'+i+'">حذف</button></div>').join("");
  out.querySelectorAll("[data-remove-fab]").forEach(b=>b.addEventListener("click",()=>{items.splice(Number(b.dataset.removeFab),1);renderItems();window.SteelProjectBOQ?.refresh?.();}));
 }
 function render(){
  const panel=$("quantityTakeoffPanel");if(!panel||$("fabricationTakeoffSubpanel"))return;
  const box=document.createElement("div");box.id="fabricationTakeoffSubpanel";
  box.innerHTML='<hr><h4>متره اسکلت فولادی و اتصالات</h4>'+
   '<div class="notice">وزن اعضای مدل از سطح مقطع واقعی ثبت‌شده در گروه‌های مقاطع محاسبه می‌شود. ورق، پیچ و جوش را مطابق نقشه اتصال در فرم‌های زیر ثبت کنید؛ هیچ اتصال فرضی به پروژه اضافه نمی‌شود.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="fabSteelDensity">چگالی فولاد (kg/m³)</label><input id="fabSteelDensity" type="number" min="1" step="1" value="'+settings.densityKgM3+'"></div>'+
   '<div class="field"><label for="fabCutWaste">پرت برش اسکلت و ورق (%) ـ اختیاری</label><input id="fabCutWaste" type="number" min="0" step="0.5" placeholder="خالی = بدون پرت"></div></div>'+
   '<h4>ثبت ورق‌های اتصال</h4><div class="form-grid">'+
   '<div class="field"><label for="fabPlateName">شرح ورق</label><input id="fabPlateName" placeholder="مثلاً ورق گاست"></div>'+
   '<div class="field"><label for="fabPlateCount">تعداد</label><input id="fabPlateCount" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabPlateWidth">عرض (mm)</label><input id="fabPlateWidth" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabPlateHeight">طول (mm)</label><input id="fabPlateHeight" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabPlateThickness">ضخامت (mm)</label><input id="fabPlateThickness" type="number" min="1" step="0.5"></div></div><button type="button" class="btn secondary" id="btnAddFabPlate">افزودن ورق</button>'+
   '<h4>ثبت پیچ‌ها</h4><div class="form-grid">'+
   '<div class="field"><label for="fabBoltName">شرح / رده پیچ</label><input id="fabBoltName" placeholder="مثلاً M20 - 8.8"></div>'+
   '<div class="field"><label for="fabBoltCount">تعداد</label><input id="fabBoltCount" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabBoltDiameter">قطر ساق (mm)</label><input id="fabBoltDiameter" type="number" min="1" step="1"></div>'+
   '<div class="field"><label for="fabBoltLength">طول ساق (mm)</label><input id="fabBoltLength" type="number" min="1" step="1"></div></div><button type="button" class="btn secondary" id="btnAddFabBolt">افزودن پیچ</button>'+
   '<h4>ثبت جوش گوشه</h4><div class="form-grid">'+
   '<div class="field"><label for="fabWeldName">شرح جوش</label><input id="fabWeldName" placeholder="مثلاً جوش ورق گاست به جان"></div>'+
   '<div class="field"><label for="fabWeldLength">طول کل جوش (m)</label><input id="fabWeldLength" type="number" min="0.001" step="0.01"></div>'+
   '<div class="field"><label for="fabWeldLeg">اندازه ساق جوش (mm)</label><input id="fabWeldLeg" type="number" min="1" step="0.5"></div></div><button type="button" class="btn secondary" id="btnAddFabWeld">افزودن جوش</button>'+
   '<div id="fabricationItemsList" class="notice">هنوز قلمی ثبت نشده است.</div>'+
   '<div class="notice" id="fabricationTakeoffResult">پس از ثبت مقاطع و اقلام اتصال، دکمه محاسبه متره اصلی را بزنید تا وزن‌ها در گزارش بیاید.</div>';
  panel.appendChild(box);
  const read=id=>$(id)?.value??"";
  $("fabSteelDensity").addEventListener("change",()=>{settings.densityKgM3=n(read("fabSteelDensity"));});
  $("fabCutWaste").addEventListener("change",()=>{settings.cutWastePct=read("fabCutWaste");});
  $("btnAddFabPlate").addEventListener("click",()=>{try{settings.densityKgM3=n(read("fabSteelDensity"));addItem("plate",{description:read("fabPlateName"),count:read("fabPlateCount"),widthMm:read("fabPlateWidth"),heightMm:read("fabPlateHeight"),thicknessMm:read("fabPlateThickness")});}catch(e){alert(e.message);}});
  $("btnAddFabBolt").addEventListener("click",()=>{try{settings.densityKgM3=n(read("fabSteelDensity"));addItem("bolt",{description:read("fabBoltName"),count:read("fabBoltCount"),diameterMm:read("fabBoltDiameter"),lengthMm:read("fabBoltLength")});}catch(e){alert(e.message);}});
  $("btnAddFabWeld").addEventListener("click",()=>{try{settings.densityKgM3=n(read("fabSteelDensity"));addItem("weld",{description:read("fabWeldName"),lengthM:read("fabWeldLength"),legMm:read("fabWeldLeg")});}catch(e){alert(e.message);}});
  renderItems();
 }
 function getData(){return {settings:clone(settings),items:clone(items)};}
 function setData(data){if(!data||typeof data!=="object")return;if(data.settings)settings={densityKgM3:data.settings.densityKgM3??densityDefault,cutWastePct:data.settings.cutWastePct??""};if(Array.isArray(data.items))items=clone(data.items);if($("fabSteelDensity"))$("fabSteelDensity").value=settings.densityKgM3;if($("fabCutWaste"))$("fabCutWaste").value=settings.cutWastePct;renderItems();}
 const baseCalc=window.SteelQuantityTakeoff?.calculate,baseCsv=window.SteelQuantityTakeoff?.csv;
 if(typeof baseCalc==="function"){
  window.SteelQuantityTakeoff.calculate=function(model){const report=baseCalc(model),mass=steelMass(model);report.steelMassTakeoff=mass;report.steelMemberSchedule=report.steelMemberSchedule.map(row=>{const m=mass.groups.find(x=>x.group===row.group);return {...row,label:m?.label||row.group,areaCm2:m?.areaCm2??null,massKg:m?.massKg??null};});report.connectionFabricationItems=clone(items);report.warnings.push(...mass.notes);if(!mass.complete)report.warnings.push("وزن یک یا چند گروه فولادی محاسبه نشد؛ سطح مقطع A و طول اعضای آن گروه را تکمیل کنید.");return report;};
  if(typeof baseCsv==="function")window.SteelQuantityTakeoff.csv=function(report){let out=baseCsv(report);const rows=[];const q=(a,b,u,v,note="")=>{if(v!==null&&v!==undefined)rows.push([a,b,u,v,note]);};
   (report.steelMassTakeoff?.groups||[]).forEach(g=>{q("فولاد",g.label+" تعداد اعضا","عدد",g.count);q("فولاد",g.label+" طول کل","m",g.totalLengthM);q("فولاد",g.label+" سطح مقطع","cm²",g.areaCm2);q("فولاد",g.label+" وزن","kg",g.massKg,"بر پایه سطح مقطع ورودی");});
   const s=report.steelMassTakeoff||{};q("جمع فولاد","وزن اسکلت فولادی","kg",s.structuralSteelMassKg);q("اتصالات","وزن ورق‌های اتصال","kg",s.connectionPlateMassKg);q("اتصالات","وزن ساق پیچ‌ها","kg",s.boltShankMassKg);q("اتصالات","وزن نظری فلز جوش","kg",s.theoreticalWeldMetalMassKg);q("خرید","پرت برش مجازشده","kg",s.cutWasteAllowanceKg);q("خرید","وزن خرید بدون پیچ و جوش","kg",s.procurementMassExcludingBoltsAndWeldKg);
   (s.items||[]).forEach(x=>q("اقلام اتصال",x.description,x.unit,x.count,"وزن="+fmt(x.massKg)+" kg؛ "+x.note));
   const esc=v=>'"'+String(v??"").replace(/"/g,'""')+'"';return out+"\r\n"+rows.map(r=>r.map(esc).join(",")).join("\r\n");};
  const oldRender=window.SteelQuantityTakeoff;
  window.SteelQuantityTakeoff.getData=getData;window.SteelQuantityTakeoff.setData=setData;
  window.SteelQuantityTakeoff.addItem=addItem;window.SteelQuantityTakeoff.removeAll=()=>{items=[];renderItems();window.SteelProjectBOQ?.refresh?.();};
 }
 document.addEventListener("DOMContentLoaded",render);
 function enrich(report,model){
  const mass=steelMass(model);
  report.steelMassTakeoff=mass;
  report.steelMemberSchedule=(report.steelMemberSchedule||[]).map(row=>{const m=mass.groups.find(x=>x.group===row.group);return {...row,label:m?.label||row.group,areaCm2:m?.areaCm2??null,massKg:m?.massKg??null};});
  report.connectionFabricationItems=clone(items);
  report.warnings.push(...mass.notes);
  if(!mass.complete)report.warnings.push("وزن یک یا چند گروه فولادی محاسبه نشد؛ سطح مقطع A و طول اعضای آن گروه را تکمیل کنید.");
  return report;
 }
 window.SteelFabricationTakeoff={getData,setData,steelMass,addItem,enrich};
})();

/* ===== steel2/js/market-price-engine.js ===== */
/* SAHROUD STEEL — Project-local market price registry
 * Prices are quotations, not guaranteed delivered prices. No scraping or fabricated feeds.
 */
(function(){
 "use strict";
 const KEY="sahroudSteel.marketPrices.v1", $=id=>document.getElementById(id);
 const state={endpoint:"",intervalMinutes:60,autoRefresh:false,prices:[],lastFetchAt:null,lastError:""};
 let autoTimer=null;
 const units=["تومان/کیلوگرم","تومان/تن","تومان/مترمربع","تومان/مترمکعب","تومان/عدد","تومان/متر","تومان/کیسه","تومان/مجموع"];
 const presets=[
  {code:"steel.ipe14",name:"تیرآهن IPE 14",unit:"تومان/کیلوگرم"},
  {code:"steel.sheet3",name:"ورق سیاه ۳ میلی‌متر",unit:"تومان/کیلوگرم"},
  {code:"cement.type2.bag",name:"سیمان تیپ ۲ پاکتی",unit:"تومان/تن"},
  {code:"panel.wall40",name:"ساندویچ‌پنل دیواری ۴ سانتی‌متر",unit:"تومان/مترمربع"},
  {code:"panel.roof50",name:"ساندویچ‌پنل سقفی ۵ سانتی‌متر",unit:"تومان/مترمربع"},
  {code:"brick",name:"آجر",unit:"تومان/عدد"},
  {code:"concrete.ready",name:"بتن آماده فونداسیون",unit:"تومان/مترمکعب"},
  {code:"rebar.a3",name:"میلگرد آجدار A3",unit:"تومان/کیلوگرم"},
  {code:"excavation",name:"خاکبرداری و بارگیری",unit:"تومان/مترمکعب"},
  {code:"formwork",name:"قالب‌بندی بتن",unit:"تومان/مترمربع"},
  {code:"anchor.bolt",name:"بولت و متعلقات صفحه‌ستون",unit:"تومان/عدد"},
  {code:"concrete.floor",name:"بتن کف سوله",unit:"تومان/مترمکعب"},
  {code:"door.industrial",name:"درب صنعتی و کرکره",unit:"تومان/مترمربع"},
  {code:"gutter",name:"آبرو و ناودانی",unit:"تومان/متر"},
  {code:"electrical.package",name:"برق و روشنایی پروژه",unit:"تومان/مجموع"}
 ];
 const fmt=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:2});
 function projectCity(){
  const el=$("city"); if(!el)return "";
  if(el.value==="other"||el.value==="custom")return ($("cityName")?.value||"").trim();
  const opt=el.options?.[el.selectedIndex];return (opt?.textContent||el.value||"").trim().replace(/\s*\(پیش‌فرض\)\s*/g,"");
 }
 function safeDate(v){const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;}
 function normalize(p,allowUserVerified){
  if(!p||typeof p!=="object")throw Error("رکورد قیمت ساختار معتبری ندارد.");
  const price=Number(p.price),updatedAt=safeDate(p.updatedAt||p.date);
  if(!p.code||!p.name||!Number.isFinite(price)||price<=0||!p.unit||!updatedAt)throw Error("هر قیمت باید کد، نام، مبلغ مثبت، واحد و تاریخ معتبر داشته باشد.");
  const freight= p.freightToman===""||p.freightToman==null?null:Number(p.freightToman);
  const tax= p.taxPercent===""||p.taxPercent==null?null:Number(p.taxPercent);
  return {
   code:String(p.code),name:String(p.name),productSpec:String(p.productSpec||""),
   price,unit:String(p.unit),city:String(p.city||p.quoteCity||"نامشخص"),
   seller:String(p.seller||""),source:String(p.source||"منبع تعریف‌شده توسط کاربر"),
   sourceType:String(p.sourceType||"manual"),deliveryCity:String(p.deliveryCity||""),
   includesFreight: p.includesFreight===true, freightToman:Number.isFinite(freight)&&freight>=0?freight:null,
   includesTax:p.includesTax===true,taxPercent:Number.isFinite(tax)&&tax>=0?tax:null,
   sourceUrl:String(p.sourceUrl||""),updatedAt,currency:"تومان",
   verifiedByUser:allowUserVerified&&p.verifiedByUser===true
  };
 }
 function freshness(p){const age=Date.now()-new Date(p.updatedAt).getTime();return age<0?"تاریخ نامعتبر":age>36*3600000?"قدیمی‌تر از ۳۶ ساعت":"تازه (کمتر از ۳۶ ساعت)";}
 function render(){
  const body=$("marketPriceRows");if(!body)return;body.replaceChildren();
  if(!state.prices.length){body.innerHTML='<tr><td colspan="10">هنوز قیمتی ثبت نشده است؛ قیمت را دستی وارد یا API مجاز JSON را تنظیم کنید.</td></tr>';return;}
  state.prices.forEach((p,i)=>{
   const tr=document.createElement("tr");
   const delivery=p.deliveryCity||"تحویل نامشخص";
   const freight=p.includesFreight?"حمل منظور شده":p.freightToman!==null?"حمل جدا: "+fmt(p.freightToman):"حمل نامشخص";
   const tax=p.includesTax?"مالیات منظور شده":p.taxPercent!==null?"مالیات جدا: "+p.taxPercent+"٪":"مالیات نامشخص";
   [p.name+(p.productSpec?" — "+p.productSpec:""),fmt(p.price),p.unit,p.city,p.seller||p.source,delivery,freight+"؛ "+tax,p.verifiedByUser?"تأیید دستی کاربر":"تأییدنشده",new Date(p.updatedAt).toLocaleString("fa-IR")+"؛ "+freshness(p)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
   const td=document.createElement("td"),b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent="حذف";b.addEventListener("click",()=>{state.prices.splice(i,1);persist();render();});td.appendChild(b);tr.appendChild(td);body.appendChild(tr);
  });
 }
 function status(msg,isError){const el=$("marketPriceStatus");if(el){el.textContent=msg;el.style.color=isError?"#b91c1c":"";}}
 function getData(){return JSON.parse(JSON.stringify(state));}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(getData()));}catch(e){console.warn("Market price local save failed",e);}}
 function setData(d){
  if(!d||typeof d!=="object")return;
  state.endpoint=String(d.endpoint||"");state.intervalMinutes=Math.max(5,Math.min(1440,Number(d.intervalMinutes)||60));state.autoRefresh=!!d.autoRefresh;
  state.prices=Array.isArray(d.prices)?d.prices.map(p=>{try{return normalize(p,true);}catch(_){return null;}}).filter(Boolean):[];
  state.lastFetchAt=safeDate(d.lastFetchAt);state.lastError=String(d.lastError||"");
  if($("marketPriceEndpoint"))$("marketPriceEndpoint").value=state.endpoint;
  if($("marketPriceInterval"))$("marketPriceInterval").value=state.intervalMinutes;
  if($("marketPriceAuto"))$("marketPriceAuto").checked=state.autoRefresh;
  render();configureAutoRefresh();
 }
 function configureAutoRefresh(){if(autoTimer){clearInterval(autoTimer);autoTimer=null;}if(state.autoRefresh&&state.endpoint)autoTimer=setInterval(()=>{if(document.visibilityState==="visible")refresh();},state.intervalMinutes*60000);}
 async function refresh(){
  state.endpoint=$("marketPriceEndpoint")?.value.trim()||state.endpoint;
  if(!state.endpoint){status("نشانی API وارد نشده است. فقط API مجاز JSON با دسترسی CORS قابل استفاده است.",true);return false;}
  status("در حال دریافت قیمت‌ها…");
  try{
   const response=await fetch(state.endpoint,{cache:"no-store",headers:{Accept:"application/json"}});
   if(!response.ok)throw Error("پاسخ سرویس: HTTP "+response.status);
   const payload=await response.json(),items=Array.isArray(payload)?payload:payload.prices;
   if(!Array.isArray(items)||!items.length)throw Error("ساختار پاسخ باید آرایه prices باشد.");
   const next=items.map(p=>normalize(p,false)),now=Date.now();
   if(next.some(p=>new Date(p.updatedAt).getTime()>now+5*60000))throw Error("تاریخ یکی از قیمت‌ها در آینده است.");
   const byKey=new Map(state.prices.map(p=>[p.code+"|"+p.city+"|"+p.seller,p]));
   next.forEach(p=>byKey.set(p.code+"|"+p.city+"|"+p.seller,p));
   state.prices=Array.from(byKey.values());state.lastFetchAt=new Date().toISOString();state.lastError="";
   render();persist();status("دریافت "+next.length+" قیمت انجام شد. قیمت‌های API تأییدشده محسوب نمی‌شوند؛ شهر پروژه فعلی: "+(projectCity()||"ثبت‌نشده")+".");
   return true;
  }catch(e){state.lastError=e.message;persist();status("دریافت ناموفق: "+e.message+"؛ قیمت‌های قبلی حفظ شدند.",true);return false;}
 }
 function addManual(){
  try{
   const p=normalize({
    code:$("marketPriceCode").value.trim(),name:$("marketPriceName").value.trim(),productSpec:$("marketPriceSpec").value.trim(),
    price:$("marketPriceValue").value,unit:$("marketPriceUnit").value,
    city:$("marketPriceCity").value.trim()||"نامشخص",
    seller:$("marketPriceSeller").value.trim(),source:$("marketPriceSource").value.trim()||"ورود دستی",
    sourceType:$("marketPriceSourceType").value,deliveryCity:$("marketPriceDeliveryCity").value.trim(),
    includesFreight:$("marketPriceFreightIncluded").checked,freightToman:$("marketPriceFreight").value,
    includesTax:$("marketPriceTaxIncluded").checked,taxPercent:$("marketPriceTaxPercent").value,
    sourceUrl:$("marketPriceUrl").value.trim(),verifiedByUser:$("marketPriceVerified").checked,
    updatedAt:new Date().toISOString()
   },true);
   const i=state.prices.findIndex(x=>x.code===p.code&&x.city===p.city&&x.seller===p.seller);
   if(i>=0)state.prices[i]=p;else state.prices.push(p);
   render();persist();status("قیمت ثبت شد. شهر بازار با شهر پروژه متفاوت است مگر اینکه صریحاً یکسان باشد؛ تحویل و هزینه‌های جانبی جداگانه بررسی شوند.");
  }catch(e){status(e.message,true);}
 }
 function exportCSV(){
  const cols=["code","name","productSpec","price","unit","city","seller","source","sourceType","deliveryCity","includesFreight","freightToman","includesTax","taxPercent","sourceUrl","updatedAt","verifiedByUser"];
  const rows=[cols,...state.prices.map(p=>cols.map(k=>p[k]??""))];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="Sahroud_Steel_Market_Prices.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function mount(){
  if($("marketPricePanel"))return;
  const panel=document.createElement("section");panel.className="panel";panel.id="marketPricePanel";
  panel.innerHTML=`
   <div class="panel-title"><h3>بانک قیمت بازار شهر محل اجرای پروژه</h3><span class="status">قیمت محلی و قابل رهگیری</span></div>
   <div class="notice">شهر پروژه: <strong id="marketProjectCity"></strong>. قیمت هر کالا در شهر بازار/فروشنده ثبت می‌شود؛ شهر تحویل، حمل و مالیات مستقل‌اند. قیمت شهر دیگر، قیمت تحویل محل پروژه فرض نمی‌شود. API فقط JSON مجاز با CORS است و داده API خودکار تأییدشده نیست.</div>
   <div class="form-grid">
    <div class="field"><label for="marketPriceEndpoint">نشانی API قیمت (JSON)</label><input id="marketPriceEndpoint" type="url" placeholder="https://your-domain.example/api/prices"></div>
    <div class="field"><label for="marketPriceInterval">فاصله به‌روزرسانی (دقیقه)</label><input id="marketPriceInterval" type="number" min="5" max="1440" value="60"></div>
    <div class="field"><label><input id="marketPriceAuto" type="checkbox"> به‌روزرسانی خودکار هنگام بازبودن نرم‌افزار</label></div>
   </div>
   <div class="button-grid"><button id="marketPriceRefresh" class="btn primary" type="button">دریافت قیمت‌ها</button><button id="marketPriceExport" class="btn secondary" type="button">خروجی CSV قیمت‌ها</button></div>
   <div id="marketPriceStatus" class="notice">قیمت‌ها هنوز دریافت یا ثبت نشده‌اند.</div>
   <h4>ثبت قیمت کالا یا خدمت در بازار</h4>
   <div class="form-grid">
    <div class="field"><label for="marketPriceCode">کد یکتا</label><input id="marketPriceCode" placeholder="مثلاً steel.ipe14"></div>
    <div class="field"><label for="marketPriceName">نام کالا/خدمت</label><input id="marketPriceName" placeholder="نام دقیق کالا"></div>
    <div class="field"><label for="marketPriceSpec">مشخصات فنی دقیق</label><input id="marketPriceSpec" placeholder="استاندارد، گرید، ضخامت، ابعاد و پوشش"></div>
    <div class="field"><label for="marketPriceValue">قیمت پایه (تومان)</label><input id="marketPriceValue" type="number" min="0" step="any"></div>
    <div class="field"><label for="marketPriceUnit">واحد قیمت</label><select id="marketPriceUnit">${units.map(u=>'<option>'+u+'</option>').join("")}</select></div>
    <div class="field"><label for="marketPriceCity">شهر بازار/انبار/کارخانه</label><input id="marketPriceCity" placeholder="شهر محل عرضه"><button id="marketUseProjectCity" type="button" class="btn secondary">قرار دادن شهر پروژه</button></div>
    <div class="field"><label for="marketPriceSeller">نام فروشنده/کارخانه</label><input id="marketPriceSeller" placeholder="نام فروشنده"></div>
    <div class="field"><label for="marketPriceSourceType">نوع منبع</label><select id="marketPriceSourceType"><option value="factory">کارخانه</option><option value="warehouse">انبار</option><option value="market">بازار محلی</option><option value="exchange">بورس کالا</option><option value="manual">ورود دستی</option><option value="api">API</option></select></div>
    <div class="field"><label for="marketPriceDeliveryCity">شهر تحویل اعلام‌شده (اگر قطعی است)</label><input id="marketPriceDeliveryCity" placeholder="خالی = نامشخص"></div>
    <div class="field"><label for="marketPriceFreight">هزینه حمل جداگانه (تومان؛ مبنای محاسبه در یادداشت ثبت شود)</label><input id="marketPriceFreight" type="number" min="0" step="any" placeholder="در صورت اطلاع"></div>
    <div class="field"><label for="marketPriceTaxPercent">مالیات جداگانه (%)</label><input id="marketPriceTaxPercent" type="number" min="0" step="any" placeholder="در صورت اطلاع"></div>
    <div class="field"><label for="marketPriceSource">منبع/مرجع قیمت</label><input id="marketPriceSource" placeholder="وب‌سایت، پیش‌فاکتور، تماس و ..."></div>
    <div class="field"><label for="marketPriceUrl">پیوند منبع یا پیش‌فاکتور</label><input id="marketPriceUrl" type="url" placeholder="https://..."></div>
    <div class="field"><label><input id="marketPriceFreightIncluded" type="checkbox"> هزینه حمل در قیمت منظور شده</label></div>
    <div class="field"><label><input id="marketPriceTaxIncluded" type="checkbox"> مالیات در قیمت منظور شده</label></div>
    <div class="field"><label><input id="marketPriceVerified" type="checkbox"> این قیمت را شخصاً با فروشنده/مدرک تطبیق داده‌ام</label></div>
   </div>
   <button id="marketPriceAdd" class="btn success" type="button">ثبت قیمت بازار</button>
   <h4>قیمت‌های ثبت‌شده</h4>
   <div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:1250px"><thead><tr><th>کالا و مشخصات</th><th>قیمت</th><th>واحد</th><th>شهر بازار</th><th>فروشنده/منبع</th><th>شهر تحویل</th><th>حمل و مالیات</th><th>تأیید</th><th>تاریخ و تازگی</th><th>عملیات</th></tr></thead><tbody id="marketPriceRows"></tbody></table></div>
   <h4>منابع قابل بررسی (نیازمند تطبیق شهر و مشخصات)</h4>
   <ul><li><a href="https://arznab.com/en/steel" target="_blank" rel="noopener">Arznab ـ آهن و فولاد</a></li><li><a href="https://sitahan.com/" target="_blank" rel="noopener">سایت آهن</a></li><li><a href="https://ahanonline.com/" target="_blank" rel="noopener">آهن آنلاین</a></li></ul>
   <p class="geometry-hint">API: آرایه prices با فیلدهای code, name, price, unit, city, seller, productSpec, source, sourceType, deliveryCity, includesFreight, freightToman, includesTax, taxPercent, sourceUrl, updatedAt. فیلد verified ارسالی API نادیده گرفته می‌شود.</p>
  `;
  const footer=document.querySelector("footer");if(footer)footer.parentNode.insertBefore(panel,footer);else document.querySelector("main")?.appendChild(panel);
  $("marketPriceProjectCity").textContent=projectCity()||"انتخاب نشده";
  let lastProjectCity=projectCity();
  if($("marketPriceCity")&&!$("marketPriceCity").value.trim())$("marketPriceCity").value=lastProjectCity;
  $("marketPriceEndpoint").value=state.endpoint;$("marketPriceInterval").value=state.intervalMinutes;$("marketPriceAuto").checked=state.autoRefresh;
  $("marketPriceRefresh").addEventListener("click",refresh);$("marketPriceExport").addEventListener("click",exportCSV);$("marketPriceAdd").addEventListener("click",addManual);
  $("marketPriceEndpoint").addEventListener("change",()=>{state.endpoint=$("marketPriceEndpoint").value.trim();persist();configureAutoRefresh();});
  $("marketPriceInterval").addEventListener("change",()=>{state.intervalMinutes=Math.max(5,Math.min(1440,Number($("marketPriceInterval").value)||60));persist();configureAutoRefresh();});
  $("marketPriceAuto").addEventListener("change",()=>{state.autoRefresh=$("marketPriceAuto").checked;persist();configureAutoRefresh();});
  $("marketUseProjectCity")?.addEventListener("click",()=>{$("marketPriceCity").value=projectCity();});
  const syncProjectCity=()=>{const next=projectCity();$("marketPriceProjectCity").textContent=next||"انتخاب نشده";const cityInput=$("marketPriceCity");if(cityInput&&(!cityInput.value.trim()||cityInput.value.trim()===lastProjectCity))cityInput.value=next;lastProjectCity=next;};
  $("city")?.addEventListener("change",()=>{if($("cityName"))$("cityName").style.display=($("city").value==="other"||$("city").value==="custom")?"":"none";syncProjectCity();});
  $("cityName")?.addEventListener("input",syncProjectCity);
  render();configureAutoRefresh();
 }
 window.SteelMarketPrices={getData,setData,refresh,addManual,render,getProjectCity:projectCity,syncProjectCity:()=>{const el=$("marketPriceProjectCity");if(el)el.textContent=projectCity()||"انتخاب نشده";},units,presets};
 document.addEventListener("DOMContentLoaded",mount);
})();

/* ===== steel2/js/code-reference-registry.js ===== */
/* SAHROUD STEEL — Engineering reference register
 * Curated bibliographic records only. A download page is not proof of legal adoption.
 * Coefficients and clauses must be independently checked against the official issued document.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const state={records:[
  {id:"M6-1398",title:"مبحث ششم مقررات ملی ساختمان ـ بارهای وارد بر ساختمان",edition:"ویرایش چهارم، ۱۳۹۸",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"صفحه عنوان PDF کنترل شد: مبحث ششم، ویرایش چهارم ۱۳۹۸؛ اصلاحیه‌ها و آخرین وضعیت ابلاغ هنوز بررسی نشده",url:"https://inbr.ir/wp-content/uploads/2023/07/mahas6-98.pdf",notes:"PDF روی دامنه inbr.ir باز و تصویر صفحه عنوان بررسی شد؛ ناشر/مرجع روی جلد وزارت راه و شهرسازی و مرکز تحقیقات راه، مسکن و شهرسازی درج شده است. کنترل اصلاحیه‌ها و آخرین وضعیت اعتبار همچنان لازم است."},
  {id:"M10-1401",title:"مبحث دهم مقررات ملی ساختمان ـ طرح و اجرای ساختمان‌های فولادی",edition:"ویرایش ۱۴۰۱ (شناسه نسخه نیازمند تطبیق)",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"لینک مستقیم PDF روی دامنه inbr.ir پیدا شد؛ شناسنامه و اصلاحیه‌ها هنوز تطبیق نشده",url:"https://inbr.ir/upload/mabhas/1402-08/mabhas10-1402-08.pdf",notes:"لینک مستقیم از فهرست لینک‌های مقررات ملی استخراج شده؛ سال پوشه 1402-08 را نباید با سال ویرایش یکی دانست."},
  {id:"M7-1400",title:"مبحث هفتم ـ ژئوتکنیک و مهندسی پی",edition:"ویرایش ۱۴۰۰",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"لینک مستقیم PDF روی دامنه inbr.ir پیدا شد؛ شناسنامه و اصلاحیه‌ها هنوز تطبیق نشده",url:"https://inbr.ir/upload/mabhas/mabhas-7-1401-05.pdf",notes:"نشانی مستقیم PDF از فهرست لینک‌های مقررات ملی استخراج شده؛ شماره‌گذاری فایل به‌تنهایی اثبات‌کننده ویرایش/ابلاغ نیست."},
  {id:"M8-1398",title:"مبحث هشتم ـ طرح و اجرای ساختمان‌های با مصالح بنایی",edition:"ویرایش ۱۳۹۸ (شناسه نسخه نیازمند تطبیق)",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"لینک مستقیم PDF روی دامنه inbr.ir پیدا شد؛ شناسنامه و اصلاحیه‌ها هنوز تطبیق نشده",url:"https://inbr.ir/upload/mabhas/mabhas8-981.pdf",notes:"لینک مستقیم از فهرست لینک‌های مقررات ملی استخراج شده؛ صفحه عنوان و اصلاحیه‌ها باید پیش از استناد کنترل شوند."},
  {id:"M9-1399",title:"مبحث نهم ـ طرح و اجرای ساختمان‌های بتن‌آرمه",edition:"ویرایش پنجم، ۱۳۹۹",publisher:"دفتر مقررات ملی و کنترل ساختمان",kind:"مبحث مقررات ملی",status:"فایل PDF روی دامنه inbr.ir شناسایی شد اما به علت حجم حدود ۷۱ مگابایت، دریافت و کنترل مستقیم صفحه عنوان/متن در این مرحله ممکن نشد؛ بندها و اصلاحیه‌ها هنوز تأیید نشده‌اند",url:"https://inbr.ir/upload/mabhas/1402-08/mabhas9-1402-08.pdf",notes:"فهرست مطالب نسخه پنجم ۱۳۹۹ در منبع کتاب‌شناختی ثانویه، فصل هجدهم را «مهار به بتن» معرفی می‌کند. این فقط تعیین حوزه و فصل است، نه تأیید شماره بند یا فرمول اندرکنش. نسخه PDF رسمی در نشانی inbr.ir موجود است اما به علت محدودیت اندازه پاسخ، متن کامل بازیابی نشد. تا بررسی صفحه عنوان، غلط‌نامه/اصلاحیه و متن بندهای فصل ۱۸، هیچ رابطه یا ظرفیت آیین‌نامه‌ای از این سند به موتور طراحی منتقل نمی‌شود."},
  {id:"STD-2800-V4",title:"استاندارد ۲۸۰۰ ـ طراحی ساختمان‌ها در برابر زلزله",edition:"ویرایش چهارم",publisher:"مرجع تدوین استاندارد ۲۸۰۰",kind:"استاندارد ملی",status:"نسخه معرفی‌شده در منبع ثانویه؛ اصلاحیه‌ها باید کنترل شوند",url:"https://hamyarsaze.com/iran-code/",notes:"برای الزامات لرزه‌ای؛ تاریخ ابلاغ و اصلاحیه‌ها باید پیش از استفاده بررسی شود."}
 ],custom:[]};
 function all(){return [...state.records,...state.custom];}
 function getData(){return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;state.custom=Array.isArray(d.custom)?d.custom.filter(x=>x&&x.id&&x.title):[];render();}
 function render(){
  const body=$("codeReferenceRows");if(!body)return;body.replaceChildren();
  all().forEach(r=>{
   const tr=document.createElement("tr");
   [r.id,r.title,r.edition,r.status].forEach(v=>{const td=document.createElement("td");td.textContent=v||"—";tr.appendChild(td);});
   const td=document.createElement("td"),a=document.createElement("a");a.href=r.url;a.target="_blank";a.rel="noopener";a.textContent="مشاهده منبع";td.appendChild(a);tr.appendChild(td);body.appendChild(tr);
  });
 }
 function add(){
  const id=$("codeRefId").value.trim(),title=$("codeRefTitle").value.trim(),edition=$("codeRefEdition").value.trim(),url=$("codeRefUrl").value.trim();
  if(!id||!title||!edition||!/^https:\/\//i.test(url)){alert("کد، عنوان، ویرایش و نشانی HTTPS معتبر الزامی است.");return;}
  state.custom=state.custom.filter(x=>x.id!==id);
  state.custom.push({id,title,edition,publisher:$("codeRefPublisher").value.trim()||"نامشخص",kind:"منبع افزوده‌شده توسط کاربر",status:"تأییدنشده ـ نیازمند بررسی",url,notes:$("codeRefNotes").value.trim()});
  render();document.dispatchEvent(new Event("change",{bubbles:true}));
  const s=$("codeReferenceStatus");if(s)s.textContent="منبع افزوده شد؛ تا زمان بررسی فایل و مرجع رسمی، در محاسبات خودکار استفاده نمی‌شود.";
 }
 function mount(){
  if($("codeReferencePanel"))return;
  const p=document.createElement("section");p.className="panel";p.id="codeReferencePanel";
  p.innerHTML=`
   <div class="panel-title"><h3>دفترخانه مباحث و آیین‌نامه‌های مهندسی</h3><span class="status">ثبت منبع و ویرایش</span></div>
   <div class="notice">این فهرست برای مدیریت نسخه‌ها و ردیابی منابع است؛ ثبت یک لینک یا فایل، به معنی تأیید رسمی آن نیست. تا زمانی که متن سند، اصلاحیه‌ها و بند/جدول/صفحه کنترل نشده باشند، هیچ ضریب یا حکم آیین‌نامه‌ای از آن به موتور طراحی منتقل نمی‌شود.</div>
   <div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>کد</th><th>عنوان</th><th>ویرایش</th><th>وضعیت اعتبارسنجی</th><th>منبع</th></tr></thead><tbody id="codeReferenceRows"></tbody></table></div>
   <h4>افزودن منبع یا اصلاحیه جدید</h4>
   <div class="form-grid">
    <div class="field"><label for="codeRefId">کد یکتا</label><input id="codeRefId" placeholder="مثلاً M6-ERRATA-1402"></div>
    <div class="field"><label for="codeRefTitle">عنوان سند</label><input id="codeRefTitle"></div>
    <div class="field"><label for="codeRefEdition">ویرایش / تاریخ</label><input id="codeRefEdition"></div>
    <div class="field"><label for="codeRefPublisher">ناشر / مرجع</label><input id="codeRefPublisher"></div>
    <div class="field"><label for="codeRefUrl">لینک HTTPS</label><input id="codeRefUrl" type="url"></div>
    <div class="field"><label for="codeRefNotes">یادداشت بررسی</label><input id="codeRefNotes"></div>
   </div>
   <button id="codeRefAdd" class="btn primary" type="button">ثبت منبع</button>
   <div id="codeReferenceStatus" class="notice">منابع افزوده‌شده همراه فایل پروژه ذخیره می‌شوند.</div>
   <p class="geometry-hint">منابع اولیه: مبحث ۶ ویرایش ۱۳۹۸؛ مبحث ۱۰ ویرایش ۱۴۰۱؛ مباحث ۷، ۸ و ۹؛ استاندارد ۲۸۰۰ ویرایش چهارم. اصلاحیه‌ها و ابلاغیه‌های بعدی باید جداگانه ثبت و بررسی شوند.</p>
  `;
  const market=$("marketPricePanel"),footer=document.querySelector("footer");
  if(market)market.parentNode.insertBefore(p,market);else if(footer)footer.parentNode.insertBefore(p,footer);else document.querySelector("main")?.appendChild(p);
  $("codeRefAdd").addEventListener("click",add);render();
 }
 window.SteelCodeReferences={getData,setData,render};
 document.addEventListener("DOMContentLoaded",mount);
})();

/* ===== steel2/js/cost-estimate-engine.js ===== */
/* SAHROUD STEEL — Cost estimation
 * Uses BOQ quantities and explicitly entered or registered prices; never fabricates prices.
 * All monetary inputs are toman. Market prices are suggestions until user confirms them.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),N=v=>{const x=Number(v);return Number.isFinite(x)&&x>=0?x:null;};
 const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:0});
 const defaultManualItems=[
  {key:"foundationConcrete",label:"بتن فونداسیون و شناژ",unit:"مترمکعب",priceCode:"concrete.ready",priceUnit:"تومان/مترمکعب"},
  {key:"foundationRebar",label:"میلگرد فونداسیون (مقدار دستی/طراحی‌شده)",unit:"کیلوگرم",priceCode:"rebar.a3",priceUnit:"تومان/کیلوگرم"},
  {key:"pedestalRebar",label:"آرماتور طولی و خاموت پدستال",unit:"کیلوگرم",priceCode:"rebar.a3",priceUnit:"تومان/کیلوگرم"},
  {key:"tieRebar",label:"آرماتور شناژ (برآورد وزنی واردشده)",unit:"کیلوگرم",priceCode:"rebar.a3",priceUnit:"تومان/کیلوگرم"},
  {key:"excavation",label:"خاکبرداری و تسطیح",unit:"مترمکعب",priceCode:"excavation",priceUnit:"تومان/مترمکعب"},
  {key:"formwork",label:"قالب‌بندی فونداسیون",unit:"مترمربع",priceCode:"formwork",priceUnit:"تومان/مترمربع"},
  {key:"anchorBolts",label:"تعداد بولت و صفحه‌ستون (در صورت قیمت‌گذاری عددی)",unit:"عدد",priceCode:"anchor.bolt",priceUnit:"تومان/عدد"},
  {key:"floorConcrete",label:"بتن کف سوله (۱۵ سانتی‌متر؛ مقدار از متره)",unit:"مترمکعب",priceCode:"concrete.floor",priceUnit:"تومان/مترمکعب"},
  {key:"blindingConcrete",label:"بتن مگر زیر فونداسیون (ضخامت و پیش‌آمدگی از نقشه)",unit:"مترمکعب",priceCode:"concrete.ready",priceUnit:"تومان/مترمکعب"},
  {key:"siteworkExcavation",label:"خاکبرداری نوار شناژ تا زیر بتن مگر",unit:"مترمکعب"},
  {key:"siteworkBackfill",label:"خاکریزی فضای باقی‌مانده پس از بتن‌ریزی",unit:"مترمکعب"},
  {key:"siteworkGroundFill",label:"خاکریزی زمین گود تا تراز کف سوله",unit:"مترمکعب"},
  {key:"doors",label:"درب‌ها و کرکره‌ها",unit:"مترمربع",priceCode:"door.industrial",priceUnit:"تومان/مترمربع"},
  {key:"gutters",label:"آبرو و لوله‌های ناودانی",unit:"متر",priceCode:"gutter",priceUnit:"تومان/متر"},
  {key:"electrical",label:"برق و روشنایی",unit:"مجموع",priceCode:"electrical.package",priceUnit:"تومان/مجموع"},
  {key:"other",label:"سایر هزینه‌های مستقیم",unit:"مجموع"}
 ];
 const state={prices:{},percent:{transport:0,fabrication:0,installation:0,paint:0,overhead:0,contingency:0,tax:0},steelPricingMode:"steel_only",manualItems:defaultManualItems.map(x=>({...x,quantity:"",unitPrice:""})),last:null};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const definitions=[
  {key:"steel",label:"فولاد اسکلت و ورق اتصال",unit:"کیلوگرم",priceCode:"steel.general",qty:r=>r.steelMassTakeoff?.procurementMassExcludingBoltsAndWeldKg??null,priceUnit:"تومان/کیلوگرم"},
  {key:"brick",label:"آجر",unit:"عدد",priceCode:"brick",qty:r=>r.totals?.estimatedBrickCount??null,priceUnit:"تومان/عدد"},
  {key:"mortar",label:"ملات",unit:"مترمکعب",priceCode:"mortar",qty:r=>r.totals?.estimatedMortarVolumeM3??null,priceUnit:"تومان/مترمکعب"},
  {key:"roof",label:"پوشش سقف",unit:"مترمربع",priceCode:"roof.cover",qty:r=>r.totals?.roofCoverAreaApproxM2??null,priceUnit:"تومان/مترمربع"},
  {key:"panel",label:"ساندویچ‌پنل دیوار",unit:"مترمربع",priceCode:"panel.wall40",qty:r=>(r.facades||[]).filter(x=>x.material==="sandwich-panel").reduce((s,x)=>s+x.netAreaM2,0),priceUnit:"تومان/مترمربع"},
  {key:"sheet",label:"ورق فلزی دیوار",unit:"مترمربع",priceCode:"sheet.wall",qty:r=>(r.facades||[]).filter(x=>x.material==="metal-sheet").reduce((s,x)=>s+x.netAreaM2,0),priceUnit:"تومان/مترمربع"},
  {key:"plaster",label:"اندود دو طرف دیوار آجری",unit:"مترمربع",priceCode:"plaster",qty:r=>r.totals?.plasterAreaBothFacesM2??null,priceUnit:"تومان/مترمربع"},
  {key:"bolt",label:"پیچ‌ها (وزن ساق نظری)",unit:"کیلوگرم",priceCode:"bolt",qty:r=>r.steelMassTakeoff?.boltShankMassKg??null,priceUnit:"تومان/کیلوگرم"},
  {key:"weld",label:"فلز جوش نظری",unit:"کیلوگرم",priceCode:"weld",qty:r=>r.steelMassTakeoff?.theoreticalWeldMetalMassKg??null,priceUnit:"تومان/کیلوگرم"}
 ];
 function projectCity(){const market=window.SteelMarketPrices;const v=market&&typeof market.getProjectCity==="function"?market.getProjectCity():(document.getElementById("city")?.selectedOptions?.[0]?.textContent||"");return String(v||"").replace(/\s*\(پیش‌فرض\)\s*/g,"").trim();}
 function cityKey(v){return String(v||"").replace(/\s*\(پیش‌فرض\)\s*/g,"").replace(/\s+/g,"").trim().toLowerCase();}
 function marketPrice(code,expectedUnit){const d=window.SteelMarketPrices?.getData?.(),city=cityKey(projectCity());if(!city)return null;const compatible=(d?.prices||[]).filter(p=>p.code===code&&p.unit===expectedUnit&&cityKey(p.city)===city);compatible.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));return compatible[0]||null;}
 function render(){
  const root=$("quantityTakeoffPanel");if(!root||$("costEstimatePanel"))return;
  const p=document.createElement("section");p.className="panel";p.id="costEstimatePanel";
  p.innerHTML='<div class="panel-title"><h3>برآورد مالی و قیمت تمام‌شده سوله</h3><span class="status">تومان ـ قیمت قابل تأیید</span></div>'+
   '<div class="notice">مقادیر از آخرین متره محاسبه‌شده گرفته می‌شوند. قیمت‌ها از بانک قیمت یا ورود دستی پیشنهاد می‌شوند؛ تا زمان تأیید کاربر، قیمت منبع بازار قطعی خرید تلقی نمی‌شود. اقلام نامعلوم یا فاقد مقدار/قیمت در جمع لحاظ نمی‌شوند و هشدار می‌گیرند.</div>'+
   '<div class="form-grid"><div class="field"><label for="costSteelMode">روش قیمت‌گذاری فولاد</label><select id="costSteelMode"><option value="steel_only">فقط اسکلت و ورق اتصال؛ پیچ و جوش جدا</option><option value="fabricated">قیمت هر کیلو فولاد ساخته‌شده شامل ساخت و اتصالات؛ اقلام پیچ و جوش جداگانه صفر شوند</option></select></div></div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>قلم</th><th>مقدار</th><th>واحد</th><th>قیمت واحد (تومان)</th><th>منبع پیشنهادی</th><th>هزینه</th></tr></thead><tbody id="costEstimateRows"></tbody></table></div>'+
   '<h4>هزینه‌های تکمیلی اجرا و فونداسیون</h4><div class="notice">مقادیر این بخش هنوز از طراحی فونداسیون استخراج نشده‌اند؛ فقط پس از متره یا استعلام واقعی وارد کنید. مواردی را که قبلاً در اقلام دیگر یا قیمت ساخت منظور کرده‌اید دوباره ثبت نکنید.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:720px"><thead><tr><th>شرح</th><th>مقدار</th><th>واحد</th><th>قیمت واحد (تومان)</th><th>منبع قیمت</th><th>هزینه</th></tr></thead><tbody id="costManualRows"></tbody></table></div>'+
   '<h4>هزینه‌های درصدی</h4><div class="form-grid">'+
   '<div class="field"><label for="costTransport">حمل‌ونقل (%)</label><input id="costTransport" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costFabrication">ساخت/برش/سوراخ‌کاری (%)</label><input id="costFabrication" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costInstallation">نصب و جرثقیل (%)</label><input id="costInstallation" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costPaint">رنگ و ضدزنگ (%)</label><input id="costPaint" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costOverhead">بالاسری (%)</label><input id="costOverhead" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costContingency">ذخیره ریسک/پیش‌بینی‌نشده (%)</label><input id="costContingency" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="costTax">مالیات/عوارض (%)</label><input id="costTax" type="number" min="0" step="0.1"></div></div>'+
   '<div class="button-grid"><button id="btnCalculateCost" type="button" class="btn primary">محاسبه هزینه کل</button><button id="btnExportCost" type="button" class="btn secondary" disabled>دریافت گزارش هزینه CSV</button></div>'+
   '<div id="costEstimateSummary" class="notice">ابتدا متره را اجرا کنید؛ سپس قیمت‌ها را وارد یا از بانک قیمت انتخاب کنید.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  $("costSteelMode").value=state.steelPricingMode;
  Object.keys(state.percent).forEach(k=>{const el=$("cost"+k[0].toUpperCase()+k.slice(1));if(el)el.value=state.percent[k];el?.addEventListener("change",()=>{state.percent[k]=N(el.value)??0;});});
  $("costSteelMode").addEventListener("change",()=>{state.steelPricingMode=$("costSteelMode").value;});
  $("btnCalculateCost").addEventListener("click",calculate);
  $("btnExportCost").addEventListener("click",exportCSV);
  renderRows();renderManualItems();
  $("city")?.addEventListener("change",()=>{renderRows();});
  $("cityName")?.addEventListener("input",()=>{renderRows();});
 }
 function renderRows(){
  const body=$("costEstimateRows");if(!body)return;body.replaceChildren();
  definitions.forEach(d=>{
   const tr=document.createElement("tr"),qty=state.last?d.qty(state.last):null,mp=marketPrice(d.priceCode,d.priceUnit),manual=state.prices[d.key]??"";
   const vals=[d.label,qty===null||qty===undefined?"نامشخص":fmt(qty),d.unit];
   vals.forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
   const priceTd=document.createElement("td"),input=document.createElement("input");input.type="number";input.min="0";input.step="any";input.placeholder="قیمت واحد";input.value=manual!==""?manual:(mp?.price??"");input.dataset.costKey=d.key;input.addEventListener("change",()=>{state.prices[d.key]=input.value;});priceTd.appendChild(input);tr.appendChild(priceTd);
   const src=document.createElement("td");src.textContent=mp?((mp.seller||mp.source)+" | بازار: "+(mp.city||"نامشخص")+" | "+(cityKey(mp.city)===cityKey(projectCity())?"هم‌شهر پروژه":"قیمت شهر دیگر؛ حمل تا پروژه باید بررسی شود")+" | تحویل: "+(mp.deliveryCity||"نامشخص")+" | "+(mp.includesFreight?"حمل منظور شده":mp.freightToman!==null&&mp.freightToman!==undefined?"حمل جداگانه ثبت شده":"حمل نامشخص")+" | "+(mp.includesTax?"مالیات منظور شده":mp.taxPercent!==null&&mp.taxPercent!==undefined?"مالیات جداگانه ثبت شده":"مالیات نامشخص")+" | "+(mp.verifiedByUser?"تأیید دستی":"تأییدنشده")+" | "+new Date(mp.updatedAt).toLocaleDateString("fa-IR")+" | "+(Date.now()-new Date(mp.updatedAt).getTime()>36*3600000?"قدیمی":"جدید")+" | واحد منطبق؛ کنترل نهایی لازم"):(state.prices[d.key]!==undefined?"ورود دستی":"قیمت منطبق ثبت نشده؛ کد: "+d.priceCode+"، واحد لازم: "+d.priceUnit);tr.appendChild(src);
   const total=document.createElement("td");total.textContent="—";total.dataset.costTotal=d.key;tr.appendChild(total);body.appendChild(tr);
  });
 }
 function renderManualItems(){
  const body=$("costManualRows");if(!body)return;body.replaceChildren();
  state.manualItems.forEach(item=>{
   const tr=document.createElement("tr"),name=document.createElement("td");name.textContent=item.label;tr.appendChild(name);
   const qc=document.createElement("td"),q=document.createElement("input");q.type="number";q.min="0";q.step="any";q.placeholder="مقدار";q.value=item.quantity??"";q.dataset.manualKey=item.key;q.dataset.manualField="quantity";qc.appendChild(q);tr.appendChild(qc);
   const uc=document.createElement("td"),unit=document.createElement("input");unit.type="text";unit.value=item.unit;unit.dataset.manualKey=item.key;unit.dataset.manualField="unit";uc.appendChild(unit);tr.appendChild(uc);
   const pc=document.createElement("td"),price=document.createElement("input");price.type="number";price.min="0";price.step="any";price.placeholder="قیمت واحد";price.value=item.unitPrice??"";price.dataset.manualKey=item.key;price.dataset.manualField="unitPrice";pc.appendChild(price);tr.appendChild(pc);
   const src=document.createElement("td"),quote=item.priceCode?marketPrice(item.priceCode,item.priceUnit):null;
   if(quote){
    const note=document.createElement("small");note.textContent=(quote.seller||quote.source||"منبع قیمت")+" | "+(quote.city||"شهر نامشخص")+" | "+(cityKey(quote.city)===cityKey(projectCity())?"هم‌شهر پروژه":"شهر دیگر")+" | "+(quote.verifiedByUser?"تأیید دستی":"تأییدنشده");src.appendChild(note);
    const use=document.createElement("button");use.type="button";use.className="btn secondary";use.textContent="استفاده از قیمت بازار";use.addEventListener("click",()=>{item.unitPrice=String(quote.price);item.priceSource="market";renderManualItems();});src.appendChild(use);
   }else src.textContent=item.priceSource==="manual"?"ورود دستی":"قیمت هم‌واحد ثبت نشده";
   const total=document.createElement("td");total.dataset.manualTotal=item.key;total.textContent="—";tr.appendChild(src);tr.appendChild(total);
   [q,unit,price].forEach(el=>el.addEventListener("change",()=>{item[el.dataset.manualField]=el.value;if(el.dataset.manualField==="quantity")item.quantitySource="manual";if(el.dataset.manualField==="unitPrice")item.priceSource="manual";}));
   body.appendChild(tr);
  });
 }
 function refreshFromFoundation(report){
  if(!report)return;
  const links={foundationConcrete:report.totalConcreteM3,foundationRebar:report.footingRebarKg,pedestalRebar:report.pedestalRebarKg,excavation:report.excavationM3,formwork:report.totalFormworkM2,anchorBolts:report.anchorsCount,tieRebar:report.tieRebarKg};
  let changed=false;
  state.manualItems.forEach(item=>{
   if(!Object.prototype.hasOwnProperty.call(links,item.key)||item.quantitySource==="manual"||item.quantitySource==="anchorSchedule")return;
   const value=links[item.key];
   if(value===null||value===undefined||!Number.isFinite(Number(value))){if(item.quantitySource==="foundation"){item.quantity="";item.quantitySource="pending";changed=true;}return;}
   item.quantity=String(value);item.quantitySource="foundation";changed=true;
  });
  if(changed)renderManualItems();
 }
 function refreshFromSiteWork(report){
  if(!report)return;
  const links={floorConcrete:report.slabConcreteM3,blindingConcrete:report.blindingConcreteM3,siteworkExcavation:report.excavationM3,siteworkBackfill:report.backfillM3,siteworkGroundFill:report.fillNetM3};
  let changed=false;
  state.manualItems.forEach(item=>{
   if(!Object.prototype.hasOwnProperty.call(links,item.key)||item.quantitySource==="manual"||item.quantitySource==="anchorSchedule")return;
   const value=links[item.key];
   if(value===null||value===undefined||!Number.isFinite(Number(value))){if(item.quantitySource==="siteWork"){item.quantity="";item.quantitySource="pending";changed=true;}return;}
   item.quantity=String(value);item.quantitySource="siteWork";changed=true;
  });
  if(changed)renderManualItems();
 }
 function refreshFromAnchorTakeoff(report){
  if(!report||report.boltCount===null||report.boltCount===undefined)return;
  const item=state.manualItems.find(x=>x.key==="anchorBolts");
  if(item&&item.quantitySource!=="manual"){
   item.quantity=String(report.boltCount);
   item.quantitySource="anchorSchedule";
   renderManualItems();
  }
 }
 function calculate(){
  const r=window.SteelQuantityTakeoff?.lastResult;
  if(!r){$("costEstimateSummary").textContent="ابتدا دکمه محاسبه متره را اجرا کنید.";return;}
  state.last=r;renderRows();const rows=[];let subtotal=0,missing=[],pricingWarnings=[],quotedFreightTotal=0;const freightQuoteKeys=new Set();
  definitions.forEach(d=>{
   const q=d.qty(r),el=document.querySelector('[data-cost-key="'+d.key+'"]'),p=N(el?.value),quote=marketPrice(d.priceCode,d.priceUnit);
   if(el)state.prices[d.key]=el.value;
   if(quote&&el&&String(el.value)===String(quote.price)){
    if(cityKey(quote.city)!==cityKey(projectCity()))pricingWarnings.push(d.label+": قیمت از شهر دیگری است؛ هزینه تأمین تا "+(projectCity()||"شهر پروژه")+" باید جداگانه تعیین شود.");
    if(!quote.deliveryCity)pricingWarnings.push(d.label+": شهر تحویل در پیش‌فاکتور مشخص نشده است.");
    if(quote.deliveryCity&&cityKey(quote.deliveryCity)!==cityKey(projectCity()))pricingWarnings.push(d.label+": شهر تحویل اعلام‌شده با شهر پروژه یکسان نیست.");
    if(!quote.includesFreight&&quote.freightToman===null)pricingWarnings.push(d.label+": وضعیت/مبلغ حمل در قیمت بازار مشخص نیست.");
    if(!quote.includesFreight&&quote.freightToman!==null){
     if(Number(q)>0&&cityKey(quote.deliveryCity)===cityKey(projectCity())&&cityKey(projectCity())){
      const freightKey=[quote.sourceUrl||"",quote.seller,quote.source,quote.city,quote.deliveryCity,quote.updatedAt].join("|");
      if(!freightQuoteKeys.has(freightKey)){quotedFreightTotal+=Number(quote.freightToman)||0;freightQuoteKeys.add(freightKey);}
     }else pricingWarnings.push(d.label+": مبلغ حمل ثبت شده است اما چون شهر تحویل با شهر پروژه تطبیق ندارد، در جمع منظور نشد.");
    }
    if(!quote.includesTax&&quote.taxPercent===null)pricingWarnings.push(d.label+": وضعیت مالیات قیمت بازار مشخص نیست.");else if(!quote.includesTax&&quote.taxPercent!==null)pricingWarnings.push(d.label+": درصد مالیات در منبع ثبت شده اما خودکار اعمال نشده؛ آن را در مالیات عمومی برآورد لحاظ یا کنترل کنید.");
    if(!quote.verifiedByUser)pricingWarnings.push(d.label+": قیمت بازار هنوز توسط کاربر با فروشنده یا پیش‌فاکتور تأیید نشده است.");
   }
   if(q===null||q===undefined||!Number.isFinite(Number(q))){missing.push(d.label+": مقدار نامعلوم");return;}
   if(!(p>0)){if(Number(q)>0)missing.push(d.label+": قیمت واحد وارد نشده");return;}
   if(state.steelPricingMode==="fabricated"&&(d.key==="bolt"||d.key==="weld")){if(el)el.value="";return;}
   const amount=Number(q)*p;subtotal+=amount;rows.push({key:d.key,label:d.label,quantity:Number(q),unit:d.unit,unitPrice:p,cost:amount});
   const cell=document.querySelector('[data-cost-total="'+d.key+'"]');if(cell)cell.textContent=fmt(amount);
  });
  state.manualItems.forEach(item=>{
   const q=N(item.quantity),p=N(item.unitPrice);
   if((item.quantity!==""&&item.quantity!==undefined)||(item.unitPrice!==""&&item.unitPrice!==undefined)){
    if(!(q>0)||!(p>0)){missing.push(item.label+": مقدار یا قیمت واحد تکمیل نشده");return;}
    if(item.priceSource==="market"&&item.priceCode){
     const quote=marketPrice(item.priceCode,item.priceUnit);
     if(quote&&String(item.unitPrice)===String(quote.price)){
      if(cityKey(quote.city)!==cityKey(projectCity()))pricingWarnings.push(item.label+": قیمت بازار از شهر دیگری است؛ حمل تا محل پروژه باید بررسی شود.");
      if(!quote.deliveryCity)pricingWarnings.push(item.label+": شهر تحویل قیمت بازار مشخص نیست.");
      if(quote.deliveryCity&&cityKey(quote.deliveryCity)!==cityKey(projectCity()))pricingWarnings.push(item.label+": شهر تحویل قیمت بازار با شهر پروژه تطبیق ندارد.");
      if(!quote.includesFreight&&quote.freightToman===null)pricingWarnings.push(item.label+": حمل در قیمت بازار نامشخص است.");
      if(!quote.includesFreight&&quote.freightToman!==null&&Number(q)>0&&cityKey(quote.deliveryCity)===cityKey(projectCity())&&cityKey(projectCity())){
       const freightKey=[quote.sourceUrl||"",quote.seller,quote.source,quote.city,quote.deliveryCity,quote.updatedAt].join("|");
       if(!freightQuoteKeys.has(freightKey)){quotedFreightTotal+=Number(quote.freightToman)||0;freightQuoteKeys.add(freightKey);}
      }
      if(!quote.includesTax&&quote.taxPercent===null)pricingWarnings.push(item.label+": وضعیت مالیات قیمت بازار مشخص نیست.");else if(!quote.includesTax&&quote.taxPercent!==null)pricingWarnings.push(item.label+": درصد مالیات ثبت شده اما خودکار اعمال نشده است؛ آن را در مالیات عمومی کنترل کنید.");
      if(!quote.verifiedByUser)pricingWarnings.push(item.label+": قیمت بازار هنوز تأیید دستی نشده است.");
     }else pricingWarnings.push(item.label+": قیمت پیشنهادی بانک قیمت دیگر در دسترس یا هم‌واحد نیست؛ قیمت را دوباره کنترل کنید.");
    }
    const amount=q*p;subtotal+=amount;rows.push({key:item.key,label:item.label,quantity:q,unit:item.unit,unitPrice:p,cost:amount});
    const cell=document.querySelector('[data-manual-total="'+item.key+'"]');if(cell)cell.textContent=fmt(amount);
   }
  });
  const pct=state.percent,base=subtotal;
  const extras={transport:base*pct.transport/100+quotedFreightTotal,fabrication:state.steelPricingMode==="fabricated"?0:base*pct.fabrication/100,installation:base*pct.installation/100,paint:base*pct.paint/100};
  const direct=base+Object.values(extras).reduce((a,b)=>a+b,0);
  extras.overhead=direct*pct.overhead/100;
  const afterOverhead=direct+extras.overhead;
  extras.contingency=afterOverhead*pct.contingency/100;
  const afterRisk=afterOverhead+extras.contingency;
  extras.tax=afterRisk*pct.tax/100;
  const total=afterRisk+extras.tax;
  state.lastCost={generatedAt:new Date().toISOString(),currency:"تومان",projectCity:projectCity(),rows,marketFreightTotal:quotedFreightTotal,pricingWarnings:[...new Set(pricingWarnings)],materialSubtotal:subtotal,percentageInputs:clone(pct),percentageCosts:extras,totalCost:total,missing,pricingMode:state.steelPricingMode,notice:"برآورد مقدماتی؛ قیمت‌های تأییدنشده، مقادیر ناقص و هزینه‌های فاقد داده در جمع لحاظ نشده‌اند."};
  window.SteelProjectBOQ?.refresh?.();
  $("costEstimateSummary").textContent="شهر اجرای پروژه: "+(projectCity()||"نامشخص")+"\nجمع اقلام دارای قیمت: "+fmt(subtotal)+" تومان\nحمل: "+fmt(extras.transport)+" | ساخت: "+fmt(extras.fabrication)+(state.steelPricingMode==="fabricated"?" (در قیمت ساخت هر کیلو منظور شده)":"")+" | نصب: "+fmt(extras.installation)+" | رنگ: "+fmt(extras.paint)+"\nبالاسری: "+fmt(extras.overhead)+" | ذخیره ریسک: "+fmt(extras.contingency)+" | مالیات: "+fmt(extras.tax)+"\nبرآورد کل اقلام قیمت‌گذاری‌شده: "+fmt(total)+" تومان\n"+(missing.length?"موارد خارج از جمع:\n"+missing.join("\n"):"تمام اقلام دارای مقدار قیمت‌گذاری شده‌اند.")+(pricingWarnings.length?"\n\nهشدارهای قیمت و تأمین:\n"+[...new Set(pricingWarnings)].join("\n"):"")+"\n\nاین رقم قیمت قطعی پیمان یا پیشنهاد فروشنده نیست."
  $("btnExportCost").disabled=false;
 }
 function exportCSV(){
  const c=state.lastCost;if(!c)return;
  const rows=[["شهر اجرای پروژه",c.projectCity||"نامشخص","","",""],["شرح","مقدار","واحد","قیمت واحد تومان","هزینه تومان"],...c.rows.map(x=>[x.label,x.quantity,x.unit,x.unitPrice,x.cost]),["جمع اقلام","","","",c.materialSubtotal],...Object.entries(c.percentageCosts).map(([k,v])=>[k,"","درصد/تومان",c.percentageInputs[k],v]),["حمل ثبت‌شده در پیش‌فاکتور","","","",c.marketFreightTotal||0],["برآورد کل","","","",c.totalCost],["ملاحظات",c.notice,"","",""],...(c.missing||[]).map(w=>["خارج از جمع",w,"","",""]),...(c.pricingWarnings||[]).map(w=>["هشدار قیمت و تأمین",w,"","",""])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Cost-Estimate.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function getData(){return clone({prices:state.prices,percent:state.percent,steelPricingMode:state.steelPricingMode,manualItems:state.manualItems});}
 function setData(d){if(!d||typeof d!=="object")return;state.prices=d.prices||{};state.percent={...state.percent,...(d.percent||{})};state.steelPricingMode=d.steelPricingMode||"steel_only";if(Array.isArray(d.manualItems))state.manualItems=defaultManualItems.map(def=>({...def,...(d.manualItems.find(x=>x.key===def.key)||{})}));if($("costSteelMode"))$("costSteelMode").value=state.steelPricingMode;Object.keys(state.percent).forEach(k=>{const el=$("cost"+k[0].toUpperCase()+k.slice(1));if(el)el.value=state.percent[k];});renderRows();renderManualItems();}
 document.addEventListener("DOMContentLoaded",()=>{render();});
 window.SteelCostEstimate={getData,setData,calculate,refreshFromBOQ:(report)=>{if(report&&typeof report==="object"){state.last=report;renderRows();}},refreshFromFoundation,refreshFromSiteWork,refreshFromAnchorTakeoff,getLast:()=>clone(state.lastCost||null)};
})();

/* ===== steel2/js/foundation-takeoff.js ===== */
/* SAHROUD STEEL — foundation reaction takeoff
 * Extracts support actions from the latest 3D analysis and calculates only user-dimensioned
 * preliminary quantities. It does NOT design footings, reinforcement, anchors or soil bearing.
 */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const keys=["footingClass","footingWidthM","footingLengthM","footingThicknessM","pedestalWidthM","pedestalLengthM","pedestalHeightM","columnOffsetXM","columnOffsetZM","excavationDepthM","workingSpaceM","anchorsPerBase","tieCount","tieTotalLengthM","tieWidthM","tieHeightM","tieRebarKgPerM","soilAllowableKPa","concreteUnitWeightKNm3","soilUnitWeightKNm3","soilCoverDepthM","slidingFrictionMu","bottomBarDiaXmm","bottomBarSpacingXmm","bottomBarDiaZmm","bottomBarSpacingZmm","topBarDiaXmm","topBarSpacingXmm","topBarDiaZmm","topBarSpacingZmm","pedestalLongBarDiaMm","pedestalLongBarsPerBase","pedestalLongBarCutLengthM","pedestalTieBarDiaMm","pedestalTiesPerBase","pedestalTieCutLengthM","rebarCoverMm"];
 const state={footingClass:"main",footingWidthM:"1.80",footingLengthM:"1.80",footingThicknessM:"0.80",pedestalWidthM:"",pedestalLengthM:"",pedestalHeightM:"",columnOffsetXM:"",columnOffsetZM:"",excavationDepthM:"",workingSpaceM:"",anchorsPerBase:"",tieCount:"",tieTotalLengthM:"",tieWidthM:"0.60",tieHeightM:"0.50",tieRebarKgPerM:"",soilAllowableKPa:"",concreteUnitWeightKNm3:"",soilUnitWeightKNm3:"",soilCoverDepthM:"",slidingFrictionMu:"",bottomBarDiaXmm:"16",bottomBarSpacingXmm:"150",bottomBarDiaZmm:"16",bottomBarSpacingZmm:"150",topBarDiaXmm:"",topBarSpacingXmm:"",topBarDiaZmm:"",topBarSpacingZmm:"",pedestalLongBarDiaMm:"",pedestalLongBarsPerBase:"",pedestalLongBarCutLengthM:"",pedestalTieBarDiaMm:"",pedestalTiesPerBase:"",pedestalTieCutLengthM:"",rebarCoverMm:""};
 const map={footingClass:"ftClass",footingWidthM:"ftWidth",footingLengthM:"ftLength",footingThicknessM:"ftThickness",pedestalWidthM:"ftPedWidth",pedestalLengthM:"ftPedLength",pedestalHeightM:"ftPedHeight",columnOffsetXM:"ftColumnOffsetX",columnOffsetZM:"ftColumnOffsetZ",excavationDepthM:"ftExcDepth",workingSpaceM:"ftWorking",anchorsPerBase:"ftAnchors",tieCount:"ftTieCount",tieTotalLengthM:"ftTieLength",tieWidthM:"ftTieWidth",tieHeightM:"ftTieHeight",tieRebarKgPerM:"ftTieRebar",soilAllowableKPa:"ftSoilAllow",concreteUnitWeightKNm3:"ftConcreteGamma",soilUnitWeightKNm3:"ftSoilGamma",soilCoverDepthM:"ftSoilCover",slidingFrictionMu:"ftSlidingMu",bottomBarDiaXmm:"ftBarDiaX",bottomBarSpacingXmm:"ftBarSpacingX",bottomBarDiaZmm:"ftBarDiaZ",bottomBarSpacingZmm:"ftBarSpacingZ",topBarDiaXmm:"ftTopBarDiaX",topBarSpacingXmm:"ftTopBarSpacingX",topBarDiaZmm:"ftTopBarDiaZ",topBarSpacingZmm:"ftTopBarSpacingZ",pedestalLongBarDiaMm:"ftPedLongDia",pedestalLongBarsPerBase:"ftPedLongCount",pedestalLongBarCutLengthM:"ftPedLongLength",pedestalTieBarDiaMm:"ftPedTieDia",pedestalTiesPerBase:"ftPedTieCount",pedestalTieCutLengthM:"ftPedTieLength",rebarCoverMm:"ftRebarCover"};
 const fmt=x=>Number(x).toLocaleString("fa-IR",{maximumFractionDigits:3});
 const num=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
 const signedNum=x=>{if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(x);return Number.isFinite(n)?n:null;};
 function validateReactionCaseCoverage(rows){
  const issues=[],all=Array.isArray(rows)?rows:[];
  if(!all.length)return{ok:false,issues:["فهرست پایه‌های فونداسیون خالی است."],labels:[]};
  let expected=null;
  all.forEach(row=>{
   const id=String(row?.nodeId??""),cases=row?.caseReactions;
   if(!Array.isArray(cases)||!cases.length){issues.push("پوش واکنش تفکیک‌شده برحسب حالت بار برای پایه "+id+" موجود نیست؛ واکنش منفرد جایگزین پذیرفته نمی‌شود.");return;}
   const seen=new Set();
   cases.forEach(item=>{
    const label=String(item?.label??"");
    if(!label||seen.has(label)){issues.push("شناسه حالت بار خالی یا تکراری برای پایه "+id+" است.");return;}
    seen.add(label);
    if(!Array.isArray(item.values)||item.values.length!==6||!item.values.every(v=>typeof v==="number"&&Number.isFinite(v)))issues.push("واکنش پایه "+id+" در حالت "+label+" باید دقیقاً شش مؤلفه عددی محدود داشته باشد.");
   });
   const labels=Array.from(seen).sort();
   if(expected===null)expected=labels;
   else if(labels.length!==expected.length||labels.some((x,i)=>x!==expected[i]))issues.push("پوش حالات بار پایه "+id+" با سایر پایه‌ها یکسان نیست.");
  });
  return{ok:issues.length===0,issues,labels:expected||[]};
 }
 let lastReport=null;
 let footingSchedule={};
 let rebarIsoView={angle:0,zoom:1};
 function panel(){
  if($("foundationTakeoffPanel"))return;
  const root=$("costEstimatePanel")||$("quantityTakeoffPanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="foundationTakeoffPanel";p.setAttribute("data-focus-group","foundation");
  p.innerHTML='<div class="panel-title"><h3>متره فونداسیون بر اساس واکنش‌های تحلیل سه‌بعدی</h3><span class="status">استخراج نیرو؛ نه طراحی پی</span></div>'+
   '<div class="notice">ابتدا تحلیل سه‌بعدی موردنظر را اجرا کنید؛ سپس واکنش‌های گره‌های پایه از همان حالت بار استخراج می‌شوند. ابعاد پی باید پس از طراحی ژئوتکنیکی و سازه‌ای وارد شوند. این بخش فعلاً واکنش‌ها و مقادیر هندسیِ مبتنی بر ابعاد واردشده را گزارش می‌کند و ظرفیت خاک، برون‌مرکزی، لغزش، واژگونی، پانچ، برش یک‌طرفه، آرماتور و بولت را طراحی یا تأیید نمی‌کند.</div>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="ftClass">نوع پیِ مبنای ابعاد پیش‌فرض</label><select id="ftClass"><option value="main" selected>پی ستون اصلی ـ ۱٫۸۰ × ۱٫۸۰ متر</option><option value="secondary">پی ستون فرعی ـ ۱٫۴۰ × ۱٫۴۰ متر</option><option value="custom">ابعاد سفارشی</option></select><small>این انتخاب فعلاً برای مجموعه ابعاد ورودی متره است؛ تخصیص متفاوت به تک‌تک پایه‌ها در مرحله جدول‌بندی پی‌ها اضافه می‌شود.</small></div>'+
   '<div class="field"><label for="ftWidth">عرض پی در راستای X (متر)</label><input id="ftWidth" type="number" min="0" step="0.05" value="1.80"></div>'+
   '<div class="field"><label for="ftLength">طول پی در راستای Z (متر)</label><input id="ftLength" type="number" min="0" step="0.05" value="1.80"></div>'+
   '<div class="field"><label for="ftThickness">ضخامت پی (متر)</label><input id="ftThickness" type="number" min="0" step="0.05" value="0.80"></div>'+
   '<div class="field"><label for="ftPedWidth">عرض پدستال (متر؛ اختیاری)</label><input id="ftPedWidth" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftPedLength">طول پدستال (متر؛ اختیاری)</label><input id="ftPedLength" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftPedHeight">ارتفاع پدستال (متر؛ اختیاری)</label><input id="ftPedHeight" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftColumnOffsetX">جابه‌جایی محور ستون از مرکز پی در X (متر؛ مثبت به سمت +X)</label><input id="ftColumnOffsetX" type="number" step="0.01" placeholder="اگر وسط است، صفر وارد کنید"></div>'+
   '<div class="field"><label for="ftColumnOffsetZ">جابه‌جایی محور ستون از مرکز پی در Z (متر؛ مثبت به سمت +Z)</label><input id="ftColumnOffsetZ" type="number" step="0.01" placeholder="اگر وسط است، صفر وارد کنید"></div>'+
   '<div class="field"><label for="ftExcDepth">عمق خاکبرداری (متر)</label><input id="ftExcDepth" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftWorking">فضای کار خاکبرداری هر طرف (متر)</label><input id="ftWorking" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="ftAnchors">تعداد بولت در هر پایه</label><input id="ftAnchors" type="number" min="0" step="1"></div>'+
   '<div class="notice">متره شناژهای رابط — مقادیر را از نقشه فونداسیون وارد کنید؛ نرم‌افزار مسیر شناژ را حدس نمی‌زند.</div>'+
   '<div class="field"><label for="ftTieCount">تعداد شناژها</label><input id="ftTieCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div>'+
   '<div class="field"><label for="ftTieLength">مجموع طول شناژها (متر)</label><input id="ftTieLength" type="number" min="0" step="0.1" placeholder="جمع طول محور یا طول اجرایی"></div>'+
   '<div class="field"><label for="ftTieWidth">عرض شناژ (متر)</label><input id="ftTieWidth" type="number" min="0" step="0.05" value="0.60"></div>'+
   '<div class="field"><label for="ftTieHeight">ارتفاع شناژ (متر)</label><input id="ftTieHeight" type="number" min="0" step="0.05" value="0.50"></div>'+
   '<div class="field"><label for="ftTieRebar">وزن آرماتور شناژ (کیلوگرم بر متر؛ اختیاری)</label><input id="ftTieRebar" type="number" min="0" step="0.1" placeholder="از جدول آرماتوربندی"></div></div>'+'<h4>ورودی‌های ژئوتکنیک و وزن‌های مؤثر برای غربال فشار زیر پی</h4><div class="notice">این مقادیر باید از گزارش مکانیک خاک و مشخصات مصالح برداشته شوند. فشار مجاز واردشده باید از نظر gross/net بودن روشن باشد؛ فعلاً فقط فشار مجاز ناخالص قابل مقایسه است. وزن پی و خاک روی پی فقط با ورودی‌های زیر افزوده می‌شود.</div><div class="form-grid">'+'<div class="field"><label for="ftSoilAllow">ظرفیت باربری مجاز ناخالص خاک (kPa)</label><input id="ftSoilAllow" type="number" min="0" step="1" placeholder="از گزارش ژئوتکنیک؛ نه حدس"></div>'+'<div class="field"><label for="ftConcreteGamma">وزن مخصوص بتن (kN/m³)</label><input id="ftConcreteGamma" type="number" min="0" step="0.1" placeholder="طبق مشخصات پروژه"></div>'+'<div class="field"><label for="ftSoilGamma">وزن مخصوص خاک روی پی (kN/m³)</label><input id="ftSoilGamma" type="number" min="0" step="0.1" placeholder="در صورت وجود خاک پوششی"></div>'+'<div class="field"><label for="ftSoilCover">ضخامت خاک پوششی روی پی (متر)</label><input id="ftSoilCover" type="number" min="0" step="0.05" placeholder="از ترازهای واقعی"></div></div><div class="field"><label for="ftSlidingMu">ضریب اصطکاک خاک و بتن (μ)</label><input id="ftSlidingMu" type="number" min="0" step="0.01" placeholder="فقط از گزارش ژئوتکنیک"></div></div><h4>متره شبکه آرماتور تحتانی پی (بر اساس نقشه اجرایی)</h4><div class="notice">این بخش فقط تعداد، طول برش مستقیم و وزن تقریبی میلگردهای شبکه تحتانی را از قطر، فاصله و پوشش واردشده محاسبه می‌کند. قلاب، وصله، خم، تقویت موضعی، شبکه فوقانی و آرماتور پدستال منظور نشده‌اند؛ این محاسبه طراحی آرماتور نیست.</div><div class="form-grid"><div class="field"><label for="ftBarDiaX">قطر میلگردهای موازی X (mm)</label><input id="ftBarDiaX" type="number" min="0" step="1" value="16"></div><div class="field"><label for="ftBarSpacingX">فاصله میلگردهای موازی X (mm)</label><input id="ftBarSpacingX" type="number" min="0" step="5" value="150"></div><div class="field"><label for="ftBarDiaZ">قطر میلگردهای موازی Z (mm)</label><input id="ftBarDiaZ" type="number" min="0" step="1" value="16"></div><div class="field"><label for="ftBarSpacingZ">فاصله میلگردهای موازی Z (mm)</label><input id="ftBarSpacingZ" type="number" min="0" step="5" value="150"></div><div class="field"><label for="ftRebarCover">پوشش بتن تا سطح خارجی میلگرد (mm)</label><input id="ftRebarCover" type="number" min="0" step="5" placeholder="طبق نقشه و شرایط محیطی"></div></div><h4>متره شبکه آرماتور فوقانی پی</h4><div class="notice">ورودی‌های شبکه فوقانی مستقل‌اند؛ فقط در صورت وجود در نقشه اجرایی وارد کنید. اگر شبکه فوقانی وجود ندارد، این چهار ورودی را خالی بگذارید.</div><div class="form-grid"><div class="field"><label for="ftTopBarDiaX">قطر میلگردهای فوقانی موازی X (mm)</label><input id="ftTopBarDiaX" type="number" min="0" step="1" placeholder="طبق نقشه؛ در صورت عدم وجود خالی"></div><div class="field"><label for="ftTopBarSpacingX">فاصله میلگردهای فوقانی موازی X (mm)</label><input id="ftTopBarSpacingX" type="number" min="0" step="5" placeholder="طبق نقشه"></div><div class="field"><label for="ftTopBarDiaZ">قطر میلگردهای فوقانی موازی Z (mm)</label><input id="ftTopBarDiaZ" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftTopBarSpacingZ">فاصله میلگردهای فوقانی موازی Z (mm)</label><input id="ftTopBarSpacingZ" type="number" min="0" step="5" placeholder="طبق نقشه"></div></div><h4>متره آرماتور پدستال و خاموت‌ها</h4><div class="notice">تعداد و طول برش را از نقشه اجرایی یا جدول خم و برش وارد کنید. نرم‌افزار طول مهاری، قلاب، خم، وصله یا تعداد خاموت را حدس نمی‌زند. تعدادها برای هر پدستال هستند.</div><div class="form-grid"><div class="field"><label for="ftPedLongDia">قطر میلگرد طولی پدستال (mm)</label><input id="ftPedLongDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedLongCount">تعداد میلگرد طولی در هر پدستال</label><input id="ftPedLongCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedLongLength">طول برش هر میلگرد طولی (m)</label><input id="ftPedLongLength" type="number" min="0" step="0.01" placeholder="از جدول خم و برش"></div><div class="field"><label for="ftPedTieDia">قطر خاموت پدستال (mm)</label><input id="ftPedTieDia" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedTieCount">تعداد خاموت در هر پدستال</label><input id="ftPedTieCount" type="number" min="0" step="1" placeholder="طبق نقشه"></div><div class="field"><label for="ftPedTieLength">طول برش هر خاموت (m)</label><input id="ftPedTieLength" type="number" min="0" step="0.01" placeholder="از جدول خم و برش"></div></div><div id="foundationPedestalRebarSummary" class="notice">برای متره پدستال، مشخصات واقعی نقشه را وارد کنید.</div><div id="foundationRebarSummary" class="notice">برای متره آرماتور، قطر، فاصله و پوشش واقعی را وارد کنید.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:680px"><thead><tr><th>لایه</th><th>جهت میلگرد</th><th>تعداد در هر پی</th><th>طول هر شاخه (m)</th><th>طول کل (m)</th><th>وزن تقریبی (kg)</th></tr></thead><tbody id="foundationRebarRows"></tbody></table></div><h4>غربال مقدماتی لغزش پی منفرد</h4><div class="notice">ضریب اصطکاک باید از گزارش ژئوتکنیک/مشخصات تماس گرفته شود؛ مقدار پیش‌فرض نداریم. کنترل زیر فقط اصطکاک پایه پی منفرد را می‌سنجد و اثر چسبندگی، فشار جانبی خاک، شناژها، شمع، کلید برشی، آب زیرزمینی و ضرایب اطمینان آیین‌نامه‌ای را لحاظ نمی‌کند.</div><div id="foundationSlidingSummary" class="notice">برای غربال لغزش، ضریب اصطکاک معتبر و ابعاد پی لازم است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:700px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>ابعاد پی (m)</th><th>H (kN)</th><th>N مؤثر (kN)</th><th>μN (kN)</th><th>μN/H</th><th>نتیجه</th></tr></thead><tbody id="foundationSlidingRows"></tbody></table></div>'+'<h4>غربال مقدماتی بالاکشیدگی و نیاز احتمالی به مهار کششی</h4><div class="notice">این بخش فقط تقاضای کششی قائم را با وزن ثقلی پی و خاک پوششی مقایسه می‌کند. ظرفیت بولت، صفحه‌ستون و مهار بتن محاسبه نمی‌شود؛ نتیجه مثبت به‌هیچ‌وجه تأیید طراحی انکر نیست.</div><div id="foundationUpliftSummary" class="notice">پس از ورود ابعاد واقعی پی و وزن مخصوص مصالح، غربال انجام می‌شود.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>ابعاد پی (m)</th><th>تقاضای بالاکشیدگی (kN)</th><th>وزن پی و خاک (kN)</th><th>کسری ثقلی (kN)</th><th>نسبت تقاضا/وزن</th><th>نتیجه</th></tr></thead><tbody id="foundationUpliftRows"></tbody></table></div>'+'<div id="foundationBearingSummary" class="notice">پس از ورود داده‌های ژئوتکنیک و ابعاد واقعی، غربال فشار انجام می‌شود.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:780px"><thead><tr><th>گره پایه</th><th>حالت بار</th><th>ابعاد پی (m)</th><th>N (kN)</th><th>eX / eZ (m)</th><th>qmin (kPa)</th><th>qmax (kPa)</th><th>نتیجه غربال</th></tr></thead><tbody id="foundationBearingRows"></tbody></table></div>'+
   '<div class="button-grid"><button id="btnFoundationReactions" class="btn secondary" type="button">استخراج واکنش یک حالت بار</button><button id="btnFoundationEnvelope" class="btn primary" type="button">تحلیل پوش واکنش همه ترکیبات مقدماتی</button><button id="btnFoundationQuantities" class="btn secondary" type="button">محاسبه متره هندسی فونداسیون</button><button id="btnFoundationCSV" class="btn secondary" type="button" disabled>خروجی CSV واکنش و متره</button></div>'+
   '<div id="foundationTakeoffSummary" class="notice">هنوز واکنش تحلیل سه‌بعدی استخراج نشده است.</div>'+
    '<h4>جدول مستقل مشخصات فونداسیون هر پایه</h4><div class="notice">پیشنهاد اولیه: گره‌های ستون قاب (base) پی اصلی ۱۸۰×۱۸۰×۸۰ سانتی‌متر و گره‌های ستونک/دیوار انتهایی (endwall-base) پی فرعی ۱۴۰×۱۴۰×۸۰ سانتی‌متر. دسته‌بندی قابل تغییر است و باید با نقشه سازه تطبیق داده شود.</div><div id="footingScheduleTable" class="notice">پس از استخراج واکنش‌ها، جدول پایه‌ها ساخته می‌شود.</div>'+
   '<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:920px"><thead><tr><th>گره پایه</th><th>مختصات X/Z (متر)</th><th>Fx min/max (kN)</th><th>Fy min/max (kN)</th><th>Fz min/max (kN)</th><th>Mx min/max (kN.m)</th><th>My min/max (kN.m)</th><th>Mz min/max (kN.m)</th></tr></thead><tbody id="foundationReactionRows"></tbody></table></div>'+
   '<div id="foundationQuantitySummary" class="notice">برای متره، ابعاد واقعی پی را وارد کنید.</div>'+
   '<h4>ترسیم آرماتور شناژ و فونداسیون</h4><div class="notice">حالت ترسیم مستقل از متره و طراحی است. حالت پیش‌فرض فقط آرایش نمایشی درخواستی را نشان می‌دهد؛ حالت طراحی از خروجی غربال/آرماتور ثبت‌شده استفاده می‌کند و اگر داده کافی موجود نباشد، بخش مربوطه را ترسیم نمی‌کند.</div><div class="form-grid"><div class="field"><label for="rebarDrawingMode">مبنای ترسیم میلگردها</label><select id="rebarDrawingMode"><option value="default" selected>آرایش پیش‌فرض اجرایی</option><option value="design">مقادیر طراحی/محاسبات نرم‌افزار</option></select></div></div><div class="button-grid"><button id="btnRefreshRebarDrawing" class="btn secondary" type="button">به‌روزرسانی ترسیم</button></div><div class="form-grid"><div class="field"><label for="footingRebarTarget">انتخاب فونداسیون برای جزئیات</label><select id="footingRebarTarget"><option value="">اولین فونداسیون</option></select></div><div class="field"><label for="tieRebarTarget">انتخاب شناژ برای جزئیات</label><select id="tieRebarTarget"><option value="">اولین شناژ</option></select></div></div><div id="rebarDrawingSummary" class="notice">آرایش پیش‌فرض انتخاب شده است.</div><div id="rebarDrawingCanvas" class="drawing-area" style="overflow-x:auto;min-height:320px"></div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  keys.forEach(k=>{const el=$(map[k]);if(el){el.value=state[k]??"";el.addEventListener("change",()=>{state[k]=el.value;});}});
  $("btnFoundationReactions").addEventListener("click",extract);
  $("btnFoundationEnvelope").addEventListener("click",extractEnvelope);
  $("btnFoundationQuantities").addEventListener("click",quantify);
  $("btnFoundationCSV").addEventListener("click",exportCSV);
  $("btnRefreshRebarDrawing").addEventListener("click",renderRebarDrawing);
  $("rebarDrawingMode").addEventListener("change",renderRebarDrawing);
  $("footingRebarTarget").addEventListener("change",renderRebarDrawing);
  $("tieRebarTarget").addEventListener("change",renderRebarDrawing);
  try{$("rebarDrawingMode").value=localStorage.getItem("sahroudSteel.rebarDrawingMode.v1")||"default";$("rebarDrawingMode").addEventListener("change",()=>{try{localStorage.setItem("sahroudSteel.rebarDrawingMode.v1",$("rebarDrawingMode").value);}catch(e){}});}catch(e){}
  renderRebarDrawing();
 }
 function readInputs(){keys.forEach(k=>{const el=$(map[k]);if(el)state[k]=el.value;});}

 function defaultFootingSpec(row){const secondary=row.kind==="endwall-base";return{class:secondary?"secondary":"main",width:secondary?"1.40":"1.80",length:secondary?"1.40":"1.80",thickness:"0.80"};}
 function footingSpecFor(row){const d=footingSchedule[String(row.nodeId)]||defaultFootingSpec(row);return{...d,width:Number(d.width),length:Number(d.length),thickness:Number(d.thickness)};}
 function renderFootingSchedule(){
  const host=$("footingScheduleTable");if(!host||!lastReport?.rows?.length)return;
  lastReport.rows.forEach(row=>{if(!footingSchedule[String(row.nodeId)])footingSchedule[String(row.nodeId)]=defaultFootingSpec(row);});
  host.innerHTML='<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>گره پایه</th><th>دسته</th><th>عرض X (m)</th><th>طول Z (m)</th><th>ضخامت (m)</th></tr></thead><tbody>'+lastReport.rows.map(row=>{
   const d=footingSpecFor(row),id=String(row.nodeId).replace(/&/g,"&amp;").replace(/"/g,"&quot;");
   return '<tr><td>'+id+'</td><td><select data-fs-id="'+id+'" data-fs-key="class"><option value="main" '+(d.class==="main"?"selected":"")+'>اصلی</option><option value="secondary" '+(d.class==="secondary"?"selected":"")+'>فرعی</option><option value="custom" '+(d.class==="custom"?"selected":"")+'>سفارشی</option></select></td>'+["width","length","thickness"].map(k=>'<td><input data-fs-id="'+id+'" data-fs-key="'+k+'" type="number" min="0.1" step="0.05" value="'+d[k]+'" style="width:90px"></td>').join("")+'</tr>';
  }).join("")+'</tbody></table></div>';
  host.querySelectorAll("[data-fs-id]").forEach(el=>el.addEventListener("change",()=>{
   const id=el.dataset.fsId,key=el.dataset.fsKey,row=lastReport.rows.find(r=>String(r.nodeId)===id);
   if(!footingSchedule[id])footingSchedule[id]=defaultFootingSpec(row);
   if(key==="class"){const cls=el.value;footingSchedule[id].class=cls;if(cls!=="custom"){const size=cls==="secondary"?"1.40":"1.80";Object.assign(footingSchedule[id],{width:size,length:size,thickness:"0.80"});renderFootingSchedule();}}
   else footingSchedule[id][key]=el.value;
   quantify();renderRebarDrawing();
  }));
 }
 function scheduleDimensionsValid(rows){return rows.every(r=>{const d=footingSpecFor(r);return d.width>0&&d.length>0&&d.thickness>0;});}
 function footingScheduleIsUniform(){if(!lastReport?.rows?.length)return true;const dims=lastReport.rows.map(r=>footingSpecFor(r));return dims.every(d=>Math.abs(d.width-num(state.footingWidthM))<1e-9&&Math.abs(d.length-num(state.footingLengthM))<1e-9&&Math.abs(d.thickness-num(state.footingThicknessM))<1e-9);}

 function footingDatumGeometry(topElevationM,tieHeightM,footingDepthM){
  if(![topElevationM,tieHeightM,footingDepthM].every(Number.isFinite)||tieHeightM<=0||footingDepthM<=0)return{ok:false,reason:"تراز بالا، ارتفاع شناژ و ضخامت پی باید معتبر باشند."};
  const tieBottomElevationM=topElevationM-tieHeightM,footingBottomElevationM=topElevationM-footingDepthM;
  return{ok:true,commonTopElevationM:topElevationM,tieBottomElevationM,footingBottomElevationM,extraExcavationBelowTieM:Math.max(0,tieBottomElevationM-footingBottomElevationM),footingBottomAboveTieBottomM:Math.max(0,footingBottomElevationM-tieBottomElevationM),tieHeightM,footingDepthM,topLevelsCoincident:true};
 }
 function applyFootingClass(value){
  const cls=["main","secondary","custom"].includes(value)?value:"main";state.footingClass=cls;
  if(cls==="custom")return;
  const size=cls==="main"?"1.80":"1.40";state.footingWidthM=size;state.footingLengthM=size;state.footingThicknessM="0.80";
  [["ftWidth",state.footingWidthM],["ftLength",state.footingLengthM],["ftThickness",state.footingThicknessM]].forEach(([id,v])=>{if($(id))$(id).value=v;});
  quantify();renderRebarDrawing();
 }
 function selfTest(){
  const bases=[{nodeId:"B1",x:0,y:0,z:0}],specs=[{layer:"bottom",direction:"X",diaMm:16,spacingMm:200},{layer:"bottom",direction:"Z",diaMm:16,spacingMm:200},{layer:"top",direction:"X",diaMm:14,spacingMm:200},{layer:"top",direction:"Z",diaMm:14,spacingMm:200}];
  const g=buildFootingRebarGeometry(bases,2,2,0.5,50,specs);
  const validSupports=[{id:"B1",x:0,y:0,z:0,kind:"base"},{id:"B2",x:4,y:0,z:0,kind:"endwall-base"}];
  const validReactions=[{nodeId:"B1",values:[1,2,3,4,5,6]},{nodeId:"B2",values:[-1,-2,-3,-4,-5,-6]}];
  const normalized=normalizeBaseReactions(validReactions,validSupports);
  const tieTakeoff=buildTieRouteTakeoff({rows:[{id:"TB1",lengthM:6,volumeM3:1.8,section:{},reasons:["نوع اتصال دو سر کامل تعیین نشده"]}]},[{id:"TB1",start:"A",end:"B",widthM:0.6,heightM:0.5}]);
  const tieBad=buildTieRouteTakeoff({rows:[{id:"TB2",lengthM:4,volumeM3:1.2,section:{},reasons:["مسیر مورب در پلان است"]}]},[{id:"TB2",start:"A",end:"C",widthM:0.6,heightM:0.5}]);
  const tieMissing=buildTieRouteTakeoff({rows:[]},[{id:"TB3",start:"A",end:"Z",widthM:0.6,heightM:0.5}]);
  const tieManual=buildTieRouteTakeoff(null,[]);
  const tieRebarGood=buildTieRebarTakeoff({rows:[{id:"TB1",ok:true,longitudinalBars:{hookAllowanceIncluded:true,approximateMassKg:100,totalCountIncludingSideBars:8,totalStraightLengthM:50,totalCutLengthM:52},stirrup:{detail:{ok:true,approximateMassKg:20,count:30}}}]},[{id:"TB1"}]);
  const tieRebarNoHook=buildTieRebarTakeoff({rows:[{id:"TB1",ok:true,longitudinalBars:{hookAllowanceIncluded:false,approximateMassKg:100},stirrup:{detail:{ok:true,approximateMassKg:20}}}]},[{id:"TB1"}]);
  const checks={tieRouteGeometryAutoQuantity:tieTakeoff.complete&&tieTakeoff.count===1&&tieTakeoff.totalLengthM===6&&Math.abs(tieTakeoff.totalConcreteM3-1.8)<1e-9&&Math.abs(tieTakeoff.sideFormworkM2-6)<1e-9,
  tieUnknownJointDoesNotEraseGeometricTakeoff:tieTakeoff.complete&&tieTakeoff.warnings.length===1,
  tieInvalidGeometryBlocksTakeoff:!tieBad.complete&&tieBad.totalConcreteM3===null,
  tieMissingRouteNodeBlocksTakeoff:!tieMissing.complete&&tieMissing.totalLengthM===null,
  tieManualFallbackOnlyWhenNoRoutes:tieManual.source==="manual_input"&&tieManual.complete===false,
  tieRebarScheduleRequiresHookDetail:tieRebarGood.complete&&tieRebarGood.totalWeightKg===120&&tieRebarGood.schedule[0].passesThroughFootings&&!tieRebarNoHook.complete,
  baseReactionsComplete:normalized.length===2&&normalized.every(x=>x.hasReaction),missingBaseReactionRejected:(()=>{try{normalizeBaseReactions(validReactions.slice(0,1),validSupports);return false;}catch(e){return true;}})(),duplicateReactionRejected:(()=>{try{normalizeBaseReactions([...validReactions,validReactions[0]],validSupports);return false;}catch(e){return true;}})(),nonfiniteReactionRejected:(()=>{try{normalizeBaseReactions([{nodeId:"B1",values:[1,2,3,4,5,NaN]},validReactions[1]],validSupports);return false;}catch(e){return true;}})(),reactionCoverageComplete:validateReactionCaseCoverage([{nodeId:"B1",caseReactions:[{label:"D",values:[1,2,3,4,5,6]},{label:"W",values:[1,2,3,4,5,6]}]},{nodeId:"B2",caseReactions:[{label:"D",values:[1,2,3,4,5,6]},{label:"W",values:[1,2,3,4,5,6]}]}]).ok,
reactionCoverageMissingCaseBlocked:!validateReactionCaseCoverage([{nodeId:"B1",caseReactions:[{label:"D",values:[1,2,3,4,5,6]}]},{nodeId:"B2",caseReactions:[{label:"W",values:[1,2,3,4,5,6]}]}]).ok,
reactionCoverageTextComponentBlocked:!validateReactionCaseCoverage([{nodeId:"B1",caseReactions:[{label:"D",values:[1,"2",3,4,5,6]}]}]).ok,
reactionCoverageSingleVectorFallbackBlocked:!validateReactionCaseCoverage([{nodeId:"B1",values:[1,2,3,4,5,6]}]).ok,fourGridLayers:g.ok&&g.count>0&&new Set(g.bars.map(x=>x.layer+"-"+x.direction)).size===4,bottomTopElevation:g.ok&&g.bars.some(x=>x.layer==="bottom"&&Math.abs(x.a.y+0.442)<1e-9)&&g.bars.some(x=>x.layer==="top"&&Math.abs(x.a.y+0.057)<1e-9),gridBarsStayInsideFootprint:g.ok&&g.bars.every(x=>Math.abs(x.a.x)<=1&&Math.abs(x.a.z)<=1&&Math.abs(x.b.x)<=1&&Math.abs(x.b.z)<=1)};
  const datum=footingDatumGeometry(0,0.5,0.8),secondary=footingDatumGeometry(3,0.5,0.8),tallTie=footingDatumGeometry(0,0.9,0.8);
  const mainSpec=defaultFootingSpec({kind:"base"}),secondarySpec=defaultFootingSpec({kind:"endwall-base"});
  const routeAudit=footingsAlongStraightRoute([{id:"A",kind:"base",x:0,y:0,z:0},{id:"M",kind:"base",x:3,y:0,z:0},{id:"B",kind:"endwall-base",x:6,y:0,z:0},{id:"OFF",kind:"base",x:3,y:0,z:0.2}],{start:"A",end:"B"});
  checks.allIntermediateFootingsDetected=routeAudit.ok&&routeAudit.footings.map(x=>x.node.id).join(",")==="A,M,B";
  checks.offAxisFootingExcluded=routeAudit.ok&&!routeAudit.footings.some(x=>x.node.id==="OFF");
  const axisGrid=buildFootingRebarGeometry([{nodeId:"AX",x:0,y:0,z:0}],2,3,0.8,50,[{layer:"bottom",direction:"X",diaMm:16,spacingMm:200},{layer:"bottom",direction:"Z",diaMm:16,spacingMm:200}]);
  const axisX=axisGrid.bars.filter(x=>x.direction==="X"),axisZ=axisGrid.bars.filter(x=>x.direction==="Z");
  checks.axisLengthsMatchPlan=axisGrid.ok&&axisX.length===16&&axisZ.length===11&&Math.abs((axisX[0].b.x-axisX[0].a.x)-1.9)<1e-9&&Math.abs((axisZ[0].b.z-axisZ[0].a.z)-2.9)<1e-9;
  checks.actualSpacingDoesNotExceedInput=axisGrid.ok&&axisX.every((x,i)=>i===0||Math.abs(axisX[i].a.z-axisX[i-1].a.z)*1000<=200.000001)&&axisZ.every((x,i)=>i===0||Math.abs(axisZ[i].a.x-axisZ[i-1].a.x)*1000<=200.000001);
  checks.sharedTopDatum=datum.ok&&datum.commonTopElevationM===0&&Math.abs(datum.extraExcavationBelowTieM-0.3)<1e-9;
  checks.footingBottomFormula=datum.ok&&Math.abs(datum.footingBottomElevationM+0.8)<1e-9&&Math.abs(datum.tieBottomElevationM+0.5)<1e-9;
  checks.noExtraExcavationWhenTieDeeper=tallTie.ok&&tallTie.extraExcavationBelowTieM===0&&Math.abs(tallTie.footingBottomAboveTieBottomM-0.1)<1e-9;
  checks.mainFootingDefault=mainSpec.width==="1.80"&&mainSpec.length==="1.80"&&mainSpec.thickness==="0.80";
  checks.secondaryFootingDefault=secondarySpec.width==="1.40"&&secondarySpec.length==="1.40"&&secondarySpec.thickness==="0.80";
  return{passed:Object.values(checks).every(Boolean),checks,barCount:g.count,assumptions:g.assumptions,datumTests:{main:datum,secondary:secondary,tallTie}};
}
function checkTieBeamRebarClearance(tieBars,requiredClearanceMm=0){
  readInputs();
  if(!lastReport?.rows?.length)return{ok:false,reason:"ابتدا واکنش‌های پی یا پوش واکنش را استخراج کنید تا مختصات پایه‌ها مشخص شود."};
  const B=num(state.footingWidthM),L=num(state.footingLengthM),T=num(state.footingThicknessM),cover=signedNum(state.rebarCoverMm);
  if(!B||!L||!T||cover===null)return{ok:false,reason:"عرض، طول، ضخامت پی و پوشش بتن را از نقشه وارد کنید؛ مقدار فرضی استفاده نمی‌شود."};
  const specs=footingGridSpecs(state);
  if(!specs.length)return{ok:false,reason:"قطر و فاصله حداقل یک شبکه میلگرد پی را در ورودی‌های آرماتور وارد کنید."};
  const grid=buildFootingRebarGeometry(lastReport.rows,B,L,T,cover,specs);
  if(!grid.ok)return grid;
  const checker=window.SteelTieBeamReinforcement?.checkFootingBarClearance;
  if(typeof checker!=="function")return{ok:false,reason:"ماژول کنترل سه‌بعدی میلگرد شناژ بارگذاری نشده است."};
  const result=checker(tieBars,grid.bars,requiredClearanceMm);
  return{...result,footingGridBarCount:grid.count,baseCount:grid.baseCount,gridAssumptions:grid.assumptions};
}
function normalizeBaseReactions(reactions,supportNodes){
 if(!Array.isArray(reactions)||!Array.isArray(supportNodes)||!supportNodes.length)throw new Error("واکنش یا فهرست گره‌های پایه معتبر نیست.");
 const map=new Map();
 for(const reaction of reactions){
  if(!reaction||reaction.nodeId==null||map.has(String(reaction.nodeId)))throw new Error("شناسه واکنش خالی یا تکراری است.");
  if(!Array.isArray(reaction.values)||reaction.values.length<6||reaction.values.slice(0,6).some(v=>!Number.isFinite(Number(v))))throw new Error("بردار واکنش شش‌مؤلفه‌ای نامعتبر است: "+reaction.nodeId);
  map.set(String(reaction.nodeId),reaction.values.slice(0,6).map(Number));
 }
 const missing=supportNodes.filter(n=>!map.has(String(n.id))).map(n=>String(n.id));
 if(missing.length)throw new Error("واکنش گره‌های پایه موجود نیست: "+missing.join(", "));
 return supportNodes.map(n=>{
  const xyz=[n.x,n.y,n.z].map(Number);
  if(xyz.some(v=>!Number.isFinite(v)))throw new Error("مختصات گره پایه نامعتبر است: "+n.id);
  return{nodeId:n.id,x:xyz[0],y:xyz[1],z:xyz[2],kind:n.kind,hasReaction:true,values:map.get(String(n.id)).slice()};
 }).sort((a,b)=>a.z-b.z||a.x-b.x);
}
function modelFingerprint(model){
  const builder=window.SteelFoundationModelFingerprint?.build;
  if(typeof builder!=="function")return null;
  return builder(model,{
   tieBeamLayout:window.SteelTieBeamLayout?.getData?.()||null,
   loadSettings:window.SteelLoads?.getData?.()||null,
   sections:window.SteelSections?.read?.()||null,
   support:$("baseConnection")?.value||"pinned"
  });
 }
 function extract(){
  const sm=window.SteelStructuralModel,result=sm?.last3DResult,model=sm?.model;
  if(!result||!Array.isArray(result.reactions)||!model||!Array.isArray(model.nodes)){
   $("foundationTakeoffSummary").textContent="نتیجه تحلیل سه‌بعدی در دسترس نیست. ابتدا مدل را بسازید و تحلیل سه‌بعدی را با موفقیت اجرا کنید.";return;
  }
  const currentSourceFingerprint=modelFingerprint(model);
  if(!result.foundationSourceModelFingerprint||!currentSourceFingerprint||result.foundationSourceModelFingerprint!==currentSourceFingerprint){
   $("foundationTakeoffSummary").textContent="مدل، مسیر شناژ، ترکیبات بار یا مقاطع پس از آخرین تحلیل تغییر کرده‌اند (یا نتیجه با نسخه قدیمی حل‌گر تولید شده است). برای جلوگیری از متره اشتباه، ابتدا تحلیل سه‌بعدی را دوباره اجرا کنید.";
   return;
  }
  const tie=result.tieBeamIntegration;
  if(!tie||!Array.isArray(tie.included)||!Array.isArray(tie.skipped)||tie.skipped.length||
     tie.solverAudit?.success!==true||tie.solverAudit.verifiedSegments!==tie.solverAudit.expectedSegments){
   $("foundationTakeoffSummary").textContent="استخراج واکنش متوقف شد: ممیزی ورود واقعی شناژها به حل‌گر کامل نیست یا یک مسیر شناژ از تحلیل حذف شده است.";
   return;
  }
  let rows;
  try{rows=normalizeBaseReactions(result.reactions,model.nodes.filter(n=>n.kind==="base"||n.kind==="endwall-base"));}
  catch(e){$("foundationTakeoffSummary").textContent="استخراج فونداسیون متوقف شد: "+e.message+"؛ مقدار صفر جایگزین نمی‌شود.";return;}
  const body=$("foundationReactionRows");body.replaceChildren();
  rows.forEach(row=>{const tr=document.createElement("tr");const vals=[row.nodeId,fmt(row.x)+" / "+fmt(row.z),...row.values.slice(0,3).map(v=>fmt(v/1000)),...row.values.slice(3,6).map(v=>fmt(v/1e6))];vals.forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  const sum=[0,0,0,0,0,0];rows.forEach(x=>x.values.forEach((v,i)=>sum[i]+=v));
  lastReport={generatedAt:new Date().toISOString(),loadCase:result.loadCaseLabel||result.loadCase||"نامشخص",supportType:result.supportType||"نامشخص",units:"kN,kN.m",rows,total:sum.map((v,i)=>v/(i<3?1000:1e6)),equilibrium:result.equilibrium||null,quantities:null};
  $("foundationTakeoffSummary").textContent="حالت بار تحلیل‌شده: "+lastReport.loadCase+" | نوع تکیه‌گاه: "+lastReport.supportType+" | تعداد کل پایه‌های مدل: "+rows.length+" | پایه‌های دارای واکنش غیرصفر: "+rows.filter(x=>x.hasReaction).length+" | مختصات بر حسب متر؛ نیرو kN و لنگر kN.m. جمع واکنش‌ها: Fx "+fmt(sum[0]/1000)+", Fy "+fmt(sum[1]/1000)+", Fz "+fmt(sum[2]/1000)+" kN. این جمع فقط مربوط به همین حالت بار است؛ برای طراحی پی باید همه ترکیبات بار و پوش نیروها بررسی شوند.";
  $("btnFoundationCSV").disabled=false;
  renderFootingSchedule();
  quantify();
  renderRebarDrawing();
 }
 async function extractEnvelope(){
  const button=$("btnFoundationEnvelope"),summary=$("foundationTakeoffSummary");
  if(!window.SteelStructuralModel?.analyzeFoundationEnvelope){summary.textContent="تابع تحلیل پوش در این نسخه حل‌گر موجود نیست؛ صفحه را پس از انتشار نسخه جدید دوباره بارگذاری کنید.";return;}
  button.disabled=true;summary.textContent="در حال اجرای متوالی تحلیل‌های ترکیبی؛ لطفاً صفحه را نبندید…";
  try{
   const sm=window.SteelStructuralModel,model=sm.model||sm.build();
   const env=await sm.analyzeFoundationEnvelope();
   if(!env||!Array.isArray(env.rows)||!env.rows.length)throw new Error("پوش واکنش معتبری دریافت نشد.");
   const currentSourceFingerprint=modelFingerprint(model);
   if(!env.foundationSourceModelFingerprint||!currentSourceFingerprint||env.foundationSourceModelFingerprint!==currentSourceFingerprint)throw new Error("مدل، مسیر شناژ، ترکیبات بار یا مقاطع پس از تحلیل تغییر کرده‌اند؛ پوش برای جلوگیری از استفاده اشتباه رد شد.");
   const reactionAudit=window.SteelFoundationReactionAudit?.audit?.(env,model,footingSpecFor);
   if(!reactionAudit?.ok)throw new Error("ممیزی کامل‌بودن پوش واکنش ناموفق است: "+(reactionAudit?.issues||["ماژول ممیزی در دسترس نیست."]).join("؛ "));
   const body=$("foundationReactionRows");body.replaceChildren();
   const fmtPair=(e,k)=>{const scale=k<3?1000:1e6;return fmt(e.min/scale)+" / "+fmt(e.max/scale);};
   const rows=env.rows.map(row=>{
    const tr=document.createElement("tr");
    [row.nodeId,fmt(row.x)+" / "+fmt(row.z),...row.envelopes.map((e,k)=>fmtPair(e,k))].forEach((v,i)=>{const td=document.createElement("td");td.textContent=v;if(i>=2){const e=row.envelopes[i-2];td.title="کمینه: "+e.minCase+" | بیشینه: "+e.maxCase;}tr.appendChild(td);});
    body.appendChild(tr);
    return {...row,values:row.envelopes.map(e=>Math.abs(e.min)>Math.abs(e.max)?e.min:e.max)};
   });
   lastReport={generatedAt:env.generatedAt,loadCase:"پوش مقدماتی "+env.cases.length+" حالت بار",supportType:env.supportType,units:"kN,kN.m",rows,total:null,equilibrium:env.cases.map(x=>x.equilibrium),cases:env.cases,reactionAudit,windCasesIncluded:env.windCasesIncluded,limitations:env.limitations,quantities:null};
   const eqBad=env.cases.filter(x=>x.equilibrium&&!x.equilibrium.ok).length;
   summary.textContent="پوش مقدماتی استخراج شد: "+env.cases.length+" حالت بار، "+rows.length+" گره پایه. "+(env.windCasesIncluded?"باد مثبت و منفی با ضریب ۱٫۰ نیز بررسی شده است. ":"ورودی باد غیرصفر شناسایی نشد؛ فقط ترکیبات ثقلی اجرا شدند. ")+(eqBad?"هشدار: کنترل تعادل در "+eqBad+" حالت برقرار نیست. ":"کنترل تعادل در حالت‌های گزارش‌شده برقرار است. ")+"برای هر مؤلفه، کمینه و بیشینه با نام حالت حاکم در خروجی CSV ذخیره می‌شود. این پوش مقدماتی و غیرقابل استفاده به‌عنوان ترکیبات نهایی آیین‌نامه‌ای است.";
   $("btnFoundationCSV").disabled=false;renderFootingSchedule();quantify();
  }catch(e){summary.textContent="استخراج پوش واکنش ناموفق بود: "+e.message;}
  finally{button.disabled=false;}
 }
 function screenBearing(q){
  const box=$("foundationBearingSummary"),body=$("foundationBearingRows");
  if(body)body.replaceChildren();
  if(!lastReport?.rows?.length){if(box)box.textContent="ابتدا پوش واکنش را استخراج کنید.";return null;}
  if(!scheduleDimensionsValid(lastReport.rows)){if(box)box.textContent="ابعاد یک یا چند پی نامعتبر است؛ همه ابعاد را اصلاح کنید.";return null;}
  const allow=num(state.soilAllowableKPa),gammaC=num(state.concreteUnitWeightKNm3);
  const offsetX=signedNum(state.columnOffsetXM),offsetZ=signedNum(state.columnOffsetZM);
  const cover=state.soilCoverDepthM===""?0:Number(state.soilCoverDepthM),gammaS=cover>0?num(state.soilUnitWeightKNm3):0;
  if(!allow||!gammaC||offsetX===null||offsetZ===null||cover<0||!Number.isFinite(cover)||(cover>0&&!gammaS)){
   if(box)box.textContent="برای غربال فشار زیر پی، فشار مجاز ناخالص، وزن مخصوص بتن و مختصات محور ستون نسبت به مرکز هر پی در دو راستا را وارد کنید؛ اگر ستون وسط است صفر وارد کنید. خاک پوششی اختیاری است.";
   return null;
  }
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM),pedComplete=!!(pw&&pl&&ph);
  if((pw||pl||ph)&&!pedComplete){if(box)box.textContent="ابعاد پدستال ناقص است؛ هر سه بعد را وارد کنید یا هر سه را خالی بگذارید.";return null;}
  const coverage=validateReactionCaseCoverage(lastReport.rows);
  if(!coverage.ok){if(box)box.textContent="کنترل bearing متوقف شد: "+coverage.issues.join(" ");return null;}
  const cases=[];
  lastReport.rows.forEach(row=>{
   const d=footingSpecFor(row),B=d.width,L=d.length,t=d.thickness;
   const valid= B>0&&L>0&&t>0&&(!pedComplete||(pw<=B&&pl<=L&&Math.abs(offsetX)+pw/2<=B/2+1e-9&&Math.abs(offsetZ)+pl/2<=L/2+1e-9));
   const pedestalWeight=pedComplete&&valid?gammaC*pw*pl*ph:0;
   const concreteWeight=valid?gammaC*B*L*t+pedestalWeight:0;
   const soilWeight=valid&&cover>0?gammaS*Math.max(0,B*L-(pedComplete?pw*pl:0))*cover:0;
   const source=row.caseReactions;
   source.forEach(item=>{
    const v=item.values||[],N=Number(v[1])/1000,MxBase=Number(v[3])/1e6,MzBase=Number(v[5])/1e6;
    if(![N,MxBase,MzBase].every(Number.isFinite))return;
    let status="",qmin=null,qmax=null,eX=null,eZ=null;
    if(!valid)status="ابعاد پی/پدستال یا خروج از مرکز ستون نامعتبر است";
    else{
     const Mx=MxBase-offsetZ*(N+pedestalWeight),Mz=MzBase+offsetX*(N+pedestalWeight),totalN=N+concreteWeight+soilWeight;
     if(totalN<=0)status="کشش/بالاکشیدگی؛ فشار فشاری قابل محاسبه نیست";
     else{
      eX=Math.abs(Mz)/totalN;eZ=Math.abs(Mx)/totalN;
      const bending=6*Math.abs(Mx)/(B*L*L)+6*Math.abs(Mz)/(L*B*B);
      qmin=totalN/(B*L)-bending;qmax=totalN/(B*L)+bending;
      if(qmin<0||eX>B/6+1e-9||eZ>L/6+1e-9)status="تماس کامل برقرار نیست؛ تحلیل تماس جزئی لازم است";
      else if(qmax>allow)status="فشار بیشینه از ظرفیت مجاز واردشده بیشتر است";
      else status="غربال اولیه: فشار در محدوده مجاز واردشده";
     }
    }
    const rec={nodeId:row.nodeId,label:item.label,footing:{B,L,t},NkN:N,eXM:eX,eZM:eZ,qminKPa:qmin,qmaxKPa:qmax,allowableKPa:allow,concreteWeightKN:concreteWeight,soilCoverWeightKN:soilWeight,status};
    cases.push(rec);
    if(body){const tr=document.createElement("tr");[rec.nodeId,rec.label,fmt(B)+"×"+fmt(L),fmt(N),eX===null?"—":fmt(eX)+" / "+fmt(eZ),qmin===null?"—":fmt(qmin),qmax===null?"—":fmt(qmax),status].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);}
   });
  });
  const failed=cases.filter(x=>x.status!=="غربال اولیه: فشار در محدوده مجاز واردشده").length;
  if(box)box.textContent="غربال فشار مستقل برای "+cases.length+" حالت-پایه انجام شد؛ ابعاد هر پی از جدول همان گره خوانده شد. موارد نیازمند بررسی بیشتر: "+failed+". این فقط کنترل خطی با فرض پی صلب و تماس کامل است، نه تأیید طراحی.";
  return{basis:"preliminary_per_base_gross_bearing_full_contact",allowableKPa:allow,cases,limitations:["ابعاد هر پی مستقل از جدول پایه‌ها خوانده شده است.","فشار خطی با فرض پی صلب و تماس کامل؛ در خروج از هسته تحلیل تماس جزئی لازم است.","ترکیبات بار و ضرایب آیین‌نامه‌ای نهایی نشده‌اند؛ وزن خاک و پدستال ساده‌سازی شده‌اند.","این غربال جایگزین طراحی ژئوتکنیکی و سازه‌ای پی نیست."]};
 }
 function screenSliding(){
  const box=$("foundationSlidingSummary"),body=$("foundationSlidingRows");
  if(body)body.replaceChildren();
  if(!lastReport?.rows?.length){if(box)box.textContent="ابتدا پوش واکنش را استخراج کنید.";return null;}
  if(!scheduleDimensionsValid(lastReport.rows)){if(box)box.textContent="ابعاد یک یا چند پی نامعتبر است.";return null;}
  const gammaC=num(state.concreteUnitWeightKNm3),mu=num(state.slidingFrictionMu);
  const cover=state.soilCoverDepthM===""?0:Number(state.soilCoverDepthM),gammaS=cover>0?num(state.soilUnitWeightKNm3):0;
  if(!gammaC||!mu||!Number.isFinite(cover)||cover<0||(cover>0&&!gammaS)){
   if(box)box.textContent="برای غربال لغزش، وزن مخصوص بتن، ضریب اصطکاک مستند و در صورت وجود خاک پوششی وزن مخصوص آن لازم است.";
   return null;
  }
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM),pedComplete=!!(pw&&pl&&ph);
  if((pw||pl||ph)&&!pedComplete){if(box)box.textContent="ابعاد پدستال ناقص است؛ هر سه بعد را وارد کنید یا هر سه را خالی بگذارید.";return null;}
  const coverage=validateReactionCaseCoverage(lastReport.rows);
  if(!coverage.ok){if(box)box.textContent="کنترل sliding متوقف شد: "+coverage.issues.join(" ");return null;}
  const records=[];
  lastReport.rows.forEach(row=>{
   const d=footingSpecFor(row),B=d.width,L=d.length,t=d.thickness,valid=B>0&&L>0&&t>0&&(!pedComplete||(pw<=B&&pl<=L));
   const concrete=valid?gammaC*(B*L*t+(pedComplete?pw*pl*ph:0)):0;
   const soil=valid&&cover>0?gammaS*Math.max(0,B*L-(pedComplete?pw*pl:0))*cover:0;
   const source=row.caseReactions;
   source.forEach(item=>{
    const v=item.values||[],fx=Number(v[0])/1000,fz=Number(v[2])/1000,fy=Number(v[1])/1000;
    if(![fx,fz,fy].every(Number.isFinite))return;
    const H=Math.hypot(fx,fz),N=fy+concrete+soil,resistance=mu*Math.max(N,0),ratio=H>1e-9?resistance/H:null;
    let status=!valid?"ابعاد پی/پدستال نامعتبر است":N<=0?"نیروی قائم فشاری کافی وجود ندارد؛ لغزش قابل تأیید نیست":H<=1e-9?"در این حالت بار، نیروی افقی پایه ناچیز است":resistance>=H?"مقاومت اصطکاکی اسمی از تقاضا بیشتر است؛ کنترل آیین‌نامه‌ای باقی است":"تقاضای افقی از مقاومت اصطکاکی اسمی بیشتر است";
    const rec={nodeId:row.nodeId,label:item.label,footing:{B,L,t},HkN:H,NkN:N,mu,resistanceKN:resistance,resistanceDemandRatio:ratio,status};records.push(rec);
    if(body){const tr=document.createElement("tr");[rec.nodeId,rec.label,fmt(B)+"×"+fmt(L),fmt(H),fmt(N),fmt(resistance),ratio===null?"—":fmt(ratio),status].forEach(x=>{const td=document.createElement("td");td.textContent=x;tr.appendChild(td);});body.appendChild(tr);}
   });
  });
  const fail=records.filter(x=>x.status.startsWith("تقاضای افقی")||x.status.startsWith("نیروی قائم")||x.status.startsWith("ابعاد")).length;
  if(box)box.textContent="غربال لغزش مستقل برای "+records.length+" حالت-پایه با μ="+fmt(mu)+" انجام شد؛ وزن و ابعاد هر پی جداگانه لحاظ شده است. هشدارها/عدم کفایت اسمی: "+fail+". نسبت μN/H معیار قبولی آیین‌نامه‌ای نیست.";
  return{basis:"preliminary_per_base_isolated_footing_friction_only",frictionCoefficient:mu,cases:records,limitations:["ابعاد و وزن هر پی مستقل لحاظ شده؛ اثر شناژها و عملکرد گروهی پی‌ها منظور نشده است.","چسبندگی، فشار جانبی، کلید برشی، شمع و آب زیرزمینی لحاظ نشده‌اند.","ضریب اصطکاک باید از گزارش ژئوتکنیک گرفته شود.","ضرایب اطمینان و ترکیبات نهایی آیین‌نامه‌ای اعمال نشده‌اند."]};
 }
 function screenUplift(){
  const box=$("foundationUpliftSummary"),body=$("foundationUpliftRows");
  if(body)body.replaceChildren();
  if(!lastReport?.rows?.length){if(box)box.textContent="ابتدا پوش واکنش را استخراج کنید.";return null;}
  if(!scheduleDimensionsValid(lastReport.rows)){if(box)box.textContent="ابعاد یک یا چند پی نامعتبر است.";return null;}
  const gammaC=num(state.concreteUnitWeightKNm3),cover=state.soilCoverDepthM===""?0:Number(state.soilCoverDepthM),gammaS=cover>0?num(state.soilUnitWeightKNm3):0;
  if(!gammaC||!Number.isFinite(cover)||cover<0||(cover>0&&!gammaS)){if(box)box.textContent="برای غربال بالاکشیدگی، وزن مخصوص بتن و در صورت وجود خاک پوششی ضخامت و وزن مخصوص آن لازم است.";return null;}
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM),pedComplete=!!(pw&&pl&&ph);
  if((pw||pl||ph)&&!pedComplete){if(box)box.textContent="ابعاد پدستال ناقص است؛ هر سه بعد را وارد کنید یا هر سه را خالی بگذارید.";return null;}
  const coverage=validateReactionCaseCoverage(lastReport.rows);
  if(!coverage.ok){if(box)box.textContent="کنترل uplift متوقف شد: "+coverage.issues.join(" ");return null;}
  const records=[];
  lastReport.rows.forEach(row=>{
   const d=footingSpecFor(row),B=d.width,L=d.length,t=d.thickness,valid=B>0&&L>0&&t>0&&(!pedComplete||(pw<=B&&pl<=L));
   const concrete=valid?gammaC*(B*L*t+(pedComplete?pw*pl*ph:0)):0;
   const soil=valid&&cover>0?gammaS*Math.max(0,B*L-(pedComplete?pw*pl:0))*cover:0;
   const resistance=concrete+soil,source=Array.isArray(row.caseReactions)&&row.caseReactions.length?row.caseReactions:[{label:lastReport.loadCase,values:row.values||[]}];
   source.forEach(item=>{
    const fy=Number((item.values||[])[1])/1000;if(!Number.isFinite(fy))return;
    const demand=Math.max(0,-fy),net=demand-resistance,ratio=resistance>0?demand/resistance:null;
    const status=!valid?"ابعاد پی/پدستال نامعتبر است":demand<=1e-9?"در این حالت واکنش قائم، بالاکشیدگی ندارد":net<=0?"وزن پی و خاک پوششی از تقاضا بیشتر است؛ کنترل مهار باقی است":"کسری مقاومت ثقلی؛ نیروی مهار/انکر لازم بررسی شود";
    const rec={nodeId:row.nodeId,label:item.label,footing:{B,L,t},structureUpliftDemandKN:demand,footingAndCoverWeightKN:resistance,residualUpliftKN:Math.max(0,net),demandToWeightRatio:ratio,status};records.push(rec);
    if(body){const tr=document.createElement("tr");[rec.nodeId,rec.label,fmt(B)+"×"+fmt(L),fmt(demand),fmt(resistance),fmt(rec.residualUpliftKN),ratio===null?"—":fmt(ratio),status].forEach(x=>{const td=document.createElement("td");td.textContent=x;tr.appendChild(td);});body.appendChild(tr);}
   });
  });
  const residual=records.filter(x=>x.residualUpliftKN>1e-9).length;
  if(box)box.textContent="غربال بالاکشیدگی مستقل برای "+records.length+" حالت-پایه انجام شد؛ وزن هر پی جداگانه محاسبه شد. موارد دارای کسری مقاومت ثقلی: "+residual+". ظرفیت انکر و شکست بتن کنترل نشده است.";
  return{basis:"preliminary_per_base_gravity_uplift_screen_only",cases:records,limitations:["ابعاد هر پی جداگانه لحاظ شده؛ فقط وزن بتن پی/پدستال و خاک پوششی واردشده محاسبه شده است.","ظرفیت کششی بولت، صفحه‌ستون، مهار بتن، شکست مخروطی/لبه‌ای، آب زیرزمینی و اثر گروهی پی‌ها بررسی نشده است.","ترکیبات بار و ضرایب آیین‌نامه‌ای نهایی نشده‌اند؛ این غربال تأیید طراحی نیست."]};
 }
 function buildFootingRebarGeometry(baseRows,B,L,T,coverMm,specs){
  if(!Array.isArray(baseRows)||!baseRows.length||![B,L,T,coverMm].every(Number.isFinite)||B<=0||L<=0||T<=0||coverMm<0)return{ok:false,reason:"مختصات پایه‌ها، ابعاد پی، ضخامت و پوشش بتن باید معتبر باشند."};
  const bars=[],layers=Array.isArray(specs)?specs:[];
  for(const row of baseRows){
   if(![row.x,row.y,row.z].every(Number.isFinite))return{ok:false,reason:"مختصات سه‌بعدی یکی از پایه‌ها موجود نیست."};
   for(const sp of layers){
    if(!sp||!["bottom","top"].includes(sp.layer)||!["X","Z"].includes(sp.direction)||![sp.diaMm,sp.spacingMm].every(Number.isFinite)||sp.diaMm<=0||sp.spacingMm<=0)continue;
    const available=(sp.direction==="X"?B:L)*1000-2*coverMm;
    const cross=(sp.direction==="X"?L:B)*1000-2*coverMm;
    if(available<=0||cross<=0||T*1000<=2*coverMm+sp.diaMm)return{ok:false,reason:"پوشش و قطر میلگرد با ابعاد پی سازگار نیست."};
    const count=Math.ceil(cross/sp.spacingMm)+1;
    const y=row.y+(sp.layer==="bottom"?-T*1000+coverMm+sp.diaMm/2:-coverMm-sp.diaMm/2)/1000;
    for(let i=0;i<count;i++){
     const offset=-cross/2+(count===1?0:i*cross/(count-1));
     const a=sp.direction==="X"?{x:row.x-available/2000,y,z:row.z+offset/1000}:{x:row.x+offset/1000,y,z:row.z-available/2000};
     const b=sp.direction==="X"?{x:row.x+available/2000,y,z:row.z+offset/1000}:{x:row.x+offset/1000,y,z:row.z+available/2000};
     bars.push({id:[row.nodeId||"base",sp.layer,sp.direction,i+1].join("-"),baseNodeId:row.nodeId||null,layer:sp.layer,direction:sp.direction,a,b,diameterMm:sp.diaMm});
    }
   }
  }
  return{ok:bars.length>0,bars,count:bars.length,baseCount:baseRows.length,assumptions:"مرکز هر پی منطبق بر مختصات گره پایه فرض شده؛ میلگردها مستقیم و بدون خم/قلاب/وصله مدل شده‌اند. تراز y گره پایه مبنای تراز رویه پی است؛ محور y در مدل رو به بالا است، بنابراین شبکه تحتانی در تراز y منفی‌تر و شبکه فوقانی نزدیک‌تر به رویه پی قرار می‌گیرد. این هندسه برای کنترل برخورد اولیه است، نه نقشه اجرایی."};
}
function footingGridSpecs(state){
 const out=[];
 for(const layer of ["bottom","top"])for(const direction of ["X","Z"]){
  const prefix=layer==="bottom"?"bottomBar":"topBar",suffix=direction==="X"?"Xmm":"Zmm";
  const dia=Number(state[prefix+"Dia"+suffix]),spacing=Number(state[prefix+"Spacing"+suffix]);
  if(dia>0&&spacing>0)out.push({layer,direction,diaMm:dia,spacingMm:spacing});
 }
 return out;
}
function calculateFootingRebar(baseRows){
 const cover=state.rebarCoverMm===""?null:Number(state.rebarCoverMm);
 const defs=[
  {layer:"تحتانی",direction:"موازی X",diaKey:"bottomBarDiaXmm",spacingKey:"bottomBarSpacingXmm",parallel:"X"},
  {layer:"تحتانی",direction:"موازی Z",diaKey:"bottomBarDiaZmm",spacingKey:"bottomBarSpacingZmm",parallel:"Z"},
  {layer:"فوقانی",direction:"موازی X",diaKey:"topBarDiaXmm",spacingKey:"topBarSpacingXmm",parallel:"X"},
  {layer:"فوقانی",direction:"موازی Z",diaKey:"topBarDiaZmm",spacingKey:"topBarSpacingZmm",parallel:"Z"}
 ];
 const any=defs.some(x=>String(state[x.diaKey]??"").trim()!==""||String(state[x.spacingKey]??"").trim()!=="")||String(state.rebarCoverMm??"").trim()!=="";
 const box=$("foundationRebarSummary"),body=$("foundationRebarRows");if(body)body.replaceChildren();
 if(!any){if(box)box.textContent="ورودی شبکه آرماتور وارد نشده است؛ وزن آرماتور پی در متره خالی می‌ماند.";return null;}
 if(cover===null||!Number.isFinite(cover)||cover<0){if(box)box.textContent="پوشش بتن باید از نقشه اجرایی وارد شود.";return null;}
 const rows=[];
 for(const sp of defs){
  const rawDia=state[sp.diaKey],rawSpacing=state[sp.spacingKey];
  if(String(rawDia??"").trim()===""&&String(rawSpacing??"").trim()==="")continue;
  const dia=num(rawDia),spacing=num(rawSpacing);
  if(!dia||!spacing){if(box)box.textContent="هر شبکه/جهت انتخاب‌شده باید هم قطر و هم فاصله مثبت داشته باشد.";return null;}
  let totalCount=0,totalLengthM=0;
  for(const base of baseRows){
   const d=footingSpecFor(base),perp=(sp.parallel==="X"?d.length:d.width)*1000-2*cover,parallel=(sp.parallel==="X"?d.width:d.length)*1000-2*cover;
   if(perp<=0||parallel<=0||d.thickness*1000<=2*cover+dia){if(box)box.textContent="پوشش و قطر میلگرد با ابعاد پی "+base.nodeId+" سازگار نیست.";return null;}
   const count=Math.ceil(perp/spacing)+1;totalCount+=count;totalLengthM+=count*parallel/1000;
  }
  const unitWeightKgM=dia*dia/162;
  rows.push({layer:sp.layer,direction:sp.direction,diameterMm:dia,spacingMm:spacing,totalCount,totalLengthM,unitWeightKgM,totalWeightKg:totalLengthM*unitWeightKgM});
 }
 if(!rows.length){if(box)box.textContent="هیچ قطر و فاصله معتبری برای شبکه انتخاب‌شده وارد نشده است.";return null;}
 rows.forEach(r=>{if(body){const tr=document.createElement("tr");[r.layer,r.direction,fmt(r.totalCount),"متغیر بر اساس ابعاد هر پایه",fmt(r.totalLengthM),fmt(r.totalWeightKg)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);}});
 const totalWeightKg=rows.reduce((a,r)=>a+r.totalWeightKg,0),bottom=rows.filter(r=>r.layer==="تحتانی").reduce((a,r)=>a+r.totalWeightKg,0),top=rows.filter(r=>r.layer==="فوقانی").reduce((a,r)=>a+r.totalWeightKg,0);
 if(box)box.textContent="وزن تقریبی شبکه‌ها برای "+baseRows.length+" پی با ابعاد مستقل هر پایه: تحتانی "+fmt(bottom)+" kg، فوقانی "+fmt(top)+" kg، مجموع "+fmt(totalWeightKg)+" kg. فقط شاخه مستقیم؛ بدون قلاب، وصله، خم و تقویت موضعی.";
 return{basis:"per_base_footing_schedule_straight_mat_bars",coverMm:cover,rows,totalBottomWeightKg:bottom,totalTopWeightKg:top,totalWeightKg,limitations:["ابعاد هر پی از جدول مستقل پایه‌ها خوانده می‌شود.","فقط میلگردهای مستقیم شبکه با وزن واحد تقریبی d²/162 متره شده‌اند.","قلاب، وصله، خم، مهاری، پرت، تقویت موضعی و کنترل مقاومت در این متره نیستند."]};
}
function calculatePedestalRebar(baseCount){
  const specs=[
   {key:"longitudinal",label:"میلگرد طولی",diaKey:"pedestalLongBarDiaMm",countKey:"pedestalLongBarsPerBase",lengthKey:"pedestalLongBarCutLengthM"},
   {key:"ties",label:"خاموت",diaKey:"pedestalTieBarDiaMm",countKey:"pedestalTiesPerBase",lengthKey:"pedestalTieCutLengthM"}
  ];
  const entered=specs.some(x=>[state[x.diaKey],state[x.countKey],state[x.lengthKey]].some(v=>String(v??"").trim()!==""));
  const box=$("foundationPedestalRebarSummary");if(!entered){if(box)box.textContent="ورودی آرماتور پدستال وارد نشده است؛ مقدار آن در متره خالی می‌ماند.";return null;}
  const rows=[];
  for(const sp of specs){
   const raw=[state[sp.diaKey],state[sp.countKey],state[sp.lengthKey]];
   if(raw.every(v=>String(v??"").trim()===""))continue;
   const dia=num(raw[0]),count=raw[1]===""?null:Number(raw[1]),length=num(raw[2]);
   if(!dia||!Number.isInteger(count)||count<=0||!length){if(box)box.textContent="برای هر قلم انتخاب‌شده آرماتور پدستال، قطر، تعداد در هر پدستال و طول برش مثبت و معتبر لازم است.";return null;}
   const unitWeightKgM=dia*dia/162,totalCount=count*baseCount,totalLengthM=totalCount*length;
   rows.push({key:sp.key,label:sp.label,diameterMm:dia,countPerBase:count,totalCount,cutLengthM:length,totalLengthM,unitWeightKgM,totalWeightKg:totalLengthM*unitWeightKgM});
  }
  if(!rows.length)return null;
  const totalWeightKg=rows.reduce((a,x)=>a+x.totalWeightKg,0);
  if(box)box.textContent="وزن نظری آرماتور پدستال برای "+baseCount+" پایه: "+fmt(totalWeightKg)+" kg؛ طول‌ها و تعدادها عیناً از ورودی نقشه/جدول خم و برش گرفته شده‌اند. قلاب و وصله فقط در صورتی لحاظ می‌شوند که در طول برش ورودی منظور شده باشند.";
  return {basis:"manual_bar_bending_schedule_quantities",rows,totalWeightKg,limitations:["تعداد و طول برش باید از نقشه اجرایی یا جدول خم و برش وارد شود؛ هیچ جزئیات اجرایی حدس زده نمی‌شود.","وزن واحد تقریبی d²/162 kg/m است.","طول مهاری، قلاب، خم، وصله و پرت جداگانه محاسبه نشده‌اند مگر اینکه در طول برش واردشده منظور شده باشند.","این متره، طراحی یا کنترل مقاومت پدستال و خاموت‌ها نیست."]};
 }
 function buildTieRouteTakeoff(audit,routes){
  if(!Array.isArray(routes)||!routes.length)return{complete:false,source:"manual_input",count:null,totalLengthM:null,totalConcreteM3:null,sideFormworkM2:null,schedule:[],warnings:[]};
  const rows=Array.isArray(audit?.rows)?audit.rows:[],byId=new Map(rows.map(x=>[String(x.id),x])),schedule=[],warnings=[];
  for(const route of routes){
   const row=byId.get(String(route.id));
   if(!row||!Number.isFinite(Number(row.lengthM))||!(Number(row.lengthM)>0)||!Number.isFinite(Number(row.volumeM3))||!(Number(row.volumeM3)>0)||!row.section){
    warnings.push("هندسه مسیر "+String(route.id)+" کامل/معتبر نیست؛ طول و حجم آن وارد متره نشد.");continue;
   }
   const reasons=Array.isArray(row.reasons)?row.reasons:[];
   const geometryErrors=reasons.filter(x=>x!=="نوع اتصال دو سر کامل تعیین نشده");
   if(geometryErrors.length){warnings.push("مسیر "+String(route.id)+" به علت نقص هندسی وارد متره نشد: "+geometryErrors.join("، "));continue;}
   const h=Number(route.heightM),w=Number(route.widthM);
   if(!(h>0&&w>0)){warnings.push("ابعاد مقطع مسیر "+String(route.id)+" معتبر نیست.");continue;}
   schedule.push({id:String(route.id),start:route.start,end:route.end,lengthM:Number(row.lengthM),widthM:w,heightM:h,concreteM3:Number(row.volumeM3),sideFormworkM2:2*h*Number(row.lengthM),connectionStatus:reasons.length?"نیازمند تکمیل نوع اتصال":"ثبت‌شده"});
   if(reasons.length)warnings.push("مسیر "+String(route.id)+" از نظر هندسه متره شد، اما نوع اتصال ابتدا/انتها هنوز تعیین نشده است.");
  }
  const complete=schedule.length===routes.length;
  return{complete,source:complete?"route_geometry":"invalid_routes",count:complete?routes.length:null,totalLengthM:complete?schedule.reduce((a,x)=>a+x.lengthM,0):null,totalConcreteM3:complete?schedule.reduce((a,x)=>a+x.concreteM3,0):null,sideFormworkM2:complete?schedule.reduce((a,x)=>a+x.sideFormworkM2,0):null,schedule:complete?schedule:[],warnings};
 }
 function buildTieRebarTakeoff(report,routes){
  if(!Array.isArray(routes)||!routes.length)return{complete:false,source:"not_available",totalWeightKg:null,schedule:[],warnings:[]};
  const rows=Array.isArray(report?.rows)?report.rows:[],byId=new Map(rows.map(x=>[String(x.id),x])),schedule=[],warnings=[];
  for(const route of routes){
   const row=byId.get(String(route.id)),long=row?.longitudinalBars,stirrup=row?.stirrup?.detail;
   if(!row||!row.ok||!long||long.hookAllowanceIncluded!==true||!Number.isFinite(Number(long.approximateMassKg))||!stirrup?.ok||!Number.isFinite(Number(stirrup.approximateMassKg))){
    warnings.push("متره خودکار آرماتور شناژ "+String(route.id)+" کامل نیست؛ کنترل نیرو، مسیر میلگرد، قلاب انتهایی و خاموت لازم است.");continue;
   }
   schedule.push({id:String(route.id),longitudinalMassKg:Number(long.approximateMassKg),stirrupMassKg:Number(stirrup.approximateMassKg),totalMassKg:Number(long.approximateMassKg)+Number(stirrup.approximateMassKg),longitudinalBarCount:long.totalCountIncludingSideBars??long.totalCount,straightLengthM:long.totalStraightLengthM,cutLengthM:long.totalCutLengthM,stirrupCount:stirrup.count,hookAllowancePerEndMm:long.hookCutAllowancePerEndMm,passesThroughFootings:true,source:"tie_beam_reinforcement_screen"});
  }
  const complete=schedule.length===routes.length;
  return{complete,source:complete?"tie_beam_reinforcement_screen":"incomplete_design_or_detail",totalWeightKg:complete?schedule.reduce((a,x)=>a+x.totalMassKg,0):null,schedule:complete?schedule:[],warnings};
 }
 function quantify(){
  readInputs();
  const count=lastReport?.rows?.length||0,w=num(state.footingWidthM),l=num(state.footingLengthM),t=num(state.footingThicknessM);
   if(lastReport?.rows?.length&&!scheduleDimensionsValid(lastReport.rows)){$("foundationQuantitySummary").textContent="ابعاد یکی از پی‌های جدول مستقل معتبر نیست؛ ابعاد را اصلاح کنید.";return;}
   const footingRows=(lastReport?.rows||[]).map(row=>({row,spec:footingSpecFor(row)}));
  if(!lastReport){$("foundationQuantitySummary").textContent="ابتدا واکنش‌های آخرین تحلیل را استخراج کنید تا تعداد پی‌ها مشخص شود.";return;}
  if(!count||!w||!l||!t){$("foundationQuantitySummary").textContent="برای محاسبه حجم بتن، عرض، طول و ضخامت واقعی پی را وارد کنید. هیچ ابعادی به‌صورت پیش‌فرض فرض نشده است.";return;}
  const pw=num(state.pedestalWidthM),pl=num(state.pedestalLengthM),ph=num(state.pedestalHeightM);
  const pedComplete=pw&&pl&&ph,footingConcrete=footingRows.reduce((s,x)=>s+x.spec.width*x.spec.length*x.spec.thickness,0),pedConcrete=pedComplete?count*pw*pl*ph:0;
  const excavationDepth=num(state.excavationDepthM),clearance=state.workingSpaceM===""?null:Number(state.workingSpaceM);
  const excavation=excavationDepth!==null&&clearance!==null&&clearance>=0?footingRows.reduce((s,x)=>s+(x.spec.width+2*clearance)*(x.spec.length+2*clearance)*excavationDepth,0):null;
  const formFoot=footingRows.reduce((s,x)=>s+2*(x.spec.width+x.spec.length)*x.spec.thickness,0),formPed=pedComplete?count*2*(pw+pl)*ph:0;
  const anchors=state.anchorsPerBase!==""&&Number.isInteger(Number(state.anchorsPerBase))&&Number(state.anchorsPerBase)>=0?count*Number(state.anchorsPerBase):null;
  const tw=num(state.tieWidthM),th=num(state.tieHeightM),tieLayoutData=window.SteelTieBeamLayout?.getData?.()||{},tieRoutes=Array.isArray(tieLayoutData.routes)?tieLayoutData.routes:[],tieRouteTakeoff=buildTieRouteTakeoff(tieRoutes.length?window.SteelTieBeamLayout?.audit?.():null,tieRoutes);
  const manualTieCount=state.tieCount!==""&&Number.isInteger(Number(state.tieCount))&&Number(state.tieCount)>=0?Number(state.tieCount):null;
  const manualTieLength=state.tieTotalLengthM!==""&&Number(state.tieTotalLengthM)>=0?Number(state.tieTotalLengthM):null;
  const tieCount=tieRoutes.length?(tieRouteTakeoff.complete?tieRouteTakeoff.count:null):manualTieCount;
  const tieLength=tieRoutes.length?(tieRouteTakeoff.complete?tieRouteTakeoff.totalLengthM:null):manualTieLength;
  const tieSectionComplete=tieRoutes.length?tieRouteTakeoff.complete:!!(tw&&th&&tieLength!==null);
  const tieConcrete=tieRoutes.length?(tieRouteTakeoff.complete?tieRouteTakeoff.totalConcreteM3:null):(tieSectionComplete?tieLength*tw*th:null);
   const datumRows=(lastReport?.rows||[]).filter(r=>Number.isFinite(Number(r.y))).map(r=>({nodeId:r.nodeId,...footingDatumGeometry(Number(r.y),th||0.5,t||0.8)}));
   const datumSummary=datumRows.length?{baseCount:datumRows.length,allTopLevelsCoincident:datumRows.every(r=>r.ok&&r.topLevelsCoincident),tieHeightM:th||0.5,footingDepthM:t||0.8,extraExcavationBelowTieM:datumRows[0].extraExcavationBelowTieM,rows:datumRows,analysisAxisCaveat:"در مدل تحلیل فعلی محور شناژ از گره پایه عبور می‌کند؛ انتقال محور به پایین به اندازه نصف ارتفاع شناژ همراه با بازوی صلب/اتصال خارج از مرکز هنوز پیاده نشده است. بنابراین این تراز مشترک فعلاً هندسه هدف متره و نقشه است و نباید به‌عنوان اصلاح‌شدن سختی/اتصال مدل تحلیل تلقی شود."}:null;
  const tieReady=tieConcrete!==null;
  const tieFormwork=tieRoutes.length?(tieRouteTakeoff.complete?tieRouteTakeoff.sideFormworkM2:null):(tieSectionComplete?tieLength*2*th:null);
  const tieRebarTakeoff=buildTieRebarTakeoff(window.SteelTieBeamReinforcement?.getLast?.(),tieRoutes),manualTieRebar=tieSectionComplete&&state.tieRebarKgPerM!==""&&Number(state.tieRebarKgPerM)>=0?tieLength*Number(state.tieRebarKgPerM):null,tieRebar=tieRebarTakeoff.complete?tieRebarTakeoff.totalWeightKg:manualTieRebar;
  const knownConcreteSubtotal=footingConcrete+(pedComplete?pedConcrete:0)+(tieConcrete!==null?tieConcrete:0);
  const totalConcrete=pedComplete&&tieConcrete!==null?knownConcreteSubtotal:null;
  const knownFormworkSubtotal=formFoot+(pedComplete?formPed:0)+(tieFormwork!==null?tieFormwork:0);
  const totalFormwork=pedComplete&&tieFormwork!==null?knownFormworkSubtotal:null;
  const rebar=calculateFootingRebar(lastReport.rows);
  const pedestalRebar=calculatePedestalRebar(count);
   const q={baseCount:count,footingConcreteM3:footingConcrete,pedestalConcreteM3:pedComplete?pedConcrete:null,tieCount,tieTotalLengthM:tieLength,tieConcreteM3:tieConcrete,tieSideFormworkM2:tieFormwork,footingFormworkM2:formFoot,pedestalFormworkM2:pedComplete?formPed:null,totalFormworkM2:totalFormwork,knownFormworkSubtotalM2:knownFormworkSubtotal,tieRebarKg:tieRebar,tieRebarTakeoffSource:tieRebarTakeoff.source,tieRebarSchedule:tieRebarTakeoff.schedule,tieRebarTakeoffWarnings:tieRebarTakeoff.warnings,tieTakeoffSource:tieRoutes.length?tieRouteTakeoff.source:"manual_input",tieRouteSchedule:tieRouteTakeoff.schedule,tieRouteWarnings:tieRouteTakeoff.warnings,footingRebarKg:rebar?.totalWeightKg??null,footingRebar:rebar,pedestalRebarKg:pedestalRebar?.totalWeightKg??null,pedestalRebar,totalRebarKg:[rebar?.totalWeightKg??null,pedestalRebar?.totalWeightKg??null,tieRebar].every(v=>v!==null&&Number.isFinite(Number(v)))?Number(rebar.totalWeightKg)+Number(pedestalRebar.totalWeightKg)+Number(tieRebar):null,totalConcreteM3:totalConcrete,knownConcreteSubtotalM3:knownConcreteSubtotal,excavationM3:excavation,sideFormworkM2:knownFormworkSubtotal,anchorsCount:anchors,sharedTopDatum:datumSummary,footingSchedule:footingRows.map(x=>({nodeId:x.row.nodeId,...x.spec,excavationM3:excavationDepth!==null&&clearance!==null&&clearance>=0?(x.spec.width+2*clearance)*(x.spec.length+2*clearance)*excavationDepth:null})),dimensions:{w,l,t,pw:pw||null,pl:pl||null,ph:ph||null,excavationDepthM:excavationDepth,workingSpaceM:clearance,tieWidthM:tw||null,tieHeightM:th||null}};
  lastReport.quantities=q;
  lastReport.foundationBearing=screenBearing(q);
  lastReport.foundationSliding=screenSliding();
  lastReport.foundationUplift=screenUplift();
  window.SteelCostEstimate?.refreshFromFoundation?.(q);window.SteelProjectBOQ?.refresh?.();
  $("foundationQuantitySummary").textContent="تعداد پی: "+count+" | تراز بالای مشترک هدف پی/شناژ: "+(datumSummary?"برابر در "+datumSummary.baseCount+" پایه؛ عمق اضافه زیر کف شناژ: "+fmt(datumSummary.extraExcavationBelowTieM)+" m":"مختصات تراز موجود نیست")+" | بتن پی: "+fmt(footingConcrete)+" م³"+(pedComplete?" | بتن پدستال: "+fmt(pedConcrete)+" م³":" | پدستال: ابعاد کامل وارد نشده")+(tieReady?" | شناژها: "+fmt(tieLength)+" متر طول، "+fmt(tieConcrete)+" م³ بتن، "+fmt(tieFormwork)+" م² قالب جانبی"+(tieRebar!==null?"، "+fmt(tieRebar)+" کیلوگرم آرماتور بر اساس وزن واحد واردشده":"، آرماتور شناژ محاسبه نشده"):" | شناژها هنوز متره نشده‌اند؛ تعداد، طول کل، عرض و ارتفاع را از نقشه وارد کنید")+(rebar?" | آرماتور شبکه‌های پی: "+fmt(rebar.totalWeightKg)+" kg":" | آرماتور شبکه پی محاسبه نشده؛ قطر، فاصله و پوشش را از نقشه وارد کنید")+(pedestalRebar?" | آرماتور پدستال: "+fmt(pedestalRebar.totalWeightKg)+" kg":" | آرماتور پدستال متره نشده")+" | جمع بتن کامل پی، پدستال و شناژ: "+(q.totalConcreteM3!==null?fmt(q.totalConcreteM3)+" م³":"نامشخص؛ ابعاد پدستال و متره شناژ باید تکمیل شود")+(excavation!==null?" | خاکبرداری هندسی: "+fmt(excavation)+" م³":" | خاکبرداری محاسبه نشده؛ عمق و فضای کار را وارد کنید")+" | قالب جانبی اجزای محاسبه‌شده: "+fmt(knownFormworkSubtotal)+" م²"+(totalFormwork===null?" (جمع کامل تا تکمیل پدستال و شناژ نامشخص است)":"")+(anchors!==null?" | تعداد بولت: "+anchors:" | تعداد بولت وارد نشده")+". قالب کف شناژ، وصله/خم میلگرد، بتن مگر، پرت، خاک متورم و اصلاح حجم خاکبرداری در این محاسبه نیستند. مقدار شناژ بر اساس ورودی نقشه است، نه تشخیص خودکار مسیر.";
 }
 function exportCSV(){
  if(!lastReport)return;
  readInputs();quantify();
  const lines=[["نوع گزارش","واکنش و متره مقدماتی فونداسیون"],["حالت بار",lastReport.loadCase],["نوع تکیه‌گاه",lastReport.supportType]];
  if(lastReport.rows.some(r=>Array.isArray(r.envelopes))){lines.push(["گره","X (m)","Z (m)",...["Fx","Fy","Fz"].map(x=>x+" min (kN)"),...["Fx","Fy","Fz"].map(x=>x+" max (kN)"),...["Mx","My","Mz"].map(x=>x+" min (kN.m)"),...["Mx","My","Mz"].map(x=>x+" max (kN.m)")]);lastReport.rows.forEach(r=>lines.push([r.nodeId,r.x,r.z,...r.envelopes.slice(0,3).map(e=>e.min/1000),...r.envelopes.slice(0,3).map(e=>e.max/1000),...r.envelopes.slice(3).map(e=>e.min/1e6),...r.envelopes.slice(3).map(e=>e.max/1e6)]));lines.push([],["واکنش‌های هم‌زمان هر ترکیب (برای جلوگیری از ترکیب کمینه/بیشینه‌های نامتجانس)"],["گره","حالت بار","Fx (kN)","Fy (kN)","Fz (kN)","Mx (kN.m)","My (kN.m)","Mz (kN.m)"]);lastReport.rows.forEach(r=>(r.caseReactions||[]).forEach(s=>lines.push([r.nodeId,s.label,...s.values.slice(0,3).map(v=>v/1000),...s.values.slice(3,6).map(v=>v/1e6)])));}
  else{lines.push(["گره","X (m)","Z (m)","Fx (kN)","Fy (kN)","Fz (kN)","Mx (kN.m)","My (kN.m)","Mz (kN.m)"],...lastReport.rows.map(r=>[r.nodeId,r.x,r.z,...r.values.slice(0,3).map(v=>v/1000),...r.values.slice(3,6).map(v=>v/1e6)]));}
  if(lastReport.foundationSliding){const fs=lastReport.foundationSliding;lines.push([],["غربال مقدماتی لغزش پی منفرد"],["ضریب اصطکاک μ",fs.frictionCoefficient],["وزن افزوده هر پی (kN)",fs.addedWeightPerFootingKN],["گره","حالت بار","H (kN)","N مؤثر (kN)","μN (kN)","μN/H","نتیجه"],...fs.cases.map(x=>[x.nodeId,x.label,x.HkN,x.NkN,x.resistanceKN,x.resistanceDemandRatio,x.status]));}if(lastReport.foundationUplift){const fu=lastReport.foundationUplift;lines.push([],["غربال مقدماتی بالاکشیدگی بر اساس وزن ثقلی"],["مبنای کنترل",fu.basis],["وزن بتن هر پی (kN)",fu.concreteWeightPerFootingKN],["وزن خاک پوششی هر پی (kN)",fu.soilCoverWeightPerFootingKN],["مجموع مقاومت ثقلی هر پی (kN)",fu.gravityResistancePerFootingKN],["گره","حالت بار","تقاضای بالاکشیدگی (kN)","وزن پی و خاک (kN)","کسری ثقلی (kN)","نسبت تقاضا/وزن","نتیجه"],...fu.cases.map(x=>[x.nodeId,x.label,x.structureUpliftDemandKN,x.footingAndCoverWeightKN,x.residualUpliftKN,x.demandToWeightRatio,x.status]));}if(lastReport.foundationBearing){const fb=lastReport.foundationBearing;lines.push([],["غربال مقدماتی فشار زیر پی"],["مبنای کنترل",fb.basis],["فشار مجاز ناخالص (kPa)",fb.allowableKPa],["جابه‌جایی محور ستون در X از مرکز پی (m)",fb.columnOffsetXM],["جابه‌جایی محور ستون در Z از مرکز پی (m)",fb.columnOffsetZM],["وزن بتن هر پی (kN)",fb.concreteWeightPerFootingKN],["وزن خاک پوششی هر پی (kN)",fb.soilCoverWeightPerFootingKN],["گره","حالت بار","N سازه (kN)","N با وزن‌های افزوده (kN)","Mx مؤثر (kN.m)","Mz مؤثر (kN.m)","eX (m)","eZ (m)","qmin (kPa)","qmax (kPa)","نتیجه"],...fb.cases.map(x=>[x.nodeId,x.label,x.NkN,x.totalNkN,x.effectiveMxKNm,x.effectiveMzKNm,x.eXM,x.eZM,x.qminKPa,x.qmaxKPa,x.status]));}if(lastReport.quantities){const q=lastReport.quantities;if(q.footingRebar?.rows){lines.push([],["متره شبکه تحتانی پی"],["لایه","جهت","تعداد هر پی","طول برش (m)","طول کل (m)","وزن واحد (kg/m)","وزن کل (kg)"],...q.footingRebar.rows.map(r=>[r.layer,r.direction,r.countPerFooting,r.cutLengthM,r.totalLengthM,r.unitWeightKgM,r.totalWeightKg]));}if(q.pedestalRebar?.rows){lines.push([],["متره آرماتور پدستال"],["شرح","قطر (mm)","تعداد در هر پایه","تعداد کل","طول برش (m)","طول کل (m)","وزن واحد (kg/m)","وزن کل (kg)"],...q.pedestalRebar.rows.map(r=>[r.label,r.diameterMm,r.countPerBase,r.totalCount,r.cutLengthM,r.totalLengthM,r.unitWeightKgM,r.totalWeightKg]));}lines.push(["تعداد پی",q.baseCount],["بتن پی (m3)",q.footingConcreteM3],["بتن پدستال (m3)",q.pedestalConcreteM3??"نامشخص"],["مجموع بتن (m3)",q.totalConcreteM3],["خاکبرداری (m3)",q.excavationM3??"نامشخص"],["بتن شناژ (m3)",q.tieConcreteM3??"نامشخص"],["طول کل شناژ (m)",q.tieTotalLengthM??"نامشخص"],["تعداد شناژ",q.tieCount??"نامشخص"],["قالب جانبی شناژ (m2)",q.tieSideFormworkM2??"نامشخص"],["آرماتور شناژ (kg)",q.tieRebarKg??"نامشخص"],["آرماتور شبکه تحتانی پی (kg)",q.footingRebarKg??"نامشخص"],["قالب جانبی کل (m2)",q.sideFormworkM2],["تعداد بولت",q.anchorsCount??"نامشخص"]);}
  const csv="\uFEFF"+lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Foundation-Takeoff.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 function drawingFootingSpecs(mode){
  if(mode==="default")return{specs:[
   {layer:"bottom",direction:"X",diaMm:16,spacingMm:150},
   {layer:"bottom",direction:"Z",diaMm:16,spacingMm:150}
  ],basis:"پیش‌فرض کاربر: فقط شبکه تحتانی، Ø16 با فاصله 150 میلی‌متر در دو راستا."};
  const manual=footingGridSpecs(state);
  if(manual.length)return{specs:manual,basis:"مقادیر قطر و فاصله ثبت‌شده در ورودی آرماتور فونداسیون."};
  const report=window.SteelFootingStructuralScreen?.getLast?.();
  if(!report?.records?.length)return{specs:[],basis:"خروجی غربال سازه‌ای فونداسیون موجود نیست؛ ابتدا غربال را اجرا کنید و قطر میلگردهای تحتانی را ثبت کنید."};
  const specs=[];
  for(const dir of ["X","Z"]){
   const tokens=report.records.filter(r=>r&&Number.isFinite(r.spacingByStrengthMm)&&r.spacingByStrengthMm>0&&String(r.direction||"").includes(dir==="X"?"موازی X":"موازی Z"));
   if(!tokens.length)continue;
   const dia=Number(dir==="X"?state.bottomBarDiaXmm:state.bottomBarDiaZmm);
   if(!(dia>0))continue;
   specs.push({layer:"bottom",direction:dir,diaMm:dia,spacingMm:Math.min(...tokens.map(r=>r.spacingByStrengthMm))});
  }
  return{specs,basis:"فاصله از As لازمِ غربال مقدماتی و قطر واردشده در ورودی فونداسیون؛ این خروجی طراحی نهایی یا تأیید آیین‌نامه‌ای نیست."};
 }
 function drawingTieSpecs(mode,routes){
  const report=window.SteelTieBeamReinforcement?.getLast?.(),rows=new Map((report?.rows||[]).map(r=>[String(r.id),r]));
  return routes.map(route=>{
   if(mode==="default")return{route,count:3,dia:16,width:Number(route.widthM)||Number(state.tieWidthM)||0.60,height:Number(route.heightM)||Number(state.tieHeightM)||0.50,stirrupDia:Number(route.reinforcement?.stirrupDiaMm)||10,source:"پیش‌فرض نمایشی"};
   const row=rows.get(String(route.id)),count=Number(row?.barCountEachFace),dia=Number(row?.barDiaMm),width=Number(route.widthM),height=Number(route.heightM);
   if(row?.ok&&Number.isInteger(count)&&count>0&&dia>0)return{route,count,dia,width,height,stirrupDia:Number(report?.settings?.stirrupDiaMm)||Number(route.reinforcement?.stirrupDiaMm)||10,source:"گزارش آخرین محاسبه آرماتور شناژ"};
   return{route,count:null,dia:null,width,height,source:"خروجی طراحی موجود نیست"};
  });
 }
 function footingsAlongStraightRoute(nodes,route,toleranceM=0.001){
  if(!Array.isArray(nodes)||!route)return{ok:false,reason:"مدل یا مسیر شناژ موجود نیست."};
  const byId=new Map(nodes.map(n=>[String(n.id),n]));
  const a=byId.get(String(route.start)),b=byId.get(String(route.end));
  if(!a||!b)return{ok:false,reason:"گره ابتدا یا انتهای شناژ در مدل موجود نیست."};
  const dx=Number(b.x)-Number(a.x),dz=Number(b.z)-Number(a.z),length=Math.hypot(dx,dz);
  if(!(length>0))return{ok:false,reason:"مسیر شناژ طول افقی معتبر ندارد."};
  const candidates=nodes.filter(n=>n&&(n.kind==="base"||n.kind==="endwall-base"||String(n.id)===String(route.start)||String(n.id)===String(route.end)));
  const found=candidates.map(n=>{
   const rx=Number(n.x)-Number(a.x),rz=Number(n.z)-Number(a.z),station=(rx*dx+rz*dz)/(length*length);
   const cross=Math.abs(rx*dz-rz*dx)/length;
   return{node:n,stationM:station*length,stationRatio:station,offsetFromAxisM:cross};
  }).filter(x=>x.stationRatio>=-toleranceM/length&&x.stationRatio<=1+toleranceM/length&&x.offsetFromAxisM<=toleranceM)
    .sort((p,q)=>p.stationM-q.stationM);
  const unique=found.filter((x,i)=>i===0||String(x.node.id)!==String(found[i-1].node.id));
  if(!unique.some(x=>String(x.node.id)===String(route.start))||!unique.some(x=>String(x.node.id)===String(route.end)))
   return{ok:false,reason:"پی ابتدا یا انتهای مسیر در امتداد مستقیم شناژ شناسایی نشد؛ مسیر شکسته یا غیرهم‌راستا است."};
  return{ok:true,lengthM:length,footings:unique};
 }
 function checkSelectedTieFootingClash(base,route,mode,footingSpecs,tie,tieRow,model){
  if(!base||!route)return{ok:false,reason:"برای کنترل برخورد، یک فونداسیون و یک شناژ انتخاب کنید."};
  const cover=state.rebarCoverMm===""?null:Number(state.rebarCoverMm);
  if(cover===null||!Number.isFinite(cover)||cover<0)return{ok:false,reason:"پوشش بتن واقعی پی را وارد کنید؛ مقدار فرضی استفاده نمی‌شود."};
  if(!footingSpecs?.specs?.length)return{ok:false,reason:"شبکه میلگرد فونداسیون برای کنترل برخورد تعریف نشده است."};
  const routeData=footingsAlongStraightRoute(model.nodes||[],route);
  if(!routeData.ok)return routeData;
  const selectedId=String(base.nodeId||base.id);
  if(!routeData.footings.some(x=>String(x.node.id)===selectedId))
   return{ok:false,reason:"فونداسیون انتخاب‌شده روی مسیر مستقیم این شناژ قرار ندارد."};
  const points=routeData.footings;
  const first=points[0].node,last=points[points.length-1].node;
  const dx=Number(last.x)-Number(first.x),dz=Number(last.z)-Number(first.z),length=Math.hypot(dx,dz);
  const ux=dx/length,uz=dz/length,vx=uz,vz=-ux;
  const y0=Number(first.y);
  if(points.some(x=>!Number.isFinite(Number(x.node.y))||Math.abs(Number(x.node.y)-y0)>1e-6))
   return{ok:false,reason:"تراز گره‌های پایه در مسیر یکسان نیست؛ ترسیم و کنترل میلگرد شناژ شیب‌دار هنوز پشتیبانی نمی‌شود."};
  const tieSettings=window.SteelTieBeamReinforcement?.getData?.()?.settings||{};
  const barDia=Number(tie?.dia)||16,stirrupDia=Number(tie?.stirrupDia)||10,width=Number(tie?.width),height=Number(tie?.height);
  if(!(width>0&&height>0&&barDia>0))return{ok:false,reason:"ابعاد یا قطر میلگرد شناژ معتبر نیست."};
  let coordinates=null;
  if(mode==="design"){
   coordinates=Array.isArray(tieRow?.barLayer?.coordinates)?tieRow.barLayer.coordinates:null;
   if(!coordinates?.length)return{ok:false,reason:"مختصات واقعی لایه‌های میلگرد خروجی طراحی شناژ موجود نیست؛ کنترل برخورد انجام نشد."};
  }else{
   const cov=Number(tieSettings.coverMm)||40,firstOffset=cov+stirrupDia+barDia/2,lastOffset=width*1000-firstOffset;
   if(lastOffset<firstOffset)return{ok:false,reason:"عرض شناژ برای آرایش پیش‌فرض سه میلگرد در هر وجه کافی نیست."};
   coordinates=[];
   for(const face of ["bottom","top"])for(let i=0;i<3;i++)coordinates.push({xMm:firstOffset+(lastOffset-firstOffset)*i/2,yMm:face==="bottom"?firstOffset:height*1000-firstOffset,face});
  }
  const firstSpec=footingSpecFor({nodeId:first.id,kind:first.kind}),lastSpec=footingSpecFor({nodeId:last.id,kind:last.kind});
  const firstProjection=(Math.abs(ux)*firstSpec.width+Math.abs(uz)*firstSpec.length)/2;
  const lastProjection=(Math.abs(ux)*lastSpec.width+Math.abs(uz)*lastSpec.length)/2;
  const start={x:Number(first.x)-ux*firstProjection,y:y0,z:Number(first.z)-uz*firstProjection};
  const end={x:Number(last.x)+ux*lastProjection,y:y0,z:Number(last.z)+uz*lastProjection};
  const tieBars=coordinates.map((p,i)=>{
   const cross=(Number(p.xMm)-width*500)/1000,vertical=Number(p.yMm)/1000-height/2;
   return{id:String(route.id)+"-L"+(i+1),diameterMm:barDia,
    a:{x:start.x+vx*cross,y:start.y+vertical,z:start.z+vz*cross},
    b:{x:end.x+vx*cross,y:end.y+vertical,z:end.z+vz*cross}};
  });
  const allGridBars=[],footingDetails=[];
  for(const item of points){
   const n=item.node,spec=footingSpecFor({nodeId:n.id,kind:n.kind});
   if(!(spec.width>0&&spec.length>0&&spec.thickness>0))return{ok:false,reason:"ابعاد پی "+n.id+" معتبر نیست."};
   const grid=buildFootingRebarGeometry([{nodeId:String(n.id),x:Number(n.x),y:Number(n.y),z:Number(n.z)}],spec.width,spec.length,spec.thickness,cover,footingSpecs.specs);
   if(!grid.ok)return{...grid,reason:"پی "+n.id+": "+grid.reason};
   allGridBars.push(...grid.bars);
   footingDetails.push({id:String(n.id),x:Number(n.x),y:Number(n.y),z:Number(n.z),widthM:spec.width,lengthM:spec.length,thicknessM:spec.thickness,barCount:grid.count});
  }
  const checker=window.SteelTieBeamReinforcement?.checkFootingBarClearance;
  if(typeof checker!=="function")return{ok:false,reason:"ماژول کنترل فاصله سه‌بعدی میلگردها در دسترس نیست."};
  const result=checker(tieBars,allGridBars,0);
  return{...result,tieBarCount:tieBars.length,footingBarCount:allGridBars.length,footingCount:footingDetails.length,footings:footingDetails,
   clearanceCriterion:"فقط عدم تماس/تقاطع هندسی (فاصله آزاد لازم آیین‌نامه‌ای هنوز اعمال نشده است).",
   assumptions:"پی‌های ابتدا، انتها و تمام گره‌های پایه هم‌راستا در طول مسیر مستقیم بررسی شده‌اند. میلگرد طولی شناژ از وجه بیرونی پی ابتدا تا وجه بیرونی پی انتها امتداد داده شده و از پی‌های میانی عبور می‌کند. قلاب، خم، وصله، طول مهاری و فاصله آزاد الزامی هنوز کنترل نشده‌اند."};
 }
 function renderRebarDrawing(){
  const host=$("rebarDrawingCanvas"),summary=$("rebarDrawingSummary"),mode=$("rebarDrawingMode")?.value||"default";
  if(!host||!summary)return;
  readInputs();
  let B=num(state.footingWidthM),L=num(state.footingLengthM),T=num(state.footingThicknessM);const cover=state.rebarCoverMm===""?null:Number(state.rebarCoverMm);
  const model=window.SteelStructuralModel?.getData?.()||{},layout=window.SteelTieBeamLayout?.getData?.()||{};
  const bases=lastReport?.rows?.length?lastReport.rows:(model.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");
  const routes=Array.isArray(layout.routes)?layout.routes:[];
  const footingSelect=$("footingRebarTarget"),tieSelect=$("tieRebarTarget");
  const previousFooting=footingSelect?.value||"",previousTie=tieSelect?.value||"";
  const baseId=n=>String(n.nodeId||n.id);
  if(footingSelect){
   const opts=bases.map(n=>({id:baseId(n),label:baseId(n)+" ("+Number(n.x).toFixed(2)+", "+Number(n.z).toFixed(2)+")"}));
   footingSelect.innerHTML=opts.map(o=>'<option value="'+o.id.replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'">'+o.label+'</option>').join("")||'<option value="">گره پایه موجود نیست</option>';
   footingSelect.value=opts.some(o=>o.id===previousFooting)?previousFooting:(opts[0]?.id||"");
  }
  if(tieSelect){
   tieSelect.innerHTML=routes.map(r=>'<option value="'+String(r.id).replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'">'+String(r.id)+'</option>').join("")||'<option value="">مسیر شناژ موجود نیست</option>';
   tieSelect.value=routes.some(r=>String(r.id)===previousTie)?previousTie:(routes[0]?.id||"");
  }
  const selectedBase=bases.find(n=>baseId(n)===(footingSelect?.value||""))||bases[0];
   if(selectedBase){const fs=footingSpecFor(selectedBase);B=fs.width;L=fs.length;T=fs.thickness;}
  const selectedRoute=routes.find(r=>String(r.id)===(tieSelect?.value||""))||routes[0];
  const footingSpecs=drawingFootingSpecs(mode),tieSpecs=drawingTieSpecs(mode,selectedRoute?[selectedRoute]:[]);
  const tie=tieSpecs[0]||null;
  const tieReport=window.SteelTieBeamReinforcement?.getLast?.();
  const tieRow=(tieReport?.rows||[]).find(r=>String(r.id)===String(selectedRoute?.id));
  const clash=checkSelectedTieFootingClash(selectedBase,selectedRoute,mode,footingSpecs,tie,tieRow,model);
  const nodeMap=new Map((model.nodes||[]).map(n=>[String(n.id),n]));
  const a=selectedRoute?nodeMap.get(String(selectedRoute.start)):null,b=selectedRoute?nodeMap.get(String(selectedRoute.end)):null;
  const routeLength=a&&b?Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y),Number(b.z)-Number(a.z)):null;
  const missing=[];
  if(!(B>0&&L>0&&T>0))missing.push("ابعاد واقعی پی برای ترسیم کامل وارد نشده است.");
  if(!selectedBase)missing.push("گره پایه‌ای برای انتخاب فونداسیون وجود ندارد.");
  if(mode==="design"&&!footingSpecs.specs.length)missing.push("داده شبکه طراحی فونداسیون موجود نیست.");
  if(mode==="design"&&tie?.count===null)missing.push("گزارش طراحی شناژ انتخاب‌شده موجود نیست.");
  const esc=s=>String(s??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const fmtSvg=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:2});
  const svg=[];
  svg.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1100" width="100%" role="img" aria-label="جزئیات جداگانه قفس آرماتور فونداسیون و شناژ">');
  svg.push('<rect width="1000" height="800" fill="#f8fafc"/>');
  const panel=(x,y,w,h,title)=>{svg.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="#fff" stroke="#94a3b8"/>');svg.push('<text x="'+(x+w/2)+'" y="'+(y+24)+'" text-anchor="middle" font-size="17" fill="#123b52">'+title+'</text>');};
  panel(20,40,465,330,"پلان فونداسیون انتخاب‌شده");
  panel(515,40,465,330,"مقطع فونداسیون انتخاب‌شده");
  panel(20,390,465,370,"مقطع شناژ انتخاب‌شده");
  panel(515,390,465,370,"نمای طولی قفس آرماتور شناژ");
  if(selectedBase&&B>0&&L>0&&footingSpecs.specs.length){
   const x0=105,y0=105,w=295,h=210;
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   footingSpecs.specs.forEach(sp=>{
    const dim=sp.direction==="X"?L:B,available=Math.max(0,dim*1000-2*(cover??0));
    const count=Math.max(1,Math.ceil(available/sp.spacingMm)+1);
    for(let i=0;i<count;i++){
     const p=count===1?0:i/(count-1);
     if(sp.direction==="X"){const y=y0+8+p*(h-16);svg.push('<line x1="'+(x0+8)+'" y1="'+y+'" x2="'+(x0+w-8)+'" y2="'+y+'" stroke="'+(sp.layer==="bottom"?"#dc2626":"#2563eb")+'" stroke-width="2"/>');}
     else{const x=x0+8+p*(w-16);svg.push('<line x1="'+x+'" y1="'+(y0+8)+'" x2="'+x+'" y2="'+(y0+h-8)+'" stroke="'+(sp.layer==="bottom"?"#dc2626":"#2563eb")+'" stroke-width="2"/>');}
    }
   });
   svg.push('<text x="252" y="340" text-anchor="middle" font-size="12" fill="#334155">'+esc(baseId(selectedBase))+' | '+fmtSvg(B)+' × '+fmtSvg(L)+' m</text>');
  }else svg.push('<text x="252" y="205" text-anchor="middle" font-size="14" fill="#64748b">'+(mode==="design"?"شبکه طراحی‌شده موجود نیست":"ابعاد یا گره پایه موجود نیست")+'</text>');
  if(B>0&&T>0&&footingSpecs.specs.length){
   const x0=545,y0=145,fw=130,fh=145,beamX=675,beamW=240,bh=fh*(Number(state.tieHeightM||0.5)/T);
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+fw+'" height="'+fh+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   svg.push('<rect x="'+beamX+'" y="'+y0+'" width="'+beamW+'" height="'+bh+'" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>');
   const bottom=footingSpecs.specs.filter(s=>s.layer==="bottom"),top=footingSpecs.specs.filter(s=>s.layer==="top");
   if(bottom.length)svg.push('<line x1="'+(x0+10)+'" y1="'+(y0+fh-18)+'" x2="'+(x0+fw-10)+'" y2="'+(y0+fh-18)+'" stroke="#dc2626" stroke-width="4"/>');
   if(top.length)svg.push('<line x1="'+(x0+10)+'" y1="'+(y0+18)+'" x2="'+(x0+fw-10)+'" y2="'+(y0+18)+'" stroke="#2563eb" stroke-width="4"/>');
   svg.push('<line x1="'+(x0-12)+'" y1="'+y0+'" x2="'+(beamX+beamW+8)+'" y2="'+y0+'" stroke="#047857" stroke-width="2" stroke-dasharray="6 4"/>');
   svg.push('<text x="'+(x0+fw/2)+'" y="'+(y0+fh+18)+'" text-anchor="middle" font-size="11" fill="#334155">پی '+fmtSvg(T)+' m</text>');
   svg.push('<text x="'+(beamX+beamW/2)+'" y="'+(y0+bh/2+4)+'" text-anchor="middle" font-size="12" fill="#334155">شناژ '+fmtSvg(Number(state.tieHeightM||0.5))+' m</text>');
   svg.push('<text x="747" y="330" text-anchor="middle" font-size="11" fill="#047857">خط سبز: تراز بالای مشترک پی و شناژ</text>');
   svg.push('<text x="747" y="348" text-anchor="middle" font-size="11" fill="#334155">اختلاف عمق زیر کف شناژ: '+fmtSvg(Math.max(0,T-Number(state.tieHeightM||0.5)))+' m</text>');
  }else svg.push('<text x="747" y="205" text-anchor="middle" font-size="14" fill="#64748b">اطلاعات مقطع فونداسیون کافی نیست</text>');
  if(tie&&tie.count!==null&&tie.width>0&&tie.height>0){
   const x0=105,y0=455,w=295,h=210,pad=28,st=Number(tie.stirrupDia)||10;
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   svg.push('<rect x="'+(x0+pad)+'" y="'+(y0+pad)+'" width="'+(w-2*pad)+'" height="'+(h-2*pad)+'" rx="10" fill="none" stroke="#0f766e" stroke-width="4"/>');
   const coords=mode==="design"&&Array.isArray(tieRow?.barLayer?.coordinates)?tieRow.barLayer.coordinates:null;
   if(coords?.length){
    const minX=Math.min(...coords.map(p=>p.xMm)),maxX=Math.max(...coords.map(p=>p.xMm)),minY=Math.min(...coords.map(p=>p.yMm)),maxY=Math.max(...coords.map(p=>p.yMm));
    coords.forEach(p=>{const cx=x0+pad+8+(maxX===minX?0:(p.xMm-minX)/(maxX-minX)*(w-2*pad-16)),cy=y0+pad+8+(maxY===minY?0:(p.yMm-minY)/(maxY-minY)*(h-2*pad-16));svg.push('<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="#dc2626"/>');});
   }else{
    for(let i=0;i<tie.count;i++){const cx=x0+pad+12+(tie.count===1?0:i*(w-2*pad-24)/(tie.count-1));svg.push('<circle cx="'+cx+'" cy="'+(y0+pad+8)+'" r="6" fill="#dc2626"/><circle cx="'+cx+'" cy="'+(y0+h-pad-8)+'" r="6" fill="#dc2626"/>');}
   }
   svg.push('<text x="252" y="705" text-anchor="middle" font-size="12" fill="#334155">'+esc(tie.route.id)+' | '+tie.count+' بالا + '+tie.count+' پایین Ø'+tie.dia+' | خاموت Ø'+st+'</text>');
  }else svg.push('<text x="252" y="565" text-anchor="middle" font-size="14" fill="#64748b">'+(mode==="design"?"گزارش طراحی این شناژ موجود نیست":"شناژ برای نمایش موجود نیست")+'</text>');
  if(tie&&tie.count!==null&&routeLength>0){
   const x0=585,y0=490,w=325,h=125,st=Number(tie.stirrupDia)||10;
   svg.push('<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>');
   svg.push('<line x1="'+(x0+12)+'" y1="'+(y0+25)+'" x2="'+(x0+w-12)+'" y2="'+(y0+25)+'" stroke="#dc2626" stroke-width="4"/>');
   svg.push('<line x1="'+(x0+12)+'" y1="'+(y0+h-25)+'" x2="'+(x0+w-12)+'" y2="'+(y0+h-25)+'" stroke="#dc2626" stroke-width="4"/>');
   const spacing=mode==="design"?(Number(tieRow?.stirrup?.detail?.actualSpacingMm)||Number(tieRow?.stirrup?.steelOnlySpacingMm)||200):(Number(selectedRoute.reinforcement?.stirrupSpacingMm)||200);
   const n=Math.min(60,Math.max(2,Math.floor(routeLength*1000/spacing)+1));
   for(let i=0;i<n;i++){const x=x0+12+i*(w-24)/(n-1);svg.push('<line x1="'+x+'" y1="'+(y0+8)+'" x2="'+x+'" y2="'+(y0+h-8)+'" stroke="#0f766e" stroke-width="2"/>');}
   svg.push('<text x="747" y="650" text-anchor="middle" font-size="12" fill="#334155">'+esc(tie.route.id)+' | طول '+fmtSvg(routeLength)+' m | خاموت Ø'+st+' @'+fmtSvg(spacing)+' mm</text>');
  }else svg.push('<text x="747" y="555" text-anchor="middle" font-size="14" fill="#64748b">مختصات مسیر یا داده آرماتور شناژ موجود نیست</text>');

  // Interactive isometric overview: dimensions and node positions come only from the active model inputs.
  panel(20,810,960,260,"نمای سه‌بعدی شماتیک فونداسیون و شناژ — چرخش و بزرگ‌نمایی");
  const isoControls='<div class="button-grid" style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn secondary" data-iso="left">چرخش چپ</button><button type="button" class="btn secondary" data-iso="right">چرخش راست</button><button type="button" class="btn secondary" data-iso="in">بزرگ‌نمایی +</button><button type="button" class="btn secondary" data-iso="out">کوچک‌نمایی −</button><button type="button" class="btn secondary" data-iso="reset">نمای اولیه</button></div>';
  const clashStatus=Number.isFinite(clash?.minimumClearDistanceMm)
   ?(clash.ok?"کنترل هندسی: بدون تقاطع | حداقل فاصله آزاد "+fmtSvg(clash.minimumClearDistanceMm)+" mm":"هشدار برخورد: "+clash.conflictPairs+" جفت | "+(clash.criticalPair?.tieBar||"شناژ")+" ↔ "+(clash.criticalPair?.footingBar||"شبکه پی"))
   :(clash?.reason||"کنترل برخورد به داده‌های کامل نیاز دارد.");
  svg.push('<text x="500" y="840" text-anchor="middle" font-size="13" font-weight="bold" fill="'+(Number.isFinite(clash?.minimumClearDistanceMm)?(clash.ok?"#047857":"#b91c1c"):"#92400e")+'">'+esc(clashStatus)+'</text>');
  const projectIso=(x,y,z)=>{
   const a=rebarIsoView.angle,ca=Math.cos(a),sa=Math.sin(a),rx=x*ca-z*sa,rz=x*sa+z*ca;
   const sc=105*rebarIsoView.zoom;
   return{x:500+(rx-rz)*0.72*sc,y:940+(rx+rz)*0.34*sc-y*0.92*sc};
  };
  const isoLine=(p1,p2,color,width=3,dash="")=>{const a=projectIso(p1.x,p1.y,p1.z),b=projectIso(p2.x,p2.y,p2.z);svg.push('<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+color+'" stroke-width="'+width+'" '+(dash?'stroke-dasharray="'+dash+'"':'')+'/>');};
  const isoPoly=(pts,fill,stroke="#475569")=>{svg.push('<polygon points="'+pts.map(p=>{const q=projectIso(p.x,p.y,p.z);return q.x+","+q.y;}).join(" ")+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.5"/>');};
  const isoBox=(cx,cy,cz,sx,sy,sz,fill)=>{
   const x0=cx-sx/2,x1=cx+sx/2,z0=cz-sz/2,z1=cz+sz/2,y0=cy-sy,y1=cy;
   isoPoly([{x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y0,z:z1},{x:x0,y:y0,z:z1}],fill);
   isoPoly([{x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y1,z:z0},{x:x0,y:y1,z:z0}],"#cbd5e1");
   isoPoly([{x:x1,y:y0,z:z0},{x:x1,y:y0,z:z1},{x:x1,y:y1,z:z1},{x:x1,y:y1,z:z0}],"#94a3b8");
  };
  const isoRoute=selectedRoute?footingsAlongStraightRoute(model.nodes||[],selectedRoute):{ok:false};
  if(selectedBase&&selectedRoute&&isoRoute.ok&&B>0&&L>0&&T>0&&tie&&tie.count!==null){
   const routeFootings=isoRoute.footings,firstNode=routeFootings[0].node,lastNode=routeFootings[routeFootings.length-1].node;
   const dx=Number(lastNode.x)-Number(firstNode.x),dz=Number(lastNode.z)-Number(firstNode.z),routeLen=Math.hypot(dx,dz);
   const ux=dx/routeLen,uz=dz/routeLen,vx=uz,vz=-ux,beamW=tie.width||Number(state.tieWidthM)||0.6,beamH=tie.height||Number(state.tieHeightM)||0.5;
   const pA={x:Number(firstNode.x),y:Number(firstNode.y),z:Number(firstNode.z)},pB={x:Number(lastNode.x),y:Number(lastNode.y),z:Number(lastNode.z)};
   const drawFoot=(node)=>{
    const spec=footingSpecFor({nodeId:node.id,kind:node.kind}),p={x:Number(node.x),y:Number(node.y),z:Number(node.z)};
    isoBox(p.x,p.y,p.z,spec.width,spec.thickness,spec.length,"#cbd5e1");
    if(cover!==null&&Number.isFinite(cover)&&cover>=0){const grid=buildFootingRebarGeometry([{nodeId:String(node.id),x:p.x,y:p.y,z:p.z}],spec.width,spec.length,spec.thickness,cover,footingSpecs.specs);if(grid.ok)grid.bars.forEach(bar=>isoLine(bar.a,bar.b,bar.layer==="bottom"?"#dc2626":"#2563eb",2));}
   };
   routeFootings.forEach(x=>drawFoot(x.node));
   const firstSpec=footingSpecFor({nodeId:firstNode.id,kind:firstNode.kind}),lastSpec=footingSpecFor({nodeId:lastNode.id,kind:lastNode.kind});
   const firstProjection=(Math.abs(ux)*firstSpec.width+Math.abs(uz)*firstSpec.length)/2,lastProjection=(Math.abs(ux)*lastSpec.width+Math.abs(uz)*lastSpec.length)/2;
   const start={x:pA.x+ux*firstProjection,y:pA.y,z:pA.z+uz*firstProjection},end={x:pB.x-ux*lastProjection,y:pB.y,z:pB.z-uz*lastProjection};
   const corners=[
    {x:start.x+vx*beamW/2,y:start.y,z:start.z+vz*beamW/2},
    {x:end.x+vx*beamW/2,y:end.y,z:end.z+vz*beamW/2},
    {x:end.x-vx*beamW/2,y:end.y,z:end.z-vz*beamW/2},
    {x:start.x-vx*beamW/2,y:start.y,z:start.z-vz*beamW/2}
   ];
   const top=corners.map(p=>({x:p.x,y:p.y,z:p.z}));
   const bot=corners.map(p=>({x:p.x,y:p.y-beamH,z:p.z}));
   isoPoly(top,"#dbeafe");for(let j=0;j<4;j++)isoPoly([top[j],top[(j+1)%4],bot[(j+1)%4],bot[j]],"#cbd5e1");
   const tieSettingsForIso=window.SteelTieBeamReinforcement?.getData?.()?.settings||{};const cov=(Number(tieSettingsForIso.coverMm)||40)/1000,barYtop=start.y-cov,barYbot=start.y-beamH+cov;
   for(let k=0;k<tie.count;k++){
    const off=(tie.count===1?0:(k/(tie.count-1)-0.5)*(beamW-2*cov));
    for(const yy of [barYtop,barYbot])isoLine({x:start.x+vx*off,y:yy,z:start.z+vz*off},{x:end.x+vx*off,y:yy,z:end.z+vz*off},"#dc2626",3);
   }
   const spacing=(Number(selectedRoute.reinforcement?.stirrupSpacingMm)||200)/1000,n=Math.min(35,Math.max(2,Math.floor(Math.hypot(pB.x-pA.x,pB.z-pA.z)/Math.max(spacing,0.05))+1));
   for(let i=0;i<n;i++){
    const t=i/(n-1),cx=start.x+(end.x-start.x)*t,cz=start.z+(end.z-start.z)*t,yy=start.y-cov;
    const q=[{x:cx+vx*(beamW/2-cov),y:yy,z:cz+vz*(beamW/2-cov)},{x:cx+vx*(beamW/2-cov),y:yy-beamH+2*cov,z:cz+vz*(beamW/2-cov)},{x:cx-vx*(beamW/2-cov),y:yy-beamH+2*cov,z:cz-vz*(beamW/2-cov)},{x:cx-vx*(beamW/2-cov),y:yy,z:cz-vz*(beamW/2-cov)}];
    for(let j=0;j<4;j++)isoLine(q[j],q[(j+1)%4],"#0f766e",2);
   }
   if(clash?.criticalPair?.tiePoint&&clash?.criticalPair?.footingPoint){
    const cp=clash.criticalPair,ta=projectIso(cp.tiePoint.x,cp.tiePoint.y,cp.tiePoint.z),fb=projectIso(cp.footingPoint.x,cp.footingPoint.y,cp.footingPoint.z),mc=cp.clearDistanceMm<0?"#dc2626":"#d97706";
    svg.push('<line x1="'+ta.x+'" y1="'+ta.y+'" x2="'+fb.x+'" y2="'+fb.y+'" stroke="'+mc+'" stroke-width="4" stroke-dasharray="5 3"/>');
    [ta,fb].forEach(q=>svg.push('<circle cx="'+q.x+'" cy="'+q.y+'" r="9" fill="#fff" stroke="'+mc+'" stroke-width="3"/>'));
    svg.push('<text x="'+Math.min(900,Math.max(100,(ta.x+fb.x)/2+18))+'" y="'+Math.max(875,(ta.y+fb.y)/2-14)+'" font-size="12" font-weight="bold" fill="'+mc+'">نزدیک‌ترین فاصله: '+fmtSvg(cp.clearDistanceMm)+' mm</text>');
   }
   svg.push('<text x="500" y="1060" text-anchor="middle" font-size="12" fill="#334155">پی‌های مسیر: '+routeFootings.length+' عدد | شبکه پی: '+(mode==="default"?"پیش‌فرض":"داده طراحی")+' | قفس شناژ: '+tie.count+' میلگرد بالا و '+tie.count+' پایین</text>');
  }else{
   svg.push('<text x="500" y="940" text-anchor="middle" font-size="16" fill="#64748b">برای نمای سه‌بعدی، دو گره مسیر، ابعاد پی و داده آرماتور معتبر لازم است.</text>');
  }

  svg.push('<text x="500" y="785" text-anchor="middle" font-size="11" fill="#64748b">ترسیم شماتیک؛ بدون خم، قلاب، وصله، مهاری و کنترل نهایی اجرایی. فاصله خاموت 200 میلی‌متر در حالت پیش‌فرض موقت است.</text>');
  svg.push('</svg>');
  host.innerHTML=isoControls+svg.join("");
  host.querySelectorAll("[data-iso]").forEach(btn=>btn.addEventListener("click",()=>{
   const action=btn.getAttribute("data-iso");
   if(action==="left")rebarIsoView.angle-=Math.PI/12;
   if(action==="right")rebarIsoView.angle+=Math.PI/12;
   if(action==="in")rebarIsoView.zoom=Math.min(1.8,rebarIsoView.zoom*1.15);
   if(action==="out")rebarIsoView.zoom=Math.max(0.55,rebarIsoView.zoom/1.15);
   if(action==="reset")rebarIsoView={angle:0,zoom:1};
   renderRebarDrawing();
  }));
  const footingLabel=footingSpecs.specs.length?footingSpecs.specs.map(s=>(s.layer==="bottom"?"تحتانی":"فوقانی")+" "+s.direction+" Ø"+s.diaMm+" @"+fmtSvg(s.spacingMm)).join("؛ "):"شبکه فونداسیون موجود نیست";
  const tieLabel=tie?(tie.count===null?"خروجی طراحی شناژ موجود نیست":tie.route.id+": "+tie.count+" بالا و "+tie.count+" پایین Ø"+tie.dia+"، خاموت Ø"+(tie.stirrupDia||10)):"شناژ ثبت نشده";
  const clashLabel=Number.isFinite(clash.minimumClearDistanceMm)?(clash.ok?"کنترل هندسی تمام پی‌های مسیر: بدون تقاطع؛ حداقل فاصله آزاد "+fmtSvg(clash.minimumClearDistanceMm)+" mm ("+clash.footingCount+" پی، "+clash.pairsChecked+" جفت میلگرد).":"هشدار: "+clash.conflictPairs+" جفت میلگرد دارای تقاطع/فاصله ناکافی در "+(clash.footingCount||0)+" پی؛ زوج بحرانی "+(clash.criticalPair?.tieBar||"شناژ")+" و "+(clash.criticalPair?.footingBar||"شبکه پی")):(clash.reason||"کنترل برخورد انجام نشد.");
  summary.textContent=(mode==="default"?"حالت پیش‌فرض اجرایی؛ ":"حالت طراحی؛ ")+"پی انتخابی "+(selectedBase?baseId(selectedBase):"نامشخص")+" | "+footingLabel+" | "+tieLabel+" | "+footingSpecs.basis+" | "+clashLabel+(cover===null?" پوشش بتن وارد نشده؛ میلگردهای پی در نمای سه‌بعدی رسم نشده‌اند.":"")+(missing.length?" هشدار: "+missing.join(" "):"");
 }

 function getData(){readInputs();return JSON.parse(JSON.stringify({...state,footingSchedule}));}
 function setData(d){if(!d||typeof d!=="object")return;footingSchedule=d.footingSchedule&&typeof d.footingSchedule==="object"?JSON.parse(JSON.stringify(d.footingSchedule)):{};keys.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];const el=$(map[k]);if(el)el.value=state[k]??"";});if(!state.footingClass)state.footingClass="main";if(state.footingWidthM==="")state.footingWidthM="1.80";if(state.footingLengthM==="")state.footingLengthM="1.80";if(state.footingThicknessM==="")state.footingThicknessM="0.80";if(state.bottomBarDiaXmm==="")state.bottomBarDiaXmm="16";if(state.bottomBarSpacingXmm==="")state.bottomBarSpacingXmm="150";if(state.bottomBarDiaZmm==="")state.bottomBarDiaZmm="16";if(state.bottomBarSpacingZmm==="")state.bottomBarSpacingZmm="150";keys.forEach(k=>{const el=$(map[k]);if(el)el.value=state[k]??"";});}
 document.addEventListener("DOMContentLoaded",()=>{panel();$("ftClass")?.addEventListener("change",e=>applyFootingClass(e.target.value));});
 window.SteelFoundationTakeoff={getData,setData,extract,quantify,buildTieRouteTakeoff,buildTieRebarTakeoff,buildFootingRebarGeometry,footingGridSpecs,footingDatumGeometry,defaultFootingSpec,footingSpecFor,footingsAlongStraightRoute,calculateFootingRebar,applyFootingClass,checkTieBeamRebarClearance,checkSelectedTieFootingClash,renderRebarDrawing,normalizeBaseReactions,validateReactionCaseCoverage,selfTest,getLast:()=>lastReport?JSON.parse(JSON.stringify(lastReport)):null};
})();

/* ===== steel2/js/geotechnical-data-panel.js ===== */
/* SAHROUD STEEL — geotechnical report data capture and controlled transfer */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const fields=["reportReference","reportDate","reviewStatus","soilClass","allowableBearingKPa","allowableBasis","foundationEmbedmentM","groundwaterDepthM","soilUnitWeightKNm3","frictionAngleDeg","cohesionKPa","interfaceFrictionMu","soilModulusMPa","totalSettlementLimitMm","differentialSettlementLimitMm","notes"];
 const ids={reportReference:"geoReportRef",reportDate:"geoReportDate",reviewStatus:"geoReviewStatus",soilClass:"geoSoilClass",allowableBearingKPa:"geoAllowable",allowableBasis:"geoAllowableBasis",foundationEmbedmentM:"geoEmbedment",groundwaterDepthM:"geoGroundwater",soilUnitWeightKNm3:"geoUnitWeight",frictionAngleDeg:"geoPhi",cohesionKPa:"geoCohesion",interfaceFrictionMu:"geoMu",soilModulusMPa:"geoModulus",totalSettlementLimitMm:"geoTotalSettlement",differentialSettlementLimitMm:"geoDiffSettlement",notes:"geoNotes"};
 const defaults={reportReference:"",reportDate:"",reviewStatus:"not-reviewed",soilClass:"",allowableBearingKPa:"",allowableBasis:"unknown",foundationEmbedmentM:"",groundwaterDepthM:"",soilUnitWeightKNm3:"",frictionAngleDeg:"",cohesionKPa:"",interfaceFrictionMu:"",soilModulusMPa:"",totalSettlementLimitMm:"",differentialSettlementLimitMm:"",notes:""};
 let state={...defaults};
 function read(){fields.forEach(k=>{const el=$(ids[k]);if(el)state[k]=el.value;});}
 function persist(){try{localStorage.setItem("sahroudSteel.geotechnicalData.v1",JSON.stringify(state));}catch(e){}}
 function panel(){
  if($("geotechnicalDataPanel"))return;
  try{const x=JSON.parse(localStorage.getItem("sahroudSteel.geotechnicalData.v1")||"null");if(x&&typeof x==="object")state={...state,...x};}catch(e){}
  const root=$("foundationTakeoffPanel")||$("costEstimatePanel");if(!root)return;
  const p=document.createElement("section");p.className="panel";p.id="geotechnicalDataPanel";p.setAttribute("data-focus-group","foundation geotechnical");
  p.innerHTML='<div class="panel-title"><h3>پرونده ژئوتکنیک و مشخصات خاک</h3><span class="status">ورودی از گزارش خاک</span></div>'+
   '<div class="notice">هیچ مقدار ژئوتکنیکی پیش‌فرض نشده است. اعداد باید عیناً از گزارش مکانیک خاک و با توجه به تراز پی، سطح آب، نوع بارگذاری و شرایط اجرایی وارد شوند. ظرفیت باربری ناخالص و خالص قابل جایگزینی مستقیم نیستند؛ مقدار خالص به‌صورت خودکار به ناخالص تبدیل نمی‌شود.</div>'+
   '<h4>مشخصات و اعتبار گزارش</h4><div class="form-grid">'+
   '<div class="field"><label for="geoReportRef">شماره / مرجع گزارش</label><input id="geoReportRef" type="text" placeholder="شماره گزارش یا نام آزمایشگاه"></div>'+
   '<div class="field"><label for="geoReportDate">تاریخ گزارش</label><input id="geoReportDate" type="date"></div>'+
   '<div class="field"><label for="geoReviewStatus">وضعیت بررسی گزارش</label><select id="geoReviewStatus"><option value="not-reviewed">بررسی مهندس نشده</option><option value="reviewed">توسط مهندس مسئول بررسی شده</option><option value="missing">گزارش در دسترس نیست</option></select></div>'+
   '<div class="field"><label for="geoSoilClass">شرح لایه خاک در تراز پی</label><input id="geoSoilClass" type="text" placeholder="طبق گزارش ژئوتکنیک"></div></div>'+
   '<h4>ظرفیت باربری و شرایط خاک</h4><div class="form-grid">'+
   '<div class="field"><label for="geoAllowable">ظرفیت باربری مجاز (kPa)</label><input id="geoAllowable" type="number" min="0" step="1" placeholder="از گزارش"></div>'+
   '<div class="field"><label for="geoAllowableBasis">مبنای ظرفیت باربری</label><select id="geoAllowableBasis"><option value="unknown">نامشخص</option><option value="gross">ناخالص (Gross)</option><option value="net">خالص (Net)</option></select></div>'+
   '<div class="field"><label for="geoEmbedment">عمق استقرار زیر پی از سطح زمین (m)</label><input id="geoEmbedment" type="number" min="0" step="0.05"></div>'+
   '<div class="field"><label for="geoGroundwater">عمق سطح آب زیرزمینی از سطح زمین (m)</label><input id="geoGroundwater" type="number" min="0" step="0.1" placeholder="اگر وجود ندارد، طبق گزارش مشخص شود"></div>'+
   '<div class="field"><label for="geoUnitWeight">وزن مخصوص خاک (kN/m³)</label><input id="geoUnitWeight" type="number" min="0" step="0.1"></div>'+
   '<div class="field"><label for="geoPhi">زاویه اصطکاک داخلی φ (درجه)</label><input id="geoPhi" type="number" min="0" max="60" step="0.5"></div>'+
   '<div class="field"><label for="geoCohesion">چسبندگی خاک c (kPa)</label><input id="geoCohesion" type="number" min="0" step="1"></div>'+
   '<div class="field"><label for="geoMu">ضریب اصطکاک تماس بتن و خاک μ</label><input id="geoMu" type="number" min="0" step="0.01" placeholder="مقدار تماس گزارش‌شده؛ نه tan φ خودکار"></div>'+
   '<div class="field"><label for="geoModulus">مدول تغییرشکل / الاستیسیته خاک (MPa)</label><input id="geoModulus" type="number" min="0" step="0.1"></div></div>'+
   '<h4>معیارهای نشست</h4><div class="form-grid">'+
   '<div class="field"><label for="geoTotalSettlement">حد مجاز نشست کل (mm)</label><input id="geoTotalSettlement" type="number" min="0" step="1"></div>'+
   '<div class="field"><label for="geoDiffSettlement">حد مجاز نشست نسبی / تفاضلی (mm)</label><input id="geoDiffSettlement" type="number" min="0" step="1"></div>'+
   '<div class="field" style="grid-column:1/-1"><label for="geoNotes">یادداشت‌ها و شرایط خاص گزارش</label><textarea id="geoNotes" rows="3" placeholder="لایه‌بندی، خاک دستی، خطر روانگرایی، توصیه‌های اجرایی و..."></textarea></div></div>'+
   '<div class="button-grid"><button id="btnGeoSave" class="btn primary" type="button">ذخیره پرونده ژئوتکنیک</button><button id="btnGeoTransfer" class="btn secondary" type="button">انتقال داده‌های قابل استفاده به محاسبات پی</button></div>'+
   '<div id="geoSummary" class="notice">پرونده ژئوتکنیک هنوز تکمیل نشده است.</div>';
  root.parentNode.insertBefore(p,root.nextSibling);
  fields.forEach(k=>{const el=$(ids[k]);el.value=state[k]??"";el.addEventListener("change",()=>{read();persist();});});
  $("btnGeoSave").addEventListener("click",()=>{read();persist();renderSummary();});
  $("btnGeoTransfer").addEventListener("click",transfer);
  renderSummary();
 }
 function renderSummary(){
  const el=$("geoSummary");if(!el)return;
  read();
  const issues=[];
  if(!String(state.reportReference||"").trim())issues.push("مرجع گزارش ثبت نشده");
  if(state.reviewStatus!=="reviewed")issues.push("گزارش هنوز بررسی‌شده علامت نخورده");
  if(!(Number(state.allowableBearingKPa)>0))issues.push("ظرفیت باربری معتبر وارد نشده");
  if(state.allowableBasis!=="gross"&&state.allowableBearingKPa!=="")issues.push("مبنای ظرفیت ناخالص نیست یا نامشخص است");
  if(state.groundwaterDepthM==="")issues.push("وضعیت عمق آب زیرزمینی ثبت نشده");
  el.textContent="وضعیت پرونده: "+(issues.length?"نیازمند تکمیل/بررسی — "+issues.join("؛ "):"اطلاعات پایه ثبت شده است؛ صحت اعداد همچنان وابسته به گزارش اصلی است.")+".";
 }
 function transfer(){
  read();persist();
  const current=window.SteelFoundationTakeoff?.getData?.();
  if(!current){$("geoSummary").textContent="ماژول فونداسیون در دسترس نیست؛ صفحه را دوباره بارگذاری کنید.";return;}
  const next={...current},transferred=[],blocked=[];
  const qa=Number(state.allowableBearingKPa),gamma=Number(state.soilUnitWeightKNm3),mu=Number(state.interfaceFrictionMu);
  if(qa>0&&state.allowableBasis==="gross"){next.soilAllowableKPa=String(qa);transferred.push("ظرفیت باربری ناخالص");}
  else if(state.allowableBearingKPa!=="")blocked.push("ظرفیت باربری خالص/نامشخص منتقل نشد");
  if(gamma>0){next.soilUnitWeightKNm3=String(gamma);transferred.push("وزن مخصوص خاک (برای خاک پوششی، در صورت تطابق نوع خاک)");}
  if(mu>0){next.slidingFrictionMu=String(mu);transferred.push("ضریب اصطکاک تماس");}
  window.SteelFoundationTakeoff.setData(next);
  window.SteelFoundationTakeoff.quantify?.();
  const review=state.reviewStatus==="reviewed"?"وضعیت گزارش: بررسی‌شده توسط کاربر علامت خورده":"هشدار: گزارش هنوز بررسی‌شده علامت نخورده است";
  $("geoSummary").textContent=review+" | منتقل شد: "+(transferred.join("، ")||"هیچ داده‌ای")+(blocked.length?" | منتقل نشد: "+blocked.join("، "):"")+". تاریخ/عمق استقرار/نشست/پارامترهای مقاومت هنوز در کنترل‌های طراحی استفاده نشده‌اند.";
 }
 function getData(){read();return JSON.parse(JSON.stringify(state));}
 function setData(d){if(!d||typeof d!=="object")return;state={...defaults,...d};persist();fields.forEach(k=>{const el=$(ids[k]);if(el)el.value=state[k]??"";});renderSummary();}
 document.addEventListener("DOMContentLoaded",panel);
 window.SteelGeotechnicalData={getData,setData,transfer};
})();

/* ===== steel2/js/tie-beam-layout.js ===== */
/* SAHROUD STEEL - Explicit concrete tie-beam layout and end-joint registry.
 * Geometry and joint assumptions are stored; no solver activation until releases/details are verified.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id),num=v=>Number.isFinite(Number(v))?Number(v):NaN;
let state={schemaVersion:3,material:{},reinforcement:{stirrupDiaMm:10,passThroughFootings:true,extendToLastFootingOuterFace:true,standardEndHook:true},routes:[]};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3});
function bases(){return(window.SteelStructuralModel?.getData?.()?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base");}
function label(n){return n.id+" — X:"+fmt(n.x)+"، Z:"+fmt(n.z)+" متر";}
function sync(){
 const a=$("tieRouteStart"),b=$("tieRouteEnd");if(!a||!b)return;const ns=bases(),oa=a.value,ob=b.value;
 const opts='<option value="">انتخاب گره پایه</option>'+ns.map(n=>'<option value="'+n.id+'">'+label(n)+'</option>').join("");
 a.innerHTML=opts;b.innerHTML=opts;if(ns.some(n=>n.id===oa))a.value=oa;if(ns.some(n=>n.id===ob))b.value=ob;
 a.disabled=b.disabled=ns.length<2;$("tieNodeCount").textContent="گره‌های پایه قابل انتخاب: "+ns.length;
}
function material(){return{widthM:num($("tieWidthM")?.value),heightM:num($("tieHeightM")?.value),fcMPa:num($("tieFcMPa")?.value),E_GPa:num($("tieEGPa")?.value),G_GPa:num($("tieGGPa")?.value),densityKNm3:num($("tieDensity")?.value)};}
function reinforcement(){const opt=id=>{const v=$(id)?.value;if(v==null||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};return{longitudinalBarCount:opt("tieLongBarCount"),longitudinalBarDiaMm:opt("tieLongBarDiaMm"),stirrupDiaMm:opt("tieStirrupDiaMm")||10,stirrupSpacingMm:opt("tieStirrupSpacingMm"),passThroughFootings:true,extendToLastFootingOuterFace:true,standardEndHook:true,anchorageNote:"میلگردهای طولی شناژ از داخل فونداسیون‌ها عبور کنند و تا وجه بیرونی آخرین فونداسیون ادامه یابند؛ انتهای میلگردهای طولی با قلاب استاندارد مهار شود. خاموت‌های قطر ۱۰ میلی‌متر در طول شناژ طبق فاصله محاسباتی اجرا شوند و عبور خاموت از داخل پی فرض نشده است. طول مهاری، شکل و زاویه قلاب باید طبق ضوابط و نقشه اجرایی کنترل شود."};}
function check(m){for(const[k,n]of Object.entries({widthM:"عرض شناژ",heightM:"ارتفاع شناژ",fcMPa:"مقاومت بتن",E_GPa:"مدول E بتن",G_GPa:"مدول G بتن",densityKNm3:"وزن مخصوص بتن"}))if(!(m[k]>0&&Number.isFinite(m[k])))throw Error("مقدار واقعی "+n+" را وارد کنید.");}
function rectangleProperties(m,axis){
 check(m);
 const b=m.widthM,h=m.heightM;
 // Rectangular Saint-Venant torsion constant; b is the shorter side.
 const short=Math.min(b,h),long=Math.max(b,h),r=short/long;
 const J=long*Math.pow(short,3)*(1/3-0.21*r*(1-Math.pow(r,4)/12));
 // The solver local axes put global vertical in local y for X beams and local z for Z beams.
 const Iy=axis==="X"?h*Math.pow(b,3)/12:b*Math.pow(h,3)/12;
 const Iz=axis==="X"?b*Math.pow(h,3)/12:h*Math.pow(b,3)/12;
 return{E:m.E_GPa*1e9,G:m.G_GPa*1e9,A:b*h,Iy,Iz,J,axis,assumption:"مقطع مستطیلی؛ محور عمق قائم؛ J تقریبی سنت‌ونان"};
}
function audit(){
 const ns=new Map(bases().map(n=>[n.id,n]));
 let valid=0,invalid=0,totalLength=0,totalVolume=0,totalWeight=0;
 const rows=state.routes.map(r=>{
  const a=ns.get(r.start),b=ns.get(r.end);let reasons=[];
  if(!a||!b)reasons.push("گره در مدل فعلی پیدا نشد");
  if(r.startJoint==="unknown"||r.endJoint==="unknown")reasons.push("نوع اتصال دو سر کامل تعیین نشده");
  let axis=null,L=0;
  if(a&&b){
   L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
   if(Math.abs(b.y-a.y)>0.01)reasons.push("تراز دو گره بیش از 10 میلی‌متر اختلاف دارد");
   const dx=Math.abs(b.x-a.x),dz=Math.abs(b.z-a.z);
   if(dx<0.001&&dz<0.001)reasons.push("فاصله افقی مسیر تقریباً صفر است");
   else if(dx>0.001&&dz>0.001)reasons.push("مسیر مورب در پلان است؛ فعلاً فقط مسیر موازی محور X یا Z پذیرفته می‌شود");
   else axis=dx>dz?"X":"Z";
  }
  let p=null,V=0,W=0;
  try{p=rectangleProperties(r,axis||"X");if(a&&b){V=L*r.widthM*r.heightM;W=V*r.densityKNm3;}}catch(e){reasons.push(e.message);}
  const ok=reasons.length===0;
  if(ok){valid++;totalLength+=L;totalVolume+=V;totalWeight+=W;}else invalid++;
  const reinf=r.reinforcement||state.reinforcement;const detailingWarnings=[];if(!reinf?.longitudinalBarCount)detailingWarnings.push("تعداد میلگرد طولی هنوز از طراحی/نقشه وارد نشده است");if(!reinf?.longitudinalBarDiaMm)detailingWarnings.push("قطر میلگرد طولی هنوز از طراحی/نقشه وارد نشده است");if(!reinf?.stirrupSpacingMm)detailingWarnings.push("فاصله خاموت‌ها باید با کنترل برش و ضوابط تعیین شود");return{id:r.id,start:r.start,end:r.end,axis,lengthM:L,volumeM3:V,selfWeightKN:W,section:p,reinforcement:reinf,detailingWarnings,valid:ok,reasons};
 });
 return{schemaVersion:1,validCount:valid,invalidCount:invalid,totalLengthM:totalLength,totalConcreteM3:totalVolume,totalSelfWeightKN:totalWeight,rows,solverActive:false,solverEligibleCount:valid,note:"این ممیزی هندسی/مقطعی است. مسیرهای معتبر پس از مونتاژ تحلیل، در گره‌های پایه میانی به قطعات پیوسته تقسیم و سختی/وزن بتن آن‌ها در تحلیل سه‌بعدی لحاظ می‌شود؛ solverActive فقط پس از اجرای تحلیل قابل گزارش است."};
}
function jointLabel(v){return v==="rigid"?"گیردار/یکپارچه":v==="pinned"?"مفصلی": "نامشخص";}
function render(){
 const host=$("tieRoutesTable");if(!host)return;const ns=new Map(bases().map(n=>[n.id,n]));
 if(!state.routes.length){host.innerHTML='<p class="geometry-hint">هنوز مسیری تعریف نشده است.</p>';$("tieRouteSummary").textContent="";return;}
 host.innerHTML='<div class="table-wrap"><table><thead><tr><th>شناژ</th><th>مسیر</th><th>طول (m)</th><th>مقطع (m)</th><th>حجم (m³)</th><th>اتصال ابتدا/انتها</th><th></th></tr></thead><tbody>'+
 state.routes.map((r,i)=>{const a=ns.get(r.start),b=ns.get(r.end),L=a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z):0,V=L*r.widthM*r.heightM;return'<tr><td>'+(i+1)+'</td><td>'+r.start+' ← '+r.end+'</td><td>'+fmt(L)+'</td><td>'+fmt(r.widthM)+' × '+fmt(r.heightM)+'</td><td>'+fmt(V)+'</td><td>'+jointLabel(r.startJoint)+' / '+jointLabel(r.endJoint)+'</td><td><button type="button" class="btn secondary" data-rm="'+i+'">حذف</button></td></tr>';}).join("")+'</tbody></table></div>';
 host.querySelectorAll("[data-rm]").forEach(x=>x.addEventListener("click",()=>{state.routes.splice(+x.dataset.rm,1);render();save();}));
 const volume=state.routes.reduce((s,r)=>{const a=ns.get(r.start),b=ns.get(r.end);return s+(a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*r.widthM*r.heightM:0);},0);
 const unresolved=state.routes.filter(r=>r.startJoint==="unknown"||r.endJoint==="unknown").length;
 $("tieRouteSummary").textContent="مسیرها: "+state.routes.length+" | حجم هندسی بتن: "+fmt(volume)+" مترمکعب | مسیر دارای اتصال نامشخص: "+unresolved+".";
}
function save(){try{localStorage.setItem("sahroudSteelTieBeamLayout",JSON.stringify(state));}catch(e){}window.SteelProject?.scheduleAutoSave?.();}
function add(){
 try{const start=$("tieRouteStart").value,end=$("tieRouteEnd").value,ns=bases(),a=ns.find(n=>n.id===start),b=ns.find(n=>n.id===end);if(!a||!b||start===end)throw Error("دو گره پایه متفاوت انتخاب کنید.");
 const m=material();check(m);if(state.routes.some(r=>(r.start===start&&r.end===end)||(r.start===end&&r.end===start)))throw Error("این مسیر قبلاً ثبت شده است.");
 const startJoint=$("tieStartJoint").value,endJoint=$("tieEndJoint").value;
 state.material=m;state.reinforcement=reinforcement();state.routes.push({id:"TB"+(state.routes.length+1),start,end,startJoint,endJoint,reinforcement:{...state.reinforcement},...m});render();save();
 $("tieRouteMessage").textContent="مسیر ثبت شد؛ طول "+fmt(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z))+" متر. اتصال و بازوی صلب قائم در مدل سه‌بعدی اعمال می‌شوند؛ نتایج نهایی نیازمند کنترل مستقل مهندسی هستند.";
 }catch(e){$("tieRouteMessage").textContent=e.message;}
}
function mount(){
 if($("tieBeamLayoutPanel"))return;const anchor=$("foundationTakeoffPanel")||$("shedLayoutPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="tieBeamLayoutPanel";
 p.innerHTML='<div class="panel-title"><h3>تعریف مسیر و مشخصات شناژهای بتنی</h3><span class="status">ورودی هندسی مستقل</span></div><div class="notice">مسیر هر شناژ را بین دو گره پایه واقعی انتخاب کنید. اتصال ابتدا و انتها به‌صورت پیش‌فرض گیردار/یکپارچه انتخاب شده است؛ این فرض فقط با تأیید بتن‌ریزی پیوسته، مهاری آرماتورها و جزئیات اجرایی معتبر است. گزینه نامشخص مانع فعال‌شدن تحلیل شناژ خواهد بود. اگر مسیر از روی گره‌های پایه میانی عبور کند، در تحلیل به چند قطعه متصل تقسیم می‌شود تا پیوستگی شناژ در محل فونداسیون‌های میانی حفظ شود.</div><div class="form-grid">'+
 [['tieWidthM','عرض مقطع شناژ (m)',0.60],['tieHeightM','ارتفاع مقطع شناژ (m)',0.50],['tieFcMPa',"مقاومت مشخصه بتن f\\'c (MPa)",25],['tieEGPa','مدول الاستیسیته E بتن (GPa)',23.5],['tieGGPa','مدول برشی G بتن (GPa)',9.8],['tieDensity','وزن مخصوص بتن (kN/m³)',25]].map(([id,l,v])=>'<div class="field"><label for="'+id+'">'+l+'</label><input id="'+id+'" type="number" min="0.01" step="0.1" value="'+v+'" placeholder="مقدار مستند از نقشه/مشخصات"></div>').join("")+
 '</div><div class="form-grid"><div class="field"><label for="tieLongBarCount">تعداد میلگرد طولی (عدد؛ از نقشه تعیین شود)</label><input id="tieLongBarCount" type="number" min="1" step="1" placeholder="طبق طراحی"></div><div class="field"><label for="tieLongBarDiaMm">قطر میلگرد طولی (mm؛ از نقشه تعیین شود)</label><input id="tieLongBarDiaMm" type="number" min="8" step="2" placeholder="طبق طراحی"></div><div class="field"><label for="tieStirrupDiaMm">قطر خاموت (mm)</label><input id="tieStirrupDiaMm" type="number" min="6" step="1" value="10"></div><div class="field"><label for="tieStirrupSpacingMm">فاصله خاموت‌ها (mm؛ محاسباتی)</label><input id="tieStirrupSpacingMm" type="number" min="50" step="10" placeholder="پس از کنترل برش و ضوابط"></div></div><div class="notice">پیش‌فرض پیشنهادی: مقطع 60×50 سانتی‌متر، بتن 25 مگاپاسکال، E=23.5 و G=9.8 گیگاپاسکال، وزن مخصوص 25 کیلونیوتن بر مترمکعب و خاموت قطر 10 میلی‌متر. تعداد و قطر میلگردهای طولی و فاصله خاموت‌ها عمداً بدون محاسبه/نقشه تعیین نشده‌اند.</div><div class="notice">جزئیات آرماتورگذاری: میلگردهای طولی شناژ از داخل فونداسیون عبور داده شوند و تا وجه بیرونی آخرین فونداسیون ادامه یابند؛ انتهای آن‌ها با قلاب استاندارد مهار شود. خاموت‌های قطر ۱۰ میلی‌متر در طول شناژ با فاصله محاسباتی قرار می‌گیرند؛ عبور خاموت از داخل پی در این فرض منظور نشده است. طول مهاری، پوشش بتن، شکل/زاویه قلاب، تداخل میلگردها و امکان بتن‌ریزی باید جداگانه کنترل شوند.</div><div class="button-grid"><button type="button" class="btn secondary" id="btnApplyTieDefaults">بازگردانی پیش‌فرض‌های پیشنهادی</button><button type="button" class="btn secondary" id="btnRefreshTieNodes">به‌روزرسانی گره‌های پایه</button></div><div id="tieNodeCount" class="geometry-hint"></div><div class="form-grid"><div class="field"><label for="tieRouteStart">گره شروع شناژ</label><select id="tieRouteStart"></select></div><div class="field"><label for="tieRouteEnd">گره پایان شناژ</label><select id="tieRouteEnd"></select></div><div class="field"><label for="tieStartJoint">نوع اتصال ابتدای شناژ</label><select id="tieStartJoint"><option value="rigid" selected>گیردار/یکپارچه (پیش‌فرض پیشنهادی؛ نیازمند تأیید جزئیات)</option><option value="unknown">نامشخص ـ نیازمند نقشه</option><option value="pinned">مفصلی ـ فقط با جزئیات انتقال برش/نیرو</option></select></div><div class="field"><label for="tieEndJoint">نوع اتصال انتهای شناژ</label><select id="tieEndJoint"><option value="rigid" selected>گیردار/یکپارچه (پیش‌فرض پیشنهادی؛ نیازمند تأیید جزئیات)</option><option value="unknown">نامشخص ـ نیازمند نقشه</option><option value="pinned">مفصلی ـ فقط با جزئیات انتقال برش/نیرو</option></select></div></div><div class="button-grid"><button type="button" class="btn primary" id="btnAddTieRoute">ثبت مسیر شناژ</button></div><div id="tieRouteMessage" class="notice">مشخصات واقعی مقطع و اتصال‌ها را وارد کنید.</div><div id="tieRoutesTable"></div><div id="tieRouteSummary" class="notice"></div><div class="button-grid"><button type="button" class="btn secondary" id="btnAuditTieRoutes">ممیزی هندسه و محاسبه مشخصات مقطع</button></div><pre id="tieAuditOutput" class="result-box">ممیزی هنوز اجرا نشده است.</pre><div class="notice">شناژهای بتنی فقط پس از ممیزی هندسی و انتخاب صریح نوع اتصال در مدل تحلیل سه‌بعدی وارد می‌شوند؛ اتصال نامشخص یا مسیر نامعتبر از تحلیل حذف می‌شود. سختی با مقطع ناخالص و ترک‌نخورده مدل می‌شود و وزن مخصوص بتن واردشده فقط یک‌بار در حالت مرده/ترکیبات دارای ضریب D اضافه می‌شود. این مدل هنوز اثر ترک‌خوردگی، آرماتور، اندرکنش فونداسیون و خاک، دوران‌پذیری اتصال و کنترل ظرفیت مهاری را محاسبه نمی‌کند.</div>';
 p.insertAdjacentHTML("beforeend",'<div class="notice"><strong>مرجع تصویری اتصال شناژ و پی ـ نمای دوبعدی و سه‌بعدی</strong><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:10px"><div style="border:1px solid var(--border);border-radius:10px;padding:8px"><b>۱) مقطع دوبعدی طولی</b><svg viewBox="0 0 420 220" style="width:100%;height:auto" role="img" aria-label="مقطع دوبعدی پی و شناژ"><path d="M15 75H405" stroke="#d97706" stroke-width="2" stroke-dasharray="6 4"/><rect x="25" y="75" width="105" height="115" fill="#94a3b8" stroke="#334155" stroke-width="2"/><rect x="290" y="75" width="105" height="115" fill="#94a3b8" stroke="#334155" stroke-width="2"/><rect x="130" y="75" width="160" height="65" fill="#64748b" stroke="#334155" stroke-width="2"/><text x="210" y="112" fill="white" text-anchor="middle" font-size="13">شناژ</text><text x="77" y="135" fill="white" text-anchor="middle" font-size="12">پی</text><text x="342" y="135" fill="white" text-anchor="middle" font-size="12">پی</text><path d="M130 140H290" stroke="#f8fafc" stroke-dasharray="4 3"/><text x="210" y="58" fill="#b45309" text-anchor="middle" font-size="11">تراز مشترک رویه بالا</text><path d="M405 75V190M400 75H410M400 190H410" stroke="currentColor"/><text x="398" y="155" text-anchor="end" fill="currentColor" font-size="10">ضخامت پی</text><text x="210" y="207" text-anchor="middle" fill="currentColor" font-size="10">کف پی پایین‌تر از کف شناژ (در حالت نمونه)</text></svg></div><div style="border:1px solid var(--border);border-radius:10px;padding:8px"><b>۲) نمای سه‌بعدی مفهومی</b><svg viewBox="0 0 420 220" style="width:100%;height:auto" role="img" aria-label="نمای سه بعدی فونداسیون و شناژ"><g stroke="#334155" stroke-width="1.6"><polygon points="20,100 75,68 145,100 90,132" fill="#cbd5e1"/><polygon points="20,100 90,132 90,190 20,158" fill="#94a3b8"/><polygon points="90,132 145,100 145,158 90,190" fill="#64748b"/><polygon points="275,100 330,68 400,100 345,132" fill="#cbd5e1"/><polygon points="275,100 345,132 345,190 275,158" fill="#94a3b8"/><polygon points="345,132 400,100 400,158 345,190" fill="#64748b"/><polygon points="90,108 145,76 275,76 220,108" fill="#a8b5c4"/><polygon points="90,108 220,108 220,153 90,153" fill="#64748b"/><polygon points="220,108 275,76 275,121 220,153" fill="#475569"/></g><path d="M10 68H410" stroke="#d97706" stroke-dasharray="6 4"/><text x="210" y="48" fill="#b45309" text-anchor="middle" font-size="11">تراز مشترک بالا</text><text x="210" y="174" fill="white" text-anchor="middle" font-size="11">شناژ</text><text x="210" y="211" fill="currentColor" text-anchor="middle" font-size="10">نمای مفهومی، نه مدل سه‌بعدی اجرایی</text></svg></div></div><small>این دو تصویر شماتیک توضیحی‌اند؛ ابعاد واقعی از داده‌های پروژه خوانده می‌شوند. خروجی نقشه اجرایی باید شامل پلان محوربندی، مقاطع، کد ارتفاعی، میلگردها، مهاری، کاور، صفحه‌ستون و جدول لیستوفر باشد.</small></div>');
 anchor.parentNode.insertBefore(p,anchor.nextSibling);$("btnApplyTieDefaults").addEventListener("click",()=>{const d={tieWidthM:0.60,tieHeightM:0.50,tieFcMPa:25,tieEGPa:23.5,tieGGPa:9.8,tieDensity:25,tieStirrupDiaMm:10};Object.entries(d).forEach(([id,v])=>$(id).value=v);$("tieStartJoint").value="rigid";$("tieEndJoint").value="rigid";$("tieRouteMessage").textContent="پیش‌فرض‌های پیشنهادی اولیه اعمال شد؛ پیش از تحلیل باید با نقشه و مشخصات واقعی تطبیق داده شوند.";});$("btnRefreshTieNodes").addEventListener("click",sync);$("btnAddTieRoute").addEventListener("click",add);$("btnAuditTieRoutes").addEventListener("click",()=>{const r=audit();$("tieAuditOutput").textContent=JSON.stringify(r,null,2);});sync();render();
}
function getData(){return JSON.parse(JSON.stringify(state));}
function setData(d){if(!d||typeof d!=="object")return;state={schemaVersion:3,material:{...(d.material||{})},reinforcement:{stirrupDiaMm:10,passThroughFootings:true,extendToLastFootingOuterFace:true,standardEndHook:true,...(d.reinforcement||{})},routes:Array.isArray(d.routes)?d.routes.filter(r=>r&&r.start&&r.end).map(r=>({...r,startJoint:r.startJoint||"unknown",endJoint:r.endJoint||"unknown"})):[]};const m=state.material,f={tieWidthM:m.widthM,tieHeightM:m.heightM,tieFcMPa:m.fcMPa,tieEGPa:m.E_GPa,tieGGPa:m.G_GPa,tieDensity:m.densityKNm3,tieLongBarCount:state.reinforcement.longitudinalBarCount,tieLongBarDiaMm:state.reinforcement.longitudinalBarDiaMm,tieStirrupDiaMm:state.reinforcement.stirrupDiaMm,tieStirrupSpacingMm:state.reinforcement.stirrupSpacingMm};Object.entries(f).forEach(([id,v])=>{if($(id)&&v!=null)$(id).value=v;});sync();render();}
window.SteelTieBeamLayout={getData,setData,refresh:sync,audit,rectangleProperties};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();
