/* SAHROUD STEEL — traceable wind coefficient registry
 * Intentionally ships with no coefficient values. Entries require a verified code citation.
 */
(function () {
  "use strict";
  const EDITION = "Iran National Building Regulations, Part 6, 4th edition (1398)";
  const entries = new Map();
  const requiredText = ["id","surface","windDirection","zone","coefficientBasis","valueSource","clause","page"];
  const allowedBasis = new Set(["Cp","CgCp","Cpi","CgCpi","net-external-internal"]);

  function validateEntry(e) {
    const errors = [];
    if (!e || typeof e !== "object") return ["ورودی ضریب معتبر نیست."];
    requiredText.forEach(k => { if (e[k] == null || String(e[k]).trim() === "") errors.push("فیلد اجباری خالی است: " + k); });
    if (!allowedBasis.has(e.coefficientBasis)) errors.push("مبنای ضریب ناشناخته است.");
    if (!Number.isFinite(Number(e.value))) errors.push("مقدار ضریب باید عددی و محدود باشد.");
    if (!Number.isInteger(Number(e.page)) || Number(e.page) < 1) errors.push("شماره صفحه باید عدد صحیح مثبت باشد.");
    if (!e.table && !e.figure) errors.push("حداقل یکی از شماره جدول یا شکل باید ثبت شود.");
    if (e.edition !== EDITION) errors.push("ویرایش مرجع باید دقیقاً ویرایش چهارم ۱۳۹۸ باشد.");
    if (e.verified !== true) errors.push("ضریب تا زمان تطبیق با نسخه رسمی تأیید نشده است.");
    if (e.scope && typeof e.scope === "object") {
      ["minRoofPitchDeg","maxRoofPitchDeg","maxHeightM","maxHB"].forEach(k => {
        if (e.scope[k] != null && (!Number.isFinite(Number(e.scope[k])) || Number(e.scope[k]) < 0))
          errors.push("دامنه کاربرد نامعتبر است: " + k);
      });
    }
    return errors;
  }

  function add(entry) {
    const errors = validateEntry(entry);
    if (errors.length) return { ok: false, errors };
    if (entries.has(entry.id)) return { ok: false, errors: ["شناسه ضریب تکراری است: " + entry.id] };
    const copy = JSON.parse(JSON.stringify(entry));
    copy.sourceEdition = EDITION;
    entries.set(copy.id, copy);
    return { ok: true, entry: JSON.parse(JSON.stringify(copy)) };
  }
  function get(id) { const e=entries.get(id); return e ? JSON.parse(JSON.stringify(e)) : null; }
  function list(filter) {
    const f=filter||{};
    return Array.from(entries.values()).filter(e=>
      (!f.surface || e.surface===f.surface) &&
      (!f.windDirection || e.windDirection===f.windDirection) &&
      (!f.zone || e.zone===f.zone)
    ).map(e=>JSON.parse(JSON.stringify(e)));
  }
  function audit() {
    return {
      sourceEdition: EDITION, entryCount: entries.size,
      verifiedEntryCount: Array.from(entries.values()).filter(e=>e.verified===true).length,
      missingValues: entries.size===0,
      codeDesignEligible: false,
      note: "تا زمانی که تمام نواحی، دامنه کاربرد، فشار داخلی/خارجی و منابع رسمی تأیید نشده‌اند، این دفتر برای طراحی آیین‌نامه‌ای مجاز نیست."
    };
  }
  window.SteelWindCodeRegistry = { add, get, list, audit, validateEntry, edition: EDITION };
})();