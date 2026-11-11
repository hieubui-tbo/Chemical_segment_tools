/* Bộ dữ liệu tổng hợp có "cài bẫy" — mỗi bẫy tương ứng một lỗi đã gặp ở V17 hoặc trong dữ liệu thật. */
import * as XLSX from "xlsx";

export const H = ["Data Source", "Date", "HS CODE", "Product Description", "Supplier ", "Purchaser ", "Country of Origin", "Purchasing Country", "Total Value ($)", "Unit Price ($)", "Quantity ", "Unit"];

const r = (src, date, desc, sup, pur, co, pc, tv, up, q, unit) => [src, date, "28271000", desc, sup, pur, co, pc, tv, up, q, unit];

export function rows2023() {
  return [
    // VN-EN alias: cùng một DN mua viết 3 kiểu; quốc gia "Viet Nam" vs "VIETNAM"
    r("Vietnam", "2023-03-01", "AMMONIUM CHLORIDE FERTILIZER N 25% 50KG BAG", "SUNSHINE SHARE CO., LIMITED", "CÔNG TY TNHH THƯƠNG MẠI THUỶ NGÂN", "CHINA", "VIETNAM", "45,000.00", "150", "300", "TNE"),
    r("Vietnam", "2023-03-05", "PHÂN BÓN AMONI CLORUA (NH4CL) N 25%", "SUNSHINE SHARE CO.,LTD.", "THUY NGAN TRADING COMPANY LIMITED", "CHINA", "Viet Nam", "30000", "150", "200", "TNE"),
    r("Vietnam", "2023-04-01", "AMMONIUM CHLORIDE AGRICULTURAL GRADE", "SUNSHINE SHARE CO LIMITED", "THUY NGAN CO.,LTD.", "CN", "VN", "15000", "150", "100", "TNE"),
    // Trùng giữa các nguồn: cùng lô ở nguồn VietChina (tên tiếng Việt), lệch 2 ngày
    r("VietChina", "2023-03-03", "AMONI CLORUA PHÂN BÓN", "SUNSHINE SHARE CO., LIMITED", "CONG TY TNHH THUONG MAI THUY NGAN", "CHINA", "VIETNAM", "45000", "150", "300", "TNE"),
    // Placeholder giá trị lớn: KHÔNG được vào Top
    r("India(EXP)", "2023-05-01", "AMMONIUM CHLORIDE INDUSTRIAL GRADE", "RASINO HERBS PRIVATE LIMITED", "TO THE ORDER OF STATE BANK OF INDIA", "INDIA", "SUDAN", "900000", "300", "3000", "TNE"),
    r("India(EXP)", "2023-05-02", "AMMONIUM CHLORIDE INDUSTRIAL GRADE", "RASINO HERBS PRIVATE LIMITED", null, "INDIA", "SUDAN", "800000", "300", "2666.67", "TNE"),
    // Mã ISO2 quốc gia (V17 nhận DE là châu Á)
    r("Global Shipping", "2023-06-01", "AMMONIUM CHLORIDE TECHNICAL GRADE GALVANIZING FLUX", "BASF SE", "METALLIDE CHEMICAL INDUSTRIES INDIA PVT LTD", "DE", "IN", "20000", "0.4", "50000", "KGM"),
    // Sai đơn vị: 506.000 "TNE" thực chất là kg ⇒ 0,11 USD/tấn
    r("Indonesia", "2023-07-01", "AMMONIUM CHLORIDE BARANG BARU", "WUGANG CHEMICAL JIANGSU COMPANY LIMITED", "PT. ASIA KIMINDO PRIMA", "CHINA", "INDONESIA", "55660", "0.11", "506000", "TNE"),
    r("Indonesia", "2023-07-02", "AMMONIUM CHLORIDE", "WUGANG CHEMICAL JIANGSU CO LTD", "PT ASIA KIMINDO PRIMA", "CHINA", "INDONESIA", "160000", "160", "1000", "TNE"),
    // Bao 25 kg (đơn vị BAG) ⇒ suy luận khối lượng
    r("Peru", "2023-08-01", "CLORURO DE AMONIO 160 BOLSAS DE 25 KG", "QUIMICA PERU SAC", "INDUSTRIAS PERU S.A.", "CHINA", "PERU", "4370", "27.31", "160", "BLE"),
    // TON mơ hồ
    r("Pakistan", "2023-09-01", "AMMONIUM CHLORIDE FOOD GRADE E510", "SHANDONG HAIHUA GROUP CO.,LTD", "PAK FOODS (PVT) LTD", "CHINA", "PAKISTAN", "50000", "500", "100", "TON"),
    // Thiếu Trị giá ⇒ bổ sung = Đơn giá × Lượng
    r("Vietnam", "2023-10-01", "AMMONIUM CHLORIDE PHARMA BP", "MERCK KGAA", "CONG TY CO PHAN DUOC PHAM HA NOI", "GERMANY", "VIETNAM", "", "2500", "2", "TNE"),
    // THIOUREA: không được khớp từ khóa UREA
    r("Vietnam", "2023-10-05", "THIOUREA 99% INDUSTRIAL", "HEBEI CHEM CO LTD", "CONG TY TNHH HOA CHAT AN PHAT", "CHINA", "VIETNAM", "10000", "1000", "10", "TNE"),
    // Ngoài phạm vi: amoni bậc bốn
    r("Global Shipping", "2023-11-01", "BENZYL DIMETHYL AMMONIUM CHLORIDE 50%", "TO THE ORDER", "ECOLAB LTD", "UNITED STATES", "CANADA", "0", "0", "200", "DR"),
  ];
}

export function rows2024() {
  return [
    r("Vietnam", "2024-02-01", "AMMONIUM CHLORIDE FERTILIZER GRANULAR", "SUNSHINE SHARE CO., LIMITED", "THUY NGAN TRADING CO., LTD", "CHINA", "VIETNAM", "60000", "150", "400", "TNE"),
    r("Vietnam", "2024-02-02", "AMMONIUM CHLORIDE FERTILIZER GRANULAR", "UNIFARM ENTERPRISE LIMITED", "CÔNG TY TNHH PHÂN BÓN PHÚ BÌNH", "CHINA", "VIETNAM", "30000", "150", "200", "TNE"),
    r("Vietnam", "2024-02-03", "AMMONIUM CHLORIDE FERTILIZER", "UNIFARM ENTERPRISE LIMITED", "HUNG PHU FERTILIZER COMPANY LIMITED", "CHINA", "VIETNAM", "15000", "150", "100", "TNE"),
    r("Vietnam", "2024-02-04", "AMMONIUM CHLORIDE FERTILIZER", "UNIFARM ENTERPRISE LIMITED", "PHU HUNG FERTILIZER COMPANY LIMITED", "CHINA", "VIETNAM", "15000", "150", "100", "TNE"),
    r("Indonesia", "2024-03-01", "AMMONIUM CHLORIDE", "WUGANG CHEMICAL JIANGSU COMPANY LIMITED", "PT ASIA KIMINDO PRIMA CAB. MEDAN", "CHINA", "INDONESIA", "140000", "140", "1000", "TNE"),
    r("Russia", "2024-04-01", "АММОНИЙ ХЛОРИСТЫЙ", "ООО \"ПИОНЕР ТРЕЙД\"", "ООО \"ТК РУСХИМ\"", "CHINA", "RUSSIA", "36000", "180", "200", "TNE"),
    r("Russia", "2024-04-05", "AMMONIUM CHLORIDE", "PIONER TREYD LLC", "OOO TK RUSKHIM", "CHINA", "RUSSIAN FEDERATION", "36000", "180", "200", "TNE"),
  ];
}

/** Workbook 1: sheet "2023_Data" (V17 không nhận vì \b), có 2 dòng tiêu đề báo cáo phía trên. */
export function buildWorkbookA() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["BÁO CÁO DỮ LIỆU NHẬP KHẨU NH4CL"], ["Nguồn: tổng hợp"], H, ...rows2023()]);
  XLSX.utils.book_append_sheet(wb, ws, "2023_Data");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Ghi chú"], ["không phải dữ liệu"]]), "Notes");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}
/** Workbook 2: một sheet tên "Sheet1", năm nằm trong tên file. */
export function buildWorkbookB() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([H, ...rows2024()]), "Sheet1");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

export function buildKeywords() {
  const aoa = [
    ["STT", "Phân bón", "Công nghiệp", "Dược phẩm & Thực phẩm", "Urea test", "LOẠI TRỪ"],
    [1, "FERTILIZER", "INDUSTRIAL", "PHARMA*", "UREA", "BENZYL"],
    [2, "PHAN BON", "TECHNICAL GRADE", "FOOD GRADE", null, "QUATERNARY"],
    [3, "AGRICULTURAL", "GALVANIZ*", "BP", null, null],
    [4, "GRANULAR", "FLUX", "E510", null, null],
    [5, null, "-FERTILIZER", null, null, null],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "KW");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

/** Industry master kiểu V17: nhiều sheet, tiêu đề tiếng Anh, tên viết khác với tên chuẩn hóa mới. */
export function buildIndustryV17() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Purchaser_Standardize", "Purchasing Country", "Industry", "Industry Segment"], ["Trading Thuy Ngan", "VIETNAM", "Thương mại phân bón", "Phân bón"]]), "2023_All");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Purchaser_Standardize", "Purchasing Country", "Industry", "Industry Segment"], ["Asia Kimindo Prima", "INDONESIA", "Phân phối hóa chất", "Công nghiệp"]]), "2024_All");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}
