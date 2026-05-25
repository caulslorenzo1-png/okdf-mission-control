import { useState, useCallback } from "react";
import { C, MCP_NOTION, NOTION_LOG_DB } from "../config";
import { callClaude, getText } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, Tag, Btn } from "../ui";

export function ActionLogPanel() {
  const refreshKey = useRefreshKey();
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the notion MCP to query the "Orion Action Log" database (${NOTION_LOG_DB}). Return the last 10 entries as JSON array: [{"title": string, "type": string, "result": string, "cycle": string, "notes": string}] ordered by Cycle descending.`,
      [MCP_NOTION]
    );
    const text = getText(data);
    const m = text.match(/\[[\s\S]*?\]/);
    try { setEntries(m ? JSON.parse(m[0]) : []); } catch { setEntries([]); }
    setLoading(false);
  }, []);

  useStaggerLoad(load, refreshKey, 1600);

  const typeColor = (t) => ({
    content_post: C.cyan,
    task_create: C.amber,
    task_update: C.amber,
    escalation: C.red,
    revenue_action: C.green,
    deploy_action: C.purple,
    status_update: C.muted,
  })[t] || C.muted;

  const resultColor = (r) => r === "success" ? C.green : r === "failed" ? C.red : C.amber;
  const panelStatus = loading ? "loading" : entries?.some(e => e.result === "failed") ? "err" : "ok";

  return (
    <Panel title="Orion Action Log" status={panelStatus} accent={C.purple} minHeight={180} onRetry={load} id="action-log">
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading log…</div>
      ) : entries && entries.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {entries.map((e, i) => (
            <div key={i} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderLeft: `2px solid ${resultColor(e.result)}`,
              borderRadius: 4, padding: "7px 10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <Tag color={typeColor(e.type)}>{(e.type || "—").replace(/_/g, " ").toUpperCase()}</Tag>
                <span style={{ fontSize: 10, color: C.text, flex: 1, fontWeight: 600 }}>{e.title}</span>
                <Tag color={resultColor(e.result)}>{(e.result || "—").toUpperCase()}</Tag>
              </div>
              {e.notes && <div style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>{e.notes}</div>}
              {e.cycle && (
                <div style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace", marginTop: 3 }}>
                  {new Date(e.cycle).toLocaleString()}
                </div>
              )}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
            <Btn small color={C.purple} onClick={load}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
          No actions logged yet.<br />
          <span style={{ color: C.textDim }}>Orion writes here after each 4-hour cycle. Trigger a run from the Make panel to start.</span>
        </div>
      )}
    </Panel>
  );
}
