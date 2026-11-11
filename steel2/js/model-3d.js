/* SAHROUD STEEL - Full shed geometry model 1.0 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  let model = null, originalDrawFrame = null;
  function ensurePanel() {
    if ($("shedLayoutPanel")) return;
    const drawingPanel = Array.from(document.querySelectorAll("main .panel")).find(p => p.querySelector("#frameDrawing"));
    if (!drawingPanel) return;
    const panel = document.createElement("section");
    panel.className = "panel"; panel.id = "shedLayoutPanel";
    panel.innerHTML = '<div class="panel-title"><h3>مدل هندسی کامل سوله</h3><span class="status">جانمایی اجزا</span></div>' +
      '<div class="notice">فاصله‌ها و تعداد اعضای فرعی برای تولید مدل هندسی استفاده می‌شوند. مقادیر پیش‌فرض صرفاً برای شروع مدل هستند و باید با نقشه اجرایی تطبیق داده شوند.</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="modelPurlinSpacing">فاصله پرلین‌های سقف (m)</label><input id="modelPurlinSpacing" type="number" min="0.3" step="0.05" value="1.20"></div>' +
      '<div class="field"><label for="modelGirtSpacing">فاصله قیدهای افقی دیوار (m)</label><input id="modelGirtSpacing" type="number" min="0.3" step="0.05" value="1.50"></div>' +
      '<div class="field"><label for="modelEndPostSpacing">فاصله ستونک‌های دیوار انتهایی (m)</label><input id="modelEndPostSpacing" type="number" min="1" step="0.1" value="4.00"></div>' +
      '<div class="field"><label for="modelBraceBays">تعداد دهانه مهاربندی در ابتدا و انتها</label><input id="modelBraceBays" type="number" min="0" step="1" value="1"></div></div>' +
      '<div class="button-grid"><button type="button" id="btnBuildFullModel" class="btn primary">تولید و ترسیم تمام اجزای سوله</button></div>' +
      '<div id="fullModelSummary" class="notice">مدل کامل هنوز تولید نشده است.</div>';
    drawingPanel.parentNode.insertBefore(panel, drawingPanel);
    $("btnBuildFullModel").addEventListener("click", function () { try { build(); draw(); showSummary(); } catch (e) { $("fullModelSummary").textContent = "خطا در تولید مدل: " + e.message; } });
    ["span","length","spacing","height","rise","modelPurlinSpacing","modelGirtSpacing","modelEndPostSpacing","modelBraceBays"].forEach(id => $(id)?.addEventListener("change", function () { try { build(); draw(); showSummary(); } catch (_) {} }));
  }
  function val(id, fallback) { const e=$(id), n=e?Number(e.value):fallback; return Number.isFinite(n)?n:fallback; }
  function addNode(nodes,x,y,z,kind) { const old=nodes.find(n=>Math.abs(n.x-x)<1e-7&&Math.abs(n.y-y)<1e-7&&Math.abs(n.z-z)<1e-7); if(old)return old; const n={id:"N"+(nodes.length+1),x,y,z,kind:kind||"joint"}; nodes.push(n); return n; }
  function addMember(members,a,b,type,sectionKey,extra) {
    members.push({id:type.toUpperCase().replace(/[^A-Z0-9]+/g,"_")+"_"+(members.length+1),start:a.id,end:b.id,type,sectionKey:sectionKey||"unassigned",length:Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),...(extra||{})});
  }
  function build() {
    const span=val("span",20), length=val("length",30), spacing=val("spacing",5), height=val("height",6), rise=val("rise",2);
    const psp=val("modelPurlinSpacing",1.2), gsp=val("modelGirtSpacing",1.5), endsp=val("modelEndPostSpacing",4);
    const braceBays=Math.max(0,Math.floor(val("modelBraceBays",1)));
    if ([span,length,spacing,height,psp,gsp,endsp].some(x=>!(x>0)) || rise<0) throw new Error("ابعاد اصلی و فاصله اعضای فرعی باید مثبت باشند.");
    const frames=[0]; for(let z=spacing;z<length-1e-8;z+=spacing) frames.push(z);
    if(length-frames[frames.length-1]>1e-8) frames.push(length);
    const nodes=[],members=[],frameNodes=[],half=span/2,slope=Math.hypot(half,rise),cs=half/slope,sn=rise/slope,over=0.8;
    const roofY=x=>height+(x<=half?rise*x/half:rise*(span-x)/half);
    frames.forEach((z,fi)=>{
      const bl=addNode(nodes,0,0,z,"base"),el=addNode(nodes,0,height,z,"eave"),r=addNode(nodes,half,height+rise,z,"ridge");
      const er=addNode(nodes,span,height,z,"eave"),br=addNode(nodes,span,0,z,"base");
      const lt=addNode(nodes,-over*cs,height-over*sn,z,"cantilever"),rt=addNode(nodes,span+over*cs,height-over*sn,z,"cantilever");
      addMember(members,bl,el,"ستون قاب","column",{frame:fi+1,axis:"transverse"});
      addMember(members,el,r,"رفتر چپ قاب","rafter",{frame:fi+1,axis:"transverse"});
      addMember(members,r,er,"رفتر راست قاب","rafter",{frame:fi+1,axis:"transverse"});
      addMember(members,er,br,"ستون قاب","column",{frame:fi+1,axis:"transverse"});
      addMember(members,lt,el,"کنسول رفتر چپ","rafter",{frame:fi+1,axis:"transverse"});
      addMember(members,er,rt,"کنسول رفتر راست","rafter",{frame:fi+1,axis:"transverse"});
      frameNodes.push({z,bl,el,r,er,br,lt,rt});
    });
    const roofRows=Math.max(1,Math.ceil(slope/psp));
    [-1,1].forEach(side=>{
      for(let ri=0;ri<=roofRows;ri++){
        const t=ri/roofRows,x=side<0?half*t:half+half*t,y=roofY(x),row=frames.map(z=>addNode(nodes,x,y,z,"roof-secondary"));
        for(let i=0;i<row.length-1;i++) addMember(members,row[i],row[i+1],"پرلین طولی سقف","roofPurlin",{side:side<0?"left":"right",row:ri+1,tributaryWidth:slope/roofRows});
      }
    });
    const girtHeights=[],nGirt=Math.max(0,Math.floor(height/gsp));
    for(let i=1;i<=nGirt;i++) if(i*gsp<height-0.25) girtHeights.push(i*gsp);
    girtHeights.forEach((y,gi)=>[0,span].forEach((x,si)=>{
      const row=frames.map(z=>addNode(nodes,x,y,z,"wall-secondary"));
      for(let i=0;i<row.length-1;i++) addMember(members,row[i],row[i+1],"قید افقی طولی دیوار","wallGirt",{side:si===0?"left":"right",row:gi+1,tributaryHeight:gsp});
    }));
    [0,length].forEach((z,endIndex)=>{
      const count=Math.max(1,Math.ceil(span/endsp)), xs=Array.from({length:count+1},(_,i)=>span*i/count);
      for(let i=1;i<count;i++){
        const x=xs[i],b=addNode(nodes,x,0,z,"endwall-base"),t=addNode(nodes,x,roofY(x),z,"endwall-head");
        addMember(members,b,t,"ستونک میانی دیوار انتهایی","endPost",{end:endIndex===0?"front":"rear"});
      }
      girtHeights.forEach((y,gi)=>{for(let i=0;i<xs.length-1;i++){
        const a=addNode(nodes,xs[i],y,z,"endwall-girt"),b=addNode(nodes,xs[i+1],y,z,"endwall-girt");
        addMember(members,a,b,"تیر افقی دیوار انتهایی","endGirt",{end:endIndex===0?"front":"rear",row:gi+1});
      }});
    });
    const bayCount=frames.length-1,braceSet=new Set();
    for(let i=0;i<Math.min(braceBays,bayCount);i++){braceSet.add(i);braceSet.add(bayCount-1-i);}
    braceSet.forEach(bi=>{
      const f1=frameNodes[bi],f2=frameNodes[bi+1];
      [-1,1].forEach(side=>{
        const x=side<0?0:span,a=addNode(nodes,x,0,f1.z,"brace"),b=addNode(nodes,x,height,f2.z,"brace");
        const c=addNode(nodes,x,height,f1.z,"brace"),d=addNode(nodes,x,0,f2.z,"brace");
        addMember(members,a,b,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
        addMember(members,c,d,"مهاربند ضربدری دیوار","wallBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
      });
      [-1,1].forEach(side=>{
        const x1=side<0?0:half,x2=side<0?half:span,y1=roofY(x1),y2=roofY(x2);
        const a=addNode(nodes,x1,y1,f1.z,"brace"),b=addNode(nodes,x2,y2,f2.z,"brace");
        const c=addNode(nodes,x2,y2,f1.z,"brace"),d=addNode(nodes,x1,y1,f2.z,"brace");
        addMember(members,a,b,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
        addMember(members,c,d,"مهاربند ضربدری سقف","roofBrace",{bay:bi+1,side:side<0?"left":"right",candidate:true});
      });
    });
    model={version:1,geometry:{span,length,spacing,height,rise,frames,roofPurlinSpacing:psp,wallGirtSpacing:gsp,endPostSpacing:endsp,braceBays,roofOverhang:0.8,endOverhang:0.8},nodes,members,generatedAt:new Date().toISOString()};
    return model;
  }
  function draw() {
    if(!model) build(); const svg=$("frameDrawing"); if(!svg)return false;
    const g=model.geometry,W=900,H=480,sx=Math.min(430/(g.span+0.8),300/(g.length+1.6)),sy=Math.min(190/(g.height+g.rise),sx),scale=Math.min(sx,sy);
    const ox=120,oy=330,dx=scale,dz=scale*0.55,dy=scale*0.92,P=n=>({x:ox+n.x*dx+n.z*dz,y:oy-n.y*dy-n.z*dz*0.52});
    svg.innerHTML="";svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("preserveAspectRatio","xMidYMid meet");
    const el=(tag,attrs)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e;};
    el("rect",{x:0,y:0,width:W,height:H,fill:"#f8fafc"});
    const colors={column:"#176b9b",rafter:"#d97706",roofPurlin:"#0f766e",wallGirt:"#64748b",wallBrace:"#dc2626",roofBrace:"#b91c1c",endPost:"#2563eb",endGirt:"#94a3b8"};
    const widths={column:5,rafter:4,roofPurlin:1.8,wallGirt:1.8,wallBrace:2.5,roofBrace:2.5,endPost:2.2,endGirt:1.5};
    ["roofPurlin","wallGirt","endGirt","endPost","roofBrace","wallBrace","column","rafter"].forEach(type=>model.members.filter(m=>m.sectionKey===type).forEach(m=>{
      const a=model.nodes.find(n=>n.id===m.start),b=model.nodes.find(n=>n.id===m.end);if(!a||!b)return;const p=P(a),q=P(b);
      el("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:colors[type],"stroke-width":widths[type],"stroke-linecap":"round",opacity:type==="roofPurlin"||type==="wallGirt"?"0.88":"1"});
    }));
    const title=el("text",{x:W/2,y:25,"text-anchor":"middle",fill:"#123b52","font-size":17,"font-family":"Tahoma,Arial"});title.textContent="مدل سه‌بعدی جانمایی اجزای سوله";
    const note=el("text",{x:W/2,y:455,"text-anchor":"middle",fill:"#64748b","font-size":11,"font-family":"Tahoma,Arial"});note.textContent="نمای شماتیک آکسونومتریک ـ مقیاس تصویری";
    return true;
  }
  function showSummary(){
    if(!model)return;const counts={};model.members.forEach(m=>counts[m.type]=(counts[m.type]||0)+1);
    const rows=Object.entries(counts).map(x=>"<tr><td>"+x[0]+"</td><td>"+x[1]+"</td></tr>").join("");
    const target=$("fullModelSummary");if(target)target.innerHTML="<b>مدل هندسی تولید شد:</b> "+model.geometry.frames.length+" قاب اصلی، "+model.nodes.length+" گره و "+model.members.length+" عضو هندسی.<table><thead><tr><th>نوع عضو</th><th>تعداد</th></tr></thead><tbody>"+rows+"</tbody></table><p>مهاربندهای ترسیم‌شده فقط آرایش پیشنهادی هستند؛ تا تعیین مقطع، اتصال، سختی و پیوستگی، مهار قطعی محسوب نمی‌شوند.</p><p><b>محدوده تحلیل فعلی:</b> حل‌گر موجود هنوز قاب عرضی دوبعدی نمونه را تحلیل می‌کند؛ این مدل در این مرحله برای جانمایی و استخراج هندسه است و هنوز حل‌گر سه‌بعدی همه اعضا نیست.</p>";
  }
  function getData(){return model?{geometry:model.geometry,nodes:model.nodes,members:model.members}:null;}
  function setData(data){
    if(data&&data.geometry){const g=data.geometry,map={roofPurlinSpacing:"modelPurlinSpacing",wallGirtSpacing:"modelGirtSpacing",endPostSpacing:"modelEndPostSpacing",braceBays:"modelBraceBays"};Object.entries(map).forEach(([k,id])=>{if($(id)&&g[k]!=null)$(id).value=g[k];});}
    build();draw();showSummary();
  }
  function validate(){try{build();return "";}catch(e){return e.message;}}
  function getProposedUnbracedLengths(){if(!model)build();const g=model.geometry;return{column:g.height,rafter:Math.hypot(g.span/2,g.rise),roofPurlin:g.spacing,wallGirt:g.spacing,status:"پیشنهاد هندسی؛ تا تأیید جزئیات مهار و اتصال، مقدار قطعی طراحی نیست"};}
  function init(){
    ensurePanel();
    if(window.SteelDrawing){originalDrawFrame=window.SteelDrawing.drawFrame;window.SteelDrawing.drawFrame=function(){try{build();draw();showSummary();return true;}catch(e){console.error(e);return originalDrawFrame?originalDrawFrame():false;}};window.SteelDrawing.drawFullModel=draw;}
    try{build();draw();showSummary();}catch(e){console.warn(e);}
  }
  window.SteelStructuralModel={build,draw,getData,setData,validate,getProposedUnbracedLengths,get model(){return model;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();