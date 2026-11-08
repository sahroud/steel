/* مدیریت داده پروژه؛ بدون محاسبات سازه‌ای */
(function(){
  const ids=["projectName","owner","designer","inspector","city","codeVersion","span","length","spacing","height","ridge"];
  window.SahroudProject={
    read:function(){
      const p={schemaVersion:"0.1",savedAt:new Date().toISOString(),inputs:{}};
      ids.forEach(id=>{const el=document.getElementById(id);if(el)p.inputs[id]=el.value;});
      ["span","length","spacing","height","ridge"].forEach(k=>p.inputs[k]=Number(p.inputs[k]));
      return p;
    },
    validate:function(p){
      const g=p.inputs, errors=[];
      ["span","length","spacing","height","ridge"].forEach(k=>{if(!(Number(g[k])>0))errors.push(k+" باید بزرگتر از صفر باشد");});
      if(Number(g.ridge)<Number(g.height))errors.push("ارتفاع تاج نباید از ارتفاع ستون کمتر باشد");
      if(Number(g.length)<Number(g.spacing))errors.push("طول پروژه از فاصله قاب‌ها کمتر است");
      return errors;
    }
  };
})();