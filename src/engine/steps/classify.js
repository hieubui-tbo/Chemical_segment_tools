/* ═══════════════════════════════════════════════════════════════
   BƯỚC 10 — BỘ TỪ KHÓA PHÂN KHÚC  ·  BƯỚC 11 — PHÂN LOẠI PHÂN KHÚC
   Định dạng bộ từ khóa (giữ như V17): STT | Phân khúc 1 | Phân khúc 2 | …  — từ khóa liệt kê dưới mỗi cột.
   Mở rộng (tùy chọn):
     · "PHOSPHAT*"      → khớp mọi từ bắt đầu bằng PHOSPHAT (PHOSPHATE, PHOSPHATES…)
     · "-THIOUREA"      → từ khóa LOẠI TRỪ của riêng phân khúc đó
     · Cột tên "LOẠI TRỪ" / "NGOÀI PHẠM VI" / "EXCLUDE" → dòng khớp sẽ bị gắn "Ngoài phạm vi sản phẩm"
   So khớp theo TỪ NGUYÊN VẸN (mặc định): "UREA" không khớp "THIOUREA"; không phân biệt dấu/hoa thường.
   Chọn phân khúc: nhiều từ khóa khớp nhất → hòa thì từ khóa dài (cụ thể) hơn → hòa nữa thì theo thứ tự cột.
   ═══════════════════════════════════════════════════════════════ */
import { readReferenceTables } from "../io/read.js";
import { normText } from "../text.js";
import { parseNumber } from "../numbers.js";
import { OUT_OF_SCOPE, UNCLASSIFIED } from "./price.js";
import { buildKeywordSet, compileMatcher, matchText, testKeywords } from "./keywords.js";
export { buildKeywordSet, compileMatcher, matchText, testKeywords };

const IGNORE_COLS = new Set(["STT", "NO", "SO TT", "SO THU TU", "", "INDEX", "TT", "N"]);
const EXCLUDE_COLS = new Set(["LOAI TRU", "NGOAI PHAM VI", "EXCLUDE", "EXCLUDED", "OUT OF SCOPE", "KHONG LIEN QUAN", "LOAI", "LOAI BO", "NOT RELEVANT", "IRRELEVANT"]);

export function parseKeywordMatrix(buffer, fileName) {
  const tables = readReferenceTables(buffer, fileName);
  const t = tables.find((x) => x.rows.length) || tables[0];
  if (!t) throw new Error("Tệp không có dữ liệu.");
  const segments = [];
  const exclusions = [];
  const warnings = [];
  t.headers.forEach((h, j) => {
    const nh = normText(h);
    if (IGNORE_COLS.has(nh) || /^COT [A-Z]+$/.test(nh)) return;
    const kws = [];
    for (const r of t.rows) {
      const v = r[j];
      if (v === null || v === undefined) continue;
      String(v).split(/[\n;]+/).forEach((part) => { const k = part.trim(); if (k) kws.push(k); });
    }
    if (!kws.length) return;
    if (EXCLUDE_COLS.has(nh)) { kws.forEach((k) => exclusions.push(k)); return; }
    const include = [], exclude = [];
    kws.forEach((k) => (k.startsWith("-") ? exclude.push(k.slice(1).trim()) : include.push(k)));
    segments.push({ name: String(h).trim(), include, exclude });
  });
  if (!segments.length) throw new Error("Không tìm thấy cột phân khúc nào. Định dạng: STT | Phân khúc 1 | Phân khúc 2 | … (từ khóa liệt kê dưới mỗi cột).");
  const kw = buildKeywordSet({ segments, exclusions }, fileName);
  kw.sheet = t.sheet;
  return kw;
}

export function runClassify(engine, progress) {
  const kw = engine.refs.keywords;
  const mode = engine.settings.keywordMatchMode || "word";
  const fields = engine.settings.keywordFields || "desc";
  const basis = engine.settings.segmentBasis || "keyword_first";
  const useKw = basis !== "industry_only";           // industry_only vẫn dùng cột LOẠI TRỪ (ngoài phạm vi)
  const useInd = basis !== "keyword_only";
  const indFirst = basis === "industry_first" || basis === "industry_only";
  const matcher = kw ? compileMatcher(kw, mode) : null;
  const segNames = kw ? kw.segments.map((s) => s.name) : [];
  const canon = new Map(segNames.map((n) => [normText(n), n]));
  const kwHits = new Map(); // từ khóa → số dòng
  const unclassified = new Map();
  const industryNotInMatrix = new Map();
  const out = { years: {}, mode, fields, basis, hasMatrix: !!kw, segments: segNames };
  engine.years.forEach((y, yi) => {
    const IS = y.cols.Industry_Segment;
    const TV = y.cols.TotalValue_Clean;
    const KS = new Array(y.n), KD = new Array(y.n), KC = new Array(y.n), FS = new Array(y.n), SM = new Array(y.n), SC = new Array(y.n);
    const c = { keyword: 0, industry: 0, unclassified: 0, outOfScope: 0, ties: 0, mismatch: 0 };
    const segDist = new Map();
    for (let i = 0; i < y.n; i++) {
      const desc = y.map.productDesc >= 0 ? y.rows[i][y.map.productDesc] : null;
      const r = matcher ? matcher.find(matchText(y, i, fields)) : { seg: null, detail: "", conf: "", hits: [] };
      if (r.hits.length) for (const h of r.hits) if (h.type !== "exc") kwHits.set(h.seg + "§" + h.raw, (kwHits.get(h.seg + "§" + h.raw) || 0) + 1);
      const ind = IS ? IS[i] : "";
      const indCanon = ind ? canon.get(normText(ind)) || ind : "";
      if (ind && kw && !canon.has(normText(ind))) industryNotInMatrix.set(ind, (industryNotInMatrix.get(ind) || 0) + 1);
      KS[i] = r.seg && r.seg !== OUT_OF_SCOPE ? r.seg : ""; KD[i] = r.detail; KC[i] = r.conf; SC[i] = "";
      const kwSeg = useKw && r.seg && r.seg !== OUT_OF_SCOPE ? r.seg : null;
      const indSeg = useInd && indCanon ? indCanon : null;
      if (kwSeg && indSeg) { if (normText(indSeg) === normText(kwSeg)) SC[i] = "Khớp"; else { SC[i] = "Khác nhau (nên rà soát)"; c.mismatch++; } }
      if (r.seg === OUT_OF_SCOPE) { FS[i] = OUT_OF_SCOPE; SM[i] = "Từ khóa loại trừ"; c.outOfScope++; }
      else if (indFirst && indSeg) { FS[i] = indSeg; SM[i] = basis === "industry_only" ? "Ngành của doanh nghiệp" : "Ngành của doanh nghiệp (ưu tiên)"; c.industry++; }
      else if (kwSeg) {
        FS[i] = kwSeg; SM[i] = indFirst ? "Từ khóa (dự phòng)" : "Từ khóa"; c.keyword++;
        if (r.tie) c.ties++;
      } else if (!indFirst && indSeg) { FS[i] = indSeg; SM[i] = "Ngành (dự phòng)"; c.industry++; }
      else {
        FS[i] = UNCLASSIFIED; SM[i] = "Chưa phân loại"; c.unclassified++;
        const nd = desc ? String(desc).trim().toUpperCase().slice(0, 160) : "(trống)";
        const u = unclassified.get(nd) || { desc: nd, rows: 0, value: 0 };
        u.rows++; u.value += TV[i] > 0 ? TV[i] : 0; unclassified.set(nd, u);
      }
      const sd = segDist.get(FS[i]) || { segment: FS[i], rows: 0, value: 0 };
      sd.rows++; sd.value += TV[i] > 0 ? TV[i] : 0; segDist.set(FS[i], sd);
      if ((i & 8191) === 0) progress((yi + i / y.n) / engine.years.length, `Năm ${y.year}`);
    }
    y.cols.Keyword_Segment = KS; y.cols.Keyword_Match_Detail = KD; y.cols.Keyword_Confidence = KC;
    y.cols.Final_Segment = FS; y.cols.Segment_Method = SM; y.cols.Segment_Consistency = SC;
    out.years[y.year] = { rows: y.n, ...c, segments: [...segDist.values()].sort((a, b) => b.value - a.value || b.rows - a.rows) };
  });
  if (kw) {
    out.keywordStats = [];
    kw.segments.forEach((s, idx) => s.include.forEach((k) => out.keywordStats.push({ segment: s.name, keyword: k, rows: kwHits.get(idx + "§" + k) || 0 })));
    (kw.exclusions || []).forEach((k) => out.keywordStats.push({ segment: "LOẠI TRỪ", keyword: k, rows: kwHits.get("-1§" + k) || 0 }));
    out.deadKeywords = out.keywordStats.filter((k) => !k.rows).length;
  }
  out.unclassifiedTop = [...unclassified.values()].sort((a, b) => b.value - a.value || b.rows - a.rows).slice(0, 60);
  out.unclassifiedDistinct = unclassified.size;
  out.industryNotInMatrix = [...industryNotInMatrix.entries()].map(([segment, rows]) => ({ segment, rows }));
  return out;
}

/* ═════════ XEM TRƯỚC ĐỘ PHỦ & GỢI Ý TỪ KHÓA (dùng cho trình soạn phân khúc) ═════════
   Chạy bộ phân khúc NHÁP trên toàn bộ mô tả mà không thay đổi kết quả đang có.
   Gợi ý = từ/cụm 2 từ xuất hiện nhiều (theo trị giá) trong các mô tả CHƯA khớp phân khúc nào,
   bỏ từ chung chung (bao bì, đơn vị, số…) và bỏ từ xuất hiện ở hơn 1/2 số mô tả (vd: tên sản phẩm).        */
const NOISE = new Set(("A AN THE AND OR OF IN ON AT TO BY AS IS ARE BE WITH FROM FOR PER VIA NOT NO NOS NR " +
  "NET GROSS WEIGHT WT KG KGS KGM KGR G GR GM MT MTS TON TONS TONNE TONNES TNE TN LB LBS PCS PC PKG PKGS UNIT UNITS QTY QUANTITY " +
  "BAG BAGS SACK SACKS JUMBO BIG BULK PP PE WOVEN LINER INNER OUTER PLASTIC PAPER DRUM DRUMS CARTON CARTONS CTN CTNS BOX BOXES " +
  "PALLET PALLETS PACK PACKED PACKING PACKAGE PACKAGES PACKAGING CONTAINER CONTAINERS CNTR FCL LCL HC GP " +
  "HS CODE CODES TARIFF ITEM ITEMS GOODS PRODUCT PRODUCTS LOT BATCH DATE INVOICE CONTRACT ORDER PO REF NUMBER " +
  "ORIGIN MADE BRAND MODEL SPEC SPECS SPECIFICATION SPECIFICATIONS CAS FORMULA DETAIL DETAILS AS PER ATTACHED " +
  "TOTAL NEW USED THE AND CO LTD LIMITED INC CORP COMPANY " +
  "MARK MARKS MARKING SHIPPING SHIPMENT VESSEL PORT FOB CIF CFR CNF EXW DAP DDP PAYMENT LC TT " +
  "CHINA CHINESE VIETNAM INDIA INDONESIA THAILAND MALAYSIA PHILIPPINES SINGAPORE KOREA JAPAN TAIWAN RUSSIA RUSSIAN USA AMERICA " +
  "GERMANY FRANCE SPAIN ITALY TURKEY BRAZIL BRASIL MEXICO CHILE PERU ARGENTINA COLOMBIA EGYPT PAKISTAN BANGLADESH UKRAINE " +
  "HANG HOA MOI 100 CUA VA CHO VOI TRONG THEO LOAI DONG GOI TINH TRANG SAN PHAM MA SO KHOI LUONG BAO TAN DUNG XUAT XU NHAP KHAU").split(" "));
const WEAK = new Set("GRADE TYPE PURITY PURE MIN MAX USE USED APPLICATION CLASS FORM QUALITY STANDARD STD CONTENT".split(" "));

export function previewKeywords(engine, def, opts = {}) {
  const kw = buildKeywordSet(def, "Nháp");
  const mode = opts.mode || engine.settings.keywordMatchMode || "word";
  const fields = opts.fields || engine.settings.keywordFields || "desc";
  const matcher = compileMatcher(kw, mode);
  const kwNorm = new Set();
  kw.segments.forEach((sg) => sg.include.forEach((k) => kwNorm.add(normText(k.replace(/\*$/, "")))));
  kw.exclusions.forEach((k) => kwNorm.add(normText(k.replace(/\*$/, ""))));
  const seg = new Map(kw.segments.map((sg) => [sg.name, { segment: sg.name, rows: 0, value: 0 }]));
  const tot = { rows: 0, value: 0, matchedRows: 0, matchedValue: 0, outRows: 0, outValue: 0, unRows: 0, unValue: 0, ties: 0, noDesc: 0 };
  const hitCount = new Map();
  const unmatched = new Map();     // mô tả chuẩn hóa → {rows, value, sample}
  const df = new Map();            // tần suất xuất hiện của từ/cụm trên các mô tả khác nhau
  const dfM = new Map();           // … trên các mô tả ĐÃ khớp phân khúc (để loại từ không phân biệt, vd tên sản phẩm bằng nhiều thứ tiếng)
  const seenDesc = new Set();
  let distinct = 0, distinctM = 0, distinctU = 0;
  const grams = (nd) => {
    const toks = nd.split(" ").filter(Boolean);
    const out = new Set();
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const ok = t.length >= 3 && !/^\d/.test(t) && !/\d{3,}/.test(t) && !NOISE.has(t);
      if (ok && !WEAK.has(t)) out.add(t);
      if (i + 1 < toks.length) {
        const u = toks[i + 1];
        const ok2 = u.length >= 2 && !/^\d/.test(u) && !/\d{3,}/.test(u) && !NOISE.has(u);
        if (ok && ok2 && !(WEAK.has(t) && WEAK.has(u))) out.add(t + " " + u);
      }
    }
    return out;
  };
  for (const y of engine.years) {
    const TV = y.cols.TotalValue_Clean;
    const tvIdx = y.map.totalValue;
    for (let i = 0; i < y.n; i++) {
      // trước bước 4 chưa có cột trị giá (sạch) ⇒ đọc trực tiếp từ cột gốc
      const tv = TV ? TV[i] : tvIdx >= 0 ? parseNumber(y.rows[i][tvIdx]) : 0;
      const v = tv > 0 ? tv : 0;
      tot.rows++; tot.value += v;
      const text = matchText(y, i, fields);
      if (text === null || text === undefined || String(text).trim() === "") tot.noDesc++;
      const r = matcher.find(text);
      for (const h of r.hits) if (h.type !== "exc") hitCount.set(h.seg + "§" + h.raw, (hitCount.get(h.seg + "§" + h.raw) || 0) + 1);
      const nd = normText(text);
      if (nd && !seenDesc.has(nd)) {
        seenDesc.add(nd); distinct++;
        const isM = !!r.seg;
        if (isM) distinctM++; else distinctU++;
        for (const g of grams(nd)) { df.set(g, (df.get(g) || 0) + 1); if (isM) dfM.set(g, (dfM.get(g) || 0) + 1); }
      }
      if (r.seg === OUT_OF_SCOPE) { tot.outRows++; tot.outValue += v; }
      else if (r.seg) {
        tot.matchedRows++; tot.matchedValue += v;
        const sd = seg.get(r.seg); sd.rows++; sd.value += v;
        if (r.tie) tot.ties++;
      } else {
        tot.unRows++; tot.unValue += v;
        const key = nd || "";
        const u = unmatched.get(key) || { desc: text ? String(text).trim().slice(0, 180) : "(trống)", rows: 0, value: 0 };
        u.rows++; u.value += v; unmatched.set(key, u);
      }
    }
  }
  // gợi ý
  const sug = new Map();
  for (const [nd, u] of unmatched) {
    if (!nd) continue;
    for (const g of grams(nd)) {
      if (kwNorm.has(g)) continue;
      const s = sug.get(g) || { term: g, rows: 0, value: 0, descs: 0, sample: u.desc };
      s.rows += u.rows; s.value += u.value; s.descs++;
      if (u.value > (s._best || 0)) { s._best = u.value; s.sample = u.desc; }
      sug.set(g, s);
    }
  }
  const generic = Math.max(5, distinct * 0.5);
  const unV = tot.unValue || 1;
  // từ có tỷ lệ xuất hiện ở mô tả chưa khớp không cao hơn hẳn (≥ 2 lần) so với mô tả đã khớp ⇒ không giúp phân biệt ⇒ bỏ
  const discriminative = (term) => {
    const m = dfM.get(term) || 0;
    if (!m || !distinctM) return true;
    const u = (df.get(term) || 0) - m;
    return u / Math.max(1, distinctU) >= 2 * (m / distinctM);
  };
  const suggestions = [...sug.values()]
    .filter((s) => (df.get(s.term) || 0) <= generic && (s.descs >= 2 || s.rows >= 3) && discriminative(s.term))
    .map((s) => ({ term: s.term, rows: s.rows, value: s.value, share: s.value / unV, descs: s.descs, sample: s.sample }))
    .sort((a, b) => b.value - a.value || b.rows - a.rows)
    // bỏ từ đơn đã nằm trọn trong một cụm 2 từ có độ phủ gần bằng (giữ cụm cụ thể hơn)
    .filter((s, _, arr) => s.term.includes(" ") || !arr.some((o) => o.term.includes(" ") && o.term.split(" ").includes(s.term) && o.value >= s.value * 0.9))
    .slice(0, 40);
  const keywordStats = [];
  kw.segments.forEach((sg, idx) => sg.include.forEach((k) => keywordStats.push({ segment: sg.name, keyword: k, rows: hitCount.get(idx + "§" + k) || 0 })));
  kw.exclusions.forEach((k) => keywordStats.push({ segment: "LOẠI TRỪ", keyword: k, rows: hitCount.get("-1§" + k) || 0 }));
  return {
    totals: tot, distinct, mode, fields,
    segments: [...seg.values()],
    unmatchedTop: [...unmatched.values()].sort((a, b) => b.value - a.value || b.rows - a.rows).slice(0, 40),
    unmatchedDistinct: unmatched.size,
    suggestions,
    deadKeywords: keywordStats.filter((k) => !k.rows).map((k) => `${k.keyword} (${k.segment})`),
    conflicts: kw.conflicts, warnings: kw.warnings,
  };
}

