# UNLOAD Autopilot

> **Take a photo. Let AI sell it.**

A personal AI sales agent for secondhand items. UNLOAD is **not** a marketplace: it drafts honest listings, publishes through official marketplace APIs where they exist (export-ready drafts where they don't), answers buyers within seller-approved rules, and brings serious buyers to the seller for a decision.

Live: https://unload-tau.vercel.app

## Flow

1. Upload photos → AI drafts title, details and the few questions only the seller can answer.
2. Seller confirms condition and facts (they become the item's verified knowledge base).
3. Pricing rules: asking price, **private** minimum, counteroffers on/off, max discount.
4. Connect marketplaces → approve publishing → enable the agent.
5. The agent handles buyers (Manual / Assisted / Autopilot) and notifies the seller about deals, viewing requests and questions it can't verify.

## Architecture

| Boundary | Code |
|---|---|
| Product management | `lib/store.ts` (products, listings), `app/(app)/products/*` |
| AI vision & listing generation | `lib/server/claude.ts`, `app/api/ai/analyze`, `lib/vision/demo.ts`, `lib/listing/drafts.ts` |
| Marketplace adapters | `lib/marketplaces/types.ts` (interface), `lib/marketplaces/registry.ts` (Mock, OLX, manual export), `lib/server/olx.ts` + `app/api/olx/*` |
| Conversation management | `lib/store.ts` (`receiveBuyerMessage`, `syncMarketplaceThreads`), `app/(app)/inbox` |
| AI sales agent | `lib/agent/salesAgent.ts` (intents → decision), `app/api/ai/reply` (optional Claude wording) |
| Product knowledge base | `lib/knowledge/kb.ts`, facts/evidence on `Product` |
| Negotiation policy engine | `lib/negotiation/policy.ts` (`evaluateOffer`, `guardReply`) |
| Deal management | `DealRequest` in `lib/store.ts`, `app/(app)/deals` |
| Notifications | `notify()` in `lib/store.ts` (in-app + optional browser notifications) |
| Strategy | `lib/strategy/advisor.ts` (measured vs heuristic, no predictions) |

Safety rules enforced in code: the private minimum never appears in a reply (`guardReply` re-checks every outgoing text, including Claude's), unknown facts become verification tasks instead of guesses, and only the seller can approve a deal.

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
npm run check:agent    # agent + negotiation policy checks
```

Data (products, chats, deals) is stored in the browser's localStorage; verification photos/videos in IndexedDB.

Design source: `design/unload.pen` (v1), brief: `docs/design-brief.md`.
