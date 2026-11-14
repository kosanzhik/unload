import type { Item, Photo } from "./types";

export const SAMPLE_PHOTOS: Photo[] = [
  { id: "p-monitor", src: "/demo/monitor.jpg", name: "monitor.jpg" },
  { id: "p-keyboard", src: "/demo/keyboard.jpg", name: "keyboard.jpg" },
  { id: "p-headphones", src: "/demo/headphones.jpg", name: "headphones.jpg" },
  { id: "p-lamp", src: "/demo/lamp.jpg", name: "lamp.jpg" },
  { id: "p-books", src: "/demo/books.jpg", name: "books.jpg" },
];

const base = { brand: "", accessories: "", issues: "", price: "", confirmed: false };

/** What the recognizer "finds" in the sample batch. */
export const SAMPLE_ITEMS: Item[] = [
  {
    ...base,
    id: "i-monitor",
    photoId: "p-monitor",
    name: "27-inch computer monitor",
    category: "Electronics",
    condition: "Good",
    accessories: "Stand",
    note: "Brand/model not confirmed",
  },
  {
    ...base,
    id: "i-keyboard",
    photoId: "p-keyboard",
    name: "Mechanical keyboard",
    category: "Electronics",
    condition: "Good",
    note: "Brand/model not confirmed",
  },
  {
    ...base,
    id: "i-headphones",
    photoId: "p-headphones",
    name: "Over-ear headphones",
    category: "Electronics",
    condition: "Fair",
    note: "Please confirm functionality",
  },
  {
    ...base,
    id: "i-lamp",
    photoId: "p-lamp",
    name: "Desk lamp",
    category: "Home",
    condition: "Good",
    confirmed: true,
  },
  {
    ...base,
    id: "i-books",
    photoId: "p-books",
    name: "Paperback book set",
    category: "Books",
    condition: "Good",
    quantity: 4,
    confirmed: true,
  },
];
