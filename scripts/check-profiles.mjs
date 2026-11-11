// Kiểm tra mọi hồ sơ trong thư mục profiles/ trước khi build.
// Hồ sơ lỗi ⇒ build dừng ⇒ Vercel giữ nguyên bản đang chạy (người dùng không bị ảnh hưởng).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeProfile } from "../src/engine/profile.js";

const dir = fileURLToPath(new URL("../profiles/", import.meta.url));
const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".json"));
const ids = new Map();
let bad = 0;
for (const f of files) {
  try {
    const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const p = normalizeProfile(raw, { origin: "library" });
    if (ids.has(p.id)) throw new Error(`trùng id "${p.id}" với ${ids.get(p.id)}`);
    ids.set(p.id, f);
    const warn = p._warnings.length ? ` · ${p._warnings.length} cảnh báo: ${p._warnings.slice(0, 3).join(" | ")}` : "";
    console.log(`✓ ${f} — ${p.name} (${p.segments.length} phân khúc)${warn}`);
  } catch (e) {
    bad++;
    console.error(`✗ ${f}: ${e.message}`);
  }
}
if (bad) { console.error(`\n${bad} hồ sơ lỗi — sửa file trong profiles/ rồi deploy lại.`); process.exit(1); }
console.log(`Thư viện hồ sơ: ${files.length} hồ sơ hợp lệ.`);
