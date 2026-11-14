# UNLOAD

> Less listing. More living.

A consumer web app that turns a batch of unused personal items into organized, ready-to-copy resale listing drafts.

Flow: add photos → verify identified items → choose effort level → review listing drafts → copy/export and post manually.

- Design brief (for Pencil / pen.dev): [docs/design-brief.md](docs/design-brief.md)

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

Demo mode: item recognition is simulated (`lib/recognize.ts`). The sample batch ("Try with sample items") walks through the full flow: Photos → Review → Plan → Drafts → Done. Photos and drafts live in `sessionStorage` only.

## Structure

- `app/` — pages: `/`, `/upload`, `/review`, `/plan`, `/drafts`, `/done`, `/pricing`
- `lib/store.tsx` — batch state (photos, items, plan, drafts)
- `lib/plan.ts` — grouping per selling mode + draft text generation
- `lib/recognize.ts` — photo → items (demo; swap for Claude vision API later)
- `design/unload.pen` — pen.dev design source
