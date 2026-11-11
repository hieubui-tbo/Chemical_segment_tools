/* Bộ dữ liệu GIẢ LẬP có "cài bẫy" — sản phẩm, doanh nghiệp, nguồn dữ liệu đều là hư cấu.
   Mỗi bẫy tương ứng một lỗi thường gặp trong dữ liệu XNK (hoặc một lỗi của V17). */
import * as XLSX from "xlsx";

export const H = ["Data Source", "Date", "HS CODE", "Product Description", "Supplier ", "Purchaser ", "Country of Origin", "Purchasing Country", "Total Value ($)", "Unit Price ($)", "Quantity ", "Unit"];

const r = (src, date, desc, sup, pur, co, pc, tv, up, q, unit) => [src, date, "28332100", desc, sup, pur, co, pc, tv, up, q, unit];

export function rows2023() {
  return [
    // Bí danh Việt–Anh: cùng một DN mua viết 3 kiểu; quốc gia "Viet Nam" vs "VIETNAM" vs "VN"
    r("Vietnam", "2023-03-01", "MAGNESIUM SULPHATE FERTILIZER MGO 16% 50KG BAG", "BRIGHTPEAK MINERALS CO., LIMITED", "CÔNG TY TNHH THƯƠNG MẠI LAM HỒNG", "CHINA", "VIETNAM", "45,000.00", "150", "300", "TNE"),
    r("Vietnam", "2023-03-05", "PHÂN BÓN MAGIE SUNFAT (MGSO4) MGO 16%", "BRIGHTPEAK MINERALS CO.,LTD.", "LAM HONG TRADING COMPANY LIMITED", "CHINA", "Viet Nam", "30000", "150", "200", "TNE"),
    r("Vietnam", "2023-04-01", "MAGNESIUM SULPHATE AGRICULTURAL GRADE", "BRIGHTPEAK MINERALS CO LIMITED", "LAM HONG CO.,LTD.", "CN", "VN", "15000", "150", "100", "TNE"),
    // Trùng giữa các nguồn: cùng lô hàng ở nguồn tổng hợp thứ ba (tên tiếng Việt), lệch 2 ngày
    r("Asia Trade Hub", "2023-03-03", "MAGIE SUNFAT PHÂN BÓN", "BRIGHTPEAK MINERALS CO., LIMITED", "CONG TY TNHH THUONG MAI LAM HONG", "CHINA", "VIETNAM", "45000", "150", "300", "TNE"),
    // Placeholder giá trị lớn: KHÔNG được vào Top
    r("India(EXP)", "2023-05-01", "MAGNESIUM SULPHATE INDUSTRIAL GRADE", "ORVANTA MINERALS PRIVATE LIMITED", "TO THE ORDER OF FIRST COMMERCIAL BANK", "INDIA", "SUDAN", "900000", "300", "3000", "TNE"),
    r("India(EXP)", "2023-05-02", "MAGNESIUM SULPHATE INDUSTRIAL GRADE", "ORVANTA MINERALS PRIVATE LIMITED", null, "INDIA", "SUDAN", "800000", "300", "2666.67", "TNE"),
    // Mã ISO2 quốc gia (V17 nhận DE là châu Á)
    r("Global Shipping", "2023-06-01", "MAGNESIUM SULPHATE TECHNICAL GRADE FOR TEXTILE DYEING", "KOVALIS CHEMIE GMBH", "NIRAVA TEXTILES INDIA PVT LTD", "DE", "IN", "20000", "0.4", "50000", "KGM"),
    // Sai đơn vị: 480.000 "TNE" thực chất là kg ⇒ 0,12 USD/tấn
    r("Indonesia", "2023-07-01", "MAGNESIUM SULPHATE BARANG BARU", "JIANGHE MINERAL PRODUCTS COMPANY LIMITED", "PT. SURYA KIMIA LESTARI", "CHINA", "INDONESIA", "57600", "0.12", "480000", "TNE"),
    r("Indonesia", "2023-07-02", "MAGNESIUM SULPHATE", "JIANGHE MINERAL PRODUCTS CO LTD", "PT SURYA KIMIA LESTARI", "CHINA", "INDONESIA", "160000", "160", "1000", "TNE"),
    // Bao 25 kg (đơn vị BAG) ⇒ suy luận khối lượng
    r("Peru", "2023-08-01", "SULFATO DE MAGNESIO 160 BOLSAS DE 25 KG", "QUIMICOS ANDINOS SAC", "AGROINSUMOS DEL SUR S.A.", "CHINA", "PERU", "4370", "27.31", "160", "BLE"),
    // TON mơ hồ
    r("Pakistan", "2023-09-01", "MAGNESIUM SULPHATE FOOD GRADE E518", "HUAXIN MINERAL GROUP CO.,LTD", "INDUS NUTRI FOODS (PVT) LTD", "CHINA", "PAKISTAN", "50000", "500", "100", "TON"),
    // Thiếu Trị giá ⇒ bổ sung = Đơn giá × Lượng
    r("Vietnam", "2023-10-01", "MAGNESIUM SULPHATE PHARMA BP", "ALTMANN PHARMA KG", "CONG TY CO PHAN DUOC PHAM MINH TAM", "GERMANY", "VIETNAM", "", "2500", "2", "TNE"),
    // THIOUREA: không được khớp từ khóa UREA
    r("Vietnam", "2023-10-05", "THIOUREA 99% INDUSTRIAL", "NORTHSTAR CHEM CO LTD", "CONG TY TNHH HOA CHAT KIM SON", "CHINA", "VIETNAM", "10000", "1000", "10", "TNE"),
    // Ngoài phạm vi: hàng khác lẫn vào dữ liệu
    r("Global Shipping", "2023-11-01", "ZINC SULPHATE MONOHYDRATE 33%", "TO THE ORDER", "CLEARWAVE HYGIENE LTD", "UNITED STATES", "CANADA", "0", "0", "200", "DR"),
  ];
}

export function rows2024() {
  return [
    r("Vietnam", "2024-02-01", "MAGNESIUM SULPHATE FERTILIZER GRANULAR", "BRIGHTPEAK MINERALS CO., LIMITED", "LAM HONG TRADING CO., LTD", "CHINA", "VIETNAM", "60000", "150", "400", "TNE"),
    r("Vietnam", "2024-02-02", "MAGNESIUM SULPHATE FERTILIZER GRANULAR", "GREENROOT ENTERPRISE LIMITED", "CÔNG TY TNHH PHÂN BÓN NAM PHONG", "CHINA", "VIETNAM", "30000", "150", "200", "TNE"),
    r("Vietnam", "2024-02-03", "MAGNESIUM SULPHATE FERTILIZER", "GREENROOT ENTERPRISE LIMITED", "AN BINH FERTILIZER COMPANY LIMITED", "CHINA", "VIETNAM", "15000", "150", "100", "TNE"),
    r("Vietnam", "2024-02-04", "MAGNESIUM SULPHATE FERTILIZER", "GREENROOT ENTERPRISE LIMITED", "BINH AN FERTILIZER COMPANY LIMITED", "CHINA", "VIETNAM", "15000", "150", "100", "TNE"),
    r("Indonesia", "2024-03-01", "MAGNESIUM SULPHATE", "JIANGHE MINERAL PRODUCTS COMPANY LIMITED", "PT SURYA KIMIA LESTARI CAB. MEDAN", "CHINA", "INDONESIA", "140000", "140", "1000", "TNE"),
    r("Russia", "2024-04-01", "МАГНИЙ СЕРНОКИСЛЫЙ", "ООО \"МИНЕРАЛ ТРЕЙД\"", "ООО \"АГРОСНАБ ВОСТОК\"", "CHINA", "RUSSIA", "36000", "180", "200", "TNE"),
    r("Russia", "2024-04-05", "MAGNESIUM SULPHATE", "MINERAL TREYD LLC", "OOO AGROSNAB VOSTOK", "CHINA", "RUSSIAN FEDERATION", "36000", "180", "200", "TNE"),
  ];
}

/** Workbook 1: sheet "2023_Data" (V17 không nhận vì \b), có 2 dòng tiêu đề báo cáo phía trên. */
export function buildWorkbookA() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["BÁO CÁO DỮ LIỆU NHẬP KHẨU (GIẢ LẬP)"], ["Nguồn: tổng hợp"], H, ...rows2023()]);
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
    [1, "FERTILIZER", "INDUSTRIAL", "PHARMA*", "UREA", "ZINC"],
    [2, "PHAN BON", "TECHNICAL GRADE", "FOOD GRADE", null, "ZINC SULPHATE"],
    [3, "AGRICULTURAL", "TEXTIL*", "BP", null, null],
    [4, "GRANULAR", "DYEING", "E518", null, null],
    [5, null, "-FERTILIZER", null, null, null],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "KW");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

/** Industry master kiểu V17: nhiều sheet, tiêu đề tiếng Anh, tên viết khác với tên chuẩn hóa mới. */
export function buildIndustryV17() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Purchaser_Standardize", "Purchasing Country", "Industry", "Industry Segment"], ["Trading Lam Hong", "VIETNAM", "Thương mại phân bón", "Phân bón"]]), "2023_All");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Purchaser_Standardize", "Purchasing Country", "Industry", "Industry Segment"], ["Surya Kimia Lestari", "INDONESIA", "Phân phối hóa chất", "Công nghiệp"]]), "2024_All");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

/* ═════════ DỮ LIỆU GIẢ LẬP NHIỀU NĂM (2020 – T10/2026) TRONG MỘT SHEET ═════════
   Dùng để kiểm thử: tách năm theo cột ngày, năm chưa trọn, xếp hạng cả giai đoạn. */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function buildMultiYearRows({ from = 2020, toYear = 2026, toMonth = 10, perMonth = 6, dateFormat = "iso" } = {}) {
  const rand = rng(42);
  const buyers = ["CONG TY TNHH NONG SAN BAC HA", "AGRO VINA SUPPLY CO., LTD", "CONG TY CO PHAN VAT TU DONG NAM", "MEKONG FERTILIZER JSC"];
  const sellers = ["BRIGHTPEAK MINERALS CO., LIMITED", "JIANGHE MINERAL PRODUCTS CO LTD", "ORVANTA MINERALS PRIVATE LIMITED"];
  const out = [];
  for (let y = from; y <= toYear; y++) {
    const lastM = y === toYear ? toMonth : 12;
    for (let m = 1; m <= lastM; m++) {
      for (let k = 0; k < perMonth; k++) {
        const d = 1 + Math.floor(rand() * 27);
        const dd = String(d).padStart(2, "0"), mm = String(m).padStart(2, "0");
        const date = dateFormat === "dmy" ? `${dd}/${mm}/${y}` : dateFormat === "mdy" ? `${mm}/${dd}/${y}` : `${y}-${mm}-${dd}`;
        const q = 50 + Math.round(rand() * 450);
        const p = 140 + Math.round(rand() * 60);
        out.push(["Vietnam", date, "28332100", rand() < 0.7 ? "MAGNESIUM SULPHATE FERTILIZER GRADE 50KG BAG" : "MAGNESIUM SULPHATE TECHNICAL GRADE", sellers[k % sellers.length], buyers[(k + m) % buyers.length], "CHINA", "VIETNAM", String(q * p), String(p), String(q), "TNE"]);
      }
    }
  }
  return out;
}
/** Một file, một sheet "Data" (không mang năm), dữ liệu 2020 – T10/2026, có thêm 3 dòng ngày lỗi. */
export function buildMultiYearWorkbook(opts = {}) {
  const rows = buildMultiYearRows(opts);
  rows.push(["Vietnam", "không rõ", "28332100", "MAGNESIUM SULPHATE", "BRIGHTPEAK MINERALS CO., LIMITED", "MEKONG FERTILIZER JSC", "CHINA", "VIETNAM", "1000", "100", "10", "TNE"]);
  rows.push(["Vietnam", null, "28332100", "MAGNESIUM SULPHATE", "BRIGHTPEAK MINERALS CO., LIMITED", "MEKONG FERTILIZER JSC", "CHINA", "VIETNAM", "1000", "100", "10", "TNE"]);
  rows.push(["Vietnam", "31/02/2024", "28332100", "MAGNESIUM SULPHATE", "BRIGHTPEAK MINERALS CO., LIMITED", "MEKONG FERTILIZER JSC", "CHINA", "VIETNAM", "1000", "100", "10", "TNE"]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([H, ...rows]), "Data");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}
