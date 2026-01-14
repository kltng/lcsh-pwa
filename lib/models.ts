/**
 * Model Directory Service
 * Fetches and manages model information from models.dev
 * Falls back to local registry if models.dev is unavailable
 */

import {
  getProviders as getLocalProviders,
  getAllModels as getAllLocalModels,
  getModelsByProvider as getLocalModelsByProvider,
  getModelById as getLocalModelById,
  getModelSDKConfig as getLocalModelSDKConfig,
  type ModelInfo as LocalModelInfo,
  type ProviderInfo as LocalProviderInfo,
} from "./model-registry";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  attachment?: boolean;
  reasoning?: boolean;
  toolCall?: boolean;
  structuredOutput?: boolean;
  temperature?: boolean;
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
  openWeights?: boolean;
  cost?: {
    input?: number;
    output?: number;
    reasoning?: number;
  };
  limit?: {
    context?: number;
    input?: number;
    output?: number;
  };
  modalities?: {
    input?: string[];
    output?: string[];
  };
  status?: "alpha" | "beta" | "deprecated";
  // For OpenAI-compatible providers
  baseURL?: string;
  apiKeyEnv?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  npm?: string;
  env?: string[];
  doc?: string;
  api?: string; // For OpenAI-compatible providers
}

// The API returns a flat object where keys are provider IDs
type ModelsDevResponse = Record<string, {
  id: string;
  name: string;
  npm?: string;
  env?: string[];
  doc?: string;
  api?: string;
  models?: Record<string, any>;
}>;

let cachedModels: ModelInfo[] | null = null;
let cachedProviders: ProviderInfo[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch models from models.dev API
 * Uses direct fetch on server-side, API route on client-side to avoid CORS
 */
export async function fetchModelsDev (): Promise<ModelsDevResponse> {
  try {
    let url: string;

    if (typeof window === "undefined") {
      // Server-side: fetch directly from models.dev
      url = "https://models.dev/api.json";
    } else {
      // Client-side: use our API route to avoid CORS
      const baseUrl = window.location.origin;
      url = `${baseUrl}/api/models`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "default",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch models.dev: ${response.status}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching models.dev:", error);
    // Provide more helpful error message
    if (error instanceof TypeError) {
      if (error.message.includes("Failed to parse URL")) {
        throw new Error(
          "Failed to parse API URL. This may be a browser compatibility issue."
        );
      }
      if (error.message.includes("fetch")) {
        throw new Error(
          "Network error. Please check your internet connection and try again."
        );
      }
    }
    throw error;
  }
}

/**
 * Get all providers from models.dev (with fallback to local registry)
 */
export async function getProviders (): Promise<ProviderInfo[]> {
  const now = Date.now();
  if (cachedProviders && now - cacheTimestamp < CACHE_DURATION) {
    return cachedProviders;
  }

  try {
    const data = await fetchModelsDev();
    // Check if we got valid data
    if (data && typeof data === "object" && Object.keys(data).length > 0) {
      const providers: ProviderInfo[] = [];

      for (const [providerId, providerData] of Object.entries(data)) {
        // Skip if it doesn't have models (might be a model entry, not a provider)
        if (!providerData.models) continue;

        providers.push({
          id: providerId,
          name: providerData.name,
          npm: providerData.npm,
          env: providerData.env,
          doc: providerData.doc,
          api: providerData.api,
        });
      }

      if (providers.length > 0) {
        cachedProviders = providers;
        cacheTimestamp = now;
        return providers;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch from models.dev, using local registry:", error);
  }

  // Fallback to local registry
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

/**
 * Get all models from models.dev, grouped by provider
 * Falls back to local registry if models.dev is unavailable
 */
export async function getAllModels (): Promise<ModelInfo[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < CACHE_DURATION) {
    return cachedModels;
  }

  try {
    const data = await fetchModelsDev();
    
    // Check if we got valid data
    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      throw new Error("Empty response from models.dev");
    }
    
    const models: ModelInfo[] = [];

    for (const [providerId, providerData] of Object.entries(data)) {
      // Skip if it doesn't have models (might be a model entry, not a provider)
      if (!providerData.models) continue;

      for (const [modelId, modelData] of Object.entries(providerData.models)) {
        // Use the model's id if it exists, otherwise construct it
        const fullModelId = modelData.id || `${providerId}/${modelId}`;

        // For models where the ID already includes a provider prefix (like "openai/gpt-oss-20b"),
        // we still want to track which provider (like "lmstudio") is hosting it
        // But we use the model's own ID for lookup
        models.push({
          id: fullModelId, // This is what we'll use for lookup
          name: modelData.name || modelId,
          provider: providerId, // The hosting provider (e.g., "lmstudio")
          providerName: providerData.name,
          attachment: modelData.attachment,
          reasoning: modelData.reasoning,
          toolCall: modelData.tool_call,
          structuredOutput: modelData.structured_output,
          temperature: modelData.temperature,
          knowledge: modelData.knowledge,
          releaseDate: modelData.release_date,
          lastUpdated: modelData.last_updated,
          openWeights: modelData.open_weights,
          cost: modelData.cost,
          limit: modelData.limit,
          modalities: modelData.modalities,
          status: modelData.status,
          baseURL: providerData.api, // For OpenAI-compatible providers (e.g., lmstudio's localhost URL)
          apiKeyEnv: providerData.env?.[0],
        });
      }
    }

    cachedModels = models;
    cacheTimestamp = now;
    return models;
  } catch (error) {
    console.warn("Failed to fetch from models.dev, using local registry:", error);
    // Fallback to local registry
    const localModels = getAllLocalModels();
    cachedModels = localModels.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      providerName: m.providerName,
      baseURL: m.baseURL,
      apiKeyEnv: m.apiKeyEnv,
    }));
    cacheTimestamp = now;
    return cachedModels;
  }
}

/**
 * Get models for a specific provider
 */
export async function getModelsByProvider (providerId: string): Promise<ModelInfo[]> {
  try {
    const allModels = await getAllModels();
    return allModels.filter((m) => m.provider === providerId);
  } catch (error) {
    // Fallback to local registry
    return getLocalModelsByProvider(providerId).map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      providerName: m.providerName,
      baseURL: m.baseURL,
      apiKeyEnv: m.apiKeyEnv,
    }));
  }
}

/**
 * Get a specific model by ID
 * Handles both formats: "provider/model" and "model" (without provider prefix)
 */
export async function getModelById (modelId: string): Promise<ModelInfo | null> {
  try {
    const allModels = await getAllModels();

    // First try exact match
    let model = allModels.find((m) => m.id === modelId);
    if (model) return model;

    // If not found, try various matching strategies
    if (!modelId.includes("/")) {
      model = allModels.find((m) => {
        const parts = m.id.split("/");
        return parts[parts.length - 1] === modelId;
      });
      if (model) return model;
    } else {
      const modelPart = modelId.split("/").slice(-1)[0];
      model = allModels.find((m) => {
        const parts = m.id.split("/");
        return parts[parts.length - 1] === modelPart;
      });
      if (model) return model;
    }
  } catch (error) {
    console.warn("Error fetching from models.dev, trying local registry:", error);
  }

  // Fallback to local registry
  const localModel = getLocalModelById(modelId);
  if (localModel) {
    return {
      id: localModel.id,
      name: localModel.name,
      provider: localModel.provider,
      providerName: localModel.providerName,
      baseURL: localModel.baseURL,
      apiKeyEnv: localModel.apiKeyEnv,
    };
  }

  return null;
}

/**
 * Get SDK configuration for a model
 * Returns the appropriate Vercel AI SDK configuration
 */
export function getModelSDKConfig (model: ModelInfo): {
  provider: "openai" | "google" | "anthropic" | "openai-compatible";
  baseURL?: string;
  modelId: string;
} {
  // Try using local registry config first (more reliable)
  const localModel = getLocalModelById(model.id);
  if (localModel) {
    return getLocalModelSDKConfig(localModel);
  }

  // Fallback to original logic
  // Extract model name - handle both "provider/model" and "model" formats
  const modelName = model.id.includes("/") 
    ? model.id.split("/").slice(1).join("/") 
    : model.id;

  // Check if it's a native provider
  if (model.provider === "openai") {
    return {
      provider: "openai",
      modelId: modelName,
    };
  }

  if (model.provider === "google") {
    return {
      provider: "google",
      modelId: modelName,
    };
  }

  if (model.provider === "anthropic") {
    return {
      provider: "anthropic",
      modelId: modelName,
    };
  }

  // For OpenAI-compatible providers (including LM Studio, DeepSeek, Qwen, etc.)

  return {
    provider: "openai-compatible",
    baseURL: model.baseURL || getDefaultBaseURL(model.provider),
    modelId: modelName,
  };
}

/**
 * Get default base URL for common providers
 */
function getDefaultBaseURL (providerId: string): string {
  const defaults: Record<string, string> = {
    deepseek: "https://api.deepseek.com/v1",
    qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    together: "https://api.together.xyz/v1",
    groq: "https://api.groq.com/openai/v1",
    perplexity: "https://api.perplexity.ai",
    openrouter: "https://openrouter.ai/api/v1",
    lmstudio: "http://localhost:1234/v1", // Default LM Studio local server
  };

  return defaults[providerId.toLowerCase()] || "";
}


