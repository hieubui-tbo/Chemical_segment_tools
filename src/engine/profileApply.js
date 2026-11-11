/* Áp dụng hồ sơ sản phẩm vào engine / đóng gói cấu hình hiện tại thành hồ sơ. */
import { DEFAULT_SETTINGS, NON_PROFILE_SETTINGS, STEP_INDEX, SETTING_STEP, APP_VERSION } from "./constants.js";
import { safeFileName } from "./text.js";
import { buildKeywordSet } from "./steps/keywords.js";
import { addIndustryRows } from "./steps/industry.js";
import { addOverrideRows } from "./steps/entity.js";
import { PROFILE_FORMAT, PROFILE_VERSION, normalizeProfile, profileMeta, slugify } from "./profile.js";

/**
 * Áp dụng hồ sơ vào engine: thiết lập = mặc định + thiết lập của hồ sơ (để hồ sơ trước không "dính" sang),
 * bộ phân khúc, từ điển DN, Industry Master. Các bước bị ảnh hưởng tự làm mới.
 */
export function applyProfile(engine, raw, { keepRefs = false } = {}) {
  const p = raw.format === PROFILE_FORMAT && raw._warnings ? raw : normalizeProfile(raw, { origin: raw._origin || "file" });
  const keep = {};
  for (const k of NON_PROFILE_SETTINGS) keep[k] = engine.settings[k];
  const next = { ...structuredClone(DEFAULT_SETTINGS), ...structuredClone(p.settings), ...keep };
  if (!p.settings.projectName) next.projectName = safeFileName(p.product || p.name).slice(0, 40) || "Du_an";
  // xác định bước sớm nhất bị ảnh hưởng
  let earliest = null;
  const bump = (st) => { if (st && (earliest === null || STEP_INDEX[st] < STEP_INDEX[earliest])) earliest = st; };
  for (const k of Object.keys(next)) if (JSON.stringify(next[k]) !== JSON.stringify(engine.settings[k])) bump(SETTING_STEP[k]);
  engine.settings = next;

  if (!keepRefs) {
    engine.refs.keywords = p.segments.length ? buildKeywordSet({ segments: p.segments, exclusions: p.exclusions }, `Hồ sơ: ${p.name}`) : null;
    engine.refs.keywordsSkipped = false;
    bump("classify");
    const ov = { files: [], entries: [] };
    if (p.overrides.length) { addOverrideRows(ov, p.overrides); ov.files = [{ name: `Hồ sơ: ${p.name}`, rows: p.overrides.length }]; }
    if (ov.entries.length || engine.refs.overrides.entries.length) bump("entity");
    engine.refs.overrides = ov;
    const ind = { files: [], entries: [], conflicts: [] };
    if (p.industry.length) { addIndustryRows(ind, p.industry, `Hồ sơ: ${p.name}`); ind.files = [{ name: `Hồ sơ: ${p.name}`, rows: p.industry.length, emptySeg: 0 }]; }
    if (ind.entries.length || engine.refs.industry.entries.length) bump("industry");
    engine.refs.industry = ind;
  }
  if (earliest && (engine.status[earliest] || engine.hasLaterResults(earliest))) engine.invalidateFrom(earliest);
  engine.profile = profileMeta(p);
  engine.profileBase = ++engine.refVersion;
  return { meta: engine.profile, invalidatedFrom: earliest, warnings: p._warnings, conflicts: p._conflicts };
}

/** Đóng gói cấu hình hiện tại của engine thành hồ sơ (để lưu / chia sẻ). */
export function profileFromEngine(engine, meta = {}, { includeOverrides = true, includeIndustry = true } = {}) {
  const base = engine.profile || {};
  const settings = {};
  for (const [k, v] of Object.entries(engine.settings)) if (!NON_PROFILE_SETTINGS.has(k)) settings[k] = structuredClone(v);
  const kw = engine.refs.keywords;
  const name = String(meta.name ?? base.name ?? "").trim() || "Hồ sơ mới";
  return {
    format: PROFILE_FORMAT,
    formatVersion: PROFILE_VERSION,
    id: slugify(meta.id || base.id || name),
    name,
    product: meta.product ?? base.product ?? "",
    hsCodes: meta.hsCodes ?? base.hsCodes ?? [],
    description: meta.description ?? base.description ?? "",
    intent: meta.intent ?? base.intent ?? "",
    author: meta.author ?? base.author ?? "",
    updatedAt: new Date().toISOString().slice(0, 10),
    appVersion: APP_VERSION,
    settings,
    segments: kw ? kw.segments.map((s) => ({ name: s.name, include: [...s.include], exclude: [...s.exclude], ...(s.note ? { note: s.note } : {}) })) : [],
    exclusions: kw ? [...(kw.exclusions || [])] : [],
    overrides: includeOverrides ? engine.refs.overrides.entries.map((e) => ({ raw: e.norm, name: e.name, country: e.countryCode, type: e.type })) : [],
    industry: includeIndustry ? engine.refs.industry.entries.map((e) => ({ name: e.name, country: e.countryName || e.countryCode, industry: e.industry, segment: e.segment })) : [],
  };
}
