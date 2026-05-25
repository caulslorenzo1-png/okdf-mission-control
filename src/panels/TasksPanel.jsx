import { useState, useCallback } from "react";
import { C, MCP_NOTION, NOTION_TASKS_DB } from "../config";
import { callClaude, getText, tryJSON } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, SectionLabel, CardRow, Pulse, Tag, Btn } from "../ui";

export function TasksPanel() {
  const refreshKey = useRefreshKey();
  const [tasks, setTasks] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the notion MCP to query the "OKDF Task Command Center" database (${NOTION_TASKS_DB}). Count rows by Status field: "Pending" counts as todo, "In Progress" and "In Review" count as inProgress, "Done" counts as done, "Blocked" counts as overdue. Also find tasks where Due Date is in the past and Status is not Done — add those to overdue. Return JSON: {"total": number, "todo": number, "inProgress": number, "done": number, "overdue": number, "top": [{"title": string, "priority": string, "assignedTo": string}]}. Top should be up to 5 highest priority Pending or In Progress tasks ordered by Priority (P1 first) then Due Date.`,
      [MCP_NOTION]
    );
    const j = tryJSON(getText(data));
    setTasks(j);
    setLoading(false);
  }, []);

  useStaggerLoad(load, refreshKey, 800);

  const panelStatus = loading ? "loading" : tasks?.overdue > 0 ? "err" : "ok";

  return (
    <Panel title="Tasks — Notion" status={panelStatus} accent={C.amber} minHeight={180} onRetry={load} id="tasks">
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading tasks…</div>
      ) : tasks ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[["TODO", tasks.todo, C.amber], ["ACTIVE", tasks.inProgress, C.cyan], ["DONE", tasks.done, C.green], ["OVERDUE", tasks.overdue, C.red]].map(([label, count, color]) => (
              <div key={label} style={{
                textAlign: "center", padding: "8px 4px",
                background: count > 0 ? `${color}10` : C.surface,
                border: `1px solid ${count > 0 ? `${color}30` : C.border}`,
                borderRadius: 5,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: count > 0 ? color : C.muted,
                  fontFamily: "'DM Mono', monospace", fontVariantNumeric: "tabular-nums",
                  textShadow: count > 0 ? `0 0 16px ${color}50` : "none",
                }}>{count ?? "—"}</div>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.14em", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {(tasks.top || []).length > 0 && (
            <>
              <SectionLabel color={C.amber}>Priority Queue</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(tasks.top || []).map((t, i) => (
                  <CardRow key={i}>
                    <Pulse color={t.priority === "High" ? C.red : t.priority === "Medium" ? C.amber : C.muted} size={6} />
                    <span style={{ fontSize: 10, color: C.text, flex: 1, lineHeight: 1.4 }}>{t.title}</span>
                    <Tag color={t.assignedTo === "Orion" ? C.cyan : C.gold}>{t.assignedTo}</Tag>
                  </CardRow>
                ))}
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
            <Btn small color={C.amber} onClick={load}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
          No tasks found.<br />
          <span style={{ color: C.textDim }}>Add rows to the OKDF Task Command Center in Notion with a Status and Priority to see them here.</span>
        </div>
      )}
    </Panel>
  );
}
