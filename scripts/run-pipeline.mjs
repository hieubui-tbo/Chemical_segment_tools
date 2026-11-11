// Chạy toàn bộ pipeline bằng Node (không cần giao diện) — dùng kiểm thử với dữ liệu thật
import { readFileSync } from "node:fs";
import { Engine } from "../src/engine/engine.js";
const [,, dataPath, kwPath, ...rest] = process.argv;
const t0 = Date.now();
const e = new Engine();
let last = 0;
e.onProgress = ({ step, pct, message }) => { if (Date.now() - last > 3000) { last = Date.now(); console.log(`  … ${step} ${(pct*100).toFixed(0)}% ${message}`); } };
const buf = readFileSync(dataPath);
const r = e.addFiles([{ name: dataPath.split("/").pop(), buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }]);
console.log("Sources:", r.sources.map((s) => `${s.sheet}:${s.year}:${s.nRows}r:hdr${s.headerRowNo}`).join(" | "), "errors", r.errors, `${Date.now()-t0}ms`);
e.confirmSources([]);
const si = e.getSchemaInfo();
console.log("Auto mapping:", JSON.stringify(si.global));
console.log("Schema validation:", si.validation);
e.confirmSchema();
if (kwPath) { const kb = readFileSync(kwPath); const k = e.loadKeywords(kb.buffer.slice(kb.byteOffset, kb.byteOffset + kb.byteLength), kwPath.split("/").pop()); console.log("Keywords:", k.segments.map((s) => `${s.name}(${s.include.length}/-${s.exclude.length})`).join(", "), "excl", k.exclusions.length, "conflicts", k.conflicts.length); }
else e.skipStep("keywords");
for (const st of ["quality","backfill","validate","units","entity","ranking"]) { const t = Date.now(); e.runStep(st); console.log(`✓ ${st} ${Date.now()-t}ms`); }
e.skipStep("industry"); console.log("✓ industry skipped");
for (const st of ["classify","iqr","metrics"]) { const t = Date.now(); e.runStep(st); console.log(`✓ ${st} ${Date.now()-t}ms`); }
console.log(`TOTAL ${Date.now()-t0}ms  heap ${(process.memoryUsage().heapUsed/1e6).toFixed(0)}MB`);
globalThis.__engine = e;
export default e;
