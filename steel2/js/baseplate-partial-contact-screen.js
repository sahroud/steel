/* SAHROUD STEEL — nonlinear spring screening of partial base-plate contact.
 * Rigid plate kinematics; compression-only distributed concrete springs and tension-only anchor springs.
 * This is a numerical screening model, NOT a code-complete plate/anchor/concrete design.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||String(v).trim()==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;};
const fmt=v=>Number(v).toLocaleString("fa-IR",{maximumFractionDigits:4});
function solve3(A,b){
 const m=A.map((r,i)=>r.slice().concat(b[i]));
 for(let k=0;k<3;k++){
  let p=k;for(let i=k+1;i<3;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;
  if(Math.abs(m[p][k])<1e-14)throw Error("ماتریس سختی تکین است؛ آرایش تماس/مهار برای تعادل کافی نیست.");
  [m[k],m[p]]=[m[p],m[k]];
  const d=m[k][k];for(let j=k;j<4;j++)m[k][j]/=d;
  for(let i=0;i<3;i++)if(i!==k){const f=m[i][k];for(let j=k;j<4;j++)m[i][j]-=f*m[k][j];}
 }
 return m.map(r=>r[3]);
}
function calculate(i){
 const positive=["plateXmm","plateZmm","subgradeK","anchorK","rows","cols","pitchXmm","pitchZmm","gridN"];
 positive.forEach(k=>{if(!(Number.isFinite(i[k])&&i[k]>0))throw Error("ورودی مثبت و معتبر برای "+k+" لازم است.");});
 if(!Number.isInteger(i.rows)||!Number.isInteger(i.cols)||i.rows*i.cols>36)throw Error("آرایش بولت باید عدد صحیح و حداکثر ۳۶ بولت باشد.");
 if(!Number.isInteger(i.gridN)||i.gridN<5||i.gridN>41||i.gridN%2===0)throw Error("شبکه تماس باید عدد فرد بین ۵ تا ۴۱ باشد.");
 if(i.rows>1&&i.pitchZmm<=0||i.cols>1&&i.pitchXmm<=0)throw Error("فواصل بولت باید مثبت باشند.");
 if(![i.tensionKN,i.momentXKNm,i.momentZKNm].every(Number.isFinite))throw Error("N، Mx و Mz را هم‌زمان وارد کنید؛ برای صفر عدد صفر بنویسید.");
 const B=i.plateXmm/1000,L=i.plateZmm/1000,dx=B/i.gridN,dz=L/i.gridN,area=dx*dz;
 const anchors=[];for(let r=0;r<i.rows;r++)for(let c=0;c<i.cols;c++)anchors.push({id:"AB-"+String(anchors.length+1).padStart(2,"0"),x:(c-(i.cols-1)/2)*i.pitchXmm/1000,z:(r-(i.rows-1)/2)*i.pitchZmm/1000});
 if(anchors.some(a=>Math.abs(a.x)>B/2||Math.abs(a.z)>L/2))throw Error("مختصات یکی از بولت‌ها خارج از صفحه‌ستون است.");
 const cells=[];for(let r=0;r<i.gridN;r++)for(let c=0;c<i.gridN;c++)cells.push({x:-B/2+(c+.5)*dx,z:-L/2+(r+.5)*dz,k:i.subgradeK*area});
 const q=[-i.tensionKN,-i.momentXKNm,-i.momentZKNm];
 const sumK=i.anchorK*anchors.length;
 let d=[i.tensionKN>0?-i.tensionKN/sumK:-1e-7,0,0];
 if(anchors.length>1){const sx=anchors.reduce((s,a)=>s+a.x*a.x,0),sz=anchors.reduce((s,a)=>s+a.z*a.z,0);if(sz>0)d[1]=-i.momentXKNm/(i.anchorK*sz);if(sx>0)d[2]=-i.momentZKNm/(i.anchorK*sx);}
 let iterations=0,err=Infinity,internal=[0,0,0],K;
 function assemble(v,withK){
  const f=[0,0,0],mat=[[0,0,0],[0,0,0],[0,0,0]];
  const add=(x,z,stiff,w,activeForce)=>{const g=[1,z,x];for(let a=0;a<3;a++){f[a]+=activeForce*g[a];if(withK)for(let b=0;b<3;b++)mat[a][b]+=stiff*g[a]*g[b];}};
  cells.forEach(c=>{const w=v[0]+v[1]*c.z+v[2]*c.x;if(w>0)add(c.x,c.z,c.k,w,c.k*w);});
  anchors.forEach(a=>{const w=v[0]+v[1]*a.z+v[2]*a.x;if(w<0)add(a.x,a.z,i.anchorK,w,i.anchorK*w);});
  return {f,mat};
 }
 for(iterations=1;iterations<=100;iterations++){
  const a=assemble(d,true);internal=a.f;K=a.mat;
  const r=q.map((v,j)=>v-internal[j]);err=Math.max(Math.abs(r[0]),Math.abs(r[1]),Math.abs(r[2]));
  if(err<1e-7)break;
  const step=solve3(K,r);
  let alpha=1,accepted=false;
  for(let ls=0;ls<16;ls++,alpha*=.5){
   const trial=d.map((v,j)=>v+alpha*step[j]),t=assemble(trial,false).f;
   const e=Math.max(...q.map((v,j)=>Math.abs(v-t[j])));
   if(e<err){d=trial;accepted=true;break;}
  }
  if(!accepted)throw Error("حل تماس جزئی همگرا نشد؛ شبکه، سختی‌ها و بارها را بازبینی کنید.");
 }
 if(iterations>100)throw Error("حل تماس جزئی در ۱۰۰ تکرار همگرا نشد.");
 const cellOut=cells.map(c=>{const w=d[0]+d[1]*c.z+d[2]*c.x;return{x:c.x,z:c.z,displacementMm:w*1000,pressureMPa:w>0?i.subgradeK*w/1000:0};});
 const boltOut=anchors.map(a=>{const w=d[0]+d[1]*a.z+d[2]*a.x;return{...a,displacementMm:w*1000,tensionKN:w<0?-i.anchorK*w:0};});
 const contact=cellOut.filter(c=>c.pressureMPa>0),sumC=contact.reduce((s,c)=>s+c.pressureMPa*1000*area,0),sumT=boltOut.reduce((s,a)=>s+a.tensionKN,0);
 const minP=contact.length?Math.min(...contact.map(c=>c.pressureMPa)):0,maxP=contact.length?Math.max(...contact.map(c=>c.pressureMPa)):0;
 return{method:"rigid_plate_compression_only_winkler_grid_plus_tension_only_anchor_springs",iterations,residual:err,plate:{widthMm:i.plateXmm,lengthMm:i.plateZmm},loads:{tensionKN:i.tensionKN,momentXKNm:i.momentXKNm,momentZKNm:i.momentZKNm},rigidPlane:{translationMm:d[0]*1000,rotationAboutXRad:d[1],rotationAboutZRad:d[2]},contact:{cellCount:contact.length,totalCellCount:cells.length,ratio:contact.length/cells.length,minPressureMPa:minP,maxPressureMPa:maxP,concreteCompressionKN:sumC},anchors:{count:boltOut.length,totalTensionKN:sumT,maxTensionKN:Math.max(...boltOut.map(a=>a.tensionKN)),bolts:boltOut},equilibrium:{verticalResidualKN:q[0]-internal[0],momentXResidualKNm:q[1]-internal[1],momentZResidualKNm:q[2]-internal[2]},limitations:["صفحه‌ستون به‌صورت صفحه صلب با سه درجه آزادی قائم فرض شده؛ انعطاف خمشی صفحه و سخت‌کننده‌ها و اثر prying مدل نشده است.","بستر بتن با فنرهای فشاری و شبکه‌بندی یکنواخت Winkler تقریب زده شده؛ k بستر باید از مدل/داده معتبر ژئوتکنیک و سازگاری واحدها گرفته شود و معادل مستقیم مقاومت فشاری بتن نیست.","انکربولت‌ها فنر کششی خطی با سختی محوری ورودی هستند؛ لغزش، چسبندگی، مخروط شکست، pullout، pryout، لبه و اثر گروه بررسی نشده است.","برش، اصطکاک، shear lug، تماس گروت، ترک بتن، خزش، غیرخطی‌شدن مصالح، نصب و ضوابط لرزه‌ای مدل نشده‌اند.","علامت لنگرها طبق قرارداد تعمیم‌یافته مدل است: Mx با مختصات z و Mz با مختصات x؛ پیش از استفاده با محورهای پروژه تطبیق دهید.","این تحلیل عددی مقدماتی است و طراحی یا تأیید اجرایی/آیین‌نامه‌ای محسوب نمی‌شود."],input:i};
}
function mount(){
 if($("baseplatePartialContactPanel"))return;
 const a=$("anchorDemandScreenPanel")||$("baseplateThicknessScreenPanel");if(!a)return;
 const p=document.createElement("section");p.className="panel";p.id="baseplatePartialContactPanel";
 p.innerHTML='<div class="panel-title"><h3>تحلیل عددی تماس جزئی صفحه‌ستون و کشش انکربولت</h3><span class="status">مدل فنری مقدماتی</span></div>'+
 '<div class="notice">مدل، صفحه را صلب فرض می‌کند؛ بتن زیر صفحه فقط فشار می‌گیرد و انکربولت فقط کشش. سختی بستر و سختی محوری هر بولت باید از داده معتبر وارد شوند. این مدل جایگزین تحلیل خمشی صفحه، prying یا کنترل آیین‌نامه‌ای بتن و مهار نیست.</div>'+
 '<h4>هندسه صفحه و گروه بولت</h4><div class="form-grid">'+
 '<div class="field"><label>عرض صفحه X (mm)</label><input id="pcPlateX" type="number" min="1" value="400"></div>'+
 '<div class="field"><label>طول صفحه Z (mm)</label><input id="pcPlateZ" type="number" min="1" value="400"></div>'+
 '<div class="field"><label>تعداد ردیف بولت در Z</label><input id="pcRows" type="number" min="1" max="6" step="1" value="2"></div>'+
 '<div class="field"><label>تعداد ستون بولت در X</label><input id="pcCols" type="number" min="1" max="6" step="1" value="2"></div>'+
 '<div class="field"><label>فاصله بولت‌ها در X (mm)</label><input id="pcPitchX" type="number" min="1" value="240"></div>'+
 '<div class="field"><label>فاصله بولت‌ها در Z (mm)</label><input id="pcPitchZ" type="number" min="1" value="240"></div></div>'+
 '<h4>بارهای هم‌زمان و سختی‌ها</h4><div class="form-grid">'+
 '<div class="field"><label>N (kN؛ کشش مثبت)</label><input id="pcN" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>Mx (kN.m؛ مزدوج مختصات Z)</label><input id="pcMx" type="number" step="0.1" value="20"></div>'+
 '<div class="field"><label>Mz (kN.m؛ مزدوج مختصات X)</label><input id="pcMz" type="number" step="0.1" value="0"></div>'+
 '<div class="field"><label>سختی قائم بستر k (kN/m³)</label><input id="pcSubgradeK" type="number" min="0.001" step="1000" placeholder="از داده ژئوتکنیک"></div>'+
 '<div class="field"><label>سختی محوری هر انکربولت (kN/m)</label><input id="pcAnchorK" type="number" min="0.001" step="1000" placeholder="از هندسه و مشخصات مهار"></div>'+
 '<div class="field"><label>تعداد تقسیم شبکه تماس (فرد ۵ تا ۴۱)</label><input id="pcGridN" type="number" min="5" max="41" step="2" value="21"></div></div>'+
 '<div class="button-grid"><button id="pcRun" class="btn primary" type="button">حل تماس جزئی</button><button id="pcSensitivity" class="btn secondary" type="button">بررسی حساسیت شبکه</button><button id="pcCsv" class="btn secondary" type="button" disabled>گزارش CSV</button></div>'+
 '<div id="pcResult" class="notice">بارها و سختی‌های معتبر را وارد کنید.</div><div id="pcSensitivityResult" class="notice">پس از حل، حساسیت شبکه را بررسی کنید.</div><div id="pcBoltRows" class="table-wrap"></div>'+
 '<div class="notice">واحد سختی بستر kN/m³ است و با مدول عکس‌العمل خاک/بستر سازگار تعریف می‌شود، نه مقاومت فشاری بتن. نتایج با تغییر اندازه شبکه حساسیت‌سنجی شوند.</div>';
 a.parentNode.insertBefore(p,a.nextSibling);
 $("pcRun").addEventListener("click",run);$("pcCsv").addEventListener("click",csv);$("pcSensitivity").addEventListener("click",runSensitivity);
}
let last=null;
function read(){return{plateXmm:num("pcPlateX"),plateZmm:num("pcPlateZ"),rows:num("pcRows"),cols:num("pcCols"),pitchXmm:num("pcPitchX"),pitchZmm:num("pcPitchZ"),tensionKN:num("pcN"),momentXKNm:num("pcMx"),momentZKNm:num("pcMz"),subgradeK:num("pcSubgradeK"),anchorK:num("pcAnchorK"),gridN:num("pcGridN")};}
function run(){
 try{const i=read(),r=calculate(i);last=r;
 $("pcResult").textContent="سطح تماس فعال: "+fmt(100*r.contact.ratio)+"٪ ("+r.contact.cellCount+"/"+r.contact.totalCellCount+") | فشار تماس حداقل/حداکثر: "+fmt(r.contact.minPressureMPa)+" / "+fmt(r.contact.maxPressureMPa)+" MPa | جمع فشار بتن: "+fmt(r.contact.concreteCompressionKN)+" kN | جمع کشش بولت‌ها: "+fmt(r.anchors.totalTensionKN)+" kN | بیشینه کشش یک بولت: "+fmt(r.anchors.maxTensionKN)+" kN | تکرار: "+r.iterations+" | باقیمانده تعادل: "+fmt(r.residual);
 const t=document.createElement("table");t.innerHTML="<thead><tr><th>بولت</th><th>X (m)</th><th>Z (m)</th><th>کشش (kN)</th><th>جابجایی صفحه (mm)</th></tr></thead><tbody></tbody>";const body=t.querySelector("tbody");
 r.anchors.bolts.forEach(b=>{const tr=document.createElement("tr");[b.id,fmt(b.x),fmt(b.z),fmt(b.tensionKN),fmt(b.displacementMm)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
 $("pcBoltRows").replaceChildren(t);$("pcCsv").disabled=false;return r;
 }catch(e){last=null;$("pcResult").textContent=e.message;$("pcBoltRows").replaceChildren();$("pcCsv").disabled=true;return null;}
}
function runSensitivity(){
 try{const r=sensitivity(read());$("pcSensitivityResult").textContent="حساسیت شبکه (۵ تا ۴۱ تقسیم): "+r.runs.map(x=>"n="+x.gridN+"؛ qmax="+fmt(x.maxPressureMPa)+" MPa؛ Tbolt,max="+fmt(x.maxAnchorTensionKN)+" kN؛ سطح تماس="+fmt(100*x.contactRatio)+"٪").join(" | ")+" | اختلاف نسبی شبکه اول تا آخر: فشار="+(r.relativeDifference.maxPressure===null?"—":fmt(100*r.relativeDifference.maxPressure)+"٪")+"؛ کشش بولت="+(r.relativeDifference.maxAnchorTension===null?"—":fmt(100*r.relativeDifference.maxAnchorTension)+"٪")+". "+r.warning;return r;}
 catch(e){$("pcSensitivityResult").textContent=e.message;return null;}
}
function csv(){if(!last)return;const r=last,rows=[["SAHROUD STEEL - Partial contact screening"],["method",r.method],["iterations",r.iterations],["residual",r.residual],["contact ratio",r.contact.ratio],["minimum pressure MPa",r.contact.minPressureMPa],["maximum pressure MPa",r.contact.maxPressureMPa],["concrete compression kN",r.contact.concreteCompressionKN],["total anchor tension kN",r.anchors.totalTensionKN],["maximum anchor tension kN",r.anchors.maxTensionKN],["bolt","x m","z m","tension kN","displacement mm"],...r.anchors.bolts.map(b=>[b.id,b.x,b.z,b.tensionKN,b.displacementMm]),["equilibrium residual vertical kN",r.equilibrium.verticalResidualKN],["equilibrium residual Mx kN.m",r.equilibrium.momentXResidualKNm],["equilibrium residual Mz kN.m",r.equilibrium.momentZResidualKNm],...r.limitations.map(x=>["limitation",x])];const data="\uFEFF"+rows.map(a=>a.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="SAHROUD-STEEL-Partial-Contact.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function sensitivity(i,gridSizes=[11,21,31,41]){
 const runs=gridSizes.map(gridN=>calculate({...i,gridN}));
 const ref=runs[runs.length-1];
 return {method:"grid_refinement_sensitivity",runs:runs.map(r=>({gridN:r.input.gridN,contactRatio:r.contact.ratio,maxPressureMPa:r.contact.maxPressureMPa,maxAnchorTensionKN:r.anchors.maxTensionKN,totalAnchorTensionKN:r.anchors.totalTensionKN,residual:r.residual})),relativeDifference:{maxPressure:ref.contact.maxPressureMPa>0?Math.abs(runs[0].contact.maxPressureMPa-ref.contact.maxPressureMPa)/ref.contact.maxPressureMPa:null,maxAnchorTension:ref.anchors.maxTensionKN>0?Math.abs(runs[0].anchors.maxTensionKN-ref.anchors.maxTensionKN)/ref.anchors.maxTensionKN:null},warning:"این مقایسه فقط حساسیت شبکه عددی را نشان می‌دهد؛ همگرایی شبکه، صحت فرضیات فنری یا انطباق آیین‌نامه‌ای را اثبات نمی‌کند."};
}
function selfTest(){
 const base={plateXmm:400,plateZmm:400,rows:2,cols:2,pitchXmm:240,pitchZmm:240,tensionKN:0,momentXKNm:0,momentZKNm:0,subgradeK:20000,anchorK:10000,gridN:21};
 const c=calculate({...base,tensionKN:-100}),t=calculate({...base,tensionKN:40}),m=calculate({...base,momentXKNm:20});
 const checks=[["فشار محوری، تماس کامل و بدون کشش بولت",c.contact.ratio===1&&c.anchors.totalTensionKN===0],["کشش محوری، فعال‌شدن انکربولت‌ها",t.anchors.totalTensionKN>0&&t.contact.ratio===0],["لنگر، تماس جزئی و کشش بولت ایجاد می‌کند",m.contact.ratio>0&&m.contact.ratio<1&&m.anchors.totalTensionKN>0],["تعادل قائم در حد تلرانس",Math.abs(m.equilibrium.verticalResidualKN)<1e-6],["تعادل لنگر در حد تلرانس",Math.abs(m.equilibrium.momentXResidualKNm)<1e-6]];
 return{passed:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
root.SteelBaseplatePartialContact={calculate,sensitivity,selfTest,getLast:()=>last?JSON.parse(JSON.stringify(last)):null};
if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
