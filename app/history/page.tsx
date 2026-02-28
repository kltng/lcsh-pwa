"use client";

import { useState } from "react";
import { useAppStore, type Conversation } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Eye, Calendar, Download, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { getSimilarityColor } from "@/lib/similarity";

function escCsv(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function buildConversationCSV(conversation: Conversation): string {
  const bib = conversation.bibliographicInfo;

  const header = [
    `# Title: ${escCsv(bib.title || "Untitled")}`,
    `# Author: ${escCsv(bib.author || "N/A")}`,
    ...(bib.abstract ? [`# Abstract: ${escCsv(bib.abstract)}`] : []),
    ...(bib.tableOfContents ? [`# Table of Contents: ${escCsv(bib.tableOfContents)}`] : []),
    ...(bib.notes ? [`# Notes: ${escCsv(bib.notes)}`] : []),
    ...(conversation.subjectAnalysis ? [`# Subject Analysis: ${escCsv(conversation.subjectAnalysis)}`] : []),
    `# Date: ${escCsv(new Date(conversation.timestamp).toLocaleString())}`,
    "",
  ];

  const rows = [
    ["Suggested Term", "Best Match", "Source", "Similarity", "URI", "AI Reasoning", "MARC"].map(escCsv).join(","),
    ...(conversation.finalRecommendations || []).map((rec) =>
      [
        rec.term,
        rec.bestMatch?.heading || "",
        (rec.source || "lcsh").toUpperCase(),
        `${rec.similarity}%`,
        rec.bestMatch?.uri || "",
        rec.justification || "",
        rec.marc || conversation.marcRecords?.[rec.term] || "",
      ].map(escCsv).join(",")
    ),
  ];

  return [...header, ...rows].join("\n");
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

function exportConversationCSV(conversation: Conversation) {
  const title = conversation.bibliographicInfo.title || "Untitled";
  const csv = buildConversationCSV(conversation);
  downloadCSV(csv, `lcsh-${title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40)}-${conversation.id}.csv`);
}

function exportAllConversationsCSV(conversations: Conversation[]) {
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const sections = sorted.map((conv, i) => {
    const section = buildConversationCSV(conv);
    return i < sorted.length - 1 ? section + "\n\n" : section;
  });

  const csv = sections.join("");
  downloadCSV(csv, `lcsh-all-sessions-${Date.now()}.csv`);
}

export default function HistoryPage() {
  const { conversations, deleteConversation, clearHistory } = useAppStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  function handleView(conversation: Conversation) {
    setSelectedConversation(conversation);
    setIsDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversation(id);
    }
  }

  function handleCopyMARC(index: number, marc: string) {
    navigator.clipboard.writeText(marc);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleCopyAllMARC(conversation: Conversation) {
    const recs = conversation.finalRecommendations || [];
    const allMarc = recs
      .map((rec) => rec.marc || conversation.marcRecords?.[rec.term] || "")
      .filter(Boolean)
      .join("\n");
    if (allMarc) {
      navigator.clipboard.writeText(allMarc);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Conversation History</h1>
          <p className="text-muted-foreground mt-2">
            Review your past LCSH recommendation sessions
          </p>
        </div>
        {conversations.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportAllConversationsCSV(conversations)}
            >
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button variant="destructive" onClick={() => {
              if (confirm("Are you sure you want to clear all history?")) {
                clearHistory();
              }
            }}>
              Clear All
            </Button>
          </div>
        )}
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No conversation history yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start a new session to see your history here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Actions</TableHead>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead className="min-w-[150px]">Title</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">Author</TableHead>
                  <TableHead className="w-[80px]">Terms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...conversations]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((conversation) => (
                    <TableRow key={conversation.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleView(conversation)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => exportConversationCSV(conversation)}
                            title="Export CSV"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(conversation.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{new Date(conversation.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-6">
                          {new Date(conversation.timestamp).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium line-clamp-2">
                          {conversation.bibliographicInfo.title || "Untitled"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="line-clamp-1">
                          {conversation.bibliographicInfo.author || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {conversation.finalRecommendations?.length || 0}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setCopiedIndex(null);
      }}>
        <DialogContent className="!max-w-3xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <div className="p-6 pb-4 border-b shrink-0">
            <DialogHeader>
              <DialogTitle>
                {selectedConversation?.bibliographicInfo.title || "Conversation Details"}
              </DialogTitle>
              <DialogDescription>
                {selectedConversation &&
                  new Date(selectedConversation.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            {selectedConversation && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportConversationCSV(selectedConversation)}
                >
                  <Download className="mr-2 h-3 w-3" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyAllMARC(selectedConversation)}
                >
                  {copiedAll ? (
                    <>
                      <CheckCircle2 className="mr-2 h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3 w-3" />
                      Copy All MARC
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {selectedConversation && (
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Bibliographic Information */}
              <section>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Bibliographic Information
                </h3>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <span className="font-medium">Title</span>
                  <span>{selectedConversation.bibliographicInfo.title || "N/A"}</span>
                  <span className="font-medium">Author</span>
                  <span>{selectedConversation.bibliographicInfo.author || "N/A"}</span>
                  {selectedConversation.bibliographicInfo.abstract && (
                    <>
                      <span className="font-medium self-start">Abstract</span>
                      <span className="text-muted-foreground">
                        {selectedConversation.bibliographicInfo.abstract}
                      </span>
                    </>
                  )}
                  {selectedConversation.bibliographicInfo.tableOfContents && (
                    <>
                      <span className="font-medium self-start">Contents</span>
                      <span className="text-muted-foreground whitespace-pre-line">
                        {selectedConversation.bibliographicInfo.tableOfContents}
                      </span>
                    </>
                  )}
                  {selectedConversation.bibliographicInfo.notes && (
                    <>
                      <span className="font-medium self-start">Notes</span>
                      <span className="text-muted-foreground">
                        {selectedConversation.bibliographicInfo.notes}
                      </span>
                    </>
                  )}
                </div>
              </section>

              {/* Subject Analysis */}
              {selectedConversation.subjectAnalysis && (
                <section>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Subject Analysis
                  </h3>
                  <p className="text-sm bg-muted/50 rounded-md p-3">
                    {selectedConversation.subjectAnalysis}
                  </p>
                </section>
              )}

              {/* Recommended Terms */}
              {selectedConversation.finalRecommendations && selectedConversation.finalRecommendations.length > 0 && (
                <section>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Recommended Terms ({selectedConversation.finalRecommendations.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedConversation.finalRecommendations.map((rec, idx) => {
                      const marc = rec.marc || selectedConversation.marcRecords?.[rec.term] || "";
                      const isCopied = copiedIndex === idx;

                      return (
                        <div key={idx} className="border rounded-lg p-3 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="font-medium">{rec.term}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {rec.isAdditional && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  AI Additional
                                </Badge>
                              )}
                              {rec.source && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {rec.source.toUpperCase()}
                                </Badge>
                              )}
                              <Badge
                                className="text-[10px] h-5"
                                style={{
                                  backgroundColor: getSimilarityColor(rec.similarity || 0),
                                  color: "white",
                                }}
                              >
                                {rec.similarity}%
                              </Badge>
                            </div>
                          </div>

                          {rec.bestMatch && (
                            <div className="text-sm text-muted-foreground">
                              Best Match: <span className="text-foreground">{rec.bestMatch.heading}</span>
                              {rec.bestMatch.uri && (
                                <a
                                  href={rec.bestMatch.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1.5 text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {rec.justification && (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                              {rec.justification}
                            </p>
                          )}

                          {marc && (
                            <div className="flex items-start gap-2">
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto flex-1">
                                {marc}
                              </pre>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => handleCopyMARC(idx, marc)}
                              >
                                {isCopied ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
