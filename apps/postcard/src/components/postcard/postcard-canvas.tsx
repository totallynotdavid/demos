import type { CSSProperties } from "react";
import type { PostcardConfig, PostcardContent } from "@/types/config";
import { ClassicLayout } from "./layouts/classic-layout";
import { EtherealLayout } from "./layouts/ethereal-layout";
import { OrganicLayout } from "./layouts/organic-layout";
import { SwissLayout } from "./layouts/swiss-layout";
import { TextureOverlay } from "./texture-overlay";

const LAYOUT_COMPONENTS = {
  classic: ClassicLayout,
  organic: OrganicLayout,
  swiss: SwissLayout,
  ethereal: EtherealLayout,
};

interface PostcardCanvasProps {
  config: PostcardConfig;
  content: PostcardContent;
  showTexture?: boolean;
}

export function PostcardCanvas({
  config,
  content,
  showTexture = true,
}: PostcardCanvasProps) {
  const LayoutComponent = LAYOUT_COMPONENTS[config.layout];

  const dynamicStyles = {
    "--p-bg": config.style.backgroundColor,
    "--p-ink": config.style.textColor,
    "--p-accent": config.style.accentColor,
    "--p-font-head": config.style.fontHeading,
    "--p-font-body": config.style.fontBody,
    "--p-padding": `${config.style.padding}rem`,
    "--p-gap": `${config.style.gap}rem`,
  } as CSSProperties;

  return (
    <div
      id="postcard-export-target"
      style={{
        width: config.dimensions.width,
        height: config.dimensions.height,
        ...dynamicStyles,
      }}
      className="bg-white shadow-2xl transition-all duration-300 relative transition-preview isolate overflow-hidden"
    >
      <LayoutComponent content={content} />

      {showTexture && <TextureOverlay opacity={config.style.textureOpacity} />}
    </div>
  );
}
