/* ═══════════════════════════════════════════════════════════════
   BƯỚC 6 — QUY ĐỔI ĐƠN VỊ VỀ TẤN
   BƯỚC 12 — LỌC NGOẠI LAI IQR (theo Năm × Phân khúc)
   BƯỚC 13 — CHỈ SỐ PHÂN KHÚC (trước / sau lọc)
   ═══════════════════════════════════════════════════════════════ */
import { lookupUnit, UNIT_KIND, describeFactor } from "../dict/units.js";
import { stripDiacritics } from "../text.js";
import { quantileInc } from "../numbers.js";
import { LABELS } from "../constants.js";

const val = (y, f, i) => (y.map[f] >= 0 ? y.rows[i][y.map[f]] : null);
export const OUT_OF_SCOPE = "Ngoài phạm vi sản phẩm";
export const UNCLASSIFIED = "Chưa phân loại";

export const US = {
  CONVERTED: "Đã quy đổi",
  INFERRED: "Suy luận từ mô tả",
  AMBIGUOUS: "Mơ hồ – chưa quy đổi",
  NON_MASS: "Không phải khối lượng",
  UNKNOWN: "Chưa có hệ số",
  BLANK: "Thiếu đơn vị",
  NO_QTY: "Thiếu lượng",
  EXCLUDED: "Người dùng loại",
};

/* ─────────── Suy luận khối lượng bao bì từ mô tả ─────────── */
const W_UNIT = "(KGS?|KILOS?|KILOGRAMS?|KILOGRAMOS?|G|GR|GRS|GM|GMS|GRAMS?|GRAMOS?|LBS?)";
const PKG = "(BAGS?|SACKS?|SACOS?|SACAS?|BOLSAS?|DRUMS?|BARRELS?|PAILS?|BUCKETS?|BOTTLES?|BTLS?|JARS?|CANS?|CARTONS?|BOX|BOXES|PACKS?|PACKETS?|PKGS?|BOTES?|FRASCOS?|ENVASES?|TAMBOR|TAMBORES|CUNETES?|BULTOS?|FIBC|JUMBO|BIGBAGS?|TOTES?|EACH|EA|BAO|CHAI|GOI|HOP|PCS?|UNITS?|CONTAINERS?)";
const RE_P1 = new RegExp(`(?:^| )(\\d+(?:\\.\\d+)?) ?${W_UNIT}(?: NET| NW| N W)?(?: [A-Z]+){0,3}? (?:PER )?${PKG}(?= |$)`);
const RE_P2 = new RegExp(`(?:^| )${PKG}(?: [A-Z]+){0,2}? (?:OF|DE|X|EACH|CADA|CON|WITH|NET|NW|N W|LOAI|@) ?(\\d+(?:\\.\\d+)?) ?${W_UNIT}(?= |$)`);
const RE_P3 = new RegExp(`(?:^| )X ?(\\d+(?:\\.\\d+)?) ?${W_UNIT}(?= |$)`);
const RE_ANY = new RegExp(`(?:^| )(\\d+(?:\\.\\d+)?) ?${W_UNIT}(?= |$)`, "g");
const SMALL_PACK_UNITS = new Set(["BTL", "BOTTLE", "BOTTLES", "PCS", "PCE", "PC", "UNT", "UNIT", "UNITS", "UNA", "NIU", "EA", "EACH", "EAC", "FRC", "FRASCO", "JAR", "JARS", "CAN", "CANS", "BOX", "BX", "PAC", "PACK", "PACKS", "PIECE OR UNIT", "PIECE", "PIECES", "CHAI", "HOP", "SET", "KIT"]);

function normForWeight(s) {
  return stripDiacritics(s).toUpperCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^A-Z0-9.]+/g, " ")
    .replace(/(^|[^\d])\.|\.(?!\d)/g, "$1 ")
    .replace(/(\d)([A-Z])/g, "$1 $2").replace(/([A-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ").trim();
}
function toKg(n, u) {
  const x = parseFloat(n);
  if (!(x > 0)) return null;
  if (/^K/.test(u)) return x;
  if (/^LB/.test(u)) return x * 0.45359237;
  return x / 1000; // gram
}

/** Trả về { kg, rule } nếu mô tả cho biết khối lượng mỗi đơn vị đóng gói. */
export function inferPackageKg(desc, unitStd) {
  if (!desc) return null;
  const W = normForWeight(desc);
  let m = W.match(RE_P1);
  if (m) { const kg = toKg(m[1], m[2]); if (kg && kg <= 1500) return { kg, rule: `${m[1]} ${m[2]}/${m[m.length - 1]}` }; }
  m = W.match(RE_P2);
  if (m) { const kg = toKg(m[2], m[3]); if (kg && kg <= 1500) return { kg, rule: `${m[1]} ${m[2]} ${m[3]}` }; }
  m = W.match(RE_P3);
  if (m) { const kg = toKg(m[1], m[2]); if (kg && kg <= 1500) return { kg, rule: `x ${m[1]} ${m[2]}` }; }
  if (SMALL_PACK_UNITS.has(unitStd) && !/ (TOTAL|NET WEIGHT|GROSS|G W|N W|NW|GW|TONG) /.test(" " + W + " ")) {
    const all = [...W.matchAll(RE_ANY)].map((x) => toKg(x[1], x[2])).filter(Boolean);
    const uniq = [...new Set(all.map((k) => Math.round(k * 1e6)))];
    if (uniq.length === 1 && all[0] <= 50) return { kg: all[0], rule: `gói ${all[0] >= 1 ? all[0] + " kg" : Math.round(all[0] * 1000) + " g"}` };
  }
  return null;
}

/* ═════════ BƯỚC 6 — QUY ĐỔI ĐƠN VỊ ═════════ */
export function runUnits(engine, progress) {
  const s = engine.settings;
  const user = s.unitFactors || {};
  // 1) thống kê đơn vị + giá tham chiếu (trung vị giá/tấn có trọng số trị giá, chỉ từ các đơn vị khối lượng chuẩn)
  const stats = new Map();
  const refSamples = [];
  engine.years.forEach((y) => {
    const Q = y.cols.Quantity_Clean, TV = y.cols.TotalValue_Clean;
    for (let i = 0; i < y.n; i++) {
      const raw = val(y, "unit", i);
      const u = lookupUnit(raw);
      const key = u.unit || "";
      let st = stats.get(key);
      if (!st) { st = { unit: key, label: u.label, kind: u.kind, dictFactor: u.factor, rows: 0, rowsPriced: 0, value: 0, examples: new Set(), unitValues: [] }; stats.set(key, st); }
      st.rows++;
      if (st.examples.size < 3 && raw !== null && raw !== undefined) st.examples.add(String(raw));
      if (Q[i] > 0 && TV[i] > 0) {
        st.rowsPriced++; st.value += TV[i];
        // trọng số = TRỊ GIÁ (không dùng khối lượng: một dòng sai đơn vị có khối lượng ảo khổng lồ sẽ kéo lệch trung vị)
        if (st.unitValues.length < 20000) st.unitValues.push([TV[i] / Q[i], TV[i]]);
        if (u.factor) refSamples.push([TV[i] / (Q[i] * u.factor), TV[i]]);
      }
    }
  });
  const refPrice = weightedMedian(refSamples);

  // 2) gợi ý hệ số cho đơn vị chưa có trong từ điển / mơ hồ dựa trên giá ngụ ý
  const CANDS = [1, 0.001, 0.000001, 0.90718474, 1.0160469088, 0.1, 0.05, 0.025, 0.00045359237];
  const table = [...stats.values()].map((st) => {
    let suggestion = null;
    // Chỉ gợi ý cho đơn vị CHƯA CÓ trong từ điển hoặc MƠ HỒ (bao/chai/kiện thì dùng suy luận theo mô tả)
    if (!st.dictFactor && (st.kind === UNIT_KIND.UNKNOWN || st.kind === UNIT_KIND.AMBIGUOUS) && st.unitValues.length >= 3 && refPrice) {
      const med = weightedMedian(st.unitValues);
      let best = null;
      for (const f of CANDS) {
        const implied = med / f;
        const d = Math.abs(Math.log(implied / refPrice));
        if (!best || d < best.d) best = { f, d, implied };
      }
      if (best && best.d < Math.log(4)) suggestion = { factor: best.f, impliedPrice: best.implied, label: describeFactor(best.f) };
    }
    const hasUser = Object.prototype.hasOwnProperty.call(user, st.unit);
    const applied = hasUser ? (user[st.unit] === null || user[st.unit] === "" ? null : Number(user[st.unit])) : st.dictFactor;
    return {
      unit: st.unit || "(trống)", unitKey: st.unit, label: st.label, kind: st.kind, rows: st.rows, rowsPriced: st.rowsPriced, value: st.value,
      examples: [...st.examples].join(", "), dictFactor: st.dictFactor, appliedFactor: applied ?? null,
      source: hasUser ? "Người dùng" : st.dictFactor ? "Từ điển" : "—", suggestion, inferred: 0,
    };
  }).sort((a, b) => b.value - a.value || b.rows - a.rows);
  const byUnit = new Map(table.map((t) => [t.unitKey, t]));

  // 3) quy đổi từng dòng
  // Khoảng giá hợp lý: người nghiên cứu đặt theo đặc thù sản phẩm (hồ sơ sản phẩm) — nếu để 0 thì tự tính từ giá tham chiếu.
  const bMin = Number(s.priceBandMin) > 0 ? Number(s.priceBandMin) : 0;
  const bMax = Number(s.priceBandMax) > 0 ? Number(s.priceBandMax) : 0;
  const band = {
    low: bMin || (refPrice ? refPrice / 50 : 0),
    high: bMax || (refPrice ? refPrice * 2000 : Infinity),
    mode: bMin || bMax ? (bMin && bMax ? "Thủ công" : "Kết hợp thủ công + tự động") : "Tự động theo giá tham chiếu",
  };
  const sanityOn = s.priceSanityCheck && (refPrice || bMin || bMax);
  const out = { years: {}, refPrice, units: table, sanity: sanityOn ? band : null };
  // Kiểm tra giá ngụ ý khi suy luận bao bì: dùng khoảng thủ công nếu có, không thì ref ÷ 20 … ref × 500
  const lo = bMin || (refPrice ? refPrice / 20 : 0), hi = bMax || (refPrice ? refPrice * 500 : Infinity);
  engine.years.forEach((y, yi) => {
    const Q = y.cols.Quantity_Clean, TV = y.cols.TotalValue_Clean, UP = y.cols.UnitPrice_Clean;
    const UStd = new Array(y.n), USt = new Array(y.n), F = new Float64Array(y.n).fill(NaN), QMT = new Float64Array(y.n).fill(NaN), PMT = new Float64Array(y.n).fill(NaN);
    const c = { converted: 0, inferred: 0, ambiguous: 0, nonMass: 0, unknown: 0, blank: 0, noQty: 0, excluded: 0, priced: 0, qtyMT: 0 };
    for (let i = 0; i < y.n; i++) {
      const u = lookupUnit(val(y, "unit", i));
      const t = byUnit.get(u.unit || "");
      UStd[i] = u.unit;
      let f = t ? t.appliedFactor : null;
      let status;
      if (!u.unit) status = US.BLANK;
      else if (f > 0) status = US.CONVERTED;
      else if (t && t.source === "Người dùng") status = US.EXCLUDED;
      else if (u.kind === UNIT_KIND.AMBIGUOUS) status = US.AMBIGUOUS;
      else if (u.kind === UNIT_KIND.NON_MASS) status = US.NON_MASS;
      else status = US.UNKNOWN;
      // Chỉ suy luận cho dòng CÓ trị giá (để kiểm tra được giá ngụ ý). Dòng vận đơn không trị giá thường
      // tách theo container — mô tả ghi khối lượng cả lô ⇒ suy luận dễ sai, nên bỏ qua.
      if (!(f > 0) && s.inferPackageWeight && TV[i] > 0 && Q[i] > 0 && (status === US.NON_MASS || status === US.UNKNOWN)) {
        const inf = inferPackageKg(val(y, "productDesc", i), u.unit);
        if (inf) {
          const fi = inf.kg / 1000;
          const implied = TV[i] / (Q[i] * fi);
          if (implied >= lo && implied <= hi) { f = fi; status = `${US.INFERRED} (${inf.rule})`; if (t) t.inferred++; c.inferred++; }
        }
      }
      if (f > 0) {
        F[i] = f;
        if (Q[i] > 0) {
          QMT[i] = Q[i] * f;
          if (TV[i] > 0) PMT[i] = TV[i] / QMT[i];
          else if (UP[i] > 0) PMT[i] = UP[i] / f;
          if (!status.startsWith(US.INFERRED)) c.converted++;
          c.qtyMT += QMT[i];
          if (PMT[i] > 0) c.priced++;
        } else { status = US.NO_QTY; c.noQty++; }
      } else {
        if (status === US.AMBIGUOUS) c.ambiguous++; else if (status === US.NON_MASS) c.nonMass++;
        else if (status === US.BLANK) c.blank++; else if (status === US.EXCLUDED) c.excluded++; else c.unknown++;
      }
      USt[i] = status;
      if ((i & 16383) === 0) progress((yi + i / y.n) / engine.years.length, `Năm ${y.year}`);
    }
    // Kiểm tra giá/tấn phi lý (dấu hiệu sai đơn vị, vd: ghi TNE nhưng thực chất là KG ⇒ giá thấp hơn 1.000 lần)
    const PS = new Array(y.n).fill("");
    let insane = 0;
    if (sanityOn) {
      const lo2 = band.low, hi2 = band.high;
      for (let i = 0; i < y.n; i++) {
        const pm = PMT[i];
        if (!(pm > 0)) continue;
        if (pm < lo2) { PS[i] = `Thấp phi lý (< ${Math.round(lo2 * 100) / 100} USD/t) – nghi sai đơn vị`; insane++; }
        else if (pm > hi2) { PS[i] = `Cao phi lý (> ${Math.round(hi2)} USD/t) – nghi sai đơn vị`; insane++; }
      }
    }
    c.insane = insane;
    y.cols.Unit_Std = UStd; y.cols.Unit_Status = USt; y.cols.Conversion_Factor = F; y.cols.Quantity_MT = QMT; y.cols.UnitPrice_per_MT = PMT; y.cols.Price_Sanity = PS;
    out.years[y.year] = { rows: y.n, ...c };
  });
  return out;
}

function weightedMedian(pairs) {
  if (!pairs.length) return null;
  const a = pairs.filter((p) => p[0] > 0 && Number.isFinite(p[0])).sort((x, y) => x[0] - y[0]);
  const tot = a.reduce((s, p) => s + p[1], 0);
  let acc = 0;
  for (const p of a) { acc += p[1]; if (acc >= tot / 2) return p[0]; }
  return a.length ? a[a.length - 1][0] : null;
}

/* ═════════ BƯỚC 12 — IQR ═════════
   Nhóm: Năm × Phân khúc cuối cùng. Giá trị: Đơn giá (USD/tấn) > 0.
   Q1, Q3 tính như Excel QUARTILE.INC; ngưỡng = [Q1 − k·IQR ; Q3 + k·IQR] (k mặc định 1.5).
   Tùy chọn tính trên log(giá) — phù hợp phân phối giá lệch phải. */
export const IQ = { IN: "Trong ngưỡng", OUT: "Ngoại lai IQR", FEW: "Không đủ dữ liệu", NOPRICE: "Không có giá", INSANE: "Giá phi lý (loại trước IQR)" };

export function runIQR(engine, progress) {
  const s = engine.settings;
  const k = Number(s.iqrMultiplier) || 1.5, minN = Math.max(3, Number(s.iqrMinN) || 4), useLog = !!s.iqrLog;
  const out = { years: {}, k, minN, useLog };
  engine.years.forEach((y, yi) => {
    const P = y.cols.UnitPrice_per_MT, SEG = y.cols.Final_Segment;
    const dup = y.cols.Duplicate_Flag, xdup = y.cols.Cross_Source_Dup, PS = y.cols.Price_Sanity;
    const chk = new Array(y.n).fill(IQ.NOPRICE), lowA = new Float64Array(y.n).fill(NaN), upA = new Float64Array(y.n).fill(NaN);
    const groups = new Map();
    for (let i = 0; i < y.n; i++) {
      if (!(P[i] > 0)) continue;
      if (PS && PS[i]) { chk[i] = IQ.INSANE; continue; }
      const excludedFromSample = (s.excludeDuplicates && dup?.[i]) || (s.excludeCrossSourceDup && xdup?.[i]);
      const g = SEG[i] || UNCLASSIFIED;
      if (!groups.has(g)) groups.set(g, { all: [], sample: [] });
      groups.get(g).all.push(i);
      if (!excludedFromSample) groups.get(g).sample.push(useLog ? Math.log(P[i]) : P[i]);
    }
    const res = {};
    groups.forEach((g, seg) => {
      const n = g.sample.length;
      if (n < minN) {
        g.all.forEach((i) => (chk[i] = IQ.FEW));
        res[seg] = { n, q1: null, median: null, q3: null, iqr: null, lower: null, upper: null, outliers: 0, outLow: 0, outHigh: 0, note: `Chỉ có ${n} giá (< ${minN})` };
        return;
      }
      const sorted = g.sample.slice().sort((a, b) => a - b);
      let q1 = quantileInc(sorted, 0.25), q3 = quantileInc(sorted, 0.75), med = quantileInc(sorted, 0.5);
      const iqr = q3 - q1;
      let lower = q1 - k * iqr, upper = q3 + k * iqr;
      if (useLog) { lower = Math.exp(lower); upper = Math.exp(upper); q1 = Math.exp(q1); q3 = Math.exp(q3); med = Math.exp(med); }
      let outL = 0, outH = 0;
      for (const i of g.all) {
        lowA[i] = lower; upA[i] = upper;
        if (P[i] < lower) { chk[i] = IQ.OUT; outL++; }
        else if (P[i] > upper) { chk[i] = IQ.OUT; outH++; }
        else chk[i] = IQ.IN;
      }
      const wide = lower > 0 && upper / lower > 100;
      res[seg] = { n, q1, median: med, q3, iqr: useLog ? q3 - q1 : iqr, lower, upper, outliers: outL + outH, outLow: outL, outHigh: outH, note: wide ? "Biên độ rất rộng (trên/dưới > 100 lần) — nên tách phân khúc" : lower < 0 ? "Ngưỡng dưới âm ⇒ chỉ lọc phía trên" : "" };
    });
    y.cols.IQR_Check = chk; y.cols.IQR_Lower = lowA; y.cols.IQR_Upper = upA;
    out.years[y.year] = res;
    progress((yi + 1) / engine.years.length, `Năm ${y.year}`);
  });
  return out;
}

/* ═════════ BƯỚC 13 — CHỈ SỐ PHÂN KHÚC ═════════
   Quy tắc loại (chọn được):
     AND — chỉ loại khi VỪA lệch giá trị (bước 5) VỪA ngoại lai IQR (mặc định, giống V17)
     IQR — loại mọi dòng ngoại lai IQR
     OR  — loại khi lệch giá trị HOẶC ngoại lai IQR
   Luôn loại: dòng ngoài phạm vi sản phẩm; dòng nghi trùng nguồn khác (nếu bật); dòng trùng lặp (nếu bật).
   Giá bình quân = Σ Trị giá / Σ Lượng (tấn) — bình quân gia quyền theo khối lượng. */
export function runMetrics(engine, progress) {
  const s = engine.settings;
  const rule = s.outlierRule || "AND";
  const out = { rule, years: {}, pivot: {}, segments: [] };
  const segSet = new Set();
  engine.years.forEach((y, yi) => {
    const TV = y.cols.TotalValue_Clean, QMT = y.cols.Quantity_MT, P = y.cols.UnitPrice_per_MT;
    const SEG = y.cols.Final_Segment, VC = y.cols.Value_Check, IQR = y.cols.IQR_Check;
    const dup = y.cols.Duplicate_Flag, xdup = y.cols.Cross_Source_Dup, PS = y.cols.Price_Sanity;
    const inc = new Array(y.n), reason = new Array(y.n);
    const segs = new Map();
    const get = (g) => { if (!segs.has(g)) segs.set(g, { before: [], after: [], excluded: 0 }); return segs.get(g); };
    const reasons = {};
    for (let i = 0; i < y.n; i++) {
      const seg = SEG[i] || UNCLASSIFIED;
      const vBad = VC[i] === "Lệch vượt ngưỡng", iBad = IQR[i] === IQ.OUT;
      let r = "";
      if (seg === OUT_OF_SCOPE) r = "Ngoài phạm vi sản phẩm";
      else if (PS && PS[i]) r = "Giá/tấn phi lý – nghi sai đơn vị";
      else if (s.excludeCrossSourceDup && xdup?.[i]) r = "Trùng giao dịch ở nguồn khác";
      else if (s.excludeDuplicates && dup?.[i]) r = "Dòng trùng lặp";
      else if (rule === "AND" && vBad && iBad) r = "Lệch giá trị & ngoại lai IQR";
      else if (rule === "IQR" && iBad) r = "Ngoại lai IQR";
      else if (rule === "OR" && (vBad || iBad)) r = vBad && iBad ? "Lệch giá trị & ngoại lai IQR" : vBad ? "Lệch giá trị" : "Ngoại lai IQR";
      inc[i] = r ? LABELS.NO : LABELS.YES; reason[i] = r;
      if (r) reasons[r] = (reasons[r] || 0) + 1;
      if (TV[i] > 0 && QMT[i] > 0) {
        const g = get(seg);
        g.before.push(i);
        if (!r) g.after.push(i); else g.excluded++;
      }
    }
    y.cols.Final_Included = inc; y.cols.Exclusion_Reason = reason;
    // Độ nhạy theo quy tắc loại ngoại lai (giúp chọn quy tắc phù hợp)
    const sens = {};
    for (const rr of ["AND", "IQR", "OR"]) {
      let n = 0, v = 0, q = 0;
      for (let i = 0; i < y.n; i++) {
        if (!(TV[i] > 0 && QMT[i] > 0)) continue;
        const seg = SEG[i] || UNCLASSIFIED;
        if (seg === OUT_OF_SCOPE || (PS && PS[i]) || (s.excludeCrossSourceDup && xdup?.[i]) || (s.excludeDuplicates && dup?.[i])) continue;
        const vBad = VC[i] === "Lệch vượt ngưỡng", iBad = IQR[i] === IQ.OUT;
        const ex = rr === "AND" ? vBad && iBad : rr === "IQR" ? iBad : vBad || iBad;
        if (ex) { n++; continue; }
        v += TV[i]; q += QMT[i];
      }
      sens[rr] = { excluded: n, avgPrice: q ? v / q : null, qty: q };
    }
    const stat = (idx) => {
      if (!idx.length) return { count: 0, value: 0, qty: 0, avgPrice: null, median: null, p25: null, p75: null, min: null, max: null };
      let v = 0, q = 0;
      const ps = idx.map((i) => { v += TV[i]; q += QMT[i]; return P[i]; }).sort((a, b) => a - b);
      return { count: idx.length, value: v, qty: q, avgPrice: q ? v / q : null, median: quantileInc(ps, 0.5), p25: quantileInc(ps, 0.25), p75: quantileInc(ps, 0.75), min: ps[0], max: ps[ps.length - 1] };
    };
    const rows = [];
    let totB = [], totA = [];
    [...segs.entries()].sort((a, b) => b[1].after.length - a[1].after.length).forEach(([seg, g]) => {
      segSet.add(seg);
      rows.push({ segment: seg, before: stat(g.before), after: stat(g.after), excluded: g.excluded });
      if (seg !== OUT_OF_SCOPE) { totB = totB.concat(g.before); totA = totA.concat(g.after); }
    });
    const totalAfterQty = rows.filter((r) => r.segment !== OUT_OF_SCOPE).reduce((a, r) => a + r.after.qty, 0);
    rows.forEach((r) => (r.qtyShare = r.segment !== OUT_OF_SCOPE && totalAfterQty ? r.after.qty / totalAfterQty : null));
    out.years[y.year] = { rows, total: { segment: "TỔNG (trong phạm vi sản phẩm)", before: stat(totB), after: stat(totA), excluded: totB.length - totA.length }, reasons, rowsTotal: y.n, sensitivity: sens };
    progress((yi + 1) / engine.years.length, `Năm ${y.year}`);
  });
  out.segments = [...segSet].filter((x) => x !== OUT_OF_SCOPE).concat(segSet.has(OUT_OF_SCOPE) ? [OUT_OF_SCOPE] : []);
  out.segments.forEach((seg) => {
    out.pivot[seg] = {};
    engine.years.forEach((y) => {
      const r = out.years[y.year].rows.find((x) => x.segment === seg);
      out.pivot[seg][y.year] = r ? { qty: r.after.qty, value: r.after.value, avgPrice: r.after.avgPrice, count: r.after.count } : null;
    });
  });
  return out;
}
