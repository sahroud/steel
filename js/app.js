(function(){
  const $=id=>document.getElementById(id);
  function status(t){$("status").textContent=t;}
  function current(){return SahroudProject.read();}
  $("saveProject").addEventListener("click",()=>{
    const p=current(),errors=SahroudProject.validate(p);
    if(errors.length){status("خطا: "+errors.join(" | "));return;}
    const blob=new Blob([JSON.stringify(p,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="SAHROUD_STEEL_Project.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);status("فایل JSON پروژه آماده دانلود شد.");
  });
  $("drawPreview").addEventListener("click",()=>{
    const p=current(),errors=SahroudProject.validate(p);
    if(errors.length){status("خطا: "+errors.join(" | "));return;}
    SahroudDrawing.render(p,$("drawing"));status("پیش‌نمایش شماتیک ساخته شد؛ این نقشه اجرایی نیست.");
  });
  window.addEventListener("DOMContentLoaded",()=>SahroudDrawing.render(current(),$("drawing")));
})();