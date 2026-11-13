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
 const ids=new Set(nodes.map(n=>String(n.id)));
 p.beamNodes.forEach(n=>{if(ids.has(String(n.id)))throw Error("شناسه گره تیر حمال تکراری است: "+n.id);ids.add(String(n.id));nodes.push({...n,kind:"crane-runway-girder",proposalOnly:false});});
 const add=(id,start,end,type,section,rel,extra)=>members.push({id,start,end,type,sectionKey:type,analysisSection:{...section},endReleases:{i:rel.i.slice(),j:rel.j.slice()},craneIntegration:true,reference:extra.reference,connectionType:extra.connectionType,frameIndex:extra.frameIndex,side:extra.side,length:Math.hypot(nodes.find(n=>n.id===start).x-nodes.find(n=>n.id===end).x,nodes.find(n=>n.id===start).y-nodes.find(n=>n.id===end).y,nodes.find(n=>n.id===start).z-nodes.find(n=>n.id===end).z)});
 p.beamMembers.forEach(m=>add(m.id,m.start,m.end,"craneRunwayGirder",d.girderSection,girderRelease,{reference:d.geometrySource,connectionType:"girder-segment",frameIndex:null,side:m.side}));
 p.brackets.forEach(b=>add(b.id,b.columnNodeId,b.beamNodeId,"craneRunwayBracket",d.bracketSection,bracketRelease,{reference:d.connectionSource,connectionType:d.connectionType,frameIndex:b.frameIndex,side:b.side}));
 const out={...model,nodes,members,geometry:{...model.geometry,craneRunway:{...model.geometry.craneRunway,meshProposal:p,integrated3D:{ready:true,analysisEnabled:false,proposalOnly:false,addedNodeCount:p.beamNodes.length,addedGirderMemberCount:p.beamMembers.length,addedBracketMemberCount:p.brackets.length,connectionType:d.connectionType,geometrySource:d.geometrySource,connectionSource:d.connectionSource}}}};
 return {success:true,ready:true,analysisEnabled:false,issues:[],model:out,counts:{addedNodes:p.beamNodes.length,addedGirderMembers:p.beamMembers.length,addedBracketMembers:p.brackets.length}};
}
function readUI(){
 const el=root.document?.getElementById?.("crane3DIntegrationJson");
 if(!el||!String(el.value||"").trim())return {};
 try{return JSON.parse(el.value);}catch(e){return {parseError:String(e.message||e)};}
}
function setData(data){const el=root.document?.getElementById?.("crane3DIntegrationJson");if(el&&data&&typeof data==="object")el.value=JSON.stringify(data,null,2);}

function audit(model,input){const d=input||readUI();if(d.parseError)return {success:false,ready:false,analysisEnabled:false,issues:["JSON مشخصات تحلیل سه‌بعدی جرثقیل قابل خواندن نیست: "+d.parseError]};const r=prepare(model,d);return {...r,model:undefined};}
function integrate(model,input){return prepare(model,input||readUI());}
function selfTest(){
 const checks=[],t=(n,f)=>{try{checks.push({name:n,ok:!!f()});}catch(e){checks.push({name:n,ok:false,error:String(e.message||e)});}};
 const base={geometry:{span:12,frames:[0,6,12],craneRunway:{enabled:true,elevationM:5,axisOffsetM:.5}},nodes:[{id:"C1",x:0,y:5,z:0},{id:"C2",x:0,y:5,z:6},{id:"C3",x:0,y:5,z:12},{id:"R1",x:12,y:5,z:0},{id:"R2",x:12,y:5,z:6},{id:"R3",x:12,y:5,z:12}],members:[]};
 const p={geometryReady:true,beamNodes:[{id:"B1",x:-.5,y:5,z:0},{id:"B2",x:-.5,y:5,z:6},{id:"B3",x:-.5,y:5,z:12},{id:"B4",x:12.5,y:5,z:0},{id:"B5",x:12.5,y:5,z:6},{id:"B6",x:12.5,y:5,z:12}],beamMembers:[{id:"G1",start:"B1",end:"B2",side:"left"},{id:"G2",start:"B2",end:"B3",side:"left"},{id:"G3",start:"B4",end:"B5",side:"right"},{id:"G4",start:"B5",end:"B6",side:"right"}],brackets:[{id:"K1",columnNodeId:"C1",beamNodeId:"B1",frameIndex:1,side:"left"},{id:"K2",columnNodeId:"C2",beamNodeId:"B2",frameIndex:2,side:"left"},{id:"K3",columnNodeId:"C3",beamNodeId:"B3",frameIndex:3,side:"left"},{id:"K4",columnNodeId:"R1",beamNodeId:"B4",frameIndex:1,side:"right"},{id:"K5",columnNodeId:"R2",beamNodeId:"B5",frameIndex:2,side:"right"},{id:"K6",columnNodeId:"R3",beamNodeId:"B6",frameIndex:3,side:"right"}]};
 base.geometry.craneRunway.meshProposal=p;
 const sec={E_Pa:2e11,G_Pa:7.7e10,A_m2:.01,Iy_m4:1e-4,Iz_m4:2e-4,J_m4:1e-5,source:"drawing-01"};
 const input={girderSection:sec,bracketSection:sec,girderEndReleases:{i:[],j:[]},bracketEndReleases:{i:[],j:[]},connectionType:"moment",connectionSource:"D-02",geometrySource:"D-01"};
 const beforeN=base.nodes.length,beforeM=base.members.length,r=prepare(base,input);
 t("builds actual 3D beam and bracket elements",()=>r.success&&r.model.nodes.length===beforeN+6&&r.model.members.length===10);
 t("beam members and brackets have direct SI section data",()=>r.model.members.filter(m=>m.craneIntegration).length===10&&r.model.members.filter(m=>m.craneIntegration).every(m=>m.analysisSection.E_Pa===2e11));
 t("keeps original source model immutable",()=>base.nodes.length===beforeN&&base.members.length===beforeM);
 t("retains per-end release configuration",()=>r.model.members.filter(m=>m.craneIntegration).every(m=>Array.isArray(m.endReleases.i)&&Array.isArray(m.endReleases.j)));
 t("rejects missing bracket section properties",()=>!prepare(base,{...input,bracketSection:{}}).success);
 t("rejects missing connection drawing reference",()=>!prepare(base,{...input,connectionSource:""}).success);
 t("rejects unselected connection type",()=>!prepare(base,{...input,connectionType:"spring"}).success);
 t("does not approve design or analysis",()=>r.analysisEnabled===false&&r.model.geometry.craneRunway.integrated3D.analysisEnabled===false);
 return {passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelCrane3DIntegration={prepare,integrate,audit,readUI,setData,selfTest};
})(typeof window!=="undefined"?window:globalThis);
