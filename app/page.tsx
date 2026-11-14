import {
  ArrowRight,
  Camera,
  Check,
  ClipboardCopy,
  Layers,
  ListChecks,
  Plus,
  Rocket,
  ShieldCheck,
  Store,
  TrendingUp,
} from "lucide-react";
import { Footer, SiteHeader } from "@/components/chrome";
import { SampleButton } from "@/components/SampleButton";
import { Badge, Button } from "@/components/ui";

const img = (n: string) => `/demo/${n}.jpg`;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Trust />
        <HowItWorks />
        <Preview />
        <Modes />
        <Comparison />
        <Faq />
        <BottomCta />
      </main>
      <Footer />
    </>
  );
}

function Section({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold tracking-widest text-ink-450">{children}</p>;
}

function Hero() {
  return (
    <Section className="!pt-10 sm:!pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Badge tone="success">A smarter way to clear your space</Badge>
          <h1 className="mt-5 text-[44px] leading-[1.02] font-extrabold sm:text-6xl lg:text-[72px]">
            Sell the stuff you don&apos;t use.
            <br />
            <span className="text-ink-450">Without the </span>
            <span className="relative inline-block">
              <span className="absolute inset-x-[-4px] bottom-1 h-[42%] -rotate-1 rounded-md bg-lime-400" />
              <span className="relative">busywork.</span>
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink-650 sm:text-xl">
            Add a few photos. Organize your items. Get ready-to-use listing drafts in one simple flow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/upload" size="lg">
              Start with photos <ArrowRight className="size-4" />
            </Button>
            <SampleButton />
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-450">
            <ShieldCheck className="size-4" /> No account needed to try. You review everything before posting.
          </p>
        </div>
        <HeroVisual />
      </div>
    </Section>
  );
}

function HeroVisual() {
  const tiles = [
    ["monitor", "Monitor"],
    ["keyboard", "Keyboard"],
    ["books", "Books × 4"],
    ["headphones", "Headphones"],
  ];
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {tiles.map(([n, l], i) => (
          <figure
            key={n}
            className={`relative overflow-hidden rounded-[20px] bg-soft ${i % 2 ? "translate-y-6" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(n)} alt={l} className="aspect-[4/3] w-full object-cover" />
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold">
              {l}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="relative z-10 mx-auto -mt-10 w-[88%] rounded-[20px] border border-line bg-surface p-4 shadow-[0_24px_60px_-24px_rgba(30,40,35,0.35)] sm:absolute sm:right-[-12px] sm:bottom-[-36px] sm:mt-0 sm:w-72">
        <div className="flex items-center justify-between">
          <p className="font-display font-bold">Your batch plan</p>
          <Badge tone="lime">3 drafts</Badge>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            ["Home-office bundle", "Monitor + keyboard"],
            ["Over-ear headphones", "1 item"],
            ["Books + desk lamp", "pairing is your call"],
          ].map(([t, s]) => (
            <li key={t} className="flex items-center gap-2.5 rounded-xl bg-soft px-3 py-2">
              <Check className="size-4 text-success" />
              <span className="font-semibold">{t}</span>
              <span className="ml-auto truncate text-xs text-ink-450">{s}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-450">Every draft stays editable</p>
      </div>
    </div>
  );
}

function Trust() {
  const items = [
    { icon: Layers, t: "Made for batches", s: "Five things or fifty, one flow" },
    { icon: ListChecks, t: "Review before export", s: "Nothing leaves without your OK" },
    { icon: Store, t: "You choose where to post", s: "Copy drafts to any platform" },
  ];
  return (
    <div className="border-y border-line bg-surface px-4 sm:px-6">
      <div className="mx-auto grid max-w-[1200px] gap-5 py-7 sm:grid-cols-3">
        {items.map((x) => (
          <div key={x.t} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-100">
              <x.icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{x.t}</p>
              <p className="text-sm text-ink-650">{x.s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Camera, t: "Drop in your photos", s: "Start with the things you already own." },
    { icon: Layers, t: "Pick your selling style", s: "Fewer listings or more individual detail — you decide." },
    { icon: ClipboardCopy, t: "Copy. Export. Post.", s: "Ready-to-edit drafts for your favorite resale platform." },
  ];
  return (
    <Section id="how-it-works" className="bg-ink-900 text-white">
      <Eyebrow>HOW IT WORKS</Eyebrow>
      <h2 className="mt-3 max-w-xl text-4xl leading-tight font-extrabold sm:text-5xl">
        Three steps. <span className="text-lime-400">One afternoon back.</span>
      </h2>
      <p className="mt-3 text-white/60">Your drawer called. It&apos;s time.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((x, i) => (
          <div key={x.t} className="rounded-[20px] bg-white/[0.06] p-6 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-lime-400 text-ink-900">
                <x.icon className="size-5" />
              </span>
              <span className="font-display text-4xl font-extrabold text-white/15">{i + 1}</span>
            </div>
            <p className="mt-6 font-display text-xl font-bold">{x.t}</p>
            <p className="mt-2 text-white/65">{x.s}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Preview() {
  const items = [
    ["monitor", "27-inch computer monitor", "Electronics · Good"],
    ["keyboard", "Mechanical keyboard", "Electronics · Good"],
    ["headphones", "Over-ear headphones", "Electronics · Fair"],
  ];
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl leading-tight font-extrabold sm:text-5xl">
          From &ldquo;I should sell these&rdquo; <span className="text-ink-450">to ready-to-post.</span>
        </h2>
        <p className="mt-4 text-lg text-ink-650">
          One workspace for the whole batch. Confirm what you have, pick a plan, and get drafts you can actually use.
        </p>
      </div>
      <div className="mt-12 grid items-center gap-4 rounded-[28px] border border-line bg-surface p-4 sm:p-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-[20px] bg-soft p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">Your items</p>
            <span className="text-xs text-ink-450">5 items · 3 shown</span>
          </div>
          <ul className="mt-3 space-y-2">
            {items.map(([n, t, s]) => (
              <li key={n} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(n)} alt="" className="size-12 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t}</p>
                  <p className="text-xs text-ink-650">{s}</p>
                </div>
                <Badge tone="success">Confirmed</Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center">
          <span className="rounded-full bg-lime-400 px-4 py-2 text-center font-display text-sm leading-tight font-bold">
            Fewer
            <br />
            listings
          </span>
        </div>
        <div className="rounded-[20px] bg-soft p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">Your plan</p>
            <Badge tone="lime">3 drafts</Badge>
          </div>
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Home-office bundle</p>
                <Badge tone="success">2 items</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-650">27-inch monitor + mechanical keyboard</p>
              <p className="mt-2 flex gap-3 text-xs font-semibold text-ink-650">
                <span>Split bundle</span>
                <span>Move item</span>
                <span>Edit name</span>
              </p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-surface p-3">
              <p className="text-sm font-semibold">Over-ear headphones</p>
              <Badge tone="success">Draft ready</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-coral-400 bg-[#fff7f4] p-3">
              <p className="text-sm font-semibold">Books + lamp</p>
              <Badge tone="warning">Confirm pairing</Badge>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Modes() {
  const modes = [
    {
      icon: TrendingUp,
      t: "Maximize asking total",
      s: "Prepare individual drafts so you can choose your own asking prices.",
      tag: "One draft per item",
    },
    {
      icon: Layers,
      t: "Fewer listings",
      s: "Explore sensible bundles and cut down the number of drafts.",
      tag: "Grouped drafts",
      featured: true,
    },
    {
      icon: Rocket,
      t: "Clear space sooner",
      s: "Prioritize what you'd like gone first, with a backup plan for the rest.",
      tag: "Priority-first order",
    },
  ];
  return (
    <Section className="bg-surface">
      <Eyebrow>THREE WAYS TO SELL</Eyebrow>
      <h2 className="mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">
        Choose how much work <span className="text-ink-450">you want to do.</span>
      </h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {modes.map((m) => (
          <div
            key={m.t}
            className={`flex flex-col rounded-[20px] border p-6 ${m.featured ? "border-ink-900 bg-lime-100" : "border-line bg-canvas"}`}
          >
            <span className={`flex size-11 items-center justify-center rounded-xl ${m.featured ? "bg-lime-400" : "bg-surface"}`}>
              <m.icon className="size-5" />
            </span>
            {m.featured && <p className="mt-5 text-[11px] font-bold tracking-widest text-success">GOOD STARTING POINT</p>}
            <p className={`font-display text-xl font-bold ${m.featured ? "mt-1" : "mt-5"}`}>{m.t}</p>
            <p className="mt-2 text-ink-650">{m.s}</p>
            <p className="mt-6 border-t border-line pt-4 text-sm font-semibold">{m.tag}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Comparison() {
  const things = ["Monitor", "Keyboard", "Headphones", "Desk lamp", "Books"];
  return (
    <Section>
      <h2 className="text-4xl leading-tight font-extrabold sm:text-5xl">
        Not another one-item <span className="text-ink-450">AI listing writer.</span>
      </h2>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-line bg-surface p-5 sm:p-6">
          <p className="font-display text-lg font-bold">One item at a time</p>
          <ul className="mt-4 space-y-2">
            {things.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 font-semibold">{t}</span>
                <span className="flex flex-1 gap-1">
                  {["Photo", "Write", "Price", "Post"].map((s) => (
                    <span key={s} className="flex-1 rounded-md bg-soft py-1 text-center text-xs text-ink-650">
                      {s}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-650">Five separate workflows, five times the decisions.</p>
        </div>
        <div className="rounded-[20px] bg-ink-900 p-5 text-white sm:p-6">
          <p className="font-display text-lg font-bold">
            One organized batch <span className="text-lime-400">· UNLOAD</span>
          </p>
          <ul className="mt-4 space-y-3">
            {[
              "Photograph everything at once",
              "Confirm details in one pass",
              "Group what belongs together",
              "Copy drafts when you're ready",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-lime-400 text-ink-900">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-white/60">One flow for the whole pile. You still make every call.</p>
        </div>
      </div>
    </Section>
  );
}

const FAQS = [
  ["Does UNLOAD post my listings automatically?", "No. You review, copy, and post your drafts yourself."],
  [
    "Do I need an account?",
    "Not to try it. Your photos and drafts live in this browser tab until you close it.",
  ],
  [
    "Does UNLOAD know exactly what my items are worth?",
    "No. UNLOAD doesn't predict sale prices. You set every asking price yourself.",
  ],
  ["Can I edit the drafts?", "Yes. Every title, description, grouping and price is editable before you copy it."],
];

function Faq() {
  return (
    <Section id="faq" className="bg-surface">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">Straight answers.</h2>
          <p className="mt-3 text-ink-650">UNLOAD helps you prepare listings. You stay in charge of prices and posting.</p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map(([q, a], i) => (
            <details key={q} className="group py-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">
                {q}
                <Plus className="size-5 shrink-0 transition group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-ink-650">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

function BottomCta() {
  return (
    <Section>
      <div className="rounded-[28px] bg-lime-400 px-6 py-14 text-center sm:py-20">
        <h2 className="text-4xl leading-tight font-extrabold sm:text-6xl">
          Your pile of stuff
          <br />
          has a plan now.
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/upload" size="lg">
            Start with photos <ArrowRight className="size-4" />
          </Button>
          <SampleButton variant="secondary">Explore a demo</SampleButton>
        </div>
      </div>
    </Section>
  );
}
