(function(root){
"use strict";
const EPS=1e-7;
function number(v,name,min=0){const n=Number(v);if(!Number.isFinite(n)||n<min)throw new Error("مقدار «"+name+"» معتبر نیست.");return n;}
function build(project,options){
 const x=project?.inputs||{};
 const span=number(x.span,"دهانه",0.01),length=number(x.length,"طول",0.01);
 const spacing=number(x.frameSpacing,"فاصله قاب",0.01),height=number(x.columnHeight,"ارتفاع ستون",0.01);
 const slope=number(x.roofSlope,"شیب سقف",0.01);
 const roofType=x.roofType==="mono"?"mono":"gable";
 const sideOverhang=number(x.sideOverhang??0.8,"پیش‌آمدگی جانبی");
 const endOverhang=number(x.endOverhang??0.8,"پیش‌آمدگی طولی");
 const purlinSpacing=number(options?.purlinSpacing??0.95,"فاصله پرلین",0.1);
 const girtSpacing=number(options?.girtSpacing??3,"فاصله قید دیوار",0.1);
 const endPostSpacing=number(options?.endPostSpacing??4,"فاصله ستونک انتهایی",0.1);
 const braceBays=Math.max(0,Math.floor(number(options?.braceBays??1,"دهانه مهاربندی")));
 const rise=roofType==="mono"?span*slope/100:span/2*slope/100;
 const frames=[];const bayCount=Math.ceil(length/spacing);
 for(let i=0;i<=bayCount;i++){const z=Math.min(i*spacing,length);if(!frames.length||z-frames[frames.length-1]>EPS)frames.push(z);}
 const nodes=[],members=[],nodeIndex=new Map();
 const key=(a,b,c)=>[a,b,c].map(v=>Math.round(v*1e7)).join("|");
 function node(a,b,c,kind){
  const k=key(a,b,c);if(nodeIndex.has(k)){const old=nodes[nodeIndex.get(k)];if(kind==="support")old.kind="support";return old;}
  const n={id:"N"+(nodes.length+1),x:a,y:b,z:c,kind:kind||"joint"};nodeIndex.set(k,nodes.length);nodes.push(n);return n;
 }
 function member(a,b,type,sectionKey,extra){
  if(a.id===b.id)return null;
  const L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(!(L>EPS))return null;
  const m={id:"M"+(members.length+1),start:a.id,end:b.id,type,sectionKey,length:L,...(extra||{})};members.push(m);return m;
 }
 const roofY=xx=>roofType==="mono"?height+rise*xx/span:(xx<=span/2?height+rise*xx/(span/2):height+rise*(span-xx)/(span/2));
 const roofXs=[];
 if(roofType==="mono"){
  const L=Math.hypot(span+2*sideOverhang, rise*(span+2*sideOverhang)/span);
  const count=Math.max(1,Math.ceil(L/purlinSpacing));
  for(let i=0;i<=count;i++)roofXs.push(-sideOverhang+(span+2*sideOverhang)*i/count);
 }else{
  const half=span/2,sideLen=Math.hypot(half+sideOverhang,rise*(half+sideOverhang)/half);
  const count=Math.max(1,Math.ceil(sideLen/purlinSpacing));
  for(let i=0;i<=count;i++)roofXs.push(-sideOverhang+(half+sideOverhang)*i/count);
  for(let i=1;i<=count;i++)roofXs.push(half+(half+sideOverhang)*i/count);
 }
 const uniqueXs=[...new Set(roofXs.map(v=>Number(v.toFixed(7))))].sort((a,b)=>a-b);
 const girtHeights=[];for(let y=girtSpacing;y<height-EPS;y+=girtSpacing)girtHeights.push(y);
 const frameRefs=[];
 frames.forEach((z,fi)=>{
  const left=[node(0,0,z,"support"),...girtHeights.map(y=>node(0,y,z,"column-joint")),node(0,height,z,"eave")];
  const right=[node(span,0,z,"support"),...girtHeights.map(y=>node(span,y,z,"column-joint")),node(span,height,z,"eave")];
  for(let i=0;i<left.length-1;i++)member(left[i],left[i+1],"ستون قاب","column",{frame:fi+1,axis:"transverse"});
  for(let i=0;i<right.length-1;i++)member(right[i],right[i+1],"ستون قاب","column",{frame:fi+1,axis:"transverse"});
  const top=uniqueXs.map(xx=>node(xx,roofY(xx),z,"rafter-purlin-joint"));
  for(let i=0;i<top.length-1;i++)member(top[i],top[i+1],"رفتر قاب","rafter",{frame:fi+1,axis:"transverse",segment:i+1});
  frameRefs.push({z,leftBase:left[0],rightBase:right[0],leftEave:left[left.length-1],rightEave:right[right.length-1],roof:top});
 });
 // Longitudinal roof purlins; all intersections share node IDs with the portal frames.
 uniqueXs.forEach((xx,ri)=>{
  const line=frames.map(z=>node(xx,roofY(xx),z,"roof-purlin-joint"));
  for(let i=0;i<line.length-1;i++)member(line[i],line[i+1],"پرلین طولی سقف","roofPurlin",{row:ri+1,side:xx<span/2?"left":(roofType==="gable"&&Math.abs(xx-span/2)<EPS?"ridge":"right"),bay:i+1,tributaryWidth:purlinSpacing});
  if(endOverhang>EPS){
   const front=node(xx,roofY(xx),-endOverhang,"roof-purlin-tail");
   const rear=node(xx,roofY(xx),length+endOverhang,"roof-purlin-tail");
   member(front,line[0],"امتداد پرلین پیشانی","roofPurlin",{row:ri+1,overhang:true});
   member(line[line.length-1],rear,"امتداد پرلین انتهایی","roofPurlin",{row:ri+1,overhang:true});
  }
 });
 // Side-wall girts.
 [0,span].forEach((xx,si)=>{
  girtHeights.forEach((yy,ri)=>{
   const row=frames.map(z=>node(xx,yy,z,"wall-girt-joint"));
   for(let i=0;i<row.length-1;i++)member(row[i],row[i+1],"قید افقی طولی دیوار","wallGirt",{side:si===0?"left":"right",row:ri+1,bay:i+1});
  });
 });
 // End-wall posts, top chord and girts at both ends.
 [0,length].forEach((z,endIndex)=>{
  const count=Math.max(1,Math.ceil(span/endPostSpacing));
  const xs=Array.from({length:count+1},(_,i)=>span*i/count);
  const face=endIndex===0?"front":"rear";
  xs.slice(1,-1).forEach((xx,postIndex)=>{
   const top=roofY(xx),levels=[0,...girtHeights.filter(y=>y<top-EPS),top].sort((a,b)=>a-b);
   const ns=levels.map((yy,i)=>node(xx,yy,z,i===0?"endwall-base":"endwall-post-joint"));
   for(let i=0;i<ns.length-1;i++)member(ns[i],ns[i+1],"ستونک دیوار انتهایی","endPost",{endFace:face,post:postIndex+1});
  });
  const chord=xs.map(xx=>node(xx,roofY(xx),z,"endwall-head"));
  for(let i=0;i<chord.length-1;i++)member(chord[i],chord[i+1],"تیر لبه دیوار انتهایی","rafter",{axis:"endwall",endFace:face});
  girtHeights.forEach((yy,ri)=>{
   const active=xs.filter(xx=>roofY(xx)>=yy-EPS).map(xx=>node(xx,yy,z,"endwall-girt-joint"));
   for(let i=0;i<active.length-1;i++)member(active[i],active[i+1],"قید افقی دیوار انتهایی","endGirt",{endFace:face,row:ri+1});
  });
 });
 // Candidate X-bracing in matching first/last bays; detailing and tension-only behavior are not implied.
 const selected=new Set();for(let i=0;i<Math.min(braceBays,frames.length-1);i++){selected.add(i);selected.add(frames.length-2-i);}
 selected.forEach(bi=>{
  const f1=frames[bi],f2=frames[bi+1];
  [0,span].forEach(xx=>{
   const a=node(xx,0,f1,"brace"),b=node(xx,height,f2,"brace"),c=node(xx,height,f1,"brace"),d=node(xx,0,f2,"brace");
   member(a,b,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:xx===0?"left":"right",candidate:true});
   member(c,d,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:xx===0?"left":"right",candidate:true});
  });
  const roofStations=roofType==="gable"?[[0,span/2],[span/2,span]]:[[0,span]];
  roofStations.forEach(([xa,xb],j)=>{
   const ya=roofY(xa),yb=roofY(xb);
   const a=node(xa,ya,f1,"roof-brace"),b=node(xb,yb,f2,"roof-brace"),c=node(xb,yb,f1,"roof-brace"),d=node(xa,ya,f2,"roof-brace");
   member(a,b,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:j===0?"left":"right",candidate:true});
   member(c,d,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:j===0?"left":"right",candidate:true});
  });
 });
 const supportNodes=nodes.filter(n=>n.kind==="support").map(n=>n.id);
 const model={schema:"sahroud-steel-geometry",version:1,geometry:{roofType,span,length,frameSpacing:spacing,height,rise,roofSlopePercent:slope,frames,frameCount:frames.length,bayCount:frames.length-1,roofStations:uniqueXs,roofPurlinSpacing:purlinSpacing,wallGirtSpacing:girtSpacing,endPostSpacing,sideOverhang,endOverhang,braceBays},nodes,members,supportNodes,generatedAt:new Date().toISOString(),scope:"مدل هندسی اولیه؛ هنوز بارگذاری، آزادسازی اتصالات، مقاطع و تحلیل سازه‌ای به آن تخصیص نیافته است."};
 const missing=[];
 if(nodes.length===0||members.length===0)missing.push("مدل خالی تولید شده است.");
 if(!supportNodes.length)missing.push("گره تکیه‌گاهی تولید نشده است.");
 if(members.some(m=>!nodes.some(n=>n.id===m.start)||!nodes.some(n=>n.id===m.end)))missing.push("عضوی به گره ناموجود متصل است.");
 return {model,validation:{valid:missing.length===0,errors:missing,nodeCount:nodes.length,memberCount:members.length,supportCount:supportNodes.length},groups:members.reduce((o,m)=>(o[m.sectionKey]=(o[m.sectionKey]||0)+1,o),{})};
}
root.SahroudSteelGeometry={build};
})(window);
