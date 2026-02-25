/**
 * Local Model Registry
 * A reliable, local alternative to models.dev
 * Includes common AI models and providers
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  baseURL?: string;
  apiKeyEnv?: string;
  description?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  baseURL?: string;
  apiKeyEnv?: string;
  description?: string;
}

// Provider definitions
export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
    description: "OpenAI models including GPT-4, GPT-3.5, and more",
  },
  {
    id: "google",
    name: "Google",
    apiKeyEnv: "GOOGLE_API_KEY",
    description: "Google Gemini models",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    description: "DeepSeek AI models",
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    description: "Qwen models from Alibaba Cloud",
  },
  {
    id: "together",
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    apiKeyEnv: "TOGETHER_API_KEY",
    description: "Together AI models",
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    description: "Groq inference API",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    baseURL: "https://api.perplexity.ai",
    apiKeyEnv: "PERPLEXITY_API_KEY",
    description: "Perplexity AI models",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    description: "OpenRouter - access to multiple models",
  },
];

// Model definitions - these match the IDs used by models.dev
export const MODELS: ModelInfo[] = [
  // OpenAI
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", providerName: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", providerName: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", providerName: "OpenAI" },
  { id: "gpt-4", name: "GPT-4", provider: "openai", providerName: "OpenAI" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", providerName: "OpenAI" },
  { id: "o1-preview", name: "O1 Preview", provider: "openai", providerName: "OpenAI" },
  { id: "o1-mini", name: "O1 Mini", provider: "openai", providerName: "OpenAI" },
  
  // Google - using the exact IDs from models.dev
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", providerName: "Google" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", providerName: "Google" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", providerName: "Google" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)", provider: "google", providerName: "Google" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", providerName: "Google" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", providerName: "Google" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "google", providerName: "Google" },
  
  // DeepSeek
  { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek", providerName: "DeepSeek", baseURL: "https://api.deepseek.com/v1" },
  { id: "deepseek-coder", name: "DeepSeek Coder", provider: "deepseek", providerName: "DeepSeek", baseURL: "https://api.deepseek.com/v1" },
  { id: "deepseek-reasoner", name: "DeepSeek R1", provider: "deepseek", providerName: "DeepSeek", baseURL: "https://api.deepseek.com/v1" },
  
  // Qwen
  { id: "qwen-turbo", name: "Qwen Turbo", provider: "qwen", providerName: "Qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { id: "qwen-plus", name: "Qwen Plus", provider: "qwen", providerName: "Qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { id: "qwen-max", name: "Qwen Max", provider: "qwen", providerName: "Qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  
  // Together AI
  { id: "meta-llama/Llama-2-70b-chat-hf", name: "Llama 2 70B Chat", provider: "together", providerName: "Together AI", baseURL: "https://api.together.xyz/v1" },
  { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B Instruct", provider: "together", providerName: "Together AI", baseURL: "https://api.together.xyz/v1" },
  
  // Groq
  { id: "llama-3-70b-8192", name: "Llama 3 70B", provider: "groq", providerName: "Groq", baseURL: "https://api.groq.com/openai/v1" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", provider: "groq", providerName: "Groq", baseURL: "https://api.groq.com/openai/v1" },
];

/**
 * Get all providers (local registry - fallback)
 */
export function getLocalProviders(): ProviderInfo[] {
  return PROVIDERS;
}

/**
 * Get all models (local registry - fallback)
 */
export function getLocalModels(): ModelInfo[] {
  return MODELS;
}

/**
 * Get models for a specific provider (local registry - fallback)
 */
export function getLocalModelsByProvider(providerId: string): ModelInfo[] {
  return MODELS.filter((m) => m.provider === providerId);
}

/**
 * Get a specific model by ID (local registry - fallback)
 */
export function getLocalModelById(modelId: string): ModelInfo | null {
  // Try exact match first
  let model = MODELS.find((m) => m.id === modelId);
  if (model) return model;

  // Try matching without provider prefix (for backwards compatibility)
  if (modelId.includes("/")) {
    const modelPart = modelId.split("/").slice(-1)[0];
    model = MODELS.find((m) => m.id === modelPart);
    if (model) return model;
  }

  return null;
}

/**
 * @deprecated Use getLocalProviders() instead
 */
export function getProviders(): ProviderInfo[] {
  return getLocalProviders();
}

/**
 * @deprecated Use getLocalModels() instead
 */
export function getAllModels(): ModelInfo[] {
  return getLocalModels();
}

/**
 * @deprecated Use getLocalModelsByProvider() instead
 */
export function getModelsByProvider(providerId: string): ModelInfo[] {
  return getLocalModelsByProvider(providerId);
}

/**
 * @deprecated Use getLocalModelById() instead
 */
export function getModelById(modelId: string): ModelInfo | null {
  return getLocalModelById(modelId);
}

/**
 * Get SDK configuration for a model
 */
export function getModelSDKConfig(model: ModelInfo): {
  provider: "openai" | "google" | "openai-compatible";
  baseURL?: string;
  modelId: string;
} {
  const prefix = `${model.provider}/`;
  const modelName = model.id.startsWith(prefix)
    ? model.id.slice(prefix.length)
    : model.id;

  // Native providers
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

  // OpenAI-compatible providers
  return {
    provider: "openai-compatible",
    baseURL: model.baseURL || getProviderBaseURL(model.provider),
    modelId: modelName,
  };
}

/**
 * Get base URL for a provider
 */
function getProviderBaseURL(providerId: string): string {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider?.baseURL || "";
}
