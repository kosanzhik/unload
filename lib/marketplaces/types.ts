import type { Currency, IntegrationState, Listing, ListingStatus, MarketplaceId, Product } from "../core/types";

export type IntegrationStatus = {
  state: IntegrationState;
  detail: string;
  account?: string;
};

export type Capabilities = {
  publish: boolean;
  update: boolean;
  readStatus: boolean;
  availability: boolean;
  threads: boolean;
  sendMessage: boolean;
};

export type PublishResult = { externalId?: string; url?: string; status: ListingStatus; note?: string };

export type ExternalThread = { id: string; advertId?: string; buyerRef: string; unread: number; updatedAt: number };
export type ExternalMessage = { id: string; fromBuyer: boolean; text: string; createdAt: number };

/**
 * Every marketplace — real, mock or manual — implements this interface,
 * so the rest of the app never branches on the provider.
 */
export interface MarketplaceAdapter {
  id: MarketplaceId;
  name: string;
  market: string;
  defaultCurrency: Currency;
  titleMax: number;
  capabilities: Capabilities;
  /** link to official docs / site */
  docs?: string;
  status(): Promise<IntegrationStatus>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(listing: Listing, product: Product): Promise<PublishResult>;
  readStatus(listing: Listing): Promise<Partial<Pick<Listing, "status" | "url" | "views">>>;
  update(listing: Listing, product: Product): Promise<void>;
  setAvailability(listing: Listing, active: boolean): Promise<ListingStatus>;
  listThreads(): Promise<ExternalThread[]>;
  listMessages(threadId: string): Promise<ExternalMessage[]>;
  sendMessage(threadId: string, text: string): Promise<{ id?: string }>;
}

export class NotSupportedError extends Error {
  constructor(what: string, market: string) {
    super(`${what} isn't supported for ${market}.`);
  }
}
