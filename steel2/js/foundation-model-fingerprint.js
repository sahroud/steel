/* SAHROUD STEEL — canonical source-model fingerprint shared by analysis and foundation takeoff. */
(function(root){
 "use strict";
 function build(model,context){
  if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members))throw new Error("مدل پایه برای ساخت اثرانگشت فونداسیون معتبر نیست.");
  const c=context||{};
  return JSON.stringify({
   geometry:model.geometry||null,
   nodes:model.nodes.map(n=>[n.id,n.x,n.y,n.z,n.kind]),
   members:model.members.map(m=>[m.id,m.start,m.end,m.sectionKey,m.lineLoads||{}]),
   tieBeamLayout:c.tieBeamLayout??null,
   loadSettings:c.loadSettings??null,
   sections:c.sections??null,
   support:c.support||"pinned"
  });
 }
 function selfTest(){
  const model={geometry:{span:12},nodes:[{id:"B1",x:0,y:0,z:0,kind:"base"}],members:[{id:"C1",start:"B1",end:"T1",sectionKey:"column",lineLoads:{dead:1}}]};
  const ctx={tieBeamLayout:{routes:[{id:"TB1",start:"B1",end:"B2",widthM:.6,heightM:.5}]},loadSettings:{combinations:[{dead:1}]},sections:{ST37:{E:2e11}},support:"fixed"};
  const base=build(model,ctx),same=build(JSON.parse(JSON.stringify(model)),JSON.parse(JSON.stringify(ctx)));
  const tie=build(model,{...ctx,tieBeamLayout:{routes:[{id:"TB1",start:"B1",end:"B2",widthM:.7,heightM:.5}]}});
  const loads=build(model,{...ctx,loadSettings:{combinations:[{dead:1.2}]}});
  const sections=build(model,{...ctx,sections:{ST37:{E:1.9e11}}});
  const support=build(model,{...ctx,support:"pinned"});
  const geometry=build({...model,geometry:{span:18}},ctx);
  const members=build({...model,members:[{...model.members[0],lineLoads:{dead:2}}]},ctx);
  const checks={sameInputsMatch:base===same,tieBeamChangeInvalidates:base!==tie,loadCombinationChangeInvalidates:base!==loads,sectionChangeInvalidates:base!==sections,supportChangeInvalidates:base!==support,geometryChangeInvalidates:base!==geometry,memberLoadChangeInvalidates:base!==members};
  return{passed:Object.values(checks).every(Boolean),checks};
 }
 root.SteelFoundationModelFingerprint={build,selfTest};
})(typeof window!=="undefined"?window:globalThis);
