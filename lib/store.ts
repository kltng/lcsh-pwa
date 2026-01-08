/**
 * Application Store (Zustand)
 * Manages global application state with persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BibliographicInfo, ParsedSuggestions } from "./ai";
import type { LOCSearchResponse } from "./loc";

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
  bestMatch?: {
    heading: string;
    identifier: string;
    uri: string;
  };
  apiId?: string;
  marc?: string;
  justification?: string;
}

export interface Conversation {
  id: string;
  timestamp: string;
  bibliographicInfo: BibliographicInfo;
  initialSuggestions?: ParsedSuggestions;
  validationResults?: Record<string, LOCSearchResponse>;
  finalRecommendations?: Recommendation[];
  marcRecords?: Record<string, string>;
}

// Settings slice
interface SettingsState {
  provider: string | null;
  modelId: string | null;
  apiKey: string;
  systemPromptRules: string;
  setProvider: (provider: string | null) => void;
  setModelId: (modelId: string | null) => void;
  setApiKey: (apiKey: string) => void;
  setSystemPromptRules: (rules: string) => void;
  resetSystemPromptRules: () => void;
}

// Wizard slice
interface WizardState {
  activeStep: number;
  bibliographicInfo: BibliographicInfo;
  initialSuggestions: ParsedSuggestions | null;
  validationResults: Record<string, LOCSearchResponse> | null;
  finalRecommendations: Recommendation[] | null;
  marcRecords: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;
  setActiveStep: (step: number) => void;
  setBibliographicInfo: (info: BibliographicInfo) => void;
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

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Settings
      provider: null,
      modelId: null,
      apiKey: "",
      systemPromptRules: DEFAULT_SYSTEM_PROMPT_RULES,
      setProvider: (provider) => set({ provider }),
      setModelId: (modelId) => set({ modelId }),
      setApiKey: (apiKey) => set({ apiKey }),
      setSystemPromptRules: (systemPromptRules) => set({ systemPromptRules }),
      resetSystemPromptRules: () =>
        set({ systemPromptRules: DEFAULT_SYSTEM_PROMPT_RULES }),

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
      initialSuggestions: null,
      validationResults: null,
      finalRecommendations: null,
      marcRecords: null,
      isLoading: false,
      error: null,
      setActiveStep: (activeStep) => set({ activeStep }),
      setBibliographicInfo: (bibliographicInfo) => set({ bibliographicInfo }),
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
        // Only persist settings and history, not wizard state
        provider: state.provider,
        modelId: state.modelId,
        apiKey: state.apiKey,
        systemPromptRules: state.systemPromptRules,
        conversations: state.conversations,
      }),
    }
  )
);


