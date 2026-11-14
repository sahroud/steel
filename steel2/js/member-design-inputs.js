/* SAHROUD STEEL — member design parameter register.
 * Group-level values are recorded only; no capacity check consumes them yet.
 */
(function(root){
"use strict";
const groups=[
 {key:"column",label:"ستون‌ها"},{key:"rafter",label:"رفترها"},
 {key:"endPost",label:"ستونک‌های انتهایی"},{key:"endGirt",label:"تیرهای انتهایی"},
 {key:"roofBrace",label:"مهاربندهای سقف"},{key:"wallBrace",label:"مهاربندهای دیوار"},{key:"roofEdge",label:"اعضای لبه سقف"}
];
const fields=[
 ["t_mm","ضخامت فولاد t (mm)"],["Fy","Fy (MPa)"],["Fu","Fu (MPa)"],["E_MPa","مدول الاستیسیته E (MPa)"],["G_MPa","مدول برشی G (MPa)"],["Kx","Kx"],["Ky","Ky"],["Kz","Kz"],
 ["Lcx","طول مؤثر فشاری حول x (m)"],["Lcy","طول مؤثر فشاری حول y (m)"],["Lcz","طول مؤثر پیچشی (m)"],
 ["Lb","طول مهارنشده خمشی Lb (m)"],["Cb","Cb"]
];
let data={schemaVersion:1,groups:{}};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function readUI(){
 groups.forEach(g=>{
  const row={};
  fields.forEach(([k])=>{const el=$("mdi_"+g.key+"_"+k),v=el?.value??"";row[k]=v===""?null:Number(v);});
  row.applyToAll=$("mdi_"+g.key+"_apply")?.checked===true;
  row.bracingNote=$("mdi_"+g.key+"_note")?.value||"";
  data.groups[g.key]=row;
 });
 return getData();
}
function getData(){return JSON.parse(JSON.stringify(data));}
function setData(value){
 if(!value||typeof value!=="object")return;
 data={schemaVersion:1,groups:{}};
 groups.forEach(g=>{
  const src=value.groups?.[g.key]||{},row={};
  fields.forEach(([k])=>row[k]=src[k]===null||src[k]===undefined||src[k]===""?null:(Number.isFinite(Number(src[k]))?Number(src[k]):null));
  row.applyToAll=src.applyToAll===true;row.bracingNote=String(src.bracingNote||"");data.groups[g.key]=row;
 });
 render();
}
function getForGroup(key){
 const raw=JSON.parse(JSON.stringify(data.groups[key]||{}));
 const material=window.SteelSections?.read?.().material||{};
 const thickness=Number(raw.t_mm)>0?Number(raw.t_mm):Number(material.thickness_mm);
 const defaults=window.SteelSections?.getMaterialDefaults?.(material.grade,thickness)||{};
 const hasFy=Number.isFinite(raw.Fy)&&raw.Fy>0,hasFu=Number.isFinite(raw.Fu)&&raw.Fu>0;
 return {...raw,t_mm:Number.isFinite(thickness)&&thickness>0?thickness:null,
   Fy:hasFy?raw.Fy:defaults.Fy_MPa,Fu:hasFu?raw.Fu:defaults.Fu_MPa,
   materialSource:hasFy&&hasFu?"ورودی اختصاصی گروه":defaults.source||"نیازمند گواهی مصالح"};
}
function validate(){
 const issues=[];
 groups.forEach(g=>{
  const raw=data.groups[g.key]||{};
  if(!raw.applyToAll)return;
  const x=getForGroup(g.key);
  ["Fy","Fu","E_MPa","G_MPa","Kx","Ky","Kz","Lcx","Lcy","Lcz","Lb","Cb"].forEach(k=>{
   if(!(Number.isFinite(x[k])&&x[k]>0))issues.push(g.label+": مقدار "+k+" برای اعمال گروهی باید مثبت و معتبر باشد.");
  });
  if(x.Fu<x.Fy)issues.push(g.label+": Fu کمتر از Fy ثبت شده است؛ داده مصالح را بازبینی کنید.");
  if(!(Number.isFinite(x.t_mm)&&x.t_mm>0))issues.push(g.label+": ضخامت مبنای مصالح معتبر نیست.");
 });
 return issues;
}
function render(){
 const host=$("memberDesignInputsContent");if(!host)return;
 host.innerHTML='<div class="notice">این قسمت پارامترهای طراحی اعضای فولادی نوردشده را به تفکیک گروه ثبت می‌کند. گرید از پنل مصالح به ارث می‌رسد؛ ضخامت هر گروه را جداگانه وارد کنید تا Fy/Fu پیش‌فرض متناسب با ضخامت محاسبه شود. ورود دستی Fy/Fu بر مقدار ارث‌رسیده اولویت دارد؛ اگر ضخامت گروه را وارد نکنید، ضخامت عمومی پنل مصالح به ارث می‌رسد و باید یکسان بودن ضخامت اعضای گروه را کنترل کنید. مقادیر گروهی فقط زمانی قابل استفاده‌اند که برای همه اعضای آن گروه یکسان باشند.</div>'+
 '<div style="overflow-x:auto"><table class="data-table" style="min-width:1150px;width:100%"><thead><tr><th>گروه عضو</th>'+fields.map(x=>'<th>'+x[1]+'</th>').join("")+'<th>اعمال به همه اعضای گروه</th><th>شرح مهاربندی/منبع</th></tr></thead><tbody>'+
 groups.map(g=>{const x=data.groups[g.key]||{};return '<tr><td>'+g.label+'</td>'+
 fields.map(([k])=>'<td><input type="number" step="any" min="0" id="mdi_'+g.key+'_'+k+'" value="'+(x[k]??"")+'" style="width:90px"></td>').join("")+
 '<td><input type="checkbox" id="mdi_'+g.key+'_apply" '+(x.applyToAll?"checked":"")+'></td>'+
 '<td><input type="text" id="mdi_'+g.key+'_note" value="'+esc(x.bracingNote||"")+'" placeholder="مثلاً مهار جانبی در هر لاپه" style="min-width:180px"></td></tr>';}).join("")+
 '</tbody></table></div>'+
 '<div class="notice">پرلین‌های سقف و قیدهای سردنورد دیوار از این جدول مستثنا هستند و باید با روش اختصاصی مقاطع سردنورد، از جمله کمانش موضعی و اعوجاجی، بررسی شوند. شناژهای بتنی نیز در این رجیستر فولادی قرار نمی‌گیرند. این پارامترها هنوز به روابط مقاومت متصل نشده‌اند و ثبت آن‌ها به معنی تأیید یا طراحی عضو نیست.</div>'+
 '<div class="button-grid"><button type="button" class="btn secondary" id="btnMemberDesignInputCheck">بررسی کامل بودن داده‌های گروهی</button><button type="button" class="btn secondary" id="btnMemberDesignInputExport">خروجی پارامترها JSON</button></div>'+
 '<div class="notice" id="memberDesignInputStatus">پارامترها در فایل پروژه ذخیره می‌شوند.</div>';
 groups.forEach(g=>[...fields.map(x=>"mdi_"+g.key+"_"+x[0]),"mdi_"+g.key+"_apply","mdi_"+g.key+"_note"].forEach(id=>$(id)?.addEventListener("input",readUI)));
 $("btnMemberDesignInputCheck").addEventListener("click",()=>{readUI();const issues=validate();$("memberDesignInputStatus").textContent=issues.length?issues.join(" | "):"داده‌های گروهی تأییدشده از نظر کامل بودن فیلدها بررسی شدند؛ صحت مقادیر و یکسان بودن شرایط اعضا همچنان نیازمند کنترل نقشه و مدارک است.";});
 $("btnMemberDesignInputExport").addEventListener("click",()=>{readUI();const blob=new Blob([JSON.stringify(getData(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sahroud-steel-member-design-inputs.json";a.click();URL.revokeObjectURL(url);});
}
function init(){
 if($("memberDesignInputsPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="memberDesignInputsPanel";
 p.innerHTML='<div class="panel-title"><h3>پارامترهای طراحی اعضا — مبنای کنترل مبحث دهم</h3><span class="status">ورودی‌های مهندسی</span></div><div id="memberDesignInputsContent"></div>';
 const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);render();
}
root.SteelMemberDesignInputs={getData,readUI,setData,getForGroup,validate,groups:groups.map(x=>({...x}))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
