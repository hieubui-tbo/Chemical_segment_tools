/* Thư viện hồ sơ sản phẩm phía giao diện:
   · Thư viện chung  — mọi file profiles/*.json trong dự án, đóng gói khi build (cập nhật = thêm file + deploy)
   · Trên máy này    — hồ sơ người dùng lưu trong trình duyệt (localStorage)                                  */
import { normalizeProfile, profileSummary } from "../engine/profile.js";

const RAW = import.meta.glob("/profiles/*.json", { eager: true, import: "default" });
const KEY = "chemseg.profiles.v1";
const LAST = "chemseg.lastProfile.v1";

export const LIBRARY = Object.entries(RAW).map(([path, raw]) => {
  try { return normalizeProfile(raw, { origin: "library" }); }
  catch (e) { console.warn("Hồ sơ lỗi:", path, e.message); return null; }
}).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "vi"));

const strip = (p) => { const { _warnings, _conflicts, _origin, ...rest } = p; return rest; };

export function loadLocal() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    return arr.map((raw) => { try { return normalizeProfile(raw, { origin: "local" }); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export function saveLocal(profile) {
  const list = loadLocal().filter((p) => p.id !== profile.id).map(strip);
  list.unshift(strip({ ...profile, updatedAt: new Date().toISOString().slice(0, 10) }));
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
  catch { return false; }
}

export function deleteLocal(id) {
  try { localStorage.setItem(KEY, JSON.stringify(loadLocal().filter((p) => p.id !== id).map(strip))); return true; }
  catch { return false; }
}

export function rememberLast(id, origin) { try { localStorage.setItem(LAST, JSON.stringify({ id, origin })); } catch { /* bỏ qua */ } }
export function lastUsed() { try { return JSON.parse(localStorage.getItem(LAST) || "null"); } catch { return null; } }

/** id không trùng với hồ sơ đã có (thư viện + trên máy). */
export function uniqueId(base, taken) {
  let id = base, i = 2;
  while (taken.has(id)) id = `${base}-${i++}`;
  return id;
}

export const toPlain = strip;
export { profileSummary };
