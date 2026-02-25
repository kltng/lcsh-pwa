import { NextRequest, NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
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

// Response type for validated terms
interface ValidatedTerm {
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

/**
 * Normalizes an AI confidence value to 0-100 scale.
 * Detects when the AI outputs on a 0-1 scale and converts.
 */
function normalizeConfidence(confidence: number): number {
  if (confidence > 0 && confidence <= 1) {
    return Math.round(confidence * 100);
  }
  return Math.round(confidence);
}

// Tagged LOC result with source info
interface TaggedLcshResult extends LcshResult {
  source: "lcsh" | "lcnaf";
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

const providerKeyIndex = new Map<string, number>();

function parseApiKeys(rawValue?: string): string[] {
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getEnvApiKeys(providerId: string, envNames: string[]): string[] {
  const keys: string[] = [];
  const normalized = envNames.length > 0 ? envNames : [`${providerId.toUpperCase()}_API_KEY`];

  for (const envName of normalized) {
    const multiName = envName.endsWith("S") ? envName : `${envName}S`;
    keys.push(...parseApiKeys(process.env[multiName]));

    const singleValue = process.env[envName];
    if (singleValue) {
      keys.push(singleValue.trim());
    }
  }

  return Array.from(new Set(keys));
}

function selectApiKey(providerId: string, keys: string[]): string | undefined {
  if (keys.length === 0) return undefined;

  const currentIndex = providerKeyIndex.get(providerId) ?? 0;
  const selected = keys[currentIndex % keys.length];
  providerKeyIndex.set(providerId, (currentIndex + 1) % keys.length);
  return selected;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modelId,
      apiKey,
      apiKeys,
      providerKeyId,
      bibliographicInfo,
      systemPromptRules,
      promptType = "suggestions",
      recommendations,
      provider,
      baseURL,
    } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: "modelId is required" },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: "provider is required - please select a provider in settings" },
        { status: 400 }
      );
    }

    console.log("Looking up model:", modelId, "from provider:", provider);
    
    const providerModels = await getModelsByProvider(provider);
    const modelInfo = providerModels.find((m) => m.id === modelId) || null;
    
    console.log("Model info found:", modelInfo ? { 
      id: modelInfo.id, 
      name: modelInfo.name, 
      provider: modelInfo.provider,
      providerName: modelInfo.providerName 
    } : null);

    if (!modelInfo) {
      const availableModels = providerModels.slice(0, 5).map(m => m.id);
      
      return NextResponse.json(
        {
          error: `Model ${modelId} not found for provider ${provider}`,
          suggestion: availableModels.length > 0 
            ? `Available models from ${provider}: ${availableModels.join(", ")}` 
            : `No models found for provider ${provider}`
        },
        { status: 404 }
      );
    }

    // Get API key for provider
    // Priority: 1) env var, 2) apiKeys array (by providerKeyId or default), 3) apiKey (deprecated)
    let finalApiKey: string = "";

    // Server-side: check env var first
    if (typeof window === "undefined") {
      if (modelInfo.apiKeyEnv) {
        const envVarName = modelInfo.apiKeyEnv.toUpperCase();
        if (process.env[envVarName]) {
          finalApiKey = process.env[envVarName]!;
        }
      }
    }

    // If no env var, try apiKeys array
    if (!finalApiKey && Array.isArray(apiKeys)) {
      const key = apiKeys.find((k: any) =>
        providerKeyId
          ? k.id === providerKeyId
          : k.provider === provider && k.isDefault
      );
      if (key) {
        finalApiKey = key.key;
      }
    }

    // Fallback to deprecated apiKey
    if (!finalApiKey && apiKey) {
      finalApiKey = apiKey;
    }

    if (!finalApiKey) {
      return NextResponse.json(
        {
          error: `No API key found for provider ${provider}. Please add one in Settings.`,
        },
        { status: 400 }
      );
    }

    const sdkConfig = getModelSDKConfig(modelInfo);
    const sdkProvider = sdkConfig.provider;
    const modelName = sdkConfig.modelId;
    const hardcodedBaseURL = getProviderHardcodedBaseURL(provider);
    const effectiveBaseURL = baseURL || hardcodedBaseURL || sdkConfig.baseURL || "";

    console.log("Using SDK config:", { 
      sdkProvider, 
      modelName, 
      baseURL: effectiveBaseURL 
    });

    let model: any;
    if (sdkProvider === "openai") {
      const openaiClient = createOpenAI({ apiKey: finalApiKey });
      model = openaiClient(modelName);
    } else if (sdkProvider === "google") {
      const googleClient = createGoogleGenerativeAI({ apiKey: finalApiKey });
      model = googleClient(modelName);
    } else if (sdkProvider === "anthropic") {
      const anthropicClient = createAnthropic({ apiKey: finalApiKey });
      model = anthropicClient(modelName);
    } else {
      const openaiCompatible = createOpenAICompatible({
        name: provider,
        baseURL: effectiveBaseURL,
        apiKey: finalApiKey || "dummy",
      });
      model = openaiCompatible(modelName);
    }

    if (promptType === "marc") {
      // MARC record generation (keep as text-based)
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
        .filter((rec: any) => rec.similarity > 30)
        .map((rec: any) => {
          // Handle both new format (validatedHeading) and old format (bestMatch.heading)
          const heading = rec.validatedHeading || rec.bestMatch?.heading || rec.term;
          const uri = rec.locUri || rec.bestMatch?.uri || "";
          const source = rec.source || rec.bestMatch?.source || "lcsh";
          return `Term: ${heading}\nURI: ${uri}\nSource: ${source.toUpperCase()}\nSimilarity: ${rec.similarity}%`;
        })
        .join("\n\n");

      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: `Generate MARC records for these validated terms (use 650 for LCSH, 600 for LCNAF personal names, 610 for LCNAF corporate names):\n\n${termsPrompt}`,
        temperature: 0.1,
        maxTokens: 2048,
      } as any);

      return NextResponse.json({
        text: result.text,
        usage: result.usage,
      });
    } else {
      // LCSH suggestions with structured output
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

      // For OpenAI-compatible providers that require "json" in prompt for JSON mode
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

        // Validate each suggested term against LOC
        const validatedTerms: ValidatedTerm[] = [];
        const resultData = result.object as { subjectAnalysis?: string; terms: Array<{ suggestedHeading: string; reason: string }> } | null;
        let terms: Array<{ suggestedHeading: string; reason: string }> = [];
        const subjectAnalysis = resultData?.subjectAnalysis || "";

        // Handle different response formats
        if (resultData?.terms && Array.isArray(resultData.terms)) {
          terms = resultData.terms;
        } else {
          // Fallback: try to parse from raw response if schema validation failed
          try {
            const rawText = JSON.stringify(result.object);
            const parsed = JSON.parse(rawText);
            // Handle alternative formats like {"LCSH_terms": [...]}
            if (parsed.LCSH_terms && Array.isArray(parsed.LCSH_terms)) {
              terms = parsed.LCSH_terms.map((term: string) => ({ suggestedHeading: term, reason: "No reason provided" }));
            } else if (parsed.terms && Array.isArray(parsed.terms)) {
              // Handle array of strings
              terms = parsed.terms.map((term: string | { suggestedHeading: string; reason?: string }) =>
                typeof term === 'string' ? { suggestedHeading: term, reason: "No reason provided" } : { suggestedHeading: term.suggestedHeading, reason: term.reason || "No reason provided" }
              );
            }
          } catch (parseError) {
            console.warn("Failed to parse alternative format:", parseError);
          }
        }

        // Step 1: Search LOC for ALL terms in parallel
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
          // Build prompt with bibliographic info + all LOC results per suggestion
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

              // Use AI's pick but validate it exists in our results
              const aiPick = combined.find(r => r.uri === sel.bestMatchUri);
              if (aiPick) {
                const aiConf = normalizeConfidence(sel.confidence);
                const levSim = calculateSimilarity(sel.originalSuggestion, aiPick.label);
                const similarity = Math.max(aiConf, levSim);
                console.log(`AI selection for "${sel.originalSuggestion}": picked "${aiPick.label}", AI confidence=${sel.confidence}→${aiConf}, Levenshtein=${levSim}, final=${similarity}`);
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
                // AI picked something but it wasn't in our results — use it directly
                const aiConf = normalizeConfidence(sel.confidence);
                const levSim = calculateSimilarity(sel.originalSuggestion, sel.bestMatchHeading);
                const similarity = Math.max(aiConf, levSim);
                console.log(`AI selection for "${sel.originalSuggestion}": picked "${sel.bestMatchHeading}" (not in LOC results), AI confidence=${sel.confidence}→${aiConf}, Levenshtein=${levSim}, final=${similarity}`);
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
                // Fallback to Levenshtein for this term
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
                // Avoid duplicates
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
        } catch (aiSelectionError) {
          console.warn("AI selection failed, falling back to Levenshtein:", aiSelectionError);
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

        return NextResponse.json({
          subjectAnalysis,
          validatedTerms,
          usage: result.usage,
        });
      } catch (structuredError: any) {
        // Fallback: try to parse the response even if schema validation failed
        console.warn("Structured output validation failed, attempting to parse response:", structuredError);

        let terms: Array<{ suggestedHeading: string; reason?: string }> = [];

        // Try to extract the response from the error
        if (structuredError?.value) {
          try {
            const parsed = typeof structuredError.value === 'string'
              ? JSON.parse(structuredError.value)
              : structuredError.value;

            // Handle different formats
            if (parsed.LCSH_terms && Array.isArray(parsed.LCSH_terms)) {
              terms = parsed.LCSH_terms.map((term: string) => ({ suggestedHeading: term }));
            } else if (parsed.terms && Array.isArray(parsed.terms)) {
              terms = parsed.terms.map((term: string | { suggestedHeading: string; reason?: string }) =>
                typeof term === 'string' ? { suggestedHeading: term } : term
              );
            } else if (Array.isArray(parsed)) {
              terms = parsed.map((term: string) => ({ suggestedHeading: term }));
            }
          } catch (parseError) {
            console.warn("Failed to parse error response:", parseError);
          }
        }

        // If we successfully parsed terms, validate with unified flow
        if (terms.length > 0) {
          const validatedTerms: ValidatedTerm[] = [];

          // Search LOC for all terms in parallel
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

          return NextResponse.json({
            subjectAnalysis: "",
            validatedTerms,
            usage: structuredError?.usage,
          });
        }

        // Fallback to text-based approach if parsing failed
        console.warn("Falling back to text generation");

        const result = await generateText({
          model,
          system: systemPrompt + "\n\nReturn your suggestions as a numbered list, one term per line.",
          prompt: enhancedUserPrompt,
          temperature: 0.3,
          maxTokens: 1024,
        } as any);

        // Parse numbered list from text response
        const lines = result.text.split("\n");
        const suggestedTerms: string[] = [];
        for (const line of lines) {
          const match = line.match(/^\s*\d+\.\s*(.+)$/);
          if (match) {
            suggestedTerms.push(match[1].trim().replace(/\*\*/g, ""));
          }
        }

        // Validate each term using unified flow
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

        return NextResponse.json({
          subjectAnalysis: "",
          validatedTerms,
          usage: result.usage,
          fallback: true,
        });
      }
    }
  } catch (error) {
    console.error("Error generating:", error);

    let errorMessage = "Unknown error occurred";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes("not found") || error.message.includes("404")) {
        statusCode = 404;
      } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        statusCode = 401;
      } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
        statusCode = 403;
      } else if (error.message.includes("429") || error.message.includes("rate limit")) {
        statusCode = 429;
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        statusCode = 503;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
