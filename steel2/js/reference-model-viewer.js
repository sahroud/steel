/* SAHROUD STEEL — isolated reference geometry viewer; no active-model mutation. */
(function(){
"use strict";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let proposal=null,mode="iso",zoom=1,azimuth=35,selected=null,drag=null,projected=[],bounds=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function ensure(){
 const panel=$("referenceImportPanel"),svg=$("referenceModelPreview");if(!panel||!svg||$("referenceViewerTools"))return;
 const bar=document.createElement("div");bar.id="referenceViewerTools";bar.className="actions";
 bar.innerHTML='<label>نما <select id="refViewMode"><option value="iso">سه‌بعدی ایزومتریک</option><option value="xy">پلان XY</option><option value="xz">نمای XZ</option><option value="yz">نمای YZ</option></select></label><label>بزرگ‌نمایی <input id="refViewZoom" type="range" min="0.5" max="4" step="0.1" value="1"></label><label>چرخش <input id="refViewAzimuth" type="range" min="0" max="360" step="5" value="35"></label><button type="button" id="refViewFit">تنظیم اندازه</button><button type="button" id="refViewClear">پاک‌کردن انتخاب</button>';
 svg.parentNode.insertBefore(bar,svg);
 const detail=document.createElement("div");detail.id="referenceMemberDetail";detail.className="result-box";detail.textContent="برای مشاهده مشخصات، روی یکی از اعضای پیش‌نمایش کلیک کنید.";svg.parentNode.appendChild(detail);
 $("refViewMode").addEventListener("change",e=>{mode=e.target.value;draw();});$("refViewZoom").addEventListener("input",e=>{zoom=Number(e.target.value);draw();});$("refViewAzimuth").addEventListener("input",e=>{azimuth=Number(e.target.value);draw();});
 $("refViewFit").addEventListener("click",()=>{$("refViewZoom").value="1";$("refViewAzimuth").value="35";zoom=1;azimuth=35;draw();});
 $("refViewClear").addEventListener("click",()=>{selected=null;detail.textContent="انتخاب پاک شد.";draw();});
 svg.addEventListener("click",onSelect);svg.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,azimuth};svg.setPointerCapture?.(e.pointerId);});
 svg.addEventListener("pointerup",e=>{if(drag){const dx=e.clientX-drag.x;if(Math.abs(dx)>4){azimuth=(drag.azimuth+dx*.5+360)%360;$("refViewAzimuth").value=String(Math.round(azimuth));draw();}drag=null;}});
 window.addEventListener("sahroud-reference-model-ready",e=>{proposal=e.detail?.proposal||null;selected=null;draw();});
}
function project(n){
 const x=n.x-bounds.minX,y=n.y-bounds.minY,z=n.z-bounds.minZ;
 if(mode==="xy")return{x,y:-y};if(mode==="xz")return{x,y:-z};if(mode==="yz")return{x:y,y:-z};
 const a=azimuth*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return{x:x*c-y*s*.65,y:-(z*.95+(x*s+y*c)*.35)};
}
function draw(){
 const svg=$("referenceModelPreview");if(!svg||!proposal)return;while(svg.firstChild)svg.removeChild(svg.firstChild);
 const add=(tag,attrs,text)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,String(v)));if(text!==undefined)el.textContent=text;svg.appendChild(el);return el;};
 add("rect",{width:720,height:360,fill:"#f8fbfd"});const ns=proposal.nodes||[],ms=proposal.members||[];if(!ns.length){add("text",{x:360,y:180,"text-anchor":"middle",fill:"#647783"},"مدلی برای نمایش وجود ندارد");return;}
 bounds={minX:Math.min(...ns.map(n=>n.x)),maxX:Math.max(...ns.map(n=>n.x)),minY:Math.min(...ns.map(n=>n.y)),maxY:Math.max(...ns.map(n=>n.y)),minZ:Math.min(...ns.map(n=>n.z)),maxZ:Math.max(...ns.map(n=>n.z))};
 projected=ns.map(n=>({id:n.id,...project(n)}));const loX=Math.min(...projected.map(p=>p.x)),hiX=Math.max(...projected.map(p=>p.x)),loY=Math.min(...projected.map(p=>p.y)),hiY=Math.max(...projected.map(p=>p.y));
 const span=Math.max(hiX-loX,hiY-loY,1e-6),scale=290/span*zoom,screen=p=>({x:360+(p.x-(loX+hiX)/2)*scale,y:180+(p.y-(loY+hiY)/2)*scale}),coords=new Map(projected.map(p=>[String(p.id),screen(p)]));
 ms.forEach(m=>{const a=coords.get(String(m.start)),b=coords.get(String(m.end));if(!a||!b)return;const l=add("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:String(selected)===String(m.id)?"#d34b32":"#176b87","stroke-width":String(selected)===String(m.id)?5:2.3,"stroke-linecap":"round","data-member":m.id});l.style.cursor="pointer";});
 ns.forEach(n=>{const p=coords.get(String(n.id));add("circle",{cx:p.x,cy:p.y,r:3.2,fill:"#d98220"});});
 add("text",{x:12,y:20,fill:"#526b78","font-size":12},"پیشنهاد مستقل | "+ns.length+" گره | "+ms.length+" عضو | بزرگ‌نمایی "+zoom.toFixed(1)+"×");
}
function onSelect(e){
 const target=e.target.closest?.("[data-member]");if(!target||!proposal)return;selected=target.getAttribute("data-member");
 const m=(proposal.members||[]).find(x=>String(x.id)===String(selected));if(!m)return;
 const a=(proposal.nodes||[]).find(x=>String(x.id)===String(m.start)),b=(proposal.nodes||[]).find(x=>String(x.id)===String(m.end)),length=a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z):null;
 const detail=$("referenceMemberDetail");detail.textContent="عضو "+m.id+" | گره ابتدا: "+m.start+" | گره انتها: "+m.end+" | مرجع مقطع: "+m.section_ref+" | طول هندسی: "+(length===null?"نامشخص":length.toFixed(4)+" متر")+" | فقط داده هندسی؛ ظرفیت و تأیید طراحی محاسبه نشده است.";draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensure);else ensure();
window.SteelReferenceModelViewer={get selectedMember(){return selected;},get mode(){return mode;}};
})();