"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

function setup(){
 const listeners=new Map(),ids=[
  "foundationSoilPanel","btnMapFoundationActions","foundationLocalGeometryInput",
  "foundationReactionSense","selectedFoundationNodeId","foundationSlsBatchInput",
  "foundationActionMappingResult","soilReactionCases"
 ];
 const elements=Object.fromEntries(ids.map(id=>[id,{
  id,dataset:{},disabled:false,value:"",textContent:"",style:{},
  addEventListener(type,fn){listeners.set(id+":"+type,fn);}
 }]));
 elements.foundationReactionSense.value="on-structure";
 elements.selectedFoundationNodeId.value="B1";
 elements.foundationSlsBatchInput.value=JSON.stringify({cases:[{
  loadCase:"SLS-1",loadCaseLabel:"SLS service",classification:"SLS",
  solverEquilibriumOK:true,sourceReference:"Approved SLS report p.4",
  supports:[{nodeId:"B1",coordinatesM:{x:2,y:0,z:0},fixedDofs:[0,1,2],
   FxkN:0,FykN:100,FzkN:0,MxkNm:0,MykNm:0,MzkNm:0}]
 }]});
 elements.foundationLocalGeometryInput.value=JSON.stringify({foundations:[{
  nodeId:"B1",footingCentroidGlobalM:{x:1,y:0,z:0},
  localAxes:{x:{x:1,y:0,z:0},y:{x:0,y:1,z:0},z:{x:0,y:0,z:1}},
  verticalLocalAxis:"y",compressionSign:-1
 }]});
 global.window={document:{readyState:"complete",getElementById:id=>elements[id]||null}};
 for(const path of ["../js/foundation-reaction-batch.js","../js/foundation-action-mapping.js","../js/foundation-action-mapping-ui.js"])
  delete require.cache[require.resolve(path)];
 require("../js/foundation-reaction-batch.js");
 require("../js/foundation-action-mapping.js");
 const ui=require("../js/foundation-action-mapping-ui.js");
 return {elements,listeners,ui};
}

test("mapping UI converts validated SLS reactions and fills soil-check cases for selected footing",()=>{
 const {elements,listeners}=setup();
 listeners.get("btnMapFoundationActions:click")();
 const cases=JSON.parse(elements.soilReactionCases.value);
 assert.equal(cases.length,1);
 assert.equal(cases[0].name,"SLS-1");
 assert.equal(cases[0].NkN,100);
 assert.equal(cases[0].MzkNm,-100);
 assert.match(elements.foundationActionMappingResult.textContent,/تبدیل واکنش‌ها برای پایه B1 انجام شد/);
 assert.equal(elements.foundationActionMappingResult.style.color,"#15803d");
 delete global.window;
});

test("mapping UI refuses an unknown selected support and does not overwrite soil cases",()=>{
 const {elements,listeners}=setup();
 elements.selectedFoundationNodeId.value="B99";
 elements.soilReactionCases.value="keep-existing";
 listeners.get("btnMapFoundationActions:click")();
 assert.equal(elements.soilReactionCases.value,"keep-existing");
 assert.match(elements.foundationActionMappingResult.textContent,/شناسه پایه انتخاب‌شده/);
 delete global.window;
});

test("mapping UI refuses missing reaction direction or invalid local footing geometry",()=>{
 const {elements,listeners}=setup();
 elements.foundationReactionSense.value="";
 listeners.get("btnMapFoundationActions:click")();
 assert.match(elements.foundationActionMappingResult.textContent,/جهت واکنش/);
 elements.foundationReactionSense.value="on-structure";
 elements.foundationLocalGeometryInput.value="{bad";
 listeners.get("btnMapFoundationActions:click")();
 assert.match(elements.foundationActionMappingResult.textContent,/تبدیل واکنش‌ها انجام نشد/);
 delete global.window;
});

test("rendering mapping UI twice does not register duplicate handlers",()=>{
 const {elements,listeners,ui}=setup();
 const before=listeners.size;
 ui.render();ui.render();
 assert.equal(listeners.size,before);
 assert.equal(elements.foundationSoilPanel.dataset.actionMappingUiInitialized,"true");
 delete global.window;
});
