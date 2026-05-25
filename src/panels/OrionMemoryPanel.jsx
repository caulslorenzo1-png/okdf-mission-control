import { useState, useCallback } from "react";
import { C, MCP_MAKE, ORION_DS_ID, TEAM_ID } from "../config";
import { callClaude, getText, tryJSON, fmtMoney } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, Pulse, Btn } from "../ui";

export function OrionMemoryPanel({ onData }) {
  const refreshKey = useRefreshKey();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the make MCP to get a record with key "orion_state" from data store ID ${ORION_DS_ID} in team ${TEAM_ID}. Return JSON with these fields: last_run, run_count, ops_summary, active_flags, agent_tasks, last_decision, status, metrics, escalations_pending, actions_this_cycle`,
      [MCP_MAKE]
    );
    const j = tryJSON(getText(data));
    setState(j);
    if (onData) onData(j);
    setLoading(false);
  }, []);

  useStaggerLoad(load, refreshKey, 0);

  const statusColor = state?.status === "green" ? C.green : state?.status === "red" ? C.red : state?.status === "yellow" ? C.amber : C.muted;
  const panelStatus = loading ? "loading" : state?.status === "green" ? "ok" : state?.status === "red" ? "err" : "idle";

  return (
    <Panel title="Orion Prime — Last State" status={panelStatus} accent={C.cyan} onRetry={load} id="orion-memory">
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Reading memory…</div>
      ) : state ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: `${statusColor}12`,
            border: `1px solid ${statusColor}30`,
            borderRadius: 6, padding: "10px 14px",
          }}>
            <div style={{
              fontSize: 20, fontFamily: "'DM Mono', monospace", fontWeight: 700,
              color: statusColor, textTransform: "uppercase", letterSpacing: "0.1em",
              textShadow: `0 0 20px ${statusColor}60`,
            }}>● {state.status || "—"}</div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
              RUN #{state.run_count || 0}
            </div>
          </div>

          {state.metrics && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                ["BALANCE", fmtMoney(state.metrics.stripe_balance_cents)],
                ["REV 24H", fmtMoney(state.metrics.revenue_24h_cents)],
                ["PAYMENTS", state.metrics.payments_24h ?? "—"],
                ["FAILED", state.metrics.failed_24h ?? "—"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px" }}>
                  <div style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.14em" }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: label === "FAILED" && val > 0 ? C.red : C.text, fontFamily: "'DM Mono', monospace" }}>{val}</div>
                </div>
              ))}
            </div>
          )}

          {[
            ["OPS SUMMARY", state.ops_summary],
            ["ACTIVE FLAGS", state.active_flags],
            ["AGENT TASKS", state.agent_tasks],
            ["LAST DECISION", state.last_decision],
          ].map(([label, val]) => val && val !== "none" && (
            <div key={label} style={{
              background: C.surface, borderRadius: 4, padding: "8px 10px",
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.16em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 10, color: C.text, lineHeight: 1.6 }}>{val}</div>
            </div>
          ))}

          {Array.isArray(state.actions_this_cycle) && state.actions_this_cycle.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px" }}>
              <div style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.16em", marginBottom: 6 }}>ACTIONS THIS CYCLE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {state.actions_this_cycle.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ color: C.cyan, fontSize: 9, fontFamily: "'DM Mono', monospace", flexShrink: 0, marginTop: 1 }}>›</span>
                    <span style={{ fontSize: 9, color: C.text, lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.escalations_pending > 0 && (
            <div style={{ background: `${C.amber}12`, border: `1px solid ${C.amber}40`, borderRadius: 4, padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <Pulse color={C.amber} size={6} />
              <span style={{ fontSize: 9, color: C.amber, fontFamily: "'DM Mono', monospace" }}>
                {state.escalations_pending} ESCALATION{state.escalations_pending > 1 ? "S" : ""} PENDING LORENZO RESPONSE
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
              {state.last_run ? new Date(state.last_run).toLocaleString() : "Never run"}
            </div>
            <Btn small color={C.cyan} onClick={load}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
          No state found.<br />Run Orion Prime to populate.
        </div>
      )}
    </Panel>
  );
}
