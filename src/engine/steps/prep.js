/* ═══════════════════════════════════════════════════════════════
   BƯỚC 3–5: KIỂM TRA CHẤT LƯỢNG · BỔ SUNG SỐ LIỆU · ĐỐI CHIẾU GIÁ TRỊ
   ═══════════════════════════════════════════════════════════════ */
import { parseNumberDetailed, parseDate, positiveOrNull } from "../numbers.js";
import { normText } from "../text.js";
import { lookupUnit } from "../dict/units.js";
import { resolveCountry } from "../dict/countries.js";
import { compilePlaceholders, placeholderReason } from "../names.js";
import { SCHEMA_FIELDS } from "../constants.js";

const NUM_FIELDS = ["unitPrice", "totalValue", "quantity"];
const TEXT_FIELDS = ["productDesc", "supplier", "purchaser", "countryOrigin", "purchCountry", "unit"];
const FIELD_LABEL = Object.fromEntries(SCHEMA_FIELDS.map((f) => [f.key, f.label]));

const val = (y, f, i) => (y.map[f] >= 0 ? y.rows[i][y.map[f]] : null);

/* ═════════ BƯỚC 3 — KIỂM TRA CHẤT LƯỢNG ═════════ */
export function runQuality(engine, progress) {
  const ph = compilePlaceholders(engine.settings.customPlaceholders);
  const out = { years: {} };
  const unitAll = new Map();
  const countryUnmapped = new Map();
  engine.years.forEach((y, yi) => {
    const num = {}, text = {};
    NUM_FIELDS.forEach((f) => (num[f] = { valid: 0, zero: 0, negative: 0, text: 0, invalid: 0, blank: 0, fromText: 0 }));
    TEXT_FIELDS.forEach((f) => (text[f] = { filled: 0, blank: 0, placeholder: 0 }));
    const dup = new Array(y.n).fill("");
    const dateCol = y.map.date >= 0 ? new Array(y.n).fill(null) : null;
    let dupCount = 0, coreOK = 0, dateOK = 0, dateBad = 0, dateYearMismatch = 0;
    const seen = new Map();
    const uniqSupp = new Set(), uniqPurch = new Set();

    for (let i = 0; i < y.n; i++) {
      const vals = {};
      for (const f of NUM_FIELDS) {
        const raw = val(y, f, i);
        const r = parseNumberDetailed(raw);
        const s = num[f];
        if (r.kind === "blank") s.blank++;
        else if (r.kind === "text") s.text++;
        else if (r.kind === "invalid") s.invalid++;
        else {
          if (typeof raw === "string") s.fromText++;
          if (r.value > 0) s.valid++; else if (r.value === 0) s.zero++; else s.negative++;
        }
        vals[f] = r.value;
      }
      for (const f of TEXT_FIELDS) {
        const raw = val(y, f, i);
        const s = text[f];
        const str = raw === null || raw === undefined ? "" : String(raw).trim();
        if (!str) s.blank++;
        else if ((f === "supplier" || f === "purchaser") && placeholderReason(str, ph)) s.placeholder++;
        else if (f !== "supplier" && f !== "purchaser" && ["NONE", "N A", "NA", "OTHER", "OTHERS", "UNKNOWN", "NIL"].includes(normText(str))) s.placeholder++;
        else s.filled++;
      }
      const unitRaw = val(y, "unit", i);
      const u = lookupUnit(unitRaw);
      const uk = u.unit || "(trống)";
      const ue = unitAll.get(uk) || { unit: uk, count: 0, examples: new Set(), kind: u.kind, factor: u.factor, label: u.label };
      ue.count++; if (ue.examples.size < 4 && unitRaw !== null) ue.examples.add(String(unitRaw));
      unitAll.set(uk, ue);

      for (const f of ["countryOrigin", "purchCountry"]) {
        const raw = val(y, f, i);
        const c = resolveCountry(raw);
        if (c.status === "Không nhận diện") {
          const k = String(raw).trim();
          const e = countryUnmapped.get(k) || { value: k, field: FIELD_LABEL[f], count: 0 };
          e.count++; countryUnmapped.set(k, e);
        }
      }
      const s1 = val(y, "supplier", i), p1 = val(y, "purchaser", i);
      if (s1) uniqSupp.add(normText(s1)); if (p1) uniqPurch.add(normText(p1));

      // dòng đủ dữ liệu cốt lõi
      const hasValue = vals.totalValue > 0 || (vals.unitPrice > 0 && vals.quantity > 0);
      if (p1 && val(y, "productDesc", i) && hasValue && vals.quantity > 0 && unitRaw) coreOK++;

      // trùng lặp hoàn toàn trên các trường đã ánh xạ
      const key = SCHEMA_FIELDS.map((f) => { const v = val(y, f.key, i); return v instanceof Date ? v.getTime() : (v ?? ""); }).join("\u0001");
      if (seen.has(key)) { dup[i] = "Trùng lặp"; dupCount++; } else seen.set(key, i);

      if (dateCol) {
        const raw = val(y, "date", i);
        const d = parseDate(raw);
        if (d) { dateCol[i] = d; dateOK++; if (String(d.getUTCFullYear()) !== y.year) dateYearMismatch++; }
        else if (raw !== null && raw !== "") dateBad++;
      }
      if ((i & 8191) === 0) progress((yi + i / y.n) / engine.years.length, `Năm ${y.year}: ${i.toLocaleString("vi-VN")}/${y.n.toLocaleString("vi-VN")} dòng`);
    }
    y.cols.Duplicate_Flag = dup;
    if (dateCol) y.cols.Date_Clean = dateCol;
    out.years[y.year] = {
      rows: y.n, num, text, duplicates: dupCount, coreComplete: coreOK, coreCompletePct: y.n ? coreOK / y.n : 0,
      uniqueSuppliersRaw: uniqSupp.size, uniquePurchasersRaw: uniqPurch.size,
      date: dateCol ? { parsed: dateOK, unparsed: dateBad, yearMismatch: dateYearMismatch } : null,
    };
  });
  out.units = [...unitAll.values()].sort((a, b) => b.count - a.count).map((u) => ({ ...u, examples: [...u.examples].join(", ") }));
  out.countriesUnmapped = [...countryUnmapped.values()].sort((a, b) => b.count - a.count).slice(0, 200);
  out.fieldLabels = FIELD_LABEL;
  return out;
}

/* ═════════ BƯỚC 4 — BỔ SUNG SỐ LIỆU THIẾU ═════════
   Nếu thiếu ĐÚNG MỘT trong ba trường (Đơn giá, Trị giá, Lượng) và hai trường còn lại hợp lệ (> 0):
     Đơn giá = Trị giá / Lượng · Trị giá = Đơn giá × Lượng · Lượng = Trị giá / Đơn giá
   Giá trị ≤ 0, chữ, ô trống đều coi là "thiếu". Dữ liệu gốc giữ nguyên; kết quả ở cột *_Clean. */
export function runBackfill(engine, progress) {
  const out = { years: {}, samples: [] };
  engine.years.forEach((y, yi) => {
    const UP = new Float64Array(y.n), TV = new Float64Array(y.n), Q = new Float64Array(y.n);
    const BF = new Array(y.n).fill("");
    const cnt = { unitPrice: 0, totalValue: 0, quantity: 0, notPossible: 0, complete: 0 };
    for (let i = 0; i < y.n; i++) {
      const up = positiveOrNull(parseNumberDetailed(val(y, "unitPrice", i)).value);
      const tv = positiveOrNull(parseNumberDetailed(val(y, "totalValue", i)).value);
      const q = positiveOrNull(parseNumberDetailed(val(y, "quantity", i)).value);
      let u = up, t = tv, qq = q;
      const missing = (up === null) + (tv === null) + (q === null);
      if (missing === 0) cnt.complete++;
      else if (missing === 1) {
        if (up === null) { u = tv / q; BF[i] = "Đơn giá"; cnt.unitPrice++; }
        else if (tv === null) { t = up * q; BF[i] = "Trị giá"; cnt.totalValue++; }
        else { qq = tv / up; BF[i] = "Lượng"; cnt.quantity++; }
        if (out.samples.length < 60) {
          out.samples.push({
            year: y.year, row: y.rowNum[i], field: BF[i],
            unitPrice: val(y, "unitPrice", i), totalValue: val(y, "totalValue", i), quantity: val(y, "quantity", i),
            newValue: BF[i] === "Đơn giá" ? u : BF[i] === "Trị giá" ? t : qq,
          });
        }
      } else cnt.notPossible++;
      UP[i] = u ?? NaN; TV[i] = t ?? NaN; Q[i] = qq ?? NaN;
      if ((i & 16383) === 0) progress((yi + i / y.n) / engine.years.length, `Năm ${y.year}`);
    }
    y.cols.UnitPrice_Clean = UP; y.cols.TotalValue_Clean = TV; y.cols.Quantity_Clean = Q; y.cols.Backfill_Field = BF;
    out.years[y.year] = { rows: y.n, ...cnt, backfilled: cnt.unitPrice + cnt.totalValue + cnt.quantity };
  });
  return out;
}

/* ═════════ BƯỚC 5 — ĐỐI CHIẾU GIÁ TRỊ ═════════
   Lệch = |Đơn giá × Lượng − Trị giá| / Trị giá. Lệch > ngưỡng (mặc định 30%) ⇒ "Lệch vượt ngưỡng".
   Dòng vừa được bổ sung ở bước 4 khớp theo cấu trúc nên không kiểm được ⇒ ghi rõ "Đã bổ sung". */
export const VC = { OK: "Hợp lệ", BAD: "Lệch vượt ngưỡng", MISSING: "Thiếu dữ liệu", BACKFILLED: "Đã bổ sung (không kiểm được)" };

export function runValidate(engine, progress) {
  const tol = Number(engine.settings.valueTolerance) || 0.3;
  const out = { years: {}, tolerance: tol, samples: [] };
  const flaggedAll = [];
  engine.years.forEach((y, yi) => {
    const UP = y.cols.UnitPrice_Clean, TV = y.cols.TotalValue_Clean, Q = y.cols.Quantity_Clean, BF = y.cols.Backfill_Field;
    const chk = new Array(y.n), diff = new Float64Array(y.n).fill(NaN);
    const c = { ok: 0, bad: 0, missing: 0, backfilled: 0, b1: 0, b10: 0, b30: 0, b100: 0, bInf: 0 };
    for (let i = 0; i < y.n; i++) {
      if (BF[i]) { chk[i] = VC.BACKFILLED; c.backfilled++; continue; }
      const up = UP[i], tv = TV[i], q = Q[i];
      if (up > 0 && tv > 0 && q > 0) {
        const d = Math.abs(up * q - tv) / tv;
        diff[i] = d;
        if (d <= 0.01) c.b1++; else if (d <= 0.1) c.b10++; else if (d <= 0.3) c.b30++; else if (d <= 1) c.b100++; else c.bInf++;
        if (d > tol) {
          chk[i] = VC.BAD; c.bad++;
          if (flaggedAll.length < 5000) flaggedAll.push({ year: y.year, row: y.rowNum[i], unitPrice: up, quantity: q, totalValue: tv, calc: up * q, diff: d, unit: val(y, "unit", i), desc: val(y, "productDesc", i) });
        } else { chk[i] = VC.OK; c.ok++; }
      } else { chk[i] = VC.MISSING; c.missing++; }
      if ((i & 16383) === 0) progress((yi + i / y.n) / engine.years.length, `Năm ${y.year}`);
    }
    y.cols.Value_Check = chk; y.cols.Value_Check_Diff = diff;
    out.years[y.year] = { rows: y.n, ...c };
  });
  out.samples = flaggedAll.sort((a, b) => b.diff - a.diff).slice(0, 50);
  return out;
}
