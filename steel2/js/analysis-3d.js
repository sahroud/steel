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
function addBlock(K,ids,ke){for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++)K[ids[i]][ids[j]]+=ke[i][j];}
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
function equivalentUniformLoad(q,L){
 const [qx,qy,qz]=q, f=Array(12).fill(0);
 f[0]=qx*L/2;f[6]=qx*L/2;
 f[1]=qy*L/2;f[7]=qy*L/2;f[5]=qy*L*L/12;f[11]=-qy*L*L/12;
 f[2]=qz*L/2;f[8]=qz*L/2;f[4]=-qz*L*L/12;f[10]=qz*L*L/12;
 return f;
}

function solveSmall(A,b){
 const n=b.length,M=A.map((r,i)=>r.slice().concat([b[i]]));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(Math.abs(M[p][k])<1e-14)throw Error("آزادسازی انتهایی عضو به زیرماتریس تکین منجر شد؛ ترکیب آزادی‌های پیچشی/خمشی را بررسی کنید.");
  [M[k],M[p]]=[M[p],M[k]];
  const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;
  for(let i=0;i<n;i++)if(i!==k){const q=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=q*M[k][j];}
 }
 return M.map(r=>r[n]);
}
function normalizeEndReleases(member,options){
 const raw=(options.memberEndReleases&&options.memberEndReleases[String(member.id)])||member.endReleases||{};
 const out={i:[],j:[]};
 for(const end of ["i","j"]){
  const values=Array.isArray(raw[end])?raw[end]:[];
  values.forEach(v=>{
   const d=Number(v);
   if(!Number.isInteger(d)||d<3||d>5)throw Error("آزادسازی عضو "+member.id+" فقط برای دوران‌های محلی 3، 4 و 5 مجاز است.");
   if(!out[end].includes(d))out[end].push(d);
  });
 }
 if(out.i.includes(3)&&out.j.includes(3))
  throw Error("آزادسازی پیچش در هر دو انتهای عضو "+member.id+" هم‌زمان مجاز نیست؛ عضو می‌تواند ناپایدار شود.");
 return out;
}
function condenseMemberEndReleases(K,F,releases){
 const released=[...releases.i.map(d=>d),...releases.j.map(d=>d+6)].sort((a,b)=>a-b);
 if(!released.length)return{K,F,released,restore:null};
 const retained=Array.from({length:12},(_,i)=>i).filter(i=>!released.includes(i));
 const Kss=released.map(i=>released.map(j=>K[i][j]));
 const Ksr=released.map(i=>retained.map(j=>K[i][j]));
 const Krs=retained.map(i=>released.map(j=>K[i][j]));
 const Krr=retained.map(i=>retained.map(j=>K[i][j]));
 const Fs=released.map(i=>F[i]),Fr=retained.map(i=>F[i]);
 const invKsr=retained.map((_,j)=>solveSmall(Kss,Ksr.map(row=>row[j])));
 const invFs=solveSmall(Kss,Fs);
 const Kc=Array.from({length:12},()=>Array(12).fill(0)),Fc=Array(12).fill(0);
 for(let a=0;a<retained.length;a++){
  const i=retained[a];
  Fc[i]=Fr[a]-Krs[a].reduce((s,v,k)=>s+v*invFs[k],0);
  for(let b=0;b<retained.length;b++){
   const j=retained[b];
   Kc[i][j]=Krr[a][b]-Krs[a].reduce((s,v,k)=>s+v*invKsr[b][k],0);
  }
 }
 return{K:Kc,F:Fc,released,retained,Kss,Ksr,Fs};
}
function restoreReleasedRotations(localD,releaseData){
 if(!releaseData||!releaseData.released.length)return localD;
 const {released,retained,Kss,Ksr,Fs}=releaseData;
 const rhs=Fs.map((v,i)=>v-Ksr[i].reduce((s,k,j)=>s+k*localD[retained[j]],0));
 const values=solveSmall(Kss,rhs);
 released.forEach((d,i)=>localD[d]=values[i]);
 return localD;
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
 const K=zeros(nDof,nDof),F=Array(nDof).fill(0),elements=[];
 const props=options.sectionResolver;
 if(typeof props!=="function")throw Error("تابع تخصیص خواص مقطع برای همه اعضا تعریف نشده است؛ تحلیل متوقف شد.");
 for(const m of members){
  const ia=nodeMap.get(m.start),ib=nodeMap.get(m.end);if(ia===undefined||ib===undefined)throw Error("گره ابتدا یا انتهای عضو "+m.id+" یافت نشد.");
  const p=props(m);if(!p)throw Error("مقطع عضو "+m.id+" ("+m.type+") تخصیص نیافته است.");
  for(const key of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(Number(p[key]))&&Number(p[key])>0))throw Error("خاصیت "+key+" برای عضو "+m.id+" ناقص یا نامعتبر است.");
  const a=[nodes[ia].x,nodes[ia].y,nodes[ia].z],b=[nodes[ib].x,nodes[ib].y,nodes[ib].z];
  const tr=makeTransform(a,b,options.referenceAxis),kl=frameLocalStiffness(p,tr.L);
  const ids=Array.from({length:6},(_,i)=>ia*6+i).concat(Array.from({length:6},(_,i)=>ib*6+i));
  const endReleases=normalizeEndReleases(m,options);
  const releaseData=condenseMemberEndReleases(kl,Array(12).fill(0),endReleases);
  const kg=mul(transpose(tr.T),mul(releaseData.K,tr.T));
  if(options.releasePurlinRafterRotation===true&&(m.sectionKey||"")==="roofPurlin"){
   const ri=purlinEndRotationDof.get(String(m.id)+":i"),rj=purlinEndRotationDof.get(String(m.id)+":j");
   if(ri){ids[3]=ri[0];ids[4]=ri[1];}
   if(rj){ids[9]=rj[0];ids[10]=rj[1];}
  }
  addBlock(K,ids,kg);
  const q=m.analysisLoad&&m.analysisLoad.uniformLocal?m.analysisLoad.uniformLocal.map(Number):[0,0,0];
  if(q.length!==3||q.some(v=>!Number.isFinite(v)))throw Error("بار گسترده محلی عضو "+m.id+" معتبر نیست.");
  const fl=equivalentUniformLoad(q,tr.L);
  const releasedLoad=condenseMemberEndReleases(kl,fl,endReleases);
  const fg=mul(transpose(tr.T),releasedLoad.F.map(v=>[v])).map(r=>r[0]);
  ids.forEach((id,i)=>F[id]+=fg[i]);
  elements.push({member:m,ids,kl,T:tr.T,L:tr.L,axes:tr.axes,fl,props:p,releaseData,endReleases});
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
 const Kff=free.map(i=>free.map(j=>K[i][j])),Ff=free.map(i=>F[i]);
 let df;
 try{df=solve(Kff,Ff);}
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
 const KD=K.map(r=>dot(r,D)),R=KD.map((v,i)=>v-F[i]);
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
 const momentResidual=appliedMoment.map((v,i)=>v+supportMoment[i]);
 const vectorNorm=v=>Math.hypot(...v);
 const relativeForceResidual=vectorNorm(forceResidual)/Math.max(vectorNorm(appliedForce),vectorNorm(supportForce),1);
 const relativeMomentResidual=vectorNorm(momentResidual)/Math.max(vectorNorm(appliedMoment),vectorNorm(supportMoment),1);
 const equilibrium={appliedForceN:appliedForce,supportReactionN:supportForce,
  forceResidualN:forceResidual,appliedMomentNm:appliedMoment,supportMomentNm:supportMoment,
  momentResidualNm:momentResidual,relativeForceResidual,relativeMomentResidual,
  ok:relativeForceResidual<=1e-6&&relativeMomentResidual<=1e-6,freeDofCount:free.length};
 const results=elements.map(e=>{
  const dg=e.ids.map(i=>D[i]),dl=restoreReleasedRotations(mul(e.T,dg.map(v=>[v])).map(r=>r[0]),e.releaseData),q=mul(e.kl,dl.map(v=>[v])).map(r=>r[0]);
  const end=q.map((v,i)=>v-e.fl[i]);
  return {id:e.member.id,type:e.member.type,length:e.L,localEndForces:end,localAxes:e.axes,section:e.props,endReleases:e.endReleases};
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
 return {success:true,method:"3D linear elastic direct stiffness",units:"N,m,Pa",nodeCount:nodes.length,memberCount:members.length,purlinRafterReleasedBendingRotationEnds:purlinEndRotationDof.size,displacements:nodes.map((n,i)=>({nodeId:n.id,values:D.slice(i*6,i*6+6)})),reactions,members:results,maxTranslation,maxDisplacement,limitations:["تحلیل خطی مرتبه اول","بدون اثر P-Delta و تحلیل کمانش","بدون تغییرشکل برشی و وارپینگ پیچشی","آزادسازی انتهایی دوران فقط با چگالش استاتیکی و برای درجات آزادی محلی مشخص‌شده؛ بدون آزادسازی انتقالی یا فنر اتصال","بدون کنترل آیین‌نامه‌ای مقاومت و اتصالات","بار گسترده فقط در قالب مؤلفه‌های یکنواخت محلی عضو پذیرفته می‌شود"],equilibrium};
}

function selfTest(){
 const E=200e9,G=77e9,A=0.01,Iy=8e-5,Iz=2e-5,J=1e-5,L=3;
 const section={E,G,A,Iy,Iz,J};
 const makeModel=()=>({nodes:[{id:"FIX",x:0,y:0,z:0},{id:"TIP",x:L,y:0,z:0}],members:[{id:"TEST",start:"FIX",end:"TIP",type:"validation"}]});
 const base={supports:[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}],sectionResolver:()=>section};
 const close=(actual,expected,tol)=>Math.abs(actual-expected)<=Math.max(Math.abs(expected)*tol,1e-12);
 const tests=[];
 const run=(name,load,read,expected)=>{
  try{
   const result=analyze(makeModel(),{...base,nodalLoads:[{nodeId:"TIP",values:load}]});
   const actual=read(result),ok=close(actual,expected,1e-7)&&result.equilibrium.ok;
   tests.push({name,ok,actual,expected,equilibrium:result.equilibrium.ok});
  }catch(e){tests.push({name,ok:false,error:String(e.message||e)});}
 };
 run("axial-extension",[1000,0,0,0,0,0],r=>r.displacements.find(n=>n.nodeId==="TIP").values[0],1000*L/(E*A));
 run("cantilever-y-deflection",[0,-1000,0,0,0,0],r=>Math.abs(r.displacements.find(n=>n.nodeId==="TIP").values[1]),1000*Math.pow(L,3)/(3*E*Iz));
 run("torsional-rotation",[0,0,0,1000,0,0],r=>Math.abs(r.displacements.find(n=>n.nodeId==="TIP").values[3]),1000*L/(G*J));

 // A uniformly loaded member with both bending rotations released must recover zero end moments.
 try{
  const q=-1200,model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],members:[{id:"PIN",start:"A",end:"B",type:"validation",analysisLoad:{uniformLocal:[0,q,0]},endReleases:{i:[4,5],j:[4,5]}}]};
  const result=analyze(model,{...base,supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]},{nodeId:"B",fixedDofs:[0,1,2,3,4,5]}]});
  const end=result.members[0].localEndForces;
  const maxMoment=Math.max(Math.abs(end[3]),Math.abs(end[4]),Math.abs(end[5]),Math.abs(end[9]),Math.abs(end[10]),Math.abs(end[11]));
  const expectedShear=Math.abs(q)*L/2;
  const shearOK=close(Math.abs(end[1]),expectedShear,1e-7)&&close(Math.abs(end[7]),expectedShear,1e-7);
  tests.push({name:"pinned-end-uniform-load-zero-end-moments",ok:maxMoment<1e-6&&shearOK&&result.equilibrium.ok,maxReleasedEndMomentNm:maxMoment,expectedEndShearN:expectedShear,equilibrium:result.equilibrium.ok});
 }catch(e){tests.push({name:"pinned-end-uniform-load-zero-end-moments",ok:false,error:String(e.message||e)});}
 try{
  const model={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:L,y:0,z:0}],members:[{id:"BAD",start:"A",end:"B",type:"validation",endReleases:{i:[3],j:[3]}}]};
  analyze(model,{...base});
  tests.push({name:"reject-double-torsion-release",ok:false});
 }catch(e){tests.push({name:"reject-double-torsion-release",ok:String(e.message||e).includes("پیچش")});}
 return{schemaVersion:1,passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok).length,total:tests.length,tests,note:"آزمون‌های تحلیلی عضو منفرد برای کنترل واحدها و قرارداد علامت؛ جایگزین اعتبارسنجی مستقل، آزمون همگرایی یا کنترل آیین‌نامه‌ای نیست."};
}
root.SteelFrame3D={analyze,selfTest,frameLocalStiffness,makeTransform,equivalentUniformLoad,solve};
})(typeof window!=="undefined"?window:globalThis);
