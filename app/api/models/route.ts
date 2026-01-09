import { NextResponse } from "next/server";

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch("https://models.dev/api.json", {
      next: { revalidate: 3600 }, // Cache for 1 hour
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch models.dev: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching models.dev:", error);
    
    // Return empty object instead of error to allow fallback to local registry
    // The client-side code will handle the empty response and use local registry
    return NextResponse.json({}, { status: 200 });
  }
}

