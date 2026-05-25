import { useState, useEffect, useCallback, useRef } from "react";
import { C, MCP_STRIPE } from "../config";
import { callClaude, getText, tryJSON, fmtMoney, timeAgo } from "../api";
import { useRefreshKey } from "../hooks";
import { Panel, SectionLabel, Tag, Btn } from "../ui";

export function StripePanel({ onData }) {
  const refreshKey = useRefreshKey();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isInitialStripe = useRef(true);
  const run = useCallback(async () => {
    setLoading(true);
    const res = await callClaude(
      `Use the stripe MCP to: 1) get account balance, 2) list last 5 payment intents. Return JSON: {"balance": {"available": [{"amount":number,"currency":string}]}, "payments": [{"id":string,"amount":number,"currency":string,"status":string,"created":number}]}`,
      [MCP_STRIPE]
    );
    const j = tryJSON(getText(res));
    setData(j);
    if (onData) onData(j);
    setLoading(false);
  }, [onData]);

  useEffect(() => {
    const delay = isInitialStripe.current ? 200 : 0;
    isInitialStripe.current = false;
    const t = delay ? setTimeout(run, delay) : null;
    if (!delay) run();
    return () => t && clearTimeout(t);
  }, [run, refreshKey]);

  const bal = data?.balance?.available?.[0];
  const payments = data?.payments || [];
  const panelStatus = loading ? "loading" : data ? "ok" : "err";

  return (
    <Panel title="Stripe — Revenue" status={panelStatus} accent={C.green} onRetry={run} id="stripe">
      {loading ? (
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Loading…</div>
      ) : (
        <>
          {bal && (
            <div style={{
              marginBottom: 14, padding: "12px 14px",
              background: `${C.green}10`, border: `1px solid ${C.green}25`,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 9, color: C.green, fontFamily: "'DM Mono', monospace", marginBottom: 4, letterSpacing: "0.16em", opacity: 0.7 }}>
                AVAILABLE BALANCE
              </div>
              <div style={{
                fontSize: 30, fontFamily: "'DM Mono', monospace", fontWeight: 700,
                color: C.green, fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 24px ${C.green}50`,
              }}>
                {fmtMoney(bal.amount, bal.currency)}
              </div>
            </div>
          )}
          {payments.length > 0 && (
            <>
              <SectionLabel color={C.green}>Recent Payments</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {payments.slice(0, 4).map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 10px",
                    background: C.surface, borderRadius: 4,
                    border: `1px solid ${C.border}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.text, fontFamily: "'DM Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                        {fmtMoney(p.amount, p.currency)}
                      </div>
                      <div style={{ fontSize: 9, color: C.muted }}>{p.created ? timeAgo(p.created) : ""}</div>
                    </div>
                    <Tag color={p.status === "succeeded" ? C.green : C.amber}>{(p.status || "").toUpperCase()}</Tag>
                  </div>
                ))}
              </div>
            </>
          )}
          {!bal && payments.length === 0 && (
            <div style={{ color: C.muted, fontSize: 10 }}>No data — check Stripe connection.</div>
          )}
        </>
      )}
    </Panel>
  );
}
