export type Condition = "New" | "Like new" | "Good" | "Fair" | "For parts";
export const CONDITIONS: Condition[] = ["New", "Like new", "Good", "Fair", "For parts"];

export const CATEGORIES = [
  "Electronics",
  "Home",
  "Books",
  "Clothing",
  "Kitchen",
  "Sports & outdoors",
  "Toys & games",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Photo = { id: string; src: string; name: string };

export type Item = {
  id: string;
  photoId?: string;
  name: string;
  category: Category;
  condition: Condition;
  brand: string;
  accessories: string;
  issues: string;
  price: string;
  quantity?: number;
  /** what the "recognizer" flagged as needing a human check */
  note?: string;
  confirmed: boolean;
};

export type Mode = "maximize" | "fewer" | "clear";

export type Group = {
  id: string;
  name: string;
  itemIds: string[];
  /** suggested pairing the user still has to accept or split */
  undecided?: boolean;
};

export type Draft = {
  id: string;
  groupId: string;
  itemIds: string[];
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  price: string;
  delivery: "Local pickup" | "Shipping" | "Pickup or shipping";
  posted: boolean;
};

export type Marketplace = "eBay" | "Craigslist" | "Facebook Marketplace";
export const MARKETPLACES: Marketplace[] = ["eBay", "Craigslist", "Facebook Marketplace"];
