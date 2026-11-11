/* ═══════════════════════════════════════════════════════════════
   BƯỚC 15 — RÀ SOÁT DỮ LIỆU SAU XỬ LÝ
   Hướng dẫn nhóm nghiên cứu rà soát bộ dữ liệu đã xử lý: trường hợp nào loại khỏi database,
   trường hợp nào giữ nhưng không dùng cho phân tích giá/lượng, cặp cột nào cần đối chiếu chéo.
   Mỗi trường hợp có hàm nhận diện trên từng dòng ⇒ thống kê số dòng/trị giá và xuất tệp rà soát.
   ═══════════════════════════════════════════════════════════════ */
import { LABELS } from "./constants.js";
import { OUT_OF_SCOPE, UNCLASSIFIED, US, IQ } from "./steps/price.js";
import { VC } from "./steps/prep.js";
import { SEG_CONSIST } from "./steps/classify.js";
import { normText } from "./text.js";

/** Ba mức xử lý. */
export const REVIEW_TIERS = {
  DROP: { id: "DROP", label: "Loại khỏi database", tone: "bad", desc: "Không thuộc thị trường cần phân tích hoặc là bản ghi lặp. Xóa khỏi bộ dữ liệu dùng cho báo cáo (tệp gốc vẫn giữ để truy vết)." },
  PARTIAL: { id: "PARTIAL", label: "Giữ, không dùng cho giá & lượng", tone: "warn", desc: "Giao dịch có thật nhưng lượng hoặc giá không tin cậy. Vẫn tính vào số giao dịch, danh sách doanh nghiệp, trị giá (nếu có); không dùng cho giá bình quân và tổng lượng." },
  NOTE: { id: "NOTE", label: "Giữ, ghi chú hoặc rà soát thêm", tone: "info", desc: "Dữ liệu dùng được. Chỉ cần xác minh thông tin hoặc ghi chú hạn chế trong báo cáo." },
};

/** Cách công cụ xử lý trường hợp đó. */
export const REVIEW_MODE = { AUTO: "Công cụ đã tự loại", RULE: "Theo quy tắc đã chọn", DECIDE: "Nhóm cần quyết định", NOTE: "Chỉ ghi chú" };

const ACC = (y, k) => y.cols[k];
const T = (v) => (v === null || v === undefined ? "" : String(v));

/** Danh sách trường hợp — thứ tự = thứ tự ưu tiên rà soát. */
export const REVIEW_CASES = [
  {
    id: "R01", tier: "DROP", mode: "AUTO", short: "Ngoai pham vi",
    title: "Hàng ngoài phạm vi sản phẩm",
    filter: "Phân khúc cuối cùng = “Ngoài phạm vi sản phẩm”",
    check: "Mô tả hàng hóa · Chi tiết từ khóa khớp · Mã HS",
    action: "Đọc nhanh mô tả để chắc từ khóa LOẠI TRỪ không bắt nhầm. Đúng là hàng khác ⇒ loại. Bắt nhầm ⇒ sửa danh sách LOẠI TRỪ ở bước 10 rồi chạy lại.",
    test: (c, i) => c.FS?.[i] === OUT_OF_SCOPE,
  },
  {
    id: "R02", tier: "DROP", mode: "DECIDE", short: "Ma HS ngoai ho so",
    title: "Mã HS ngoài danh sách mã HS của hồ sơ",
    filter: "Cột Mã HS không bắt đầu bằng mã HS đã khai trong hồ sơ sản phẩm",
    check: "Mã HS · Mô tả hàng hóa · Phân khúc cuối cùng",
    action: "Mã HS của mặt hàng khác ⇒ loại. Là mã HS hợp lệ của sản phẩm (mã mới, mã chi tiết hơn) ⇒ bổ sung vào hồ sơ để lần sau không bị đánh dấu.",
    test: (c, i) => {
      if (!c.hsList.length || !c.hsRaw) return false;
      const h = T(c.hsRaw(i)).replace(/\D/g, "");
      return !!h && !c.hsList.some((p) => h.startsWith(p));
    },
  },
  {
    id: "R03", tier: "DROP", mode: "AUTO", short: "Trung nguon",
    title: "Giao dịch trùng giữa các nguồn",
    filter: "Nghi trùng giữa các nguồn ≠ trống",
    check: "Nguồn dữ liệu · Ngày · Mã nhóm doanh nghiệp mua/bán · Lượng (tấn) · Trị giá — so với dòng được giữ ghi trong cột",
    action: "Mở dòng được giữ để so. Cùng một lô hàng ⇒ loại dòng bị đánh dấu. Nếu một nguồn phụ trùng gần hết với nguồn chính ⇒ cân nhắc bỏ hẳn nguồn phụ.",
    test: (c, i) => !!c.XD?.[i],
  },
  {
    id: "R04", tier: "DROP", mode: "DECIDE", short: "Trung lap",
    title: "Dòng trùng lặp hoàn toàn",
    filter: "Dòng trùng lặp = “Trùng lặp”",
    check: "Mọi cột gốc · Nguồn dữ liệu · Ngày",
    action: "Giống hệt một dòng trước trên mọi cột ⇒ thường là nhập trùng ⇒ loại. Giữ nếu nguồn ghi mỗi dòng hàng của cùng tờ khai thành một dòng giống nhau.",
    test: (c, i) => !!c.DUP?.[i],
  },
  {
    id: "R05", tier: "DROP", mode: "DECIDE", short: "Xuat xu = nhap khau",
    title: "Nước xuất xứ trùng nước nhập khẩu",
    filter: "Doanh nghiệp mua - Quốc gia (chuẩn hóa) = Doanh nghiệp bán - Quốc gia (chuẩn hóa)",
    check: "Nước xuất xứ · Nước nhập khẩu · Nguồn dữ liệu · Mô tả hàng hóa",
    action: "Có thể là hàng tái nhập, hàng sản xuất trong nước hoặc ghi nhầm cột. Không phải giao dịch xuất nhập khẩu ⇒ loại; ghi nhầm cột ⇒ giữ và ghi chú.",
    test: (c, i) => { const a = T(c.PC?.[i]), b = T(c.SC?.[i]); return !!a && a === b && !c.unknownCountry.has(a); },
  },
  {
    id: "R06", tier: "PARTIAL", mode: "AUTO", short: "Gia phi ly",
    title: "Giá/tấn phi lý — nghi sai đơn vị",
    filter: "Kiểm tra giá/tấn ≠ trống",
    check: "Đơn vị gốc · Lượng (sạch) · Hệ số quy đổi · Lượng (tấn) · Đơn giá (USD/tấn) · Đơn giá gốc quy đổi (USD/tấn) · Mô tả hàng hóa",
    action: "Xác định được đơn vị đúng (vd “TNE” thực chất là kg) ⇒ sửa hệ số ở bước 6 rồi chạy lại. Không xác định được ⇒ giữ dòng cho trị giá, không dùng cho giá & lượng.",
    test: (c, i) => !!c.PS?.[i],
  },
  {
    id: "R07", tier: "PARTIAL", mode: "AUTO", short: "Khong quy doi tan",
    title: "Không quy đổi được về tấn",
    filter: "Trạng thái quy đổi = Mơ hồ / Chưa có hệ số / Không phải khối lượng / Thiếu đơn vị / Thiếu lượng / Người dùng loại",
    check: "Đơn vị gốc · Trạng thái quy đổi · Mô tả hàng hóa (quy cách bao bì)",
    action: "Biết quy cách ⇒ đặt hệ số ở bước 6 (TON = 1 hay 0,907; BAG = 0,05…). Không xác định được ⇒ dòng chỉ dùng cho trị giá và số giao dịch.",
    test: (c, i) => c.noTon.has(c.UST?.[i]),
  },
  {
    id: "R08", tier: "PARTIAL", mode: "AUTO", short: "Thieu tri gia",
    title: "Thiếu trị giá",
    filter: "Trị giá (sạch) trống",
    check: "Nguồn dữ liệu · Trị giá gốc · Đơn giá gốc",
    action: "Thường là nguồn vận đơn không ghi trị giá ⇒ giữ cho số giao dịch và lượng; không vào xếp hạng theo trị giá và giá bình quân. Muốn xếp hạng các nguồn này ⇒ dùng tiêu chí Khối lượng (tấn) ở bước 8.",
    test: (c, i) => c.TV && !(c.TV[i] > 0),
  },
  {
    id: "R09", tier: "PARTIAL", mode: "DECIDE", short: "Lech gia tri",
    title: "Đơn giá × Lượng lệch Trị giá vượt ngưỡng",
    filter: "Đối chiếu giá trị = “Lệch vượt ngưỡng”",
    check: "Đơn giá gốc quy đổi (USD/tấn) ↔ Đơn giá (USD/tấn) ↔ khoảng giá hợp lý · Đơn vị gốc · Lượng (sạch)",
    action: "Đơn giá (USD/tấn) nằm trong khoảng giá hợp lý ⇒ cột Đơn giá gốc sai (vd ghi theo nội tệ) ⇒ giữ. Nằm ngoài khoảng ⇒ lượng hoặc đơn vị sai ⇒ không dùng cho giá & lượng.",
    test: (c, i) => c.VCK?.[i] === VC.BAD,
  },
  {
    id: "R10", tier: "PARTIAL", mode: "RULE", short: "Ngoai lai IQR",
    title: "Giá trị ngoại lai IQR",
    filter: "Ngoại lai IQR = “Ngoại lai IQR”",
    check: "Đơn giá (USD/tấn) · Ngưỡng dưới/trên IQR · Phân khúc cuối cùng · Mô tả hàng hóa",
    action: "Loại hay giữ theo quy tắc ở bước 13. Mô tả cho thấy hàng cấp khác (tinh khiết, đóng gói nhỏ) ⇒ cân nhắc chuyển phân khúc thay vì loại.",
    test: (c, i) => c.IQR?.[i] === IQ.OUT,
  },
  {
    id: "R11", tier: "NOTE", mode: "NOTE", short: "DN mua khong xac dinh",
    title: "Doanh nghiệp mua không xác định",
    filter: "Doanh nghiệp mua - Tên chuẩn hóa = “[Không xác định]”",
    check: "Người mua (cột gốc) · Nguồn dữ liệu",
    action: "Giữ cho tổng thị trường; không có trong xếp hạng doanh nghiệp. Tỷ trọng trị giá > 10% ⇒ ghi chú hạn chế trong báo cáo.",
    test: (c, i) => c.PSTD?.[i] === LABELS.UNIDENTIFIED,
  },
  {
    id: "R12", tier: "NOTE", mode: "DECIDE", short: "Nghi forwarder",
    title: "Người mua có thể là đơn vị giao nhận",
    filter: "Doanh nghiệp mua - Cờ rủi ro chứa “logistics/giao nhận”",
    check: "Doanh nghiệp mua - Tên chuẩn hóa · Người mua (cột gốc)",
    action: "Xác minh. Đúng là forwarder, hãng tàu ⇒ điền #LOAI trong tệp rà soát tên doanh nghiệp (bước 4) để bỏ khỏi xếp hạng — không xóa dòng.",
    test: (c, i) => /logistics|giao nhận/i.test(T(c.PRISK?.[i])),
  },
  {
    id: "R13", tier: "NOTE", mode: "DECIDE", short: "Gop ten can ra soat",
    title: "Gộp tên cần rà soát (doanh nghiệp thuộc Top)",
    filter: "Doanh nghiệp mua - Trạng thái rà soát = “Cần rà soát” và thuộc Top",
    check: "Người mua (cột gốc) ↔ Doanh nghiệp mua - Tên chuẩn hóa · Cách gộp · Độ tin cậy",
    action: "Gộp sai ⇒ sửa trong tệp rà soát tên doanh nghiệp (bước 4) rồi chạy lại. Gộp đúng ⇒ điền cùng tên để lần sau thành “Đã xác nhận”.",
    test: (c, i) => c.PREV?.[i] === LABELS.REVIEW.REVIEW && /Thuộc Top/.test(T(c.PTOP?.[i])),
  },
  {
    id: "R14", tier: "NOTE", mode: "DECIDE", short: "Tu khoa vs nganh",
    title: "Phân khúc theo từ khóa khác phân khúc theo ngành",
    filter: "Đối chiếu từ khóa – ngành = “Khác nhau (nên rà soát)”",
    check: "Mô tả hàng hóa · Phân khúc từ khóa · Phân khúc ngành · Phân khúc cuối cùng",
    action: "Quyết định theo ý đồ phân khúc (bước 11): hàng hóa ghi rõ mục đích ⇒ theo từ khóa; mô tả chung chung ⇒ theo ngành của doanh nghiệp mua.",
    test: (c, i) => c.SCON?.[i] === SEG_CONSIST.DIFF,
  },
  {
    id: "R15", tier: "NOTE", mode: "NOTE", short: "Chua phan loai",
    title: "Chưa phân loại phân khúc",
    filter: "Phân khúc cuối cùng = “Chưa phân loại”",
    check: "Mô tả hàng hóa · Ngành của doanh nghiệp mua",
    action: "Giữ. Mô tả có thông tin ⇒ bổ sung từ khóa ở bước 10; còn lại ghi tỷ trọng chưa phân loại trong báo cáo.",
    test: (c, i) => c.FS?.[i] === UNCLASSIFIED,
  },
  {
    id: "R16", tier: "NOTE", mode: "DECIDE", short: "Ngay khac nam",
    title: "Ngày giao dịch khác năm của trang tính",
    filter: "Năm của Ngày (chuẩn hóa) ≠ năm của trang tính",
    check: "Ngày (chuẩn hóa) · Nguồn - Tên trang tính",
    action: "Vài dòng sát giao thừa ⇒ giữ. Nhiều dòng ⇒ quay lại bước 1, chọn “Tách theo cột Ngày” để mỗi dòng vào đúng năm.",
    test: (c, i) => { const d = c.D?.[i]; return d instanceof Date && String(d.getUTCFullYear()) !== c.year; },
  },
];

/** Các cặp cột cần đối chiếu chéo sau khi xử lý. */
export const CROSS_CHECKS = [
  { a: "Đơn giá (sạch) × Lượng (sạch)", b: "Trị giá (sạch)", signal: "Tỷ lệ lệch giá trị > ngưỡng (mặc định 30%)", meaning: "Một trong ba cột nhập sai, hoặc đơn giá ghi theo đơn vị/tiền tệ khác" },
  { a: "Đơn giá gốc quy đổi (USD/tấn)", b: "Đơn giá (USD/tấn)", signal: "Chênh nhau nhiều lần", meaning: "Cột Đơn giá gốc hoặc đơn vị tính không tin cậy — tin Đơn giá (USD/tấn) nếu nằm trong khoảng giá hợp lý" },
  { a: "Đơn giá (USD/tấn)", b: "Khoảng giá hợp lý · trung vị phân khúc (bước 12)", signal: "Ngoài khoảng / ngoại lai IQR", meaning: "Sai đơn vị, hàng khác cấp hoặc hàng ngoài phạm vi" },
  { a: "Đơn vị gốc · Lượng (sạch)", b: "Mô tả hàng hóa (quy cách: 25KG BAG, 1 MT JUMBO…)", signal: "Đơn vị và quy cách không khớp", meaning: "Đặt hệ số quy đổi đúng ở bước 6" },
  { a: "Mô tả hàng hóa · Mã HS", b: "Phân khúc cuối cùng", signal: "Mô tả/mã HS thuộc mặt hàng khác", meaning: "Bổ sung từ khóa LOẠI TRỪ hoặc mã HS vào hồ sơ" },
  { a: "Phân khúc từ khóa", b: "Phân khúc ngành", signal: "Đối chiếu từ khóa – ngành = Khác nhau", meaning: "Chọn lại cách xác định phân khúc ở bước 11 hoặc sửa từ khóa" },
  { a: "Tên gốc (người mua/người bán)", b: "Tên chuẩn hóa · Độ tin cậy · Cách gộp", signal: "Độ tin cậy Trung bình/Thấp, tên khác hẳn nhau", meaning: "Gộp nhầm — sửa bằng tệp rà soát tên (bước 4)" },
  { a: "Nguồn dữ liệu · Ngày", b: "Nghi trùng giữa các nguồn", signal: "Hai nguồn ghi cùng lô hàng", meaning: "Giữ bản ghi của nguồn ưu tiên, loại bản còn lại" },
  { a: "Nước xuất xứ", b: "Nước nhập khẩu", signal: "Trùng nhau", meaning: "Tái nhập, hàng nội địa hoặc ghi nhầm cột" },
  { a: "Ngày (chuẩn hóa)", b: "Năm của trang tính", signal: "Khác năm", meaning: "Dòng có thể nằm nhầm năm — cân nhắc tách theo cột Ngày" },
];

/** Quy trình rà soát gợi ý. */
export const REVIEW_STEPS = [
  "Tải “Tệp rà soát dữ liệu” ở bước này: mỗi trường hợp một trang tính, có sẵn cột cần đối chiếu và cột “Quyết định”.",
  "Rà soát theo thứ tự ưu tiên: mức “Loại khỏi database” trước, rồi “Giữ, không dùng cho giá & lượng”, cuối cùng là các ghi chú. Ưu tiên dòng có trị giá lớn.",
  "Điền cột “Quyết định” (Giữ / Loại / Sửa) và “Ghi chú” cho từng dòng cần xử lý.",
  "Lỗi sửa được trong công cụ thì sửa tại gốc rồi chạy lại: hệ số đơn vị (bước 6), từ điển doanh nghiệp (bước 4), từ khóa LOẠI TRỪ (bước 10), mã HS trong hồ sơ.",
  "Các dòng quyết định “Loại”: lọc theo Nguồn - Tên file / Tên trang tính / Dòng Excel trong tệp dữ liệu chi tiết rồi xóa khỏi bộ dữ liệu dùng cho báo cáo.",
  "Ghi vào báo cáo: số dòng và trị giá đã loại theo từng trường hợp, tỷ trọng doanh nghiệp không xác định, tỷ trọng chưa phân loại.",
];

/** Ngữ cảnh truy cập cột của một năm. */
function ctxOf(engine, y) {
  const hsList = (engine.profile?.hsCodes || []).map((h) => String(h).replace(/\D/g, "")).filter(Boolean);
  return {
    year: y.year,
    FS: ACC(y, "Final_Segment"), XD: ACC(y, "Cross_Source_Dup"), DUP: ACC(y, "Duplicate_Flag"), PS: ACC(y, "Price_Sanity"),
    UST: ACC(y, "Unit_Status"), TV: ACC(y, "TotalValue_Clean"), VCK: ACC(y, "Value_Check"), IQR: ACC(y, "IQR_Check"),
    PSTD: ACC(y, "Purchaser_Standardize"), PRISK: ACC(y, "Purchaser_Risk_Flag"), PREV: ACC(y, "Purchaser_Review_Status"), PTOP: ACC(y, "Purchaser_Top_Flag"),
    SCON: ACC(y, "Segment_Consistency"), D: ACC(y, "Date_Clean"), PC: ACC(y, "Purchaser_Country_Std"), SC: ACC(y, "Supplier_Country_Std"),
    hsList, hsRaw: y.map.hsCode >= 0 ? (i) => y.rows[i][y.map.hsCode] : null,
    noTon: new Set([US.AMBIGUOUS, US.NON_MASS, US.UNKNOWN, US.BLANK, US.NO_QTY, US.EXCLUDED]),
    unknownCountry: new Set(["", "Không xác định", normText("Không xác định")]),
  };
}

/** Thống kê số dòng & trị giá theo từng trường hợp (và theo năm). */
export function computeReview(engine) {
  const years = engine.years.map((y) => y.year);
  const stats = Object.fromEntries(REVIEW_CASES.map((c) => [c.id, { id: c.id, rows: 0, value: 0, years: {} }]));
  let finalExcl = { rows: 0, value: 0 }, totalRows = 0, totalValue = 0;
  for (const y of engine.years) {
    const c = ctxOf(engine, y);
    const FI = y.cols.Final_Included;
    for (const k of REVIEW_CASES) stats[k.id].years[y.year] = { rows: 0, value: 0 };
    for (let i = 0; i < y.n; i++) {
      const v = c.TV && c.TV[i] > 0 ? c.TV[i] : 0;
      totalRows++; totalValue += v;
      if (FI && FI[i] === LABELS.NO) { finalExcl.rows++; finalExcl.value += v; }
      for (const k of REVIEW_CASES) {
        if (!k.test(c, i)) continue;
        const s = stats[k.id]; s.rows++; s.value += v; s.years[y.year].rows++; s.years[y.year].value += v;
      }
    }
  }
  return {
    ready: engine.status.metrics === "done",
    years, totalRows, totalValue, finalExcluded: finalExcl,
    hsCodes: (engine.profile?.hsCodes || []).length,
    cases: REVIEW_CASES.map((k) => ({ ...stats[k.id], tier: k.tier, mode: k.mode })),
  };
}

/** Cột hiển thị cho mỗi dòng trong tệp rà soát. */
export function reviewRowColumns(engine, headerLabel) {
  const raw = (f) => (y, i) => (y.map[f] >= 0 ? y.rows[i][y.map[f]] : null);
  const col = (k) => (y, i) => { const a = y.cols[k]; if (!a) return null; const v = a[i]; return typeof v === "number" ? (Number.isFinite(v) ? v : null) : v instanceof Date ? v.toISOString().slice(0, 10) : v === "" ? null : v; };
  const L = (k) => headerLabel(k, "vi");
  return [
    ["Năm", (y) => y.year], [L("_Source_File"), (y, i) => y.srcNames?.[y.srcIdx?.[i]]?.file ?? null],
    [L("_Source_Sheet"), (y, i) => y.srcNames?.[y.srcIdx?.[i]]?.sheet ?? null], [L("_Source_Row"), (y, i) => y.rowNum[i]],
    ["Nguồn dữ liệu", raw("dataSource")], [L("Date_Clean"), col("Date_Clean")], ["Mã HS", raw("hsCode")], ["Mô tả hàng hóa", raw("productDesc")],
    ["Người mua (gốc)", raw("purchaser")], [L("Purchaser_Standardize"), col("Purchaser_Standardize")], [L("Purchaser_Entity_ID"), col("Purchaser_Entity_ID")], [L("Purchaser_Country_Std"), col("Purchaser_Country_Std")],
    ["Người bán (gốc)", raw("supplier")], [L("Supplier_Standardize"), col("Supplier_Standardize")], [L("Supplier_Country_Std"), col("Supplier_Country_Std")],
    ["Đơn vị (gốc)", raw("unit")], [L("Quantity_Clean"), col("Quantity_Clean")], [L("UnitPrice_Clean"), col("UnitPrice_Clean")], [L("TotalValue_Clean"), col("TotalValue_Clean")],
    [L("Conversion_Factor"), col("Conversion_Factor")], [L("Quantity_MT"), col("Quantity_MT")], [L("UnitPrice_per_MT"), col("UnitPrice_per_MT")], [L("UnitPrice_Orig_per_MT"), col("UnitPrice_Orig_per_MT")],
    [L("Value_Check"), col("Value_Check")], [L("Value_Check_Diff"), col("Value_Check_Diff")], [L("Unit_Status"), col("Unit_Status")], [L("Price_Sanity"), col("Price_Sanity")],
    [L("Final_Segment"), col("Final_Segment")], [L("Segment_Method"), col("Segment_Method")], [L("Keyword_Match_Detail"), col("Keyword_Match_Detail")], [L("Segment_Consistency"), col("Segment_Consistency")],
    [L("IQR_Check"), col("IQR_Check")], [L("Cross_Source_Dup"), col("Cross_Source_Dup")], [L("Duplicate_Flag"), col("Duplicate_Flag")],
    [L("Final_Included"), col("Final_Included")], [L("Exclusion_Reason"), col("Exclusion_Reason")],
    ["Quyết định (Giữ / Loại / Sửa)", () => null], ["Ghi chú", () => null],
  ];
}

/** Duyệt mọi dòng thuộc trường hợp `id` (tối đa `limit` dòng, ưu tiên theo thứ tự năm). */
export function rowsOfCase(engine, id, limit = 30000) {
  const k = REVIEW_CASES.find((x) => x.id === id);
  const out = [];
  for (const y of engine.years) {
    const c = ctxOf(engine, y);
    for (let i = 0; i < y.n && out.length < limit; i++) if (k.test(c, i)) out.push([y, i]);
  }
  return out;
}
