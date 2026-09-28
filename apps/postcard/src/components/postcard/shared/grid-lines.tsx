interface GridLinesProps {
  opacity?: number;
  color?: string;
}

export function GridLines({
  opacity = 0.1,
  color = "currentColor",
}: GridLinesProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity, color }}
    >
      {/* vertical lines */}
      <div className="absolute inset-0 flex justify-between px-(--p-padding)">
        <div className="w-px h-full bg-current" />
        <div className="w-px h-full bg-current opacity-50" />
        <div className="w-px h-full bg-current" />
      </div>

      {/* horizontal lines (thirds) */}
      <div className="absolute inset-0 flex flex-col justify-between py-(--p-padding)">
        <div className="h-px w-full bg-current" />
        <div className="h-px w-full bg-current opacity-50" />
        <div className="h-px w-full bg-current" />
      </div>
    </div>
  );
}
