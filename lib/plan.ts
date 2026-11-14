import type { Draft, Group, Item, Mode } from "./types";
import { uid } from "./util";

const OFFICE = /monitor|keyboard|mouse|webcam|dock|desk|laptop stand|speaker/i;
const GOOD = new Set(["New", "Like new", "Good"]);

export function shortName(item: Item) {
  return item.name
    .replace(/^\d+-inch\s+/i, "")
    .replace(/computer\s+/i, "")
    .replace(/paperback\s+/i, "")
    .replace(/\s+set$/i, "s")
    .trim();
}

function bundleName(items: Item[]) {
  if (items.every((i) => OFFICE.test(i.name))) return "Home-office bundle";
  return `${items[0].category} bundle`;
}

function single(item: Item): Group {
  return { id: uid("g"), name: item.name, itemIds: [item.id] };
}

export function groupName(items: Item[]) {
  if (items.length === 1) return items[0].name;
  return items.map((i) => capitalize(shortName(i))).join(" + ");
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Suggest how to split a batch into listings for the chosen mode. */
export function buildGroups(items: Item[], mode: Mode): Group[] {
  if (mode !== "fewer") return items.map(single);

  const groups: Group[] = [];
  const left: Item[] = [];

  // 1. Same-category items in good shape become a bundle.
  const byCat = new Map<string, Item[]>();
  for (const i of items) {
    if (!GOOD.has(i.condition)) {
      left.push(i);
      continue;
    }
    byCat.set(i.category, [...(byCat.get(i.category) ?? []), i]);
  }
  for (const list of byCat.values()) {
    if (list.length >= 2) {
      groups.push({ id: uid("g"), name: bundleName(list), itemIds: list.map((i) => i.id) });
    } else left.push(...list);
  }

  // 2. Worn items stay alone; small unrelated leftovers get an optional pairing.
  const worn = left.filter((i) => !GOOD.has(i.condition));
  const rest = left.filter((i) => GOOD.has(i.condition));
  groups.push(...worn.map(single));
  while (rest.length >= 2) {
    const pair = rest.splice(0, 2);
    groups.push({
      id: uid("g"),
      name: groupName(pair) + "?",
      itemIds: pair.map((i) => i.id),
      undecided: true,
    });
  }
  groups.push(...rest.map(single));
  return groups;
}

export type DraftStatus = { label: string; tone: "warning" | "success" };

export function draftStatus(draft: Draft, items: Item[]): DraftStatus {
  const its = items.filter((i) => draft.itemIds.includes(i.id));
  if (its.some((i) => !i.confirmed)) return { label: "Needs a check", tone: "warning" };
  if (its.some((i) => i.category === "Electronics" && !i.brand.trim()))
    return { label: "Needs a model check", tone: "warning" };
  return { label: "Ready to copy", tone: "success" };
}

function itemLine(i: Item) {
  const bits = [
    i.quantity && i.quantity > 1 ? `${i.quantity} × ${i.name.toLowerCase()}` : i.name,
    i.brand && `(${i.brand})`,
    `— ${i.condition.toLowerCase()} condition`,
  ].filter(Boolean);
  let line = bits.join(" ");
  if (i.accessories) line += `. Includes: ${i.accessories}`;
  if (i.issues) line += `. Notes: ${i.issues}`;
  return line + ".";
}

export function makeDraft(group: Group, items: Item[]): Draft {
  const its = group.itemIds.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
  const conditionRank = ["For parts", "Fair", "Good", "Like new", "New"];
  const worst = its.reduce(
    (w, i) => (conditionRank.indexOf(i.condition) < conditionRank.indexOf(w) ? i.condition : w),
    its[0].condition,
  );
  const lead = its.length === 1 ? its[0].name : groupName(its);
  const brand = its.length === 1 && its[0].brand ? `${its[0].brand} ` : "";
  const title = `${brand}${lead.replace(/\?$/, "")} — ${worst.toLowerCase()} condition`;

  const unsure = its.filter((i) => !i.confirmed || (i.category === "Electronics" && !i.brand));
  const description = [
    its.length === 1
      ? `Used ${its[0].name.toLowerCase()} in ${its[0].condition.toLowerCase()} condition.`
      : `Selling together: ${its.map((i) => shortName(i).toLowerCase()).join(", ")}.`,
    ...(its.length > 1 ? its.map((i) => `• ${itemLine(i)}`) : []),
    its.length === 1 && its[0].accessories ? `Includes: ${its[0].accessories}.` : "",
    its.length === 1 && its[0].issues ? `Notes: ${its[0].issues}.` : "",
    unsure.length
      ? "Please confirm the exact model and any cosmetic wear before posting."
      : "Smoke-free home. Message me with any questions.",
  ]
    .filter(Boolean)
    .join("\n");

  const total = its.reduce((s, i) => s + (Number(i.price.replace(/[^0-9.]/g, "")) || 0), 0);
  const allPriced = its.every((i) => i.price.trim());

  return {
    id: uid("d"),
    groupId: group.id,
    itemIds: group.itemIds,
    title,
    description,
    category: its[0].category,
    condition: worst,
    price: allPriced && total ? String(total) : "",
    delivery: "Local pickup",
    posted: false,
  };
}

export function draftAsText(d: Draft) {
  return [
    d.title,
    "",
    d.description,
    "",
    `Category: ${d.category}`,
    `Condition: ${d.condition}`,
    d.price ? `Asking price: $${d.price}` : "Asking price: (add yours)",
    `Pickup or shipping: ${d.delivery}`,
  ].join("\n");
}
