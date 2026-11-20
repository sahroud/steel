"use strict";
(function(root){
const E=1e-8,finite=Number.isFinite;
const dot=(a,b)=>a.x*b.x+a.y*b.y,sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}),scale=(a,s)=>({x:a.x*s,y:a.y*s}),cross=(a,b)=>a.x*b.y-a.y*b.x,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function on(p,a,b){const d=sub(b,a),q=sub(p,a),l=dot(d,d),t=l?dot(q,d)/l:0;return t>=-1e-7&&t<=1+1e-7&&Math.abs(cross(d,q))<=1e-7*Math.max(1,Math.sqrt(l));}
function inside(p,P){let z=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if(on(p,a,b))return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)z=!z;}return z;}
function hit(a,b,c,d){const r=sub(b,a),s=sub(d,c),den=cross(r,s);if(Math.abs(den)<E)return null;const t=cross(sub(c,a),s)/den,u=cross(sub(c,a),r)/den;return t>=-E&&t<=1+E&&u>=-E&&u<=1+E?Math.max(0,Math.min(1,t)):null;}
function boundary(o,u,P){const R=Math.max(1,...P.map(p=>dist(p,o)))*4,a=sub(o,scale(u,R)),b=add(o,scale(u,R)),out=[];for(let i=0;i<P.length;i++){const t=hit(a,b,P[i],P[(i+1)%P.length]);if(t!==null){const p=add(a,scale(sub(b,a),t));if(!out.some(q=>dist(p,q)<1e-6))out.push(p);}}return out.sort((p,q)=>dot(sub(p,o),u)-dot(sub(q,o),u));}
function insideSegment(a,b,P){for(let k=0;k<P.length;k++){const t=hit(a,b,P[k],P[(k+1)%P.length]);if(t!==null&&t>1e-7&&t<1-1e-7)return false;}for(let i=0;i<=64;i++)if(!inside(add(a,scale(sub(b,a),i/64)),P))return false;return true;}
function intervals(a,b,P){const L=dist(a,b),d=sub(b,a);if(L<E)return[];const ts=[0,1];for(let i=0;i<P.length;i++){const t=hit(a,b,P[i],P[(i+1)%P.length]);if(t!==null)ts.push(t);}ts.sort((x,y)=>x-y);const u=ts.filter((t,i)=>!i||Math.abs(t-ts[i-1])>1e-7),out=[];for(let i=0;i<u.length-1;i++)if(inside(add(a,scale(d,(u[i]+u[i+1])/2)),P))out.push([u[i]*L,u[i+1]*L]);return out;}
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
const H=holes.map(h=>({id:String(h.id),c:{x:+(h.center?.x??h.xMm),y:+(h.center?.y??h.yMm)},poly:h.polygon||h.polygonMm}));
if(H.some(h=>!h.id||!finite(h.c.x)||!finite(h.c.y)||!Array.isArray(h.poly)||h.poly.length<8))return{valid:false,status:"NOT_ASSESSABLE",errors:["هندسه کامل محیط سوراخ‌ها الزامی است."],candidates:[]};
const sorted=H.map(h=>({...h,s:dot(h.c,u),t:dot(h.c,v)})).sort((a,b)=>a.t-b.t),rows=[];
for(const h of sorted){let r=rows.find(q=>Math.abs(q.t-h.t)<=tol);if(!r){r={t:h.t,holes:[]};rows.push(r);}r.holes.push(h);}
rows.forEach(r=>r.holes.sort((a,b)=>a.s-b.s));
const candidates=[],rejected=[];
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
const a=rows[i],b=rows[j],end=Math.max(a.holes.at(-1).s,b.holes.at(-1).s),o1=add(scale(u,end),scale(v,a.t)),o2=add(scale(u,end),scale(v,b.t));
const lead=(o)=>boundary(o,u,P).filter(q=>dot(sub(q,o),u)<-E).at(-1),p1=lead(o1),p2=lead(o2);
if(!p1||!p2){rejected.push({rows:[i+1,j+1],reason:"لبه آزاد باربر برای دو صفحه برشی یکتا نیست."});continue;}
const q1=o1,q2=o2;
if(!insideSegment(p1,q1,P)||!insideSegment(p2,q2,P)||!insideSegment(q1,q2,P)){rejected.push({rows:[i+1,j+1],reason:"مسیر پیشنهادی کاملاً داخل ورق نیست."});continue;}
const lines=[{id:"S1",kind:"shear",a:p1,b:q1},{id:"S2",kind:"shear",a:p2,b:q2},{id:"T1",kind:"tension",a:q1,b:q2}],crossed=[];
for(const line of lines){line.grossLengthMm=dist(line.a,line.b);line.holeIntersections=[];for(const h of H){const ints=intervals(line.a,line.b,h.poly);if(ints.length){const x=[Math.min(...ints.map(z=>z[0])),Math.max(...ints.map(z=>z[1]))];line.holeIntersections.push({holeId:h.id,fromMm:x[0],toMm:x[1],deductionMm:x[1]-x[0]});if(!crossed.includes(h.id))crossed.push(h.id);}}line.netGeometryLengthMm=subtract(line.grossLengthMm,line.holeIntersections.map(h=>[h.fromMm,h.toMm]));}
const shearAIds=new Set(lines[0].holeIntersections.map(h=>h.holeId)),shearBIds=new Set(lines[1].holeIntersections.map(h=>h.holeId)),tensionIds=new Set(lines[2].holeIntersections.map(h=>h.holeId));
const terminalHasBothRows=a.holes.some(h=>tensionIds.has(h.id))&&b.holes.some(h=>tensionIds.has(h.id));
if(!a.holes.some(h=>shearAIds.has(h.id))||!b.holes.some(h=>shearBIds.has(h.id))||!terminalHasBothRows){
 rejected.push({rows:[i+1,j+1],reason:"مسیر باید سوراخ‌های هر دو صفحه برشی و سوراخ‌های ردیف انتهایی در هر دو سمت را واقعاً قطع کند."});continue;
}
const sg=lines[0].grossLengthMm+lines[1].grossLengthMm,sn=lines[0].netGeometryLengthMm+lines[1].netGeometryLengthMm,tg=lines[2].grossLengthMm,tn=lines[2].netGeometryLengthMm;
candidates.push({pathId:"BS-"+(i+1)+"-"+(j+1),plateId:String(p.id||input.plateId||""),rowIds:[i+1,j+1],vertices:[p1,q1,q2,p2],lines,crossedHoleIds:crossed.sort(),gross:{AgvLengthMm:sg,AntLengthMm:tg},netGeometry:{AnvLengthMm:sn,AntLengthMm:tn},geometricAreas:{AgvMm2:sg*p.thicknessMm,AnvMm2:sn*p.thicknessMm,AntMm2:tn*p.thicknessMm},status:"GEOMETRY_CANDIDATE_ONLY",capacityAssessable:false,limitations:["候选路径由两行横向螺栓及板边界构造；未枚举其他破坏机制或确定控制路径。","孔洞扣减为多边形与路径的几何交长；规范对错列孔、长圆孔及 Ubs 的规则尚未应用。","几何面积不是设计承载力，不得产生 PASS/FAIL。"]});
}
return{valid:true,status:candidates.length?"GEOMETRY_CANDIDATES_FOUND":"NOT_ASSESSABLE",plateId:String(p.id||input.plateId||""),rows:rows.map((r,i)=>({rowId:i+1,transverseProjectionMm:r.t,boltIds:r.holes.map(h=>h.id)})),candidates,rejected,capacityDesigned:false,connectionApproved:false,executionReady:false};
}
const api={SCHEMA:"SAHROUD-BLOCK-SHEAR-GEOMETRY-1.0",assess,linePolygonIntervals:intervals,subtractIntervals:subtract};root.SahroudKneeBlockShearGeometry=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
