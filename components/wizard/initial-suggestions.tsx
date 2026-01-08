"use client";

import { useAppStore } from "@/lib/store";
import { searchMultipleTerms } from "@/lib/loc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Image as ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function InitialSuggestions() {
  const {
    initialSuggestions,
    bibliographicInfo,
    setActiveStep,
    setValidationResults,
    setIsLoading,
    isLoading,
    error,
    setError,
  } = useAppStore();

  async function handleContinue() {
    if (!initialSuggestions?.candidateTerms) {
      setError("No candidate terms available");
      return;
    }

    try {
      setIsLoading(true);
      const scrapedResults = await searchMultipleTerms(
        initialSuggestions.candidateTerms,
        2
      );
      setValidationResults(scrapedResults);
      setActiveStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate terms");
      console.error("Error validating terms:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (!initialSuggestions || !initialSuggestions.candidateTerms) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No suggestions available. Please go back and generate suggestions first.
        </p>
        <Button variant="outline" onClick={() => setActiveStep(0)} className="mt-4">
          Back to Bibliographic Information
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Initial LCSH Suggestions</h2>
        <p className="text-muted-foreground">
          Review the AI-generated suggestions before validation
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Subject Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{initialSuggestions.subjectAnalysis}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bibliographic Information Used</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Title:</strong> {bibliographicInfo.title || "N/A"}
            </div>
            <div>
              <strong>Author:</strong> {bibliographicInfo.author || "N/A"}
            </div>
          </div>
          {bibliographicInfo.abstract && (
            <div>
              <strong>Abstract:</strong>{" "}
              {bibliographicInfo.abstract.substring(0, 100)}
              {bibliographicInfo.abstract.length > 100 ? "..." : ""}
            </div>
          )}
          {bibliographicInfo.images && bibliographicInfo.images.length > 0 && (
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <strong>Images:</strong> {bibliographicInfo.images.length} image(s) uploaded
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Terms for Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1">
            {initialSuggestions.candidateTerms.map((term, index) => (
              <li key={index}>{term}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Response from AI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto font-mono text-sm whitespace-pre-wrap bg-muted p-4 rounded">
            {initialSuggestions.rawResponse}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveStep(0)}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating Terms...
            </>
          ) : (
            "Validate Terms with LOC"
          )}
        </Button>
      </div>
    </div>
  );
}


