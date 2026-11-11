/* ═══════════════════════════════════════════════════════════════
   ĐỌC FILE ĐẦU VÀO
   - Hỗ trợ .xlsx/.xls/.xlsb/.csv, nhiều file cùng lúc
   - Tự dò dòng tiêu đề (bỏ qua dòng tiêu đề báo cáo phía trên)
   - Gán năm theo tên sheet, nếu không có thì theo tên file
   - Lưu dữ liệu dạng mảng (tiết kiệm bộ nhớ) + số dòng Excel gốc để truy vết
   ═══════════════════════════════════════════════════════════════ */
import * as XLSX from "xlsx";
import { extractYear, normHeader } from "../text.js";
import { SCHEMA_FIELDS } from "../constants.js";
import { parseDate, detectDateOrder } from "../numbers.js";

const ALIAS_SET = new Set(SCHEMA_FIELDS.flatMap((f) => f.aliases));
const DATE_ALIASES = SCHEMA_FIELDS.find((f) => f.key === "date").aliases.map(normHeader);
const YEAR_ALIASES = ["year", "nam", "fiscal year", "nam giao dich", "nam nhap khau", "nam xuat khau", "ano", "jahr"].map(normHeader);
/** Giá trị đặc biệt của "năm" một nguồn: tách theo cột ngày/năm trong dữ liệu. */
export const YEAR_BY_DATE = "__date";

/** Giải mã CSV: UTF-8 (có/không BOM); nếu không hợp lệ thì thử Windows-1258 (CSV tiếng Việt xuất từ Excel). */
function decodeCsv(buffer) {
  const bytes = new Uint8Array(buffer);
  try {
    let t = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    return t;
  } catch {
    try { return new TextDecoder("windows-1258").decode(bytes); } catch { return new TextDecoder("windows-1252").decode(bytes); }
  }
}

/**
 * Tìm cột ngày (hoặc cột năm) để biết sheet chứa những năm nào.
 * Trả về { col, header, kind: "date"|"year", order, years: {năm: số dòng}, invalid, rowYears: Int16Array } hoặc null.
 */
export function detectYearColumn(headers, rows) {
  const cands = [];
  headers.forEach((h, j) => {
    const nh = normHeader(h);
    if (YEAR_ALIASES.includes(nh)) cands.push({ j, kind: "year", pri: 2 });
    else if (DATE_ALIASES.includes(nh) || DATE_ALIASES.some((a) => a.length > 3 && (nh.startsWith(a + " ") || nh.endsWith(" " + a)))) cands.push({ j, kind: "date", pri: 1 });
  });
  let best = null;
  for (const c of cands) {
    const order = c.kind === "date" ? detectDateOrder(rows.map((r) => r[c.j])) : "dmy";
    const rowYears = new Int16Array(rows.length);
    const years = {};
    let filled = 0, ok = 0;
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i][c.j];
      if (v === null || v === undefined || v === "") continue;
      filled++;
      let yr = 0;
      if (c.kind === "year") { const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10); if (Number.isInteger(n) && n >= 1990 && n <= 2100) yr = n; }
      else { const d = parseDate(v, order); if (d) { const y = d.getUTCFullYear(); if (y >= 1990 && y <= 2100) yr = y; } }
      if (yr) { rowYears[i] = yr; years[yr] = (years[yr] || 0) + 1; ok++; }
    }
    if (!filled || ok / filled < 0.8) continue;
    const r = { col: c.j, header: headers[c.j], kind: c.kind, order, years, invalid: rows.length - ok, rowYears, ok, pri: c.pri };
    if (!best || r.ok > best.ok || (r.ok === best.ok && r.pri > best.pri)) best = r;
  }
  return best;
}

function isEmptyCell(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** Chọn dòng tiêu đề trong 30 dòng đầu: nhiều ô chữ + khớp tên trường quen thuộc. */
export function detectHeaderRow(aoa) {
  const limit = Math.min(aoa.length, 30);
  let best = 0, bestScore = -1;
  for (let i = 0; i < limit; i++) {
    const row = aoa[i] || [];
    let text = 0, alias = 0, filled = 0;
    for (const c of row) {
      if (isEmptyCell(c)) continue;
      filled++;
      if (typeof c === "string" && !/^[\d.,\s%$-]+$/.test(c)) {
        text++;
        if (ALIAS_SET.has(normHeader(c))) alias++;
      }
    }
    if (filled < 2) continue;
    const score = text + alias * 3 - (filled - text) * 0.5;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/** Ngày Excel (SheetJS tạo theo giờ địa phương) → "YYYY-MM-DD" (hoặc kèm giờ) — tránh lệch múi giờ khi xuất lại. */
function dateToText(d) {
  if (isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return d.getHours() || d.getMinutes() ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base;
}

function colLetter(i) {
  let s = "";
  i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

function buildHeaders(row, width) {
  const seen = new Map();
  const out = [];
  for (let j = 0; j < width; j++) {
    let h = row && !isEmptyCell(row[j]) ? String(row[j]).replace(/\s+/g, " ").trim() : `Cột ${colLetter(j)}`;
    const k = h.toLowerCase();
    if (seen.has(k)) { const n = seen.get(k) + 1; seen.set(k, n); h = `${h} (${n})`; }
    else seen.set(k, 1);
    out.push(h);
  }
  return out;
}

/** Bảng tham chiếu: dòng tiêu đề = dòng đầu tiên có ≥ 50% số ô của dòng rộng nhất (tối thiểu 1 ô). */
function detectReferenceHeader(aoa) {
  const limit = Math.min(aoa.length, 30);
  const filled = (r) => (r || []).filter((c) => !isEmptyCell(c)).length;
  let maxW = 0;
  for (let i = 0; i < limit; i++) maxW = Math.max(maxW, filled(aoa[i]));
  const need = Math.max(1, Math.ceil(maxW * 0.5));
  for (let i = 0; i < limit; i++) if (filled(aoa[i]) >= need) return i;
  return 0;
}

/** Đọc 1 sheet → { headers, rows (mảng), rowNums, headerRowNo } */
export function parseSheet(ws, opts = {}) {
  if (!ws || !ws["!ref"]) return { headers: [], rows: [], rowNums: [], headerRowNo: 0 };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: true });
  const h = opts.reference ? detectReferenceHeader(aoa) : detectHeaderRow(aoa);
  let width = 0;
  for (let i = h; i < aoa.length; i++) if (aoa[i] && aoa[i].length > width) width = aoa[i].length;
  // cắt các cột rỗng hoàn toàn ở cuối (không có tiêu đề & không có dữ liệu)
  const headerRow = aoa[h] || [];
  const used = new Array(width).fill(false);
  for (let j = 0; j < width; j++) if (!isEmptyCell(headerRow[j])) used[j] = true;
  for (let i = h + 1; i < aoa.length; i++) {
    const r = aoa[i]; if (!r) continue;
    for (let j = 0; j < r.length; j++) if (!used[j] && !isEmptyCell(r[j])) used[j] = true;
  }
  while (width > 0 && !used[width - 1]) width--;
  const headers = buildHeaders(headerRow, width);
  const rows = [], rowNums = [];
  for (let i = h + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r) continue;
    let any = false;
    const out = new Array(width);
    for (let j = 0; j < width; j++) {
      let v = r[j];
      if (typeof v === "string") { v = v.trim(); if (v === "") v = null; }
      else if (v instanceof Date) v = dateToText(v);
      if (v === undefined) v = null;
      if (v !== null) any = true;
      out[j] = v;
    }
    if (!any) continue;
    rows.push(out);
    rowNums.push(range.s.r + i + 1);
  }
  return { headers, rows, rowNums, headerRowNo: range.s.r + h + 1 };
}

/**
 * Đọc một file → danh sách "nguồn" (mỗi sheet một nguồn) kèm gợi ý năm.
 */
export function readFileSources(buffer, fileName) {
  const isCsv = /\.(csv|txt)$/i.test(fileName);
  let wb;
  if (isCsv) {
    // raw: giữ nguyên chuỗi (không để thư viện tự đoán ngày kiểu Mỹ) — công cụ tự đọc số & ngày sau
    wb = XLSX.read(decodeCsv(buffer), { type: "string", raw: true });
  } else {
    wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true, cellNF: false, cellText: false });
  }
  const fileYear = extractYear(fileName.replace(/\.[^.]+$/, ""));
  const parsed = wb.SheetNames.map((sheet) => ({ sheet, ...parseSheet(wb.Sheets[sheet]) }));
  const anySheetYear = parsed.some((p) => extractYear(p.sheet) && p.rows.length);
  let biggest = null;
  if (!anySheetYear && fileYear) {
    biggest = parsed.reduce((a, b) => (b.rows.length > (a?.rows.length ?? -1) ? b : a), null);
  }
  return parsed.map((p) => {
    const sy = extractYear(p.sheet);
    const split = p.rows.length ? detectYearColumn(p.headers, p.rows) : null;
    const yrs = split ? Object.entries(split.years).sort((a, b) => a[0] - b[0]) : [];
    // "nhiều năm" = có ≥ 2 năm, mỗi năm chiếm ≥ 1% số dòng đọc được ngày
    const multi = yrs.filter(([, n]) => n >= Math.max(1, split.ok * 0.01)).length >= 2;
    const domYear = yrs.length ? yrs.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : null;
    const range = yrs.length ? `${yrs[0][0]}–${yrs[yrs.length - 1][0]}` : "";
    let year = null, note = "";
    // Tên sheet/file đã mang năm và ngày trong dữ liệu chủ yếu (≥ 90%) đúng năm đó ⇒ giữ theo tên (không tách)
    const nameYear = sy || (biggest === p ? fileYear : null);
    const nameShare = nameYear && split ? (split.years[nameYear] || 0) / split.ok : 0;
    if (split && multi && !(nameYear && nameShare >= 0.9)) { year = YEAR_BY_DATE; note = `Sheet chứa nhiều năm (${range}) — tách theo cột “${split.header}”`; }
    else if (sy) { year = sy; note = "Năm lấy từ tên trang tính" + (split && domYear && String(domYear) !== sy ? ` — lưu ý: cột “${split.header}” chủ yếu là năm ${domYear}` : ""); }
    else if (biggest === p && fileYear) { year = fileYear; note = "Năm lấy từ tên file" + (split && domYear && String(domYear) !== fileYear ? ` — lưu ý: cột “${split.header}” chủ yếu là năm ${domYear}` : ""); }
    else if (split && domYear && p.rows.length) { year = String(domYear); note = `Năm lấy từ cột “${split.header}”`; }
    else if (!p.rows.length) note = "Sheet trống";
    else if (anySheetYear || fileYear) note = "Sheet không mang năm — bỏ qua (có thể gán năm thủ công)";
    else note = "Không tìm thấy năm — hãy nhập năm thủ công";
    return {
      file: fileName, sheet: p.sheet, year, include: !!year && p.rows.length > 0, note,
      headers: p.headers, headerRowNo: p.headerRowNo, nRows: p.rows.length,
      split: split ? { header: split.header, kind: split.kind, years: yrs.map(([y, n]) => ({ year: y, rows: n })), invalid: split.invalid } : null,
      _rows: p.rows, _rowNums: p.rowNums, _rowYears: split ? split.rowYears : null,
    };
  });
}

/** Đọc nhanh bảng tham chiếu (keyword matrix, industry master, từ điển) → mảng object theo tiêu đề, gồm mọi sheet. */
export function readReferenceTables(buffer, fileName) {
  const isCsv = /\.(csv|txt)$/i.test(fileName);
  const wb = isCsv
    ? XLSX.read(decodeCsv(buffer), { type: "string", raw: true })
    : XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  return wb.SheetNames.map((sheet) => {
    const p = parseSheet(wb.Sheets[sheet], { reference: true });
    return { sheet, headers: p.headers, rows: p.rows };
  }).filter((t) => t.headers.length);
}
