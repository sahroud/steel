/* SAHROUD STEEL — load-case evidence contract.
 * Evidence and unit validation only. Does not generate loads or apply combinations.
 */
(function(root){"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v),txt=v=>String(v??"").trim();
const VALID_UNITS=new Set(["N","kN","N/m","kN/m","N/m2","kN/m2","N.m","kN.m","C","mm","m"]);
const VALID_TYPES=new Set(["nodal","member_point","member_uniform","surface","support_settlement","temperature","crane_wheel","other"]);
function audit(input){
 const p=input||{},issues=[],rows=[],ids=new Set(),cases=Array.isArray(p.loadCases)?p.loadCases:[];
 if(!cases.length)issues.push("حداقل یک حالت بار مستند لازم است.");
 cases.forEach((c,i)=>{
  const id=txt(c&&c.id),label=id||("ردیف "+(i+1));
  if(!id)issues.push(label+" شناسه ندارد.");else if(ids.has(id))issues.push("شناسه تکراری حالت بار: "+id);else ids.add(id);
  if(!VALID_TYPES.has(txt(c&&c.type)))issues.push(label+" نوع بار نامعتبر/ثبت‌نشده است.");
  if(!txt(c&&c.category))issues.push(label+" دسته بار ثبت نشده است.");
  if(!txt(c&&c.unit)||!VALID_UNITS.has(txt(c.unit)))issues.push(label+" واحد بار نامعتبر یا نامشخص است.");
  if(!txt(c&&c.coordinateSystem))issues.push(label+" دستگاه مختصات مشخص نیست.");
  if(!txt(c&&c.signConvention))issues.push(label+" قرارداد علامت مشخص نیست.");
  if(!txt(c&&c.target))issues.push(label+" مقصد اعمال بار مشخص نیست.");
  const src=c&&c.source||{};
  ["document","revision","locator"].forEach(k=>{if(!txt(src[k]))issues.push(label+" منبع "+k+" ندارد.");});
  if(!src||!txt(src.authority))issues.push(label+" مرجع/تهیه‌کننده منبع مشخص نیست.");
  const values=c&&c.values;
  if(!values||typeof values!=="object"||Array.isArray(values)||!Object.keys(values).length)issues.push(label+" مقادیر بار خالی یا نامعتبر است.");
  else Object.entries(values).forEach(([k,v])=>{if(!txt(k)||!finite(v))issues.push(label+" مقدار غیرعددی/نامتناهی: "+k);});
  if(c&&c.application&&c.application.memberId&&!txt(c.application.memberId))issues.push(label+" شناسه عضو مقصد نامعتبر است.");
  rows.push({id,type:txt(c&&c.type),category:txt(c&&c.category),unit:txt(c&&c.unit),target:txt(c&&c.target),source:src});
 });
 return {success:issues.length===0,status:issues.length?"incomplete":"evidence-complete",issues,rows,loadGenerationEnabled:false,solverEnabled:false,designApproved:false,limitations:["این قرارداد فقط کامل‌بودن شواهد و فراداده را ممیزی می‌کند؛ مقدار بار را از آیین‌نامه تولید یا تأیید نمی‌کند.","تبدیل واحد، توزیع بار، انتقال به گره/عضو و ترکیب بار در این مرحله انجام نمی‌شود.","منبع ثبت‌شده باید توسط مهندس مسئول از نظر اعتبار و انطباق پروژه بررسی شود."]};
}
function selfTest(){
 const s={document:"نقشه بارگذاری",revision:"A",locator:"شیت L-01، یادداشت ۳",authority:"مهندس محاسب"};
 const base={loadCases:[{id:"D1",type:"member_uniform",category:"dead",unit:"kN/m",coordinateSystem:"member-local",signConvention:"local +y downward",target:"member:M1",source:s,values:{qy:4}}]};
 const tests=[
 ["complete sourced case accepted",()=>audit(base).success],
 ["missing source locator rejected",()=>{const x=JSON.parse(JSON.stringify(base));delete x.loadCases[0].source.locator;return !audit(x).success;}],
 ["unknown unit rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].unit="kg-ish";return !audit(x).success;}],
 ["missing sign convention rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].signConvention="";return !audit(x).success;}],
 ["duplicate case IDs rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases.push({...x.loadCases[0]});return !audit(x).success;}],
 ["nonfinite numeric value rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].values.qy=Infinity;return !audit(x).success;}],
 ["unknown load type rejected",()=>{const x=JSON.parse(JSON.stringify(base));x.loadCases[0].type="magic";return !audit(x).success;}],
 ["empty case collection rejected",()=>!audit({loadCases:[]}).success],
 ["no generation or approval",()=>{const r=audit(base);return !r.loadGenerationEnabled&&!r.solverEnabled&&!r.designApproved;}]
 ];
 const results=tests.map(([name,fn])=>({name,ok:!!fn()}));return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,tests:results};
}
root.SteelLoadCaseEvidenceContract={audit,selfTest,validUnits:Array.from(VALID_UNITS)};
})(typeof window!=="undefined"?window:globalThis);
