/* ═══════════════════════════════════════════════════════════════
   TEXT UTILITIES — chuẩn hóa chuỗi dùng chung cho toàn bộ engine
   ═══════════════════════════════════════════════════════════════ */

// Chuyển tự Kirin → Latin (dữ liệu Nga/CIS: 'ООО "РУСХИМ"' → "OOO RUSKHIM")
const CYR = {
  "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Е": "E", "Ё": "E", "Ж": "ZH", "З": "Z", "И": "I", "Й": "Y", "К": "K",
  "Л": "L", "М": "M", "Н": "N", "О": "O", "П": "P", "Р": "R", "С": "S", "Т": "T", "У": "U", "Ф": "F", "Х": "KH", "Ц": "TS",
  "Ч": "CH", "Ш": "SH", "Щ": "SHCH", "Ъ": "", "Ы": "Y", "Ь": "", "Э": "E", "Ю": "YU", "Я": "YA", "І": "I", "Ї": "YI",
  "Є": "YE", "Ґ": "G", "Ў": "U", "Қ": "K", "Ғ": "G", "Ң": "NG", "Ү": "U", "Ұ": "U", "Һ": "H", "Ә": "A", "Ө": "O",
};
const CYR_RE = /[Ѐ-ӿ]/;
function translitCyr(s) {
  if (!CYR_RE.test(s)) return s;
  let o = "";
  for (const ch of s) { const up = ch.toUpperCase(); o += up in CYR ? CYR[up] : ch; }
  return o;
}

/** Bỏ dấu tiếng Việt (bao gồm Đ/đ — NFD không tách được ký tự này) và chuyển tự chữ Kirin. */
export function stripDiacritics(s) {
  return translitCyr(String(s ?? ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d");
}

/**
 * Chuẩn hóa để so khớp: IN HOA, bỏ dấu, mọi ký tự không phải chữ/số → khoảng trắng.
 * Giữ nguyên chữ của hệ chữ khác (Trung, Nhật, Hàn, Thái…) để tên không bị biến thành rỗng.
 * "Công ty TNHH Hóa chất A.B.C" → "CONG TY TNHH HOA CHAT A B C"
 */
export function normText(s) {
  return stripDiacritics(s)
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chuẩn hóa tên cột để dò tìm (không phân biệt hoa/thường, dấu, khoảng trắng, gạch dưới). */
export function normHeader(s) {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Có ký tự tiếng Việt có dấu hay không. */
export function hasVietDiacritics(s) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(String(s ?? ""));
}

/** Escape cho RegExp. */
export function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SMALL_WORDS = new Set(["AND", "OF", "THE", "FOR", "DE", "DEL", "LA", "DA", "DO", "DI", "VA"]);
const KEEP_UPPER = new Set([
  "JSC", "LLC", "PLC", "LTD", "SA", "AG", "NV", "BV", "AB", "AS", "SE", "KG", "CV", "PT", "SRL", "SPA", "SAS",
  "SARL", "OOO", "PJSC", "OJSC", "CJSC", "TNHH", "CTCP", "MTV", "XNK", "TM", "DV", "SX", "HCM", "USA", "UK",
  "UAE", "NPK", "DAP", "UAN", "SSP", "TSP", "PVC", "HDPE", "LDPE", "ASA", "OYJ", "OOO", "ZAO", "OAO", "PAO", "TOO", "TOV", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "HK", "SG", "VN",
]);

// Cụm phụ âm cuối "đọc được" (tiếng Anh/Việt) — từ ngắn kết thúc bằng cụm khác thường là viết tắt (ABC, BASF, OCP)
const OK_FINAL_CLUSTERS = new Set(["NG", "NH", "CH", "CK", "LL", "SS", "TH", "SH", "RD", "RT", "ST", "ND", "NT", "RN", "RK", "LD", "LT", "RM", "RS", "NS", "LK", "WN", "MP", "SK", "FT", "PT", "LF", "LM", "RP"]);
function looksLikeAcronym(bare) {
  if (!/[AEIOUY]/.test(bare)) return true;                 // không có nguyên âm: TNHH, NPK, PVN, HSBC
  if (bare.length > 4) return false;
  const m = bare.match(/[^AEIOUY]{2,}$/);                  // cụm phụ âm cuối
  return !!m && !OK_FINAL_CLUSTERS.has(m[0].slice(-2));
}

/**
 * Viết hoa chữ đầu thông minh, hỗ trợ Unicode tiếng Việt.
 * - Giữ IN HOA: từ viết tắt (không có nguyên âm, hoặc ≤4 ký tự kết thúc bằng cụm phụ âm khác thường),
 *   từ có chữ số, danh sách viết tắt phổ biến (JSC, TNHH, NPK…).
 * - Nếu chuỗi gốc đã có chữ thường (do người nhập viết đúng kiểu), giữ nguyên kiểu chữ gốc.
 */
export function smartTitleCase(input) {
  const s = String(input ?? "").trim();
  if (!s) return s;
  if (/\p{Ll}/u.test(s) && /\p{Lu}/u.test(s)) return s; // đã có kiểu chữ hỗn hợp → tôn trọng bản gốc
  return s
    .split(/(\s+)/)
    .map((tok, i) => {
      if (/^\s+$/.test(tok)) return tok;
      const bare = stripDiacritics(tok).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!bare) return tok;
      if (KEEP_UPPER.has(bare)) return tok.toUpperCase();
      if (/\d/.test(bare)) return tok.toUpperCase();
      if (!SMALL_WORDS.has(bare) && looksLikeAcronym(bare)) return tok.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(bare)) return tok.toLowerCase();
      // Viết hoa ký tự chữ cái đầu tiên của từng phần ngăn cách bởi - / .
      return tok
        .toLocaleLowerCase("vi")
        .replace(/(^|[-/.("'«])(\p{L})/gu, (m, p, c) => p + c.toLocaleUpperCase("vi"));
    })
    .join("");
}

/** Lấy năm (1900–2099) đầu tiên xuất hiện trong chuỗi — không bị chặn bởi "_" như \b. */
export function extractYear(s) {
  const m = String(s ?? "").match(/(?<!\d)((?:19|20)\d{2})(?!\d)/);
  return m ? m[1] : null;
}

/** Tên sheet Excel hợp lệ (≤31 ký tự, không chứa : \ / ? * [ ]). */
export function safeSheetName(s, used) {
  let base = String(s).replace(/[:\\/?*[\]]/g, "_").slice(0, 31) || "Sheet";
  if (!used) return base;
  let name = base, k = 2;
  while (used.has(name.toUpperCase())) {
    const suf = "_" + k++;
    name = base.slice(0, 31 - suf.length) + suf;
  }
  used.add(name.toUpperCase());
  return name;
}

/** Tên file an toàn. */
export function safeFileName(s) {
  return stripDiacritics(String(s ?? "").trim())
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "ChemSeg";
}

/** Khoảng cách Levenshtein có chặn trên (trả về max+1 nếu vượt). */
export function levenshtein(a, b, max = Infinity) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev = new Array(lb + 1), cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[lb];
}

/** Jaro-Winkler similarity (0..1). */
export function jaroWinkler(a, b) {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  const range = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const ma = new Array(la).fill(false), mb = new Array(lb).fill(false);
  let matches = 0;
  for (let i = 0; i < la; i++) {
    const lo = Math.max(0, i - range), hi = Math.min(i + range + 1, lb);
    for (let j = lo; j < hi; j++) {
      if (mb[j] || a[i] !== b[j]) continue;
      ma[i] = mb[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < la; i++) {
    if (!ma[i]) continue;
    while (!mb[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const m = matches;
  const jaro = (m / la + m / lb + (m - t / 2) / m) / 3;
  let p = 0;
  while (p < 4 && p < la && p < lb && a[p] === b[p]) p++;
  return jaro + p * 0.1 * (1 - jaro);
}
