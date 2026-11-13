/* SAHROUD STEEL — compression capacity integration.
 * Stores explicit section and stability inputs for the limited global-buckling engine.
 * No demand/capacity ratio is reported until force-sign and member mapping are independently verified.
 */
(function(root){
"use strict";
const GROUPS=[["column","ستون"],["rafter","رفتر"]];
const FIELDS=[
 ["Ag_mm2","مساحت کل Ag (mm²)"],["Ix_mm4","ممان اینرسی Ix (mm⁴)"],["Iy_mm4","ممان اینرسی Iy (mm⁴)"],
 ["J_mm4","ثابت پیچشی J (mm⁴)"],["h0_mm","فاصله مرکز تا مرکز بال‌ها h0 (mm)"],
 ["Lx_mm","طول مهارنشده محور x (mm)"],["Ly_mm","طول مهارنشده محور y (mm)"],["Lz_mm","طول مهارنشده پیچشی (mm)"],
 ["Kx","ضریب Kx"],["Ky","ضریب Ky"],["Kz","ضریب Kz"],["Fy_MPa","تنش تسلیم Fy (MPa)"]
];
const $=id=>document.getElementById(id);
let data={schemaVersion:1,groups:{column:{},rafter:{}}};
function normalize(v){
 const out={schemaVersion:1,groups:{}};
 GROUPS.forEach(([g])=>{
  const src=v?.groups?.[g]||{},dst={};
  FIELDS.forEach(([k])=>{const n=Number(src[k]);dst[k]=src[k]!==""&&src[k]!==null&&src[k]!==undefined&&Number.isFinite(n)?n:null;});
  dst.sectionTypeReviewed=src.sectionTypeReviewed===true;
  dst.localSlendernessReviewed=src.localSlendernessReviewed===true;
  dst.localSlendernessClass=src.localSlendernessClass==="non-slender"?"non-slender":"unreviewed";
  dst.note=String(src.note||"");
  out.groups[g]=dst;
 });
 return out;
}
function getData(){return JSON.parse(JSON.stringify(data));}
function readUI(){
 GROUPS.forEach(([g])=>{
  if(!$("cc_"+g+"_Ag_mm2"))return;
  const d={};
  FIELDS.forEach(([k])=>{const el=$("cc_"+g+"_"+k);d[k]=el&&el.value!==""?Number(el.value):null;});
  d.sectionTypeReviewed=$("cc_"+g+"_sectionTypeReviewed")?.checked===true;
  d.localSlendernessReviewed=$("cc_"+g+"_localSlendernessReviewed")?.checked===true;
  d.localSlendernessClass=d.localSlendernessReviewed?"non-slender":"unreviewed";
  d.note=$("cc_"+g+"_note")?.value||"";
  data.groups[g]=d;
 });
 return getData();
}
function setData(v){data=normalize(v);render();}
function materialFy(g){
 const m=root.SteelMemberDesignInputs?.getForGroup?.(g)||{};
 if(Number(m.Fy)>0)return Number(m.Fy);
 const s=root.SteelSections?.read?.()||{};
 return Number(s.material?.Fy_MPa)>0?Number(s.material.Fy_MPa):null;
}
function getInput(g){
 const d=readUI().groups[g],s=root.SteelSections?.read?.()||{},E=Number(s.material?.E_GPa)*1000,G=Number(s.analysis3d?.G_GPa)*1000;
 return {...d,sectionType:d.sectionTypeReviewed?"doubly-symmetric-I":"unreviewed",
  Fy_MPa:Number(d.Fy_MPa)>0?d.Fy_MPa:materialFy(g),
  E_MPa:E>0?E:200000,G_MPa:G>0?G:200000/(2*(1+0.3)),nu:0.3};
}
function analyzeGroup(g){
 const engine=root.SteelCompressionCapacity;
 if(!engine||typeof engine.analyze!=="function")throw Error("موتور مقاومت فشاری بارگذاری نشده است.");
 const tapered=root.SteelTaperedSections?.getData?.().groups?.[g];
 if(tapered?.enabled===true)return {ok:false,issues:["عضو "+(g==="column"?"ستون":"رفتر")+" به‌صورت متغیرعمق تعریف شده است؛ موتور فعلی فقط عضو منشوری را می‌پذیرد."]};
 const input=getInput(g);
 input.localSlendernessClass=input.localSlendernessReviewed?"non-slender":"unreviewed";
 return engine.analyze(input);
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function buildCompressionDemandRows(forceResult){
 const members=Array.isArray(forceResult?.members)?forceResult.members:[];
 return members.map(m=>{
  const ends=Array.isArray(m.ends)?m.ends.filter(e=>Array.isArray(e.values)&&e.values.length===12):[];
  let demand=0,caseLabel="";
  ends.forEach(e=>{
   const ni=Number(e.values[0]),nj=Number(e.values[6]);
   if(!Number.isFinite(ni)||!Number.isFinite(nj))return;
   const candidate=Math.max(0,ni,-nj);
   if(candidate>demand){demand=candidate;caseLabel=e.label||"";}
  });
  return {id:String(m.id||""),parentMemberId:m.parentMemberId||null,taperSegmentIndex:m.taperSegmentIndex||null,sectionKey:String(m.sectionKey||""),length_m:Number(m.length)||null,compressionDemand_kN:demand/1000,governingCase:caseLabel,caseCount:ends.length};
 }).filter(r=>r.caseCount>0).sort((a,b)=>a.sectionKey.localeCompare(b.sectionKey)||a.id.localeCompare(b.id));
}
function selfTest(){
 const rows=buildCompressionDemandRows({members:[
  {id:"T1",sectionKey:"column",ends:[{label:"TENSION",values:[-1000,0,0,0,0,0,1000,0,0,0,0,0]}]},
  {id:"C1",sectionKey:"column",ends:[{label:"C1",values:[800,0,0,0,0,0,-800,0,0,0,0,0]},{label:"C2",values:[1500,0,0,0,0,0,-1500,0,0,0,0,0]}]},
  {id:"BAD",sectionKey:"rafter",ends:[{label:"BAD",values:[0,1,2]}]}
 ]});
 const tension=rows.find(r=>r.id==="T1"),compression=rows.find(r=>r.id==="C1");
 const tests=[
  {name:"tension is not classified as compression",pass:!!tension&&tension.compressionDemand_kN===0},
  {name:"compression demand uses largest end compression",pass:!!compression&&compression.compressionDemand_kN===1.5&&compression.governingCase==="C2"},
  {name:"invalid force vectors are ignored",pass:!rows.some(r=>r.id==="BAD")}
 ];
 return {passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests};
}
function sectionDefaults(g){
 const s=root.SteelSections?.read?.()||{},m=s[g]||{},p=s.analysis3d?.groups?.[g]||{};
 return {Ag_mm2:Number(m.A_cm2)>0?Number(m.A_cm2)*100:null,Ix_mm4:Number(m.Ix_cm4)>0?Number(m.Ix_cm4)*1e4:null,Iy_mm4:Number(m.Iy_cm4)>0?Number(m.Iy_cm4)*1e4:null,J_mm4:Number(p.J_cm4)>0?Number(p.J_cm4)*1e4:null};
}
function render(){
 const host=$("compressionCapacityIntegrationContent");if(!host)return;
 host.innerHTML=GROUPS.map(([g,label])=>{
  const d=data.groups[g]||{},defaults=sectionDefaults(g);
  return '<details class="sub-panel"><summary>'+label+' — ظرفیت فشاری محدود</summary><div class="form-grid">'+
   FIELDS.map(([k,caption])=>'<div class="field"><label for="cc_'+g+'_'+k+'">'+caption+'</label><input type="number" min="0" step="any" id="cc_'+g+'_'+k+'" value="'+(d[k]??defaults[k]??"")+'"></div>').join("")+
   '</div><div class="form-grid"><label><input type="checkbox" id="cc_'+g+'_sectionTypeReviewed" '+(d.sectionTypeReviewed?'checked':'')+'> تأیید شد مقطع واقعاً I دوبل‌متقارن است</label>'+
   '<label><input type="checkbox" id="cc_'+g+'_localSlendernessReviewed" '+(d.localSlendernessReviewed?'checked':'')+'> کنترل لاغری موضعی بال و جان طبق جدول معتبر انجام شده و مقطع غیرلاغر است</label></div>'+
   '<div class="field"><label for="cc_'+g+'_note">منبع هندسه، مهاربندی و کنترل لاغری</label><input type="text" id="cc_'+g+'_note" value="'+esc(d.note)+'" placeholder="شماره نقشه، جدول/بند، گزارش یا گواهی مصالح"></div></details>';
 }).join("")+
 '<div class="notice">مساحت، ممان‌های اینرسی و J در صورت خالی بودن، از رجیستر مقطع همین گروه به‌صورت اولیه خوانده می‌شوند (A: cm²→mm² و ممان‌ها: cm⁴→mm⁴)؛ آن‌ها را با مشخصات واقعی مقطع تطبیق دهید. مقدار h0 و طول‌های مهارنشده باید از هندسه و نقشه واقعی برداشت شوند. E و G از پنل مصالح خوانده می‌شوند (در نبود مقدار، E=200000 MPa و G متناظر با ν=0.3 فقط مقدار الاستیک پایه است). Fy از رجیستر گروه عضو یا پنل مصالح خوانده می‌شود، مگر آنکه جداگانه در این فرم وارد شود. Kها را بدون تحلیل/پیوست معتبر حدس نزنید.</div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="btnCompressionCapacityRun">محاسبه مقاومت کمانش کلی ستون و رفتر</button></div><div id="compressionCapacityResults"></div>';
}
function renderResults(){
 const host=$("compressionCapacityResults");if(!host)return;
 const html=GROUPS.map(([g,label])=>{
  let r;try{r=analyzeGroup(g);}catch(e){return '<div class="notice"><b>'+label+'</b><p>'+esc(e.message)+'</p></div>';}
  if(!r.ok)return '<div class="notice"><b>'+label+' — ظرفیت محاسبه نشد</b><ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>';
  return '<div class="notice"><b>'+label+' — نتیجه محدود کمانش کلی</b><p>حالت حاکم: '+esc(r.governingMode)+' | Fe='+r.Fe_MPa.toFixed(2)+' MPa | Fcr='+r.Fcr_MPa.toFixed(2)+' MPa</p>'+
   '<p>Pn='+r.Pn_kN.toFixed(2)+' kN | LRFD: φPn='+r.LRFD.designStrength_kN.toFixed(2)+' kN | ASD: Pn/Ω='+r.ASD.allowableStrength_kN.toFixed(2)+' kN</p>'+
   '<p>لاغری: λx='+r.slenderness.x.toFixed(1)+'، λy='+r.slenderness.y.toFixed(1)+'</p><ul>'+r.warnings.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>';
 }).join("");
 const forceResult=root.SteelMemberForceEnvelope?.getLast?.();
 const demandRows=buildCompressionDemandRows(forceResult);
 const demandHtml=demandRows.length?'<h4>پوش تقاضای فشاری استخراج‌شده از تحلیل سه‌بعدی</h4><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>شناسه عضو/قطعه</th><th>گروه</th><th>بیشینه فشار (kN)</th><th>حالت بار حاکم</th></tr></thead><tbody>'+demandRows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.sectionKey)+'</td><td>'+r.compressionDemand_kN.toFixed(2)+'</td><td>'+esc(r.governingCase||"—")+'</td></tr>').join("")+'</tbody></table></div>':'<div class="notice">برای نمایش تقاضای فشاری، ابتدا تحلیل سه‌بعدی و استخراج پوش نیروها را اجرا کنید.</div>';
 host.innerHTML=html+demandHtml+'<div class="notice">تقاضای فشاری از قرارداد علامت نیروی محلی حل‌گر استخراج شده است: کشش (Nᵢ منفی و Nⱼ مثبت) فشار محسوب نمی‌شود؛ فشار (Nᵢ مثبت و Nⱼ منفی) با بیشینه دو انتها گزارش می‌شود. این قرارداد با آزمون عضو محوری کنترل شده است. هنوز نسبت تقاضا به ظرفیت گزارش نمی‌شود، زیرا ظرفیت باید برای طول مهارنشده، مقطع و شرایط مهار تک‌تک اعضا محاسبه شود. همچنین کمانش موضعی، اعضای مرکب، مقاطع نامتقارن/متغیرعمق، اندرکنش فشار و خمش، تحلیل مرتبه دوم و کنترل لرزه‌ای خارج از دامنه‌اند.</div>';
}
function init(){
 if($("compressionCapacityIntegrationPanel"))return;
 const anchor=$("compressionDesignPanel");if(!anchor)return;
 const p=document.createElement("section");p.className="panel";p.id="compressionCapacityIntegrationPanel";
 p.innerHTML='<div class="panel-title"><h3>محاسبه محدود مقاومت اعضای فشاری — ستون و رفتر</h3><span class="status">موتور کمانش کلی</span></div>'+
 '<div class="notice">این ماژول به موتور محاسباتی متصل است، اما تنها برای مقطع I دوبل‌متقارن منشوری و غیرلاغر. برای رفتر متغیرعمق، مقاطع لاغر یا هر مقطع دیگر فعلاً نتیجه ظرفیت معتبر تولید نمی‌شود.</div><div id="compressionCapacityIntegrationContent"></div>';
 anchor.insertAdjacentElement("afterend",p);render();
 $("btnCompressionCapacityRun")?.addEventListener("click",renderResults);
}
root.SteelCompressionCapacityIntegration={getData,readUI,setData,analyzeGroup,getSectionDefaults:sectionDefaults,buildCompressionDemandRows,selfTest,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
