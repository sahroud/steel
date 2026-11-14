/* SAHROUD STEEL — UI bridge for selected foundation reaction to anchor-group demands.
 * Requires explicit confirmation of sign convention and as-built anchor geometry.
 */
(function(root){"use strict";
const $=id=>root.document?.getElementById(id);
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
 const box=root.document.createElement("section");box.className="panel";box.id="brtAnchorDemandPanel";
 box.innerHTML='<div class="panel-title"><h3>توزیع واکنش انتخابی بین تک‌تک انکرها</h3><span class="status">تقاضا؛ بدون تأیید ظرفیت</span></div><div class="notice">پس از استخراج واکنش‌ها، یک گره پایه و یک حالت بار را انتخاب کنید. آرایش و گام بولت‌ها از پنل گروه بولت خوانده می‌شود؛ پیش از محاسبه باید هم قرارداد علامت و هم تطبیق هندسه با نقشه اجرایی را تأیید کرده باشید. هر حالت بار جداگانه محاسبه می‌شود.</div><div class="button-grid"><button id="brtAnchorDemandRun" class="btn primary" type="button">محاسبه تقاضای انکرهای این حالت</button><button id="brtAnchorDemandJson" class="btn secondary" type="button" disabled>گزارش JSON تقاضای انکر</button></div><div id="brtAnchorDemandSummary" class="notice">هنوز تقاضای انکر برای حالت انتخابی محاسبه نشده است.</div><div style="overflow-x:auto"><table class="data-table" style="width:100%;min-width:760px"><thead><tr><th>انکر</th><th>X (m)</th><th>Z (m)</th><th>کشش (kN)</th><th>فشار محوری (kN)</th><th>برش X (kN)</th><th>برش Z (kN)</th><th>برش برآیند (kN)</th></tr></thead><tbody id="brtAnchorDemandRows"></tbody></table></div>';
 panel.insertAdjacentElement("afterend",box);
 let last=null;
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
 return{passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,total:checks.length,checks};
}
root.SteelAnchorCaseDemandUI={buildAnchors,calculateSelected,selfTest,mount};
if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount);else mount();}
})(typeof window!=="undefined"?window:globalThis);
