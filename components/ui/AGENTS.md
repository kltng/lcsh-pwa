# components/ui

**Purpose**: shadcn/ui component library (Radix UI primitives with Tailwind styling)

## OVERVIEW
Radix UI primitive components wrapped with Tailwind CSS via class-variance-authority (CVA).

## STRUCTURE
```
components/ui/
├── button.tsx
├── card.tsx
├── input.tsx
├── label.tsx
├── textarea.tsx
├── select.tsx
├── dialog.tsx
├── progress.tsx
├── badge.tsx
├── alert.tsx
└── table.tsx
```

## WHERE TO LOOK
| Task | Component | Notes |
|------|-----------|-------|
| Form inputs | Input, Textarea | Use for data entry |
| Actions | Button | Variants: default, destructive, outline, secondary, ghost, link |
| Layouts | Card | Container for grouped content |
| Feedback | Alert, Progress | Alert for errors/warnings, Progress for step indicators |
| Modals | Dialog | Radix Dialog primitive |
| Display | Badge, Table | Badge for status, Table for data lists |

## CONVENTIONS
- All components use `cn()` from `@/lib/utils` for class merging
- CVA defines variants (componentNameVariants)
- Default export only
- No custom props - extend base component via className
- Use data-slot attribute for composition

## ANTI-PATTERNS
- Don't add custom props to shadcn components
- Don't override Radix primitive internals
- Don't add business logic (keep presentational)
- Don't use fixed colors (use Tailwind color tokens)

## ADDING COMPONENTS
```bash
npx shadcn@latest add [component-name]
```

Components are added to this directory automatically.
