import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { rubik } from "../fonts";

const COLORS = {
  bg: "#FBF7F4", primary: "#7B5243", dark: "#3F312B",
  muted: "#8D6E63", border: "#D7CCC8", card: "#fff", accent: "#EFE5DF",
};

function StepChip({ number, label, frame, fps }) {
  const p = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, marginBottom: 48,
      opacity: p, transform: `translateY(${interpolate(p, [0, 1], [-20, 0])}px)`,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: COLORS.primary, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, fontWeight: 800, flexShrink: 0,
        boxShadow: "0 4px 16px rgba(123,82,67,0.35)",
      }}>{number}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.dark, fontFamily: rubik }}>{label}</div>
    </div>
  );
}

// ─── Step 1: Data Table ─────────────────────────────────────────────────────
function Step1DataTable() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tableP = spring({ frame: frame - 18, fps, config: { damping: 200 }, durationInFrames: 40 });

  const rows = [
    { year: "2022", cls: "דרסאז' פתוח", entries: 15, season: "קיץ" },
    { year: "2023", cls: "דרסאז' פתוח", entries: 18, season: "קיץ" },
    { year: "2024", cls: "דרסאז' פתוח", entries: 21, season: "קיץ" },
    { year: "2023", cls: "קפיצות A", entries: 12, season: "חורף" },
    { year: "2024", cls: "קפיצות A", entries: 14, season: "חורף" },
  ];

  return (
    <AbsoluteFill style={{
      background: COLORS.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: rubik, direction: "rtl", padding: "60px 100px",
    }}>
      <div style={{ width: "100%", maxWidth: 1360 }}>
        <StepChip number="1" label="איסוף נתונים היסטוריים" frame={frame} fps={fps} />

        <div style={{
          background: COLORS.card, borderRadius: 22, border: `2px solid ${COLORS.border}`,
          overflow: "hidden", opacity: tableP,
          transform: `translateY(${interpolate(tableP, [0, 1], [30, 0])}px)`,
          boxShadow: "0 6px 32px rgba(0,0,0,0.08)",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "0.8fr 2fr 1.5fr 1fr",
            background: COLORS.primary, padding: "20px 36px", gap: 12,
          }}>
            {["תחרות", "מקצה", "כניסות היסטוריות", "עונה"].map(h => (
              <div key={h} style={{ fontSize: 22, fontWeight: 700, color: "#fff", textAlign: "center" }}>{h}</div>
            ))}
          </div>
          {rows.map((r, i) => {
            const rowO = interpolate(frame, [28 + i * 12, 50 + i * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const isNew = r.entries === 21;
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "0.8fr 2fr 1.5fr 1fr",
                padding: "18px 36px", gap: 12, borderTop: `1px solid ${COLORS.accent}`,
                background: isNew ? "#FFF8F5" : i % 2 === 0 ? COLORS.card : "#FAF5F1",
                opacity: rowO,
              }}>
                <div style={{ textAlign: "center", fontSize: 22, color: "#5D4037", fontWeight: 600 }}>{r.year}</div>
                <div style={{ textAlign: "center", fontSize: 22, color: COLORS.dark, fontWeight: 700 }}>{r.cls}</div>
                <div style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: isNew ? COLORS.primary : "#5D4037" }}>{r.entries}</div>
                <div style={{ textAlign: "center", fontSize: 22, color: COLORS.muted }}>{r.season}</div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 28, display: "flex", gap: 12, alignItems: "center",
          opacity: interpolate(frame, [100, 130], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
        }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: COLORS.primary }}>↑</span>
          <span style={{ fontSize: 24, fontWeight: 600, color: COLORS.dark }}>מגמה עולה: 15 → 18 → 21</span>
          <span style={{ fontSize: 22, color: COLORS.muted }}>— המודל לומד את הדפוס</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Step 2: Feature Cards ────────────────────────────────────────────────────
function Step2Features() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "🕐", title: "זמן", items: ["שנה", "חודש", "עונה"], delay: 15, strong: false },
    { icon: "🏆", title: "תחרות", items: ["ענף", "חווה", "משך"], delay: 38, strong: false },
    { icon: "🎯", title: "מקצה", items: ["סוג", "פרס", "יום"], delay: 61, strong: false },
    { icon: "📊", title: "היסטוריה", items: ["ממוצע", "מגמה", "חציון"], delay: 84, strong: true },
  ];

  return (
    <AbsoluteFill style={{
      background: COLORS.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: rubik, direction: "rtl", padding: "60px 100px",
    }}>
      <div style={{ width: "100%", maxWidth: 1360 }}>
        <StepChip number="2" label="חילוץ פיצ'רים (Features)" frame={frame} fps={fps} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
          {features.map((f, i) => {
            const p = spring({ frame: frame - f.delay, fps, config: { damping: 200 }, durationInFrames: 40 });
            const glowO = f.strong
              ? interpolate(frame, [130, 155], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
              : 0;
            return (
              <div key={i} style={{
                background: COLORS.card, borderRadius: 22,
                border: `${f.strong ? 3 : 2}px solid ${f.strong ? COLORS.primary : COLORS.border}`,
                padding: "36px 24px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                opacity: p,
                transform: `scale(${p}) translateY(${interpolate(p, [0, 1], [28, 0])}px)`,
                boxShadow: f.strong
                  ? `0 0 ${interpolate(glowO, [0, 1], [0, 48])}px rgba(123,82,67,0.32)`
                  : "0 2px 12px rgba(0,0,0,0.06)",
                position: "relative",
              }}>
                {f.strong && (
                  <div style={{
                    position: "absolute", top: -16, right: 18,
                    background: COLORS.primary, color: "#fff",
                    fontSize: 15, fontWeight: 800, paddingInline: 14, paddingBlock: 5,
                    borderRadius: 20, opacity: glowO, fontFamily: rubik,
                  }}>
                    הכי חזק
                  </div>
                )}
                <div style={{ fontSize: 54 }}>{f.icon}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.dark }}>{f.title}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {f.items.map(it => (
                    <div key={it} style={{
                      fontSize: 19, color: COLORS.muted, fontWeight: 500,
                      background: COLORS.accent, paddingInline: 14, paddingBlock: 4, borderRadius: 8,
                    }}>{it}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Step 3: Model Pipeline ───────────────────────────────────────────────────
function Step3Model() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inP = spring({ frame: frame - 15, fps, config: { damping: 200 }, durationInFrames: 38 });
  const ar1P = spring({ frame: frame - 42, fps, config: { damping: 200 }, durationInFrames: 28 });
  const modP = spring({ frame: frame - 62, fps, config: { damping: 200 }, durationInFrames: 40 });
  const ar2P = spring({ frame: frame - 90, fps, config: { damping: 200 }, durationInFrames: 28 });
  const outP = spring({ frame: frame - 112, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 40 });

  const Box = ({ children, style }) => (
    <div style={{
      background: COLORS.card, borderRadius: 22, border: `2px solid ${COLORS.border}`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      ...style,
    }}>{children}</div>
  );

  return (
    <AbsoluteFill style={{
      background: COLORS.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: rubik, direction: "rtl", padding: "60px 100px",
    }}>
      <div style={{ width: "100%", maxWidth: 1360 }}>
        <StepChip number="3" label="מודל הרגרסיה" frame={frame} fps={fps} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, direction: "ltr" }}>
          {/* Input */}
          <Box style={{ padding: "32px 36px", textAlign: "center", minWidth: 260, opacity: inP, transform: `scale(${inP})` }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📊</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.dark }}>פיצ'רים</div>
            <div style={{ fontSize: 18, color: COLORS.muted, marginTop: 8, direction: "rtl", lineHeight: 1.6 }}>
              זמן · תחרות<br />מקצה · היסטוריה
            </div>
          </Box>

          {/* Arrow 1 */}
          <div style={{ fontSize: 52, color: COLORS.primary, padding: "0 12px", opacity: ar1P, transform: `scaleX(${ar1P})`, transformOrigin: "left center" }}>→</div>

          {/* Model */}
          <div style={{
            background: `linear-gradient(145deg, ${COLORS.primary}, #9A6655)`,
            borderRadius: 26, padding: "42px 52px", textAlign: "center", minWidth: 360,
            opacity: modP, transform: `scale(${modP})`,
            boxShadow: "0 12px 48px rgba(123,82,67,0.38)",
          }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🤖</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#fff" }}>Regression Model</div>
            <div style={{
              marginTop: 14, fontSize: 19, color: "rgba(255,255,255,0.85)",
              background: "rgba(255,255,255,0.15)",
              paddingInline: 20, paddingBlock: 8, borderRadius: 14,
              fontFamily: rubik,
            }}>
              Random Forest / XGBoost
            </div>
          </div>

          {/* Arrow 2 */}
          <div style={{ fontSize: 52, color: COLORS.primary, padding: "0 12px", opacity: ar2P, transform: `scaleX(${ar2P})`, transformOrigin: "left center" }}>→</div>

          {/* Output */}
          <Box style={{
            padding: "32px 36px", textAlign: "center", minWidth: 268,
            border: `3px solid ${COLORS.primary}`,
            opacity: outP, transform: `scale(${outP})`,
            boxShadow: `0 0 ${interpolate(outP, [0, 1], [0, 40])}px rgba(123,82,67,0.28)`,
          }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎯</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: COLORS.primary }}>23</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.dark }}>כניסות צפויות</div>
            <div style={{ fontSize: 18, color: COLORS.muted, marginTop: 8 }}>ביטחון ±3</div>
          </Box>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Step 4: Target Variable ──────────────────────────────────────────────────
function Step4Target() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const conP = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 38 });
  const badgeP = spring({ frame: frame - 28, fps, config: { damping: 12, stiffness: 160 }, durationInFrames: 48 });
  const explainO = interpolate(frame, [55, 85], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const metricsO = interpolate(frame, [80, 108], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{
      background: COLORS.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: rubik, direction: "rtl", padding: 80,
    }}>
      <div style={{ textAlign: "center", opacity: conP, transform: `translateY(${interpolate(conP, [0, 1], [36, 0])}px)` }}>
        <StepChip number="4" label="משתנה המטרה" frame={frame} fps={fps} />

        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${COLORS.primary}, #9A6655)`,
          color: "#fff", fontSize: 44, fontWeight: 900,
          paddingInline: 64, paddingBlock: 26, borderRadius: 22,
          transform: `scale(${badgeP})`,
          boxShadow: `0 10px 40px rgba(123,82,67,${interpolate(badgeP, [0, 1], [0, 0.45])})`,
          direction: "ltr", letterSpacing: "-0.5px",
        }}>
          Target: ActualEntriesCount
        </div>

        <div style={{
          marginTop: 40, fontSize: 28, color: "#5D4037", opacity: explainO,
          lineHeight: 1.65, maxWidth: 900,
        }}>
          מה שהמודל לומד לחזות —
          <br />
          <span style={{ fontWeight: 800, color: COLORS.dark }}>מספר הרוכבים שנרשמו בפועל</span>
          {" "}לכל מקצה בכל תחרות
        </div>

        <div style={{
          marginTop: 44, display: "flex", gap: 20, justifyContent: "center", opacity: metricsO,
        }}>
          {[
            { key: "MAE", desc: "שגיאה ממוצעת", val: "~2.1" },
            { key: "RMSE", desc: "שורש ריבועי", val: "~2.8" },
            { key: "R²", desc: "התאמת מודל", val: "0.87" },
          ].map(m => (
            <div key={m.key} style={{
              background: COLORS.card, border: `2px solid ${COLORS.border}`,
              borderRadius: 16, padding: "18px 30px", textAlign: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.primary }}>{m.key}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.dark, marginTop: 4 }}>{m.val}</div>
              <div style={{ fontSize: 16, color: COLORS.muted, marginTop: 2 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function Scene3MLWorkflow() {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={160} premountFor={10}><Step1DataTable /></Sequence>
      <Sequence from={160} durationInFrames={200} premountFor={10}><Step2Features /></Sequence>
      <Sequence from={360} durationInFrames={150} premountFor={10}><Step3Model /></Sequence>
      <Sequence from={510} durationInFrames={150} premountFor={10}><Step4Target /></Sequence>
    </AbsoluteFill>
  );
}
