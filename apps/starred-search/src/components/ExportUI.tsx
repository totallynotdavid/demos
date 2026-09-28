import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  cn,
  colors,
  effects,
  layout,
  sizing,
  spacing,
  typography,
} from "@/config/design-tokens";
import {
  CSVExporter,
  defaultExportOptions,
  type ExportOptions,
} from "@/lib/csv-exporter";
import type { IndexedRepo } from "@/lib/github-indexer";

interface ExportUIProps {
  repos: IndexedRepo[];
  className?: string;
}

export function ExportUI({ repos, className }: ExportUIProps) {
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions);
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = () => {
    const exporter = new CSVExporter();
    const csvContent = exporter.exportToCSV(repos, options);
    const filename = `github-starred-repos-${new Date().toISOString().split("T")[0]}.csv`;
    exporter.downloadCSV(filename, csvContent);
  };

  const updateOption = (key: keyof ExportOptions, value: boolean) => {
    setOptions({ ...options, [key]: value });
  };

  const exportOptionsList = [
    { key: "includeDescription" as const, label: "Description" },
    { key: "includeLanguage" as const, label: "Language" },
    { key: "includeStars" as const, label: "Stars" },
    { key: "includeUpdatedAt" as const, label: "Last updated" },
    { key: "includeUrl" as const, label: "URL" },
    { key: "includeReadme" as const, label: "README content" },
  ];

  const selectedCount = Object.values(options).filter(Boolean).length;

  if (repos.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className={cn("flex items-center", spacing.gridMedium)}>
        <Button
          onClick={() => setShowOptions(!showOptions)}
          variant="ghost"
          className={cn(sizing.button, sizing.buttonWide)}
        >
          {showOptions ? "Hide options" : "Export to CSV"}
        </Button>
        {showOptions && (
          <Button
            onClick={handleExport}
            disabled={selectedCount === 0}
            className={cn(sizing.button, sizing.buttonNormal)}
          >
            Download ({repos.length} repos)
          </Button>
        )}
      </div>

      {showOptions && (
        <div
          className={cn(
            layout.grid2Col,
            spacing.gridWideX,
            spacing.gridWideY,
            "pl-6",
            effects.borderLeft,
            colors.border,
          )}
        >
          {exportOptionsList.map((option) => (
            <label
              key={option.key}
              htmlFor={option.key}
              className={cn("flex items-center gap-2.5 cursor-pointer group")}
            >
              <Checkbox
                id={option.key}
                checked={options[option.key]}
                onCheckedChange={(checked) =>
                  updateOption(option.key, checked as boolean)
                }
              />
              <span
                className={cn(
                  typography.textSm,
                  "group-hover:text-foreground",
                  effects.transitionColors,
                )}
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
