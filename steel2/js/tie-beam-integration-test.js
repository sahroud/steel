/* SAHROUD STEEL - isolated concrete tie-beam integration verification.
 * Two footing nodes, two column stubs, one concrete tie beam.
 * This is a solver integration test, not a footing or reinforcement design.
 */
(function(root){
 "use strict";
 function section(b,h){
  const J= Math.max(b,h)*Math.pow(Math.min(b,h),3)*(1/3-0.21*(Math.min(b,h)/Math.max(b,h))*(1-Math.pow(Math.min(b,h)/Math.max(b,h),4)/12));
  return {E:23.5e9,G:9.8e9,A:b*h,Iy:h*Math.pow(b,3)/12,Iz:b*Math.pow(h,3)/12,J};
 }
 function runOne(axis,joint){
  const along=axis==="X";
  const A0={id:"A_BASE",x:0,y:0,z:0,kind:"base"};
  const A1={id:"A_TOP",x:0,y:3,z:0,kind:"column-top"};
  const B0={id:"B_BASE",x:along?6:0,y:0,z:along?0:6,kind:"base"};
  const B1={id:"B_TOP",x:B0.x,y:3,z:B0.z,kind:"column-top"};
  const w=0.60*0.50*25*1000; // 7,500 N/m; concrete self-weight exactly once.
  const beam={id:"TB_TEST",start:A0.id,end:B0.id,type:"concrete-tie-beam",sectionKey:"tieBeam",
    // Joint datum = top of footing and top of tie beam; centroidal axis is h/2 below.
    endOffsets:{i:[0,-0.25,0],j:[0,-0.25,0]},
    analysisLoad:{uniformLocal:along?[0,-w,0]:[0,0,-w]}};
  if(joint==="pinned")beam.endReleases={i:[4,5],j:[4,5]};
  const model={nodes:[A0,A1,B0,B1],members:[
   {id:"COL_A",start:A0.id,end:A1.id,type:"column-stub",sectionKey:"columnStub"},
   {id:"COL_B",start:B0.id,end:B1.id,type:"column-stub",sectionKey:"columnStub"},
   beam
  ]};
  const result=root.SteelFrame3D.analyze(model,{
   sectionResolver:m=>m.sectionKey==="tieBeam"?section(0.60,0.50):section(0.40,0.40),
   supports:[
    {nodeId:A0.id,fixedDofs:[0,1,2]},
    {nodeId:B0.id,fixedDofs:[0,1,2]},
    {nodeId:A1.id,fixedDofs:[0,1,2,3,4,5]},
    {nodeId:B1.id,fixedDofs:[0,1,2,3,4,5]}
   ]
  });
  const tie=result.members.find(m=>m.id==="TB_TEST");
  const moments=[tie.localEndForces[4],tie.localEndForces[5],tie.localEndForces[10],tie.localEndForces[11]];
  const maxMoment=Math.max(...moments.map(Math.abs));
  const verticalReaction=result.reactions.reduce((s,r)=>s+r.values[1],0);
  const expectedWeight=w*6;
  const reactionError=Math.abs(verticalReaction-expectedWeight)/expectedWeight;
  const momentOK=joint==="pinned"?maxMoment<1e-5:maxMoment>1;
  const offsetOK=Array.isArray(beam.endOffsets?.i)&&beam.endOffsets.i[1]===-0.25&&beam.endOffsets.j[1]===-0.25;
  return {axis,joint,success:result.success,equilibrium:result.equilibrium.ok,
   centroidOffsetDownM:0.25,topAlignmentVerified:offsetOK,
   expectedSelfWeightN:expectedWeight,verticalSupportReactionN:verticalReaction,
   relativeVerticalReactionError:reactionError,maxTieEndBendingMomentNm:maxMoment,
   endReleases:tie.endReleases,passed:result.success&&result.equilibrium.ok&&reactionError<1e-6&&momentOK&&offsetOK};
 }
 function run(){
  const cases=[];
  for(const axis of ["X","Z"])for(const joint of ["rigid","pinned"]){
   try{cases.push(runOne(axis,joint));}
   catch(e){cases.push({axis,joint,passed:false,error:String(e&&e.message||e)});}
  }
  return {schemaVersion:1,total:cases.length,passed:cases.filter(x=>x.passed).length,
   failed:cases.filter(x=>!x.passed).length,cases,
   note:"مدل مستقل دو ستونک و یک شناژ؛ رویه بالای شناژ با تراز بالای پی هم‌سطح و محور هندسی شناژ 0.25m پایین‌تر از گره‌های پایه مدل شده است. وزن بتن 7.5 kN/m فقط یک‌بار به‌صورت بار گسترده وارد شده است. این آزمون، اتصال واقعی آرماتورها، ظرفیت پی، مهاری، ترک‌خوردگی بتن یا ضوابط لرزه‌ای را تأیید نمی‌کند."};
 }
 root.SteelTieBeamIntegrationTest={run};
})(typeof window!=="undefined"?window:globalThis);
