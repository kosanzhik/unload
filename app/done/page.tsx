"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { EmptyBatch, FlowShell, Thumb, useItemPhoto } from "@/components/flow";
import { Badge, Button, Card } from "@/components/ui";
import { draftStatus } from "@/lib/plan";
import { useBatch } from "@/lib/store";

export default function DonePage() {
  return (
    <FlowShell>
      <Done />
    </FlowShell>
  );
}

function Done() {
  const b = useBatch();
  const router = useRouter();
  const photo = useItemPhoto();
  if (!b.drafts.length) return <EmptyBatch />;

  const firstCheck = b.drafts.find((d) => draftStatus(d, b.items).tone === "warning");

  const steps = [
    ["Review each draft", firstCheck ? `Fill in the details on “${firstCheck.title.split(" — ")[0]}”.` : "Everything looks complete."],
    ["Copy or download", "Grab titles, descriptions and photos."],
    ["Post on your chosen marketplace", "Paste your draft wherever you like to sell."],
  ];

  return (
    <main className="mx-auto grid w-full max-w-[1100px] flex-1 items-center gap-8 px-4 py-10 sm:px-6 sm:py-16 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <Badge tone="lime">
          <CheckCircle2 className="size-3.5" /> Batch organized
        </Badge>
        <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold sm:text-6xl">
          One less thing
          <br />
          <span className="text-ink-450">on your to-do list.</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-ink-650">
          Your draft listings are organized and ready for you to post.
        </p>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="font-display text-6xl font-extrabold">{b.drafts.length}</span>
          <span className="text-ink-650">drafts prepared</span>
        </div>
        <ol className="mt-8 space-y-3">
          {steps.map(([t, s], i) => (
            <li key={t} className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-4">
              <span className="font-display text-sm font-extrabold text-ink-450">0{i + 1}</span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-ink-650">{s}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/drafts" variant="secondary">
            Back to drafts
          </Button>
          <Button
            onClick={() => {
              b.reset();
              router.push("/upload");
            }}
          >
            Start another batch
          </Button>
        </div>
      </section>

      <Card className="rotate-1 p-5 shadow-[0_20px_60px_-20px_rgba(30,40,35,0.25)]">
        <div className="flex items-center justify-between">
          <p className="font-display font-bold">Your drafts</p>
          <Badge>{b.drafts.length} drafts</Badge>
        </div>
        <ul className="mt-4 space-y-2.5">
          {b.drafts.map((d) => {
            const s = draftStatus(d, b.items);
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-soft p-2.5">
                <Thumb src={photo(b.items.find((i) => i.id === d.itemIds[0]))} className="size-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.title.split(" — ")[0]}</p>
                  <p className="text-xs text-ink-650">
                    {d.itemIds.length} item{d.itemIds.length > 1 && "s"}
                  </p>
                </div>
                <Badge tone={d.posted ? "success" : s.tone}>{d.posted ? "Posted" : s.label}</Badge>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 rounded-xl bg-lime-100 px-3 py-2 text-center font-display text-sm font-bold">
          drawer: cleared-ish.
        </p>
      </Card>

      <p className="flex items-center gap-2 text-sm text-ink-650 lg:col-span-2">
        <MessageSquare className="size-4" /> What would make this easier?{" "}
        <a className="font-semibold text-ink-900 underline underline-offset-4" href="mailto:hello@example.com">
          Share feedback
        </a>
      </p>
    </main>
  );
}
