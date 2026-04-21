import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { rubik } from "../fonts";

export function Scene5Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgO = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const logoP = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 38 });
  const tagP = spring({ frame: frame - 28, fps, config: { damping: 12, stiffness: 160 }, durationInFrames: 42 });

  const statsO = interpolate(frame, [60, 88], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const statsY = interpolate(frame, [60, 88], [28, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const noteO = interpolate(frame, [130, 160], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const stats = [
    { num: "87%", label: "דיוק המודל (R²)" },
    { num: "~2.1", label: "שגיאה ממוצעת (MAE)" },
    { num: "5+", label: "פיצ'ר-גרופ" },
    { num: "∞", label: "לומד לאחר כל תחרות" },
  ];

  return (
    <AbsoluteFill style={{
      opacity: bgO,
      background: "linear-gradient(155deg, #FBF7F4 0%, #F0E6DE 40%, #E5D5C8 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: rubik, direction: "rtl",
    }}>
      {/* Top/bottom bars */}
      {[{ top: 0 }, { bottom: 0 }].map((pos, i) => (
        <div key={i} style={{
          position: "absolute", left: 0, right: 0, height: 8,
          background: "linear-gradient(90deg, #5D4037, #7B5243, #A0654E, #7B5243, #5D4037)",
          opacity: tagP, ...pos,
        }} />
      ))}

      {/* Logo */}
      <div style={{
        fontSize: 88, opacity: logoP,
        transform: `scale(${logoP})`, marginBottom: 16,
      }}>🐴</div>

      <div style={{
        fontSize: 78, fontWeight: 900, color: "#3F312B",
        opacity: logoP, lineHeight: 1.15, textAlign: "center",
      }}>
        RideOn<span style={{ color: "#7B5243" }}> Smart</span>
      </div>

      <div style={{
        marginTop: 20, fontSize: 32, fontWeight: 500, color: "#8D6E63",
        opacity: logoP, textAlign: "center",
      }}>
        חיזוי חכם שהופך ניהול תחרויות לפשוט יותר
      </div>

      {/* Badge */}
      <div style={{
        marginTop: 40, display: "flex", gap: 14,
        transform: `scale(${tagP})`, opacity: tagP,
      }}>
        {["Machine Learning", "רגרסיה", "Python", "XGBoost"].map((t) => (
          <div key={t} style={{
            paddingInline: 22, paddingBlock: 9, borderRadius: 30,
            background: t === "רגרסיה" ? "#7B5243" : "rgba(123,82,67,0.1)",
            color: t === "רגרסיה" ? "#fff" : "#5D4037",
            fontSize: 18, fontWeight: 700,
            border: t === "רגרסיה" ? "none" : "1.5px solid #C4A99A",
          }}>{t}</div>
        ))}
      </div>

      {/* Stats grid */}
      <div style={{
        marginTop: 56, display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 24, width: "100%", maxWidth: 1100,
        opacity: statsO, transform: `translateY(${statsY}px)`,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.7)",
            borderRadius: 18, padding: "24px 16px",
            border: "1.5px solid #D7CCC8", textAlign: "center",
            backdropFilter: "blur(4px)",
            boxShadow: "0 4px 18px rgba(0,0,0,0.07)",
          }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: "#7B5243" }}>{s.num}</div>
            <div style={{ fontSize: 18, color: "#8D6E63", marginTop: 6, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{
        position: "absolute", bottom: 60,
        fontSize: 20, color: "#BCAAA4",
        opacity: noteO, textAlign: "center",
      }}>
        פרויקט גמר · מדעי נתונים וניהול ספורט · 2025
      </div>
    </AbsoluteFill>
  );
}
