/* ═══════════════════════════════════════════════════════════════
   XUẤT FILE EXCEL
   - Báo cáo kiểm toán (tóm tắt + từ điển DN + nhật ký từng bước + từ điển cột + cấu hình)
   - Dữ liệu chi tiết từng năm (mọi cột gốc + cột tính toán, có cột "Giữ lại sau lọc")
   - File nghiên cứu Top DN (theo phạm vi) & danh sách DN cần nghiên cứu ngành (gộp nhiều năm)
   - File rà soát tên DN (điền "Tên chuẩn hóa (sửa)" rồi tải lại làm từ điển)
   - File mẫu: bộ từ khóa, Industry Master, từ điển DN
   ═══════════════════════════════════════════════════════════════ */
import * as XLSX from "xlsx";
import { COLUMN_DEFS, COLUMN_MAP, DETAIL_COMPUTED_ORDER, headerLabel } from "../columns.js";
import { SCHEMA_FIELDS, STEPS, APP_VERSION, DEFAULT_SETTINGS } from "../constants.js";
import { safeSheetName, safeFileName } from "../text.js";
import { scopeLabel } from "../steps/ranking.js";
import { normalizeProfile } from "../profile.js";
import { applyProfile, profileFromEngine } from "../profileApply.js";

const today = () => new Date().toISOString().slice(0, 10);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const r2 = (v, d = 4) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

function writeBook(wb) {
  return XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true, bookSST: true });
}

/** aoa → sheet + bộ lọc + độ rộng cột. */
function sheetFrom(aoa, widths) {
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  if (aoa.length > 1 && aoa[0].length) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: aoa[0].length - 1 } }) };
  ws["!cols"] = (widths || aoa[0].map((h) => Math.min(48, Math.max(10, String(h ?? "").length + 2)))).map((w) => ({ wch: w }));
  return ws;
}

function addSheet(wb, used, name, aoa, widths) {
  if (!aoa || aoa.length < 1) return;
  XLSX.utils.book_append_sheet(wb, sheetFrom(aoa, widths), safeSheetName(name, used));
}

function objRows(headers, rows) { return [headers.map((h) => h[1]), ...rows.map((r) => headers.map((h) => (typeof h[0] === "function" ? h[0](r) : r[h[0]])))]; }

/* ═════════ BÁO CÁO KIỂM TOÁN ═════════ */
export function buildAuditWorkbook(engine) {
  const wb = XLSX.utils.book_new();
  const used = new Set();
  const R = engine.results, S = engine.settings;
  const years = engine.years.map((y) => y.year);

  // 00 — Hướng dẫn
  const sheetsInfo = [
    ["01_Tổng quan", "Các chỉ tiêu chính theo năm qua từng bước xử lý."],
    ["02_Chất lượng", "Thống kê ô hợp lệ/thiếu/0/âm/chữ cho các cột số; ô trống/placeholder cho cột chữ; dòng trùng lặp."],
    ["03_Bổ sung-Đối chiếu", "Số dòng được bổ sung Đơn giá/Trị giá/Lượng; phân bố độ lệch Đơn giá × Lượng so với Trị giá."],
    ["04_Quy đổi đơn vị", "Bảng đơn vị → hệ số quy đổi về tấn (nguồn hệ số, gợi ý, số dòng suy luận từ mô tả)."],
    ["05_Từ điển DN mua", "Mỗi dòng = một nhóm DN mua sau chuẩn hóa: mã, tên, các biến thể, giá trị, độ tin cậy, cờ rủi ro."],
    ["06_Từ điển DN bán", "Tương tự cho DN bán (nhà cung cấp)."],
    ["07_Biến thể tên (sửa)", "Mỗi dòng = một cách viết tên gốc. Điền cột \"Tên chuẩn hóa (sửa)\" rồi tải lại ở bước 7 để sửa gộp/tách."],
    ["08_Placeholder", "Các tên bị coi là không xác định (TO ORDER, NONE, ô trống…) và lý do."],
    ["09_Trùng nguồn", "Giao dịch nghi trùng giữa các nguồn dữ liệu (cặp nguồn, số dòng, giá trị)."],
    ["10_Top DN", "Danh sách DN thuộc Top theo từng năm & phạm vi."],
    ["11_Ngành", "Kết quả gán ngành; DN thuộc Top chưa có ngành; xung đột trong Industry Master."],
    ["12_Từ khóa", "Số dòng khớp từng từ khóa; từ khóa không khớp dòng nào; mô tả chưa phân loại nhiều nhất."],
    ["13_Phân loại", "Phân bố phân khúc cuối cùng theo năm."],
    ["14_IQR", "Tứ phân vị, ngưỡng và số ngoại lai theo Năm × Phân khúc."],
    ["15_Chỉ số phân khúc", "Lượng, trị giá, giá bình quân, trung vị — trước và sau lọc ngoại lai."],
    ["16_Tổng hợp nhiều năm", "Bảng chéo Phân khúc × Năm (sau lọc)."],
    ["17_Từ điển cột", "Ý nghĩa & cách tính mọi cột trong file dữ liệu chi tiết."],
    ["18_Cấu hình", "Toàn bộ tham số đã dùng + ánh xạ cột từng năm (để tái lập kết quả)."],
  ];
  addSheet(wb, used, "00_Hướng dẫn", [
    ["BÁO CÁO KIỂM TOÁN XỬ LÝ DỮ LIỆU — ChemSeg Analyst " + APP_VERSION],
    ["Dự án", S.projectName], ["Hồ sơ sản phẩm", engine.profile ? `${engine.profile.name}${engine.profile.updatedAt ? " (cập nhật " + engine.profile.updatedAt + ")" : ""}` : "(không dùng hồ sơ)"],
    ["Ngày xuất", today()], ["Các năm", years.join(", ")],
    ["Tổng số dòng", engine.years.reduce((a, y) => a + y.n, 0)],
    [],
    ["Sheet", "Nội dung"],
    ...sheetsInfo,
  ], [26, 110]);

  // 01 — Tổng quan
  const ov = [["Chỉ tiêu", ...years]];
  const row = (label, fn) => ov.push([label, ...years.map((yr) => { try { return fn(yr); } catch { return null; } })]);
  row("Tổng số dòng", (yr) => engine.years.find((y) => y.year === yr).n);
  row("Dòng trùng lặp hoàn toàn", (yr) => R.quality?.years[yr]?.duplicates);
  row("Dòng đủ dữ liệu cốt lõi (%)", (yr) => r2(R.quality?.years[yr]?.coreCompletePct * 100, 1));
  row("Dòng được bổ sung số liệu", (yr) => R.backfill?.years[yr]?.backfilled);
  row("Dòng lệch giá trị vượt ngưỡng", (yr) => R.validate?.years[yr]?.bad);
  row("Dòng quy đổi được về tấn", (yr) => R.units ? R.units.years[yr].converted + R.units.years[yr].inferred : null);
  row("  trong đó suy luận từ mô tả", (yr) => R.units?.years[yr]?.inferred);
  row("Dòng có đơn giá USD/tấn", (yr) => R.units?.years[yr]?.priced);
  row("Dòng giá/tấn phi lý (nghi sai đơn vị)", (yr) => R.units?.years[yr]?.insane);
  row("Dòng nghi trùng nguồn khác", (yr) => R.entity?.crossSource?.years?.[yr]?.rows);
  row("Giá trị nghi trùng nguồn khác (USD)", (yr) => r2(R.entity?.crossSource?.years?.[yr]?.value, 0));
  row("DN mua thuộc Top (toàn cầu)", (yr) => R.ranking?.years[yr]?.scopes.P_ALL?.topCount);
  row("DN mua thuộc Top (Việt Nam)", (yr) => R.ranking?.years[yr]?.scopes.P_VN?.topCount);
  row("DN bán thuộc Top (toàn cầu)", (yr) => R.ranking?.years[yr]?.scopes.S_ALL?.topCount);
  row("Tỷ trọng giá trị DN không xác định (%)", (yr) => r2(R.ranking?.years[yr]?.scopes.P_ALL?.placeholderShare * 100, 2));
  row("Dòng phân loại theo từ khóa", (yr) => R.classify?.years[yr]?.keyword);
  row("Dòng phân loại theo ngành (dự phòng)", (yr) => R.classify?.years[yr]?.industry);
  row("Dòng chưa phân loại", (yr) => R.classify?.years[yr]?.unclassified);
  row("Dòng ngoài phạm vi sản phẩm", (yr) => R.classify?.years[yr]?.outOfScope);
  row("Dòng có giá — trước lọc", (yr) => R.metrics?.years[yr]?.total.before.count);
  row("Dòng có giá — sau lọc", (yr) => R.metrics?.years[yr]?.total.after.count);
  row("Giá bình quân sau lọc (USD/tấn)", (yr) => r2(R.metrics?.years[yr]?.total.after.avgPrice, 2));
  row("Tổng lượng sau lọc (tấn)", (yr) => r2(R.metrics?.years[yr]?.total.after.qty, 2));
  addSheet(wb, used, "01_Tổng quan", ov, [44, ...years.map(() => 16)]);

  // 02 — Chất lượng
  if (R.quality) {
    const q = [["Năm", "Trường", "Hợp lệ (>0)", "Bằng 0", "Âm", "Chữ", "Không hợp lệ", "Trống", "Đọc từ chuỗi có định dạng"]];
    years.forEach((yr) => Object.entries(R.quality.years[yr].num).forEach(([f, v]) => q.push([yr, R.quality.fieldLabels[f], v.valid, v.zero, v.negative, v.text, v.invalid, v.blank, v.fromText])));
    q.push([]); q.push(["Năm", "Trường", "Có dữ liệu", "Trống", "Placeholder / không xác định"]);
    years.forEach((yr) => Object.entries(R.quality.years[yr].text).forEach(([f, v]) => q.push([yr, R.quality.fieldLabels[f], v.filled, v.blank, v.placeholder])));
    q.push([]); q.push(["Năm", "Dòng trùng lặp", "Dòng đủ dữ liệu cốt lõi", "Ngày đọc được", "Ngày không đọc được", "Ngày khác năm của sheet"]);
    years.forEach((yr) => { const v = R.quality.years[yr]; q.push([yr, v.duplicates, v.coreComplete, v.date?.parsed ?? null, v.date?.unparsed ?? null, v.date?.yearMismatch ?? null]); });
    q.push([]); q.push(["Quốc gia không nhận diện được", "Cột", "Số dòng"]);
    R.quality.countriesUnmapped.forEach((c) => q.push([c.value, c.field, c.count]));
    addSheet(wb, used, "02_Chất lượng", q, [14, 28, 14, 12, 10, 10, 14, 10, 18]);
  }

  // 03 — Bổ sung & đối chiếu
  if (R.backfill) {
    const b = [["Năm", "Đủ 3 trường", "Bổ sung Đơn giá", "Bổ sung Trị giá", "Bổ sung Lượng", "Thiếu ≥ 2 trường (không bổ sung được)"]];
    years.forEach((yr) => { const v = R.backfill.years[yr]; b.push([yr, v.complete, v.unitPrice, v.totalValue, v.quantity, v.notPossible]); });
    if (R.validate) {
      b.push([]); b.push([`Đối chiếu giá trị (ngưỡng ${Math.round(R.validate.tolerance * 100)}%)`]);
      b.push(["Năm", "Hợp lệ", "Lệch vượt ngưỡng", "Thiếu dữ liệu", "Đã bổ sung", "Lệch ≤1%", "1–10%", "10–30%", "30–100%", ">100%"]);
      years.forEach((yr) => { const v = R.validate.years[yr]; b.push([yr, v.ok, v.bad, v.missing, v.backfilled, v.b1, v.b10, v.b30, v.b100, v.bInf]); });
      b.push([]); b.push(["Mẫu dòng lệch lớn nhất", "", "", "", "", "", "", ""]);
      b.push(["Năm", "Dòng Excel", "Đơn giá", "Lượng", "Trị giá", "Đơn giá × Lượng", "Tỷ lệ lệch", "Đơn vị", "Mô tả"]);
      R.validate.samples.forEach((s) => b.push([s.year, s.row, s.unitPrice, s.quantity, s.totalValue, r2(s.calc, 2), r2(s.diff, 4), s.unit, String(s.desc ?? "").slice(0, 200)]));
    }
    addSheet(wb, used, "03_Bổ sung-Đối chiếu", b, [10, 12, 14, 14, 14, 18, 12, 10, 80]);
  }

  // 04 — Đơn vị
  if (R.units) {
    const u = [["Đơn vị (chuẩn hóa)", "Ví dụ gốc", "Loại", "Diễn giải", "Số dòng", "Dòng có trị giá & lượng", "Trị giá (USD)", "Hệ số từ điển", "Hệ số áp dụng", "Nguồn hệ số", "Gợi ý hệ số", "Giá ngụ ý theo gợi ý (USD/tấn)", "Dòng suy luận từ mô tả"]];
    R.units.units.forEach((t) => u.push([t.unit, t.examples, t.kind, t.label, t.rows, t.rowsPriced, r2(t.value, 0), t.dictFactor, t.appliedFactor, t.source, t.suggestion?.factor ?? null, r2(t.suggestion?.impliedPrice, 0), t.inferred]));
    u.push([]); u.push(["Giá tham chiếu (trung vị có trọng số trị giá, USD/tấn)", r2(R.units.refPrice, 2)]);
    addSheet(wb, used, "04_Quy đổi đơn vị", u, [20, 24, 20, 30, 10, 14, 16, 12, 12, 12, 12, 18, 14]);
  }

  // 05–08 — DN
  const ents = (type) => engine.entities[type]?.entities || [];
  const entSheet = (type) => {
    const a = [["Mã nhóm DN", "Tên chuẩn hóa", "Quốc gia (chính)", "Châu lục", "Đông Nam Á", "Các quốc gia xuất hiện", "Số biến thể tên", "Biến thể tên (tối đa 10)", "Số dòng", "Tổng trị giá (USD, mọi năm)", "Độ tin cậy", "Cách gộp", "Trạng thái rà soát", "Cờ rủi ro"]];
    ents(type).slice().sort((x, y) => x.id.localeCompare(y.id)).forEach((e) => a.push([e.id, e.name, e.countryName, e.continent, e.isSEA ? "Có" : "Không", e.countriesAll.slice(0, 8).join(", "), e.nVariants, e.variants.slice(0, 10).map((v) => v.raw).join(" | "), e.rows, r2(e.value, 0), e.confidence, e.methods.join("; "), e.review, e.flags.join("; ")]));
    return a;
  };
  if (engine.entities.Purchaser) {
    addSheet(wb, used, "05_Từ điển DN mua", entSheet("Purchaser"), [10, 44, 16, 14, 10, 26, 10, 90, 10, 18, 12, 40, 22, 40]);
    addSheet(wb, used, "06_Từ điển DN bán", entSheet("Supplier"), [10, 44, 16, 14, 10, 26, 10, 90, 10, 18, 12, 40, 22, 40]);
    addSheet(wb, used, "07_Biến thể tên (sửa)", variantRows(engine), [10, 10, 44, 50, 16, 10, 16, 12, 22, 36, 40]);
    const ph = [["Loại", "Tên gốc", "Số dòng", "Trị giá (USD)", "Lý do"]];
    ["Purchaser", "Supplier"].forEach((t) => engine.entities[t].placeholder.list.slice(0, 3000).forEach((p) => ph.push([t === "Purchaser" ? "DN mua" : "DN bán", p.raw, p.count, r2(p.value, 0), p.reason])));
    addSheet(wb, used, "08_Placeholder", ph, [10, 50, 10, 16, 40]);
  }
  const xs = R.entity?.crossSource;
  if (xs?.enabled && xs.mapped) {
    const a = [["Nguồn bị đánh dấu ↔ Nguồn được giữ", "Số dòng", "Trị giá (USD)"]];
    xs.bySource.forEach((b) => a.push([b.pair, b.rows, r2(b.value, 0)]));
    a.push([]); a.push(["Năm", "Số dòng", "Trị giá (USD)"]);
    years.forEach((yr) => a.push([yr, xs.years[yr]?.rows ?? 0, r2(xs.years[yr]?.value ?? 0, 0)]));
    addSheet(wb, used, "09_Trùng nguồn", a, [50, 12, 18]);
  }

  // 10 — Top
  if (engine.rankings) {
    const metricLbl = engine.results.ranking?.metric === "volume" ? "Khối lượng (tấn)" : "Trị giá (USD)";
    const a = [["Năm", "Phạm vi", "Hạng", "Mã nhóm DN", "Tên chuẩn hóa", "Quốc gia", metricLbl, "Tỷ trọng", "Tỷ trọng lũy kế", "Số dòng"]];
    years.forEach((yr) => Object.values(engine.rankings.years[yr]).forEach((sc) => {
      const E = ents(sc.group);
      sc.list.filter((r) => r.top).forEach((r) => a.push([yr, sc.label, r.rank, E[r.e].id, E[r.e].name, r.country, r2(r.value, 2), r2(r.share, 6), r2(r.cum, 6), r.rows]));
    }));
    addSheet(wb, used, "10_Top DN", a, [8, 36, 7, 10, 46, 16, 16, 10, 12, 8]);
  }

  // 11 — Ngành
  if (R.industry && !R.industry._skipped) {
    const a = [["Chỉ tiêu", "Giá trị"], ["DN khớp ngành", R.industry.entitiesMatched], ["  khớp chính xác", R.industry.exact], ["  khớp gần đúng (tên lõi)", R.industry.loose], ["Dòng trong Industry Master", R.industry.masterEntries], ["Dòng master không dùng tới", R.industry.unusedEntries], ["Phạm vi gán", R.industry.scope === "top" ? "Chỉ dòng thuộc Top" : "Mọi dòng của DN"]];
    a.push([]); a.push(["Năm", "Dòng được gán ngành", "Tỷ trọng trị giá có ngành (%)"]);
    years.forEach((yr) => a.push([yr, R.industry.years[yr].rows, r2(R.industry.years[yr].valueShare * 100, 2)]));
    a.push([]); a.push(["DN thuộc Top CHƯA có ngành", "", "", "", ""]); a.push(["Mã nhóm", "Tên chuẩn hóa", "Quốc gia", "Trị giá các năm thuộc Top (USD)", "Các năm thuộc Top"]);
    R.industry.topMissing.forEach((m) => a.push([m.id, m.name, m.country, r2(m.value, 0), m.years]));
    const cf = engine.refs.industry.conflicts;
    if (cf.length) { a.push([]); a.push(["Xung đột trong Industry Master (cùng DN, khác ngành)", "", "", "", ""]); a.push(["Tên", "Quốc gia", "Trước", "Sau (được dùng)", "File / Sheet"]); cf.forEach((c) => a.push([c.name, c.country, c.before, c.after, `${c.file} / ${c.sheet}`])); }
    addSheet(wb, used, "11_Ngành", a, [34, 46, 18, 22, 22]);
  }

  // 12–13 — Từ khóa & phân loại
  if (R.classify) {
    const a = [["Phân khúc", "Từ khóa", "Số dòng khớp"]];
    (R.classify.keywordStats || []).forEach((k) => a.push([k.segment, k.keyword, k.rows]));
    if (engine.refs.keywords?.conflicts?.length) { a.push([]); a.push(["Từ khóa trùng ở nhiều phân khúc", "Các phân khúc", ""]); engine.refs.keywords.conflicts.forEach((c) => a.push([c.keyword, c.segments, ""])); }
    a.push([]); a.push(["MÔ TẢ CHƯA PHÂN LOẠI (nhiều trị giá nhất) — gợi ý bổ sung từ khóa", "Số dòng", "Trị giá (USD)"]);
    R.classify.unclassifiedTop.forEach((u) => a.push([u.desc, u.rows, r2(u.value, 0)]));
    addSheet(wb, used, "12_Từ khóa", a, [90, 28, 14]);
    const c = [["Năm", "Phân khúc cuối cùng", "Số dòng", "Trị giá (USD)"]];
    years.forEach((yr) => R.classify.years[yr].segments.forEach((s) => c.push([yr, s.segment, s.rows, r2(s.value, 0)])));
    c.push([]); c.push(["Năm", "Theo từ khóa", "Theo ngành (dự phòng)", "Chưa phân loại", "Ngoài phạm vi", "Hòa – cần rà soát", "Từ khóa khác ngành"]);
    years.forEach((yr) => { const v = R.classify.years[yr]; c.push([yr, v.keyword, v.industry, v.unclassified, v.outOfScope, v.ties, v.mismatch]); });
    addSheet(wb, used, "13_Phân loại", c, [10, 36, 12, 16, 14, 16, 16]);
  }

  // 14 — IQR
  if (R.iqr) {
    const a = [["Năm", "Phân khúc", "Số giá (n)", "Q1", "Trung vị", "Q3", "IQR", "Ngưỡng dưới", "Ngưỡng trên", "Ngoại lai", "Thấp bất thường", "Cao bất thường", "Ghi chú"]];
    years.forEach((yr) => Object.entries(R.iqr.years[yr]).forEach(([seg, v]) => a.push([yr, seg, v.n, r2(v.q1, 2), r2(v.median, 2), r2(v.q3, 2), r2(v.iqr, 4), r2(v.lower, 2), r2(v.upper, 2), v.outliers, v.outLow, v.outHigh, v.note])));
    a.push([]); a.push([`Hệ số k = ${R.iqr.k}; tối thiểu ${R.iqr.minN} giá/nhóm; ${R.iqr.useLog ? "tính trên log(giá)" : "tính trên giá gốc"}; tứ phân vị theo Excel QUARTILE.INC`]);
    addSheet(wb, used, "14_IQR", a, [8, 30, 10, 12, 12, 12, 12, 14, 14, 10, 12, 12, 50]);
  }

  // 15–16 — Chỉ số
  if (R.metrics) {
    const a = [["Năm", "Phân khúc", "Trước lọc: số dòng", "Trước lọc: trị giá (USD)", "Trước lọc: lượng (tấn)", "Trước lọc: giá BQ (USD/tấn)", "Sau lọc: số dòng", "Sau lọc: trị giá (USD)", "Sau lọc: lượng (tấn)", "Sau lọc: giá BQ (USD/tấn)", "Sau lọc: trung vị", "Sau lọc: P25", "Sau lọc: P75", "Tỷ trọng lượng", "Dòng bị loại"]];
    years.forEach((yr) => {
      const Y = R.metrics.years[yr];
      [...Y.rows, Y.total].forEach((r) => a.push([yr, r.segment, r.before.count, r2(r.before.value, 2), r2(r.before.qty, 3), r2(r.before.avgPrice, 2), r.after.count, r2(r.after.value, 2), r2(r.after.qty, 3), r2(r.after.avgPrice, 2), r2(r.after.median, 2), r2(r.after.p25, 2), r2(r.after.p75, 2), r2(r.qtyShare, 4), r.excluded]));
    });
    a.push([]); a.push([`Quy tắc loại ngoại lai: ${ruleLabel(R.metrics.rule)}`]);
    a.push(["Năm", "Lý do loại", "Số dòng"]);
    years.forEach((yr) => Object.entries(R.metrics.years[yr].reasons).forEach(([k, v]) => a.push([yr, k, v])));
    a.push([]); a.push(["Độ nhạy theo quy tắc (dòng trong phạm vi sản phẩm)", "", "", ""]);
    a.push(["Năm", "Quy tắc", "Dòng bị loại", "Giá BQ còn lại (USD/tấn)"]);
    years.forEach((yr) => Object.entries(R.metrics.years[yr].sensitivity || {}).forEach(([k, v]) => a.push([yr, ruleLabel(k), v.excluded, r2(v.avgPrice, 2)])));
    addSheet(wb, used, "15_Chỉ số phân khúc", a, [8, 30, 12, 16, 14, 14, 12, 16, 14, 14, 12, 12, 12, 10, 10]);
    const p = [["Phân khúc", ...years.flatMap((yr) => [`${yr} – Lượng (tấn)`, `${yr} – Trị giá (USD)`, `${yr} – Giá BQ (USD/tấn)`])]];
    R.metrics.segments.forEach((seg) => p.push([seg, ...years.flatMap((yr) => { const v = R.metrics.pivot[seg][yr]; return v ? [r2(v.qty, 2), r2(v.value, 0), r2(v.avgPrice, 2)] : [null, null, null]; })]));
    addSheet(wb, used, "16_Tổng hợp nhiều năm", p, [32, ...years.flatMap(() => [16, 16, 16])]);
  }

  // 17 — Từ điển cột
  const cd = [["Cột (tiếng Việt)", "Cột (tiếng Anh / mã)", "Tạo ở bước", "Cách tính / ý nghĩa"]];
  COLUMN_DEFS.forEach((c) => cd.push([c.vi, c.en, stepLabel(c.step), c.desc]));
  addSheet(wb, used, "17_Từ điển cột", cd, [34, 30, 26, 120]);

  // 18 — Cấu hình
  const cf = [["Tham số", "Giá trị", "Mặc định"]];
  Object.keys(DEFAULT_SETTINGS).forEach((k) => cf.push([SETTING_LABELS[k] || k, fmtSetting(S[k]), fmtSetting(DEFAULT_SETTINGS[k])]));
  if (engine.profile) {
    cf.push([]); cf.push(["Hồ sơ sản phẩm", engine.profile.name]);
    cf.push(["Sản phẩm · Mã HS", [engine.profile.product, (engine.profile.hsCodes || []).join(", ")].filter(Boolean).join(" · ")]);
    if (engine.profile.intent) cf.push(["Ý đồ phân khúc", engine.profile.intent]);
    cf.push(["Nguồn hồ sơ", engine.profile.origin === "library" ? "Thư viện chung" : engine.profile.origin === "local" ? "Lưu trên máy người dùng" : engine.profile.origin === "new" ? "Hồ sơ mới (chưa lưu)" : "File"]);
  }
  if (engine.refs.keywords) {
    cf.push([]); cf.push(["Bộ phân khúc", "Từ khóa", "Loại trừ riêng"]);
    engine.refs.keywords.segments.forEach((sg) => cf.push([sg.name, sg.include.join("; "), sg.exclude.join("; ")]));
    if (engine.refs.keywords.exclusions?.length) cf.push(["LOẠI TRỪ (ngoài phạm vi)", engine.refs.keywords.exclusions.join("; "), ""]);
  }
  cf.push([]); cf.push(["Ánh xạ cột", ...years]);
  SCHEMA_FIELDS.forEach((f) => cf.push([f.label, ...years.map((yr) => engine.schema.perYear[yr]?.[f.key] || "—")]));
  cf.push([]); cf.push(["Nguồn dữ liệu (file › sheet)", "Năm", "Số dòng"]);
  engine.sources.filter((s) => s.include).forEach((s) => cf.push([`${s.file} › ${s.sheet}`, s.year, s.nRows]));
  cf.push([]); cf.push(["File tham chiếu", "Loại", "Số dòng"]);
  if (engine.refs.keywords) cf.push([engine.refs.keywords.fileName, "Bộ từ khóa", engine.refs.keywords.segments.reduce((a, s) => a + s.include.length, 0)]);
  engine.refs.industry.files.forEach((f) => cf.push([f.name, "Industry Master", f.rows]));
  engine.refs.overrides.files.forEach((f) => cf.push([f.name, "Từ điển DN", f.rows]));
  addSheet(wb, used, "18_Cấu hình", cf, [44, 30, 30]);

  return { filename: `${safeFileName(S.projectName)}_ChemSeg_BaoCaoKiemToan_${today()}.xlsx`, buffer: writeBook(wb) };
}

const SETTING_LABELS = {
  projectName: "Tên dự án", valueTolerance: "Ngưỡng lệch giá trị (bước 5)", unitFactors: "Hệ số đơn vị do người dùng nhập (bước 6)",
  inferPackageWeight: "Suy luận khối lượng bao bì từ mô tả (bước 6)", priceSanityCheck: "Đánh dấu giá/tấn phi lý – nghi sai đơn vị (bước 6)",
  priceBandMin: "Giá hợp lý tối thiểu USD/t (bước 6; 0 = tự động)", priceBandMax: "Giá hợp lý tối đa USD/t (bước 6; 0 = tự động)",
  keywordFields: "Trường dùng để khớp từ khóa (bước 11)", segmentBasis: "Cách xác định phân khúc (bước 11)", supplierGroupByCountry: "Nhóm DN bán theo cả nước xuất xứ (bước 7)",
  fuzzyEnabled: "Gộp gần đúng ký tự (bước 7)", fuzzyThreshold: "Ngưỡng giống nhau tối thiểu (bước 7)", customPlaceholders: "Placeholder bổ sung (bước 7)",
  nameCase: "Kiểu chữ tên chuẩn hóa (bước 7)", detectCrossSource: "Phát hiện trùng giữa các nguồn (bước 7)", topThreshold: "Ngưỡng Top (bước 8)",
  rankingMetric: "Tiêu chí xếp hạng (bước 8)", excludeCrossSourceDup: "Loại dòng trùng nguồn khỏi xếp hạng/chỉ số (bước 8, 12, 13)",
  industryApplyScope: "Phạm vi gán ngành (bước 9)", keywordMatchMode: "Chế độ khớp từ khóa (bước 11)", iqrMinN: "Số giá tối thiểu mỗi nhóm IQR (bước 12)",
  iqrMultiplier: "Hệ số k của IQR (bước 12)", iqrLog: "Tính IQR trên log(giá) (bước 12)", outlierRule: "Quy tắc loại ngoại lai (bước 13)",
  excludeDuplicates: "Loại dòng trùng lặp hoàn toàn (bước 12–13)", headerLanguage: "Ngôn ngữ tiêu đề cột khi xuất", exportAfterSheet: "Xuất thêm sheet 'Sau lọc'",
  exportAllOriginalColumns: "Giữ mọi cột gốc trong file chi tiết",
};
function fmtSetting(v) { if (typeof v === "boolean") return v ? "Có" : "Không"; if (v && typeof v === "object") return JSON.stringify(v); return v; }
function stepLabel(id) { const s = STEPS.find((x) => x.id === id); return s ? `${s.no}. ${s.label}` : id; }
export function ruleLabel(r) { return r === "IQR" ? "Loại mọi ngoại lai IQR" : r === "OR" ? "Loại khi lệch giá trị HOẶC ngoại lai IQR" : "Chỉ loại khi VỪA lệch giá trị VỪA ngoại lai IQR"; }

function variantRows(engine) {
  const a = [["Loại", "Mã nhóm DN", "Tên chuẩn hóa hiện tại", "Tên gốc (biến thể)", "Quốc gia", "Số dòng", "Trị giá (USD)", "Độ tin cậy", "Trạng thái rà soát", "Cờ rủi ro", "Tên chuẩn hóa (sửa)"]];
  for (const t of ["Purchaser", "Supplier"]) {
    const E = engine.entities[t]?.entities || [];
    E.slice().sort((x, y) => (x.review === y.review ? x.id.localeCompare(y.id) : x.review === "Cần rà soát" ? -1 : 1)).forEach((e) => e.variants.forEach((v) => a.push([t === "Purchaser" ? "DN mua" : "DN bán", e.id, e.name, v.raw, e.countryName, v.count, r2(v.value, 0), e.confidence, e.review, e.flags.join("; "), null])));
  }
  return a;
}

export function buildEntityReviewWorkbook(engine) {
  const wb = XLSX.utils.book_new(); const used = new Set();
  addSheet(wb, used, "Biến thể tên DN", variantRows(engine), [10, 10, 44, 50, 16, 10, 16, 12, 22, 36, 40]);
  addSheet(wb, used, "Hướng dẫn", [
    ["CÁCH DÙNG FILE NÀY"],
    ["1. Lọc cột \"Trạng thái rà soát\" = \"Cần rà soát\" để xem các nhóm gộp gần đúng hoặc có cờ rủi ro."],
    ["2. Nếu một biến thể bị gộp SAI: điền tên đúng vào cột \"Tên chuẩn hóa (sửa)\" (tên mới ⇒ tách thành DN riêng)."],
    ["3. Nếu hai nhóm khác nhau thực ra là MỘT DN: điền CÙNG một tên vào \"Tên chuẩn hóa (sửa)\" cho các biến thể của cả hai nhóm."],
    ["4. Nếu tên thực chất là \"không xác định\" (đại lý, ngân hàng, TO ORDER…): điền #LOAI."],
    ["5. Lưu file, quay lại bước 7 → \"Tải từ điển DN\" → chạy lại bước 7. Chỉ các dòng có điền \"Tên chuẩn hóa (sửa)\" mới được dùng."],
    ["6. Có thể giữ file này để dùng lại cho các dự án/các lần cập nhật dữ liệu sau."],
  ], [140]);
  return { filename: `${safeFileName(engine.settings.projectName)}_RaSoat_TenDN_${today()}.xlsx`, buffer: writeBook(wb) };
}

/* ═════════ DỮ LIỆU CHI TIẾT TỪNG NĂM ═════════ */
export function buildDetailWorkbook(engine, year) {
  const y = engine.years.find((x) => x.year === year);
  if (!y) throw new Error("Không có năm " + year);
  const S = engine.settings, lang = S.headerLanguage;
  const mappedHeaders = SCHEMA_FIELDS.map((f) => (y.map[f.key] >= 0 ? y.headers[y.map[f.key]] : null)).filter(Boolean);
  const origIdx = [];
  mappedHeaders.forEach((h) => origIdx.push(y.headers.indexOf(h)));
  if (S.exportAllOriginalColumns) y.headers.forEach((h, j) => { if (!origIdx.includes(j)) origIdx.push(j); });
  const comp = DETAIL_COMPUTED_ORDER.filter((k) => k === "_Source_File" || k === "_Source_Sheet" || k === "_Source_Row" || y.cols[k]);
  const header = [...origIdx.map((j) => y.headers[j]), ...comp.map((k) => headerLabel(k, lang))];
  const cell = (k, i) => {
    if (k === "_Source_File") return y.srcNames[y.srcIdx[i]].file;
    if (k === "_Source_Sheet") return y.srcNames[y.srcIdx[i]].sheet;
    if (k === "_Source_Row") return y.rowNum[i];
    const c = y.cols[k];
    const v = c[i];
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return v === "" ? null : v;
  };
  const buildRows = (filter) => {
    const aoa = [header];
    for (let i = 0; i < y.n; i++) {
      if (filter && !filter(i)) continue;
      const r = y.rows[i];
      const out = new Array(header.length);
      for (let j = 0; j < origIdx.length; j++) out[j] = r[origIdx[j]];
      for (let j = 0; j < comp.length; j++) out[origIdx.length + j] = cell(comp[j], i);
      aoa.push(out);
    }
    return aoa;
  };
  const wb = XLSX.utils.book_new(); const used = new Set();
  const widths = header.map((h) => Math.min(40, Math.max(10, String(h).length + 2)));
  const MAX = 1048000;
  const all = buildRows(null);
  splitAppend(wb, used, `${year}_Chi tiết`, all, widths, MAX);
  if (S.exportAfterSheet && y.cols.Final_Included) {
    const after = buildRows((i) => y.cols.Final_Included[i] === "Có");
    splitAppend(wb, used, `${year}_Sau lọc`, after, widths, MAX);
  }
  return { filename: `${safeFileName(S.projectName)}_ChemSeg_ChiTiet_${year}_${today()}.xlsx`, buffer: writeBook(wb) };
}
function splitAppend(wb, used, name, aoa, widths, max) {
  if (aoa.length - 1 <= max) { addSheet(wb, used, name, aoa, widths); return; }
  const h = aoa[0];
  for (let k = 1, part = 1; k < aoa.length; k += max, part++) addSheet(wb, used, `${name}_${part}`, [h, ...aoa.slice(k, k + max)], widths);
}

/* ═════════ FILE NGHIÊN CỨU TOP DN ═════════ */
const RESEARCH_KINDS = {
  P_ALL: { file: "Top_NhapKhau_ToanCau", match: (id) => id === "P_ALL" },
  P_VN: { file: "Top_NhapKhau_VietNam", match: (id) => id === "P_VN" },
  P_CONT: { file: "Top_NhapKhau_TheoChauLuc", match: (id) => id.startsWith("P_CONT:") },
  S_ALL: { file: "Top_XuatKhau_ToanCau", match: (id) => id === "S_ALL" },
  S_VN: { file: "Top_XuatKhau_VaoVietNam", match: (id) => id === "S_VN" },
  S_CONT: { file: "Top_XuatKhau_TheoChauLuc", match: (id) => id.startsWith("S_CONT:") },
};

export function buildResearchWorkbook(engine, kind) {
  const K = RESEARCH_KINDS[kind];
  if (!K || !engine.rankings) throw new Error("Chưa có kết quả xếp hạng.");
  const S = engine.settings, en = S.headerLanguage === "en";
  const isP = kind.startsWith("P");
  const E = engine.entities[isP ? "Purchaser" : "Supplier"].entities;
  const match = isP ? engine.industryMatch : null;
  const vol = engine.results.ranking?.metric === "volume";
  const H = en
    ? ["Year", "Scope", "Rank", "Entity_ID", isP ? "Purchaser_Standardize" : "Supplier_Standardize", "Raw_Name_Samples", isP ? "Purchasing Country" : "Country of Origin", "Continent", "Is_Southeast_Asia", vol ? "Company_Volume_MT" : "Company_Value_USD", "Scope_Total", "Share", "Cumulative_Share", "Rows", "Confidence", "Review_Status", "Industry", "Industry Segment"]
    : ["Năm", "Phạm vi", "Hạng", "Mã nhóm DN", "Tên chuẩn hóa", "Biến thể tên (mẫu)", isP ? "Quốc gia" : "Nước xuất xứ", "Châu lục", "Đông Nam Á", vol ? "Khối lượng năm (tấn)" : "Trị giá năm (USD)", "Tổng phạm vi", "Tỷ trọng", "Tỷ trọng lũy kế", "Số dòng", "Độ tin cậy", "Trạng thái rà soát", "Ngành", "Phân khúc ngành"];
  const wb = XLSX.utils.book_new(); const used = new Set();
  engine.years.forEach((y) => {
    const aoa = [H];
    Object.values(engine.rankings.years[y.year]).filter((sc) => K.match(sc.id)).forEach((sc) => {
      sc.list.filter((r) => r.top).forEach((r) => {
        const e = E[r.e];
        const m = match?.[r.e];
        aoa.push([y.year, sc.label, r.rank, e.id, e.name, e.variants.slice(0, 5).map((v) => v.raw).join(" | "), r.country || e.countryName, e.continent, e.isSEA ? "Có" : "Không", r2(r.value, 2), r2(sc.total, 2), r2(r.share, 6), r2(r.cum, 6), r.rows, e.confidence, e.review, m?.e.industry ?? null, m?.e.segment ?? null]);
      });
    });
    if (aoa.length > 1) addSheet(wb, used, `${y.year}`, aoa, [7, 34, 7, 10, 46, 70, 16, 14, 10, 16, 16, 10, 12, 8, 12, 20, 26, 26]);
  });
  if (!wb.SheetNames.length) addSheet(wb, used, "Trống", [["Không có DN nào trong phạm vi này."]], [60]);
  return { filename: `${safeFileName(S.projectName)}_${K.file}_${Math.round(engine.rankings.threshold * 100)}pct_${today()}.xlsx`, buffer: writeBook(wb) };
}

/** Danh sách DN mua cần nghiên cứu ngành — gộp mọi năm, mỗi DN một dòng (điền 2 cột cuối rồi tải lại ở bước 9). */
export function buildResearchMasterWorkbook(engine) {
  if (!engine.rankings) throw new Error("Chưa có kết quả xếp hạng.");
  const S = engine.settings, en = S.headerLanguage === "en";
  const E = engine.entities.Purchaser.entities;
  const years = engine.years.map((y) => y.year);
  const map = new Map();
  years.forEach((yr) => ["P_ALL", "P_VN"].forEach((sid) => engine.rankings.years[yr][sid]?.list.forEach((r) => {
    if (!r.top) return;
    const m = map.get(r.e) || { e: r.e, val: {}, scopes: new Set() };
    if (sid === "P_ALL" || m.val[yr] === undefined) m.val[yr] = sid === "P_ALL" ? r.value : (m.val[yr] ?? r.value);
    m.scopes.add(sid === "P_ALL" ? "Toàn cầu" : "Việt Nam"); map.set(r.e, m);
  })));
  // giá trị theo năm lấy từ phạm vi toàn cầu (đầy đủ hơn)
  years.forEach((yr) => engine.rankings.years[yr].P_ALL.list.forEach((r) => { const m = map.get(r.e); if (m) m.val[yr] = r.value; }));
  const rows = [...map.values()].map((m) => ({ ...m, total: Object.values(m.val).reduce((a, v) => a + v, 0) })).sort((a, b) => b.total - a.total);
  const H = en
    ? ["Entity_ID", "Purchaser_Standardize", "Purchasing Country", "Continent", "Top_Scopes", ...years.map((y) => `Value_${y}`), "Total_Value", "Raw_Name_Samples", "Confidence", "Review_Status", "Industry", "Industry Segment"]
    : ["Mã nhóm DN", "Tên chuẩn hóa", "Quốc gia", "Châu lục", "Thuộc Top phạm vi", ...years.map((y) => `Trị giá ${y}`), "Tổng trị giá", "Biến thể tên (mẫu)", "Độ tin cậy", "Trạng thái rà soát", "Ngành", "Phân khúc ngành"];
  const aoa = [H];
  rows.forEach((m) => {
    const e = E[m.e]; const mm = engine.industryMatch?.[m.e];
    aoa.push([e.id, e.name, e.countryName, e.continent, [...m.scopes].join(", "), ...years.map((yr) => r2(m.val[yr], 2)), r2(m.total, 2), e.variants.slice(0, 6).map((v) => v.raw).join(" | "), e.confidence, e.review, mm?.e.industry ?? null, mm?.e.segment ?? null]);
  });
  const wb = XLSX.utils.book_new(); const used = new Set();
  addSheet(wb, used, en ? "Industry_Research" : "DN cần nghiên cứu ngành", aoa, [10, 46, 16, 14, 18, ...years.map(() => 14), 16, 70, 12, 20, 28, 28]);
  addSheet(wb, used, "Hướng dẫn", [
    ["CÁCH DÙNG"], ["1. Mỗi dòng là một DN mua thuộc Top (toàn cầu hoặc Việt Nam) ở ít nhất một năm — chỉ cần nghiên cứu MỘT LẦN cho mọi năm."],
    ["2. Điền cột \"Ngành\" và \"Phân khúc ngành\". \"Phân khúc ngành\" nên trùng tên với cột phân khúc trong bộ từ khóa để dùng làm phương án dự phòng khi phân loại."],
    ["3. DN đã có ngành từ Industry Master trước đó được điền sẵn — chỉ cần bổ sung ô trống."],
    ["4. Lưu file và tải lên ở bước 9 \"Gán ngành\". Có thể tải nhiều file; file tải sau ghi đè thông tin trùng."],
  ], [140]);
  return { filename: `${safeFileName(S.projectName)}_DN_Can_Nghien_Cuu_Nganh_${today()}.xlsx`, buffer: writeBook(wb) };
}

/* ═════════ FILE MẪU ═════════ */
export function buildTemplate(kind) {
  const wb = XLSX.utils.book_new(); const used = new Set();
  if (kind === "keywords") {
    addSheet(wb, used, "Keyword_Matrix", [
      ["STT", "Phân bón", "Công nghiệp", "Dược phẩm & Thực phẩm", "Thức ăn chăn nuôi", "LOẠI TRỪ"],
      [1, "FERTILIZER", "INDUSTRIAL", "PHARMA*", "FEED GRADE", "BENZYL"],
      [2, "PHAN BON", "TECHNICAL GRADE", "FOOD GRADE", "ANIMAL", "QUATERNARY"],
      [3, "AGRICULTURAL", "GALVANIZ*", "USP", "THUC AN CHAN NUOI", "ZINC CHLORIDE"],
      [4, "GRANULAR", "BATTERY", "BP", "LIVESTOCK", "SODIUM CHLORIDE"],
      [5, "-FEED GRADE", "PLATING", "-FEED", null, null],
    ], [6, 22, 22, 26, 22, 22]);
    addSheet(wb, used, "Hướng dẫn", [
      ["QUY ƯỚC BỘ TỪ KHÓA"],
      ["• Mỗi cột = một phân khúc (tên cột = tên phân khúc). Từ khóa liệt kê bên dưới, mỗi ô một từ khóa (hoặc nhiều từ khóa ngăn bằng dấu ;)."],
      ["• Không phân biệt hoa/thường, có dấu/không dấu. Mặc định khớp theo TỪ NGUYÊN VẸN: \"UREA\" không khớp \"THIOUREA\"."],
      ["• Thêm * ở cuối để khớp tiền tố: \"GALVANIZ*\" khớp GALVANIZING, GALVANIZED…"],
      ["• Thêm - ở đầu để tạo từ khóa loại trừ riêng của phân khúc: \"-FEED GRADE\" trong cột Phân bón ⇒ mô tả có FEED GRADE không được xếp vào Phân bón."],
      ["• Cột tên \"LOẠI TRỪ\" (hoặc NGOÀI PHẠM VI / EXCLUDE): mô tả chứa các từ này bị gắn \"Ngoài phạm vi sản phẩm\" và bị loại khỏi chỉ số giá."],
      ["• Một mô tả khớp nhiều phân khúc ⇒ chọn phân khúc có NHIỀU từ khóa khớp nhất; hòa ⇒ chọn từ khóa dài/cụ thể hơn; hòa nữa ⇒ theo thứ tự cột (đánh dấu cần rà soát)."],
      ["• Cột STT/No/# bị bỏ qua."],
    ], [150]);
    return { filename: "Mau_Bo_Tu_Khoa.xlsx", buffer: writeBook(wb) };
  }
  if (kind === "industry") {
    addSheet(wb, used, "Industry_Master", [
      ["Tên chuẩn hóa", "Quốc gia", "Ngành", "Phân khúc ngành"],
      ["Gia Vu Fertilizer Company Limited", "Vietnam", "Phân bón", "Phân bón"],
      ["PT Asia Kimindo Prima", "Indonesia", "Hóa chất – phân phối", "Công nghiệp"],
    ], [44, 18, 28, 28]);
    addSheet(wb, used, "Hướng dẫn", [
      ["• Bắt buộc: Tên DN + Phân khúc ngành. Nên có Quốc gia (để phân biệt DN trùng tên ở các nước)."],
      ["• Chấp nhận cả tiêu đề tiếng Anh của V17: Purchaser_Standardize | Purchasing Country | Industry | Industry Segment."],
      ["• Tên không cần viết giống hệt — công cụ so khớp theo tên lõi (bỏ hậu tố pháp lý, không phân biệt Việt/Anh)."],
      ["• Có thể tải nhiều file và nhiều sheet; dòng sau ghi đè dòng trước nếu cùng DN + quốc gia."],
    ], [150]);
    return { filename: "Mau_Industry_Master.xlsx", buffer: writeBook(wb) };
  }
  if (kind === "overrides") {
    addSheet(wb, used, "Tu_dien_DN", [
      ["Loại", "Tên gốc (biến thể)", "Quốc gia", "Tên chuẩn hóa (sửa)"],
      ["DN mua", "CONG TY TNHH THUONG MAI THUY NGAN", "Vietnam", "Thuy Ngan Trading Co., Ltd."],
      ["DN mua", "THUY NGAN CO.,LTD.", "Vietnam", "Thuy Ngan Trading Co., Ltd."],
      ["DN bán", "SINOTRANS CHANGJIANG COMPANY LIMITED", "", "#LOAI"],
    ], [10, 50, 16, 40]);
    addSheet(wb, used, "Hướng dẫn", [
      ["• Bắt buộc: Tên gốc + Tên chuẩn hóa (sửa). Loại (DN mua/DN bán) và Quốc gia là tùy chọn (bỏ trống = áp dụng cho mọi trường hợp)."],
      ["• Các biến thể có cùng \"Tên chuẩn hóa (sửa)\" sẽ được gộp thành MỘT DN, độ tin cậy = Đã xác nhận."],
      ["• Điền #LOAI để coi tên đó là không xác định (ví dụ: hãng tàu, forwarder, ngân hàng)."],
      ["• Cách nhanh nhất: xuất file \"Rà soát tên DN\" ở bước 7, điền cột cuối, tải lại."],
    ], [150]);
    return { filename: "Mau_Tu_Dien_DN.xlsx", buffer: writeBook(wb) };
  }
  if (kind === "input") {
    const h = ["Data Source", "Date", "HS CODE", "Product Description", "Supplier", "Purchaser", "Country of Origin", "Purchasing Country", "Total Value ($)", "Unit Price ($)", "Quantity", "Unit"];
    addSheet(wb, used, "2024", [h, ["Vietnam", "2024-03-01", "28271000", "AMMONIUM CHLORIDE FERTILIZER (NH4CL) N 25% MIN, 50KG/BAG", "SUNSHINE SHARE CO., LIMITED", "CONG TY TNHH THUONG MAI THUY NGAN", "CHINA", "VIETNAM", 45000, 150, 300, "TNE"]], h.map(() => 18));
    addSheet(wb, used, "Hướng dẫn", [
      ["• Mỗi năm một sheet, tên sheet chứa năm (2023, 2024_Data, Data2024…) — hoặc mỗi năm một file có năm trong tên file."],
      ["• Dòng tiêu đề có thể không nằm ở dòng 1 — công cụ tự dò."],
      ["• Bắt buộc 8 trường: Mô tả hàng hóa, Nhà cung cấp, Người mua, Nước xuất xứ, Nước nhập khẩu, Đơn giá, Trị giá, Lượng, Đơn vị tính."],
      ["• Tùy chọn: Nguồn dữ liệu (để phát hiện trùng giữa các nguồn), Mã HS, Ngày."],
    ], [150]);
    return { filename: "Mau_Du_Lieu_Dau_Vao.xlsx", buffer: writeBook(wb) };
  }
  throw new Error("Không có mẫu " + kind);
}

/* ═════════ CẤU HÌNH DỰ ÁN (.json) ═════════ */
/* ═════════ HỒ SƠ SẢN PHẨM (file JSON) ═════════ */
export function exportProject(engine, meta = {}, opts = {}) {
  const p = profileFromEngine(engine, meta, opts);
  const buf = new TextEncoder().encode(JSON.stringify(p, null, 2));
  return { filename: `HoSo_${safeFileName(p.name).slice(0, 50)}_${today()}.json`, buffer: buf.buffer, profile: p };
}

export function importProject(engine, buffer) {
  let data;
  try { data = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer))); } catch { throw new Error("File không đọc được (không phải JSON hợp lệ)."); }
  const p = normalizeProfile(data, { origin: "file" });
  const r = applyProfile(engine, p);
  return { ok: true, profile: p, ...r };
}

/** Xuất bộ phân khúc hiện tại ra Excel (định dạng ma trận — tải lại được ở bước 10). */
export function buildKeywordWorkbook(engine, def) {
  const kw = def || engine.getKeywords();
  if (!kw || !kw.segments?.length) throw new Error("Chưa có bộ phân khúc để xuất.");
  const cols = kw.segments.map((s) => ({ name: s.name, items: [...s.include, ...s.exclude.map((x) => "-" + x)] }));
  if (kw.exclusions?.length) cols.push({ name: "LOẠI TRỪ", items: kw.exclusions });
  const maxLen = Math.max(1, ...cols.map((c) => c.items.length));
  const aoa = [["STT", ...cols.map((c) => c.name)]];
  for (let i = 0; i < maxLen; i++) aoa.push([i + 1, ...cols.map((c) => c.items[i] ?? null)]);
  const wb = XLSX.utils.book_new(); const used = new Set();
  addSheet(wb, used, "Keyword_Matrix", aoa, [6, ...cols.map(() => 28)]);
  const name = engine.profile?.name || engine.settings.projectName;
  return { filename: `BoTuKhoa_${safeFileName(name).slice(0, 50)}_${today()}.xlsx`, buffer: writeBook(wb) };
}
