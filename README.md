# LCSH Cataloging Assistant

A Progressive Web App that combines AI-powered subject analysis with real-time Library of Congress validation to produce accurate LCSH headings and MARC records. All processing runs client-side — no data ever leaves your browser.

Part of the [LCSH Tools](https://lcsh.098484.xyz) ecosystem. The concepts behind this tool are described in [Tang & Jiang (2025)](https://arxiv.org/abs/2508.00867).

## Features

- **AI-Powered Suggestions** — Configurable AI models analyze bibliographic information and suggest appropriate subject headings with detailed reasoning
- **Dual Authority Validation** — Every suggestion is validated in real time against both LCSH (subjects) and LCNAF (names) via the Library of Congress suggest2 API
- **MARC Record Generation** — Generates properly formatted MARC records with correct tags (650, 600, 610), indicators, and subfields
- **Image Analysis** — Upload book covers or title pages for vision-capable AI models to extract additional subject information
- **Multi-Provider AI** — Bring your own API key from OpenAI, Google Gemini, DeepSeek, Qwen, Together AI, Groq, Perplexity, OpenRouter, or any OpenAI-compatible endpoint
- **Similarity Scoring** — Levenshtein distance-based scoring with color-coded percentages (0–100%) shows match quality at a glance
- **History & Export** — Save sessions to browser storage, review past recommendations, export CSV, and copy MARC records
- **Offline PWA** — Install on any device and works offline after initial setup
- **Zero-Knowledge Architecture** — All data stays in your browser; API keys are stored locally and masked in the UI

## How It Works

1. **Enter bibliographic info** — Title, author, abstract, table of contents, notes, and optionally images
2. **AI suggests & validates** — AI analyzes your input, generates LCSH/LCNAF candidates, and validates each one against the Library of Congress in real time
3. **Export MARC records** — Review validated headings with similarity scores, then copy MARC records or export as CSV

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> PWA features (service worker, offline support) are disabled in development mode.

### Production Build

```bash
pnpm build
pnpm start
```

## Configuration

All configuration happens in the browser through the Settings page. No server-side environment variables are required.

| Setting | Description |
|---------|-------------|
| **Provider** | AI provider (OpenAI, Google, DeepSeek, Qwen, Together AI, Groq, Perplexity, OpenRouter) |
| **API Key** | Your API key for the selected provider — stored in browser localStorage only |
| **Model** | Model to use for inference — fetched dynamically from [models.dev](https://models.dev) with 24-hour caching |
| **Custom Endpoint** | Optional base URL for OpenAI-compatible APIs (Ollama, LM Studio, vLLM, etc.) |
| **System Prompt** | Customizable rules for LCSH selection (13 default rules covering topic selection, specificity, heading counts, etc.) |

## Supported AI Providers

| Provider | Example Models |
|----------|----------------|
| OpenAI | GPT-4o, GPT-4 Turbo, o1-preview |
| Google Gemini | Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash |
| DeepSeek | DeepSeek Chat, DeepSeek Reasoner (R1) |
| Qwen | Qwen Turbo, Qwen Plus, Qwen Max |
| Together AI | Llama, Mixtral |
| Groq | Llama 3 70B, Mixtral 8x7B |
| Perplexity | Perplexity models |
| OpenRouter | Access to multiple model providers |
| Custom Endpoint | Any OpenAI-compatible API |

## Project Structure

```
lcsh-pwa/
├── app/
│   ├── page.tsx              # Home page
│   ├── layout.tsx            # Root layout with navigation
│   ├── wizard/               # 3-step cataloging wizard
│   ├── history/              # Session history with detail view
│   ├── settings/             # Provider, API key, and model configuration
│   └── tutorial/             # Step-by-step usage guide with screenshots
├── components/
│   ├── navigation.tsx        # Sidebar navigation
│   ├── first-visit-dialog.tsx
│   ├── ui/                   # shadcn/ui components
│   └── wizard/               # Wizard step components
├── lib/
│   ├── ai-pipeline.ts        # AI suggestion + validation + MARC generation pipeline
│   ├── ai.ts                 # Client-side AI helpers, MARC parsing
│   ├── lcsh.ts               # LOC API wrappers (searchLcsh, searchLcnaf)
│   ├── similarity.ts         # Levenshtein distance + similarity scoring
│   ├── store.ts              # Zustand store (settings, wizard state, history)
│   ├── model-registry.ts     # Provider registry with fallback models
│   ├── models.ts             # Dynamic model fetching from models.dev
│   └── provider-groups.ts    # Provider grouping and metadata
└── public/
    ├── manifest.json          # PWA manifest
    ├── sw.js                  # Service worker (generated)
    └── screenshots/           # Tutorial screenshots
```

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router, webpack mode)
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) 5
- [Tailwind CSS](https://tailwindcss.com/) 4
- [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- [Zustand](https://zustand.docs.pmnd.rs/) — State management with localStorage persistence
- [Vercel AI SDK](https://sdk.vercel.ai/) — `generateObject` / `generateText` with multi-provider support
- [Zod](https://zod.dev/) — Structured output schemas
- [next-pwa](https://github.com/shadowwalker/next-pwa) — Service worker and offline support
- [idb](https://github.com/nicoritschel/idb-keyval) — IndexedDB wrapper for browser storage

## Acknowledgments

Built on the [LC Linked Data Service](https://id.loc.gov/), which provides machine-readable access to the Library of Congress's authority files including Subject Headings (LCSH) and Name Authorities (LCNAF).

## License

All rights reserved.
