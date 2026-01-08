/**
 * Utility functions for calculating similarity between strings
 */

export interface MatchItem {
  heading: string;
  [key: string]: any;
}

export interface BestMatch {
  item: MatchItem | null;
  similarity: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-100)
 */
export function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  // Exact match
  if (aLower === bLower) return 100;

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(aLower, bLower);

  // Calculate similarity score (0-100)
  const maxLength = Math.max(aLower.length, bLower.length);
  const similarity = Math.max(0, Math.round((1 - distance / maxLength) * 100));

  return similarity;
}

/**
 * Find the best match for a term in a list of items
 */
export function findBestMatch(
  term: string,
  items: MatchItem[]
): BestMatch {
  if (!items || items.length === 0) {
    return { item: null, similarity: 0 };
  }

  let bestMatch: MatchItem | null = null;
  let highestSimilarity = 0;

  items.forEach((item) => {
    const similarity = calculateSimilarity(term, item.heading);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = item;
    }
  });

  return {
    item: bestMatch,
    similarity: highestSimilarity,
  };
}

/**
 * Get a color based on similarity score
 */
export function getSimilarityColor(score: number): string {
  if (score >= 90) return "#4caf50"; // Green
  if (score >= 70) return "#8bc34a"; // Light Green
  if (score >= 50) return "#ffc107"; // Amber
  if (score >= 30) return "#ff9800"; // Orange
  return "#f44336"; // Red
}

/**
 * Get a text label based on similarity score
 */
export function getSimilarityLabel(score: number): string {
  if (score >= 90) return "Excellent Match";
  if (score >= 70) return "Good Match";
  if (score >= 50) return "Moderate Match";
  if (score >= 30) return "Poor Match";
  return "No Match";
}


