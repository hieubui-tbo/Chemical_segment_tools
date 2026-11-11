/* Biểu đồ SVG nhẹ, có tooltip — theo quy chuẩn: thanh ≤ 24px bo 4px đầu dữ liệu, đường 2px, lưới mảnh. */
import { useMemo, useRef, useState } from "react";
import { n, pct, price, usd } from "./format.js";
import { OUT_OF_SCOPE, UNCLASSIFIED } from "../engine/steps/price.js";

const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const GRAY_UNCLASS = "#A3ACC6";
export const GRAY_OUT = "#D3D8E6";

/** Màu cố định theo phân khúc (theo thứ tự bộ từ khóa), không đổi khi lọc. */
export function segmentColors(segments) {
  const map = {};
  let k = 0;
  segments.forEach((s) => {
    if (s === UNCLASSIFIED) map[s] = GRAY_UNCLASS;
    else if (s === OUT_OF_SCOPE) map[s] = GRAY_OUT;
    else map[s] = k < PALETTE.length ? PALETTE[k++] : "#8C95B3";
  });
  return map;
}

function useTip() {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const show = (e, content) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, content });
  };
  return { ref, tip, show, hide: () => setTip(null) };
}

function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** Pareto: cột tỷ trọng từng DN + đường lũy kế + vạch ngưỡng. */
export function ParetoChart({ data, threshold, color = "#D6336C", height = 250 }) {
  const { ref, tip, show, hide } = useTip();
  const W = 900, H = height, L = 44, R = 46, T = 14, B = 26;
  const n0 = data.length;
  if (!n0) return null;
  const iw = W - L - R, ih = H - T - B;
  const maxShare = niceMax(Math.max(...data.map((d) => d.share)));
  const bw = iw / n0;
  const barW = Math.min(24, Math.max(2, bw - 2));
  const x = (i) => L + i * bw + (bw - barW) / 2;
  const yS = (v) => T + ih - (v / maxShare) * ih;
  const yC = (v) => T + ih - v * ih;
  const line = data.map((d, i) => `${i ? "L" : "M"}${(L + i * bw + bw / 2).toFixed(1)},${yC(d.cum).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="chart" ref={ref} onMouseLeave={hide}>
      <div className="legend">
        <span><i style={{ background: color }} />Tỷ trọng doanh nghiệp thuộc Top</span>
        <span><i style={{ background: "#C3CADD" }} />Doanh nghiệp ngoài Top</span>
        <span><i className="line-key" style={{ background: "#0C1433" }} />Tỷ trọng lũy kế (trục phải)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ Pareto">
        <g className="grid">{ticks.map((t) => <line key={t} x1={L} x2={W - R} y1={yC(t)} y2={yC(t)} />)}</g>
        <g className="axis">
          {ticks.map((t) => <text key={t} x={W - R + 6} y={yC(t) + 4}>{Math.round(t * 100)}%</text>)}
          {[0, 0.5, 1].map((t) => <text key={t} x={L - 6} y={yS(maxShare * t) + 4} textAnchor="end">{pct(maxShare * t, 0)}</text>)}
        </g>
        <line x1={L} x2={W - R} y1={yC(threshold)} y2={yC(threshold)} stroke={color} strokeWidth="1" strokeDasharray="0" opacity=".55" />
        <text x={L + 4} y={yC(threshold) - 5} className="lbl" style={{ fill: "var(--text-2)", fontWeight: 700 }}>Ngưỡng {Math.round(threshold * 100)}%</text>
        {data.map((d, i) => {
          const h = Math.max(1, T + ih - yS(d.share));
          const y0 = T + ih - h;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={i} onMouseMove={(e) => show(e, <><b>#{d.rank} {d.name}</b><div className="t-sub">Tỷ trọng {pct(d.share, 2)} · Lũy kế {pct(d.cum, 1)}</div></>)}>
              <rect x={L + i * bw} y={T} width={bw} height={ih} fill="transparent" />
              <path d={`M${x(i)},${T + ih} V${y0 + r} Q${x(i)},${y0} ${x(i) + r},${y0} H${x(i) + barW - r} Q${x(i) + barW},${y0} ${x(i) + barW},${y0 + r} V${T + ih} Z`} fill={d.top ? color : "#C3CADD"} />
            </g>
          );
        })}
        <path d={line} fill="none" stroke="#0C1433" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line className="baseline" x1={L} x2={W - R} y1={T + ih} y2={T + ih} />
        <text x={L} y={H - 6} className="lbl">Hạng 1</text>
        <text x={W - R} y={H - 6} className="lbl" textAnchor="end">Hạng {data[n0 - 1].rank}</text>
      </svg>
      {tip && <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>}
    </div>
  );
}

/** So sánh giá bình quân trước / sau lọc theo phân khúc (thanh ngang, 2 chuỗi). */
export function PriceCompare({ rows, colors }) {
  const { ref, tip, show, hide } = useTip();
  const items = rows.filter((r) => r.before.avgPrice || r.after.avgPrice);
  if (!items.length) return null;
  const max = niceMax(Math.max(...items.map((r) => Math.max(r.before.avgPrice || 0, r.after.avgPrice || 0))));
  const W = 900, rowH = 46, L = 210, R = 90, T = 6;
  const H = T + items.length * rowH + 22;
  const xs = (v) => L + (v / max) * (W - L - R);
  return (
    <div className="chart" ref={ref} onMouseLeave={hide}>
      <div className="legend"><span><i style={{ background: "#B8C0D8" }} />Trước lọc</span><span><i style={{ background: "#0C1433" }} />Sau lọc (màu phân khúc)</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Giá bình quân theo phân khúc">
        <g className="grid">{[0, 0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={xs(max * t)} x2={xs(max * t)} y1={T} y2={H - 20} />)}</g>
        <g className="axis">{[0, 0.5, 1].map((t) => <text key={t} x={xs(max * t)} y={H - 6} textAnchor="middle">{price(max * t)}</text>)}</g>
        {items.map((r, i) => {
          const y = T + i * rowH;
          const c = colors[r.segment] || "#8C95B3";
          const bar = (v, yy, fill) => { const w = Math.max(0, xs(v || 0) - L); const rr = Math.min(4, w / 2); return <path d={`M${L},${yy} H${L + w - rr} Q${L + w},${yy} ${L + w},${yy + rr} V${yy + 14 - rr} Q${L + w},${yy + 14} ${L + w - rr},${yy + 14} H${L} Z`} fill={fill} />; };
          return (
            <g key={r.segment} onMouseMove={(e) => show(e, <><b>{r.segment}</b><div className="t-sub">Trước lọc: {price(r.before.avgPrice)} USD/tấn ({n(r.before.count)} dòng)</div><div className="t-sub">Sau lọc: {price(r.after.avgPrice)} USD/tấn ({n(r.after.count)} dòng)</div></>)}>
              <rect x={0} y={y} width={W} height={rowH - 4} fill="transparent" />
              <text x={L - 12} y={y + 20} textAnchor="end" style={{ fontSize: 12.5, fill: "var(--text)", fontWeight: 600 }}>{r.segment.length > 28 ? r.segment.slice(0, 27) + "…" : r.segment}</text>
              {bar(r.before.avgPrice, y + 3, "#B8C0D8")}
              {bar(r.after.avgPrice, y + 21, c)}
              <text x={xs(r.after.avgPrice || 0) + 6} y={y + 32} style={{ fontSize: 11.5, fill: "var(--text-2)", fontWeight: 700 }}>{price(r.after.avgPrice)}</text>
            </g>
          );
        })}
        <line className="baseline" x1={L} x2={L} y1={T} y2={H - 20} />
      </svg>
      {tip && <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>}
    </div>
  );
}

/** Thanh xếp chồng 100% theo năm (cơ cấu trị giá theo phân khúc). */
export function StackRows({ years, data, colors, valueKey = "value", labels = {} }) {
  const { ref, tip, show, hide } = useTip();
  const segs = Object.keys(colors);
  return (
    <div className="chart" ref={ref} onMouseLeave={hide}>
      <div className="legend">{segs.map((s) => <span key={s}><i style={{ background: colors[s] }} />{s}</span>)}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {years.map((yr) => {
          const items = data[yr] || [];
          const tot = items.reduce((a, it) => a + (it[valueKey] || 0), 0) || 1;
          return (
            <div key={yr} style={{ display: "grid", gridTemplateColumns: "96px 1fr", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text-2)" }} title={labels[yr] || yr}>{labels[yr] || yr}</div>
              <div className="stackbar">
                {segs.map((s) => {
                  const it = items.find((x) => x.segment === s);
                  const v = it ? it[valueKey] || 0 : 0;
                  if (!v) return null;
                  return <div key={s} style={{ width: (v / tot) * 100 + "%", background: colors[s] }} onMouseMove={(e) => show(e, <><b>{labels[yr] || yr} · {s}</b><div className="t-sub">{valueKey === "value" ? usd(v) : n(v)} · {pct(v / tot)}</div><div className="t-sub">{n(it.rows)} dòng</div></>)} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      {tip && <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>}
    </div>
  );
}

/** Biểu đồ hộp mini cho một nhóm IQR (thang riêng từng dòng). */
export function MiniBox({ v, color = "#E8590C" }) {
  if (v.q1 == null) return <span className="muted small">—</span>;
  const lo = Math.max(0, v.lower ?? v.q1), hi = v.upper;
  const min = Math.min(lo, v.q1), max = Math.max(hi, v.q3) || 1;
  const W = 220, H = 26, pad = 4;
  const sx = (x) => pad + ((x - min) / (max - min || 1)) * (W - 2 * pad);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }} aria-label="Biểu đồ hộp">
      <line x1={sx(lo)} x2={sx(hi)} y1={H / 2} y2={H / 2} stroke="#9AA4C2" strokeWidth="1.5" />
      <line x1={sx(lo)} x2={sx(lo)} y1={7} y2={H - 7} stroke="#9AA4C2" strokeWidth="1.5" />
      <line x1={sx(hi)} x2={sx(hi)} y1={7} y2={H - 7} stroke="#9AA4C2" strokeWidth="1.5" />
      <rect x={sx(v.q1)} y={5} width={Math.max(2, sx(v.q3) - sx(v.q1))} height={H - 10} rx="3" fill={color} opacity=".22" stroke={color} strokeWidth="1.5" />
      <line x1={sx(v.median)} x2={sx(v.median)} y1={4} y2={H - 4} stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

/** Thanh ngang đơn giản cho danh sách (vd: cơ cấu theo độ tin cậy). */
export function HBarList({ items, color = "#2F5BEA", fmt = n }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "grid", gridTemplateColumns: "150px 1fr 70px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
          <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{it.label}</span>
          <div style={{ height: 14, background: "#EEF1F8", borderRadius: 4 }}><div style={{ width: (it.value / max) * 100 + "%", height: "100%", background: it.color || color, borderRadius: "0 4px 4px 0" }} /></div>
          <span className="num" style={{ textAlign: "right", fontWeight: 700 }}>{fmt(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function useSegColors(state) {
  return useMemo(() => {
    const segs = [...(state?.refs?.keywords?.segments?.map((s) => s.name) || [])];
    const r = state?.results?.classify;
    if (r) Object.values(r.years).forEach((y) => y.segments.forEach((s) => { if (!segs.includes(s.segment)) segs.push(s.segment); }));
    [UNCLASSIFIED, OUT_OF_SCOPE].forEach((s) => { const i = segs.indexOf(s); if (i >= 0) { segs.splice(i, 1); segs.push(s); } });
    return segmentColors(segs);
  }, [state]);
}
