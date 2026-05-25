import { useState, useCallback } from "react";
import { C, MCP_NETLIFY, NETLIFY_ID } from "../config";
import { callClaude, getText, tryJSON } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, SectionLabel, Btn } from "../ui";

export function AnalyticsPanel() {
  const refreshKey = useRefreshKey();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await callClaude(
      `Use the netlify MCP to get analytics for site ID "${NETLIFY_ID}". Get page views and unique visitors for the last 7 days if available. Return JSON: {"pageviews": number, "visitors": number, "period": string, "top_pages": [{"path": string, "views": number}]}`,
      [MCP_NETLIFY]
    );
    setData(tryJSON(getText(res)));
    setLoading(false);
  }, []);

  useStaggerLoad(load, refreshKey, 2200);

  const panelStatus = loading ? "loading" : data ? "ok" : "idle";

  return (
    <Panel title="Analytics — 7 Days" status={panelStatus} accent={C.cyan} onRetry={load} id="analytics">
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading…</div>
      ) : data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["PAGE VIEWS", data.pageviews, C.cyan], ["VISITORS", data.visitors, C.purple]].map(([label, val, color]) => (
              <div key={label} style={{
                textAlign: "center", padding: "10px 6px",
                background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 5,
              }}>
                <div style={{
                  fontSize: 24, fontWeight: 700, color,
                  fontFamily: "'DM Mono', monospace", fontVariantNumeric: "tabular-nums",
                  textShadow: `0 0 16px ${color}50`,
                }}>{val?.toLocaleString() ?? "—"}</div>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.14em", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {data.period && (
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>Period: {data.period}</div>
          )}
          {data.top_pages?.length > 0 && (
            <>
              <SectionLabel color={C.cyan}>Top Pages</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {data.top_pages.slice(0, 4).map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "5px 8px", background: C.surface,
                    border: `1px solid ${C.border}`, borderRadius: 4,
                  }}>
                    <span style={{ fontSize: 9, color: C.text, fontFamily: "'DM Mono', monospace" }}>{p.path}</span>
                    <span style={{ fontSize: 9, color: C.cyan, fontFamily: "'DM Mono', monospace", fontVariantNumeric: "tabular-nums" }}>{p.views?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn small color={C.cyan} onClick={load}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
          Analytics unavailable — may require Netlify Pro plan.
        </div>
      )}
    </Panel>
  );
}
