# Orion Prime — Setup Checklist

Complete these steps in order before Orion goes live.

---

## 1. Make.com — CEO Runner Scenario (ID 5041624)

1. Open the scenario in Make.com
2. Find the Claude (Anthropic) HTTP module
3. Paste the full contents of `ceo-runner-prompt.md` as the system prompt
4. Set model: `claude-sonnet-4-6`
5. Set max tokens: `4000`
6. Add MCP servers in the request body:
   - make: `https://mcp.make.com`
   - stripe: `https://mcp.stripe.com`
   - notion: `https://mcp.notion.com`
   - netlify: `https://netlify-mcp.netlify.app/mcp`
7. Confirm the scenario runs on a 4-hour schedule
8. Save and activate

---

## 2. Make.com — Watchdog Scenario (ID 5043726)

1. Open the scenario in Make.com
2. Paste `watchdog-prompt.md` as the system prompt
3. Set model: `claude-sonnet-4-6`
4. Set max tokens: `1000`
5. Add MCP servers: make, stripe, netlify
6. Set schedule: 4 hours, offset by 2 hours from CEO Runner (so they alternate)
7. Save and activate

---

## 3. Make.com — Data Store

1. Go to Data Stores → ID 99050
2. Find or create the record with key: `orion_state`
3. Paste the initial value from `state-schema.json`
4. Save

---

## 4. Notion — Orion Action Log Database

Create a new database in Notion with these properties:

| Property | Type | Notes |
|---|---|---|
| Title | Title | One-line action summary |
| Type | Select | Options: content_post, task_create, task_update, escalation, revenue_action, deploy_action, status_update |
| Result | Select | Options: success, failed, pending |
| Cycle | Date | ISO timestamp of when the action was taken |
| Notes | Text | Context, amounts, IDs |

After creating it, copy the database URL and update the ActionLogPanel query in `MissionControl.jsx` with the actual database URL (replace the search-by-name approach with the direct URL).

---

## 5. Slack Integration

Make sure the Orion Prime Make.com scenarios have access to a Slack connection that can post to your ops channel. The CEO Runner will post escalations there.

Recommended channel: `#orion-ops` or `#alerts`

---

## 6. Stripe Permissions

The Stripe MCP connection used by Orion must have:
- ✅ Read: Balance, Payment Intents, Customers, Disputes
- ✅ Write: Payment Links, Products, Metadata
- ❌ Do NOT enable: Delete, Refunds (Orion does not issue refunds autonomously)

---

## 7. First Run

1. Trigger the CEO Runner manually (RUN NOW from the dashboard)
2. Watch the dashboard — OrionMemoryPanel should populate within 60 seconds
3. Check the Action Log panel for the first cycle entry
4. Check Slack for any escalations

If `orion_state.status` shows green and `run_count` = 1, Orion is live.

---

## 8. Ongoing

- Orion runs every 4 hours automatically
- Check the dashboard daily — the Director's Briefing auto-generates from real data
- Resolve Slack escalations promptly; Orion tracks `escalations_pending` and the Watchdog will re-alert after 8h
- If you want Orion to take a new kind of action, update the CEO Runner system prompt and redeploy the scenario
