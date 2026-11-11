import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Trash2, CheckCircle2, Download, FolderOpen, Plus, Wand2, Save, AlertTriangle, Package, Settings2 } from "lucide-react";
import { useApp } from "../ui/store.jsx";
import { Card, Kpi, Btn, Pill, Callout, Field, Toggle, Seg, DropZone, Table, StepHero, RunBar, Empty, Bar } from "../ui/components.jsx";
import { n, pct, usd, price } from "../ui/format.js";
import { PHASES } from "../engine/constants.js";
import { UNIT_KIND } from "../engine/dict/units.js";
import { profileLine } from "../ui/ProfileManager.jsx";

const BY_DATE = "__date";
/** Ô chọn năm của một nguồn: nhập năm, hoặc "tách theo cột ngày" khi sheet chứa nhiều năm. */
function YearCell({ s, value, onChange }) {
  const [manual, setManual] = useState(false);
  if (!s.split) return <input className="input" style={{ width: 90 }} value={value || ""} placeholder="ví dụ: 2024" onChange={(e) => onChange(e.target.value)} />;
  const ys = s.split.years;
  const known = value === BY_DATE || ys.some((x) => x.year === value);
  if (manual || (value && !known)) return <input className="input" style={{ width: 90 }} autoFocus value={value === BY_DATE ? "" : value || ""} placeholder="ví dụ: 2024" onBlur={() => { if (!value) setManual(false); }} onChange={(e) => onChange(e.target.value)} />;
  return (
    <div>
      <select className="select" style={{ width: 300, padding: "6px 8px" }} value={value || ""} onChange={(e) => { if (e.target.value === "__manual") { setManual(true); onChange(""); } else onChange(e.target.value); }}>
        <option value="" disabled>— chọn —</option>
        <option value={BY_DATE}>Tách theo cột “{s.split.header}” ({ys[0]?.year}–{ys[ys.length - 1]?.year})</option>
        {ys.map((x) => <option key={x.year} value={x.year}>Cả trang tính là năm {x.year}</option>)}
        <option value="__manual">Nhập năm khác…</option>
      </select>
      {value === BY_DATE && <div className="small muted" style={{ marginTop: 4 }}>{ys.map((x) => `${x.year}: ${n(x.rows)}`).join(" · ")}{s.split.invalid ? ` · không đọc được ngày: ${n(s.split.invalid)}` : ""}</div>}
    </div>
  );
}

/** Thanh chọn hồ sơ sản phẩm (đầu bước 1). */
function ProfileBar() {
  const { state, library, localProfiles, applyProfile, setProfileOpen } = useApp();
  const cur = state?.profile;
  const all = [...library, ...localProfiles];
  const value = cur ? `${cur.origin}:${cur.id}` : "";
  const pick = (v) => { const p = all.find((x) => `${x._origin}:${x.id}` === v); if (p) applyProfile(p); };
  return (
    <Card className="pf-bar" icon={<span className="pf-bar-ico"><Package size={20} color="#fff" /></span>}
      title="Hồ sơ sản phẩm" sub="Chọn hồ sơ của sản phẩm đang nghiên cứu — bộ phân khúc, từ khóa, hệ số đơn vị, khoảng giá và quy tắc lọc sẽ được nạp sẵn."
      tools={<Btn kind="ghost" size="sm" icon={Settings2} onClick={() => setProfileOpen(true)}>Quản lý hồ sơ</Btn>}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <select className="select" style={{ minWidth: 300, flex: "0 1 420px" }} value={all.some((x) => `${x._origin}:${x.id}` === value) ? value : ""} onChange={(e) => pick(e.target.value)}>
          <option value="" disabled>{cur ? `${cur.name} (chưa lưu)` : all.length ? "— Chọn hồ sơ —" : "— Chưa có hồ sơ nào —"}</option>
          {library.length > 0 && <optgroup label="Thư viện chung">{library.map((p) => <option key={"l" + p.id} value={`library:${p.id}`}>{p.name}</option>)}</optgroup>}
          {localProfiles.length > 0 && <optgroup label="Trên máy này">{localProfiles.map((p) => <option key={"m" + p.id} value={`local:${p.id}`}>{p.name}</option>)}</optgroup>}
        </select>
        <div style={{ flex: 1, minWidth: 240 }}>
          {cur ? (
            <>
              <div className="small"><b>{cur.name}</b>{cur.product ? ` · ${cur.product}` : ""}{cur.hsCodes?.length ? ` · HS ${cur.hsCodes.join(", ")}` : ""} {cur.modified && <Pill tone="warn">đã chỉnh — chưa lưu</Pill>}</div>
              <div className="small muted">{profileLine(cur)}</div>
            </>
          ) : <div className="small muted">Chưa chọn hồ sơ — đang dùng thiết lập mặc định. Bạn có thể xử lý luôn, hoặc mở <b>Quản lý hồ sơ</b> → <b>Tạo hồ sơ trống</b> / <b>Nhập tệp hồ sơ</b> để lưu cấu hình của sản phẩm mình dùng cho lần sau.</div>}
        </div>
      </div>
    </Card>
  );
}

const ACCEPT = ".xlsx,.xls,.xlsb,.xlsm,.csv";

/* ═════════ BƯỚC 1 — TẢI DỮ LIỆU ═════════ */
export function UploadStep() {
  const { state, uploadTo, run, download, goNext, stepState } = useApp();
  const sources = state?.sources || [];
  const [edits, setEdits] = useState({});
  useEffect(() => setEdits({}), [sources.length]);
  const files = [...new Set(sources.map((s) => s.file))];
  const done = stepState("upload").state === "done";

  const addFiles = async (list) => {
    const fl = await Promise.all(list.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })));
    await run(`Đang đọc ${fl.length} file`, "addFiles", { files: fl }, fl.map((f) => f.buffer), {
      success: "Đã đọc file", successDesc: (r) => `${r.sources.length} trang tính được nhận diện${r.errors.length ? ` · ${r.errors.length} tệp lỗi` : ""}`,
    });
  };
  const val = (s, k) => (edits[s.id] && edits[s.id][k] !== undefined ? edits[s.id][k] : s[k]);
  const setVal = (s, k, v) => setEdits((e) => ({ ...e, [s.id]: { ...(e[s.id] || {}), [k]: v } }));
  const confirm = async () => {
    const updates = sources.map((s) => ({ id: s.id, year: val(s, "year"), include: val(s, "include") }));
    const r = await run("Đang gộp dữ liệu theo năm", "confirmSources", { updates }, [], { success: "Đã xác nhận nguồn dữ liệu" });
    if (r) goNext("upload");
  };
  const chosen = sources.filter((s) => val(s, "include"));
  const totalRows = chosen.reduce((a, s) => a + s.nRows, 0);
  const years = [...new Set(chosen.flatMap((s) => (val(s, "year") === BY_DATE ? (s.split?.years || []).map((x) => x.year) : [val(s, "year")])).filter(Boolean))].sort();

  return (
    <>
      <StepHero id="upload" />
      <ProfileBar />
      {!sources.length ? (
        <div className="welcome">
          <Card title="Bắt đầu một phiên xử lý" sub="Kéo thả một hoặc nhiều tệp — mỗi năm một trang tính, hoặc mỗi năm một file.">
            <DropZone onFiles={addFiles} accept={ACCEPT} multiple color="var(--phase-A)" icon={FileSpreadsheet}
              title="Kéo thả tệp dữ liệu vào đây hoặc bấm để chọn" sub="Hỗ trợ .xlsx · .xls · .xlsb · .csv — có thể chọn nhiều tệp cùng lúc" />
            <div className="row mt16">
              <Btn kind="ghost" size="sm" icon={Download} onClick={() => download("Tạo tệp mẫu", "exportTemplate", { kind: "input" })}>Tải tệp mẫu dữ liệu đầu vào</Btn>
              <span className="muted small">Dữ liệu chỉ xử lý trong trình duyệt của bạn — không gửi lên máy chủ.</span>
            </div>
          </Card>
          <Card title="Quy trình 14 bước — 5 giai đoạn" sub="Mỗi bước chỉ mở khi bước trước đã xong; chạy lại một bước sẽ tự làm mới các bước sau.">
            <div className="flow">
              {PHASES.map((p, i) => (
                <div key={p.id} className="flow-item">
                  <span className="flow-badge" style={{ background: `linear-gradient(150deg, var(--phase-${p.id}), var(--phase-${p.id}-d))` }}>{p.id}</span>
                  <div><b>{p.label}</b><span>{["Bước 1–3: Tải dữ liệu · Ánh xạ cột · Kiểm tra chất lượng", "Bước 4–6: Bổ sung số liệu · Đối chiếu giá trị · Quy đổi về tấn", "Bước 7–9: Chuẩn hóa doanh nghiệp · Xếp hạng Top 80% · Gán ngành", "Bước 10–13: Bộ từ khóa · Phân loại · Lọc giá trị ngoại lai IQR · Chỉ số phân khúc", "Bước 14: Báo cáo kiểm toán & dữ liệu chi tiết từng năm"][i]}</span></div>
                </div>
              ))}
            </div>
            <Callout kind="info" title="Mẹo:">Mọi điều chỉnh (phân khúc, từ khóa, hệ số đơn vị, khoảng giá, quy tắc lọc, từ điển doanh nghiệp…) có thể lưu vào <b>Hồ sơ sản phẩm</b> để lần sau — hoặc đồng nghiệp — dùng lại ngay, không phải thiết lập lại.</Callout>
          </Card>
        </div>
      ) : (
        <>
          <Card title={`Nguồn dữ liệu đã đọc (${files.length} tệp · ${sources.length} trang tính)`} sub="Kiểm tra năm của từng trang tính. Bỏ chọn trang tính không phải dữ liệu giao dịch."
            tools={<DropZone compact onFiles={addFiles} accept={ACCEPT} multiple color="var(--phase-A)" icon={Plus} title="Thêm file" />}>
            <Table
              maxHeight={420}
              columns={[
                { key: "inc", label: "Dùng", render: (s) => <Toggle checked={val(s, "include")} onChange={(v) => setVal(s, "include", v)} color="var(--phase-A)" /> },
                { key: "file", label: "File › Sheet", render: (s) => <div><b>{s.sheet}</b><div className="muted small">{s.file}</div></div> },
                { key: "year", label: "Năm", render: (s) => <YearCell s={s} value={val(s, "year")} onChange={(v) => setVal(s, "year", v)} /> },
                { key: "rows", label: "Số dòng", num: true, render: (s) => n(s.nRows) },
                { key: "cols", label: "Số cột", num: true, render: (s) => n(s.nCols) },
                { key: "hdr", label: "Dòng tiêu đề", num: true, render: (s) => s.headerRowNo || "—" },
                { key: "note", label: "Ghi chú", render: (s) => <span className="small muted">{s.note}</span> },
              ]}
              rows={sources}
            />
            <div className="row mt12">
              {files.map((f) => <span key={f} className="chip"><FileSpreadsheet size={13} />{f}<button title="Gỡ file" onClick={() => run("Gỡ file", "removeFile", { name: f })}><Trash2 size={13} /></button></span>)}
            </div>
          </Card>
          <div className="action-bar">
            <Btn kind="primary" size="lg" color="var(--phase-A)" icon={CheckCircle2} disabled={!chosen.length} onClick={confirm}>{done ? "Xác nhận lại" : "Xác nhận nguồn dữ liệu"}</Btn>
            <div className="note">Sẽ xử lý <b>{n(totalRows)}</b> dòng · {years.length} năm: {years.join(", ") || "—"}</div>
          </div>
          {done && (
            <>
              {state.results?.upload?.dropped?.length > 0 && <Callout kind="warn" title="Dòng không đọc được ngày (không đưa vào xử lý):">{state.results.upload.dropped.map((d) => `${d.file} › ${d.sheet}: ${n(d.rows)} dòng (cột “${d.column}”)`).join(" · ")}. Kiểm tra lại cột ngày trong tệp nếu số dòng này đáng kể.</Callout>}
              <div className="kpis">
                {state.years.map((y) => <Kpi key={y.year} label={`Năm ${y.label}`} value={n(y.rows)} sub={y.coverage ? `${y.coverage.from} → ${y.coverage.to}` : "dòng dữ liệu"} color={y.coverage?.partial ? "var(--warn)" : "var(--phase-A)"} />)}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 2 — ÁNH XẠ CỘT ═════════ */
export function SchemaStep() {
  const { state, query, run, goNext, stepState } = useApp();
  const [info, setInfo] = useState(null);
  const [manual, setManual] = useState({});
  const uploaded = stepState("upload").state === "done";
  useEffect(() => { if (uploaded) query("getSchemaInfo").then(setInfo); }, [uploaded, state?.years?.length, query]);
  if (!uploaded) return <><StepHero id="schema" /><Empty title="Chưa có dữ liệu">Hoàn thành bước 1 trước.</Empty></>;
  if (!info) return <StepHero id="schema" />;
  const years = Object.keys(info.yearHeaders);

  const update = async (global, man) => {
    const r = await run("Cập nhật ánh xạ", "setSchema", { global, perYearManual: man });
    if (r) setInfo(r);
  };
  const setGlobal = (field, header) => { const g = { ...info.global, [field]: header }; const m = { ...manual }; years.forEach((y) => { if (m[y]) delete m[y][field]; }); setManual(m); update(g, m); };
  const setYear = (yr, field, header) => { const m = { ...manual, [yr]: { ...(manual[yr] || {}), [field]: header } }; setManual(m); update(info.global, m); };
  const confirm = async () => { const r = await run("Khóa ánh xạ cột", "confirmSchema", {}, [], { success: "Đã khóa ánh xạ cột" }); if (r) goNext("schema"); };
  const firstYear = years[0];

  return (
    <>
      <StepHero id="schema" />
      {!info.validation.ok && <Callout kind="bad" title="Chưa thể xác nhận:"><ul>{info.validation.errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul></Callout>}
      <Card title="Ánh xạ trường dữ liệu" sub="Gợi ý tự động đã được điền. Chọn lại nếu chưa đúng — áp dụng cho mọi năm có cột cùng tên.">
        <div className="map-grid">
          {info.fields.map((f) => {
            const missingYears = years.filter((y) => !info.perYear[y]?.[f.key]);
            const req = !f.optional;
            return (
              <div key={f.key} className={"map-item" + (req && missingYears.length ? " req-missing" : "")}>
                <div className="map-head">
                  <span className="map-name">{f.label}</span>
                  {req ? <Pill tone="info">Bắt buộc</Pill> : <Pill tone="mute">Tùy chọn</Pill>}
                  <span className="spacer" />
                  {missingYears.length === 0 ? <Pill tone="ok">✓ Đủ {years.length} năm</Pill> : missingYears.length < years.length ? <Pill tone="warn">Thiếu {missingYears.join(", ")}</Pill> : req ? <Pill tone="bad">Chưa chọn</Pill> : null}
                </div>
                <select className={"select " + (info.global[f.key] ? "ok" : req ? "missing" : "")} value={info.global[f.key] || ""} onChange={(e) => setGlobal(f.key, e.target.value)}>
                  <option value="">— Không dùng / chưa chọn —</option>
                  {info.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </Card>
      {years.length > 1 && (
        <Card title="Kiểm tra theo từng năm" sub="Công cụ tự tìm cột tương ứng ở năm có tên cột khác. Chỉnh trực tiếp nếu cần.">
          <div className="tbl-wrap" style={{ maxHeight: 420 }}>
            <table className="tbl">
              <thead><tr><th>Trường</th>{years.map((y) => <th key={y}>{y}</th>)}</tr></thead>
              <tbody>
                {info.fields.map((f) => (
                  <tr key={f.key}>
                    <td className="nowrap"><b>{f.label}</b></td>
                    {years.map((y) => (
                      <td key={y}>
                        <select className={"select " + (info.perYear[y]?.[f.key] ? "" : f.optional ? "" : "missing")} style={{ minWidth: 150, padding: "6px 8px", fontSize: 12.5 }}
                          value={info.perYear[y]?.[f.key] || ""} onChange={(e) => setYear(y, f.key, e.target.value)}>
                          <option value="">—</option>
                          {info.yearHeaders[y].map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title={`Xem trước dữ liệu đã ánh xạ — năm ${firstYear}`} sub="6 dòng đầu tiên. Kiểm tra nhanh xem mỗi cột có đúng nội dung không.">
        <Table maxHeight={300} columns={info.fields.filter((f) => info.perYear[firstYear]?.[f.key]).map((f) => ({ key: f.key, label: f.label, className: "clip", render: (r) => String(r[f.key] ?? "") }))} rows={info.preview[firstYear] || []} />
      </Card>
      <div className="action-bar">
        <Btn kind="primary" size="lg" color="var(--phase-A)" icon={CheckCircle2} disabled={!info.validation.ok} onClick={confirm}>Xác nhận ánh xạ</Btn>
        <div className="note">{info.validation.ok ? "Ánh xạ hợp lệ cho tất cả các năm." : "Còn trường bắt buộc chưa có cột."}</div>
      </div>
    </>
  );
}

/* ═════════ BƯỚC 3 — CHẤT LƯỢNG ═════════ */
const NUM_LABEL = { unitPrice: "Đơn giá", totalValue: "Trị giá", quantity: "Lượng" };
const DATE_ORDER_LABEL = { dmy: "dd/mm (ngày trước)", mdy: "mm/dd (tháng trước)" };
const vnDay = (iso) => iso.split("-").reverse().join("/");
/** Bảng ngày giao dịch & kỳ dữ liệu từng năm (bước 3). */
function DateCoverageCard({ R, years }) {
  const { yLabel } = useApp();
  const rows = years.filter((yr) => R.years[yr]?.date).map((yr) => ({ __key: yr, yr, ...R.years[yr].date, cov: R.years[yr].coverage }));
  if (!rows.length) return null;
  return (
    <Card title="Ngày giao dịch & kỳ dữ liệu" sub="Kỳ dữ liệu lấy từ cột Ngày. Năm chưa đủ 12 tháng được gắn nhãn (ví dụ: “2026 (T1–T10)”) ở mọi bước và trong báo cáo.">
      <Table columns={[
        { key: "yr", label: "Năm", render: (r) => <b style={{ whiteSpace: "nowrap" }}>{yLabel(r.yr)}</b> },
        { key: "parsed", label: "Đọc được", num: true, render: (r) => n(r.parsed) },
        { key: "unparsed", label: "Không đọc được", num: true, render: (r) => (r.unparsed ? <Pill tone="warn">{n(r.unparsed)}</Pill> : 0) },
        { key: "yearMismatch", label: "Khác năm của trang tính", num: true, render: (r) => (r.yearMismatch ? <Pill tone="warn">{n(r.yearMismatch)}</Pill> : 0) },
        { key: "order", label: "Thứ tự ngày", render: (r) => <span style={{ whiteSpace: "nowrap" }}>{DATE_ORDER_LABEL[r.order] || r.order}</span> },
        { key: "range", label: "Từ → đến", render: (r) => (r.cov ? <span style={{ whiteSpace: "nowrap" }}>{vnDay(r.cov.from)} → {vnDay(r.cov.to)}</span> : "—") },
        { key: "months", label: "Số tháng", num: true, render: (r) => (r.cov ? r.cov.monthsWithData : "—") },
        { key: "status", label: "Trạng thái", render: (r) => (!r.cov ? <Pill tone="mute">Không có ngày</Pill> : r.cov.partial ? <Pill tone="warn">Chưa đủ 12 tháng</Pill> : r.cov.monthsWithData < 12 ? <Pill tone="warn">Thiếu tháng giữa năm</Pill> : <Pill tone="ok">Đủ 12 tháng</Pill>) },
      ]} rows={rows} />
    </Card>
  );
}

export function QualityStep() {
  const { state, yLabel } = useApp();
  const R = state?.results?.quality;
  const years = state?.years?.map((y) => y.year) || [];
  return (
    <>
      <StepHero id="quality" />
      <RunBar id="quality" label="Chạy kiểm tra chất lượng" note="Chỉ đọc và thống kê — không thay đổi dữ liệu." />
      {R && (
        <>
          <div className="kpis mb12">
            {years.map((yr) => { const q = R.years[yr]; return <Kpi key={yr} color={q.coreCompletePct > 0.8 ? "var(--ok)" : q.coreCompletePct > 0.5 ? "var(--warn)" : "var(--bad)"} label={`Năm ${yLabel(yr)}: dòng đủ dữ liệu cốt lõi`} value={pct(q.coreCompletePct, 0)} sub={`${n(q.coreComplete)} / ${n(q.rows)} dòng · ${n(q.duplicates)} dòng trùng`} />; })}
          </div>
          {years.some((yr) => R.years[yr].coreCompletePct < 0.6) && <Callout kind="warn" title="Nhiều dòng thiếu giá trị hoặc lượng.">Thường gặp ở nguồn vận đơn (BL) không ghi trị giá. Các dòng này vẫn được chuẩn hóa doanh nghiệp và phân loại, nhưng không tham gia xếp hạng theo trị giá và chỉ số giá.</Callout>}
          <DateCoverageCard R={R} years={years} />
          <Card title="Các cột số" sub="Hợp lệ = số > 0. Số lưu dạng chữ có định dạng (1,234.5) vẫn đọc được.">
            <Table columns={[
              { key: "y", label: "Năm" }, { key: "f", label: "Trường" },
              { key: "valid", label: "Hợp lệ", num: true, render: (r) => <>{n(r.valid)} <span className="muted small">({pct(r.valid / r.total, 0)})</span></> },
              { key: "zero", label: "Bằng 0", num: true, render: (r) => n(r.zero) }, { key: "negative", label: "Âm", num: true, render: (r) => n(r.negative) },
              { key: "text", label: "Chữ", num: true, render: (r) => n(r.text) }, { key: "invalid", label: "Không hợp lệ", num: true, render: (r) => n(r.invalid) },
              { key: "blank", label: "Trống", num: true, render: (r) => n(r.blank) }, { key: "fromText", label: "Đọc từ chuỗi", num: true, render: (r) => n(r.fromText) },
            ]} rows={years.flatMap((yr) => Object.entries(R.years[yr].num).map(([f, v]) => ({ __key: yr + f, y: yr, f: NUM_LABEL[f], total: R.years[yr].rows, ...v })))} />
          </Card>
          <div className="grid-2">
            <Card title="Đơn vị tính xuất hiện" sub="Kiểm tra trước khi quy đổi ở bước 6.">
              <Table maxHeight={360} columns={[
                { key: "unit", label: "Đơn vị" }, { key: "examples", label: "Ví dụ gốc", className: "clip" },
                { key: "count", label: "Số dòng", num: true, render: (r) => n(r.count) },
                { key: "kind", label: "Trạng thái", render: (r) => <Pill tone={r.kind === UNIT_KIND.MASS ? "ok" : r.kind === UNIT_KIND.AMBIGUOUS ? "warn" : r.kind === UNIT_KIND.UNKNOWN ? "bad" : "mute"}>{r.kind}</Pill> },
              ]} rows={R.units.slice(0, 80)} />
            </Card>
            <Card title="Quốc gia chưa nhận diện" sub="Sẽ hiển thị nguyên văn; không ảnh hưởng gộp doanh nghiệp nhưng không xếp được châu lục.">
              {R.countriesUnmapped.length ? (
                <Table maxHeight={360} columns={[{ key: "value", label: "Giá trị gốc" }, { key: "field", label: "Cột" }, { key: "count", label: "Số dòng", num: true, render: (r) => n(r.count) }]} rows={R.countriesUnmapped} />
              ) : <Empty icon={CheckCircle2} title="Tất cả quốc gia đều nhận diện được" />}
            </Card>
          </div>
          <Card title="Các cột chữ">
            <Table columns={[
              { key: "y", label: "Năm" }, { key: "f", label: "Trường" },
              { key: "filled", label: "Có dữ liệu", num: true, render: (r) => n(r.filled) }, { key: "blank", label: "Trống", num: true, render: (r) => n(r.blank) },
              { key: "placeholder", label: "Placeholder / không xác định", num: true, render: (r) => n(r.placeholder) },
            ]} rows={years.flatMap((yr) => Object.entries(R.years[yr].text).map(([f, v]) => ({ __key: yr + f, y: yr, f: R.fieldLabels[f], ...v })))} maxHeight={320} />
          </Card>
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 4 — BỔ SUNG ═════════ */
export function BackfillStep() {
  const { state } = useApp();
  const R = state?.results?.backfill;
  const years = state?.years?.map((y) => y.year) || [];
  const tot = R ? years.reduce((a, yr) => { const v = R.years[yr]; a.up += v.unitPrice; a.tv += v.totalValue; a.q += v.quantity; a.no += v.notPossible; a.rows += v.rows; return a; }, { up: 0, tv: 0, q: 0, no: 0, rows: 0 }) : null;
  return (
    <>
      <StepHero id="backfill" />
      <RunBar id="backfill" label="Chạy bổ sung số liệu" note="Không cần thiết lập. Dữ liệu gốc giữ nguyên." />
      {R && (
        <>
          <div className="kpis mb12">
            <Kpi label="Bổ sung Đơn giá" value={n(tot.up)} color="var(--phase-B)" sub="= Trị giá / Lượng" />
            <Kpi label="Bổ sung Trị giá" value={n(tot.tv)} color="var(--phase-B)" sub="= Đơn giá × Lượng" />
            <Kpi label="Bổ sung Lượng" value={n(tot.q)} color="var(--phase-B)" sub="= Trị giá / Đơn giá" />
            <Kpi label="Thiếu ≥ 2 trường" value={n(tot.no)} color="var(--text-3)" sub={`${pct(tot.no / tot.rows, 0)} số dòng — không bổ sung được`} />
          </div>
          <Card title="Theo năm">
            <Table columns={[
              { key: "y", label: "Năm" }, { key: "complete", label: "Đủ 3 trường", num: true, render: (r) => n(r.complete) },
              { key: "unitPrice", label: "+ Đơn giá", num: true, render: (r) => n(r.unitPrice) }, { key: "totalValue", label: "+ Trị giá", num: true, render: (r) => n(r.totalValue) },
              { key: "quantity", label: "+ Lượng", num: true, render: (r) => n(r.quantity) }, { key: "notPossible", label: "Thiếu ≥ 2 trường", num: true, render: (r) => n(r.notPossible) },
            ]} rows={years.map((yr) => ({ y: yr, ...R.years[yr] }))} />
          </Card>
          {R.samples.length > 0 && (
            <Card title="Ví dụ dòng được bổ sung" sub="Giá trị gốc → giá trị mới (ghi vào cột *sạch*).">
              <Table maxHeight={320} columns={[
                { key: "year", label: "Năm" }, { key: "row", label: "Dòng Excel", num: true }, { key: "field", label: "Trường bổ sung", render: (r) => <Pill tone="violet">{r.field}</Pill> },
                { key: "unitPrice", label: "Đơn giá gốc", num: true, render: (r) => String(r.unitPrice ?? "") }, { key: "totalValue", label: "Trị giá gốc", num: true, render: (r) => String(r.totalValue ?? "") },
                { key: "quantity", label: "Lượng gốc", num: true, render: (r) => String(r.quantity ?? "") }, { key: "newValue", label: "Giá trị mới", num: true, render: (r) => <b>{n(r.newValue, 4)}</b> },
              ]} rows={R.samples} />
            </Card>
          )}
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 5 — ĐỐI CHIẾU GIÁ TRỊ ═════════ */
export function ValidateStep() {
  const { state, run } = useApp();
  const R = state?.results?.validate;
  const tol = state?.settings?.valueTolerance ?? 0.3;
  const years = state?.years?.map((y) => y.year) || [];
  const set = (v) => run("Cập nhật ngưỡng", "updateSettings", { partial: { valueTolerance: v } });
  return (
    <>
      <StepHero id="validate" />
      <Card title="Thiết lập">
        <Field label="Ngưỡng lệch cho phép" hint="Dòng có |Đơn giá × Lượng − Trị giá| / Trị giá lớn hơn ngưỡng sẽ bị đánh dấu. bản cũ dùng 30%.">
          <Seg value={tol} onChange={set} options={[0.05, 0.1, 0.2, 0.3, 0.5].map((v) => ({ value: v, label: Math.round(v * 100) + "%" }))} />
        </Field>
      </Card>
      <RunBar id="validate" label="Chạy đối chiếu" note={`Ngưỡng hiện tại: ${Math.round(tol * 100)}%`} />
      {R && (
        <>
          <Card title="Kết quả theo năm" sub="Phân bố độ lệch giúp đánh giá ngưỡng có phù hợp không.">
            <Table columns={[
              { key: "y", label: "Năm" },
              { key: "ok", label: "Hợp lệ", num: true, render: (r) => <span style={{ color: "var(--ok-d)", fontWeight: 700 }}>{n(r.ok)}</span> },
              { key: "bad", label: "Lệch vượt ngưỡng", num: true, render: (r) => <span style={{ color: "var(--bad-d)", fontWeight: 700 }}>{n(r.bad)}</span> },
              { key: "missing", label: "Thiếu dữ liệu", num: true, render: (r) => n(r.missing) }, { key: "backfilled", label: "Đã bổ sung", num: true, render: (r) => n(r.backfilled) },
              { key: "b1", label: "Lệch ≤1%", num: true, render: (r) => n(r.b1) }, { key: "b10", label: "1–10%", num: true, render: (r) => n(r.b10) },
              { key: "b30", label: "10–30%", num: true, render: (r) => n(r.b30) }, { key: "b100", label: "30–100%", num: true, render: (r) => n(r.b100) }, { key: "bInf", label: ">100%", num: true, render: (r) => n(r.bInf) },
            ]} rows={years.map((yr) => ({ y: yr, ...R.years[yr] }))} />
          </Card>
          <Card title="Các dòng lệch lớn nhất" sub="Thường do đơn giá tính theo kg trong khi lượng tính theo tấn (hoặc ngược lại).">
            <Table maxHeight={380} columns={[
              { key: "year", label: "Năm" }, { key: "row", label: "Dòng", num: true },
              { key: "unitPrice", label: "Đơn giá", num: true, render: (r) => n(r.unitPrice, 4) }, { key: "quantity", label: "Lượng", num: true, render: (r) => n(r.quantity, 2) },
              { key: "unit", label: "ĐV" }, { key: "totalValue", label: "Trị giá", num: true, render: (r) => n(r.totalValue, 2) },
              { key: "calc", label: "ĐG × Lượng", num: true, render: (r) => n(r.calc, 2) }, { key: "diff", label: "Lệch", num: true, render: (r) => <Pill tone="bad">{pct(r.diff, 0)}</Pill> },
              { key: "desc", label: "Mô tả", className: "clip", render: (r) => String(r.desc ?? "") },
            ]} rows={R.samples} />
          </Card>
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 6 — QUY ĐỔI ĐƠN VỊ ═════════ */
/** Khoảng giá hợp lý theo đặc thù sản phẩm (lưu trong hồ sơ). */
function PriceBand({ S, run }) {
  const [lo, setLo] = useState(S.priceBandMin || "");
  const [hi, setHi] = useState(S.priceBandMax || "");
  useEffect(() => { setLo(S.priceBandMin || ""); setHi(S.priceBandMax || ""); }, [S.priceBandMin, S.priceBandMax]);
  const nLo = Number(String(lo).replace(/[^\d.]/g, "")) || 0, nHi = Number(String(hi).replace(/[^\d.]/g, "")) || 0;
  const bad = nLo > 0 && nHi > 0 && nLo >= nHi;
  const dirty = nLo !== (S.priceBandMin || 0) || nHi !== (S.priceBandMax || 0);
  return (
    <div className="mt12" style={{ borderTop: "1px dashed var(--border)", paddingTop: 12 }}>
      <div className="label" style={{ marginBottom: 6 }}>Khoảng giá hợp lý của sản phẩm (USD/tấn) — tùy chọn</div>
      <div className="row">
        <input className="input" style={{ width: 150 }} inputMode="decimal" placeholder="Tối thiểu" value={lo} onChange={(e) => setLo(e.target.value)} />
        <span className="muted">–</span>
        <input className="input" style={{ width: 150 }} inputMode="decimal" placeholder="Tối đa" value={hi} onChange={(e) => setHi(e.target.value)} />
        <Btn size="sm" kind="soft" disabled={!dirty || bad} onClick={() => run("Cập nhật khoảng giá", "updateSettings", { partial: { priceBandMin: nLo, priceBandMax: nHi } })}>Áp dụng</Btn>
        {(S.priceBandMin > 0 || S.priceBandMax > 0) && <Btn size="sm" kind="ghost" onClick={() => run("Cập nhật khoảng giá", "updateSettings", { partial: { priceBandMin: 0, priceBandMax: 0 } })}>Về tự động</Btn>}
      </div>
      <div className="hint mt8">{bad ? <span style={{ color: "var(--bad)" }}>Giá tối thiểu phải nhỏ hơn giá tối đa.</span> : "Dùng khi biết rõ mặt bằng giá của sản phẩm (ví dụ: phân bón 80–2.000, hóa chất tinh khiết có thể tới hàng chục nghìn USD/t). Để trống = tự động. Giá trị này được lưu trong hồ sơ sản phẩm."}</div>
    </div>
  );
}

const FACTOR_OPTIONS = [
  { v: "__dict", l: "Theo từ điển" }, { v: "1", l: "Tấn (×1)" }, { v: "0.001", l: "Kilogram (×0,001)" }, { v: "0.000001", l: "Gram (×0,000001)" },
  { v: "0.00045359237", l: "Pound (×0,000454)" }, { v: "0.90718474", l: "Short ton (×0,907)" }, { v: "1.0160469088", l: "Long ton (×1,016)" },
  { v: "0.1", l: "Tạ 100 kg (×0,1)" }, { v: "0.05", l: "Bao 50 kg (×0,05)" }, { v: "0.025", l: "Bao 25 kg (×0,025)" }, { v: "__none", l: "Không quy đổi" }, { v: "__custom", l: "Tùy chỉnh…" },
];
export function UnitsStep() {
  const { state, run } = useApp();
  const R = state?.results?.units;
  const S = state?.settings || {};
  const years = state?.years?.map((y) => y.year) || [];
  const [draft, setDraft] = useState(null);
  const [custom, setCustom] = useState({});
  useEffect(() => setDraft({ ...(S.unitFactors || {}) }), [S.unitFactors]);
  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(S.unitFactors || {});
  const sel = (t) => {
    if (!draft || !Object.prototype.hasOwnProperty.call(draft, t.unitKey)) return "__dict";
    const v = draft[t.unitKey];
    if (v === null) return "__none";
    const o = FACTOR_OPTIONS.find((x) => x.v === String(v));
    return o ? o.v : "__custom";
  };
  const change = (t, v) => {
    const d = { ...draft };
    if (v === "__dict") delete d[t.unitKey];
    else if (v === "__none") d[t.unitKey] = null;
    else if (v === "__custom") { d[t.unitKey] = Number(custom[t.unitKey]) || 1; }
    else d[t.unitKey] = Number(v);
    setDraft(d);
  };
  const save = async () => {
    const r = await run("Lưu hệ số", "updateSettings", { partial: { unitFactors: draft } });
    if (r) await run("Bước 6: Quy đổi đơn vị", "runStep", { id: "units" }, [], { success: "Đã quy đổi lại với hệ số mới" });
  };
  const applySuggestions = () => { const d = { ...draft }; R.units.forEach((t) => { if (t.suggestion && !Object.prototype.hasOwnProperty.call(d, t.unitKey)) d[t.unitKey] = t.suggestion.factor; }); setDraft(d); };
  const tot = R ? years.reduce((a, yr) => { const v = R.years[yr]; Object.keys(v).forEach((k) => (a[k] = (a[k] || 0) + v[k])); return a; }, {}) : null;
  const nSug = R ? R.units.filter((t) => t.suggestion && !Object.prototype.hasOwnProperty.call(draft || {}, t.unitKey)).length : 0;

  return (
    <>
      <StepHero id="units" />
      <Card title="Thiết lập">
        <Toggle checked={S.inferPackageWeight} onChange={(v) => run("Cập nhật", "updateSettings", { partial: { inferPackageWeight: v } })} color="var(--phase-B)"
          label="Suy luận khối lượng bao bì từ mô tả (ví dụ: BAG + “25 KG BAG” ⇒ 0,025 tấn/bao)" />
        <div className="hint mt8">Chỉ áp dụng cho dòng có trị giá và khi giá ngụ ý hợp lý. Dòng suy luận được ghi rõ trong cột Trạng thái quy đổi.</div>
        <div className="mt12"><Toggle checked={S.priceSanityCheck} onChange={(v) => run("Cập nhật", "updateSettings", { partial: { priceSanityCheck: v } })} color="var(--phase-B)"
          label="Đánh dấu giá/tấn phi lý (nghi sai đơn vị) và loại khỏi IQR & chỉ số" /></div>
        <div className="hint mt8">Mặc định tự tính: dưới 1/50 hoặc trên 2.000 lần giá tham chiếu. Ví dụ: lượng 500.000 ghi “TNE” nhưng thực chất là kg ⇒ giá chỉ ~0,1 USD/tấn.</div>
        <PriceBand S={S} run={run} />
      </Card>
      <RunBar id="units" label="Chạy quy đổi đơn vị" note="Chạy một lần để xem bảng đơn vị, chỉnh hệ số nếu cần rồi chạy lại." />
      {R && (
        <>
          <div className="kpis mb12">
            <Kpi label="Dòng quy đổi theo từ điển/người dùng" value={n(tot.converted)} color="var(--ok)" />
            <Kpi label="Dòng suy luận từ mô tả" value={n(tot.inferred)} color="var(--phase-B)" />
            <Kpi label="Dòng có đơn giá USD/tấn" value={n(tot.priced)} color="var(--phase-B)" sub="dùng cho phân tích giá" />
            <Kpi label="Đơn vị mơ hồ / chưa có hệ số" value={n((tot.ambiguous || 0) + (tot.unknown || 0))} color="var(--warn)" sub="cần bạn quyết định" />
            <Kpi label="Không phải khối lượng" value={n(tot.nonMass)} color="var(--text-3)" sub="bao, chai, kiện… không suy luận được" />
            <Kpi label="Giá/tấn phi lý – nghi sai đơn vị" value={n(tot.insane)} color="var(--bad)" sub={R.sanity ? `ngoài ${price(R.sanity.low)} – ${Number.isFinite(R.sanity.high) ? price(R.sanity.high) : "∞"} USD/t · ${R.sanity.mode || "tự động"}` : "đang tắt kiểm tra"} />
            <Kpi label="Giá tham chiếu" value={price(R.refPrice)} sub="USD/tấn — trung vị có trọng số trị giá" color="var(--text-3)" />
          </div>
          <Card title="Bảng hệ số quy đổi" sub="Sắp xếp theo trị giá. Chọn hệ số cho đơn vị chưa có, rồi chọn Lưu & chạy lại."
            tools={<>{nSug > 0 && <Btn kind="soft" size="sm" icon={Wand2} onClick={applySuggestions}>Áp dụng {nSug} gợi ý</Btn>}<Btn kind="primary" size="sm" color="var(--phase-B)" icon={Save} disabled={!dirty} onClick={save}>Lưu & chạy lại</Btn></>}>
            {dirty && <Callout kind="warn">Có thay đổi chưa áp dụng — bấm <b>Lưu & chạy lại</b>.</Callout>}
            <Table maxHeight={520} columns={[
              { key: "unit", label: "Đơn vị", render: (t) => <div><b>{t.unit}</b><div className="muted small clip" style={{ maxWidth: 180 }}>{t.examples}</div></div> },
              { key: "kind", label: "Loại", render: (t) => <Pill tone={t.kind === UNIT_KIND.MASS ? "ok" : t.kind === UNIT_KIND.AMBIGUOUS ? "warn" : t.kind === UNIT_KIND.UNKNOWN ? "bad" : "mute"}>{t.kind}</Pill> },
              { key: "rows", label: "Số dòng", num: true, render: (t) => n(t.rows) },
              { key: "rowsPriced", label: "Có trị giá", num: true, render: (t) => n(t.rowsPriced) },
              { key: "value", label: "Trị giá", num: true, render: (t) => usd(t.value) },
              { key: "applied", label: "Hệ số áp dụng (tấn / 1 đơn vị)", render: (t) => (
                <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <select className="select" style={{ width: 175, padding: "6px 8px", fontSize: 12.5 }} value={sel(t)} onChange={(e) => change(t, e.target.value)}>
                    {FACTOR_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.v === "__dict" ? (t.dictFactor ? `Từ điển (×${String(t.dictFactor).replace(".", ",")})` : "Từ điển: không có") : o.l}</option>)}
                  </select>
                  {sel(t) === "__custom" && <input className="input" style={{ width: 90, padding: "6px 8px" }} value={custom[t.unitKey] ?? draft?.[t.unitKey] ?? ""} onChange={(e) => { setCustom({ ...custom, [t.unitKey]: e.target.value }); setDraft({ ...draft, [t.unitKey]: Number(e.target.value) || null }); }} />}
                </div>
              ) },
              { key: "sug", label: "Gợi ý theo giá", render: (t) => t.suggestion ? <span className="small"><b>×{t.suggestion.factor}</b> <span className="muted">≈ {price(t.suggestion.impliedPrice)} USD/t</span></span> : <span className="muted small">—</span> },
              { key: "inferred", label: "Suy luận", num: true, render: (t) => (t.inferred ? n(t.inferred) : "—") },
            ]} rows={R.units} />
          </Card>
        </>
      )}
    </>
  );
}
