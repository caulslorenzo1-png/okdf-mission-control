import { useState } from "react";
import { C, MCP_NETLIFY, NETLIFY_ID } from "../config";
import { callClaude, getText, tryJSON } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, Pulse, Tag, Btn } from "../ui";

export function NetlifyPanel({ onData }) {
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

  useStaggerLoad(load, refreshKey, 1400);

  const deployState = data?.published_deploy?.state;
  const FAIL_STATES  = ["error", "failed"];
  const BUILD_STATES = ["building", "processing", "enqueued", "new"];
  const stateColor  = deployState === "ready"              ? C.green
                    : FAIL_STATES.includes(deployState)    ? C.red
                    : BUILD_STATES.includes(deployState)   ? C.amber
                    : deployState                          ? C.amber
                    : C.muted;
  const panelStatus = loading                              ? "loading"
                    : deployState === "ready"              ? "ok"
                    : FAIL_STATES.includes(deployState)    ? "err"
                    : BUILD_STATES.includes(deployState)   ? "loading"
                    : deployState                          ? "err"
                    : "idle";

  return (
    <Panel title="Netlify — Sales Page" status={panelStatus} accent={C.purple} onRetry={load} id="netlify">
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
