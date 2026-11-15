/* SAHROUD STEEL — model-driven structural view gallery */
(function () {
"use strict";
const NS="http://www.w3.org/2000/svg",$=id=>document.getElementById(id);
let activeIndex=0,slides=[];
const C={column:"#176b9b",rafter:"#d97706",brace:"#dc2626",crane:"#7c3aed",rail:"#f59e0b",girt:"#64748b",grid:"#e5edf2",bg:"#f8fafc"};
const api=()=>window.SteelStructuralModel;
function ensureModel(){return api()?.model||null;}
function root(svg,W=900,H=470){svg.innerHTML="";svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("preserveAspectRatio","xMidYMid meet");const el=(tag,a)=>{const n=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));svg.appendChild(n);return n;};el("rect",{x:0,y:0,width:W,height:H,fill:C.bg});for(let x=30;x<W;x+=30)el("line",{x1:x,y1:35,x2:x,y2:H-35,stroke:C.grid,"stroke-width":1});for(let y=45;y<H-35;y+=30)el("line",{x1:20,y1:y,x2:W-20,y2:y,stroke:C.grid,"stroke-width":1});const line=(x1,y1,x2,y2,color="#64748b",width=3,dash="")=>{const a={x1,y1,x2,y2,stroke:color,"stroke-width":width,"stroke-linecap":"round"};if(dash)a["stroke-dasharray"]=dash;el("line",a);};const text=(x,y,t,size=14,color="#263746",weight="normal")=>{const n=el("text",{x,y,fill:color,"font-size":size,"font-family":"Tahoma,Arial","text-anchor":"middle","font-weight":weight,direction:"rtl"});n.textContent=t;};return{el,line,text};}
function nodeMap(m){return new Map((m?.nodes||[]).map(n=>[String(n.id),n]));}
function ends(m,nodes,x){const a=nodes.get(String(x.start)),b=nodes.get(String(x.end));return a&&b?[a,b]:null;}
function fit(points,W=900,H=470,pad=85){if(!points.length)return null;let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of points){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;}if(!Number.isFinite(minX)||!Number.isFinite(minY))return null;const sx=(W-2*pad)/Math.max(1e-6,maxX-minX),sy=(H-2*pad)/Math.max(1e-6,maxY-minY),s=Math.min(sx,sy),ox=(W-(maxX-minX)*s)/2-minX*s,oy=H-pad+minY*s;return p=>({x:ox+p.x*s,y:oy-p.y*s});}
function noModel(svg,msg){const d=root(svg);d.text(450,220,msg,19,"#9f1239","bold");d.text(450,252,"ابتدا مدل هندسی جاری را تولید کنید؛ ترسیم فرضی انجام نمی‌شود.",12);}
function draw3d(svg){
 const m=api()?.model;
 if(!m?.nodes?.length||!m?.members?.length){noModel(svg,"مدل هندسی هنوز ساخته نشده است.");return;}
 const ns=nodeMap(m),items=[];
 const g=m.geometry||{},az=(api()?.getCameraView?.().azimuth||0)*Math.PI/180,ca=Math.cos(az),sa=Math.sin(az);
 (m.members||[]).forEach(member=>{
  const e=ends(m,ns,member);if(!e)return;
  const project=n=>{const x=Number(n.x)-Number(g.span||0)/2,z=Number(n.z)-Number(g.length||0)/2;return{x:x*ca-z*sa+z*.42,y:Number(n.y)+(-x*sa-z*ca)*.22};};
  items.push({member,a:project(e[0]),b:project(e[1])});
 });
 if(!items.length){noModel(svg,"اعضای قابل ترسیم در مدل وجود ندارند.");return;}
 const P=fit(items.flatMap(x=>[x.a,x.b])),d=root(svg);
 const color=k=>({column:C.column,rafter:C.rafter,roofPurlin:"#0f766e",wallGirt:C.girt,wallBrace:C.brace,roofBrace:C.brace,endPost:"#2563eb",endGirt:"#94a3b8",roofEdge:"#b45309"}[k]||"#64748b");
 items.sort((a,b)=>({roofPurlin:0,wallGirt:0,endGirt:0,endPost:1,roofBrace:2,wallBrace:2,column:3,rafter:4}[a.member.sectionKey]??1)-({roofPurlin:0,wallGirt:0,endGirt:0,endPost:1,roofBrace:2,wallBrace:2,column:3,rafter:4}[b.member.sectionKey]??1));
 items.forEach(x=>{const p=P(x.a),q=P(x.b),k=x.member.sectionKey,w=k==="column"?5:k==="rafter"?4:k==="wallBrace"||k==="roofBrace"?2.6:1.5;d.line(p.x,p.y,q.x,q.y,color(k),w);});
 d.text(450,26,"نمای سه‌بعدی — ترسیم مستقیم از اعضای مدل",17,"#123b52","bold");
 d.text(450,455,"گره‌ها "+m.nodes.length+" | اعضای ترسیم‌شده "+items.length,12);
}
function camera(item,svg){const bar=document.createElement("div");bar.className="structure-camera-controls";bar.setAttribute("aria-label","کنترل نمای سه‌بعدی");const actions=[["＋","بزرگنمایی",()=>{const v=api()?.getCameraView?.()||{zoom:1};api()?.setCameraView?.({zoom:v.zoom+.15});draw3d(svg);}],["−","کوچک‌نمایی",()=>{const v=api()?.getCameraView?.()||{zoom:1};api()?.setCameraView?.({zoom:v.zoom-.15});draw3d(svg);}],["↶","چرخش به چپ",()=>{const v=api()?.getCameraView?.()||{azimuth:0};api()?.setCameraView?.({azimuth:v.azimuth-15});draw3d(svg);}],["↷","چرخش به راست",()=>{const v=api()?.getCameraView?.()||{azimuth:0};api()?.setCameraView?.({azimuth:v.azimuth+15});draw3d(svg);}],["⟲","بازنشانی",()=>{api()?.setCameraView?.({zoom:1,azimuth:0});draw3d(svg);}]];actions.forEach(([label,title,fn])=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.title=title;b.setAttribute("aria-label",title);b.addEventListener("click",fn);bar.appendChild(b);});const hint=document.createElement("span");hint.className="structure-camera-help";hint.textContent="زوم و چرخش مدل واقعی";bar.appendChild(hint);item.insertBefore(bar,svg);svg.addEventListener("wheel",e=>{e.preventDefault();const v=api()?.getCameraView?.()||{zoom:1};api()?.setCameraView?.({zoom:v.zoom+(e.deltaY<0?.08:-.08)});draw3d(svg);},{passive:false});let pinchStart=0;svg.addEventListener("touchstart",e=>{if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;pinchStart=Math.hypot(dx,dy);}},{passive:true});svg.addEventListener("touchmove",e=>{if(e.touches.length===2&&pinchStart>0){e.preventDefault();const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,dist=Math.hypot(dx,dy),v=api()?.getCameraView?.()||{zoom:1};if(Math.abs(dist-pinchStart)>8){api()?.setCameraView?.({zoom:v.zoom*(dist/pinchStart)});pinchStart=dist;draw3d(svg);}}},{passive:false});svg.addEventListener("touchend",()=>{pinchStart=0;},{passive:true});}
function drawFrame(svg){
 const m=api()?.model;if(!m?.nodes?.length){noModel(svg,"مدل هندسی تولید نشده است.");return;}
 const ns=nodeMap(m),candidates=[];
 (m.members||[]).forEach(member=>{
  if(!["column","rafter"].includes(member.sectionKey))return;
  const e=ends(m,ns,member);if(!e||Math.abs(Number(e[0].z)-Number(e[1].z))>1e-6)return;
  candidates.push({member,ends:e,z:(Number(e[0].z)+Number(e[1].z))/2});
 });
 if(!candidates.length){noModel(svg,"عضو عرضی ستون یا رفتر در مدل پیدا نشد.");return;}
 const zs=[...new Set(candidates.map(x=>x.z.toFixed(6)))].map(Number).sort((a,b)=>a-b),z0=zs[0];
 const arr=candidates.filter(x=>Math.abs(x.z-z0)<1e-5),P=fit(arr.flatMap(x=>x.ends.map(n=>({x:Number(n.x),y:Number(n.y)})))),d=root(svg);
 arr.forEach(x=>{const p=P({x:Number(x.ends[0].x),y:Number(x.ends[0].y)}),q=P({x:Number(x.ends[1].x),y:Number(x.ends[1].y)}),col=x.member.sectionKey==="column";d.line(p.x,p.y,q.x,q.y,col?C.column:C.rafter,col?8:7);});
 d.text(450,28,"نمای عرضی قاب — استخراج از مختصات واقعی مدل",17,"#123b52","bold");
 d.text(450,455,"تراز طولی قاب "+z0.toFixed(2)+" m | اعضا "+arr.length,12);
}
function drawLongitudinal(svg,first){
 const m=api()?.model;if(!m?.nodes?.length){noModel(svg,"مدل هندسی تولید نشده است.");return;}
 const ns=nodeMap(m),all=[];
 (m.members||[]).forEach(member=>{
  if(!["column","wallGirt","wallBrace"].includes(member.sectionKey))return;
  const e=ends(m,ns,member);if(!e)return;
  all.push({member,ends:e});
 });
 if(!all.length){noModel(svg,"اعضای دیوار طولی در مدل موجود نیستند.");return;}
 const xs=all.flatMap(x=>x.ends.map(n=>Number(n.x))),x0=Math.min(...xs);
 let arr=all.filter(x=>x.ends.every(n=>Math.abs(Number(n.x)-x0)<1e-5));
 if(first){
  const g=m.geometry||{},zmax=Math.min(Number(g.spacing)||Number(g.length)||0,Number(g.length)||0);
  arr=arr.filter(x=>x.ends.every(n=>Number(n.z)>=-1e-6&&Number(n.z)<=zmax+1e-6));
 }
 if(!arr.length)arr=all.filter(x=>x.ends.every(n=>Math.abs(Number(n.x)-x0)<1e-5));
 const P=fit(arr.flatMap(x=>x.ends.map(n=>({x:Number(n.z),y:Number(n.y)})))),d=root(svg);
 arr.forEach(x=>{const p=P({x:Number(x.ends[0].z),y:Number(x.ends[0].y)}),q=P({x:Number(x.ends[1].z),y:Number(x.ends[1].y)}),k=x.member.sectionKey;d.line(p.x,p.y,q.x,q.y,k==="wallBrace"?C.brace:k==="wallGirt"?C.girt:C.column,k==="wallBrace"?4:k==="wallGirt"?2.2:6);});
 const braces=arr.filter(x=>x.member.sectionKey==="wallBrace").length;
 d.text(450,28,first?"نمای دهانه اول طولی":"نمای طولی دیوار سوله",17,"#123b52","bold");
 d.text(450,455,"طول "+(m.geometry?.length||0)+" m | بادبندهای نمایش‌داده‌شده "+braces,12,braces?C.brace:"#64748b","bold");
}
function drawCrane(svg){
 const m=api()?.model;if(!m){noModel(svg,"مدل هندسی تولید نشده است.");return;}
 const r=m.geometry?.craneRunway;if(!r?.enabled){noModel(svg,"جرثقیل در مشخصات پروژه فعال نیست.");return;}
 const seg=(r.beamSegments||[]).map(x=>({a:x.start,b:x.end,k:"beam"})).concat((r.railSegments||[]).map(x=>({a:{y:Number(r.elevationM),z:x.startM},b:{y:Number(r.elevationM),z:x.endM},k:"rail"})),(r.brackets||[]).map(x=>({a:x.from,b:x.to,k:"bracket"})));
 const pts=seg.flatMap(x=>[x.a,x.b]).filter(p=>p&&Number.isFinite(Number(p.z))&&Number.isFinite(Number(p.y)));
 if(!pts.length){noModel(svg,"هندسه تیر حمال، ریل یا براکت در مدل موجود نیست.");return;}
 const P=fit(pts.map(p=>({x:Number(p.z),y:Number(p.y)}))),d=root(svg);
 seg.forEach(x=>{if(!x.a||!x.b)return;const p=P({x:Number(x.a.z),y:Number(x.a.y)}),q=P({x:Number(x.b.z),y:Number(x.b.y)});d.line(p.x,p.y,q.x,q.y,x.k==="rail"?C.rail:x.k==="bracket"?"#a855f7":C.crane,x.k==="beam"?5:3,x.k==="bracket"?"4 3":"");});
 d.text(450,28,"نمای طولی تیر حمال و ریل جرثقیل",17,"#123b52","bold");
 d.text(450,455,"تیر حمال "+(r.beamSegments?.length||0)+" | ریل "+(r.railSegments?.length||0)+" | براکت "+(r.brackets?.length||0),12);
}
function makeSlide(title,kind){const item=document.createElement("article");item.className="structure-view-slide";item.setAttribute("role","group");item.setAttribute("aria-label",title);const h=document.createElement("h4");h.textContent=title;item.appendChild(h);const svg=document.createElementNS(NS,"svg");svg.classList.add("structure-view-svg");svg.setAttribute("role","img");svg.setAttribute("aria-label",title);item.appendChild(svg);if(kind==="3d")camera(item,svg);return{item,svg,kind};}
function update(){const track=$("structureViewTrack");if(!track)return;const list=[["نمای سه‌بعدی کل اجزای سازه‌ای سوله","3d"],["نمای دوبعدی قاب اول","frame"],["نمای طولی سوله با بادبندهای مدل","longitudinal"],["دهانه مهاربندی اول: قیدها، ستون‌ها و ضربدری‌ها","braced"]];if($("crane_enabled")?.checked)list.push(["نمای طولی تیر حمال، ریل و براکت‌های جرثقیل","crane"]);const sig=list.map(x=>x[1]).join("|");if(track.dataset.signature!==sig){track.innerHTML="";slides=list.map(x=>makeSlide(x[0],x[1]));slides.forEach(s=>track.appendChild(s.item));track.dataset.signature=sig;activeIndex=0;}slides.forEach(s=>{if(s.kind==="3d")draw3d(s.svg);else if(s.kind==="frame")drawFrame(s.svg);else if(s.kind==="longitudinal")drawLongitudinal(s.svg,false);else if(s.kind==="braced")drawLongitudinal(s.svg,true);else drawCrane(s.svg);});sync();}
function sync(){const c=$("structureViewCounter");if(c)c.textContent="نمای "+Math.min(activeIndex+1,slides.length)+" از "+slides.length;const p=$("structureViewPrev"),n=$("structureViewNext");if(p)p.disabled=activeIndex<=0;if(n)n.disabled=activeIndex>=slides.length-1;}
function go(i){activeIndex=Math.max(0,Math.min(slides.length-1,i));slides[activeIndex]?.item.scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});sync();}
function connect(){if(!$("structureViewsPanel"))return;$("structureViewPrev")?.addEventListener("click",()=>go(activeIndex-1));$("structureViewNext")?.addEventListener("click",()=>go(activeIndex+1));const track=$("structureViewTrack");track?.addEventListener("scroll",()=>{if(!slides.length)return;const i=Math.round(track.scrollLeft/(track.clientWidth||1));if(Number.isFinite(i)&&i!==activeIndex){activeIndex=Math.max(0,Math.min(slides.length-1,i));sync();}},{passive:true});/* Gallery must never build or rebuild the FEM geometry in response to form changes. The user explicitly builds the model; only then do we redraw these lightweight views. */["btnBuildFullModel","btnRunFull3D","btnRunAll3DCombinations","btnDraw"].forEach(id=>$(id)?.addEventListener("click",()=>setTimeout(update,450)));update();}
window.SteelStructureViewGallery={update,goTo:go};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",connect);else connect();
})();