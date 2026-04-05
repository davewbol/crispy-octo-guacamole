import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {colors, fonts} from "../../../theme";

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({frame, fps, config: {damping: 10, mass: 0.8}});
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const urlFade = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.primary,
      }}
    >
      <div
        style={{
          opacity: fadeIn,
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: fonts.weightBold,
            color: colors.surface,
            marginBottom: 32,
          }}
        >
          Start Planning Smarter
        </div>

        {/* Simulated CTA button */}
        <div
          style={{
            display: "inline-block",
            padding: "18px 48px",
            backgroundColor: colors.accent,
            borderRadius: 12,
            fontSize: 28,
            fontWeight: fonts.weightBold,
            color: colors.primary,
          }}
        >
          Try Golden Hour Planner
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 80,
          opacity: urlFade,
          fontSize: 24,
          color: colors.teal300,
        }}
      >
        goldenhourplanner.com
      </div>
    </AbsoluteFill>
  );
};
