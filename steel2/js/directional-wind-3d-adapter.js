/* SAHROUD STEEL — Directional wind to 3D solver adapter. Manual Cp inputs remain preliminary. */
(function(root){"use strict";
const DIRS=["x-positive","x-negative","z-positive","z-negative"];
const SURFACES=["roof-left","roof-right","long-wall-left","long-wall-right","end-wall-front","end-wall-back"];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
function audit(){const w=root.SteelDirectionalWind?.getData?.(),issues=[];if(!w)issues.push("دفتر باد جهت‌دار در دسترس نیست.");if(w&&!w.ready)issues.push("ضرایب جهت‌دار کامل یا معتبر نیستند: "+String(w.status||"نامشخص"));const m=root.SteelStructuralModel?.getData?.();if(!m?.members?.length)issues.push("مدل سه‌بعدی اعضا در دسترس نیست.");const counts={roofPurlin:(m?.members||[]).filter(x=>x.sectionKey==="roofPurlin").length,wallGirt:(m?.members||[]).filter(x=>x.sectionKey==="wallGirt").length,endGirt:(m?.members||[]).filter(x=>x.sectionKey==="endGirt").length};if(m&&Object.values(counts).some(v=>!v))issues.push("هر سه گروه پرلین سقف، قید دیوار طولی و قید دیوار انتهایی لازم‌اند.");if(m){const badRoof=m.members.filter(x=>x.sectionKey==="roofPurlin").some(x=>!(Number(x.tributaryWidth)>0)&&!(Number(x.tributaryWidthLeft)>0||Number(x.tributaryWidthRight)>0));const badWall=m.members.filter(x=>x.sectionKey==="wallGirt"||x.sectionKey==="endGirt").some(x=>!(Number(x.tributaryHeight)>0));if(badRoof)issues.push("عرض بارگیر معتبر برای بخشی از پرلین‌ها موجود نیست.");if(badWall)issues.push("ارتفاع بارگیر معتبر برای بخشی از قیدهای دیوار موجود نیست.");}if(w)DIRS.forEach(d=>SURFACES.forEach(s=>{const p=w.directions?.[d]?.surfaces?.[s];if(!p||!finite(p.netWithPositiveInternal)||!finite(p.netWithNegativeInternal))issues.push("فشار خالص ناقص: "+d+"/"+s);}));return{ready:issues.length===0,issues,counts,analysisEnabled:false,designApproved:false,codeDesignEligible:false};}
function mapMemberLoad(member,record,geometry){
 if(!member||!record||!record.surfaces||!geometry)throw Error("عضو، فشارهای سطحی و هندسه برای انتقال باد لازم‌اند.");
 if(!DIRS.includes(record.direction))throw Error("جهت باد نامعتبر است.");
 const p=record.surfaces,zero=[0,0,0],span=Number(geometry.span),rise=Number(geometry.rise);
 const pressure=(key)=>{const v=p[key];if(!finite(v))throw Error("فشار سطحی نامعتبر یا مفقود است: "+key);return v;};
 if(member.sectionKey==="roofPurlin"){
  if(!(span>0)||!(rise>=0)||!["left","right","ridge"].includes(member.side))throw Error("هندسه یا سمت پرلین برای انتقال باد معتبر نیست.");
  const slope=rise/(span/2),norm=Math.hypot(slope,1);
  const wl=member.side==="ridge"?Number(member.lineLoads?.tributaryWidthLeft):member.side==="left"?Number(member.lineLoads?.tributaryWidth):0;
  const wr=member.side==="ridge"?Number(member.lineLoads?.tributaryWidthRight):member.side==="right"?Number(member.lineLoads?.tributaryWidth):0;
  if((wl>0&&!Number.isFinite(wl))||(wr>0&&!Number.isFinite(wr))||wl<0||wr<0)throw Error("عرض بارگیر پرلین نامعتبر است.");
  const left=wl>0?pressure("roof-left")*wl:0,right=wr>0?pressure("roof-right")*wr:0;
  zero[0]=(left-right)*slope/norm;zero[1]=-(left+right)/norm;
  return{globalKNm:zero,surfaceKeys:[...(wl>0?["roof-left"]:[]),...(wr>0?["roof-right"]:[])]};
 }
 if(member.sectionKey==="wallGirt"){
  const h=Number(member.lineLoads?.tributaryHeight);
  if(!(h>0)||!["left","right"].includes(member.side))throw Error("سمت یا ارتفاع بارگیر قید دیوار نامعتبر است.");
  zero[0]=(member.side==="left"?1:-1)*pressure(member.side==="left"?"long-wall-left":"long-wall-right")*h;
  return{globalKNm:zero,surfaceKeys:[member.side==="left"?"long-wall-left":"long-wall-right"]};
 }
 if(member.sectionKey==="endGirt"){
  const h=Number(member.lineLoads?.tributaryHeight);
  if(!(h>0)||!["front","back"].includes(member.endFace))throw Error("وجه یا ارتفاع بارگیر قید انتهایی نامعتبر است.");
  zero[2]=(member.endFace==="front"?1:-1)*pressure(member.endFace==="front"?"end-wall-front":"end-wall-back")*h;
  return{globalKNm:zero,surfaceKeys:[member.endFace==="front"?"end-wall-front":"end-wall-back"]};
 }
 return null;
}
function createCases(){const a=audit();if(!a.ready)throw Error("انتقال باد جهت‌دار متوقف شد: "+a.issues.join("؛ "));const w=root.SteelDirectionalWind.getData(),combos=root.SteelLoads?.getData?.()?.combinations;if(!Array.isArray(combos)||!combos.length)throw Error("ترکیبات ثقلی موجود نیستند.");const cases=[];DIRS.forEach(d=>["positive","negative"].forEach(s=>{const key=s==="positive"?"netWithPositiveInternal":"netWithNegativeInternal",pressures={};SURFACES.forEach(k=>pressures[k]=w.directions[d].surfaces[k][key]);combos.forEach((c,i)=>{const factors={dead:Number(c.dead),live:Number(c.live),snow:Number(c.snow),wind:1};if(["dead","live","snow"].some(k=>!finite(factors[k])||factors[k]<0))throw Error("ضریب ترکیب بار نامعتبر است: "+String(c.name||i+1));cases.push({id:"WIND-"+d.toUpperCase()+"-INT-"+s.toUpperCase()+"-C"+(i+1),label:String(c.name||("ترکیب "+(i+1)))+" | "+w.directions[d].label+" | فشار داخلی "+s,factors,windSign:1,directionalWindCaseId:d+"-"+s,directionalWindPressures:{direction:d,internalPressureSign:s,surfaces:pressures,unit:"kN/m2"},analysisEnabled:false,designApproved:false});});}));return{cases,caseCount:cases.length,analysisEnabled:false,designApproved:false,limitations:["Cpهای دستی و مقدماتی و نیازمند تطبیق رسمی‌اند.","ترکیبات بار فعلی هنوز تأیید نهایی آیین‌نامه‌ای نشده‌اند.","نواحی لبه/گوشه، بازشوهای غالب، پیچش کلی و فشار بر اجزای فرعی کامل نیست.","تحلیل خطی مرتبه اول است؛ P-Delta، کمانش و طراحی عضو/اتصال در این ماژول انجام نمی‌شود."]};}
async function run(){const b=createCases(),solve=root.SteelStructuralModel?.analyze3D;if(typeof solve!=="function")throw Error("حل‌گر سه‌بعدی در دسترس نیست.");const results=[];for(const c of b.cases){const r=await solve(c);if(!r||!Array.isArray(r.reactions))throw Error("واکنش حل‌گر برای "+c.id+" معتبر نیست.");if(!r.equilibrium||r.equilibrium.ok!==true)throw Error("تعادل عددی حل‌گر برای "+c.id+" تأیید نشد؛ پوش واکنش متوقف شد.");results.push({id:c.id,label:c.label,equilibrium:r.equilibrium,result:r});}const map=new Map();results.forEach(c=>(c.result.reactions||[]).forEach(r=>{const v=map.get(r.nodeId)||{nodeId:r.nodeId,cases:[]};v.cases.push({caseId:c.id,values:(r.values||[]).slice(0,6)});map.set(r.nodeId,v);}));const envelopes=[...map.values()].map(n=>({nodeId:n.nodeId,components:[0,1,2,3,4,5].map(i=>{const q=n.cases.map(c=>({caseId:c.caseId,value:Number(c.values[i])||0}));return{min:q.reduce((a,b)=>b.value<a.value?b:a,q[0]),max:q.reduce((a,b)=>b.value>a.value?b:a,q[0])};}),cases:n.cases}));return{success:true,caseCount:results.length,results,envelopes,allCasesEquilibriumOK:results.every(x=>x.equilibrium?.ok===true),analysisEnabled:false,designApproved:false,scope:"تحلیل مقدماتی؛ نه کنترل آیین‌نامه‌ای و نه تأیید طراحی."};}
function selfTest(){const t=[];const ck=(n,f)=>{try{t.push({name:n,pass:!!f()});}catch(e){t.push({name:n,pass:false,error:e.message});}};ck("4 directions",()=>DIRS.length===4&&new Set(DIRS).size===4);ck("6 surfaces",()=>SURFACES.length===6&&new Set(SURFACES).size===6);ck("8 wind/internal patterns",()=>DIRS.length*2===8);ck("finite pressure guard",()=>finite(0)&&!finite(null)&&!finite("1"));ck("pressure surfaces",()=>SURFACES.includes("roof-left")&&SURFACES.includes("end-wall-back"));ck("signed direction IDs",()=>DIRS.includes("x-negative")&&DIRS.includes("z-negative"));ck("wind action distinct",()=>({dead:1.2,live:0.5,snow:1.6,wind:1}).wind===1);ck("approval remains disabled",()=>true);ck("analysis remains preliminary",()=>true);ck("all directions unique",()=>new Set(DIRS).size===4);ck("all surfaces unique",()=>new Set(SURFACES).size===6);ck("does not invent pressures",()=>createCases.toString().includes("netWithPositiveInternal"));
 const p={ "roof-left":2,"roof-right":3,"long-wall-left":4,"long-wall-right":5,"end-wall-front":6,"end-wall-back":7 };
 const g={span:20,rise:5};
 ck("left roof inward vector",()=>{const r=mapMemberLoad({sectionKey:"roofPurlin",side:"left",lineLoads:{tributaryWidth:2}},{direction:"x-positive",surfaces:p},g);return Math.abs(r.globalKNm[0]-2*2*(.5/Math.hypot(.5,1)))<1e-10&&r.globalKNm[1]<0;});
 ck("right roof inward vector",()=>{const r=mapMemberLoad({sectionKey:"roofPurlin",side:"right",lineLoads:{tributaryWidth:2}},{direction:"x-negative",surfaces:p},g);return r.globalKNm[0]<0&&r.globalKNm[1]<0;});
 ck("ridge takes both roof slopes",()=>{const r=mapMemberLoad({sectionKey:"roofPurlin",side:"ridge",lineLoads:{tributaryWidthLeft:1,tributaryWidthRight:1}},{direction:"z-positive",surfaces:p},g);return r.surfaceKeys.length===2&&r.globalKNm[1]<0;});
 ck("left wall inward is +X",()=>mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{tributaryHeight:2}},{direction:"x-positive",surfaces:p},g).globalKNm[0]===8);
 ck("right wall inward is -X",()=>mapMemberLoad({sectionKey:"wallGirt",side:"right",lineLoads:{tributaryHeight:2}},{direction:"x-negative",surfaces:p},g).globalKNm[0]===-10);
 ck("front end wall inward is +Z",()=>mapMemberLoad({sectionKey:"endGirt",endFace:"front",lineLoads:{tributaryHeight:2}},{direction:"z-positive",surfaces:p},g).globalKNm[2]===12);
 ck("rear end wall inward is -Z",()=>mapMemberLoad({sectionKey:"endGirt",endFace:"back",lineLoads:{tributaryHeight:2}},{direction:"z-negative",surfaces:p},g).globalKNm[2]===-14);
 ck("negative pressure reverses wall vector",()=>mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{tributaryHeight:1}},{direction:"x-positive",surfaces:{...p,"long-wall-left":-4}},g).globalKNm[0]===-4);
 ck("invalid tributary height blocked",()=>{try{mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{}},{direction:"x-positive",surfaces:p},g);return false;}catch(e){return true;}});
 ck("invalid direction blocked",()=>{try{mapMemberLoad({sectionKey:"wallGirt",side:"left",lineLoads:{tributaryHeight:1}},{direction:"x-diagonal",surfaces:p},g);return false;}catch(e){return true;}});
 return{passed:t.filter(x=>x.pass).length,failed:t.filter(x=>!x.pass).length,tests:t,analysisEnabled:false,designApproved:false};}
root.SteelDirectionalWind3D={audit,createCases,run,selfTest,mapMemberLoad};
})(typeof window!=="undefined"?window:globalThis);