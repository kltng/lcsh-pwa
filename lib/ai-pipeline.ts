"use client";

/**
 * Client-Side AI Pipeline
 * All AI calls and LOC validation run in the browser.
 * No data is sent to or processed by our server.
 */

import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getModelsByProvider, getModelSDKConfig, type ExtendedModelInfo } from "@/lib/models";
import { searchLcsh, searchLcnaf, normalizeQuery, extractMainHeading, type LcshResult } from "@/lib/lcsh";
import { calculateSimilarity } from "@/lib/similarity";
import { getProviderHardcodedBaseURL } from "@/lib/provider-groups";
import { z } from "zod";

// Schema for structured LCSH suggestions
const lcshSuggestionSchema = z.object({
  subjectAnalysis: z.string().describe(
    "A brief expert analysis of the work's subject matter, explaining the main themes, topics, and why certain subject areas are relevant for cataloging"
  ),
  terms: z.array(z.object({
    suggestedHeading: z.string().describe("The LCSH heading suggested based on the bibliographic information"),
    reason: z.string().describe("A brief explanation of why this LCSH term is relevant to the work being cataloged"),
  })).describe("Array of suggested LCSH terms (3-6 terms recommended)"),
});

// Schema for AI-powered selection from LOC results
const aiSelectionSchema = z.object({
  selections: z.array(z.object({
    originalSuggestion: z.string(),
    bestMatchHeading: z.string(),
    bestMatchUri: z.string(),
    bestMatchSource: z.enum(["lcsh", "lcnaf"]),
    confidence: z.number().min(0).max(100).describe("Confidence score as an integer from 0 to 100 (e.g. 95 means 95% confident). Do NOT use decimal scale like 0.95."),
    reason: z.string(),
  })),
  additionalTerms: z.array(z.object({
    heading: z.string(),
    uri: z.string(),
    source: z.enum(["lcsh", "lcnaf"]),
    reason: z.string(),
  })),
});

// Response type for validated terms
export interface ValidatedTerm {
  suggestedHeading: string;
  reason: string;
  validatedHeading: string;
  locUri: string;
  matchType: "exact" | "closest";
  similarity: number;
  source: "lcsh" | "lcnaf";
  isAdditional?: boolean;
  alternatives: Array<{ heading: string; uri: string; similarity: number; source: "lcsh" | "lcnaf" }>;
}

export interface BibliographicInfo {
  title?: string;
  author?: string;
  abstract?: string;
  tableOfContents?: string;
  notes?: string;
  images?: Array<{ data: string; name: string; type: string }>;
}

// Tagged LOC result with source info
interface TaggedLcshResult extends LcshResult {
  source: "lcsh" | "lcnaf";
}

/**
 * Normalizes an AI confidence value to 0-100 scale.
 */
function normalizeConfidence(confidence: number): number {
  if (confidence > 0 && confidence <= 1) {
    return Math.round(confidence * 100);
  }
  return Math.round(confidence);
}

/**
 * Searches both LCSH and LCNAF for a term in parallel, with fallback.
 */
async function searchLOCForTerm(suggested: string): Promise<{ lcshResults: TaggedLcshResult[]; lcnafResults: TaggedLcshResult[] }> {
  const normalized = normalizeQuery(suggested);

  const [lcshRaw, lcnafRaw] = await Promise.all([
    searchLcsh(normalized, { count: 20, searchType: "keyword" }),
    searchLcnaf(normalized, { count: 20, searchType: "keyword" }),
  ]);

  let lcshResults: TaggedLcshResult[] = lcshRaw.map(r => ({ ...r, source: "lcsh" as const }));
  const lcnafResults: TaggedLcshResult[] = lcnafRaw.map(r => ({ ...r, source: "lcnaf" as const }));

  // Fallback: if LCSH returns 0 and query has "--", search with just main heading
  if (lcshResults.length === 0 && normalized.includes("--")) {
    const mainHeading = extractMainHeading(normalized);
    const fallbackRaw = await searchLcsh(mainHeading, { count: 20, searchType: "keyword" });
    lcshResults = fallbackRaw.map(r => ({ ...r, source: "lcsh" as const }));
  }

  return { lcshResults, lcnafResults };
}

/**
 * Levenshtein-based fallback validation for a single term.
 */
function validateTermWithLevenshtein(
  suggested: string,
  reason: string,
  searchResults: TaggedLcshResult[],
  isAdditional?: boolean
): ValidatedTerm {
  if (searchResults.length === 0) {
    return {
      suggestedHeading: suggested,
      reason,
      validatedHeading: suggested,
      locUri: "",
      matchType: "closest",
      similarity: 0,
      source: "lcsh",
      isAdditional,
      alternatives: [],
    };
  }

  const resultsWithSimilarity = searchResults.map(r => ({
    heading: r.label,
    uri: r.uri,
    similarity: calculateSimilarity(suggested, r.label),
    source: r.source,
  }));

  resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

  const bestMatch = resultsWithSimilarity[0];
  return {
    suggestedHeading: suggested,
    reason,
    validatedHeading: bestMatch.heading,
    locUri: bestMatch.uri,
    matchType: bestMatch.similarity >= 90 ? "exact" : "closest",
    similarity: bestMatch.similarity,
    source: bestMatch.source,
    isAdditional,
    alternatives: resultsWithSimilarity.slice(1, 4),
  };
}

/**
 * Creates an AI model instance for browser-side use.
 */
function createModelInstance(options: {
  provider: string;
  modelId: string;
  apiKey: string;
  baseURL?: string;
}): any {
  const { provider, modelId, apiKey, baseURL } = options;

  // Look up the model from the registry to get SDK config
  // We need the model info to determine the correct SDK provider
  const sdkProvider = getSdkProvider(provider);
  const hardcodedBaseURL = getProviderHardcodedBaseURL(provider);
  const effectiveBaseURL = baseURL || hardcodedBaseURL || "";

  if (sdkProvider === "openai") {
    const client = createOpenAI({ apiKey });
    return client(modelId);
  }

  if (sdkProvider === "google") {
    const client = createGoogleGenerativeAI({ apiKey });
    return client(modelId);
  }

  // OpenAI-compatible (DeepSeek, Groq, Together, Qwen, etc.)
  const client = createOpenAICompatible({
    name: provider,
    baseURL: effectiveBaseURL,
    apiKey: apiKey || "dummy",
  });
  return client(modelId);
}

/**
 * Map provider ID to SDK provider type.
 */
function getSdkProvider(provider: string): "openai" | "google" | "openai-compatible" {
  if (provider === "openai") return "openai";
  if (provider === "google") return "google";
  return "openai-compatible";
}

/**
 * Wraps an AI call with CORS error detection and a helpful message.
 */
function formatError(error: unknown, provider: string): Error {
  if (error instanceof TypeError && (error as any).message?.includes("Failed to fetch")) {
    return new Error(
      `Cannot connect to ${provider} from the browser. This provider may block direct browser requests (CORS). ` +
      `Try using OpenAI, Google, Groq, or OpenRouter instead, which support browser-direct calls.`
    );
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

/**
 * Main pipeline: generate LCSH suggestions and validate against LOC.
 * Runs entirely in the browser.
 */
export async function generateSuggestionsClientSide(options: {
  modelId: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
  bibliographicInfo: BibliographicInfo;
  systemPromptRules?: string;
}): Promise<{
  subjectAnalysis: string;
  validatedTerms: ValidatedTerm[];
  usage?: any;
  fallback?: boolean;
}> {
  const { modelId, provider, apiKey, baseURL, bibliographicInfo, systemPromptRules } = options;

  const model = createModelInstance({ provider, modelId, apiKey, baseURL });
  const sdkProvider = getSdkProvider(provider);

  const systemPrompt = `You are a library cataloging expert specializing in Library of Congress Subject Headings (LCSH).

${systemPromptRules || ""}

Begin with a brief subject analysis of the work, explaining the main themes and why certain subject areas are relevant for cataloging. Then suggest 3-6 appropriate LCSH terms.

Focus on:
1. Main topical subjects
2. Geographic subjects if relevant
3. Chronological aspects if relevant
4. Form/genre if applicable

Return ONLY valid LCSH-style headings. Do not include subdivisions unless you are confident they exist. Use "--" (no spaces) between main headings and subdivisions.

IMPORTANT: You must return a JSON object with a "subjectAnalysis" string and a "terms" array. Each term must be an object with a "suggestedHeading" and "reason" property. The reason should explain why this heading is appropriate for the work. Example format:
{
  "subjectAnalysis": "This work examines the history and cultural significance of Japanese cinema...",
  "terms": [
    {"suggestedHeading": "Motion pictures--Japan", "reason": "The work focuses on Japanese cinema history and cultural context"},
    {"suggestedHeading": "Motion pictures--Japan--History", "reason": "The work provides a historical overview of Japanese film industry development"}
  ]
}`;

  const userPrompt = `Suggest LCSH terms for:

Title: ${bibliographicInfo.title || "N/A"}
Author: ${bibliographicInfo.author || "N/A"}
${bibliographicInfo.abstract ? `Abstract: ${bibliographicInfo.abstract}` : ""}
${bibliographicInfo.tableOfContents ? `Table of Contents: ${bibliographicInfo.tableOfContents}` : ""}
${bibliographicInfo.notes ? `Notes: ${bibliographicInfo.notes}` : ""}

Return your response as a JSON object with a "terms" array containing objects with "suggestedHeading" and "reason" properties.`;

  const needsJsonInPrompt = sdkProvider === "openai-compatible";
  const enhancedUserPrompt = needsJsonInPrompt
    ? `${userPrompt}\n\nReturn your response as valid JSON.`
    : userPrompt;

  try {
    // Try structured output first
    const result = await generateObject({
      model,
      schema: lcshSuggestionSchema,
      system: systemPrompt,
      prompt: enhancedUserPrompt,
      temperature: 0.3,
    } as any);

    const resultData = result.object as { subjectAnalysis?: string; terms: Array<{ suggestedHeading: string; reason: string }> } | null;
    let terms: Array<{ suggestedHeading: string; reason: string }> = [];
    const subjectAnalysis = resultData?.subjectAnalysis || "";

    if (resultData?.terms && Array.isArray(resultData.terms)) {
      terms = resultData.terms;
    } else {
      try {
        const rawText = JSON.stringify(result.object);
        const parsed = JSON.parse(rawText);
        if (parsed.LCSH_terms && Array.isArray(parsed.LCSH_terms)) {
          terms = parsed.LCSH_terms.map((term: string) => ({ suggestedHeading: term, reason: "No reason provided" }));
        } else if (parsed.terms && Array.isArray(parsed.terms)) {
          terms = parsed.terms.map((term: string | { suggestedHeading: string; reason?: string }) =>
            typeof term === 'string' ? { suggestedHeading: term, reason: "No reason provided" } : { suggestedHeading: term.suggestedHeading, reason: term.reason || "No reason provided" }
          );
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Step 1: Search LOC for ALL terms in parallel
    const validatedTerms: ValidatedTerm[] = [];
    const searchResultsMap = new Map<string, { lcshResults: TaggedLcshResult[]; lcnafResults: TaggedLcshResult[] }>();
    await Promise.all(
      terms.map(async (term) => {
        const results = await searchLOCForTerm(term.suggestedHeading);
        searchResultsMap.set(term.suggestedHeading, results);
      })
    );

    // Step 2: Try AI-powered selection
    let aiSelectionSucceeded = false;
    try {
      let selectionPrompt = `You are a library cataloging expert. Given the bibliographic information and LOC search results below, select the best matching LOC heading for each AI suggestion. Also identify up to 3 additional relevant terms from the LOC results that weren't originally suggested.

Bibliographic Information:
Title: ${bibliographicInfo.title || "N/A"}
Author: ${bibliographicInfo.author || "N/A"}
${bibliographicInfo.abstract ? `Abstract: ${bibliographicInfo.abstract}` : ""}

For each suggestion below, pick the single best matching heading from the LOC results. Consider semantic meaning, not just string similarity.

`;
      for (const term of terms) {
        const results = searchResultsMap.get(term.suggestedHeading);
        selectionPrompt += `\n--- Suggestion: "${term.suggestedHeading}" ---\nReason: ${term.reason}\nLOC Results:\n`;
        const allResults = [...(results?.lcshResults || []), ...(results?.lcnafResults || [])];
        if (allResults.length === 0) {
          selectionPrompt += "  (no results found)\n";
        } else {
          allResults.forEach((r, i) => {
            selectionPrompt += `  ${i + 1}. [${r.source.toUpperCase()}] "${r.label}" — ${r.uri}\n`;
          });
        }
      }

      selectionPrompt += `\nPick the best match for each suggestion. If no LOC results are available for a suggestion, use the original suggestion text with an empty URI. Also suggest up to 3 additional relevant terms you noticed in the LOC results that would be good for this work.

IMPORTANT: The confidence score MUST be an integer from 0 to 100 (e.g., 95 means 95% confident). Do NOT use a decimal scale like 0.95.`;

      const aiSelection = await generateObject({
        model,
        schema: aiSelectionSchema,
        prompt: selectionPrompt,
        temperature: 0.1,
      } as any);

      const selectionData = aiSelection.object as z.infer<typeof aiSelectionSchema>;

      if (selectionData?.selections) {
        for (const sel of selectionData.selections) {
          const originalTerm = terms.find(t => t.suggestedHeading === sel.originalSuggestion);
          const allResults = searchResultsMap.get(sel.originalSuggestion);
          const combined = [...(allResults?.lcshResults || []), ...(allResults?.lcnafResults || [])];

          const aiPick = combined.find(r => r.uri === sel.bestMatchUri);
          if (aiPick) {
            const aiConf = normalizeConfidence(sel.confidence);
            const levSim = calculateSimilarity(sel.originalSuggestion, aiPick.label);
            const similarity = Math.max(aiConf, levSim);
            validatedTerms.push({
              suggestedHeading: sel.originalSuggestion,
              reason: originalTerm?.reason || sel.reason,
              validatedHeading: aiPick.label,
              locUri: aiPick.uri,
              matchType: similarity >= 90 ? "exact" : "closest",
              similarity,
              source: aiPick.source,
              alternatives: combined
                .filter(r => r.uri !== sel.bestMatchUri)
                .slice(0, 3)
                .map(r => ({
                  heading: r.label,
                  uri: r.uri,
                  similarity: calculateSimilarity(sel.originalSuggestion, r.label),
                  source: r.source,
                })),
            });
          } else if (sel.bestMatchUri && sel.bestMatchHeading) {
            const aiConf = normalizeConfidence(sel.confidence);
            const levSim = calculateSimilarity(sel.originalSuggestion, sel.bestMatchHeading);
            const similarity = Math.max(aiConf, levSim);
            validatedTerms.push({
              suggestedHeading: sel.originalSuggestion,
              reason: originalTerm?.reason || sel.reason,
              validatedHeading: sel.bestMatchHeading,
              locUri: sel.bestMatchUri,
              matchType: similarity >= 90 ? "exact" : "closest",
              similarity,
              source: sel.bestMatchSource,
              alternatives: combined.slice(0, 3).map(r => ({
                heading: r.label,
                uri: r.uri,
                similarity: calculateSimilarity(sel.originalSuggestion, r.label),
                source: r.source,
              })),
            });
          } else {
            validatedTerms.push(
              validateTermWithLevenshtein(
                sel.originalSuggestion,
                originalTerm?.reason || sel.reason,
                combined
              )
            );
          }
        }

        // Handle additional terms from AI
        if (selectionData.additionalTerms) {
          for (const additional of selectionData.additionalTerms) {
            if (validatedTerms.some(v => v.locUri === additional.uri)) continue;
            validatedTerms.push({
              suggestedHeading: additional.heading,
              reason: additional.reason,
              validatedHeading: additional.heading,
              locUri: additional.uri,
              matchType: "exact",
              similarity: 95,
              source: additional.source,
              isAdditional: true,
              alternatives: [],
            });
          }
        }

        aiSelectionSucceeded = true;
      }
    } catch {
      // AI selection failed, fall through to Levenshtein
    }

    // Step 3: Fallback to Levenshtein if AI selection failed
    if (!aiSelectionSucceeded) {
      for (const term of terms) {
        const results = searchResultsMap.get(term.suggestedHeading);
        const combined = [...(results?.lcshResults || []), ...(results?.lcnafResults || [])];
        validatedTerms.push(
          validateTermWithLevenshtein(term.suggestedHeading, term.reason || "No reason provided", combined)
        );
      }
    }

    return {
      subjectAnalysis,
      validatedTerms,
      usage: result.usage,
    };
  } catch (structuredError: any) {
    // Fallback: try to parse the response even if schema validation failed
    let terms: Array<{ suggestedHeading: string; reason?: string }> = [];

    if (structuredError?.value) {
      try {
        const parsed = typeof structuredError.value === 'string'
          ? JSON.parse(structuredError.value)
          : structuredError.value;

        if (parsed.LCSH_terms && Array.isArray(parsed.LCSH_terms)) {
          terms = parsed.LCSH_terms.map((term: string) => ({ suggestedHeading: term }));
        } else if (parsed.terms && Array.isArray(parsed.terms)) {
          terms = parsed.terms.map((term: string | { suggestedHeading: string; reason?: string }) =>
            typeof term === 'string' ? { suggestedHeading: term } : term
          );
        } else if (Array.isArray(parsed)) {
          terms = parsed.map((term: string) => ({ suggestedHeading: term }));
        }
      } catch {
        // Ignore parse errors
      }
    }

    if (terms.length > 0) {
      const validatedTerms: ValidatedTerm[] = [];
      const searchResultsMap = new Map<string, { lcshResults: TaggedLcshResult[]; lcnafResults: TaggedLcshResult[] }>();
      await Promise.all(
        terms.map(async (term) => {
          const results = await searchLOCForTerm(term.suggestedHeading);
          searchResultsMap.set(term.suggestedHeading, results);
        })
      );

      for (const term of terms) {
        const results = searchResultsMap.get(term.suggestedHeading);
        const combined = [...(results?.lcshResults || []), ...(results?.lcnafResults || [])];
        validatedTerms.push(
          validateTermWithLevenshtein(term.suggestedHeading, term.reason || "No reason provided", combined)
        );
      }

      return {
        subjectAnalysis: "",
        validatedTerms,
        usage: structuredError?.usage,
      };
    }

    // Final fallback: text-based approach
    try {
      const result = await generateText({
        model,
        system: `You are a library cataloging expert specializing in Library of Congress Subject Headings (LCSH).

${systemPromptRules || ""}

Return your suggestions as a numbered list, one term per line.`,
        prompt: enhancedUserPrompt,
        temperature: 0.3,
        maxTokens: 1024,
      } as any);

      const lines = result.text.split("\n");
      const suggestedTerms: string[] = [];
      for (const line of lines) {
        const match = line.match(/^\s*\d+\.\s*(.+)$/);
        if (match) {
          suggestedTerms.push(match[1].trim().replace(/\*\*/g, ""));
        }
      }

      const validatedTerms: ValidatedTerm[] = [];
      const searchResultsMap = new Map<string, { lcshResults: TaggedLcshResult[]; lcnafResults: TaggedLcshResult[] }>();
      await Promise.all(
        suggestedTerms.map(async (term) => {
          const results = await searchLOCForTerm(term);
          searchResultsMap.set(term, results);
        })
      );

      for (const suggested of suggestedTerms) {
        const results = searchResultsMap.get(suggested);
        const combined = [...(results?.lcshResults || []), ...(results?.lcnafResults || [])];
        validatedTerms.push(
          validateTermWithLevenshtein(suggested, "Generated in fallback mode - reason not available", combined)
        );
      }

      return {
        subjectAnalysis: "",
        validatedTerms,
        usage: result.usage,
        fallback: true,
      };
    } catch (fallbackError) {
      throw formatError(fallbackError, provider);
    }
  }
}

/**
 * Generate MARC records for validated terms.
 * Runs entirely in the browser.
 */
export async function generateMarcClientSide(options: {
  modelId: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
  recommendations: Array<{
    similarity: number;
    validatedHeading?: string;
    bestMatch?: { heading: string; uri?: string };
    locUri?: string;
    source?: string;
    term?: string;
  }>;
}): Promise<{ text: string; usage?: any }> {
  const { modelId, provider, apiKey, baseURL, recommendations } = options;

  const model = createModelInstance({ provider, modelId, apiKey, baseURL });

  const systemPrompt = `You are a library cataloging expert specializing in MARC records for Library of Congress Subject Headings (LCSH) and Name Authority File (LCNAF).

For each validated term provided, generate the appropriate MARC field record based on the source:
- LCSH terms: use field 650 (Subject Added Entry - Topical Term)
- LCNAF personal names: use field 600 (Subject Added Entry - Personal Name)
- LCNAF corporate names: use field 610 (Subject Added Entry - Corporate Name)

Format each record as:
\`\`\`marc
[field] [indicators] $a [Main heading] $x [Subdivision] $z [Geographic subdivision] $y [Chronological subdivision]
\`\`\`

Only include necessary subfields. Be precise and follow cataloging standards.`;

  const termsPrompt = recommendations
    .filter((rec) => rec.similarity > 30)
    .map((rec) => {
      const heading = rec.validatedHeading || rec.bestMatch?.heading || rec.term;
      const uri = rec.locUri || rec.bestMatch?.uri || "";
      const source = rec.source || "lcsh";
      return `Term: ${heading}\nURI: ${uri}\nSource: ${source.toUpperCase()}\nSimilarity: ${rec.similarity}%`;
    })
    .join("\n\n");

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: `Generate MARC records for these validated terms (use 650 for LCSH, 600 for LCNAF personal names, 610 for LCNAF corporate names):\n\n${termsPrompt}`,
      temperature: 0.1,
      maxTokens: 2048,
    } as any);

    return {
      text: result.text,
      usage: result.usage,
    };
  } catch (error) {
    throw formatError(error, provider);
  }
}

/**
 * Test AI provider connection from the browser.
 */
export async function testConnectionClientSide(options: {
  modelId: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
}): Promise<{ success: boolean; message: string }> {
  const { modelId, provider, apiKey, baseURL } = options;

  try {
    const model = createModelInstance({ provider, modelId, apiKey, baseURL });
    await generateText({
      model,
      prompt: "Say OK",
      maxTokens: 10,
    } as any);

    return { success: true, message: "Connection successful! Your configuration is working correctly." };
  } catch (error) {
    const formatted = formatError(error, provider);
    return { success: false, message: formatted.message };
  }
}

/**
 * Fetch model list from a provider's API directly from the browser.
 */
export async function fetchProviderModelsClientSide(
  provider: string,
  apiKey: string,
  baseURL?: string
): Promise<Array<{ id: string; name: string }>> {
  const PROVIDER_ENDPOINTS: Record<string, { url: string; headers: (key: string) => Record<string, string> }> = {
    openai: {
      url: "https://api.openai.com/v1/models",
      headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
    google: {
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      headers: () => ({}),
    },
    deepseek: {
      url: "https://api.deepseek.com/v1/models",
      headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
    groq: {
      url: "https://api.groq.com/openai/v1/models",
      headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
    together: {
      url: "https://api.together.xyz/v1/models",
      headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
    openrouter: {
      url: "https://openrouter.ai/api/v1/models",
      headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
  };

  const endpoint = PROVIDER_ENDPOINTS[provider];
  const url = endpoint ? endpoint.url : baseURL ? `${baseURL.replace(/\/+$/, "")}/models` : null;

  if (!url) {
    throw new Error(`No endpoint configured for provider: ${provider}`);
  }

  const headers = endpoint
    ? endpoint.headers(apiKey)
    : { Authorization: `Bearer ${apiKey}` };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Google uses a different response format
    if (provider === "google" && data.models) {
      return data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => ({
          id: m.name?.replace("models/", "") || m.name,
          name: m.displayName || m.name,
        }));
    }

    // OpenAI-compatible format
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => ({
        id: m.id,
        name: m.id,
      }));
    }

    return [];
  } catch (error) {
    throw formatError(error, provider);
  }
}
