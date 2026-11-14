/* SAHROUD STEEL — compression capacity integration.
 * Stores explicit section and stability inputs for the limited global-buckling engine.
 * A utilization ratio is exposed only for verified pure-axial cases; combined actions remain blocked.
 */
(function(root){
"use strict";
const GROUPS=[["column","ستون"],["rafter","رفتر"]];
const FIELDS=[
 ["Ag_mm2","مساحت کل Ag (mm²)"],["Ix_mm4","ممان اینرسی Ix (mm⁴)"],["Iy_mm4","ممان اینرسی Iy (mm⁴)"],
 ["J_mm4","ثابت پیچشی J (mm⁴)"],["h0_mm","فاصله مرکز تا مرکز بال‌ها h0 (mm)"],
 ["Lx_mm","طول مهارنشده محور x (mm)"],["Ly_mm","طول مهارنشده محور y (mm)"],["Lz_mm","طول مهارنشده پیچشی (mm)"],
 ["Kx","ضریب Kx"],["Ky","ضریب Ky"],["Kz","ضریب Kz"],["Fy_MPa","تنش تسلیم Fy (MPa)"],["E_MPa","مدول الاستیسیته E (MPa)"],["G_MPa","مدول برشی G (MPa)"]
];
const $=id=>document.getElementById(id);
let data={schemaVersion:1,groups:{column:{},rafter:{}},memberOverrides:{}};
function normalize(v){
 const out={schemaVersion:1,groups:{},memberOverrides:{}};
 GROUPS.forEach(([g])=>{
  const src=v?.groups?.[g]||{},dst={};
  FIELDS.forEach(([k])=>{const n=Number(src[k]);dst[k]=src[k]!==""&&src[k]!==null&&src[k]!==undefined&&Number.isFinite(n)?n:null;});
  dst.sectionTypeReviewed=src.sectionTypeReviewed===true;
  dst.sectionPropertiesMatchReviewed=src.sectionPropertiesMatchReviewed===true;
  dst.localSlendernessReviewed=src.localSlendernessReviewed===true;
  dst.localSlendernessClass=src.localSlendernessClass==="non-slender"?"non-slender":"unreviewed";
  dst.note=String(src.note||"");
  out.groups[g]=dst;
 });
 const overrides=v?.memberOverrides||{};
 Object.keys(overrides).forEach(id=>{const src=overrides[id]||{},row={};["Lx_mm","Ly_mm","Lz_mm"].forEach(k=>{const n=Number(src[k]);row[k]=src[k]!==null&&src[k]!==undefined&&src[k]!==""&&Number.isFinite(n)&&n>0?n:null;});out.memberOverrides[String(id)]=row;});
 return out;
}
function getData(){return JSON.parse(JSON.stringify(data));}
function readUI(){
 GROUPS.forEach(([g])=>{
  if(!$("cc_"+g+"_Ag_mm2"))return;
  const d={};
  FIELDS.forEach(([k])=>{const el=$("cc_"+g+"_"+k);d[k]=el&&el.value!==""?Number(el.value):null;});
  d.sectionTypeReviewed=$("cc_"+g+"_sectionTypeReviewed")?.checked===true;
  d.sectionPropertiesMatchReviewed=$("cc_"+g+"_sectionPropertiesMatchReviewed")?.checked===true;
  d.localSlendernessReviewed=$("cc_"+g+"_localSlendernessReviewed")?.checked===true;
  d.localSlendernessClass=d.localSlendernessReviewed?"non-slender":"unreviewed";
  d.note=$("cc_"+g+"_note")?.value||"";
  data.groups[g]=d;
 });
 const resultHost=$("compressionCapacityResults");
 if(resultHost){resultHost.querySelectorAll("[data-member-length]").forEach(el=>{const id=el.getAttribute("data-member-id"),key=el.getAttribute("data-member-length");if(!id||!key)return;data.memberOverrides[id]=data.memberOverrides[id]||{Lx_mm:null,Ly_mm:null,Lz_mm:null};data.memberOverrides[id][key]=el.value===""?null:Number(el.value);});}
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
 const d=readUI().groups[g],member=root.SteelMemberDesignInputs?.getForGroup?.(g)||{};
 return {...d,sectionType:d.sectionTypeReviewed?"doubly-symmetric-I":"unreviewed",
  Fy_MPa:Number(d.Fy_MPa)>0?d.Fy_MPa:materialFy(g),
  E_MPa:Number(d.E_MPa)>0?Number(d.E_MPa):(Number(member.E_MPa)>0?Number(member.E_MPa):null),
  G_MPa:Number(d.G_MPa)>0?Number(d.G_MPa):(Number(member.G_MPa)>0?Number(member.G_MPa):null)};
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
  let demand=0,caseLabel="",governing=null;
  ends.forEach(e=>{
   const v=e.values.map(Number);
   if(!v.every(Number.isFinite))return;
   const ni=v[0],nj=v[6],candidate=Math.max(0,ni,-nj);
   if(candidate>demand){
    demand=candidate;caseLabel=e.label||"";
    const end=ni>=-nj?"I":"J",o=end==="I"?0:6;
    governing={label:caseLabel,end,compression_N:candidate,
     Vy_N:v[o+1],Vz_N:v[o+2],T_Nmm:v[o+3],My_Nmm:v[o+4],Mz_Nmm:v[o+5],
     otherEnd:{Vy_N:v[end==="I"?7:1],Vz_N:v[end==="I"?8:2],T_Nmm:v[end==="I"?9:3],My_Nmm:v[end==="I"?10:4],Mz_Nmm:v[end==="I"?11:5]}};
   }
  });
  const nonAxial=governing?[governing.Vy_N,governing.Vz_N,governing.T_Nmm,governing.My_Nmm,governing.Mz_Nmm,...Object.values(governing.otherEnd)].some(x=>Math.abs(Number(x))>1e-6):false;
  return {id:String(m.id||""),parentMemberId:m.parentMemberId||null,taperSegmentIndex:m.taperSegmentIndex||null,sectionKey:String(m.sectionKey||""),length_m:Number(m.length)||null,compressionDemand_kN:demand/1000,governingCase:caseLabel,governing,axialOnlyCase:!!governing&&!nonAxial,interactionRequired:!!governing&&nonAxial,caseCount:ends.length};
 }).filter(r=>r.caseCount>0).sort((a,b)=>a.sectionKey.localeCompare(b.sectionKey)||a.id.localeCompare(b.id));
}
function evaluateAxialOnlyMember(row,base,override,taperedEnabled){
 if(!row?.axialOnlyCase||row.interactionRequired)return {ok:false,reason:"بارگذاری حاکم دارای خمش، برش یا پیچش هم‌زمان است؛ کنترل اندرکنش کامل هنوز موجود نیست."};
 if(!(row.compressionDemand_kN>0))return {ok:false,reason:"تقاضای فشاری مثبت در حالت حاکم ثبت نشده است."};
 const cap=memberCapacityFromInput(row,base,override,taperedEnabled);
 if(!cap.ok)return {ok:false,reason:(cap.issues||[]).join("؛ ")};
 const ratio=row.compressionDemand_kN/cap.LRFD.designStrength_kN;
 return {ok:true,scope:"axial-only-global-buckling-screen",demand_kN:row.compressionDemand_kN,designStrength_kN:cap.LRFD.designStrength_kN,ratio,withinAxialStrength:ratio<=1,capacity:cap,disclaimer:"فقط غربال مقاومت محوری در حالت بدون خمش/برش/پیچش؛ تأیید طراحی عضو نیست."};
}
function selfTest(){
 const rows=buildCompressionDemandRows({members:[
  {id:"T1",sectionKey:"column",ends:[{label:"TENSION",values:[-1000,0,0,0,0,0,1000,0,0,0,0,0]}]},
  {id:"C1",sectionKey:"column",ends:[{label:"C1",values:[800,0,0,0,0,0,-800,0,0,0,0,0]},{label:"C2",values:[1500,0,0,0,0,0,-1500,0,0,0,0,0]}]},
  {id:"BAD",sectionKey:"rafter",ends:[{label:"BAD",values:[0,1,2]}]}
 ]});
 const tension=rows.find(r=>r.id==="T1"),compression=rows.find(r=>r.id==="C1");
 const base={sectionPropertiesMatchReviewed:true,sectionType:"doubly-symmetric-I",sectionTypeReviewed:true,localSlendernessReviewed:true,localSlendernessClass:"non-slender",Ag_mm2:10000,Ix_mm4:8e8,Iy_mm4:1e8,J_mm4:2e6,h0_mm:500,Kx:1,Ky:1,Kz:1,Fy_MPa:235,E_MPa:200000,G_MPa:76923,nu:0.3};
 const good=memberCapacityFromInput({id:"M1",sectionKey:"column"}, {...base}, {Lx_mm:6000,Ly_mm:4000,Lz_mm:5000},false);
 const missing=memberCapacityFromInput({id:"M2",sectionKey:"column"}, {...base}, {},false);
 const mismatch=memberCapacityFromInput({id:"M3",sectionKey:"column"}, {...base,sectionPropertiesMatchReviewed:false}, {Lx_mm:6000,Ly_mm:4000,Lz_mm:5000},false);
 const tapered=memberCapacityFromInput({id:"M4",sectionKey:"column",taperSegmentIndex:1}, {...base}, {Lx_mm:6000,Ly_mm:4000,Lz_mm:5000},false);
 const tests=[
  {name:"tension is not classified as compression",pass:!!tension&&tension.compressionDemand_kN===0},
  {name:"compression demand uses largest end compression",pass:!!compression&&compression.compressionDemand_kN===1.5&&compression.governingCase==="C2"},
  {name:"same-case bending and shear block axial-only screen",pass:(()=>{const x=buildCompressionDemandRows({members:[{id:"B",sectionKey:"column",ends:[{label:"B1",values:[1000,0,0,0,0,250000,-1000,0,0,0,0,0]}]}]})[0];return x.interactionRequired&&!x.axialOnlyCase;})()},
  {name:"pure axial case is separately identified",pass:(()=>{const x=buildCompressionDemandRows({members:[{id:"A",sectionKey:"column",ends:[{label:"A1",values:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}]}]})[0];return x.axialOnlyCase&&!x.interactionRequired;})()},
  {name:"invalid force vectors are ignored",pass:!rows.some(r=>r.id==="BAD")},
  {name:"member capacity calculated with explicit unbraced lengths",pass:good.ok&&good.LRFD.designStrength_kN>0},
  {name:"missing member unbraced lengths are blocked",pass:!missing.ok},
  {name:"unconfirmed section-property mapping is blocked",pass:!mismatch.ok},
  {name:"tapered analysis segment is blocked",pass:!tapered.ok}
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
   '<label><input type="checkbox" id="cc_'+g+'_sectionPropertiesMatchReviewed" '+(d.sectionPropertiesMatchReviewed?'checked':'')+'> تأیید شد خواص هندسی ثبت‌شده دقیقاً به اعضای این گروه تعلق دارد</label>'+
   '<label><input type="checkbox" id="cc_'+g+'_localSlendernessReviewed" '+(d.localSlendernessReviewed?'checked':'')+'> کنترل لاغری موضعی بال و جان طبق جدول معتبر انجام شده و مقطع غیرلاغر است</label></div>'+
   '<div class="field"><label for="cc_'+g+'_note">منبع هندسه، مهاربندی و کنترل لاغری</label><input type="text" id="cc_'+g+'_note" value="'+esc(d.note)+'" placeholder="شماره نقشه، جدول/بند، گزارش یا گواهی مصالح"></div></details>';
 }).join("")+
 '<div class="notice">مساحت، ممان‌های اینرسی و J در صورت خالی بودن، از رجیستر مقطع همین گروه به‌صورت اولیه خوانده می‌شوند (A: cm²→mm² و ممان‌ها: cm⁴→mm⁴)؛ آن‌ها را با مشخصات واقعی مقطع تطبیق دهید. مقدار h0 و طول‌های مهارنشده باید از هندسه و نقشه واقعی برداشت شوند. E و G فقط از ورودی صریح همین فرم یا رجیستر اختصاصی اعضا خوانده می‌شوند؛ مقدار پیش‌فرض یا تخمین برای آن‌ها وجود ندارد و در صورت فقدان، موتور مقاومت ظرفیت ارائه نمی‌کند. Fy از رجیستر گروه عضو یا پنل مصالح خوانده می‌شود، مگر آنکه جداگانه در این فرم وارد شود. Kها را بدون تحلیل/پیوست معتبر حدس نزنید.</div>'+
 '<div class="button-grid"><button type="button" class="btn primary" id="btnCompressionCapacityRun">محاسبه مقاومت کمانش کلی ستون و رفتر</button></div><div id="compressionCapacityResults"></div>';
}
function memberCapacityFromInput(row,base,override,taperedEnabled){
 const g=row.sectionKey;
 if(g!=="column"&&g!=="rafter")return {ok:false,issues:["گروه عضو در موتور فعلی پشتیبانی نمی‌شود."]};
 if(row.taperSegmentIndex!==null&&row.taperSegmentIndex!==undefined)return {ok:false,issues:["قطعه متعلق به عضو متغیرعمق است؛ ظرفیت منشوری مجاز نیست."]};
 if(taperedEnabled===true)return {ok:false,issues:["گروه در مدل متغیرعمق فعال است."]};
 if(base.sectionPropertiesMatchReviewed!==true)return {ok:false,issues:["یکسان بودن خواص هندسی ثبت‌شده با این عضو هنوز تأیید نشده است."]};
 for(const k of ["Lx_mm","Ly_mm","Lz_mm"]){
  if(!(Number(override?.[k])>0))return {ok:false,issues:["طول مهارنشده "+k+" برای این عضو باید جداگانه وارد و تأیید شود."]};
  base[k]=Number(override[k]);
 }
 base.localSlendernessClass=base.localSlendernessReviewed?"non-slender":"unreviewed";
 return root.SteelCompressionCapacity.analyze(base);
}
function capacityForMember(row){
 const g=row.sectionKey;
 if(g!=="column"&&g!=="rafter")return {ok:false,issues:["گروه عضو در موتور فعلی پشتیبانی نمی‌شود."]};
 const base=getInput(g),override=data.memberOverrides[String(row.id)]||{};
 const tapered=root.SteelTaperedSections?.getData?.().groups?.[g];
 return memberCapacityFromInput(row,base,override,tapered?.enabled===true);
}
function renderResults(){
 const host=$("compressionCapacityResults");if(!host)return;
 readUI();
 const html=GROUPS.map(([g,label])=>{
  let r;try{r=analyzeGroup(g);}catch(e){return '<div class="notice"><b>'+label+'</b><p>'+esc(e.message)+'</p></div>';}
  if(!r.ok)return '<div class="notice"><b>'+label+' — ظرفیت محاسبه نشد</b><ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>';
  return '<div class="notice"><b>'+label+' — نتیجه محدود کمانش کلی</b><p>حالت حاکم: '+esc(r.governingMode)+' | Fe='+r.Fe_MPa.toFixed(2)+' MPa | Fcr='+r.Fcr_MPa.toFixed(2)+' MPa</p>'+
   '<p>Pn='+r.Pn_kN.toFixed(2)+' kN | LRFD: φPn='+r.LRFD.designStrength_kN.toFixed(2)+' kN | ASD: Pn/Ω='+r.ASD.allowableStrength_kN.toFixed(2)+' kN</p>'+
   '<p>لاغری: λx='+r.slenderness.x.toFixed(1)+'، λy='+r.slenderness.y.toFixed(1)+'</p><ul>'+r.warnings.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>';
 }).join("");
 const forceResult=root.SteelMemberForceEnvelope?.getLast?.();
 const demandRows=buildCompressionDemandRows(forceResult);
 const demandHtml=demandRows.length?'<h4>تقاضای فشاری و ظرفیت کمانش کلی در سطح عضو</h4><p class="notice">برای هر عضو، سه طول مهارنشده را مستقل وارد کنید. خواص مقطع و مصالح از فرم گروه ستون/رفتر خوانده می‌شود؛ قبل از استفاده باید یکسان بودن آن‌ها با عضو انتخابی را کنترل کنید.</p><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>شناسه عضو/قطعه</th><th>گروه</th><th>ترکیب حاکم</th><th>انتهای حاکم</th><th>فشار بیشینه (kN)</th><th>Lx (mm)</th><th>Ly (mm)</th><th>Lz (mm)</th><th>ظرفیت LRFD φPn (kN)</th><th>ظرفیت ASD (kN)</th><th>نسبت محوری P/φPn</th><th>نتیجه غربال</th></tr></thead><tbody>'+demandRows.map(r=>{const ov=data.memberOverrides[String(r.id)]||{},g=r.sectionKey;let cap=null,screen=null,why="";if(r.compressionDemand_kN>0){try{cap=capacityForMember(r);if(!cap.ok)why=(cap.issues||[]).join("؛ ");if(r.axialOnlyCase)screen=evaluateAxialOnlyMember(r,getInput(g),ov,root.SteelTaperedSections?.getData?.().groups?.[g]?.enabled===true);else why="نیازمند کنترل اندرکنش هم‌زمان N-M-V-T؛ نسبت محوری به‌تنهایی مجاز نیست.";}catch(e){why=e.message;}}return '<tr><td>'+esc(r.id)+'</td><td>'+esc(g)+'</td><td>'+esc(r.governingCase||'—')+'</td><td>'+esc(r.governing?.end||'—')+'</td><td>'+r.compressionDemand_kN.toFixed(2)+'</td>'+["Lx_mm","Ly_mm","Lz_mm"].map(k=>'<td><input type="number" min="1" step="any" data-member-id="'+esc(r.id)+'" data-member-length="'+k+'" value="'+(ov[k]??"")+'" style="width:92px"></td>').join("")+'<td>'+(cap?.ok?cap.LRFD.designStrength_kN.toFixed(2):"—")+'</td><td>'+(cap?.ok?cap.ASD.allowableStrength_kN.toFixed(2):"—")+'</td><td>'+(screen?.ok?screen.ratio.toFixed(3):"—")+'</td><td>'+(screen?.ok?(screen.withinAxialStrength?"در محدوده مقاومت محوری — غیرنهایی":"بیش از مقاومت محوری — مردود در غربال"):esc(why||"ابتدا طول‌های مهارنشده را وارد کنید"))+'</td></tr>';}).join("")+'</tbody></table></div><button type="button" class="btn" id="btnCompressionMemberRecalc">به‌روزرسانی ظرفیت اعضا</button>':'<div class="notice">برای نمایش تقاضای فشاری، ابتدا تحلیل سه‌بعدی و استخراج پوش نیروها را اجرا کنید.</div>';
 host.innerHTML=html+demandHtml+'<div class="notice">تقاضای فشاری از قرارداد علامت نیروی محلی حل‌گر استخراج شده است: کشش (Nᵢ منفی و Nⱼ مثبت) فشار محسوب نمی‌شود؛ فشار (Nᵢ مثبت و Nⱼ منفی) با بیشینه دو انتها گزارش می‌شود. این قرارداد با آزمون عضو محوری کنترل شده است. نسبت P/φPn فقط در حالتی نمایش داده می‌شود که بارگذاری حاکم واقعاً محوری باشد و در همان ترکیب هیچ خمش، برش یا پیچشی در دو انتهای عضو وجود نداشته باشد. در بارگذاری مرکب، محاسبه نسبت محوری مسدود است تا اندرکنش کامل پیاده‌سازی شود. همچنین کمانش موضعی، اعضای مرکب، مقاطع نامتقارن/متغیرعمق، اندرکنش فشار و خمش، تحلیل مرتبه دوم و کنترل لرزه‌ای خارج از دامنه‌اند. ظرفیت‌های نمایش‌داده‌شده فقط مقاومت کمانش کلی بر مبنای طول‌های واردشده هستند و به معنی قبولی عضو نیستند؛ تقاضا و ظرفیت تا زمان تأیید مبنای ترکیب‌بار و همه کنترل‌های لازم نباید به‌صورت نسبت بهره‌برداری یا قبولی/ردی تفسیر شوند.</div>';
 const recalc=$("btnCompressionMemberRecalc");if(recalc)recalc.addEventListener("click",()=>{readUI();renderResults();});
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
root.SteelCompressionCapacityIntegration={getData,readUI,setData,analyzeGroup,capacityForMember,memberCapacityFromInput,getSectionDefaults:sectionDefaults,buildCompressionDemandRows,selfTest,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
