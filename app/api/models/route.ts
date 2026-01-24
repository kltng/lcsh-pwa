import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.USE_MODELS_DEV !== "true") {
    return NextResponse.json({}, { status: 200 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://models.dev/api.json", {
      next: { revalidate: 3600 },
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
    return NextResponse.json({}, { status: 200 });
  }
}
