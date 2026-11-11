/* ═══════════════════════════════════════════════════════════════
   BƯỚC 6 — CHUẨN HÓA DOANH NGHIỆP (ENTITY RESOLUTION)
   Chạy MỘT LẦN trên toàn bộ các năm ⇒ mã nhóm & tên chuẩn hóa thống nhất giữa các năm.

   Quy trình cho từng loại (DN mua / DN bán):
   1. Gom các tên thô giống nhau sau chuẩn hóa ký tự (+ quốc gia nếu nhóm theo quốc gia).
   2. Loại placeholder (TO ORDER, N/A, ô trống…) — không tạo DN.
   3. Áp từ điển người dùng (nếu có) — ưu tiên tuyệt đối.
   4. Khóa lõi = bỏ hình thức pháp lý + dịch cụm từ Việt→Anh + chuẩn đồng nghĩa + sắp xếp từ.
      Trùng khóa lõi ⇒ cùng DN (độ tin cậy Chính xác/Cao).
   5. Gộp mức Trung bình: trùng "phần tên riêng" (bỏ từ chung như TRADING, CHEMICAL…), có chặn
      tên riêng quá phổ biến (> 6 biến thể khác nhau ⇒ không gộp).
   6. Gộp mức Thấp/Trung bình: gần đúng ký tự (Jaro-Winkler ≥ ngưỡng) — chỉ so trong cùng khối
      (cùng quốc gia + cùng 3 ký tự đầu/cuối) để chạy nhanh trên dữ liệu lớn.
   7. Mỗi nhóm: chọn tên hiển thị từ biến thể THẬT có giá trị lớn nhất, gắn cờ rủi ro, trạng thái rà soát.
   ═══════════════════════════════════════════════════════════════ */
import { analyzeName, cleanDisplayName, compilePlaceholders, placeholderReason } from "../names.js";
import { resolveCountry } from "../dict/countries.js";
import { normText, normHeader, levenshtein } from "../text.js";
import { readReferenceTables } from "../io/read.js";
import { LABELS, CONF_RANK } from "../constants.js";

const { CONF, REVIEW } = LABELS;
const REVIEW_FLAGS = new Set(["Có thể nhiều DN trong một ô", "Tên quá ngắn/viết tắt", "Có thể là DN logistics/giao nhận", "Tên chỉ gồm hình thức pháp lý/từ chung"]);
const CONF_BY_RANK = Object.fromEntries(Object.entries(CONF_RANK).map(([k, v]) => [v, k]));
const val = (y, f, i) => (y.map[f] >= 0 ? y.rows[i][y.map[f]] : null);

class UnionFind {
  constructor(n) { this.p = new Int32Array(n).map((_, i) => i); }
  find(x) { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
  union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.p[b] = a; return a !== b; }
}

export function runEntity(engine, progress) {
  const s = engine.settings;
  const ph = compilePlaceholders(s.customPlaceholders);
  const ovr = buildOverrideIndex(engine.refs.overrides.entries);
  const summary = {};
  const types = [
    { type: "Purchaser", prefix: "P", nameField: "purchaser", countryField: "purchCountry", byCountry: true },
    { type: "Supplier", prefix: "S", nameField: "supplier", countryField: "countryOrigin", byCountry: !!s.supplierGroupByCountry },
  ];
  types.forEach((t, ti) => {
    const res = resolveType(engine, t, { ph, ovr, settings: s }, (p, m) => progress((ti + p) / 2, m));
    engine.entities[t.type] = res.dict;
    summary[t.type] = res.summary;
  });
  summary.crossSource = detectCrossSource(engine, (p, m) => progress(0.98 + 0.02 * p, m));
  summary.settings = { supplierGroupByCountry: !!s.supplierGroupByCountry, fuzzyEnabled: !!s.fuzzyEnabled, fuzzyThreshold: s.fuzzyThreshold, overrides: engine.refs.overrides.entries.length };
  return summary;
}

function resolveType(engine, t, ctx, progress) {
  const { type, prefix, nameField, countryField, byCountry } = t;
  const { ph, ovr, settings } = ctx;
  const label = type === "Purchaser" ? "DN mua" : "DN bán";

  /* 1) Gom cặp (tên chuẩn hóa ký tự, quốc gia) */
  const pairIndex = new Map();
  const pairs = [];
  const rowPair = engine.years.map((y) => new Int32Array(y.n));
  const countryRows = { unmapped: 0, blank: 0 };
  engine.years.forEach((y, yi) => {
    const TV = y.cols.TotalValue_Clean;
    const cName = new Array(y.n), cCont = new Array(y.n), cSea = new Array(y.n);
    for (let i = 0; i < y.n; i++) {
      const raw = val(y, nameField, i);
      const rawStr = raw === null || raw === undefined ? "" : String(raw).replace(/\s+/g, " ").trim();
      const cRaw = val(y, countryField, i);
      const c = resolveCountry(cRaw);
      cName[i] = c.name || (c.status === "Trống" ? "" : String(cRaw).trim());
      cCont[i] = c.continentLabel; cSea[i] = c.isSEA ? LABELS.YES : LABELS.NO;
      if (c.status === "Không nhận diện") countryRows.unmapped++; else if (c.status === "Trống") countryRows.blank++;
      const cKey = c.code || (c.status === "Trống" ? "" : "RAW:" + normText(cRaw));
      const norm = normText(rawStr);
      const key = norm + "|" + (byCountry ? cKey : "");
      let pi = pairIndex.get(key);
      if (pi === undefined) {
        pi = pairs.length; pairIndex.set(key, pi);
        pairs.push({ norm, raws: new Map(), cKey: byCountry ? cKey : "", countries: new Map(), rows: 0, value: 0 });
      }
      const p = pairs[pi];
      const v = TV && TV[i] > 0 ? TV[i] : 0;
      p.rows++; p.value += v;
      const re = p.raws.get(rawStr) || { count: 0, value: 0 }; re.count++; re.value += v; p.raws.set(rawStr, re);
      if (cKey) p.countries.set(cKey, (p.countries.get(cKey) || 0) + v + 1e-9);
      rowPair[yi][i] = pi;
      if ((i & 16383) === 0) progress(0.4 * (yi + i / y.n) / engine.years.length, `${label}: gom tên – năm ${y.year}`);
    }
    y.cols[`${type}_Country_Std`] = cName; y.cols[`${type}_Continent`] = cCont; y.cols[`${type}_Is_SEA`] = cSea;
  });

  /* 2–4) Placeholder, từ điển, khóa lõi → bucket */
  const bucketIndex = new Map();
  const buckets = [];
  const pairBucket = new Int32Array(pairs.length).fill(-1);
  const pairPh = new Array(pairs.length).fill(null);
  pairs.forEach((p, pi) => {
    const sampleRaw = p.raws.keys().next().value;
    const o = lookupOverride(ovr, p.norm, p.cKey, type);
    if (o && o.isExclude) { pairPh[pi] = "Từ điển người dùng: loại trừ"; return; }
    if (!o) {
      const reason = placeholderReason(sampleRaw, ph);
      if (reason) { pairPh[pi] = reason; return; }
    }
    const a = analyzeName(sampleRaw);
    const bKey = (o ? "OVR|" + normText(o.name) : "K|" + a.coreKey) + "|" + p.cKey;
    let bi = bucketIndex.get(bKey);
    if (bi === undefined) {
      bi = buckets.length; bucketIndex.set(bKey, bi);
      buckets.push({ coreKey: a.coreKey, distinctKey: a.distinctKey, compact: a.compactDistinct, cKey: p.cKey, isOverride: !!o, ovName: o?.name || "", pairs: [], value: 0, rows: 0, countries: new Set(), orderedKeys: new Set(), norms: new Set(), vn: new Set(), flags: new Set() });
    }
    const b = buckets[bi];
    b.pairs.push(pi); b.value += p.value; b.rows += p.rows;
    p.countries.forEach((_, k) => b.countries.add(k));
    b.orderedKeys.add(a.orderedKey); b.norms.add(p.norm); b.vn.add(a.isVN);
    a.flags.forEach((f) => b.flags.add(f));
    pairBucket[pi] = bi;
  });
  progress(0.5, `${label}: so khớp ${buckets.length.toLocaleString("vi-VN")} tên`);

  /* 5–6) Gộp giữa các bucket */
  const uf = new UnionFind(buckets.length);
  const edges = []; // {a, b, method, conf}
  const share = (b1, b2) => {
    if (byCountry) return b1.cKey === b2.cKey;
    if (!b1.countries.size || !b2.countries.size) return true;
    for (const c of b1.countries) if (b2.countries.has(c)) return true;
    return false;
  };
  const link = (a, b, method, conf) => { if (uf.union(a, b)) edges.push({ a, b, method, conf }); };

  // Bổ sung quốc gia: bucket thiếu quốc gia trùng khóa lõi với đúng 1 bucket có quốc gia
  if (byCountry) {
    const byCore = new Map();
    buckets.forEach((b, bi) => { if (b.isOverride) return; if (!byCore.has(b.coreKey)) byCore.set(b.coreKey, []); byCore.get(b.coreKey).push(bi); });
    byCore.forEach((list) => {
      const blank = list.filter((bi) => !buckets[bi].cKey);
      const known = list.filter((bi) => buckets[bi].cKey && !buckets[bi].cKey.startsWith("RAW:"));
      if (blank.length && known.length === 1) blank.forEach((bi) => link(known[0], bi, "Bổ sung quốc gia (tên trùng, thiếu quốc gia)", CONF.HIGH));
    });
  }

  // Trùng phần tên riêng (mức Trung bình)
  const byDistinct = new Map();
  buckets.forEach((b, bi) => {
    if (b.isOverride || b.compact.length < 4) return;
    const k = (byCountry ? b.cKey : "") + "|" + b.compact;
    if (!byDistinct.has(k)) byDistinct.set(k, []);
    byDistinct.get(k).push(bi);
  });
  let genericBlocked = 0;
  byDistinct.forEach((list) => {
    if (list.length < 2) return;
    if (list.length > 6) { genericBlocked += list.length; list.forEach((bi) => buckets[bi].flags.add("Tên riêng phổ biến – không tự gộp")); return; }
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (share(buckets[list[i]], buckets[list[j]])) link(list[i], list[j], "Trùng phần tên riêng (khác từ chung)", CONF.MEDIUM);
    }
  });

  // Gần đúng ký tự (lỗi chính tả): Levenshtein trên phần tên riêng (giữ thứ tự), ≥ 10 ký tự,
  // tỷ lệ giống ≥ ngưỡng (mặc định 0.90 ⇒ 10–19 ký tự cho phép 1 lỗi, ≥ 20 ký tự cho phép 2 lỗi)
  let fuzzyPairs = 0;
  if (settings.fuzzyEnabled) {
    const thr = Math.min(0.99, Math.max(0.8, Number(settings.fuzzyThreshold) || 0.9));
    const blocks = new Map();
    const addBlock = (k, bi) => { if (!blocks.has(k)) blocks.set(k, []); blocks.get(k).push(bi); };
    buckets.forEach((b, bi) => {
      if (b.isOverride || b.compact.length < 10) return;
      const ck = byCountry ? b.cKey : "";
      addBlock(ck + "|H|" + b.compact.slice(0, 4), bi);
      addBlock(ck + "|T|" + b.compact.slice(-4), bi);
    });
    let bDone = 0;
    blocks.forEach((list) => {
      bDone++;
      if (list.length < 2) return;
      const big = list.length > 600;
      const L = big ? list.slice().sort((x, y) => buckets[x].compact.length - buckets[y].compact.length) : list;
      for (let i = 0; i < L.length; i++) {
        const bi = buckets[L[i]];
        const jMax = big ? Math.min(L.length, i + 60) : L.length;
        for (let j = i + 1; j < jMax; j++) {
          const bj = buckets[L[j]];
          if (bi.compact === bj.compact) continue; // đã xử lý ở bước trên
          const maxLen = Math.max(bi.compact.length, bj.compact.length);
          const maxDist = Math.min(2, Math.floor(maxLen * (1 - thr) + 1e-9));
          if (maxDist < 1 || Math.abs(bi.compact.length - bj.compact.length) > maxDist) continue;
          if (Math.abs(bi.distinctKey.split(" ").length - bj.distinctKey.split(" ").length) > 1) continue;
          if (uf.find(L[i]) === uf.find(L[j])) continue;
          fuzzyPairs++;
          const d = levenshtein(bi.compact, bj.compact, maxDist);
          if (d <= maxDist && share(bi, bj)) {
            const sim = 1 - d / maxLen;
            link(L[i], L[j], `Gần đúng ký tự (${d} ký tự khác, ${Math.round(sim * 100)}%)`, d === 1 && maxLen >= 14 ? CONF.MEDIUM : CONF.LOW);
          }
        }
      }
      if ((bDone & 1023) === 0) progress(0.5 + 0.3 * (bDone / blocks.size), `${label}: so khớp gần đúng`);
    });
  }

  /* 7) Dựng nhóm DN */
  const groups = new Map();
  buckets.forEach((b, bi) => { const r = uf.find(bi); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(bi); });
  const edgesByRoot = new Map();
  edges.forEach((e) => { const r = uf.find(e.a); if (!edgesByRoot.has(r)) edgesByRoot.set(r, []); edgesByRoot.get(r).push(e); });

  const entities = [];
  const bucketEntity = new Int32Array(buckets.length);
  groups.forEach((bList, root) => {
    const variants = new Map();
    const countries = new Map();
    const methods = new Set(), flags = new Set();
    let rows = 0, value = 0, isOverride = false, ovName = "";
    const coreKeys = new Set(), distinctKeys = new Set(), norms = new Set(), ordered = new Set(), vn = new Set();
    for (const bi of bList) {
      const b = buckets[bi];
      rows += b.rows; value += b.value;
      if (b.isOverride) { isOverride = true; ovName = b.ovName; }
      coreKeys.add(b.coreKey); if (b.distinctKey) distinctKeys.add(b.distinctKey);
      b.norms.forEach((x) => norms.add(x)); b.orderedKeys.forEach((x) => ordered.add(x)); b.vn.forEach((x) => vn.add(x));
      b.flags.forEach((f) => flags.add(f));
      for (const pi of b.pairs) {
        const p = pairs[pi];
        p.raws.forEach((rv, raw) => { const e = variants.get(raw) || { raw, count: 0, value: 0 }; e.count += rv.count; e.value += rv.value; variants.set(raw, e); });
        p.countries.forEach((v, c) => countries.set(c, (countries.get(c) || 0) + v));
      }
    }
    // độ tin cậy & cách gộp
    let conf;
    if (isOverride) { conf = CONF.EXACT; methods.add("Từ điển người dùng"); }
    else if (norms.size === 1) { conf = CONF.EXACT; methods.add("Trùng khớp sau chuẩn hóa"); }
    else {
      conf = CONF.HIGH;
      if (ordered.size === 1) methods.add("Khác hình thức pháp lý / ký tự");
      else if (vn.has(true) && vn.has(false)) methods.add("Bí danh Việt–Anh");
      else methods.add("Khác thứ tự từ / từ đồng nghĩa");
    }
    for (const e of edgesByRoot.get(root) || []) {
      methods.add(e.method);
      if (CONF_RANK[e.conf] < CONF_RANK[conf]) conf = e.conf;
    }
    if (CONF_RANK[conf] <= CONF_RANK[CONF.MEDIUM]) flags.add("Gộp gần đúng – nên kiểm tra");
    let review;
    if (isOverride) review = REVIEW.CONFIRMED;
    else if (CONF_RANK[conf] <= CONF_RANK[CONF.MEDIUM] || [...flags].some((f) => REVIEW_FLAGS.has(f))) review = REVIEW.REVIEW;
    else review = REVIEW.AUTO;

    const vList = [...variants.values()].sort((a, b) => b.value - a.value || b.count - a.count || b.raw.length - a.raw.length);
    let name;
    if (isOverride) name = ovName;
    else name = cleanDisplayName(pickDisplayVariant(vList), settings.nameCase);
    // quốc gia đại diện
    let best = "", bestV = -1;
    countries.forEach((v, c) => { if (v > bestV) { bestV = v; best = c; } });
    const cInfo = best && !best.startsWith("RAW:") ? resolveCountry(best) : null;
    const ent = {
      idx: entities.length, id: "", name, isOverride,
      countryCode: cInfo?.code || "", countryName: cInfo?.name || (best.startsWith("RAW:") ? best.slice(4) : ""),
      continent: cInfo?.continentLabel || "Không xác định", isSEA: !!cInfo?.isSEA,
      countriesAll: [...countries.keys()].map((c) => (c.startsWith("RAW:") ? c.slice(4) : resolveCountry(c).name)),
      variants: vList, nVariants: vList.length, rows, value,
      methods: [...methods], confidence: conf, review, flags: [...flags],
      coreKeys: [...coreKeys], distinctKeys: [...distinctKeys],
    };
    entities.push(ent);
    bList.forEach((bi) => (bucketEntity[bi] = ent.idx));
  });
  // mã nhóm theo giá trị giảm dần
  const order = entities.map((e) => e.idx).sort((a, b) => entities[b].value - entities[a].value || entities[a].name.localeCompare(entities[b].name));
  const pad = Math.max(4, String(entities.length).length);
  order.forEach((ei, k) => (entities[ei].id = prefix + String(k + 1).padStart(pad, "0")));

  /* Placeholder */
  const phStats = { rows: 0, value: 0, raws: new Map() };
  pairs.forEach((p, pi) => {
    if (!pairPh[pi]) return;
    phStats.rows += p.rows; phStats.value += p.value;
    p.raws.forEach((rv, raw) => {
      const k = raw || "(trống)";
      const e = phStats.raws.get(k) || { raw: k, count: 0, value: 0, reason: pairPh[pi] };
      e.count += rv.count; e.value += rv.value; phStats.raws.set(k, e);
    });
  });

  /* Ghi cột cho từng dòng */
  const totalValue = entities.reduce((a, e) => a + e.value, 0) + phStats.value;
  engine.years.forEach((y, yi) => {
    const n = y.n;
    const std = new Array(n), id = new Array(n), meth = new Array(n), conf = new Array(n), rev = new Array(n), risk = new Array(n);
    const entIdx = new Int32Array(n);
    const rp = rowPair[yi];
    for (let i = 0; i < n; i++) {
      const pi = rp[i];
      const bi = pairBucket[pi];
      if (bi < 0) {
        entIdx[i] = -1; std[i] = LABELS.UNIDENTIFIED; id[i] = ""; meth[i] = "Placeholder: " + pairPh[pi];
        conf[i] = CONF.NA; rev[i] = REVIEW.EXCLUDED; risk[i] = "";
      } else {
        const e = entities[bucketEntity[bi]];
        entIdx[i] = e.idx; std[i] = e.name; id[i] = e.id; meth[i] = e.methods.join("; ");
        conf[i] = e.confidence; rev[i] = e.review; risk[i] = e.flags.join("; ");
      }
    }
    y.cols[`${type}_Standardize`] = std; y.cols[`${type}_Entity_ID`] = id; y.cols[`${type}_Match_Method`] = meth;
    y.cols[`${type}_Confidence`] = conf; y.cols[`${type}_Review_Status`] = rev; y.cols[`${type}_Risk_Flag`] = risk;
    y.cols[`__entity_${type}`] = entIdx;
    progress(0.85 + 0.15 * (yi + 1) / engine.years.length, `${label}: ghi kết quả`);
  });

  const byConf = {}, byReview = {}, byFlag = {};
  entities.forEach((e) => {
    byConf[e.confidence] = (byConf[e.confidence] || 0) + 1;
    byReview[e.review] = (byReview[e.review] || 0) + 1;
    e.flags.forEach((f) => (byFlag[f] = (byFlag[f] || 0) + 1));
  });
  const rawUnique = pairs.filter((_, pi) => !pairPh[pi]).reduce((a, p) => a + p.raws.size, 0);
  return {
    dict: { type, entities, byCountry, placeholder: { rows: phStats.rows, value: phStats.value, list: [...phStats.raws.values()].sort((a, b) => b.value - a.value || b.count - a.count) } },
    summary: {
      entities: entities.length, rawVariants: rawUnique, merged: entities.filter((e) => e.nVariants > 1).length,
      reductionPct: rawUnique ? 1 - entities.length / rawUnique : 0,
      review: byReview[REVIEW.REVIEW] || 0, auto: byReview[REVIEW.AUTO] || 0, confirmed: byReview[REVIEW.CONFIRMED] || 0,
      byConf, byFlag, genericBlocked, fuzzyPairsCompared: fuzzyPairs,
      placeholderRows: phStats.rows, placeholderValue: phStats.value, placeholderValueShare: totalValue ? phStats.value / totalValue : 0,
      placeholderTop: [...phStats.raws.values()].sort((a, b) => b.value - a.value || b.count - a.count).slice(0, 12),
      countryUnmappedRows: countryRows.unmapped, countryBlankRows: countryRows.blank, byCountry,
    },
  };
}

/* ═════════ TỪ ĐIỂN NGƯỜI DÙNG (OVERRIDE) ═════════ */
const OV_RAW = ["ten goc", "ten goc bien the", "bien the", "raw name", "raw_name", "raw", "variant", "original name", "ten trong du lieu", "ten tho", "ten goc (bien the)"];
const OV_FIX = ["ten chuan hoa sua", "ten chuan hoa (sua)", "ten chuan hoa sua neu can", "corrected name", "corrected standardized name", "ten dung", "ten sua"];
const OV_STD = ["ten chuan hoa", "standardized name", "standardized_name", "standard name", "std name", "ten chuan"];
const OV_COUNTRY = ["quoc gia", "country", "nuoc", "quoc gia chuan hoa", "country std"];
const OV_TYPE = ["loai", "type", "entity type", "doi tuong", "loai dn"];

function findCol(headers, aliases) {
  const nh = headers.map((h) => normHeader(h));
  for (const a of aliases) { const i = nh.indexOf(normHeader(a)); if (i >= 0) return i; }
  return -1;
}

export function parseOverrides(buffer, fileName, existing) {
  const tables = readReferenceTables(buffer, fileName);
  let added = 0, skipped = 0;
  const warnings = [];
  for (const t of tables) {
    const iRaw = findCol(t.headers, OV_RAW);
    const iFix = findCol(t.headers, OV_FIX);
    const iStd = iFix >= 0 ? iFix : findCol(t.headers, OV_STD);
    if (iRaw < 0 || iStd < 0) { warnings.push(`Sheet "${t.sheet}": không thấy cột "Tên gốc" và "Tên chuẩn hóa" — bỏ qua.`); continue; }
    const iC = findCol(t.headers, OV_COUNTRY), iT = findCol(t.headers, OV_TYPE);
    const rows = t.rows.map((r) => ({ raw: r[iRaw], name: r[iStd], country: iC >= 0 ? r[iC] : null, type: iT >= 0 ? r[iT] : null }));
    const res = addOverrideRows(existing, rows);
    added += res.added; skipped += res.skipped;
  }
  if (!added && !warnings.length) warnings.push("Không có dòng nào có tên chuẩn hóa (sửa) — kiểm tra lại file.");
  existing.files = [...(existing.files || []).filter((f) => f.name !== fileName), { name: fileName, rows: added }];
  return { added, skipped, warnings, total: existing.entries.length };
}

/** Thêm các dòng {raw, name, country, type} vào từ điển DN (dùng cho file Excel và hồ sơ sản phẩm). */
export function addOverrideRows(existing, rows) {
  const entries = new Map((existing.entries || []).map((e) => [`${e.norm}|${e.countryCode}|${e.type}`, e]));
  let added = 0, skipped = 0;
  for (const r of rows) {
    const raw = r.raw, std = r.name;
    if (raw === null || raw === undefined || std === null || std === undefined || String(std).trim() === "") { skipped++; continue; }
    const norm = normText(raw);
    if (!norm) { skipped++; continue; }
    const cRaw = r.country;
    let countryCode = "";
    if (cRaw !== null && cRaw !== undefined && String(cRaw).trim() !== "") {
      const cs = String(cRaw).trim();
      countryCode = cs.startsWith("RAW:") ? cs : (resolveCountry(cs).code || "RAW:" + normText(cs));
    }
    const tv = r.type ? normText(r.type) : "";
    const type = /MUA|PURCHASER|BUYER|IMPORTER/.test(tv) ? "Purchaser" : /BAN|SUPPLIER|SELLER|EXPORTER/.test(tv) ? "Supplier" : "";
    const name = String(std).trim();
    const isExclude = /^#?(LOAI|LOẠI|EXCLUDE|PLACEHOLDER)$/i.test(name);
    entries.set(`${norm}|${countryCode}|${type}`, { norm, countryCode, type, name, isExclude });
    added++;
  }
  existing.entries = [...entries.values()];
  return { added, skipped };
}

function buildOverrideIndex(entries) {
  const m = new Map();
  for (const e of entries || []) m.set(`${e.norm}|${e.countryCode}|${e.type}`, e);
  return m;
}

function lookupOverride(idx, norm, cKey, type) {
  if (!idx.size) return null;
  const c = cKey && !cKey.startsWith("RAW:") ? cKey : cKey;
  return idx.get(`${norm}|${c}|${type}`) || idx.get(`${norm}||${type}`) || idx.get(`${norm}|${c}|`) || idx.get(`${norm}||`) || null;
}

/* ═════════ GIAO DỊCH TRÙNG GIỮA CÁC NGUỒN DỮ LIỆU ═════════
   Cùng năm · cùng Lượng (2 số lẻ) · cùng Trị giá (làm tròn 1 USD) · cùng DN mua HOẶC DN bán (theo mã nhóm)
   · ngày lệch ≤ 10 ngày (nếu có ngày) · khác Nguồn dữ liệu  ⇒  đánh dấu bản ghi ưu tiên thấp hơn.
   Ưu tiên giữ: (3) bản ghi nhập khẩu của chính nước mua > (2) bản ghi xuất khẩu của nước xuất xứ > (1) nguồn khác. */
function detectCrossSource(engine, progress) {
  const out = { enabled: !!engine.settings.detectCrossSource, mapped: true, years: {}, rows: 0, value: 0, bySource: {} };
  if (!out.enabled) return out;
  if (engine.years.some((y) => y.map.dataSource < 0)) { out.mapped = false; return out; }
  const DAY = 86400000;
  engine.years.forEach((y, yi) => {
    const Q = y.cols.Quantity_Clean, TV = y.cols.TotalValue_Clean;
    const pE = y.cols.__entity_Purchaser, sE = y.cols.__entity_Supplier;
    const pC = y.cols.Purchaser_Country_Std, sC = y.cols.Supplier_Country_Std, D = y.cols.Date_Clean;
    const flag = new Array(y.n).fill("");
    const src = new Array(y.n), score = new Int8Array(y.n);
    for (let i = 0; i < y.n; i++) {
      const sv = val(y, "dataSource", i);
      const sn = normText(sv);
      src[i] = sv === null || sv === undefined ? "" : String(sv).trim();
      const isExp = / EXP( |$)/.test(" " + sn + " ") || / EXPORT( |$)/.test(" " + sn);
      const pc = normText(pC[i]), oc = normText(sC[i]);
      score[i] = pc && (" " + sn + " ").includes(" " + pc + " ") && !isExp ? 3 : oc && isExp && (" " + sn + " ").includes(" " + oc + " ") ? 2 : 1;
    }
    const groups = new Map();
    for (let i = 0; i < y.n; i++) {
      if (!(Q[i] > 0 && TV[i] > 0) || !src[i]) continue;
      const k = Q[i].toFixed(2) + "|" + Math.round(TV[i]);
      let g = groups.get(k); if (!g) { g = []; groups.set(k, g); } g.push(i);
    }
    let rows = 0, value = 0;
    groups.forEach((g) => {
      if (g.length < 2) return;
      if (new Set(g.map((i) => src[i])).size < 2) return;
      g.sort((a, b) => score[b] - score[a] || a - b);
      const usedBy = new Map();
      for (let x = 0; x < g.length; x++) {
        const a = g[x];
        if (flag[a]) continue;
        for (let z = x + 1; z < g.length; z++) {
          const b = g[z];
          if (flag[b] || src[a] === src[b]) continue;
          const u = usedBy.get(a) || new Set();
          if (u.has(src[b])) continue;
          const sameEnt = (pE[a] >= 0 && pE[a] === pE[b]) || (sE[a] >= 0 && sE[a] === sE[b]);
          if (!sameEnt) continue;
          if (D && D[a] && D[b] && Math.abs(D[a] - D[b]) > 10 * DAY) continue;
          flag[b] = `Trùng với nguồn "${src[a]}" (dòng ${y.rowNum[a]})`;
          u.add(src[b]); usedBy.set(a, u);
          rows++; value += TV[b];
          const key = `${src[b]} ↔ ${src[a]}`;
          out.bySource[key] = out.bySource[key] || { pair: key, rows: 0, value: 0 };
          out.bySource[key].rows++; out.bySource[key].value += TV[b];
        }
      }
    });
    y.cols.Cross_Source_Dup = flag;
    out.years[y.year] = { rows, value };
    out.rows += rows; out.value += value;
    progress((yi + 1) / engine.years.length, `Nghi trùng nguồn – năm ${y.year}`);
  });
  out.bySource = Object.values(out.bySource).sort((a, b) => b.value - a.value);
  return out;
}

/** Chọn biến thể làm tên hiển thị: ưu tiên tên tiếng Anh, giá trị lớn; trừ điểm tên bị cắt cụt
 *  ("… TRADING S"), tên bắt đầu bằng từ chung/pháp lý ("TRADING COMPANY LIMITED ABC"), tên quá ngắn. */
export function pickDisplayVariant(vList) {
  const english = vList.filter((v) => !analyzeName(v.raw).isVN);
  const pool = english.length ? english : vList;
  const total = pool.reduce((a, v) => a + v.value + v.count * 1e-6, 0) || 1;
  let best = pool[0], bestScore = -Infinity;
  for (const v of pool) {
    const a = analyzeName(v.raw);
    const toks = a.norm.split(" ");
    let score = (v.value + v.count * 1e-6) / total;
    const first = toks[0] || "";
    if (a.distinctKey && !a.distinctKey.split(" ").includes(first) && !/^(PT|CV|M|OOO|ZAO|OAO|AO|PAO|JSC|LLC|THE)$/.test(first)) score *= 0.35;
    const last = toks[toks.length - 1] || "";
    if (last.length === 1 && toks.length > 2) score *= 0.4; // cụt chữ cuối
    if (v.raw.length < 6) score *= 0.5;
    if (/[;|]/.test(v.raw)) score *= 0.5;
    if (score > bestScore) { bestScore = score; best = v; }
  }
  return best.raw;
}
