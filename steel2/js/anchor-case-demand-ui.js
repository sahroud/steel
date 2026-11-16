/* SAHROUD STEEL — UI bridge for selected foundation reaction to anchor-group demands.
 * Requires explicit confirmation of sign convention and as-built anchor geometry.
 */
(function(root){"use strict";
const $=id=>root.document?.getElementById(id);
let craneAnchorGroups={};
function buildAnchors(layout){
 const rows=Number(layout?.rows),cols=Number(layout?.cols),px=Number(layout?.pitchX),pz=Number(layout?.pitchZ);
 if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows*cols>64)throw Error("تعداد ردیف/ستون انکر باید عدد صحیح بین ۱ تا ۶۴ باشد.");
 if((cols>1&&!(px>0))||(rows>1&&!(pz>0))||!Number.isFinite(px)||!Number.isFinite(pz))throw Error("گام واقعی انکرها در محورهای فعال باید مثبت و عددی باشد.");
 const out=[];for(let r=0;r<rows;r++)for(let col=0;col<cols;col++)out.push({id:"AB-"+String(out.length+1).padStart(2,"0"),x_m:(col-(cols-1)/2)*px/1000,z_m:(r-(rows-1)/2)*pz/1000});
 return out;
}
function calculateSelected(selection,layout){
 if(!selection?.row||!selection?.case||!selection?.mapped)throw Error("ابتدا یک گره پایه و حالت بار معتبر انتخاب کنید.");
 if(layout?.signConfirmed!==true)throw Error("ابتدا قرارداد علامت نیروها را پس از کنترل با مدل تأیید کنید.");
 if(layout?.geometryConfirmed!==true)throw Error("تطبیق هندسه و آرایش انکرها با نقشه اجرایی/وضعیت واقعی پایه باید صریحاً تأیید شود.");
 const anchors=buildAnchors(layout),m=selection.mapped;
 const action=[m.Vx_kN*1000,m.N_tensionPositive_kN*1000,m.Vz_kN*1000,m.Mx_kNm*1000,m.Ty_kNm*1000,m.Mz_kNm*1000];
 if(!action.every(Number.isFinite))throw Error("کنش شش‌مؤلفه‌ای انتخاب‌شده کامل و معتبر نیست.");
 const api=root.SteelAnchorCaseDemandBridge;
 if(typeof api?.distributeCase!=="function")throw Error("ماژول توزیع تقاضای انکر بارگذاری نشده است.");
 return api.distributeCase({nodeId:String(selection.row.nodeId),caseId:String(selection.case.label),columnActionN_Nm:action},anchors);
}
function mount(){
 const panel=$("baseReactionTransferPanel");if(!panel||$("brtAnchorDemandRun"))return;
 const box=root.document.createElement("section");box.className="panel";box.id="brtAnchorDemandPanel";box.setAttribute("data-focus-group","foundation");
 box.innerHTML=`<div class="panel-title"><h3>توزیع واکنش انتخابی بین تک‌تک انکرها</h3><span class="status">تقاضا؛ بدون تأیید ظرفیت</span></div><div class="notice">پس از استخراج واکنش‌ها، یک گره پایه و یک حالت بار را انتخاب کنید. آرایش و گام بولت‌ها از پنل گروه بولت خوانده می‌شود؛ پیش از محاسبه باید هم قرارداد علامت و هم تطبیق هندسه با نقشه اجرایی را تأیید کرده باشید. هر حالت بار جداگانه محاسبه می‌شود.</div><div class="button-grid"><button id="brtAnchorDemandRun" class="btn primary" type="button">محاسبه تقاضای انکرهای این حالت</button><button id="brtAnchorDemandJson" class="btn secondary" type="button" disabled>گزارش JSON تقاضای انکر</button></div><div id="brtAnchorDemandSummary" class="notice">هنوز تقاضای انکر برای حالت انتخابی محاسبه نشده است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>انکر</th><th>X (m)</th><th>Z (m)</th><th>کشش (kN)</th><th>فشار محوری (kN)</th><th>برش X (kN)</th><th>برش Z (kN)</th><th>برش برآیند (kN)</th></tr></thead><tbody id="brtAnchorDemandRows"></tbody></table></div>
<div class="notice" style="margin-top:16px"><strong>تقاضای جرثقیل سقفی در پای ستون و گروه انکر</strong><br>پس از اجرای جاروب کامل و موفق موقعیت‌های جرثقیل، گره پایه و موقعیت قطار را انتخاب کنید. هندسه گروه انکر واردشده در همین پنل فقط برای پایه انتخابی استفاده می‌شود؛ برای پایه‌های دیگر باید هندسه جداگانه تعریف و تأیید شود. این مسیر هر موقعیت را مستقل نگه می‌دارد و با ترکیبات بار عادی جمع نمی‌کند.</div><div class="form-grid"><div class="field"><label for="brtCraneNode">گره پایه جرثقیل</label><select id="brtCraneNode"><option value="">ابتدا جاروب جرثقیل را اجرا کنید</option></select></div><div class="field"><label for="brtCraneCase">موقعیت جرثقیل</label><select id="brtCraneCase"><option value="">ابتدا جاروب جرثقیل را اجرا کنید</option></select></div></div><h4>هندسه مستقل گروه انکر برای پایه انتخابی</h4><div class="form-grid"><div class="field"><label for="brtCraneRows">تعداد ردیف Z</label><input id="brtCraneRows" type="number" min="1" max="8" step="1"></div><div class="field"><label for="brtCraneCols">تعداد ستون X</label><input id="brtCraneCols" type="number" min="1" max="8" step="1"></div><div class="field"><label for="brtCranePitchX">فاصله محور X (mm)</label><input id="brtCranePitchX" type="number" min="0" step="1"></div><div class="field"><label for="brtCranePitchZ">فاصله محور Z (mm)</label><input id="brtCranePitchZ" type="number" min="0" step="1"></div></div><label class="check-row"><input id="brtCraneSign" type="checkbox"> قرارداد علامت و جهت محورهای این پایه کنترل شده است.</label><label class="check-row"><input id="brtCraneGeometry" type="checkbox"> آرایش و مختصات این گروه با نقشه اجرایی همین پایه تطبیق داده شده است.</label><div class="button-grid"><button id="brtCraneSaveGeometry" class="btn secondary" type="button">ثبت هندسه همین پایه در پرونده پروژه</button></div><div id="brtCraneGeometryStatus" class="notice">برای هر گره پایه باید آرایش مستقل و تأییدشده ثبت شود.</div><div class="button-grid"><button id="brtCraneRefresh" class="btn secondary" type="button">بارگذاری موقعیت‌های جاروب‌شده جرثقیل</button><button id="brtCraneAnchorRun" class="btn primary" type="button">محاسبه تقاضای انکر در موقعیت جرثقیل</button><button id="brtCraneAnchorJson" class="btn secondary" type="button" disabled>گزارش JSON تقاضای جرثقیل/انکر</button></div><div id="brtCraneAnchorSummary" class="notice">هنوز تقاضای جرثقیل به گروه انکر منتقل نشده است.</div>
<div class="notice" style="margin-top:12px">غربال مستقل مقاومت فولادی انکرها: پارامترهای Fnt، Fnv، Ase و φ را فقط از آیین‌نامه و مشخصات واقعی انکر وارد کنید. کشش و برش جداگانه سنجیده می‌شوند؛ اندرکنش و شکست بتن در این بخش کنترل نمی‌شود.</div>
<div class="form-grid"><div class="field"><label>سطح مؤثر کششی Ase (mm²)</label><input id="brtAsAse" type="number" min="0" step="0.1"></div><div class="field"><label>تنش اسمی کششی Fnt (MPa)</label><input id="brtAsFnt" type="number" min="0" step="1"></div><div class="field"><label>تنش اسمی برشی Fnv (MPa)</label><input id="brtAsFnv" type="number" min="0" step="1"></div><div class="field"><label>ضریب مقاومت کشش φt</label><input id="brtAsPhiT" type="number" min="0" max="1" step="0.01"></div><div class="field"><label>ضریب مقاومت برش φv</label><input id="brtAsPhiV" type="number" min="0" max="1" step="0.01"></div></div>
<div class="button-grid"><button id="brtAnchorSteelRun" class="btn secondary" type="button">مقایسه مقاومت فولادی تک‌تک انکرها</button></div><div id="brtAnchorSteelSummary" class="notice">پس از محاسبه تقاضای انکر، پارامترهای مستند را وارد کنید.</div>
<div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:680px"><thead><tr><th>انکر / حالت</th><th>نسبت کشش</th><th>نسبت برش</th><th>ظرفیت کشش (kN)</th><th>ظرفیت برش (kN)</th><th>وضعیت غربال جداگانه</th></tr></thead><tbody id="brtAnchorSteelRows"></tbody></table></div>`;
 panel.insertAdjacentElement("afterend",box);
 let last=null,lastCrane=null;
 const craneNode=$("brtCraneNode"),craneCase=$("brtCraneCase"),craneSummary=$("brtCraneAnchorSummary"),craneRun=$("brtCraneAnchorRun"),craneJson=$("brtCraneAnchorJson");
 const craneRows=$("brtCraneRows"),craneCols=$("brtCraneCols"),cranePitchX=$("brtCranePitchX"),cranePitchZ=$("brtCranePitchZ"),craneSign=$("brtCraneSign"),craneGeometry=$("brtCraneGeometry"),craneGeometryStatus=$("brtCraneGeometryStatus");
 function loadCraneLayout(){const d=craneAnchorGroups[craneNode.value]||{};craneRows.value=d.rows??"";craneCols.value=d.cols??"";cranePitchX.value=d.pitchX??"";cranePitchZ.value=d.pitchZ??"";craneSign.checked=d.signConfirmed===true;craneGeometry.checked=d.geometryConfirmed===true;craneGeometryStatus.textContent=d.rows?"هندسه مستقل این پایه ثبت شده است؛ پیش از استفاده، نقشه و محورهای واقعی را دوباره کنترل کنید.":"برای این پایه هنوز هندسه مستقل ثبت نشده است.";
 }
 function saveCraneLayout(){const id=craneNode.value;if(!id)throw Error("ابتدا گره پایه را انتخاب کنید.");const d={rows:Number(craneRows.value),cols:Number(craneCols.value),pitchX:Number(cranePitchX.value),pitchZ:Number(cranePitchZ.value),signConfirmed:craneSign.checked,geometryConfirmed:craneGeometry.checked};if(!Number.isInteger(d.rows)||!Number.isInteger(d.cols)||d.rows<1||d.cols<1||d.rows>8||d.cols>8||d.rows*d.cols<2)throw Error("آرایش باید حداقل دو انکر و حداکثر ۸×۸ انکر داشته باشد.");if(!Number.isFinite(d.pitchX)||!Number.isFinite(d.pitchZ)||(d.cols>1&&d.pitchX<=0)||(d.rows>1&&d.pitchZ<=0))throw Error("فاصله محورهای فعال باید مثبت و عددی باشد.");if(!d.signConfirmed||!d.geometryConfirmed)throw Error("تأیید قرارداد علامت و تطبیق هندسه اجرایی همین پایه الزامی است.");craneAnchorGroups[id]=d;craneNode.dispatchEvent(new Event("change",{bubbles:true}));craneGeometryStatus.textContent="هندسه مستقل گره "+id+" ثبت شد و برای ذخیره خودکار به پرونده پروژه اعلام شد.";return d;}
 $("brtCraneSaveGeometry").addEventListener("click",()=>{try{saveCraneLayout();}catch(e){craneGeometryStatus.textContent="ثبت هندسه انجام نشد: "+String(e.message||e);}});
 craneNode.addEventListener("change",loadCraneLayout);
 $("brtCraneRefresh").addEventListener("click",()=>{const ok=refreshCraneChoices();craneSummary.textContent=ok?"موقعیت‌ها و پایه‌های واقعی از جاروب جرثقیل بارگذاری شدند.":"جاروب کامل موفق پیدا نشد؛ ابتدا جاروب جرثقیل را اجرا و دوباره بارگذاری کنید.";});
 function refreshCraneChoices(){
  const envelope=root.SteelCrane3DLoadTransfer?.getLastAutomaticEnvelope?.(),trace=envelope?.demandTraceAudit;
  const model=root.SteelStructuralModel?.build?.()||root.SteelStructuralModel?.model;
  const audit=root.SteelFoundationReactionBridge?.auditCraneDemandTrace?.(trace,model);
  craneNode.replaceChildren();craneCase.replaceChildren();
  if(!audit?.ok){craneNode.add(new Option("جاروب کامل/ممیزی موفق موجود نیست",""));craneCase.add(new Option("موقعیت موجود نیست",""));return false;}
  [...new Set(audit.demands.map(d=>d.nodeId))].forEach(id=>craneNode.add(new Option(id,id)));
  audit.cases.forEach(c=>craneCase.add(new Option(c.label,c.label)));
  loadCraneLayout();
  return true;
 }
 craneRun.addEventListener("click",()=>{
  try{
   const envelope=root.SteelCrane3DLoadTransfer?.getLastAutomaticEnvelope?.(),trace=envelope?.demandTraceAudit;
   const model=root.SteelStructuralModel?.build?.()||root.SteelStructuralModel?.model;
   const audit=root.SteelFoundationReactionBridge?.auditCraneDemandTrace?.(trace,model);
   if(!audit?.ok)throw Error(audit?.issues?.join("؛ ")||"ابتدا جاروب کامل جرثقیل را اجرا کنید.");
   const nodeId=craneNode.value,caseId=craneCase.value;
   const demand=audit.demands.find(d=>d.nodeId===nodeId&&d.caseId===caseId);
   if(!demand)throw Error("تقاضای مستقل این پایه/موقعیت در ردیابی جرثقیل یافت نشد.");
   const v=demand.columnActionN_Nm,selection={row:{nodeId},case:{label:caseId},mapped:{Vx_kN:v[0]/1000,N_tensionPositive_kN:v[1]/1000,Vz_kN:v[2]/1000,Mx_kNm:v[3]/1000,Ty_kNm:v[4]/1000,Mz_kNm:v[5]/1000}};
   const layout=craneAnchorGroups[nodeId];
   if(!layout)throw Error("برای این گره پایه هندسه مستقل انکر ثبت نشده است؛ ابتدا ردیف/ستون، فاصله محورها و تأییدهای همان پایه را ثبت کنید.");
   lastCrane=calculateSelected(selection,layout);
   if(!lastCrane.ok)throw Error(lastCrane.issues.join("؛ "));
   lastCrane.cranePosition={caseId,caseIndex:demand.caseIndex,referencePosition_m:demand.referencePosition_m};
   last=lastCrane;
   const f=x=>(x/1000).toLocaleString("fa-IR",{maximumFractionDigits:4});
   craneSummary.textContent="گره "+nodeId+" | "+caseId+" | موقعیت قطار: "+demand.referencePosition_m+" m | تعداد انکر: "+lastCrane.anchors.length+" | بیشینه کشش: "+f(Math.max(...lastCrane.anchors.map(a=>a.tensionDemand_N)))+" kN | بیشینه برش: "+f(Math.max(...lastCrane.anchors.map(a=>a.resultantShear_N)))+" kN | تعادل: "+(lastCrane.equilibrium.ok?"برقرار":"نامعتبر")+". فقط تقاضا؛ نه ظرفیت‌سنجی یا تأیید طراحی.";
   const body=$("brtAnchorDemandRows");body.replaceChildren();
   lastCrane.anchors.forEach(a=>{const tr=root.document.createElement("tr");[a.anchorId,a.x_m,a.z_m,f(a.tensionDemand_N),f(a.compressionDemand_N),f(a.totalShearX_N),f(a.totalShearZ_N),f(a.resultantShear_N)].forEach(x=>{const td=root.document.createElement("td");td.textContent=String(x);tr.appendChild(td);});body.appendChild(tr);});
   craneJson.disabled=false;
  }catch(e){lastCrane=null;craneSummary.textContent="انتقال/محاسبه متوقف شد: "+String(e.message||e);craneJson.disabled=true;}
 });
 craneJson.addEventListener("click",()=>{if(!lastCrane)return;const blob=new Blob([JSON.stringify({schema:"SAHROUD-STEEL-CRANE-ANCHOR-DEMAND-1.0",generatedAt:new Date().toISOString(),analysisEnabled:false,designApproved:false,result:lastCrane},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Crane-Anchor-Demand.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $("brtAnchorDemandRun").addEventListener("click",()=>{
  try{
   const selection=root.SteelBaseReactionTransfer?.selected?.();
   const layout=root.SteelAnchorDemandScreen?.getData?.();
   last=calculateSelected(selection,layout);
   if(!last.ok)throw Error(last.issues.join("؛ "));
   const f=v=>(v/1000).toLocaleString("fa-IR",{maximumFractionDigits:4});
   $("brtAnchorDemandSummary").textContent="گره "+last.nodeId+" | حالت "+last.caseId+" | تعداد انکر: "+last.anchors.length+" | باقیمانده تعادل محوری: "+f(last.equilibrium.axialResidual_N)+" kN | Mx: "+f(last.equilibrium.momentXResidual_Nm)+" kN.m | Mz: "+f(last.equilibrium.momentZResidual_Nm)+" kN.m | برش X/Z: "+f(last.equilibrium.shearXResidual_N)+" / "+f(last.equilibrium.shearZResidual_N)+" kN | پیچش: "+f(last.equilibrium.torsionResidual_Nm)+" kN.m. این خروجی فقط تقاضای توزیع‌شده است.";
   const body=$("brtAnchorDemandRows");body.replaceChildren();
   last.anchors.forEach(a=>{const tr=root.document.createElement("tr");[a.anchorId,a.x_m,a.z_m,f(a.tensionDemand_N),f(a.compressionDemand_N),f(a.totalShearX_N),f(a.totalShearZ_N),f(a.resultantShear_N)].forEach(v=>{const td=root.document.createElement("td");td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});
   $("brtAnchorDemandJson").disabled=false;
  }catch(e){last=null;$("brtAnchorDemandSummary").textContent="محاسبه متوقف شد: "+String(e.message||e);$("brtAnchorDemandJson").disabled=true;$("brtAnchorDemandRows").replaceChildren();}
 });
 $("brtAnchorSteelRun").addEventListener("click",()=>{
  try{
   if(!last?.ok)throw Error("ابتدا تقاضای معتبر انکر را محاسبه کنید.");
   const api=root.SteelAnchorSteelGroupAudit;if(!api?.compare)throw Error("ماژول غربال مقاومت فولادی انکر بارگذاری نشده است.");
   const result=api.compare(last,{Ase_mm2:Number($("brtAsAse").value),Fnt_MPa:Number($("brtAsFnt").value),Fnv_MPa:Number($("brtAsFnv").value),phiT:Number($("brtAsPhiT").value),phiV:Number($("brtAsPhiV").value)});
   $("brtAnchorSteelSummary").textContent="غربال فولادی جداگانه: "+(result.allSeparateChecksPass?"تمام نسبت‌های مستقل کشش و برش حداکثر ۱ هستند":"حداقل یک نسبت مستقل کشش یا برش از ۱ بیشتر است")+" | بیشینه نسبت کشش: "+result.governingTensionRatio.toLocaleString("fa-IR",{maximumFractionDigits:4})+" | بیشینه نسبت برش: "+result.governingShearRatio.toLocaleString("fa-IR",{maximumFractionDigits:4})+". این نتیجه اندرکنش یا مهار بتن را تأیید نمی‌کند.";
   const body=$("brtAnchorSteelRows");body.replaceChildren();
   result.rows.forEach(a=>{const tr=root.document.createElement("tr");[a.anchorId+" / "+a.caseId,a.tensionRatio.toFixed(4),a.shearRatio.toFixed(4),a.tensionDesignCapacity_kN.toFixed(3),a.shearDesignCapacity_kN.toFixed(3),(a.tensionPass&&a.shearPass)?"قبول جداگانه":"نیازمند بررسی"].forEach(v=>{const td=root.document.createElement("td");td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});
  }catch(e){$("brtAnchorSteelSummary").textContent="غربال متوقف شد: "+String(e.message||e);$("brtAnchorSteelRows").replaceChildren();}
 });
 $("brtAnchorDemandJson").addEventListener("click",()=>{if(!last)return;const blob=new Blob([JSON.stringify(last,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-Anchor-Demand-"+last.nodeId+"-"+last.caseId+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
function selfTest(){
 const checks=[],ck=(name,fn)=>{try{checks.push({name,ok:fn()===true});}catch(e){checks.push({name,ok:false,error:String(e.message||e)});}};
 ck("builds centered rectangular anchor coordinates in metres",()=>{const a=buildAnchors({rows:2,cols:2,pitchX:200,pitchZ:100});return a.length===4&&a[0].x_m===-.1&&a[0].z_m===-.05&&a[3].x_m===.1&&a[3].z_m===.05;});
 ck("rejects noninteger anchor row count",()=>{try{buildAnchors({rows:1.5,cols:2,pitchX:100,pitchZ:100});return false;}catch(e){return true;}});
 ck("rejects missing active-axis spacing",()=>{try{buildAnchors({rows:2,cols:2,pitchX:100,pitchZ:0});return false;}catch(e){return true;}});
 const selection={row:{nodeId:"B1"},case:{label:"ULS-1"},mapped:{N_tensionPositive_kN:4,Vx_kN:1,Vz_kN:2,Mx_kNm:0,Ty_kNm:0,Mz_kNm:0}};
 ck("requires sign confirmation",()=>{try{calculateSelected(selection,{rows:2,cols:2,pitchX:100,pitchZ:100,geometryConfirmed:true});return false;}catch(e){return e.message.includes("علامت");}});
 ck("requires as-built geometry confirmation",()=>{try{calculateSelected(selection,{rows:2,cols:2,pitchX:100,pitchZ:100,signConfirmed:true});return false;}catch(e){return e.message.includes("هندسه");}});
 ck("keeps independent anchor layouts for different physical base nodes",()=>{const x=normalizeCraneAnchorGroups({B1:{rows:2,cols:2,pitchX:160,pitchZ:160,signConfirmed:true,geometryConfirmed:true},B2:{rows:3,cols:2,pitchX:220,pitchZ:180,signConfirmed:true,geometryConfirmed:true}});return x.B1.pitchX===160&&x.B2.rows===3&&Object.keys(x).length===2;});
 ck("rejects unconfirmed or invalid persisted anchor geometry",()=>{const x=normalizeCraneAnchorGroups({B1:{rows:2,cols:2,pitchX:160,pitchZ:160,signConfirmed:true,geometryConfirmed:false},B2:{rows:1,cols:1,pitchX:0,pitchZ:0,signConfirmed:true,geometryConfirmed:true}});return Object.keys(x).length===0;});
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
function normalizeCraneAnchorGroups(data){const clean={};if(data&&typeof data==="object"&&!Array.isArray(data))Object.entries(data).forEach(([id,d])=>{const rows=Number(d?.rows),cols=Number(d?.cols),pitchX=Number(d?.pitchX),pitchZ=Number(d?.pitchZ);if(id&&Number.isInteger(rows)&&Number.isInteger(cols)&&rows>=1&&cols>=1&&rows<=8&&cols<=8&&rows*cols>=2&&Number.isFinite(pitchX)&&Number.isFinite(pitchZ)&&(cols===1||pitchX>0)&&(rows===1||pitchZ>0)&&d.signConfirmed===true&&d.geometryConfirmed===true)clean[id]={rows,cols,pitchX,pitchZ,signConfirmed:true,geometryConfirmed:true};});return clean;}
function getData(){return JSON.parse(JSON.stringify(craneAnchorGroups));}
function setData(data){craneAnchorGroups=normalizeCraneAnchorGroups(data);}
root.SteelAnchorCaseDemandUI={buildAnchors,calculateSelected,refreshCraneChoices,getData,setData,selfTest,mount};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
