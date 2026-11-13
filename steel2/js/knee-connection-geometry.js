/* SAHROUD STEEL - knee connection geometry stage; not a resistance design. */
(function(w){
"use strict";
const $=id=>document.getElementById(id),N=v=>Number.isFinite(Number(v))?Number(v):null;
function node(m,id){return m.nodes.find(n=>String(n.id)===String(id));}
function unit(v){const l=Math.hypot(v.x,v.y,v.z);if(!(l>0))throw Error("بردار عضو نامعتبر است.");return{x:v.x/l,y:v.y/l,z:v.z/l};}
function extract(m){
 if(!m||!Array.isArray(m.nodes)||!Array.isArray(m.members))throw Error("ابتدا مدل سه‌بعدی را تولید کنید.");
 const out=[];
 m.nodes.filter(n=>n.kind==="eave").forEach(n=>{
  const col=m.members.find(x=>x.sectionKey==="column"&&(x.start===n.id||x.end===n.id));
  const raf=m.members.filter(x=>x.sectionKey==="rafter"&&x.axis==="transverse"&&!x.endFace&&(x.start===n.id||x.end===n.id));
  if(!col)return;
  raf.forEach(r=>{
   const cn=node(m,col.start===n.id?col.end:col.start),rn=node(m,r.start===n.id?r.end:r.start);if(!cn||!rn)return;
   const vc=unit({x:cn.x-n.x,y:cn.y-n.y,z:cn.z-n.z}),vr=unit({x:rn.x-n.x,y:rn.y-n.y,z:rn.z-n.z});
   out.push({id:"F"+r.frame+"-"+(n.x<=m.geometry.span/2?"left":"right"),frame:r.frame,side:n.x<=m.geometry.span/2?"left":"right",node:n,column:{id:col.id,length:Math.hypot(cn.x-n.x,cn.y-n.y,cn.z-n.z),vector:vc},rafter:{id:r.id,length:Math.hypot(rn.x-n.x,rn.y-n.y,rn.z-n.z),vector:vr},angle:Math.acos(Math.max(-1,Math.min(1,vc.x*vr.x+vc.y*vr.y+vc.z*vr.z)))*180/Math.PI});
  });
 });
 return out.sort((a,b)=>a.frame-b.frame||a.side.localeCompare(b.side));
}
function check(k,p){
 const errors=[],warnings=["این آرایش فقط کنترل جاگیری هندسی است؛ مقاومت پیچ، ورق، جوش، بلوک برشی، لهیدگی، اثر اهرمی و الزامات آیین‌نامه‌ای بررسی نشده‌اند.","ورق در نمای قاب یک پوش مفهومی است، نه جزئیات واقعی ساخت یا اتصال مصوب."];
 ["w","h","t","d","dh","edge","pitch","gauge","rows","cols"].forEach(x=>{if(!(p[x]>0))errors.push(x+" باید مثبت باشد.");});
 if(p.dh<=p.d)errors.push("قطر سوراخ باید از قطر پیچ بزرگ‌تر باشد.");
 if(!Number.isInteger(p.rows)||p.rows<2||!Number.isInteger(p.cols)||p.cols<2)errors.push("حداقل دو ردیف و دو ستون پیچ لازم است.");
 const rw=2*p.edge+(p.cols-1)*p.gauge+p.dh,rh=2*p.edge+(p.rows-1)*p.pitch+p.dh;
 if(p.w<rw)errors.push("عرض ورق ناکافی؛ حداقل هندسی "+rw.toFixed(1)+" mm.");
 if(p.h<rh)errors.push("طول ورق ناکافی؛ حداقل هندسی "+rh.toFixed(1)+" mm.");
 return{valid:!errors.length,errors,warnings,rw,rh};
}
function drawing(k,p){
 const x=350,y=285,s=210,cv=k.column.vector,rv=k.rafter.vector;
 const cp={x:x+cv.x*Math.min(1.3,k.column.length)*s,y:y-cv.y*Math.min(1.3,k.column.length)*s},rp={x:x+rv.x*Math.min(1.7,k.rafter.length)*s,y:y-rv.y*Math.min(1.7,k.rafter.length)*s};
 const a=Math.atan2(-(cv.y+rv.y),cv.x+rv.x),u={x:Math.cos(a),y:Math.sin(a)},v={x:-Math.sin(a),y:Math.cos(a)};
 const W=Math.min(230,Math.max(100,p.w*.28)),H=Math.min(300,Math.max(120,p.h*.28));
 const poly=[[-W/2,-H/2],[W/2,-H/2],[W/2,H/2],[-W/2,H/2]].map(([i,j])=>(x+i*u.x+j*v.x)+","+(y+i*u.y+j*v.y)).join(" ");
 const bolts=[];for(let i=0;i<Math.min(5,p.rows);i++)for(let j=0;j<Math.min(5,p.cols);j++){const a1=(j/(p.cols-1)-.5)*W*.72,b1=(i/(p.rows-1)-.5)*H*.72;bolts.push([x+a1*u.x+b1*v.x,y+a1*u.y+b1*v.y]);}
 return '<svg viewBox="0 0 700 410" style="width:100%;height:auto;background:#f8fafc"><line x1="'+x+'" y1="'+y+'" x2="'+cp.x+'" y2="'+cp.y+'" stroke="#176b9b" stroke-width="24"/><line x1="'+x+'" y1="'+y+'" x2="'+rp.x+'" y2="'+rp.y+'" stroke="#d97706" stroke-width="20"/><polygon points="'+poly+'" fill="#0f766e" fill-opacity=".2" stroke="#0f766e" stroke-width="3"/>'+bolts.map(b=>'<circle cx="'+b[0]+'" cy="'+b[1]+'" r="5" fill="white" stroke="#111827" stroke-width="2"/>').join("")+'<circle cx="'+x+'" cy="'+y+'" r="6" fill="#b91c1c"/><text x="20" y="25" fill="#176b9b">ستون '+k.column.id+'</text><text x="520" y="25" fill="#b45309">رفتر '+k.rafter.id+'</text><text x="20" y="390" fill="#334155">نمای قاب؛ ورق و پیچ‌ها صرفاً مفهومی و غیر اجرایی</text></svg>';
}
function test(){
 const m={geometry:{span:12},nodes:[{id:"E",x:0,y:6,z:0,kind:"eave"},{id:"C",x:0,y:0,z:0},{id:"R",x:6,y:7.2,z:0}],members:[{id:"COL",start:"C",end:"E",sectionKey:"column"},{id:"RAF",start:"E",end:"R",sectionKey:"rafter",axis:"transverse",frame:1}]};
 const k=extract(m)[0],p={w:500,h:650,t:16,d:20,dh:22,edge:50,pitch:120,gauge:100,rows:4,cols:3},v=check(k,p),bad=check(k,{...p,w:100});
 const c=[!!k&&k.node.id==="E",k.column.id==="COL"&&k.rafter.id==="RAF",Math.abs(k.angle-101.31)<.02,v.valid,!bad.valid,v.warnings.length===2];
 return{passed:c.filter(Boolean).length,total:c.length,checks:c};
}
function mount(){
 if(!$("kneeConnectionGeometryPanel")){
 const p=document.createElement("section");p.className="panel";p.id="kneeConnectionGeometryPanel";
 p.innerHTML='<div class="panel-title"><h3>اتصال زانویی ستون به رفتر ـ هندسه اولیه</h3><span class="status">مرحله هندسی</span></div><div class="notice">گره مشترک از مدل سه‌بعدی استخراج می‌شود. این مرحله هندسه و جاگیری اولیه را بررسی می‌کند؛ ظرفیت اتصال و نقشه ساخت هنوز طراحی نشده‌اند.</div><div class="form-grid"><div class="field"><label for="kneeSelect">قاب و سمت</label><select id="kneeSelect"></select></div><div class="field"><label for="kneeW">عرض پوش ورق (mm)</label><input id="kneeW" type="number" value="500"></div><div class="field"><label for="kneeH">طول پوش ورق (mm)</label><input id="kneeH" type="number" value="650"></div><div class="field"><label for="kneeT">ضخامت ورق (mm)</label><input id="kneeT" type="number" value="16"></div><div class="field"><label for="kneeD">قطر پیچ (mm)</label><input id="kneeD" type="number" value="20"></div><div class="field"><label for="kneeDh">قطر سوراخ (mm)</label><input id="kneeDh" type="number" value="22"></div><div class="field"><label for="kneeRows">ردیف پیچ</label><input id="kneeRows" type="number" value="4"></div><div class="field"><label for="kneeCols">ستون پیچ</label><input id="kneeCols" type="number" value="3"></div><div class="field"><label for="kneePitch">گام ردیف (mm)</label><input id="kneePitch" type="number" value="120"></div><div class="field"><label for="kneeGauge">فاصله ستون‌ها (mm)</label><input id="kneeGauge" type="number" value="100"></div><div class="field"><label for="kneeEdge">فاصله لبه (mm)</label><input id="kneeEdge" type="number" value="50"></div></div><div class="button-grid"><button id="btnKneeExtract" class="btn primary">استخراج زانویی‌ها</button><button id="btnKneeCsv" class="btn secondary" disabled>خروجی CSV</button></div><div id="kneeSummary" class="notice">مدل سه‌بعدی را تولید کنید.</div><div id="kneeDrawing" class="drawing-area"></div><div id="kneeChecks" class="notice"></div>';
 const anchor=$("connectionDemandRegistryPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else document.querySelector("main")?.appendChild(p);
 }
 let knees=[],selected=null;const ids=["kneeW","kneeH","kneeT","kneeD","kneeDh","kneeRows","kneeCols","kneePitch","kneeGauge","kneeEdge"];
 const read=()=>({w:N($("kneeW").value),h:N($("kneeH").value),t:N($("kneeT").value),d:N($("kneeD").value),dh:N($("kneeDh").value),rows:N($("kneeRows").value),cols:N($("kneeCols").value),pitch:N($("kneePitch").value),gauge:N($("kneeGauge").value),edge:N($("kneeEdge").value)});
 function render(){selected=knees.find(k=>k.id===$("kneeSelect").value);if(!selected)return;const p=read(),v=check(selected,p),fmt=n=>Number(n).toLocaleString("fa-IR",{maximumFractionDigits:3});$("kneeSummary").innerHTML='<b>قاب '+selected.frame+' ـ '+(selected.side==="left"?"چپ":"راست")+'</b><br>گره: '+selected.node.id+'؛ مختصات X/Y/Z: '+[selected.node.x,selected.node.y,selected.node.z].map(fmt).join(" / ")+' m<br>ستون: '+selected.column.id+'، قطعه مجاور '+fmt(selected.column.length)+' m؛ رفتر: '+selected.rafter.id+'، قطعه مجاور '+fmt(selected.rafter.length)+' m<br>زاویه بین امتداد دو عضو از گره: '+fmt(selected.angle)+'°';$("kneeDrawing").innerHTML=drawing(selected,p);$("kneeChecks").innerHTML=(v.valid?"جاگیری هندسی اولیه مناسب است.":"جاگیری هندسی نیازمند اصلاح است.")+(v.errors.length?"<ul>"+v.errors.map(e=>"<li>"+e+"</li>").join("")+"</ul>":"")+"<ul>"+v.warnings.map(w=>"<li>"+w+"</li>").join("")+"</ul>";}
 function refresh(){try{knees=extract(w.SteelStructuralModel?.model||w.SteelStructuralModel?.build?.());const s=$("kneeSelect"),old=s.value;s.innerHTML=knees.map(k=>'<option value="'+k.id+'">قاب '+k.frame+' ـ '+(k.side==="left"?"چپ":"راست")+'</option>').join("");if(!knees.length)throw Error("زانویی مشترک ستون و رفتر در مدل پیدا نشد.");s.value=knees.some(k=>k.id===old)?old:knees[0].id;render();$("btnKneeCsv").disabled=false;}catch(e){$("kneeSummary").textContent=e.message;$("btnKneeCsv").disabled=true;}}
 $("btnKneeExtract").addEventListener("click",refresh);$("kneeSelect").addEventListener("change",render);ids.forEach(id=>$(id).addEventListener("input",render));
 $("btnKneeCsv").addEventListener("click",()=>{if(!knees.length)return;const rows=[["Frame","Side","Node","X_m","Y_m","Z_m","Column","Rafter","Angle_deg","PlateW_mm","PlateH_mm","PlateT_mm","BoltD_mm","HoleD_mm","Rows","Cols","Pitch_mm","Gauge_mm","Edge_mm"]];knees.forEach(k=>{const p=read();rows.push([k.frame,k.side,k.node.id,k.node.x,k.node.y,k.node.z,k.column.id,k.rafter.id,k.angle,p.w,p.h,p.t,p.d,p.dh,p.rows,p.cols,p.pitch,p.gauge,p.edge]);});const csv="\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),u=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="sahroud-knee-geometry.csv";a.click();URL.revokeObjectURL(u);});
 refresh();
}
w.SteelKneeConnectionGeometry={extract,check,drawing,test};
if(typeof module!=="undefined"&&module.exports)module.exports=w.SteelKneeConnectionGeometry;
if(w.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
