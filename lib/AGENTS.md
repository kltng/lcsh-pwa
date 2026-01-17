# lib

**Purpose**: Business logic, utilities, and data layer

## OVERVIEW
Domain modules for AI integration, library APIs, state management, and utilities.

## STRUCTURE
```
lib/
├── utils.ts              # cn() utility (clsx + tailwind-merge)
├── store.ts             # Zustand global state (settings, wizard, history)
├── ai.ts                # AI service interfaces and types
├── models.ts            # Model directory service (models.dev API + local registry)
├── model-registry.ts    # Fallback local model registry
├── lcsh.ts             # Library of Congress Subject Headings API client
├── loc.ts              # Library of Congress API search
└── similarity.ts        # Text similarity algorithm
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| State management | store.ts | Zustand with persist, domain slices (settings, wizard, history) |
| AI integration | ai.ts | generateLcshSuggestions(), generateMarcRecords(), parseLcshSuggestions() |
| Model selection | models.ts, model-registry.ts | getAllModels(), getModelsByProvider(), getModelById() |
| LCSH validation | lcsh.ts, loc.ts | searchLcsh(), LOC API search |
| Text processing | similarity.ts | calculateSimilarity() for fuzzy matching |
| Utilities | utils.ts | cn() for class merging |

## CONVENTIONS
- Export interfaces and types alongside functions
- Use async/await for API calls
- Cache expensive operations (models.ts has 24h cache)
- Return structured objects (never bare responses)
- Handle errors gracefully with fallbacks (models.ts → model-registry.ts)

## ANTI-PATTERNS
- Don't mix UI code in lib (keep pure functions)
- Don't use `any` except for AI SDK compatibility in API routes
- Don't suppress type errors with @ts-ignore
- Don't mutate parameters (pure functions preferred)
- Don't store API keys in code (use user input)

## PATTERNS
**API Client Pattern** (lcsh.ts, loc.ts):
```typescript
export async function searchLcsh(term: string, options?: { count?: number; searchType?: "keyword" | "exact" }): Promise<LcshResult[]>
```

**State Slicing** (store.ts):
```typescript
interface SettingsState { ... }  // Domain slice
interface WizardState { ... }   // Domain slice
interface HistoryState { ... }   // Domain slice
interface AppStore extends SettingsState, WizardState, HistoryState { }
```

**Fallback Pattern** (models.ts):
```typescript
try {
  return await fetchFromExternalAPI();
} catch (error) {
  return getLocalFallback();
}
```
