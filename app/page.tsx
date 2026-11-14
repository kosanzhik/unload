import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Bot,
  Camera,
  Check,
  ClipboardCheck,
  FileVideo,
  Handshake,
  Lock,
  Plug,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Logo } from "@/components/chrome";
import { Button } from "@/components/ui";

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-500 md:flex">
            <a href="#how" className="hover:text-ink-900">How it works</a>
            <a href="#agent" className="hover:text-ink-900">The agent</a>
            <a href="#marketplaces" className="hover:text-ink-900">Marketplaces</a>
            <a href="#trust" className="hover:text-ink-900">Safety</a>
          </nav>
          <Button href="/dashboard" size="sm">
            Open app
          </Button>
        </div>
      </header>

      <main>
        <Hero />
        <Flow />
        <Agent />
        <Proof />
        <Markets />
        <Trust />
        <Cta />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-8 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>UNLOAD isn&apos;t a marketplace and isn&apos;t affiliated with OLX, eBay, Meta or Mercari. You stay the seller.</p>
          <p>© 2026 UNLOAD</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">{children}</p>;
}

function Hero() {
  return (
    <Section className="!pt-12 sm:!pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-700">
            <Bot className="size-3.5 text-brand" /> Your personal AI sales agent
          </span>
          <h1 className="mt-5 text-[44px] leading-[1.02] font-extrabold sm:text-6xl lg:text-7xl">
            Take a photo.
            <br />
            <span className="text-brand">Let AI sell it.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-500 sm:text-xl">
            UNLOAD drafts an honest listing, publishes it to marketplaces you connect, answers buyers within your rules, and only taps you when a decision is yours.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/products/new" size="lg">
              <Camera className="size-4" /> Sell an item
            </Button>
            <Button href="/dashboard" size="lg" variant="secondary">
              Try the demo workflow <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-ink-400">No account needed. Your data stays in your browser.</p>
        </div>
        <HeroChat />
      </div>
    </Section>
  );
}

function HeroChat() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-brand-100 via-transparent to-transparent" />
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-pop)] sm:p-5">
        <div className="flex items-center gap-3 border-b border-line pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/demo/monitor.jpg" alt="" className="size-11 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">27-inch monitor with stand</p>
            <p className="text-xs text-ink-500">Asking $150 · Autopilot on</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-white">
            <Lock className="size-3" /> min $130
          </span>
        </div>
        <ol className="space-y-3 pt-4 text-sm">
          <Msg who="buyer">Would you accept $120?</Msg>
          <Msg who="ai">The seller is asking $150. I can offer $135 if that works for you.</Msg>
          <Msg who="buyer">Does the HDMI port actually work?</Msg>
          <Msg who="ai">That hasn&apos;t been verified yet. I&apos;ll ask the seller to check.</Msg>
          <li className="flex items-center gap-2 rounded-xl bg-warning-50 px-3 py-2 text-xs font-semibold text-warning">
            <FileVideo className="size-4" /> Task for you: test the HDMI port, add a short video
          </li>
          <Msg who="buyer">OK, $135 works. Can I see it tomorrow?</Msg>
          <li className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
            <Handshake className="size-4" /> Deal request: $135 · viewing tomorrow · waiting for your OK
          </li>
        </ol>
      </div>
    </div>
  );
}

function Msg({ who, children }: { who: "buyer" | "ai"; children: React.ReactNode }) {
  return (
    <li className={who === "ai" ? "flex justify-end" : "flex"}>
      <span className={who === "ai" ? "max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-3.5 py-2 text-white" : "max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-canvas px-3.5 py-2"}>
        {who === "ai" && <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-white/70 uppercase"><Bot className="size-3" /> AI agent</span>}
        {children}
      </span>
    </li>
  );
}

const STEPS = [
  { icon: Camera, t: "Upload photos", s: "A few angles of the item. Several items, each with its own agent." },
  { icon: ScanSearch, t: "Confirm the facts", s: "AI drafts the title, details and the few questions only you can answer." },
  { icon: SlidersHorizontal, t: "Set your rules", s: "Asking price, a private minimum, how far the agent may negotiate." },
  { icon: Plug, t: "Connect marketplaces", s: "Official APIs where they exist, ready-to-post drafts where they don't." },
  { icon: Bot, t: "Approve & enable Autopilot", s: "Nothing goes live without you. Pick Manual, Assisted or Autopilot." },
  { icon: Bell, t: "Get pinged for decisions", s: "Serious buyers, viewing requests, and questions the agent can't verify." },
];

function Flow() {
  return (
    <Section id="how" className="bg-surface">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="mt-3 max-w-2xl text-4xl leading-tight font-extrabold sm:text-5xl">Six steps from shelf to sold. You do three of them.</h2>
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((x, i) => (
          <li key={x.t} className="rounded-2xl border border-line bg-canvas p-6">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-navy text-white">
                <x.icon className="size-5" />
              </span>
              <span className="font-display text-sm font-bold text-ink-400">0{i + 1}</span>
            </div>
            <p className="mt-5 font-display text-lg font-bold">{x.t}</p>
            <p className="mt-1.5 text-sm text-ink-500">{x.s}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Agent() {
  const modes = [
    { t: "Manual", s: "The agent drafts every reply. You approve each one." },
    { t: "Assisted", s: "Routine answers go out. Price talk waits for you." },
    { t: "Autopilot", s: "Routine answers and counteroffers inside your range go out. Deals still need you." },
  ];
  return (
    <Section id="agent">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow>One agent per item</Eyebrow>
          <h2 className="mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">It sells like you would. Within limits you set.</h2>
          <ul className="mt-8 space-y-3">
            {[
              "Answers only from facts you verified. No invented features.",
              "Negotiates between your asking price and a minimum it never reveals.",
              "Spots serious buyers and viewing requests, then builds a Deal Request.",
              "Escalates payment questions, off-platform requests, and anything uncertain.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-ink-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          {modes.map((m, i) => (
            <div key={m.t} className={`rounded-2xl border p-5 ${i === 2 ? "border-navy bg-navy text-white" : "border-line bg-surface"}`}>
              <p className="font-display text-lg font-bold">{m.t}</p>
              <p className={i === 2 ? "mt-1 text-sm text-white/70" : "mt-1 text-sm text-ink-500"}>{m.s}</p>
            </div>
          ))}
          <p className="px-1 text-sm text-ink-500">Final deal confirmation always stays with you, in every mode.</p>
        </div>
      </div>
    </Section>
  );
}

function Proof() {
  const steps = [
    ["Buyer asks", "“Does the HDMI port actually work?”"],
    ["Agent is honest", "“That hasn't been verified yet. I'll ask the seller.”"],
    ["You check", "Test it, optionally attach a short video."],
    ["Knowledge grows", "Saved as a verified fact; the agent reuses it for every buyer."],
  ];
  return (
    <Section className="bg-navy text-white">
      <p className="text-xs font-bold tracking-[0.18em] text-brand-100 uppercase">Living listing · Proof-to-deal</p>
      <h2 className="mt-3 max-w-3xl text-4xl leading-tight font-extrabold sm:text-5xl">Every question answered once. Then never again.</h2>
      <ol className="mt-12 grid gap-4 md:grid-cols-4">
        {steps.map(([t, s], i) => (
          <li key={t} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
            <span className="font-display text-sm font-bold text-brand-100">0{i + 1}</span>
            <p className="mt-3 font-display text-lg font-bold">{t}</p>
            <p className="mt-1 text-sm text-white/70">{s}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-white/60">Evidence shows the item at the time it was recorded. UNLOAD never presents it as a guarantee.</p>
    </Section>
  );
}

function Markets() {
  const rows = [
    ["OLX Kazakhstan", "Official OAuth + Partner API: publish, status, messages", "Connected once API access is approved"],
    ["eBay", "Export-ready drafts with item specifics", "Manual export"],
    ["Facebook Marketplace", "No public listing API for individuals", "Manual export"],
    ["Mercari", "No public listing API for individual sellers", "Manual export"],
  ];
  return (
    <Section id="marketplaces" className="bg-surface">
      <Eyebrow>Marketplaces</Eyebrow>
      <h2 className="mt-3 max-w-2xl text-4xl leading-tight font-extrabold sm:text-5xl">Sell where buyers already are. No new marketplace.</h2>
      <p className="mt-4 max-w-2xl text-ink-500">We show the real status of every integration. If a platform has no official API, we say so and give you a ready-to-post draft.</p>
      <div className="mt-10 overflow-hidden rounded-2xl border border-line">
        {rows.map(([n, d, s]) => (
          <div key={n} className="grid gap-1 border-b border-line bg-canvas px-5 py-4 last:border-0 sm:grid-cols-[220px_1fr_auto] sm:items-center sm:gap-6">
            <p className="font-semibold">{n}</p>
            <p className="text-sm text-ink-500">{d}</p>
            <p className="text-xs font-semibold text-ink-700">{s}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Trust() {
  const items = [
    { icon: Lock, t: "Your minimum stays private", s: "A policy check blocks any reply that would reveal it or quote an unapproved price." },
    { icon: ShieldCheck, t: "No invented facts", s: "Unknown? The agent says so and asks you. It never guesses condition or specs." },
    { icon: ClipboardCheck, t: "No fake numbers", s: "No price predictions, demand scores, or “sells in 3 days” claims. Measured data is labeled as measured." },
    { icon: BadgeCheck, t: "You close the deal", s: "Offers, viewings, and purchases become Deal Requests that only you can approve." },
  ];
  return (
    <Section id="trust">
      <Eyebrow>Safety by design</Eyebrow>
      <h2 className="mt-3 max-w-2xl text-4xl leading-tight font-extrabold sm:text-5xl">An agent you can leave alone with buyers.</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((x) => (
          <div key={x.t} className="rounded-2xl border border-line bg-surface p-6">
            <x.icon className="size-5 text-brand" />
            <p className="mt-4 font-semibold">{x.t}</p>
            <p className="mt-1.5 text-sm text-ink-500">{x.s}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Cta() {
  return (
    <Section>
      <div className="rounded-3xl bg-navy px-6 py-14 text-center text-white sm:py-20">
        <h2 className="text-4xl leading-tight font-extrabold sm:text-6xl">
          Less listing.
          <br />
          <span className="text-brand-100">More living.</span>
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/products/new" size="lg">
            <Camera className="size-4" /> Sell an item
          </Button>
          <Link href="/dashboard" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 font-semibold text-white hover:bg-white/10">
            Run the demo <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </Section>
  );
}
