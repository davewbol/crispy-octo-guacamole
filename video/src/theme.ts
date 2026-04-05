import {loadFont} from "@remotion/google-fonts/Outfit";

const {fontFamily} = loadFont();

export const fontFamilyLoaded = fontFamily;

export const colors = {
  // Teal scale
  teal900: "#0E2424",
  teal800: "#1A3A3A",
  teal700: "#2A5454",
  teal600: "#3D5C5C",
  teal500: "#4A7C7C",
  teal400: "#5C9E9E",
  teal300: "#8CB3B3",
  teal200: "#B8D4D4",
  teal100: "#DFF0F0",
  teal50: "#F7FAFA",

  // Amber scale
  amber600: "#D49A1A",
  amber500: "#EAA922",
  amber400: "#FFB932",
  amber300: "#FFCB66",
  amber200: "#FFDD99",
  amber100: "#FFF0CC",

  // Sage scale
  sage500: "#2E7D4F",
  sage400: "#3D9A65",
  sage300: "#6BB88A",
  sage200: "#A8D5B8",
  sage100: "#D6EDDE",

  // Coral scale
  coral500: "#D94E3A",
  coral400: "#F06650",
  coral300: "#F4887A",
  coral200: "#F9B4AB",
  coral100: "#FDE0DC",

  // Semantic
  primary: "#1A3A3A",
  accent: "#FFB932",
  success: "#3D9A65",
  error: "#F06650",
  background: "#F7FAFA",
  surface: "#FFFFFF",
  text: "#1A3A3A",
  textMuted: "#6B8080",
} as const;

export const fonts = {
  primary: fontFamily,
  weightRegular: 400,
  weightBold: 700,
  weightExtrabold: 800,
  weightBlack: 900,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
} as const;
