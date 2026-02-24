import { NextRequest, NextResponse } from "next/server";

const MODEL_ENDPOINTS: Record<string, { 
  url: string | ((key: string) => string); 
  headers: (key: string) => Record<string, string>;
  transform: (data: any) => { id: string; name: string }[];
}> = {
  openai: {
    url: "https://api.openai.com/v1/models",
    headers: (key) => ({ "Authorization": `Bearer ${key}` }),
    transform: (data) => (data.data || []).map((m: any) => ({ 
      id: m.id, 
      name: m.id.includes('gpt') ? formatOpenAIName(m.id) : m.id 
    })).filter((m: any) => 
      !m.id.includes('instruct') && 
      !m.id.includes('realtime') &&
      !m.id.includes('audio') &&
      !m.id.includes('embedding') &&
      !m.id.includes('whisper') &&
      !m.id.includes('tts') &&
      !m.id.includes('dall-e') &&
      !m.id.includes('moderation')
    ).sort((a: any, b: any) => {
      if (a.id.includes('o1') || a.id.includes('o3')) return -1;
      if (b.id.includes('o1') || b.id.includes('o3')) return 1;
      if (a.id.includes('gpt-4')) return -1;
      if (b.id.includes('gpt-4')) return 1;
      return a.id.localeCompare(b.id);
    }),
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/models?limit=100",
    headers: (key) => ({ 
      "x-api-key": key, 
      "anthropic-version": "2023-06-01" 
    }),
    transform: (data) => (data.data || []).map((m: any) => ({ 
      id: m.id, 
      name: m.display_name || m.id 
    })),
  },
  google: {
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    headers: () => ({ "Content-Type": "application/json" }),
    transform: (data) => (data.models || []).map((m: any) => {
      const id = m.name.replace('models/', '');
      return { id, name: m.displayName || id };
    }).filter((m: any) => 
      m.id.includes('gemini')
    ),
  },
  deepseek: {
    url: "https://api.deepseek.com/models",
    headers: (key) => ({ "Authorization": `Bearer ${key}` }),
    transform: (data) => (data.data || []).map((m: any) => ({ 
      id: m.id, 
      name: formatDeepSeekName(m.id) 
    })),
  },
};

function formatOpenAIName(id: string): string {
  const names: Record<string, string> = {
    'o1': 'O1',
    'o1-mini': 'O1 Mini',
    'o1-preview': 'O1 Preview',
    'o3-mini': 'O3 Mini',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt-4.1': 'GPT-4.1',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    'gpt-4.1-nano': 'GPT-4.1 Nano',
  };
  
  for (const [key, name] of Object.entries(names)) {
    if (id === key || id.startsWith(key + '-')) {
      return name;
    }
  }
  return id;
}

function formatDeepSeekName(id: string): string {
  const names: Record<string, string> = {
    'deepseek-chat': 'DeepSeek Chat',
    'deepseek-coder': 'DeepSeek Coder',
    'deepseek-reasoner': 'DeepSeek R1',
  };
  return names[id] || id;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  const apiKey = searchParams.get('apiKey');

  if (!provider) {
    return NextResponse.json(
      { error: 'provider parameter is required' },
      { status: 400 }
    );
  }

  const endpoint = MODEL_ENDPOINTS[provider];
  if (!endpoint) {
    return NextResponse.json(
      { error: `Provider ${provider} does not support dynamic model listing` },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is required for dynamic model fetching' },
      { status: 400 }
    );
  }

  try {
    const url = typeof endpoint.url === 'function' ? endpoint.url(apiKey) : endpoint.url;
    const response = await fetch(url, {
      method: 'GET',
      headers: endpoint.headers(apiKey),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const models = endpoint.transform(data);

    return NextResponse.json({ 
      models,
      source: 'api',
      provider,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('abort')) {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch models from provider' },
      { status: 500 }
    );
  }
}
