/* SAHROUD STEEL — wall shell/load-collector to foundation support transfer.
 * This is an equivalent tributary-load collector, NOT a finite-element shell.
 * It distributes wall dead-load area pressure to the actual modeled base support
 * stations. Foundation/grade-beam design remains pending until those elements exist.
 */
(function(root){
 "use strict";
 const TOL=1e-7;
 function finitePositive(v,label,allowZero){
  const n=Number(v);
  if(!Number.isFinite(n)||(allowZero?n<0:n<=0))throw new Error(label+" نامعتبر است.");
  return n;
 }
 function distributeSegment(qA,qB,L){
  // Exact consistent nodal loads for a linearly varying distributed load.
  return [L*(2*qA+qB)/6,L*(qA+2*qB)/6];
 }
 function createWallFoundationLoadTransfer(input){
  const d=input||{},model=d.model||{},g=model.geometry||{},nodes=Array.isArray(model.nodes)?model.nodes:[];
  const loads=d.loads||{},factor=finitePositive(d.deadFactor,"ضریب بار مرده",true);
  const span=finitePositive(g.span,"دهانه سوله",false),length=finitePositive(g.length,"طول سوله",false),
   height=finitePositive(g.height,"ارتفاع دیوار",false),rise=finitePositive(g.rise||0,"ارتفاع تاج",true);
  if(!nodes.length)throw new Error("گره‌های مدل برای انتقال وزن دیوار در دسترس نیستند.");
  const baseNodes=nodes.filter(n=>["base","endwall-base"].includes(n.kind)&&
   Number.isFinite(Number(n.x))&&Number.isFinite(Number(n.y))&&Number.isFinite(Number(n.z))&&Math.abs(Number(n.y))<TOL);
  const nodeById=new Map(baseNodes.map(n=>[String(n.id),n]));
  const totals=new Map(),ledger=[];
  function add(node,kn,source,station){
   if(!nodeById.has(String(node.id))||!Number.isFinite(kn)||kn< -1e-9)throw new Error("واکنش معادل پوسته دیوار به گره پایه معتبر نیست.");
   const value=Math.max(0,kn)*factor;
   totals.set(String(node.id),(totals.get(String(node.id))||0)+value);
   ledger.push({source,nodeId:String(node.id),stationM:station,resultantKN:value});
  }
  const sideDefs=[{key:"wallDeadLeft",x:0,label:"دیوار طولی چپ"},{key:"wallDeadRight",x:span,label:"دیوار طولی راست"}];
  sideDefs.forEach(side=>{
   const p=finitePositive(loads[side.key]||0,side.label+" ـ وزن سطحی",true);
   if(!p||!factor)return;
   const supports=baseNodes.filter(n=>Math.abs(Number(n.x)-side.x)<TOL&&Number(n.z)>=-TOL&&Number(n.z)<=length+TOL)
    .sort((a,b)=>Number(a.z)-Number(b.z));
   if(supports.length<2)throw new Error("برای "+side.label+" حداقل دو گره پایه در ابتدا و انتهای طول لازم است.");
   if(Math.abs(Number(supports[0].z))>TOL||Math.abs(Number(supports[supports.length-1].z)-length)>TOL)
    throw new Error("تکیه‌گاه‌های "+side.label+" تمام طول دیوار را پوشش نمی‌دهند.");
   const q=p*height;
   for(let i=0;i<supports.length-1;i++){
    const a=supports[i],b=supports[i+1],L=Number(b.z)-Number(a.z);
    if(!(L>TOL))throw new Error("ایستگاه‌های پایه "+side.label+" تکراری یا نامرتب هستند.");
    const [ra,rb]=distributeSegment(q,q,L);
    add(a,ra,side.label,Number(a.z));add(b,rb,side.label,Number(b.z));
   }
  });
  [{key:"endWallDeadFront",z:0,label:"دیوار انتهایی جلو"},{key:"endWallDeadBack",z:length,label:"دیوار انتهایی عقب"}].forEach(face=>{
   const p=finitePositive(loads[face.key]||0,face.label+" ـ وزن سطحی",true);
   if(!p||!factor)return;
   const supports=baseNodes.filter(n=>Math.abs(Number(n.z)-face.z)<TOL&&Number(n.x)>=-TOL&&Number(n.x)<=span+TOL)
    .sort((a,b)=>Number(a.x)-Number(b.x));
   if(supports.length<2)throw new Error("برای "+face.label+" حداقل دو گره پایه در دو انتهای دهانه لازم است.");
   if(Math.abs(Number(supports[0].x))>TOL||Math.abs(Number(supports[supports.length-1].x)-span)>TOL)
    throw new Error("تکیه‌گاه‌های "+face.label+" تمام عرض دیوار را پوشش نمی‌دهند.");
   const roofY=x=>height+rise*(x<=span/2?x/(span/2):(span-x)/(span/2));
   for(let i=0;i<supports.length-1;i++){
    const a=supports[i],b=supports[i+1],x0=Number(a.x),x1=Number(b.x),L=x1-x0;
    if(!(L>TOL))throw new Error("ایستگاه‌های پایه "+face.label+" تکراری یا نامرتب هستند.");
    const qA=p*roofY(x0),qB=p*roofY(x1),[ra,rb]=distributeSegment(qA,qB,L);
    add(a,ra,face.label,x0);add(b,rb,face.label,x1);
   }
  });
  const nodalLoads=Array.from(totals,([nodeId,kn])=>({nodeId,values:[0,-kn*1000,0,0,0,0]}));
  const resultantKN=nodalLoads.reduce((s,n)=>s-n.values[1]/1000,0);
  const sourceAreaKN=(
   (Number(loads.wallDeadLeft)||0)+(Number(loads.wallDeadRight)||0)
  )*height*length+
  ((Number(loads.endWallDeadFront)||0)+(Number(loads.endWallDeadBack)||0))*(span*height+span*rise/2);
  const expectedKN=sourceAreaKN*factor;
  const residualKN=resultantKN-expectedKN;
  if(Math.abs(residualKN)>Math.max(1e-7,expectedKN*1e-9))
   throw new Error("تعادل انتقال وزن پوسته دیوار برقرار نیست؛ اختلاف بار کل "+residualKN+" kN.");
  return Object.freeze({method:"tributary-wall-shell-equivalent-nodal-loads",
   isFiniteElementShell:false,foundationElementModelled:false,foundationDesignPending:true,
   nodalLoads:Object.freeze(nodalLoads.map(n=>Object.freeze(n))),
   ledger:Object.freeze(ledger.map(x=>Object.freeze(x))),
   sourceAreaKN,resultantKN,expectedKN,equilibriumResidualKN:residualKN,
   note:"پوسته در این نسخه به‌صورت جمع‌کننده بار سطحی و تبدیل دقیق بار خطی/مثلثی به واکنش گره‌های پایه مدل شده است؛ المان پوسته‌ای FE، شناژ و پی هنوز مدل نشده‌اند. واکنش‌ها تا تکمیل مدل شناژ/فونداسیون، ورودی دفتر بارهای پی هستند و تأیید طراحی پی محسوب نمی‌شوند."
  });
 }
 root.SahroudWallFoundationTransfer=Object.freeze({createWallFoundationLoadTransfer});
 if(typeof module!=="undefined"&&module.exports)module.exports=root.SahroudWallFoundationTransfer;
})(typeof globalThis!=="undefined"?globalThis:this);
