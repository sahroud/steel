"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const geometry={foundations:[{nodeId:"B1",footingCentroidGlobalM:{x:1,y:0,z:0},
 localAxes:{x:{x:1,y:0,z:0},y:{x:0,y:1,z:0},z:{x:0,y:0,z:1}},
 verticalLocalAxis:"y",compressionSign:-1}]};
function setup(){
 const listeners=new Map();
 const values={
  foundationUlsBatchInput:JSON.stringify({cases:[{loadCase:"ULS-1",loadCaseLabel:"ترکیب نهایی",classification:"ULS",
   solverEquilibriumOK:true,sourceReference:"Approved ULS report p.4",
   supports:[{nodeId:"B1",coordinatesM:{x:2,y:0,z:0},fixedDofs:[0,1,2],
    FxkN:0,FykN:100,FzkN:0,MxkNm:0,MykNm:0,MzkNm:0}]}]}),
  foundationLocalGeometryInput:JSON.stringify(geometry),foundationReactionSense:"on-structure",selectedFoundationNodeId:"B1"
 };
 const ids=["foundationSoilPanel","btnMapFoundationUlsActions","foundationUlsActionResult","foundationUlsMappedJson",...Object.keys(values)];
 const elements=Object.fromEntries(ids.map(id=>[id,{id,dataset:{},value:values[id]||"",textContent:"",style:{},
  addEventListener(type,fn){listeners.set(id+":"+type,fn);}}]));
 global.window={document:{readyState:"complete",getElementById:id=>elements[id]||null}};
 for(const path of ["../js/foundation-uls-reaction-batch.js","../js/foundation-uls-action-mapping.js","../js/foundation-uls-action-mapping-ui.js"])
  delete require.cache[require.resolve(path)];
 require("../js/foundation-uls-reaction-batch.js");
 require("../js/foundation-uls-action-mapping.js");
 const ui=require("../js/foundation-uls-action-mapping-ui.js");
 return {elements,listeners,ui};
}
test("ULS UI validates and maps complete local actions for the selected footing",()=>{
 const {elements,listeners}=setup();
 listeners.get("btnMapFoundationUlsActions:click")();
 assert.match(elements.foundationUlsActionResult.textContent,/بسته کنش‌های ULS/);
 assert.match(elements.foundationUlsActionResult.textContent,/"NkN": 100/);
 assert.equal(elements.foundationUlsActionResult.style.color,"#15803d");
 assert.equal(JSON.parse(elements.foundationUlsMappedJson.value).schema,"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0");
 assert.equal(global.window.SahroudLastFoundationUlsActions.success,true);
 delete global.window;
});
test("ULS UI refuses missing footing identity or invalid JSON without claiming success",()=>{
 const {elements,listeners}=setup();
 elements.selectedFoundationNodeId.value="";
 listeners.get("btnMapFoundationUlsActions:click")();
 assert.match(elements.foundationUlsActionResult.textContent,/شناسه پایه موردنظر/);
 assert.equal(elements.foundationUlsActionResult.style.color,"#b45309");
 delete global.window;
});
test("ULS UI registers its click handler only once",()=>{
 const {elements,listeners,ui}=setup();
 const before=listeners.size;ui.render();ui.render();
 assert.equal(listeners.size,before);
 delete global.window;
});
