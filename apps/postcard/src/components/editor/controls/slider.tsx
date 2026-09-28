import { useId } from "react";
import { Label } from "@/components/ui/label";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: SliderProps) {
  const id = useId();
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <Label htmlFor={id} className="mb-0">
          {label}
        </Label>
        <span className="text-xs font-mono text-neutral-500">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-neutral-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
      />
    </div>
  );
}
