/* ═══════════════════════════════════════════════════════════════
   TỪ ĐIỂN CỘT KẾT QUẢ — mỗi cột tính toán có: khóa nội bộ (= tên tiếng Anh),
   nhãn tiếng Việt, bước tạo ra và mô tả cách tính. Dùng cho:
   - xuất Excel (đổi tiêu đề theo ngôn ngữ chọn)
   - sheet "Từ điển cột" trong báo cáo kiểm toán
   - dọn cột khi một bước bị chạy lại (invalidation)
   ═══════════════════════════════════════════════════════════════ */

const C = (key, vi, step, desc, type = "text") => ({ key, vi, en: key, step, desc, type });

function entityCols(P, viP, countryVi) {
  return [
    C(`${P}_Standardize`, `${viP} - Tên chuẩn hóa`, "entity", `Tên hiển thị của nhóm DN: chọn từ biến thể THẬT có giá trị lớn nhất (ưu tiên tên tiếng Anh), làm sạch hậu tố pháp lý. "[Không xác định]" = placeholder.`),
    C(`${P}_Entity_ID`, `${viP} - Mã nhóm DN`, "entity", "Mã nhóm thống nhất cho TẤT CẢ các năm; đánh số theo tổng giá trị giảm dần (…0001 = DN lớn nhất)."),
    C(`${P}_Match_Method`, `${viP} - Cách gộp`, "entity", "Cách các biến thể được gộp: Trùng khớp sau chuẩn hóa / Bí danh Việt–Anh / Trùng phần tên riêng / Gần đúng ký tự / Từ điển người dùng / Placeholder."),
    C(`${P}_Confidence`, `${viP} - Độ tin cậy`, "entity", "Chính xác > Cao > Trung bình > Thấp. Trung bình/Thấp luôn được đánh dấu Cần rà soát."),
    C(`${P}_Review_Status`, `${viP} - Trạng thái rà soát`, "entity", "Tự động chấp nhận / Cần rà soát / Đã xác nhận (từ điển) / Loại trừ (không xác định)."),
    C(`${P}_Risk_Flag`, `${viP} - Cờ rủi ro`, "entity", "Cảnh báo: nhiều DN trong một ô, tên quá ngắn, chi nhánh, có thể là DN logistics, gộp gần đúng…"),
    C(`${P}_Country_Std`, `${countryVi} (chuẩn hóa)`, "entity", "Tên quốc gia chuẩn (tiếng Anh) nhận diện từ tên/mã ISO2/ISO3/tên tiếng Việt."),
    C(`${P}_Continent`, `${viP} - Châu lục`, "entity", "Châu lục của quốc gia chuẩn hóa."),
    C(`${P}_Is_SEA`, `${viP} - Thuộc Đông Nam Á`, "entity", "Có / Không (11 nước ASEAN + Timor-Leste)."),
  ];
}

export const COLUMN_DEFS = [
  C("_Source_File", "Nguồn - Tên file", "upload", "File gốc chứa dòng dữ liệu."),
  C("_Source_Sheet", "Nguồn - Tên sheet", "upload", "Sheet gốc chứa dòng dữ liệu."),
  C("_Source_Row", "Nguồn - Dòng Excel", "upload", "Số dòng trong file Excel gốc — dùng để truy vết.", "int"),

  C("Date_Clean", "Ngày (chuẩn hóa)", "quality", "Ngày giao dịch đọc được (hỗ trợ ngày Excel, dd/mm/yyyy, yyyy-mm-dd).", "date"),
  C("Duplicate_Flag", "Dòng trùng lặp", "quality", "\"Trùng lặp\" nếu dòng giống hệt một dòng trước đó trên mọi trường đã ánh xạ (cùng năm)."),

  C("UnitPrice_Clean", "Đơn giá (sạch)", "backfill", "Đơn giá đọc được (> 0); nếu thiếu và có Trị giá + Lượng thì = Trị giá / Lượng.", "num"),
  C("TotalValue_Clean", "Trị giá (sạch)", "backfill", "Trị giá đọc được (> 0); nếu thiếu và có Đơn giá + Lượng thì = Đơn giá × Lượng.", "num"),
  C("Quantity_Clean", "Lượng (sạch)", "backfill", "Lượng đọc được (> 0); nếu thiếu và có Trị giá + Đơn giá thì = Trị giá / Đơn giá.", "num"),
  C("Backfill_Field", "Trường được bổ sung", "backfill", "Trường được tính bổ sung (chỉ khi thiếu đúng 1 trong 3 trường)."),

  C("Value_Check", "Đối chiếu giá trị", "validate", "Hợp lệ / Lệch vượt ngưỡng / Thiếu dữ liệu / Đã bổ sung (không kiểm được). Lệch = |Đơn giá × Lượng − Trị giá| / Trị giá."),
  C("Value_Check_Diff", "Tỷ lệ lệch giá trị", "validate", "|Đơn giá × Lượng − Trị giá| / Trị giá.", "pct"),

  C("Unit_Std", "Đơn vị (chuẩn hóa)", "units", "Mã đơn vị sau chuẩn hóa (bỏ dấu chấm, khoảng trắng thừa…)."),
  C("Unit_Status", "Trạng thái quy đổi", "units", "Đã quy đổi / Suy luận từ mô tả / Mơ hồ – chưa quy đổi / Không phải khối lượng / Chưa có hệ số / Thiếu đơn vị / Thiếu lượng."),
  C("Conversion_Factor", "Hệ số quy đổi (tấn/đơn vị)", "units", "Số tấn tương ứng 1 đơn vị gốc (từ từ điển, người dùng nhập, hoặc suy luận khối lượng bao bì từ mô tả).", "num"),
  C("Quantity_MT", "Lượng (tấn)", "units", "= Lượng (sạch) × Hệ số quy đổi.", "num"),
  C("UnitPrice_per_MT", "Đơn giá (USD/tấn)", "units", "= Trị giá (sạch) / Lượng (tấn); nếu thiếu trị giá thì = Đơn giá (sạch) / Hệ số.", "num"),
  C("Price_Sanity", "Kiểm tra giá/tấn", "units", "Giá/tấn < 1/50 hoặc > 2.000 lần giá tham chiếu (trung vị có trọng số trị giá) ⇒ phi lý, nghi sai đơn vị (vd: lượng KG nhưng ghi TNE). Bị loại khỏi IQR và chỉ số."),

  ...entityCols("Purchaser", "DN mua", "Nước nhập khẩu"),
  ...entityCols("Supplier", "DN bán", "Nước xuất xứ"),
  C("Cross_Source_Dup", "Nghi trùng giữa các nguồn", "entity", "Giao dịch có cùng năm, cùng lượng, cùng trị giá (±1 USD), cùng DN mua hoặc DN bán, ngày lệch ≤ 10 ngày nhưng đến từ NGUỒN DỮ LIỆU KHÁC — dòng được giữ là bản ghi của nước nhập khẩu (nếu có)."),

  C("Row_Ranking_Value", "Giá trị xếp hạng (dòng)", "ranking", "= Trị giá (sạch) (hoặc Lượng tấn nếu chọn xếp hạng theo khối lượng); dòng nghi trùng nguồn khác không được tính.", "num"),
  C("Research_Scope_Flag", "Phạm vi nghiên cứu (DN mua)", "ranking", "Vị trí của DN mua trong xếp hạng toàn cầu của năm: Thuộc Top / Ngoài Top / DN không xác định / Không tính được giá trị."),
  C("Purchaser_Top_Flag", "DN mua thuộc Top", "ranking", "Có nếu DN mua thuộc nhóm Top X% giá trị toàn cầu của năm."),
  C("Supplier_Top_Flag", "DN bán thuộc Top", "ranking", "Có nếu DN bán thuộc nhóm Top X% giá trị toàn cầu của năm."),

  C("Industry", "Ngành", "industry", "Ngành của DN mua lấy từ file Industry Master."),
  C("Industry_Segment", "Phân khúc ngành", "industry", "Phân khúc ngành của DN mua lấy từ file Industry Master (dùng làm phương án dự phòng khi phân loại)."),
  C("Industry_Match", "Cách khớp ngành", "industry", "Khớp theo tên chuẩn hóa / Khớp theo tên lõi / Không khớp."),

  C("Keyword_Segment", "Phân khúc theo từ khóa", "classify", "Phân khúc có nhiều từ khóa khớp nhất trong mô tả hàng hóa."),
  C("Keyword_Match_Detail", "Chi tiết từ khóa khớp", "classify", "Danh sách phân khúc(từ khóa) tìm thấy trong mô tả."),
  C("Keyword_Confidence", "Độ rõ ràng từ khóa", "classify", "Một phân khúc / Nhiều phân khúc – rõ ràng / Hòa – chọn từ khóa dài hơn / Hòa – chọn theo thứ tự cột."),
  C("Final_Segment", "Phân khúc cuối cùng", "classify", "Ưu tiên phân khúc từ khóa; nếu không có thì dùng Phân khúc ngành; nếu không có nữa thì \"Chưa phân loại\"."),
  C("Segment_Method", "Cách phân loại", "classify", "Từ khóa / Ngành (dự phòng) / Chưa phân loại."),
  C("Segment_Consistency", "Đối chiếu từ khóa – ngành", "classify", "Khi có cả hai: Khớp / Khác nhau (nên rà soát)."),

  C("IQR_Check", "Kiểm tra IQR", "iqr", "Trong ngưỡng / Ngoại lai IQR / Không đủ dữ liệu / Không có giá / Giá phi lý (loại trước IQR)."),
  C("IQR_Lower", "Ngưỡng dưới IQR", "iqr", "Q1 − k × IQR của nhóm (Năm × Phân khúc). Tứ phân vị tính như Excel QUARTILE.INC.", "num"),
  C("IQR_Upper", "Ngưỡng trên IQR", "iqr", "Q3 + k × IQR của nhóm (Năm × Phân khúc).", "num"),

  C("Final_Included", "Giữ lại sau lọc", "metrics", "Có / Không — theo quy tắc loại ngoại lai đã chọn ở bước 13."),
  C("Exclusion_Reason", "Lý do loại", "metrics", "Lý do dòng bị loại khỏi số liệu sau lọc."),
];

export const COLUMN_MAP = Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c]));
export const COLUMNS_BY_STEP = COLUMN_DEFS.reduce((acc, c) => { (acc[c.step] ||= []).push(c.key); return acc; }, {});

export function headerLabel(key, lang = "vi") {
  const d = COLUMN_MAP[key];
  if (!d) return key;
  return lang === "en" ? d.en : d.vi;
}

/** Thứ tự cột tính toán trong file chi tiết. */
export const DETAIL_COMPUTED_ORDER = [
  "Purchaser_Standardize", "Purchaser_Entity_ID", "Purchaser_Country_Std", "Purchaser_Continent", "Purchaser_Is_SEA",
  "Purchaser_Confidence", "Purchaser_Review_Status", "Purchaser_Risk_Flag", "Purchaser_Match_Method",
  "Supplier_Standardize", "Supplier_Entity_ID", "Supplier_Country_Std", "Supplier_Continent", "Supplier_Is_SEA",
  "Supplier_Confidence", "Supplier_Review_Status", "Supplier_Risk_Flag", "Supplier_Match_Method",
  "Research_Scope_Flag", "Purchaser_Top_Flag", "Supplier_Top_Flag", "Row_Ranking_Value",
  "Industry", "Industry_Segment", "Industry_Match",
  "Final_Segment", "Segment_Method", "Keyword_Segment", "Keyword_Match_Detail", "Keyword_Confidence", "Segment_Consistency",
  "UnitPrice_Clean", "TotalValue_Clean", "Quantity_Clean", "Backfill_Field", "Value_Check", "Value_Check_Diff",
  "Unit_Std", "Unit_Status", "Conversion_Factor", "Quantity_MT", "UnitPrice_per_MT", "Price_Sanity",
  "IQR_Check", "IQR_Lower", "IQR_Upper",
  "Duplicate_Flag", "Cross_Source_Dup", "Date_Clean",
  "Final_Included", "Exclusion_Reason",
  "_Source_File", "_Source_Sheet", "_Source_Row",
];
