/* SAHROUD STEEL — Wall cladding dead-load transfer to foundation supports.
 * Only the explicitly selected foundation-bearing support mode is implemented.
 * Steel-secondary and independent wall support paths remain blocked.
 */
(function(root){
"use strict";
const FACES=["front","rear","left","right"];
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const num=v=>v===undefined||v===null||v===""?null:Number(v);
const near=(a,b,t=1e-6)=>Math.abs(Number(a)-Number(b))<=t;
function roofY(x,g){const half=Number(g.span)/2;return Number(g.height)+Number(g.rise)*(1-Math.abs(Number(x)-half)/half);}
function integralRoofHeight(a,b,g){
 const half=Number(g.span)/2,pts=[a,...(a<half-1e-9&&b>half+1e-9?[half]:[]),b];let area=0;
 for(let i=0;i<pts.length-1;i++)area+=(pts[i+1]-pts[i])*(roofY(pts[i],g)+roofY(pts[i+1],g))/2;
 return area;
}
function tributaryStrips(coords,total){
 const x=[...new Set(coords.map(Number))].sort((a,b)=>a-b);
 if(x.length<2||!near(x[0],0)||!near(x[x.length-1],total))return null;
 return x.map((v,i)=>({coordinate:v,start:i===0?0:(x[i-1]+v)/2,end:i===x.length-1?total:(v+x[i+1])/2}));
}
function supportNodes(model,face){
 const g=model.geometry,nodes=model.nodes||[],tol=1e-5;
 if(face==="left"||face==="right"){
  const x=face==="left"?0:Number(g.span);
  return nodes.filter(n=>n.kind==="base"&&near(n.x,x,tol)).map(n=>({id:String(n.id),coordinate:Number(n.z)}));
 }
 const z=face==="front"?0:Number(g.length);
 return nodes.filter(n=>(n.kind==="base"||n.kind==="endwall-base")&&near(n.z,z,tol)).map(n=>({id:String(n.id),coordinate:Number(n.x)}));
}
function faceAreaWeights(model,face,nodes){
 const g=model.geometry,total=face==="left"||face==="right"?Number(g.length):Number(g.span);
 const strips=tributaryStrips(nodes.map(n=>n.coordinate),total);if(!strips)return null;
 return strips.map((s,i)=>({nodeId:nodes.find(n=>near(n.coordinate,s.coordinate))?.id,start:s.start,end:s.end,
  areaM2:face==="left"||face==="right"?(s.end-s.start)*Number(g.height):integralRoofHeight(s.start,s.end,g)}));
}
function audit(model){
 const issues=[],rows=[],nodalLoads=[];
 if(!model?.geometry||!Array.isArray(model.nodes)||!Array.isArray(model.members))return {success:false,loadTransferEnabled:false,issues:["مدل سه‌بعدی معتبر برای انتقال وزن دیوار موجود نیست."],rows,nodalLoads};
 const brief=root.SteelDesignCore?.getData?.(),walls=brief?.wallEnvelope;
 if(!walls)return {success:false,loadTransferEnabled:false,issues:["مشخصات چهار وجه دیوار در مبانی طراحی موجود نیست."],rows,nodalLoads};
 let masonry=null;
 try{masonry=root.SteelMasonryWallAudit?.audit?.(model)||null;}catch(e){issues.push("ممیزی وزن دیوار آجری اجرا نشد: "+String(e.message||e));}
 if(!masonry)issues.push("محاسبه مساحت/وزن دیوار برای کنترل بازشوها در دسترس نیست.");
 const g=model.geometry;
 if(!(Number(g.span)>0&&Number(g.length)>0&&Number(g.height)>0&&Number(g.rise)>=0))issues.push("ابعاد هندسی برای توزیع وزن دیوار معتبر نیست.");
 FACES.forEach(face=>{
  const cfg=walls[face];if(!cfg?.material)return;
  const mode=cfg.supportMode||"unknown";
  if(mode!=="foundation-bearing"){
   issues.push(face+": مسیر تحمل وزن دیوار باید صریحاً «اتکای مستقیم به فونداسیون» باشد؛ انتقال به زیرسازی فولادی یا قاب مستقل هنوز مدل نشده است.");
   rows.push({face,status:"unsupported-support-mode",weightKN:null,nodeCount:0});return;
  }
  const faceData=masonry?.faces?.find(x=>x.face===face);
  if(!faceData){issues.push(face+": مساحت خالص و اطلاعات بازشو برای دیوار موجود نیست.");rows.push({face,status:"missing-area",weightKN:null,nodeCount:0});return;}
  if(faceData.openingAreaM2>1e-8){issues.push(face+": وجود بازشو ثبت شده است؛ توزیع موضعی وزن باقیمانده به تکیه‌گاه‌ها هنوز مدل نشده و انتقال متوقف شد.");rows.push({face,status:"opening-distribution-required",weightKN:null,nodeCount:0});return;}
  let q=null,source="";
  if(cfg.material==="brick"){
   const m=brief.masonry||{},thickness=num(m.thicknessMm),gamma=num(m.unitWeightKNm3),plaster=num(m.plasterThicknessMm)||0,extra=num(cfg.deadSurfaceLoadKNm2);
   if(!(thickness>0&&gamma>0)){issues.push(face+": ضخامت و وزن مخصوص دیوار آجری برای محاسبه وزن مرده لازم است.");rows.push({face,status:"missing-masonry-weight",weightKN:null,nodeCount:0});return;}
   if(plaster>0&&!(extra!==null&&extra>0)){issues.push(face+": اندود دیوار ثبت شده اما وزن سطحی افزوده آن وارد نشده است.");rows.push({face,status:"missing-plaster-weight",weightKN:null,nodeCount:0});return;}
   q=thickness/1000*gamma+(extra||0);source="masonry thickness × unit weight + declared additional surface weight";
   if(faceData.weightKN===null){issues.push(face+": وزن دیوار آجری از ممیزی مصالح قابل محاسبه نیست.");rows.push({face,status:"missing-masonry-weight",weightKN:null,nodeCount:0});return;}
  }else{
   const w=num(cfg.deadSurfaceLoadKNm2);
   if(!(w!==null&&w>0)){issues.push(face+": وزن سطحی مرده پوشش غیرآجری باید از کاتالوگ/مشخصات وارد شود.");rows.push({face,status:"missing-surface-weight",weightKN:null,nodeCount:0});return;}
   q=w;source="user-entered manufacturer/specification surface dead weight";
  }
  const area=Number(faceData.netAreaM2);
  if(!(area>0&&finite(area))){issues.push(face+": مساحت دیوار برای وزن مرده معتبر نیست.");rows.push({face,status:"invalid-area",weightKN:null,nodeCount:0});return;}
  const expectedArea=face==="front"||face==="rear"?Number(g.span)*Number(g.height)+Number(g.span)*Number(g.rise)/2:Number(g.length)*Number(g.height);
  if(Math.abs(area-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){issues.push(face+": مساحت خالص با مساحت کامل سطح تفاوت دارد؛ تا مدل‌سازی محل بازشوها، انتقال وزن متوقف شد.");rows.push({face,status:"area-mismatch",weightKN:null,nodeCount:0});return;}
  const supports=supportNodes(model,face);
  const weights=faceAreaWeights(model,face,supports);
  if(!weights||weights.some(x=>!x.nodeId||!(x.areaM2>0))){issues.push(face+": گره‌های پایه برای پوشش کامل طول/عرض دیوار کافی یا پیوسته نیستند.");rows.push({face,status:"missing-support-nodes",weightKN:null,nodeCount:supports.length});return;}
  const totalArea=weights.reduce((sum,x)=>sum+x.areaM2,0);
  if(Math.abs(totalArea-expectedArea)>Math.max(1e-5,expectedArea*1e-6)){issues.push(face+": جمع مساحت‌های بارگیر تکیه‌گاه‌ها با سطح دیوار برابر نیست.");rows.push({face,status:"tributary-area-mismatch",weightKN:null,nodeCount:supports.length});return;}
  const weightKN=q*totalArea;
  weights.forEach(x=>nodalLoads.push({nodeId:x.nodeId,values:[0,-weightKN*1000*x.areaM2/totalArea,0,0,0,0],source:"wall-dead-load",face,tributaryAreaM2:x.areaM2,sourceWeightKN:weightKN* x.areaM2/totalArea}));
  rows.push({face,status:"assigned",material:cfg.material,supportMode:mode,source,unitWeightKNm2:q,areaM2:totalArea,weightKN,nodeCount:weights.length,tributaryAreas:weights.map(x=>({nodeId:x.nodeId,areaM2:x.areaM2}))});
 });
 const success=issues.length===0&&rows.length===FACES.filter(f=>walls[f]?.material).length;
 return {success,loadTransferEnabled:success,issues,rows,nodalLoads,totalWeightKN:rows.filter(r=>r.status==="assigned").reduce((s,r)=>s+r.weightKN,0),method:"foundation-bearing wall dead weight distributed to explicit base support nodes by tributary wall area",limits:["Only foundation-bearing walls are supported in this version.","Walls with openings are blocked until opening-localized tributary areas are modelled.","Steel-secondary and independent wall support systems are not transferred.","Gable wind is separate and remains blocked until its cladding-to-post/top-chord path is defined."],analysisEnabled:false,designApproved:false};
}
function prepareNodalLoads(model,deadFactor){
 const factor=num(deadFactor);if(factor===null||factor<0)throw Error("ضریب بار مرده دیوار نامعتبر است.");
 const a=audit(model);if(!a.success)throw Error("انتقال وزن مرده دیوار ناقص است: "+a.issues.join("؛ "));
 const map=new Map();
 a.nodalLoads.forEach(n=>{const old=map.get(n.nodeId)||{nodeId:n.nodeId,values:[0,0,0,0,0,0],sources:[]};n.values.forEach((v,i)=>old.values[i]+=v*factor);old.sources.push({face:n.face,sourceWeightKN:n.sourceWeightKN*factor});map.set(n.nodeId,old);});
 return [...map.values()];
}
function selfTest(){
 const tests=[],t=(name,fn)=>{try{tests.push({name,ok:fn()!==false});}catch(e){tests.push({name,ok:false,error:String(e.message||e)});}};
 const oldBrief=root.SteelDesignCore,oldMasonry=root.SteelMasonryWallAudit,oldTransfer=root.SteelWallDeadLoadTransfer;
 const g={span:10,length:20,height:5,rise:2};
 const nodes=[
  {id:"L0",x:0,y:0,z:0,kind:"base"},{id:"L1",x:0,y:0,z:10,kind:"base"},{id:"L2",x:0,y:0,z:20,kind:"base"},
  {id:"R0",x:10,y:0,z:0,kind:"base"},{id:"R1",x:10,y:0,z:10,kind:"base"},{id:"R2",x:10,y:0,z:20,kind:"base"},
  {id:"F1",x:5,y:0,z:0,kind:"endwall-base"},{id:"B1",x:5,y:0,z:20,kind:"endwall-base"}
 ];
 const model={geometry:g,nodes,members:[]};
 const wallEnvelope={front:{material:"brick",supportMode:"foundation-bearing"},rear:{material:"brick",supportMode:"foundation-bearing"},left:{material:"brick",supportMode:"foundation-bearing"},right:{material:"brick",supportMode:"foundation-bearing"}};
 const brief={wallEnvelope,masonry:{thicknessMm:200,unitWeightKNm3:18,plasterThicknessMm:0}};
 root.SteelDesignCore={getData:()=>brief};
 root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:(face==="front"||face==="rear")?60:100,openingAreaM2:0,weightKN:(face==="front"||face==="rear")?216:360}))})};
 const a=audit(model);
 t("foundation-bearing brick walls produce four face transfers",()=>a.success&&a.rows.length===4&&a.nodalLoads.length===12);
 t("tributary nodal forces equal total wall dead weight",()=>Math.abs(a.nodalLoads.reduce((s,x)=>s-x.values[1]/1000,0)-a.totalWeightKN)<1e-8);
 t("front gable tributary areas integrate exact roof slope",()=>{const f=a.rows.find(x=>x.face==="front");return Math.abs(f.areaM2-(10*5+10*2/2))<1e-8;});
 t("dead factor scales only the wall dead nodal actions",()=>{const x=prepareNodalLoads(model,1.4);return Math.abs(x.reduce((s,n)=>s-n.values[1]/1000,0)-a.totalWeightKN*1.4)<1e-8;});
 t("unknown support mode is blocked",()=>{brief.wallEnvelope.left.supportMode="unknown";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success&&x.issues.some(v=>v.includes("اتکای مستقیم"));});
 t("steel-secondary support remains explicitly unsupported",()=>{brief.wallEnvelope.left.supportMode="steel-secondary";const x=audit(model);brief.wallEnvelope.left.supportMode="foundation-bearing";return !x.success;});
 t("non-brick wall requires entered surface weight",()=>{brief.wallEnvelope.left.material="sandwich-panel";const x=audit(model);brief.wallEnvelope.left.material="brick";return !x.success&&x.issues.some(v=>v.includes("وزن سطحی"));});
 t("wall openings block uniform tributary distribution",()=>{root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:59,openingAreaM2:1,weightKN:2124}))})};const x=audit(model);root.SteelMasonryWallAudit={audit:()=>({faces:["front","rear","left","right"].map(face=>({face,netAreaM2:(face==="front"||face==="rear")?60:100,openingAreaM2:0,weightKN:(face==="front"||face==="rear")?216:360}))})};return !x.success&&x.issues.some(v=>v.includes("بازشو"));});
 t("missing base support coverage is blocked",()=>{const x=audit({...model,nodes:nodes.filter(n=>n.id!=="L0")});return !x.success;});
 t("analysis approval remains disabled",()=>a.analysisEnabled===false&&a.designApproved===false);
 root.SteelDesignCore=oldBrief;root.SteelMasonryWallAudit=oldMasonry;root.SteelWallDeadLoadTransfer=oldTransfer;
 return {passed:tests.filter(x=>x.ok).length,failed:tests.filter(x=>!x.ok).length,total:tests.length,tests};
}
root.SteelWallDeadLoadTransfer={audit,prepareNodalLoads,selfTest};
})(typeof window!=="undefined"?window:globalThis);
