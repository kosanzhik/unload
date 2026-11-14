"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarCheck, Handshake, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { DealBadge, VerificationBadge } from "@/components/status";
import { Badge, Button, Card, Empty, Help, Label, Modal, Segmented, Thumb, timeAgo, useToast } from "@/components/ui";
import type { DealRequest } from "@/lib/core/types";
import { ADAPTERS } from "@/lib/marketplaces/registry";
import { money } from "@/lib/negotiation/policy";
import { completeDeal, decideDeal, useApp, useHydrated } from "@/lib/store";

type Filter = "pending" | "approved" | "closed";

export default function DealsPage() {
  const hydrated = useHydrated();
  const deals = useApp((s) => s.deals);
  const [filter, setFilter] = useState<Filter>("pending");
  const groups = useMemo(
    () => ({
      pending: deals.filter((d) => d.approval === "pending"),
      approved: deals.filter((d) => d.approval === "approved"),
      closed: deals.filter((d) => d.approval === "completed" || d.approval === "declined"),
    }),
    [deals],
  );
  if (!hydrated) return null;
  const list = groups[filter];

  return (
    <>
      <PageHeader
        title="Deal Center"
        sub="Offers, viewing requests and purchase intent the agent detected. Nothing is final until you decide."
        action={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "pending", label: `Needs decision (${groups.pending.length})` },
              { value: "approved", label: `In progress (${groups.approved.length})` },
              { value: "closed", label: "Closed" },
            ]}
          />
        }
      />
      {list.length === 0 ? (
        <Card>
          <Empty
            icon={<Handshake className="size-5" />}
            title={filter === "pending" ? "No deals waiting" : filter === "approved" ? "Nothing in progress" : "No closed deals yet"}
            body="When a buyer makes an acceptable offer, asks to see the item, or says they want to buy, a structured Deal Request lands here."
            action={
              filter === "pending" && (
                <Button href="/inbox" variant="secondary">
                  Open AI Inbox
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {list.map((d) => (
            <DealCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </>
  );
}

const KIND = { offer: "Price offer", inspection: "Viewing request", purchase: "Ready to buy" } as const;

function DealCard({ d }: { d: DealRequest }) {
  const toast = useToast();
  const products = useApp((s) => s.products);
  const p = products.find((x) => x.id === d.productId);
  const [decide, setDecide] = useState<null | "approve" | "decline">(null);
  const [note, setNote] = useState("");
  const [finishOpen, setFinishOpen] = useState(false);
  const [final, setFinal] = useState(String(d.offeredPrice ?? ""));

  const rows: [string, React.ReactNode][] = [
    ["Product", p ? <Link href={`/products/${p.id}`} className="font-semibold text-brand">{p.title}</Link> : "—"],
    ["Marketplace", ADAPTERS[d.marketplace].name + (d.marketplace === "mock" ? " (demo)" : "")],
    ["Buyer", d.buyerRef],
    ["Offered price", <span key="o" className="font-semibold">{money(d.offeredPrice, d.currency)}{p?.pricing.desired != null && d.offeredPrice != null && <span className="font-normal text-ink-500"> · asking {money(p.pricing.desired, d.currency)}</span>}</span>],
    ["Meeting / delivery", d.conditions],
    ["Verification", <VerificationBadge key="v" v={d.verification} />],
  ];

  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3 border-b border-line p-4 sm:p-5">
        <Thumb src={p?.photos[0]?.src} className="size-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{KIND[d.kind]}</Badge>
            <DealBadge approval={d.approval} />
          </div>
          <p className="mt-1.5 truncate font-display text-lg font-bold">{money(d.offeredPrice, d.currency)}</p>
          <p className="text-xs text-ink-400">{timeAgo(d.createdAt)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 p-4 text-sm sm:p-5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-500">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
        <dt className="text-ink-500">Summary</dt>
        <dd className="text-ink-700">{d.summary}</dd>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line p-4 sm:px-5">
        <Button size="sm" variant="ghost" href={`/inbox?c=${d.conversationId}`}>
          <MessageSquare className="size-4" /> Conversation
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          {d.approval === "pending" && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setDecide("decline")}>
                Decline
              </Button>
              <Button size="sm" onClick={() => setDecide("approve")}>
                Approve
              </Button>
            </>
          )}
          {d.approval === "approved" && (
            <Button size="sm" variant="dark" onClick={() => setFinishOpen(true)}>
              <CalendarCheck className="size-4" /> Mark as sold
            </Button>
          )}
        </div>
      </div>

      <Modal open={decide !== null} onClose={() => setDecide(null)} title={decide === "approve" ? "Approve this deal" : "Decline this deal"}>
        <Label htmlFor="deal-note" hint="sent to the buyer as you">
          Message
        </Label>
        <textarea
          id="deal-note"
          className="field min-h-24"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            decide === "approve"
              ? d.kind === "inspection"
                ? "e.g. Tomorrow 6–8pm works. I'll send the address once we confirm."
                : `e.g. ${money(d.offeredPrice, d.currency)} works for me. When can you pick it up?`
              : "e.g. Thanks, but I'll pass on this offer."
          }
        />
        <Help>Leave blank for a short default message. The deal isn&apos;t complete until you mark it as sold.</Help>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDecide(null)}>
            Cancel
          </Button>
          <Button
            variant={decide === "approve" ? "primary" : "dark"}
            onClick={async () => {
              await decideDeal(d.id, decide === "approve", note.trim());
              setDecide(null);
              toast(decide === "approve" ? "Approved — buyer notified" : "Declined — buyer notified");
            }}
          >
            {decide === "approve" ? "Approve & notify buyer" : "Decline & notify buyer"}
          </Button>
        </div>
      </Modal>

      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Mark as sold">
        <Label htmlFor="final">Final price</Label>
        <input id="final" inputMode="decimal" className="field" value={final} onChange={(e) => setFinal(e.target.value.replace(/[^0-9.]/g, ""))} />
        <Help>Live listings for this product are deactivated where the marketplace supports it. Manually posted listings: remove them yourself.</Help>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFinishOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await completeDeal(d.id, final ? Number(final) : null);
              setFinishOpen(false);
              toast("Marked as sold");
            }}
          >
            Confirm sale
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
