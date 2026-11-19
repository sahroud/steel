"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const registry=require("../js/section-property-registry.js");
const section=(extra={})=>({
 profile:"Built-up I",A:0.02,Iy:0.00008,Iz:0.0009,J:0.000001,
 E:200e9,G:77e9,SxTop:0.00008,SxBottom:0.00009,Sy:0.00002,...extra
});
test("registry assigns one normalized SI section to every member",()=>{
 const model={members:[{id:"C1",sectionKey:"column"},{id:"R1",sectionKey:"rafter"}]};
 const audit=registry.apply(model,[
  {memberId:"C1",section:section()},
  {memberId:"R1",section:section({profile:"Rafter plate girder",A:0.025})}
 ]);
 assert.equal(audit.complete,true);
 assert.equal(audit.assignedCount,2);
 assert.equal(model.members[0].sectionProperties.profile,"Built-up I");
 assert.equal(model.members[1].sectionProperties.A,0.025);
 assert.equal(model.members[0].sectionProperties.massPerMeterKg,157);
 assert.ok(model.members[0].sectionProperties.radiusY>0);
 assert.ok(model.members[0].sectionPropertyFingerprint);
});
test("changing any section property changes the fingerprint and member schedule",()=>{
 const member={id:"P1",sectionKey:"roofPurlin"};
 const first=registry.applyOne(member,section());
 const old=first.sectionPropertyFingerprint;
 const next=registry.applyOne(member,section({A:0.03,Iy:0.00012}));
 assert.notEqual(next.sectionPropertyFingerprint,old);
 assert.equal(member.sectionProperties.massPerMeterKg,235.5);
 assert.equal(registry.get({members:[member]},"P1").A,0.03);
});
test("registry rejects missing or extra member mappings",()=>{
 const model={members:[{id:"C1"}]};
 const missing=registry.apply(model,[]);
 assert.equal(missing.complete,false);
 assert.deepEqual(missing.missing,["C1"]);
 assert.throws(()=>registry.apply(model,[{memberId:"other",section:section()}]),/خارج از مدل/);
});
test("registry rejects invalid or incomplete engineering properties",()=>{
 assert.throws(()=>registry.normalize({...section(),J:0},"C1"),/J/);
 assert.throws(()=>registry.normalize({...section(),E:null},"C1"),/E/);
});

test("section fingerprints include profile and geometric dimensions",()=>{
 const a=registry.normalize({...section(),profile:"Plate girder",geometryType:"built-up-I",geometryDimensionsMm:{webClearHeightMm:500}},"G1");
 const b=registry.normalize({...section(),profile:"Plate girder",geometryType:"built-up-I",geometryDimensionsMm:{webClearHeightMm:600}},"G1");
 const c=registry.normalize({...section(),profile:"IPE 300"},"G1");
 assert.notEqual(a.sectionPropertyFingerprint,b.sectionPropertyFingerprint);
 assert.notEqual(a.sectionPropertyFingerprint,c.sectionPropertyFingerprint);
});

test("steel takeoff sums each unique member actual length times its section mass per metre",()=>{
 const members=[
  {id:"C1",sectionKey:"column",length:6,sectionProperties:registry.normalize(section({profile:"Plate I",A:0.02}),"C1")},
  {id:"R1",sectionKey:"rafter",length:8,sectionProperties:registry.normalize(section({profile:"Plate I",A:0.02}),"R1")},
  {id:"P1",sectionKey:"purlin",length:5,sectionProperties:registry.normalize(section({profile:"Z",A:0.01}),"P1")}
 ];
 const model={members,sectionPropertyAudit:{complete:true,memberCount:3}};
 const result=registry.takeoff(model);
 assert.equal(result.memberCount,3);
 assert.equal(result.totalLengthM,19);
 assert.equal(result.totalMassKg,14*157+5*78.5);
 assert.equal(result.items.length,3);
 assert.equal(result.groups.length,2);
});
test("steel takeoff refuses stale, incomplete, duplicate or invalid-length models",()=>{
 const member={id:"C1",length:6,sectionProperties:registry.normalize(section(),"C1")};
 assert.throws(()=>registry.takeoff({members:[member],sectionPropertiesDirty:true,sectionPropertyAudit:{complete:true,memberCount:1}}),/تغییر/);
 assert.throws(()=>registry.takeoff({members:[member],sectionPropertyAudit:{complete:false,memberCount:1}}),/کامل/);
 assert.throws(()=>registry.takeoff({members:[member,{...member}],sectionPropertyAudit:{complete:true,memberCount:2}}),/تکراری/);
 assert.throws(()=>registry.takeoff({members:[{...member,length:0}],sectionPropertyAudit:{complete:true,memberCount:1}}),/طول واقعی/);
});
