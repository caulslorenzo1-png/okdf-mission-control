import { useState, useEffect, useCallback } from "react";
import { C, MCP_SLACK, SLACK_CHANNELS } from "../config";
import { callClaude, getText, timeAgo } from "../api";
import { useRefreshKey } from "../hooks";
import { Panel, Btn } from "../ui";

export function SlackPanel() {
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
    <Panel title="Slack" status={panelStatus} accent={C.purple} id="slack">
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
            {messages === null
              ? "Failed to load — check Slack is connected in claude.ai Settings → Integrations."
              : "No messages in this channel yet."}
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
