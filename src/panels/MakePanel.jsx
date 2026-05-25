import { useState, useEffect, useCallback } from "react";
import { C, MCP_MAKE, SCENARIOS, TEAM_ID } from "../config";
import { callClaude, getText, tryJSON } from "../api";
import { useRefreshKey } from "../hooks";
import { Panel, TabBar, SpinDot, Pulse, Tag, Btn, CardRow } from "../ui";

export function MakePanel() {
  const refreshKey = useRefreshKey();
  const [tab, setTab] = useState("scenarios");
  const [scenarioStates, setScenarioStates] = useState({});
  const [connectors, setConnectors] = useState(null);
  const [loadingConn, setLoadingConn] = useState(false);

  const fetchScenarioStatus = useCallback(async (id) => {
    setScenarioStates(p => ({ ...p, [id]: { ...p[id], loading: true } }));
    const data = await callClaude(
      `Use the make MCP to get scenario ${id} details. Return JSON: {"isActive": bool, "name": string, "lastEdit": string, "nextExec": string|null, "errors": number}`,
      [MCP_MAKE]
    );
    const j = tryJSON(getText(data));
    setScenarioStates(p => ({
      ...p,
      [id]: { loading: false, active: j?.isActive ?? null, nextExec: j?.nextExec, errors: j?.errors ?? 0, raw: j }
    }));
  }, []);

  const toggleScenario = async (id, currentlyActive) => {
    setScenarioStates(p => ({ ...p, [id]: { ...p[id], loading: true } }));
    const action = currentlyActive ? "deactivate" : "activate";
    await callClaude(`Use the make MCP to ${action} scenario with id ${id}.`, [MCP_MAKE]);
    setTimeout(() => fetchScenarioStatus(id), 1200);
  };

  const runScenario = async (id) => {
    setScenarioStates(p => ({ ...p, [id]: { ...p[id], loading: true } }));
    await callClaude(`Use the make MCP to run scenario ${id} once.`, [MCP_MAKE]);
    setTimeout(() => fetchScenarioStatus(id), 2000);
  };

  const fetchConnectors = async () => {
    setLoadingConn(true);
    const data = await callClaude(
      `Use the make MCP to list all connections for team ${TEAM_ID}. Return JSON array: [{"id": number, "name": string, "accountName": string, "accountType": string}]`,
      [MCP_MAKE]
    );
    const text = getText(data);
    const m = text.match(/\[[\s\S]*?\]/);
    try { setConnectors(m ? JSON.parse(m[0]) : []); }
    catch { setConnectors([]); }
    setLoadingConn(false);
  };

  useEffect(() => { SCENARIOS.forEach(s => fetchScenarioStatus(s.id)); }, [fetchScenarioStatus, refreshKey]);
  useEffect(() => { if (tab === "connectors" && !connectors) fetchConnectors(); }, [tab]);

  const allLoaded = SCENARIOS.every(s => scenarioStates[s.id] && !scenarioStates[s.id].loading);
  const anyError = SCENARIOS.some(s => scenarioStates[s.id]?.errors > 0);
  const panelStatus = !allLoaded ? "loading" : anyError ? "err" : "ok";

  return (
    <Panel title="Make.com — Automation" status={panelStatus} accent={C.gold} minHeight={220} id="make">
      <TabBar tabs={["scenarios", "connectors"]} active={tab} onChange={setTab} color={C.gold} />

      {tab === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SCENARIOS.map(s => {
            const st = scenarioStates[s.id] || {};
            const activeColor = st.active === true ? C.green : st.active === false ? C.red : C.muted;
            return (
              <div key={s.id} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderLeft: `2px solid ${activeColor}`,
                borderRadius: 5, padding: "10px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {st.loading ? <SpinDot /> : <Pulse color={activeColor} />}
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 600, flex: 1 }}>{s.label}</span>
                  <Tag color={activeColor}>{st.active ? "ACTIVE" : st.active === false ? "OFF" : "—"}</Tag>
                </div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>
                  {s.role}
                </div>
                {st.nextExec && (
                  <div style={{ fontSize: 9, color: C.cyan, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>
                    NEXT → {new Date(st.nextExec).toLocaleTimeString()}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn small color={st.active ? C.red : C.green} disabled={st.loading}
                    onClick={() => toggleScenario(s.id, st.active)}>
                    {st.active ? "PAUSE" : "ACTIVATE"}
                  </Btn>
                  <Btn small color={C.amber} disabled={st.loading} onClick={() => runScenario(s.id)}>
                    RUN NOW
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "connectors" && (
        <div>
          {loadingConn ? (
            <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Fetching connections…</div>
          ) : connectors ? (
            connectors.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 10 }}>No connections found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {connectors.map((c, i) => (
                  <CardRow key={i}>
                    <Pulse color={C.green} />
                    <div>
                      <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
                        {c.accountName} · {c.accountType}
                      </div>
                    </div>
                  </CardRow>
                ))}
              </div>
            )
          ) : null}
        </div>
      )}
    </Panel>
  );
}
