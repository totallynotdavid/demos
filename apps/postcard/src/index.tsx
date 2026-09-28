import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Download } from "lucide-react";
import { ConfigPanel } from "@/components/editor/config-panel";
import { ViewToolbar } from "@/components/editor/view-toolbar";
import { PostcardCanvas } from "@/components/postcard/postcard-canvas";
import { usePostcardEditor } from "@/hooks/use-postcard-editor";

const BASE_SCALE = 1.5;

function App() {
  const { config, content, updateStyle, updateLayout, resetConfig } =
    usePostcardEditor();

  const [zoom, setZoom] = useState(1);
  const [showTexture, setShowTexture] = useState(true);

  const handleExport = () => {
    document.title = `${content.title} - Postcard`;
    window.print();
  };

  return (
    <div className="h-screen w-screen bg-[#1c1c1c] text-white flex overflow-hidden">
      <div className="flex-1 flex flex-col relative">
        {/* header */}
        <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-10">
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase">
              Postcard.Builder by @totallynotdavid
            </span>
          </div>

          <div className="pointer-events-auto flex gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-lg text-sm font-semibold shadow-lg transition-colors"
              title="Save as PDF using browser print"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </header>

        {/* workspace */}
        <main className="flex-1 flex items-center justify-center overflow-hidden relative">
          <div
            style={{ transform: `scale(${zoom * BASE_SCALE})` }}
            className="transition-transform duration-200 ease-out origin-center"
          >
            <PostcardCanvas
              config={config}
              content={content}
              showTexture={showTexture}
            />
          </div>

          {/* toolbar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <ViewToolbar
              zoom={zoom}
              onZoomIn={() => setZoom((z) => Math.min(z + 0.25, 2.0))}
              onZoomOut={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              showTexture={showTexture}
              onToggleTexture={() => setShowTexture(!showTexture)}
            />
          </div>
        </main>
      </div>

      {/* config sidebar */}
      <aside className="w-80 bg-neutral-900 border-l border-neutral-800 h-screen flex flex-col z-20 shadow-2xl">
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <ConfigPanel
            config={config}
            onUpdateStyle={updateStyle}
            onUpdateLayout={updateLayout}
            onReset={resetConfig}
          />
        </div>
      </aside>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
