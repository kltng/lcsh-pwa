"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { generateMarcRecords, parseMarcRecords } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { getSimilarityColor, getSimilarityLabel } from "@/lib/similarity";

export function FinalRecommendations() {
  const router = useRouter();
  const {
    bibliographicInfo,
    finalRecommendations,
    marcRecords,
    setActiveStep,
    setMarcRecords,
    addConversation,
    apiKey,
    modelId,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useAppStore();

  const [sortedRecommendations, setSortedRecommendations] = useState(
    finalRecommendations || []
  );
  const [averageSimilarity, setAverageSimilarity] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [processingMarc, setProcessingMarc] = useState(false);

  useEffect(() => {
    if (finalRecommendations && finalRecommendations.length > 0) {
      const sorted = [...finalRecommendations].sort(
        (a, b) => (b.similarity || 0) - (a.similarity || 0)
      );
      setSortedRecommendations(sorted);

      const validRecommendations = finalRecommendations.filter(
        (rec) => rec.similarity !== undefined && rec.similarity > 30
      );
      if (validRecommendations.length > 0) {
        const totalSimilarity = validRecommendations.reduce(
          (sum, rec) => sum + (rec.similarity || 0),
          0
        );
        setAverageSimilarity(Math.round(totalSimilarity / validRecommendations.length));
      }

      generateMarcRecordsForHighScoring(sorted);
    }
  }, [finalRecommendations]);

  async function generateMarcRecordsForHighScoring(
    recommendations: typeof sortedRecommendations
  ) {
    if (!modelId || !apiKey) return;

    const highScoring = recommendations.filter(
      (rec) => rec.similarity && rec.similarity > 30 && rec.bestMatch
    );

    if (highScoring.length === 0) return;

    try {
      setProcessingMarc(true);
      const result = await generateMarcRecords({
        modelId,
        apiKey,
        recommendations: highScoring,
      });

      const terms = highScoring.map((r) => r.term);
      const parsed = parseMarcRecords(result, terms);
      setMarcRecords(parsed);
    } catch (err) {
      console.error("Error generating MARC records:", err);
    } finally {
      setProcessingMarc(false);
    }
  }

  function handleCopyMARC(index: number, marc: string) {
    navigator.clipboard.writeText(marc);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleSaveAndViewHistory() {
    try {
      addConversation({
        bibliographicInfo,
        initialSuggestions: undefined,
        validationResults: undefined,
        finalRecommendations: finalRecommendations || undefined,
        marcRecords: marcRecords || undefined,
      });

      router.push("/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save conversation");
    }
  }

  function handleExportCSV() {
    if (!finalRecommendations) return;

    const csv = [
      ["Term", "Similarity", "Best Match", "MARC"],
      ...finalRecommendations.map((rec) => [
        rec.term,
        `${rec.similarity}%`,
        rec.bestMatch?.heading || "",
        rec.marc || marcRecords?.[rec.term] || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lcsh-recommendations-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!finalRecommendations || finalRecommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No recommendations available. Please go back and complete the previous steps.
        </p>
        <Button variant="outline" onClick={() => setActiveStep(1)} className="mt-4">
          Back to Validation Results
        </Button>
      </div>
    );
  }

  const highScoringRecommendations = sortedRecommendations.filter(
    (rec) => rec.similarity && rec.similarity > 30
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Final Recommendations</h2>
        <p className="text-muted-foreground">
          Review and export your validated LCSH recommendations
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Overall Validation Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-3xl font-bold"
            style={{ color: getSimilarityColor(averageSimilarity) }}
          >
            {averageSimilarity}%
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {getSimilarityLabel(averageSimilarity)} - Based on {highScoringRecommendations.length} high-scoring terms
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {highScoringRecommendations.map((rec, index) => {
          const marc = rec.marc || marcRecords?.[rec.term] || "";
          const isCopied = copiedIndex === index;

          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{rec.term}</CardTitle>
                  <Badge
                    style={{
                      backgroundColor: getSimilarityColor(rec.similarity || 0),
                      color: "white",
                    }}
                  >
                    {rec.similarity}% - {getSimilarityLabel(rec.similarity || 0)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rec.bestMatch && (
                  <div>
                    <strong>Best Match:</strong> {rec.bestMatch.heading}
                    <br />
                    <a
                      href={rec.bestMatch.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      View on LOC <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {rec.justification && (
                  <div>
                    <strong>Justification:</strong>
                    <p className="text-sm text-muted-foreground mt-1">
                      {rec.justification}
                    </p>
                  </div>
                )}

                {marc && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <strong>MARC Record (650):</strong>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyMARC(index, marc)}
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {marc}
                    </pre>
                  </div>
                )}

                {!marc && processingMarc && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating MARC record...
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => setActiveStep(1)}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button onClick={handleSaveAndViewHistory}>
            Save & View History
          </Button>
        </div>
      </div>
    </div>
  );
}


