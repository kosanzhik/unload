"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check, ExternalLink, Loader2, Minus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { MarketplaceBadge } from "@/components/status";
import { Button, Card, Note, useToast } from "@/components/ui";
import type { MarketplaceId } from "@/lib/core/types";
import { ADAPTERS, MARKETPLACE_ORDER } from "@/lib/marketplaces/registry";
import type { Capabilities } from "@/lib/marketplaces/types";
import { connectMarketplace, disconnectMarketplace, refreshIntegrations, useApp } from "@/lib/store";

const CAPS: [keyof Capabilities, string][] = [
  ["publish", "Publish listings"],
  ["readStatus", "Read listing status"],
  ["update", "Update listings"],
  ["availability", "Activate / deactivate"],
  ["threads", "Read buyer messages"],
  ["sendMessage", "Send replies"],
];

const OLX_MSG: Record<string, string> = {
  connected: "OLX account connected.",
  denied: "OLX authorization was cancelled.",
  invalid_state: "OLX sign-in expired or was tampered with. Try again.",
  not_configured: "OLX Partner API credentials aren't configured on this deployment.",
  error: "OLX sign-in failed.",
};

export default function MarketplacesPage() {
  return (
    <Suspense>
      <Marketplaces />
    </Suspense>
  );
}

function Marketplaces() {
  const params = useSearchParams();
  const integrations = useApp((s) => s.integrations);
  const [checking, setChecking] = useState(false);
  const olx = params.get("olx");

  return (
    <>
      <PageHeader
        title="Marketplaces"
        sub="UNLOAD isn't a marketplace. It works through official APIs where they exist, and gives you export-ready drafts where they don't."
        action={
          <Button
            variant="secondary"
            onClick={async () => {
              setChecking(true);
              await refreshIntegrations();
              setChecking(false);
            }}
          >
            {checking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Check status
          </Button>
        }
      />
      {olx && (
        <div className="mb-5">
          <Note tone={olx === "connected" ? "brand" : "warning"}>
            {OLX_MSG[olx] ?? "OLX sign-in finished."} {params.get("message") ?? ""}
          </Note>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {MARKETPLACE_ORDER.map((m) => (
          <MarketCard key={m} id={m} status={integrations[m]} />
        ))}
      </div>
      <div className="mt-6">
        <Note>
          UNLOAD never scrapes marketplaces or signs in with your password. Real integrations use the platform&apos;s official OAuth and APIs, subject to the platform approving API access.
        </Note>
      </div>
    </>
  );
}

function MarketCard({ id, status }: { id: MarketplaceId; status?: { state: string; detail: string; account?: string } }) {
  const toast = useToast();
  const a = ADAPTERS[id];
  const [busy, setBusy] = useState(false);
  const state = status?.state as Parameters<typeof MarketplaceBadge>[0]["state"];

  async function run(fn: () => Promise<void>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast(msg);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold">{a.name}</p>
          <p className="text-xs text-ink-500">{a.market}</p>
        </div>
        <MarketplaceBadge state={state} />
      </div>
      <p className="mt-3 text-sm text-ink-500">{status?.detail ?? "Checking…"}</p>
      {status?.account && <p className="mt-1 text-sm">Account: <span className="font-semibold">{status.account}</span></p>}

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {CAPS.map(([k, label]) => (
          <li key={k} className={a.capabilities[k] ? "flex items-center gap-1.5 text-ink-700" : "flex items-center gap-1.5 text-ink-400"}>
            {a.capabilities[k] ? <Check className="size-3.5 text-success" /> : <Minus className="size-3.5" />} {label}
          </li>
        ))}
        {!a.capabilities.publish && (
          <li className="col-span-2 flex items-center gap-1.5 text-ink-700">
            <Check className="size-3.5 text-success" /> Copy / download ready-to-post drafts
          </li>
        )}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {state === "connected" && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => disconnectMarketplace(id), `${a.name} disconnected`)}>
            Disconnect
          </Button>
        )}
        {state === "requires_authorization" && (
          <Button size="sm" disabled={busy} onClick={() => run(() => connectMarketplace(id), `${a.name} connected`)}>
            {busy && <Loader2 className="size-4 animate-spin" />} {id === "olx" ? "Sign in with OLX" : "Connect"}
          </Button>
        )}
        {a.docs && (
          <a href={a.docs} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand">
            {id === "olx" ? "Partner API docs" : "Official site"} <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </Card>
  );
}
