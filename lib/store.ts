/**
 * Application Store (Zustand)
 * Manages global application state with persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BibliographicInfo, ParsedSuggestions } from "./ai";
import type { LOCSearchResponse } from "./loc";
import { getProviderGroup, getProviderHardcodedBaseURL } from "./provider-groups";

export const DEFAULT_SYSTEM_PROMPT_RULES = `# LCSH Selection Rules

1. Select subject headings that represent the main topics of the work.
2. Prefer established LCSH terms over creating new ones.
3. Use the most specific heading available for a topic.
4. Assign 1-6 subject headings, with 3-4 being optimal for most works.
5. For personal names, verify the authorized form in the LC Name Authority File.
6. For geographic subjects, use established subdivisions.
7. For works about multiple topics, assign a heading for each significant topic.
8. For works of literature, assign genre/form terms as appropriate.
9. For biographies, assign a heading for the subject of the biography.
10. For historical works, assign chronological subdivisions as appropriate.
11. If images are provided, analyze them for additional bibliographic information.
12. For book covers or title pages, extract relevant subject information.
13. Use the selected AI model's capabilities to process both text and image content.`;

export interface Recommendation {
  term: string;
  similarity: number;
  source?: "lcsh" | "lcnaf";
  isAdditional?: boolean;
  bestMatch?: {
    heading: string;
    identifier: string;
    uri: string;
    source?: "lcsh" | "lcnaf";
  };
  apiId?: string;
  marc?: string;
  justification?: string;
}

export interface Conversation {
  id: string;
  timestamp: string;
  bibliographicInfo: BibliographicInfo;
  subjectAnalysis?: string;
  initialSuggestions?: ParsedSuggestions;
  validationResults?: Record<string, LOCSearchResponse>;
  finalRecommendations?: Recommendation[];
  marcRecords?: Record<string, string>;
}

// API Key interface
export interface ApiKey {
  id: string; // Unique identifier (timestamp)
  provider: string; // Provider ID (e.g., "openai")
  key: string; // API key value
  label?: string; // Optional label (e.g., "Work account")
  createdAt: string; // ISO timestamp
  isDefault?: boolean; // Mark as default for provider
}

// Provider Configuration (for BaseURL and custom settings)
export interface ProviderConfig {
  provider: string; // Provider ID
  baseURL?: string; // Custom BaseURL (for local/openai-compatible)
  label?: string; // Custom label (for openai-compatible)
  customModels?: string[]; // Manually added model IDs
}

// Settings slice
interface SettingsState {
  provider: string | null;
  modelId: string | null;
  apiKey: string; // Deprecated: kept for backward compatibility
  apiKeys: ApiKey[]; // Array of API keys
  providerConfigs: ProviderConfig[]; // Provider-specific configs (BaseURL, etc.)
  systemPromptRules: string;
  setProvider: (provider: string | null) => void;
  setModelId: (modelId: string | null) => void;
  setApiKey: (apiKey: string) => void; // Deprecated: kept for backward compatibility
  setSystemPromptRules: (rules: string) => void;
  resetSystemPromptRules: () => void;
  // API key management
  addApiKey: (apiKey: Omit<ApiKey, "id" | "createdAt">) => void;
  removeApiKey: (keyId: string) => void;
  updateApiKey: (keyId: string, updates: Partial<ApiKey>) => void;
  setDefaultApiKey: (keyId: string) => void;
  getApiKeyForProvider: (provider: string) => string | undefined;
  // Provider config management
  setProviderConfig: (config: ProviderConfig) => void;
  getProviderConfig: (provider: string) => ProviderConfig | undefined;
  getBaseURLForProvider: (provider: string) => string | undefined;
}

// Wizard slice
interface WizardState {
  activeStep: number;
  bibliographicInfo: BibliographicInfo;
  subjectAnalysis: string;
  initialSuggestions: ParsedSuggestions | null;
  validationResults: Record<string, LOCSearchResponse> | null;
  finalRecommendations: Recommendation[] | null;
  marcRecords: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;
  setActiveStep: (step: number) => void;
  setBibliographicInfo: (info: BibliographicInfo) => void;
  setSubjectAnalysis: (analysis: string) => void;
  setInitialSuggestions: (suggestions: ParsedSuggestions | null) => void;
  setValidationResults: (results: Record<string, LOCSearchResponse> | null) => void;
  setFinalRecommendations: (recommendations: Recommendation[] | null) => void;
  setMarcRecords: (records: Record<string, string> | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetWizard: () => void;
}

// History slice
interface HistoryState {
  conversations: Conversation[];
  addConversation: (conversation: Omit<Conversation, "id" | "timestamp">) => void;
  deleteConversation: (id: string) => void;
  clearHistory: () => void;
  getConversation: (id: string) => Conversation | undefined;
}

// Combined store
interface AppStore extends SettingsState, WizardState, HistoryState { }

// Migration logic for API keys
const migrateApiKeys = (state: AppStore): AppStore => {
  // If we have old apiKey but no apiKeys, migrate it
  if (state.apiKey && state.apiKeys.length === 0 && state.provider) {
    const newKey: ApiKey = {
      id: Date.now().toString(),
      provider: state.provider,
      key: state.apiKey,
      label: "Migrated key",
      createdAt: new Date().toISOString(),
      isDefault: true,
    };

    return {
      ...state,
      apiKeys: [newKey],
    };
  }
  return state;
};

// Deprecated local providers that should be reset
const DEPRECATED_PROVIDERS = ['lmstudio', 'ollama'];

// Migration logic for deprecated providers
const migrateDeprecatedProviders = (state: AppStore): AppStore => {
  // If provider is a deprecated local provider, reset it
  if (state.provider && DEPRECATED_PROVIDERS.includes(state.provider)) {
    return {
      ...state,
      provider: null,
      modelId: null,
      // Also clean up any API keys for deprecated providers
      apiKeys: state.apiKeys.filter(k => !DEPRECATED_PROVIDERS.includes(k.provider)),
      // Clean up provider configs for deprecated providers
      providerConfigs: state.providerConfigs.filter(c => !DEPRECATED_PROVIDERS.includes(c.provider)),
    };
  }
  return state;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Settings
      provider: null,
      modelId: null,
      apiKey: "", // Deprecated but kept
      apiKeys: [],
      providerConfigs: [],
      systemPromptRules: DEFAULT_SYSTEM_PROMPT_RULES,
      setProvider: (provider) => set({ provider }),
      setModelId: (modelId) => set({ modelId }),
      setApiKey: (apiKey) => set({ apiKey }), // Deprecated
      setSystemPromptRules: (systemPromptRules) => set({ systemPromptRules }),
      resetSystemPromptRules: () =>
        set({ systemPromptRules: DEFAULT_SYSTEM_PROMPT_RULES }),

      // NEW: API key management actions
      addApiKey: (keyData) =>
        set((state) => ({
          apiKeys: [
            ...state.apiKeys,
            {
              ...keyData,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
              isDefault:
                keyData.isDefault ||
                state.apiKeys.filter((k) => k.provider === keyData.provider)
                  .length === 0,
            },
          ],
        })),

      removeApiKey: (keyId) =>
        set((state) => ({
          apiKeys: state.apiKeys.filter((k) => k.id !== keyId),
        })),

      updateApiKey: (keyId, updates) =>
        set((state) => ({
          apiKeys: state.apiKeys.map((k) =>
            k.id === keyId ? { ...k, ...updates } : k
          ),
        })),

      setDefaultApiKey: (keyId) =>
        set((state) => ({
          apiKeys: state.apiKeys.map((k) => ({
            ...k,
            isDefault: k.id === keyId,
          })),
        })),

      getApiKeyForProvider: (provider) => {
        const state = get();
        const key = state.apiKeys.find(
          (k) => k.provider === provider && k.isDefault
        );
        return key?.key || state.apiKey;
      },

      setProviderConfig: (config) =>
        set((state) => {
          const existing = state.providerConfigs.findIndex(
            (c) => c.provider === config.provider
          );
          if (existing >= 0) {
            const updated = [...state.providerConfigs];
            updated[existing] = config;
            return { providerConfigs: updated };
          }
          return { providerConfigs: [...state.providerConfigs, config] };
        }),

      getProviderConfig: (provider) => {
        return get().providerConfigs.find((c) => c.provider === provider);
      },

      getBaseURLForProvider: (provider) => {
        // Cloud providers always use their hardcoded base URL (or SDK defaults)
        if (getProviderGroup(provider) === 'cloud') {
          return getProviderHardcodedBaseURL(provider);
        }
        const config = get().providerConfigs.find((c) => c.provider === provider);
        return config?.baseURL;
      },

      // Wizard
      activeStep: 0,
      bibliographicInfo: {
        title: "",
        author: "",
        abstract: "",
        tableOfContents: "",
        notes: "",
        images: [],
      },
      subjectAnalysis: "",
      initialSuggestions: null,
      validationResults: null,
      finalRecommendations: null,
      marcRecords: null,
      isLoading: false,
      error: null,
      setActiveStep: (activeStep) => set({ activeStep }),
      setBibliographicInfo: (bibliographicInfo) => set({ bibliographicInfo }),
      setSubjectAnalysis: (subjectAnalysis) => set({ subjectAnalysis }),
      setInitialSuggestions: (initialSuggestions) => set({ initialSuggestions }),
      setValidationResults: (validationResults) => set({ validationResults }),
      setFinalRecommendations: (finalRecommendations) =>
        set({ finalRecommendations }),
      setMarcRecords: (marcRecords) => set({ marcRecords }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      resetWizard: () =>
        set({
          activeStep: 0,
          bibliographicInfo: {
            title: "",
            author: "",
            abstract: "",
            tableOfContents: "",
            notes: "",
            images: [],
          },
          subjectAnalysis: "",
          initialSuggestions: null,
          validationResults: null,
          finalRecommendations: null,
          marcRecords: null,
          isLoading: false,
          error: null,
        }),

      // History
      conversations: [],
      addConversation: (conversation) => {
        const newConversation: Conversation = {
          ...conversation,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          conversations: [...state.conversations, newConversation],
        }));
      },
      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
        })),
      clearHistory: () => set({ conversations: [] }),
      getConversation: (id) => {
        const state = get();
        return state.conversations.find((c) => c.id === id);
      },
    }),
    {
      name: "cataloging-assistant-storage",
      partialize: (state) => ({
        provider: state.provider,
        modelId: state.modelId,
        apiKey: state.apiKey,
        apiKeys: state.apiKeys,
        providerConfigs: state.providerConfigs,
        systemPromptRules: state.systemPromptRules,
        conversations: state.conversations,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("Error rehydrating store:", error);
            return;
          }
          if (state) {
            let migrated = migrateApiKeys(state);
            migrated = migrateDeprecatedProviders(migrated);
            if (migrated !== state) {
              // Update the store with migrated data
              useAppStore.setState(migrated);
            }
          }
        };
      },
    }
  )
);
