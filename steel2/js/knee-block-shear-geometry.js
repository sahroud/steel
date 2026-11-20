"use strict";
(function(root){
const E=1e-8,finite=Number.isFinite;
const dot=(a,b)=>a.x*b.x+a.y*b.y,sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}),scale=(a,s)=>({x:a.x*s,y:a.y*s}),cross=(a,b)=>a.x*b.y-a.y*b.x,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function on(p,a,b){const d=sub(b,a),q=sub(p,a),l=dot(d,d),t=l?dot(q,d)/l:0;return t>=-1e-7&&t<=1+1e-7&&Math.abs(cross(d,q))<=1e-7*Math.max(1,Math.sqrt(l));}
function inside(p,P){let z=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if(on(p,a,b))return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)z=!z;}return z;}
function hit(a,b,c,d){const r=sub(b,a),s=sub(d,c),den=cross(r,s);if(Math.abs(den)<E)return null;const t=cross(sub(c,a),s)/den,u=cross(sub(c,a),r)/den;return t>=-E&&t<=1+E&&u>=-E&&u<=1+E?Math.max(0,Math.min(1,t)):null;}
function boundary(o,u,P){const R=Math.max(1,...P.map(p=>dist(p,o)))*4,a=sub(o,scale(u,R)),b=add(o,scale(u,R)),out=[];for(let i=0;i<P.length;i++){const t=hit(a,b,P[i],P[(i+1)%P.length]);if(t!==null){const p=add(a,scale(sub(b,a),t));if(!out.some(q=>dist(p,q)<1e-6))out.push(p);}}return out.sort((p,q)=>dot(sub(p,o),u)-dot(sub(q,o),u));}
function insideSegment(a,b,P){for(let k=0;k<P.length;k++){const t=hit(a,b,P[k],P[(k+1)%P.length]);if(t!==null&&t>1e-7&&t<1-1e-7)return false;}for(let i=0;i<=64;i++)if(!inside(add(a,scale(sub(b,a),i/64)),P))return false;return true;}
function sameBoundaryEdge(a,b,P){for(let i=0;i<P.length;i++)if(on(a,P[i],P[(i+1)%P.length])&&on(b,P[i],P[(i+1)%P.length]))return true;return false;}
function segmentsTouch(a,b,c,d){
 const o1=cross(sub(b,a),sub(c,a)),o2=cross(sub(b,a),sub(d,a)),o3=cross(sub(d,c),sub(a,c)),o4=cross(sub(d,c),sub(b,c));
 const scaleE=1e-8*Math.max(1,dist(a,b),dist(c,d));
 if(o1*o2< -scaleE*scaleE&&o3*o4< -scaleE*scaleE)return true;
 return on(c,a,b)||on(d,a,b)||on(a,c,d)||on(b,c,d);
}
function simplePolygon(P){
 if(!Array.isArray(P)||P.length<3||P.some(q=>!q||!finite(q.x)||!finite(q.y)))return false;
 let area=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if(dist(a,b)<=1e-8)return false;area+=a.x*b.y-b.x*a.y;}
 if(Math.abs(area)<=1e-8)return false;
 for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){
  if(j===i+1||(i===0&&j===P.length-1))continue;
  const a=P[i],b=P[(i+1)%P.length],c=P[j],d=P[(j+1)%P.length];
  const o1=cross(sub(b,a),sub(c,a)),o2=cross(sub(b,a),sub(d,a)),o3=cross(sub(d,c),sub(a,c)),o4=cross(sub(d,c),sub(b,c));
  if((o1*o2< -1e-12&&o3*o4< -1e-12)||on(c,a,b)||on(d,a,b)||on(a,c,d)||on(b,c,d))return false;
 }
 return true;
}
function segmentParameters(a,b,c,d){
 const r=sub(b,a),e=sub(d,c),rr=dot(r,r),den=cross(r,e),ca=sub(c,a),out=[];
 if(rr<E)return out;
 const eps=1e-9*Math.max(1,Math.sqrt(rr),dist(c,d));
 if(Math.abs(den)>E){
  const t=cross(ca,e)/den,u=cross(ca,r)/den;
  if(t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9)out.push(Math.max(0,Math.min(1,t)));
 }else if(Math.abs(cross(ca,r))<=eps*Math.sqrt(rr)){
  const t0=dot(ca,r)/rr,t1=dot(sub(d,a),r)/rr;
  const lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(1,Math.max(t0,t1));
  if(hi>=lo-1e-9){out.push(Math.max(0,Math.min(1,lo)),Math.max(0,Math.min(1,hi)));}
 }
 return out;
}
function intervals(a,b,P){
 const L=dist(a,b),d=sub(b,a);if(L<E)return[];
 const ts=[0,1];
 for(let i=0;i<P.length;i++)ts.push(...segmentParameters(a,b,P[i],P[(i+1)%P.length]));
 ts.sort((x,y)=>x-y);
 const u=ts.filter((t,i)=>!i||Math.abs(t-ts[i-1])>1e-7),out=[];
 for(let i=0;i<u.length-1;i++){
  if(u[i+1]-u[i]<=1e-9)continue;
  if(inside(add(a,scale(d,(u[i]+u[i+1])/2)),P))out.push([u[i]*L,u[i+1]*L]);
 }
 return out;
}
function subtract(L,ints){const a=ints.map(x=>[Math.max(0,x[0]),Math.min(L,x[1])]).filter(x=>x[1]>x[0]).sort((x,y)=>x[0]-y[0]);let n=0,last=0;for(const [s,e] of a){const q=Math.max(s,last);if(e>q)n+=e-q;last=Math.max(last,e);}return Math.max(0,L-n);}
function assess(input){
const errors=[],p=input?.plate,holes=input?.holes,fd=input?.forceDirectionLocal,tol=input?.rowToleranceMm??1;
if(!p||!Array.isArray(p.polygonMm)||p.polygonMm.length<3)errors.push("چندضلعی ورق معتبر نیست.");
if(!finite(p?.thicknessMm)||p.thicknessMm<=0)errors.push("ضخامت ورق باید مثبت باشد.");
if(!Array.isArray(holes)||holes.length<2)errors.push("حداقل دو سوراخ لازم است.");
if(!fd||!finite(fd.x)||!finite(fd.y)||Math.hypot(fd.x,fd.y)<E)errors.push("راستای نیرو باید صریح و غیرصفر باشد.");
if(!finite(tol)||tol<=0)errors.push("تلرانس ردیف‌بندی باید مثبت باشد.");
if(errors.length)return{valid:false,status:"NOT_ASSESSABLE",errors,candidates:[]};
const P=p.polygonMm.map(q=>({x:+q.x,y:+q.y})),L=Math.hypot(fd.x,fd.y),u={x:fd.x/L,y:fd.y/L},v={x:-u.y,y:u.x};
if(!simplePolygon(P))return{valid:false,status:"NOT_ASSESSABLE",errors:["چندضلعی ورق باید ساده، غیرخودمتقاطع، دارای مساحت غیرصفر و مختصات متناهی باشد."],candidates:[]};
const H=holes.map(h=>({id:String(h.id),c:{x:+(h.center?.x??h.xMm),y:+(h.center?.y??h.yMm)},poly:h.polygon||h.polygonMm}));
if(H.some(h=>!h.id||!finite(h.c.x)||!finite(h.c.y)||!simplePolygon(h.poly)||h.poly.length<8))
 return{valid:false,status:"NOT_ASSESSABLE",errors:["هندسه هر سوراخ باید یک چندضلعی ساده، معتبر و متناهی با حداقل هشت رأس باشد."],candidates:[]};
const plateEdges=P.map((q,i)=>[q,P[(i+1)%P.length]]);
for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){
 if(j===i+1||(i===0&&j===P.length-1))continue;
 if(hit(P[i],P[(i+1)%P.length],P[j],P[(j+1)%P.length])!==null)
  return{valid:false,status:"NOT_ASSESSABLE",errors:["مرز ورق خودمتقاطع است."],candidates:[]};
}
for(const h of H){
 if(!inside(h.c,h.poly)||!h.poly.every(q=>inside(q,P)))
  return{valid:false,status:"NOT_ASSESSABLE",errors:["مرکز و تمام محیط سوراخ "+h.id+" باید داخل ورق و داخل خود سوراخ معتبر باشند."],candidates:[]};
 for(let i=0;i<h.poly.length;i++)for(const [a,b] of plateEdges)
  if(segmentsTouch(h.poly[i],h.poly[(i+1)%h.poly.length],a,b))
   return{valid:false,status:"NOT_ASSESSABLE",errors:["محیط سوراخ "+h.id+" با مرز ورق تماس دارد یا از آن عبور می‌کند؛ فاصله لبه صفر/نامعتبر است."],candidates:[]};
}
for(let i=0;i<H.length;i++)for(let j=i+1;j<H.length;j++){
 let overlap=false;
 for(let a=0;a<H[i].poly.length&&!overlap;a++)for(let b=0;b<H[j].poly.length;b++)
  if(segmentsTouch(H[i].poly[a],H[i].poly[(a+1)%H[i].poly.length],H[j].poly[b],H[j].poly[(b+1)%H[j].poly.length])){overlap=true;break;}
 if(overlap||inside(H[i].c,H[j].poly)||inside(H[j].c,H[i].poly))
  return{valid:false,status:"NOT_ASSESSABLE",errors:["محیط سوراخ‌های "+H[i].id+" و "+H[j].id+" هم‌پوشانی دارد."],candidates:[]};
}
const sorted=H.map(h=>({...h,s:dot(h.c,u),t:dot(h.c,v)})).sort((a,b)=>a.t-b.t),rows=[];
for(const h of sorted){let r=rows.find(q=>Math.abs(q.t-h.t)<=tol);if(!r){r={t:h.t,holes:[]};rows.push(r);}r.holes.push(h);}
rows.forEach(r=>r.holes.sort((a,b)=>a.s-b.s));
// Practical screening envelope: ordinary connection layouts are reviewed up to four transverse bolt rows.
// Larger/more unusual layouts require an explicitly reviewed topology rather than combinatorial guessing.
const MAX_TRANSVERSE_ROWS=4;
if(rows.length>MAX_TRANSVERSE_ROWS)return{valid:false,status:"NOT_ASSESSABLE",errors:["تعداد ردیف‌های عرضی پیچ ("+rows.length+") از دامنه متعارف این بررسی هندسی بیشتر است؛ حداکثر چهار ردیف پشتیبانی می‌شود و آرایش بزرگ‌تر باید با مسیر شکست مصوب و بازبینی مهندس بررسی شود."],rowCount:rows.length,maximumTransverseRows:MAX_TRANSVERSE_ROWS,candidates:[],capacityDesigned:false,connectionApproved:false,executionReady:false};
const candidates=[],rejected=[],seen=new Set(),MAX_CANDIDATES=250;
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
 const a=rows[i],b=rows[j];
 for(const lowBolt of a.holes)for(const highBolt of b.holes){
  if(candidates.length>=MAX_CANDIDATES)break;
  const o1=add(scale(u,lowBolt.s),scale(v,a.t)),o2=add(scale(u,highBolt.s),scale(v,b.t));
  const lead=(o)=>boundary(o,u,P).filter(q=>dot(sub(q,o),u)<-E).at(-1);
  const p1=lead(o1),p2=lead(o2);
  const label=lowBolt.id+"~"+highBolt.id;
  if(!p1||!p2){rejected.push({boltPair:label,rows:[i+1,j+1],reason:"لبه آزاد باربر برای دو صفحه برشی یکتا نیست."});continue;}
  if(!sameBoundaryEdge(p1,p2,P)){rejected.push({boltPair:label,rows:[i+1,j+1],reason:"دو صفحه برشی به یک قطعه پیوسته و مشترک از لبه آزاد باربر متصل نشده‌اند."});continue;}
  if(!insideSegment(p1,o1,P)||!insideSegment(p2,o2,P)||!insideSegment(o1,o2,P)){
   rejected.push({boltPair:label,rows:[i+1,j+1],reason:"یکی از اضلاع مسیر پلکانی پیشنهادی کاملاً داخل ورق قرار ندارد."});continue;
  }
  const lines=[{id:"S1",kind:"shear",a:p1,b:o1},{id:"S2",kind:"shear",a:p2,b:o2},{id:"T1",kind:"tension",a:o1,b:o2}],crossed=[];
  for(const line of lines){
   line.grossLengthMm=dist(line.a,line.b);line.holeIntersections=[];
   for(const h of H){
    const ints=intervals(line.a,line.b,h.poly);
    if(ints.length){
     const x=[Math.min(...ints.map(z=>z[0])),Math.max(...ints.map(z=>z[1]))];
     line.holeIntersections.push({holeId:h.id,fromMm:x[0],toMm:x[1],deductionMm:x[1]-x[0]});
     if(!crossed.includes(h.id))crossed.push(h.id);
    }
   }
   line.netGeometryLengthMm=subtract(line.grossLengthMm,line.holeIntersections.map(h=>[h.fromMm,h.toMm]));
  }
  const shearAIds=new Set(lines[0].holeIntersections.map(h=>h.holeId)),shearBIds=new Set(lines[1].holeIntersections.map(h=>h.holeId)),tensionIds=new Set(lines[2].holeIntersections.map(h=>h.holeId));
  if(!a.holes.some(h=>shearAIds.has(h.id))||!b.holes.some(h=>shearBIds.has(h.id))||
     !tensionIds.has(lowBolt.id)||!tensionIds.has(highBolt.id)){
   rejected.push({boltPair:label,rows:[i+1,j+1],reason:"مسیر باید سوراخ‌های هر دو صفحه برشی و سوراخ‌های انتخابی صفحه کششی را واقعاً قطع کند."});continue;
  }
  const signature=[i,j,lowBolt.id,highBolt.id].join(":");
  if(seen.has(signature))continue;seen.add(signature);
  const sg=lines[0].grossLengthMm+lines[1].grossLengthMm,sn=lines[0].netGeometryLengthMm+lines[1].netGeometryLengthMm;
  const tg=lines[2].grossLengthMm,tn=lines[2].netGeometryLengthMm;
  candidates.push({pathId:"BS-"+(i+1)+"-"+(j+1)+"-"+lowBolt.id+"-"+highBolt.id,
   plateId:String(p.id||input.plateId||""),rowIds:[i+1,j+1],terminalBoltIds:[lowBolt.id,highBolt.id],
   pathType:Math.abs(lowBolt.s-highBolt.s)>1e-7?"STAGGERED_ZIGZAG":"STRAIGHT",
   vertices:[p1,o1,o2,p2],lines,crossedHoleIds:crossed.sort(),
   gross:{AgvLengthMm:sg,AntLengthMm:tg},netGeometry:{AnvLengthMm:sn,AntLengthMm:tn},
   geometricAreas:{AgvMm2:sg*p.thicknessMm,AnvMm2:sn*p.thicknessMm,AntMm2:tn*p.thicknessMm},
   status:"GEOMETRY_CANDIDATE_ONLY",capacityAssessable:false,
   limitations:["مسیر پلکانی بر اساس زوج پیچ‌های انتهایی از دو ردیف عرضی ساخته شده است؛ تمام توپولوژی‌های شکست ممکن یا مسیرهای ترکیبی چندردیفه لزوماً پوشش داده نشده‌اند.",
    "کسر سوراخ صرفاً طول تقاطع چندضلعی سوراخ با خط مسیر است؛ ضرایب آیین‌نامه‌ای مسیر پلکانی، فاصله گام، Ubs و قواعد سوراخ لوبیایی هنوز اعمال نشده‌اند.",
    "مساحت‌ها صرفاً هندسی‌اند و به مقاومت طراحی یا PASS/FAIL تبدیل نمی‌شوند."]});
 }
}
if(candidates.length>=MAX_CANDIDATES)rejected.push({reason:"حد بالای تعداد مسیرهای کاندید ("+MAX_CANDIDATES+") رسیده است؛ بررسی کامل آرایش پیچ نیازمند بازبینی مهندس است.",truncated:true});
const candidateEnumerationComplete=!rejected.some(x=>x.truncated===true);
return{valid:true,status:candidates.length?"GEOMETRY_CANDIDATES_FOUND":"NOT_ASSESSABLE",
 candidateEnumerationStatus:candidateEnumerationComplete?"COMPLETE_WITHIN_DECLARED_SEARCH":"TRUNCATED_REVIEW_REQUIRED",
 candidateEnumerationComplete,maximumCandidateCount:MAX_CANDIDATES,maximumTransverseRows:MAX_TRANSVERSE_ROWS,
 plateId:String(p.id||input.plateId||""),rows:rows.map((r,i)=>({rowId:i+1,transverseProjectionMm:r.t,boltIds:r.holes.map(h=>h.id)})),
 candidates,rejected,capacityDesigned:false,connectionApproved:false,executionReady:false};
}
const api={SCHEMA:"SAHROUD-BLOCK-SHEAR-GEOMETRY-1.0",assess,linePolygonIntervals:intervals,subtractIntervals:subtract};root.SahroudKneeBlockShearGeometry=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
