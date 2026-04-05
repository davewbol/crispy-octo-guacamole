import React from "react";
import {AbsoluteFill, useCurrentFrame, interpolate} from "remotion";
import {colors, fonts} from "../../../theme";
import {TaskCard} from "../../../components/TaskCard";

const tasks = [
  {priority: "A" as const, title: "Morning workout", time: "6:30 AM"},
  {priority: "B" as const, title: "Team standup meeting", time: "9:00 AM"},
  {priority: "C" as const, title: "Read 30 minutes", time: "8:00 PM"},
];

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();

  const headingOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
        padding: 80,
      }}
    >
      <div
        style={{
          opacity: headingOpacity,
          fontSize: 52,
          fontWeight: fonts.weightExtrabold,
          color: colors.primary,
          marginBottom: 48,
          letterSpacing: "-0.02em",
        }}
      >
        Your Day, Organized
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: 700,
        }}
      >
        {tasks.map((task, i) => {
          const delay = 15 + i * 15;
          const slideX = interpolate(frame, [delay, delay + 20], [-200, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{opacity, transform: `translateX(${slideX}px)`}}
            >
              <TaskCard
                priority={task.priority}
                title={task.title}
                time={task.time}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
