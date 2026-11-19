"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

function loadPanel(){
  const listeners=new Map();
  const ids=[
    "foundationSoilPanel","soilControlEnabled","soilType","soilQa","soilSource",
    "soilFootingB","soilFootingL","soilReactionCases","btnRunSoilCheck","soilCheckResult",
    "foundationSlsBatchInput","btnValidateFoundationSlsBatch","foundationSlsBatchResult"
  ];
  const elements=Object.fromEntries(ids.map(id=>[id,{
    id,dataset:{},disabled:false,checked:false,value:"",textContent:"",style:{},
    addEventListener(type,fn){listeners.set(id+":"+type,fn);}
  }]));
  elements.soilControlEnabled.checked=false;
  elements.soilType.value="II";
  elements.soilQa.value="250";
  elements.soilSource.value="گزارش ژئوتکنیک G-01 صفحه ۱۲";
  elements.soilFootingB.value="2";
  elements.soilFootingL.value="2";
  elements.soilReactionCases.value="[]";
  elements.foundationSlsBatchInput.value=JSON.stringify({cases:[{
    loadCase:"SLS-1",loadCaseLabel:"ترکیب بهره‌برداری ۱",classification:"SLS",
    solverEquilibriumOK:true,sourceReference:"گزارش مصوب ترکیبات SLS، صفحه ۴",
    supports:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},fixedDofs:[0,1,2],
      FxkN:0,FykN:100,FzkN:0,MxkNm:0,MykNm:0,MzkNm:0}]
  }]});
  const fakeWindow={document:{readyState:"complete",getElementById:id=>elements[id]||null}};
  global.window=fakeWindow;
  for(const path of ["../js/foundation-soil-check.js","../js/foundation-reaction-batch.js"])
    delete require.cache[require.resolve(path)];
  const soil=require("../js/foundation-soil-check.js");
  const batch=require("../js/foundation-reaction-batch.js");
  return {elements,listeners,soil,batch};
}

test("SLS batch UI remains disabled until soil controls are explicitly enabled",()=>{
  const {elements,listeners}=loadPanel();
  assert.equal(elements.foundationSlsBatchInput.disabled,true);
  assert.equal(elements.btnValidateFoundationSlsBatch.disabled,true);
  elements.soilControlEnabled.checked=true;
  listeners.get("soilControlEnabled:change")();
  assert.equal(elements.foundationSlsBatchInput.disabled,false);
  assert.equal(elements.btnValidateFoundationSlsBatch.disabled,false);
  delete global.window;
});

test("SLS batch UI validates JSON and reports case and support totals",()=>{
  const {elements,listeners}=loadPanel();
  elements.soilControlEnabled.checked=true;
  listeners.get("soilControlEnabled:change")();
  listeners.get("btnValidateFoundationSlsBatch:click")();
  assert.match(elements.foundationSlsBatchResult.textContent,/۱ ترکیب SLS و ۱ پایه/);
  assert.match(elements.foundationSlsBatchResult.textContent,/آیین‌نامه‌ای بودن ترکیبات را تأیید نمی‌کند/);
  assert.equal(elements.foundationSlsBatchResult.style.color,"#15803d");
  delete global.window;
});

test("SLS batch UI displays parse and validation errors without crashing",()=>{
  const {elements,listeners}=loadPanel();
  elements.soilControlEnabled.checked=true;
  listeners.get("soilControlEnabled:change")();
  elements.foundationSlsBatchInput.value="{invalid json";
  listeners.get("btnValidateFoundationSlsBatch:click")();
  assert.match(elements.foundationSlsBatchResult.textContent,/بسته واکنش پذیرفته نشد/);
  elements.foundationSlsBatchInput.value=JSON.stringify({cases:[{
    loadCase:"ULS-1",loadCaseLabel:"حالت نهایی",classification:"ULS",
    solverEquilibriumOK:true,sourceReference:"test",supports:[]
  }]});
  listeners.get("btnValidateFoundationSlsBatch:click")();
  assert.match(elements.foundationSlsBatchResult.textContent,/صریحاً به‌عنوان SLS/);
  assert.equal(elements.foundationSlsBatchResult.style.color,"#b45309");
  delete global.window;
});

test("rendering either panel twice does not duplicate click handlers",()=>{
  const {elements,listeners,soil,batch}=loadPanel();
  const before=listeners.size;
  soil.render();batch.render();
  assert.equal(listeners.size,before);
  assert.equal(elements.foundationSoilPanel.dataset.soilCheckInitialized,"true");
  assert.equal(elements.foundationSoilPanel.dataset.slsBatchInitialized,"true");
  delete global.window;
});
