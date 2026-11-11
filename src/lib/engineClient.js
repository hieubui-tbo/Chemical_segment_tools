/* Cầu nối giao diện ↔ Web Worker (Promise-based RPC + sự kiện tiến độ). */
let worker = null, seq = 0;
const pending = new Map();
const progressListeners = new Set();

function ensure() {
  if (worker) return worker;
  worker = new Worker(new URL("../worker/engine.worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (ev) => {
    const m = ev.data;
    if (m && m.type === "progress") { progressListeners.forEach((fn) => fn(m)); return; }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.ok) p.resolve(m.result);
    else { const err = new Error(m.error?.message || "Lỗi không xác định"); err.details = m.error?.details; p.reject(err); }
  };
  worker.onerror = (e) => {
    const err = new Error("Bộ xử lý gặp sự cố: " + (e.message || "không rõ") + ". Có thể file quá lớn so với bộ nhớ trình duyệt.");
    pending.forEach((p) => p.reject(err)); pending.clear();
  };
  return worker;
}

export function call(method, args = {}, transfer = []) {
  const w = ensure();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, method, args }, transfer);
  });
}

export function onProgress(fn) { progressListeners.add(fn); return () => progressListeners.delete(fn); }

export function downloadBuffer({ filename, buffer }) {
  const type = filename.endsWith(".json") ? "application/json" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blob = new Blob([buffer], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}

export async function readFiles(fileList) {
  const files = [];
  for (const f of fileList) files.push({ name: f.name, size: f.size, buffer: await f.arrayBuffer() });
  return files;
}
