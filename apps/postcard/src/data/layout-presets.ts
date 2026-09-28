import type { LayoutId, PostcardStyle } from "@/types/config";

export const LAYOUT_PRESETS: Record<LayoutId, PostcardStyle> = {
  classic: {
    fontHeading: "var(--font-cormorant)",
    fontBody: "var(--font-lato)",
    backgroundColor: "#F3F2ED",
    textColor: "#4A5D4F",
    accentColor: "#8C9E8E",
    padding: 2,
    gap: 1.25,
    textureOpacity: 0.25,
  },
  swiss: {
    fontHeading: "var(--font-oswald)",
    fontBody: "var(--font-inter)",
    backgroundColor: "#F5F5F0",
    textColor: "#1A1A1A",
    accentColor: "#FF3333",
    padding: 1.5,
    gap: 2,
    textureOpacity: 0.05,
  },
  organic: {
    fontHeading: "var(--font-syne)",
    fontBody: "var(--font-space)",
    backgroundColor: "#FFFFFF",
    textColor: "#2D3436",
    accentColor: "#81ECEC",
    padding: 2.5,
    gap: 1,
    textureOpacity: 0,
  },
  ethereal: {
    fontHeading: "var(--font-bodoni)",
    fontBody: "var(--font-lato)",
    backgroundColor: "#FFFEFA",
    textColor: "#636E72",
    accentColor: "#DFE6E9",
    padding: 3,
    gap: 1,
    textureOpacity: 0.4,
  },
};
