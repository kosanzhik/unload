# UNLOAD Autopilot

> **Take a photo. Let AI sell it.**

A personal AI sales agent for secondhand items. UNLOAD is **not** a marketplace: it drafts honest listings, publishes through official marketplace APIs where they exist (export-ready drafts where they don't), answers buyers within seller-approved rules, and brings serious buyers to the seller for a decision.

Live: https://unload-tau.vercel.app

## Flow

Photo → AI listing → choose a goal (**Sell Fast / Balanced / Get More Money**) → approve price and private minimum → **activate Autopilot** → get notified when a buyer is ready → Accept / Counter / Reject → Mark as sold.

## Architecture

| Boundary | Code |
|---|---|
| Items & listings | `lib/store.ts`, `app/(app)/sell`, `app/(app)/items/[id]` |
| AI vision & listing text | `lib/server/claude.ts` (Anthropic key or Vercel AI Gateway), `app/api/ai/*`, `lib/listing/drafts.ts`, `lib/vision/demo.ts` |
| AutoSale strategy engine | `lib/strategy/engine.ts` — goal profiles, suggested minimums, adaptive tips from real activity only |
| Negotiation policy | `lib/negotiation/policy.ts` — counteroffer per goal, never below the minimum, price guard on every outgoing text |
| Sales agent | `lib/agent/salesAgent.ts` — intents (question, offer, agreement, meeting, payment, off-platform), uses only seller-confirmed facts |
| Offers & deals | `Offer` in `lib/store.ts`, `components/offer-card.tsx`, Inbox → Offers |
| Marketplace adapters | `lib/marketplaces/*` (one interface), server routes `app/api/{olx,ebay,reverb}` |
| Activity & notifications | truthful activity log + notifications in `lib/store.ts` |

Duplicate protection: a listing is never published twice, each buyer message is answered once, and synced marketplace messages are de-duplicated by external id.

Tests: `npm test` (node:test) — negotiation policy, strategy engine and sales agent (23 tests).

## Integrations

| Marketplace | Status |
|---|---|
| OLX Kazakhstan | Official OAuth + Partner API v2 (publish, status, update, activate/deactivate, threads, messages). Needs `OLX_CLIENT_ID` / `OLX_CLIENT_SECRET` from OLX partner approval; redirect URI `https://<host>/api/olx/callback`. |
| eBay, Facebook Marketplace, Mercari | Manual export (copy/download drafts, paste buyer messages into the inbox for policy-checked replies). |
| Demo Market | Mock adapter implementing the same interface, with clearly labeled scripted buyers. |

## Environment

```
ANTHROPIC_API_KEY=   # enables Claude vision + reply wording (claude-opus-5-5); without it a rule-based demo mode runs
OLX_CLIENT_ID=       # OLX Partner API (optional)
OLX_CLIENT_SECRET=
```

## Run

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # business logic tests
```

Data (products, chats, deals) is stored in the browser's localStorage; verification photos/videos in IndexedDB.

Design source: `design/unload.pen` (v1), brief: `docs/design-brief.md`.
