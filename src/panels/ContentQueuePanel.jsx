import { useState, useCallback } from "react";
import { C, MCP_NOTION, MCP_SLACK, NOTION_CONTENT_DB } from "../config";
import { callClaude, getText } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, CardRow, Tag, Btn } from "../ui";

export function ContentQueuePanel() {
  const refreshKey = useRefreshKey();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(null);
  const [postResult, setPostResult] = useState({});

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const data = await callClaude(
      `Use the notion MCP to query the Content Queue database (${NOTION_CONTENT_DB}) for items where Status is "Draft" or "Scheduled". Return JSON array: [{"id": string, "title": string, "platform": string, "status": string, "scheduledFor": string|null}]. Max 8 items, ordered by ScheduledFor ascending.`,
      [MCP_NOTION]
    );
    const text = getText(data);
    const m = text.match(/\[[\s\S]*?\]/);
    try { setItems(m ? JSON.parse(m[0]) : []); } catch { setItems([]); }
    setLoading(false);
  }, []);

  const postNow = async (item) => {
    setPosting(item.id);
    setPostResult(p => ({ ...p, [item.id]: null }));

    let result;
    if (item.platform === "Slack") {
      const res = await callClaude(
        `Step 1: Use the notion MCP to read page ID "${item.id}" and extract its full body text. Step 2: Use the slack MCP to post that text to channel C0B123W9PMG (#all-okdf-ai-agency). Step 3: Use the notion MCP to update page "${item.id}": set the Status property to "Posted". Confirm all steps briefly.`,
        [MCP_NOTION, MCP_SLACK]
      );
      result = getText(res).slice(0, 180) || "Posted to Slack.";
    } else {
      const res = await callClaude(
        `Use the notion MCP to read page ID "${item.id}" and return only its main body text as plain text, nothing else.`,
        [MCP_NOTION]
      );
      const content = getText(res);
      try {
        await navigator.clipboard.writeText(content);
        result = `Content copied — paste into ${item.platform} to publish.`;
      } catch {
        result = content.slice(0, 140) || "Could not get content.";
      }
    }

    setPostResult(p => ({ ...p, [item.id]: result }));
    setPosting(null);
    setTimeout(fetchQueue, 2500);
  };

  useStaggerLoad(fetchQueue, refreshKey, 2800);

  const platformColor = (p) => ({ X: C.text, WhatsApp: C.green, Slack: C.amber })[p] || C.cyan;
  const panelStatus = loading ? "loading" : items?.length > 0 ? "idle" : "ok";

  return (
    <Panel title="Content Queue" status={panelStatus} accent={C.cyan} minHeight={180} onRetry={fetchQueue} id="content-queue">
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading queue…</div>
      ) : items && items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <CardRow>
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
              {postResult[item.id] && (
                <div style={{
                  fontSize: 9, color: C.cyan, fontFamily: "'DM Mono', monospace",
                  lineHeight: 1.5, paddingLeft: 6, paddingBottom: 2,
                }}>{postResult[item.id]}</div>
              )}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <Btn small color={C.muted} onClick={fetchQueue}>REFRESH</Btn>
          </div>
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
          Queue is empty.<br />
          <span style={{ color: C.textDim }}>Add Draft or Scheduled items to the Content Queue in Notion — set Platform to X, WhatsApp, or Slack.</span>
        </div>
      )}
    </Panel>
  );
}
