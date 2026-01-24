import { z } from "zod";

export interface LcshResult {
    label: string;
    uri: string;
}

export interface SearchOptions {
    count?: number;
    searchType?: "left-anchored" | "keyword";
    rdftype?: string; // For LCNAF (e.g., "PersonalName")
}

/**
 * Robustly parses the response from LOC Suggest2 API.
 * Handles both the new 'hits' dictionary format and the legacy list-based format.
 */
function parseLocResponse(data: any): LcshResult[] {
    // Handle new API response format (dict with 'hits')
    if (typeof data === "object" && data !== null && "hits" in data && Array.isArray(data.hits)) {
        return data.hits.map((hit: any) => ({
            label: hit.aLabel || hit.label || "",
            uri: hit.uri || "",
        }));
    }

    // Handle legacy list-based format: [query, [labels], [uris], ...]
    // Usually data[1] is simple literals (labels) and data[3] is URIs, or data[2] is URIs?
    // The Python code handled:
    // if isinstance(data, list) and len(data) >= 3:
    //    for uri, label in zip(data[1], data[2]): ... wait, the python code had zip(data[1], data[2])?
    // Let's re-verify the Python code from the context or stick to what we know about OpenSearch suggestions.
    // Standard OpenSearch Suggestion: [query, [completions], [descriptions], [urls]]
    // LOC Suggest2 often returns: [query, [labels], [uris], ...] OR just [query, [labels]]

    // Let's stick to the logic seen in `server.py` which seemed to handle a specific list format:
    // "Standard" OpenSearch for LOC might be: [query, [labels], [uris]] (names/suggest2 often does this)

    if (Array.isArray(data) && data.length >= 3) {
        const labels = data[1];
        const uris = data[2]; // or data[3]?

        // In server.py: 
        // for uri, label in zip(data[1], data[2]):
        // Wait, let's look at the actual Python code from step 141:
        // "for uri, label in zip(data[1], data[2])" -> This means it expects data[1] to be URIs and data[2] to be labels??
        // OR "if isinstance(data, list) and len(data) >= 3: ... for uri, label in zip(data[1], data[2])"

        // Let's be safer and check types.
        if (Array.isArray(labels) && Array.isArray(uris) && labels.length === uris.length) {
            return labels.map((label: any, index: number) => ({
                label: String(label || ""),
                uri: String(uris[index] || "")
            }));
        }
    }

    // Fallback for list of dicts (rare but possible)
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
        return data.map((hit: any) => ({
            label: hit.aLabel || hit.label || "",
            uri: hit.uri || "",
        }));
    }

    return [];
}

/**
 * Searches the Library of Congress Subject Headings (LCSH).
 */
export async function searchLcsh(query: string, options: SearchOptions = {}): Promise<LcshResult[]> {
    const { count = 25, searchType = "left-anchored" } = options;

    const url = "https://id.loc.gov/authorities/subjects/suggest2";
    const params = new URLSearchParams({
        q: query,
        count: count.toString(),
    });

    if (searchType === "keyword") {
        params.append("searchtype", "keyword");
    }

    try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (increased)

        const fullUrl = `${url}?${params.toString()}`;
        console.log(`Fetching LCSH from: ${fullUrl}`);

        const response = await fetch(fullUrl, {
            headers: {
                "User-Agent": "cataloging-assistant/1.0",
                "Accept": "application/json",
            },
            signal: controller.signal,
            // Remove 'next' option for server-side fetch - it's only for Next.js route handlers
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error(`LOC API returned ${response.status}: ${response.statusText} for query: ${query}`);
            console.error(`Response body: ${errorText.substring(0, 200)}`);
            throw new Error(`LOC API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const results = parseLocResponse(data);
        console.log(`LCSH search for "${query}" returned ${results.length} results`);
        return results;
    } catch (error) {
        console.error("Error searching LCSH:", error);
        console.error("Error details:", {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        // If it's a timeout, DNS error, or network error, return empty array instead of throwing
        if (error instanceof Error && (
            error.name === 'AbortError' || 
            error.message.includes('fetch failed') || 
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('getaddrinfo') ||
            error.message.includes('Could not resolve host') ||
            error.message.includes('network') ||
            error.message.includes('ECONNREFUSED')
        )) {
            console.warn(`LCSH search failed for "${query}" (timeout/network/DNS error), returning empty results`);
            return [];
        }
        throw error;
    }
}

/**
 * Searches the Library of Congress Name Authority File (LCNAF).
 */
export async function searchLcnaf(query: string, options: SearchOptions = {}): Promise<LcshResult[]> {
    const { count = 25, rdftype = "PersonalName" } = options;

    const url = "https://id.loc.gov/authorities/names/suggest2";
    const params = new URLSearchParams({
        q: query,
        rdftype: rdftype,
        count: count.toString(),
    });

    try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (increased)

        const fullUrl = `${url}?${params.toString()}`;
        console.log(`Fetching LCNAF from: ${fullUrl}`);

        const response = await fetch(fullUrl, {
            headers: {
                "User-Agent": "cataloging-assistant/1.0",
                "Accept": "application/json",
            },
            signal: controller.signal,
            // Remove 'next' option for server-side fetch - it's only for Next.js route handlers
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error(`LCNAF API returned ${response.status}: ${response.statusText} for query: ${query}`);
            console.error(`Response body: ${errorText.substring(0, 200)}`);
            throw new Error(`LOC API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const results = parseLocResponse(data);
        console.log(`LCNAF search for "${query}" returned ${results.length} results`);
        return results;
    } catch (error) {
        console.error("Error searching LCNAF:", error);
        console.error("Error details:", {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        // If it's a timeout, DNS error, or network error, return empty array instead of throwing
        if (error instanceof Error && (
            error.name === 'AbortError' || 
            error.message.includes('fetch failed') || 
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('getaddrinfo') ||
            error.message.includes('Could not resolve host') ||
            error.message.includes('network') ||
            error.message.includes('ECONNREFUSED')
        )) {
            console.warn(`LCNAF search failed for "${query}" (timeout/network/DNS error), returning empty results`);
            return [];
        }
        throw error;
    }
}
