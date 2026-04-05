import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {colors, fonts} from "../../../theme";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const glowScale = spring({frame, fps, config: {damping: 12}});

  const titleOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [10, 30], [40, 0], {
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(frame, [35, 55], [0, 1], {
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
      {/* Decorative amber glow */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}40 0%, transparent 70%)`,
          transform: `scale(${glowScale})`,
        }}
      />

      {/* App title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 80,
          fontWeight: fonts.weightBlack,
          color: colors.accent,
          letterSpacing: "-0.03em",
          textAlign: "center",
        }}
      >
        Golden Hour
      </div>
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 48,
          fontWeight: fonts.weightRegular,
          color: colors.teal200,
          marginTop: 8,
        }}
      >
        Planner
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          fontSize: 28,
          fontWeight: fonts.weightRegular,
          color: colors.teal300,
          marginTop: 32,
        }}
      >
        Plan your day. Track your streak. Stay productive.
      </div>
    </AbsoluteFill>
  );
};
