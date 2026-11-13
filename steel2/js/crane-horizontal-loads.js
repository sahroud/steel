/* SAHROUD STEEL — documented horizontal crane wheel actions.
 * Inputs are independent manufacturer/code-sourced wheel forces in global X/Z.
 * This module validates and stores data only; it does NOT inject loads into 3D
 * until runway-level nodes and the rail/bracket load path are explicitly modeled.
 */
(function(root){
"use strict";
const defaults={enabled:false,transverseLoads_kN:"",longitudinalLoads_kN:"",transverseSign:"+X",longitudinalSign:"+Z",source:"",document:"",notes:""};
let state={...defaults};
const $=id=>root.document?.getElementById("craneHorizontal_"+id);
const parse=s=>String(s??"").split(",").map(x=>x.trim()).map(x=>x===""?NaN:Number(x));
function readUI(){
 const d={enabled:$("enabled")?!!$("enabled").checked:!!state.enabled};
 Object.keys(defaults).filter(k=>k!=="enabled").forEach(k=>{d[k]=$(k)?.value??state[k];});
 return d;
}
function setData(data){
 state={...defaults,...(data&&typeof data==="object"?data:{})};
 if($("enabled"))$("enabled").checked=!!state.enabled;
 Object.keys(defaults).filter(k=>k!=="enabled").forEach(k=>{if($(k))$(k).value=state[k]??"";});
 render();
}
function audit(input){
 const d={...defaults,...(input||{})};
 if(!d.enabled)return {status:"not_applicable",ready:false,readyFor3D:false,issues:["بار افقی جرثقیل در این پروژه فعال نشده است."]};
 const issues=[],train=root.SteelCraneTrainAnalysis?.getData?.()||{};
 const positions=parse(train.positions_m);
 const runway=Number(root.SteelCraneReadiness?.getData?.().runwayElevation_m);
 if(!positions.length||positions.some(v=>!Number.isFinite(v))||positions[0]!==0||positions.some((v,i)=>i>0&&v<=positions[i-1]))
  issues.push("ابتدا هندسه قطار چرخ معتبر و صعودی را در بخش تحلیل قطار چرخ ثبت کنید.");
 if(!Number.isFinite(runway)||runway<=0)issues.push("تراز واقعی ریل باید در ورودی‌های جرثقیل ثبت شود.");
 const t=parse(d.transverseLoads_kN),l=parse(d.longitudinalLoads_kN);
 [ ["نیروهای عرضی",t],["نیروهای طولی",l] ].forEach(([name,values])=>{
  if(values.length!==positions.length)issues.push(name+": برای هر چرخ دقیقاً یک مقدار مستقل وارد کنید؛ ترتیب باید با قطار چرخ یکسان باشد.");
  if(values.some(v=>!Number.isFinite(v)||v<0))issues.push(name+": مقادیر باید عددی و نامنفی باشند.");
 });
 if(!t.some(v=>v>0)&&!l.some(v=>v>0))issues.push("حداقل یکی از مؤلفه‌های افقی باید بزرگ‌تر از صفر باشد.");
 if(!["+X","-X"].includes(d.transverseSign))issues.push("جهت نیروی عرضی باید +X یا -X باشد.");
 if(!["+Z","-Z"].includes(d.longitudinalSign))issues.push("جهت نیروی طولی باید +Z یا -Z باشد.");
 if(!String(d.source||"").trim())issues.push("منبع مستند نیروهای افقی الزامی است.");
 if(!String(d.document||"").trim())issues.push("شماره صفحه کاتالوگ یا شماره نقشه نیروهای افقی الزامی است.");
 issues.push("قرارداد محور: X عرض سوله و عمود بر ریل؛ Z طول سوله و موازی ریل؛ Y قائم است. مقادیر هر فهرست، نیروی هر چرخ روی یک ریل بر حسب kN هستند.");
 issues.push("این داده‌ها هنوز به مدل سه‌بعدی اعمال نمی‌شوند. ابتدا باید گره واقعی در تراز ریل، سختی و اتصال تیر حمال/براکت و مسیر انتقال نیرو به ستون مدل شود؛ اعمال نیرو به گره نزدیک یا پایه ستون مجاز نیست.");
 return {status:issues.length>2?"incomplete":"awaiting_runway_nodes",ready:false,readyFor3D:false,issues,entered:{transverseLoads_kN:d.transverseLoads_kN,longitudinalLoads_kN:d.longitudinalLoads_kN,transverseSign:d.transverseSign,longitudinalSign:d.longitudinalSign,runwayElevation_m:Number.isFinite(runway)?runway:null,source:d.source,document:d.document}};
}
function mount(){
 if(!$("panel")){
  const anchor=root.document.getElementById("craneTrainAnalysisPanel");
  if(!anchor)return;
  const panel=root.document.createElement("section");
  panel.className="panel";panel.id="craneHorizontal_panel";
  panel.innerHTML='<div class="panel-title"><h3>نیروهای افقی جرثقیل و ترمز</h3><span class="status">ورودی مستند؛ بدون اعمال خودکار</span></div>'+
   '<div class="notice">نیروهای هر چرخ را جداگانه و بر حسب kN وارد کنید. ترتیب مقادیر باید دقیقاً با ترتیب چرخ‌های بخش «تحلیل قطار چرخ» یکسان باشد. این ورودی‌ها جایگزین ضرایب حدسی نیستند.</div>'+
   '<label><input id="craneHorizontal_enabled" type="checkbox"> فعال‌سازی ثبت نیروهای افقی</label>'+
   '<div class="form-grid">'+
   '<div class="field"><label for="craneHorizontal_transverseLoads_kN">نیروی عرضی هر چرخ روی یک ریل (kN؛ فهرست جداشده با ویرگول)</label><input id="craneHorizontal_transverseLoads_kN" type="text" placeholder="مثلاً 12, 12, 10, 10"></div>'+
   '<div class="field"><label for="craneHorizontal_transverseSign">جهت نیروی عرضی در محور X</label><select id="craneHorizontal_transverseSign"><option value="+X">+X</option><option value="-X">−X</option></select></div>'+
   '<div class="field"><label for="craneHorizontal_longitudinalLoads_kN">نیروی طولی/ترمز هر چرخ روی یک ریل (kN؛ فهرست جداشده با ویرگول)</label><input id="craneHorizontal_longitudinalLoads_kN" type="text" placeholder="مثلاً 4, 4, 3, 3"></div>'+
   '<div class="field"><label for="craneHorizontal_longitudinalSign">جهت نیروی طولی در محور Z</label><select id="craneHorizontal_longitudinalSign"><option value="+Z">+Z</option><option value="-Z">−Z</option></select></div>'+
   '<div class="field"><label for="craneHorizontal_source">منبع نیروها</label><input id="craneHorizontal_source" type="text" placeholder="کاتالوگ سازنده / محاسبات مصوب"></div>'+
   '<div class="field"><label for="craneHorizontal_document">شماره صفحه / نقشه / بند ضابطه</label><input id="craneHorizontal_document" type="text"></div>'+
   '<div class="field"><label for="craneHorizontal_notes">توضیحات، شرایط عملکرد و هم‌زمانی</label><input id="craneHorizontal_notes" type="text"></div></div>'+
   '<div id="craneHorizontal_results" class="notice">نیروهای افقی هنوز ثبت نشده‌اند.</div>';
  anchor.insertAdjacentElement("afterend",panel);
 }
 Object.keys(defaults).forEach(k=>{const el=$(k);if(el){el.addEventListener("input",()=>{state=readUI();render();});el.addEventListener("change",()=>{state=readUI();render();});}});
 $("enabled")?.addEventListener("change",()=>{state=readUI();render();});
 setData(state);
}
function render(){
 const box=$("results");if(!box)return;
 const r=audit(readUI());box.textContent="";
 const p=root.document.createElement("p");p.className="notice";
 p.textContent=r.status==="not_applicable"?"ثبت نیروهای افقی غیرفعال است.":r.status==="awaiting_runway_nodes"?"اطلاعات اولیه ثبت شده؛ اتصال به مدل سه‌بعدی تا مدل‌سازی گره و مسیر انتقال تراز ریل مسدود است.":"ورودی نیروهای افقی ناقص یا نیازمند اصلاح است.";
 box.appendChild(p);
 r.issues.forEach(msg=>{const x=root.document.createElement("p");x.className="notice";x.textContent="⚠ "+msg;box.appendChild(x);});
}
function selfTest(){
 const train=root.SteelCraneTrainAnalysis;
 const crane=root.SteelCraneReadiness;
 const oldTrain=train?.getData?.(),oldCrane=crane?.getData?.();
 try{
  train?.setData?.({positions_m:"0, 1.5, 3",loads_t:"1,1,1",span_m:"6"});
  crane?.setData?.({enabled:true,runwayElevation_m:"8"});
  const good=audit({enabled:true,transverseLoads_kN:"10, 10, 8",longitudinalLoads_kN:"2, 2, 2",source:"manufacturer drawing",document:"DWG-01",transverseSign:"+X",longitudinalSign:"-Z"});
  const mismatch=audit({enabled:true,transverseLoads_kN:"10,10",longitudinalLoads_kN:"2,2,2",source:"catalog",document:"p.4"});
  const undocumented=audit({enabled:true,transverseLoads_kN:"10,10,8",longitudinalLoads_kN:"2,2,2"});
  const checks=[
   ["ورودی مستند و هم‌تعداد چرخ‌ها پذیرفته اما برای 3D مسدود می‌ماند",good.status==="awaiting_runway_nodes"&&!good.readyFor3D],
   ["تعداد نیروها باید با تعداد چرخ‌ها برابر باشد",mismatch.issues.some(x=>x.includes("دقیقاً یک مقدار"))],
   ["منبع و شماره مرجع الزامی است",undocumented.issues.some(x=>x.includes("منبع مستند"))&&undocumented.issues.some(x=>x.includes("شماره صفحه"))]
  ];
  return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
 }finally{
  if(oldTrain)train.setData(oldTrain);
  if(oldCrane)crane.setData(oldCrane);
 }
}
root.SteelCraneHorizontalLoads={getData:readUI,setData,audit,render,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
