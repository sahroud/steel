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
  root.SteelLoadTransfer = Object.freeze({ surfacePressureToLineLoad, equalStationTributaryWidths });
})(typeof globalThis !== "undefined" ? globalThis : window);
