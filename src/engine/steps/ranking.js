/* ═══════════════════════════════════════════════════════════════
   BƯỚC 7 — XẾP HẠNG TOP DOANH NGHIỆP (mặc định Top 80% giá trị)
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

export function runRanking(engine, progress) {
  const thr = Math.min(0.99, Math.max(0.05, Number(engine.settings.topThreshold) || 0.8));
  const P = engine.entities.Purchaser, S = engine.entities.Supplier;
  const metricVol = engine.settings.rankingMetric === "volume";
  const out = { threshold: thr, metric: metricVol ? "volume" : "value", years: {} };
  const store = { threshold: thr, years: {} };

  engine.years.forEach((y, yi) => {
    const TV = engine.settings.rankingMetric === "volume" ? y.cols.Quantity_MT : y.cols.TotalValue_Clean;
    const XD = engine.settings.excludeCrossSourceDup ? y.cols.Cross_Source_Dup : null;
    const pEnt = y.cols.__entity_Purchaser, sEnt = y.cols.__entity_Supplier;
    const pCountry = y.cols.Purchaser_Country_Std, pCont = y.cols.Purchaser_Continent;
    const sCountry = y.cols.Supplier_Country_Std, sCont = y.cols.Supplier_Continent;
    const RV = new Float64Array(y.n);
    const PSan = engine.settings.rankingMetric === "volume" ? y.cols.Price_Sanity : null; // khối lượng sai đơn vị không được cộng
    for (let i = 0; i < y.n; i++) RV[i] = TV[i] > 0 && !(XD && XD[i]) && !(PSan && PSan[i]) ? TV[i] : NaN;
    y.cols.Row_Ranking_Value = RV;

    // định nghĩa phạm vi
    const scopes = [
      { id: "P_ALL", ent: pEnt, ctry: pCountry, filter: null },
      { id: "P_VN", ent: pEnt, ctry: pCountry, filter: (i) => pCountry[i] === VN_NAME },
    ];
    [...new Set(pCont)].filter((c) => c && c !== "Không xác định").sort().forEach((c) => scopes.push({ id: "P_CONT:" + c, ent: pEnt, ctry: pCountry, filter: (i) => pCont[i] === c }));
    scopes.push({ id: "S_ALL", ent: sEnt, ctry: sCountry, filter: null });
    scopes.push({ id: "S_VN", ent: sEnt, ctry: sCountry, filter: (i) => pCountry[i] === VN_NAME });
    [...new Set(sCont)].filter((c) => c && c !== "Không xác định").sort().forEach((c) => scopes.push({ id: "S_CONT:" + c, ent: sEnt, ctry: sCountry, filter: (i) => sCont[i] === c }));

    const yStore = {}, ySum = {};
    scopes.forEach((sc, si) => {
      const agg = new Map();
      let total = 0, phValue = 0, notCalc = 0, rowsInScope = 0;
      for (let i = 0; i < y.n; i++) {
        if (sc.filter && !sc.filter(i)) continue;
        rowsInScope++;
        const v = RV[i];
        if (!(v > 0)) { notCalc++; continue; }
        const e = sc.ent[i];
        if (e < 0) { phValue += v; continue; }
        let a = agg.get(e);
        if (!a) { a = { e, value: 0, rows: 0, ctry: new Map() }; agg.set(e, a); }
        a.value += v; a.rows++; total += v;
        const c = sc.ctry[i] || "";
        a.ctry.set(c, (a.ctry.get(c) || 0) + v);
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
      yStore[sc.id] = { id: sc.id, group: sc.id.startsWith("P") ? "Purchaser" : "Supplier", label: scopeLabel(sc.id), total, phValue, notCalc, rowsInScope, list: rows, topCount };
      ySum[sc.id] = {
        id: sc.id, label: scopeLabel(sc.id), group: sc.id.startsWith("P") ? "Purchaser" : "Supplier",
        entities: rows.length, topCount, total, placeholderValue: phValue,
        placeholderShare: total + phValue ? phValue / (total + phValue) : 0, notCalc, rowsInScope,
        topValueShare: rows.filter((r) => r.top).reduce((a, r) => a + r.share, 0),
      };
      progress((yi + (si + 1) / scopes.length) / engine.years.length, `Năm ${y.year}: ${scopeLabel(sc.id)}`);
    });

    // cờ trên từng dòng (phạm vi toàn cầu)
    const pTop = new Set(yStore.P_ALL.list.filter((r) => r.top).map((r) => r.e));
    const sTop = new Set(yStore.S_ALL.list.filter((r) => r.top).map((r) => r.e));
    const scopeFlag = new Array(y.n), pFlag = new Array(y.n), sFlag = new Array(y.n);
    const inTop = topLabel(thr), outTop = `Ngoài Top ${Math.round(thr * 100)}%`;
    for (let i = 0; i < y.n; i++) {
      const pe = pEnt[i];
      if (pe < 0) scopeFlag[i] = "DN không xác định (loại)";
      else if (XD && XD[i]) scopeFlag[i] = "Trùng nguồn khác (không tính)";
      else if (!(RV[i] > 0)) scopeFlag[i] = metricVol ? "Không có khối lượng (tấn)" : "Không tính được giá trị";
      else scopeFlag[i] = pTop.has(pe) ? inTop : outTop;
      pFlag[i] = pe >= 0 && pTop.has(pe) ? LABELS.YES : LABELS.NO;
      sFlag[i] = sEnt[i] >= 0 && sTop.has(sEnt[i]) ? LABELS.YES : LABELS.NO;
    }
    y.cols.Research_Scope_Flag = scopeFlag; y.cols.Purchaser_Top_Flag = pFlag; y.cols.Supplier_Top_Flag = sFlag;
    store.years[y.year] = yStore;
    out.years[y.year] = { scopes: ySum, scopeOrder: scopes.map((s) => s.id) };
  });
  engine.rankings = store;
  // DN cần nghiên cứu ngành: thuộc Top nhập khẩu toàn cầu hoặc Việt Nam ở bất kỳ năm nào
  const need = new Set();
  Object.values(store.years).forEach((ys) => ["P_ALL", "P_VN"].forEach((sid) => ys[sid]?.list.forEach((r) => r.top && need.add(r.e))));
  out.researchEntities = need.size;
  out.entityNames = { Purchaser: P.entities.length, Supplier: S.entities.length };
  return out;
}
