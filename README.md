# Cataloging Assistant

A Progressive Web App (PWA) built with [Next.js](https://nextjs.org), [TypeScript](https://www.typescriptlang.org/), and [shadcn/ui](https://ui.shadcn.com/).

## Features

- ⚡ Next.js 16 with App Router
- 🎨 shadcn/ui components
- 📱 Progressive Web App (PWA) support
- 🔷 TypeScript
- 🎯 Tailwind CSS
- ⚙️ ESLint configured

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## PWA Configuration

This project is configured as a Progressive Web App with:

- Service Worker (via `next-pwa`)
- Web App Manifest (`public/manifest.json`)
- Offline support
- Installable on mobile and desktop

**Note:** PWA features are disabled in development mode. To test PWA functionality, build and run the production server:

```bash
npm run build
npm start
```

### PWA Icons

The manifest references icon files that need to be added:
- `public/icon-192x192.png` (192x192 pixels)
- `public/icon-512x512.png` (512x512 pixels)

You can generate these icons using tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## Adding shadcn/ui Components

To add shadcn/ui components to your project:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

See the [shadcn/ui documentation](https://ui.shadcn.com/docs/components) for available components.

## Project Structure

```
cataloging-assistant/
├── app/              # Next.js App Router pages
├── components/       # React components (add shadcn components here)
├── lib/              # Utility functions
├── public/           # Static assets and PWA files
└── ...
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).
