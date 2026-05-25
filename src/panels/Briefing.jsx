import { useState, useEffect } from "react";
import { C } from "../config";
import { callClaude, getText, fmtMoney } from "../api";
import { SpinDot, Btn } from "../ui";

export function Briefing({ makeReady, stripeData, netlifyData, orionData }) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const allReady = makeReady && stripeData !== null && netlifyData !== null && orionData !== null;

  useEffect(() => {
    if (allReady && !generated) generateBrief();
  }, [allReady]);

  const generateBrief = async () => {
    setLoading(true);
    setGenerated(true);
    const prompt = `You are Orion Prime briefing Lorenzo, the Director of OKDF.
Data snapshot:
- Orion Prime status: ${orionData?.status || "unknown"}, last decision: ${orionData?.last_decision || "n/a"}, flags: ${orionData?.active_flags || "none"}
- Stripe balance: ${stripeData?.balance?.available?.[0] ? fmtMoney(stripeData.balance.available[0].amount, stripeData.balance.available[0].currency) : "unknown"}, recent payments: ${stripeData?.payments?.length || 0}
- Netlify deploy state: ${netlifyData?.published_deploy?.state || "unknown"}
- Make.com scenarios: Orion Prime CEO Runner (ID 5041624) + Watchdog (ID 5043726) running every 4hrs

Write a sharp 3-sentence Director's briefing. Lead with ops status, flag anything critical, end with one priority action. No fluff. Street-built tone.`;
    const res = await callClaude(prompt);
    setBrief(getText(res));
    setLoading(false);
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.goldDim}30 0%, ${C.surface} 55%)`,
      border: `1px solid ${C.goldDim}80`,
      borderLeft: `3px solid ${C.gold}`,
      borderRadius: 8, padding: "14px 20px", marginBottom: 16,
      boxShadow: `0 0 30px ${C.gold}10, 0 4px 24px #00000050`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700,
          color: C.gold, letterSpacing: "0.22em",
          textShadow: `0 0 16px ${C.gold}60`,
        }}>DIRECTOR'S BRIEFING</div>
        {(loading || !allReady) && <SpinDot />}
        {allReady && !loading && !generated && (
          <Btn small color={C.gold} onClick={generateBrief}>GENERATE</Btn>
        )}
        {generated && !loading && (
          <Btn small color={C.gold} onClick={generateBrief}>REFRESH</Btn>
        )}
        {!allReady && !loading && (
          <span style={{ fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
            Loading data sources…
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
          Orion Prime is compiling your briefing…
        </div>
      ) : brief ? (
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, fontWeight: 400 }}>{brief}</div>
      ) : (
        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
          Briefing auto-generates when all sources finish loading.
        </div>
      )}
    </div>
  );
}
