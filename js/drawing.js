/* پیش‌نمایش شماتیک؛ نقشه اجرایی محسوب نمی‌شود */
(function(){
  window.SahroudDrawing={
    render:function(p,target){
      const g=p.inputs,L=Number(g.span),H=Number(g.height),R=Number(g.ridge);
      const w=620,h=260,base=220,left=70,right=550,scale=145/Math.max(R,1);
      const yBase=base,yEave=base-H*scale,yRidge=base-R*scale,mid=(left+right)/2;
      target.innerHTML=`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="پیش نمایش قاب">
      <rect x="8" y="8" width="604" height="244" fill="white" stroke="#9ab1c0"/>
      <line x1="35" y1="${yBase}" x2="585" y2="${yBase}" stroke="#64748b" stroke-width="2"/>
      <path d="M ${left} ${yBase} L ${left} ${yEave} L ${mid} ${yRidge} L ${right} ${yEave} L ${right} ${yBase}" fill="none" stroke="#0879b9" stroke-width="6"/>
      <line x1="${left}" y1="${yBase+15}" x2="${right}" y2="${yBase+15}" stroke="#334155"/>
      <text x="${mid}" y="${yBase+32}" text-anchor="middle" font-size="12" fill="#123b52">دهانه ${L} m | پیش‌نمایش شماتیک - غیر اجرایی</text>
      </svg>`;
    }
  };
})();