/* SAHROUD STEEL — legacy SPS parser (read-only, fail-closed).
 * Parses INI-like key/value text without assigning engineering meaning, units,
 * physical member IDs, station coordinates, or solver eligibility.
 */
(function (root) {
  "use strict";

  const VERSION = "1.0.0";
  const INDEXED_KEY = /^(.*?)(\\d+)$/;

  function parse(text) {
    if (typeof text !== "string") throw new TypeError("SPS input must be text.");
    const lines = text.replace(/^\\uFEFF/, "").split(/\\r?\\n/);
    const entries = [];
    const warnings = [];
    const sections = [];
    const seen = new Map();
    let section = "";

    lines.forEach((raw, index) => {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) return;
      const sectionMatch = /^\\[([^\\]]+)\\]$/.exec(trimmed);
      if (sectionMatch) {
        section = sectionMatch[1].trim();
        sections.push({ name: section, line: index + 1 });
        return;
      }
      const split = trimmed.search(/[=:]/);
      if (split < 1) {
        warnings.push({ code: "UNPARSED_LINE", line: index + 1, raw });
        return;
      }
      const key = trimmed.slice(0, split).trim();
      const value = trimmed.slice(split + 1).trim();
      if (!key) {
        warnings.push({ code: "EMPTY_KEY", line: index + 1, raw });
        return;
      }
      const id = section + "\\u0000" + key;
      if (seen.has(id)) {
        warnings.push({
          code: "DUPLICATE_KEY",
          line: index + 1,
          firstLine: seen.get(id),
          section,
          key
        });
      } else {
        seen.set(id, index + 1);
      }
      entries.push({
        line: index + 1,
        section,
        key,
        rawValue: value,
        indexed: INDEXED_KEY.test(key)
      });
    });

    const groups = {};
    entries.forEach(entry => {
      const match = INDEXED_KEY.exec(entry.key);
      if (!match) return;
      const baseKey = match[1];
      const suffix = match[2];
      const groupKey = entry.section + "::" + baseKey;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push({
        suffix,
        rawValue: entry.rawValue,
        line: entry.line,
        sourceKey: entry.key
      });
    });

    return {
      schemaVersion: VERSION,
      recordType: "sahroud-steel-legacy-sps-parse",
      status: "parsed_raw_text_only",
      source: {
        lineCount: lines.length,
        parsedEntryCount: entries.length,
        sectionCount: sections.length
      },
      sections,
      entries,
      indexedKeyGroups: Object.keys(groups).sort().map(key => ({
        groupKey: key,
        records: groups[key]
      })),
      warnings,
      engineeringInterpretation: {
        units: "unresolved",
        suffixMeaning: "unresolved; do not assume physical station or member ID",
        memberGeometryGenerated: false,
        coordinatesGenerated: false,
        solverEnabled: false,
        designApproved: false
      }
    };
  }

  function selfTest() {
    const sample = [
      "; comment",
      "[FRAME]",
      "hfeach100=50",
      "hfeach101=90",
      "wind=0.00303",
      "wind=0.004",
      "not-a-pair",
      "[CRANE]",
      "tonajindex10:30000"
    ].join("\\n");
    const result = parse(sample);
    const indexed = result.indexedKeyGroups.find(g => g.groupKey === "FRAME::hfeach");
    const tests = [
      { name: "key-value-equals", pass: result.entries.some(e => e.key === "wind" && e.rawValue === "0.00303") },
      { name: "key-value-colon", pass: result.entries.some(e => e.key === "tonajindex10" && e.rawValue === "30000") },
      { name: "indexed-suffix-preserved", pass: !!indexed && indexed.records.map(r => r.suffix).join(",") === "100,101" },
      { name: "duplicate-key-warning", pass: result.warnings.some(w => w.code === "DUPLICATE_KEY") },
      { name: "unparsed-line-warning", pass: result.warnings.some(w => w.code === "UNPARSED_LINE") },
      { name: "fail-closed-engineering-flags", pass: result.engineeringInterpretation.solverEnabled === false && result.engineeringInterpretation.designApproved === false && result.engineeringInterpretation.units === "unresolved" },
      { name: "source-lines-preserved", pass: result.entries.every(e => Number.isInteger(e.line) && e.line > 0) }
    ];
    return { passed: tests.filter(t => t.pass).length, total: tests.length, tests };
  }

  root.SteelLegacySPSParser = Object.freeze({
    version: VERSION,
    parse,
    selfTest
  });
})(typeof window !== "undefined" ? window : globalThis);
