"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { findBestMatch, getSimilarityColor, getSimilarityLabel } from "@/lib/similarity";
import { extractIdentifier } from "@/lib/loc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink } from "lucide-react";
import type { LOCSearchResponse } from "@/lib/loc";
import type { Recommendation } from "@/lib/store";

export function ValidationResults() {
  const {
    initialSuggestions,
    validationResults,
    setActiveStep,
    setFinalRecommendations,
    error,
    setError,
  } = useAppStore();

  const [processedResults, setProcessedResults] = useState<
    Record<string, { items: Array<{ heading: string; uri: string }> }>
  >({});
  const [similarityScores, setSimilarityScores] = useState<Record<string, number>>({});
  const [averageSimilarity, setAverageSimilarity] = useState(0);

  useEffect(() => {
    if (!validationResults) return;

    const processed: Record<string, { items: Array<{ heading: string; uri: string }> }> = {};
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let validTerms = 0;

    Object.entries(validationResults).forEach(([term, result]) => {
      const items = (result as LOCSearchResponse).results?.map((r) => ({
        heading: r.label,
        uri: r.uri,
      })) || [];

      processed[term] = { items };

      if (items.length > 0) {
        const bestMatch = findBestMatch(term, items);
        scores[term] = bestMatch.similarity;
        totalScore += bestMatch.similarity;
        validTerms++;
      } else {
        scores[term] = 0;
      }
    });

    const avgScore = validTerms > 0 ? Math.round(totalScore / validTerms) : 0;

    setProcessedResults(processed);
    setSimilarityScores(scores);
    setAverageSimilarity(avgScore);
  }, [validationResults]);

  function handleContinue() {
    if (!initialSuggestions?.recommendedTerms) {
      setError("No recommendations available");
      return;
    }

    try {
      const finalRecommendations: Recommendation[] = initialSuggestions.recommendedTerms.map(
        (term) => {
          const scrapedResult = processedResults[term.term] || { items: [] };
          const similarity = similarityScores[term.term] || 0;

          let bestMatch = null;
          if (scrapedResult.items.length > 0) {
            const { item } = findBestMatch(term.term, scrapedResult.items);
            if (item) {
              bestMatch = {
                heading: item.heading,
                identifier: extractIdentifier(item.uri),
                uri: item.uri,
              };
            }
          }

          return {
            term: term.term,
            similarity,
            bestMatch: bestMatch || undefined,
            apiId: term.apiId,
            marc: term.marc,
            justification: term.justification,
          };
        }
      );

      setFinalRecommendations(finalRecommendations);
      setActiveStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process recommendations");
      console.error("Error processing recommendations:", err);
    }
  }

  if (!validationResults || Object.keys(validationResults).length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No validation results available. Please go back and validate terms first.
        </p>
        <Button variant="outline" onClick={() => setActiveStep(1)} className="mt-4">
          Back to Initial Suggestions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">LOC Validation Results</h2>
        <p className="text-muted-foreground">
          Compare AI suggestions with actual Library of Congress Subject Headings
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
          <div className="text-3xl font-bold" style={{ color: getSimilarityColor(averageSimilarity) }}>
            {averageSimilarity}%
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {getSimilarityLabel(averageSimilarity)}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.entries(processedResults).map(([term, result]) => {
          const similarity = similarityScores[term] || 0;
          const bestMatch = result.items.length > 0
            ? findBestMatch(term, result.items).item
            : null;

          return (
            <Card key={term}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{term}</CardTitle>
                  <Badge
                    style={{
                      backgroundColor: getSimilarityColor(similarity),
                      color: "white",
                    }}
                  >
                    {similarity}% - {getSimilarityLabel(similarity)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {bestMatch ? (
                  <div className="space-y-2">
                    <div>
                      <strong>Best Match:</strong> {bestMatch.heading}
                    </div>
                    <div>
                      <a
                        href={bestMatch.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View on LOC <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No match found in LOC database</p>
                )}
                {result.items.length > 1 && (
                  <details className="mt-2">
                    <summary className="text-sm text-muted-foreground cursor-pointer">
                      {result.items.length - 1} more result(s)
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {result.items.slice(1).map((item, idx) => (
                        <li key={idx} className="text-sm">
                          <a
                            href={item.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {item.heading}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveStep(1)}>
          Back
        </Button>
        <Button onClick={handleContinue}>Continue to Final Recommendations</Button>
      </div>
    </div>
  );
}

