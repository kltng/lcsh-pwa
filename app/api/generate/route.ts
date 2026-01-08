import { NextRequest, NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getModelById, getModelSDKConfig, getAllModels } from "@/lib/models";
import { searchLcsh, searchLcnaf, type LcshResult } from "@/lib/lcsh";
import { calculateSimilarity } from "@/lib/similarity";
import { z } from "zod";

// Schema for structured LCSH suggestions
const lcshSuggestionSchema = z.object({
  terms: z.array(z.object({
    suggestedHeading: z.string().describe("The LCSH heading suggested based on the bibliographic information"),
  })).describe("Array of suggested LCSH terms (3-6 terms recommended)"),
});

// Response type for validated terms
interface ValidatedTerm {
  suggestedHeading: string;
  validatedHeading: string;
  locUri: string;
  matchType: "exact" | "closest";
  similarity: number;
  alternatives: Array<{ heading: string; uri: string; similarity: number }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modelId,
      apiKey,
      bibliographicInfo,
      systemPromptRules,
      promptType = "suggestions", // "suggestions" or "marc"
      recommendations, // For MARC generation
    } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: "modelId is required" },
        { status: 400 }
      );
    }

    const finalApiKey = apiKey || "";

    // Get model info
    console.log("Looking up model:", modelId);
    const modelInfo = await getModelById(modelId);
    console.log("Model info found:", modelInfo ? { id: modelInfo.id, name: modelInfo.name, provider: modelInfo.provider } : null);

    if (!modelInfo) {
      const allModels = await getAllModels();
      const similarModels = allModels
        .filter(m => m.id.toLowerCase().includes(modelId.toLowerCase()) || modelId.toLowerCase().includes(m.id.toLowerCase()))
        .slice(0, 5)
        .map(m => m.id);

      return NextResponse.json(
        {
          error: `Model ${modelId} not found`,
          suggestion: similarModels.length > 0 ? `Did you mean one of these: ${similarModels.join(", ")}?` : undefined
        },
        { status: 404 }
      );
    }

    // Get SDK config
    const sdkConfig = getModelSDKConfig(modelInfo);
    const modelName = sdkConfig.modelId;

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
      const openaiCompatible = createOpenAI({
        baseURL: sdkConfig.baseURL,
        apiKey: finalApiKey || "lm-studio",
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

Return ONLY valid LCSH-style headings. Do not include subdivisions unless you are confident they exist.`;

      const userPrompt = `Suggest LCSH terms for:

Title: ${bibliographicInfo.title || "N/A"}
Author: ${bibliographicInfo.author || "N/A"}
${bibliographicInfo.abstract ? `Abstract: ${bibliographicInfo.abstract}` : ""}
${bibliographicInfo.tableOfContents ? `Table of Contents: ${bibliographicInfo.tableOfContents}` : ""}
${bibliographicInfo.notes ? `Notes: ${bibliographicInfo.notes}` : ""}`;

      try {
        // Try structured output first
        const result = await generateObject({
          model,
          schema: lcshSuggestionSchema,
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.3,
        } as any);

        // Validate each suggested term against LOC
        const validatedTerms: ValidatedTerm[] = [];
        const resultData = result.object as { terms: Array<{ suggestedHeading: string }> } | null;
        const terms = resultData?.terms || [];

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
      } catch (structuredError) {
        // Fallback to text-based approach if structured output fails
        console.warn("Structured output failed, falling back to text:", structuredError);

        const result = await generateText({
          model,
          system: systemPrompt + "\n\nReturn your suggestions as a numbered list, one term per line.",
          prompt: userPrompt,
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
              validatedHeading: bestMatch.heading,
              locUri: bestMatch.uri,
              matchType: bestMatch.similarity >= 90 ? "exact" : "closest",
              similarity: bestMatch.similarity,
              alternatives: resultsWithSimilarity.slice(1, 4),
            });
          } else {
            validatedTerms.push({
              suggestedHeading: suggested,
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
