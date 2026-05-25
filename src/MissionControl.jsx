import { useState, useEffect, useRef } from "react";
import { C, REFRESH_INTERVAL } from "./config";
import { fmtMoney, notify } from "./api";
import { RefreshContext } from "./hooks";
import { Header } from "./Header";
import { SettingsModal } from "./SettingsModal";
import { Briefing } from "./panels/Briefing";
import { MakePanel } from "./panels/MakePanel";
import { OrionMemoryPanel } from "./panels/OrionMemoryPanel";
import { StripePanel } from "./panels/StripePanel";
import { RevenueGoalPanel } from "./panels/RevenueGoalPanel";
import { NetlifyPanel } from "./panels/NetlifyPanel";
import { AnalyticsPanel } from "./panels/AnalyticsPanel";
import { TasksPanel } from "./panels/TasksPanel";
import { ContentQueuePanel } from "./panels/ContentQueuePanel";
import { ActionLogPanel } from "./panels/ActionLogPanel";
import { OrionChatPanel } from "./panels/OrionChatPanel";
import { GitHubPanel } from "./panels/GitHubPanel";
import { SlackPanel } from "./panels/SlackPanel";

export default function App() {
  const [makeReady, setMakeReady] = useState(false);
  const [stripeData, setStripeData] = useState(null);
  const [netlifyData, setNetlifyData] = useState(null);
  const [orionData, setOrionData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [showSettings, setShowSettings] = useState(false);

  const prevOrionStatus = useRef(null);
  const prevPaymentIds = useRef(new Set());

  const enableNotifs = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  useEffect(() => {
    if (!orionData?.status) return;
    const prev = prevOrionStatus.current;
    const curr = orionData.status;
    if (prev !== null && prev !== curr && (curr === "red" || curr === "yellow")) {
      notify(
        `Orion Prime — ${curr.toUpperCase()}`,
        orionData.ops_summary || orionData.last_decision || "Status changed."
      );
    }
    prevOrionStatus.current = curr;
  }, [orionData]);

  useEffect(() => {
    if (!stripeData?.payments?.length) return;
    const known = prevPaymentIds.current;
    const newPayments = stripeData.payments.filter(p => !known.has(p.id));
    if (known.size > 0 && newPayments.length > 0) {
      newPayments.forEach(p => notify(
        `Payment received — ${fmtMoney(p.amount, p.currency)}`,
        `Status: ${p.status}`
      ));
    }
    stripeData.payments.forEach(p => known.add(p.id));
  }, [stripeData]);

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
        setRefreshKey(k => k + 1);
        setCountdown(REFRESH_INTERVAL);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <RefreshContext.Provider value={refreshKey}>
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: ${C.bg};
          background-image: radial-gradient(${C.border}50 1px, transparent 1px);
          background-size: 24px 24px;
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ripple {
          0%   { transform: scale(0.5); opacity: 0.6; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.borderBright}; }
        ::placeholder { color: ${C.muted}; opacity: 0.5; }
        input, textarea, button { font-family: inherit; }
      `}</style>

      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 400,
        background: `radial-gradient(ellipse 80% 100% at 50% -15%, ${C.goldDim}28 0%, transparent 65%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 120,
        background: `linear-gradient(90deg, ${C.bg}90 0%, transparent 100%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 120,
        background: `linear-gradient(270deg, ${C.bg}90 0%, transparent 100%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh", padding: "24px 24px",
        fontFamily: "'DM Mono', monospace", color: C.text,
      }}>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        <Header countdown={countdown} notifPerm={notifPerm} onEnableNotifs={enableNotifs} onOpenSettings={() => setShowSettings(true)} />
        <Briefing makeReady={makeReady} stripeData={stripeData} netlifyData={netlifyData} orionData={orionData} />

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
