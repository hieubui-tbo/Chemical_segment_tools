/* ═══════════════════════════════════════════════════════════════
   ChemSeg Analyst — khung giao diện
   ═══════════════════════════════════════════════════════════════ */
import { Check, Lock, AlertTriangle, Package, BookOpen, Rocket, RotateCcw, Loader2, X, CheckCircle2, XCircle, Info, HelpCircle, FlaskConical, ChevronDown } from "lucide-react";
import { AppProvider, useApp } from "./ui/store.jsx";
import { PHASES, STEPS, STEP_INDEX, GUIDE_URL } from "./engine/constants.js";
import { GUIDES } from "./ui/guides.jsx";
import { Btn } from "./ui/components.jsx";
import { n, ms } from "./ui/format.js";
import { UploadStep, SchemaStep, QualityStep, BackfillStep, ValidateStep, UnitsStep } from "./steps/PrepSteps.jsx";
import { EntityStep, RankingStep, IndustryStep } from "./steps/MarketSteps.jsx";
import { KeywordsStep, ClassifyStep, IqrStep, MetricsStep, ExportStep } from "./steps/SegmentSteps.jsx";
import { ReviewStep } from "./steps/ReviewStep.jsx";
import orgLogo from "./assets/logo-tbo-mark.png";
import { ProfileManager } from "./ui/ProfileManager.jsx";


const VIEWS = {
  upload: UploadStep, schema: SchemaStep, quality: QualityStep, backfill: BackfillStep, validate: ValidateStep, units: UnitsStep,
  entity: EntityStep, ranking: RankingStep, industry: IndustryStep, keywords: KeywordsStep, classify: ClassifyStep, iqr: IqrStep, metrics: MetricsStep, export: ExportStep, review: ReviewStep,
};

function Sidebar() {
  const { state, current, go, stepState, setProfileOpen } = useApp();
  const total = state?.years?.reduce((a, y) => a + y.rows, 0) || 0;
  const files = [...new Set((state?.sources || []).filter((s) => s.include).map((s) => s.file))];
  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src={orgLogo} alt="The Blue Ocean" />
        <div>
          <div className="brand-name">ChemSeg Analyst</div>
          <div className="brand-sub">Xử lý dữ liệu XNK hóa chất & phân bón</div>
          <span className="brand-ver">THE BLUE OCEAN</span>
        </div>
      </div>
      <nav className="nav">
        {PHASES.map((p) => (
          <div className="nav-phase" key={p.id}>
            <div className="nav-phase-label"><span className="nav-phase-dot" style={{ background: p.color }} />{p.id} · {p.label}</div>
            {STEPS.filter((s) => s.phase === p.id).map((s) => {
              const st = stepState(s.id);
              const active = current === s.id;
              const done = st.state === "done" || st.state === "skipped";
              const reachable = st.can || done || s.id === "upload" || s.noRun || s.id === "keywords"; // bộ phân khúc soạn được bất cứ lúc nào
              const r = state?.results?.[s.id];
              return (
                <button key={s.id} className={"nav-step" + (active ? " active" : "") + (done ? " done" : "")} disabled={!reachable} onClick={() => go(s.id)}>
                  <span className="nav-num" style={done || active ? { background: done ? p.color : "transparent", border: active && !done ? `2px solid ${p.color}` : undefined, boxShadow: active ? `0 0 0 4px ${p.color}33` : undefined } : undefined}>
                    {done ? <Check size={14} strokeWidth={3.2} /> : !reachable ? <Lock size={11} /> : s.no}
                  </span>
                  <span className="nav-txt">
                    <div className="nav-title">{s.short}</div>
                    <div className="nav-meta">{st.state === "skipped" ? "Đã bỏ qua" : done ? `Hoàn tất${r?._ms ? " · " + ms(r._ms) : ""}` : s.noRun ? (st.can ? "Sẵn sàng" : "Xem được ngay") : st.can ? "Sẵn sàng chạy" : s.id === "keywords" ? "Soạn được ngay" : "Chờ bước trước"}</div>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="side-foot">
        <div className="ds-card">
          <div className="ds-title">Bộ dữ liệu</div>
          {total ? (
            <>
              <div className="ds-big">{n(total)} <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-300)" }}>dòng</span></div>
              <div className="small" style={{ color: "var(--ink-300)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={files.join(", ")}>{files.join(", ")}</div>
              <div className="ds-years">{state.years.map((y) => <span className={"ds-year" + (y.coverage?.partial ? " partial" : "")} key={y.year} title={y.coverage ? `Dữ liệu từ ${y.coverage.from} đến ${y.coverage.to}` : "Chưa có cột Ngày"}>{y.label}</span>)}</div>
              {state.years.length > 1 && <div className="small" style={{ color: "var(--ink-300)", marginTop: 6 }}>Giai đoạn: <b style={{ color: "#fff" }}>{state.period}</b></div>}
            </>
          ) : <div className="small" style={{ color: "var(--ink-300)", marginTop: 4 }}>Chưa nạp dữ liệu</div>}
        </div>
        <div className="side-actions">
          <button className="side-btn" onClick={() => setProfileOpen(true)}><Package size={14} />Hồ sơ sản phẩm</button>
          <a className="side-btn" href={GUIDE_URL} download style={{ textDecoration: "none" }}><BookOpen size={14} />Hướng dẫn (Word)</a>
        </div>
      </div>
    </aside>
  );
}

function ProfileChip() {
  const { state, setProfileOpen } = useApp();
  const p = state?.profile;
  return (
    <button className="pf-chip" onClick={() => setProfileOpen(true)} title={p ? `${p.name}${p.modified ? " — có thay đổi chưa lưu" : ""}` : "Chọn hồ sơ sản phẩm"}>
      <Package size={15} color="var(--brand)" />
      <span className="lbl">Hồ sơ:</span>
      <span className="t">{p ? p.name : "Chưa chọn"}</span>
      {p?.modified && <i className="dot" />}
      <ChevronDown size={14} color="var(--text-3)" />
    </button>
  );
}

function Topbar() {
  const { state, current, run, go, busy, toast } = useApp();
  const s = STEPS[STEP_INDEX[current]];
  const ph = PHASES.find((p) => p.id === s.phase);
  const work = STEPS.filter((x) => !x.noRun);
  const doneCount = work.filter((x) => { const st = state?.steps.find((y) => y.id === x.id)?.state; return st === "done" || st === "skipped"; }).length;
  const runAll = async () => {
    const r = await run("Chạy tự động các bước còn lại", "runAll");
    if (!r) return;
    const ran = r.run.ran.length;
    if (r.run.stoppedAt) { toast("warn", `Đã chạy ${ran} bước — tạm dừng`, r.run.reason); go(r.run.stoppedAt); }
    else { toast("ok", `Đã chạy xong ${ran} bước`, "Sẵn sàng xuất kết quả."); go("export"); }
  };
  const reset = async () => { if (window.confirm("Xóa dữ liệu đã nạp và mọi kết quả? (Thiết lập, bộ từ khóa, Industry Master, từ điển doanh nghiệp được giữ lại.)")) { await run("Làm mới", "resetAll"); go("upload"); } };
  return (
    <header className="topbar">
      <div className="crumb" title={`Giai đoạn ${ph.id} · ${ph.label}`}><b>Bước {s.no}/{STEPS.length}</b> · {s.label}</div>
      <ProfileChip />
      <div className="progress-wrap">
        <div className="progress-label"><span>Tiến độ quy trình</span><span>{doneCount}/{work.length} bước</span></div>
        <div className="progress-track"><div className="progress-fill" style={{ width: (doneCount / work.length) * 100 + "%" }} /></div>
      </div>
      <Btn kind="grad" icon={busy ? Loader2 : Rocket} disabled={!!busy || !state?.years?.length} onClick={runAll} title="Chạy lần lượt mọi bước chưa hoàn tất với thiết lập hiện tại">Chạy tự động các bước còn lại</Btn>
      <Btn kind="ghost" icon={RotateCcw} disabled={!!busy || !state?.sources?.length} onClick={reset}>Làm lại</Btn>
    </header>
  );
}

function HelpDrawer() {
  const { help, setHelp } = useApp();
  if (!help) return null;
  const s = STEPS[STEP_INDEX[help]];
  const g = GUIDES[help];
  return (
    <>
      <div className="drawer-back" onClick={() => setHelp(null)} />
      <aside className="drawer" role="dialog" aria-label="Hướng dẫn">
        <div className="drawer-h" style={{ background: `linear-gradient(120deg, var(--phase-${s.phase}), var(--phase-${s.phase}-d))` }}>
          <HelpCircle size={22} />
          <div><div className="hero-kicker">Bước {s.no}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{s.label}</div><div className="small" style={{ opacity: 0.9 }}>{g.tagline}</div></div>
          <button className="x-btn" onClick={() => setHelp(null)}><X size={18} /></button>
        </div>
        <div className="drawer-b">
          <h4>Mục đích</h4><p>{g.purpose}</p>
          <h4>Bạn cần làm</h4><p>{g.todo}</p>
          <h4>Kết quả</h4><p>{g.result}</p>
          {g.details}
          <h4>Tài liệu đầy đủ</h4><p><a href={GUIDE_URL} download>Tải hướng dẫn sử dụng đầy đủ (Word)</a> — quy trình, logic & công thức từng bước, hồ sơ sản phẩm, câu hỏi thường gặp.</p>
        </div>
      </aside>
    </>
  );
}

const T_ICON = { ok: CheckCircle2, bad: XCircle, warn: AlertTriangle, info: Info };
const T_COLOR = { ok: "var(--ok)", bad: "var(--bad)", warn: "var(--warn)", info: "var(--info)" };
function Toasts() {
  const { toasts, closeToast } = useApp();
  return (
    <div className="toasts">
      {toasts.map((t) => { const I = T_ICON[t.kind] || Info; return (
        <div key={t.id} className="toast" style={{ "--t-c": T_COLOR[t.kind] }}>
          <I size={20} color={T_COLOR[t.kind]} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div className="toast-t">{t.title}</div>
            {t.desc && <div className="toast-d">{t.desc}</div>}
            {t.list?.length > 0 && <ul>{t.list.slice(0, 6).map((x) => <li key={x}>{x}</li>)}</ul>}
          </div>
          <button onClick={() => closeToast(t.id)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--text-3)", alignSelf: "flex-start" }}><X size={16} /></button>
        </div>
      ); })}
    </div>
  );
}

function Busy() {
  const { busy } = useApp();
  if (!busy) return null;
  return (
    <div className="busy">
      <div className="busy-card">
        <Loader2 size={20} className="spin" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{busy.label}</div>
          <div className="small" style={{ color: "var(--ink-200)" }}>{busy.message || "Đang xử lý…"}</div>
        </div>
        <div className="busy-bar"><span style={{ width: Math.round((busy.pct || 0.03) * 100) + "%" }} /></div>
        <b style={{ fontSize: 12.5, minWidth: 36, textAlign: "right" }}>{Math.round((busy.pct || 0) * 100)}%</b>
      </div>
    </div>
  );
}

function Shell() {
  const { current, state } = useApp();
  const View = VIEWS[current];
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">{state ? <View key={current} /> : <div className="empty"><Loader2 className="spin" /> Đang khởi động bộ xử lý…</div>}</main>
      </div>
      <HelpDrawer />
      <ProfileManager />
      <Toasts />
      <Busy />
    </div>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
