import { useState, useEffect } from "react";
import { C } from "./config";

export function Header({ countdown, notifPerm, onEnableNotifs, onOpenSettings }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: 22, paddingBottom: 20,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <span style={{
            fontSize: 36, fontFamily: "'DM Mono', monospace", fontWeight: 700,
            background: `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 60%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.06em",
            filter: `drop-shadow(0 0 20px ${C.gold}60)`,
          }}>OKDF</span>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
            <span style={{
              fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
              color: C.text, letterSpacing: "0.2em", opacity: 0.7,
            }}>MISSION CONTROL</span>
            <span style={{
              fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.22em",
            }}>OPERATOR KIT FOR DIGITAL FREEDOM — v3.0</span>
            <span style={{
              fontSize: 9, color: C.textDim, fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.1em",
            }}>Autonomous agents. Zero blind spots.</span>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <div style={{
          fontSize: 32, fontFamily: "'DM Mono', monospace", fontWeight: 700,
          color: C.text, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums",
          lineHeight: 1, textShadow: `0 0 30px ${C.text}20`,
        }}>
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </div>
        <div style={{
          fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.14em",
        }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {typeof Notification !== "undefined" && notifPerm !== "granted" && notifPerm !== "denied" && (
            <button onClick={onEnableNotifs} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: `${C.amber}0E`, border: `1px solid ${C.amber}30`,
              borderRadius: 5, padding: "3px 9px", cursor: "pointer",
              fontSize: 9, color: C.amber, fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.12em",
            }}>⊕ ENABLE ALERTS</button>
          )}
          <button onClick={onOpenSettings} title="Configure" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: `${C.gold}0E`, border: `1px solid ${C.gold}25`,
            borderRadius: 5, padding: "3px 9px", cursor: "pointer",
            fontSize: 12, color: C.gold, lineHeight: 1,
          }}>⚙</button>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: `${C.gold}0E`, border: `1px solid ${C.gold}25`,
            borderRadius: 5, padding: "3px 9px",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", background: C.gold,
              boxShadow: `0 0 6px ${C.gold}`,
              animation: "glow-pulse 2s ease-in-out infinite", display: "inline-block",
            }} />
            <span style={{
              fontSize: 9, color: C.gold, fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.12em", fontVariantNumeric: "tabular-nums",
            }}>REFRESH {mm}:{ss}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
