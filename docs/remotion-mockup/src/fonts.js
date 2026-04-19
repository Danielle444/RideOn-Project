import { loadFont } from "@remotion/google-fonts/Rubik";

export const { fontFamily: rubik } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["hebrew", "latin"],
});
