import { useCurrentFrame } from "remotion";
import { SUBTITLES } from "../subtitleData";
import { rubik } from "../fonts";

export function SubtitleOverlay() {
  const frame = useCurrentFrame();
  const active = SUBTITLES.find((s) => frame >= s.from && frame < s.to);

  if (!active) return null;

  const progress = Math.min(1, (frame - active.from) / 8);
  const fadeOut = active.to - frame < 8 ? (active.to - frame) / 8 : 1;
  const opacity = Math.min(progress, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 52,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        maxWidth: 1400,
        textAlign: "center",
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "rgba(15, 10, 8, 0.72)",
          backdropFilter: "blur(4px)",
          paddingInline: 36,
          paddingBlock: 14,
          borderRadius: 14,
          fontSize: 32,
          fontWeight: 600,
          color: "#ffffff",
          fontFamily: rubik,
          direction: "rtl",
          lineHeight: 1.4,
          letterSpacing: "0.2px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {active.text}
      </div>
    </div>
  );
}
