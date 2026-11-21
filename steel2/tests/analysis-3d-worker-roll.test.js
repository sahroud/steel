"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const worker=fs.readFileSync(path.join(__dirname,"../js/analysis-3d-worker.js"),"utf8");
const model3d=fs.readFileSync(path.join(__dirname,"../js/model-3d.js"),"utf8");
test("background worker imports the cache-busted solver and resolves member-specific section data",()=>{
 assert.match(worker,/importScripts\("\.\/analysis-3d\.js\?v=20261120endrelease1"\)/);
 assert.match(worker,/self\.SteelFrame3D\.analyze\(data\.model/);
 assert.match(worker,/sections\[String\(member\.id\)\]/);
});
test("model runner cache-busts the worker and sends the full analysis model",()=>{
 assert.match(model3d,/analysis-3d-worker\.js\?v=20261120endrelease1/);
 assert.match(model3d,/model:analysisModel/);
 assert.match(model3d,/sectionsByMemberId/);
});

test("worker forwards explicit member end releases unchanged into the solver model",()=>{
 const vm=require("node:vm");
 const source=fs.readFileSync(path.join(__dirname,"../js/analysis-3d-worker.js"),"utf8");
 let captured=null,posted=null;
 const scope={
  importScripts(){scope.SteelFrame3D={analyze(model,options){captured={model,options};return {success:true,memberCount:model.members.length};}};},
  postMessage(value){posted=value;}
 };
 scope.self=scope;
 vm.runInNewContext(source,scope);
 const model={nodes:[{id:"A"},{id:"B"}],members:[{id:"BRACE",sectionKey:"wallBrace",endReleases:{i:["rx","ry","rz"]}}]};
 scope.onmessage({data:{model,sectionsByMemberId:{BRACE:{A:1}},supports:[],nodalLoads:[]}});
 assert.deepEqual(JSON.parse(JSON.stringify(captured.model.members[0].endReleases)),{i:["rx","ry","rz"]});
 assert.equal(posted.ok,true);
 assert.equal(posted.result.memberCount,1);
});
