/* SAHROUD STEEL — cold-formed purlin/girt evidence contract.
 * Validates exact profile, verified section/buckling data, restraint,
 * simultaneous station actions, serviceability and connection evidence.
 * It calculates NO resistance and grants NO design approval.
 */
(function(root){"use strict";
const positive=v=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const text=v=>typeof v==="string"&&v.trim().length>0;
const SOURCE=["document","revision","locator","authority"];
const ACTIONS=["N_N","Vx_N","Vy_N","T_Nmm","Mx_Nmm","My_Nmm"];
const PROFILE_FIELDS=["webHeight_mm","flange1_mm","flange2_mm","lip1_mm","lip2_mm","thickness_mm","insideRadius_mm"];
const PROPERTY_FIELDS=["Ag_mm2","Ix_mm4","Iy_mm4","Ixy_mm4","J_mm4","Cw_mm6","SxTop_mm3","SxBottom_mm3","SyTop_mm3","SyBottom_mm3","shearCenterX_mm","shearCenterY_mm"];
const BUCKLING_FIELDS=["PcrGlobal_N","PcrLocal_N","PcrDistortional_N","McrGlobal_Nmm","McrLocal_Nmm","McrDistortional_Nmm"];
function audit(input){
 const d=input||{},issues=[],warnings=[];
 const group=d.group;
 if(!["roofPurlin","wallGirt","endGirt","roofEdge"].includes(group))issues.push("گروه عضو سردنورد باید مشخص و معتبر باشد.");
 if(!text(d.memberId))issues.push("شناسه فیزیکی یکتای عضو لازم است.");
 const p=d.profile||{};
 if(!["C","Z","RHS","hat","custom"].includes(p.family))issues.push("خانواده دقیق مقطع (C/Z/RHS/کلاهکی/سفارشی) نامشخص است.");
 ["designation","manufacturer","catalogRevision"].forEach(k=>{if(!text(p[k]))issues.push("مشخصات شناسایی مقطع "+k+" ناقص است.");});
 PROFILE_FIELDS.forEach(k=>{if(!positive(p[k]))issues.push("بعد واقعی مقطع "+k+" معتبر نیست.");});
 if(p.thickness_mm>0&&p.insideRadius_mm>p.thickness_mm*5)warnings.push("شعاع داخلی بزرگ نسبت به ضخامت ثبت شده است؛ واحد و هندسه مقطع بازبینی شود.");
 const m=d.material||{};
 ["Fy_MPa","Fu_MPa","E_MPa"].forEach(k=>{if(!positive(m[k]))issues.push("مشخصه مصالح "+k+" معتبر نیست.");});
 if(positive(m.Fy_MPa)&&positive(m.Fu_MPa)&&m.Fu_MPa<m.Fy_MPa)issues.push("Fu از Fy کمتر ثبت شده است.");
 if(!text(m.standard)||!text(m.certificateReference))issues.push("استاندارد محصول و مرجع گواهی مصالح ثبت نشده است.");
 const s=d.sectionProperties||{};
 PROPERTY_FIELDS.forEach(k=>{if(!finite(s[k])||(k!=="Ixy_mm4"&&k!=="shearCenterX_mm"&&k!=="shearCenterY_mm"&&s[k]<=0))issues.push("خاصیت واقعی مقطع "+k+" معتبر نیست.");});
 if(positive(s.Ix_mm4)&&positive(s.Iy_mm4)&&Math.abs(Number(s.Ixy_mm4)||0)>=Math.sqrt(s.Ix_mm4*s.Iy_mm4))issues.push("ماتریس اینرسی مقطع نامعتبر یا تکین است.");
 if(!text(s.source)||!text(s.method)||!text(s.revision))issues.push("منبع، روش استخراج و نسخه خواص مقطع باید مشخص باشد.");
 const b=d.elasticBuckling||{};
 BUCKLING_FIELDS.forEach(k=>{if(!positive(b[k]))issues.push("خروجی کمانش الاستیک "+k+" لازم است.");});
 if(!text(b.solver)||!text(b.version)||!text(b.modelReference)||b.reviewed!==true)issues.push("مدل و خروجی کمانش الاستیک باید دارای نرم‌افزار/نسخه/مرجع مدل و بازبینی مستند باشد.");
 const r=d.restraint||{};
 if(![true,false].includes(r.compressionFlangeBraced))issues.push("وضعیت مهار بال فشاری باید صریحاً تعیین شود.");
 if(!positive(r.unbracedLength_mm))issues.push("طول مهارنشده واقعی باید ثبت شود.");
 if(!text(r.braceType)||!text(r.braceConnectionReference)||r.braceCapacityVerified!==true)issues.push("نوع، اتصال و ظرفیت مهار جانبی باید مستند و تأیید شده باشد.");
 if(r.compressionFlangeBraced===true&&!positive(r.braceSpacing_mm))issues.push("فاصله مهارهای بال فشاری معتبر نیست.");
 const demands=Array.isArray(d.loadCases)?d.loadCases:[];
 if(!demands.length)issues.push("هیچ ترکیب بار طراحی/بهره‌برداری با تقاضای هم‌زمان ارائه نشده است.");
 const caseIds=demands.map(x=>String(x?.caseId||""));
 if(caseIds.some(x=>!x)||new Set(caseIds).size!==caseIds.length)issues.push("شناسه ترکیب‌های بار خالی یا تکراری است.");
 demands.forEach(c=>{
  if(!text(c.label))issues.push("نام ترکیب بار "+c.caseId+" ناقص است.");
  const missing=SOURCE.filter(k=>!text(c.source?.[k]));
  if(missing.length)issues.push("مدرک منبع ترکیب "+c.caseId+" ناقص است: "+missing.join("، ")+");
  if(!Array.isArray(c.stations)||c.stations.length<2)issues.push("ترکیب "+c.caseId+" حداقل دو ایستگاه ابتدا/انتها لازم دارد.");
  (c.stations||[]).forEach((st,i)=>{
   if(!positive(st.station_mm)&&st.station_mm!==0)issues.push("مختصات ایستگاه "+c.caseId+"/"+i+" معتبر نیست.");
   ACTIONS.forEach(k=>{if(!finite(st[k]))issues.push("تقاضای هم‌زمان "+k+" در "+c.caseId+"/"+i+" ناقص است.");});
  });
 });
 const connection=d.connection||{};
 if(!text(connection.type)||!text(connection.reference)||connection.capacityVerified!==true)issues.push("نوع اتصال و مرجع/ظرفیت تأییدشده اتصال لاپه/قید لازم است.");
 const service=d.serviceability||{};
 if(service.checked!==true||!text(service.combinationReference)||!positive(service.limitRatio))issues.push("کنترل خیز/تغییرمکان در ترکیب بهره‌برداری و حد مجاز مستند نیست.");
 const governing={};
 ACTIONS.forEach(k=>{
  let best=null;
  demands.forEach(c=>(c.stations||[]).forEach(st=>{
   const value=Number(st[k]);
   if(finite(value)&&(!best||Math.abs(value)>Math.abs(best.value)))best={value,caseId:c.caseId,label:c.label,station_mm:st.station_mm};
  }));
  governing[k]=best;
 });
 return{success:issues.length===0,readyForResistanceReview:issues.length===0,designApproved:false,capacityCalculated:false,group,memberId:d.memberId,issues:[...new Set(issues)],warnings,caseCount:demands.length,governingSimultaneousActions:governing,contractVersion:1,scope:"Evidence completeness only. This contract does not calculate AISI/M10 resistance, DSM nominal strengths, local/distortional/global buckling capacity, combined-action utilization, screw/bolt/weld resistance, or code compliance."};
}
function selfTest(){
 const good={group:"roofPurlin",memberId:"P-01",profile:{family:"Z",designation:"Z200-70-20-2.5",manufacturer:"MFG",catalogRevision:"R2",webHeight_mm:200,flange1_mm:70,flange2_mm:70,lip1_mm:20,lip2_mm:20,thickness_mm:2.5,insideRadius_mm:3},material:{Fy_MPa:350,Fu_MPa:420,E_MPa:200000,standard:"EN 10346",certificateReference:"MTC-01"},sectionProperties:{Ag_mm2:900,Ix_mm4:4e6,Iy_mm4:2e6,Ixy_mm4:0,J_mm4:5000,Cw_mm6:1e10,SxTop_mm3:40000,SxBottom_mm3:40000,SyTop_mm3:20000,SyBottom_mm3:20000,shearCenterX_mm:0,shearCenterY_mm:0,source:"manufacturer table",method:"tested section properties",revision:"R2"},elasticBuckling:{PcrGlobal_N:50000,PcrLocal_N:30000,PcrDistortional_N:40000,McrGlobal_Nmm:2e7,McrLocal_Nmm:1e7,McrDistortional_Nmm:1.5e7,solver:"CUFSM",version:"5.0",modelReference:"model-P01",reviewed:true},restraint:{compressionFlangeBraced:true,braceSpacing_mm:1500,unbracedLength_mm:1500,braceType:"sag rod and sheeting",braceConnectionReference:"BR-01",braceCapacityVerified:true},loadCases:[{caseId:"ULS-1",label:"ULS-1",source:{document:"calc.pdf",revision:"A",locator:"p.10",authority:"engineer"},stations:[{station_mm:0,N_N:0,Vx_N:100,Vy_N:0,T_Nmm:0,Mx_Nmm:1000,My_Nmm:0},{station_mm:6000,N_N:0,Vx_N:-100,Vy_N:0,T_Nmm:0,Mx_Nmm:1000,My_Nmm:0}]}],connection:{type:"self-drilling screws",reference:"CONN-01",capacityVerified:true},serviceability:{checked:true,combinationReference:"SLS-1",limitRatio:180}};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:String(e)});}};
 t("complete evidence package passes readiness only",()=>{const x=audit(good);return x.success&&x.readyForResistanceReview&&!x.designApproved&&!x.capacityCalculated;});
 t("missing exact geometry blocks",()=>!audit({...good,profile:{...good.profile,lip1_mm:null}}).success);
 t("missing local/distortional/global buckling results block",()=>!audit({...good,elasticBuckling:{...good.elasticBuckling,PcrLocal_N:null}}).success);
 t("unreviewed buckling model blocks",()=>!audit({...good,elasticBuckling:{...good.elasticBuckling,reviewed:false}}).success);
 t("unverified flange restraint blocks",()=>!audit({...good,restraint:{...good.restraint,braceCapacityVerified:false}}).success);
 t("duplicate load case IDs block",()=>!audit({...good,loadCases:[good.loadCases[0],good.loadCases[0]]}).success);
 t("incomplete simultaneous force vector blocks",()=>!audit({...good,loadCases:[{...good.loadCases[0],stations:[{...good.loadCases[0].stations[0],My_Nmm:undefined},good.loadCases[0].stations[1]]}]}).success);
 t("missing case provenance blocks",()=>!audit({...good,loadCases:[{...good.loadCases[0],source:{document:"x"}}]}).success);
 t("unverified connection capacity blocks",()=>!audit({...good,connection:{...good.connection,capacityVerified:false}}).success);
 t("missing serviceability evidence blocks",()=>!audit({...good,serviceability:{checked:false}}).success);
 t("governing action preserves case and station",()=>{const x=audit(good);return x.governingSimultaneousActions.Mx_Nmm.caseId==="ULS-1"&&x.governingSimultaneousActions.Mx_Nmm.station_mm===0;});
 t("does not combine independent maxima into a synthetic case",()=>{const x=audit({...good,loadCases:[{...good.loadCases[0],caseId:"ULS-2",label:"ULS-2",stations:[{...good.loadCases[0].stations[0],Mx_Nmm:999,My_Nmm:0},{...good.loadCases[0].stations[1],Mx_Nmm:0,My_Nmm:999}]}]});return x.governingSimultaneousActions.Mx_Nmm.caseId==="ULS-2"&&x.governingSimultaneousActions.My_Nmm.caseId==="ULS-2"&&x.governingSimultaneousActions.Mx_Nmm.station_mm!==x.governingSimultaneousActions.My_Nmm.station_mm;});
 return{passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"cold-formed evidence contract regression only; no design capacities or approval"};
}
root.SteelColdFormedMemberContract={audit,selfTest};
})(typeof window!=="undefined"?window:globalThis);
