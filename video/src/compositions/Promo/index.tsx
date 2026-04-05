import React from "react";
import {AbsoluteFill, Sequence} from "remotion";
import {colors, fontFamilyLoaded} from "../../theme";
import {IntroScene} from "./scenes/IntroScene";
import {FeaturesScene} from "./scenes/FeaturesScene";
import {CtaScene} from "./scenes/CtaScene";

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        fontFamily: fontFamilyLoaded,
      }}
    >
      {/* Scene 1: Title card (0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <IntroScene />
      </Sequence>

      {/* Scene 2: Feature showcase (3-7s) */}
      <Sequence from={90} durationInFrames={120}>
        <FeaturesScene />
      </Sequence>

      {/* Scene 3: Call to action (7-10s) */}
      <Sequence from={210} durationInFrames={90}>
        <CtaScene />
      </Sequence>
    </AbsoluteFill>
  );
};
