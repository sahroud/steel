/* SAHROUD STEEL — restricted gusset plate resistance screen.
 * Provisional reference basis: ANSI/AISC 360-22 J4-1 and J4-5.
 * This is NOT a declaration of compliance with Iranian M10. Only concentric axial
 * tension is screened; no eccentric, compression, bolt, weld, rupture, or buckling design.
 */
(function(root){
"use strict";
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
function calculate(connection,demand){
 const issues=[];
 const req=["plateThicknessMm","whitmoreWidthMm","grossShearAreaMm2","netShearAreaMm2","netTensionAreaMm2","plateFyMPa","plateFuMPa","blockShearUbs","eccentricityMm"];
 req.forEach(k=>{if(!finite(connection[k]))issues.push("ورودی "+k+" ناموجود/نامعتبر است.");});
 if(issues.length)return {ok:false,issues};
 if(connection.eccentricityMm!==0)issues.push("خروج از مرکزیت غیرصفر است؛ این غربال محوری و بدون لنگر قابل استفاده نیست.");
 if(connection.plateThicknessMm<=0||connection.whitmoreWidthMm<=0||connection.plateFyMPa<=0||connection.plateFuMPa<=0)issues.push("ابعاد یا خواص مصالح باید مثبت باشند.");
 if(connection.plateFuMPa<connection.plateFyMPa)issues.push("Fu ورق از Fy کمتر است؛ داده مصالح بازبینی شود.");
 if(connection.netShearAreaMm2>connection.grossShearAreaMm2)issues.push("Anv از Agv بیشتر است.");
 if(![0.5,1].includes(connection.blockShearUbs))issues.push("Ubs باید 0.5 یا 1 و بر اساس توزیع تنش مستند باشد.");
 if(!finite(demand)||demand<0)issues.push("تقاضای کششی همان انتها/ترکیب معتبر نیست.");
 if(issues.length)return {ok:false,issues};
 const Agw=connection.plateThicknessMm*connection.whitmoreWidthMm;
 const whitmoreYield=0.90*connection.plateFyMPa*Agw;
 const termShearRupture=0.60*connection.plateFuMPa*connection.netShearAreaMm2;
 const termShearYield=0.60*connection.plateFyMPa*connection.grossShearAreaMm2;
 const termTension=connection.blockShearUbs*connection.plateFuMPa*connection.netTensionAreaMm2;
 const blockShear=0.75*Math.min(termShearRupture+termTension,termShearYield+termTension);
 const uW=whitmoreYield>0?demand/whitmoreYield:Infinity;
 const uB=blockShear>0?demand/blockShear:Infinity;
 return {ok:true,demandN:demand,whitmore:{grossAreaMm2:Agw,availableN:whitmoreYield,utilization:uW},blockShear:{ruptureBranchN:0.75*(termShearRupture+termTension),yieldBranchN:0.75*(termShearYield+termTension),availableN:blockShear,utilization:uB},governing:uW>=uB?"Whitmore tensile yielding":"Block shear",maxUtilization:Math.max(uW,uB),basis:"AISC 360-22 J4-1, J4-5 (provisional reference only)",designApproved:false};
}
function analyze(envelope,model,connectionData){
 const modelNow=model||root.SteelStructuralModel?.getData?.();
 const connections=Array.isArray(connectionData?.connections)?connectionData.connections:[];
 const demandAudit=root.SteelBraceForceDemandAudit?.audit?.(envelope,modelNow);
 const issues=[];
 if(!demandAudit)issues.push("ماژول استخراج تقاضای مهاربند در دسترس نیست.");
 else if(!demandAudit.success)issues.push(...demandAudit.issues);
 const expected=(modelNow?.members||[]).filter(m=>m.sectionKey==="roofBrace"||m.sectionKey==="wallBrace");
 const map=new Map(connections.map(c=>[String(c.memberId)+"::"+c.end,c]));
 const rows=[];
 if(!expected.length)issues.push("مهاربند فعالی در مدل جاری شناسایی نشد.");
 if(!envelope)issues.push("پوش نیروی تازه در دسترس نیست؛ تحلیل تمام ترکیبات را اجرا کنید.");
 if(issues.length)return {success:false,issues,rows,analysisEnabled:false,designApproved:false};
 demandAudit.rows.forEach(brace=>{
  ["I","J"].forEach(end=>{
   const c=map.get(brace.memberId+"::"+end);
   if(!c){issues.push("داده اتصال "+brace.memberId+" / "+end+" موجود نیست.");return;}
   brace.simultaneousDemands.forEach(d=>{
    const tension=end==="I"?d.endI_tension_N:d.endJ_tension_N;
    const compression=end==="I"?d.endI_compression_N:d.endJ_compression_N;
    const r=calculate(c,tension);
    rows.push({memberId:brace.memberId,end,caseLabel:d.caseLabel,tensionDemandN:tension,compressionDemandN:compression,...r});
   });
  });
 });
 const incomplete=rows.filter(r=>!r.ok);
 if(incomplete.length)issues.push("برخی اتصال‌ها به علت داده ناکافی یا خروج از دامنه، قابل محاسبه نیستند.");
 const completed=rows.filter(r=>r.ok);
 return {success:issues.length===0&&completed.length===expected.length*2*demandAudit.expectedCaseCount,issues,rows,completedCount:completed.length,expectedCount:expected.length*2*demandAudit.expectedCaseCount,analysisEnabled:false,designApproved:false,limitations:[
 "فقط تسلیم کششی مقطع Whitmore با Ag=t×b و گسیختگی بلوکی با Agv/Anv/Ant واردشده از نقشه غربال می‌شوند.",
 "عرض Whitmore و سطوح Agv/Anv/Ant ورودی‌های مستند نقشه‌اند؛ نرم‌افزار هندسه مسیر شکست یا سوراخ‌ها را مستقلاً استخراج/تأیید نمی‌کند.",
 "گسیختگی کششی مقطع خالص Whitmore، کمانش گاست‌پلیت، فشار، لنگر/خروج از مرکزیت، اندرکنش، پیچ، جوش، bearing و tear-out در این مرحله محاسبه نمی‌شوند.",
 "مبنای AISC 360-22 است و تا تطبیق بندبه‌بند با مبحث دهم ایران، خروجی صرفاً غربال مقدماتی است."
 ]};
}
function renderResult(r){
 const host=$("braceGussetStrengthResult");if(!host)return;
 const rows=r.rows||[];
 host.innerHTML='<strong>'+(r.success?"محاسبات غربال برای همه انتهاها و ترکیبات دارای داده کامل انجام شد.":"غربال ناقص/مسدود است.")+'</strong>'+
 '<p>موارد محاسبه‌شده: '+(r.completedCount||0)+' از '+(r.expectedCount||0)+'</p>'+
 (rows.length?'<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>عضو</th><th>انتها</th><th>ترکیب</th><th>کشش kN</th><th>فشار kN (کنترل‌نشده)</th><th>Whitmore φRn kN</th><th>Block shear φRn kN</th><th>نسبت حاکم</th><th>حالت حاکم</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.memberId)+'</td><td>'+x.end+'</td><td>'+esc(x.caseLabel)+'</td><td>'+(finite(x.tensionDemandN)?(x.tensionDemandN/1000).toFixed(3):"—")+'</td><td>'+(finite(x.compressionDemandN)?(x.compressionDemandN/1000).toFixed(3):"—")+'</td><td>'+(x.ok?(x.whitmore.availableN/1000).toFixed(3):"—")+'</td><td>'+(x.ok?(x.blockShear.availableN/1000).toFixed(3):"—")+'</td><td>'+(x.ok?x.maxUtilization.toFixed(3):"—")+'</td><td>'+(x.ok?x.governing:esc((x.issues||[]).join("؛ ")))+'</td></tr>').join("")+'</tbody></table></div>':"")+
 (r.issues?.length?'<ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+
 '<p><strong>محدودیت:</strong> این خروجی تأیید طراحی نیست. فشار مهاربند، لنگر، کمانش گاست و سایر اجزای اتصال هنوز کنترل نشده‌اند.</p>'+
 '<ul>'+((r.limitations)||[]).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>';
}
function run(){
 const envelope=root.SteelMemberForceEnvelope?.getLast?.();
 const model=root.SteelStructuralModel?.getData?.();
 const conn=root.SteelBraceConnectionReadiness?.getData?.();
 const r=analyze(envelope,model,conn);
 renderResult(r);
 return r;
}
function init(){
 if($("braceGussetStrengthPanel"))return;
 const anchor=$("braceConnectionReadinessPanel"),main=document.querySelector("main");
 if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="braceGussetStrengthPanel";
 p.innerHTML="<div class='panel-title'><h3>غربال مقاومت گاست‌پلیت مهاربند — Whitmore و Block Shear</h3><span class='status'>AISC 360-22 · مقدماتی</span></div><div class='notice'>ابتدا تحلیل همه ترکیبات بار را اجرا کنید. Fy، Fu، عرض Whitmore، Agv، Anv و Ant باید برای هر انتهای اتصال از مصالح و نقشه مستند وارد شوند. فقط کشش محوری با خروج از مرکزیت صفر بررسی می‌شود.</div><div class='button-grid'><button type='button' class='btn primary' id='btnBraceGussetStrengthRun'>محاسبه غربال گاست‌پلیت برای همه ترکیبات</button></div><div id='braceGussetStrengthResult' class='notice'>هنوز محاسبه‌ای اجرا نشده است.</div>";
 if(anchor?.parentNode)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 $("btnBraceGussetStrengthRun").addEventListener("click",run);
}
function selfTest(){
 const c={plateThicknessMm:10,whitmoreWidthMm:150,grossShearAreaMm2:1500,netShearAreaMm2:1200,netTensionAreaMm2:600,plateFyMPa:235,plateFuMPa:360,blockShearUbs:1,eccentricityMm:0};
 const tests=[],t=(name,fn)=>{try{tests.push({name,pass:fn()===true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 t("Whitmore tensile yielding uses phi 0.90 Fy Ag",()=>{const r=calculate(c,100000);return r.ok&&Math.abs(r.whitmore.availableN-317250)<1e-6;});
 t("block shear uses J4-5 minimum of rupture and yielding branches",()=>{const r=calculate(c,100000);return r.ok&&Math.abs(r.blockShear.availableN-0.75*Math.min(0.6*360*1200+360*600,0.6*235*1500+360*600))<1e-6;});
 t("Ubs 0.5 is accepted when explicitly selected",()=>calculate({...c,blockShearUbs:0.5},100000).ok);
 t("unsupported Ubs is rejected",()=>!calculate({...c,blockShearUbs:0.75},100000).ok);
 t("nonzero eccentricity blocks axial-only screen",()=>!calculate({...c,eccentricityMm:5},100000).ok);
 t("missing material strength blocks result",()=>!calculate({...c,plateFyMPa:null},100000).ok);
 t("Fu below Fy is rejected",()=>!calculate({...c,plateFuMPa:200},100000).ok);
 t("net shear area above gross is rejected",()=>!calculate({...c,netShearAreaMm2:1600},100000).ok);
 t("negative demand is rejected",()=>!calculate(c,-1).ok);
 t("no approval is emitted",()=>calculate(c,100000).designApproved===false);
 t("N to MPa-mm2 dimensional consistency",()=>{const r=calculate(c,0);return r.ok&&r.whitmore.availableN===317250;});
 return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,total:tests.length,tests,scope:"restricted axial-tension plate resistance screen; not final design or Iranian code certification"};
}
root.SteelBraceGussetStrengthScreen={calculate,analyze,run,selfTest};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
