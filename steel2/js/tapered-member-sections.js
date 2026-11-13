/* SAHROUD STEEL — three-station tapered welded I-section model.
 * Station dimensions are linearly interpolated; the 3D solver receives a
 * piecewise-prismatic property set at each existing member-segment midpoint.
 * This is not an exact tapered-beam stiffness formulation or code check.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const GROUPS=[["column","ستون"],["rafter","رفتر"]];
const STATIONS=[["start","ابتدا"],["mid","میانه"],["end","انتها"]];
const DIMS=[["d","عمق d (mm)"],["bf","عرض بال bf (mm)"],["tw","ضخامت جان tw (mm)"],["tf","ضخامت بال tf (mm)"]];
let data={schemaVersion:1,segmentsPerMember:8,groups:{column:{enabled:false,stations:{}},rafter:{enabled:false,stations:{}}}};
let audit=[];
function clone(v){return JSON.parse(JSON.stringify(v));}
function normalize(v){
 const out={schemaVersion:1,segmentsPerMember:Math.max(2,Math.min(24,Math.floor(Number(v?.segmentsPerMember)||8))),groups:{}};
 GROUPS.forEach(([g])=>{
  const src=v?.groups?.[g]||{},stations={};
  STATIONS.forEach(([s])=>{stations[s]={};DIMS.forEach(([d])=>{const n=Number(src.stations?.[s]?.[d]);stations[s][d]=Number.isFinite(n)&&n>0?n:null;});});
  out.groups[g]={enabled:src.enabled===true,stations};
 });
 return out;
}
function calculate(v){
 const d=Number(v.d),bf=Number(v.bf),tw=Number(v.tw),tf=Number(v.tf);
 if(![d,bf,tw,tf].every(x=>Number.isFinite(x)&&x>0)||d<=2*tf||bf<=tw)throw Error("ابعاد مقطع I نامعتبر است؛ باید d>2tf و bf>tw باشد.");
 const hw=d-2*tf,A=2*bf*tf+hw*tw;
 const Ix=(bf*d**3-(bf-tw)*hw**3)/12;
 const Iy=(2*tf*bf**3+hw*tw**3)/12;
 const J=(2*bf*tf**3+hw*tw**3)/3;
 const Sx=Ix/(d/2),Sy=Iy/(bf/2),Aw=hw*tw;
 return {A_cm2:A/100,Ix_cm4:Ix/1e4,Iy_cm4:Iy/1e4,J_cm4:J/1e4,
  SxTop_cm3:Sx/1000,SxBottom_cm3:Sx/1000,Sy_cm3:Sy/1000,Aw_cm2:Aw/100,
  flangeOutstandRatio:(bf-tw)/(2*tf),webDepthThicknessRatio:hw/tw};
}
function interpolate(a,b,t){return a+(b-a)*t;}
function at(group,t){
 const g=data.groups[group];if(!g?.enabled)return null;
 const s=g.stations;
 const vals=STATIONS.map(([key])=>s[key]);
 vals.forEach((v,i)=>DIMS.forEach(([d])=>{if(!(Number(v[d])>0))throw Error("ابعاد "+(GROUPS.find(x=>x[0]===group)?.[1]||group)+" در ایستگاه "+STATIONS[i][1]+" ناقص است.");}));
 const x=Math.max(0,Math.min(1,t)),left=x<=0.5?vals[0]:vals[1],right=x<=0.5?vals[1]:vals[2],f=x<=0.5?x*2:(x-0.5)*2;
 const dims={};DIMS.forEach(([d])=>dims[d]=interpolate(Number(left[d]),Number(right[d]),f));
 return {...calculate(dims),dimensions:dims,stationCoordinate:x};
}
function coordinate(group,member,nodes,project){
 const byId=new Map((nodes||[]).map(n=>[String(n.id),n]));
 const a=byId.get(String(member.start)),b=byId.get(String(member.end));
 if(!a||!b)throw Error("مختصات عضو برای تعیین ایستگاه مقطع پیدا نشد.");
 const x=(a.x+b.x)/2,y=(a.y+b.y)/2,span=Number(project?.span),height=Number(project?.height);
 if(group==="column"){
  if(!(height>0))throw Error("ارتفاع ستون پروژه معتبر نیست.");
  return Math.max(0,Math.min(1,y/height));
 }
 if(!(span>0))throw Error("دهانه پروژه معتبر نیست.");
 const half=span/2;
 return Math.max(0,Math.min(1,x<=half?x/half:(span-x)/half));
}
function segmentModel(model,project,segmentsPerMember){
 const count=Math.max(2,Math.min(24,Math.floor(Number(segmentsPerMember)||data.segmentsPerMember||8)));
 const original=Array.isArray(model?.members)?model.members:[];
 const nodes=Array.isArray(model?.nodes)?model.nodes:[];
 const byId=new Map(nodes.map(n=>[String(n.id),n]));
 const output=[],addedNodes=[];
 const usedMemberIds=new Set(original.map(m=>String(m.id)));
 let splitMembers=0,generatedSegments=0;
 original.forEach(member=>{
  const group=member?.sectionKey;
  if(!GROUPS.some(([g])=>g===group)||!data.groups[group]?.enabled){output.push(member);return;}
  const a=byId.get(String(member.start)),b=byId.get(String(member.end));
  if(!a||!b)throw Error("عضو متغیرمقطع "+member.id+" به گره ابتدا/انتها متصل نیست؛ تحلیل با هندسه ناقص متوقف شد.");
  if(![a.x,a.y,a.z,b.x,b.y,b.z].every(v=>Number.isFinite(Number(v))))throw Error("مختصات عضو متغیرمقطع "+member.id+" نامعتبر است.");
  at(group,0);at(group,0.5);at(group,1);
  // Divide each physical member into equal-length analysis elements. A segment's
  // section is evaluated at its own midpoint by resolveForMember().
  const localNodes=[a];
  for(let i=1;i<count;i++){
   const t=i/count,id=String(member.id)+"_TAPER_N"+i;
   if(byId.has(id))throw Error("شناسه گره تقسیم مقطع متغیر تکراری است: "+id);
   const n={id,x:interpolate(Number(a.x),Number(b.x),t),y:interpolate(Number(a.y),Number(b.y),t),z:interpolate(Number(a.z),Number(b.z),t),kind:"taper-analysis"};
   localNodes.push(n);addedNodes.push(n);byId.set(id,n);
  }
  localNodes.push(b);
  for(let i=0;i<count;i++){
   const first=i===0,last=i===count-1;
   const pieceId=String(member.id)+"_TAPER_"+String(i+1).padStart(2,"0");
   if(usedMemberIds.has(pieceId))throw Error("شناسه عضو تقسیم‌شده تکراری است: "+pieceId);
   usedMemberIds.add(pieceId);
   const piece={
    ...member,id:pieceId,
    start:localNodes[i].id,end:localNodes[i+1].id,
    length:Math.hypot(localNodes[i+1].x-localNodes[i].x,localNodes[i+1].y-localNodes[i].y,localNodes[i+1].z-localNodes[i].z),
    parentMemberId:String(member.id),taperSegmentIndex:i+1,taperSegmentCount:count
   };
   if(member.endReleases)piece.endReleases={i:first?(member.endReleases.i||[]):[],j:last?(member.endReleases.j||[]):[]};
   if(member.endOffsets)piece.endOffsets={i:first?(member.endOffsets.i||[0,0,0]):[0,0,0],j:last?(member.endOffsets.j||[0,0,0]):[0,0,0]};
   delete piece.analysisLoad;delete piece.taperApplied;delete piece.taperCoordinate;delete piece.taperProperties;
   output.push(piece);generatedSegments++;
  }
  splitMembers++;
 });
 return {model:{...model,nodes:nodes.concat(addedNodes),members:output},audit:{enabledGroups:GROUPS.filter(([g])=>data.groups[g].enabled).map(([g])=>g),originalMemberCount:original.length,splitMemberCount:splitMembers,generatedSegmentCount:generatedSegments,addedNodeCount:addedNodes.length,segmentsPerMember:count,note:"تقسیم‌بندی خطی برای تقریب سختی متغیرمقطع؛ نیازمند آزمون همگرایی و اعتبارسنجی با مدل مرجع است."}};
}
function resolveForMember(member,nodes,project,base){
 const group=member?.sectionKey;
 if(!GROUPS.some(([g])=>g===group)||!data.groups[group]?.enabled)return {section:base,applied:false};
 const t=coordinate(group,member,nodes,project),p=at(group,t);
 // Solver local bending convention: Iz is the major-axis inertia for the
 // current frame-section orientation; Iy is the weak-axis inertia.
 const section={...base,A:p.A_cm2*1e-4,Iy:p.Iy_cm4*1e-8,Iz:p.Ix_cm4*1e-8,J:p.J_cm4*1e-8,
  profile:(base.profile||group)+" / tapered@"+t.toFixed(3),tapered:true,taperCoordinate:t,taperDimensions:p.dimensions};
 return {section,applied:true,coordinate:t,properties:p};
}
function read(){
 const countEl=$("taper_segmentsPerMember");if(countEl)data.segmentsPerMember=Math.max(2,Math.min(24,Math.floor(Number(countEl.value)||8)));
 GROUPS.forEach(([g])=>{
  const enabled=$("taper_"+g+"_enabled");data.groups[g].enabled=!!enabled?.checked;
  STATIONS.forEach(([s])=>DIMS.forEach(([d])=>{
   const el=$("taper_"+g+"_"+s+"_"+d),n=el?Number(el.value):NaN;
   data.groups[g].stations[s][d]=Number.isFinite(n)&&n>0?n:null;
  }));
 });
 return getData();
}
function getData(){return clone(data);}
function setData(v){data=normalize(v);render();}
function render(){
 const host=$("taperedSectionsContent");if(!host)return;
 host.innerHTML="<div class='field'><label for='taper_segmentsPerMember'>تعداد قطعات تحلیل برای هر عضو متغیرمقطع</label><select id='taper_segmentsPerMember'>"+[4,6,8,12,16,20,24].map(n=>"<option value='"+n+"' "+(data.segmentsPerMember===n?"selected":"")+">"+n+" قطعه</option>").join("")+"</select></div>"+GROUPS.map(([g,label])=>{
  const q=data.groups[g];
  return '<details class="sub-panel" open><summary>'+label+' — تیرورق متغیرعمق</summary><label><input type="checkbox" id="taper_'+g+'_enabled" '+(q.enabled?'checked':'')+'> اعمال مقطع متغیر در تحلیل سه‌بعدی</label><div class="notice">سه ایستگاه هندسی با درون‌یابی خطی: ستون از پای ستون به بالا و رفتر از لبه بام به تاج؛ این جهت‌گذاری مستقل از ترتیب گره‌های ابتدا/انتهای عضو است. نسبت‌های خروج بال و لاغری جان صرفاً هندسی‌اند و به‌تنهایی تأیید لاغری موضعی آیین‌نامه‌ای نیستند.</div><div class="form-grid">'+STATIONS.map(([s,sl])=>DIMS.map(([d,dl])=>'<div class="field"><label for="taper_'+g+'_'+s+'_'+d+'">'+sl+' — '+dl+'</label><input type="number" min="0" step="0.1" id="taper_'+g+'_'+s+'_'+d+'" value="'+(q.stations[s][d]??'')+'"></div>').join('')).join('')+'</div></details>';
 }).join('')+'<div class="button-grid"><button class="btn secondary" type="button" id="btnTaperAudit">کنترل هندسه و ایستگاه‌های مقطع</button></div><div id="taperedSectionsResults"></div>';
 $("btnTaperAudit").addEventListener("click",runAudit);
}
function runAudit(){
 read();const rows=[];
 GROUPS.forEach(([g,label])=>{
  if(!data.groups[g].enabled){rows.push("<p>"+label+": غیرفعال</p>");return;}
  try{
   const items=STATIONS.map(([s,sl])=>({label:sl,...calculate(data.groups[g].stations[s])}));
   rows.push("<h4>"+label+"</h4><table class='data-table'><thead><tr><th>ایستگاه</th><th>A (cm²)</th><th>Ix (cm⁴)</th><th>Iy (cm⁴)</th><th>J تقریبی (cm⁴)</th><th>Sx (cm³)</th><th>Sy (cm³)</th><th>Aw (cm²)</th><th>خروج بال</th><th>لاغری جان</th></tr></thead><tbody>"+items.map(x=>"<tr><td>"+x.label+"</td><td>"+x.A_cm2.toFixed(2)+"</td><td>"+x.Ix_cm4.toFixed(2)+"</td><td>"+x.Iy_cm4.toFixed(2)+"</td><td>"+x.J_cm4.toFixed(2)+"</td><td>"+x.SxTop_cm3.toFixed(2)+"</td><td>"+x.Sy_cm3.toFixed(2)+"</td><td>"+x.Aw_cm2.toFixed(2)+"</td><td>"+x.flangeOutstandRatio.toFixed(2)+"</td><td>"+x.webDepthThicknessRatio.toFixed(2)+"</td></tr>").join("")+"</tbody></table>");
  }catch(e){rows.push("<p style='color:#b45309'>"+label+": "+e.message+"</p>");}
 });
 $("taperedSectionsResults").innerHTML=rows.join("")+"<div class='notice'>تحلیل فعلی برای هر قطعه هندسی موجود، خواص مقطع متناظر با نقطه میانی را ثابت فرض می‌کند. بنابراین تقریب قطعه‌ای است، نه ماتریس سختی دقیق عضو با تغییر پیوسته مقطع. برای دقت بیشتر باید تقسیم‌بندی عضو در محل تغییرات عمق ریزتر شود و فرمول سختی تیرورق متغیرمقطع اعتبارسنجی شود.</div>";
 return {rows};
}
function selfTest(){
 const tests=[];
 const c=calculate({d:300,bf:150,tw:8,tf:12});
 tests.push({name:"positive-properties",pass:c.A_cm2>0&&c.Ix_cm4>c.Iy_cm4&&c.J_cm4>0});
 const q=normalize({groups:{rafter:{enabled:true,stations:{start:{d:500,bf:200,tw:8,tf:12},mid:{d:400,bf:200,tw:8,tf:12},end:{d:300,bf:200,tw:8,tf:12}}}}});
 const old=data;data=q;const mid=at("rafter",0.5);data=old;
 tests.push({name:"mid-station-interpolation",pass:Math.abs(mid.dimensions.d-400)<1e-9});
 tests.push({name:"disabled-by-default",pass:normalize({}).groups.column.enabled===false});
 tests.push({name:"analysis-segment-count-default",pass:normalize({}).segmentsPerMember===8});
 const oldData=data;data=normalize({groups:{column:{enabled:true,stations:{start:{d:500,bf:200,tw:10,tf:16},mid:{d:400,bf:200,tw:10,tf:16},end:{d:300,bf:200,tw:10,tf:16}}}}});
 const sourceModel={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:0,y:6,z:0}],members:[{id:"C1",start:"A",end:"B",sectionKey:"column",lineLoads:{dead:2},endReleases:{i:[4],j:[5]}}]};
 const segmented=segmentModel(sourceModel,{height:6,span:12},8);
 tests.push({name:"piecewise-member-segmentation",pass:segmented.audit.generatedSegmentCount===8&&segmented.audit.addedNodeCount===7&&segmented.model.members[0].endReleases.i[0]===4&&segmented.model.members[7].endReleases.j[0]===5&&segmented.model.members.every(m=>m.lineLoads.dead===2)});
 let missingNodeRejected=false;try{segmentModel({nodes:[{id:"A",x:0,y:0,z:0}],members:[{id:"BAD",start:"A",end:"MISSING",sectionKey:"column"}]},{height:6,span:12},8);}catch(e){missingNodeRejected=e.message.includes("گره ابتدا/انتها");}
 tests.push({name:"missing-taper-endpoint-rejected",pass:missingNodeRejected});
 let duplicateMemberRejected=false;try{segmentModel({nodes:sourceModel.nodes,members:[...sourceModel.members,{id:"C1_TAPER_01",start:"A",end:"B",sectionKey:"other"}]},{height:6,span:12},8);}catch(e){duplicateMemberRejected=e.message.includes("شناسه عضو تقسیم‌شده تکراری");}
 tests.push({name:"generated-member-id-collision-rejected",pass:duplicateMemberRejected});
 const first=segmented.model.members[0],last=segmented.model.members[7],base={E:200e9,G:77e9,A:0.01,Iy:1e-5,Iz:1e-4,J:1e-6};
 const pFirst=resolveForMember(first,segmented.model.nodes,{height:6,span:12},base),pLast=resolveForMember(last,segmented.model.nodes,{height:6,span:12},base);
 tests.push({name:"section-properties-vary-along-member",pass:pFirst.applied&&pLast.applied&&pFirst.coordinate<pLast.coordinate&&pFirst.section.A!==pLast.section.A});
 data=oldData;
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests};
}
function init(){
 if($("taperedSectionsPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="taperedSectionsPanel";
 p.innerHTML="<div class='panel-title'><h3>مقاطع تیرورق متغیرعمق ستون و رفتر</h3><span class='status'>سه ایستگاه هندسی</span></div><div class='notice'>این ابزار برای مقاطع جوشی I با جان و بال‌های مستطیلی است. شعاع گوشه، جوش، سخت‌کننده، ورق مضاعف، تغییر ناگهانی مقطع و اثرات موضعی در خواص هندسی منظور نشده‌اند. تا زمان ورود داده، حالت متغیر غیرفعال است و مقاطع فعلی پروژه تغییر نمی‌کنند.</div><div id='taperedSectionsContent'></div>";
 const anchor=$("sectionGeometryAuditPanel")||$("steelSectionsPanel");
 if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);
 render();
}
root.SteelTaperedSections={calculate,at,segmentModel,resolveForMember,getData,read,setData,runAudit,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
