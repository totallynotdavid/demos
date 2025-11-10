"use client";

import { useState } from 'react';
import { CSVExporter, ExportOptions, defaultExportOptions } from '@/lib/csv-exporter';
import { IndexedRepo } from '@/lib/github-indexer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ExportUIProps {
  repos: IndexedRepo[];
}

export function ExportUI({ repos }: ExportUIProps) {
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions);
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = () => {
    const exporter = new CSVExporter();
    const csvContent = exporter.exportToCSV(repos, options);
    const filename = `github-starred-repos-${new Date().toISOString().split('T')[0]}.csv`;
    exporter.downloadCSV(filename, csvContent);
  };

  const updateOption = (key: keyof ExportOptions, value: boolean) => {
    setOptions({ ...options, [key]: value });
  };

  const exportOptionsList = [
    { key: 'includeDescription' as const, label: 'Description' },
    { key: 'includeLanguage' as const, label: 'Language' },
    { key: 'includeStars' as const, label: 'Stars' },
    { key: 'includeUpdatedAt' as const, label: 'Last updated' },
    { key: 'includeUrl' as const, label: 'URL' },
    { key: 'includeReadme' as const, label: 'README content' },
  ];

  const selectedCount = Object.values(options).filter(Boolean).length;

  if (repos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => setShowOptions(!showOptions)}
          variant="ghost"
          className="h-11 px-6"
        >
          {showOptions ? 'Hide options' : 'Export to CSV'}
        </Button>
        {showOptions && (
          <Button 
            onClick={handleExport} 
            disabled={selectedCount === 0}
            className="h-11 px-8"
          >
            Download ({repos.length} repos)
          </Button>
        )}
      </div>

      {showOptions && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 pl-6 border-l-2 border-border/50">
          {exportOptionsList.map((option) => (
            <label key={option.key} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={options[option.key]}
                onCheckedChange={(checked) => 
                  updateOption(option.key, checked as boolean)
                }
              />
              <span className="text-sm group-hover:text-foreground transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}