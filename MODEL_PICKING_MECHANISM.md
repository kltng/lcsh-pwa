# Model Picking Mechanism

This document describes how the LCSH Cataloging Assistant fetches and manages AI models from various providers.

## Overview

The app supports three categories of AI providers:
1. **Cloud Providers** - OpenAI, Anthropic, Google, DeepSeek
2. **Local Models** - LM Studio, Ollama
3. **Custom Endpoints** - Any OpenAI-compatible API

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Settings Page (src/routes/settings/index.tsx)               │   │
│  │  - Provider selection (dropdown)                              │   │
│  │  - API key management                                         │   │
│  │  - Model refresh button → triggers fetch                      │   │
│  │  - Model selection (dropdown)                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  React Query Hooks (src/hooks/useQuery.ts)                   │   │
│  │  - useGetModels()      → Cloud providers                     │   │
│  │  - useGetLocalModels() → Local/custom endpoints              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Tauri Invoke (src/lib/queries.ts)                           │   │
│  │  - mutations.getModels(provider, apiKey, baseUrl)            │   │
│  │  - mutations.getLocalModels(baseUrl, apiKey?)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ Tauri IPC
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Rust)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Tauri Commands (src-tauri/src/api/commands.rs)              │   │
│  │  - get_models()      → for cloud providers                   │   │
│  │  - get_local_models() → for local/custom                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Provider Factory (src-tauri/src/ai/provider.rs)             │   │
│  │  create_provider(provider, config) → Box<dyn AIProvider>     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AIProvider Trait (src-tauri/src/ai/provider.rs)             │   │
│  │  - list_models() → Vec<ModelInfo>                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Provider Implementations                                    │   │
│  │  - OpenAIProvider      → async-openai crate                  │   │
│  │  - AnthropicProvider   → reqwest HTTP client                 │   │
│  │  - GoogleProvider      → reqwest HTTP client                 │   │
│  │  - OpenAICompatibleProvider → async-openai with custom URL   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP Requests
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIs                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ OpenAI          │  │ Anthropic       │  │ Google              │ │
│  │ /v1/models      │  │ /v1/models      │  │ /v1beta/models      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ LM Studio       │  │ Ollama          │  │ Custom Endpoints    │ │
│  │ /v1/models      │  │ /v1/models      │  │ /v1/models          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Actions (Frontend)

```typescript
// User clicks "Refresh" button in Settings
const handleRefreshModels = async () => {
  // Get API key for selected provider
  const apiKey = getDefaultApiKeyForProvider()
  const baseUrl = customBaseUrl || getBaseUrlForProvider()
  
  if (activeTab === 'local') {
    // Local models (LM Studio, Ollama, Custom)
    response = await getLocalModelsMutation.mutateAsync({
      baseUrl: baseUrl || 'http://localhost:1234/v1',
      apiKey: apiKey,  // Optional for local
    })
  } else {
    // Cloud providers (OpenAI, Anthropic, Google, DeepSeek)
    response = await getModelsMutation.mutateAsync({
      provider,
      apiKey: apiKey || '',
      baseUrl,
    })
  }
  
  // Update available models in state
  setAvailableModels(response.models)
}
```

### 2. Tauri IPC Call (Frontend → Backend)

```typescript
// src/lib/queries.ts
export const mutations = {
  getModels: (provider: string, apiKey: string, baseUrl?: string) =>
    tauriInvoke<ModelsResponse>('get_models', {
      provider,
      apiKey,
      baseUrl,
    }),
  
  getLocalModels: (baseUrl: string, apiKey?: string) =>
    tauriInvoke<ModelsResponse>('get_local_models', {
      baseUrl,
      apiKey,
    }),
}
```

### 3. Backend Command (Rust)

```rust
// src-tauri/src/api/commands.rs

#[tauri::command]
pub async fn get_models(
    provider: String,
    api_key: String,
    base_url: Option<String>,
    state: State<'_, AppState>,
) -> Result<ModelsResponse> {
    // Resolve base URL from config if not provided
    let resolved_base_url = match base_url {
        Some(url) => Some(url),
        None => state.get_provider_config(&provider).await
            .map(|c| c.base_url).flatten(),
    };
    
    // Create provider config
    let config = AIProviderConfig {
        api_key: Some(api_key),
        base_url: resolved_base_url,
    };
    
    // Create provider instance via factory
    let ai_provider = create_provider(&provider, config)?;
    
    // Call list_models on the provider
    let models = ai_provider.list_models().await?;
    
    Ok(ModelsResponse {
        models,
        source: "api".to_string(),
        provider,
    })
}
```

### 4. Provider Factory

```rust
// src-tauri/src/ai/provider.rs

pub fn create_provider(
    provider: &str,
    config: ProviderConfig,
) -> Result<Box<dyn AIProvider>> {
    match provider {
        // Native providers with their own SDKs
        "openai" => {
            let key = config.api_key.ok_or(AIError::MissingApiKey)?;
            Ok(Box::new(OpenAIProvider::new(key)))
        }
        "anthropic" => {
            let key = config.api_key.ok_or(AIError::MissingApiKey)?;
            Ok(Box::new(AnthropicProvider::new(key)))
        }
        "google" => {
            let key = config.api_key.ok_or(AIError::MissingApiKey)?;
            Ok(Box::new(GoogleProvider::new(key)))
        }
        
        // OpenAI-compatible providers (use default base URLs)
        "deepseek" => {
            let base_url = config.base_url.unwrap_or_else(|| 
                "https://api.deepseek.com/v1".to_string());
            let key = config.api_key.ok_or(AIError::MissingApiKey)?;
            Ok(Box::new(OpenAICompatibleProvider::with_name(
                base_url, key, "deepseek"
            )))
        }
        
        // Local providers (API key optional, uses localhost)
        "lm-studio" => {
            let base_url = config.base_url.unwrap_or_else(|| 
                "http://127.0.0.1:1234/v1".to_string());
            let key = config.api_key.unwrap_or_else(|| "dummy".to_string());
            Ok(Box::new(OpenAICompatibleProvider::with_name(
                base_url, key, "lm-studio"
            )))
        }
        "ollama" => {
            let base_url = config.base_url.unwrap_or_else(|| 
                "http://127.0.0.1:11434/v1".to_string());
            let key = config.api_key.unwrap_or_else(|| "dummy".to_string());
            Ok(Box::new(OpenAICompatibleProvider::with_name(
                base_url, key, "ollama"
            )))
        }
        
        // Custom endpoint (requires base_url)
        "custom" => {
            let base_url = config.base_url.ok_or_else(|| 
                AppError::Config("Custom provider requires base_url".to_string()))?;
            let key = config.api_key.unwrap_or_else(|| "dummy".to_string());
            Ok(Box::new(OpenAICompatibleProvider::with_name(
                base_url, key, "custom"
            )))
        }
        
        _ => Err(AIError::UnsupportedProvider(provider.to_string()).into()),
    }
}
```

## Provider Implementations

### OpenAI Provider

Uses the `async-openai` crate which provides a typed Rust SDK.

```rust
// src-tauri/src/ai/openai.rs

pub struct OpenAIProvider {
    client: Client<OpenAIConfig>,
    api_key: String,
}

impl OpenAIProvider {
    pub fn new(api_key: String) -> Self {
        let config = OpenAIConfig::new().with_api_key(&api_key);
        let client = Client::with_config(config);
        Self { client, api_key }
    }
}

#[async_trait]
impl AIProvider for OpenAIProvider {
    async fn list_models(&self) -> Result<Vec<ModelInfo>> {
        // Call OpenAI's /v1/models endpoint
        let response = self.client.models().list().await
            .map_err(|e| AIError::Provider(e.to_string()))?;

        // Filter to only GPT models
        Ok(response.data.into_iter()
            .filter(|m| m.id.starts_with("gpt"))
            .map(|m| ModelInfo {
                id: m.id.clone(),
                name: m.id,
            })
            .collect())
    }
}
```

**API Endpoint**: `GET https://api.openai.com/v1/models`
**Headers**: `Authorization: Bearer {api_key}`

### Anthropic Provider

Uses `reqwest` HTTP client with custom serialization.

```rust
// src-tauri/src/ai/anthropic.rs

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
}

#[async_trait]
impl AIProvider for AnthropicProvider {
    async fn list_models(&self) -> Result<Vec<ModelInfo>> {
        let response = self.client
            .get("https://api.anthropic.com/v1/models")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        // Fallback to hardcoded list if API fails
        if !response.status().is_success() {
            return Ok(vec![
                ModelInfo { id: "claude-3-5-sonnet-20241022".into(), name: "Claude 3.5 Sonnet".into() },
                ModelInfo { id: "claude-3-5-haiku-20241022".into(), name: "Claude 3.5 Haiku".into() },
            ]);
        }

        let api_response: AnthropicModelsResponse = response.json().await
            .map_err(|e| AIError::Parse(e.to_string()))?;

        Ok(api_response.data.into_iter()
            .map(|m| ModelInfo { id: m.id, name: m.display_name })
            .collect())
    }
}
```

**API Endpoint**: `GET https://api.anthropic.com/v1/models`
**Headers**: 
- `x-api-key: {api_key}`
- `anthropic-version: 2023-06-01`

### Google Provider

Uses `reqwest` HTTP client with API key in query string.

```rust
// src-tauri/src/ai/google.rs

pub struct GoogleProvider {
    client: Client,
    api_key: String,
}

#[async_trait]
impl AIProvider for GoogleProvider {
    async fn list_models(&self) -> Result<Vec<ModelInfo>> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models?key={}",
            self.api_key
        );

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| AIError::Network(e.to_string()))?;

        // Fallback to hardcoded list if API fails
        if !response.status().is_success() {
            return Ok(vec![
                ModelInfo { id: "gemini-1.5-flash".into(), name: "Gemini 1.5 Flash".into() },
                ModelInfo { id: "gemini-1.5-pro".into(), name: "Gemini 1.5 Pro".into() },
            ]);
        }

        let api_response: GeminiModelsResponse = response.json().await
            .map_err(|e| AIError::Parse(e.to_string()))?;

        Ok(api_response.models.into_iter()
            .filter(|m| m.name.contains("gemini"))
            .map(|m| {
                let id = m.name.replace("models/", "");
                ModelInfo {
                    id: id.clone(),
                    name: m.display_name.unwrap_or(id),
                }
            })
            .collect())
    }
}
```

**API Endpoint**: `GET https://generativelanguage.googleapis.com/v1beta/models?key={api_key}`

### OpenAI-Compatible Provider

Used for DeepSeek, Qwen, LM Studio, Ollama, and custom endpoints.

```rust
// src-tauri/src/ai/openai_compat.rs

pub struct OpenAICompatibleProvider {
    client: Client<OpenAIConfig>,
    provider_name: String,
}

impl OpenAICompatibleProvider {
    pub fn new(base_url: String, api_key: String) -> Self {
        let config = OpenAIConfig::new()
            .with_api_base(&base_url)
            .with_api_key(&api_key);
        let client = Client::with_config(config);
        Self { 
            client, 
            provider_name: "openai-compatible".to_string() 
        }
    }

    pub fn with_name(base_url: String, api_key: String, name: &str) -> Self {
        let config = OpenAIConfig::new()
            .with_api_base(&base_url)
            .with_api_key(&api_key);
        let client = Client::with_config(config);
        Self { 
            client, 
            provider_name: name.to_string() 
        }
    }
}

#[async_trait]
impl AIProvider for OpenAICompatibleProvider {
    async fn list_models(&self) -> Result<Vec<ModelInfo>> {
        // Calls {base_url}/models using OpenAI SDK
        let response = self.client.models().list().await
            .map_err(|e| AIError::Provider(e.to_string()))?;

        Ok(response.data.into_iter()
            .map(|m| ModelInfo {
                id: m.id.clone(),
                name: m.id,
            })
            .collect())
    }
}
```

**API Endpoint**: `GET {base_url}/models`
**Headers**: `Authorization: Bearer {api_key}`

## Data Types

### Request Types (Frontend → Backend)

```typescript
// Cloud providers
{
  provider: string,      // "openai" | "anthropic" | "google" | "deepseek"
  apiKey: string,        // Provider API key
  baseUrl?: string,      // Optional custom base URL
}

// Local/Custom providers
{
  baseUrl: string,       // e.g., "http://localhost:1234/v1"
  apiKey?: string,       // Optional (most local servers don't require)
}
```

### Response Types (Backend → Frontend)

```typescript
interface ModelsResponse {
  models: Model[]
  source: string      // "api" | "local"
  provider: string    // Provider name or base URL
}

interface Model {
  id: string          // Model ID for API calls (e.g., "gpt-4o")
  name: string        // Display name (e.g., "GPT-4o")
  provider?: string   // Optional provider info
  contextLength?: number
}
```

### Rust Types

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelsResponse {
    pub models: Vec<ModelInfo>,
    pub source: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
}
```

## Default Base URLs

| Provider | Default Base URL |
|----------|-----------------|
| OpenAI | (SDK default: `https://api.openai.com/v1`) |
| Anthropic | `https://api.anthropic.com/v1` |
| Google | `https://generativelanguage.googleapis.com/v1beta` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Moonshot | `https://api.moonshot.cn/v1` |
| Minimax | `https://api.minimax.chat/v1` |
| Zhipu | `https://open.bigmodel.cn/api/paas/v4` |
| LM Studio | `http://127.0.0.1:1234/v1` |
| Ollama | `http://127.0.0.1:11434/v1` |

## Error Handling

### Fallback Behavior

When the models API fails, some providers return hardcoded fallback model lists:

```rust
// Anthropic fallback
if !response.status().is_success() {
    return Ok(vec![
        ModelInfo { id: "claude-3-5-sonnet-20241022".into(), name: "Claude 3.5 Sonnet".into() },
        ModelInfo { id: "claude-3-5-haiku-20241022".into(), name: "Claude 3.5 Haiku".into() },
    ]);
}
```

### Error Types

```rust
pub enum AIError {
    MissingApiKey,
    InvalidApiKey,
    RateLimit,
    ModelNotFound(String),
    Network(String),
    Parse(String),
    Provider(String),
    Timeout,
    UnsupportedProvider(String),
    StructuredOutputNotSupported,
    ImageProcessing(String),
}
```

## State Management

### Frontend State (Zustand)

```typescript
// src/stores/settingsStore.ts

interface SettingsState {
  // Selected provider and model
  provider: string | null
  modelId: string | null
  
  // API keys per provider
  apiKeys: ApiKey[]
  
  // Custom provider configurations
  providerConfigs: ProviderConfig[]
  
  // Actions
  setProvider: (provider: string | null) => void
  setModelId: (modelId: string | null) => void
  addApiKey: (key: ApiKey) => void
  addProviderConfig: (config: ProviderConfig) => void
}

interface ApiKey {
  id: string
  provider: string
  key: string
  label?: string
  createdAt: string
  isDefault?: boolean
}

interface ProviderConfig {
  provider: string
  baseUrl?: string
  label?: string
  customModels?: string[]
}
```

### API Key Resolution

```typescript
// Get the default API key for a provider
function getDefaultApiKey(provider: string): ApiKey | undefined {
  const state = useSettingsStore.getState()
  
  // First, try to find a key marked as default for this provider
  return state.apiKeys.find(k => k.provider === provider && k.isDefault) ||
         // Fall back to first key for this provider
         state.apiKeys.find(k => k.provider === provider)
}
```

## Usage Example

### Complete Flow

1. **User selects provider** (e.g., "OpenAI")
2. **User adds API key** in Settings
3. **User clicks "Refresh"** to fetch available models
4. **Frontend calls** `get_models` Tauri command
5. **Backend creates** OpenAI provider instance
6. **Backend calls** OpenAI's `/v1/models` endpoint
7. **Response is parsed** and returned to frontend
8. **Frontend populates** model dropdown with fetched models
9. **User selects** a model from the dropdown
10. **Selection is persisted** to localStorage via Zustand

### Code Example

```typescript
// In Settings component
const handleRefreshModels = async () => {
  if (!provider) return
  
  const apiKey = getDefaultApiKey(provider)?.key
  if (!apiKey && activeTab !== 'local') {
    setModelsError('Please add an API key first')
    return
  }
  
  setModelsError(null)
  setAvailableModels([])
  
  try {
    const response = activeTab === 'local'
      ? await getLocalModelsMutation.mutateAsync({
          baseUrl: customBaseUrl || 'http://localhost:1234/v1',
          apiKey,
        })
      : await getModelsMutation.mutateAsync({
          provider,
          apiKey: apiKey || '',
          baseUrl: customBaseUrl,
        })
    
    setAvailableModels(response.models)
  } catch (err) {
    setModelsError(err instanceof Error ? err.message : 'Failed to fetch models')
  }
}
```

## Implementation Notes for Web Version

### Key Differences for Web

1. **No Tauri IPC** - Replace with direct HTTP calls from browser
2. **CORS Considerations** - May need a backend proxy for some providers
3. **Environment Variables** - Store API keys server-side for security
4. **API Routes** - Create Next.js API routes to proxy provider requests

### Recommended Web Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER                                      │
│  React components call Next.js API routes                            │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTES                                │
│  /api/models                                                        │
│  /api/local-models                                                  │
│  - Handle authentication                                             │
│  - Proxy requests to providers                                       │
│  - Manage API keys (server-side)                                    │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AI PROVIDERS                                    │
│  Same HTTP endpoints as desktop app                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Sample Next.js API Route

```typescript
// app/api/models/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')
  const apiKey = searchParams.get('apiKey')
  const baseUrl = searchParams.get('baseUrl')
  
  // Validate inputs
  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }
  
  try {
    // Call provider's models endpoint
    const response = await fetch(`${baseUrl || getDefaultBaseUrl(provider)}/models`, {
      headers: getProviderHeaders(provider, apiKey),
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch models', models: getFallbackModels(provider) },
        { status: 200 } // Return fallback with 200 to not break UI
      )
    }
    
    const data = await response.json()
    const models = parseModelsResponse(provider, data)
    
    return NextResponse.json({ models, source: 'api', provider })
  } catch (error) {
    return NextResponse.json(
      { error: 'Network error', models: getFallbackModels(provider) },
      { status: 200 }
    )
  }
}

function getDefaultBaseUrl(provider: string): string {
  const urls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    // ... etc
  }
  return urls[provider] || ''
}

function getProviderHeaders(provider: string, apiKey: string): HeadersInit {
  switch (provider) {
    case 'anthropic':
      return {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      }
    case 'google':
      return {} // Google uses query param
    default:
      return {
        'Authorization': `Bearer ${apiKey}`,
      }
  }
}
```
