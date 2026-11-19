"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const registry=require("../js/section-property-registry.js");
function withGeometry(members){
 const nodes=[];
 members.forEach((member,i)=>{
  const x=i*20, start="N"+(i*2+1), end="N"+(i*2+2);
  member.start=start;member.end=end;
  nodes.push({id:start,x,y:0,z:0},{id:end,x:x+Number(member.length),y:0,z:0});
 });
 return {units:{length:"m",coordinates:"m",memberLength:"m"},nodes,members};
}
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
 const model=withGeometry(members);
 model.sectionPropertyAudit={complete:true,memberCount:members.length};
 const result=registry.takeoff(model);
 assert.equal(result.memberCount,3);
 assert.equal(result.totalLengthM,19);
 assert.equal(result.totalMassKg,14*157+5*78.5);
 assert.equal(result.items.length,3);
 assert.equal(result.groups.length,3);
});
test("steel takeoff refuses stale, incomplete, duplicate or invalid-length models",()=>{
 const member={id:"C1",length:6,sectionProperties:registry.normalize(section(),"C1")};
 const model=withGeometry([member]);
 model.sectionPropertyAudit={complete:true,memberCount:1};
 model.sectionPropertiesDirty=true;
 assert.throws(()=>registry.takeoff(model),/تغییر/);
 model.sectionPropertiesDirty=false;model.sectionPropertyAudit.complete=false;
 assert.throws(()=>registry.takeoff(model),/کامل/);
 const duplicate=withGeometry([{...member},{...member}]);duplicate.sectionPropertyAudit={complete:true,memberCount:2};
 assert.throws(()=>registry.takeoff(duplicate),/تکراری/);
 const invalid=withGeometry([{...member,length:0}]);invalid.sectionPropertyAudit={complete:true,memberCount:1};
 assert.throws(()=>registry.takeoff(invalid),/طول ذخیره‌شده|طول هندسی/);
});

test("geometry audit verifies explicit metre units and member lengths against endpoint coordinates",()=>{
 const member={id:"M1",length:5,start:"A",end:"B"};
 const model={units:{length:"m",coordinates:"m",memberLength:"m"},nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:3,y:4,z:0}],members:[member]};
 const audit=registry.auditGeometry(model);
 assert.equal(audit.complete,true);
 assert.equal(audit.checkedCount,1);
 assert.equal(audit.items[0].geometricLengthM,5);
});
test("geometry audit blocks missing units, missing endpoints and mismatched stored lengths",()=>{
 const base={units:{length:"m",coordinates:"m",memberLength:"m"},nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:3,y:4,z:0}],members:[{id:"M1",length:6,start:"A",end:"B"}]};
 assert.equal(registry.auditGeometry(base).complete,false);
 const missing={...base,units:{},members:[{id:"M2",length:5,start:"A",end:"missing"}]};
 assert.equal(registry.auditGeometry(missing).complete,false);
 const noUnits={...base,units:{},members:[{id:"M3",length:5,start:"A",end:"B"}]};
 assert.equal(registry.auditGeometry(noUnits).complete,false);
});
test("takeoff rejects geometry without a complete coordinate audit",()=>{
 const model=withGeometry([{id:"C1",length:6,sectionProperties:registry.normalize(section(),"C1")}]);
 model.sectionPropertyAudit={complete:true,memberCount:1};
 model.members[0].length=7;
 assert.throws(()=>registry.takeoff(model),/ممیزی هندسه/);
});

test("section roll and explicit orientation confirmation are fingerprinted and assigned to members",()=>{
 const member={id:"R-ROLL",sectionKey:"rafter"};
 const a=registry.applyOne(member,section({sectionRollDeg:0,sectionOrientationConfirmed:false}));
 const first=a.sectionPropertyFingerprint;
 assert.equal(member.sectionRollDeg,0);
 assert.equal(member.sectionOrientationVerified,false);
 const b=registry.applyOne(member,section({sectionRollDeg:90,sectionOrientationConfirmed:true}));
 assert.notEqual(b.sectionPropertyFingerprint,first);
 assert.equal(member.sectionRollDeg,90);
 assert.equal(member.sectionOrientationVerified,true);
 const c=registry.applyOne(member,section({sectionRollDeg:-90,sectionOrientationConfirmed:true}));
 assert.notEqual(c.sectionPropertyFingerprint,b.sectionPropertyFingerprint);
 assert.equal(member.sectionRollDeg,-90);
});
test("section roll rejects non-finite values before solver consumption",()=>{
 const member={id:"R-BAD"};
 const invalid=registry.normalize(section({sectionRollDeg:NaN}),"R-BAD");
 assert.ok(Number.isNaN(invalid.sectionRollDeg));
});
