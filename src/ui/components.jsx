import { useRef, useState } from "react";
import {
  Info, AlertTriangle, CheckCircle2, XCircle, UploadCloud, Target, ListChecks, PackageCheck, HelpCircle,
  Play, ArrowRight, RotateCcw, ChevronLeft, ChevronRight, Lock, Inbox, Loader2, SkipForward,
} from "lucide-react";
import { PHASES, STEPS, STEP_INDEX } from "../engine/constants.js";
import { useApp } from "./store.jsx";
import { GUIDES } from "./guides.jsx";
import { ms } from "./format.js";

export const phaseOf = (id) => PHASES.find((p) => p.id === STEPS[STEP_INDEX[id]].phase);
export const phaseVar = (id, suf = "") => `var(--phase-${STEPS[STEP_INDEX[id]].phase}${suf})`;

export function Card({ title, sub, tools, children, className = "", bodyClass = "", icon }) {
  return (
    <section className={"card " + className}>
      {(title || tools) && (
        <div className="card-h">
          {icon}
          <div>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {tools && <div className="card-tools">{tools}</div>}
        </div>
      )}
      <div className={"card-b " + bodyClass}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, color, tone }) {
  return (
    <div className={"kpi" + (tone ? " tone" : "")} style={{ "--kpi-c": color, "--kpi-bg": tone }}>
      <div className="kpi-v">{value}</div>
      <div className="kpi-l">{label}</div>
      {sub && <div className="kpi-s">{sub}</div>}
    </div>
  );
}

export function Btn({ kind = "primary", size, color, icon: I, children, className = "", ...rest }) {
  return (
    <button className={`btn btn-${kind} ${size ? "btn-" + size : ""} ${className}`} style={color ? { "--btn-c": color } : undefined} {...rest}>
      {I && <I size={size === "sm" ? 15 : 17} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

export function Pill({ tone = "mute", children, title }) {
  return <span className={`pill pill-${tone}`} title={title}>{children}</span>;
}

const CALL_ICON = { info: Info, warn: AlertTriangle, ok: CheckCircle2, bad: XCircle };
export function Callout({ kind = "info", title, children }) {
  const I = CALL_ICON[kind];
  return (
    <div className={"callout " + kind}>
      <I size={18} className="callout-ico" />
      <div>{title && <b>{title} </b>}{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, color, disabled }) {
  return (
    <label className="toggle" style={color ? { "--tg-c": color } : undefined}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" />
      {label && <span className="toggle-l">{label}</span>}
    </label>
  );
}

export function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function RadioCards({ value, options, onChange, color }) {
  return (
    <div className="radio-cards" style={color ? { "--rc-c": color } : undefined}>
      {options.map((o) => (
        <div key={o.value} className={"radio-card" + (value === o.value ? " on" : "")} onClick={() => onChange(o.value)} role="radio" aria-checked={value === o.value}>
          <span className="radio-dot" />
          <div><div className="radio-t">{o.label}{o.badge && <> {o.badge}</>}</div>{o.desc && <div className="radio-d">{o.desc}</div>}</div>
        </div>
      ))}
    </div>
  );
}

export function DropZone({ onFiles, accept, multiple, title, sub, color, compact, icon: I = UploadCloud, disabled }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={"drop" + (over ? " over" : "") + (compact ? " compact" : "")}
      style={color ? { "--drop-c": color } : undefined}
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled && e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); }}
      role="button" tabIndex={0}
    >
      <div className="drop-ico"><I size={compact ? 20 : 26} strokeWidth={2.2} /></div>
      <div>
        <div className="drop-t">{title}</div>
        {sub && <div className="drop-s">{sub}</div>}
      </div>
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: "none" }}
        onChange={(e) => { if (e.target.files.length) onFiles([...e.target.files]); e.target.value = ""; }} />
    </div>
  );
}

export function Tabs({ tabs, value, onChange, color }) {
  return (
    <div className="tabs" style={color ? { "--tab-c": color } : undefined}>
      {tabs.map((t) => (
        <button key={t.value} className={"tab" + (value === t.value ? " on" : "")} onClick={() => onChange(t.value)}>
          {t.label}{t.count !== undefined && <span className="cnt">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Bảng gọn: columns = [{ key, label, num, render, className, width }] */
export function Table({ columns, rows, maxHeight = 460, rowClass, empty = "Không có dữ liệu" }) {
  return (
    <div className="tbl-wrap" style={{ maxHeight }}>
      <table className="tbl">
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.num ? "num" : ""} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length} className="muted" style={{ textAlign: "center", padding: 24 }}>{empty}</td></tr>}
          {rows.map((r, i) => (
            <tr key={r.__key ?? i} className={rowClass ? rowClass(r) : ""}>
              {columns.map((c) => <td key={c.key} className={(c.num ? "num " : "") + (c.className || "")}>{c.render ? c.render(r, i) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pager">
      <span>{total.toLocaleString("vi-VN")} dòng · trang {page + 1}/{pages}</span>
      <Btn kind="ghost" size="sm" icon={ChevronLeft} disabled={page === 0} onClick={() => onPage(page - 1)} />
      <Btn kind="ghost" size="sm" icon={ChevronRight} disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} />
    </div>
  );
}

export function Empty({ icon: I = Inbox, title, children }) {
  return <div className="empty"><div className="empty-ico"><I size={24} /></div><div style={{ fontWeight: 700, color: "var(--text-2)" }}>{title}</div><div className="small mt8">{children}</div></div>;
}

export function Bar({ value, max, color }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return <div className="cell-bar" style={{ "--bar-c": color }}><span style={{ width: w + "%" }} /></div>;
}

export function ConfPill({ v }) {
  const t = v === "Chính xác" ? "ok" : v === "Cao" ? "info" : v === "Trung bình" ? "warn" : v === "Thấp" ? "bad" : "mute";
  return <Pill tone={t}>{v}</Pill>;
}
export function ReviewPill({ v }) {
  const t = v === "Tự động chấp nhận" ? "ok" : v === "Cần rà soát" ? "warn" : v?.startsWith("Đã xác nhận") ? "violet" : "mute";
  return <Pill tone={t}>{v}</Pill>;
}

/* ═════════ KHUNG CHUNG CHO MỖI BƯỚC ═════════ */
const STATE_LABEL = { done: "Đã hoàn tất", skipped: "Đã bỏ qua", pending: "Chưa chạy" };

export function StepHero({ id, extraChip }) {
  const { stepState, state, setHelp } = useApp();
  const s = STEPS[STEP_INDEX[id]];
  const ph = phaseOf(id);
  const st = stepState(id);
  const g = GUIDES[id];
  const r = state?.results?.[id];
  return (
    <>
      <div className="step-hero" style={{ background: `linear-gradient(120deg, var(--phase-${s.phase}) 0%, var(--phase-${s.phase}-d) 100%)` }}>
        <div className="hero-row">
          <div className="hero-no">{String(s.no).padStart(2, "0")}</div>
          <div>
            <div className="hero-kicker">Giai đoạn {ph.id} · {ph.label}</div>
            <div className="hero-title">{s.label}</div>
            <div className="hero-desc">{g.tagline}</div>
          </div>
          <div className="hero-side">
            <span className="hero-chip">
              {st.state === "done" ? <CheckCircle2 size={14} /> : st.state === "skipped" ? <SkipForward size={14} /> : st.can ? <Play size={13} /> : <Lock size={13} />}
              {st.state === "pending" && !st.can ? (id === "keywords" ? "Soạn được ngay" : "Chưa mở khóa") : STATE_LABEL[st.state]}
              {r?._ms ? ` · ${ms(r._ms)}` : ""}
            </span>
            {extraChip}
            <button className="hero-help" onClick={() => setHelp(id)}><HelpCircle size={15} /> Logic & hướng dẫn chi tiết</button>
          </div>
        </div>
      </div>
      <div className="guide">
        <GuideCard icon={Target} color={`var(--phase-${s.phase})`} bg={`var(--phase-${s.phase}-l)`} h="Mục đích" t={g.purpose} />
        <GuideCard icon={ListChecks} color={`var(--phase-${s.phase})`} bg={`var(--phase-${s.phase}-l)`} h="Bạn cần làm" t={g.todo} />
        <GuideCard icon={PackageCheck} color={`var(--phase-${s.phase})`} bg={`var(--phase-${s.phase}-l)`} h="Kết quả nhận được" t={g.result} />
      </div>
    </>
  );
}
function GuideCard({ icon: I, color, bg, h, t }) {
  return <div className="guide-card"><div className="guide-ico" style={{ background: bg, color }}><I size={18} strokeWidth={2.3} /></div><div><div className="guide-h">{h}</div><div className="guide-t">{t}</div></div></div>;
}

/** Thanh hành động: Chạy / Chạy lại / Bước tiếp. */
export function RunBar({ id, label = "Chạy bước này", note, canRun = true, onRun, extra, nextLabel }) {
  const { stepState, run, goNext, busy } = useApp();
  const st = stepState(id);
  const s = STEPS[STEP_INDEX[id]];
  const done = st.state === "done" || st.state === "skipped";
  const blocked = !st.can;
  const doRun = onRun || (() => run(`Bước ${s.no}: ${s.label}`, "runStep", { id }, [], { success: `Đã hoàn tất bước ${s.no}`, successDesc: s.label }));
  return (
    <div className="action-bar">
      <Btn kind="primary" size="lg" color={`var(--phase-${s.phase})`} icon={done ? RotateCcw : busy ? Loader2 : Play} disabled={blocked || !canRun || !!busy} onClick={doRun}>
        {done ? "Chạy lại" : label}
      </Btn>
      {extra}
      <div className="note">{blocked ? "Hoàn thành các bước trước để mở khóa bước này." : note}</div>
      <div className="spacer" />
      {done && s.id !== "export" && <Btn kind="ghost" icon={ArrowRight} onClick={() => goNext(id)}>{nextLabel || "Sang bước tiếp theo"}</Btn>}
    </div>
  );
}

export function StaleNote({ id }) {
  const { stepState } = useApp();
  const st = stepState(id);
  if (st.state !== "pending" || !st.can) return null;
  return null;
}
