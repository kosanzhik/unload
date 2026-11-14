"use client";

import { useState } from "react";
import { Bell, Bot, Hand, MapPin, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { Button, Card, CardHeader, Help, Label, Note, Toggle, useToast } from "@/components/ui";
import type { AutomationMode, ReplyCategory } from "@/lib/core/types";
import { resetWorkspace, updateSettings, useApp, useHydrated, type Settings } from "@/lib/store";
import { cn } from "@/lib/util";

const MODES: { id: AutomationMode; title: string; body: string; icon: typeof Bot }[] = [
  { id: "manual", title: "Manual", body: "The agent drafts every reply. Nothing is sent until you approve it.", icon: Hand },
  { id: "assisted", title: "Assisted", body: "Routine replies you allow below go out automatically. Price talk always waits for review.", icon: Sparkles },
  { id: "autopilot", title: "Autopilot", body: "Allowed routine replies and counteroffers inside your price range go out automatically. Deals still need you.", icon: Bot },
];

const REPLIES: { id: ReplyCategory; label: string; description: string }[] = [
  { id: "availability", label: "Availability", description: "“Yes, it's still available.”" },
  { id: "condition", label: "Verified facts & condition", description: "Answers only from your verified knowledge base." },
  { id: "logistics", label: "Pickup & delivery", description: "Only the options you enable below." },
  { id: "pricing", label: "Price & counteroffers", description: "Autopilot only, within each product's pricing rules." },
];

export default function SettingsPage() {
  const hydrated = useHydrated();
  const s = useApp((st) => st.settings);
  const toast = useToast();
  const [perm, setPerm] = useState<string>(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  if (!hydrated) return null;

  const set = (p: Partial<Settings>) => updateSettings(p);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Autopilot settings" sub="Decide how much the agent does on its own. Final deal confirmation always stays with you." />

      <Card>
        <CardHeader icon={<Bot className="size-4" />} title="Automation mode" />
        <div className="grid gap-3 p-5 sm:grid-cols-3" role="radiogroup">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={s.mode === m.id}
              onClick={() => (set({ mode: m.id }), toast(`${m.title} mode on`))}
              className={cn("rounded-xl border p-4 text-left transition", s.mode === m.id ? "border-brand bg-brand-50 ring-1 ring-brand" : "border-line hover:border-ink-400")}
            >
              <m.icon className={cn("size-5", s.mode === m.id ? "text-brand" : "text-ink-500")} />
              <p className="mt-3 font-semibold">{m.title}</p>
              <p className="mt-1 text-xs text-ink-500">{m.body}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Replies the agent may send without asking" sub={s.mode === "manual" ? "Not used in Manual mode — everything waits for you." : "Anything not allowed here becomes a draft for your approval."} />
        <div className="divide-y divide-line px-5">
          {REPLIES.map((r) => (
            <Toggle
              key={r.id}
              checked={s.allowedReplies[r.id]}
              disabled={s.mode === "manual" || (r.id === "pricing" && s.mode !== "autopilot")}
              onChange={(v) => set({ allowedReplies: { ...s.allowedReplies, [r.id]: v } })}
              label={r.label}
              description={r.description}
            />
          ))}
        </div>
        <div className="px-5 pb-5">
          <Note>
            Hard rules in every mode: the agent never reveals your minimum, never invents features or condition, never promises delivery you didn&apos;t enable, and never confirms a sale.
          </Note>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<MapPin className="size-4" />} title="Pickup, delivery & contact" />
        <div className="space-y-4 p-5">
          <div className="divide-y divide-line rounded-xl border border-line px-4">
            <Toggle checked={s.pickup} onChange={(pickup) => set({ pickup })} label="Local pickup" />
            <Toggle checked={s.shipping} onChange={(shipping) => set({ shipping })} label="Shipping" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="area" hint="shown to buyers">
                Meeting area
              </Label>
              <input id="area" className="field" placeholder="e.g. near Dostyk Plaza" value={s.meetingArea} onChange={(e) => set({ meetingArea: e.target.value })} />
              <Help>A neighborhood, not your home address.</Help>
            </div>
            <div>
              <Label htmlFor="city" hint="OLX listings">
                City
              </Label>
              <input id="city" className="field" value={s.city} onChange={(e) => set({ city: e.target.value })} />
              <Help>Must match OLX&apos;s city name, e.g. Алматы, Астана.</Help>
            </div>
            <div>
              <Label htmlFor="cname" hint="OLX listings">
                Contact name
              </Label>
              <input id="cname" className="field" value={s.contactName} onChange={(e) => set({ contactName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone" hint="optional">
                Phone on OLX listings
              </Label>
              <input id="phone" className="field" inputMode="tel" value={s.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<ShieldAlert className="size-4" />} title="Escalate to me when a buyer…" />
        <div className="divide-y divide-line px-5">
          <Toggle checked={s.escalation.paymentQuestions} onChange={(v) => set({ escalation: { ...s.escalation, paymentQuestions: v } })} label="Asks about payment methods" description="The agent never discusses payment details itself." />
          <Toggle checked={s.escalation.offPlatformContact} onChange={(v) => set({ escalation: { ...s.escalation, offPlatformContact: v } })} label="Wants to move off the platform" description="Phone numbers, messengers, email." />
          <Toggle checked={s.escalation.repeatedLowOffers} onChange={(v) => set({ escalation: { ...s.escalation, repeatedLowOffers: v } })} label="Keeps offering below your range" description="After 3 low offers in one conversation." />
          <Toggle checked disabled onChange={() => {}} label="Asks something that isn't verified" description="Always on — becomes a verification task." />
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Bell className="size-4" />} title="Notifications" sub="In-app notifications are always on." />
        <div className="divide-y divide-line px-5">
          <Toggle checked={s.notifications.dealRequests} onChange={(v) => set({ notifications: { ...s.notifications, dealRequests: v } })} label="Deal requests" />
          <Toggle checked={s.notifications.verificationTasks} onChange={(v) => set({ notifications: { ...s.notifications, verificationTasks: v } })} label="Verification tasks" />
          <Toggle checked={s.notifications.approvals} onChange={(v) => set({ notifications: { ...s.notifications, approvals: v } })} label="Replies waiting for approval" />
          <Toggle
            checked={s.notifications.browser && perm === "granted"}
            disabled={perm === "unsupported" || perm === "denied"}
            onChange={async (v) => {
              if (v && perm !== "granted") {
                const r = await Notification.requestPermission();
                setPerm(r);
                if (r !== "granted") return;
              }
              set({ notifications: { ...s.notifications, browser: v } });
            }}
            label="Browser notifications"
            description={perm === "denied" ? "Blocked in your browser settings." : perm === "unsupported" ? "Not supported in this browser." : "While UNLOAD is open in a tab."}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Reset workspace</p>
            <p className="text-sm text-ink-500">Deletes products, conversations and deals stored in this browser. Settings are kept.</p>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Delete all products, conversations, tasks and deals in this browser?")) {
                resetWorkspace();
                toast("Workspace reset");
              }
            }}
          >
            <Trash2 className="size-4" /> Reset
          </Button>
        </div>
      </Card>
    </div>
  );
}
