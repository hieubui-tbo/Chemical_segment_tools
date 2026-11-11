/* ═══════════════════════════════════════════════════════════════
   NUMBER & DATE UTILITIES
   ═══════════════════════════════════════════════════════════════ */

/**
 * Đọc số "chịu lỗi" từ ô Excel.
 * Trả về { value: number|null, kind: "number"|"blank"|"text"|"invalid" }
 *  - Hỗ trợ: 1,234.56 | 1.234,56 | 1 234 567 | $1,200 | 1200 USD | (123) → -123 | 12,5 → 12.5
 *  - Văn bản (N/A, "liên hệ"...) → kind "text"
 */
export function parseNumberDetailed(v) {
  if (v === null || v === undefined) return { value: null, kind: "blank" };
  if (typeof v === "number") return Number.isFinite(v) ? { value: v, kind: "number" } : { value: null, kind: "invalid" };
  if (typeof v === "boolean") return { value: null, kind: "invalid" };
  if (v instanceof Date) return { value: null, kind: "invalid" };
  let s = String(v).trim();
  if (!s) return { value: null, kind: "blank" };
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
  // bỏ ký hiệu tiền tệ / đơn vị tiền phổ biến
  s = s.replace(/(US\$|USD|VND|VNĐ|EUR|CNY|RMB|JPY|\$|€|₫|¥|£)/gi, "").trim();
  s = s.replace(/[\s\u00A0\u202F']/g, ""); // khoảng trắng / dấu nháy ngăn cách nghìn
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  if (s.startsWith("+")) s = s.slice(1);
  if (!s) return { value: null, kind: "text" };
  if (/[a-z]/i.test(s.replace(/e[+-]?\d+$/i, ""))) return { value: null, kind: "text" };
  if (!/^[\d.,]+([eE][+-]?\d+)?$/.test(s)) return { value: null, kind: "invalid" };

  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // dấu xuất hiện sau cùng là dấu thập phân
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    // 1,234 | 1,234,567 → nghìn ; 12,5 | 0,75 → thập phân
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
    else if ((s.match(/,/g) || []).length === 1) s = s.replace(",", ".");
    else return { value: null, kind: "invalid" };
  } else if (hasDot) {
    // 1.234.567 → nghìn (≥2 dấu chấm); 1.234 giữ nguyên là thập phân (quy ước JS/Excel)
    if ((s.match(/\./g) || []).length > 1) {
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
      else return { value: null, kind: "invalid" };
    }
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, kind: "invalid" };
  return { value: neg ? -n : n, kind: "number" };
}

export const parseNumber = (v) => parseNumberDetailed(v).value;

/** Số dương hợp lệ hay null. */
export const positiveOrNull = (n) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null);

/**
 * Tứ phân vị theo phương pháp nội suy tuyến tính — trùng với Excel QUARTILE.INC / PERCENTILE.INC.
 * sorted: mảng đã sắp xếp tăng dần.
 */
export function quantileInc(sorted, p) {
  const n = sorted.length;
  if (!n) return null;
  if (n === 1) return sorted[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export function median(sorted) { return quantileInc(sorted, 0.5); }

/** Ngày Excel (serial) → Date (UTC). */
export function excelSerialToDate(serial) {
  if (typeof serial !== "number" || !Number.isFinite(serial)) return null;
  // Excel 1900 date system (bao gồm lỗi năm nhuận 1900 của Excel)
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Đọc ngày: Date object | serial Excel | số yyyymmdd | "yyyy-mm-dd" | "dd/mm/yyyy" | "mm/dd/yyyy" | "mm/yyyy" | "yyyy-mm".
 * order: thứ tự ngày/tháng của dạng a/b/yyyy — "dmy" (quy ước Việt Nam, mặc định) hoặc "mdy" (kiểu Mỹ).
 * Nên xác định order cho CẢ CỘT bằng detectDateOrder() để mọi dòng đọc nhất quán.
 */
export function parseDate(v, order = "dmy") {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    if (Number.isInteger(v) && v >= 19000101 && v <= 21001231) return mkDate(Math.floor(v / 10000), Math.floor(v / 100) % 100, v % 100);
    if (Number.isInteger(v) && v >= 1900 && v <= 2100) return null; // chỉ có năm — không phải ngày
    return v > 59 && v < 80000 ? excelSerialToDate(v) : null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return mkDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?!\d)/);
  if (m) {
    let a = +m[1], b = +m[2], y = +m[3];
    if (y < 100) y += 2000;
    if (a > 12 && b <= 12) return mkDate(y, b, a);          // chắc chắn ngày/tháng
    if (b > 12 && a <= 12) return mkDate(y, a, b);          // chắc chắn tháng/ngày
    return order === "mdy" ? mkDate(y, a, b) : mkDate(y, b, a);
  }
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return mkDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})[-/.](\d{1,2})$/);                  // yyyy-mm
  if (m) return mkDate(+m[1], +m[2], 1);
  m = s.match(/^(?:T|THANG\s*)?(\d{1,2})[-/.](\d{4})$/i);   // mm/yyyy, T10/2026
  if (m) return mkDate(+m[2], +m[1], 1);
  const t = Date.parse(s);
  if (isNaN(t)) return null;
  const d = new Date(t);
  return mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Xác định thứ tự ngày/tháng của một cột: có giá trị "13/02/2024" ⇒ dmy; "02/13/2024" ⇒ mdy; không rõ ⇒ dmy. */
export function detectDateOrder(values, limit = 5000) {
  let dmy = 0, mdy = 0, n = 0;
  for (const v of values) {
    if (n++ > limit) break;
    if (typeof v !== "string") continue;
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?!\d)/);
    if (!m) continue;
    if (+m[1] > 12 && +m[2] <= 12) dmy++;
    else if (+m[2] > 12 && +m[1] <= 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}
function mkDate(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 ? dt : null;
}

/** Làm tròn hiển thị. */
export function round(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
