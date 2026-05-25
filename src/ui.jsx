import { useState } from "react";
import { C } from "./config";

export function Pulse({ color, size = 8 }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size + 12, height: size + 12, flexShrink: 0, position: "relative",
    }}>
      <span style={{
        position: "absolute", width: "100%", height: "100%", borderRadius: "50%",
        border: `1px solid ${color}`,
        animation: "ripple 2.5s ease-out infinite",
      }} />
      <span style={{
        width: size, height: size, borderRadius: "50%",
        background: color, boxShadow: `0 0 8px ${color}`,
        animation: "glow-pulse 2s ease-in-out infinite",
      }} />
    </span>
  );
}

export function SpinDot({ size = 8 }) {
  return (
    <span style={{
      display: "inline-block", width: size + 4, height: size + 4, borderRadius: "50%", flexShrink: 0,
      border: `2px solid ${C.amber}40`, borderTopColor: C.amber,
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

export function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700,
      color, background: `${color}18`,
      border: `1px solid ${color}55`, borderRadius: 3,
      padding: "2px 6px", letterSpacing: "0.1em", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export function Divider({ color }) {
  return <div style={{ height: 1, background: color || C.border, margin: "12px 0", opacity: 0.6 }} />;
}

export function SectionLabel({ children, color }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700,
      color: C.muted, letterSpacing: "0.2em", marginBottom: 10,
      textTransform: "uppercase",
      borderLeft: `2px solid ${color || C.border}`,
      paddingLeft: 8,
    }}>{children}</div>
  );
}

export function Btn({ children, onClick, color, disabled, small }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov && !disabled ? `${color}22` : "transparent",
        border: `1px solid ${disabled ? C.ghost : hov ? color : `${color}60`}`,
        color: disabled ? C.muted : color,
        fontFamily: "'DM Mono', monospace", fontWeight: 700,
        fontSize: small ? 10 : 11, letterSpacing: "0.12em", textTransform: "uppercase",
        padding: small ? "3px 10px" : "6px 14px", borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        boxShadow: hov && !disabled ? `0 0 14px ${color}40` : "none",
      }}
    >{children}</button>
  );
}

export function TabBar({ tabs, active, onChange, color }) {
  return (
    <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          background: active === t ? (color || C.gold) : "transparent",
          border: `1px solid ${active === t ? (color || C.gold) : C.ghost}`,
          color: active === t ? C.bg : C.muted,
          fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.14em", padding: "3px 12px", borderRadius: 3,
          cursor: "pointer", textTransform: "uppercase", transition: "all 0.15s",
        }}>{t}</button>
      ))}
    </div>
  );
}

export function Panel({ title, status, children, accent, minHeight, onRetry, id }) {
  const storageKey = id ? `panel-collapsed-${id}` : null;
  const [collapsed, setCollapsed] = useState(() => {
    if (!storageKey) return false;
    try { return localStorage.getItem(storageKey) === "true"; } catch { return false; }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (storageKey) { try { localStorage.setItem(storageKey, String(next)); } catch {} }
  };

  const statusColor = status === "ok" ? C.green : status === "err" ? C.red : status === "loading" ? C.amber : C.muted;
  const statusLabel = { ok: "OK", err: "ERR", idle: "IDLE" }[status];
  const ac = accent || C.gold;
  return (
    <div style={{
      background: `linear-gradient(150deg, #0D1525 0%, #090D1C 50%, ${C.panel} 100%)`,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${ac}`,
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 0,
      minHeight: collapsed ? "auto" : (minHeight || "auto"),
      position: "relative", overflow: "hidden",
      boxShadow: `0 0 0 1px ${ac}0A inset, 0 1px 0 0 ${ac}30 inset, 0 8px 32px #00000080, 0 0 48px ${ac}06`,
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 80,
        background: `linear-gradient(180deg, ${ac}0C 0%, transparent 100%)`,
        pointerEvents: "none", borderRadius: "12px 12px 0 0",
      }} />
      <div
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 9,
          paddingBottom: collapsed ? 0 : 12, marginBottom: collapsed ? 0 : 14,
          borderBottom: collapsed ? "none" : `1px solid ${C.border}`,
          position: "relative", cursor: "pointer", userSelect: "none",
        }}
      >
        {status === "loading" ? <SpinDot /> : <Pulse color={statusColor} />}
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700,
          color: C.textDim, letterSpacing: "0.2em", textTransform: "uppercase", flex: 1,
        }}>{title}</span>
        {status === "err" && onRetry ? (
          <Btn small color={C.red} onClick={e => { e.stopPropagation(); onRetry(); }}>RETRY</Btn>
        ) : statusLabel ? (
          <span style={{
            fontSize: 8, color: statusColor,
            background: `${statusColor}12`,
            border: `1px solid ${statusColor}30`,
            borderRadius: 4, padding: "2px 7px",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em",
            boxShadow: `0 0 10px ${statusColor}18`,
          }}>{statusLabel}</span>
        ) : null}
        <span style={{
          fontSize: 11, color: C.muted, flexShrink: 0, marginLeft: 4,
          display: "inline-block", lineHeight: 1,
          transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
          transition: "transform 0.18s ease",
        }}>▾</span>
      </div>
      {!collapsed && <div style={{ position: "relative" }}>{children}</div>}
    </div>
  );
}

export function CardRow({ children, style }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.ghost : C.surface,
        border: `1px solid ${hov ? C.borderBright : C.border}`,
        borderLeft: hov ? `2px solid ${C.gold}` : `2px solid transparent`,
        borderRadius: 6, padding: "9px 11px",
        display: "flex", alignItems: "center", gap: 8,
        transition: "all 0.15s", ...style,
      }}
    >{children}</div>
  );
}
