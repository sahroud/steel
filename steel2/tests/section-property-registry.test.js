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
