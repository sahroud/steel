/* SAHROUD STEEL — user-confirmed combination proposal UI.
 * Reads existing evidence and a completed demand package; never runs automatically.
 * Results stay in memory and remain non-approving.
 */
(function(root){
"use strict";
let lastProposal=null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const ASSUMPTIONS=[
 ["sameModelRevision","نسخه مدل در تمام حالت‌ها یکسان است"],
 ["sameGeometry","هندسه و تقسیم‌بندی اعضا یکسان است"],
 ["sameSupports","تکیه‌گاه‌ها و قیود یکسان‌اند"],
 ["sameStiffnessModel","مدل سختی و خواص اعضا یکسان‌اند"],
 ["linearElasticFirstOrder","تحلیل خطی الاستیک مرتبه اول معتبر است"]
];
function readInputs(){
 const demand=root.SteelMemberDesignDemandPackage?.getLast?.()||null;
 const workbench=root.SteelLoadCaseWorkbench?.read?.()||null;
 const audit=workbench?root.SteelLoadCaseWorkbench?.audit?.(workbench):null;
 const loadCases=(workbench?.loadCases||[]).map(c=>({id:c.id,category:c.category}));
 return {demand,workbench,audit,combinationSet:{loadCases,combinations:clone(workbench?.combinations||[])}};
}
function panelHTML(){
 return `<section class="panel" id="memberDemandCombinationPanel">
 <div class="panel-title"><h3>پیشنهاد ترکیب تقاضای اعضا</h3><span class="status">اجرای دستی؛ بدون تأیید طراحی</span></div>
 <div class="notice">این بخش فقط بسته تقاضای ایستگاهیِ از قبل ساخته‌شده را با ضرایب صریح دفترچه شواهد ترکیب می‌کند. هیچ تحلیل جدیدی اجرا نمی‌شود و هیچ ضریب آیین‌نامه‌ای تولید نمی‌شود. پنج فرض زیر باید توسط مهندس مسئول بررسی و صریحاً تأیید شوند؛ این تأییدها خودکار راستی‌آزمایی نمی‌شوند.</div>
 <div id="mdcb_readiness" class="notice">برای مشاهده وضعیت، دکمه بازخوانی را بزنید.</div>
 <h4>فرض‌های لازم برای جمع خطی</h4>
 <div id="mdcb_assumptions" class="form-grid">${ASSUMPTIONS.map(([k,label])=>`<label class="field"><input type="checkbox" id="mdcb_${k}"> ${esc(label)}</label>`).join("")}</div>
 <div class="button-grid"><button class="btn secondary" type="button" id="mdcb_refresh">بازخوانی بسته و دفترچه</button><button class="btn primary" type="button" id="mdcb_build">ساخت پیشنهاد ترکیب</button><button class="btn secondary" type="button" id="mdcb_export">دریافت JSON پیشنهاد</button></div>
 <div id="mdcb_result" class="notice">هنوز پیشنهادی ساخته نشده است.</div>
 <div id="mdcb_details"></div>
 </section>`;
}
function readiness(){
 const x=readInputs(),d=x.demand,w=x.workbench;
 const ready=!!(d?.success===true&&x.audit?.success===true&&x.combinationSet.loadCases.length&&x.combinationSet.combinations.length);
 return {ready,demandStatus:d?(d.success?"بسته تقاضا کامل":"بسته تقاضا ناقص"):"بسته تقاضا ساخته نشده",memberCount:d?.members?.length||0,caseCount:d?.caseIds?.length||0,loadCaseCount:x.combinationSet.loadCases.length,combinationCount:x.combinationSet.combinations.length,evidenceAudit:x.audit?.success===true,issues:[...(d?.issues||[]),...(x.audit?.issues||[])],workbenchAvailable:!!w};
}
function renderReadiness(){
 const host=$("mdcb_readiness");if(!host)return;
 const r=readiness();
 host.innerHTML="<b>وضعیت پیش‌نیازها:</b> "+(r.ready?"آماده ساخت پیشنهاد":"پیش‌نیازها کامل نیستند")+
 "<br>"+esc(r.demandStatus)+"؛ اعضا: "+r.memberCount+"؛ حالت‌های تقاضا: "+r.caseCount+
 "<br>حالت‌های ثبت‌شده در دفترچه: "+r.loadCaseCount+"؛ ترکیب‌ها: "+r.combinationCount+
 "<br>ممیزی دفترچه: "+(r.evidenceAudit?"موفق":"ناموفق/در دسترس نیست")+
 (r.issues.length?"<br>"+esc(r.issues.join(" | ")):"");
 return r;
}
function selectedAssumptions(){
 const out={};ASSUMPTIONS.forEach(([k])=>{out[k]=!!$("mdcb_"+k)?.checked;});return out;
}
function renderProposal(result){
 const host=$("mdcb_result"),details=$("mdcb_details");if(!host||!details)return;
 if(!result){host.textContent="هنوز پیشنهادی ساخته نشده است.";details.innerHTML="";return;}
 host.innerHTML="<b>"+(result.success?"پیشنهاد با موفقیت ساخته شد":"ساخت پیشنهاد متوقف شد")+"</b><br>ترکیب‌ها: "+result.proposals.length+
 "<br>تأیید طراحی: خیر؛ محاسبه ظرفیت: خیر؛ آماده طراحی آیین‌نامه‌ای: خیر"+
 (result.issues.length?"<br>"+esc(result.issues.join(" | ")):"");
 details.innerHTML="<h4>جزئیات کامل پیشنهاد و ردیابی</h4><pre style='white-space:pre-wrap;overflow-wrap:anywhere;max-height:480px;overflow:auto'>"+esc(JSON.stringify(result,null,2))+"</pre>";
}
function build(){
 const x=readInputs(),r=renderReadiness();
 if(!r.ready){lastProposal=null;lastProposal={success:false,proposals:[],issues:["بسته تقاضا و ممیزی دفترچه باید هر دو موفق باشند."],designApproved:false};renderProposal(lastProposal);return clone(lastProposal);}
 const assumptions=selectedAssumptions();
 if(ASSUMPTIONS.some(([k])=>assumptions[k]!==true)){
  lastProposal={success:false,proposals:[],issues:["هر پنج فرض باید بررسی و صریحاً علامت‌گذاری شوند."],designApproved:false};renderProposal(lastProposal);return clone(lastProposal);
 }
 const engine=root.SteelMemberDemandCombinationBridge?.build;
 if(typeof engine!=="function"){lastProposal={success:false,proposals:[],issues:["موتور پیشنهاد ترکیب بار بارگذاری نشده است."],designApproved:false};renderProposal(lastProposal);return clone(lastProposal);}
 try{lastProposal=engine(x.demand,x.combinationSet,assumptions);}
 catch(e){lastProposal={success:false,proposals:[],issues:[String(e?.message||e)],designApproved:false};}
 renderProposal(lastProposal);
 return clone(lastProposal);
}
function exportProposal(){
 if(!lastProposal){renderProposal({success:false,proposals:[],issues:["ابتدا یک پیشنهاد موفق بسازید."],designApproved:false});return;}
 const blob=new Blob([JSON.stringify(lastProposal,null,2)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SAHROUD-STEEL-member-demand-combination-proposal.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 if($("memberDemandCombinationPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const footer=main.querySelector("footer");
 const wrap=document.createElement("div");wrap.innerHTML=panelHTML();
 const panel=wrap.firstElementChild;
 const scope=$("memberDesignScopeGatePanel");
 if(scope)scope.insertAdjacentElement("beforebegin",panel);else if(footer)footer.insertAdjacentElement("beforebegin",panel);else main.appendChild(panel);
 $("mdcb_refresh").addEventListener("click",renderReadiness);
 $("mdcb_build").addEventListener("click",build);
 $("mdcb_export").addEventListener("click",exportProposal);
 renderReadiness();
}
root.SteelMemberDemandCombinationUI={readiness,selectedAssumptions,build,exportProposal,renderReadiness,init,getLast:()=>lastProposal?clone(lastProposal):null};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
