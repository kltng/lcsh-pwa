# AGENTS.md

## Build & Development Commands

```bash
# Development
npm run dev          # Start dev server with webpack (http://localhost:3000)

# Production
npm run build        # Build for production (uses webpack)
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint

# Testing
# No test framework configured - tests should be added when implementing new features
```

## Code Style Guidelines

### Imports
```typescript
// Order: 1) External libraries, 2) Internal (with @/ alias), 3) Relative imports
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import type { BibliographicInfo } from "./types";
```

- Use `import type` for type-only imports
- Group related imports together
- Use `@/` alias for internal imports (configured in tsconfig.json)

### Component Structure
```typescript
"use client"; // Required for client components

import { useState } from "react";

interface ComponentProps {
  // Props interface defined above component
  title: string;
  onSave?: () => void;
}

export function Component({ title, onSave }: ComponentProps) {
  // Props destructured in signature
  const [state, setState] = useState("");

  // Handlers defined before return
  function handleClick() {
    // ...
  }

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}

// Default export for pages, named export for reusable components
export default function Page() { ... }
```

- Client components must have `"use client"` at top
- Use function components, not classes
- Destructure props in function signature
- Export reusable components with `export function`
- Use `export default` for pages

### TypeScript
```typescript
// Strict mode enabled - always use explicit types
interface Data {
  id: string;
  name: string;
}

async function fetchData(id: string): Promise<Data> {
  // ...
}

// Use Readonly for immutable types
type Props = Readonly<{
  children: React.ReactNode;
}>;
```

- Strict mode enabled in tsconfig.json
- Always define explicit types for function parameters and returns
- Use `interface` for object shapes, `type` for unions/primitives
- Export types that are reused across files
- Use `Readonly<>` for props that shouldn't be modified

### State Management (Zustand)
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Store {
  // State
  count: number;

  // Actions
  increment: () => void;
  reset: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      reset: () => set({ count: 0 }),
    }),
    { name: "app-storage" }
  )
);
```

- Use Zustand for global state
- Organize store by domain slices
- Use `persist` middleware for data persistence
- Define state and actions in same interface

### Styling (Tailwind CSS + shadcn/ui)
```typescript
import { cn } from "@/lib/utils";

// Use cn() utility for conditional classes
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className
)} />

// shadcn/ui components use CVA for variants
<Button variant="outline" size="sm">
  Click me
</Button>
```

- Use `cn()` utility for class merging (clsx + tailwind-merge)
- Tailwind CSS v4 with PostCSS
- Use shadcn/ui components for common UI patterns
- shadcn/ui components use class-variance-authority (CVA) for variants
- Responsive-first design approach

### Error Handling
```typescript
// Components
try {
  await apiCall();
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  setError(message);
  console.error("Error:", err);
}

// API Routes
try {
  // ...
} catch (error) {
  console.error("Error:", error);

  let statusCode = 500;
  if (error instanceof Error) {
    if (error.message.includes("401")) statusCode = 401;
    if (error.message.includes("404")) statusCode = 404;
  }

  return NextResponse.json(
    { error: error.message || "Internal server error" },
    { status: statusCode }
  );
}
```

- Always try-catch async operations
- Use `instanceof Error` checks before accessing error properties
- Display user-friendly errors in UI (Alert components)
- Return appropriate HTTP status codes in API routes
- Log errors to console for debugging

### API Routes
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { param1, param2 } = body;

    if (!param1) {
      return NextResponse.json(
        { error: "param1 is required" },
        { status: 400 }
      );
    }

    // Process request
    const result = await processData(param1, param2);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
```

- Use Next.js App Router (`app/api/[route]/route.ts`)
- Validate request parameters
- Return structured responses with error field
- Include appropriate HTTP status codes

### File Organization
```
cataloging-assistant/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Root page
│   ├── layout.tsx         # Root layout
│   ├── [route]/           # Route groups
│   │   └── page.tsx
│   └── api/              # API routes
│       └── [endpoint]/
│           └── route.ts
├── components/           # React components
│   ├── ui/               # shadcn/ui components
│   └── [feature]/       # Feature-specific components
├── lib/                 # Utility functions
│   ├── utils.ts         # General utilities (cn, etc.)
│   ├── store.ts         # Zustand store
│   └── [module].ts      # Domain-specific logic
└── public/             # Static assets
```

### Naming Conventions
- **Files**: kebab-case (`my-component.tsx`, `api-route.ts`)
- **TypeScript files**: camelCase for functions/variables
- **Components**: PascalCase (`MyComponent`, `UserProfile`)
- **Utilities**: camelCase (`cn()`, `formatDate()`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ITEMS`, `DEFAULT_TIMEOUT`)

### Comments & Documentation
```typescript
/**
 * Brief description of what this does
 * @param param1 - Description of param1
 * @returns Description of return value
 */
function doSomething(param1: string): number {
  // Inline comment for complex logic only
  return param1.length;
}
```

- Use JSDoc comments for exported functions and types
- Keep comments concise and focused on "why", not "what"
- Comment complex algorithms, not obvious code
- No comments needed for self-explanatory code

### Type Safety Rules
- **NEVER suppress type errors** with `@ts-ignore` or `@ts-expect-error`
- Avoid `as any` - it's only acceptable in API routes for AI SDK compatibility
- Use `unknown` instead of `any` when type is truly unknown
- Prefer type guards over assertions

## Project Configuration

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Library**: shadcn/ui (Radix UI primitives)
- **State**: Zustand with persistence
- **Linting**: ESLint with Next.js config
- **PWA**: next-pwa with webpack
- **AI SDK**: Vercel AI SDK (@ai-sdk/*)

## Key Patterns

### Image Handling
```typescript
// Convert images to base64 for AI processing
const base64Data = await fileToBase64(file);
```

### API Integration
- Use Vercel AI SDK for AI operations
- Handle multiple providers (OpenAI, Google, Anthropic, OpenAI-compatible)
- Use structured output when available, fallback to text parsing

### PWA Configuration
- PWA features disabled in development
- Use production build to test PWA functionality
- Icons: `public/icon-192x192.png`, `public/icon-512x512.png`
