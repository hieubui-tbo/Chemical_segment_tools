/* Định dạng số theo kiểu Việt Nam: 1.234.567,89 */
const nf = (d) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const NF0 = nf(0), NF1 = nf(1), NF2 = nf(2);

export function n(v, d = 0) {
  if (v === null || v === undefined || v === "" || (typeof v === "number" && !Number.isFinite(v))) return "—";
  if (typeof v !== "number") return String(v);
  return d === 0 ? NF0.format(v) : d === 1 ? NF1.format(v) : d === 2 ? NF2.format(v) : nf(d).format(v);
}
export function pct(v, d = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return nf(d).format(v * 100) + "%";
}
/** Tiền USD rút gọn: 12,4 triệu · 3,2 tỷ · 845.000 */
export function usd(v, { compact = true } = {}) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (!compact) return NF0.format(v) + " USD";
  const a = Math.abs(v);
  if (a >= 1e9) return NF2.format(v / 1e9) + " tỷ USD";
  if (a >= 1e6) return NF1.format(v / 1e6) + " triệu USD";
  if (a >= 1e4) return NF0.format(v / 1e3) + " nghìn USD";
  return NF0.format(v) + " USD";
}
export function compact(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return NF1.format(v / 1e9) + " tỷ";
  if (a >= 1e6) return NF1.format(v / 1e6) + " tr";
  if (a >= 1e4) return NF0.format(v / 1e3) + " N";
  return NF0.format(v);
}
export function price(v) { return v === null || v === undefined || !Number.isFinite(v) ? "—" : NF0.format(v); }
export function ms(v) { return v == null ? "" : v < 1000 ? `${v} ms` : `${NF1.format(v / 1000)} giây`; }
