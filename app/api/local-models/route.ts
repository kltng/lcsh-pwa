import { NextRequest, NextResponse } from "next/server";

/**
 * OpenAI-Compatible Models API Route
 * Fetches available models from any OpenAI-compatible endpoint
 * Used by Custom Endpoints configuration in Settings
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseURL = searchParams.get('baseURL');
  const apiKey = searchParams.get('apiKey');

  if (!baseURL) {
    return NextResponse.json(
      { error: 'baseURL parameter is required' },
      { status: 400 }
    );
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Failed to fetch models: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Normalize response - OpenAI-compatible endpoints return:
    // { data: [{ id: "model-name", object: "model", ... }, ...] }
    const models = data.data?.map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || m.id,
    })) || [];

    return NextResponse.json({ models });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('abort')) {
        return NextResponse.json(
          { error: 'Connection timeout. Please try again.' },
          { status: 504 }
        );
      }
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: `Cannot connect to ${baseURL}. Please check the URL and your network.` },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch models from endpoint' },
      { status: 500 }
    );
  }
}
