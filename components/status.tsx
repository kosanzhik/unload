import type { DealRequest, IntegrationState, ListingStatus, ProductStatus } from "@/lib/core/types";
import { Badge, type Tone } from "./ui";

const INTEGRATION: Record<IntegrationState, [string, Tone]> = {
  connected: ["Connected", "success"],
  requires_authorization: ["Requires authorization", "warning"],
  manual_export: ["Manual export", "neutral"],
  unavailable: ["Unavailable", "error"],
};

export function MarketplaceBadge({ state }: { state?: IntegrationState }) {
  if (!state) return <Badge>Checking…</Badge>;
  const [label, tone] = INTEGRATION[state];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

const LISTING: Record<ListingStatus, [string, Tone]> = {
  draft: ["Draft", "neutral"],
  publishing: ["Publishing…", "brand"],
  active: ["Live", "success"],
  moderation: ["In moderation", "warning"],
  inactive: ["Inactive", "neutral"],
  sold: ["Sold", "dark"],
  exported: ["Ready to post manually", "brand"],
  error: ["Error", "error"],
};

export function ListingBadge({ status }: { status: ListingStatus }) {
  const [label, tone] = LISTING[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

const PRODUCT: Record<ProductStatus, [string, Tone]> = {
  draft: ["Draft", "neutral"],
  ready: ["Ready to publish", "brand"],
  listed: ["Listed", "success"],
  sold: ["Sold", "dark"],
  archived: ["Archived", "neutral"],
};

export function ProductBadge({ status }: { status: ProductStatus }) {
  const [label, tone] = PRODUCT[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const DEAL: Record<DealRequest["approval"], [string, Tone]> = {
  pending: ["Needs your decision", "warning"],
  approved: ["Approved", "success"],
  declined: ["Declined", "neutral"],
  completed: ["Completed", "dark"],
};

export function DealBadge({ approval }: { approval: DealRequest["approval"] }) {
  const [label, tone] = DEAL[approval];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function VerificationBadge({ v }: { v: DealRequest["verification"] }) {
  const map: Record<DealRequest["verification"], [string, Tone]> = {
    verified: ["Verified details", "success"],
    partially_verified: ["Partly verified", "warning"],
    unverified: ["Unverified", "neutral"],
  };
  const [label, tone] = map[v];
  return <Badge tone={tone}>{label}</Badge>;
}
