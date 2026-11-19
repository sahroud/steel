"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

function loadWithFakeDOM(){
  const listeners=new Map();
  const ids=["foundationSoilPanel","soilControlEnabled","soilType","soilQa","soilSource","soilFootingB","soilFootingL","soilReactionCases","btnRunSoilCheck","soilCheckResult"];
  const elements=Object.fromEntries(ids.map(id=>[id,{
    id,dataset:{},disabled:false,checked:false,value:"",textContent:"",style:{},
    addEventListener(type,fn){listeners.set(id+":"+type,fn);}
  }]));
  elements.soilControlEnabled.checked=false;
  elements.soilType.value="II";
  elements.soilReactionCases.value=JSON.stringify([{name:"SLS-1",sourceReference:"Reaction report p.2",NkN:400,MxkNm:0,MzkNm:0}]);
  elements.soilQa.value="300";
  elements.soilSource.value="Geotechnical report G-1 p.4";
  elements.soilFootingB.value="2";
  elements.soilFootingL.value="2";
  const fakeWindow={document:{readyState:"complete",getElementById:id=>elements[id]||null}};
  global.window=fakeWindow;
  delete require.cache[require.resolve("../js/foundation-soil-check.js")];
  const api=require("../js/foundation-soil-check.js");
  return {api,elements,listeners};
}

test("existing soil panel initializes its controls and listeners exactly once",()=>{
  const {elements,listeners}=loadWithFakeDOM();
  assert.equal(elements.soilQa.disabled,true);
  assert.equal(elements.btnRunSoilCheck.disabled,true);
  assert.equal(listeners.has("soilControlEnabled:change"),true);
  // Re-rendering must not register duplicate listeners.
  const before=listeners.size;
  require("../js/foundation-soil-check.js").render();
  assert.equal(listeners.size,before);
  delete global.window;
});

test("enabling and running the soil panel executes the documented check",()=>{
  const {api,elements,listeners}=loadWithFakeDOM();
  elements.soilControlEnabled.checked=true;
  listeners.get("soilControlEnabled:change")();
  assert.equal(elements.soilQa.disabled,false);
  assert.equal(elements.btnRunSoilCheck.disabled,false);
  listeners.get("btnRunSoilCheck:click")();
  assert.match(elements.soilCheckResult.textContent,/کنترل فشار باربری در همه حالت‌های واردشده قبول شد/);
  assert.match(elements.soilCheckResult.textContent, /تیپ خاک: II \| مرجع خاک:/);
  assert.equal(api.lastResult.results[0].bearingPass,true);
  delete global.window;
});
