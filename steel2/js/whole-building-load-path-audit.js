/* SAHROUD STEEL — whole-building load path audit.
 * Audits existing tributary area-to-member line-load assignments.
 * It does not generate code loads or change solver inputs.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const num=v=>v===null||v===undefined||v===""?null:Number(v);
function audit(model,loads){
 const issues=[],rows=[];
 if(!model||!Array.isArray(model.members)||!model.geometry)issues.push("مدل هندسی ساخته‌شده و فهرست اعضا در دسترس نیست.");
 if(!loads||typeof loads!=="object")issues.push("ورودی بارهای سطحی در دسترس نیست.");
 const members=Array.isArray(model?.members)?model.members:[];
 const groups={
  rafters:members.filter(m=>m.axis==="transverse"&&/رفتر چپ|رفتر راست/.test(String(m.type||""))),
  wallBraces:members.filter(m=>m.sectionKey==="wallBrace"), roofBraces:members.filter(m=>m.sectionKey==="roofBrace"),
  purlins:members.filter(m=>m.sectionKey==="roofPurlin"),
  wallGirts:members.filter(m=>m.sectionKey==="wallGirt"),
  endGirts:members.filter(m=>m.sectionKey==="endGirt")
 };
 const expected=[
  ["dead","بار مرده بام",["purlins"],["deadLeft","deadRight"]],
  ["live","بار زنده بام",["purlins"],["liveLeft","liveRight"]],
  ["snow","بار برف بام",["purlins"],["snowLeft","snowRight"]],
  ["windRoof","باد بام",["purlins"],["windLeft","windRight"]],
  ["windWall","باد دیوارهای طولی",["wallGirts"],["windWall"]],
  ["windEnd","باد دیوارهای انتهایی",["endGirts"],["windEndFront","windEndBack"]]
 ];
 expected.forEach(([id,label,targets,inputKeys])=>{
  const absent=inputKeys.filter(k=>num(loads?.[k])===null||!Number.isFinite(num(loads?.[k])));
  if(absent.length)issues.push(label+": ورودی عددی برای "+absent.join("، ")+" موجود نیست.");
  const targetMembers=targets.flatMap(k=>groups[k]);
  if(!targetMembers.length){issues.push(label+": هیچ عضو هدفی در مدل پیدا نشد.");rows.push({id,label,memberCount:0,status:"missing"});return;}
  const missing=[],bad=[],covered=[];
  targetMembers.forEach(m=>{
   const ll=m.lineLoads||{};
   let keys=[];
   if(id==="windRoof")keys=["windLeft","windRight"];
   else if(id==="windWall")keys=["wind"];
   else if(id==="windEnd")keys=["windEnd"];
   else keys=[id];
   if(keys.some(k=>ll[k]===undefined))missing.push(String(m.id));
   else if(keys.some(k=>!finite(ll[k])))bad.push(String(m.id));
   else covered.push(String(m.id));
   if((id==="dead"||id==="live"||id==="snow")&&!(Number(ll.tributaryWidth)>0)&&m.sectionKey==="roofPurlin")bad.push(String(m.id)+":tributaryWidth");
  });
  if(missing.length)issues.push(label+": بار به "+missing.length+" عضو از "+targetMembers.length+" عضو تخصیص نیافته است.");
  if(bad.length)issues.push(label+": بار یا عرض بارگیر نامعتبر در "+bad.slice(0,8).join("، "));
  rows.push({id,label,memberCount:targetMembers.length,coveredCount:covered.length,missingCount:missing.length,invalidCount:bad.length,status:missing.length||bad.length?"incomplete":"assigned",sampleMissing:missing.slice(0,8)});
 });
 // Roof area loads are carried by purlins; rafters receive purlin support reactions and self-weight.
 const rafterDuplicate=[],rafterMissing=[];
 groups.rafters.forEach(m=>["dead","live","snow"].forEach(k=>{
  const v=m.lineLoads?.[k];
  if(v===undefined)rafterMissing.push(String(m.id)+":"+k);
  else if(!finite(v))rafterMissing.push(String(m.id)+":"+k);
  else if(Math.abs(v)>1e-10)rafterDuplicate.push(String(m.id)+":"+k);
 }));
 if(!groups.rafters.length)issues.push("هیچ رفتر عرضی در مدل پیدا نشد.");
 if(rafterMissing.length)issues.push("تعریف صریح بار صفر مستقیم برای رفترها ناقص است: "+rafterMissing.slice(0,8).join("، "));
 if(rafterDuplicate.length)issues.push("بار سطحی بام هم‌زمان به پرلین و رفتر تخصیص یافته است؛ احتمال دوباره‌شماری: "+rafterDuplicate.slice(0,8).join("، "));
 rows.push({id:"rafter-reaction-path",label:"رفترها ـ واکنش پرلین و وزن خود عضو",memberCount:groups.rafters.length,coveredCount:groups.rafters.length-rafterMissing.length-rafterDuplicate.length,missingCount:rafterMissing.length,invalidCount:rafterDuplicate.length,status:rafterMissing.length||rafterDuplicate.length?"incomplete":"assigned",transfer:"purlin support reactions at shared FEM nodes"});
 [["مهاربند دیوار",groups.wallBraces],["مهاربند سقف",groups.roofBraces]].forEach(([label,list])=>{rows.push({id:label,label,memberCount:list.length,coveredCount:list.length,missingCount:0,invalidCount:0,status:list.length?"structural-path":"missing"});if(!list.length)issues.push(label+": عضو مستقلی در مدل پیدا نشد.");});
 // Loaded member endpoints must remain in the connected structural graph leading to base supports.
 const adjacency=new Map(),nodeIds=new Set((model?.nodes||[]).map(n=>String(n.id)));
 const link=(x,y)=>{x=String(x);y=String(y);if(!adjacency.has(x))adjacency.set(x,new Set());if(!adjacency.has(y))adjacency.set(y,new Set());adjacency.get(x).add(y);adjacency.get(y).add(x);};
 members.forEach(m=>{if(m.start!==undefined&&m.end!==undefined)link(m.start,m.end);});
 const supports=(model?.nodes||[]).filter(n=>n.kind==="base"||n.kind==="endwall-base").map(n=>String(n.id));
 const reaches=start=>{const seen=new Set([String(start)]),q=[String(start)];while(q.length){const n=q.shift();if(supports.includes(n))return true;(adjacency.get(n)||[]).forEach(x=>{if(!seen.has(x)){seen.add(x);q.push(x);}});}return false;};
 const disconnected=members.filter(m=>["roofPurlin","wallGirt","endGirt"].includes(m.sectionKey)&&(!nodeIds.has(String(m.start))||!nodeIds.has(String(m.end))||!reaches(m.start)||!reaches(m.end))).map(m=>String(m.id));
 if(!supports.length)issues.push("گره پایه برای ممیزی اتصال به تکیه‌گاه موجود نیست.");
 if(disconnected.length)issues.push("مسیر هندسی اعضای بارگیر تا تکیه‌گاه ناقص است: "+disconnected.slice(0,8).join("، "));
 const frameIds=[...new Set(groups.rafters.map(m=>Number(m.frame)).filter(Number.isFinite))];
 const frameCount=Array.isArray(model?.geometry?.frames)?model.geometry.frames.length:0;
 if(frameCount&&frameIds.length!==frameCount)issues.push("پوشش رفترها در قاب‌ها کامل نیست: "+frameIds.length+" از "+frameCount+" قاب دارای عضو رفتر شناسایی شد.");
 const duplicateIds=members.map(m=>String(m.id)).filter((id,i,a)=>a.indexOf(id)!==i);
 if(duplicateIds.length)issues.push("شناسه عضو تکراری: "+[...new Set(duplicateIds)].slice(0,8).join("، "));
 const combinations=Array.isArray(loads?.combinations)?loads.combinations:[];
 const comboRows=combinations.map((c,i)=>{
  const factors={dead:num(c.dead),live:num(c.live),snow:num(c.snow)};
  const missing=Object.entries(factors).filter(([,v])=>v===null||!Number.isFinite(v)).map(([k])=>k);
  return {id:String(c.id??i),name:String(c.name??("ترکیب "+(i+1))),factors,valid:missing.length===0,missing};
 });
 comboRows.forEach(c=>{if(!c.valid)issues.push("ضرایب ترکیب "+c.name+" ناقص یا نامعتبر است: "+c.missing.join("، "));});
 const allAssigned=rows.length>0&&rows.every(r=>r.status==="assigned"||r.status==="structural-path");
 return {success:issues.length===0&&allAssigned,issues,rows,combinations:comboRows,connectivity:{supportNodeCount:supports.length,disconnectedMemberIds:disconnected},
  inventory:{memberCount:members.length,rafterCount:groups.rafters.length,purlinCount:groups.purlins.length,wallGirtCount:groups.wallGirts.length,endGirtCount:groups.endGirts.length,wallBraceCount:groups.wallBraces.length,roofBraceCount:groups.roofBraces.length,frameCount,rafterFrameCount:frameIds.length},
  scope:"ممیزی تخصیص ورودی‌های بار موجود به اعضا؛ نه تأیید مقدار بار، ضرایب آیین‌نامه‌ای، انتقال بار نهایی یا ایمنی سازه.",
  analysisEnabled:false,designApproved:false};
}
function run(){
 const model=root.SteelStructuralModel?.getData?.();
 const loads=root.SteelLoads?.getData?.();
 const result=audit(model,loads);
 const host=root.document?.getElementById("wholeBuildingLoadPathResults");
 if(host)host.textContent=[
  "وضعیت ممیزی: "+(result.success?"تخصیص ورودی‌ها کامل":"نیازمند اصلاح"),
  "تعداد اعضا: "+result.inventory.memberCount+" | رفتر: "+result.inventory.rafterCount+" | پرلین: "+result.inventory.purlinCount+" | لاپه دیوار: "+result.inventory.wallGirtCount+" | لاپه انتهایی: "+result.inventory.endGirtCount,
  ...result.rows.map(r=>r.label+": "+r.coveredCount+"/"+r.memberCount+" — "+r.status),
  ...result.issues.map(x=>"هشدار: "+x),
  result.scope
 ].join("\n");
 return result;
}
function selfTest(){
 const t=[],test=(name,fn)=>{try{t.push({name,ok:fn()!==false});}catch(e){t.push({name,ok:false,error:e.message});}};
 const members=[
  {id:"R1",axis:"transverse",frame:1,type:"رفتر چپ",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,tributaryWidth:4}},
  {id:"R2",axis:"transverse",frame:1,type:"رفتر راست",start:"B",end:"T",lineLoads:{dead:0,live:0,snow:0,tributaryWidth:4}},
  {id:"P1",sectionKey:"roofPurlin",start:"B",end:"T",lineLoads:{dead:1,live:.5,snow:.5,windLeft:-.2,windRight:-.2,tributaryWidth:1.2}},
  {id:"W1",sectionKey:"wallGirt",start:"B",end:"T",lineLoads:{wind:.3,tributaryHeight:2}},
  {id:"E1",sectionKey:"endGirt",start:"B",end:"T",lineLoads:{windEnd:.4,tributaryHeight:2}},
  {id:"WB",sectionKey:"wallBrace",start:"B",end:"T"},
  {id:"RB",sectionKey:"roofBrace",start:"B",end:"T"}
 ];
 const model={geometry:{frames:[0]},nodes:[{id:"B",kind:"base"},{id:"T"}],members};
 const loads={deadLeft:.5,deadRight:.5,liveLeft:.5,liveRight:.5,snowLeft:1,snowRight:1,windLeft:-.2,windRight:-.2,windWall:.3,windEndFront:.4,windEndBack:.4,combinations:[{id:"C1",name:"نمونه",dead:1.2,live:1.6,snow:0}]};
 test("complete member load paths accepted",()=>audit(model,loads).success);
 test("missing roof wind transfer detected",()=>{const p=JSON.parse(JSON.stringify(model));delete p.members[2].lineLoads.windLeft;return !audit(p,loads).success;});
 test("missing wall girt detected",()=>{const p={...model,members:model.members.filter(m=>m.sectionKey!=="wallGirt")};return !audit(p,loads).success;});
 test("missing end-wall girt detected",()=>{const p={...model,members:model.members.filter(m=>m.sectionKey!=="endGirt")};return !audit(p,loads).success;});
 test("missing area load input detected",()=>{const p={...loads};delete p.snowRight;return !audit(model,p).success;});
 test("non-finite member line load detected",()=>{const p=JSON.parse(JSON.stringify(model));p.members[0].lineLoads.dead=NaN;return !audit(p,loads).success;});
 test("roof purlin tributary width required",()=>{const p=JSON.parse(JSON.stringify(model));p.members[2].lineLoads.tributaryWidth=0;return !audit(p,loads).success;});
 test("incomplete combination factors detected",()=>{const p={...loads,combinations:[{id:"C",dead:1.2,live:null,snow:0}]};return !audit(model,p).success;});
 test("duplicate member identifiers detected",()=>{const p={...model,members:[...members,{...members[0]}]};return !audit(p,loads).success;});
 test("all load groups explicitly reported",()=>audit(model,loads).rows.length===9);
 test("wind signs are preserved",()=>audit(model,loads).success&&members[2].lineLoads.windLeft===-.2);
 test("never enables analysis or approves design",()=>{const r=audit(model,loads);return r.analysisEnabled===false&&r.designApproved===false;});
 test("roof gravity is assigned to purlins not rafters",()=>audit(model,loads).rows.find(r=>r.id==="dead").memberCount===1 );
 test("nonzero direct roof gravity on rafter is rejected",()=>{const p=JSON.parse(JSON.stringify(model));p.members[0].lineLoads.dead=1;return !audit(p,loads).success;} );
 test("rafter explicit zero load is accepted",()=>audit(model,loads).rows.find(r=>r.id==="rafter-reaction-path").status==="assigned" );
 test("disconnected loaded member rejected",()=>{const p=JSON.parse(JSON.stringify(model));p.members[2].start="ORPHAN";return !audit(p,loads).success;});
 test("missing model rejected",()=>!audit(null,loads).success);
 test("empty combination list allowed as load-path audit only",()=>{const p={...loads,combinations:[]};return audit(model,p).success;});
 return {passed:t.filter(x=>x.ok).length,failed:t.filter(x=>!x.ok).length,total:t.length,tests:t};
}
function mount(){
 const doc=root.document;if(!doc||doc.getElementById("wholeBuildingLoadPathPanel"))return;
 const main=doc.querySelector("main");if(!main)return;
 const panel=doc.createElement("section");panel.className="panel";panel.id="wholeBuildingLoadPathPanel";
 panel.innerHTML="<div class='panel-title'><h3>ممیزی مسیر بار کل سوله</h3><span class='status'>کنترل تخصیص بار</span></div><p>کنترل می‌کند بارهای سطحی ثبت‌شده به رفترها، پرلین‌ها و لاپه‌های دیوار و انتهایی تخصیص یافته باشند.</p><div class='button-grid'><button class='btn secondary' id='btnWholeBuildingLoadPath' type='button'>اجرای ممیزی مسیر بار</button></div><pre id='wholeBuildingLoadPathResults' style='white-space:pre-wrap'></pre><div class='notice'>این گزارش صحت مقدار بار یا انطباق آیین‌نامه‌ای را تأیید نمی‌کند.</div>";
 const reg=doc.getElementById("engineeringRegressionPanel");if(reg)reg.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
 doc.getElementById("btnWholeBuildingLoadPath").addEventListener("click",run);
}
root.SteelWholeBuildingLoadPathAudit={audit,run,selfTest};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
