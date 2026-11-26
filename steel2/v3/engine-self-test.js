(function(root){
"use strict";
function cantilever(){
 const E=200e9, G=77e9, A=0.01, I=8.333333333333333e-6, J=1.6e-5, L=2, P=1000;
 const model={nodes:[{id:"A",x:0,y:0,z:0,kind:"support"},{id:"B",x:L,y:0,z:0,kind:"tip"}],
  members:[{id:"AB",start:"A",end:"B",type:"آزمایش تیر طره",sectionKey:"test"}]};
 const result=root.SahroudSteel3D.analyze(model,{
  sectionResolver:()=>({E,G,A,Iy:I,Iz:I,J}),
  supports:[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}],
  nodalLoads:[{nodeId:"B",values:[0,-P,0,0,0,0]}]
 });
 const expected=P*L**3/(3*E*I);
 const actual=Math.abs(result.displacements.find(x=>x.nodeId==="B").values[1]);
 const displacementError=Math.abs(actual-expected)/expected;
 const reactionY=result.reactions.find(x=>x.nodeId==="A")?.values[1]||0;
 const reactionError=Math.abs(reactionY-P)/P;
 const passed=result.success&&result.equilibrium.ok&&displacementError<1e-6&&reactionError<1e-6;
 return {name:"تیر طره‌ای دوگرهی",passed,expectedTipDeflectionM:expected,actualTipDeflectionM:actual,
  displacementRelativeError:displacementError,supportReactionYN:reactionY,reactionRelativeError:reactionError,
  equilibrium:result.equilibrium,limitations:result.limitations};
}
function run(){
 if(!root.SahroudSteel3D||typeof root.SahroudSteel3D.analyze!=="function")throw new Error("هسته مستقل تحلیل سه‌بعدی بارگذاری نشده است.");
 const tests=[cantilever()];
 return {passed:tests.every(t=>t.passed),tests,scope:"آزمون مرجع حل‌گر؛ نه تحلیل سوله و نه تأیید طراحی آیین‌نامه‌ای"};
}
root.SahroudSteelEngineTests={run};
})(window);
