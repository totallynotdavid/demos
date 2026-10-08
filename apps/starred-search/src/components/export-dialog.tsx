import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COLUMNS, downloadCsv, toCsv } from "@/lib/csv-exporter";
import type { Repo } from "@/lib/types";

interface Props {
  open: boolean;
  shown: Repo[];
  all: Repo[];
  onClose(): void;
}

export function ExportDialog({ open, shown, all, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [columns, setColumns] = useState(() =>
    COLUMNS.filter((column) => column.default).map((column) => column.id),
  );
  const [scope, setScope] = useState<"shown" | "all">("shown");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const repos = scope === "shown" ? shown : all;
  const toggle = (id: string) =>
    setColumns((current) =>
      current.includes(id)
        ? current.filter((column) => column !== id)
        : [...current, id],
    );

  const download = () => {
    downloadCsv("starred-repos.csv", toCsv(repos, columns));
    onClose();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click is a pointer shortcut, Escape closes a dialog
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-fg backdrop:bg-black/40"
    >
      <div className="space-y-4 p-5">
        <h2 className="text-base font-semibold">Export to CSV</h2>

        <fieldset className="space-y-1.5">
          <legend className="text-[13px] font-medium">Rows</legend>
          {(
            [
              ["shown", `The ${shown.length} in this view`],
              ["all", `All ${all.length} cached`],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="scope"
                checked={scope === value}
                onChange={() => setScope(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="text-[13px] font-medium">Columns</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {COLUMNS.map((column) => (
              <label key={column.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={columns.includes(column.id)}
                  onChange={() => toggle(column.id)}
                />
                {column.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={columns.length === 0 || repos.length === 0}
            onClick={download}
          >
            <Download className="size-3.5" />
            Download
          </button>
        </div>
      </div>
    </dialog>
  );
}
