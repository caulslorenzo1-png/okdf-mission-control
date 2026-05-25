import { useState, useEffect, useRef } from "react";
import { C, TEAM_ID, SCENARIOS, NOTION_TASKS_DB, NOTION_LOG_DB, NOTION_CONTENT_DB, NETLIFY_ID } from "../config";
import { callOrion, getText } from "../api";
import { Panel, Btn } from "../ui";

export function OrionChatPanel() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("orion-chat") || "[]"); }
    catch { return []; }
  });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("orion-chat", JSON.stringify(history)); }
    catch {}
  }, [history]);

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
    <Panel title="Orion — Direct Chat" status={thinking ? "loading" : "ok"} accent={C.cyan} id="orion-chat">
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

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {[
          ["PANEL HEALTH", `Check the health of all integrations. Test: Make.com (team ${TEAM_ID}, scenarios ${SCENARIOS.map(s=>s.id).join(" and ")}), Stripe (balance + recent payments), Netlify (site ${NETLIFY_ID}), Notion (Tasks DB at ${NOTION_TASKS_DB}, Action Log at ${NOTION_LOG_DB}, Content Queue at ${NOTION_CONTENT_DB}), and Slack (list channels). For each report: CONNECTED, EMPTY (connected but no data), or ERROR. Give a clean summary.`],
          ["POSITIONING AUDIT", `Act as a B2B SaaS positioning consultant. I'm building OKDF Mission Control — a real-time ops dashboard for solo operators running AI agent systems. It connects Make.com, Stripe, Netlify, Notion, and Slack, and lets you monitor and direct an autonomous AI agent (Orion Prime) from one screen. Tell me: 1) Ideal customer (specific — role, stack, business stage), 2) One-sentence problem statement, 3) One-sentence value prop, 4) Strongest differentiator, 5) What's missing that this audience would expect. Be direct.`],
          ["FEATURE AUDIT", `Act as a solo AI agency operator who uses Make.com to automate client work, earns via Stripe, deploys on Netlify, manages in Notion. Audit these dashboard features: Make scenario controls, Orion memory state, Stripe revenue + payments, Netlify deploy status, GitHub commits, Slack messages, Notion tasks + action log + content queue, Revenue goal tracker, Analytics, Orion direct chat, Browser notifications, Panel collapse, Auto-refresh. For each category rate: DAILY USE / OCCASIONAL / CUT IT. Be honest.`],
        ].map(([label, prompt]) => (
          <button key={label} onClick={() => setInput(prompt)} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 4, padding: "3px 8px", cursor: "pointer",
            fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.1em", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.target.style.borderColor = C.cyan; e.target.style.color = C.cyan; }}
          onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}>
            {label}
          </button>
        ))}
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
          <Btn small color={C.muted} onClick={() => {
            setHistory([]);
            try { localStorage.removeItem("orion-chat"); } catch {}
          }}>CLEAR</Btn>
        </div>
      )}
    </Panel>
  );
}
