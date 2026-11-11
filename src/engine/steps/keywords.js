/* ═══════════════════════════════════════════════════════════════
   BỘ PHÂN KHÚC & SO KHỚP TỪ KHÓA — thuần JavaScript (không phụ thuộc thư viện Excel)
   Dùng chung cho bước 10–11, trình soạn phân khúc trên giao diện và hồ sơ sản phẩm.
   ═══════════════════════════════════════════════════════════════ */
import { normText, escapeRe } from "../text.js";
import { OUT_OF_SCOPE } from "./price.js";

/** Chuẩn hóa & kiểm tra một bộ phân khúc (từ file Excel, trình soạn trên giao diện hoặc hồ sơ sản phẩm). */
export function buildKeywordSet(def, label = "Bộ từ khóa") {
  const clean = (arr) => {
    const out = [], seen = new Set();
    for (const raw of arr || []) {
      String(raw ?? "").split(/[\n;]+/).forEach((part) => {
        const k = part.trim();
        if (!k) return;
        const nk = normText(k.replace(/^-/, "")) + (k.endsWith("*") ? "*" : "");
        if (!normText(k.replace(/\*$/, "").replace(/^-/, ""))) return;
        if (seen.has(nk + (k.startsWith("-") ? "-" : ""))) return;
        seen.add(nk + (k.startsWith("-") ? "-" : ""));
        out.push(k);
      });
    }
    return out;
  };
  const segments = [];
  const names = new Set();
  for (const sg of def?.segments || []) {
    const name = String(sg?.name ?? "").trim();
    if (!name) continue;
    if (names.has(normText(name))) throw new Error(`Tên phân khúc bị trùng: "${name}".`);
    names.add(normText(name));
    // từ khóa bắt đầu bằng "-" trong danh sách bao gồm cũng được hiểu là loại trừ riêng
    const inc = [], exc = [];
    clean(sg.include).forEach((k) => (k.startsWith("-") ? exc.push(k.slice(1).trim()) : inc.push(k)));
    clean(sg.exclude).forEach((k) => exc.push(k.replace(/^-/, "").trim()));
    segments.push({ name, include: [...new Set(inc)], exclude: [...new Set(exc)], ...(sg.note ? { note: String(sg.note) } : {}) });
  }
  const exclusions = [...new Set(clean(def?.exclusions).map((k) => k.replace(/^-/, "").trim()))];
  const warnings = [];
  const seen = new Map(), conflicts = [];
  segments.forEach((sg) => sg.include.forEach((k) => {
    const nk = normText(k);
    if (seen.has(nk) && seen.get(nk) !== sg.name) conflicts.push({ keyword: k, segments: `${seen.get(nk)} | ${sg.name}` });
    else seen.set(nk, sg.name);
  }));
  segments.forEach((sg) => {
    if (!sg.include.length) warnings.push(`Phân khúc "${sg.name}" chưa có từ khóa nào.`);
    sg.include.forEach((k) => { if (normText(k).replace(/\*/g, "").length <= 2) warnings.push(`Từ khóa rất ngắn "${k}" (${sg.name}) — dễ khớp nhầm nếu dùng chế độ "chứa chuỗi".`); });
  });
  return { fileName: label, sheet: "", segments, exclusions, conflicts, warnings: warnings.slice(0, 30) };
}

/** Chuỗi dùng để so khớp từ khóa của dòng i: mô tả (+ mã HS dạng chữ số liền nếu chọn). */
export function matchText(y, i, fields) {
  const d = y.map.productDesc >= 0 ? y.rows[i][y.map.productDesc] : null;
  if (fields !== "desc_hs" || !(y.map.hsCode >= 0)) return d;
  const hs = y.rows[i][y.map.hsCode];
  const digits = hs === null || hs === undefined ? "" : String(hs).replace(/\D/g, "");
  if (!digits) return d;
  return (d === null || d === undefined ? "" : String(d)) + " " + digits;
}

/** Biên dịch bộ từ khóa thành bộ so khớp nhanh (chỉ mục theo từ đầu tiên + memo theo mô tả). */
export function compileMatcher(kw, mode = "word") {
  const segs = kw.segments.map((s, idx) => ({ name: s.name, idx, inc: s.include.map(prep).filter(Boolean), exc: s.exclude.map(prep).filter(Boolean) }));
  const glob = (kw.exclusions || []).map(prep).filter(Boolean);
  const firstIdx = new Map();
  const wild = [];
  const addIdx = (entry) => {
    if (entry.wild) { wild.push(entry); return; }
    const ft = entry.norm.split(" ")[0];
    if (!firstIdx.has(ft)) firstIdx.set(ft, []);
    firstIdx.get(ft).push(entry);
  };
  segs.forEach((s) => {
    s.inc.forEach((k) => addIdx({ ...k, seg: s.idx, type: "inc" }));
    s.exc.forEach((k) => addIdx({ ...k, seg: s.idx, type: "exc" }));
  });
  glob.forEach((k) => addIdx({ ...k, seg: -1, type: "glob" }));
  const all = [...firstIdx.values()].flat().concat(wild);
  const memo = new Map();

  function find(desc) {
    const nd = normText(desc);
    if (memo.has(nd)) return memo.get(nd);
    const hits = [];
    if (nd) {
      if (mode === "substring") {
        for (const e of all) if (e.wild ? e.re.test(nd) : nd.includes(e.norm)) hits.push(e);
      } else {
        const padded = " " + nd + " ";
        const toks = new Set(nd.split(" "));
        for (const t of toks) {
          const c = firstIdx.get(t);
          if (c) for (const e of c) if (padded.includes(" " + e.norm + " ")) hits.push(e);
        }
        for (const e of wild) if (e.re.test(nd)) hits.push(e);
      }
    }
    const res = decide(hits, segs);
    if (memo.size < 300000) memo.set(nd, res);
    return res;
  }
  return { find, segs, all };
}

function prep(k) {
  const raw = String(k).trim();
  const wild = raw.endsWith("*");
  const norm = normText(wild ? raw.slice(0, -1) : raw);
  if (!norm) return null;
  const e = { raw, norm, wild, len: norm.length };
  if (wild) e.re = new RegExp("(?:^| )" + escapeRe(norm) + "[A-Z0-9]*(?= |$)");
  return e;
}

function decide(hits, segs) {
  if (!hits.length) return { seg: null, detail: "", conf: "", hits };
  if (hits.some((h) => h.type === "glob")) {
    const g = hits.filter((h) => h.type === "glob").map((h) => h.raw);
    return { seg: OUT_OF_SCOPE, detail: "LOẠI TRỪ(" + [...new Set(g)].join("+") + ")", conf: "Khớp từ khóa loại trừ", hits };
  }
  const per = new Map();
  for (const h of hits) {
    if (!per.has(h.seg)) per.set(h.seg, { inc: new Map(), exc: false });
    const p = per.get(h.seg);
    if (h.type === "exc") p.exc = true; else p.inc.set(h.norm, h);
  }
  const cands = [];
  per.forEach((p, idx) => { if (!p.exc && p.inc.size) cands.push({ idx, count: p.inc.size, maxLen: Math.max(...[...p.inc.values()].map((h) => h.len)), kws: [...p.inc.values()].map((h) => h.raw) }); });
  if (!cands.length) return { seg: null, detail: "(bị loại bởi từ khóa loại trừ của phân khúc)", conf: "", hits };
  cands.sort((a, b) => b.count - a.count || b.maxLen - a.maxLen || a.idx - b.idx);
  const [w, r] = cands;
  let conf;
  if (cands.length === 1) conf = "Một phân khúc";
  else if (w.count > r.count) conf = "Nhiều phân khúc – rõ ràng";
  else if (w.maxLen > r.maxLen) conf = "Hòa – chọn từ khóa dài hơn (nên rà soát)";
  else conf = "Hòa – chọn theo thứ tự cột (nên rà soát)";
  const detail = cands.map((c) => `${segs[c.idx].name}(${c.kws.join("+")})`).join("; ");
  return { seg: segs[w.idx].name, detail, conf, hits };
}

/** Thử nhanh một mô tả với bộ phân khúc nháp. */
export function testKeywords(def, text, mode = "word") {
  const kw = buildKeywordSet(def, "Nháp");
  const m = compileMatcher(kw, mode);
  const r = m.find(text);
  return {
    segment: r.seg || "", detail: r.detail, confidence: r.conf,
    hits: r.hits.map((h) => ({ keyword: h.raw, type: h.type, segment: h.seg >= 0 ? kw.segments[h.seg]?.name : "LOẠI TRỪ" })),
  };
}
