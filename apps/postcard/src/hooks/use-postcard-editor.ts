import { useCallback, useState } from "react";
import { DEFAULT_CONFIG, DEFAULT_CONTENT } from "@/data/default-content";
import { LAYOUT_PRESETS } from "@/data/layout-presets";
import type {
  LayoutId,
  PostcardConfig,
  PostcardContent,
  PostcardStyle,
} from "@/types/config";

export function usePostcardEditor() {
  const [config, setConfig] = useState<PostcardConfig>(DEFAULT_CONFIG);
  const [content, setContent] = useState<PostcardContent>(DEFAULT_CONTENT);

  const updateStyle = useCallback(
    (key: keyof PostcardStyle, value: string | number) => {
      setConfig((prev) => ({
        ...prev,
        style: {
          ...prev.style,
          [key]: value,
        },
      }));
    },
    [],
  );

  const updateLayout = useCallback((layout: LayoutId) => {
    setConfig((prev) => ({
      ...prev,
      layout,
      style: LAYOUT_PRESETS[layout],
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setContent(DEFAULT_CONTENT);
  }, []);

  return {
    config,
    content,
    setContent,
    updateStyle,
    updateLayout,
    resetConfig,
  };
}
