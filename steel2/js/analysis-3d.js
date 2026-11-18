/* SAHROUD STEEL - 3D elastic frame solver core
 * 6 DOF/node, 12 DOF/member, SI units (N, m, Pa).
 * Linear first-order elastic analysis; optional independent rotational DOFs
 * at each roof-purlin piece end. No P-Delta, warping, shear deformation,
 * buckling, or code design checks in this version.
 */
(function(root){
"use strict";
const EPS=1e-10;
const zeros=(r,c)=>Array.from({length:r},()=>Array(c).fill(0));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.sqrt(dot(a,a));
const scale=(a,s)=>a.map(v=>v*s);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function solve(A,b){
 const n=b.length;
 // Symmetric diagonal equilibration reduces false singularity caused by
 // translational/rotational DOFs having very different stiffness units.
 const scaleD=Array(n);
 for(let i=0;i<n;i++){
  const d=Math.abs(A[i][i]);
  if(!(d>0&&Number.isFinite(d)))throw Error("DOF_SINGULAR:"+i+":قطر صفر یا نامعتبر در ماتریس سختی");
  scaleD[i]=1/Math.sqrt(d);
 }
 const M=A.map((r,i)=>r.map((v,j)=>v*scaleD[i]*scaleD[j]).concat(b[i]*scaleD[i]));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(Math.abs(M[p][k])<1e-12)throw Error("DOF_SINGULAR:"+k+":ماتریس مقیاس‌بندی‌شده تکین یا نزدیک به تکین است");
  [M[k],M[p]]=[M[p],M[k]];
  const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;
  for(let i=0;i<n;i++){if(i===k)continue;const f=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j];}
 }
 return M.map((r,i)=>r[n]*scaleD[i]);
}
function transpose(A){return A[0].map((_,j)=>A.map(r=>r[j]));}
function mul(A,B){
 const C=zeros(A.length,B[0].length);
 for(let i=0;i<A.length;i++)for(let k=0;k<B.length;k++)if(A[i][k]!==0)for(let j=0;j<B[0].length;j++)C[i][j]+=A[i][k]*B[k][j];
 return C;
}
function addBlock(K,ids,ke){
 const sparse=K[0] instanceof Map;
 for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++){
  const value=ke[i][j];if(value===0)continue;
  if(sparse){const row=K[ids[i]];row.set(ids[j],(row.get(ids[j])||0)+value);}
  else K[ids[i]][ids[j]]+=value;
 }
}
function matrixVector(K,x){
 if(K[0] instanceof Map)return K.map(row=>{let sum=0;row.forEach((value,j)=>{sum+=value*x[j];});return sum;});
 return K.map(row=>dot(row,x));
}
function solveSparseConjugateGradient(K,free,b){
 const n=free.length;if(!n)throw Error("تمام درجات آزادی مقید شده‌اند.");
 const reduced=new Int32Array(K.length);reduced.fill(-1);
 free.forEach((global,i)=>{reduced[global]=i;});
 const scaleD=new Float64Array(n),rhs=new Float64Array(n);
 for(let i=0;i<n;i++){
  const diagonal=K[free[i]].get(free[i]);
  if(!(Number.isFinite(diagonal)&&diagonal>0))throw Error("DOF_SINGULAR:"+i+":قطر صفر یا نامعتبر در ماتریس سختی تنک");
  scaleD[i]=1/Math.sqrt(diagonal);rhs[i]=b[i]*scaleD[i];
 }
 const multiply=v=>{
  const out=new Float64Array(n);
  for(let i=0;i<n;i++){
   let sum=0;
   K[free[i]].forEach((value,globalJ)=>{
    const j=reduced[globalJ];if(j>=0)sum+=value*scaleD[i]*scaleD[j]*v[j];
   });
   out[i]=sum;
  }
  return out;
 };
 const dotV=(a,bv)=>{let sum=0;for(let i=0;i<a.length;i++)sum+=a[i]*bv[i];return sum;};
 const normV=v=>Math.sqrt(dotV(v,v));
 const x=new Float64Array(n),r=Float64Array.from(rhs),p=Float64Array.from(rhs);
 let rz=dotV(r,r),rhsNorm=Math.max(normV(rhs),1);
 if(normV(r)<=1e-12*rhsNorm)return Array.from(x,(v,i)=>v*scaleD[i]);
 const tolerance=1e-9,maxIterations=Math.min(30000,Math.max(1000,n*12));
 for(let iteration=0;iteration<maxIterations;iteration++){
  const Ap=multiply(p),curvature=dotV(p,Ap);
  if(!(Number.isFinite(curvature)&&curvature>1e-30))
   throw Error("DOF_SINGULAR:"+iteration+":ماتریس سختی تنک مثبت‌معین نیست یا مدل ناپایدار است");
  const alpha=rz/curvature;
  for(let i=0;i<n;i++){x[i]+=alpha*p[i];r[i]-=alpha*Ap[i];}
  if(normV(r)<=tolerance*rhsNorm)return Array.from(x,(v,i)=>v*scaleD[i]);
  const next=dotV(r,r),beta=next/rz;
  for(let i=0;i<n;i++)p[i]=r[i]+beta*p[i];
  rz=next;
 }
 throw Error("SPARSE_CG_NOT_CONVERGED:"+maxIterations+":حل تکراری ماتریس سختی تنک به تلرانس نرسید.");
}
function frameLocalStiffness(p,L){
 const {E,A,Iy,Iz,G,J}=p;
 const k=zeros(12,12),ax=E*A/L,t=G*J/L;
 const put=(ids,b)=>{for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++)k[ids[i]][ids[j]]+=b[i][j];};
 put([0,6],[[ax,-ax],[-ax,ax]]);
 put([3,9],[[t,-t],[-t,t]]);
 const b=12*E*Iz/L**3,c=6*E*Iz/L**2,d=4*E*Iz/L,e=2*E*Iz/L;
 put([1,5,7,11],[
 [b,c,-b,c],[c,d,-c,e],[-b,-c,b,-c],[c,e,-c,d]
 ]);
 const f=12*E*Iy/L**3,g=6*E*Iy/L**2,h=4*E*Iy/L,j=2*E*Iy/L;
 put([2,4,8,10],[
 [f,-g,-f,-g],[-g,h,g,j],[-f,g,f,g],[-g,j,g,h]
 ]);
 return k;
}
function makeTransform(a,b,reference){
 const d=sub(b,a),L=norm(d);if(!(L>0))throw Error("عضو با طول صفر در مدل وجود دارد.");
 const ex=scale(d,1/L);let ref=reference||[0,0,1];
 if(Math.abs(dot(ex,ref)/norm(ref))>0.95)ref=[0,1,0];
 const ey=scale(cross(ref,ex),1/norm(cross(ref,ex)));
 const ez=cross(ex,ey);
 const R=[ex,ey,ez],T=zeros(12,12);
 for(let block=0;block<4;block++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)T[block*3+i][block*3+j]=R[i][j];
 return {T,L,axes:{x:ex,y:ey,z:ez}};
}
function globalVectorToLocal(a,b,vector,reference){
 if(!Array.isArray(vector)||vector.length!==3||vector.some(v=>!Number.isFinite(Number(v))))
  throw Error("بردار بار جهانی باید سه مؤلفه عددی متناهی داشته باشد.");
 const tr=makeTransform(a,b,reference);
 return [tr.axes.x,tr.axes.y,tr.axes.z].map(axis=>dot(axis,vector));
}
function equivalentUniformLoad(q,L){
 const [qx,qy,qz]=q, f=Array(12).fill(0);
 f[0]=qx*L/2;f[6]=qx*L/2;
 f[1]=qy*L/2;f[7]=qy*L/2;f[5]=qy*L*L/12;f[11]=-qy*L*L/12;
 f[2]=qz*L/2;f[8]=qz*L/2;f[4]=-qz*L*L/12;f[10]=qz*L*L/12;
 return f;
}
function calculateGlobalLoadResultants(model,nodalLoads){
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل برای ممیزی برآیند بار معتبر نیست.");
 const nodeMap=new Map(model.nodes.map(n=>[n.id,n]));
 if(nodeMap.size!==model.nodes.length)throw Error("شناسه گره تکراری در ممیزی برآیند بار.");
 const force=[0,0,0],moment=[0,0,0];
 const addAt=(f,m,r)=>{
  for(let i=0;i<3;i++){force[i]+=f[i];moment[i]+=m[i];}
  moment[0]+=r[1]*f[2]-r[2]*f[1];
  moment[1]+=r[2]*f[0]-r[0]*f[2];
  moment[2]+=r[0]*f[1]-r[1]*f[0];
 };
 model.members.forEach(member=>{
  const q=member.analysisLoad&&member.analysisLoad.uniformLocal;
  if(!q)return;
  if(!Array.isArray(q)||q.length!==3||q.some(v=>!Number.isFinite(Number(v))))throw Error("بار گسترده محلی عضو "+member.id+" برای ممیزی نامعتبر است.");
  const a=nodeMap.get(member.start),b=nodeMap.get(member.end);
  if(!a||!b)throw Error("گره عضو "+member.id+" در ممیزی برآیند بار یافت نشد.");
  const tr=makeTransform([a.x,a.y,a.z],[b.x,b.y,b.z]);
  const qGlobal=[0,1,2].map(i=>tr.axes.x[i]*q[0]+tr.axes.y[i]*q[1]+tr.axes.z[i]*q[2]);
  const resultant=qGlobal.map(v=>v*tr.L);
  addAt(resultant,[0,0,0],[(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2]);
 });
 (nodalLoads||[]).forEach(load=>{
  const node=nodeMap.get(load.nodeId),v=load.values||[];
  if(!node)throw Error("گره بار گره‌ای در ممیزی یافت نشد: "+load.nodeId);
  if(v.length!==6||v.some(x=>!Number.isFinite(Number(x))))throw Error("بار گره‌ای "+load.nodeId+" برای ممیزی نامعتبر است.");
  addAt(v.slice(0,3).map(Number),v.slice(3,6).map(Number),[node.x,node.y,node.z]);
 });
 return {forceN:force,momentNm:moment,method:"direct distributed-load resultant at member midpoint plus nodal actions"};
}

function analyze(model,options){
 options=options||{};
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر ارائه نشده است.");
 const nodes=model.nodes, members=model.members, nodeMap=new Map(nodes.map((n,i)=>[n.id,i]));
 if(nodeMap.size!==nodes.length)throw Error("شناسه گره تکراری است.");
 let nDof=nodes.length*6;
 const purlinEndRotationDof=new Map();
 if(options.releasePurlinRafterRotation===true){
  const rafterNodes=new Set();
  members.forEach(m=>{
   if((m.sectionKey||"")==="rafter"){rafterNodes.add(m.start);rafterNodes.add(m.end);}
  });
  // Release two bending rotations (global X/Y) at each purlin support.
  // Keep global Z rotation shared: it is torsion about the longitudinal purlin axis.
  const pieceNodeRotationDof=new Map();
  members.forEach(m=>{
   if((m.sectionKey||"")!=="roofPurlin")return;
   [["i",m.start],["j",m.end]].forEach(([end,nodeId])=>{
    if(!rafterNodes.has(nodeId))return;
    // Segments of the same fabricated piece share the released bending rotations.
    const pieceKey=String(m.pieceId||m.id)+":"+String(nodeId);
    let ids=pieceNodeRotationDof.get(pieceKey);
    if(!ids){ids=[nDof,nDof+1];nDof+=2;pieceNodeRotationDof.set(pieceKey,ids);}
    purlinEndRotationDof.set(String(m.id)+":"+end,ids);
   });
  });
 }
 const useSparse=options.sparseSolver===true||nDof>=600;
 const K=useSparse?Array.from({length:nDof},()=>new Map()):zeros(nDof,nDof),F=Array(nDof).fill(0),elements=[];
 const props=options.sectionResolver;
 if(typeof props!=="function")throw Error("تابع تخصیص خواص مقطع برای همه اعضا تعریف نشده است؛ تحلیل متوقف شد.");
 for(const m of members){
  const ia=nodeMap.get(m.start),ib=nodeMap.get(m.end);if(ia===undefined||ib===undefined)throw Error("گره ابتدا یا انتهای عضو "+m.id+" یافت نشد.");
  const p=props(m);if(!p)throw Error("مقطع عضو "+m.id+" ("+m.type+") تخصیص نیافته است.");
  for(const key of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(Number(p[key]))&&Number(p[key])>0))throw Error("خاصیت "+key+" برای عضو "+m.id+" ناقص یا نامعتبر است.");
  const a=[nodes[ia].x,nodes[ia].y,nodes[ia].z],b=[nodes[ib].x,nodes[ib].y,nodes[ib].z];
  const tr=makeTransform(a,b,m.referenceAxis||options.referenceAxis),kl=frameLocalStiffness(p,tr.L),kg=mul(transpose(tr.T),mul(kl,tr.T));
  const ids=Array.from({length:6},(_,i)=>ia*6+i).concat(Array.from({length:6},(_,i)=>ib*6+i));
  if(options.releasePurlinRafterRotation===true&&(m.sectionKey||"")==="roofPurlin"){
   const ri=purlinEndRotationDof.get(String(m.id)+":i"),rj=purlinEndRotationDof.get(String(m.id)+":j");
   if(ri){ids[3]=ri[0];ids[4]=ri[1];}
   if(rj){ids[9]=rj[0];ids[10]=rj[1];}
  }
  addBlock(K,ids,kg);
  const q=m.analysisLoad&&m.analysisLoad.uniformLocal?m.analysisLoad.uniformLocal.map(Number):[0,0,0];
  if(q.length!==3||q.some(v=>!Number.isFinite(v)))throw Error("بار گسترده محلی عضو "+m.id+" معتبر نیست.");
  const fl=equivalentUniformLoad(q,tr.L),fg=mul(transpose(tr.T),fl.map(v=>[v])).map(r=>r[0]);
  ids.forEach((id,i)=>F[id]+=fg[i]);
  elements.push({member:m,ids,kl,T:tr.T,L:tr.L,axes:tr.axes,fl,props:p});
 }
 (options.nodalLoads||[]).forEach(load=>{
  const ni=nodeMap.get(load.nodeId);if(ni===undefined)throw Error("گره بارگذاری‌شده یافت نشد: "+load.nodeId);
  const v=load.values||[];if(v.length!==6)throw Error("بار گره‌ای باید شش مؤلفه داشته باشد.");
  v.forEach((x,j)=>{if(!Number.isFinite(Number(x)))throw Error("بار گره‌ای نامعتبر است.");F[ni*6+j]+=Number(x);});
 });
 const fixed=new Set();
 (options.supports||[]).forEach(s=>{
  const ni=nodeMap.get(s.nodeId);if(ni===undefined)throw Error("گره تکیه‌گاهی یافت نشد: "+s.nodeId);
  (s.fixedDofs||[]).forEach(d=>{if(!Number.isInteger(d)||d<0||d>5)throw Error("درجه آزادی تکیه‌گاه نامعتبر است.");fixed.add(ni*6+d);});
 });
 const free=Array.from({length:nDof},(_,i)=>i).filter(i=>!fixed.has(i));
 if(!free.length)throw Error("تمام درجات آزادی مقید شده‌اند.");
 const Ff=free.map(i=>F[i]);
 let df;
 try{df=useSparse?solveSparseConjugateGradient(K,free,Ff):solve(free.map(i=>free.map(j=>K[i][j])),Ff);}
 catch(err){
  const match=String(err.message||err).match(/DOF_SINGULAR:(\d+):(.*)/);
  if(match){
   const reduced=Number(match[1]),globalDof=free[reduced];
   const dofNames=["انتقال X","انتقال Y","انتقال Z","دوران X","دوران Y","دوران Z"];
   let nodeLabel="نامشخص",component="درجه آزادی "+globalDof;
   if(globalDof<nodes.length*6){
    const nodeIndex=Math.floor(globalDof/6),dof=globalDof%6,node=nodes[nodeIndex];
    nodeLabel=node?String(node.id)+" ("+(node.kind||"گره")+ ")":"گره نامشخص";
    component=dofNames[dof];
   }else{
    let found=false;
    purlinEndRotationDof.forEach((ids,key)=>{
     const local=ids.indexOf(globalDof);
     if(local>=0){
      const parts=String(key).split(":"),memberId=parts[0],end=parts[1];
      const member=members.find(x=>String(x.id)===memberId);
      const nodeId=member?(end==="i"?member.start:member.end):null;
      const ni=nodeMap.get(nodeId),node=ni===undefined?null:nodes[ni];
      nodeLabel=node?String(node.id)+" ("+(node.kind||"گره")+ ")":"گره پرلین نامشخص";
      component="دوران "+["X","Y"][local]+" انتهای "+end+" پرلین مستقل "+memberId;
      found=true;
     }
    });
    if(!found)component="درجه آزادی اضافی "+globalDof+" (گره متناظر شناسایی نشد)";
   }
   throw Error("ناپایداری عددی/سازه‌ای در "+nodeLabel+"، مؤلفه "+component+
    "؛ شماره درجه آزادی آزاد "+globalDof+
    ". جزئیات حل‌گر: "+match[2]+". پیوستگی پرلین، جزئیات کلیپس/نبشی، مهاربندی و تکیه‌گاه‌های این ناحیه باید بررسی شوند.");
  }
  throw err;
 }
 const D=Array(nDof).fill(0);
 free.forEach((id,i)=>D[id]=df[i]);
 const KD=matrixVector(K,D),R=KD.map((v,i)=>v-F[i]);
 // Global equilibrium is evaluated from assembled equivalent nodal loads and
 // support reactions. Do not sum force and moment components into one scalar.
 const appliedForce=[0,0,0],appliedMoment=[0,0,0];
 const supportForce=[0,0,0],supportMoment=[0,0,0];
 const addGlobal=(force,moment,node,targetForce,targetMoment)=>{
  for(let k=0;k<3;k++){targetForce[k]+=force[k];targetMoment[k]+=moment[k];}
  const rx=node.x||0,ry=node.y||0,rz=node.z||0;
  targetMoment[0]+=ry*force[2]-rz*force[1];
  targetMoment[1]+=rz*force[0]-rx*force[2];
  targetMoment[2]+=rx*force[1]-ry*force[0];
 };
 nodes.forEach((node,i)=>{
  const base=i*6,loadForce=F.slice(base,base+3),loadMoment=F.slice(base+3,base+6);
  addGlobal(loadForce,loadMoment,node,appliedForce,appliedMoment);
  const reactionForce=[0,1,2].map(d=>fixed.has(base+d)?R[base+d]:0);
  const reactionMoment=[3,4,5].map(d=>fixed.has(base+d)?R[base+d]:0);
  addGlobal(reactionForce,reactionMoment,node,supportForce,supportMoment);
 });
 const forceResidual=appliedForce.map((v,i)=>v+supportForce[i]);
 // Equivalent end moments applied to the duplicated purlin bending rotations
 // must be included in the global moment equilibrium check as well.
 purlinEndRotationDof.forEach((ids,key)=>{
  const parts=String(key).split(":"),memberId=parts[0],end=parts[1];
  const member=members.find(x=>String(x.id)===memberId);
  const nodeId=member?(end==="i"?member.start:member.end):null;
  const nodeIndex=nodeMap.get(nodeId);
  if(nodeIndex!==undefined)addGlobal([0,0,0],[F[ids[0]],F[ids[1]],0],nodes[nodeIndex],appliedForce,appliedMoment);
 });
 const loadResultantAudit=calculateGlobalLoadResultants({nodes,members},options.nodalLoads||[]);
 const loadForceDifference=appliedForce.map((v,i)=>v-loadResultantAudit.forceN[i]);
 const loadMomentDifference=appliedMoment.map((v,i)=>v-loadResultantAudit.momentNm[i]);
 const loadForceRelative=Math.hypot(...loadForceDifference)/Math.max(Math.hypot(...appliedForce),1);
 const loadMomentRelative=Math.hypot(...loadMomentDifference)/Math.max(Math.hypot(...appliedMoment),1);
 const loadAssemblyAudit={...loadResultantAudit,assembledForceN:appliedForce,assembledMomentNm:appliedMoment,
  forceDifferenceN:loadForceDifference,momentDifferenceNm:loadMomentDifference,
  relativeForceDifference:loadForceRelative,relativeMomentDifference:loadMomentRelative,
  ok:loadForceRelative<=1e-8&&loadMomentRelative<=1e-8};
 if(!loadAssemblyAudit.ok)throw Error("ممیزی مستقل برآیند بارهای گسترده/گره‌ای با بردار بار مونتاژشده حل‌گر سازگار نیست.");
 const momentResidual=appliedMoment.map((v,i)=>v+supportMoment[i]);
 const vectorNorm=v=>Math.hypot(...v);
 const relativeForceResidual=vectorNorm(forceResidual)/Math.max(vectorNorm(appliedForce),vectorNorm(supportForce),1);
 const relativeMomentResidual=vectorNorm(momentResidual)/Math.max(vectorNorm(appliedMoment),vectorNorm(supportMoment),1);
 const equilibrium={appliedForceN:appliedForce,supportReactionN:supportForce,
  forceResidualN:forceResidual,appliedMomentNm:appliedMoment,supportMomentNm:supportMoment,
  momentResidualNm:momentResidual,relativeForceResidual,relativeMomentResidual,
  ok:relativeForceResidual<=1e-6&&relativeMomentResidual<=1e-6,freeDofCount:free.length};
 const results=elements.map(e=>{
  const dg=e.ids.map(i=>D[i]),dl=mul(e.T,dg.map(v=>[v])).map(r=>r[0]),q=mul(e.kl,dl.map(v=>[v])).map(r=>r[0]);
  const end=q.map((v,i)=>v-e.fl[i]);
  return {id:e.member.id,type:e.member.type,length:e.L,localEndForces:end,localAxes:e.axes,section:e.props};
 });
 let maxTranslation=0,maxDisplacement=null;
 nodes.forEach((n,i)=>{
  const components=D.slice(i*6,i*6+3);
  const magnitude=Math.hypot(...components);
  if(magnitude>maxTranslation){
   maxTranslation=magnitude;
   maxDisplacement={nodeId:n.id,components,rotation:D.slice(i*6+3,i*6+6),magnitude};
  }
 });
 const reactions=nodes.map((n,i)=>({nodeId:n.id,values:R.slice(i*6,i*6+6).map((v,d)=>fixed.has(i*6+d)?v:0)})).filter(x=>x.values.some(v=>Math.abs(v)>1e-8));
 return {success:true,method:"3D linear elastic direct stiffness",solverAlgorithm:useSparse?"diagonally-scaled-sparse-conjugate-gradient":"dense-gaussian-elimination",units:"N,m,Pa",loadAssemblyAudit,nodeCount:nodes.length,memberCount:members.length,purlinRafterReleasedBendingRotationEnds:purlinEndRotationDof.size,displacements:nodes.map((n,i)=>({nodeId:n.id,values:D.slice(i*6,i*6+6)})),reactions,members:results,maxTranslation,maxDisplacement,limitations:["تحلیل خطی مرتبه اول","بدون اثر P-Delta و تحلیل کمانش","بدون تغییرشکل برشی و وارپینگ پیچشی","بدون آزادسازی انتهایی عضو","بدون کنترل آیین‌نامه‌ای مقاومت و اتصالات","بار گسترده فقط در قالب مؤلفه‌های یکنواخت محلی عضو پذیرفته می‌شود"],equilibrium};
}
root.SteelFrame3D={analyze,frameLocalStiffness,makeTransform,globalVectorToLocal,equivalentUniformLoad,calculateGlobalLoadResultants,solve,solveSparseConjugateGradient};
})(typeof window!=="undefined"?window:globalThis);
