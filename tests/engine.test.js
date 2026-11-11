import { describe, it, expect, beforeAll } from "vitest";
import * as XLSX from "xlsx";
import { parseNumber, quantileInc, parseDate } from "../src/engine/numbers.js";
import { extractYear, normText, smartTitleCase } from "../src/engine/text.js";
import { resolveCountry } from "../src/engine/dict/countries.js";
import { lookupUnit } from "../src/engine/dict/units.js";
import { analyzeName, cleanDisplayName, compilePlaceholders, placeholderReason } from "../src/engine/names.js";
import { compileMatcher } from "../src/engine/steps/classify.js";
import { inferPackageKg } from "../src/engine/steps/price.js";
import { Engine } from "../src/engine/engine.js";
import * as X from "../src/engine/io/export.js";
import { STEPS } from "../src/engine/constants.js";
import { computeReview, REVIEW_CASES } from "../src/engine/review.js";
import { buildWorkbookA, buildWorkbookB, buildKeywords, buildIndustryV17, buildMultiYearWorkbook, buildMultiYearRows, H as HEADERS } from "./fixtures.js";

describe("Đọc số chịu lỗi", () => {
  it.each([
    ["1,234.56", 1234.56], ["1.234,56", 1234.56], ["12 500", 12500], ["$1,200", 1200], ["(123)", -123],
    ["12,5", 12.5], ["1.234.567", 1234567], ["2.5E3", 2500], [" 45,000.00 ", 45000], ["1200 USD", 1200],
  ])("%s → %d", (s, v) => expect(parseNumber(s)).toBeCloseTo(v, 6));
  it("chữ / trống → null", () => { expect(parseNumber("N/A")).toBeNull(); expect(parseNumber("")).toBeNull(); expect(parseNumber(null)).toBeNull(); });
});

describe("Tứ phân vị khớp Excel QUARTILE.INC", () => {
  it("1,2,3,4", () => { expect(quantileInc([1, 2, 3, 4], 0.25)).toBe(1.75); expect(quantileInc([1, 2, 3, 4], 0.75)).toBe(3.25); });
  it("n nhỏ không trả về max như V17", () => expect(quantileInc([10, 11, 12, 100], 0.75)).toBe(34));
});

describe("Nhận diện năm", () => {
  it.each([["2023", "2023"], ["2023_Data", "2023"], ["Data2023", "2023"], ["Y2024", "2024"], ["Urea_2022_Q1", "2022"], ["abc", null], ["120231", null]])("%s", (s, y) => expect(extractYear(s)).toBe(y));
});

describe("Quốc gia", () => {
  it.each([["DE", "Germany", "Châu Âu"], ["CA", "Canada", "Châu Mỹ"], ["BR", "Brazil", "Châu Mỹ"], ["IN", "India", "Châu Á"], ["Viet Nam", "Vietnam", "Châu Á"], ["Trung Quốc", "China", "Châu Á"], ["KOREA, REPUBLIC OF", "South Korea", "Châu Á"], ["TAIWAN(CN)", "Taiwan", "Châu Á"], ["Russian Federation (the)", "Russia", "Châu Âu"], ["TRINIDAD & TOBAGO", "Trinidad and Tobago", "Châu Mỹ"]])("%s → %s", (raw, name, cont) => {
    const c = resolveCountry(raw); expect(c.name).toBe(name); expect(c.continentLabel).toBe(cont);
  });
  it("Đông Nam Á chỉ cho 11 nước", () => { expect(resolveCountry("IN").isSEA).toBe(false); expect(resolveCountry("Viet Nam").isSEA).toBe(true); });
  it("UNKNOW = trống", () => expect(resolveCountry("UNKNOW").status).toBe("Trống"));
});

describe("Đơn vị", () => {
  it.each([["KGM", 0.001], ["Kgs.", 0.001], ["M.T.", 1], ["TONNE (METRIC TON)", 1], ["TONELADA METRICA", 1], ["LBS", 0.00045359237], ["Tấn", 1], ["KGL", 0.001]])("%s", (u, f) => expect(lookupUnit(u).factor).toBeCloseTo(f, 12));
  it("TON mơ hồ, BAG không phải khối lượng", () => { expect(lookupUnit("TON").factor).toBeNull(); expect(lookupUnit("TON").kind).toBe("Mơ hồ"); expect(lookupUnit("BAG").kind).toBe("Không phải khối lượng"); });
});

describe("Khóa so khớp tên DN", () => {
  const same = (a, b) => expect(analyzeName(a).coreKey).toBe(analyzeName(b).coreKey);
  const diff = (a, b) => expect(analyzeName(a).coreKey).not.toBe(analyzeName(b).coreKey);
  it("bí danh Việt–Anh", () => { same("CÔNG TY TNHH PHÂN BÓN NAM PHONG", "NAM PHONG FERTILIZER CO., LTD."); same("CONG TY TNHH MTV THUONG MAI MINH KHOA", "TRADING COMPANY LIMITED MINH KHOA"); });
  it("Đ và MTV", () => same("CÔNG TY TNHH MTV ĐẠI PHÁT", "DAI PHAT CO LTD"));
  it("PetroVietnam", () => same("TỔNG CÔNG TY PHÂN BÓN VÀ HÓA CHẤT DẦU KHÍ", "PETROVIETNAM FERTILIZER AND CHEMICALS CORPORATION"));
  it("thứ tự tên riêng có ý nghĩa", () => diff("AN BINH FERTILIZER", "BINH AN FERTILIZER"));
  it("chữ Kirin", () => same('ООО "ТК АГРОСНАБ"', "OOO TK AGROSNAB"));
  it("M/S tiền tố Ấn Độ", () => same("M/S ORVANTA LABS INTERNATIONAL GMBH", "ORVANTA-LABS INTERNATIONAL GMBH"));
  it("chi nhánh Indonesia gộp về DN chính", () => same("PT. SURYA KIMIA LESTARI CAB. MEDAN", "PT SURYA KIMIA LESTARI"));
  it("cờ nhiều DN trong một ô — không bắt nhầm PTE LTD", () => {
    expect(analyzeName("ABC CO LTD / XYZ JSC").flags).toContain("Có thể nhiều DN trong một ô");
    expect(analyzeName("SILVERLEAF INTERNATIONAL PTE LTD").flags).not.toContain("Có thể nhiều DN trong một ô");
  });
  it("tên hiển thị", () => {
    expect(cleanDisplayName("BASF SE")).toBe("BASF SE");
    expect(cleanDisplayName("CÔNG TY TNHH MTV ĐẠI PHÁT")).toBe("Công Ty TNHH MTV Đại Phát");
    expect(cleanDisplayName("ABC CHEMICALS CO.,LTD")).toBe("ABC Chemicals Co., Ltd.");
  });
});

describe("Placeholder", () => {
  const ph = compilePlaceholders(["DUMMY*"]);
  it.each(["TO THE ORDER OF ABC BANK", "", "N/A", "---", "NONE", "Theo lệnh của ngân hàng", "DUMMY COMPANY", "12345"])("'%s' là placeholder", (s) => expect(placeholderReason(s, ph)).toBeTruthy());
  it("tên Kirin không bị coi là trống", () => expect(placeholderReason('ООО "ТК АГРОСНАБ"', ph)).toBeNull());
});

describe("Từ khóa", () => {
  const kw = { segments: [{ name: "Urea", include: ["UREA"], exclude: [] }, { name: "Phân bón", include: ["FERTILIZER", "PHAN BON", "GRANULAR"], exclude: ["FEED GRADE"] }, { name: "Công nghiệp", include: ["GALVANIZ*", "INDUSTRIAL"], exclude: [] }], exclusions: ["ZINC"] };
  it("từ nguyên vẹn: THIOUREA ≠ UREA", () => expect(compileMatcher(kw, "word").find("THIOUREA 99%").seg).toBeNull());
  it("chế độ chứa chuỗi giữ hành vi V17", () => expect(compileMatcher(kw, "substring").find("THIOUREA 99%").seg).toBe("Urea"));
  it("không dấu khớp có dấu", () => expect(compileMatcher(kw).find("Phân bón magie sunfat").seg).toBe("Phân bón"));
  it("tiền tố *", () => expect(compileMatcher(kw).find("FOR GALVANIZING BATH").seg).toBe("Công nghiệp"));
  it("loại trừ riêng", () => expect(compileMatcher(kw).find("FERTILIZER FEED GRADE").seg).toBeNull());
  it("cột LOẠI TRỪ ⇒ ngoài phạm vi", () => expect(compileMatcher(kw).find("ZINC SULPHATE 33%").seg).toBe("Ngoài phạm vi sản phẩm"));
  it("nhiều từ khóa thắng", () => expect(compileMatcher(kw).find("INDUSTRIAL FERTILIZER GRANULAR").seg).toBe("Phân bón"));
});

describe("Suy luận khối lượng bao bì", () => {
  it.each([["SULFATO DE MAGNESIO 160 BOLSAS DE 25 KG", "BLE", 25], ["MAGNESIUM SULPHATE 25KG/BAG", "BAG", 25], ["MGSO4 (500G/BOTTLE)", "BTL", 0.5], ["P.A. X 1 KG", "FRC", 1], ["REF 402117-2.5KG", "UNT", 2.5], ["50 LBS EACH", "BAG", 22.6796]])("%s", (d, u, kg) => expect(inferPackageKg(d, u).kg).toBeCloseTo(kg, 3));
  it("không suy luận khi không có khối lượng", () => expect(inferPackageKg("MAGNESIUM SULPHATE", "BAG")).toBeNull());
});

/* ═════════ KIỂM THỬ TOÀN TRÌNH ═════════ */
describe("Toàn trình trên dữ liệu có bẫy", () => {
  let e;
  const col = (yr, c) => e.years.find((y) => y.year === yr).cols[c];
  const findRow = (yr, pred) => { const y = e.years.find((x) => x.year === yr); for (let i = 0; i < y.n; i++) if (pred(y, i)) return i; return -1; };
  const raw = (y, f, i) => y.rows[i][y.map[f]];

  beforeAll(() => {
    e = new Engine();
    const res = e.addFiles([{ name: "TongHop_GiaLap.xlsx", buffer: buildWorkbookA() }, { name: "Data2024.xlsx", buffer: buildWorkbookB() }]);
    expect(res.errors).toEqual([]);
    e.confirmSources([]);
    e.confirmSchema();
    e.loadKeywords(buildKeywords(), "kw.xlsx");
    for (const s of ["quality", "entity", "backfill", "units", "validate", "ranking"]) e.runStep(s);
    e.loadIndustry(buildIndustryV17(), "industry_v17.xlsx");
    for (const s of ["industry", "classify", "iqr", "metrics"]) e.runStep(s);
  });

  it("nhận năm từ '2023_Data' và từ tên file 'Data2024'; bỏ sheet Notes", () => {
    expect(e.years.map((y) => y.year)).toEqual(["2023", "2024"]);
    expect(e.sources.find((s) => s.sheet === "Notes").include).toBe(false);
  });
  it("dò dòng tiêu đề ở dòng 3 và giữ số dòng Excel gốc", () => {
    expect(e.sources.find((s) => s.sheet === "2023_Data").headerRowNo).toBe(3);
    expect(e.years[0].rowNum[0]).toBe(4);
  });
  it("tự ánh xạ đúng 'Unit' và 'Unit Price ($)' (V17 nhận nhầm)", () => {
    expect(e.schema.perYear["2023"].unit).toBe("Unit");
    expect(e.schema.perYear["2023"].unitPrice).toBe("Unit Price ($)");
    expect(e.schema.perYear["2023"].dataSource).toBe("Data Source");
  });
  it("bổ sung trị giá nhưng không ghi đè dữ liệu gốc", () => {
    const y = e.years[0];
    const i = findRow("2023", (y, i) => String(raw(y, "purchaser", i)).includes("DUOC PHAM"));
    expect(raw(y, "totalValue", i)).toBeNull();
    expect(col("2023", "TotalValue_Clean")[i]).toBe(5000);
    expect(col("2023", "Backfill_Field")[i]).toBe("Trị giá");
  });
  it("gộp bí danh Việt–Anh + 'Viet Nam'/'VN' thành một DN, mã nhóm thống nhất giữa các năm", () => {
    const y23 = e.years[0], y24 = e.years[1];
    const ids = new Set();
    for (let i = 0; i < y23.n; i++) if (/LAM HONG|LAM HỒNG/i.test(String(raw(y23, "purchaser", i)))) ids.add(col("2023", "Purchaser_Entity_ID")[i]);
    for (let i = 0; i < y24.n; i++) if (/LAM HONG/i.test(String(raw(y24, "purchaser", i)))) ids.add(col("2024", "Purchaser_Entity_ID")[i]);
    expect(ids.size).toBe(1);
  });
  it("không gộp 'An Bình' với 'Bình An'", () => {
    const a = findRow("2024", (y, i) => String(raw(y, "purchaser", i)).startsWith("AN BINH"));
    const b = findRow("2024", (y, i) => String(raw(y, "purchaser", i)).startsWith("BINH AN"));
    expect(col("2024", "Purchaser_Entity_ID")[a]).not.toBe(col("2024", "Purchaser_Entity_ID")[b]);
  });
  it("gộp tên Kirin với tên Latin", () => {
    const y = e.years[1];
    const ids = new Set(); for (let i = 0; i < y.n; i++) if (/AGROSNAB|АГРОСНАБ/.test(String(raw(y, "purchaser", i)))) ids.add(col("2024", "Purchaser_Entity_ID")[i]);
    expect(ids.size).toBe(1);
  });
  it("placeholder & ô trống KHÔNG vào bảng xếp hạng (V17 xếp '(Placeholder)' và 'TO THE ORDER OF…' vào Top)", () => {
    const list = e.rankings.years["2023"].P_ALL.list;
    const names = list.map((r) => e.entities.Purchaser.entities[r.e].name.toUpperCase());
    expect(names.some((n) => n.includes("ORDER") || n.includes("PLACEHOLDER") || n.includes("KHÔNG XÁC ĐỊNH"))).toBe(false);
    expect(e.rankings.years["2023"].P_ALL.phValue).toBeGreaterThan(1_000_000);
  });
  it("phạm vi Việt Nam nhận cả 'Viet Nam' và 'VN'", () => {
    const vn = e.rankings.years["2023"].P_VN.list.map((r) => e.entities.Purchaser.entities[r.e].name);
    expect(vn.some((n) => /Lam Hong/i.test(n))).toBe(true);
  });
  it("mã ISO2 'DE' → Châu Âu", () => {
    const i = findRow("2023", (y, i) => raw(y, "countryOrigin", i) === "DE");
    expect(col("2023", "Supplier_Continent")[i]).toBe("Châu Âu");
  });
  it("phát hiện trùng nguồn (nguồn tổng hợp ↔ hải quan nước mua) và không cộng vào xếp hạng", () => {
    const i = findRow("2023", (y, i) => raw(y, "dataSource", i) === "Asia Trade Hub");
    expect(col("2023", "Cross_Source_Dup")[i]).toMatch(/Trùng với nguồn "Vietnam"/);
    expect(Number.isNaN(col("2023", "Row_Ranking_Value")[i])).toBe(true);
  });
  it("quy đổi bao 25 kg từ mô tả và để TON mơ hồ chưa quy đổi", () => {
    const i = findRow("2023", (y, i) => raw(y, "unit", i) === "BLE");
    expect(col("2023", "Quantity_MT")[i]).toBeCloseTo(4, 6);
    const j = findRow("2023", (y, i) => raw(y, "unit", i) === "TON");
    expect(col("2023", "Unit_Status")[j]).toMatch(/Mơ hồ/);
  });
  it("giá/tấn phi lý (480.000 'TNE' = kg) bị đánh dấu và loại khỏi chỉ số", () => {
    const i = findRow("2023", (y, i) => String(raw(y, "quantity", i)) === "480000");
    expect(col("2023", "Price_Sanity")[i]).toMatch(/phi lý/);
    expect(col("2023", "Final_Included")[i]).toBe("Không");
  });
  it("THIOUREA không bị xếp vào phân khúc Urea; hàng khác (kẽm sunfat) ngoài phạm vi", () => {
    const i = findRow("2023", (y, i) => String(raw(y, "productDesc", i)).startsWith("THIOUREA"));
    expect(col("2023", "Keyword_Segment")[i]).not.toBe("Urea test");
    const j = findRow("2023", (y, i) => String(raw(y, "productDesc", i)).startsWith("ZINC"));
    expect(col("2023", "Final_Segment")[j]).toBe("Ngoài phạm vi sản phẩm");
  });
  it("Industry Master kiểu V17 (nhiều sheet, tên cũ) vẫn khớp", () => {
    expect(e.results.industry.entitiesMatched).toBe(2);
    const i = findRow("2024", (y, i) => String(raw(y, "purchaser", i)).includes("SURYA KIMIA"));
    expect(col("2024", "Industry_Segment")[i]).toBe("Công nghiệp");
  });
  it("chạy lại bước 4 (chuẩn hóa doanh nghiệp) xóa kết quả các bước sau (không còn dữ liệu lệch pha)", () => {
    e.updateSettings({ fuzzyEnabled: false });
    expect(e.stepState("ranking")).toBe("pending");
    expect(e.years[0].cols.Final_Segment).toBeUndefined();
    expect(e.years[0].cols.Quantity_MT).toBeUndefined(); // bước 6 nằm sau bước 4 ⇒ phải chạy lại
    expect(e.years[0].cols.Cross_Source_Dup).toBeUndefined();
    expect(e.years[0].cols.Duplicate_Flag).toBeDefined(); // bước 3 vẫn giữ
    e.runAll();
    expect(e.stepState("metrics")).toBe("done");
  });
  it("xuất đủ các file", () => {
    const a = X.buildAuditWorkbook(e);
    const wb = XLSX.read(new Uint8Array(a.buffer), { type: "array" });
    expect(wb.SheetNames.length).toBe(19);
    expect(wb.SheetNames).toContain("17_Từ điển cột");
    const d = XLSX.read(new Uint8Array(X.buildDetailWorkbook(e, "2023").buffer), { type: "array" });
    const hdr = XLSX.utils.sheet_to_json(d.Sheets[d.SheetNames[0]], { header: 1 })[0];
    expect(hdr).toContain("Đơn giá (USD/tấn)");
    expect(hdr).toContain("Lượng (tấn)");
    expect(hdr).toContain("Nguồn - Dòng Excel");
    for (const k of ["P_ALL", "P_VN", "P_CONT", "S_ALL", "S_VN", "S_CONT"]) expect(X.buildResearchWorkbook(e, k).buffer.byteLength).toBeGreaterThan(1000);
    const m = XLSX.read(new Uint8Array(X.buildResearchMasterWorkbook(e).buffer), { type: "array" });
    expect(XLSX.utils.sheet_to_json(m.Sheets[m.SheetNames[0]]).length).toBeGreaterThan(0);
  });
  it("bước 15: thống kê trường hợp rà soát khớp kết quả các bước & xuất tệp rà soát", () => {
    const R = computeReview(e);
    expect(R.ready).toBe(true);
    const c = Object.fromEntries(R.cases.map((x) => [x.id, x]));
    const outScope = Object.values(e.results.classify.years).reduce((a, y) => a + y.outOfScope, 0);
    expect(c.R01.rows).toBe(outScope);
    expect(c.R03.rows).toBe(e.results.validate.crossSource.rows);
    expect(c.R06.rows).toBe(Object.values(e.results.units.years).reduce((a, y) => a + y.insane, 0));
    expect(c.R09.rows).toBe(Object.values(e.results.validate.years).reduce((a, y) => a + y.bad, 0));
    const wb = XLSX.read(new Uint8Array(X.buildDataReviewWorkbook(e).buffer), { type: "array" });
    expect(wb.SheetNames.slice(0, 3)).toEqual(["00_Hướng dẫn", "01_Đối chiếu chéo", "02_Tổng hợp theo năm"]);
    const r01 = wb.SheetNames.find((n) => n.startsWith("R01_"));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[r01]);
    expect(rows.length).toBe(c.R01.rows);
    const hdr = XLSX.utils.sheet_to_json(wb.Sheets[r01], { header: 1 })[0];
    expect(hdr).toContain("Quyết định (Giữ / Loại / Sửa)");
    expect(hdr).toContain("Đơn giá gốc quy đổi (USD/tấn)");
  });
});

describe("Quy trình mới: làm sạch trước, đối chiếu sau", () => {
  it("thứ tự bước: chuẩn hóa doanh nghiệp → bổ sung số liệu → quy đổi đơn vị → đối chiếu → … → xuất → rà soát", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["upload", "schema", "quality", "entity", "backfill", "units", "validate", "ranking", "industry", "keywords", "classify", "iqr", "metrics", "export", "review"]);
    expect(STEPS.map((s) => s.no)).toEqual(STEPS.map((_, i) => i + 1));
    expect(REVIEW_CASES.length).toBeGreaterThanOrEqual(15);
  });
  it("trùng nguồn nhận được cả khi hai nguồn ghi khác đơn vị (25.000 KGM ≡ 25 TNE) & đối chiếu dùng giá USD/tấn", () => {
    const aoa = [HEADERS,
      ["Vietnam Customs", "2024-03-02", "28332100", "MAGNESIUM SULPHATE 25KG BAG", "KOVALIS CHEMIE GMBH", "CONG TY TNHH LAM HONG", "GERMANY", "VIETNAM", 7500, 0.3, 25000, "KGM"],
      ["Germany Export", "2024-03-05", "28332100", "MAGNESIUM SULPHATE", "KOVALIS CHEMIE GMBH", "LAM HONG CO., LTD.", "GERMANY", "VIETNAM", 7500, 300, 25, "TNE"],
      ["Vietnam Customs", "2024-05-02", "28332100", "MAGNESIUM SULPHATE", "KOVALIS CHEMIE GMBH", "CONG TY TNHH LAM HONG", "GERMANY", "VIETNAM", 9000, 7000000, 30, "TNE"],
      ["Vietnam Customs", "2024-06-02", "28332100", "MAGNESIUM SULPHATE", "NORTHSTAR CHEM", "CONG TY TNHH KIM SON", "CHINA", "VIETNAM", 6000, 300, 20, "TNE"],
    ];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "2024");
    const e = new Engine();
    e.addFiles([{ name: "x.xlsx", buffer: XLSX.write(wb, { type: "array", bookType: "xlsx" }) }]);
    e.confirmSources([]); e.confirmSchema();
    for (const s of ["quality", "entity", "backfill", "units", "validate"]) e.runStep(s);
    const y = e.years[0];
    expect(e.results.validate.crossSource.rows).toBe(1);
    expect(y.cols.Cross_Source_Dup[1]).toMatch(/Trùng với nguồn "Vietnam Customs"/);
    // dòng 3: Đơn giá ghi theo nội tệ ⇒ lệch; giá gốc quy đổi khác hẳn giá USD/tấn
    expect(y.cols.Value_Check[2]).toBe("Lệch vượt ngưỡng");
    expect(y.cols.UnitPrice_per_MT[2]).toBeCloseTo(300, 0);
    expect(y.cols.UnitPrice_Orig_per_MT[2]).toBeCloseTo(7000000, 0);
    expect(y.cols.UnitPrice_Orig_per_MT[0]).toBeCloseTo(300, 0);
  });
});

/* ═════════ HỒ SƠ SẢN PHẨM & TÙY BIẾN THEO Ý ĐỒ PHÂN KHÚC ═════════ */
import { readdirSync, readFileSync } from "node:fs";
import { normalizeProfile } from "../src/engine/profile.js";
import { buildKeywordSet, testKeywords } from "../src/engine/steps/keywords.js";

const fresh = () => {
  const e = new Engine();
  e.addFiles([{ name: "TongHop_GiaLap.xlsx", buffer: buildWorkbookA() }, { name: "Data2024.xlsx", buffer: buildWorkbookB() }]);
  e.confirmSources([]); e.confirmSchema();
  return e;
};
const DEF = {
  segments: [
    { name: "Phân bón", include: ["FERTILIZER", "PHAN BON", "AGRICULTURAL"], exclude: ["FEED GRADE"] },
    { name: "Công nghiệp", include: ["INDUSTRIAL", "GALVANIZ*", "TECH GRADE"] },
  ],
  exclusions: ["ZINC SULPHATE", "ZINC"],
};

describe("Hồ sơ sản phẩm", () => {
  it("mọi hồ sơ trong thư viện profiles/ (nếu có) đều hợp lệ và id không trùng", () => {
    const dir = new URL("../profiles/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const ids = new Set();
    for (const f of files) {
      const p = normalizeProfile(JSON.parse(readFileSync(new URL(f, dir), "utf8")), { origin: "library" });
      expect(ids.has(p.id)).toBe(false); ids.add(p.id);
      expect(p.segments.length).toBeGreaterThan(0);
    }
  });
  it("từ chối file không phải hồ sơ, bỏ thiết lập sai miền giá trị", () => {
    expect(() => normalizeProfile({ foo: 1 })).toThrow();
    expect(() => normalizeProfile({ format: "chemseg-profile", segments: [] })).toThrow(/tên/);
    const p = normalizeProfile({ format: "chemseg-profile", name: "X", settings: { topThreshold: 7, outlierRule: "ZZZ", iqrLog: 1, bogus: 3, priceBandMin: 500, priceBandMax: 100 } });
    expect(p.settings.topThreshold).toBeUndefined();
    expect(p.settings.outlierRule).toBeUndefined();
    expect(p.settings.iqrLog).toBe(true);
    expect(p.settings.priceBandMin).toBeUndefined();
    expect(p._warnings.length).toBeGreaterThanOrEqual(4);
  });
  it("đọc được file 'Lưu cấu hình' kiểu cũ", () => {
    const p = normalizeProfile({ app: "ChemSeg Analyst", settings: { projectName: "Urea", topThreshold: 0.7 }, keywords: { segments: DEF.segments, exclusions: DEF.exclusions } });
    expect(p.name).toBe("Urea"); expect(p.settings.topThreshold).toBe(0.7); expect(p.segments.length).toBe(2);
  });
  it("áp dụng hồ sơ: thiết lập = mặc định + hồ sơ (không dính hồ sơ trước), nạp phân khúc, làm mới bước bị ảnh hưởng", () => {
    const e = fresh();
    e.applyProfile({ format: "chemseg-profile", name: "A", settings: { topThreshold: 0.6, iqrLog: true }, segments: DEF.segments, exclusions: DEF.exclusions });
    expect(e.settings.topThreshold).toBe(0.6);
    expect(e.stepState("keywords")).toBe("done");
    e.runAll();
    expect(e.stepState("metrics")).toBe("done");
    const r = e.applyProfile({ format: "chemseg-profile", name: "B", settings: { rankingMetric: "volume" }, segments: [{ name: "Tất cả", include: ["MAGNESIUM"] }] });
    expect(e.settings.topThreshold).toBe(0.8);       // về mặc định
    expect(e.settings.iqrLog).toBe(false);
    expect(r.invalidatedFrom).toBe("ranking");
    expect(e.stepState("ranking")).toBe("pending");
    expect(e.stepState("units")).toBe("done");      // các bước trước không bị ảnh hưởng
    expect(e.getState().profile.name).toBe("B");
    expect(e.getState().profile.modified).toBe(false);
    e.updateSettings({ topThreshold: 0.5 });
    expect(e.getState().profile.modified).toBe(true);
    e.updateSettings({ headerLanguage: "en" });      // tùy chọn xuất file không làm "sửa" hồ sơ
  });
  it("đóng gói ⇄ áp dụng lại cho ra cùng cấu hình (gồm từ điển DN & Industry Master)", () => {
    const e = fresh();
    e.setKeywords(DEF);
    e.loadIndustry(buildIndustryV17(), "ind.xlsx");
    e.updateSettings({ priceBandMin: 50, priceBandMax: 5000, segmentBasis: "industry_first" });
    const p = e.buildProfile({ name: "Thử nghiệm", product: "MgSO4", hsCodes: ["283321"] });
    expect(p.industry.length).toBeGreaterThan(0);
    const e2 = fresh();
    e2.applyProfile(JSON.parse(JSON.stringify(p)));
    expect(e2.settings.priceBandMax).toBe(5000);
    expect(e2.settings.segmentBasis).toBe("industry_first");
    expect(e2.getKeywords().segments).toEqual(e.getKeywords().segments);
    expect(e2.getKeywords().exclusions).toEqual(e.getKeywords().exclusions);
    expect(e2.refs.industry.entries.length).toBe(e.refs.industry.entries.length);
    const f = X.exportProject(e);
    const e3 = fresh();
    X.importProject(e3, f.buffer);
    expect(e3.getKeywords().segments.map((s) => s.name)).toEqual(["Phân bón", "Công nghiệp"]);
  });
});

describe("Bộ phân khúc soạn trên giao diện", () => {
  it("chuẩn hóa: bỏ trống/trùng, '-' trong danh sách là loại trừ riêng, báo xung đột", () => {
    const kw = buildKeywordSet({ segments: [{ name: " A ", include: ["X", "x", "", "-Y", "Z\nW"] }, { name: "B", include: ["X"] }] });
    expect(kw.segments[0].name).toBe("A");
    expect(kw.segments[0].include).toEqual(["X", "Z", "W"]);
    expect(kw.segments[0].exclude).toEqual(["Y"]);
    expect(kw.conflicts.length).toBe(1);
    expect(() => buildKeywordSet({ segments: [{ name: "A" }, { name: "a" }] })).toThrow(/trùng/);
  });
  it("thử nhanh một mô tả", () => {
    expect(testKeywords(DEF, "Phân bón MgSO4 16%").segment).toBe("Phân bón");
    expect(testKeywords(DEF, "ZINC SULPHATE MONOHYDRATE").segment).toBe("Ngoài phạm vi sản phẩm");
  });
  it("xem trước độ phủ & gợi ý từ khóa không làm thay đổi kết quả đang có", () => {
    const e = fresh();
    e.setKeywords(DEF);
    e.runAll();
    const before = e.results.classify;
    const pv = e.previewKeywords({ segments: [{ name: "Phân bón", include: ["FERTILIZER"] }] });
    expect(pv.totals.rows).toBe(e.years.reduce((a, y) => a + y.n, 0));
    expect(pv.totals.matchedRows + pv.totals.outRows + pv.totals.unRows).toBe(pv.totals.rows);
    expect(Array.isArray(pv.suggestions)).toBe(true);
    for (const s of pv.suggestions) { expect(s.term).not.toMatch(/^(KG|BAG|NET|THE)$/); expect(s.term).not.toBe("FERTILIZER"); }
    expect(e.results.classify).toBe(before);
    expect(e.stepState("metrics")).toBe("done");
  });
});

describe("Tùy biến theo ý đồ phân khúc", () => {
  const segOf = (e, yr, pred) => { const y = e.years.find((x) => x.year === yr); for (let i = 0; i < y.n; i++) if (pred(y, i)) return [y.cols.Final_Segment[i], y.cols.Segment_Method[i]]; return null; };
  it("khớp theo mã HS: từ khóa 2833* chỉ có tác dụng khi chọn 'Mô tả + mã HS'", () => {
    const e = fresh();
    e.setKeywords({ segments: [{ name: "Theo HS 2833", include: ["2833*"] }] });
    e.runAll();
    expect(e.results.classify.years["2023"].keyword).toBe(0);
    e.updateSettings({ keywordFields: "desc_hs" });
    e.runAll();
    expect(e.results.classify.years["2023"].keyword).toBe(e.years.find((y) => y.year === "2023").n);
  });
  it("ưu tiên ngành DN trước từ khóa / chỉ theo từ khóa", () => {
    const e = fresh();
    e.setKeywords(DEF);
    for (const s of ["quality", "entity", "backfill", "units", "validate", "ranking"]) e.runStep(s);
    e.loadIndustry(buildIndustryV17(), "ind.xlsx");
    e.runAll();
    const kwFirst = e.results.classify.years["2023"];
    e.updateSettings({ segmentBasis: "industry_first" });
    e.runAll();
    const indFirst = e.results.classify.years["2023"];
    expect(indFirst.industry).toBeGreaterThanOrEqual(kwFirst.industry);
    expect(indFirst.keyword + indFirst.industry).toBe(kwFirst.keyword + kwFirst.industry);
    e.updateSettings({ segmentBasis: "keyword_only" });
    e.runAll();
    expect(e.results.classify.years["2023"].industry).toBe(0);
    e.updateSettings({ segmentBasis: "industry_only" });
    e.runAll();
    const io = e.results.classify.years["2023"];
    expect(io.keyword).toBe(0);
    expect(io.outOfScope).toBe(kwFirst.outOfScope);   // cột LOẠI TRỪ vẫn có hiệu lực
  });
  it("khoảng giá hợp lý thủ công thay cho ngưỡng tự động", () => {
    const e = fresh();
    e.setKeywords(DEF);
    e.runAll();
    const auto = e.results.units.years["2024"].insane;
    e.updateSettings({ priceBandMin: 150, priceBandMax: 260 });
    e.runStep("units");
    expect(e.results.units.sanity.low).toBe(150);
    expect(e.results.units.sanity.mode).toBe("Thủ công");
    expect(e.results.units.years["2024"].insane).toBeGreaterThan(auto);
  });
});

/* ═════════ NHIỀU NĂM & NĂM CHƯA TRỌN (vd 2020 – T10/2026) ═════════ */
import { PERIOD, queryRanking } from "../src/engine/views.js";
import { parseDate, detectDateOrder } from "../src/engine/numbers.js";

describe("Nhiều năm trong một sheet & năm chưa trọn", () => {
  let e;
  beforeAll(() => {
    e = new Engine();
    e.addFiles([{ name: "DuLieu_TongHop.xlsx", buffer: buildMultiYearWorkbook() }]);
  });
  it("nhận ra sheet chứa 2020–2026 và đề xuất tách theo cột ngày", () => {
    const s = e.sourceSummary()[0];
    expect(s.year).toBe("__date");
    expect(s.include).toBe(true);
    expect(s.split.years.map((x) => x.year)).toEqual(["2020", "2021", "2022", "2023", "2024", "2025", "2026"]);
    expect(s.split.invalid).toBe(3);
  });
  it("tách đúng số dòng từng năm, báo dòng không đọc được ngày", () => {
    const r = e.confirmSources([]);
    expect(e.years.map((y) => y.year)).toEqual(["2020", "2021", "2022", "2023", "2024", "2025", "2026"]);
    expect(e.years.find((y) => y.year === "2021").n).toBe(72);
    expect(e.years.find((y) => y.year === "2026").n).toBe(60);
    expect(r.dropped[0].rows).toBe(3);
    // số dòng Excel gốc được giữ để truy vết
    expect(e.years[0].rowNum[0]).toBe(2);
  });
  it("nhận biết năm chưa đủ 12 tháng và gắn nhãn", () => {
    e.confirmSchema();
    const st = e.getState();
    expect(st.years.find((y) => y.year === "2026").label).toBe("2026 (T1–T10)");
    expect(st.years.find((y) => y.year === "2025").label).toBe("2025");
    expect(st.years.find((y) => y.year === "2026").coverage.lastMonth).toBe(10);
    expect(st.period).toBe("2020 – T10/2026");
  });
  it("xếp hạng cả giai đoạn & xuất file có sheet cả giai đoạn", () => {
    e.setKeywords({ segments: [{ name: "Phân bón", include: ["FERTILIZER"] }, { name: "Công nghiệp", include: ["TECHNICAL GRADE"] }] });
    e.runAll();
    expect(e.stepState("metrics")).toBe("done");
    const per = e.rankings.period.P_ALL;
    const sumYears = e.years.reduce((a, y) => a + e.rankings.years[y.year].P_ALL.total, 0);
    expect(per.total).toBeCloseTo(sumYears, 6);
    const q = queryRanking(e, { year: PERIOD, scope: "P_ALL" });
    expect(q.rows.length).toBe(4);
    const wb = XLSX.read(new Uint8Array(X.buildResearchWorkbook(e, "P_ALL").buffer), { type: "array" });
    expect(wb.SheetNames).toContain("Cả giai đoạn");
    expect(wb.SheetNames.length).toBe(8);
    const a = XLSX.read(new Uint8Array(X.buildAuditWorkbook(e).buffer), { type: "array" });
    const ov = XLSX.utils.sheet_to_json(a.Sheets["01_Tổng quan"], { header: 1 });
    expect(ov[0]).toContain("2026 (T1–T10)");
    const guide = XLSX.utils.sheet_to_json(a.Sheets["00_Hướng dẫn"], { header: 1 }).map((r) => r.join(" ")).join("\n");
    expect(guide).toMatch(/2020 – T10\/2026/);
  });
});

describe("Đọc ngày & file CSV", () => {
  it("xác định thứ tự ngày/tháng theo cả cột", () => {
    expect(detectDateOrder(["01/13/2024", "02/02/2024"])).toBe("mdy");
    expect(detectDateOrder(["13/01/2024", "02/02/2024"])).toBe("dmy");
    expect(parseDate("02/03/2024", "mdy").toISOString().slice(0, 10)).toBe("2024-02-03");
    expect(parseDate("02/03/2024").toISOString().slice(0, 10)).toBe("2024-03-02");
    expect(parseDate(20240315).toISOString().slice(0, 10)).toBe("2024-03-15");
    expect(parseDate("T10/2026").toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(parseDate(2024)).toBeNull();
  });
  it("CSV ngày kiểu Mỹ (tháng/ngày) vẫn tách năm & tính kỳ đúng", () => {
    const rows = buildMultiYearRows({ from: 2024, toYear: 2025, toMonth: 9, perMonth: 3, dateFormat: "mdy" });
    const csv = "\uFEFF" + [HEADERS, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const e = new Engine();
    e.addFiles([{ name: "export.csv", buffer: new TextEncoder().encode(csv).buffer }]);
    expect(e.sourceSummary()[0].year).toBe("__date");
    e.confirmSources([]); e.confirmSchema();
    expect(e.years.map((y) => y.year)).toEqual(["2024", "2025"]);
    expect(e.getState().years[1].label).toBe("2025 (T1–T9)");
    e.runStep("quality");
    expect(e.results.quality.years["2025"].date.order).toBe("mdy");
    // số trong CSV giữ dạng chữ nhưng vẫn đọc được
    e.runStep("entity"); e.runStep("backfill");
    expect(e.years[0].cols.TotalValue_Clean[0]).toBeGreaterThan(0);
  });
  it("sheet mang tên năm, chỉ vài dòng ngày lệch năm ⇒ giữ theo tên sheet (không tách)", () => {
    const rows = buildMultiYearRows({ from: 2023, toYear: 2023, toMonth: 12, perMonth: 4 });
    rows[0][1] = "2022-12-30";
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADERS, ...rows]), "2023");
    const e = new Engine();
    e.addFiles([{ name: "x.xlsx", buffer: XLSX.write(wb, { type: "array", bookType: "xlsx" }) }]);
    const s = e.sourceSummary()[0];
    expect(s.year).toBe("2023");
    expect(s.note).toMatch(/tên trang tính/);
  });
});
