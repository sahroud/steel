/* SAHROUD STEEL — Wind zone geometry engine
 * Geometry only. No code coefficients, pressure values, or load transfer are generated here.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const finite = v => Number.isFinite(Number(v)) ? Number(v) : null;

  function partitionRectangle(width, length, depth, prefix) {
    if (![width, length, depth].every(v => Number.isFinite(v) && v > 0))
      throw new Error("ابعاد سطح و عمق ناحیه باید مثبت و معتبر باشند.");
    if (2 * depth >= Math.min(width, length))
      throw new Error("عمق ناحیه لبه باید کمتر از نصف بعد کوچک‌تر سطح باشد؛ مقدار را بررسی کنید.");
    const xs = [0, depth, width - depth, width];
    const ys = [0, depth, length - depth, length];
    const cells = [];
    for (let ix = 0; ix < 3; ix++) for (let iy = 0; iy < 3; iy++) {
      const w = xs[ix + 1] - xs[ix], l = ys[iy + 1] - ys[iy];
      const xEdge = ix !== 1, yEdge = iy !== 1;
      const zone = "unclassified";
      cells.push({
        id: prefix + "-cell-" + (ix + 1) + "-" + (iy + 1),
        zone, gridPosition: { x: ix + 1, y: iy + 1 }, boundaryFlags: { xEdge, yEdge }, x0: xs[ix], x1: xs[ix + 1], y0: ys[iy], y1: ys[iy + 1],
        widthM: w, lengthM: l, areaM2: w * l,
        coefficient: null, coefficientSource: null,
        status: "generic-geometric-cell-not-code-zone"
      });
    }
    const area = cells.reduce((s, c) => s + c.areaM2, 0);
    if (Math.abs(area - width * length) > 1e-8 * Math.max(1, width * length))
      throw new Error("کنترل مساحت نواحی سطح " + prefix + " ناموفق است.");
    return { prefix, widthM: width, lengthM: length, edgeDepthM: depth, totalAreaM2: area, cells };
  }

  function build(input) {
    const g = input || {};
    const span = finite(g.span), length = finite(g.length), height = finite(g.height);
    const rise = finite(g.rise), overhang = finite(g.roofOverhang);
    const roofDepth = finite(g.roofEdgeDepth), wallDepth = finite(g.wallEdgeDepth);
    const endDepth = finite(g.endWallEdgeDepth);
    if (![span, length, height, rise, overhang].every(v => v !== null && v > 0) || rise < 0 || overhang < 0)
      throw new Error("هندسه پروژه معتبر نیست.");
    if ([roofDepth, wallDepth, endDepth].some(v => v === null || v <= 0))
      throw new Error("عمق ناحیه لبه برای سقف، دیوار طولی و دیوار انتهایی باید جداگانه و با استناد آیین‌نامه وارد شود.");

    const half = span / 2;
    const slopeLength = Math.hypot(half, rise);
    const roofPanelLength = slopeLength + overhang / (half / slopeLength);
    const roofPlanLength = length + 2 * overhang;
    const roofLeft = partitionRectangle(roofPanelLength, roofPlanLength, roofDepth, "roof-left");
    const roofRight = partitionRectangle(roofPanelLength, roofPlanLength, roofDepth, "roof-right");
    const longWallLeft = partitionRectangle(height, length, wallDepth, "long-wall-left");
    const longWallRight = partitionRectangle(height, length, wallDepth, "long-wall-right");
    const endWallGrossArea = span * height + span * rise / 2;
    const endWallRect = partitionRectangle(span, height, endDepth, "end-wall-rectangular-reference");
    return {
      schema: "sahroud-steel-wind-zone-geometry", version: 1,
      generatedAt: new Date().toISOString(),
      coordinateConvention: { X: "transverse span", Y: "vertical", Z: "building length", positiveZ: "rear", negativeZ: "front" },
      geometry: { spanM: span, lengthM: length, eavesHeightM: height, riseM: rise, roofOverhangHorizontalM: overhang, roofOverhangAlongSlopeM: overhang / (half / slopeLength), roofSlopeLengthWithoutOverhangM: slopeLength, roofPanelLengthWithEaveOverhangM: roofPanelLength, roofPlanLengthWithEndOverhangM: roofPlanLength },
      surfaces: [
        roofLeft, roofRight, longWallLeft, longWallRight,
        { prefix: "end-wall-front", grossAreaM2: endWallGrossArea, shape: "gable-polygon", partitionStatus: "not-partitioned-triangle-needs-code-verified-method", coefficient: null },
        { prefix: "end-wall-rear", grossAreaM2: endWallGrossArea, shape: "gable-polygon", partitionStatus: "not-partitioned-triangle-needs-code-verified-method", coefficient: null }
      ],
      endWallRectangularReference: { grossAreaM2: span * height, zoning: endWallRect, note: "فقط مستطیل زیر خط لبه بام؛ مثلث بالای دیوار جداست و در این نسخه به‌عنوان ناحیه فشار تقسیم نشده است." },
      checks: {
        roofPairAreaM2: 2 * roofPanelLength * roofPlanLength,
        longWallPairAreaM2: 2 * height * length,
        endWallPairGrossAreaM2: 2 * endWallGrossArea,
        coefficientRegistryComplete: false,
        loadTransferEnabled: false,
        codeDesignEligible: false
      },
      warnings: [
        "این شبکه ۳×۳ صرفاً شبکه‌بندی هندسی عمومی است و به هیچ‌وجه نواحی آیین‌نامه‌ای مبحث ششم محسوب نمی‌شود.",
        "عمق شبکه‌های نمایشی صرفاً برای کنترل هندسه است؛ تا زمان ثبت ضابطه معتبر، هیچ انتساب آیین‌نامه‌ای ندارد.",
        "ضرایب فشار خارجی و داخلی هنوز ثبت نشده‌اند؛ هیچ فشار یا بار خطی تولید نمی‌شود.",
        "دیوارهای انتهایی گابل و مثلثی هنوز طبق شکل رسمی تقسیم نشده‌اند."
      ]
    };
  }

  function render() {
    if ($("windZoneGeometryPanel")) return;
    const anchor = $("shedLayoutPanel") || $("directionalWindPanel") || $("climateLoadCasePanel");
    if (!anchor || !anchor.parentNode) return;
    const panel = document.createElement("section");
    panel.className = "panel"; panel.id = "windZoneGeometryPanel";
    panel.innerHTML =
      '<div class="panel-title"><h3>شبکه‌بندی هندسی عمومی سطوح باد</h3><span class="status">هندسه مقدماتی</span></div>' +
      '<div class="notice">این شبکه فقط برای کنترل هندسه است؛ نواحی 1/1E/2/2E و ضرایب مبحث ششم را نمایش نمی‌دهد. تا تأیید شکل و بند رسمی، خروجی بار طراحی نیست.</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="windZoneRoofDepth">عمق شبکه نمایشی سقف (m)</label><input id="windZoneRoofDepth" type="number" min="0.01" step="0.01" placeholder="طبق مبحث ششم"></div>' +
      '<div class="field"><label for="windZoneWallDepth">عمق شبکه نمایشی دیوار طولی (m)</label><input id="windZoneWallDepth" type="number" min="0.01" step="0.01" placeholder="طبق مبحث ششم"></div>' +
      '<div class="field"><label for="windZoneEndDepth">عمق شبکه مرجع مستطیل انتهایی (m)</label><input id="windZoneEndDepth" type="number" min="0.01" step="0.01" placeholder="طبق مبحث ششم"></div></div>' +
      '<button type="button" class="btn primary" id="btnBuildWindZones">محاسبه هندسه نواحی</button>' +
      '<div id="windZoneGeometryResult" class="notice" aria-live="polite">برای محاسبه، عمق‌های شبکه هندسی عمومی را وارد کنید.</div>';
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    $("btnBuildWindZones").addEventListener("click", () => {
      const box = $("windZoneGeometryResult");
      try {
        const model = window.SteelStructuralModel?.build?.();
        if (!model || !model.geometry) throw new Error("ابتدا مدل هندسی سوله را تولید کنید.");
        const g = model.geometry;
        const result = build({
          span: g.span, length: g.length, height: g.height, rise: g.rise, roofOverhang: g.roofOverhang,
          roofEdgeDepth: $("windZoneRoofDepth").value,
          wallEdgeDepth: $("windZoneWallDepth").value,
          endWallEdgeDepth: $("windZoneEndDepth").value
        });
        window.SteelWindZoneEngine.lastResult = result;
        const lines = result.surfaces.map(s => s.prefix + ": " +
          (s.cells ? s.cells.length + " قطعه، مساحت " + s.totalAreaM2.toFixed(3) + " m²" :
            "مساحت ناخالص " + s.grossAreaM2.toFixed(3) + " m²؛ تقسیم‌بندی غیرفعال"));
        box.textContent = "شبکه هندسی عمومی محاسبه شد؛ این قطعات نواحی آیین‌نامه‌ای نیستند و هیچ ضریب/باری ندارند.\n" +
          lines.join("\n") + "\nکنترل مساحت سقف: " + result.checks.roofPairAreaM2.toFixed(3) +
          " m² | دیوارهای طولی: " + result.checks.longWallPairAreaM2.toFixed(3) +
          " m² | دیوارهای انتهایی: " + result.checks.endWallPairGrossAreaM2.toFixed(3) +
          " m²\n" + result.warnings.join("\n");
        box.style.color = "#92400e";
      } catch (e) { box.textContent = "محاسبه انجام نشد: " + e.message; box.style.color = "#b45309"; }
    });
  }

  window.SteelWindZoneEngine = {
    build, partitionRectangle,
    getLastResult: () => window.SteelWindZoneEngine.lastResult || null,
    lastResult: null,
    codeDesignEligible: false,
    loadTransferEnabled: false
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();