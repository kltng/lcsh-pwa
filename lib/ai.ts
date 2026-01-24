/**
 * Universal AI Service
 * Provides a unified interface for generating LCSH suggestions using any AI model
 */

export interface BibliographicInfo {
  title?: string;
  author?: string;
  abstract?: string;
  tableOfContents?: string;
  notes?: string;
  images?: Array<{
    data: string; // base64
    name: string;
    type: string;
  }>;
}

export interface GenerateOptions {
  modelId: string;
  apiKey?: string; // Deprecated: kept for backward compatibility
  apiKeys?: Array<{ id: string; provider: string; key: string; isDefault?: boolean }>; // NEW: array of API keys
  providerKeyId?: string; // NEW: specific key ID to use (optional)
  bibliographicInfo: BibliographicInfo;
  systemPromptRules?: string;
  provider?: string | null; // Selected provider to ensure correct model lookup
}

export interface MarcGenerationOptions {
  modelId: string;
  apiKey?: string; // Deprecated: kept for backward compatibility
  apiKeys?: Array<{ id: string; provider: string; key: string; isDefault?: boolean }>; // NEW: array of API keys
  providerKeyId?: string; // NEW: specific key ID to use (optional)
  recommendations: Array<{
    similarity: number;
    bestMatch?: {
      heading: string;
      identifier?: string;
    };
    apiId?: string;
  }>;
  provider?: string | null; // Selected provider to ensure correct model lookup
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate LCSH suggestions using the configured AI model
 */
export async function generateLcshSuggestions(
  options: GenerateOptions
): Promise<AIResponse> {
  const requestBody = {
    modelId: options.modelId,
    bibliographicInfo: options.bibliographicInfo,
    systemPromptRules: options.systemPromptRules || "",
    promptType: "suggestions",
    provider: options.provider,
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    ...(options.apiKeys ? { apiKeys: options.apiKeys } : {}),
    ...(options.providerKeyId ? { providerKeyId: options.providerKeyId } : {}),
  };

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate suggestions");
  }

  return await response.json();
}

/**
 * Generate MARC records for validated LCSH terms
 */
export async function generateMarcRecords(
  options: MarcGenerationOptions
): Promise<AIResponse> {
  const requestBody = {
    modelId: options.modelId,
    recommendations: options.recommendations,
    promptType: "marc",
    provider: options.provider,
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    ...(options.apiKeys ? { apiKeys: options.apiKeys } : {}),
    ...(options.providerKeyId ? { providerKeyId: options.providerKeyId } : {}),
  };

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate MARC records");
  }

  return await response.json();
}

/**
 * Parse LCSH suggestions from AI response
 */
export interface ParsedSuggestions {
  subjectAnalysis: string;
  candidateTerms: string[];
  recommendedTerms: Array<{
    term: string;
    marc: string;
    apiId: string;
    url: string;
    justification: string;
  }>;
  specialConsiderations: string;
  rawResponse: string;
}

export function parseLcshSuggestions(response: AIResponse): ParsedSuggestions {
  const content = response.text;

  // Extract subject analysis - handle both ### and #### headers
  const subjectAnalysisMatch = content.match(
    /#{3,4}\s*\*?\*?Subject Analysis\*?\*?\s+([\s\S]*?)(?=---)/i
  );
  const subjectAnalysis = subjectAnalysisMatch
    ? subjectAnalysisMatch[1].trim()
    : "";

  // Extract candidate terms - try multiple patterns for robustness
  // Handle both ### and #### headers (AI sometimes uses 4 hashes)
  const apiValidationMatch = content.match(
    /#{3,4}\s*\*?\*?API Validation Process\*?\*?\s+([\s\S]*?)(?=---)/i
  );
  const candidateTermsText = apiValidationMatch
    ? apiValidationMatch[1]
    : "";
  const candidateTerms: string[] = [];

  // Pattern 1: **Term** format (original)
  const boldTermRegex = /\d+\.\s+\*\*([^*]+)\*\*/g;
  let match;
  while ((match = boldTermRegex.exec(candidateTermsText)) !== null) {
    candidateTerms.push(match[1].trim());
  }

  // Pattern 2: If no bold terms found, try plain numbered list
  if (candidateTerms.length === 0) {
    const plainTermRegex = /^\s*\d+\.\s+(.+)$/gm;
    while ((match = plainTermRegex.exec(candidateTermsText)) !== null) {
      // Clean up: remove backticks and trim
      const term = match[1].replace(/`/g, '').trim();
      if (term && !term.startsWith('**')) {
        candidateTerms.push(term);
      }
    }
  }

  // Pattern 3: If still no terms, extract from "Recommended LCSH Terms" section directly
  if (candidateTerms.length === 0) {
    const recommendedMatch = content.match(
      /### \*\*Recommended LCSH Terms\*\*\s+([\s\S]*?)(?=---|\*\*Special Considerations\*\*|$)/
    );
    if (recommendedMatch) {
      const recommendedText = recommendedMatch[1];
      // Look for **[Term]** patterns
      const recTermRegex = /\d+\.\s+\*\*([^*()]+)/g;
      while ((match = recTermRegex.exec(recommendedText)) !== null) {
        const term = match[1].trim();
        if (term && !candidateTerms.includes(term)) {
          candidateTerms.push(term);
        }
      }
    }
  }

  // Extract recommended terms - handle both ### and #### headers
  const recommendedTermsMatch = content.match(
    /#{3,4}\s*\*?\*?Recommended LCSH Terms\*?\*?\s+([\s\S]*?)(?=---)/i
  );
  const recommendedTermsText = recommendedTermsMatch
    ? recommendedTermsMatch[1]
    : "";
  const recommendedTerms: ParsedSuggestions["recommendedTerms"] = [];
  const sections = recommendedTermsText.split(/\d+\.\s+\*\*/).slice(1);

  sections.forEach((section) => {
    const termMatch = section.match(/([^*]+)\*\*/);
    if (!termMatch) return;

    const term = termMatch[1].trim();
    const marcMatch = section.match(/```marc\s+([\s\S]*?)```/);
    const marc = marcMatch ? marcMatch[1].trim() : "";

    const apiIdMatch = section.match(/\*\*API ID:\*\*\s+([^\s]+)/);
    const apiId = apiIdMatch ? apiIdMatch[1].trim() : "";

    const urlMatch = section.match(/\*\*URL:\*\*\s+\[LCSH Record\]\(([^)]+)\)/);
    const url = urlMatch ? urlMatch[1].trim() : "";

    const justificationMatch = section.match(
      /\*\*Justification:\*\*\s+([^\n]+)/
    );
    const justification = justificationMatch
      ? justificationMatch[1].trim()
      : "";

    recommendedTerms.push({
      term,
      marc,
      apiId,
      url,
      justification,
    });
  });

  // Extract special considerations - handle both ### and #### headers
  const specialConsiderationsMatch = content.match(
    /#{3,4}\s*\*?\*?Special Considerations\*?\*?\s+([\s\S]*?)(?=$)/i
  );
  const specialConsiderations = specialConsiderationsMatch
    ? specialConsiderationsMatch[1].trim()
    : "";

  return {
    subjectAnalysis,
    candidateTerms,
    recommendedTerms,
    specialConsiderations,
    rawResponse: content,
  };
}

/**
 * Parse MARC records from AI response
 */
export function parseMarcRecords(
  response: AIResponse,
  terms: string[]
): Record<string, string> {
  const content = response.text;
  const marcRecords: Record<string, string> = {};

  const marcBlockRegex = /```marc\s+([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = marcBlockRegex.exec(content)) !== null && index < terms.length) {
    const marcRecord = match[1].trim();
    if (marcRecord && !Object.values(marcRecords).includes(marcRecord)) {
      marcRecords[terms[index]] = marcRecord;
      index++;
    }
  }

  return marcRecords;
}
