"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check, ExternalLink, Loader2, Minus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { MarketplaceBadge } from "@/components/status";
import { Button, Card, Help, Note, Segmented, useToast } from "@/components/ui";
import type { MarketplaceId } from "@/lib/core/types";
import { ADAPTERS, MARKETPLACE_ORDER } from "@/lib/marketplaces/registry";
import type { Capabilities } from "@/lib/marketplaces/types";
import { connectMarketplace, connectReverb, disconnectMarketplace, refreshIntegrations, updatePrefs, useApp } from "@/lib/store";

const CAPS: [keyof Capabilities, string][] = [
  ["publish", "Publish listings"],
  ["readStatus", "Read listing status"],
  ["update", "Update listings"],
  ["availability", "Activate / deactivate"],
  ["threads", "Read buyer messages"],
  ["sendMessage", "Send replies"],
];

const MSG = (name: string): Record<string, string> => ({
  connected: `${name} account connected.`,
  denied: `${name} authorization was cancelled.`,
  invalid_state: `${name} sign-in expired or was tampered with. Try again.`,
  not_configured: `${name} API credentials aren't configured on this deployment yet.`,
  error: `${name} sign-in failed.`,
});

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
  const which = params.get("olx") ? "OLX" : params.get("ebay") ? "eBay" : null;
  const result = params.get("olx") ?? params.get("ebay");

  return (
    <>
      <PageHeader
        title="Marketplaces"
        sub="UNLOAD isn't a marketplace. It sells through official integrations where they exist and gives you ready-to-post listings where they don't."
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
      {which && result && (
        <div className="mb-5">
          <Note tone={result === "connected" ? "brand" : "warning"}>
            {MSG(which)[result] ?? `${which} sign-in finished.`} {params.get("message") ?? ""}
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

      {id === "ebay" && <EbayPrefs />}
      {id === "olx" && <OlxPrefs />}

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
        {state === "requires_authorization" && id === "reverb" && <ReverbConnect />}
        {state === "requires_authorization" && id !== "reverb" && (
          <Button size="sm" disabled={busy} onClick={() => run(() => connectMarketplace(id), `${a.name} connected`)}>
            {busy && <Loader2 className="size-4 animate-spin" />} {id === "mock" ? "Connect" : `Sign in with ${a.name}`}
          </Button>
        )}
        {a.docs && (
          <a href={a.docs} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand">
            {id === "olx" || id === "ebay" ? "API docs" : "Official site"} <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </Card>
  );
}

function ReverbConnect() {
  const toast = useToast();
  const [token, setToken] = useState("");
  const [env, setEnv] = useState<"production" | "sandbox">("production");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="w-full space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await connectReverb(token, env);
          setToken("");
          toast(`Reverb connected${r.account ? ` · ${r.account}` : ""}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't connect");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Segmented
        value={env}
        onChange={setEnv}
        options={[
          { value: "production", label: "reverb.com" },
          { value: "sandbox", label: "Sandbox" },
        ]}
      />
      <div className="flex gap-2">
        <input
          aria-label="Reverb personal access token"
          type="password"
          autoComplete="off"
          className="field"
          placeholder="Personal Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Button size="sm" type="submit" className="h-10" disabled={busy || token.trim().length < 20}>
          {busy && <Loader2 className="size-4 animate-spin" />} Connect
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-error">{error}</p>}
      <Help>
        Reverb → My Profile → API &amp; Integrations → Generate New Token. Scopes: read_listings, write_listings, read_messages, write_messages, read_profile. Stored encrypted in this browser&apos;s cookie only.
      </Help>
    </form>
  );
}

function EbayPrefs() {
  const prefs = useApp((s) => s.prefs);
  return (
    <div className="mt-3 grid grid-cols-[1fr_1fr_80px] gap-2">
      <input aria-label="US ZIP code" className="field" inputMode="numeric" placeholder="ZIP" value={prefs.usZip} onChange={(e) => updatePrefs({ usZip: e.target.value })} />
      <input aria-label="City" className="field" placeholder="City" value={prefs.usCity} onChange={(e) => updatePrefs({ usCity: e.target.value })} />
      <input aria-label="State" className="field" maxLength={2} placeholder="CA" value={prefs.usState} onChange={(e) => updatePrefs({ usState: e.target.value.toUpperCase() })} />
      <p className="col-span-3 text-xs text-ink-400">Item location eBay shows to buyers.</p>
    </div>
  );
}

function OlxPrefs() {
  const prefs = useApp((s) => s.prefs);
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <input aria-label="OLX city" className="field" placeholder="City, e.g. Алматы" value={prefs.olxCity} onChange={(e) => updatePrefs({ olxCity: e.target.value })} />
      <input aria-label="Contact name" className="field" placeholder="Contact name" value={prefs.contactName} onChange={(e) => updatePrefs({ contactName: e.target.value })} />
      <p className="col-span-2 text-xs text-ink-400">Optional Kazakhstan integration. City must match OLX&apos;s city list.</p>
    </div>
  );
}
