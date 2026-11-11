/* ═══════════════════════════════════════════════════════════════
   BƯỚC 8 — XẾP HẠNG TOP DOANH NGHIỆP (mặc định Top 80% giá trị) — theo từng năm và cả giai đoạn
   - Giá trị dòng = Trị giá (sạch) sau bổ sung.
   - Gộp theo MÃ NHÓM DN (không theo tên chuỗi) ⇒ không tách nhầm / gộp nhầm.
   - Mẫu số = tổng giá trị của DN XÁC ĐỊNH được trong phạm vi; giá trị placeholder báo cáo riêng.
   - DN thuộc Top nếu giá trị cộng dồn TRƯỚC nó < ngưỡng (DN vượt ngưỡng vẫn được tính vào Top).
   - Phạm vi: Nhập khẩu (toàn cầu / Việt Nam / từng châu lục) · Xuất khẩu (toàn cầu / bán vào VN / từng châu lục xuất xứ)
   ═══════════════════════════════════════════════════════════════ */
import { LABELS } from "../constants.js";

export const VN_NAME = "Vietnam";

export function scopeLabel(id) {
  if (id === "P_ALL") return "Nhà nhập khẩu – Toàn cầu";
  if (id === "P_VN") return "Nhà nhập khẩu – Việt Nam";
  if (id.startsWith("P_CONT:")) return "Nhà nhập khẩu – " + id.slice(7);
  if (id === "S_ALL") return "Nhà xuất khẩu – Toàn cầu";
  if (id === "S_VN") return "Nhà xuất khẩu – bán vào Việt Nam";
  if (id.startsWith("S_CONT:")) return "Nhà xuất khẩu – xuất xứ " + id.slice(7);
  return id;
}

export function topLabel(thr) { return `Thuộc Top ${Math.round(thr * 100)}%`; }

/** Xếp hạng các phạm vi trên một tập năm (một năm, hoặc cả giai đoạn). Mỗi dòng góp giá trị RV đã tính sẵn. */
function rankScopes(yearList, thr) {
  const conts = (key) => [...new Set(yearList.flatMap((y) => [...new Set(y.cols[key])]))].filter((c) => c && c !== "Không xác định").sort();
  const scopes = [
    { id: "P_ALL", ent: "__entity_Purchaser", ctry: "Purchaser_Country_Std", filter: null },
    { id: "P_VN", ent: "__entity_Purchaser", ctry: "Purchaser_Country_Std", filter: (y, i) => y.cols.Purchaser_Country_Std[i] === VN_NAME },
    ...conts("Purchaser_Continent").map((c) => ({ id: "P_CONT:" + c, ent: "__entity_Purchaser", ctry: "Purchaser_Country_Std", filter: (y, i) => y.cols.Purchaser_Continent[i] === c })),
    { id: "S_ALL", ent: "__entity_Supplier", ctry: "Supplier_Country_Std", filter: null },
    { id: "S_VN", ent: "__entity_Supplier", ctry: "Supplier_Country_Std", filter: (y, i) => y.cols.Purchaser_Country_Std[i] === VN_NAME },
    ...conts("Supplier_Continent").map((c) => ({ id: "S_CONT:" + c, ent: "__entity_Supplier", ctry: "Supplier_Country_Std", filter: (y, i) => y.cols.Supplier_Continent[i] === c })),
  ];
  const store = {}, sum = {};
  for (const sc of scopes) {
    const agg = new Map();
    let total = 0, phValue = 0, notCalc = 0, rowsInScope = 0;
    for (const y of yearList) {
      const RV = y.cols.Row_Ranking_Value, E = y.cols[sc.ent], C = y.cols[sc.ctry];
      for (let i = 0; i < y.n; i++) {
        if (sc.filter && !sc.filter(y, i)) continue;
        rowsInScope++;
        const v = RV[i];
        if (!(v > 0)) { notCalc++; continue; }
        const e = E[i];
        if (e < 0) { phValue += v; continue; }
        let a = agg.get(e);
        if (!a) { a = { e, value: 0, rows: 0, ctry: new Map() }; agg.set(e, a); }
        a.value += v; a.rows++; total += v;
        const c = C[i] || "";
        a.ctry.set(c, (a.ctry.get(c) || 0) + v);
      }
    }
    const list = [...agg.values()].sort((a, b) => b.value - a.value || a.e - b.e);
    let cum = 0, topCount = 0;
    const cutoff = total * thr;
    const rows = list.map((a, k) => {
      const before = cum;
      cum += a.value;
      const top = before < cutoff - 1e-9;
      if (top) topCount++;
      let bc = "", bv = -1; a.ctry.forEach((v, c) => { if (v > bv) { bv = v; bc = c; } });
      return { e: a.e, rank: k + 1, value: a.value, rows: a.rows, share: total ? a.value / total : 0, cum: total ? cum / total : 0, top, country: bc };
    });
    const group = sc.id.startsWith("P") ? "Purchaser" : "Supplier";
    store[sc.id] = { id: sc.id, group, label: scopeLabel(sc.id), total, phValue, notCalc, rowsInScope, list: rows, topCount };
    sum[sc.id] = {
      id: sc.id, label: scopeLabel(sc.id), group, entities: rows.length, topCount, total, placeholderValue: phValue,
      placeholderShare: total + phValue ? phValue / (total + phValue) : 0, notCalc, rowsInScope,
      topValueShare: rows.filter((r) => r.top).reduce((a, r) => a + r.share, 0),
    };
  }
  return { store, sum, order: scopes.map((x) => x.id) };
}

export function runRanking(engine, progress) {
  const thr = Math.min(0.99, Math.max(0.05, Number(engine.settings.topThreshold) || 0.8));
  const P = engine.entities.Purchaser, S = engine.entities.Supplier;
  const metricVol = engine.settings.rankingMetric === "volume";
  const out = { threshold: thr, metric: metricVol ? "volume" : "value", years: {} };
  const store = { threshold: thr, years: {}, period: null };

  engine.years.forEach((y, yi) => {
    const TV = metricVol ? y.cols.Quantity_MT : y.cols.TotalValue_Clean;
    const XD = engine.settings.excludeCrossSourceDup ? y.cols.Cross_Source_Dup : null;
    const PSan = metricVol ? y.cols.Price_Sanity : null; // khối lượng sai đơn vị không được cộng
    const RV = new Float64Array(y.n);
    for (let i = 0; i < y.n; i++) RV[i] = TV[i] > 0 && !(XD && XD[i]) && !(PSan && PSan[i]) ? TV[i] : NaN;
    y.cols.Row_Ranking_Value = RV;
    const r = rankScopes([y], thr);
    const pEnt = y.cols.__entity_Purchaser, sEnt = y.cols.__entity_Supplier;

    // cờ trên từng dòng (phạm vi toàn cầu của năm đó)
    const pTop = new Set(r.store.P_ALL.list.filter((x) => x.top).map((x) => x.e));
    const sTop = new Set(r.store.S_ALL.list.filter((x) => x.top).map((x) => x.e));
    const scopeFlag = new Array(y.n), pFlag = new Array(y.n), sFlag = new Array(y.n);
    const inTop = topLabel(thr), outTop = `Ngoài Top ${Math.round(thr * 100)}%`;
    for (let i = 0; i < y.n; i++) {
      const pe = pEnt[i];
      if (pe < 0) scopeFlag[i] = "Doanh nghiệp không xác định (loại)";
      else if (XD && XD[i]) scopeFlag[i] = "Trùng nguồn khác (không tính)";
      else if (!(RV[i] > 0)) scopeFlag[i] = metricVol ? "Không có khối lượng (tấn)" : "Không tính được giá trị";
      else scopeFlag[i] = pTop.has(pe) ? inTop : outTop;
      pFlag[i] = pe >= 0 && pTop.has(pe) ? LABELS.YES : LABELS.NO;
      sFlag[i] = sEnt[i] >= 0 && sTop.has(sEnt[i]) ? LABELS.YES : LABELS.NO;
    }
    y.cols.Research_Scope_Flag = scopeFlag; y.cols.Purchaser_Top_Flag = pFlag; y.cols.Supplier_Top_Flag = sFlag;
    store.years[y.year] = r.store;
    out.years[y.year] = { scopes: r.sum, scopeOrder: r.order };
    progress((yi + 1) / (engine.years.length + 1), `Năm ${y.year}`);
  });
  // Cả giai đoạn: cộng dồn mọi năm (mã nhóm DN thống nhất giữa các năm nên cộng được)
  if (engine.years.length > 1) {
    const r = rankScopes(engine.years, thr);
    store.period = r.store;
    out.period = { scopes: r.sum, scopeOrder: r.order, years: engine.years.map((y) => y.year) };
  }
  progress(1, "Cả giai đoạn");
  engine.rankings = store;
  // DN cần nghiên cứu ngành: thuộc Top nhập khẩu toàn cầu hoặc Việt Nam ở bất kỳ năm nào (hoặc cả giai đoạn)
  const need = new Set();
  [...Object.values(store.years), ...(store.period ? [store.period] : [])].forEach((ys) => ["P_ALL", "P_VN"].forEach((sid) => ys[sid]?.list.forEach((r) => r.top && need.add(r.e))));
  out.researchEntities = need.size;
  out.entityNames = { Purchaser: P.entities.length, Supplier: S.entities.length };
  return out;
}
