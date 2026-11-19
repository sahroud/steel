"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
function fixture(){
 const listeners=new Map(),ids=["foundationSoilPanel","btnValidateFootingDesignInput","btnUseMappedUlsActions","footingDesignInputJson","footingDesignInputResult"];
 const elements=Object.fromEntries(ids.map(id=>[id,{id,dataset:{},disabled:true,value:"",textContent:"",style:{},addEventListener(type,fn){listeners.set(id+":"+type,fn);}}]));
 const actions={schema:"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0",sourceSchema:"SAHROUD-FOUNDATION-ULS-REACTION-BATCH-1.0",success:true,reactionSense:"on-structure",
 foundations:[{nodeId:"B1",cases:[{loadCase:"ULS-1",loadCaseLabel:"ULS 1",sourceReference:"Report p.4",
 FxLocalkN:0,FylocalkN:100,FzLocalkN:0,MxkNm:0,MykNm:0,MzkNm:0,NkN:100}]}]};
 const payload={schema:"SAHROUD-FOOTING-DESIGN-INPUT-1.0",foundationId:"F1",nodeId:"B1",
 footing:{Bm:2,Lm:2,thicknessM:0.5},column:{widthX_m:0.4,widthZ_m:0.4},
 materials:{concreteFcMPa:25,rebarFyMPa:400,concreteSourceReference:"C25 report",rebarSourceReference:"A3 certificate"},
 cover:{bottomM:0.075,sideM:0.075},geometrySourceReference:"Drawing S1",ulsLocalActions:actions};
 elements.footingDesignInputJson.value=JSON.stringify(payload);
 global.window={document:{readyState:"complete",getElementById:id=>elements[id]||null}};
 delete require.cache[require.resolve("../js/foundation-design-input.js")];
 global.window.SahroudFootingDesignInput=require("../js/foundation-design-input.js");
 global.window.SahroudLastFoundationUlsActions=actions;
 delete require.cache[require.resolve("../js/foundation-design-input-ui.js")];
 require("../js/foundation-design-input-ui.js");
 return {elements,listeners,actions};
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
test("design input UI imports the full mapped ULS package for the matching footing",()=>{
 const {elements,listeners}=fixture();
 listeners.get("btnUseMappedUlsActions:click")();
 const payload=JSON.parse(elements.footingDesignInputJson.value);
 assert.equal(payload.ulsLocalActions.schema,"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0");
 assert.match(elements.footingDesignInputResult.textContent,/پایه B1 به ورودی/);
 delete global.window;
});
test("design input UI normalizes surrounding whitespace in the footing node identity",()=>{
 const {elements,listeners}=fixture();
 const payload=JSON.parse(elements.footingDesignInputJson.value);payload.nodeId=" B1 ";
 elements.footingDesignInputJson.value=JSON.stringify(payload);
 listeners.get("btnUseMappedUlsActions:click")();
 assert.equal(JSON.parse(elements.footingDesignInputJson.value).ulsLocalActions.schema,"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0");
 assert.match(elements.footingDesignInputResult.textContent,/پایه B1 به ورودی/);
 delete global.window;
});
test("design input UI refuses to transfer a ULS package belonging to another footing",()=>{
 const {elements,listeners}=fixture();
 const payload=JSON.parse(elements.footingDesignInputJson.value);payload.nodeId="B2";
 const previous=payload.ulsLocalActions;elements.footingDesignInputJson.value=JSON.stringify(payload);
 listeners.get("btnUseMappedUlsActions:click")();
 assert.match(elements.footingDesignInputResult.textContent,/متعلق به پایه B2 نیست/);
 assert.equal(Object.hasOwn(JSON.parse(elements.footingDesignInputJson.value),"ulsLocalActions"),false);
 assert.equal(elements.footingDesignInputResult.style.color,"#b45309");
 listeners.get("btnValidateFootingDesignInput:click")();
 assert.match(elements.footingDesignInputResult.textContent,/بسته تبدیل‌شده و معتبر کنش‌های محلی ULS لازم است/);
 delete global.window;
});
test("design input UI refuses a stale global ULS package and removes the previously embedded package",()=>{
 const {elements,listeners}=fixture();
 global.window.SahroudLastFoundationUlsActions={schema:"wrong",success:true,foundations:[]};
 listeners.get("btnUseMappedUlsActions:click")();
 assert.match(elements.footingDesignInputResult.textContent,/بسته معتبر واکنش ULS/);
 assert.equal(Object.hasOwn(JSON.parse(elements.footingDesignInputJson.value),"ulsLocalActions"),false);
 listeners.get("btnValidateFootingDesignInput:click")();
 assert.match(elements.footingDesignInputResult.textContent,/بسته تبدیل‌شده و معتبر کنش‌های محلی ULS لازم است/);
 delete global.window;
});
