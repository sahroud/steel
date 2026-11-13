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
let data={schemaVersion:1,groups:{column:{enabled:false,stations:{}},rafter:{enabled:false,stations:{}}}};
let audit=[];
function clone(v){return JSON.parse(JSON.stringify(v));}
function normalize(v){
 const out={schemaVersion:1,groups:{}};
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
 return {A_cm2:A/100,Ix_cm4:Ix/1e4,Iy_cm4:Iy/1e4,J_cm4:J/1e4};
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
 host.innerHTML=GROUPS.map(([g,label])=>{
  const q=data.groups[g];
  return '<details class="sub-panel" open><summary>'+label+' — تیرورق متغیرعمق</summary><label><input type="checkbox" id="taper_'+g+'_enabled" '+(q.enabled?'checked':'')+'> اعمال مقطع متغیر در تحلیل سه‌بعدی</label><div class="notice">سه ایستگاه از ابتدا تا انتهای عضو؛ ابعاد بین ایستگاه‌ها خطی درون‌یابی می‌شوند.</div><div class="form-grid">'+STATIONS.map(([s,sl])=>DIMS.map(([d,dl])=>'<div class="field"><label for="taper_'+g+'_'+s+'_'+d+'">'+sl+' — '+dl+'</label><input type="number" min="0" step="0.1" id="taper_'+g+'_'+s+'_'+d+'" value="'+(q.stations[s][d]??'')+'"></div>').join('')).join('')+'</div></details>';
 }).join('')+'<div class="button-grid"><button class="btn secondary" type="button" id="btnTaperAudit">کنترل هندسه و ایستگاه‌های مقطع</button></div><div id="taperedSectionsResults"></div>';
 $("btnTaperAudit").addEventListener("click",runAudit);
}
function runAudit(){
 read();const rows=[];
 GROUPS.forEach(([g,label])=>{
  if(!data.groups[g].enabled){rows.push("<p>"+label+": غیرفعال</p>");return;}
  try{
   const items=STATIONS.map(([s,sl])=>({label:sl,...calculate(data.groups[g].stations[s])}));
   rows.push("<h4>"+label+"</h4><table class='data-table'><thead><tr><th>ایستگاه</th><th>A (cm²)</th><th>Ix (cm⁴)</th><th>Iy (cm⁴)</th><th>J تقریبی (cm⁴)</th></tr></thead><tbody>"+items.map(x=>"<tr><td>"+x.label+"</td><td>"+x.A_cm2.toFixed(2)+"</td><td>"+x.Ix_cm4.toFixed(2)+"</td><td>"+x.Iy_cm4.toFixed(2)+"</td><td>"+x.J_cm4.toFixed(2)+"</td></tr>").join("")+"</tbody></table>");
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
root.SteelTaperedSections={calculate,at,resolveForMember,getData,read,setData,runAudit,selfTest};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
