/* Nhãn năm & giai đoạn — đánh dấu năm chưa đủ 12 tháng (theo cột Ngày). */
/** Nhãn năm: "2026 (T1–T10)" nếu năm chưa đủ 12 tháng (theo cột Ngày). */
export function yearLabel(y) { return y.coverage?.partial ? `${y.year} (T${y.coverage.firstMonth}–T${y.coverage.lastMonth})` : y.year; }
/** Nhãn cả giai đoạn: "2020 – T10/2026". */
export function periodLabel(years) {
  const a = years[0], b = years[years.length - 1];
  const from = a.coverage?.partial && a.coverage.firstMonth > 1 ? `T${a.coverage.firstMonth}/${a.year}` : a.year;
  const to = b.coverage?.partial && b.coverage.lastMonth < 12 ? `T${b.coverage.lastMonth}/${b.year}` : b.year;
  return from === to ? String(from) : `${from} – ${to}`;
}
