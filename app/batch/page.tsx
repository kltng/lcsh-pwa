"use client";

import { useState, useCallback, useRef } from "react";
import { useAppStore, type Recommendation } from "@/lib/store";
import {
  parseCSV,
  autoDetectColumns,
  mapRowsToBatchItems,
  type CSVParseResult,
  type ColumnMapping,
  type BatchItem,
} from "@/lib/csv-parser";
import {
  createBatchProcessor,
  type BatchItemResult,
  type BatchProgress,
} from "@/lib/batch-processor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getSimilarityColor } from "@/lib/similarity";

type Phase = "upload" | "preview" | "processing" | "results";

const COLUMN_FIELDS = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "abstract", label: "Abstract" },
  { key: "tableOfContents", label: "Table of Contents" },
  { key: "notes", label: "Notes" },
] as const;

type ColumnKey = (typeof COLUMN_FIELDS)[number]["key"];

function escCsv(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchPage() {
  const {
    provider,
    modelId,
    getApiKeyForProvider,
    getBaseURLForProvider,
    systemPromptRules,
    addConversation,
  } = useAppStore();

  const [phase, setPhase] = useState<Phase>("upload");
  const [csvResult, setCsvResult] = useState<CSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const cancelRef = useRef<(() => void) | null>(null);

  // --- Upload Phase ---

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          setError("The CSV file is empty.");
          return;
        }
        const parsed = parseCSV(text);
        if (parsed.rows.length === 0) {
          setError("No data rows found in the CSV file.");
          return;
        }
        setCsvResult(parsed);
        setColumnMapping(parsed.columnMapping);
        const items = mapRowsToBatchItems(parsed.rows, parsed.columnMapping);
        setBatchItems(items);
        setPhase("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV file.");
      }
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // --- Preview Phase ---

  const handleMappingChange = useCallback(
    (field: ColumnKey, value: string) => {
      const newMapping = { ...columnMapping };
      if (value === "none") {
        delete newMapping[field];
      } else {
        newMapping[field] = parseInt(value, 10);
      }
      setColumnMapping(newMapping);
      if (csvResult) {
        setBatchItems(mapRowsToBatchItems(csvResult.rows, newMapping));
      }
    },
    [columnMapping, csvResult]
  );

  const settingsValid = provider && modelId && getApiKeyForProvider(provider);

  // --- Processing Phase ---

  const startProcessing = useCallback(
    async (itemsToProcess?: BatchItem[]) => {
      if (!provider || !modelId) return;

      const apiKey = getApiKeyForProvider(provider);
      const baseURL = getBaseURLForProvider(provider);
      if (!apiKey) return;

      const items = itemsToProcess || batchItems;
      setPhase("processing");
      setResults(
        items.map((item) => ({
          rowIndex: item.rowIndex,
          status: "pending",
          bibliographicInfo: item.bibliographicInfo,
        }))
      );
      setProgress({
        total: items.length,
        completed: 0,
        succeeded: 0,
        failed: 0,
        cancelled: 0,
        currentIndex: 0,
      });

      const processor = createBatchProcessor(items, {
        modelId,
        provider,
        apiKey,
        baseURL,
        systemPromptRules,
        onItemStart: (index) => {
          setResults((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: "processing" };
            return updated;
          });
        },
        onItemComplete: (result) => {
          setResults((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex((r) => r.rowIndex === result.rowIndex);
            if (idx >= 0) updated[idx] = result;
            return updated;
          });

          // Save successful items to history immediately
          if (result.status === "success" && result.recommendations) {
            addConversation({
              bibliographicInfo: result.bibliographicInfo,
              subjectAnalysis: result.subjectAnalysis,
              finalRecommendations: result.recommendations,
              marcRecords: result.marcRecords,
            });
          }
        },
        onProgress: (p) => setProgress({ ...p }),
      });

      cancelRef.current = processor.cancel;
      await processor.start();
      cancelRef.current = null;
      setPhase("results");
    },
    [
      provider,
      modelId,
      batchItems,
      getApiKeyForProvider,
      getBaseURLForProvider,
      systemPromptRules,
      addConversation,
    ]
  );

  const handleCancel = useCallback(() => {
    cancelRef.current?.();
  }, []);

  // --- Results Phase ---

  const handleExportAllCSV = useCallback(() => {
    const successful = results.filter((r) => r.status === "success");
    if (successful.length === 0) return;

    const sections = successful.map((result) => {
      const bib = result.bibliographicInfo;
      const header = [
        `# Title: ${escCsv(bib.title || "Untitled")}`,
        `# Author: ${escCsv(bib.author || "N/A")}`,
        ...(bib.abstract ? [`# Abstract: ${escCsv(bib.abstract)}`] : []),
        ...(result.subjectAnalysis
          ? [`# Subject Analysis: ${escCsv(result.subjectAnalysis)}`]
          : []),
        "",
      ];

      const rows = [
        ["Suggested Term", "Best Match", "Source", "Similarity", "URI", "AI Reasoning", "MARC"]
          .map(escCsv)
          .join(","),
        ...(result.recommendations || []).map((rec) =>
          [
            rec.term,
            rec.bestMatch?.heading || "",
            (rec.source || "lcsh").toUpperCase(),
            `${rec.similarity}%`,
            rec.bestMatch?.uri || "",
            rec.justification || "",
            rec.marc || result.marcRecords?.[rec.term] || "",
          ]
            .map(escCsv)
            .join(",")
        ),
      ];

      return [...header, ...rows].join("\n");
    });

    downloadCSV(sections.join("\n\n"), `lcsh-batch-${Date.now()}.csv`);
  }, [results]);

  const handleRetryFailed = useCallback(() => {
    const failedItems = results
      .filter((r) => r.status === "error")
      .map((r) => ({
        rowIndex: r.rowIndex,
        bibliographicInfo: r.bibliographicInfo,
      }));
    if (failedItems.length > 0) {
      startProcessing(failedItems);
    }
  }, [results, startProcessing]);

  const handleReset = useCallback(() => {
    setPhase("upload");
    setCsvResult(null);
    setColumnMapping({});
    setBatchItems([]);
    setResults([]);
    setProgress(null);
    setError(null);
    setExpandedRows(new Set());
  }, []);

  const toggleRow = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // --- Status badges ---

  function StatusBadge({ status }: { status: BatchItemResult["status"] }) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge className="gap-1 bg-blue-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "success":
        return (
          <Badge className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
    }
  }

  // --- Mapped columns label ---

  const mappedColumns = COLUMN_FIELDS.filter(
    (f) => columnMapping[f.key] !== undefined
  ).map((f) => f.label);

  // === RENDER ===

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Batch Processing</h1>
        <p className="text-muted-foreground mt-2">
          Upload a CSV file to process multiple works at once
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ===== UPLOAD PHASE ===== */}
      {phase === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Drag & drop a CSV file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" asChild>
                  <span>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Choose CSV File
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Expected columns: title, author, abstract (or summary/description), toc (or
              table_of_contents/contents), notes (or remarks/comments). Column headers are
              auto-detected.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ===== PREVIEW PHASE ===== */}
      {phase === "preview" && csvResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSV Summary</CardTitle>
              <CardDescription>
                Found {batchItems.length} rows with columns:{" "}
                {mappedColumns.length > 0 ? mappedColumns.join(", ") : "none detected"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {columnMapping.title === undefined && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No &quot;title&quot; column detected. Consider mapping one below for
                    better results.
                  </AlertDescription>
                </Alert>
              )}

              {!settingsValid && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Please configure your AI provider, model, and API key in{" "}
                    <Link href="/settings" className="underline font-medium">
                      Settings
                    </Link>{" "}
                    before processing.
                  </AlertDescription>
                </Alert>
              )}

              {/* Column mapping editor */}
              <div>
                <h4 className="font-medium text-sm mb-3">Column Mapping</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {COLUMN_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <span className="text-sm w-28 shrink-0">{field.label}:</span>
                      <Select
                        value={
                          columnMapping[field.key] !== undefined
                            ? String(columnMapping[field.key])
                            : "none"
                        }
                        onValueChange={(v) => handleMappingChange(field.key, v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Not mapped —</SelectItem>
                          {csvResult.headers.map((header, idx) => (
                            <SelectItem key={idx} value={String(idx)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          <Card>
            <CardHeader>
              <CardTitle>Preview (first 5 rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {COLUMN_FIELDS.filter((f) => columnMapping[f.key] !== undefined).map(
                        (f) => (
                          <TableHead key={f.key}>{f.label}</TableHead>
                        )
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchItems.slice(0, 5).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        {COLUMN_FIELDS.filter((f) => columnMapping[f.key] !== undefined).map(
                          (f) => (
                            <TableCell key={f.key} className="max-w-[200px] truncate">
                              {(item.bibliographicInfo as Record<string, any>)[f.key] || ""}
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Back
            </Button>
            <Button onClick={() => startProcessing()} disabled={!settingsValid || batchItems.length === 0}>
              Start Processing ({batchItems.length} items)
            </Button>
          </div>
        </div>
      )}

      {/* ===== PROCESSING PHASE ===== */}
      {(phase === "processing" || phase === "results") && progress && (
        <div className="space-y-6">
          {phase === "processing" && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Batch</CardTitle>
                <CardDescription>
                  Processing item {progress.currentIndex + 1} of {progress.total}
                  {results[progress.currentIndex] && (
                    <>
                      :{" "}
                      <span className="font-medium">
                        {results[progress.currentIndex].bibliographicInfo.title || "Untitled"}
                      </span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress
                  value={(progress.completed / progress.total) * 100}
                  className="h-3"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {progress.completed} / {progress.total} completed
                  </span>
                  <span>
                    {progress.succeeded} succeeded, {progress.failed} failed
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {phase === "results" && (
            <Card>
              <CardHeader>
                <CardTitle>Batch Complete</CardTitle>
                <CardDescription>
                  {progress.succeeded} succeeded, {progress.failed} failed
                  {progress.cancelled > 0 && `, ${progress.cancelled} cancelled`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleExportAllCSV} disabled={progress.succeeded === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All CSV
                  </Button>
                  {progress.failed > 0 && (
                    <Button variant="outline" onClick={handleRetryFailed}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retry Failed ({progress.failed})
                    </Button>
                  )}
                  <Button onClick={handleReset}>Start New Batch</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-24">Terms</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, i) => {
                      const isExpanded = expandedRows.has(i);
                      const hasDetails =
                        result.status === "success" || result.status === "error";

                      return (
                        <>
                          <TableRow
                            key={`row-${i}`}
                            className={hasDetails ? "cursor-pointer" : ""}
                            onClick={() => hasDetails && toggleRow(i)}
                          >
                            <TableCell>
                              {hasDetails &&
                                (isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                ))}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-medium max-w-[300px] truncate">
                              {result.bibliographicInfo.title || "Untitled"}
                            </TableCell>
                            <TableCell>
                              {result.recommendations?.length || "—"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={result.status} />
                            </TableCell>
                          </TableRow>

                          {isExpanded && hasDetails && (
                            <TableRow key={`detail-${i}`}>
                              <TableCell colSpan={5} className="bg-muted/30 p-4">
                                {result.status === "error" && (
                                  <p className="text-sm text-destructive">
                                    Error: {result.error}
                                  </p>
                                )}
                                {result.status === "success" &&
                                  result.recommendations && (
                                    <div className="space-y-2">
                                      {result.subjectAnalysis && (
                                        <p className="text-sm text-muted-foreground mb-3 bg-muted/50 rounded p-2">
                                          {result.subjectAnalysis}
                                        </p>
                                      )}
                                      {result.recommendations.map((rec, rIdx) => {
                                        const marc =
                                          rec.marc ||
                                          result.marcRecords?.[rec.term] ||
                                          "";
                                        return (
                                          <div
                                            key={rIdx}
                                            className="border rounded p-3 bg-background space-y-1"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="font-medium text-sm">
                                                {rec.term}
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                {rec.source && (
                                                  <Badge
                                                    variant="secondary"
                                                    className="text-[10px] h-5"
                                                  >
                                                    {rec.source.toUpperCase()}
                                                  </Badge>
                                                )}
                                                <Badge
                                                  className="text-[10px] h-5"
                                                  style={{
                                                    backgroundColor:
                                                      getSimilarityColor(
                                                        rec.similarity || 0
                                                      ),
                                                    color: "white",
                                                  }}
                                                >
                                                  {rec.similarity}%
                                                </Badge>
                                              </div>
                                            </div>
                                            {rec.bestMatch && (
                                              <div className="text-xs text-muted-foreground">
                                                Best Match:{" "}
                                                <span className="text-foreground">
                                                  {rec.bestMatch.heading}
                                                </span>
                                                {rec.bestMatch.uri && (
                                                  <a
                                                    href={rec.bestMatch.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-1 text-primary hover:underline inline-flex items-center gap-0.5"
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                  >
                                                    <ExternalLink className="h-3 w-3" />
                                                  </a>
                                                )}
                                              </div>
                                            )}
                                            {marc && (
                                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-1">
                                                {marc}
                                              </pre>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
