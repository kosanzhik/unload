import Link from "next/link";
import { ArrowRight, BadgeCheck, Bell, Bot, Camera, Check, Handshake, Lock, MessageCircle, ShieldCheck, Target } from "lucide-react";
import { Logo } from "@/components/chrome";
import { Button } from "@/components/ui";

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-surface">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-500 md:flex">
            <a href="#how" className="hover:text-ink-900">
              How it works
            </a>
            <a href="#goals" className="hover:text-ink-900">
              Selling goals
            </a>
            <a href="#trust" className="hover:text-ink-900">
              Safety
            </a>
          </nav>
          <Button href="/sell" size="sm">
            Start Selling
          </Button>
        </div>
      </header>

      <main>
        <Hero />
        <How />
        <Goals />
        <Trust />
        <Cta />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-2 px-4 py-8 text-xs text-ink-500 sm:flex-row sm:justify-between sm:px-6">
          <p>UNLOAD isn&apos;t a marketplace and isn&apos;t affiliated with eBay, Meta, Reverb or OLX. You stay the seller.</p>
          <p>© 2026 UNLOAD</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-[1160px]">{children}</div>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative px-4 pt-14 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_70%_10%,#dbe5ff_0%,transparent_70%)]" />
      <div className="relative mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-700 shadow-sm">
            <Bot className="size-3.5 text-brand" /> Your personal AI seller
          </span>
          <h1 className="animate-rise mt-6 text-[46px] leading-[1.02] font-extrabold sm:text-7xl">
            Take a photo.
            <br />
            <span className="bg-gradient-to-r from-brand to-[#5b8cff] bg-clip-text text-transparent">Let AI sell it.</span>
          </h1>
          <p className="animate-rise mt-6 max-w-lg text-lg text-ink-500 sm:text-xl">
            Your personal AI seller handles listings, conversations, and offers — so you don&apos;t have to.
          </p>
          <div className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/sell" size="lg" className="shadow-lg shadow-brand/30">
              <Camera className="size-4" /> Start Selling
            </Button>
            <Button href="/dashboard" size="lg" variant="secondary">
              See a demo sale <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-ink-400">Free to try. No account needed.</p>
        </div>
        <Phone />
      </div>
    </section>
  );
}

function Phone() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-[36px] bg-navy p-3 shadow-[var(--shadow-pop)]">
        <div className="overflow-hidden rounded-[28px] bg-canvas">
          <div className="flex items-center gap-3 bg-surface px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/demo/monitor.jpg" alt="" className="size-10 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">27&quot; monitor · $150</p>
              <p className="text-[11px] text-ink-500">Sell Fast · Autopilot on</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold text-ink-500">
              <Lock className="size-2.5" /> min $130
            </span>
          </div>
          <ol className="space-y-2.5 p-4 text-[13px]">
            <Bubble who="buyer">Would you take $120?</Bubble>
            <Bubble who="ai">The seller is asking $150. I can offer $135 if that works for you.</Bubble>
            <Bubble who="buyer">OK, deal. Can I pick it up tomorrow?</Bubble>
          </ol>
          <div className="m-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-card)]">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand">
              <Bell className="size-3" /> UNLOAD
            </p>
            <p className="mt-1 text-sm font-semibold">Good news! Someone wants to buy your monitor for $135 and pick it up tomorrow.</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] font-semibold">
              <span className="rounded-lg bg-brand py-1.5 text-white">Accept</span>
              <span className="rounded-lg bg-soft py-1.5">Counter</span>
              <span className="rounded-lg bg-soft py-1.5">Reject</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ who, children }: { who: "buyer" | "ai"; children: React.ReactNode }) {
  return (
    <li className={who === "ai" ? "flex justify-end" : "flex"}>
      <span
        className={
          who === "ai" ? "max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-3 py-2 text-white" : "max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-surface px-3 py-2"
        }
      >
        {children}
      </span>
    </li>
  );
}

const STEPS = [
  { icon: Camera, t: "Take a photo", s: "AI recognizes the item and writes an honest listing." },
  { icon: Target, t: "Choose a goal", s: "Sell Fast, Balanced, or Get More Money." },
  { icon: Check, t: "Approve", s: "Your price and a private minimum the AI never goes below." },
  { icon: Bot, t: "Activate Autopilot", s: "It lists, answers buyers and negotiates for you." },
  { icon: Bell, t: "Say yes", s: "You get pinged only when a serious buyer is ready." },
];

function How() {
  return (
    <Section id="how" className="bg-canvas">
      <p className="text-sm font-bold text-brand">How it works</p>
      <h2 className="mt-2 max-w-xl text-4xl leading-tight font-extrabold sm:text-5xl">You decide. AI does the selling.</h2>
      <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((x, i) => (
          <li key={x.t} className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <x.icon className="size-5" />
            </span>
            <p className="mt-4 text-xs font-bold text-ink-400">Step {i + 1}</p>
            <p className="mt-1 font-display text-lg font-bold">{x.t}</p>
            <p className="mt-1 text-sm text-ink-500">{x.s}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Goals() {
  const goals = [
    { e: "⚡", t: "Sell Fast", s: "Competitive counteroffers and quick price suggestions when it's quiet.", c: "$120 offer → counters at $135" },
    { e: "⚖️", t: "Balanced", s: "Meets buyers halfway and avoids needless discounts.", c: "$120 offer → counters at $140" },
    { e: "💰", t: "Get More Money", s: "Small concessions, patient pricing, compares offers.", c: "$120 offer → counters at $145" },
  ];
  return (
    <Section id="goals">
      <p className="text-sm font-bold text-brand">AutoSale strategy</p>
      <h2 className="mt-2 max-w-2xl text-4xl leading-tight font-extrabold sm:text-5xl">One choice. The AI adapts everything else.</h2>
      <p className="mt-4 max-w-2xl text-lg text-ink-500">
        Same $150 monitor, same $130 private minimum. The goal decides how the AI negotiates and when it suggests changes — based on real listing activity, never made-up numbers.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {goals.map((g, i) => (
          <div key={g.t} className={`rounded-3xl p-6 ${i === 1 ? "bg-navy text-white" : "border border-line bg-canvas"}`}>
            <span className="text-3xl">{g.e}</span>
            <p className="mt-4 font-display text-xl font-bold">{g.t}</p>
            <p className={`mt-2 text-sm ${i === 1 ? "text-white/70" : "text-ink-500"}`}>{g.s}</p>
            <p className={`mt-6 rounded-xl px-3 py-2 text-sm font-semibold ${i === 1 ? "bg-white/10" : "bg-surface"}`}>{g.c}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Trust() {
  const items = [
    { icon: Lock, t: "Your minimum stays secret", s: "A price guard checks every reply before it goes out." },
    { icon: ShieldCheck, t: "No made-up facts", s: "Unknown answer? The AI asks you instead of guessing." },
    { icon: Handshake, t: "You close every deal", s: "Accept, counter or reject — the final say is always yours." },
    { icon: MessageCircle, t: "Real marketplaces", s: "Official integrations only. Demo buyers are always labeled." },
  ];
  return (
    <Section id="trust" className="bg-canvas">
      <p className="text-sm font-bold text-brand">Built to be trusted</p>
      <h2 className="mt-2 max-w-xl text-4xl leading-tight font-extrabold sm:text-5xl">An AI seller you can leave alone with buyers.</h2>
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
      <div className="relative overflow-hidden rounded-[32px] bg-navy px-6 py-16 text-center text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgba(36,86,245,0.45),transparent_70%)]" />
        <div className="relative">
          <BadgeCheck className="mx-auto size-8 text-brand-100" />
          <h2 className="mt-4 text-4xl leading-tight font-extrabold sm:text-6xl">
            Take a photo.
            <br />
            Let AI sell it.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/sell" size="lg">
              <Camera className="size-4" /> Start Selling
            </Button>
            <Link href="/dashboard" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 font-semibold text-white hover:bg-white/10">
              See a demo sale <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
