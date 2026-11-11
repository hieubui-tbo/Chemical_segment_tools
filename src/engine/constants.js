/* ═══════════════════════════════════════════════════════════════
   HẰNG SỐ & CẤU HÌNH MẶC ĐỊNH CỦA QUY TRÌNH
   ═══════════════════════════════════════════════════════════════ */

export const APP_VERSION = "V18.1";
/** Hướng dẫn sử dụng đầy đủ (file Word trong public/, tải trực tiếp từ công cụ). */
export const GUIDE_URL = "/Huong_dan_su_dung_ChemSeg.docx";

/** Các giai đoạn của quy trình (dùng cho giao diện). */
export const PHASES = [
  { id: "A", label: "Chuẩn bị dữ liệu", color: "#2F5BEA" },
  { id: "B", label: "Làm sạch & chuẩn hóa số liệu", color: "#7B3FE4" },
  { id: "C", label: "Doanh nghiệp & thị trường", color: "#D6336C" },
  { id: "D", label: "Phân khúc & giá", color: "#E8590C" },
  { id: "E", label: "Xuất báo cáo", color: "#0B8A61" },
];

/**
 * 14 bước — giữ nguyên trình tự logic của V17.
 * optional: bước có thể bỏ qua.  input: bước cần người dùng tải file/thiết lập trước khi chạy.
 */
export const STEPS = [
  { id: "upload",   no: 1,  phase: "A", label: "Tải dữ liệu",               short: "Tải dữ liệu" },
  { id: "schema",   no: 2,  phase: "A", label: "Ánh xạ cột",                short: "Ánh xạ cột" },
  { id: "quality",  no: 3,  phase: "A", label: "Kiểm tra chất lượng",       short: "Chất lượng" },
  { id: "backfill", no: 4,  phase: "B", label: "Bổ sung số liệu thiếu",     short: "Bổ sung số liệu" },
  { id: "validate", no: 5,  phase: "B", label: "Đối chiếu giá trị",         short: "Đối chiếu giá trị" },
  { id: "units",    no: 6,  phase: "B", label: "Quy đổi đơn vị về tấn",     short: "Quy đổi đơn vị" },
  { id: "entity",   no: 7,  phase: "C", label: "Chuẩn hóa doanh nghiệp",    short: "Chuẩn hóa DN" },
  { id: "ranking",  no: 8,  phase: "C", label: "Xếp hạng Top doanh nghiệp", short: "Xếp hạng Top" },
  { id: "industry", no: 9,  phase: "C", label: "Gán ngành (Industry Master)", short: "Gán ngành", optional: true },
  { id: "keywords", no: 10, phase: "D", label: "Bộ từ khóa phân khúc",      short: "Bộ từ khóa", optional: true },
  { id: "classify", no: 11, phase: "D", label: "Phân loại phân khúc",       short: "Phân loại" },
  { id: "iqr",      no: 12, phase: "D", label: "Lọc ngoại lai IQR",          short: "Ngoại lai IQR" },
  { id: "metrics",  no: 13, phase: "D", label: "Chỉ số phân khúc",          short: "Chỉ số phân khúc" },
  { id: "export",   no: 14, phase: "E", label: "Xuất kết quả",              short: "Xuất kết quả" },
];
export const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.id, i]));

/** Trường dữ liệu cần ánh xạ. */
export const SCHEMA_FIELDS = [
  { key: "dataSource",    label: "Nguồn dữ liệu",         optional: true,
    aliases: ["data source", "source", "nguon du lieu", "nguon", "data provider", "database"] },
  { key: "hsCode",        label: "Mã HS",                 optional: true,
    aliases: ["hs code", "hscode", "hs", "ma hs", "hs code 8", "tariff code", "commodity code"] },
  { key: "date",          label: "Ngày giao dịch",        optional: true,
    aliases: ["date", "ngay", "ngay thang", "transaction date", "shipment date", "arrival date", "declaration date", "invoice date", "bill date", "ngay dang ky", "ngay to khai"] },
  { key: "productDesc",   label: "Mô tả hàng hóa",
    aliases: ["product description", "product desc", "goods description", "description of goods", "commodity description", "description", "mo ta hang hoa", "mo ta", "ten hang", "hang hoa", "product", "product name", "commodity"] },
  { key: "supplier",      label: "Nhà cung cấp (bên bán)",
    aliases: ["supplier", "exporter", "shipper", "seller", "vendor", "nha cung cap", "doanh nghiep xuat khau", "ben ban", "nguoi xuat khau", "supplier name", "exporter name", "shipper name"] },
  { key: "purchaser",     label: "Người mua (bên mua)",
    aliases: ["purchaser", "importer", "buyer", "consignee", "nguoi mua", "doanh nghiep nhap khau", "ben mua", "nguoi nhap khau", "importer name", "buyer name", "consignee name", "purchaser name"] },
  { key: "countryOrigin", label: "Nước xuất xứ",
    aliases: ["country of origin", "origin country", "nuoc xuat xu", "xuat xu", "country origin", "origin", "exporting country", "export country", "supplier country", "shipper country"] },
  { key: "purchCountry",  label: "Nước nhập khẩu (bên mua)",
    aliases: ["purchasing country", "importing country", "import country", "destination country", "country of destination", "buyer country", "importer country", "consignee country", "nuoc nhap khau", "destination"] },
  { key: "unitPrice",     label: "Đơn giá",
    aliases: ["unit price", "price per unit", "unit price usd", "don gia", "gia don vi", "unit value", "price"] },
  { key: "totalValue",    label: "Trị giá",
    aliases: ["total value", "value usd", "total value usd", "total amount", "tri gia", "tong tri gia", "tri gia usd", "amount usd", "value", "amount", "cif value", "fob value"] },
  { key: "quantity",      label: "Khối lượng / Số lượng",
    aliases: ["quantity", "qty", "volume", "khoi luong", "so luong", "luong", "net weight", "weight"] },
  { key: "unit",          label: "Đơn vị tính",
    aliases: ["unit", "uom", "unit of measure", "unit of measurement", "quantity unit", "qty unit", "don vi tinh", "don vi", "dvt"] },
];
export const REQUIRED_FIELDS = SCHEMA_FIELDS.filter((f) => !f.optional).map((f) => f.key);

/** Cấu hình mặc định — mọi tham số logic đều điều chỉnh được trên giao diện. */
export const DEFAULT_SETTINGS = {
  projectName: "Du_an",
  // Bước 5
  valueTolerance: 0.30,
  // Bước 6
  unitFactors: {},           // { "TON": 1, "LTR": 0.0012, ... } ghi đè theo đơn vị chuẩn hóa; null = loại
  inferPackageWeight: true,  // suy luận khối lượng/bao từ mô tả khi đơn vị là bao, chai, kiện…
  priceSanityCheck: true,    // đánh dấu giá/tấn phi lý (nghi sai đơn vị) và loại khỏi IQR/chỉ số
  priceBandMin: 0,           // USD/tấn — khoảng giá hợp lý của sản phẩm do người nghiên cứu đặt; 0 = tự động (giá tham chiếu ÷ 50)
  priceBandMax: 0,           // USD/tấn — 0 = tự động (giá tham chiếu × 2.000)
  // Bước 7
  supplierGroupByCountry: false,
  fuzzyEnabled: true,
  fuzzyThreshold: 0.90,
  customPlaceholders: [],
  nameCase: "title",
  detectCrossSource: true,   // phát hiện giao dịch trùng giữa các nguồn dữ liệu (cần ánh xạ cột Nguồn)
  // Bước 8
  topThreshold: 0.80,
  rankingMetric: "value",    // "value" (USD) | "volume" (tấn)
  excludeCrossSourceDup: true,
  // Bước 9
  industryApplyScope: "all", // "all" | "top"
  // Bước 11
  keywordMatchMode: "word",  // "word" | "substring"
  keywordFields: "desc",     // "desc" (mô tả) | "desc_hs" (mô tả + mã HS — dùng được từ khóa dạng 3102*)
  segmentBasis: "keyword_first", // "keyword_first" | "industry_first" | "keyword_only" | "industry_only"
  // Bước 12
  iqrMinN: 4,
  iqrMultiplier: 1.5,
  iqrLog: false,
  // Bước 13
  outlierRule: "AND",        // "AND" | "IQR" | "OR"
  excludeDuplicates: false,
  // Bước 14
  headerLanguage: "vi",      // "vi" | "en"
  exportAfterSheet: true,
  exportAllOriginalColumns: true,
};

/** Tham số nào thuộc bước nào — đổi tham số sẽ làm các bước từ đó trở đi cần chạy lại. */
export const SETTING_STEP = {
  valueTolerance: "validate",
  unitFactors: "units", inferPackageWeight: "units", priceSanityCheck: "units", priceBandMin: "units", priceBandMax: "units",
  supplierGroupByCountry: "entity", fuzzyEnabled: "entity", fuzzyThreshold: "entity", customPlaceholders: "entity", nameCase: "entity", detectCrossSource: "entity",
  topThreshold: "ranking", rankingMetric: "ranking", excludeCrossSourceDup: "ranking",
  industryApplyScope: "industry",
  keywordMatchMode: "classify", keywordFields: "classify", segmentBasis: "classify",
  iqrMinN: "iqr", iqrMultiplier: "iqr", iqrLog: "iqr",
  outlierRule: "metrics", excludeDuplicates: "metrics",
  headerLanguage: null, exportAfterSheet: null, exportAllOriginalColumns: null, projectName: null,
};

/** Thiết lập KHÔNG thuộc hồ sơ sản phẩm (tùy chọn hiển thị/xuất file của từng người). */
export const NON_PROFILE_SETTINGS = new Set(["headerLanguage", "exportAfterSheet", "exportAllOriginalColumns"]);

/** Cách xác định phân khúc cuối cùng (bước 11) — theo ý đồ phân khúc của người nghiên cứu. */
export const SEGMENT_BASIS = {
  keyword_first: { label: "Từ khóa trước, ngành DN dự phòng", order: "Loại trừ → Từ khóa → Ngành của DN → Chưa phân loại" },
  industry_first: { label: "Ngành DN trước, từ khóa dự phòng", order: "Loại trừ → Ngành của DN → Từ khóa → Chưa phân loại" },
  keyword_only: { label: "Chỉ theo từ khóa (mô tả hàng hóa)", order: "Loại trừ → Từ khóa → Chưa phân loại" },
  industry_only: { label: "Chỉ theo ngành của DN mua", order: "Loại trừ → Ngành của DN → Chưa phân loại" },
};

export const LABELS = {
  YES: "Có", NO: "Không",
  UNIDENTIFIED: "[Không xác định]",
  CONF: { EXACT: "Chính xác", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp", NA: "—" },
  REVIEW: { AUTO: "Tự động chấp nhận", REVIEW: "Cần rà soát", CONFIRMED: "Đã xác nhận (từ điển)", EXCLUDED: "Loại trừ (không xác định)" },
};

export const CONF_RANK = { "Chính xác": 4, "Cao": 3, "Trung bình": 2, "Thấp": 1 };
