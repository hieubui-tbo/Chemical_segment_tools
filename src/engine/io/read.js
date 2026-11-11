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

const ALIAS_SET = new Set(SCHEMA_FIELDS.flatMap((f) => f.aliases));

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
    let text = new TextDecoder("utf-8").decode(new Uint8Array(buffer));
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    wb = XLSX.read(text, { type: "string", cellDates: true, raw: false });
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
    let year = null, note = "";
    if (sy) { year = sy; note = "Năm lấy từ tên sheet"; }
    else if (biggest === p && fileYear) { year = fileYear; note = "Năm lấy từ tên file"; }
    else if (!p.rows.length) note = "Sheet trống";
    else if (anySheetYear || fileYear) note = "Sheet không mang năm — bỏ qua (có thể gán năm thủ công)";
    else note = "Không tìm thấy năm — hãy nhập năm thủ công";
    return {
      file: fileName, sheet: p.sheet, year, include: !!year && p.rows.length > 0, note,
      headers: p.headers, headerRowNo: p.headerRowNo, nRows: p.rows.length,
      _rows: p.rows, _rowNums: p.rowNums,
    };
  });
}

/** Đọc nhanh bảng tham chiếu (keyword matrix, industry master, từ điển) → mảng object theo tiêu đề, gồm mọi sheet. */
export function readReferenceTables(buffer, fileName) {
  const isCsv = /\.(csv|txt)$/i.test(fileName);
  const wb = isCsv
    ? XLSX.read(new TextDecoder("utf-8").decode(new Uint8Array(buffer)).replace(/^\uFEFF/, ""), { type: "string" })
    : XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  return wb.SheetNames.map((sheet) => {
    const p = parseSheet(wb.Sheets[sheet], { reference: true });
    return { sheet, headers: p.headers, rows: p.rows };
  }).filter((t) => t.headers.length);
}
