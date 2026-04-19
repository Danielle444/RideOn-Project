/**
 * Scene 4 — Live App Demo (frames 0–900, 30 seconds)
 *
 * Shows a pixel-accurate mockup of the actual RideOn secretary interface.
 * The user navigates to the ML Prediction page and interacts with it.
 *
 * Phase timeline (local frames):
 *   0–70    App shell loads (TopBar slides down, Sidebar slides in, content fades)
 *   70–160  Cursor moves to "תחזית ML" in sidebar → clicks
 *   160–310 Prediction page appears, loading skeleton → rows fill in
 *   310–450 Cursor moves to warning row → clicks to expand
 *   450–650 Detail panel slides in: bar chart + feature importance
 *   650–800 Toast appears, cursor moves to "אשר תכנון" button → clicks
 *   800–900 Transition fade-out
 */

import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { rubik } from "../fonts";

// ─── Design tokens (from the actual app) ────────────────────────────────────
const C = {
  topbar: "linear-gradient(270deg, #7B5243 0%, #5D4037 100%)",
  sidebar: "#ffffff",
  sidebarBorder: "#D9CDC6",
  sidebarActive: "#8B6352",
  sidebarText: "#5D4037",
  bg: "#F5F1EE",
  card: "#ffffff",
  cardBorder: "#EFE5DF",
  primary: "#7B5243",
  dark: "#3F312B",
  muted: "#8D6E63",
  mutedLight: "#BCAAA4",
  accent: "#EFE5DF",
};

const TOPBAR_H = 48;
const SIDEBAR_W = 310;
const FPS_REF = 30;

// ─── Sidebar nav items (from secretaryCompetitionMenu.js) ────────────────────
const NAV_ITEMS = [
  { key: "classes",         label: "מקצים",           icon: "📅" },
  { key: "paid-time",       label: "פייד-טיים",       icon: "🕐" },
  { key: "stalls",          label: "תאים",             icon: "🏠" },
  { key: "shavings",        label: "הזמנות נסורת",    icon: "📦" },
  { key: "health",          label: "תעודות בריאות",   icon: "📋" },
  { key: "tracking",        label: "מעקב שינויים",    icon: "📝" },
  { key: "payments",        label: "תשלומים",          icon: "💳" },
  { key: "summary",         label: "סיכום תחרות",     icon: "📊" },
  { key: "prediction",      label: "תחזית ML",         icon: "🤖" },
  { key: "back",            label: "חזרה ללוח",        icon: "◀" },
];

// ─── Prediction table data ───────────────────────────────────────────────────
const PRED_ROWS = [
  { name: "דרסאז' פתוח",   pred: 23, conf: 88, warn: true },
  { name: "קפיצות A",      pred: 14, conf: 92, warn: false },
  { name: "גמישות נוער",   pred: 9,  conf: 95, warn: false },
  { name: "דרסאז' מתחילים",pred: 18, conf: 85, warn: false },
  { name: "קפיצות B",      pred: 11, conf: 91, warn: false },
];

// ─── TopBar component ────────────────────────────────────────────────────────
function MockTopBar({ slideDown }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      height: TOPBAR_H,
      background: C.topbar,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      paddingInline: 20,
      transform: `translateY(${interpolate(slideDown, [0, 1], [-TOPBAR_H, 0])}px)`,
      zIndex: 10,
    }}>
      <div />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 18,
        }}>🔔</div>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 16,
        }}>↩</div>
      </div>
    </div>
  );
}

// ─── Sidebar component ───────────────────────────────────────────────────────
function MockSidebar({ slideIn, activeKey }) {
  return (
    <div style={{
      position: "absolute",
      top: TOPBAR_H, right: 0, bottom: 0,
      width: SIDEBAR_W,
      background: C.sidebar,
      borderLeft: `1px solid ${C.sidebarBorder}`,
      display: "flex", flexDirection: "column",
      transform: `translateX(${interpolate(slideIn, [0, 1], [SIDEBAR_W, 0])}px)`,
      fontFamily: rubik,
      zIndex: 9,
    }}>
      {/* User header */}
      <div style={{
        padding: "28px 22px 20px",
        borderBottom: `1px solid #EEE3DD`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>🐴</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#5D4037" }}>שרה לוי</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#8B6352", marginTop: 3 }}>מזכירה · חוות הגלבוע</div>
        <div style={{
          marginTop: 8, fontSize: 14, fontWeight: 700, color: "#A17664",
          background: "#FBF7F4", borderRadius: 8, paddingBlock: 4, paddingInline: 10,
          display: "inline-block",
        }}>תחרות אביב 2025</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: "auto", paddingBlock: 8 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <div key={item.key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingInline: 22, paddingBlock: 14,
              background: isActive ? C.sidebarActive : "transparent",
              color: isActive ? "#fff" : C.sidebarText,
              fontSize: 17, fontWeight: isActive ? 700 : 600,
              direction: "rtl",
            }}>
              <span>{item.label}</span>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Skeleton loader row ─────────────────────────────────────────────────────
function SkeletonRow({ y, pulse }) {
  const cols = [0.22, 0.12, 0.15, 0.12];
  return (
    <div style={{
      display: "flex", gap: 18, alignItems: "center",
      padding: "18px 30px", borderTop: `1px solid ${C.accent}`,
      opacity: 0.5 + 0.5 * pulse,
    }}>
      {cols.map((w, i) => (
        <div key={i} style={{
          height: 18, borderRadius: 6, background: "#D7CCC8",
          width: `${w * 100}%`, flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

// ─── Confidence bar ──────────────────────────────────────────────────────────
function ConfBar({ value, animFrame, delay }) {
  const w = interpolate(animFrame, [delay, delay + 28], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ width: 100, height: 10, background: C.accent, borderRadius: 5, overflow: "hidden" }}>
      <div style={{
        width: `${w}%`, height: "100%", borderRadius: 5,
        background: value >= 90 ? "#4CAF50" : C.primary,
      }} />
    </div>
  );
}

// ─── Main prediction table ───────────────────────────────────────────────────
function PredictionTable({ frame, rowAnimStart, hoveredRow, expandedRow }) {
  const cols = ["מקצה", "צפי כניסות", "ביטחון", "סטטוס"];
  return (
    <div style={{
      background: C.card, borderRadius: 18,
      border: `1.5px solid ${C.cardBorder}`,
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      fontFamily: rubik,
    }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr",
        background: C.dark, padding: "16px 28px", gap: 12, direction: "rtl",
      }}>
        {cols.map(c => (
          <div key={c} style={{ fontSize: 18, fontWeight: 700, color: "#fff", textAlign: "center" }}>{c}</div>
        ))}
      </div>

      {/* Rows */}
      {PRED_ROWS.map((row, i) => {
        const rowO = interpolate(frame, [rowAnimStart + i * 12, rowAnimStart + i * 12 + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isHovered = hoveredRow === i;
        const isExpanded = expandedRow === i;
        const isWarn = row.warn;

        return (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr",
            padding: "16px 28px", gap: 12, direction: "rtl",
            borderTop: `1px solid ${C.accent}`,
            background: isExpanded
              ? "#FFF3EE"
              : isHovered
              ? "#FFF8F5"
              : isWarn
              ? "#FFFAF8"
              : i % 2 === 0 ? C.card : "#FAF5F1",
            opacity: rowO,
            borderRight: isWarn ? `4px solid ${C.primary}` : "4px solid transparent",
            transition: "none",
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{row.name}</div>
            <div style={{ textAlign: "center", fontSize: 26, fontWeight: 900, color: C.primary }}>{row.pred}</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <ConfBar value={row.conf} animFrame={frame} delay={rowAnimStart + i * 12} />
              <span style={{ fontSize: 14, color: C.muted }}>{row.conf}%</span>
            </div>
            <div style={{ textAlign: "center" }}>
              {isWarn ? (
                <span style={{
                  background: "#FFF3CD", color: "#7B5243",
                  fontSize: 15, fontWeight: 700,
                  paddingInline: 12, paddingBlock: 5, borderRadius: 16,
                  border: "1px solid #F5C542",
                }}>⚠️ עומס גבוה</span>
              ) : (
                <span style={{
                  background: "#E8F5E9", color: "#388E3C",
                  fontSize: 15, fontWeight: 600,
                  paddingInline: 12, paddingBlock: 5, borderRadius: 16,
                }}>✓ תקין</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail panel (slides in from right in RTL = slides from left) ───────────
function DetailPanel({ slideProgress, frame }) {
  const panelW = 620;

  // Bar chart data: historical entries
  const histData = [
    { year: "2022", val: 15 }, { year: "2023", val: 18 },
    { year: "2024", val: 21 }, { year: "2025 (צפי)", val: 23, pred: true },
  ];
  const maxVal = 28;
  const chartAnimFrame = Math.max(0, frame - 18);

  // Feature importance
  const features = [
    { label: "היסטוריה", pct: 68, color: C.primary },
    { label: "עונה",     pct: 18, color: "#A0654E" },
    { label: "חווה",     pct: 14, color: "#C4A99A" },
  ];

  return (
    <div style={{
      position: "absolute",
      top: 0, bottom: 0,
      right: SIDEBAR_W,
      width: panelW,
      background: C.card,
      borderLeft: `1.5px solid ${C.cardBorder}`,
      fontFamily: rubik, direction: "rtl",
      transform: `translateX(${interpolate(slideProgress, [0, 1], [panelW, 0])}px)`,
      boxShadow: "-6px 0 32px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
      zIndex: 20, overflowY: "auto",
    }}>
      {/* Panel header */}
      <div style={{
        padding: "22px 28px", borderBottom: `1.5px solid ${C.accent}`,
        background: C.bg,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>ניתוח חיזוי</div>
        <div style={{ fontSize: 16, color: C.muted, marginTop: 4 }}>דרסאז' פתוח — תחרות אביב 2025</div>
      </div>

      <div style={{ padding: "24px 28px", flex: 1 }}>
        {/* Historical bar chart */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 16 }}>
            כניסות היסטוריות
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", height: 130 }}>
            {histData.map((d, i) => {
              const barH = interpolate(
                chartAnimFrame, [i * 14, i * 14 + 28], [0, (d.val / maxVal) * 120],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              const barO = interpolate(
                chartAnimFrame, [i * 14, i * 14 + 22], [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, opacity: barO }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: d.pred ? C.primary : C.muted }}>
                    {d.val}
                  </div>
                  <div style={{
                    width: "100%", height: barH,
                    background: d.pred
                      ? `linear-gradient(180deg, ${C.primary}, #9A6655)`
                      : "#D7CCC8",
                    borderRadius: "6px 6px 0 0",
                    border: d.pred ? `2px dashed ${C.primary}` : "none",
                  }} />
                  <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.2 }}>
                    {d.year}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Trend arrow */}
          <div style={{
            marginTop: 12, fontSize: 16, color: C.primary, fontWeight: 700,
            opacity: interpolate(chartAnimFrame, [55, 70], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
          }}>
            ↑ מגמה עולה — +2 כניסות בשנה בממוצע
          </div>
        </div>

        {/* Feature importance */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 14 }}>
            פיצ'רים משפיעים
          </div>
          {features.map((f, i) => {
            const barW = interpolate(
              chartAnimFrame, [70 + i * 16, 95 + i * 16], [0, f.pct],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const featureO = interpolate(
              chartAnimFrame, [68 + i * 16, 88 + i * 16], [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            return (
              <div key={i} style={{ marginBottom: 16, opacity: featureO }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 600, color: C.dark }}>{f.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: f.color }}>{f.pct}%</span>
                </div>
                <div style={{ width: "100%", height: 12, background: C.accent, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{
                    width: `${barW}%`, height: "100%", borderRadius: 6,
                    background: `linear-gradient(90deg, ${f.color}, ${f.color}cc)`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Accept button */}
        <div style={{
          marginTop: 32,
          opacity: interpolate(chartAnimFrame, [110, 132], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
        }}>
          <div style={{
            background: C.primary, color: "#fff",
            borderRadius: 14, padding: "16px 28px",
            fontSize: 18, fontWeight: 800, textAlign: "center",
            boxShadow: "0 4px 16px rgba(123,82,67,0.35)",
            cursor: "pointer",
          }}>
            ✓ אשר תחנון ושמור
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mouse cursor SVG ─────────────────────────────────────────────────────────
function Cursor({ x, y, clicking, visible }) {
  if (!visible) return null;
  const s = clicking ? 0.85 : 1;
  return (
    <div style={{
      position: "absolute",
      left: x - 8, top: y - 4,
      zIndex: 100,
      transform: `scale(${s})`,
      transformOrigin: "top left",
      pointerEvents: "none",
      filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
    }}>
      <svg width="28" height="36" viewBox="0 0 28 36">
        <polygon points="2,2 2,28 8,22 14,34 18,32 12,20 22,20" fill="white" stroke="#333" strokeWidth="2" />
      </svg>
    </div>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ progress }) {
  if (progress <= 0) return null;
  return (
    <div style={{
      position: "absolute", bottom: 36, left: "50%",
      transform: `translateX(-50%) translateY(${interpolate(progress, [0, 0.2], [40, 0], { extrapolateRight: "clamp" })}px)`,
      background: "#2E7D32", color: "#fff",
      borderRadius: 14, paddingInline: 28, paddingBlock: 14,
      fontSize: 20, fontWeight: 700, fontFamily: rubik, direction: "rtl",
      boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
      opacity: progress < 0.85 ? 1 : interpolate(progress, [0.85, 1], [1, 0]),
      zIndex: 50,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span>✓</span>
      <span>תחזית שמורה בהצלחה — המודל יתעדכן לאחר התחרות</span>
    </div>
  );
}

// ─── Main Scene ───────────────────────────────────────────────────────────────
export function Scene4AppDemo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: App shell loads (0–70)
  const topbarIn = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 28 });
  const sidebarIn = spring({ frame: frame - 10, fps, config: { damping: 200 }, durationInFrames: 35 });
  const contentO = interpolate(frame, [25, 55], [0, 1], { extrapolateRight: "clamp" });

  // Phase 2: Cursor navigation (70–160)
  // Sidebar "תחזית ML" item: right=0, y ≈ TOPBAR_H + 230 + 8*56 = 726
  const SIDEBAR_X = 1920 - SIDEBAR_W + 155; // center of sidebar
  const PRED_ITEM_Y = TOPBAR_H + 255 + 8 * 55; // approx y of "תחזית ML" nav item

  const cursorStartX = 900, cursorStartY = 400; // initial position
  const cursorClickX = SIDEBAR_X, cursorClickY = PRED_ITEM_Y;

  // Cursor moves to sidebar item (70–120)
  const cursorMoveP = interpolate(frame, [70, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Cursor moves to warning row (200–260)
  const WARN_ROW_Y = TOPBAR_H + 180 + 16 + 50; // approx y of first data row in content area
  const WARN_ROW_X = 460; // content area center-ish
  const cursorMove2P = interpolate(frame, [200, 255], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Cursor moves to accept button (660–700)
  const ACCEPT_Y = TOPBAR_H + 100 + 570;
  const ACCEPT_X = 1920 - SIDEBAR_W - 310;
  const cursorMove3P = interpolate(frame, [660, 698], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cursorX = frame < 70
    ? cursorStartX
    : frame < 200
    ? interpolate(cursorMoveP, [0, 1], [cursorStartX, cursorClickX])
    : frame < 660
    ? interpolate(cursorMove2P, [0, 1], [cursorClickX, WARN_ROW_X])
    : interpolate(cursorMove3P, [0, 1], [WARN_ROW_X, ACCEPT_X]);

  const cursorY = frame < 70
    ? cursorStartY
    : frame < 200
    ? interpolate(cursorMoveP, [0, 1], [cursorStartY, cursorClickY])
    : frame < 660
    ? interpolate(cursorMove2P, [0, 1], [cursorClickY, WARN_ROW_Y])
    : interpolate(cursorMove3P, [0, 1], [WARN_ROW_Y, ACCEPT_Y]);

  const clicking1 = frame >= 118 && frame <= 130; // click on nav
  const clicking2 = frame >= 292 && frame <= 308; // click on row
  const clicking3 = frame >= 702 && frame <= 716; // click accept

  // Active nav key (switches at frame 125 after click)
  const activeNav = frame < 125 ? "classes" : "prediction";

  // Phase 3: Page loads (160–310)
  const pageHeaderO = interpolate(frame, [155, 178], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const skeletonP = frame >= 160 && frame < 220 ? 1 : 0;
  const skeletonPulse = Math.sin((frame * Math.PI) / 8) * 0.5 + 0.5;
  const rowAnimStart = 88; // local to when rows appear (frame 220 global ≈ local 60 after page loads)
  const tableRowFrame = Math.max(0, frame - 218);

  // Phase 4: Detail panel (frame 310+)
  const detailSlide = spring({
    frame: frame - 310,
    fps,
    config: { damping: 200 },
    durationInFrames: 45,
  });
  const showDetail = frame >= 310;
  const detailLocalFrame = Math.max(0, frame - 330);

  // Phase 5: Toast (frame 720+)
  const toastProgress = interpolate(frame, [720, 840], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out (frame 860+)
  const fadeOut = interpolate(frame, [860, 900], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const contentWidth = 1920 - SIDEBAR_W;

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: rubik, overflow: "hidden" }}>

      {/* ─── Top Bar ─────────────────────────────────────────────────── */}
      <MockTopBar slideDown={topbarIn} />

      {/* ─── Sidebar ─────────────────────────────────────────────────── */}
      <MockSidebar slideIn={sidebarIn} activeKey={activeNav} />

      {/* ─── Main content area ───────────────────────────────────────── */}
      <div style={{
        position: "absolute",
        top: TOPBAR_H, left: 0, bottom: 0,
        width: contentWidth,
        opacity: contentO,
        overflowY: "hidden",
      }}>
        <div style={{ padding: "36px 48px", direction: "rtl" }}>

          {/* Page header */}
          <div style={{
            marginBottom: 28, opacity: pageHeaderO,
            transform: `translateY(${interpolate(pageHeaderO, [0, 1], [-14, 0])}px)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
              <div style={{
                width: 46, height: 46, background: C.primary, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>🤖</div>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: C.dark, margin: 0 }}>
                תחזית מקצים — תחרות אביב 2025
              </h1>
            </div>
            <p style={{ margin: "0 62px", fontSize: 18, color: C.muted }}>
              חיזוי מספר הרוכבים לכל מקצה · מופעל על ידי מודל ML
            </p>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 24, direction: "rtl",
            opacity: interpolate(frame, [172, 196], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
          }}>
            {[
              { label: "סה\"כ מקצים",  value: "5",    icon: "📅" },
              { label: "עומס גבוה",    value: "1",    icon: "⚠️", warn: true },
              { label: "ביטחון ממוצע", value: "90%",  icon: "🎯" },
              { label: "מודל גרסה",    value: "v3.2", icon: "🤖" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: C.card, borderRadius: 14,
                border: `1.5px solid ${s.warn ? "#F5C542" : C.cardBorder}`,
                padding: "14px 18px", direction: "rtl",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>
                  {s.icon} {s.label}
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 900,
                  color: s.warn ? "#D4820A" : C.dark, marginTop: 4,
                }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Loading skeleton or actual table */}
          {skeletonP > 0 && frame < 222 ? (
            <div style={{
              background: C.card, borderRadius: 18,
              border: `1.5px solid ${C.cardBorder}`,
              overflow: "hidden",
            }}>
              <div style={{ background: C.dark, padding: "16px 28px", height: 56 }} />
              {[0, 1, 2, 3, 4].map(i => (
                <SkeletonRow key={i} y={i} pulse={skeletonPulse} />
              ))}
            </div>
          ) : (
            <PredictionTable
              frame={tableRowFrame}
              rowAnimStart={rowAnimStart}
              hoveredRow={frame >= 255 && frame < 310 ? 0 : -1}
              expandedRow={frame >= 310 ? 0 : -1}
            />
          )}

          {/* Bottom note */}
          <div style={{
            marginTop: 20, fontSize: 16, color: C.mutedLight, textAlign: "center",
            opacity: interpolate(frame, [250, 275], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
          }}>
            המודל מתעדכן אוטומטית לאחר כל תחרות שמסתיימת
          </div>
        </div>
      </div>

      {/* ─── Detail panel ────────────────────────────────────────────── */}
      {showDetail && (
        <DetailPanel slideProgress={detailSlide} frame={detailLocalFrame} />
      )}

      {/* ─── Mouse cursor ────────────────────────────────────────────── */}
      <Cursor
        x={cursorX} y={cursorY}
        clicking={clicking1 || clicking2 || clicking3}
        visible={frame >= 65 && frame < 750}
      />

      {/* ─── Toast ───────────────────────────────────────────────────── */}
      <Toast progress={toastProgress} />

      {/* ─── Fade out overlay ────────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0,
        background: C.bg, opacity: fadeOut,
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}
