"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
function fixture(){
 const listeners=new Map(),ids=["foundationSoilPanel","btnValidateFootingDesignInput","footingDesignInputJson","footingDesignInputResult"];
 const elements=Object.fromEntries(ids.map(id=>[id,{id,dataset:{},disabled:true,value:"",textContent:"",style:{},addEventListener(type,fn){listeners.set(id+":"+type,fn);}}]));
 const actions={schema:"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0",success:true,reactionSense:"on-structure",
 foundations:[{nodeId:"B1",cases:[{loadCase:"ULS-1",loadCaseLabel:"ULS 1",sourceReference:"Report p.4",
 FxLocalkN:0,FylocalkN:100,FzLocalkN:0,MxkNm:0,MykNm:0,MzkNm:0,NkN:100}]}]};
 const payload={schema:"SAHROUD-FOOTING-DESIGN-INPUT-1.0",foundationId:"F1",nodeId:"B1",
 footing:{Bm:2,Lm:2,thicknessM:0.5},column:{widthX_m:0.4,widthZ_m:0.4},
 materials:{concreteFcMPa:25,rebarFyMPa:400,concreteSourceReference:"C25 report",rebarSourceReference:"A3 certificate"},
 cover:{bottomM:0.075,sideM:0.075},geometrySourceReference:"Drawing S1",ulsLocalActions:actions};
 elements.footingDesignInputJson.value=JSON.stringify(payload);
 global.window={document:{readyState:"complete",getElementById:id=>elements[id]||null},SahroudFootingDesignInput:require("../js/foundation-design-input.js")};
 delete require.cache[require.resolve("../js/foundation-design-input-ui.js")];
 require("../js/foundation-design-input-ui.js");
 return {elements,listeners};
}
test("footing design input UI validates JSON and clearly distinguishes intake from design",()=>{
 const {elements,listeners}=fixture();
 listeners.get("btnValidateFootingDesignInput:click")();
 assert.match(elements.footingDesignInputResult.textContent,/معتبر است/);
 assert.match(elements.footingDesignInputResult.textContent,/تأیید طراحی سازه‌ای نیست/);
 delete global.window;
});
test("footing design input UI reports malformed or incomplete input",()=>{
 const {elements,listeners}=fixture();
 elements.footingDesignInputJson.value="{bad json";
 listeners.get("btnValidateFootingDesignInput:click")();
 assert.match(elements.footingDesignInputResult.textContent,/انجام نشد/);
 delete global.window;
});
