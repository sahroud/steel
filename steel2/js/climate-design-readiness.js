/* SAHROUD STEEL — climate and load-basis evidence gate.
 * Default project city is Shahrud, but city defaults never certify climate values.
 * This audit intentionally produces readiness only, never loads or design approval.
 */
(function(root){
"use strict";
const finite=v=>v!==""&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
function audit(data){
 const loads=data||root.SteelLoads?.getData?.()||{};
 const c=loads.climate||{};
 const issues=[],missing=[];
 const add=(key,label,ok)=>{if(!ok){missing.push(key);issues.push(label);}};
 add("city","شهر/محل پروژه مشخص نیست.",!!String(c.city||"").trim()&&!!String(c.customCity||"").trim());
 add("wind-speed","سرعت مبنای باد معتبر وارد نشده است.",finite(c.basicWind)&&Number(c.basicWind)>0);
 add("ground-snow","بار برف مبنای زمین معتبر وارد نشده است.",finite(c.groundSnow)&&Number(c.groundSnow)>=0);
 add("elevation","ارتفاع واقعی محل پروژه از منبع معتبر ثبت نشده است.",finite(c.elevation)&&Number(c.elevation)>=0);
 add("source-document","شناسه سند و بند/جدول منبع اقلیمی ثبت نشده است.",!!String(c.sourceDocument||"").trim()&&!!String(c.sourceClause||"").trim());
 add("source-verification","تأیید مستند داده اقلیمی ثبت نشده است.",c.sourceVerified===true);
 add("site-elevation-source","منبع ارتفاع محل (نقشه‌برداری/مدل ارتفاعی معتبر) ثبت نشده است.",!!String(c.elevationSource||"").trim());
 const requiredLoads=["deadLeft","deadRight","liveLeft","liveRight","snowLeft","snowRight","windLeft","windRight","windWall","windEndFront","windEndBack"];
 requiredLoads.forEach(k=>add("load:"+k,"ورودی بار "+k+" صریح و عددی نیست.",finite(loads[k])));
 const code=root.SteelDesignCodeRegistry?.getData?.()||root.SteelDesignCodeRegistry?.get?.()||{};
 const codeText=JSON.stringify(code);
 const hasLoadCode=/مبحث ششم|Mabhas.?6|NB.?RI.?6/i.test(codeText);
 add("load-code-edition","ویرایش مبحث ششم در پیکربندی فعال پروژه به‌طور صریح ثبت نشده است.",hasLoadCode);
 const status=missing.length?"blocked":"evidence-complete-review-required";
 return {
  status,ready:missing.length===0,designApproved:false,analysisEnabled:false,
  city:c.customCity||c.city||null,missing,issues,
  climate:{basicWind:finite(c.basicWind)?Number(c.basicWind):null,groundSnow:finite(c.groundSnow)?Number(c.groundSnow):null,elevation:finite(c.elevation)?Number(c.elevation):null,sourceVerified:c.sourceVerified===true},
  loadInputsChecked:requiredLoads.length,
  disclaimer:"این ممیزی فقط کامل‌بودن شواهد و ورودی‌ها را بررسی می‌کند؛ بار باد/برف را محاسبه یا ترکیبات بار را تأیید نمی‌کند و مجوز تحلیل یا طراحی اجرایی صادر نمی‌کند."
 };
}
function selfTest(){
 const base={climate:{city:"shahroud",customCity:"شاهرود",basicWind:90,groundSnow:1,elevation:1350,sourceDocument:"Mabhas 6",sourceClause:"Table 6-10-1",sourceVerified:true,elevationSource:"survey"},deadLeft:1,deadRight:1,liveLeft:0,liveRight:0,snowLeft:1,snowRight:1,windLeft:0,windRight:0,windWall:0,windEndFront:0,windEndBack:0};
 const good=audit(base),bad=audit({...base,climate:{...base.climate,groundSnow:"",sourceVerified:false},windLeft:""});
 const tests=[
  ["complete documented inputs reach review-only state",good.ready&&good.status==="evidence-complete-review-required"&&!good.designApproved],
  ["missing snow and wind data are blocked",!bad.ready&&bad.missing.includes("ground-snow")&&bad.missing.includes("load:windLeft")],
  ["unverified source is blocked",bad.missing.includes("source-verification")],
  ["missing source clause is blocked",!audit({...base,climate:{...base.climate,sourceClause:""}}).ready],
  ["missing site elevation source is blocked",!audit({...base,climate:{...base.climate,elevationSource:""}}).ready],
  ["zero wind is accepted only when explicitly numeric",audit({...base,windLeft:0}).missing.every(x=>x!=="load:windLeft")],
  ["negative ground snow is rejected",!audit({...base,climate:{...base.climate,groundSnow:-1}}).ready],
  ["audit never enables analysis or approves design",!good.analysisEnabled&&!good.designApproved&&!bad.analysisEnabled&&!bad.designApproved]
 ];
 return {passed:tests.filter(x=>x[1]).length,failed:tests.filter(x=>!x[1]).length,tests:tests.map(x=>({name:x[0],ok:x[1]}))};
}
function render(){
 const host=document.getElementById("climateDesignReadinessResults");if(!host)return;
 const r=audit();
 host.innerHTML="<h4>ممیزی مستندات اقلیمی و ورودی بار</h4><p><b>شهر پیش‌فرض/انتخابی:</b> "+String(r.city||"ثبت نشده")+"</p><p><b>وضعیت:</b> "+(r.ready?"ورودی‌ها برای بازبینی مهندسی کامل‌اند؛ هنوز تأیید طراحی نیست":"مسدود — "+r.missing.length+" مورد ناقص")+"</p><ul>"+r.issues.map(x=>"<li>"+x+"</li>").join("")+"</ul><div class='notice'>"+r.disclaimer+"</div>";
}
function init(){
 if(document.getElementById("climateDesignReadinessPanel"))return;
 const main=document.querySelector("main");if(!main)return;
 const p=document.createElement("section");p.className="panel";p.id="climateDesignReadinessPanel";
 p.innerHTML="<div class='panel-title'><h3>دروازه شواهد بارهای اقلیمی و ترکیبات بار</h3><span class='status'>عدم تأیید کاذب</span></div><p>شاهرود شهر پیش‌فرض است. اعداد اقلیمی تا ثبت سند، بند/جدول، منبع ارتفاع و تأیید مهندس، مبنای طراحی نهایی محسوب نمی‌شوند.</p><div class='button-grid'><button class='btn secondary' id='btnClimateDesignReadiness' type='button'>ممیزی ورودی‌های اقلیمی</button></div><div id='climateDesignReadinessResults'></div>";
 const anchor=document.getElementById("advancedLoadPanel")||main.querySelector("footer");
 if(anchor)anchor.insertAdjacentElement("afterend",p);else main.appendChild(p);
 document.getElementById("btnClimateDesignReadiness").addEventListener("click",render);
}
root.SteelClimateDesignReadiness={audit,selfTest,render};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})(typeof window!=="undefined"?window:globalThis);
