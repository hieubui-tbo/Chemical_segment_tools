import { useEffect, useMemo, useState } from "react";
import { Download, KeyRound, Trash2, SkipForward, ArrowRight, FileSpreadsheet, FileText, PackageOpen, Save, Layers, Plus, Check, Undo2, ArrowUp, ArrowDown, ScanSearch, Loader2 } from "lucide-react";
import { useApp } from "../ui/store.jsx";
import { Card, Kpi, Btn, Pill, Callout, Field, Toggle, Seg, DropZone, Table, StepHero, RunBar, Empty, Tabs, RadioCards } from "../ui/components.jsx";
import { SEGMENT_BASIS } from "../engine/constants.js";
import { OUT_OF_SCOPE, UNCLASSIFIED } from "../engine/steps/price.js";
import { PriceCompare, StackRows, MiniBox, useSegColors } from "../ui/charts.jsx";
import { n, pct, usd, price } from "../ui/format.js";

const XLS = ".xlsx,.xls,.xlsb,.csv";
function YearSelect({ years, value, onChange }) {
  const { yLabel } = useApp();
  return <select className="select" style={{ width: 200, padding: "6px 10px" }} value={value} onChange={(e) => onChange(e.target.value)}>{years.map((y) => <option key={y} value={y}>Năm {yLabel(y)}</option>)}</select>;
}
/** Cảnh báo năm chưa đủ 12 tháng. */
function PartialYearNote() {
  const { state } = useApp();
  const p = (state?.years || []).filter((y) => y.coverage?.partial);
  if (!p.length) return null;
  return <Callout kind="warn" title="Năm chưa đủ 12 tháng:">{p.map((y) => y.label).join(", ")} — tổng lượng / trị giá thấp hơn năm đủ là do thiếu tháng, không nên so sánh trực tiếp. Giá bình quân, cơ cấu phân khúc vẫn so sánh được.</Callout>;
}

/* ═════════ BƯỚC 10 — BỘ PHÂN KHÚC & TỪ KHÓA ═════════ */
const SEG_PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
let _sid = 0;
const lines = (t) => String(t || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
const toDraft = (kw) => ({
  segments: (kw?.segments || []).map((sg) => ({ id: ++_sid, name: sg.name, inc: sg.include.join("\n"), exc: sg.exclude.join("\n") })),
  excl: (kw?.exclusions || []).join("\n"),
});
const fromDraft = (d) => ({ segments: d.segments.map((sg) => ({ name: sg.name.trim(), include: lines(sg.inc), exclude: lines(sg.exc) })), exclusions: lines(d.excl) });

function CoverageBar({ pv, colors }) {
  const T = pv.totals.value || 1;
  const parts = [...pv.segments.map((sg) => ({ k: sg.segment, v: sg.value, c: colors[sg.segment] })), { k: "Ngoài phạm vi", v: pv.totals.outValue, c: "#D3D8E6" }, { k: "Chưa phân loại", v: pv.totals.unValue, c: "#A3ACC6" }].filter((x) => x.v > 0);
  return (
    <>
      <div className="cov-bar">{parts.map((x) => <span key={x.k} title={`${x.k}: ${pct(x.v / T, 1)}`} style={{ width: (x.v / T) * 100 + "%", background: x.c }} />)}</div>
      <div className="legend mt8">{parts.map((x) => <span key={x.k}><i style={{ background: x.c }} />{x.k} <b>{pct(x.v / T, 0)}</b></span>)}</div>
    </>
  );
}

export function KeywordsStep() {
  const { state, run, query, uploadTo, download, goNext, stepState, toast, saveProfileLocal } = useApp();
  const K = state?.refs?.keywords;
  const skipped = state?.refs?.keywordsSkipped;
  const st = stepState("keywords");
  const hasData = (state?.years?.length || 0) > 0;
  const kKey = K ? K.fileName + "|" + K.segments.map((x) => x.name + x.include + "/" + x.exclude).join(",") : "none";
  const [tab, setTab] = useState("edit");
  const [draft, setDraft] = useState(null);
  const [base, setBase] = useState("");
  const [pv, setPv] = useState(null);
  const [pvBusy, setPvBusy] = useState(false);
  const [testText, setTestText] = useState("");
  const [testRes, setTestRes] = useState(null);

  useEffect(() => { query("getKeywords").then((kw) => { const d = toDraft(kw); setDraft(d); setBase(JSON.stringify(fromDraft(d))); setPv(null); }); }, [kKey, query]);
  const def = useMemo(() => (draft ? fromDraft(draft) : null), [draft]);
  const dirty = draft && JSON.stringify(def) !== base;
  const colors = useMemo(() => Object.fromEntries((draft?.segments || []).map((sg, i) => [sg.name.trim(), SEG_PALETTE[i % SEG_PALETTE.length]])), [draft]);
  const validNames = draft ? draft.segments.every((sg) => sg.name.trim()) && new Set(draft.segments.map((sg) => sg.name.trim().toLowerCase())).size === draft.segments.length : false;

  // thử nhanh (trễ 250ms)
  useEffect(() => {
    if (!def || !testText.trim()) { setTestRes(null); return; }
    const t = setTimeout(() => { query("testKeywords", { def, text: testText }).then(setTestRes).catch(() => setTestRes(null)); }, 250);
    return () => clearTimeout(t);
  }, [testText, def, query]);

  if (!draft) return <><StepHero id="keywords" /><Empty title="Đang tải bộ phân khúc…" /></>;
  const upd = (id, patch) => setDraft((d) => ({ ...d, segments: d.segments.map((sg) => (sg.id === id ? { ...sg, ...patch } : sg)) }));
  const move = (i, dir) => setDraft((d) => { const a = [...d.segments]; const j = i + dir; if (j < 0 || j >= a.length) return d; [a[i], a[j]] = [a[j], a[i]]; return { ...d, segments: a }; });
  const del = (sg) => { if (!lines(sg.inc).length || window.confirm(`Xóa phân khúc "${sg.name}"?`)) setDraft((d) => ({ ...d, segments: d.segments.filter((x) => x.id !== sg.id) })); };
  const add = () => setDraft((d) => ({ ...d, segments: [...d.segments, { id: ++_sid, name: `Phân khúc ${d.segments.length + 1}`, inc: "", exc: "" }] }));
  const addTerm = (term, target) => {
    if (target === "__excl") setDraft((d) => ({ ...d, excl: (d.excl ? d.excl + "\n" : "") + term }));
    else setDraft((d) => ({ ...d, segments: d.segments.map((sg) => (String(sg.id) === target ? { ...sg, inc: (sg.inc ? sg.inc + "\n" : "") + term } : sg)) }));
    setPv((p) => (p ? { ...p, suggestions: p.suggestions.filter((x) => x.term !== term) } : p));
  };
  const apply = async () => {
    const r = await run("Áp dụng bộ phân khúc", "setKeywords", { def }, [], { success: "Đã áp dụng bộ phân khúc", successDesc: "Bước 11 trở đi sẽ tính lại khi bạn chạy." });
    if (r) { setBase(JSON.stringify(def)); if (r.summary?.conflicts?.length) toast("warn", `${r.summary.conflicts.length} từ khóa nằm ở nhiều phân khúc`, r.summary.conflicts.slice(0, 6).map((c) => `${c.keyword} (${c.segments})`).join(" · ")); }
  };
  const preview = async () => {
    setPvBusy(true);
    try { setPv(await query("previewKeywords", { def })); }
    catch (e) { toast("bad", "Không xem trước được", e.message); }
    finally { setPvBusy(false); }
  };
  const nKw = def.segments.reduce((a, sg) => a + sg.include.length, 0);

  return (
    <>
      <StepHero id="keywords" />
      <Tabs color="var(--phase-D)" value={tab} onChange={setTab} tabs={[{ value: "edit", label: "Soạn phân khúc", count: def.segments.length }, { value: "preview", label: "Xem trước độ phủ & gợi ý" }, { value: "excel", label: "Nhập / xuất Excel" }]} />

      {tab === "edit" && (
        <>
          <Card title="Phân khúc & từ khóa" sub={`${def.segments.length} phân khúc · ${n(nKw)} từ khóa · ${n(def.exclusions.length)} từ khóa loại trừ. Thứ tự phân khúc dùng để phân xử khi hòa.`}
            tools={<>
              <Btn kind="soft" size="sm" icon={Plus} onClick={add}>Thêm phân khúc</Btn>
              {dirty && <Btn kind="ghost" size="sm" icon={Undo2} onClick={() => setDraft(toDraft(JSON.parse(base)))}>Hoàn tác</Btn>}
              <Btn kind="primary" size="sm" color="var(--phase-D)" icon={Check} disabled={!dirty || !validNames || !def.segments.length} onClick={apply}>Áp dụng</Btn>
            </>}>
            {dirty && <Callout kind="warn">Có thay đổi chưa áp dụng — bấm <b>Áp dụng</b> để dùng cho bước Phân loại.</Callout>}
            {!validNames && <Callout kind="bad">Tên phân khúc không được để trống hoặc trùng nhau.</Callout>}
            {!def.segments.length && <Empty icon={Layers} title="Chưa có phân khúc nào">Bấm <b>Thêm phân khúc</b>, chọn một hồ sơ có sẵn ở bước 1, hoặc tải tệp Excel ở thẻ “Nhập / xuất Excel”.</Empty>}
            <div className="seg-grid">
              {draft.segments.map((sg, i) => (
                <div key={sg.id} className="seg-card" style={{ "--seg-c": SEG_PALETTE[i % SEG_PALETTE.length] }}>
                  <div className="seg-head">
                    <input className="input" value={sg.name} onChange={(e) => upd(sg.id, { name: e.target.value })} placeholder="Tên phân khúc" />
                    <button className="seg-ico" title="Lên" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
                    <button className="seg-ico" title="Xuống" disabled={i === draft.segments.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
                    <button className="seg-ico" title="Xóa phân khúc" onClick={() => del(sg)}><Trash2 size={15} /></button>
                  </div>
                  <div className="lab"><span>Từ khóa — mỗi dòng một từ</span><span>{lines(sg.inc).length}</span></div>
                  <textarea className="input" value={sg.inc} onChange={(e) => upd(sg.id, { inc: e.target.value })} placeholder={"FERTILIZER\nPHAN BON\nGALVANIZ*"} />
                  <div className="lab"><span>Loại trừ riêng (không xếp vào phân khúc này)</span><span>{lines(sg.exc).length}</span></div>
                  <textarea className="input" style={{ minHeight: 54 }} value={sg.exc} onChange={(e) => upd(sg.id, { exc: e.target.value })} placeholder="FEED GRADE" />
                </div>
              ))}
              <div className="seg-card out">
                <div className="seg-head"><b style={{ color: "var(--bad-d)" }}>LOẠI TRỪ — ngoài phạm vi sản phẩm</b></div>
                <div className="hint">Mô tả chứa các từ này bị gắn “Ngoài phạm vi sản phẩm” và loại khỏi chỉ số giá (ví dụ: hàng khác lẫn trong dữ liệu vận đơn).</div>
                <textarea className="input" value={draft.excl} onChange={(e) => setDraft((d) => ({ ...d, excl: e.target.value }))} placeholder={"BENZYL\nZINC CHLORIDE"} />
              </div>
            </div>
            <div className="hint mt12">Quy ước: không phân biệt hoa/thường & dấu (PHÂN BÓN = PHAN BON) · khớp theo từ nguyên vẹn (UREA không khớp THIOUREA) · <code>*</code> ở cuối = mọi từ bắt đầu bằng (PHOSPHAT* → PHOSPHATE, PHOSPHATES) · chọn “Mô tả + mã HS” ở bước 11 để dùng từ khóa mã HS dạng <code>3102*</code>.</div>
          </Card>
          <Card title="Thử nhanh một mô tả" sub="Gõ hoặc dán một mô tả hàng hóa để xem bộ phân khúc (đang soạn) xếp nó vào đâu.">
            <input className="input" value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Dán một mô tả hàng hóa, ví dụ: … FERTILIZER GRADE, 50KG BAG" />
            {testRes && (
              <div className="test-res">
                <b>Kết quả:</b> {testRes.segment ? <Pill tone={testRes.segment === OUT_OF_SCOPE ? "bad" : "ok"}>{testRes.segment}</Pill> : <Pill tone="mute">Chưa phân loại</Pill>} {testRes.confidence && <span className="muted small">· {testRes.confidence}</span>}
                {testRes.hits.length > 0 && <div className="small mt8">Từ khóa khớp: {testRes.hits.map((h, k) => <span key={k} className="chip" style={{ marginRight: 6 }}>{h.type === "exc" ? "−" : ""}{h.keyword} <span className="muted">({h.segment})</span></span>)}</div>}
                {testRes.detail && testRes.detail.startsWith("(") && <div className="small muted mt8">{testRes.detail}</div>}
              </div>
            )}
          </Card>
          {state?.profile && (dirty || state.profile.modified) && (
            <Callout kind="info" title="Lưu lại để dùng lần sau:">bộ phân khúc đã chỉnh chỉ có hiệu lực trong phiên này cho tới khi bạn lưu vào hồ sơ. <Btn kind="ghost" size="sm" icon={Save} disabled={dirty} onClick={() => saveProfileLocal({})}>Lưu vào hồ sơ “{state.profile.name}”</Btn>{dirty && <span className="small muted"> (chọn Áp dụng trước)</span>}</Callout>
          )}
        </>
      )}

      {tab === "preview" && (
        <Card title="Xem trước độ phủ trên dữ liệu đã tải" sub="Chạy bộ phân khúc ĐANG SOẠN trên toàn bộ mô tả — không thay đổi kết quả hiện có. Gợi ý lấy từ các mô tả chưa khớp, xếp theo trị giá."
          tools={<Btn kind="primary" size="sm" color="var(--phase-D)" icon={pvBusy ? Loader2 : ScanSearch} disabled={!hasData || pvBusy || !def.segments.length} onClick={preview}>{pv ? "Xem trước lại" : "Xem trước"}</Btn>}>
          {!hasData && <Callout kind="info">Tải & xác nhận dữ liệu (bước 1–2) để xem trước độ phủ.</Callout>}
          {hasData && !pv && <Empty icon={ScanSearch} title="Bấm “Xem trước” để chạy thử">Bạn sẽ thấy tỷ lệ trị giá được phân loại, phân khúc nào chiếm bao nhiêu, và các cụm từ nên bổ sung.</Empty>}
          {pv && (
            <>
              <div className="kpis mb12">
                <Kpi label="Trị giá được phân loại" value={pct(pv.totals.matchedValue / (pv.totals.value || 1), 1)} color="var(--phase-D)" sub={`${n(pv.totals.matchedRows)} / ${n(pv.totals.rows)} dòng`} />
                <Kpi label="Ngoài phạm vi" value={pct(pv.totals.outValue / (pv.totals.value || 1), 1)} color="var(--bad)" sub={`${n(pv.totals.outRows)} dòng`} />
                <Kpi label="Chưa phân loại" value={pct(pv.totals.unValue / (pv.totals.value || 1), 1)} color="var(--text-3)" sub={`${n(pv.totals.unRows)} dòng · ${n(pv.unmatchedDistinct)} mô tả`} />
                <Kpi label="Hòa giữa phân khúc" value={n(pv.totals.ties)} color="var(--warn)" sub="nên rà soát" />
                {pv.totals.noDesc > 0 && <Kpi label="Dòng không có mô tả" value={n(pv.totals.noDesc)} color="var(--text-3)" sub="cần ngành doanh nghiệp để phân loại" />}
              </div>
              <CoverageBar pv={pv} colors={colors} />
              {dirty && <div className="hint mt8">Đây là kết quả của bản đang soạn (chưa áp dụng).</div>}
              {pv.deadKeywords.length > 0 && <Callout kind="info" title={`${pv.deadKeywords.length} từ khóa không khớp dòng nào:`}>{pv.deadKeywords.slice(0, 30).join(" · ")}{pv.deadKeywords.length > 30 ? " …" : ""}</Callout>}
              <div className="sec-title mt16">Gợi ý từ khóa từ mô tả chưa phân loại</div>
              <Table maxHeight={420} empty="Không có gợi ý — độ phủ đã tốt." columns={[
                { key: "term", label: "Từ / cụm từ", render: (x) => <span className="sug-term">{x.term}</span> },
                { key: "value", label: "Trị giá", num: true, render: (x) => usd(x.value) },
                { key: "share", label: "% chưa phân loại", num: true, render: (x) => pct(x.share, 1) },
                { key: "rows", label: "Dòng", num: true, render: (x) => n(x.rows) },
                { key: "sample", label: "Ví dụ mô tả", className: "wrap", render: (x) => <span className="small muted clamp2" title={x.sample}>{x.sample}</span> },
                { key: "add", label: "Thêm vào", render: (x) => (
                  <select className="select" style={{ padding: "4px 8px", width: 150 }} value="" onChange={(e) => e.target.value && addTerm(x.term, e.target.value)}>
                    <option value="">— chọn —</option>
                    {draft.segments.map((sg) => <option key={sg.id} value={String(sg.id)}>{sg.name}</option>)}
                    <option value="__excl">LOẠI TRỪ</option>
                  </select>
                ) },
              ]} rows={pv.suggestions} />
              <div className="sec-title mt16">Mô tả chưa phân loại có trị giá lớn nhất</div>
              <Table maxHeight={360} columns={[{ key: "desc", label: "Mô tả hàng hóa", className: "wrap" }, { key: "rows", label: "Dòng", num: true, render: (u) => n(u.rows) }, { key: "value", label: "Trị giá", num: true, render: (u) => usd(u.value) }]} rows={pv.unmatchedTop} />
              <div className="hint mt8">Thêm từ khóa xong, quay lại thẻ <b>Soạn phân khúc</b> → <b>Áp dụng</b>, hoặc bấm <b>Xem trước lại</b> để kiểm tra độ phủ mới.</div>
            </>
          )}
        </Card>
      )}

      {tab === "excel" && (
        <Card title="Nhập / xuất bộ phân khúc bằng Excel" sub="Định dạng: STT | Phân khúc 1 | Phân khúc 2 | … (từ khóa liệt kê dưới mỗi cột). Có thể thêm cột LOẠI TRỪ.">
          <DropZone accept={XLS} color="var(--phase-D)" icon={KeyRound} title="Kéo thả tệp bộ từ khóa (thay thế bộ hiện tại)" sub="Hỗ trợ * (tiền tố), - (loại trừ riêng), cột LOẠI TRỪ (ngoài phạm vi sản phẩm)"
            onFiles={(f) => uploadTo("loadKeywords", f.slice(0, 1), "Đọc bộ từ khóa")} />
          <div className="row mt12">
            <Btn kind="ghost" size="sm" icon={Download} onClick={() => download("Tạo mẫu", "exportTemplate", { kind: "keywords" })}>Tệp mẫu + quy ước</Btn>
            {def.segments.length > 0 && <Btn kind="ghost" size="sm" icon={FileSpreadsheet} onClick={() => download("Xuất bộ phân khúc", "exportKeywords", { def })}>Xuất bộ phân khúc đang soạn ra Excel</Btn>}
            {K && <Btn kind="danger" size="sm" icon={Trash2} onClick={() => run("Gỡ bộ từ khóa", "clearKeywords")}>Gỡ bộ phân khúc</Btn>}
          </div>
          {K && <div className="small muted mt12">Đang dùng: <b>{K.fileName}</b> · {K.segments.length} phân khúc</div>}
          {K?.warnings?.length > 0 && <Callout kind="info">{K.warnings.slice(0, 5).join(" · ")}</Callout>}
        </Card>
      )}

      {skipped && <Callout kind="warn">Đang bỏ qua bộ từ khóa — phân loại chỉ dựa vào Phân khúc ngành của doanh nghiệp (bước 9).</Callout>}
      <div className="action-bar">
        {(K || skipped) && !dirty && <Btn kind="primary" size="lg" color="var(--phase-D)" icon={ArrowRight} onClick={() => goNext("keywords")}>Sang bước Phân loại</Btn>}
        {!K && !skipped && st.can && <Btn kind="ghost" icon={SkipForward} onClick={() => run("Bỏ qua", "skipStep", { id: "keywords" }, [], { success: "Đã bỏ qua bộ từ khóa", successDesc: "Phân loại sẽ chỉ dựa vào ngành của doanh nghiệp." })}>Không dùng từ khóa (bỏ qua)</Btn>}
        {dirty && <div className="note">Áp dụng thay đổi trước khi sang bước Phân loại.</div>}
      </div>
    </>
  );
}

/* ═════════ BƯỚC 11 — PHÂN LOẠI ═════════ */
export function ClassifyStep() {
  const { state, run } = useApp();
  const S = state?.settings || {};
  const R = state?.results?.classify;
  const years = state?.years?.map((y) => y.year) || [];
  const [year, setYear] = useState(years[years.length - 1]);
  const [kwSort, setKwSort] = useState("hits");
  const colors = useSegColors(state);
  const tot = R ? years.reduce((a, yr) => { const v = R.years[yr]; ["keyword", "industry", "unclassified", "outOfScope", "ties", "mismatch", "rows"].forEach((k) => (a[k] = (a[k] || 0) + v[k])); return a; }, {}) : null;
  const kws = useMemo(() => (R?.keywordStats || []).slice().sort(kwSort === "dead" ? (a, b) => a.rows - b.rows : (a, b) => b.rows - a.rows), [R, kwSort]);
  return (
    <>
      <StepHero id="classify" />
      <Card title="Thiết lập theo ý đồ phân khúc" sub="Các lựa chọn này được lưu trong hồ sơ sản phẩm.">
        <Field label="Cách xác định phân khúc" hint="Chọn theo câu hỏi nghiên cứu: phân khúc theo MÔ TẢ HÀNG HÓA (cấp chất lượng, ứng dụng ghi trên tờ khai) hay theo NGÀNH CỦA doanh nghiệp MUA (cần Industry Master ở bước 9).">
          <RadioCards color="var(--phase-D)" value={S.segmentBasis || "keyword_first"} onChange={(v) => run("Cập nhật", "updateSettings", { partial: { segmentBasis: v } })}
            options={Object.entries(SEGMENT_BASIS).map(([value, b]) => ({ value, label: b.label, desc: b.order, badge: value === "keyword_first" ? <Pill tone="ok">mặc định</Pill> : null }))} />
        </Field>
        <div className="grid-2 mt12">
          <Field label="Trường dùng để khớp từ khóa" hint="“Mô tả + mã HS” cho phép phân khúc theo mã HS bằng từ khóa dạng 3102* (cần ánh xạ cột Mã HS ở bước 2).">
            <Seg value={S.keywordFields || "desc"} onChange={(v) => run("Cập nhật", "updateSettings", { partial: { keywordFields: v } })} options={[{ value: "desc", label: "Mô tả hàng hóa" }, { value: "desc_hs", label: "Mô tả + mã HS" }]} />
          </Field>
          <Field label="Cách khớp từ khóa" hint="Từ nguyên vẹn: “UREA” không khớp “THIOUREA”. Chứa chuỗi: giữ hành vi bản cũ (dễ khớp nhầm với từ khóa ngắn).">
            <Seg value={S.keywordMatchMode} onChange={(v) => run("Cập nhật", "updateSettings", { partial: { keywordMatchMode: v } })} options={[{ value: "word", label: "Từ nguyên vẹn (khuyến nghị)" }, { value: "substring", label: "Chứa chuỗi (như bản cũ)" }]} />
          </Field>
        </div>
      </Card>
      <RunBar id="classify" label="Chạy phân loại" note={`Thứ tự: ${(SEGMENT_BASIS[S.segmentBasis] || SEGMENT_BASIS.keyword_first).order}.`} />
      {R && (
        <>
          <div className="kpis mb12">
            <Kpi label="Phân loại theo từ khóa" value={pct(tot.keyword / tot.rows, 0)} color="var(--phase-D)" sub={`${n(tot.keyword)} dòng`} />
            <Kpi label={R.basis === "industry_first" || R.basis === "industry_only" ? "Theo ngành của doanh nghiệp" : "Theo ngành (dự phòng)"} value={pct(tot.industry / tot.rows, 0)} color="var(--phase-C)" sub={`${n(tot.industry)} dòng`} />
            <Kpi label="Chưa phân loại" value={pct(tot.unclassified / tot.rows, 0)} color="var(--text-3)" sub={`${n(tot.unclassified)} dòng · ${n(R.unclassifiedDistinct)} mô tả khác nhau`} />
            <Kpi label="Ngoài phạm vi sản phẩm" value={n(tot.outOfScope)} color="var(--bad)" sub="loại khỏi chỉ số giá" />
            <Kpi label="Hòa giữa phân khúc" value={n(tot.ties)} color="var(--warn)" sub="nên rà soát" />
            {tot.mismatch > 0 && <Kpi label="Từ khóa khác ngành" value={n(tot.mismatch)} color="var(--warn)" />}
          </div>
          {R.industryNotInMatrix?.length > 0 && <Callout kind="warn" title="Phân khúc ngành không trùng tên phân khúc trong bộ từ khóa:">{R.industryNotInMatrix.map((x) => `${x.segment} (${n(x.rows)} dòng)`).join(" · ")}. Nên thống nhất tên để báo cáo không bị tách phân khúc.</Callout>}
          <PartialYearNote />
          <Card title="Cơ cấu trị giá theo phân khúc qua các năm" sub="Di chuột lên từng đoạn để xem chi tiết.">
            <StackRows years={years} data={Object.fromEntries(years.map((yr) => [yr, R.years[yr].segments]))} colors={colors} labels={Object.fromEntries((state?.years || []).map((y) => [y.year, y.label]))} />
          </Card>
          <div className="grid-2">
            <Card title="Phân khúc theo năm" tools={<YearSelect years={years} value={year} onChange={setYear} />}>
              <Table maxHeight={380} columns={[
                { key: "segment", label: "Phân khúc", render: (s) => <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: colors[s.segment], marginRight: 8 }} />{s.segment}</span> },
                { key: "rows", label: "Dòng", num: true, render: (s) => n(s.rows) }, { key: "value", label: "Trị giá", num: true, render: (s) => usd(s.value) },
              ]} rows={R.years[year]?.segments || []} />
            </Card>
            <Card title="Thống kê từ khóa" sub={R.deadKeywords ? `${R.deadKeywords} từ khóa không khớp dòng nào` : ""} tools={<Seg value={kwSort} onChange={setKwSort} options={[{ value: "hits", label: "Khớp nhiều" }, { value: "dead", label: "Không khớp" }]} />}>
              {R.hasMatrix ? <Table maxHeight={380} columns={[{ key: "keyword", label: "Từ khóa", render: (k) => <b>{k.keyword}</b> }, { key: "segment", label: "Phân khúc" }, { key: "rows", label: "Dòng khớp", num: true, render: (k) => (k.rows ? n(k.rows) : <Pill tone="mute">0</Pill>) }]} rows={kws} /> : <Empty title="Không dùng bộ từ khóa" />}
            </Card>
          </div>
          <Card title="Mô tả chưa phân loại" sub="Sắp xếp theo trị giá. Mở bước 10 → “Xem trước độ phủ & gợi ý” để được gợi ý từ khóa tự động và thêm bằng một cú bấm.">
            <Table maxHeight={420} columns={[{ key: "desc", label: "Mô tả hàng hóa", className: "wrap" }, { key: "rows", label: "Dòng", num: true, render: (u) => n(u.rows) }, { key: "value", label: "Trị giá", num: true, render: (u) => usd(u.value) }]} rows={R.unclassifiedTop} />
          </Card>
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 12 — IQR ═════════ */
export function IqrStep() {
  const { state, run } = useApp();
  const S = state?.settings || {};
  const R = state?.results?.iqr;
  const years = state?.years?.map((y) => y.year) || [];
  const [year, setYear] = useState(years[years.length - 1]);
  const colors = useSegColors(state);
  const upd = (partial) => run("Cập nhật", "updateSettings", { partial });
  const rows = R?.years?.[year] ? Object.entries(R.years[year]).map(([segment, v]) => ({ segment, ...v })).sort((a, b) => b.n - a.n) : [];
  const totOut = R ? years.reduce((a, yr) => a + Object.values(R.years[yr]).reduce((b, v) => b + v.outliers, 0), 0) : 0;
  return (
    <>
      <StepHero id="iqr" />
      <Card title="Thiết lập">
        <div className="settings-grid">
          <Field label="Hệ số k" hint="1,5 = chuẩn Tukey. 3 = chỉ bắt giá trị ngoại lai cực đoan."><Seg value={S.iqrMultiplier} onChange={(v) => upd({ iqrMultiplier: v })} options={[{ value: 1.5, label: "1,5 (chuẩn)" }, { value: 2, label: "2" }, { value: 3, label: "3 (cực đoan)" }]} /></Field>
          <Field label="Số giá tối thiểu mỗi nhóm" hint="Ít hơn ⇒ “Không đủ dữ liệu”."><Seg value={S.iqrMinN} onChange={(v) => upd({ iqrMinN: v })} options={[4, 8, 12, 20].map((v) => ({ value: v, label: String(v) }))} /></Field>
          <Field label="Thang đo" hint="Log phù hợp khi giá trải rộng nhiều bậc (thuốc thử vs phân bón)."><Toggle checked={S.iqrLog} onChange={(v) => upd({ iqrLog: v })} color="var(--phase-D)" label="Tính trên logarit của giá" /></Field>
        </div>
      </Card>
      <RunBar id="iqr" label="Chạy lọc IQR" note="Nhóm theo Năm × Phân khúc cuối cùng; tứ phân vị như Excel QUARTILE.INC." />
      {R && (
        <>
          <div className="kpis mb12">
            <Kpi label="Tổng dòng giá trị ngoại lai IQR (mọi năm)" value={n(totOut)} color="var(--phase-D)" />
            <Kpi label="Thiết lập" value={`k = ${R.k}`} color="var(--text-3)" sub={`${R.useLog ? "logarit của giá" : "giá gốc"} · tối thiểu ${R.minN} giá`} />
          </div>
          <Card title="Thống kê theo phân khúc" sub="Hộp = Q1→Q3, vạch đậm = trung vị, râu = ngưỡng dưới→ngưỡng trên (USD/tấn)." tools={<YearSelect years={years} value={year} onChange={setYear} />}>
            <Table maxHeight={560} columns={[
              { key: "segment", label: "Phân khúc", render: (r) => <b>{r.segment}</b> },
              { key: "n", label: "Số giá", num: true, render: (r) => n(r.n) },
              { key: "box", label: "Phân bố", render: (r) => <MiniBox v={r} color={colors[r.segment] || "#E8590C"} /> },
              { key: "q1", label: "Q1", num: true, render: (r) => price(r.q1) }, { key: "median", label: "Trung vị", num: true, render: (r) => <b>{price(r.median)}</b> }, { key: "q3", label: "Q3", num: true, render: (r) => price(r.q3) },
              { key: "lower", label: "Ngưỡng dưới", num: true, render: (r) => price(r.lower) }, { key: "upper", label: "Ngưỡng trên", num: true, render: (r) => price(r.upper) },
              { key: "outliers", label: "Ngoại lai", num: true, render: (r) => (r.outliers ? <Pill tone="warn">{n(r.outliers)} ({pct(r.outliers / Math.max(1, r.n), 0)})</Pill> : "0") },
              { key: "note", label: "Ghi chú", className: "small muted wrap" },
            ]} rows={rows} />
          </Card>
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 13 — CHỈ SỐ PHÂN KHÚC ═════════ */
const RULES = [
  { value: "AND", label: "AND — vừa lệch giá trị vừa giá trị ngoại lai IQR", desc: "Thận trọng nhất, giống bản cũ. Có thể bỏ sót lỗi sai đơn vị (dòng sai đơn vị thường vẫn khớp Đơn giá × Lượng)." },
  { value: "IQR", label: "IQR — mọi giá trị ngoại lai IQR", desc: "Khuyến nghị cho phân tích mặt bằng giá: loại mọi mức giá bất thường trong phân khúc." },
  { value: "OR", label: "OR — lệch giá trị HOẶC giá trị ngoại lai IQR", desc: "Chặt nhất: loại thêm cả dòng có số liệu tự mâu thuẫn." },
];
export function MetricsStep() {
  const { state, run, yLabel } = useApp();
  const S = state?.settings || {};
  const R = state?.results?.metrics;
  const years = state?.years?.map((y) => y.year) || [];
  const [year, setYear] = useState(years[years.length - 1]);
  const colors = useSegColors(state);
  const upd = (partial) => run("Cập nhật", "updateSettings", { partial });
  const Y = R?.years?.[year];
  const sens = Y?.sensitivity;
  return (
    <>
      <StepHero id="metrics" />
      <div className="grid-2">
        <Card title="Quy tắc loại giá trị ngoại lai">
          <RadioCards color="var(--phase-D)" value={S.outlierRule} onChange={(v) => upd({ outlierRule: v })} options={RULES.map((r) => ({ ...r, badge: sens ? <Pill tone="mute">{yLabel(year)}: loại {n(sens[r.value]?.excluded)} dòng · giá BQ {price(sens[r.value]?.avgPrice)}</Pill> : null }))} />
        </Card>
        <Card title="Luôn loại khỏi số liệu sau lọc">
          <ul className="small" style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Dòng <b>Ngoài phạm vi sản phẩm</b> (khớp cột LOẠI TRỪ của bộ từ khóa).</li>
            <li>Dòng <b>nghi trùng nguồn khác</b>: {S.excludeCrossSourceDup ? <Pill tone="ok">đang loại</Pill> : <Pill tone="mute">đang giữ</Pill>} <span className="muted">(đổi ở bước 8)</span></li>
          </ul>
          <div className="mt12"><Toggle checked={S.excludeDuplicates} onChange={(v) => upd({ excludeDuplicates: v })} color="var(--phase-D)" label="Loại cả dòng trùng lặp hoàn toàn (cùng nguồn)" /></div>
          <div className="hint mt8">Mặc định giữ: nhiều lô hàng giống hệt nhau trong cùng tháng là bình thường với dữ liệu hải quan.</div>
        </Card>
      </div>
      <RunBar id="metrics" label="Tính chỉ số phân khúc" note="Giá bình quân = Σ Trị giá / Σ Lượng (tấn)." />
      {R && Y && (
        <>
          <PartialYearNote />
          <Tabs value={year} onChange={setYear} color="var(--phase-D)" tabs={years.map((y) => ({ value: y, label: yLabel(y) }))} />
          <div className="kpis mb12">
            <Kpi label="Giá bình quân sau lọc" value={price(Y.total.after.avgPrice)} sub="USD/tấn — trong phạm vi sản phẩm" color="var(--phase-D)" />
            <Kpi label="Trung vị giá sau lọc" value={price(Y.total.after.median)} sub="USD/tấn" color="var(--phase-D)" />
            <Kpi label="Tổng lượng sau lọc" value={n(Y.total.after.qty, 0)} sub="tấn" color="var(--phase-D)" />
            <Kpi label="Tổng trị giá sau lọc" value={usd(Y.total.after.value)} color="var(--phase-D)" />
            <Kpi label="Dòng có giá: trước → sau" value={`${n(Y.total.before.count)} → ${n(Y.total.after.count)}`} color="var(--text-3)" />
          </div>
          <Card title={`Giá bình quân theo phân khúc — ${year}`} sub="Thanh xám: trước lọc · thanh màu: sau lọc (USD/tấn).">
            <PriceCompare rows={Y.rows.filter((r) => r.segment !== OUT_OF_SCOPE)} colors={colors} />
          </Card>
          <Card title="Bảng chỉ số chi tiết">
            <Table maxHeight={480} rowClass={(r) => (r.__total ? "total" : r.segment === OUT_OF_SCOPE ? "dim" : "")} columns={[
              { key: "segment", label: "Phân khúc", className: "nowrap", render: (r) => <b>{r.segment}</b> },
              { key: "bc", label: "Trước: dòng", num: true, render: (r) => n(r.before.count) }, { key: "bp", label: "Trước: giá BQ", num: true, render: (r) => price(r.before.avgPrice) },
              { key: "ac", label: "Sau: dòng", num: true, render: (r) => n(r.after.count) }, { key: "aq", label: "Sau: lượng (tấn)", num: true, render: (r) => n(r.after.qty, 0) },
              { key: "av", label: "Sau: trị giá", num: true, render: (r) => usd(r.after.value) }, { key: "ap", label: "Sau: giá BQ", num: true, render: (r) => <b>{price(r.after.avgPrice)}</b> },
              { key: "am", label: "Trung vị", num: true, render: (r) => price(r.after.median) }, { key: "p", label: "P25 – P75", num: true, render: (r) => `${price(r.after.p25)} – ${price(r.after.p75)}` },
              { key: "sh", label: "Tỷ trọng lượng", num: true, render: (r) => (r.qtyShare == null ? "—" : pct(r.qtyShare, 1)) },
              { key: "ex", label: "Bị loại", num: true, render: (r) => n(r.excluded) },
            ]} rows={[...Y.rows, { ...Y.total, __total: true, __key: "total" }]} />
            {Object.keys(Y.reasons).length > 0 && <div className="row mt12">{Object.entries(Y.reasons).map(([k, v]) => <span key={k} className="chip">{k}: <b>{n(v)}</b></span>)}</div>}
          </Card>
          <Card title="Tổng hợp nhiều năm (sau lọc)" sub="Lượng (tấn) · Giá bình quân (USD/tấn) theo phân khúc và năm.">
            <div className="tbl-wrap" style={{ maxHeight: 460 }}>
              <table className="tbl">
                <thead><tr><th>Phân khúc</th>{years.map((y) => <th key={y} className="num">{yLabel(y)}</th>)}</tr></thead>
                <tbody>
                  {R.segments.filter((s) => s !== OUT_OF_SCOPE).map((seg) => (
                    <tr key={seg}>
                      <td className="nowrap"><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: colors[seg], marginRight: 8 }} /><b>{seg}</b></td>
                      {years.map((y) => { const v = R.pivot[seg][y]; return <td key={y} className="num">{v && v.count ? <><div><b>{price(v.avgPrice)}</b> <span className="muted small">USD/t</span></div><div className="muted small">{n(v.qty, 0)} tấn</div></> : <span className="muted">—</span>}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 14 — XUẤT KẾT QUẢ ═════════ */
export function ExportStep() {
  const { state, run, download, setProfileOpen, yLabel } = useApp();
  const S = state?.settings || {};
  const years = state?.years?.map((y) => y.year) || [];
  const ready = state?.steps?.find((s) => s.id === "metrics")?.state === "done";
  const anyDone = state?.steps?.some((s) => s.id !== "upload" && s.id !== "schema" && s.state === "done");
  const upd = (partial) => run("Cập nhật", "updateSettings", { partial });
  const all = async () => { await download("Tạo báo cáo kiểm toán", "exportAudit"); for (const y of years) await download(`Tạo dữ liệu chi tiết ${y}`, "exportDetail", { year: y }); };
  return (
    <>
      <StepHero id="export" />
      {!ready && <Callout kind="warn" title="Chưa chạy hết các bước.">Vẫn có thể xuất — các trang tính/cột của bước chưa chạy sẽ để trống. Nên dùng “Chạy tự động các bước còn lại” ở thanh trên cùng.</Callout>}
      <Card title="Thiết lập tệp xuất">
        <div className="settings-grid">
          <Field label="Tên dự án (tiền tố tên file)"><input className="input" defaultValue={S.projectName} onBlur={(e) => e.target.value !== S.projectName && upd({ projectName: e.target.value || "ChemSeg" })} /></Field>
          <Field label="Ngôn ngữ tiêu đề cột tính toán" hint="Tiếng Anh: giữ tên cột kiểu cũ (Purchaser_Standardize…) cho công thức/pivot cũ."><Seg value={S.headerLanguage} onChange={(v) => upd({ headerLanguage: v })} options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "Tiếng Anh" }]} /></Field>
          <Field label="Sheet “Sau lọc”"><Toggle checked={S.exportAfterSheet} onChange={(v) => upd({ exportAfterSheet: v })} color="var(--phase-E)" label="Xuất thêm trang tính chỉ gồm dòng giữ lại" /></Field>
          <Field label="Cột gốc"><Toggle checked={S.exportAllOriginalColumns} onChange={(v) => upd({ exportAllOriginalColumns: v })} color="var(--phase-E)" label="Giữ mọi cột gốc (kể cả cột chưa ánh xạ như SITC)" /></Field>
        </div>
      </Card>
      <div className="grid-2">
        <Card title="Báo cáo kiểm toán" icon={<FileText size={20} color="var(--phase-E)" />} sub="19 trang tính: tổng quan, nhật ký từng bước, từ điển doanh nghiệp, nhóm doanh nghiệp Top, chỉ số, từ điển cột, cấu hình.">
          <Btn kind="primary" size="lg" color="var(--phase-E)" icon={FileSpreadsheet} disabled={!anyDone} onClick={() => download("Tạo báo cáo kiểm toán", "exportAudit")}>Tải báo cáo kiểm toán</Btn>
        </Card>
        <Card title="Dữ liệu chi tiết từng năm" icon={<Layers size={20} color="var(--phase-E)" />} sub="Mọi cột gốc + toàn bộ cột tính toán; mỗi năm một tệp (tránh tràn bộ nhớ).">
          <div className="row">{years.map((y) => <Btn key={y} kind="ghost" icon={Download} disabled={!anyDone} onClick={() => download(`Tạo dữ liệu chi tiết ${y}`, "exportDetail", { year: y })}>{yLabel(y)}</Btn>)}</div>
        </Card>
      </div>
      <Card title="Gói đầy đủ" sub="Tải lần lượt báo cáo kiểm toán và dữ liệu chi tiết của mọi năm.">
        <div className="row">
          <Btn kind="grad" size="lg" icon={PackageOpen} disabled={!anyDone} onClick={all}>Tải tất cả ({years.length + 1} file)</Btn>
          <Btn kind="ghost" icon={Save} onClick={() => setProfileOpen(true)}>Lưu / chia sẻ hồ sơ sản phẩm</Btn>
          <Btn kind="ghost" icon={Download} disabled={!state?.results?.entity} onClick={() => download("Tạo tệp rà soát", "exportEntityReview")}>Tệp rà soát tên doanh nghiệp</Btn>
          <Btn kind="ghost" icon={Download} disabled={!state?.results?.ranking} onClick={() => download("Tạo danh sách", "exportResearchMaster")}>Danh sách doanh nghiệp cần nghiên cứu ngành</Btn>
        </div>
      </Card>
    </>
  );
}
