/* SAHROUD STEEL — exact gable strip integration and consistent residual/eccentric nodal loads.
 * Baseline uniform member load remains in analysisLoad.uniformLocal.
 * This module adds only the consistent nodal load vector for the difference between
 * the true linearly clipped tributary strip and its mean uniform load, plus the
 * eccentric distributed torsional couple. No load is silently omitted.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const gauss=[{t:0.1127016653792583,w:5/18},{t:0.5,w:8/18},{t:0.8872983346207417,w:5/18}];
function roofY(x,g){const span=Number(g.span),height=Number(g.height),rise=Number(g.rise),half=span/2;return height+rise*(x<=half?x/half:(span-x)/half);}
function stripGeometry(member,a,b,g){
 const issues=[],x0=Number(a?.x),x1=Number(b?.x),y=Number(a?.y),z=Number(a?.z),span=Number(g?.span);
 if(!a||!b||![x0,x1,y,z,b.x,b.y,b.z,span,g.height,g.rise].every(Number.isFinite)||!(x1>x0)||Math.abs(y-b.y)>1e-8||Math.abs(z-b.z)>1e-8||!(span>0))return{success:false,issues:["هندسه گرت انتهایی باید افقی، با طول مثبت و مختصات معتبر باشد."]};
 if(x0<-1e-8||x1>span+1e-8)return{success:false,issues:["قطعه گرت خارج از عرض واقعی دیوار انتهایی است."]};
 if(x0<span/2-1e-8&&x1>span/2+1e-8)return{success:false,issues:["قطعه گرت از شکست شیب در تاج عبور می‌کند؛ باید در تاج به دو قطعه تقسیم شود."]};
 const lower=Number(member.tributaryHeightLowerM),upperMid=Number(member.tributaryHeightUpperM),h=Number(member.tributaryHeight);
 if(![lower,upperMid,h].every(Number.isFinite)||lower<0||!(upperMid>lower)||!(h>0))return{success:false,issues:["حد پایین، بالای نوار بارگیر و ارتفاع بارگیر گرت باید صریح و معتبر باشند."]};
 const mid=(x0+x1)/2,roofMid=roofY(mid,g),roofClipped=Math.abs(upperMid-roofMid)<=Math.max(1e-7,Math.abs(roofMid)*1e-8);
 const u0=roofClipped?roofY(x0,g):upperMid,u1=roofClipped?roofY(x1,g):upperMid;
 const h0=u0-lower,h1=u1-lower,L=x1-x0,avgH=(h0+h1)/2;
 if(!(h0>0&&h1>0&&avgH>0))return{success:false,issues:["ارتفاع نوار بارگیر در یکی از دو انتهای گرت نامعتبر است."]};
 if(Math.abs(avgH-h)>Math.max(1e-6,Math.abs(h)*1e-5))return{success:false,issues:["ارتفاع بارگیر ذخیره‌شده با انتگرال دقیق نوار بارگیر منطبق نیست."]};
 const avgU2=(u0*u0+u0*u1+u1*u1)/3;
 const area=L*avgH;
 const intYdA=L*(avgU2-lower*lower)/2;
 const intXdA=L*(x0*avgH+L*(h0/2+(h1-h0)/3));
 return{success:true,x0,x1,y,z,L,lower,u0,u1,h0,h1,avgH,area,intYdA,intXdA,roofClipped};
}
function axesFor(a,b){
 const d=[b.x-a.x,b.y-a.y,b.z-a.z],L=norm(d);if(!(L>1e-9))throw Error("طول گرت صفر است.");
 const ex=d.map(v=>v/L);let ref=[0,0,1];if(Math.abs(dot(ex,ref))>0.95)ref=[0,1,0];
 const c=cross(ref,ex),cn=norm(c);if(!(cn>1e-10))throw Error("محورهای محلی گرت قابل ساخت نیستند.");
 const ey=c.map(v=>v/cn),ez=cross(ex,ey);return{x:ex,y:ey,z:ez,L};
}
function localResidualVector(qAverage,member,strip,pressure,faceSign,axis){
 const L=strip.L,local=Array(12).fill(0),y=strip.y,lower=strip.lower,du=strip.u1-strip.u0;
 for(const g of gauss){
  const t=g.t,u=strip.u0+du*t,h=u-lower,x=strip.x0+L*t;
  const qz=faceSign*pressure*h*1000;
  const qGlobal=[0,0,qz],qLocal=[dot(qGlobal,axis.x),dot(qGlobal,axis.y),dot(qGlobal,axis.z)];
  const qResidual=qLocal.map((v,i)=>v-qAverage[i]);
  const e=(lower+u)/2-y,mGlobalX=e*qz,mLocalX=mGlobalX*axis.x[0];
  const H1=1-3*t*t+2*t*t*t,H3=3*t*t-2*t*t*t;
  const H2=L*(t-2*t*t+t*t*t),H4=L*(-t*t+t*t*t);
  const w=L*g.w;
  local[0]+=w*(1-t)*qResidual[0];local[6]+=w*t*qResidual[0];
  local[1]+=w*H1*qResidual[1];local[5]+=w*H2*qResidual[1];local[7]+=w*H3*qResidual[1];local[11]+=w*H4*qResidual[1];
  local[2]+=w*H1*qResidual[2];local[4]-=w*H2*qResidual[2];local[8]+=w*H3*qResidual[2];local[10]-=w*H4*qResidual[2];
  local[3]+=w*(1-t)*mLocalX;local[9]+=w*t*mLocalX;
 }
 return local;
}
function localToGlobalLoads(member,axis,local){
 const out=[];
 for(let end=0;end<2;end++){
  const i=end*6,force=[local[i],local[i+1],local[i+2]],moment=[local[i+3],local[i+4],local[i+5]];
  const transform=v=>axis.x.map((_,j)=>axis.x[j]*v[0]+axis.y[j]*v[1]+axis.z[j]*v[2]);
  const F=transform(force),M=transform(moment);
  out.push({nodeId:String(end===0?member.start:member.end),values:[...F,...M]});
 }
 return out;
}
function prepareNodalLoads(model,pressures,windFactor=1,windSign=1){
 const issues=[],rows=[],loads=[],members=Array.isArray(model?.members)?model.members:[],nodes=new Map((model?.nodes||[]).map(n=>[String(n.id),n])),g=model?.geometry||{};
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))return{success:false,issues:["مدل واقعی گابل برای انتقال بار موجود نیست."],loads,rows};
 if(!finite(windFactor)||windFactor<0||![-1,1].includes(Number(windSign)))return{success:false,issues:["ضریب یا علامت باد نامعتبر است."],loads,rows};
 for(const face of ["front","rear"]){
  const key=face==="front"?"end-wall-front":"end-wall-back",p=pressures?.[key];
  if(!finite(p)){issues.push("فشار سطح "+key+" مفقود یا نامعتبر است.");continue;}
  if(Math.abs(p*windFactor)<1e-12)continue;
  const faceMembers=members.filter(m=>m.sectionKey==="endGirt"&&m.endFace===face);
  if(!faceMembers.length){issues.push("برای سطح فعال "+key+" هیچ گرتی وجود ندارد.");continue;}
  for(const m of faceMembers){
   const a=nodes.get(String(m.start)),b=nodes.get(String(m.end)),strip=stripGeometry(m,a,b,g);
   if(!strip.success){issues.push("گرت "+m.id+": "+strip.issues.join("؛ "));continue;}
   const axis=axesFor(a,b),faceSign=(face==="front"?1:-1)*windSign;
   const qAverage=[0,0,faceSign*p*windFactor*strip.avgH*1000];
   const local=localResidualVector(qAverage,m,strip,p*windFactor,faceSign,axis);
   const global=localToGlobalLoads(m,axis,local);
   const combined=new Map();
   global.forEach(x=>{const old=combined.get(x.nodeId)||[0,0,0,0,0,0];x.values.forEach((v,i)=>old[i]+=v);combined.set(x.nodeId,old);});
   const segmentLoads=[...combined].map(([nodeId,values])=>({nodeId,values}));
   segmentLoads.forEach(x=>loads.push(x));
   const force=[0,0,0],moment=[0,0,0];
   segmentLoads.forEach(x=>{const n=nodes.get(x.nodeId),F=x.values.slice(0,3),M=x.values.slice(3,6),r=[n.x,n.y,n.z],rm=cross(r,F);for(let i=0;i<3;i++){force[i]+=F[i];moment[i]+=rm[i]+M[i];}});
   const expectedTorque=faceSign*p*windFactor*1000*(strip.intYdA-strip.y*strip.area);
   const expectedMy=-faceSign*p*windFactor*1000*(strip.intXdA-strip.x0*strip.area-strip.L*strip.area/2);
   const residuals={force:Math.hypot(...force),momentX:Math.abs(moment[0]-expectedTorque),momentY:Math.abs(moment[1]-expectedMy),momentZ:Math.abs(moment[2])};
   const scale=Math.max(1,Math.abs(expectedTorque),Math.abs(expectedMy));
   if(residuals.force>scale*1e-8||residuals.momentX>scale*1e-8||residuals.momentY>scale*1e-8||residuals.momentZ>scale*1e-8)issues.push("تعادل شش‌مؤلفه‌ای بار معادل گرت "+m.id+" برقرار نیست.");
   rows.push({memberId:m.id,face,lengthM:strip.L,averageTributaryHeightM:strip.avgH,upperBoundaryMode:strip.roofClipped?"sloping-roof":"horizontal-girt-band",uniformBaselineKNm:qAverage[2]/1000,consistentResidualAndEccentricNodalLoads:segmentLoads,expectedEccentricTorque_Nm:expectedTorque,actualNodalMoment_Nm:moment,residuals,success:residuals.force<=scale*1e-8&&residuals.momentX<=scale*1e-8&&residuals.momentY<=scale*1e-8&&residuals.momentZ<=scale*1e-8});
  }
 }
 const merged=new Map();
 loads.forEach(x=>{const v=merged.get(x.nodeId)||[0,0,0,0,0,0];x.values.forEach((q,i)=>v[i]+=q);merged.set(x.nodeId,v);});
 const nodalLoads=[...merged].map(([nodeId,values])=>({nodeId,values}));
 return{success:issues.length===0&&rows.length>0,loads:nodalLoads,rows,issues,windFactor,windSign,analysisEnabled:true,designApproved:false,method:"consistent beam nodal residual loads from exact linear tributary-height variation plus distributed eccentric torsion; mean uniform force remains on each end-girt",limitations:["این ماژول فقط برای گرت‌های افقی انتهایی و فشار باد یکنواخت هر وجه است.","بار میانگین یکنواخت در analysisLoad عضو باقی می‌ماند؛ این ماژول فقط اختلاف خطی و گشتاور ناشی از خروج از مرکزیت را به‌صورت بار سازگار گره‌ای می‌افزاید.","مقطع، اتصالات، ورق پوسته، پیچ و ظرفیت گرت/ستونک در این ماژول طراحی نمی‌شوند.","بار باد و ضرایب اقلیمی باید جداگانه از مرجع معتبر تأیید شوند."]};
}
function selfTest(){
 const checks=[],t=(name,fn)=>{try{checks.push({name,ok:!!fn()});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 const g={span:10,height:4,rise:2},nodes=[{id:"A",x:0,y:2,z:0},{id:"B",x:5,y:2,z:0}],member={id:"G1",start:"A",end:"B",sectionKey:"endGirt",endFace:"front",tributaryHeight:1.5,tributaryHeightLowerM:1.25,tributaryHeightUpperM:2.75};
 const strip=stripGeometry(member,nodes[0],nodes[1],g);
 t("exact strip area and first moments for constant band",()=>strip.success&&Math.abs(strip.area-7.5)<1e-9&&Math.abs(strip.intYdA-15)<1e-9&&Math.abs(strip.intXdA-18.75)<1e-9);
 const model={geometry:g,nodes,members:[member]};
 const r=prepareNodalLoads(model,{"end-wall-front":0.3,"end-wall-back":0},1,1);
 t("constant band produces zero residual/eccentric nodal loads",()=>r.success&&r.loads.length===0&&r.rows.length===1&&r.rows[0].success);
 const sloped={...member,tributaryHeight:2,tributaryHeightLowerM:1,tributaryHeightUpperM:3};
 const slopeModel={geometry:{span:10,height:4,rise:2},nodes:[{id:"C",x:0,y:2,z:0},{id:"D",x:5,y:2,z:0}],members:[sloped]};
 const sr=prepareNodalLoads(slopeModel,{"end-wall-front":0.3,"end-wall-back":0},1,1);
 t("sloping roof strip produces consistent residual and eccentric nodal loads",()=>sr.success&&sr.loads.length===2&&sr.rows[0].success&&Math.abs(sr.rows[0].expectedEccentricTorque_Nm)>1);
 t("rear face reverses global pressure sign",()=>{const rr=prepareNodalLoads({...model,nodes:[{id:"A",x:0,y:2,z:10},{id:"B",x:5,y:2,z:10}],members:[{...member,endFace:"rear"}]}, {"end-wall-front":0,"end-wall-back":0.3},1,1);return rr.success&&rr.rows[0].uniformBaselineKNm<0;});
 t("wind factor scales eccentric actions linearly",()=>{const x=prepareNodalLoads(slopeModel,{"end-wall-front":0.3,"end-wall-back":0},0.5,1);return x.success&&Math.abs(x.rows[0].expectedEccentricTorque_Nm-sr.rows[0].expectedEccentricTorque_Nm/2)<1e-8;});
 t("wind sign reverses eccentric actions",()=>{const x=prepareNodalLoads(slopeModel,{"end-wall-front":0.3,"end-wall-back":0},1,-1);return x.success&&Math.abs(x.rows[0].expectedEccentricTorque_Nm+sr.rows[0].expectedEccentricTorque_Nm)<1e-8;});
 t("non-horizontal girt is rejected",()=>{const x=prepareNodalLoads({...model,nodes:[nodes[0],{...nodes[1],y:2.1}]},{"end-wall-front":0.3,"end-wall-back":0});return !x.success;});
 t("girt crossing ridge is rejected",()=>{const x=stripGeometry({...member,tributaryHeight:2,tributaryHeightLowerM:1,tributaryHeightUpperM:3},{id:"E",x:4,y:2,z:0},{id:"F",x:6,y:2,z:0},g);return !x.success;});
 t("missing strip bounds fail closed",()=>{const x=prepareNodalLoads({...model,members:[{...member,tributaryHeightLowerM:undefined}]},{"end-wall-front":0.3,"end-wall-back":0});return !x.success;});
 t("zero wind creates no eccentric loads",()=>{const x=prepareNodalLoads(model,{"end-wall-front":0,"end-wall-back":0},1,1);return !x.success&&x.loads.length===0;});
 t("invalid wind factor is rejected",()=>!prepareNodalLoads(model,{"end-wall-front":0.3,"end-wall-back":0},-1,1).success);
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelGableEccentricLoadTransfer={stripGeometry,prepareNodalLoads,selfTest};
})(typeof window!=="undefined"?window:globalThis);
