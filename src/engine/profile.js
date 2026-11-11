/* ═══════════════════════════════════════════════════════════════
   HỒ SƠ SẢN PHẨM — cấu hình riêng cho từng sản phẩm / dự án nghiên cứu
   Một hồ sơ gồm:
     · Thông tin: tên, sản phẩm, mã HS, ý đồ phân khúc, người phụ trách
     · Bộ phân khúc: tên phân khúc + từ khóa + từ khóa loại trừ riêng, danh sách LOẠI TRỪ (ngoài phạm vi)
     · Thiết lập logic: hệ số đơn vị, khoảng giá hợp lý, cách xác định phân khúc, quy tắc ngoại lai…
     · (tùy chọn) Từ điển DN và Industry Master đã nghiên cứu
   Hồ sơ là file JSON thuần — lưu trong thư viện chung (thư mục profiles/ của dự án, tự cập nhật khi deploy),
   lưu trên trình duyệt của từng người, hoặc chia sẻ qua file.
   ═══════════════════════════════════════════════════════════════ */
import { DEFAULT_SETTINGS, NON_PROFILE_SETTINGS } from "./constants.js";
import { normText } from "./text.js";
import { buildKeywordSet } from "./steps/keywords.js";

export const PROFILE_FORMAT = "chemseg-profile";
export const PROFILE_VERSION = 1;

const ENUMS = {
  rankingMetric: ["value", "volume"], industryApplyScope: ["all", "top"], keywordMatchMode: ["word", "substring"],
  keywordFields: ["desc", "desc_hs"], segmentBasis: ["keyword_first", "industry_first", "keyword_only", "industry_only"],
  outlierRule: ["AND", "IQR", "OR"], nameCase: ["title", "upper", "original"],
};
const RANGES = {
  valueTolerance: [0.01, 5], fuzzyThreshold: [0.8, 0.99], topThreshold: [0.05, 1], iqrMinN: [3, 1000],
  iqrMultiplier: [0.5, 10], priceBandMin: [0, 1e9], priceBandMax: [0, 1e9],
};

export function slugify(s) {
  return normText(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "ho-so";
}

/** Lọc & kiểm tra thiết lập trong hồ sơ: bỏ khóa lạ, ép kiểu, kiểm tra miền giá trị. */
function cleanSettings(raw, warnings) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in DEFAULT_SETTINGS)) { warnings.push(`Bỏ qua thiết lập không xác định: ${k}`); continue; }
    if (NON_PROFILE_SETTINGS.has(k)) continue;
    const def = DEFAULT_SETTINGS[k];
    if (ENUMS[k]) { if (ENUMS[k].includes(v)) out[k] = v; else warnings.push(`Giá trị "${v}" không hợp lệ cho ${k} — dùng mặc định.`); continue; }
    if (typeof def === "boolean") { out[k] = !!v; continue; }
    if (typeof def === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) { warnings.push(`${k} phải là số — dùng mặc định.`); continue; }
      const r = RANGES[k];
      if (r && (n < r[0] || n > r[1])) { warnings.push(`${k} = ${n} nằm ngoài khoảng ${r[0]}–${r[1]} — dùng mặc định.`); continue; }
      out[k] = n; continue;
    }
    if (k === "unitFactors") {
      const f = {};
      if (v && typeof v === "object") for (const [u, x] of Object.entries(v)) {
        if (x === null || x === "") f[u] = null;
        else if (Number(x) > 0) f[u] = Number(x);
        else warnings.push(`Hệ số đơn vị ${u} không hợp lệ — bỏ qua.`);
      }
      out[k] = f; continue;
    }
    if (k === "customPlaceholders") { out[k] = Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []; continue; }
    if (typeof def === "string") { out[k] = String(v ?? ""); continue; }
  }
  if (out.priceBandMin > 0 && out.priceBandMax > 0 && out.priceBandMin >= out.priceBandMax) {
    warnings.push("Khoảng giá: giá tối thiểu phải nhỏ hơn giá tối đa — bỏ khoảng giá thủ công.");
    delete out.priceBandMin; delete out.priceBandMax;
  }
  return out;
}

/**
 * Chuẩn hóa một hồ sơ (từ thư viện, trình duyệt hoặc file). Ném lỗi nếu không dùng được.
 * Chấp nhận cả file "Lưu cấu hình" kiểu cũ (V18.0) để không mất công việc đã làm.
 */
export function normalizeProfile(raw, { origin = "file" } = {}) {
  if (!raw || typeof raw !== "object") throw new Error("Hồ sơ không hợp lệ (không phải JSON đối tượng).");
  const warnings = [];
  let p = raw;
  if (raw.app === "ChemSeg Analyst" && !raw.format) {
    // file cấu hình V18.0 → hồ sơ
    p = {
      name: raw.settings?.projectName || "Cấu hình nhập từ file",
      settings: raw.settings || {},
      segments: raw.keywords?.segments || [],
      exclusions: raw.keywords?.exclusions || [],
      overrides: (raw.overrides?.entries || []).map((e) => ({ raw: e.norm, name: e.name, country: e.countryCode, type: e.type })),
      industry: (raw.industry?.entries || []).map((e) => ({ name: e.name, country: e.countryName || e.countryCode, industry: e.industry, segment: e.segment })),
      updatedAt: raw.savedAt,
    };
    warnings.push("Đã chuyển file cấu hình kiểu cũ sang hồ sơ sản phẩm.");
  } else if (raw.format !== PROFILE_FORMAT) {
    throw new Error(`Không phải file hồ sơ ChemSeg (thiếu "format": "${PROFILE_FORMAT}").`);
  }
  if (p.formatVersion && p.formatVersion > PROFILE_VERSION) warnings.push(`Hồ sơ tạo bởi phiên bản mới hơn (định dạng ${p.formatVersion}) — một số tùy chọn có thể bị bỏ qua.`);
  const name = String(p.name ?? "").trim();
  if (!name) throw new Error("Hồ sơ thiếu tên (trường \"name\").");
  if (p.segments !== undefined && !Array.isArray(p.segments)) throw new Error("\"segments\" phải là danh sách.");
  const kw = buildKeywordSet({ segments: p.segments || [], exclusions: p.exclusions || [] }, name);
  const asList = (v) => (Array.isArray(v) ? v : typeof v === "string" && v.trim() ? v.split(/[,;\n]+/) : []).map((x) => String(x).trim()).filter(Boolean);
  const overrides = (Array.isArray(p.overrides) ? p.overrides : []).filter((o) => o && o.raw && o.name)
    .map((o) => ({ raw: String(o.raw), name: String(o.name), country: o.country ? String(o.country) : "", type: o.type ? String(o.type) : "" }));
  const industry = (Array.isArray(p.industry) ? p.industry : []).filter((o) => o && o.name && o.segment)
    .map((o) => ({ name: String(o.name), country: o.country ? String(o.country) : "", industry: o.industry ? String(o.industry) : "", segment: String(o.segment) }));
  return {
    format: PROFILE_FORMAT,
    formatVersion: PROFILE_VERSION,
    id: slugify(p.id || name),
    name,
    product: String(p.product ?? "").trim(),
    hsCodes: asList(p.hsCodes),
    description: String(p.description ?? "").trim(),
    intent: String(p.intent ?? "").trim(),
    author: String(p.author ?? "").trim(),
    updatedAt: p.updatedAt ? String(p.updatedAt).slice(0, 10) : "",
    settings: cleanSettings(p.settings, warnings),
    segments: kw.segments,
    exclusions: kw.exclusions,
    overrides,
    industry,
    _origin: origin,
    _warnings: [...warnings, ...kw.warnings.map((w) => "Bộ phân khúc: " + w)],
    _conflicts: kw.conflicts,
  };
}

/** Tóm tắt để hiển thị trong thư viện. */
export function profileSummary(p) {
  return {
    segments: p.segments.length,
    keywords: p.segments.reduce((a, s) => a + s.include.length, 0),
    exclusions: p.exclusions.length,
    overrides: p.overrides.length,
    industry: p.industry.length,
    customSettings: Object.keys(p.settings || {}).filter((k) => k !== "projectName" && JSON.stringify(p.settings[k]) !== JSON.stringify(DEFAULT_SETTINGS[k])).length,
  };
}

/** Thông tin hồ sơ (không gồm nội dung lớn) — lưu trong engine & gửi lên giao diện. */
export function profileMeta(p) {
  return { id: p.id, name: p.name, product: p.product, hsCodes: p.hsCodes, description: p.description, intent: p.intent, author: p.author, updatedAt: p.updatedAt, origin: p._origin || "file", summary: profileSummary(p) };
}

