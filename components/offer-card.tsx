"use client";

import { useState } from "react";
import { CalendarCheck, Check, X } from "lucide-react";
import { OfferBadge } from "./status";
import { Badge, Button, Card, Help, Label, Modal, Thumb, useToast } from "./ui";
import type { Offer } from "@/lib/core/types";
import { ADAPTERS } from "@/lib/marketplaces/registry";
import { money } from "@/lib/negotiation/policy";
import { acceptOffer, counterOffer, markSold, rejectOffer, useApp } from "@/lib/store";
import { cn } from "@/lib/util";

/** A buyer offer with the seller's decisions: Accept, Reject, Counteroffer, then Mark as sold. */
export function OfferCard({ o, compact }: { o: Offer; compact?: boolean }) {
  const toast = useToast();
  const products = useApp((s) => s.products);
  const p = products.find((x) => x.id === o.productId);
  const [counterOpen, setCounterOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    await fn();
    setBusy(false);
    toast(msg);
  };
  const demo = o.marketplace === "mock";
  return (
    <Card className={cn("flex flex-col", o.status === "pending" && "ring-1 ring-brand/30")}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <Thumb src={p?.photos[0]?.src} className="size-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <OfferBadge status={o.status} />
            {demo && <Badge tone="brand">Simulated buyer</Badge>}
          </div>
          <p className="mt-1.5 font-display text-2xl font-extrabold">{money(o.price, o.currency)}</p>
          <p className="truncate text-sm text-ink-500">
            {o.buyerRef} · {p?.title}
            {o.when ? ` · ${o.when}` : ""}
          </p>
        </div>
      </div>
      {!compact && (
        <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-line px-4 py-3 text-sm sm:px-5">
          <dt className="text-ink-500">Asking</dt>
          <dd>{money(p?.pricing.desired, o.currency)}</dd>
          <dt className="text-ink-500">When</dt>
          <dd>{o.when || "Not proposed yet"}</dd>
          <dt className="text-ink-500">Where</dt>
          <dd>{ADAPTERS[o.marketplace].name}</dd>
          <dt className="text-ink-500">Summary</dt>
          <dd className="text-ink-700">{o.summary}</dd>
        </dl>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line p-3 sm:px-5">
        <Button size="sm" variant="ghost" href={`/inbox?c=${o.conversationId}`}>
          Chat
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          {o.status === "pending" && (
            <>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => rejectOffer(o.id), "Declined — buyer notified")}>
                <X className="size-4" /> Reject
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setCounterOpen(true)}>
                Counteroffer
              </Button>
              <Button size="sm" disabled={busy} onClick={() => run(() => acceptOffer(o.id), "Accepted — buyer notified")}>
                <Check className="size-4" /> Accept
              </Button>
            </>
          )}
          {o.status === "accepted" && (
            <Button size="sm" variant="dark" disabled={busy} onClick={() => run(() => markSold(o.id), "Marked as sold")}>
              <CalendarCheck className="size-4" /> Mark as sold
            </Button>
          )}
        </div>
      </div>
      <Modal open={counterOpen} onClose={() => setCounterOpen(false)} title="Counteroffer">
        <Label htmlFor={`co-${o.id}`}>Your price</Label>
        <input
          id={`co-${o.id}`}
          inputMode="decimal"
          className="field"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder={String(p?.pricing.desired ?? "")}
        />
        <Help>Sent to the buyer as you. It&apos;s your call.</Help>
        <div className="mt-4 flex justify-end">
          <Button
            disabled={!price}
            onClick={async () => {
              await counterOffer(o.id, Number(price));
              setCounterOpen(false);
              toast("Counteroffer sent");
            }}
          >
            Send {price ? money(Number(price), o.currency) : ""}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
