# PROJECT KNOWLEDGE BASE

**Generated:** Sat Jan 17 2026
**Commit:** a99b03d
**Branch:** dev

## OVERVIEW
Library of Congress Subject Headings (LCSH) cataloging assistant - PWA built with Next.js 16, TypeScript 5, shadcn/ui, Zustand state, and Vercel AI SDK for multi-provider AI integration.

## STRUCTURE
```
lcsh-pwa/
├── app/                    # Next.js App Router (pages + API routes)
├── components/
│   ├── ui/               # shadcn/ui components (see components/ui/AGENTS.md)
│   └── wizard/           # Cataloging workflow components
├── lib/                  # Business logic, APIs, state (see lib/AGENTS.md)
├── public/               # Static assets + PWA manifest
└── AGENTS.md            # This file
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Pages | app/ | App Router: page.tsx, layout.tsx |
| API routes | app/api/ | generate/, models/, search-lcsh/, search-lcnaf/ |
| State store | lib/store.ts | Zustand with persist (settings, wizard, history) |
| AI integration | lib/ai.ts | Vercel AI SDK, multi-provider (OpenAI/Google/Anthropic/OAI-compatible) |
| UI components | components/ui/ | shadcn/ui components (see components/ui/AGENTS.md) |
| Business logic | lib/ | Domain modules (see lib/AGENTS.md) |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| useAppStore | hook | lib/store.ts | Global state access (settings, wizard, history) |
| generateLcshSuggestions | function | lib/ai.ts | AI-powered LCSH generation |
| searchLcsh | function | lib/lcsh.ts | LCSH API search/validation |
| getAllModels | function | lib/models.ts | Model directory from models.dev |
| calculateSimilarity | function | lib/similarity.ts | Fuzzy text matching |

## CONVENTIONS (Deviations from Standard)
- **Webpack**: PWA requires webpack mode (dev: `npm run dev --webpack`, build: `npm run build --webpack`)
- **Provider filtering**: AI model selection requires explicit provider parameter (multiple providers may host same model)
- **Image processing**: Convert images to base64 for AI analysis
- **Structured output**: Use Vercel AI SDK's generateObject(), fallback to text parsing

## ANTI-PATTERNS (THIS PROJECT)
- Don't suppress type errors with @ts-ignore or @ts-expect-error
- Don't use `as any` except for AI SDK compatibility in API routes only
- Don't omit provider parameter when calling AI APIs
- Don't store API keys or sensitive data in code

## UNIQUE STYLES
- **CVA variants**: All shadcn/ui components use class-variance-authority for variant management
- **Fallback pattern**: models.ts falls back to local registry if models.dev is unavailable
- **Partial persist**: Zustand store only persists settings and history, not transient wizard state

## COMMANDS
```bash
# Development (webpack required for PWA)
npm run dev          # Start dev server with webpack (http://localhost:3000)

# Production
npm run build        # Build for production (uses webpack)
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint

# Testing
# No test framework configured - tests should be added when implementing new features
```

## NOTES
- **PWA disabled in dev**: Test PWA functionality with `npm run build && npm start`
- **Icons required**: public/icon-192x192.png and public/icon-512x512.png for PWA manifest
- **Provider selection critical**: When calling AI APIs, always pass provider to ensure correct model is used from models.dev
- **Similarity threshold**: 90% similarity = exact LCSH match, <90% = closest match
