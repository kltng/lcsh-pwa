# Plan: Rebuild Model Switching with models.dev + Vercel AI SDK

**Date:** January 24, 2026
**Goal:** Replace the hardcoded model registry with dynamic model discovery from models.dev API
**Reference Implementation:** https://github.com/anomalyco/opencode

---

## Overview

The current implementation uses a hardcoded model registry (`lib/model-registry.ts`) with ~45 models across 10 providers. We will rebuild this to use **models.dev** as the primary source for model discovery while maintaining the Vercel AI SDK integration.

### Key Benefits

- **Dynamic Model Discovery**: Access to 75+ providers and 500+ models from models.dev
- **Automatic Updates**: New models/providers automatically available
- **Provider-Agnostic**: No vendor lock-in, easy to switch between providers
- **Fallback Safety**: Local registry remains as backup if models.dev is unavailable

---

## Architecture

### Current State

```
User → Settings (lib/model-registry.ts: hardcoded list)
         ↓
    API Route (app/api/generate/route.ts)
         ↓
    AI SDK (createOpenAI/createGoogle/createAnthropic)
```

### Target State

```
User → Settings (lib/models.ts: models.dev API)
         ↓         ↘
    API Route    Local Registry (lib/model-registry.ts fallback)
         ↓
    AI SDK (dynamic provider selection)
```

---

## Implementation Steps

### Phase 1: Restore models.dev API Integration

#### Step 1.1: Create API Proxy Route
**File:** `app/api/models/route.ts` (NEW)

**Purpose:** Proxy models.dev API to avoid CORS issues on client-side

```typescript
export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
    // Return empty object to allow fallback to local registry
    return NextResponse.json({}, { status: 200 });
  }
}
```

---

#### Step 1.2: Restore models.ts Service
**File:** `lib/models.ts` (NEW/RECREATE)

**Purpose:** Fetch and parse models.dev API with caching and fallback

**Key Functions:**

```typescript
// Type definitions
type ModelsDevResponse = Record<string, {
  id: string;
  name: string;
  npm?: string;
  env?: string[];
  doc?: string;
  api?: string;
  models?: Record<string, ModelData>;
}>;

// Core functions
export async function fetchModelsDev(): Promise<ModelsDevResponse>
export async function getProviders(): Promise<ProviderInfo[]>
export async function getAllModels(): Promise<ModelInfo[]>
export async function getModelsByProvider(providerId: string): Promise<ModelInfo[]>
export async function getModelById(modelId: string): Promise<ModelInfo | null>
```

**Implementation Details:**

1. **Caching Strategy**
   - In-memory cache with 24-hour TTL
   - Separate caches for providers and models
   - Cache timestamp tracking

 2. **Feature Flag Support**
    - Check `USE_MODELS_DEV` environment variable
    - If `USE_MODELS_DEV=false` or unset, always use local registry
    - If `USE_MODELS_DEV=true`, use models.dev with fallback to local

 3. **Fetch Logic**
    - Server-side: direct fetch to `https://models.dev/api.json`
    - Client-side: use `/api/models` route to avoid CORS
    - Only fetch if `USE_MODELS_DEV=true`

 4. **Model ID Resolution**
    - Use model's own `id` field if present
    - Otherwise construct: `${providerId}/${modelId}`

 5. **Fallback Mechanism**
    - If models.dev fails, fall back to local registry
    - Local registry functions from `lib/model-registry.ts`
    - Log warnings when fallback occurs

---

### Phase 1.5: Feature Flag Implementation

#### Step 1.5.1: Environment Variable Support
**File:** `lib/models.ts` (MODIFY)

**Purpose:** Add feature flag to toggle models.dev on/off

**Implementation:**

```typescript
export function shouldUseModelsDev(): boolean {
  // Check server-side env var
  if (typeof window === "undefined") {
    return process.env.USE_MODELS_DEV === "true";
  }
  // Client-side: check if feature is enabled via API
  return true; // Default to true on client if not checked
}
```

**Usage in `getProviders()` and `getAllModels()`:**

```typescript
export async function getProviders(): Promise<ProviderInfo[]> {
  const now = Date.now();
  if (cachedProviders && now - cacheTimestamp < CACHE_DURATION) {
    return cachedProviders;
  }

  // Check feature flag
  if (!shouldUseModelsDev()) {
    console.log("models.dev disabled via USE_MODELS_DEV, using local registry");
    const localProviders = getLocalProviders();
    cachedProviders = localProviders.map((p) => ({
      id: p.id,
      name: p.name,
      api: p.baseURL,
      env: p.apiKeyEnv ? [p.apiKeyEnv] : undefined,
    }));
    cacheTimestamp = now;
    return cachedProviders;
  }

  try {
    const data = await fetchModelsDev();
    // ... existing logic
  } catch (error) {
    // Fallback to local registry
    console.warn("Failed to fetch from models.dev, using local registry:", error);
    // ... fallback logic
  }
}
```

**Environment Variable Setup:**

Add to `.env.local`:
```bash
# Set to "true" to use models.dev, "false" to use only local registry
USE_MODELS_DEV=true
```

---

### Phase 1.6: Server-Side API Keys (Multi-Key Support)

#### Step 1.6.1: Environment Variable Conventions
**Files:** Server environment (deployment config)

**Purpose:** Store all API keys server-side, support multiple keys per provider

**Conventions:**

- Use models.dev provider env names (e.g., `OPENAI_API_KEY`)
- Support multiple keys via `${ENV_NAME}S` (comma-separated)

Example:

```bash
OPENAI_API_KEY=key_primary
OPENAI_API_KEYS=key_primary,key_secondary,key_third
```

#### Step 1.6.2: Server-Side Key Selection
**File:** `app/api/generate/route.ts` (MODIFY)

**Behavior:**

- Read provider env names from models.dev data (`ProviderInfo.env`)
- Parse multi-key values from `${ENV_NAME}S`
- Select keys using round-robin per provider
- If provider has env names and no keys, return 400
- Providers without env names (or `lmstudio`) allow empty key

#### Step 1.6.3: Test Connection
**File:** `app/settings/page.tsx` (MODIFY)

**Behavior:**

- Test uses server-side keys
- No API key input in the UI

---

### Phase 3.5: Update Settings UI (Server-Managed Keys)

#### Step 3.5.1: Remove Client-Side API Key Input
**File:** `app/settings/page.tsx` (MODIFY)

**Changes:**

- Remove API key input field
- Add note that API keys are managed server-side
- Keep "Test Connection" to validate server keys
   - If models.dev fails, fall back to local registry
   - Local registry functions from `lib/model-registry.ts`

---

#### Step 1.3: Update Model Registry as Fallback
**File:** `lib/model-registry.ts` (MODIFY)

**Purpose:** Keep as backup when models.dev is unavailable

**Changes:**
- Keep current `PROVIDERS` and `MODELS` arrays
- Rename functions to `getLocalProviders()`, `getLocalModelsByProvider()`, etc.
- Export both `PROVIDERS` and `MODELS` for direct access

---

### Phase 2: Update API Route for Dynamic Model Selection

#### Step 2.1: Modify Generate Route
**File:** `app/api/generate/route.ts` (MODIFY)

**Changes:**

1. **Update Imports**
```typescript
import { getModelsByProvider, getModelById } from "@/lib/models"; // was "@/lib/model-registry"
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"; // NEW
```

2. **Update Model Lookup**
```typescript
// Was:
const providerModels = await getModelsByProvider(provider);
const modelInfo = providerModels.find((m) => m.id === modelId);

// Remains the same - works with both models.dev and local fallback
```

3. **Update SDK Client Creation**
```typescript
// Add OpenAI-compatible provider support
const sdkConfig = getModelSDKConfig(modelInfo);

let model: any;
if (sdkConfig.provider === "openai") {
  const openaiClient = createOpenAI({ apiKey: finalApiKey });
  model = openaiClient(sdkConfig.modelId);
} else if (sdkConfig.provider === "google") {
  const googleClient = createGoogleGenerativeAI({ apiKey: finalApiKey });
  model = googleClient(sdkConfig.modelId);
} else if (sdkConfig.provider === "anthropic") {
  const anthropicClient = createAnthropic({ apiKey: finalApiKey });
  model = anthropicClient(sdkConfig.modelId);
} else {
  // OpenAI-compatible providers (NEW)
  const openaiCompatible = createOpenAICompatible({
    baseURL: sdkConfig.baseURL,
    apiKey: finalApiKey || "dummy",
  });
  model = openaiCompatible(sdkConfig.modelId);
}
```

---

### Phase 3: Update Settings UI

#### Step 3.1: Modify Settings Page
**File:** `app/settings/page.tsx` (MODIFY)

**Changes:**

1. **Update Imports**
```typescript
import { getProviders, getModelsByProvider } from "@/lib/models"; // was "@/lib/model-registry"
```

2. **Add Loading States**
   - Show "Loading providers..." while fetching
   - Show "Loading models..." while fetching models for selected provider

3. **Add Error Handling**
   - Display error if models.dev fails and fallback also fails
   - Show which provider models are available

4. **Enhance Test Connection**
   - Use the same provider+model combination for testing
   - Display helpful error messages

---

### Phase 4: Update Type Definitions

#### Step 4.1: Update Model Info Types
**File:** `lib/models.ts` (NEW)

**Type Definitions:**

```typescript
export interface ModelInfo {
  id: string;                    // Full model ID (e.g., "openai/gpt-4o")
  name: string;                  // Display name (e.g., "GPT-4o")
  provider: string;               // Provider ID (e.g., "openai")
  providerName: string;           // Provider name (e.g., "OpenAI")
  baseURL?: string;              // API base URL for OpenAI-compatible
  apiKeyEnv?: string;            // Environment variable name
  npm?: string;                  // AI SDK npm package
  doc?: string;                  // Documentation URL
  attachment?: boolean;           // Supports image attachments
  reasoning?: boolean;            // Has reasoning capabilities
  toolCall?: boolean;            // Supports tool calls
  structuredOutput?: boolean;     // Supports structured output
  cost?: {                       // Token pricing
    input: number;
    output: number;
  };
  limit?: {                      // Context limits
    context: number;
    output: number;
  };
}

export interface ProviderInfo {
  id: string;
  name: string;
  npm?: string;
  env?: string[];
  doc?: string;
  api?: string;
  description?: string;
}
```

---

### Phase 5: Testing and Validation

#### Step 5.1: Unit Testing

Test cases for `lib/models.ts`:

```typescript
describe('models.ts', () => {
  test('fetches providers from models.dev')
  test('falls back to local registry on failure')
  test('caches providers for 24 hours')
  test('filters models by provider')
  test('resolves model IDs correctly')
});
```

#### Step 5.2: Integration Testing

1. **Provider Selection**
   - Select OpenAI → should load OpenAI models
   - Select Google → should load Google models
   - Select unknown provider → should show error

2. **Model Selection**
   - Select GPT-4o from OpenAI → should work
   - Select Gemini 2.5 from Google → should work
   - Test with local provider (LM Studio) → should work

3. **API Key Validation**
   - Invalid API key → should show 401 error
   - Valid API key → should generate suggestions

4. **Fallback Testing**
   - Block models.dev access → should fall back to local registry
   - Both fail → should show error message

#### Step 5.3: Edge Cases

- Network timeouts
- CORS errors (should be handled by `/api/models`)
- Rate limiting from models.dev
- Malformed API response
- Model ID conflicts (same model from different providers)

---

## Dependencies

### Required Packages (Already Installed)

```json
{
  "ai": "^5.0.107",
  "@ai-sdk/openai": "^2.0.77",
  "@ai-sdk/google": "^2.0.44",
  "@ai-sdk/anthropic": "^2.0.53"
}
```

### New Package Needed

```json
{
  "@ai-sdk/openai-compatible": "^1.0.0" // Check latest version
}
```

**Installation:**
```bash
npm install @ai-sdk/openai-compatible
```

---

## Migration Strategy

### Backward Compatibility

1. **User State**
   - Existing `provider` and `modelId` values in store should remain valid
   - Most model IDs are compatible (e.g., "gpt-4o", "gemini-2.5-flash")

2. **Local Registry**
   - Keeps working even if models.dev is unavailable
   - Can be used as offline fallback

3. **Gradual Rollout**
   - Deploy backend changes first (API route, models.ts)
   - Then deploy frontend changes (settings page)

### Rollback Plan

If issues arise:

1. **Quick Revert:** Use `git revert` on the implementation commit
2. **Feature Flag:** Add `USE_MODELS_DEV` environment variable to toggle between models.dev and local registry
3. **Force Local Registry:** Set `USE_MODELS_DEV=false` in the server environment

---

## Design Decisions (Resolved)

1. **Cache Duration**
   - **Decision:** 24 hours is sufficient
   - Rationale: Balances freshness with performance

2. **Feature Flag**
   - **Decision:** Yes, implement `USE_MODELS_DEV` environment variable
   - Purpose: Easy toggle between models.dev and local registry for debugging/testing
   - Default: Enabled (true)

3. **Pricing Display**
   - **Decision:** No, don't show model pricing/capabilities in UI
   - Rationale: Keeps UI simple; pricing can be viewed on models.dev

4. **API Keys (Server-Side Only)**
   - **Decision:** All API keys are server-side environment variables
   - Multi-key support via `${ENV_NAME}S` (comma-separated)
   - Keys are selected per request using round-robin
   - No client-side storage or encryption

5. **Model Sorting**
   - **Decision:** Sort models alphabetically by name
   - Rationale: Predictable ordering for users

6. **Removed Model Handling**
   - **Decision:** Warn user if selected model is not found in current models.dev response
   - Show "This model may be deprecated" message in settings
   - Allow user to continue (model might still work)

---

## Success Criteria

- [x] Users can select from 75+ providers via models.dev
- [x] Models are dynamically loaded from models.dev API
- [x] Fallback to local registry works when models.dev is unavailable
- [x] Provider+model combination is correctly passed to AI SDK
- [x] API keys are validated before making requests
- [x] Error messages are helpful and actionable
- [x] Cache invalidation works correctly (24h TTL)
- [x] API keys are server-managed (no client storage)
- [x] Feature flag `USE_MODELS_DEV` toggles between models.dev and local registry
- [x] Multiple API keys per provider are supported via env vars

---

## Implementation Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Restore models.dev API integration + feature flag | 3-4 hours |
| Phase 2 | Update API route for dynamic selection | 1-2 hours |
| Phase 3 | Update settings UI (server-managed keys) | 2-3 hours |
| Phase 4 | Update type definitions | 1 hour |
| Phase 5 | Testing and validation | 2-3 hours |
| **Total** | | **9-13 hours** |

---

## References

- **models.dev API:** https://models.dev/api.json
- **models.dev Documentation:** https://models.dev
- **Vercel AI SDK:** https://ai-sdk.dev
- **OpenCode Implementation:** https://github.com/anomalyco/opencode
- **AI SDK OpenAI Compatible:** https://ai-sdk.dev/providers/openai-compatible-providers

---

## Appendix: Example models.dev Response

```json
{
  "openai": {
    "id": "openai",
    "name": "OpenAI",
    "npm": "@ai-sdk/openai",
    "env": ["OPENAI_API_KEY"],
    "doc": "https://platform.openai.com/docs",
    "models": {
      "gpt-4o": {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "attachment": true,
        "reasoning": false,
        "tool_call": true,
        "structured_output": true,
        "cost": { "input": 2.5, "output": 10 }
      },
      "gpt-4o-mini": {
        "id": "gpt-4o-mini",
        "name": "GPT-4o Mini",
        "attachment": true,
        "reasoning": false,
        "tool_call": true,
        "structured_output": true,
        "cost": { "input": 0.15, "output": 0.6 }
      }
    }
  },
  "google": {
    "id": "google",
    "name": "Google",
    "npm": "@ai-sdk/google",
    "env": ["GOOGLE_API_KEY"],
    "doc": "https://ai.google.dev",
    "models": {
      "gemini-2.5-flash": {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "attachment": true,
        "reasoning": false,
        "tool_call": true,
        "structured_output": true
      }
    }
  },
  "anthropic": {
    "id": "anthropic",
    "name": "Anthropic",
    "npm": "@ai-sdk/anthropic",
    "env": ["ANTHROPIC_API_KEY"],
    "doc": "https://docs.anthropic.com",
    "models": {
      "claude-sonnet-4-20250514": {
        "id": "claude-sonnet-4-20250514",
        "name": "Claude Sonnet 4",
        "attachment": true,
        "reasoning": true,
        "tool_call": true,
        "structured_output": true
      }
    }
  }
}
```
