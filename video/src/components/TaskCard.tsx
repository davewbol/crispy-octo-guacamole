import React from "react";
import {colors, fonts} from "../theme";

const priorityStyles = {
  A: {bg: colors.coral400, text: "#FFFFFF"},
  B: {bg: colors.amber400, text: colors.primary},
  C: {bg: colors.teal300, text: "#FFFFFF"},
};

interface TaskCardProps {
  priority: "A" | "B" | "C";
  title: string;
  time: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({priority, title, time}) => {
  const pStyle = priorityStyles[priority];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: "20px 28px",
        boxShadow: "0 4px 12px rgba(14, 36, 36, 0.08)",
        border: `1px solid ${colors.teal100}`,
      }}
    >
      {/* Priority badge */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: pStyle.bg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 20,
          fontWeight: fonts.weightBold,
          color: pStyle.text,
          flexShrink: 0,
        }}
      >
        {priority}
      </div>

      {/* Task info */}
      <div style={{flex: 1}}>
        <div
          style={{
            fontSize: 24,
            fontWeight: fonts.weightBold,
            color: colors.text,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 18,
            color: colors.textMuted,
            marginTop: 4,
          }}
        >
          {time}
        </div>
      </div>

      {/* Open status circle */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          border: `2px solid ${colors.teal300}`,
          flexShrink: 0,
        }}
      />
    </div>
  );
};
