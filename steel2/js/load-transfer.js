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
  const WIND_DIRECTIONS = Object.freeze(["transverse-positive","transverse-negative","longitudinal-positive","longitudinal-negative"]);
  const REQUIRED_WIND_ZONES = Object.freeze(["roof-left","roof-right","long-wall-left","long-wall-right","end-wall-front","end-wall-back"]);
  function calculateWindZonePressures(input) {
    const data=input||{}, coefficients=data.coefficients||{}, zones=data.zones||{};
    const direction=WIND_DIRECTIONS.includes(data.direction)?data.direction:null;
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
    const allZonesPresent=REQUIRED_WIND_ZONES.every(key=>Object.prototype.hasOwnProperty.call(zones,key)&&finite(zones[key])!==null);
    const ready=commonReady&&direction!==null&&allZonesPresent&&REQUIRED_WIND_ZONES.every(key=>!!rows[key]);
    return Object.freeze({q,rows:Object.freeze(rows),ready,direction,zones:Object.freeze({...zones})});
  }

  // Mabhas 6 (1398), clauses 6-10-8/9: choose the coefficient procedure
  // from the mean roof height and the smaller plan dimension. This helper
  // classifies the path only; it deliberately does not invent/read Cp values.
  function classifyWindProcedure(geometry) {
    const g=geometry||{};
    const span=Number(g.span), length=Number(g.length), eave=Number(g.height), rise=Number(g.rise);
    if (![span,length,eave,rise].every(Number.isFinite) || span<=0 || length<=0 || eave<=0 || rise<0) {
      return Object.freeze({ready:false,method:"undetermined",reason:"ابعاد معتبر دهانه، طول، ارتفاع لبه و خیز بام برای انتخاب روش باد لازم است.",codeEdition:"مبحث ششم، ویرایش ۱۳۹۸"});
    }
    const meanRoofHeight=eave+rise/2;
    const smallerPlanDimension=Math.min(span,length);
    const ratio=meanRoofHeight/smallerPlanDimension;
    const lowRise=meanRoofHeight<20 && ratio<1;
    return Object.freeze({
      ready:true,
      method:lowRise?"low-rise-combined-coefficients":"general-or-other-applicable-method",
      coefficientConvention:lowRise?"combined-GCp; do-not-apply-G-separately":"separate-Cg-and-Cp-or-other-applicable-method",
      codeClause:lowRise?"6-10-9":"6-10-8-and-applicable-following-provisions",
      meanRoofHeightM:meanRoofHeight,
      smallerPlanDimensionM:smallerPlanDimension,
      heightToSmallerPlanRatio:ratio,
      cAndCRequiredIndependently:true,
      codeComplianceStatus:"method-screening-only",
      warning:lowRise
        ?"برای این هندسه شاخه ساختمان کم‌ارتفاع بند ۶-۱۰-۹ محتمل است؛ ضرایب ترکیبی CgCp باید از شکل متناظر و برای C&C جداگانه استخراج شوند. Cg جداگانه دوباره اعمال نشود."
        :"شاخه کم‌ارتفاع بند ۶-۱۰-۹ احراز نشد؛ روش عمومی/سایر ضوابط باد باید با متن مبحث و شرایط پروژه تعیین شود. طراحی مستقل C&C همچنان الزامی است."
    });
  }

  // Geometry-only C&C effective-area record. No code coefficient or pressure is inferred.
  // For a rectangular tributary patch: effective area = member tributary width x loaded length.
  function calculateRectangularEffectiveWindArea(input) {
    const data = input || {};
    const width = Number(data.tributaryWidthM);
    const length = Number(data.loadedLengthM);
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(length) || length <= 0) {
      throw new RangeError("عرض بارگیر و طول بارگذاری سطح مؤثر باد باید مثبت و محدود باشند.");
    }
    const area = width * length;
    const component = typeof data.component === "string" && data.component.trim()
      ? data.component.trim() : "unspecified";
    const areaBasis = data.areaBasis === "sloped-surface" || data.areaBasis === "projected"
      ? data.areaBasis : null;
    if (!areaBasis) throw new RangeError("مبنای سطح مؤثر باید sloped-surface یا projected مشخص شود.");
    return Object.freeze({
      component,
      tributaryWidthM: width,
      loadedLengthM: length,
      effectiveAreaM2: area,
      areaBasis,
      geometryMethod: "rectangular-tributary-patch",
      codeEdition: "مبحث ششم، ویرایش ۱۳۹۸",
      codeClause: "6-10; exact C&C figure/table selection pending",
      coefficientSource: null,
      verificationStatus: "geometry-only-not-code-verified",
      pressureReady: false,
      warning: "این مقدار فقط مساحت هندسی بارگیر مستطیلی است؛ انتخاب ناحیه، ضرایب C&C، حداقل/حداکثر سطح مؤثر و فشار طراحی باید جداگانه از شکل و ضوابط دقیق مبحث ششم و شرایط عضو/اتصال احراز شود."
    });
  }


  // Build a member's rectangular tributary footprint in a local 2D basis.
  // The caller supplies the full tributary-width vector in the same 3D plane/basis
  // as the endpoints; this helper never guesses purlin spacing or roof orientation.
  function buildMemberTributaryFootprint(input) {
    const data=input||{}, start=data.start, end=data.end, widthVector=data.tributaryWidthVector;
    const vector=value=>{
      if(!value||![value.x,value.y,value.z].every(v=>Number.isFinite(Number(v))))
        throw new TypeError("مختصات سه‌بعدی ابتدا، انتها و بردار عرض بارگیر باید محدود باشند.");
      return {x:Number(value.x),y:Number(value.y),z:Number(value.z)};
    };
    const a=vector(start), b=vector(end), w=vector(widthVector);
    const axis={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};
    const length=Math.hypot(axis.x,axis.y,axis.z), width=Math.hypot(w.x,w.y,w.z);
    if(!(length>1e-9)||!(width>1e-9))
      throw new RangeError("طول عضو و عرض بارگیر باید مثبت و غیرصفر باشند.");
    const dot=axis.x*w.x+axis.y*w.y+axis.z*w.z;
    if(Math.abs(dot)>length*width*1e-8)
      throw new RangeError("بردار عرض بارگیر باید بر محور عضو عمود باشد؛ هندسه بارگیر مبهم است.");
    const basis=data.areaBasis;
    if(basis!=="projected"&&basis!=="sloped-surface")
      throw new RangeError("مبنای footprint باید projected یا sloped-surface مشخص شود.");
    const vertices=[
      {x:0,y:-width/2},{x:length,y:-width/2},
      {x:length,y:width/2},{x:0,y:width/2}
    ];
    const area=length*width;
    return Object.freeze({
      memberId:typeof data.memberId==="string"?data.memberId:null,
      vertices:Object.freeze(vertices.map(p=>Object.freeze(p))),
      memberLengthM:length,tributaryWidthM:width,footprintAreaM2:area,
      areaBasis:basis,localBasis:"member-axis / supplied-perpendicular-tributary-width",
      geometryMethod:"3d-member-axis-and-explicit-width-vector-to-local-rectangle",
      verificationStatus:"geometry-only-not-code-verified",
      pressureReady:false,
      warning:"عرض بارگیر و بردار آن باید از هندسه/فواصل واقعی مدل استخراج و روی مبنای سطح انتخابی تعریف شوند؛ این تابع فاصله پرلین، ناحیه C&C یا ضریب آیین‌نامه‌ای را حدس نمی‌زند."
    });
  }

  // Polygonal tributary patch area and centroid; geometry only, not a code-zone selector.
  function calculatePolygonEffectiveWindArea(input) {
    const data = input || {};
    const vertices = data.vertices;
    if (!Array.isArray(vertices) || vertices.length < 3) {
      throw new RangeError("برای سطح مؤثر چندضلعی حداقل سه رأس لازم است.");
    }
    const points = vertices.map((point, index) => {
      const x = Number(point && point.x), y = Number(point && point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new TypeError("مختصات رأس " + index + " باید عدد محدود باشد.");
      }
      return { x, y };
    });
    const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const onSegment = (a,b,p) =>
      Math.min(a.x,b.x)-1e-10 <= p.x && p.x <= Math.max(a.x,b.x)+1e-10 &&
      Math.min(a.y,b.y)-1e-10 <= p.y && p.y <= Math.max(a.y,b.y)+1e-10;
    const intersects = (a,b,c,d) => {
      const abC=cross(a,b,c), abD=cross(a,b,d), cdA=cross(c,d,a), cdB=cross(c,d,b);
      if (((abC>1e-10&&abD< -1e-10)||(abC< -1e-10&&abD>1e-10)) &&
          ((cdA>1e-10&&cdB< -1e-10)||(cdA< -1e-10&&cdB>1e-10))) return true;
      return (Math.abs(abC)<=1e-10&&onSegment(a,b,c)) ||
        (Math.abs(abD)<=1e-10&&onSegment(a,b,d)) ||
        (Math.abs(cdA)<=1e-10&&onSegment(c,d,a)) ||
        (Math.abs(cdB)<=1e-10&&onSegment(c,d,b));
    };
    const n=points.length;
    for(let i=0;i<n;i++) {
      const previous=points[(i+n-1)%n], current=points[i], nextPoint=points[(i+1)%n];
      const next=(i+1)%n;
      if(Math.hypot(current.x-nextPoint.x,current.y-nextPoint.y)<=1e-10)
        throw new RangeError("دو رأس متوالی چندضلعی نباید تکراری باشند.");
      // Adjacent collinear edges may be valid when they continue in opposite
      // directions, but a reversal overlaps the preceding edge and is invalid.
      const incoming={x:previous.x-current.x,y:previous.y-current.y};
      const outgoing={x:nextPoint.x-current.x,y:nextPoint.y-current.y};
      const turn=cross(previous,current,nextPoint);
      const dot=incoming.x*outgoing.x+incoming.y*outgoing.y;
      if(Math.abs(turn)<=1e-10 && dot>1e-10)
        throw new RangeError("دو ضلع مجاور چندضلعی روی هم افتاده‌اند؛ رأس برگشتی معتبر نیست.");
      for(let j=i+1;j<n;j++) {
        const jNext=(j+1)%n;
        if(i===j||next===j||jNext===i) continue;
        if(intersects(points[i],points[next],points[j],points[jNext]))
          throw new RangeError("مرز سطح مؤثر خودمتقاطع است؛ چندضلعی معتبر لازم است.");
      }
    }
    let twiceArea=0, cxNumerator=0, cyNumerator=0;
    for(let i=0;i<n;i++) {
      const a=points[i], b=points[(i+1)%n];
      const term=a.x*b.y-b.x*a.y;
      twiceArea+=term;
      cxNumerator+=(a.x+b.x)*term;
      cyNumerator+=(a.y+b.y)*term;
    }
    const signedArea=twiceArea/2, area=Math.abs(signedArea);
    if(!Number.isFinite(area)||area<=1e-10)
      throw new RangeError("مساحت چندضلعی باید مثبت و غیرصفر باشد.");
    const basis=data.areaBasis;
    if(basis!=="sloped-surface"&&basis!=="projected")
      throw new RangeError("مبنای سطح مؤثر باید sloped-surface یا projected مشخص شود.");
    return Object.freeze({
      component:typeof data.component==="string"&&data.component.trim()?data.component.trim():"unspecified",
      zoneId:typeof data.zoneId==="string"&&data.zoneId.trim()?data.zoneId.trim():null,
      effectiveAreaM2:area,
      centroid:Object.freeze({
        x:cxNumerator/(3*twiceArea),
        y:cyNumerator/(3*twiceArea)
      }),
      vertexCount:n,
      areaBasis:basis,
      geometryMethod:"simple-polygon-shoelace",
      codeEdition:"مبحث ششم، ویرایش ۱۳۹۸",
      coefficientSource:null,
      verificationStatus:"geometry-only-not-code-verified",
      pressureReady:false,
      warning:"مساحت و مرکز هندسی محاسبه شده‌اند؛ zoneId صرفاً برچسب ورودی است و تأیید ناحیه آیین‌نامه‌ای نیست. تعیین مرز ناحیه، حدود سطح مؤثر و ضرایب C&C باید جداگانه از متن و شکل رسمی احراز شود."
    });
  }


  // Exact planar overlap area for two simple polygons. Concave inputs are
  // ear-clipped into triangles, then convex triangle intersections are summed.
  // This is geometry only: it does not assign code zones or wind coefficients.
  function calculatePolygonWindZoneOverlap(input) {
    const data=input||{};
    const basis=data.areaBasis;
    if(basis!=="projected"&&basis!=="sloped-surface")
      throw new RangeError("مبنای سطح هم‌پوشانی باید projected یا sloped-surface باشد.");
    if((data.footprintAreaBasis!==undefined&&data.footprintAreaBasis!==basis)||
       (data.zoneAreaBasis!==undefined&&data.zoneAreaBasis!==basis))
      throw new RangeError("مبنای سطح بارگیر عضو و ناحیه باد باید یکسان باشد.");
    const footprint=calculatePolygonEffectiveWindArea({vertices:data.footprintVertices,areaBasis:basis,component:"footprint"});
    const zone=calculatePolygonEffectiveWindArea({vertices:data.zoneVertices,areaBasis:basis,component:"zone"});
    const toPoints=vertices=>vertices.map(p=>({x:Number(p.x),y:Number(p.y)}));
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const signedArea=points=>points.reduce((sum,p,i)=>{
      const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;
    },0)/2;
    const triangulate=raw=>{
      const points=toPoints(raw);
      const orientation=Math.sign(signedArea(points));
      if(!orientation)throw new RangeError("چندضلعی برای مثلث‌بندی مساحت ندارد.");
      const indices=points.map((_,i)=>i), triangles=[];
      const insideStrict=(p,a,b,c)=>{
        const x=cross(a,b,p)*orientation,y=cross(b,c,p)*orientation,z=cross(c,a,p)*orientation;
        return x>1e-10&&y>1e-10&&z>1e-10;
      };
      let guard=0;
      while(indices.length>3&&guard++<points.length*points.length){
        let clipped=false;
        for(let k=0;k<indices.length;k++){
          const ia=indices[(k+indices.length-1)%indices.length],ib=indices[k],ic=indices[(k+1)%indices.length];
          const a=points[ia],b=points[ib],c=points[ic];
          if(cross(a,b,c)*orientation<=1e-10)continue;
          let occupied=false;
          for(const ix of indices){
            if(ix===ia||ix===ib||ix===ic)continue;
            if(insideStrict(points[ix],a,b,c)){occupied=true;break;}
          }
          if(occupied)continue;
          triangles.push([a,b,c]);indices.splice(k,1);clipped=true;break;
        }
        if(!clipped)throw new Error("مثلث‌بندی چندضلعی ناموفق است؛ هندسه باید ساده و بدون ابهام باشد.");
      }
      if(indices.length!==3)throw new Error("مثلث‌بندی چندضلعی کامل نشد.");
      triangles.push(indices.map(i=>points[i]));
      return triangles;
    };
    const clipConvex=(subject,clip)=>{
      let output=subject;
      const orient=Math.sign(signedArea(clip));
      for(let i=0;i<clip.length&&output.length;i++){
        const a=clip[i],b=clip[(i+1)%clip.length],inputPoints=output;output=[];
        const inside=p=>cross(a,b,p)*orient>=-1e-10;
        const intersection=(p,q)=>{
          const rx=q.x-p.x,ry=q.y-p.y,sx=b.x-a.x,sy=b.y-a.y;
          const denominator=rx*sy-ry*sx;
          if(Math.abs(denominator)<=1e-14)return {x:(p.x+q.x)/2,y:(p.y+q.y)/2};
          const t=((a.x-p.x)*sy-(a.y-p.y)*sx)/denominator;
          return {x:p.x+t*rx,y:p.y+t*ry};
        };
        for(let j=0;j<inputPoints.length;j++){
          const current=inputPoints[j],previous=inputPoints[(j+inputPoints.length-1)%inputPoints.length];
          const ci=inside(current),pi=inside(previous);
          if(ci){if(!pi)output.push(intersection(previous,current));output.push(current);}
          else if(pi)output.push(intersection(previous,current));
        }
      }
      return output;
    };
    const polygonArea=points=>points.length<3?0:Math.abs(signedArea(points));
    const ft=triangulate(data.footprintVertices),zt=triangulate(data.zoneVertices);
    let overlap=0;
    for(const a of ft)for(const b of zt)overlap+=polygonArea(clipConvex(a,b));
    const tolerance=Math.max(1,footprint.effectiveAreaM2)*1e-9;
    if(overlap<0&&overlap>-tolerance)overlap=0;
    if(overlap>footprint.effectiveAreaM2&&overlap-footprint.effectiveAreaM2<=tolerance)
      overlap=footprint.effectiveAreaM2;
    if(!Number.isFinite(overlap)||overlap<0||overlap>footprint.effectiveAreaM2+tolerance)
      throw new Error("نتیجه هم‌پوشانی از حدود سطح بارگیر عضو خارج است.");
    return Object.freeze({
      component:typeof data.component==="string"&&data.component.trim()?data.component.trim():"unspecified",
      zoneId:typeof data.zoneId==="string"&&data.zoneId.trim()?data.zoneId.trim():null,
      areaBasis:basis,
      footprintAreaM2:footprint.effectiveAreaM2,
      zoneAreaM2:zone.effectiveAreaM2,
      overlapAreaM2:overlap,
      footprintOverlapRatio:overlap/footprint.effectiveAreaM2,
      geometryMethod:"ear-clipping-plus-triangle-convex-clipping",
      verificationStatus:"geometry-only-not-code-verified",
      coefficientSource:null,
      pressureReady:false,
      warning:"هم‌پوشانی صرفاً هندسی است؛ اعتبار zoneId، مرز ناحیه، ضریب C&C، حدود سطح مؤثر و فشار طراحی باید مستقل از منبع رسمی احراز شود."
    });
  }


  function polygonTripleOverlapWithinFootprint(footprintVertices,zoneAVertices,zoneBVertices) {
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const signedArea=points=>points.reduce((sum,p,i)=>{
      const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;
    },0)/2;
    const triangulate=raw=>{
      const points=raw.map(p=>({x:Number(p.x),y:Number(p.y)}));
      const orientation=Math.sign(signedArea(points));
      if(!orientation)throw new RangeError("چندضلعی هم‌پوشانی مساحت ندارد.");
      const indices=points.map((_,i)=>i),triangles=[];
      const insideStrict=(p,a,b,c)=>{
        const x=cross(a,b,p)*orientation,y=cross(b,c,p)*orientation,z=cross(c,a,p)*orientation;
        return x>1e-10&&y>1e-10&&z>1e-10;
      };
      let guard=0;
      while(indices.length>3&&guard++<points.length*points.length){
        let clipped=false;
        for(let k=0;k<indices.length;k++){
          const ia=indices[(k+indices.length-1)%indices.length],ib=indices[k],ic=indices[(k+1)%indices.length];
          const a=points[ia],b=points[ib],d=points[ic];
          if(cross(a,b,d)*orientation<=1e-10)continue;
          if(indices.some(ix=>ix!==ia&&ix!==ib&&ix!==ic&&insideStrict(points[ix],a,b,d)))continue;
          triangles.push([a,b,d]);indices.splice(k,1);clipped=true;break;
        }
        if(!clipped)throw new Error("مثلث‌بندی برای ممیزی هم‌پوشانی نواحی باد ناموفق است.");
      }
      if(indices.length!==3)throw new Error("مثلث‌بندی نواحی باد کامل نشد.");
      triangles.push(indices.map(i=>points[i]));return triangles;
    };
    const clip=(subject,clipTriangle)=>{
      let output=subject;const orient=Math.sign(signedArea(clipTriangle));
      for(let i=0;i<clipTriangle.length&&output.length;i++){
        const a=clipTriangle[i],b=clipTriangle[(i+1)%clipTriangle.length],input=output;output=[];
        const inside=p=>cross(a,b,p)*orient>=-1e-10;
        const intersection=(p,q)=>{
          const rx=q.x-p.x,ry=q.y-p.y,sx=b.x-a.x,sy=b.y-a.y,den=rx*sy-ry*sx;
          if(Math.abs(den)<=1e-14)return{x:(p.x+q.x)/2,y:(p.y+q.y)/2};
          const t=((a.x-p.x)*sy-(a.y-p.y)*sx)/den;return{x:p.x+t*rx,y:p.y+t*ry};
        };
        for(let j=0;j<input.length;j++){
          const cur=input[j],prev=input[(j+input.length-1)%input.length],ci=inside(cur),pi=inside(prev);
          if(ci){if(!pi)output.push(intersection(prev,cur));output.push(cur);}
          else if(pi)output.push(intersection(prev,cur));
        }
      }
      return output;
    };
    const area=points=>points.length<3?0:Math.abs(signedArea(points));
    const [ft,at,bt]=[footprintVertices,zoneAVertices,zoneBVertices].map(triangulate);
    let total=0;
    for(const f of ft)for(const a of at){
      const fa=clip(f,a);if(fa.length<3)continue;
      for(const b of bt)total+=area(clip(fa,b));
    }
    return total;
  }

  // Audits whether a supplied set of geometric wind zones partitions a member
  // footprint without gaps or overlaps. Zone boundaries remain user-supplied;
  // this function never declares them code-compliant.
  function auditPolygonWindZoneCoverage(input) {
    const data=input||{}, zones=data.zones;
    if(!Array.isArray(zones)||zones.length<1)
      throw new RangeError("حداقل یک ناحیه هندسی برای ممیزی پوشش لازم است.");
    const basis=data.areaBasis;
    if(basis!=="projected"&&basis!=="sloped-surface")
      throw new RangeError("مبنای سطح پوشش باید projected یا sloped-surface باشد.");
    const footprint=calculatePolygonEffectiveWindArea({
      vertices:data.footprintVertices,areaBasis:basis,component:"audited-footprint"
    });
    const overlaps=zones.map((zone,index)=>{
      if(!zone||!Array.isArray(zone.vertices))
        throw new TypeError("هندسه ناحیه شماره "+index+" معتبر نیست.");
      const result=calculatePolygonWindZoneOverlap({
        footprintVertices:data.footprintVertices,
        zoneVertices:zone.vertices,
        areaBasis:basis,
        component:zone.component||"unspecified",
        zoneId:zone.id||("zone-"+(index+1))
      });
      return Object.freeze({zoneId:zone.id||("zone-"+(index+1)),overlapAreaM2:result.overlapAreaM2,
        footprintOverlapRatio:result.footprintOverlapRatio});
    });
    let pairwiseOverlap=0, overlapPairs=0;
    for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++){
      const common=polygonTripleOverlapWithinFootprint(
        data.footprintVertices,zones[i].vertices,zones[j].vertices
      );
      if(common>Math.max(1,footprint.effectiveAreaM2)*1e-9){
        pairwiseOverlap+=common;overlapPairs++;
      }
    }
    const sumCovered=overlaps.reduce((sum,item)=>sum+item.overlapAreaM2,0);
    const tolerance=Math.max(1,footprint.effectiveAreaM2)*1e-8;
    const hasOverlap=overlapPairs>0;
    const uncoveredArea=hasOverlap?null:Math.max(0,footprint.effectiveAreaM2-sumCovered);
    const outsideFootprintArea=zones.reduce((sum,zone)=>{
      const z=calculatePolygonEffectiveWindArea({vertices:zone.vertices,areaBasis:basis});
      const inside=calculatePolygonWindZoneOverlap({footprintVertices:data.footprintVertices,
        zoneVertices:zone.vertices,areaBasis:basis}).overlapAreaM2;
      return sum+Math.max(0,z.effectiveAreaM2-inside);
    },0);
    const fullyCovered=!hasOverlap&&uncoveredArea<=tolerance&&outsideFootprintArea<=tolerance;
    const partitionValid=fullyCovered;
    return Object.freeze({
      areaBasis:basis,
      footprintAreaM2:footprint.effectiveAreaM2,
      zones:overlaps,
      summedOverlapAreaM2:sumCovered,
      pairwiseOverlapAreaM2:pairwiseOverlap,
      overlappingZonePairs:overlapPairs,
      uncoveredFootprintAreaM2:uncoveredArea,
      zonesOutsideFootprintAreaM2:outsideFootprintArea,
      coverageStatus:hasOverlap?"overlapping-zones":fullyCovered?"covered-without-overlap":"incomplete-or-outside",
      geometricPartitionValid:partitionValid,
      verificationStatus:"geometry-only-not-code-verified",
      pressureReady:false,
      warning:"این ممیزی فقط چندضلعی‌های ورودی را از نظر پوشش و هم‌پوشانی بررسی می‌کند؛ مرزها و شناسه نواحی باید از منبع رسمی آیین‌نامه احراز شوند و نتیجه مجوز تولید فشار طراحی نیست."
    });
  }

  function mapWindZonePressuresToMembers(model, pressureResult, internalScenario) {
    if (!model || !Array.isArray(model.members)) throw new TypeError("مدل دارای فهرست اعضای معتبر نیست.");
    if (!pressureResult || pressureResult.ready !== true || !pressureResult.rows || !WIND_DIRECTIONS.includes(pressureResult.direction))
      throw new Error("فشارهای شش‌ناحیه‌ای کامل و دارای جهت باد معتبر نیستند؛ انتقال بار متوقف شد.");
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
    return Object.freeze({schemaVersion:"1.3.0",windDirection:pressureResult.direction,internalScenario,convention:"signed net pressure; kN/m2 multiplied by member tributary width/height to kN/m",windProcedure:classifyWindProcedure(model.geometry),applicationScope:"preliminary-global-surface-pressure",componentsCladdingStatus:"not-independently-designed",codeComplianceStatus:"not-established",designWarning:"Six broad surface pressures are not a substitute for separate MWFRS and components-and-cladding procedures, including local edge/corner zones and applicable effective wind areas.",memberLoads:Object.freeze(memberLoads),endFacePressures:Object.freeze(endFacePressures),counts:Object.freeze({roofPurlins:mappedRoof,longitudinalWallGirts:mappedWalls,endWallGirts:mappedEndWalls})});
  }

  function checkWindDrift(model, displacementRecords, windDirection, limitRatio) {
    const directions=WIND_DIRECTIONS;
    const ratio=limitRatio===undefined?0.0025:Number(limitRatio);
    if(!model||!Array.isArray(model.nodes)||!Array.isArray(model.members)||
       !Array.isArray(displacementRecords)||!directions.includes(windDirection)||
       !Number.isFinite(ratio)||ratio<=0)
      return Object.freeze({ready:false,ok:false,reason:"ورودی کنترل دریفت باد ناقص یا نامعتبر است."});
    const height=Number(model.geometry&&model.geometry.height);
    if(!Number.isFinite(height)||height<=0)
      return Object.freeze({ready:false,ok:false,reason:"ارتفاع مبنای کنترل دریفت معتبر نیست."});
    const axis=windDirection.startsWith("transverse-")?0:2;
    const dispById=new Map(displacementRecords.map(item=>[String(item.nodeId),item.values]));
    const tolerance=1e-7, topCandidates=[];
    model.nodes.forEach(node=>{
      if(!(Number(node.y)>=height*0.9))return;
      const base=model.nodes.find(candidate=>
        Math.abs(Number(candidate.y))<=tolerance&&
        Math.abs(Number(candidate.x)-Number(node.x))<=tolerance&&
        Math.abs(Number(candidate.z)-Number(node.z))<=tolerance);
      if(base)topCandidates.push({top:node,base});
    });
    if(!topCandidates.length)
      return Object.freeze({ready:false,ok:false,reason:"گره‌های متناظر پایه و بالای ستون برای کنترل دریفت پیدا نشدند."});
    let maximum=0,critical=null;
    for(const pair of topCandidates){
      const topD=dispById.get(String(pair.top.id)),baseD=dispById.get(String(pair.base.id));
      if(!Array.isArray(topD)||!Array.isArray(baseD)||
         !Number.isFinite(Number(topD[axis]))||!Number.isFinite(Number(baseD[axis])))
        return Object.freeze({ready:false,ok:false,reason:"جابجایی یکی از گره‌های کنترل دریفت در خروجی تحلیل موجود نیست."});
      const drift=Math.abs(Number(topD[axis])-Number(baseD[axis]));
      if(drift>maximum){maximum=drift;critical={topNodeId:pair.top.id,baseNodeId:pair.base.id};}
    }
    const ratioActual=maximum/height;
    return Object.freeze({ready:true,ok:ratioActual<=ratio,windDirection,axis:axis===0?"X":"Z",
      maximumRelativeDisplacementM:maximum,heightM:height,driftRatio:ratioActual,limitRatio:ratio,
      criticalPair:critical,checkedPairs:topCandidates.length,
      serviceWindApproximation:"0.8V; pressure scale 0.64 relative to 50-year basic wind pressure"});
  }

  function applyWindZonePressureMapping(model, pressureResult, internalScenario) {
    const mapping = mapWindZonePressuresToMembers(model, pressureResult, internalScenario);
    const members = model.members.map(member => {
      const mapped = mapping.memberLoads[String(member.id)];
      if (!mapped) return { ...member, lineLoads: { ...(member.lineLoads || {}) } };
      return { ...member, lineLoads: { ...(member.lineLoads || {}), ...mapped } };
    });
    return Object.freeze({
      model: { ...model, members },
      mapping
    });
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
    surfacePressureToLineLoad, equalStationTributaryWidths, triangularGableWindResultant, WIND_DIRECTIONS, REQUIRED_WIND_ZONES, classifyWindProcedure, calculateRectangularEffectiveWindArea, buildMemberTributaryFootprint, calculatePolygonEffectiveWindArea, calculatePolygonWindZoneOverlap, auditPolygonWindZoneCoverage,
    triangularGablePostEquivalentLoads, calculateWindZonePressures, mapWindZonePressuresToMembers, applyWindZonePressureMapping, checkWindDrift, preliminaryWindCombinations
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
