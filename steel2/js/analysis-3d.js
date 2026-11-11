/* SAHROUD STEEL - 3D elastic frame solver core
 * 6 DOF/node, 12 DOF/member, SI units (N, m, Pa).
 * Linear first-order elastic analysis only. No releases, P-Delta, warping,
 * shear deformation, buckling, or code design checks in this version.
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
 const n=b.length,M=A.map((r,i)=>r.slice().concat(b[i]));
 let maxDiag=0;for(let i=0;i<n;i++)maxDiag=Math.max(maxDiag,Math.abs(M[i][i]));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(Math.abs(M[p][k])<Math.max(EPS,maxDiag*1e-12))throw Error("ماتریس سختی تکین یا سازه ناپایدار است؛ تکیه‌گاه‌ها، اتصالات و مهاربندی را بررسی کنید.");
  [M[k],M[p]]=[M[p],M[k]];
  const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;
  for(let i=0;i<n;i++){if(i===k)continue;const f=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j];}
 }
 return M.map(r=>r[n]);
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
function analyze(model,options){
 options=options||{};
 if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw Error("مدل هندسی معتبر ارائه نشده است.");
 const nodes=model.nodes, members=model.members, nodeMap=new Map(nodes.map((n,i)=>[n.id,i]));
 if(nodeMap.size!==nodes.length)throw Error("شناسه گره تکراری است.");
 const nDof=nodes.length*6,K=zeros(nDof,nDof),F=Array(nDof).fill(0),elements=[];
 const props=options.sectionResolver;
 if(typeof props!=="function")throw Error("تابع تخصیص خواص مقطع برای همه اعضا تعریف نشده است؛ تحلیل متوقف شد.");
 for(const m of members){
  const ia=nodeMap.get(m.start),ib=nodeMap.get(m.end);if(ia===undefined||ib===undefined)throw Error("گره ابتدا یا انتهای عضو "+m.id+" یافت نشد.");
  const p=props(m);if(!p)throw Error("مقطع عضو "+m.id+" ("+m.type+") تخصیص نیافته است.");
  for(const key of ["E","G","A","Iy","Iz","J"])if(!(Number.isFinite(Number(p[key]))&&Number(p[key])>0))throw Error("خاصیت "+key+" برای عضو "+m.id+" ناقص یا نامعتبر است.");
  const a=[nodes[ia].x,nodes[ia].y,nodes[ia].z],b=[nodes[ib].x,nodes[ib].y,nodes[ib].z];
  const tr=makeTransform(a,b,options.referenceAxis),kl=frameLocalStiffness(p,tr.L),kg=mul(transpose(tr.T),mul(kl,tr.T));
  const ids=Array.from({length:6},(_,i)=>ia*6+i).concat(Array.from({length:6},(_,i)=>ib*6+i));
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
 const Kff=free.map(i=>free.map(j=>K[i][j])),Ff=free.map(i=>F[i]),df=solve(Kff,Ff),D=Array(nDof).fill(0);
 free.forEach((id,i)=>D[id]=df[i]);
 const KD=K.map(r=>dot(r,D)),R=KD.map((v,i)=>v-F[i]);
 const results=elements.map(e=>{
  const dg=e.ids.map(i=>D[i]),dl=mul(e.T,dg.map(v=>[v])).map(r=>r[0]),q=mul(e.kl,dl.map(v=>[v])).map(r=>r[0]);
  const end=q.map((v,i)=>v-e.fl[i]);
  return {id:e.member.id,type:e.member.type,length:e.L,localEndForces:end,localAxes:e.axes,section:e.props};
 });
 const maxTranslation=Math.max(0,...nodes.map((n,i)=>Math.hypot(D[i*6],D[i*6+1],D[i*6+2])));
 const reactions=nodes.map((n,i)=>({nodeId:n.id,values:R.slice(i*6,i*6+6)})).filter(x=>x.values.some(v=>Math.abs(v)>1e-8));
 return {success:true,method:"3D linear elastic direct stiffness",units:"N,m,Pa",nodeCount:nodes.length,memberCount:members.length,displacements:nodes.map((n,i)=>({nodeId:n.id,values:D.slice(i*6,i*6+6)})),reactions,members:results,maxTranslation,limitations:["تحلیل خطی مرتبه اول","بدون اثر P-Delta و تحلیل کمانش","بدون تغییرشکل برشی و وارپینگ پیچشی","بدون آزادسازی انتهایی عضو","بدون کنترل آیین‌نامه‌ای مقاومت و اتصالات","بار گسترده فقط در قالب مؤلفه‌های یکنواخت محلی عضو پذیرفته می‌شود"],equilibrium:{appliedLoadSum:F.reduce((s,v)=>s+v,0),freeDofCount:free.length}};
}
root.SteelFrame3D={analyze,frameLocalStiffness,makeTransform,equivalentUniformLoad,solve};
})(typeof window!=="undefined"?window:globalThis);
