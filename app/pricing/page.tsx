import { Check, ClipboardCheck, PenLine, Tag } from "lucide-react";
import { Footer, SiteHeader } from "@/components/chrome";
import { Button } from "@/components/ui";
import { cn } from "@/lib/util";

const PLANS = [
  {
    name: "Free preview",
    price: "$0",
    per: "no account needed",
    body: "Try a sample batch, explore the flow, and preview a draft.",
    features: ["Sample batch of 5 items", "Full review and plan flow", "Preview one listing draft"],
    cta: "Try the demo",
    href: "/upload",
    dark: false,
  },
  {
    name: "Batch pack",
    price: "$5",
    per: "/ up to 10 items",
    body: "Prepare and organize a batch of editable listing drafts.",
    features: ["Up to 10 items per batch", "All three selling modes", "Copy and download every draft"],
    cta: "Start a batch",
    href: "/upload",
    dark: true,
  },
];

const PROMISES = [
  { icon: PenLine, t: "You review everything", s: "Every title, description and group is editable." },
  { icon: ClipboardCheck, t: "No automatic posting", s: "You copy and post drafts yourself." },
  { icon: Tag, t: "No price predictions", s: "You set every asking price." },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1000px] px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-center text-xs font-bold tracking-widest text-ink-450">PRICING</p>
        <h1 className="mt-3 text-center text-4xl leading-tight font-extrabold sm:text-5xl">
          Less time listing.
          <br />
          <span className="text-ink-450">More room for what matters.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-center text-lg text-ink-650">
          Try the whole flow for free. Pay only when you want to prepare a real batch.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col rounded-[24px] border p-6 sm:p-8",
                p.dark ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-surface",
              )}
            >
              <p className="font-display text-lg font-bold">{p.name}</p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold">{p.price}</span>
                <span className={p.dark ? "text-white/60" : "text-ink-450"}>{p.per}</span>
              </p>
              <p className={cn("mt-3", p.dark ? "text-white/75" : "text-ink-650")}>{p.body}</p>
              <ul className="mt-6 mb-8 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <span className="flex size-5 items-center justify-center rounded-full bg-lime-400 text-ink-900">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button href={p.href} variant={p.dark ? "lime" : "primary"} className="mt-auto w-full">
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-ink-450">
          Concept pricing shown for product testing. Payment is not active in this prototype.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {PROMISES.map((x) => (
            <div key={x.t} className="rounded-[20px] bg-soft p-5">
              <x.icon className="size-5" />
              <p className="mt-3 font-semibold">{x.t}</p>
              <p className="mt-1 text-sm text-ink-650">{x.s}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
