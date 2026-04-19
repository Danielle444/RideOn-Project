import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { rubik } from "../fonts";

export function Scene1Title() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const logoScale = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 35 });
  const logoOpacity = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  const titleY = interpolate(frame, [15, 48], [28, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [15, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const subtitleY = interpolate(frame, [32, 58], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [32, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const badgeScale = spring({ frame: frame - 50, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 35 });
  const badgeOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity: bgOpacity,
        background: "linear-gradient(155deg, #FBF7F4 0%, #F0E6DE 45%, #E5D5C8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: rubik,
        direction: "rtl",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 900, height: 900,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(123,82,67,0.10) 0%, transparent 65%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }} />

      {/* Decorative top line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 6,
        background: "linear-gradient(90deg, #5D4037, #7B5243, #A0654E, #7B5243, #5D4037)",
        opacity: badgeOpacity,
      }} />

      {/* Horse emoji */}
      <div style={{
        fontSize: 96,
        opacity: logoOpacity,
        transform: `scale(${logoScale})`,
        marginBottom: 20,
        lineHeight: 1,
      }}>🐴</div>

      {/* Main title */}
      <div style={{
        fontSize: 80,
        fontWeight: 900,
        color: "#3F312B",
        textAlign: "center",
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        lineHeight: 1.15,
        letterSpacing: "-1.5px",
      }}>
        RideOn<span style={{ color: "#7B5243" }}> — </span>חיזוי חכם לתחרויות
      </div>

      {/* Subtitle */}
      <div style={{
        marginTop: 24,
        fontSize: 34,
        fontWeight: 500,
        color: "#8D6E63",
        opacity: subtitleOpacity,
        transform: `translateY(${subtitleY}px)`,
        textAlign: "center",
        letterSpacing: "0.3px",
      }}>
        מודל ML לניבוי כניסות למקצים
      </div>

      {/* Badge */}
      <div style={{
        marginTop: 48,
        display: "flex",
        gap: 16,
        opacity: badgeOpacity,
        transform: `scale(${badgeScale})`,
      }}>
        {["Machine Learning", "רגרסיה", "Python"].map((tag) => (
          <div key={tag} style={{
            paddingInline: 24, paddingBlock: 10,
            borderRadius: 30,
            background: tag === "רגרסיה" ? "#7B5243" : "rgba(123,82,67,0.12)",
            color: tag === "רגרסיה" ? "#fff" : "#5D4037",
            fontSize: 20,
            fontWeight: 700,
            border: tag === "רגרסיה" ? "none" : "1.5px solid #C4A99A",
          }}>{tag}</div>
        ))}
      </div>

      {/* Bottom strip */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 6,
        background: "linear-gradient(90deg, #5D4037, #7B5243, #A0654E, #7B5243, #5D4037)",
        opacity: badgeOpacity,
      }} />
    </AbsoluteFill>
  );
}
