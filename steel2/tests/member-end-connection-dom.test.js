"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

class Element {
  constructor(id = "") {
    this.id = id;
    this.value = "";
    this.textContent = "";
    this.className = "";
    this.listeners = {};
    this.children = [];
    this.parentNode = null;
    this._innerHTML = "";
  }
  set innerHTML(value) {
    this._innerHTML = value;
    const ids = [...String(value).matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    ids.forEach(id => {
      if (!this.ownerDocument.elements.has(id)) {
        const child = new Element(id);
        child.ownerDocument = this.ownerDocument;
        this.ownerDocument.elements.set(id, child);
      }
    });
  }
  get innerHTML() { return this._innerHTML; }
  addEventListener(type, callback) {
    (this.listeners[type] ||= []).push(callback);
  }
  dispatch(type, value) {
    this.value = value;
    for (const callback of this.listeners[type] || []) callback({ target: this });
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    if (child.id) this.ownerDocument.elements.set(child.id, child);
    return child;
  }
  insertBefore(child) { return this.appendChild(child); }
}

function loadUi() {
  const document = {
    readyState: "complete",
    elements: new Map(),
    body: null,
    createElement() {
      const el = new Element();
      el.ownerDocument = document;
      return el;
    },
    getElementById(id) { return this.elements.get(id) || null; },
    querySelector() { return null; },
    addEventListener() {}
  };
  document.body = new Element("body");
  document.body.ownerDocument = document;
  const window = { document };
  const context = { window, document, globalThis: window, console };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../js/member-end-connection-ui.js"), "utf8"),
    context,
    { filename: "member-end-connection-ui.js" }
  );
  return { api: window.SahroudMemberEndConnectionUI, document };
}

function shed(ids = ["WALL-X1", "ROOF-X1"]) {
  return { members: [
    { id: ids[0], sectionKey: "wallBrace" },
    { id: ids[1], sectionKey: "roofBrace" },
    { id: "COLUMN-1", sectionKey: "column" }
  ] };
}

test("DOM controls edit I and J independently and keep choices after model rebuild", () => {
  const { api, document } = loadUi();
  const first = shed();
  api.setModel(first);

  const member = document.getElementById("braceConnectionMember");
  const endI = document.getElementById("braceConnectionI");
  const endJ = document.getElementById("braceConnectionJ");
  assert.ok(member, "brace selector should be mounted");
  assert.ok(endI && endJ, "both end selectors should be mounted");
  assert.equal(member.value, "WALL-X1");

  endI.dispatch("change", "pinned");
  endJ.dispatch("change", "continuous");
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.members[0].endReleases)),
    { i: ["rx", "ry", "rz"] }
  );

  endJ.dispatch("change", "pinned");
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.members[0].endReleases)),
    { i: ["rx", "ry", "rz"], j: ["rx", "ry", "rz"] }
  );

  const rebuilt = shed();
  api.setModel(rebuilt);
  assert.deepEqual(
    JSON.parse(JSON.stringify(rebuilt.members[0].endReleases)),
    { i: ["rx", "ry", "rz"], j: ["rx", "ry", "rz"] }
  );
  assert.equal(document.getElementById("braceConnectionI").value, "pinned");
  assert.equal(document.getElementById("braceConnectionJ").value, "pinned");
});

test("DOM model replacement does not transfer stale brace settings to different member IDs", () => {
  const { api, document } = loadUi();
  api.setModel(shed());
  document.getElementById("braceConnectionI").dispatch("change", "pinned");

  const replacement = shed(["WALL-NEW", "ROOF-NEW"]);
  api.setModel(replacement);
  assert.equal(Object.hasOwn(replacement.members[0], "endReleases"), false);
  assert.equal(Object.hasOwn(replacement.members[1], "endReleases"), false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(api.getState().orphanedMemberIds)),
    ["WALL-X1"]
  );
});
