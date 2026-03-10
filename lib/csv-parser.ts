/**
 * CSV Parser + Column Auto-Detection
 * Pure utility, no React dependencies.
 */

import type { BibliographicInfo } from "./ai-pipeline";

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  columnMapping: ColumnMapping;
}

export interface ColumnMapping {
  title?: number;
  author?: number;
  abstract?: number;
  tableOfContents?: number;
  notes?: number;
}

export interface BatchItem {
  rowIndex: number;
  bibliographicInfo: BibliographicInfo;
}

/**
 * State-machine CSV parser. Handles quoted fields, embedded commas, and newlines within quotes.
 */
export function parseCSV(text: string): CSVParseResult {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
      } else if (char === "\r") {
        // Handle \r\n or standalone \r
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        if (i < text.length && text[i] === "\n") {
          i++;
        }
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Handle last field/row
  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], columnMapping: {} };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const columnMapping = autoDetectColumns(headers);

  return { headers, rows: dataRows, columnMapping };
}

/**
 * Case-insensitive header matching for common bibliographic fields.
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => h.toLowerCase().replace(/[\s_-]+/g, ""));

  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];

    if (!mapping.title && h === "title") {
      mapping.title = i;
    } else if (!mapping.author && h === "author") {
      mapping.author = i;
    } else if (
      mapping.abstract === undefined &&
      (h === "abstract" || h === "summary" || h === "description")
    ) {
      mapping.abstract = i;
    } else if (
      mapping.tableOfContents === undefined &&
      (h === "tableofcontents" || h === "table_of_contents" || h === "toc" || h === "contents")
    ) {
      mapping.tableOfContents = i;
    } else if (
      mapping.notes === undefined &&
      (h === "notes" || h === "note" || h === "remarks" || h === "comments")
    ) {
      mapping.notes = i;
    }
  }

  return mapping;
}

/**
 * Convert parsed rows to BatchItem[] using the column mapping.
 * Skips rows where all mapped fields are empty.
 */
export function mapRowsToBatchItems(
  rows: string[][],
  mapping: ColumnMapping
): BatchItem[] {
  const items: BatchItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const title = mapping.title !== undefined ? row[mapping.title] || "" : "";
    const author = mapping.author !== undefined ? row[mapping.author] || "" : "";
    const abstract = mapping.abstract !== undefined ? row[mapping.abstract] || "" : "";
    const tableOfContents =
      mapping.tableOfContents !== undefined ? row[mapping.tableOfContents] || "" : "";
    const notes = mapping.notes !== undefined ? row[mapping.notes] || "" : "";

    // Skip empty rows
    if (!title && !author && !abstract && !tableOfContents && !notes) continue;

    items.push({
      rowIndex: i,
      bibliographicInfo: {
        title,
        author,
        abstract,
        tableOfContents,
        notes,
      },
    });
  }

  return items;
}
