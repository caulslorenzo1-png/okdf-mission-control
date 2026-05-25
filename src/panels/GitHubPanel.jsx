import { useState, useCallback } from "react";
import { C, GITHUB_REPO } from "../config";
import { timeAgo } from "../api";
import { useRefreshKey, useStaggerLoad } from "../hooks";
import { Panel, TabBar, CardRow, Tag, Btn } from "../ui";

export function GitHubPanel() {
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

  useStaggerLoad(load, refreshKey, 300);

  const panelStatus = loading ? "loading" : commits?.length ? "ok" : "err";

  return (
    <Panel title="GitHub" status={panelStatus} accent={C.text} onRetry={load} id="github">
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
