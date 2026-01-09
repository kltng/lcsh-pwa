/**
 * Library of Congress Service
 * Client-side wrapper for LOC API routes
 */

export interface LOCResult {
  label: string;
  uri: string;
}

export interface LOCSearchResponse {
  results: LOCResult[];
  error?: string;
}

/**
 * Search Library of Congress Subject Headings
 */
export async function searchLCSH (
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

    const response = await fetch(`/api/search-lcsh?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to search LCSH");
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching LCSH:", error);
    return {
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search Library of Congress Name Authority File
 */
export async function searchLCNAF (
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

    const response = await fetch(`/api/search-lcnaf?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to search LCNAF");
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching LCNAF:", error);
    return {
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search multiple LCSH terms in parallel
 */
export async function searchMultipleTerms (
  terms: string[],
  concurrency: number = 2
): Promise<Record<string, LOCSearchResponse>> {
  const results: Record<string, LOCSearchResponse> = {};
  const queue = [...terms];

  const processQueue = async () => {
    while (queue.length > 0) {
      const term = queue.shift();
      if (!term) continue;

      console.log(`Searching LOC for term: "${term}"`);
      const result = await searchLCSH(term);
      results[term] = result;
    }
  };

  // Create multiple workers to process the queue in parallel
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, terms.length); i++) {
    workers.push(processQueue());
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  return results;
}

/**
 * Extract identifier from LOC URI
 */
export function extractIdentifier (uri: string): string {
  // LOC URIs typically look like: http://id.loc.gov/authorities/subjects/sh85012345
  const match = uri.match(/\/authorities\/(?:subjects|names)\/([^\/]+)/);
  return match ? match[1] : "";
}


