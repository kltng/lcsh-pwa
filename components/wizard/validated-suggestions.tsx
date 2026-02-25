"use client";

import { useAppStore, type Recommendation } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { getSimilarityColor, getSimilarityLabel } from "@/lib/similarity";
import { extractIdentifier } from "@/lib/loc";

export interface ValidatedTerm {
    suggestedHeading: string;
    reason: string;
    validatedHeading: string;
    locUri: string;
    matchType: "exact" | "closest";
    similarity: number;
    source?: "lcsh" | "lcnaf";
    isAdditional?: boolean;
    alternatives: Array<{ heading: string; uri: string; similarity: number; source?: "lcsh" | "lcnaf" }>;
}

interface ValidatedSuggestionsProps {
    validatedTerms: ValidatedTerm[];
    subjectAnalysis?: string;
    onContinue: () => void;
    onBack: () => void;
}

export function ValidatedSuggestions({
    validatedTerms,
    subjectAnalysis,
    onContinue,
    onBack,
}: ValidatedSuggestionsProps) {
    const { error, setFinalRecommendations, setActiveStep } = useAppStore();

    // Calculate average similarity
    const validTerms = validatedTerms.filter((t) => t.similarity > 0);
    const averageSimilarity =
        validTerms.length > 0
            ? Math.round(
                validTerms.reduce((sum, t) => sum + t.similarity, 0) / validTerms.length
            )
            : 0;

    function handleContinue() {
        // Convert validated terms to recommendations format
        const recommendations: Recommendation[] = validatedTerms.map((term) => ({
            term: term.suggestedHeading,
            similarity: term.similarity,
            source: term.source,
            isAdditional: term.isAdditional,
            bestMatch: term.locUri
                ? {
                    heading: term.validatedHeading,
                    identifier: extractIdentifier(term.locUri),
                    uri: term.locUri,
                    source: term.source,
                }
                : undefined,
            justification: term.reason,
        }));

        setFinalRecommendations(recommendations);
        setActiveStep(2); // Go to final recommendations (now step 2)
    }

    if (!validatedTerms || validatedTerms.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">
                    No validated terms available. Please go back and try again.
                </p>
                <Button variant="outline" onClick={onBack} className="mt-4">
                    Back to Bibliographic Information
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">Validated LCSH Suggestions</h2>
                <p className="text-muted-foreground">
                    AI suggestions validated against the Library of Congress database
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {subjectAnalysis && (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>Subject Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{subjectAnalysis}</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Validation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div
                            className="text-3xl font-bold"
                            style={{ color: getSimilarityColor(averageSimilarity) }}
                        >
                            {averageSimilarity}%
                        </div>
                        <div>
                            <p className="font-medium">{getSimilarityLabel(averageSimilarity)}</p>
                            <p className="text-sm text-muted-foreground">
                                {validTerms.length} of {validatedTerms.length} terms validated
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {validatedTerms.map((term, index) => (
                    <Card key={index}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {term.matchType === "exact" ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    )}
                                    <CardTitle className="text-lg">{term.suggestedHeading}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    {term.isAdditional && (
                                        <Badge variant="outline" className="text-xs">
                                            AI Additional
                                        </Badge>
                                    )}
                                    {term.source && (
                                        <Badge variant="secondary" className="text-xs">
                                            {term.source.toUpperCase()}
                                        </Badge>
                                    )}
                                    <Badge
                                        style={{
                                            backgroundColor: getSimilarityColor(term.similarity),
                                            color: "white",
                                        }}
                                    >
                                        {term.similarity}%
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {term.reason && (
                                <div className="bg-muted/50 rounded-md p-3">
                                    <span className="font-medium text-sm">AI Reasoning:</span>
                                    <p className="text-sm text-muted-foreground mt-1">{term.reason}</p>
                                </div>
                            )}
                            {term.locUri ? (
                                <>
                                    <div className="flex items-start gap-2">
                                        <span className="font-medium text-sm">Best Match:</span>
                                        <span>{term.validatedHeading}</span>
                                    </div>
                                    <a
                                        href={term.locUri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline flex items-center gap-1"
                                    >
                                        View on LOC <ExternalLink className="h-3 w-3" />
                                    </a>
                                    {term.matchType === "closest" && term.alternatives.length > 0 && (
                                        <details className="mt-2">
                                            <summary className="text-sm text-muted-foreground cursor-pointer">
                                                {term.alternatives.length} alternative(s)
                                            </summary>
                                            <ul className="mt-2 space-y-1 ml-4">
                                                {term.alternatives.map((alt, altIdx) => (
                                                    <li key={altIdx} className="text-sm flex items-center gap-2">
                                                        <a
                                                            href={alt.uri}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline"
                                                        >
                                                            {alt.heading}
                                                        </a>
                                                        {alt.source && (
                                                            <Badge variant="secondary" className="text-xs h-5">
                                                                {alt.source.toUpperCase()}
                                                            </Badge>
                                                        )}
                                                        <span className="text-muted-foreground">
                                                            ({alt.similarity}%)
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    No match found in LOC database. Consider using an alternative term.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    Back
                </Button>
                <Button onClick={handleContinue}>Generate MARC Records</Button>
            </div>
        </div>
    );
}
