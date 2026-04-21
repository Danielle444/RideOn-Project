import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { rubik } from "../fonts";

function Bullet({ icon, label, delayFrames, frame, fps }) {
  const p = spring({ frame: frame - delayFrames, fps, config: { damping: 200 }, durationInFrames: 35 });
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 22,
      opacity: p,
      transform: `translateX(${interpolate(p, [0, 1], [50, 0])}px)`,
      marginBottom: 32,
      direction: "rtl",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: "linear-gradient(135deg, #7B5243, #9A6655)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 30, flexShrink: 0,
        boxShadow: "0 4px 18px rgba(123,82,67,0.3)",
      }}>{icon}</div>
      <div style={{ fontSize: 34, fontWeight: 700, color: "#3F312B", fontFamily: rubik }}>{label}</div>
    </div>
  );
}

function MockClassCard({ name, delayFrames, frame, fps }) {
  const p = spring({ frame: frame - delayFrames, fps, config: { damping: 15, stiffness: 180 }, durationInFrames: 30 });
  return (
    <div style={{
      width: "100%", padding: "22px 28px",
      background: "#fff", borderRadius: 18,
      border: "2px solid #D7CCC8",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      direction: "rtl",
      transform: `scale(${p})`, opacity: p,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <span style={{ fontSize: 26, fontWeight: 700, color: "#3F312B", fontFamily: rubik }}>{name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: "#C4A99A" }}>?</span>
      </div>
    </div>
  );
}

export function Scene2Problem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const headerP = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 35 });

  return (
    <AbsoluteFill style={{
      opacity: fadeIn, background: "#FBF7F4",
      display: "flex", fontFamily: rubik,
    }}>
      {/* Left — problem panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", paddingInline: 110, paddingBlock: 80,
        direction: "rtl",
      }}>
        {/* Section chip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "rgba(123,82,67,0.1)", paddingInline: 18, paddingBlock: 8,
          borderRadius: 30, marginBottom: 28, alignSelf: "flex-start",
          opacity: headerP,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#7B5243", letterSpacing: "1px" }}>
            האתגר
          </span>
        </div>

        <div style={{
          fontSize: 50, fontWeight: 900, color: "#3F312B",
          lineHeight: 1.25, marginBottom: 56,
          opacity: headerP,
          transform: `translateY(${interpolate(headerP, [0, 1], [-18, 0])}px)`,
        }}>
          כמה רוכבים ירשמו<br />לכל מקצה?
        </div>

        <Bullet icon="📅" label="תכנון לוח זמנים" delayFrames={60} frame={frame} fps={fps} />
        <Bullet icon="👥" label="ניהול כוח אדם" delayFrames={90} frame={frame} fps={fps} />
        <Bullet icon="🏠" label="לוגיסטיקה ותאים" delayFrames={120} frame={frame} fps={fps} />
      </div>

      {/* Divider */}
      <div style={{
        width: 2, background: "linear-gradient(180deg, transparent, #D7CCC8 20%, #D7CCC8 80%, transparent)",
        marginBlock: 60,
        opacity: interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" }),
      }} />

      {/* Right — class cards with question marks */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 80px 80px 60px", gap: 20,
      }}>
        <div style={{
          fontSize: 22, color: "#8D6E63", fontWeight: 600, marginBottom: 8,
          opacity: interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" }),
          direction: "rtl",
        }}>
          מקצי תחרות אביב 2025
        </div>

        <MockClassCard name="דרסאז' פתוח" delayFrames={10} frame={frame} fps={fps} />
        <MockClassCard name="קפיצות A" delayFrames={28} frame={frame} fps={fps} />
        <MockClassCard name="גמישות נוער" delayFrames={46} frame={frame} fps={fps} />
        <MockClassCard name="דרסאז' מתחילים" delayFrames={64} frame={frame} fps={fps} />

        {/* "No data" note */}
        <div style={{
          marginTop: 16, textAlign: "center", direction: "rtl",
          opacity: interpolate(frame, [120, 148], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
        }}>
          <div style={{ fontSize: 20, color: "#BCAAA4", fontStyle: "italic" }}>
            צפי הכניסות לא ידוע — המזכירה מנחשת...
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
