/* ═══════════════════════════════════════════════════════════════
   TỪ ĐIỂN ĐƠN VỊ — quy đổi về TẤN (MT)
   factor = số tấn tương ứng 1 đơn vị gốc
   ═══════════════════════════════════════════════════════════════ */
import { normText } from "../text.js";

export const UNIT_KIND = {
  MASS: "Khối lượng",
  AMBIGUOUS: "Mơ hồ",
  NON_MASS: "Không phải khối lượng",
  UNKNOWN: "Chưa có trong từ điển",
  BLANK: "Trống",
};

const GROUPS = [
  { factor: 1, label: "Tấn (metric ton)", keys: ["TNE", "MT", "MTS", "M T", "MTON", "M TON", "TONNE", "TONNES", "METRIC TON", "METRIC TONS", "METRIC TONNE", "METRIC TONNES", "TONNE METRIC TON", "TON METRIC", "TONS METRIC", "MET TON", "MET TONS", "TAN", "TAN METRIC", "1000 KG", "1000 KGS", "1000KG", "KTO", "TONELADA", "TONELADAS", "TONELADA METRICA", "TONELADAS METRICAS", "TONNE METRIQUE", "TM", "TON METRIK"] },
  { factor: 0.001, label: "Kilogram", keys: ["KGM", "KG", "KGS", "KILO", "KILOS", "KILOGRAM", "KILOGRAMS", "KILOGRAMME", "KILOGRAMMES", "KILOGAM", "KI LO GAM", "KG NET", "NET KG", "K G", "KGL", "KGN", "KILOGRAMO", "KILOGRAMOS", "KILOGRAMA", "KILOGRAMAS", "QUILOGRAMA", "QUILOGRAMAS", "KILO NETO", "KILOS NETOS", "KG BRUTO"] },
  { factor: 0.000001, label: "Gram", keys: ["GRM", "G", "GR", "GRS", "GRAM", "GRAMS", "GRAMME", "GRAMMES", "GAM", "GRAMO", "GRAMOS", "GRAMA", "GRAMAS"] },
  { factor: 0.00045359237, label: "Pound (lb)", keys: ["LBR", "LB", "LBS", "POUND", "POUNDS"] },
  { factor: 0.90718474, label: "Short ton (Mỹ)", keys: ["STN", "SHORT TON", "SHORT TONS", "US TON", "US TONS", "NET TON", "NET TONS"] },
  { factor: 1.0160469088, label: "Long ton (Anh)", keys: ["LTN", "LONG TON", "LONG TONS", "UK TON", "UK TONS", "GROSS TON", "GROSS TONS", "IMPERIAL TON"] },
  { factor: 0.1, label: "Tạ (100 kg)", keys: ["QTL", "QNT", "QUINTAL", "QUINTALS", "TA", "DTN", "DECITONNE"] },
  { factor: 0.05, label: "Bao 50 kg (quy ước)", keys: ["BAG 50KG", "BAG 50 KG", "BAGS 50KG", "50KG BAG", "50 KG BAG"] },
];
const AMBIGUOUS = ["TON", "TONS", "T", "TN"];
const NON_MASS = [
  "LTR", "L", "LT", "LITRE", "LITRES", "LITER", "LITERS", "LIT", "LIT", "MLT", "ML", "KLT", "HLT",
  "MTQ", "M3", "CBM", "CUBIC METER", "CUBIC METRE", "M 3",
  "PCE", "PCS", "PC", "PIECE", "PIECES", "CAI", "CHIEC", "UNIT", "UNITS", "NAR", "C62", "EA", "EACH",
  "SET", "SETS", "BO", "BAG", "BAGS", "BAO", "DRUM", "DRUMS", "PHUY", "CARTON", "CARTONS", "CTN", "CTNS", "THUNG",
  "PALLET", "PALLETS", "PK", "PKG", "PKGS", "PACKAGE", "PACKAGES", "BOX", "BOXES", "HOP", "ROLL", "ROLLS", "CUON",
  "TANK", "ISO TANK", "CONTAINER", "CONT", "TEU", "FEU", "BOTTLE", "BOTTLES", "CHAI", "CAN", "CANS",
  "M2", "MTK", "SQM", "M", "MTR", "METER", "METRE", "USD", "VND",
  "UNT", "UNA", "NIU", "EAC", "BTL", "FRC", "FRASCO", "BLE", "BOLSA", "BOLSAS", "SAK", "SACO", "SACOS", "SACK", "SACKS",
  "DR", "DRM", "PLT", "PLTS", "IBC", "TK", "TNK", "CAS", "CASE", "CASES", "BX", "CRT", "KEG", "JAR", "JARS", "TOTE",
  "BULK", "BUL", "BLK", "PIECE OR UNIT", "PACK", "PACKS", "PAC", "PCT", "BDL", "BUNDLE", "SKD", "CBC", "CMQ", "GAL", "GLL",
];

const DICT = new Map();
GROUPS.forEach((g) => g.keys.forEach((k) => DICT.set(normText(k), { factor: g.factor, label: g.label, kind: UNIT_KIND.MASS })));
AMBIGUOUS.forEach((k) => DICT.set(normText(k), { factor: null, label: "Tấn không rõ loại (metric/short/long)", kind: UNIT_KIND.AMBIGUOUS }));
NON_MASS.forEach((k) => { const nk = normText(k); if (!DICT.has(nk)) DICT.set(nk, { factor: null, label: "Không phải đơn vị khối lượng", kind: UNIT_KIND.NON_MASS }); });

/** Chuẩn hóa mã đơn vị: "Kgs." → "KGS", "M.T." → "M T" → thử cả dạng dính "MT". */
export function normUnit(raw) {
  const n = normText(raw);
  if (!n) return "";
  if (DICT.has(n)) return n;
  const compact = n.replace(/\s+/g, "");
  if (DICT.has(compact)) return compact;
  return n;
}

/** Tra từ điển đơn vị → { unit, factor, label, kind } */
export function lookupUnit(raw) {
  const unit = normUnit(raw);
  if (!unit) return { unit: "", factor: null, label: "Không có đơn vị", kind: UNIT_KIND.BLANK };
  const d = DICT.get(unit);
  if (!d) return { unit, factor: null, label: "Chưa có trong từ điển", kind: UNIT_KIND.UNKNOWN };
  return { unit, ...d };
}

/** Nhãn hiển thị cho một hệ số */
export function describeFactor(f) {
  if (f === null || f === undefined || f === "") return "Không quy đổi (loại khỏi tính giá)";
  const g = GROUPS.find((x) => Math.abs(x.factor - f) < 1e-12);
  return g ? g.label : `1 đơn vị = ${f} tấn`;
}
