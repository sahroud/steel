(function(root){"use strict";
function make(o){
 const type=o.type,h=Number(o.h),b1=Number(o.b1),b2=Number(o.b2),t=Number(o.t),lip=Number(o.lip||0);
 if(!["C","Z"].includes(type))throw Error("نوع مقطع باید C یا Z باشد.");
 if(![h,b1,b2,t].every(Number.isFinite)||h<=2*t||b1<=2*t||b2<=2*t||t<=0)throw Error("ابعاد باید مثبت باشند؛ ارتفاع و بال‌ها باید از ضخامت به‌اندازه کافی بزرگ‌تر باشند.");
 if(type==="C"){
  if(!(lip>t&&lip<h/2))throw Error("برای C، طول لبه برگشتی باید بیشتر از ضخامت و کمتر از نصف ارتفاع باشد.");
  return {name:"C"+h+"x"+b1+"x"+t+"-L"+lip,points:[[0,0],[b1,0],[b1,t],[t,t],[t,h-t],[b1,h-t],[b1,h],[0,h],[0,h-lip],[b1-t,h-lip],[b1-t,lip],[0,lip]],note:"مقطع C لبه‌برگشتی‌دار با گوشه‌های تیز؛ شعاع خم و اثر آن منظور نشده است."};
 }
 return {name:"Z"+h+"x"+b1+"x"+b2+"x"+t,points:[[0,0],[b1+t,0],[b1+t,h-t],[b1+t+b2,h-t],[b1+t+b2,h],[b1,h],[b1,t],[0,t]],note:"مقطع Z بدون لبه برگشتی و با گوشه‌های تیز؛ شعاع خم و اثر آن منظور نشده است."};
}
root.SahroudColdFormed={make};
})(window);
