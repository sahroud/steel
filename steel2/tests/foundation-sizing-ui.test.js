"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
function setup(){
 const listeners=new Map();
 const values={
  soilType:"II",soilQa:"300",soilQaBasis:"gross",soilSource:"Geotechnical report G-1 p.4",
  soilFootingThickness:"0.5",soilCoverAboveFooting:"0.5",concreteUnitWeight:"24",soilUnitWeight:"18",
  soilReactionCases:JSON.stringify([
   {name:"SLS-1",sourceReference:"Approved SLS report p.4",NkN:900,MxkNm:10,MzkNm:10},
   {name:"SLS-2",sourceReference:"Approved SLS report p.5",NkN:1100,MxkNm:15,MzkNm:12}
  ]),
  sizingMinB:"1",sizingMaxB:"3",sizingStepB:"0.5",
  sizingMinL:"1",sizingMaxL:"3",sizingStepL:"0.5",sizingShape:"rectangular"
 };
 const ids=["foundationSoilPanel","btnSearchFootingDimensions","foundationSizingResult",...Object.keys(values)];
 const elements=Object.fromEntries(ids.map(id=>[id,{
  id,dataset:{},disabled:false,value:values[id]||"",textContent:"",style:{},
  addEventListener(type,fn){listeners.set(id+":"+type,fn);}
 }]));
 global.window={document:{readyState:"complete",getElementById:id=>elements[id]||null}};
 for(const path of ["../js/foundation-soil-check.js","../js/foundation-sizing.js","../js/foundation-sizing-ui.js"])
  delete require.cache[require.resolve(path)];
 require("../js/foundation-soil-check.js");
 require("../js/foundation-sizing.js");
 const ui=require("../js/foundation-sizing-ui.js");
 return {elements,listeners,ui};
}
test("sizing UI invokes the bounded search and displays the preliminary selected dimensions",()=>{
 const {elements,listeners}=setup();
 listeners.get("btnSearchFootingDimensions:click")();
 assert.match(elements.foundationSizingResult.textContent,/ابعاد مقدماتی قابل قبول/);
 assert.match(elements.foundationSizingResult.textContent,/۴٫۵|4\.50|4.50/);
 assert.equal(elements.foundationSizingResult.style.color,"#15803d");
 delete global.window;
});
test("sizing UI reports invalid search bounds without claiming a result",()=>{
 const {elements,listeners}=setup();
 elements.sizingStepB.value="0";
 listeners.get("btnSearchFootingDimensions:click")();
 assert.match(elements.foundationSizingResult.textContent,/جست‌وجوی ابعاد انجام نشد/);
 assert.equal(elements.foundationSizingResult.style.color,"#b45309");
 delete global.window;
});
test("sizing UI registers its click handler only once",()=>{
 const {listeners,ui}=setup();
 const before=listeners.size;
 ui.render();ui.render();
 assert.equal(listeners.size,before);
 delete global.window;
});
