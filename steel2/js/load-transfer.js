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

  function triangularGablePostEquivalentLoads(pressureKPa, spanM, riseM, postIntervals) {
    const p = Number(pressureKPa), span = Number(spanM), rise = Number(riseM), count = Number(postIntervals);
    if (!Number.isFinite(p)) throw new TypeError("فشار باد باید عدد محدود باشد.");
    if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(rise) || rise < 0)
      throw new RangeError("دهانه باید مثبت و ارتفاع مثلث نامنفی باشد.");
    if (!Number.isInteger(count) || count < 2)
      throw new RangeError("تعداد فاصله ستونک‌ها باید عدد صحیح حداقل دو باشد.");
    const half = span / 2;
    const heightAt = x => rise * (x <= half ? x / half : (span - x) / half);
    const integrate = (a, b) => {
      const cuts = [a];
      if (a < half && b > half) cuts.push(half);
      cuts.push(b);
      let area = 0, squareIntegral = 0;
      for (let k = 0; k < cuts.length - 1; k++) {
        const x0 = cuts[k], x1 = cuts[k + 1], dx = x1 - x0;
        const h0 = heightAt(x0), h1 = heightAt(x1);
        area += dx * (h0 + h1) / 2;
        squareIntegral += dx * (h0 * h0 + h0 * h1 + h1 * h1) / 3;
      }
      return { area, firstMomentY: squareIntegral / 2 };
    };
    const posts = [];
    for (let i = 1; i < count; i++) {
      const x = span * i / count;
      const left = (span * (i - 1) / count + x) / 2;
      const right = (x + span * (i + 1) / count) / 2;
      const cell = integrate(left, right);
      const h = heightAt(x);
      const resultant = p * cell.area;
      const centroidY = cell.area > 0 ? cell.firstMomentY / cell.area : 0;
      const topForce = h > 0 ? resultant * centroidY / h : 0;
      posts.push(Object.freeze({
        post: i, xM: x, tributaryLeftM: left, tributaryRightM: right,
        tributaryAreaM2: cell.area, resultantKN: resultant,
        centroidYAboveEaveM: centroidY,
        baseForceKN: resultant - topForce, topForceKN: topForce,
        postHeightM: h
      }));
    }
    return Object.freeze(posts);
  }
  root.SteelLoadTransfer = Object.freeze({
    surfacePressureToLineLoad, equalStationTributaryWidths, triangularGableWindResultant,
    triangularGablePostEquivalentLoads
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
