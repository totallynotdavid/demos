"use client";

import { useState } from 'react';
import { CSVExporter, ExportOptions, defaultExportOptions } from '@/lib/csv-exporter';
import { IndexedRepo } from '@/lib/github-indexer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Info } from 'lucide-react';

interface ExportUIProps {
  repos: IndexedRepo[];
}

export function ExportUI({ repos }: ExportUIProps) {
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions);

  const handleExport = () => {
    const exporter = new CSVExporter();
    const csvContent = exporter.exportToCSV(repos, options);
    const filename = `github-starred-repos-${new Date().toISOString().split('T')[0]}.csv`;
    exporter.downloadCSV(filename, csvContent);
  };

  const updateOption = (key: keyof ExportOptions, value: boolean) => {
    setOptions({ ...options, [key]: value });
  };

  const exportOptions = [
    { key: 'includeDescription' as const, label: 'Description', description: 'Repository description' },
    { key: 'includeLanguage' as const, label: 'Language', description: 'Primary programming language' },
    { key: 'includeStars' as const, label: 'Stars', description: 'Number of stars' },
    { key: 'includeUpdatedAt' as const, label: 'Last updated', description: 'Last update timestamp' },
    { key: 'includeUrl' as const, label: 'URL', description: 'GitHub repository URL' },
    { key: 'includeReadme' as const, label: 'README content', description: 'Full README text (makes file large)' },
  ];

  const selectedCount = Object.values(options).filter(Boolean).length;

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export starred repositories
          </CardTitle>
          <CardDescription>
            {repos.length > 0
              ? `Export ${repos.length} indexed ${repos.length === 1 ? 'repository' : 'repositories'} to CSV`
              : 'Index repositories first to enable export'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {repos.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No repositories indexed yet. Use the "Starred repos" tab to index repositories first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Select fields to export</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which information to include in the CSV file
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {exportOptions.map((option) => (
                    <div key={option.key} className="flex items-start space-x-3">
                      <Checkbox
                        id={option.key}
                        checked={options[option.key]}
                        onCheckedChange={(checked) => 
                          updateOption(option.key, checked as boolean)
                        }
                      />
                      <div className="grid gap-1 leading-none">
                        <Label
                          htmlFor={option.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedCount} {selectedCount === 1 ? 'field' : 'fields'} selected
                  </span>
                  <span className="text-muted-foreground">
                    {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
                  </span>
                </div>

                <Button onClick={handleExport} className="w-full" disabled={selectedCount === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </Button>

                {selectedCount === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Select at least one field to export
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {repos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Preview
            </CardTitle>
            <CardDescription>Sample data from first repository</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-medium">Owner:</span>
                <span className="text-muted-foreground">{repos[0].owner}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-medium">Name:</span>
                <span className="text-muted-foreground">{repos[0].name}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-medium">Full name:</span>
                <span className="text-muted-foreground">{repos[0].fullName}</span>
              </div>
              {options.includeDescription && repos[0].description && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium">Description:</span>
                  <span className="text-muted-foreground line-clamp-2">{repos[0].description}</span>
                </div>
              )}
              {options.includeLanguage && repos[0].language && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium">Language:</span>
                  <span className="text-muted-foreground">{repos[0].language}</span>
                </div>
              )}
              {options.includeStars && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium">Stars:</span>
                  <span className="text-muted-foreground">{repos[0].stars.toLocaleString()}</span>
                </div>
              )}
              {options.includeUpdatedAt && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium">Last updated:</span>
                  <span className="text-muted-foreground">
                    {new Date(repos[0].updatedAt).toISOString()}
                  </span>
                </div>
              )}
              {options.includeUrl && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium">URL:</span>
                  <span className="text-muted-foreground truncate">{repos[0].url}</span>
                </div>
              )}
              {options.includeReadme && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium">README:</span>
                  <span className="text-muted-foreground line-clamp-2 font-mono text-xs">
                    {repos[0].readmeContent.slice(0, 100)}...
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
