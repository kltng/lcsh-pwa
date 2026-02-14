import { NextRequest, NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getModelsByProvider, getModelSDKConfig } from "@/lib/models";
import { searchLcsh, type LcshResult } from "@/lib/lcsh";
import { calculateSimilarity } from "@/lib/similarity";
import { z } from "zod";

// Schema for structured LCSH suggestions
const lcshSuggestionSchema = z.object({
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
  alternatives: Array<{ heading: string; uri: string; similarity: number }>;
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
      apiKey, // Deprecated: single key (optional now)
      apiKeys, // NEW: array of API keys
      providerKeyId, // NEW: specific key ID to use (optional)
      bibliographicInfo,
      systemPromptRules,
      promptType = "suggestions", // "suggestions" or "marc"
      recommendations, // For MARC generation
      provider, // Selected provider from settings - CRITICAL for correct model lookup
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

    // Get model info - MUST filter by provider to ensure we get the correct model
    // Multiple providers (e.g., "google", "firmware", "vercel") may host the same model
    // We need to use the model from the provider the user selected
    console.log("Looking up model:", modelId, "from provider:", provider);
    
    // Get all models for the selected provider and find the matching model
    const providerModels = await getModelsByProvider(provider);
    const modelInfo = providerModels.find((m) => m.id === modelId);
    
    console.log("Model info found:", modelInfo ? { 
      id: modelInfo.id, 
      name: modelInfo.name, 
      provider: modelInfo.provider,
      providerName: modelInfo.providerName 
    } : null);

    if (!modelInfo) {
      // Provide helpful error with available models from the selected provider
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

    const requiresApiKey = provider !== "lmstudio";
    if (!finalApiKey && requiresApiKey) {
      return NextResponse.json(
        {
          error: `No API key found for provider ${provider}. Please add one in Settings.`,
        },
        { status: 400 }
      );
    }

    // Get SDK config - this determines which AI SDK to use
    const sdkConfig = getModelSDKConfig(modelInfo);
    const modelName = sdkConfig.modelId;

    console.log("Using SDK config:", { 
      sdkProvider: sdkConfig.provider, 
      modelName, 
      baseURL: sdkConfig.baseURL 
    });

    let model: any;
    if (sdkConfig.provider === "openai") {
      const openaiClient = createOpenAI({ apiKey: finalApiKey });
      model = openaiClient(modelName);
    } else if (sdkConfig.provider === "google") {
      const googleClient = createGoogleGenerativeAI({ apiKey: finalApiKey });
      model = googleClient(modelName);
    } else if (sdkConfig.provider === "anthropic") {
      const anthropicClient = createAnthropic({ apiKey: finalApiKey });
      model = anthropicClient(modelName);
    } else {
      const openaiCompatible = createOpenAICompatible({
        name: modelInfo.provider,
        baseURL: sdkConfig.baseURL || "",
        apiKey: finalApiKey || "dummy",
      });
      model = openaiCompatible(modelName);
    }

    if (promptType === "marc") {
      // MARC record generation (keep as text-based)
      const systemPrompt = `You are a library cataloging expert specializing in MARC records for Library of Congress Subject Headings (LCSH).

For each validated LCSH term provided, generate a MARC 650 field record.

Format each record as:
\`\`\`marc
650 [indicators] $a [Main heading] $x [Subdivision] $z [Geographic subdivision] $y [Chronological subdivision]
\`\`\`

Only include necessary subfields. Be precise and follow cataloging standards.`;

      const termsPrompt = recommendations
        .filter((rec: any) => rec.similarity > 30)
        .map((rec: any) => {
          // Handle both new format (validatedHeading) and old format (bestMatch.heading)
          const heading = rec.validatedHeading || rec.bestMatch?.heading || rec.term;
          const uri = rec.locUri || rec.bestMatch?.uri || "";
          return `Term: ${heading}\nURI: ${uri}\nSimilarity: ${rec.similarity}%`;
        })
        .join("\n\n");

      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: `Generate MARC 650 records for these validated LCSH terms:\n\n${termsPrompt}`,
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

Based on the bibliographic information provided, suggest 3-6 appropriate LCSH terms.
Focus on:
1. Main topical subjects
2. Geographic subjects if relevant
3. Chronological aspects if relevant
4. Form/genre if applicable

Return ONLY valid LCSH-style headings. Do not include subdivisions unless you are confident they exist.

IMPORTANT: You must return a JSON object with a "terms" array. Each term must be an object with a "suggestedHeading" and "reason" property. The reason should explain why this heading is appropriate for the work. Example format:
{
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
      const needsJsonInPrompt = sdkConfig.provider === "openai-compatible";
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
        const resultData = result.object as { terms: Array<{ suggestedHeading: string; reason: string }> } | null;
        let terms: Array<{ suggestedHeading: string; reason: string }> = [];

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

        for (const term of terms) {
          const suggested = term.suggestedHeading;
          console.log(`Validating term: "${suggested}"`);

          // Search LOC for this term
          const searchResults = await searchLcsh(suggested, { count: 5, searchType: "keyword" });

          if (searchResults.length > 0) {
            // Calculate similarity for each result
            const resultsWithSimilarity = searchResults.map((r: LcshResult) => ({
              heading: r.label,
              uri: r.uri,
              similarity: calculateSimilarity(suggested, r.label),
            }));

            // Sort by similarity
            resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

            const bestMatch = resultsWithSimilarity[0];
            const matchType = bestMatch.similarity >= 90 ? "exact" : "closest";

            validatedTerms.push({
              suggestedHeading: suggested,
              reason: term.reason || "No reason provided",
              validatedHeading: bestMatch.heading,
              locUri: bestMatch.uri,
              matchType,
              similarity: bestMatch.similarity,
              alternatives: resultsWithSimilarity.slice(1, 4),
            });
          } else {
            // No results found - mark as unvalidated
            validatedTerms.push({
              suggestedHeading: suggested,
              reason: term.reason || "No reason provided",
              validatedHeading: suggested,
              locUri: "",
              matchType: "closest",
              similarity: 0,
              alternatives: [],
            });
          }
        }

        return NextResponse.json({
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
        
        // If we successfully parsed terms, use them; otherwise fall back to text
        if (terms.length > 0) {
          // Validate each suggested term against LOC
          const validatedTerms: ValidatedTerm[] = [];
          
          for (const term of terms) {
            const suggested = term.suggestedHeading;
            console.log(`Validating term: "${suggested}"`);

            // Search LOC for this term
            const searchResults = await searchLcsh(suggested, { count: 5, searchType: "keyword" });

            if (searchResults.length > 0) {
              const resultsWithSimilarity = searchResults.map((r: LcshResult) => ({
                heading: r.label,
                uri: r.uri,
                similarity: calculateSimilarity(suggested, r.label),
              }));
              resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

              const bestMatch = resultsWithSimilarity[0];
              validatedTerms.push({
                suggestedHeading: suggested,
                reason: term.reason || "No reason provided",
                validatedHeading: bestMatch.heading,
                locUri: bestMatch.uri,
                matchType: bestMatch.similarity >= 90 ? "exact" : "closest",
                similarity: bestMatch.similarity,
                alternatives: resultsWithSimilarity.slice(1, 4),
              });
            } else {
              validatedTerms.push({
                suggestedHeading: suggested,
                reason: term.reason || "No reason provided",
                validatedHeading: suggested,
                locUri: "",
                matchType: "closest",
                similarity: 0,
                alternatives: [],
              });
            }
          }

          return NextResponse.json({
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

        // Validate each term
        const validatedTerms: ValidatedTerm[] = [];
        for (const suggested of suggestedTerms) {
          const searchResults = await searchLcsh(suggested, { count: 5, searchType: "keyword" });

          if (searchResults.length > 0) {
            const resultsWithSimilarity = searchResults.map((r: LcshResult) => ({
              heading: r.label,
              uri: r.uri,
              similarity: calculateSimilarity(suggested, r.label),
            }));
            resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

            const bestMatch = resultsWithSimilarity[0];
            validatedTerms.push({
              suggestedHeading: suggested,
              reason: "Generated in fallback mode - reason not available",
              validatedHeading: bestMatch.heading,
              locUri: bestMatch.uri,
              matchType: bestMatch.similarity >= 90 ? "exact" : "closest",
              similarity: bestMatch.similarity,
              alternatives: resultsWithSimilarity.slice(1, 4),
            });
          } else {
            validatedTerms.push({
              suggestedHeading: suggested,
              reason: "Generated in fallback mode - reason not available",
              validatedHeading: suggested,
              locUri: "",
              matchType: "closest",
              similarity: 0,
              alternatives: [],
            });
          }
        }

        return NextResponse.json({
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
