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
    name: "Google (Gemini)",
    apiKeyEnv: "GOOGLE_API_KEY",
    description: "Google Gemini models",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    description: "Claude models from Anthropic",
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
    id: "lmstudio",
    name: "LM Studio",
    baseURL: "http://127.0.0.1:1234/v1",
    apiKeyEnv: "LMSTUDIO_API_KEY",
    description: "Local models via LM Studio (OpenAI-compatible)",
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

// Model definitions
export const MODELS: ModelInfo[] = [
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai", providerName: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", providerName: "OpenAI" },
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", providerName: "OpenAI" },
  { id: "openai/gpt-4", name: "GPT-4", provider: "openai", providerName: "OpenAI" },
  { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", providerName: "OpenAI" },
  { id: "openai/o1-preview", name: "O1 Preview", provider: "openai", providerName: "OpenAI" },
  { id: "openai/o1-mini", name: "O1 Mini", provider: "openai", providerName: "OpenAI" },
  
  // Google
  { id: "google/gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)", provider: "google", providerName: "Google" },
  { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", providerName: "Google" },
  { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", providerName: "Google" },
  { id: "google/gemini-pro", name: "Gemini Pro", provider: "google", providerName: "Google" },
  
  // Anthropic
  { id: "anthropic/claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", providerName: "Anthropic" },
  { id: "anthropic/claude-3-opus-20240229", name: "Claude 3 Opus", provider: "anthropic", providerName: "Anthropic" },
  { id: "anthropic/claude-3-sonnet-20240229", name: "Claude 3 Sonnet", provider: "anthropic", providerName: "Anthropic" },
  { id: "anthropic/claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic", providerName: "Anthropic" },
  
  // DeepSeek
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "deepseek", providerName: "DeepSeek", baseURL: "https://api.deepseek.com/v1" },
  { id: "deepseek/deepseek-coder", name: "DeepSeek Coder", provider: "deepseek", providerName: "DeepSeek", baseURL: "https://api.deepseek.com/v1" },
  
  // Qwen
  { id: "qwen/qwen-turbo", name: "Qwen Turbo", provider: "qwen", providerName: "Qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { id: "qwen/qwen-plus", name: "Qwen Plus", provider: "qwen", providerName: "Qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { id: "qwen/qwen-max", name: "Qwen Max", provider: "qwen", providerName: "Qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  
  // LM Studio (common local models)
  { id: "lmstudio/gpt-3.5-turbo", name: "GPT-3.5 Turbo (Local)", provider: "lmstudio", providerName: "LM Studio", baseURL: "http://127.0.0.1:1234/v1" },
  { id: "lmstudio/llama-2-7b-chat", name: "Llama 2 7B Chat (Local)", provider: "lmstudio", providerName: "LM Studio", baseURL: "http://127.0.0.1:1234/v1" },
  { id: "lmstudio/mistral-7b-instruct", name: "Mistral 7B Instruct (Local)", provider: "lmstudio", providerName: "LM Studio", baseURL: "http://127.0.0.1:1234/v1" },
  { id: "lmstudio/custom", name: "Custom Model (Local)", provider: "lmstudio", providerName: "LM Studio", baseURL: "http://127.0.0.1:1234/v1" },
  
  // Together AI
  { id: "together/meta-llama/Llama-2-70b-chat-hf", name: "Llama 2 70B Chat", provider: "together", providerName: "Together AI", baseURL: "https://api.together.xyz/v1" },
  { id: "together/mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B Instruct", provider: "together", providerName: "Together AI", baseURL: "https://api.together.xyz/v1" },
  
  // Groq
  { id: "groq/llama-3-70b-8192", name: "Llama 3 70B", provider: "groq", providerName: "Groq", baseURL: "https://api.groq.com/openai/v1" },
  { id: "groq/mixtral-8x7b-32768", name: "Mixtral 8x7B", provider: "groq", providerName: "Groq", baseURL: "https://api.groq.com/openai/v1" },
];

/**
 * Get all providers
 */
export function getProviders(): ProviderInfo[] {
  return PROVIDERS;
}

/**
 * Get all models
 */
export function getAllModels(): ModelInfo[] {
  return MODELS;
}

/**
 * Get models for a specific provider
 */
export function getModelsByProvider(providerId: string): ModelInfo[] {
  return MODELS.filter((m) => m.provider === providerId);
}

/**
 * Get a specific model by ID
 */
export function getModelById(modelId: string): ModelInfo | null {
  // Try exact match first
  let model = MODELS.find((m) => m.id === modelId);
  if (model) return model;

  // Try matching without provider prefix
  if (!modelId.includes("/")) {
    model = MODELS.find((m) => {
      const parts = m.id.split("/");
      return parts[parts.length - 1] === modelId;
    });
    if (model) return model;
  } else {
    // Try matching just the model part
    const modelPart = modelId.split("/").slice(-1)[0];
    model = MODELS.find((m) => {
      const parts = m.id.split("/");
      return parts[parts.length - 1] === modelPart;
    });
    if (model) return model;
  }

  return null;
}

/**
 * Get SDK configuration for a model
 */
export function getModelSDKConfig(model: ModelInfo): {
  provider: "openai" | "google" | "anthropic" | "openai-compatible";
  baseURL?: string;
  modelId: string;
} {
  // Extract model name (without provider prefix)
  const modelName = model.id.split("/").slice(1).join("/");

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

  if (model.provider === "anthropic") {
    return {
      provider: "anthropic",
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

