/* SAHROUD STEEL: signed simultaneous connection actions per load combination.
   Units: kN, kN.m. Data adapter only; no resistance/code check. */
(function(root){
"use strict";
const num=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))?Number(v):null;
function endActions(m,e){
 const s=e==="i"?"Start":"End";
 return {
  N:num(m["axial"+s]??m["N"+s]),
  Vy:num(m["shear"+s]??m["Vy"+s]),
  Mz:num(m["moment"+s]??m["Mz"+s]),
  Vz:num(m["shearZ"+s]??m["Vz"+s]),
  T:num(m["torsion"+s]??m["T"+s]),
  My:num(m["momentY"+s]??m["My"+s])
 };
}
function collect(combos){
 if(!Array.isArray(combos)||!combos.length)throw Error("نتایج تحلیل ترکیبات بار موجود نیست.");
 const out=[];
 combos.forEach((c,ci)=>{
  if(!Array.isArray(c.members))throw Error("ساختار اعضای ترکیب بار معتبر نیست.");
  c.members.forEach((m,mi)=>["i","j"].forEach(end=>{
   const actions=endActions(m,end);
   if(Object.values(actions).every(v=>v===null))return;
   out.push({combination:String(c.name||c.id||("ترکیب "+(ci+1))),memberName:String(m.name||m.id||("عضو "+(mi+1))),memberId:m.id??"",sectionKey:m.sectionKey??"",end,length:num(m.length),actions});
  }));
 });
 if(!out.length)throw Error("نیروی انتهایی قابل خواندن در نتایج تحلیل پیدا نشد.");
 return out;
}
function collectFromEnvelope(envelope,model){
 if(!envelope||!Array.isArray(envelope.members)||!Array.isArray(envelope.cases)||!envelope.cases.length)throw Error("پوش نیروی تحلیل همه ترکیبات در دسترس نیست؛ ابتدا «تحلیل همه ترکیبات و استخراج نیروها» را اجرا کنید.");
 if(envelope.allCasesEquilibriumOK!==true)throw Error("تعادل یک یا چند ترکیب بار تأیید نشده است؛ استخراج تقاضای اتصال متوقف شد.");
 if(envelope.caseLabelCoverageOK!==true||(envelope.unreportedMemberIds||[]).length||(envelope.invalidForceVectors||[]).length||(envelope.analysisMemberSetMismatchCases||[]).length)throw Error("پوش نیرو از نظر پوشش اعضا/ترکیبات کامل نیست؛ تقاضای اتصال قابل استخراج نیست.");
 const convention=envelope.localEndForceConvention;
 if(convention?.version!==1||convention?.basis!=="member-local")throw Error("قرارداد محور/علامت نیروهای محلی حل‌گر نامشخص است.");
 const modelMembers=Array.isArray(model?.members)?model.members:[];
 const byId=new Map(modelMembers.map(m=>[String(m.id),m]));
 if(byId.size!==modelMembers.length)throw Error("شناسه عضو مدل تکراری است؛ تطبیق نیروی اتصال ممکن نیست.");
 const joints=collectJoints(model);
 if(!joints.success)throw Error("ممیزی توپولوژی مدل برای اتصال ناموفق است: "+joints.issues.slice(0,5).join("؛ "));
 const jointByNode=new Map(joints.joints.map(j=>[String(j.nodeId),j]));
 const expected=envelope.cases.map(x=>String(x.label||"").trim());
 if(expected.some(x=>!x)||new Set(expected).size!==expected.length)throw Error("نام ترکیبات بار خالی یا تکراری است.");
 const rows=[],seen=new Set();
 envelope.members.forEach(m=>{
  const id=String(m.id),source=byId.get(id);
  if(!source)throw Error("عضو تحلیل‌شده "+id+" در مدل جاری پیدا نشد.");
  if(seen.has(id))throw Error("عضو تکراری در پوش نیرو: "+id);seen.add(id);
  const cases=Array.isArray(m.simultaneousCases)?m.simultaneousCases:[];
  const labels=cases.map(x=>String(x.label||""));
  if(cases.length!==expected.length||expected.some(x=>!labels.includes(x))||new Set(labels).size!==labels.length)throw Error("پوش ترکیبات عضو "+id+" ناقص یا تکراری است.");
  cases.forEach(c=>{
   const v=c.sourceVector;
   if(!Array.isArray(v)||v.length!==12||!v.every(Number.isFinite))throw Error("بردار ۱۲ مؤلفه‌ای نیرو برای عضو "+id+" / "+c.label+" معتبر نیست.");
   [["i",source.start,v.slice(0,6)],["j",source.end,v.slice(6,12)]].forEach(([end,nodeId,a])=>{
    const joint=jointByNode.get(String(nodeId));
    if(!joint)return;
    const values={N:a[0]/1000,Vy:a[1]/1000,Vz:a[2]/1000,T:a[3]/1000,My:a[4]/1000,Mz:a[5]/1000};
    rows.push({combination:String(c.label),memberName:String(source.name||source.label||id),memberId:id,sectionKey:String(source.sectionKey||m.sectionKey||""),end,nodeId:String(nodeId),jointType:joint.type,jointLabel:joint.label,length:num(m.length??source.length),actions:values,rawActionsSI:{N:a[0],Vy:a[1],Vz:a[2],T:a[3],My:a[4],Mz:a[5]},forceConventionVersion:convention.version,actionBasis:"member-local solver element end action; sign retained; not joint resultant"});
   });
  });
 });
 if(!rows.length)throw Error("هیچ انتهای عضوی در گره‌های اتصال مشترک، نیروی معتبر ندارد.");
 return rows;
}
function memberLabel(key){
 const labels={column:"ستون",rafter:"رفتر",roofPurlin:"لاپه سقف",purlin:"لاپه",wallGirt:"وال‌پست/گیرت دیوار",roofBrace:"مهاربند سقف",wallBrace:"مهاربند دیوار",endPost:"ستونک انتهایی",endGirt:"تیر انتهایی",roofEdge:"عضو لبه سقف",craneRunwayGirder:"تیر حمال جرثقیل",tieBeam:"تیر رابط/شناژ",craneBracket:"کنسول جرثقیل"};
 return labels[key]||String(key||"عضو نامشخص");
}
function classifyJoint(node,members){
 const keys=new Set(members.map(x=>String(x.sectionKey||"")));
 if(["base","endwall-base"].includes(String(node.kind||"")))return {type:"base",label:"پای ستون / صفحه‌ستون"};
 if(keys.has("column")&&keys.has("rafter"))return {type:"knee",label:"اتصال زانویی ستون به رفتر"};
 if(keys.has("rafter")&&members.filter(x=>x.sectionKey==="rafter").length>=2)return {type:"ridge",label:"تاج / وصله رفتر"};
 if(keys.has("craneRunwayGirder")&&keys.has("column"))return {type:"crane",label:"تیر حمال / کنسول جرثقیل به ستون"};
 if((keys.has("roofBrace")||keys.has("wallBrace")))return {type:"brace",label:"اتصال مهاربند به عضو اصلی"};
 if((keys.has("roofPurlin")||keys.has("purlin"))&&keys.has("rafter"))return {type:"purlin",label:"اتصال لاپه به رفتر"};
 if(keys.has("wallGirt")&&keys.has("column"))return {type:"girt",label:"اتصال گیرت به ستون"};
 if(keys.has("tieBeam")&&keys.has("column"))return {type:"tie",label:"اتصال تیر رابط به ستون"};
 if(keys.has("endPost")||keys.has("endGirt"))return {type:"endwall",label:"اتصال اعضای قاب انتهایی"};
 return {type:"other",label:"گره اتصال چندعضوی"};
}
function collectJoints(model){
 const issues=[],nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 if(!nodes.length||!members.length)return {success:false,issues:["مدل سه‌بعدی تولید نشده یا فاقد گره/عضو است."],joints:[],summary:{jointCount:0,unclassified:0}};
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n])),byNode=new Map();
 const memberIds=new Set();
 members.forEach(m=>{
  const id=String(m?.id??"");
  if(!id||memberIds.has(id)){issues.push("شناسه عضو خالی یا تکراری است: "+id);return;}
  memberIds.add(id);
  [["I",m.start],["J",m.end]].forEach(([end,nodeId])=>{
   const key=String(nodeId??"");
   if(!nodeMap.has(key)){issues.push("عضو "+id+" به گره "+key+" متصل نیست.");return;}
   const list=byNode.get(key)||[];
   list.push({memberId:id,sectionKey:String(m.sectionKey||""),name:String(m.name||m.label||id),end});
   byNode.set(key,list);
  });
 });
 const joints=[];
 byNode.forEach((connected,nodeId)=>{
  const node=nodeMap.get(nodeId);
  const distinct=[...new Map(connected.map(x=>[x.memberId,x])).values()];
  const isBase=["base","endwall-base"].includes(String(node.kind||""));
  if(distinct.length<2&&!isBase)return;
  const cls=classifyJoint(node,distinct);
  joints.push({nodeId,kind:String(node.kind||""),coordinates:{x:Number(node.x)||0,y:Number(node.y)||0,z:Number(node.z)||0},members:distinct,type:cls.type,label:cls.label,memberCount:distinct.length});
 });
 joints.sort((a,b)=>a.type.localeCompare(b.type)||a.nodeId.localeCompare(b.nodeId,undefined,{numeric:true}));
 return {success:issues.length===0,joints,issues,summary:{jointCount:joints.length,base:joints.filter(x=>x.type==="base").length,knee:joints.filter(x=>x.type==="knee").length,brace:joints.filter(x=>x.type==="brace").length,crane:joints.filter(x=>x.type==="crane").length,other:joints.filter(x=>!["base","knee","brace","crane"].includes(x.type)).length},scope:"گره‌های واقعی مشترک در توپولوژی مدل؛ فهرست‌برداری و تشخیص نوع اتصال است و به معنی طراحی مقاومت یا تأیید جزئیات نیست."};
}
const csvCell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
function toCsv(rows){
 const h=["ترکیب بار","عضو","شناسه","مقطع","انتها","گره اتصال","نوع اتصال","طول m","N kN","Vy kN","Vz kN","T kN.m","My kN.m","Mz kN.m"];
 return "\uFEFF"+[h,...rows.map(r=>[r.combination,r.memberName,r.memberId,r.sectionKey,r.end,r.nodeId||"",r.jointLabel||"",r.length,...["N","Vy","Vz","T","My","Mz"].map(k=>r.actions[k])])].map(a=>a.map(csvCell).join(",")).join("\r\n");
}
function test(){
 const f=[{name:"C1",members:[{id:1,name:"رفتر",length:5,axialStart:-100,shearStart:20,momentStart:30,axialEnd:-90,shearEnd:-10,momentEnd:0}]},{name:"C2",members:[{id:1,name:"رفتر",length:5,axialStart:80,shearStart:-35,momentStart:-45,axialEnd:70,shearEnd:15,momentEnd:0}]}];
 const r=collect(f),joint=collectJoints({nodes:[{id:"E",x:0,y:6,z:0,kind:"eave"},{id:"C",x:0,y:0,z:0,kind:"base"}],members:[{id:"COL",start:"C",end:"E",sectionKey:"column"},{id:"RAF",start:"E",end:"E",sectionKey:"rafter"}]});
 const checks=[
 ["هر دو ترکیب حفظ می‌شوند",r.length===4],
 ["علامت نیرو حفظ می‌شود",r[0].actions.N===-100&&r[2].actions.N===80],
 ["نیروهای هم‌زمان حفظ می‌شوند",r[0].actions.Vy===20&&r[2].actions.Vy===-35],
 ["جهت ابتدا و انتها حفظ می‌شود",r[0].end==="i"&&r[1].end==="j"],
 ["مؤلفه ناموجود جعل نمی‌شود",r[0].actions.Vz===null&&r[0].actions.T===null],
 ["CSV شامل همه رکوردهاست",toCsv(r).split("\r\n").length===5],
 ["فهرست اتصال، زانویی و پای ستون را از توپولوژی می‌سازد",joint.success&&joint.joints.some(x=>x.type==="knee")&&joint.joints.some(x=>x.type==="base")],
 ["تقاضای اتصال از بردار هم‌زمان حل‌گر و گره صحیح استخراج می‌شود",(()=>{const model={nodes:[{id:"A",x:0,y:0,z:0,kind:"base"},{id:"B",x:0,y:5,z:0,kind:"eave"},{id:"C",x:5,y:6,z:0}],members:[{id:"COL",start:"A",end:"B",sectionKey:"column"},{id:"RAF",start:"B",end:"C",sectionKey:"rafter"}]};const v=[1000,2000,3000,4000,5000,6000,-1000,-2000,-3000,-4000,-5000,-6000];const env={allCasesEquilibriumOK:true,caseLabelCoverageOK:true,unreportedMemberIds:[],invalidForceVectors:[],analysisMemberSetMismatchCases:[],localEndForceConvention:{version:1,basis:"member-local"},cases:[{label:"U1"}],members:[{id:"COL",simultaneousCases:[{label:"U1",sourceVector:v}]},{id:"RAF",simultaneousCases:[{label:"U1",sourceVector:v}]}]};const x=collectFromEnvelope(env,model);const row=x.find(z=>z.memberId==="COL"&&z.end==="j");return row?.nodeId==="B"&&row.jointType==="knee"&&row.actions.N===-1&&row.rawActionsSI.Mz===-6000; })()],
 ["تقاضای اتصال با پوش ترکیبات ناقص مسدود می‌شود",(()=>{const env={allCasesEquilibriumOK:true,caseLabelCoverageOK:true,unreportedMemberIds:[],invalidForceVectors:[],analysisMemberSetMismatchCases:[],localEndForceConvention:{version:1,basis:"member-local"},cases:[{label:"U1"},{label:"U2"}],members:[]};try{collectFromEnvelope(env,{nodes:[],members:[]});return false;}catch(e){return true;}})()]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
function mount(){
 if(!root.document||document.getElementById("connectionDemandRegistryPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="connectionDemandRegistryPanel";p.setAttribute("data-focus-group","connections");
 p.innerHTML=`<div class="panel-title"><h3>بانک نیروهای انتهایی اتصالات</h3></div>
 <div class="notice">نیروهای انتهایی مستقیماً از پوش تحلیل سه‌بعدی همه ترکیبات استخراج می‌شوند. هر ردیف به گره واقعی اتصال و انتهای عضو وصل است؛ مؤلفه‌ها در محور محلی عضو و با علامت حل‌گر حفظ می‌شوند و برآیند گره فرض نمی‌شود.</div>
 <div class="form-grid"><div class="field"><label for="connDemandMember">عضو</label><select id="connDemandMember"><option value="">همه اعضا</option></select></div><div class="field"><label for="connDemandEnd">انتها</label><select id="connDemandEnd"><option value="">هر دو انتها</option><option value="i">ابتدا (i)</option><option value="j">انتها (j)</option></select></div></div>
 <div class="button-grid"><button id="btnBuildConnectionDemand" class="btn primary">استخراج نیروهای اتصال از تحلیل</button><button id="btnAuditConnectionJoints" class="btn secondary">ممیزی محل اتصال همه اجزا</button><button id="btnRunAllConnectionScreens" class="btn primary">اجرای کنترل‌های اتصال موجود</button><button id="btnExportConnectionDemand" class="btn secondary" disabled>خروجی CSV</button></div><div id="connectionScreenRunSummary" class="notice">این دکمه فقط کنترل‌های موجود و محدود را اجرا می‌کند؛ اتصال فاقد موتور طراحی همچنان طراحی‌نشده می‌ماند.</div>
 <div id="connectionJointSummary" class="notice">برای فهرست‌برداری محل اتصال اعضا، ابتدا مدل سه‌بعدی را تولید کنید.</div><div id="connectionJointTable" style="overflow-x:auto"></div>
 <div class="drawing-area"><svg viewBox="0 0 600 130" style="width:100%;height:auto"><rect x="55" y="25" width="12" height="75" fill="#64748b"/><rect x="533" y="25" width="12" height="75" fill="#64748b"/><line x1="67" y1="62" x2="533" y2="62" stroke="#31566a" stroke-width="10"/><path d="M95 15 L75 15 L84 8 M75 15 L84 22 M505 15 L525 15 L516 8 M525 15 L516 22" fill="none" stroke="#0b7285" stroke-width="2.5"/><text x="60" y="120" text-anchor="middle" fill="currentColor">i</text><text x="539" y="120" text-anchor="middle" fill="currentColor">j</text></svg></div>
 <div id="connectionDemandSummary" class="notice">پس از اجرای تحلیل ترکیبات بار، استخراج را اجرا کنید.</div><div id="connectionDemandTable" style="overflow-x:auto"></div>
 <div class="notice" style="color:#a65d16">خروجی فعلی، N، برش محلی و لنگر محلی را از ساختار موجود می‌خواند. برش خارج از صفحه، پیچش و لنگر دوم فقط در صورت وجود صریح در خروجی حلگر ثبت می‌شوند. این بانک داده، ظرفیت یا تأیید آیین‌نامه‌ای اتصال صادر نمی‌کند.</div>`;
 const anchor=document.getElementById("connectionDesignPanel")||document.getElementById("cantileverCheckPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 const params=new URLSearchParams(root.location?.search||"");
 if(params.get("focus")==="connections"){
  document.body.classList.add("focus-mode");
  document.querySelectorAll("[data-focus-group]").forEach(function(panel){panel.classList.remove("focus-visible");});
  p.classList.add("focus-visible");
  const nav=document.getElementById("focusWorkspaceNav");
  if(nav){nav.querySelectorAll("[data-focus-link]").forEach(function(link){link.removeAttribute("aria-current");});const active=nav.querySelector('[data-focus-link="connections"]');if(active)active.setAttribute("aria-current","page");}
  const caption=document.getElementById("focusWorkspaceCaption");if(caption)caption.textContent="حالت نمایش متمرکز: اتصالات و محل اتصال اجزا؛ برای بازگشت، «نمایش همه بخش‌ها» را انتخاب کنید.";
  window.setTimeout(function(){p.scrollIntoView({behavior:"auto",block:"start"});},100);
 }
 let records=[];const $=id=>document.getElementById(id),fmt=v=>v===null?"—":Number(v).toLocaleString("fa-IR",{maximumFractionDigits:3}),esc=v=>String(v??"").replace(/[&<>"\']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#39;"}[ch]));
 function render(){
  const m=$("connDemandMember").value,e=$("connDemandEnd").value;
  const rows=records.filter(r=>(!m||r.memberName===m)&&(!e||r.end===e));
  $("connectionDemandSummary").textContent="رکوردهای قابل نمایش: "+rows.length+"؛ هر ردیف = یک عضو، یک انتها و یک ترکیب بار.";
  $("connectionDemandTable").innerHTML=rows.length?`<table style="width:100%;min-width:850px;border-collapse:collapse"><thead><tr><th>ترکیب</th><th>عضو</th><th>انتها</th><th>گره</th><th>نوع اتصال</th><th>N</th><th>Vy</th><th>Vz</th><th>T</th><th>My</th><th>Mz</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.combination)}</td><td>${esc(r.memberName)}</td><td>${esc(r.end)}</td><td>${esc(r.nodeId||"—")}</td><td>${esc(r.jointLabel||"—")}</td>${["N","Vy","Vz","T","My","Mz"].map(k=>"<td>"+fmt(r.actions[k])+"</td>").join("")}</tr>`).join("")}</tbody></table>`:"<p>رکوردی یافت نشد.</p>";
 }
 $("btnRunAllConnectionScreens").addEventListener("click",()=>{
  const tasks=[
   ["btnKneeExtract","استخراج هندسه اتصال زانویی"],
   ["btnBraceConnectionRefresh","به‌روزرسانی داده اتصالات مهاربند"],
   ["btnBraceGussetStrengthRun","غربال گاست‌پلیت مهاربند"],
   ["btnBraceBoltStrengthRun","غربال پیچ مهاربند"],
   ["btnBraceWeldStrengthRun","غربال جوش مهاربند"],
   ["btnConnectionCheck","غربال محدود گروه جوش کنسول"]
  ];
  const done=[],missing=[];
  tasks.forEach(([id,label])=>{const button=$(id);if(button&&!button.disabled){button.click();done.push(label);}else missing.push(label);});
  $("connectionScreenRunSummary").textContent="کنترل‌های موجود اجرا/درخواست شدند: "+done.join("؛ ")+"."+(missing.length?" کنترل/بخش در دسترس نیست یا هنوز بارگذاری نشده: "+missing.join("؛ "):"")+" توجه: اجرای غربال محدود به معنی طراحی کامل یا تأیید اتصال نیست.";
 });
 $("btnAuditConnectionJoints").addEventListener("click",()=>{
  const host=$("connectionJointSummary"),table=$("connectionJointTable");
  try{
   const result=collectJoints(root.SteelStructuralModel?.getData?.());
   host.textContent="گره‌های اتصال شناسایی‌شده: "+result.summary.jointCount+"؛ زانویی: "+result.summary.knee+"؛ پای ستون: "+result.summary.base+"؛ مهاربند: "+result.summary.brace+"؛ جرثقیل: "+result.summary.crane+"؛ سایر: "+result.summary.other+".";
   const status=x=>x.type==="knee"?"هندسه مفهومی موجود؛ مقاومت و جزئیات ساخت ناقص":x.type==="brace"?"رجیستر اتصال مهاربند؛ نیازمند تکمیل و کنترل":x.type==="base"?"طراحی صفحه‌ستون/انکر نیازمند کنترل مستقل":x.type==="crane"?"اتصال تیر حمال/کنسول نیازمند طراحی": "طراحی مقاومت و جزئیات اجرایی در این مرحله تأیید نشده";
   table.innerHTML=(result.joints.length?'<table class="data-table" style="min-width:900px;width:100%"><thead><tr><th>گره</th><th>نوع اتصال</th><th>مختصات (m)</th><th>اعضای متصل</th><th>وضعیت طراحی اتصال</th></tr></thead><tbody>'+result.joints.map(j=>'<tr><td>'+esc(j.nodeId)+'</td><td>'+esc(j.label)+'</td><td>'+fmt(j.coordinates.x)+'، '+fmt(j.coordinates.y)+'، '+fmt(j.coordinates.z)+'</td><td>'+j.members.map(m=>esc(memberLabel(m.sectionKey))+" ["+esc(m.memberId)+"/"+m.end+"]").join("؛ ")+'</td><td>'+esc(status(j))+'</td></tr>').join("")+'</tbody></table>':"گره اتصال مشترک/پایه‌ای در مدل پیدا نشد.")+(result.issues.length?'<ul>'+result.issues.map(esc).map(x=>"<li>"+x+"</li>").join("")+"</ul>":"");
  }catch(e){host.textContent="ممیزی اتصال انجام نشد: "+String(e.message||e);table.innerHTML="";}
 });
 $("btnBuildConnectionDemand").addEventListener("click",()=>{
  try{
   records=collectFromEnvelope(root.SteelMemberForceEnvelope?.getLast?.(),root.SteelStructuralModel?.getData?.());
   const s=$("connDemandMember"),old=s.value,names=[...new Set(records.map(r=>r.memberName))];
   s.innerHTML='<option value="">همه اعضا</option>'+names.map(n=>'<option>'+n.replace(/[&<>]/g,"")+'</option>').join("");
   s.value=names.includes(old)?old:"";$("btnExportConnectionDemand").disabled=false;render();
   $("connectionDemandSummary").textContent="تقاضا از تحلیل سه‌بعدی همه ترکیبات استخراج شد: "+records.length+" انتهای عضو در گره‌های اتصال؛ نیرو kN و لنگر kN.m. علامت و محور محلی حفظ شده است؛ این داده‌ها برآیند گره نیستند.";
  }catch(e){records=[];$("btnExportConnectionDemand").disabled=true;$("connectionDemandSummary").textContent=e.message;$("connectionDemandTable").innerHTML="";}
 });
$("connDemandMember").addEventListener("change",render);$("connDemandEnd").addEventListener("change",render);
 $("btnExportConnectionDemand").addEventListener("click",()=>{if(!records.length)return;const u=URL.createObjectURL(new Blob([toCsv(records)],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download="sahroud-steel-connection-demands.csv";a.click();URL.revokeObjectURL(u);});
}
root.SteelConnectionDemandRegistry={collect,collectFromEnvelope,toCsv,test,endActions,collectJoints};
if(typeof module!=="undefined"&&module.exports)module.exports=root.SteelConnectionDemandRegistry;
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
