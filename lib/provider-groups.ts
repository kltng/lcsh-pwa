/**
 * Provider Grouping Configuration
 * Organizes AI providers into 3 groups with specific configuration requirements
 */

export type ProviderGroup = 'cloud' | 'local' | 'openai-compatible';

export interface ProviderGroupConfig {
  id: ProviderGroup;
  label: string;
  description: string;
  fields: {
    apiKey: 'required' | 'optional' | 'hidden';
    baseURL: 'required' | 'optional' | 'hidden';
    providerLabel: 'required' | 'optional' | 'hidden';
  };
  defaultBaseURL?: string;
  supportsModelFetch: boolean;
}

export interface ProviderWithGroup {
  id: string;
  name: string;
  group: ProviderGroup;
  hardcodedBaseURL?: string;
}

// Cloud providers - API key required, BaseURL hidden (hardcoded)
export const CLOUD_PROVIDERS: ProviderWithGroup[] = [
  { id: 'openai', name: 'OpenAI', group: 'cloud' },
  { id: 'anthropic', name: 'Anthropic', group: 'cloud' },
  { id: 'google', name: 'Google Gemini', group: 'cloud' },
  { id: 'deepseek', name: 'DeepSeek', group: 'cloud', hardcodedBaseURL: 'https://api.deepseek.com/v1' },
  { id: 'qwen', name: 'Qwen', group: 'cloud', hardcodedBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'zhipu', name: 'Z.ai (智谱)', group: 'cloud', hardcodedBaseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'moonshot', name: 'Kimi (月之暗面)', group: 'cloud', hardcodedBaseURL: 'https://api.moonshot.cn/v1' },
  { id: 'minimax', name: 'Minimax', group: 'cloud', hardcodedBaseURL: 'https://api.minimax.chat/v1' },
];

// Local model apps - BaseURL with sensible default, API key optional
export const LOCAL_PROVIDERS: ProviderWithGroup[] = [
  { id: 'lmstudio', name: 'LM Studio', group: 'local', hardcodedBaseURL: 'http://127.0.0.1:1234/v1' },
  { id: 'ollama', name: 'Ollama', group: 'local', hardcodedBaseURL: 'http://127.0.0.1:11434/v1' },
];

// Group configuration - defines fields and behavior for each group
export const GROUP_CONFIGS: Record<ProviderGroup, ProviderGroupConfig> = {
  cloud: {
    id: 'cloud',
    label: 'Popular Cloud Providers',
    description: 'Major AI providers with their own APIs. API key required.',
    fields: { apiKey: 'required', baseURL: 'hidden', providerLabel: 'hidden' },
    supportsModelFetch: true,
  },
  local: {
    id: 'local',
    label: 'Local Model Apps',
    description: 'Run models locally on your machine. Configure the BaseURL to connect.',
    fields: { apiKey: 'optional', baseURL: 'optional', providerLabel: 'hidden' },
    defaultBaseURL: 'http://127.0.0.1:1234/v1',
    supportsModelFetch: true,
  },
  'openai-compatible': {
    id: 'openai-compatible',
    label: 'OpenAI-Compatible',
    description: 'Any custom OpenAI-compatible endpoint. BaseURL required.',
    fields: { apiKey: 'optional', baseURL: 'required', providerLabel: 'optional' },
    supportsModelFetch: true,
  },
};

/**
 * Get the group for a given provider ID
 */
export function getProviderGroup(providerId: string): ProviderGroup {
  if (CLOUD_PROVIDERS.some(p => p.id === providerId)) return 'cloud';
  if (LOCAL_PROVIDERS.some(p => p.id === providerId)) return 'local';
  return 'openai-compatible';
}

/**
 * Get configuration for a provider group
 */
export function getGroupConfig(group: ProviderGroup): ProviderGroupConfig {
  return GROUP_CONFIGS[group];
}

/**
 * Get the hardcoded BaseURL for a provider (if any)
 */
export function getProviderHardcodedBaseURL(providerId: string): string | undefined {
  const cloud = CLOUD_PROVIDERS.find(p => p.id === providerId);
  if (cloud?.hardcodedBaseURL) return cloud.hardcodedBaseURL;
  const local = LOCAL_PROVIDERS.find(p => p.id === providerId);
  return local?.hardcodedBaseURL;
}

/**
 * Get provider metadata by ID
 */
export function getProviderById(providerId: string): ProviderWithGroup | undefined {
  return [...CLOUD_PROVIDERS, ...LOCAL_PROVIDERS].find(p => p.id === providerId);
}

/**
 * Get all providers grouped by type
 */
export function getAllGroupedProviders(): Record<ProviderGroup, ProviderWithGroup[]> {
  return {
    cloud: CLOUD_PROVIDERS,
    local: LOCAL_PROVIDERS,
    'openai-compatible': [],
  };
}

/**
 * Get the default tab based on current provider
 */
export function getDefaultTabForProvider(providerId: string | null): ProviderGroup {
  if (!providerId) return 'cloud';
  return getProviderGroup(providerId);
}
