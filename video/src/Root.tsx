import React from "react";
import {Composition} from "remotion";
import {Promo} from "./compositions/Promo";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={Promo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
