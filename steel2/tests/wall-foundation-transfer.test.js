const test=require("node:test");
const assert=require("node:assert/strict");
const {createWallFoundationLoadTransfer}=require("../js/wall-foundation-transfer.js");
function fixture(){
 const nodes=[
  {id:"L0",x:0,y:0,z:0,kind:"base"},{id:"L1",x:0,y:0,z:5,kind:"base"},{id:"L2",x:0,y:0,z:10,kind:"base"},
  {id:"R0",x:10,y:0,z:0,kind:"base"},{id:"R1",x:10,y:0,z:5,kind:"base"},{id:"R2",x:10,y:0,z:10,kind:"base"},
  {id:"F1",x:5,y:0,z:0,kind:"endwall-base"},{id:"B1",x:5,y:0,z:10,kind:"endwall-base"}
 ];
 return {model:{geometry:{span:10,length:10,height:4,rise:2},nodes},deadFactor:1,loads:{wallDeadLeft:0,wallDeadRight:0,endWallDeadFront:0,endWallDeadBack:0}};
}
test("side wall collector transfers full wall area load to frame base supports",()=>{
 const x=fixture();x.loads.wallDeadLeft=0.5;
 const r=createWallFoundationLoadTransfer(x);
 assert.equal(r.resultantKN,0.5*4*10);
 assert.equal(r.nodalLoads.reduce((s,n)=>s-n.values[1]/1000,0),20);
 assert.ok(Math.abs(r.equilibriumResidualKN)<1e-10);
});
test("gable end wall collector includes rectangle and triangular area exactly",()=>{
 const x=fixture();x.loads.endWallDeadFront=0.4;
 const r=createWallFoundationLoadTransfer(x);
 assert.equal(r.expectedKN,0.4*(10*4+10*2/2));
 assert.ok(Math.abs(r.resultantKN-r.expectedKN)<1e-10);
 assert.equal(r.nodalLoads.length,3);
});
test("dead load factor scales equivalent foundation reactions",()=>{
 const x=fixture();x.loads.wallDeadRight=0.5;x.deadFactor=1.4;
 const r=createWallFoundationLoadTransfer(x);
 assert.equal(r.expectedKN,0.5*4*10*1.4);
});
test("rejects missing support stations instead of silently dropping wall weight",()=>{
 const x=fixture();x.loads.wallDeadLeft=0.5;x.model.nodes=x.model.nodes.filter(n=>n.id!=="L2");
 assert.throws(()=>createWallFoundationLoadTransfer(x),/تمام طول دیوار/);
});
test("collector explicitly does not claim a finite element shell or completed foundation",()=>{
 const x=fixture();const r=createWallFoundationLoadTransfer(x);
 assert.equal(r.isFiniteElementShell,false);assert.equal(r.foundationDesignPending,true);
});
