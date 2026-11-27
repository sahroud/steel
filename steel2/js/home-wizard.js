/* Progressive first-page experience for SAHROUD STEEL.
   Keeps the existing engineering panels and element IDs intact. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const main=document.querySelector("main.container");
 if(!main||main.dataset.progressiveHomeReady==="1")return;
 main.dataset.progressiveHomeReady="1";
 const oldWelcome=main.querySelector(".sahroud-home");
 const quick=main.querySelector(".quick-actions");
 const panels=Array.from(main.children).filter(el=>el.classList&&el.classList.contains("panel"));
 if(!panels.length)return;

 // Replace the old introduction with a clean project-oriented landing header.
 if(oldWelcome){
  oldWelcome.innerHTML='<div class="home-kicker">SAHROUD STEEL · میزکار مهندسی</div><h2>طراحی و بررسی سوله</h2><p>اطلاعات را مرحله‌به‌مرحله وارد کنید. هر بخش تخصصی فقط در زمان نیاز باز می‌شود؛ داده‌های نامشخص بدون تأیید شما فرض نمی‌شوند.</p><div class="home-project-facts"><span id="homeFactProject">سوله صنعتی</span><span id="homeFactPlace">شاهرود</span><span id="homeFactSize">۱۲ × ۳۶ متر</span><span>پیش‌فرض قابل ویرایش</span></div>';
 }
 if(quick)quick.classList.add("home-quick-toolbar");

 const stageDefs=[
  {title:"مشخصات اولیه پروژه",desc:"نام پروژه، محل اجرا و ابعاد اصلی را بررسی یا اصلاح کنید.",match:t=>/مشخصات پروژه|مشخصات هندسی/.test(t)},
  {title:"شرایط سازه و بارگذاری",desc:"نوع تکیه‌گاه و بارهای پروژه را فقط با اطلاعات معتبر تعیین کنید.",match:t=>/تکیه|بارگذاری|اقلیم|بار باد|برف/.test(t)},
  {title:"مشاهده مدل و هندسه",desc:"پس از تکمیل ورودی‌ها، قاب و هندسه را بازبینی کنید.",match:t=>/نمایش قاب|مدل سه|ترسیم/.test(t)},
  {title:"اجرای تحلیل",desc:"ابزارهای تحلیل و اجرای خودکار در این مرحله در دسترس هستند.",match:t=>/عملیات پروژه|اجرای خودکار/.test(t)},
  {title:"نتایج و گزارش تحلیل",desc:"نتایج محاسبات انجام‌شده و هشدارهای مدل را بررسی کنید.",match:t=>/نتایج تحلیل/.test(t)},
  {title:"کنترل‌های تخصصی و تکمیلی",desc:"فونداسیون، خاک، اتصالات و کنترل‌های تکمیلی را در صورت نیاز باز کنید.",match:()=>false}
 ];
 const stages=stageDefs.map((d,i)=>({ ...d,panels:[] }));
 const used=new Set();
 panels.forEach(panel=>{
  const title=(panel.querySelector(".panel-title h3, h3, h2")?.textContent||"").replace(/s+/g," ").trim();
  let index=stageDefs.findIndex((d,i)=>i<5&&d.match(title));
  if(index<0)index=5;
  // Keep automatic workflow in the analysis stage even though it is an earlier panel.
  if(panel.id==="steelAutoWorkflowPanel")index=3;
  stages[index].panels.push(panel);used.add(panel);
 });
 // Any remaining direct engineering panels stay available in the last stage.
 panels.filter(p=>!used.has(p)).forEach(p=>stages[5].panels.push(p));

 const shell=document.createElement("section");
 shell.className="wizard-shell";
 shell.id="projectWizard";
 shell.innerHTML='<div class="wizard-top"><div><h2>مراحل آماده‌سازی و طراحی</h2><p>با «ادامه مرحله» فقط به گام بعدی بروید؛ هر زمان خواستید می‌توانید به مرحله قبل بازگردید.</p></div><span class="wizard-count" id="wizardCount">مرحله ۱ از ۶</span></div><nav class="wizard-track" id="wizardTrack" aria-label="مراحل پروژه"></nav><div class="wizard-progress"><span id="wizardProgress"></span></div><div id="wizardStageHeading"></div><div class="wizard-stage-panels" id="wizardStagePanels"></div><div class="wizard-nav"><button type="button" class="wizard-prev" id="wizardPrev">مرحله قبل</button><button type="button" class="wizard-next" id="wizardNext">ادامه مرحله</button></div><p class="wizard-help">توجه: باز شدن یک مرحله به معنی تأیید داده‌ها یا تأیید طراحی نیست. مقادیر آیین‌نامه‌ای و اطلاعات ژئوتکنیک باید با مرجع معتبر کنترل شوند.</p>';
 if(oldWelcome){oldWelcome.insertAdjacentElement("afterend",quick||shell);if(quick)quick.insertAdjacentElement("afterend",shell);}
 else main.insertBefore(shell,quick||main.firstChild);

 const track=$("wizardTrack"),container=$("wizardStagePanels");
 stages.forEach((stage,i)=>{
  const tab=document.createElement("button");tab.type="button";tab.dataset.stage=String(i);
  tab.innerHTML='<span class="wizard-n">'+(i+1)+'</span><span>'+stage.title+'</span>';
  tab.addEventListener("click",()=>go(i));track.appendChild(tab);
  stage.panels.forEach(panel=>{panel.classList.add("wizard-managed-panel");panel.hidden=true;container.appendChild(panel);});
 });
 let current=0;
 const descriptions=[
  "گام اول، مشخصات پایه‌ای که برای ساخت مدل لازم است.",
  "گام دوم، شرایط مرزی و بارهای وارد بر سازه؛ مقادیر نامطمئن را وارد نکنید.",
  "گام سوم، بازبینی شکل قاب و مدل هندسی.",
  "گام چهارم، اجرای محاسبات پس از تکمیل ورودی‌های لازم.",
  "گام پنجم، مشاهده خروجی‌ها و تشخیص موارد ناقص.",
  "گام ششم، ابزارهای تخصصی؛ فقط کنترل‌هایی را باز کنید که اطلاعات کافی برای آن دارید."
 ];
 function go(index){
  current=Math.max(0,Math.min(stages.length-1,index));
  stages.forEach((stage,i)=>stage.panels.forEach(p=>p.hidden=i!==current));
  Array.from(track.children).forEach((b,i)=>{
   b.setAttribute("aria-current",i===current?"step":"false");
   b.classList.toggle("done",i<current);
  });
  $("wizardCount").textContent="مرحله "+(current+1)+" از "+stages.length;
  $("wizardProgress").style.width=((current+1)/stages.length*100)+"%";
  $("wizardStageHeading").innerHTML='<div class="wizard-stage-title"><span class="stage-mark">'+(current+1)+'</span>'+stages[current].title+'</div><p class="wizard-stage-description">'+descriptions[current]+'</p>';
  $("wizardPrev").disabled=current===0;
  $("wizardPrev").style.visibility=current===0?"hidden":"visible";
  $("wizardNext").textContent=current===stages.length-1?"بازگشت به ابتدای مراحل":"ادامه مرحله";
  $("wizardNext").classList.toggle("wizard-finish",current===stages.length-1);
  if(current===stages.length-1)$("wizardNext").classList.remove("wizard-next");
  else $("wizardNext").classList.add("wizard-next");
  const first=stages[current].panels[0];
  if(first&&current>0)first.scrollIntoView({behavior:"smooth",block:"start"});
  updateFacts();
 }
 $("wizardPrev").addEventListener("click",()=>go(current-1));
 $("wizardNext").addEventListener("click",()=>go(current===stages.length-1?0:current+1));
 function updateFacts(){
  const project=$("projectName")?.value||"سوله صنعتی";
  const city=$("city");
  const cityText=city?.selectedOptions?.[0]?.textContent||"شاهرود";
  const span=$("span")?.value||"۱۲",length=$("length")?.value||"۳۶";
  if($("homeFactProject"))$("homeFactProject").textContent=project;
  if($("homeFactPlace"))$("homeFactPlace").textContent=cityText;
  if($("homeFactSize"))$("homeFactSize").textContent=span+" × "+length+" متر";
 }
 ["projectName","city","span","length"].forEach(id=>$(id)?.addEventListener("input",updateFacts));
 ["projectName","city","span","length"].forEach(id=>$(id)?.addEventListener("change",updateFacts));
 go(0);updateFacts();
 // Restore all original panels if a browser extension or script asks for a full print view.
 window.SAHROUD_STEEL_WIZARD={go,showAll:function(){stages.forEach(s=>s.panels.forEach(p=>p.hidden=false));}};
})();