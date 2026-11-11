/* ═══════════════════════════════════════════════════════════════
   HỒ SƠ SẢN PHẨM — chọn / tạo / lưu / chia sẻ cấu hình theo từng sản phẩm
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from "react";
import { Package, X, Save, Download, Upload, Plus, Trash2, Check, Library, HardDrive, Pencil, Github, Copy } from "lucide-react";
import { useApp } from "./store.jsx";
import { Btn, Pill, Callout, Field, Toggle } from "./components.jsx";
import { profileSummary } from "./profiles.js";
import { PROFILE_FORMAT } from "../engine/profile.js";
import { n } from "./format.js";

const ORIGIN = { library: { label: "Thư viện chung", tone: "info" }, local: { label: "Trên máy này", tone: "violet" }, file: { label: "Từ file", tone: "mute" }, new: { label: "Mới — chưa lưu", tone: "warn" } };

export function profileLine(p) {
  const s = p.summary || profileSummary(p);
  return [`${n(s.segments)} phân khúc`, `${n(s.keywords)} từ khóa`, s.exclusions ? `${n(s.exclusions)} loại trừ` : null, s.overrides ? `${n(s.overrides)} tên DN` : null, s.industry ? `${n(s.industry)} DN có ngành` : null, s.customSettings ? `${n(s.customSettings)} thiết lập riêng` : null].filter(Boolean).join(" · ");
}

function ProfileCard({ p, active, onApply, onExport, onDelete, onClone }) {
  const o = ORIGIN[p._origin] || ORIGIN.file;
  return (
    <div className={"pf-card" + (active ? " active" : "")}>
      <div className="pf-top">
        <div style={{ minWidth: 0 }}>
          <div className="pf-name">{p.name}</div>
          <div className="pf-meta">{[p.product, p.hsCodes?.length ? "HS " + p.hsCodes.join(", ") : null, p.updatedAt ? "cập nhật " + p.updatedAt : null].filter(Boolean).join(" · ") || "—"}</div>
        </div>
        <Pill tone={o.tone}>{o.label}</Pill>
      </div>
      <div className="pf-sum">{profileLine(p)}</div>
      {(p.intent || p.description) && <div className="pf-desc">{p.intent || p.description}</div>}
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        {active ? <Pill tone="ok"><Check size={12} /> Đang dùng</Pill> : <Btn size="sm" color="var(--brand)" onClick={onApply}>Áp dụng</Btn>}
        {onClone && <Btn size="sm" kind="ghost" icon={Copy} onClick={onClone} title="Áp dụng rồi lưu thành bản riêng trên máy này để chỉnh sửa">Nhân bản</Btn>}
        <Btn size="sm" kind="ghost" icon={Download} onClick={onExport}>Xuất file</Btn>
        {onDelete && <Btn size="sm" kind="ghost" icon={Trash2} onClick={onDelete}>Xóa</Btn>}
      </div>
    </div>
  );
}

function downloadJson(p) {
  const { _origin, _warnings, _conflicts, ...rest } = p;
  const blob = new Blob([JSON.stringify({ ...rest, format: PROFILE_FORMAT }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `HoSo_${(p.name || "ho-so").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 50)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function ProfileManager() {
  const { profileOpen, setProfileOpen, state, library, localProfiles, applyProfile, saveProfileLocal, removeLocal, importProfileFile, download } = useApp();
  const cur = state?.profile;
  const fileRef = useRef(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [withRefs, setWithRefs] = useState(true);
  useEffect(() => {
    if (profileOpen) setForm({ name: cur?.name || "", product: cur?.product || "", hsCodes: (cur?.hsCodes || []).join(", "), intent: cur?.intent || "", description: cur?.description || "", author: cur?.author || "" });
  }, [profileOpen, cur?.name, cur?.product, cur?.intent, cur?.description, cur?.author, cur?.hsCodes]);
  if (!profileOpen) return null;
  const close = () => { setProfileOpen(false); setEdit(false); };
  const meta = () => ({ name: form.name.trim() || cur?.name || "Hồ sơ mới", product: form.product.trim(), hsCodes: form.hsCodes.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean), intent: form.intent.trim(), description: form.description.trim(), author: form.author.trim() });
  const opts = { includeOverrides: withRefs, includeIndustry: withRefs };
  const isActive = (p) => cur && cur.id === p.id && cur.origin === p._origin;
  const newBlank = async () => {
    const r = await applyProfile({ format: PROFILE_FORMAT, name: "Hồ sơ mới", settings: {}, segments: [], exclusions: [], _origin: "new" });
    if (r) { setForm({ name: "", product: "", hsCodes: "", intent: "", description: "", author: "" }); setEdit(true); }
  };
  const clone = async (p) => {
    const r = await applyProfile(p);
    if (r) await saveProfileLocal({ name: `${p.name} (bản riêng)`, asNew: true }, opts);
  };

  return (
    <>
      <div className="drawer-back" onClick={close} />
      <aside className="drawer drawer-wide" role="dialog" aria-label="Hồ sơ sản phẩm">
        <div className="drawer-h" style={{ background: "var(--brand-grad)" }}>
          <Package size={24} />
          <div>
            <div className="hero-kicker">Cấu hình theo sản phẩm</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Hồ sơ sản phẩm</div>
            <div className="small" style={{ opacity: 0.92 }}>Mỗi sản phẩm một hồ sơ: phân khúc & từ khóa, loại trừ, hệ số đơn vị, khoảng giá hợp lý, cách phân khúc, quy tắc lọc, từ điển DN.</div>
          </div>
          <button className="x-btn" onClick={close}><X size={18} /></button>
        </div>
        <div className="drawer-b">
          <h4>Đang dùng</h4>
          {cur ? (
            <div className="pf-current">
              <div className="pf-top">
                <div style={{ minWidth: 0 }}>
                  <div className="pf-name" style={{ fontSize: 17 }}>{cur.name}</div>
                  <div className="pf-meta">{[cur.product, cur.hsCodes?.length ? "HS " + cur.hsCodes.join(", ") : null, cur.author].filter(Boolean).join(" · ") || "Chưa có thông tin sản phẩm"}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Pill tone={(ORIGIN[cur.origin] || ORIGIN.file).tone}>{(ORIGIN[cur.origin] || ORIGIN.file).label}</Pill>
                  {cur.modified && <Pill tone="warn">Đã chỉnh — chưa lưu</Pill>}
                </div>
              </div>
              <div className="pf-sum">{profileLine(cur)}{cur.modified ? " (trước khi chỉnh)" : ""}</div>
              {cur.intent && <div className="pf-desc" style={{ display: "block" }}><b>Ý đồ phân khúc:</b>{" "}{cur.intent}</div>}
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <Btn size="sm" icon={Save} color="var(--brand)" onClick={() => saveProfileLocal(edit ? meta() : {}, opts)}>{cur.origin === "local" ? "Lưu thay đổi" : "Lưu thành hồ sơ trên máy này"}</Btn>
                <Btn size="sm" kind="ghost" icon={Pencil} onClick={() => setEdit((v) => !v)}>{edit ? "Ẩn thông tin" : "Sửa thông tin"}</Btn>
                <Btn size="sm" kind="ghost" icon={Download} onClick={() => download("Xuất hồ sơ", "exportProject", { meta: edit ? meta() : {}, opts })}>Xuất file hồ sơ</Btn>
              </div>
            </div>
          ) : (
            <Callout kind="info" title="Chưa chọn hồ sơ.">Đang dùng thiết lập mặc định. Chọn một hồ sơ bên dưới hoặc tạo hồ sơ mới cho sản phẩm của bạn.</Callout>
          )}
          {edit && (
            <div className="pf-form">
              <div className="grid-2" style={{ gap: 12 }}>
                <Field label="Tên hồ sơ"><input className="input" value={form.name} placeholder="vd: Urê – thị trường Việt Nam" onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Sản phẩm"><input className="input" value={form.product} placeholder="vd: Urea" onChange={(e) => setForm({ ...form, product: e.target.value })} /></Field>
                <Field label="Mã HS" hint="Cách nhau bằng dấu phẩy"><input className="input" value={form.hsCodes} placeholder="vd: 310210, 310230" onChange={(e) => setForm({ ...form, hsCodes: e.target.value })} /></Field>
                <Field label="Người phụ trách"><input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
              </div>
              <Field label="Ý đồ phân khúc" hint="Phân khúc theo tiêu chí nào và vì sao — giúp người khác dùng lại đúng mục đích."><textarea className="input" rows={3} value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })} /></Field>
              <Field label="Ghi chú"><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Toggle checked={withRefs} onChange={setWithRefs} label="Kèm từ điển DN & Industry Master khi lưu / xuất" />
                <Btn size="sm" icon={Save} color="var(--brand)" onClick={() => saveProfileLocal({ ...meta(), asNew: false }, opts)}>Lưu hồ sơ</Btn>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <Btn size="sm" kind="soft" icon={Plus} onClick={newBlank}>Tạo hồ sơ trống</Btn>
            <Btn size="sm" kind="soft" icon={Upload} onClick={() => fileRef.current?.click()}>Nhập file hồ sơ (.json)</Btn>
            <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files[0]; if (f) importProfileFile(f); e.target.value = ""; }} />
          </div>

          <h4><Library size={13} style={{ verticalAlign: -2 }} /> Thư viện chung — dùng cho cả nhóm ({library.length})</h4>
          <div className="pf-list">
            {library.map((p) => <ProfileCard key={"l" + p.id} p={p} active={isActive(p)} onApply={() => applyProfile(p)} onClone={() => clone(p)} onExport={() => downloadJson(p)} />)}
          </div>

          <h4><HardDrive size={13} style={{ verticalAlign: -2 }} /> Trên máy này ({localProfiles.length})</h4>
          {localProfiles.length ? (
            <div className="pf-list">
              {localProfiles.map((p) => <ProfileCard key={"m" + p.id} p={p} active={isActive(p)} onApply={() => applyProfile(p)} onExport={() => downloadJson(p)} onDelete={() => { if (window.confirm(`Xóa hồ sơ "${p.name}" khỏi trình duyệt này?`)) removeLocal(p.id); }} />)}
            </div>
          ) : <p className="muted small">Chưa có. Hồ sơ bạn lưu sẽ nằm trong trình duyệt này (không đồng bộ sang máy khác — dùng “Xuất file” để chia sẻ).</p>}

          <h4><Github size={13} style={{ verticalAlign: -2 }} /> Đưa hồ sơ vào thư viện chung</h4>
          <ol>
            <li>Bấm <b>Xuất file hồ sơ</b> để tải file <code>HoSo_….json</code>.</li>
            <li>Trên GitHub, mở thư mục <code>profiles/</code> của dự án → <b>Add file → Upload files</b> → kéo file vào → <b>Commit changes</b>.</li>
            <li>Vercel tự cập nhật sau khoảng 1 phút — cả nhóm tải lại trang là thấy. Hồ sơ lỗi sẽ không làm hỏng bản đang chạy.</li>
          </ol>
        </div>
      </aside>
    </>
  );
}
