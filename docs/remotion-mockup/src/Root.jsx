import { Composition } from "remotion";
import { RideOnVideo } from "./RideOnVideo";

// 75 seconds × 30fps = 2250 frames
export function Root() {
  return (
    <Composition
      id="RideOnSmartPrediction"
      component={RideOnVideo}
      durationInFrames={2250}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
