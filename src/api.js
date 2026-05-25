import { MCP_MAKE, MCP_NOTION, MCP_STRIPE, MCP_NETLIFY, MCP_SLACK } from "./config";

export async function callClaude(prompt, mcpServers = []) {
  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    };
    if (mcpServers.length) body.mcp_servers = mcpServers;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    return await res.json();
  } catch(e) { return { _err: e.message }; }
}

export function getText(d) {
  if (!d || d._err) return d?._err ? `ERR: ${d._err}` : "";
  return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}

export function tryJSON(s) {
  try {
    const clean = (s || "").replace(/```[\w]*\n?|```/g, "").trim();
    const m = clean.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

export function notify(title, body) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}

export function fmtMoney(cents, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: (currency || "usd").toUpperCase(), minimumFractionDigits: 2
  }).format((cents || 0) / 100);
}

export function timeAgo(ts) {
  const d = Math.floor(Date.now() / 1000 - ts);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export const ORION_SYSTEM = `You are Orion, the autonomous AI operations agent for OKDF (Operator Kit for Digital Freedom). You have access to Make.com, Notion, Stripe, Netlify, and Slack via MCP tools. Answer questions about operations concisely, and take actions when instructed.`;

export async function callOrion(messages) {
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
      credentials: "include",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    return await res.json();
  } catch(e) { return { _err: e.message }; }
}
