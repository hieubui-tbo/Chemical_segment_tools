/* Trạng thái giao diện: đồng bộ với engine trong Web Worker. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { call, onProgress, downloadBuffer, readFiles } from "../lib/engineClient.js";
import { STEPS } from "../engine/constants.js";
import { LIBRARY, loadLocal, saveLocal, deleteLocal, rememberLast, lastUsed, uniqueId, toPlain } from "./profiles.js";
import { slugify } from "../engine/profile.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [current, setCurrent] = useState("upload");
  const [help, setHelp] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [localProfiles, setLocalProfiles] = useState(() => loadLocal());
  const tid = useRef(0);

  const toast = useCallback((kind, title, desc, list) => {
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-2), { id, kind, title, desc, list }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "bad" ? 12000 : kind === "warn" ? 8000 : 3500);
  }, []);
  const closeToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => {
    (async () => {
      try {
        let st = await call("getState");
        // mở lại hồ sơ dùng lần trước (thư viện chung hoặc trên máy này)
        const last = lastUsed();
        const p = last && (last.origin === "local" ? loadLocal() : LIBRARY).find((x) => x.id === last.id);
        if (p) { const r = await call("applyProfile", { profile: { ...toPlain(p), _origin: p._origin } }); st = r.state; }
        setState(st);
      } catch (e) { toast("bad", "Không khởi động được bộ xử lý", e.message); }
    })();
    return onProgress((p) => setBusy((b) => (b ? { ...b, pct: p.pct, message: p.message, step: p.step } : b)));
  }, [toast]);

  const run = useCallback(async (label, method, args = {}, transfer = [], opts = {}) => {
    setBusy({ label, pct: 0, message: "" });
    try {
      const r = await call(method, args, transfer);
      if (r && r.steps) setState(r);
      else if (r && r.state) setState(r.state);
      if (opts.success) toast("ok", opts.success, typeof opts.successDesc === "function" ? opts.successDesc(r) : opts.successDesc);
      return r;
    } catch (e) {
      toast("bad", opts.errorTitle || "Có lỗi xảy ra", e.message, e.details);
      return null;
    } finally {
      setBusy(null);
    }
  }, [toast]);

  const query = useCallback((method, args) => call(method, args), []);

  const download = useCallback(async (label, method, args = {}) => {
    const r = await run(label, method, args);
    if (r && r.buffer) { downloadBuffer(r); toast("ok", "Đã tạo file", r.filename); }
    return r;
  }, [run, toast]);

  const uploadTo = useCallback(async (method, fileList, label, extra = {}) => {
    const files = await readFiles(fileList);
    const results = [];
    for (const f of files) {
      const r = await run(`${label}: ${f.name}`, method, { buffer: f.buffer, name: f.name, ...extra }, [f.buffer]);
      if (r) results.push({ name: f.name, ...r });
    }
    return results;
  }, [run]);

  const stepState = useCallback((id) => state?.steps.find((s) => s.id === id) || { state: "pending", can: false }, [state]);

  /* ─────── hồ sơ sản phẩm ─────── */
  const refreshLocal = useCallback(() => setLocalProfiles(loadLocal()), []);
  const hasResults = () => (state?.steps || []).some((s) => !["upload", "schema", "keywords"].includes(s.id) && (s.state === "done" || s.state === "skipped"));
  const applyProfile = useCallback(async (p, { confirm = true } = {}) => {
    if (confirm && state?.profile?.modified && !window.confirm(`Hồ sơ "${state.profile.name}" có thay đổi chưa lưu. Vẫn chuyển sang "${p.name}"?`)) return null;
    if (confirm && hasResults() && !window.confirm(`Áp dụng hồ sơ "${p.name}"? Các bước chịu ảnh hưởng sẽ được làm mới (dữ liệu đã tải vẫn giữ nguyên).`)) return null;
    const r = await run(`Áp dụng hồ sơ: ${p.name}`, "applyProfile", { profile: { ...toPlain(p), _origin: p._origin } }, [], { success: `Đang dùng hồ sơ: ${p.name}`, successDesc: (x) => (x.invalidatedFrom ? "Các bước bị ảnh hưởng đã được làm mới — bấm “Chạy tự động” để tính lại." : "Thiết lập & bộ phân khúc đã được nạp.") });
    if (r) { rememberLast(p.id, p._origin); if (r.warnings?.length) toast("warn", "Lưu ý về hồ sơ", r.warnings.length + " cảnh báo", r.warnings); }
    return r;
  }, [state, run, toast]);
  const saveProfileLocal = useCallback(async (meta = {}, opts = {}) => {
    const cur = state?.profile;
    const p = await call("buildProfile", { meta, opts });
    const taken = new Set([...LIBRARY.map((x) => x.id), ...loadLocal().filter((x) => !(cur?.origin === "local" && x.id === cur.id)).map((x) => x.id)]);
    // hồ sơ thư viện chung: lưu thành bản riêng trên máy; hồ sơ trên máy: ghi đè chính nó (trừ khi đổi tên)
    let id = cur?.origin === "local" && !meta.asNew && (!meta.name || meta.name === cur.name) ? cur.id : slugify(p.name);
    if (taken.has(id)) id = uniqueId(id, taken);
    const prof = { ...p, id };
    if (!saveLocal(prof)) { toast("bad", "Không lưu được vào trình duyệt", "Trình duyệt chặn lưu trữ (chế độ ẩn danh?). Hãy dùng “Xuất file hồ sơ”."); return null; }
    refreshLocal();
    rememberLast(id, "local");
    const st = await call("markProfileSaved", { profile: { ...prof, _origin: "local" } });
    setState(st);
    toast("ok", "Đã lưu hồ sơ trên máy này", prof.name);
    return prof;
  }, [state, toast, refreshLocal]);
  const removeLocal = useCallback((id) => { deleteLocal(id); refreshLocal(); }, [refreshLocal]);
  const importProfileFile = useCallback(async (file) => {
    const buffer = await file.arrayBuffer();
    const r = await run(`Nhập hồ sơ: ${file.name}`, "importProject", { buffer }, [buffer], { success: "Đã nhập & áp dụng hồ sơ" });
    if (!r) return null;
    const taken = new Set([...LIBRARY.map((x) => x.id), ...loadLocal().map((x) => x.id)]);
    const lib = LIBRARY.find((x) => x.id === r.profile.id);
    const id = lib ? uniqueId(r.profile.id + "-ban-sao", taken) : r.profile.id;
    const prof = { ...r.profile, id };
    if (saveLocal(prof)) { refreshLocal(); rememberLast(id, "local"); setState(await call("markProfileSaved", { profile: { ...prof, _origin: "local" } })); }
    if (r.warnings?.length) toast("warn", "Lưu ý về hồ sơ", r.warnings.length + " cảnh báo", r.warnings);
    return prof;
  }, [run, toast, refreshLocal]);

  const value = useMemo(() => ({
    state, setState, busy, run, query, download, uploadTo, toast, toasts, closeToast, current, setCurrent, help, setHelp, stepState,
    profileOpen, setProfileOpen, library: LIBRARY, localProfiles, applyProfile, saveProfileLocal, removeLocal, importProfileFile,
    goNext: (id) => { const i = STEPS.findIndex((s) => s.id === id); if (i >= 0 && i < STEPS.length - 1) { setCurrent(STEPS[i + 1].id); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    go: (id) => { setCurrent(id); window.scrollTo({ top: 0, behavior: "smooth" }); },
  }), [state, busy, run, query, download, uploadTo, toast, toasts, closeToast, current, help, stepState, profileOpen, localProfiles, applyProfile, saveProfileLocal, removeLocal, importProfileFile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
