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
 assert.match(model3d,/analysis-3d-worker\.js\?v=20261119roll2/);
 assert.match(model3d,/model:analysisModel/);
 assert.match(model3d,/sectionsByMemberId/);
});
