/* ═══════════════════════════════════════════════════════════════
   BƯỚC 9 — GÁN NGÀNH TỪ INDUSTRY MASTER
   - Đọc MỌI sheet của MỌI file (file nghiên cứu xuất từ bước 8 có nhiều sheet theo năm).
   - Nhận cả tiêu đề tiếng Anh (Purchaser_Standardize, Purchasing Country, Industry, Industry Segment)
     lẫn tiếng Việt (Tên DN chuẩn hóa, Quốc gia, Ngành, Phân khúc ngành) ⇒ dùng lại được file cũ của V17.
   - Khớp theo KHÓA LÕI của tên (không phụ thuộc cách viết hoa, hậu tố pháp lý, tiếng Việt/Anh)
     + quốc gia chuẩn hóa. Tên cũ do V17 sinh ra vẫn khớp được.
   - Ngành là thuộc tính của DOANH NGHIỆP ⇒ gán cho mọi dòng của DN đó (tùy chọn: chỉ dòng thuộc Top).
   ═══════════════════════════════════════════════════════════════ */
import { readReferenceTables } from "../io/read.js";
import { analyzeName } from "../names.js";
import { resolveCountry } from "../dict/countries.js";
import { normHeader } from "../text.js";
import { LABELS } from "../constants.js";

const A_NAME = ["purchaser standardize", "purchaser_standardize", "dn mua ten chuan hoa", "ten dn chuan hoa", "ten chuan hoa", "purchaser std", "purchaser", "ten doanh nghiep", "ten cong ty", "company", "company name", "importer", "buyer", "standardized name"];
const A_COUNTRY = ["purchasing country", "nuoc nhap khau chuan hoa", "nuoc nhap khau", "quoc gia", "country", "purchaser country std", "quoc gia mua"];
const A_IND = ["industry", "nganh"];
const A_SEG = ["industry segment", "industry_segment", "phan khuc nganh", "phan khuc", "segment", "industry seg"];

function findCol(headers, aliases) {
  const nh = headers.map((h) => normHeader(h));
  for (const a of aliases) { const i = nh.indexOf(normHeader(a)); if (i >= 0) return i; }
  return -1;
}

export function parseIndustryMaster(buffer, fileName, store) {
  const tables = readReferenceTables(buffer, fileName);
  const warnings = [];
  let added = 0, emptySeg = 0;
  for (const t of tables) {
    const iN = findCol(t.headers, A_NAME), iC = findCol(t.headers, A_COUNTRY), iI = findCol(t.headers, A_IND), iS = findCol(t.headers, A_SEG);
    if (iN < 0 || iS < 0) { warnings.push(`Sheet "${t.sheet}": thiếu cột tên DN hoặc cột Phân khúc ngành — bỏ qua.`); continue; }
    const rows = t.rows.map((r) => ({ name: r[iN], country: iC >= 0 ? r[iC] : null, industry: iI >= 0 ? r[iI] : null, segment: r[iS] }));
    const res = addIndustryRows(store, rows, fileName, t.sheet);
    added += res.added; emptySeg += res.emptySeg;
  }
  store.files = [...store.files.filter((f) => f.name !== fileName), { name: fileName, rows: added, emptySeg }];
  if (!added) warnings.push("Không đọc được dòng nào có đủ Tên DN + Phân khúc ngành.");
  return { added, emptySeg, warnings, total: store.entries.length, conflicts: store.conflicts.length };
}

/** Thêm các dòng {name, country, industry, segment} vào kho Industry Master (dùng cho file Excel và hồ sơ sản phẩm). */
export function addIndustryRows(store, rows, fileName, sheet = "") {
  const map = new Map(store.entries.map((e) => [e.key, e]));
  const conflicts = store.conflicts || [];
  let added = 0, emptySeg = 0;
  for (const r of rows) {
    const name = r.name === null || r.name === undefined ? "" : String(r.name).trim();
    const seg = r.segment === null || r.segment === undefined ? "" : String(r.segment).trim();
    if (!name) continue;
    if (!seg) { emptySeg++; continue; }
    const ind = r.industry === null || r.industry === undefined ? "" : String(r.industry).trim();
    const c = resolveCountry(r.country);
    const a = analyzeName(name);
    const countryCode = c.code || "";
    const key = a.coreKey + "|" + countryCode;
    const prev = map.get(key);
    if (prev && (prev.segment !== seg || prev.industry !== ind)) {
      conflicts.push({ name, country: c.name || String(r.country ?? ""), before: `${prev.industry} / ${prev.segment}`, after: `${ind} / ${seg}`, file: fileName, sheet });
    }
    map.set(key, { key, name, coreKey: a.coreKey, distinct: a.compactDistinct, countryCode, countryName: c.name, industry: ind, segment: seg, file: fileName, sheet });
    added++;
  }
  store.entries = [...map.values()];
  store.conflicts = conflicts;
  return { added, emptySeg };
}

export function runIndustry(engine, progress) {
  const st = engine.refs.industry;
  if (!st.entries.length) return { _skipped: true, note: "Chưa có Industry Master." };
  const byKey = new Map(), byCoreNoCountry = new Map(), byDistinct = new Map();
  for (const e of st.entries) {
    byKey.set(e.key, e);
    const nk = e.coreKey;
    if (!byCoreNoCountry.has(nk)) byCoreNoCountry.set(nk, []);
    byCoreNoCountry.get(nk).push(e);
    if (e.distinct && e.distinct.length >= 4) {
      const dk = e.distinct + "|" + e.countryCode;
      if (!byDistinct.has(dk)) byDistinct.set(dk, []);
      byDistinct.get(dk).push(e);
    }
  }
  const P = engine.entities.Purchaser;
  const match = new Array(P.entities.length).fill(null);
  const used = new Set();
  let exact = 0, loose = 0;
  P.entities.forEach((ent, k) => {
    const keys = new Set([...ent.coreKeys, ...ent.variants.slice(0, 30).map((v) => analyzeName(v.raw).coreKey), analyzeName(ent.name).coreKey]);
    let hit = null, how = "";
    for (const ck of keys) {
      const e = byKey.get(ck + "|" + ent.countryCode);
      if (e) { hit = e; how = "Khớp theo tên chuẩn hóa"; break; }
    }
    if (!hit) for (const ck of keys) {
      const list = (byCoreNoCountry.get(ck) || []).filter((e) => !e.countryCode);
      if (list.length === 1) { hit = list[0]; how = "Khớp theo tên (master không ghi quốc gia)"; break; }
    }
    if (!hit) {
      for (const dk of ent.distinctKeys) {
        const list = byDistinct.get(dk.replace(/\s+/g, "") + "|" + ent.countryCode) || [];
        if (list.length === 1) { hit = list[0]; how = "Khớp theo tên lõi (gần đúng)"; break; }
      }
    }
    if (hit) { match[k] = { e: hit, how }; used.add(hit.key); if (how.startsWith("Khớp theo tên lõi")) loose++; else exact++; }
  });
  progress(0.4, "Đã khớp danh sách DN");

  const scopeTop = engine.settings.industryApplyScope === "top";
  const out = { years: {}, entitiesMatched: exact + loose, exact, loose, masterEntries: st.entries.length, unusedEntries: st.entries.length - used.size, scope: scopeTop ? "top" : "all" };
  engine.years.forEach((y, yi) => {
    const pe = y.cols.__entity_Purchaser, top = y.cols.Purchaser_Top_Flag, TV = y.cols.TotalValue_Clean;
    const I = new Array(y.n).fill(""), S = new Array(y.n).fill(""), M = new Array(y.n).fill("");
    let rows = 0, value = 0, totalValue = 0;
    for (let i = 0; i < y.n; i++) {
      const e = pe[i];
      if (TV[i] > 0) totalValue += TV[i];
      if (e < 0) continue;
      const m = match[e];
      if (!m) { M[i] = "Không khớp"; continue; }
      if (scopeTop && top[i] !== LABELS.YES) { M[i] = "Có trong master – ngoài Top (không gán)"; continue; }
      I[i] = m.e.industry; S[i] = m.e.segment; M[i] = m.how; rows++;
      if (TV[i] > 0) value += TV[i];
    }
    y.cols.Industry = I; y.cols.Industry_Segment = S; y.cols.Industry_Match = M;
    out.years[y.year] = { rows, valueShare: totalValue ? value / totalValue : 0 };
    progress(0.4 + 0.6 * (yi + 1) / engine.years.length, `Năm ${y.year}`);
  });
  // DN thuộc Top (toàn cầu hoặc Việt Nam, bất kỳ năm nào) nhưng chưa có ngành
  const missing = new Map();
  const R = engine.rankings;
  if (R) Object.entries(R.years).forEach(([yr, ys]) => ["P_ALL", "P_VN"].forEach((sid) => ys[sid]?.list.forEach((r) => {
    if (!r.top || match[r.e]) return;
    const m = missing.get(r.e) || { e: r.e, value: 0, years: new Set() };
    m.years.add(yr); missing.set(r.e, m);
  })));
  // giá trị hiển thị = tổng trị giá toàn cầu của DN trong các năm thuộc Top (kể cả khi DN chỉ thuộc Top Việt Nam)
  if (R) missing.forEach((m) => {
    m.value = 0;
    m.years.forEach((yr) => { const r = R.years[yr].P_ALL.list.find((x) => x.e === m.e); if (r) m.value += r.value; });
  });
  out.topMissing = [...missing.values()].sort((a, b) => b.value - a.value).map((m) => {
    const ent = P.entities[m.e];
    return { id: ent.id, name: ent.name, country: ent.countryName, value: m.value, years: [...m.years].sort().join(", ") };
  });
  out.topMissingCount = out.topMissing.length;
  out.topMissing = out.topMissing.slice(0, 300);
  engine.industryMatch = match;
  return out;
}
