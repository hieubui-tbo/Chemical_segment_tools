/* ═════════ BƯỚC 15 — RÀ SOÁT DỮ LIỆU SAU XỬ LÝ ═════════
   Hướng dẫn nhóm rà soát bộ dữ liệu đã xử lý: trường hợp nào loại khỏi database, trường hợp nào
   giữ nhưng không dùng cho giá & lượng, cặp cột nào cần đối chiếu chéo — kèm số liệu thực tế và tệp rà soát. */
import { useEffect, useMemo, useState } from "react";
import { FileSearch, Ban, Scale, StickyNote, ListOrdered, ArrowLeftRight } from "lucide-react";
import { useApp } from "../ui/store.jsx";
import { Card, Kpi, Btn, Pill, Callout, Table, StepHero } from "../ui/components.jsx";
import { n, usd } from "../ui/format.js";
import { REVIEW_CASES, REVIEW_TIERS, REVIEW_MODE, CROSS_CHECKS, REVIEW_STEPS } from "../engine/review.js";

const TIER_ICON = { DROP: Ban, PARTIAL: Scale, NOTE: StickyNote };
const TIER_COLOR = { DROP: "var(--bad-d)", PARTIAL: "var(--warn-d)", NOTE: "var(--phase-A)" };

export function ReviewStep() {
  const { state, query, download } = useApp();
  const [R, setR] = useState(null);
  const hasData = !!state?.years?.length;
  const metricsDone = state?.steps?.find((s) => s.id === "metrics")?.state === "done";
  const sig = useMemo(() => JSON.stringify(state?.steps?.map((s) => s.state)), [state]);
  useEffect(() => { if (hasData) query("getReview").then(setR); else setR(null); }, [hasData, sig, query]);
  const st = useMemo(() => Object.fromEntries((R?.cases || []).map((c) => [c.id, c])), [R]);
  const active = (R?.cases || []).filter((c) => c.rows > 0).length;

  return (
    <>
      <StepHero id="review" />
      {!metricsDone && <Callout kind="warn" title="Chưa chạy hết các bước.">Bảng hướng dẫn dùng được ngay; số dòng và trị giá của từng trường hợp chỉ đầy đủ khi đã chạy tới bước 13 (Chỉ số phân khúc).</Callout>}
      {R && (
        <div className="kpis mb12">
          <Kpi label="Tổng số dòng" value={n(R.totalRows)} sub={usd(R.totalValue)} color="var(--phase-E)" />
          <Kpi label="Đang bị loại khỏi chỉ số giá" value={n(R.finalExcluded.rows)} sub={`${usd(R.finalExcluded.value)} · cột Giữ lại sau lọc = Không`} color="var(--warn)" />
          <Kpi label="Trường hợp có phát sinh" value={`${active}/${REVIEW_CASES.length}`} sub="một dòng có thể thuộc nhiều trường hợp" color="var(--phase-E)" />
        </div>
      )}

      <Card title="Ba mức xử lý" sub="Mỗi trường hợp bên dưới được xếp vào một mức. Mục tiêu: bộ dữ liệu dùng cho báo cáo chỉ gồm giao dịch đúng sản phẩm, không trùng, số liệu tin cậy.">
        <div className="rv-tiers">
          {Object.values(REVIEW_TIERS).map((t) => {
            const I = TIER_ICON[t.id];
            return (
              <div key={t.id} className="rv-tier" style={{ borderTopColor: TIER_COLOR[t.id] }}>
                <div className="rv-tier-h" style={{ color: TIER_COLOR[t.id] }}><I size={16} /> {t.label}</div>
                <div className="rv-tier-t">{t.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Các trường hợp cần rà soát" sub="Cách lọc áp dụng cho tệp dữ liệu chi tiết từng năm (bước 14). Tệp rà soát dữ liệu tách sẵn mỗi trường hợp một trang tính.">
        {Object.values(REVIEW_TIERS).map((t) => {
          const I = TIER_ICON[t.id];
          return (
            <div key={t.id} className="rv-group">
              <div className="rv-group-h" style={{ color: TIER_COLOR[t.id] }}><I size={15} /> {t.label}</div>
              {REVIEW_CASES.filter((k) => k.tier === t.id).map((k) => {
                const c = st[k.id];
                return (
                  <div key={k.id} className={"rv-case" + (c && !c.rows ? " zero" : "")}>
                    <div className="rv-main">
                      <div className="rv-title"><span className="rv-id">{k.id}</span>{k.title}{k.id === "R02" && R && !R.hsCodes ? <span className="muted small"> — hồ sơ chưa khai mã HS nên chưa kiểm tra</span> : null}</div>
                      <div className="rv-action">{k.action}</div>
                    </div>
                    <div className="rv-meta">
                      <div><span className="rv-lbl">Cách lọc</span>{k.filter}</div>
                      <div><span className="rv-lbl">Cột cần đối chiếu</span>{k.check}</div>
                    </div>
                    <div className="rv-count">
                      <Pill tone={k.mode === "AUTO" ? "ok" : k.mode === "RULE" ? "violet" : k.mode === "DECIDE" ? "warn" : "mute"}>{REVIEW_MODE[k.mode]}</Pill>
                      <div className="rv-num">{c ? n(c.rows) : "—"}<span> dòng</span></div>
                      <div className="muted small">{c ? usd(c.value) : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Card>

      <Card title="Các cặp cột cần đối chiếu chéo" icon={<ArrowLeftRight size={20} color="var(--phase-E)" />} sub="Sau khi xử lý, đặt hai cột cạnh nhau trong tệp dữ liệu chi tiết; dấu hiệu bất thường cho biết dòng cần xem lại.">
        <Table columns={[
          { key: "a", label: "Cột A", className: "wrap-s", render: (c) => <b>{c.a}</b> },
          { key: "b", label: "Đối chiếu với cột B", className: "wrap-s" },
          { key: "signal", label: "Dấu hiệu bất thường", className: "wrap-s" },
          { key: "meaning", label: "Ý nghĩa / cách xử lý", className: "wrap" },
        ]} rows={CROSS_CHECKS.map((c, i) => ({ ...c, __key: i }))} />
      </Card>

      <Card title="Quy trình rà soát gợi ý" icon={<ListOrdered size={20} color="var(--phase-E)" />}>
        <ol className="rv-steps">{REVIEW_STEPS.map((x, i) => <li key={i}>{x}</li>)}</ol>
        <div className="row mt12">
          <Btn kind="primary" size="lg" color="var(--phase-E)" icon={FileSearch} disabled={!hasData} onClick={() => download("Tạo tệp rà soát dữ liệu", "exportDataReview")}>Tải tệp rà soát dữ liệu (Excel)</Btn>
          <span className="muted small">Gồm hướng dẫn, bảng đối chiếu chéo, tổng hợp theo năm và mỗi trường hợp một trang tính (tối đa 30.000 dòng/trường hợp), có cột “Quyết định” và “Ghi chú” để nhóm điền.</span>
        </div>
      </Card>
    </>
  );
}
