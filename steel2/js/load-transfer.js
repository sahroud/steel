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
    triangularGablePostEquivalentLoads, preliminaryWindCombinations
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
