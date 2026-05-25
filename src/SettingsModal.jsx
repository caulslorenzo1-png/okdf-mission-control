import { useState } from "react";
import { C, TEAM_ID, ORION_DS_ID, SCENARIOS, NETLIFY_ID, REVENUE_GOAL, GITHUB_REPO, NOTION_TASKS_DB, NOTION_LOG_DB, NOTION_CONTENT_DB, SLACK_CHANNELS } from "./config";
import { Btn } from "./ui";

export function SettingsModal({ onClose }) {
  const sc = SCENARIOS[0] || {};
  const sc2 = SCENARIOS[1] || {};
  const [v, setV] = useState({
    team_id:           String(TEAM_ID),
    orion_ds_id:       String(ORION_DS_ID),
    s1_id:             String(sc.id || ""),
    s1_label:          sc.label || "",
    s1_role:           sc.role || "",
    s2_id:             String(sc2.id || ""),
    s2_label:          sc2.label || "",
    s2_role:           sc2.role || "",
    netlify_id:        NETLIFY_ID,
    revenue_goal:      String(REVENUE_GOAL / 100),
    github_repo:       GITHUB_REPO,
    notion_tasks_db:   NOTION_TASKS_DB,
    notion_log_db:     NOTION_LOG_DB,
    notion_content_db: NOTION_CONTENT_DB,
    slack_channels:    SLACK_CHANNELS.map(c => `${c.id} ${c.name}`).join("\n"),
  });

  const set = (k) => (e) => setV(p => ({ ...p, [k]: e.target.value }));

  const save = () => {
    try {
      const put = (k, val) => localStorage.setItem(`okdf-${k}`, JSON.stringify(val));
      put("team_id",           Number(v.team_id));
      put("orion_ds_id",       Number(v.orion_ds_id));
      put("netlify_id",        v.netlify_id.trim());
      put("revenue_goal",      Math.round(parseFloat(v.revenue_goal || 0) * 100));
      put("github_repo",       v.github_repo.trim());
      put("notion_tasks_db",   v.notion_tasks_db.trim());
      put("notion_log_db",     v.notion_log_db.trim());
      put("notion_content_db", v.notion_content_db.trim());
      put("scenarios", [
        { id: Number(v.s1_id), label: v.s1_label, role: v.s1_role },
        { id: Number(v.s2_id), label: v.s2_label, role: v.s2_role },
      ].filter(s => s.id));
      put("slack_channels", v.slack_channels.split("\n")
        .map(l => { const [id, ...rest] = l.trim().split(" "); return { id, name: rest.join(" ").replace(/^#/, "") }; })
        .filter(c => c.id));
      window.location.reload();
    } catch(e) { alert("Save failed: " + e.message); }
  };

  const reset = () => {
    if (!confirm("Reset all settings to defaults?")) return;
    Object.keys(localStorage).filter(k => k.startsWith("okdf-")).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const inputStyle = {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 4, padding: "5px 8px", color: C.text,
    fontSize: 10, fontFamily: "'DM Mono', monospace", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.16em", textTransform: "uppercase", display: "block", marginBottom: 4,
  };
  const Field = ({ label, k, placeholder, wide }) => (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined }}>
      <label style={labelStyle}>{label}</label>
      <input value={v[k]} onChange={set(k)} placeholder={placeholder}
        style={{ ...inputStyle }} onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = C.border} />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000090", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.panel, border: `1px solid ${C.borderBright}`,
        borderTop: `2px solid ${C.gold}`, borderRadius: 12,
        padding: "24px 28px", width: "min(700px, 95vw)",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: `0 0 60px #00000090, 0 0 40px ${C.gold}08`,
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: C.gold, letterSpacing: "0.2em", flex: 1 }}>CONFIGURATION</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: C.cyan, fontFamily: "'DM Mono', monospace", letterSpacing: "0.18em", marginBottom: 10, borderLeft: `2px solid ${C.cyan}`, paddingLeft: 8 }}>MAKE.COM</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Team ID" k="team_id" placeholder="2037936" />
              <Field label="Orion Data Store ID" k="orion_ds_id" placeholder="99050" />
              <Field label="Scenario 1 ID" k="s1_id" placeholder="5041624" />
              <Field label="Scenario 1 Label" k="s1_label" placeholder="CEO Runner" />
              <Field label="Scenario 2 ID" k="s2_id" placeholder="5043726" />
              <Field label="Scenario 2 Label" k="s2_label" placeholder="Watchdog" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: C.amber, fontFamily: "'DM Mono', monospace", letterSpacing: "0.18em", marginBottom: 10, borderLeft: `2px solid ${C.amber}`, paddingLeft: 8 }}>NOTION</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <Field label="Tasks DB URL" k="notion_tasks_db" placeholder="https://www.notion.so/..." wide />
              <Field label="Action Log DB URL" k="notion_log_db" placeholder="https://www.notion.so/..." wide />
              <Field label="Content Queue DB URL" k="notion_content_db" placeholder="https://www.notion.so/..." wide />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: C.green, fontFamily: "'DM Mono', monospace", letterSpacing: "0.18em", marginBottom: 10, borderLeft: `2px solid ${C.green}`, paddingLeft: 8 }}>STRIPE + REVENUE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Monthly Revenue Goal ($)" k="revenue_goal" placeholder="5000" />
              <div />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: C.purple, fontFamily: "'DM Mono', monospace", letterSpacing: "0.18em", marginBottom: 10, borderLeft: `2px solid ${C.purple}`, paddingLeft: 8 }}>NETLIFY + GITHUB</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Netlify Site ID" k="netlify_id" placeholder="d6da9efd-..." />
              <Field label="GitHub Repo (owner/repo)" k="github_repo" placeholder="yourname/repo" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: C.purple, fontFamily: "'DM Mono', monospace", letterSpacing: "0.18em", marginBottom: 10, borderLeft: `2px solid ${C.purple}`, paddingLeft: 8 }}>SLACK CHANNELS</div>
            <label style={labelStyle}>One per line: CHANNEL_ID channel-name</label>
            <textarea
              value={v.slack_channels} onChange={set("slack_channels")}
              rows={3} placeholder={"C0B123W9PMG all-okdf-ai-agency\nC0B1F0QG1J5 social"}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={e => e.target.style.borderColor = C.gold}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn small color={C.muted} onClick={reset}>RESET TO DEFAULTS</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small color={C.muted} onClick={onClose}>CANCEL</Btn>
            <Btn small color={C.gold} onClick={save}>SAVE + RELOAD</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
