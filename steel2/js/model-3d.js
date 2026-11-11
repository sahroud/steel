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
      '<div class="button-grid"><button type="button" id="btnBuildFullModel" class="btn primary">تولید و ترسیم تمام اجزای سوله</button><button type="button" id="btnCheck3DSections" class="btn secondary">بررسی آمادگی مقاطع تحلیل سه‌بعدی</button></div>' +
      '<div id="fullModelSummary" class="notice">مدل کامل هنوز تولید نشده است.</div>' +
      '<div id="fullModel3DReadiness" class="notice">آمادگی تحلیل سه‌بعدی هنوز بررسی نشده است.</div>' +
      '<hr><h4>تحلیل واقعی سه‌بعدی مدل</h4>' +
      '<div class="form-grid"><div class="field"><label for="model3DLoadCase">حالت بار برای تحلیل آزمایشی</label><select id="model3DLoadCase"><option value="dead">بار مرده</option><option value="live">بار زنده</option><option value="snow">بار برف</option></select></div></div>' +
      '<div class="button-grid"><button type="button" id="btnRunFull3D" class="btn success">اجرای تحلیل سه‌بعدی کل سوله</button></div>' +
      '<div id="fullModel3DResult" class="notice">تحلیل سه‌بعدی هنوز اجرا نشده است.</div>';
    drawingPanel.parentNode.insertBefore(panel, drawingPanel);
    $("btnBuildFullModel").addEventListener("click", function () { try { build(); draw(); showSummary(); } catch (e) { $("fullModelSummary").textContent = "خطا در تولید مدل: " + e.message; } });
    $("btnRunFull3D").addEventListener("click", function () {
      const box=$("fullModel3DResult");
      try {
        build(); draw(); showSummary();
        const lc=$("model3DLoadCase")?.value||"dead";
        const result=analyze3D(lc);
        box.textContent="تحلیل سه‌بعدی با موفقیت حل شد. حالت بار: "+result.loadCaseLabel+
          " | گره‌ها: "+result.nodeCount+" | اعضا: "+result.memberCount+
          " | بیشینه جابه‌جایی انتقالی: "+(result.maxTranslation*1000).toFixed(3)+" میلی‌متر"+
          " | گره‌های دارای واکنش تکیه‌گاهی: "+result.reactions.length+
          (result.criticalDisplacement
            ? " | گره بحرانی: "+result.criticalDisplacement.nodeId+" ("+result.criticalDisplacement.kind+")"+
              " | مختصات X/Y/Z: "+[result.criticalDisplacement.coordinates.x,result.criticalDisplacement.coordinates.y,result.criticalDisplacement.coordinates.z].map(v=>v.toFixed(3)).join(" / ")+" متر"+
              " | جابه‌جایی ux/uy/uz: "+[result.criticalDisplacement.ux,result.criticalDisplacement.uy,result.criticalDisplacement.uz].map(v=>(v*1000).toFixed(3)).join(" / ")+" میلی‌متر"+
              " | اعضای متصل ("+result.criticalDisplacement.connectedMembers.length+"): "+result.criticalDisplacement.connectedMembers.map(m=>m.id+" ["+m.type+"]").join("، ")
            : " | اطلاعات گره بحرانی در دسترس نیست")+
          (result.selfWeight&&result.selfWeight.included?" | وزن خود فولاد افزوده‌شده: "+result.selfWeight.totalKN.toFixed(2)+" کیلونیوتن در "+result.selfWeight.memberCount+" عضو":"")+
          (result.equilibrium?" | کنترل تعادل نیرو: "+(result.equilibrium.relativeForceResidual*100).toExponential(2)+"٪؛ تعادل لنگر: "+(result.equilibrium.relativeMomentResidual*100).toExponential(2)+"٪؛ "+(result.equilibrium.ok?"تعادل کلی برقرار":"هشدار: عدم تعادل کلی"):" | کنترل تعادل در دسترس نیست")+
          ". خودوزن با فرض وزن مخصوص 78.5 kN/m³ و مساحت مقطع ثبت‌شده محاسبه شده است؛ تحلیل فعلی خطی و با اتصال صلب گره‌هاست، آزادسازی انتهایی و P-Delta ندارد و تأیید طراحی یا کنترل آیین‌نامه‌ای نیست.";
        if(Array.isArray(result.criticalMemberReport)&&result.criticalMemberReport.length){
          const fmt=(v,factor=1,d=3)=>Number.isFinite(Number(v))?(Number(v)*factor).toFixed(d):"—";
          const lines=["","گزارش تشخیصی اعضای متصل به گره بحرانی:",
            "واحد نیرو: kN | واحد گشتاور: kN·m | مشخصات مقطع: A بر حسب cm² و ممان‌ها بر حسب cm⁴",
            "ترتیب نیروها در هر انتها: N، Vy، Vz، T، My، Mz"];
          result.criticalMemberReport.forEach((m,i)=>{
            const s=m.section||{},a=m.endI||{},b=m.endJ||{};
            lines.push((i+1)+") "+m.id+" — "+m.type+(m.profile?" — مقطع "+m.profile:"")+
              " — طول "+fmt(m.length,1,3)+" m");
            lines.push("   انتهای I: "+[a.N,a.Vy,a.Vz].map(v=>fmt(v,0.001)).join(" / ")+" kN؛ "+
              [a.T,a.My,a.Mz].map(v=>fmt(v,0.001)).join(" / ")+" kN·m");
            lines.push("   انتهای J: "+[b.N,b.Vy,b.Vz].map(v=>fmt(v,0.001)).join(" / ")+" kN؛ "+
              [b.T,b.My,b.Mz].map(v=>fmt(v,0.001)).join(" / ")+" kN·m");
            lines.push("   مقطع: A="+fmt(s.A,1e4,2)+" cm²؛ Iy="+fmt(s.Iy,1e8,2)+
              "؛ Iz="+fmt(s.Iz,1e8,2)+"؛ J="+fmt(s.J,1e8,2)+" cm⁴؛ E="+
              fmt(s.E,1e-9,2)+"؛ G="+fmt(s.G,1e-9,2)+" GPa");
          });
          lines.push("تذکر: این‌ها نیروهای انتهایی محلی عضو در تحلیل خطی فعلی‌اند؛ علامت‌ها مطابق قرارداد محلی حل‌گر است و به‌تنهایی کنترل مقاومت یا خیز آیین‌نامه‌ای محسوب نمی‌شوند.");
          box.textContent+="\n"+lines.join("\n");
        }else{
          box.textContent+="\nگزارش نیروهای اعضای بحرانی در دسترس نیست.";
        }
        box.style.color="#15803d";
        window.SteelStructuralModel.last3DResult=result;
      } catch(e) {
        box.textContent="تحلیل سه‌بعدی انجام نشد: "+e.message+
          "؛ این پیام برای جلوگیری از ارائه نتیجه نادرست نمایش داده شده است.";
        box.style.color="#b45309";
        window.SteelStructuralModel.last3DResult=null;
      }
    });
    $("btnCheck3DSections").addEventListener("click", function () {
      try {
        build();
        const result=validate3DSections();
        const box=$("fullModel3DReadiness");
        box.textContent=result.ready
          ? "مقاطع همه گروه‌ها از نظر کامل بودن A، Iy، Iz، J، E و G دارای ورودی معتبرند. این فقط کنترل تکمیل ورودی است؛ هنوز تحلیل بارگذاری‌شده و کنترل آیین‌نامه‌ای انجام نشده است."
          : "تحلیل سه‌بعدی فعلاً مجاز نیست. گروه‌های ناقص: " + result.missing.map(x=>x.label+" ("+x.count+" عضو): "+x.reason).join(" | ");
        box.style.color=result.ready?"#15803d":"#b45309";
      } catch(e) { $("fullModel3DReadiness").textContent="خطا در بررسی: "+e.message; }
    });
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
    const girtHeights=[],nGirt=Math.max(0,Math.floor(height/gsp));
    for(let i=1;i<=nGirt;i++) if(i*gsp<height-0.25) girtHeights.push(i*gsp);
    const roofY=x=>height+(x<=half?rise*x/half:rise*(span-x)/half);
    const totalRoofSlope=slope+over,roofRows=Math.max(1,Math.ceil(totalRoofSlope/psp));
    const roofLongitudinalStations=[-over,...frames,length+over];
    // Every purlin/rafter crossing is a shared structural node, not two coincident but disconnected nodes.
    const roofXs=[0,span];
    [-1,1].forEach(side=>{for(let ri=0;ri<=roofRows;ri++){
      const t=ri/roofRows;
      roofXs.push(side<0?(-over*cs+(half+over*cs)*t):(half+(half+over*cs)*t));
    }});
    // Force exact column/rafter intersections at both eaves and reuse their node IDs.
    const frameRoofXs=roofXs.sort((a,b)=>a-b).filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>1e-8);
    frames.forEach((z,fi)=>{
      const bl=addNode(nodes,0,0,z,"base"),el=addNode(nodes,0,height,z,"eave"),r=addNode(nodes,half,height+rise,z,"ridge");
      const er=addNode(nodes,span,height,z,"eave"),br=addNode(nodes,span,0,z,"base");
      const lt=addNode(nodes,-over*cs,height-over*sn,z,"cantilever"),rt=addNode(nodes,span+over*cs,height-over*sn,z,"cantilever");
      // Split each main column at every wall-girt elevation. The girt and
      // column must reuse the exact same node IDs to transfer forces.
      const leftColumnLevels=[bl,...girtHeights.map(y=>addNode(nodes,0,y,z,"column-girt-joint")),el];
      const rightColumnLevels=[br,...girtHeights.map(y=>addNode(nodes,span,y,z,"column-girt-joint")),er];
      for(let j=0;j<leftColumnLevels.length-1;j++)
        addMember(members,leftColumnLevels[j],leftColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      for(let j=0;j<rightColumnLevels.length-1;j++)
        addMember(members,rightColumnLevels[j],rightColumnLevels[j+1],"ستون قاب","column",{frame:fi+1,axis:"transverse",segment:j+1});
      const roofLine=frameRoofXs.map(x=>addNode(nodes,x,roofY(x),z,"rafter-purlin-joint"));
      for(let j=0;j<roofLine.length-1;j++){
        const a=roofLine[j],b=roofLine[j+1],mid=(a.x+b.x)/2;
        const isOverhang=mid<0||mid>span;
        addMember(members,a,b,isOverhang?"کنسول رفتر":"رفتر قاب","rafter",{frame:fi+1,axis:"transverse",segment:j+1,connectedPurlinNodes:true});
      }
      frameNodes.push({z,bl,el,r,er,br,lt,rt});
    });
    // Build one physical purlin line at each roof station. The ridge is shared
    // by both slopes and must be represented once, with left/right tributary widths.
    const purlinStations=new Map();
    [-1,1].forEach(side=>{
      for(let ri=0;ri<=roofRows;ri++){
        const t=ri/roofRows;
        const x=side<0?(-over*cs+(half+over*cs)*t):(half+(half+over*cs)*t);
        const width=(totalRoofSlope/roofRows)*(ri===0||ri===roofRows?0.5:1);
        const key=x.toFixed(7);
        const existing=purlinStations.get(key);
        if(existing){
          existing.side="ridge";
          existing.tributaryWidthRight=width;
          existing.tributaryWidth+=width;
        }else{
          purlinStations.set(key,{x,side:side<0?"left":"right",row:ri+1,
            tributaryWidth:width,
            tributaryWidthLeft:side<0?width:0,
            tributaryWidthRight:side>0?width:0});
        }
      }
    });
    purlinStations.forEach(station=>{
      const row=roofLongitudinalStations.map(z=>addNode(nodes,station.x,roofY(station.x),z,"roof-secondary"));
      for(let i=0;i<row.length-1;i++)
        addMember(members,row[i],row[i+1],"پرلین طولی سقف","roofPurlin",{
          side:station.side,row:station.row,tributaryWidth:station.tributaryWidth,
          tributaryWidthLeft:station.tributaryWidthLeft,
          tributaryWidthRight:station.tributaryWidthRight,endOverhang:0.8
        });
    });
    [-over,length+over].forEach(z=>{
      const xs=[-over*cs,half,span+over*cs];
      const edge=xs.map(x=>addNode(nodes,x,roofY(x),z,"roof-edge"));
      addMember(members,edge[0],edge[1],"تیر لبه عرضی پیش‌آمدگی سقف","roofEdge",{endFace:z<0?"front":"rear",overhang:0.8});
      addMember(members,edge[1],edge[2],"تیر لبه عرضی پیش‌آمدگی سقف","roofEdge",{endFace:z<0?"front":"rear",overhang:0.8});
    });
    girtHeights.forEach((y,gi)=>[0,span].forEach((x,si)=>{
      const lower=gi===0?0:(girtHeights[gi-1]+y)/2;
      const upper=gi===girtHeights.length-1?height:(y+girtHeights[gi+1])/2;
      const row=frames.map(z=>addNode(nodes,x,y,z,"wall-secondary"));
      for(let i=0;i<row.length-1;i++) addMember(members,row[i],row[i+1],"قید افقی طولی دیوار","wallGirt",{side:si===0?"left":"right",row:gi+1,tributaryHeight:upper-lower});
    }));
    [0,length].forEach((z,endIndex)=>{
      const count=Math.max(1,Math.ceil(span/endsp)), xs=Array.from({length:count+1},(_,i)=>span*i/count);
      const face=endIndex===0?"front":"rear";
      // End-wall posts are split at every girt intersection so the secondary
      // members share actual nodes instead of crossing disconnected lines.
      for(let i=1;i<count;i++){
        const x=xs[i],top=roofY(x);
        const levels=[0,...girtHeights.filter(y=>y<top-1e-7),top]
          .filter((y,j,a)=>j===0||Math.abs(y-a[j-1])>1e-7);
        const vertical=levels.map(y=>addNode(nodes,x,y,z,y===0?"endwall-base":(Math.abs(y-top)<1e-7?"endwall-head":"endwall-post-joint")));
        for(let j=0;j<vertical.length-1;j++)
          addMember(members,vertical[j],vertical[j+1],"ستونک میانی دیوار انتهایی","endPost",{endFace:face,post:i,segment:j+1});
      }
      // Gable top chord connects the heads of the end posts to the main eaves/ridge.
      const topChord=xs.map(x=>addNode(nodes,x,roofY(x),z,"endwall-head"));
      for(let i=0;i<topChord.length-1;i++)
        addMember(members,topChord[i],topChord[i+1],"رفتر قاب دیوار انتهایی","rafter",{endFace:face,axis:"endwall"});
      girtHeights.forEach((y,gi)=>{
        const active=xs.map((x,i)=>({x,i})).filter(v=>roofY(v.x)>=y-1e-7);
        for(let i=0;i<active.length-1;i++){
          const a=addNode(nodes,active[i].x,y,z,"endwall-girt"),b=addNode(nodes,active[i+1].x,y,z,"endwall-girt");
          addMember(members,a,b,"تیر افقی دیوار انتهایی","endGirt",{endFace:face,row:gi+1});
        }
      });
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
    // Assign tributary line loads to the geometric members from current area-load inputs.
    const loads=window.SteelLoads?.getData?.()||{};
    const windSign=loads.windDirection==="right-to-left"?-1:1;
    const frameTrib=frames.map((z,i)=>i===0?(frames[1]-z)/2:i===frames.length-1?(z-frames[i-1])/2:(frames[i+1]-frames[i-1])/2);
    members.forEach(m=>{
      if(m.axis==="transverse"){
        const fi=(m.frame||1)-1,tw=frameTrib[fi]||spacing;
        if(m.type.indexOf("رفتر چپ")>=0) m.lineLoads={dead:(loads.deadLeft||0)*tw,live:(loads.liveLeft||0)*tw,snow:(loads.snowLeft||0)*tw,wind:(loads.windLeft||0)*tw,unit:"kN/m",tributaryWidth:tw};
        else if(m.type.indexOf("رفتر راست")>=0) m.lineLoads={dead:(loads.deadRight||0)*tw,live:(loads.liveRight||0)*tw,snow:(loads.snowRight||0)*tw,wind:(loads.windRight||0)*tw,unit:"kN/m",tributaryWidth:tw};
        else m.lineLoads={wind:(loads.windWall||0)*windSign*tw,unit:"kN/m",tributaryWidth:tw};
      } else if(m.sectionKey==="roofPurlin"){
        const w=m.tributaryWidth||0;
        if(m.side==="ridge"){
          const wl=m.tributaryWidthLeft||0,wr=m.tributaryWidthRight||0;
          m.lineLoads={
            dead:(loads.deadLeft||0)*wl+(loads.deadRight||0)*wr,
            live:(loads.liveLeft||0)*wl+(loads.liveRight||0)*wr,
            snow:(loads.snowLeft||0)*wl+(loads.snowRight||0)*wr,
            wind:(loads.windLeft||0)*wl+(loads.windRight||0)*wr,
            unit:"kN/m",tributaryWidth:w,tributaryWidthLeft:wl,tributaryWidthRight:wr
          };
        }else{
          const side=m.side==="left"?"Left":"Right";
          m.lineLoads={dead:(loads["dead"+side]||0)*w,live:(loads["live"+side]||0)*w,snow:(loads["snow"+side]||0)*w,wind:(loads["wind"+side]||0)*w,unit:"kN/m",tributaryWidth:w};
        }
      } else if(m.sectionKey==="wallGirt"){
        const h=m.tributaryHeight||0;
        m.lineLoads={wind:(loads.windWall||0)*windSign*h,unit:"kN/m",tributaryHeight:h};
      }
    });
    model={version:1,geometry:{span,length,spacing,height,rise,frames,frameTributaryWidths:frameTrib,roofPurlinSpacing:psp,wallGirtSpacing:gsp,endPostSpacing:endsp,braceBays,roofOverhang:0.8,endOverhang:0.8},nodes,members,generatedAt:new Date().toISOString()};
    return model;
  }
  function draw() {
    if(!model) build(); const svg=$("frameDrawing"); if(!svg)return false;
    const g=model.geometry,W=900,H=480,sx=Math.min(430/(g.span+0.8),300/(g.length+1.6)),sy=Math.min(190/(g.height+g.rise),sx),scale=Math.min(sx,sy);
    const ox=120,oy=330,dx=scale,dz=scale*0.55,dy=scale*0.92,P=n=>({x:ox+n.x*dx+n.z*dz,y:oy-n.y*dy-n.z*dz*0.52});
    svg.innerHTML="";svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("preserveAspectRatio","xMidYMid meet");
    const el=(tag,attrs)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e;};
    el("rect",{x:0,y:0,width:W,height:H,fill:"#f8fafc"});
    const colors={column:"#176b9b",rafter:"#d97706",roofPurlin:"#0f766e",wallGirt:"#64748b",wallBrace:"#dc2626",roofBrace:"#b91c1c",endPost:"#2563eb",endGirt:"#94a3b8",roofEdge:"#b45309"};
    const widths={column:5,rafter:4,roofPurlin:1.8,wallGirt:1.8,wallBrace:2.5,roofBrace:2.5,endPost:2.2,endGirt:1.5,roofEdge:3};
    ["roofPurlin","wallGirt","endGirt","endPost","roofBrace","wallBrace","roofEdge","column","rafter"].forEach(type=>model.members.filter(m=>m.sectionKey===type).forEach(m=>{
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
    const target=$("fullModelSummary");if(target)target.innerHTML="<b>مدل هندسی تولید شد:</b> "+model.geometry.frames.length+" قاب اصلی، "+model.nodes.length+" گره و "+model.members.length+" عضو هندسی.<table><thead><tr><th>نوع عضو</th><th>تعداد</th></tr></thead><tbody>"+rows+"</tbody></table><p>بارهای ثقلی سطحی به بار خطی پرلین‌ها تبدیل و در تحلیل سه‌بعدی اعمال می‌شوند؛ بار باد و ترکیبات بار هنوز در حل‌گر سه‌بعدی اعمال نمی‌شوند. در تحلیل فعلی، تقاطع پرلین و رفتر و سایر گره‌های مشترک به‌صورت اتصال صلب مدل شده‌اند؛ مهاربندهای ترسیم‌شده نیز با مقطع تخصیص‌یافته فعال و در سختی سازه مؤثرند. اگر اتصال واقعی مفصلی، کشویی یا دارای آزادسازی باشد، نتایج فعلی می‌تواند تفاوت قابل‌توجهی داشته باشد.</p><p><b>محدوده مدل:</b> تحلیل الاستیک خطی سه‌بعدی در حال توسعه است؛ خروجی آن تا تکمیل بارگذاری، شرایط تکیه‌گاهی، آزادسازی‌ها و کنترل‌های آیین‌نامه‌ای، صرفاً مقدماتی است.</p>";
  }
  function validate3DSections(){
    if(!model)build();
    const groups=new Map();
    model.members.forEach(m=>{
      const key=m.sectionKey||"unassigned";
      if(!groups.has(key))groups.set(key,{key,count:0,member:m});
      groups.get(key).count++;
    });
    const missing=[];
    groups.forEach(g=>{
      try{
        if(!window.SteelSections||typeof window.SteelSections.resolveAnalysis3DSection!=="function")
          throw new Error("اتصال تخصیص‌دهنده مقطع هنوز بارگذاری نشده است.");
        window.SteelSections.resolveAnalysis3DSection(g.member);
      }catch(e){
        const labels={column:"ستون",rafter:"رفتر",roofPurlin:"پرلین سقف",wallGirt:"قید افقی دیوار",endPost:"ستونک دیوار انتهایی",endGirt:"تیر افقی دیوار انتهایی",wallBrace:"مهاربند دیوار",roofBrace:"مهاربند سقف",roofEdge:"تیر لبه سقف"};
        missing.push({key:g.key,label:labels[g.key]||g.key,count:g.count,reason:e.message});
      }
    });
    return {ready:missing.length===0,groupCount:groups.size,memberCount:model.members.length,missing};
  }
  function analyze3D(loadCase){
    if(!model)build();
    if(!window.SteelFrame3D||typeof window.SteelFrame3D.analyze!=="function")
      throw new Error("حل‌گر سه‌بعدی بارگذاری نشده است.");
    const readiness=validate3DSections();
    if(!readiness.ready){
      const first=readiness.missing[0];
      throw new Error("مشخصات مقطع "+first.label+" ناقص است: "+first.reason+
        "؛ تعداد اعضای این گروه: "+first.count);
    }
    const cases={
      dead:{key:"dead",label:"مرده",direction:[0,-1,0]},
      live:{key:"live",label:"زنده",direction:[0,-1,0]},
      snow:{key:"snow",label:"برف",direction:[0,-1,0]}
    };
    const selected=cases[loadCase];
    if(!selected)throw new Error("حالت بار انتخابی پشتیبانی نمی‌شود.");
    const analysisModel={
      nodes:model.nodes.map(n=>({...n})),
      members:model.members.map(m=>({...m}))
    };
    // Build an indexed node registry and validate connectivity before creating element loads.
    const nodeById=new Map();
    const duplicateNodeIds=[];
    analysisModel.nodes.forEach(n=>{
      if(nodeById.has(n.id)) duplicateNodeIds.push(n.id);
      else nodeById.set(n.id,n);
    });
    if(duplicateNodeIds.length){
      throw new Error("شناسه گره تکراری در مدل: "+duplicateNodeIds.slice(0,8).join("، ")+
        "؛ تعداد گره‌ها: "+analysisModel.nodes.length);
    }
    // Self-weight is added to the DEAD case only. Steel unit weight = 78.5 kN/m³.
    // Area A comes from the same assigned section properties used by the 3D solver.
    const steelUnitWeightKNm3=78.5;
    let selfWeightKN=0, selfWeightMemberCount=0;
    analysisModel.members.forEach(m=>{
      const lineLoad=Number(m.lineLoads&&m.lineLoads[selected.key]||0);
      if(!Number.isFinite(lineLoad))throw new Error("بار عضو "+m.id+" عدد معتبر نیست.");
      const a=nodeById.get(m.start);
      const b=nodeById.get(m.end);
      if(!a||!b){
        const missing=[!a?"ابتدا "+String(m.start):"",!b?"انتها "+String(m.end):""].filter(Boolean).join(" و ");
        const sample=analysisModel.nodes.slice(-8).map(n=>n.id).join("، ");
        throw new Error("اتصال هندسی عضو "+m.id+" ("+m.type+") ناقص است؛ گره ناموجود: "+
          missing+"؛ تعداد گره‌های مدل: "+analysisModel.nodes.length+
          "؛ شناسه‌های پایانی گره‌ها: "+sample+
          "؛ لطفاً این پیام کامل را برای بررسی بفرستید.");
      }
      let selfWeightLineLoad=0;
      if(selected.key==="dead"){
        const section=window.SteelSections.resolveAnalysis3DSection(m);
        selfWeightLineLoad=section.A*steelUnitWeightKNm3;
        selfWeightKN+=selfWeightLineLoad*Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
        selfWeightMemberCount++;
      }
      const totalLineLoad=lineLoad+selfWeightLineLoad;
      const tr=window.SteelFrame3D.makeTransform([a.x,a.y,a.z],[b.x,b.y,b.z]);
      const global=selected.direction.map(v=>v*totalLineLoad*1000);
      const axes=[tr.axes.x,tr.axes.y,tr.axes.z];
      const local=axes.map(axis=>axis.reduce((sum,v,i)=>sum+v*global[i],0));
      m.analysisLoad={uniformLocal:local};
      m.analysisLoad.selfWeightKNm=selfWeightLineLoad;
    });
    const fixed= $("baseConnection")?.value==="fixed";
    const supports=analysisModel.nodes.filter(n=>n.kind==="base").map(n=>({
      nodeId:n.id,
      fixedDofs:fixed?[0,1,2,3,4,5]:[0,1,2]
    }));
    if(!supports.length)throw new Error("هیچ گره پایه‌ای برای تعریف تکیه‌گاه پیدا نشد.");
    const result=window.SteelFrame3D.analyze(analysisModel,{
      sectionResolver:m=>window.SteelSections.resolveAnalysis3DSection(m),
      supports
    });
    if(result.maxDisplacement){
      const criticalNode=analysisModel.nodes.find(n=>n.id===result.maxDisplacement.nodeId);
      if(criticalNode){
        result.criticalDisplacement={
          nodeId:criticalNode.id,
          kind:criticalNode.kind||"",
          coordinates:{x:criticalNode.x,y:criticalNode.y,z:criticalNode.z},
          ux:result.maxDisplacement.components[0],
          uy:result.maxDisplacement.components[1],
          uz:result.maxDisplacement.components[2],
          magnitude:result.maxDisplacement.magnitude,
          connectedMembers:analysisModel.members
            .filter(m=>m.start===criticalNode.id||m.end===criticalNode.id)
            .map(m=>({id:m.id,type:m.type,sectionKey:m.sectionKey,start:m.start,end:m.end}))
        };
      }
    }
    // Create a diagnostic report for members connected to the maximum-displacement node.
    // The force signs follow the solver's local member-end convention.
    if(result.criticalDisplacement&&Array.isArray(result.members)){
      const connectedIds=new Set(result.criticalDisplacement.connectedMembers.map(m=>m.id));
      result.criticalMemberReport=result.members
        .filter(m=>connectedIds.has(m.id))
        .map(m=>{
          const source=analysisModel.members.find(x=>x.id===m.id)||{};
          const f=Array.isArray(m.localEndForces)?m.localEndForces:[];
          const section=m.section||{};
          return {
            id:m.id,type:m.type,length:m.length,profile:source.profile||source.sectionLabel||"",
            sectionKey:source.sectionKey||"",
            endI:{N:f[0],Vy:f[1],Vz:f[2],T:f[3],My:f[4],Mz:f[5]},
            endJ:{N:f[6],Vy:f[7],Vz:f[8],T:f[9],My:f[10],Mz:f[11]},
            section:{A:section.A,Iy:section.Iy,Iz:section.Iz,J:section.J,E:section.E,G:section.G}
          };
        });
    }
    result.loadCase=selected.key;
    result.loadCaseLabel=selected.label;
    result.supportType=fixed?"گیردار":"مفصلی";
    result.selfWeight={included:selected.key==="dead",unitWeightKNm3:steelUnitWeightKNm3,totalKN:selfWeightKN,memberCount:selfWeightMemberCount};
    result.warning="وزن خود فولاد در حالت بار مرده با وزن مخصوص فرضی 78.5 kN/m³ و مساحت A مقاطع تخصیص‌یافته محاسبه و اضافه شده است. بار باد و ترکیبات بار هنوز اعمال نشده‌اند؛ همه گره‌های مشترک فعلاً صلب‌اند و آزادسازی انتهایی، P-Delta و کنترل آیین‌نامه‌ای وجود ندارد. مهاربندهای پیشنهادی با سختی کامل مقطع وارد تحلیل می‌شوند؛ صحت جزئیات اتصال باید جداگانه تأیید شود.";
    return result;
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
  window.SteelStructuralModel={build,draw,getData,setData,validate,validate3DSections,analyze3D,getProposedUnbracedLengths,get model(){return model;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();