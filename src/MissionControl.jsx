import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const MCP_MAKE    = { type: "url", url: "https://mcp.make.com",                name: "make"    };
const MCP_STRIPE  = { type: "url", url: "https://mcp.stripe.com",              name: "stripe"  };
const MCP_NETLIFY = { type: "url", url: "https://netlify-mcp.netlify.app/mcp", name: "netlify" };
const MCP_NOTION  = { type: "url", url: "https://mcp.notion.com",              name: "notion"  };
const MCP_SLACK   = { type: "url", url: "https://mcp.slack.com/mcp",           name: "slack"   };
const NETLIFY_ID    = "d6da9efd-1edf-49ed-b46f-c039a43c0bf2";
const REVENUE_GOAL  = 500000; // cents — $5,000/mo target
const GITHUB_REPO   = "caulslorenzo1-png/okdf-mission-control";
const TEAM_ID     = 2037936;
const SCENARIOS   = [
  { id: 5041624, label: "Orion Prime CEO Runner", role: "Every 4hrs — ops review + agent delegation" },
  { id: 5043726, label: "Orion Prime Watchdog",   role: "Every 4hrs — alerts on yellow/red status" },
];

const C = {
  bg:           "#050609",
  surface:      "#0B0E18",
  panel:        "#0E1220",
  border:       "#1C2438",
  borderBright: "#2A3555",
  gold:         "#D4931F",
  goldBright:   "#F0A82A",
  goldDim:      "#6B4A10",
  green:        "#1DB954",
  red:          "#E53935",
  amber:        "#F5A623",
  cyan:         "#00BCD4",
  purple:       "#9C6FE4",
  text:         "#C8D4E8",
  textDim:      "#7A8FAA",
  muted:        "#4A5568",
  ghost:        "#1E2740",
  dim:          "#1A2030",
};

// ─── Auto-refresh ─────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 10 * 60; // seconds
const RefreshContext = createContext(0);
const useRefreshKey = () => useContext(RefreshContext);

// ─── API ──────────────────────────────────────────────────────────────────────
async function callClaude(prompt, mcpServers = []) {
  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    };
    if (mcpServers.length) body.mcp_servers = mcpServers;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    return await res.json();
  } catch(e) { return { _err: e.message }; }
}

function getText(d) {
  if (!d || d._err) return d?._err ? `ERR: ${d._err}` : "";
  return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}

function tryJSON(s) {
  try {
    const clean = (s || "").replace(/```[\w]*\n?|```/g, "").trim();
    const m = clean.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

function fmtMoney(cents, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: (currency || "usd").toUpperCase(), minimumFractionDigits: 2
  }).format((cents || 0) / 100);
}

function timeAgo(ts) {
  const d = Math.floor(Date.now() / 1000 - ts);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ─── Micro Components ─────────────────────────────────────────────────────────
function Pulse({ color, size = 8 }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size + 12, height: size + 12, flexShrink: 0, position: "relative",
    }}>
      <span style={{
        position: "absolute", width: "100%", height: "100%", borderRadius: "50%",
        border: `1px solid ${color}`,
        animation: "ripple 2.5s ease-out infinite",
      }} />
      <span style={{
        width: size, height: size, borderRadius: "50%",
        background: color, boxShadow: `0 0 8px ${color}`,
        animation: "glow-pulse 2s ease-in-out infinite",
      }} />
    </span>
  );
}

function SpinDot({ size = 8 }) {
  return (
    <span style={{
      display: "inline-block", width: size + 4, height: size + 4, borderRadius: "50%", flexShrink: 0,
      border: `2px solid ${C.amber}40`, borderTopColor: C.amber,
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700,
      color, background: `${color}18`,
      border: `1px solid ${color}55`, borderRadius: 3,
      padding: "2px 6px", letterSpacing: "0.1em", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Divider({ color }) {
  return <div style={{ height: 1, background: color || C.border, margin: "12px 0", opacity: 0.6 }} />;
}

function SectionLabel({ children, color }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700,
      color: C.muted, letterSpacing: "0.2em", marginBottom: 10,
      textTransform: "uppercase",
      borderLeft: `2px solid ${color || C.border}`,
      paddingLeft: 8,
    }}>{children}</div>
  );
}

function Btn({ children, onClick, color, disabled, small }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov && !disabled ? `${color}22` : "transparent",
        border: `1px solid ${disabled ? C.ghost : hov ? color : `${color}60`}`,
        color: disabled ? C.muted : color,
        fontFamily: "'DM Mono', monospace", fontWeight: 700,
        fontSize: small ? 10 : 11, letterSpacing: "0.12em", textTransform: "uppercase",
        padding: small ? "3px 10px" : "6px 14px", borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        boxShadow: hov && !disabled ? `0 0 14px ${color}40` : "none",
      }}
    >{children}</button>
  );
}

function TabBar({ tabs, active, onChange, color }) {
  return (
    <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          background: active === t ? (color || C.gold) : "transparent",
          border: `1px solid ${active === t ? (color || C.gold) : C.ghost}`,
          color: active === t ? C.bg : C.muted,
          fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.14em", padding: "3px 12px", borderRadius: 3,
          cursor: "pointer", textTransform: "uppercase", transition: "all 0.15s",
        }}>{t}</button>
      ))}
    </div>
  );
}

// ─── Panel Shell ──────────────────────────────────────────────────────────────
function Panel({ title, status, children, accent, minHeight }) {
  const statusColor = status === "ok" ? C.green : status === "err" ? C.red : status === "loading" ? C.amber : C.muted;
  const statusLabel = { ok: "OK", err: "ERR", idle: "IDLE" }[status];
  const ac = accent || C.gold;
  return (
    <div style={{
      background: `linear-gradient(160deg, #101623 0%, ${C.panel} 100%)`,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${ac}`,
      boxShadow: `0 0 28px ${ac}18, 0 8px 40px #00000070`,
      borderRadius: 8, padding: "15px 17px",
      display: "flex", flexDirection: "column", gap: 0,
      minHeight: minHeight || "auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        paddingBottom: 11, marginBottom: 13,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {status === "loading" ? <SpinDot /> : <Pulse color={statusColor} />}
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700,
          color: C.textDim, letterSpacing: "0.18em", textTransform: "uppercase", flex: 1,
        }}>{title}</span>
        {statusLabel && (
          <span style={{
            fontSize: 8, color: statusColor,
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}40`,
            borderRadius: 3, padding: "1px 5px",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
          }}>{statusLabel}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Card Row (used inside panels) ────────────────────────────────────────────
function CardRow({ children, style }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.ghost : C.surface,
        border: `1px solid ${hov ? C.borderBright : C.border}`,
        borderRadius: 5, padding: "9px 11px",
        display: "flex", alignItems: "center", gap: 8,
        transition: "all 0.12s", ...style,
      }}
    >{children}</div>
  );
}

// ─── Make Panel ───────────────────────────────────────────────────────────────
function MakePanel() {
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
    <Panel title="Make.com — Automation" status={panelStatus} accent={C.gold} minHeight={220}>
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

// ─── Orion Prime Memory Panel ─────────────────────────────────────────────────
function OrionMemoryPanel({ onData }) {
  const refreshKey = useRefreshKey();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the make MCP to get a record with key "orion_state" from data store ID 99050 in team ${TEAM_ID}. Return JSON with these fields: last_run, run_count, ops_summary, active_flags, agent_tasks, last_decision, status, metrics, escalations_pending, actions_this_cycle`,
      [MCP_MAKE]
    );
    const j = tryJSON(getText(data));
    setState(j);
    if (onData) onData(j);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const statusColor = state?.status === "green" ? C.green : state?.status === "red" ? C.red : state?.status === "yellow" ? C.amber : C.muted;
  const panelStatus = loading ? "loading" : state?.status === "green" ? "ok" : state?.status === "red" ? "err" : "idle";

  return (
    <Panel title="Orion Prime — Last State" status={panelStatus} accent={C.cyan}>
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

// ─── Stripe Panel ─────────────────────────────────────────────────────────────
function StripePanel({ onData }) {
  const refreshKey = useRefreshKey();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await callClaude(
        `Use the stripe MCP to: 1) get account balance, 2) list last 5 payment intents. Return JSON: {"balance": {"available": [{"amount":number,"currency":string}]}, "payments": [{"id":string,"amount":number,"currency":string,"status":string,"created":number}]}`,
        [MCP_STRIPE]
      );
      const j = tryJSON(getText(res));
      setData(j);
      if (onData) onData(j);
      setLoading(false);
    })();
  }, [refreshKey]);

  const bal = data?.balance?.available?.[0];
  const payments = data?.payments || [];
  const panelStatus = loading ? "loading" : data ? "ok" : "err";

  return (
    <Panel title="Stripe — Revenue" status={panelStatus} accent={C.green}>
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading…</div>
      ) : (
        <>
          {bal && (
            <div style={{
              marginBottom: 14, padding: "12px 14px",
              background: `${C.green}10`, border: `1px solid ${C.green}25`,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 9, color: C.green, fontFamily: "'DM Mono', monospace", marginBottom: 4, letterSpacing: "0.16em", opacity: 0.7 }}>
                AVAILABLE BALANCE
              </div>
              <div style={{
                fontSize: 30, fontFamily: "'DM Mono', monospace", fontWeight: 700,
                color: C.green, fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 24px ${C.green}50`,
              }}>
                {fmtMoney(bal.amount, bal.currency)}
              </div>
            </div>
          )}
          {payments.length > 0 && (
            <>
              <SectionLabel color={C.green}>Recent Payments</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {payments.slice(0, 4).map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 10px",
                    background: C.surface, borderRadius: 4,
                    border: `1px solid ${C.border}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.text, fontFamily: "'DM Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                        {fmtMoney(p.amount, p.currency)}
                      </div>
                      <div style={{ fontSize: 9, color: C.muted }}>{p.created ? timeAgo(p.created) : ""}</div>
                    </div>
                    <Tag color={p.status === "succeeded" ? C.green : C.amber}>{(p.status || "").toUpperCase()}</Tag>
                  </div>
                ))}
              </div>
            </>
          )}
          {!bal && payments.length === 0 && (
            <div style={{ color: C.muted, fontSize: 10 }}>No data — check Stripe connection.</div>
          )}
        </>
      )}
    </Panel>
  );
}

// ─── Revenue Goal Panel ───────────────────────────────────────────────────────
function RevenueGoalPanel() {
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

  useEffect(() => { load(); }, [load, refreshKey]);

  const pct = revenue ? Math.min(100, Math.round((revenue.total_cents / REVENUE_GOAL) * 100)) : 0;
  const color = pct >= 100 ? C.green : pct >= 60 ? C.amber : C.red;
  const panelStatus = loading ? "loading" : revenue ? (pct >= 100 ? "ok" : "idle") : "err";

  return (
    <Panel title="Monthly Revenue Goal" status={panelStatus} accent={C.green}>
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

// ─── Netlify Panel ────────────────────────────────────────────────────────────
function NetlifyPanel({ onData }) {
  const refreshKey = useRefreshKey();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await callClaude(
      `Use the netlify MCP to get the site with ID "${NETLIFY_ID}". Return JSON: {"name":string,"url":string,"deploy_url":string,"published_deploy":{"state":string,"created_at":string},"build_settings":{"repo_url":string}}`,
      [MCP_NETLIFY]
    );
    const j = tryJSON(getText(res));
    setData(j);
    if (onData) onData(j);
    setLoading(false);
  };

  const triggerDeploy = async () => {
    setDeploying(true);
    setDeployMsg("");
    const res = await callClaude(
      `Use the netlify MCP to trigger a new deploy for site ID "${NETLIFY_ID}". Confirm when triggered.`,
      [MCP_NETLIFY]
    );
    setDeployMsg(getText(res).slice(0, 80));
    setDeploying(false);
    setTimeout(load, 3000);
  };

  useEffect(() => { load(); }, [load, refreshKey]);

  const deployState = data?.published_deploy?.state;
  const stateColor = deployState === "ready" ? C.green : deployState ? C.amber : C.muted;
  const panelStatus = loading ? "loading" : deployState === "ready" ? "ok" : deployState ? "err" : "idle";

  return (
    <Panel title="Netlify — Sales Page" status={panelStatus} accent={C.purple}>
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading…</div>
      ) : data ? (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            padding: "8px 10px", background: `${stateColor}10`,
            border: `1px solid ${stateColor}25`, borderRadius: 5,
          }}>
            <Pulse color={stateColor} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{data.name}</div>
              {data.url && (
                <div style={{ fontSize: 9, color: C.purple, fontFamily: "'DM Mono', monospace" }}>↗ {data.url}</div>
              )}
            </div>
            <Tag color={stateColor}>{(deployState || "UNKNOWN").toUpperCase()}</Tag>
          </div>
          {data.published_deploy?.created_at && (
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
              LAST DEPLOY · {new Date(data.published_deploy.created_at).toLocaleString()}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small color={C.purple} disabled={deploying} onClick={triggerDeploy}>
              {deploying ? "DEPLOYING…" : "DEPLOY NOW"}
            </Btn>
            <Btn small color={C.muted} onClick={load}>REFRESH</Btn>
          </div>
          {deployMsg && (
            <div style={{ fontSize: 9, color: C.purple, fontFamily: "'DM Mono', monospace", marginTop: 8, lineHeight: 1.5 }}>{deployMsg}</div>
          )}
        </>
      ) : (
        <div style={{ color: C.muted, fontSize: 10 }}>No deploy data found.</div>
      )}
    </Panel>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel() {
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

  useEffect(() => { load(); }, [load, refreshKey]);

  const panelStatus = loading ? "loading" : data ? "ok" : "idle";

  return (
    <Panel title="Analytics — 7 Days" status={panelStatus} accent={C.cyan}>
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

// ─── AI Briefing ──────────────────────────────────────────────────────────────
function Briefing({ makeReady, stripeData, netlifyData, orionData }) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const allReady = makeReady && stripeData !== null && netlifyData !== null && orionData !== null;

  useEffect(() => {
    if (allReady && !generated) generateBrief();
  }, [allReady]);

  const generateBrief = async () => {
    setLoading(true);
    setGenerated(true);
    const prompt = `You are Orion Prime briefing Lorenzo, the Director of OKDF.
Data snapshot:
- Orion Prime status: ${orionData?.status || "unknown"}, last decision: ${orionData?.last_decision || "n/a"}, flags: ${orionData?.active_flags || "none"}
- Stripe balance: ${stripeData?.balance?.available?.[0] ? fmtMoney(stripeData.balance.available[0].amount, stripeData.balance.available[0].currency) : "unknown"}, recent payments: ${stripeData?.payments?.length || 0}
- Netlify deploy state: ${netlifyData?.published_deploy?.state || "unknown"}
- Make.com scenarios: Orion Prime CEO Runner (ID 5041624) + Watchdog (ID 5043726) running every 4hrs

Write a sharp 3-sentence Director's briefing. Lead with ops status, flag anything critical, end with one priority action. No fluff. Street-built tone.`;
    const res = await callClaude(prompt);
    setBrief(getText(res));
    setLoading(false);
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.goldDim}30 0%, ${C.surface} 55%)`,
      border: `1px solid ${C.goldDim}80`,
      borderLeft: `3px solid ${C.gold}`,
      borderRadius: 8, padding: "14px 20px", marginBottom: 16,
      boxShadow: `0 0 30px ${C.gold}10, 0 4px 24px #00000050`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700,
          color: C.gold, letterSpacing: "0.22em",
          textShadow: `0 0 16px ${C.gold}60`,
        }}>DIRECTOR'S BRIEFING</div>
        {(loading || !allReady) && <SpinDot />}
        {allReady && !loading && !generated && (
          <Btn small color={C.gold} onClick={generateBrief}>GENERATE</Btn>
        )}
        {generated && !loading && (
          <Btn small color={C.gold} onClick={generateBrief}>REFRESH</Btn>
        )}
        {!allReady && !loading && (
          <span style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
            Loading data sources…
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
          Orion Prime is compiling your briefing…
        </div>
      ) : brief ? (
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, fontWeight: 400 }}>{brief}</div>
      ) : (
        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
          Briefing auto-generates when all sources finish loading.
        </div>
      )}
    </div>
  );
}

// ─── Tasks Panel ─────────────────────────────────────────────────────────────
function TasksPanel() {
  const refreshKey = useRefreshKey();
  const [tasks, setTasks] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the notion MCP to query the "OKDF Task Command Center" database (https://www.notion.so/1114b22793b24c499fe2bded313f499e). Count rows by Status field: "Pending" counts as todo, "In Progress" and "In Review" count as inProgress, "Done" counts as done, "Blocked" counts as overdue. Also find tasks where Due Date is in the past and Status is not Done — add those to overdue. Return JSON: {"total": number, "todo": number, "inProgress": number, "done": number, "overdue": number, "top": [{"title": string, "priority": string, "assignedTo": string}]}. Top should be up to 5 highest priority Pending or In Progress tasks ordered by Priority (P1 first) then Due Date.`,
      [MCP_NOTION]
    );
    const j = tryJSON(getText(data));
    setTasks(j);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const panelStatus = loading ? "loading" : tasks?.overdue > 0 ? "err" : "ok";

  return (
    <Panel title="Tasks — Notion" status={panelStatus} accent={C.amber} minHeight={180}>
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
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>No task data. Set up Tasks DB in Notion first.</div>
      )}
    </Panel>
  );
}

// ─── Content Queue Panel ──────────────────────────────────────────────────────
function ContentQueuePanel() {
  const refreshKey = useRefreshKey();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the notion MCP to query the Content Queue database (https://www.notion.so/775eca33571e41838dff27dfbfefb304) for items where Status is "Draft" or "Scheduled". Return JSON array: [{"id": string, "title": string, "platform": string, "status": string, "scheduledFor": string|null}]. Max 8 items, ordered by ScheduledFor ascending.`,
      [MCP_NOTION]
    );
    const text = getText(data);
    const m = text.match(/\[[\s\S]*?\]/);
    try { setItems(m ? JSON.parse(m[0]) : []); } catch { setItems([]); }
    setLoading(false);
  }, []);

  const postNow = async (item) => {
    setPosting(item.id);
    await callClaude(
      `Use the notion MCP to get the full Draft content for the Content Queue item with id "${item.id}". Then post it to ${item.platform} using the appropriate skill (xurl for X/Twitter, wacli for WhatsApp, slack for Slack). Then update the Notion record: set Status to 'Posted' and PostedAt to now.`,
      [MCP_NOTION]
    );
    setPosting(null);
    fetchQueue();
  };

  useEffect(() => { fetchQueue(); }, [fetchQueue, refreshKey]);

  const platformColor = (p) => ({ X: C.text, WhatsApp: C.green, Slack: C.amber })[p] || C.cyan;
  const panelStatus = loading ? "loading" : items?.length > 0 ? "idle" : "ok";

  return (
    <Panel title="Content Queue" status={panelStatus} accent={C.cyan} minHeight={180}>
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading queue…</div>
      ) : items && items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => (
            <CardRow key={item.id}>
              <Tag color={platformColor(item.platform)}>{item.platform}</Tag>
              <span style={{ fontSize: 10, color: C.text, flex: 1, lineHeight: 1.4 }}>{item.title}</span>
              {item.scheduledFor && (
                <span style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
                  {new Date(item.scheduledFor).toLocaleDateString()}
                </span>
              )}
              <Btn small color={C.cyan} disabled={posting === item.id} onClick={() => postNow(item)}>
                {posting === item.id ? "…" : "POST"}
              </Btn>
            </CardRow>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <Btn small color={C.muted} onClick={fetchQueue}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Queue empty — add items to Notion Content Queue.</div>
      )}
    </Panel>
  );
}

// ─── Action Log Panel ─────────────────────────────────────────────────────────
function ActionLogPanel() {
  const refreshKey = useRefreshKey();
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the notion MCP to query the "Orion Action Log" database (https://www.notion.so/073023c48c4a48c28599b619d78f3124). Return the last 10 entries as JSON array: [{"title": string, "type": string, "result": string, "cycle": string, "notes": string}] ordered by Cycle descending.`,
      [MCP_NOTION]
    );
    const text = getText(data);
    const m = text.match(/\[[\s\S]*?\]/);
    try { setEntries(m ? JSON.parse(m[0]) : []); } catch { setEntries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

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
    <Panel title="Orion Action Log" status={panelStatus} accent={C.purple} minHeight={180}>
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
          No actions logged yet.<br />Orion will populate this after first cycle.
        </div>
      )}
    </Panel>
  );
}

// ─── Orion Chat Panel ─────────────────────────────────────────────────────────
const ORION_SYSTEM = `You are Orion, the autonomous AI operations agent for OKDF (Operator Kit for Digital Freedom). You have access to Make.com, Notion, Stripe, Netlify, and Slack via MCP tools. Answer questions about operations concisely, and take actions when instructed.`;

async function callOrion(messages) {
  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: ORION_SYSTEM,
      messages,
      mcp_servers: [MCP_MAKE, MCP_NOTION, MCP_STRIPE, MCP_NETLIFY, MCP_SLACK],
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    return await res.json();
  } catch(e) { return { _err: e.message }; }
}

function OrionChatPanel() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, thinking]);

  const send = async () => {
    if (!input.trim() || thinking) return;
    const userMsg = { role: "user", content: input.trim() };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput("");
    setThinking(true);
    const data = await callOrion(newHistory);
    const reply = getText(data) || (data._err ? `Error: ${data._err}` : "No response.");
    setHistory(h => [...h, { role: "assistant", content: reply }]);
    setThinking(false);
  };

  return (
    <Panel title="Orion — Direct Chat" status={thinking ? "loading" : "ok"} accent={C.cyan}>
      <div ref={scrollRef} style={{
        display: "flex", flexDirection: "column", gap: 6,
        maxHeight: 240, overflowY: "auto", marginBottom: 10, minHeight: 60,
      }}>
        {history.length === 0 && !thinking ? (
          <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
            Send instructions or ask Orion anything…
          </div>
        ) : history.map((msg, i) => (
          <div key={i} style={{
            padding: "6px 10px", borderRadius: 5,
            background: msg.role === "user" ? `${C.cyan}12` : C.surface,
            border: `1px solid ${msg.role === "user" ? `${C.cyan}30` : C.border}`,
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "90%",
          }}>
            <div style={{ fontSize: 8, color: msg.role === "user" ? C.cyan : C.gold, fontFamily: "'DM Mono', monospace", marginBottom: 2, fontWeight: 600 }}>
              {msg.role === "user" ? "YOU" : "ORION"}
            </div>
            <div style={{ fontSize: 10, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{
            padding: "6px 10px", borderRadius: 5,
            background: C.surface, border: `1px solid ${C.border}`, alignSelf: "flex-start",
          }}>
            <div style={{ fontSize: 8, color: C.gold, fontFamily: "'DM Mono', monospace", marginBottom: 2, fontWeight: 600 }}>ORION</div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>Thinking…</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Instruct Orion…"
          disabled={thinking}
          style={{
            flex: 1, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 5, padding: "6px 10px",
            color: C.text, fontSize: 10, fontFamily: "'DM Mono', monospace", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = C.cyan}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <Btn small color={C.cyan} disabled={thinking || !input.trim()} onClick={send}>
          {thinking ? "…" : "SEND"}
        </Btn>
      </div>
      {history.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <Btn small color={C.muted} onClick={() => setHistory([])}>CLEAR</Btn>
        </div>
      )}
    </Panel>
  );
}

// ─── GitHub Panel ─────────────────────────────────────────────────────────────
function GitHubPanel() {
  const refreshKey = useRefreshKey();
  const [commits, setCommits] = useState(null);
  const [prs, setPRs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("commits");

  const load = useCallback(async () => {
    setLoading(true);
    const [commitsRes, prsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=6`).then(r => r.json()).catch(() => []),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=10`).then(r => r.json()).catch(() => []),
    ]);
    setCommits(Array.isArray(commitsRes) ? commitsRes : []);
    setPRs(Array.isArray(prsRes) ? prsRes : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const panelStatus = loading ? "loading" : commits?.length ? "ok" : "err";

  return (
    <Panel title="GitHub" status={panelStatus} accent={C.text}>
      <TabBar tabs={["commits", "prs"]} active={tab} onChange={setTab} color={C.textDim} />
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>Loading…</div>
      ) : tab === "commits" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
          {(commits || []).map((c, i) => (
            <div key={i} style={{
              padding: "6px 8px", background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 5,
            }}>
              <div style={{ fontSize: 10, color: C.text, lineHeight: 1.4, marginBottom: 2 }}>
                {c.commit?.message?.split("\n")[0] || "—"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{c.sha?.slice(0, 7)}</span>
                <span style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
                  {c.commit?.author?.date ? timeAgo(new Date(c.commit.author.date).getTime() / 1000) : ""}
                </span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
            <Btn small color={C.muted} onClick={load}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
          {prs && prs.length > 0 ? prs.map((pr, i) => (
            <CardRow key={i}>
              <Tag color={C.green}>#{pr.number}</Tag>
              <span style={{ fontSize: 10, color: C.text, flex: 1 }}>{pr.title}</span>
              <span style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
                {pr.created_at ? timeAgo(new Date(pr.created_at).getTime() / 1000) : ""}
              </span>
            </CardRow>
          )) : (
            <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>No open PRs.</div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
            <Btn small color={C.muted} onClick={load}>REFRESH</Btn>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ─── Slack Panel ──────────────────────────────────────────────────────────────
const SLACK_CHANNELS = [
  { id: "C0B123W9PMG", name: "all-okdf-ai-agency" },
  { id: "C0B1F0QG1J5", name: "social" },
  { id: "C0B1GEB1M6Z", name: "new-channel" },
];

function SlackPanel() {
  const refreshKey = useRefreshKey();
  const [activeChannel, setActiveChannel] = useState(SLACK_CHANNELS[0]);
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendInput, setSendInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");

  const loadMessages = useCallback(async (channel) => {
    setLoading(true);
    setMessages(null);
    const data = await callClaude(
      `Use the slack MCP to read the last 8 messages from channel ${channel.id} (#${channel.name}). Return a JSON array (newest first): [{"user": string, "text": string, "ts": string}].`,
      [MCP_SLACK]
    );
    const text = getText(data);
    const m = text.match(/\[[\s\S]*?\]/);
    try { setMessages(m ? JSON.parse(m[0]) : []); } catch { setMessages([]); }
    setLoading(false);
  }, []);

  const sendMessage = async () => {
    if (!sendInput.trim()) return;
    setSending(true);
    setSendStatus("");
    const msg = sendInput;
    setSendInput("");
    await callClaude(
      `Use the slack MCP to post this exact message to channel ${activeChannel.id} (#${activeChannel.name}): ${JSON.stringify(msg)}`,
      [MCP_SLACK]
    );
    setSending(false);
    setSendStatus("Sent!");
    setTimeout(() => setSendStatus(""), 3000);
    loadMessages(activeChannel);
  };

  useEffect(() => { loadMessages(activeChannel); }, [activeChannel, loadMessages, refreshKey]);

  const panelStatus = loading ? "loading" : messages === null ? "err" : "ok";

  return (
    <Panel title="Slack" status={panelStatus} accent={C.purple}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
        {SLACK_CHANNELS.map(ch => (
          <button key={ch.id} onClick={() => setActiveChannel(ch)} style={{
            padding: "3px 8px", fontSize: 9, borderRadius: 4, cursor: "pointer",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
            background: activeChannel.id === ch.id ? `${C.purple}25` : C.surface,
            border: `1px solid ${activeChannel.id === ch.id ? C.purple : C.border}`,
            color: activeChannel.id === ch.id ? C.purple : C.muted,
            transition: "all 0.15s",
          }}>#{ch.name}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <Btn small color={C.purple} onClick={() => loadMessages(activeChannel)}>REFRESH</Btn>
        </div>
      </div>

      <div style={{
        display: "flex", flexDirection: "column", gap: 5, marginBottom: 10,
        minHeight: 100, maxHeight: 200, overflowY: "auto",
      }}>
        {loading ? (
          <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading messages…</div>
        ) : messages && messages.length > 0 ? messages.map((msg, i) => (
          <div key={i} style={{
            padding: "6px 8px",
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: C.purple, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                {msg.user || "unknown"}
              </span>
              {msg.ts && (
                <span style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
                  {timeAgo(parseFloat(msg.ts))}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.text, lineHeight: 1.5 }}>{msg.text}</div>
          </div>
        )) : (
          <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
            {messages === null ? "Failed to load — check Slack MCP connection." : "No messages yet."}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={sendInput}
          onChange={e => setSendInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !sending && sendMessage()}
          placeholder={`Message #${activeChannel.name}…`}
          style={{
            flex: 1, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 5, padding: "6px 10px",
            color: C.text, fontSize: 10, fontFamily: "'DM Mono', monospace",
            outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = C.purple}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <Btn small color={C.purple} disabled={sending || !sendInput.trim()} onClick={sendMessage}>
          {sending ? "…" : "SEND"}
        </Btn>
      </div>
      {sendStatus && (
        <div style={{ fontSize: 9, color: C.green, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
          ✓ {sendStatus}
        </div>
      )}
    </Panel>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ countdown }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: 20, paddingBottom: 18,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <span style={{
            fontSize: 30, fontFamily: "'DM Mono', monospace", fontWeight: 700,
            color: C.gold, letterSpacing: "0.05em",
            textShadow: `0 0 40px ${C.gold}55`,
          }}>OKDF</span>
          <span style={{
            fontSize: 18, fontFamily: "'DM Mono', monospace", fontWeight: 300,
            color: C.text, letterSpacing: "0.06em", opacity: 0.55,
          }}>MISSION CONTROL</span>
        </div>
        <div style={{
          fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.26em",
        }}>
          OPERATOR KIT FOR DIGITAL FREEDOM — v3.0
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 30, fontFamily: "'DM Mono', monospace", fontWeight: 700,
          color: C.text, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}>
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </div>
        <div style={{
          fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.14em", marginTop: 5,
        }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </div>
        <div style={{
          fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.12em", marginTop: 4, opacity: 0.6,
        }}>
          REFRESH IN {mm}:{ss}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [makeReady, setMakeReady] = useState(false);
  const [stripeData, setStripeData] = useState(null);
  const [netlifyData, setNetlifyData] = useState(null);
  const [orionData, setOrionData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  useEffect(() => {
    const t = setTimeout(() => setMakeReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { setRefreshKey(k => k + 1); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <RefreshContext.Provider value={refreshKey}>
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: ${C.bg};
          background-image: radial-gradient(${C.border}70 1px, transparent 1px);
          background-size: 28px 28px;
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes ripple {
          0%   { transform: scale(0.5); opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.ghost}; border-radius: 2px; }
        ::placeholder { color: ${C.muted}; opacity: 0.6; }
      `}</style>

      {/* Ambient top glow */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 320,
        background: `radial-gradient(ellipse 70% 100% at 50% -10%, ${C.goldDim}20 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh", padding: "24px 24px",
        fontFamily: "'DM Mono', monospace", color: C.text,
      }}>
        <Header countdown={countdown} />
        <Briefing
          makeReady={makeReady}
          stripeData={stripeData}
          netlifyData={netlifyData}
          orionData={orionData}
        />

        {/* 3-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <MakePanel />
            <GitHubPanel />
            <SlackPanel />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <OrionMemoryPanel onData={setOrionData} />
            <TasksPanel />
            <ActionLogPanel />
            <OrionChatPanel />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <StripePanel onData={setStripeData} />
            <RevenueGoalPanel />
            <NetlifyPanel onData={setNetlifyData} />
            <AnalyticsPanel />
            <ContentQueuePanel />
          </div>
        </div>
      </div>
    </>
    </RefreshContext.Provider>
  );
}
