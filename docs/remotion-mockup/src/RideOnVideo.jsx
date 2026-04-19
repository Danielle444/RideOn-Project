import { AbsoluteFill, Sequence } from "remotion";
import { Scene1Title } from "./scenes/Scene1Title";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { Scene3MLWorkflow } from "./scenes/Scene3MLWorkflow";
import { Scene4AppDemo } from "./scenes/Scene4AppDemo";
import { Scene5Outro } from "./scenes/Scene5Outro";
import { SubtitleOverlay } from "./components/Subtitle";

// ─── Scene timing at 30fps ───────────────────────────────────────────────────
// Scene 1  Title         0s–3s     → frames 0–90
// Scene 2  Problem       3s–13s    → frames 90–390    (300f)
// Scene 3  ML Workflow   13s–35s   → frames 390–1050  (660f)
// Scene 4  App Demo      35s–65s   → frames 1050–1950 (900f)
// Scene 5  Outro         65s–75s   → frames 1950–2250 (300f)

export function RideOnVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FBF7F4" }}>
      <Sequence from={0} durationInFrames={90} premountFor={0}>
        <Scene1Title />
      </Sequence>

      <Sequence from={90} durationInFrames={300} premountFor={30}>
        <Scene2Problem />
      </Sequence>

      <Sequence from={390} durationInFrames={660} premountFor={30}>
        <Scene3MLWorkflow />
      </Sequence>

      <Sequence from={1050} durationInFrames={900} premountFor={30}>
        <Scene4AppDemo />
      </Sequence>

      <Sequence from={1950} durationInFrames={300} premountFor={30}>
        <Scene5Outro />
      </Sequence>

      {/* Subtitle overlay runs across all scenes using global frame */}
      <SubtitleOverlay />
    </AbsoluteFill>
  );
}
