/* ═══════════════════════════════════════════════════════════════
   PHÂN TÍCH TÊN DOANH NGHIỆP
   - analyzeName(): tạo khóa so khớp (tách biệt với tên hiển thị)
   - cleanDisplayName(): làm sạch tên hiển thị (không dịch, không bịa tên)
   - placeholderReason(): nhận diện tên không xác định
   ═══════════════════════════════════════════════════════════════ */
import { normText, hasVietDiacritics, smartTitleCase } from "./text.js";
import {
  LEGAL_PHRASES, LEGAL_TOKENS_ANYWHERE, LEGAL_TOKENS_EDGE, VN_PHRASES, VN_ABBREV, SYNONYMS, STOPWORDS,
  GENERIC_TOKENS, DEFAULT_PLACEHOLDERS, PLACEHOLDER_PREFIXES, VN_MARKER_RE, LOGISTICS_RE, LEGAL_COUNT_RE,
} from "./dict/companies.js";

const LEGAL_PHRASES_PADDED = LEGAL_PHRASES.map((p) => " " + p + " ");
const COMPOUND_LEGAL_RE = / (CO LTD|CO LIMITED|COMPANY LIMITED|PTE LTD|PVT LTD|PTY LTD|PRIVATE LIMITED|SDN BHD|JOINT STOCK COMPANY|S A DE C V|SA DE CV|GMBH AND CO KG|PUBLIC COMPANY LIMITED|LIMITED LIABILITY COMPANY)(?= )/g;
const VN_PHRASES_PADDED = VN_PHRASES.map(([vn, en]) => [" " + vn + " ", " " + en + " "]);

function replacePadded(padded, from, to) {
  // thay lặp tới khi hết (xử lý trường hợp chồng lấn)
  let prev;
  do { prev = padded; padded = padded.split(from).join(to); } while (padded !== prev);
  return padded;
}

const analyzeCache = new Map();

/**
 * Phân tích một tên thô.
 * @returns {{norm, tokens, orderedKey, coreKey, distinctKey, compactDistinct, isVN, isBranch, flags:string[]}}
 */
export function analyzeName(raw) {
  const norm = normText(raw);
  const hit = analyzeCache.get(norm);
  if (hit) return hit;
  const res = analyzeUncached(raw, norm);
  if (analyzeCache.size < 200000) analyzeCache.set(norm, res);
  return res;
}

function analyzeUncached(raw, norm) {
  const flags = [];
  const isVN = hasVietDiacritics(raw) || VN_MARKER_RE.test(norm);
  let s = " " + norm + " ";
  // Tiền tố kính ngữ trong dữ liệu Ấn Độ/Pakistan: "M/S ABC", "MESSRS ABC"
  s = s.replace(/^ (M S|MESSRS|MESSERS|M S S) (?=\S+ \S)/, " ");

  // Chi nhánh → gộp về DN chính
  let isBranch = false;
  if (/ (CHI NHANH|BRANCH OF|BRANCH) /.test(s)) {
    isBranch = true;
    s = s.replace(/ CHI NHANH /g, " ").replace(/ BRANCH OF /g, " ").replace(/ BRANCH /g, " ");
    // "… TAI <địa danh>" ở nửa sau tên chi nhánh
    const idx = s.lastIndexOf(" TAI ");
    if (idx > s.length * 0.35) s = s.slice(0, idx) + " ";
  }
  // Chi nhánh kiểu Indonesia/Latin: "PT ABC CAB MEDAN", "XYZ SA SUCURSAL COLOMBIA" → bỏ từ dấu hiệu tới hết
  const mBr = s.match(/ (CAB|CABANG|SUCURSAL|SUC|FILIAL) /);
  if (mBr && mBr.index > s.length * 0.3) { isBranch = true; s = s.slice(0, mBr.index) + " "; }

  // 1) Xóa cụm pháp lý nhiều từ
  for (const p of LEGAL_PHRASES_PADDED) if (s.includes(p)) s = replacePadded(s, p, " ");
  // 2) Dịch cụm tiếng Việt → tiếng Anh
  for (const [vn, en] of VN_PHRASES_PADDED) if (s.includes(vn)) s = replacePadded(s, vn, en);

  let tokens = s.trim().split(" ").filter(Boolean);
  // 3) Viết tắt tiếng Việt, đồng nghĩa, từ pháp lý một chữ
  const out = [];
  for (const t of tokens) {
    if (LEGAL_TOKENS_ANYWHERE.has(t)) continue;
    let m = (isVN && VN_ABBREV[t]) || SYNONYMS[t] || t;
    m.split(" ").forEach((x) => out.push(x));
  }
  tokens = out;
  // 4) Xóa từ pháp lý ngắn ở hai đầu (lặp)
  let changed = true;
  while (changed && tokens.length) {
    changed = false;
    if (tokens.length > 1 && LEGAL_TOKENS_EDGE.has(tokens[tokens.length - 1])) { tokens.pop(); changed = true; }
    if (tokens.length > 1 && LEGAL_TOKENS_EDGE.has(tokens[0])) { tokens.shift(); changed = true; }
  }
  if (tokens.length === 1 && LEGAL_TOKENS_EDGE.has(tokens[0]) && tokens[0].length <= 2) tokens = [];
  // 5) Bỏ từ nối, khử trùng lặp liên tiếp
  tokens = tokens.filter((t) => !STOPWORDS.has(t));
  tokens = tokens.filter((t, i) => i === 0 || t !== tokens[i - 1]);

  if (!tokens.length) {
    flags.push("Tên chỉ gồm hình thức pháp lý/từ chung");
    tokens = norm ? norm.split(" ") : [];
  }
  const orderedKey = tokens.join(" ");
  // Khóa lõi = (từ chung, sắp xếp) + (phần tên riêng, GIỮ THỨ TỰ)
  //  → "PHAN BON PHU BINH" ≡ "PHU BINH FERTILIZER" nhưng "PHU HUNG" ≠ "HUNG PHU"
  const seenT = new Set();
  const distinct = [], generic = [];
  for (const t of tokens) {
    if (seenT.has(t)) continue;
    seenT.add(t);
    (GENERIC_TOKENS.has(t) ? generic : distinct).push(t);
  }
  generic.sort();
  const distinctKey = distinct.join(" ");
  const coreKey = (generic.length ? generic.join(" ") + " | " : "") + distinctKey;
  const compactDistinct = distinctKey.replace(/\s+/g, "");

  if (orderedKey.replace(/\s+/g, "").length <= 3) flags.push("Tên quá ngắn/viết tắt");
  if (isBranch) flags.push("Chi nhánh (đã gộp về DN chính)");
  if (LOGISTICS_RE.test(norm)) flags.push("Có thể là DN logistics/giao nhận");
  // nhiều DN trong một ô: ≥ 2 cụm pháp lý TÁCH RỜI nhau bởi tên khác ("ABC LTD / XYZ JSC"), hoặc "C/O", ";"
  const collapsed = (" " + norm + " ").replace(COMPOUND_LEGAL_RE, " §LEGAL§ ");
  const legalHits = (collapsed.match(LEGAL_COUNT_RE) || []).length + (collapsed.match(/§LEGAL§/g) || []).length;
  const separated = /§LEGAL§ (?!§LEGAL§)\S+.* (§LEGAL§|LTD|LIMITED|JSC|LLC|INC|CORP|CORPORATION|GMBH|TNHH|CTCP|PLC)( |$)/.test(collapsed.replace(LEGAL_COUNT_RE, "§LEGAL§"));
  if ((legalHits >= 2 && separated) || / C O /.test(" " + norm + " ") || /[;|]| \/ /.test(String(raw))) {
    flags.push("Có thể nhiều DN trong một ô");
  }
  return { norm, tokens, orderedKey, coreKey, distinctKey, compactDistinct, isVN, isBranch, flags };
}

/* ─────────────── Placeholder ─────────────── */
const PH_EXACT = new Set(DEFAULT_PLACEHOLDERS.map((p) => normText(p)));
const PH_PREFIX = PLACEHOLDER_PREFIXES.map((p) => normText(p));

/** Biên dịch danh sách placeholder tùy chỉnh. "ABC*" = bắt đầu bằng "ABC". */
export function compilePlaceholders(custom = []) {
  const exact = new Set(PH_EXACT), prefixes = [...PH_PREFIX];
  for (const c of custom) {
    const str = String(c || "").trim();
    if (!str) continue;
    if (str.endsWith("*")) { const n = normText(str.slice(0, -1)); if (n) prefixes.push(n); }
    else { const n = normText(str); if (n) exact.add(n); }
  }
  return { exact, prefixes };
}

/** Trả về lý do nếu là placeholder, ngược lại null. */
export function placeholderReason(raw, compiled) {
  const n = normText(raw);
  if (!n) return "Ô trống / chỉ có ký tự đặc biệt";
  if (/^[0-9 ]+$/.test(n)) return "Chỉ gồm chữ số";
  if (n.length < 2) return "Tên quá ngắn (1 ký tự)";
  if (compiled.exact.has(n)) return "Danh sách loại trừ: " + n;
  for (const p of compiled.prefixes) {
    if (n === p || n.startsWith(p + " ")) return "Bắt đầu bằng: " + p;
  }
  return null;
}

/* ─────────────── Tên hiển thị ─────────────── */
const SUFFIX_FIXES = [
  [/\bCO\s*[.,]{0,3}\s*,?\s*LTD\b\.?/gi, "Co., Ltd."],
  [/\bCOMPANY\s+LIMITED\b/gi, "Company Limited"],
  [/\bPVT\s*\.?\s*LTD\b\.?/gi, "Pvt. Ltd."],
  [/\bPTE\s*\.?\s*LTD\b\.?/gi, "Pte. Ltd."],
  [/\bPTY\s*\.?\s*LTD\b\.?/gi, "Pty. Ltd."],
  [/\bSDN\s*\.?\s*BHD\b\.?/gi, "Sdn. Bhd."],
  [/\bS\s*\.?\s*A\s*\.?\s*DE\s*C\s*\.?\s*V\b\.?/gi, "S.A. de C.V."],
  [/\bS\s*\.?\s*DE\s*R\s*\.?\s*L\s*\.?\s*DE\s*C\s*\.?\s*V\b\.?/gi, "S. de R.L. de C.V."],
  [/\bGMBH\s*(&|AND)\s*CO\s*\.?\s*KG\b/gi, "GmbH & Co. KG"],
  [/\bGMBH\b/gi, "GmbH"],
  [/\bS\s*\.\s*R\s*\.\s*L\b\.?/gi, "S.R.L."],
  [/\bS\s*\.\s*P\s*\.\s*A\b\.?/gi, "S.p.A."],
  [/\bSP\s*\.?\s*Z\s*O\s*\.?\s*O\b\.?/gi, "Sp. z o.o."],
  [/\bJ\s*\.?\s*S\s*\.?\s*C\b\.?/g, "JSC"],
  [/\bJSC\b\.?/gi, "JSC"],
  [/\bLLC\b\.?/gi, "LLC"],
  [/\bPLC\b\.?/gi, "PLC"],
  [/\bINC\b\.?/gi, "Inc."],
  [/\bCORP\b\.?/gi, "Corp."],
  [/\bLTD\b\.?/gi, "Ltd."],
  [/\bTNHH\b/gi, "TNHH"],
  [/\bMTV\b/gi, "MTV"],
];

/**
 * Làm sạch tên hiển thị từ một biến thể THẬT trong dữ liệu (không dịch, không ghép).
 * nameCase: "title" (Viết Hoa Chữ Đầu) | "upper" (IN HOA)
 */
export function cleanDisplayName(raw, nameCase = "title") {
  let s = String(raw ?? "").replace(/[\u00A0\t\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  s = s.replace(/(\p{L})"(\p{L})/gu, '$1 "$2');
  s = s.replace(/\s+([,.;:])/g, "$1").replace(/([,;])(?=\S)/g, "$1 ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  s = s.replace(/^[\s,.;:\-–]+|[\s,;:\-–]+$/g, "");
  if (nameCase === "upper") {
    s = s.toLocaleUpperCase("vi");
  } else {
    s = smartTitleCase(s);
  }
  for (const [re, fix] of SUFFIX_FIXES) s = s.replace(re, nameCase === "upper" ? fix.toUpperCase().replace("GMBH", "GMBH") : fix);
  // khử lặp hậu tố: "Ltd. Ltd." / "Co., Ltd. Ltd."
  s = s.replace(/\b(Co\., Ltd\.|Ltd\.|Inc\.|Corp\.|JSC|LLC)(\s+\1)+/gi, "$1");
  s = s.replace(/\bCo\., Ltd\.\s+Ltd\./gi, "Co., Ltd.");
  return s.replace(/\s+/g, " ").trim();
}
