/* SAHROUD STEEL — end-wall gable support topology audit.
 * Checks geometric support continuity only. It does not transfer gable wind
 * pressure, establish cladding restraint, or approve member/connection capacity.
 */
(function(root){
"use strict";
const finite=v=>Number.isFinite(Number(v));
const near=(a,b)=>Math.abs(Number(a)-Number(b))<=1e-6;
function audit(model){
 const issues=[],faces=[],g=model?.geometry||{},nodes=Array.isArray(model?.nodes)?model.nodes:[],members=Array.isArray(model?.members)?model.members:[];
 const span=Number(g.span),length=Number(g.length),height=Number(g.height),rise=Number(g.rise),postSpacing=Number(g.endPostSpacing);
 if(!(span>0&&length>0&&height>0&&rise>=0&&postSpacing>0))issues.push("ابعاد دهانه، طول، ارتفاع، خیز و فاصله ستونک انتهایی باید معتبر باشند.");
 const nodeMap=new Map(nodes.map(n=>[String(n.id),n]));
 if(nodeMap.size!==nodes.length)issues.push("شناسه گره تکراری یا نامعتبر است.");
 const roofY=x=>height+rise*(x<=span/2?x/(span/2):(span-x)/(span/2));
 const nBay=Math.max(1,Math.ceil(span/postSpacing));
 const xs=[...new Set([...Array.from({length:nBay+1},(_,i)=>span*i/nBay),span/2])].sort((a,b)=>a-b);
 const near=(a,b)=>Math.abs(Number(a)-Number(b))<=1e-6;
 const faceAudit=(face,z,frame)=>{
  const local=[],fail=m=>{local.push(m);issues.push(face+": "+m);};
  const getNode=id=>nodeMap.get(String(id));
  const vertical=[];
  xs.forEach((x,i)=>{
   const isBoundary=i===0||i===xs.length-1;
   const candidates=members.filter(m=>{
    if(isBoundary){if(m.sectionKey!=="column"||m.axis!=="transverse"||m.frame!==frame)return false;}
    else if(m.sectionKey!=="endPost"||m.endFace!==face)return false;
    const a=getNode(m.start),b=getNode(m.end);
    return a&&b&&near(a.x,x)&&near(b.x,x)&&near(a.z,z)&&near(b.z,z)&&!near(a.y,b.y);
   });
   const segments=candidates.map(m=>{const a=getNode(m.start),b=getNode(m.end);return{memberId:String(m.id),low:Math.min(a.y,b.y),high:Math.max(a.y,b.y),start:m.start,end:m.end};}).sort((a,b)=>a.low-b.low);
   const top=roofY(x),expectedTop=isBoundary?height:top;
   let cursor=0;
   if(!segments.length)fail("تکیه‌گاه قائم در ایستگاه x="+x+" وجود ندارد.");
   segments.forEach(s=>{
    if(!near(s.low,cursor))fail("شکاف یا هم‌پوشانی در زنجیره قائم x="+x+"، عضو "+s.memberId);
    cursor=s.high;
   });
   if(!near(cursor,expectedTop))fail("زنجیره قائم x="+x+" تا تراز مورد انتظار "+expectedTop+" متر ادامه ندارد.");
   vertical.push({x,kind:isBoundary?"end-frame-column":"end-post",topM:expectedTop,segmentCount:segments.length,memberIds:segments.map(s=>s.memberId),connected:local.length===0});
  });
  // The gable top chord must be a single, shared-node path on the roof profile.
  const chord=members.filter(m=>m.sectionKey==="rafter"&&m.axis==="transverse"&&m.frame===frame).filter(m=>{
   const a=getNode(m.start),b=getNode(m.end);return a&&b&&a.x>=-1e-6&&b.x<=span+1e-6&&near(a.y,roofY(a.x))&&near(b.y,roofY(b.x))&&near(a.z,z)&&near(b.z,z);
  });
  const graph=new Map();
  chord.forEach(m=>{if(!graph.has(m.start))graph.set(m.start,[]);if(!graph.has(m.end))graph.set(m.end,[]);graph.get(m.start).push({to:m.end,id:m.id});graph.get(m.end).push({to:m.start,id:m.id});});
  const start=nodes.find(n=>near(n.x,0)&&near(n.y,height)&&near(n.z,z));
  const end=nodes.find(n=>near(n.x,span)&&near(n.y,height)&&near(n.z,z));
  let pathCount=0,pathIds=[];
  if(start&&end){
   const visit=(id,seen,ids)=>{if(pathCount>=2)return;if(id===String(end.id)){pathCount++;if(pathCount===1)pathIds=ids;return;}(graph.get(String(id))||[]).forEach(e=>{if(!seen.has(e.to)){const next=new Set(seen);next.add(e.to);visit(e.to,next,[...ids,String(e.id)]);}});};
   visit(String(start.id),new Set([String(start.id)]),[]);
  }
  if(pathCount!==1)fail("وتر بالایی گابل باید دقیقاً یک مسیر پیوسته و یکتا از رفتر قاب انتهایی داشته باشد؛ تعداد مسیر: "+pathCount);
  // Each modeled horizontal end girt row must span every adjacent active station.
  const girts=members.filter(m=>m.sectionKey==="endGirt"&&m.endFace===face);
  const levels=[...new Set(girts.map(m=>{const a=getNode(m.start);return a?Number(a.y):NaN;}).filter(Number.isFinite))].sort((a,b)=>a-b);
  levels.forEach(y=>{
   const active=xs.filter(x=>roofY(x)>=y-1e-6);
   for(let i=0;i<active.length-1;i++){
    const x1=active[i],x2=active[i+1];
    const matching=girts.filter(m=>{const a=getNode(m.start),b=getNode(m.end);return a&&b&&near(a.y,y)&&near(b.y,y)&&near(a.z,z)&&near(b.z,z)&&((near(a.x,x1)&&near(b.x,x2))||(near(a.x,x2)&&near(b.x,x1)));});
    const count=matching.length;
    if(count!==1)fail("ردیف گرت y="+y+" بین x="+x1+" و x="+x2+" باید دقیقاً یک عضو داشته باشد؛ تعداد: "+count);
    matching.forEach(m=>{
     const a=getNode(m.start),b=getNode(m.end);
     const connected=(id,x)=>members.some(v=>{
      if(!["column","endPost"].includes(v.sectionKey))return false;
      if(v.start!==id&&v.end!==id)return false;
      const p=getNode(id);return !!p&&near(p.x,x)&&near(p.z,z);
     });
     if(!connected(m.start,a.x)||!connected(m.end,b.x))fail("اتصال گره‌ای گرت "+m.id+" به ستون/ستونک در دو انتها برقرار نیست.");
    });
   }
  });
  const faceOk=local.length===0;
  faces.push({face,z,frame,success:faceOk,issues:local,verticalSupports:vertical,gableChord:{pathCount,memberIds:pathIds},girtRows:levels.length});
 };
 if(!issues.some(x=>x.includes("ابعاد دهانه"))){
  faceAudit("front",0,1);
  const frameCount=nodes.filter(n=>n.kind==="base"&&near(n.z,length)).length?Math.max(2,new Set(nodes.filter(n=>n.kind==="base").map(n=>Number(n.z))).size):2;
  faceAudit("rear",length,frameCount);
 }
 return{success:issues.length===0,faces,issues,geometry:{expectedSupportStationsM:xs,expectedStationCount:xs.length},scope:"ممیزی توپولوژی ستونک‌ها، ستون‌های قاب انتهایی، گرت‌های انتهایی و وتر رفتر؛ بدون انتقال فشار باد یا تأیید ظرفیت.",analysisEnabled:false,designApproved:false};
}
function fixture(){
 const span=20,height=6,rise=2,length=30,endPostSpacing=5,frames=[0,length],nodes=[],members=[];
 const roofY=x=>height+rise*(x<=span/2?x/(span/2):(span-x)/(span/2));
 let id=0;const add=(x,y,z,kind="joint")=>{const old=nodes.find(n=>near(n.x,x)&&near(n.y,y)&&near(n.z,z));if(old)return old;const n={id:"N"+(++id),x,y,z,kind};nodes.push(n);return n;};
 const addM=(a,b,sectionKey,extra={})=>members.push({id:"M"+(members.length+1),start:a.id,end:b.id,sectionKey,...extra});
 const xs=[0,5,10,15,20];
 [0,length].forEach((z,fi)=>{
  xs.forEach((x,i)=>{
   const top=i===0||i===xs.length-1?height:roofY(x),ys=[0,3,6,top].filter((v,j,a)=>v<=top+1e-7&&(j===0||Math.abs(v-a[j-1])>1e-7));
   const row=ys.map(y=>add(x,y,z,y===0?(i===0||i===xs.length-1?"base":"endwall-base"):"joint"));
   for(let k=0;k<row.length-1;k++)addM(row[k],row[k+1],i===0||i===xs.length-1?"column":"endPost",i===0||i===xs.length-1?{axis:"transverse",frame:fi+1}:{endFace:fi===0?"front":"rear"});
  });
  const chord=xs.map(x=>add(x,roofY(x),z,"rafter"));
  for(let i=0;i<chord.length-1;i++)addM(chord[i],chord[i+1],"rafter",{axis:"transverse",frame:fi+1});
  [3,6].forEach((y,gi,levels)=>{const lower=gi===0?0:(levels[gi-1]+y)/2,next=gi===levels.length-1?Infinity:(y+levels[gi+1])/2;const active=xs.filter(x=>roofY(x)>=y-1e-7);for(let i=0;i<active.length-1;i++){const x1=active[i],x2=active[i+1],mid=(x1+x2)/2,upper=Math.min(next,roofY(mid)),a=nodes.find(n=>near(n.x,x1)&&near(n.y,y)&&near(n.z,z)),b=nodes.find(n=>near(n.x,x2)&&near(n.y,y)&&near(n.z,z));addM(a,b,"endGirt",{endFace:fi===0?"front":"rear",row:gi+1,tributaryHeight:upper-lower});}});
 });
 return{geometry:{span,length,height,rise,endPostSpacing},nodes,members};
}
function selfTest(){
 const checks=[],test=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:e.message});}};
 test("both gable faces have continuous vertical posts, girts and a unique rafter chord",()=>audit(fixture()).success);
 test("missing upper gable post segment is rejected",()=>{const m=fixture();const target=m.members.find(x=>x.sectionKey==="endPost"&&x.endFace==="front"&&(()=>{const a=m.nodes.find(n=>n.id===x.start),b=m.nodes.find(n=>n.id===x.end);return a&&b&&Math.max(a.y,b.y)>6;})());m.members=m.members.filter(x=>x!==target);return !audit(m).success;});
 test("duplicate end-girt segment is rejected",()=>{const m=fixture(),x=m.members.find(x=>x.sectionKey==="endGirt"&&x.endFace==="front");m.members.push({...x,id:"DUP"});return !audit(m).success;});
 test("missing rafter chord path is rejected",()=>{const m=fixture();m.members=m.members.filter(x=>!(x.sectionKey==="rafter"&&x.frame===1));return !audit(m).success;});
 test("disconnected end-girt endpoint is rejected",()=>{const m=fixture(),g=m.members.find(x=>x.sectionKey==="endGirt"&&x.endFace==="front");const old=m.nodes.find(n=>n.id===g.start);const duplicate={...old,id:"DISCONNECTED"};m.nodes.push(duplicate);g.start=duplicate.id;return !audit(m).success;});
 test("audit never enables analysis or approves design",()=>{const r=audit(fixture());return r.analysisEnabled===false&&r.designApproved===false;});
 const passed=checks.filter(x=>x.ok).length;return{passed,failed:checks.length-passed,total:checks.length,checks};
}
root.SteelEndWallGableSupportAudit={audit,selfTest,fixture};
})(typeof window!=="undefined"?window:globalThis);
