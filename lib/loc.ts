/**
 * Library of Congress Service
 * Direct browser calls to LOC APIs (no server proxy)
 */

import { parseLocResponse } from "@/lib/lcsh";

export interface LOCResult {
  label: string;
  uri: string;
}

export interface LOCSearchResponse {
  results: LOCResult[];
  error?: string;
}

const LOC_USER_AGENT = "LCSH-PWA/1.0 (https://github.com/kltng/lcsh-pwa)";

/**
 * Fetch from LOC API with retry on 429/503 (exponential backoff).
 */
async function fetchLOCWithRetry(url: string, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": LOC_USER_AGENT },
    });
    if (response.ok) return response;
    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
      continue;
    }
    throw new Error(`LOC API returned ${response.status}: ${response.statusText}`);
  }
  throw new Error("LOC API request failed after retries");
}

/**
 * Search Library of Congress Subject Headings
 */
export async function searchLCSH(
  query: string,
  options?: {
    searchType?: "left-anchored" | "keyword";
    count?: number;
  }
): Promise<LOCSearchResponse> {
  try {
    const params = new URLSearchParams({
      q: query,
      count: (options?.count || 25).toString(),
    });

    if (options?.searchType === "keyword") {
      params.append("searchtype", "keyword");
    }

    const response = await fetchLOCWithRetry(
      `https://id.loc.gov/authorities/subjects/suggest2?${params.toString()}`
    );

    const data = await response.json();
    const results = parseLocResponse(data);
    return { results };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search Library of Congress Name Authority File
 */
export async function searchLCNAF(
  query: string,
  options?: {
    rdftype?: string;
    count?: number;
  }
): Promise<LOCSearchResponse> {
  try {
    const params = new URLSearchParams({
      q: query,
      rdftype: options?.rdftype || "PersonalName",
      count: (options?.count || 25).toString(),
    });

    const response = await fetchLOCWithRetry(
      `https://id.loc.gov/authorities/names/suggest2?${params.toString()}`
    );

    const data = await response.json();
    const results = parseLocResponse(data);
    return { results };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search multiple LCSH terms in parallel
 */
export async function searchMultipleTerms(
  terms: string[],
  concurrency: number = 2
): Promise<Record<string, LOCSearchResponse>> {
  const results: Record<string, LOCSearchResponse> = {};
  const queue = [...terms];

  const processQueue = async () => {
    while (queue.length > 0) {
      const term = queue.shift();
      if (!term) continue;

      const result = await searchLCSH(term);
      results[term] = result;
      // Rate limit: space LOC requests to avoid overwhelming the API
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, terms.length); i++) {
    workers.push(processQueue());
  }

  await Promise.all(workers);
  return results;
}

/**
 * Extract identifier from LOC URI
 */
export function extractIdentifier(uri: string): string {
  const match = uri.match(/\/authorities\/(?:subjects|names)\/([^\/]+)/);
  return match ? match[1] : "";
}
