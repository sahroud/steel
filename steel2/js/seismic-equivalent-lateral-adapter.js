/* SAHROUD STEEL — evidence-based equivalent lateral seismic load distributor.
 * User/code-reviewed base shear and level weights only. Not a code coefficient engine.
 * Solver nodal loads use SI: N, N.m. Input weights/base shear are kN.
 */
(function(root){"use strict";
const DIRECTIONS=[{id:"x-positive",axis:0,sign:1,label:"X+"},{id:"x-negative",axis:0,sign:-1,label:"X-"},{id:"z-positive",axis:2,sign:1,label:"Z+"},{id:"z-negative",axis:2,sign:-1,label:"Z-"}];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function audit(input,model){
 const issues=[];
 if(!input||typeof input!=="object")return{ready:false,issues:["ورودی زلزله ارائه نشده است."],analysisEnabled:false,designApproved:false};
 const V=Number(input.baseShearKN),k=Number(input.distributionExponent);
 if(!(finite(V)&&V>0))issues.push("برش پایه باید عدد مثبت و محدود بر حسب kN باشد.");
 if(!(finite(k)&&k>=0))issues.push("توان توزیع ارتفاعی باید عددی نامنفی و محدود باشد.");
 const s=input.source||{};
 ["code","edition","clause","document"].forEach(key=>{if(typeof s[key]!=="string"||!s[key].trim())issues.push("مرجع مستند زلزله ناقص است: "+key);});
 if(!Array.isArray(input.levels)||!input.levels.length)issues.push("حداقل یک تراز جرم/بار جانبی لازم است.");
 const nodeIds=new Set((model?.nodes||[]).map(n=>String(n.id)));
 const levelIds=new Set();
 let totalWeight=0;
 (input.levels||[]).forEach((l,i)=>{
  if(!l||typeof l!=="object"){issues.push("تراز شماره "+(i+1)+" نامعتبر است.");return;}
  const id=String(l.id||"");
  if(!id||levelIds.has(id))issues.push("شناسه تراز خالی یا تکراری است: "+(id||i+1));else levelIds.add(id);
  const h=Number(l.elevationM),w=Number(l.weightKN);
  if(!(finite(h)&&h>0))issues.push("ارتفاع تراز "+(id||i+1)+" باید مثبت باشد.");
  if(!(finite(w)&&w>0))issues.push("وزن لرزه‌ای تراز "+(id||i+1)+" باید مثبت و مستند باشد.");else totalWeight+=w;
  if(!Array.isArray(l.nodeIds)||!l.nodeIds.length)issues.push("گره‌های بارگذاری تراز "+(id||i+1)+" مشخص نشده‌اند.");
  else{const seen=new Set();l.nodeIds.forEach(n=>{const key=String(n);if(!nodeIds.has(key))issues.push("گره بارگذاری در مدل یافت نشد: "+key);if(seen.has(key))issues.push("گره در یک تراز تکرار شده است: "+key);seen.add(key);});}
 });
 if(!(totalWeight>0&&finite(totalWeight)))issues.push("مجموع وزن لرزه‌ای ترازها معتبر نیست.");
 if(model?.nodes?.length&&input.modelRevision&&model.revision&&String(input.modelRevision)!==String(model.revision))issues.push("نسخه مدل با نسخه مبنای محاسبات زلزله یکسان نیست.");
 return{ready:issues.length===0,issues,totalWeightKN:totalWeight,levelCount:(input.levels||[]).length,analysisEnabled:false,designApproved:false,codeDesignEligible:false};
}
function createCases(input,model){
 const a=audit(input,model);if(!a.ready)throw Error("توزیع زلزله متوقف شد: "+a.issues.join("؛ "));
 const V=Number(input.baseShearKN),k=Number(input.distributionExponent);
 const denom=input.levels.reduce((sum,l)=>sum+Number(l.weightKN)*Math.pow(Number(l.elevationM),k),0);
 if(!(denom>0&&finite(denom)))throw Error("مخرج توزیع نیروی جانبی معتبر نیست.");
 const levelForces=input.levels.map(l=>({id:String(l.id),elevationM:Number(l.elevationM),weightKN:Number(l.weightKN),forceKN:V*Number(l.weightKN)*Math.pow(Number(l.elevationM),k)/denom,nodeIds:l.nodeIds.map(String)}));
 const base={dead:0,live:0,snow:0,wind:0};
 const cases=DIRECTIONS.map(d=>{
  const nodalLoads=[];
  levelForces.forEach(l=>{const each=l.forceKN/l.nodeIds.length; l.nodeIds.forEach(nodeId=>{const values=[0,0,0,0,0,0];values[d.axis]=each*d.sign*1000;nodalLoads.push({nodeId,values});});});
  return{id:"EQ-"+d.id.toUpperCase(),label:"زلزله استاتیکی معادل "+d.label,factors:{...base},nodalLoads,source:{...input.source},baseShearKN:V,direction:d.id,levelForces:levelForces.map(x=>({...x,nodeIds:x.nodeIds.slice()})),distributionExponent:k,analysisEnabled:false,designApproved:false};
 });
 return{cases,caseCount:cases.length,levelForces,totalWeightKN:a.totalWeightKN,baseShearKN:V,distributionExponent:k,analysisEnabled:false,designApproved:false,limitations:["برش پایه، وزن ترازها، توان توزیع و مرجع باید توسط مهندس مسئول از آیین‌نامه/محاسبات پروژه تعیین و مستند شوند.","این ماژول فقط توزیع نیروی جانبی است؛ محاسبه طیف، ضریب رفتار، اهمیت، نامنظمی، پیچش اتفاقی، اثرات P-Delta و کنترل دریفت را انجام نمی‌دهد.","نیروها به گره‌های صریحاً معرفی‌شده در هر تراز اعمال می‌شوند؛ کف صلب و توزیع دیافراگمی فرض نشده است.","چهار حالت X+/X-/Z+/Z- جداگانه‌اند و نباید بدون ضوابط ترکیب بار با هم جمع شوند."]};
}
function selfTest(){
 const tests=[],ck=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
 const model={revision:"r1",nodes:[{id:"n1"},{id:"n2"},{id:"n3"}]};
 const input={baseShearKN:100,distributionExponent:1,modelRevision:"r1",source:{code:"استاندارد",edition:"ویرایش",clause:"بند",document:"سند"},levels:[{id:"L1",elevationM:3,weightKN:100,nodeIds:["n1","n2"]},{id:"L2",elevationM:6,weightKN:200,nodeIds:["n3"]}]};
 ck("four directional cases",()=>createCases(input,model).caseCount===4);
 ck("force sum equals base shear",()=>Math.abs(createCases(input,model).levelForces.reduce((s,l)=>s+l.forceKN,0)-100)<1e-10);
 ck("height-weight distribution",()=>{const f=createCases(input,model).levelForces;return Math.abs(f[0].forceKN-20)<1e-10&&Math.abs(f[1].forceKN-80)<1e-10;});
 ck("X positive direction",()=>createCases(input,model).cases[0].nodalLoads.every(x=>x.values[0]>0&&x.values[2]===0));
 ck("X negative direction",()=>createCases(input,model).cases[1].nodalLoads.every(x=>x.values[0]<0&&x.values[2]===0));
 ck("Z positive direction",()=>createCases(input,model).cases[2].nodalLoads.every(x=>x.values[2]>0&&x.values[0]===0));
 ck("Z negative direction",()=>createCases(input,model).cases[3].nodalLoads.every(x=>x.values[2]<0&&x.values[0]===0));
 ck("equal split across level nodes",()=>{const c=createCases(input,model).cases[0];return Math.abs(c.nodalLoads[0].values[0]+c.nodalLoads[1].values[0]-20000)<1e-8;});
 ck("all six nodal components present",()=>createCases(input,model).cases.every(c=>c.nodalLoads.every(n=>n.values.length===6)));
 ck("missing source blocked",()=>{const x=JSON.parse(JSON.stringify(input));delete x.source.clause;return !audit(x,model).ready;});
 ck("missing model node blocked",()=>{const x=JSON.parse(JSON.stringify(input));x.levels[0].nodeIds=["missing"];return !audit(x,model).ready;});
 ck("duplicate level blocked",()=>{const x=JSON.parse(JSON.stringify(input));x.levels[1].id="L1";return !audit(x,model).ready;});
 ck("nonpositive base shear blocked",()=>{const x={...input,baseShearKN:0};return !audit(x,model).ready;});
 ck("nonpositive level weight blocked",()=>{const x=JSON.parse(JSON.stringify(input));x.levels[0].weightKN=0;return !audit(x,model).ready;});
 ck("stale model revision blocked",()=>{const x={...input,modelRevision:"old"};return !audit(x,model).ready;});
 ck("analysis and approval remain disabled",()=>{const r=createCases(input,model);return !r.analysisEnabled&&!r.designApproved&&r.cases.every(c=>!c.analysisEnabled&&!c.designApproved);});
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests,analysisEnabled:false,designApproved:false};
}
root.SteelSeismicEquivalentLateral={audit,createCases,selfTest};
})(typeof window!=="undefined"?window:globalThis);
