import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://models.dev/api.json", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models.dev: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching models.dev:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch models",
      },
      { status: 500 }
    );
  }
}

