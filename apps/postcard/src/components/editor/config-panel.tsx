import { RotateCcw } from "lucide-react";
import type { LayoutId, PostcardConfig, PostcardStyle } from "@/types/config";
import { ColorPicker } from "./controls/color-picker";
import { Select } from "./controls/select";
import { Slider } from "./controls/slider";

interface ConfigPanelProps {
  config: PostcardConfig;
  onUpdateStyle: (key: keyof PostcardStyle, value: string | number) => void;
  onUpdateLayout: (layout: LayoutId) => void;
  onReset: () => void;
}

const LAYOUT_OPTIONS = [
  { label: "Classic (clean)", value: "classic" },
  { label: "Organic (modernist)", value: "organic" },
  { label: "Swiss (bold)", value: "swiss" },
  { label: "Ethereal (soft)", value: "ethereal" },
];

const FONT_OPTIONS = [
  { label: "Inter (UI standard)", value: "var(--font-inter)" },
  { label: "Cormorant (elegant)", value: "var(--font-cormorant)" },
  { label: "Lato (clean)", value: "var(--font-lato)" },
  { label: "Oswald (impact)", value: "var(--font-oswald)" },
  { label: "Syne (artistic)", value: "var(--font-syne)" },
  { label: "Space Grotesk (tech)", value: "var(--font-space)" },
  { label: "Bodoni (fashion)", value: "var(--font-bodoni)" },
];

export function ConfigPanel({
  config,
  onUpdateStyle,
  onUpdateLayout,
  onReset,
}: ConfigPanelProps) {
  return (
    <div className="space-y-8 pb-12">
      {/* reset button */}
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset to defaults"
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
      >
        <RotateCcw className="w-4 h-4 stroke-[1.5]" />
        Reset to defaults
      </button>

      <hr className="border-neutral-800" />
      {/* type of layout */}
      <section className="space-y-4">
        <Select
          label="Design Layout"
          value={config.layout}
          options={LAYOUT_OPTIONS}
          onChange={(v) => onUpdateLayout(v as LayoutId)}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* typography */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Typography</h3>
        <Select
          label="Heading Font"
          value={config.style.fontHeading}
          options={FONT_OPTIONS}
          onChange={(v) => onUpdateStyle("fontHeading", v)}
        />
        <Select
          label="Body Font"
          value={config.style.fontBody}
          options={FONT_OPTIONS}
          onChange={(v) => onUpdateStyle("fontBody", v)}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* palette */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Palette</h3>
        <ColorPicker
          label="Paper Background"
          value={config.style.backgroundColor}
          onChange={(v) => onUpdateStyle("backgroundColor", v)}
        />
        <ColorPicker
          label="Ink Color"
          value={config.style.textColor}
          onChange={(v) => onUpdateStyle("textColor", v)}
        />
        <ColorPicker
          label="Accent Color"
          value={config.style.accentColor}
          onChange={(v) => onUpdateStyle("accentColor", v)}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* dimensions */}
      <section className="space-y-6">
        <h3 className="text-sm font-semibold text-white">Dimensions</h3>
        <Slider
          label="Edge Padding"
          value={config.style.padding}
          min={0}
          max={5}
          step={0.25}
          onChange={(v) => onUpdateStyle("padding", v)}
        />
        <Slider
          label="Element Spacing (Gap)"
          value={config.style.gap}
          min={0}
          max={4}
          step={0.25}
          onChange={(v) => onUpdateStyle("gap", v)}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* texture */}
      <section className="space-y-6">
        <h3 className="text-sm font-semibold text-white">Finishing</h3>
        <Slider
          label="Paper Grain Opacity"
          value={config.style.textureOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onUpdateStyle("textureOpacity", v)}
        />
      </section>
    </div>
  );
}
