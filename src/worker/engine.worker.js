/* ═══════════════════════════════════════════════════════════════
   WEB WORKER — toàn bộ xử lý dữ liệu chạy ở luồng riêng
   ⇒ giao diện không bị treo khi xử lý hàng trăm nghìn dòng.
   Giao thức: { id, method, args } → { id, ok, result | error }  ·  sự kiện tiến độ: { type: "progress", … }
   ═══════════════════════════════════════════════════════════════ */
import { Engine, EngineError } from "../engine/engine.js";
import * as X from "../engine/io/export.js";
import * as V from "../engine/views.js";
import { testKeywords } from "../engine/steps/keywords.js";

const engine = new Engine();
let lastP = 0;
engine.onProgress = (p) => {
  const now = Date.now();
  if (now - lastP < 120 && p.pct < 1 && p.pct > 0) return;
  lastP = now;
  self.postMessage({ type: "progress", ...p });
};

function fileOut(r) { return { __transfer: [r.buffer], filename: r.filename, buffer: r.buffer }; }
const slim = (p) => { const { _warnings, _conflicts, ...rest } = p; return rest; };

const API = {
  getState: () => engine.getState(),
  addFiles: ({ files }) => { const r = engine.addFiles(files); return { ...r, state: engine.getState() }; },
  removeFile: ({ name }) => { engine.removeFile(name); return engine.getState(); },
  resetAll: () => { engine.resetData(); return engine.getState(); },
  confirmSources: ({ updates }) => { engine.confirmSources(updates); return engine.getState(); },
  getSchemaInfo: () => engine.getSchemaInfo(),
  setSchema: (args) => engine.setSchema(args),
  confirmSchema: () => { engine.confirmSchema(); return engine.getState(); },
  runStep: ({ id }) => { engine.runStep(id); return engine.getState(); },
  skipStep: ({ id }) => { engine.skipStep(id); return engine.getState(); },
  runAll: () => { const r = engine.runAll(); return { run: r, state: engine.getState() }; },
  updateSettings: ({ partial }) => { const r = engine.updateSettings(partial); return { ...r, state: engine.getState() }; },
  loadKeywords: ({ buffer, name }) => { const r = engine.loadKeywords(buffer, name); return { summary: { segments: r.segments.length, conflicts: r.conflicts.length, exclusions: r.exclusions.length, warnings: r.warnings }, state: engine.getState() }; },
  clearKeywords: () => { engine.clearKeywords(); return engine.getState(); },
  loadIndustry: ({ buffer, name }) => { const r = engine.loadIndustry(buffer, name); return { summary: r, state: engine.getState() }; },
  clearIndustry: () => { engine.clearIndustry(); return engine.getState(); },
  loadOverrides: ({ buffer, name }) => { const r = engine.loadOverrides(buffer, name); return { summary: r, state: engine.getState() }; },
  clearOverrides: () => { engine.clearOverrides(); return engine.getState(); },
  queryEntities: (a) => V.queryEntities(engine, a),
  queryPlaceholders: (a) => V.queryPlaceholders(engine, a),
  queryRanking: (a) => V.queryRanking(engine, a),
  queryRows: (a) => V.queryRows(engine, a),
  exportAudit: () => fileOut(X.buildAuditWorkbook(engine)),
  exportDetail: ({ year }) => fileOut(X.buildDetailWorkbook(engine, year)),
  exportResearch: ({ kind }) => fileOut(X.buildResearchWorkbook(engine, kind)),
  exportResearchMaster: () => fileOut(X.buildResearchMasterWorkbook(engine)),
  exportEntityReview: () => fileOut(X.buildEntityReviewWorkbook(engine)),
  exportTemplate: ({ kind }) => fileOut(X.buildTemplate(kind)),
  // hồ sơ sản phẩm
  exportProject: ({ meta, opts } = {}) => fileOut(X.exportProject(engine, meta, opts)),
  importProject: ({ buffer }) => { const r = X.importProject(engine, buffer); return { profile: slim(r.profile), warnings: r.warnings, conflicts: r.conflicts, invalidatedFrom: r.invalidatedFrom, state: engine.getState() }; },
  applyProfile: ({ profile }) => { const r = engine.applyProfile(profile); return { warnings: r.warnings, conflicts: r.conflicts, invalidatedFrom: r.invalidatedFrom, state: engine.getState() }; },
  buildProfile: ({ meta, opts } = {}) => engine.buildProfile(meta, opts),
  markProfileSaved: ({ profile }) => { engine.markProfileSaved(profile); return engine.getState(); },
  // bộ phân khúc
  getKeywords: () => engine.getKeywords(),
  setKeywords: ({ def, label }) => { const kw = engine.setKeywords(def, label); return { summary: { segments: kw.segments.length, conflicts: kw.conflicts, warnings: kw.warnings }, state: engine.getState() }; },
  previewKeywords: ({ def, opts }) => engine.previewKeywords(def, opts),
  testKeywords: ({ def, text }) => testKeywords(def, text, engine.settings.keywordMatchMode),
  exportKeywords: ({ def } = {}) => fileOut(X.buildKeywordWorkbook(engine, def)),
};

self.onmessage = (ev) => {
  const { id, method, args } = ev.data || {};
  const fn = API[method];
  if (!fn) { self.postMessage({ id, ok: false, error: { message: "Phương thức không tồn tại: " + method } }); return; }
  try {
    const result = fn(args || {});
    const transfer = result && result.__transfer ? result.__transfer : [];
    if (result && result.__transfer) delete result.__transfer;
    self.postMessage({ id, ok: true, result }, transfer);
  } catch (e) {
    console.error(e);
    self.postMessage({ id, ok: false, error: { message: e?.message || String(e), details: e instanceof EngineError ? e.details : undefined } });
  }
};
