/**
 * AI Response Parsing Utilities
 * Pure parsing functions for AI responses (no server calls)
 */

export type { BibliographicInfo } from "./ai-pipeline";

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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
 * Parse MARC records from AI response.
 * Handles both individual ```marc blocks per term and a single block with multiple lines.
 */
export function parseMarcRecords(
  response: AIResponse,
  terms: string[]
): Record<string, string> {
  const content = response.text;
  const marcRecords: Record<string, string> = {};

  // Extract all ```marc blocks
  const marcBlockRegex = /```marc\s+([\s\S]*?)```/g;
  let match;
  const allMarcLines: string[] = [];

  while ((match = marcBlockRegex.exec(content)) !== null) {
    const block = match[1].trim();
    // Split block into individual MARC records (each starts with a 6xx/1xx field tag)
    const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    allMarcLines.push(...lines);
  }

  // Also try to find MARC records outside code blocks (plain text lines starting with 6xx)
  if (allMarcLines.length === 0) {
    const plainLines = content.split("\n").map(l => l.trim());
    for (const line of plainLines) {
      if (/^\d{3}\s/.test(line)) {
        allMarcLines.push(line);
      }
    }
  }

  // Match each MARC line to a term by checking if the term's heading appears in the line
  const normalizeForMatch = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const assignedTerms = new Set<string>();
  const assignedLines = new Set<number>();

  // First pass: match by content — check if the MARC line contains the term text
  for (const term of terms) {
    if (assignedTerms.has(term)) continue;
    const normTerm = normalizeForMatch(term);
    for (let i = 0; i < allMarcLines.length; i++) {
      if (assignedLines.has(i)) continue;
      const normLine = normalizeForMatch(allMarcLines[i]);
      // Check if the main heading part of the term appears in the MARC line
      // Also try matching just the part before "--" (subdivision)
      const mainHeading = term.includes("--") ? term.split("--")[0].trim() : term;
      const normMain = normalizeForMatch(mainHeading);
      if (normLine.includes(normTerm) || normLine.includes(normMain)) {
        marcRecords[term] = allMarcLines[i];
        assignedTerms.add(term);
        assignedLines.add(i);
        break;
      }
    }
  }

  // Second pass: assign remaining lines by position to unmatched terms
  let lineIdx = 0;
  for (const term of terms) {
    if (assignedTerms.has(term)) continue;
    while (lineIdx < allMarcLines.length && assignedLines.has(lineIdx)) {
      lineIdx++;
    }
    if (lineIdx < allMarcLines.length) {
      marcRecords[term] = allMarcLines[lineIdx];
      assignedLines.add(lineIdx);
      lineIdx++;
    }
  }

  return marcRecords;
}
