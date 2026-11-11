/* ═══════════════════════════════════════════════════════════════
   TRUY VẤN CHO GIAO DIỆN — trả về các "lát cắt" nhỏ của dữ liệu lớn
   (dữ liệu đầy đủ nằm trong Web Worker, giao diện chỉ nhận phần cần hiển thị)
   ═══════════════════════════════════════════════════════════════ */
import { normText } from "./text.js";
import { headerLabel } from "./columns.js";
import { SCHEMA_FIELDS, LABELS } from "./constants.js";

/** Mã "năm" đặc biệt cho xếp hạng cả giai đoạn. */
export const PERIOD = "__period";

const pageOf = (arr, page = 0, size = 50) => ({ total: arr.length, page, size, rows: arr.slice(page * size, page * size + size) });

export function queryEntities(engine, { type = "Purchaser", search = "", filter = "all", page = 0, size = 50, sort = "value" } = {}) {
  const D = engine.entities[type];
  if (!D) return { total: 0, rows: [] };
  let list = D.entities;
  if (filter === "review") list = list.filter((e) => e.review === LABELS.REVIEW.REVIEW);
  else if (filter === "merged") list = list.filter((e) => e.nVariants > 1);
  else if (filter === "low") list = list.filter((e) => e.confidence === LABELS.CONF.LOW || e.confidence === LABELS.CONF.MEDIUM);
  else if (filter === "flag") list = list.filter((e) => e.flags.length);
  else if (filter === "confirmed") list = list.filter((e) => e.isOverride);
  if (search) {
    const q = normText(search);
    list = list.filter((e) => normText(e.name).includes(q) || e.id.includes(search.toUpperCase()) || e.variants.some((v) => normText(v.raw).includes(q)));
  }
  list = list.slice().sort(sort === "variants" ? (a, b) => b.nVariants - a.nVariants || b.value - a.value : sort === "id" ? (a, b) => a.id.localeCompare(b.id) : (a, b) => b.value - a.value);
  const p = pageOf(list, page, size);
  p.rows = p.rows.map((e) => ({
    id: e.id, name: e.name, country: e.countryName, continent: e.continent, nVariants: e.nVariants,
    variants: e.variants.slice(0, 12).map((v) => ({ raw: v.raw, count: v.count, value: v.value })),
    rows: e.rows, value: e.value, confidence: e.confidence, review: e.review, flags: e.flags, methods: e.methods,
  }));
  return p;
}

export function queryPlaceholders(engine, { type = "Purchaser" } = {}) {
  return (engine.entities[type]?.placeholder.list || []).slice(0, 100);
}

export function queryRanking(engine, { year, scope = "P_ALL", topOnly = false, page = 0, size = 100 } = {}) {
  const sc = year === PERIOD ? engine.rankings?.period?.[scope] : engine.rankings?.years?.[year]?.[scope];
  if (!sc) return { total: 0, rows: [] };
  const E = engine.entities[sc.group].entities;
  const M = sc.group === "Purchaser" ? engine.industryMatch : null;
  const list = topOnly ? sc.list.filter((r) => r.top) : sc.list;
  const p = pageOf(list, page, size);
  p.rows = p.rows.map((r) => ({ ...r, id: E[r.e].id, name: E[r.e].name, confidence: E[r.e].confidence, review: E[r.e].review, industry: M?.[r.e]?.e.segment || "" }));
  p.meta = { label: sc.label, total: sc.total, topCount: sc.topCount, phValue: sc.phValue, notCalc: sc.notCalc, entities: sc.list.length };
  // dữ liệu Pareto (tối đa 60 điểm đầu + điểm cắt)
  p.pareto = sc.list.slice(0, Math.max(60, Math.min(sc.list.length, sc.topCount + 10))).map((r) => ({ rank: r.rank, share: r.share, cum: r.cum, top: r.top, name: E[r.e].name }));
  return p;
}

/** Xem nhanh dữ liệu dòng (cột gốc đã ánh xạ + cột tính toán chọn lọc), có lọc theo giá trị cột. */
export function queryRows(engine, { year, columns = [], where = null, page = 0, size = 50, lang = "vi" } = {}) {
  const y = engine.years.find((x) => x.year === year) || engine.years[0];
  if (!y) return { total: 0, rows: [], headers: [] };
  const fields = SCHEMA_FIELDS.filter((f) => y.map[f.key] >= 0 && columns.includes("@" + f.key));
  const comp = columns.filter((c) => !c.startsWith("@") && (y.cols[c] || c === "_Source_Row"));
  const headers = [...fields.map((f) => f.label), ...comp.map((c) => headerLabel(c, lang))];
  const idx = [];
  const test = where ? compileWhere(y, where) : null;
  for (let i = 0; i < y.n; i++) if (!test || test(i)) idx.push(i);
  const p = pageOf(idx, page, size);
  p.headers = headers;
  p.rows = p.rows.map((i) => [
    ...fields.map((f) => fmtCell(y.rows[i][y.map[f.key]])),
    ...comp.map((c) => (c === "_Source_Row" ? y.rowNum[i] : fmtCell(y.cols[c][i]))),
  ]);
  return p;
}

function compileWhere(y, where) {
  const { col, op = "eq", value } = where;
  const arr = col.startsWith("@") ? null : y.cols[col];
  const fi = col.startsWith("@") ? y.map[col.slice(1)] : -1;
  const get = arr ? (i) => arr[i] : (i) => (fi >= 0 ? y.rows[i][fi] : null);
  if (op === "eq") return (i) => get(i) === value;
  if (op === "startsWith") return (i) => String(get(i) ?? "").startsWith(value);
  if (op === "nonEmpty") return (i) => { const v = get(i); return v !== null && v !== undefined && v !== "" && !(typeof v === "number" && Number.isNaN(v)); };
  if (op === "in") return (i) => value.includes(get(i));
  return null;
}

function fmtCell(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return Number.isFinite(v) ? v : "";
  return v;
}
