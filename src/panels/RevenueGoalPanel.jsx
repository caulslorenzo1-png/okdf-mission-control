import { useState, useCallback } from "react";
import { C, MCP_STRIPE, REVENUE_GOAL } from "../config";
import { callClaude, getText, tryJSON, fmtMoney } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, Btn } from "../ui";

export function RevenueGoalPanel() {
  const refreshKey = useRefreshKey();
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
    const data = await callClaude(
      `Use the stripe MCP to list payment intents created after unix timestamp ${monthStart} (start of this month). Filter to succeeded status only. Sum their amounts in cents. Return JSON: {"total_cents": number, "count": number}`,
      [MCP_STRIPE]
    );
    setRevenue(tryJSON(getText(data)));
    setLoading(false);
  }, []);

  useStaggerLoad(load, refreshKey, 1000);

  const pct = revenue ? Math.min(100, Math.round((revenue.total_cents / REVENUE_GOAL) * 100)) : 0;
  const color = pct >= 100 ? C.green : pct >= 60 ? C.amber : C.red;
  const panelStatus = loading ? "loading" : revenue ? (pct >= 100 ? "ok" : "idle") : "err";

  return (
    <Panel title="Monthly Revenue Goal" status={panelStatus} accent={C.green} onRetry={load} id="revenue-goal">
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading…</div>
      ) : revenue ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color }}>{fmtMoney(revenue.total_cents)}</span>
              <span style={{ fontSize: 11, color: C.muted }}> / {fmtMoney(REVENUE_GOAL)}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{pct}%</div>
          </div>
          <div style={{ background: C.surface, borderRadius: 4, height: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: `linear-gradient(90deg, ${color}80, ${color})`,
              borderRadius: 4, transition: "width 0.6s ease",
              boxShadow: `0 0 8px ${color}60`,
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
              {revenue.count} payment{revenue.count !== 1 ? "s" : ""} · {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            </div>
            <Btn small color={C.green} onClick={load}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 10 }}>Could not load revenue data.</div>
      )}
    </Panel>
  );
}
