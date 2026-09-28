import type { IndexedRepo } from "./github-indexer";

export interface ExportOptions {
  includeDescription: boolean;
  includeLanguage: boolean;
  includeTags: boolean;
  includeStars: boolean;
  includeUpdatedAt: boolean;
  includeUrl: boolean;
  includeReadme: boolean;
}

export const defaultExportOptions: ExportOptions = {
  includeDescription: true,
  includeLanguage: true,
  includeTags: false,
  includeStars: true,
  includeUpdatedAt: true,
  includeUrl: true,
  includeReadme: false,
};

export class CSVExporter {
  private escapeCSV(value: string): string {
    if (!value) return "";
    // Escape double quotes and wrap in quotes if contains comma, newline, or quote
    const stringValue = String(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes("\n") ||
      stringValue.includes('"')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  exportToCSV(repos: IndexedRepo[], options: ExportOptions): string {
    const headers: string[] = ["Owner", "Name", "Full Name"];

    if (options.includeDescription) headers.push("Description");
    if (options.includeLanguage) headers.push("Language");
    if (options.includeStars) headers.push("Stars");
    if (options.includeUpdatedAt) headers.push("Last Updated");
    if (options.includeUrl) headers.push("URL");
    if (options.includeReadme) headers.push("README Content");

    const rows: string[] = [headers.join(",")];

    for (const repo of repos) {
      const row: string[] = [
        this.escapeCSV(repo.owner),
        this.escapeCSV(repo.name),
        this.escapeCSV(repo.fullName),
      ];

      if (options.includeDescription) {
        row.push(this.escapeCSV(repo.description || ""));
      }
      if (options.includeLanguage) {
        row.push(this.escapeCSV(repo.language || ""));
      }
      if (options.includeStars) {
        row.push(String(repo.stars));
      }
      if (options.includeUpdatedAt) {
        row.push(this.escapeCSV(new Date(repo.updatedAt).toISOString()));
      }
      if (options.includeUrl) {
        row.push(this.escapeCSV(repo.url));
      }
      if (options.includeReadme) {
        row.push(this.escapeCSV(repo.readmeContent || ""));
      }

      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  downloadCSV(filename: string, csvContent: string): void {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
