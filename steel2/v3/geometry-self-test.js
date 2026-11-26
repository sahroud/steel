(function(root){
"use strict";
function assert(ok,message){if(!ok)throw new Error(message);}
function project(roofType){return {inputs:{roofType,span:12,length:36,frameSpacing:6,columnHeight:6,roofSlope:20,sideOverhang:.8,endOverhang:.8}};}
function one(type){
 const r=root.SahroudSteelGeometry.build(project(type));
 const m=r.model,g=m.geometry,ids=new Set(m.nodes.map(n=>n.id));
 const dangling=m.members.filter(e=>!ids.has(e.start)||!ids.has(e.end));
 assert(r.validation.valid,"اعتبارسنجی پایه هندسه ناموفق است.");
 assert(g.frameCount===7,"تعداد قاب‌ها برای طول ۳۶ و فاصله ۶ متر باید ۷ باشد.");
 assert(m.supportNodes.length===14,"باید برای ۷ قاب، ۱۴ گره پایه وجود داشته باشد.");
 assert(dangling.length===0,"عضو دارای گره ناموجود است.");
 assert(new Set(m.nodes.map(n=>[n.x,n.y,n.z].map(v=>v.toFixed(7)).join("|"))).size===m.nodes.length,"گره تکراری مختصاتی وجود دارد.");
 const expectedRise=type==="mono"?2.4:1.2;
 assert(Math.abs(g.rise-expectedRise)<1e-9,"خیز سقف با شیب ورودی تطابق ندارد.");
 assert(m.members.some(e=>e.sectionKey==="roofPurlin"),"پرلین سقف تولید نشده است.");
 assert(m.members.some(e=>e.sectionKey==="wallBrace")&&m.members.some(e=>e.sectionKey==="roofBrace"),"مهاربند دیوار یا سقف تولید نشده است.");
 return {roofType:type,passed:true,nodes:m.nodes.length,members:m.members.length,frames:g.frameCount,supports:m.supportNodes.length,riseM:g.rise};
}
function run(){
 const tests=[one("gable"),one("mono")];
 return {passed:tests.every(t=>t.passed),tests,scope:"آزمون توپولوژی و هندسه اولیه؛ بدون تحلیل سازه‌ای، بارگذاری یا تأیید آیین‌نامه‌ای"};
}
root.SahroudSteelGeometryTests={run};
})(window);
