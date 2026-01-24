/**
 * Models Service
 * Fetches models from models.dev API with fallback to local registry
 */

import type { ModelInfo, ProviderInfo } from "./model-registry";
import {
  PROVIDERS as LOCAL_PROVIDERS,
  MODELS as LOCAL_MODELS,
  getModelsByProvider as getLocalModelsByProvider,
  getModelById as getLocalModelById,
} from "./model-registry";

// Type definitions for models.dev API response
type ModelsDevResponse = Record<
  string,
  {
    id: string;
    name: string;
    npm?: string;
    env?: string[];
    doc?: string;
    api?: string;
    models?: Record<
      string,
      {
        id: string;
        name: string;
        attachment?: boolean;
        reasoning?: boolean;
        tool_call?: boolean;
        structured_output?: boolean;
        cost?: { input: number; output: number };
        limit?: { context: number; output: number };
      }
    >;
  }
>;

// Extended ModelInfo with additional fields from models.dev
export interface ExtendedModelInfo extends ModelInfo {
  attachment?: boolean;
  reasoning?: boolean;
  toolCall?: boolean;
  structuredOutput?: boolean;
  cost?: { input: number; output: number };
  limit?: { context: number; output: number };
}

// Extended ProviderInfo
export interface ExtendedProviderInfo extends ProviderInfo {
  npm?: string;
  env?: string[];
  doc?: string;
  api?: string;
}

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
let cachedProviders: ExtendedProviderInfo[] | null = null;
let cachedModels: ExtendedModelInfo[] | null = null;
let cacheTimestamp: number = 0;

/**
 * Check if models.dev should be used
 */
export function shouldUseModelsDev(): boolean {
  if (typeof window === "undefined") {
    // Server-side: check env var
    return process.env.USE_MODELS_DEV === "true";
  }
  // Client-side: default to true (can be overridden by API)
  return true;
}

/**
 * Fetch models.dev API data
 */
export async function fetchModelsDev(): Promise<ModelsDevResponse> {
  if (typeof window === "undefined") {
    // Server-side: direct fetch
    const response = await fetch("https://models.dev/api.json", {
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch models.dev: ${response.status}`);
    }
    return await response.json();
  } else {
    // Client-side: use API route to avoid CORS
    const response = await fetch("/api/models");
    if (!response.ok) {
      throw new Error(`Failed to fetch models.dev: ${response.status}`);
    }
    const data = await response.json();
    // If empty object, models.dev is disabled
    if (Object.keys(data).length === 0) {
      throw new Error("models.dev is disabled");
    }
    return data;
  }
}

/**
 * Get all providers (from models.dev or local registry)
 */
export async function getProviders(): Promise<ExtendedProviderInfo[]> {
  const now = Date.now();
  if (cachedProviders && now - cacheTimestamp < CACHE_DURATION) {
    return cachedProviders;
  }

  // Check feature flag
  if (!shouldUseModelsDev()) {
    console.log(
      "models.dev disabled via USE_MODELS_DEV, using local registry"
    );
    const localProviders = LOCAL_PROVIDERS.map((p) => ({
      ...p,
      apiKeyEnv: p.apiKeyEnv,
    }));
    cachedProviders = localProviders;
    cacheTimestamp = now;
    return cachedProviders;
  }

  try {
    const data = await fetchModelsDev();
    const providers: ExtendedProviderInfo[] = [];

    for (const [providerId, providerData] of Object.entries(data)) {
      providers.push({
        id: providerId,
        name: providerData.name,
        npm: providerData.npm,
        env: providerData.env,
        doc: providerData.doc,
        api: providerData.api,
        apiKeyEnv: providerData.env?.[0],
        baseURL: providerData.api,
      });
    }

    // Sort alphabetically by name
    providers.sort((a, b) => a.name.localeCompare(b.name));

    cachedProviders = providers;
    cacheTimestamp = now;
    return providers;
  } catch (error) {
    // Fallback to local registry
    console.warn(
      "Failed to fetch from models.dev, using local registry:",
      error
    );
    const localProviders = LOCAL_PROVIDERS.map((p) => ({
      ...p,
      apiKeyEnv: p.apiKeyEnv,
    }));
    cachedProviders = localProviders;
    cacheTimestamp = now;
    return localProviders;
  }
}

/**
 * Get all models (from models.dev or local registry)
 */
export async function getAllModels(): Promise<ExtendedModelInfo[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < CACHE_DURATION) {
    return cachedModels;
  }

  // Check feature flag
  if (!shouldUseModelsDev()) {
    console.log(
      "models.dev disabled via USE_MODELS_DEV, using local registry"
    );
    const localModels = LOCAL_MODELS.map((m) => ({
      ...m,
    }));
    cachedModels = localModels;
    cacheTimestamp = now;
    return localModels;
  }

  try {
    const data = await fetchModelsDev();
    const models: ExtendedModelInfo[] = [];

    for (const [providerId, providerData] of Object.entries(data)) {
      if (!providerData.models) continue;

      const providerName = providerData.name;

      for (const [modelId, modelData] of Object.entries(
        providerData.models
      )) {
        // Get base URL from local registry if available
        const localProvider = LOCAL_PROVIDERS.find((p) => p.id === providerId);
        const baseURL = localProvider?.baseURL || providerData.api;

        models.push({
          id: modelData.id || modelId,
          name: modelData.name,
          provider: providerId,
          providerName: providerName,
          baseURL: baseURL,
          apiKeyEnv: providerData.env?.[0],
          attachment: modelData.attachment,
          reasoning: modelData.reasoning,
          toolCall: modelData.tool_call,
          structuredOutput: modelData.structured_output,
          cost: modelData.cost,
          limit: modelData.limit,
        });
      }
    }

    // Sort alphabetically by name
    models.sort((a, b) => a.name.localeCompare(b.name));

    cachedModels = models;
    cacheTimestamp = now;
    return models;
  } catch (error) {
    // Fallback to local registry
    console.warn(
      "Failed to fetch from models.dev, using local registry:",
      error
    );
    const localModels = LOCAL_MODELS.map((m) => ({
      ...m,
    }));
    cachedModels = localModels;
    cacheTimestamp = now;
    return localModels;
  }
}

/**
 * Get models for a specific provider
 */
export async function getModelsByProvider(
  providerId: string
): Promise<ExtendedModelInfo[]> {
  const allModels = await getAllModels();
  return allModels.filter((m) => m.provider === providerId);
}

/**
 * Get a specific model by ID
 */
export async function getModelById(
  modelId: string
): Promise<ExtendedModelInfo | null> {
  const allModels = await getAllModels();

  // Try exact match first
  let model = allModels.find((m) => m.id === modelId);
  if (model) return model;

  // Try matching without provider prefix (for backwards compatibility)
  if (modelId.includes("/")) {
    const modelPart = modelId.split("/").slice(-1)[0];
    model = allModels.find((m) => m.id === modelPart);
    if (model) return model;
  }

  // Try local registry as final fallback
  return getLocalModelById(modelId);
}

/**
 * Get SDK configuration for a model (re-export from model-registry)
 */
export { getModelSDKConfig } from "./model-registry";
