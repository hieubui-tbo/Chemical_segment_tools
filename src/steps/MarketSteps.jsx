import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, X, Plus, BookOpen, Trash2, Factory, Building2, FileDown, SkipForward } from "lucide-react";
import { useApp } from "../ui/store.jsx";
import { Card, Kpi, Btn, Pill, Callout, Field, Toggle, Seg, DropZone, Table, StepHero, RunBar, Empty, Bar, Tabs, Pager, ConfPill, ReviewPill, RadioCards } from "../ui/components.jsx";
import { ParetoChart, HBarList } from "../ui/charts.jsx";
import { n, pct, usd } from "../ui/format.js";

const XLS = ".xlsx,.xls,.xlsb,.csv";

/* ═════════ BƯỚC 7 — CHUẨN HÓA DOANH NGHIỆP ═════════ */
export function EntityStep() {
  const { state, run, uploadTo, download, query, stepState } = useApp();
  const S = state?.settings || {};
  const R = state?.results?.entity;
  const ov = state?.refs?.overrides;
  const [phIn, setPhIn] = useState("");
  const [type, setType] = useState("Purchaser");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const done = stepState("entity").state === "done";
  const upd = (partial) => run("Cập nhật thiết lập", "updateSettings", { partial });

  const load = useCallback(() => { if (done) query("queryEntities", { type, filter, search, page, size: 40 }).then(setData); else setData(null); }, [done, type, filter, search, page, query, R]);
  useEffect(() => { const t = setTimeout(load, search ? 250 : 0); return () => clearTimeout(t); }, [load, search]);
  useEffect(() => setPage(0), [type, filter, search]);

  const addPh = () => { const v = phIn.trim(); if (!v) return; upd({ customPlaceholders: [...(S.customPlaceholders || []), v] }); setPhIn(""); };
  const T = R?.[type];
  const xs = R?.crossSource;

  return (
    <>
      <StepHero id="entity" />
      <div className="grid-2">
        <Card title="Thiết lập so khớp">
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Nhóm doanh nghiệp bán (nhà cung cấp)" hint="“Nước xuất xứ” là xuất xứ hàng hóa, không phải trụ sở người bán ⇒ khuyến nghị nhóm chỉ theo tên.">
              <Seg value={!!S.supplierGroupByCountry} onChange={(v) => upd({ supplierGroupByCountry: v })} options={[{ value: false, label: "Chỉ theo tên (khuyến nghị)" }, { value: true, label: "Tên + nước xuất xứ (như bản cũ)" }]} />
            </Field>
            <Field label="Gộp lỗi chính tả (gần đúng ký tự)" hint="Chặt = ít gộp nhầm hơn; Rộng = bắt được nhiều lỗi chính tả hơn. Mọi nhóm gộp gần đúng đều được đánh dấu Cần rà soát.">
              <div className="row">
                <Toggle checked={S.fuzzyEnabled} onChange={(v) => upd({ fuzzyEnabled: v })} color="var(--phase-C)" label={S.fuzzyEnabled ? "Bật" : "Tắt"} />
                {S.fuzzyEnabled && <Seg value={S.fuzzyThreshold} onChange={(v) => upd({ fuzzyThreshold: v })} options={[{ value: 0.95, label: "Chặt" }, { value: 0.9, label: "Vừa (mặc định)" }, { value: 0.85, label: "Rộng" }]} />}
              </div>
            </Field>
            <Field label="Kiểu chữ tên chuẩn hóa">
              <Seg value={S.nameCase} onChange={(v) => upd({ nameCase: v })} options={[{ value: "title", label: "Viết Hoa Chữ Đầu" }, { value: "upper", label: "IN HOA" }]} />
            </Field>
            <Toggle checked={S.detectCrossSource} onChange={(v) => upd({ detectCrossSource: v })} color="var(--phase-C)" label="Phát hiện giao dịch trùng giữa các nguồn dữ liệu" />
          </div>
        </Card>
        <div>
          <Card title="Tên coi là “không xác định” (bổ sung)" sub="Ngoài danh sách mặc định (TO ORDER, NONE, N/A, THEO LỆNH…). Thêm * ở cuối để khớp tiền tố.">
            <div className="row">
              <input className="input" style={{ flex: 1 }} value={phIn} placeholder="ví dụ: TÊN HÃNG TÀU* hoặc CONSOLIDATOR" onChange={(e) => setPhIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPh()} />
              <Btn kind="soft" icon={Plus} onClick={addPh}>Thêm</Btn>
            </div>
            <div className="row mt8">{(S.customPlaceholders || []).map((p) => <span className="chip" key={p}>{p}<button onClick={() => upd({ customPlaceholders: S.customPlaceholders.filter((x) => x !== p) })}><X size={13} /></button></span>)}</div>
          </Card>
          <Card title="Từ điển doanh nghiệp của bạn (tùy chọn)" sub="Ép gộp/tách hoặc loại tên. Ưu tiên tuyệt đối so với thuật toán.">
            <DropZone compact multiple accept={XLS} color="var(--phase-C)" icon={BookOpen} title="Tải tệp từ điển doanh nghiệp" sub="Cột: Tên gốc · Tên chuẩn hóa (sửa) · (Quốc gia) · (Loại)"
              onFiles={(f) => uploadTo("loadOverrides", f, "Đọc từ điển doanh nghiệp")} />
            <div className="row mt8">
              {ov?.files?.map((f) => <span className="chip" key={f.name}>{f.name} · {n(f.rows)} dòng</span>)}
              {ov?.entries > 0 && <Btn kind="danger" size="sm" icon={Trash2} onClick={() => run("Xóa từ điển", "clearOverrides")}>Xóa ({n(ov.entries)})</Btn>}
              <Btn kind="ghost" size="sm" icon={Download} onClick={() => download("Tạo mẫu", "exportTemplate", { kind: "overrides" })}>Tệp mẫu</Btn>
            </div>
          </Card>
        </div>
      </div>
      <RunBar id="entity" label="Chạy chuẩn hóa doanh nghiệp" note="Chạy trên toàn bộ các năm cùng lúc ⇒ mã nhóm và tên thống nhất giữa các năm."
        extra={done && <Btn kind="ghost" icon={FileDown} onClick={() => download("Tạo tệp rà soát", "exportEntityReview")}>Tải tệp rà soát tên doanh nghiệp</Btn>} />
      {R && (
        <>
          <Tabs value={type} onChange={setType} color="var(--phase-C)" tabs={[{ value: "Purchaser", label: "Doanh nghiệp mua (nhà nhập khẩu)", count: n(R.Purchaser.entities) }, { value: "Supplier", label: "Doanh nghiệp bán (nhà cung cấp)", count: n(R.Supplier.entities) }]} />
          <div className="kpis mb12">
            <Kpi label="Nhóm doanh nghiệp sau chuẩn hóa" value={n(T.entities)} color="var(--phase-C)" sub={`từ ${n(T.rawVariants)} cách viết tên`} />
            <Kpi label="Giảm số tên nhờ gộp" value={pct(T.reductionPct, 0)} color="var(--phase-C)" sub={`${n(T.merged)} nhóm có ≥ 2 biến thể`} />
            <Kpi label="Cần rà soát" value={n(T.review)} color="var(--warn)" sub="gộp gần đúng hoặc có cảnh báo rủi ro" />
            <Kpi label="Dòng tên không xác định" value={n(T.placeholderRows)} color="var(--text-3)" sub={`${pct(T.placeholderValueShare, 1)} tổng trị giá`} />
            {T.confirmed > 0 && <Kpi label="Đã xác nhận bằng từ điển" value={n(T.confirmed)} color="var(--phase-B)" />}
          </div>
          <div className="grid-2">
            <Card title="Độ tin cậy của các nhóm">
              <HBarList items={["Chính xác", "Cao", "Trung bình", "Thấp"].map((k, i) => ({ label: k, value: T.byConf[k] || 0, color: ["#0E9F6E", "#2F5BEA", "#D97706", "#DC2626"][i] }))} />
            </Card>
            <Card title="Cờ rủi ro">
              {Object.keys(T.byFlag).length ? <HBarList color="#D6336C" items={Object.entries(T.byFlag).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k.length > 22 ? k.slice(0, 21) + "…" : k, value: v }))} /> : <Empty title="Không có cảnh báo rủi ro" />}
            </Card>
          </div>
          <Card title="Từ điển doanh nghiệp" sub="Sắp xếp theo tổng trị giá mọi năm. Mở rộng biến thể để kiểm tra việc gộp."
            tools={<div className="row" style={{ gap: 8 }}><div style={{ position: "relative" }}><Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-3)" }} /><input className="input" style={{ paddingLeft: 32, width: 260 }} placeholder="Tìm tên, biến thể hoặc mã…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>}>
            <div className="row mb12">
              <Seg value={filter} onChange={setFilter} options={[{ value: "all", label: "Tất cả" }, { value: "review", label: "Cần rà soát" }, { value: "merged", label: "Gộp nhiều biến thể" }, { value: "low", label: "Độ tin cậy TB/Thấp" }, { value: "flag", label: "Có cảnh báo rủi ro" }, { value: "confirmed", label: "Từ điển" }]} />
            </div>
            {data && (
              <>
                <Table maxHeight={620} columns={[
                  { key: "id", label: "Mã", className: "nowrap", render: (e) => <b>{e.id}</b> },
                  { key: "name", label: "Tên chuẩn hóa / các biến thể", className: "wrap", render: (e) => <div><div style={{ fontWeight: 700 }}>{e.name}</div><div className="variants mt8">{e.variants.slice(0, 6).map((v) => <span className="variant" key={v.raw} title={`${v.raw} · ${v.count} dòng`}>{v.raw}</span>)}{e.nVariants > 6 && <span className="variant">+{e.nVariants - 6}</span>}</div></div> },
                  { key: "country", label: "Quốc gia", className: "nowrap" },
                  { key: "value", label: "Trị giá", num: true, render: (e) => usd(e.value) },
                  { key: "rows", label: "Dòng", num: true, render: (e) => n(e.rows) },
                  { key: "conf", label: "Độ tin cậy", render: (e) => <ConfPill v={e.confidence} /> },
                  { key: "rev", label: "Trạng thái", render: (e) => <ReviewPill v={e.review} /> },
                  { key: "flags", label: "Cách gộp · cảnh báo rủi ro", className: "wrap-s", render: (e) => <div className="small"><div className="muted">{e.methods.join(" · ")}</div>{e.flags.map((f) => <div key={f} style={{ color: "var(--warn-d)" }}>⚑ {f}</div>)}</div> },
                ]} rows={data.rows} />
                <Pager page={page} size={40} total={data.total} onPage={setPage} />
              </>
            )}
          </Card>
          <div className="grid-2">
            <Card title="Tên bị coi là không xác định (nhiều nhất)">
              <Table maxHeight={300} columns={[{ key: "raw", label: "Tên gốc", className: "clip" }, { key: "count", label: "Dòng", num: true, render: (r) => n(r.count) }, { key: "value", label: "Trị giá", num: true, render: (r) => usd(r.value) }, { key: "reason", label: "Lý do", className: "reason" }]} rows={T.placeholderTop} />
            </Card>
            <Card title="Giao dịch trùng giữa các nguồn">
              {!xs?.enabled ? <Empty title="Đang tắt tính năng" /> : !xs.mapped ? <Callout kind="info">Chưa ánh xạ cột <b>Nguồn dữ liệu</b> ở bước 2 nên không kiểm tra được.</Callout> : (
                <>
                  <div className="kpis mb12"><Kpi label="Dòng nghi trùng" value={n(xs.rows)} color="var(--phase-C)" /><Kpi label="Trị giá nghi trùng" value={usd(xs.value)} color="var(--phase-C)" sub={S.excludeCrossSourceDup ? "sẽ loại khỏi xếp hạng & chỉ số" : "vẫn được tính (đã tắt loại)"} /></div>
                  <Table maxHeight={220} columns={[{ key: "pair", label: "Nguồn bị đánh dấu ↔ nguồn được giữ", className: "clip" }, { key: "rows", label: "Dòng", num: true, render: (r) => n(r.rows) }, { key: "value", label: "Trị giá", num: true, render: (r) => usd(r.value) }]} rows={xs.bySource.slice(0, 20)} />
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 8 — XẾP HẠNG TOP ═════════ */
export function RankingStep() {
  const { state, run, query, download, stepState, yLabel } = useApp();
  const S = state?.settings || {};
  const R = state?.results?.ranking;
  const years = state?.years?.map((y) => y.year) || [];
  const PERIOD = "__period";
  const [year, setYear] = useState(years[years.length - 1]);
  const [scope, setScope] = useState("P_VN");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const done = stepState("ranking").state === "done";
  useEffect(() => { if (!years.includes(year) && year !== PERIOD) setYear(years[years.length - 1]); }, [years.join()]);
  useEffect(() => { if (done && year) query("queryRanking", { year, scope, page, size: 50 }).then(setData); else setData(null); }, [done, year, scope, page, query, R]);
  useEffect(() => setPage(0), [year, scope]);
  const upd = (partial) => run("Cập nhật thiết lập", "updateSettings", { partial });
  const thr = S.topThreshold ?? 0.8;
  const YR = year === PERIOD ? R?.period : R?.years?.[year];
  const scopes = YR?.scopeOrder || [];
  const sc = YR?.scopes?.[scope];
  const yearText = year === PERIOD ? `cả giai đoạn ${state?.period || ""}` : yLabel(year);
  const vol = R?.metric === "volume";
  const fmtV = (v) => (vol ? n(v, 1) + " tấn" : usd(v));

  return (
    <>
      <StepHero id="ranking" />
      <Card title="Thiết lập">
        <div className="settings-grid">
          <Field label="Ngưỡng Top (tỷ trọng giá trị lũy kế)"><Seg value={thr} onChange={(v) => upd({ topThreshold: v })} options={[0.5, 0.7, 0.8, 0.9].map((v) => ({ value: v, label: Math.round(v * 100) + "%" }))} /></Field>
          <Field label="Tiêu chí xếp hạng" hint="Khối lượng giúp đưa vào các nguồn vận đơn không có trị giá.">
            <Seg value={S.rankingMetric} onChange={(v) => upd({ rankingMetric: v })} options={[{ value: "value", label: "Trị giá (USD)" }, { value: "volume", label: "Khối lượng (tấn)" }]} />
          </Field>
          <Field label="Giao dịch trùng giữa các nguồn"><Toggle checked={S.excludeCrossSourceDup} onChange={(v) => upd({ excludeCrossSourceDup: v })} color="var(--phase-C)" label="Không cộng dòng nghi trùng" /></Field>
          <Field label="Tên dự án (dùng đặt tên file)"><input className="input" defaultValue={S.projectName} onBlur={(e) => e.target.value !== S.projectName && upd({ projectName: e.target.value || "ChemSeg" })} /></Field>
        </div>
      </Card>
      <RunBar id="ranking" label="Chạy xếp hạng" note={`Top ${Math.round(thr * 100)}% theo ${S.rankingMetric === "volume" ? "khối lượng" : "trị giá"}, từng năm và cả giai đoạn, nhiều phạm vi.`} />
      {R && (
        <>
          <Tabs value={year} onChange={setYear} color="var(--phase-C)" tabs={[...years.map((y) => ({ value: y, label: yLabel(y) })), ...(R.period ? [{ value: PERIOD, label: `Cả giai đoạn ${state.period}` }] : [])]} />
          {year === PERIOD && <Callout kind="info">Cộng dồn mọi năm cho từng doanh nghiệp (mã nhóm doanh nghiệp thống nhất giữa các năm). Dùng để trả lời “ai là nhà nhập khẩu lớn nhất cả giai đoạn”; Top của từng năm xem ở các thẻ năm.</Callout>}
          <div className="row mb12">
            <span className="label">Phạm vi</span>
            <select className="select" style={{ width: 340 }} value={scope} onChange={(e) => setScope(e.target.value)}>
              <optgroup label="Nhà nhập khẩu (doanh nghiệp mua)">{scopes.filter((s) => s.startsWith("P")).map((s) => <option key={s} value={s}>{YR.scopes[s].label}</option>)}</optgroup>
              <optgroup label="Nhà xuất khẩu (doanh nghiệp bán)">{scopes.filter((s) => s.startsWith("S")).map((s) => <option key={s} value={s}>{YR.scopes[s].label}</option>)}</optgroup>
            </select>
          </div>
          {sc && (
            <div className="kpis mb12">
              <Kpi label={`Doanh nghiệp thuộc Top ${Math.round(R.threshold * 100)}%`} value={n(sc.topCount)} color="var(--phase-C)" sub={`trên ${n(sc.entities)} doanh nghiệp trong phạm vi`} />
              <Kpi label="Tỷ trọng của nhóm Top" value={pct(sc.topValueShare, 1)} color="var(--phase-C)" />
              <Kpi label={vol ? "Tổng khối lượng (doanh nghiệp xác định)" : "Tổng trị giá (doanh nghiệp xác định)"} value={fmtV(sc.total)} color="var(--phase-C)" />
              <Kpi label="Giá trị thuộc doanh nghiệp không xác định" value={pct(sc.placeholderShare, 1)} color={sc.placeholderShare > 0.1 ? "var(--warn)" : "var(--text-3)"} sub="không đưa vào mẫu số" />
              <Kpi label={vol ? "Dòng không có khối lượng" : "Dòng không tính được giá trị"} value={n(sc.notCalc)} color="var(--text-3)" sub={`/ ${n(sc.rowsInScope)} dòng trong phạm vi`} />
            </div>
          )}
          {data && data.rows.length > 0 && (
            <>
              <Card title={`Biểu đồ Pareto — ${data.meta.label} — ${yearText}`} sub="Mỗi cột là một doanh nghiệp theo thứ tự giá trị giảm dần; đường đen là tỷ trọng lũy kế.">
                <ParetoChart data={data.pareto} threshold={R.threshold} color="#D6336C" />
              </Card>
              <Card title="Bảng xếp hạng" sub="Doanh nghiệp thuộc Top được tô đậm. Phân khúc ngành hiển thị sau khi áp dụng bước 9.">
                <Table maxHeight={560} rowClass={(r) => (r.top ? "" : "dim")} columns={[
                  { key: "rank", label: "#", num: true },
                  { key: "name", label: "Doanh nghiệp", className: "wrap", render: (r) => <div><b>{r.name}</b> <span className="muted small">{r.id}</span></div> },
                  { key: "country", label: "Quốc gia", className: "nowrap" },
                  { key: "value", label: vol ? "Khối lượng" : "Trị giá", num: true, render: (r) => fmtV(r.value) },
                  { key: "share", label: "Tỷ trọng", render: (r) => <div style={{ minWidth: 110 }}><div className="num" style={{ textAlign: "left" }}>{pct(r.share, 2)}</div><Bar value={r.share} max={data.rows[0]?.share || 1} color={r.top ? "#D6336C" : "#C3CADD"} /></div> },
                  { key: "cum", label: "Lũy kế", num: true, render: (r) => pct(r.cum, 1) },
                  { key: "top", label: "Top", render: (r) => (r.top ? <Pill tone="ok">Có</Pill> : <Pill tone="mute">Không</Pill>) },
                  { key: "rows", label: "Dòng", num: true, render: (r) => n(r.rows) },
                  { key: "conf", label: "Độ tin cậy", render: (r) => <ConfPill v={r.confidence} /> },
                  { key: "ind", label: "Phân khúc ngành", render: (r) => r.industry || <span className="muted">—</span> },
                ]} rows={data.rows} />
                <Pager page={page} size={50} total={data.total} onPage={setPage} />
              </Card>
            </>
          )}
          <Card title="Tải tệp nghiên cứu" sub="Mỗi file: mỗi năm một trang tính (kèm trang tính Cả giai đoạn khi có từ 2 năm), chỉ gồm doanh nghiệp thuộc Top, có sẵn cột Ngành / Phân khúc ngành để điền.">
            <Callout kind="ok" title="Khuyến nghị:">dùng <b>Danh sách doanh nghiệp cần nghiên cứu ngành</b> — gộp mọi năm, mỗi doanh nghiệp một dòng ⇒ chỉ nghiên cứu một lần, rồi tải lại ở bước 9.</Callout>
            <div className="row">
              <Btn kind="primary" color="var(--phase-C)" icon={Factory} onClick={() => download("Tạo danh sách doanh nghiệp cần nghiên cứu", "exportResearchMaster")}>Danh sách doanh nghiệp cần nghiên cứu ngành</Btn>
              {[["P_ALL", "Nhập khẩu – Toàn cầu"], ["P_VN", "Nhập khẩu – Việt Nam"], ["P_CONT", "Nhập khẩu – Theo châu lục"], ["S_ALL", "Xuất khẩu – Toàn cầu"], ["S_VN", "Xuất khẩu – Vào Việt Nam"], ["S_CONT", "Xuất khẩu – Theo châu lục"]].map(([k, l]) => (
                <Btn key={k} kind="ghost" size="sm" icon={Download} onClick={() => download("Tạo file " + l, "exportResearch", { kind: k })}>{l}</Btn>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}

/* ═════════ BƯỚC 9 — GÁN NGÀNH ═════════ */
export function IndustryStep() {
  const { state, run, uploadTo, download, stepState, yLabel } = useApp();
  const S = state?.settings || {};
  const ref = state?.refs?.industry;
  const R = state?.results?.industry;
  const years = state?.years?.map((y) => y.year) || [];
  const st = stepState("industry");
  return (
    <>
      <StepHero id="industry" />
      <div className="grid-2">
        <Card title="Industry Master" sub="Tải một hoặc nhiều tệp (mọi trang tính đều được đọc).">
          <DropZone multiple accept={XLS} color="var(--phase-C)" icon={Factory} title="Kéo thả tệp Industry Master" sub="Cột: Tên doanh nghiệp · Quốc gia · Ngành · Phân khúc ngành (chấp nhận tiêu đề bản cũ)"
            onFiles={(f) => uploadTo("loadIndustry", f, "Đọc Industry Master")} />
          <div className="row mt12">
            {ref?.files?.map((f) => <span className="chip" key={f.name}>{f.name} · {n(f.rows)} dòng{f.emptySeg ? ` · ${n(f.emptySeg)} trống phân khúc` : ""}</span>)}
          </div>
          <div className="row mt12">
            <Btn kind="ghost" size="sm" icon={Download} onClick={() => download("Tạo mẫu", "exportTemplate", { kind: "industry" })}>Tệp mẫu</Btn>
            {ref?.entries > 0 && <Btn kind="danger" size="sm" icon={Trash2} onClick={() => run("Xóa Industry Master", "clearIndustry")}>Xóa tất cả</Btn>}
          </div>
          {ref?.entries > 0 && <Callout kind="info">Đang có <b>{n(ref.entries)}</b> doanh nghiệp duy nhất (gộp theo tên lõi + quốc gia){ref.conflictCount ? <> · <b>{n(ref.conflictCount)}</b> xung đột ngành giữa các file (dùng dòng tải sau)</> : null}.</Callout>}
        </Card>
        <Card title="Phạm vi gán ngành">
          <RadioCards color="var(--phase-C)" value={S.industryApplyScope} onChange={(v) => run("Cập nhật", "updateSettings", { partial: { industryApplyScope: v } })} options={[
            { value: "all", label: "Mọi dòng của doanh nghiệp (khuyến nghị)", desc: "Ngành là thuộc tính của doanh nghiệp ⇒ áp dụng cho cả những năm doanh nghiệp không thuộc Top. Tăng độ phủ phân loại dự phòng." },
            { value: "top", label: "Chỉ dòng doanh nghiệp thuộc Top của năm đó (như bản cũ)", desc: "Giữ đúng hành vi cũ." },
          ]} />
        </Card>
      </div>
      <RunBar id="industry" label="Áp dụng Industry Master" canRun={ref?.entries > 0} note={ref?.entries ? "" : "Chưa có Industry Master — có thể bỏ qua bước này."}
        extra={st.state !== "done" && st.can && <Btn kind="ghost" icon={SkipForward} onClick={() => run("Bỏ qua", "skipStep", { id: "industry" }, [], { success: "Đã bỏ qua bước gán ngành" })}>Bỏ qua bước này</Btn>} />
      {R && !R._skipped && (
        <>
          <div className="kpis mb12">
            <Kpi label="Doanh nghiệp mua khớp ngành" value={n(R.entitiesMatched)} color="var(--phase-C)" sub={`${n(R.exact)} khớp tên · ${n(R.loose)} khớp gần đúng`} />
            {years.map((yr) => <Kpi key={yr} label={`${yLabel(yr)}: trị giá có ngành`} value={pct(R.years[yr].valueShare, 0)} color="var(--phase-C)" sub={`${n(R.years[yr].rows)} dòng`} />)}
            <Kpi label="Dòng master không dùng tới" value={n(R.unusedEntries)} color="var(--text-3)" />
          </div>
          <Card title={`Doanh nghiệp thuộc Top chưa có ngành (${n(R.topMissingCount)})`} sub="Ưu tiên nghiên cứu bổ sung các doanh nghiệp này." tools={<Btn kind="ghost" size="sm" icon={Download} onClick={() => download("Tạo danh sách", "exportResearchMaster")}>Tải danh sách doanh nghiệp cần nghiên cứu</Btn>}>
            {R.topMissing.length ? <Table maxHeight={420} columns={[{ key: "id", label: "Mã" }, { key: "name", label: "Tên chuẩn hóa", className: "wrap" }, { key: "country", label: "Quốc gia" }, { key: "value", label: "Trị giá (các năm thuộc Top)", num: true, render: (r) => usd(r.value) }, { key: "years", label: "Năm thuộc Top" }]} rows={R.topMissing} /> : <Empty title="Tất cả doanh nghiệp thuộc Top đều đã có ngành" />}
          </Card>
        </>
      )}
      {R?._skipped && <Callout kind="info">Đã bỏ qua. Phân loại sẽ chỉ dựa trên từ khóa.</Callout>}
    </>
  );
}
