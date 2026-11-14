import type { IntegrationState, ListingStatus, Offer, ProductStatus } from "@/lib/core/types";
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
  exported: ["Ready to post yourself", "brand"],
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
  selling: ["Selling", "success"],
  sold: ["Sold", "dark"],
  archived: ["Archived", "neutral"],
};

export function ProductBadge({ status }: { status: ProductStatus }) {
  const [label, tone] = PRODUCT[status];
  return (
    <Badge tone={tone} dot={status === "selling"}>
      {label}
    </Badge>
  );
}

const OFFER: Record<Offer["status"], [string, Tone]> = {
  pending: ["Needs your decision", "warning"],
  accepted: ["Accepted", "success"],
  rejected: ["Declined", "neutral"],
  countered: ["You countered", "brand"],
  sold: ["Sold", "dark"],
};

export function OfferBadge({ status }: { status: Offer["status"] }) {
  const [label, tone] = OFFER[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
