/**
 * Batch Processor — Sequential processing orchestrator
 * Wraps existing generateSuggestionsClientSide and generateMarcClientSide.
 */

import type { BibliographicInfo, ValidatedTerm } from "./ai-pipeline";
import {
  generateSuggestionsClientSide,
  generateMarcClientSide,
} from "./ai-pipeline";
import { parseMarcRecords } from "./ai";
import { extractIdentifier } from "./loc";
import type { Recommendation } from "./store";
import type { BatchItem } from "./csv-parser";

export type BatchItemStatus = "pending" | "processing" | "success" | "error" | "cancelled";

export interface BatchItemResult {
  rowIndex: number;
  status: BatchItemStatus;
  bibliographicInfo: BibliographicInfo;
  subjectAnalysis?: string;
  validatedTerms?: ValidatedTerm[];
  recommendations?: Recommendation[];
  marcRecords?: Record<string, string>;
  error?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  currentIndex: number;
}

/**
 * Convert ValidatedTerm[] → Recommendation[]
 * Same logic as validated-suggestions.tsx:48-64
 */
function validatedTermsToRecommendations(terms: ValidatedTerm[]): Recommendation[] {
  return terms.map((term) => ({
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
}

export function createBatchProcessor(
  items: BatchItem[],
  options: {
    modelId: string;
    provider: string;
    apiKey: string;
    baseURL?: string;
    systemPromptRules?: string;
    onItemStart?: (index: number) => void;
    onItemComplete?: (result: BatchItemResult) => void;
    onProgress?: (progress: BatchProgress) => void;
  }
) {
  let cancelled = false;
  const results: BatchItemResult[] = items.map((item) => ({
    rowIndex: item.rowIndex,
    status: "pending" as BatchItemStatus,
    bibliographicInfo: item.bibliographicInfo,
  }));

  const progress: BatchProgress = {
    total: items.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    currentIndex: 0,
  };

  async function start(): Promise<BatchItemResult[]> {
    for (let i = 0; i < items.length; i++) {
      if (cancelled) {
        // Mark remaining items as cancelled
        for (let j = i; j < items.length; j++) {
          results[j].status = "cancelled";
          progress.cancelled++;
          progress.completed++;
          options.onItemComplete?.(results[j]);
        }
        options.onProgress?.(progress);
        break;
      }

      progress.currentIndex = i;
      results[i].status = "processing";
      options.onItemStart?.(i);
      options.onProgress?.(progress);

      try {
        // Step 1: Generate suggestions + validate against LOC
        const suggestionsResult = await generateSuggestionsClientSide({
          modelId: options.modelId,
          provider: options.provider,
          apiKey: options.apiKey,
          baseURL: options.baseURL,
          bibliographicInfo: items[i].bibliographicInfo,
          systemPromptRules: options.systemPromptRules,
        });

        if (cancelled) {
          results[i].status = "cancelled";
          progress.cancelled++;
          progress.completed++;
          options.onItemComplete?.(results[i]);
          // Mark remaining
          for (let j = i + 1; j < items.length; j++) {
            results[j].status = "cancelled";
            progress.cancelled++;
            progress.completed++;
            options.onItemComplete?.(results[j]);
          }
          options.onProgress?.(progress);
          break;
        }

        results[i].subjectAnalysis = suggestionsResult.subjectAnalysis;
        results[i].validatedTerms = suggestionsResult.validatedTerms;

        // Step 2: Convert ValidatedTerm[] → Recommendation[]
        const recommendations = validatedTermsToRecommendations(suggestionsResult.validatedTerms);

        // Step 3: Generate MARC records
        const highScoring = recommendations.filter(
          (rec) => rec.similarity && rec.similarity > 30 && rec.bestMatch
        );

        if (highScoring.length > 0) {
          const marcResult = await generateMarcClientSide({
            modelId: options.modelId,
            provider: options.provider,
            apiKey: options.apiKey,
            baseURL: options.baseURL,
            recommendations: highScoring,
          });

          // Step 4: Parse MARC text into per-term records
          const terms = highScoring.map((r) => r.term);
          const parsedMarc = parseMarcRecords(marcResult, terms);

          // Step 5: Merge MARC into recommendations
          const recsWithMarc = recommendations.map((rec) => ({
            ...rec,
            marc: rec.marc || parsedMarc[rec.term] || "",
          }));

          results[i].recommendations = recsWithMarc;
          results[i].marcRecords = parsedMarc;
        } else {
          results[i].recommendations = recommendations;
        }

        results[i].status = "success";
        progress.succeeded++;
      } catch (err) {
        results[i].status = "error";
        results[i].error = err instanceof Error ? err.message : String(err);
        progress.failed++;
      }

      progress.completed++;
      options.onItemComplete?.(results[i]);
      options.onProgress?.(progress);

      // 500ms throttle delay between items (skip after last item)
      if (i < items.length - 1 && !cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  function cancel() {
    cancelled = true;
  }

  return { start, cancel };
}
