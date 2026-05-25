export function getSetting(key, fallback) {
  try {
    const v = localStorage.getItem(`okdf-${key}`);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export const MCP_MAKE    = { type: "url", url: "https://mcp.make.com",                name: "make"    };
export const MCP_STRIPE  = { type: "url", url: "https://mcp.stripe.com",              name: "stripe"  };
export const MCP_NETLIFY = { type: "url", url: "https://netlify-mcp.netlify.app/mcp", name: "netlify" };
export const MCP_NOTION  = { type: "url", url: "https://mcp.notion.com",              name: "notion"  };
export const MCP_SLACK   = { type: "url", url: "https://mcp.slack.com/mcp",           name: "slack"   };

export const NETLIFY_ID        = getSetting("netlify_id",        "d6da9efd-1edf-49ed-b46f-c039a43c0bf2");
export const REVENUE_GOAL      = getSetting("revenue_goal",      500000);
export const GITHUB_REPO       = getSetting("github_repo",       "caulslorenzo1-png/okdf-mission-control");
export const TEAM_ID           = getSetting("team_id",           2037936);
export const ORION_DS_ID       = getSetting("orion_ds_id",       99050);
export const NOTION_TASKS_DB   = getSetting("notion_tasks_db",   "https://www.notion.so/1114b22793b24c499fe2bded313f499e");
export const NOTION_LOG_DB     = getSetting("notion_log_db",     "https://www.notion.so/073023c48c4a48c28599b619d78f3124");
export const NOTION_CONTENT_DB = getSetting("notion_content_db", "https://www.notion.so/775eca33571e41838dff27dfbfefb304");
export const SCENARIOS         = getSetting("scenarios", [
  { id: 5041624, label: "Orion Prime CEO Runner", role: "Every 4hrs — ops review + agent delegation" },
  { id: 5043726, label: "Orion Prime Watchdog",   role: "Every 4hrs — alerts on yellow/red status" },
]);
export const SLACK_CHANNELS    = getSetting("slack_channels", [
  { id: "C0B123W9PMG", name: "all-okdf-ai-agency" },
  { id: "C0B1F0QG1J5", name: "social" },
  { id: "C0B1GEB1M6Z", name: "new-channel" },
]);

export const REFRESH_INTERVAL = 10 * 60;

export const C = {
  bg:           "#04050C",
  surface:      "#090C18",
  panel:        "#0C1020",
  border:       "#182035",
  borderBright: "#253350",
  gold:         "#D4931F",
  goldBright:   "#F0A82A",
  goldDim:      "#5C3F0E",
  green:        "#10B981",
  red:          "#EF4444",
  amber:        "#F59E0B",
  cyan:         "#06B6D4",
  purple:       "#A78BFA",
  text:         "#CBD5E8",
  textDim:      "#6B7FA0",
  muted:        "#3D4F68",
  ghost:        "#1A2238",
  dim:          "#141B2E",
};
