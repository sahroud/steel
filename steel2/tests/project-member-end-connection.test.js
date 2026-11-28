"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function projectHarness() {
  const values = {
    projectName: "سوله آزمایشی",
    owner: "کارفرما",
    designer: "طراح",
    city: "شاهرود",
    baseConnection: "pinned",
    span: "12",
    length: "36",
    spacing: "6",
    height: "6",
    roofSlope: "20",
    rise: "2",
    frames: "",
    dead: "0.3",
    live: "0.2",
    wind: "0.8",
    snow: "0.5"
  };
  const elements = new Map();
  for (const [id, value] of Object.entries(values)) {
    elements.set(id, {
      id, value, textContent: "", listeners: {},
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    });
  }
  elements.set("projectStatus", { textContent: "" });
  const storage = new Map();
  const document = {
    visibilityState: "visible",
    body: { appendChild(node) { node.parentNode = this; } },
    getElementById(id) { return elements.get(id) || null; },
    createElement(tag) {
      return { tagName: tag, click() { this.clicked = true; }, remove() { this.removed = true; } };
    },
    addEventListener() {}
  };
  let exportedBlob = null;
  class BlobCapture {
    constructor(parts, options) { this.parts = parts; this.type = options?.type || ""; exportedBlob = this; }
    async text() { return this.parts.join(""); }
  }
  const memberRecords = [];
  const memberUi = {
    getData() { return memberRecords.map(x => ({ ...x })); },
    setData(items) {
      memberRecords.splice(0, memberRecords.length, ...items.map(x => ({ ...x })));
    }
  };
  const structuralModel = { value: { members: [] } };
  const context = {
    console,
    document,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    window: null,
    Blob: BlobCapture,
    URL: {
      createObjectURL(blob) { exportedBlob = blob; return "blob:test-project"; },
      revokeObjectURL() {}
    },
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    alert(message) { throw new Error("Unexpected alert: " + message); },
    FileReader: class {
      readAsText(file) { this.result = file.content; this.onload(); }
    }
  };
  context.window = context;
  context.SahroudMemberEndConnectionUI = memberUi;
  context.SteelStructuralModel = {
    getData() { return structuralModel.value; },
    setData(value) { structuralModel.value = value; }
  };
  context.addEventListener = () => {};
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js/project.js"), "utf8"),
    context,
    { filename: "project.js" }
  );
  return {
    project: context.SteelProject,
    memberRecords,
    storage,
    elements,
    getExport: () => exportedBlob
  };
}

const selectedConnections = [
  { memberId: "WALL-BAY-1", i: "pinned", j: "continuous" },
  { memberId: "ROOF-BAY-1", i: "continuous", j: "pinned" }
];

test("project JSON export includes both independently selected brace end assumptions", async () => {
  const h = projectHarness();
  h.memberRecords.push(...selectedConnections);
  h.project.save();

  const blob = h.getExport();
  assert.ok(blob, "save should create a project JSON blob");
  const exported = JSON.parse(await blob.text());
  assert.deepEqual(exported.memberEndConnections, selectedConnections);
  assert.equal(exported.projectName, "سوله آزمایشی");
  assert.equal(exported.software, "SAHROUD STEEL");
});

test("project JSON import restores brace end assumptions and persists them in browser autosave", () => {
  const h = projectHarness();
  const imported = {
    projectName: "پروژه واردشده",
    owner: "کارفرما",
    designer: "طراح",
    city: "شاهرود",
    baseConnection: "pinned",
    span: 12, length: 36, spacing: 6, height: 6, rise: 2,
    dead: 0.3, live: 0.2, wind: 0.8, snow: 0.5,
    memberEndConnections: selectedConnections,
    structuralModel: { members: [{ id: "WALL-BAY-1", sectionKey: "wallBrace" }] }
  };
  h.project.loadFile({ content: JSON.stringify(imported) });

  assert.deepEqual(h.memberRecords, selectedConnections);
  assert.equal(h.elements.get("projectName").value, "پروژه واردشده");
  const autosave = JSON.parse(h.storage.get("sahroudSteelProject.autosave.v3"));
  assert.deepEqual(autosave.memberEndConnections, selectedConnections);
  assert.deepEqual(autosave.structuralModel, imported.structuralModel);
});

test("legacy project without brace end settings loads with an empty selection set", () => {
  const h = projectHarness();
  const legacy = {
    projectName: "پروژه قدیمی",
    span: 12, length: 36, spacing: 6, height: 6, rise: 2,
    dead: 0, live: 0, wind: 0, snow: 0
  };
  h.project.loadData(legacy);
  assert.deepEqual(h.memberRecords, []);
  const autosave = JSON.parse(h.storage.get("sahroudSteelProject.autosave.v3"));
  assert.deepEqual(autosave.memberEndConnections, []);
});
