# UNLOAD — Responsive Website & Web App Design Brief for Pencil / pen.dev

> **Instruction for the design agent:** Read this entire brief and **create editable, high-fidelity design frames in the current `.pen` canvas**. Do not return only a description, wireframe, or generated code. Reuse shared components and design variables; build the desktop, tablet, and mobile versions described below. All user-facing UI copy must be in **natural American English**.
>
> **Product:** UNLOAD — a consumer web app that turns a batch of unused personal items into organized, ready-to-copy resale listing drafts.
>
> **Brand promise:** *Less listing. More living.*
>
> **Core experience:** Add photos → verify identified items → choose how much work to do → review listing drafts → copy/export and post manually to chosen marketplaces.
>
> **IMPORTANT scope:** UNLOAD is **not** an online marketplace and **does not automatically publish listings or guarantee selling prices**. Avoid pretending there is a live marketplace integration, verified price estimate, buyer network, or proven earnings claim.

---

## 1. Product context and goal

UNLOAD helps US adults, roughly ages 25–45, deal with a familiar household task: they have multiple usable items they want to sell, but photographing, describing, grouping, pricing, and preparing separate listings is exhausting.

A user should understand the product in **five seconds**, be able to start without creating an account, and see a useful result after a short, guided flow. They may use UNLOAD occasionally rather than daily.

### Product differentiator to communicate in UI

Not "AI writes a listing for one item." Instead: **"I have a pile of things. Help me turn it into a manageable selling plan."**

The key emotional transition:

- Before: a messy pile of items, too many decisions, not enough time.
- After: a clear plan, a few organized listings, a sense of momentum.

### Main use cases

1. An adult clearing shelves or upgrading their home office.
2. Someone moving who wants to list multiple small items without spending an entire weekend.
3. Someone selling a mix of electronics, books, and household items with different levels of effort.

### First-run success outcome

A person uploads or selects demo photos, checks what was recognized, selects either **Maximize asking total**, **Fewer listings**, or **Clear space sooner**, and gets an editable batch of drafts with copy/export actions.

### Non-goals for V1

- No internal marketplace, checkout between buyers and sellers, buyer chat, or logistics.
- No automated eBay / Facebook Marketplace / Craigslist publishing.
- No unsupported AI appraisal or "guaranteed resale value."
- No mandatory authentication to try the primary flow.
- No fake ratings, fabricated testimonials, artificial social proof, or inflated impact metrics.

---

## 2. Art direction — editorial consumer product, not generic AI SaaS

Create a confident, highly polished consumer-facing interface: **minimal, expressive, approachable, and premium**, with strong layout rhythm and exceptionally clear affordances. It should feel more like a thoughtful lifestyle/productivity brand than an enterprise AI dashboard.

**Keywords:** calm clutter-free, bright confidence, tactile, organized, smart but human, contemporary resale, editorial product photography, friendly utility.

### Visual language

- Cream / off-white canvas, dark ink typography, fresh acid-lime accents, restrained coral highlights.
- Large bold editorial headings with plenty of whitespace.
- Beautiful object photography of ordinary sellable goods: a monitor, keyboard, headphones, books, desk lamp, coffee table, small home goods; clean backgrounds and believable composition.
- A visual motif of **loose objects becoming organized listing cards** — this should appear in the hero and product previews.
- Use tiny handwritten-style arrows or annotation accents **sparingly**, only where they clarify product transformation.
- Predominantly flat surfaces with subtle lines, soft shadows, controlled rounding. Avoid glassmorphism, neon cyberpunk, heavy gradients, futuristic AI brains/robots, confetti everywhere, and typical stock photos of smiling teams.
- Icons: consistent 1.8–2 px outline style, preferably Lucide-like. Never use emojis as the primary UI icons.
- Use real, editable text layers, shapes, cards, buttons, and component instances. Do not flatten entire screens into a single bitmap.

### Brand personality

Clever, encouraging, straightforward. No hype or misleading price promises. Short clear copy with occasional light humor: "Your drawer called. It's time." This should not overwhelm the serious functional UI.

### Logo direction

Custom wordmark **UNLOAD** with a simple geometric package/box + outward arrow mark. Avoid shopping-cart icon clichés. Create both full horizontal wordmark and compact icon for mobile header/favicon reference. Logo should be original and editable in vector shapes where practical.

---

## 3. Design system / tokens (create as shared variables)

### Color tokens

| Token | Hex | Use |
|---|---|---|
| `ink/900` | `#1E2823` | Headings, main copy, primary buttons |
| `ink/650` | `#53605A` | Secondary copy |
| `ink/450` | `#7D8A83` | Tertiary hints |
| `canvas/100` | `#F7F8F3` | Main page background |
| `surface/white` | `#FFFFFF` | Main cards and work areas |
| `surface/soft` | `#EFF1E9` | Subtle sections and placeholders |
| `line/default` | `#DBE0D8` | Card edges and separators |
| `lime/400` | `#CCF36C` | Brand accent, selected chips, friendly highlights |
| `lime/100` | `#F1F9DB` | Soft success / accent surfaces |
| `coral/400` | `#FF896D` | Small illustration emphasis, not error text |
| `status/success` | `#246746` | Success text / icon |
| `status/warning` | `#8B5517` | Needs-review warning text |
| `status/error` | `#B33E43` | Error text |

**Contrast rule:** Place `ink/900` text on lime. Avoid lime-colored body text on white. Always verify contrast for small typography and interactive controls.

### Typography

- Display / headline: **Manrope** (or closest available geometric sans), extra-bold, slightly tightened tracking.
- UI / body: **Inter** (or closest available neutral sans).
- Desktop hero H1: 64–72 px / line-height 1.06, max 2–3 lines.
- Mobile hero H1: 38–44 px / line-height 1.10.
- Section title: 38–44 px desktop; 28–32 px mobile.
- Card title: 20–24 px.
- Body: 16 px / 1.5; small labels 13–14 px; minimum 12 px only for tertiary details.
- Financial values and quantities use tabular numerals.

### Geometry and spacing

- 8 px base spacing system: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 112`.
- Container max-width: **1200 px** on wide desktop.
- Buttons: height 48 px standard, 54 px prominent CTA; large rounded 14–16 px.
- Cards: 18–24 px corner radius, 1 px light stroke, subtle shadow only where useful.
- Product photos: 16 px radius with real image crop; avoid overly stylized silhouettes.
- Header: ~80 px desktop, ~68 px mobile.
- Visible focus state: 2–3 px dark or lime-accented high-contrast outline.
- Touch targets at least 44 × 44 px.

### Reusable components to define on canvas

`Header`, `MobileMenu`, `PrimaryButton`, `SecondaryButton`, `IconButton`, `PillChip`, `StepProgress`, `UploadDropzone`, `UploadedThumbnail`, `ItemCard`, `ConfidenceLabel`, `ReviewField`, `ReviewBadge`, `ModeCard`, `BundleGroupCard`, `ListingDraftCard`, `MarketplaceChip`, `CopyButton`, `Toast`, `InlineAlert`, `EmptyState`, `SkeletonRow`, `ErrorState`, `FAQAccordion`, `PricingCard`, `Footer`.

Define variants/states: default, hover, focus, pressed, disabled, loading, success, warning, error, selected, and unselected where relevant.

---

## 4. Responsive layout rules — mandatory

Build explicit **sibling frames** for important pages at each breakpoint, using shared variables and component variants. Do **not** create a single desktop mockup and call it responsive.

| Breakpoint | Frame width | Side gutters | Layout |
|---|---:|---:|---|
| Desktop | **1440 px** | 120 px (max content 1200) | 12-column reference grid, 24 px gaps |
| Tablet | **768 px** | 32 px | 8-column reference grid, 16 px gaps |
| Mobile | **390 px** | 16 px | Single column; 12–16 px gaps |

Also check that the mobile system can be adapted to 360 px and 320 px without horizontal scrolling, clipped labels, inaccessible buttons, or overflowing tables.

### Responsive behavior requirements

**Desktop:** two-column hero and split product workspace; navigation links visible; contextual side information can remain in right rail.

**Tablet:** hero columns rebalance or stack; header navigation becomes compact; workspace uses one primary column and optional collapsible contextual rail; cards in a two-column grid where readable.

**Mobile:** full-width single-column forms/cards, collapsed hamburger menu, sticky bottom CTA when it materially helps, swipeable item thumbnail strip, step navigation with short labels, bottom-sheet-style selection for modes and options, inline safe-area spacing for bottom controls.

For mobile **do not shrink the desktop**. Reorder elements by task importance, shorten prose, use content-aware wrapping and reveal secondary settings on demand.

Ensure error and success messages are readable and not obscured by sticky controls. Large tap targets. Respect system text scaling as much as possible.

---

## 5. Site map and conversion path

### Public pages

1. **Landing / Home** — value proposition, immediate photo action, visual demo, how it works, modes, FAQs, trust messaging.
2. **How it Works** — optional full detail route or expanded landing section.
3. **Pricing** — transparent experimental pricing concept and free-preview option; no forced subscription.

### Main product flow

4. **Upload** — start with real photos or a sample batch.
5. **Review Items** — AI-proposed identification and structured fields with obvious confirmation steps.
6. **Choose Your Plan** — compare a few-listings vs separate-listings strategy and see groupings.
7. **Listing Workspace** — review/edit listing drafts, copy/export, track manually what has been posted.
8. **Done / Handoff** — prepared drafts summary and next actions, without implying completed sales.

### Global navigation

Left: UNLOAD logo. Desktop links: `How it works`, `Pricing`, `FAQ`. Right CTA: `Start with photos`.

On mobile: logo left, menu icon right, prominent accessible CTA within hero. Menu opens an overlay/drawer with all links and visible close control.

---

## 6. Screen specifications and exact sample copy

### A. `01_Home_Desktop`, `01_Home_Tablet`, `01_Home_Mobile`

**Hero / above the fold**

- Eyebrow: `A smarter way to clear your space`
- H1: **`Sell the stuff you don't use. Without the busywork.`**
- Supporting copy: `Add a few photos. Organize your items. Get ready-to-use listing drafts in one simple flow.`
- Primary CTA: `Start with photos` with an arrow icon.
- Secondary CTA: `Try with sample items`.
- Helper line: `No account needed to try. You review everything before posting.`
- Hero visual: beautiful multi-object collage with labeled floating cards transitioning into **3 organized resale listings**. Use believable object photography, no fake prices or unfounded earnings claims. Show that multiple items are the product's focus.

**Trust strip:** no fake users, partner logos or testimonials. Use feature assurances: `Made for batches`, `Review before export`, `You choose where to post`.

**How it works (3 clear steps)**

1. `Drop in your photos` — `Start with the things you already own.`
2. `Pick your selling style` — `Fewer listings or more individual detail — you decide.`
3. `Copy. Export. Post.` — `Ready-to-edit drafts for your favorite resale platform.`

**Product preview**

Show a realistic preview of an inventory workspace (not an abstract dashboard). Section title: `From “I should sell these” to ready-to-post.` Three item cards and grouped strategy preview with simple connector arrows.

**Three modes**

- `Maximize asking total` — `Prepare individual drafts so you can choose your own asking prices.`
- `Fewer listings` — `Explore sensible bundles and cut down the number of drafts.`
- `Clear space sooner` — `Prioritize what you'd like gone first, with a backup plan for the rest.`

No mode promises a sale, predicted time-to-sell, or precise price without verified data.

**Comparison mini-section:** `Not another one-item AI listing writer.` Show `One item at a time` vs `One organized batch`. Do not mention competitors by name.

**Bottom CTA**

Title: `Your pile of stuff has a plan now.`
Buttons: `Start with photos` / `Explore a demo`.

**FAQ snippets**

- `Does UNLOAD post my listings automatically?` → `No. You review, copy, and post your drafts yourself.`
- `Do I need an account?` → `No account is required to try the demo flow.`
- `Does UNLOAD know exactly what my items are worth?` → `No. You confirm the condition and set asking prices. Verified comparable data, when available, should be clearly distinguished from your asking price.`
- `Can I edit the drafts?` → `Yes. Every title, description, and grouping is editable before export.`

**Footer:** logo, short statement, `How it works`, `Pricing`, `Privacy`, `Terms`, and a non-affiliation note about resale platforms if mentioned.

### B. `02_Upload_Desktop`, `02_Upload_Tablet`, `02_Upload_Mobile`

Progress navigation: `1. Photos  →  2. Review  →  3. Plan  →  4. Drafts`.

Heading: `Start with the things you want to sell.`
Subheading: `Add a few photos. One item or a whole shelf — both work.`

**Main upload area**

- Large dropzone with a calm image-plus icon and soft dashed outline.
- Label: `Drag photos here, or browse files`.
- Helper: `Choose clear photos of the items you own.`
- Alternative button: `Use a sample batch` (critical: jury must test without finding their own pictures).
- After adding: thumbnail grid/strip with `Add photos`, remove image, and image count.
- Primary CTA: `Continue to review` (disabled until there is a photo/sample).
- Secondary link: `Back to home`.

Use design-assumption copy for acceptable formats and limits rather than inventing hard product capabilities. For the high-fidelity mockup, sample photos may show a monitor, a keyboard, headphones, a desk lamp, and a group of books.

**States to show:** empty dropzone; drag-over; uploading/progress; file unsupported; upload failed with retry; uploaded successfully. Use clear, non-blaming error language.

### C. `03_Review_Desktop`, `03_Review_Tablet`, `03_Review_Mobile`

Heading: `Let's make sure we've got these right.`
Description: `We suggested item names from your photos. Confirm the details before we make the drafts.`

**Editable sample item cards**

1. `27-inch computer monitor` — category `Electronics`, condition `Good`, brand/model `Not confirmed`.
2. `Mechanical keyboard` — category `Electronics`, condition `Good`, brand/model `Not confirmed`.
3. `Over-ear headphones` — category `Electronics`, condition `Fair`, note `Please confirm functionality`.
4. `Desk lamp` — category `Home`, condition `Good`.
5. `Paperback book set` — category `Books`, condition `Good`, quantity `4 books`.

Each row/card: thumbnail, name editable field, category dropdown, condition dropdown, accessories, issue notes, asking price field (`You set this`), status badge (`Needs review` or `Confirmed`), `Remove` action.

Sample detection confidence must not be presented as falsely precise percentages. Use qualitative `Needs confirmation` instead. Avoid inventing identifiable brand/model details from ambiguous images.

Desktop: large main list left with photo preview/detail panel right. Mobile: stacked cards with expandable details and a sticky `Confirm 5 items` CTA. Include summary of `5 items • 3 need details` (sample state only).

**Empty state:** `No items recognized yet.` + `Add an item manually` / `Try another photo`.

### D. `04_Plan_Desktop`, `04_Plan_Tablet`, `04_Plan_Mobile`

Heading: `How do you want to sell this batch?`
Supporting: `Pick the approach that fits your time. You can change it later.`

Show three selectable mode cards:

- `Maximize asking total` — small description: `More individual drafts. You control each asking price.`
- `Fewer listings` — highlighted as a convenient starting point: `Group compatible items so there's less to prepare.`
- `Clear space sooner` — `Focus on the items you'd like to move first.`

Below modes, show a **live-looking plan preview** with two legitimate sample arrangements:

**Separate plan:**
- `5 draft listings` — one per item.
- User-entered *asking total* displayed only if all item prices were provided.

**Fewer-listings plan:**
- `3 draft listings`: `Home-office bundle (monitor + keyboard)`; `Headphones`; `Books + lamp` only if user confirms this pairing, otherwise offer books and lamp separately. Avoid asserting an odd bundle is optimal without evidence.
- Allow `Split bundle`, `Move item`, `Edit group name` controls.

**Pricing integrity:** If demo numbers are shown, label `Example asking prices — not predicted sales.` Display no guaranteed savings or market valuation.

Primary button: `Create my drafts`. Secondary: `Back to items`.

For mobile make the selected mode sticky only as a short summary; present group cards in a clear vertical list.

### E. `05_Drafts_Desktop`, `05_Drafts_Tablet`, `05_Drafts_Mobile`

Heading: `Your listings are ready for review.`
Subtitle: `Edit the details, then copy or export. Nothing is posted automatically.`

Desktop layout: left rail listing index + center editable draft + right preview/help column. Tablet: two columns or collapsible rail. Mobile: segmented list of drafts above a single editable card, no tiny three-column UI.

**First demo listing**

- Thumbnail image of an everyday item (not a branded stock advertisement).
- Draft title: `27-inch computer monitor — good condition`.
- Draft description:
  `Used 27-inch monitor in good condition. Stand included. Please confirm the exact model, ports, and any cosmetic wear before posting.`
- Fields: title, description, category, condition, asking price, pickup/shipping preference, attached photos.
- Tags: `Draft`, `Needs a model check`.
- Quick actions: `Copy title`, `Copy description`, `Download draft`, `Download photos`.
- Optional `Mark as posted` manual status control. Must NOT say `Post to eBay` as if an integration exists.

**Progress sidebar/card:** `3 drafts ready • 1 needs a detail` (illustrative). Show small steps `Review → Copy or export → Post yourself`.

Use friendly success toast: `Description copied`.

**Secondary CTA:** `Edit my plan`.

**Privacy affordances:** `Delete this draft` and an appropriately placed privacy/help link. Avoid promising local-only storage unless actually implemented.

### F. `06_Pricing_Desktop`, `06_Pricing_Tablet`, `06_Pricing_Mobile`

Pricing is **conceptual**. No checkout mockup claiming working payment processing unless implemented.

Heading: `Less time listing. More room for what matters.`

Two restrained cards:

- `Free preview` — `$0` — `Try a sample batch, explore the flow, and preview a draft.` Button: `Try the demo`.
- `Batch pack` — **`$5 / up to 10 items`** — `Prepare and organize a batch of editable listing drafts.` Button: `Start a batch`.

Small note under pricing: `Concept pricing shown for product testing. Payment is not active in this prototype.`

Do not add fake `Most Popular`, testimonials, or comparison statistics.

### G. `07_Completion_Desktop`, `07_Completion_Tablet`, `07_Completion_Mobile`

Heading: `One less thing on your to-do list.`
Subheading: `Your draft listings are organized and ready for you to post.`

- Big bold count: `3 drafts prepared`.
- Three clear next-step cards: `Review each draft`, `Copy or download`, `Post on your chosen marketplace`.
- Buttons: `Back to drafts`, `Start another batch`.
- Optional prompt: `What would make this easier?` with feedback link (no false production integration).

A small celebratory visual accent is okay; avoid implying the items have already sold or that payment has been received.

---

## 7. Interaction and edge-state library

Create an adjacent **UI States** board showing representative patterns in desktop and mobile:

1. Upload empty / drag-over / 40% progress / success / unsupported format / retry.
2. Item detection awaiting review / manually added / confirmed / unclear image.
3. Strategy mode selected / unselected / mode changed / bundle edited.
4. Draft in progress / saved locally-or-session as a visual concept / copied toast / export ready.
5. Skeleton/loading state that holds layout without jitter.
6. Network error with a clear retry affordance.
7. No photos, no recognized items, no completed drafts.
8. Confirmation before destructive removal; visible Undo where appropriate.
9. No price available: `Add your asking price` — never manufacture a price.

All form fields must have visible labels, not only placeholders. Include helper/error text and keyboard focus state.

---

## 8. Accessibility, usability and content rules

- Conform to WCAG AA contrast targets where possible.
- Main body 16 px or more; do not use tiny gray text for critical instructions.
- Buttons at least 44 px tap size; no hover-only actions.
- Explicit field labels, described validation errors, usable focus outlines.
- Icons require accompanying labels for important actions.
- Layout should not rely on color alone to show state.
- Images have planned alt text; product images should have meaningful filenames and descriptions in the implementation handoff.
- Use unobtrusive animations and respect reduced-motion preference in future code.
- Keep primary action obvious on every screen; avoid multiple competing neon CTAs.
- Never fabricate customer reviews, customer counts, savings percentages, affiliation or marketplace features.
- Avoid collecting or displaying personal phone numbers, street addresses, buyer information, or payment credentials in this V1 design.

---

## 9. Precise responsive design requirements by screen

| Screen | Desktop 1440 | Tablet 768 | Mobile 390 |
|---|---|---|---|
| Home | 2-column hero; collage right; 3-up process cards | Stacked or balanced hero; 2-up sections | Single-column; photo collage beneath CTA; vertically stacked sections |
| Upload | Dropzone left, tips/sample on right | Single wide dropzone, tips below | Full-width photo picker; horizontal thumbnails; bottom CTA |
| Review | Inventory left, item detail panel right | Two-column cards or main + compact panel | Single cards with expandable fields; bottom CTA |
| Plan | Three mode cards in one row; grouped preview below | 2+1 mode layout or stacked | Full-width selectable modes, vertical bundle cards |
| Drafts | Listing rail + editor + preview side panel | Rail collapses; editor dominant | Single draft editor; list switcher top; actions bottom |
| Pricing | Two balanced pricing cards | Two cards if readable | Vertically stacked cards |
| Completion | Two-column illustration and next steps | Stack with medium illustration | Compact summary and 3 vertical next steps |

**Frame naming (exact pattern):**

- `01_Home_Desktop_1440`, `01_Home_Tablet_768`, `01_Home_Mobile_390`
- `02_Upload_Desktop_1440`, `02_Upload_Tablet_768`, `02_Upload_Mobile_390`
- `03_Review_Desktop_1440`, `03_Review_Tablet_768`, `03_Review_Mobile_390`
- `04_Plan_Desktop_1440`, `04_Plan_Tablet_768`, `04_Plan_Mobile_390`
- `05_Drafts_Desktop_1440`, `05_Drafts_Tablet_768`, `05_Drafts_Mobile_390`
- `06_Pricing_Desktop_1440`, `06_Pricing_Tablet_768`, `06_Pricing_Mobile_390`
- `07_Completion_Desktop_1440`, `07_Completion_Tablet_768`, `07_Completion_Mobile_390`
- `08_Components_And_States`

Design full-page, vertically scrolling artboards where needed. The 1440/768/390 dimensions are **frame widths**; height should grow naturally with content. On the marketing hero, make the first viewport compelling and readable at approximately 900/1024/844 px view heights.

---

## 10. User flow, handoff and quality bar

### Link important screens in prototype logic

`Home` → `Upload` → `Review` → `Plan` → `Drafts` → `Completion`.

All `Start with photos` buttons lead to Upload. All `Try sample` actions start a prefilled demo. The back buttons return to the preceding step without implying that user data is lost. In draft editor, copying/exporting is distinct from actually posting externally.

If the canvas supports prototype navigation, connect buttons. If not, keep the flow labels and clickable affordances clear for future implementation.

### Visual quality criteria

- A discerning consumer brand, not a clone of generic SaaS dashboards.
- Attractive above-the-fold landing page with distinctive multi-item → organized listings storytelling.
- Consistent spacing, type, radii, elevation and interactive component states.
- Every product screenshot should show believable data with no fabricated valuations.
- On mobile, the experience must feel purpose-built, not merely compressed.
- No text clipping, overlapping, horizontal scrolling, broken alignment, vague controls, or generic grey placeholders in the final high-fidelity pass.
- Distinct empty, loading, ready, error, success states where they matter.
- Use shared variables / components in `.pen` so future design-to-code implementation can reuse tokens.

### Build order (use if generating the whole design at once is too large)

**Pass 1 — Design foundations and primary experience:** create shared tokens/components plus `Home`, `Upload`, `Review`, `Plan`, and `Drafts` at desktop and mobile widths. Make them polished, complete and editable.

**Pass 2 — Responsive completeness:** add tablet adaptations for those screens; create `Pricing`, `Completion` at all three widths; produce the components/states board and connect the obvious prototype transitions.

**Pass 3 — QA and refinement:** compare all breakpoint variants; improve imagery, visual hierarchy, copy, forms, empty/error states and focus/contrast. Verify all required frame names are present and that mobile variants are not miniature desktop screens.

### Final deliverable expected from Pencil / pen.dev

A **single editable `.pen` design document** containing the 21 named responsive page frames plus the components-and-states board, with consistent design tokens and a clear interaction flow. Show the visual result in the canvas; do not stop at text or code generation.

---

## 11. Ready-to-paste short launch prompt for the Pencil / pen.dev agent

Copy this sentence into the agent composer **with this Markdown brief in your project or pasted as context**:

> Read `UNLOAD_Pencil_Responsive_Design_Brief.md` carefully. Design UNLOAD as a polished, original, responsive consumer web product directly in the current editable `.pen` canvas. Follow the provided brand system, accurate product scope, sample UI copy, frame naming and 1440/768/390 layouts. Start with Pass 1, creating shared components and high-fidelity Home, Upload, Review, Plan and Drafts screens for desktop and mobile. Do not merely summarize the spec, do not output code instead of canvas designs, and do not fabricate resale prices, automatic marketplace publishing, or user testimonials. Then continue with Pass 2 and Pass 3 to complete the requested frames and QA.

