import { Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";

interface ViewToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showTexture: boolean;
  onToggleTexture: () => void;
}

export function ViewToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  showTexture,
  onToggleTexture,
}: ViewToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/90 backdrop-blur text-white rounded-full shadow-xl border border-neutral-700">
      <button
        type="button"
        onClick={onToggleTexture}
        className="p-2 hover:bg-neutral-700 rounded-full transition-colors tooltip"
        title="Toggle Print Texture"
      >
        {showTexture ? (
          <Eye className="w-4 h-4 text-neutral-200" />
        ) : (
          <EyeOff className="w-4 h-4 text-neutral-400" />
        )}
      </button>

      <div className="w-px h-4 bg-neutral-700 mx-1" />

      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= 0.5}
        className="p-2 hover:bg-neutral-700 disabled:opacity-50 rounded-full transition-colors"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <span className="text-xs font-mono min-w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= 1.5}
        className="p-2 hover:bg-neutral-700 disabled:opacity-50 rounded-full transition-colors"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
}
