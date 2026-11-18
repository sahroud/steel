/* SAHROUD STEEL - Explicit surface-pressure to line-load conversion.
 * Units: kN/m2 * m = kN/m. The caller must supply the tributary width
 * on the same area basis as the input pressure (horizontal or sloped).
 */
(function (root) {
  "use strict";
  function surfacePressureToLineLoad(pressureKPa, tributaryWidthM) {
    const p = Number(pressureKPa);
    const w = Number(tributaryWidthM);
    if (!Number.isFinite(p)) throw new TypeError("فشار سطحی باید عدد محدود باشد.");
    if (!Number.isFinite(w) || w < 0) throw new RangeError("عرض بارگیر باید عدد محدود و نامنفی باشد.");
    return p * w;
  }
  function equalStationTributaryWidths(totalWidthM, intervalCount) {
    const width = Number(totalWidthM);
    const count = Number(intervalCount);
    if (!Number.isFinite(width) || width <= 0) throw new RangeError("عرض کل بارگیر باید مثبت باشد.");
    if (!Number.isInteger(count) || count < 1) throw new RangeError("تعداد فاصله‌ها باید عدد صحیح مثبت باشد.");
    const segment = width / count;
    return Array.from({ length: count + 1 }, (_, i) =>
      segment * (i === 0 || i === count ? 0.5 : 1));
  }
  function triangularGableWindResultant(pressureKPa, spanM, riseM) {
    const p = Number(pressureKPa), span = Number(spanM), rise = Number(riseM);
    if (!Number.isFinite(p)) throw new TypeError("فشار باد باید عدد محدود باشد.");
    if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(rise) || rise < 0)
      throw new RangeError("دهانه باید مثبت و ارتفاع مثلث نامنفی باشد.");
    return Object.freeze({
      areaM2: 0.5 * span * rise,
      resultantKN: p * 0.5 * span * rise,
      centroidXFromLeftM: span / 2,
      centroidYAboveEaveM: rise / 3
    });
  }

  function triangularGablePostEquivalentLoads(pressureKPa, spanM, riseM, eaveHeightM, postIntervals) {
    const p = Number(pressureKPa), span = Number(spanM), rise = Number(riseM);
    const eave = Number(eaveHeightM), count = Number(postIntervals);
    if (!Number.isFinite(p)) throw new TypeError("فشار باد باید عدد محدود باشد.");
    if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(rise) || rise < 0)
      throw new RangeError("دهانه باید مثبت و ارتفاع مثلث نامنفی باشد.");
    if (!Number.isFinite(eave) || eave <= 0)
      throw new RangeError("ارتفاع لبه بام باید مثبت باشد.");
    if (!Number.isInteger(count) || count < 1)
      throw new RangeError("تعداد فاصله ستونک‌ها باید عدد صحیح مثبت باشد.");
    const half = span / 2;
    const heightAt = x => rise * (x <= half ? x / half : (span - x) / half);
    const integrate = (a, b) => {
      const cuts = [a];
      if (a < half && b > half) cuts.push(half);
      cuts.push(b);
      let area = 0, firstMomentAboveEave = 0, firstMomentX = 0;
      for (let k = 0; k < cuts.length - 1; k++) {
        const x0 = cuts[k], x1 = cuts[k + 1], dx = x1 - x0;
        const h0 = heightAt(x0), h1 = heightAt(x1);
        area += dx * (h0 + h1) / 2;
        firstMomentAboveEave += dx * (h0 * h0 + h0 * h1 + h1 * h1) / 6;
        firstMomentX += dx * ((2 * x0 + x1) * h0 + (x0 + 2 * x1) * h1) / 6;
      }
      return { area, firstMomentAboveEave, firstMomentX };
    };
    const supports = [];
    for (let i = 0; i <= count; i++) {
      const x = span * i / count;
      const left = i === 0 ? 0 : span * (i - 0.5) / count;
      const right = i === count ? span : span * (i + 0.5) / count;
      const cell = integrate(left, right);
      const gableHeight = heightAt(x);
      const supportHeight = eave + gableHeight;
      const resultant = p * cell.area;
      const centroidAboveEave = cell.area > 0
        ? cell.firstMomentAboveEave / cell.area : 0;
      const centroidAboveBase = eave + centroidAboveEave;
      const topForce = supportHeight > 0
        ? resultant * centroidAboveBase / supportHeight : 0;
      supports.push(Object.freeze({
        post: i, xM: x, tributaryLeftM: left, tributaryRightM: right,
        tributaryAreaM2: cell.area, resultantKN: resultant,
        centroidYAboveEaveM: centroidAboveEave,
        baseForceKN: resultant - topForce, topForceKN: topForce,
        supportHeightM: supportHeight,
        momentAboutBaseKNm: resultant * centroidAboveBase,
        momentYAboutSupportKNm: -p * (cell.firstMomentX - x * cell.area)
      }));
    }
    return Object.freeze(supports);
  }
  function calculateWindZonePressures(input) {
    const data=input||{}, coefficients=data.coefficients||{}, zones=data.zones||{};
    const finite=value=>{
      if(value===null||value===undefined||value==="")return null;
      const number=Number(value);
      return Number.isFinite(number)?number:null;
    };
    const speed=finite(data.basicWindKmh);
    const q=speed===null||speed<0?null:0.000613*Math.pow(speed/3.6,2);
    const required=["importance","exposure","topography","gust","directionality","internalGust","internalPressure"];
    const nonNegative=["importance","exposure","topography","gust","directionality","internalGust"];
    const values={};
    required.forEach(key=>values[key]=finite(coefficients[key]));
    // Pressure coefficients may be signed; amplification/importance factors may not.
    // Reject invalid factors instead of allowing negative multipliers to reverse loads silently.
    const factorsReady=nonNegative.every(key=>values[key]!==null&&values[key]>=0);
    const commonReady=q!==null&&required.every(key=>values[key]!==null)&&factorsReady;
    const common=commonReady
      ? values.importance*q*values.exposure*values.topography*values.directionality
      : null;
    const internalMagnitude=commonReady?Math.abs(values.internalPressure):null;
    const rows={};
    Object.keys(zones).forEach(key=>{
      const cp=finite(zones[key]);
      if(!commonReady||cp===null){rows[key]=null;return;}
      const external=common*values.gust*cp;
      const internal=common*values.internalGust*internalMagnitude;
      rows[key]=Object.freeze({
        cp,external,internalMagnitude:internal,
        netInternalPositive:external-internal,
        netInternalNegative:external+internal
      });
    });
    const ready=commonReady&&Object.keys(zones).length>0&&Object.values(rows).every(Boolean);
    return Object.freeze({q,rows:Object.freeze(rows),ready});
  }

  function mapWindZonePressuresToMembers(model, pressureResult, internalScenario) {
    if (!model || !Array.isArray(model.members)) throw new TypeError("مدل دارای فهرست اعضای معتبر نیست.");
    if (!pressureResult || pressureResult.ready !== true || !pressureResult.rows)
      throw new Error("فشارهای شش‌ناحیه‌ای کامل و معتبر نیستند؛ انتقال بار متوقف شد.");
    const scenario = internalScenario === "negative" ? "netInternalNegative" :
      internalScenario === "positive" ? "netInternalPositive" : null;
    if (!scenario) throw new RangeError("حالت فشار داخلی باید positive یا negative باشد.");
    const zoneBySide = {roofLeft:"roof-left",roofRight:"roof-right",wallLeft:"long-wall-left",wallRight:"long-wall-right",endFront:"end-wall-front",endRear:"end-wall-back"};
    const pressureFor = zone => {
      const row=pressureResult.rows[zone], value=row&&Number(row[scenario]);
      if(!Number.isFinite(value))throw new Error("فشار ناحیه "+zone+" معتبر یا کامل نیست.");
      return value;
    };
    const memberLoads={};
    const endFacePressures={front:pressureFor(zoneBySide.endFront),rear:pressureFor(zoneBySide.endRear)};
    let mappedRoof=0,mappedWalls=0,mappedEndWalls=0;
    model.members.forEach(member=>{
      const id=String(member.id||"");
      if(!id)throw new Error("عضو بدون شناسه در نگاشت فشار باد وجود دارد.");
      if(Object.prototype.hasOwnProperty.call(memberLoads,id))throw new Error("شناسه عضو تکراری در نگاشت فشار باد: "+id);
      if(member.sectionKey==="roofPurlin"){
        const leftWidth=Number(member.tributaryWidthLeft||(member.side==="left"?member.tributaryWidth:0)||0);
        const rightWidth=Number(member.tributaryWidthRight||(member.side==="right"?member.tributaryWidth:0)||0);
        if(!Number.isFinite(leftWidth)||leftWidth<0||!Number.isFinite(rightWidth)||rightWidth<0||leftWidth+rightWidth<=0)throw new Error("عرض بارگیر پرلین "+id+" معتبر نیست.");
        memberLoads[id]=Object.freeze({windLeft:surfacePressureToLineLoad(pressureFor(zoneBySide.roofLeft),leftWidth),windRight:surfacePressureToLineLoad(pressureFor(zoneBySide.roofRight),rightWidth),sourceZones:Object.freeze(["roof-left","roof-right"])});
        mappedRoof++;
      }else if(member.sectionKey==="wallGirt"){
        const zone=member.side==="left"?zoneBySide.wallLeft:member.side==="right"?zoneBySide.wallRight:null;
        if(!zone)throw new Error("سمت دیوارگیر "+id+" مشخص نیست.");
        const height=Number(member.tributaryHeight);
        if(!Number.isFinite(height)||height<=0)throw new Error("ارتفاع بارگیر دیوارگیر "+id+" معتبر نیست.");
        memberLoads[id]=Object.freeze({wind:surfacePressureToLineLoad(pressureFor(zone),height),sourceZones:Object.freeze([zone])});
        mappedWalls++;
      }else if(member.sectionKey==="endGirt"){
        const zone=member.endFace==="front"?zoneBySide.endFront:member.endFace==="rear"?zoneBySide.endRear:null;
        if(!zone)throw new Error("وجه دیوار انتهایی عضو "+id+" مشخص نیست.");
        const height=Number(member.tributaryHeight);
        if(!Number.isFinite(height)||height<=0)throw new Error("ارتفاع بارگیر تیر انتهایی "+id+" معتبر نیست.");
        memberLoads[id]=Object.freeze({windEnd:surfacePressureToLineLoad(pressureFor(zone),height),sourceZones:Object.freeze([zone])});
        mappedEndWalls++;
      }
    });
    if(!mappedRoof||!mappedWalls||!mappedEndWalls)throw new Error("نگاشت باد نیازمند پرلین سقف، دیوارگیر طولی و تیر دیوار انتهایی است.");
    return Object.freeze({schemaVersion:"1.0.0",internalScenario,convention:"signed net pressure; kN/m2 multiplied by member tributary width/height to kN/m",memberLoads:Object.freeze(memberLoads),endFacePressures:Object.freeze(endFacePressures),counts:Object.freeze({roofPurlins:mappedRoof,longitudinalWallGirts:mappedWalls,endWallGirts:mappedEndWalls})});
  }

  function preliminaryWindCombinations() {
    return Object.freeze([
      {key:"comboWind08P",label:"آزمایشی 0.8D+1.6W (جهت +)",dead:0.8,live:0,snow:0,wind:1.6,sign:1},
      {key:"comboWind08N",label:"آزمایشی 0.8D+1.6W (جهت −)",dead:0.8,live:0,snow:0,wind:1.6,sign:-1},
      {key:"comboLiveWind08P",label:"آزمایشی 1.2D+1.6L+0.5S+0.8W (جهت +)",dead:1.2,live:1.6,snow:0.5,wind:0.8,sign:1},
      {key:"comboLiveWind08N",label:"آزمایشی 1.2D+1.6L+0.5S+0.8W (جهت −)",dead:1.2,live:1.6,snow:0.5,wind:0.8,sign:-1},
      {key:"comboSnowWind08P",label:"آزمایشی 1.2D+1.6S+0.5L+0.8W (جهت +)",dead:1.2,live:0.5,snow:1.6,wind:0.8,sign:1},
      {key:"comboSnowWind08N",label:"آزمایشی 1.2D+1.6S+0.5L+0.8W (جهت −)",dead:1.2,live:0.5,snow:1.6,wind:0.8,sign:-1}
    ].map(item=>Object.freeze(item)));
  }
  root.SteelLoadTransfer = Object.freeze({
    surfacePressureToLineLoad, equalStationTributaryWidths, triangularGableWindResultant,
    triangularGablePostEquivalentLoads, calculateWindZonePressures, mapWindZonePressuresToMembers, preliminaryWindCombinations
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
