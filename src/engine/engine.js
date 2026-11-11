/* ═══════════════════════════════════════════════════════════════
   ENGINE — trạng thái dữ liệu + điều phối 15 bước
   Nguyên tắc:
   1. Dữ liệu gốc KHÔNG BAO GIỜ bị ghi đè. Mỗi bước ghi kết quả vào cột riêng.
   2. Chạy lại bước k ⇒ tự động xóa kết quả các bước sau k (tránh dữ liệu "lệch pha").
   3. Mỗi bước chỉ chạy khi các bước trước đã hoàn thành / được bỏ qua.
   4. Mọi tham số logic nằm trong settings và được ghi vào báo cáo để tái lập kết quả.
   ═══════════════════════════════════════════════════════════════ */
import { STEPS, STEP_INDEX, DEFAULT_SETTINGS, SETTING_STEP, SCHEMA_FIELDS, REQUIRED_FIELDS, NON_PROFILE_SETTINGS } from "./constants.js";
import { COLUMNS_BY_STEP } from "./columns.js";
import { readFileSources, YEAR_BY_DATE } from "./io/read.js";
import { normHeader } from "./text.js";
import * as prep from "./steps/prep.js";
import { scanCoverage } from "./steps/prep.js";
import { yearLabel, periodLabel } from "./period.js";
import * as entity from "./steps/entity.js";
import * as ranking from "./steps/ranking.js";
import * as industry from "./steps/industry.js";
import * as classify from "./steps/classify.js";
import * as price from "./steps/price.js";
import * as profile from "./profile.js";
import { applyProfile, profileFromEngine } from "./profileApply.js";

export class EngineError extends Error {
  constructor(message, details) { super(message); this.name = "EngineError"; this.details = details; }
}

const STEP_RUNNERS = {
  quality: prep.runQuality,
  backfill: prep.runBackfill,
  validate: prep.runValidate,
  entity: entity.runEntity,
  ranking: ranking.runRanking,
  industry: industry.runIndustry,
  classify: classify.runClassify,
  units: price.runUnits,
  iqr: price.runIQR,
  metrics: price.runMetrics,
};

export class Engine {
  constructor() {
    this.settings = structuredClone(DEFAULT_SETTINGS);
    this.refs = {
      keywords: null,                                 // { fileName, segments:[{name, include:[], exclude:[]}], conflicts:[] }
      keywordsSkipped: false,
      industry: { files: [], entries: [], conflicts: [] },
      overrides: { files: [], entries: [] },
    };
    this.profile = null;      // hồ sơ sản phẩm đang áp dụng (thông tin tóm tắt)
    this.refVersion = 0;      // tăng mỗi khi thiết lập / bộ phân khúc / từ điển thay đổi ⇒ biết hồ sơ đã bị sửa
    this.profileBase = 0;
    this.onProgress = () => {};
    this.resetData();
  }

  /* ─────────── trạng thái chung ─────────── */
  resetData() {
    this.sources = [];
    this.years = [];
    this.schema = { global: {}, perYear: {} };
    this.results = {};
    this.status = {};
    this.entities = {};
    this.rankings = null;
  }

  progress(step, pct, message) {
    try { this.onProgress({ step, pct: Math.max(0, Math.min(1, pct)), message }); } catch { /* ignore */ }
  }

  stepState(id) {
    if (id === "keywords") {
      if (this.refs.keywords) return "done";
      if (this.refs.keywordsSkipped) return "skipped";
    }
    return this.status[id] || "pending";
  }

  isDoneOrSkipped(id) { const s = this.stepState(id); return s === "done" || s === "skipped"; }

  /** Bước có thể chạy khi mọi bước trước đã xong / bỏ qua. */
  canRun(id) {
    const idx = STEP_INDEX[id];
    for (let i = 0; i < idx; i++) if (!STEPS[i].noRun && !this.isDoneOrSkipped(STEPS[i].id)) return { ok: false, blocker: STEPS[i] };
    return { ok: true };
  }

  /** Xóa kết quả từ bước `id` trở đi. */
  invalidateFrom(id, { inclusive = true } = {}) {
    const start = STEP_INDEX[id] + (inclusive ? 0 : 1);
    for (let i = start; i < STEPS.length; i++) {
      const sid = STEPS[i].id;
      if (sid === "keywords") continue; // bộ từ khóa là dữ liệu tham chiếu, không phụ thuộc dữ liệu
      delete this.results[sid];
      delete this.status[sid];
      for (const y of this.years) {
        for (const c of COLUMNS_BY_STEP[sid] || []) delete y.cols[c];
        for (const k of Object.keys(y.cols)) if (k.startsWith(`__${sid}_`)) delete y.cols[k];
      }
      if (sid === "entity") this.entities = {};
      if (sid === "ranking") this.rankings = null;
      if (sid === "industry") this.industryMatch = null;
    }
  }

  /* ─────────── BƯỚC 1: tải dữ liệu ─────────── */
  addFiles(files) {
    const added = [];
    const errors = [];
    for (const f of files) {
      try {
        const srcs = readFileSources(f.buffer, f.name);
        // file trùng tên → thay thế bản cũ
        this.sources = this.sources.filter((s) => s.file !== f.name);
        srcs.forEach((s) => { s.id = `${f.name}::${s.sheet}`; this.sources.push(s); added.push(s.id); });
      } catch (e) {
        errors.push({ file: f.name, message: "Không đọc được file: " + (e?.message || e) });
      }
    }
    this.years = []; this.schema = { global: {}, perYear: {} };
    this.results = {}; this.status = {}; this.entities = {}; this.rankings = null;
    return { added, errors, sources: this.sourceSummary() };
  }

  removeFile(fileName) {
    this.sources = this.sources.filter((s) => s.file !== fileName);
    this.years = []; this.results = {}; this.status = {}; this.entities = {}; this.rankings = null;
    return this.sourceSummary();
  }

  sourceSummary() {
    return this.sources.map((s) => ({
      id: s.id, file: s.file, sheet: s.sheet, year: s.year, include: s.include, note: s.note,
      nRows: s.nRows, headerRowNo: s.headerRowNo, nCols: s.headers.length, headers: s.headers.slice(0, 60), split: s.split || null,
    }));
  }

  /** Người dùng chỉnh năm / bật-tắt từng nguồn rồi xác nhận. */
  confirmSources(updates = []) {
    const byId = new Map(updates.map((u) => [u.id, u]));
    for (const s of this.sources) {
      const u = byId.get(s.id);
      if (!u) continue;
      if (u.year !== undefined) s.year = u.year ? String(u.year).trim() : null;
      if (u.include !== undefined) s.include = !!u.include;
    }
    const chosen = this.sources.filter((s) => s.include);
    if (!chosen.length) throw new EngineError("Chưa chọn nguồn dữ liệu nào để xử lý.");
    const bad = chosen.filter((s) => (s.year === YEAR_BY_DATE ? !s._rowYears : !/^(19|20)\d{2}$/.test(String(s.year || ""))));
    if (bad.length) throw new EngineError("Các nguồn sau chưa có năm hợp lệ (4 chữ số): " + bad.map((b) => `${b.file} › ${b.sheet}`).join("; "));

    // gộp theo năm, hợp nhất tiêu đề. Nguồn "tách theo cột ngày" đóng góp vào nhiều năm (mỗi dòng theo năm của nó).
    const byYear = new Map();
    const add = (year, part) => { if (!byYear.has(year)) byYear.set(year, []); byYear.get(year).push(part); };
    const dropped = [];
    for (const s of chosen) {
      if (s.year !== YEAR_BY_DATE) { add(s.year, { s, idx: null }); continue; }
      const buckets = new Map();
      let none = 0;
      for (let i = 0; i < s._rows.length; i++) {
        const yr = s._rowYears[i];
        if (!yr) { none++; continue; }
        if (!buckets.has(yr)) buckets.set(yr, []);
        buckets.get(yr).push(i);
      }
      buckets.forEach((idx, yr) => add(String(yr), { s, idx: Int32Array.from(idx) }));
      if (none) dropped.push({ file: s.file, sheet: s.sheet, rows: none, column: s.split?.header || "" });
    }
    if (!byYear.size) throw new EngineError("Không còn dòng nào có năm hợp lệ để xử lý.");
    this.years = [...byYear.keys()].sort().map((year) => {
      const parts = byYear.get(year);
      const headers = [];
      const hIndex = new Map();
      for (const p of parts) for (const h of p.s.headers) if (!hIndex.has(h)) { hIndex.set(h, headers.length); headers.push(h); }
      const n = parts.reduce((a, p) => a + (p.idx ? p.idx.length : p.s._rows.length), 0);
      const rows = new Array(n);
      const srcIdx = new Uint16Array(n), rowNum = new Int32Array(n);
      const srcNames = parts.map((p) => ({ file: p.s.file, sheet: p.s.sheet }));
      let k = 0;
      parts.forEach((p, pi) => {
        const src = p.s;
        const map = src.headers.map((h) => hIndex.get(h));
        const identity = map.every((m, j) => m === j) && src.headers.length === headers.length;
        const cnt = p.idx ? p.idx.length : src._rows.length;
        for (let t = 0; t < cnt; t++) {
          const i = p.idx ? p.idx[t] : t;
          const r = src._rows[i];
          let out = r;
          if (!identity) { out = new Array(headers.length).fill(null); for (let j = 0; j < map.length; j++) out[map[j]] = r[j]; }
          rows[k] = out; srcIdx[k] = pi; rowNum[k] = src._rowNums[i]; k++;
        }
      });
      return { year, headers, rows, n, srcIdx, rowNum, srcNames, map: {}, cols: {}, coverage: null };
    });
    this.status = { upload: "done" };
    this.results = { upload: { years: this.years.map((y) => ({ year: y.year, rows: y.n, parts: y.srcNames.length, cols: y.headers.length })), dropped } };
    this.entities = {}; this.rankings = null;
    this.autoSchema();
    return this.results.upload;
  }

  /* ─────────── BƯỚC 2: ánh xạ cột ─────────── */
  allHeaders() {
    const seen = new Set(), out = [];
    for (const y of this.years) for (const h of y.headers) if (!seen.has(h)) { seen.add(h); out.push(h); }
    return out;
  }

  /** Dò cột tự động: điểm cao nhất được gán trước, mỗi cột chỉ dùng cho một trường. */
  static detectMapping(headers) {
    const cand = [];
    const nh = headers.map((h) => normHeader(h));
    SCHEMA_FIELDS.forEach((f) => {
      f.aliases.forEach((a, ai) => {
        nh.forEach((h, hi) => {
          let score = 0;
          if (h === a) score = 100 - ai;
          else if (h.startsWith(a + " ") || h.endsWith(" " + a)) score = 70 - ai;
          else if ((" " + h + " ").includes(" " + a + " ")) score = 50 - ai;
          if (score > 0) cand.push({ field: f.key, header: headers[hi], score });
        });
      });
    });
    cand.sort((a, b) => b.score - a.score);
    const out = {}, used = new Set();
    for (const c of cand) {
      if (out[c.field] || used.has(c.header)) continue;
      out[c.field] = c.header; used.add(c.header);
    }
    return out;
  }

  autoSchema() {
    const headers = this.allHeaders();
    const global = Engine.detectMapping(headers);
    this.schema = { global, perYear: {} };
    for (const y of this.years) this.schema.perYear[y.year] = this.resolveYearMapping(y, global, {});
  }

  /** Với mỗi năm: dùng đúng tên cột đã chọn, nếu năm đó không có thì tìm cột cùng tên chuẩn hóa / alias. */
  resolveYearMapping(y, global, manual) {
    const out = {};
    const nhMap = new Map(y.headers.map((h) => [normHeader(h), h]));
    const local = Engine.detectMapping(y.headers);
    for (const f of SCHEMA_FIELDS) {
      const m = manual?.[f.key];
      if (m !== undefined && m !== null && m !== "__auto__") { out[f.key] = m && y.headers.includes(m) ? m : ""; continue; }
      const g = global[f.key];
      if (g && y.headers.includes(g)) out[f.key] = g;
      else if (g && nhMap.has(normHeader(g))) out[f.key] = nhMap.get(normHeader(g));
      else out[f.key] = g ? (local[f.key] || "") : "";
    }
    return out;
  }

  getSchemaInfo() {
    const headers = this.allHeaders();
    const preview = {};
    for (const y of this.years) {
      const m = this.schema.perYear[y.year] || {};
      preview[y.year] = y.rows.slice(0, 6).map((r) => {
        const o = {};
        for (const f of SCHEMA_FIELDS) { const idx = m[f.key] ? y.headers.indexOf(m[f.key]) : -1; o[f.key] = idx >= 0 ? r[idx] : null; }
        return o;
      });
    }
    return {
      fields: SCHEMA_FIELDS.map(({ key, label, optional }) => ({ key, label, optional: !!optional })),
      headers, global: this.schema.global, perYear: this.schema.perYear,
      yearHeaders: Object.fromEntries(this.years.map((y) => [y.year, y.headers])),
      preview, validation: this.validateSchema(),
    };
  }

  setSchema({ global, perYearManual }) {
    if (global) this.schema.global = { ...global };
    for (const y of this.years) {
      this.schema.perYear[y.year] = this.resolveYearMapping(y, this.schema.global, perYearManual?.[y.year]);
    }
    if (this.status.schema) this.invalidateFrom("schema");
    return this.getSchemaInfo();
  }

  validateSchema() {
    const errors = [], warnings = [];
    for (const y of this.years) {
      const m = this.schema.perYear[y.year] || {};
      for (const f of REQUIRED_FIELDS) if (!m[f]) errors.push(`Năm ${y.year}: chưa có cột cho "${SCHEMA_FIELDS.find((x) => x.key === f).label}".`);
      const vals = Object.entries(m).filter(([, v]) => v);
      const dup = vals.filter(([, v], i) => vals.findIndex(([, w]) => w === v) !== i);
      dup.forEach(([k, v]) => errors.push(`Năm ${y.year}: cột "${v}" đang được dùng cho nhiều trường (${SCHEMA_FIELDS.find((x) => x.key === k).label}).`));
      if (m.unitPrice && m.totalValue && m.unitPrice === m.totalValue) errors.push(`Năm ${y.year}: Đơn giá và Trị giá không được dùng chung một cột.`);
    }
    return { ok: !errors.length, errors, warnings };
  }

  confirmSchema() {
    const v = this.validateSchema();
    if (!v.ok) throw new EngineError("Ánh xạ cột chưa hợp lệ.", v.errors);
    this.invalidateFrom("schema");
    for (const y of this.years) {
      const m = this.schema.perYear[y.year];
      y.map = Object.fromEntries(SCHEMA_FIELDS.map((f) => [f.key, m[f.key] ? y.headers.indexOf(m[f.key]) : -1]));
      y.coverage = scanCoverage(y);
    }
    this.status.schema = "done";
    this.results.schema = { mapping: structuredClone(this.schema.perYear) };
    return this.results.schema;
  }

  /* ─────────── các bước xử lý ─────────── */
  runStep(id) {
    if (id === "upload" || id === "schema") throw new EngineError("Bước này được xác nhận trực tiếp trên giao diện.");
    if (id === "keywords") throw new EngineError("Hãy tải tệp bộ từ khóa hoặc chọn bỏ qua.");
    if (STEPS[STEP_INDEX[id]]?.noRun) throw new EngineError(id === "export" ? "Bước xuất tệp không cần chạy." : "Bước này không cần chạy — xem hướng dẫn và tải tệp rà soát.");
    const can = this.canRun(id);
    if (!can.ok) throw new EngineError(`Cần hoàn thành bước ${can.blocker.no} "${can.blocker.label}" trước.`);
    const runner = STEP_RUNNERS[id];
    this.invalidateFrom(id);
    this.progress(id, 0, "Bắt đầu…");
    const t0 = Date.now();
    const summary = runner(this, (p, msg) => this.progress(id, p, msg));
    summary._ms = Date.now() - t0;
    this.results[id] = summary;
    this.status[id] = summary._skipped ? "skipped" : "done";
    this.progress(id, 1, "Hoàn tất");
    return summary;
  }

  skipStep(id) {
    if (id === "keywords") {
      this.refs.keywordsSkipped = true; this.refs.keywords = null; this.refVersion++;
      this.invalidateFrom("classify");
      return;
    }
    if (id !== "industry") throw new EngineError("Bước này không thể bỏ qua.");
    const can = this.canRun(id);
    if (!can.ok) throw new EngineError(`Cần hoàn thành bước ${can.blocker.no} "${can.blocker.label}" trước.`);
    this.invalidateFrom(id);
    this.status[id] = "skipped";
    this.results[id] = { _skipped: true, note: "Đã bỏ qua — không gán ngành." };
  }

  /** Chạy tự động từ bước chưa xong tới bước 13 (Chỉ số phân khúc). Dừng nếu cần người dùng quyết định. */
  runAll({ autoSkipIndustry = true } = {}) {
    const ran = [];
    for (const s of STEPS) {
      if (["upload", "schema"].includes(s.id)) {
        if (!this.isDoneOrSkipped(s.id)) return { ran, stoppedAt: s.id, reason: `Cần hoàn tất bước ${s.no} "${s.label}" trên giao diện.` };
        continue;
      }
      if (s.noRun) break;
      if (this.isDoneOrSkipped(s.id)) continue;
      if (s.id === "industry" && !this.refs.industry.entries.length) {
        if (autoSkipIndustry) { this.skipStep("industry"); ran.push({ id: s.id, skipped: true }); continue; }
        return { ran, stoppedAt: s.id, reason: "Chưa tải Industry Master." };
      }
      if (s.id === "keywords") {
        return { ran, stoppedAt: s.id, reason: "Cần tải tệp bộ từ khóa (hoặc chọn Bỏ qua) trước khi phân loại." };
      }
      this.runStep(s.id);
      ran.push({ id: s.id });
    }
    return { ran, stoppedAt: null };
  }

  /* ─────────── cấu hình ─────────── */
  updateSettings(partial) {
    let earliest = null;
    for (const [k, v] of Object.entries(partial)) {
      if (!Object.hasOwn(DEFAULT_SETTINGS, k)) continue; // chặn khóa lạ như "__proto__"
      const same = JSON.stringify(this.settings[k]) === JSON.stringify(v);
      if (same) continue;
      this.settings[k] = v;
      if (!NON_PROFILE_SETTINGS.has(k)) this.refVersion++;
      const st = SETTING_STEP[k];
      if (st && (earliest === null || STEP_INDEX[st] < STEP_INDEX[earliest])) earliest = st;
    }
    if (earliest && (this.status[earliest] || this.hasLaterResults(earliest))) this.invalidateFrom(earliest);
    return { settings: this.settings, invalidatedFrom: earliest };
  }

  hasLaterResults(id) {
    const idx = STEP_INDEX[id];
    return STEPS.slice(idx).some((s) => this.status[s.id] && s.id !== "keywords");
  }

  /* ─────────── tham chiếu ─────────── */
  loadKeywords(buffer, fileName) {
    const kw = classify.parseKeywordMatrix(buffer, fileName);
    this.refs.keywords = kw; this.refs.keywordsSkipped = false; this.refVersion++;
    this.invalidateFrom("classify");
    return kw;
  }
  /** Bộ phân khúc soạn trên giao diện (hoặc từ hồ sơ). */
  setKeywords(def, label = "Soạn trên giao diện") {
    const kw = classify.buildKeywordSet(def, label);
    if (!kw.segments.length) throw new EngineError("Cần ít nhất một phân khúc có tên.");
    this.refs.keywords = kw; this.refs.keywordsSkipped = false; this.refVersion++;
    this.invalidateFrom("classify");
    return kw;
  }
  getKeywords() {
    const kw = this.refs.keywords;
    return kw ? { label: kw.fileName, segments: kw.segments.map((s) => ({ name: s.name, include: [...s.include], exclude: [...s.exclude], note: s.note || "" })), exclusions: [...(kw.exclusions || [])] } : null;
  }
  previewKeywords(def, opts) {
    if (!this.years.length) throw new EngineError("Cần tải và xác nhận dữ liệu (bước 1–2) để xem trước độ phủ.");
    return classify.previewKeywords(this, def, opts);
  }
  clearKeywords() { this.refs.keywords = null; this.refs.keywordsSkipped = false; this.refVersion++; this.invalidateFrom("classify"); }

  loadIndustry(buffer, fileName) {
    const r = industry.parseIndustryMaster(buffer, fileName, this.refs.industry);
    this.refVersion++;
    this.invalidateFrom("industry");
    return r;
  }
  clearIndustry() { this.refs.industry = { files: [], entries: [], conflicts: [] }; this.refVersion++; this.invalidateFrom("industry"); }

  loadOverrides(buffer, fileName) {
    const r = entity.parseOverrides(buffer, fileName, this.refs.overrides);
    this.refVersion++;
    this.invalidateFrom("entity");
    return r;
  }
  clearOverrides() { this.refs.overrides = { files: [], entries: [] }; this.refVersion++; this.invalidateFrom("entity"); }

  /* ─────────── hồ sơ sản phẩm ─────────── */
  applyProfile(p) { return applyProfile(this, p); }
  buildProfile(meta, opts) { return profileFromEngine(this, meta, opts); }
  /** Sau khi lưu hồ sơ hiện tại: cập nhật thông tin & coi như chưa sửa. */
  markProfileSaved(p) {
    const n = profile.normalizeProfile(p, { origin: p._origin || "local" });
    this.profile = profile.profileMeta(n);
    this.profileBase = this.refVersion;
    return this.profile;
  }

  /* ─────────── tiện ích truy cập ─────────── */
  /** Giá trị trường đã ánh xạ của dòng i trong năm y. */
  static val(y, field, i) { const idx = y.map[field]; return idx >= 0 ? y.rows[i][idx] : null; }

  getState() {
    return {
      settings: this.settings,
      profile: this.profile ? { ...this.profile, modified: this.refVersion !== this.profileBase } : null,
      steps: STEPS.map((s) => ({ id: s.id, state: this.stepState(s.id), can: this.canRun(s.id).ok })),
      sources: this.sourceSummary(),
      years: this.years.map((y) => ({ year: y.year, rows: y.n, coverage: y.coverage || null, label: yearLabel(y) })),
      period: this.years.length ? periodLabel(this.years) : "",
      results: this.results,
      refs: {
        keywords: this.refs.keywords ? { fileName: this.refs.keywords.fileName, segments: this.refs.keywords.segments.map((s) => ({ name: s.name, include: s.include.length, exclude: s.exclude.length, wildcard: s.include.filter((k) => k.endsWith("*")).length })), conflicts: this.refs.keywords.conflicts, warnings: this.refs.keywords.warnings } : null,
        keywordsSkipped: this.refs.keywordsSkipped,
        industry: { files: this.refs.industry.files, entries: this.refs.industry.entries.length, conflicts: this.refs.industry.conflicts.slice(0, 200), conflictCount: this.refs.industry.conflicts.length },
        overrides: { files: this.refs.overrides.files, entries: this.refs.overrides.entries.length },
      },
    };
  }
}
